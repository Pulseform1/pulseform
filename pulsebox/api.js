// Pulsebox cloud saves. Players sign in with their Pulseform (Firebase) account in the browser; every request here
// carries that account's ID token, which is checked against Google's public keys before anything is read or written.
// Each account's save lives in its own Durable Object: one JSON blob of the games' saved progress.
//   GET  /api/save   -> { t, data } (or { t: 0, data: {} } for a new account)
//   PUT  /api/save   <- { data }      -> { t }
const PROJECT = 'pulseform-d8282';
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const MAX_BYTES = 400000;
let keys = null, keysAt = 0;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const b64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));

async function verify(token) {
  const [h, p, s] = (token || '').split('.');
  if (!s) return null;
  const head = JSON.parse(new TextDecoder().decode(b64url(h))), claims = JSON.parse(new TextDecoder().decode(b64url(p)));
  if (head.alg !== 'RS256') return null;
  if (!keys || Date.now() - keysAt > 3600000) { keys = (await (await fetch(JWKS_URL)).json()).keys; keysAt = Date.now(); }
  const jwk = keys.find(k => k.kid === head.kid);
  if (!jwk) { keys = null; return null; }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), new TextEncoder().encode(h + '.' + p));
  const now = Date.now() / 1000;
  if (!ok || claims.aud !== PROJECT || claims.iss !== 'https://securetoken.google.com/' + PROJECT || !claims.sub || claims.exp < now || claims.iat > now + 300) return null;
  // guest (anonymous) sign-ins can't keep a save
  if (claims.firebase && claims.firebase.sign_in_provider === 'anonymous') return null;
  return claims.sub;
}

export async function api(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/save') return json({ error: 'not found' }, 404);
  if (request.method !== 'GET' && request.method !== 'PUT') return json({ error: 'method' }, 405);
  let uid = null;
  try { uid = await verify((request.headers.get('authorization') || '').replace(/^Bearer /, '')); } catch (e) {}
  if (!uid) return json({ error: 'sign in again' }, 401);
  const stub = env.SAVES.get(env.SAVES.idFromName(uid));
  if (request.method === 'GET') return stub.fetch('https://save/get');
  const body = await request.text();
  if (body.length > MAX_BYTES) return json({ error: 'save too big' }, 413);
  let data;
  try { data = JSON.parse(body).data; } catch (e) {}
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'bad save' }, 400);
  for (const [k, v] of Object.entries(data)) if (typeof k !== 'string' || typeof v !== 'string' || k.length > 100) return json({ error: 'bad save' }, 400);
  return stub.fetch('https://save/put', { method: 'POST', body: JSON.stringify(data) });
}

export class Saves {
  constructor(state) { this.state = state; }
  async fetch(request) {
    if (new URL(request.url).pathname === '/get') return json((await this.state.storage.get('save')) || { t: 0, data: {} });
    const save = { t: Date.now(), data: JSON.parse(await request.text()) };
    await this.state.storage.put('save', save);
    return json({ t: save.t });
  }
}
