/* Awaken's small server: daily reminder pushes and end-to-end encrypted cloud saves.
   Everything lives in one SQLite-backed Durable Object ("Store"). The app works fully without it. */
import { DurableObject } from 'cloudflare:workers';

const MAX_SAVE = 1_000_000;          // bytes of encrypted save text
const MAX_SUBS = 50_000;
const ID_RE = /^[0-9a-f]{64}$/;
// only real push services, so the server can't be pointed at arbitrary URLs
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /\.notify\.windows\.com$/, /^push\.services\.mozilla\.com$/];

export class Store extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS saves(id TEXT PRIMARY KEY, data TEXT NOT NULL, rev INTEGER NOT NULL, updated INTEGER NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS subs(id TEXT PRIMARY KEY, endpoint TEXT NOT NULL, tz TEXT NOT NULL, reset INTEGER NOT NULL,
      before INTEGER NOT NULL, rest TEXT NOT NULL, skip TEXT, sent TEXT, created INTEGER NOT NULL)`);
  }

  getSave(id) {
    return this.sql.exec('SELECT data, rev, updated FROM saves WHERE id = ?', id).toArray()[0] || null;
  }
  // base is the revision the device last saw; anything else means another device wrote in between
  putSave(id, data, base) {
    const cur = this.sql.exec('SELECT rev, updated FROM saves WHERE id = ?', id).toArray()[0];
    if ((cur ? cur.rev : 0) !== base) return { conflict: true, rev: cur ? cur.rev : 0, updated: cur ? cur.updated : 0 };
    const rev = base + 1, updated = Date.now();
    this.sql.exec('INSERT OR REPLACE INTO saves (id, data, rev, updated) VALUES (?, ?, ?, ?)', id, data, rev, updated);
    return { rev, updated };
  }
  deleteSave(id) {
    this.sql.exec('DELETE FROM saves WHERE id = ?', id);
  }

  putSub(s) {
    const n = this.sql.exec('SELECT COUNT(*) AS n FROM subs').one().n;
    const had = this.sql.exec('SELECT sent FROM subs WHERE id = ?', s.id).toArray()[0];
    if (!had && n >= MAX_SUBS) return false;
    this.sql.exec(`INSERT OR REPLACE INTO subs (id, endpoint, tz, reset, before, rest, skip, sent, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      s.id, s.endpoint, s.tz, s.reset, s.before, JSON.stringify(s.rest), s.skip, had ? had.sent : null, Date.now());
    return true;
  }
  updateSub(id, s) {
    const cur = this.sql.exec('SELECT id FROM subs WHERE id = ?', id).toArray()[0];
    if (!cur) return false;
    this.sql.exec('UPDATE subs SET tz = ?, reset = ?, before = ?, rest = ?, skip = ? WHERE id = ?', s.tz, s.reset, s.before, JSON.stringify(s.rest), s.skip, id);
    return true;
  }
  deleteSub(id) {
    this.sql.exec('DELETE FROM subs WHERE id = ?', id);
  }
  getSub(id) {
    return this.sql.exec('SELECT endpoint FROM subs WHERE id = ?', id).toArray()[0] || null;
  }

  // reminders that are due now: inside the last hours before the player's reset, not sent or skipped for this quest day
  due(now) {
    const out = [];
    for (const s of this.sql.exec('SELECT id, endpoint, tz, reset, before, rest, skip, sent FROM subs')) {
      const q = questClock(s.tz, s.reset, now);
      if (!q) continue;
      if (q.hours < 24 - s.before || s.sent === q.day || s.skip === q.day) continue;
      if (JSON.parse(s.rest).includes(q.weekday)) continue;
      out.push({ id: s.id, endpoint: s.endpoint, day: q.day });
    }
    return out;
  }
  markSent(id, day) {
    this.sql.exec('UPDATE subs SET sent = ? WHERE id = ?', day, id);
  }
}

// the player's quest day (it starts at their reset hour), how far into it they are, and its weekday
export function questClock(tz, reset, now) {
  let parts;
  try {
    parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date(now)).map(p => [p.type, p.value]));
  } catch (e) { return null; }
  const local = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute) - reset * 3600000;
  const d = new Date(local), pad = n => String(n).padStart(2, '0');
  return { day: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, hours: d.getUTCHours() + d.getUTCMinutes() / 60, weekday: d.getUTCDay() };
}

/* ---------- Web Push (VAPID, no payload: the app's service worker writes the message itself) ---------- */
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uText = s => b64u(new TextEncoder().encode(s));
let signKey = null;
async function vapidHeader(env, endpoint) {
  if (!signKey) signKey = await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const unsigned = b64uText(JSON.stringify({ typ: 'JWT', alg: 'ES256' })) + '.' +
    b64uText(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:awaken@example.com' }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signKey, new TextEncoder().encode(unsigned));
  return `vapid t=${unsigned}.${b64u(sig)}, k=${env.VAPID_PUBLIC}`;
}
async function sendPush(env, endpoint) {
  const res = await fetch(endpoint, { method: 'POST', headers: { Authorization: await vapidHeader(env, endpoint), TTL: '14400', Urgency: 'normal', 'Content-Length': '0' } });
  return res.status;
}
function okEndpoint(e) {
  try { const u = new URL(e); return u.protocol === 'https:' && e.length < 1000 && PUSH_HOSTS.some(r => r.test(u.hostname)); } catch (err) { return false; }
}
function okTz(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return typeof tz === 'string' && tz.length < 64; } catch (e) { return false; }
}
async function sha(s) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
function subPrefs(b) {
  const reset = Math.round(+b.reset), before = Math.round(+b.before);
  if (!okTz(b.tz) || !(reset >= 0 && reset <= 23) || !(before >= 1 && before <= 12)) return null;
  const rest = Array.isArray(b.rest) ? [...new Set(b.rest.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))] : [];
  const skip = typeof b.skip === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.skip) ? b.skip : null;
  return { tz: b.tz, reset, before, rest, skip };
}

/* ---------- HTTP ---------- */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, PUT, POST, DELETE, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS } });
async function body(req) {
  const t = await req.text();
  if (t.length > MAX_SAVE + 2000) throw Object.assign(new Error('too large'), { status: 413 });
  try { return JSON.parse(t || '{}'); } catch (e) { throw Object.assign(new Error('bad json'), { status: 400 }); }
}
const store = env => env.STORE.get(env.STORE.idFromName('main'));

export async function handleApi(req, env) {
  const url = new URL(req.url), path = url.pathname;
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  try {
    if (path === '/api/push/key' && req.method === 'GET') return env.VAPID_PUBLIC ? json({ key: env.VAPID_PUBLIC }) : json({ error: 'push not configured' }, 503);

    if (path.startsWith('/api/push/') && req.method === 'POST') {
      const b = await body(req);
      if (!okEndpoint(b.endpoint)) return json({ error: 'unsupported push endpoint' }, 400);
      const id = await sha(b.endpoint), st = store(env);
      if (path === '/api/push/subscribe') {
        const p = subPrefs(b);
        if (!p) return json({ error: 'bad reminder settings' }, 400);
        return (await st.putSub({ id, endpoint: b.endpoint, ...p })) ? json({ ok: true }) : json({ error: 'full' }, 503);
      }
      if (path === '/api/push/state') {
        const p = subPrefs(b);
        if (!p) return json({ error: 'bad reminder settings' }, 400);
        return (await st.updateSub(id, p)) ? json({ ok: true }) : json({ error: 'not subscribed' }, 404);
      }
      if (path === '/api/push/unsubscribe') { await st.deleteSub(id); return json({ ok: true }); }
      if (path === '/api/push/test') {
        if (!(await st.getSub(id))) return json({ error: 'not subscribed' }, 404);
        const status = await sendPush(env, b.endpoint);
        return json({ ok: status >= 200 && status < 300, status });
      }
    }

    const m = path.match(/^\/api\/sync\/([^/]+)$/);
    if (m) {
      const id = m[1];
      if (!ID_RE.test(id)) return json({ error: 'bad id' }, 400);
      const st = store(env);
      if (req.method === 'GET') { const s = await st.getSave(id); return s ? json(s) : json({ error: 'not found' }, 404); }
      if (req.method === 'PUT') {
        const b = await body(req);
        if (typeof b.data !== 'string' || b.data.length > MAX_SAVE || !Number.isInteger(b.base) || b.base < 0) return json({ error: 'bad save' }, 400);
        const r = await st.putSave(id, b.data, b.base);
        return r.conflict ? json(r, 409) : json(r);
      }
      if (req.method === 'DELETE') { await st.deleteSave(id); return json({ ok: true }); }
    }
    return json({ error: 'not found' }, 404);
  } catch (e) {
    return json({ error: e.status ? e.message : 'server error' }, e.status || 500);
  }
}

// cron: every 15 minutes, send each due reminder once; drop subscriptions the push service says are gone
export async function runReminders(env) {
  if (!env.VAPID_PRIVATE_JWK) return;
  const st = store(env), list = await st.due(Date.now());
  for (let i = 0; i < list.length; i += 20) {
    await Promise.all(list.slice(i, i + 20).map(async s => {
      try {
        const status = await sendPush(env, s.endpoint);
        if (status === 404 || status === 410) await st.deleteSub(s.id);
        else if (status >= 200 && status < 300) await st.markSent(s.id, s.day);
      } catch (e) {}
    }));
  }
}
