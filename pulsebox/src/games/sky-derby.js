/* Sky Derby: build a glider in 45 seconds, then race it down a mountain. Up to 8 players online (bots fill the field).
   The workshop is a small grid around your pilot: wings give lift, tail fins keep it steady, rockets give boost, balloons
   float, nose cones cut drag. What you build sets your glider's lift, weight, drag, stability and boost, and the flight
   uses them: pull up too hard and you stall, too heavy and you sink, unsteady and it wobbles. The course has ridges to
   clear, updrafts that lift you, rings that speed you up and rock spires to dodge.
   Online: every player flies their own glider on their own screen and shares where it is; the host runs the bots,
   the clock and the results. */
// @use mp
const GAME = {
  id: 'sky-derby', title: 'Sky Derby', tagline: 'Build a glider. Race it down the mountain.',
  font: 'Lilita One', accent: '#ffd23f', accent2: '#3ec5ff', bg: '#7ec8ff', noHud: true, noSkins: true, scoreLabel: 'Race points',
  how: [
    'BUILD (45s): place parts around your pilot. Wings lift, tail fins steady you, rockets boost, balloons float, a nose cone cuts drag. Everything must join up to the pilot.',
    'FLY: hold W / Up (or touch the left side) to pull the nose up, S / Down to dive. Pull too hard and you stall.',
    'Space (or the BOOST button) fires your rockets. Fly through rings for speed and a little fuel.',
    'Ride the updrafts (rising streaks) over the ridges, dodge the rock spires, and be first to the village at the bottom.',
  ],
  skins: [{ name: 'Classic', price: 0 }],
};
(() => {
  'use strict';
  const TAU = Math.PI * 2, cl = (v, a, b) => v < a ? a : v > b ? b : v, lp = (a, b, t) => a + (b - a) * t;
  const GC = 9, GR = 5, PX = 4, PY = 2, BUDGET = 60, BUILD_T = 45, RACE_MAX = 150, L = 15000, GRAV = 430;
  // parts: cost, mass, lift area, drag, and what else they do
  const PART = {
    frame: { name: 'Frame', cost: 2, m: .7, a: 0, d: .006, col: '#c8a46a', tip: 'Light and cheap: joins parts up' },
    wing: { name: 'Wing', cost: 6, m: .55, a: 1, d: .007, col: '#f2f2f2', tip: 'Lift. Wings side by side lift more' },
    fin: { name: 'Tail fin', cost: 4, m: .35, a: .15, d: .004, col: '#ff6a4a', tip: 'Steadies the glider (best at the back)' },
    rocket: { name: 'Rocket', cost: 10, m: 1.1, a: 0, d: .012, col: '#8a8ea0', tip: 'Boost fuel: hold Space' },
    balloon: { name: 'Balloon', cost: 8, m: .25, a: 0, d: .045, col: '#ff7ad9', tip: 'Floats: you sink slower, but it drags' },
    nose: { name: 'Nose cone', cost: 5, m: .6, a: 0, d: -.016, col: '#ffd23f', tip: 'Cuts drag (put it at the very front)' },
  };
  const PK = Object.keys(PART);
  const PRESETS = {
    Dart: { '5,2': 'nose', '3,2': 'frame', '2,2': 'fin', '4,1': 'wing', '4,3': 'wing', '3,1': 'wing', '3,3': 'wing', '2,1': 'fin', '1,2': 'rocket' },
    Floater: { '3,2': 'frame', '4,1': 'wing', '4,0': 'wing', '4,3': 'wing', '4,4': 'wing', '5,1': 'wing', '5,3': 'wing', '2,2': 'fin', '1,2': 'fin' },
    Rocket: { '5,2': 'nose', '3,2': 'rocket', '2,2': 'rocket', '4,1': 'wing', '4,3': 'wing', '3,1': 'wing', '1,2': 'fin' },
  };
  /* ---------- design -> numbers ---------- */
  function connected(D) {   // the parts joined to the pilot through neighbours
    const ok = new Set(), st = [[PX, PY]], k = (x, y) => x + ',' + y; ok.add(k(PX, PY));
    while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = k(x + dx, y + dy); if (D[q] && !ok.has(q)) { ok.add(q); st.push([x + dx, y + dy]); } } }
    return ok;
  }
  function stats(D) {
    const ok = connected(D); let m = 2.2, A = 0, d = .022, cost = 0, mx = PX * 2.2, ax = 0, fins = 0, finBack = 0, rockets = 0, balloons = 0, front = PX;
    for (const k in D) { if (!PART[D[k]]) continue; cost += PART[D[k]].cost; }
    for (const k of ok) { const p = D[k]; if (!p) continue; const P = PART[p], [x, y] = k.split(',').map(Number); front = Math.max(front, x); }
    for (const k of ok) {
      const p = D[k]; if (!p) continue; const P = PART[p], [x, y] = k.split(',').map(Number);
      m += P.m; mx += P.m * x; d += P.d;
      if (p === 'wing') { let a = 1; if (D[(x) + ',' + (y - 1)] === 'wing' || D[x + ',' + (y + 1)] === 'wing') a += .2; A += a; ax += a * x; }
      if (p === 'fin') { A += .15; fins++; if (x < PX) finBack++; }
      if (p === 'rocket') rockets++; if (p === 'balloon') balloons++;
      if (p === 'nose' && x < front) d -= P.d;   // a nose cone only helps at the very front
    }
    const comX = mx / m, colX = A ? ax / Math.max(.01, A - fins * .15) : PX, stab = cl(.35 + (comX - colX) * .25 + finBack * .22 + fins * .05, 0, 1);
    return { m, A, d: Math.max(.012, d), stab, fuel: rockets * 1.3, thrust: rockets ? 520 + rockets * 60 : 0, buoy: balloons * .55, cost, ok, rockets, balloons };
  }
  const rating = S => ({ LIFT: cl(S.A / 6, 0, 1), SPEED: cl(1 - (S.d - .015) / .1 - (S.m - 4) / 14, 0, 1), STEADY: S.stab, BOOST: cl(S.fuel / 4, 0, 1), FLOAT: cl(S.buoy / 2, 0, 1) });
  /* ---------- the course, from a shared seed ---------- */
  let C = null;
  function mulberry(s) { return () => { s = s + 0x6D2B79F5 | 0; let q = Math.imul(s ^ s >>> 15, 1 | s); q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q; return ((q ^ q >>> 14) >>> 0) / 4294967296; }; }
  function course(seed) {
    const r = mulberry(seed), ridges = [], drafts = [], rings = [], spires = [], trees = [], cps = [];
    for (let x = 1400; x < L - 1200; x += 1200 + r() * 700) { const h = 170 + r() * 190, w = 260 + r() * 220; ridges.push({ x, h, w }); drafts.push({ x: x - w - 120 - r() * 120, w: 150 + r() * 60, s: 300 + h * .9 }); }
    for (let x = 2200; x < L - 800; x += 1500 + r() * 900) drafts.push({ x, w: 110 + r() * 60, s: -170 - r() * 90 });   // a downdraft now and then
    const base = x => 280 + x * .165 + Math.sin(x * .0021 + seed) * 70 + Math.sin(x * .0057 + seed * 2) * 30;
    const ground = x => { if (x < 260) return 40 + Math.max(0, x - 200) * 2; let y = base(x); for (const R of ridges) { const k = (x - R.x) / R.w; if (k > -1.6 && k < 1.6) y -= R.h * Math.exp(-k * k * 2.2); } return y; };
    for (let x = 900; x < L - 400; x += 520 + r() * 420) { if (ridges.some(R => Math.abs(R.x - x) < R.w * .8)) continue; if (r() < .35) spires.push({ x, h: 170 + r() * 130, w: 34 + r() * 16 }); }
    for (let x = 700; x < L - 300; x += 600 + r() * 500) rings.push({ x, y: ground(x) - 190 - r() * 120, r: 46, hit: new Set() });
    for (let x = 300; x < L; x += 18 + r() * 60) trees.push({ x, s: .6 + r() * .7 });
    for (let x = 2500; x < L; x += 2500) cps.push(x);
    return { seed, ridges, drafts, rings, spires, trees, cps, ground, base };
  }
  const groundAt = x => C.ground(cl(x, 0, L + 2000));
  function wind(x, y) { let w = 0; for (const D of C.drafts) { const k = Math.abs(x - D.x) / D.w; if (k < 1) { const h = groundAt(x) - y; w -= D.s * (1 - k * k) * cl(h / 120, .3, 1) * cl(1 - (h - 150) / 450, 0, 1); } } return w; }   // thermals fade away high above the ground
  /* ---------- flight ---------- */
  function newPilot(r, i, D) {
    const S = stats(D);
    return { i, id: r.id, name: r.name, col: r.col, bot: !!r.bot, D, S, x: 120 - i * 14, y: 10, vx: 0, vy: 0, th: 0, fuel: S.fuel, boost: false, crash: 0, cp: 0, done: false, time: 0, rings: 0, ctl: 0, wob: Math.random() * 6, skill: .7 + Math.random() * .3, aim: 0 };
  }
  function fly(p, dt, ctl, boost) {
    if (p.done) { p.vx *= .98; p.x += p.vx * dt; p.y = Math.min(p.y + 60 * dt, groundAt(p.x) - 14); return; }
    if (p.crash > 0) { p.crash -= dt; p.th += dt * 9; p.vy += GRAV * dt; p.y = Math.min(p.y + p.vy * dt, groundAt(p.x) - 6); if (p.crash <= 0) respawn(p); return; }
    // an arcade glider: it flies where its nose points; climbing costs speed, diving gains it; too slow and it stalls
    const S = p.S, stall = 95 * Math.sqrt(Math.max(.5, S.m - S.buoy * 1.5) / Math.max(.6, S.A)), trim = .3 / (1 + S.A * .12) - S.buoy * .03;
    let sp = p.sp ?? Math.hypot(p.vx, p.vy); p.stall = sp < stall;
    const turn = 1.1 + S.A * .09 + S.stab * .4, wob = (1 - S.stab) * (.16 * Math.sin(t * 6.5 + p.wob) + .07 * Math.sin(t * 15.3 + p.wob * 2));
    if (p.stall) p.th += (.75 - p.th) * Math.min(1, dt * 2.5);   // stalled: the nose drops
    else if (ctl) p.th = cl(p.th + ctl * turn * dt, -.95, 1.05);
    else p.th += (trim - p.th) * Math.min(1, dt * (.6 + S.stab * 1.2));
    const th = p.th + wob;
    sp += (GRAV * (1 - S.buoy / S.m * .8) * Math.sin(th) - .1 * S.d / S.m * sp * sp) * dt;
    p.boost = boost && p.fuel > 0; if (p.boost) { p.fuel -= dt; sp += (S.thrust * 1.2 / S.m) * dt; }
    sp = Math.max(sp, 30); p.sp = sp;
    const lift = wind(p.x, p.y) * (.55 + S.A * .05);   // updrafts carry big wings further
    p.vx = Math.cos(th) * sp; p.vy = Math.sin(th) * sp + (p.stall ? 60 : 0) + lift;
    p.x += p.vx * dt; p.y += p.vy * dt; p.y = Math.max(p.y, -900);
    // rings: a burst of speed and a sip of fuel
    for (const R of C.rings) if (!R.hit.has(p.i) && Math.abs(p.x - R.x) < 14 && Math.abs(p.y - R.y) < R.r) { R.hit.add(p.i); p.rings++; p.sp = (p.sp || 200) + 90; p.fuel = Math.min(S.fuel + .5, p.fuel + .5); if (p.i === mine) { K.sfx(880, .08, 'triangle', .08); K.sfx(1320, .12, 'triangle', .08, 0, .06); K.burst(R.x - camX, R.y - camY, ['#ffd23f', '#fff'], 14, 220, { gravity: 0, life: .4 }); } }
    for (const cp of C.cps) if (p.x > cp && p.cp < cp) p.cp = cp;
    // the ground and the spires
    let hit = p.y > groundAt(p.x) - 8;
    for (const sp of C.spires) if (Math.abs(p.x - sp.x) < sp.w * .5 * (1 - (groundAt(sp.x) - p.y) / sp.h) + 6 && p.y > groundAt(sp.x) - sp.h) hit = true;
    if (hit) { p.crash = 1.3; p.vx *= .2; p.vy = -120; p.sp = 0; if (p.i === mine) { K.shake(10); K.noise(.3, .2, 300); K.sfx(90, .3, 'sine', .2, -40); } }
    if (p.x >= L && !p.done) { p.done = true; p.time = raceT; if (p.i === mine) { K.chime(523, [0, 4, 7, 12]); } if (MP.online() && p.i === mine) MP.send({ t: 'fin', time: +raceT.toFixed(2), r: p.rings }); }
  }
  function respawn(p) {   // back in the air right where you crashed, above whatever you hit
    const x = Math.max(120, p.x - 60); let top = 1e9; for (let k = -60; k <= 520; k += 20) top = Math.min(top, groundAt(x + k)); for (const s2 of C.spires) if (s2.x > x - 60 && s2.x < x + 520) top = Math.min(top, groundAt(s2.x) - s2.h); p.x = x; p.y = (x < 300 ? 0 : top - 200); p.vx = 260; p.vy = 0; p.sp = 260; p.th = .1; p.crash = 0; }
  // the computer pilot: keep clear of the ground ahead, use the updrafts, boost when low
  function botCtl(p) {
    const sp = p.sp || 0; let need = 1e9;
    for (let k = 40; k < 760; k += 40) need = Math.min(need, groundAt(p.x + k) - 110 - k * .06);
    for (const s2 of C.spires) if (s2.x > p.x && s2.x - p.x < 560) need = Math.min(need, groundAt(s2.x) - s2.h - 50);
    const low = p.y - need, slow = sp < 95 * Math.sqrt(p.S.m / Math.max(.6, p.S.A)) * 1.45;
    const ctl = low > 0 && !slow ? -1 : low < -260 * p.skill || (slow && low < -60) ? 1 : 0;
    return [ctl, (low > 40 || (slow && low > -40)) && p.fuel > 0];
  }
  /* ---------- state ---------- */
  let mode = 'lobby', phase = 'build', roster = [], P = [], mine = 0, buildT = BUILD_T, raceT = 0, cdT = 0, t = 0, camX = 0, camY = 0, camZ = .8, design = {}, tool = 'wing', ready = false, readyIds = new Set(), designs = {}, results = null, sendT = 0, botT = 0, overT = 0, seed = 1;
  const host = () => MP.isHost();
  const SV = () => { const s = K.save; if (!s.sd) s.sd = { design: null, wins: 0 }; return s.sd; };
  /* ---------- match flow ---------- */
  function startMatch(ros, cfg) {
    roster = ros; seed = (cfg && cfg.seed) || 1 + Math.floor(Math.random() * 1e6); C = course(seed); mine = Math.max(0, ros.findIndex(r => r.id === MP.id && !r.bot)); if (K.bot) mine = -1;
    design = Object.assign({}, SV().design || PRESETS.Dart); mode = 'play'; phase = 'build'; buildT = BUILD_T; ready = false; readyIds = new Set(); designs = {}; results = null; t = 0;
    ros.forEach((r, i) => { if (r.bot) designs[r.id] = botDesign(i); });
    if (K.bot) { ros.forEach((r, i) => designs[r.id] = botDesign(i)); beginRace(); }
  }
  function botDesign(i) { const k = Object.keys(PRESETS)[i % 3], D = Object.assign({}, PRESETS[k]); if (i % 2) D['2,0'] = 'fin'; return D; }
  function setReady() {
    if (ready) return; ready = true; SV().design = design; K.persist(); K.sfx(660, .1, 'triangle', .08);
    if (MP.online() && !host()) MP.to(MP.hostId, { t: 'ready', d: design }); else { readyIds.add(roster[mine].id); designs[roster[mine].id] = design; }
  }
  function beginRace() {
    for (const r of roster) if (!designs[r.id]) designs[r.id] = r.id === (roster[mine] || {}).id ? design : PRESETS.Dart;
    P = roster.map((r, i) => newPilot(r, i, cleanD(designs[r.id]))); phase = 'count'; cdT = 3.2; raceT = 0; for (const R of C.rings) R.hit.clear();
    if (MP.online() && host()) MP.send({ t: 'race', d: designs });
    const me = P[mine]; camX = me ? me.x - 400 : 0; camY = me ? me.y - 300 : 0;
  }
  function cleanD(D) { const o = {}; if (!D || typeof D !== 'object') return o; for (const k in D) if (/^\d,\d$/.test(k) && PART[D[k]] && k !== PX + ',' + PY) o[k] = D[k]; return o; }
  function finishRace() {
    if (phase === 'over') return; phase = 'over'; overT = 0;
    const order = P.map(p => ({ i: p.i, name: p.name, col: p.col, done: p.done, time: p.done ? p.time : 999, x: p.x, rings: p.rings })).sort((a, b) => a.done !== b.done ? (a.done ? -1 : 1) : a.done ? a.time - b.time : b.x - a.x);
    results = order; if (MP.online() && host()) MP.send({ t: 'res', r: order });
    endLocal();
  }
  function endLocal() {
    const place = results.findIndex(q => q.i === mine), me = results[place];
    if (K.bot || !me) return K.over();
    K.score = Math.max(0, 1000 - place * 120) + me.rings * 20 + (me.done ? Math.max(0, Math.round(150 - me.time)) * 2 : 0);
    if (place === 0) { SV().wins++; K.persist(); }
    K.runCoins += Math.max(1, 8 - place);
    setTimeout(() => K.over({ title: place === 0 ? 'You win the derby!' : ['', '2nd place!', '3rd place!'][place] || (place + 1) + 'th place', text: (me.done ? 'Time ' + me.time.toFixed(1) + 's' : 'Did not finish') + ' · ' + me.rings + ' rings', delay: 200 }), 2600);
  }
  /* ---------- online ---------- */
  Object.assign(MP.opts, {
    max: 8, min: 1, bots: 6, solo: 'Race the bots', sub: 'Up to 8 players. Bots fill the empty spots.',
    config: () => ({ seed: 1 + Math.floor(Math.random() * 1e6) }),
    onStart: (cfg, ros) => startMatch(ros, cfg),
    onMsg: m => {
      if (mode !== 'play') return;
      if (m.t === 'ready' && host() && phase === 'build') { const r = roster.find(q => q.id === m.from); if (r) { readyIds.add(r.id); designs[r.id] = cleanD(m.d); } }
      else if (m.t === 'race' && !host() && phase === 'build') { designs = m.d || {}; for (const k in designs) designs[k] = cleanD(designs[k]); if (!ready) designs[roster[mine].id] = design; beginRace(); }
      else if (m.t === 'pos') { const p = P.find(q => q.id === m.from); if (p && p.i !== mine) { p.tx = m.x; p.ty = m.y; p.th = m.a; p.boost = !!m.b; p.crash = m.c ? .5 : 0; if (p.x === undefined || Math.abs(p.x - m.x) > 400) { p.x = m.x; p.y = m.y; } } }
      else if (m.t === 'fin') { const p = P.find(q => q.id === m.from); if (p) { p.done = true; p.time = +m.time || 999; p.rings = m.r | 0; p.x = Math.max(p.x, L); } }
      else if (m.t === 'bots' && !host()) m.b.forEach(([i, x, y, a, b, d, tm]) => { const p = P[i]; if (p && p.bot) { p.tx = x; p.ty = y; p.th = a; p.boost = !!b; if (d && !p.done) { p.done = true; p.time = tm; } } });
      else if (m.t === 'res' && !host()) { results = m.r; phase = 'over'; overT = 0; endLocal(); }
    },
    onLeave: id => { if (mode !== 'play') return; if (id === -1 || id === MP.hostId) { if (phase !== 'over') { phase = 'over'; results = null; K.over({ title: 'Race called off', text: 'The host left the room.' }); } return; } const p = P.find(q => q.id === id); if (p) { p.bot = true; p.name += ' (bot)'; } const r = roster.find(q => q.id === id); if (r) { r.bot = true; readyIds.add(id); if (!designs[id]) designs[id] = PRESETS.Dart; } },
    onHost: () => { if (mode === 'play' && phase !== 'over') { phase = 'over'; K.over({ title: 'Race called off', text: 'The host left the room.' }); } },
  });
  /* ---------- input ---------- */
  const keys = {}; let touchUp = false, touchBoost = false, touched = false, drag = null;
  GAME.key = (c, d) => { keys[c] = d; if (d && phase === 'build' && (c === 'Enter')) setReady(); };
  const myCtl = () => (keys.KeyW || keys.ArrowUp || touchUp ? -1 : 0) + (keys.KeyS || keys.ArrowDown ? 1 : 0), myBoost = () => !!(keys.Space || touchBoost);
  // the workshop layout
  const GX = 150, GY0 = 170, CS = 62, PAL = i => ({ x: 760 + (i % 2) * 210, y: 150 + Math.floor(i / 2) * 92, w: 196, h: 80 }), PRE = i => ({ x: 760 + i * 140, y: 446, w: 128, h: 40 }), RDY = { x: 760, y: 600, w: 406, h: 70 }, CLR = { x: 760, y: 500, w: 406, h: 40 };
  const inR = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  const BOOST = { x: 1150, y: 610, r: 70 };
  function buildDown(x, y, right) {
    if (ready) return;
    for (let i = 0; i < PK.length; i++) if (inR(PAL(i), x, y)) { tool = PK[i]; K.sfx(520, .05, 'triangle', .05); return; }
    for (let i = 0; i < 3; i++) if (inR(PRE(i), x, y)) { design = Object.assign({}, Object.values(PRESETS)[i]); K.sfx(620, .06, 'triangle', .06); return; }
    if (inR(CLR, x, y)) { design = {}; K.sfx(300, .08, 'triangle', .06); return; }
    if (inR(RDY, x, y)) { setReady(); return; }
    const cx = Math.floor((x - GX) / CS), cy = Math.floor((y - GY0) / CS);
    if (cx >= 0 && cy >= 0 && cx < GC && cy < GR && !(cx === PX && cy === PY)) { const k = cx + ',' + cy; drag = right || design[k] === tool ? 'erase' : 'paint'; paint(k); }
  }
  function paint(k) {
    if (drag === 'erase') { if (design[k]) { delete design[k]; K.sfx(300, .05, 'triangle', .05); } return; }
    if (design[k] === tool) return; const old = design[k]; design[k] = tool;
    if (stats(design).cost > BUDGET) { if (old) design[k] = old; else delete design[k]; K.sfx(160, .1, 'sawtooth', .06); msgT = 1.2; return; }
    K.sfx(700, .04, 'square', .04);
  }
  let msgT = 0;
  GAME.down = (x, y, e) => {
    if (e && e.pointerType === 'touch') touched = true;
    if (mode !== 'play') return;
    if (phase === 'build') return buildDown(x, y, e && e.button === 2);
    if (touched && Math.hypot(x - BOOST.x, y - BOOST.y) < BOOST.r) { touchBoost = true; return; }
    touchUp = true;
  };
  GAME.move = (x, y) => { if (phase !== 'build' || !drag || ready) return; const cx = Math.floor((x - GX) / CS), cy = Math.floor((y - GY0) / CS); if (cx >= 0 && cy >= 0 && cx < GC && cy < GR && !(cx === PX && cy === PY)) paint(cx + ',' + cy); };
  GAME.up = () => { drag = null; touchUp = false; touchBoost = false; };
  addEventListener('contextmenu', e => { if (mode === 'play' && phase === 'build') e.preventDefault(); });
  /* ---------- kit hooks ---------- */
  GAME.reset = () => {
    for (const k in keys) keys[k] = false; touchUp = touchBoost = false;
    if (K.bot) { startMatch(['Blip', 'Zap', 'Mango', 'Pixel', 'Turbo', 'Noodle'].map((n, i) => ({ id: 'b' + i, name: 'Bot ' + n, col: MP.colors[i], bot: true, seat: i })), { seed: 1 + Math.floor(Math.random() * 1e5) }); return; }
    mode = 'lobby'; P = []; MP.show();
  };
  GAME.update = dt => {
    t += dt; if (msgT > 0) msgT -= dt;
    if (mode !== 'play') return;
    if (phase === 'build') {
      buildT -= dt;
      if (host()) { const humans = roster.filter(r => !r.bot); if (buildT <= 0 || humans.every(r => readyIds.has(r.id))) { if (!ready) { ready = true; designs[roster[mine].id] = design; SV().design = design; K.persist(); } beginRace(); } }
      else if (buildT <= -5 && !ready) setReady();
      return;
    }
    if (phase === 'count') { const n = Math.ceil(cdT); cdT -= dt; if (Math.ceil(cdT) !== n && !K.bot) K.sfx(cdT <= 0 ? 880 : 440, .15, 'square', .06); if (cdT <= 0) { phase = 'race'; for (const p of P) { p.vx = 300; p.vy = 0; p.sp = 300; p.th = -.05; } } follow(dt); return; }
    if (phase === 'race') {
      raceT += dt;
      for (const p of P) {
        if (p.i === mine && !K.bot) fly(p, dt, myCtl(), myBoost());
        else if (p.bot && host()) { const [c, b] = botCtl(p); fly(p, dt, c, b); }
        else if (p.tx !== undefined) { const k = Math.min(1, dt * 10); p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; }
      }
      if (MP.online()) {
        const me = P[mine]; if ((sendT -= dt) <= 0 && me) { sendT = 1 / 12; MP.send({ t: 'pos', x: Math.round(me.x), y: Math.round(me.y), a: +me.th.toFixed(2), b: me.boost ? 1 : 0, c: me.crash > 0 ? 1 : 0 }); }
        if (host() && (botT -= dt) <= 0) { botT = 1 / 12; MP.send({ t: 'bots', b: P.filter(p => p.bot).map(p => [p.i, Math.round(p.x), Math.round(p.y), +p.th.toFixed(2), p.boost ? 1 : 0, p.done ? 1 : 0, +p.time.toFixed(2)]) }); }
      }
      if (host() && (P.every(p => p.done) || raceT > RACE_MAX || (P.some(p => !p.bot) && P.filter(p => !p.bot).every(p => p.done) && raceT > Math.min(RACE_MAX, Math.max(...P.filter(p => p.done).map(p => p.time)) + 12)))) finishRace();
      const me = P[mine]; if (me && me.boost && Math.random() < .6) K.burst(me.x - camX - Math.cos(me.th) * 26, me.y - camY - Math.sin(me.th) * 26, ['#ffd23f', '#ff8a3a', '#fff'], 2, 90, { gravity: 0, life: .3, size: 6 });
      follow(dt);
      return;
    }
    if (phase === 'over') { overT += dt; for (const p of P) if (p.i === mine || p.bot) fly(p, dt, 0, false); follow(dt); }
  };
  function follow(dt) {
    const me = P[mine] || [...P].sort((a, b) => b.x - a.x)[0]; if (!me) return;
    const up = Math.max(0, groundAt(me.x + 200) - me.y);   // high above the ground: pull back so it stays in view
    camZ = lp(camZ, cl(Math.min(.95 - Math.hypot(me.vx, me.vy) / 1600, 470 / (up + 260)), .42, .9), dt * 1.5);
    const tx = me.x - 400 / camZ, ty = (me.y + Math.min(me.y + up, me.y + 380)) / 2 - 360 / camZ; camX = lp(camX, tx, Math.min(1, dt * 5)); camY = lp(camY, ty, Math.min(1, dt * 4));
  }
  GAME.bot = () => {};
  /* ---------- drawing ---------- */
  function drawSky(g) {
    const v = K.view, gr = g.createLinearGradient(0, v.y0, 0, v.y1); gr.addColorStop(0, '#3a7fd8'); gr.addColorStop(.55, '#8ccdf5'); gr.addColorStop(1, '#ffe2b8'); g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.fillStyle = 'rgba(255,240,200,.9)'; g.beginPath(); g.arc(1040, 140, 52, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,240,200,.25)'; g.beginPath(); g.arc(1040, 140, 90, 0, TAU); g.fill();
    // far mountains (slow parallax)
    for (const [k, col, amp, base] of [[.12, '#8fb4dd', 160, 430], [.25, '#6f97c6', 130, 500], [.42, '#557ab0', 110, 560]]) {
      g.fillStyle = col; g.beginPath(); g.moveTo(v.x0, v.y1);
      for (let x = v.x0; x <= v.x1 + 20; x += 20) { const wx = x + camX * k; g.lineTo(x, base - camY * k * .3 - Math.abs(Math.sin(wx * .004 + k * 9)) * amp - Math.sin(wx * .011) * amp * .25); }
      g.lineTo(v.x1, v.y1); g.fill();
      if (k < .2) { g.fillStyle = 'rgba(255,255,255,.7)'; for (let x = v.x0; x <= v.x1; x += 20) { const wx = x + camX * k, y = base - camY * k * .3 - Math.abs(Math.sin(wx * .004 + k * 9)) * amp - Math.sin(wx * .011) * amp * .25; if (y < base - amp * .78) g.fillRect(x, y, 20, 6); } }
    }
    for (let i = 0; i < 6; i++) { const x = ((i * 380 - camX * .2 - t * 8) % 1900 + 1900) % 1900 - 300, y = 90 + (i * 53) % 160 - camY * .05; cloud(g, x, y, 1 + (i % 3) * .3); }
  }
  function cloud(g, x, y, s) { g.fillStyle = 'rgba(255,255,255,.85)'; for (const [dx, dy, r] of [[0, 0, 30], [32, -12, 36], [70, 0, 30], [36, 10, 30]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill(); } }
  function world(g) {
    const v = K.view, x0 = camX + (v.x0) / camZ - 40, x1 = camX + v.x1 / camZ + 40;
    // updrafts: rising streaks
    for (const D of C.drafts) { if (D.x + D.w < x0 || D.x - D.w > x1) continue; const up = D.s > 0, gy = groundAt(D.x);
      const gr = g.createLinearGradient(0, gy - 700, 0, gy); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, up ? 'rgba(255,255,255,.22)' : 'rgba(80,40,120,.18)'); g.fillStyle = gr; g.fillRect(D.x - D.w, gy - 700, D.w * 2, 700);
      g.strokeStyle = up ? 'rgba(255,255,255,.6)' : 'rgba(90,50,140,.45)'; g.lineWidth = 2.5; for (let k = 0; k < 10; k++) { const xx = D.x - D.w + (k + .5) * D.w * .2, ph = ((t * (up ? 160 : -120) + k * 97) % 700 + 700) % 700, yy = gy - (up ? ph : 700 - ph); g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + (up ? 40 : -40)); g.stroke(); } }
    // the mountain
    g.beginPath(); g.moveTo(x0, groundAt(x0) + 2000); for (let x = x0; x <= x1; x += 16) g.lineTo(x, groundAt(x)); g.lineTo(x1, groundAt(x1) + 2000); g.closePath();
    const gr = g.createLinearGradient(0, camY, 0, camY + 900 / camZ); gr.addColorStop(0, '#5fae4a'); gr.addColorStop(.3, '#3f8a3a'); gr.addColorStop(1, '#2a5a2e'); g.fillStyle = gr; g.fill();
    g.strokeStyle = '#8ad66a'; g.lineWidth = 5; g.beginPath(); for (let x = x0; x <= x1; x += 16) x === x0 ? g.moveTo(x, groundAt(x)) : g.lineTo(x, groundAt(x)); g.stroke();
    // snow on the ridge tops
    for (const R of C.ridges) { if (R.x + R.w < x0 || R.x - R.w > x1) continue; g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); const top = groundAt(R.x); g.moveTo(R.x - R.w * .35, groundAt(R.x - R.w * .35)); for (let x = R.x - R.w * .35; x <= R.x + R.w * .35; x += 10) g.lineTo(x, groundAt(x)); g.lineTo(R.x + R.w * .3, groundAt(R.x + R.w * .3) + 26); g.lineTo(R.x, top + 40); g.lineTo(R.x - R.w * .3, groundAt(R.x - R.w * .3) + 22); g.fill(); }
    for (const tr of C.trees) { if (tr.x < x0 || tr.x > x1) continue; const y = groundAt(tr.x) + 4, s = tr.s; g.fillStyle = '#5a3a20'; g.fillRect(tr.x - 2 * s, y - 10 * s, 4 * s, 10 * s); g.fillStyle = '#245a2e'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(tr.x - (14 - k * 3) * s, y - (8 + k * 11) * s); g.lineTo(tr.x + (14 - k * 3) * s, y - (8 + k * 11) * s); g.lineTo(tr.x, y - (26 + k * 11) * s); g.fill(); } }
    for (const sp of C.spires) { if (sp.x + sp.w < x0 || sp.x - sp.w > x1) continue; const gy = groundAt(sp.x); g.fillStyle = '#7a6a6a'; g.beginPath(); g.moveTo(sp.x - sp.w / 2, gy + 10); g.lineTo(sp.x - sp.w * .12, gy - sp.h); g.lineTo(sp.x + sp.w * .08, gy - sp.h + 8); g.lineTo(sp.x + sp.w / 2, gy + 10); g.fill(); g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(sp.x, gy + 10); g.lineTo(sp.x + sp.w * .08, gy - sp.h + 8); g.lineTo(sp.x + sp.w / 2, gy + 10); g.fill(); }
    // checkpoints and the finish
    for (const cp of C.cps) { if (cp < x0 || cp > x1) continue; const y = groundAt(cp); g.fillStyle = '#fff'; g.fillRect(cp - 2, y - 70, 4, 70); g.fillStyle = '#3ec5ff'; g.beginPath(); g.moveTo(cp + 2, y - 70); g.lineTo(cp + 34, y - 60); g.lineTo(cp + 2, y - 50); g.fill(); }
    if (L > x0 - 200 && L < x1 + 400) { const y = groundAt(L); for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#c8503a' : '#e8d4b0'; g.fillRect(L + 60 + k * 70, y - 60, 56, 60); g.fillStyle = '#7a3a2a'; g.beginPath(); g.moveTo(L + 52 + k * 70, y - 60); g.lineTo(L + 88 + k * 70, y - 92); g.lineTo(L + 124 + k * 70, y - 60); g.fill(); } g.fillStyle = '#fff'; g.fillRect(L - 4, y - 320, 8, 320); g.fillRect(L + 296, y - 320, 8, 320); for (let k = 0; k < 15; k++) { g.fillStyle = k % 2 ? '#111' : '#fff'; g.fillRect(L + k * 20, y - 330, 20, 26); } g.font = '28px "Lilita One"'; g.textAlign = 'center'; g.fillStyle = '#ffd23f'; g.fillText('FINISH', L + 150, y - 350); }
    // rings
    for (const R of C.rings) { if (R.x < x0 || R.x > x1) continue; const got = mine >= 0 && R.hit.has(mine); g.strokeStyle = got ? 'rgba(255,255,255,.35)' : '#ffd23f'; g.lineWidth = 7; g.beginPath(); g.ellipse(R.x, R.y, 12, R.r, 0, 0, TAU); g.stroke(); if (!got) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.ellipse(R.x - 2, R.y, 9, R.r - 4, 0, Math.PI * .6, Math.PI * 1.4); g.stroke(); } }
  }
  function drawGlider(g, D, col, x, y, th, sc, boost, ghost) {   // drawn from its parts, centred on the pilot
    g.save(); g.translate(x, y); g.rotate(th); g.scale(sc, sc); if (ghost) g.globalAlpha *= .75;
    const s = 9;
    for (const k in D) { const P2 = PART[D[k]], [cx, cy] = k.split(',').map(Number), X = (cx - PX) * s, Y = (cy - PY) * s * .55; if (!P2) continue;
      if (D[k] === 'wing') { g.fillStyle = '#f4f4f8'; g.beginPath(); g.moveTo(X - s * .6, Y - 2); g.lineTo(X + s * .7, Y - 3); g.lineTo(X + s * .4, Y + 2); g.lineTo(X - s * .6, Y + 2); g.fill(); g.fillStyle = col; g.fillRect(X - s * .6, Y, s * 1.1, 1.6); }
      else if (D[k] === 'fin') { g.fillStyle = '#ff6a4a'; g.beginPath(); g.moveTo(X - s * .5, Y + 2); g.lineTo(X - s * .5, Y - 7); g.lineTo(X + s * .5, Y + 2); g.fill(); }
      else if (D[k] === 'rocket') { g.fillStyle = '#8a8ea0'; g.fillRect(X - s * .5, Y - 2.5, s, 5); g.fillStyle = '#ff4d6d'; g.fillRect(X - s * .5, Y - 2.5, 2, 5); if (boost) { g.fillStyle = Math.random() < .5 ? '#ffd23f' : '#ff8a3a'; g.beginPath(); g.moveTo(X - s * .5, Y - 2.5); g.lineTo(X - s * .5 - 10 - Math.random() * 8, Y); g.lineTo(X - s * .5, Y + 2.5); g.fill(); } }
      else if (D[k] === 'balloon') { g.strokeStyle = '#ccc'; g.lineWidth = .8; g.beginPath(); g.moveTo(X, Y); g.lineTo(X, Y - 8); g.stroke(); g.fillStyle = '#ff7ad9'; g.beginPath(); g.ellipse(X, Y - 12, 5, 6, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(X - 1.5, Y - 14, 1.5, 0, TAU); g.fill(); }
      else if (D[k] === 'nose') { g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(X - s * .5, Y - 3.5); g.lineTo(X + s * .6, Y); g.lineTo(X - s * .5, Y + 3.5); g.fill(); }
      else { g.fillStyle = '#c8a46a'; g.fillRect(X - s * .5, Y - 1.5, s, 3); }
    }
    g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, 7, 4.5, 0, 0, TAU); g.fill(); g.fillStyle = '#ffe0bc'; g.beginPath(); g.arc(1.5, -4, 3, 0, TAU); g.fill(); g.fillStyle = '#3a2a1a'; g.fillRect(-.5, -7, 5, 2);
    g.restore();
  }
  function drawRace(g) {
    const v = K.view;
    drawSky(g);
    g.save(); g.translate(0, 0); g.scale(camZ, camZ); g.translate(-camX, -camY);
    world(g);
    for (const p of P) { if (p.i === mine) continue; drawGlider(g, p.D, p.col, p.x, p.y, p.th + (p.crash > 0 ? t * 9 : 0), posed ? 2.6 : 1.9, p.boost, !posed); if (!posed) { g.font = '14px "Lilita One"'; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.4)'; g.fillText(p.name, p.x + 1, p.y - 23); g.fillStyle = p.col; g.fillText(p.name, p.x, p.y - 24); } }
    const me = P[mine]; if (me) { drawGlider(g, me.D, me.col, me.x, me.y, me.th, 2.2, me.boost, false); if (me.crash > 0) { g.font = '22px "Lilita One"'; g.textAlign = 'center'; g.fillStyle = '#ff4d6d'; g.fillText('CRASH!', me.x, me.y - 40); } }
    g.restore();
    if (posed) return;
    // HUD: the race line with everyone on it, place, speed, fuel
    g.fillStyle = 'rgba(10,30,60,.55)'; g.beginPath(); g.roundRect(240, 16, 800, 34, 17); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(260, 31, 760, 4);
    for (const cp of C.cps) { g.fillStyle = '#3ec5ff'; g.fillRect(260 + cp / L * 760 - 1, 26, 2, 14); }
    for (const p of [...P].sort((a, b) => (a.i === mine) - (b.i === mine))) { const x = 260 + cl(p.x / L, 0, 1) * 760; g.fillStyle = p.col; g.beginPath(); g.arc(x, 33, p.i === mine ? 9 : 6, 0, TAU); g.fill(); if (p.i === mine) { g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.stroke(); } }
    g.fillStyle = '#ffd23f'; g.fillRect(1018, 22, 4, 22);
    if (me) {
      const place = [...P].sort((a, b) => a.done !== b.done ? (a.done ? -1 : 1) : a.done ? a.time - b.time : b.x - a.x).indexOf(me) + 1;
      g.textAlign = 'left'; g.font = '46px "Lilita One"'; g.lineWidth = 7; g.strokeStyle = 'rgba(0,0,0,.35)'; const pl = place + ['ST', 'ND', 'RD'][place - 1 > 2 ? 3 : place - 1] || place + 'TH'; const pls = place + (['ST', 'ND', 'RD'][place - 1] || 'TH'); g.strokeText(pls, 76, 60); g.fillStyle = '#fff'; g.fillText(pls, 76, 60); void pl;
      g.font = '18px "Lilita One"'; g.fillStyle = '#fff'; g.fillText('of ' + P.length, 82, 86);
      g.font = '20px "Lilita One"'; g.fillText(Math.round(Math.hypot(me.vx, me.vy) / 2.5) + ' km/h', 30, v.y1 - 70); g.fillText(raceT.toFixed(1) + 's', 30, v.y1 - 42);
      if (me.S.fuel) { g.fillStyle = 'rgba(10,30,60,.55)'; g.fillRect(170, v.y1 - 58, 160, 16); g.fillStyle = me.boost ? '#ffd23f' : '#ff8a3a'; g.fillRect(170, v.y1 - 58, 160 * cl(me.fuel / me.S.fuel, 0, 1), 16); g.fillStyle = '#fff'; g.font = '14px "Lilita One"'; g.fillText('BOOST (SPACE)', 172, v.y1 - 68); }
      g.textAlign = 'right'; g.font = '20px "Lilita One"'; g.fillStyle = '#ffd23f'; g.fillText('◯ ' + me.rings + ' rings', v.x1 - 30, 80);
      const st = me.stall && phase === 'race' && !me.crash; if (st) { g.textAlign = 'center'; g.font = '26px "Lilita One"'; g.fillStyle = Math.sin(t * 14) > 0 ? '#ff4d6d' : '#fff'; g.fillText('STALL! DIVE TO GET SPEED', 640, 130); }
      if (touched && phase === 'race') { g.globalAlpha = .5; g.fillStyle = touchBoost ? '#ffd23f' : '#fff'; g.beginPath(); g.arc(BOOST.x, BOOST.y, BOOST.r, 0, TAU); g.fill(); g.globalAlpha = 1; g.font = '20px "Lilita One"'; g.textAlign = 'center'; g.fillStyle = '#2a3048'; g.fillText('BOOST', BOOST.x, BOOST.y + 7); g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '16px "Lilita One"'; g.fillText('hold anywhere else to pull up', 320, v.y1 - 18); }
    }
    if (phase === 'count') { const n = Math.ceil(cdT); big(g, n > 0 ? String(n) : 'GO!', '#fff'); }
    if (phase === 'race' && raceT < .8) big(g, 'GO!', '#ffd23f');
    if (phase === 'over' && results) {
      g.globalAlpha = Math.min(1, overT * 2); g.fillStyle = 'rgba(10,30,60,.75)'; g.beginPath(); g.roundRect(390, 120, 500, 70 + results.length * 44, 22); g.fill();
      g.textAlign = 'center'; g.font = '36px "Lilita One"'; g.fillStyle = '#ffd23f'; g.fillText('RESULTS', 640, 168);
      results.forEach((q, k) => { const y = 214 + k * 44; g.textAlign = 'left'; g.font = '24px "Lilita One"'; g.fillStyle = k === 0 ? '#ffd23f' : '#fff'; g.fillText((k + 1) + '.', 420, y); g.fillStyle = q.col; g.fillText(q.name + (q.i === mine ? ' (you)' : ''), 470, y); g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText(q.done ? q.time.toFixed(1) + 's' : 'DNF', 860, y); });
      g.globalAlpha = 1;
    }
  }
  function big(g, s, c) { g.textAlign = 'center'; g.font = '110px "Lilita One"'; g.lineWidth = 14; g.strokeStyle = 'rgba(0,0,0,.35)'; g.strokeText(s, 640, 330); g.fillStyle = c; g.fillText(s, 640, 330); }
  function drawBuild(g) {
    const v = K.view, gr = g.createLinearGradient(0, v.y0, 0, v.y1); gr.addColorStop(0, '#2a5a9a'); gr.addColorStop(1, '#14305a'); g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; for (let x = 0; x < 1280; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 720); g.stroke(); } for (let y = 0; y < 720; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(1280, y); g.stroke(); }
    const S = stats(design), R = rating(S), left = Math.max(0, Math.ceil(buildT));
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '40px "Lilita One"'; g.fillStyle = '#ffd23f'; g.fillText('THE WORKSHOP', 150, 60);
    g.font = '18px "Lilita One"'; g.fillStyle = '#cfe4ff'; g.fillText('Build your glider around the pilot. Drag to paint parts, right-click (or tap a part again) to remove.', 150, 100);
    g.textAlign = 'right'; g.font = '44px "Lilita One"'; g.fillStyle = left <= 10 ? '#ff6a6a' : '#fff'; g.fillText(left + 's', 1166, 60);
    // the grid
    for (let y = 0; y < GR; y++) for (let x = 0; x < GC; x++) {
      const X = GX + x * CS, Y = GY0 + y * CS, k = x + ',' + y, p = design[k], pil = x === PX && y === PY, ok = S.ok.has(k);
      g.fillStyle = pil ? 'rgba(255,210,63,.25)' : 'rgba(255,255,255,.07)'; g.beginPath(); g.roundRect(X + 2, Y + 2, CS - 4, CS - 4, 8); g.fill();
      if (p) { g.save(); g.translate(X + CS / 2, Y + CS / 2); partIcon(g, p, 1.9); g.restore(); if (!ok) { g.strokeStyle = '#ff6a6a'; g.lineWidth = 3; g.beginPath(); g.moveTo(X + 10, Y + 10); g.lineTo(X + CS - 10, Y + CS - 10); g.stroke(); } }
      if (pil) { g.fillStyle = MP.colors[mine] || '#ff4d6d'; g.beginPath(); g.ellipse(X + CS / 2, Y + CS / 2 + 6, 18, 11, 0, 0, TAU); g.fill(); g.fillStyle = '#ffe0bc'; g.beginPath(); g.arc(X + CS / 2 + 4, Y + CS / 2 - 8, 8, 0, TAU); g.fill(); g.fillStyle = '#3a2a1a'; g.fillRect(X + CS / 2 - 2, Y + CS / 2 - 17, 13, 5); }
    }
    g.textAlign = 'center'; g.font = '16px "Lilita One"'; g.fillStyle = '#cfe4ff'; g.fillText('◀ BACK                     FRONT ▶', GX + GC * CS / 2, GY0 + GR * CS + 22);
    if (Object.keys(design).some(k => !S.ok.has(k))) { g.fillStyle = '#ff8a8a'; g.fillText('Crossed-out parts aren\'t joined to the pilot, so they don\'t count', GX + GC * CS / 2, GY0 + GR * CS + 48); }
    // a preview in flight
    g.save(); g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.roundRect(150, 560, 558, 120, 16); g.fill(); g.restore();
    drawGlider(g, Object.fromEntries([...S.ok].filter(k => design[k]).map(k => [k, design[k]])), MP.colors[mine] || '#ff4d6d', 300, 620 + Math.sin(t * 2) * 6, -.08 + Math.sin(t * 1.3) * (1 - S.stab) * .25, 3.2, false, false);
    // stats
    Object.entries(R).forEach(([k, val], i) => { const y = 584 + i * 20; g.textAlign = 'left'; g.font = '14px "Lilita One"'; g.fillStyle = '#cfe4ff'; g.fillText(k, 450, y); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(520, y - 6, 170, 12); g.fillStyle = ['#5cf28a', '#3ec5ff', '#ffd23f', '#ff8a3a', '#ff7ad9'][i]; g.fillRect(520, y - 6, 170 * val, 12); });
    // parts
    PK.forEach((k, i) => { const b = PAL(i), on = tool === k, P2 = PART[k], can = S.cost + P2.cost <= BUDGET;
      g.fillStyle = on ? 'rgba(255,210,63,.3)' : 'rgba(255,255,255,.08)'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 14); g.fill(); g.strokeStyle = on ? '#ffd23f' : 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.stroke();
      g.save(); g.translate(b.x + 38, b.y + 40); partIcon(g, k, 2.2); g.restore();
      g.textAlign = 'left'; g.font = '19px "Lilita One"'; g.fillStyle = '#fff'; g.fillText(P2.name, b.x + 76, b.y + 24); g.font = '15px "Lilita One"'; g.fillStyle = can ? '#ffd23f' : '#ff8a8a'; g.textAlign = 'right'; g.fillText('$' + P2.cost, b.x + b.w - 12, b.y + 24); g.textAlign = 'left'; g.font = '12px Nunito'; g.font = '800 12px Nunito'; g.fillStyle = '#cfe4ff'; wrap(g, P2.tip, b.x + 76, b.y + 46, 114, 13); });
    g.textAlign = 'left'; g.font = '18px "Lilita One"'; g.fillStyle = '#fff'; g.fillText('QUICK BUILDS', 760, 432);
    Object.keys(PRESETS).forEach((k, i) => { const b = PRE(i); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 10); g.fill(); g.textAlign = 'center'; g.font = '18px "Lilita One"'; g.fillStyle = '#fff'; g.fillText(k, b.x + b.w / 2, b.y + b.h / 2 + 1); });
    g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.roundRect(CLR.x, CLR.y, CLR.w, CLR.h, 10); g.fill(); g.textAlign = 'center'; g.font = '16px "Lilita One"'; g.fillStyle = '#cfe4ff'; g.fillText('Clear  ·  budget $' + S.cost + ' / $' + BUDGET, CLR.x + CLR.w / 2, CLR.y + CLR.h / 2 + 1);
    const rg = g.createLinearGradient(0, RDY.y, 0, RDY.y + RDY.h); rg.addColorStop(0, ready ? '#5cbf6a' : '#ffd23f'); rg.addColorStop(1, ready ? '#2a7a3a' : '#e09a1a'); g.fillStyle = rg; g.beginPath(); g.roundRect(RDY.x, RDY.y, RDY.w, RDY.h, 18); g.fill();
    g.font = '30px "Lilita One"'; g.fillStyle = ready ? '#fff' : '#3a2408'; g.fillText(ready ? 'READY! WAITING...' : 'READY (ENTER)', RDY.x + RDY.w / 2, RDY.y + RDY.h / 2 + 2);
    if (MP.online()) { g.font = '15px "Lilita One"'; g.fillStyle = '#cfe4ff'; g.fillText(roster.filter(r => !r.bot && readyIds.has(r.id)).length + ' / ' + roster.filter(r => !r.bot).length + ' players ready', RDY.x + RDY.w / 2, RDY.y - 14); }
    if (msgT > 0) { g.textAlign = 'center'; g.font = '22px "Lilita One"'; g.fillStyle = '#ff8a8a'; g.fillText('Over budget!', CLR.x + CLR.w / 2, CLR.y + CLR.h + 22); }
  }
  function partIcon(g, k, s) {
    g.save(); g.scale(s, s);
    if (k === 'wing') { g.fillStyle = '#f4f4f8'; g.beginPath(); g.moveTo(-10, -2); g.lineTo(10, -4); g.lineTo(7, 3); g.lineTo(-10, 3); g.fill(); g.fillStyle = '#3ec5ff'; g.fillRect(-10, 1, 16, 2); }
    else if (k === 'fin') { g.fillStyle = '#ff6a4a'; g.beginPath(); g.moveTo(-8, 5); g.lineTo(-8, -9); g.lineTo(8, 5); g.fill(); }
    else if (k === 'rocket') { g.fillStyle = '#8a8ea0'; g.fillRect(-9, -4, 16, 8); g.fillStyle = '#ff4d6d'; g.fillRect(-9, -4, 3, 8); g.fillStyle = '#c8ccd8'; g.beginPath(); g.moveTo(7, -4); g.lineTo(11, 0); g.lineTo(7, 4); g.fill(); g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(-9, -3); g.lineTo(-14, 0); g.lineTo(-9, 3); g.fill(); }
    else if (k === 'balloon') { g.strokeStyle = '#ddd'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 9); g.lineTo(0, 2); g.stroke(); g.fillStyle = '#ff7ad9'; g.beginPath(); g.ellipse(0, -3, 7, 8, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(-2, -6, 2, 0, TAU); g.fill(); }
    else if (k === 'nose') { g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(-8, -6); g.lineTo(10, 0); g.lineTo(-8, 6); g.fill(); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-8, -5, 6, 3); }
    else { g.fillStyle = '#c8a46a'; g.fillRect(-10, -3, 20, 6); g.fillStyle = '#8a6a3a'; g.fillRect(-10, -3, 20, 1.5); g.fillStyle = '#5a3a1a'; g.beginPath(); g.arc(-6, 0, 1.2, 0, TAU); g.arc(6, 0, 1.2, 0, TAU); g.fill(); }
    g.restore();
  }
  function wrap(g, s, x, y, w, lh) { const out = []; let line = ''; for (const word of s.split(' ')) { const tr = line ? line + ' ' + word : word; if (g.measureText(tr).width > w && line) { out.push(line); line = word; } else line = tr; } out.push(line); out.forEach((l, i) => g.fillText(l, x, y + i * lh)); }
  GAME.draw = g => {
    if (mode !== 'play' || !C) { C = C || course(7); drawSky(g); return; }
    if (phase === 'build') return drawBuild(g);
    drawRace(g);
  };
  let posed = false;
  GAME.pose = () => {   // cover art: the pack racing past a ring over an updraft
    for (let i = 0; i < 60 * 6; i++) GAME.update(1 / 60);
    const D0 = C.drafts.filter(d => d.s > 0).sort((a, b) => a.x - b.x)[1] || C.drafts[0], x = D0.x, y = groundAt(x) - 300; posed = true;
    const form = [[0, 0, -.25, 1], [-110, 46, -.15, 0], [-210, -40, -.3, 1], [-80, -96, -.2, 0], [-300, 30, -.1, 0], [-250, 110, -.05, 0]];
    P.forEach((p, i) => { const f = form[i % form.length]; p.x = x + f[0]; p.y = y + f[1]; p.th = f[2]; p.boost = !!f[3]; p.crash = 0; p.done = false; });
    C.rings.push({ x: x + 170, y: y - 30, r: 46, hit: new Set() });
    camZ = 1.05; camX = x - 760 / camZ; camY = y - 330 / camZ;
  };
  GAME.test = { st: () => ({ mode, phase, raceT: +raceT.toFixed(1), buildT: +buildT.toFixed(1), P: P.map(p => ({ name: p.name, x: Math.round(p.x), y: Math.round(p.y), done: p.done, time: +p.time.toFixed(1), crash: p.crash > 0, rings: p.rings, fuel: +p.fuel.toFixed(1) })) }), stats, PRESETS, design: () => design, setDesign: d => { design = d; }, ready: () => setReady(), P: () => P, C: () => C, botCtl, fly, mine: () => mine };
})();
