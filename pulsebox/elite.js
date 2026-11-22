// PULSEBOX ELITE: invite friends, unlock exclusive games for good.
//
// Accounts are the existing Pulseform (Firebase) accounts; api.js checks the ID token and passes the claims here.
// Everything that decides a referral happens in one global Durable Object (Elite, SQLite), so each decision runs on its
// own and a friend can be credited only once (referred account is the primary key; the credit is a single guarded UPDATE).
//
//   GET  /api/elite/me              -> { live, need, code, refs, pending, elite, eliteAt }   (your progress; makes your code)
//   POST /api/elite/claim  <- {ref} -> { ok } | { error }   (a new account says who invited it; checked here, credited later)
//   POST /api/elite/play   <- {g, step: 'start'|'done'} -> { ok, played }   (a real game, timed by the server: 45 s or more)
//   GET  /api/elite/ticket          -> { t, exp }   (Elite members only: a signed pass that opens /elite/<game> for an hour)
//   /elite/<game>                   -> the game, only with a valid pass (query ?t= or the cookie it sets); otherwise the unlock screen
//
// A referral counts only when ALL of these hold:
//   - the invite code belongs to a different account (no self-referrals);
//   - the invited account is new (created in the last 7 days) and has never been referred before;
//   - its email address (normalised: case, Gmail dots and +tags) has never been used for a referral (one inbox, one credit);
//   - its email address is verified (an email link or Google sign-in verifies it);
//   - it then played a game for at least 45 seconds, measured between two server timestamps;
//   - the same network (hashed IP) has not claimed more than 3 referrals in a day, and the email domain is not a throwaway one.
// Clicking a link never counts. The browser only ever sends the code; counts are computed here from the referral rows.
// Elite, once reached, is a timestamp on the account that nothing ever clears.

export const NEED = 3;
const NEW_MS = 7 * 86400000, PLAY_MS = 45000, TICKET_MS = 3600000, DAY = 86400000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O or 1/I, so a code read aloud is unambiguous
const CODE_RE = /^[A-Z2-9]{6,10}$/;
// throwaway inbox domains: accounts on these can play, but cannot count as someone's referral
const DISPOSABLE = new Set(['mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com', '10minutemail.com', 'temp-mail.org', 'tempmail.com', 'tempmail.net', 'yopmail.com', 'trashmail.com', 'getnada.com', 'dispostable.com', 'maildrop.cc', 'mintemail.com', 'throwawaymail.com', 'fakeinbox.com', 'mohmal.com', 'emailondeck.com', 'tempail.com', 'moakt.com', 'spamgourmet.com', 'mailnesia.com', 'burnermail.io', 'tempr.email', 'discard.email', 'mail.tm', 'inboxkitten.com']);
const FB_KEY = 'AIzaSyBrAUF7jmH7gBKxBfJ6Un9bZRySC-jTTVU';   // Pulseform's public Firebase web key (also in the hub page); only used to read the caller's own account

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra } });
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
// one inbox, one identity: lower case; for Gmail drop dots and +tags; for everyone drop +tags
function normEmail(e) {
  let [u, d] = String(e || '').trim().toLowerCase().split('@'); if (!u || !d) return '';
  if (d === 'googlemail.com') d = 'gmail.com';
  u = u.split('+')[0]; if (d === 'gmail.com') u = u.replace(/\./g, '');
  return u + '@' + d;
}

// who is calling. In production: a Firebase ID token, checked by api.js. For local tests only (wrangler dev with
// --var ELITE_DEV:1, never set in wrangler.toml), a "dev." token stands in for Firebase so the whole flow can be exercised offline.
export async function caller(request, env, verifyClaims) {
  const tok = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
  // ELITE_DEV is only ever passed on the command line for local runs (wrangler dev --var ELITE_DEV:1); it is not in wrangler.toml
  const host = new URL(request.url).hostname;   // (and never on the real site, even if the variable were set by mistake)
  if (env.ELITE_DEV === '1' && tok.startsWith('dev.') && (host === 'localhost' || host === '127.0.0.1')) {
    const [, uid, email, verified, created] = tok.split('.');
    return { uid, email: atob(email), verified: verified === '1', created: +created, dev: true };
  }
  let c = null; try { c = await verifyClaims(tok); } catch (e) {}
  if (!c) return null;
  return { uid: c.sub, email: c.email || '', verified: !!c.email_verified, tok };
}
// when the account was made: asked of Firebase with the caller's own token (a token alone does not say)
async function createdAt(who) {
  if (who.dev) return who.created;
  try {
    const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FB_KEY, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken: who.tok }) });
    const u = (await r.json()).users; return u && u[0] ? +u[0].createdAt : 0;
  } catch (e) { return 0; }
}

export async function elite(request, env, url, verifyClaims, cfg) {
  const stub = env.ELITE.get(env.ELITE.idFromName('global')), sub = url.pathname.slice('/api/elite/'.length);
  const who = await caller(request, env, verifyClaims);
  if (!who) return json({ error: 'sign in' }, 401);
  const call = (p, body) => stub.fetch('https://elite/' + p, { method: 'POST', body: JSON.stringify({ ...body, uid: who.uid, verified: who.verified, live: cfg.live }) });
  if (sub === 'me' && request.method === 'GET') return call('me', {});
  if (sub === 'ticket' && request.method === 'GET') {
    const r = await call('ticket', {}); if (!r.ok) return r;
    const t = (await r.json()).t;
    // the pass also goes in a cookie scoped to /elite/, so a game's own files (pictures, sounds) load too
    return json({ t, exp: Date.now() + TICKET_MS }, 200, { 'set-cookie': `pbx_elite=${t}; Path=/elite/; Max-Age=${TICKET_MS / 1000}; HttpOnly; Secure; SameSite=Lax` });
  }
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let b; try { b = JSON.parse(await request.text()); } catch (e) { return json({ error: 'bad json' }, 400); }
  if (sub === 'claim') {
    const ref = String(b.ref || '').toUpperCase();
    if (!CODE_RE.test(ref)) return json({ error: 'bad code' }, 400);
    const email = normEmail(who.email), dom = email.split('@')[1] || '';
    return call('claim', { ref, emailH: email ? await sha('pbx-elite-email|' + email) : '', disposable: DISPOSABLE.has(dom), created: await createdAt(who),
      ipH: await sha('pbx-elite-ip|' + (request.headers.get('cf-connecting-ip') || '')) });
  }
  if (sub === 'play') {
    if (!/^[a-z0-9-]{2,40}$/.test(b.g || '') || !['start', 'done'].includes(b.step)) return json({ error: 'bad play' }, 400);
    return call('play', { g: b.g, step: b.step });
  }
  return json({ error: 'not found' }, 404);
}

// /elite/<game>: only Elite members with a fresh pass get the page; everyone else goes to the unlock screen
export async function eliteGate(request, env, eliteIds, serve) {
  const url = new URL(request.url), id = url.pathname.slice('/elite/'.length).replace(/\.html$/, '').split('/')[0];
  if (!eliteIds.includes(id)) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
  const cookie = (request.headers.get('cookie') || '').match(/(?:^|;\s*)pbx_elite=([^;]+)/), t = url.searchParams.get('t') || (cookie ? cookie[1] : '');
  let ok = false;
  if (t) { const r = await env.ELITE.get(env.ELITE.idFromName('global')).fetch('https://elite/check', { method: 'POST', body: JSON.stringify({ t }) }); ok = r.ok && (await r.json()).ok; }
  if (!ok) return new Response(null, { status: 302, headers: { location: '/?locked=' + encodeURIComponent(id) + '#elite', 'cache-control': 'no-store' } });
  const res = await serve(request), out = new Response(res.body, res);
  out.headers.set('cache-control', 'private, no-store');   // a member's page must never be cached for someone else
  return out;
}

export class Elite {
  constructor(state) {
    this.state = state; this.sql = state.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, created INTEGER NOT NULL, elite_at INTEGER);
      CREATE TABLE IF NOT EXISTS referrals (referred TEXT PRIMARY KEY, referrer TEXT NOT NULL, email_h TEXT NOT NULL UNIQUE, ip_h TEXT NOT NULL,
        status TEXT NOT NULL, claimed INTEGER NOT NULL, played INTEGER, credited INTEGER);
      CREATE INDEX IF NOT EXISTS referrals_by ON referrals (referrer, status);
      CREATE INDEX IF NOT EXISTS referrals_ip ON referrals (ip_h, claimed);
      CREATE TABLE IF NOT EXISTS plays (uid TEXT PRIMARY KEY, g TEXT NOT NULL, started INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);`);
  }
  one(q, ...a) { return this.sql.exec(q, ...a).toArray()[0] || null; }
  // a private signing key that never leaves this object, made on first use
  async key() {
    if (this.k) return this.k;
    let row = this.one("SELECT v FROM kv WHERE k = 'hmac'");
    if (!row) { const v = hex(crypto.getRandomValues(new Uint8Array(32))); this.sql.exec("INSERT OR IGNORE INTO kv (k, v) VALUES ('hmac', ?)", v); row = this.one("SELECT v FROM kv WHERE k = 'hmac'"); }
    const raw = Uint8Array.from(row.v.match(/../g), h => parseInt(h, 16));
    return this.k = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  }
  user(uid) {
    let u = this.one('SELECT * FROM users WHERE uid = ?', uid);
    for (let i = 0; !u && i < 20; i++) {   // a fresh, unused code
      const b = crypto.getRandomValues(new Uint8Array(7)), code = [...b].map(x => CODE_ALPHABET[x % 32]).join('');
      try { this.sql.exec('INSERT INTO users (uid, code, created) VALUES (?, ?, ?)', uid, code, Date.now()); } catch (e) { continue; }
      u = this.one('SELECT * FROM users WHERE uid = ?', uid);
    }
    return u;
  }
  // credit a friend who has done everything: one UPDATE that only succeeds once, then Elite if that made three
  credit(uid, verified) {
    if (!verified) return;
    this.state.storage.transactionSync(() => {
      const r = this.one("SELECT referrer FROM referrals WHERE referred = ? AND status = 'played'", uid); if (!r) return;
      this.sql.exec("UPDATE referrals SET status = 'credited', credited = ? WHERE referred = ? AND status = 'played'", Date.now(), uid);
      const n = this.one("SELECT COUNT(*) AS n FROM referrals WHERE referrer = ? AND status = 'credited'", r.referrer).n;
      if (n >= NEED) this.sql.exec('UPDATE users SET elite_at = ? WHERE uid = ? AND elite_at IS NULL', Date.now(), r.referrer);
    });
  }
  async fetch(request) {
    const p = new URL(request.url).pathname, b = await request.json(), now = Date.now();
    if (p === '/check') {   // is this pass genuine, unexpired, and its holder still Elite?
      const [body, sig] = String(b.t || '').split('~'), [uid, exp] = (body || '').split('.');
      if (!sig || !uid || !(+exp > now)) return json({ ok: false });
      const good = await crypto.subtle.verify('HMAC', await this.key(), Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)), new TextEncoder().encode(body));
      return json({ ok: good && !!(this.one('SELECT elite_at FROM users WHERE uid = ?', uid) || {}).elite_at });
    }
    const uid = b.uid; if (!uid) return json({ error: 'who' }, 400);
    if (p === '/me') {
      this.credit(uid, b.verified);   // a friend may have verified their email since they played
      const u = this.user(uid), c = this.one("SELECT SUM(status = 'credited') AS refs, SUM(status != 'credited') AS pending FROM referrals WHERE referrer = ?", uid);
      const mine = this.one('SELECT status FROM referrals WHERE referred = ?', uid);
      return json({ live: !!b.live, need: NEED, code: u.code, refs: Math.min(c.refs || 0, 99), pending: c.pending || 0, elite: !!u.elite_at, eliteAt: u.elite_at || null, invited: mine ? mine.status : null });
    }
    if (p === '/ticket') {
      const u = this.user(uid); if (!u.elite_at) return json({ error: 'locked' }, 403);
      const body = uid + '.' + (now + TICKET_MS), sig = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', await this.key(), new TextEncoder().encode(body))))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return json({ t: body + '~' + sig });
    }
    if (!b.live) return json({ error: 'not live' }, 403);   // referrals only count once Elite is released
    if (p === '/claim') {
      const ref = this.one('SELECT uid FROM users WHERE code = ?', b.ref);
      if (!ref) return json({ error: 'unknown code' }, 404);
      if (ref.uid === uid) return json({ error: 'self' }, 409);
      if (this.one('SELECT 1 FROM referrals WHERE referred = ?', uid)) return json({ error: 'already' }, 409);
      if (!(b.created > now - NEW_MS)) return json({ error: 'not new' }, 409);
      if (!b.emailH || b.disposable) return json({ error: 'email' }, 409);
      if (this.one('SELECT 1 FROM referrals WHERE email_h = ?', b.emailH)) return json({ error: 'email used' }, 409);
      if (this.one('SELECT COUNT(*) AS n FROM referrals WHERE ip_h = ? AND claimed > ?', b.ipH, now - DAY).n >= 3) return json({ error: 'busy' }, 429);
      if (this.one('SELECT COUNT(*) AS n FROM referrals WHERE referrer = ? AND claimed > ?', ref.uid, now - DAY).n >= 12) return json({ error: 'busy' }, 429);
      if (this.one('SELECT 1 FROM referrals WHERE referred = ? AND referrer = ?', ref.uid, uid)) return json({ error: 'loop' }, 409);   // you cannot be invited by someone you invited
      try { this.sql.exec("INSERT INTO referrals (referred, referrer, email_h, ip_h, status, claimed) VALUES (?, ?, ?, ?, 'pending', ?)", uid, ref.uid, b.emailH, b.ipH, now); }
      catch (e) { return json({ error: 'already' }, 409); }   // the constraints are the last word on duplicates
      this.user(uid);
      return json({ ok: true });
    }
    if (p === '/play') {
      if (b.step === 'start') { this.sql.exec('INSERT INTO plays (uid, g, started) VALUES (?, ?, ?) ON CONFLICT(uid) DO UPDATE SET g = excluded.g, started = excluded.started', uid, b.g, now); return json({ ok: true, played: false }); }
      const s = this.one('SELECT g, started FROM plays WHERE uid = ?', uid);
      if (!s || s.g !== b.g || now - s.started < PLAY_MS) return json({ ok: true, played: false });
      this.sql.exec("UPDATE referrals SET status = 'played', played = ? WHERE referred = ? AND status = 'pending'", now, uid);
      this.credit(uid, b.verified);
      return json({ ok: true, played: true });
    }
    return json({ error: 'not found' }, 404);
  }
}
