/* Shellsmith: a pixel-physics artillery range. Every building is made of real pixels (brick, concrete, steel, wood,
   glass, stone, lead) that crack, fall, crumble into rubble and melt. Somewhere inside sits a glowing core: break or
   melt it before you run out of shells. Between shots you design your own ammunition in the workshop (casing, nose,
   explosive fill, shaped-charge liner and fuse) and spend your winnings on better parts and a better gun. */
const GAME = {
  id: 'shellsmith', title: 'Shellsmith', tagline: 'Design the shell. Melt the core.',
  font: 'Russo One', accent: '#ff7a2a', accent2: '#5ad8ff', bg: '#1a1420', noHud: true, noSkins: true, scoreLabel: 'Coins earned',
  how: [
    'Drag from anywhere to aim (direction and distance set the angle and power), let go to fire. Keyboard: arrows aim, Space fires, 1 2 3 pick a shell.',
    'Each building hides a glowing core. Break or melt 90% of it to clear the level. Fewer shells means more stars and coins.',
    'Every shell has a soft copper jacket around a hard rod: the jacket melts away first, then the rod bores in a few pixels and the wall bends around it. Keep hitting the same spot to break through. In the Workshop, a heavy casing and a hard nose reach deeper, delay fuses go off inside, thermite melts, a liner fires a jet.',
    'Unsupported floors fall, and a falling building crushes what is below it. Knock out the base and let gravity do the work.',
  ],
  skins: [{ name: 'Range', price: 0 }],
};
(() => {
  'use strict';
  const TAU = Math.PI * 2, cl = (v, a, b) => v < a ? a : v > b ? b : v, lp = (a, b, k) => a + (b - a) * k, R = Math.random, rint = (a, b) => Math.floor(a + R() * (b - a + 1)), pick = a => a[Math.floor(R() * a.length)];
  /* ---------- the pixel world ---------- */
  const CS = 4, GW = 320, GH = 180, N = GW * GH, G = 55;
  const mat = new Uint8Array(N), hp = new Float32Array(N), heat = new Float32Array(N), col = new Uint32Array(N), stamp = new Uint32Array(N);
  const E = 0, BED = 1, DIRT = 2, BRICK = 3, CONC = 4, STEEL = 5, WOOD = 6, GLASS = 7, CORE = 8, RUB = 9, MOLT = 10, SLAG = 11, CMOLT = 12, STONE = 13, LEAD = 14;
  const rgb = (r, g, b, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  const unpack = c => [c & 255, (c >> 8) & 255, (c >> 16) & 255];
  const M = [];
  M[E] = { n: 'air' };
  M[BED] = { n: 'bedrock', c: [44, 36, 40], hp: 1e9, melt: 1e9, brit: 0 };
  M[DIRT] = { n: 'dirt', c: [112, 78, 48], hp: 3.2, melt: 1100, brit: .3 };
  M[BRICK] = { n: 'brick', c: [168, 82, 58], hp: 4, melt: 760, brit: .55 };
  M[CONC] = { n: 'concrete', c: [150, 150, 144], hp: 7, melt: 860, brit: .45 };
  M[STEEL] = { n: 'steel', c: [92, 108, 122], hp: 18, melt: 520, brit: .04 };
  M[WOOD] = { n: 'wood', c: [156, 108, 60], hp: 2, melt: 270, brit: .25, burns: 1 };
  M[GLASS] = { n: 'glass', c: [170, 224, 240], hp: .5, melt: 420, brit: 1, a: 170 };
  M[CORE] = { n: 'core', c: [255, 48, 80], hp: 6, melt: 430, brit: .2 };
  M[RUB] = { n: 'rubble', c: [120, 110, 100], hp: 1.5, melt: 700, brit: 1, loose: 1 };
  M[MOLT] = { n: 'molten', c: [255, 140, 40], hp: 1, melt: 1e9, brit: 1, loose: 2 };
  M[SLAG] = { n: 'slag', c: [64, 56, 54], hp: 6, melt: 700, brit: .3 };
  M[CMOLT] = { n: 'molten core', c: [255, 60, 90], hp: 1, melt: 1e9, brit: 1, loose: 2 };
  M[STONE] = { n: 'stone', c: [126, 118, 104], hp: 9, melt: 950, brit: .4 };
  M[LEAD] = { n: 'lead', c: [74, 78, 92], hp: 32, melt: 480, brit: .02 };
  const isStatic = m => m && !M[m].loose, isLiquid = m => m === MOLT || m === CMOLT;
  function tone(m, x, y, k = 1) {   // a little texture per material
    const b = M[m].c; let v = 1 + (R() - .5) * .1;
    if (m === BRICK) { const row = Math.floor(y / 3), mortar = y % 3 === 2 || (x + (row % 2) * 3) % 6 === 5; if (mortar) return rgb(196, 184, 170); v *= 1 + ((x * 7 + row * 13) % 5 - 2) * .03; }
    if (m === STEEL || m === LEAD) { if (y % 6 === 0 || x % 10 === 0) v *= .82; if (x % 10 === 2 && y % 6 === 3) v *= 1.25; }
    if (m === WOOD) { v *= x % 3 === 0 ? .82 : 1; if ((x * 31 + y * 7) % 23 === 0) v *= .7; }
    if (m === STONE) { const bx = Math.floor((x + (Math.floor(y / 5) % 2) * 4) / 8); if (y % 5 === 0 || (x + (Math.floor(y / 5) % 2) * 4) % 8 === 0) v *= .72; else v *= 1 + ((bx * 13 + Math.floor(y / 5) * 7) % 5 - 2) * .04; }
    if (m === CONC) { if (y % 8 === 0) v *= .9; }
    if (m === GLASS) { if ((x + y) % 7 < 2) v *= 1.12; }
    if (m === DIRT) { v *= 1 + (R() - .5) * .14; if (y < 2) return rgb(cl(70 * v, 0, 255), cl(128 * v, 0, 255), cl(56 * v, 0, 255)); }
    if (m === CORE) v *= 1 + (R() - .5) * .2;
    v *= k; return rgb(cl(b[0] * v, 0, 255) | 0, cl(b[1] * v, 0, 255) | 0, cl(b[2] * v, 0, 255) | 0, M[m].a || 255);
  }
  const idx = (x, y) => y * GW + x, inb = (x, y) => x >= 0 && x < GW && y >= 0 && y < GH;
  function set(x, y, m, c) { if (!inb(x, y)) return; const i = idx(x, y); mat[i] = m; hp[i] = m ? M[m].hp : 0; heat[i] = 0; col[i] = m ? (c ?? tone(m, x, y)) : 0; }
  let dirty = true, coreN = 1, coreLeft = 1;
  /* ---------- particles, shells, falling chunks ---------- */
  const parts = [], fx = [], shells = [], bodies = [], blasts = [];
  const MAXP = 4200;
  function debris(x, y, vx, vy, c, k = 0, h = 0) { if (parts.length >= MAXP) return false; parts.push({ x, y, vx, vy, c, k, h, t: 0 }); return true; }
  function smoke(x, y, n, sz = 1, c = 'rgba(70,64,60,') { for (let i = 0; i < n && fx.length < 420; i++) fx.push({ k: 's', x: x + (R() - .5) * 6 * sz, y: y + (R() - .5) * 4 * sz, vx: (R() - .5) * 8, vy: -4 - R() * 8, r: (3 + R() * 4) * sz, t: 0, l: 1.6 + R() * 1.6, c }); }
  function streak(x, y, n, ang, spread, sp) { for (let i = 0; i < n && fx.length < 1400; i++) { const a = ang + (R() - .5) * spread, v = sp * (.35 + R() * .9); fx.push({ k: 'k', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, l: .25 + R() * .6, w: .5 + R() * .7 }); } }
  function spark(x, y, n, sp = 60, c = '#ffd890') { for (let i = 0; i < n && fx.length < 1200; i++) { const a = R() * TAU, s = R() * sp; fx.push({ k: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - sp * .3, t: 0, l: .25 + R() * .45, c }); } }
  function destroy(i, vx, vy, toRubble = false) {
    const m = mat[i]; if (!m || m === BED) return;
    const x = i % GW, y = (i / GW) | 0, c = col[i];
    mat[i] = E; hp[i] = 0; heat[i] = 0; col[i] = 0; dirty = true;
    if (m === WOOD && R() < .3) fx.push({ k: 'f', x: x + .5, y: y + .5, vx: vx * .05, vy: -6, t: 0, l: .6 + R() * .6 });
    if (m === GLASS) { if (R() < .6) debris(x + .5, y + .5, vx + (R() - .5) * 30, vy + (R() - .5) * 30, c, 2); return; }
    if (isLiquid(m)) { debris(x + .5, y + .5, vx * .6, vy * .6, c, m === CMOLT ? 3 : 1, 900); return; }
    if (toRubble || !debris(x + .5, y + .5, vx, vy, m === CORE ? rgb(255, 90, 110) : c, m === CORE ? 3 : 0, m === CORE ? 700 : 0)) { /* over the particle cap: it just crumbles away */ }
  }
  function hurt(i, d) { const m = mat[i]; if (!m || m === BED) return false; hp[i] -= d; if (hp[i] <= 0) return true; const [r, g, b] = unpack(col[i]), k = .9; col[i] = rgb(r * k | 0, g * k | 0, b * k | 0, M[m].a || 255); return false; }
  /* ---------- explosions ---------- */
  function blast(cx, cy, r, P, o = {}) {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(GW - 1, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(GH - 1, Math.ceil(cy + r)), list = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d <= r && mat[idx(x, y)]) list.push([d, x, y]); }
    list.sort((a, b) => a[0] - b[0]);
    for (const [d, x, y] of list) {
      const i = idx(x, y), m = mat[i]; if (!m || m === BED) continue;
      // walls in between soak up the blast
      let block = 0; const steps = Math.floor(d); for (let s = 1; s < steps; s++) { const k = s / d, j = idx(Math.floor(cx + (x + .5 - cx) * k), Math.floor(cy + (y + .5 - cy) * k)); if (mat[j] && !isLiquid(mat[j])) block += Math.min(hp[j], 40); if (block > P * 2) break; }
      const eff = P * Math.pow(1 - d / r, .75) * 2.1 - block * .55;
      if (eff <= 0) continue;
      if (M[m].burns) heat[i] += eff * 60;
      if (o.heat) heat[i] += o.heat * (1 - d / r);
      if (eff >= hp[i] || (m === GLASS && eff > .1)) { const a = Math.atan2(y + .5 - cy, x + .5 - cx), s = 18 + eff * 7 + R() * 20; destroy(i, Math.cos(a) * s, Math.sin(a) * s - 10); }
      else hurt(i, eff * .6);
    }
    blasts.push({ x: cx, y: cy, P, r, t: 0 });
    for (const b of bodies) { const dx = b.x + b.w / 2 - cx, dy = b.y + b.h / 2 - cy, d = Math.hypot(dx, dy); if (d < r * 3) { b.vx += dx / (d + 1) * P * 4 / Math.sqrt(b.n * .02 + 1); b.vy += dy / (d + 1) * P * 3 / Math.sqrt(b.n * .02 + 1) - 4; } }
    fx.push({ k: 'x', x: cx, y: cy, r: r * .8, t: 0, l: .28 });
    smoke(cx, cy, Math.min(10, 3 + r * .5), .8 + r * .05, 'rgba(120,112,108,'); spark(cx, cy, 18 + r * 2, 40 + r * 8);
    K.shake(Math.min(10, 2 + r * .7)); K.noise(.35 + r * .02, Math.min(.45, .18 + r * .02), 220 + R() * 200); K.sfx(70, .3, 'sawtooth', .08, -30);
    dirty = true;
  }
  function jet(x, y, dx, dy, len, budget) {   // a shaped-charge jet: a narrow, very hot stream that drills straight on
    const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; const px = -dy, py = dx; let last = -1, gone = 0;
    for (let s = 0; s < len && budget > 0; s += .5) {
      const cx = x + dx * s, cy = y + dy * s, i = idx(Math.floor(cx), Math.floor(cy)); if (!inb(Math.floor(cx), Math.floor(cy))) break;
      if (i !== last) { last = i; const m = mat[i]; if (m && m !== BED) { const c = Math.pow(Math.min(hp[i], 60), .72) * .55; if (budget < c) { hurt(i, budget * 1.8); heat[i] += 400; break; } budget -= c; destroy(i, dx * 90, dy * 90); gone++; for (const sd of [-1, 1]) { const j = idx(Math.floor(cx + px * sd), Math.floor(cy + py * sd)); if (inb(Math.floor(cx + px * sd), Math.floor(cy + py * sd)) && mat[j] && mat[j] !== BED) { heat[j] += 380; if (R() < .45 && budget > 1) { budget -= .4; destroy(j, dx * 60 + px * sd * 20, dy * 60 + py * sd * 20); } } } if (R() < .4) debris(cx, cy, dx * 50 + (R() - .5) * 30, dy * 50 + (R() - .5) * 30, rgb(255, 170, 80), 1, 800); } }
      if (s % 3 < .5) spark(cx, cy, 1, 40, '#ffe0a0');
    }
    fx.push({ k: 'j', x, y, x2: x + dx * Math.min(len, 40 + gone), y2: y + dy * Math.min(len, 40 + gone), t: 0, l: .22 });
    K.sfx(1800, .25, 'sawtooth', .05, -1500); dirty = true;
  }
  function frag(x, y, n, budget, len) {
    for (let k = 0; k < n; k++) { const a = R() * TAU, dx = Math.cos(a), dy = Math.sin(a); let b = budget * (.6 + R() * .8); for (let s = 1; s < len && b > 0; s += .7) { const cx = Math.floor(x + dx * s), cy = Math.floor(y + dy * s); if (!inb(cx, cy)) break; const i = idx(cx, cy), m = mat[i]; if (m && m !== BED) { if (b >= hp[i]) { b -= hp[i] * .8; destroy(i, dx * 60, dy * 60); } else { hurt(i, b); b = 0; } } }
      if (fx.length < 700) fx.push({ k: 'r', x, y, x2: x + dx * len * .6, y2: y + dy * len * .6, t: 0, l: .12 }); }
  }
  /* ---------- shells ---------- */
  const PIERCE = 3.2;   // how hard pixels are to pierce: a shell only bores a few pixels into a wall
  const PARTS = {
    casing: [
      { k: 'steel', n: 'Steel', cost: 0, mass: 1, pen: 1, spd: 1, d: 'Balanced. Does a bit of everything.' },
      { k: 'alu', n: 'Aluminium', cost: 300, mass: .65, pen: .75, spd: 1.13, d: 'Light and fast: longer range, weaker punch.' },
      { k: 'tung', n: 'Tungsten', cost: 2200, mass: 1.7, pen: 2, spd: .9, d: 'Dense and brutal. Slower, shorter range.' },
    ],
    nose: [
      { k: 'round', n: 'Round', cost: 0, pen: 1, splash: 1.15, d: 'Wide blast on the surface.' },
      { k: 'point', n: 'Pointed', cost: 200, pen: 1.6, splash: 1, d: 'Pierces brick and concrete.' },
      { k: 'ap', n: 'AP cap', cost: 1600, pen: 2.5, splash: .95, d: 'Hardened cap: goes through armour.' },
    ],
    fill: [
      { k: 'he', n: 'High explosive', cost: 0, blast: 1, d: 'A big blast. Great on brick and wood.' },
      { k: 'frag', n: 'Fragmentation', cost: 450, blast: .6, frag: 1, d: 'Smaller blast, hails shrapnel everywhere.' },
      { k: 'therm', n: 'Thermite', cost: 900, blast: .28, heat: 1, d: 'Sprays molten metal that melts what it touches.' },
      { k: 'cluster', n: 'Cluster', cost: 1500, blast: .35, cluster: 1, d: 'Splits into six bomblets on impact.' },
      { k: 'none', n: 'Inert slug', cost: 0, blast: 0, d: 'No explosive: pure kinetic punch.' },
    ],
    liner: [
      { k: 'none', n: 'No liner', cost: 0, jet: 0, d: 'Nothing in front of the charge.' },
      { k: 'cu', n: 'Copper cone', cost: 800, jet: 1, d: 'Shaped charge: a jet that drills through steel.' },
      { k: 'ta', n: 'Tantalum cone', cost: 2800, jet: 1.8, d: 'A longer, hotter jet.' },
    ],
    fuse: [
      { k: 'impact', n: 'On stop', cost: 0, delay: 0, d: 'Melts in as far as it can, then goes off.' },
      { k: 'short', n: 'Short delay', cost: 250, delay: 5, d: 'Punches in a little, then goes off.' },
      { k: 'long', n: 'Long delay', cost: 700, delay: 14, d: 'Buries itself deep before it goes off.' },
      { k: 'air', n: 'Proximity', cost: 600, air: 1, d: 'Goes off just before it touches anything.' },
    ],
  };
  const PK = ['casing', 'nose', 'fill', 'liner', 'fuse'], PNAME = { casing: 'CASING', nose: 'NOSE', fill: 'EXPLOSIVE FILL', liner: 'LINER', fuse: 'FUSE' };
  const part = (cat, k) => PARTS[cat].find(p => p.k === k) || PARTS[cat][0];
  const UPG = [
    { k: 'barrel', n: 'Longer barrel', max: 4, cost: l => [250, 650, 1400, 2800][l], d: l => `+${(l + 1) * 6}% muzzle speed` },
    { k: 'rack', n: 'Ammo rack', max: 3, cost: l => [500, 1500, 3500][l], d: l => `${8 + l + 1} shells per level` },
    { k: 'fillq', n: 'Better filler', max: 4, cost: l => [300, 800, 1800, 3600][l], d: l => `+${(l + 1) * 15}% blast, heat and jet` },
    { k: 'range', n: 'Rangefinder', max: 3, cost: l => [200, 600, 1500][l], d: l => 'Longer aiming line' },
  ];
  function stats(d) {
    const c = part('casing', d.casing), n = part('nose', d.nose), f = part('fill', d.fill), l = part('liner', d.liner), u = part('fuse', d.fuse), q = 1 + lv('fillq') * .15;
    const jetOk = f.k === 'he' || f.k === 'frag';
    return { c, n, f, l, u, q, mass: c.mass, pen: c.pen * n.pen, spd: c.spd * (1 + lv('barrel') * .06), jet: jetOk ? l.jet * q : 0, jetOk };
  }
  /* ---------- levels ---------- */
  const LEVELS = [
    { n: 'Brick Cottage', hint: 'High explosive tears brick apart.', par: 2, reward: 150 },
    { n: 'Corner Office', hint: 'Concrete floors. Hit the floor the core sits on.', par: 3, reward: 240 },
    { n: 'Timber Fort', hint: 'Wood burns. Blast it and watch.', par: 2, reward: 300 },
    { n: 'Water Tower', hint: 'Knock out a leg and it all comes down.', par: 3, reward: 360 },
    { n: 'Glass Tower', hint: 'Take out the base and let gravity work.', par: 4, reward: 420 },
    { n: 'Hill Bunker', hint: 'Thick concrete: a pointed nose and a delay fuse.', par: 3, reward: 500 },
    { n: 'Container Stack', hint: 'Steel boxes. Find the one with the glow.', par: 4, reward: 580 },
    { n: 'Steel Vault', hint: 'Steel shrugs off blasts. Melt it or jet it.', par: 4, reward: 660 },
    { n: 'Lighthouse', hint: 'Tall and thin. The core is the lamp.', par: 4, reward: 740 },
    { n: 'Twin Towers', hint: 'Two cores. Topple one into the other?', par: 5, reward: 820 },
    { n: 'Parking Garage', hint: 'Bring down the pillars and the decks pancake.', par: 4, reward: 900 },
    { n: 'Castle Keep', hint: 'Stone walls, a keep on a hill.', par: 5, reward: 1000 },
    { n: 'Bell Tower', hint: 'Brick spire, core in the belfry.', par: 4, reward: 1100 },
    { n: 'Missile Silo', hint: 'The core is buried. Dig with long delays.', par: 5, reward: 1200 },
    { n: 'Bank Vault', hint: 'Stone bank above, steel vault below ground.', par: 5, reward: 1320 },
    { n: 'Pyramid', hint: 'Solid stone. The chamber is in the middle.', par: 6, reward: 1450 },
    { n: 'Reactor', hint: 'Concrete, then lead, then steel. Bring heat.', par: 5, reward: 1600 },
    { n: 'Dam', hint: 'A wall of concrete. The core hides behind it.', par: 6, reward: 1750 },
    { n: 'Skyscraper', hint: 'Forty storeys of steel and glass.', par: 5, reward: 1900 },
    { n: 'Fortress Line', hint: 'Walls in front, armour behind.', par: 6, reward: 2050 },
    { n: 'Deep Bunker', hint: 'Two slabs of concrete under the hill.', par: 6, reward: 2200 },
    { n: 'Lead Tomb', hint: 'Lead soaks up blasts. Jets and thermite do not care.', par: 6, reward: 2400 },
    { n: 'The Foundry', hint: 'Three cores in a steel hall.', par: 6, reward: 2600 },
    { n: 'The Citadel', hint: 'Everything at once.', par: 7, reward: 3000 },
  ];
  let GY = 158;
  const rect = (x, y, w, h, m) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, m); };
  const disc = (cx, cy, r, m, r0 = -1) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d <= r && d > r0) set(x, y, m); } };
  const halfDisc = (cx, cy, r, m, r0 = -1) => { for (let y = Math.floor(cy - r); y <= cy; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d <= r && d > r0) set(x, y, m); } };
  const roof = (x, y, w, m) => { for (let j = 0; j < w / 2; j++) for (let i = j; i < w - j; i++) set(x + i, y - j, m); };
  function furnish(x0, x1, y) {   // a few pieces of furniture standing on the floor at row y
    for (let x = x0 + 3; x < x1 - 6; ) { const k = rint(0, 3);
      if (k === 0) { rect(x, y - 4, 7, 1, WOOD); rect(x, y - 3, 1, 3, WOOD); rect(x + 6, y - 3, 1, 3, WOOD); x += 10; }
      else if (k === 1) { rect(x, y - 8, 4, 8, WOOD); for (let j = 2; j < 8; j += 3) rect(x, y - j, 4, 1, BRICK); x += 7; }
      else if (k === 2) { rect(x, y - 5, 5, 5, STEEL); x += 8; }
      else x += rint(3, 6); }
  }
  function house(x, w, floors, fh, wall, floor, o = {}) {   // a cut-away building: walls, slabs, windows; returns the top y
    const t = o.t || 3, sl = o.slab || 3, top = GY - floors * fh;
    for (let f = 0; f < floors; f++) {
      const y0 = GY - (f + 1) * fh;
      rect(x, y0, w, sl, floor);
      rect(x, y0, t, fh, wall); rect(x + w - t, y0, t, fh, wall);
      if (o.win !== false) { rect(x, y0 + sl + 3, t, Math.max(2, fh - sl - 9), GLASS); rect(x + w - t, y0 + sl + 3, t, Math.max(2, fh - sl - 9), GLASS); }
      if (o.cols) for (let c = 1; c < o.cols; c++) rect(x + Math.round(w * c / o.cols) - 1, y0 + sl, 3, fh - sl, o.colM || wall);
      if (o.furn && fh > 12) furnish(x + t, x + w - t, GY - f * fh);
    }
    return top;
  }
  const floorY = (f, fh = 0) => GY - f * fh;   // the row a thing stands on, on floor f
  function core(cx, cy, r) {   // the core, on a little steel stand that reaches down to whatever is below it
    disc(cx, cy, r, CORE);
    for (let x = Math.round(cx - r * .5); x <= Math.round(cx + r * .5); x++) { let y = Math.floor(cy + r); while (y > 0 && mat[idx(x, y)] !== CORE) y--; for (let k = 1; k < 30; k++) { const yy = y + k; if (!inb(x, yy) || mat[idx(x, yy)]) break; set(x, yy, STEEL); } }
  }
  function ground(fn) { for (let x = 0; x < GW; x++) { const h = fn ? fn(x) : GY; for (let y = h; y < GH; y++) set(x, y, y >= GH - 4 ? BED : DIRT); } }
  function build(n) {
    mat.fill(0); hp.fill(0); heat.fill(0); col.fill(0); GY = 158;
    const B = [
      () => { ground(); const top = house(190, 60, 2, 20, BRICK, WOOD, { furn: 1 }); roof(188, top - 1, 64, WOOD); rect(232, top - 26, 6, 14, BRICK); core(214, floorY(0) - 6.5, 5.5); },
      () => { ground(); house(184, 62, 5, 17, CONC, CONC, { cols: 2, furn: 1 }); rect(184, GY - 88, 62, 3, CONC); rect(200, GY - 96, 10, 8, STEEL); core(222, floorY(2, 17) - 6, 5); },
      () => { ground(); rect(170, GY - 38, 6, 38, WOOD); rect(266, GY - 38, 6, 38, WOOD); for (const x of [170, 266]) { rect(x, GY - 43, 2, 5, WOOD); rect(x + 4, GY - 43, 2, 5, WOOD); } rect(170, GY - 26, 102, 3, WOOD); house(196, 46, 1, 24, WOOD, WOOD, { t: 4, win: false }); roof(193, GY - 25, 52, WOOD); core(219, floorY(0) - 6.5, 6); house(276, 18, 3, 16, WOOD, WOOD, { t: 3, win: false }); },
      () => { ground(); for (const x of [200, 238]) rect(x, GY - 60, 4, 60, STEEL); for (let k = 0; k < 3; k++) { const y = GY - 18 - k * 18; for (let s = 0; s < 38; s++) set(200 + s, y + Math.round(s * .45) % 18, STEEL); rect(200, y, 42, 2, STEEL); } rect(194, GY - 64, 54, 4, STEEL); rect(196, GY - 96, 50, 32, STEEL); rect(200, GY - 92, 42, 26, E); roof(194, GY - 97, 54, STEEL); core(221, GY - 72, 6); rect(212, GY - 66, 18, 2, STEEL); },
      () => { ground(); const top = house(198, 46, 9, 13, CONC, CONC, { t: 2, slab: 2, furn: 1 }); rect(198, top - 3, 46, 3, CONC); core(221, floorY(8, 13) - 6, 5); rect(202, GY - 11, 38, 9, E); for (const x of [202, 214, 226, 238]) rect(x, GY - 11, 2, 11, CONC); },
      () => { ground(x => x > 168 && x < 284 ? Math.round(GY - 18 * Math.sin((x - 168) / 116 * Math.PI)) : GY); halfDisc(226, GY - 4, 28, CONC, 19); rect(204, GY - 4, 44, 3, CONC); core(226, GY - 11, 6); },
      () => { ground(); const box = (x, y, w, h, c) => { rect(x, y, w, h, STEEL); rect(x + 2, y + 2, w - 4, h - 4, E); if (c) core(x + w / 2, y + h - 2 - 5.5, 5); }; box(184, GY - 16, 40, 16); box(226, GY - 16, 40, 16); box(268, GY - 16, 40, 16); box(196, GY - 32, 40, 16); box(240, GY - 32, 40, 16, 1); box(218, GY - 48, 40, 16); box(204, GY - 64, 30, 16); },
      () => { ground(); rect(184, GY - 8, 80, 8, CONC); rect(192, GY - 50, 64, 42, STEEL); rect(197, GY - 45, 54, 32, E); core(224, GY - 21, 7); rect(186, GY - 53, 76, 3, STEEL); rect(214, GY - 14, 20, 6, STEEL); },
      () => { ground(x => x > 200 && x < 260 ? GY - 6 : GY); const b = GY - 6; rect(212, b - 96, 16, 96, STONE); rect(216, b - 90, 8, 84, E); for (let k = 1; k < 6; k++) rect(216, b - k * 16, 8, 2, WOOD); rect(206, b - 112, 28, 16, STEEL); rect(208, b - 110, 24, 12, GLASS); rect(210, b - 109, 20, 11, E); core(220, b - 103.5, 5); rect(204, b - 112, 32, 3, STEEL); roof(206, b - 113, 28, STEEL); rect(206, b - 98, 28, 3, STONE); },
      () => { ground(); house(176, 32, 7, 15, CONC, CONC, { cols: 2, furn: 1 }); house(252, 32, 8, 15, CONC, CONC, { cols: 2, furn: 1 }); core(192, floorY(5, 15) - 5, 4); core(268, floorY(1, 15) - 5, 4); rect(176, GY - 108, 32, 3, CONC); rect(252, GY - 123, 32, 3, CONC); },
      () => { ground(); for (let f = 1; f <= 5; f++) rect(176, GY - f * 15, 120, 3, CONC); for (const x of [176, 206, 236, 266, 293]) for (let f = 0; f < 5; f++) rect(x, GY - (f + 1) * 15 + 3, 3, 12, CONC); for (let f = 0; f < 5; f++) for (let c = 0; c < 3; c++) if ((f + c) % 2) rect(184 + c * 34, GY - f * 15 - 5, 14, 5, pick([STEEL, CONC])); core(250, floorY(3, 15) - 5.5, 5); },
      () => { ground(x => x > 150 ? Math.max(GY - 26, Math.round(GY - (x - 150) * .6)) : GY); const g0 = GY - 26; for (let x = 172; x < 194; x++) rect(x, g0, 1, 16, STONE); rect(172, g0 - 16, 7, 16, STONE); rect(172, g0 - 21, 3, 5, STONE); rect(176, g0 - 21, 3, 5, STONE); for (let x = 228; x < 292; x += 8) rect(x, g0 - 55, 4, 4, STONE); rect(228, g0 - 52, 8, 52, STONE); rect(284, g0 - 52, 8, 52, STONE); for (let k = 1; k < 4; k++) rect(228, g0 - k * 17, 64, 3, k === 3 ? CONC : WOOD); core(260, g0 - 7, 6); rect(172, g0 - 3, 128, 3, STONE); },
      () => { ground(); house(210, 34, 4, 18, BRICK, WOOD, { furn: 0 }); const top = GY - 72; rect(214, top - 26, 26, 26, BRICK); rect(218, top - 22, 18, 22, E); core(227, top - 7, 5); for (let j = 0; j < 30; j++) rect(214 + Math.floor(j * .43), top - 27 - j, Math.max(1, 26 - Math.floor(j * .86)), 1, BRICK); house(170, 36, 2, 16, BRICK, WOOD, { furn: 1 }); roof(168, GY - 33, 40, WOOD); },
      () => { GY = 132; ground(x => x < 120 ? 158 : x < 150 ? Math.round(158 - (x - 120) * .87) : 132); rect(210, 132, 34, 42, CONC); rect(215, 132, 24, 38, DIRT); rect(212, 129, 30, 4, STEEL); core(227, 162, 6); rect(217, 168, 20, 2, STEEL); },
      () => { GY = 140; ground(x => x < 110 ? 158 : x < 136 ? Math.round(158 - (x - 110) * .7) : 140); house(186, 70, 3, 18, STONE, CONC, { cols: 3, t: 4 }); for (let k = 0; k < 6; k++) rect(188 + k * 12, GY - 60, 6, 6, STONE); roof(184, GY - 55, 74, STONE); rect(206, 141, 34, 22, STEEL); rect(210, 145, 26, 15, E); core(223, 154, 5); rect(218, 140, 10, 1, E); },
      () => { ground(); for (let j = 0; j < 60; j++) rect(182 + j, GY - 1 - j, Math.max(0, 120 - j * 2), 1, STONE); rect(230, GY - 24, 24, 14, E); core(242, GY - 17, 6); for (let j = 0; j < 22; j++) set(206 + j, GY - 10 - Math.floor(j * .7), E); },
      () => { ground(); rect(178, GY - 6, 96, 6, CONC); const cx = 226, cy = GY - 36; disc(cx, cy, 30, CONC, 22); disc(cx, cy, 22, LEAD, 16); disc(cx, cy, 16, STEEL, 11); core(cx, cy, 8); rect(198, GY - 8, 56, 3, CONC); },
      () => { ground(); for (let j = 0; j < 80; j++) rect(170 + Math.floor(j * .35), GY - 1 - j, 30 - Math.floor(j * .2), 1, CONC); house(238, 40, 2, 16, STEEL, CONC, { furn: 1 }); core(258, floorY(0) - 6, 5); },
      () => { ground(); const top = house(204, 40, 13, 10, STEEL, STEEL, { t: 2, slab: 2 }); rect(204, top - 3, 40, 3, STEEL); rect(222, top - 22, 2, 19, STEEL); core(224, floorY(7, 10) - 4.5, 4); house(256, 26, 3, 14, BRICK, CONC, { furn: 1 }); },
      () => { ground(); rect(160, GY - 32, 8, 32, STONE); rect(176, GY - 24, 8, 24, STONE); for (let x = 160; x < 168; x += 3) rect(x, GY - 35, 2, 3, STONE); house(208, 48, 3, 17, STEEL, CONC, { t: 4 }); rect(208, GY - 54, 48, 3, STEEL); core(232, floorY(1, 17) - 6, 5.5); house(262, 32, 5, 14, BRICK, CONC, { furn: 1 }); },
      () => { ground(x => x > 160 && x < 300 ? Math.round(GY - 22 * Math.sin((x - 160) / 140 * Math.PI)) : GY); rect(204, GY - 2, 48, 5, CONC); rect(206, GY + 6, 44, 5, CONC); rect(210, GY + 11, 36, 12, E); core(228, GY + 17, 5.5); },
      () => { ground(x => x > 170 && x < 290 ? Math.round(GY - 14 * Math.sin((x - 170) / 120 * Math.PI)) : GY); rect(198, GY - 34, 60, 34, CONC); rect(204, GY - 28, 48, 24, LEAD); rect(210, GY - 23, 36, 16, E); core(228, GY - 15, 6); },
      () => { ground(); house(176, 128, 4, 18, STEEL, STEEL, { t: 3, cols: 4 }); rect(176, GY - 75, 128, 3, STEEL); core(192, floorY(0) - 6, 4.5); core(240, floorY(2, 18) - 6, 4.5); core(288, floorY(1, 18) - 6, 4.5); for (const x of [200, 260]) { rect(x, GY - 14, 10, 14, BRICK); rect(x + 2, GY - 12, 6, 10, E); } },
      () => { ground(x => x > 170 ? GY - 10 : GY); const b = GY - 10; rect(172, b, 140, 10, STONE); house(198, 16, 4, 14, BRICK, CONC); house(290, 16, 4, 14, BRICK, CONC); rect(220, b - 42, 60, 42, STONE); rect(226, b - 38, 48, 34, E); rect(220, b - 42, 60, 4, CONC); rect(228, b - 104, 44, 62, STEEL); rect(232, b - 100, 36, 54, E); disc(250, b - 72, 14, LEAD, 10); rect(232, b - 73, 36, 3, STEEL); core(250, b - 72, 6.5); rect(224, b - 108, 52, 4, STONE); roof(228, b - 109, 44, BRICK); for (let k = 0; k < 2; k++) rect(240 + k * 14, b - 46, 3, 8, STEEL); },
    ];
    B[n]();
    support(); bodies.length = 0;   // tidy any stray piece the builder left floating
    coreN = 0; for (let i = 0; i < N; i++) if (mat[i] === CORE) coreN++; coreLeft = coreN; dirty = true;
  }
  /* ---------- simulation step ---------- */
  let frame = 0;
  const seen = new Uint8Array(N), queue = new Int32Array(N), dist = new Uint16Array(N), DQ = 1 << 18, dq = new Int32Array(DQ);
  // how far each material can reach sideways from something holding it up before it snaps off
  // structures are stiff: a hit punches a hole, and only a piece that is cut off completely falls
  const SPAN = []; for (let m = 0; m < 16; m++) SPAN[m] = 4000;
  function support() {
    seen.fill(0); dist.fill(65535); let h = 0, tl = 0, qh = 0, qt = 0;
    for (let x = 0; x < GW; x++) for (let y = GH - 4; y < GH; y++) { const i = idx(x, y); dist[i] = 0; dq[tl] = i; tl = (tl + 1) & (DQ - 1); }
    while (h !== tl) {
      const i = dq[h]; h = (h + 1) & (DQ - 1); const d = dist[i], x = i % GW;
      for (let k = 0; k < 4; k++) {
        const j = k === 0 ? i - GW : k === 1 ? i + GW : k === 2 ? (x > 0 ? i - 1 : -1) : (x < GW - 1 ? i + 1 : -1); if (j < 0 || j >= N) continue;
        const m = mat[j]; if (!m || isLiquid(m)) continue;
        const nd = k < 2 ? d : d + 1; if (nd >= dist[j] || (k >= 2 && nd > SPAN[m])) continue;
        dist[j] = nd; if (k < 2) { h = (h - 1) & (DQ - 1); dq[h] = j; } else { dq[tl] = j; tl = (tl + 1) & (DQ - 1); }
      }
    }
    for (let i = 0; i < N; i++) if (dist[i] !== 65535) seen[i] = 1;
    // anything solid left unvisited is hanging in the air: it falls
    for (let s = 0; s < N; s++) {
      if (seen[s] || !isStatic(mat[s])) continue;
      qh = 0; qt = 0; queue[qt++] = s; seen[s] = 2; const cells = [];
      while (qh < qt) { const i = queue[qh++], x = i % GW; cells.push(i); for (const j of [i - GW, i + GW, x > 0 ? i - 1 : -1, x < GW - 1 ? i + 1 : -1]) { if (j < 0 || j >= N || seen[j]) continue; if (!isStatic(mat[j])) continue; seen[j] = 2; queue[qt++] = j; } }
      if (cells.length < 7) { for (const i of cells) { const c = col[i], m = mat[i]; mat[i] = RUB; hp[i] = M[RUB].hp; col[i] = m === GLASS ? rgb(190, 230, 240) : c; } continue; }
      let mx = GW, my = GH, Mx = 0, My = 0; for (const i of cells) { const x = i % GW, y = (i / GW) | 0; mx = Math.min(mx, x); my = Math.min(my, y); Mx = Math.max(Mx, x); My = Math.max(My, y); }
      let rest = false; for (const i of cells) { const j = i + GW; if (j < N && mat[j] && !isLiquid(mat[j]) && seen[j] !== 2) { rest = true; break; } }
      if (rest && !blasts.some(bl => bl.t < .4)) continue;
      const b = { x: mx, y: my, w: Mx - mx + 1, h: My - my + 1, vx: 0, vy: 0, cells: [], n: cells.length, age: 0 };
      for (const i of cells) { b.cells.push({ dx: i % GW - mx, dy: ((i / GW) | 0) - my, m: mat[i], c: col[i], h: hp[i], t: heat[i] }); mat[i] = E; hp[i] = 0; col[i] = 0; heat[i] = 0; }
      for (const bl of blasts) { if (bl.t > .4) continue; const dx = mx + b.w / 2 - bl.x, dy = my + b.h / 2 - bl.y, d = Math.hypot(dx, dy); if (d < bl.r * 3.5) { const k = bl.P * 3.2 / (1 + d * .08) / Math.sqrt(1 + b.n * .004); b.vx += dx / (d + 1) * k; b.vy += Math.min(0, dy / (d + 1) * k) - k * .15; } }
      bodies.push(b);
    }
  }
  function hits(b, ox, oy) {
    for (const c of b.cells) { const x = ox + c.dx, y = oy + c.dy; if (x < 0 || x >= GW || y >= GH) return true; if (y < 0) continue; const m = mat[idx(x, y)]; if (m && !isLiquid(m)) return true; }
    return false;
  }
  function land(b, rx, ry, impact) {
    // a heavy fall crushes what it lands on
    if (impact > 14) { let crushed = 0; const dmg = impact * .05 * Math.sqrt(b.n); for (const c of b.cells) { const x = rx + c.dx, y = ry + c.dy + 1; if (!inb(x, y)) continue; const i = idx(x, y); if (mat[i] && mat[i] !== BED && !isLiquid(mat[i]) && (c.dy === b.h - 1 || !b.cells.some(o => o.dx === c.dx && o.dy === c.dy + 1))) { if (hurt(i, dmg * (.6 + R() * .8))) { destroy(i, (R() - .5) * 40, -10 - R() * 20); crushed++; } } }
      if (crushed > 2) { b.vy *= .55; K.noise(.18, .12, 300); smoke(rx + b.w / 2, ry + b.h, 3, 1.4); return false; } }
    const sh = cl((impact - 13) / 38, 0, 1);
    for (const c of b.cells) {
      const x = rx + c.dx, y = ry + c.dy; if (!inb(x, y)) continue;
      const low = c.dy >= b.h - 4 ? 1 : .3;
      if (sh > 0 && R() < M[c.m].brit * sh * low) { if (c.m === GLASS) { debris(x + .5, y + .5, (R() - .5) * 40, -R() * 30, c.c, 2); continue; } if (debris(x + .5, y + .5, (R() - .5) * impact * .9 + b.vx * .3, -R() * impact * .55, c.c, c.m === CORE ? 3 : 0, c.m === CORE ? 600 : 0)) continue; }
      const i = idx(x, y); if (mat[i] && !isLiquid(mat[i]) && mat[i] !== RUB) continue;
      mat[i] = c.m; col[i] = c.c; hp[i] = c.h; heat[i] = c.t;
    }
    if (impact > 8) { smoke(rx + b.w / 2, ry + b.h, Math.min(16, 2 + b.n / 60), 1 + Math.min(2, b.n / 600)); K.shake(Math.min(18, impact * .15 + b.n / 300)); K.noise(.3 + Math.min(.5, b.n / 2000), Math.min(.4, .08 + b.n / 4000), 160); }
    dirty = true; return true;
  }
  function stepBodies(dt) {
    for (let k = bodies.length - 1; k >= 0; k--) {
      const b = bodies[k]; b.age += dt; b.vy += G * dt; b.vx *= .996;
      let rx = Math.round(b.x), ry = Math.round(b.y);
      const nx = Math.round(b.x + b.vx * dt); if (nx !== rx) { const s = Math.sign(nx - rx); let ok = true; for (let x = rx + s; x !== nx + s; x += s) { if (hits(b, x, ry)) { ok = false; break; } rx = x; } if (!ok) b.vx *= -.15; b.x = rx; } else b.x += b.vx * dt;
      const ny = Math.round(b.y + b.vy * dt);
      if (ny > ry) { let landed = false; for (let y = ry + 1; y <= ny; y++) { if (hits(b, rx, y)) { landed = true; break; } ry = y; } b.y = ry; if (landed) { if (land(b, rx, ry, b.vy)) bodies.splice(k, 1); else b.y = ry; } else b.y = b.y + b.vy * dt > ny + .5 ? ny : b.y + b.vy * dt; }
      else if (ny < ry) { if (hits(b, rx, ny)) b.vy = 0; else b.y += b.vy * dt; } else b.y += b.vy * dt;
      if (ry > GH + 5 || b.age > 12) bodies.splice(k, 1);
    }
  }
  function stepCells(dt) {
    frame++; const flip = frame & 1;
    for (let y = GH - 1; y >= 0; y--) {
      for (let q = 0; q < GW; q++) {
        const x = flip ? q : GW - 1 - q, i = y * GW + x, m = mat[i]; if (!m) continue;
        // heat: molten metal and molten core warm their neighbours, hot things melt or burn
        if (heat[i] > 0) {
          if (isLiquid(m)) {
            const T = heat[i];
            for (const j of [i - GW, i + GW, x > 0 ? i - 1 : -1, x < GW - 1 ? i + 1 : -1]) { if (j < 0 || j >= N) continue; const n = mat[j]; if (!n || isLiquid(n) || n === BED) continue; if (heat[j] < T) heat[j] += (T - heat[j]) * .1; }
            heat[i] -= (m === MOLT ? 62 : 46) * dt;
            if (heat[i] < (m === MOLT ? 260 : 220)) { mat[i] = SLAG; hp[i] = M[SLAG].hp; const k = m === CMOLT; col[i] = k ? rgb(96, 40, 48) : rgb(62 + rint(-6, 6), 54, 52); heat[i] = 0; dirty = true; continue; }
          } else {
            const mm = M[m];
            if (heat[i] > mm.melt) {
              if (mm.burns) { mat[i] = E; col[i] = 0; hp[i] = 0; const T = heat[i]; heat[i] = 0; dirty = true; if (fx.length < 600) fx.push({ k: 'f', x: x + .5, y: y + .5, vx: (R() - .5) * 4, vy: -8 - R() * 6, t: 0, l: .5 + R() * .7 }); if (R() < .3) smoke(x, y, 1, .7); for (const j of [i - GW, i - GW - 1, i - GW + 1, i - 1, i + 1, i + GW]) if (j >= 0 && j < N && mat[j]) heat[j] += T * .3 + 40; continue; }
              mat[i] = m === CORE ? CMOLT : MOLT; hp[i] = 1; heat[i] = Math.max(heat[i], m === CORE ? 470 : 600); dirty = true; if (m === CORE && R() < .2) spark(x + .5, y + .5, 2, 25, '#ff6a8a');
            } else { if (heat[i] > mm.melt * .8 && y < GH - 1 && !mat[i + GW] && R() < .006) debris(x + .5, y + 1, (R() - .5) * 4, 2, rgb(255, 170, 60), 1, heat[i] * .9); heat[i] = Math.max(0, heat[i] - (mm.burns ? 14 : heat[i] > mm.melt * .7 ? 70 : 26) * dt); if (mm.burns && heat[i] > mm.melt * .55 && R() < .04 && fx.length < 600) fx.push({ k: 'f', x: x + .5, y: y + .5, vx: 0, vy: -6, t: 0, l: .4 }); }
          }
        }
        // loose stuff falls and slides; liquids also run sideways
        const L = M[mat[i]].loose; if (!L || stamp[i] === frame) continue;
        let j = -1;
        if (y < GH - 1 && !mat[i + GW]) j = i + GW;
        else if (y < GH - 1) { const d = R() < .5 ? -1 : 1; for (const s of [d, -d]) { const nx = x + s; if (nx >= 0 && nx < GW && !mat[i + GW + s] && !mat[i + s]) { j = i + GW + s; break; } } if (j < 0 && L === 2 && R() < .7) { for (const s of [d, -d]) { const nx = x + s; if (nx >= 0 && nx < GW && !mat[i + s]) { j = i + s; break; } } } }
        if (j >= 0) { mat[j] = mat[i]; col[j] = col[i]; hp[j] = hp[i]; heat[j] = heat[i]; stamp[j] = frame; mat[i] = E; col[i] = 0; hp[i] = 0; heat[i] = 0; }
      }
    }
  }
  function stepParts(dt) {
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k]; p.t += dt; p.vy += G * dt; p.vx *= .995;
      const ox = p.x, oy = p.y; p.x += p.vx * dt; p.y += p.vy * dt;
      const x = Math.floor(p.x), y = Math.floor(p.y);
      if (x < 0 || x >= GW || y >= GH || p.t > 8) { parts.splice(k, 1); continue; }
      if (y < 0) continue;
      const i = idx(x, y);
      if (mat[i] && !isLiquid(mat[i])) {
        const px = Math.floor(ox), py = Math.floor(oy);
        if (inb(px, py)) { const j = idx(px, py); if (!mat[j]) {
          if (p.k === 1 || p.k === 3) { mat[j] = p.k === 3 ? CMOLT : MOLT; col[j] = p.c; hp[j] = 1; heat[j] = Math.max(p.h, 600); if (mat[i] !== BED) heat[i] += p.h * .45; }
          else if (p.k === 0 && R() < .62) { mat[j] = RUB; col[j] = p.c; hp[j] = M[RUB].hp; }
          else if (p.k === 2 && R() < .25) { mat[j] = RUB; col[j] = rgb(190, 230, 240, 200); hp[j] = .5; }
        } else if (p.k === 1 || p.k === 3) heat[i] += p.h * .5; }
        parts.splice(k, 1);
      }
    }
  }
  /* ---------- the gun ---------- */
  const GUN = { x: 18, y: 0 };
  let ang = .55, pow = .7, slot = 0, aiming = false;
  const vel = (d, a = ang, p = pow) => { const S = stats(d), v = (42 + 84 * p) * S.spd; return [Math.cos(a) * v, -Math.sin(a) * v]; };
  const muzzle = (a = ang) => [GUN.x + Math.cos(a) * 9, GUN.y - 4 - Math.sin(a) * 9];
  function fire() {
    if (mode !== 'play' || shots <= 0 || end || shells.length) return;
    const d = design(slot), S = stats(d), [vx, vy] = vel(d), [mx, my] = muzzle();
    const E0 = S.mass * Math.pow(Math.hypot(vx, vy) / 100, 2) * 22; shells.push({ x: mx, y: my, vx, vy, S, d, pen: 0, live: true, trail: [], E: E0, E0, small: false });
    shots--; used++; recoil = 1;
    K.sfx(90, .35, 'sawtooth', .12, -50); K.noise(.3, .3, 400); smoke(mx, my, 8, 1.1, 'rgba(200,190,170,'); spark(mx, my, 10, 60); K.shake(6);
  }
  function detonate(s, x, y) {
    s.live = false; const S = s.S, f = S.f, q = S.q, dx = s.vx, dy = s.vy, sp = Math.hypot(dx, dy) || 1;
    if (s.small) { blast(x, y, 4.2 * q, 5 * q); return; }
    if (S.jet > 0) jet(x - dx / sp * 2, y - dy / sp * 2, dx, dy, 34 + 34 * S.jet, 26 * S.jet);
    if (f.blast > 0) blast(x, y, (3 + 4 * f.blast) * Math.sqrt(q) * S.n.splash, 10 * f.blast * q * S.n.splash, { heat: f.heat ? 500 : 0 });
    if (f.frag) frag(x, y, 46, 4.5 * q, 30);
    if (f.heat) { const n = Math.round(200 * q); for (let k = 0; k < n; k++) { const a = Math.atan2(dy, dx) + Math.PI + (R() - .5) * 3.2, v = 12 + R() * 46; debris(x, y, Math.cos(a) * v * (R() < .5 ? -1 : 1), Math.sin(a) * v - 14, rgb(255, 150 + rint(0, 80), 40), 1, 1150 * q); } for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) { const cx = Math.floor(x + xx), cy = Math.floor(y + yy); if (inb(cx, cy) && mat[idx(cx, cy)]) heat[idx(cx, cy)] += 900 * q; } K.sfx(300, .8, 'sawtooth', .05, -200); }
    if (f.cluster) for (let k = 0; k < 6; k++) shells.push({ x: x - dx / sp * 2, y: y - dy / sp * 2 - 1, vx: -dx * .12 + (R() - .5) * 50, vy: -24 - R() * 26, S, d: s.d, pen: 0, live: true, trail: [], E: 2, small: true });
    if (!f.blast && !S.jet) { spark(x, y, 12, 50); K.noise(.15, .2, 900); dirty = true; }
  }
  const cam = { shk: 0, freeze: 0, on: false, x: 160, y: 90, z: 1, tz: 1, ts: 1, tts: 1, s: null, rel: 0, layers: [], hx: 0, hy: 0 };
  function camStart(s, hx, hy) { Object.assign(cam, { on: true, s, rel: 0, layers: [], tz: 3.4, tts: .14, hx, hy, note: '', noteT: 0 }); }
  function camEnd() { cam.on = false; cam.s = null; cam.tz = 1; cam.tts = 1; }
  function stepCam(dt) {
    if (cam.on) {
      if (cam.s && cam.s.live) { cam.hx = lp(cam.hx, cam.s.x, 1 - Math.exp(-dt * 6)); cam.hy = lp(cam.hy, cam.s.y, 1 - Math.exp(-dt * 6)); }
      else { cam.rel += dt; cam.tts = .45; if (cam.rel > 1.1) camEnd(); }
    }
    cam.shk = Math.max(0, cam.shk - dt * 30); if (cam.noteT > 0) cam.noteT -= dt;
    cam.z = lp(cam.z, cam.tz, 1 - Math.exp(-dt * (cam.tz > cam.z ? 7 : 4))); cam.ts = lp(cam.ts, cam.tts, 1 - Math.exp(-dt * 10));
    cam.x = lp(cam.x, cam.on ? cam.hx : cam.x, 1 - Math.exp(-dt * 8)); cam.y = lp(cam.y, cam.on ? cam.hy : cam.y, 1 - Math.exp(-dt * 8));
    if (!cam.on && cam.z < 1.01) { cam.z = 1; cam.ts = 1; }
  }
  const dents = [];
  function queueDent(x, y, vx, vy, str) {
    const ax = Math.abs(vx) >= Math.abs(vy) ? Math.sign(vx) : 0, ay = ax ? 0 : Math.sign(vy) || 1;
    dents.push({ x: Math.floor(x), y: Math.floor(y), ax, ay, r: Math.round(3 + str * 2), str, k: 0, f: 0 });
  }
  function moveCell(a, b) { mat[b] = mat[a]; col[b] = col[a]; hp[b] = hp[a]; heat[b] = heat[a] + 40; mat[a] = E; col[a] = 0; hp[a] = 0; heat[a] = 0; }
  function stepDents() {
    for (let n = dents.length - 1; n >= 0; n--) {
      const d = dents[n]; if (d.f++ % 2) continue; d.k++; if (d.k > Math.ceil(d.str)) { dents.splice(n, 1); continue; }
      for (let o = -d.r; o <= d.r; o++) {
        const want = d.str * Math.pow(1 - Math.abs(o) / (d.r + 1), 1.4); if (d.k > want + .5) continue;
        const px = d.ax ? d.x - d.ax * 3 : d.x + o, py = d.ax ? d.y + o : d.y - d.ay * 3;
        let f = -1, b = -1;
        for (let s2 = 0; s2 < 26; s2++) { const cx = px + d.ax * s2, cy = py + d.ay * s2; if (!inb(cx, cy)) break; const m = mat[idx(cx, cy)]; if (f < 0) { if (isStatic(m)) { if (m === BED) break; f = s2; } } else if (!m || isLiquid(m)) { b = s2; break; } else if (m === BED) break; }
        if (f < 0 || b < 0 || b - f > 18) continue;
        for (let s2 = b; s2 > f; s2--) moveCell(idx(px + d.ax * (s2 - 1), py + d.ay * (s2 - 1)), idx(px + d.ax * s2, py + d.ay * s2));
      }
      dirty = true;
    }
  }
  function jacketGone(s) {
    if (s.jkDone) return; s.jkDone = true; s.jk = 0;
    for (let q = 0; q < 26; q++) { const aa = Math.atan2(-s.vy, -s.vx) + (R() - .5) * 2.6, v = 18 + R() * 50; debris(s.x, s.y, Math.cos(aa) * v, Math.sin(aa) * v - 8, rgb(240, 140 + rint(0, 60), 60), 1, 600); }
    streak(s.x, s.y, 46, 0, TAU, 110); K.sfx(520, .25, 'triangle', .05, -240);
    if (cam.s === s) { cam.note = `COPPER JACKET STRIPPED · ${{ steel: 'STEEL CORE', alu: 'ALLOY CORE', tung: 'TUNGSTEN ROD' }[s.d.casing]} EXPOSED`; cam.noteT = 2.2; cam.freeze = .04; }
  }
  // a shell that can go no further stays stuck in the wall a moment: the rest of its jacket melts off, then any charge goes off
  function stall(s) { if (s.stuck != null) return; s.stuck = 1.15; if (s.jk == null) s.jk = 1; s.stuckFire = s.S.f.blast > 0 || s.S.jet > 0; }
  function stepShells(dt) {
    for (let k = shells.length - 1; k >= 0; k--) {
      const s = shells[k];
      if (!s.live) { shells.splice(k, 1); continue; }
      if (s.stuck != null) {
        s.stuck -= dt; const back = Math.atan2(-s.vy, -s.vx), sp = Math.hypot(s.vx, s.vy) || 1, nx = s.x + s.vx / sp * 1.2, ny = s.y + s.vy / sp * 1.2;
        if (s.jk > 0) { s.jk = Math.max(0, s.jk - dt * 1.6); if (R() < .7) debris(s.x - s.vx / sp, s.y - s.vy / sp, Math.cos(back) * (8 + R() * 18) + (R() - .5) * 10, -4 - R() * 10, rgb(235, 130 + rint(0, 50), 55), 1, 520); if (s.jk <= 0) jacketGone(s); }
        if (R() < .6) streak(nx, ny, 2, back, 2.4, 60); { const cx = Math.floor(nx), cy = Math.floor(ny); for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) if (inb(cx + xx, cy + yy) && mat[idx(cx + xx, cy + yy)]) heat[idx(cx + xx, cy + yy)] += 300 * dt; }
        if (s.stuck <= 0) { if (s.stuckFire) detonate(s, s.x, s.y); else { s.live = false; spark(s.x, s.y, 8, 30); } }
        continue;
      }
      const sub = Math.max(1, Math.ceil(Math.hypot(s.vx, s.vy) * dt / .45));
      for (let n = 0; n < sub && s.live; n++) {
        const h = dt / sub; s.vy += G * h; const ox = s.x, oy = s.y; s.x += s.vx * h; s.y += s.vy * h;
        const x = Math.floor(s.x), y = Math.floor(s.y);
        if (x < -4 || x > GW + 4 || y > GH) { s.live = false; if (!s.small) say('Missed!', '#ffb36a'); break; }
        if (y < 0 || x < 0 || x >= GW) continue;
        const S = s.S;
        if (S.u.air && !s.small) { const sp = Math.hypot(s.vx, s.vy); for (let a = 2; a <= 6; a += 2) { const ax = Math.floor(s.x + s.vx / sp * a), ay = Math.floor(s.y + s.vy / sp * a); if (inb(ax, ay) && isStatic(mat[idx(ax, ay)])) { detonate(s, s.x, s.y); break; } } if (!s.live) break; }
        if (!s.small && !s.cammed) { const sp = Math.hypot(s.vx, s.vy) || 1; for (let a = 0; a <= 16; a += 1) { const ax = Math.floor(s.x + s.vx / sp * a), ay = Math.floor(s.y + s.vy / sp * a); if (inb(ax, ay) && isStatic(mat[idx(ax, ay)])) { s.cammed = true; if (!cam.on) camStart(s, s.x + s.vx / sp * a * .6, s.y + s.vy / sp * a * .6); break; } } }
        const i = idx(x, y), m = mat[i];
        if ((!m || isLiquid(m)) && s.inside && !s.small) { s.inside = false; const sp = Math.hypot(s.vx, s.vy) || 1, base = s.lastM || STEEL; for (let q = 0; q < 16; q++) { const aa = Math.atan2(s.vy, s.vx) + (R() - .5) * .9, v = sp * (.2 + R() * .35); if (R() < .6) debris(s.x, s.y, Math.cos(aa) * v, Math.sin(aa) * v, rgb(255, 160 + rint(0, 60), 60), 1, 540); else debris(s.x, s.y, Math.cos(aa) * v, Math.sin(aa) * v, tone(base, x, y), 0); } streak(s.x, s.y, 18, Math.atan2(s.vy, s.vx), 1.3, 90); if (cam.s === s) cam.shk = 2; K.noise(.1, .08, 1400); }
        if (!m || isLiquid(m)) continue;
        if (s.small) { detonate(s, ox, oy); break; }
        const fuse = S.u, delay = fuse.delay || 0;
        // punch through: the cell costs energy according to how hard it is and how sharp the shell is
        // the soft copper jacket bites first and melts away; then the hard rod inside does the real piercing
        if (s.jk == null) { s.jk = 1; s.jkHP = 12 + 10 * S.mass; }
        const cost = Math.min(hp[i], 80) / (S.pen * (s.jk > 0 ? .75 : 1.55)) * PIERCE;
        if (m !== BED && s.E > cost) {
          s.E -= cost; s.pen++;
          { const c0 = col[i], mm = m; mat[i] = E; hp[i] = 0; heat[i] = 0; col[i] = 0; dirty = true;
            if (mm === GLASS) debris(x + .5, y + .5, (R() - .5) * 30, -R() * 20, c0, 2);
            else if (R() < .7) { const hot = mm === CORE ? 3 : 1; debris(x + .5, y + .5, -s.vx * .06 + (R() - .5) * 26, -s.vy * .06 - R() * 14, mm === CORE ? rgb(255, 90, 120) : rgb(255, 150 + rint(0, 70), 50), hot, 380 + R() * 130); }
            else debris(x + .5, y + .5, -s.vx * .1 + (R() - .5) * 40, -s.vy * .1 - R() * 30, c0, 0); }
          if (s.jk > 0) {
            s.jk -= Math.min(M[m].hp, 40) / s.jkHP * .09 + .004; s.jk = Math.min(s.jk, 1 - (s.E0 - s.E) / (s.E0 * .85));
            for (let q = 0; q < 2; q++) { const aa = Math.atan2(-s.vy, -s.vx) + (R() - .5) * 1.8, v = 14 + R() * 34; debris(s.x - s.vx * .004, s.y - s.vy * .004, Math.cos(aa) * v, Math.sin(aa) * v - 6, rgb(235, 130 + rint(0, 40), 60), 1, 560); }
            if (s.jk <= 0) { jacketGone(s); } if (false) { for (let q = 0; q < 26; q++) { const aa = Math.atan2(-s.vy, -s.vx) + (R() - .5) * 2.6, v = 18 + R() * 50; debris(s.x, s.y, Math.cos(aa) * v, Math.sin(aa) * v - 8, rgb(240, 140 + rint(0, 60), 60), 1, 600); } streak(s.x, s.y, 46, 0, TAU, 110); spark(s.x, s.y, 10, 60, '#ffb070'); K.sfx(520, .25, 'triangle', .05, -240); if (cam.s === s) { cam.note = `COPPER JACKET STRIPPED · ${{ steel: 'STEEL CORE', alu: 'ALLOY CORE', tung: 'TUNGSTEN ROD' }[s.d.casing]} EXPOSED`; cam.noteT = 2.2; cam.freeze = .04; } }
          }
          { const hk = Math.min(1.3, .35 + M[m].hp / 10); for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) { const d = Math.hypot(xx, yy); if (d > 3.2) continue; const nx = x + xx, ny = y + yy; if (inb(nx, ny)) { const j = idx(nx, ny); if (mat[j] && !isLiquid(mat[j]) && mat[j] !== BED) heat[j] = Math.min(heat[j] + 330 * hk * (1 - d / 3.6), Math.max(heat[j], (M[mat[j]].melt || 900) * .92)); } } }
          if (R() < .55) { const cc = { steel: rgb(150, 160, 175), alu: rgb(205, 212, 220), tung: rgb(90, 94, 106) }[s.d.casing]; debris(s.x, s.y, -s.vx * .08 + (R() - .5) * 40, -s.vy * .08 - 10 - R() * 25, cc, 0); }
          { const back = Math.atan2(-s.vy, -s.vx), hard = M[m].hp; streak(s.x, s.y, hard >= 10 ? 11 : hard > 3 ? 6 : 3, back, 2.2, 70 + hard * 3); if (hard >= 10) streak(s.x, s.y, 3, back + Math.PI, .8, 50); }
          const first = s.pen === 1, solidL = m !== RUB && m !== SLAG, newLayer = solidL && s.lastM !== m; if (solidL) s.lastM = m; s.inside = true;
          if (cam.on && cam.s === s && newLayer) { cam.layers.push(m); if (cam.layers.length > 6) cam.layers.shift(); }
          if (newLayer) queueDent(x, y, s.vx, s.vy, cl(s.E / (M[m].hp * .22 + 1.5), 1.2, 5));
          if (newLayer && cam.s === s) { cam.freeze = first ? .03 : 0; cam.shk = first ? 2.5 : 1.5; if (first) fx.push({ k: 'w', x: s.x, y: s.y, r: 0, t: 0, l: .45 }); }
          { const mc = unpack(tone(m, x, y)), cc = `rgb(${mc[0]},${mc[1]},${mc[2]})`; for (let q = 0; q < 7 && fx.length < 1200; q++) { const aa = Math.atan2(-s.vy, -s.vx) + (R() - .5) * 1.6, sp = 15 + R() * 55; fx.push({ k: 'c', x: s.x, y: s.y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp - 10, t: 0, l: .5 + R() * .6, c: cc }); } }
          if (t - (s.snd || 0) > .05) { s.snd = t; const hd = M[m].hp; if (hd >= 10) { K.sfx(900 + R() * 500, .06, 'square', .035, -300); K.noise(.05, .06, 2500); } else if (m === GLASS) K.sfx(2400 + R() * 800, .05, 'triangle', .04); else K.noise(.08, .09, 300 + hd * 60); }
          const sp = Math.hypot(s.vx, s.vy), nv = Math.sqrt(Math.max(0, s.E) / (S.mass * 22)) * 100, k = sp > 0 ? nv / sp : 0; s.vx *= k; s.vy *= k;
          if (M[m].hp > 3) spark(s.x, s.y, 2, 30);
          if (delay && s.pen >= delay && S.f.blast > 0) { detonate(s, s.x, s.y); break; }
          if (nv < 6) { stall(s); break; }
        } else { if (m !== BED) { if (hurt(i, s.E * S.pen / PIERCE * 1.4)) destroy(i, s.vx * .1, s.vy * .1); else heat[i] += 260; } queueDent(x, y, s.vx, s.vy, cl(s.E / 2.5, 1, 3.5)); stall(s); streak(ox, oy, 14, Math.atan2(-s.vy, -s.vx), 2, 80); K.noise(.12, .2, 1200); break; }
      }
      s.trail.push([s.x, s.y]); if (s.trail.length > 14) s.trail.shift();
    }
  }
  /* ---------- game state ---------- */
  const SV = () => { const s = K.save; if (!s.ss1) s.ss1 = { coins: 0, own: {}, up: {}, stars: {}, total: 0, slots: [{ casing: 'steel', nose: 'round', fill: 'he', liner: 'none', fuse: 'impact' }, { casing: 'steel', nose: 'round', fill: 'he', liner: 'none', fuse: 'impact' }, { casing: 'steel', nose: 'round', fill: 'he', liner: 'none', fuse: 'impact' }] }; return s.ss1; };
  let mode = 'map', coins = 0, own = {}, up = {}, stars = {}, slots = [], total = 0;
  let lvl = 0, shots = 0, used = 0, end = null, endT = 0, settle = 0, recoil = 0, t = 0, msgs = [], res = null, wsSlot = 0, botT = 0, sel = 0, coreT = 0;
  const lv = k => up[k] || 0, owns = (cat, k) => part(cat, k).cost === 0 || !!own[cat + ':' + k];
  const design = i => slots[i] || slots[0];
  function save() { if (K.bot) return; const S = SV(); S.coins = coins; S.own = own; S.up = up; S.stars = stars; S.slots = slots; S.total = total; K.persist(); }
  function say(s, c = '#fff') { msgs.push({ s, c, t: 0 }); if (msgs.length > 2) msgs.shift(); }
  function startLevel(n) {
    camEnd(); cam.z = 1; cam.ts = 1;
    lvl = n; build(n); GUN.y = (() => { for (let y = 0; y < GH; y++) if (mat[idx(GUN.x, y)]) return y; return GY; })();
    for (let x = GUN.x - 6; x <= GUN.x + 6; x++) for (let y = GUN.y - 14; y < GUN.y; y++) set(x, y, E);
    parts.length = 0; fx.length = 0; shells.length = 0; bodies.length = 0; blasts.length = 0; dents.length = 0;
    shots = 8 + lv('rack'); used = 0; end = null; endT = 0; settle = 0; mode = 'play'; msgs = []; coreT = 0;
    ang = .5; pow = .7; say(LEVELS[n].hint, '#ffd890');
  }
  function finish(win) {
    const L = LEVELS[lvl], st = win ? (used <= L.par ? 3 : used <= L.par + 1 ? 2 : 1) : 0, first = win && !stars[lvl];
    let got = 0; if (win) { got = Math.round(L.reward * (.6 + .2 * st) * (first ? 1 : .35)); if (st > (stars[lvl] || 0)) stars[lvl] = st; coins += got; total += got; K.score = total; K.chime(523, [0, 4, 7, 12, 16]); } else K.sfx(160, .5, 'sawtooth', .07, -60);
    res = { win, st, got, first }; mode = 'result'; save();
  }
  /* ---------- input ---------- */
  const btn = {}, inR = (b, x, y) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  const keys = new Set();
  function aimAt(x, y) { const [px, py] = [GUN.x * CS, (GUN.y - 4) * CS], dx = x - px, dy = py - y; ang = cl(Math.atan2(dy, dx), -.15, 1.45); pow = cl((Math.hypot(dx, dy) - 50) / 520, .12, 1); }
  GAME.down = (x, y) => {
    K.audio && K.audio();
    for (const k in btn) if (inR(btn[k], x, y)) return press(k);
    if (mode === 'play' && cam.on) { camEnd(); return; }
    if (mode === 'play' && !end && y < 640 && cam.z < 1.05) { aiming = true; aimAt(x, y); }
  };
  GAME.move = (x, y) => { if (aiming && mode === 'play') aimAt(x, y); };
  GAME.up = (x, y) => { if (aiming && mode === 'play') { aiming = false; const [px, py] = [GUN.x * CS, (GUN.y - 4) * CS]; if (x == null || Math.hypot(x - px, y - py) > 46) fire(); } aiming = false; };
  GAME.key = (c, d) => {
    if (d) keys.add(c); else keys.delete(c);
    if (!d) return;
    if (mode === 'play') { if (c === 'Space' || c === 'Enter') fire(); if (c === 'Digit1' || c === 'Digit2' || c === 'Digit3') slot = +c.slice(5) - 1; if (c === 'KeyR') startLevel(lvl); return; }
    if (mode === 'result' && (c === 'Enter' || c === 'Space')) press(res.win && lvl < LEVELS.length - 1 ? 'next' : 'map');
    if (mode === 'map') { if (c === 'ArrowRight') sel = Math.min(LEVELS.length - 1, sel + 1); if (c === 'ArrowLeft') sel = Math.max(0, sel - 1); if (c === 'ArrowDown') sel = Math.min(LEVELS.length - 1, sel + 6); if (c === 'ArrowUp') sel = Math.max(0, sel - 6); if (c === 'Enter' || c === 'Space') press('lvl' + sel); if (c === 'KeyW') press('shop'); }
    if (mode === 'shop' && (c === 'Escape' || c === 'Enter')) press('back');
  };
  const unlocked = n => n === 0 || !!stars[n - 1];
  function press(k) {
    if (k.startsWith('lvl')) { const n = +k.slice(3); if (!unlocked(n)) { say('Clear the level before it first', '#ff8a8a'); return; } return startLevel(n); }
    if (k === 'shop') { mode = 'shop'; return; }
    if (k === 'back' || k === 'map') { mode = 'map'; return; }
    if (k === 'next') { if (unlocked(lvl + 1)) startLevel(lvl + 1); else mode = 'map'; return; }
    if (k === 'retry') return startLevel(lvl);
    if (k === 'fire') return fire();
    if (k === 'quit') { mode = 'map'; return; }
    if (k === 'cash') { K.score = total; K.over({ title: 'Range closed', text: `You earned ${total.toLocaleString('en-US')} coins and ${Object.values(stars).reduce((a, b) => a + b, 0)} stars.` }); return; }
    if (k.startsWith('slot')) { slot = +k.slice(4); return; }
    if (k.startsWith('ws')) { wsSlot = +k.slice(2); return; }
    if (k.startsWith('p:')) { const [, cat, pk] = k.split(':'), p = part(cat, pk); if (!owns(cat, pk)) { if (coins < p.cost) { say('Not enough coins', '#ff8a8a'); return; } coins -= p.cost; own[cat + ':' + pk] = true; K.chime(660, [0, 4, 7]); } slots[wsSlot] = { ...slots[wsSlot], [cat]: pk }; save(); return; }
    if (k.startsWith('u:')) { const u = UPG.find(q => q.k === k.slice(2)), l = lv(u.k); if (l >= u.max) return; if (coins < u.cost(l)) { say('Not enough coins', '#ff8a8a'); return; } coins -= u.cost(l); up[u.k] = l + 1; K.chime(660, [0, 4, 7, 12]); save(); return; }
  }
  /* ---------- kit hooks ---------- */
  GAME.reset = () => {
    const S = SV(); coins = S.coins || 0; own = { ...(S.own || {}) }; up = { ...(S.up || {}) }; stars = { ...(S.stars || {}) }; total = S.total || 0; slots = (S.slots || []).map(d => ({ ...d })); while (slots.length < 3) slots.push({ casing: 'steel', nose: 'round', fill: 'he', liner: 'none', fuse: 'impact' });
    mode = 'map'; msgs = []; K.score = total; sel = Math.max(0, LEVELS.findIndex((L, i) => !stars[i])); if (sel < 0) sel = LEVELS.length - 1;
    if (K.bot) { up = { barrel: 2, fillq: 2, rack: 1 }; slots = [{ casing: 'tung', nose: 'point', fill: 'he', liner: 'cu', fuse: 'short' }, { casing: 'steel', nose: 'round', fill: 'therm', liner: 'none', fuse: 'short' }, { casing: 'steel', nose: 'round', fill: 'cluster', liner: 'none', fuse: 'impact' }]; startLevel(pick([0, 1, 3, 4, 7, 9, 10, 16, 18, 22, 23])); botT = 1.2; }
  };
  let acc = 0;
  GAME.update = dt => {
    t += dt; for (const m of msgs) m.t += dt; msgs = msgs.filter(m => m.t < 3);
    if (mode !== 'play') return;
    if (keys.size) { const fast = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.5 : 1; if (keys.has('ArrowLeft') || keys.has('KeyA')) ang = cl(ang + dt * .5 * fast, -.15, 1.45); if (keys.has('ArrowRight') || keys.has('KeyD')) ang = cl(ang - dt * .5 * fast, -.15, 1.45); if (keys.has('ArrowUp') || keys.has('KeyW')) pow = cl(pow + dt * .35 * fast, .12, 1); if (keys.has('ArrowDown') || keys.has('KeyS')) pow = cl(pow - dt * .35 * fast, .12, 1); }
    recoil = Math.max(0, recoil - dt * 3); stepCam(dt); let sdt = dt * cam.ts; if (cam.freeze > 0) { cam.freeze -= dt; sdt = 0; }
    acc = Math.min(acc + sdt, .1);
    while (acc >= 1 / 60) {
      const h = 1 / 60; acc -= h;
      stepShells(h); stepDents(); stepParts(h); stepBodies(h); stepCells(h);
      for (const b of blasts) b.t += h; while (blasts.length && blasts[0].t > 1) blasts.shift();
      if (dirty && (frame % 6 === 0)) { dirty = false; support(); }
    }
    for (let k = fx.length - 1; k >= 0; k--) { const f = fx[k]; const dt = sdt; f.t += dt; if (f.k === 's') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy *= .98; f.r += dt * 3; } else if (f.k === 'p' || f.k === 'f' || f.k === 'c') { f.x += f.vx * dt; f.y += f.vy * dt; if (f.k !== 'f') f.vy += G * (f.k === 'c' ? 1 : .6) * dt; } else if (f.k === 'w') f.r += dt * 60; else if (f.k === 'k') { f.vy += G * .7 * dt; f.vx *= .985; const nx = f.x + f.vx * dt, ny = f.y + f.vy * dt; if (inb(Math.floor(nx), Math.floor(ny)) && isStatic(mat[idx(Math.floor(nx), Math.floor(ny))])) { f.vy *= -.35; f.vx *= .6; } else { f.x = nx; f.y = ny; } } if (f.t > f.l) fx.splice(k, 1); }
    if ((coreT += dt) > .2) { coreT = 0; let n = 0; for (let i = 0; i < N; i++) if (mat[i] === CORE) n++; for (const b of bodies) for (const c of b.cells) if (c.m === CORE) n++; coreLeft = n; }
    if (!end) {
      if (coreLeft <= coreN * .1) { end = 'win'; endT = 0; say('CORE DESTROYED!', '#5cf28a'); K.shake(10); }
      else if (shots <= 0 && !shells.length) { const calm = !bodies.length && parts.length < 30; settle = calm ? settle + dt : 0; if (settle > 2.2) { end = 'lose'; endT = 0; } }
    } else { endT += dt; if (endT > (end === 'win' ? 2.2 : .6)) { if (K.bot) { startLevel(pick([0, 1, 2, 3, 4, 7, 9, 10, 12, 16, 18, 22, 23])); botT = 1.4; } else finish(end === 'win'); } }
  };
  // the attract demo: aim at the core with a quick ballistic search, then fire
  function solve(d) {
    const cs = []; for (let i = 0; i < N; i++) if (mat[i] === CORE) cs.push(i); if (!cs.length) return null; const c0 = cs[Math.floor(cs.length / 2)], x0 = c0 % GW, y0 = (c0 / GW) | 0; let cx = 0, cy = 0, n = 0; for (const i of cs) { const x = i % GW, y = (i / GW) | 0; if (Math.abs(x - x0) < 14 && Math.abs(y - y0) < 14) { cx += x; cy += y; n++; } }
    if (!n) return null; cx /= n; cy /= n; let best = null;
    for (let a = -.1; a < 1.3; a += .03) for (let p = .2; p <= 1; p += .02) { let [vx, vy] = vel(d, a, p), [x, y] = muzzle(a), md = 1e9; for (let s = 0; s < 400; s++) { vy += G / 60; x += vx / 60; y += vy / 60; const dd = Math.hypot(x - cx, y - cy); if (dd < md) md = dd; if (y > GH || x > GW) break; if (x > cx + 4) break; } const sc = md + a * 4; if (!best || sc < best.sc) best = { a, p, sc }; }
    return best;
  }
  GAME.bot = dt => {
    if (mode !== 'play' || end) return;
    if (shells.length || bodies.length) return;
    if ((botT -= dt) > 0) { if (GAME._aim) { ang = lp(ang, GAME._aim.a, dt * 3); pow = lp(pow, GAME._aim.p, dt * 3); } return; }
    if (!GAME._aim) { slot = used % 3 === 2 ? 2 : used % 2; GAME._aim = solve(design(slot)); if (GAME._aim) { GAME._aim.a += (R() - .5) * .03; } botT = 1; return; }
    ang = GAME._aim.a; pow = GAME._aim.p; fire(); GAME._aim = null; botT = 1.2;
  };
  /* ---------- drawing ---------- */
  function tx(g, s, x, y, font, c, al = 'center', st) { g.font = font; g.textAlign = al; g.textBaseline = 'middle'; if (st) { g.lineWidth = st; g.strokeStyle = 'rgba(0,0,0,.65)'; g.strokeText(s, x, y); } g.fillStyle = c; g.fillText(s, x, y); }
  const F = (px, w = 800) => `${w} ${px}px Nunito, sans-serif`, D = px => `${px}px "Russo One", sans-serif`;
  function rr(g, x, y, w, h, r, fill, stroke, lw = 2) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
  function button(g, k, x, y, w, h, label, colr, sub, tc = '#1a1420') { btn[k] = { x, y, w, h }; g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.roundRect(x, y + 5, w, h, 12); g.fill(); rr(g, x, y, w, h, 12, colr); tx(g, label, x + w / 2, y + h / 2 + (sub ? -8 : 2), D(h > 64 ? 24 : 18), tc); if (sub) tx(g, sub, x + w / 2, y + h / 2 + 15, F(12), tc); }
  const wc = document.createElement('canvas'); wc.width = GW; wc.height = GH; const wx = wc.getContext('2d'), img = wx.createImageData(GW, GH), d32 = new Uint32Array(img.data.buffer);
  const gc = document.createElement('canvas'); gc.width = GW / 2; gc.height = GH / 2; const gx = gc.getContext('2d'), gimg = gx.createImageData(GW / 2, GH / 2), gacc = new Float32Array(GW / 2 * GH / 2 * 3);
  // draw anything through a low-res buffer so it comes out as crisp pixel art (ps = screen px per art pixel)
  const pool = {};
  function pix(g, x0, y0, w, h, ps, fn) {
    const cw = Math.max(1, Math.ceil(w / ps)), ch = Math.max(1, Math.ceil(h / ps)), key = cw + 'x' + ch;
    let c = pool[key]; if (!c) { c = document.createElement('canvas'); c.width = cw; c.height = ch; c.x = c.getContext('2d', { willReadFrequently: true }); pool[key] = c; }
    const x = c.x; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cw, ch); x.setTransform(1 / ps, 0, 0, 1 / ps, -x0 / ps, -y0 / ps); fn(x);
    const im = x.getImageData(0, 0, cw, ch), d = im.data; for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 100 ? 255 : 0; x.putImageData(im, 0, 0);
    g.save(); g.imageSmoothingEnabled = false; g.drawImage(c, x0, y0, cw * ps, ch * ps); g.restore();
  }
  const pixIcon = (g, d, x, y, L, Hh, o = {}, ps = 3) => pix(g, Math.floor((x - ps * 2) / ps) * ps, Math.floor((y - Hh) / ps) * ps, L + ps * 6, Hh * 2 + ps * 2, ps, c => shellIcon(c, d, x, y, L, Hh, o));
  function hotCol(T, core) { const k = cl((T - 200) / 900, 0, .78); return core ? [255, 50 + k * 150, 90 + k * 120] : [255, 70 + k * 170, 20 + k * 150]; }
  function sky(g) {
    const v = K.view, gr = g.createLinearGradient(0, v.y0, 0, 640); gr.addColorStop(0, '#2a2348'); gr.addColorStop(.55, '#a8507a'); gr.addColorStop(1, '#ffb070'); g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.fillStyle = 'rgba(255,230,180,.85)'; g.beginPath(); g.arc(1040, 170, 46, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,230,180,.15)'; g.beginPath(); g.arc(1040, 170, 80, 0, TAU); g.fill();
    g.fillStyle = 'rgba(70,40,80,.55)'; g.beginPath(); g.moveTo(v.x0, 640); for (let x = v.x0; x <= v.x1; x += 40) g.lineTo(x, 470 + Math.sin(x * .006) * 50 + Math.sin(x * .017) * 20); g.lineTo(v.x1, 640); g.fill();
    g.fillStyle = 'rgba(50,30,60,.6)'; g.beginPath(); g.moveTo(v.x0, 640); for (let x = v.x0; x <= v.x1; x += 30) g.lineTo(x, 540 + Math.sin(x * .011 + 2) * 30); g.lineTo(v.x1, 640); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)'; for (let k = 0; k < 4; k++) { const cx = ((k * 380 + t * 8) % 1700) - 200, cy = 90 + k * 40; g.beginPath(); g.ellipse(cx, cy, 90, 16, 0, 0, TAU); g.ellipse(cx + 40, cy - 8, 60, 14, 0, 0, TAU); g.fill(); }
  }
  // zoomed in, every world pixel is redrawn as SUB x SUB fine pixels: material texture, bevelled edges, cracks, finer debris
  const SUB = 5, dcv = document.createElement('canvas'), dcx = dcv.getContext('2d'); let dim = null, dd = null, detailOn = false, DW = { x0: 0, y0: 0, x1: 0, y1: 0 };
  const hsh = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function texK(m, X, Y, h) {
    switch (m) {
      case STEEL: case LEAD: return 1 + (Y % 3 === 0 ? -.07 : .03) + (h - .5) * .06;
      case WOOD: return 1 + .1 * Math.sin(X * .55 + Math.sin(Y * .17) * 2.2) + (h - .5) * .05;
      case CONC: case SLAG: return h < .1 ? .78 : h > .93 ? 1.16 : 1 + (h - .5) * .08;
      case STONE: return h < .12 ? .8 : 1 + (h - .5) * .1;
      case BRICK: return 1 + (h - .5) * .14;
      case DIRT: case RUB: return h < .15 ? .75 : h > .9 ? 1.2 : 1 + (h - .5) * .12;
      case GLASS: return (X + Y) % 11 < 2 ? 1.35 : 1;
      case CORE: return .85 + .3 * (.5 + .5 * Math.sin(X * .45 + t * 4) * Math.sin(Y * .4 - t * 3));
      case MOLT: case CMOLT: return .85 + .3 * (.5 + .5 * Math.sin(X * .6 + Y * .2 + t * 6));
      default: return 1 + (h - .5) * .08;
    }
  }
  function drawDetail(g) {
    const { x0, y0, x1, y1 } = DW, cw = x1 - x0 + 1, ch = y1 - y0 + 1, W = cw * SUB, H = ch * SUB;
    if (dcv.width !== W || dcv.height !== H) { dcv.width = W; dcv.height = H; dim = dcx.createImageData(W, H); dd = new Uint32Array(dim.data.buffer); }
    dd.fill(0);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      if (!inb(cx, cy)) continue; const i = idx(cx, cy), c = d32[i]; if (!c) continue;
      const m = mat[i] || STEEL, [r, gg, b] = unpack(c), a = c >>> 24;
      const up = cy > 0 && d32[i - GW], dn = cy < GH - 1 && d32[i + GW], lf = cx > 0 && d32[i - 1], rt = cx < GW - 1 && d32[i + 1];
      const dmg = mat[i] && M[m].hp < 1e8 ? cl(1 - hp[i] / M[m].hp, 0, 1) : 0, ch0 = hsh(cx, cy);
      for (let sy = 0; sy < SUB; sy++) for (let sx = 0; sx < SUB; sx++) {
        const X = cx * SUB + sx, Y = cy * SUB + sy, h = hsh(X, Y); let k = texK(m, X, Y, h);
        if (!up && sy === 0) k *= 1.28; else if (!up && sy === 1) k *= 1.1;
        if (!lf && sx === 0) k *= 1.14; if (!dn && sy === SUB - 1) k *= .66; if (!rt && sx === SUB - 1) k *= .78;
        if (dmg > .12 && ((sx + sy * 2 + Math.floor(ch0 * 7)) % 5 === 0) && h < dmg * 1.1) k *= .42;
        dd[(cy - y0) * SUB * W + sy * W + (cx - x0) * SUB + sx] = rgb(cl(r * k, 0, 255) | 0, cl(gg * k, 0, 255) | 0, cl(b * k, 0, 255) | 0, a);
      }
    }
    // debris and drops at fine resolution
    for (const p of parts) { const X = Math.floor((p.x - x0) * SUB), Y = Math.floor((p.y - y0) * SUB); if (X < 0 || Y < 0 || X >= W - 1 || Y >= H - 1) continue; let c = p.c; if (p.k === 1 || p.k === 3) { const [r, gg, b] = hotCol(p.h - p.t * 200, p.k === 3); c = rgb(r, gg | 0, b | 0); } dd[Y * W + X] = c; dd[Y * W + X + 1] = c; dd[(Y + 1) * W + X] = c; dd[(Y + 1) * W + X + 1] = c; }
    dcx.putImageData(dim, 0, 0); g.save(); g.imageSmoothingEnabled = false; g.drawImage(dcv, x0 * CS, y0 * CS, cw * CS, ch * CS); g.restore();
  }
  function drawWorld(g) {
    gacc.fill(0); const pulse = .8 + Math.sin(t * 5) * .2;
    for (let i = 0; i < N; i++) {
      const m = mat[i]; if (!m) { d32[i] = 0; continue; }
      let c = col[i];
      if (isLiquid(m)) { const [r, gg, b] = hotCol(heat[i], m === CMOLT); c = rgb(r, gg | 0, b | 0); }
      else if (heat[i] > 50) { const k = cl((heat[i] - 50) / 650, 0, 1), [r, gg, b] = unpack(c), hc = k < .35 ? [lp(150, 210, k / .35), lp(60, 70, k / .35), lp(190, 170, k / .35)] : k < .7 ? [lp(210, 255, (k - .35) / .35), lp(70, 140, (k - .35) / .35), lp(170, 40, (k - .35) / .35)] : [255, lp(140, 240, (k - .7) / .3), lp(40, 190, (k - .7) / .3)], a = cl(.35 + k * .9, 0, 1); c = rgb(lp(r, hc[0], a) | 0, lp(gg, hc[1], a) | 0, lp(b, hc[2], a) | 0, 255); }
      else if (m === CORE) { const [r, gg, b] = unpack(c); c = rgb(r, cl(gg * pulse + 20 * (1 - pulse), 0, 255) | 0, b); }
      d32[i] = c;
      const glow = isLiquid(m) ? .62 : m === CORE ? .55 * pulse : heat[i] > 160 ? cl((heat[i] - 160) / 900, 0, .6) : 0;
      if (glow > 0) { const x = (i % GW) >> 1, y = ((i / GW) | 0) >> 1, j = (y * (GW / 2) + x) * 3, hc = m === CORE || m === CMOLT ? [1, .2, .35] : [1, .45, .12]; gacc[j] += hc[0] * glow * .5; gacc[j + 1] += hc[1] * glow * .5; gacc[j + 2] += hc[2] * glow * .5; }
    }
    for (const b of bodies) { const rx = Math.round(b.x), ry = Math.round(b.y); for (const c of b.cells) { const x = rx + c.dx, y = ry + c.dy; if (inb(x, y)) d32[idx(x, y)] = c.c; } }
    if (!detailOn) for (const p of parts) { const x = Math.floor(p.x), y = Math.floor(p.y); if (inb(x, y)) { if (p.k === 1 || p.k === 3) { const [r, gg, b] = hotCol(p.h - p.t * 200, p.k === 3); d32[idx(x, y)] = rgb(r, gg | 0, b | 0); const j = ((y >> 1) * (GW / 2) + (x >> 1)) * 3; gacc[j] += .5; gacc[j + 1] += p.k === 3 ? .1 : .25; gacc[j + 2] += p.k === 3 ? .18 : .05; } else d32[idx(x, y)] = p.c; } }
    wx.putImageData(img, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(wc, 0, 0, GW * CS, GH * CS); if (detailOn) drawDetail(g);
    const gd = gimg.data; for (let j = 0, q = 0; j < gacc.length; j += 3, q += 4) { gd[q] = cl(gacc[j] * 255, 0, 255); gd[q + 1] = cl(gacc[j + 1] * 255, 0, 255); gd[q + 2] = cl(gacc[j + 2] * 255, 0, 255); gd[q + 3] = 255; }
    gx.putImageData(gimg, 0, 0); g.save(); g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true; const za = 1 / Math.max(1, cam.z * .8); g.globalAlpha = .9 * za; g.drawImage(gc, -8, -8, GW * CS + 16, GH * CS + 16); g.globalAlpha = .45 * za * za; g.drawImage(gc, -40, -40, GW * CS + 80, GH * CS + 80); g.restore();
    // below the world: more bedrock
    const v = K.view; g.fillStyle = '#2c2428'; g.fillRect(v.x0, GH * CS, v.x1 - v.x0, v.y1 - GH * CS); g.fillStyle = '#4a3420'; if (v.x0 < 0) { g.fillRect(v.x0, (mat[idx(0, GH - 5)] ? GH - 20 : GH) * CS, -v.x0, 80); }
  }
  function drawFx(g) {
    for (const f of fx) {
      const k = f.t / f.l;
      if (f.k === 's') { g.fillStyle = f.c + ((cam.z > 1.2 ? .14 : .3) * (1 - k)).toFixed(3) + ')'; g.beginPath(); g.arc(f.x * CS, f.y * CS, f.r * CS, 0, TAU); g.fill(); }
      else if (f.k === 'p') { g.fillStyle = f.c; g.globalAlpha = 1 - k; const z = cam.z > 2.1 ? 1.6 : 4; g.fillRect(f.x * CS - z / 2, f.y * CS - z / 2, z, z); g.globalAlpha = 1; }
      else if (f.k === 'k') { const h = 1 - k, col = h > .7 ? '255,252,235' : h > .4 ? '255,214,120' : h > .2 ? '255,150,60' : '220,70,30'; g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(${col},${Math.min(1, h * 1.6).toFixed(2)})`; g.lineWidth = f.w; g.beginPath(); g.moveTo(f.x * CS, f.y * CS); g.lineTo((f.x - f.vx * .035) * CS, (f.y - f.vy * .035) * CS); g.stroke(); g.restore(); }
      else if (f.k === 'c') { g.fillStyle = f.c; g.globalAlpha = Math.min(1, (1 - k) * 2); g.fillRect(f.x * CS - .8, f.y * CS - .8, 1.6, 1.6); g.globalAlpha = 1; }
      else if (f.k === 'w') { g.strokeStyle = `rgba(255,236,200,${(.8 * (1 - k)).toFixed(2)})`; g.lineWidth = 2.5 * (1 - k) + .5; g.beginPath(); g.arc(f.x * CS, f.y * CS, f.r * CS * .35 + 2, 0, TAU); g.stroke(); }
      else if (f.k === 'f') { g.fillStyle = `rgba(255,${(180 - k * 120) | 0},40,${(1 - k).toFixed(2)})`; g.beginPath(); g.arc(f.x * CS, f.y * CS, (2 + k * 4) * 1.6, 0, TAU); g.fill(); }
      else if (f.k === 'x') { g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(f.x * CS, f.y * CS, 0, f.x * CS, f.y * CS, f.r * CS * (1 + k)); gr.addColorStop(0, `rgba(255,250,220,${1 - k})`); gr.addColorStop(.4, `rgba(255,170,60,${.8 * (1 - k)})`); gr.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(f.x * CS, f.y * CS, f.r * CS * (1 + k), 0, TAU); g.fill(); g.restore(); }
      else if (f.k === 'j' || f.k === 'r') { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = f.k === 'j' ? `rgba(255,220,150,${1 - k})` : `rgba(255,200,120,${.6 * (1 - k)})`; g.lineWidth = f.k === 'j' ? 6 * (1 - k) + 2 : 1.5; g.beginPath(); g.moveTo(f.x * CS, f.y * CS); g.lineTo(f.x2 * CS, f.y2 * CS); g.stroke(); g.restore(); }
    }
  }
  function shellIcon(g, d, x, y, L, Hh, o = {}) {   // a cut-away drawing of a shell, pointing right; (x,y) = tail centre
    const S = stats(d), casC = { steel: '#8a98a8', alu: '#c8d0d8', tung: '#4a4e58' }[d.casing], fillC = { he: '#ffd23f', frag: '#a8a8a8', therm: '#ff7a2a', cluster: '#5ad8ff', none: '#6a6a6a' }[d.fill];
    const h = Hh / 2, body = L * .68, nose = L * .32;
    g.save(); g.translate(x, y);
    // casing body
    g.fillStyle = casC; g.beginPath(); g.moveTo(0, -h * .92); g.lineTo(body, -h); g.lineTo(body, h); g.lineTo(0, h * .92); g.closePath(); g.fill();
    // nose
    g.fillStyle = d.nose === 'ap' ? '#5a5e6a' : casC; g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = Math.max(1.5, L * .006); g.beginPath();
    if (d.nose === 'round') { g.moveTo(body, -h); g.quadraticCurveTo(body + nose * 1.05, -h * .9, body + nose * .9, 0); g.quadraticCurveTo(body + nose * 1.05, h * .9, body, h); }
    else { g.moveTo(body, -h); g.quadraticCurveTo(body + nose * .6, -h * .8, body + nose, 0); g.quadraticCurveTo(body + nose * .6, h * .8, body, h); }
    g.closePath(); g.fill(); g.stroke();
    if (d.nose === 'ap') { g.fillStyle = '#ffd23f'; g.fillRect(body + nose * .25, -h * .7, 3, h * 1.4); }
    if (o.cut) {   // cut-away: fill, liner, fuse
      const t = Math.max(3, h * .12);
      g.fillStyle = fillC; g.beginPath(); g.moveTo(L * .1, -h + t); g.lineTo(body - (d.liner !== 'none' ? h * .9 : 2), -h + t); if (d.liner !== 'none') g.lineTo(body - h * .9 + h * .9, 0); g.lineTo(body - (d.liner !== 'none' ? h * .9 : 2), h - t); g.lineTo(L * .1, h - t); g.closePath(); g.fill();
      if (d.fill === 'frag') { g.fillStyle = '#5a5a5a'; for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(L * .12 + (k * 37 % 100) / 100 * (body - L * .18), -h + t * 1.6 + (k * 53 % 100) / 100 * (2 * h - t * 3.2), Math.max(1.5, h * .06), 0, TAU); g.fill(); } }
      if (d.fill === 'therm') { g.fillStyle = '#ffd23f'; for (let k = 0; k < 30; k++) g.fillRect(L * .12 + (k * 41 % 100) / 100 * (body - L * .2), -h + t * 1.5 + (k * 67 % 100) / 100 * (2 * h - t * 3), 3, 3); }
      if (d.fill === 'cluster') { g.fillStyle = '#1a3a4a'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(L * .16 + (k % 3) * (body - L * .3) / 2.4, (k < 3 ? -1 : 1) * h * .38, h * .26, 0, TAU); g.fill(); } }
      if (d.liner !== 'none') { g.fillStyle = d.liner === 'ta' ? '#9ab0c8' : '#d87a3a'; g.beginPath(); g.moveTo(body - h * .9, -h + t); g.lineTo(body - 2, 0); g.lineTo(body - h * .9, h - t); g.lineTo(body - h * .9 + t * 1.2, h - t); g.lineTo(body - 2 - t * 1.2, 0); g.lineTo(body - h * .9 + t * 1.2, -h + t); g.closePath(); g.fill(); }
      const fc = { impact: '#e8e8e8', short: '#5cf28a', long: '#5ad8ff', air: '#ff7ab8' }[d.fuse]; g.fillStyle = fc; g.fillRect(2, -h * .35, L * .07, h * .7); g.fillStyle = '#1a1420'; g.fillRect(2 + L * .02, -h * .12, L * .03, h * .24);
    }
    g.fillStyle = '#c87a3a'; g.fillRect(body * .12, -h * 1.02, Math.max(3, L * .04), h * 2.04); g.fillRect(body * .8, -h * 1.02, Math.max(2, L * .025), h * 2.04);
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = Math.max(1.5, L * .006); g.beginPath(); g.moveTo(0, -h * .92); g.lineTo(body, -h); g.lineTo(body, h); g.lineTo(0, h * .92); g.closePath(); g.stroke();
    g.restore();
  }
  function drawGun(g) { pix(g, (GUN.x - 10) * CS, (GUN.y - 18) * CS, 30 * CS, 20 * CS, CS, gunArt); }
  function gunArt(g) {
    const px = GUN.x * CS, py = GUN.y * CS, a = ang, rk = recoil * 10;
    g.save(); g.translate(px, py - 16);
    g.save(); g.rotate(-a); g.fillStyle = '#3a3f48'; g.fillRect(-14 - rk, -7, 52, 14); g.fillStyle = '#5a6270'; g.fillRect(-14 - rk, -7, 52, 4); g.fillStyle = '#2a2e34'; g.fillRect(34 - rk, -9, 8, 18); g.restore();
    g.fillStyle = '#5a4630'; g.beginPath(); g.moveTo(-26, 16); g.lineTo(-4, -6); g.lineTo(6, -6); g.lineTo(10, 16); g.closePath(); g.fill();
    g.fillStyle = '#2a2420'; g.beginPath(); g.arc(-2, 6, 12, 0, TAU); g.fill(); g.strokeStyle = '#8a7050'; g.lineWidth = 3; g.stroke(); for (let k = 0; k < 6; k++) { const b = k / 6 * TAU; g.beginPath(); g.moveTo(-2, 6); g.lineTo(-2 + Math.cos(b) * 11, 6 + Math.sin(b) * 11); g.stroke(); }
    g.restore();
  }
  function drawAim(g) {
    if (end || shells.length) return;
    const d = design(slot); let [vx, vy] = vel(d), [x, y] = muzzle(); const T = .55 + lv('range') * .45 + (aiming ? .15 : 0);
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (let s = 0, k = 0; s < T * 60; s++) { vy += G / 60; x += vx / 60; y += vy / 60; if (!inb(Math.floor(x), Math.floor(y)) && y > 0) break; if (y > 0 && mat[idx(Math.floor(x), Math.floor(y))]) break; if (s % 4 === 0) { g.globalAlpha = 1 - s / (T * 60); g.beginPath(); g.arc(x * CS, y * CS, 3.2, 0, TAU); g.fill(); } }
    g.globalAlpha = 1;
    const px = GUN.x * CS + 40, py = GUN.y * CS - 90; rr(g, px - 4, py, 120, 14, 7, 'rgba(0,0,0,.5)'); rr(g, px - 4, py, 120 * pow, 14, 7, pow > .85 ? '#ff7a2a' : '#ffd23f'); tx(g, `${Math.round(ang * 180 / Math.PI)}°  ${Math.round(pow * 100)}%`, px + 56, py - 14, D(16), '#fff', 'center', 4);
  }
  function drawShells(g) {
    for (const s of shells) {
      s.trail.forEach(([x, y], i) => { g.fillStyle = `rgba(255,226,170,${(i / s.trail.length * .55).toFixed(2)})`; g.fillRect(Math.floor(x) * CS, Math.floor(y) * CS, CS, CS); });
      const gx = Math.floor(s.x), gy = Math.floor(s.y);
      if (s.small) { g.fillStyle = '#1a3a4a'; g.fillRect((gx - 1) * CS, (gy - 1) * CS, CS * 2, CS * 2); g.fillStyle = '#5ad8ff'; g.fillRect((gx - 1) * CS, (gy - 1) * CS, CS, CS); continue; }
      const a = Math.atan2(s.vy, s.vx); const w = cl(s.E / (s.E0 || 1), .45, 1); const fine = cam.z > 2.1, ps = fine ? 1.6 : CS, ox = fine ? s.x * CS : (gx + .5) * CS, oy = fine ? s.y * CS : (gy + .5) * CS;
      if (fine) { drawXray(g, s, ox, oy, a); continue; }
      pix(g, Math.floor((ox - 32) / ps) * ps, Math.floor((oy - 32) / ps) * ps, 64, 64, ps, c => { c.translate(ox, oy); c.rotate(a);
        if (s.jk == null) { shellIcon(c, s.d, -20 * w, 0, 40 * w, 14); return; }
        const rodC = { steel: '#9aa6b4', alu: '#d0d6de', tung: '#50545e' }[s.d.casing], L = 40 * w, tail = -20;
        c.fillStyle = rodC; c.beginPath(); c.moveTo(tail, -3); c.lineTo(tail + L - 6, -3); c.lineTo(tail + L, 0); c.lineTo(tail + L - 6, 3); c.lineTo(tail, 3); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(tail, -3, L - 6, 1.5);
        if (s.jk > 0) { const jl = (L - 4) * (.25 + .75 * s.jk), jh = 7 * (.55 + .45 * s.jk); c.fillStyle = '#c8682e'; c.fillRect(tail, -jh, jl, jh * 2); c.fillStyle = '#e8904a'; c.fillRect(tail, -jh, jl, 2); c.fillStyle = '#ffb060'; c.fillRect(tail + jl - 3, -jh, 3, jh * 2); c.fillStyle = '#ffe0a0'; c.fillRect(tail + jl - 1.5, -jh + 1, 1.5, jh * 2 - 2); }
        c.fillStyle = '#8a4a20'; c.fillRect(tail, -7, 3, 14); });
      if (s.pen > 0) { const hx = ox + Math.cos(a) * 20 * w, hy = oy + Math.sin(a) * 20 * w, gr = g.createRadialGradient(hx, hy, 0, hx, hy, 14); gr.addColorStop(0, 'rgba(255,240,200,.9)'); gr.addColorStop(.4, 'rgba(255,140,40,.5)'); gr.addColorStop(1, 'rgba(255,60,0,0)'); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(hx - 14, hy - 14, 28, 28); g.restore(); }
    }
  }
  // the impact cam sees through the shell: a translucent copper jacket around the hard rod, stripping away in real time
  function drawXray(g, s, ox, oy, a, sc = 1.3) {
    const jk = s.jk == null ? 1 : s.jk, rodC = { steel: [154, 166, 180], alu: [208, 214, 222], tung: [92, 98, 110] }[s.d.casing], wear = cl(s.E / (s.E0 || 1), .55, 1);
    const L = 46, tail = -24, tip = tail + L * (.8 + .2 * wear), rh = 3.6, hot = s.pen > 0 ? cl(s.pen / 10, .25, 1) : 0;
    g.save(); g.translate(ox, oy); g.rotate(a); g.scale(sc, sc);
    // the rod, heating from the tip back
    const gr = g.createLinearGradient(tip, 0, tail, 0); gr.addColorStop(0, hot ? 'rgb(255,250,225)' : `rgb(${rodC})`); gr.addColorStop(.12 + .2 * hot, hot ? 'rgb(255,170,60)' : `rgb(${rodC})`); gr.addColorStop(.25 + .35 * hot, hot ? 'rgb(190,70,40)' : `rgb(${rodC})`); gr.addColorStop(.6 + .3 * hot, `rgb(${rodC})`); gr.addColorStop(1, `rgb(${rodC.map(v => v * .7 | 0)})`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(tail, -rh); g.lineTo(tip - 7, -rh); g.lineTo(tip, 0); g.lineTo(tip - 7, rh); g.lineTo(tail, rh); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(tail + 2, -rh + .6, tip - tail - 10, 1);
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = .8; g.stroke();
    // fins / tail fuse
    g.fillStyle = '#3a3a44'; g.beginPath(); g.moveTo(tail, -rh); g.lineTo(tail - 4, -rh - 4); g.lineTo(tail + 5, -rh); g.moveTo(tail, rh); g.lineTo(tail - 4, rh + 4); g.lineTo(tail + 5, rh); g.fill();
    // the copper jacket: see-through, shrinking back from the nose and thinning as it melts
    if (jk > 0) {
      const front = tail + (L - 6) * (.18 + .82 * jk), jh = rh + 1.2 + 4.2 * jk;
      g.fillStyle = `rgba(216,122,58,${(.28 + .12 * jk).toFixed(2)})`; g.beginPath(); g.moveTo(tail, -jh); g.lineTo(front, -jh); g.lineTo(front, jh); g.lineTo(tail, jh); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(240,150,80,.95)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(tail, -jh); g.lineTo(front, -jh); g.moveTo(tail, jh); g.lineTo(front, jh); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = .6; for (let x = tail + 4; x < front - 2; x += 5) { g.beginPath(); g.moveTo(x, -jh); g.lineTo(x + 3, -jh + 2); g.stroke(); }
      if (s.pen > 0) {   // the molten lip where the jacket is melting
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let y = -jh; y <= jh; y += 1.2) { const j = Math.sin(y * 3.1 + t * 40) * 1.4 + (R() - .5) * 1.2; g.fillStyle = `rgba(255,${(170 + R() * 80) | 0},${(70 + R() * 60) | 0},.9)`; g.fillRect(front - 2 + j, y - .6, 2.4, 1.2); }
        const lg = g.createRadialGradient(front, 0, 0, front, 0, jh * 1.8); lg.addColorStop(0, 'rgba(255,220,140,.55)'); lg.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = lg; g.fillRect(front - jh * 2, -jh * 2, jh * 4, jh * 4); g.restore();
      }
      g.fillStyle = '#b8642c'; g.fillRect(tail + 2, -jh - .6, 3, jh * 2 + 1.2);   // driving band
    }
    if (s.pen > 0) { g.save(); g.globalCompositeOperation = 'lighter'; const tg = g.createRadialGradient(tip, 0, 0, tip, 0, 12); tg.addColorStop(0, 'rgba(255,250,230,.95)'); tg.addColorStop(.35, 'rgba(255,170,60,.55)'); tg.addColorStop(1, 'rgba(255,80,0,0)'); g.fillStyle = tg; g.fillRect(tip - 12, -12, 24, 24); g.restore(); }
    g.restore();
  }
  function hud(g) {
    const L = LEVELS[lvl]; rr(g, 70, 14, 1140, 56, 16, 'rgba(10,8,16,.62)');
    tx(g, `${lvl + 1}. ${L.n}`, 94, 42, D(22), '#ffd890', 'left');
    const k = coreN ? coreLeft / coreN : 0; tx(g, 'CORE', 470, 42, D(16), '#ff7a9a', 'right'); rr(g, 480, 32, 260, 20, 10, 'rgba(255,255,255,.12)'); rr(g, 480, 32, Math.max(0, 260 * k), 20, 10, k > .5 ? '#ff3050' : k > .25 ? '#ff7a2a' : '#ffd23f'); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(480 + 26, 28); g.lineTo(480 + 26, 56); g.stroke(); tx(g, Math.round(k * 100) + '%', 610, 42, D(14), '#fff', 'center', 3);
    tx(g, 'SHELLS', 800, 42, D(16), '#cfc6d8', 'left'); for (let i = 0; i < shots; i++) pix(g, 878 + i * 30, 26, 24, 34, 2, c => { c.translate(890 + i * 30, 42); c.rotate(-Math.PI / 2); shellIcon(c, design(slot), -13, 0, 26, 10); });
    tx(g, `par ${L.par}`, 1190, 42, F(15), '#cfc6d8', 'right');
    // shell slots
    for (let i = 0; i < 3; i++) {
      const d = design(i), x = 30 + i * 230, y = 648, on = i === slot; btn['slot' + i] = { x, y, w: 216, h: 60 };
      rr(g, x, y, 216, 60, 14, on ? 'rgba(255,122,42,.85)' : 'rgba(10,8,16,.7)', on ? '#ffd23f' : 'rgba(255,255,255,.2)', 2);
      pixIcon(g, d, x + 12, y + 30, 72, 24, { cut: true }, 3);
      tx(g, `${i + 1}  ${part('fill', d.fill).n.split(' ')[0]}`, x + 94, y + 21, D(15), on ? '#1a1420' : '#fff', 'left');
      tx(g, `${part('nose', d.nose).n} · ${part('fuse', d.fuse).n}${d.liner !== 'none' ? ' · jet' : ''}`, x + 94, y + 42, F(11), on ? '#1a1420' : '#cfc6d8', 'left');
    }
    if (!end && shots > 0) button(g, 'fire', 1090, 640, 160, 66, 'FIRE', '#ff7a2a', 'Space');
    button(g, 'retry', 940, 650, 130, 50, 'RESTART', 'rgba(255,255,255,.18)', 'R', '#fff');
    button(g, 'quit', 1222, 82, 46, 40, '✕', 'rgba(255,255,255,.18)', null, '#fff');
    if (end === 'win') { tx(g, 'CORE DESTROYED', 640, 300, D(64), '#5cf28a', 'center', 8); }
    if (end === 'lose') { tx(g, 'OUT OF SHELLS', 640, 300, D(56), '#ff8a8a', 'center', 8); }
  }
  function drawMap(g) {
    sky(g); g.fillStyle = 'rgba(10,8,16,.45)'; g.fillRect(K.view.x0, K.view.y0, K.view.x1 - K.view.x0, K.view.y1 - K.view.y0);
    tx(g, 'SHELLSMITH', 640, 62, D(54), '#ff7a2a', 'center', 8); tx(g, 'Pick a target. Design your shells in the Workshop.', 640, 106, F(17), '#ffe6c8');
    tx(g, `◉ ${coins.toLocaleString('en-US')}`, 1240, 40, D(26), '#ffd23f', 'right', 5);
    LEVELS.forEach((L, i) => {
      const cx = 42 + (i % 6) * 202, cy = 130 + Math.floor(i / 6) * 118, ok = unlocked(i), st = stars[i] || 0, on = i === sel;
      btn['lvl' + i] = { x: cx, y: cy, w: 192, h: 108 };
      rr(g, cx, cy, 192, 108, 14, ok ? 'rgba(30,22,40,.88)' : 'rgba(30,22,40,.55)', on ? '#ffd23f' : ok ? 'rgba(255,122,42,.6)' : 'rgba(255,255,255,.1)', on ? 4 : 2);
      tx(g, `${i + 1}`, cx + 20, cy + 24, D(20), ok ? '#ff7a2a' : '#6a6070'); tx(g, L.n, cx + 38, cy + 24, D(L.n.length > 13 ? 13 : 15), ok ? '#fff' : '#8a8090', 'left');
      if (!ok) tx(g, '🔒', cx + 96, cy + 62, '24px sans-serif', '#fff');
      tx(g, '★'.repeat(st) + '☆'.repeat(3 - st), cx + 14, cy + 84, D(20), st ? '#ffd23f' : '#5a5060', 'left');
      tx(g, `◉ ${L.reward}`, cx + 180, cy + 84, D(14), '#ffd23f', 'right');
      if (on && ok) tx(g, L.hint, 640, 604, F(15), '#ffe6c8');
    });
    button(g, 'shop', 380, 626, 300, 70, 'WORKSHOP', '#ff7a2a', 'Design and upgrade your shells (W)');
    button(g, 'cash', 700, 626, 200, 70, 'CASH OUT', 'rgba(255,255,255,.18)', `${total.toLocaleString('en-US')} coins earned`, '#fff');
  }
  function bar(g, x, y, w, label, v, c) { tx(g, label, x, y + 7, F(13), '#cfc6d8', 'left'); rr(g, x + 100, y, w - 100, 14, 7, 'rgba(255,255,255,.1)'); rr(g, x + 100, y, Math.max(6, (w - 100) * cl(v, 0, 1)), 14, 7, c); }
  function drawShop(g) {
    const v = K.view; g.fillStyle = '#1e1824'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.strokeStyle = 'rgba(90,216,255,.06)'; g.lineWidth = 1; for (let x = 0; x < 1280; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 720); g.stroke(); } for (let y = 0; y < 720; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(1280, y); g.stroke(); }
    tx(g, 'WORKSHOP', 80, 40, D(34), '#ff7a2a', 'left', 6); tx(g, `◉ ${coins.toLocaleString('en-US')}`, 1240, 40, D(26), '#ffd23f', 'right', 5);
    for (let i = 0; i < 3; i++) { btn['ws' + i] = { x: 420 + i * 150, y: 18, w: 136, h: 44 }; rr(g, 420 + i * 150, 18, 136, 44, 12, i === wsSlot ? '#ff7a2a' : 'rgba(255,255,255,.1)'); tx(g, `SHELL ${i + 1}`, 488 + i * 150, 41, D(17), i === wsSlot ? '#1a1420' : '#fff'); }
    // the big cut-away blueprint
    const d = slots[wsSlot], S = stats(d), X = 250, Y = 175, Lh = 660;
    rr(g, 60, 78, 1160, 196, 18, 'rgba(90,216,255,.05)', 'rgba(90,216,255,.25)', 2);
    pixIcon(g, d, X, Y, Lh, 118, { cut: true }, 8);
    const lab = (s, ax, ay, lx, ly) => { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ax, ay); g.lineTo(lx, ly); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ax, ay, 3, 0, TAU); g.fill(); tx(g, s, lx + (lx < ax ? -6 : 6), ly, D(14), '#e8f4ff', lx < ax ? 'right' : 'left'); };
    lab('FUSE: ' + S.u.n, X + 14, Y, X - 30, Y + 70); lab('CASING: ' + S.c.n, X + 120, Y - 60, X + 60, Y - 88); lab('FILL: ' + S.f.n, X + 260, Y + 10, X + 300, Y + 84);
    if (d.liner !== 'none') lab('LINER: ' + S.l.n, X + Lh * .68 - 40, Y - 30, X + Lh * .68 - 10, Y - 88); lab('NOSE: ' + S.n.n, X + Lh * .85, Y - 20, X + Lh * .92, Y - 80);
    if (d.liner !== 'none' && !S.jetOk) tx(g, 'A liner needs a High explosive or Fragmentation fill to form a jet', 640, 262, F(14), '#ffb36a');
    // part pickers
    PK.forEach((cat, r) => {
      const y = 290 + r * 72; tx(g, PNAME[cat], 70, y + 26, D(15), '#ffd890', 'left');
      PARTS[cat].forEach((p, j) => {
        const x = 230 + j * 150, mine = owns(cat, p.k), on = d[cat] === p.k, k = 'p:' + cat + ':' + p.k; btn[k] = { x, y, w: 140, h: 56 };
        rr(g, x, y, 140, 56, 12, on ? 'rgba(255,122,42,.9)' : mine ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.35)', on ? '#ffd23f' : 'rgba(255,255,255,.18)', on ? 3 : 1.5);
        tx(g, p.n, x + 70, y + 20, D(p.n.length > 12 ? 12 : 14), on ? '#1a1420' : mine ? '#fff' : '#a898b0');
        tx(g, mine ? (on ? 'equipped' : 'owned') : `◉ ${p.cost}`, x + 70, y + 40, F(12), on ? '#1a1420' : mine ? '#9a90a8' : coins >= p.cost ? '#ffd23f' : '#8a6060');
      });
      const cur = part(cat, d[cat]); tx(g, cur.d, 230, y + 64, F(11, 600), 'rgba(207,198,216,.7)', 'left');
    });
    // stats and upgrades
    const px = 990; rr(g, px - 20, 286, 268, 172, 14, 'rgba(255,255,255,.05)');
    tx(g, 'THIS SHELL', px, 302, D(14), '#5ad8ff', 'left');
    bar(g, px, 318, 230, 'Penetration', S.mass * S.pen * S.spd * S.spd / 6, '#5ad8ff'); bar(g, px, 344, 230, 'Blast', S.f.blast * S.q * S.n.splash / 1.6, '#ffd23f'); bar(g, px, 370, 230, 'Heat', (S.f.heat || 0) * S.q / 1.6, '#ff7a2a'); bar(g, px, 396, 230, 'Jet', S.jet / 2.6, '#d87a3a'); bar(g, px, 422, 230, 'Range', S.spd / 1.4, '#5cf28a');
    tx(g, 'GUN & RANGE', px, 476, D(14), '#5ad8ff', 'left');
    UPG.forEach((u, i) => { const l = lv(u.k), y = 490 + i * 46, mx = l >= u.max, k = 'u:' + u.k; btn[k] = { x: px - 20, y, w: 268, h: 40 }; rr(g, px - 20, y, 268, 40, 10, mx ? 'rgba(92,242,138,.12)' : 'rgba(255,255,255,.07)', 'rgba(255,255,255,.15)', 1); tx(g, `${u.n} ${l}/${u.max}`, px - 8, y + 13, D(13), '#fff', 'left'); tx(g, mx ? 'maxed' : u.d(l), px - 8, y + 29, F(11), '#9a90a8', 'left'); tx(g, mx ? '✓' : `◉ ${u.cost(l)}`, px + 238, y + 20, D(14), mx ? '#5cf28a' : coins >= u.cost(l) ? '#ffd23f' : '#8a6060', 'right'); });
    button(g, 'back', 970, 674, 230, 40, 'TO THE RANGE →', '#5cf28a');
  }
  function drawResult(g) {
    drawPlay(g, true); g.fillStyle = 'rgba(10,8,16,.55)'; g.fillRect(K.view.x0, K.view.y0, K.view.x1 - K.view.x0, K.view.y1 - K.view.y0);
    const r = res; rr(g, 340, 150, 600, 400, 24, 'rgba(20,16,28,.94)', r.win ? '#5cf28a' : '#ff8a8a', 4);
    tx(g, r.win ? 'CORE DESTROYED' : 'THE CORE SURVIVED', 640, 214, D(44), r.win ? '#5cf28a' : '#ff8a8a', 'center', 6);
    if (r.win) { tx(g, '★'.repeat(r.st) + '☆'.repeat(3 - r.st), 640, 290, D(60), '#ffd23f'); tx(g, `${used} shell${used > 1 ? 's' : ''} (par ${LEVELS[lvl].par})`, 640, 348, F(18), '#cfc6d8'); tx(g, `+ ◉ ${r.got}${r.first ? '' : '  (replay)'}`, 640, 400, D(36), '#ffd23f'); }
    else { tx(g, LEVELS[lvl].hint, 640, 300, F(19), '#ffe6c8'); tx(g, 'Try a different shell in the Workshop.', 640, 340, F(17), '#cfc6d8'); }
    button(g, 'retry', 380, 460, 160, 64, 'RETRY', 'rgba(255,255,255,.18)', null, '#fff'); button(g, 'shop', 560, 460, 180, 64, 'WORKSHOP', '#ff7a2a');
    if (r.win && lvl < LEVELS.length - 1) button(g, 'next', 760, 460, 160, 64, 'NEXT →', '#5cf28a', 'Enter'); else button(g, 'map', 760, 460, 160, 64, 'TARGETS', '#5cf28a');
  }
  function drawPlay(g, still) {
    sky(g);
    const z = cam.z, k = cl((z - 1) / 2.4, 0, 1), F = [cam.x * CS, cam.y * CS], S = [lp(F[0], 640, k), lp(F[1], 340, k)];
    detailOn = z > 2.1 && !still; if (detailOn) { const wxp = sx => (sx - S[0]) / z + F[0], wyp = sy => (sy - S[1]) / z + F[1]; DW = { x0: Math.max(0, Math.floor(wxp(K.view.x0) / CS) - 1), x1: Math.min(GW - 1, Math.ceil(wxp(K.view.x1) / CS) + 1), y0: Math.max(0, Math.floor(wyp(K.view.y0) / CS) - 1), y1: Math.min(GH - 1, Math.ceil(wyp(K.view.y1) / CS) + 1) }; }
    g.save(); if (z > 1.001) { g.translate(S[0], S[1]); g.scale(z, z); g.translate(-F[0], -F[1]); if (cam.shk > 0) g.translate((R() - .5) * cam.shk, (R() - .5) * cam.shk); }
    drawWorld(g); drawGun(g); if (!still && z < 1.05) drawAim(g); drawShells(g); drawFx(g); g.restore();
    if (z > 1.05 && !still) {   // letterbox, a readout of the layers the shell has peeled
      const a = cl((z - 1) / 2, 0, 1), v = K.view; g.fillStyle = `rgba(0,0,0,${.85 * a})`; g.fillRect(v.x0, v.y0, v.x1 - v.x0, 70 * a - v.y0); g.fillRect(v.x0, 720 - 70 * a, v.x1 - v.x0, v.y1);
      g.globalAlpha = a; tx(g, 'IMPACT CAM', 60, 36, D(20), '#ff7a2a', 'left'); tx(g, 'tap to skip', 1220, 36, F2(13), '#9a90a8', 'right');
      if (cam.s) {   // X-ray inset: the shell, magnified and see-through
        const sh = cam.s, px = 868, py = 128, pw = 380, ph = 178, cx = px + pw / 2 - 6, cy = py + 92;
        g.save(); g.globalAlpha = a; rr(g, px, py, pw, ph, 14, 'rgba(8,10,18,.86)', 'rgba(90,216,255,.55)', 2);
        g.beginPath(); g.roundRect(px, py, pw, ph, 14); g.clip();
        g.strokeStyle = 'rgba(90,216,255,.08)'; g.lineWidth = 1; for (let x = px; x < px + pw; x += 16) { g.beginPath(); g.moveTo(x, py); g.lineTo(x, py + ph); g.stroke(); } for (let y = py; y < py + ph; y += 16) { g.beginPath(); g.moveTo(px, y); g.lineTo(px + pw, y); g.stroke(); }
        const tipX = cx + (-24 + 46 * (.8 + .2 * cl(sh.E / (sh.E0 || 1), .55, 1))) * 5;
        if (sh.pen > 0 && sh.live) {   // the wall it is biting into, and sparks off the tip
          g.fillStyle = 'rgba(120,130,145,.35)'; g.fillRect(tipX - 6, py, pw, ph); g.fillStyle = 'rgba(255,170,60,.25)'; g.fillRect(tipX - 6, cy - 26, 30, 52);
          g.save(); g.globalCompositeOperation = 'lighter'; for (let q = 0; q < 26; q++) { const aa = Math.PI + (R() - .5) * 2.4, l = 10 + R() * 60, h = R(); g.strokeStyle = `rgba(255,${(200 + h * 55) | 0},${(120 + h * 120) | 0},${(.4 + h * .6).toFixed(2)})`; g.lineWidth = .8 + h; g.beginPath(); g.moveTo(tipX - 4, cy + (R() - .5) * 14); g.lineTo(tipX - 4 + Math.cos(aa) * l, cy + (R() - .5) * 14 + Math.sin(aa) * l); g.stroke(); } g.restore();
        }
        drawXray(g, sh, cx, cy, 0, 5);
        if (sh.jk > 0 && sh.pen > 0) for (let q = 0; q < 5; q++) { const fx0 = cx + (-24 + 40 * (.18 + .82 * sh.jk)) * 5; g.fillStyle = `rgba(255,${(140 + R() * 90) | 0},60,.9)`; g.fillRect(fx0 - R() * 20, cy + 22 + R() * 40, 3, 3 + R() * 4); }
        g.restore(); g.save(); g.globalAlpha = a;
        tx(g, 'X-RAY', px + 14, py + 18, D(14), '#5ad8ff', 'left');
        const jk = sh.jk == null ? 1 : sh.jk, rod = { steel: 'STEEL CORE', alu: 'ALLOY CORE', tung: 'TUNGSTEN ROD' }[sh.d.casing];
        tx(g, jk > 0 ? `COPPER JACKET ${Math.round(jk * 100)}%` : 'JACKET GONE', px + 14, py + ph - 34, D(13), jk > 0 ? '#e8904a' : '#ff8a6a', 'left');
        rr(g, px + 14, py + ph - 22, 150, 8, 4, 'rgba(255,255,255,.12)'); rr(g, px + 14, py + ph - 22, Math.max(0, 150 * jk), 8, 4, '#d87a3a');
        tx(g, rod + (sh.pen > 0 ? (jk > 0 ? ' · behind the jacket' : ' · piercing') : ''), px + pw - 14, py + ph - 26, D(12), jk > 0 ? '#b8c4d4' : '#fff', 'right');
        g.restore();
      }
      if (cam.noteT > 0 && cam.note) { g.globalAlpha = a * Math.min(1, cam.noteT); rr(g, 340, 84, 600, 34, 12, 'rgba(200,104,46,.92)'); tx(g, cam.note, 640, 101, D(15), '#fff'); g.globalAlpha = a; }
      const sh = cam.s; if (sh) { tx(g, `${sh.pen} px pierced`, 60, 688, D(16), '#fff', 'left'); rr(g, 260, 680, 200, 14, 7, 'rgba(255,255,255,.12)'); rr(g, 260, 680, 200 * cl(sh.E / sh.E0, 0, 1), 14, 7, '#5ad8ff'); tx(g, 'energy', 470, 688, F2(12), '#9a90a8', 'left'); }
      cam.layers.forEach((m, i) => { const x = 700 + i * 92, c = M[m].c; rr(g, x, 676, 84, 26, 8, `rgb(${c[0]},${c[1]},${c[2]})`, '#fff', i === cam.layers.length - 1 ? 2 : 0); tx(g, M[m].n.toUpperCase(), x + 42, 690, D(11), m === CORE || m === STEEL || m === LEAD || m === SLAG ? '#fff' : '#1a1420'); if (i) tx(g, '›', x - 4, 689, D(16), '#fff'); });
      g.globalAlpha = 1;
    }
    if (!still && z < 1.6) hud(g);
  }
  const F2 = (px) => `800 ${px}px Nunito, sans-serif`;
  GAME.draw = g => {
    for (const k in btn) delete btn[k];
    if (mode === 'map') drawMap(g); else if (mode === 'shop') drawShop(g); else if (mode === 'result') drawResult(g); else drawPlay(g);
    if (mode === 'play' && cam.z > 1.1) msgs = msgs.filter(m => m.t > 99);
    msgs.forEach((m, i) => { g.globalAlpha = Math.min(1, (3 - m.t) * 2); rr(g, 340, 90 + i * 40, 600, 34, 12, 'rgba(10,8,16,.75)'); tx(g, m.s, 640, 107 + i * 40, D(17), m.c); g.globalAlpha = 1; });
  };
  GAME.pose = () => { startLevel(16); };
  GAME.test = {
    st: () => ({ mode, lvl, shots, used, end, coreN, coreLeft, coins, stars: { ...stars }, shells: shells.length, bodies: bodies.length, parts: parts.length, slot, ang, pow, slots }),
    start: n => startLevel(n), press, fire: (a, p, s = slot) => { ang = a; pow = p; slot = s; fire(); }, solve: s => solve(design(s ?? slot)),
    setCoins: v => { coins = v; save(); }, design: (i, d) => { slots[i] = { ...slots[i], ...d }; for (const c of PK) own[c + ':' + slots[i][c]] = true; }, upg: (k, l) => { up[k] = l; },
    loose: () => { support(); const r = bodies.map(b => [b.x, b.y, b.w, b.h, b.n, M[b.cells[0].m].n]); bodies.length = 0; return r; },
    count: m => { let n = 0; for (let i = 0; i < N; i++) if (mat[i] === m) n++; return n; },
  };
})();
