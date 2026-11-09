/* Cloudwash: a pressure-washing business. Take jobs from the board, from a garden gnome on a mossy patio up to whole
   houses and a mansion, and blast every bit of grime off. Grime comes in kinds: dust and mud come off with anything,
   moss and rust need a tighter, stronger jet, and graffiti needs soap first. Each job lists its parts (roof, walls,
   windows...) and ticks them off as they come clean. Get paid, buy better nozzles and washers, hire help, and grow
   the business. */
const GAME = {
  id: 'cloudwash', title: 'Cloudwash', tagline: 'Blast the grime. Grow the business.',
  font: 'Fredoka One', accent: '#5ad8ff', accent2: '#ffd23f', bg: '#0e2238', noHud: true, noSkins: true, scoreLabel: 'Earnings ($)',
  how: [
    'Pick a job from the board. Hold to spray (mouse, finger, or Space while you aim). The jet cleans where it hits.',
    'Nozzles (keys 1-6): wide ones are gentle and cover lots; narrow ones are strong. Tough grime (moss, rust) needs a strong jet.',
    'Graffiti and the worst stains need SOAP first: soap them, then rinse with any nozzle. Each part ticks off when it is clean.',
    'Finish at 95% or more to get paid (100% and fast pays a bonus). Buy better washers, nozzles and help between jobs.',
  ],
  skins: [{ name: 'Classic', price: 0 }],
};
(() => {
  'use strict';
  const TAU = Math.PI * 2, cl = (v, a, b) => v < a ? a : v > b ? b : v, lp = (a, b, k) => a + (b - a) * k, R = Math.random;
  const money = v => '$' + Math.round(v).toLocaleString('en-US');
  const SX = 40, SY = 104, SW = 1200, SH = 500, CELL = 5, GW = SW / CELL, GH = SH / CELL;   // the work area and its grime grid
  const DIRT = { dust: { h: .15, c: [150, 130, 100], a: .55, n: 'dust' }, mud: { h: .4, c: [110, 80, 50], a: .85, n: 'mud' }, grime: { h: .6, c: [70, 66, 60], a: .8, n: 'grime' }, oil: { h: 1, c: [40, 36, 40], a: .85, n: 'oil' }, moss: { h: 1.15, c: [70, 110, 40], a: .9, n: 'moss' }, rust: { h: 1.7, c: [150, 70, 30], a: .85, n: 'rust' }, paint: { h: 3.2, c: [220, 60, 160], a: .95, n: 'graffiti' } };
  const NOZ = [
    { k: 'n40', n: '40° FAN', p: .7, r: 46, col: '#ffffff', cost: 0 },
    { k: 'n25', n: '25° FAN', p: 1.1, r: 33, col: '#5cf28a', cost: 0 },
    { k: 'n15', n: '15° JET', p: 1.6, r: 23, col: '#ffd23f', cost: 250 },
    { k: 'turbo', n: 'TURBO', p: 2.3, r: 27, col: '#ff7a3a', cost: 1500 },
    { k: 'n0', n: '0° NEEDLE', p: 3.2, r: 11, col: '#ff4d6d', cost: 700 },
    { k: 'soap', n: 'SOAP', p: 0, r: 52, col: '#c88aff', cost: 400, soap: true },
  ];
  const PSI = [{ n: 'Starter washer', m: 1, cost: 0 }, { n: 'Pro washer', m: 1.3, cost: 1200 }, { n: 'Industrial washer', m: 1.65, cost: 6000 }, { n: 'Hydro-blaster 9000', m: 2.1, cost: 20000 }];
  const BIZ = [
    { k: 'helper', n: 'Hire an assistant', max: 2, cost: [2500, 12000], d: 'Cleans on his own while you work' },
    { k: 'ads', n: 'Marketing', max: 3, cost: [800, 4000, 15000], d: 'Clients pay 15% more' },
    { k: 'tank', n: 'Bigger pump', max: 2, cost: [1500, 9000], d: 'Every nozzle covers more' },
  ];
  /* ---------- the jobs: the clean picture, the parts, and what grime is on each ---------- */
  // each part: [name, x, y, w, h, dirt, coverage]; drawn by the job's art function in work-area coordinates (0..1200 x 0..500)
  const JOBS = [
    { n: 'Garden Gnome & Patio', pay: 120, par: 45, rep: 0, art: 'patio', parts: [['Patio', 140, 300, 920, 190, 'mud', .9], ['Gnome', 520, 120, 160, 190, 'dust', .95]] },
    { n: 'Driveway', pay: 260, par: 60, rep: 1, art: 'drive', parts: [['Driveway', 60, 180, 1080, 300, 'grime', 1], ['Oil stains', 380, 300, 400, 120, 'oil', .7], ['Kerb', 60, 440, 1080, 40, 'mud', 1]] },
    { n: 'Picket Fence', pay: 380, par: 60, rep: 2, art: 'fence', parts: [['Fence', 40, 120, 1120, 330, 'grime', .95], ['Gate', 520, 110, 160, 350, 'moss', .9]] },
    { n: 'Backyard Deck', pay: 600, par: 75, rep: 3, art: 'deck', parts: [['Deck', 80, 250, 1040, 200, 'moss', .95], ['Steps', 420, 420, 360, 80, 'mud', 1], ['Railings', 80, 120, 1040, 130, 'grime', .8]] },
    { n: 'Family Car', pay: 750, par: 70, rep: 4, art: 'car', parts: [['Body', 150, 170, 900, 230, 'mud', 1], ['Windows', 330, 110, 520, 100, 'dust', .9], ['Wheels', 230, 340, 740, 140, 'grime', .8]] },
    { n: 'Skate Park Ramp', pay: 1300, par: 90, rep: 5, art: 'skate', parts: [['Ramp', 60, 150, 1080, 330, 'grime', .95], ['Graffiti', 330, 220, 540, 170, 'paint', .8]] },
    { n: 'Playground', pay: 1600, par: 90, rep: 6, art: 'play', parts: [['Slide', 120, 110, 420, 360, 'moss', .9], ['Swings', 640, 90, 480, 380, 'rust', .7], ['Ground', 40, 440, 1120, 60, 'mud', 1]] },
    { n: 'Food Truck', pay: 2400, par: 95, rep: 7, art: 'truck', parts: [['Truck', 100, 120, 1000, 300, 'grime', 1], ['Serving hatch', 420, 160, 360, 120, 'oil', .8], ['Wheels', 220, 360, 760, 120, 'mud', .9]] },
    { n: 'Bungalow', pay: 4200, par: 130, rep: 8, art: 'bungalow', parts: [['Roof', 120, 60, 960, 160, 'moss', .95], ['Walls', 160, 210, 880, 270, 'grime', .9], ['Windows', 230, 260, 740, 110, 'dust', .9], ['Garage door', 760, 300, 250, 180, 'rust', .7], ['Graffiti', 220, 380, 260, 90, 'paint', .8]] },
    { n: 'Town Fountain', pay: 5600, par: 120, rep: 10, art: 'fountain', parts: [['Statue', 500, 40, 200, 280, 'moss', .95], ['Basin', 220, 300, 760, 180, 'rust', .7], ['Plaza', 40, 450, 1120, 50, 'grime', 1]] },
    { n: 'Two-Story House', pay: 9000, par: 170, rep: 12, art: 'house2', parts: [['Roof', 220, 20, 760, 120, 'moss', .95], ['Upstairs', 240, 130, 720, 160, 'grime', .9], ['Downstairs', 240, 290, 720, 190, 'grime', .9], ['Windows', 300, 160, 600, 220, 'dust', .7], ['Porch', 470, 360, 260, 120, 'rust', .8], ['Graffiti', 760, 400, 180, 70, 'paint', .8]] },
    { n: 'Hilltop Mansion', pay: 18000, par: 220, rep: 14, art: 'mansion', parts: [['Roofs', 60, 20, 1080, 140, 'moss', .95], ['Facade', 80, 140, 1040, 340, 'grime', .95], ['Columns', 420, 150, 360, 330, 'rust', .7], ['Windows', 120, 180, 960, 200, 'dust', .7], ['Graffiti', 120, 400, 220, 70, 'paint', .8], ['Fountain', 880, 400, 200, 80, 'moss', .9]] },
  ];
  /* ---------- state ---------- */
  let mode = 'board', J = null, sel = 0, cash = 150, earned = 0, rep = 0, own = { n40: 1, n25: 1 }, psi = 0, biz = {}, noz = 1, t = 0, aim = { x: 640, y: 360 }, spraying = false, keySpray = false;
  let grid = null, hard = null, soapT = null, part = null, totals = null, start = 0, jt = 0, drops = [], msgs = [], done = {}, res = null, partDone = null, helper = null, botT = 0, hiss = 0, img = null, gctx = null, gcan = null, art = null, tough = 0;
  const SV = () => { const s = K.save; if (!s.cw2) s.cw2 = { cash: 150, earned: 0, rep: 0, own: { n40: 1, n25: 1 }, psi: 0, biz: {}, done: {} }; return s.cw2; };
  const save = () => { Object.assign(SV(), { cash, earned, rep, own, psi, biz, done }); K.persist(); };
  const lv = k => biz[k] || 0, say = (s, c = '#fff') => { msgs.push({ s, c, t: 0 }); if (msgs.length > 3) msgs.shift(); };
  /* ---------- building a job: the picture, then the grime over it ---------- */
  function startJob(i) {
    J = JOBS[i]; sel = i; mode = 'job'; jt = 0; drops = []; msgs = []; res = null; tough = 0;
    art = document.createElement('canvas'); art.width = SW; art.height = SH; const ag = art.getContext('2d'); drawArt(ag, J.art);
    const px = ag.getImageData(0, 0, SW, SH).data;
    grid = new Float32Array(GW * GH); hard = new Float32Array(GW * GH); soapT = new Float32Array(GW * GH); part = new Int8Array(GW * GH).fill(-1);
    gcan = document.createElement('canvas'); gcan.width = GW; gcan.height = GH; gctx = gcan.getContext('2d'); img = gctx.createImageData(GW, GH);
    // grime goes on the object, not the sky: the parts list decides the kind; later parts win where they overlap
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
      const x = gx * CELL + 2, y = gy * CELL + 2, a = px[(y * SW + x) * 4 + 3]; if (a < 200) continue;
      let pi = -1; J.parts.forEach((P, k) => { if (x >= P[1] && x < P[1] + P[3] && y >= P[2] && y < P[2] + P[4]) pi = k; });
      if (pi < 0) continue; const P = J.parts[pi], blob = noise(x * .02 + pi * 7, y * .02) + noise(x * .07, y * .07) * .4;
      if (blob < 1.4 - P[6] * 1.25) continue;
      const i2 = gy * GW + gx; grid[i2] = cl(.6 + blob * .3, .3, 1); hard[i2] = DIRT[P[5]].h * (.85 + R() * .3); part[i2] = pi;
    }
    totals = J.parts.map((_, k) => { let n = 0; for (let i2 = 0; i2 < part.length; i2++) if (part[i2] === k) n++; return n; }); partDone = J.parts.map(() => false);
    for (let i2 = 0; i2 < grid.length; i2++) paintCell(i2);
    gctx.putImageData(img, 0, 0); start = remaining();
    helper = lv('helper') ? { x: 300, y: 300, tx: 300, ty: 300, t: 0 } : null;
    K.sfx(300, .2, 'triangle', .05, 300);
  }
  function noise(x, y) { return (Math.sin(x * 1.7 + Math.sin(y * 1.3)) + Math.sin(y * 2.1 + Math.cos(x * .9)) + 2) / 4 * 1.6; }
  function paintCell(i2) {
    const v = grid[i2], o = i2 * 4; if (v <= 0 || part[i2] < 0) { img.data[o + 3] = 0; return; }
    const D = DIRT[J.parts[part[i2]][5]], s = soapT[i2] > 0;
    img.data[o] = s ? 235 : D.c[0]; img.data[o + 1] = s ? 235 : D.c[1]; img.data[o + 2] = s ? 250 : D.c[2]; img.data[o + 3] = Math.round(255 * D.a * Math.min(1, v * 1.3));
  }
  const remaining = () => { let s = 0; for (let i2 = 0; i2 < grid.length; i2++) s += grid[i2]; return s; };
  const pct = () => start ? cl(1 - remaining() / start, 0, 1) : 1;
  function partPct(k) { let a = 0, n = 0; for (let i2 = 0; i2 < part.length; i2++) if (part[i2] === k) { n++; if (grid[i2] <= .04) a++; } return n ? a / n : 1; }
  /* ---------- spraying ---------- */
  function spray(x, y, N, dt, power) {
    const wx = x - SX, wy = y - SY, r = N.r * (1 + lv('tank') * .15), gx0 = Math.max(0, Math.floor((wx - r) / CELL)), gx1 = Math.min(GW - 1, Math.ceil((wx + r) / CELL)), gy0 = Math.max(0, Math.floor((wy - r) / CELL)), gy1 = Math.min(GH - 1, Math.ceil((wy + r) / CELL));
    let cleaned = 0, blocked = 0;
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
      const i2 = gy * GW + gx; if (grid[i2] <= 0) continue; const dd = Math.hypot(gx * CELL + 2.5 - wx, gy * CELL + 2.5 - wy); if (dd > r) continue;
      const fall = Math.sqrt(1 - dd / r);
      if (N.soap) { soapT[i2] = 12; paintCell(i2); continue; }
      const h = hard[i2] * (soapT[i2] > 0 ? .3 : 1), rate = (power - h) * 5.5 * fall;
      if (rate <= 0) { blocked++; continue; }
      const before = grid[i2]; grid[i2] = Math.max(0, grid[i2] - rate * dt); cleaned += before - grid[i2]; paintCell(i2);
    }
    return { cleaned, blocked };
  }
  function checkParts() {
    J.parts.forEach((P, k) => { if (!partDone[k] && partPct(k) >= .985) { partDone[k] = true; for (let i2 = 0; i2 < part.length; i2++) if (part[i2] === k) { grid[i2] = 0; paintCell(i2); } say(P[0] + ' clean! ✓', '#5cf28a'); K.chime(659, [0, 4, 7]); K.burst(SX + P[1] + P[3] / 2, SY + P[2] + P[4] / 2, ['#fff', '#5ad8ff', '#ffd23f'], 30, 380, { life: .7 }); } });
    if (partDone.every(Boolean) && mode === 'job') finish(true);
  }
  function finish(auto) {
    const p = pct(); if (!auto && p < .95) { say('Get it to 95% first', '#ff8a8a'); return; }
    const fast = jt < J.par, perfect = p >= .999, repeat = done[sel], base = J.pay * (repeat ? .6 : 1) * (1 + lv('ads') * .15);
    const pay = Math.round(base * (perfect ? 1 : p) + (perfect && fast ? base * .3 : 0)), stars = 1 + (perfect ? 1 : 0) + (perfect && fast ? 1 : 0);
    cash += pay; earned += pay; if (!repeat) rep += stars; else rep += perfect ? 1 : 0; done[sel] = Math.max(done[sel] || 0, stars); res = { pay, stars, fast, perfect, repeat }; mode = 'result'; save();
    K.chime(523, [0, 4, 7, 12, 16]); K.burst(640, 300, ['#5ad8ff', '#ffd23f', '#fff'], 70, 560); K.shake(5);
  }
  /* ---------- input ---------- */
  const btn = {}, inR = (b, x, y) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  GAME.down = (x, y) => { K.audio && K.audio(); for (const k in btn) if (inR(btn[k], x, y)) return press(k); if (mode === 'job') { aim.x = x; aim.y = y; spraying = true; } };
  GAME.move = (x, y) => { aim.x = x; aim.y = y; };
  GAME.up = () => { spraying = false; };
  GAME.key = (c, d) => {
    if (mode === 'job') { if (c === 'Space') keySpray = d; if (!d) return; const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5 }[c]; if (n != null) pickNoz(n); if (c === 'Enter') finish(false); return; }
    if (d && c === 'Enter') { if (mode === 'result') press('board'); else if (mode === 'board') press('go'); }
  };
  function pickNoz(i) { if (!own[NOZ[i].k]) { say(NOZ[i].n + ' not owned yet: buy it at the shop', '#ff8a8a'); return; } noz = i; K.sfx(600, .05, 'square', .05); }
  function press(k) {
    if (k.startsWith('job')) { const i = +k.slice(3); if (rep < JOBS[i].rep) { say(`Needs ${JOBS[i].rep}★ reputation`, '#ff8a8a'); return; } sel = i; K.sfx(600, .05, 'triangle', .05); return; }
    if (k === 'go') { if (rep < JOBS[sel].rep) return; return startJob(sel); }
    if (k.startsWith('nz')) { const i = +k.slice(2); if (mode === 'job') return pickNoz(i); const N = NOZ[i]; if (own[N.k]) return; if (cash < N.cost) { say('Not enough cash', '#ff8a8a'); return; } cash -= N.cost; own[N.k] = 1; K.chime(660, [0, 4, 7]); save(); return; }
    if (k === 'psi') { const P = PSI[psi + 1]; if (!P) return; if (cash < P.cost) { say('Not enough cash', '#ff8a8a'); return; } cash -= P.cost; psi++; K.chime(660, [0, 4, 7]); save(); return; }
    if (k.startsWith('bz')) { const B = BIZ[+k.slice(2)], l = lv(B.k); if (l >= B.max) return; if (cash < B.cost[l]) { say('Not enough cash', '#ff8a8a'); return; } cash -= B.cost[l]; biz[B.k] = l + 1; K.chime(660, [0, 4, 7]); save(); return; }
    if (k === 'finish') return finish(false);
    if (k === 'quit') { mode = 'board'; J = null; return; }
    if (k === 'board') { mode = 'board'; J = null; if (Object.keys(done).length >= JOBS.length && !SV().ended) { SV().ended = 1; save(); K.score = Math.round(earned); K.over({ title: 'Cloudwash empire!', text: `Every client is sparkling. Earned ${money(earned)}.` }); } return; }
    if (k === 'retire') { K.score = Math.round(earned); K.over({ title: 'Sold the business', text: `Earned ${money(earned)} · ${rep}★ reputation` }); return; }
  }
  /* ---------- kit hooks ---------- */
  GAME.reset = () => {
    const S = SV(); cash = S.cash; earned = S.earned || 0; rep = S.rep || 0; own = { ...S.own }; psi = S.psi || 0; biz = { ...(S.biz || {}) }; done = { ...(S.done || {}) }; mode = 'board'; J = null; msgs = []; noz = 1;
    sel = Math.max(0, JOBS.findIndex((j, i) => !done[i] && rep >= j.rep)); if (sel < 0) sel = 0;
    if (K.bot) { own = { n40: 1, n25: 1, n15: 1, turbo: 1, n0: 1, soap: 1 }; psi = 2; startJob([0, 1, 4, 5, 8][Math.floor(R() * 5)]); }
  };
  GAME.update = dt => {
    t += dt; for (const m of msgs) m.t += dt; msgs = msgs.filter(m => m.t < 2.6);
    if (mode !== 'job') return;
    jt += dt;
    for (let i2 = 0; i2 < soapT.length; i2++) if (soapT[i2] > 0) { soapT[i2] -= dt; if (soapT[i2] <= 0) paintCell(i2); }
    const N = NOZ[noz], on = (spraying || keySpray) && aim.y > SY - 10 && aim.y < SY + SH + 10, power = N.p * PSI[psi].m;
    if (on) {
      const r = spray(aim.x, aim.y, N, dt, power);
      if (r.blocked > 6 && r.cleaned < .02) { tough += dt; if (tough > .6) { tough = -2; say(N.soap ? '' : 'Too tough for this nozzle! Try a stronger one, or SOAP first.', '#ffb36a'); } }
      if ((hiss -= dt) <= 0) { hiss = .09; K.noise(.11, .025, N.soap ? 1600 : 3000 + N.p * 400); }
      for (let k = 0; k < 3; k++) drops.push({ x: aim.x + (R() - .5) * N.r, y: aim.y + (R() - .5) * N.r * .6, vx: (R() - .5) * 160, vy: -R() * 120, t: 0, c: N.soap ? '#e8d8ff' : r.cleaned > .01 ? '#8a7a5a' : '#bfe8ff' });
    }
    if (helper) {   // the assistant: walks to the dirtiest spot near him and works on it with a 25° fan
      helper.t -= dt; if (helper.t <= 0) { helper.t = 2.5; let best = null, bv = 0; for (let k = 0; k < 40; k++) { const i2 = Math.floor(R() * grid.length); if (grid[i2] > bv && hard[i2] < 1.2 * PSI[psi].m) { bv = grid[i2]; best = i2; } } if (best != null) { helper.tx = SX + (best % GW) * CELL; helper.ty = SY + Math.floor(best / GW) * CELL; } }
      helper.x += (helper.tx - helper.x) * Math.min(1, dt * 2); helper.y += (helper.ty - helper.y) * Math.min(1, dt * 2);
      spray(helper.x, helper.y, NOZ[1], dt * (.35 + lv('helper') * .25), NOZ[1].p * PSI[psi].m);
    }
    for (const d of drops) { d.t += dt; d.vy += 600 * dt; d.x += d.vx * dt; d.y += d.vy * dt; } drops = drops.filter(d => d.t < .6); if (drops.length > 300) drops.splice(0, drops.length - 300);
    gctx.putImageData(img, 0, 0);
    if (Math.floor(jt * 4) !== Math.floor((jt - dt) * 4)) checkParts();
  };
  // the attract demo: picks a sensible nozzle for whatever is in front of it and sweeps the dirt
  GAME.bot = dt => {
    if (mode === 'result') { if ((botT -= dt) <= 0) startJob([0, 1, 4, 5, 8][Math.floor(R() * 5)]); return; }
    if (mode !== 'job') return;
    if ((botT -= dt) <= 0) {
      botT = .5; let best = -1, bv = 0;
      for (let k = 0; k < 120; k++) { const i2 = Math.floor(R() * grid.length); if (grid[i2] > bv) { bv = grid[i2]; best = i2; } }
      if (best < 0) { for (let i2 = 0; i2 < grid.length; i2++) if (grid[i2] > 0) { best = i2; break; } }
      if (best < 0) { finish(true); botT = 3; return; }
      const h = hard[best]; noz = h > 2.5 ? (soapT[best] > 0 ? 3 : 5) : h > 1.3 ? 3 : h > .6 ? 2 : 1;
      GAME.bot.tx = SX + (best % GW) * CELL; GAME.bot.ty = SY + Math.floor(best / GW) * CELL;
    }
    const tx2 = GAME.bot.tx || 640, ty2 = GAME.bot.ty || 360; aim.x += (tx2 + Math.sin(t * 9) * 30 - aim.x) * Math.min(1, dt * 5); aim.y += (ty2 + Math.cos(t * 7) * 20 - aim.y) * Math.min(1, dt * 5); spraying = true;
    if (pct() > .985) { mode === 'job' && finish(true); botT = 3; }
  };
  /* ---------- drawing ---------- */
  function tx(g, s, x, y, font, c, al = 'center', st) { g.font = font; g.textAlign = al; g.textBaseline = 'middle'; if (st) { g.lineWidth = st; g.strokeStyle = 'rgba(0,0,0,.5)'; g.strokeText(s, x, y); } g.fillStyle = c; g.fillText(s, x, y); }
  const F = (px, w = 800) => `${w} ${px}px Nunito, sans-serif`, D = px => `${px}px "Fredoka One", sans-serif`;
  function rr(g, x, y, w, h, r, fill, stroke, lw = 2) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
  function button(g, k, x, y, w, h, label, col, sub, tc = '#0e2238') { btn[k] = { x, y, w, h }; g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.roundRect(x, y + 5, w, h, 14); g.fill(); rr(g, x, y, w, h, 14, col); tx(g, label, x + w / 2, y + h / 2 + (sub ? -9 : 1), D(h > 64 ? 26 : 19), tc); if (sub) tx(g, sub, x + w / 2, y + h / 2 + 15, F(12), tc); }
  // the clean pictures: everything drawn here gets grime on it (anything with alpha), sky and grass are drawn separately
  function drawArt(g, k) {
    const box = (x, y, w, h, c, r = 4) => { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }, circ = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    const win = (x, y, w, h) => { box(x - 6, y - 6, w + 12, h + 12, '#f2f2f2', 3); box(x, y, w, h, '#8ad0f0', 2); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + 6, y + 6, w * .25, h - 12); g.fillStyle = '#f2f2f2'; g.fillRect(x + w / 2 - 3, y, 6, h); g.fillRect(x, y + h / 2 - 3, w, 6); };
    const roof = (x0, x1, yb, yt, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x0, yb); g.lineTo((x0 + x1) / 2, yt); g.lineTo(x1, yb); g.fill(); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; for (let y = yt + 14; y < yb; y += 14) { const k2 = (y - yt) / (yb - yt), hw = (x1 - x0) / 2 * k2; g.beginPath(); g.moveTo((x0 + x1) / 2 - hw, y); g.lineTo((x0 + x1) / 2 + hw, y); g.stroke(); } };
    if (k === 'patio') { for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) box(150 + c * 102, 300 + r * 47, 98, 43, ['#d8c8b0', '#cdbca2', '#e2d4bf'][(r + c) % 3], 3); box(560, 260, 80, 50, '#3a8a3a', 20); box(570, 190, 60, 80, '#3a6ad8', 10); circ(600, 175, 26, '#f2d0b0'); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(574, 182); g.quadraticCurveTo(600, 240, 626, 182); g.fill(); g.fillStyle = '#e8343a'; g.beginPath(); g.moveTo(570, 162); g.lineTo(600, 100); g.lineTo(630, 162); g.fill(); circ(588, 170, 3, '#1a1a1a'); circ(612, 170, 3, '#1a1a1a'); circ(600, 180, 6, '#e8a080'); }
    if (k === 'drive') { box(60, 180, 1080, 300, '#c8c4bc', 6); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 3; for (let x = 200; x < 1140; x += 180) { g.beginPath(); g.moveTo(x, 180); g.lineTo(x, 480); g.stroke(); } box(60, 440, 1080, 40, '#9a968e', 2); }
    if (k === 'fence') { for (let x = 50; x < 1150; x += 56) { if (x > 510 && x < 690) continue; box(x, 140, 40, 300, '#f4f0e8', 4); g.fillStyle = '#f4f0e8'; g.beginPath(); g.moveTo(x, 142); g.lineTo(x + 20, 118); g.lineTo(x + 40, 142); g.fill(); } box(40, 210, 1120, 22, '#ece6d8', 2); box(40, 360, 1120, 22, '#ece6d8', 2); box(520, 120, 160, 330, '#f8f4ec', 6); g.strokeStyle = '#d8d0c0'; g.lineWidth = 6; g.beginPath(); g.moveTo(530, 130); g.lineTo(670, 440); g.stroke(); circ(660, 290, 7, '#c8a040'); }
    if (k === 'deck') { for (let i = 0; i < 9; i++) box(80, 260 + i * 20, 1040, 17, ['#c8905a', '#be8650', '#d29a64'][i % 3], 2); for (let x = 90; x < 1120; x += 70) box(x, 130, 14, 130, '#b07a48', 2); box(80, 120, 1040, 18, '#c08a58', 3); box(80, 196, 1040, 12, '#c08a58', 2); for (let i = 0; i < 3; i++) box(420 + i * 30, 430 + i * 22, 360 - i * 60, 22, '#c08a58', 2); }
    if (k === 'car') { box(150, 230, 900, 150, '#d8343a', 40); g.fillStyle = '#d8343a'; g.beginPath(); g.moveTo(320, 232); g.lineTo(400, 120); g.lineTo(800, 120); g.lineTo(880, 232); g.fill(); box(410, 132, 180, 92, '#8ad0f0', 6); box(610, 132, 180, 92, '#8ad0f0', 6); for (const wx of [330, 870]) { circ(wx, 390, 72, '#2a2a2a'); circ(wx, 390, 40, '#c8c8d0'); circ(wx, 390, 12, '#5a5a62'); } box(1010, 270, 40, 30, '#ffd23f', 8); box(150, 280, 34, 26, '#ff7a3a', 8); }
    if (k === 'skate') { g.fillStyle = '#b8b8c0'; g.beginPath(); g.moveTo(60, 480); g.lineTo(60, 170); g.quadraticCurveTo(160, 470, 400, 470); g.lineTo(800, 470); g.quadraticCurveTo(1040, 470, 1140, 170); g.lineTo(1140, 480); g.fill(); box(40, 150, 60, 20, '#8a8a92', 2); box(1100, 150, 60, 20, '#8a8a92', 2); box(400, 455, 400, 25, '#a8a8b0', 2); for (let x = 340; x < 860; x += 40) box(x, 230 + Math.sin(x) * 10, 30, 30, 'rgba(184,184,192,1)', 2); box(330, 220, 540, 170, '#b8b8c0', 8); }
    if (k === 'play') { box(140, 120, 26, 340, '#3a8ad8', 4); box(240, 120, 26, 340, '#3a8ad8', 4); box(130, 120, 150, 24, '#ffd23f', 6); g.strokeStyle = '#ff5a3a'; g.lineWidth = 34; g.lineCap = 'round'; g.beginPath(); g.moveTo(270, 150); g.quadraticCurveTo(420, 260, 520, 440); g.stroke(); g.lineCap = 'butt'; g.strokeStyle = '#8a8a92'; g.lineWidth = 12; g.beginPath(); g.moveTo(660, 460); g.lineTo(720, 100); g.lineTo(1040, 100); g.lineTo(1100, 460); g.stroke(); g.lineWidth = 4; for (const sx of [800, 960]) { g.beginPath(); g.moveTo(sx - 20, 104); g.lineTo(sx - 20, 330); g.moveTo(sx + 20, 104); g.lineTo(sx + 20, 330); g.stroke(); box(sx - 34, 328, 68, 14, '#5a3a2a', 3); } box(40, 450, 1120, 50, '#c8a878', 2); }
    if (k === 'truck') { box(100, 140, 760, 260, '#f2f2f2', 16); box(860, 200, 240, 200, '#ffd23f', 18); box(900, 220, 150, 90, '#8ad0f0', 8); box(420, 170, 360, 110, '#3a3a42', 6); box(400, 280, 400, 16, '#c8c8d0', 2); box(130, 300, 280, 40, '#ff5a7a', 6); for (const wx of [280, 940]) { circ(wx, 410, 62, '#2a2a2a'); circ(wx, 410, 30, '#c8c8d0'); } box(100, 120, 760, 26, '#ff5a7a', 8); }
    if (k === 'fountain') { box(40, 450, 1120, 50, '#c8c0b0', 2); g.fillStyle = '#b8b4ac'; g.beginPath(); g.ellipse(600, 400, 380, 80, 0, 0, TAU); g.fill(); box(220, 330, 760, 80, '#c8c4bc', 20); box(550, 200, 100, 140, '#bab6ae', 10); circ(600, 150, 48, '#c8c4bc'); box(560, 80, 80, 90, '#c8c4bc', 30); circ(600, 60, 28, '#c8c4bc'); box(520, 170, 160, 30, '#bab6ae', 8); }
    if (k === 'bungalow') { box(160, 200, 880, 280, '#f0e2c8', 4); roof(110, 1090, 210, 50, '#a8483a'); win(240, 260, 140, 100); win(440, 260, 140, 100); box(600, 280, 110, 200, '#7a4a2a', 6); circ(690, 380, 6, '#ffd23f'); box(770, 300, 230, 180, '#d8d4cc', 6); g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 3; for (let y = 330; y < 480; y += 30) { g.beginPath(); g.moveTo(770, y); g.lineTo(1000, y); g.stroke(); } box(820, 110, 60, 80, '#8a5a4a', 3); }
    if (k === 'house2') { box(240, 130, 720, 350, '#d8e6f2', 4); roof(200, 1000, 140, 10, '#5a5a6a'); box(240, 280, 720, 12, '#c8d6e2', 1); for (const [x, y] of [[300, 170], [470, 170], [640, 170], [810, 170], [300, 330], [810, 330]]) win(x, y, 100, 80); box(470, 360, 260, 30, '#f2f2f2', 4); box(560, 330, 80, 150, '#3a6a8a', 6); for (const x of [480, 700]) box(x, 380, 16, 100, '#f2f2f2', 3); box(470, 470, 260, 14, '#c8c8c8', 2); box(840, 40, 50, 80, '#8a5a4a', 3); }
    if (k === 'mansion') { box(80, 150, 1040, 330, '#f2ead8', 4); roof(60, 420, 160, 30, '#4a5a6a'); roof(780, 1140, 160, 30, '#4a5a6a'); roof(380, 820, 150, 20, '#4a5a6a'); for (let i = 0; i < 4; i++) { box(440 + i * 100, 160, 34, 320, '#fbf6ea', 4); box(432 + i * 100, 156, 50, 16, '#e8e0cc', 2); } for (const [x, y] of [[130, 190], [260, 190], [130, 300], [260, 300], [860, 190], [990, 190], [860, 300], [990, 300]]) win(x, y, 80, 80); box(565, 330, 70, 150, '#6a3a2a', 8); g.fillStyle = '#c8c4bc'; g.beginPath(); g.ellipse(980, 455, 100, 26, 0, 0, TAU); g.fill(); box(965, 400, 30, 50, '#bab6ae', 6); }
  }
  function scenery(g, k) {
    const v = K.view, gr = g.createLinearGradient(0, v.y0, 0, 620); gr.addColorStop(0, '#7ec8ff'); gr.addColorStop(1, '#d8f0ff'); g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 4; i++) { const x = ((i * 380 + t * 10) % 1500) - 100, y = 70 + (i % 2) * 40; g.beginPath(); g.arc(x, y, 26, 0, TAU); g.arc(x + 30, y - 10, 32, 0, TAU); g.arc(x + 62, y, 24, 0, TAU); g.fill(); }
    g.fillStyle = '#5ab84a'; g.fillRect(v.x0, SY + SH - 30, v.x1 - v.x0, v.y1 - (SY + SH - 30)); g.fillStyle = '#4aa83a'; for (let x = v.x0; x < v.x1; x += 18) g.fillRect(x, SY + SH - 30, 9, 6);
  }
  function drawJob(g) {
    scenery(g); g.drawImage(art, SX, SY);
    g.save(); g.imageSmoothingEnabled = true; g.drawImage(gcan, SX, SY, SW, SH); g.restore();
    // the assistant
    if (helper) { g.fillStyle = '#ff9a3a'; g.beginPath(); g.arc(helper.x, helper.y - 6, 10, 0, TAU); g.fill(); g.strokeStyle = 'rgba(190,232,255,.7)'; g.lineWidth = 3; g.beginPath(); g.arc(helper.x, helper.y, 18 + Math.sin(t * 20) * 3, 0, TAU); g.stroke(); }
    // the jet, from the washer at the bottom
    const N = NOZ[noz], on = spraying || keySpray;
    const ox = 640 + (aim.x - 640) * .25, oy = 720;
    if (on) { g.strokeStyle = N.soap ? 'rgba(220,200,255,.75)' : 'rgba(210,240,255,.8)'; g.lineWidth = Math.max(2, 14 - N.p * 3); g.beginPath(); g.moveTo(ox, oy - 60); g.lineTo(aim.x, aim.y); g.stroke(); g.fillStyle = N.soap ? 'rgba(230,210,255,.35)' : 'rgba(220,245,255,.35)'; g.beginPath(); g.arc(aim.x, aim.y, N.r * (1 + lv('tank') * .15), 0, TAU); g.fill(); }
    for (const d of drops) { g.globalAlpha = 1 - d.t / .6; g.fillStyle = d.c; g.fillRect(d.x, d.y, 4, 4); } g.globalAlpha = 1;
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(aim.x, aim.y, N.r * (1 + lv('tank') * .15), 0, TAU); g.stroke();
    // the lance
    g.strokeStyle = '#3a3a42'; g.lineWidth = 12; g.lineCap = 'round'; const a = Math.atan2(aim.y - oy, aim.x - ox); g.beginPath(); g.moveTo(ox, oy + 10); g.lineTo(ox + Math.cos(a) * 80, oy + Math.sin(a) * 80); g.stroke(); g.lineCap = 'butt'; g.fillStyle = N.col; g.beginPath(); g.arc(ox + Math.cos(a) * 82, oy + Math.sin(a) * 82, 9, 0, TAU); g.fill();
    // top bar: job, progress, parts
    rr(g, 20, 12, 1240, 82, 14, 'rgba(10,30,50,.82)');
    tx(g, J.n.toUpperCase(), 76, 36, D(22), '#fff', 'left'); tx(g, `${money(J.pay * (done[sel] ? .6 : 1) * (1 + lv('ads') * .15))} · par ${J.par}s · ${Math.floor(jt)}s`, 76, 66, F(15), jt < J.par ? '#5cf28a' : '#ffb36a', 'left');
    const p = pct(); rr(g, 380, 26, 300, 26, 13, 'rgba(255,255,255,.15)'); rr(g, 380, 26, 300 * p, 26, 13, p >= .95 ? '#5cf28a' : '#5ad8ff'); tx(g, Math.floor(p * 100) + '% clean', 530, 40, D(18), '#0e2238');
    J.parts.forEach((P, k) => { const x = 700 + (k % 3) * 186, y = 30 + Math.floor(k / 3) * 30, q = partDone[k] ? 1 : partPct(k); tx(g, (partDone[k] ? '✓ ' : '') + P[0], x, y, F(14), partDone[k] ? '#5cf28a' : '#fff', 'left'); rr(g, x + 110, y - 5, 64, 10, 5, 'rgba(255,255,255,.15)'); rr(g, x + 110, y - 5, 64 * q, 10, 5, partDone[k] ? '#5cf28a' : '#' + ['5ad8ff', 'ffd23f', 'ff9a3a', 'c88aff', 'ff7aa8', '8ae8ff'][k]); });
    tx(g, 'Grime here: ' + [...new Set(J.parts.map(P => DIRT[P[5]].n))].join(', '), 380, 74, F(13), '#9fd0f0', 'left');
    // bottom bar: nozzles
    rr(g, 20, 626, 1240, 86, 14, 'rgba(10,30,50,.85)');
    NOZ.forEach((Nz, i) => { const b = { x: 34 + i * 136, y: 636, w: 126, h: 66 }, has = own[Nz.k], on2 = noz === i; btn['nz' + i] = b; rr(g, b.x, b.y, b.w, b.h, 12, on2 ? 'rgba(90,216,255,.35)' : 'rgba(255,255,255,.06)', on2 ? '#5ad8ff' : has ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.06)', on2 ? 3 : 2); g.globalAlpha = has ? 1 : .35; tx(g, Nz.n, b.x + b.w / 2, b.y + 22, D(16), Nz.col); tx(g, Nz.soap ? 'softens stains' : `power ${(Nz.p * PSI[psi].m).toFixed(1)}`, b.x + b.w / 2, b.y + 46, F(12), '#cfe8ff'); tx(g, String(i + 1), b.x + 12, b.y + 12, F(11), 'rgba(255,255,255,.5)'); g.globalAlpha = 1; });
    button(g, 'finish', 870, 638, 210, 62, p >= .95 ? 'FINISH & GET PAID' : `${Math.ceil(95 - p * 100)}% TO GO`, p >= .95 ? '#5cf28a' : 'rgba(255,255,255,.15)', 'Enter', p >= .95 ? '#0e2238' : '#cfe8ff');
    button(g, 'quit', 1096, 638, 150, 62, 'LEAVE', 'rgba(255,255,255,.15)', 'no pay', '#fff');
  }
  function drawBoard(g) {
    const v = K.view, gr = g.createLinearGradient(0, v.y0, 0, v.y1); gr.addColorStop(0, '#12304e'); gr.addColorStop(1, '#0a1828'); g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    tx(g, 'CLOUDWASH', 80, 40, D(40), '#5ad8ff', 'left'); tx(g, 'PRESSURE WASHING CO.', 82, 74, D(16), '#ffd23f', 'left');
    tx(g, money(cash), 1240, 40, D(32), '#5cf28a', 'right'); tx(g, `${rep}★ reputation · earned ${money(earned)}`, 1240, 72, F(15), '#cfe8ff', 'right');
    JOBS.forEach((Jb, i) => { const x = 40 + (i % 4) * 190, y = 96 + Math.floor(i / 4) * 140, open = rep >= Jb.rep, b = { x, y, w: 180, h: 128 }; btn['job' + i] = b;
      rr(g, x, y, 180, 128, 14, sel === i ? '#1f4a6e' : open ? '#163a5a' : '#0e2238', sel === i ? '#5ad8ff' : open ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.06)', sel === i ? 4 : 2);
      tx(g, Jb.n, x + 90, y + 24, D(Jb.n.length > 15 ? 15 : 18), open ? '#fff' : '#5a7a9a'); tx(g, open ? money(Jb.pay * (done[i] ? .6 : 1) * (1 + lv('ads') * .15)) : `needs ${Jb.rep}★`, x + 90, y + 56, D(22), open ? '#5cf28a' : '#5a7a9a');
      tx(g, [...new Set(Jb.parts.map(P => DIRT[P[5]].n))].join(' · '), x + 90, y + 84, F(12), open ? '#9fd0f0' : '#3a5a7a'); tx(g, done[i] ? '★'.repeat(done[i]) + '☆'.repeat(3 - done[i]) : open ? 'NEW CLIENT' : '', x + 90, y + 108, D(16), done[i] ? '#ffd23f' : '#5ad8ff'); });
    // the shop
    rr(g, 820, 96, 420, 500, 16, 'rgba(0,0,0,.3)', 'rgba(255,255,255,.12)', 2); tx(g, 'EQUIPMENT & BUSINESS', 1030, 120, D(20), '#ffd23f');
    const nx = PSI[psi + 1]; const pb = { x: 834, y: 140, w: 392, h: 50 }; btn.psi = pb; rr(g, pb.x, pb.y, pb.w, pb.h, 10, 'rgba(255,255,255,.06)', nx && cash >= nx.cost ? '#ffd23f' : 'rgba(255,255,255,.12)', 2); tx(g, nx ? 'Upgrade: ' + nx.n : PSI[psi].n + ' (best)', pb.x + 12, pb.y + 17, D(15), '#fff', 'left'); tx(g, `power ×${PSI[psi].m}${nx ? ' → ×' + nx.m : ''}`, pb.x + 12, pb.y + 36, F(12), '#9fd0f0', 'left'); tx(g, nx ? money(nx.cost) : 'MAX', pb.x + pb.w - 12, pb.y + 25, D(17), nx ? (cash >= nx.cost ? '#ffd23f' : '#ff8a8a') : '#5cf28a', 'right');
    NOZ.forEach((N, i) => { if (!N.cost) return; const b = { x: 834 + ((i - 2) % 2) * 198, y: 200 + Math.floor((i - 2) / 2) * 56, w: 192, h: 50 }; btn['nz' + i] = b; const has = own[N.k]; rr(g, b.x, b.y, b.w, b.h, 10, has ? 'rgba(92,242,138,.12)' : 'rgba(255,255,255,.06)', !has && cash >= N.cost ? '#ffd23f' : 'rgba(255,255,255,.12)', 2); tx(g, N.n, b.x + 10, b.y + 17, D(14), N.col, 'left'); tx(g, has ? 'OWNED' : money(N.cost), b.x + 10, b.y + 36, F(12), has ? '#5cf28a' : cash >= N.cost ? '#ffd23f' : '#ff8a8a', 'left'); tx(g, N.soap ? 'for graffiti' : 'power ' + N.p, b.x + b.w - 10, b.y + 25, F(11), '#9fd0f0', 'right'); });
    BIZ.forEach((B, i) => { const l = lv(B.k), max = l >= B.max, c = max ? 0 : B.cost[l], b = { x: 834, y: 320 + i * 58, w: 392, h: 52 }; btn['bz' + i] = b; rr(g, b.x, b.y, b.w, b.h, 10, max ? 'rgba(92,242,138,.12)' : 'rgba(255,255,255,.06)', !max && cash >= c ? '#ffd23f' : 'rgba(255,255,255,.12)', 2); tx(g, B.n, b.x + 12, b.y + 18, D(15), '#fff', 'left'); tx(g, B.d, b.x + 12, b.y + 37, F(12), '#9fd0f0', 'left'); tx(g, max ? 'MAX' : money(c), b.x + b.w - 12, b.y + 26, D(17), max ? '#5cf28a' : cash >= c ? '#ffd23f' : '#ff8a8a', 'right'); });
    tx(g, 'Tip: moss and rust need 15° or stronger. Graffiti: SOAP, then rinse.', 1030, 512, F(13), '#9fd0f0');
    const Jb = JOBS[sel];
    button(g, 'go', 40, 520, 560, 88, rep >= Jb.rep ? `START: ${Jb.n.toUpperCase()}` : `NEEDS ${Jb.rep}★`, rep >= Jb.rep ? '#5ad8ff' : 'rgba(255,255,255,.15)', rep >= Jb.rep ? `${Jb.parts.length} parts · par ${Jb.par}s` : 'Earn stars on smaller jobs', rep >= Jb.rep ? '#0e2238' : '#cfe8ff');
    button(g, 'retire', 620, 534, 180, 60, 'SELL UP', 'rgba(255,255,255,.15)', 'end the game', '#fff');
    tx(g, 'Every new client earns 1-3★: get it all clean, and fast.', 420, 632, F(14), '#cfe8ff');
  }
  function drawResult(g) {
    drawJob(g); g.fillStyle = 'rgba(8,20,36,.75)'; g.fillRect(K.view.x0, K.view.y0, K.view.x1 - K.view.x0, K.view.y1 - K.view.y0);
    const r = res; rr(g, 340, 140, 600, 420, 22, '#12304e', '#5cf28a', 4);
    tx(g, r.perfect ? 'SPOTLESS!' : 'JOB DONE', 640, 210, D(64), r.perfect ? '#5cf28a' : '#5ad8ff', 'center', 6);
    tx(g, '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars), 640, 286, D(52), '#ffd23f');
    tx(g, `${r.perfect ? '✓' : '✗'} 100% clean   ${r.perfect && r.fast ? '✓' : '✗'} under par`, 640, 340, F(18), '#cfe8ff');
    tx(g, '+' + money(r.pay), 640, 400, D(50), '#5cf28a'); if (r.repeat) tx(g, 'Repeat client: 60% pay', 640, 440, F(14), '#9fd0f0');
    button(g, 'board', 470, 470, 340, 72, 'BACK TO THE BOARD', '#5ad8ff');
  }
  GAME.draw = g => {
    for (const k in btn) delete btn[k];
    if (mode === 'board') drawBoard(g); else if (mode === 'job') drawJob(g); else if (mode === 'result') drawResult(g);
    msgs.forEach((m, i) => { if (!m.s) return; g.globalAlpha = Math.min(1, (2.6 - m.t) * 2); rr(g, 340, 104 + i * 36, 600, 32, 10, 'rgba(10,30,50,.85)'); tx(g, m.s, 640, 120 + i * 36, D(17), m.c); g.globalAlpha = 1; });
  };
  GAME.pose = () => { own = { n40: 1, n25: 1, n15: 1, turbo: 1, n0: 1, soap: 1 }; psi = 2; startJob(8); noz = 3; aim = { x: 520, y: 200 }; spraying = true; for (let i = 0; i < 200; i++) { const x = 160 + (i % 20) * 22, y = 120 + Math.floor(i / 20) * 14; spray(x, y, NOZ[3], .5, 6); } for (let i = 0; i < 40; i++) GAME.update(1 / 60); };
  GAME.test = { st: () => ({ mode, job: J && J.n, pct: J && +pct().toFixed(3), parts: J && J.parts.map((P, k) => [P[0], +partPct(k).toFixed(2), partDone[k]]), cash, rep, earned, own, psi, biz, res, noz, jt: +jt.toFixed(1) }), press, startJob, aimAt: (x, y, on) => { aim.x = x; aim.y = y; spraying = on; }, setCash: v => { cash = v; }, setRep: v => { rep = v; } };
})();
