/* Tiny Aquarium: raise fish, collect the pearls grown fish make, breed pairs for rare colors, and fill the
   collection book. Decorations make fish happier (faster growth, more pearls). Progress is saved. */
const GAME = {
  id: 'tiny-aquarium', title: 'Tiny Aquarium', tagline: 'Raise fish, breed rare colors, build the dream tank.',
  font: 'Baloo 2', accent: '#4fd8ff', accent2: '#ffb3d1', bg: '#0b3a5a', noHud: true, scoreLabel: 'Fish discovered',
  how: ['Tap the water to drop food. Fed fish grow up.', 'Grown fish make pearls. Tap pearls to collect them.', 'Two grown fish of the same kind lay eggs. Some babies hatch in rare colors!'],
  skins: [
    { name: 'Lagoon', price: 0, c: ['#1d8fc7', '#0b3a5a'] }, { name: 'Reef', price: 60, c: ['#1fb5a8', '#0b4a4a'] }, { name: 'Deep', price: 150, c: ['#2a3a9a', '#0a0f2a'] },
    { name: 'Sunset', price: 250, c: ['#d2703a', '#3a1a4a'] }, { name: 'Glow', price: 400, c: ['#3a1a6a', '#05030f'] }, { name: 'Gold', price: 700, c: ['#c99a3a', '#3a2a0a'] },
  ],
};
(() => {
  const SP = [
    { n: 'Guppy', cost: 10, sz: 16, h: 30, val: 6, pearl: 1 }, { n: 'Clownfish', cost: 60, sz: 22, h: 24, val: 30, pearl: 3, stripes: true },
    { n: 'Angelfish', cost: 220, sz: 24, h: 50, val: 110, pearl: 8, tall: true }, { n: 'Pufferfish', cost: 700, sz: 26, h: 48, val: 340, pearl: 20, round: true },
    { n: 'Seahorse', cost: 2000, sz: 24, h: 40, val: 1000, pearl: 50, horse: true }, { n: 'Jellyfish', cost: 6000, sz: 28, h: 300, val: 3200, pearl: 140, jelly: true },
    { n: 'Koi', cost: 18000, sz: 34, h: 15, val: 9000, pearl: 380, long: true, spots: true }, { n: 'Golden Dragon', cost: 60000, sz: 40, h: 46, val: 30000, pearl: 1200, long: true, dragon: true },
  ];
  const VARIANTS = [0, 160, 280, 90, 210];  // hue shifts: the first is normal, the others are rare
  const VNAMES = ['Classic', 'Mint', 'Violet', 'Lime', 'Sky'];
  const DECOR = [{ n: 'Seaweed', cost: 40 }, { n: 'Coral', cost: 250 }, { n: 'Treasure chest', cost: 900 }, { n: 'Castle', cost: 3500 }, { n: 'Bubble volcano', cost: 12000 }, { n: 'Sunken ship', cost: 50000 }];
  const CAP = [6, 10, 16, 24, 32], CAP_COST = [0, 300, 2500, 20000, 150000];
  const T = { x0: 20, y0: 20, x1: 1260, y1: 600 };
  let S, fish, food, pearls, eggs, bubbles, panel, sel, saveT, hover, toastT;
  function fresh() { return { shells: 25, fish: [{ sp: 0, v: 0, age: .2, hunger: .3 }, { sp: 0, v: 0, age: .2, hunger: .3 }], decor: [], cap: 0, found: { '0-0': 1 } }; }
  function spawn(f) { return Object.assign({ x: K.rand(T.x0 + 80, T.x1 - 80), y: K.rand(T.y0 + 80, T.y1 - 120), vx: K.rand(-40, 40), vy: 0, dir: 1, bob: Math.random() * 6, layT: K.rand(20, 40), pT: K.rand(4, 10) }, f); }
  GAME.reset = () => {
    S = K.bot ? { shells: 5000, fish: [], decor: [0, 1, 2, 3], cap: 3, found: {} } : Object.assign(fresh(), K.save.aq || {});
    if (K.bot) for (let i = 0; i < 14; i++) S.fish.push({ sp: K.irand(0, 6), v: Math.random() < .2 ? K.irand(1, 4) : 0, age: K.rand(.3, 1), hunger: .3 });
    fish = S.fish.map(spawn); food = []; pearls = []; eggs = []; bubbles = []; panel = null; sel = null; saveT = 0; hover = null;
    // pearls made while away (half rate, up to 4 hours)
    if (!K.bot && K.save.aqT) { const secs = Math.min(4 * 3600, (Date.now() - K.save.aqT) / 1000), gain = Math.floor(fish.filter(f => f.age >= 1).reduce((a, f) => a + SP[f.sp].pearl, 0) * secs / 14 * .5 * happy()); if (gain > 0) { S.shells += gain; GAME._away = gain; } }
    K.score = Object.keys(S.found).length;
  };
  const happy = () => 1 + S.decor.length * .15;
  const cap = () => CAP[S.cap];
  function persist() { if (K.bot) return; S.fish = fish.map(f => ({ sp: f.sp, v: f.v, age: f.age, hunger: f.hunger })); K.save.aq = S; K.save.aqT = Date.now(); K.save.best = Math.max(K.save.best || 0, Object.keys(S.found).length); K.persist(); }
  function discover(sp, v) { const k = sp + '-' + v; if (S.found[k]) return; S.found[k] = 1; K.score = Object.keys(S.found).length; K.toast(v ? `Rare ${VNAMES[v]} ${SP[sp].n}!` : `New fish: ${SP[sp].n}!`); K.chime(523, [0, 4, 7, 12]); if (!K.bot) K.coin(v ? 5 : 2); }
  /* ---------- drawing a fish ---------- */
  function drawFish(gr, f, x, y, sc, dir, t) {
    const s = SP[f.sp], hue = (s.h + VARIANTS[f.v]) % 360, sz = s.sz * sc, wag = Math.sin(t * 8) * .3;
    const col = s.dragon && !f.v ? '#ffcc33' : `hsl(${hue},80%,58%)`, dark = s.dragon && !f.v ? '#c98a00' : `hsl(${hue},70%,40%)`;
    gr.save(); gr.translate(x, y); gr.scale(dir, 1);
    if (s.jelly) { gr.globalAlpha = .85; gr.fillStyle = `hsla(${hue},80%,70%,.8)`; gr.beginPath(); gr.arc(0, 0, sz, Math.PI, 0); gr.quadraticCurveTo(0, sz * .3, -sz, 0); gr.fill(); gr.strokeStyle = `hsla(${hue},80%,75%,.7)`; gr.lineWidth = 2; for (let i = -2; i <= 2; i++) { gr.beginPath(); gr.moveTo(i * sz * .35, 2); gr.quadraticCurveTo(i * sz * .35 + Math.sin(t * 3 + i) * 8, sz, i * sz * .3, sz * 1.8); gr.stroke(); } gr.globalAlpha = 1; gr.restore(); return; }
    if (s.horse) { gr.fillStyle = col; gr.beginPath(); gr.ellipse(0, -sz * .4, sz * .45, sz * .6, .2, 0, 7); gr.fill(); gr.beginPath(); gr.ellipse(sz * .35, -sz * 1, sz * .4, sz * .25, -.3, 0, 7); gr.fill(); gr.strokeStyle = col; gr.lineWidth = sz * .3; gr.beginPath(); gr.moveTo(-sz * .1, 0); gr.quadraticCurveTo(-sz * .2, sz * .9, sz * .3, sz * .8); gr.stroke(); gr.fillStyle = '#111'; gr.beginPath(); gr.arc(sz * .4, -sz * 1.05, 2.5, 0, 7); gr.fill(); gr.restore(); return; }
    // tail
    gr.fillStyle = dark; gr.beginPath(); gr.moveTo(-sz * (s.long ? 1.3 : .8), 0); gr.lineTo(-sz * (s.long ? 1.9 : 1.4), -sz * (.5 + wag)); gr.lineTo(-sz * (s.long ? 1.9 : 1.4), sz * (.5 - wag)); gr.fill();
    if (s.tall) { gr.beginPath(); gr.moveTo(-sz * .2, -sz * .3); gr.lineTo(sz * .1, -sz * 1.4); gr.lineTo(sz * .4, -sz * .3); gr.fill(); gr.beginPath(); gr.moveTo(-sz * .2, sz * .3); gr.lineTo(sz * .1, sz * 1.4); gr.lineTo(sz * .4, sz * .3); gr.fill(); }
    if (s.dragon) { for (let i = 0; i < 4; i++) { gr.beginPath(); gr.moveTo(-sz * .9 + i * sz * .5, -sz * .35); gr.lineTo(-sz * .7 + i * sz * .5, -sz * .9 - wag * 10); gr.lineTo(-sz * .5 + i * sz * .5, -sz * .35); gr.fill(); } }
    // body
    gr.fillStyle = col; gr.beginPath(); gr.ellipse(0, 0, sz * (s.long ? 1.4 : s.round ? .9 : 1), sz * (s.round ? .85 : s.tall ? .7 : .55), 0, 0, 7); gr.fill();
    if (s.round) { gr.strokeStyle = dark; gr.lineWidth = 2; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; gr.beginPath(); gr.moveTo(Math.cos(a) * sz * .85, Math.sin(a) * sz * .8); gr.lineTo(Math.cos(a) * sz * 1.05, Math.sin(a) * sz); gr.stroke(); } }
    if (s.stripes) { gr.fillStyle = '#fff'; for (const sx of [-.45, .15]) { gr.beginPath(); gr.ellipse(sz * sx, 0, sz * .12, sz * .5, 0, 0, 7); gr.fill(); } }
    if (s.spots) { gr.fillStyle = f.v ? '#fff' : '#d23a2a'; for (const [sx, sy, r] of [[-.5, -.15, .22], [.1, .12, .18], [.55, -.18, .14]]) { gr.beginPath(); gr.arc(sz * sx, sz * sy, sz * r, 0, 7); gr.fill(); } }
    gr.fillStyle = 'rgba(255,255,255,.3)'; gr.beginPath(); gr.ellipse(sz * .1, -sz * .22, sz * .45, sz * .12, 0, 0, 7); gr.fill();
    gr.fillStyle = '#fff'; gr.beginPath(); gr.arc(sz * (s.long ? .95 : .55), -sz * .12, sz * .17, 0, 7); gr.fill(); gr.fillStyle = '#111'; gr.beginPath(); gr.arc(sz * (s.long ? 1 : .6), -sz * .12, sz * .09, 0, 7); gr.fill();
    if (f.v) { gr.fillStyle = 'rgba(255,255,255,.8)'; gr.beginPath(); gr.arc(-sz * .3 + Math.sin(t * 2) * 4, -sz * .7, 2.5, 0, 7); gr.fill(); }
    gr.restore();
  }
  GAME.drawSkin = (gr, s) => { gr.fillStyle = s.c[0]; gr.fillRect(-44, -36, 88, 72); gr.fillStyle = s.c[1]; gr.fillRect(-44, 20, 88, 16); drawFish(gr, { sp: 1, v: 0 }, 0, 0, 1.2, 1, 0); };
  /* ---------- input ---------- */
  const BTN = [{ k: 'shop', t: 'Fish shop', x: 20 }, { k: 'decor', t: 'Decorate', x: 270 }, { k: 'book', t: 'Collection', x: 520 }, { k: 'tank', t: 'Bigger tank', x: 770 }].map(b => ({ ...b, y: 620, w: 236, h: 84 }));
  const inB = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  const PANEL = { x: 240, y: 70, w: 800, h: 500 };
  const pItem = i => ({ x: PANEL.x + 30 + (i % 4) * 188, y: PANEL.y + 80 + Math.floor(i / 4) * 200, w: 176, h: 186 });
  GAME.down = (x, y) => {
    if (GAME._away) { GAME._away = 0; return; }
    if (panel) {
      if (!inB(PANEL, x, y)) { panel = null; return; }
      if (panel === 'shop') SP.forEach((s, i) => { if (inB(pItem(i), x, y)) buyFish(i); });
      if (panel === 'decor') DECOR.forEach((d, i) => { if (inB(pItem(i), x, y)) buyDecor(i); });
      return;
    }
    if (sel) { const b = { x: sel.x - 90, y: sel.y - 150, w: 180, h: 44 }; if (inB(b, x, y) && sel.age >= 1) { sell(sel); return; } sel = null; }
    for (const b of BTN) if (inB(b, x, y)) { if (b.k === 'tank') upgrade(); else panel = b.k; K.sfx(600, .05, 'triangle', .05); return; }
    if (y > T.y1) return;
    for (const p of pearls) if (K.dist(x, y, p.x, p.y) < 34) { collect(p); return; }
    for (const e of eggs) if (K.dist(x, y, e.x, e.y) < 30) return;
    const f = fish.find(f => K.dist(x, y, f.x, f.y) < SP[f.sp].sz * (.5 + .5 * f.age) * 1.3); if (f) { sel = f; return; }
    for (let i = 0; i < 3; i++) food.push({ x: x + K.rand(-20, 20), y: Math.max(T.y0 + 10, y - 40), vy: K.rand(30, 50) }); K.sfx(900, .03, 'sine', .04);
  };
  GAME.move = (x, y) => { hover = null; for (const b of BTN) if (inB(b, x, y)) hover = b.k; for (const p of pearls) if (K.dist(x, y, p.x, p.y) < 34) collect(p); };
  GAME.key = (c, d) => { if (d && c === 'Escape') panel = null; };
  function collect(p) { pearls.splice(pearls.indexOf(p), 1); S.shells += p.v; K.pop(p.x, p.y - 20, '+' + p.v, '#fff1a8', 26); K.sfx(1400, .06, 'sine', .05); }
  function buyFish(i) { const s = SP[i]; if (S.shells < s.cost) return K.sfx(160, .1, 'square', .05); if (fish.length + eggs.length >= cap()) { K.toast('Tank full! Get a bigger tank.'); return; } S.shells -= s.cost; fish.push(spawn({ sp: i, v: 0, age: .05, hunger: .5, y: T.y0 + 30 })); discover(i, 0); K.chime(660, [0, 7]); persist(); }
  function buyDecor(i) { if (S.decor.includes(i)) return; const d = DECOR[i]; if (S.shells < d.cost) return K.sfx(160, .1, 'square', .05); S.shells -= d.cost; S.decor.push(i); K.chime(523, [0, 4, 7]); K.toast(`${d.n} added: fish are happier!`); if (!K.bot) K.coin(1); persist(); }
  function upgrade() { const n = S.cap + 1; if (n >= CAP.length) return K.toast('This is the biggest tank!'); if (S.shells < CAP_COST[n]) { K.toast(`Bigger tank: ${CAP_COST[n]} pearls`); return; } S.shells -= CAP_COST[n]; S.cap = n; K.chime(392, [0, 4, 7, 12]); K.toast(`Tank upgraded: room for ${CAP[n]} fish`); persist(); }
  function sell(f) { const v = Math.round(SP[f.sp].val * (f.v ? 4 : 1)); S.shells += v; fish.splice(fish.indexOf(f), 1); sel = null; K.pop(f.x, f.y, '+' + v, '#fff1a8', 32); K.sfx(1200, .1, 'triangle', .07); persist(); }
  let botT = 0;
  GAME.bot = dt => { botT += dt; if (botT > 1.2) { botT = 0; GAME.down(K.rand(200, 1000), K.rand(100, 300)); } if (pearls.length > 4) collect(pearls[0]); };
  /* ---------- update ---------- */
  GAME.update = dt => {
    const t = K.t, hp = happy();
    for (const p of food) { p.y += p.vy * dt; p.x += Math.sin(t * 2 + p.y * .05) * 10 * dt; } food = food.filter(p => p.y < T.y1 - 20 && !p.eaten);
    for (const f of fish) {
      const s = SP[f.sp], R = s.sz * (.5 + .5 * f.age);
      f.hunger = Math.min(1, f.hunger + dt / 70);
      let target = null; if (f.hunger > .25) { let bd = 1e9; for (const p of food) { const d = K.dist(f.x, f.y, p.x, p.y); if (d < bd) { bd = d; target = p; } } }
      if (target) { const dx = target.x - f.x, dy = target.y - f.y, d = Math.hypot(dx, dy) || 1; f.vx += dx / d * 260 * dt; f.vy += dy / d * 260 * dt; if (d < R + 6) { target.eaten = true; f.hunger = Math.max(0, f.hunger - .35); if (f.age < 1) f.age = Math.min(1, f.age + .1 * hp); if (f.age >= 1 && !f.grown) { f.grown = true; } } }
      else { f.vx += Math.sin(t * .5 + f.bob) * 20 * dt; f.vy += Math.sin(t * .7 + f.bob * 2) * 14 * dt; }
      const sp = Math.hypot(f.vx, f.vy), max = s.jelly ? 40 : target ? 150 : 60; if (sp > max) { f.vx *= max / sp; f.vy *= max / sp; }
      if (s.jelly) f.vy += Math.sin(t * 1.5 + f.bob) * 30 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.x < T.x0 + 40) f.vx = Math.abs(f.vx) + 10; if (f.x > T.x1 - 40) f.vx = -Math.abs(f.vx) - 10; if (f.y < T.y0 + 30) f.vy = Math.abs(f.vy) + 5; if (f.y > T.y1 - 60) f.vy = -Math.abs(f.vy) - 5;
      if (Math.abs(f.vx) > 4) f.dir = Math.sign(f.vx);
      // grown, fed fish make pearls
      if (f.age >= 1 && f.hunger < .85) { f.pT -= dt * hp; if (f.pT <= 0) { f.pT = K.rand(10, 18); if (pearls.length < 30) pearls.push({ x: f.x, y: f.y, v: Math.round(s.pearl * (f.v ? 3 : 1) * hp), vy: 40 }); } }
      // two grown fish of a kind lay an egg
      f.layT -= dt; if (f.layT <= 0) { f.layT = K.rand(35, 60); if (f.age >= 1 && f.hunger < .6 && fish.length + eggs.length < cap() && fish.some(o => o !== f && o.sp === f.sp && o.age >= 1)) { eggs.push({ sp: f.sp, x: f.x, y: T.y1 - 40, t: 12, v: Math.random() < .1 ? K.irand(1, 4) : f.v && Math.random() < .5 ? f.v : 0 }); K.sfx(700, .2, 'sine', .06, 200); } }
    }
    for (const p of pearls) { if (p.y < T.y1 - 30) p.y += p.vy * dt; }
    for (let i = eggs.length - 1; i >= 0; i--) { const e = eggs[i]; e.t -= dt * hp; if (e.t <= 0) { eggs.splice(i, 1); const nf = spawn({ sp: e.sp, v: e.v, age: .05, hunger: .4, x: e.x, y: e.y - 20 }); fish.push(nf); discover(e.sp, e.v); K.burst(e.x, e.y, ['#fff', '#ffe36e'], 12, 160, { gravity: 0, life: .5 }); } }
    if (Math.random() < dt * 6) bubbles.push({ x: K.rand(T.x0, T.x1), y: T.y1, r: K.rand(2, 6), v: K.rand(40, 90) }); for (const b of bubbles) { b.y -= b.v * dt; b.x += Math.sin(t * 3 + b.y * .05) * 12 * dt; } bubbles = bubbles.filter(b => b.y > T.y0);
    if (S.decor.includes(4) && Math.random() < dt * 8) bubbles.push({ x: 980 + K.rand(-10, 10), y: T.y1 - 90, r: K.rand(3, 8), v: K.rand(90, 160) });
    saveT += dt; if (saveT > 6) { saveT = 0; persist(); }
  };
  /* ---------- draw ---------- */
  function decor(gr, i) {
    const by = T.y1 - 20;
    if (i === 0) for (let k = 0; k < 5; k++) { gr.strokeStyle = `hsl(${120 + k * 8},55%,${35 + k * 4}%)`; gr.lineWidth = 9; gr.lineCap = 'round'; gr.beginPath(); gr.moveTo(110 + k * 22, by); for (let j = 1; j <= 6; j++) gr.lineTo(110 + k * 22 + Math.sin(K.t * 1.5 + j + k) * 12, by - j * 30); gr.stroke(); }
    if (i === 1) { gr.fillStyle = '#ff7a8a'; for (const [x, h] of [[300, 90], [330, 130], [360, 80]]) { gr.beginPath(); gr.roundRect(x, by - h, 22, h, 11); gr.fill(); gr.beginPath(); gr.arc(x + 11, by - h, 16, 0, 7); gr.fill(); } }
    if (i === 2) { gr.fillStyle = '#8a5a2b'; gr.fillRect(560, by - 50, 90, 50); gr.fillStyle = '#6a3a1a'; gr.beginPath(); gr.ellipse(605, by - 50, 45, 18, 0, Math.PI, 0); gr.fill(); gr.fillStyle = '#ffd23f'; gr.fillRect(598, by - 40, 14, 14); }
    if (i === 3) { gr.fillStyle = '#9a9ab0'; gr.fillRect(720, by - 150, 140, 150); for (let k = 0; k < 4; k++) gr.fillRect(720 + k * 40, by - 172, 22, 24); gr.fillStyle = '#2a2a3a'; gr.beginPath(); gr.roundRect(770, by - 60, 40, 60, 20); gr.fill(); gr.fillRect(745, by - 120, 18, 26); gr.fillRect(818, by - 120, 18, 26); }
    if (i === 4) { gr.fillStyle = '#6a4a3a'; gr.beginPath(); gr.moveTo(920, by); gr.lineTo(965, by - 90); gr.lineTo(995, by - 90); gr.lineTo(1040, by); gr.fill(); gr.fillStyle = '#ff6a3a'; gr.fillRect(966, by - 94, 28, 8); }
    if (i === 5) { gr.save(); gr.translate(1150, by - 30); gr.rotate(-.2); gr.fillStyle = '#5a3a1a'; gr.beginPath(); gr.moveTo(-100, 0); gr.lineTo(100, 0); gr.lineTo(80, 50); gr.lineTo(-80, 50); gr.fill(); gr.fillRect(-6, -110, 10, 110); gr.fillStyle = 'rgba(220,210,190,.6)'; gr.beginPath(); gr.moveTo(4, -100); gr.lineTo(60, -50); gr.lineTo(4, -30); gr.fill(); gr.restore(); }
  }
  GAME.draw = gr => {
    const v = K.view, sk = K.skin, t = K.t;
    gr.fillStyle = '#1a1410'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const wg = gr.createLinearGradient(0, T.y0, 0, T.y1); wg.addColorStop(0, sk.c[0]); wg.addColorStop(1, sk.c[1]); gr.fillStyle = wg; gr.fillRect(T.x0, T.y0, T.x1 - T.x0, T.y1 - T.y0);
    gr.save(); gr.beginPath(); gr.rect(T.x0, T.y0, T.x1 - T.x0, T.y1 - T.y0); gr.clip();
    gr.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 6; i++) { const x = 100 + i * 220 + Math.sin(t * .4 + i) * 40; gr.beginPath(); gr.moveTo(x, T.y0); gr.lineTo(x + 60, T.y0); gr.lineTo(x - 80, T.y1); gr.lineTo(x - 160, T.y1); gr.fill(); }
    gr.fillStyle = '#d8c08a'; gr.beginPath(); gr.moveTo(T.x0, T.y1 - 26); for (let x = T.x0; x <= T.x1; x += 40) gr.lineTo(x, T.y1 - 26 + Math.sin(x * .02) * 8); gr.lineTo(T.x1, T.y1); gr.lineTo(T.x0, T.y1); gr.fill();
    for (const i of S.decor) decor(gr, i);
    for (const e of eggs) { gr.fillStyle = e.v ? `hsl(${(SP[e.sp].h + VARIANTS[e.v]) % 360},80%,75%)` : '#fff6e0'; gr.beginPath(); gr.ellipse(e.x, e.y + Math.sin(t * 6) * 2, 12, 15, 0, 0, 7); gr.fill(); }
    for (const p of food) { gr.fillStyle = '#c98a4a'; gr.beginPath(); gr.arc(p.x, p.y, 4, 0, 7); gr.fill(); }
    for (const f of fish) { drawFish(gr, f, f.x, f.y, .5 + .5 * f.age, f.dir || 1, t + f.bob); if (f.hunger > .85) { gr.fillStyle = '#fff'; gr.font = '18px "Baloo 2"'; gr.textAlign = 'center'; gr.fillText('…', f.x, f.y - 26); } }
    for (const p of pearls) { const pg = gr.createRadialGradient(p.x - 4, p.y - 4, 2, p.x, p.y, 14); pg.addColorStop(0, '#fff'); pg.addColorStop(1, '#e8d8ff'); gr.fillStyle = pg; gr.beginPath(); gr.arc(p.x, p.y, 12, 0, 7); gr.fill(); }
    gr.strokeStyle = 'rgba(255,255,255,.5)'; gr.lineWidth = 1.5; for (const b of bubbles) { gr.beginPath(); gr.arc(b.x, b.y, b.r, 0, 7); gr.stroke(); }
    gr.restore();
    gr.strokeStyle = '#2a2a2a'; gr.lineWidth = 10; gr.strokeRect(T.x0, T.y0, T.x1 - T.x0, T.y1 - T.y0);
    // header
    gr.fillStyle = 'rgba(0,0,0,.35)'; gr.beginPath(); gr.roundRect(T.x0 + 60, T.y0 + 10, 520, 44, 22); gr.fill();
    gr.fillStyle = '#fff'; gr.font = '26px "Baloo 2", sans-serif'; gr.textAlign = 'left'; gr.textBaseline = 'middle'; gr.fillText(`⚪ ${S.shells} pearls   🐟 ${fish.length}/${cap()}   📖 ${Object.keys(S.found).length}/${SP.length * VARIANTS.length}`, T.x0 + 80, T.y0 + 33);
    // selected fish card
    if (sel && fish.includes(sel)) { const s = SP[sel.sp]; gr.fillStyle = 'rgba(0,0,0,.75)'; gr.beginPath(); gr.roundRect(sel.x - 110, sel.y - 210, 220, 110, 14); gr.fill(); gr.fillStyle = '#fff'; gr.font = '20px "Baloo 2"'; gr.textAlign = 'center'; gr.fillText(`${sel.v ? VNAMES[sel.v] + ' ' : ''}${s.n}`, sel.x, sel.y - 186); gr.font = '15px "Baloo 2"'; gr.fillText(sel.age >= 1 ? 'Grown up' : `Growing: ${Math.round(sel.age * 100)}%`, sel.x, sel.y - 164); gr.fillStyle = sel.age >= 1 ? '#5fd36a' : '#555'; gr.beginPath(); gr.roundRect(sel.x - 90, sel.y - 150, 180, 44, 10); gr.fill(); gr.fillStyle = '#fff'; gr.fillText(sel.age >= 1 ? `Sell for ${Math.round(s.val * (sel.v ? 4 : 1))}` : 'Too young to sell', sel.x, sel.y - 128); }
    // buttons
    for (const b of BTN) { gr.fillStyle = hover === b.k ? '#2a7aaa' : '#1d5a80'; gr.beginPath(); gr.roundRect(b.x, b.y, b.w, b.h, 16); gr.fill(); gr.fillStyle = '#fff'; gr.font = '26px "Baloo 2", sans-serif'; gr.textAlign = 'center'; gr.fillText(b.t, b.x + b.w / 2, b.y + 34); gr.font = '16px "Baloo 2"'; gr.fillStyle = 'rgba(255,255,255,.7)'; gr.fillText(b.k === 'tank' ? (S.cap + 1 < CAP.length ? `${CAP_COST[S.cap + 1]} pearls · ${CAP[S.cap + 1]} fish` : 'Biggest tank') : b.k === 'decor' ? `${S.decor.length}/${DECOR.length} · +${Math.round((happy() - 1) * 100)}% happy` : b.k === 'book' ? `${Object.keys(S.found).length} found` : 'Buy eggs', b.x + b.w / 2, b.y + 62); }
    gr.fillStyle = 'rgba(255,255,255,.6)'; gr.font = '18px "Baloo 2"'; gr.textAlign = 'left'; gr.fillText('Tap the water to feed.', 1030, 650); gr.fillText('Tap a fish to see it.', 1030, 678);
    // panels
    if (panel) {
      gr.fillStyle = 'rgba(0,0,0,.5)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
      gr.fillStyle = '#f4f8ff'; gr.beginPath(); gr.roundRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 24); gr.fill();
      gr.fillStyle = '#1d5a80'; gr.font = '34px "Baloo 2", sans-serif'; gr.textAlign = 'center'; gr.fillText(panel === 'shop' ? 'Fish shop' : panel === 'decor' ? 'Decorations' : 'Collection book', 640, PANEL.y + 44);
      if (panel === 'shop') SP.forEach((s, i) => { const b = pItem(i), can = S.shells >= s.cost; gr.fillStyle = can ? '#dff3ff' : '#e6e6ea'; gr.beginPath(); gr.roundRect(b.x, b.y, b.w, b.h, 16); gr.fill(); drawFish(gr, { sp: i, v: 0 }, b.x + b.w / 2, b.y + 70, 1.3, 1, t); gr.fillStyle = '#1d3a50'; gr.font = '20px "Baloo 2"'; gr.fillText(s.n, b.x + b.w / 2, b.y + 132); gr.fillStyle = can ? '#2a8a3a' : '#9a3a3a'; gr.fillText(`${s.cost} pearls`, b.x + b.w / 2, b.y + 160); });
      if (panel === 'decor') DECOR.forEach((d, i) => { const b = pItem(i), own = S.decor.includes(i), can = S.shells >= d.cost; gr.fillStyle = own ? '#d8ffd8' : can ? '#dff3ff' : '#e6e6ea'; gr.beginPath(); gr.roundRect(b.x, b.y, b.w, b.h, 16); gr.fill(); gr.fillStyle = '#1d3a50'; gr.font = '22px "Baloo 2"'; gr.fillText(d.n, b.x + b.w / 2, b.y + 70); gr.fillStyle = own ? '#2a8a3a' : can ? '#1d5a80' : '#9a3a3a'; gr.fillText(own ? 'In your tank' : `${d.cost} pearls`, b.x + b.w / 2, b.y + 110); gr.font = '15px "Baloo 2"'; gr.fillStyle = '#5a6a7a'; gr.fillText('+15% happiness', b.x + b.w / 2, b.y + 140); });
      if (panel === 'book') { SP.forEach((s, i) => VARIANTS.forEach((_, vi) => { const x = PANEL.x + 70 + vi * 150, y = PANEL.y + 100 + i * 50, got = S.found[i + '-' + vi]; if (got) drawFish(gr, { sp: i, v: vi }, x + 30, y + 6, .8, 1, t); else { gr.fillStyle = '#c8d0da'; gr.font = '24px "Baloo 2"'; gr.fillText('?', x + 30, y + 10); } })); gr.font = '15px "Baloo 2"'; gr.fillStyle = '#5a6a7a'; gr.fillText('Rare colors only come from eggs laid in your tank.', 640, PANEL.y + PANEL.h - 14); }
    }
    if (GAME._away) { gr.fillStyle = 'rgba(0,0,0,.55)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); gr.fillStyle = '#fff'; gr.beginPath(); gr.roundRect(420, 240, 440, 200, 24); gr.fill(); gr.fillStyle = '#1d5a80'; gr.font = '34px "Baloo 2"'; gr.textAlign = 'center'; gr.fillText('Welcome back!', 640, 296); gr.font = '24px "Baloo 2"'; gr.fillText(`Your fish made ${GAME._away} pearls`, 640, 346); gr.fillStyle = '#777'; gr.font = '18px "Baloo 2"'; gr.fillText('Tap to collect', 640, 396); }
  };
})();
