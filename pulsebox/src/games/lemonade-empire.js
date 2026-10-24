/* Lemonade Empire: an idle tycoon. Squeeze the big lemon, buy businesses, hire managers to run them, buy upgrades,
   catch golden customers and franchise for Golden Lemons that boost every business forever. The town on the left
   grows with your empire. Progress is saved (K.save.ty), and managers keep earning while you're away. */
const GAME = {
  id: 'lemonade-empire', title: 'Lemonade Empire', tagline: 'From one lemonade stand to a soda empire.',
  font: 'Fredoka One', accent: '#ffd23f', accent2: '#5fd36a', bg: '#7fd3ff', noHud: true, scoreLabel: 'Golden Lemons',
  how: ['Tap the big lemon (or press Space) to squeeze it for cash.', 'Buy businesses (keys 1 to 7), tap them to sell, and hire managers to run them for you.', 'Catch golden customers, buy upgrades, win trophies, then franchise for Golden Lemons.'],
  skins: [
    { name: 'Sunny', price: 0, c: ['#ffd23f', '#ff6b6b'] }, { name: 'Mint', price: 60, c: ['#7dffb0', '#2ab06a'] }, { name: 'Berry', price: 150, c: ['#ff7ae0', '#a23bff'] },
    { name: 'Ocean', price: 250, c: ['#7cc8ff', '#2a6ad2'] }, { name: 'Sunset', price: 400, c: ['#ffb347', '#ff4d6a'] }, { name: 'Royal', price: 700, c: ['#ffe36e', '#7a2bd6'] },
  ],
};
(() => {
  const F = '"Fredoka One", "Fredoka", "Arial Rounded MT Bold", sans-serif', fnt = s => s + 'px ' + F;
  const BIZ = [
    { n: 'Lemonade Stand', cost: 4, rev: 1, t: .7, cup: '#ffe14d' },
    { n: 'Juice Cart', cost: 60, rev: 60, t: 3, cup: '#ff9f3a' },
    { n: 'Smoothie Bar', cost: 720, rev: 540, t: 6, cup: '#ff6fa8' },
    { n: 'Soda Truck', cost: 8640, rev: 4320, t: 12 },
    { n: 'Bottling Plant', cost: 103680, rev: 51840, t: 24 },
    { n: 'Soda Factory', cost: 1244160, rev: 622080, t: 96 },
    { n: 'Global Brand', cost: 14929920, rev: 7464960, t: 384 },
  ];
  const MGR = BIZ.map((b, i) => b.cost * (i === 0 ? 250 : 120));
  const MILES = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000], FAST = [25, 50, 100];
  const UN = [['Fresh Lemons', 'Crushed Ice', 'Pink Lemonade'], ['Shiny Wheels', 'Turbo Blender', 'Tropical Mix'], ['Neon Sign', 'Frozen Yogurt', 'Secret Recipe'], ['Jingle Horn', 'Turbo Engine', 'Route Planner'], ['Conveyor 2.0', 'Robot Arms', 'Glass Works'], ['Fizz Formula', 'Mega Vats', 'Night Shift'], ['TV Ads', 'Space Billboard', 'Moon Franchise']];
  // upgrade ids are their index here and are saved, so only ever append
  const UPG = [];
  BIZ.forEach((b, i) => UN[i].forEach((n, k) => UPG.push({ n, b: i, x: 3, cost: b.cost * 2500 * Math.pow(1500, k), d: `${b.n} profit ×3` })));
  [['Lemon Mascot', 2.5e5], ['Viral Jingle', 5e8], ['Lemon Lobby', 1e12], ['Citrus Empire', 5e15]].forEach(([n, c]) => UPG.push({ n, b: -1, x: 3, cost: c, d: 'Every business ×3' }));
  [['Strong Grip', 500, .06], ['Juicer Glove', 5e4, .1], ['Golden Press', 5e6, .2]].forEach(([n, c, p]) => UPG.push({ n, b: -2, tap: p, cost: c, d: `Squeeze +${p * 100}% of income/sec` }));
  const own = i => S.own[i], st = k => S.st[k] || 0, mgrs = () => S.mgr.filter(Boolean).length;
  // trophies: [name, description, value, target, coins]. Saved by index, so only append.
  const ACH = [
    ['First Squeeze', 'Squeeze the big lemon', () => st('taps'), 1, 1], ['Squeeze Machine', 'Squeeze 500 times', () => st('taps'), 500, 3], ['Lemon Crusher', 'Squeeze 5,000 times', () => st('taps'), 5000, 6],
    ['Corner Shop', 'Own 25 Lemonade Stands', () => own(0), 25, 2], ['Stand Army', 'Own 100 Lemonade Stands', () => own(0), 100, 5], ['On a Roll', 'Own 25 Juice Carts', () => own(1), 25, 2],
    ['Smooth Operator', 'Own 25 Smoothie Bars', () => own(2), 25, 3], ['Fleet', 'Own 25 Soda Trucks', () => own(3), 25, 3], ['Bottled Up', 'Open a Bottling Plant', () => own(4), 1, 2],
    ['Smokestacks', 'Open a Soda Factory', () => own(5), 1, 3], ['Worldwide', 'Launch a Global Brand', () => own(6), 1, 5], ['Hands Off', 'Hire your first manager', mgrs, 1, 2],
    ['Full Staff', 'Hire all 7 managers', mgrs, 7, 8], ['Millionaire', 'Earn $1M in total', () => st('life'), 1e6, 2], ['Billionaire', 'Earn $1B in total', () => st('life'), 1e9, 4],
    ['Trillionaire', 'Earn $1T in total', () => st('life'), 1e12, 8], ['Lemon Lord', 'Earn $1Qa in total', () => st('life'), 1e15, 12], ['Franchisor', 'Franchise once', () => S.runs || 0, 1, 5],
    ['Chain Store', 'Franchise 5 times', () => S.runs || 0, 5, 10], ['Golden Grove', 'Own 25 Golden Lemons', () => S.gold, 25, 8], ['Golden Touch', 'Catch a golden customer', () => st('gc'), 1, 2],
    ['Gold Rush', 'Catch 10 golden customers', () => st('gc'), 10, 5], ['Heat Seeker', 'Sell through 3 heatwaves', () => st('hw'), 3, 3], ['Star Power', 'Host a celebrity visit', () => st('celeb'), 1, 3],
    ['Lemon Rain', 'Catch 50 falling lemons', () => st('rain'), 50, 3], ['Shopaholic', 'Buy 10 upgrades', () => st('upg'), 10, 4], ['Regular', 'Daily gift 3 days in a row', () => S.streak || 0, 3, 3],
    ['Devoted', 'Daily gift 7 days in a row', () => S.streak || 0, 7, 8],
  ];
  const TUT = [
    ['Tap the big lemon to squeeze it!', () => S.cash >= costOf(0, 1) || own(0) > 1],
    ['Buy a second Lemonade Stand', () => own(0) > 1],
    ['Tap your stand to sell lemonade', () => st('runs') >= 3 || mgrs()],
    ['Save up and buy a Juice Cart', () => own(1) > 0],
    ['Hire a manager: they sell for you', () => mgrs() > 0],
  ];
  const fmt = n => {
    if (n < 1000) return n < 10 ? (Math.round(n * 100) / 100).toString() : Math.floor(n).toString();
    const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']; let i = -1; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
    return (Math.floor(n * (n < 10 ? 100 : n < 100 ? 10 : 1)) / (n < 10 ? 100 : n < 100 ? 10 : 1)).toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + u[i];
  };
  const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
  let S, prog, cache, shown, buyN, tab, page, focus, hover, saveT, away, ev, evT, achT, combo, comboT, tapS, hint, frConfirm, banners, pops, bills, peeps, queues, cars, puffs, rainL, clouds, spawnT, lastPop, acc, chingT, juice, lemonRot, celebP, newAch, shift, bump, carT;
  const fresh = () => ({ cash: 0, total: 0, own: BIZ.map((_, i) => i === 0 ? 1 : 0), mgr: BIZ.map(() => false), gold: 0, goldEarned: 0, boost: 0, t: Date.now(), runs: 0, upg: [], ach: {}, st: {}, day: 0, streak: 0, tut: 0 });
  function recalc() {
    const m = BIZ.map(() => 1); let tap = .04;
    for (const u of S.upg) { const U = UPG[u]; if (!U) continue; if (U.b >= 0) m[U.b] *= U.x; else if (U.b === -1) for (let i = 0; i < 7; i++) m[i] *= U.x; else tap += U.tap; }
    cache = { m, tap, ach: 1 + Object.keys(S.ach).length * .02 };
  }
  const mult = i => { let m = cache.m[i]; for (const ms of MILES) if (S.own[i] >= ms) m *= 2; return m * (1 + S.gold * .1) * cache.ach * (S.boost > 0 ? 2 : 1) * (ev && ev.k === 'celeb' ? 3 : 1); };
  const speed = i => Math.pow(.5, FAST.filter(ms => S.own[i] >= ms).length) * (ev && ev.k === 'heat' ? .5 : 1);
  const cycle = i => BIZ[i].t * speed(i);
  const revenue = i => BIZ[i].rev * S.own[i] * mult(i);
  const costOf = (i, n) => BIZ[i].cost * Math.pow(1.15, S.own[i]) * (Math.pow(1.15, n) - 1) / .15;
  const maxBuy = i => { const c0 = BIZ[i].cost * Math.pow(1.15, S.own[i]); let n = Math.floor(Math.log(S.cash * .15 / c0 + 1) / Math.log(1.15)); n = Math.min(5000, Math.max(0, n)); while (n > 0 && costOf(i, n) > S.cash) n--; return n; };
  const buyCount = i => buyN === 'max' ? Math.max(1, maxBuy(i)) : buyN;
  const perSec = () => { let s = 0; for (let i = 0; i < 7; i++) if (S.mgr[i] && S.own[i]) s += revenue(i) / cycle(i); return s; };
  const tapValue = () => Math.max(1, S.own[0] * mult(0) * .5 + perSec() * cache.tap) * (1 + Math.min(combo, 40) / 40);
  const goldFor = () => Math.floor(Math.sqrt(S.total / 1e8));
  const unlocked = i => i === 0 || S.own[i] > 0 || S.own[i - 1] > 0;
  const giftReady = () => S.tut >= TUT.length && S.day !== today();

  /* ---------- layout ---------- */
  const PX = 724, PANEL = { x: PX, y: 10, w: 544, h: 652 };
  const TAB = i => ({ x: PX + 8 + i * 133, y: 18, w: 129, h: 46 });
  const ROW = i => ({ x: PX + 10, y: 116 + i * 77, w: 524, h: 71 });
  const BUYB = r => ({ x: r.x + r.w - 128, y: r.y + 8, w: 120, h: 55 }), MGRB = r => ({ x: r.x + r.w - 226, y: r.y + 8, w: 92, h: 55 });
  const BUYN = { x: PX + 10, y: 74, w: 128, h: 34 }, PGL = { x: PX + 418, y: 74, w: 54, h: 34 }, PGR = { x: PX + 480, y: 74, w: 54, h: 34 };
  const FRB = { x: PX + 92, y: 430, w: 360, h: 74 };
  const LEMON = { x: 150, y: 262, r: 78 };
  const CASH = { x: 64, y: 12, w: 380, h: 98 };
  const GOAL = { x: 14, y: 616, w: 372, h: 92 }, GIFT = { x: 394, y: 616, w: 150, h: 92 }, BOOST = { x: 552, y: 616, w: 164, h: 92 };
  const AWAY = { x: 380, y: 200, w: 520, h: 300 };
  const SHOPX = [118, 298, 478], DEPOT = 640, BPOS = [[118, 318], [298, 330], [478, 280], [640, 330], [342, 262], [611, 222], [474, 98]];
  const GROUND = 455, QY = 470;
  const inB = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

  /* ---------- state ---------- */
  GAME.reset = () => {
    prog = BIZ.map(() => 0); acc = BIZ.map(() => 0); lastPop = BIZ.map(() => -9); queues = [[], [], []];
    buyN = 1; tab = 0; page = 0; focus = -1; hover = null; saveT = 0; away = null; ev = null; achT = 0; combo = 0; comboT = 0; tapS = [1, 1]; hint = 0; frConfirm = 0;
    banners = []; pops = []; bills = []; peeps = []; cars = []; puffs = []; rainL = []; spawnT = 0; chingT = 0; juice = []; lemonRot = 0; celebP = null; newAch = 0; shift = false; bump = 0; carT = 3;
    clouds = Array.from({ length: 6 }, (_, i) => ({ x: i * 150 + K.rand(0, 80), y: K.rand(40, 190), s: K.rand(.6, 1.2), v: K.rand(6, 14) }));
    if (K.bot) {
      S = fresh(); S.cash = 3e7; S.own = [60, 32, 26, 14, 4, 2, 1]; S.mgr = [true, true, true, true, true, false, false]; S.upg = [0, 3, 21]; S.tut = 9; S.gold = 4;
      evT = 4; tab = 0;
    } else {
      const old = K.save.ty;
      S = Object.assign(fresh(), old || {});
      if (old && old.tut === undefined) S.tut = TUT.length;  // players from before the revamp skip the tutorial
      S.own = BIZ.map((_, i) => +S.own[i] || 0); S.mgr = BIZ.map((_, i) => !!S.mgr[i]);
      if (!Array.isArray(S.upg)) S.upg = []; if (!S.ach || typeof S.ach !== 'object') S.ach = {}; S.st = Object.assign({ life: S.total || 0 }, S.st || {});
      if (!isFinite(S.cash)) S.cash = 0;
      evT = S.tut >= TUT.length ? K.rand(25, 45) : 9e9;
    }
    recalc();
    // money made while away (managers only, at half speed, up to 8 hours)
    if (!K.bot) { const secs = Math.min(8 * 3600, (Date.now() - (S.t || Date.now())) / 1000), earned = perSec() * secs * .5; if (secs > 60 && earned > 0) { earn(earned); away = { secs, earned }; } }
    shown = S.cash;
    for (let i = 0; i < 360; i++) scene(1 / 30, true);  // fill the streets before the first frame
    K.score = S.gold;
  };
  GAME.pose = () => { S.cash = 8.4e9; S.own = [120, 60, 50, 30, 12, 6, 3]; recalc(); ev = { k: 'heat', t: 20, d: 30 }; for (let i = 0; i < 300; i++) { K.t += 1 / 30; scene(1 / 30, true); } shown = S.cash; };
  function persist() { if (K.bot) return; S.t = Date.now(); K.save.ty = S; K.save.best = Math.max(K.save.best || 0, S.gold); K.persist(); }
  function earn(v) { S.cash += v; S.total += v; S.st.life = (S.st.life || 0) + v; }
  function bank(n, x, y) { if (K.bot || n <= 0) return; K.coin(n, x, y); K.runCoins -= n; K.save.coins += n; K.persist(); }
  const pop = (x, y, s, c = '#2f9e3a', size = 24) => { pops.push({ x, y, s, c, size, t: 0 }); if (pops.length > 40) pops.shift(); };
  const banner = (s, sub, c = '#ff9f1a') => { banners.push({ s, sub, c, t: 0 }); if (banners.length > 3) banners.shift(); };
  function ching() { if (chingT > 0) return; chingT = .22; K.sfx(1568, .05, 'square', .025); K.sfx(2093, .09, 'square', .025, 0, .05); }

  /* ---------- actions ---------- */
  function squeeze(x, y) {
    const v = tapValue(); earn(v); S.st.taps = st('taps') + 1; combo = Math.min(60, combo + 1); comboT = 1.2;
    tapS = [1.16, .82]; bump = 1;
    pop(x + K.rand(-30, 30), y - 70, '+$' + fmt(v), combo > 20 ? '#ff8a00' : '#2f9e3a', 26 + Math.min(10, combo / 4));
    for (let i = 0; i < 7; i++) { const a = K.rand(0, 6.28), s = K.rand(120, 320); juice.push({ x: LEMON.x + Math.cos(a) * 40, y: LEMON.y + Math.sin(a) * 30, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, t: 0, r: K.rand(3, 7) }); }
    if (juice.length > 80) juice.splice(0, juice.length - 80);
    if (!K.bot) { K.sfx(320 + Math.min(combo, 40) * 14, .07, 'triangle', .09, 240); K.noise(.05, .05, 2500); }
  }
  function run(i) { if (S.own[i] && prog[i] === 0) { prog[i] = 1e-4; S.st.runs = st('runs') + 1; if (!K.bot) K.sfx(520 + i * 60, .05, 'triangle', .05); } }
  function buy(i, n) {
    if (!unlocked(i)) { K.sfx(160, .1, 'square', .05); return; }
    n = n || buyCount(i); const c = costOf(i, n); if (c > S.cash) { K.sfx(160, .1, 'square', .05); return false; }
    const before = S.own[i]; S.cash -= c; S.own[i] += n;
    K.sfx(660 + Math.min(20, S.own[i] % 25) * 30, .06, 'square', .05); K.sfx(990 + Math.min(20, S.own[i] % 25) * 30, .08, 'square', .04, 0, .05);
    const [bx, by] = BPOS[i]; K.burst(bx, by + 30, ['#ffe36e', '#fff', '#7be37f'], 10, 220, { life: .5 });
    if (before === 0) { banner(`New: ${BIZ[i].n}!`, i < 3 ? 'Customers are lining up' : 'Your town is growing', '#36b24a'); K.chime(523, [0, 4, 7, 12]); bank(2, bx, by); }
    for (const ms of MILES) if (before < ms && S.own[i] >= ms) { banner(`${BIZ[i].n} ×${ms}`, FAST.includes(ms) ? 'Profits doubled and twice as fast!' : 'Profits doubled!', '#ff9f1a'); K.chime(587, [0, 4, 7, 12, 16]); K.flash('#fff6c0', .25); bank(1, bx, by); }
    persist(); return true;
  }
  function hire(i) {
    if (S.mgr[i] || !S.own[i]) return; if (S.cash < MGR[i]) { K.sfx(160, .1, 'square', .05); return; }
    S.cash -= MGR[i]; S.mgr[i] = true; K.chime(660, [0, 4, 7]); banner('Manager hired!', `${BIZ[i].n} now runs itself`, '#a24bff'); bank(2, ...BPOS[i]); persist();
  }
  function buyUpg(u) {
    const U = UPG[u]; if (!U || S.upg.includes(u)) return; if (S.cash < U.cost) { K.sfx(160, .1, 'square', .05); return; }
    S.cash -= U.cost; S.upg.push(u); S.st.upg = st('upg') + 1; recalc(); K.chime(698, [0, 4, 7, 12]); banner(U.n + '!', U.d, '#2f8fe0'); K.flash('#fff', .2); persist();
  }
  function franchise() {
    const g = goldFor(); if (g < 1) return;
    if (frConfirm <= 0) { frConfirm = 4; K.sfx(440, .1, 'triangle', .07); return; }
    const keep = { gold: S.gold + g, runs: (S.runs || 0) + 1, ach: S.ach, st: S.st, day: S.day, streak: S.streak, tut: S.tut, boost: S.boost };
    S = Object.assign(fresh(), keep); recalc(); frConfirm = 0;
    prog = BIZ.map(() => 0); queues = [[], [], []]; peeps.forEach(p => { if (p.st !== 'pass') { p.st = 'leave'; p.dir = K.pick([-1, 1]); } });
    K.flash('#fff3a0', .9); K.chime(392, [0, 4, 7, 12, 16, 19]); banner(`Franchised! ${S.gold} Golden Lemons`, `+${S.gold * 10}% profit on everything, forever`, '#e0a800'); bank(10, 640, 300); shown = 0; tab = 0; persist();
  }
  function claimGift() {
    if (!giftReady()) return; const d = today(); S.streak = S.day === d - 1 ? (S.streak || 0) + 1 : 1; S.day = d;
    const v = Math.max(200, perSec() * 600) * Math.min(S.streak, 7); earn(v);
    banner(`Daily gift: +$${fmt(v)}`, `Day ${S.streak} streak! Come back tomorrow for more`, '#ff5fa2'); K.chime(523, [0, 4, 7, 12, 16]); bank(Math.min(S.streak, 5) + 1, GIFT.x + 75, GIFT.y + 40);
    K.burst(GIFT.x + 75, GIFT.y + 40, ['#ff5fa2', '#ffe36e', '#7be3ff', '#fff'], 30, 380, { life: .9 }); persist();
  }
  function buyBoost() {
    if (K.save.coins < 5) { banner('2× boost costs 5 coins', 'Win coins from trophies, milestones and gifts', '#8a8f9a'); K.sfx(160, .1, 'square', .05); return; }
    if (S.boost > 3000) return; K.save.coins -= 5; S.boost = (S.boost || 0) + 300; K.persist(); K.chime(784, [0, 7, 12]); banner('2× profit for 5 minutes!', 'Every business earns double', '#36b24a'); persist();
  }
  function checkAch() {
    ACH.forEach((a, i) => {
      if (S.ach[i] || a[2]() < a[3]) return;
      S.ach[i] = 1; recalc(); newAch++;
      if (!K.bot) { banner(`Trophy: ${a[0]}`, `+${a[4]} coins · +2% profit forever`, '#e0a800'); K.chime(659, [0, 4, 7, 12, 19]); bank(a[4], CASH.x + 200, CASH.y + 50); }
    });
  }
  function checkTut() {
    if (K.bot) return;
    while (S.tut < TUT.length && TUT[S.tut][1]()) { S.tut++; hint = 0; K.sfx(880, .08, 'triangle', .06); K.sfx(1320, .1, 'triangle', .05, 0, .06); if (S.tut === TUT.length) { banner("You're a natural!", 'Managers keep earning while you are away', '#36b24a'); evT = 30; } }
  }

  /* ---------- events ---------- */
  function startEvent(k) {
    k = k || K.pick(['heat', 'gold', 'celeb', 'rain', 'gold']);
    if (k === 'heat') { ev = { k, t: 30, d: 30 }; banner('HEATWAVE!', 'Everyone is thirsty: businesses sell twice as fast', '#ff6a1a'); }
    if (k === 'celeb') { ev = { k, t: 40, d: 40 }; banner('Celebrity visit!', 'A movie star loves your lemonade: profit ×3', '#a24bff'); cars.push({ k: 'limo', x: -180, y: 576, dir: 1, v: 260, stop: 470 }); }
    if (k === 'rain') { ev = { k, t: 12, d: 12 }; banner('It is raining lemons!', 'Tap the falling lemons to catch them', '#e0b800'); }
    if (k === 'gold') { ev = { k, t: 18, d: 18 }; const d = K.pick([-1, 1]); peeps.push(makePeep(d < 0 ? 760 : -30, d, 'pass', true)); banner('A golden customer!', 'Tap them before they walk away', '#e0a800'); }
    if (!K.bot) K.chime(784, [0, 4, 7, 4, 12]);
  }
  function endEvent() {
    if (ev.k === 'heat') S.st.hw = st('hw') + 1;
    if (ev.k === 'celeb') { S.st.celeb = st('celeb') + 1; const l = cars.find(c => c.k === 'limo'); if (l) { l.stop = null; l.v = 0; } celebP = null; }
    ev = null; evT = K.bot ? K.rand(9, 14) : K.rand(70, 130);
  }
  function catchGold(p) {
    const v = Math.max(50, perSec() * 120, tapValue() * 40); earn(v); S.st.gc = st('gc') + 1; p.gold = false; p.cup = '#ffd23f';
    pop(p.x, p.y - 80, '+$' + fmt(v), '#e0a800', 40); K.burst(p.x, p.y - 30, ['#ffe36e', '#fff', '#ffb300'], 26, 340, { life: .8 });
    K.chime(880, [0, 4, 7, 12, 16]); K.flash('#fff3a0', .35); bank(1, p.x, p.y - 40); if (ev && ev.k === 'gold') ev.t = Math.min(ev.t, .5);
  }
  function catchLemon(l) { if (l.got) return; l.got = 1; const v = Math.max(5, tapValue() * 4 + perSec() * 2); earn(v); S.st.rain = st('rain') + 1; pop(l.x, l.y - 30, '+$' + fmt(v), '#c99a00', 26); K.burst(l.x, l.y, ['#ffe36e', '#fff'], 8, 200, { life: .4 }); K.sfx(900 + Math.random() * 400, .06, 'triangle', .06); }

  /* ---------- town life ---------- */
  const SKIN = ['#f1c7a5', '#e0a77e', '#c68b5e', '#8d5a3b', '#ffd9bd'], HAIR = ['#3a2410', '#1a1a1a', '#c4752a', '#e8c25a', '#6a3a1a', '#9a9aa0'], SHIRT = ['#ff6b6b', '#4fa8ff', '#5fd36a', '#ffb347', '#a77bff', '#ff7ae0', '#2ec4b6', '#f4f4f4'];
  function makePeep(x, dir, stt, gold) { return { x, y: 488 + K.rand(0, 14), dir, v: gold ? 38 : K.rand(48, 78), st: stt, ph: K.rand(0, 6), skin: K.pick(SKIN), hair: K.pick(HAIR), shirt: K.pick(SHIRT), pants: K.pick(['#2a3a5a', '#3a3a3a', '#5a4a3a', '#2a5a8a']), cup: null, gold, kid: Math.random() < .25, wait: 0 }; }
  function serve(i) {
    const q = queues[i]; if (!q.length) return; const p = q[0]; if (p.st !== 'wait') return;
    q.shift(); p.st = 'leave'; p.cup = BIZ[i].cup; p.dir = Math.random() < .5 ? -1 : 1; p.v = K.rand(50, 75); p.y = 488 + K.rand(0, 14);
    K.burst(p.x, p.y - 40, ['#fff', BIZ[i].cup], 4, 90, { life: .35, gravity: 0 });
  }
  function scene(dt, warm) {
    const t = K.t, heat = ev && ev.k === 'heat', celeb = ev && ev.k === 'celeb';
    for (const c of clouds) { c.x += c.v * dt; if (c.x > 820) { c.x = -160; c.y = K.rand(40, 190); } }
    // customers
    spawnT -= dt * (heat ? 2.6 : celeb ? 2 : 1);
    const shops = [0, 1, 2].filter(i => S.own[i] > 0);
    if (spawnT <= 0 && peeps.length < 22) {
      spawnT = K.rand(.7, 1.6) / Math.max(1, shops.length * .8);
      const dir = Math.random() < .5 ? 1 : -1, p = makePeep(dir > 0 ? -30 : 760, dir, 'pass');
      const open = shops.filter(i => queues[i].length < 5); if (open.length && Math.random() < .8) { const i = K.pick(open); p.st = 'go'; p.shop = i; queues[i].push(p); }
      peeps.push(p);
    }
    for (let qi = 0; qi < 3; qi++) queues[qi].forEach((p, k) => { p.tx = SHOPX[qi] - 6 - k * 26; });
    for (const p of peeps) {
      if (p.st === 'go' || p.st === 'wait') {
        const dx = p.tx - p.x, dy = QY - p.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 2) { p.st = 'go'; p.dir = Math.sign(dx) || p.dir; const d = Math.hypot(dx, dy); p.x += dx / d * Math.min(d, p.v * dt); p.y += dy / d * Math.min(d, p.v * dt); p.ph += dt * 10; }
        else { p.st = 'wait'; p.dir = 1; p.wait += dt; }
      } else { p.x += p.dir * p.v * dt; p.ph += dt * 10; }
    }
    peeps = peeps.filter(p => p.x > -60 && p.x < 800 || p.st === 'go' || p.st === 'wait');
    if (ev && ev.k === 'gold' && !peeps.some(p => p.gold)) ev.t = Math.min(ev.t, .3);
    // cars and trucks
    const trucks = S.own[3] ? Math.min(3, Math.ceil(S.own[3] / 8)) : 0;
    if (cars.filter(c => c.k === 'truck').length < trucks && Math.random() < dt * .5) { const d = Math.random() < .5 ? 1 : -1; cars.push({ k: 'truck', x: d > 0 ? -140 : 860, y: d > 0 ? 576 : 540, dir: d, v: K.rand(110, 150) }); }
    carT -= dt; if (carT <= 0) { carT = K.rand(3, 8); const d = Math.random() < .5 ? 1 : -1; cars.push({ k: 'car', x: d > 0 ? -100 : 840, y: d > 0 ? 576 : 540, dir: d, v: K.rand(150, 220), c: K.pick(['#ff5a5a', '#4f8cff', '#ffd23f', '#5fd36a', '#f4f4f4', '#a77bff']) }); }
    for (const c of cars) {
      if (c.k === 'limo' && c.stop != null && c.x >= c.stop) { c.x = c.stop; c.v = 0; if (!celebP && celeb) celebP = { x: c.x + 30, t: 0 }; }
      else if (c.k === 'limo' && c.stop == null) c.v = Math.min(260, c.v + 200 * dt);
      for (const o of cars) if (o !== c && o.y === c.y && (o.x - c.x) * c.dir > 0 && Math.abs(o.x - c.x) < 150) c.v = Math.min(c.v, o.v);
      c.x += c.dir * c.v * dt; c.w = (c.w || 0) + c.v * dt / 10;
    }
    cars = cars.filter(c => c.x > -260 && c.x < 1000);
    if (celebP) celebP.t += dt;
    // factory smoke
    if (S.own[5] && Math.random() < dt * 4) { const sx = K.pick([-58, -20, 22]); puffs.push({ x: 611 + sx, y: GROUND - 64 - 250 + (sx === -20 ? -12 : 0) + 64, r: K.rand(8, 13), t: 0 }); }
    for (const p of puffs) { p.t += dt; p.y -= 26 * dt; p.x += 14 * dt; p.r += 8 * dt; } puffs = puffs.filter(p => p.t < 3.5);
    if (warm) return;
    // lemon rain
    if (ev && ev.k === 'rain' && ev.t > 1.5 && Math.random() < dt * 4) rainL.push({ x: K.rand(30, 700), y: -30, vy: K.rand(80, 160), r: K.rand(0, 6), vr: K.rand(-3, 3), t: 0 });
    for (const l of rainL) { l.t += dt; if (l.got) { l.got += dt; continue; } l.vy += 380 * dt; l.y += l.vy * dt; l.r += l.vr * dt; if (l.y > 600) { l.y = 600; l.vy = -l.vy * .35; l.vr *= .5; } }
    rainL = rainL.filter(l => (l.got ? l.got < 1.4 : l.t < 7));
    for (const j of juice) { j.t += dt; j.vy += 700 * dt; j.x += j.vx * dt; j.y += j.vy * dt; } juice = juice.filter(j => j.t < .7);
    for (const b of bills) { b.t += dt * 1.6; } bills = bills.filter(b => { if (b.t >= 1) { bump = Math.max(bump, .5); return false; } return true; });
    for (const p of pops) p.t += dt; pops = pops.filter(p => p.t < 1.1);
    for (const b of banners) b.t += dt; banners = banners.filter(b => b.t < 3.2);
    if (banners.length > 1 && banners[0].t < 2.6 && banners[1].t > 0) banners[1].t = Math.min(banners[1].t, 0);
  }
  function bill(x, y) { if (bills.length < 24) bills.push({ x0: x, y0: y, x1: CASH.x + 60, y1: CASH.y + 44, t: 0, a: K.rand(-1, 1) }); }

  /* ---------- input ---------- */
  function tabDown(x, y) {
    if (tab === 0) {
      if (inB(BUYN, x, y)) { buyN = buyN === 1 ? 10 : buyN === 10 ? 100 : buyN === 100 ? 'max' : 1; K.sfx(600, .04, 'triangle', .05); return; }
      for (let i = 0; i < 7; i++) { const r = ROW(i); if (!inB(r, x, y)) continue; if (inB(BUYB(r), x, y)) buy(i); else if (inB(MGRB(r), x, y) && S.own[i] && !S.mgr[i]) hire(i); else run(i); focus = i; return; }
    } else if (tab === 1) { const list = upgList(); for (let k = 0; k < list.length; k++) { const r = ROW(k); if (inB(r, x, y)) { buyUpg(list[k]); focus = k; return; } } }
    else if (tab === 2) { if (inB(PGL, x, y)) { page = (page + 3) % 4; K.sfx(600, .04, 'triangle', .05); } if (inB(PGR, x, y)) { page = (page + 1) % 4; K.sfx(600, .04, 'triangle', .05); } }
    else if (tab === 3) { if (inB(FRB, x, y)) franchise(); }
  }
  GAME.down = (x, y) => {
    if (away) { if (inB(AWAY, x, y) || true) { away = null; K.chime(523, [0, 4, 7, 12]); bump = 1; } return; }
    for (const l of rainL) if (!l.got && K.dist(x, y, l.x, l.y) < 46) { catchLemon(l); return; }
    for (const p of peeps) if (p.gold && K.dist(x, y, p.x, p.y - 28) < 50) { catchGold(p); return; }
    if (K.dist(x, y, LEMON.x, LEMON.y) < LEMON.r + 10) { squeeze(x, y); return; }
    for (let i = 0; i < 4; i++) if (inB(TAB(i), x, y)) { if (tab !== i) { tab = i; focus = -1; page = 0; if (i === 2) newAch = 0; K.sfx(700, .05, 'triangle', .06); } return; }
    if (inB(PANEL, x, y)) return tabDown(x, y);
    if (inB(GIFT, x, y)) return claimGift();
    if (inB(BOOST, x, y)) return buyBoost();
    if (inB(GOAL, x, y)) { tab = 2; page = 0; newAch = 0; return; }
    // tapping a shop in the town runs it
    for (let i = 0; i < 3; i++) if (S.own[i] && Math.abs(x - SHOPX[i]) < 70 && y > GROUND - 150 && y < GROUND + 10) { run(i); return; }
  };
  GAME.move = (x, y) => { hover = null; for (let i = 0; i < 7; i++) if (inB(ROW(i), x, y)) hover = i; if (K.dist(x, y, LEMON.x, LEMON.y) < LEMON.r) hover = 'lemon'; };
  GAME.key = (c, d) => {
    if (c === 'ShiftLeft' || c === 'ShiftRight') { shift = d; return; }
    if (!d) return;
    if (away) { if (c === 'Enter' || c === 'Space') GAME.down(640, 360); return; }
    if (c === 'Space') { squeeze(LEMON.x + K.rand(-20, 20), LEMON.y + K.rand(-20, 20)); return; }
    const n = +c.replace('Digit', '').replace('Numpad', ''); if (n >= 1 && n <= 7) { if (shift) hire(n - 1); else { buy(n - 1); run(n - 1); } return; }
    if (c === 'ArrowLeft' || c === 'ArrowRight') { tab = (tab + (c === 'ArrowLeft' ? 3 : 1)) % 4; focus = 0; if (tab === 2) newAch = 0; K.sfx(700, .05, 'triangle', .06); return; }
    const rows = tab === 0 ? 7 : tab === 1 ? upgList().length : 0;
    if (c === 'ArrowDown' && rows) focus = (focus + 1) % rows; if (c === 'ArrowUp' && rows) focus = (focus + rows - 1) % rows;
    if (c === 'ArrowDown' || c === 'ArrowUp') { if (tab === 2) page = (page + (c === 'ArrowDown' ? 1 : 3)) % 4; return; }
    if (c === 'Enter') { if (tab === 0 && focus >= 0) { if (S.own[focus] && !S.mgr[focus] && S.cash >= MGR[focus]) hire(focus); else buy(focus); run(focus); } else if (tab === 1 && focus >= 0) buyUpg(upgList()[focus]); else if (tab === 3) franchise(); }
    if (c === 'KeyB') buyN = buyN === 1 ? 10 : buyN === 10 ? 100 : buyN === 100 ? 'max' : 1;
    if (c === 'KeyM' && focus >= 0 && tab === 0) hire(focus);
    if (c === 'KeyG') { const p = peeps.find(p => p.gold); if (p) catchGold(p); const l = rainL.find(l => !l.got); if (l) catchLemon(l); }
    if (c === 'KeyD') claimGift();
    if (c === 'KeyX') buyBoost();
  };
  const upgList = () => UPG.map((u, i) => i).filter(i => !S.upg.includes(i)).sort((a, b) => UPG[a].cost - UPG[b].cost).slice(0, 7);
  let botT = 0, botTap = 0;
  GAME.bot = dt => {
    botTap -= dt; if (botTap <= 0) { botTap = K.rand(.12, .4); if (!away) squeeze(LEMON.x + K.rand(-30, 30), LEMON.y + K.rand(-30, 30)); }
    botT += dt; if (botT < .5) return; botT = 0;
    if (away) { away = null; return; }
    for (let i = 0; i < 7; i++) if (!S.mgr[i]) run(i);
    const i = K.irand(0, 6); if (unlocked(i) && costOf(i, 1) < S.cash * .4) buy(i, 1);
    if (!S.mgr[i] && S.own[i] && S.cash > MGR[i] * 2) hire(i);
    const u = upgList()[0]; if (u !== undefined && UPG[u].cost < S.cash * .3) buyUpg(u);
    const gp = peeps.find(p => p.gold); if (gp && gp.x > 80 && gp.x < 640 && Math.random() < .35) catchGold(gp);
    for (const l of rainL) if (!l.got && l.y > 250 && Math.random() < .5) catchLemon(l);
    if (Math.random() < .04) tab = K.pick([0, 0, 0, 1, 2]);
  };

  /* ---------- update ---------- */
  GAME.update = dt => {
    scene(dt);
    tapS[0] += (1 - tapS[0]) * Math.min(1, dt * 14); tapS[1] += (1 - tapS[1]) * Math.min(1, dt * 14);
    bump = Math.max(0, bump - dt * 4); chingT -= dt; lemonRot += dt; hint += dt; frConfirm -= dt;
    comboT -= dt; if (comboT <= 0) combo = Math.max(0, combo - dt * 30);
    if (away) return;
    S.boost = Math.max(0, (S.boost || 0) - dt);
    for (let i = 0; i < 7; i++) {
      if (S.mgr[i] && S.own[i] && prog[i] === 0) prog[i] = 1e-4;
      if (prog[i] > 0) { prog[i] += dt / cycle(i); if (prog[i] >= 1) { const laps = Math.floor(prog[i]); complete(i, laps); prog[i] = S.mgr[i] ? prog[i] - laps : 0; } }
    }
    if (ev) { ev.t -= dt; if (ev.t <= 0) endEvent(); } else { evT -= dt; if (evT <= 0) startEvent(); }
    achT += dt; if (achT > .5) { achT = 0; checkAch(); checkTut(); }
    saveT += dt; if (saveT > 5) { saveT = 0; persist(); }
    shown += (S.cash - shown) * Math.min(1, dt * 9); if (Math.abs(S.cash - shown) < .01 * Math.max(1, S.cash * .001)) shown = S.cash;
    K.score = S.gold;
    music();
  };
  function complete(i, laps) {
    const v = revenue(i) * laps; earn(v); acc[i] += v;
    if (K.t - lastPop[i] > .45) { const [x, y] = BPOS[i]; pop(x + K.rand(-14, 14), y, '+$' + fmt(acc[i]), '#2f9e3a', 22 + i * 1.5); acc[i] = 0; lastPop[i] = K.t; bill(x, y); ching(); }
    if (i < 3) serve(i);
    if (i === 5) for (let k = 0; k < 3; k++) puffs.push({ x: 611 + K.rand(-60, 30), y: GROUND - 250, r: 16, t: 0 });
    if (i === 3 && !K.bot) K.sfx(392, .12, 'square', .03), K.sfx(330, .14, 'square', .03, 0, .12);
  }

  /* ---------- music: a bouncy little marimba loop ---------- */
  let mBus = null, mNext = 0, mStep = 0;
  const CH = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], MEL = [0, 2, 1, 2, 0, -1, 2, 1, 0, 1, 2, -1, 2, 1, 0, -1];
  function tone(f, t, d, type, v) { const ac = K.ac, o = ac.createOscillator(), a = ac.createGain(); o.type = type; o.frequency.value = f; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + .008); a.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(a).connect(mBus); o.start(t); o.stop(t + d + .02); }
  function music() {
    const ac = K.ac; if (!ac || K.bot || K.state !== 'play' || K.save.mute) return;
    if (!mBus) { mBus = ac.createGain(); mBus.gain.value = .55; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3000; mBus.connect(f).connect(K.master); }
    const spb = 60 / 108 / 2; if (mNext < ac.currentTime) mNext = ac.currentTime + .06;
    while (mNext < ac.currentTime + .2) {
      const s = mStep++, bar = Math.floor(s / 8) % 4, i = s % 8, ch = CH[bar], base = 261.63, t = mNext; mNext += spb;
      const hz = st => base * Math.pow(2, st / 12);
      if (i === 0 || i === 4 || i === 6 && bar % 2) tone(hz(ch[0] - 24), t, .32, 'triangle', .11);
      const m = MEL[(s + (Math.floor(s / 32) % 2) * 3) % 16]; if (m >= 0 && (i % 2 === 0 || Math.random() < .5)) { const f = hz(ch[m] + 12); tone(f, t, .28, 'sine', .05); tone(f * 4, t, .06, 'sine', .012); }
      if (i % 2 === 1) tone(hz(ch[(i >> 1) % 3]), t, .12, 'triangle', .018);
    }
  }

  /* ---------- drawing helpers ---------- */
  function rr(gr, x, y, w, h, r, fill) { gr.beginPath(); gr.roundRect(x, y, w, h, r); if (fill) { gr.fillStyle = fill; gr.fill(); } }
  function ell(gr, x, y, rx, ry, fill) { gr.beginPath(); gr.ellipse(x, y, rx, ry, 0, 0, 7); gr.fillStyle = fill; gr.fill(); }
  function circ(gr, x, y, r, fill) { gr.beginPath(); gr.arc(x, y, r, 0, 7); gr.fillStyle = fill; gr.fill(); }
  function T(gr, s, x, y, size, col, al = 'center', sh = 'rgba(0,0,0,.22)') { gr.font = fnt(size); gr.textAlign = al; gr.textBaseline = 'middle'; if (sh) { gr.fillStyle = sh; gr.fillText(s, x, y + Math.max(1.5, size / 14)); } gr.fillStyle = col; gr.fillText(s, x, y); }
  function lin(gr, y0, y1, a, b) { const g = gr.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  function btn(gr, b, top, bot, on = true, r = 14) {
    const t = on ? top : '#56636e', bt = on ? bot : '#3e4952';
    rr(gr, b.x, b.y + 4, b.w, b.h - 4, r, 'rgba(0,0,0,.28)'); rr(gr, b.x, b.y, b.w, b.h - 4, r, lin(gr, b.y, b.y + b.h, t, bt));
    gr.save(); gr.globalAlpha = on ? .35 : .12; rr(gr, b.x + 5, b.y + 3, b.w - 10, (b.h - 4) * .42, r * .7, '#fff'); gr.restore();
  }
  function lemonShape(gr, x, y, r, rot, face, sq = [1, 1]) {
    gr.save(); gr.translate(x, y); gr.rotate(rot); gr.scale(sq[0], sq[1]);
    const g = gr.createRadialGradient(-r * .35, -r * .35, r * .1, 0, 0, r * 1.1); g.addColorStop(0, '#fff7a8'); g.addColorStop(.5, '#ffd83a'); g.addColorStop(1, '#f0a800');
    gr.beginPath(); gr.ellipse(0, 0, r, r * .8, 0, 0, 7); gr.fillStyle = g; gr.fill();
    gr.beginPath(); gr.ellipse(r * .98, 0, r * .16, r * .12, 0, 0, 7); gr.fill(); gr.beginPath(); gr.ellipse(-r * .98, 0, r * .14, r * .1, 0, 0, 7); gr.fillStyle = '#f2b300'; gr.fill();
    gr.fillStyle = 'rgba(255,255,255,.5)'; gr.beginPath(); gr.ellipse(-r * .38, -r * .42, r * .3, r * .13, -.5, 0, 7); gr.fill();
    gr.fillStyle = 'rgba(200,130,0,.25)'; for (let i = 0; i < 9; i++) { gr.beginPath(); gr.arc(Math.cos(i * 2.4) * r * .6, Math.sin(i * 1.7) * r * .45, r * .025, 0, 7); gr.fill(); }
    gr.fillStyle = '#4caf50'; gr.beginPath(); gr.ellipse(r * .25, -r * .86, r * .34, r * .14, -.5, 0, 7); gr.fill(); gr.strokeStyle = '#2e7d32'; gr.lineWidth = r * .03; gr.beginPath(); gr.moveTo(r * .02, -r * .74); gr.lineTo(r * .5, -r * .98); gr.stroke();
    if (face) {
      gr.fillStyle = '#4a3200'; gr.strokeStyle = '#4a3200'; gr.lineCap = 'round'; gr.lineWidth = r * .07;
      if (face === 2) { for (const s of [-1, 1]) { gr.beginPath(); gr.moveTo(s * r * .32 - r * .08, -r * .14); gr.lineTo(s * r * .32 + r * .08 * (s > 0 ? -1 : 1) * -1, -r * .06); gr.lineTo(s * r * .32 - r * .08, r * .02); gr.stroke(); } }
      else for (const s of [-1, 1]) { gr.beginPath(); gr.ellipse(s * r * .3, -r * .08, r * .07, r * .11, 0, 0, 7); gr.fill(); gr.fillStyle = '#fff'; gr.beginPath(); gr.arc(s * r * .3 + r * .025, -r * .12, r * .03, 0, 7); gr.fill(); gr.fillStyle = '#4a3200'; }
      gr.beginPath(); gr.arc(0, r * .1, r * (face === 2 ? .2 : .16), .15, Math.PI - .15); gr.stroke();
      gr.fillStyle = 'rgba(255,110,90,.35)'; ell(gr, -r * .5, r * .12, r * .1, r * .06, 'rgba(255,110,90,.35)'); ell(gr, r * .5, r * .12, r * .1, r * .06, 'rgba(255,110,90,.35)');
    }
    gr.restore();
  }
  function cupIcon(gr, x, y, s, c) { gr.fillStyle = '#fff'; gr.beginPath(); gr.moveTo(x - 5 * s, y - 12 * s); gr.lineTo(x + 5 * s, y - 12 * s); gr.lineTo(x + 4 * s, y); gr.lineTo(x - 4 * s, y); gr.fill(); gr.fillStyle = c; gr.fillRect(x - 4.5 * s, y - 9 * s, 9 * s, 7 * s); gr.strokeStyle = '#ff5a7a'; gr.lineWidth = 1.5 * s; gr.beginPath(); gr.moveTo(x + 1 * s, y - 12 * s); gr.lineTo(x + 4 * s, y - 18 * s); gr.stroke(); }
  function person(gr, p, t, sc = 1) {
    const walking = p.st !== 'wait', sw = walking ? Math.sin(p.ph) : 0, bob = walking ? Math.abs(Math.cos(p.ph)) * 2 : Math.sin(t * 2 + p.ph) * .6, s = (p.kid ? .78 : 1) * sc;
    gr.save(); gr.translate(p.x, p.y); gr.scale(s, s);
    ell(gr, 0, 0, 12, 3.5, 'rgba(0,0,0,.18)');
    if (p.gold) { const gl = gr.createRadialGradient(0, -26, 4, 0, -26, 46); gl.addColorStop(0, 'rgba(255,230,90,.7)'); gl.addColorStop(1, 'rgba(255,230,90,0)'); gr.fillStyle = gl; gr.beginPath(); gr.arc(0, -26, 46, 0, 7); gr.fill(); }
    gr.scale(p.dir, 1); gr.translate(0, -bob);
    gr.lineCap = 'round'; gr.strokeStyle = p.gold ? '#b8860b' : p.pants; gr.lineWidth = 5.5;
    gr.beginPath(); gr.moveTo(-3, -17); gr.lineTo(-3 + sw * 6, -2); gr.moveTo(3, -17); gr.lineTo(3 - sw * 6, -2); gr.stroke();
    rr(gr, -8.5, -36, 17, 22, 7, p.gold ? '#ffcf2e' : p.shirt);
    gr.strokeStyle = p.skin; gr.lineWidth = 4.5; gr.beginPath(); gr.moveTo(-6, -31); gr.lineTo(-7 - sw * 4, -19); gr.stroke();
    gr.beginPath(); gr.moveTo(6, -31); if (p.cup) gr.lineTo(11, -24); else gr.lineTo(7 + sw * 4, -19); gr.stroke();
    circ(gr, 0, -44, 8.5, p.skin);
    gr.fillStyle = p.hair; gr.beginPath(); gr.arc(0, -46, 9, Math.PI * .95, Math.PI * 2.1); gr.fill();
    circ(gr, 4.5, -44, 1.4, '#222');
    if (p.gold) { gr.fillStyle = '#ffd23f'; gr.beginPath(); gr.moveTo(-8, -52); gr.lineTo(-8, -60); gr.lineTo(-4, -55); gr.lineTo(0, -62); gr.lineTo(4, -55); gr.lineTo(8, -60); gr.lineTo(8, -52); gr.fill(); }
    if (p.cup) cupIcon(gr, 12, -20, 1, p.cup);
    if (p.st === 'wait' && p.wait > 6) { gr.scale(p.dir, 1); rr(gr, -14, -78, 28, 18, 9, 'rgba(255,255,255,.92)'); gr.fillStyle = '#555'; for (let k = -1; k <= 1; k++) circ(gr, k * 7, -69, 2, '#666'); }
    gr.restore();
  }
  /* ---------- buildings (x, y = bottom center) ---------- */
  function stand(gr, x, y, s, lvl, t) {
    const sk = curSkin(); gr.save(); gr.translate(x, y); gr.scale(s, s);
    ell(gr, 0, 2, 84, 8, 'rgba(0,0,0,.18)');
    gr.fillStyle = '#7a4a22'; gr.fillRect(-68, -124, 7, 124); gr.fillRect(61, -124, 7, 124);
    circ(gr, 0, -82, 11, '#f1c7a5'); gr.fillStyle = sk.c[1]; gr.beginPath(); gr.arc(0, -86, 11.5, Math.PI, 0); gr.fill(); gr.fillRect(-2, -90, 18, 4); rr(gr, -12, -72, 24, 16, 6, sk.c[1]);
    circ(gr, 4, -82, 1.6, '#222');
    rr(gr, -74, -60, 148, 60, 6, lin(gr, -60, 0, '#d39555', '#8f5a2c'));
    gr.strokeStyle = 'rgba(80,40,10,.35)'; gr.lineWidth = 2; for (let i = -1; i <= 1; i++) { gr.beginPath(); gr.moveTo(-74, -30 + i * 18); gr.lineTo(74, -30 + i * 18); gr.stroke(); }
    rr(gr, -80, -66, 160, 10, 4, '#f0c486');
    rr(gr, -54, -50, 108, 30, 8, '#fff8dc'); gr.strokeStyle = sk.c[0]; gr.lineWidth = 3; gr.stroke();
    T(gr, 'LEMONADE', 0, -35, 17, '#d0661e', 'center', null);
    gr.fillStyle = 'rgba(220,240,255,.75)'; gr.fillRect(-58, -92, 22, 27); gr.fillStyle = '#ffe14d'; gr.fillRect(-56, -84, 18, 18); circ(gr, -47, -78, 4, '#fff6a0');
    cupIcon(gr, 34, -66, 1.1, '#ffe14d'); cupIcon(gr, 50, -66, 1.1, '#ffe14d');
    gr.fillStyle = '#a0662e'; gr.fillRect(78, -24, 34, 24); for (let i = 0; i < 3; i++) lemonShape(gr, 86 + i * 9, -28 - (i % 2) * 4, 7, i, 0);
    for (let i = 0; i < 6; i++) { gr.fillStyle = i % 2 ? '#fff' : sk.c[0]; gr.beginPath(); gr.moveTo(-82 + i * 27.3, -136); gr.lineTo(-82 + (i + 1) * 27.3, -136); gr.lineTo(-82 + (i + 1) * 27.3, -112); gr.arc(-82 + (i + .5) * 27.3, -112, 13.65, 0, Math.PI); gr.fill(); }
    gr.fillStyle = 'rgba(0,0,0,.1)'; gr.fillRect(-82, -118, 164, 6);
    lemonShape(gr, 0, -150, 17, -.2 + Math.sin(t * 2) * .08, 1);
    if (lvl >= 1) for (let i = 0; i < 9; i++) circ(gr, -76 + i * 19, -98 + Math.sin(i * 1.3) * 2, 3.2, Math.sin(t * 3 + i) > 0 ? ['#ff5a5a', '#ffe14d', '#5fd3ff', '#7dff9a'][i % 4] : 'rgba(255,255,255,.5)');
    if (lvl >= 2) { gr.save(); gr.shadowColor = '#ffe14d'; gr.shadowBlur = 14 + Math.sin(t * 4) * 6; gr.strokeStyle = '#fff36a'; gr.lineWidth = 2.5; rr(gr, -54, -50, 108, 30, 8); gr.stroke(); gr.restore(); }
    if (lvl >= 3) { gr.fillStyle = '#ffcf2e'; for (const sx of [-1, 1]) { gr.beginPath(); gr.moveTo(sx * 92, -150); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2 + t; gr.lineTo(sx * 92 + Math.cos(a) * (k % 2 ? 5 : 11), -150 + Math.sin(a) * (k % 2 ? 5 : 11)); } gr.fill(); } }
    gr.restore();
  }
  function cart(gr, x, y, s, lvl, t) {
    gr.save(); gr.translate(x, y); gr.scale(s, s);
    ell(gr, 0, 2, 70, 7, 'rgba(0,0,0,.18)');
    gr.strokeStyle = '#555'; gr.lineWidth = 4; gr.beginPath(); gr.moveTo(4, -70); gr.lineTo(4, -150); gr.stroke();
    circ(gr, -14, -92, 10, '#e0a77e'); gr.fillStyle = '#3a2410'; gr.beginPath(); gr.arc(-14, -95, 10.5, Math.PI, 0); gr.fill(); rr(gr, -24, -82, 20, 14, 6, '#2ec4b6'); circ(gr, -10, -92, 1.5, '#222');
    rr(gr, -58, -72, 108, 50, 10, lin(gr, -72, -22, '#ffae4a', '#ff7a1a'));
    gr.fillStyle = '#fff'; gr.fillRect(-58, -54, 108, 9); T(gr, 'JUICE', -4, -33, 16, '#fff', 'center', 'rgba(150,60,0,.4)');
    rr(gr, -62, -78, 116, 8, 4, '#ffd9a8');
    for (let i = 0; i < 4; i++) { const c = ['#5fd36a', '#ff6b6b', '#ffe14d', '#a77bff'][i]; rr(gr, -50 + i * 22, -94, 14, 17, 3, c); gr.fillStyle = '#fff'; gr.fillRect(-46 + i * 22, -90, 6, 6); }
    gr.strokeStyle = '#666'; gr.lineWidth = 4; gr.beginPath(); gr.moveTo(50, -50); gr.lineTo(74, -60); gr.stroke();
    for (const [wx, wr] of [[28, 19], [-38, 11]]) { circ(gr, wx, -wr, wr, '#333'); circ(gr, wx, -wr, wr * .55, '#ddd'); gr.strokeStyle = '#888'; gr.lineWidth = 2; for (let k = 0; k < 3; k++) { const a = k * 2.09 + (cart.w || 0); gr.beginPath(); gr.moveTo(wx, -wr); gr.lineTo(wx + Math.cos(a) * wr * .5, -wr + Math.sin(a) * wr * .5); gr.stroke(); } }
    for (let i = 0; i < 6; i++) { gr.fillStyle = i % 2 ? '#fff' : (lvl >= 2 ? '#a24bff' : '#ff5a5a'); gr.beginPath(); gr.moveTo(4, -170); gr.lineTo(4 - 66 + i * 22, -142); gr.quadraticCurveTo(4 - 55 + i * 22, -134, 4 - 44 + i * 22, -142); gr.fill(); }
    circ(gr, 4, -172, 4, '#fff');
    if (lvl >= 1) for (let i = 0; i < 6; i++) circ(gr, -58 + i * 22, -141, 3, Math.sin(t * 4 + i) > 0 ? '#ffe14d' : '#fff');
    if (lvl >= 3) { gr.save(); gr.globalAlpha = .6 + Math.sin(t * 5) * .3; T(gr, '★', 48, -108, 24, '#ffcf2e', 'center', null); gr.restore(); }
    gr.restore();
  }
  function bar(gr, x, y, s, lvl, t) {
    gr.save(); gr.translate(x, y); gr.scale(s, s);
    ell(gr, 0, 2, 92, 8, 'rgba(0,0,0,.18)');
    rr(gr, -84, -128, 168, 128, 4, lin(gr, -128, 0, '#ffc2dd', '#f08ab8'));
    gr.fillStyle = '#d0608f'; gr.fillRect(-90, -134, 180, 12);
    gr.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 7; i++) gr.fillRect(-84 + i * 26, -122, 2, 122);
    rr(gr, -70, -96, 104, 58, 6, lin(gr, -96, -38, '#bfefff', '#7fc8e8'));
    circ(gr, -18, -62, 9, '#ffd9bd'); gr.fillStyle = '#c4752a'; gr.beginPath(); gr.arc(-18, -65, 9.5, Math.PI, 0); gr.fill(); rr(gr, -28, -53, 20, 15, 6, '#ff6fa8'); circ(gr, -15, -62, 1.4, '#222');
    gr.fillStyle = 'rgba(255,255,255,.35)'; gr.beginPath(); gr.moveTo(-66, -96); gr.lineTo(-46, -96); gr.lineTo(-70, -60); gr.fill();
    gr.fillStyle = '#b84a78'; gr.fillRect(-74, -40, 112, 10);
    for (let i = 0; i < 6; i++) { gr.fillStyle = i % 2 ? '#fff' : '#2ec4b6'; gr.beginPath(); gr.moveTo(-76 + i * 19, -112); gr.lineTo(-76 + (i + 1) * 19, -112); gr.lineTo(-76 + (i + 1) * 19, -98); gr.arc(-76 + (i + .5) * 19, -98, 9.5, 0, Math.PI); gr.fill(); }
    rr(gr, 44, -70, 30, 70, [8, 8, 0, 0], '#8a3a5a'); circ(gr, 50, -34, 2.5, '#ffd23f'); rr(gr, 48, -64, 22, 22, 4, 'rgba(190,240,255,.7)');
    // giant cup sign
    gr.save(); gr.translate(-20, -134); gr.rotate(Math.sin(t * 1.5) * .04);
    gr.fillStyle = '#fff'; gr.beginPath(); gr.moveTo(-22, -62); gr.lineTo(22, -62); gr.lineTo(16, 0); gr.lineTo(-16, 0); gr.fill();
    gr.fillStyle = '#ff6fa8'; gr.beginPath(); gr.moveTo(-20, -48); gr.lineTo(20, -48); gr.lineTo(16, -6); gr.lineTo(-16, -6); gr.fill();
    gr.fillStyle = '#fff4f8'; gr.beginPath(); gr.arc(-10, -62, 12, Math.PI, 0); gr.arc(8, -64, 13, Math.PI, 0); gr.fill();
    gr.strokeStyle = '#2ec4b6'; gr.lineWidth = 5; gr.lineCap = 'round'; gr.beginPath(); gr.moveTo(4, -64); gr.lineTo(16, -92); gr.stroke(); circ(gr, -12, -76, 6, '#e8304a');
    gr.restore();
    if (lvl >= 1) { gr.save(); gr.shadowColor = '#ff6fa8'; gr.shadowBlur = 10 + Math.sin(t * 3) * 5; T(gr, 'SMOOTHIE', 46, -152, 15, '#fff', 'center', null); gr.restore(); } else T(gr, 'SMOOTHIE', 46, -152, 15, '#b84a78', 'center', null);
    if (lvl >= 2) for (let i = 0; i < 8; i++) circ(gr, -80 + i * 23, -138, 3, Math.sin(t * 4 + i * .8) > 0 ? '#7dffe0' : '#fff');
    if (lvl >= 3) { gr.strokeStyle = `rgba(255,220,90,${.6 + Math.sin(t * 4) * .3})`; gr.lineWidth = 3; gr.strokeRect(-86, -130, 172, 130); }
    gr.restore();
  }
  function depot(gr, x, y, s, t) {
    gr.save(); gr.translate(x, y); gr.scale(s, s);
    ell(gr, 0, 2, 74, 7, 'rgba(0,0,0,.18)');
    rr(gr, -70, -104, 140, 104, 4, lin(gr, -104, 0, '#8fb3cc', '#5f87a3'));
    gr.fillStyle = '#3f6a88'; gr.beginPath(); gr.moveTo(-78, -100); gr.lineTo(0, -126); gr.lineTo(78, -100); gr.fill();
    rr(gr, -52, -70, 104, 70, 3, '#2d3c48'); const open = .5 + Math.sin(t * .6) * .1;
    gr.save(); gr.beginPath(); gr.rect(-52, -70, 104, 70); gr.clip(); truck(gr, 6, 4, 1, .9, t, true); gr.restore();
    gr.fillStyle = '#c9d6df'; gr.fillRect(-52, -70, 104, 70 * (1 - open)); gr.strokeStyle = '#9fb0bc'; gr.lineWidth = 2; for (let k = 1; k < 7; k++) { const yy = -70 + k * 10; if (yy < -70 + 70 * (1 - open)) { gr.beginPath(); gr.moveTo(-52, yy); gr.lineTo(52, yy); gr.stroke(); } }
    rr(gr, -46, -98, 92, 22, 6, '#ffd23f'); T(gr, 'SODA CO.', 0, -87, 14, '#5a3a00', 'center', null);
    gr.restore();
  }
  function truck(gr, x, y, dir, s, t, parked) {
    gr.save(); gr.translate(x, y); gr.scale(dir * s, s);
    if (!parked) ell(gr, -6, 0, 70, 6, 'rgba(0,0,0,.22)');
    rr(gr, -66, -64, 86, 50, 5, lin(gr, -64, -14, '#ffffff', '#dfe6ee')); gr.fillStyle = '#ffd23f'; gr.fillRect(-66, -30, 86, 7);
    lemonShape(gr, -24, -46, 12, -.2, 1);
    rr(gr, 20, -48, 34, 34, [3, 12, 3, 3], '#ff5a5a'); rr(gr, 30, -44, 18, 14, [2, 8, 2, 2], '#bfe6ff'); gr.fillStyle = '#ffe14d'; gr.fillRect(50, -24, 5, 5);
    for (const wx of [-44, 32]) { circ(gr, wx, -12, 11, '#2a2a2a'); circ(gr, wx, -12, 5, '#bbb'); }
    gr.restore();
  }
  function car(gr, c, t) {
    gr.save(); gr.translate(c.x, c.y); gr.scale(c.dir, 1); ell(gr, 0, 0, c.k === 'limo' ? 100 : 46, 6, 'rgba(0,0,0,.22)');
    if (c.k === 'limo') {
      rr(gr, -96, -36, 192, 26, 10, lin(gr, -36, -10, '#3a3a48', '#14141c')); rr(gr, -50, -54, 110, 22, [12, 14, 0, 0], '#22222c');
      for (let k = 0; k < 4; k++) rr(gr, -44 + k * 26, -50, 22, 14, 3, '#5a6a8a'); gr.fillStyle = '#ffe14d'; gr.fillRect(90, -30, 6, 6);
      for (const wx of [-62, 62]) { circ(gr, wx, -10, 11, '#111'); circ(gr, wx, -10, 5, '#ccc'); }
    } else if (c.k === 'truck') { gr.restore(); truck(gr, c.x, c.y, c.dir, 1, t); return; }
    else {
      rr(gr, -42, -30, 84, 20, 9, c.c); rr(gr, -26, -48, 52, 22, [12, 14, 0, 0], c.c); rr(gr, -20, -44, 18, 13, 3, '#cfeaff'); rr(gr, 2, -44, 18, 13, 3, '#cfeaff');
      gr.fillStyle = '#ffe9a0'; gr.fillRect(36, -26, 6, 5); for (const wx of [-24, 24]) { circ(gr, wx, -10, 10, '#1a1a1a'); circ(gr, wx, -10, 4, '#bbb'); }
    }
    gr.restore();
  }
  function plant(gr, x, y, s, t) {
    gr.save(); gr.translate(x, y); gr.scale(s, s);
    gr.fillStyle = '#b5563a'; gr.beginPath(); gr.moveTo(-80, 0); gr.lineTo(-80, -100); for (let i = 0; i < 4; i++) { gr.lineTo(-80 + i * 40, -126); gr.lineTo(-80 + (i + 1) * 40, -100); } gr.lineTo(80, 0); gr.fill();
    gr.fillStyle = '#d9e8f2'; for (let i = 0; i < 4; i++) { gr.beginPath(); gr.moveTo(-80 + i * 40 + 3, -102); gr.lineTo(-80 + i * 40 + 3, -120); gr.lineTo(-80 + i * 40 + 30, -104); gr.fill(); }
    gr.fillStyle = 'rgba(0,0,0,.12)'; for (let r = 0; r < 9; r++) for (let c = 0; c < 8; c++) gr.fillRect(-80 + c * 20 + (r % 2) * 10, -96 + r * 11, 18, 1.5);
    rr(gr, -66, -78, 132, 40, 4, '#203040'); gr.save(); gr.beginPath(); gr.rect(-66, -78, 132, 40); gr.clip();
    gr.fillStyle = '#5a6a7a'; gr.fillRect(-66, -48, 132, 6);
    for (let i = 0; i < 8; i++) { const bx = -80 + ((i * 24 + t * 30) % 170); gr.fillStyle = 'rgba(160,230,140,.85)'; rr(gr, bx, -70, 9, 22, [4, 4, 2, 2], 'rgba(150,230,130,.9)'); gr.fillStyle = '#ffe14d'; gr.fillRect(bx, -60, 9, 6); }
    gr.restore();
    rr(gr, -50, -28, 100, 22, 5, '#fff3d6'); T(gr, 'BOTTLING', 0, -17, 14, '#b5563a', 'center', null);
    gr.restore();
  }
  function factory(gr, x, y, s, t) {
    gr.save(); gr.translate(x, y); gr.scale(s, s);
    for (const [sx, h] of [[-58, 230], [-20, 250], [22, 220]]) { gr.fillStyle = lin(gr, -h, 0, '#c9c3bc', '#8f8780'); gr.fillRect(sx - 9, -h, 18, h); gr.fillStyle = '#e04a3a'; gr.fillRect(sx - 10, -h, 20, 8); gr.fillRect(sx - 10, -h + 16, 20, 6); }
    rr(gr, -96, -150, 150, 150, 4, lin(gr, -150, 0, '#f2e2a8', '#c9b06a'));
    gr.fillStyle = '#a8904a'; gr.fillRect(-96, -156, 150, 10);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const lit = Math.sin(t * .7 + r * 3 + c * 7) > -.2; rr(gr, -84 + c * 34, -132 + r * 38, 24, 24, 3, lit ? '#ffe9a0' : '#5a6070'); }
    gr.fillStyle = lin(gr, -120, 0, '#e8eef2', '#aab6c0'); gr.beginPath(); gr.roundRect(52, -120, 70, 120, [30, 30, 4, 4]); gr.fill();
    lemonShape(gr, 87, -70, 20, -.3, 1);
    gr.strokeStyle = '#7a8a96'; gr.lineWidth = 6; gr.beginPath(); gr.moveTo(54, -30); gr.lineTo(30, -30); gr.lineTo(30, -12); gr.stroke();
    rr(gr, -80, -20, 100, 20, [6, 6, 0, 0], '#5a5048');
    gr.restore();
  }
  function hq(gr, x, y, s, t) {
    gr.save(); gr.translate(x, y); gr.scale(s, s);
    gr.fillStyle = lin(gr, -300, 0, '#7fe0ff', '#2a7ab8'); gr.fillRect(-38, -300, 76, 300);
    gr.fillStyle = '#2a6a98'; gr.fillRect(-28, -322, 56, 24); gr.fillRect(-3, -356, 6, 36);
    circ(gr, 0, -358, 4, Math.sin(t * 4) > 0 ? '#ff4a4a' : '#7a2020');
    for (let r = 0; r < 18; r++) for (let c = 0; c < 4; c++) { const lit = Math.sin(r * 12.9 + c * 7.3 + Math.floor(t * .5 + r) * 3.1) > .2; gr.fillStyle = lit ? 'rgba(255,250,200,.85)' : 'rgba(10,40,80,.35)'; gr.fillRect(-32 + c * 17, -290 + r * 15.5, 12, 9); }
    gr.fillStyle = 'rgba(255,255,255,.18)'; gr.beginPath(); gr.moveTo(-38, -300); gr.lineTo(-14, -300); gr.lineTo(-38, -180); gr.fill();
    const sx = Math.cos(t * 1.2); gr.save(); gr.translate(0, -250); gr.scale(Math.abs(sx) < .08 ? .08 : sx, 1); lemonShape(gr, 0, 0, 30, 0, sx > 0 ? 1 : 0); gr.restore();
    rr(gr, -20, -26, 40, 26, [4, 4, 0, 0], '#1a4a6a');
    gr.restore();
  }
  function forSale(gr, x, y, cost, lbl) {
    gr.save(); gr.globalAlpha = .9; gr.fillStyle = '#8a5a2b'; gr.fillRect(x - 3, y - 54, 6, 54);
    rr(gr, x - 46, y - 82, 92, 38, 6, '#fff8e6'); gr.strokeStyle = '#d0661e'; gr.lineWidth = 2.5; gr.stroke();
    T(gr, lbl || 'FOR SALE', x, y - 71, 13, '#d0661e', 'center', null); T(gr, '$' + fmt(cost), x, y - 54, 15, '#2f7a2f', 'center', null); gr.restore();
  }
  let skinOverride = null;
  GAME.drawSkin = (gr, sk) => { gr.save(); gr.translate(0, 36); skinOverride = sk; stand(gr, 0, 0, .42, 1, 0); skinOverride = null; gr.restore(); };
  const curSkin = () => skinOverride || K.skin;
  const lvlOf = i => FAST.filter(m => S.own[i] >= m).length;

  /* ---------- draw ---------- */
  function drawScene(gr) {
    const v = K.view, t = K.t, heat = ev && ev.k === 'heat';
    gr.fillStyle = lin(gr, v.y0, 400, heat ? '#ffb15a' : '#5ec2ff', heat ? '#ffe7a8' : '#d4f3ff'); gr.fillRect(v.x0, v.y0, v.x1 - v.x0, 420 - v.y0);
    // sun
    const sx = 620, sy = 64, sr = heat ? 54 : 40; gr.save(); gr.translate(sx, sy); gr.rotate(t * .15); gr.fillStyle = heat ? 'rgba(255,170,60,.35)' : 'rgba(255,250,190,.45)';
    for (let i = 0; i < 12; i++) { gr.rotate(Math.PI / 6); gr.beginPath(); gr.moveTo(sr * .9, -7); gr.lineTo(sr * 1.9, 0); gr.lineTo(sr * .9, 7); gr.fill(); } gr.restore();
    const sg = gr.createRadialGradient(sx, sy, 4, sx, sy, sr); sg.addColorStop(0, '#fffbe0'); sg.addColorStop(1, heat ? '#ff9a2a' : '#ffe56a'); circ(gr, sx, sy, sr, sg);
    for (const c of clouds) { gr.save(); gr.translate(c.x, c.y); gr.scale(c.s, c.s); gr.fillStyle = 'rgba(255,255,255,.9)'; gr.beginPath(); gr.arc(0, 0, 22, 0, 7); gr.arc(24, -10, 28, 0, 7); gr.arc(52, 0, 22, 0, 7); gr.rect(0, 0, 52, 22); gr.fill(); gr.restore(); }
    if (S.own[6]) { const bx = ((t * 22) % 1100) - 200; gr.save(); gr.translate(bx, 160 + Math.sin(t * .8) * 6); ell(gr, 0, 0, 62, 20, '#e8e8f0'); gr.fillStyle = '#ffd23f'; gr.fillRect(-40, -6, 80, 12); T(gr, 'LEMON CO.', 0, 0, 11, '#a06a00', 'center', null); gr.fillStyle = '#c0c0d0'; gr.beginPath(); gr.moveTo(-58, 0); gr.lineTo(-78, -16); gr.lineTo(-74, 0); gr.lineTo(-78, 16); gr.fill(); rr(gr, -12, 18, 24, 9, 4, '#9090a0'); gr.restore(); }
    // skyline grows with the empire
    const total = S.own.reduce((a, b) => a + b, 0), towers = Math.min(16, Math.floor(total / 12));
    for (let i = 0; i < towers; i++) { const h = 70 + ((i * 73) % 110), x = -30 + ((i * 157) % 760), w = 34 + (i * 31) % 30; gr.fillStyle = `rgba(${130 + i % 3 * 12},${170 + i % 4 * 8},${205},.55)`; gr.fillRect(x, 392 - h - 20, w, h + 20); gr.fillStyle = 'rgba(255,255,255,.25)'; for (let r = 0; r < h / 18; r++) gr.fillRect(x + 6, 392 - h - 10 + r * 18, w - 12, 5); }
    gr.fillStyle = '#9fd88a'; gr.beginPath(); gr.moveTo(v.x0, 396); for (let x = v.x0; x <= 740; x += 40) gr.lineTo(x, 372 + Math.sin(x * .011) * 14 + Math.sin(x * .03) * 6); gr.lineTo(740, 420); gr.lineTo(v.x0, 420); gr.fill();
    // back row: plant, headquarters, factory
    gr.save(); if (!S.own[4]) gr.globalAlpha = .22; plant(gr, 342, 400, 1, t); gr.restore(); if (!S.own[4] && unlocked(4)) forSale(gr, 342, 400, costOf(4, 1));
    gr.save(); if (!S.own[6]) gr.globalAlpha = .18; hq(gr, 474, 400, 1, t); gr.restore(); if (!S.own[6] && unlocked(6)) forSale(gr, 474, 400, costOf(6, 1));
    gr.save(); if (!S.own[5]) gr.globalAlpha = .22; factory(gr, 611, 400, 1, t); gr.restore(); if (!S.own[5] && unlocked(5)) forSale(gr, 611, 400, costOf(5, 1));
    for (const p of puffs) { gr.globalAlpha = Math.max(0, .75 - p.t / 3.5 * .75); circ(gr, p.x, p.y, p.r, '#fffbe8'); } gr.globalAlpha = 1;
    // grass, sidewalk
    gr.fillStyle = '#6cc46a'; gr.fillRect(v.x0, 396, 740 - v.x0, 22);
    gr.fillStyle = lin(gr, 410, 508, '#e9e1d2', '#d4c9b4'); gr.fillRect(v.x0, 412, 740 - v.x0, 98);
    gr.strokeStyle = 'rgba(120,100,70,.15)'; gr.lineWidth = 2; for (let x = Math.floor(v.x0 / 60) * 60; x < 740; x += 60) { gr.beginPath(); gr.moveTo(x, 412); gr.lineTo(x - 20, 508); gr.stroke(); }
    // shops
    const unk = (i, x) => { if (unlocked(i)) forSale(gr, x, GROUND, costOf(i, 1)); else { gr.save(); gr.globalAlpha = .5; forSale(gr, x, GROUND, costOf(i, 1), 'SOON'); gr.restore(); } };
    if (S.own[0]) stand(gr, SHOPX[0], GROUND, 1, lvlOf(0), t); else unk(0, SHOPX[0]);
    if (S.own[1]) cart(gr, SHOPX[1], GROUND, 1, lvlOf(1), t); else unk(1, SHOPX[1]);
    if (S.own[2]) bar(gr, SHOPX[2], GROUND, 1, lvlOf(2), t); else unk(2, SHOPX[2]);
    if (S.own[3]) depot(gr, DEPOT, GROUND - 6, .9, t); else unk(3, DEPOT);
    // progress rings over shops that are running
    for (let i = 0; i < 4; i++) {
      if (!S.own[i]) continue; const x = i < 3 ? SHOPX[i] : DEPOT, y = GROUND + 2;
      if (prog[i] > 0 && cycle(i) > .3) { gr.lineWidth = 5; gr.strokeStyle = 'rgba(0,0,0,.25)'; gr.beginPath(); gr.arc(x + 62, y - 14, 10, 0, 7); gr.stroke(); gr.strokeStyle = '#5fd36a'; gr.beginPath(); gr.arc(x + 62, y - 14, 10, -Math.PI / 2, -Math.PI / 2 + prog[i] * 6.283); gr.stroke(); }
      else if (!S.mgr[i] && prog[i] === 0 && i < 3) { const b = Math.abs(Math.sin(t * 4)) * 6; rr(gr, x - 34, y - 196 - b, 68, 28, 14, '#fff'); T(gr, 'TAP!', x, y - 182 - b, 16, '#e05a00', 'center', null); }
    }
    // customers
    const ps = peeps.slice().sort((a, b) => a.y - b.y); for (const p of ps) person(gr, p, t);
    if (celebP) { const c = celebP, x = c.x, y = 506; person(gr, { x, y, dir: -1, st: 'wait', ph: 0, skin: '#e0a77e', hair: '#ffcf2e', shirt: '#a24bff', pants: '#222', gold: false }, t); gr.fillStyle = '#111'; gr.fillRect(x - 9, y - 47, 9, 4); T(gr, '★', x, y - 70 + Math.sin(t * 3) * 3, 22, '#ffcf2e', 'center', null); if (Math.random() < .25) circ(gr, x + K.rand(-120, 60), y - K.rand(20, 80), K.rand(6, 14), 'rgba(255,255,255,.9)'); }
    // road
    gr.fillStyle = '#b9b0a0'; gr.fillRect(v.x0, 508, 740 - v.x0, 8);
    gr.fillStyle = lin(gr, 516, 600, '#5a5f66', '#44484e'); gr.fillRect(v.x0, 516, 740 - v.x0, 84);
    gr.fillStyle = '#f4f4f4'; for (let x = Math.floor(v.x0 / 70) * 70; x < 740; x += 70) gr.fillRect(x, 556, 36, 5);
    for (const c of cars.slice().sort((a, b) => a.y - b.y)) car(gr, c, t);
    gr.fillStyle = '#c9c0b0'; gr.fillRect(v.x0, 600, 740 - v.x0, 14); gr.fillStyle = '#6cc46a'; gr.fillRect(v.x0, 614, 740 - v.x0, v.y1 - 614);
    if (heat) { gr.save(); gr.globalAlpha = .18; gr.strokeStyle = '#fff'; gr.lineWidth = 2; for (let i = 0; i < 10; i++) { const x = (i * 83) % 720, y = 300 + (i * 47) % 200; gr.beginPath(); for (let k = 0; k < 6; k++) gr.lineTo(x + Math.sin(t * 4 + k + i) * 4, y - k * 10); gr.stroke(); } gr.restore(); }
    // lemon rain
    for (const l of rainL) { if (l.got) { gr.globalAlpha = Math.max(0, 1 - l.got); lemonShape(gr, l.x, l.y - l.got * 60, 16 * (1 + l.got), l.r, 0); gr.globalAlpha = 1; } else { gr.globalAlpha = l.t > 5 ? Math.max(0, (7 - l.t) / 2) : 1; lemonShape(gr, l.x, l.y, 18, l.r, 1); gr.globalAlpha = 1; } }
    // the big lemon
    const L = LEMON, by = Math.sin(t * 2) * 5, glow = gr.createRadialGradient(L.x, L.y + by, 20, L.x, L.y + by, L.r * 1.6);
    glow.addColorStop(0, 'rgba(255,240,120,.55)'); glow.addColorStop(1, 'rgba(255,240,120,0)'); circ(gr, L.x, L.y + by, L.r * 1.6, glow);
    lemonShape(gr, L.x, L.y + by, L.r * (hover === 'lemon' ? 1.04 : 1), -.25 + Math.sin(t * 1.3) * .06, tapS[0] > 1.05 ? 2 : 1, tapS);
    for (const j of juice) { gr.globalAlpha = 1 - j.t / .7; circ(gr, j.x, j.y, j.r, '#ffe14d'); } gr.globalAlpha = 1;
    if (combo > 4) { const a = Math.min(1, combo / 10); gr.globalAlpha = a; T(gr, combo >= 40 ? 'MAX JUICE ×2!' : `Juicy ×${(1 + Math.min(combo, 40) / 40).toFixed(2)}`, L.x, L.y + L.r + 18, 18, combo >= 40 ? '#ff6a00' : '#c97a00', 'center', 'rgba(255,255,255,.8)'); gr.globalAlpha = 1; }
  }
  function drawCash(gr) {
    const b = CASH, s = 1 + bump * .06;
    rr(gr, b.x, b.y + 5, b.w, b.h, 22, 'rgba(0,60,90,.18)'); rr(gr, b.x, b.y, b.w, b.h, 22, lin(gr, b.y, b.y + b.h, '#ffffff', '#eef9ff'));
    gr.save(); gr.translate(b.x + 22, b.y + 40); gr.scale(s, s); T(gr, '$' + fmt(shown), 0, 0, 44, '#23852f', 'left', 'rgba(0,80,20,.15)'); gr.restore();
    T(gr, `$${fmt(perSec())}/sec`, b.x + 22, b.y + 78, 18, '#4a7a8a', 'left', null);
    const gx = b.x + b.w - 16; gr.font = fnt(18); const gw = Math.max(60, gr.measureText(`${S.gold}`).width + 46);
    rr(gr, gx - gw, b.y + 64, gw, 28, 14, '#fff3c4'); lemonShape(gr, gx - gw + 16, b.y + 78, 10, -.3, 0); T(gr, `${S.gold}`, gx - 12, b.y + 78, 18, '#b07800', 'right', null);
    if (S.boost > 0) { rr(gr, gx - 112, b.y + 12, 112, 28, 14, '#5fd36a'); T(gr, `2× ${Math.floor(S.boost / 60)}:${String(Math.floor(S.boost % 60)).padStart(2, '0')}`, gx - 56, b.y + 26, 16, '#fff', 'center', 'rgba(0,0,0,.2)'); }
    for (const bl of bills) { const k = bl.t, e = k * k, x = K.lerp(bl.x0, bl.x1, e), y = K.lerp(bl.y0, bl.y1, e) - Math.sin(k * Math.PI) * 80; gr.save(); gr.translate(x, y); gr.rotate(bl.a + k * 4); gr.globalAlpha = k > .85 ? (1 - k) / .15 : 1; rr(gr, -12, -7, 24, 14, 2, '#7bd88a'); gr.strokeStyle = '#2f7a3a'; gr.lineWidth = 1.5; gr.stroke(); circ(gr, 0, 0, 4, '#2f9e3a'); gr.restore(); }
  }
  function drawBottom(gr) {
    const t = K.t;
    // next goal (the closest unfinished trophy, or the tutorial step)
    const g = GOAL; rr(gr, g.x, g.y + 4, g.w, g.h, 18, 'rgba(0,0,0,.2)'); rr(gr, g.x, g.y, g.w, g.h, 18, lin(gr, g.y, g.y + g.h, '#fffdf2', '#fff1c8'));
    let gi = -1, best = -1; ACH.forEach((a, i) => { if (S.ach[i]) return; const p = Math.min(.999, a[2]() / a[3]); if (p > best) { best = p; gi = i; } });
    if (gi >= 0) {
      const a = ACH[gi]; trophy(gr, g.x + 38, g.y + 46, 24, false, best);
      T(gr, 'NEXT TROPHY', g.x + 72, g.y + 20, 13, '#c08a00', 'left', null); T(gr, a[0], g.x + 72, g.y + 42, 20, '#4a3a10', 'left', null);
      T(gr, a[1], g.x + 72, g.y + 64, 14, '#8a7a50', 'left', null);
      rr(gr, g.x + 72, g.y + 76, g.w - 150, 8, 4, '#f0dca0'); rr(gr, g.x + 72, g.y + 76, Math.max(8, (g.w - 150) * best), 8, 4, '#ffb300');
      T(gr, `+${a[4]}`, g.x + g.w - 46, g.y + 46, 20, '#c08a00', 'right', null); coinI(gr, g.x + g.w - 30, g.y + 46, 10);
    } else T(gr, 'Every trophy won!', g.x + g.w / 2, g.y + g.h / 2, 22, '#c08a00');
    // daily gift
    const gb = GIFT, ready = giftReady(), wob = ready ? Math.sin(t * 6) * .08 * (Math.sin(t * 1.5) > .3 ? 1 : 0) : 0;
    btn(gr, gb, ready ? '#ff8ac2' : '#d8dde4', ready ? '#e8508f' : '#b4bcc6', true, 18);
    gr.save(); gr.translate(gb.x + 40, gb.y + 44); gr.rotate(wob); rr(gr, -20, -12, 40, 30, 4, ready ? '#ffe14d' : '#eef1f5'); rr(gr, -23, -20, 46, 12, 3, ready ? '#ffcf2e' : '#e0e4ea'); gr.fillStyle = ready ? '#e8304a' : '#9aa4b0'; gr.fillRect(-4, -20, 8, 38); gr.beginPath(); gr.ellipse(-8, -24, 9, 6, -.5, 0, 7); gr.ellipse(8, -24, 9, 6, .5, 0, 7); gr.fill(); gr.restore();
    if (S.tut < TUT.length) { T(gr, 'Gift', gb.x + 104, gb.y + 34, 18, '#fff'); T(gr, 'soon', gb.x + 104, gb.y + 58, 15, '#fff', 'center', null); }
    else if (ready) { T(gr, 'Daily', gb.x + 104, gb.y + 32, 18, '#fff'); T(gr, 'gift!', gb.x + 104, gb.y + 56, 18, '#fff'); }
    else { const ms = (today() + 1) * 864e5 + new Date().getTimezoneOffset() * 6e4 - Date.now(), h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4); T(gr, 'Next in', gb.x + 104, gb.y + 32, 15, '#fff', 'center', null); T(gr, `${h}h ${m}m`, gb.x + 104, gb.y + 56, 17, '#fff'); }
    // 2x boost
    const bb = BOOST, can = K.save.coins >= 5 || K.bot; btn(gr, bb, can ? '#7be37f' : '#c8d0d8', can ? '#36a845' : '#a8b2bc', true, 18);
    T(gr, S.boost > 0 ? '+5 min' : '2× PROFIT', bb.x + bb.w / 2, bb.y + 28, 20, '#fff'); coinI(gr, bb.x + 56, bb.y + 60, 11); T(gr, `5  (${K.save.coins})`, bb.x + 72, bb.y + 60, 17, '#fff', 'left');
  }
  function coinI(gr, x, y, r) { const g = gr.createRadialGradient(x - r * .3, y - r * .3, 1, x, y, r); g.addColorStop(0, '#fff6c4'); g.addColorStop(.5, '#ffcf2e'); g.addColorStop(1, '#c98a00'); circ(gr, x, y, r, g); gr.strokeStyle = 'rgba(150,90,0,.6)'; gr.lineWidth = 1.5; gr.beginPath(); gr.arc(x, y, r * .62, 0, 7); gr.stroke(); }
  function trophy(gr, x, y, s, got, p) {
    gr.save(); gr.translate(x, y); const c1 = got ? '#ffe56a' : '#c8ced6', c2 = got ? '#d89a00' : '#8f98a3';
    if (got) { gr.fillStyle = 'rgba(255,230,100,.35)'; gr.beginPath(); gr.arc(0, -2, s * 1.05, 0, 7); gr.fill(); }
    gr.strokeStyle = c2; gr.lineWidth = s * .14; gr.beginPath(); gr.arc(-s * .55, -s * .35, s * .26, Math.PI * .5, Math.PI * 1.5); gr.arc(s * .55, -s * .35, s * .26, -Math.PI * .5, Math.PI * .5); gr.stroke();
    gr.fillStyle = lin(gr, -s * .7, s * .2, c1, c2); gr.beginPath(); gr.moveTo(-s * .55, -s * .7); gr.lineTo(s * .55, -s * .7); gr.quadraticCurveTo(s * .55, s * .2, 0, s * .25); gr.quadraticCurveTo(-s * .55, s * .2, -s * .55, -s * .7); gr.fill();
    gr.fillRect(-s * .1, s * .2, s * .2, s * .3); rr(gr, -s * .38, s * .46, s * .76, s * .22, 3, c2);
    if (got) { gr.fillStyle = 'rgba(255,255,255,.6)'; gr.fillRect(-s * .36, -s * .62, s * .12, s * .5); }
    gr.restore();
  }
  function bizIcon(gr, i, x, y, r) {
    const g = gr.createRadialGradient(x - r * .3, y - r * .4, 2, x, y, r); g.addColorStop(0, '#fffbe8'); g.addColorStop(1, ['#ffe9a0', '#ffd2a0', '#ffc8e0', '#cfe6ff', '#f4c8b8', '#efe2b0', '#c8ecff'][i]); circ(gr, x, y, r, g);
    gr.save(); gr.beginPath(); gr.arc(x, y, r - 2, 0, 7); gr.clip(); const t = K.t;
    if (i === 0) stand(gr, x - 4, y + r * .62, .3, 0, t); else if (i === 1) cart(gr, x, y + r * .62, .3, 0, t); else if (i === 2) bar(gr, x + 3, y + r * .65, .27, 0, t);
    else if (i === 3) truck(gr, x + 2, y + r * .45, 1, .42, t); else if (i === 4) plant(gr, x, y + r * .6, .32, t); else if (i === 5) factory(gr, x + 4, y + r * .7, .2, t); else hq(gr, x, y + r * .9 + 40, .2, t);
    gr.restore();
  }
  function drawPanel(gr) {
    const P = PANEL, t = K.t;
    rr(gr, P.x, P.y + 6, P.w, P.h, 24, 'rgba(0,40,60,.25)'); rr(gr, P.x, P.y, P.w, P.h, 24, lin(gr, P.y, P.y + P.h, '#235a7c', '#173d57'));
    const labels = ['Shops', 'Upgrades', 'Trophies', 'Franchise'];
    const badge = [0, upgList().filter(u => UPG[u].cost <= S.cash).length, newAch, goldFor() > 0 ? '!' : 0];
    for (let i = 0; i < 4; i++) {
      const b = TAB(i), on = tab === i; if (on) btn(gr, b, '#ffe46a', '#ffb92e', true, 14); else rr(gr, b.x, b.y, b.w, b.h - 4, 14, 'rgba(255,255,255,.08)');
      T(gr, labels[i], b.x + b.w / 2, b.y + 20, 19, on ? '#6a3c00' : '#d7ecf8', 'center', on ? 'rgba(255,255,255,.4)' : null);
      if (badge[i]) { circ(gr, b.x + b.w - 8, b.y + 4, 11, '#ff4a5a'); T(gr, String(badge[i]), b.x + b.w - 8, b.y + 4, 13, '#fff', 'center', null); }
    }
    if (tab === 0) panelShops(gr, t); else if (tab === 1) panelUpg(gr); else if (tab === 2) panelAch(gr); else panelFr(gr, t);
  }
  function rowBg(gr, r, i, hl) { rr(gr, r.x, r.y + 3, r.w, r.h, 16, 'rgba(0,0,0,.18)'); rr(gr, r.x, r.y, r.w, r.h, 16, hl ? '#2f7aa2' : '#215574'); gr.save(); gr.globalAlpha = .08; rr(gr, r.x + 4, r.y + 3, r.w - 8, r.h * .4, 12, '#fff'); gr.restore(); if (focus === i) { gr.strokeStyle = '#ffe46a'; gr.lineWidth = 3; rr(gr, r.x, r.y, r.w, r.h, 16); gr.stroke(); } }
  function panelShops(gr, t) {
    btn(gr, BUYN, '#4fb0e0', '#2f7fb8', true, 12); T(gr, `Buy ×${buyN === 'max' ? 'MAX' : buyN}`, BUYN.x + BUYN.w / 2, BUYN.y + 15, 18, '#fff');
    T(gr, `Managers ${mgrs()}/7  ·  bonus ×${(cache.ach * (1 + S.gold * .1)).toFixed(2)}`, PX + 534, 90, 16, '#a8cfe4', 'right', null);
    let shownLocked = false;
    for (let i = 0; i < 7; i++) {
      const r = ROW(i), owned = S.own[i] > 0;
      if (!unlocked(i)) { if (shownLocked) continue; shownLocked = true; rr(gr, r.x, r.y, r.w, r.h, 16, 'rgba(255,255,255,.05)'); T(gr, `🔒  ${BIZ[i].n}`, r.x + 24, r.y + r.h / 2, 20, 'rgba(255,255,255,.4)', 'left', null); T(gr, 'Buy the one above first', r.x + r.w - 20, r.y + r.h / 2, 15, 'rgba(255,255,255,.3)', 'right', null); continue; }
      rowBg(gr, r, i, hover === i);
      bizIcon(gr, i, r.x + 38, r.y + 35, 29);
      rr(gr, r.x + 14, r.y + 52, 48, 20, 10, '#ffe46a'); T(gr, String(S.own[i]), r.x + 38, r.y + 62, 15, '#6a3c00', 'center', null);
      T(gr, BIZ[i].n, r.x + 78, r.y + 19, 19, '#fff', 'left');
      const nm = MILES.find(m => S.own[i] < m);
      if (nm && owned) { gr.font = fnt(19); const nx = r.x + 84 + gr.measureText(BIZ[i].n).width; T(gr, `${S.own[i]}/${nm}`, nx, r.y + 20, 14, '#ffd27a', 'left', null); }
      const bx = r.x + 78, bw = r.w - 78 - 236, by = r.y + 36;
      rr(gr, bx, by, bw, 26, 13, '#0f2c3f');
      const p = cycle(i) < .3 && prog[i] > 0 ? 1 : prog[i];
      if (p > 0) { rr(gr, bx, by, Math.max(26, bw * p), 26, 13, lin(gr, by, by + 26, curSkin().c[0], '#e0a800')); gr.save(); rr(gr, bx, by, Math.max(26, bw * p), 26, 13); gr.clip(); gr.fillStyle = 'rgba(255,255,255,.3)'; const sx = bx + ((t * 120) % (bw + 60)) - 30; gr.beginPath(); gr.moveTo(sx, by); gr.lineTo(sx + 16, by); gr.lineTo(sx + 6, by + 26); gr.lineTo(sx - 10, by + 26); gr.fill(); gr.restore(); }
      if (owned) T(gr, `$${fmt(revenue(i))}`, bx + bw / 2, by + 13, 16, '#fff', 'center', 'rgba(0,0,0,.45)');
      if (owned && !S.mgr[i] && prog[i] === 0) { gr.globalAlpha = .6 + Math.sin(t * 5) * .4; T(gr, '▶ tap', bx + bw - 8, by - 1, 13, '#ffe46a', 'right', null); gr.globalAlpha = 1; }
      else if (owned) { const left = cycle(i) * (1 - prog[i]); T(gr, cycle(i) < .3 ? 'fast!' : left < 60 ? left.toFixed(1) + 's' : `${Math.floor(left / 60)}m ${Math.floor(left % 60)}s`, bx + bw - 6, by - 1, 13, '#9ac8e0', 'right', null); }
      const mb = MGRB(r);
      if (owned && !S.mgr[i]) { const can = S.cash >= MGR[i]; btn(gr, mb, '#c07bff', '#8a3ee0', can, 12); T(gr, 'Manager', mb.x + mb.w / 2, mb.y + 16, 15, '#fff', 'center', null); T(gr, '$' + fmt(MGR[i]), mb.x + mb.w / 2, mb.y + 36, 16, can ? '#fff' : '#c8d0d8', 'center', null); }
      else if (S.mgr[i]) { const mx = mb.x + mb.w / 2; circ(gr, mx, r.y + 26, 12, '#f1c7a5'); gr.fillStyle = '#3a2410'; gr.beginPath(); gr.arc(mx, r.y + 23, 12.5, Math.PI, 0); gr.fill(); rr(gr, mx - 14, r.y + 38, 28, 16, 6, '#3a4a6a'); gr.fillStyle = '#e8304a'; gr.beginPath(); gr.moveTo(mx - 3, r.y + 38); gr.lineTo(mx + 3, r.y + 38); gr.lineTo(mx, r.y + 50); gr.fill(); T(gr, 'AUTO', mx, r.y + 62, 12, '#9affb0', 'center', null); }
      const n = buyCount(i), c = costOf(i, n), can = c <= S.cash, bb = BUYB(r);
      btn(gr, bb, owned ? '#7be37f' : '#ffd23f', owned ? '#36a845' : '#e0a000', can, 14);
      T(gr, owned ? `Buy ×${n}` : 'Open!', bb.x + bb.w / 2, bb.y + 16, 15, can ? '#fff' : '#c8d0d8', 'center', can ? 'rgba(0,0,0,.25)' : null); T(gr, '$' + fmt(c), bb.x + bb.w / 2, bb.y + 36, 19, can ? '#fff' : '#c8d0d8', 'center', can ? 'rgba(0,0,0,.25)' : null);
    }
  }
  function panelUpg(gr) {
    T(gr, `Upgrades last until you franchise  ·  ${S.upg.length}/${UPG.length} bought`, PX + 20, 91, 16, '#a8cfe4', 'left', null);
    const list = upgList();
    if (!list.length) T(gr, 'You bought every upgrade!', PX + 272, 300, 24, '#ffe46a');
    list.forEach((u, k) => {
      const U = UPG[u], r = ROW(k), can = S.cash >= U.cost; rowBg(gr, r, k, false);
      if (U.b >= 0) bizIcon(gr, U.b, r.x + 38, r.y + 35, 29); else { circ(gr, r.x + 38, r.y + 35, 29, U.b === -1 ? '#ffe9a0' : '#d8f5d0'); if (U.b === -1) T(gr, '★', r.x + 38, r.y + 36, 34, '#ffb300', 'center', null); else lemonShape(gr, r.x + 38, r.y + 36, 18, -.3, 2); }
      T(gr, U.n, r.x + 78, r.y + 22, 19, '#fff', 'left'); T(gr, U.d, r.x + 78, r.y + 48, 16, '#ffd27a', 'left', null);
      const bb = BUYB(r); btn(gr, bb, '#7be37f', '#36a845', can, 14); T(gr, 'Buy', bb.x + bb.w / 2, bb.y + 16, 15, can ? '#fff' : '#c8d0d8', 'center', null); T(gr, '$' + fmt(U.cost), bb.x + bb.w / 2, bb.y + 36, 19, can ? '#fff' : '#c8d0d8', 'center', null);
    });
  }
  function panelAch(gr) {
    const n = Object.keys(S.ach).length; T(gr, `${n}/${ACH.length} trophies  ·  +${n * 2}% profit`, PX + 20, 91, 17, '#ffe46a', 'left', null);
    btn(gr, PGL, '#4fb0e0', '#2f7fb8', true, 12); btn(gr, PGR, '#4fb0e0', '#2f7fb8', true, 12); T(gr, '◀', PGL.x + 27, PGL.y + 15, 18, '#fff'); T(gr, '▶', PGR.x + 27, PGR.y + 15, 18, '#fff');
    T(gr, `${page + 1}/4`, PGL.x - 12, 91, 16, '#a8cfe4', 'right', null);
    const order = ACH.map((a, i) => i).sort((a, b) => (S.ach[a] ? 1 : 0) - (S.ach[b] ? 1 : 0) || Math.min(1, ACH[b][2]() / ACH[b][3]) - Math.min(1, ACH[a][2]() / ACH[a][3]));
    order.slice(page * 7, page * 7 + 7).forEach((ai, k) => {
      const a = ACH[ai], r = ROW(k), got = !!S.ach[ai], p = Math.min(1, a[2]() / a[3]); rowBg(gr, r, -1, false);
      trophy(gr, r.x + 38, r.y + 38, 26, got, p);
      T(gr, a[0], r.x + 78, r.y + 20, 19, got ? '#ffe46a' : '#fff', 'left'); T(gr, a[1], r.x + 78, r.y + 44, 15, '#a8cfe4', 'left', null);
      if (!got) { rr(gr, r.x + 78, r.y + 56, 250, 8, 4, '#0f2c3f'); rr(gr, r.x + 78, r.y + 56, Math.max(8, 250 * p), 8, 4, '#ffb300'); }
      if (got) T(gr, '✓ WON', r.x + r.w - 24, r.y + r.h / 2, 18, '#9affb0', 'right', null); else { coinI(gr, r.x + r.w - 34, r.y + r.h / 2, 11); T(gr, `+${a[4]}`, r.x + r.w - 52, r.y + r.h / 2, 18, '#ffe46a', 'right', null); }
    });
  }
  function panelFr(gr, t) {
    const g = goldFor(), cx = PX + 272;
    T(gr, 'Franchise your empire', cx, 98, 26, '#ffe46a');
    const gl = gr.createRadialGradient(cx, 210, 10, cx, 210, 110); gl.addColorStop(0, 'rgba(255,220,80,.5)'); gl.addColorStop(1, 'rgba(255,220,80,0)'); circ(gr, cx, 210, 110, gl);
    gr.save(); gr.translate(cx, 210); gr.rotate(t * .3); gr.fillStyle = 'rgba(255,240,150,.25)'; for (let i = 0; i < 10; i++) { gr.rotate(Math.PI / 5); gr.beginPath(); gr.moveTo(40, -8); gr.lineTo(100, 0); gr.lineTo(40, 8); gr.fill(); } gr.restore();
    lemonShape(gr, cx, 210 + Math.sin(t * 2) * 4, 54, -.3, 1);
    T(gr, `You have ${S.gold} Golden Lemon${S.gold === 1 ? '' : 's'}: +${S.gold * 10}% profit`, cx, 302, 19, '#fff');
    T(gr, 'Start over with $0, but keep your Golden Lemons,', cx, 340, 16, '#a8cfe4', 'center', null); T(gr, 'trophies and daily streak. Each lemon: +10% profit.', cx, 362, 16, '#a8cfe4', 'center', null);
    T(gr, `Earned this run: $${fmt(S.total)}`, cx, 400, 17, '#ffd27a', 'center', null);
    const on = g >= 1; btn(gr, FRB, frConfirm > 0 ? '#ff8a6a' : '#ffe46a', frConfirm > 0 ? '#e04a2a' : '#e0a000', on, 20);
    T(gr, on ? (frConfirm > 0 ? 'Tap again to franchise!' : `Franchise: +${g} Golden Lemon${g > 1 ? 's' : ''}`) : 'Not ready yet', FRB.x + FRB.w / 2, FRB.y + 26, 21, on ? '#fff' : '#c8d0d8');
    T(gr, on ? `New bonus: +${(S.gold + g) * 10}% profit` : `First lemon at $${fmt(Math.pow(g + 1, 2) * 1e8)} earned`, FRB.x + FRB.w / 2, FRB.y + 52, 15, on ? '#fff' : '#c8d0d8', 'center', null);
    if (on) T(gr, `Next lemon at $${fmt(Math.pow(g + 1, 2) * 1e8)} earned`, cx, 536, 15, '#a8cfe4', 'center', null);
    T(gr, `Franchises: ${S.runs || 0}   ·   Lifetime: $${fmt(st('life'))}   ·   Squeezes: ${st('taps')}`, cx, 600, 15, '#7fa8c0', 'center', null);
  }
  function drawHints(gr) {
    if (K.bot || S.tut >= TUT.length || away) return;
    const step = S.tut, msg = TUT[step][0], t = K.t; let tx, ty, dir = 1;
    if (step === 0) { tx = LEMON.x + 40; ty = LEMON.y + 30; }
    else if (step === 1) { const r = ROW(0), b = BUYB(r); tx = b.x + 30; ty = b.y + b.h; }
    else if (step === 2) { tx = SHOPX[0]; ty = GROUND - 60; }
    else if (step === 3) { const r = ROW(1), b = BUYB(r); tx = b.x + 30; ty = b.y + b.h; }
    else { const r = ROW(0), b = MGRB(r); tx = b.x + 30; ty = b.y + b.h; }
    if (step >= 1 && step !== 2 && tab !== 0) { tx = TAB(0).x + 60; ty = TAB(0).y + 40; }
    const a = Math.min(1, hint * 2), bob = Math.sin(t * 6) * 8; gr.save(); gr.globalAlpha = a;
    gr.save(); gr.translate(tx + 10, ty + 12 + bob); gr.rotate(-.5); gr.fillStyle = '#fff'; gr.strokeStyle = '#333'; gr.lineWidth = 3; gr.beginPath(); gr.moveTo(0, 0); gr.lineTo(-12, 22); gr.lineTo(-4, 20); gr.lineTo(-6, 38); gr.lineTo(6, 38); gr.lineTo(4, 20); gr.lineTo(12, 22); gr.closePath(); gr.fill(); gr.stroke(); gr.restore();
    gr.font = fnt(20); const w = gr.measureText(msg).width + 36, bx = K.clamp(tx - w / 2, 8, 1272 - w), byy = Math.min(ty + 56 + bob * .3, 660);
    rr(gr, bx, byy, w, 40, 20, 'rgba(30,30,40,.88)'); T(gr, msg, bx + w / 2, byy + 20, 20, '#fff', 'center', null); gr.restore();
  }
  function drawBanners(gr) {
    const b = banners[0]; if (b && b.t > 0) {
      const k = b.t < .25 ? b.t / .25 : b.t > 2.8 ? (3.2 - b.t) / .4 : 1, y = 124 + (1 - Math.min(1, k)) * -30;
      gr.save(); gr.globalAlpha = Math.max(0, Math.min(1, k)); gr.font = fnt(26); const w = Math.max(gr.measureText(b.s).width, (gr.font = fnt(16), gr.measureText(b.sub).width)) + 60, x = 372 - w / 2;
      rr(gr, x, y + 5, w, 66, 20, 'rgba(0,0,0,.2)'); rr(gr, x, y, w, 66, 20, b.c); gr.globalAlpha *= .25; rr(gr, x + 6, y + 4, w - 12, 24, 14, '#fff'); gr.globalAlpha = Math.max(0, Math.min(1, k));
      T(gr, b.s, 372, y + 24, 26, '#fff', 'center', 'rgba(0,0,0,.25)'); T(gr, b.sub, 372, y + 50, 16, '#fff', 'center', null); gr.restore();
    }
    if (ev && ev.d && !(b && b.t > 0)) {
      const c = { heat: '#ff6a1a', celeb: '#a24bff', rain: '#e0b800', gold: '#e0a800' }[ev.k], s = { heat: 'HEATWAVE  2× speed', celeb: 'CELEBRITY  ×3 profit', rain: 'LEMON RAIN  tap them!', gold: 'GOLDEN CUSTOMER  tap!' }[ev.k];
      const w = 300, x = 372 - w / 2, y = 124; rr(gr, x, y, w, 38, 19, c); rr(gr, x + 8, y + 28, (w - 16) * Math.max(0, ev.t / ev.d), 5, 3, 'rgba(255,255,255,.7)'); T(gr, s, 372, y + 15, 17, '#fff', 'center', 'rgba(0,0,0,.25)');
    }
  }
  function drawPops(gr) { for (const p of pops) { const k = p.t; gr.globalAlpha = k > .7 ? Math.max(0, (1.1 - k) / .4) : 1; const s = k < .1 ? .6 + k * 4 : 1; gr.font = fnt(Math.round(p.size * s)); gr.textAlign = 'center'; gr.textBaseline = 'middle'; gr.lineWidth = 5; gr.strokeStyle = 'rgba(255,255,255,.9)'; gr.strokeText(p.s, p.x, p.y - k * 50); gr.fillStyle = p.c; gr.fillText(p.s, p.x, p.y - k * 50); } gr.globalAlpha = 1; }
  function drawAway(gr) {
    const v = K.view, b = AWAY, t = K.t; gr.fillStyle = 'rgba(10,30,50,.55)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    rr(gr, b.x, b.y + 8, b.w, b.h, 28, 'rgba(0,0,0,.25)'); rr(gr, b.x, b.y, b.w, b.h, 28, lin(gr, b.y, b.y + b.h, '#ffffff', '#fff6d8'));
    T(gr, 'Welcome back!', 640, b.y + 48, 38, '#2f8a3a'); T(gr, `Your managers worked for ${Math.floor(away.secs / 3600)}h ${Math.floor(away.secs % 3600 / 60)}m`, 640, b.y + 96, 20, '#6a6a5a', 'center', null);
    lemonShape(gr, 520, b.y + 160, 30, -.3 + Math.sin(t * 3) * .1, 1); T(gr, '+$' + fmt(away.earned), 660, b.y + 160, 46, '#23852f', 'center', 'rgba(0,80,20,.15)');
    const cb = { x: 520, y: b.y + 214, w: 240, h: 62 }; btn(gr, cb, '#7be37f', '#36a845', true, 20); T(gr, 'Collect', 640, cb.y + 28, 26, '#fff');
  }
  GAME.draw = gr => {
    drawScene(gr); drawCash(gr); drawBottom(gr); drawPanel(gr); drawPops(gr); drawBanners(gr); drawHints(gr);
    if (away) drawAway(gr);
  };
})();
