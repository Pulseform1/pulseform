/* Legend Maker: create an athlete you are proud of, live the career, then put them up against other real players' legends.
   CREATE: pick a sport, then make them yours: name, skin, hair, team colours, number and build. Spin the reel of
   (fictional) pros and draft one of each pro's ratings into an empty attribute slot (six slots, two rerolls), then choose a
   signature trait. You get a trading card of your legend.
   CAREER: every season is played, not picked from a menu: a training-camp drill you choose the skill for, two big moments
   from real game situations (timing shots, aiming, power throws, juke combos, battles for the ball), the finals clutch
   moment when your team gets there, and events in between (contract talks, rehab, rivalry games, the All-Star skills
   contest). Old enough, and you decide when to retire.
   AFTER: the Hall of Fame verdict, the Legends Ladder against ten all-time greats, and the ARENA: publish your legend
   online and duel other real players' legends, stat against stat, for an arena rating. Daily: the same reel for everyone. */
const GAME = {
  id: 'legend-maker', title: 'Legend Maker', tagline: 'Create a legend. Live the career. Beat real players.',
  font: 'Bebas Neue', accent: '#ffb02e', accent2: '#29e0ff', bg: '#101626', noHud: true, scoreLabel: 'Legacy',
  how: [
    'CREATE: pick a sport, name your legend and choose the look. Spin the reel and draft each pro\'s rating into an empty slot, then pick a signature trait.',
    'CAREER: choose what to drill at camp, then play the big moments: stop the bar, aim the shot, nail the combo, win the battle. The finals come down to one clutch moment.',
    'ARENA: publish your legend and duel other real players\' legends, stat against stat. Climb the Legends Ladder, and fill your Hall of Fame.',
  ],
  skins: [{ name: 'No extras', price: 0, k: 'none' }, { name: 'Headband', price: 25, k: 'band' }, { name: 'Shades', price: 60, k: 'shades' }, { name: 'Gold Chain', price: 100, k: 'chain' }, { name: 'Captain Armband', price: 150, k: 'arm' }, { name: 'Champion Crown', price: 240, k: 'crown' }, { name: 'Legend Aura', price: 380, k: 'aura' }],
};
(() => {
  const FD = '"Bebas Neue", Impact, sans-serif', FB = 'Nunito, system-ui, sans-serif', f = (px, w = 800) => `${w} ${px}px ${FB}`, d = px => `${px}px ${FD}`;
  const SPORTS = {
    hoops: { name: 'HOOPS', role: 'hooper', c: '#ff8a2e', at: ['Shooting', 'Finishing', 'Passing', 'Defense', 'Rebounding', 'Athleticism'], w: [1.3, 1.1, 1, 1, .9, 1.2],
      stat: ['PPG', 'RPG', 'APG'], champ: 'title', league: 'pro league', mvp: 'MVP', star: 'All-Star', dpoy: 'Defensive Player of the Year', lean: [0, 2], power: [4, 1],
      moments: [['Pull-up three at the buzzer', 'bar', 0], ['Fast break: beat your man', 'combo', 5], ['No-look pass to the cutter', 'aim', 2], ['Fight for the rebound', 'mash', 4], ['Lockdown stop on their star', 'combo', 3], ['And-one through contact', 'power', 1]] },
    gridiron: { name: 'GRIDIRON', role: 'quarterback', c: '#3ddc84', at: ['Arm', 'Accuracy', 'Vision', 'Mobility', 'Poise', 'Durability'], w: [1.2, 1.3, 1.2, .9, 1.1, .8],
      stat: ['Pass YDS', 'TD', 'INT'], champ: 'championship ring', league: 'league', mvp: 'MVP', star: 'Pro Bowl', dpoy: 'Offensive Player of the Year', lean: [3, 1], power: [0, 5],
      moments: [['Deep bomb down the sideline', 'power', 0], ['Thread it into the end zone', 'aim', 1], ['Read the blitz', 'combo', 2], ['Scramble out of the pocket', 'combo', 3], ['Fourth and one: sneak it', 'mash', 5], ['Two-minute drill', 'bar', 4]] },
    soccer: { name: 'SOCCER', role: 'striker', c: '#29e0ff', at: ['Finishing', 'Pace', 'Dribbling', 'Heading', 'Vision', 'Stamina'], w: [1.4, 1.2, 1.1, .8, 1, .9],
      stat: ['Goals', 'Assists', 'Apps'], champ: 'league title', league: 'top flight', mvp: 'Player of the Year', star: 'Team of the Year', dpoy: 'Golden Boot', lean: [1, 2], power: [3, 0],
      moments: [['Penalty kick: pick your corner', 'aim', 0], ['Breakaway on the counter', 'combo', 1], ['Dance past two defenders', 'combo', 2], ['Power header from the corner', 'power', 3], ['Hold off the centre-back', 'mash', 5], ['Curl it into the top corner', 'bar', 0]] },
    hockey: { name: 'HOCKEY', role: 'center', c: '#7ab8ff', at: ['Shooting', 'Skating', 'Passing', 'Checking', 'Faceoffs', 'Endurance'], w: [1.3, 1.2, 1.1, .9, .8, .9],
      stat: ['Goals', 'Assists', 'Points'], champ: 'cup', league: 'league', mvp: 'MVP', star: 'All-Star', dpoy: 'Top Scorer', lean: [1, 2], power: [3, 0],
      moments: [['One-timer from the point', 'bar', 0], ['Pick the top shelf', 'aim', 0], ['Deke the goalie', 'combo', 1], ['Win the faceoff', 'mash', 4], ['Saucer pass across the crease', 'aim', 2], ['Board battle in the corner', 'mash', 3]] },
    diamond: { name: 'BASEBALL', role: 'slugger', c: '#ff5f6a', at: ['Contact', 'Power', 'Eye', 'Speed', 'Fielding', 'Durability'], w: [1.25, 1.3, 1, .8, .8, .9],
      stat: ['AVG', 'HR', 'RBI'], champ: 'world title', league: 'league', mvp: 'MVP', star: 'All-Star', dpoy: 'Gold Glove', lean: [3, 0], power: [1, 5],
      moments: [['Time the fastball', 'bar', 0], ['Swing for the fences', 'power', 1], ['Lay off the slider', 'aim', 2], ['Stretch a double into a triple', 'combo', 3], ['Diving catch in the gap', 'aim', 4], ['Steal second', 'mash', 3]] },
  };
  const TRAITS = [
    { k: 'clutch', n: 'CLUTCH GENE', d: 'Big moments and the finals: your timing zones are 30% bigger.', ic: '⚡' },
    { k: 'iron', n: 'IRON MAN', d: 'Half the injuries, and two more seasons in the tank.', ic: '🛡️' },
    { k: 'gym', n: 'GYM RAT', d: 'Training camp gains are 60% bigger.', ic: '🏋️' },
    { k: 'show', n: 'SHOWTIME', d: 'Highlights and awards are worth 40% more legacy.', ic: '🎬' },
    { k: 'leader', n: 'LEADER', d: 'Your teams are better: more trips to the finals.', ic: '©️' },
    { k: 'bloom', n: 'LATE BLOOMER', d: 'A slower start, but you stay at your peak for years longer.', ic: '🌱' },
  ];
  const SKIN = ['#f6d2b4', '#e8b48a', '#c88a5a', '#a86a42', '#7a4a2a', '#4a2a18'];
  const HAIRC = ['#1a1210', '#4a2a14', '#8a5a2a', '#d8b060', '#c84a2a', '#e8e8e8'];
  const HAIRS = ['BUZZ', 'FADE', 'AFRO', 'BRAIDS', 'LONG', 'BALD', 'MOHAWK', 'BUN'];
  const TEAM = ['#e8343a', '#ff8a2e', '#ffd23f', '#3ddc84', '#1f9a5a', '#29e0ff', '#2a6aff', '#1a2a7a', '#8a4aff', '#ff5fa2', '#f2f2f2', '#2a2a2a'];
  const BUILDS = ['LEAN', 'ATHLETIC', 'POWER'];
  const FN = ['Marcus', 'Theo', 'Andre', 'Kofi', 'Luca', 'Mateo', 'Jalen', 'Dmitri', 'Ravi', 'Omar', 'Hugo', 'Keanu', 'Diego', 'Elijah', 'Tariq', 'Sven', 'Ivo', 'Malik', 'Nico', 'Rafe', 'Tobias', 'Xavi', 'Yusuf', 'Zane', 'Bruno', 'Caleb', 'Dante', 'Emil', 'Felix', 'Gio'];
  const LN = ['Okafor', 'Varga', 'Delacroix', 'Hollis', 'Mbeki', 'Santos', 'Lindqvist', 'Brennan', 'Kowalski', 'Achebe', 'Moreau', 'Tanaka', 'Reyes', 'Fairbanks', 'Osei', 'Petrov', 'Castillo', 'Whitfield', 'Nakamura', 'Duval', 'Ferraro', 'Grant', 'Haddad', 'Iverson', 'Jovic', 'Kessler', 'Lombardi', 'Monroe', 'Nwosu', 'Quill'];
  const CLUBS = ['Harbor City', 'Silver Lake', 'Ironwood', 'Port Royal', 'Granite Bay', 'Sun Valley', 'North Ridge', 'Bayside', 'Redwood', 'Capital', 'Lakeshore', 'Summit'];
  const TIERS = [[0, 'Journeyman', '#8a95ab'], [140, 'Solid Starter', '#cfd8e0'], [260, 'All-Star', '#29e0ff'], [420, 'Hall of Famer', '#ffb02e'], [620, 'Legend', '#ff5fa2'], [820, 'THE GOAT', '#ffd23f']];
  const R0 = Math.random, TAU = Math.PI * 2;
  const API = /^https?:/.test(location.protocol) ? '' : 'https://box.pulseform.org';
  let mode = 'home', sport = 'hoops', daily = false, rng = R0, build = null, reel = null, career = null, hover = null, msg = null, t = 0, posed = false, botT = 0;
  const rnd = (a, b) => a + rng() * (b - a), pick = a => a[Math.floor(rng() * a.length)], clamp = (v, a, b) => v < a ? a : v > b ? b : v, lp = (a, b, k) => a + (b - a) * k;
  const seeded = s => () => (s = s * 16807 % 2147483647) / 2147483647;
  const dayNo = () => Math.floor(Date.now() / 864e5);
  const SAVE = () => { const L = K.save.lm || (K.save.lm = { hof: [], best: {}, daily: {}, quests: { day: 0, done: [] }, builds: 0 }); if (!L.look) L.look = { skin: 2, hair: 1, hc: 0, c1: 6, c2: 10, build: 1, num: 23 }; return L; };
  const traitOf = k => TRAITS.find(x => x.k === k);
  const hasT = k => !!(career ? career.trait === k : build && build.trait === k);

  /* ---------- the pros on the reel: made-up players with one or two things they are great at ---------- */
  function makePro(sp) {
    const S = SPORTS[sp], peak = [pick([0, 1, 2, 3, 4, 5])]; if (rng() < .55) peak.push(pick([0, 1, 2, 3, 4, 5]));
    // ratings above 90 are squeezed, so a normal pull tops out at 97; a 98 (about 1 in 35) or a 99 (about 1 in 125) is a special pull
    const soft = v => v <= 90 ? v : 90 + (v - 90) * .32, base = rnd(52, 74), r = S.at.map((_, i) => Math.round(clamp(soft(base + rnd(-14, 12) + (peak.includes(i) ? rnd(14, 28) : 0)), 35, 97)));
    const luck = rng(); if (luck < .008) r[pick([0, 1, 2, 3, 4, 5])] = 99; else if (luck < .036) r[pick([0, 1, 2, 3, 4, 5])] = 98;
    return { name: pick(FN) + ' ' + pick(LN), club: pick(CLUBS), year: 1975 + Math.floor(rng() * 50), r };
  }
  function newBuild(sp, dly) {
    sport = sp; daily = dly; rng = dly ? seeded(dayNo() * 31 + Object.keys(SPORTS).indexOf(sp) + 7) : R0;
    const L = SAVE();
    build = { slots: Array(6).fill(null), rerolls: 2, spins: 0, pro: null, name: L.lastName || pick(FN) + ' ' + pick(LN), vs: null, look: { ...L.look }, trait: null, step: 'look' };
    mode = 'create'; reel = null;
  }
  const ROW = 58, rarity = p => { const m = Math.max(...p.r); return m >= 99 ? ['GOAT PULL', '#ffffff'] : m >= 98 ? ['ICON PULL', '#ffd23f'] : m >= 93 ? ['STAR', '#ff5fa2'] : m >= 86 ? ['GOLD', '#ffb02e'] : m >= 78 ? ['SILVER', '#cfd8e0'] : ['BRONZE', '#c8864a']; };
  function spin() {
    if (build.slots.every(Boolean) || reel || build.pro) return;
    const pro = makePro(sport), W = 22 + Math.floor(R0() * 4), RC = ['#c8864a', '#c8864a', '#cfd8e0', '#cfd8e0', '#ffb02e', '#ff5fa2'];
    const names = Array.from({ length: W + 4 }, () => ({ n: pick(FN) + ' ' + pick(LN), c: RC[Math.floor(R0() * RC.length)] }));
    names[W] = { n: pro.name, c: rarity(pro)[1], win: 1 };
    const V = 15, A = .22, Td = 1.35 + R0() * .35, Dd = V * Td / 3, Tc = Math.max(.3, (W - V * A / 2 - Dd) / V), D0 = W - Dd;
    reel = { t: 0, W, V, A, Tc, Td, Dd, D0, end: A + Tc + Td, T: A + Tc + Td + .35, names, pro, row: -1, tick: 0 };
    K.sfx(300, .08, 'square', .05, 200);
  }
  function reelPos(r) {
    const t = r.t; if (t < r.A) return r.V * t * t / (2 * r.A);
    if (t < r.A + r.Tc) return r.V * r.A / 2 + r.V * (t - r.A);
    if (t < r.end) { const u = (t - r.A - r.Tc) / r.Td; return r.D0 + r.Dd * (1 - Math.pow(1 - u, 3)); }
    const k = Math.min(1, (t - r.end) / .3); return r.W + Math.sin(k * Math.PI) * .1 * (1 - k);
  }
  function reroll() { if (!build.pro || build.rerolls <= 0) return; build.rerolls--; build.pro = null; spin(); }
  function place(i) {
    if (!build.pro || build.slots[i]) return;
    build.slots[i] = { v: build.pro.r[i], who: build.pro.name }; build.spins++; build.pro = null;
    K.chime(523 + build.slots[i].v * 3, [0, 7]);
    if (build.vs) cpuPick();
    if (build.slots.every(Boolean)) { if (build.vs) { mode = 'ready'; } else build.step = 'trait'; K.sfx(880, .2, 'triangle', .06); }
  }
  function cpuPick() {
    const V = build.vs, S = SPORTS[sport], p = makePro(sport), open = V.cpu.map((c, i) => c ? -1 : p.r[i] * S.w[i] + rnd(-8, 8)), i = open.indexOf(Math.max(...open));
    if (i >= 0) V.cpu[i] = { v: p.r[i], who: p.name };
  }
  const wavg = (arr, sp = sport) => { const S = SPORTS[sp]; let a = 0, w = 0; arr.forEach((x, i) => { a += (x || 0) * S.w[i]; w += S.w[i]; }); return Math.round(a / w); };
  const cpuOvr = () => wavg(build.vs.cpu.map(c => c ? c.v : 0));
  // the build's body type nudges the drafted ratings: lean is quicker, power is stronger
  function finalRatings() {
    const S = SPORTS[sport], v = build.slots.map(s => s ? s.v : 0), b = build.look.build;
    if (b === 0) { S.lean.forEach(i => v[i] += 3); S.power.forEach(i => v[i] -= 2); }
    if (b === 2) { S.power.forEach(i => v[i] += 3); S.lean.forEach(i => v[i] -= 2); }
    if (b === 1) { v[S.lean[0]] += 1; v[S.power[0]] += 1; }
    return v.map((x, i) => clamp(x, 30, Math.max(97, build.slots[i] ? build.slots[i].v : 0)));
  }
  const ovr = () => wavg(build.slots.every(Boolean) && build.step !== 'draft' ? finalRatings() : build.slots.map(s => s ? s.v : 0));

  /* ---------- mini-games: every big moment in the game is one of these. diff runs 0 (easy) to 1 (very hard) ---------- */
  const ARROWS = ['up', 'right', 'down', 'left'], ARR = { up: '▲', right: '▶', down: '▼', left: '◀' };
  function MG(type, diff, ctx) {
    const M = { type, diff: clamp(diff, 0, 1), t: 0, res: null, rt: 0, ctx, big: ctx.big ? 1.3 : 1 };
    const zone = (a, b) => lp(a, b, M.diff) * M.big;
    if (type === 'bar') Object.assign(M, { pos: 0, zc: .22 + R0() * .56, zw: zone(.26, .075), speed: 2.1 + M.diff * 1.7 });
    if (type === 'power') Object.assign(M, { stage: 0, pos: 0, zc: .3 + R0() * .4, zw: zone(.3, .1), speed: 2 + M.diff * 1.5, z2: .62 + R0() * .26, got: [] });
    if (type === 'aim') Object.assign(M, { cx: 640, cy: 400, R: lp(70, 30, M.diff) * M.big, tx: 640 + (R0() - .5) * 320, ty: 390 + (R0() - .5) * 120, w1: 1.3 + M.diff * 1.4, w2: 1.9 + M.diff * 1.6, ph: R0() * 6, lim: 6 });
    if (type === 'combo') { const n = 3 + Math.round(M.diff * 2); Object.assign(M, { seq: Array.from({ length: n }, () => ARROWS[Math.floor(R0() * 4)]), at: 0, lim: (1.15 - M.diff * .45) * n * M.big + .5 }); }
    if (type === 'mash') Object.assign(M, { m: .45, drain: lp(.12, .34, M.diff) / M.big, lim: 4.5, taps: 0 });
    if (type === 'rings') Object.assign(M, { n: 5, i: 0, ring: null, score: 0, hits: [], D: lp(1.15, .7, M.diff) });
    if (type === 'hold') Object.assign(M, { m: 0, holding: false, zc: .62 + R0() * .2, zw: zone(.2, .08), v: 0 });
    if (type === 'rings') nextRing(M);
    return M;
  }
  function nextRing(M) { if (M.i >= M.n) { M.res = M.score >= 4.2 ? 'perfect' : M.score >= 2.4 ? 'hit' : 'miss'; return; } M.ring = { x: 380 + R0() * 520, y: 300 + R0() * 220, t: 0, done: false }; M.i++; }
  function mgEnd(M, res) {
    if (M.res) return; M.res = res; M.rt = 0;
    if (res === 'miss') K.sfx(180, .45, 'sawtooth', .06, -80);
    else { K.chime(523, res === 'perfect' ? [0, 4, 7, 12] : [0, 4, 7]); K.burst(640, 330, ['#ffd23f', '#fff', SPORTS[sport].c], res === 'perfect' ? 60 : 28, 480); K.shake(res === 'perfect' ? 8 : 4); }
  }
  const barRes = (pos, zc, zw) => { const off = Math.abs(pos - zc); return off <= zw / 6 ? 'perfect' : off <= zw / 2 ? 'hit' : 'miss'; };
  const osc = (M, sp) => (1 - Math.cos(M.t * sp)) / 2;
  function mgUpdate(M, dt) {
    if (!M) return false;
    if (M.res) { M.rt += dt; return M.rt > 1.25; }
    M.t += dt;
    if (M.type === 'bar') M.pos = osc(M, M.speed);
    if (M.type === 'power') { M.pos = (1 - Math.cos((M.t - (M.st || 0)) * M.speed * (M.stage ? 1.25 : 1))) / 2; }
    if (M.type === 'aim') { M.cx = 640 + Math.sin(M.t * M.w1 + M.ph) * 260; M.cy = 395 + Math.sin(M.t * M.w2) * 95; if (M.t > M.lim) mgEnd(M, 'miss'); }
    if (M.type === 'combo' && M.t > M.lim) mgEnd(M, 'miss');
    if (M.type === 'mash') { M.m -= M.drain * dt; if (M.m <= 0) mgEnd(M, 'miss'); else if (M.t > M.lim) mgEnd(M, M.m > .5 ? 'hit' : 'miss'); }
    if (M.type === 'rings' && M.ring) { M.ring.t += dt; if (M.ring.t > M.D * 1.25) { M.hits.push(0); K.sfx(200, .1, 'square', .04); nextRing(M); } }
    if (M.type === 'hold' && M.holding) { M.v += dt * (.55 + M.diff * .5); M.m += M.v * dt * 1.4; if (M.m >= 1) { M.m = 1; mgEnd(M, 'miss'); } }
    return false;
  }
  function mgTap(M, x, y) {
    if (!M || M.res) return;
    if (M.type === 'bar') return mgEnd(M, barRes(M.pos, M.zc, M.zw));
    if (M.type === 'power') {
      const z = M.stage ? M.z2 : M.zc, r = barRes(M.pos, z, M.zw); M.got.push(r); K.sfx(r === 'miss' ? 200 : 700, .08, 'triangle', .06);
      if (r === 'miss') return mgEnd(M, 'miss');
      if (M.stage) return mgEnd(M, M.got.every(q => q === 'perfect') ? 'perfect' : 'hit');
      M.stage = 1; M.st = M.t; return;
    }
    if (M.type === 'aim') { const dd = Math.hypot(M.cx - M.tx, M.cy - M.ty); return mgEnd(M, dd <= M.R / 3 ? 'perfect' : dd <= M.R ? 'hit' : 'miss'); }
    if (M.type === 'combo' && x != null) { for (let i = 0; i < 4; i++) { const b = comboBtn(i); if (Math.hypot(x - b.x, y - b.y) < 52) return mgKey(M, ARROWS[i]); } return; }
    if (M.type === 'mash') { M.m += .052; M.taps++; K.sfx(400 + M.m * 500, .03, 'square', .04); if (M.m >= 1) mgEnd(M, M.t < 2.2 ? 'perfect' : 'hit'); return; }
    if (M.type === 'rings' && M.ring) {
      const R = M.ring, k = R.t / M.D, outer = 90 * (1 - k) + 30 * k, off = Math.abs(outer - 30);
      if (x != null && Math.hypot(x - R.x, y - R.y) > 80) return;
      const s = R.t > M.D * 1.2 ? 0 : off <= 9 ? 1 : off <= 24 ? .6 : 0; M.score += s; M.hits.push(s);
      K.sfx(s >= 1 ? 1046 : s ? 784 : 220, .08, 'triangle', .06); if (s) K.burst(R.x, R.y, ['#ffd23f', '#fff'], s >= 1 ? 18 : 8, 260, { life: .4 });
      nextRing(M);
    }
    if (M.type === 'hold') { M.holding = true; }
  }
  function mgRelease(M) { if (M && M.type === 'hold' && M.holding && !M.res) { M.holding = false; mgEnd(M, barRes(M.m, M.zc, M.zw)); } }
  function mgKey(M, a) {
    if (!M || M.res || M.type !== 'combo') return;
    if (M.seq[M.at] === a) { M.at++; K.sfx(600 + M.at * 90, .05, 'square', .05); if (M.at >= M.seq.length) mgEnd(M, M.t < M.lim * .55 ? 'perfect' : 'hit'); }
    else mgEnd(M, 'miss');
  }
  const comboBtn = i => ({ x: 640 + [0, 110, 0, -110][i], y: 560 + [-55, 0, 55, 0][i] });
  // the computer plays mini-games for the attract demo
  function mgBot(M, skill = .8) {
    if (!M || M.res) return;
    const good = R0() < skill;
    if (M.type === 'bar' && Math.abs(M.pos - M.zc) < M.zw * (good ? .12 : .7)) mgTap(M);
    if (M.type === 'power' && Math.abs(M.pos - (M.stage ? M.z2 : M.zc)) < M.zw * (good ? .12 : .7)) mgTap(M);
    if (M.type === 'aim' && Math.hypot(M.cx - M.tx, M.cy - M.ty) < M.R * (good ? .25 : .9)) mgTap(M);
    if (M.type === 'combo' && M.t > .35 + M.at * .3) mgKey(M, good || R0() < .9 ? M.seq[M.at] : 'up');
    if (M.type === 'mash' && R0() < .5) mgTap(M);
    if (M.type === 'rings' && M.ring) { const k = M.ring.t / M.D; if (k > (good ? .97 : .88)) mgTap(M, M.ring.x, M.ring.y); }
    if (M.type === 'hold') { if (!M.holding && M.t > .3) mgTap(M); else if (M.holding && M.m >= M.zc - (good ? 0 : M.zw * .4)) mgRelease(M); }
  }
  const MGHOW = { bar: 'Stop the bar in the green. Dead centre is perfect.', power: 'Two taps: stop the aim in the green, then the power.', aim: 'Tap when the crosshair is on the target.', combo: 'Hit the arrows in order: arrow keys, WASD or the buttons.', mash: 'Tap as fast as you can. Fill the bar before they push you back.', rings: 'Tap each ring as the outer circle closes onto it.', hold: 'Hold, and let go inside the green. Too far and the deal is off.' };

  /* ---------- the career: every season is played, not picked ---------- */
  const durOf = v => sport === 'hoops' ? v[5] * .6 + v[3] * .4 : v[5];
  const ageCurve = (age, bloom) => bloom ? (age < 25 ? .78 + (age - 21) * .03 : age <= 33 ? 1 : 1 - (age - 33) * .04) : (age < 27 ? .82 + (age - 21) * .03 : age <= 30 ? 1 : 1 - (age - 30) * .045);
  function startCareer() {
    const v = finalRatings(), O = wavg(v), crng = daily ? seeded(dayNo() * 97 + O) : R0;
    career = { v, O, O0: O, peak: O, crng, cr: (a, b) => a + crng() * (b - a), seasons: [], aw: { mvp: 0, star: 0, champ: 0, dpoy: 0, fmvp: 0, skills: 0 }, injuries: 0, legacy: 0, age: 21, fit: 1,
      team: .3 + crng() * .3, club: pick(CLUBS), yrs: 0, extra: 0, phase: 'camp', t: 0, done: false, mg: null, row: null, trait: build.trait, look: build.look, name: build.name, hl: [], fast: false };
    if (career.trait === 'leader') career.team += .12;
    career.maxS = Math.round(clamp(8 + (durOf(v) - 60) / 5 + career.cr(-2, 3), 6, 18)) + (career.trait === 'iron' ? 2 : 0);
    SAVE().lastName = build.name; SAVE().look = { ...build.look }; K.persist();
    mode = 'career'; K.chime(440, [0, 4, 7]);
  }
  const relevantDiff = (v, i, extra = 0) => clamp((96 - v[i]) / 48 + extra, .02, .98);
  function campPick(i) {
    const c = career; if (!c || c.phase !== 'camp' || c.mg) return;
    c.campI = i; c.mg = MG('rings', clamp(.35 + c.seasons.length * .03, 0, .8), { title: 'TRAINING CAMP · ' + SPORTS[sport].at[i].toUpperCase(), sub: 'Tap each ring as the circle closes. Every clean rep makes you better.' });
    K.sfx(600, .06, 'triangle', .06);
  }
  function campDone() {
    const c = career, M = c.mg, i = c.campI, old = c.age >= 31 ? .5 : c.age >= 28 ? .8 : 1;
    const gain = Math.round(M.score / 5 * 4.2 * (c.trait === 'gym' ? 1.6 : 1) * old);
    const cap = c.v[i] >= 98 ? 99 : 97, pre = c.v[i]; c.v[i] = Math.min(cap, c.v[i] + gain);
    if (c.v[i] === 97 && pre + gain > 97 && M.score >= 4.5 && R0() < .1) { c.v[i] = 98; K.chime(784, [0, 4, 7, 12, 16, 19]); K.burst(640, 300, ['#ffd23f', '#fff'], 70, 600); K.shake(6); }
    c.campGain = { i, gain: c.v[i] - pre }; c.mg = null;
    c.O = wavg(c.v); c.peak = Math.max(c.peak, c.O);
    msg = { t: gain ? `+${gain} ${SPORTS[sport].at[i]}  (${c.v[i]})` : 'A rough camp. No gains this year.', k: 0 };
    startMoments();
  }
  function startMoments() { const c = career, S = SPORTS[sport], pool = [...S.moments]; c.moments = []; while (c.moments.length < 2) c.moments.push(pool.splice(Math.floor(R0() * pool.length), 1)[0]); c.mi = 0; c.mres = []; c.phase = 'moment'; nextMoment(); }
  function nextMoment() {
    const c = career, [name, type, i] = c.moments[c.mi], age = c.age;
    c.mg = MG(type, relevantDiff(c.v, i, age > 32 ? (age - 32) * .03 : 0), { title: `${['FIRST', 'SECOND'][c.mi]} BIG MOMENT`, sub: name, big: c.trait === 'clutch', at: i });
  }
  function momentDone() {
    const c = career, M = c.mg, [name] = c.moments[c.mi]; c.mres.push(M.res); if (M.res === 'perfect') c.hl.push(name); c.mg = null; c.mi++;
    if (c.mi < c.moments.length) return nextMoment();
    playSeason();
  }
  function statsFor(r, v, cr) {
    const s = {};
    if (sport === 'hoops') { s.a = (r - 48) * .62 + v[0] * .05; s.b = 3 + v[4] * .07 * (r / 85); s.c = 1.5 + v[2] * .075 * (r / 85); }
    else if (sport === 'gridiron') { s.a = Math.round((r - 45) * 95 + v[0] * 9); s.b = Math.round((r - 50) * .82 + v[2] * .08); s.c = Math.round(clamp(22 - v[4] * .17 - (r - 70) * .12 + cr(-3, 3), 3, 25)); }
    else if (sport === 'hockey') { s.a = Math.round((r - 50) * .9 + v[0] * .12); s.b = Math.round((r - 52) * 1 + v[2] * .14); s.c = Math.max(0, s.a) + Math.max(0, s.b); }
    else if (sport === 'diamond') { s.a = clamp(.2 + (v[0] - 50) * .0022 + (r - 70) * .0018 + cr(-.012, .012), .18, .39); s.b = Math.round((r - 55) * .6 + v[1] * .2); s.c = Math.round(Math.max(0, s.b) * 2.4 + (r - 60) * 1.2); }
    else { s.a = Math.round((r - 52) * .72 + v[0] * .1); s.b = Math.round((r - 55) * .4 + v[4] * .08); s.c = Math.round(26 + Math.min(1, r / 90) * 12); }
    for (const k of ['a', 'b', 'c']) s[k] = Math.max(0, s[k]);
    return s;
  }
  function playSeason() {
    const c = career, S = SPORTS[sport], cr = c.cr, v = c.v, show = c.trait === 'show' ? 1.4 : 1;
    const mod = c.mres.reduce((a, r) => a + (r === 'perfect' ? 4 : r === 'hit' ? 2 : -2.5), 0);
    let L = c.mres.reduce((a, r) => a + (r === 'perfect' ? 12 : r === 'hit' ? 5 : 0), 0) * show;
    const age = c.age, dur = durOf(v), inj = (.1 + (99 - dur) * .003) * (c.trait === 'iron' ? .5 : 1);
    let hurt = false; if (c.crng() < inj) { c.injuries++; c.fit = cr(.35, .75); hurt = true; } else c.fit = Math.min(1, c.fit + .3);
    const r = clamp((c.O + cr(-5, 5) + mod) * ageCurve(age, c.trait === 'bloom') * (.7 + c.fit * .3), 30, 104), A = [];
    if (r > 86 && c.crng() < (r - 84) * .06) { c.aw.mvp++; A.push(S.mvp); L += 60 * show; }
    if (r > 78 && c.crng() < (r - 74) * .07) { c.aw.star++; A.push(S.star); L += 14 * show; }
    if (c.crng() < (sport === 'hoops' ? v[3] - 80 : sport === 'diamond' ? v[4] - 80 : r - 86) * .025) { c.aw.dpoy++; A.push(S.dpoy); L += 25 * show; }
    if (hurt) A.push('Injury: played hurt');
    L += Math.max(0, r - 60) * 1.4;
    const row = { L, age, r: Math.round(r), s: statsFor(r, v, cr), A, club: c.club, note: c.mres.map(x => x === 'perfect' ? '★' : x === 'hit' ? '✓' : '✗').join(''), hurt }, team = clamp(c.team + cr(-.2, .2) + (r - 80) * .006, 0, 1);
    c.yrs++; c.age++; c.row = row;
    if (c.crng() < team * .55) {   // made the finals: the title comes down to one clutch moment
      c.phase = 'finals'; c.mg = MG('bar', clamp(.62 - (r - 75) * .016, .05, .95), { title: 'FINALS · GAME 7', sub: `Stop the bar in the zone to win the ${S.champ}. Dead centre is Finals MVP.`, big: c.trait === 'clutch', words: { perfect: 'FINALS MVP!', hit: 'CHAMPIONS!', miss: 'SO CLOSE. RUNNER-UP.' } });
      K.sfx(220, .3, 'sawtooth', .05, 200); return;
    }
    if (team > .55 && c.crng() < .5) A.push('Lost in the playoffs');
    pushSeason(row);
  }
  function finalsDone() {
    const c = career, S = SPORTS[sport], res = c.mg.res, show = c.trait === 'show' ? 1.4 : 1; c.mg = null;
    if (res === 'miss') { c.row.A.push('Runner-up'); c.row.L += 8; }
    else { c.aw.champ++; c.row.A.push(S.champ[0].toUpperCase() + S.champ.slice(1)); c.row.L += 45 * show; if (res === 'perfect') { c.aw.fmvp++; c.row.A.push('Finals MVP'); c.row.L += 25 * show; } }
    pushSeason(c.row);
  }
  function pushSeason(row) {
    const c = career; c.seasons.push(row); c.legacy += row.L; c.phase = 'show'; c.t = 0; c.row = null;
    if (row.A.some(a => !/Injury|Lost|Runner/.test(a))) K.chime(659, [0, 7]); else K.sfx(420, .05, 'square', .03);
  }
  // between seasons, now and then, something happens that you play through
  function afterShow() {
    const c = career, last = c.seasons[c.seasons.length - 1];
    c.ev = null;
    if (last.hurt) c.ev = { k: 'rehab', mg: MG('mash', .45 + (c.age - 21) * .02, { title: 'REHAB', sub: 'You got hurt. Grind through rehab to come back at full strength.' }) };
    else if (last.A.includes(SPORTS[sport].star) && R0() < .55) c.ev = { k: 'skills', mg: MG('aim', relevantDiff(c.v, 0, .1), { title: 'ALL-STAR WEEKEND', sub: 'The skills challenge: one shot for the trophy.' }) };
    else if (c.yrs >= 3 && R0() < .35) c.ev = { k: 'contract', mg: MG('hold', .4, { title: 'CONTRACT TALKS', sub: 'Hold out for a bigger deal, and let go before they walk away.', words: { perfect: 'MAX DEAL!', hit: 'DEAL DONE', miss: 'TALKS COLLAPSED' } }) };
    else if (R0() < .3) c.ev = { k: 'rival', mg: MG('combo', relevantDiff(c.v, 1), { title: 'RIVALRY GAME', sub: 'Your rival talked trash all week. Shut them up.' }) };
    if (c.ev) { c.phase = 'event'; c.mg = c.ev.mg; return; }
    nextSeason();
  }
  function eventDone() {
    const c = career, E = c.ev, res = c.mg.res, row = c.seasons[c.seasons.length - 1]; c.mg = null; c.ev = null;
    if (E.k === 'rehab') { c.fit = res === 'miss' ? .6 : res === 'hit' ? .9 : 1; msg = { t: res === 'miss' ? 'A slow recovery. You start the season hurting.' : 'Back to full strength!', k: 0 }; }
    if (E.k === 'skills' && res !== 'miss') { c.aw.skills++; row.A.push('Skills champ'); row.L += 18; c.legacy += 18; msg = { t: 'Skills challenge champion! +18 legacy', k: 0 }; }
    if (E.k === 'contract') { const co = res === 'perfect' ? 8 : res === 'hit' ? 4 : 0; if (co) K.coin(co); if (res === 'miss') { c.team = Math.max(.15, c.team - .15); c.club = pick(CLUBS.filter(x => x !== c.club)); c.yrs = 0; msg = { t: 'No deal. You were traded to ' + c.club + '.', k: 0 }; } else msg = { t: `Signed! +${co} coins`, k: 0 }; }
    if (E.k === 'rival') { const l = res === 'perfect' ? 20 : res === 'hit' ? 10 : -5; row.L += l; c.legacy += l; msg = { t: l > 0 ? `You won the rivalry. +${l} legacy` : 'Your rival had the last laugh.', k: 0 }; }
    nextSeason();
  }
  function nextSeason() {
    const c = career;
    if (c.seasons.length >= c.maxS) { c.phase = 'retire'; c.t = 0; return; }
    c.phase = 'camp'; c.t = 0; c.campGain = null;
  }
  function retireChoice(more) {
    const c = career; if (c.phase !== 'retire') return;
    if (more && c.extra < 3) { c.extra++; c.maxS++; c.phase = 'camp'; c.t = 0; K.sfx(500, .08, 'triangle', .06); }
    else { c.phase = 'retired'; c.done = true; K.chime(440, [0, 4, 7]); }
  }
  // impatient? play the rest out automatically (average results, so less legacy than playing it yourself)
  function fastSim() { const c = career; if (!c || c.done) return; c.fast = true; }
  function fastStep() {
    const c = career; if (!c || !c.fast || c.done) return;
    if (c.mg && !c.mg.res) { c.mg.score = 2.4; mgEnd(c.mg, R0() < .55 ? 'hit' : 'miss'); c.mg.rt = 1.15; }
    if (c.phase === 'camp' && !c.mg) campPick(c.v.indexOf(Math.min(...c.v)));
    if (c.phase === 'retire') retireChoice(false);
  }

  /* ---------- the Legends Ladder: ten all-time greats ---------- */
  const NICK = ['The Wall', 'Ice Cold', 'The Professor', 'Air Mail', 'Big Ticket', 'The Machine', 'Sky Walker', 'Mr. Clutch', 'The Last Dynasty', 'THE G.O.A.T.'];
  const LOVR = [72, 75, 78, 81, 84, 87, 90, 93, 96, 99];
  function ladderOpps(sp) { const r = seeded(Object.keys(SPORTS).indexOf(sp) * 991 + 7); return NICK.map((n, i) => ({ nick: n, name: FN[Math.floor(r() * FN.length)] + ' ' + LN[Math.floor(r() * LN.length)], O: LOVR[i], club: CLUBS[Math.floor(r() * CLUBS.length)], look: { skin: Math.floor(r() * 6), hair: Math.floor(r() * 8), hc: Math.floor(r() * 6), c1: 11, c2: 2, build: Math.floor(r() * 3), num: 1 + Math.floor(r() * 98) } })); }
  let ladder = null, hofSel = -1, hofPick = false, lastRec = null;
  function startLadder(rec) { if (!rec) return; sport = rec.sport; ladder = { rec, opps: ladderOpps(rec.sport), rung: 0, over: false, duel: null, best: rec.ladder || 0 }; mode = 'ladder'; K.sfx(600, .06, 'triangle', .06); }
  const DUEL_TYPES = ['bar', 'aim', 'combo', 'power', 'mash'];
  function newDuelRound() { const D = ladder.duel, o = ladder.opps[ladder.rung], O = ladder.rec.O, type = DUEL_TYPES[(D.w + D.l + ladder.rung) % DUEL_TYPES.length]; D.mg = MG(type, clamp(.45 + (o.O - O) * .035 + ladder.rung * .02, .03, .97), { title: 'CLUTCH MOMENT', sub: `Win 2 of 3 against "${o.nick}".`, words: { perfect: 'PERFECT!', hit: 'YOURS!', miss: 'THEIRS!' } }); }
  function startDuel() { if (!ladder || ladder.over) return; ladder.duel = { w: 0, l: 0, mg: null, end: 0 }; newDuelRound(); mode = 'duel'; }
  function duelDone() {
    const L = ladder, D = L.duel, won = D.w >= 2, rec = L.rec;
    if (won) {
      L.rung++;
      if (L.rung > (rec.ladder || 0)) { rec.ladder = L.rung; K.coin(L.rung >= 10 ? 25 : 2 + L.rung); }
      if (L.rung >= 10) { rec.goat = true; L.over = 'goat'; msg = { t: `${rec.name} beat every all-time great!  +25 coins`, k: 0 }; K.chime(523, [0, 4, 7, 12, 16]); K.burst(640, 260, ['#ffd23f', '#fff', '#ff5fa2'], 80, 560); K.shake(10); }
    } else L.over = 'lost';
    L.best = Math.max(L.best, rec.ladder || 0); K.persist(); L.duel = null; mode = 'ladder';
  }

  /* ---------- the ARENA: other real players' legends, stat against stat ---------- */
  let arena = null;   // { rec, opp, status, rounds, top, mine, away }
  async function auth() { try { const tk = window.parent && window.parent !== window && window.parent.pbxToken ? await window.parent.pbxToken() : null; return tk ? { authorization: 'Bearer ' + tk } : {}; } catch (e) { return {}; } }
  async function api(path, body) {
    const o = { headers: { 'content-type': 'application/json', ...(await auth()) } }; if (body) { o.method = 'POST'; o.body = JSON.stringify(body); }
    const r = await fetch(API + '/api/arena/' + path, o); const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || 'offline'), { status: r.status, j }); return j;
  }
  const cardOf = rec => ({ id: rec.arenaId, name: rec.name, sport: rec.sport, look: { ...(rec.look || {}), acc: rec.acc || 0 }, r: rec.r || Array(6).fill(rec.O), O: rec.O, legacy: rec.legacy, tier: rec.tier, aw: rec.aw, trait: rec.trait || '', seasons: rec.seasons });
  async function publish(rec) {
    if (!rec.arenaId) rec.arenaId = (Date.now().toString(36) + Math.floor(R0() * 1e9).toString(36)).slice(0, 20);
    try { const j = await api('publish', { card: cardOf(rec) }); rec.rating = j.rating; rec.w = j.w; rec.l = j.l; rec.pub = true; K.persist(); return true; }
    catch (e) { if (e.status === 403) { rec.arenaId = null; return publish(rec); } throw e; }
  }
  async function openArena(rec) {
    mode = 'arena'; arena = { rec, opp: null, status: 'publishing', top: null, away: null, err: null }; hofPick = false;
    try {
      await publish(rec); arena.status = 'ready';
      api('top?sport=' + rec.sport).then(j => { if (arena) arena.top = j.top; }).catch(() => {});
      api('mine').then(j => { if (!arena) return; for (const m of j.mine || []) { const own = SAVE().hof.find(h => h.arenaId === m.id); if (own) { const dw = m.w - (own.w || 0), dl = m.l - (own.l || 0); if ((dw > 0 || dl > 0) && own === rec) arena.away = { w: dw, l: dl }; own.w = m.w; own.l = m.l; own.rating = m.rating; } } K.persist(); }).catch(() => {});
    } catch (e) { arena.status = 'offline'; arena.err = e.status === 429 ? 'Slow down a little, then try again.' : 'Can\'t reach the Arena right now. Check your connection.'; }
  }
  async function findOpp() {
    if (!arena || arena.status === 'finding') return; arena.status = 'finding'; arena.opp = null;
    try { const j = await api('match?sport=' + arena.rec.sport + '&id=' + arena.rec.arenaId); if (!arena) return; arena.opp = j.opp; arena.status = j.opp ? 'tape' : 'empty'; arena.tt = 0; if (j.opp) K.sfx(520, .1, 'triangle', .06); }
    catch (e) { if (arena) { arena.status = 'offline'; arena.err = 'Can\'t reach the Arena right now.'; } }
  }
  // the battle: best of three rounds, each on one attribute; your rating against theirs sets how hard your moment is,
  // and their rating sets how well they do theirs
  function startBattle() {
    const A = arena, S = SPORTS[A.rec.sport], idx = S.w.map((w, i) => [w + R0() * .8, i]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(x => x[1]);
    A.battle = { idx, round: 0, me: 0, them: 0, log: [], mg: null, end: 0, theirRes: null }; mode = 'battle'; battleRound();
  }
  function battleRound() {
    const A = arena, B = A.battle, i = B.idx[B.round], mine = (A.rec.r || [])[i] || A.rec.O, theirs = (A.opp.r || [])[i] || A.opp.O, type = ['bar', 'aim', 'combo'][B.round];
    B.mine = mine; B.theirs = theirs; B.theirRes = null;
    B.mg = MG(type, clamp(.5 + (theirs - mine) * .03, .04, .96), { title: `ROUND ${B.round + 1} · ${SPORTS[A.rec.sport].at[i].toUpperCase()}`, sub: `Your ${mine} against their ${theirs}${A.opp.sport !== A.rec.sport ? ` (${SPORTS[A.opp.sport].at[i]})` : ''}.`, words: { perfect: 'PERFECT!', hit: 'GOOD!', miss: 'MISSED!' } });
  }
  const resPts = r => r === 'perfect' ? 2 : r === 'hit' ? 1 : 0;
  function battleRoundDone() {
    const A = arena, B = A.battle, my = B.mg.res, th = B.theirs, p = clamp((th - 40) / 70, .05, .92), q = R0();
    const their = q < p * .45 ? 'perfect' : q < p ? 'hit' : 'miss'; B.theirRes = their;
    const a = resPts(my), b = resPts(their), won = a > b || (a === b && B.mine >= B.theirs);
    if (won) B.me++; else B.them++; B.log.push({ my, their, won }); B.mg = null; B.show = 0;
    K.sfx(won ? 880 : 200, .2, won ? 'triangle' : 'sawtooth', .06);
  }
  async function battleOver() {
    const A = arena, B = A.battle, won = B.me >= 2; B.done = true; A.status = 'result'; A.won = won; A.delta = null; mode = 'arena'; if (won) questHit('arena');
    if (won) { K.coin(4); K.chime(523, [0, 4, 7, 12]); K.burst(640, 260, ['#ffd23f', '#fff', '#3ddc84'], 60, 500); }
    const L = SAVE(); L.arenaW = (L.arenaW || 0) + (won ? 1 : 0); L.arenaL = (L.arenaL || 0) + (won ? 0 : 1); streak(); K.persist();
    try { const j = await api('result', { me: A.rec.arenaId, opp: A.opp.id, won }); A.delta = j.delta; A.rec.rating = j.rating; A.rec.w = (A.rec.w || 0) + (won ? 1 : 0); A.rec.l = (A.rec.l || 0) + (won ? 0 : 1); K.persist(); } catch (e) { A.delta = 'x'; }
  }

  const fmtStat = (s, k) => sport === 'hoops' ? s[k].toFixed(1) : sport === 'diamond' && k === 'a' ? s[k].toFixed(3).replace(/^0/, '') : String(s[k]);
  function streak() { const L = SAVE(), st = L.streak || (L.streak = { last: 0, n: 0 }), dn = dayNo(); if (st.last === dn) return; st.n = st.last === dn - 1 ? st.n + 1 : 1; st.last = dn; }
  function finishCareer() {
    streak();
    const L = SAVE(), c = career; c.legacy = Math.round(c.legacy + c.O0 * 2); c.final = true; c.tier = TIERS.filter(x => c.legacy >= x[0]).pop();
    const rec = { id: Date.now().toString(36) + Math.floor(R0() * 1e4), name: c.name, sport, O: c.peak, legacy: c.legacy, tier: c.tier[1], aw: c.aw, daily, day: dayNo(), seasons: c.seasons.length, ladder: 0,
      look: { ...c.look }, r: c.v.slice(), trait: c.trait, acc: K.save.skin || 0 }; lastRec = rec;
    L.builds = (L.builds || 0) + 1; L.hof.push(rec); L.hof.sort((a, b) => b.legacy - a.legacy); L.hof = L.hof.slice(0, 20);
    L.best[sport] = Math.max(L.best[sport] || 0, c.legacy); if (daily) L.daily[sport + dayNo()] = Math.max(L.daily[sport + dayNo()] || 0, c.legacy);
    questCheck(rec); K.add(c.legacy); K.coin(Math.round(c.legacy / 80)); K.persist();
    mode = 'verdict'; career.vt = 0;
    if (c.legacy >= 420) { K.chime(523, [0, 4, 7, 12, 16]); K.burst(640, 260, ['#ffd23f', '#ffb02e', '#fff'], 50, 520); K.shake(10); } else K.chime(440, [0, 4, 7]);
  }
  const QUESTS = [['ovr85', 'Build an 85+ overall'], ['champ', 'Win a title'], ['hof', 'Reach the Hall of Fame'], ['daily', 'Play the daily challenge'], ['three', 'Try three different sports'], ['arena', 'Win an Arena duel'], ['perfect', 'Hit 5 perfect moments in one career']];
  function quests() { const L = SAVE(); if (L.quests.day !== dayNo()) { const r = seeded(dayNo()); L.quests = { day: dayNo(), list: [...QUESTS].sort(() => r() - .5).slice(0, 3).map(q => q[0]), done: [], sports: [] }; } return L.quests; }
  function questHit(k) { const Q = quests(); if (Q.list.includes(k) && !Q.done.includes(k)) { Q.done.push(k); K.coin(10); msg = { t: 'Quest done: ' + QUESTS.find(q => q[0] === k)[1] + '  +10 coins', k: 0 }; K.persist(); } }
  function questCheck(rec) {
    const Q = quests(); Q.sports = [...new Set([...(Q.sports || []), rec.sport])];
    if (rec.O >= 85) questHit('ovr85'); if (rec.aw.champ) questHit('champ'); if (rec.legacy >= 420) questHit('hof'); if (rec.daily) questHit('daily'); if (Q.sports.length >= 3) questHit('three'); if (career && career.hl.length >= 5) questHit('perfect');
  }

  /* ---------- drawing ---------- */
  const hitR = (b, x, y) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  function rr(g, x, y, w, h, r, fill, stroke, lw = 3) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
  function tx(g, s, x, y, font, c, al = 'center') { g.font = font; g.fillStyle = c; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); }
  function bg(g) {
    const v = K.view, gr = g.createLinearGradient(0, 0, 0, 720); gr.addColorStop(0, '#16203a'); gr.addColorStop(1, '#0a0e1a'); g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.fillStyle = 'rgba(255,255,255,.025)'; for (let x = -40; x < 1320; x += 48) { g.save(); g.translate(x + (t * 6) % 48, 0); g.rotate(.25); g.fillRect(0, -100, 10, 1000); g.restore(); }
  }
  function accessory(g, k, sp) {
    const hy = sp === 'gridiron' ? -30 : -23;
    if (k === 'band') { g.fillStyle = '#e8343a'; g.fillRect(-15, hy - 8, 30, 5); g.fillRect(12, hy - 8, 8, 12); }
    else if (k === 'shades') { g.fillStyle = '#111'; g.beginPath(); g.roundRect(-12, hy - 3, 11, 6, 2); g.roundRect(1, hy - 3, 11, 6, 2); g.fill(); g.fillRect(-2, hy - 2, 4, 2); }
    else if (k === 'chain') { g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.arc(0, hy + 6, 13, .3, Math.PI - .3); g.stroke(); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, hy + 20, 4, 0, 7); g.fill(); }
    else if (k === 'arm') { g.fillStyle = '#ffd23f'; g.fillRect(-26, -2, 9, 8); g.fillStyle = '#1a2440'; g.font = 'bold 7px sans-serif'; g.fillText('C', -24, 5); }
    else if (k === 'crown') { g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(-12, hy - 12); g.lineTo(-12, hy - 26); g.lineTo(-5, hy - 18); g.lineTo(0, hy - 30); g.lineTo(5, hy - 18); g.lineTo(12, hy - 26); g.lineTo(12, hy - 12); g.fill(); g.fillStyle = '#e8343a'; g.beginPath(); g.arc(0, hy - 16, 2.5, 0, 7); g.fill(); }
  }
  GAME.drawSkin = (g, s, r) => { g.save(); g.scale(r / 55, r / 55); g.translate(0, 18); if (s.k === 'aura') { const gl = g.createRadialGradient(0, -10, 6, 0, -10, 60); gl.addColorStop(0, 'rgba(255,210,63,.7)'); gl.addColorStop(1, 'rgba(255,210,63,0)'); g.fillStyle = gl; g.fillRect(-60, -70, 120, 120); } g.fillStyle = '#3a6aff'; g.beginPath(); g.roundRect(-20, -8, 40, 40, 8); g.fill(); g.fillStyle = '#c88a5a'; g.beginPath(); g.arc(0, -23, 14, 0, 7); g.fill(); g.fillStyle = '#1a1210'; g.beginPath(); g.arc(0, -28, 14, Math.PI, 0); g.fill(); accessory(g, s.k, 'hoops'); g.restore(); };
  // a look: skin, hair, team colours, number and build. Old saves only had a colour: they get a look made from it
  const lookOf = (lk, fallbackC) => { if (lk && typeof lk === 'object') return lk; return { skin: 2, hair: 1, hc: 0, c1: Math.max(0, TEAM.indexOf(fallbackC)), c2: 11, build: 1, num: 0, col: fallbackC }; };
  function hair(g, L, hy, r, back) {   // back: what sits behind the head (an afro, long hair, braids, a bun); then the front
    const hc = HAIRC[L.hc || 0] || HAIRC[0], st = L.hair || 0; g.fillStyle = hc;
    if (back) {
      if (st === 2) { g.beginPath(); g.arc(0, hy - 5, r + 8, 0, TAU); g.fill(); }
      else if (st === 3) for (let k = -3; k <= 3; k++) g.fillRect(k * 4 - 1.5, hy - 4, 3, 18 + Math.abs(k) * 2);
      else if (st === 4) { g.beginPath(); g.roundRect(-r - 3, hy - 8, r * 2 + 6, r + 22, 8); g.fill(); }
      else if (st === 7) { g.beginPath(); g.arc(-2, hy - r - 5, 7, 0, TAU); g.fill(); }
      return;
    }
    if (st === 5) return;
    if (st === 0) { g.beginPath(); g.arc(0, hy - 2, r + .5, Math.PI * 1.05, Math.PI * 1.95); g.fill(); }
    else if (st === 6) { g.fillRect(-3, hy - r - 9, 6, 14); g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.arc(0, hy - 2, r + .5, Math.PI * 1.1, Math.PI * 1.9); g.fill(); }
    else { g.beginPath(); g.arc(0, hy - 3, r + (st === 2 ? 3 : 1), Math.PI, 0); g.fill(); if (st === 1) { g.fillRect(-r - 1, hy - 3, 3, 6); g.fillRect(r - 2, hy - 3, 3, 6); } }
  }
  function athlete(g, sp, x, y, s, lk, opt = {}) {
    const L = lookOf(lk, typeof lk === 'string' ? lk : SPORTS[sp].c), c = L.col || TEAM[L.c1 ?? 6], c2 = TEAM[L.c2 ?? 11] || '#1a2440', skin = SKIN[L.skin ?? 2] || SKIN[2], acc = opt.acc || (opt.noAcc ? 'none' : (K.skin && K.skin.k) || 'none');
    g.save(); g.translate(x, y); g.scale(s * [.92, 1, 1.1][L.build ?? 1], s);
    if (acc === 'aura') { const gl = g.createRadialGradient(0, 20, 10, 0, 20, 110); gl.addColorStop(0, 'rgba(255,210,63,.55)'); gl.addColorStop(1, 'rgba(255,210,63,0)'); g.fillStyle = gl; g.fillRect(-110, -90, 220, 220); }
    const limb = (x1, y1, x2, y2, w, col) => { g.strokeStyle = col; g.lineWidth = w * [.85, 1, 1.18][L.build ?? 1]; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    const num = (ny, sz) => { if (L.num == null) return; g.fillStyle = c2 === c ? '#fff' : c2; g.font = d(sz); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(L.num), 0, ny); };
    const head = (hy, r) => { hair(g, L, hy, r, true); g.fillStyle = skin; g.beginPath(); g.arc(0, hy, r, 0, 7); g.fill(); hair(g, L, hy, r, false); g.fillStyle = '#1a1210'; g.fillRect(3, hy - 1, 3, 3); g.fillRect(-5, hy - 1, 3, 3); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, hy + 4, 4, .2, Math.PI - .2); g.stroke(); };
    if (sp === 'hoops') {
      limb(-8, 40, -26, 86, 14, skin); limb(10, 40, 28, 80, 14, skin); limb(-26, 86, -30, 112, 12, skin); limb(28, 80, 40, 104, 12, skin);
      g.fillStyle = c; g.beginPath(); g.roundRect(-20, -10, 40, 54, 8); g.fill(); g.fillStyle = c2; g.fillRect(-20, 30, 40, 16); num(12, 22);
      limb(-16, -4, -34, -46, 12, skin); limb(16, -4, 30, -50, 12, skin);
      g.fillStyle = '#e8701a'; g.beginPath(); g.arc(34, -64, 15, 0, 7); g.fill(); g.strokeStyle = '#7a3a0a'; g.lineWidth = 2; g.beginPath(); g.moveTo(19, -64); g.lineTo(49, -64); g.moveTo(34, -79); g.lineTo(34, -49); g.stroke();
      head(-24, 14);
    } else if (sp === 'gridiron') {
      limb(-8, 44, -22, 92, 16, '#e8e8e8'); limb(10, 44, 26, 88, 16, '#e8e8e8'); limb(-22, 92, -26, 116, 12, '#1a1a1a'); limb(26, 88, 38, 110, 12, '#1a1a1a');
      g.fillStyle = c; g.beginPath(); g.roundRect(-26, -12, 52, 58, 12); g.fill(); num(22, 30);
      limb(18, -2, 44, -36, 13, c); limb(44, -36, 40, -62, 11, skin); limb(-18, 2, -34, 26, 13, c);
      g.fillStyle = '#8a4a1e'; g.beginPath(); g.ellipse(42, -70, 14, 9, -.6, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(36, -72, 12, 2);
      g.fillStyle = skin; g.beginPath(); g.arc(0, -29, 13, 0, 7); g.fill(); g.fillStyle = c2; g.beginPath(); g.arc(0, -30, 19, Math.PI * .95, Math.PI * 2.05); g.fill(); g.fillStyle = c; g.fillRect(-19, -34, 38, 5); g.fillStyle = '#ccc'; g.fillRect(6, -32, 16, 4); g.fillRect(6, -24, 16, 4);
    } else if (sp === 'hockey') {
      limb(-8, 40, -24, 88, 15, c2); limb(10, 40, 30, 84, 15, c2); limb(-24, 88, -40, 108, 8, '#ccc'); limb(30, 84, 46, 104, 8, '#ccc');
      g.fillStyle = c; g.beginPath(); g.roundRect(-24, -12, 48, 58, 10); g.fill(); g.fillStyle = c2; g.fillRect(-24, 26, 48, 6); num(10, 22);
      limb(16, 0, 40, 30, 12, c); limb(-16, 0, 10, 34, 12, c); limb(30, 20, 74, 104, 5, '#8a6a3a'); limb(74, 104, 98, 104, 7, '#1a1a1a');
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(112, 108, 8, 3, 0, 0, 7); g.fill();
      g.fillStyle = skin; g.beginPath(); g.arc(0, -24, 13, 0, 7); g.fill(); g.fillStyle = c2; g.beginPath(); g.arc(0, -28, 17, Math.PI, 0); g.fill(); g.fillStyle = '#ddd'; g.fillRect(-12, -26, 24, 3);
    } else if (sp === 'diamond') {
      limb(-8, 42, -28, 88, 14, '#eee'); limb(10, 42, 24, 90, 14, '#eee'); limb(-28, 88, -30, 112, 11, '#1a1a1a'); limb(24, 90, 34, 112, 11, '#1a1a1a');
      g.fillStyle = '#f2f2f2'; g.beginPath(); g.roundRect(-22, -10, 44, 54, 8); g.fill(); g.fillStyle = c; g.fillRect(-22, -10, 6, 54); g.fillRect(16, -10, 6, 54); g.fillStyle = c; g.font = d(22); g.textAlign = 'center'; g.textBaseline = 'middle'; if (L.num != null) g.fillText(String(L.num), 0, 14);
      limb(-14, 0, -30, -26, 12, '#f2f2f2'); limb(14, 0, -18, -30, 12, '#f2f2f2'); limb(-26, -30, 30, -86, 9, '#b07a42'); limb(18, -76, 34, -92, 12, '#b07a42');
      g.fillStyle = skin; g.beginPath(); g.arc(0, -22, 13, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(0, -27, 14, Math.PI, 0); g.fill(); g.fillRect(0, -30, 20, 5);
    } else {
      limb(-6, 40, -30, 70, 14, skin); limb(-30, 70, -22, 104, 12, skin); limb(8, 40, 40, 58, 14, skin); limb(40, 58, 64, 46, 12, skin);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(78, 50, 13, 0, 7); g.fill(); g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(78, 50, 5, 0, 7); g.fill();
      g.fillStyle = c; g.beginPath(); g.roundRect(-20, -8, 40, 50, 8); g.fill(); g.fillStyle = c2; g.fillRect(-20, 30, 40, 14); num(12, 22);
      limb(-16, 0, -44, -22, 11, skin); limb(16, 0, 40, 16, 11, skin);
      head(-22, 14);
    }
    accessory(g, acc, sp);
    g.restore();
  }
  // the trading card: the thing you made, to be proud of
  // card finishes by overall: bronze, silver, gold, star, and a moving rainbow ICON finish for 95+
  const QUAL = { bronze: ['#6a3a1a', '#c8864a', '#f4c898', 'BRONZE'], silver: ['#5a6470', '#cfd8e0', '#ffffff', 'SILVER'], gold: ['#8a6208', '#ffd23f', '#fff4b0', 'GOLD'], star: ['#8a2058', '#ff5fa2', '#ffd0e8', 'STAR'], icon: ['#3a1a6a', '#ffffff', '#ffffff', 'ICON'] };
  const qualOf = O => O >= 95 ? 'icon' : O >= 89 ? 'star' : O >= 82 ? 'gold' : O >= 72 ? 'silver' : 'bronze';
  function frameGrad(g, q, w, h, ph = 0) {
    const Q = QUAL[q], gr = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    if (q === 'icon') { for (let k = 0; k <= 6; k++) gr.addColorStop(k / 6, `hsl(${(t * 90 + ph * 60 + k * 60) % 360},95%,${k % 2 ? 72 : 58}%)`); }
    else { gr.addColorStop(0, Q[2]); gr.addColorStop(.3, Q[1]); gr.addColorStop(.55, Q[0]); gr.addColorStop(.8, Q[1]); gr.addColorStop(1, Q[2]); }
    return gr;
  }
  function card(g, rec, x, y, sc = 1, opt = {}) {
    const S = SPORTS[rec.sport], q = opt.q || qualOf(rec.O), Q = QUAL[q], w = 280, h = 400, L = lookOf(rec.look, S.c), tc = TEAM[L.c1 ?? 6], tc2 = TEAM[L.c2 ?? 10] || '#ffffff';
    g.save(); g.translate(x, y); g.scale(sc, sc);
    if (opt.glow) { g.shadowColor = opt.glow; g.shadowBlur = 40; }
    g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.roundRect(-w / 2 + 8, -h / 2 + 12, w, h, 22); g.fill(); g.shadowBlur = 0;
    // metallic frame, then the dark face
    g.fillStyle = frameGrad(g, q, w, h, opt.ph || 0); g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 22); g.fill();
    const face = g.createLinearGradient(0, -h / 2, 0, h / 2); face.addColorStop(0, '#16203a'); face.addColorStop(.6, '#0c1226'); face.addColorStop(1, '#070b18');
    g.fillStyle = face; g.beginPath(); g.roundRect(-w / 2 + 9, -h / 2 + 9, w - 18, h - 18, 15); g.fill();
    g.save(); g.beginPath(); g.roundRect(-w / 2 + 9, -h / 2 + 9, w - 18, h - 18, 15); g.clip();
    // team stripes and light rays behind the player
    g.globalAlpha = .22; g.fillStyle = tc; for (let k = -6; k < 8; k++) { g.beginPath(); g.moveTo(-w / 2 + k * 46, -h / 2); g.lineTo(-w / 2 + k * 46 + 22, -h / 2); g.lineTo(-w / 2 + k * 46 + 22 - 160, h / 2); g.lineTo(-w / 2 + k * 46 - 160, h / 2); g.fill(); } g.globalAlpha = 1;
    if (q === 'star' || q === 'icon' || q === 'gold') { g.save(); g.translate(0, -70); g.rotate(t * .25); for (let k = 0; k < 14; k++) { g.rotate(TAU / 14); g.fillStyle = q === 'icon' ? `hsla(${(t * 90 + k * 26) % 360},100%,70%,.16)` : Q[1] + '22'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-14, -260); g.lineTo(14, -260); g.fill(); } g.restore(); }
    const halo = g.createRadialGradient(0, -70, 10, 0, -70, 150); halo.addColorStop(0, tc + 'aa'); halo.addColorStop(1, tc + '00'); g.fillStyle = halo; g.fillRect(-w / 2, -h / 2, w, h);
    athlete(g, rec.sport, 12, -54, 1.05, L, { acc: accKey(rec) });
    // the foil sweep, stronger on rarer cards
    const sw = ((t * .35 + (opt.ph || 0)) % 1.6) - .3, fg = g.createLinearGradient(-w / 2 + sw * w * 1.6 - 70, -h / 2, -w / 2 + sw * w * 1.6 + 70, h / 2), fa = q === 'icon' ? .32 : q === 'star' ? .24 : q === 'gold' ? .18 : .12;
    fg.addColorStop(0, 'rgba(255,255,255,0)'); fg.addColorStop(.5, `rgba(255,255,255,${fa})`); fg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = fg; g.fillRect(-w / 2, -h / 2, w, h);
    if (q === 'icon' || q === 'star') for (let k = 0; k < 10; k++) { const a = (t * .6 + k * .37) % 1, sx = Math.sin(k * 91.7) * 110, sy = -150 + ((k * 53) % 240) - a * 30; g.globalAlpha = Math.sin(a * Math.PI); g.fillStyle = '#fff'; g.fillRect(sx - 1, sy - 4, 2, 8); g.fillRect(sx - 4, sy - 1, 8, 2); g.globalAlpha = 1; }
    g.restore();
    // overall badge: a shield in the card's metal
    g.fillStyle = frameGrad(g, q, 80, 90, (opt.ph || 0) + .5); g.beginPath(); g.moveTo(-w / 2 + 14, -h / 2 + 14); g.lineTo(-w / 2 + 94, -h / 2 + 14); g.lineTo(-w / 2 + 94, -h / 2 + 82); g.lineTo(-w / 2 + 54, -h / 2 + 104); g.lineTo(-w / 2 + 14, -h / 2 + 82); g.closePath(); g.fill();
    g.fillStyle = '#0c1226'; g.beginPath(); g.moveTo(-w / 2 + 19, -h / 2 + 19); g.lineTo(-w / 2 + 89, -h / 2 + 19); g.lineTo(-w / 2 + 89, -h / 2 + 79); g.lineTo(-w / 2 + 54, -h / 2 + 98); g.lineTo(-w / 2 + 19, -h / 2 + 79); g.closePath(); g.fill();
    tx(g, String(rec.O), -w / 2 + 54, -h / 2 + 50, d(46), ratingC(rec.O)); tx(g, S.name.slice(0, 7).toUpperCase(), -w / 2 + 54, -h / 2 + 82, d(13), S.c);
    if (L.num != null) tx(g, '#' + L.num, w / 2 - 36, -h / 2 + 34, d(30), '#fff');
    const tr = traitOf(rec.trait); if (tr) tx(g, tr.ic, w / 2 - 36, -h / 2 + 72, '24px system-ui', '#fff');
    // name plate in the team's colours, then the stats with bars
    const np = g.createLinearGradient(-w / 2, 0, w / 2, 0); np.addColorStop(0, tc); np.addColorStop(1, tc2); g.fillStyle = np; g.beginPath(); g.roundRect(-w / 2 + 12, 40, w - 24, 38, 9); g.fill();
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.roundRect(-w / 2 + 15, 43, w - 30, 32, 7); g.fill(); tx(g, rec.name.toUpperCase(), 0, 60, d(rec.name.length > 15 ? 24 : 30), '#fff');
    const r = rec.r || Array(6).fill(rec.O);
    S.at.forEach((a, i) => { const cx = -w / 2 + 20 + (i % 2) * 126, cy = 96 + Math.floor(i / 2) * 30, v = r[i];
      tx(g, a.slice(0, 9).toUpperCase(), cx, cy, f(11, 900), '#9fb0d0', 'left'); tx(g, (v >= 98 ? '★' : '') + v, cx + 110, cy, d(22), ratingC(v), 'right');
      g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(cx, cy + 11, 110, 3); g.fillStyle = ratingC(v); g.fillRect(cx, cy + 11, 110 * clamp((v - 30) / 69, 0, 1), 3); });
    const lab = rec.tier ? rec.tier.toUpperCase() : Q[3]; g.fillStyle = frameGrad(g, q, 150, 26, (opt.ph || 0) + 1); g.beginPath(); g.roundRect(-78, h / 2 - 32, 156, 26, 13); g.fill(); tx(g, lab, 0, h / 2 - 18, d(18), '#141414');
    if (opt.crack) { g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-40, -h / 2 + 20); g.lineTo(-10, -60); g.lineTo(-34, -10); g.lineTo(12, 40); g.lineTo(-6, 90); g.moveTo(-10, -60); g.lineTo(40, -90); g.moveTo(-34, -10); g.lineTo(-90, 10); g.stroke(); }
    g.restore();
  }
  const accKey = rec => ((GAME.skins[(rec && rec.acc != null ? rec.acc : rec && rec.look && rec.look.acc) || 0] || {}).k) || 'none';
  const B = {};
  function button(g, k, b, label, c, sub, tc = '#141414') {
    B[k] = b; const hv = hover === k;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.roundRect(b.x, b.y + 6, b.w, b.h, 14); g.fill();
    rr(g, b.x, b.y + (hv ? 2 : 0), b.w, b.h, 14, c);
    tx(g, label, b.x + b.w / 2, b.y + b.h / 2 + (sub ? -10 : 2) + (hv ? 2 : 0), d(b.h > 80 ? 50 : b.h < 56 ? 24 : 30), tc);
    if (sub) tx(g, sub, b.x + b.w / 2, b.y + b.h / 2 + 22 + (hv ? 2 : 0), f(15), tc);
  }
  function wrap(g, s, x, y, w, lh, c, al = 'left') { g.fillStyle = c; g.textAlign = al; g.textBaseline = 'middle'; let line = '', yy = y; for (const wd of s.split(' ')) { const tt = line ? line + ' ' + wd : wd; if (g.measureText(tt).width > w && line) { g.fillText(line, x, yy); line = wd; yy += lh; } else line = tt; } g.fillText(line, x, yy); return yy; }
  const ratingC = v => v >= 99 ? `hsl(${(t * 220) % 360},100%,68%)` : v >= 98 ? (Math.floor(t * 6) % 2 ? '#fff6c0' : '#ffd23f') : v >= 95 ? '#ffd23f' : v >= 88 ? '#ff5fa2' : v >= 80 ? '#3ddc84' : v >= 70 ? '#29e0ff' : v >= 60 ? '#cfd8e0' : '#8a95ab';
  function dim(g, a = .62) { const v = K.view; g.fillStyle = `rgba(4,8,18,${a})`; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }

  function drawHome(g) {
    const L = SAVE(), Q = quests(), best = L.hof[0];
    tx(g, 'LEGEND', 520, 64, d(86), '#eef1f8'); tx(g, 'MAKER', 770, 64, d(86), '#ffb02e');
    tx(g, 'Create a legend. Live the career. Beat real players in the Arena.', 640, 114, f(20, 700), '#9fb0d0');
    // your best legend's card, or an empty one
    if (best) { card(g, best, 220, 360, .9); tx(g, 'YOUR BEST LEGEND', 220, 160, d(22), '#ffb02e'); }
    else { rr(g, 94, 180, 252, 360, 20, 'rgba(255,255,255,.04)', 'rgba(255,255,255,.15)', 2); tx(g, '?', 220, 340, d(120), 'rgba(255,255,255,.15)'); tx(g, 'Your legend goes here', 220, 470, f(16), '#5a6a8a'); }
    button(g, 'play', { x: 400, y: 150, w: 600, h: 120 }, 'CREATE A LEGEND', '#ffd23f', 'Sport, look, draft, trait. Then live the career.');
    button(g, 'arena', { x: 400, y: 290, w: 294, h: 96 }, 'ARENA', '#ff5fa2', 'Duel real players\' legends');
    button(g, 'ladder', { x: 706, y: 290, w: 294, h: 96 }, 'LEGENDS LADDER', '#29e0ff', 'Ten all-time greats');
    button(g, 'daily', { x: 400, y: 400, w: 194, h: 78 }, 'DAILY', '#1f2a46', 'Same reel for all', '#eef1f8');
    button(g, 'vs', { x: 603, y: 400, w: 194, h: 78 }, 'DRAFT VS CPU', '#1f2a46', `${L.vsW || 0} wins`, '#eef1f8');
    button(g, 'hof', { x: 806, y: 400, w: 194, h: 78 }, 'HALL OF FAME', '#1f2a46', `${L.hof.length} legends`, '#eef1f8');
    // sport picker for the quick modes
    Object.keys(SPORTS).forEach((k, i) => { const S = SPORTS[k], b = { x: 400 + i * 121, y: 494, w: 111, h: 46 }, on = sport === k; B['sp' + k] = b; rr(g, b.x, b.y, b.w, b.h, 12, on ? S.c : '#1a2238', on ? '#fff' : hover === 'sp' + k ? S.c : 'rgba(255,255,255,.12)', 2); tx(g, S.name, b.x + b.w / 2, b.y + b.h / 2 + 1, d(22), on ? '#141414' : '#eef1f8'); });
    const st = L.streak || { n: 0 }; tx(g, st.n ? `🔥 ${st.n} day streak` : 'Play every day to build a streak', 700, 572, f(16, 800), st.n ? '#ffb02e' : '#5a6a8a');
    if (L.arenaW || L.arenaL) tx(g, `Arena record ${L.arenaW || 0}-${L.arenaL || 0}`, 700, 598, f(15, 800), '#ff8ac8');
    rr(g, 1030, 150, 220, 452, 16, '#121a2e', 'rgba(255,255,255,.12)', 2);
    tx(g, 'QUESTS', 1140, 182, d(28), '#ffb02e'); tx(g, `${Q.done.length}/3 today`, 1140, 206, f(14), '#9fb0d0');
    Q.list.forEach((k, i) => { const done = Q.done.includes(k), y = 230 + i * 74; rr(g, 1044, y, 192, 62, 10, done ? '#1f4a34' : '#1a2238'); tx(g, done ? '✓' : '○', 1062, y + 31, f(22, 900), done ? '#3ddc84' : '#9fb0d0'); g.font = f(14); wrap(g, (QUESTS.find(q => q[0] === k) || ['', ''])[1], 1078, y + 22, 148, 17, done ? '#bff5d6' : '#eef1f8'); });
    tx(g, 'BEST LEGACY', 1140, 478, d(22), '#ffb02e'); Object.keys(SPORTS).forEach((k, i) => tx(g, `${SPORTS[k].name}  ${L.best[k] || '-'}`, 1140, 504 + i * 20, f(13), '#eef1f8'));
    tx(g, 'Every player and team here is made up. Arena legends are made by real players.', 640, 660, f(14, 700), '#5a6a8a');
  }

  /* ---------- the creator ---------- */
  let nameEl = null;
  function nameInput(show) {
    if (!show) { if (nameEl) { nameEl.remove(); nameEl = null; } return; }
    const cv = document.querySelector('canvas'); if (!cv) return;
    if (!nameEl) {
      nameEl = document.createElement('input'); nameEl.maxLength = 18; nameEl.autocomplete = 'off'; nameEl.spellcheck = false; nameEl.setAttribute('aria-label', 'Your legend\'s name');
      Object.assign(nameEl.style, { position: 'fixed', zIndex: 5, background: '#0e1428', color: '#fff', border: '2px solid #ffb02e', borderRadius: '10px', textAlign: 'center', fontFamily: FD, letterSpacing: '.04em', outline: 'none', padding: '0' });
      nameEl.value = build.name; nameEl.addEventListener('input', () => { build.name = nameEl.value.replace(/[^A-Za-z0-9 .'-]/g, '').slice(0, 18); }); nameEl.addEventListener('keydown', e => e.stopPropagation());
      document.body.appendChild(nameEl);
    }
    const r = cv.getBoundingClientRect(), sc = r.width / (K.view.x1 - K.view.x0), X = gx => r.left + (gx - K.view.x0) * sc, Y = gy => r.top + (gy - K.view.y0) * sc;
    Object.assign(nameEl.style, { left: X(560) + 'px', top: Y(96) + 'px', width: 440 * sc + 'px', height: 50 * sc + 'px', fontSize: 34 * sc + 'px' });
  }
  const swatch = (g, k, x, y, col, on, r = 19) => { B[k] = { x: x - r, y: y - r, w: r * 2, h: r * 2 }; g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = on ? '#fff' : hover === k ? '#ffd23f' : 'rgba(0,0,0,.4)'; g.lineWidth = on ? 4 : 2; g.stroke(); };
  function drawLook(g) {
    const S = SPORTS[sport], L = build.look;
    tx(g, 'CREATE YOUR LEGEND', 640, 44, d(44), '#ffb02e');
    // the sport
    Object.keys(SPORTS).forEach((k, i) => { const Sk = SPORTS[k], b = { x: 40 + i * 98, y: 90, w: 90, h: 40 }, on = sport === k; B['csp' + k] = b; rr(g, b.x, b.y, b.w, b.h, 10, on ? Sk.c : '#1a2238', on ? '#fff' : 'rgba(255,255,255,.12)', 2); tx(g, Sk.name, b.x + b.w / 2, b.y + 21, d(20), on ? '#141414' : '#eef1f8'); });
    // the athlete, big
    rr(g, 40, 146, 482, 470, 18, '#121a2e', TEAM[L.c1], 3);
    g.save(); g.beginPath(); g.roundRect(40, 146, 482, 470, 18); g.clip(); g.fillStyle = TEAM[L.c1] + '33'; g.beginPath(); g.arc(281, 360, 190, 0, TAU); g.fill(); athlete(g, sport, 275, 370, 2.15, L); g.restore();
    tx(g, (build.name || 'NO NAME').toUpperCase(), 281, 590, d(34), '#fff');
    tx(g, 'NAME', 560, 80, f(14, 900), '#9fb0d0', 'left'); if (!nameEl) { rr(g, 560, 96, 440, 50, 10, '#0e1428', '#ffb02e', 2); tx(g, (build.name || '').toUpperCase(), 780, 122, d(34), '#fff'); } B.dice = { x: 1012, y: 96, w: 60, h: 50 }; rr(g, 1012, 96, 60, 50, 10, '#1f2a46', hover === 'dice' ? '#ffd23f' : 'rgba(255,255,255,.15)', 2); tx(g, '🎲', 1042, 122, '26px system-ui', '#fff');
    const row = (label, y) => tx(g, label, 560, y, f(14, 900), '#9fb0d0', 'left');
    row('SKIN', 178); SKIN.forEach((c, i) => swatch(g, 'skin' + i, 660 + i * 50, 178, c, L.skin === i));
    row('HAIR', 236); HAIRS.forEach((n, i) => { const b = { x: 640 + (i % 4) * 106, y: 214 + Math.floor(i / 4) * 44, w: 98, h: 36 }; B['hair' + i] = b; rr(g, b.x, b.y, b.w, b.h, 9, L.hair === i ? '#ffb02e' : '#1a2238', hover === 'hair' + i ? '#ffd23f' : 'rgba(255,255,255,.12)', 2); tx(g, n, b.x + b.w / 2, b.y + 19, d(20), L.hair === i ? '#141414' : '#eef1f8'); });
    row('HAIR COLOUR', 330); HAIRC.forEach((c, i) => swatch(g, 'hc' + i, 720 + i * 50, 330, c, L.hc === i));
    const px = i => i < 6 ? 700 + i * 44 : 972 + (i - 6) * 44;
    row('TEAM COLOUR', 386); TEAM.forEach((c, i) => swatch(g, 'c1' + i, px(i), 386, c, L.c1 === i, 17));
    row('TRIM', 432); TEAM.forEach((c, i) => swatch(g, 'c2' + i, px(i), 432, c, L.c2 === i, 17));
    row('NUMBER', 488); B.numDn = { x: 680, y: 466, w: 48, h: 44 }; B.numUp = { x: 820, y: 466, w: 48, h: 44 }; rr(g, 680, 466, 48, 44, 10, '#1f2a46'); rr(g, 820, 466, 48, 44, 10, '#1f2a46'); tx(g, '−', 704, 488, d(32), '#fff'); tx(g, '+', 844, 488, d(32), '#fff'); tx(g, '#' + L.num, 774, 490, d(40), '#ffd23f');
    row('BUILD', 548); BUILDS.forEach((n, i) => { const b = { x: 660 + i * 140, y: 526, w: 130, h: 44 }; B['bld' + i] = b; rr(g, b.x, b.y, b.w, b.h, 10, L.build === i ? '#ffb02e' : '#1a2238', hover === 'bld' + i ? '#ffd23f' : 'rgba(255,255,255,.12)', 2); tx(g, n, b.x + b.w / 2, b.y + 23, d(24), L.build === i ? '#141414' : '#eef1f8'); });
    const bt = L.build === 0 ? `+3 ${S.at[S.lean[0]]} & ${S.at[S.lean[1]]}, -2 ${S.at[S.power[0]]} & ${S.at[S.power[1]]}` : L.build === 2 ? `+3 ${S.at[S.power[0]]} & ${S.at[S.power[1]]}, -2 ${S.at[S.lean[0]]} & ${S.at[S.lean[1]]}` : `+1 ${S.at[S.lean[0]]} & ${S.at[S.power[0]]}: balanced`;
    tx(g, bt, 900, 590, f(14, 800), '#cfd8e0');
    button(g, 'tolook2', { x: 900, y: 620, w: 340, h: 76 }, 'NEXT: THE DRAFT ▶', '#ffd23f', null);
    button(g, 'home', { x: 40, y: 636, w: 160, h: 60 }, 'BACK', '#1f2a46', null, '#eef1f8');
  }
  function drawDraft(g) {
    const S = SPORTS[sport];
    tx(g, `${daily ? 'DAILY · ' : build.vs ? 'DRAFT VS CPU · ' : ''}DRAFT ${build.name.toUpperCase()}'S RATINGS`, 640, 40, d(38), S.c);
    S.at.forEach((a, i) => {
      const s = build.slots[i], b = { x: 40, y: 80 + i * 86, w: 360, h: 74 }, can = build.pro && !s; B['slot' + i] = b;
      rr(g, b.x, b.y, b.w, b.h, 14, s ? '#1f2a46' : can ? (hover === 'slot' + i ? '#3a4a20' : '#26301e') : '#161e34', can ? (hover === 'slot' + i ? '#ffd23f' : 'rgba(255,210,63,.5)') : 'rgba(255,255,255,.1)', 2);
      tx(g, a.toUpperCase(), b.x + 20, b.y + 26, d(26), '#eef1f8', 'left');
      if (s) { tx(g, 'from ' + s.who, b.x + 20, b.y + 52, f(14, 700), '#9fb0d0', 'left'); tx(g, String(s.v), b.x + b.w - 24, b.y + 38, d(46), ratingC(s.v), 'right'); }
      else if (can) { tx(g, `tap to take ${build.pro.r[i]}`, b.x + 20, b.y + 52, f(14, 800), '#ffd23f', 'left'); tx(g, String(build.pro.r[i]), b.x + b.w - 24, b.y + 38, d(46), 'rgba(255,255,255,.35)', 'right'); }
      else tx(g, 'empty', b.x + 20, b.y + 52, f(14, 700), '#5a6a8a', 'left');
    });
    const cx0 = 430, cw = 810, cy = 80, ch = 500, px = cx0 + cw / 2;
    rr(g, cx0, cy, cw, ch, 18, '#121a2e', S.c, 3);
    if (reel) {
      const RH = 74, pos = reelPos(reel), yc = cy + 262, landed = reel.t >= reel.end, top = yc - RH * 2.5, fast = reel.t > reel.A && reel.t < reel.A + reel.Tc + reel.Td * .3;
      tx(g, landed ? 'LOCKED IN' : 'SPINNING...', px, cy + 44, d(34), landed ? '#fff' : '#ffd23f');
      g.save(); g.beginPath(); g.rect(cx0 + 12, top, cw - 24, RH * 5); g.clip();
      g.fillStyle = 'rgba(255,255,255,.03)'; g.fillRect(cx0 + 12, top, cw - 24, RH * 5);
      for (let j = Math.max(0, Math.floor(pos) - 3); j <= Math.min(reel.names.length - 1, Math.floor(pos) + 3); j++) {
        const it = reel.names[j], y = yc + (j - pos) * RH, dist = Math.abs(y - yc) / RH, mid = dist < .5, win = it.win && landed;
        g.globalAlpha = Math.max(.2, 1 - dist * .32);
        rr(g, cx0 + 60, y - RH / 2 + 5, cw - 120, RH - 10, 12, win ? 'rgba(255,210,63,.22)' : 'rgba(31,42,70,.85)');
        g.fillStyle = it.c; g.fillRect(cx0 + 60, y - RH / 2 + 5, 10, RH - 10);
        if (fast) { g.globalAlpha *= .55; tx(g, it.n.toUpperCase(), px, y - 7, d(mid ? 42 : 34), '#eef1f8'); g.globalAlpha /= .55; }
        tx(g, it.n.toUpperCase(), px, y, d(mid ? 42 : 34), win ? '#ffd23f' : mid ? '#fff' : '#b8c4dc');
      }
      g.globalAlpha = 1;
      const fade = g.createLinearGradient(0, top, 0, top + RH * 5); fade.addColorStop(0, '#121a2e'); fade.addColorStop(.28, 'rgba(18,26,46,0)'); fade.addColorStop(.72, 'rgba(18,26,46,0)'); fade.addColorStop(1, '#121a2e'); g.fillStyle = fade; g.fillRect(cx0 + 12, top, cw - 24, RH * 5); g.restore();
      const glow = landed ? 1 - Math.min(1, (reel.t - reel.end) / .5) : 0;
      rr(g, cx0 + 44, yc - RH / 2, cw - 88, RH, 14, null, landed ? `rgba(255,255,255,${.6 + glow * .4})` : '#ffd23f', 4 + glow * 4);
      g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(cx0 + 22, yc - 16); g.lineTo(cx0 + 42, yc); g.lineTo(cx0 + 22, yc + 16); g.fill(); g.beginPath(); g.moveTo(cx0 + cw - 22, yc - 16); g.lineTo(cx0 + cw - 42, yc); g.lineTo(cx0 + cw - 22, yc + 16); g.fill();
      if (!landed) tx(g, 'tap to stop', px, cy + ch - 24, f(15, 700), '#5a6a8a');
    } else if (!build.pro && !build.slots.every(Boolean)) {
      g.save(); g.globalAlpha = .18; athlete(g, sport, px, cy + 300, 1.7, build.look); g.restore();
      tx(g, `PICK ${build.spins + 1} OF 6`, px, cy + 70, d(34), '#9fb0d0'); tx(g, 'Spin the reel to land on a pro.', px, cy + 112, f(18, 700), '#cfd8e0');
      button(g, 'spin', { x: px - 190, y: cy + 180, w: 380, h: 130 }, 'SPIN', '#ffd23f', 'Space / tap');
      tx(g, 'Then tap one of your empty slots to take that pro\'s rating for it.', px, cy + 380, f(16, 700), '#9fb0d0');
    } else if (build.pro) {
      const p = build.pro, lx = cx0 + 170;
      g.save(); g.beginPath(); g.roundRect(cx0 + 20, cy + 20, 300, ch - 40, 14); g.clip(); g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(cx0 + 20, cy + 20, 300, ch - 40); athlete(g, sport, lx, cy + 220, 1.35, S.c, { noAcc: true }); g.restore();
      const [rn, rc] = rarity(p); rr(g, lx - 80, cy + 30, 160, 34, 17, rc); tx(g, rn, lx, cy + 48, d(24), '#141414'); tx(g, p.name.toUpperCase(), lx, cy + 400, d(36), '#fff'); tx(g, `${p.club} · ${p.year}`, lx, cy + 432, f(16, 700), '#9fb0d0');
      const rx = cx0 + 350; tx(g, 'THIS PRO\'S RATINGS', rx, cy + 44, d(26), '#ffb02e', 'left');
      S.at.forEach((a, i) => { const y = cy + 94 + i * 58, free = !build.slots[i]; tx(g, a, rx, y - 12, f(18, 800), free ? '#eef1f8' : '#5a6a8a', 'left'); rr(g, rx, y + 4, 330, 14, 7, '#1f2a46'); rr(g, rx, y + 4, 330 * p.r[i] / 100, 14, 7, free ? ratingC(p.r[i]) : '#3a4660'); tx(g, free ? String(p.r[i]) : 'taken', rx + 420, y + 2, d(free ? 40 : 22), free ? ratingC(p.r[i]) : '#5a6a8a', 'right'); });
      tx(g, '◀  Tap an empty slot to draft one of these', px + 140, cy + ch - 26, f(16, 800), '#ffd23f');
    } else if (mode === 'ready') {
      g.save(); g.beginPath(); g.roundRect(cx0 + 20, cy + 20, cw - 40, ch - 40, 14); g.clip(); athlete(g, sport, px - 200, cy + 230, 1.6, build.look); g.restore();
      tx(g, 'DRAFT DONE', px + 150, cy + 150, d(40), '#9fb0d0'); tx(g, build.name.toUpperCase(), px + 150, cy + 210, d(54), '#fff');
      tx(g, String(ovr()), px + 150, cy + 300, d(130), ratingC(ovr())); tx(g, 'OVERALL', px + 150, cy + 380, d(30), '#9fb0d0');
    }
    rr(g, 40, 606, 360, 92, 14, '#121a2e', 'rgba(255,255,255,.1)', 2);
    tx(g, 'OVERALL', 64, 636, d(24), '#9fb0d0', 'left'); const filled = build.slots.filter(Boolean).length;
    tx(g, filled ? String(ovr()) : '--', 380, 652, d(64), filled ? ratingC(ovr()) : '#5a6a8a', 'right'); tx(g, `${filled}/6 slots${filled ? ` · ${Math.max(0, 99 - ovr())} to the GOAT (99)` : ''}`, 64, 670, f(15), '#9fb0d0', 'left');
    if (build.vs) { const V = build.vs; rr(g, 1056, 584, 168, 96, 14, '#2a1430', '#ff5fa2', 2); tx(g, 'CPU RIVAL', 1140, 604, d(22), '#ff5fa2'); tx(g, String(cpuOvr()), 1140, 638, d(40), '#fff'); tx(g, `${V.cpu.filter(Boolean).length}/6 · clock ${build.pro && mode === 'create' ? Math.ceil(Math.max(0, V.clock)) : '-'}`, 1140, 666, f(13), '#ffb0d8'); }
    if (mode === 'create') button(g, 'reroll', { x: 625, y: 600, w: 420, h: 84 }, `REROLL  (${build.rerolls} left)`, build.rerolls && build.pro ? '#1f2a46' : '#141a2a', 'Skip this pro, spin again', build.rerolls && build.pro ? '#eef1f8' : '#5a6a8a');
    else if (build.vs) { const me2 = ovr(), cp = cpuOvr(); button(g, 'vsdone', { x: 625, y: 590, w: 420, h: 104 }, me2 > cp ? 'YOU WIN!' : me2 === cp ? 'TIE' : 'CPU WINS', me2 > cp ? '#3ddc84' : me2 === cp ? '#cfd8e0' : '#ff5f6a', `${me2} vs ${cp} overall · tap to finish`); }
  }
  function drawTrait(g) {
    const S = SPORTS[sport];
    tx(g, 'CHOOSE A SIGNATURE TRAIT', 640, 46, d(48), '#ffb02e'); tx(g, 'One thing that makes ' + build.name + ' different. It lasts the whole career.', 640, 86, f(19, 700), '#9fb0d0');
    TRAITS.forEach((tr, i) => {
      const b = { x: 70 + (i % 3) * 386, y: 120 + Math.floor(i / 3) * 210, w: 366, h: 190 }, on = build.trait === tr.k, hv = hover === 'tr' + i; B['tr' + i] = b;
      rr(g, b.x, b.y - (hv ? 3 : 0), b.w, b.h, 18, on ? '#2a3a20' : hv ? '#24315a' : '#1a2440', on ? '#ffd23f' : S.c, on ? 5 : 2);
      tx(g, tr.ic, b.x + 52, b.y + 60, '46px system-ui', '#fff'); tx(g, tr.n, b.x + 100, b.y + 56, d(38), '#fff', 'left');
      g.font = f(17, 700); wrap(g, tr.d, b.x + 30, b.y + 116, b.w - 60, 24, '#cfd8e0');
    });
    button(g, 'card', { x: 440, y: 560, w: 400, h: 90 }, build.trait ? 'REVEAL YOUR CARD ▶' : 'PICK A TRAIT FIRST', build.trait ? '#ffd23f' : '#2a2a3e', null, build.trait ? '#141414' : '#7a8aa8');
  }
  // a 98 or a 99 off the reel: the whole screen celebrates
  function drawPullFx(g) {
    const P = build.pullFx, e = t - P.t0, a = e < .15 ? e / .15 : e > 2 ? Math.max(0, (2.6 - e) / .6) : 1, v = K.view, hue = h => `hsl(${(t * 200 + h) % 360},100%,68%)`;
    if (e < .3) { g.fillStyle = `rgba(255,255,255,${((.3 - e) / .3 * .9).toFixed(2)})`; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
    g.save(); g.globalAlpha = a * .92; g.fillStyle = 'rgba(8,10,24,.8)'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.translate(640, 330); g.rotate(t * .5); for (let i = 0; i < 24; i++) { g.rotate(TAU / 24); g.fillStyle = P.goat ? hue(i * 15) : (i % 2 ? '#ffd23f' : '#fff4b0'); g.globalAlpha = a * .22; g.beginPath(); g.moveTo(0, 0); g.lineTo(-26, -900); g.lineTo(26, -900); g.fill(); } g.restore();
    g.save(); g.globalAlpha = a; const sc = 1 + Math.max(0, .5 - e) * 1.6; g.translate(640, 300); g.scale(sc, sc);
    tx(g, P.goat ? 'GOAT PULL' : 'ICON PULL', 0, 0, d(110), P.goat ? hue(0) : '#ffd23f', 'center', 10); tx(g, P.goat ? '99 · ONCE IN A LIFETIME' : '98 · ONE IN THIRTY-FIVE', 0, 84, d(34), '#fff', 'center', 6); g.restore();
  }
  function drawCardReveal(g) {
    const e = t - (build.revealT || 0), rec = { name: build.name, sport, look: build.look, r: finalRatings(), O: ovr(), trait: build.trait, tier: '', acc: K.save.skin || 0 }, q = qualOf(rec.O), Q = QUAL[q], flip = 1.1, k = e >= flip + .9 ? 1 : 0;
    tx(g, e < flip ? 'OPENING YOUR CARD...' : 'MEET YOUR LEGEND', 640, 46, d(52), q === 'icon' ? `hsl(${(t * 120) % 360},100%,70%)` : Q[1]);
    // light rays behind the card, growing as it spins
    g.save(); g.translate(400, 370); g.rotate(t * .4); const ra = Math.min(1, e / flip); for (let i = 0; i < 18; i++) { g.rotate(TAU / 18); g.fillStyle = q === 'icon' ? `hsla(${(t * 90 + i * 20) % 360},100%,70%,${(.1 + .12 * ra).toFixed(2)})` : Q[1] + (ra > .5 ? '33' : '1a'); g.beginPath(); g.moveTo(0, 0); g.lineTo(-30, -600); g.lineTo(30, -600); g.fill(); } g.restore();
    if (e < flip) {   // face down, spinning faster and glowing hotter
      const sp = e * e * 9, sx = Math.cos(sp), s0 = .55 + .45 * (e / flip); g.save(); g.translate(400, 370); g.scale(Math.abs(sx) * s0 * 1.15, s0 * 1.15);
      g.shadowColor = Q[1] === '#ffffff' ? '#ff5fa2' : Q[1]; g.shadowBlur = 20 + 50 * (e / flip); g.fillStyle = frameGrad(g, q, 280, 400); g.beginPath(); g.roundRect(-140, -200, 280, 400, 22); g.fill(); g.shadowBlur = 0;
      g.fillStyle = '#0c1226'; g.beginPath(); g.roundRect(-131, -191, 262, 382, 15); g.fill(); tx(g, 'L', 0, -10, d(160), Q[1]); tx(g, 'LEGEND MAKER', 0, 120, d(22), Q[1]); g.restore();
    } else {
      const fe = Math.min(1, (e - flip) / .25); g.save(); g.translate(400, 370); g.scale((.6 + .4 * fe) * 1.15, 1.15); card(g, rec, 0, 0, 1, { glow: q === 'icon' ? '#ff5fa2' : Q[1] }); g.restore();
      if (e < flip + .35) { g.fillStyle = `rgba(255,255,255,${(1 - (e - flip) / .35).toFixed(2)})`; g.fillRect(K.view.x0, K.view.y0, K.view.x1 - K.view.x0, K.view.y1 - K.view.y0); }
    }
    if (e >= flip) {   // the overall counts up, then the tier slams down
      const cnt = Math.round(lp(40, rec.O, Math.min(1, (e - flip) / .8))), sl = clamp((e - flip - .9) / .18, 0, 1);
      tx(g, String(cnt), 870, 312, d(130), ratingC(cnt)); tx(g, 'OVERALL', 870, 386, d(28), '#9fb0d0');
      if (sl > 0) { g.save(); g.translate(870, 112); g.scale(2.2 - 1.2 * sl, 2.2 - 1.2 * sl); g.globalAlpha = sl; g.fillStyle = frameGrad(g, q, 300, 50); g.beginPath(); g.roundRect(-150, -26, 300, 52, 26); g.fill(); tx(g, Q[3] + ' CARD', 0, 2, d(30), '#141414'); g.restore(); }
    }
    if (k >= 1) {
      tx(g, build.name.toUpperCase(), 870, 172, d(build.name.length > 14 ? 40 : 50), '#fff'); tx(g, `${SPORTS[sport].role} · #${build.look.num} · ${BUILDS[build.look.build].toLowerCase()} build`, 870, 206, f(17, 800), '#9fb0d0');
      const tr = traitOf(build.trait); tx(g, `${tr.ic} ${tr.n}`, 870, 428, d(30), '#ffd23f');
      button(g, 'sim', { x: 690, y: 470, w: 360, h: 100 }, 'START CAREER ▶', '#ffd23f', 'Rookie year, age 21');
      button(g, 'relook', { x: 690, y: 590, w: 172, h: 60 }, 'EDIT LOOK', '#1f2a46', null, '#eef1f8');
      button(g, 'home', { x: 878, y: 590, w: 172, h: 60 }, 'MENU', '#1f2a46', null, '#eef1f8');
    }
  }


  /* ---------- the career screen ---------- */
  function drawCareer(g) {
    const S = SPORTS[sport], c = career;
    tx(g, c.name.toUpperCase(), 640, 34, d(44), '#fff');
    tx(g, `${S.role} · age ${c.age} · ${c.O} overall${c.O !== c.O0 ? ` (built ${c.O0})` : ''} · ${c.club}${c.trait ? ' · ' + traitOf(c.trait).n.toLowerCase() : ''}`, 640, 68, f(17, 700), '#9fb0d0');
    const x0 = 40, w = 790, y0 = 92; rr(g, x0, y0, w, 524, 14, '#121a2e', 'rgba(255,255,255,.1)', 2);
    const cols = ['YR', 'AGE', 'CLUB', ...S.stat, 'SEASON'], cx = [70, 116, 168, 350, 432, 512, 576];
    cols.forEach((h, i) => tx(g, h, cx[i], y0 + 22, d(20), '#ffb02e', i === 2 || i === 6 ? 'left' : 'center'));
    const n = c.seasons.length, list = c.seasons.slice(Math.max(0, n - 13), n);
    if (!n) tx(g, 'Your rookie season is next.', x0 + w / 2, y0 + 250, f(19, 700), '#5a6a8a');
    list.forEach((s, j) => {
      const i = Math.max(0, n - 13) + j, y = y0 + 54 + j * 36, fresh = i === n - 1 && c.phase === 'show';
      if (fresh) rr(g, x0 + 6, y - 16, w - 12, 32, 6, 'rgba(255,210,63,.16)');
      tx(g, String(i + 1), cx[0], y, f(16), '#eef1f8'); tx(g, String(s.age), cx[1], y, f(16), '#9fb0d0'); tx(g, s.club, cx[2], y, f(14, 700), '#cfd8e0', 'left');
      ['a', 'b', 'c'].forEach((k, q) => tx(g, fmtStat(s.s, k), cx[3 + q], y, f(16), '#eef1f8'));
      const good = s.A.filter(a => !/Injury|Lost|Runner/.test(a)), txt = (s.note ? s.note + ' ' : '') + (good.length ? good.join(' · ') : s.A.length ? s.A.join(' · ') : '');
      tx(g, txt.length > 32 ? txt.slice(0, 31) + '…' : txt || '-', cx[6], y, f(14, 800), good.length ? '#ffd23f' : s.A.length ? '#ff8a8a' : '#7a8aa8', 'left');
    });
    // the legend and the trophy case
    rr(g, 850, 92, 390, 524, 14, '#121a2e', 'rgba(255,255,255,.1)', 2);
    g.save(); g.beginPath(); g.roundRect(850, 92, 390, 200, 14); g.clip(); g.fillStyle = TEAM[c.look.c1] + '30'; g.fillRect(850, 92, 390, 200); athlete(g, sport, 960, 200, .95, c.look); g.restore();
    tx(g, 'LEGACY', 1150, 130, d(22), '#9fb0d0'); tx(g, String(Math.round(c.legacy + (c.final ? 0 : c.O0 * 2))), 1150, 170, d(50), '#ffd23f');
    tx(g, `${c.seasons.length} season${c.seasons.length === 1 ? '' : 's'}`, 1150, 210, f(14, 700), '#9fb0d0'); if (c.hl.length) tx(g, `★ ${c.hl.length} highlight${c.hl.length > 1 ? 's' : ''}`, 1150, 234, f(14, 800), '#ffd23f');
    [[S.mvp, '🏆', c.aw.mvp], [S.champ, '💍', c.aw.champ], ['Finals MVP', '🎖️', c.aw.fmvp], [S.star, '⭐', c.aw.star], [S.dpoy, '🥇', c.aw.dpoy]].forEach(([k, em, v], i) => {
      const y = 320 + i * 56; tx(g, em, 892, y, '30px system-ui', '#fff'); tx(g, k[0].toUpperCase() + k.slice(1), 930, y - 9, f(16), '#eef1f8', 'left'); tx(g, `× ${v}`, 930, y + 14, d(24), v ? '#ffd23f' : '#5a6a8a', 'left');
    });
    if (c.done && mode !== 'verdict') button(g, 'verdict', { x: 360, y: 630, w: 560, h: 76 }, 'HALL OF FAME VERDICT', '#ffd23f');
    else if (!c.done && !c.fast && (c.phase === 'camp' || c.phase === 'show')) button(g, 'fast', { x: 1000, y: 636, w: 240, h: 60 }, 'SIM THE REST', '#1f2a46', null, '#9fb0d0');
    if (c.phase === 'show') tx(g, `Season ${c.seasons.length} done`, 440, 664, d(30), '#9fb0d0');
    if (c.phase === 'camp' && !c.mg) drawCampPick(g);
    if (c.phase === 'retire') drawRetire(g);
    if (c.mg) drawMG(g, c.mg);
  }
  function drawCampPick(g) {
    const c = career, S = SPORTS[sport], k = Math.min(1, c.t * 5); dim(g, .84 * k); g.globalAlpha = k;
    tx(g, c.seasons.length ? `OFFSEASON · AGE ${c.age}` : 'ROOKIE TRAINING CAMP', 640, 130, d(56), '#ffd23f');
    tx(g, 'What do you want to work on? Tap a skill, then nail the drill.', 640, 176, f(19, 700), '#cfd8e0');
    S.at.forEach((a, i) => {
      const b = { x: 170 + (i % 3) * 320, y: 220 + Math.floor(i / 3) * 170, w: 300, h: 150 }, hv = hover === 'camp' + i, wt = S.w[i]; B['camp' + i] = b;
      rr(g, b.x, b.y - (hv ? 3 : 0), b.w, b.h, 18, hv ? '#24315a' : '#1a2440', hv ? '#ffd23f' : S.c, hv ? 4 : 2);
      tx(g, String(i + 1), b.x + 22, b.y + 24, d(22), 'rgba(255,255,255,.3)');
      tx(g, a.toUpperCase(), b.x + b.w / 2, b.y + 46, d(34), '#fff'); tx(g, String(c.v[i]), b.x + b.w / 2, b.y + 98, d(54), ratingC(c.v[i]));
      tx(g, wt >= 1.2 ? 'key skill' : wt >= 1 ? 'important' : 'nice to have', b.x + b.w / 2, b.y + 132, f(13, 800), wt >= 1.2 ? '#ffd23f' : '#7a8aa8');
    });
    tx(g, c.age >= 31 ? 'Veteran: gains are smaller now.' : c.trait === 'gym' ? 'Gym rat: bigger gains.' : '', 640, 590, f(16, 800), '#ffb02e');
    g.globalAlpha = 1;
  }
  function drawRetire(g) {
    const c = career, k = Math.min(1, c.t * 4); dim(g, .86 * k); g.globalAlpha = k;
    tx(g, 'DECISION TIME', 640, 200, d(70), '#ff5fa2'); tx(g, `${c.seasons.length} seasons in. You are ${c.age}. Your body is telling you something.`, 640, 252, f(20, 700), '#cfd8e0');
    button(g, 'retire', { x: 250, y: 320, w: 370, h: 140 }, 'RETIRE A LEGEND', '#ffd23f', 'Hear the Hall of Fame verdict');
    if (c.extra < 3) button(g, 'more', { x: 660, y: 320, w: 370, h: 140 }, 'ONE MORE YEAR', '#1f2a46', 'Expect a decline. It could end badly.', '#eef1f8');
    g.globalAlpha = 1;
  }
  // a mini-game, drawn over whatever screen it belongs to
  const mgWho = () => mode === 'career' && career ? [sport, career.look, career] : mode === 'duel' && ladder ? [ladder.rec.sport, ladder.rec.look, ladder.rec] : mode === 'battle' && arena ? [arena.rec.sport, arena.rec.look, arena.rec] : null;
  function ball(g, sp, x, y) {
    if (sp === 'hoops') { g.fillStyle = '#e8701a'; g.beginPath(); g.arc(x, y, 13, 0, TAU); g.fill(); g.strokeStyle = '#7a3a0a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 13, y); g.lineTo(x + 13, y); g.moveTo(x, y - 13); g.lineTo(x, y + 13); g.stroke(); }
    else if (sp === 'gridiron') { g.fillStyle = '#8a4a1e'; g.beginPath(); g.ellipse(x, y, 15, 9, -.5, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(x - 5, y - 1, 10, 2); }
    else if (sp === 'hockey') { g.fillStyle = '#111'; g.beginPath(); g.ellipse(x, y, 12, 5, 0, 0, TAU); g.fill(); }
    else { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, sp === 'diamond' ? 9 : 12, 0, TAU); g.fill(); g.fillStyle = sp === 'diamond' ? '#e8343a' : '#1a1a1a'; if (sp === 'diamond') { g.fillRect(x - 5, y - 1, 10, 2); } else { g.beginPath(); g.arc(x, y, 4.5, 0, TAU); g.fill(); } }
  }
  function drawMG(g, M) {
    dim(g, .88); B.mg = { x: K.view.x0, y: K.view.y0, w: K.view.x1 - K.view.x0, h: K.view.y1 - K.view.y0 };
    const who = mgWho(); if (who) { g.save(); g.globalAlpha = .9; athlete(g, who[0], 150, 470, 1.05, who[1], { acc: accKey(who[2]) }); g.restore(); }
    if (who && M.res && ['bar', 'aim', 'power'].includes(M.type)) {   // the shot: in, or off wide
      const k = Math.min(1, M.rt / .55), tx2 = M.res === 'miss' ? 1240 : M.type === 'aim' ? M.tx : 1040, ty2 = M.res === 'miss' ? 110 : M.type === 'aim' ? M.ty : 300, bx = lp(200, tx2, k), by = lp(380, ty2, k) - Math.sin(k * Math.PI) * 140;
      if (k < 1 || M.res !== 'miss') ball(g, who[0], bx, by);
      if (k >= 1 && M.res !== 'miss') { g.globalAlpha = Math.max(0, 1 - (M.rt - .55) * 2); g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.beginPath(); g.arc(tx2, ty2, 20 + (M.rt - .55) * 120, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    }
    tx(g, M.ctx.title, 640, 120, d(56), '#ffd23f'); tx(g, M.ctx.sub, 640, 168, f(20, 800), '#fff');
    if (!M.res) tx(g, MGHOW[M.type], 640, 204, f(16, 700), '#9fb0d0');
    const S = SPORTS[sport];
    if (M.type === 'bar' || M.type === 'power') {
      const x0 = 290, w = 700, y = 330, h = 60, zc = M.type === 'power' && M.stage ? M.z2 : M.zc;
      if (M.type === 'power') tx(g, M.stage ? 'POWER' : 'AIM', 640, 300, d(30), M.stage ? '#ff8a2e' : '#29e0ff');
      rr(g, x0, y, w, h, 30, '#121a2e', 'rgba(255,255,255,.25)', 3);
      rr(g, x0 + (zc - M.zw / 2) * w, y + 6, M.zw * w, h - 12, 22, '#3ddc84'); rr(g, x0 + (zc - M.zw / 6) * w, y + 6, M.zw / 3 * w, h - 12, 18, '#ffd23f');
      const nx = x0 + M.pos * w; g.fillStyle = '#fff'; g.fillRect(nx - 4, y - 14, 8, h + 28); g.beginPath(); g.moveTo(nx - 12, y - 22); g.lineTo(nx + 12, y - 22); g.lineTo(nx, y - 8); g.fill();
      if (M.type === 'power' && M.stage) tx(g, `aim: ${M.got[0] === 'perfect' ? 'perfect' : 'good'}`, 640, 420, f(16, 800), '#3ddc84');
    }
    if (M.type === 'aim') {
      // the target area: a goal, a net, a strike zone or a hoop
      rr(g, 340, 280, 600, 230, 12, 'rgba(255,255,255,.04)', 'rgba(255,255,255,.3)', 3);
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; for (let x = 360; x < 940; x += 30) { g.beginPath(); g.moveTo(x, 280); g.lineTo(x, 510); g.stroke(); } for (let y = 300; y < 510; y += 30) { g.beginPath(); g.moveTo(340, y); g.lineTo(940, y); g.stroke(); }
      g.fillStyle = 'rgba(61,220,132,.25)'; g.beginPath(); g.arc(M.tx, M.ty, M.R, 0, TAU); g.fill(); g.strokeStyle = '#3ddc84'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(M.tx, M.ty, M.R / 3, 0, TAU); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(M.cx, M.cy, 18, 0, TAU); g.moveTo(M.cx - 28, M.cy); g.lineTo(M.cx + 28, M.cy); g.moveTo(M.cx, M.cy - 28); g.lineTo(M.cx, M.cy + 28); g.stroke();
      if (!M.res) { rr(g, 440, 530, 400, 10, 5, '#1f2a46'); rr(g, 440, 530, 400 * Math.max(0, 1 - M.t / M.lim), 10, 5, '#ffb02e'); }
    }
    if (M.type === 'combo') {
      const n = M.seq.length, x0 = 640 - (n - 1) * 46;
      M.seq.forEach((a, i) => { const done = i < M.at, cur = i === M.at && !M.res; rr(g, x0 + i * 92 - 38, 280, 76, 76, 14, done ? '#1f4a34' : cur ? '#3a2a10' : '#1a2440', done ? '#3ddc84' : cur ? '#ffd23f' : 'rgba(255,255,255,.2)', cur ? 4 : 2); tx(g, ARR[a], x0 + i * 92, 320, d(44), done ? '#3ddc84' : '#fff'); });
      if (!M.res) { rr(g, 440, 380, 400, 10, 5, '#1f2a46'); rr(g, 440, 380, 400 * Math.max(0, 1 - M.t / M.lim), 10, 5, M.t < M.lim * .55 ? '#ffd23f' : '#ff8a2e'); }
      for (let i = 0; i < 4; i++) { const b = comboBtn(i); g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(b.x, b.y, 44, 0, TAU); g.fill(); tx(g, ARR[ARROWS[i]], b.x, b.y + 2, d(40), '#cfd8e0'); }
    }
    if (M.type === 'mash') {
      const x0 = 290, w = 700, y = 330, h = 60; rr(g, x0, y, w, h, 30, '#3a1a20', 'rgba(255,255,255,.25)', 3); rr(g, x0, y, w * clamp(M.m, 0, 1), h, 30, S.c);
      tx(g, 'YOU', x0 - 40, y + 30, d(28), S.c); tx(g, 'THEM', x0 + w + 46, y + 30, d(28), '#ff5f6a');
      if (!M.res) { tx(g, 'TAP! TAP! TAP!', 640, 450, d(48 + Math.sin(t * 20) * 3), '#fff'); rr(g, 440, 500, 400, 10, 5, '#1f2a46'); rr(g, 440, 500, 400 * Math.max(0, 1 - M.t / M.lim), 10, 5, '#ffb02e'); }
    }
    if (M.type === 'rings') {
      if (M.ring && !M.res) { const R = M.ring, k = R.t / M.D, outer = 90 * (1 - k) + 30 * k; g.fillStyle = 'rgba(255,210,63,.25)'; g.beginPath(); g.arc(R.x, R.y, 30, 0, TAU); g.fill(); g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.stroke(); g.strokeStyle = k > 1 ? '#ff5f6a' : '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(R.x, R.y, Math.max(2, outer), 0, TAU); g.stroke(); }
      for (let i = 0; i < M.n; i++) { const s = M.hits[i]; g.fillStyle = s == null ? 'rgba(255,255,255,.15)' : s >= 1 ? '#ffd23f' : s > 0 ? '#3ddc84' : '#ff5f6a'; g.beginPath(); g.arc(560 + i * 40, 600, 13, 0, TAU); g.fill(); }
    }
    if (M.type === 'hold') {
      const x0 = 290, w = 700, y = 330, h = 60; rr(g, x0, y, w, h, 30, '#121a2e', 'rgba(255,255,255,.25)', 3);
      rr(g, x0 + (M.zc - M.zw / 2) * w, y + 6, M.zw * w, h - 12, 22, '#3ddc84'); rr(g, x0 + (M.zc - M.zw / 6) * w, y + 6, M.zw / 3 * w, h - 12, 18, '#ffd23f');
      rr(g, x0 + 4, y + 18, Math.max(8, (w - 8) * M.m), h - 36, 12, M.m > M.zc + M.zw / 2 ? '#ff5f6a' : '#fff');
      tx(g, '$', x0 - 30, y + 30, d(40), '#3ddc84'); tx(g, 'WALK AWAY', x0 + w + 64, y + 30, d(22), '#ff5f6a');
      if (!M.res) tx(g, M.holding ? 'LET GO IN THE GREEN!' : 'PRESS AND HOLD', 640, 450, d(40), '#fff');
    }
    if (M.res) { const words = M.ctx.words || { perfect: 'PERFECT!', hit: 'NICE!', miss: 'MISSED!' }, cc = M.res === 'miss' ? '#ff8a8a' : M.res === 'perfect' ? '#ffd23f' : '#3ddc84', s = 1 + Math.max(0, .3 - M.rt) * 1.5; g.save(); g.translate(640, 480); g.scale(s, s); tx(g, words[M.res], 0, 0, d(70), cc); g.restore(); }
    else if (M.type === 'bar' || M.type === 'power' || M.type === 'aim') tx(g, 'TAP · CLICK · SPACE', 640, M.type === 'aim' ? 580 : 470, f(20, 900), `rgba(255,255,255,${.5 + Math.sin(t * 6) * .3})`);
  }
  function drawVerdict(g) {
    const c = career, [, name, col] = c.tier, k = Math.min(1, c.vt / .8), S = SPORTS[sport];
    dim(g, .7);
    g.save(); g.globalAlpha = k;
    card(g, lastRec, 250 + (1 - k) * -200, 330, .95);
    rr(g, 450, 90, 790, 440, 22, '#121a2e', col, 5);
    if (c.legacy >= 420) tx(g, '🎉 INDUCTED INTO THE HALL OF FAME', 845, 128, f(18, 900), col); else tx(g, 'THE VERDICT', 845, 128, d(30), '#9fb0d0');
    tx(g, name.toUpperCase(), 845, 190, d(name.length > 12 ? 60 : 76), col);
    tx(g, c.name, 845, 246, f(24), '#fff'); tx(g, `${c.peak} peak OVR · ${c.seasons.length} seasons · legacy ${c.legacy}`, 845, 280, f(18, 700), '#9fb0d0');
    rr(g, 600, 306, 490, 110, 14, '#0c1222', 'rgba(255,255,255,.12)', 2); tx(g, 'TROPHY CABINET', 845, 324, f(13, 900), '#7a8aa8');
    const items = [['🏆', c.aw.mvp], ['💍', c.aw.champ], ['🎖️', c.aw.fmvp], ['⭐', c.aw.star], ['🥇', c.aw.dpoy], ['🎯', c.aw.skills]];
    items.forEach(([em, v], i) => { const x = 650 + i * 78; g.globalAlpha = k * (v ? 1 : .3); tx(g, em, x, 362, '30px system-ui', '#fff'); tx(g, `×${v}`, x, 396, d(22), v ? '#ffd23f' : '#5a6a8a'); });
    g.globalAlpha = k;
    const nxt = TIERS.find(x => x[0] > c.legacy); tx(g, nxt ? `${nxt[0] - c.legacy} legacy short of ${nxt[1]}` : 'Nobody has ever done better.', 845, 446, f(16, 700), '#ffb02e');
    tx(g, `${c.hl.length} perfect big moment${c.hl.length === 1 ? '' : 's'} · put ${c.name.split(' ')[0]} in the Arena against real players`, 845, 480, f(14, 700), '#9fb0d0');
    g.restore(); g.globalAlpha = 1;
    if (c.vt > 1) {
      button(g, 'arenago', { x: 450, y: 560, w: 260, h: 90 }, 'ARENA', '#ff5fa2', 'Real players\' legends');
      button(g, 'ladgo', { x: 724, y: 560, w: 250, h: 90 }, 'LADDER', '#29e0ff', 'All-time greats');
      button(g, 'again', { x: 988, y: 560, w: 252, h: 90 }, 'NEW LEGEND', '#ffd23f', 'Create another');
      button(g, 'home', { x: 60, y: 600, w: 180, h: 60 }, 'MENU', '#1f2a46', null, '#eef1f8');
    }
  }
  function legendCard(g, r, b, sel, hv) {
    const T = TIERS.find(x => x[1] === r.tier) || TIERS[0], S = SPORTS[r.sport];
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.roundRect(b.x, b.y + 6, b.w, b.h, 16); g.fill();
    rr(g, b.x, b.y, b.w, b.h, 16, sel ? '#26345e' : hv ? '#1f2a4c' : '#162038', sel ? '#ffd23f' : T[2], sel ? 4 : 3);
    g.save(); g.beginPath(); g.roundRect(b.x, b.y, 96, b.h, [16, 0, 0, 16]); g.clip(); g.fillStyle = S.c + '33'; g.fillRect(b.x, b.y, 96, b.h); athlete(g, r.sport, b.x + 46, b.y + 62, .48, r.look || S.c, { acc: accKey(r) }); g.restore();
    tx(g, r.name.length > 15 ? r.name.split(' ')[1] || r.name : r.name, b.x + 106, b.y + 22, f(17, 900), '#fff', 'left');
    tx(g, S.name + (r.daily ? ' · DAILY' : ''), b.x + 106, b.y + 44, f(12, 900), S.c, 'left');
    tx(g, r.tier.toUpperCase(), b.x + 106, b.y + 68, d(22), T[2], 'left');
    tx(g, `${r.O} OVR · ${r.legacy}`, b.x + 106, b.y + 92, f(14, 800), '#cfd8e0', 'left');
    tx(g, r.rating ? `⚔ ${r.rating} · ${r.w || 0}-${r.l || 0}` : `💍${r.aw.champ || 0}  🏆${r.aw.mvp || 0}`, b.x + 106, b.y + 116, f(14, 800), r.rating ? '#ff8ac8' : '#ffd23f', 'left');
    if (r.goat) tx(g, '👑', b.x + b.w - 24, b.y + 24, '26px system-ui', '#fff'); else if (r.ladder) tx(g, `▲${r.ladder}/10`, b.x + b.w - 14, b.y + 22, f(13, 900), '#ff5fa2', 'right');
  }
  function drawHof(g) {
    const L = SAVE(), title = hofPick === 'arena' ? 'PICK A LEGEND FOR THE ARENA' : hofPick ? 'PICK A LEGEND' : 'YOUR HALL OF FAME';
    tx(g, title, 640, 46, d(52), hofPick === 'arena' ? '#ff5fa2' : '#ffb02e');
    tx(g, hofPick === 'arena' ? 'Who will you send against real players\' legends?' : hofPick ? 'Who takes on the all-time greats?' : 'Your best legends. Tap one, then take them into the Arena or up the Ladder.', 640, 84, f(18, 700), '#9fb0d0');
    if (!L.hof.length) tx(g, 'Nobody yet. Go create someone.', 640, 330, f(24), '#9fb0d0');
    L.hof.slice(0, 12).forEach((r, i) => { const b = { x: 60 + (i % 4) * 295, y: 112 + Math.floor(i / 4) * 160, w: 275, h: 140 }; B['card' + i] = b; legendCard(g, r, b, hofSel === i, hover === 'card' + i); });
    const sel = L.hof[hofSel], nm = sel ? (sel.name.split(' ')[1] || sel.name).toUpperCase() : '';
    if (hofPick !== true) button(g, 'arenago', { x: 160, y: 610, w: 340, h: 80 }, sel ? 'ARENA WITH ' + nm : 'PICK A LEGEND', sel ? '#ff5fa2' : '#2a2a3e', sel ? (sel.rating ? `Rating ${sel.rating} · ${sel.w || 0}-${sel.l || 0}` : 'Duel real players') : 'Tap a card above', sel ? '#141414' : '#7a8aa8');
    if (hofPick !== 'arena') button(g, 'ladgo', { x: 520, y: 610, w: 340, h: 80 }, sel ? `LADDER WITH ${nm}` : 'PICK A LEGEND', sel ? '#29e0ff' : '#2a2a3e', sel ? `Best: ${sel.goat ? 'beat them all 👑' : (sel.ladder || 0) + '/10 rungs'}` : 'Tap a card above', sel ? '#141414' : '#7a8aa8');
    button(g, 'home', { x: 880, y: 610, w: 220, h: 80 }, 'BACK', '#1f2a46', null, '#eef1f8');
  }
  function drawLadder(g) {
    const L = ladder, r = L.rec, S = SPORTS[r.sport];
    tx(g, 'LEGENDS LADDER', 640, 46, d(56), '#29e0ff'); tx(g, `${S.name} · beat all ten all-time greats in clutch duels`, 640, 84, f(18, 700), '#9fb0d0');
    legendCard(g, r, { x: 60, y: 130, w: 300, h: 140 }, false, false);
    rr(g, 60, 290, 300, 300, 16, '#121a2e', 'rgba(255,255,255,.1)', 2);
    tx(g, 'HOW IT WORKS', 210, 318, d(24), '#ffb02e');
    g.font = f(15, 700); wrap(g, 'Each duel is best of three clutch moments, a different kind each round. The better your legend is than the opponent, the easier they are. Lose a duel and the climb is over. Coins for every new rung; beat rung 10 for the crown.', 82, 350, 256, 22, '#cfd8e0');
    L.opps.slice().reverse().forEach((o, j) => {
      const i = 9 - j, y = 112 + j * 49, cur = i === L.rung && !L.over, beat = i < L.rung, b = { x: 400, y, w: 820, h: 42 };
      rr(g, b.x, b.y, b.w, b.h, 10, cur ? '#3a2240' : beat ? '#1f3a2e' : '#141c30', cur ? '#ff5fa2' : beat ? '#3ddc84' : 'rgba(255,255,255,.08)', cur ? 3 : 2);
      tx(g, String(i + 1), b.x + 26, y + 21, d(26), cur ? '#ff5fa2' : '#7a8aa8'); tx(g, `"${o.nick}"`, b.x + 60, y + 21, d(24), i === 9 ? '#ffd23f' : '#fff', 'left'); tx(g, o.name, b.x + 330, y + 21, f(15, 700), '#cfd8e0', 'left');
      tx(g, `${o.O} OVR`, b.x + 640, y + 21, d(24), ratingC(o.O)); tx(g, beat ? '✓ BEATEN' : cur ? 'NEXT' : '', b.x + b.w - 20, y + 21, f(14, 900), beat ? '#3ddc84' : '#ff5fa2', 'right');
    });
    if (L.over === 'goat') { tx(g, '👑 THE GREATEST OF ALL TIME 👑', 810, 630, d(40), '#ffd23f'); button(g, 'home', { x: 980, y: 606, w: 240, h: 70 }, 'MENU', '#1f2a46', null, '#eef1f8'); return; }
    if (L.over === 'lost') { tx(g, `Run over at rung ${L.rung + 1}. Best ever: ${L.best}/10.`, 640, 628, f(20, 900), '#ff8a8a'); button(g, 'ladretry', { x: 400, y: 652, w: 360, h: 60 }, 'CLIMB AGAIN', '#ff5fa2'); button(g, 'hof', { x: 780, y: 652, w: 220, h: 60 }, 'OTHER LEGEND', '#1f2a46', null, '#eef1f8'); button(g, 'home', { x: 1020, y: 652, w: 200, h: 60 }, 'MENU', '#1f2a46', null, '#eef1f8'); return; }
    const o = L.opps[L.rung];
    button(g, 'duel', { x: 400, y: 616, w: 560, h: 84 }, `FACE "${o.nick.toUpperCase()}"`, '#ffd23f', `Rung ${L.rung + 1} of 10 · ${o.O} OVR vs your ${r.O}`);
    button(g, 'home', { x: 980, y: 616, w: 240, h: 84 }, 'MENU', '#1f2a46', null, '#eef1f8');
  }
  function drawDuel(g) {
    const L = ladder, D = L.duel, o = L.opps[L.rung], r = L.rec, S = SPORTS[r.sport];
    tx(g, `RUNG ${L.rung + 1} · ROUND ${Math.min(3, D.w + D.l + 1)}`, 640, 46, d(40), '#ffd23f');
    athlete(g, r.sport, 220, 330, 1.25, r.look || S.c, { acc: accKey(r) }); athlete(g, r.sport, 1060, 330, 1.25, o.look, { noAcc: true });
    tx(g, r.name.toUpperCase(), 220, 520, d(34), '#fff'); tx(g, `${r.O} OVR`, 220, 556, d(28), ratingC(r.O));
    tx(g, `"${o.nick.toUpperCase()}"`, 1060, 520, d(34), '#fff'); tx(g, `${o.name} · ${o.O} OVR`, 1060, 556, f(16, 800), '#cfd8e0');
    for (let i = 0; i < 2; i++) { g.fillStyle = i < D.w ? '#3ddc84' : 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(190 + i * 60, 600, 16, 0, 7); g.fill(); g.fillStyle = i < D.l ? '#ff5f6a' : 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(1030 + i * 60, 600, 16, 0, 7); g.fill(); }
    if (D.end) { const won = D.w >= 2; dim(g, .5); tx(g, won ? 'DUEL WON!' : 'DUEL LOST', 640, 340, d(90), won ? '#3ddc84' : '#ff8a8a'); return; }
    if (D.mg) drawMG(g, D.mg);
  }
  function drawArena(g) {
    const A = arena, r = A.rec, S = SPORTS[r.sport];
    tx(g, 'THE ARENA', 640, 44, d(58), '#ff5fa2'); tx(g, 'Real players\' legends. Stat against stat, three rounds, rating on the line.', 640, 84, f(18, 700), '#9fb0d0');
    card(g, r, 210, 360, .82, { ph: 0 });
    tx(g, r.rating ? `RATING ${r.rating}` : 'UNRANKED', 210, 560, d(32), '#ff8ac8'); tx(g, `${r.w || 0} wins · ${r.l || 0} losses`, 210, 592, f(15, 800), '#cfd8e0');
    if (A.away) tx(g, `While you were away: challenged ${A.away.w + A.away.l} times, ${A.away.w}-${A.away.l}`, 210, 620, f(13, 800), '#ffd23f');
    const mid = 640;
    if (A.status === 'publishing' || A.status === 'finding') tx(g, A.status === 'publishing' ? 'Entering the Arena...' : 'Finding an opponent...', mid, 340, d(40), `rgba(255,255,255,${.6 + Math.sin(t * 5) * .3})`);
    if (A.status === 'offline') { tx(g, A.err || 'Offline', mid, 300, f(20, 800), '#ff8a8a'); button(g, 'arenaretry', { x: mid - 150, y: 340, w: 300, h: 70 }, 'TRY AGAIN', '#ff5fa2'); }
    if (A.status === 'empty') { tx(g, 'No other legends here yet!', mid, 280, d(36), '#fff'); g.font = f(17, 700); wrap(g, 'You are one of the first. Your legend is now in the Arena, so other players will face them. Come back later, or try the Legends Ladder.', mid, 320, 420, 24, '#cfd8e0', 'center'); button(g, 'find', { x: mid - 150, y: 420, w: 300, h: 70 }, 'LOOK AGAIN', '#ff5fa2'); }
    if (A.status === 'ready') { button(g, 'find', { x: mid - 180, y: 260, w: 360, h: 110 }, 'FIND OPPONENT', '#ff5fa2', 'A real player\'s legend near your rating'); }
    if (A.status === 'tape' && A.opp) drawTape(g);
    if (A.status === 'result') drawResult(g);
    // the leaderboard
    rr(g, 920, 120, 330, 500, 16, '#121a2e', 'rgba(255,255,255,.12)', 2); tx(g, `TOP ${S.name} LEGENDS`, 1085, 148, d(26), '#ffb02e');
    if (!A.top) tx(g, '...', 1085, 300, d(30), '#5a6a8a'); else if (!A.top.length) tx(g, 'Nobody yet', 1085, 300, f(16), '#5a6a8a');
    else A.top.slice(0, 10).forEach((q, i) => { const y = 186 + i * 42, me = q.id === r.arenaId; rr(g, 932, y - 18, 306, 36, 8, me ? 'rgba(255,95,162,.25)' : 'rgba(255,255,255,.04)'); tx(g, `${i + 1}`, 950, y, d(22), '#7a8aa8'); tx(g, q.name, 972, y, f(15, 800), me ? '#ff8ac8' : '#fff', 'left'); tx(g, `${q.O} · ${q.rating}`, 1228, y, f(14, 900), '#ffd23f', 'right'); });
    if (A.status !== 'tape') button(g, 'home', { x: 1040, y: 636, w: 210, h: 60 }, 'MENU', '#1f2a46', null, '#eef1f8');
    if (A.status === 'ready' || A.status === 'empty' || A.status === 'result') button(g, 'hofa', { x: 820, y: 636, w: 210, h: 60 }, 'OTHER LEGEND', '#1f2a46', null, '#eef1f8');
  }
  function drawTape(g) {
    const A = arena, o = A.opp, r = A.rec, S = SPORTS[r.sport], So = SPORTS[o.sport] || S, k = A.tt;
    rr(g, 400, 116, 500, 520, 16, '#121a2e', '#ff5fa2', 3);
    tx(g, 'TALE OF THE TAPE', 650, 144, d(30), '#ffb02e');
    g.save(); g.beginPath(); g.roundRect(400, 156, 500, 150, 0); g.clip(); athlete(g, o.sport, 540, 236, .62, o.look, { acc: accKey(o) }); athlete(g, r.sport, 760, 236, .62, r.look, { acc: accKey(r) }); g.restore();
    tx(g, o.name.toUpperCase(), 520, 316, d(26), '#fff'); tx(g, `${o.O} OVR · ${So.name} · ${o.rating}`, 520, 340, f(12, 900), '#ff8ac8'); tx(g, 'VS', 650, 230, d(40), '#ffd23f');
    tx(g, 'YOU', 790, 316, d(26), '#fff'); tx(g, `${r.O} OVR`, 790, 340, f(12, 900), '#ff8ac8');
    let mine = 0, theirs = 0;
    S.at.forEach((a, i) => { const y = 380 + i * 34, show = k > .4 + i * .3; if (!show) return; const m = (r.r || [])[i] || r.O, th = (o.r || [])[i] || o.O; if (m > th) mine++; else if (th > m) theirs++;
      tx(g, String(th), 470, y, d(28), th > m ? '#ffd23f' : '#7a8aa8'); tx(g, a.toUpperCase() + (o.sport !== r.sport ? ' / ' + So.at[i].slice(0, 8).toUpperCase() : ''), 650, y, f(12, 900), '#9fb0d0'); tx(g, String(m), 830, y, d(28), m > th ? '#3ddc84' : '#7a8aa8'); });
    if (k > 2.4) { tx(g, `${mine} - ${theirs}`, 650, 596, d(30), mine >= theirs ? '#3ddc84' : '#ff8a8a'); button(g, 'fight', { x: 520, y: 640, w: 260, h: 64 }, 'FIGHT ▶', '#ffd23f'); button(g, 'find', { x: 400, y: 640, w: 110, h: 64 }, 'SKIP', '#1f2a46', null, '#eef1f8'); }
  }
  function drawResult(g) {
    const A = arena, B2 = A.battle, o = A.opp;
    rr(g, 400, 140, 500, 470, 16, '#121a2e', A.won ? '#3ddc84' : '#ff5f6a', 4);
    tx(g, A.won ? 'VICTORY!' : 'DEFEAT', 650, 200, d(80), A.won ? '#3ddc84' : '#ff8a8a');
    tx(g, `vs ${o.name} · ${B2.me}-${B2.them}`, 650, 256, f(20, 800), '#fff');
    B2.log.forEach((L2, i) => tx(g, `Round ${i + 1}: you ${L2.my}, them ${L2.their}  ${L2.won ? '✓' : '✗'}`, 650, 300 + i * 30, f(16, 800), L2.won ? '#bff5d6' : '#ffb0b0'));
    tx(g, A.delta == null ? 'Saving...' : A.delta === 'x' ? 'Could not save the result (offline).' : `Rating ${A.delta >= 0 ? '+' : ''}${A.delta} → ${A.rec.rating}`, 650, 410, d(34), A.delta > 0 ? '#ffd23f' : '#cfd8e0');
    if (A.won) tx(g, '+4 coins', 650, 446, f(16, 800), '#ffd23f');
    button(g, 'find', { x: 470, y: 500, w: 360, h: 84 }, 'NEXT OPPONENT', '#ff5fa2');
  }
  function drawBattle(g) {
    const A = arena, B2 = A.battle, r = A.rec, o = A.opp, L2 = B2.log[B2.log.length - 1], since = B2.show != null ? B2.show : 9, ent = clamp((t - (B2.t0 ?? (B2.t0 = t))) / .6, 0, 1), over = B2.me >= 2 || B2.them >= 2;
    tx(g, `${r.name.toUpperCase()}  vs  ${o.name.toUpperCase()}`, 640, 40, d(36), '#ff5fa2');
    const hitMe = L2 && !L2.won && since < .5, hitThem = L2 && L2.won && since < .5, sh = k => k ? (R0() - .5) * 16 * (.5 - since) : 0;
    const winBig = (me) => over && (me ? B2.me >= 2 : B2.them >= 2) ? 1.12 + Math.sin(t * 3) * .02 : 1;
    card(g, { ...r, tier: '' }, lp(-200, 250, ent) + sh(hitMe), 330 + sh(hitMe), .92 * winBig(true), { ph: 0, glow: L2 && L2.won && since < 1.2 ? '#3ddc84' : null, crack: B2.them >= 2 });
    card(g, { ...o, tier: '' }, lp(1480, 1030, ent) + sh(hitThem), 330 + sh(hitThem), .92 * winBig(false), { ph: .7, glow: L2 && !L2.won && since < 1.2 ? '#ff5f6a' : null, crack: B2.me >= 2 });
    for (let i = 0; i < 2; i++) { g.fillStyle = i < B2.me ? '#3ddc84' : 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(220 + i * 60, 620, 16, 0, 7); g.fill(); g.fillStyle = i < B2.them ? '#ff5f6a' : 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(1000 + i * 60, 620, 16, 0, 7); g.fill(); }
    // the stat being fought over, with a lightning VS between the cards
    if (B2.mine != null && !over) { const i = B2.idx[B2.round] ?? B2.idx[B2.idx.length - 1], nm = SPORTS[r.sport].at[i] || '';
      tx(g, nm.toUpperCase(), 640, 150, d(30), '#9fb0d0'); tx(g, String(B2.mine), 560, 220, d(70), ratingC(B2.mine)); tx(g, String(B2.theirs), 720, 220, d(70), ratingC(B2.theirs));
      g.strokeStyle = `rgba(255,${(200 + Math.sin(t * 20) * 55) | 0},80,.9)`; g.lineWidth = 4; g.beginPath(); g.moveTo(640, 170); for (let k = 1; k <= 6; k++) g.lineTo(640 + (k % 2 ? 10 : -10) + (R0() - .5) * 6, 170 + k * 18); g.stroke(); tx(g, 'VS', 640, 300, d(54), '#ffd23f', 'center', 6); }
    if (B2.mg) return drawMG(g, B2.mg);
    if (L2 && !over) { dim(g, .35); tx(g, `YOU: ${L2.my.toUpperCase()}`, 640, 330, d(40), L2.my === 'miss' ? '#ff8a8a' : '#3ddc84'); tx(g, `THEM: ${L2.their.toUpperCase()}`, 640, 380, d(40), L2.their === 'miss' ? '#7a8aa8' : '#ff8a8a'); const s2 = 1 + Math.max(0, .3 - since) * 2; g.save(); g.translate(640, 460); g.scale(s2, s2); tx(g, L2.won ? 'ROUND TO YOU!' : 'ROUND TO THEM', 0, 0, d(60), L2.won ? '#ffd23f' : '#ff5f6a', 'center', 6); g.restore(); }
    if (over) { const s2 = 1 + Math.max(0, .3 - since) * 2; g.save(); g.translate(640, 220); g.scale(s2, s2); tx(g, B2.me >= 2 ? 'YOUR CARD WINS!' : 'THEIR CARD WINS', 0, 0, d(64), B2.me >= 2 ? '#ffd23f' : '#ff5f6a', 'center', 8); g.restore(); }
  }


  /* ---------- kit hooks ---------- */
  GAME.reset = () => { mode = 'home'; build = null; career = null; reel = null; msg = null; posed = false; rng = R0; ladder = null; arena = null; hofSel = -1; hofPick = false; nameInput(false); quests(); if (K.bot) { newBuild(pick(Object.keys(SPORTS)), false); build.name = pick(FN) + ' ' + pick(LN); build.demo = 0; } };
  GAME.update = dt => {
    t += dt; if (msg && (msg.k += dt) > 3.5) msg = null;
    if (mode === 'create' && build && build.step === 'card' && build.revealT != null && build.revealT > 0) {
      const e = t - build.revealT, O = ovr(), q = qualOf(O), Q = QUAL[q];
      if (e < 1.1 && (build.revTick = (build.revTick || 0) - dt) <= 0) { build.revTick = .2 - e * .14; K.sfx(300 + e * 500, .04, 'square', .03); }
      if (e >= 1.1 && !build.revFlip) { build.revFlip = true; K.shake(q === 'icon' ? 12 : q === 'star' ? 8 : 5); K.noise(.3, .2, 1800); K.burst(400, 370, q === 'icon' ? ['#ff5fa2', '#29e0ff', '#3ddc84', '#ffd23f', '#fff'] : [Q[1], '#fff', SPORTS[sport].c], q === 'icon' ? 140 : q === 'star' ? 90 : 50, 700); }
      if (e >= 2 && !build.revSlam) { build.revSlam = true; K.shake(q === 'icon' ? 10 : 6); K.sfx(110, .3, 'sawtooth', .07, -40); K.chime(q === 'icon' ? 659 : q === 'star' ? 587 : 523, q === 'icon' || q === 'star' ? [0, 4, 7, 12, 16, 19] : [0, 4, 7, 12]); K.burst(870, 112, [Q[1], '#fff'], 40, 400); }
    }
    if (reel) {
      const was = reel.t < reel.end; reel.t += dt; reel.tick -= dt; const row = Math.floor(reelPos(reel) + .5);
      if (row !== reel.row && reel.tick <= 0) { reel.row = row; reel.tick = .045; K.sfx(700 + (row / reel.W) * 500, .025, 'square', .035); }
      if (was && reel.t >= reel.end) { K.sfx(980, .08, 'square', .06); K.shake(3); }
      if (reel.t >= reel.T + .15) { build.pro = reel.pro; reel = null; const [rn] = rarity(build.pro); K.sfx(660, .12, 'triangle', .08); if (rn === 'GOAT PULL' || rn === 'ICON PULL') { const goat = rn === 'GOAT PULL'; build.pullFx = { t0: t, goat }; K.chime(goat ? 659 : 587, [0, 4, 7, 12, 16, 19, 24]); K.sfx(220, .9, 'sawtooth', .05, 900); K.burst(640, 360, goat ? ['#ff5fa2', '#29e0ff', '#3ddc84', '#ffd23f', '#fff'] : ['#ffd23f', '#fff', '#ffb02e'], goat ? 160 : 110, 900); K.shake(goat ? 14 : 10); setTimeout(() => K.burst(640, 360, ['#ffd23f', '#fff'], 80, 700), 350); } else if (rn === 'STAR') { K.chime(784, [0, 4, 7, 12]); K.burst(835, 260, ['#ffd23f', '#fff', '#ff5fa2'], 30, 420); K.shake(6); } if (build.vs) build.vs.clock = 10; }
    }
    nameInput(mode === 'create' && build && build.step === 'look' && !K.bot && !posed);
    if (mode === 'create' && build.vs && build.pro && (build.vs.clock -= dt) <= 0) { const S = SPORTS[sport], open = build.slots.map((s, i) => s ? -1 : build.pro.r[i] * S.w[i]); place(open.indexOf(Math.max(...open))); msg = { t: 'Shot clock! Your pick was made for you.', k: 0 }; }
    if (mode === 'career' && career) {
      const c = career; c.t += dt; fastStep();
      if (c.mg && mgUpdate(c.mg, dt)) { if (c.phase === 'camp') campDone(); else if (c.phase === 'moment') momentDone(); else if (c.phase === 'finals') finalsDone(); else if (c.phase === 'event') eventDone(); }
      if (c.phase === 'show' && c.t > (c.fast ? .25 : 1.1)) afterShow();
    }
    if (mode === 'duel' && ladder && ladder.duel) {
      const D = ladder.duel;
      if (D.end) { if ((D.end += dt) > 1.6) duelDone(); }
      else if (D.mg && mgUpdate(D.mg, dt)) { if (D.mg.res === 'miss') D.l++; else D.w++; D.mg = null; if (D.w >= 2 || D.l >= 2) D.end = .001; else newDuelRound(); }
    }
    if (mode === 'battle' && arena && arena.battle) {
      const B2 = arena.battle;
      if (B2.mg) { if (mgUpdate(B2.mg, dt)) battleRoundDone(); }
      else if ((B2.show += dt) > (B2.me >= 2 || B2.them >= 2 ? 2.6 : 1.6)) { if (B2.me >= 2 || B2.them >= 2) battleOver(); else { B2.round++; battleRound(); } }
    }
    if (mode === 'arena' && arena && arena.status === 'tape') arena.tt += dt;
    if (mode === 'verdict') career.vt += dt;
  };
  GAME.draw = g => {
    for (const k in B) delete B[k];
    bg(g);
    if (mode === 'home') drawHome(g);
    else if (mode === 'create' || mode === 'ready') { if (build.step === 'look' && mode === 'create') drawLook(g); else if (build.step === 'trait') drawTrait(g); else if (build.step === 'card') drawCardReveal(g); else drawDraft(g); if (build.pullFx && t - build.pullFx.t0 < 2.6) drawPullFx(g); }
    else if (mode === 'career') drawCareer(g); else if (mode === 'verdict') { drawCareer(g); drawVerdict(g); }
    else if (mode === 'hof') drawHof(g); else if (mode === 'ladder') drawLadder(g); else if (mode === 'duel') drawDuel(g); else if (mode === 'arena') drawArena(g); else if (mode === 'battle') drawBattle(g);
    if (msg) { const a = Math.min(1, msg.k * 4, (3.5 - msg.k) * 2); g.globalAlpha = Math.max(0, a); rr(g, 340, 8, 600, 44, 12, '#1f4a34', '#3ddc84', 2); tx(g, msg.t, 640, 30, f(18), '#bff5d6'); g.globalAlpha = 1; }
  };
  const anyMG = () => (mode === 'career' && career && career.mg) || (mode === 'duel' && ladder && ladder.duel && ladder.duel.mg) || (mode === 'battle' && arena && arena.battle && arena.battle.mg) || null;
  function click(k, x, y) {
    if (!k) return;
    const L = SAVE();
    if (k.startsWith('sp') && SPORTS[k.slice(2)]) { sport = k.slice(2); K.sfx(600, .05, 'square', .05); return; }
    if (k === 'play') { newBuild(sport, false); return; }
    if (k === 'daily') { newBuild(sport, true); return; }
    if (k === 'vs') { newBuild(sport, false); build.step = 'draft'; build.vs = { cpu: Array(6).fill(null), clock: 10 }; build.rerolls = 1; return; }
    // the creator
    if (mode === 'create' && build.step === 'look') {
      const Lk = build.look, n = s => +k.slice(s);
      if (k.startsWith('csp')) { sport = k.slice(3); K.sfx(600, .05, 'square', .05); return; }
      if (k === 'dice') { build.name = pick(FN) + ' ' + pick(LN); if (nameEl) nameEl.value = build.name; K.sfx(700, .05, 'triangle', .05); return; }
      if (k.startsWith('skin')) Lk.skin = n(4); else if (k.startsWith('hair')) Lk.hair = n(4); else if (k.startsWith('hc')) Lk.hc = n(2); else if (k.startsWith('c1')) Lk.c1 = n(2); else if (k.startsWith('c2')) Lk.c2 = n(2); else if (k.startsWith('bld')) Lk.build = n(3);
      else if (k === 'numUp') Lk.num = (Lk.num + 1) % 100; else if (k === 'numDn') Lk.num = (Lk.num + 99) % 100;
      else if (k === 'tolook2') { if (!build.name.trim()) build.name = pick(FN) + ' ' + pick(LN); build.step = 'draft'; nameInput(false); K.sfx(660, .08, 'triangle', .06); return; }
      else if (k === 'home') { mode = 'home'; build = null; nameInput(false); return; }
      K.sfx(560 + Math.random() * 200, .04, 'triangle', .04); return;
    }
    if (k.startsWith('tr') && build && build.step === 'trait') { build.trait = TRAITS[+k.slice(2)].k; K.sfx(700, .06, 'triangle', .06); return; }
    if (k === 'card' && build && build.trait) { build.step = 'card'; build.revealT = t; build.revFlip = build.revSlam = false; K.sfx(200, .5, 'sawtooth', .04, 600); return; }
    if (k === 'relook') { build.step = 'look'; return; }
    if (k === 'spin' && mode === 'create') return spin();
    if (k === 'vsdone' && mode === 'ready') { const w = ovr() > cpuOvr(); if (w) { L.vsW = (L.vsW || 0) + 1; K.coin(5); } streak(); K.persist(); K.add(ovr()); return K.over({ title: w ? 'You win the draft!' : ovr() === cpuOvr() ? 'A tie' : 'The CPU wins', text: `${build.name} ${ovr()} overall vs the CPU's ${cpuOvr()}. Draft wins: ${L.vsW || 0}.`, delay: 50 }); }
    if (k === 'hof' || k === 'ladder' || k === 'arena' || k === 'hofa') { hofPick = k === 'ladder' ? true : k === 'arena' || k === 'hofa' ? 'arena' : false; hofSel = L.hof.length ? (hofSel >= 0 && hofSel < L.hof.length ? hofSel : 0) : -1; mode = 'hof'; arena = null; if (!L.hof.length && k !== 'hof') msg = { t: 'Create and retire a legend first.', k: 0 }; return; }
    if (k.startsWith('card') && mode === 'hof') { hofSel = +k.slice(4); K.sfx(700, .04, 'triangle', .05); return; }
    if (k === 'ladgo') { const rec = mode === 'verdict' ? lastRec : L.hof[hofSel]; if (rec) startLadder(rec); return; }
    if (k === 'arenago') { const rec = mode === 'verdict' ? lastRec : L.hof[hofSel]; if (rec) openArena(rec); return; }
    if (k === 'arenaretry' && arena) return openArena(arena.rec);
    if (k === 'find' && arena) return findOpp();
    if (k === 'fight' && arena && arena.opp) return startBattle();
    if (k === 'duel') return startDuel();
    if (k === 'ladretry') { ladder.rung = 0; ladder.over = false; return startDuel(); }
    if (k === 'mg') { const M = anyMG(); if (M) mgTap(M, x, y); return; }
    if (k.startsWith('camp') && mode === 'career') return campPick(+k.slice(4));
    if (k === 'retire' || k === 'more') return retireChoice(k === 'more');
    if (k === 'fast') return fastSim();
    if (k.startsWith('slot') && mode === 'create') return place(+k.slice(4));
    if (k === 'reroll' && mode === 'create') return reroll();
    if (k === 'sim' && build && build.step === 'card') return startCareer();
    if (k === 'verdict' && career.done) return finishCareer();
    if (k === 'again') { const c = career; return K.over({ title: c.tier[1], text: `${c.name}, ${c.peak} overall: ${c.seasons.length} seasons and a legacy of ${c.legacy}. ${c.legacy >= 420 ? 'Welcome to the Hall of Fame.' : 'Create again, build better.'}`, delay: 50 }); }
    if (k === 'home') { mode = 'home'; build = null; career = null; ladder = null; arena = null; hofPick = false; nameInput(false); return; }
  }
  const skip = () => { if (reel && reel.t < reel.end - .5) reel.t = reel.end - .5; };
  // whatever is on screen this frame can be clicked; a mini-game takes every tap
  const live = () => anyMG() ? ['mg'] : Object.keys(B).filter(k => k !== 'mg');
  GAME.down = (x, y) => { K.audio && K.audio(); if (reel && mode === 'create') return skip(); const k = live().find(q => hitR(B[q], x, y)); click(k, x, y); };
  GAME.up = () => { const M = anyMG(); if (M) mgRelease(M); };
  GAME.move = (x, y) => { hover = live().find(k => hitR(B[k], x, y)) || null; const c = document.getElementById('cv'); if (c) c.style.cursor = hover ? 'pointer' : 'default'; };
  GAME.key = (c, dn) => {
    const M = anyMG();
    if (M) {
      if (!dn) { if (c === 'Space' || c === 'Enter') mgRelease(M); return; }
      const a = { ArrowUp: 'up', KeyW: 'up', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left' }[c];
      if (a && M.type === 'combo') return mgKey(M, a);
      if (c === 'Space' || c === 'Enter') return mgTap(M, M.type === 'rings' && M.ring ? M.ring.x : null, M.type === 'rings' && M.ring ? M.ring.y : null);
      return;
    }
    if (!dn) return; const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5 }[c];
    if (mode === 'career' && career.phase === 'camp' && n != null) return campPick(n);
    if (n != null && mode === 'create' && build.step === 'draft') return place(n);
    if (n != null && mode === 'create' && build.step === 'trait') return click('tr' + n);
    if (c === 'KeyR' && mode === 'create') return reroll();
    if ((c === 'Space' || c === 'Enter') && mode === 'create' && build.step === 'draft' && reel) return skip();
    if ((c === 'Space' || c === 'Enter') && mode === 'create' && build.step === 'draft' && !build.pro && !reel) return spin();
    if (c === 'Space' || c === 'Enter') { if (mode === 'home') return click('play'); if (mode === 'create' && build.step === 'card') return click('sim'); if (mode === 'create' && build.step === 'trait') return click('card'); if (mode === 'career' && career.done) return click('verdict'); if (mode === 'verdict' && career.vt > 1) return click('again'); if (mode === 'ladder' && !ladder.over) return click('duel'); }
  };
  // the attract demo: drafts, picks a trait, then plays the career (fast)
  GAME.bot = dt => {
    const M = anyMG(); if (M) return mgBot(M, .75);
    if (reel && reel.t < reel.end - .5) return skip();
    if ((botT -= dt) > 0) return; botT = .35;
    if (mode === 'home') { newBuild(pick(Object.keys(SPORTS)), false); build.name = pick(FN) + ' ' + pick(LN); build.demo = 0; return; }
    if (mode === 'create' && build.step === 'look') {   // the demo tries on a few looks first
      const L = build.look, k = (build.demo = (build.demo || 0) + 1) % 5; botT = .3;
      if (k === 0) L.hair = Math.floor(R0() * 8); else if (k === 1) L.c1 = Math.floor(R0() * 12); else if (k === 2) L.skin = Math.floor(R0() * 6); else if (k === 3) L.hc = Math.floor(R0() * 6); else L.num = Math.floor(R0() * 100);
      if (build.demo > 9) build.step = 'draft'; return;
    }
    if (mode === 'create' && build.step === 'draft' && !build.pro && !reel) return spin();
    if (mode === 'create' && build.pro) { const S = SPORTS[sport], open = build.slots.map((s, i) => s ? -1 : build.pro.r[i] * S.w[i]); const best = open.indexOf(Math.max(...open)); if (build.rerolls && Math.max(...build.pro.r.filter((_, i) => !build.slots[i])) < 70 && R0() < .7) return reroll(); return place(best); }
    if (mode === 'create' && build.step === 'trait') { build.trait = pick(TRAITS).k; build.step = 'card'; build.revealT = t; return; }
    if (mode === 'create' && build.step === 'card') { if (t - build.revealT < 2.8) return; return startCareer(); }
    if (mode === 'career' && career.phase === 'camp' && !career.mg && career.t > .6) { const S = SPORTS[sport], v = career.v; let bi = 0; v.forEach((x, i) => { if ((99 - x) * S.w[i] > (99 - v[bi]) * S.w[bi]) bi = i; }); return campPick(bi); }
    if (mode === 'career' && career.phase === 'retire') return retireChoice(R0() < .3);
    if (mode === 'career' && career.done) { botT = 1.5; return finishCareer(); }
    if (mode === 'verdict' && career.vt > 2.5) { mode = 'home'; build = null; career = null; }
  };
  GAME.pose = () => { posed = true; newBuild('hoops', false); build.step = 'card'; build.revealT = -10; build.name = 'Marcus Okafor'; build.look = { skin: 3, hair: 2, hc: 0, c1: 8, c2: 2, build: 1, num: 23 }; build.trait = 'clutch'; build.slots = [97, 88, 84, 81, 79, 95].map(v => ({ v, who: '' })); };
  GAME.test = {
    st: () => ({ mode, sport, step: build && build.step, slots: build && build.slots.map(s => s && s.v), pro: build && build.pro && build.pro.r, ovr: build && ovr(), look: build && build.look, name: build && build.name,
      career: career && { n: career.seasons.length, phase: career.phase, legacy: career.legacy, tier: career.tier && career.tier[1], aw: career.aw, age: career.age, O: career.O, v: career.v, mg: career.mg && { type: career.mg.type, res: career.mg.res }, hl: career.hl.length, fast: career.fast },
      ladder: ladder && { rung: ladder.rung, over: ladder.over, duel: ladder.duel && { w: ladder.duel.w, l: ladder.duel.l } },
      arena: arena && { status: arena.status, opp: arena.opp && arena.opp.name, rating: arena.rec.rating, battle: arena.battle && { me: arena.battle.me, them: arena.battle.them, round: arena.battle.round }, delta: arena.delta, top: arena.top && arena.top.length } }),
    battleTest: (me, opp) => { arena = { rec: me, opp, status: 'tape', top: null, away: null, err: null }; startBattle(); },
    reveal: () => { build.revealT = t; build.revFlip = build.revSlam = false; }, pull: goat => { build.pullFx = { t0: t, goat }; },
    cardSheet: () => { const c = document.createElement('canvas'); c.width = 1500; c.height = 440; const g = c.getContext('2d'); g.fillStyle = '#0a0e1c'; g.fillRect(0, 0, 1500, 440); [64, 76, 85, 91, 97].forEach((O, i) => card(g, { name: ['Dale Rook', 'Ivo Brandt', 'Marcus Okafor', 'Teo Vance', 'Ajax Moreau'][i], sport: 'hoops', look: { skin: i % 4, hair: i, hc: i % 3, c1: 2 + i * 2, c2: 9 - i, build: 1, num: 7 + i * 11 }, r: [O - 6, O + 2, Math.min(99, O + 4), O - 3, O === 97 ? 99 : O, O - 8], O, trait: 'clutch', tier: '' }, 150 + i * 300, 220, 1, { ph: i * .3 })); return c.toDataURL(); },
    click, place, newBuild, save: SAVE, mg: anyMG, mgBot, mgTap, mgKey, mgRelease, ff: () => { if (reel) { build.pro = reel.pro; reel = null; } }, B: () => Object.keys(B), startCareer, openArena, career: () => career,
  };
})();
