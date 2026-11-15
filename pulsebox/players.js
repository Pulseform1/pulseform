// PULSEBOX LEADERBOARD: one board of the top 50 players across all of Pulsebox, ranked by a Pulse Score.
//
// Everyone on it has an account and a username they picked once (unique, tied to the account, never changes).
// The hub sends the player's profile numbers (streak, games beaten, badges, level...); the server checks each is in a
// believable range and works out the score itself, with the weights below. The board is one Durable Object (Players).
//
//   GET  /api/players/top         -> { top: [{ rank, name, level, score, streak, beaten }] x<=50, total, me? }
//   GET  /api/players/me          -> { name }                     (your username, or null if you haven't picked one)
//   POST /api/players/name        <- { name } -> { name } | { error: 'taken' | 'set' | 'short' | 'long' | 'chars' | 'rude' }   (once per account; no two players share a name)
//   POST /api/players/stats       <- { xp, streak, bestStreak, lastDaily, dailies, beaten, tried, badges, top10, firsts, sessions, lastPlay }
//                                 -> { score, rank }

// THE PULSE SCORE. Deliberately biased: coming back every day (the daily-challenge streak) counts for far more than
// anything else, and players who have been playing lately get a boost while ones who have gone quiet slowly sink.
export const WEIGHTS = {
  streak: 150,       // per day of your current daily streak (only while it's alive: done today or yesterday)
  bestStreak: 20,    // per day of your best streak ever
  beaten: 60,        // per game you've finished with a score
  tried: 10,         // per different game you've played
  dailies: 30,       // per daily challenge you've done
  badges: 40,        // per badge
  level: 35,         // per level
  top10: 75,         // per world leaderboard where you're in the top 10
  firsts: 250,       // per world leaderboard where you're #1
  sessions: 1,       // per game session (counts up to 1,500)
};
// the recent-play bias: x1.25 if you played in the last 2 days, x1 within a week, then down to x0.6 after a month away
const recency = days => days <= 2 ? 1.25 : days <= 7 ? 1 : days <= 14 ? .9 : days <= 30 ? .75 : .6;
// believable numbers. The profile lives on the player's device, so nothing is taken on trust: each number is capped,
// they must agree with each other (a streak can't be longer than the dailies done, XP can't be more than the play could
// earn), and after someone's first entry each can only grow as fast as real play allows (GROW, per hour since last time).
const CAP = { streak: 150, bestStreak: 150, dailies: 150, beaten: 90, tried: 90, badges: 30, top10: 90, firsts: 90, sessions: 4000 };
// growth allowance per number: [how much it can hold, how much it refills per hour] (a bucket: a real burst of play fits,
// steady inflation doesn't). Dailies: 2 at once, then one per 20 hours.
const GROW = { dailies: [2, 1 / 20], sessions: [60, 15], tried: [20, 6], beaten: [20, 6], badges: [8, 3], top10: [4, 1], firsts: [2, .25], xp: [3000, 900] };
// names that are never allowed. Look-alike spellings are undone first (sh1t, f.u.c.k, b!tch, a$$, fuuuck).
//   STRONG words are refused anywhere in a name. MILD words are refused only as a word of their own (BigDick, sex_god,
//   Weed420), so ordinary names that merely contain the letters (Dickens, Essex, Grape, Peacock, Document) are fine.
const STRONG = ['fuck', 'fuk', 'fck', 'phuk', 'shit', 'bitch', 'btch', 'cunt', 'nigg', 'nigga', 'niga', 'faggot', 'whore', 'slut', 'porn', 'pussy', 'rapist', 'hitler', 'nazi', 'retard', 'dildo', 'penis', 'vagina',
  'asshole', 'bastard', 'jizz', 'milf', 'pedo', 'molest', 'kike', 'tranny', 'killyourself', 'kys', 'onlyfans', 'pornhub', 'incest', 'blowjob', 'handjob', 'cumshot', 'motherf', 'wanker', 'twat'];
const MILD = ['sex', 'sexy', 'dick', 'cock', 'cum', 'anal', 'anus', 'rape', 'hoe', 'hoes', 'tits', 'titty', 'boob', 'boobs', 'spic', 'chink', 'gook', 'fag', 'damn', 'hell', 'meth', 'weed', 'stfu', 'wtf', 'gtfo',
  'arse', 'ass', 'prick', 'shag', 'nude', 'nudes', 'naked', 'horny', 'skank', 'smut', 'isis', 'kkk', 'nsfw', 'xxx', 'drugs', 'cocaine', 'heroin', 'suicide', 'kill', 'die', 'terrorist', 'gay', 'lesbian'];
const RESERVED = ['admin', 'administrator', 'moderator', 'mod', 'staff', 'pulsebox', 'pulseform', 'official', 'support', 'owner', 'developer', 'dev', 'system', 'claude', 'anthropic', 'team'];
const LEET = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b', '9': 'g', '6': 'g' };
const unleet = (v, one = 'i') => v.toLowerCase().replace(/[0-9!|@$+]/g, c => c === '1' || c === '|' ? one : LEET[c] || c);   // a 1 can stand for i or l
const dedupe = v => v.replace(/(.)\1+/g, '$1');   // fuuuck -> fuck (only used for words that stay 4+ letters long)
function badName(v) {
  const wholes = [unleet(v), unleet(v, 'l')].map(x => x.replace(/[^a-z]/g, '')), whole = wholes[0];
  if (wholes.some(x => STRONG.some(w => x.includes(w) || (dedupe(w).length >= 4 && dedupe(x).includes(dedupe(w)))))) return true;
  // the words of the name: split at spaces, _ . - and digits that aren't look-alikes, and at camelCase (BigDick -> big, dick)
  const parts = v.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s_.-]+/);
  const words = [...parts.map(w => unleet(w).replace(/[^a-z]/g, '')), ...parts.flatMap(w => w.toLowerCase().split(/[^a-z]+/))].filter(Boolean);   // with look-alikes undone, and split at numbers
  const forms = w => [w, w + 's', w + 'y', w + 'ie', w + 'er', w + 'ing', w + 'z'];
  if (words.concat([whole]).some(t => MILD.some(w => forms(w).includes(t) || forms(w).includes(dedupe(t))))) return true;
  return words.some(t => RESERVED.includes(t)) || RESERVED.some(w => w.length >= 5 && whole.startsWith(w));
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
const TZ = 'America/New_York', dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const day = (t = Date.now()) => dayFmt.format(new Date(t));
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
// the same level curve as the hub: 100 XP for level 2, then 40 more each level
const levelOf = xp => { let L = 1, left = xp; while (left >= 100 + 40 * (L - 1) && L < 999) { left -= 100 + 40 * (L - 1); L++; } return L; };
// a username: 3 to 15 letters, numbers, spaces, _ . - (starting and ending with a letter or number), nothing rude
export function cleanName(n) {
  const v = String(n || '').replace(/\s+/g, ' ').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 _.-]{1,13}[A-Za-z0-9]$/.test(v)) return null;
  return badName(v) ? null : v;
}
export const nameProblem = n => { const v = String(n || '').replace(/\s+/g, ' ').trim(); return v.length < 3 ? 'short' : v.length > 15 ? 'long' : !/^[A-Za-z0-9][A-Za-z0-9 _.-]*[A-Za-z0-9]$/.test(v) ? 'chars' : badName(v) ? 'rude' : null; };
export function pulseScore(s, prev, hours) {
  const n = (k, v) => Math.max(0, Math.min(CAP[k] || 1e9, Math.floor(+v || 0)));
  const today = day(), alive = /^\d{4}-\d\d-\d\d$/.test(s.lastDaily || '') && daysBetween(s.lastDaily, today) <= 1;
  const st = { dailies: n('dailies', s.dailies), sessions: n('sessions', s.sessions), tried: n('tried', s.tried), badges: n('badges', s.badges) };
  st.beaten = Math.min(n('beaten', s.beaten), st.tried); st.top10 = Math.min(n('top10', s.top10), st.beaten); st.firsts = Math.min(n('firsts', s.firsts), st.top10);
  st.bestStreak = Math.min(n('bestStreak', s.bestStreak), st.dailies); st.streak = alive ? Math.min(n('streak', s.streak), st.bestStreak || st.dailies, st.dailies) : 0;
  // XP: no more than these could have earned (new games 50, sessions 10 + a personal best 25, dailies 325, badges 50)
  let xp = Math.min(Math.max(0, +s.xp || 0), 50 * st.tried + 35 * st.sessions + 325 * st.dailies + 50 * st.badges);
  st.xp = Math.floor(xp); st.bud = {};
  if (prev) {   // growth since last time, at the pace real play allows
    for (const [k, [cap, per]] of Object.entries(GROW)) {
      const was = prev[k] || 0, b = Math.min(cap, ((prev.bud || {})[k] ?? cap) + per * hours), up = Math.max(0, Math.min(st[k] - was, Math.floor(b)));
      st[k] = Math.min(st[k], was + up); st.bud[k] = b - up;
    }
    st.streak = Math.min(st.streak, (prev.streak || 0) + Math.max(0, st.dailies - (prev.dailies || 0)));   // a streak grows only with new dailies
    st.bestStreak = Math.min(st.bestStreak, Math.max(prev.bestStreak || 0, st.streak)); st.beaten = Math.min(st.beaten, st.tried); st.top10 = Math.min(st.top10, st.beaten); st.firsts = Math.min(st.firsts, st.top10);
  } else for (const [k, [cap]] of Object.entries(GROW)) st.bud[k] = cap;
  st.level = levelOf(st.xp);
  const away = /^\d{4}-\d\d-\d\d$/.test(s.lastPlay || '') ? Math.max(0, daysBetween(s.lastPlay, today)) : 99;
  let raw = 0; for (const [k, w] of Object.entries(WEIGHTS)) raw += w * Math.min(st[k] || 0, k === 'sessions' ? 1500 : 1e9);
  return { score: Math.round(raw * recency(away)), st, boost: recency(away) };
}

export async function players(request, env, url, caller) {
  const stub = env.PLAYERS.get(env.PLAYERS.idFromName('global')), sub = url.pathname.slice('/api/players/'.length);
  const who = await caller();
  if (sub === 'top' && request.method === 'GET') return stub.fetch('https://p/top', { method: 'POST', body: JSON.stringify({ uid: who ? who.uid : null }) });
  if (!who) return json({ error: 'sign in' }, 401);
  if (sub === 'me' && request.method === 'GET') return stub.fetch('https://p/me', { method: 'POST', body: JSON.stringify({ uid: who.uid }) });
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let b; try { b = JSON.parse(await request.text()); } catch (e) { return json({ error: 'bad json' }, 400); }
  if (sub === 'name') { const name = cleanName(b.name); if (!name) return json({ error: nameProblem(b.name) || 'bad' }, 400); return stub.fetch('https://p/name', { method: 'POST', body: JSON.stringify({ uid: who.uid, name }) }); }
  if (sub === 'stats') return stub.fetch('https://p/stats', { method: 'POST', body: JSON.stringify({ uid: who.uid, s: b || {} }) });
  return json({ error: 'not found' }, 404);
}

export class Players {
  constructor(state) {
    this.state = state; this.sql = state.storage.sql; this.cache = null; this.cacheAt = 0;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS names (uid TEXT PRIMARY KEY, name TEXT NOT NULL, k TEXT NOT NULL UNIQUE, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS board (uid TEXT PRIMARY KEY, score INTEGER NOT NULL, level INTEGER NOT NULL, streak INTEGER NOT NULL, beaten INTEGER NOT NULL, st TEXT NOT NULL, at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS board_score ON board (score DESC, at ASC);`);
  }
  one(q, ...a) { return this.sql.exec(q, ...a).toArray()[0] || null; }
  rankOf(score, at) { return this.one('SELECT COUNT(*) AS n FROM board WHERE score > ? OR (score = ? AND at < ?)', score, score, at).n + 1; }
  async fetch(request) {
    const p = new URL(request.url).pathname, b = await request.json(), now = Date.now();
    if (p === '/top') {
      if (!this.cache || now - this.cacheAt > 15000) {
        const rows = this.sql.exec('SELECT n.name, b.level, b.score, b.streak, b.beaten FROM board b JOIN names n ON n.uid = b.uid ORDER BY b.score DESC, b.at ASC LIMIT 50').toArray();
        this.cache = { top: rows.map((r, i) => ({ rank: i + 1, ...r })), total: this.one('SELECT COUNT(*) AS n FROM board').n }; this.cacheAt = now;
      }
      const out = { ...this.cache, weights: WEIGHTS };   // the page explains the score from the same numbers
      if (b.uid) { const m = this.one('SELECT b.score, b.level, b.streak, b.beaten, b.at, b.st, n.name FROM board b JOIN names n ON n.uid = b.uid WHERE b.uid = ?', b.uid); if (m) out.me = { name: m.name, score: m.score, level: m.level, streak: m.streak, beaten: m.beaten, rank: this.rankOf(m.score, m.at), st: JSON.parse(m.st) }; }
      return json(out);
    }
    if (p === '/me') { const r = this.one('SELECT name FROM names WHERE uid = ?', b.uid); return json({ name: r ? r.name : null }); }
    if (p === '/name') {
      if (this.one('SELECT 1 FROM names WHERE uid = ?', b.uid)) return json({ error: 'set' }, 409);   // picked once, for good
      try { this.sql.exec('INSERT INTO names (uid, name, k, at) VALUES (?, ?, ?, ?)', b.uid, b.name, b.name.toLowerCase().replace(/[ _.-]/g, ''), now); }
      catch (e) { return json({ error: 'taken' }, 409); }
      this.cache = null; return json({ name: b.name });
    }
    if (p === '/stats') {
      if (!this.one('SELECT 1 FROM names WHERE uid = ?', b.uid)) return json({ error: 'name first' }, 409);
      const prev = this.one('SELECT at, st FROM board WHERE uid = ?', b.uid);
      if (prev && now - prev.at < 10000) return json({ error: 'slow down' }, 429);
      Object.assign(b, pulseScore(b.s, prev ? JSON.parse(prev.st) : null, prev ? (now - prev.at) / 3600000 : 0));
      this.sql.exec('INSERT INTO board (uid, score, level, streak, beaten, st, at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(uid) DO UPDATE SET score = excluded.score, level = excluded.level, streak = excluded.streak, beaten = excluded.beaten, st = excluded.st, at = excluded.at',
        b.uid, b.score, b.st.level, b.st.streak, b.st.beaten, JSON.stringify({ ...b.st, boost: b.boost }), now);
      this.cache = null;
      return json({ score: b.score, rank: this.rankOf(b.score, now) });
    }
    return json({ error: 'not found' }, 404);
  }
}
