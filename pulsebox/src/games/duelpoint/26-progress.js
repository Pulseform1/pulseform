  /* ---------- 26 progress: your level, the season pass, daily and weekly challenges ----------
     Everything here is earned by playing (bot matches and online alike; not the range). Nothing is bought with money.
     XP comes from a match (matchXp) and from challenges; every point of it goes both to your LEVEL (which never
     resets and shows on your card) and to the SEASON PASS.
     The pass: seasons run eight weeks; thirty tiers of 1000 XP; a reward on every tier of the free track (coins, a bonus
     spin of the daily wheel, a title or a card banner, and skins at 5, 15 and 30), and a second reward on every tier of
     the premium track, which is unlocked with coins you have earned (PASS_PRICE). Rewards are granted the moment a tier
     is reached (premium ones when it is unlocked, for every tier already passed). A skin you already own pays half its
     price in coins instead. The rewards are the same for everyone in a season (seeded by its number).
     Challenges: three a day (new at midnight, your time) and three a week (new on Monday), the same for everyone. Each
     counts what you did in the matches you finish, and pays XP once when it is done.
     Pure data and rules, so the simulation tests can run them; the screens are in 95-pass. */
  const xpForLevel = l => Math.min(3000, 800 + 150 * (l - 1));
  function levelOf(xp) { let l = 1, x = Math.max(0, xp | 0); while (x >= xpForLevel(l) && l < 999) { x -= xpForLevel(l); l++; } return { l, into: x, need: xpForLevel(l) }; }
  const myLevel = () => levelOf(STATS.xp | 0).l;
  const prng = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const localDay = (now = Date.now()) => Math.floor((now - new Date(now).getTimezoneOffset() * 60000) / 86400000), localWeek = (now = Date.now()) => Math.floor((localDay(now) + 3) / 7);
  /* ---- the season ---- */
  const SEASON_DAYS = 56, SEASON_EPOCH = Date.UTC(2026, 10, 16), PASS_TIERS = 30, PASS_XP = 1000, PASS_PRICE = 3000;
  const SEASON_NAMES = ['Emberfall', 'Deep Current', 'Night Shift', 'Glasswind', 'Ironbloom', 'Starwake'];
  const seasonNow = (now = Date.now()) => { const i = Math.max(0, Math.floor((now - SEASON_EPOCH) / (SEASON_DAYS * 864e5))); return { i, n: i + 1, name: SEASON_NAMES[i % SEASON_NAMES.length], left: SEASON_EPOCH + (i + 1) * SEASON_DAYS * 864e5 - now }; };
  // card banners: [dark, light, accent]; 'plain' is everyone's
  const BANNERS = { plain: ['#12161e', '#232a36', '#8d97a6'], ember: ['#2a0c06', '#8a2a0c', '#ff8a3d'], tide: ['#06202e', '#0e5a78', '#5ad8ff'], violet: ['#170a2e', '#4a2a8a', '#b48aff'], gold: ['#2a1e06', '#8a6a14', '#ffd23f'], frost: ['#0e1c2a', '#4a7a9a', '#cfeeff'],
    toxic: ['#0c1e0a', '#2a6a1c', '#9aff4a'], rose: ['#2a0a1a', '#8a2a5a', '#ff8ac0'], steel: ['#14181e', '#4a5460', '#dfe6ee'], aurora: ['#06201e', '#1c6a5a', '#7dffc8'], dusk: ['#1e0e2a', '#7a3a5a', '#ffb07a'], carbon: ['#0a0a0c', '#2a2a30', '#ff5a4d'] };
  const TITLES = ['Rookie', 'Sharpshooter', 'Site Keeper', 'First Blood', 'Clutch Artist', 'Night Owl', 'Deadeye', 'Anchor', 'Entry', 'Lurker', 'Tactician', 'Ace', 'Iron Nerve', 'Ghost', 'Vanguard', 'Marksman', 'Storm Caller', 'The Wall', 'Quick Draw', 'Unbroken', 'Veteran', 'Headhunter', 'Pathfinder', 'Legend'];
  // a season's thirty tiers: [{ f: reward, p: reward }]. A reward: { t: 'coins', n } | { t: 'skin', id } | { t: 'title', s } | { t: 'banner', k } | { t: 'spin' }
  const PASS_CACHE = {};
  function passRewards(si = seasonNow().i) {
    if (PASS_CACHE[si]) return PASS_CACHE[si];
    const r = prng(9001 + si * 7919), lines = Object.keys(LINES), take = (arr, used) => { let x; for (let k = 0; k < 40; k++) { x = arr[Math.floor(r() * arr.length)]; if (!used.has(x)) break; } used.add(x); return x; };
    const usedL = new Set(), usedT = new Set(), usedB = new Set(['plain']), gunOf = knife => knife ? 'knife' : SKIN_GUNS[Math.floor(r() * (SKIN_GUNS.length - 1))];
    const skin = (rar, knife) => ({ t: 'skin', id: skinId(take(lines.filter(l => LINES[l].r === rar), usedL), gunOf(knife)) }), title = () => ({ t: 'title', s: take(TITLES, usedT) }), banner = () => ({ t: 'banner', k: take(Object.keys(BANNERS), usedB) }), coins = n => ({ t: 'coins', n }), spin = () => ({ t: 'spin' });
    const F = { 5: () => skin('rare'), 8: spin, 10: title, 15: () => skin('epic'), 18: spin, 20: banner, 25: title, 28: spin, 30: () => skin('legendary') };
    const P = { 3: banner, 6: () => skin('rare'), 9: title, 12: () => skin('epic'), 15: spin, 18: () => skin('epic', true), 21: banner, 24: () => skin('legendary'), 27: title, 30: () => skin('mythic') };
    const out = []; for (let t = 1; t <= PASS_TIERS; t++) out.push({ f: F[t] ? F[t]() : coins(100 + 10 * Math.floor(t / 3) * 5), p: P[t] ? P[t]() : coins(200 + 25 * Math.floor(t / 3) * 4) });
    return PASS_CACHE[si] = out;
  }
  const rewardName = rw => rw.t === 'coins' ? `${rw.n} coins` : rw.t === 'skin' ? skinName(rw.id) : rw.t === 'title' ? `Title: ${rw.s}` : rw.t === 'banner' ? `Banner: ${rw.k[0].toUpperCase() + rw.k.slice(1)}` : 'Bonus spin';
  // your pass for the season running now (a new season starts it afresh)
  function myPass() { const s = seasonNow(); if (!STATS.pass || STATS.pass.s !== s.i) STATS.pass = { s: s.i, xp: 0, prem: false, f: 0, p: 0 }; return STATS.pass; }
  const passTier = () => Math.min(PASS_TIERS, Math.floor(myPass().xp / PASS_XP));
  function giveReward(rw) {
    if (rw.t === 'coins') STATS.coins = (STATS.coins | 0) + rw.n;
    else if (rw.t === 'skin') { if (STATS.skins.includes(rw.id)) { const n = Math.round(skinPrice(rw.id) / 2); STATS.coins = (STATS.coins | 0) + n; return { t: 'coins', n, was: rw }; } STATS.skins.push(rw.id); }
    else if (rw.t === 'title') { STATS.titles = STATS.titles || []; if (!STATS.titles.includes(rw.s)) STATS.titles.push(rw.s); if (!STATS.title) STATS.title = rw.s; }
    else if (rw.t === 'banner') { STATS.banners = STATS.banners || []; if (!STATS.banners.includes(rw.k)) STATS.banners.push(rw.k); if (!STATS.banner || STATS.banner === 'plain') STATS.banner = rw.k; }
    else if (rw.t === 'spin') STATS.spins = (STATS.spins | 0) + 1;
    return rw;
  }
  // grant whatever the pass now owes: returns [{ tier, prem, rw }] for the screen to show
  function passGrant() {
    const p = myPass(), tier = passTier(), R = passRewards(p.s), got = [];
    for (let t = p.f + 1; t <= tier; t++) got.push({ tier: t, prem: false, rw: giveReward(R[t - 1].f) }); p.f = Math.max(p.f, tier);
    if (p.prem) { for (let t = p.p + 1; t <= tier; t++) got.push({ tier: t, prem: true, rw: giveReward(R[t - 1].p) }); p.p = Math.max(p.p, tier); }
    return got;
  }
  function buyPremium() { const p = myPass(); if (p.prem || (STATS.coins | 0) < PASS_PRICE) return null; STATS.coins -= PASS_PRICE; p.prem = true; return passGrant(); }
  /* ---- challenges ---- [key, words ({n} is the goal), goals to pick from, XP] */
  const CH_DAILY = [['k', 'Get {n} kills', [12, 16, 20], 500], ['hs', 'Get {n} headshot kills', [5, 7], 500], ['win', 'Win {n} matches', [1, 2], 600], ['rw', 'Win {n} rounds', [6, 8], 500], ['obj', 'Plant or defuse the charge {n} times', [2, 3], 500], ['dmg', 'Deal {n} damage', [1500, 2200], 500],
    ['fk', 'Get the first kill of {n} rounds', [2, 3], 500], ['m', 'Play {n} matches', [2, 3], 400], ['Rifle', 'Get {n} kills with rifles', [8, 10], 500], ['SMG', 'Get {n} kills with SMGs', [6], 500], ['Sidearm', 'Get {n} kills with sidearms', [5], 500], ['Shotgun', 'Get {n} kills with shotguns', [4], 500],
    ['Sniper', 'Get {n} kills with snipers', [4], 500], ['Heavy', 'Get {n} kills with the heavy gun', [5], 500], ['Melee', 'Get {n} kill with the knife', [1], 600], ['mk', 'Get 3 kills in one round, {n} times', [1], 600], ['ab', 'Use abilities {n} times', [10, 14], 400]];
  const CH_WEEKLY = [['k', 'Get {n} kills', [80, 100], 2500], ['win', 'Win {n} matches', [5, 7], 3000], ['hs', 'Get {n} headshot kills', [30], 2500], ['rw', 'Win {n} rounds', [35], 2500], ['obj', 'Plant or defuse the charge {n} times', [10], 2500], ['dmg', 'Deal {n} damage', [12000], 2500],
    ['m', 'Play {n} matches', [10], 2000], ['cl', 'Win {n} clutches (last one standing)', [2], 3000], ['fk', 'Get the first kill of {n} rounds', [12], 2500], ['mk', 'Get 3 kills in one round, {n} times', [4], 3000]];
  // (no two of a kind on one day: one about a class of weapon at most, one about kills at most)
  const CH_KIND = { Rifle: 'gun', SMG: 'gun', Sidearm: 'gun', Shotgun: 'gun', Sniper: 'gun', Heavy: 'gun', Melee: 'gun', k: 'kills', hs: 'kills', mk: 'kills', win: 'win', rw: 'win' };
  function pickChallenges(pool, seed, tag) { const r = prng(seed), left = pool.slice(), out = [], kinds = new Set(); while (out.length < 3 && left.length) { const [k, words, goals, xp] = left.splice(Math.floor(r() * left.length), 1)[0], n = goals[Math.floor(r() * goals.length)], kind = CH_KIND[k] || k; if (kinds.has(kind)) continue; kinds.add(kind); out.push({ id: tag + seed + k, k, n, xp, words: words.replace('{n}', n.toLocaleString('en-US')).replace(/^Win 1 matches/, 'Win a match').replace(', 1 times', '').replace('Get 1 kill with', 'Get a kill with').replace(/^Play 1 matches/, 'Play a match') }); } return out; }
  const dailyChallenges = (day = localDay()) => pickChallenges(CH_DAILY, 5000 + day, 'd'), weeklyChallenges = (wk = localWeek()) => pickChallenges(CH_WEEKLY, 300 + wk, 'w');
  // your progress on today's and this week's (old days and weeks are cleared away)
  function myChallenges() {
    const day = localDay(), wk = localWeek(), C = STATS.ch = STATS.ch || { d: day, w: wk, p: {}, done: {} };
    if (C.d !== day || C.w !== wk) { const keep = new Set([...(C.d === day ? dailyChallenges(day) : []), ...(C.w === wk ? weeklyChallenges(wk) : [])].map(c => c.id)); for (const o of [C.p, C.done]) for (const k of Object.keys(o)) if (!keep.has(k)) delete o[k]; C.d = day; C.w = wk; }
    const row = (c, weekly) => Object.assign({}, c, { weekly, at: Math.min(c.n, C.p[c.id] | 0), done: !!C.done[c.id] });
    return [...dailyChallenges(day).map(c => row(c, false)), ...weeklyChallenges(wk).map(c => row(c, true))];
  }
  // what a finished match counts toward them: T is the match's tally (see matchTally). Returns { xp, done: [challenge] }
  function challengeProgress(T) {
    const list = myChallenges(), C = STATS.ch, out = { xp: 0, done: [], moved: [] };
    for (const c of list) { if (c.done) continue; const add = T[c.k] | 0; if (!add) continue; const v = Math.min(c.n, (C.p[c.id] | 0) + add); C.p[c.id] = v; out.moved.push(Object.assign({}, c, { from: c.at, at: v }));
      if (v >= c.n) { C.done[c.id] = 1; out.xp += c.xp; out.done.push(c); } }
    return out;
  }
  // a match, counted: P is you, Mx the match, mine your plants and defuses (the rest is in your match stats)
  function matchTally(P, Mx, won, mine = {}) {
    const T = { m: 1, k: P.stat.k | 0, hs: P.stat.hs | 0, win: won ? 1 : 0, rw: Mx.wins[0] | 0, obj: (mine.plants | 0) + (mine.defuses | 0), dmg: Math.round(P.stat.dmg || 0), fk: P.stat.fk | 0, cl: P.stat.cl | 0, mk: P.stat.mk | 0, ab: P.stat.ab | 0 };
    for (const [cat, n] of Object.entries(P.stat.cat || {})) T[cat] = n; return T;
  }
  // the XP a match pays: rows for the screen, and the total
  function matchXp(P, Mx, won, extra = {}) {
    const rows = [], add = (label, n) => { if (n) rows.push([label, Math.round(n)]); };
    add('Match played', 150); add(`${P.stat.k} kill${P.stat.k === 1 ? '' : 's'}`, P.stat.k * 12); add(`${Mx.wins[0]} round${Mx.wins[0] === 1 ? '' : 's'} won`, Mx.wins[0] * 25); if (won) add('Victory', 200);
    { const o = (extra.plants | 0) + (extra.defuses | 0); add(`${o} plant${o === 1 ? '' : 's'} and defuse${o === 1 ? '' : 's'}`, o * 20); }
    let sub = rows.reduce((a, r) => a + r[1], 0); const lvl = Mx.online ? 1.1 : [.7, .9, 1, 1.1][cl(extra.botLevel == null ? 1 : extra.botLevel, 0, 3)];
    const total = Math.round(sub * lvl); if (lvl !== 1) rows.push([Mx.online ? 'Online match' : 'Bot level', total - sub]);
    return { rows, total };
  }
  /* a finished match, paid out: XP to your level and the pass, challenges moved on, pass rewards granted. Returns what
     the rewards screen shows: { xp: { rows, total }, level: [before, after] (each { l, into, need }), pass: { tier0, tier1,
     xp0, xp1 }, ch: { moved, done }, got: [{ tier, prem, rw }] } */
  function payProgress(P, Mx, won, mine = {}) {
    const xp = matchXp(P, Mx, won, mine), ch = challengeProgress(matchTally(P, Mx, won, mine)); for (const c of ch.done) xp.rows.push([(c.weekly ? 'Weekly: ' : 'Daily: ') + c.words, c.xp]); xp.total += ch.xp;
    const acct0 = STATS.xp | 0, lv0 = levelOf(acct0), p = myPass(), tier0 = passTier(), xp0 = p.xp;
    STATS.xp = acct0 + xp.total; p.xp += xp.total;
    return { xp, acct: [acct0, STATS.xp], level: [lv0, levelOf(STATS.xp)], pass: { tier0, tier1: passTier(), xp0, xp1: p.xp }, ch, got: passGrant() };
  }
  // a bot's card: a level and (now and then) a title, from its name, so it is the same every time you meet it
  function botCard(name, rating = 1000) { let h = 7; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const r = prng(h); return { lv: Math.max(1, Math.round((rating - 500) / 28 + r() * 14)), title: r() < .4 ? TITLES[Math.floor(r() * TITLES.length)] : '', banner: r() < .35 ? Object.keys(BANNERS)[1 + Math.floor(r() * (Object.keys(BANNERS).length - 1))] : 'plain' }; }
  // your own card, as others see it
  const myCard = () => ({ lv: myLevel(), title: STATS.title || '', banner: BANNERS[STATS.banner] ? STATS.banner : 'plain' });
  // a card as it travels between devices ('level|title number|banner'), and read back with nothing trusted
  const cardCode = () => { const c = myCard(); return c.lv + '|' + TITLES.indexOf(c.title) + '|' + c.banner; };
  const cardFrom = s => { const [a, b, c] = String(s || '').slice(0, 40).split('|'); return { lv: cl(a | 0, 1, 999), title: TITLES[+b] || '', banner: BANNERS[c] ? c : 'plain' }; };
  const cardOf = f => f === me() ? myCard() : f.bot || f.isBot ? botCard(f.name, f.rating || 1000) : f.card || { lv: 0, title: '', banner: 'plain' };
  /* the awards under the line-up when a match ends: everyone gets the thing they did best. The best combat score on the
     winning side is the match's MVP (and, in a team match, the best on the other side its team's); then each award goes
     to whoever leads it among those still without one. Returns a Map: fighter key → { title, line, top } */
  function matchAwards(fs, winTeam) {
    const L = fs.filter(f => !f.gone), out = new Map(), s = f => f.stat, plural = (n, w, ws) => n + ' ' + (n === 1 ? w : ws || w + 's');
    const give = (title, val, line, min, pool, top) => { const c = (pool || L).filter(f => !out.has(f.key)).map(f => [f, val(f)]).filter(q => q[1] >= min).sort((a, b) => b[1] - a[1] || csOf(b[0]) - csOf(a[0]))[0]; if (c) out.set(c[0].key, { title, line: line(c[1]), top: !!top }); };
    give('MATCH MVP', csOf, v => v + ' combat score', 0, L.filter(f => f.team === winTeam), true);
    if (L.filter(f => f.team !== winTeam).length > 1) give('TEAM MVP', csOf, v => v + ' combat score', 0, L.filter(f => f.team !== winTeam));
    give('SHARPSHOOTER', f => s(f).k >= 4 ? Math.round(100 * s(f).hs / s(f).k) : 0, v => v + '% headshots', 40);
    give('FIRST BLOOD', f => s(f).fk | 0, v => plural(v, 'first kill'), 1);
    give('CLUTCH', f => s(f).cl | 0, v => plural(v, 'clutch', 'clutches') + ' won', 1);
    give('SITE EXPERT', f => (s(f).pl | 0) + (s(f).df | 0), v => plural(v, 'plant or defuse', 'plants and defuses'), 1);
    give('TRIPLE THREAT', f => s(f).mk | 0, v => plural(v, 'round') + ' with 3 kills', 1);
    give('TOP FRAGGER', f => s(f).k, v => plural(v, 'kill'), 2);
    give('HEAVY HITTER', f => Math.round(s(f).dmg || 0), v => v + ' damage', 1);
    give('HARD TO KILL', f => 1000 - s(f).d, v => plural(1000 - v, 'death'), 0);
    for (const f of L) if (!out.has(f.key)) out.set(f.key, { title: 'IN THE FIGHT', line: csOf(f) + ' combat score', top: false });
    return out;
  }
