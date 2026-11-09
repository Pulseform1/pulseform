/* Night Market: run a street-food stall from 6 PM to 2 AM. Customers wander the lantern-lit street, stop if your stall
   looks good (reputation, prices, how long the queue is), and order. Cook on the grill, the steamer, the wok (toss it
   at the right moment for a perfect plate) and the drinks station, then serve before their patience runs out.
   Between nights: buy stock, set prices, pay the rent and buy upgrades, up to a helper and a second dessert stall.
   Seven nights to become a market legend. */
const GAME = {
  id: 'night-market', title: 'Night Market', tagline: 'Cook fast, serve faster, own the night.',
  font: 'Titan One', accent: '#ffb347', accent2: '#ff5a8a', bg: '#140a24', noHud: true, noSkins: true, scoreLabel: 'Takings ($)',
  how: [
    'Tap a station to cook: the grill does skewers, the steamer a batch of dumplings, the wok noodles, the cart bubble tea.',
    'Tap a finished dish to put it on your tray (burnt food is wasted!). The wok glows halfway: tap it then to toss for a perfect plate.',
    'Tap a customer to hand over what they ordered. Quick service earns tips and reputation; slow service sends them away.',
    'Between nights buy stock, set prices and upgrade. Make the rent each night. Keys 1 to 5 tap the stations.',
  ],
  skins: [{ name: 'Classic', price: 0 }],
};
(() => {
  'use strict';
  const TAU = Math.PI * 2, cl = (v, a, b) => v < a ? a : v > b ? b : v, lp = (a, b, t) => a + (b - a) * t;
  const NIGHT_LEN = 210, NIGHTS = 7, RENT = [40, 65, 90, 120, 155, 195, 240], START_CASH = 60;
  const ITEMS = {
    skewer: { name: 'Skewers', st: 'grill', base: 3, cost: 1.1, night: 1 },
    drink: { name: 'Bubble tea', st: 'drinks', base: 2.5, cost: .8, night: 1 },
    dumpling: { name: 'Dumplings', st: 'steam', base: 4, cost: 1.4, night: 2 },
    noodle: { name: 'Noodles', st: 'wok', base: 6, cost: 2.1, night: 3 },
    mango: { name: 'Mango rice', st: 'dessert', base: 5, cost: 1.7, night: 99 },
  };
  const IK = Object.keys(ITEMS), PRICE = [['Cheap', .8, 1.3], ['Fair', 1, 1], ['Premium', 1.3, .7]];
  const UPG = [
    { k: 'grill', name: 'Bigger grill', desc: 'Two more skewer spots.', cost: 80 },
    { k: 'tray', name: 'Bigger tray', desc: 'Hold 8 dishes, not 6.', cost: 60 },
    { k: 'bench', name: 'Cozy bench', desc: 'Customers wait 30% longer.', cost: 70 },
    { k: 'lanterns', name: 'Paper lanterns', desc: '25% more people stop by.', cost: 90, night: 2 },
    { k: 'steam2', name: 'Second steamer', desc: 'Steam two batches at once.', cost: 100, night: 2 },
    { k: 'machine', name: 'Tea machine', desc: 'Brews tea by itself, 3 at a time.', cost: 110, night: 2 },
    { k: 'wok2', name: 'Second wok', desc: 'Two noodle dishes at once.', cost: 130, night: 3 },
    { k: 'helper', name: 'Hire a helper', desc: 'Moves finished food to the tray and serves full orders.', cost: 180, night: 3 },
    { k: 'stall2', name: 'Second stall', desc: 'A dessert stall: mango rice, and more customers.', cost: 260, night: 4 },
    { k: 'neon', name: 'Neon sign', desc: 'Start every night with better reputation.', cost: 150, night: 4 },
  ];
  /* ---------- state ---------- */
  let mode = 'prep', night = 1, cash = START_CASH, takings = 0, rep = 3, own = {}, stock = {}, price = {}, clock = 0, t = 0;
  let S = {}, tray = [], cust = [], walkers = [], spawnT = 0, nightLog = null, msg = null, helperT = 0, botT = 0, stars = [], lanterns = [], over = false;
  const cap = () => own.tray ? 8 : 6, slotsQ = () => 7;
  const unlocked = k => ITEMS[k].night <= night || (k === 'mango' && own.stall2);
  const priceOf = k => Math.round(ITEMS[k].base * PRICE[price[k] ?? 1][1] * 2) / 2;
  for (let i = 0; i < 110; i++) stars.push({ x: Math.random() * 1400 - 60, y: Math.random() * 240, s: Math.random() * 1.8 + .4, p: Math.random() * 6 });
  for (let i = 0; i < 22; i++) lanterns.push({ x: -40 + i * 64, y: 74 + Math.sin(i * .9) * 14, c: ['#ff5a5a', '#ffb347', '#ffd23f', '#ff7ad9'][i % 4] });
  function newStations() {
    S = {
      grill: { slots: Array.from({ length: own.grill ? 5 : 3 }, () => -1), x: 400, key: 1 },
      steam: { b: Array.from({ length: own.steam2 ? 2 : 1 }, () => ({ t: -1, n: 0 })), x: 560, key: 2 },
      wok: { w: Array.from({ length: own.wok2 ? 2 : 1 }, () => ({ t: -1, toss: 0 })), x: 720, key: 3 },
      drinks: { slots: Array.from({ length: own.machine ? 3 : 2 }, () => -1), x: 870, key: 4 },
      dessert: { slots: [-1, -1, -1], x: 1060, key: 5 },
    };
  }
  /* ---------- the night ---------- */
  function startNight() {
    mode = 'night'; clock = 0; tray = []; cust = []; walkers = []; spawnT = 1; newStations();
    if (own.neon) rep = Math.max(rep, 3.5);
    nightLog = { served: 0, lost: 0, revenue: 0, tips: 0, burnt: 0, stockCost: nightLog ? nightLog.nextStock || 0 : 0, perfect: 0 };
    say('NIGHT ' + night + ': THE MARKET IS OPEN!', '#ffd23f'); K.sfx(392, .2, 'triangle', .1); K.sfx(523, .25, 'triangle', .1, 0, .12);
  }
  const hourOf = c => 18 + c / NIGHT_LEN * 8;
  function crowd() { const h = hourOf(clock); return h < 19 ? .55 : h < 21 ? .8 + (h - 19) * .2 : h < 23 ? 1.25 : h < 24.5 ? 1 : .55; }   // a rush from 9 to 11
  function want(k) { const p = price[k] ?? 1; return PRICE[p][2]; }
  function spawnCustomer() {
    const menu = IK.filter(unlocked).filter(k => (stock[k] || 0) > 0 || Math.random() < .25); if (!menu.length) return;
    const n = Math.random() < .5 ? 1 : Math.random() < .7 ? 2 : 3, order = [];
    for (let i = 0; i < n; i++) { const w = menu.map(k => want(k) * (k === 'drink' ? .8 : 1)), sum = w.reduce((a, b) => a + b, 0); let r = Math.random() * sum, k = menu[0]; for (let j = 0; j < menu.length; j++) { r -= w[j]; if (r <= 0) { k = menu[j]; break; } } order.push(k); }
    const free = [...Array(slotsQ()).keys()].filter(i => !cust.some(c => c.slot === i && c.st !== 'leave')); if (!free.length) return;
    const slot = free[Math.floor(Math.random() * free.length)], fromLeft = Math.random() < .5, pat = (22 + Math.random() * 8) * (own.bench ? 1.3 : 1) * (night >= 5 ? .9 : 1);
    cust.push({ x: fromLeft ? -40 : 1320, y: 512, slot, st: 'walk', order, got: [], pat, max: pat, look: person(), mood: 0, bob: Math.random() * 6, paid: 0 });
  }
  function person() { const skin = ['#f2d0b0', '#d8a878', '#a8704a', '#7a4a2a', '#f8dcc8'], hair = ['#2a1a10', '#5a3a1a', '#d8a040', '#1a1a2a', '#c84a2a', '#e8e8f0'], shirt = ['#3ec5ff', '#ff5a8a', '#5cf28a', '#ffd23f', '#c77dff', '#ff8a3a', '#f2f2f2']; const p = a => a[Math.floor(Math.random() * a.length)]; return { skin: p(skin), hair: p(hair), shirt: p(shirt), style: Math.floor(Math.random() * 4), h: .9 + Math.random() * .25 }; }
  const qx = i => 360 + i * 98;
  function stepNight(dt) {
    clock += dt;
    // the street: people stroll past, some stop
    if (Math.random() < dt * 1.6) { const l = Math.random() < .5; walkers.push({ x: l ? -40 : 1320, y: 452 + Math.random() * 26, v: (40 + Math.random() * 30) * (l ? 1 : -1), look: person(), bob: Math.random() * 6 }); }
    for (const w of walkers) w.x += w.v * dt; walkers = walkers.filter(w => w.x > -60 && w.x < 1340);
    if (clock < NIGHT_LEN - 8 && (spawnT -= dt) <= 0) {
      const busy = cust.filter(c => c.st !== 'leave').length, pull = (.45 + rep / 5 * .75) * (own.lanterns ? 1.25 : 1) * (own.stall2 ? 1.2 : 1) * crowd() * (1 - busy / (slotsQ() + 2));
      spawnT = 1.2 + Math.random() * 1.4; if (Math.random() < pull) spawnCustomer();
    }
    // customers
    for (const c of cust) {
      c.bob += dt * 8;
      if (c.st === 'walk') { const tx = qx(c.slot); c.x += Math.sign(tx - c.x) * Math.min(Math.abs(tx - c.x), 120 * dt); if (Math.abs(tx - c.x) < 2) { c.st = 'wait'; K.sfx(660, .05, 'triangle', .04); } }
      else if (c.st === 'wait') { c.pat -= dt; if (c.pat <= 0) { c.st = 'leave'; c.mood = -1; c.dir = c.x < 640 ? -1 : 1; nightLog.lost++; rep = Math.max(.5, rep - .22); K.sfx(180, .2, 'sawtooth', .06, -60); } }
      else { c.x += c.dir * 150 * dt; }
    }
    cust = cust.filter(c => c.x > -80 && c.x < 1360);
    // the stations
    const G = S.grill; G.slots.forEach((v, i) => { if (v >= 0) { G.slots[i] = v + dt; if (v < 9 && v + dt >= 9) { G.slots[i] = -1; nightLog.burnt++; say('Burnt!', '#ff8a5a', .8); K.noise(.2, .08, 800); } } });
    for (const b of S.steam.b) if (b.t >= 0 && b.t < 6) b.t += dt;
    for (const w of S.wok.w) if (w.t >= 0) { w.t += dt; if (w.t >= 9) { w.t = -1; w.toss = 0; nightLog.burnt++; say('Burnt noodles!', '#ff8a5a', .8); K.noise(.25, .08, 600); } }
    S.drinks.slots.forEach((v, i) => { if (v >= 0 && v < 1.5) S.drinks.slots[i] = v + dt * (own.machine ? 1.3 : 1); else if (v < 0 && own.machine && (stock.drink || 0) > 0 && S.drinks.slots.filter(x => x >= 0).length < 3) { S.drinks.slots[i] = 0; stock.drink--; } });
    S.dessert.slots.forEach((v, i) => { if (v >= 0 && v < 2.5) S.dessert.slots[i] = v + dt; });
    if (own.helper && (helperT -= dt) <= 0) { helperT = 1.3; helper(); }
    if (clock >= NIGHT_LEN && !cust.some(c => c.st === 'wait' || c.st === 'walk')) endNight();
  }
  function say(s, c, d = 2) { msg = { s, c, t: d }; }
  /* ---------- actions ---------- */
  function tapStation(k) {
    const st = S[k]; if (!st || mode !== 'night') return;
    if (k === 'grill') {
      const ready = st.slots.findIndex(v => v >= 4 && v < 9); if (ready >= 0) { if (toTray('skewer')) st.slots[ready] = -1; return; }
      const e = st.slots.indexOf(-1); if (e < 0) return nope('The grill is full'); if (!use('skewer')) return; st.slots[e] = 0; K.noise(.15, .05, 2000); return;
    }
    if (k === 'steam') {
      const b = st.b.find(q => q.t >= 6 && q.n > 0); if (b) { if (toTray('dumpling')) { b.n--; if (!b.n) b.t = -1; } return; }
      const e = st.b.find(q => q.t < 0); if (!e) return nope('Steaming...'); const n = Math.min(4, stock.dumpling || 0); if (!n) return nope('Out of dumplings'); stock.dumpling -= n; e.t = 0; e.n = n; K.sfx(300, .15, 'sine', .05); return;
    }
    if (k === 'wok') {
      const toss = st.w.find(w => w.t >= 0 && !w.toss && w.t > 1.6 && w.t < 3.4); if (toss) { toss.toss = toss.t > 2.1 && toss.t < 3 ? 2 : 1; K.noise(.25, .1, 1200); return; }
      const rd = st.w.find(w => w.t >= 5); if (rd) { if (toTray(rd.toss === 2 ? 'noodle*' : 'noodle')) { if (rd.toss === 2) nightLog.perfect++; rd.t = -1; rd.toss = 0; } return; }
      const e = st.w.find(w => w.t < 0); if (!e) return nope('The wok is busy'); if (!use('noodle')) return; e.t = 0; e.toss = 0; K.noise(.3, .06, 900); return;
    }
    if (k === 'drinks') {
      const r = st.slots.findIndex(v => v >= 1.5); if (r >= 0) { if (toTray('drink')) st.slots[r] = -1; return; }
      const e = st.slots.indexOf(-1); if (e < 0) return nope('Both cups are brewing'); if (!use('drink')) return; st.slots[e] = 0; K.sfx(500, .08, 'triangle', .04); return;
    }
    if (k === 'dessert' && own.stall2) {
      const r = st.slots.findIndex(v => v >= 2.5); if (r >= 0) { if (toTray('mango')) st.slots[r] = -1; return; }
      const e = st.slots.indexOf(-1); if (e < 0) return nope('All plates are busy'); if (!use('mango')) return; st.slots[e] = 0; K.sfx(600, .06, 'triangle', .04); return;
    }
  }
  function use(k) { if ((stock[k] || 0) <= 0) { nope('Out of ' + ITEMS[k].name.toLowerCase() + '!'); return false; } stock[k]--; return true; }
  function toTray(k) { if (tray.length >= cap()) { nope('The tray is full: serve someone!'); return false; } tray.push(k); K.sfx(880, .06, 'square', .04); return true; }
  function nope(s) { if (K.bot) return; say(s, '#ff8a8a', 1); K.sfx(170, .1, 'sawtooth', .05); }
  function serve(c) {
    if (c.st !== 'wait') return false; let gave = false;
    for (let i = 0; i < c.order.length; i++) { if (c.got[i]) continue; const k = c.order[i]; let j = tray.indexOf(k); if (j < 0 && k === 'noodle') j = tray.indexOf('noodle*'); if (j < 0) continue; c.got[i] = tray[j]; tray.splice(j, 1); gave = true; }
    if (!gave) { nope('Nothing on your tray for them'); return false; }
    K.sfx(760, .06, 'triangle', .05);
    if (c.order.every((k, i) => c.got[i])) {
      const pay = c.order.reduce((a, k) => a + priceOf(k), 0), fast = c.pat / c.max, perfect = c.got.filter(x => x === 'noodle*').length, tip = Math.round((fast > .6 ? pay * .2 : fast > .35 ? pay * .1 : 0) + perfect) ;
      cash += pay + tip; takings += pay + tip; nightLog.revenue += pay; nightLog.tips += tip; nightLog.served++; rep = Math.min(5, rep + (fast > .5 ? .09 : .05));
      c.st = 'leave'; c.mood = 1; c.dir = c.x < 640 ? -1 : 1; c.paid = pay + tip;
      K.pop(c.x, 380, '+$' + (pay + tip) + (tip ? ' tip!' : ''), tip ? '#ffd23f' : '#5cf28a', 30); K.coin(0); K.sfx(1046, .1, 'triangle', .08); K.sfx(1318, .14, 'triangle', .08, 0, .07);
    }
    return true;
  }
  function helper() {   // moves one finished dish to the tray, or serves one full order
    const full = cust.find(c => c.st === 'wait' && c.order.every((k, i) => c.got[i] || tray.includes(k) || (k === 'noodle' && tray.includes('noodle*'))) && c.order.some((k, i) => !c.got[i]));
    if (full) { serve(full); return; }
    if (tray.length >= cap()) return;
    const G = S.grill; if (G.slots.some(v => v >= 4 && v < 9)) return tapStation('grill');
    if (S.wok.w.some(w => w.t >= 5)) return tapStation('wok');
    if (S.steam.b.some(b => b.t >= 6 && b.n > 0) && cust.some(c => c.st === 'wait' && c.order.includes('dumpling'))) return tapStation('steam');
    if (S.drinks.slots.some(v => v >= 1.5) && cust.some(c => c.st === 'wait' && c.order.includes('drink'))) return tapStation('drinks');
    if (S.dessert.slots.some(v => v >= 2.5)) return tapStation('dessert');
  }
  function endNight() {
    if (mode !== 'night') return; const L = nightLog, rent = RENT[night - 1] || RENT[RENT.length - 1] + 50 * (night - RENT.length);
    cash -= rent; L.rent = rent; mode = 'sum'; L.cash = cash;
    K.sfx(523, .3, 'triangle', .08);
  }
  function afterSummary() {
    if (cash < 0) return gameOver(false);
    if (night >= NIGHTS) return gameOver(true);
    night++; mode = 'prep'; prepDefaults();
  }
  function gameOver(won) {
    if (over) return; over = true; mode = 'done'; K.score = Math.max(0, Math.round(takings)); K.runCoins += Math.floor(takings / 60);
    try { const s = K.save; s.nm = s.nm || { best: 0, legend: 0 }; if (won) s.nm.legend++; K.persist(); } catch (e) {}
    K.over({ title: won ? 'Night market legend!' : 'Out of business', text: won ? `Seven nights done with $${Math.round(cash)} in the tin.` : `You couldn't make the rent on night ${night}.`, delay: 300 });
  }
  /* ---------- prep: stock, prices, upgrades ---------- */
  function prepDefaults() { for (const k of IK) { if (price[k] === undefined) price[k] = 1; if (stock[k] === undefined) stock[k] = 0; } }
  const PB = { stock: i => ({ x: 70, y: 200 + i * 70, w: 380, h: 60 }), pr: (i, j) => ({ x: 470 + j * 92, y: 208 + i * 70, w: 86, h: 44 }), up: i => ({ x: 790 + (i % 2) * 225, y: 172 + Math.floor(i / 2) * 92, w: 215, h: 84 }), go: { x: 470, y: 600, w: 300, h: 74 }, auto: { x: 70, y: 560, w: 360, h: 44 } };
  const inR = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  const menuNow = () => IK.filter(unlocked);
  function buy(k, n) { const c = ITEMS[k].cost * n; if (cash < c) { nope('Not enough cash'); return; } cash -= c; stock[k] = (stock[k] || 0) + n; K.sfx(700, .05, 'square', .04); }
  function autoStock() {   // a sensible shop for tonight: about what a busy night sells
    const need = { skewer: 34, drink: 30, dumpling: 26, noodle: 18, mango: 16 }, want2 = {}; let total = 0, spent = 0;
    for (const k of menuNow()) { want2[k] = Math.max(0, Math.round(need[k] * (own.lanterns ? 1.2 : 1) * (own.stall2 ? 1.15 : 1)) - (stock[k] || 0)); total += want2[k] * ITEMS[k].cost; }
    const k2 = total ? cl((cash - RENT[night - 1] * .3) / total, 0, 1) : 0;   // short of cash: buy a bit of everything
    for (const k of menuNow()) { const n = Math.floor(want2[k] * k2); if (n > 0) { stock[k] += n; spent += n * ITEMS[k].cost; } }
    cash -= spent; K.sfx(700, .08, 'square', .05);
  }
  function prepClick(x, y) {
    menuNow().forEach((k, i) => { const b = PB.stock(i); if (inR(b, x, y) && x > b.x + b.w - 130) buy(k, x > b.x + b.w - 66 ? 10 : 5); for (let j = 0; j < 3; j++) if (inR(PB.pr(i, j), x, y)) { price[k] = j; K.sfx(600, .05, 'triangle', .04); } });
    if (inR(PB.auto, x, y)) autoStock();
    availUpg().forEach((u, i) => { if (inR(PB.up(i), x, y)) { if (own[u.k]) return; if (cash < u.cost) return nope('Not enough cash'); cash -= u.cost; own[u.k] = true; K.chime(660, [0, 4, 7]); say(u.name + '!', '#5cf28a'); } });
    if (inR(PB.go, x, y)) { if (!menuNow().some(k => stock[k] > 0)) return nope('Buy some stock first!'); startNight(); }
  }
  const availUpg = () => UPG.filter(u => !u.night || u.night <= night);
  /* ---------- input ---------- */
  const ST_KEYS = ['grill', 'steam', 'wok', 'drinks', 'dessert'];
  GAME.key = (c, d) => { if (!d) return; const m = /^Digit([1-5])$/.exec(c); if (m && mode === 'night') tapStation(ST_KEYS[+m[1] - 1]); if ((c === 'Enter' || c === 'Space') && mode === 'sum') afterSummary(); };
  GAME.down = (x, y) => {
    if (mode === 'prep') return prepClick(x, y);
    if (mode === 'sum') { if (inR(PB.go, x, y + 0) || true) afterSummary(); return; }
    if (mode !== 'night') return;
    for (const c of cust) if (c.st === 'wait' && Math.abs(x - c.x) < 44 && y > 330 && y < 600) { serve(c); return; }
    for (const k of ST_KEYS) { const st = S[k]; if (k === 'dessert' && !own.stall2) continue; if (Math.abs(x - st.x) < 72 && y > 600) { tapStation(k); return; } }
    if (y > 640 && y < 720) return;
  };
  /* ---------- the computer (attract demo) ---------- */
  function botPlay() {
    const needs = {}; for (const c of cust) if (c.st === 'wait') c.order.forEach((k, i) => { if (!c.got[i]) needs[k] = (needs[k] || 0) + 1; });
    const have = k => tray.filter(x => x === k || (k === 'noodle' && x === 'noodle*')).length;
    const full = cust.find(c => c.st === 'wait' && c.order.some((k, i) => !c.got[i] && (tray.includes(k) || (k === 'noodle' && tray.includes('noodle*')))) ); if (full && Math.random() < .7) return serve(full);
    const w = S.wok.w.find(q => q.t > 2.2 && q.t < 2.9 && !q.toss); if (w) return tapStation('wok');
    if (tray.length < cap()) { if (S.grill.slots.some(v => v >= 4)) return tapStation('grill'); if (S.wok.w.some(q => q.t >= 5)) return tapStation('wok'); if (S.drinks.slots.some(v => v >= 1.5) && (needs.drink || 0) > have('drink')) return tapStation('drinks'); if (S.steam.b.some(b => b.t >= 6 && b.n) && (needs.dumpling || 0) > have('dumpling')) return tapStation('steam'); }
    const cooking = { skewer: S.grill.slots.filter(v => v >= 0).length, drink: S.drinks.slots.filter(v => v >= 0).length, noodle: S.wok.w.filter(q => q.t >= 0).length, dumpling: S.steam.b.reduce((a, b) => a + (b.t >= 0 ? b.n : 0), 0) };
    for (const k of ['skewer', 'noodle', 'drink', 'dumpling']) if ((needs[k] || 0) > have(k) + (cooking[k] || 0)) return tapStation(ITEMS[k].st);
  }
  /* ---------- kit hooks ---------- */
  GAME.reset = () => {
    night = 1; cash = START_CASH; takings = 0; rep = 3; own = {}; stock = {}; price = {}; over = false; nightLog = null; msg = null; prepDefaults();
    if (K.bot) { own = { helper: false }; stock = { skewer: 40, drink: 40, dumpling: 30, noodle: 24, mango: 0 }; night = 3; startNight(); clock = NIGHT_LEN * .3; return; }
    mode = 'prep'; newStations();
  };
  GAME.update = dt => {
    t += dt; if (msg && (msg.t -= dt) <= 0) msg = null;
    if (mode === 'night') { stepNight(dt); if (K.bot && (botT -= dt) <= 0) { botT = .32; botPlay(); } }
    if (K.bot && mode === 'sum') { if ((botT -= dt) <= 0) { K.over(); mode = 'done'; } }
  };
  GAME.bot = () => {};
  /* ---------- drawing ---------- */
  function scene(g) {
    const v = K.view, sky = g.createLinearGradient(0, v.y0, 0, 420); sky.addColorStop(0, '#0e0620'); sky.addColorStop(.6, '#2a1046'); sky.addColorStop(1, '#5a1e5a'); g.fillStyle = sky; g.fillRect(v.x0, v.y0, v.x1 - v.x0, 440 - v.y0);
    for (const s of stars) { g.globalAlpha = .4 + Math.sin(t * 2 + s.p) * .3; g.fillStyle = '#fff'; g.fillRect(s.x, s.y, s.s, s.s); } g.globalAlpha = 1;
    g.fillStyle = '#ffe9b8'; g.beginPath(); g.arc(1120, 90, 34, 0, TAU); g.fill(); g.fillStyle = '#2a1046'; g.beginPath(); g.arc(1134, 82, 30, 0, TAU); g.fill();
    // skyline
    g.fillStyle = '#1a0c30'; for (let i = 0; i < 18; i++) { const x = i * 78 - 30, h = 120 + (i * 37) % 110; g.fillRect(x, 420 - h, 70, h); g.fillStyle = 'rgba(255,210,120,.5)'; for (let w = 0; w < 6; w++) if ((i * 7 + w * 3) % 4) g.fillRect(x + 8 + (w % 3) * 20, 420 - h + 14 + Math.floor(w / 3) * 26, 9, 12); g.fillStyle = '#1a0c30'; }
    // other stalls far back
    for (let i = 0; i < 7; i++) { const x = i * 200 - 40, c = ['#ff5a5a', '#3ec5ff', '#5cf28a', '#ffd23f', '#c77dff', '#ff8a3a', '#ff7ad9'][i]; g.fillStyle = '#2a1640'; g.fillRect(x, 330, 150, 90); g.fillStyle = c; g.globalAlpha = .55; for (let s = 0; s < 6; s++) if (s % 2 === 0) g.fillRect(x + s * 25, 316, 25, 22); g.globalAlpha = 1; g.fillStyle = 'rgba(255,200,120,.35)'; g.fillRect(x + 10, 350, 130, 30); }
    // the street
    const st = g.createLinearGradient(0, 420, 0, v.y1); st.addColorStop(0, '#3a2440'); st.addColorStop(1, '#1e1226'); g.fillStyle = st; g.fillRect(v.x0, 420, v.x1 - v.x0, v.y1 - 420);
    g.fillStyle = 'rgba(255,200,120,.06)'; for (let x = -40; x < 1320; x += 80) g.fillRect(x, 560, 60, 3);
    // lantern string
    g.strokeStyle = '#2a1a1a'; g.lineWidth = 2; g.beginPath(); for (const l of lanterns) g.lineTo(l.x, l.y - 12); g.stroke();
    for (const l of lanterns) { const gl = g.createRadialGradient(l.x, l.y, 2, l.x, l.y, 46); gl.addColorStop(0, l.c + 'aa'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(l.x - 46, l.y - 46, 92, 92); g.fillStyle = l.c; g.beginPath(); g.ellipse(l.x, l.y, 11, 14, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(l.x - 11, l.y - 2, 22, 2); g.fillRect(l.x - 11, l.y + 5, 22, 2); g.fillStyle = '#3a2a1a'; g.fillRect(l.x - 5, l.y - 16, 10, 3); g.fillRect(l.x - 5, l.y + 13, 10, 3); }
  }
  function drawPerson(g, x, y, P2, bob, mood, s = 1) {
    const by = y + Math.sin(bob) * 2; g.save(); g.translate(x, by); g.scale(s * P2.h, s * P2.h);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 46, 20, 6, 0, 0, TAU); g.fill();
    g.fillStyle = '#2a2440'; g.fillRect(-12, 20, 9, 26); g.fillRect(3, 20, 9, 26);
    g.fillStyle = P2.shirt; g.beginPath(); g.roundRect(-17, -14, 34, 40, 10); g.fill();
    g.fillStyle = P2.skin; g.beginPath(); g.arc(0, -30, 16, 0, TAU); g.fill();
    g.fillStyle = P2.hair; if (P2.style === 0) { g.beginPath(); g.arc(0, -34, 16, Math.PI, 0); g.fill(); } else if (P2.style === 1) { g.beginPath(); g.arc(0, -34, 17, Math.PI * .9, Math.PI * 2.1); g.fill(); g.fillRect(-17, -36, 6, 22); g.fillRect(11, -36, 6, 22); } else if (P2.style === 2) { g.beginPath(); g.arc(0, -38, 12, 0, TAU); g.fill(); g.beginPath(); g.arc(0, -52, 7, 0, TAU); g.fill(); } else { g.fillStyle = P2.shirt; g.beginPath(); g.arc(0, -36, 16, Math.PI, 0); g.fill(); g.fillRect(-18, -38, 36, 4); }
    g.fillStyle = '#1a1020'; g.beginPath(); g.arc(-5, -30, 2, 0, TAU); g.arc(5, -30, 2, 0, TAU); g.fill();
    g.strokeStyle = '#1a1020'; g.lineWidth = 2; g.beginPath(); if (mood > 0) g.arc(0, -25, 5, .2, Math.PI - .2); else if (mood < 0) g.arc(0, -19, 5, Math.PI + .3, -.3); else { g.moveTo(-4, -23); g.lineTo(4, -23); } g.stroke();
    g.restore();
  }
  function icon(g, k, x, y, s = 1) {
    g.save(); g.translate(x, y); g.scale(s, s);
    if (k === 'skewer') { g.strokeStyle = '#d8b878'; g.lineWidth = 2; g.beginPath(); g.moveTo(-14, 10); g.lineTo(14, -10); g.stroke(); for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? '#5a8a2a' : '#a8402a'; g.beginPath(); g.arc(-7 + i * 7, 5 - i * 5, 5.5, 0, TAU); g.fill(); } }
    else if (k === 'drink') { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.moveTo(-10, -12); g.lineTo(10, -12); g.lineTo(7, 14); g.lineTo(-7, 14); g.fill(); g.fillStyle = '#d8a878'; g.beginPath(); g.moveTo(-9, -6); g.lineTo(9, -6); g.lineTo(7, 13); g.lineTo(-7, 13); g.fill(); g.fillStyle = '#3a2010'; for (const [a, b] of [[-4, 9], [1, 10], [4, 7], [-2, 5]]) { g.beginPath(); g.arc(a, b, 2, 0, TAU); g.fill(); } g.fillStyle = '#ff5a8a'; g.fillRect(2, -20, 3, 10); }
    else if (k === 'dumpling') { g.fillStyle = '#f4ecdc'; g.beginPath(); g.arc(0, 2, 12, Math.PI, 0); g.lineTo(12, 6); g.lineTo(-12, 6); g.fill(); g.strokeStyle = '#d8c8a8'; g.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 4, -8); g.lineTo(i * 3, 0); g.stroke(); } }
    else if (k === 'noodle' || k === 'noodle*') { g.fillStyle = '#e84a3a'; g.beginPath(); g.arc(0, 0, 13, 0, Math.PI); g.fill(); g.fillStyle = '#ffe08a'; g.beginPath(); g.ellipse(0, 0, 13, 4, 0, 0, TAU); g.fill(); g.strokeStyle = '#d8b040'; g.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 4, -1); g.quadraticCurveTo(i * 4 + 3, -10, i * 4 - 1, -16); g.stroke(); } if (k === 'noodle*') { g.fillStyle = '#ffd23f'; g.font = '12px "Titan One"'; g.textAlign = 'center'; g.fillText('★', 12, -12); } }
    else if (k === 'mango') { g.fillStyle = '#f4f0e8'; g.beginPath(); g.ellipse(0, 6, 14, 6, 0, 0, TAU); g.fill(); g.fillStyle = '#ffb347'; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(-8 + i * 5, -1 - (i % 2) * 2, 4, 6, -.4, 0, TAU); g.fill(); } }
    g.restore();
  }
  function stall(g) {
    // the awning and posts
    g.fillStyle = '#5a3420'; g.fillRect(300, 230, 14, 360); g.fillRect(946, 230, 14, 360); if (own.stall2) { g.fillRect(990, 260, 12, 330); g.fillRect(1136, 260, 12, 330); }
    for (let s = 0; s < 14; s++) { g.fillStyle = s % 2 ? '#fff4e0' : '#e8403a'; g.beginPath(); g.moveTo(290 + s * 49, 214); g.lineTo(290 + (s + 1) * 49, 214); g.lineTo(290 + (s + 1) * 49, 262); g.quadraticCurveTo(290 + s * 49 + 24.5, 280, 290 + s * 49, 262); g.fill(); }
    g.fillStyle = '#3a2010'; g.beginPath(); g.roundRect(470, 160, 320, 56, 14); g.fill(); g.strokeStyle = '#ffb347'; g.lineWidth = 3; g.stroke(); g.font = '32px "Titan One"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = own.neon ? `rgba(255,90,138,${.8 + .2 * Math.sin(t * 9)})` : '#ffd23f'; if (own.neon) { g.shadowColor = '#ff5a8a'; g.shadowBlur = 20; } g.fillText('NIGHT MARKET', 630, 190); g.shadowBlur = 0;
    if (own.stall2) { for (let s = 0; s < 4; s++) { g.fillStyle = s % 2 ? '#fff4e0' : '#ffb347'; g.fillRect(984 + s * 42, 244, 42, 34); } g.font = '16px "Titan One"'; g.fillStyle = '#ffd23f'; g.fillText('SWEETS', 1068, 230); }
    // the counter
    g.fillStyle = '#7a4a2a'; g.fillRect(300, 600, 660, 120); g.fillStyle = '#9a6238'; g.fillRect(300, 600, 660, 12); g.fillStyle = '#5a3420'; for (let x = 300; x < 960; x += 60) g.fillRect(x, 612, 3, 108);
    if (own.stall2) { g.fillStyle = '#6a3a5a'; g.fillRect(990, 600, 160, 120); g.fillStyle = '#8a4a7a'; g.fillRect(990, 600, 160, 12); }
  }
  function stations(g) {
    const font = (s, c) => { g.font = s + 'px "Titan One"'; g.fillStyle = c; g.textAlign = 'center'; g.textBaseline = 'middle'; };
    const label = (k, x, name) => { const n = stock[ITEMS[stName[k]].st === k ? stName[k] : stName[k]] ?? 0; font(13, '#ffe8c8'); g.fillText((S[k].key) + ' · ' + name, x, 708); font(11, n > 3 ? '#cfc0e0' : '#ff8a8a'); g.fillText(n + ' left', x, 692); };
    // grill
    { const st = S.grill, x = st.x; g.fillStyle = '#2a2a30'; g.fillRect(x - 70, 618, 140, 42); g.fillStyle = '#1a1a1e'; for (let i = 0; i < 7; i++) g.fillRect(x - 66 + i * 20, 622, 3, 34); g.fillStyle = `rgba(255,${80 + Math.sin(t * 7) * 30},20,.45)`; g.fillRect(x - 66, 650, 132, 8);
      st.slots.forEach((v, i) => { const sx = x - 56 + i * (112 / Math.max(1, st.slots.length - 1)), sy = 630; if (v < 0) return; g.save(); g.translate(sx, sy); g.rotate(-.6); const done = v >= 4, burnt = v >= 7; g.strokeStyle = '#d8b878'; g.lineWidth = 2; g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.stroke(); for (let k = 0; k < 3; k++) { g.fillStyle = burnt ? '#2a1a10' : done ? (k % 2 ? '#5a8a2a' : '#a8402a') : (k % 2 ? '#8ab84a' : '#e88a7a'); g.beginPath(); g.arc(-7 + k * 7, 0, 5.5, 0, TAU); g.fill(); } g.restore(); if (done) { g.strokeStyle = burnt ? '#ff4d4d' : '#5cf28a'; g.lineWidth = 3; g.beginPath(); g.arc(sx, sy, 15, 0, TAU); g.stroke(); } else { g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.arc(sx, sy - 22, 6, -Math.PI / 2, -Math.PI / 2 + TAU * v / 4); g.stroke(); } if (Math.random() < .3) K.burst(sx, sy - 8, ['#ffb347', '#ff6a2a'], 1, 40, { gravity: -100, life: .4, size: 3 }); });
      label('grill', x, 'GRILL'); }
    // steamer
    { const st = S.steam, x = st.x; st.b.forEach((b, i) => { const bx = x + (st.b.length > 1 ? (i - .5) * 74 : 0), w = st.b.length > 1 ? 66 : 110; g.fillStyle = '#c8a46a'; g.beginPath(); g.ellipse(bx, 650, w / 2, 14, 0, 0, TAU); g.fill(); g.fillRect(bx - w / 2, 622, w, 28); g.fillStyle = '#d8b878'; g.beginPath(); g.ellipse(bx, 622, w / 2, 12, 0, 0, TAU); g.fill(); g.strokeStyle = '#8a6a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx - w / 2, 636); g.lineTo(bx + w / 2, 636); g.stroke();
        if (b.t >= 0 && b.t < 6) { g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.beginPath(); g.arc(bx, 600, 9, -Math.PI / 2, -Math.PI / 2 + TAU * b.t / 6); g.stroke(); if (Math.random() < .5) K.burst(bx + (Math.random() - .5) * w * .6, 612, ['rgba(255,255,255,.6)'], 1, 30, { gravity: -80, life: .8, size: 9 }); }
        if (b.t >= 6 && b.n) { for (let k = 0; k < b.n; k++) icon(g, 'dumpling', bx - 18 + (k % 2) * 36 * (w > 70 ? 1 : .6), 612 - Math.floor(k / 2) * 14, .8); font(14, '#5cf28a'); g.fillText('x' + b.n, bx, 596); } });
      label('steam', x, 'STEAMER'); }
    // wok
    { const st = S.wok, x = st.x; st.w.forEach((w, i) => { const wx = x + (st.w.length > 1 ? (i - .5) * 76 : 0); g.fillStyle = '#3a3a44'; g.fillRect(wx - 30, 650, 60, 12); const fl = w.t >= 0; if (fl) { g.fillStyle = `rgba(255,${120 + Math.random() * 80},40,.85)`; g.beginPath(); g.moveTo(wx - 22, 652); g.lineTo(wx, 630 - Math.random() * 10); g.lineTo(wx + 22, 652); g.fill(); }
        const jump = w.toss && w.t < (w.tt || 0) + .5 ? Math.sin((w.t - (w.tt || 0)) * 6) * 14 : 0; g.fillStyle = '#2a2a30'; g.beginPath(); g.arc(wx, 630 - jump, 32, .1, Math.PI - .1); g.fill(); g.fillStyle = '#1a1a1e'; g.fillRect(wx + 28, 628 - jump, 26, 6);
        if (w.t >= 0) { const glow = w.t > 2.1 && w.t < 3 && !w.toss; if (glow) { g.strokeStyle = `rgba(255,210,63,${.6 + .4 * Math.sin(t * 20)})`; g.lineWidth = 5; g.beginPath(); g.arc(wx, 630, 38, 0, TAU); g.stroke(); font(14, '#ffd23f'); g.fillText('TOSS!', wx, 584); }
          const ready = w.t >= 5; icon(g, ready ? (w.toss === 2 ? 'noodle*' : 'noodle') : 'noodle', wx, 626 - jump, .9);
          if (!ready) { g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.beginPath(); g.arc(wx, 600, 9, -Math.PI / 2, -Math.PI / 2 + TAU * w.t / 5); g.stroke(); } else { g.strokeStyle = w.t > 7 ? '#ff4d4d' : '#5cf28a'; g.lineWidth = 3; g.beginPath(); g.arc(wx, 626, 22, 0, TAU); g.stroke(); } } });
      label('wok', x, 'WOK'); }
    // drinks
    { const st = S.drinks, x = st.x; g.fillStyle = '#5a8ab8'; g.beginPath(); g.roundRect(x - 60, 612, 120, 48, 8); g.fill(); g.fillStyle = '#8ac8f0'; g.fillRect(x - 54, 618, 108, 6);
      st.slots.forEach((v, i) => { const cx = x - 34 + i * (68 / Math.max(1, st.slots.length - 1)); if (v < 0) { g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2; g.strokeRect(cx - 9, 626, 18, 26); return; } icon(g, 'drink', cx, 636, .85); if (v < 1.5) { g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.arc(cx, 604, 7, -Math.PI / 2, -Math.PI / 2 + TAU * v / 1.5); g.stroke(); } else { g.strokeStyle = '#5cf28a'; g.lineWidth = 3; g.beginPath(); g.arc(cx, 636, 18, 0, TAU); g.stroke(); } });
      label('drinks', x, own.machine ? 'TEA MACHINE' : 'TEA CART'); }
    if (own.stall2) { const st = S.dessert, x = st.x; st.slots.forEach((v, i) => { const cx = x - 44 + i * 44; g.fillStyle = '#f4f0e8'; g.beginPath(); g.ellipse(cx, 650, 18, 6, 0, 0, TAU); g.fill(); if (v >= 0) { icon(g, 'mango', cx, 640, .8); if (v < 2.5) { g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.arc(cx, 612, 7, -Math.PI / 2, -Math.PI / 2 + TAU * v / 2.5); g.stroke(); } else { g.strokeStyle = '#5cf28a'; g.lineWidth = 3; g.beginPath(); g.arc(cx, 642, 18, 0, TAU); g.stroke(); } } }); label('dessert', x, 'SWEETS'); }
  }
  const stName = { grill: 'skewer', steam: 'dumpling', wok: 'noodle', drinks: 'drink', dessert: 'mango' };
  function drawNight(g) {
    const v = K.view;
    scene(g);
    for (const w of walkers) { g.globalAlpha = .8; drawPerson(g, w.x, w.y, w.look, w.bob += .1, 0, .6); g.globalAlpha = 1; }   // the crowd strolling behind the queue
    stall(g);
    // customers in the queue, with their orders
    for (const c of [...cust].sort((a, b) => a.y - b.y)) {
      drawPerson(g, c.x, c.y, c.look, c.bob, c.mood);
      if (c.st === 'wait') {
        const k = c.pat / c.max, n = c.order.length, w = 26 + n * 34;
        g.fillStyle = '#fff8ec'; g.beginPath(); g.roundRect(c.x - w / 2, 372, w, 48, 14); g.fill(); g.beginPath(); g.moveTo(c.x - 8, 419); g.lineTo(c.x, 432); g.lineTo(c.x + 8, 419); g.fill();
        c.order.forEach((it, i) => { const ix = c.x - (n - 1) * 17 + i * 34; g.globalAlpha = c.got[i] ? .25 : 1; icon(g, it, ix, 396, .95); g.globalAlpha = 1; if (c.got[i]) { g.strokeStyle = '#5cf28a'; g.lineWidth = 3; g.beginPath(); g.moveTo(ix - 7, 396); g.lineTo(ix - 2, 402); g.lineTo(ix + 8, 388); g.stroke(); } });
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(c.x - 26, 362, 52, 6); g.fillStyle = k > .5 ? '#5cf28a' : k > .25 ? '#ffd23f' : '#ff4d4d'; g.fillRect(c.x - 26, 362, 52 * k, 6);
      } else if (c.mood > 0) { g.font = '20px "Titan One"'; g.textAlign = 'center'; g.fillStyle = '#ff5a8a'; g.fillText('♥', c.x + 18, 420 - (c.paid ? 10 : 0)); }
      else if (c.mood < 0) { g.font = '22px "Titan One"'; g.textAlign = 'center'; g.fillStyle = '#ff6a6a'; g.fillText('!!', c.x + 18, 420); }
    }
    stations(g);
    // the tray
    g.fillStyle = 'rgba(20,10,30,.8)'; g.beginPath(); g.roundRect(20, 600, 260, 110, 16); g.fill(); g.font = '15px "Titan One"'; g.textAlign = 'left'; g.fillStyle = '#ffd890'; g.fillText('TRAY ' + tray.length + '/' + cap(), 36, 620);
    for (let i = 0; i < cap(); i++) { const x = 52 + (i % 4) * 58, y = 652 + Math.floor(i / 4) * 40; g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(x, y, 18, 0, TAU); g.fill(); if (tray[i]) icon(g, tray[i], x, y, .9); }
    // top bar
    const h = hourOf(clock), hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60 / 10) * 10, ap = hh >= 12 && hh < 24 ? 'PM' : 'AM', h12 = hh % 12 || 12;
    g.fillStyle = 'rgba(20,10,30,.8)'; g.beginPath(); g.roundRect(70, 12, 1140, 46, 18); g.fill();
    g.font = '20px "Titan One"'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#ffd23f'; g.fillText('NIGHT ' + night + ' / ' + NIGHTS, 92, 36);
    g.fillStyle = '#fff'; g.fillText(h12 + ':' + String(mm).padStart(2, '0') + ' ' + ap, 250, 36);
    g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(380, 30, 220, 10); g.fillStyle = '#ff8a3a'; g.fillRect(380, 30, 220 * cl(clock / NIGHT_LEN, 0, 1), 10);
    g.fillStyle = '#5cf28a'; g.fillText('$' + Math.floor(cash), 640, 36); g.fillStyle = '#cfc0e0'; g.font = '14px "Titan One"'; g.fillText('RENT TONIGHT $' + RENT[night - 1], 760, 36);
    g.font = '20px "Titan One"'; for (let i = 0; i < 5; i++) { g.fillStyle = rep >= i + .75 ? '#ffd23f' : rep >= i + .25 ? '#c8a040' : 'rgba(255,255,255,.2)'; g.fillText('★', 960 + i * 24, 36); }
    if (h > 21 && h < 23) { g.fillStyle = '#ff5a8a'; g.font = '14px "Titan One"'; g.fillText('RUSH HOUR', 1100, 36); }
    if (msg) { g.globalAlpha = Math.min(1, msg.t * 2); g.font = '28px "Titan One"'; g.textAlign = 'center'; g.lineWidth = 7; g.strokeStyle = 'rgba(0,0,0,.55)'; g.strokeText(msg.s, 640, 300); g.fillStyle = msg.c; g.fillText(msg.s, 640, 300); g.globalAlpha = 1; }
    if (clock >= NIGHT_LEN) { g.font = '22px "Titan One"'; g.textAlign = 'center'; g.fillStyle = '#ffd890'; g.fillText('Closing time: serve the last customers', 640, 300); }
  }
  function panel(g, x, y, w, h) { g.fillStyle = 'rgba(30,14,46,.92)'; g.beginPath(); g.roundRect(x, y, w, h, 18); g.fill(); g.strokeStyle = 'rgba(255,179,71,.4)'; g.lineWidth = 2; g.stroke(); }
  function drawPrep(g) {
    scene(g); stall(g);
    g.fillStyle = 'rgba(10,4,20,.55)'; g.fillRect(K.view.x0, K.view.y0, K.view.x1 - K.view.x0, K.view.y1 - K.view.y0);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '40px "Titan One"'; g.fillStyle = '#ffd23f'; g.fillText('BEFORE NIGHT ' + night, 640, 60);
    g.font = '18px "Titan One"'; g.fillStyle = '#fff'; g.fillText('Cash $' + Math.floor(cash) + '   ·   Rent tonight $' + RENT[night - 1] + '   ·   Reputation ' + rep.toFixed(1) + ' ★', 640, 100);
    panel(g, 50, 130, 700, 450); g.textAlign = 'left'; g.font = '20px "Titan One"'; g.fillStyle = '#ffb347'; g.fillText('STOCK', 70, 165); g.fillText('PRICES', 470, 165);
    menuNow().forEach((k, i) => {
      const b = PB.stock(i), I = ITEMS[k]; g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 12); g.fill();
      icon(g, k, b.x + 30, b.y + 30, 1.1); g.font = '18px "Titan One"'; g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(I.name, b.x + 58, b.y + 22); g.font = '14px "Titan One"'; g.fillStyle = (stock[k] || 0) < 10 ? '#ff8a8a' : '#cfc0e0'; g.fillText((stock[k] || 0) + ' left · $' + I.cost.toFixed(2), b.x + 58, b.y + 44);
      for (const [n, xx] of [[5, b.x + b.w - 128], [10, b.x + b.w - 64]]) { g.fillStyle = cash >= I.cost * n ? '#5cbf6a' : '#5a4a5a'; g.beginPath(); g.roundRect(xx, b.y + 12, 58, 36, 10); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '15px "Titan One"'; g.fillText('+' + n, xx + 29, b.y + 30); }
      PRICE.forEach(([nm, mul], j) => { const r = PB.pr(i, j), on = (price[k] ?? 1) === j; g.fillStyle = on ? '#ffb347' : 'rgba(255,255,255,.08)'; g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, 10); g.fill(); g.fillStyle = on ? '#2a1408' : '#fff'; g.textAlign = 'center'; g.font = '13px "Titan One"'; g.fillText(nm, r.x + r.w / 2, r.y + 15); g.font = '15px "Titan One"'; g.fillText('$' + (Math.round(I.base * mul * 2) / 2), r.x + r.w / 2, r.y + 32); });
    });
    { const b = PB.auto; g.fillStyle = '#3a6aa8'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 12); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '16px "Titan One"'; g.fillText('AUTO-STOCK FOR A BUSY NIGHT', b.x + b.w / 2, b.y + b.h / 2 + 1); }
    g.textAlign = 'left'; g.font = '12px "Titan One"'; g.fillStyle = '#cfc0e0'; g.fillText('Cheap: more customers stop. Premium: pays more, fewer stop.', 70, 536);
    panel(g, 780, 130, 460, 540); g.font = '20px "Titan One"'; g.fillStyle = '#ffb347'; g.textAlign = 'left'; g.fillText('UPGRADES', 800, 152);
    availUpg().forEach((u, i) => { const b = PB.up(i), has = own[u.k], can = cash >= u.cost; g.fillStyle = has ? 'rgba(92,242,138,.18)' : 'rgba(255,255,255,.07)'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 12); g.fill(); g.textAlign = 'left'; g.font = '15px "Titan One"'; g.fillStyle = '#fff'; g.fillText(u.name, b.x + 10, b.y + 18); g.font = '14px "Titan One"'; g.fillStyle = has ? '#5cf28a' : can ? '#ffd23f' : '#8a7a9a'; g.textAlign = 'right'; g.fillText(has ? 'OWNED' : '$' + u.cost, b.x + b.w - 10, b.y + 18); g.textAlign = 'left'; g.font = '800 12px Nunito'; g.fillStyle = '#cfc0e0'; wrap(g, u.desc, b.x + 10, b.y + 42, b.w - 20, 14); });
    const b = PB.go, ok = menuNow().some(k => stock[k] > 0), gr = g.createLinearGradient(0, b.y, 0, b.y + b.h); gr.addColorStop(0, ok ? '#ffb347' : '#6a5a6a'); gr.addColorStop(1, ok ? '#e8603a' : '#4a3a4a'); g.fillStyle = gr; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 20); g.fill(); g.textAlign = 'center'; g.font = '28px "Titan One"'; g.fillStyle = '#fff'; g.fillText('OPEN THE STALL', b.x + b.w / 2, b.y + b.h / 2 + 2);
    if (msg) { g.font = '20px "Titan One"'; g.fillStyle = msg.c; g.fillText(msg.s, 640, 700); }
  }
  function drawSum(g) {
    drawNight(g); const L = nightLog; g.fillStyle = 'rgba(10,4,20,.6)'; g.fillRect(K.view.x0, K.view.y0, K.view.x1 - K.view.x0, K.view.y1 - K.view.y0);
    panel(g, 390, 120, 500, 470); g.textAlign = 'center'; g.font = '36px "Titan One"'; g.fillStyle = '#ffd23f'; g.fillText('NIGHT ' + night + ' DONE', 640, 168);
    const rows = [['Customers served', L.served], ['Customers who left', L.lost], ['Sales', '$' + Math.round(L.revenue)], ['Tips', '$' + Math.round(L.tips)], ['Perfect noodles', L.perfect], ['Burnt food', L.burnt], ['Rent', '-$' + L.rent], ['Cash now', '$' + Math.round(L.cash)]];
    rows.forEach(([a, b], i) => { g.textAlign = 'left'; g.font = '19px "Titan One"'; g.fillStyle = '#cfc0e0'; g.fillText(a, 430, 220 + i * 40); g.textAlign = 'right'; g.fillStyle = i === 7 ? (L.cash < 0 ? '#ff6a6a' : '#5cf28a') : '#fff'; g.fillText(String(b), 850, 220 + i * 40); });
    g.textAlign = 'center'; g.font = '18px "Titan One"'; g.fillStyle = '#ffb347'; g.fillText(L.cash < 0 ? 'You couldn\'t make the rent...' : night >= NIGHTS ? 'That was the last night! Tap to finish' : 'Tap to plan the next night', 640, 556);
  }
  function wrap(g, s, x, y, w, lh) { const out = []; let line = ''; for (const word of s.split(' ')) { const tr = line ? line + ' ' + word : word; if (g.measureText(tr).width > w && line) { out.push(line); line = word; } else line = tr; } out.push(line); out.forEach((l, i) => g.fillText(l, x, y + i * lh)); }
  GAME.draw = g => { if (mode === 'prep') return drawPrep(g); if (mode === 'sum') return drawSum(g); if (!S.grill) newStations(); drawNight(g); };
  GAME.pose = () => { for (let i = 0; i < 60 * 25; i++) GAME.update(1 / 60); };
  GAME.test = { st: () => ({ mode, night, cash: Math.round(cash), takings: Math.round(takings), rep: +rep.toFixed(2), clock: Math.round(clock), tray: [...tray], cust: cust.filter(c => c.st === 'wait').length, stock: { ...stock }, log: nightLog }), tap: k => tapStation(k), serveAll: () => cust.filter(c => c.st === 'wait').forEach(serve), cust: () => cust, own: () => own, setStock: s => Object.assign(stock, s), bot: () => botPlay(), next: () => afterSummary(), startNight: () => startNight(), click: (x, y) => GAME.down(x, y), skip: n => { clock += n; } };
})();
