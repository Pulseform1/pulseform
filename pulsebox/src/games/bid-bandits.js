/* Bid Bandits: buy storage lockers at auction, then sell what is inside from your own shop.
   AUCTION: every morning a yard puts up three lockers. Shine your flashlight inside for a few seconds to see what is
   there (boxes hide their contents), then bid live against rival bidders: each has a style and a face that gives away
   how close they are to quitting. Bid, or jump-bid to scare them off, or walk away. Win and the door rolls up.
   STORE: your finds go on the shelves. Customers come to the counter with an offer; accept, counter, or send them away.
   Collectors pay more for what they collect, bargain hunters lowball, and now and then a superfan will pay anything.
   UPGRADES: more shelves, a brighter sign, display lights, an appraiser, a truck for the big stuff, and buyer's licenses
   for crazier yards: estate garages, shipping containers, celebrity vaults, and the Lost & Legendary auction. */
const GAME = {
  id: 'bid-bandits', title: 'Bid Bandits', tagline: 'Win the locker. Flip the loot. Get rich.',
  font: 'Luckiest Guy', accent: '#ffb347', accent2: '#5cf2a0', bg: '#1a1410', noHud: true, noSkins: true, scoreLabel: 'Net worth ($)',
  how: [
    'AUCTION: drag the flashlight over the locker to see what is inside (boxes hide things). Then BID, JUMP BID to scare rivals, or PASS. Watch their faces.',
    'Win and the door rolls up. Big things (cars, pianos, statues) need the truck, or the scrapper buys them cheap.',
    'STORE: customers bring an item to the counter and make an offer. ACCEPT, COUNTER (they may walk), or NO. Collectors pay more for their thing.',
    'Every evening: pay rent and buy upgrades. Buyer\'s licenses open crazier yards. Fifteen days to build an empire.',
  ],
  skins: [{ name: 'Classic', price: 0 }],
};
(() => {
  'use strict';
  const TAU = Math.PI * 2, cl = (v, a, b) => v < a ? a : v > b ? b : v, lp = (a, b, k) => a + (b - a) * k, R = Math.random, rint = (a, b) => Math.floor(a + R() * (b - a + 1)), pick = a => a[Math.floor(R() * a.length)];
  const money = v => '$' + Math.round(v).toLocaleString('en-US');
  const DAYS = 15, STORE_T = 80;
  // what turns up, yard by yard: [icon, name, value, category, big]
  const YARDS = [
    { k: 'storage', name: 'Pinewood Self-Storage', lic: 0, inc: 10, open: [40, 90], n: [6, 8], col: '#c8783a',
      pool: [['🧸', 'Teddy bear', 15, 'toys'], ['📻', 'Old radio', 40, 'tech'], ['🎮', 'Game console', 140, 'tech'], ['🪑', 'Wooden chair', 30, 'home'], ['📚', 'Box of books', 22, 'collect'], ['🧰', 'Toolbox', 70, 'tools'], ['🎸', 'Electric guitar', 280, 'music'], ['📷', 'Film camera', 190, 'tech'], ['⌚', 'Old watch', 95, 'fashion'], ['🏀', 'Signed ball', 160, 'sport'], ['🖼️', 'Little painting', 75, 'art'], ['🛹', 'Skateboard', 50, 'sport'], ['🪀', 'Yo-yo collection', 18, 'toys'], ['🧦', 'Bag of socks', 2, 'junk'], ['🗑️', 'Broken junk', 3, 'junk'], ['🥾', 'Hiking boots', 35, 'fashion'], ['💿', 'CDs', 12, 'music']] },
    { k: 'garage', name: 'Estate Garages', lic: 1000, inc: 25, open: [150, 350], n: [6, 9], col: '#7a9ab8',
      pool: [['🔧', 'Tool chest', 320, 'tools'], ['🚲', 'Racing bike', 480, 'sport'], ['🛵', 'Vintage scooter', 1100, 'vehicle', 1], ['🎷', 'Saxophone', 720, 'music'], ['🏺', 'Old vase', 420, 'antique'], ['💽', 'Record collection', 380, 'music'], ['🕹️', 'Arcade cabinet', 900, 'tech', 1], ['🧥', 'Leather jacket', 230, 'fashion'], ['🖼️', 'Oil painting', 850, 'art'], ['📟', 'Retro computer', 520, 'tech'], ['🎳', 'Bowling set', 70, 'sport'], ['🪞', 'Gilded mirror', 300, 'home'], ['🗑️', 'Broken lawnmower', 15, 'junk'], ['📦', 'Old magazines', 10, 'junk'], ['🧳', 'Steamer trunk', 260, 'antique']] },
    { k: 'container', name: 'Port Shipping Containers', lic: 8000, inc: 250, open: [1500, 3000], n: [6, 9], col: '#3a8a5a',
      pool: [['🏍️', 'Motorbike', 4800, 'vehicle', 1], ['🎹', 'Grand piano', 6500, 'music', 1], ['🗿', 'Stone statue', 3600, 'antique', 1], ['💎', 'Crate of gems', 5200, 'treasure'], ['👜', 'Designer bags', 1900, 'fashion'], ['📺', 'Pallet of TVs', 1300, 'tech'], ['🍷', 'Rare wine crate', 2300, 'collect'], ['🏺', 'Dynasty-style vase', 2900, 'antique'], ['🦾', 'Robot arm', 3100, 'tech', 1], ['🪆', 'Doll collection', 950, 'toys'], ['🛶', 'Kayak', 700, 'sport', 1], ['🗑️', 'Rusty parts', 40, 'junk'], ['📦', 'Packing peanuts', 5, 'junk']] },
    { k: 'vault', name: 'Celebrity Vaults', lic: 40000, inc: 1000, open: [8000, 15000], n: [6, 8], col: '#c8a040',
      pool: [['🚗', 'Classic car', 30000, 'vehicle', 1], ['👑', 'Stage crown', 16000, 'fashion'], ['🎤', 'Golden microphone', 9500, 'music'], ['🖼️', 'Famous portrait', 24000, 'art'], ['⌚', 'Diamond watch', 13000, 'fashion'], ['🏆', 'Championship trophy', 8500, 'sport'], ['💍', 'Huge ring', 11000, 'fashion'], ['🚤', 'Speedboat', 22000, 'vehicle', 1], ['🎸', 'Tour guitar', 7000, 'music'], ['🛋️', 'Designer sofa', 4000, 'home', 1], ['🗑️', 'Broken gadgets', 120, 'junk']] },
    { k: 'legend', name: 'Lost & Legendary', lic: 150000, inc: 5000, open: [40000, 70000], n: [5, 7], col: '#b85aff',
      pool: [['🦖', 'Dinosaur skull', 130000, 'antique', 1], ['🌑', 'Moon rock', 95000, 'treasure'], ['🪙', 'Pirate gold chest', 160000, 'treasure', 1], ['🗡️', 'Ancient sword', 62000, 'antique'], ['👑', 'Royal crown', 190000, 'treasure'], ['🚀', 'Rocket engine', 85000, 'tech', 1], ['🧭', 'Explorer\'s compass', 32000, 'antique'], ['📜', 'Lost manuscript', 74000, 'art'], ['🏺', 'Golden burial mask', 210000, 'antique'], ['🛸', 'Weird metal disc', 50000, 'tech', 1], ['🗑️', 'Ancient dust', 300, 'junk']] },
  ];
  const UPG = [
    { k: 'shelf', name: 'More shelves', max: 3, cost: l => [300, 2500, 15000][l], d: '+4 display spots' },
    { k: 'sign', name: 'Neon sign', max: 3, cost: l => [200, 1800, 12000][l], d: 'More customers' },
    { k: 'lights', name: 'Display lights', max: 3, cost: l => [400, 3000, 20000][l], d: 'Customers pay 10% more' },
    { k: 'charm', name: 'Sales training', max: 2, cost: l => [600, 6000][l], d: 'Customers take counters better' },
    { k: 'appr', name: 'Appraiser', max: 1, cost: () => 900, d: 'See true values, not guesses' },
    { k: 'truck', name: 'Box truck', max: 1, cost: () => 1200, d: 'Carry big things home' },
    { k: 'lic', name: 'Buyer\'s license', max: 4, cost: l => YARDS[l + 1].lic, d: 'Unlocks the next yard' },
  ];
  const RIVALS = [
    { n: 'Big Earl', face: '🤠', style: 'bluff', greed: [.75, 1.05], speed: .9, col: '#e8a040', line: ['YEP!', 'I\'m in!', 'Mine!'] },
    { n: 'Penny', face: '👵', style: 'careful', greed: [.5, .75], speed: 1.4, col: '#c88ae8', line: ['Mm-hm.', 'Fine.', 'Yes, dear.'] },
    { n: 'Dex', face: '😎', style: 'jump', greed: [.7, .95], speed: .6, col: '#5ac8ff', line: ['BOOM.', 'Too easy.', 'Up!'] },
    { n: 'Madame Rue', face: '🧐', style: 'collector', greed: [.6, .85], speed: 1, col: '#ff7ab8', line: ['Indeed.', 'Hmph.', 'Mine.'] },
    { n: 'The Duchess', face: '👸', style: 'rich', greed: [.85, 1.15], speed: 1.1, col: '#ffd23f', line: ['Charming.', 'Of course.', 'Again.'] },
  ];
  const CUST = [
    { k: 'bargain', n: 'Bargain hunter', lo: .58, hi: .82, pat: 2, w: .32 },
    { k: 'regular', n: 'Shopper', lo: .78, hi: 1.02, pat: 2, w: .36 },
    { k: 'collector', n: 'Collector', lo: .95, hi: 1.45, pat: 3, w: .18 },
    { k: 'tourist', n: 'Tourist', lo: .88, hi: 1.25, pat: 1, w: .14 },
  ];
  const CATS = ['toys', 'tech', 'music', 'sport', 'fashion', 'art', 'antique', 'collect', 'tools', 'home', 'treasure', 'vehicle'];
  /* ---------- state ---------- */
  let mode = 'day', day = 1, cash = 400, up = {}, inv = [], shelf = [], lots = [], li = 0, yard = 0, A = null, store = null, log = null, t = 0, msgs = [], botT = 0, posed = false, scrap = 0, best = null;
  const SV = () => { const s = K.save; if (!s.bb) s.bb = { best: 0 }; return s.bb; };
  const lv = k => up[k] || 0, slots = () => 8 + lv('shelf') * 4, rent = () => Math.round(20 + day * 7 + lv('shelf') * 12);
  const say = (s, c = '#fff') => msgs.push({ s, c, t: 0 });
  const est = it => lv('appr') ? money(it.v) : money(it.v * .7) + '–' + money(it.v * 1.35);
  const netWorth = () => cash + inv.reduce((a, it) => a + it.v * .6, 0) + shelf.reduce((a, it) => a + it.v * .6, 0);
  /* ---------- lockers ---------- */
  function makeLot(Y) {
    const n = rint(Y.n[0], Y.n[1]), items = [], wts = Y.pool.map(p => 1 / Math.pow(p[2] + 20, .32)), tot = wts.reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i++) { let r = R() * tot, k = 0; while ((r -= wts[k]) > 0) k++; const p = Y.pool[k], v = Math.round(p[2] * (.7 + R() * .7) * (Y.k === 'storage' ? 1.3 : 1)); items.push({ ic: p[0], n: p[1], v, cat: p[3], big: !!p[4], boxed: R() < .3 && !p[4], seen: false, x: 0, y: 0 }); }
    // a rare jackpot
    if (R() < .12) { const p = Y.pool.reduce((a, b) => b[2] > a[2] ? b : a); items[0] = { ic: p[0], n: p[1], v: Math.round(p[2] * (1.1 + R() * .5)), cat: p[3], big: !!p[4], boxed: !p[4] && R() < .6, seen: false }; }
    // a real room: things sit on the floor or on the boxes piled in there, at three depths
    const spots = [], props = [];
    for (const z of [.14, .47, .8]) for (let c = 0; c < 5; c++) spots.push({ z: z + (R() - .5) * .07, u: (c + .5) / 5 + (R() - .5) * .07 });
    spots.sort(() => R() - .5);
    items.forEach((it, i) => { const sp = spots[i % spots.length]; it.z = sp.z; it.u = sp.u; it.onBox = !it.big && !it.boxed && R() < .35; if (it.onBox) props.push({ z: it.z - .002, u: it.u, w: 78, h: 44, stack: 1, col: pick(BOXC), tape: true }); placeItem(it); });
    // clutter: stacks of cardboard boxes, mostly along the walls and the back
    for (let i = 0, n = rint(4, 7); i < n; i++) props.push({ z: R() * .35, u: R() < .5 ? .02 + R() * .16 : .82 + R() * .16, w: 70 + R() * 50, h: 46 + R() * 36, stack: rint(1, 3), col: pick(BOXC), tape: R() < .7 });
    if (R() < .7) props.push({ z: .02, u: .3 + R() * .4, w: 120, h: 70, stack: 1, col: '#7a6a5a', tarp: true });
    const v = items.reduce((a, b) => a + b.v, 0);
    return { Y, items, props, v, open: Math.round(lp(Y.open[0], Y.open[1], R()) / Y.inc) * Y.inc, door: pick(['#b8653a', '#7a8a9a', '#5a7a4a', '#9a6a8a', '#4a6a9a']), num: rint(100, 999) };
  }
  // the locker's room: front opening 220..1060 x 150..550, back wall 380..900 x 210..420
  const RX0 = 220, RX1 = 1060, RT = 150, RB = 550, BX0 = 380, BX1 = 900, BT = 210, BB = 420, BOXC = ['#c8945a', '#b8844a', '#d8a868', '#a87a48'];
  const dsc = z => lp(.6, 1, z), dx = (z, u) => lp(lp(BX0, RX0, z), lp(BX1, RX1, z), u), dfy = z => lp(BB, RB, z);
  function placeItem(it) { const sc = dsc(it.z), base = dfy(it.z) - (it.onBox ? 44 * sc : 0); it.sc = sc; it.x = dx(it.z, it.u); it.fy = base; it.y = base - (it.boxed ? 24 : it.big ? 34 : 24) * sc; }
  function startDay() {
    mode = 'yard'; lots = [0, 1, 2, 3].map(() => makeLot(YARDS[yard])); li = 0; log = { spent: 0, won: 0, sold: 0, sales: 0, scrap: 0, lots: [] }; scrap = 0;
  }
  /* ---------- the auction ---------- */
  function startPeek() { const L = lots[li]; A = { L, phase: 'peek', t: 0, fx: 640, fy: 360, seenV: 0 }; L.items.forEach(it => it.seen = false); mode = 'auction'; K.sfx(200, .3, 'sawtooth', .05, 400); }
  function startBidding() {
    const L = A.L, Y = L.Y, cast = RIVALS.filter(r => r.style !== 'rich' || yard >= 3); const who = [...cast].sort(() => R() - .5).slice(0, 3);
    A.rivals = who.map(r => { const g = lp(r.greed[0], r.greed[1], R()), love = r.style === 'collector' ? pick(CATS) : null, val = L.items.reduce((a, it) => a + it.v * .46 * (it.boxed ? .75 : 1) * (love && it.cat === love ? 1.5 : 1), 0); return { ...r, max: Math.max(L.open + Y.inc, Math.round(val * g * (.85 + R() * .3) / Y.inc) * Y.inc), out: false, wait: .6 + R() * 1.4, love, quote: null, qt: 0 }; });
    A.phase = 'bid'; A.price = L.open; A.lead = -1; A.clock = 0; A.called = 0; A.you = true; A.t = 0; A.hist = [];
    K.chime(523, [0, 4, 7]);
  }
  function bid(who, amt) {
    A.price += amt; A.lead = who; A.clock = 0; A.called = 0; A.hist.push({ who, p: A.price });
    if (who === 'you') K.sfx(700, .07, 'square', .06); else { const r = A.rivals[who]; r.quote = pick(r.line); r.qt = 1.1; K.sfx(500 + who * 80, .06, 'triangle', .06); }
    A.rivals.forEach((r, i) => { if (i !== who) r.wait = Math.min(r.wait, (.5 + R() * 1.2) * r.speed); });
  }
  function youBid(mult) {
    if (!A || A.phase !== 'bid' || !A.you || A.lead === 'you') return;
    const Y = A.L.Y, amt = Y.inc * mult; if (A.price + amt > cash) { say('Not enough cash!', '#ff8a8a'); K.sfx(160, .1, 'sawtooth', .05); return; }
    bid('you', amt);
    if (mult > 1) A.rivals.forEach(r => { if (!r.out && (r.style !== 'bluff' || R() < .5) && A.price + Y.inc * 2 > r.max * (r.style === 'careful' ? .9 : 1)) { r.out = true; r.quote = 'Too rich for me!'; r.qt = 1.4; } });
  }
  function youPass() { if (!A || A.phase !== 'bid' || !A.you) return; A.you = false; K.sfx(260, .15, 'triangle', .05); }
  function auctionStep(dt) {
    const Y = A.L.Y;
    A.rivals.forEach((r, i) => {
      r.qt = Math.max(0, r.qt - dt); if (r.out || A.lead === i) return;
      r.wait -= dt; if (r.wait > 0) return; r.wait = (.7 + R() * 1.3) * r.speed;
      const next = A.price + Y.inc;
      if (next > r.max && !(r.style === 'bluff' && next < r.max * 1.08 && R() < .3)) { r.out = true; r.quote = pick(['I\'m out.', 'Nope.', 'Pass.']); r.qt = 1.2; return; }
      if (A.clock < .5 && R() < .5) return;   // a beat before they answer
      bid(i, r.style === 'jump' && R() < .35 && A.price + Y.inc * 3 <= r.max ? Y.inc * 3 : Y.inc);
    });
    A.clock += dt * (A.you ? 1 : 2.2); const c = Math.floor(A.clock / 1.5);
    if (c > A.called) { A.called = c; if (c <= 2) K.sfx(c === 1 ? 440 : 520, .15, 'square', .05); }
    if (A.clock >= 4.5 || (A.lead === -1 && !A.you && A.rivals.every(r => r.out))) endAuction();
  }
  function endAuction() {
    const L = A.L;
    if (A.lead === 'you') {
      cash -= A.price; log.spent += A.price; A.phase = 'won'; A.t = 0; A.paid = A.price; A.reveal = 0; L.items.forEach(it => it.seen = true);
      K.chime(523, [0, 4, 7, 12]); K.shake(4);
    } else { A.phase = 'lost'; A.t = 0; A.winner = A.lead === -1 ? null : A.rivals[A.lead]; K.sfx(220, .3, 'triangle', .05); }
    log.lots.push({ won: A.lead === 'you', price: A.price, v: L.v });
  }
  function takeLoot() {
    const L = A.L; let s = 0;
    for (const it of L.items) { if (it.cat === 'junk') { s += it.v; continue; } if (it.big && !lv('truck')) { s += Math.round(it.v * .45); continue; } inv.push({ ...it }); }
    if (s) { cash += s; log.scrap += s; }
    log.won++; nextLot();
  }
  function nextLot() { li++; A = null; if (li >= lots.length) openStore(); else mode = 'yard'; }
  /* ---------- the store ---------- */
  // stocking: you choose what goes on the shelves; the rest waits in the back room
  function autoFill() { const all = [...shelf, ...inv].sort((a, b) => b.v - a.v); shelf = all.slice(0, slots()); inv = all.slice(slots()); }
  function toShelf(i) { if (shelf.length >= slots()) { say('The shelves are full', '#ff8a8a'); K.sfx(160, .1, 'sawtooth', .05); return; } const it = backRoom()[i]; if (!it) return; inv = inv.filter(x => x !== it); shelf.push(it); K.sfx(620, .05, 'triangle', .05); }
  function fromShelf(i) { const it = shelf[i]; if (!it || (store && store.walk.some(c => c.it === it && !c.leaving))) return; shelf.splice(i, 1); inv.push(it); K.sfx(420, .05, 'triangle', .05); }
  const backRoom = () => [...inv].sort((a, b) => b.v - a.v);
  function openStore() { mode = 'stock'; if (K.bot) { autoFill(); beginStore(); } }
  function beginStore() { if (!store) store = { t: 0, q: [], walk: [], spawn: 1.2, served: 0 }; mode = 'store'; if (!shelf.length && !inv.length) store.t = Math.max(store.t, STORE_T - 2); }
  function spawnCustomer() {
    if (!shelf.length) return;
    let r = R(), ty = CUST[0]; for (const c of CUST) { if ((r -= c.w) <= 0) { ty = c; break; } }
    const love = ty.k === 'collector' ? pick(shelf).cat : null, choices = love ? shelf.filter(it => it.cat === love) : shelf, it = pick(choices.length ? choices : shelf);
    const fan = R() < .06, mult = (fan ? 1.8 + R() * .7 : lp(ty.lo, ty.hi, R())) * (1 + lv('lights') * .1) * (love === it.cat ? 1.15 : 1);
    const max = Math.round(it.v * mult), offer = Math.round(max * (.7 + R() * .18)), side = shelf.indexOf(it) < Math.ceil(slots() / 2) ? -1 : 1;
    store.walk.push({ ty, it, max, offer, pat: ty.pat + lv('charm'), z: 0, lx: 0, side, st: 'enter', bt: 1 + R() * 1.4, look: (() => { const top = ty.k === 'tourist' ? 'tee' : pick(['tee', 'tee', 'jacket', 'hoodie', 'dress']), hs = top === 'dress' ? pick([1, 2, 4]) : pick([0, 0, 1, 2, 3, 4, 5]); return { skin: pick(['#f2d0b0', '#e8b890', '#d8a878', '#a8784a', '#8a5a3a', '#6a4a2a']), shirt: ty.k === 'tourist' ? pick(['#ff7a5a', '#5ac8a8', '#ffb83a']) : pick(['#e85a5a', '#5a8ae8', '#5ae88a', '#e8c85a', '#c85ae8', '#e8e8e8', '#4a4a5a', '#2a8a7a', '#b8502a']), pants: pick(['#2a2a3a', '#3a4a6a', '#5a4a3a', '#6a6a6a', '#2a3a5a', '#7a6040']), shoes: pick(['#1a1410', '#e8e8e8', '#6a3a1a', '#c83a3a']), inner: pick(['#e8e8e8', '#2a2a2a', '#f0d890']), print: R() < .5 ? pick(['#ffd23f', '#fff', '#1a1a1a']) : null, hair: pick(['#2a1a10', '#4a2a14', '#6a4a2a', '#c8a050', '#aaaaaa', '#e85a2a', '#1a1a1a']), hs, top, build: pick([0, 1, 1, 2]), beard: top !== 'dress' && R() < .2, hat: hs !== 5 && R() < .22, hatC: pick(['#e85a5a', '#2a2a3a', '#5a8ae8', '#e8c85a']) }; })(), fan, mood: 0, bub: null });
    K.sfx(1320, .05, 'triangle', .03); K.sfx(1760, .08, 'triangle', .03, 0, .06);   // the shop bell
  }
  const atCounter = () => store && store.q[0] && store.q[0].st === 'line' && store.q[0].z > .9 ? store.q[0] : null;
  function deal(kind) {
    const c = atCounter(); if (!c || c.leaving) return;
    if (kind === 'yes') return sell(c, c.offer);
    if (kind === 'no') { leave(c, pick(['Your loss.', 'Fine.', 'Hmph.']), -1); K.sfx(240, .1, 'triangle', .05); return; }
    // a counter: ask for more. They take it if it's within what they'd pay; otherwise they meet you partway or walk
    const ask = Math.round(c.offer * (kind === 'big' ? 1.45 : 1.18));
    if (ask <= c.max) { c.bub = pick(['Deal!', 'Okay, okay.', 'Fair enough.']); return sell(c, ask); }
    c.pat--; if (c.pat <= 0) { leave(c, pick(['Forget it!', 'No way.', 'I\'m out of here.']), -1); K.sfx(200, .12, 'sawtooth', .05); return; }
    c.offer = Math.min(c.max, Math.round((c.offer + c.max) / 2 + c.max * .04)); c.bub = pick(['How about ' + money(c.offer) + '?', 'Best I can do: ' + money(c.offer), money(c.offer) + ', final offer.']); K.sfx(520, .07, 'triangle', .05);
  }
  function leave(c, words, mood) { c.leaving = true; c.st = 'leave'; c.bub = words; c.mood = mood; c.bt = 1.4; }
  function sell(c, price) {
    leave(c, c.bub && /Deal|Okay|Fair/.test(c.bub) ? c.bub : pick(['Pleasure!', 'Thanks!', 'Love it!']), 1); c.sold = price; shelf = shelf.filter(x => x !== c.it); store.walk.forEach(o => { if (o !== c && o.it === c.it && !o.leaving) { o.it = shelf.length ? pick(shelf) : null; if (!o.it) leave(o, 'Sold out?', 0); } });
    cash += price; log.sold++; log.sales += price; store.served++; store.drawer = 1;
    K.coin(0); K.sfx(1046, .1, 'triangle', .08); K.sfx(1318, .14, 'triangle', .08, 0, .07); K.burst(1080, 560, ['#ffd23f', '#5cf2a0', '#fff'], 16, 260, { life: .6 });
    const prof = price - c.it.v; say((prof >= 0 ? '+' : '') + money(price) + (c.fan ? '  SUPERFAN!' : ''), prof >= 0 ? '#5cf2a0' : '#ffd23f');
  }
  // the customers, in the room in front of the counter: z 0 at the door, 1 at the counter; lx -1 left wall .. 1 right wall
  function storeStep(dt) {
    const S = store; S.t += dt; if (S.drawer > 0) S.drawer -= dt * 1.5;
    if (S.t < STORE_T - 6 && (S.spawn -= dt) <= 0) { S.spawn = (5.5 - lv('sign') * 1.1) * (.7 + R() * .6); if (S.walk.length < 6) spawnCustomer(); }
    const mv = (c, z, lx, vz, vx) => { c.z += cl(z - c.z, -vz * dt, vz * dt); c.lx += cl(lx - c.lx, -vx * dt, vx * dt); c.wk = (c.wk || 0) + dt; };
    for (const c of S.walk) {
      if (c.st === 'leave') { if ((c.bt -= dt) < 0) mv(c, -.05, 0, .35, .8); continue; }
      if (c.st === 'enter') { mv(c, .32, 0, .3, 1); if (c.z >= .31) c.st = 'browse'; }
      else if (c.st === 'browse') { mv(c, .38, c.side * .82, .2, .7); if (Math.abs(c.lx - c.side * .82) < .02 && (c.bt -= dt) <= 0) { c.st = 'line'; S.q.push(c); } }
      else if (c.st === 'line') {
        const i = S.q.indexOf(c), tz = i === 0 ? .94 : .66 - (i - 1) * .08, tl = i === 0 ? 0 : (i % 2 ? .38 : -.38); mv(c, tz, tl, .32, .7);
        if (i === 0 && c.z > .9 && !c.bub) c.bub = (c.fan ? 'I NEED this ' + c.it.n.toLowerCase() + '! ' : '') + (R() < .33 ? 'I\'ll give you ' + money(c.offer) + '.' : pick(['How about ', 'Would you take ']) + money(c.offer) + '?');
        if (i > 0) { c.wq = (c.wq || 0) + dt; if (c.wq > 18) leave(c, 'Too slow!', -1); }
      }
    }
    S.q = S.q.filter(c => !c.leaving); S.walk = S.walk.filter(c => c.z > -.02);
    if (S.t >= STORE_T && !S.q.length) endDay();
  }
  function endDay() {
    const r = rent(); cash -= r; log.rent = r; mode = 'eve'; store = null;
    if (cash < 0 && (inv.length || shelf.length)) { inv.push(...shelf); shelf = []; inv.sort((a, b) => a.v - b.v); let got = 0; while (cash < 0 && inv.length) { const it = inv.pop(); const v = Math.round(it.v * .4); cash += v; got += v; } say('Short on rent: the scrapper took stock for ' + money(got), '#ffb36a'); }
    best = Math.max(best || 0, netWorth());
    if (cash < 0) { K.score = Math.max(0, Math.round(netWorth())); setTimeout(() => K.over({ title: 'Out of business', text: `Rent day ${day} broke the bank. Net worth ${money(netWorth())}.` }), 600); mode = 'broke'; }
  }
  function buy(u) {
    const l = lv(u.k); if (l >= u.max) return; const c = u.cost(l); if (cash < c) { say('Not enough cash', '#ff8a8a'); K.sfx(160, .1, 'sawtooth', .05); return; }
    cash -= c; up[u.k] = l + 1; if (u.k === 'lic') yard = up.lic; K.chime(660, [0, 4, 7]); say(u.name + '!', '#5cf2a0');
    if (u.k === 'lic') say('Unlocked: ' + YARDS[yard].name, '#ffd23f');
  }
  function nextDay() {
    if (day >= DAYS) { K.score = Math.round(netWorth()); const s = SV(); s.best = Math.max(s.best, K.score); K.persist(); K.runCoins += Math.min(40, Math.round(K.score / 2500)); K.over({ title: K.score > 250000 ? 'A legendary empire!' : K.score > 40000 ? 'Bid Bandit boss!' : 'Fifteen days done', text: `Net worth ${money(K.score)} · highest yard: ${YARDS[yard].name}` }); mode = 'done'; return; }
    day++; startDay();
  }
  /* ---------- input ---------- */
  const btn = {}, inR = (b, x, y) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  let drag = false;
  GAME.down = (x, y) => {
    for (const k in btn) if (inR(btn[k], x, y)) return press(k);
    if (A && A.phase === 'peek') { drag = true; A.fx = x; A.fy = y; }
  };
  GAME.move = (x, y) => { if (A && A.phase === 'peek') { A.fx = x; A.fy = y; } };
  GAME.up = () => { drag = false; };
  GAME.key = (c, d) => {
    if (!d) return;
    if (mode === 'auction' && A && A.phase === 'bid') { if (c === 'Space' || c === 'KeyB') youBid(1); if (c === 'KeyJ') youBid(4); if (c === 'KeyP') youPass(); }
    if (mode === 'store') { if (c === 'KeyA' || c === 'Digit1') deal('yes'); if (c === 'KeyC' || c === 'Digit2') deal('more'); if (c === 'Digit3') deal('big'); if (c === 'KeyN' || c === 'Digit4') deal('no'); }
    if (c === 'Enter') { const k = ['peek', 'look', 'take', 'next', 'open', 'go'].find(q => btn[q]); if (k) press(k); }
  };
  function press(k) {
    K.audio && K.audio();
    if (k === 'peek') return startPeek();
    if (k === 'skip') { log.lots.push({ won: false, skipped: true }); return nextLot(); }
    if (k === 'look') return startBidding();
    if (k === 'bid') return youBid(1);
    if (k === 'jump') return youBid(4);
    if (k === 'pass') return youPass();
    if (k === 'take') return takeLoot();
    if (k === 'next') return nextLot();
    if (k === 'yes' || k === 'more' || k === 'big' || k === 'no') return deal(k);
    if (k.startsWith('inv')) return toShelf(+k.slice(3));
    if (k.startsWith('sh')) return fromShelf(+k.slice(2));
    if (k === 'auto') { autoFill(); K.sfx(700, .08, 'triangle', .05); return; }
    if (k === 'open') return beginStore();
    if (k === 'restock') { mode = 'stock'; return; }
    if (k === 'close') { store.t = STORE_T; store.q.forEach(c => leave(c, 'Closing?', 0)); return; }
    if (k.startsWith('up')) return buy(UPG[+k.slice(2)]);
    if (k.startsWith('yd')) { yard = +k.slice(2); K.sfx(600, .05, 'triangle', .05); return; }
    if (k === 'go') return nextDay();
  }
  /* ---------- kit hooks ---------- */
  GAME.reset = () => {
    day = 1; cash = 500; up = {}; inv = []; shelf = []; yard = 0; A = null; store = null; msgs = []; posed = false; best = null;
    startDay(); if (K.bot) { cash = 4000; }
  };
  GAME.update = dt => {
    t += dt; for (const m of msgs) m.t += dt; msgs = msgs.filter(m => m.t < 2.2);
    if (mode === 'auction' && A) {
      A.t += dt;
      if (A.phase === 'peek') { for (const it of A.L.items) if (!it.seen && Math.hypot(it.x - A.fx, it.y - A.fy) < 120) it.seen = true; if (A.t > 9) startBidding(); }
      else if (A.phase === 'bid') auctionStep(dt);
      else if (A.phase === 'won') A.reveal = Math.min(A.L.items.length, A.t / .32);
    }
    if (mode === 'store' && store) storeStep(dt);
  };
  // the attract demo: peek around, bid sensibly, sell at fair prices
  GAME.bot = dt => {
    if ((botT -= dt) > 0) return; botT = .25;
    if (mode === 'yard') return press('peek');
    if (mode === 'stock') { autoFill(); return beginStore(); }
    if (mode === 'auction' && A.phase === 'peek') { A.fx = 300 + (Math.sin(t * 1.3) * .5 + .5) * 680; A.fy = 300 + (Math.sin(t * 2.1) * .5 + .5) * 240; if (A.t > 4) startBidding(); return; }
    if (mode === 'auction' && A.phase === 'bid') { if (A.you && A.lead !== 'you' && A.price + A.L.Y.inc < A.L.v * .6 && A.price + A.L.Y.inc <= cash) { botT = .6 + R() * .6; youBid(R() < .15 ? 4 : 1); } else if (A.price > A.L.v * .6) youPass(); return; }
    if (mode === 'auction' && A.phase === 'won' && A.t > 3.5) return takeLoot();
    if (mode === 'auction' && A.phase === 'lost' && A.t > 1.5) return nextLot();
    if (mode === 'store' && atCounter() && atCounter().bub && !atCounter().leaving) { botT = .9; const c = atCounter(); return deal(c.offer >= c.it.v * .95 ? 'yes' : R() < .5 ? 'more' : 'yes'); }
    if (mode === 'eve') { botT = 1.5; const u = UPG.findIndex((u, i) => lv(u.k) < u.max && u.cost(lv(u.k)) < cash * .4); if (u >= 0 && R() < .5) return buy(UPG[u]); return nextDay(); }
  };
  /* ---------- drawing ---------- */
  function tx(g, s, x, y, font, c, al = 'center', st) { g.font = font; g.textAlign = al; g.textBaseline = 'middle'; if (st) { g.lineWidth = st; g.strokeStyle = 'rgba(0,0,0,.55)'; g.strokeText(s, x, y); } g.fillStyle = c; g.fillText(s, x, y); }
  const F = (px, w = 900) => `${w} ${px}px Nunito, sans-serif`, D = px => `${px}px "Luckiest Guy", sans-serif`;
  function rr(g, x, y, w, h, r, fill, stroke, lw = 2) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
  function button(g, k, x, y, w, h, label, col, sub, tc = '#1a1410') { btn[k] = { x, y, w, h }; g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.roundRect(x, y + 5, w, h, 14); g.fill(); rr(g, x, y, w, h, 14, col); tx(g, label, x + w / 2, y + h / 2 + (sub ? -9 : 2), D(h > 70 ? 30 : 22), tc); if (sub) tx(g, sub, x + w / 2, y + h / 2 + 17, F(13), tc); }
  function hud(g) {
    rr(g, 20, 14, 1240, 52, 14, 'rgba(0,0,0,.45)');
    tx(g, `DAY ${day}/${DAYS}`, 46, 41, D(26), '#ffb347', 'left'); tx(g, money(cash), 250, 41, D(30), '#5cf2a0', 'left');
    tx(g, YARDS[yard].name.toUpperCase(), 640, 41, D(22), YARDS[yard].col); tx(g, `Net worth ${money(netWorth())}`, 1240, 41, F(16), '#cfc0a8', 'right');
  }
  function yardBg(g) {
    const v = K.view, gr = g.createLinearGradient(0, v.y0, 0, v.y1); gr.addColorStop(0, '#f2a65a'); gr.addColorStop(.5, '#e8805a'); gr.addColorStop(1, '#3a2a28'); g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.fillStyle = '#6a5a58'; g.fillRect(v.x0, 560, v.x1 - v.x0, v.y1 - 560); g.fillStyle = 'rgba(0,0,0,.15)'; for (let x = -40; x < 1320; x += 90) g.fillRect(x, 600, 50, 4);
  }
  function lockerFront(g, L, x, y, w, h, open = 0) {
    rr(g, x - 10, y - 10, w + 20, h + 14, 6, '#3a3a40');
    g.fillStyle = '#1a1414'; g.fillRect(x, y, w, h);
    const dh = h * (1 - open); g.fillStyle = L.door; g.fillRect(x, y, w, dh);
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 10; k < dh; k += 16) g.fillRect(x, y + k, w, 3);
    if (dh > 30) { g.fillStyle = '#c8c8c8'; g.fillRect(x + w / 2 - 22, y + dh - 22, 44, 10); tx(g, '#' + L.num, x + w / 2, y + 22, D(20), 'rgba(255,255,255,.85)'); }
  }
  function drawYard(g) {
    yardBg(g); hud(g);
    tx(g, YARDS[yard].name.toUpperCase(), 640, 104, D(42), '#fff', 'center', 6); tx(g, `Locker ${li + 1} of ${lots.length} today`, 640, 142, F(18), '#fff3e0');
    lots.forEach((L, i) => { const x = 150 + i * 260, done = i < li, cur = i === li; g.globalAlpha = done ? .45 : 1; lockerFront(g, L, x, 200, 210, 250, 0); if (cur) { g.strokeStyle = '#ffd23f'; g.lineWidth = 5; g.strokeRect(x - 14, 186, 238, 272); } g.globalAlpha = 1; const r = log.lots[i]; if (done && r) tx(g, r.skipped ? 'SKIPPED' : r.won ? 'WON ' + money(r.price) : 'LOST', x + 105, 325, D(24), r.won ? '#5cf2a0' : '#ff8a8a', 'center', 5); });
    const L = lots[li];
    tx(g, `Opening bid ${money(L.open)} · bids go up ${money(L.Y.inc)}`, 640, 500, F(18), '#fff');
    button(g, 'peek', 440, 530, 280, 80, 'PEEK & BID', '#ffd23f', 'Flashlight first');
    button(g, 'skip', 740, 540, 160, 60, 'SKIP', 'rgba(255,255,255,.2)', null, '#fff');
  }
  function itemIcon(g, it, x, y, s = 1, show = true) {
    if (it.boxed && !(A && A.phase === 'won')) { cube(g, x, y + 24 * s, 64 * s, 48 * s, '#c8945a', true); if (show) tx(g, '?', x, y + 2 * s, D(22 * s), 'rgba(80,40,10,.55)'); return; }
    if (!show) { g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.ellipse(x, y, (it.big ? 50 : 30) * s, (it.big ? 34 : 24) * s, 0, 0, TAU); g.fill(); return; }
    tx(g, it.ic, x, y, `${Math.round((it.big ? 68 : 46) * s)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`, '#fff');
  }
  function cube(g, x, yb, w, h, col, tape, tarp) {   // a cardboard box, seen a little from above and from the side
    const d = h * .32, ox = (640 - x) * .06, yt = yb - h, sh = (c, k) => { const n = parseInt(c.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; };
    g.fillStyle = sh(col, .62); g.beginPath(); if (x < 640) { g.moveTo(x + w / 2, yt); g.lineTo(x + w / 2 + ox, yt - d); g.lineTo(x + w / 2 + ox, yb - d); g.lineTo(x + w / 2, yb); } else { g.moveTo(x - w / 2, yt); g.lineTo(x - w / 2 + ox, yt - d); g.lineTo(x - w / 2 + ox, yb - d); g.lineTo(x - w / 2, yb); } g.fill();
    g.fillStyle = sh(col, 1.15); g.beginPath(); g.moveTo(x - w / 2, yt); g.lineTo(x + w / 2, yt); g.lineTo(x + w / 2 + ox, yt - d); g.lineTo(x - w / 2 + ox, yt - d); g.fill();
    g.fillStyle = col; g.fillRect(x - w / 2, yt, w, h);
    if (tarp) { g.fillStyle = 'rgba(40,60,90,.85)'; g.beginPath(); g.moveTo(x - w / 2 - 6, yb); g.quadraticCurveTo(x - w / 3, yt - d - 14, x + ox * .5, yt - d - 6); g.quadraticCurveTo(x + w / 3, yt - d, x + w / 2 + 8, yb); g.fill(); return; }
    if (tape) { g.fillStyle = 'rgba(230,210,150,.75)'; g.fillRect(x - 5, yt, 10, h * .45); g.beginPath(); g.moveTo(x - 5, yt); g.lineTo(x + 5, yt); g.lineTo(x + 5 + ox, yt - d); g.lineTo(x - 5 + ox, yt - d); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.strokeRect(x - w / 2, yt, w, h);
  }
  function drawRoom(g, L, lit) {
    // ceiling, walls (corrugated steel), concrete floor
    const poly = (pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fill(); };
    poly([[RX0, RT], [RX1, RT], [BX1, BT], [BX0, BT]], '#1c1a1e');
    poly([[RX0, RT], [BX0, BT], [BX0, BB], [RX0, RB]], '#3a3c44'); poly([[RX1, RT], [BX1, BT], [BX1, BB], [RX1, RB]], '#34363e');
    g.fillStyle = '#44464e'; g.fillRect(BX0, BT, BX1 - BX0, BB - BT);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; for (let x = BX0 + 14; x < BX1; x += 22) { g.beginPath(); g.moveTo(x, BT); g.lineTo(x, BB); g.stroke(); }
    for (let k = 1; k < 8; k++) { const f = k / 8; g.beginPath(); g.moveTo(lp(RX0, BX0, f), lp(RT, BT, f)); g.lineTo(lp(RX0, BX0, f), lp(RB, BB, f)); g.stroke(); g.beginPath(); g.moveTo(lp(RX1, BX1, f), lp(RT, BT, f)); g.lineTo(lp(RX1, BX1, f), lp(RB, BB, f)); g.stroke(); }
    poly([[BX0, BB], [BX1, BB], [RX1, RB], [RX0, RB]], '#5e5850');
    g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(560, 500, 110, 18, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(820, 450, 60, 9, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.moveTo(640, BB); g.lineTo(640, RB); g.stroke();
    // a bare bulb
    g.strokeStyle = '#222'; g.lineWidth = 2; g.beginPath(); g.moveTo(640, RT + 10); g.lineTo(640, RT + 40); g.stroke(); g.fillStyle = lit ? '#fff3b0' : '#5a5a4a'; g.beginPath(); g.arc(640, RT + 48, 9, 0, TAU); g.fill();
    if (lit) { const gl = g.createRadialGradient(640, RT + 48, 10, 640, RT + 48, 420); gl.addColorStop(0, 'rgba(255,240,180,.22)'); gl.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = gl; g.fillRect(RX0, RT, RX1 - RX0, RB - RT); }
    // everything in it, back to front
    const all = [...L.props.map(p => ({ z: p.z, p })), ...L.items.map(it => ({ z: it.z, it }))].sort((a, b) => a.z - b.z);
    for (const o of all) {
      if (o.p) { const p = o.p, sc = dsc(p.z), x = dx(p.z, p.u); g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x + 6 * sc, dfy(p.z), p.w * sc * .6, 8 * sc, 0, 0, TAU); g.fill(); for (let k = 0; k < p.stack; k++) cube(g, x + (k % 2 ? 4 : 0) * sc, dfy(p.z) - k * p.h * sc, p.w * sc * (1 - k * .08), p.h * sc, p.col, p.tape, p.tarp); continue; }
      const it = o.it, sc = it.sc; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(it.x + 4 * sc, it.fy, (it.big ? 52 : it.boxed ? 36 : 26) * sc, 7 * sc, 0, 0, TAU); g.fill();
      itemIcon(g, it, it.x, it.y, sc, lit || it.seen);
    }
  }
  function drawAuction(g) {
    const L = A.L, Y = L.Y;
    yardBg(g); hud(g);
    // the locker, inside
    const X = 220, Yy = 150, W = 840, H = 400, open = A.phase === 'peek' ? .78 : A.phase === 'won' ? Math.min(1, A.t * 1.5) : .78;
    rr(g, X - 14, Yy - 14, W + 28, H + 20, 8, '#2a2a30');
    const lit = A.phase === 'won';
    drawRoom(g, L, lit);
    if (A.phase === 'peek') {   // darkness, and the beam of the flashlight
      g.save(); g.beginPath(); g.rect(X, Yy, W, H); g.clip();
      const gr = g.createRadialGradient(A.fx, A.fy, 20, A.fx, A.fy, 150); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.7, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,.93)'); g.fillStyle = gr; g.fillRect(X, Yy, W, H);
      g.fillStyle = 'rgba(255,240,180,.08)'; g.beginPath(); g.arc(A.fx, A.fy, 110, 0, TAU); g.fill(); g.restore();
    }
    // the roll-up door
    g.fillStyle = L.door; const dh = (H) * (1 - open); g.fillRect(X, Yy, W, dh); g.fillStyle = 'rgba(0,0,0,.2)'; for (let k = 8; k < dh; k += 14) g.fillRect(X, Yy + k, W, 3);
    if (A.phase === 'peek') {
      const left = Math.max(0, 9 - A.t), seen = L.items.filter(it => it.seen);
      rr(g, 380, 80, 520, 50, 12, 'rgba(0,0,0,.6)'); tx(g, `PEEK: ${left.toFixed(1)}s · drag the light around`, 640, 105, D(24), '#ffd23f');
      rr(g, 220, 570, 840, 80, 14, 'rgba(0,0,0,.6)');
      tx(g, `You've spotted ${seen.filter(i => !i.boxed).length} things and ${seen.filter(i => i.boxed).length} boxes`, 640, 596, F(18), '#fff');
      const lo = seen.filter(i => !i.boxed).reduce((a, i) => a + i.v, 0); tx(g, `Spotted so far: about ${money(lo * .8)}–${money(lo * 1.25)} (+ whatever is in the boxes)`, 640, 626, F(16), '#cfc0a8');
      button(g, 'look', 1080, 580, 180, 60, 'START BIDDING', '#ffd23f');
      return;
    }
    if (A.phase === 'bid') drawBidding(g);
    if (A.phase === 'won') {
      const n = Math.floor(A.reveal); let tot = 0;
      L.items.slice(0, n).forEach((it, i) => { tot += it.v; const k = Math.min(1, (A.reveal - i) * 3), x = it.x, y = it.y - 50 * (1 - k); g.globalAlpha = k; tx(g, it.cat === 'junk' ? 'junk' : est(it), x, y + 44, F(13), it.cat === 'junk' ? '#aaa' : it.big && !lv('truck') ? '#ffb36a' : '#5cf2a0', 'center', 4); g.globalAlpha = 1; });
      rr(g, 320, 568, 640, 92, 16, 'rgba(0,0,0,.72)');
      tx(g, `You paid ${money(A.paid)}`, 640, 592, D(24), '#fff');
      if (n >= L.items.length) { const prof = lv('appr') ? L.v - A.paid : null; tx(g, prof != null ? `Worth ${money(L.v)}: ${prof >= 0 ? 'PROFIT +' : 'LOSS '}${money(Math.abs(prof))}` : `Worth roughly ${money(L.v * .8)}–${money(L.v * 1.2)}`, 640, 628, D(26), prof == null || prof >= 0 ? '#5cf2a0' : '#ff8a8a'); button(g, 'take', 990, 580, 250, 70, 'LOAD THE VAN', '#5cf2a0'); if (!lv('truck') && L.items.some(i => i.big)) tx(g, 'No truck: the scrapper buys the big stuff cheap', 640, 690, F(15), '#ffb36a'); }
      return;
    }
    if (A.phase === 'lost') { const wx = A.winner ? 80 : 0; rr(g, 330 - wx, 230, 620 + wx * 2, 200, 18, 'rgba(0,0,0,.78)'); if (A.winner) { g.save(); g.beginPath(); g.roundRect(330 - wx, 230, 200, 200, 18); g.clip(); bust(g, A.winner, 350, 432, 1.05, { mood: 1, talk: true, paddle: 1, num: A.rivals.indexOf(A.winner) + 1 }); g.restore(); } const cx = 640 + wx; tx(g, A.winner ? `${A.winner.n} wins it` : 'Nobody wanted it', cx, 290, D(34), '#fff'); tx(g, `for ${money(A.price)}`, cx, 338, D(28), '#ffb347'); tx(g, lv('appr') ? `It was worth ${money(L.v)}` : 'You\'ll never know what was inside...', cx, 378, F(16), '#cfc0a8'); button(g, 'next', cx - 100, 444, 200, 64, 'NEXT', '#ffd23f'); }
  }
  function drawBidding(g) {
    const L = A.L, Y = L.Y;
    // the rivals along the top of the locker
    A.rivals.forEach((r, i) => {
      const x = 330 + i * 310, y = 300; g.globalAlpha = r.out ? .45 : 1;
      rr(g, x - 110, y - 120, 220, 170, 18, A.lead === i ? 'rgba(255,210,63,.3)' : 'rgba(0,0,0,.62)', A.lead === i ? '#ffd23f' : r.col, 3);
      g.save(); g.beginPath(); g.roundRect(x - 107, y - 117, 214, 108, 16); g.clip(); g.fillStyle = r.col + '22'; g.fillRect(x - 110, y - 120, 220, 120); bust(g, r, x, y - 8, .78, rivalState(r, i)); g.restore(); if (r.out) { g.fillStyle = '#fff'; g.fillRect(x + 70, y - 110, 3, 40); g.beginPath(); g.moveTo(x + 73, y - 110); g.lineTo(x + 100, y - 102); g.lineTo(x + 73, y - 94); g.fill(); }
      tx(g, r.n, x, y + 2, D(24), r.col); tx(g, r.style === 'bluff' ? 'bluffer' : r.style === 'jump' ? 'jumps the price' : r.style === 'careful' ? 'careful' : r.style === 'collector' ? 'loves ' + r.love : 'deep pockets', x, y + 30, F(13), '#cfc0a8');
      if (r.qt > 0) { rr(g, x - 80, y - 168, 160, 38, 12, '#fff'); tx(g, r.quote, x, y - 149, F(16), '#1a1410'); }
      g.globalAlpha = 1;
    });
    // the auctioneer's board
    rr(g, 360, 380, 560, 110, 18, 'rgba(0,0,0,.8)', A.lead === 'you' ? '#5cf2a0' : '#ffb347', 4);
    tx(g, money(A.price), 640, 420, D(54), '#fff');
    const called = ['', 'GOING ONCE...', 'GOING TWICE...'][Math.min(2, A.called)] || '', who = A.lead === 'you' ? 'YOU have it' : A.lead === -1 ? 'Opening bid: anyone?' : A.rivals[A.lead].n + ' has it';
    tx(g, called || who, 640, 466, D(22), called ? '#ff8a5a' : A.lead === 'you' ? '#5cf2a0' : '#ffd23f');
    rr(g, 380, 494, 520, 8, 4, 'rgba(255,255,255,.15)'); rr(g, 380, 494, 520 * Math.min(1, A.clock / 4.5), 8, 4, '#ff8a5a');
    if (A.you) {
      const canBid = A.lead !== 'you';
      button(g, 'bid', 300, 560, 300, 96, `BID ${money(A.price + Y.inc)}`, canBid ? '#ffd23f' : 'rgba(255,255,255,.2)', 'Space', canBid ? '#1a1410' : '#999');
      button(g, 'jump', 620, 560, 240, 96, `JUMP ${money(A.price + Y.inc * 4)}`, canBid ? '#ff8a3a' : 'rgba(255,255,255,.2)', 'Scare them off (J)', canBid ? '#1a1410' : '#999');
      button(g, 'pass', 880, 560, 150, 96, 'PASS', 'rgba(255,255,255,.22)', '(P)', '#fff');
    } else tx(g, 'You passed. Watching the others...', 640, 600, D(26), '#fff', 'center', 5);
    tx(g, `Your cash ${money(cash)}`, 640, 680, F(16), '#fff3e0');
  }
  /* ---------- characters ---------- */
  const INK = 'rgba(26,20,16,.85)';
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  // a face: mood -1 cross .. 0 neutral .. 1 happy; sweat 0..3 drops; flush 0..1
  function face(g, cx, cy, r, skin, mood, o = {}) {
    const e = r * .36, ey = cy - r * .08;
    if (o.flush) { g.fillStyle = `rgba(230,70,60,${o.flush * .35})`; g.beginPath(); g.ellipse(cx, cy + r * .2, r * .8, r * .45, 0, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(232,110,110,.28)'; g.beginPath(); g.arc(cx - r * .5, cy + r * .28, r * .16, 0, TAU); g.arc(cx + r * .5, cy + r * .28, r * .16, 0, TAU); g.fill();
    if (!o.shades) for (const sx of [-1, 1]) {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx + sx * e, ey, r * .17, r * (o.wide ? .2 : .15), 0, 0, TAU); g.fill();
      g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(cx + sx * e + (o.look || 0) * r * .05, ey + r * .02, r * .09, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + sx * e + r * .03, ey - r * .03, r * .03, 0, TAU); g.fill();
    }
    // brows: worried brows tilt up in the middle, cross ones tilt down
    const tilt = o.worry ? -.22 : mood < 0 ? .25 : 0; g.strokeStyle = o.brow || '#3a2414'; g.lineWidth = r * .09; g.lineCap = 'round';
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(cx + sx * (e - r * .17), ey - r * .27 + tilt * r * .3); g.lineTo(cx + sx * (e + r * .17), ey - r * .27 - tilt * r * .3); g.stroke(); }
    g.strokeStyle = shade(skin, .72); g.lineWidth = r * .07; g.beginPath(); g.moveTo(cx, ey + r * .05); g.quadraticCurveTo(cx + r * .1, cy + r * .2, cx - r * .03, cy + r * .24); g.stroke();
    const my = cy + r * .48; g.strokeStyle = '#5a2a20'; g.lineWidth = r * .08;
    if (o.talk) { g.fillStyle = '#5a1a18'; g.beginPath(); g.ellipse(cx, my, r * .2, r * .14, 0, 0, TAU); g.fill(); }
    else if (o.grit) { g.fillStyle = '#fff'; g.fillRect(cx - r * .26, my - r * .07, r * .52, r * .14); g.strokeRect(cx - r * .26, my - r * .07, r * .52, r * .14); g.beginPath(); for (let k = -1; k <= 1; k++) { g.moveTo(cx + k * r * .13, my - r * .07); g.lineTo(cx + k * r * .13, my + r * .07); } g.stroke(); }
    else { g.beginPath(); if (mood > .5) g.arc(cx, my - r * .14, r * .28, .25, Math.PI - .25); else if (mood > 0) g.arc(cx, my - r * .3, r * .32, .55, Math.PI - .55); else if (mood < 0) g.arc(cx, my + r * .2, r * .26, Math.PI + .45, -.45); else { g.moveTo(cx - r * .18, my); g.lineTo(cx + r * .18, my); } g.stroke(); }
    if (o.lips) { g.fillStyle = o.lips; g.beginPath(); g.ellipse(cx, my, r * .17, r * .06, 0, 0, TAU); g.fill(); }
    for (let k = 0; k < (o.sweat || 0); k++) { const sx = cx + (k % 2 ? -1 : 1) * r * (.78 - k * .05), sy = cy - r * .35 + k * r * .3 + ((t * 30 + k * 7) % 6); g.fillStyle = '#8ad8ff'; g.beginPath(); g.moveTo(sx, sy - r * .2); g.quadraticCurveTo(sx + r * .12, sy, sx, sy + r * .07); g.quadraticCurveTo(sx - r * .12, sy, sx, sy - r * .2); g.fill(); }
  }
  // rival portraits: each one dressed for their style
  const RLOOK = {
    bluff: { skin: '#e2a878', hair: '#6a4026', top: '#d8822a', build: 1.25 },
    careful: { skin: '#f0cfb2', hair: '#d8d8d8', top: '#8a5ab8', build: .95 },
    jump: { skin: '#8a5a3a', hair: '#1a1210', top: '#2aa8e0', build: 1.05 },
    collector: { skin: '#f4d8c4', hair: '#c83a2a', top: '#2a2230', build: .95 },
    rich: { skin: '#eac4a2', hair: '#f0d070', top: '#e8b830', build: 1 },
  };
  function bust(g, r, x, y, s, st) {   // y = bottom of the shoulders
    const L = RLOOK[r.style], hr = 30, hx = x, hy = y - 76 + Math.sin(t * 2 + x) * 1.5, w = 62 * L.build;
    g.save(); g.translate(x, y); g.scale(s, s); g.translate(-x, -y);
    // hair behind the head
    if (r.style === 'collector') { g.fillStyle = L.hair; g.beginPath(); g.roundRect(hx - 36, hy - 30, 72, 66, 18); g.fill(); }
    if (r.style === 'rich') { g.fillStyle = L.hair; g.beginPath(); g.arc(hx, hy - 6, 36, 0, TAU); g.fill(); }
    // shoulders and clothes
    g.fillStyle = L.top; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w, y - 44, x - 20, y - 48); g.lineTo(x + 20, y - 48); g.quadraticCurveTo(x + w, y - 44, x + w, y); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
    g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.moveTo(x + 10, y - 46); g.quadraticCurveTo(x + w, y - 44, x + w, y); g.lineTo(x + 18, y); g.fill();
    if (r.style === 'bluff') { g.strokeStyle = 'rgba(120,40,10,.55)'; g.lineWidth = 4; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(x + k * 18, y - 44); g.lineTo(x + k * 18, y); g.stroke(); } g.beginPath(); g.moveTo(x - w + 8, y - 22); g.lineTo(x + w - 8, y - 22); g.stroke(); g.fillStyle = '#c8a050'; g.beginPath(); g.roundRect(x - 13, y - 14, 26, 12, 3); g.fill(); }
    if (r.style === 'careful') { g.fillStyle = '#fff'; for (let k = -4; k <= 4; k++) { g.beginPath(); g.arc(x + k * 6, y - 42 + Math.abs(k) * -1 + k * k * .6, 3.4, 0, TAU); g.fill(); } g.fillStyle = shade(L.top, .8); g.fillRect(x - 3, y - 36, 6, 36); for (let k = 0; k < 3; k++) { g.fillStyle = '#f0e0c0'; g.beginPath(); g.arc(x, y - 28 + k * 11, 2.5, 0, TAU); g.fill(); } }
    if (r.style === 'jump') { g.fillStyle = shade(L.top, .75); g.beginPath(); g.ellipse(x, y - 46, 34, 12, 0, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 8, y - 40); g.lineTo(x - 10, y - 18); g.moveTo(x + 8, y - 40); g.lineTo(x + 10, y - 18); g.stroke(); g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.arc(x, y - 52, 18, .3, Math.PI - .3); g.stroke(); }
    if (r.style === 'collector') { for (let k = 0; k < 14; k++) { g.fillStyle = k % 2 ? '#ff7ab8' : '#ff9ad0'; g.beginPath(); g.arc(x - 44 + k * 6.8, y - 42 + Math.sin(k * 1.7) * 5, 9, 0, TAU); g.fill(); } }
    if (r.style === 'rich') { g.fillStyle = '#fff8f0'; for (let k = 0; k < 12; k++) { g.beginPath(); g.arc(x - w + 6 + k * (w * 2 - 12) / 11, y - 40 + Math.sin(k * 2.3) * 4, 10, 0, TAU); g.fill(); } g.fillStyle = '#fff'; for (let k = -3; k <= 3; k++) { g.beginPath(); g.arc(x + k * 6, y - 49 + k * k * .7, 3, 0, TAU); g.fill(); } }
    // neck and head
    g.fillStyle = shade(L.skin, .85); g.fillRect(hx - 10, hy + 18, 20, 18);
    g.fillStyle = L.skin; g.beginPath(); g.ellipse(hx - hr, hy + 2, 6, 9, 0, 0, TAU); g.ellipse(hx + hr, hy + 2, 6, 9, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(hx, hy, hr, hr * 1.1, 0, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
    const o = { sweat: st.sweat, worry: st.worry, flush: st.flush, talk: st.talk, grit: st.grit };
    if (r.style === 'jump') o.shades = true;
    if (r.style === 'careful') { o.lips = '#c8506a'; o.brow = '#9a9a9a'; }
    if (r.style === 'collector' || r.style === 'rich') o.lips = '#d83a5a';
    face(g, hx, hy + 2, hr, L.skin, st.mood, o);
    // hair and hats on top
    g.fillStyle = L.hair;
    if (r.style === 'bluff') { g.fillStyle = '#5a3a1a'; g.beginPath(); g.moveTo(hx - 22, hy + 18); g.quadraticCurveTo(hx, hy + 8, hx + 22, hy + 18); g.quadraticCurveTo(hx + 10, hy + 24, hx, hy + 17); g.quadraticCurveTo(hx - 10, hy + 24, hx - 22, hy + 18); g.fill();
      g.fillStyle = '#8a5a2a'; g.beginPath(); g.ellipse(hx, hy - 22, 58, 12, 0, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); g.beginPath(); g.moveTo(hx - 30, hy - 22); g.quadraticCurveTo(hx - 32, hy - 62, hx, hy - 54); g.quadraticCurveTo(hx + 32, hy - 62, hx + 30, hy - 22); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#3a2410'; g.fillRect(hx - 29, hy - 32, 58, 7); }
    if (r.style === 'careful') { g.beginPath(); g.arc(hx, hy - 10, hr + 2, Math.PI * 1.05, -.05); g.fill(); g.beginPath(); g.arc(hx, hy - 44, 15, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 2; g.beginPath(); g.arc(hx, hy - 44, 9, 0, 5); g.stroke();
      g.strokeStyle = '#b08a4a'; g.lineWidth = 2.5; g.beginPath(); g.arc(hx - 11, hy - 1, 10, 0, TAU); g.moveTo(hx + 21, hy - 1); g.arc(hx + 11, hy - 1, 10, 0, TAU); g.moveTo(hx - 1, hy - 1); g.lineTo(hx + 1, hy - 1); g.stroke(); }
    if (r.style === 'jump') { g.beginPath(); g.arc(hx, hy - 6, hr + 1, Math.PI, 0); g.fill(); g.fillStyle = '#e83a5a'; g.beginPath(); g.arc(hx, hy - 14, hr + 2, Math.PI * 1.02, -.02); g.fill(); g.fillRect(hx + 10, hy - 18, 34, 7);
      g.fillStyle = '#111'; g.beginPath(); g.roundRect(hx - 26, hy - 8, 23, 14, 5); g.roundRect(hx + 3, hy - 8, 23, 14, 5); g.fill(); g.fillRect(hx - 4, hy - 5, 8, 3); g.fillStyle = 'rgba(120,200,255,.5)'; g.fillRect(hx - 22, hy - 6, 7, 3); g.fillRect(hx + 7, hy - 6, 7, 3); }
    if (r.style === 'collector') { g.beginPath(); g.arc(hx, hy - 6, hr + 4, Math.PI * 1.02, -.02); g.fill(); g.beginPath(); g.moveTo(hx - 32, hy - 10); g.quadraticCurveTo(hx - 6, hy - 6, hx + 4, hy - 30); g.lineTo(hx - 20, hy - 30); g.fill();
      g.fillStyle = '#2a2230'; g.beginPath(); g.ellipse(hx + 6, hy - 34, 34, 10, -.15, 0, TAU); g.fill(); g.beginPath(); g.arc(hx + 22, hy - 44, 4, 0, TAU); g.fill();
      g.strokeStyle = '#ffd23f'; g.lineWidth = 2.5; g.beginPath(); g.arc(hx + 11, hy - 1, 10, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(hx + 20, hy + 5); g.quadraticCurveTo(hx + 28, hy + 30, hx + 20, hy + 48); g.stroke(); }
    if (r.style === 'rich') { g.beginPath(); g.arc(hx, hy - 8, hr + 3, Math.PI * 1.05, -.05); g.fill(); g.beginPath(); g.arc(hx, hy - 42, 18, 0, TAU); g.fill();
      g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(hx - 22, hy - 30); for (let k = 0; k <= 4; k++) { g.lineTo(hx - 22 + k * 11, hy - (k % 2 ? 40 : 50)); } g.lineTo(hx + 22, hy - 30); g.closePath(); g.fill(); g.strokeStyle = '#a07a10'; g.lineWidth = 1.5; g.stroke();
      for (const [k, c] of [[-11, '#e83a5a'], [0, '#5ac8ff'], [11, '#5ae88a']]) { g.fillStyle = c; g.beginPath(); g.arc(hx + k, hy - 36, 3, 0, TAU); g.fill(); }
      g.fillStyle = '#fff'; g.beginPath(); g.arc(hx - hr - 1, hy + 12, 3.5, 0, TAU); g.arc(hx + hr + 1, hy + 12, 3.5, 0, TAU); g.fill(); }
    // the bidding paddle
    if (st.paddle) { const px = x + w - 6, py = y - 70 - st.paddle * 40; g.strokeStyle = '#6a4626'; g.lineWidth = 6; g.beginPath(); g.moveTo(px, y - 8); g.lineTo(px, py + 20); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py, 22, 0, TAU); g.fill(); g.strokeStyle = r.col; g.lineWidth = 4; g.stroke(); tx(g, String(st.num), px, py + 1, D(20), '#1a1410'); g.fillStyle = L.skin; g.beginPath(); g.arc(px, y - 10, 9, 0, TAU); g.fill(); }
    g.restore();
  }
  function rivalState(r, i) {
    const k = A.price / r.max, lead = A.lead === i;
    if (r.out) return { mood: -1, num: i + 1 };
    return { mood: k < .55 ? 1 : k < .8 ? .4 : k < .95 ? -.2 : -1, worry: k >= .8, sweat: k < .8 ? 0 : k < .95 ? 1 : 3, flush: k < .95 ? 0 : .8, grit: k >= .8 && k < .95 && !(r.qt > 0), talk: r.qt > 0 && !r.out, paddle: lead ? 1 : r.qt > 0 ? .6 : 0, num: i + 1 };
  }
  // shoppers: body type, outfit, hair, and a face that reacts to your prices
  function person(g, c, x, y, s = 1) {   // y = where their feet are
    const L = c.look, walking = c.st !== 'line' || Math.abs(c.z - .94) > .01, ph = (c.wk || 0) * 9, bob = walking ? Math.abs(Math.sin(ph)) * 3 : Math.sin(t * 2.2 + x) * .8;
    const bw = L.build === 2 ? 1.3 : L.build === 0 ? .85 : 1, sw = walking ? Math.sin(ph) * 7 : 0, top = L.top || 'tee', pants = L.pants || '#2a2a3a';
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, 2, 26 * bw, 6, 0, 0, TAU); g.fill();
    g.translate(0, -bob);
    // legs and shoes
    for (const [lx, d] of [[-8 * bw, 1], [8 * bw, -1]]) { const k = sw * d * .35; g.fillStyle = pants; g.beginPath(); g.roundRect(lx - 6.5 * bw + k, -60, 13 * bw, 58, 5); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); g.fillStyle = L.shoes || '#1a1410'; g.beginPath(); g.ellipse(lx + k, -2, 9 * bw, 5, 0, 0, TAU); g.fill(); }
    if (top === 'dress') { g.fillStyle = L.shirt; g.beginPath(); g.moveTo(-18 * bw, -64); g.lineTo(18 * bw, -64); g.lineTo(27 * bw, -24); g.lineTo(-27 * bw, -24); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); }
    // arms (behind the body on the far side)
    const arm = (sx, d) => { const ax = sx * 23 * bw, k = sw * d; g.strokeStyle = top === 'tee' || top === 'dress' ? L.skin : L.shirt; g.lineWidth = 11 * Math.min(1.15, bw); g.lineCap = 'round'; g.beginPath(); g.moveTo(ax, -106); g.lineTo(ax + sx * 3 - k * .2, -84 + Math.abs(k) * .1); g.lineTo(ax + sx * 2 + k * .6, -62); g.stroke();
      if (top === 'tee') { g.strokeStyle = L.shirt; g.beginPath(); g.moveTo(ax, -108); g.lineTo(ax + sx * 2, -94); g.stroke(); }
      g.fillStyle = L.skin; g.beginPath(); g.arc(ax + sx * 2 + k * .6, -59, 6.5, 0, TAU); g.fill(); };
    arm(-1, 1); arm(1, -1);
    // torso
    const tw = 21 * bw; g.fillStyle = L.shirt; g.beginPath(); g.roundRect(-tw, -114, tw * 2, top === 'dress' ? 52 : 58, [12, 12, 6, 6]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke();
    g.fillStyle = 'rgba(0,0,0,.13)'; g.beginPath(); g.roundRect(tw * .25, -112, tw * .7, 54, 6); g.fill();
    if (top === 'jacket') { g.fillStyle = L.inner || '#e8e8e8'; g.beginPath(); g.moveTo(-7, -113); g.lineTo(7, -113); g.lineTo(5, -58); g.lineTo(-5, -58); g.fill(); g.strokeStyle = shade(L.shirt, .6); g.lineWidth = 2; g.beginPath(); g.moveTo(-7, -113); g.lineTo(-12, -92); g.moveTo(7, -113); g.lineTo(12, -92); g.stroke(); }
    if (top === 'hoodie') { g.fillStyle = shade(L.shirt, .8); g.beginPath(); g.ellipse(0, -112, 17, 7, 0, 0, TAU); g.fill(); g.strokeStyle = '#eee'; g.lineWidth = 2; g.beginPath(); g.moveTo(-5, -108); g.lineTo(-6, -92); g.moveTo(5, -108); g.lineTo(6, -92); g.stroke(); g.fillStyle = shade(L.shirt, .85); g.fillRect(-12, -80, 24, 12); }
    if (top === 'tee' && L.print) { g.fillStyle = L.print; g.beginPath(); g.arc(0, -92, 7, 0, TAU); g.fill(); }
    if (c.ty.k === 'tourist') { g.fillStyle = 'rgba(255,255,255,.55)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(-12 + (k % 3) * 12, -104 + Math.floor(k / 3) * 22, 3.5, 0, TAU); g.fill(); } g.strokeStyle = '#1a1410'; g.lineWidth = 2; g.beginPath(); g.moveTo(-14, -112); g.lineTo(0, -90); g.lineTo(14, -112); g.stroke(); g.fillStyle = '#1a1410'; g.beginPath(); g.roundRect(-10, -94, 20, 14, 3); g.fill(); g.fillStyle = '#5ac8ff'; g.beginPath(); g.arc(0, -87, 4, 0, TAU); g.fill(); }
    if (c.ty.k === 'bargain') { g.strokeStyle = '#c8a878'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(tw - 4, -110); g.lineTo(tw + 6, -76); g.stroke(); g.fillStyle = '#e8d8b0'; g.beginPath(); g.roundRect(tw, -78, 18, 22, 3); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke(); }
    if (top !== 'dress') { g.fillStyle = shade(pants, .7); g.fillRect(-tw + 2, -60, tw * 2 - 4, 5); }
    // neck, head, hair
    const hy = -132, hs = L.hs ?? 0; g.fillStyle = shade(L.skin, .85); g.fillRect(-6, -118, 12, 8);
    g.fillStyle = L.hair; if (hs === 1) { g.beginPath(); g.roundRect(-20, hy - 16, 40, 46, 10); g.fill(); }
    g.fillStyle = L.skin; g.beginPath(); g.ellipse(-17, hy + 2, 4, 6, 0, 0, TAU); g.ellipse(17, hy + 2, 4, 6, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(0, hy, 17, 19.5, 0, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
    face(g, 0, hy + 2, 17, L.skin, c.mood > 0 ? 1 : c.mood < 0 ? -1 : 0, { worry: c.mood < 0, look: walking ? 0 : (c.side || 0) * -1 });
    g.fillStyle = L.hair;
    if (hs === 0) { g.beginPath(); g.arc(0, hy - 7, 18.5, Math.PI * 1.03, -.03); g.fill(); }
    if (hs === 1) { g.beginPath(); g.arc(0, hy - 7, 19, Math.PI, 0); g.fill(); g.fillRect(-19, hy - 4, 5, 22); g.fillRect(14, hy - 4, 5, 22); }
    if (hs === 2) { g.beginPath(); g.arc(0, hy - 7, 18.5, Math.PI * 1.03, -.03); g.fill(); g.beginPath(); g.arc(0, hy - 22, 9, 0, TAU); g.fill(); }
    if (hs === 3) { g.beginPath(); g.ellipse(-15, hy - 4, 5, 8, 0, 0, TAU); g.ellipse(15, hy - 4, 5, 8, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.ellipse(-5, hy - 14, 6, 3, -.3, 0, TAU); g.fill(); }
    if (hs === 4) { for (let k = 0; k < 9; k++) { const a = Math.PI + k / 8 * Math.PI; g.beginPath(); g.arc(Math.cos(a) * 16, hy - 4 + Math.sin(a) * 17, 8, 0, TAU); g.fill(); } }
    if (hs === 5) { g.beginPath(); g.moveTo(-18, hy - 4); for (let k = 0; k <= 6; k++) g.lineTo(-18 + k * 6, hy - (k % 2 ? 30 : 18)); g.lineTo(18, hy - 4); g.closePath(); g.fill(); }
    if (L.beard) { g.fillStyle = L.hair; g.beginPath(); g.moveTo(-16, hy + 4); g.quadraticCurveTo(-14, hy + 24, 0, hy + 24); g.quadraticCurveTo(14, hy + 24, 16, hy + 4); g.quadraticCurveTo(8, hy + 14, 0, hy + 13); g.quadraticCurveTo(-8, hy + 14, -16, hy + 4); g.fill(); }
    if (L.hat) { g.fillStyle = L.hatC || L.shirt; g.beginPath(); g.arc(0, hy - 6, 19, Math.PI, 0); g.fill(); g.fillRect(-4, hy - 10, 30, 6); g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath(); g.arc(0, hy - 6, 19, Math.PI, 0); g.stroke(); }
    if (c.ty.k === 'collector') { g.strokeStyle = '#c8a050'; g.lineWidth = 2; g.beginPath(); g.arc(-6.5, hy - 1, 5.5, 0, TAU); g.moveTo(12, hy - 1); g.arc(6.5, hy - 1, 5.5, 0, TAU); g.stroke(); }
    if (c.fan) tx(g, '★', 0, hy - 42, D(22), '#ffd23f');
    g.restore();
  }
  // the shop, seen from behind your counter
  const SBX0 = 430, SBX1 = 850, SBT = 150, SBB = 400, SFRONT = 640;
  const wallTop = x => x < SBX0 ? lp(40, SBT, (x - K.view.x0) / (SBX0 - K.view.x0)) : x > SBX1 ? lp(SBT, 40, (x - SBX1) / (K.view.x1 - SBX1)) : SBT;
  function shelfSpot(i) {   // where shelf slot i sits on the side walls
    const n = slots(), half = Math.ceil(n / 2), left = i < half, j = left ? i : i - half, per = Math.ceil(half / 2), row = Math.floor(j / per), col = j % per;
    const k = (col + .5) / per, x = left ? lp(SBX0 - 30, 60, k) : lp(SBX1 + 30, 1220, k), sc = lp(.55, 1.05, k);
    const top = left ? lp(SBT, 40, k) : lp(SBT, 40, k), bot = left ? lp(SBB, 600, k) : lp(SBB, 600, k), y = lp(top, bot, .3 + row * .28);
    return { x, y, sc, left, k, row };
  }
  function drawShop(g) {
    const v = K.view, poly = (pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fill(); };
    // ceiling, walls with wallpaper and wood panelling, a plank floor and a rug
    poly([[v.x0, v.y0], [v.x1, v.y0], [v.x1, 40], [SBX1, SBT], [SBX0, SBT], [v.x0, 40]], '#3a2a22');
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 3; for (let k = 1; k < 5; k++) { const f = k / 5; g.beginPath(); g.moveTo(lp(v.x0, SBX0, f), lp(40, SBT, f)); g.lineTo(lp(v.x1, SBX1, f), lp(40, SBT, f)); g.stroke(); }
    const wall = (x0, x1, top0, top1, bot0, bot1, c1, c2) => {
      poly([[x0, top0], [x1, top1], [x1, bot1], [x0, bot0]], c1);
      g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 6; for (let k = 0; k <= 12; k++) { const x = lp(x0, x1, k / 12); g.beginPath(); g.moveTo(x, lp(top0, top1, k / 12)); g.lineTo(x, lp(lp(top0, bot0, .55), lp(top1, bot1, .55), k / 12)); g.stroke(); }
      poly([[x0, lp(top0, bot0, .62)], [x1, lp(top1, bot1, .62)], [x1, bot1], [x0, bot0]], c2);
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; for (let k = 0; k <= 8; k++) { const x = lp(x0, x1, k / 8); g.beginPath(); g.moveTo(x, lp(lp(top0, bot0, .62), lp(top1, bot1, .62), k / 8)); g.lineTo(x, lp(bot0, bot1, k / 8)); g.stroke(); }
      g.fillStyle = '#5a3a24'; g.beginPath(); g.moveTo(x0, lp(top0, bot0, .62)); g.lineTo(x1, lp(top1, bot1, .62)); g.lineTo(x1, lp(top1, bot1, .62) + 5); g.lineTo(x0, lp(top0, bot0, .62) + 7); g.fill();
    };
    wall(v.x0, SBX0, 40, SBT, 620, SBB, '#2e5a52', '#6a4630'); wall(v.x1, SBX1, 40, SBT, 620, SBB, '#2a544c', '#664230');
    // the back wall: wallpaper, the shop sign, two windows on the street, the door
    g.fillStyle = '#2f5c54'; g.fillRect(SBX0, SBT, SBX1 - SBX0, SBB - SBT); g.fillStyle = 'rgba(255,255,255,.05)'; for (let x = SBX0; x < SBX1; x += 16) g.fillRect(x, SBT, 7, (SBB - SBT) * .6); g.fillStyle = '#6a4630'; g.fillRect(SBX0, SBT + (SBB - SBT) * .62, SBX1 - SBX0, (SBB - SBT) * .38);
    rr(g, 520, 160, 240, 34, 6, '#1a1210', '#c8a050', 3); tx(g, 'BANDIT\'S PAWN & RESALE', 640, 177, D(15), '#ffd890');
    const street = (x, y, w, h) => { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#8ac8ff'); gr.addColorStop(1, '#ffe2b8'); g.fillStyle = gr; g.fillRect(x, y, w, h); g.fillStyle = '#7a8aa8'; for (let k = 0; k < 4; k++) g.fillRect(x + k * 30 - 6, y + h * .35 - (k % 2) * 14, 26, h); g.fillStyle = '#5a6278'; g.fillRect(x, y + h * .78, w, h); const cx = x - 60 + ((t * 40) % (w + 140)); g.fillStyle = '#e85a5a'; g.fillRect(cx, y + h * .66, 46, 14); g.fillStyle = '#1a1a1a'; g.fillRect(cx + 6, y + h * .66 + 12, 8, 6); g.fillRect(cx + 32, y + h * .66 + 12, 8, 6);
      if (lv('truck') && x < 600) { g.fillStyle = '#f2f2f2'; g.fillRect(x + 8, y + h * .5, 54, 28); g.fillStyle = '#ffb347'; g.fillRect(x + 8, y + h * .5 + 10, 54, 5); } g.restore(); };
    for (const wx of [455, 715]) { street(wx, 205, 110, 85); g.strokeStyle = '#3a2a1e'; g.lineWidth = 7; g.strokeRect(wx, 205, 110, 85); g.lineWidth = 3; g.beginPath(); g.moveTo(wx + 55, 205); g.lineTo(wx + 55, 290); g.moveTo(wx, 248); g.lineTo(wx + 110, 248); g.stroke(); g.fillStyle = '#4a3020'; g.fillRect(wx - 6, 290, 122, 8); }
    street(595, 232, 90, 168); rr(g, 595, 232, 90, 168, 4, null, '#3a2a1e', 7); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(603, 240, 26, 150); g.fillStyle = '#c8a050'; g.beginPath(); g.arc(673, 320, 5, 0, TAU); g.fill();
    g.fillStyle = '#c8a050'; g.beginPath(); g.arc(640, 226, 6, 0, TAU); g.fill();   // the bell
    const sign = lv('sign'); rr(g, 470, 214, 80, 30, 6, 'rgba(0,0,0,.35)', sign ? (Math.sin(t * 3) > -.4 ? '#ff5aa0' : '#5a2a3a') : '#ffd23f', 3); tx(g, 'OPEN', 510, 229, D(18), sign ? (Math.sin(t * 3) > -.4 ? '#ff7ab8' : '#7a3a5a') : '#ffd23f');
    // a clock running with the shop day, and posters
    const cxk = 800, cyk = 330, frac = store ? store.t / STORE_T : 0; g.fillStyle = '#f2ead8'; g.beginPath(); g.arc(cxk, cyk, 18, 0, TAU); g.fill(); g.strokeStyle = '#3a2a1e'; g.lineWidth = 3; g.stroke(); g.beginPath(); g.moveTo(cxk, cyk); g.lineTo(cxk + Math.sin(frac * TAU * 8) * 13, cyk - Math.cos(frac * TAU * 8) * 13); g.moveTo(cxk, cyk); g.lineTo(cxk + Math.sin(frac * TAU) * 8, cyk - Math.cos(frac * TAU) * 8); g.stroke();
    rr(g, 455, 312, 56, 70, 3, '#f2e8c8', '#3a2a1e', 3); tx(g, 'WE', 483, 330, D(12), '#c8483a'); tx(g, 'BUY', 483, 346, D(12), '#c8483a'); tx(g, '& SELL', 483, 362, D(10), '#3a2a1e');
    if (lv('charm')) { rr(g, 720, 312, 52, 66, 3, '#2a2a3a', '#c8a050', 3); tx(g, '★', 746, 334, D(18), '#ffd23f'); tx(g, 'EMPLOYEE', 746, 352, F(7), '#fff'); tx(g, 'OF THE MONTH', 746, 362, F(6), '#fff'); }
    // the floor: planks and a rug
    poly([[SBX0, SBB], [SBX1, SBB], [v.x1, 620], [v.x1, v.y1], [v.x0, v.y1], [v.x0, 620]], '#7a5636');
    g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 2; for (let k = -8; k <= 8; k++) { g.beginPath(); g.moveTo(640 + k * 28, SBB); g.lineTo(640 + k * 150, 720); g.stroke(); } for (const f of [.15, .35, .6]) { const y = lp(SBB, 720, f); g.beginPath(); g.moveTo(lp(SBX0, v.x0, f), y); g.lineTo(lp(SBX1, v.x1, f), y); g.stroke(); }
    poly([[560, 430], [720, 430], [880, 560], [400, 560]], '#8a2a2a'); poly([[575, 438], [705, 438], [855, 552], [425, 552]], '#a83a32'); g.strokeStyle = '#e8c070'; g.lineWidth = 3; g.beginPath(); g.moveTo(590, 446); g.lineTo(690, 446); g.lineTo(830, 544); g.lineTo(450, 544); g.closePath(); g.stroke();
    // potted plants in the corners, an appraiser's desk, display cases
    for (const [px, py, sc] of [[470, 392, .7], [810, 392, .7]]) { g.save(); g.translate(px, py); g.scale(sc, sc); g.fillStyle = '#b85a3a'; g.fillRect(-14, -18, 28, 22); g.fillStyle = '#3a8a3a'; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(Math.cos(k) * 10, -30 - Math.sin(k * 2) * 6, 7, 16, k - 2.5, 0, TAU); g.fill(); } g.restore(); }
    if (lv('appr')) { poly([[95, 470], [250, 452], [250, 476], [95, 500]], '#5a3a24'); g.fillStyle = '#2a2a2a'; g.fillRect(150, 420, 4, 36); g.fillStyle = '#ffe8a0'; g.beginPath(); g.ellipse(160, 418, 16, 8, 0, 0, TAU); g.fill(); tx(g, '🔍', 210, 452, '22px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif', '#fff'); }
    for (const side of [-1, 1]) { const bx = 640 + side * 330, by = 470; poly([[bx - 50, by], [bx + 50, by], [bx + 56, by + 50], [bx - 56, by + 50]], '#5a3a24'); g.fillStyle = 'rgba(190,230,255,.25)'; g.fillRect(bx - 48, by - 46, 96, 46); g.strokeStyle = 'rgba(220,240,255,.6)'; g.lineWidth = 2; g.strokeRect(bx - 48, by - 46, 96, 46); const top = shelf.length ? [...shelf].sort((a, b) => b.v - a.v)[side < 0 ? 0 : 1] : null; if (top) itemIcon(g, { ...top, boxed: false }, bx, by - 22, .55); }
    // ceiling: a slow fan and the lamps
    g.save(); g.translate(640, 96); g.fillStyle = '#2a1e18'; g.fillRect(-3, -40, 6, 30); g.rotate(t * 2.2); g.fillStyle = 'rgba(90,64,44,.85)'; for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.beginPath(); g.ellipse(46, 0, 44, 7, 0, 0, TAU); g.fill(); } g.restore(); g.fillStyle = '#c8a050'; g.beginPath(); g.arc(640, 96, 9, 0, TAU); g.fill();
    for (const lx of [480, 800, ...(lv('lights') >= 2 ? [300, 980] : [])]) { g.strokeStyle = '#222'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, 40); g.lineTo(lx, 70); g.stroke(); g.fillStyle = '#2a2a2a'; g.beginPath(); g.moveTo(lx - 20, 82); g.lineTo(lx - 10, 68); g.lineTo(lx + 10, 68); g.lineTo(lx + 20, 82); g.fill(); g.fillStyle = '#ffe8a0'; g.beginPath(); g.ellipse(lx, 82, 18, 5, 0, 0, TAU); g.fill();
      const gl = g.createRadialGradient(lx, 90, 10, lx, 90, 280 + lv('lights') * 60); gl.addColorStop(0, `rgba(255,236,170,${.1 + lv('lights') * .05})`); gl.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = gl; g.fillRect(lx - 340, 70, 680, 560); }
    // shelves on the side walls, with what you stocked
    for (const left of [true, false]) for (const f of [.3, .58]) { const xa = left ? SBX0 : SBX1, xb = left ? 40 : 1240, ya = lp(SBT, SBB, f) + 26, yb = lp(40, 600, f) + 46; g.strokeStyle = '#4a3020'; g.lineWidth = 9; g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke(); }
    for (let i = 0; i < slots(); i++) { const sp = shelfSpot(i), it = shelf[i]; if (it) { itemIcon(g, { ...it, boxed: false }, sp.x, sp.y, sp.sc * (it.big ? .55 : .8)); rr(g, sp.x - 26 * sp.sc, sp.y + 26 * sp.sc, 52 * sp.sc, 16 * sp.sc, 4, '#f2e8c8'); tx(g, (lv('appr') ? '' : '~') + money(it.v), sp.x, sp.y + 34 * sp.sc, F(Math.max(8, Math.round(11 * sp.sc))), '#3a2a1e'); } }
  }
  function drawStore(g) {
    const v = K.view, S = store;
    drawShop(g);
    // customers, far to near
    const scr = c => ({ x: 640 + c.lx * lp(170, 560, c.z), y: lp(SBB, 720, c.z), s: lp(.42, 2.1, c.z) });
    for (const c of [...S.walk].sort((a, b) => a.z - b.z)) { const p = scr(c); person(g, c, p.x, p.y, p.s); }
    // the counter in front of you, and the register
    const gr = g.createLinearGradient(0, 560, 0, 720); gr.addColorStop(0, '#7a5232'); gr.addColorStop(1, '#4a3020'); g.fillStyle = gr; g.fillRect(v.x0, 560, v.x1 - v.x0, v.y1 - 560);
    g.fillStyle = '#9a6a42'; g.fillRect(v.x0, 552, v.x1 - v.x0, 14);
    rr(g, 1000, 470, 210, 100, 10, '#3a3a44'); rr(g, 1012, 482, 120, 40, 4, '#1a2a1a'); tx(g, money(cash).slice(0, 9), 1072, 503, D(18), '#5cf2a0'); for (let k = 0; k < 6; k++) rr(g, 1140 + (k % 2) * 30, 482 + Math.floor(k / 2) * 26, 24, 20, 4, '#c8c8d0');
    if (S.drawer > 0) { rr(g, 990, 566, 230, 30 * S.drawer + 6, 4, '#2a2a30'); tx(g, '$$$', 1105, 580, D(18), '#5cf2a0'); }
    rr(g, 470, 568, 340, 60, 10, 'rgba(30,60,40,.6)');
    hud(g);
    tx(g, `Closes in ${Math.max(0, Math.ceil(STORE_T - S.t))}s · ${shelf.length} on the shelves · ${inv.length} in the back`, 640, 92, F(16), '#fff3e0', 'center', 4);
    const c = atCounter();
    if (c) {
      itemIcon(g, { ...c.it, boxed: false }, 640, 586, c.it.big ? .9 : 1.1);
      const p = scr(c), by = p.y - 190 * p.s - 30;
      rr(g, 400, by - 74, 480, 96, 16, '#fff'); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(620, by + 22); g.lineTo(640, by + 40); g.lineTo(660, by + 22); g.fill();
      tx(g, c.it.n + ' · ' + c.ty.n + (c.fan ? ' · SUPERFAN' : ''), 640, by - 52, D(18), '#1a1410'); tx(g, (lv('appr') ? 'worth ' : 'worth about ') + money(c.it.v), 640, by - 30, F(13), '#7a5a3e');
      tx(g, c.bub && c.bub.length > 46 ? c.bub.slice(0, 45) + '…' : c.bub || '', 640, by - 4, F(17), '#1a1410');
      if (!c.leaving) {
        button(g, 'yes', 150, 638, 230, 72, 'SELL ' + money(c.offer), '#5cf2a0', 'Accept (1)');
        button(g, 'more', 395, 638, 175, 72, 'ASK MORE', '#ffd23f', '+18% (2)');
        button(g, 'big', 710, 638, 175, 72, 'ASK A LOT', '#ff8a3a', '+45% (3)');
        button(g, 'no', 900, 638, 120, 72, 'NO', 'rgba(255,255,255,.25)', '(4)', '#fff');
        for (let i = 0; i < c.pat; i++) tx(g, '♥', 610 + i * 26, 690, D(22), '#ff5a7a');
      }
    } else {
      const leaving = S.walk.find(q => q.leaving && q.bub && q.bt > 0); if (leaving) { const p = scr(leaving); tx(g, leaving.bub, p.x, p.y - 200 * p.s - 20, D(22), leaving.mood > 0 ? '#5cf2a0' : '#ff8a8a', 'center', 5); }
      tx(g, S.t >= STORE_T ? 'Closing up...' : shelf.length ? 'Waiting for customers...' : 'Your shelves are empty!', 640, 662, D(24), '#fff3e0', 'center', 5);
    }
    button(g, 'restock', 30, 80, 170, 54, 'SHELVES', 'rgba(0,0,0,.45)', 'restock them', '#fff');
    if (S.t < STORE_T) button(g, 'close', 1090, 650, 170, 50, 'CLOSE EARLY', 'rgba(255,255,255,.18)', null, '#fff');
  }
  function drawStock(g) {
    drawShop(g); g.fillStyle = 'rgba(10,6,4,.55)'; g.fillRect(K.view.x0, K.view.y0, K.view.x1 - K.view.x0, K.view.y1 - K.view.y0);
    hud(g);
    tx(g, 'STOCK YOUR SHELVES', 640, 104, D(40), '#ffb347', 'center', 6); tx(g, 'Tap a find to put it out. Tap a shelf spot to take it back. Customers only buy what is on the shelves.', 640, 138, F(16), '#fff3e0', 'center', 4);
    // the shelf spots
    const n = slots(), cols = Math.min(8, n), sw = 128;
    for (let i = 0; i < n; i++) { const x = 640 - (cols - 1) * sw / 2 + (i % cols) * sw, y = 210 + Math.floor(i / cols) * 104, it = shelf[i], b = { x: x - 58, y: y - 44, w: 116, h: 92 }; if (it) btn['sh' + i] = b;
      rr(g, b.x, b.y, b.w, b.h, 12, it ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.04)', it ? '#ffb347' : 'rgba(255,255,255,.15)', 2); g.fillStyle = '#4a3020'; g.fillRect(b.x + 6, b.y + b.h - 14, b.w - 12, 6);
      if (it) { itemIcon(g, { ...it, boxed: false }, x, y - 6, it.big ? .55 : .75); tx(g, est(it), x, y + 30, F(11), '#5cf2a0'); } else tx(g, 'empty', x, y, F(12), 'rgba(255,255,255,.3)'); }
    // the back room
    const B = backRoom(), y0 = 210 + Math.ceil(n / cols) * 104 + 10;
    tx(g, `BACK ROOM (${B.length})`, 70, y0, D(22), '#ffd23f', 'left');
    B.slice(0, 18).forEach((it, i) => { const x = 70 + (i % 9) * 128, y = y0 + 22 + Math.floor(i / 9) * 78, b = { x, y, w: 120, h: 70 }; btn['inv' + i] = b;
      rr(g, x, y, 120, 70, 10, 'rgba(0,0,0,.45)', '#7a6a5a', 2); itemIcon(g, { ...it, boxed: false }, x + 30, y + 35, it.big ? .45 : .6); tx(g, it.n.length > 11 ? it.n.slice(0, 10) + '…' : it.n, x + 58, y + 24, F(11), '#fff', 'left'); tx(g, est(it), x + 58, y + 46, F(10), '#5cf2a0', 'left'); });
    if (B.length > 18) tx(g, `+${B.length - 18} more`, 1220, y0, F(14), '#cfc0a8', 'right');
    if (!B.length && !shelf.length) tx(g, 'Nothing to sell yet. Win some lockers!', 640, y0 + 60, D(24), '#fff3e0');
    button(g, 'auto', 70, 640, 260, 60, 'AUTO-FILL', 'rgba(255,255,255,.2)', 'best things first', '#fff');
    button(g, 'open', 820, 628, 390, 76, store ? 'BACK TO THE COUNTER' : 'OPEN THE SHOP', '#ffd23f', store ? null : 'Stand behind the counter');
  }
  function drawEve(g) {
    const v = K.view, gr = g.createLinearGradient(0, v.y0, 0, v.y1); gr.addColorStop(0, '#2a1a3a'); gr.addColorStop(1, '#1a1410'); g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    hud(g);
    rr(g, 40, 84, 470, 520, 18, 'rgba(0,0,0,.45)', '#ffb347', 2);
    tx(g, `DAY ${day} DONE`, 275, 124, D(38), '#ffb347');
    const rows = [['Lockers won', log.won], ['Spent at auction', '-' + money(log.spent)], ['Scrap & junk', '+' + money(log.scrap)], ['Items sold', log.sold], ['Sales', '+' + money(log.sales)], ['Rent', '-' + money(log.rent)], ['Cash now', money(cash)], ['Stock in hand', inv.length + ' items']];
    rows.forEach(([a, b], i) => { tx(g, a, 70, 176 + i * 44, F(19), '#fff3e0', 'left'); tx(g, String(b), 480, 176 + i * 44, D(24), /^-/.test(b) ? '#ff8a8a' : /^\+/.test(b) ? '#5cf2a0' : '#fff', 'right'); });
    tx(g, `Tomorrow's rent: ${money(rent())}`, 275, 560, F(16), '#cfc0a8');
    tx(g, 'UPGRADES', 870, 110, D(34), '#5cf2a0');
    UPG.forEach((u, i) => { const l = lv(u.k), maxed = l >= u.max, c = maxed ? 0 : u.cost(l), b = { x: 560 + (i % 2) * 340, y: 136 + Math.floor(i / 2) * 104, w: 326, h: 92 }; btn['up' + i] = b;
      rr(g, b.x, b.y, b.w, b.h, 14, maxed ? 'rgba(92,242,160,.15)' : 'rgba(255,255,255,.08)', !maxed && cash >= c ? '#ffd23f' : 'rgba(255,255,255,.15)', 2);
      tx(g, u.k === 'lic' && !maxed ? 'License: ' + YARDS[l + 1].name : u.name, b.x + 14, b.y + 24, D(u.k === 'lic' ? 17 : 21), '#fff', 'left'); tx(g, maxed ? 'MAXED' : money(c), b.x + b.w - 14, b.y + 24, D(20), maxed ? '#5cf2a0' : cash >= c ? '#ffd23f' : '#ff8a8a', 'right');
      tx(g, u.d, b.x + 14, b.y + 52, F(14, 700), '#cfc0a8', 'left'); for (let k = 0; k < u.max; k++) { g.fillStyle = k < l ? '#5cf2a0' : 'rgba(255,255,255,.18)'; g.fillRect(b.x + 14 + k * 26, b.y + 70, 20, 8); } });
    if (day < DAYS) { tx(g, 'TOMORROW', 600, 582, F(13), '#cfc0a8'); for (let i = 0; i <= lv('lic'); i++) { const b = { x: 650 + i * 120, y: 562, w: 112, h: 40 }; btn['yd' + i] = b; rr(g, b.x, b.y, b.w, b.h, 10, yard === i ? YARDS[i].col : 'rgba(255,255,255,.08)', yard === i ? '#fff' : 'rgba(255,255,255,.2)', 2); tx(g, YARDS[i].k.toUpperCase(), b.x + b.w / 2, b.y + 21, D(16), yard === i ? '#1a1410' : '#fff'); } }
    button(g, 'go', 560, 612, 666, 76, day >= DAYS ? 'FINISH THE SEASON' : `DAY ${day + 1}: ${YARDS[yard].name.toUpperCase()}`, '#ffd23f', day >= DAYS ? null : `Lockers open around ${money(YARDS[yard].open[0])}–${money(YARDS[yard].open[1])}`);
  }
  GAME.draw = g => {
    for (const k in btn) delete btn[k];
    if (mode === 'yard') drawYard(g); else if (mode === 'auction' && A) drawAuction(g); else if (mode === 'stock') drawStock(g); else if (mode === 'store' && store) drawStore(g); else if (mode === 'eve' || mode === 'broke' || mode === 'done') drawEve(g);
    msgs.forEach((m, i) => { g.globalAlpha = Math.min(1, (2.2 - m.t) * 2); tx(g, m.s, 640, 140 + i * 34 - m.t * 20, D(28), m.c, 'center', 5); g.globalAlpha = 1; });
  };
  GAME.pose = () => {   // cover: a container door rolled up on treasure
    posed = true; yard = 2; up = { truck: 1, appr: 1 }; startDay(); startPeek(); A.L.items.forEach((it, i) => { const p = [['💎', 'Gems', 5200], ['🏍️', 'Motorbike', 4800, 1], ['🎹', 'Grand piano', 6500, 1], ['🗿', 'Statue', 3600, 1], ['👜', 'Bags', 1900], ['🍷', 'Wine', 2300], ['🏺', 'Vase', 2900], ['🪆', 'Dolls', 950], ['🦾', 'Robot arm', 3100, 1]][i % 9]; Object.assign(it, { ic: p[0], n: p[1], v: p[2], big: !!p[3], boxed: false }); });
    A.phase = 'won'; A.t = 2; A.paid = 6000; A.reveal = 99;
  };
  GAME.test = { st: () => ({ mode, day, cash: Math.round(cash), yard, li, inv: inv.length, shelf: shelf.length, up, phase: A && A.phase, price: A && A.price, inc: A && A.L.Y.inc, lead: A && A.lead, rivals: A && A.rivals && A.rivals.map(r => ({ n: r.n, max: r.max, out: r.out })), lotV: A && A.L.v, store: store && { t: Math.round(store.t), q: store.q.length, walk: store.walk.length, offer: atCounter() && atCounter().offer, bub: atCounter() && atCounter().bub }, log }), press, youBid, youPass, deal, buy: i => buy(UPG[i]), setCash: v => { cash = v; }, A: () => A };
})();
