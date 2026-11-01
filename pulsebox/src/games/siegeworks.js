// @use mp
/* Siegeworks: build a fort on a floating island, arm it, and smash the other island's Core before they smash yours.
   Structures are real truss physics (position-based dynamics): bolts with mass, beams as distance constraints. Loads
   travel through the frame, beams stretch under strain and snap past their limit, and whatever is cut loose topples as
   a chunk and falls into the clouds. Wood is cheap and light, steel is strong and heavy. Devices sit on bolts: Cannons,
   Mortars, Rocket pods, Deflector domes and Generators, plus the Core you must protect.
   Online 1v1: each player's device runs the physics of their own fort and streams it to the other; shots are sent as
   launches and both sides fly them, but only a fort's owner decides the damage it takes. Offline: the computer builds
   from a set of designs and aims with a ballistic solver that gets sharper as it zeroes in. */
const GAME = {
  id: 'siegeworks', title: 'Siegeworks', tagline: 'Build it. Brace it. Blow theirs up.',
  font: 'Bungee', accent: '#ffb02e', accent2: '#5fd4ff', bg: '#1a1030', noSkins: true, noHud: true, scoreLabel: 'Siege score',
  how: [
    'Two floating islands, two forts, one goal: destroy the enemy Core before they destroy yours.',
    'BUILD: pick Wood or Steel and drag from any bolt (or from your island\'s ground) to add a beam. Triangles are strong; long unbraced towers sag and snap. Steel is tougher and heavier.',
    'Put devices on bolts: Cannons fire straight and fast, Mortars lob explosive shells over walls, Rocket pods fire volleys, Deflectors raise an energy dome, Generators earn extra gold.',
    'FIGHT: tap one of your weapons and drag to aim (the dotted arc shows the shot). It keeps firing every time it reloads. Keep building and repairing with the gold you earn.',
    'Play the computer, or create a room and battle a friend online.',
  ],
  skins: [{ name: 'Classic', price: 0 }],
};
(() => {
  'use strict';
  const TAU = Math.PI * 2, cl = (v, a, b) => v < a ? a : v > b ? b : v, lp = (a, b, t) => a + (b - a) * t;
  const GRAV = 560, DT = 1 / 60, ITER = 12, MAXLEN = 104, MINLEN = 18, SNAP = 18, BUILD_T = 75, MAXB = 150;
  const ISL = [{ x0: 40, x1: 500 }, { x0: 780, x1: 1240 }];
  const ZONE = [{ x0: 58, x1: 482, y0: 120 }, { x0: 798, x1: 1222, y0: 120 }];
  const SIDEC = ['#ffb02e', '#5fd4ff'], SIDEC2 = ['#ff6a3d', '#3d7bff'];
  // the top of each island: a gentle roll, rounding down at the edges
  const groundY = x => { for (let s = 0; s < 2; s++) { const I = ISL[s]; if (x >= I.x0 && x <= I.x1) { const u = (x - I.x0) / (I.x1 - I.x0); return 530 + Math.sin(u * 9 + s * 2) * 4 + Math.sin(u * 23 + s) * 2 + (u < .07 ? Math.pow(1 - u / .07, 2) * 40 : u > .93 ? Math.pow((u - .93) / .07, 2) * 40 : 0); } } return Infinity; };
  const MAT = {
    wood: { name: 'Wood', cost: 8, hp: 55, maxF: 9000, comp: 1.2e-5, kg: 1, col: '#9a6532', dark: '#5e3a1c' },
    steel: { name: 'Steel', cost: 24, hp: 150, maxF: 26000, comp: 3e-6, kg: 2.3, col: '#8792a3', dark: '#454d5c' },
  };
  const DEV = {
    core: { name: 'Core', cost: 0, hp: 420, kg: 5, r: 22 },
    cannon: { name: 'Cannon', cost: 140, hp: 110, kg: 3.5, r: 15, reload: 3.6, speed: [320, 780], dmg: 55, blast: 0, spread: .012 },
    mortar: { name: 'Mortar', cost: 190, hp: 110, kg: 4.5, r: 16, reload: 6.5, speed: [280, 620], dmg: 80, blast: 52, spread: .02, lob: true },
    rockets: { name: 'Rockets', cost: 250, hp: 100, kg: 3.5, r: 15, reload: 8, speed: [360, 640], dmg: 38, blast: 34, spread: .05, shots: 3 },
    shield: { name: 'Deflector', cost: 210, hp: 90, kg: 3, r: 14, energy: 260, dome: 78 },
    gen: { name: 'Generator', cost: 120, hp: 90, kg: 4.5, r: 15, inc: 3 },
  };
  const WEAP = ['cannon', 'mortar', 'rockets'];
  const TOOLS = ['wood', 'steel', 'cannon', 'mortar', 'rockets', 'shield', 'gen', 'del'];
  let rnd = Math.random;
  const seeded = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  /* ---------- forts: bolts, beams and devices ---------- */
  function newFort(side, name, bot) { return { side, name, bot: !!bot, nodes: [], beams: [], devs: [], gold: 650, ver: 1, dead: false, ready: false, lost: 0, ai: { t: 1, err: .17, rep: 2 } }; }
  function addNode(F, x, y) {
    const I = ISL[F.side], gy = groundY(x), pin = Math.abs(y - gy) < 9 && x > I.x0 + 14 && x < I.x1 - 14;
    if (!pin) x += (Math.random() - .5) * .6;   // a hair of imperfection: unbraced columns topple instead of balancing forever
    const n = { x, y: pin ? gy : y, px: x, py: pin ? gy : y, pin, m: 1, alive: true }; F.nodes.push(n); F.ver++; return F.nodes.length - 1;
  }
  function nearNode(F, x, y, r = SNAP) { let bi = -1, bd = r; F.nodes.forEach((n, i) => { if (!n.alive) return; const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; bi = i; } }); return bi; }
  const liveBeams = F => F.beams.filter(b => b.alive).length;
  function addBeam(F, a, b, mat) {
    if (a === b || a < 0 || b < 0 || F.beams.some(q => q.alive && ((q.a === a && q.b === b) || (q.a === b && q.b === a)))) return -1;
    const A = F.nodes[a], B = F.nodes[b]; F.beams.push({ a, b, mat, rest: Math.hypot(A.x - B.x, A.y - B.y), hp: MAT[mat].hp, alive: true, f: 0, lam: 0, hit: 0 }); F.ver++; masses(F); return F.beams.length - 1;
  }
  function masses(F) {
    for (const n of F.nodes) n.m = 1;
    for (const b of F.beams) if (b.alive) { const k = MAT[b.mat].kg * b.rest / 60; F.nodes[b.a].m += k / 2; F.nodes[b.b].m += k / 2; }
    for (const d of F.devs) if (d.alive) F.nodes[d.n].m += DEV[d.type].kg;
  }
  function addDev(F, type, n) {
    if (n < 0 || !F.nodes[n] || !F.nodes[n].alive || F.devs.some(d => d.alive && d.n === n)) return -1;
    const D = DEV[type]; F.devs.push({ type, n, hp: D.hp, alive: true, cd: D.reload ? 1.2 + Math.random() : 0, aim: null, ang: F.side ? Math.PI + .6 : -.6, e: D.energy || 0, eT: 0, flash: 0, spin: 0 }); F.ver++; masses(F); return F.devs.length - 1;
  }
  const devAt = (F, n) => F.devs.find(d => d.alive && d.n === n);
  const core = F => F.devs.find(d => d.type === 'core');

  /* ---------- physics: verlet bolts, beams solved as constraints, strain snaps them ---------- */
  // XPBD: each beam keeps the impulse it needed this step, so b.f is the real force it carries (tension or
  // compression). Wood flexes a little more than steel; a beam carrying more than its material can take snaps.
  function physics(F, dt) {
    const N = F.nodes, h2 = dt * dt;
    for (const n of N) { if (!n.alive || n.pin) continue; const vx = (n.x - n.px) * .995, vy = (n.y - n.py) * .995; n.px = n.x; n.py = n.y; n.x += vx; n.y += vy + GRAV * h2; }
    for (const b of F.beams) b.lam = 0;
    for (let it = 0; it < ITER; it++) {
      for (const b of F.beams) {
        if (!b.alive) continue; const A = N[b.a], B = N[b.b], wa = A.pin ? 0 : 1 / A.m, wb = B.pin ? 0 : 1 / B.m, w = wa + wb; if (!w) continue;
        const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || .001, at = MAT[b.mat].comp / h2, dl = (b.rest - d - at * b.lam) / (w + at);
        b.lam += dl; const nx = dx / d * dl, ny = dy / d * dl;
        A.x -= nx * wa; A.y -= ny * wa; B.x += nx * wb; B.y += ny * wb;
      }
      for (const n of N) if (n.alive && !n.pin) { const gy = groundY(n.x); if (n.y > gy) { n.y = gy; n.px = lp(n.px, n.x, .5); } }
    }
    for (const b of F.beams) {
      if (!b.alive) continue; b.f = (b.f || 0) * .75 + (b.lam / h2) * .25; if (b.hit > 0) b.hit -= dt;
      if (Math.abs(b.f) > MAT[b.mat].maxF && !F.grace) breakBeam(F, b, true);
    }
    if (F.grace) F.grace--;
    for (const n of N) if (n.alive && n.y > 860) killNode(F, n);
  }
  function breakBeam(F, b, strain) {
    if (!b.alive) return; b.alive = false; F.ver++; F.lost += MAT[b.mat].cost;
    const A = F.nodes[b.a], B = F.nodes[b.b], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, M = MAT[b.mat];
    splinters(mx, my, M, Math.atan2(B.y - A.y, B.x - A.x), b.rest);
    if (strain) sound('crack'); masses(F);
    for (const i of [b.a, b.b]) { const n = F.nodes[i]; if (n.alive && !n.pin && !devAt(F, i) && !F.beams.some(q => q.alive && (q.a === i || q.b === i))) n.alive = false; }
  }
  function killNode(F, n) {
    const i = F.nodes.indexOf(n); n.alive = false; F.ver++;
    for (const b of F.beams) if (b.alive && (b.a === i || b.b === i)) { b.alive = false; F.lost += MAT[b.mat].cost; }
    const d = devAt(F, i); if (d) destroyDev(F, d, true); masses(F);
  }
  function destroyDev(F, d, fell) {
    if (!d.alive) return; d.alive = false; F.ver++; F.lost += DEV[d.type].cost || 300; masses(F);
    const n = F.nodes[d.n]; boom(n.x, n.y, d.type === 'core' ? 90 : 40, SIDEC[F.side], d.type === 'core' ? 2 : 1);
    if (d.type === 'core') { F.dead = true; if (!fell || true) coreDown(F); }
  }

  /* ---------- shots: cannonballs, mortar shells, rockets ---------- */
  let forts = [], shots = [], debris = [], rings = [], pend = [], phase = 'build', buildT = BUILD_T, mySide = 0, demo = false, mode = 'lobby';
  let tool = 'wood', drag = null, aimSel = null, aimPt = null, overT = 0, winner = -1, flashT = 0, msg = null, acc = 0, t = 0, sendT = 0, lastVer = -1, bsT = 0, ended = false, sndT = {};
  const sim = F => !MP.online() || demo || F.side === mySide;      // whose physics and damage this device decides
  function launch(side, type, x, y, vx, vy, net) {
    shots.push({ side, type, x, y, ox: x, oy: y, vx, vy, t: 0, trail: [] });
    if (net && MP.online() && !demo) MP.send({ t: 'f', s: side, w: type, a: [Math.round(x), Math.round(y), Math.round(vx), Math.round(vy)] });
    sound(type);
  }
  const pivot = (F, d) => { const n = F.nodes[d.n]; return [n.x, n.y - 9]; };
  function fireDev(F, d) {
    const D = DEV[d.type], spd = lp(D.speed[0], D.speed[1], d.aim.p), k = D.shots || 1; d.flash = .18;
    for (let i = 0; i < k; i++) pend.push({ t: i * .15, F, d, a: d.aim.a + (i - (k - 1) / 2) * .045 + (rnd() - .5) * D.spread, spd });
  }
  function stepPend(dt) {
    for (const q of pend) { q.t -= dt; if (q.t <= 0 && q.d.alive) { const [px, py] = pivot(q.F, q.d); launch(q.F.side, q.d.type, px + Math.cos(q.a) * 24, py + Math.sin(q.a) * 24, Math.cos(q.a) * q.spd, Math.sin(q.a) * q.spd, true); } }
    pend = pend.filter(q => q.t > 0 && q.d.alive);
  }
  function moveShot(s, dt) {
    if (s.type === 'rockets' && s.t < .7) { const sp = Math.hypot(s.vx, s.vy) || 1; s.vx += s.vx / sp * 240 * dt; s.vy += s.vy / sp * 240 * dt + GRAV * .2 * dt; }
    else s.vy += GRAV * (s.type === 'rockets' ? .55 : 1) * dt;
    s.x += s.vx * dt; s.y += s.vy * dt; s.t += dt;
  }
  function stepShots(dt) {
    for (const s of shots) { s.ox = s.x; s.oy = s.y; moveShot(s, dt); s.trail.push(s.x, s.y); if (s.trail.length > 28) s.trail.splice(0, 2); hitTest(s); }
    shots = shots.filter(s => !s.dead);
  }
  function hitTest(s) {
    const T = forts[1 - s.side], D = DEV[s.type];
    for (const d of T.devs) if (d.alive && d.type === 'shield' && d.e > 0) {
      const [px, py] = pivot(T, d); if (Math.hypot(s.x - px, s.y - py) < DEV.shield.dome && s.y < py + 6) { if (sim(T)) { d.e = Math.max(0, d.e - D.dmg * (D.blast ? 1.3 : 1)); d.eT = 2.5; } d.hitT = .35; ringFx(s.x, s.y, SIDEC[T.side], 34); K.burst(s.x, s.y, [SIDEC[T.side], '#ffffff'], 12, 200, { life: .3, size: 4 }); sound('zap'); s.dead = true; return; }
    }
    for (const d of T.devs) if (d.alive) { const [px, py] = pivot(T, d); if (Math.hypot(s.x - px, s.y - py) < DEV[d.type].r + 4) return impact(s, s.x, s.y, T, null, d); }
    let best = null, bt = 2;
    for (const b of T.beams) { if (!b.alive) continue; const A = T.nodes[b.a], B = T.nodes[b.b]; if (!A || !B) continue; const h = segHit(s.ox, s.oy, s.x, s.y, A.x, A.y, B.x, B.y); if (h >= 0 && h < bt) { bt = h; best = b; } }
    if (best) return impact(s, lp(s.ox, s.x, bt), lp(s.oy, s.y, bt), T, best, null);
    if (s.y > groundY(s.x)) return impact(s, s.x, groundY(s.x), null, null, null);
    if (s.y > 900 || s.x < -200 || s.x > 1480) s.dead = true;
  }
  function segHit(ax, ay, bx, by, cx, cy, dx, dy) {   // where the shot's path a-b crosses beam c-d (as a 0..1 fraction), or -1
    const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy, den = rx * sy - ry * sx;
    if (Math.abs(den) > 1e-6) { const t = ((cx - ax) * sy - (cy - ay) * sx) / den, u = ((cx - ax) * ry - (cy - ay) * rx) / den; if (t >= 0 && t <= 1 && u >= -.03 && u <= 1.03) return t; }
    return segDist(bx, by, cx, cy, dx, dy) < 5 ? 1 : -1;     // grazing the beam's thickness
  }
  const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1, q = cl(((px - ax) * dx + (py - ay) * dy) / L, 0, 1); return Math.hypot(ax + dx * q - px, ay + dy * q - py); };
  function impact(s, x, y, T, beam, dev) {
    s.dead = true; const D = DEV[s.type];
    if (T && sim(T)) {
      if (beam) { beam.hp -= D.dmg; beam.hit = .3; nudge(T, beam.a, s.vx, s.vy); nudge(T, beam.b, s.vx, s.vy); if (beam.hp <= 0) breakBeam(T, beam); }
      if (dev) { dev.hp -= D.dmg; dev.hitT = .3; if (dev.hp <= 0) destroyDev(T, dev); }
    }
    if (D.blast) { const F2 = T || forts[x < 640 ? 0 : 1]; if (sim(F2)) blast(F2, x, y, D.blast, D.dmg); boom(x, y, D.blast, s.type === 'mortar' ? '#ffb347' : '#ff7a3d', 1); }
    else { K.burst(x, y, ['#ffe2a0', '#ffffff', '#ffb347'], 14, 260, { life: .35, size: 4 }); K.shake(4); sound('hit'); }
  }
  function nudge(F, i, vx, vy) { const n = F.nodes[i]; if (!n || !n.alive || n.pin) return; n.px -= vx * .003 / n.m; n.py -= vy * .003 / n.m; }
  function blast(F, x, y, r, dmg) {
    for (const b of F.beams) { if (!b.alive) continue; const A = F.nodes[b.a], B = F.nodes[b.b], d = segDist(x, y, A.x, A.y, B.x, B.y); if (d < r) { b.hp -= dmg * (1 - d / r * .7); b.hit = .3; if (b.hp <= 0) breakBeam(F, b); } }
    for (const dv of F.devs) { if (!dv.alive) continue; const [px, py] = pivot(F, dv), d = Math.hypot(px - x, py - y); if (d < r + DEV[dv.type].r) { dv.hp -= dmg * (1 - d / (r + 22) * .6); dv.hitT = .3; if (dv.hp <= 0) destroyDev(F, dv); } }
    for (const n of F.nodes) { if (!n.alive || n.pin) continue; const dx = n.x - x, dy = n.y - y, d = Math.hypot(dx, dy); if (d < r * 1.4 && d > .1) { const k = (1 - d / (r * 1.4)) * 4.5 / Math.sqrt(n.m); n.px -= dx / d * k; n.py -= dy / d * k; } }
  }

  /* ---------- effects and sound ---------- */
  function splinters(x, y, M, ang, len) { for (let i = 0; i < 4; i++) debris.push({ x: x + Math.cos(ang) * (i - 1.5) * len / 4.5, y: y + Math.sin(ang) * (i - 1.5) * len / 4.5, vx: (rnd() - .5) * 180, vy: -60 - rnd() * 140, a: ang + (rnd() - .5), va: (rnd() - .5) * 14, l: len / 4.5, c: M.col, d: M.dark, t: 0 }); if (debris.length > 260) debris.splice(0, debris.length - 260); }
  function boom(x, y, r, c, big) {
    K.burst(x, y, ['#fff3c0', '#ffb347', '#ff5a2a', c, '#6a5a7a'], Math.round(18 + r * .5), 160 + r * 5, { life: .65, size: 6 });
    ringFx(x, y, '#ffd890', r * 1.4); K.shake(4 + r * .1 * big); sound(big > 1 ? 'bigboom' : 'boom'); flashT = Math.max(flashT, big > 1 ? .45 : .08);
  }
  function ringFx(x, y, c, r) { rings.push({ x, y, c, r, t: 0 }); }
  function sound(k) {
    if (demo) return; const now = performance.now(); if (now - (sndT[k] || 0) < (k === 'crack' ? 70 : 40)) return; sndT[k] = now;
    switch (k) {
      case 'cannon': K.noise(.25, .16, 300); K.sfx(120, .25, 'sine', .18, -70); break;
      case 'mortar': K.noise(.22, .12, 180); K.sfx(80, .32, 'sine', .2, -40); break;
      case 'rockets': K.noise(.45, .07, 1600); K.sfx(300, .4, 'sawtooth', .03, 500); break;
      case 'boom': K.noise(.5, .22, 120); K.sfx(70, .4, 'sine', .2, -40); break;
      case 'bigboom': K.noise(1.3, .3, 70); K.sfx(50, 1.1, 'sine', .3, -30); break;
      case 'hit': K.noise(.12, .14, 900); K.sfx(200, .08, 'square', .05, -120); break;
      case 'crack': K.noise(.07, .09, 2600); K.sfx(700, .05, 'square', .025, -400); break;
      case 'zap': K.sfx(1300, .15, 'sawtooth', .05, -900); break;
      case 'build': K.sfx(460, .05, 'square', .045, 200); break;
      case 'nope': K.sfx(160, .12, 'square', .05, -40); break;
    }
  }
  function say(t2, c = '#fff', d = 2) { msg = { t: t2, c, k: 0, d }; }

  /* ---------- building helpers: world position from (distance in from the island's outer edge, height) ---------- */
  const LOC = (F, u, h) => { const x = F.side ? ISL[1].x1 - u : ISL[0].x0 + u; return [x, groundY(x) - h]; };
  function frameGrid(F, cols, heights, matFn) {
    const id = cols.map((u, c) => { const out = []; for (let l = 0; l <= heights[c]; l++) { const [x, y] = LOC(F, u, l * 64); out.push(addNode(F, x, y)); } return out; });
    for (let c = 0; c < cols.length; c++) for (let l = 0; l < heights[c]; l++) addBeam(F, id[c][l], id[c][l + 1], matFn(c, l, 'v'));
    for (let c = 0; c < cols.length - 1; c++) for (let l = 0; l <= Math.min(heights[c], heights[c + 1]); l++) {
      if (l > 0) addBeam(F, id[c][l], id[c + 1][l], matFn(c, l, 'h'));
      if (l < Math.min(heights[c], heights[c + 1])) { addBeam(F, id[c][l], id[c + 1][l + 1], matFn(c, l, 'd')); addBeam(F, id[c + 1][l], id[c][l + 1], matFn(c, l, 'd')); }
    }
    return id;
  }
  function starter(F) {   // the free starting fort: a braced frame holding the Core, and one cannon
    const id = frameGrid(F, [130, 196, 262], [1, 1, 1], () => 'wood');
    addDev(F, 'core', id[1][1]); addDev(F, 'cannon', id[2][1]);
  }
  function botBuild(F) {   // the computer's forts: towers on a grid, X-braced, steel low and in front
    const nc = 4 + Math.floor(rnd() * 2), cols = [], u0 = 92 + rnd() * 26, du = 60 + rnd() * 8;
    for (let c = 0; c < nc; c++) cols.push(u0 + c * du);
    const style = Math.floor(rnd() * 3), heights = cols.map((_, c) => style === 0 ? (c === 1 || c === 2 ? 3 : 2) : style === 1 ? Math.min(4, 2 + (c > 0) + (c > 2)) : 3 - (c === nc - 1));
    const id = frameGrid(F, cols, heights, (c, l, k) => (l === 0 || c >= nc - 2) && k !== 'd' ? 'steel' : 'wood');
    addDev(F, 'core', id[1][1]);
    const top = c => id[c][heights[c]];
    addDev(F, 'cannon', top(nc - 1)); addDev(F, 'mortar', top(1)); if (nc > 4) addDev(F, 'rockets', top(2)); else addDev(F, 'cannon', top(2));
    addDev(F, 'shield', id[1][Math.min(2, heights[1])] === id[1][1] ? id[2][1] : id[1][Math.min(2, heights[1])]);
    addDev(F, 'gen', id[0][0]);
  }
  function settle(F, n) { F.grace = n; for (let i = 0; i < n; i++) physics(F, DT); }

  /* ---------- the computer: aims with a ballistic solve, gets sharper each volley, repairs and rearms ---------- */
  function aimAt(F, d, tg) {
    const [sx, sy] = pivot(F, d), D = DEV[d.type], dx = tg.x - sx, Y = -(tg.y - 9 - sy), dir = Math.sign(dx) || 1, X = Math.max(20, Math.abs(dx)), g = GRAV * (d.type === 'rockets' ? .45 : 1);
    let sol = null;
    for (let i = 0; i <= 24 && !sol; i++) {
      const v = lp(D.speed[0], D.speed[1], i / 24), disc = v ** 4 - g * (g * X * X + 2 * Y * v * v); if (disc < 0) continue;
      const th = Math.atan((v * v + (D.lob ? 1 : -1) * Math.sqrt(disc)) / (g * X)); if (D.lob ? th > .7 && th < 1.4 : th > -.25 && th < 1) sol = { th, p: i / 24 };
    }
    if (!sol) sol = { th: D.lob ? 1.05 : .55, p: 1 };
    const e = F.ai.err; F.ai.err = Math.max(.03, e * .9);
    d.aim = { a: dir > 0 ? -(sol.th + (rnd() - .5) * e * 2) : Math.PI + sol.th + (rnd() - .5) * e * 2, p: cl(sol.p + (rnd() - .5) * e * 1.5, 0, 1) };
  }
  function pickTarget(E) {
    const c = core(E), others = E.devs.filter(x => x.alive && x.type !== 'core');
    if (c && c.alive && (rnd() < .5 || !others.length)) return { x: E.nodes[c.n].x, y: E.nodes[c.n].y };
    if (others.length) { const o = others[Math.floor(rnd() * others.length)]; return { x: E.nodes[o.n].x, y: E.nodes[o.n].y }; }
    return { x: E.side ? 1000 : 280, y: 470 };
  }
  function botThink(F, dt) {
    const E = forts[1 - F.side], A = F.ai; if ((A.t -= dt) > 0) return; A.t = .5;
    for (const d of F.devs) if (d.alive && WEAP.includes(d.type) && (!d.aim || (d.re = (d.re || 0) - .5) <= 0)) { aimAt(F, d, pickTarget(E)); d.re = 5 + rnd() * 5; }
    if ((A.rep -= .5) <= 0) {   // rebuild a broken beam between bolts that still stand
      A.rep = 1.2;
      const b = F.beams.find(q => !q.alive && !q.fixed && F.nodes[q.a].alive && F.nodes[q.b].alive && Math.abs(Math.hypot(F.nodes[q.a].x - F.nodes[q.b].x, F.nodes[q.a].y - F.nodes[q.b].y) - q.rest) < 6);
      if (b && F.gold >= MAT[b.mat].cost) { b.fixed = true; F.gold -= MAT[b.mat].cost; addBeam(F, b.a, b.b, b.mat); }
    }
    if (F.gold > 330 && rnd() < .3) {   // rearm: a new weapon on a free high bolt
      const free = F.nodes.map((n, i) => i).filter(i => F.nodes[i].alive && !devAt(F, i) && F.beams.some(b => b.alive && (b.a === i || b.b === i)) && !F.nodes[i].pin).sort((a, b) => F.nodes[a].y - F.nodes[b].y);
      const type = rnd() < .5 ? 'cannon' : 'mortar'; if (free.length && F.gold >= DEV[type].cost) { F.gold -= DEV[type].cost; addDev(F, type, free[0]); }
    }
  }

  /* ---------- phases ---------- */
  function start(ros) {
    demo = !!K.bot; mySide = MP.online() && !demo ? (MP.isHost() ? 0 : 1) : 0;
    const opp = ros && ros.find(r => r.id !== MP.id), vsBot = demo || !MP.online();
    forts = [0, 1].map(s => newFort(s, s === mySide && !demo ? MP.name : vsBot ? 'Computer' : opp ? opp.name : 'Opponent', vsBot && (demo || s !== mySide)));
    shots = []; debris = []; rings = []; pend = []; acc = 0; t = 0; overT = 0; winner = -1; ended = false; tool = 'wood'; drag = null; aimSel = null; msg = null; lastVer = -1;
    if (demo) { botBuild(forts[0]); botBuild(forts[1]); phase = 'battle'; forts.forEach(F => { F.ai.err = .05; }); }
    else { starter(forts[mySide]); if (vsBot) { botBuild(forts[1 - mySide]); forts[1 - mySide].ready = true; } phase = 'build'; buildT = BUILD_T; say('BUILD YOUR FORT', SIDEC[mySide], 2.5); }
    forts.forEach(F => { if (sim(F)) settle(F, 90); });
    mode = 'play'; K.score = 0;
  }
  function startBattle() {
    if (phase !== 'build') return; phase = 'battle'; tool = null; say('FIGHT!', '#ff5a3d', 1.8); K.sfx(220, .5, 'sawtooth', .1, 400);
    if (MP.online() && MP.isHost() && !demo) MP.send({ t: 'ph', p: 'battle' });
  }
  function coreDown(F) {
    if (phase === 'over') return; phase = 'over'; overT = 0; winner = 1 - F.side; flashT = .6;
    if (MP.online() && !demo && F.side === mySide) MP.send({ t: 'dead' });
  }
  function finish() {
    if (ended) return; ended = true;
    if (demo) return K.over();
    const won = winner === mySide, E = forts[1 - mySide];
    K.score = (won ? 1000 : 0) + Math.round(E.lost);
    K.over({ title: won ? 'Victory!' : 'Your Core fell', text: won ? `You flattened ${E.name}'s fort.` : `${E.name} broke through. Brace better: triangles, steel low down, a Deflector over the Core.`, delay: 300 });
  }
  function step(dt) {
    t += dt;
    for (const F of forts) if (sim(F)) physics(F, dt); else followSnap(F, dt);
    if (phase === 'build') {
      buildT -= dt; const me = forts[mySide], them = forts[1 - mySide];
      if ((!MP.online() || MP.isHost()) && (buildT <= 0 || (me.ready && them.ready))) startBattle();
    }
    if (phase === 'battle') for (const F of forts) if (sim(F)) {
      F.gold += (5 + DEV.gen.inc * F.devs.filter(d => d.alive && d.type === 'gen').length) * dt;
      for (const d of F.devs) { if (!d.alive) continue; if (DEV[d.type].reload && d.aim) { d.cd -= dt; if (d.cd <= 0) { d.cd = DEV[d.type].reload; fireDev(F, d); } } if (d.type === 'shield' && (d.eT -= dt) <= 0) d.e = Math.min(DEV.shield.energy, d.e + 15 * dt); }
      if (F.bot) botThink(F, dt);
    }
    stepPend(dt); stepShots(dt);
    for (const p of debris) { p.vy += GRAV * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt; p.t += dt; }
    debris = debris.filter(p => p.y < 900 && p.t < 6);
    for (const r of rings) r.t += dt; rings = rings.filter(r => r.t < .5);
    for (const F of forts) for (const d of F.devs) { if (d.aim) { let da = d.aim.a - d.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); d.ang += da * Math.min(1, dt * 8); } d.flash = Math.max(0, d.flash - dt); d.hitT = Math.max(0, (d.hitT || 0) - dt); d.spin += dt * 9; }
    if (phase === 'over') {
      overT += dt; const L = forts[1 - winner];
      if (overT < 2.4 && Math.random() < dt * 6) { const n = L.nodes.filter(q => q.alive); if (n.length) { const q = n[Math.floor(Math.random() * n.length)]; boom(q.x + (Math.random() - .5) * 30, q.y, 40, SIDEC[L.side], 1); if (sim(L)) blast(L, q.x, q.y, 50, 90); } }
      if (overT > 3.4) finish();
    }
    flashT = Math.max(0, flashT - dt * 1.5);
    if (msg) msg.k += dt;
    net(dt);
  }

  /* ---------- online: my fort streams to you, yours to me ---------- */
  function net(dt) {
    if (!MP.online() || demo || (sendT -= dt) > 0) return; sendT = .1;
    const F = forts[mySide], m = { t: 's', n: [], h: F.beams.map(b => b.alive ? Math.max(1, Math.round(b.hp)) : 0), d: F.devs.map(d => [d.n, d.type, d.alive ? Math.max(1, Math.round(d.hp)) : 0, d.aim ? +d.aim.a.toFixed(2) : null, Math.round(d.e), d.flash > .1 ? 1 : 0]), g: Math.round(F.gold), r: F.ready ? 1 : 0 };
    for (const n of F.nodes) m.n.push(n.alive ? Math.round(n.x) : -1, Math.round(n.y));
    if (F.ver !== lastVer || (bsT -= .1) <= 0) { m.b = F.beams.map(b => [b.a, b.b, b.mat === 'steel' ? 1 : 0]); lastVer = F.ver; bsT = 2; }
    MP.send(m);
  }
  function onSnap(m) {
    const F = forts[1 - mySide];
    for (let i = 0; i < m.n.length / 2; i++) { const x = m.n[i * 2], y = m.n[i * 2 + 1]; let n = F.nodes[i]; if (!n) n = F.nodes[i] = { x, y, px: x, py: y, pin: false, m: 1, alive: true }; n.alive = x !== -1; if (n.alive) { n.tx = x; n.ty = y; if (!n.seen) { n.x = x; n.y = y; n.seen = 1; } } }
    F.nodes.length = m.n.length / 2;
    if (m.b) F.beams = m.b.map(([a, b, s], i) => Object.assign(F.beams[i] && F.beams[i].a === a && F.beams[i].b === b ? F.beams[i] : { hit: 0, f: 0, rest: 1 }, { a, b, mat: s ? 'steel' : 'wood' }));
    m.h.forEach((h, i) => { const b = F.beams[i]; if (!b) return; if (b.alive && h && b.hp && h < b.hp - .5) b.hit = .3; if (b.alive && !h && F.nodes[b.a] && F.nodes[b.b]) { const A = F.nodes[b.a], B = F.nodes[b.b]; splinters((A.x + B.x) / 2, (A.y + B.y) / 2, MAT[b.mat], Math.atan2(B.y - A.y, B.x - A.x), Math.hypot(B.x - A.x, B.y - A.y)); } b.hp = h; b.alive = h > 0; });
    F.devs = m.d.map(([n, type, hp, a, e, fl], i) => { const o = F.devs[i] && F.devs[i].n === n && F.devs[i].type === type ? F.devs[i] : { ang: F.side ? Math.PI + .6 : -.6, spin: 0, flash: 0 }; if (o.alive && !hp && F.nodes[n]) boom(F.nodes[n].x, F.nodes[n].y, type === 'core' ? 90 : 40, SIDEC[F.side], 1); return Object.assign(o, { n, type, hp, alive: hp > 0, aim: a === null ? null : { a, p: 1 }, e, flash: fl ? .15 : o.flash }); });
    F.gold = m.g; F.ready = !!m.r;
  }
  function followSnap(F, dt) { const k = Math.min(1, dt * 14); for (const n of F.nodes) if (n.alive && n.tx !== undefined) { n.x += (n.tx - n.x) * k; n.y += (n.ty - n.y) * k; } }
  Object.assign(MP.opts, {
    max: 2, min: 2, bots: 0, solo: 'Play the computer', sub: '1v1 siege. Build a fort on your island, then blow up theirs.',
    onStart: (cfg, ros) => start(ros),
    onMsg: m => {
      if (mode !== 'play' || demo) return;
      if (m.t === 's') onSnap(m);
      else if (m.t === 'f' && m.a) { const [x, y, vx, vy] = m.a; launch(m.s, m.w, x, y, vx, vy, false); }
      else if (m.t === 'ph' && m.p === 'battle') { phase = 'build'; startBattle(); }
      else if (m.t === 'dead') { const F = forts[1 - mySide]; F.dead = true; const c = core(F); if (c && F.nodes[c.n]) boom(F.nodes[c.n].x, F.nodes[c.n].y, 90, SIDEC[F.side], 2); coreDown(F); }
    },
    onLeave: () => { if (mode === 'play' && phase !== 'over' && !demo) { say('Your opponent left. You win!', '#5cf28a', 3); winner = mySide; phase = 'over'; overT = 2.4; } },
  });

  /* ---------- input: building, deleting and aiming ---------- */
  const TB = () => { const v = K.view, w = 92, gap = 8, x0 = 640 - (TOOLS.length * (w + gap) + 186) / 2, y = v.y1 - 104; return { tools: TOOLS.map((k, i) => ({ k, x: x0 + i * (w + gap), y, w, h: 92 })), act: { x: x0 + TOOLS.length * (w + gap) + 6, y, w: 180, h: 92 } }; };
  const inB = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  const toolCost = k => MAT[k] ? MAT[k].cost : DEV[k] ? DEV[k].cost : 0;
  const myF = () => forts[mySide];
  // where a beam drawn to (x, y) would end: an existing bolt, the ground, or a new bolt
  function beamEnd(F, from, x, y) {
    const z = ZONE[F.side]; let j = nearNode(F, x, y); if (j === from) j = -1;
    if (j >= 0) return { j, x: F.nodes[j].x, y: F.nodes[j].y };
    x = cl(x, z.x0, z.x1); const gy = groundY(x); y = cl(y, z.y0, gy); if (gy - y < 16) y = gy;
    return { j: -1, x, y };
  }
  function beamOK(F, d) {
    const A = d.from >= 0 ? F.nodes[d.from] : d.start, e = beamEnd(F, d.from, d.x, d.y), len = Math.hypot(e.x - A.x, e.y - A.y), cost = MAT[d.mat].cost;
    const why = len > MAXLEN ? 'Too long' : len < MINLEN ? 'Too short' : liveBeams(F) >= MAXB ? 'Beam limit reached' : F.gold < cost ? 'Not enough gold' : '';
    return { e, len, cost, why };
  }
  function commitBeam(F, d) {
    const r = beamOK(F, d); if (r.why) { sound('nope'); say(r.why, '#ff8a8a', 1.2); return; }
    const a = d.from >= 0 ? d.from : addNode(F, d.start.x, d.start.y), b = r.e.j >= 0 ? r.e.j : addNode(F, r.e.x, r.e.y);
    if (addBeam(F, a, b, d.mat) >= 0) { F.gold -= r.cost; sound('build'); K.burst(r.e.x, r.e.y, [MAT[d.mat].col, '#fff'], 6, 80, { life: .3, size: 3 }); }
  }
  function placeDev(F, type, x, y) {
    const n = nearNode(F, x, y, 22); if (n < 0) { sound('nope'); say('Put it on one of your bolts', '#ff8a8a', 1.4); return; }
    if (devAt(F, n)) { sound('nope'); say('That bolt is taken', '#ff8a8a', 1.2); return; }
    if (F.gold < DEV[type].cost) { sound('nope'); say('Not enough gold', '#ff8a8a', 1.2); return; }
    if (addDev(F, type, n) >= 0) { F.gold -= DEV[type].cost; sound('build'); if (DEV[type].reload) { aimSel = F.devs[F.devs.length - 1]; tool = null; say('Now drag to aim it', SIDEC[F.side], 1.6); } }
  }
  function deleteAt(F, x, y) {
    const refund = phase === 'build' ? 1 : .5;
    const d = F.devs.find(q => q.alive && q.type !== 'core' && Math.hypot(...pivot(F, q).map((v, i) => v - [x, y][i])) < 20);
    if (d) { d.alive = false; F.ver++; masses(F); F.gold += DEV[d.type].cost * refund; sound('build'); return; }
    let best = null, bd = 10; for (const b of F.beams) if (b.alive) { const A = F.nodes[b.a], B = F.nodes[b.b], dd = segDist(x, y, A.x, A.y, B.x, B.y); if (dd < bd) { bd = dd; best = b; } }
    if (best) { const keep = F.lost; breakBeam(F, best, false); F.lost = keep; F.gold += MAT[best.mat].cost * refund; sound('build'); }
  }
  const aimFrom = (F, d, x, y) => { const [px, py] = pivot(F, d), a = Math.atan2(y - py, x - px), p = cl((Math.hypot(x - px, y - py) - 30) / 230, 0, 1); return { a, p }; };
  GAME.down = (x, y) => {
    K.audio && K.audio(); if (mode !== 'play' || demo || phase === 'over') return;
    const tb = TB(), F = myF();
    const tk = tb.tools.find(b => inB(b, x, y)); if (tk) { tool = tool === tk.k ? null : tk.k; aimSel = null; sound('build'); return; }
    if (inB(tb.act, x, y)) { if (phase === 'build') { F.ready = !F.ready; sound('build'); if (F.ready) say(MP.online() ? 'Ready! Waiting for your opponent' : 'Ready!', '#5cf28a', 1.6); } else { tool = null; } return; }
    if (y > tb.act.y - 4) return;
    if (tool === 'wood' || tool === 'steel') {
      const n = nearNode(F, x, y), z = ZONE[F.side], gy = groundY(x);
      if (n >= 0) drag = { mat: tool, from: n, x, y };
      else if (x > z.x0 && x < z.x1 && Math.abs(y - gy) < 26) drag = { mat: tool, from: -1, start: { x, y: gy }, x, y };
      else say('Start a beam from a bolt or from your ground', '#ffd890', 1.4);
      return;
    }
    if (tool === 'del') return deleteAt(F, x, y);
    if (tool && DEV[tool]) return placeDev(F, tool, x, y);
    // no tool: pick one of your weapons and aim it
    const w = F.devs.find(d => d.alive && DEV[d.type].reload && Math.hypot(...pivot(F, d).map((v, i) => v - [x, y][i])) < 30);
    if (w) { aimSel = w; aimPt = { x, y }; } else if (aimSel) { aimPt = { x, y }; } else say('Tap one of your weapons, then drag to aim', '#ffd890', 1.6);
  };
  GAME.move = (x, y) => { if (drag) { drag.x = x; drag.y = y; } if (aimSel && aimPt) aimPt = { x, y }; };
  GAME.up = (x, y) => {
    const F = myF();
    if (drag) { drag.x = x; drag.y = y; commitBeam(F, drag); drag = null; }
    if (aimSel && aimPt) { const [px, py] = pivot(F, aimSel); if (Math.hypot(x - px, y - py) > 34) { aimSel.aim = aimFrom(F, aimSel, x, y); if (aimSel.cd > 1.2 && phase === 'battle') aimSel.cd = Math.min(aimSel.cd, 1.2); sound('build'); } aimPt = null; }
  };
  GAME.key = (c, d) => {
    if (!d || mode !== 'play' || demo) return; const n = /^Digit([1-8])$/.exec(c);
    if (n) { const k = TOOLS[+n[1] - 1]; tool = tool === k ? null : k; aimSel = null; } else if (c === 'Escape' || c === 'KeyQ') { tool = null; aimSel = null; } else if (c === 'Enter' && phase === 'build') { myF().ready = true; say('Ready!', '#5cf28a', 1.4); }
  };

  /* ---------- drawing ---------- */
  let islandCv = null;
  function islands() {   // the two floating islands, painted once
    const c = document.createElement('canvas'); c.width = 1280; c.height = 800; const g = c.getContext('2d');
    for (const [s, I] of ISL.entries()) {
      const cx = (I.x0 + I.x1) / 2, pts = []; for (let x = I.x0; x <= I.x1; x += 6) pts.push([x, groundY(x)]);
      const under = s ? [[I.x1, 548], [I.x1 - 26, 600], [cx + 120, 650], [cx + 60, 720], [cx - 4, 790], [cx - 70, 712], [cx - 150, 660], [I.x0 + 40, 612], [I.x0, 552]] : [[I.x1, 552], [I.x1 - 40, 612], [cx + 150, 660], [cx + 70, 712], [cx + 4, 790], [cx - 60, 720], [cx - 120, 650], [I.x0 + 26, 600], [I.x0, 548]];
      g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); under.forEach(([x, y]) => g.lineTo(x, y)); g.closePath();
      const gr = g.createLinearGradient(0, 520, 0, 790); gr.addColorStop(0, '#7a5240'); gr.addColorStop(.35, '#55354a'); gr.addColorStop(1, '#22142e'); g.fillStyle = gr; g.fill();
      g.save(); g.clip(); for (let k = 0; k < 9; k++) { g.strokeStyle = `rgba(20,8,24,${.18 + (k % 3) * .06})`; g.lineWidth = 3 + (k % 2) * 3; g.beginPath(); for (let x = I.x0; x <= I.x1; x += 10) g.lineTo(x, 556 + k * 24 + Math.sin(x * .02 + k * 1.7) * 6); g.stroke(); }
      for (let k = 0; k < 40; k++) { g.fillStyle = 'rgba(255,220,180,.05)'; g.fillRect(I.x0 + Math.random() * (I.x1 - I.x0), 540 + Math.random() * 200, 10 + Math.random() * 30, 3); } g.restore();
      g.strokeStyle = '#4f9a3c'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y + 2) : g.moveTo(x, y + 2)); g.stroke();
      g.strokeStyle = '#7fcf5a'; g.lineWidth = 3; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y - 1) : g.moveTo(x, y - 1)); g.stroke();
      for (let x = I.x0 + 8; x < I.x1 - 8; x += 7) { const y = groundY(x); g.strokeStyle = Math.random() < .5 ? '#6fc24e' : '#4f9a3c'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 5, y - 4 - Math.random() * 6); g.stroke(); }
      for (let k = 0; k < 14; k++) { const x = I.x0 + 40 + Math.random() * (I.x1 - I.x0 - 80), y0 = 600 + Math.random() * 90; g.strokeStyle = 'rgba(70,110,50,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + 8, y0 + 30, x - 4, y0 + 40 + Math.random() * 50); g.stroke(); }
    }
    return c;
  }
  const STARS = Array.from({ length: 90 }, (_, i) => [((i * 197) % 1500) - 110, ((i * 83) % 260), (i % 5) / 5]);
  function drawSky(g) {
    const v = K.view, gr = g.createLinearGradient(0, v.y0, 0, 720);
    gr.addColorStop(0, '#0e0828'); gr.addColorStop(.38, '#3a1a5c'); gr.addColorStop(.62, '#9c3d72'); gr.addColorStop(.8, '#ff8a5a'); gr.addColorStop(1, '#ffc37a');
    g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    for (const [x, y, k] of STARS) { g.globalAlpha = (.3 + k * .5) * (.6 + .4 * Math.sin(t * 2 + x)); g.fillStyle = '#fff'; g.fillRect(x, y + v.y0 * .2, 2, 2); } g.globalAlpha = 1;
    const sg = g.createRadialGradient(640, 520, 10, 640, 520, 260); sg.addColorStop(0, 'rgba(255,230,160,.95)'); sg.addColorStop(.25, 'rgba(255,170,100,.5)'); sg.addColorStop(1, 'rgba(255,120,90,0)'); g.fillStyle = sg; g.fillRect(380, 260, 520, 520);
    g.fillStyle = '#ffe7a8'; g.beginPath(); g.arc(640, 520, 58, 0, TAU); g.fill();
    // distant islands drifting
    for (let k = 0; k < 5; k++) { const x = ((k * 330 + t * (4 + k)) % 1600) - 160, y = 300 + (k % 3) * 40, w = 70 + (k % 2) * 50; g.fillStyle = `rgba(70,30,80,${.35 + (k % 3) * .1})`; g.beginPath(); g.ellipse(x, y, w, 9, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x - w, y); g.lineTo(x, y + w * .7); g.lineTo(x + w, y); g.fill(); }
    cloudBand(g, 430, .25, 'rgba(255,190,170,.18)', 6);
  }
  function cloudBand(g, y0, sp, c, n) { const v = K.view; g.fillStyle = c; for (let k = 0; k < n * 3; k++) { const w = 140 + (k % 4) * 60, x = (((k * 263 + t * 18 * sp) % (v.x1 - v.x0 + 400)) + v.x0 - 200), y = y0 + (k % 3) * 18; g.beginPath(); g.ellipse(x, y, w, 26 + (k % 2) * 10, 0, 0, TAU); g.fill(); } }
  function drawAbyss(g) {   // the cloud sea under the islands
    const v = K.view;
    cloudBand(g, 640, .6, 'rgba(255,200,190,.35)', 8); cloudBand(g, 700, 1, 'rgba(255,230,220,.55)', 9);
    const gr = g.createLinearGradient(0, 690, 0, v.y1); gr.addColorStop(0, 'rgba(255,220,210,0)'); gr.addColorStop(1, 'rgba(255,230,225,.9)'); g.fillStyle = gr; g.fillRect(v.x0, 690, v.x1 - v.x0, v.y1 - 690);
  }
  function drawWater(g) {   // a waterfall off each island's inner edge
    for (const [s, x] of [[0, ISL[0].x1 - 30], [1, ISL[1].x0 + 30]]) {
      const top = groundY(x) + 10, gr = g.createLinearGradient(0, top, 0, 760); gr.addColorStop(0, 'rgba(150,220,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x - 9, top, 18, 760 - top);
      g.fillStyle = 'rgba(255,255,255,.5)'; for (let k = 0; k < 8; k++) { const y = top + ((t * 160 + k * 37) % (760 - top)); g.fillRect(x - 7 + (k % 3) * 4, y, 3, 14); }
    }
  }
  function drawBeam(g, A, B, b, mine) {
    const M = MAT[b.mat], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy); if (len < 1) return;
    g.save(); g.translate(A.x, A.y); g.rotate(Math.atan2(dy, dx));
    const hp = b.hp / M.hp;
    if (b.mat === 'wood') {
      g.fillStyle = M.dark; g.fillRect(-2, -5, len + 4, 10); g.fillStyle = M.col; g.fillRect(0, -3.5, len, 7);
      g.strokeStyle = 'rgba(70,40,15,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(3, -1); g.lineTo(len - 3, -1); g.moveTo(6, 1.8); g.lineTo(len * .6, 1.8); g.stroke();
    } else {
      g.fillStyle = M.dark; g.fillRect(-2, -5.5, len + 4, 11); g.fillStyle = M.col; g.fillRect(0, -4.5, len, 3); g.fillRect(0, 1.5, len, 3);
      g.strokeStyle = M.col; g.lineWidth = 1.6; g.beginPath(); for (let x = 0; x < len - 6; x += 10) { g.moveTo(x, -1.5); g.lineTo(x + 5, 1.5); g.lineTo(x + 10, -1.5); } g.stroke();
    }
    if (hp < .99) { g.strokeStyle = `rgba(20,10,10,${.7 * (1 - hp)})`; g.lineWidth = 1.4; g.beginPath(); for (let k = 0; k < 3; k++) { const x = len * (.25 + k * .25); g.moveTo(x - 3, -4); g.lineTo(x + 1, 0); g.lineTo(x - 2, 4); } g.stroke(); }
    const st = Math.abs(b.f || 0) / M.maxF; if (st > .45 && mine) { g.fillStyle = `rgba(255,40,40,${cl((st - .45) * 1.4, 0, .75)})`; g.fillRect(0, -5, len, 10); }
    if (b.hit > 0) { g.fillStyle = `rgba(255,255,255,${b.hit * 2})`; g.fillRect(0, -5, len, 10); }
    g.restore();
  }
  function drawDev(g, F, d) {
    const [px, py] = pivot(F, d), D = DEV[d.type], c = SIDEC[F.side], c2 = SIDEC2[F.side], n = F.nodes[d.n];
    g.save(); g.translate(px, py);
    if (d.type === 'core') {
      const pulse = .7 + .3 * Math.sin(t * 4 + F.side), gl = g.createRadialGradient(0, 0, 4, 0, 0, 46); gl.addColorStop(0, c); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = .55 * pulse; g.fillStyle = gl; g.fillRect(-46, -46, 92, 92); g.globalAlpha = 1;
      g.fillStyle = '#2a2236'; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; g.lineTo(Math.cos(a) * 22, Math.sin(a) * 22); } g.closePath(); g.fill(); g.strokeStyle = '#0c0812'; g.lineWidth = 3; g.stroke();
      g.fillStyle = c; g.beginPath(); g.moveTo(0, -15); g.lineTo(9, 0); g.lineTo(0, 15); g.lineTo(-9, 0); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(0, -12); g.lineTo(4, -2); g.lineTo(0, 0); g.closePath(); g.fill();
    } else if (d.type === 'shield') {
      g.fillStyle = '#2c2f3a'; g.fillRect(-10, -2, 20, 9); g.fillStyle = c; g.beginPath(); g.arc(0, -2, 8, Math.PI, 0); g.fill();
    } else if (d.type === 'gen') {
      g.fillStyle = '#3a3346'; g.fillRect(-13, -8, 26, 17); g.strokeStyle = '#140e1c'; g.lineWidth = 2; g.strokeRect(-13, -8, 26, 17);
      g.save(); g.translate(0, -12); g.rotate(d.spin); g.fillStyle = '#c8c0d8'; for (let i = 0; i < 3; i++) { g.rotate(TAU / 3); g.fillRect(-2, -14, 4, 13); } g.restore();
      g.fillStyle = '#ffd23f'; if (Math.sin(t * 13 + d.n) > .7) { g.fillRect(-2, -2, 4, 4); }
    } else {   // weapons: a turret base and a barrel that swings to its aim
      g.fillStyle = '#2c2a36'; g.beginPath(); g.arc(0, 2, d.type === 'mortar' ? 13 : 11, Math.PI, 0); g.fill(); g.fillRect(-13, 1, 26, 6);
      g.rotate(d.ang);
      if (d.type === 'cannon') { g.fillStyle = '#3e3a4a'; g.fillRect(-4, -5, 30, 10); g.fillStyle = c; g.fillRect(22, -6, 6, 12); g.fillStyle = '#1a1622'; g.fillRect(-2, -2, 24, 4); }
      else if (d.type === 'mortar') { g.fillStyle = '#3e3a4a'; g.fillRect(-4, -9, 20, 18); g.fillStyle = c; g.fillRect(14, -10, 5, 20); g.fillStyle = '#100c16'; g.beginPath(); g.arc(19, 0, 6, 0, TAU); g.fill(); }
      else { g.fillStyle = '#3e3a4a'; g.fillRect(-6, -11, 28, 22); g.fillStyle = c; for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(22, i * 7, 3.6, 0, TAU); g.fill(); } }
      if (d.flash > 0) { g.fillStyle = `rgba(255,220,140,${d.flash * 5})`; g.beginPath(); g.arc(32, 0, 12, 0, TAU); g.fill(); }
    }
    g.restore();
    if (d.type === 'shield' && d.e > 0) {   // the energy dome
      const k = d.e / D.energy, gl = g.createRadialGradient(px, py, 20, px, py, D.dome); gl.addColorStop(0, 'rgba(0,0,0,0)'); gl.addColorStop(.8, c + '22'); gl.addColorStop(1, c + (d.hitT > 0 ? 'cc' : '77'));
      g.fillStyle = gl; g.beginPath(); g.arc(px, py, D.dome, Math.PI, 0); g.closePath(); g.fill();
      g.strokeStyle = c; g.globalAlpha = .4 + .6 * k; g.lineWidth = 2; g.beginPath(); g.arc(px, py, D.dome, Math.PI, 0); g.stroke(); g.globalAlpha = 1;
    }
    const hpk = d.hp / D.hp; if (hpk < .999 && d.alive) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(px - 18, py - 30, 36, 5); g.fillStyle = hpk > .5 ? '#5cf28a' : hpk > .25 ? '#ffd23f' : '#ff4d6d'; g.fillRect(px - 18, py - 30, 36 * hpk, 5); }
    if (D.reload && d.aim && F.side === mySide && phase === 'battle') { g.strokeStyle = c; g.lineWidth = 2.5; g.beginPath(); g.arc(px, py, 19, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - Math.max(0, d.cd) / D.reload)); g.stroke(); }
  }
  function drawFort(g, F) {
    const mine = F.side === mySide && !demo, building = mine && (tool === 'wood' || tool === 'steel');
    for (const n of F.nodes) if (n.alive && n.pin) { g.fillStyle = '#4a4458'; g.beginPath(); g.moveTo(n.x - 9, n.y + 6); g.lineTo(n.x - 6, n.y - 3); g.lineTo(n.x + 6, n.y - 3); g.lineTo(n.x + 9, n.y + 6); g.fill(); }
    for (const b of F.beams) if (b.alive && F.nodes[b.a] && F.nodes[b.b]) drawBeam(g, F.nodes[b.a], F.nodes[b.b], b, mine);
    for (const n of F.nodes) if (n.alive) { g.fillStyle = '#d8d4e4'; g.beginPath(); g.arc(n.x, n.y, building ? 5 : 3.5, 0, TAU); g.fill(); g.strokeStyle = '#1a1622'; g.lineWidth = 1.5; g.stroke(); }
    for (const d of F.devs) if (d.alive && F.nodes[d.n]) drawDev(g, F, d);
  }
  function trajectory(F, d, aim) {   // the dotted arc a weapon would fire
    const D = DEV[d.type], [px, py] = pivot(F, d), spd = lp(D.speed[0], D.speed[1], aim.p), s = { type: d.type, x: px + Math.cos(aim.a) * 24, y: py + Math.sin(aim.a) * 24, vx: Math.cos(aim.a) * spd, vy: Math.sin(aim.a) * spd, t: 0 }, pts = [];
    for (let i = 0; i < 200; i++) { moveShot(s, 1 / 60); if (i % 4 === 0) pts.push([s.x, s.y]); if (s.y > groundY(s.x) || s.y > 760 || s.x < -50 || s.x > 1330) break; }
    return pts;
  }
  function drawShots(g) {
    for (const s of shots) {
      if (s.type === 'cannon') { g.strokeStyle = 'rgba(255,240,210,.35)'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < s.trail.length; i += 2) i ? g.lineTo(s.trail[i], s.trail[i + 1]) : g.moveTo(s.trail[i], s.trail[i + 1]); g.stroke(); g.fillStyle = '#1c1820'; g.beginPath(); g.arc(s.x, s.y, 6, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(s.x - 2, s.y - 2, 2, 0, TAU); g.fill(); }
      else {
        for (let i = 0; i < s.trail.length; i += 2) { const k = i / s.trail.length; g.fillStyle = `rgba(${s.type === 'rockets' ? '255,180,120' : '200,190,210'},${k * .45})`; g.beginPath(); g.arc(s.trail[i], s.trail[i + 1], 2 + k * 4, 0, TAU); g.fill(); }
        g.save(); g.translate(s.x, s.y); g.rotate(Math.atan2(s.vy, s.vx));
        if (s.type === 'mortar') { g.fillStyle = '#2a2430'; g.beginPath(); g.ellipse(0, 0, 9, 6, 0, 0, TAU); g.fill(); g.fillStyle = SIDEC[s.side]; g.fillRect(-9, -2, 4, 4); }
        else { g.fillStyle = '#e8e4ee'; g.fillRect(-9, -3, 16, 6); g.fillStyle = SIDEC[s.side]; g.beginPath(); g.moveTo(7, -3); g.lineTo(12, 0); g.lineTo(7, 3); g.fill(); if (s.t < .7) { g.fillStyle = '#ffd27a'; g.beginPath(); g.moveTo(-9, -3); g.lineTo(-20 - Math.random() * 8, 0); g.lineTo(-9, 3); g.fill(); } }
        g.restore();
      }
    }
  }
  function drawHUD(g) {
    const v = K.view, me = forts[mySide], them = forts[1 - mySide];
    for (const [F, al] of [[forts[0], 'left'], [forts[1], 'right']]) {
      const x = al === 'left' ? v.x0 + 90 : v.x1 - 90, c = core(F), hp = c ? Math.max(0, c.alive ? c.hp : 0) / DEV.core.hp : 0, w = 260, bx = al === 'left' ? x : x - w;
      txt(g, (F.side === mySide && !demo ? 'YOU · ' : '') + F.name, x, v.y0 + 30, 18, SIDEC[F.side], al);
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(bx, v.y0 + 46, w, 14); g.fillStyle = SIDEC[F.side]; g.fillRect(bx + 2, v.y0 + 48, (w - 4) * hp, 10);
      txt(g, 'CORE', al === 'left' ? bx + w + 10 : bx - 10, v.y0 + 54, 13, '#fff', al);
      if (F.side === mySide || !MP.online()) txt(g, `⛁ ${Math.floor(F.gold)}` + (phase === 'battle' ? `  +${5 + DEV.gen.inc * F.devs.filter(d => d.alive && d.type === 'gen').length}/s` : ''), x, v.y0 + 80, 16, '#ffd23f', al);
    }
    if (phase === 'build') { txt(g, 'BUILD PHASE', 640, v.y0 + 30, 20, '#ffd890', 'center'); txt(g, Math.max(0, Math.ceil(buildT)) + 's', 640, v.y0 + 66, 38, buildT < 10 ? '#ff6a6a' : '#fff', 'center'); if (MP.online()) txt(g, them.ready ? 'Opponent is ready' : 'Opponent is building...', 640, v.y0 + 98, 14, them.ready ? '#5cf28a' : '#cfc8e0', 'center'); }
    else if (phase === 'battle') txt(g, 'SIEGE', 640, v.y0 + 34, 22, '#ff8a5a', 'center');
    if (demo) return;
    // toolbar
    const tb = TB();
    g.fillStyle = 'rgba(14,8,30,.72)'; g.beginPath(); g.roundRect(tb.tools[0].x - 12, tb.act.y - 10, tb.act.x + tb.act.w - tb.tools[0].x + 24, 112, 18); g.fill();
    for (const b of tb.tools) {
      const on = tool === b.k, cost = toolCost(b.k), can = me.gold >= cost;
      g.fillStyle = on ? 'rgba(255,176,46,.32)' : 'rgba(255,255,255,.06)'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 14); g.fill(); g.strokeStyle = on ? SIDEC[mySide] : 'rgba(255,255,255,.18)'; g.lineWidth = on ? 3 : 1.5; g.stroke();
      g.globalAlpha = can ? 1 : .4; icon(g, b.k, b.x + b.w / 2, b.y + 34); g.globalAlpha = 1;
      txt(g, b.k === 'del' ? 'REMOVE' : (MAT[b.k] || DEV[b.k]).name.toUpperCase(), b.x + b.w / 2, b.y + 66, 11, '#fff', 'center');
      if (cost) txt(g, '⛁' + cost, b.x + b.w / 2, b.y + 82, 11, can ? '#ffd23f' : '#ff8a8a', 'center');
    }
    const A = tb.act, rd = phase === 'build' && me.ready;
    g.fillStyle = phase === 'build' ? (rd ? '#3a8a4a' : SIDEC[mySide]) : (tool === null ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.08)'); g.beginPath(); g.roundRect(A.x, A.y, A.w, A.h, 16); g.fill();
    txt(g, phase === 'build' ? (rd ? 'READY ✓' : 'READY') : 'AIM', A.x + A.w / 2, A.y + 40, 26, phase === 'build' && !rd ? '#1a1030' : '#fff', 'center');
    txt(g, phase === 'build' ? (rd ? 'waiting...' : 'start the battle') : 'tap a weapon', A.x + A.w / 2, A.y + 68, 12, phase === 'build' && !rd ? '#1a1030' : '#cfc8e0', 'center');
    // what the current tool does
    const hint = tool === 'wood' || tool === 'steel' ? 'Drag from a bolt or your ground. Triangles hold; long towers sag.' : tool === 'del' ? 'Tap a beam or device to remove it' + (phase === 'battle' ? ' (half refund)' : '') : tool ? `Tap one of your bolts to place the ${DEV[tool].name}` : aimSel ? 'Drag to aim: direction and power. It fires on its own.' : phase === 'battle' ? 'Tap a weapon, then drag to aim. Keep building with your gold.' : '';
    if (hint) txt(g, hint, 640, tb.act.y - 26, 15, '#fff', 'center');
    // the beam you're drawing
    if (drag) {
      const r = beamOK(me, drag), A2 = drag.from >= 0 ? me.nodes[drag.from] : drag.start;
      g.globalAlpha = .75; drawBeam(g, A2, r.e, { mat: drag.mat, hp: MAT[drag.mat].hp, f: 0, hit: 0 }, false); g.globalAlpha = 1;
      g.strokeStyle = r.why ? '#ff4d6d' : '#5cf28a'; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(A2.x, A2.y); g.lineTo(r.e.x, r.e.y); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(r.e.x, r.e.y, 7, 0, TAU); g.stroke();
      txt(g, r.why || `⛁${r.cost}`, r.e.x + 12, r.e.y - 14, 14, r.why ? '#ff8a8a' : '#ffd23f');
    }
    if (tool && DEV[tool]) { const n = nearNode(me, hoverX, hoverY, 22); if (n >= 0) { g.strokeStyle = devAt(me, n) ? '#ff4d6d' : '#5cf28a'; g.lineWidth = 2.5; g.beginPath(); g.arc(me.nodes[n].x, me.nodes[n].y - 9, 20, 0, TAU); g.stroke(); } }
    // aiming
    if (aimSel && aimSel.alive) {
      const [px, py] = pivot(me, aimSel); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, 26, 0, TAU); g.stroke();
      const aim = aimPt ? aimFrom(me, aimSel, aimPt.x, aimPt.y) : aimSel.aim;
      if (aim) { const pts = trajectory(me, aimSel, aim); g.fillStyle = SIDEC[mySide]; pts.forEach(([x, y], i) => { g.globalAlpha = 1 - i / pts.length * .7; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }); g.globalAlpha = 1; if (aimPt) txt(g, Math.round(aim.p * 100) + '% power', px, py - 40, 14, '#fff', 'center'); }
    }
    if (msg && msg.k < msg.d) { g.globalAlpha = Math.min(1, (msg.d - msg.k) * 3); txt(g, msg.t, 640, v.y0 + 150, 30, msg.c, 'center', 14); g.globalAlpha = 1; }
  }
  function icon(g, k, x, y) {
    g.save(); g.translate(x, y);
    if (k === 'wood' || k === 'steel') { g.rotate(-.5); drawBeam(g, { x: -24, y: 0 }, { x: 24, y: 0 }, { mat: k, hp: MAT[k].hp, f: 0, hit: 0 }, false); }
    else if (k === 'del') { g.strokeStyle = '#ff6a6a'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-12, -12); g.lineTo(12, 12); g.moveTo(12, -12); g.lineTo(-12, 12); g.stroke(); }
    else { const F = { side: mySide, nodes: [{ x: 0, y: 12, alive: true }] }, d = { type: k, n: 0, ang: -.6, flash: 0, e: 0, spin: t * 3, hp: DEV[k].hp, alive: true }; drawDev(g, F, d); }
    g.restore();
  }
  function txt(g, s, x, y, size, c, al = 'left', glow = 0) { g.font = `${size}px Bungee, Impact, sans-serif`; g.textAlign = al; g.textBaseline = 'middle'; if (glow) { g.shadowColor = c; g.shadowBlur = glow; } g.lineWidth = 4; g.strokeStyle = 'rgba(10,6,20,.8)'; g.strokeText(s, x, y); g.fillStyle = c; g.fillText(s, x, y); g.shadowBlur = 0; }

  /* ---------- kit hooks ---------- */
  let hoverX = 0, hoverY = 0;
  const _move = GAME.move; GAME.move = (x, y, e) => { hoverX = x; hoverY = y; _move(x, y, e); };
  GAME.reset = () => {
    if (!islandCv) islandCv = islands();
    if (K.bot) { start(null); return; }
    mode = 'lobby'; forts = []; MP.show();
  };
  GAME.update = dt => { if (mode !== 'play') return; acc += Math.min(dt, .05); let n = 0; while (acc >= DT && n < 4) { step(DT); acc -= DT; n++; } if (n === 4) acc = 0; };
  GAME.draw = g => {
    drawSky(g);
    if (!islandCv) islandCv = islands();
    drawWater(g); g.drawImage(islandCv, 0, 0);
    if (mode === 'play') { for (const F of forts) drawFort(g, F); drawShots(g);
      for (const p of debris) { g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.d; g.fillRect(-p.l / 2 - 1, -3, p.l + 2, 6); g.fillStyle = p.c; g.fillRect(-p.l / 2, -2, p.l, 4); g.restore(); }
      for (const r of rings) { g.strokeStyle = r.c; g.globalAlpha = 1 - r.t / .5; g.lineWidth = 4; g.beginPath(); g.arc(r.x, r.y, r.r * (.3 + r.t * 1.6), 0, TAU); g.stroke(); } g.globalAlpha = 1;
    }
    drawAbyss(g);
    if (mode === 'play') {
      if (!posed) drawHUD(g);
      if (phase === 'over' && overT > .6) { const won = winner === mySide; g.globalAlpha = Math.min(1, (overT - .6) * 2); txt(g, demo ? '' : won ? 'VICTORY!' : 'DEFEAT', 640, 300, 90, won ? '#ffd23f' : '#ff4d6d', 'center', 30); g.globalAlpha = 1; }
    }
    if (flashT > 0) { const v = K.view; g.fillStyle = `rgba(255,240,220,${flashT * .6})`; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
  };
  GAME.bot = () => {};
  let posed = false;
  GAME.pose = () => { for (let i = 0; i < 60 * 11; i++) step(DT); posed = true; };
  GAME.test = { st: () => ({ mode, phase, buildT: +buildT.toFixed(1), my: mySide, forts: forts.map(F => ({ n: F.nodes.filter(n => n.alive).length, b: liveBeams(F), d: F.devs.filter(d => d.alive).map(d => d.type + ':' + Math.round(d.hp)), gold: Math.round(F.gold), dead: F.dead, maxSt: +Math.max(0, ...F.beams.filter(b => b.alive).map(b => Math.abs(b.f || 0) / MAT[b.mat].maxF)).toFixed(2), maxF: Math.round(Math.max(0, ...F.beams.filter(b => b.alive).map(b => Math.abs(b.f || 0)))) })), shots: shots.length }),
    step: n => { for (let i = 0; i < n; i++) step(DT); }, forts: () => forts, ready: () => { myF().ready = true; }, start: () => MP.start(), aim: (i, a, p) => { const d = myF().devs.filter(x => x.alive && DEV[x.type].reload)[i]; if (d) d.aim = { a, p }; }, botMe: () => { myF().bot = true; },
    bad: kind => { const F = myF(); const [x0, y0] = LOC(F, 330, 0); let prev = addNode(F, x0, y0);
      if (kind === 'tower') { for (let i = 1; i <= 5; i++) { const n = addNode(F, x0, y0 - i * 64); addBeam(F, prev, n, 'wood'); prev = n; } addDev(F, 'mortar', prev); }
      else { const [x1, y1] = LOC(F, 330, 64); const up = addNode(F, x1, y1); addBeam(F, prev, up, 'wood'); prev = up; for (let i = 1; i <= 4; i++) { const n = addNode(F, x1 + i * 90 * (F.side ? -1 : 1), y1); addBeam(F, prev, n, 'wood'); prev = n; } addDev(F, 'cannon', prev); }
      return F.beams.filter(b => b.alive).length; } };
})();
