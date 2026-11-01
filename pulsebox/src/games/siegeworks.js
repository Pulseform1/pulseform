// @use mp
/* Siegeworks: build a fort on a floating island, arm it, and smash the other island's Core before they smash yours.
   Structures are real truss physics (XPBD): bolts with mass, beams as constraints that report the force they carry.
   Beams glow red near their limit and snap past it; unbraced frames fold; whatever is cut loose topples and falls into
   the clouds. Wood is cheap and burns, steel is strong, armor is heavy and shrugs off bullets.
   The islands sit far apart; the camera pans and zooms (drag, wheel, pinch, minimap). Height matters: a gun high on a
   tall tower reaches further. Weapons: Cannon, Machine gun, Mortar, Firebomb, Rockets, Railgun. Support: Deflector
   dome, Flak (shoots down shells), Repair bay, Generator. Every device upgrades to level 3.
   Online 1v1: each player's device runs the physics of their own fort and streams it to the other; shots are shared
   as launches (with ids so flak kills match), and only a fort's owner decides the damage it takes. Offline: the
   computer builds tall forts from a set of designs, aims with a ballistic solver that tightens as it zeroes in,
   repairs, rearms and upgrades. */
const GAME = {
  id: 'siegeworks', title: 'Siegeworks', tagline: 'Build it. Brace it. Blow theirs up.',
  font: 'Bungee', accent: '#ffb02e', accent2: '#5fd4ff', bg: '#1a1030', noSkins: true, noHud: true, scoreLabel: 'Siege score',
  how: [
    'Two floating islands far apart, two forts, one goal: destroy the enemy Core before they destroy yours.',
    'BUILD: pick Wood, Steel or Armor and drag from a bolt (or your ground) to add a beam. Triangles are strong; unbraced towers fold and snap. Taller towers let your guns reach further.',
    'Put devices on bolts: Cannon, Machine gun, Mortar, Firebomb (sets wood ablaze), Rockets, Railgun (pierces beams), Deflector dome, Flak (shoots down shells), Repair bay, Generator. Use UPGRADE on a device to level it up.',
    'FIGHT: tap a weapon and drag to aim; the dotted arc shows the shot. It fires on its own every reload. Drag the sky, use the minimap or pinch to look around.',
    'Play the computer, or create a room and battle a friend online.',
  ],
  skins: [{ name: 'Classic', price: 0 }],
};
(() => {
  'use strict';
  const TAU = Math.PI * 2, cl = (v, a, b) => v < a ? a : v > b ? b : v, lp = (a, b, t) => a + (b - a) * t;
  const WW = 2800, GY = 620, GRAV = 560, DT = 1 / 60, ITER = 12, MAXLEN = 112, MINLEN = 18, SNAP = 18, BUILD_T = 90, MAXB = 200, START_GOLD = 1100;
  const ISL = [{ x0: 90, x1: 790 }, { x0: 2010, x1: 2710 }];
  const ZONE = [{ x0: 110, x1: 770, y0: -160 }, { x0: 2030, x1: 2690, y0: -160 }];
  const SIDEC = ['#ffb02e', '#5fd4ff'], SIDEC2 = ['#ff6a3d', '#3d7bff'];
  const groundY = x => { for (let s = 0; s < 2; s++) { const I = ISL[s]; if (x >= I.x0 && x <= I.x1) { const u = (x - I.x0) / (I.x1 - I.x0); return GY + Math.sin(u * 11 + s * 2) * 5 + Math.sin(u * 29 + s) * 2 + (u < .06 ? Math.pow(1 - u / .06, 2) * 44 : u > .94 ? Math.pow((u - .94) / .06, 2) * 44 : 0); } } return Infinity; };
  // how much each kind of hit hurts each material
  const MAT = {
    wood: { name: 'Wood', cost: 8, hp: 55, maxF: 9000, comp: 1.2e-5, kg: 1, col: '#9a6532', dark: '#5e3a1c', burn: true, res: { bullet: 1, shell: 1, blast: 1, beam: 1 } },
    steel: { name: 'Steel', cost: 24, hp: 150, maxF: 26000, comp: 3e-6, kg: 2.3, col: '#8792a3', dark: '#454d5c', res: { bullet: .55, shell: 1, blast: .9, beam: 1 } },
    armor: { name: 'Armor', cost: 42, hp: 300, maxF: 34000, comp: 2e-6, kg: 4.2, col: '#5c6472', dark: '#272c36', res: { bullet: .2, shell: .75, blast: .6, beam: 1 } },
  };
  const DEV = {
    core: { name: 'Core', cost: 0, up: 260, hp: 480, kg: 5, r: 22 },
    cannon: { name: 'Cannon', cost: 140, hp: 120, kg: 3.5, r: 15, reload: 3.4, speed: [500, 1250], g: 1, dmg: 55, cls: 'shell', spread: .01 },
    mg: { name: 'Machine gun', short: 'MG', cost: 120, hp: 90, kg: 2.5, r: 13, reload: 2.8, shots: 8, gap: .09, speed: [900, 1550], g: .45, dmg: 8, cls: 'bullet', spread: .035 },
    mortar: { name: 'Mortar', cost: 190, hp: 110, kg: 4.5, r: 16, reload: 6.5, speed: [450, 1150], g: 1, dmg: 80, blast: 52, lob: true, cls: 'blast', spread: .015 },
    fire: { name: 'Firebomb', cost: 170, hp: 100, kg: 4, r: 15, reload: 7.5, speed: [450, 1100], g: 1, dmg: 22, blast: 48, lob: true, ignite: true, cls: 'blast', spread: .02 },
    rockets: { name: 'Rockets', cost: 250, hp: 100, kg: 3.5, r: 15, reload: 8, shots: 3, gap: .15, speed: [600, 1100], g: .55, thrust: true, dmg: 38, blast: 34, cls: 'blast', spread: .05 },
    rail: { name: 'Railgun', cost: 380, hp: 120, kg: 5, r: 16, reload: 9.5, speed: [2000, 2700], g: .1, dmg: 120, pierce: 4, cls: 'beam', spread: .004 },
    shield: { name: 'Deflector', cost: 210, hp: 90, kg: 3, r: 14, energy: 260, dome: 84 },
    flak: { name: 'Flak', cost: 200, hp: 100, kg: 3, r: 14, range: 300, rate: .75 },
    repair: { name: 'Repair bay', short: 'Repair', cost: 160, hp: 90, kg: 3, r: 14, range: 150, heal: 7 },
    gen: { name: 'Generator', cost: 120, hp: 90, kg: 4.5, r: 15, inc: 3 },
  };
  const WEAP = ['cannon', 'mg', 'mortar', 'fire', 'rockets', 'rail'];
  const TABS = [['BUILD', ['wood', 'steel', 'armor']], ['WEAPONS', WEAP], ['SUPPORT', ['shield', 'flak', 'repair', 'gen']]];
  const upCost = (type, lv) => Math.round((DEV[type].up || DEV[type].cost) * .6 * lv);
  // what a level does: more damage, faster reload, tougher, bigger dome, longer reach for flak and repairs
  const L = { dmg: d => 1 + .3 * (d.lv - 1), rel: d => 1 - .15 * (d.lv - 1), hp: d => 1 + .4 * (d.lv - 1) };
  const maxHp = d => DEV[d.type].hp * L.hp(d);
  let rnd = Math.random;

  /* ---------- forts: bolts, beams and devices ---------- */
  function newFort(side, name, bot) { return { side, name, bot: !!bot, nodes: [], beams: [], devs: [], gold: START_GOLD, ver: 1, dead: false, ready: false, lost: 0, ai: { t: 1, err: .17, rep: 2, buy: 4 } }; }
  function addNode(F, x, y) {
    const I = ISL[F.side], gy = groundY(x), pin = Math.abs(y - gy) < 9 && x > I.x0 + 16 && x < I.x1 - 16;
    if (!pin) x += (Math.random() - .5) * .6;   // a hair of imperfection: unbraced columns topple instead of balancing forever
    const n = { x, y: pin ? gy : y, px: x, py: pin ? gy : y, pin, m: 1, alive: true }; F.nodes.push(n); F.ver++; return F.nodes.length - 1;
  }
  function nearNode(F, x, y, r = SNAP) { let bi = -1, bd = r; F.nodes.forEach((n, i) => { if (!n.alive) return; const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; bi = i; } }); return bi; }
  const liveBeams = F => F.beams.filter(b => b.alive).length;
  function addBeam(F, a, b, mat) {
    if (a === b || a < 0 || b < 0 || F.beams.some(q => q.alive && ((q.a === a && q.b === b) || (q.a === b && q.b === a)))) return -1;
    const A = F.nodes[a], B = F.nodes[b]; F.beams.push({ a, b, mat, rest: Math.hypot(A.x - B.x, A.y - B.y), hp: MAT[mat].hp, alive: true, f: 0, lam: 0, hit: 0, fire: 0 }); F.ver++; masses(F); return F.beams.length - 1;
  }
  function masses(F) {
    for (const n of F.nodes) n.m = 1;
    for (const b of F.beams) if (b.alive) { const k = MAT[b.mat].kg * b.rest / 60; F.nodes[b.a].m += k / 2; F.nodes[b.b].m += k / 2; }
    for (const d of F.devs) if (d.alive) F.nodes[d.n].m += DEV[d.type].kg;
  }
  function addDev(F, type, n) {
    if (n < 0 || !F.nodes[n] || !F.nodes[n].alive || F.devs.some(d => d.alive && d.n === n)) return -1;
    const D = DEV[type]; F.devs.push({ type, n, lv: 1, hp: D.hp, alive: true, cd: D.reload ? 1.2 + Math.random() : 0, aim: null, ang: F.side ? Math.PI + .6 : -.6, e: D.energy || 0, eT: 0, flash: 0, spin: 0, hitT: 0, zap: null });
    F.ver++; masses(F); return F.devs.length - 1;
  }
  function upgrade(F, d) {
    if (d.lv >= 3) return 'Already at max level';
    const c = upCost(d.type, d.lv); if (F.gold < c) return 'Not enough gold';
    F.gold -= c; const k = maxHp(d); d.lv++; d.hp = d.hp / k * maxHp(d); if (d.type === 'shield') d.e = Math.min(d.e + 60, shieldMax(d)); F.ver++; return '';
  }
  const shieldMax = d => DEV.shield.energy * (1 + .4 * (d.lv - 1)), domeR = d => DEV.shield.dome + 8 * (d.lv - 1);
  const devAt = (F, n) => F.devs.find(d => d.alive && d.n === n);
  const core = F => F.devs.find(d => d.type === 'core');
  const pivot = (F, d) => { const n = F.nodes[d.n]; return [n.x, n.y - 9]; };

  /* ---------- physics: XPBD beams that report their force; fire eats wood ---------- */
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
      if (b.fire > 0) {   // burning: damage, spread to wooden neighbours, burn out
        b.fire -= dt; b.hp -= 7 * dt; if (Math.random() < dt * 9) { const A = N[b.a], B = N[b.b], k = Math.random(); flame(lp(A.x, B.x, k), lp(A.y, B.y, k)); }
        if (Math.random() < dt * .35) for (const q of F.beams) if (q.alive && q !== b && MAT[q.mat].burn && q.fire <= 0 && (q.a === b.a || q.a === b.b || q.b === b.a || q.b === b.b) && Math.random() < .5) q.fire = 12 + Math.random() * 5;
        if (b.hp <= 0) { breakBeam(F, b); continue; }
      }
      if (Math.abs(b.f) > MAT[b.mat].maxF && !F.grace) breakBeam(F, b, true);
    }
    if (F.grace) F.grace--;
    for (const n of N) if (n.alive && n.y > 1200) killNode(F, n);
  }
  function breakBeam(F, b, strain) {
    if (!b.alive) return; b.alive = false; b.fire = 0; F.ver++; F.lost += MAT[b.mat].cost;
    const A = F.nodes[b.a], B = F.nodes[b.b];
    splinters((A.x + B.x) / 2, (A.y + B.y) / 2, MAT[b.mat], Math.atan2(B.y - A.y, B.x - A.x), b.rest);
    if (strain) sound('crack'); masses(F);
    for (const i of [b.a, b.b]) { const n = F.nodes[i]; if (n.alive && !n.pin && !devAt(F, i) && !F.beams.some(q => q.alive && (q.a === i || q.b === i))) n.alive = false; }
  }
  function killNode(F, n) {
    const i = F.nodes.indexOf(n); n.alive = false; F.ver++;
    for (const b of F.beams) if (b.alive && (b.a === i || b.b === i)) { b.alive = false; F.lost += MAT[b.mat].cost; }
    const d = devAt(F, i); if (d) destroyDev(F, d); masses(F);
  }
  function destroyDev(F, d) {
    if (!d.alive) return; d.alive = false; F.ver++; F.lost += (DEV[d.type].cost || 300) * d.lv; masses(F);
    const n = F.nodes[d.n]; boom(n.x, n.y, d.type === 'core' ? 110 : 44, SIDEC[F.side], d.type === 'core' ? 2 : 1);
    if (d.type === 'core') { F.dead = true; coreDown(F); }
  }

  /* ---------- shots ---------- */
  let forts = [], shots = [], debris = [], rings = [], pend = [], parts = [], phase = 'build', buildT = BUILD_T, mySide = 0, demo = false, mode = 'lobby', shotN = 0;
  let tool = 'wood', tab = 0, drag = null, aimSel = null, aimPt = null, overT = 0, winner = -1, flashT = 0, msg = null, acc = 0, t = 0, sendT = 0, lastVer = -1, bsT = 0, ended = false, sndT = {}, posed = false;
  const sim = F => !MP.online() || demo || F.side === mySide;      // whose physics and damage this device decides
  function launch(side, type, x, y, vx, vy, dmg, net, id) {
    const D = DEV[type]; id = id || (side + 1) * 1e6 + (++shotN);
    shots.push({ id, side, type, x, y, ox: x, oy: y, vx, vy, t: 0, trail: [], dmg, pierce: D.pierce || 0, hits: new Set() });
    if (net && MP.online() && !demo) MP.send({ t: 'f', s: side, w: type, id, d: Math.round(dmg), a: [Math.round(x), Math.round(y), Math.round(vx), Math.round(vy)] });
    sound(type);
  }
  function fireDev(F, d) {
    const D = DEV[d.type], spd = lp(D.speed[0], D.speed[1], d.aim.p), k = D.shots || 1; d.flash = .18;
    for (let i = 0; i < k; i++) pend.push({ t: i * (D.gap || .15), F, d, a: d.aim.a + (D.shots && D.gap > .1 ? (i - (k - 1) / 2) * .045 : 0) + (rnd() - .5) * D.spread * 2, spd: spd * (1 + (rnd() - .5) * .01) });
  }
  function stepPend(dt) {
    for (const q of pend) { q.t -= dt; if (q.t <= 0 && q.d.alive) { const [px, py] = pivot(q.F, q.d), D = DEV[q.d.type]; q.d.flash = .1; launch(q.F.side, q.d.type, px + Math.cos(q.a) * 26, py + Math.sin(q.a) * 26, Math.cos(q.a) * q.spd, Math.sin(q.a) * q.spd, D.dmg * L.dmg(q.d), true); } }
    pend = pend.filter(q => q.t > 0 && q.d.alive);
  }
  function moveShot(s, dt) {
    const D = DEV[s.type];
    if (D.thrust && s.t < .8) { const sp = Math.hypot(s.vx, s.vy) || 1; s.vx += s.vx / sp * 300 * dt; s.vy += s.vy / sp * 300 * dt + GRAV * .2 * dt; }
    else s.vy += GRAV * D.g * dt;
    s.x += s.vx * dt; s.y += s.vy * dt; s.t += dt;
  }
  function stepShots(dt) {
    for (const s of shots) { s.ox = s.x; s.oy = s.y; moveShot(s, dt); s.trail.push(s.x, s.y); if (s.trail.length > (s.type === 'rail' ? 40 : 28)) s.trail.splice(0, 2); hitTest(s); }
    shots = shots.filter(s => !s.dead);
  }
  function hitTest(s) {
    const T = forts[1 - s.side], D = DEV[s.type];
    if (D.cls !== 'beam') for (const d of T.devs) if (d.alive && d.type === 'shield' && d.e > 0) {
      const [px, py] = pivot(T, d); if (Math.hypot(s.x - px, s.y - py) < domeR(d) && s.y < py + 6) { if (sim(T)) { d.e = Math.max(0, d.e - s.dmg * (D.blast ? 1.3 : D.cls === 'bullet' ? .7 : 1)); d.eT = 2.5; } d.hitT = .35; ringFx(s.x, s.y, SIDEC[T.side], 30); burst(s.x, s.y, [SIDEC[T.side], '#ffffff'], 10, 220, .3, 4); sound('zap'); s.dead = true; return; }
    }
    for (const d of T.devs) if (d.alive && !s.hits.has(d)) { const [px, py] = pivot(T, d); if (Math.hypot(s.x - px, s.y - py) < DEV[d.type].r + 4) { impact(s, s.x, s.y, T, null, d); if (s.dead) return; } }
    let best = null, bt = 2;
    for (const b of T.beams) { if (!b.alive || s.hits.has(b)) continue; const A = T.nodes[b.a], B = T.nodes[b.b]; if (!A || !B) continue; const h = segHit(s.ox, s.oy, s.x, s.y, A.x, A.y, B.x, B.y); if (h >= 0 && h < bt) { bt = h; best = b; } }
    if (best) { impact(s, lp(s.ox, s.x, bt), lp(s.oy, s.y, bt), T, best, null); if (s.dead) return; }
    if (s.y > groundY(s.x)) return impact(s, s.x, groundY(s.x), null, null, null, true);
    if (s.y > 1300 || s.x < -300 || s.x > WW + 300) s.dead = true;
  }
  function segHit(ax, ay, bx, by, cx, cy, dx, dy) {   // where the shot's path a-b crosses beam c-d (as a 0..1 fraction), or -1
    const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy, den = rx * sy - ry * sx;
    if (Math.abs(den) > 1e-6) { const t2 = ((cx - ax) * sy - (cy - ay) * sx) / den, u = ((cx - ax) * ry - (cy - ay) * rx) / den; if (t2 >= 0 && t2 <= 1 && u >= -.03 && u <= 1.03) return t2; }
    return segDist(bx, by, cx, cy, dx, dy) < 5 ? 1 : -1;
  }
  const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, q = cl(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1); return Math.hypot(ax + dx * q - px, ay + dy * q - py); };
  function impact(s, x, y, T, beam, dev, ground) {
    const D = DEV[s.type], pierce = s.pierce > 0 && (beam || dev);
    if (T && sim(T)) {
      if (beam) { beam.hp -= s.dmg * MAT[beam.mat].res[D.cls]; beam.hit = .3; nudge(T, beam.a, s.vx, s.vy, D.cls === 'bullet' ? .2 : 1); nudge(T, beam.b, s.vx, s.vy, D.cls === 'bullet' ? .2 : 1); if (beam.hp <= 0) breakBeam(T, beam); }
      if (dev) { dev.hp -= s.dmg; dev.hitT = .3; if (dev.hp <= 0) destroyDev(T, dev); }
    }
    if (pierce) { s.pierce--; s.dmg *= .72; s.hits.add(beam || dev); burst(x, y, ['#bff4ff', '#ffffff', SIDEC[s.side]], 10, 300, .3, 3); sound('hit'); return; }
    s.dead = true;
    if (D.blast) { const F2 = T || forts[x < WW / 2 ? 0 : 1]; if (sim(F2)) blast(F2, x, y, D.blast, s.dmg, D.ignite); boom(x, y, D.blast, D.ignite ? '#ff7a1a' : s.type === 'mortar' ? '#ffb347' : '#ff7a3d', 1); if (D.ignite) for (let i = 0; i < 16; i++) flame(x + (rnd() - .5) * D.blast, y - rnd() * 20); }
    else if (D.cls === 'bullet') { burst(x, y, ['#ffe2a0', '#ffffff'], 4, 160, .2, 2); sound('ping'); }
    else { burst(x, y, ['#ffe2a0', '#ffffff', '#ffb347'], 14, 280, .35, 4); K.shake(3); sound('hit'); }
  }
  function nudge(F, i, vx, vy, k) { const n = F.nodes[i]; if (!n || !n.alive || n.pin) return; n.px -= vx * .003 * k / n.m; n.py -= vy * .003 * k / n.m; }
  function blast(F, x, y, r, dmg, ignite) {
    for (const b of F.beams) { if (!b.alive) continue; const A = F.nodes[b.a], B = F.nodes[b.b], d = segDist(x, y, A.x, A.y, B.x, B.y); if (d < r) { b.hp -= dmg * (1 - d / r * .7) * MAT[b.mat].res.blast; b.hit = .3; if (MAT[b.mat].burn && (ignite || Math.random() < .12)) b.fire = 12 + Math.random() * 6; if (b.hp <= 0) breakBeam(F, b); } }
    for (const dv of F.devs) { if (!dv.alive) continue; const [px, py] = pivot(F, dv), d = Math.hypot(px - x, py - y); if (d < r + DEV[dv.type].r) { dv.hp -= dmg * (1 - d / (r + 22) * .6); dv.hitT = .3; if (dv.hp <= 0) destroyDev(F, dv); } }
    for (const n of F.nodes) { if (!n.alive || n.pin) continue; const dx = n.x - x, dy = n.y - y, d = Math.hypot(dx, dy); if (d < r * 1.4 && d > .1) { const k = (1 - d / (r * 1.4)) * 4.5 / Math.sqrt(n.m); n.px -= dx / d * k; n.py -= dy / d * k; } }
  }
  // flak: knocks incoming shells and rockets out of the sky (bullets and rail slugs are too fast)
  function stepFlak(F, dt) {
    for (const d of F.devs) {
      if (!d.alive || d.type !== 'flak') continue; d.cd -= dt; if (d.cd > 0) continue;
      const [px, py] = pivot(F, d), R = DEV.flak.range + 40 * (d.lv - 1);
      const tg = shots.find(s => !s.dead && s.side !== F.side && (DEV[s.type].cls === 'blast' || s.type === 'cannon') && Math.hypot(s.x - px, s.y - py) < R && s.vx * (px - s.x) > 0);
      if (!tg) continue;
      d.cd = DEV.flak.rate * L.rel(d); d.ang = Math.atan2(tg.y - py, tg.x - px); d.flash = .12; d.zap = { x: tg.x, y: tg.y, t: .12 };
      if (sim(F)) { tg.dead = true; if (MP.online() && !demo) MP.send({ t: 'x', id: tg.id }); }
      boom(tg.x, tg.y, 18, '#ffd890', 0); sound('flak');
    }
  }
  function stepRepair(F, dt) {
    for (const d of F.devs) {
      if (!d.alive || d.type !== 'repair') continue; d.cd -= dt; if (d.cd > 0) continue; d.cd = 1;
      const [px, py] = pivot(F, d), R = DEV.repair.range + 30 * (d.lv - 1), heal = DEV.repair.heal + 4 * (d.lv - 1);
      for (const b of F.beams) { if (!b.alive) continue; const A = F.nodes[b.a], B = F.nodes[b.b]; if (segDist(px, py, A.x, A.y, B.x, B.y) > R) continue; if (b.hp < MAT[b.mat].hp) { b.hp = Math.min(MAT[b.mat].hp, b.hp + heal); if (Math.random() < .3) spark((A.x + B.x) / 2, (A.y + B.y) / 2, '#7dff9a'); } if (b.fire > 0 && Math.random() < .35) b.fire = 0; }
      for (const o of F.devs) if (o.alive && o !== d) { const [ox, oy] = pivot(F, o); if (Math.hypot(ox - px, oy - py) < R && o.hp < maxHp(o)) o.hp = Math.min(maxHp(o), o.hp + heal * .6); }
    }
  }

  /* ---------- effects (in world space) and sound ---------- */
  function burst(x, y, cols, n, sp, life, size, grav = 300) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (.3 + Math.random() * .7); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * .15, life: life * (.6 + Math.random() * .6), max: life, size: size * (.6 + Math.random() * .7), c: cols[Math.floor(Math.random() * cols.length)], g: grav }); } if (parts.length > 900) parts.splice(0, parts.length - 900); }
  const flame = (x, y) => parts.push({ x: x + (Math.random() - .5) * 6, y, vx: (Math.random() - .5) * 20, vy: -40 - Math.random() * 50, life: .5 + Math.random() * .4, max: .9, size: 5 + Math.random() * 5, c: Math.random() < .5 ? '#ff9a2e' : '#ffd23f', g: -60, fl: 1 });
  const spark = (x, y, c) => parts.push({ x, y, vx: (Math.random() - .5) * 40, vy: -40 - Math.random() * 40, life: .5, max: .5, size: 3, c, g: 0 });
  function splinters(x, y, M, ang, len) { for (let i = 0; i < 4; i++) debris.push({ x: x + Math.cos(ang) * (i - 1.5) * len / 4.5, y: y + Math.sin(ang) * (i - 1.5) * len / 4.5, vx: (rnd() - .5) * 180, vy: -60 - rnd() * 140, a: ang + (rnd() - .5), va: (rnd() - .5) * 14, l: len / 4.5, c: M.col, d: M.dark, t: 0 }); if (debris.length > 300) debris.splice(0, debris.length - 300); }
  function boom(x, y, r, c, big) {
    burst(x, y, ['#fff3c0', '#ffb347', '#ff5a2a', c, '#6a5a7a'], Math.round(14 + r * .5), 140 + r * 5, .65, 7);
    if (big >= 0) { ringFx(x, y, '#ffd890', r * 1.4); K.shake(3 + r * .08 * Math.max(1, big)); sound(big > 1 ? 'bigboom' : 'boom'); flashT = Math.max(flashT, big > 1 ? .45 : big ? .05 : 0); }
  }
  function ringFx(x, y, c, r) { rings.push({ x, y, c, r, t: 0 }); }
  function sound(k) {
    if (demo) return; const now = performance.now(); if (now - (sndT[k] || 0) < (k === 'crack' ? 70 : k === 'mg' || k === 'ping' ? 60 : 40)) return; sndT[k] = now;
    switch (k) {
      case 'cannon': K.noise(.25, .16, 300); K.sfx(120, .25, 'sine', .18, -70); break;
      case 'mg': K.noise(.05, .09, 1800); K.sfx(220, .04, 'square', .04, -80); break;
      case 'mortar': case 'fire': K.noise(.22, .12, 180); K.sfx(80, .32, 'sine', .2, -40); break;
      case 'rockets': K.noise(.45, .07, 1600); K.sfx(300, .4, 'sawtooth', .03, 500); break;
      case 'rail': K.sfx(1800, .35, 'sawtooth', .06, -1500); K.noise(.3, .1, 3000); break;
      case 'boom': K.noise(.5, .22, 120); K.sfx(70, .4, 'sine', .2, -40); break;
      case 'bigboom': K.noise(1.3, .3, 70); K.sfx(50, 1.1, 'sine', .3, -30); break;
      case 'hit': K.noise(.12, .14, 900); K.sfx(200, .08, 'square', .05, -120); break;
      case 'ping': K.sfx(1400, .04, 'triangle', .025, -600); break;
      case 'flak': K.noise(.1, .12, 1200); break;
      case 'crack': K.noise(.07, .09, 2600); K.sfx(700, .05, 'square', .025, -400); break;
      case 'zap': K.sfx(1300, .15, 'sawtooth', .05, -900); break;
      case 'build': K.sfx(460, .05, 'square', .045, 200); break;
      case 'up': K.chime(523, [0, 4, 7, 12]); break;
      case 'nope': K.sfx(160, .12, 'square', .05, -40); break;
    }
  }
  function say(t2, c = '#fff', d = 2) { msg = { t: t2, c, k: 0, d }; }

  /* ---------- fort builders: positions measured in from the island's outer edge ---------- */
  const LOC = (F, u, h) => { const x = F.side ? ISL[1].x1 - u : ISL[0].x0 + u; return [x, groundY(x) - h]; };
  function frameGrid(F, cols, heights, matFn) {
    const id = cols.map((u, c) => { const out = []; for (let l = 0; l <= heights[c]; l++) { const [x, y] = LOC(F, u, l * 66); out.push(addNode(F, x, y)); } return out; });
    for (let c = 0; c < cols.length; c++) for (let l = 0; l < heights[c]; l++) addBeam(F, id[c][l], id[c][l + 1], matFn(c, l, 'v'));
    for (let c = 0; c < cols.length - 1; c++) for (let l = 0; l <= Math.min(heights[c], heights[c + 1]); l++) {
      if (l > 0) addBeam(F, id[c][l], id[c + 1][l], matFn(c, l, 'h'));
      if (l < Math.min(heights[c], heights[c + 1])) { addBeam(F, id[c][l], id[c + 1][l + 1], matFn(c, l, 'd')); addBeam(F, id[c + 1][l], id[c][l + 1], matFn(c, l, 'd')); }
    }
    return id;
  }
  function starter(F) {   // the free starting fort: a braced two-storey frame holding the Core, and one cannon
    const id = frameGrid(F, [170, 236, 302], [2, 2, 1], (c, l) => l === 0 ? 'steel' : 'wood');
    addDev(F, 'core', id[1][1]); addDev(F, 'cannon', id[1][2]);
  }
  function botBuild(F) {   // tall towers on a grid, X-braced; steel low, armor on the front face
    const nc = 5 + Math.floor(rnd() * 3), cols = [], u0 = 120 + rnd() * 30, du = 64 + rnd() * 6;
    for (let c = 0; c < nc; c++) cols.push(u0 + c * du);
    const style = Math.floor(rnd() * 3), peak = 4 + Math.floor(rnd() * 3);
    const heights = cols.map((_, c) => style === 0 ? (c === 1 || c === 2 ? peak : peak - 2) : style === 1 ? Math.min(peak, 2 + Math.floor(c / 1.5)) : Math.max(2, peak - Math.abs(c - (nc >> 1))));
    const id = frameGrid(F, cols, heights, (c, l, k) => c === nc - 1 && k === 'v' ? 'armor' : l <= 1 || (l <= 2 && k !== 'd') ? 'steel' : 'wood');
    const top = c => id[c][heights[c]], mid = (c, l) => id[c][Math.min(l, heights[c])];
    addDev(F, 'core', id[1][1]);
    const tall = cols.map((_, c) => c).sort((a, b) => heights[b] - heights[a]);
    const kit = [['cannon', top(tall[0])], ['mortar', top(tall[1])], ['rail', top(tall[2])], ['mg', top(nc - 1)], [rnd() < .5 ? 'rockets' : 'fire', mid(nc - 2, heights[nc - 2])]];
    for (const [type, n] of kit) addDev(F, type, n);
    addDev(F, 'shield', mid(2, 2)); addDev(F, 'flak', mid(0, 2)); addDev(F, 'repair', id[2][1]); addDev(F, 'gen', id[0][0]); addDev(F, 'gen', id[3][0]);
    F.gold = 400;
  }
  function settle(F, n) { F.grace = n; for (let i = 0; i < n; i++) physics(F, DT); }

  /* ---------- the computer: ballistic aim that tightens, repairs, rearms and upgrades ---------- */
  function aimAt(F, d, tg) {
    const [sx, sy] = pivot(F, d), D = DEV[d.type], dx = tg.x - sx, Y = -(tg.y - 9 - sy), dir = Math.sign(dx) || 1, X = Math.max(20, Math.abs(dx)), g = GRAV * (D.thrust ? .4 : D.g);
    let sol = null;
    for (let i = 0; i <= 30 && !sol; i++) {
      const v = lp(D.speed[0], D.speed[1], i / 30) * (D.thrust ? 1.25 : 1), disc = v ** 4 - g * (g * X * X + 2 * Y * v * v); if (disc < 0) continue;
      const th = Math.atan((v * v + (D.lob ? 1 : -1) * Math.sqrt(disc)) / (g * X)); if (D.lob ? th > .7 && th < 1.4 : th > -.35 && th < 1) sol = { th, p: i / 30 };
    }
    if (!sol) sol = { th: D.lob ? 1.0 : .7, p: 1 };
    const e = F.ai.err; F.ai.err = Math.max(.02, e * .9);
    d.aim = { a: dir > 0 ? -(sol.th + (rnd() - .5) * e * 2) : Math.PI + sol.th + (rnd() - .5) * e * 2, p: cl(sol.p + (rnd() - .5) * e * 1.5, 0, 1) };
  }
  function pickTarget(E, type) {
    const c = core(E), others = E.devs.filter(x => x.alive && x.type !== 'core');
    const pref = type === 'mg' ? others.filter(x => x.type !== 'shield') : others;
    if (c && c.alive && (rnd() < .45 || !pref.length)) return { x: E.nodes[c.n].x, y: E.nodes[c.n].y };
    if (pref.length) { const o = pref[Math.floor(rnd() * pref.length)]; return { x: E.nodes[o.n].x, y: E.nodes[o.n].y }; }
    return { x: E.side ? 2300 : 450, y: GY - 60 };
  }
  function botThink(F, dt) {
    const E = forts[1 - F.side], A = F.ai; if ((A.t -= dt) > 0) return; A.t = .5;
    for (const d of F.devs) if (d.alive && WEAP.includes(d.type) && (!d.aim || (d.re = (d.re || 0) - .5) <= 0)) { aimAt(F, d, pickTarget(E, d.type)); d.re = 5 + rnd() * 5; }
    if ((A.rep -= .5) <= 0) {   // rebuild a broken beam between bolts that still stand
      A.rep = 1.2;
      const b = F.beams.find(q => !q.alive && !q.fixed && F.nodes[q.a].alive && F.nodes[q.b].alive && Math.abs(Math.hypot(F.nodes[q.a].x - F.nodes[q.b].x, F.nodes[q.a].y - F.nodes[q.b].y) - q.rest) < 6);
      if (b && F.gold >= MAT[b.mat].cost) { b.fixed = true; F.gold -= MAT[b.mat].cost; addBeam(F, b.a, b.b, b.mat); }
    }
    if ((A.buy -= .5) <= 0) {   // spend: upgrade something, or put a new weapon on a free high bolt
      A.buy = 3 + rnd() * 3;
      const ups = F.devs.filter(d => d.alive && d.lv < 3 && (WEAP.includes(d.type) || d.type === 'shield' || d.type === 'core'));
      if (ups.length && rnd() < .55) { const d = ups[Math.floor(rnd() * ups.length)]; if (F.gold >= upCost(d.type, d.lv) + 60) upgrade(F, d); }
      else {
        const free = F.nodes.map((n, i) => i).filter(i => F.nodes[i].alive && !devAt(F, i) && !F.nodes[i].pin && F.beams.some(b => b.alive && (b.a === i || b.b === i))).sort((a, b) => F.nodes[a].y - F.nodes[b].y);
        const type = WEAP[Math.floor(rnd() * WEAP.length)]; if (free.length && F.gold >= DEV[type].cost + 80) { F.gold -= DEV[type].cost; addDev(F, type, free[0]); }
      }
    }
  }

  /* ---------- phases ---------- */
  function start(ros) {
    demo = !!K.bot; mySide = MP.online() && !demo ? (MP.isHost() ? 0 : 1) : 0; posed = false;
    const opp = ros && ros.find(r => r.id !== MP.id), vsBot = demo || !MP.online();
    forts = [0, 1].map(s => newFort(s, s === mySide && !demo ? MP.name : vsBot ? 'Computer' : opp ? opp.name : 'Opponent', vsBot && (demo || s !== mySide)));
    shots = []; debris = []; rings = []; pend = []; parts = []; acc = 0; t = 0; overT = 0; winner = -1; ended = false; tool = 'wood'; tab = 0; drag = null; aimSel = null; msg = null; lastVer = -1;
    if (demo) { botBuild(forts[0]); botBuild(forts[1]); phase = 'battle'; forts.forEach(F => { F.ai.err = .06; }); }
    else { starter(forts[mySide]); if (vsBot) { botBuild(forts[1 - mySide]); forts[1 - mySide].ready = true; } phase = 'build'; buildT = BUILD_T; say('BUILD YOUR FORT', SIDEC[mySide], 2.5); }
    forts.forEach(F => { if (sim(F)) settle(F, 90); });
    mode = 'play'; K.score = 0; camGo(demo ? 'all' : 'mine', true);
  }
  function startBattle() {
    if (phase !== 'build') return; phase = 'battle'; tool = null; say('FIGHT!', '#ff5a3d', 1.8); K.sfx(220, .5, 'sawtooth', .1, 400); camGo('all');
    if (MP.online() && MP.isHost() && !demo) MP.send({ t: 'ph', p: 'battle' });
  }
  function coreDown(F) {
    if (phase === 'over') return; phase = 'over'; overT = 0; winner = 1 - F.side; flashT = .6; camGo(F.side === mySide ? 'mine' : 'theirs');
    if (MP.online() && !demo && F.side === mySide) MP.send({ t: 'dead' });
  }
  function finish() {
    if (ended) return; ended = true;
    if (demo) return K.over();
    const won = winner === mySide, E = forts[1 - mySide];
    K.score = (won ? 1000 : 0) + Math.round(E.lost);
    K.over({ title: won ? 'Victory!' : 'Your Core fell', text: won ? `You flattened ${E.name}'s fort.` : `${E.name} broke through. Brace better: triangles, steel and armor low down, a Deflector and Flak over the Core.`, delay: 300 });
  }
  function step(dt) {
    t += dt;
    for (const F of forts) if (sim(F)) physics(F, dt); else followSnap(F, dt);
    if (phase === 'build') { buildT -= dt; const me = forts[mySide], them = forts[1 - mySide]; if ((!MP.online() || MP.isHost()) && (buildT <= 0 || (me.ready && them.ready))) startBattle(); }
    if (phase === 'battle') for (const F of forts) if (sim(F)) {
      F.gold += (5 + F.devs.filter(d => d.alive && d.type === 'gen').reduce((a, d) => a + DEV.gen.inc + 2 * (d.lv - 1), 0)) * dt;
      for (const d of F.devs) { if (!d.alive) continue; const D = DEV[d.type]; if (D.reload && d.aim) { d.cd -= dt; if (d.cd <= 0) { d.cd = D.reload * L.rel(d); fireDev(F, d); } } if (d.type === 'shield' && (d.eT -= dt) <= 0) d.e = Math.min(shieldMax(d), d.e + 15 * dt * L.dmg(d)); }
      stepRepair(F, dt); if (F.bot) botThink(F, dt);
    }
    if (phase === 'battle') for (const F of forts) stepFlak(F, dt);
    stepPend(dt); stepShots(dt);
    for (const p of debris) { p.vy += GRAV * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt; p.t += dt; } debris = debris.filter(p => p.y < 1300 && p.t < 6);
    for (const p of parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .98; p.life -= dt; } parts = parts.filter(p => p.life > 0);
    for (const r of rings) r.t += dt; rings = rings.filter(r => r.t < .5);
    for (const F of forts) for (const d of F.devs) { if (d.aim && d.type !== 'flak') { let da = d.aim.a - d.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); d.ang += da * Math.min(1, dt * 8); } d.flash = Math.max(0, d.flash - dt); d.hitT = Math.max(0, d.hitT - dt); d.spin += dt * 9; if (d.zap && (d.zap.t -= dt) <= 0) d.zap = null; }
    if (phase === 'over') {
      overT += dt; const Lf = forts[1 - winner];
      if (overT < 2.4 && Math.random() < dt * 6) { const n = Lf.nodes.filter(q => q.alive); if (n.length) { const q = n[Math.floor(Math.random() * n.length)]; boom(q.x + (Math.random() - .5) * 30, q.y, 44, SIDEC[Lf.side], 1); if (sim(Lf)) blast(Lf, q.x, q.y, 50, 90); } }
      if (overT > 3.6) finish();
    }
    flashT = Math.max(0, flashT - dt * 1.5); if (msg) msg.k += dt;
    camStep(dt); net(dt);
  }

  /* ---------- online: my fort streams to you, yours to me ---------- */
  function net(dt) {
    if (!MP.online() || demo || (sendT -= dt) > 0) return; sendT = .1;
    const F = forts[mySide], m = { t: 's', n: [], h: F.beams.map(b => b.alive ? Math.max(1, Math.round(b.hp)) * (b.fire > 0 ? -1 : 1) : 0), d: F.devs.map(d => [d.n, d.type, d.alive ? Math.max(1, Math.round(d.hp)) : 0, d.aim ? +d.aim.a.toFixed(2) : null, Math.round(d.e), d.flash > .05 ? 1 : 0, d.lv]), g: Math.round(F.gold), r: F.ready ? 1 : 0 };
    for (const n of F.nodes) m.n.push(n.alive ? Math.round(n.x) : -1, Math.round(n.y));
    if (F.ver !== lastVer || (bsT -= .1) <= 0) { m.b = F.beams.map(b => [b.a, b.b, ['wood', 'steel', 'armor'].indexOf(b.mat)]); lastVer = F.ver; bsT = 2; }
    MP.send(m);
  }
  function onSnap(m) {
    const F = forts[1 - mySide];
    for (let i = 0; i < m.n.length / 2; i++) { const x = m.n[i * 2], y = m.n[i * 2 + 1]; let n = F.nodes[i]; if (!n) n = F.nodes[i] = { x, y, px: x, py: y, pin: false, m: 1, alive: true }; n.alive = x !== -1; if (n.alive) { n.tx = x; n.ty = y; if (!n.seen) { n.x = x; n.y = y; n.seen = 1; } } }
    F.nodes.length = m.n.length / 2;
    if (m.b) F.beams = m.b.map(([a, b, s], i) => Object.assign(F.beams[i] && F.beams[i].a === a && F.beams[i].b === b ? F.beams[i] : { hit: 0, f: 0, rest: 1 }, { a, b, mat: ['wood', 'steel', 'armor'][s] || 'wood' }));
    m.h.forEach((h0, i) => { const b = F.beams[i]; if (!b) return; const h = Math.abs(h0); if (b.alive && h && b.hp && h < b.hp - .5) b.hit = .3; if (b.alive && !h && F.nodes[b.a] && F.nodes[b.b]) { const A = F.nodes[b.a], B = F.nodes[b.b]; splinters((A.x + B.x) / 2, (A.y + B.y) / 2, MAT[b.mat], Math.atan2(B.y - A.y, B.x - A.x), Math.hypot(B.x - A.x, B.y - A.y)); } b.hp = h; b.alive = h > 0; b.fire = h0 < 0 ? 1 : 0; });
    F.devs = m.d.map(([n, type, hp, a, e, fl, lv], i) => { const o = F.devs[i] && F.devs[i].n === n && F.devs[i].type === type ? F.devs[i] : { ang: F.side ? Math.PI + .6 : -.6, spin: 0, flash: 0, hitT: 0 }; if (o.alive && !hp && F.nodes[n]) boom(F.nodes[n].x, F.nodes[n].y, type === 'core' ? 110 : 44, SIDEC[F.side], 1); return Object.assign(o, { n, type, hp, lv: lv || 1, alive: hp > 0, aim: a === null ? null : { a, p: 1 }, e, flash: fl ? .12 : o.flash }); });
    F.gold = m.g; F.ready = !!m.r;
  }
  function followSnap(F, dt) { const k = Math.min(1, dt * 14); for (const n of F.nodes) if (n.alive && n.tx !== undefined) { n.x += (n.tx - n.x) * k; n.y += (n.ty - n.y) * k; } }
  Object.assign(MP.opts, {
    max: 2, min: 2, bots: 0, solo: 'Play the computer', sub: '1v1 siege. Build a fort on your island, then blow up theirs.',
    onStart: (cfg, ros) => start(ros),
    onMsg: m => {
      if (mode !== 'play' || demo) return;
      if (m.t === 's') onSnap(m);
      else if (m.t === 'f' && m.a) { const [x, y, vx, vy] = m.a; launch(m.s, m.w, x, y, vx, vy, m.d || DEV[m.w].dmg, false, m.id); }
      else if (m.t === 'x') { const s = shots.find(q => q.id === m.id); if (s) { s.dead = true; boom(s.x, s.y, 18, '#ffd890', 0); } }
      else if (m.t === 'ph' && m.p === 'battle') { phase = 'build'; startBattle(); }
      else if (m.t === 'dead') { const F = forts[1 - mySide]; F.dead = true; const c = core(F); if (c && F.nodes[c.n]) boom(F.nodes[c.n].x, F.nodes[c.n].y, 110, SIDEC[F.side], 2); coreDown(F); }
    },
    onLeave: () => { if (mode === 'play' && phase !== 'over' && !demo) { say('Your opponent left. You win!', '#5cf28a', 3); winner = mySide; phase = 'over'; overT = 2.4; } },
  });

  /* ---------- camera: pan, zoom, pinch, minimap, quick views ---------- */
  const cam = { x: 440, y: 380, z: 1, tx: 440, ty: 380, tz: 1 };
  const zMin = () => Math.min(1, (K.view.x1 - K.view.x0) / (WW + 160));
  const toWorld = (kx, ky) => [cam.x + (kx - 640) / cam.z, cam.y + (ky - 360) / cam.z];
  function clampCam(o) {
    const hw = (K.view.x1 - K.view.x0) / 2 / o.z; o.x = hw * 2 >= WW + 160 ? WW / 2 : cl(o.x, hw - 80, WW + 80 - hw); o.y = cl(o.y, -420, 860);
  }
  function camGo(which, snap) {
    const I = ISL[which === 'mine' ? mySide : which === 'theirs' ? 1 - mySide : 0];
    const o = which === 'all' ? { x: WW / 2, y: GY - 260, z: zMin() } : { x: (I.x0 + I.x1) / 2 + (which === 'mine' ? (mySide ? -60 : 60) : 0), y: GY - 190, z: .9 };
    clampCam(o); cam.tx = o.x; cam.ty = o.y; cam.tz = o.z; if (snap) { cam.x = o.x; cam.y = o.y; cam.z = o.z; }
  }
  function camStep(dt) {
    if (demo && Math.floor(t / 7) !== cam.demoK) { cam.demoK = Math.floor(t / 7); camGo(['all', 'theirs', 'all', 'mine'][cam.demoK % 4]); }
    const k = Math.min(1, dt * 5); cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k; cam.z += (cam.tz - cam.z) * k;
  }
  function zoomAt(kx, ky, f) { const [wx, wy] = toWorld(kx, ky); const z = cl(cam.z * f, zMin(), 1.7); const o = { x: wx - (kx - 640) / z, y: wy - (ky - 360) / z, z }; clampCam(o); Object.assign(cam, { x: o.x, y: o.y, z, tx: o.x, ty: o.y, tz: z }); }
  addEventListener('wheel', e => { if (mode !== 'play' || K.state !== 'play') return; const v = K.view; zoomAt(v.x0 + e.clientX / innerWidth * (v.x1 - v.x0), v.y0 + e.clientY / innerHeight * (v.y1 - v.y0), e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: true });
  const MM = () => { const v = K.view; return { x: 640 - 230, y: v.y0 + 100, w: 460, h: 46 }; };
  const CAMB = () => { const m = MM(); return { mine: { x: m.x - 96, y: m.y + 6, w: 86, h: 34 }, all: { x: m.x + m.w / 2 - 36, y: m.y + m.h + 6, w: 72, h: 28 }, theirs: { x: m.x + m.w + 10, y: m.y + 6, w: 86, h: 34 } }; };

  /* ---------- input: building, deleting, upgrading, aiming, looking around ---------- */
  const TBL = () => { const v = K.view, w = 84, gap = 6, x0 = 640 - (96 + 8 * (w + gap) + 166) / 2, y = v.y1 - 102; return { tabs: TABS.map((_, i) => ({ i, x: x0, y: y + i * 31, w: 90, h: 28 })), items: Array.from({ length: 8 }, (_, i) => ({ x: x0 + 96 + i * (w + gap), y, w, h: 92 })), act: { x: x0 + 96 + 8 * (w + gap) + 6, y, w: 160, h: 92 } }; };
  const inB = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  const tabItems = () => [...TABS[tab][1], ...Array(6 - TABS[tab][1].length).fill(null)].slice(0, 6).concat(['up', 'del']);
  const toolCost = k => MAT[k] ? MAT[k].cost : DEV[k] ? DEV[k].cost : 0;
  const myF = () => forts[mySide];
  function beamEnd(F, from, x, y) {
    const z = ZONE[F.side]; let j = nearNode(F, x, y, SNAP / Math.min(1, cam.z)); if (j === from) j = -1;
    if (j >= 0) return { j, x: F.nodes[j].x, y: F.nodes[j].y };
    x = cl(x, z.x0, z.x1); const gy = groundY(x); y = cl(y, z.y0, gy); if (gy - y < 16) y = gy;
    return { j: -1, x, y };
  }
  function beamOK(F, d) {
    const A = d.from >= 0 ? F.nodes[d.from] : d.start, e = beamEnd(F, d.from, d.x, d.y), len = Math.hypot(e.x - A.x, e.y - A.y), cost = MAT[d.mat].cost;
    return { e, len, cost, why: len > MAXLEN ? 'Too long' : len < MINLEN ? 'Too short' : liveBeams(F) >= MAXB ? 'Beam limit reached' : F.gold < cost ? 'Not enough gold' : '' };
  }
  function commitBeam(F, d) {
    const r = beamOK(F, d); if (r.why) { sound('nope'); say(r.why, '#ff8a8a', 1.2); return; }
    const a = d.from >= 0 ? d.from : addNode(F, d.start.x, d.start.y), b = r.e.j >= 0 ? r.e.j : addNode(F, r.e.x, r.e.y);
    if (addBeam(F, a, b, d.mat) >= 0) { F.gold -= r.cost; sound('build'); burst(r.e.x, r.e.y, [MAT[d.mat].col, '#fff'], 6, 80, .3, 3); }
  }
  const devNear = (F, x, y, r = 24) => F.devs.find(q => q.alive && Math.hypot(pivot(F, q)[0] - x, pivot(F, q)[1] - y) < r / Math.min(1, cam.z));
  function placeDev(F, type, x, y) {
    const n = nearNode(F, x, y, 24 / Math.min(1, cam.z)); if (n < 0) { sound('nope'); say('Put it on one of your bolts', '#ff8a8a', 1.4); return; }
    if (devAt(F, n)) { sound('nope'); say('That bolt is taken', '#ff8a8a', 1.2); return; }
    if (F.gold < DEV[type].cost) { sound('nope'); say('Not enough gold', '#ff8a8a', 1.2); return; }
    if (addDev(F, type, n) >= 0) { F.gold -= DEV[type].cost; sound('build'); if (DEV[type].reload) { aimSel = F.devs[F.devs.length - 1]; tool = null; say('Now drag to aim it', SIDEC[F.side], 1.6); } }
  }
  function deleteAt(F, x, y) {
    const refund = phase === 'build' ? 1 : .5, d = devNear(F, x, y, 20);
    if (d && d.type !== 'core') { d.alive = false; F.ver++; masses(F); F.gold += DEV[d.type].cost * refund; sound('build'); return; }
    let best = null, bd = 10 / Math.min(1, cam.z); for (const b of F.beams) if (b.alive) { const A = F.nodes[b.a], B = F.nodes[b.b], dd = segDist(x, y, A.x, A.y, B.x, B.y); if (dd < bd) { bd = dd; best = b; } }
    if (best) { const keep = F.lost; breakBeam(F, best, false); F.lost = keep; F.gold += MAT[best.mat].cost * refund; sound('build'); }
  }
  const aimFrom = (F, d, x, y) => { const [px, py] = pivot(F, d), a = Math.atan2(y - py, x - px), p = cl((Math.hypot(x - px, y - py) * Math.min(1, cam.z) - 30) / 230, 0, 1); return { a, p }; };
  const ptrs = new Map(); let pan = null, pinch = null, mmDrag = false;
  GAME.down = (kx, ky, e) => {
    K.audio && K.audio(); if (mode !== 'play' || demo) return;
    const id = e ? e.pointerId : 0; ptrs.set(id, { x: kx, y: ky });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: cam.z, w: toWorld(mx, my) }; drag = null; aimPt = null; pan = null; return; }
    const tb = TBL(), F = myF(), m = MM(), cb = CAMB();
    for (const k in cb) if (inB(cb[k], kx, ky)) { camGo(k); sound('build'); return; }
    if (inB(m, kx, ky)) { mmDrag = true; cam.tx = cl((kx - m.x) / m.w, 0, 1) * WW; const o = { x: cam.tx, y: cam.ty, z: cam.tz }; clampCam(o); cam.tx = o.x; return; }
    if (phase !== 'over') {
      const tb2 = tb.tabs.find(b => inB(b, kx, ky)); if (tb2) { tab = tb2.i; sound('build'); return; }
      const it = tb.items.findIndex(b => inB(b, kx, ky)); if (it >= 0) { const k = tabItems()[it]; if (k) { tool = tool === k ? null : k; aimSel = null; sound('build'); } return; }
      if (inB(tb.act, kx, ky)) { if (phase === 'build') { F.ready = !F.ready; sound('build'); if (F.ready) say(MP.online() ? 'Ready! Waiting for your opponent' : 'Ready!', '#5cf28a', 1.6); } else tool = null; return; }
      if (ky > tb.act.y - 4 && kx > tb.tabs[0].x - 10 && kx < tb.act.x + tb.act.w + 10) return;
    }
    const [x, y] = toWorld(kx, ky);
    if (phase !== 'over') {
      if (tool === 'wood' || tool === 'steel' || tool === 'armor') {
        const n = nearNode(F, x, y, SNAP / Math.min(1, cam.z)), z = ZONE[F.side], gy = groundY(x);
        if (n >= 0) { drag = { mat: tool, from: n, x, y }; return; }
        if (x > z.x0 && x < z.x1 && Math.abs(y - gy) < 26) { drag = { mat: tool, from: -1, start: { x, y: gy }, x, y }; return; }
      } else if (tool === 'del') return deleteAt(F, x, y);
      else if (tool === 'up') { const d = devNear(F, x, y); if (d) { const why = upgrade(F, d); if (why) { sound('nope'); say(why, '#ff8a8a', 1.2); } else { sound('up'); say(`${DEV[d.type].name} level ${d.lv}!`, '#ffd23f', 1.4); burst(...pivot(F, d), ['#ffd23f', '#fff'], 16, 160, .5, 4); } return; } }
      else if (tool && DEV[tool]) { if (nearNode(F, x, y, 24 / Math.min(1, cam.z)) >= 0) return placeDev(F, tool, x, y); }
      else { let w = null, wd = 30 / Math.min(1, cam.z); for (const d of F.devs) { if (!d.alive || !DEV[d.type].reload) continue; const q = Math.hypot(pivot(F, d)[0] - x, pivot(F, d)[1] - y); if (q < wd) { wd = q; w = d; } } if (w) { aimSel = w; aimPt = { x, y }; return; } if (aimSel) { aimPt = { x, y }; return; } }
    }
    pan = { kx, ky, x: cam.x, y: cam.y };   // nothing to touch here: look around
  };
  GAME.move = (kx, ky, e) => {
    hoverK = [kx, ky]; const id = e ? e.pointerId : 0; if (ptrs.has(id)) ptrs.set(id, { x: kx, y: ky });
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, z = cl(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, zMin(), 1.7); const o = { x: pinch.w[0] - (mx - 640) / z, y: pinch.w[1] - (my - 360) / z, z }; clampCam(o); Object.assign(cam, { x: o.x, y: o.y, z, tx: o.x, ty: o.y, tz: z }); return; }
    if (mmDrag) { const m = MM(); cam.tx = cl((kx - m.x) / m.w, 0, 1) * WW; const o = { x: cam.tx, y: cam.ty, z: cam.tz }; clampCam(o); cam.tx = o.x; return; }
    if (pan) { const o = { x: pan.x - (kx - pan.kx) / cam.z, y: pan.y - (ky - pan.ky) / cam.z, z: cam.z }; clampCam(o); cam.x = cam.tx = o.x; cam.y = cam.ty = o.y; return; }
    const [x, y] = toWorld(kx, ky); if (drag) { drag.x = x; drag.y = y; } if (aimSel && aimPt) aimPt = { x, y };
  };
  GAME.up = (kx, ky, e) => {
    const id = e ? e.pointerId : 0; ptrs.delete(id); if (pinch) { if (ptrs.size < 2) pinch = null; return; }
    pan = null; mmDrag = false; const F = myF(); if (!F) return; const [x, y] = toWorld(kx, ky);
    if (drag) { drag.x = x; drag.y = y; commitBeam(F, drag); drag = null; }
    if (aimSel && aimPt) { const [px, py] = pivot(F, aimSel); if (Math.hypot(x - px, y - py) * Math.min(1, cam.z) > 34) { aimSel.aim = aimFrom(F, aimSel, x, y); if (aimSel.cd > 1.2 && phase === 'battle') aimSel.cd = 1.2; sound('build'); } aimPt = null; }
  };
  GAME.key = (c, d) => {
    if (!d || mode !== 'play' || demo) return;
    const n = /^Digit([1-3])$/.exec(c); if (n) { tab = +n[1] - 1; return; }
    if (c === 'Escape' || c === 'KeyQ') { tool = null; aimSel = null; }
    else if (c === 'Enter' && phase === 'build') { myF().ready = true; say('Ready!', '#5cf28a', 1.4); }
    else if (c === 'ArrowLeft' || c === 'KeyA') { cam.tx -= 200 / cam.z; const o = { x: cam.tx, y: cam.ty, z: cam.tz }; clampCam(o); cam.tx = o.x; }
    else if (c === 'ArrowRight' || c === 'KeyD') { cam.tx += 200 / cam.z; const o = { x: cam.tx, y: cam.ty, z: cam.tz }; clampCam(o); cam.tx = o.x; }
    else if (c === 'Equal' || c === 'NumpadAdd') zoomAt(640, 360, 1.15); else if (c === 'Minus' || c === 'NumpadSubtract') zoomAt(640, 360, 1 / 1.15);
  };
  let hoverK = [640, 360];

  /* ---------- art: painted once into sprites, then layered with parallax and light ---------- */
  const ART = {};
  const mkCv = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; };
  function cloudSprite(w, h, seed, lit, shade, rim) {   // a painted cumulus: flat shaded base, sunlit domes, a bright rim
    const r = mulberry(seed), base = h * .78, blobs = [];
    for (let i = 0; i < 11; i++) { const u = .2 + i / 10 * .6 + (r() - .5) * .04, hump = Math.sin((u - .2) / .6 * Math.PI), s2 = h * (.1 + hump * .24 + r() * .06); blobs.push([w * u, base - s2 * (.55 + r() * .25), s2]); }
    for (let i = 0; i < 4; i++) { const u = .35 + r() * .3, s2 = h * (.18 + r() * .1); blobs.push([w * u, base - s2 * 1.2 - h * .1, s2]); }
    const shape = (g, dy = 0, k = 1) => { g.beginPath(); for (const [x, y, s2] of blobs) { g.moveTo(x + s2 * k, y + dy); g.arc(x, y + dy, s2 * k, 0, TAU); } g.moveTo(w * .86, base); g.ellipse(w / 2, base, w * .36, h * .1, 0, 0, TAU); };
    const raw = mkCv(w, h, (g) => {
      g.save(); g.beginPath(); g.rect(0, 0, w, base + 1); g.clip();
      shape(g); g.fillStyle = shade; g.fill();
      g.save(); shape(g); g.clip();
      const lg = g.createLinearGradient(0, h * .05, 0, base); lg.addColorStop(0, lit); lg.addColorStop(.55, lit); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; shape(g, -h * .07, .9); g.fill();
      g.fillStyle = rim; shape(g, -h * .1, .72); g.globalAlpha = .55; g.fill(); g.globalAlpha = 1;
      g.restore(); g.restore();
    });
    return mkCv(w, h, (g) => { g.filter = 'blur(1.5px)'; g.drawImage(raw, 0, 0); g.filter = 'none'; });
  }
  function mulberry(s) { return () => { s = s + 0x6D2B79F5 | 0; let q = Math.imul(s ^ s >>> 15, 1 | s); q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q; return ((q ^ q >>> 14) >>> 0) / 4294967296; }; }
  function islandSprite(s) {
    const I = ISL[s], ox = I.x0 - 40, oy = GY - 120, w = I.x1 - I.x0 + 80, h = 700, r = mulberry(17 + s * 31), cx = (I.x0 + I.x1) / 2 - ox;
    return { ox, oy, c: mkCv(w, h, (g) => {
      const top = []; for (let x = I.x0; x <= I.x1; x += 5) top.push([x - ox, groundY(x) - oy]);
      // a jagged rock underside tapering to a spire
      const under = []; const N = 26; for (let i = 0; i <= N; i++) { const u = i / N, x = lp(I.x1 - ox, I.x0 - ox, u), depth = Math.sin(u * Math.PI) ** .8 * (360 + r() * 60) + 70, y = (GY - oy) + 40 + depth * (.9 + r() * .2) * (1 - Math.abs(u - .5) * .6); under.push([x + (r() - .5) * 18, y]); }
      under.push([I.x0 - ox, GY - oy + 50]);
      const path = () => { g.beginPath(); top.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); under.forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); };
      path(); const gr = g.createLinearGradient(0, GY - oy, 0, h); gr.addColorStop(0, '#8b5d45'); gr.addColorStop(.18, '#6c4250'); gr.addColorStop(.55, '#3f2446'); gr.addColorStop(1, '#1d1028'); g.fillStyle = gr; g.fill();
      g.save(); path(); g.clip();
      for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(20,6,26,${.16 + (k % 3) * .06})`; g.lineWidth = 3 + (k % 3) * 3; g.beginPath(); for (let x = 0; x <= w; x += 12) g.lineTo(x, (GY - oy) + 30 + k * 30 + Math.sin(x * .015 + k * 1.9) * 9 + Math.sin(x * .05 + k) * 3); g.stroke(); g.strokeStyle = `rgba(255,190,150,${.05 + (k % 2) * .03})`; g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= w; x += 12) g.lineTo(x, (GY - oy) + 26 + k * 30 + Math.sin(x * .015 + k * 1.9) * 9); g.stroke(); }
      for (let k = 0; k < 22; k++) { const x = r() * w, y = (GY - oy) + 40 + r() * 380; g.strokeStyle = 'rgba(15,5,20,.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) g.lineTo(x + (r() - .5) * 26, y + j * 12 + r() * 10); g.stroke(); }
      // light from the sun in the middle of the sky: warm on the inner face, cool shade on the outer
      const lg = g.createLinearGradient(s ? 0 : w, 0, s ? w : 0, 0); lg.addColorStop(0, 'rgba(255,170,110,.32)'); lg.addColorStop(.45, 'rgba(255,170,110,0)'); lg.addColorStop(1, 'rgba(20,10,60,.35)'); g.fillStyle = lg; g.fillRect(0, 0, w, h);
      const ao = g.createLinearGradient(0, GY - oy, 0, GY - oy + 60); ao.addColorStop(0, 'rgba(10,4,16,.45)'); ao.addColorStop(1, 'rgba(10,4,16,0)'); g.fillStyle = ao; g.fillRect(0, GY - oy, w, 60);
      g.restore();
      // glowing crystals in the underside
      for (let k = 0; k < 7; k++) { const x = cx + (r() - .5) * w * .55, y = (GY - oy) + 120 + r() * 230, s2 = 8 + r() * 14, col = k % 2 ? '#7fe8ff' : '#c49bff'; const gl = g.createRadialGradient(x, y, 1, x, y, s2 * 3); gl.addColorStop(0, col + '88'); gl.addColorStop(1, col + '00'); g.fillStyle = gl; g.fillRect(x - s2 * 3, y - s2 * 3, s2 * 6, s2 * 6); g.fillStyle = col; g.beginPath(); g.moveTo(x, y - s2); g.lineTo(x + s2 * .45, y); g.lineTo(x, y + s2 * .9); g.lineTo(x - s2 * .45, y); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.moveTo(x, y - s2); g.lineTo(x + s2 * .2, y - s2 * .2); g.lineTo(x, y); g.closePath(); g.fill(); }
      // roots and vines hanging off the bottom
      for (let k = 0; k < 18; k++) { const x = cx + (r() - .5) * w * .7, y0 = (GY - oy) + 60 + r() * 220, len = 30 + r() * 90; g.strokeStyle = k % 3 ? 'rgba(80,130,60,.8)' : 'rgba(60,40,30,.8)'; g.lineWidth = 2 + r() * 2; g.beginPath(); g.moveTo(x, y0); g.bezierCurveTo(x + 10, y0 + len * .3, x - 12, y0 + len * .6, x + (r() - .5) * 10, y0 + len); g.stroke(); if (k % 3) for (let j = 0; j < 4; j++) { g.fillStyle = '#5c9a44'; g.beginPath(); g.ellipse(x + (r() - .5) * 8, y0 + len * (j + 1) / 5, 4, 2, r(), 0, TAU); g.fill(); } }
      // turf: a thick lip of soil, then layered grass
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = '#3d2a1e'; g.lineWidth = 16; g.beginPath(); top.forEach(([x, y], i) => i ? g.lineTo(x, y + 8) : g.moveTo(x, y + 8)); g.stroke();
      g.strokeStyle = '#2f6b2f'; g.lineWidth = 12; g.beginPath(); top.forEach(([x, y], i) => i ? g.lineTo(x, y + 3) : g.moveTo(x, y + 3)); g.stroke();
      g.strokeStyle = '#58a63e'; g.lineWidth = 6; g.beginPath(); top.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
      g.strokeStyle = '#9ae06a'; g.lineWidth = 2; g.beginPath(); top.forEach(([x, y], i) => i ? g.lineTo(x, y - 2) : g.moveTo(x, y - 2)); g.stroke();
      for (const [x, y] of top) for (let j = 0; j < 2; j++) { g.strokeStyle = r() < .5 ? '#6fc24e' : '#4c9a38'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x + j * 2, y); g.quadraticCurveTo(x + j * 2 + (r() - .5) * 6, y - 5, x + j * 2 + (r() - .5) * 8, y - 6 - r() * 8); g.stroke(); }
      for (let k = 0; k < 26; k++) { const [x, y] = top[Math.floor(r() * top.length)]; g.fillStyle = ['#ffd23f', '#ff8ad8', '#ffffff', '#ff6a5a'][k % 4]; g.beginPath(); g.arc(x, y - 4, 2, 0, TAU); g.fill(); }
      // trees and boulders out at the back edge, clear of the build area
      const back = s ? I.x1 - ox - 40 : I.x0 - ox + 40;
      for (let k = 0; k < 3; k++) { const x = back + (s ? -1 : 1) * k * 26 + (r() - .5) * 10, y = groundY(x + ox) - oy, th = 40 + r() * 30;
        g.fillStyle = '#4a2e22'; g.fillRect(x - 3, y - th, 6, th);
        for (let j = 0; j < 3; j++) { const cy = y - th - j * 14, rr = 22 - j * 5; const tg = g.createRadialGradient(x - rr * .3, cy - rr * .4, 2, x, cy, rr); tg.addColorStop(0, '#8fd36a'); tg.addColorStop(1, '#2e6b32'); g.fillStyle = tg; g.beginPath(); g.arc(x, cy, rr, 0, TAU); g.fill(); } }
      for (let k = 0; k < 5; k++) { const x = (s ? w - 70 : 70) + (r() - .5) * 60, y = groundY(x + ox) - oy, rr = 6 + r() * 9; const bg = g.createRadialGradient(x - rr * .3, y - rr * .5, 1, x, y - rr * .2, rr); bg.addColorStop(0, '#a08a9c'); bg.addColorStop(1, '#4a3a52'); g.fillStyle = bg; g.beginPath(); g.ellipse(x, y - rr * .4, rr * 1.3, rr, 0, 0, TAU); g.fill(); }
    }) };
  }
  function buildArt() {
    ART.clouds = [0, 1, 2, 3, 4, 5].map(i => cloudSprite(420 + i * 40, 170, 101 + i, '#f6a98f', '#7d4a86', '#ffd9b8'));
    ART.sea = [0, 1, 2].map(i => cloudSprite(620, 220, 301 + i, '#ffd2c2', '#b07aa8', '#fff1e6'));
    ART.isl = [0, 1].map(islandSprite);
    ART.far = [0, 1, 2, 3, 4, 5, 6].map(i => { const r = mulberry(500 + i), w = 120 + r() * 160; return { x: r() * (WW + 1200) - 600, y: GY - 160 - r() * 220, w, c: mkCv(w + 20, w * .9, (g) => { g.fillStyle = '#000'; g.beginPath(); g.moveTo(10, 14); for (let k = 0; k <= 10; k++) g.lineTo(10 + w * k / 10, 10 + (r() - .5) * 8); for (let k = 10; k >= 0; k--) g.lineTo(10 + w * k / 10, 18 + Math.sin(k / 10 * Math.PI) * w * .7 * (.7 + r() * .3)); g.closePath(); g.fill(); }) }; });
  }
  const STARS = Array.from({ length: 140 }, (_, i) => [((i * 197) % 1600) - 160, ((i * 83) % 330) - 30, (i % 7) / 7]);
  const scr = (wx, wy, par) => [640 + (wx - cam.x) * cam.z * par, 360 + (wy - cam.y) * cam.z * par];
  function drawSky(g) {
    const v = K.view, gr = g.createLinearGradient(0, v.y0, 0, v.y1);
    gr.addColorStop(0, '#0b0624'); gr.addColorStop(.3, '#2e1650'); gr.addColorStop(.55, '#7a2f6c'); gr.addColorStop(.74, '#e0645a'); gr.addColorStop(.9, '#ffb36b'); gr.addColorStop(1, '#ffd79a');
    g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    for (const [x, y, k] of STARS) { g.globalAlpha = (.25 + k * .6) * (.55 + .45 * Math.sin(t * 1.7 + x)); g.fillStyle = k > .8 ? '#ffe9c4' : '#fff'; g.fillRect(x, y + v.y0 * .3, k > .7 ? 2.5 : 1.6, k > .7 ? 2.5 : 1.6); } g.globalAlpha = 1;
    const [sx, sy] = scr(WW / 2, GY - 60, .35);
    // sun rays
    g.save(); g.globalCompositeOperation = 'lighter'; g.translate(sx, sy);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * .03; g.rotate(TAU / 12); g.fillStyle = `rgba(255,200,140,${.035 + .02 * Math.sin(t * .7 + i)})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(900, -40 - (i % 3) * 25); g.lineTo(900, 40 + (i % 3) * 25); g.closePath(); g.fill(); }
    g.restore();
    const sg = g.createRadialGradient(sx, sy, 10, sx, sy, 330); sg.addColorStop(0, 'rgba(255,236,180,1)'); sg.addColorStop(.18, 'rgba(255,190,120,.6)'); sg.addColorStop(1, 'rgba(255,120,90,0)'); g.fillStyle = sg; g.fillRect(sx - 330, sy - 330, 660, 660);
    const sd = g.createRadialGradient(sx - 14, sy - 18, 4, sx, sy, 70); sd.addColorStop(0, '#fffbe6'); sd.addColorStop(1, '#ffd27a'); g.fillStyle = sd; g.beginPath(); g.arc(sx, sy, 66, 0, TAU); g.fill();
    // far floating rocks in haze, then high clouds
    for (const f of ART.far) { const [x, y] = scr(f.x, f.y, .3); g.globalAlpha = .55; g.filter = 'none'; g.drawImage(tint(f.c, '#5a2a6a'), x - f.w / 2 * cam.z * .3 * 2, y, f.w * cam.z * .6 + 12, f.w * .9 * cam.z * .6); } g.globalAlpha = 1;
    for (let k = 0; k < 9; k++) { const c = ART.clouds[k % 6], wx = ((k * 470 + t * (6 + k % 3 * 3)) % (WW + 1600)) - 800, wy = GY - 420 + (k % 4) * 70, [x, y] = scr(wx, wy, .55), s = cam.z * .55 + .25; g.globalAlpha = .55 + (k % 3) * .12; g.drawImage(c, x - c.width * s / 2, y - c.height * s / 2, c.width * s, c.height * s); } g.globalAlpha = 1;
  }
  const TINT = new Map();
  function tint(c, col) { const k = c; if (TINT.has(k)) return TINT.get(k); const o = mkCv(c.width, c.height, g => { g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(40,16,60,.4)'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height); }); TINT.set(k, o); return o; }
  function drawWorldBack(g) {   // in world space: waterfalls behind the islands, then the islands
    for (const [s, x] of [[0, ISL[0].x1 - 36], [1, ISL[1].x0 + 36]]) {
      const top = groundY(x) + 8, gr = g.createLinearGradient(0, top, 0, top + 520); gr.addColorStop(0, 'rgba(150,225,255,.95)'); gr.addColorStop(.7, 'rgba(210,240,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - 10, top); g.lineTo(x + 10, top); g.lineTo(x + 22, top + 520); g.lineTo(x - 22, top + 520); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; for (let k = 0; k < 12; k++) { const y = top + ((t * 190 + k * 43) % 500); g.fillRect(x - 8 + (k % 4) * 4 + (y - top) * .02 * ((k % 2) * 2 - 1), y, 2.5, 18); }
    }
    for (const I of ART.isl) g.drawImage(I.c, I.ox, I.oy);
  }
  function drawSea(g) {   // the cloud sea the debris falls into
    for (let k = 0; k < 16; k++) { const c = ART.sea[k % 3], x = ((k * 360 + t * (10 + (k % 4) * 6)) % (WW + 1400)) - 700, y = GY + 260 + (k % 3) * 70; g.globalAlpha = .75 + (k % 2) * .2; g.drawImage(c, x, y, c.width * 1.2, c.height * 1.2); }
    g.globalAlpha = 1; const gr = g.createLinearGradient(0, GY + 380, 0, GY + 900); gr.addColorStop(0, 'rgba(255,220,215,0)'); gr.addColorStop(1, 'rgba(255,232,226,.95)'); g.fillStyle = gr; g.fillRect(-1200, GY + 380, WW + 2400, 1200);
  }
  // beams: bevelled with a drop shadow; planks for wood, an I-beam for steel, plated slabs for armor
  function drawBeam(g, A, B, b, mine, shadow) {
    const M = MAT[b.mat], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy); if (len < 1) return;
    g.save(); g.translate(A.x, A.y); g.rotate(Math.atan2(dy, dx));
    const th = b.mat === 'armor' ? 13 : b.mat === 'steel' ? 10 : 9, h2 = th / 2;
    if (shadow) { g.fillStyle = 'rgba(10,4,20,.28)'; g.fillRect(-1, -h2 + 4, len + 2, th); g.restore(); return; }
    g.fillStyle = M.dark; g.fillRect(-2, -h2 - 1, len + 4, th + 2);
    if (b.mat === 'wood') {
      g.fillStyle = M.col; g.fillRect(0, -h2, len, th); g.fillStyle = '#c08a52'; g.fillRect(0, -h2, len, 2); g.fillStyle = '#6e4322'; g.fillRect(0, h2 - 2, len, 2);
      g.strokeStyle = 'rgba(80,45,18,.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(4, -1); g.bezierCurveTo(len * .3, -2.5, len * .6, .5, len - 4, -1); g.moveTo(8, 1.5); g.lineTo(len * .55, 1.8); g.stroke();
      g.fillStyle = '#3a2a24'; g.fillRect(1, -h2, 4, th); g.fillRect(len - 5, -h2, 4, th);
    } else if (b.mat === 'steel') {
      g.fillStyle = '#5c6676'; g.fillRect(0, -h2, len, th); g.fillStyle = '#aab4c4'; g.fillRect(0, -h2, len, 2.5); g.fillRect(0, h2 - 3, len, 2); g.fillStyle = '#7e8898'; g.fillRect(0, -1.5, len, 3);
      g.fillStyle = '#d6dde8'; for (let x = 7; x < len - 4; x += 14) { g.beginPath(); g.arc(x, -h2 + 1.3, .9, 0, TAU); g.arc(x, h2 - 1.3, .9, 0, TAU); g.fill(); }
    } else {
      const gr = g.createLinearGradient(0, -h2, 0, h2); gr.addColorStop(0, '#8a93a3'); gr.addColorStop(.25, '#5c6472'); gr.addColorStop(1, '#2c323d'); g.fillStyle = gr; g.fillRect(0, -h2, len, th);
      g.strokeStyle = 'rgba(15,18,24,.7)'; g.lineWidth = 1.2; for (let x = 18; x < len - 6; x += 22) { g.beginPath(); g.moveTo(x, -h2); g.lineTo(x, h2); g.stroke(); }
      g.fillStyle = '#c8d0dc'; for (let x = 6; x < len - 3; x += 11) { g.beginPath(); g.arc(x, 0, 1.3, 0, TAU); g.fill(); }
    }
    const hp = b.hp / M.hp;
    if (hp < .99) { g.strokeStyle = `rgba(15,6,6,${.75 * (1 - hp)})`; g.lineWidth = 1.5; g.beginPath(); for (let k = 0; k < 3; k++) { const x = len * (.22 + k * .28); g.moveTo(x - 3, -h2); g.lineTo(x + 2, 0); g.lineTo(x - 2, h2); } g.stroke(); }
    if (b.fire > 0) { g.fillStyle = `rgba(255,${120 + Math.random() * 60},40,${.35 + Math.random() * .2})`; g.fillRect(0, -h2 - 1, len, th + 2); }
    const st = Math.abs(b.f || 0) / M.maxF; if (st > .45 && mine) { g.fillStyle = `rgba(255,40,40,${cl((st - .45) * 1.4, 0, .75)})`; g.fillRect(0, -h2, len, th); }
    if (b.hit > 0) { g.fillStyle = `rgba(255,255,255,${b.hit * 2})`; g.fillRect(0, -h2, len, th); }
    g.restore();
  }
  function metal(g, x, y, w, h, r, c0, c1) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); g.strokeStyle = 'rgba(8,6,14,.85)'; g.lineWidth = 1.5; g.stroke(); }
  function drawDev(g, F, d, ghost) {
    const [px, py] = pivot(F, d), D = DEV[d.type], c = SIDEC[F.side], c2 = SIDEC2[F.side];
    g.save(); g.translate(px, py);
    // shared turret base for weapons and machines
    const base = (w2 = 13) => { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 9, w2 + 2, 3.5, 0, 0, TAU); g.fill(); metal(g, -w2, 0, w2 * 2, 8, 3, '#5a5868', '#24222e'); const dg = g.createRadialGradient(-3, -4, 1, 0, 0, w2 - 2); dg.addColorStop(0, '#77738a'); dg.addColorStop(1, '#2c2a38'); g.fillStyle = dg; g.beginPath(); g.arc(0, 1, w2 - 2, Math.PI, 0); g.fill(); g.fillStyle = c; g.fillRect(-w2 + 2, 4, w2 * 2 - 4, 2); };
    if (d.type === 'core') {
      const pulse = .7 + .3 * Math.sin(t * 4 + F.side), gl = g.createRadialGradient(0, 0, 4, 0, 0, 58); gl.addColorStop(0, c); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = .6 * pulse; g.fillStyle = gl; g.fillRect(-58, -58, 116, 116); g.globalAlpha = 1;
      metal(g, -22, 10, 44, 10, 3, '#5a5868', '#22202c');
      g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; g.lineTo(Math.cos(a) * 23, Math.sin(a) * 23); } g.closePath(); const fr = g.createLinearGradient(0, -23, 0, 23); fr.addColorStop(0, '#6a6680'); fr.addColorStop(1, '#1e1c28'); g.fillStyle = fr; g.fill(); g.strokeStyle = '#0a0812'; g.lineWidth = 2.5; g.stroke();
      const cg = g.createLinearGradient(-9, -16, 9, 16); cg.addColorStop(0, '#ffffff'); cg.addColorStop(.35, c); cg.addColorStop(1, c2); g.fillStyle = cg; g.beginPath(); g.moveTo(0, -17); g.lineTo(10, 0); g.lineTo(0, 17); g.lineTo(-10, 0); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.moveTo(0, -14); g.lineTo(4, -3); g.lineTo(0, -1); g.closePath(); g.fill();
    } else if (d.type === 'shield') {
      base(11); g.fillStyle = '#2a2836'; g.fillRect(-2, -12, 4, 12); const dg = g.createRadialGradient(0, -13, 1, 0, -13, 9); dg.addColorStop(0, '#ffffff'); dg.addColorStop(.4, c); dg.addColorStop(1, c2); g.fillStyle = dg; g.beginPath(); g.arc(0, -13, 7, 0, TAU); g.fill();
    } else if (d.type === 'gen') {
      metal(g, -14, -10, 28, 19, 4, '#5e5a70', '#262432'); g.fillStyle = '#ffd23f'; g.fillRect(-10, -6, 20, 3); g.fillStyle = '#1a1622'; g.fillRect(-10, -1, 20, 6);
      g.save(); g.translate(0, -16); g.rotate(d.spin); for (let i = 0; i < 3; i++) { g.rotate(TAU / 3); metal(g, -2.5, -15, 5, 14, 2, '#e4ddf0', '#8a82a0'); } g.fillStyle = '#2a2836'; g.beginPath(); g.arc(0, 0, 3.5, 0, TAU); g.fill(); g.restore();
      if (Math.sin(t * 13 + d.n) > .6) { g.strokeStyle = '#ffe680'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-6, 0); g.lineTo(-2, 3); g.lineTo(-4, 6); g.stroke(); }
    } else if (d.type === 'repair') {
      base(12); metal(g, -9, -14, 18, 12, 3, '#6e8a7a', '#2a3a32'); g.fillStyle = '#7dff9a'; g.fillRect(-1.6, -12, 3.2, 8); g.fillRect(-4, -9.6, 8, 3.2);
      g.strokeStyle = '#3a3846'; g.lineWidth = 3; g.beginPath(); g.moveTo(6, -14); g.lineTo(14, -24); g.stroke(); g.fillStyle = Math.sin(t * 6) > 0 ? '#7dff9a' : '#2e6a3e'; g.beginPath(); g.arc(14, -25, 2.5, 0, TAU); g.fill();
    } else if (d.type === 'flak') {
      base(12); g.rotate(d.ang);
      for (const o of [-3.5, 3.5]) metal(g, -2, o - 2.5, 24, 5, 2, '#6a6680', '#262432');
      g.fillStyle = c; g.fillRect(-4, -6, 6, 12);
      if (d.flash > 0) { g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,220,140,${d.flash * 6})`; g.beginPath(); g.arc(26, 0, 9, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; }
    } else {   // aimable weapons: a base and a barrel that swings to its aim
      base(d.type === 'mortar' || d.type === 'fire' ? 14 : 12); g.rotate(d.ang);
      if (d.type === 'cannon') { metal(g, -5, -5.5, 32, 11, 3, '#6a6680', '#262432'); metal(g, 24, -7, 7, 14, 2, c, c2); g.fillStyle = '#0e0c14'; g.beginPath(); g.arc(31, 0, 3.5, 0, TAU); g.fill(); }
      else if (d.type === 'mg') { for (const o of [-3, 3]) metal(g, -2, o - 2, 28, 4, 2, '#7a7690', '#2a2836'); metal(g, -8, -7, 14, 14, 3, '#4e4a5e', '#1c1a26'); g.fillStyle = c; g.fillRect(-6, -2, 10, 4); }
      else if (d.type === 'mortar' || d.type === 'fire') { metal(g, -6, -10, 22, 20, 4, '#6a6680', '#262432'); metal(g, 13, -11, 6, 22, 2, d.type === 'fire' ? '#ff9a3a' : c, d.type === 'fire' ? '#a8381a' : c2); g.fillStyle = '#0c0a12'; g.beginPath(); g.arc(19, 0, 7, 0, TAU); g.fill(); if (d.type === 'fire') { metal(g, -14, -5, 8, 12, 3, '#ff8a2a', '#9a2a12'); } }
      else if (d.type === 'rockets') { metal(g, -8, -12, 32, 24, 4, '#6a6680', '#262432'); for (let i = -1; i <= 1; i++) { g.fillStyle = '#0c0a12'; g.beginPath(); g.arc(24, i * 7.5, 3.6, 0, TAU); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(24, i * 7.5, 1.6, 0, TAU); g.fill(); } }
      else if (d.type === 'rail') { metal(g, -6, -4, 46, 8, 2, '#8a8aa6', '#2a2a3a'); for (let x = 2; x < 36; x += 7) { const gl = .5 + .5 * Math.sin(t * 8 + x); g.fillStyle = `rgba(${F.side ? '95,212,255' : '255,176,46'},${.4 + gl * .6})`; g.fillRect(x, -6, 3, 12); } metal(g, -12, -8, 12, 16, 3, '#4e4a5e', '#1c1a26'); }
      if (d.flash > 0) { g.globalCompositeOperation = 'lighter'; const mf = g.createRadialGradient(36, 0, 1, 36, 0, 18); mf.addColorStop(0, `rgba(255,240,200,${d.flash * 5})`); mf.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = mf; g.beginPath(); g.arc(36, 0, 18, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; }
    }
    g.restore();
    if (d.type === 'flak' && d.zap) { g.strokeStyle = `rgba(255,230,160,${d.zap.t * 6})`; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py); g.lineTo(d.zap.x, d.zap.y); g.stroke(); }
    if (d.type === 'shield' && d.e > 0) {
      const R = domeR(d), k = d.e / shieldMax(d), gl = g.createRadialGradient(px, py, R * .2, px, py, R); gl.addColorStop(0, 'rgba(0,0,0,0)'); gl.addColorStop(.75, c + '18'); gl.addColorStop(1, c + (d.hitT > 0 ? 'dd' : '66'));
      g.fillStyle = gl; g.beginPath(); g.arc(px, py, R, Math.PI, 0); g.closePath(); g.fill();
      g.save(); g.beginPath(); g.arc(px, py, R, Math.PI, 0); g.closePath(); g.clip(); g.strokeStyle = c + '30'; g.lineWidth = 1; for (let i = -R; i < R; i += 14) { g.beginPath(); g.moveTo(px + i, py - R); g.lineTo(px + i + R * .5, py); g.stroke(); } g.restore();
      g.strokeStyle = c; g.globalAlpha = .35 + .65 * k; g.lineWidth = 2.5; g.beginPath(); g.arc(px, py, R, Math.PI, 0); g.stroke(); g.globalAlpha = 1;
    }
    if (d.lv > 1) { g.fillStyle = '#ffd23f'; g.font = '10px Bungee, sans-serif'; g.textAlign = 'center'; g.fillText('★'.repeat(d.lv - 1), px, py + 24); }
    const hpk = d.hp / maxHp(d); if (hpk < .999 && d.alive) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(px - 18, py - 34, 36, 5); g.fillStyle = hpk > .5 ? '#5cf28a' : hpk > .25 ? '#ffd23f' : '#ff4d6d'; g.fillRect(px - 18, py - 34, 36 * cl(hpk, 0, 1), 5); }
    if (D.reload && d.aim && F.side === mySide && phase === 'battle' && !demo) { g.strokeStyle = c; g.lineWidth = 2.5; g.beginPath(); g.arc(px, py, 21, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - Math.max(0, d.cd) / (D.reload * L.rel(d)))); g.stroke(); }
    if (tool === 'up' && F.side === mySide && !demo) { g.font = '11px Bungee, sans-serif'; g.textAlign = 'center'; g.fillStyle = d.lv >= 3 ? '#9a9ab8' : F.gold >= upCost(d.type, d.lv) ? '#5cf28a' : '#ff8a8a'; g.fillText(d.lv >= 3 ? 'MAX' : `⬆ ${upCost(d.type, d.lv)}`, px, py - 40); }
  }
  function drawFort(g, F) {
    const mine = F.side === mySide && !demo, building = mine && (tool === 'wood' || tool === 'steel' || tool === 'armor');
    for (const b of F.beams) if (b.alive && F.nodes[b.a] && F.nodes[b.b]) drawBeam(g, F.nodes[b.a], F.nodes[b.b], b, mine, true);
    for (const n of F.nodes) if (n.alive && n.pin) { metal(g, n.x - 10, n.y - 4, 20, 9, 2, '#6a6478', '#2c2836'); }
    for (const b of F.beams) if (b.alive && F.nodes[b.a] && F.nodes[b.b]) drawBeam(g, F.nodes[b.a], F.nodes[b.b], b, mine, false);
    for (const n of F.nodes) if (n.alive) { const r = building ? 5.5 : 3.8, bg = g.createRadialGradient(n.x - r * .35, n.y - r * .35, .5, n.x, n.y, r); bg.addColorStop(0, '#fff6d8'); bg.addColorStop(1, '#a8823a'); g.fillStyle = bg; g.beginPath(); g.arc(n.x, n.y, r, 0, TAU); g.fill(); g.strokeStyle = '#2a1e10'; g.lineWidth = 1.2; g.stroke(); }
    for (const d of F.devs) if (d.alive && F.nodes[d.n]) drawDev(g, F, d);
  }
  function trajectory(F, d, aim) {
    const D = DEV[d.type], [px, py] = pivot(F, d), spd = lp(D.speed[0], D.speed[1], aim.p), s = { type: d.type, x: px + Math.cos(aim.a) * 26, y: py + Math.sin(aim.a) * 26, vx: Math.cos(aim.a) * spd, vy: Math.sin(aim.a) * spd, t: 0 }, pts = [];
    for (let i = 0; i < 420; i++) { moveShot(s, 1 / 60); if (i % 4 === 0) pts.push([s.x, s.y]); if (s.y > groundY(s.x) || s.y > 1100 || s.x < -200 || s.x > WW + 200) break; }
    return pts;
  }
  function drawShots(g) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const s of shots) {
      const tr = s.trail, n = tr.length / 2, col = s.type === 'rail' ? (s.side ? '95,212,255' : '255,190,90') : s.type === 'fire' ? '255,140,40' : s.type === 'mg' ? '255,230,160' : '255,200,150';
      if (s.type === 'rail' || s.type === 'mg') { g.lineCap = 'round'; for (let i = 2; i < tr.length; i += 2) { const k = i / tr.length; g.strokeStyle = `rgba(${col},${k * (s.type === 'rail' ? .9 : .6)})`; g.lineWidth = s.type === 'rail' ? 2 + k * 5 : 1.5 + k; g.beginPath(); g.moveTo(tr[i - 2], tr[i - 1]); g.lineTo(tr[i], tr[i + 1]); g.stroke(); } }
      else if (s.type === 'cannon') { g.strokeStyle = `rgba(${col},.25)`; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < tr.length; i += 2) i ? g.lineTo(tr[i], tr[i + 1]) : g.moveTo(tr[i], tr[i + 1]); g.stroke(); }
      if (s.type === 'fire' || s.type === 'rockets') { const gl = g.createRadialGradient(s.x, s.y, 1, s.x, s.y, 18); gl.addColorStop(0, `rgba(${col},.9)`); gl.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gl; g.fillRect(s.x - 18, s.y - 18, 36, 36); }
    }
    g.globalCompositeOperation = 'source-over';
    for (const s of shots) {
      if (s.type === 'mortar' || s.type === 'fire' || s.type === 'rockets') for (let i = 0; i < s.trail.length; i += 4) { const k = i / s.trail.length; g.fillStyle = `rgba(${s.type === 'fire' ? '90,60,60' : '170,160,185'},${k * .35})`; g.beginPath(); g.arc(s.trail[i], s.trail[i + 1], 2 + (1 - k) * 7, 0, TAU); g.fill(); }
      g.save(); g.translate(s.x, s.y); g.rotate(Math.atan2(s.vy, s.vx));
      if (s.type === 'cannon') { const bg = g.createRadialGradient(-2, -2, 1, 0, 0, 7); bg.addColorStop(0, '#8a8698'); bg.addColorStop(1, '#14121a'); g.fillStyle = bg; g.beginPath(); g.arc(0, 0, 6.5, 0, TAU); g.fill(); }
      else if (s.type === 'mortar') { metal(g, -9, -6, 18, 12, 5, '#5a566a', '#1a1822'); g.fillStyle = SIDEC[s.side]; g.fillRect(-9, -2, 4, 4); }
      else if (s.type === 'fire') { const bg = g.createRadialGradient(0, 0, 1, 0, 0, 9); bg.addColorStop(0, '#fff2b0'); bg.addColorStop(.5, '#ff8a2a'); bg.addColorStop(1, '#8a2a10'); g.fillStyle = bg; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill(); }
      else if (s.type === 'rockets') { metal(g, -10, -3.5, 18, 7, 3, '#f0ecf6', '#8a86a0'); g.fillStyle = SIDEC[s.side]; g.beginPath(); g.moveTo(8, -3.5); g.lineTo(14, 0); g.lineTo(8, 3.5); g.fill(); if (s.t < .8) { g.fillStyle = '#ffd27a'; g.beginPath(); g.moveTo(-10, -3); g.lineTo(-22 - Math.random() * 10, 0); g.lineTo(-10, 3); g.fill(); } }
      else if (s.type === 'rail') { g.fillStyle = '#ffffff'; g.fillRect(-8, -2, 16, 4); }
      else { g.fillStyle = '#fff2c4'; g.fillRect(-4, -1.2, 8, 2.4); }
      g.restore();
    }
    g.restore();
  }
  function drawParts(g) {
    for (const p of debris) { g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.d; g.fillRect(-p.l / 2 - 1, -3.5, p.l + 2, 7); g.fillStyle = p.c; g.fillRect(-p.l / 2, -2.5, p.l, 4); g.restore(); }
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of parts) { const k = p.life / p.max; if (p.c[0] === '#' && (p.fl || p.c === '#fff3c0' || p.c === '#ffb347' || p.c === '#ff5a2a' || p.c === '#ff7a1a')) { g.globalAlpha = k; const gl = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * (1.5 - k * .5)); gl.addColorStop(0, p.c); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(p.x - p.size * 1.5, p.y - p.size * 1.5, p.size * 3, p.size * 3); } }
    g.globalCompositeOperation = 'source-over';
    for (const p of parts) { const k = p.life / p.max; if (!(p.fl || p.c === '#fff3c0' || p.c === '#ffb347' || p.c === '#ff5a2a' || p.c === '#ff7a1a')) { g.globalAlpha = k * .8; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.size * (p.c === '#6a5a7a' ? 2.2 - k : .6 + k * .4), 0, TAU); g.fill(); } }
    g.globalAlpha = 1; g.restore();
    for (const r of rings) { g.strokeStyle = r.c; g.globalAlpha = 1 - r.t / .5; g.lineWidth = 4; g.beginPath(); g.arc(r.x, r.y, r.r * (.3 + r.t * 1.6), 0, TAU); g.stroke(); } g.globalAlpha = 1;
  }

  /* ---------- the HUD: glass panels, minimap, tabbed toolbar ---------- */
  function glass(g, x, y, w, h, r, edge) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(46,30,82,.82)'); gr.addColorStop(1, 'rgba(16,10,34,.9)'); g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); g.strokeStyle = edge || 'rgba(255,220,180,.22)'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.roundRect(x + 2, y + 2, w - 4, h * .4, r); g.fill(); }
  function txt(g, s, x, y, size, c, al = 'left', glow = 0) { g.font = `${size}px Bungee, Impact, sans-serif`; g.textAlign = al; g.textBaseline = 'middle'; if (glow) { g.shadowColor = c; g.shadowBlur = glow; } if (!/^#[0-3]/.test(c)) { g.lineWidth = 4; g.strokeStyle = 'rgba(10,6,20,.85)'; g.strokeText(s, x, y); } g.fillStyle = c; g.fillText(s, x, y); g.shadowBlur = 0; }
  let hintS = '', hintT = 0;
  function drawHUD(g) {
    const v = K.view, me = forts[mySide], them = forts[1 - mySide];
    for (const F of forts) {
      const left = F.side === 0, w = 300, x = left ? v.x0 + 74 : v.x1 - 74 - w, c = core(F), hp = c && c.alive ? c.hp / maxHp(c) : 0;
      glass(g, x, v.y0 + 12, w, 82, 14, SIDEC[F.side] + '66');
      txt(g, (F.side === mySide && !demo ? 'YOU · ' : '') + F.name, left ? x + 14 : x + w - 14, v.y0 + 32, 16, SIDEC[F.side], left ? 'left' : 'right');
      g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.roundRect(x + 14, v.y0 + 46, w - 28, 14, 7); g.fill();
      const hg = g.createLinearGradient(x + 14, 0, x + w - 14, 0); hg.addColorStop(0, SIDEC2[F.side]); hg.addColorStop(1, SIDEC[F.side]); g.fillStyle = hg; g.beginPath(); g.roundRect(x + 16, v.y0 + 48, (w - 32) * hp, 10, 5); g.fill();
      if (F.side === mySide || !MP.online()) txt(g, `⛁ ${Math.floor(F.gold)}` + (phase === 'battle' ? `  +${(5 + F.devs.filter(d => d.alive && d.type === 'gen').reduce((a, d) => a + DEV.gen.inc + 2 * (d.lv - 1), 0))}/s` : ''), left ? x + 14 : x + w - 14, v.y0 + 78, 14, '#ffd23f', left ? 'left' : 'right');
      txt(g, 'CORE', left ? x + w - 14 : x + 14, v.y0 + 78, 11, '#cfc8e0', left ? 'right' : 'left');
    }
    if (phase === 'build') { txt(g, 'BUILD PHASE', 640, v.y0 + 26, 18, '#ffd890', 'center'); txt(g, Math.max(0, Math.ceil(buildT)) + 's', 640, v.y0 + 62, 36, buildT < 10 ? '#ff6a6a' : '#fff', 'center', 8); if (MP.online()) txt(g, them.ready ? 'Opponent is ready' : 'Opponent is building...', 640, v.y0 + 88, 12, them.ready ? '#5cf28a' : '#cfc8e0', 'center'); }
    else if (phase === 'battle') txt(g, 'SIEGE', 640, v.y0 + 40, 26, '#ff8a5a', 'center', 12);
    // minimap with the camera's view
    const m = MM(); glass(g, m.x, m.y, m.w, m.h, 10);
    const mx = x => m.x + x / WW * m.w, my = y => m.y + 6 + (y + 200) / 1000 * (m.h - 12);
    for (const I of ISL) { g.fillStyle = '#6b4a50'; g.fillRect(mx(I.x0), my(GY), mx(I.x1) - mx(I.x0), 6); }
    for (const F of forts) { g.fillStyle = SIDEC[F.side]; for (const n of F.nodes) if (n.alive) g.fillRect(mx(n.x) - 1, my(n.y) - 1, 2, 2); }
    g.fillStyle = '#fff'; for (const s of shots) g.fillRect(mx(s.x) - 1, my(s.y) - 1, 2, 2);
    const hw = (v.x1 - v.x0) / 2 / cam.z, hh = (v.y1 - v.y0) / 2 / cam.z; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.strokeRect(mx(cam.x - hw), Math.max(m.y + 1, my(cam.y - hh)), (mx(cam.x + hw) - mx(cam.x - hw)), Math.min(m.h - 2, my(cam.y + hh) - my(cam.y - hh)));
    const cb = CAMB(); for (const [k, lab] of [['mine', '◀ MINE'], ['all', 'ALL'], ['theirs', 'ENEMY ▶']]) { const b = cb[k]; glass(g, b.x, b.y, b.w, b.h, 9); txt(g, lab, b.x + b.w / 2, b.y + b.h / 2 + 1, 12, '#fff', 'center'); }
    if (demo || phase === 'over') return;
    // toolbar: category tabs, the items in the tab, upgrade, remove, and the ready/aim button
    const tb = TBL(), items = tabItems();
    glass(g, tb.tabs[0].x - 10, tb.act.y - 10, tb.act.x + tb.act.w - tb.tabs[0].x + 20, 112, 18);
    tb.tabs.forEach((b, i) => { const on = i === tab; g.fillStyle = on ? SIDEC[mySide] : 'rgba(255,255,255,.08)'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 8); g.fill(); txt(g, TABS[i][0], b.x + b.w / 2, b.y + b.h / 2 + 1, 11, on ? '#1a1030' : '#fff', 'center'); });
    tb.items.forEach((b, i) => {
      const k = items[i]; if (!k) return; const on = tool === k, cost = toolCost(k), can = me.gold >= cost;
      const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h); gr.addColorStop(0, on ? 'rgba(255,176,46,.45)' : 'rgba(255,255,255,.1)'); gr.addColorStop(1, on ? 'rgba(255,120,40,.2)' : 'rgba(255,255,255,.02)'); g.fillStyle = gr; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 14); g.fill(); g.strokeStyle = on ? SIDEC[mySide] : 'rgba(255,255,255,.16)'; g.lineWidth = on ? 3 : 1.2; g.stroke();
      g.globalAlpha = can ? 1 : .4; icon(g, k, b.x + b.w / 2, b.y + 34); g.globalAlpha = 1;
      txt(g, k === 'del' ? 'REMOVE' : k === 'up' ? 'UPGRADE' : ((MAT[k] || DEV[k]).short || (MAT[k] || DEV[k]).name).toUpperCase(), b.x + b.w / 2, b.y + 66, 10, '#fff', 'center');
      if (cost) txt(g, '⛁' + cost, b.x + b.w / 2, b.y + 82, 11, can ? '#ffd23f' : '#ff8a8a', 'center');
    });
    const A = tb.act, rd = phase === 'build' && me.ready, ag = g.createLinearGradient(0, A.y, 0, A.y + A.h);
    ag.addColorStop(0, phase === 'build' ? (rd ? '#4aa85a' : '#ffc456') : tool === null ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.1)'); ag.addColorStop(1, phase === 'build' ? (rd ? '#2a6a3a' : '#e0802a') : 'rgba(255,255,255,.04)');
    g.fillStyle = ag; g.beginPath(); g.roundRect(A.x, A.y, A.w, A.h, 16); g.fill();
    txt(g, phase === 'build' ? (rd ? 'READY ✓' : 'READY') : 'AIM', A.x + A.w / 2, A.y + 40, 26, phase === 'build' && !rd ? '#2a1408' : '#fff', 'center');
    txt(g, phase === 'build' ? (rd ? 'waiting...' : 'start the battle') : 'tap a weapon', A.x + A.w / 2, A.y + 68, 11, phase === 'build' && !rd ? '#2a1408' : '#cfc8e0', 'center');
    const hint = (tool === 'wood' || tool === 'steel' || tool === 'armor') ? 'Drag from a bolt or your ground. Triangles hold; tall towers shoot further.' : tool === 'del' ? 'Tap a beam or device to remove it' + (phase === 'battle' ? ' (half refund)' : '') : tool === 'up' ? 'Tap one of your devices to upgrade it (up to level 3)' : tool ? `Tap one of your bolts to place the ${DEV[tool].name}` : aimSel ? 'Drag to aim: direction and power. It fires on its own.' : phase === 'battle' ? 'Tap a weapon, then drag to aim. Drag the sky to look around.' : '';
    if (hint !== hintS) { hintS = hint; hintT = t; }
    const ha = hint ? cl(1 - (t - hintT - 6), 0, 1) : 0;
    if (ha > 0) { g.globalAlpha = ha; g.font = '13px Bungee, Impact, sans-serif'; const hw = g.measureText(hint).width + 30; glass(g, 640 - hw / 2, tb.act.y - 40, hw, 28, 14); txt(g, hint, 640, tb.act.y - 25, 13, '#fff', 'center'); g.globalAlpha = 1; }
    if (msg && msg.k < msg.d) { g.globalAlpha = Math.min(1, (msg.d - msg.k) * 3); txt(g, msg.t, 640, v.y0 + 200, 30, msg.c, 'center', 14); g.globalAlpha = 1; }
  }
  function drawWorldUI(g) {   // things drawn in the world: the beam you're placing, placement rings, the aim arc
    const me = forts[mySide]; if (!me || demo) return;
    if (drag) {
      const r = beamOK(me, drag), A2 = drag.from >= 0 ? me.nodes[drag.from] : drag.start;
      g.globalAlpha = .8; drawBeam(g, A2, r.e, { mat: drag.mat, hp: MAT[drag.mat].hp, f: 0, hit: 0 }, false); g.globalAlpha = 1;
      g.strokeStyle = r.why ? '#ff4d6d' : '#5cf28a'; g.lineWidth = 2 / cam.z; g.setLineDash([6 / cam.z, 5 / cam.z]); g.beginPath(); g.moveTo(A2.x, A2.y); g.lineTo(r.e.x, r.e.y); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(r.e.x, r.e.y, 7, 0, TAU); g.stroke();
      g.save(); g.translate(r.e.x, r.e.y); g.scale(1 / cam.z, 1 / cam.z); txt(g, r.why || `⛁${r.cost}`, 12, -14, 14, r.why ? '#ff8a8a' : '#ffd23f'); g.restore();
    }
    if (tool && DEV[tool]) { const [hx, hy] = toWorld(...hoverK), n = nearNode(me, hx, hy, 24 / Math.min(1, cam.z)); if (n >= 0) { g.strokeStyle = devAt(me, n) ? '#ff4d6d' : '#5cf28a'; g.lineWidth = 2.5; g.beginPath(); g.arc(me.nodes[n].x, me.nodes[n].y - 9, 22, 0, TAU); g.stroke(); } }
    if (aimSel && aimSel.alive) {
      const [px, py] = pivot(me, aimSel); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, 28, 0, TAU); g.stroke();
      const aim = aimPt ? aimFrom(me, aimSel, aimPt.x, aimPt.y) : aimSel.aim;
      if (aim) { const pts = trajectory(me, aimSel, aim); g.fillStyle = SIDEC[mySide]; pts.forEach(([x, y], i) => { g.globalAlpha = 1 - i / pts.length * .6; g.beginPath(); g.arc(x, y, 3.5 / Math.min(1, cam.z * 1.4), 0, TAU); g.fill(); }); g.globalAlpha = 1; const e = pts[pts.length - 1]; if (e) { g.strokeStyle = SIDEC[mySide]; g.lineWidth = 2 / cam.z; g.beginPath(); g.arc(e[0], e[1], 14 / cam.z, 0, TAU); g.stroke(); } if (aimPt) { g.save(); g.translate(px, py - 44); g.scale(1 / cam.z, 1 / cam.z); txt(g, Math.round(aim.p * 100) + '% power', 0, 0, 14, '#fff', 'center'); g.restore(); } }
    }
  }
  function icon(g, k, x, y) {
    g.save(); g.translate(x, y);
    if (MAT[k]) { g.rotate(-.5); drawBeam(g, { x: -24, y: 0 }, { x: 24, y: 0 }, { mat: k, hp: MAT[k].hp, f: 0, hit: 0 }, false); }
    else if (k === 'del') { g.strokeStyle = '#ff6a6a'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-12, -12); g.lineTo(12, 12); g.moveTo(12, -12); g.lineTo(-12, 12); g.stroke(); }
    else if (k === 'up') { g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(0, -16); g.lineTo(14, 2); g.lineTo(5, 2); g.lineTo(5, 14); g.lineTo(-5, 14); g.lineTo(-5, 2); g.lineTo(-14, 2); g.closePath(); g.fill(); g.strokeStyle = '#6a4a10'; g.lineWidth = 2; g.stroke(); }
    else { const F = { side: mySide, nodes: [{ x: 0, y: 13, alive: true }] }, d = { type: k, n: 0, lv: 1, ang: -.6, flash: 0, e: 0, spin: t * 3, hp: DEV[k].hp, alive: true }; g.scale(.85, .85); drawDev(g, F, d); }
    g.restore();
  }

  /* ---------- kit hooks ---------- */
  GAME.reset = () => {
    if (!ART.isl) buildArt();
    if (K.bot) { start(null); return; }
    mode = 'lobby'; forts = []; MP.show(); camGo('all', true);
  };
  GAME.update = dt => { if (mode !== 'play') { t += dt; camStep(dt); return; } acc += Math.min(dt, .05); let n = 0; while (acc >= DT && n < 4) { step(DT); acc -= DT; n++; } if (n === 4) acc = 0; };
  GAME.draw = g => {
    if (!ART.isl) buildArt();
    drawSky(g);
    g.save(); g.translate(640, 360); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
    drawWorldBack(g);
    if (mode === 'play') { for (const F of forts) drawFort(g, F); drawShots(g); drawParts(g); drawWorldUI(g); }
    drawSea(g);
    g.restore();
    const v = K.view, vg = g.createRadialGradient(640, 360, 300, 640, 360, 900); vg.addColorStop(0, 'rgba(20,6,30,0)'); vg.addColorStop(1, 'rgba(20,6,30,.45)'); g.fillStyle = vg; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    if (mode === 'play') {
      if (!posed) drawHUD(g);
      if (phase === 'over' && overT > .6 && !demo) { const won = winner === mySide; g.globalAlpha = Math.min(1, (overT - .6) * 2); txt(g, won ? 'VICTORY!' : 'DEFEAT', 640, 300, 90, won ? '#ffd23f' : '#ff4d6d', 'center', 30); g.globalAlpha = 1; }
    }
    if (flashT > 0) { g.fillStyle = `rgba(255,240,220,${flashT * .6})`; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
  };
  GAME.bot = () => {};
  GAME.pose = () => { for (let i = 0; i < 60 * 13; i++) step(DT); posed = true; camGo('mine', true); cam.z = cam.tz = .8; cam.x = cam.tx = ISL[0].x1 - 120; cam.y = cam.ty = GY - 260; };
  GAME.test = { st: () => ({ mode, phase, buildT: +buildT.toFixed(1), my: mySide, cam: [Math.round(cam.x), Math.round(cam.y), +cam.z.toFixed(2)], forts: forts.map(F => ({ n: F.nodes.filter(n => n.alive).length, b: liveBeams(F), d: F.devs.filter(d => d.alive).map(d => d.type + (d.lv > 1 ? '*' + d.lv : '') + ':' + Math.round(d.hp)), gold: Math.round(F.gold), dead: F.dead, fire: F.beams.filter(b => b.alive && b.fire > 0).length, maxSt: +Math.max(0, ...F.beams.filter(b => b.alive).map(b => Math.abs(b.f || 0) / MAT[b.mat].maxF)).toFixed(2) })), shots: shots.length }),
    step: n => { for (let i = 0; i < n; i++) step(DT); }, forts: () => forts, ready: () => { myF().ready = true; }, start: () => MP.start(), cam: w => camGo(w, true), tool: (k, tb) => { tool = k; if (tb !== undefined) tab = tb; },
    aim: (i, a, p) => { const d = myF().devs.filter(x => x.alive && DEV[x.type].reload)[i]; if (d) d.aim = { a, p }; }, botMe: () => { myF().bot = true; }, give: g2 => { myF().gold += g2; }, toWorld, toKit: (x, y) => [640 + (x - cam.x) * cam.z, 360 + (y - cam.y) * cam.z] };
})();
