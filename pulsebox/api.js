// Pulsebox cloud saves. Players sign in with their Pulseform (Firebase) account in the browser; every request here
// carries that account's ID token, which is checked against Google's public keys before anything is read or written.
// Each account's save lives in its own Durable Object: one JSON blob of the games' saved progress.
//   GET  /api/save   -> { t, data } (or { t: 0, data: {} } for a new account)
//   PUT  /api/save   <- { data }      -> { t }
// Play stats: one global Durable Object (Stats) counts game starts per day.
//   POST /api/play   <- { id }        -> { ok, counted }   (same IP + game counts once per 10 minutes; IPs are only kept hashed)
//   GET  /api/stats  -> { games: { id: { total, week, today } }, updated }   (week = last 7 UTC days incl. today; cached ~60 s)
// Multiplayer rooms: one Durable Object (Rooms) per 4-character room code relays JSON messages between up to 4 players.
//   GET  /api/room/CODE?n=NAME  (WebSocket) -> { t: 'hello', id, host, players } then every other player's messages
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

const ID_RE = /^[a-z0-9-]{2,40}$/;
const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

async function play(request, env, ids) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const body = await request.text();
  if (body.length > 200) return json({ error: 'bad play' }, 400);
  let id;
  try { id = JSON.parse(body).id; } catch (e) {}
  if (typeof id !== 'string' || !ID_RE.test(id) || (ids && !ids.includes(id))) return json({ error: 'unknown game' }, 400);
  // the raw IP never leaves this function: the Stats object only sees a salted hash of IP + game + day
  const ip = request.headers.get('cf-connecting-ip') || '';
  const k = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('pulsebox-play|' + ip + '|' + id + '|' + day()))).slice(0, 24);
  const stub = env.STATS.get(env.STATS.idFromName('global'));
  return stub.fetch('https://stats/play', { method: 'POST', body: JSON.stringify({ id, k }) });
}

async function stats(request, env, ctx) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'method' }, 405);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(new URL('/api/stats', request.url).toString());
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  const stub = env.STATS.get(env.STATS.idFromName('global'));
  const r = await stub.fetch('https://stats/stats');
  const res = new Response(await r.text(), { status: r.status, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' } });
  if (cache && r.ok) { const put = cache.put(key, res.clone()); if (ctx && ctx.waitUntil) ctx.waitUntil(put); else await put; }
  return res;
}

// ids: the game ids the worker embeds from the hub's GAMES list (optional; without it only the id pattern is checked)
export async function api(request, env, ctx, ids) {
  const url = new URL(request.url);
  if (url.pathname === '/api/play') return play(request, env, ids);
  if (url.pathname === '/api/stats') return stats(request, env, ctx);
  if (url.pathname.startsWith('/api/room/')) {
    const code = url.pathname.slice(10).toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(code)) return json({ error: 'bad room code' }, 400);
    if (request.headers.get('upgrade') !== 'websocket') return json({ error: 'expected a websocket' }, 426);
    return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
  }
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

// One global instance (idFromName('global')). SQLite-backed: plays(day, id, n) holds one row per game per UTC day,
// seen(k, t) holds the hashed IP+game keys counted in the last 10 minutes.
const REPEAT_MS = 10 * 60 * 1000, MEMO_MS = 60 * 1000;
export class Stats {
  constructor(state) {
    this.state = state; this.sql = state.storage.sql; this.memo = null; this.memoAt = 0;
    this.sql.exec('CREATE TABLE IF NOT EXISTS plays (day TEXT NOT NULL, id TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, id))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS seen (k TEXT PRIMARY KEY, t INTEGER NOT NULL)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS seen_t ON seen (t)');
  }
  async fetch(request) {
    const path = new URL(request.url).pathname, now = Date.now();
    if (path === '/play') {
      const { id, k } = JSON.parse(await request.text());
      this.sql.exec('DELETE FROM seen WHERE t < ?', now - REPEAT_MS);
      if (this.sql.exec('SELECT t FROM seen WHERE k = ?', k).toArray().length) return json({ ok: true, counted: false });
      this.sql.exec('INSERT INTO seen (k, t) VALUES (?, ?)', k, now);
      this.sql.exec('INSERT INTO plays (day, id, n) VALUES (?, ?, 1) ON CONFLICT (day, id) DO UPDATE SET n = n + 1', day(now), id);
      return json({ ok: true, counted: true });
    }
    if (path === '/stats') {
      if (!this.memo || now - this.memoAt > MEMO_MS) {
        const today = day(now), weekStart = day(now - 6 * 86400000), games = {};
        for (const r of this.sql.exec(
          'SELECT id, SUM(n) AS total, SUM(CASE WHEN day >= ? THEN n ELSE 0 END) AS week, SUM(CASE WHEN day = ? THEN n ELSE 0 END) AS today FROM plays GROUP BY id',
          weekStart, today))
          games[r.id] = { total: r.total, week: r.week, today: r.today };
        this.memo = JSON.stringify({ games, updated: now }); this.memoAt = now;
      }
      return new Response(this.memo, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }
    return json({ error: 'not found' }, 404);
  }
}

// One instance per room code. Players stay connected only while the game is open; nothing is stored.
// A message { to: id } goes to that player only; anything else goes to everyone else in the room.
// The first player in is the host (they run the monsters); if the host leaves, the next player takes over.
const MAX_PLAYERS = 4, MAX_MSG = 6000;
export class Rooms {
  constructor(state) { this.state = state; this.socks = new Map(); this.next = 1; this.host = 0; }
  async fetch(request) {
    const pair = new WebSocketPair(), [client, sock] = Object.values(pair);
    sock.accept();
    if (this.socks.size >= MAX_PLAYERS) { sock.send(JSON.stringify({ t: 'full' })); sock.close(1000, 'room full'); return new Response(null, { status: 101, webSocket: client }); }
    const id = this.next++, name = (new URL(request.url).searchParams.get('n') || 'Player').replace(/[^\w .'-]/g, '').slice(0, 12) || 'Player';
    if (!this.host) this.host = id;
    this.socks.set(id, { sock, name });
    sock.send(JSON.stringify({ t: 'hello', id, host: this.host, players: [...this.socks].map(([i, p]) => ({ id: i, name: p.name })) }));
    this.send({ t: 'join', id, name }, id);
    sock.addEventListener('message', e => {
      if (typeof e.data !== 'string' || e.data.length > MAX_MSG) return;
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (!m || typeof m !== 'object') return;
      m.from = id;
      if (m.to) { const p = this.socks.get(m.to); if (p) try { p.sock.send(JSON.stringify(m)); } catch (err) {} }
      else this.send(m, id);
    });
    const bye = () => {
      if (!this.socks.delete(id)) return;
      this.send({ t: 'leave', id });
      if (this.host === id) { this.host = this.socks.size ? this.socks.keys().next().value : 0; if (this.host) this.send({ t: 'host', id: this.host }); }
    };
    sock.addEventListener('close', bye); sock.addEventListener('error', bye);
    return new Response(null, { status: 101, webSocket: client });
  }
  send(m, except) { const d = JSON.stringify(m); for (const [i, p] of this.socks) if (i !== except) try { p.sock.send(d); } catch (err) {} }
}
