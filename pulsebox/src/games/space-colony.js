/* Space Colony: build a base on Mars. Balance power, oxygen, food and water so colonists keep arriving by rocket.
   Research upgrades in the lab, level up buildings, follow missions, and ride out dust storms, meteor showers,
   solar flares and breakdowns. Run out of oxygen or food and the colony is evacuated (game over).
   The colony is saved in K.save.col (grid of building keys, rocks, stocks; new: lv, sci, res, mis, st, tut). */
const GAME = {
  id: 'space-colony', title: 'Space Colony', tagline: 'Build a Mars base. Keep everyone breathing.',
  font: 'Orbitron', accent: '#ff8a4a', accent2: '#7cf2ff', bg: '#1a0a06', noHud: true, scoreLabel: 'Colonists',
  how: ['Pick a building on the left (keys 1 to 0), then tap the ground to build. Arrow keys + Space work too.', 'Power runs everything. Colonists need oxygen, food and water. Tap a building to upgrade it.', 'Research in the lab, follow missions, and get ready for dust storms and meteors!'],
  skins: [
    { name: 'Mars', price: 0, c: ['#c2552a', '#7a2e14'] }, { name: 'Moon', price: 60, c: ['#9a9aa2', '#4a4a52'] }, { name: 'Ice world', price: 150, c: ['#bfe6f2', '#5a8aa2'] },
    { name: 'Venus', price: 250, c: ['#d8b24a', '#7a5a1a'] }, { name: 'Alien', price: 400, c: ['#6ad28a', '#1a5a3a'] }, { name: 'Void', price: 700, c: ['#3a2a5a', '#120a22'] },
  ],
};
(() => {
  const F = 'Orbitron, "Trebuchet MS", sans-serif', fnt = (s, b) => (b ? '700 ' : '') + s + 'px ' + F;
  const B = {
    solar: { n: 'Solar panel', cost: 10, pw: 6, c: '#3a6ad2' }, o2: { n: 'Oxygen maker', cost: 20, pw: -2, o2: 5, c: '#7cf2ff' },
    farm: { n: 'Greenhouse', cost: 20, pw: -2, food: 5, water: -1, c: '#5fd36a' }, water: { n: 'Ice drill', cost: 15, pw: -1, water: 5, c: '#4a9aff' },
    hab: { n: 'Habitat', cost: 30, pw: -1, house: 5, c: '#e6e0d0' }, mine: { n: 'Metal mine', cost: 25, pw: -2, metal: 3, c: '#b0a090' },
    shield: { n: 'Meteor shield', cost: 80, pw: -4, c: '#c79bff' }, reactor: { n: 'Reactor', cost: 150, pw: 30, c: '#ffd23f' },
    lab: { n: 'Research lab', cost: 60, pw: -3, sci: 2, c: '#ff8adf' }, port: { n: 'Spaceport', cost: 300, pw: -6, c: '#ff8a4a', need: 'port' },
  };
  const KEYS = Object.keys(B), GX = 12, GY = 7, TW = 84, TD = 62, OX = 250, OY = 158, SOL = 24, LVM = [0, 1, 1.7, 2.5];
  const RES = [
    { k: 'solar2', n: 'Better panels', d: 'Solar panels +30%', c: 15, x: 0, y: 0 }, { k: 'electro', n: 'Electrolysis', d: 'Oxygen makers +30%', c: 15, x: 1, y: 0 }, { k: 'hydro', n: 'Hydroponics', d: 'Greenhouses +30%', c: 15, x: 2, y: 0 },
    { k: 'dust', n: 'Dust wipers', d: 'Storms hurt solar less', c: 30, x: 0, y: 1, req: 'solar2' }, { k: 'drill', n: 'Deep drills', d: 'Ice drills and mines +30%', c: 30, x: 1, y: 1, req: 'electro' }, { k: 'recyc', n: 'Recycling', d: 'Colonists use 20% less', c: 35, x: 2, y: 1, req: 'hydro' },
    { k: 'fusion', n: 'Fusion', d: 'Reactors +50%', c: 50, x: 0, y: 2, req: 'dust' }, { k: 'rover', n: 'Rovers', d: 'Rovers clear rocks and haul metal', c: 45, x: 1, y: 2, req: 'drill' }, { k: 'habs', n: 'Big habitats', d: 'Habitats +3 beds', c: 50, x: 2, y: 2, req: 'recyc' },
    { k: 'grid', n: 'Smart grid', d: 'Buildings use 20% less power', c: 80, x: 0, y: 3, req: 'fusion' }, { k: 'port', n: 'Spaceport', d: 'Unlocks the Spaceport', c: 80, x: 1, y: 3, req: 'rover' }, { k: 'shield2', n: 'Strong shields', d: 'Shields stop every meteor', c: 70, x: 2, y: 3, req: 'habs' },
  ];
  const cnt = k => S.grid.filter(g => g === k).length, has = k => !!S.res[k], lvls = n => S.grid.filter((g, i) => g && S.lv[i] >= n).length, st = k => S.st[k] || 0;
  // missions: [text, value, target, metal reward, science reward, coins]
  const MIS = [
    ['Build a third solar panel', () => cnt('solar'), 3, 20, 0, 1], ['Build a second habitat', () => cnt('hab'), 2, 30, 0, 1], ['Reach 6 colonists', () => S.pop, 6, 40, 0, 1],
    ['Build a research lab', () => cnt('lab'), 1, 40, 5, 1], ['Research a new technology', () => Object.keys(S.res).length, 1, 50, 0, 2], ['Upgrade a building to level 2', () => lvls(2), 1, 50, 5, 1],
    ['Reach 10 colonists', () => S.pop, 10, 60, 5, 2], ['Build a meteor shield', () => cnt('shield'), 1, 60, 0, 1], ['Survive a dust storm', () => st('storms'), 1, 80, 10, 2],
    ['Reach 15 colonists', () => S.pop, 15, 100, 10, 2], ['Build a reactor', () => cnt('reactor'), 1, 100, 10, 2], ['Survive 3 dust storms', () => st('storms'), 3, 150, 15, 3],
    ['Research Rovers', () => has('rover') ? 1 : 0, 1, 150, 0, 2], ['Build a spaceport', () => cnt('port'), 1, 200, 20, 3], ['Reach 25 colonists', () => S.pop, 25, 250, 20, 4],
    ['Have 5 level 3 buildings', () => lvls(3), 5, 300, 20, 3], ['Research every technology', () => Object.keys(S.res).length, RES.length, 400, 0, 5], ['Reach 40 colonists', () => S.pop, 40, 400, 30, 5],
    ['Survive 10 dust storms', () => st('storms'), 10, 500, 30, 5], ['Reach 60 colonists', () => S.pop, 60, 600, 40, 6], ['Reach 100 colonists', () => S.pop, 100, 1000, 50, 10],
  ];
  const TUT = ['Colonists need oxygen, food and water. Power runs every building.', 'Pick the Solar panel here', 'Now tap an empty spot to build it'];
  let S, sel, hover, cur, tip, tipT, evt, evtT, nextK, meteors, saveT, rocket, stars, gameOver, info, panel, banners, walkers, rovers, puffs, drop, broke, alarmT, misT, earned, cloud;
  function fresh() {
    const grid = Array(GX * GY).fill(null), rocks = Array.from({ length: GX * GY }, () => Math.random() < .12);
    grid[3 * GX + 5] = 'hab'; grid[3 * GX + 6] = 'solar'; grid[2 * GX + 6] = 'solar'; grid[4 * GX + 6] = 'o2'; grid[4 * GX + 5] = 'farm'; grid[2 * GX + 5] = 'water';
    [3 * GX + 5, 3 * GX + 6, 2 * GX + 6, 4 * GX + 6, 4 * GX + 5, 2 * GX + 5].forEach(i => rocks[i] = false);
    return { grid, rocks, metal: 40, o2: 60, food: 60, water: 60, pop: 3, best: 3, sol: 1, t: 0, lv: Array(GX * GY).fill(1), sci: 0, res: {}, mis: 0, st: {}, tut: 0 };
  }
  GAME.reset = () => {
    const old = K.save.col;
    S = K.bot ? fresh() : (old && !old.over ? old : fresh());
    if (!Array.isArray(S.lv) || S.lv.length !== GX * GY) S.lv = Array(GX * GY).fill(1);
    if (!S.res) S.res = {}; if (!S.st) S.st = {}; if (S.sci === undefined) S.sci = 0; if (S.mis === undefined) S.mis = 0;
    if (S.tut === undefined) S.tut = old && !old.over ? 3 : 0;
    S.grid = S.grid.map(g => B[g] ? g : null);
    if (K.bot) {
      S.metal = 900; S.sci = 60; S.res = { solar2: 1, electro: 1, drill: 1, rover: 1 }; S.tut = 3; S.pop = 9; S.best = 9; S.mis = 99;
      const add = [[1, 'solar'], [2, 'solar'], [3, 'solar'], [8, 'hab'], [9, 'hab'], [7, 'mine'], [10, 'mine'], [4, 'lab'], [5, 'o2'], [6, 'farm'], [11, 'water']];
      add.forEach(([gx, k], j) => { const i = (j % 2 ? 1 : 4) * GX + gx; S.grid[i] = k; S.rocks[i] = false; S.lv[i] = 1 + (j % 3 === 0 ? 1 : 0); });
      S.grid[5 * GX + 3] = 'reactor'; S.rocks[5 * GX + 3] = false; S.grid[1 * GX + 6] = 'shield'; S.rocks[1 * GX + 6] = false;
    }
    sel = 'solar'; hover = -1; cur = 3 * GX + 3; tip = ''; tipT = 0; evt = null; evtT = K.bot ? 8 : 50; nextK = K.pick(['storm', 'meteor', 'supply']); meteors = []; saveT = 0; rocket = null; gameOver = false;
    info = -1; panel = null; banners = []; walkers = []; rovers = []; puffs = []; drop = null; broke = -1; alarmT = 0; misT = 0; earned = 0; cloud = [];
    stars = Array.from({ length: 90 }, () => ({ x: Math.random() * 1600 - 160, y: Math.random() * 150, r: Math.random() * 1.4 + .3, p: Math.random() * 6 }));
    K.score = S.best;
  };
  GAME.pose = () => { S.t = SOL * .55; for (let i = 0; i < 200; i++) { K.t += 1 / 30; life(1 / 30); } };
  const powerUse = b => -b.pw * (has('grid') ? .8 : 1);
  function rates() {
    const storm = evt && evt.k === 'storm' ? (has('dust') ? .65 : .35) : 1, flare = evt && evt.k === 'flare';
    let pw = 0, use = 0;
    S.grid.forEach((g, i) => { if (!g || i === broke) return; const b = B[g], m = LVM[S.lv[i]]; if (b.pw > 0) pw += b.pw * m * (g === 'solar' ? storm * (has('solar2') ? 1.3 : 1) : has('fusion') ? 1.5 : 1); else use += powerUse(b) * (1 + (S.lv[i] - 1) * .4); });
    const eff = use ? Math.min(1, pw / use) : 1, r = { pw, use, eff, o2: 0, food: 0, water: 0, metal: 0, house: 0, sci: 0 };
    S.grid.forEach((g, i) => {
      if (!g || i === broke) return; const b = B[g], m = LVM[S.lv[i]];
      for (const k of ['o2', 'food', 'water', 'metal', 'sci']) if (b[k]) { let v = b[k] * (b[k] > 0 ? eff * m : 1); if (b[k] > 0) { if (k === 'o2') v *= (has('electro') ? 1.3 : 1) * (flare ? .5 : 1); if (k === 'food' && has('hydro')) v *= 1.3; if ((k === 'water' || k === 'metal') && has('drill')) v *= 1.3; } r[k] += v; }
      if (b.house) r.house += (b.house + (has('habs') ? 3 : 0)) * (1 + (S.lv[i] - 1) * .6) | 0;
    });
    if (has('rover')) r.metal += Math.min(4, cnt('mine')) * .5;
    const use2 = has('recyc') ? .8 : 1; r.o2 -= S.pop * use2; r.food -= S.pop * .8 * use2; r.water -= S.pop * .6 * use2; return r;
  }
  function persist() { if (K.bot) return; K.save.col = S; K.save.best = Math.max(K.save.best || 0, S.best); K.persist(); }
  function bank(n, x, y) { if (K.bot || n <= 0) return; K.coin(n, x, y); K.runCoins -= n; K.save.coins += n; earned += n; K.persist(); }
  const banner = (s, sub, c = '#ff8a4a') => { if (K.bot) return; banners.push({ s, sub, c, t: 0 }); if (banners.length > 3) banners.shift(); };
  const tipMsg = s => { tip = s; tipT = 2.5; };
  const tileXY = i => [OX + (i % GX) * TW + TW / 2, OY + Math.floor(i / GX) * TD + TD * .72];
  const upCost = i => Math.round(B[S.grid[i]].cost * S.lv[i] * 1.5);

  /* ---------- input ---------- */
  const card = i => ({ x: 10, y: 94 + i * 47, w: 228, h: 43 });
  const RB = { x: 10, y: 614, w: 228, h: 94 }, MB = { x: 250, y: 612, w: 560, h: 96 }, IB = { x: 820, y: 612, w: 396, h: 96 };
  const PANEL = { x: 250, y: 96, w: 780, h: 506 }, CLOSE = { x: PANEL.x + PANEL.w - 62, y: PANEL.y + 12, w: 50, h: 50 };
  const rNode = r => ({ x: PANEL.x + 40 + r.x * 245, y: PANEL.y + 84 + r.y * 102, w: 220, h: 82 });
  const inB = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  const tileAt = (x, y) => { const gx = Math.floor((x - OX) / TW), gy = Math.floor((y - OY) / TD); return gx >= 0 && gy >= 0 && gx < GX && gy < GY ? gy * GX + gx : -1; };
  const infoBox = () => { const [x, y] = tileXY(info); return { x: K.clamp(x - 150, OX, 1270 - 300), y: K.clamp(y - 230, 92, 600 - 190), w: 300, h: 172 }; };
  function place(i) {
    if (i < 0) return; const [x, y] = tileXY(i);
    if (drop && drop.i === i && drop.land) return grabDrop();
    if (i === broke) return repair();
    if (S.grid[i]) {
      if (sel === 'remove') { const k = S.grid[i]; S.grid[i] = null; S.metal += Math.floor(B[k].cost * S.lv[i] / 2); S.lv[i] = 1; K.noise(.25, .15, 600); K.burst(x, y - 20, ['#aa8870', '#ddd'], 12, 180, { life: .5 }); persist(); return; }
      info = info === i ? -1 : i; K.sfx(700, .05, 'triangle', .05); return;
    }
    if (sel === 'remove') return;
    if (S.rocks[i]) { if (S.metal >= 5) { S.metal -= 5; S.rocks[i] = false; K.noise(.2, .2, 300); K.burst(x, y - 10, ['#8a4a2a', '#c27a50'], 10, 160, { life: .5 }); } else tipMsg('Clearing rocks costs 5 metal'); return; }
    const b = B[sel]; if (b.need && !has(b.need)) { tipMsg('Research the Spaceport first'); return; }
    if (S.metal < b.cost) { tipMsg(`Need ${b.cost} metal`); K.sfx(160, .1, 'square', .05); return; }
    S.metal -= b.cost; S.grid[i] = sel; S.lv[i] = 1; S.st.built = st('built') + 1; K.sfx(440, .08, 'square', .06); K.sfx(660, .08, 'square', .05, 0, .06);
    K.burst(x, y - 10, ['#ffb38a', '#fff', '#c27a50'], 14, 180, { life: .5 }); puffs.push({ x, y, r: 10, t: 0 }); if (S.tut === 2) { S.tut = 3; banner('Nice work, commander!', 'Follow the missions at the bottom to grow your colony', '#36b36a'); } persist();
  }
  function upgrade(i) { if (i < 0 || !S.grid[i]) return; if (S.lv[i] >= 3) { tipMsg('Already at max level'); return; } const c = upCost(i); if (S.metal < c) { tipMsg(`Upgrade needs ${c} metal`); K.sfx(160, .1, 'square', .05); return; } S.metal -= c; S.lv[i]++; const [x, y] = tileXY(i); K.burst(x, y - 30, ['#7cf2ff', '#fff', '#ffd23f'], 18, 220, { life: .6 }); K.chime(523, [0, 4, 7]); persist(); }
  function research(r) { if (has(r.k)) return; if (r.req && !has(r.req)) { tipMsg('Research the one above it first'); return; } if (S.sci < r.c) { tipMsg(`Needs ${r.c} science: build labs`); K.sfx(160, .1, 'square', .05); return; } S.sci -= r.c; S.res[r.k] = 1; K.chime(587, [0, 4, 7, 12]); banner(`Researched: ${r.n}`, r.d, '#ff8adf'); persist(); }
  function grabDrop() { if (!drop || !drop.land) return; const [x, y] = tileXY(drop.i); S.metal += 60; S.food = Math.min(200, S.food + 30); S.sci += 5; K.pop(x, y - 60, '+60 metal', '#ffd8a0', 26); K.chime(660, [0, 4, 7]); K.burst(x, y - 20, ['#fff', '#ffd23f'], 16, 200, { life: .6 }); drop = null; bank(1, x, y); persist(); }
  function repair() { if (broke < 0) return; if (S.metal < 5) { tipMsg('Repairs cost 5 metal'); return; } S.metal -= 5; const [x, y] = tileXY(broke); K.burst(x, y - 30, ['#7cf2ff', '#fff'], 14, 160, { life: .5 }); K.sfx(900, .08, 'square', .05); K.sfx(1200, .1, 'square', .05, 0, .08); broke = -1; banner('Repaired!', 'Back to work', '#36b36a'); }
  GAME.down = (x, y) => {
    if (gameOver) return;
    if (S.tut === 0) { S.tut = 1; return; }
    if (panel) { if (inB(CLOSE, x, y) || !inB(PANEL, x, y)) { panel = null; return; } for (const r of RES) if (inB(rNode(r), x, y)) research(r); return; }
    if (info >= 0) { const b = infoBox(), ub = { x: b.x + 14, y: b.y + 112, w: 150, h: 48 }, db = { x: b.x + 174, y: b.y + 112, w: 112, h: 48 }; if (inB(ub, x, y)) { upgrade(info); return; } if (inB(db, x, y)) { const s0 = sel; sel = 'remove'; place(info); sel = s0; info = -1; return; } if (inB(b, x, y)) return; info = -1; }
    for (let i = 0; i < KEYS.length + 1; i++) if (inB(card(i), x, y)) { sel = i < KEYS.length ? KEYS[i] : 'remove'; K.sfx(600, .04, 'triangle', .04); if (S.tut === 1 && sel === 'solar') S.tut = 2; return; }
    if (inB(RB, x, y)) { panel = 'res'; info = -1; K.sfx(600, .05, 'triangle', .05); return; }
    const i = tileAt(x, y); if (i >= 0) { cur = i; place(i); }
  };
  GAME.move = (x, y) => { hover = tileAt(x, y); };
  GAME.key = (c, d) => {
    if (!d || gameOver) return;
    if (S.tut === 0) { S.tut = 1; return; }
    if (panel) { if (c === 'Backspace' || c === 'KeyR' || c === 'KeyQ') panel = null; return; }
    const n = c.startsWith('Digit') ? +c.slice(5) : -1; if (n >= 1 && n <= 9) sel = KEYS[n - 1]; if (n === 0) sel = KEYS[9]; if (n >= 0 && S.tut === 1 && sel === 'solar') S.tut = 2;
    if (c === 'KeyX') sel = 'remove'; if (c === 'KeyR') { panel = 'res'; info = -1; }
    const gx = cur % GX, gy = Math.floor(cur / GX);
    if (c === 'ArrowLeft') cur = gy * GX + Math.max(0, gx - 1); if (c === 'ArrowRight') cur = gy * GX + Math.min(GX - 1, gx + 1);
    if (c === 'ArrowUp') cur = Math.max(0, gy - 1) * GX + gx; if (c === 'ArrowDown') cur = Math.min(GY - 1, gy + 1) * GX + gx;
    if (c.startsWith('Arrow')) { hover = cur; info = -1; }
    if (c === 'Space' || c === 'Enter') { if (info >= 0) info = -1; else place(cur); }
    if (c === 'KeyU') upgrade(info >= 0 ? info : cur);
    if (c === 'Backspace') info = -1;
  };
  let botT = 0;
  GAME.bot = dt => {
    botT += dt; if (botT < .9) return; botT = 0;
    if (drop && drop.land) return grabDrop(); if (broke >= 0) return repair();
    const r = rates(), need = r.eff < 1 ? (S.metal > 200 && !cnt('reactor') ? 'reactor' : 'solar') : r.o2 < 1 ? 'o2' : r.food < 1 ? 'farm' : r.water < 1 ? 'water' : r.house <= S.pop ? 'hab' : cnt('mine') < 2 + S.pop / 8 ? 'mine' : K.pick(['solar', 'hab', 'mine', 'o2', 'farm', 'lab']);
    const rr0 = RES.find(x => !has(x.k) && (!x.req || has(x.req)) && S.sci >= x.c); if (rr0) return research(rr0);
    if (Math.random() < .3) { const up = S.grid.map((g, i) => g && S.lv[i] < 3 && S.metal > upCost(i) * 2 ? i : -1).filter(i => i >= 0); if (up.length) return upgrade(K.pick(up)); }
    sel = need; const free = S.grid.map((g, i) => !g && !S.rocks[i] ? i : -1).filter(i => i >= 0); if (free.length) { const i = K.pick(free); cur = i; hover = i; place(i); }
  };

  /* ---------- update ---------- */
  function life(dt) {
    const t = K.t;
    // colonists stroll between buildings
    const want = Math.min(14, S.pop), spots = S.grid.map((g, i) => g ? i : -1).filter(i => i >= 0);
    while (walkers.length < want && spots.length) { const i = K.pick(spots), [x, y] = tileXY(i); walkers.push({ x, y: y + 8, tx: x, ty: y, w: 0, ph: Math.random() * 6, v: K.rand(16, 26) }); }
    if (walkers.length > want) walkers.length = want;
    for (const w of walkers) { const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy); if (d < 3) { w.w -= dt; if (w.w <= 0 && spots.length) { const [x, y] = tileXY(K.pick(spots)); w.tx = x + K.rand(-20, 20); w.ty = y + K.rand(4, 14); w.w = K.rand(1, 4); } } else { w.x += dx / d * w.v * dt; w.y += dy / d * w.v * dt; w.ph += dt * 9; w.dir = Math.sign(dx) || 1; } }
    // rovers
    const nr = has('rover') ? Math.min(4, 1 + Math.floor(cnt('mine') / 2)) : 0;
    while (rovers.length < nr && spots.length) { const [x, y] = tileXY(K.pick(spots)); rovers.push({ x, y, tx: x, ty: y, w: 0, a: 0 }); }
    for (const r of rovers) { const dx = r.tx - r.x, dy = r.ty - r.y, d = Math.hypot(dx, dy); if (d < 4) { r.w -= dt; if (r.w <= 0) { const rock = S.rocks.findIndex(v => v); const target = rock >= 0 && Math.random() < .35 ? rock : K.pick(spots.length ? spots : [0]); const [x, y] = tileXY(target); r.tx = x; r.ty = y + 10; r.rock = rock === target ? rock : -1; r.w = K.rand(1, 3); } else if (r.rock >= 0 && S.rocks[r.rock] && r.w < .5) { S.rocks[r.rock] = false; K.burst(r.x, r.y - 6, ['#8a4a2a', '#c27a50'], 8, 120, { life: .4 }); r.rock = -1; } } else { r.x += dx / d * 40 * dt; r.y += dy / d * 40 * dt; r.a = Math.atan2(dy, dx); r.dir = dx < 0 ? -1 : 1; if (Math.random() < dt * 8) puffs.push({ x: r.x - r.dir * 12, y: r.y, r: 4, t: 0 }); } }
    for (const p of puffs) { p.t += dt; p.r += 14 * dt; p.y -= 6 * dt; } puffs = puffs.filter(p => p.t < 1.4);
    if (Math.random() < dt * .3) cloud.push({ x: -200, y: K.rand(100, 140), v: K.rand(8, 20), s: K.rand(.6, 1.2) }); for (const c of cloud) c.x += c.v * dt; cloud = cloud.filter(c => c.x < 1500);
  }
  GAME.update = dt => {
    if (gameOver) return;
    life(dt);
    if (S.tut < 3 && !K.bot) { tipT -= dt; music(dt); return; }  // the colony waits while the tutorial is up
    const r = rates(), k = dt / SOL * 10;
    S.o2 = Math.min(200, S.o2 + r.o2 * k); S.food = Math.min(200, S.food + r.food * k); S.water = Math.min(200, S.water + r.water * k); S.metal += r.metal * k; S.sci += r.sci * k;
    if (S.water <= 0) { S.water = 0; S.food -= S.pop * .5 * k; }
    S.o2 = Math.max(0, S.o2); S.food = Math.max(0, S.food);
    S.t += dt; if (S.t >= SOL) { S.t -= SOL; S.sol++; }
    // newcomers arrive by rocket when there's room and supplies
    const port = cnt('port');
    GAME._arrive = (GAME._arrive || 0) + dt;
    if (GAME._arrive > (port ? 6 : 9) && S.pop < r.house && r.o2 > 0 && r.food > 0 && S.o2 > 20 && S.food > 20 && !rocket) { GAME._arrive = 0; const pi = S.grid.indexOf('port'); rocket = { i: pi, x: pi >= 0 ? tileXY(pi)[0] : 1180, gy: pi >= 0 ? tileXY(pi)[1] - 10 : 132, y: -120, t: 0, n: Math.min(r.house - S.pop, K.irand(1, port ? 5 : 3)) }; K.sfx(90, 3, 'sawtooth', .05, 120); }
    if (rocket) {
      const R = rocket; R.t += dt; R.y = R.t < 2.4 ? K.lerp(-120, R.gy, 1 - Math.pow(1 - R.t / 2.4, 2)) : R.t < 3.4 ? R.gy : R.gy - Math.pow(R.t - 3.4, 2) * 300;
      if (R.t < 2.4 || R.t > 3.4) puffs.push({ x: R.x + K.rand(-10, 10), y: R.y + 40, r: 8, t: 0 });
      if (R.t > 2.4 && !R.done) { R.done = true; S.pop += R.n; for (let q = 0; q < R.n; q++) walkers.push({ x: R.x, y: R.gy + 10, tx: R.x + K.rand(-60, 60), ty: R.gy + K.rand(0, 30), w: 1, ph: 0, v: 22 });
        if (S.pop > S.best) { S.best = S.pop; K.score = S.best; for (const m of [10, 25, 50, 100]) if (S.best >= m && S.best - R.n < m) { banner(`${m} colonists!`, 'Mars is starting to feel like home', '#7cf2ff'); K.chime(523, [0, 4, 7, 12]); bank(5, 640, 300); } }
        K.pop(R.x, R.gy - 70, `+${R.n} colonist${R.n > 1 ? 's' : ''}`, '#7cf2ff', 28); bank(1, R.x, R.gy - 40); }
      if (R.t > 5.5) rocket = null;
    }
    // people leave when supplies run out
    if ((S.o2 < 3 || S.food < 3) && S.pop > 0 && Math.random() < dt * .4) { S.pop--; walkers.pop(); tipMsg(S.o2 < 3 ? 'A colonist left: no oxygen!' : 'A colonist left: no food!'); K.sfx(220, .4, 'sawtooth', .06, -100); }
    alarmT -= dt; const low = S.o2 < 25 && r.o2 < 0 || S.food < 25 && r.food < 0 || S.water < 15 && r.water < 0 || r.eff < .7;
    if (low && alarmT <= 0) { alarmT = 4; K.sfx(880, .12, 'square', .04); K.sfx(660, .14, 'square', .04, 0, .14); }
    if (S.pop <= 0 || S.o2 <= 0 && S.food <= 0) {
      gameOver = true; S.over = true; persist();
      if (K.bot) K.over(); else { K.save.coins -= earned; K.runCoins = earned; K.over({ title: 'Colony evacuated', text: `The last colonists left on sol ${S.sol}. Best population: ${S.best}. Next time, watch your oxygen and food!` }); }
      return;
    }
    events(dt);
    for (const b of banners) b.t += dt; banners = banners.filter(b => b.t < 3.4); if (banners.length > 1 && banners[0].t < 3 && banners[1].t > 0) banners[1].t = 0;
    tipT -= dt; misT += dt; if (misT > .5) { misT = 0; checkMis(); }
    saveT += dt; if (saveT > 5) { saveT = 0; persist(); }
    music(dt);
  };
  function checkMis() { const m = MIS[S.mis]; if (K.bot || !m || m[1]() < m[2]) return; S.metal += m[3]; S.sci += m[4]; S.mis++; banner('Mission complete!', `${m[0]}: +${m[3]} metal${m[4] ? `, +${m[4]} science` : ''}`, '#36b36a'); K.chime(659, [0, 4, 7, 12, 16]); bank(m[5], MB.x + 280, MB.y + 40); persist(); }
  function events(dt) {
    evtT -= dt;
    if (!evt && evtT <= 0) {
      const k = nextK; nextK = K.pick(['storm', 'meteor', 'supply', 'flare', 'break', 'comet', 'storm', 'meteor']); evtT = K.bot ? K.rand(10, 16) : K.rand(45, 75);
      if (k === 'storm') { evt = { k, t: 25, d: 25 }; banner('DUST STORM!', has('dust') ? 'Dust wipers keep solar at 65%' : 'Solar panels drop to 35%: save power', '#e07a3a'); K.noise(1.2, .08, 300); }
      if (k === 'meteor') { evt = { k, t: 8, d: 8 }; banner('METEOR SHOWER!', cnt('shield') ? 'Shields are up' : 'No shields! Buildings may be hit', '#ff5a3a'); }
      if (k === 'flare') { evt = { k, t: 15, d: 15 }; banner('Solar flare!', 'Oxygen makers run at half speed', '#ffd23f'); }
      if (k === 'supply') { const free = S.grid.map((g, i) => !g && !S.rocks[i] ? i : -1).filter(i => i >= 0); if (free.length) { drop = { i: K.pick(free), y: -60, land: false, t: 0 }; banner('Supply drop incoming!', 'Tap the crate when it lands', '#36b36a'); } }
      if (k === 'break') { const bs = S.grid.map((g, i) => g && g !== 'hab' ? i : -1).filter(i => i >= 0); if (bs.length) { broke = K.pick(bs); banner(`${B[S.grid[broke]].n} broke down!`, 'Tap it to repair (5 metal)', '#e05a5a'); K.sfx(140, .4, 'sawtooth', .07, -60); } }
      if (k === 'comet') { S.water = Math.min(200, S.water + 50); banner('Ice comet!', 'Fresh ice: +50 water', '#7cf2ff'); evt = { k, t: 3, d: 3 }; }
      if (!K.bot) K.sfx(520, .15, 'triangle', .07);
    }
    if (evt) { evt.t -= dt; if (evt.k === 'meteor' && Math.random() < dt * 2.5) meteors.push({ x: K.rand(OX, OX + GX * TW) + 260, y: -40, tx: K.irand(0, GX * GY - 1), t: 0 }); if (evt.t <= 0) { if (evt.k === 'storm') { S.st.storms = st('storms') + 1; banner('The storm has passed', `Storms survived: ${S.st.storms}`, '#36b36a'); } evt = null; } }
    for (const m of meteors) { const [tx, ty] = tileXY(m.tx); m.t += dt; m.x += (tx - m.x) * dt * 2.2; m.y += (ty - 20 - m.y) * dt * 2.2; if (Math.abs(m.y - ty + 20) < 10) { m.hit = true; const sh = cnt('shield'); if (sh && (has('shield2') || Math.random() < Math.min(.95, sh * .45))) { K.burst(tx, ty - 90, ['#c79bff', '#fff'], 14, 220, { gravity: 0, life: .4 }); GAME._shieldF = .4; K.sfx(1200, .15, 'sine', .05, -600); } else { K.shake(10); K.noise(.4, .25, 120); K.burst(tx, ty - 10, ['#ff8a4a', '#ffd23f', '#555'], 20, 260, { life: .6 }); if (S.grid[m.tx] && S.grid[m.tx] !== 'hab' && Math.random() < .5) { S.grid[m.tx] = null; S.lv[m.tx] = 1; S.rocks[m.tx] = true; } else if (!S.grid[m.tx]) S.rocks[m.tx] = true; } } }
    meteors = meteors.filter(m => !m.hit); GAME._shieldF = Math.max(0, (GAME._shieldF || 0) - dt);
    if (drop) { drop.t += dt; const [, y] = tileXY(drop.i); if (!drop.land) { drop.y += 90 * dt; if (drop.y >= y - 14) { drop.y = y - 14; drop.land = true; K.noise(.2, .1, 400); } } if (drop.t > 30) drop = null; }
  }

  /* ---------- music: slow ambient pads with a sparse arpeggio ---------- */
  let mBus = null, mNext = 0, mStep = 0;
  const CH = [[0, 7, 10, 14], [-4, 3, 7, 10], [-2, 5, 9, 12], [-7, 0, 5, 8]];
  function pad(f, t, d, v) { const ac = K.ac, o = ac.createOscillator(), o2 = ac.createOscillator(), a = ac.createGain(); o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.value = f; o2.frequency.value = f * 1.006; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + d * .4); a.gain.linearRampToValueAtTime(0, t + d); o.connect(a); o2.connect(a); a.connect(mBus); o.start(t); o2.start(t); o.stop(t + d + .05); o2.stop(t + d + .05); }
  function blip(f, t, v) { const ac = K.ac, o = ac.createOscillator(), a = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(.0001, t + .5); o.connect(a).connect(mBus); o.start(t); o.stop(t + .55); }
  function music() {
    const ac = K.ac; if (!ac || K.bot || K.state !== 'play' || K.save.mute) return;
    if (!mBus) { mBus = ac.createGain(); mBus.gain.value = .5; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 3; const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .07; lg.gain.value = 500; lfo.connect(lg).connect(lp.frequency); lfo.start(); const dl = ac.createDelay(1); dl.delayTime.value = .55; const fb = ac.createGain(); fb.gain.value = .4; mBus.connect(lp); lp.connect(K.master); lp.connect(dl); dl.connect(fb).connect(dl); dl.connect(K.master); }
    const step = .6; if (mNext < ac.currentTime) mNext = ac.currentTime + .1;
    while (mNext < ac.currentTime + .4) {
      const s = mStep++, bar = Math.floor(s / 12) % 4, i = s % 12, ch = CH[bar], hz = n => 110 * Math.pow(2, n / 12), t = mNext; mNext += step;
      if (i === 0) { for (const n of ch) pad(hz(n), t, step * 12.5, .018); pad(hz(ch[0] - 12), t, step * 12, .03); }
      if ((i % 3 === 0 || Math.random() < .2) && Math.random() < .7) blip(hz(ch[(s * 7) % 4] + 24), t, .025);
    }
  }

  /* ---------- art ---------- */
  function rr(gr, x, y, w, h, r, fill) { gr.beginPath(); gr.roundRect(x, y, w, h, r); if (fill) { gr.fillStyle = fill; gr.fill(); } }
  function circ(gr, x, y, r, fill) { gr.beginPath(); gr.arc(x, y, r, 0, 7); gr.fillStyle = fill; gr.fill(); }
  function ell(gr, x, y, rx, ry, fill) { gr.beginPath(); gr.ellipse(x, y, rx, ry, 0, 0, 7); gr.fillStyle = fill; gr.fill(); }
  function lin(gr, x0, y0, x1, y1, stops) { const g = gr.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
  function Tx(gr, s, x, y, size, col, al = 'center', b = false, sh = 'rgba(0,0,0,.45)') { gr.font = fnt(size, b); gr.textAlign = al; gr.textBaseline = 'middle'; if (sh) { gr.fillStyle = sh; gr.fillText(s, x, y + 2); } gr.fillStyle = col; gr.fillText(s, x, y); }
  // an oblique box: front face w x h, top face depth d
  function box(gr, x, y, w, h, d, top, front) { gr.fillStyle = front; gr.fillRect(x - w / 2, y - h, w, h); gr.fillStyle = top; gr.fillRect(x - w / 2, y - h - d, w, d); gr.fillStyle = 'rgba(0,0,0,.18)'; gr.fillRect(x + w / 2 - 6, y - h, 6, h); }
  function cyl(gr, x, y, r, h, c1, c2, c3) { gr.fillStyle = lin(gr, x - r, 0, x + r, 0, [c2, c1, c2, c3]); gr.fillRect(x - r, y - h, r * 2, h); ell(gr, x, y, r, r * .35, c3); gr.fillRect(x - r, y - h, r * 2, h); gr.fillStyle = lin(gr, x - r, 0, x + r, 0, [c2, c1, c2, c3]); gr.fillRect(x - r, y - h, r * 2, h); ell(gr, x, y - h, r, r * .35, c1); }
  function dome(gr, x, y, rx, ry, c1, c2, glass) { const g = gr.createRadialGradient(x - rx * .35, y - ry * .7, 2, x, y - ry * .3, rx * 1.1); g.addColorStop(0, c1); g.addColorStop(1, c2); gr.fillStyle = g; gr.globalAlpha = glass ? .75 : 1; gr.beginPath(); gr.ellipse(x, y, rx, ry, 0, Math.PI, 0); gr.fill(); gr.globalAlpha = 1; gr.fillStyle = 'rgba(255,255,255,.35)'; gr.beginPath(); gr.ellipse(x - rx * .4, y - ry * .6, rx * .22, ry * .12, -.6, 0, 7); gr.fill(); }
  function bld(gr, k, x, y, lv, t, ghost) {
    gr.save(); if (ghost) gr.globalAlpha = .55;
    if (!ghost) ell(gr, x + 8, y + 2, 34, 9, 'rgba(0,0,0,.28)');
    const day = Math.cos((S.t / SOL) * 6.283) * .5 + .5;
    if (k === 'solar') {
      const ang = Math.sin(t * .15 + x * .01) * .5 + (S.t / SOL - .5) * .8;
      gr.fillStyle = '#6a6a74'; gr.fillRect(x - 3, y - 26, 6, 26); box(gr, x, y, 22, 6, 6, '#9a9aa4', '#5a5a64');
      for (let p = 0; p < (lv >= 2 ? 2 : 1); p++) { const px = x + (lv >= 2 ? (p ? 16 : -16) : 0), w = 30 * (lv >= 2 ? .8 : 1) + (lv >= 3 ? 6 : 0), cw = Math.cos(ang) * w; gr.save(); gr.translate(px, y - 30); gr.fillStyle = '#1a2a5a'; gr.beginPath(); gr.moveTo(-cw, -12); gr.lineTo(cw, -18); gr.lineTo(cw, 6); gr.lineTo(-cw, 12); gr.fill(); gr.fillStyle = lin(gr, -cw, -14, cw, 10, ['#3a6ad2', '#6aa0ff', '#2a4aa2']); gr.beginPath(); gr.moveTo(-cw + 2, -10); gr.lineTo(cw - 2, -16); gr.lineTo(cw - 2, 4); gr.lineTo(-cw + 2, 10); gr.fill(); gr.strokeStyle = 'rgba(160,200,255,.5)'; gr.lineWidth = 1; for (let q = -1; q <= 1; q++) { gr.beginPath(); gr.moveTo(q * cw * .5, -13 - q * 1.5); gr.lineTo(q * cw * .5, 7 - q * 1.5); gr.stroke(); } gr.beginPath(); gr.moveTo(-cw, 0); gr.lineTo(cw, -6); gr.stroke(); const gl = (Math.sin(t * 1.3 + x) + 1) / 2; gr.fillStyle = `rgba(255,255,255,${gl * .35 * day})`; gr.beginPath(); gr.moveTo(-cw * .2, -11); gr.lineTo(cw * .2, -13); gr.lineTo(0, 2); gr.fill(); gr.restore(); }
    } else if (k === 'o2') {
      cyl(gr, x - 10, y, 14, 40 + lv * 4, '#e8eef4', '#b0bcc8', '#7a8896'); box(gr, x + 16, y, 22, 26, 8, '#c8d4de', '#8a98a6');
      gr.save(); gr.translate(x + 16, y - 15); gr.rotate(t * 6); gr.fillStyle = '#4a5a6a'; for (let q = 0; q < 4; q++) { gr.rotate(Math.PI / 2); gr.fillRect(-2, 0, 4, 8); } gr.restore(); circ(gr, x + 16, y - 15, 2.5, '#2a3a4a');
      circ(gr, x - 10, y - 26, 6, '#7cf2ff'); Tx(gr, 'O₂', x - 10, y - 26, 9, '#0a3a4a', 'center', true, null); if (Math.random() < .03) puffs.push({ x: x - 10, y: y - 50 - lv * 4, r: 4, t: 0, c: 1 });
    } else if (k === 'farm') {
      ell(gr, x, y - 2, 36 + lv * 2, 10, '#5a4a3a'); const pulse = .5 + Math.sin(t * 1.5 + x) * .2; const gl = gr.createRadialGradient(x, y - 14, 4, x, y - 14, 46); gl.addColorStop(0, `rgba(120,255,140,${pulse * .6})`); gl.addColorStop(1, 'rgba(120,255,140,0)'); circ(gr, x, y - 14, 46, gl);
      gr.fillStyle = '#3a8a3a'; for (let q = -3; q <= 3; q++) { gr.beginPath(); gr.ellipse(x + q * 9, y - 8 - Math.abs(Math.sin(q + t * .5)) * 2, 4, 9 + (q % 2) * 3, q * .1, 0, 7); gr.fill(); } for (let q = -2; q <= 2; q++) circ(gr, x + q * 12, y - 18, 2.5, '#ff6a6a');
      dome(gr, x, y - 2, 36 + lv * 2, 34 + lv * 3, 'rgba(220,255,230,.55)', 'rgba(120,200,160,.35)', true); gr.strokeStyle = 'rgba(200,255,220,.5)'; gr.lineWidth = 1.2; for (let q = -2; q <= 2; q++) { gr.beginPath(); gr.ellipse(x, y - 2, Math.abs(q) * 8, 34 + lv * 3, 0, Math.PI, 0); gr.stroke(); }
    } else if (k === 'water') {
      box(gr, x, y, 46, 12, 8, '#8a9aaa', '#5a6a7a'); const bob = Math.sin(t * 4 + x) * 4;
      gr.strokeStyle = '#c0c8d0'; gr.lineWidth = 3; gr.beginPath(); gr.moveTo(x - 16, y - 12); gr.lineTo(x, y - 62 - lv * 4); gr.lineTo(x + 16, y - 12); gr.moveTo(x - 10, y - 28); gr.lineTo(x + 10, y - 28); gr.moveTo(x - 6, y - 44); gr.lineTo(x + 6, y - 44); gr.stroke();
      gr.fillStyle = '#ffb030'; gr.fillRect(x - 4, y - 50 + bob, 8, 16); gr.fillStyle = '#ccc'; gr.fillRect(x - 1.5, y - 34 + bob, 3, 22); circ(gr, x, y - 64 - lv * 4, 3, Math.sin(t * 3) > 0 ? '#ff4a4a' : '#7a2a2a');
      for (let q = 0; q < 3; q++) { gr.fillStyle = 'rgba(190,240,255,.85)'; gr.beginPath(); const cx = x + 26 + q * 6, cy = y - 4 - q * 3; gr.moveTo(cx, cy - 8); gr.lineTo(cx + 4, cy); gr.lineTo(cx, cy + 3); gr.lineTo(cx - 4, cy); gr.fill(); }
      if (Math.random() < .02) puffs.push({ x: x + 6, y: y - 14, r: 3, t: 0, c: 1 });
    } else if (k === 'hab') {
      const lit = 1 - day * .7;
      for (let m = 0; m < (lv >= 2 ? 2 : 1); m++) { const mx = x + (lv >= 2 ? (m ? 16 : -14) : 0), r = lv >= 2 && m ? 22 : 30 + (lv >= 3 ? 4 : 0); gr.fillStyle = '#9a9488'; gr.fillRect(mx - r, y - 8, r * 2, 8); dome(gr, mx, y - 8, r, r * .9, '#fbf8f0', '#b8b0a0'); gr.fillStyle = '#d8d0c0'; gr.fillRect(mx - r, y - 12, r * 2, 4); for (const wx of [-.5, 0, .5]) { const g = gr.createRadialGradient(mx + wx * r, y - 18, 0, mx + wx * r, y - 18, 7); g.addColorStop(0, `rgba(255,230,140,${.5 + lit * .5})`); g.addColorStop(1, 'rgba(120,200,255,.6)'); circ(gr, mx + wx * r, y - 18, 4.5, g); } }
      gr.strokeStyle = '#aaa'; gr.lineWidth = 1.5; gr.beginPath(); gr.moveTo(x + 8, y - 34); gr.lineTo(x + 8, y - 48); gr.stroke(); circ(gr, x + 8, y - 49, 2.5, Math.sin(t * 2 + x) > .6 ? '#ff6a4a' : '#7a3a2a');
    } else if (k === 'mine') {
      gr.fillStyle = '#6a3a24'; gr.beginPath(); gr.moveTo(x + 8, y); gr.quadraticCurveTo(x + 22, y - 26, x + 36, y); gr.fill(); for (let q = 0; q < 4; q++) circ(gr, x + 16 + q * 5, y - 6 - (q % 2) * 6, 4, '#a07a5a');
      box(gr, x - 12, y, 34, 22, 10, '#c8b8a0', '#8a7a64'); gr.save(); gr.translate(x - 12, y - 40); gr.rotate(t * (1.5 + lv * .5)); gr.strokeStyle = '#ffd23f'; gr.lineWidth = 3; gr.beginPath(); gr.arc(0, 0, 12, 0, 7); gr.stroke(); for (let q = 0; q < 6; q++) { gr.rotate(Math.PI / 3); gr.fillStyle = '#d0a020'; gr.fillRect(10, -3, 6, 6); } gr.restore();
      gr.strokeStyle = '#555'; gr.lineWidth = 4; gr.beginPath(); gr.moveTo(x + 4, y - 18); gr.lineTo(x + 26, y - 6); gr.stroke(); const cp = (t * 20) % 22; circ(gr, x + 4 + cp, y - 18 + cp * .55, 2.5, '#c0a080');
    } else if (k === 'shield') {
      box(gr, x, y, 20, 30, 8, '#a8a8b8', '#6a6a7a'); const pulse = .6 + Math.sin(t * 3) * .3; const g = gr.createRadialGradient(x, y - 44, 1, x, y - 44, 16); g.addColorStop(0, '#fff'); g.addColorStop(.4, '#c79bff'); g.addColorStop(1, 'rgba(199,155,255,0)'); circ(gr, x, y - 44, 16, g);
      gr.globalAlpha = (ghost ? .3 : 1) * (.12 + (GAME._shieldF || 0) * .8 + pulse * .06); gr.fillStyle = '#c79bff'; gr.beginPath(); gr.ellipse(x, y, 110 + lv * 15, 95 + lv * 12, 0, Math.PI, 0); gr.fill(); gr.globalAlpha = ghost ? .55 : .4; gr.strokeStyle = '#d8b8ff'; gr.lineWidth = 2; gr.stroke(); gr.globalAlpha = ghost ? .55 : 1;
    } else if (k === 'reactor') {
      gr.fillStyle = lin(gr, x - 26, 0, x + 26, 0, ['#7a7a84', '#c8c8d0', '#6a6a74']); gr.beginPath(); gr.moveTo(x - 28, y); gr.quadraticCurveTo(x - 14, y - 30, x - 20, y - 56); gr.lineTo(x + 20, y - 56); gr.quadraticCurveTo(x + 14, y - 30, x + 28, y); gr.fill(); ell(gr, x, y - 56, 20, 6, '#4a4a54');
      const p = .6 + Math.sin(t * 4) * .4; const g = gr.createRadialGradient(x, y - 20, 2, x, y - 20, 22); g.addColorStop(0, `rgba(255,240,120,${p})`); g.addColorStop(1, 'rgba(255,200,60,0)'); circ(gr, x, y - 20, 22, g); rr(gr, x - 8, y - 30, 16, 20, 4, '#ffd23f'); for (let q = 0; q < lv; q++) { gr.strokeStyle = `rgba(255,230,100,${p})`; gr.lineWidth = 2; gr.beginPath(); gr.ellipse(x, y - 20, 12 + q * 5, 4 + q * 2, 0, 0, 7); gr.stroke(); }
      if (Math.random() < .05) puffs.push({ x: x + K.rand(-10, 10), y: y - 60, r: 6, t: 0, c: 1 });
    } else if (k === 'lab') {
      box(gr, x - 6, y, 48, 24 + lv * 4, 12, '#f0e8f0', '#b8a8c0'); gr.fillStyle = '#7cf2ff'; for (let q = 0; q < 3; q++) gr.fillRect(x - 24 + q * 14, y - 18, 8, 8);
      gr.save(); gr.translate(x + 18, y - 40 - lv * 4); gr.strokeStyle = '#aaa'; gr.lineWidth = 2; gr.beginPath(); gr.moveTo(0, 0); gr.lineTo(0, 14); gr.stroke(); const s = Math.cos(t * .8); gr.scale(s, 1); gr.fillStyle = '#e0e0ea'; gr.beginPath(); gr.ellipse(0, 0, 12, 7, -.4, Math.PI * .1, Math.PI * 1.1); gr.fill(); gr.restore(); circ(gr, x + 18, y - 42 - lv * 4, 2, '#ff8adf');
      if (Math.sin(t * 2 + x) > .9) circ(gr, x - 6, y - 40 - lv * 4, 3, '#ff8adf');
    } else if (k === 'port') {
      ell(gr, x, y - 4, 40, 14, '#5a5a64'); ell(gr, x, y - 6, 34, 11, '#7a7a84'); gr.strokeStyle = '#ffd23f'; gr.lineWidth = 2; gr.beginPath(); gr.ellipse(x, y - 6, 24, 8, 0, 0, 7); gr.stroke(); Tx(gr, 'H', x, y - 6, 12, '#ffd23f', 'center', true, null);
      for (let q = 0; q < 6; q++) { const a = q / 6 * 6.28; circ(gr, x + Math.cos(a) * 36, y - 6 + Math.sin(a) * 12, 2.5, Math.sin(t * 5 - q) > .3 ? '#ff8a4a' : '#5a3a2a'); }
      box(gr, x + 34, y + 2, 12, 46, 6, '#c8c8d0', '#8a8a94');
    }
    if (lv > 1 && !ghost) { for (let q = 0; q < lv - 1; q++) { gr.fillStyle = '#ffd23f'; gr.beginPath(); const sx = x - 30 + q * 11, sy = y - 4; for (let j = 0; j < 10; j++) { const a = j * Math.PI / 5 - Math.PI / 2, r2 = j % 2 ? 2.2 : 5; gr.lineTo(sx + Math.cos(a) * r2, sy + Math.sin(a) * r2); } gr.fill(); } }
    gr.restore();
  }
  function astro(gr, w, t) { const sw = Math.sin(w.ph) * 3; gr.save(); gr.translate(w.x, w.y); gr.scale(w.dir || 1, 1); ell(gr, 0, 0, 5, 2, 'rgba(0,0,0,.3)'); gr.strokeStyle = '#e8e8f0'; gr.lineWidth = 3; gr.lineCap = 'round'; gr.beginPath(); gr.moveTo(-1.5, -6); gr.lineTo(-1.5 + sw, -1); gr.moveTo(1.5, -6); gr.lineTo(1.5 - sw, -1); gr.stroke(); rr(gr, -4, -13, 8, 8, 3, '#f4f4fa'); gr.fillStyle = '#ff8a4a'; gr.fillRect(-4, -10, 8, 2); circ(gr, 0, -16, 4.5, '#f4f4fa'); rr(gr, 0, -18, 4, 3.5, 1.5, '#ffb030'); gr.fillStyle = '#b0b0c0'; gr.fillRect(-6, -12, 2, 6); gr.restore(); }
  function rover(gr, r, t) { gr.save(); gr.translate(r.x, r.y); gr.scale(r.dir || 1, 1); ell(gr, 0, 1, 16, 4, 'rgba(0,0,0,.3)'); for (const wx of [-10, 0, 10]) { circ(gr, wx, -3, 4, '#2a2a30'); circ(gr, wx, -3, 1.5, '#888'); } box(gr, 0, -6, 26, 8, 5, '#f0f0f4', '#b8b8c4'); gr.fillStyle = '#ff8a4a'; gr.fillRect(-13, -10, 26, 2); gr.strokeStyle = '#aaa'; gr.lineWidth = 1.5; gr.beginPath(); gr.moveTo(8, -19); gr.lineTo(8, -28); gr.stroke(); circ(gr, 8, -29, 2, Math.sin(t * 6) > 0 ? '#7cf2ff' : '#2a6a7a'); rr(gr, -10, -24, 10, 5, 2, '#5a8aaa'); gr.restore(); }
  function rocketArt(gr, R, t) {
    gr.save(); gr.translate(R.x, R.y); const fl = R.t < 2.4 || R.t > 3.4;
    if (fl) { const g = gr.createLinearGradient(0, 30, 0, 90); g.addColorStop(0, '#fff6c0'); g.addColorStop(.4, '#ffb030'); g.addColorStop(1, 'rgba(255,80,30,0)'); gr.fillStyle = g; gr.beginPath(); gr.moveTo(-9, 32); gr.quadraticCurveTo(0, 70 + Math.random() * 30, 9, 32); gr.fill(); }
    gr.fillStyle = '#c8c8d0'; gr.beginPath(); gr.moveTo(-14, 34); gr.lineTo(-24, 40); gr.lineTo(-14, 12); gr.moveTo(14, 34); gr.lineTo(24, 40); gr.lineTo(14, 12); gr.fill();
    gr.fillStyle = lin(gr, -14, 0, 14, 0, ['#b8b8c4', '#ffffff', '#a8a8b4']); gr.beginPath(); gr.moveTo(0, -48); gr.quadraticCurveTo(16, -20, 14, 34); gr.lineTo(-14, 34); gr.quadraticCurveTo(-16, -20, 0, -48); gr.fill();
    gr.fillStyle = '#ff8a4a'; gr.fillRect(-14, 20, 28, 6); circ(gr, 0, -14, 6, '#2a4a6a'); circ(gr, -1.5, -15.5, 2, '#7cf2ff'); gr.restore();
  }
  GAME.drawSkin = (gr, s) => { const g = gr.createRadialGradient(-12, -12, 4, 0, 0, 42); g.addColorStop(0, s.c[0]); g.addColorStop(1, s.c[1]); gr.fillStyle = g; gr.beginPath(); gr.arc(0, 0, 40, 0, 7); gr.fill(); gr.fillStyle = 'rgba(0,0,0,.18)'; gr.beginPath(); gr.arc(-10, -8, 9, 0, 7); gr.arc(14, 14, 7, 0, 7); gr.arc(16, -16, 4, 0, 7); gr.fill(); };

  /* ---------- draw ---------- */
  function drawWorld(gr) {
    const v = K.view, sk = K.skin, t = K.t, storm = evt && evt.k === 'storm', day = Math.cos((S.t / SOL) * 6.283) * .5 + .5;
    gr.fillStyle = lin(gr, 0, v.y0, 0, 160, [day > .5 ? '#2a1830' : '#08040e', day > .5 ? '#a8603a' : '#3a1a20']); gr.fillRect(v.x0, v.y0, v.x1 - v.x0, 170 - v.y0);
    for (const s of stars) { gr.globalAlpha = (1 - day * .8) * (.5 + Math.sin(t * 2 + s.p) * .3); gr.fillStyle = '#fff'; gr.fillRect(s.x, s.y, s.r * 2, s.r * 2); } gr.globalAlpha = 1;
    const sunx = 200 + (S.t / SOL) * 900, suny = 140 - Math.sin((S.t / SOL) * Math.PI) * 40; const sg = gr.createRadialGradient(sunx, suny, 2, sunx, suny, 40); sg.addColorStop(0, 'rgba(255,250,230,.95)'); sg.addColorStop(.3, 'rgba(255,220,180,.4)'); sg.addColorStop(1, 'rgba(255,200,150,0)'); circ(gr, sunx, suny, 40, sg);
    circ(gr, 1000, 112, 6, '#8a7a70'); circ(gr, 1080, 124, 3.5, '#9a8a7a'); circ(gr, 160, 120, 2.5, '#6aa8ff');
    for (const c of cloud) { gr.fillStyle = 'rgba(255,190,150,.12)'; ell(gr, c.x, c.y, 120 * c.s, 8 * c.s, 'rgba(255,190,150,.12)'); }
    gr.fillStyle = sk.c[1]; gr.beginPath(); gr.moveTo(v.x0, 160); for (let x = v.x0; x <= v.x1 + 40; x += 40) gr.lineTo(x, 132 - Math.abs(Math.sin(x * .006)) * 26 - Math.sin(x * .023) * 6); gr.lineTo(v.x1, 170); gr.fill();
    gr.fillStyle = lin(gr, 0, 140, 0, v.y1, [sk.c[0], sk.c[1]]); gr.fillRect(v.x0, 146, v.x1 - v.x0, v.y1 - 146);
    gr.fillStyle = 'rgba(0,0,0,.08)'; for (let k = 0; k < 26; k++) { const cx = (k * 211.7) % 1400 - 60, cy = 170 + (k * 97.3) % 540, r = 8 + k % 5 * 6; ell(gr, cx, cy, r * 1.6, r * .6, 'rgba(0,0,0,.09)'); ell(gr, cx, cy - r * .15, r * 1.3, r * .4, 'rgba(255,255,255,.04)'); }
    // grid
    gr.strokeStyle = 'rgba(255,220,190,.08)'; gr.lineWidth = 1; for (let gx = 0; gx <= GX; gx++) { gr.beginPath(); gr.moveTo(OX + gx * TW, OY); gr.lineTo(OX + gx * TW, OY + GY * TD); gr.stroke(); } for (let gy = 0; gy <= GY; gy++) { gr.beginPath(); gr.moveTo(OX, OY + gy * TD); gr.lineTo(OX + GX * TW, OY + gy * TD); gr.stroke(); }
    // rows back to front
    const r = rates();
    for (let gy = 0; gy < GY; gy++) {
      for (let gx = 0; gx < GX; gx++) {
        const i = gy * GX + gx, [x, y] = tileXY(i), tx = OX + gx * TW, ty = OY + gy * TD;
        if (S.grid[i]) { gr.fillStyle = 'rgba(60,40,40,.28)'; gr.fillRect(tx + 6, ty + 6, TW - 12, TD - 12); }
        if (S.rocks[i]) { ell(gr, x + 6, y + 2, 28, 7, 'rgba(0,0,0,.25)'); gr.fillStyle = lin(gr, 0, y - 26, 0, y, [sk.c[0], sk.c[1]]); gr.beginPath(); gr.moveTo(x - 26, y); gr.lineTo(x - 18, y - 18); gr.lineTo(x - 2, y - 26); gr.lineTo(x + 14, y - 16); gr.lineTo(x + 24, y); gr.fill(); gr.fillStyle = 'rgba(255,255,255,.12)'; gr.beginPath(); gr.moveTo(x - 18, y - 18); gr.lineTo(x - 2, y - 26); gr.lineTo(x - 6, y - 10); gr.fill(); }
        if ((i === hover || i === cur && !K.bot && hover === cur) && !K.bot && !panel) { gr.strokeStyle = sel === 'remove' ? '#ff4a4a' : 'rgba(255,255,255,.75)'; gr.lineWidth = 3; gr.setLineDash([8, 5]); gr.lineDashOffset = -t * 20; gr.strokeRect(tx + 4, ty + 4, TW - 8, TD - 8); gr.setLineDash([]); }
      }
      for (let gx = 0; gx < GX; gx++) {
        const i = gy * GX + gx, [x, y] = tileXY(i);
        if (S.grid[i]) { bld(gr, S.grid[i], x, y, S.lv[i], t); if (i === broke) { if (Math.random() < .2) puffs.push({ x: x + K.rand(-10, 10), y: y - 30, r: 6, t: 0, smoke: 1 }); Tx(gr, '🔧', x, y - 70 - Math.abs(Math.sin(t * 4)) * 6, 22, '#fff', 'center', false, null); } else if (r.eff < 1 && B[S.grid[i]].pw < 0 && Math.sin(t * 6 + i) > 0) Tx(gr, '⚡', x + 22, y - 54, 16, '#ff5a4a', 'center', true, null); if (i === info) { gr.strokeStyle = '#7cf2ff'; gr.lineWidth = 3; gr.strokeRect(OX + gx * TW + 4, OY + gy * TD + 4, TW - 8, TD - 8); } }
        else if (i === hover && !S.rocks[i] && sel !== 'remove' && !K.bot && !panel) bld(gr, sel, x, y, 1, t, true);
      }
      for (const w of walkers) if (w.y >= OY + gy * TD + TD * .5 && w.y < OY + (gy + 1) * TD + TD * .5 || gy === GY - 1 && w.y >= OY + GY * TD - TD * .5 || gy === 0 && w.y < OY + TD * .5) astro(gr, w, t);
      for (const rv of rovers) if (Math.floor((rv.y - OY - TD * .5) / TD) === gy || gy === 0 && rv.y < OY + TD * .5) rover(gr, rv, t);
    }
    for (const p of puffs) { gr.globalAlpha = Math.max(0, .5 - p.t / 2.8); circ(gr, p.x, p.y, p.r, p.smoke ? '#3a3a3a' : p.c ? '#f4f0f0' : '#c89070'); } gr.globalAlpha = 1;
    if (drop) { const [x] = tileXY(drop.i); if (!drop.land) { gr.strokeStyle = '#ddd'; gr.lineWidth = 1; gr.beginPath(); gr.moveTo(x - 12, drop.y - 10); gr.lineTo(x - 22, drop.y - 44); gr.moveTo(x + 12, drop.y - 10); gr.lineTo(x + 22, drop.y - 44); gr.stroke(); gr.fillStyle = '#ff8a4a'; gr.beginPath(); gr.arc(x, drop.y - 44, 26, Math.PI, 0); gr.fill(); gr.fillStyle = '#fff'; gr.beginPath(); gr.arc(x, drop.y - 44, 26, Math.PI * 1.33, Math.PI * 1.66); gr.lineTo(x, drop.y - 44); gr.fill(); } const g = .5 + Math.sin(t * 6) * .5; if (drop.land) { const gl = gr.createRadialGradient(x, drop.y - 8, 2, x, drop.y - 8, 34); gl.addColorStop(0, `rgba(255,230,120,${g * .6})`); gl.addColorStop(1, 'rgba(255,230,120,0)'); circ(gr, x, drop.y - 8, 34, gl); } box(gr, x, drop.y + 10, 26, 18, 8, '#e0c890', '#a88850'); Tx(gr, '+', x, drop.y + 1, 16, '#5a3a10', 'center', true, null); if (drop.land && !K.bot) Tx(gr, 'TAP!', x, drop.y - 40 - Math.abs(Math.sin(t * 4)) * 6, 16, '#fff', 'center', true); }
    for (const m of meteors) { const g = gr.createLinearGradient(m.x, m.y, m.x + 70, m.y - 90); g.addColorStop(0, 'rgba(255,200,100,.9)'); g.addColorStop(1, 'rgba(255,120,60,0)'); gr.strokeStyle = g; gr.lineWidth = 8; gr.lineCap = 'round'; gr.beginPath(); gr.moveTo(m.x, m.y); gr.lineTo(m.x + 70, m.y - 90); gr.stroke(); circ(gr, m.x, m.y, 9, '#ffe9a0'); circ(gr, m.x, m.y, 5, '#fff'); }
    if (rocket) rocketArt(gr, rocket, t);
    // night and weather
    if (day < .5) { gr.fillStyle = `rgba(10,10,40,${(.5 - day) * .55})`; gr.fillRect(v.x0, 146, v.x1 - v.x0, v.y1 - 146); }
    if (storm) { gr.fillStyle = 'rgba(200,120,70,.32)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); gr.strokeStyle = 'rgba(255,200,150,.25)'; gr.lineWidth = 2; for (let i = 0; i < 70; i++) { const x = (i * 97 + t * 700) % 1600 - 160, y = (i * 53) % 720; gr.beginPath(); gr.moveTo(x, y); gr.lineTo(x - 70, y + 8); gr.stroke(); } }
    if (evt && evt.k === 'flare') { gr.fillStyle = `rgba(255,230,120,${.08 + Math.sin(t * 5) * .04})`; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
  }
  function drawUI(gr) {
    const v = K.view, t = K.t, r = rates();
    gr.fillStyle = lin(gr, 0, 0, 0, 86, ['rgba(12,6,22,.95)', 'rgba(20,10,30,.88)']); gr.fillRect(v.x0, v.y0, v.x1 - v.x0, 86 - v.y0); gr.fillStyle = 'rgba(255,138,74,.5)'; gr.fillRect(v.x0, 85, v.x1 - v.x0, 2);
    const res = [['POWER', `${Math.round(r.pw)}/${Math.round(r.use)}`, r.eff < 1 ? '#ff5a4a' : '#ffd23f', null, r.eff < .7], ['OXYGEN', S.o2, '#7cf2ff', r.o2, S.o2 < 25], ['FOOD', S.food, '#5fd36a', r.food, S.food < 25], ['WATER', S.water, '#4a9aff', r.water, S.water < 15], ['METAL', S.metal, '#e8d0b0', r.metal, false], ['SCIENCE', S.sci, '#ff8adf', r.sci, false], ['PEOPLE', `${S.pop}/${r.house}`, '#fff', null, false]];
    res.forEach(([n, val, c, rate, warn], i) => {
      const x = 66 + i * 152;
      if (warn) { gr.fillStyle = `rgba(255,60,60,${.2 + Math.sin(t * 8) * .15})`; rr(gr, x - 8, 6, 146, 74, 10, gr.fillStyle); }
      Tx(gr, n, x, 18, 13, c, 'left', true, null); Tx(gr, typeof val === 'number' ? String(Math.floor(val)) : val, x, 44, 24, '#fff', 'left', true);
      if (rate !== null) Tx(gr, `${rate >= 0 ? '+' : ''}${Math.round(rate * 10)}/sol`, x, 70, 14, rate < 0 ? '#ff7a6a' : '#9aff9a', 'left', false, null);
      else if (n === 'POWER') Tx(gr, r.eff < 1 ? `${Math.round(r.eff * 100)}% output` : 'all powered', x, 70, 14, r.eff < 1 ? '#ff7a6a' : '#9aff9a', 'left', false, null);
      if (typeof val === 'number' && n !== 'METAL' && n !== 'SCIENCE') { rr(gr, x + 72, 38, 60, 8, 4, 'rgba(255,255,255,.12)'); rr(gr, x + 72, 38, Math.max(6, 60 * Math.min(1, val / 200)), 8, 4, c); }
    });
    Tx(gr, `SOL ${S.sol}`, 1270, 22, 15, '#ffb38a', 'right', true, null); Tx(gr, `BEST ${S.best}`, 1270, 46, 13, '#ffb38a', 'right', false, null);
    const day = Math.cos((S.t / SOL) * 6.283) * .5 + .5; Tx(gr, day > .5 ? '☀ day' : '☾ night', 1270, 70, 13, '#ffd8b0', 'right', false, null);
    // build menu
    KEYS.concat(['remove']).forEach((k, i) => {
      const b = card(i), on = sel === k, info0 = B[k], lock = info0 && info0.need && !has(info0.need), can = !info0 || S.metal >= info0.cost;
      rr(gr, b.x, b.y, b.w, b.h, 10, on ? 'rgba(80,50,110,.95)' : 'rgba(22,12,32,.88)'); if (on) { gr.strokeStyle = '#ff8a4a'; gr.lineWidth = 3; rr(gr, b.x, b.y, b.w, b.h, 10); gr.stroke(); }
      if (k === 'remove') { Tx(gr, '✕ Bulldoze  (X)', b.x + b.w / 2, b.y + b.h / 2, 15, '#ff7a6a', 'center', true, null); return; }
      gr.save(); gr.beginPath(); gr.rect(b.x + 2, b.y + 1, 52, b.h - 2); gr.clip(); gr.translate(b.x + 28, b.y + b.h - 6); gr.scale(.5, .5); if (lock) gr.globalAlpha = .35; bld(gr, k, 0, 0, 1, t, false); gr.restore();
      Tx(gr, `${(i + 1) % 10} ${info0.n}`, b.x + 58, b.y + 14, 13, lock ? '#888' : '#fff', 'left', true, null);
      Tx(gr, lock ? 'research first' : `${info0.cost} metal`, b.x + 58, b.y + 32, 13, lock ? '#888' : can ? '#e8d0b0' : '#ff7a6a', 'left', false, null);
    });
    // research button
    const avail = RES.filter(x => !has(x.k) && (!x.req || has(x.req)) && S.sci >= x.c).length;
    rr(gr, RB.x, RB.y + 4, RB.w, RB.h - 4, 14, 'rgba(0,0,0,.4)'); rr(gr, RB.x, RB.y, RB.w, RB.h - 4, 14, lin(gr, 0, RB.y, 0, RB.y + RB.h, ['#7a3a9a', '#4a1a6a'])); Tx(gr, 'RESEARCH (R)', RB.x + RB.w / 2, RB.y + 30, 17, '#fff', 'center', true); Tx(gr, `${Math.floor(S.sci)} science · ${Object.keys(S.res).length}/${RES.length}`, RB.x + RB.w / 2, RB.y + 60, 13, '#ffc8f0', 'center', false, null);
    if (avail) { circ(gr, RB.x + RB.w - 10, RB.y + 6, 12, '#ff4a5a'); Tx(gr, String(avail), RB.x + RB.w - 10, RB.y + 6, 13, '#fff', 'center', true, null); }
    // mission
    const m = MIS[S.mis]; rr(gr, MB.x, MB.y, MB.w, MB.h, 14, 'rgba(14,8,24,.9)'); gr.strokeStyle = 'rgba(255,138,74,.6)'; gr.lineWidth = 2; rr(gr, MB.x, MB.y, MB.w, MB.h, 14); gr.stroke();
    if (m && !K.bot) { Tx(gr, `MISSION ${S.mis + 1}/${MIS.length}`, MB.x + 18, MB.y + 20, 13, '#ff8a4a', 'left', true, null); Tx(gr, m[0], MB.x + 18, MB.y + 46, 18, '#fff', 'left', true, null); const p = Math.min(1, m[1]() / m[2]); rr(gr, MB.x + 18, MB.y + 68, MB.w - 200, 10, 5, 'rgba(255,255,255,.12)'); rr(gr, MB.x + 18, MB.y + 68, Math.max(10, (MB.w - 200) * p), 10, 5, '#ff8a4a'); Tx(gr, `${Math.min(m[2], Math.floor(m[1]()))}/${m[2]}`, MB.x + MB.w - 172, MB.y + 73, 13, '#ffd8b0', 'left', false, null); Tx(gr, `+${m[3]} metal`, MB.x + MB.w - 18, MB.y + 20, 13, '#e8d0b0', 'right', false, null); if (m[4]) Tx(gr, `+${m[4]} science`, MB.x + MB.w - 18, MB.y + 40, 13, '#ff8adf', 'right', false, null); }
    else Tx(gr, K.bot ? `Colony of ${S.pop} on sol ${S.sol}` : 'Every mission complete! Keep growing.', MB.x + MB.w / 2, MB.y + MB.h / 2, 18, '#fff', 'center', true, null);
    // info / alerts
    rr(gr, IB.x, IB.y, IB.w, IB.h, 14, 'rgba(14,8,24,.9)');
    const alerts = []; if (S.o2 < 25 && r.o2 < 0) alerts.push('Oxygen running out! Build oxygen makers'); if (S.food < 25 && r.food < 0) alerts.push('Food running out! Build greenhouses'); if (S.water < 15 && r.water < 0) alerts.push('Water low! Build ice drills'); if (r.eff < 1) alerts.push(`Power short (${Math.round(r.eff * 100)}%): build solar or a reactor`); if (S.pop >= r.house && r.house) alerts.push('No free beds: build habitats');
    if (evtT < 9 && !evt && (nextK === 'storm' || nextK === 'meteor') && S.tut >= 3) alerts.unshift(`${nextK === 'storm' ? 'Dust storm' : 'Meteor shower'} in ${Math.ceil(evtT)}s!`);
    if (alerts.length) { gr.fillStyle = `rgba(255,60,60,${.18 + Math.sin(t * 6) * .1})`; rr(gr, IB.x, IB.y, IB.w, IB.h, 14, gr.fillStyle); Tx(gr, '⚠ WARNING', IB.x + 18, IB.y + 20, 14, '#ff7a6a', 'left', true, null); alerts.slice(0, 2).forEach((a, j) => Tx(gr, a, IB.x + 18, IB.y + 48 + j * 26, 14, '#fff', 'left', false, null)); }
    else if (sel === 'remove') { Tx(gr, 'BULLDOZER', IB.x + 18, IB.y + 22, 14, '#ff7a6a', 'left', true, null); Tx(gr, 'Tap a building to remove it', IB.x + 18, IB.y + 50, 14, '#fff', 'left', false, null); Tx(gr, 'You get half its metal back', IB.x + 18, IB.y + 74, 14, '#bbb', 'left', false, null); }
    else { const b = B[sel]; Tx(gr, b.n.toUpperCase(), IB.x + 18, IB.y + 22, 14, '#ff8a4a', 'left', true, null); const eff = [b.pw > 0 ? `+${b.pw} power` : `${b.pw} power`, b.o2 ? `+${b.o2} O₂` : '', b.food ? `+${b.food} food` : '', b.water > 0 ? `+${b.water} water` : b.water ? `${b.water} water` : '', b.house ? `+${b.house} beds` : '', b.metal ? `+${b.metal} metal` : '', b.sci ? `+${b.sci} science` : '', sel === 'shield' ? 'blocks meteors' : '', sel === 'port' ? 'more, bigger rockets' : ''].filter(Boolean).join('  ·  '); Tx(gr, eff, IB.x + 18, IB.y + 50, 14, '#fff', 'left', false, null); Tx(gr, `Cost ${b.cost} metal · tap a building to upgrade`, IB.x + 18, IB.y + 76, 13, '#bbb', 'left', false, null); }
    if (tipT > 0 && tip) { gr.font = fnt(18, true); const w = gr.measureText(tip).width + 40; rr(gr, 754 - w / 2, 560, w, 40, 20, 'rgba(0,0,0,.8)'); Tx(gr, tip, 754, 580, 18, '#ffd8b0', 'center', true, null); }
    if (info >= 0 && S.grid[info]) {
      const b = infoBox(), k = S.grid[info], lv = S.lv[info]; rr(gr, b.x, b.y + 5, b.w, b.h, 16, 'rgba(0,0,0,.4)'); rr(gr, b.x, b.y, b.w, b.h, 16, 'rgba(26,14,40,.97)'); gr.strokeStyle = '#7cf2ff'; gr.lineWidth = 2; rr(gr, b.x, b.y, b.w, b.h, 16); gr.stroke();
      Tx(gr, B[k].n, b.x + 16, b.y + 24, 18, '#fff', 'left', true, null); Tx(gr, `Level ${lv}/3`, b.x + b.w - 16, b.y + 24, 14, '#ffd23f', 'right', true, null);
      Tx(gr, lv < 3 ? `Next level: ${k === 'hab' ? 'more beds' : k === 'shield' ? 'bigger dome' : '+' + Math.round((LVM[lv + 1] / LVM[lv] - 1) * 100) + '% output'}` : 'Max level!', b.x + 16, b.y + 56, 14, '#bfe', 'left', false, null);
      Tx(gr, info === broke ? 'Broken: tap it to repair' : 'Working fine', b.x + 16, b.y + 82, 13, info === broke ? '#ff7a6a' : '#9aff9a', 'left', false, null);
      const ub = { x: b.x + 14, y: b.y + 112, w: 150, h: 48 }, db = { x: b.x + 174, y: b.y + 112, w: 112, h: 48 }, can = lv < 3 && S.metal >= upCost(info);
      rr(gr, ub.x, ub.y, ub.w, ub.h, 12, can ? '#2a8a5a' : '#3a3a4a'); Tx(gr, lv < 3 ? `UPGRADE ${upCost(info)}` : 'MAX', ub.x + ub.w / 2, ub.y + 24, 14, '#fff', 'center', true, null);
      rr(gr, db.x, db.y, db.w, db.h, 12, '#7a2a2a'); Tx(gr, 'REMOVE', db.x + db.w / 2, db.y + 24, 14, '#fff', 'center', true, null);
    }
    if (panel) drawResearch(gr);
    const bn = banners[0]; if (bn && bn.t > 0) { const k = bn.t < .25 ? bn.t / .25 : bn.t > 3 ? (3.4 - bn.t) / .4 : 1; gr.save(); gr.globalAlpha = Math.max(0, Math.min(1, k)); gr.font = fnt(24, true); const w = Math.max(gr.measureText(bn.s).width, (gr.font = fnt(15), gr.measureText(bn.sub).width)) + 60, y = 100 - (1 - Math.min(1, k)) * 20; rr(gr, 754 - w / 2, y, w, 66, 18, 'rgba(12,6,22,.92)'); gr.strokeStyle = bn.c; gr.lineWidth = 3; rr(gr, 754 - w / 2, y, w, 66, 18); gr.stroke(); Tx(gr, bn.s, 754, y + 24, 24, bn.c, 'center', true); Tx(gr, bn.sub, 754, y + 50, 15, '#fff', 'center', false, null); gr.restore(); }
    else if (evt && evt.d) { const c = { storm: '#e07a3a', meteor: '#ff5a3a', flare: '#ffd23f', comet: '#7cf2ff' }[evt.k], s = { storm: 'DUST STORM', meteor: 'METEOR SHOWER', flare: 'SOLAR FLARE', comet: 'ICE COMET' }[evt.k]; rr(gr, 654, 96, 200, 34, 17, 'rgba(12,6,22,.9)'); rr(gr, 664, 122, 180 * Math.max(0, evt.t / evt.d), 4, 2, c); Tx(gr, s, 754, 111, 14, c, 'center', true, null); }
    if (S.tut < 3 && !K.bot) drawTut(gr);
  }
  function drawResearch(gr) {
    const v = K.view, P = PANEL; gr.fillStyle = 'rgba(0,0,0,.55)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    rr(gr, P.x, P.y, P.w, P.h, 22, 'rgba(22,12,36,.98)'); gr.strokeStyle = '#ff8adf'; gr.lineWidth = 2; rr(gr, P.x, P.y, P.w, P.h, 22); gr.stroke();
    Tx(gr, 'RESEARCH', P.x + 30, P.y + 36, 26, '#ff8adf', 'left', true); Tx(gr, `${Math.floor(S.sci)} science  (labs make it)`, P.x + 250, P.y + 38, 15, '#fff', 'left', false, null);
    rr(gr, CLOSE.x, CLOSE.y, CLOSE.w, CLOSE.h, 12, '#7a2a4a'); Tx(gr, '✕', CLOSE.x + 25, CLOSE.y + 25, 22, '#fff', 'center', true, null);
    for (const r of RES) if (r.req) { const a = rNode(RES.find(x => x.k === r.req)), b = rNode(r); gr.strokeStyle = has(r.req) ? '#ff8adf' : 'rgba(255,255,255,.2)'; gr.lineWidth = 3; gr.beginPath(); gr.moveTo(a.x + a.w / 2, a.y + a.h); gr.lineTo(b.x + b.w / 2, b.y); gr.stroke(); }
    for (const r of RES) {
      const b = rNode(r), done = has(r.k), open = !r.req || has(r.req), can = open && !done && S.sci >= r.c;
      rr(gr, b.x, b.y, b.w, b.h, 14, done ? '#3a6a4a' : can ? '#5a2a7a' : open ? '#2e1e40' : '#1e1628'); if (can) { gr.strokeStyle = '#ff8adf'; gr.lineWidth = 2; rr(gr, b.x, b.y, b.w, b.h, 14); gr.stroke(); }
      Tx(gr, r.n, b.x + 14, b.y + 20, 15, open ? '#fff' : '#777', 'left', true, null); Tx(gr, r.d, b.x + 14, b.y + 44, 11, open ? '#ddd' : '#666', 'left', false, null);
      Tx(gr, done ? '✓ DONE' : `${r.c} science`, b.x + 14, b.y + 66, 13, done ? '#9aff9a' : can ? '#ff8adf' : '#999', 'left', true, null);
    }
  }
  function drawTut(gr) {
    const t = K.t, step = S.tut; let tx, ty;
    if (step === 0) { const v = K.view; gr.fillStyle = 'rgba(0,0,0,.5)'; gr.fillRect(v.x0, 88, v.x1 - v.x0, v.y1 - 88); rr(gr, 340, 230, 600, 230, 22, 'rgba(22,12,36,.97)'); gr.strokeStyle = '#ff8a4a'; gr.lineWidth = 2; rr(gr, 340, 230, 600, 230, 22); gr.stroke(); Tx(gr, 'WELCOME TO MARS', 640, 270, 26, '#ff8a4a', 'center', true); Tx(gr, 'Colonists need oxygen, food and water.', 640, 318, 17, '#fff', 'center', false, null); Tx(gr, 'Power (top left) runs every building.', 640, 346, 17, '#fff', 'center', false, null); Tx(gr, 'Build habitats and more colonists will fly in.', 640, 374, 17, '#fff', 'center', false, null); Tx(gr, 'Tap to start', 640, 424, 18, `rgba(255,216,176,${.6 + Math.sin(t * 4) * .4})`, 'center', true, null); return; }
    if (step === 1) { tx = 200; ty = 116; } else { const free = S.grid.findIndex((g, i) => !g && !S.rocks[i] && i % GX > 6 && i > GX * 2); [tx, ty] = tileXY(free < 0 ? 40 : free); ty -= 20; }
    const bob = Math.sin(t * 6) * 8; gr.save(); gr.translate(tx + 14, ty + 10 + bob); gr.rotate(-.5); gr.fillStyle = '#fff'; gr.strokeStyle = '#222'; gr.lineWidth = 3; gr.beginPath(); gr.moveTo(0, 0); gr.lineTo(-12, 22); gr.lineTo(-4, 20); gr.lineTo(-6, 38); gr.lineTo(6, 38); gr.lineTo(4, 20); gr.lineTo(12, 22); gr.closePath(); gr.fill(); gr.stroke(); gr.restore();
    const msg = TUT[step]; gr.font = fnt(17, true); const w = gr.measureText(msg).width + 36, bx = K.clamp(tx - w / 2 + 120, 250, 1270 - w); rr(gr, bx, ty + 56, w, 40, 20, 'rgba(0,0,0,.85)'); Tx(gr, msg, bx + w / 2, ty + 76, 17, '#fff', 'center', true, null);
  }
  GAME.draw = gr => { drawWorld(gr); drawUI(gr); };
  GAME._dbg = () => ({ S, ev: k => { nextK = k; evtT = 0; }, panel: p => { panel = p; } });
})();
