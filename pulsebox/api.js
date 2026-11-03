// Pulsebox cloud saves. Players sign in with their Pulseform (Firebase) account in the browser; every request here
// carries that account's ID token, which is checked against Google's public keys before anything is read or written.
// Each account's save lives in its own Durable Object: one JSON blob of the games' saved progress.
//   GET  /api/save   -> { t, data } (or { t: 0, data: {} } for a new account)
//   PUT  /api/save   <- { data }      -> { t }
// Play stats: one global Durable Object (Stats) counts game starts per day.
//   POST /api/play   <- { id }        -> { ok, counted }   (same IP + game counts once per 10 minutes; IPs are only kept hashed)
//   POST /api/live   -> { ok }   (sent once a minute while a game is open; live = people seen in the last 2.5 minutes)
//   POST /api/view   -> { ok, counted }   (a hub page view; same IP counts once per 10 minutes)
//   GET  /api/stats  -> { games: { id: { total, week, today } }, site: { live, today, week, days }, updated }
//                       (week = last 7 UTC days incl. today; cached ~60 s. site.* = { plays, views, players };
//                        players = different people who started a game. To count them, the Stats object keeps a hash of
//                        each player's IP made with a random secret that never leaves it, and deletes it after 8 days.)
// Bug reports: one global Durable Object (Bugs) keeps every report.
//   POST /api/bug              <- { game, text, steps, contact, info } -> { id }   (same IP: at most 6 reports an hour)
//   GET  /api/bug/status?ids=1,2  -> { 1: { status, note, updated } }   (what a reporter sees about their own reports)
//   GET  /api/bugs?status=new  (header x-admin-key) -> { bugs: [...] }  (the admin page, public/bugs.html)
//   POST /api/bugs/update      (header x-admin-key) <- { id, status, note } -> { ok }
//   GET  /api/featured  -> { default: [ids], days: { 'YYYY-MM-DD': [ids] } }  (Games of the Day, read by the hub)
//   GET/POST /api/featured/admin  (header x-admin-key) -> read / save them  (the admin page, public/picks.html)
// Multiplayer rooms: one Durable Object (Rooms) per 4-character room code relays JSON messages between up to 8 players (14 for the Odd Crowd party game).
//   GET  /api/room/CODE?n=NAME&g=GAME  (WebSocket) -> { t: 'hello', id, host, players } then every other player's messages
//   GET  /api/room/CODE  (plain) -> { game, players }: which game the room is playing, so the hub can join by code alone
// THE HOLLOW co-op: /api/hollow (WebSocket) goes to the HollowRooms Durable Object (hollow-rooms.js), which runs the game's own engine.
// AFTERHOURS co-op: /api/arcade (WebSocket) goes to the ArcadeRooms Durable Object (arcade-rooms.js), which runs the five games' simulations.
const PROJECT = 'pulseform-d8282';
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const MAX_BYTES = 400000;
let keys = null, keysAt = 0;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
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
  const who = await sha('pulsebox-person|' + ip);
  const stub = env.STATS.get(env.STATS.idFromName('global'));
  return stub.fetch('https://stats/play', { method: 'POST', body: JSON.stringify({ id, k, who }) });
}
const sha = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const BUG_STATUS = ['new', 'confirmed', 'fixing', 'fixed', 'wontfix', 'duplicate'];
async function bugs(request, env, url, ids = []) {
  const stub = env.BUGS.get(env.BUGS.idFromName('global'));
  // the admin key: never compared directly (both sides are hashed, then compared in constant time), refused if it is
  // too short to be safe, and an address that sends 8 wrong keys is locked out for 15 minutes
  const admin = async () => {
    const want = env.BUG_ADMIN_KEY || '', given = request.headers.get('x-admin-key') || '';
    if (want.length < 16) return 'off';
    const who = (await sha('pulsebox-admin|' + (request.headers.get('cf-connecting-ip') || ''))).slice(0, 24);
    if ((await stub.fetch('https://bugs/gate', { method: 'POST', body: JSON.stringify({ who }) })).status === 429) return 'locked';
    const [a, b] = await Promise.all([sha('pbx-admin|' + given), sha('pbx-admin|' + want)]); let d = 0;
    for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
    if (d) { await stub.fetch('https://bugs/fail', { method: 'POST', body: JSON.stringify({ who }) }); return 'wrong'; }
    return 'ok';
  };
  if (url.pathname === '/api/bug') {
    if (request.method !== 'POST') return json({ error: 'method' }, 405);
    const body = await request.text();
    if (body.length > 12000) return json({ error: 'That report is too long.' }, 413);
    let b; try { b = JSON.parse(body); } catch (e) { return json({ error: 'bad report' }, 400); }
    const str = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
    const r = { game: str(b.game, 40), text: str(b.text, 2000), steps: str(b.steps, 2000), contact: str(b.contact, 120), info: b.info && typeof b.info === 'object' ? JSON.stringify(b.info).slice(0, 6000) : '' };
    if (r.text.length < 5) return json({ error: 'Please say what went wrong.' }, 400);
    if (r.game && !/^[a-z0-9-]{2,40}$/.test(r.game)) r.game = '';
    const who = (await sha('pulsebox-bug|' + (request.headers.get('cf-connecting-ip') || ''))).slice(0, 24);
    return stub.fetch('https://bugs/add', { method: 'POST', body: JSON.stringify({ ...r, who }) });
  }
  // Games of the Day (the top carousel on the hub): anyone can read them; changing them needs the admin key (picks.html)
  if (url.pathname === '/api/featured' && request.method === 'GET') {
    const r = await stub.fetch('https://bugs/featured'); return new Response(r.body, { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=30', 'access-control-allow-origin': '*', 'x-content-type-options': 'nosniff' } });
  }
  if (url.pathname === '/api/bug/status') {
    // ids look like 12.TOKEN: the token (given only to whoever sent the report) is needed to read the note on it
    const ids = (url.searchParams.get('ids') || '').split(',').slice(0, 50).map(s => { const [i, t] = s.split('.'); return { id: Number(i), tok: /^[a-f0-9]{32}$/.test(t || '') ? t : '' }; }).filter(q => Number.isInteger(q.id) && q.id > 0);
    return stub.fetch('https://bugs/status', { method: 'POST', body: JSON.stringify({ ids }) });
  }
  const ok = await admin();
  if (ok === 'off') return json({ error: 'The admin key is not set up yet (BUG_ADMIN_KEY, at least 16 characters).' }, 503);
  if (ok === 'locked') return json({ error: 'Too many wrong keys from here. Try again in 15 minutes.' }, 429);
  if (ok !== 'ok') return json({ error: 'wrong key' }, 401);
  if (url.pathname === '/api/featured/admin') {
    if (request.method === 'GET') return stub.fetch('https://bugs/featured');
    if (request.method !== 'POST') return json({ error: 'method' }, 405);
    const body = await request.text(); if (body.length > 8000) return json({ error: 'too big' }, 413);
    let f; try { f = JSON.parse(body); } catch (e) { return json({ error: 'bad picks' }, 400); }
    const known = new Set(ids), clean = list => Array.isArray(list) ? [...new Set(list.filter(x => typeof x === 'string' && known.has(x)))].slice(0, 6) : [];
    const out = { default: clean(f.default), days: {} };
    if (f.days && typeof f.days === 'object') for (const [d, list] of Object.entries(f.days).slice(0, 90)) if (/^\d{4}-\d{2}-\d{2}$/.test(d) && clean(list).length) out.days[d] = clean(list);
    return stub.fetch('https://bugs/featured/set', { method: 'POST', body: JSON.stringify(out) });
  }
  if (url.pathname === '/api/bugs') return stub.fetch('https://bugs/list?' + new URLSearchParams({ status: url.searchParams.get('status') || '' }));
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let u; try { u = JSON.parse(await request.text()); } catch (e) { return json({ error: 'bad update' }, 400); }
  if (!BUG_STATUS.includes(u.status)) return json({ error: 'bad status' }, 400);
  return stub.fetch('https://bugs/update', { method: 'POST', body: JSON.stringify({ id: Number(u.id), status: u.status, note: typeof u.note === 'string' ? u.note.slice(0, 500) : '' }) });
}
export class Bugs {
  constructor(state) {
    this.sql = state.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS bugs (id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER NOT NULL, game TEXT, text TEXT, steps TEXT, contact TEXT, info TEXT, status TEXT NOT NULL DEFAULT \'new\', note TEXT NOT NULL DEFAULT \'\', updated INTEGER NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS sent (k TEXT NOT NULL, t INTEGER NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS fails (k TEXT NOT NULL, t INTEGER NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
    try { this.sql.exec("ALTER TABLE bugs ADD COLUMN tok TEXT NOT NULL DEFAULT ''"); } catch (e) {}
  }
  async fetch(request) {
    const url = new URL(request.url), now = Date.now();
    if (url.pathname === '/add') {
      const r = JSON.parse(await request.text());
      this.sql.exec('DELETE FROM sent WHERE t < ?', now - 3600000);
      if (this.sql.exec('SELECT COUNT(*) AS n FROM sent WHERE k = ?', r.who).one().n >= 6) return json({ error: 'Thanks! You have sent a lot of reports in the last hour. Please try again later.' }, 429);
      this.sql.exec('INSERT INTO sent (k, t) VALUES (?, ?)', r.who, now);
      const token = hex(crypto.getRandomValues(new Uint8Array(16)));
      const id = this.sql.exec('INSERT INTO bugs (t, game, text, steps, contact, info, updated, tok) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id', now, r.game, r.text, r.steps, r.contact, r.info, now, await sha('bugtok|' + token)).one().id;
      return json({ id, token });
    }
    if (url.pathname === '/status') {
      const { ids } = JSON.parse(await request.text()), out = {};
      for (const { id, tok } of ids) { const row = this.sql.exec('SELECT status, note, updated, tok FROM bugs WHERE id = ?', id).toArray()[0]; if (!row) continue; const own = tok && row.tok && (await sha('bugtok|' + tok)) === row.tok; out[id] = { status: row.status, note: own ? row.note : '', updated: row.updated }; }
      return json(out);
    }
    if (url.pathname === '/gate' || url.pathname === '/fail') {
      const { who } = JSON.parse(await request.text());
      this.sql.exec('DELETE FROM fails WHERE t < ?', now - 900000);
      if (url.pathname === '/fail') { this.sql.exec('INSERT INTO fails (k, t) VALUES (?, ?)', who, now); return json({ ok: true }); }
      return this.sql.exec('SELECT COUNT(*) AS n FROM fails WHERE k = ?', who).one().n >= 8 ? json({ error: 'locked' }, 429) : json({ ok: true });
    }
    if (url.pathname === '/featured') { const r = this.sql.exec("SELECT v FROM kv WHERE k = 'featured'").toArray()[0]; return json(r ? JSON.parse(r.v) : { default: [], days: {} }); }
    if (url.pathname === '/featured/set') { const v = await request.text(); this.sql.exec("INSERT INTO kv (k, v) VALUES ('featured', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", v); return json({ ok: true, saved: JSON.parse(v) }); }
    if (url.pathname === '/list') {
      const st = url.searchParams.get('status');
      const cols = 'id, t, game, text, steps, contact, info, status, note, updated';
      const rows = st ? this.sql.exec(`SELECT ${cols} FROM bugs WHERE status = ? ORDER BY id DESC LIMIT 300`, st).toArray() : this.sql.exec(`SELECT ${cols} FROM bugs ORDER BY id DESC LIMIT 300`).toArray();
      const counts = {}; for (const r of this.sql.exec('SELECT status, COUNT(*) AS n FROM bugs GROUP BY status')) counts[r.status] = r.n;
      return json({ bugs: rows, counts });
    }
    if (url.pathname === '/update') {
      const u = JSON.parse(await request.text());
      this.sql.exec('UPDATE bugs SET status = ?, note = ?, updated = ? WHERE id = ?', u.status, u.note, now, u.id);
      return json({ ok: true });
    }
    return json({ error: 'not found' }, 404);
  }
}
async function live(request, env) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const who = await sha('pulsebox-person|' + (request.headers.get('cf-connecting-ip') || ''));
  const stub = env.STATS.get(env.STATS.idFromName('global'));
  return stub.fetch('https://stats/live', { method: 'POST', body: JSON.stringify({ who }) });
}
async function view(request, env) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const ip = request.headers.get('cf-connecting-ip') || '';
  const k = (await sha('pulsebox-view|' + ip + '|' + day())).slice(0, 24);
  const stub = env.STATS.get(env.STATS.idFromName('global'));
  return stub.fetch('https://stats/view', { method: 'POST', body: JSON.stringify({ k }) });
}

// Leaderboards: fastest times per game and course. One row per person per course (keyed by a salted hash of their IP),
// kept only when it beats their previous time. GET ?g=&k= returns the top 10; POST {g,k,n,t} submits a time in ms.
const LB = { hyperlane: { keys: ['downtown', 'aurora', 'canyon'], min: 18000, max: 600000 } };
async function lb(request, env, url) {
  const stub = env.STATS.get(env.STATS.idFromName('global'));
  if (request.method === 'GET') return stub.fetch('https://stats/lb?' + new URLSearchParams({ g: url.searchParams.get('g') || '', k: url.searchParams.get('k') || '' }));
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let b; try { b = JSON.parse(await request.text()); } catch (e) { return json({ error: 'bad json' }, 400); }
  const who = await sha('pulsebox-lb|' + (request.headers.get('cf-connecting-ip') || ''));
  return stub.fetch('https://stats/lbadd', { method: 'POST', body: JSON.stringify({ g: b.g, k: b.k, n: b.n, t: b.t, who }) });
}

async function stats(request, env, ctx) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'method' }, 405);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(new URL('/api/stats', request.url).toString());
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  const stub = env.STATS.get(env.STATS.idFromName('global'));
  const r = await stub.fetch('https://stats/stats');
  const res = new Response(await r.text(), { status: r.status, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=30' } });
  if (cache && r.ok) { const put = cache.put(key, res.clone()); if (ctx && ctx.waitUntil) ctx.waitUntil(put); else await put; }
  return res;
}

// ids: the game ids the worker embeds from the hub's GAMES list (optional; without it only the id pattern is checked)
export async function api(request, env, ctx, ids) {
  const url = new URL(request.url);
  if (url.pathname === '/api/play') return play(request, env, ids);
  if (url.pathname === '/api/stats') return stats(request, env, ctx);
  if (url.pathname === '/api/view') return view(request, env);
  if (url.pathname === '/api/live') return live(request, env);
  if (url.pathname === '/api/lb') return lb(request, env, url);
  if (url.pathname === '/api/bug' || url.pathname === '/api/bug/status' || url.pathname === '/api/bugs' || url.pathname === '/api/bugs/update' || url.pathname === '/api/featured' || url.pathname === '/api/featured/admin') return bugs(request, env, url, ids);
  if (url.pathname === '/api/hollow') {
    if (request.headers.get('upgrade') !== 'websocket') return json({ error: 'expected a websocket' }, 426);
    return env.HOLLOW.get(env.HOLLOW.idFromName('global')).fetch(request);
  }
  if (url.pathname === '/api/arcade') {
    if (request.headers.get('upgrade') !== 'websocket') return json({ error: 'expected a websocket' }, 426);
    return env.ARCADE.get(env.ARCADE.idFromName('global')).fetch(request);
  }
  if (url.pathname.startsWith('/api/room/')) {
    const code = url.pathname.slice(10).toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(code)) return json({ error: 'bad room code' }, 400);
    if (request.headers.get('upgrade') !== 'websocket' && request.method !== 'GET') return json({ error: 'expected a websocket' }, 426);
    return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);   // a plain GET answers { game, players } for the hub's Join box
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
const REPEAT_MS = 10 * 60 * 1000, MEMO_MS = 30 * 1000, LIVE_MS = 150 * 1000;
export class Stats {
  constructor(state) {
    this.state = state; this.sql = state.storage.sql; this.memo = null; this.memoAt = 0;
    this.sql.exec('CREATE TABLE IF NOT EXISTS plays (day TEXT NOT NULL, id TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, id))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS seen (k TEXT PRIMARY KEY, t INTEGER NOT NULL)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS seen_t ON seen (t)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS views (day TEXT PRIMARY KEY, n INTEGER NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS people (day TEXT NOT NULL, k TEXT NOT NULL, PRIMARY KEY (day, k))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS live (k TEXT PRIMARY KEY, t INTEGER NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS lb (g TEXT NOT NULL, k TEXT NOT NULL, who TEXT NOT NULL, n TEXT NOT NULL, t INTEGER NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (g, k, who))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS lbrate (who TEXT NOT NULL, t INTEGER NOT NULL)');
    const row = this.sql.exec("SELECT v FROM meta WHERE k = 'salt'").toArray()[0];
    if (row) this.salt = row.v;
    else { this.salt = hex(crypto.getRandomValues(new Uint8Array(16))); this.sql.exec("INSERT INTO meta (k, v) VALUES ('salt', ?)", this.salt); }
  }
  async fetch(request) {
    const path = new URL(request.url).pathname, now = Date.now();
    if (path === '/play') {
      const { id, k, who } = JSON.parse(await request.text());
      this.sql.exec('DELETE FROM seen WHERE t < ?', now - REPEAT_MS);
      if (typeof who === 'string' && who) {
        this.sql.exec('INSERT OR IGNORE INTO people (day, k) VALUES (?, ?)', day(now), (await sha(this.salt + '|' + who)).slice(0, 24));
        this.sql.exec('DELETE FROM people WHERE day < ?', day(now - 8 * 86400000));
      }
      if (this.sql.exec('SELECT t FROM seen WHERE k = ?', k).toArray().length) return json({ ok: true, counted: false });
      this.sql.exec('INSERT INTO seen (k, t) VALUES (?, ?)', k, now);
      this.sql.exec('INSERT INTO plays (day, id, n) VALUES (?, ?, 1) ON CONFLICT (day, id) DO UPDATE SET n = n + 1', day(now), id);
      return json({ ok: true, counted: true });
    }
    if (path === '/live') {
      const { who } = JSON.parse(await request.text());
      if (typeof who === 'string' && who) this.sql.exec('INSERT INTO live (k, t) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET t = excluded.t', (await sha(this.salt + '|live|' + who)).slice(0, 24), now);
      this.sql.exec('DELETE FROM live WHERE t < ?', now - LIVE_MS);
      return json({ ok: true });
    }
    if (path === '/lb' || path === '/lbadd') {
      const top = (g, k) => this.sql.exec('SELECT n, t FROM lb WHERE g = ? AND k = ? ORDER BY t ASC, at ASC LIMIT 10', g, k).toArray();
      if (path === '/lb') { const q = new URL(request.url).searchParams, g = q.get('g'), k = q.get('k'); if (!LB[g] || !LB[g].keys.includes(k)) return json({ error: 'unknown board' }, 400); return json({ top: top(g, k) }); }
      const { g, k, n, t, who } = JSON.parse(await request.text()), B = LB[g];
      if (!B || !B.keys.includes(k) || !Number.isInteger(t) || t < B.min || t > B.max || typeof who !== 'string') return json({ error: 'rejected' }, 400);
      const name = String(n || '').replace(/[^\w .'-]/g, '').trim().slice(0, 14) || 'Racer', h = (await sha(this.salt + '|lb|' + who)).slice(0, 24);
      this.sql.exec('DELETE FROM lbrate WHERE t < ?', now - 3600000);
      if (this.sql.exec('SELECT COUNT(*) AS n FROM lbrate WHERE who = ?', h).one().n >= 60) return json({ error: 'slow down' }, 429);
      this.sql.exec('INSERT INTO lbrate (who, t) VALUES (?, ?)', h, now);
      this.sql.exec('INSERT INTO lb (g, k, who, n, t, at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (g, k, who) DO UPDATE SET n = excluded.n, at = CASE WHEN excluded.t < lb.t THEN excluded.at ELSE lb.at END, t = MIN(lb.t, excluded.t)', g, k, h, name, t, now);
      const mine = this.sql.exec('SELECT t FROM lb WHERE g = ? AND k = ? AND who = ?', g, k, h).one().t;
      return json({ rank: this.sql.exec('SELECT COUNT(*) AS n FROM lb WHERE g = ? AND k = ? AND t < ?', g, k, mine).one().n + 1, best: mine, top: top(g, k) });
    }
    if (path === '/view') {
      const { k } = JSON.parse(await request.text());
      this.sql.exec('DELETE FROM seen WHERE t < ?', now - REPEAT_MS);
      if (this.sql.exec('SELECT t FROM seen WHERE k = ?', k).toArray().length) return json({ ok: true, counted: false });
      this.sql.exec('INSERT INTO seen (k, t) VALUES (?, ?)', k, now);
      this.sql.exec('INSERT INTO views (day, n) VALUES (?, 1) ON CONFLICT (day) DO UPDATE SET n = n + 1', day(now));
      return json({ ok: true, counted: true });
    }
    if (path === '/stats') {
      if (!this.memo || now - this.memoAt > MEMO_MS) {
        const today = day(now), weekStart = day(now - 6 * 86400000), games = {};
        for (const r of this.sql.exec(
          'SELECT id, SUM(n) AS total, SUM(CASE WHEN day >= ? THEN n ELSE 0 END) AS week, SUM(CASE WHEN day = ? THEN n ELSE 0 END) AS today FROM plays GROUP BY id',
          weekStart, today))
          games[r.id] = { total: r.total, week: r.week, today: r.today };
        // the whole site, day by day for the last 7 days
        const days = [], at = {};
        for (let i = 6; i >= 0; i--) { const d = day(now - i * 86400000); at[d] = { d, plays: 0, views: 0, players: 0 }; days.push(at[d]); }
        for (const r of this.sql.exec('SELECT day, SUM(n) AS n FROM plays WHERE day >= ? GROUP BY day', weekStart)) if (at[r.day]) at[r.day].plays = r.n;
        for (const r of this.sql.exec('SELECT day, n FROM views WHERE day >= ?', weekStart)) if (at[r.day]) at[r.day].views = r.n;
        for (const r of this.sql.exec('SELECT day, COUNT(*) AS n FROM people WHERE day >= ? GROUP BY day', weekStart)) if (at[r.day]) at[r.day].players = r.n;
        const week = { plays: days.reduce((a, x) => a + x.plays, 0), views: days.reduce((a, x) => a + x.views, 0), players: this.sql.exec('SELECT COUNT(DISTINCT k) AS n FROM people WHERE day >= ?', weekStart).one().n };
        const t = at[today], site = { live: this.sql.exec('SELECT COUNT(*) AS n FROM live WHERE t >= ?', now - LIVE_MS).one().n, today: { plays: t.plays, views: t.views, players: t.players }, week, days };
        this.memo = JSON.stringify({ games, site, updated: now }); this.memoAt = now;
      }
      return new Response(this.memo, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }
    return json({ error: 'not found' }, 404);
  }
}

// One instance per room code. Players stay connected only while the game is open; nothing is stored.
// A message { to: id } goes to that player only; anything else goes to everyone else in the room.
// The first player in is the host (they run the monsters); if the host leaves, the next player takes over.
const MAX_PLAYERS = 8, MAX_MSG = 16000, BIG_ROOMS = { 'odd-crowd': 14 };   // party games seat more people (Odd Crowd: 10 players + a host screen + reconnects)
export class Rooms {
  constructor(state) { this.state = state; this.socks = new Map(); this.next = 1; this.host = 0; this.game = ''; }
  async fetch(request) {
    if (request.headers.get('upgrade') !== 'websocket') return new Response(JSON.stringify({ game: this.socks.size ? this.game : '', players: this.socks.size }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
    const g = (new URL(request.url).searchParams.get('g') || '').replace(/[^a-z0-9-]/g, '').slice(0, 40);
    if (!this.socks.size || !this.game) this.game = g;
    const pair = new WebSocketPair(), [client, sock] = Object.values(pair);
    sock.accept();
    if (this.socks.size >= (BIG_ROOMS[this.game] || MAX_PLAYERS)) { sock.send(JSON.stringify({ t: 'full' })); sock.close(1000, 'room full'); return new Response(null, { status: 101, webSocket: client }); }
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
