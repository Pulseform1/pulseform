// Pulseform payments (Cloudflare Worker "pulseform-api" at api.pulseform.org)
//
//   GET  /status                              -> {pay}   whether buying is switched on (all three secrets are set)
//   POST /checkout        {product, idToken}  -> {url}   a Stripe Checkout page for a signed-in player
//   POST /stripe-webhook  (from Stripe)                  a paid checkout: write the receipt and deliver the item
//
// Prices live here, never in the page, so nobody can pay less by editing the game. The player is identified by their
// Firebase sign-in token (checked against Google's public keys), and every Stripe notice is checked with the webhook
// signing secret. A paid order is written once (the Stripe session id is the document id), as:
//   purchases/{uid}/items/{session}   the permanent receipt (players can read their own, nobody can write)
//   gifts/{uid}/items/stripe_{session} {kind:'iap', id:product, tx:session}: the game applies it once and deletes it
//
// Secrets (Cloudflare: Workers > pulseform-api > Settings > Variables and Secrets):
//   STRIPE_SECRET_KEY        sk_live_... (or sk_test_... while testing)
//   STRIPE_WEBHOOK_SECRET    whsec_...   (from the Stripe webhook for https://api.pulseform.org/stripe-webhook)
//   GOOGLE_SERVICE_ACCOUNT   the whole JSON key file from Firebase > Project settings > Service accounts

const PROJECT = 'pulseform-d8282';
const SITE = 'https://pulseform.org';
const ORIGINS = ['https://pulseform.org', 'https://www.pulseform.org', 'https://pulseform.win', 'https://www.pulseform.win'];

// the price list (US cents). once: a player only ever needs to buy it one time.
export const CATALOG = {
  pf_notes_1000: { name: 'Handful of Notes (1,000)', cents: 99 },
  pf_notes_3300: { name: 'Pouch of Notes (3,300)', cents: 299 },
  pf_notes_6000: { name: 'Chest of Notes (6,000)', cents: 499 },
  pf_notes_13000: { name: 'Vault of Notes (13,000)', cents: 999 },
  pf_starter: { name: 'Starter Bundle', cents: 199, once: true },
  pf_no_ads: { name: 'No Ads', cents: 299, once: true },
  pf_pass_s1: { name: 'Pulse Pass+ (Season 1)', cents: 499, once: true },
  pf_skin_clock: { name: 'Astral Clockwork (premium block)', cents: 199, once: true },
  pf_skin_magma: { name: 'Volcanic Titan (premium block)', cents: 299, once: true },
  pf_skin_core: { name: 'Fusion Core (premium block)', cents: 299, once: true },
  pf_skin_aurora: { name: 'Aurora Warden (premium block)', cents: 299, once: true },
  pf_skin_kitsune: { name: 'Nine-Tail Kitsune (premium block)', cents: 399, once: true },
  pf_skin_pharaoh: { name: 'Sun Pharaoh (premium block)', cents: 399, once: true },
  pf_skin_paladin: { name: 'Radiant Paladin (premium block)', cents: 399, once: true },
  pf_skin_prism: { name: 'Prism Dragon (premium block)', cents: 499, once: true },
  pf_skin_lich: { name: 'Lich King (premium block)', cents: 499, once: true },
  pf_skin_horizon: { name: 'Event Horizon (premium block)', cents: 499, once: true },
};

const enc = new TextEncoder();
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...extra } });

/* ---- who is buying: a Firebase sign-in token, checked against Google's published keys ---- */
let JWKS = null, JWKS_T = 0;
export async function verifyFirebaseToken(token, now = Date.now() / 1000, fetchImpl = fetch) {
  const [h, p, s] = String(token || '').split('.'); if (!s) throw new Error('bad token');
  const head = JSON.parse(new TextDecoder().decode(unb64url(h))), body = JSON.parse(new TextDecoder().decode(unb64url(p)));
  if (head.alg !== 'RS256') throw new Error('bad token');
  if (!JWKS || Date.now() - JWKS_T > 3600e3) { JWKS = (await (await fetchImpl('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')).json()).keys; JWKS_T = Date.now(); }
  const jwk = JWKS.find(k => k.kid === head.kid); if (!jwk) throw new Error('unknown key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unb64url(s), enc.encode(h + '.' + p)))) throw new Error('bad signature');
  if (body.aud !== PROJECT || body.iss !== `https://securetoken.google.com/${PROJECT}` || !(body.exp > now) || !(body.iat <= now + 300) || !body.sub) throw new Error('token not valid');
  return { uid: body.sub, email: body.email || '' };
}
export const _resetKeys = () => { JWKS = null; };

/* ---- Stripe: the notice must carry a valid signature from our webhook secret, made in the last 5 minutes ---- */
export async function verifyStripe(raw, header, secret, now = Date.now() / 1000) {
  const parts = Object.fromEntries(String(header || '').split(',').map(x => x.split('=')).filter(x => x.length === 2).map(([k, v]) => [k.trim(), v]));
  const sigs = String(header || '').split(',').filter(x => x.trim().startsWith('v1=')).map(x => x.trim().slice(3));
  const t = +parts.t; if (!t || !sigs.length || Math.abs(now - t) > 300) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${raw}`)))].map(b => b.toString(16).padStart(2, '0')).join('');
  return sigs.some(sg => sg.length === mac.length && [...sg].reduce((d, c, i) => d | (c.charCodeAt(0) ^ mac.charCodeAt(i)), 0) === 0);
}

/* ---- Firestore, as the server (a Google service account): rules don't apply, so only this code can write purchases ---- */
async function googleToken(sa, fetchImpl) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = b64url(enc.encode(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = b64url(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(head + '.' + claims)));
  const r = await fetchImpl('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${head}.${claims}.${sig}` });
  const j = await r.json(); if (!j.access_token) throw new Error('google token: ' + JSON.stringify(j)); return j.access_token;
}
const fsVal = v => typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : typeof v === 'boolean' ? { booleanValue: v } : { stringValue: String(v) };
// creates the document only if it doesn't exist yet: returns false if it was already there (a repeated Stripe notice)
async function createDoc(base, auth, path, id, data, fetchImpl) {
  const r = await fetchImpl(`${base}/${path}?documentId=${encodeURIComponent(id)}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, fsVal(v)])) }) });
  if (r.status === 409) return false;
  if (!r.ok) throw new Error(`firestore ${r.status}: ${await r.text()}`);
  return true;
}
export async function grant(env, uid, product, session, fetchImpl = fetch) {
  const base = env.FIRESTORE_BASE || `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
  const auth = env.FIRESTORE_AUTH || `Bearer ${await googleToken(JSON.parse(env.GOOGLE_SERVICE_ACCOUNT), fetchImpl)}`;
  const t = Date.now(), receipt = `purchases/${uid}/items`;
  // a repeated Stripe notice for an order that's already been delivered: nothing to do
  const seen = await fetchImpl(`${base}/${receipt}/${encodeURIComponent(session.id)}`, { headers: { authorization: auth } });
  if (seen.ok) return false;
  if (seen.status !== 404) throw new Error(`firestore ${seen.status}`);
  // the gift first, then the receipt: if anything fails in between, Stripe retries and the gift is sent again
  // (the game applies each order only once, by its id)
  await createDoc(base, auth, `gifts/${uid}/items`, `stripe_${session.id}`, { kind: 'iap', id: product, tx: session.id, t, by: 'stripe', msg: 'Thanks for your purchase!' }, fetchImpl);
  return createDoc(base, auth, receipt, session.id, { product, cents: session.amount_total || 0, currency: session.currency || 'usd', t, via: 'stripe' }, fetchImpl);
}

/* ---- Stripe Checkout ---- */
async function createCheckout(env, uid, email, product, fetchImpl) {
  const item = CATALOG[product];
  const form = new URLSearchParams({
    mode: 'payment', client_reference_id: uid,
    success_url: `${SITE}/?paid={CHECKOUT_SESSION_ID}`, cancel_url: `${SITE}/?paid=cancel`,
    'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(item.cents), 'line_items[0][price_data][product_data][name]': item.name,
    'metadata[uid]': uid, 'metadata[product]': product, 'payment_intent_data[metadata][uid]': uid, 'payment_intent_data[metadata][product]': product,
  });
  if (email) form.set('customer_email', email);
  const r = await fetchImpl('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' }, body: form.toString() });
  const j = await r.json(); if (!r.ok || !j.url) throw new Error('stripe: ' + ((j.error && j.error.message) || r.status)); return j.url;
}

export default {
  async fetch(request, env, ctx, fetchImpl = fetch) {
    const url = new URL(request.url), origin = request.headers.get('origin') || '';
    const cors = ORIGINS.includes(origin) ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' } : {};
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (url.pathname === '/status' && request.method === 'GET')
      return json({ pay: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.GOOGLE_SERVICE_ACCOUNT) }, 200, { ...cors, 'cache-control': 'public, max-age=300' });

    if (url.pathname === '/checkout' && request.method === 'POST') {
      if (!env.STRIPE_SECRET_KEY) return json({ error: 'Payments aren\'t set up yet.' }, 503, cors);
      let body; try { body = await request.json(); } catch (e) { return json({ error: 'Bad request.' }, 400, cors); }
      if (!CATALOG[body.product]) return json({ error: 'That item isn\'t for sale.' }, 400, cors);
      let who; try { who = await verifyFirebaseToken(body.idToken, undefined, fetchImpl); } catch (e) { return json({ error: 'Sign in again, then try once more.' }, 401, cors); }
      try { return json({ url: await createCheckout(env, who.uid, who.email, body.product, fetchImpl) }, 200, cors); }
      catch (e) { return json({ error: 'The payment page couldn\'t be opened. Try again in a moment.' }, 502, cors); }
    }

    if (url.pathname === '/stripe-webhook' && request.method === 'POST') {
      if (!env.STRIPE_WEBHOOK_SECRET || !env.GOOGLE_SERVICE_ACCOUNT) return json({ error: 'not configured' }, 503);
      const raw = await request.text();
      if (!(await verifyStripe(raw, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET))) return json({ error: 'bad signature' }, 400);
      const ev = JSON.parse(raw), s = ev.data && ev.data.object;
      if ((ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') && s && s.payment_status === 'paid') {
        const uid = (s.metadata && s.metadata.uid) || s.client_reference_id, product = s.metadata && s.metadata.product;
        if (uid && CATALOG[product] && /^[A-Za-z0-9]{6,128}$/.test(uid)) await grant(env, uid, product, s, fetchImpl);   // throwing makes Stripe retry later
      }
      return json({ received: true });
    }
    return json({ error: 'Not found' }, 404, cors);
  },
};
