/* Shellsmith: a pixel-physics artillery range in a night-time steel yard. Every structure is made of real pixels (steel,
   brick, concrete, wood, glass, stone, lead). A shell buries its nose in what it hits, the metal around it heats up
   block by block until it glows white and crumbles, the charge goes off, and whatever is cut loose falls and tumbles.
   Somewhere in each yard sits a glowing core: break or melt it before you run out of shells. Between shots you design
   your own ammunition in the workshop (casing, nose, explosive fill, shaped-charge liner and fuse). */
const GAME = {
  id: 'shellsmith', title: 'Shellsmith', tagline: 'Design the shell. Melt the core.',
  font: 'Russo One', accent: '#ff8a1e', accent2: '#4fe0c8', bg: '#0b1422', noHud: true, noSkins: true, scoreLabel: 'Coins earned',
  how: [
    'Drag from anywhere to aim (direction and distance set the angle and power), let go to fire. Keyboard: arrows aim, Space fires, 1 2 3 pick a shell.',
    'The camera rides along with the shell. It buries its nose in whatever it hits, the metal around it glows and crumbles, then the charge goes off. Skip jumps to the impact, Finish jumps to the end.',
    'Each yard hides a glowing core. Break or melt 90% of it to clear the level. Fewer shells means more stars and coins.',
    'Heat travels through steel: keep hitting the same spot and it softens, glows white and falls away. In the Workshop, a heavy casing and a hard nose reach deeper, delay fuses go off inside, thermite cooks, a liner fires a jet.',
  ],
  skins: [{ name: 'Range', price: 0 }],
};
(() => {
  'use strict';
  const TAU = Math.PI * 2, cl = (v, a, b) => v < a ? a : v > b ? b : v, lp = (a, b, k) => a + (b - a) * k, R = Math.random, rint = (a, b) => Math.floor(a + R() * (b - a + 1)), pick = a => a[Math.floor(R() * a.length)];
  /* ---------- the pixel world ---------- */
  const CS = 4, GW = 400, GH = 200, N = GW * GH, G = 55, WW = GW * CS, WH = GH * CS;
  const mat = new Uint8Array(N), hp = new Float32Array(N), heat = new Float32Array(N), col = new Uint32Array(N), stamp = new Uint32Array(N);
  const E = 0, BED = 1, DIRT = 2, BRICK = 3, CONC = 4, STEEL = 5, WOOD = 6, GLASS = 7, CORE = 8, RUB = 9, SLAG = 11, STONE = 13, LEAD = 14;
  const rgb = (r, g, b, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  const unpack = c => [c & 255, (c >> 8) & 255, (c >> 16) & 255];
  const M = [];
  for (let k = 0; k < 16; k++) M[k] = { n: 'air', c: [0, 0, 0], hp: 1, melt: 900, brit: 0, cond: 0 };
  M[BED] = { n: 'bedrock', c: [18, 26, 36], hp: 1e9, melt: 1e9, brit: 0, cond: .04 };
  M[DIRT] = { n: 'ground', c: [26, 38, 52], hp: 11, melt: 1300, brit: .3, cond: .08 };
  M[BRICK] = { n: 'brick', c: [204, 120, 86], hp: 4, melt: 760, brit: .55, cond: .22 };
  M[CONC] = { n: 'concrete', c: [150, 160, 174], hp: 7, melt: 860, brit: .45, cond: .25 };
  M[STEEL] = { n: 'steel', c: [128, 146, 178], hp: 18, melt: 520, brit: .04, cond: .9 };
  M[WOOD] = { n: 'wood', c: [172, 126, 78], hp: 2, melt: 270, brit: .25, cond: .08, burns: 1 };
  M[GLASS] = { n: 'glass', c: [112, 214, 206], hp: .5, melt: 420, brit: 1, cond: .3, a: 215 };
  M[CORE] = { n: 'core', c: [255, 58, 112], hp: 6, melt: 430, brit: .2, cond: .5 };
  M[RUB] = { n: 'rubble', c: [96, 106, 122], hp: 1.5, melt: 900, brit: 1, cond: .1, loose: 1 };
  M[SLAG] = { n: 'slag', c: [58, 62, 74], hp: 5, melt: 900, brit: .3, cond: .3 };
  M[STONE] = { n: 'stone', c: [112, 120, 142], hp: 9, melt: 950, brit: .4, cond: .2 };
  M[LEAD] = { n: 'lead', c: [84, 92, 126], hp: 34, melt: 700, brit: .02, cond: .6 };
  const isStatic = m => m !== 0 && !M[m].loose;
  const hsh = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function tone(m, x, y, k = 1) {   // flat colours with a whisper of texture
    const b = M[m].c; let v = 1 + (hsh(x, y) - .5) * .035;
    if (m === BRICK) { const row = Math.floor(y / 4), mortar = y % 4 === 3 || (x + (row % 2) * 3) % 7 === 6; if (mortar) v *= .8; else v *= 1 + ((x * 7 + row * 13) % 5 - 2) * .02; }
    if (m === WOOD) { if (y % 3 === 0) v *= .93; if ((x * 31 + y * 7) % 29 === 0) v *= .85; }
    if (m === STONE) { const o = (Math.floor(y / 6) % 2) * 5; if (y % 6 === 5 || (x + o) % 10 === 9) v *= .84; }
    if (m === CONC) { if (y % 10 === 9) v *= .94; }
    if (m === LEAD) { if ((x + y) % 9 === 0) v *= .92; }
    if (m === GLASS) { if ((x + y) % 7 < 2) v *= 1.1; }
    if (m === CORE) v *= 1 + (R() - .5) * .16;
    v *= k; return rgb(cl(b[0] * v, 0, 255) | 0, cl(b[1] * v, 0, 255) | 0, cl(b[2] * v, 0, 255) | 0, M[m].a || 255);
  }
  const idx = (x, y) => y * GW + x, inb = (x, y) => x >= 0 && x < GW && y >= 0 && y < GH;
  function set(x, y, m, c) { x = Math.round(x); y = Math.round(y); if (!inb(x, y)) return; const i = idx(x, y); mat[i] = m; hp[i] = m ? M[m].hp : 0; heat[i] = 0; col[i] = m ? (c ?? tone(m, x, y)) : 0; }
  let dirty = true, coreN = 1, coreLeft = 1, frame = 0, t = 0;
  /* ---------- particles and effects ---------- */
  const parts = [], fx = [], shells = [], bodies = [], blasts = [], hots = [];
  const MAXP = 3600;
  // k: 0 chip, 1 white-hot drop, 2 glass, 3 core
  function debris(x, y, vx, vy, c, k = 0, h = 0) { if (parts.length >= MAXP) return false; parts.push({ x, y, vx, vy, c, k, h, t: 0, b: 0 }); return true; }
  function clump(x, y, vx, vy, n, h = 950) { for (let q = 0; q < n; q++) debris(x + (R() - .5) * 1.8, y + (R() - .5) * 1.8, vx + (R() - .5) * 4, vy + (R() - .5) * 4, 0, 1, h + R() * 200); }
  function smoke(x, y, n, sz = 1) { for (let i = 0; i < n && fx.length < 900; i++) fx.push({ k: 's', x: x + (R() - .5) * 6 * sz, y: y + (R() - .5) * 4 * sz, vx: (R() - .5) * 8, vy: -4 - R() * 8, r: (3 + R() * 4) * sz, t: 0, l: 1.4 + R() * 1.4 }); }
  function sparks(x, y, n, ang = 0, spread = TAU, sp = 90) { for (let i = 0; i < n && fx.length < 1500; i++) { const a = ang + (R() - .5) * spread, v = sp * (.3 + R() * .9); fx.push({ k: 'k', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, l: .35 + R() * .8, w: .5 + R() * .6, st: R() < .3 }); } }
  function arcs(x, y, n, len = 22, c = '86,214,226') { for (let i = 0; i < n && fx.length < 1500; i++) { const a = R() * TAU, d = 2 + R() * len * .5, p = [[x + Math.cos(a) * d, y + Math.sin(a) * d]]; let b = a + (R() - .5) * 1.6; for (let s = 0; s < 2 + rint(0, 1); s++) { const q = p[p.length - 1], l = len * (.3 + R() * .5); p.push([q[0] + Math.cos(b) * l, q[1] + Math.sin(b) * l]); b += (R() - .5) * 2.2; } fx.push({ k: 'a', p, t: 0, l: .35 + R() * .7, c }); } }
  function glow(x, y, r, l, vx = 0, vy = 0) { if (fx.length < 1500) fx.push({ k: 'g', x, y, r, vx, vy, t: 0, l }); }
  function flash(x, y, r, l = .3) { fx.push({ k: 'x', x, y, r, t: 0, l }); }
  function cone(x, y, a, len, l = .45) { fx.push({ k: 'v', x, y, a, r: len, t: 0, l }); }
  function embers(x, y, n, sp = 30) { for (let i = 0; i < n && fx.length < 1500; i++) { const a = R() * TAU, v = sp * (.2 + R()); fx.push({ k: 'e', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * .3, t: 0, l: 1.2 + R() * 2.2, r: .8 + R() * 1.1 }); } }
  function destroy(i, vx, vy, hot = 0) {
    const m = mat[i]; if (!m || m === BED) return;
    const x = i % GW, y = (i / GW) | 0, c = col[i];
    mat[i] = E; hp[i] = 0; heat[i] = 0; col[i] = 0; dirty = true;
    if (m === WOOD && R() < .25 && fx.length < 1200) fx.push({ k: 'f', x: x + .5, y: y + .5, vx: vx * .05, vy: -6, t: 0, l: .6 + R() * .6 });
    if (m === GLASS) { if (R() < .6) debris(x + .5, y + .5, vx + (R() - .5) * 30, vy + (R() - .5) * 30, c, 2); return; }
    if (m === CORE) { debris(x + .5, y + .5, vx, vy, rgb(255, 120, 150), 3, 700); return; }
    if (hot > 0 && !M[m].burns) { if (R() < .6) debris(x + .5, y + .5, vx, vy, 0, 1, hot); return; }
    debris(x + .5, y + .5, vx, vy, c, 0);
  }
  const soft = i => 1 - .45 * cl(heat[i] / M[mat[i]].melt, 0, 1);   // hot material is weaker
  function hurt(i, d) { const m = mat[i]; if (!m || m === BED) return false; hp[i] -= d / soft(i); if (hp[i] <= 0) return true; const [r, g, b] = unpack(col[i]), k = .93; col[i] = rgb(r * k | 0, g * k | 0, b * k | 0, M[m].a || 255); return false; }
  const warm = (i, h, cap = 2400) => { const m = mat[i]; if (m && m !== BED) heat[i] = Math.min(Math.max(heat[i], cap), heat[i] + h); };
  /* ---------- explosions ---------- */
  function blast(cx, cy, r, P, o = {}) {
    const H = o.heat ?? 420, hr = r * 2.3, maxT = o.maxT ?? 640;
    const x0 = Math.max(0, Math.floor(cx - hr)), x1 = Math.min(GW - 1, Math.ceil(cx + hr)), y0 = Math.max(0, Math.floor(cy - hr)), y1 = Math.min(GH - 1, Math.ceil(cy + hr)), list = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d <= hr && mat[idx(x, y)]) list.push([d, x, y]); }
    list.sort((a, b) => a[0] - b[0]);
    for (const [d, x, y] of list) {
      const i = idx(x, y), m = mat[i]; if (!m || m === BED) continue;
      // walls in between soak up the blast
      let block = 0; const steps = Math.floor(d); for (let s = 1; s < steps; s++) { const k = s / d, j = idx(Math.floor(cx + (x + .5 - cx) * k), Math.floor(cy + (y + .5 - cy) * k)); if (mat[j]) block += Math.min(hp[j], 40); if (block > P * 3) break; }
      if (d <= r) {
        const eff = P * Math.pow(1 - d / r, .75) * 2.1 - block * .55 * (1 - (o.thru || 0));
        if (eff > 0) {
          if (eff >= hp[i] * soft(i) || (m === GLASS && eff > .1)) { const a = Math.atan2(y + .5 - cy, x + .5 - cx), s = 16 + eff * 6 + R() * 22; destroy(i, Math.cos(a) * s, Math.sin(a) * s - 10, d < r * .6 ? 900 : 0); continue; }
          hurt(i, eff * .6);
        }
      }
      const hh = H * Math.pow(1 - d / hr, 1.5) * Math.max(.12, 1 - block / (P * 3 + 1));
      if (hh > 4) warm(i, hh, maxT);
    }
    blasts.push({ x: cx, y: cy, P, r, t: 0 });
    for (const b of bodies) { const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy); if (d < r * 3) { const k = P * 4 / Math.sqrt(b.n * .02 + 1); b.vx += dx / (d + 1) * k; b.vy += dy / (d + 1) * k * .8 - 4; b.w += (R() - .5) * k * .05; } }
    if (!o.quiet) {
      flash(cx, cy, r * 1.25, .34); const back = o.back ?? Math.PI;
      for (let q = 0; q < 3 + Math.min(3, r / 4 | 0); q++) { const a = back + (R() - .5) * 1.5, d = r * (.3 + R() * .7); glow(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * (.45 + R() * .5), 1.3 + R() * 1.6, Math.cos(a) * 3, Math.sin(a) * 3 - 2); }
      cone(cx, cy, back + (R() - .5) * .5, r * 4.5, .5);
      sparks(cx, cy, 26 + r * 3, 0, TAU, 60 + r * 9); arcs(cx, cy, 5 + (r / 3 | 0), r * 2.2); embers(cx, cy, 4 + (r / 3 | 0), 22 + r * 2);
      for (let q = 0; q < 3 + (r / 4 | 0); q++) { const a = back + (R() - .5) * 2.6, v = 26 + R() * 44; clump(cx, cy, Math.cos(a) * v, Math.sin(a) * v - 26, rint(7, 14)); }
    }
    K.shake(Math.min(11, 2 + r * .6)); K.noise(.4 + r * .02, Math.min(.45, .2 + r * .015), 200 + R() * 160); K.sfx(64, .34, 'sawtooth', .09, -28);
    slowT = Math.max(slowT, .85); dirty = true;
  }
  function jet(x, y, dx, dy, len, budget) {   // a shaped-charge jet: a narrow, very hot stream that drills straight on
    const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; const px = -dy, py = dx; let last = -1, gone = 0;
    for (let s = 0; s < len && budget > 0; s += .5) {
      const cx = x + dx * s, cy = y + dy * s, fx0 = Math.floor(cx), fy0 = Math.floor(cy); if (!inb(fx0, fy0)) break; const i = idx(fx0, fy0);
      if (i !== last) { last = i; const m = mat[i]; if (m && m !== BED) { const c = Math.pow(Math.min(hp[i], 60), .72) * .5; if (budget < c) { hurt(i, budget * 1.8); warm(i, 500, 900); break; } budget -= c; destroy(i, dx * 90, dy * 90, 900); gone++;
          for (const sd of [-1, 1, -2, 2]) { const jx = Math.floor(cx + px * sd), jy = Math.floor(cy + py * sd); if (!inb(jx, jy)) continue; const j = idx(jx, jy); if (mat[j] && mat[j] !== BED) { warm(j, Math.abs(sd) === 1 ? 420 : 240, 1000); if (Math.abs(sd) === 1 && R() < .5 && budget > 1) { budget -= .4; destroy(j, dx * 60 + px * sd * 20, dy * 60 + py * sd * 20, 900); } } } } }
      if (s % 4 < .5) sparks(cx, cy, 1, Math.atan2(-dy, -dx), 2.4, 60);
    }
    const reach = Math.min(len, 30 + gone); fx.push({ k: 'j', x, y, x2: x + dx * reach, y2: y + dy * reach, t: 0, l: .3 });
    K.sfx(1800, .25, 'sawtooth', .05, -1500); dirty = true;
  }
  function frag(x, y, n, budget, len) {
    for (let k = 0; k < n; k++) { const a = R() * TAU, dx = Math.cos(a), dy = Math.sin(a); let b = budget * (.6 + R() * .8); for (let s = 1; s < len && b > 0; s += .7) { const cx = Math.floor(x + dx * s), cy = Math.floor(y + dy * s); if (!inb(cx, cy)) break; const i = idx(cx, cy), m = mat[i]; if (m && m !== BED) { const h0 = hp[i] * soft(i); if (b >= h0) { b -= h0 * .8; destroy(i, dx * 60, dy * 60); } else { hurt(i, b); warm(i, 60, 500); b = 0; } } }
      if (fx.length < 1400) fx.push({ k: 'r', x, y, x2: x + dx * len * .6, y2: y + dy * len * .6, t: 0, l: .16 }); }
  }
  /* ---------- shells ---------- */
  const KP = .15;   // how much energy a pixel costs to push through
  const PARTS = {
    casing: [
      { k: 'steel', n: 'Steel', cost: 0, mass: 1, pen: 1, spd: 1, d: 'Balanced. Does a bit of everything.' },
      { k: 'alu', n: 'Aluminium', cost: 300, mass: .65, pen: .75, spd: 1.13, d: 'Light and fast: longer range, weaker punch.' },
      { k: 'ti', n: 'Titanium', cost: 1200, mass: .85, pen: 1.35, spd: 1.08, d: 'Light and tough: quick, and it still bites.' },
      { k: 'tung', n: 'Tungsten', cost: 2200, mass: 1.7, pen: 2, spd: .9, d: 'Dense and brutal. Slower, shorter range.' },
      { k: 'heavy', n: 'Heavy alloy', cost: 4200, mass: 2.1, pen: 2.3, spd: .84, hot: 1, d: 'The densest there is. It sharpens itself and burns as it goes in.' },
    ],
    nose: [
      { k: 'round', n: 'Round', cost: 0, pen: 1, splash: 1.15, d: 'Wide blast, shallow bite.' },
      { k: 'flat', n: 'Flat', cost: 500, pen: .7, splash: 1.4, thru: .55, d: 'Squashes against the wall: the blast carries through to the far side.' },
      { k: 'point', n: 'Pointed', cost: 200, pen: 1.6, splash: 1, d: 'Digs into brick and concrete.' },
      { k: 'ap', n: 'AP cap', cost: 1600, pen: 2.5, splash: .95, d: 'Hardened cap: goes through armour.' },
      { k: 'drill', n: 'Drill tip', cost: 3200, pen: 3.3, splash: .8, d: 'A fluted spike. Goes deepest of all, with the smallest blast.' },
    ],
    fill: [
      { k: 'he', n: 'High explosive', s: 'HE', cost: 0, blast: 1, jetOk: 1, d: 'A big blast. Great on brick and wood.' },
      { k: 'frag', n: 'Fragmentation', s: 'Frag', cost: 450, blast: .6, frag: 1, jetOk: 1, d: 'Smaller blast, hails shrapnel everywhere.' },
      { k: 'therm', n: 'Thermite', cost: 900, blast: .3, heat: 1, bheat: 1500, maxT: 1400, hotP: 1500, hotL: 4.8, hotR: 1.5, d: 'Burns white hot: the heat melts anything it sits on.' },
      { k: 'incend', n: 'Incendiary', cost: 1100, blast: .4, burn: 1, bheat: 600, maxT: 820, hotP: 850, hotL: 9, hotR: 1.4, d: 'Burning gel that sticks and keeps cooking for a long time.' },
      { k: 'cluster', n: 'Cluster', cost: 1500, blast: .35, cluster: 1, d: 'Splits into six bomblets on impact.' },
      { k: 'tandem', n: 'Tandem', cost: 2000, blast: .8, tandem: 1, jetOk: 1, d: 'A small charge clears the way, then the main one follows it in.' },
      { k: 'plasma', n: 'Plasma core', s: 'Plasma', cost: 5200, blast: 1.3, heat: 1, bheat: 1900, maxT: 1500, hotP: 1500, hotL: 3.4, hotR: 1.2, jetOk: 1, d: 'The biggest bang and the hottest. Nothing shrugs it off.' },
      { k: 'none', n: 'Inert slug', s: 'Inert', cost: 0, blast: 0, d: 'No explosive: pure kinetic punch.' },
    ],
    liner: [
      { k: 'none', n: 'No liner', cost: 0, jet: 0, d: 'Nothing in front of the charge.' },
      { k: 'cu', n: 'Copper cone', cost: 800, jet: 1, d: 'Shaped charge: a jet that drills through steel.' },
      { k: 'ta', n: 'Tantalum', cost: 2800, jet: 1.8, d: 'A tantalum cone: a longer, hotter jet.' },
      { k: 'tri', n: 'Triple cone', cost: 3600, jet: 1.05, fan: 3, d: 'Three jets in a fan.' },
    ],
    fuse: [
      { k: 'impact', n: 'Impact', cost: 0, delay: 5, d: 'Goes off as soon as the nose has dug in.' },
      { k: 'short', n: 'Short delay', cost: 250, delay: 13, d: 'Goes off a short way past the first thing it hits.' },
      { k: 'long', n: 'Long delay', cost: 700, delay: 30, d: 'Goes off deep inside, or in the room behind the wall.' },
      { k: 'stop', n: 'On stop', cost: 400, delay: 0, d: 'Digs in as far as it can go, and goes off when it stops.' },
      { k: 'air', n: 'Proximity', cost: 600, air: 1, d: 'Goes off just before it touches anything.' },
    ],
    cal: [
      { k: 'std', n: 'Standard', cost: 0, w: 5, mass: 1, spd: 1, pen: 1, blast: 1, d: 'The standard round.' },
      { k: 'sabot', n: 'Sabot dart', cost: 1300, w: 3, mass: .55, spd: 1.28, pen: 1.3, blast: .55, d: 'A thin, fast dart: flat shots that go deep, with a small charge.' },
      { k: 'heavy', n: 'Heavy', cost: 2600, w: 7, mass: 1.9, spd: .86, pen: 1, blast: 1.5, d: 'A fat, slow round with half as much charge again.' },
    ],
    paint: [
      { k: 'bare', n: 'Bare', cost: 0, tr: '255,170,90', d: 'No paint. Amber tracer.' },
      { k: 'olive', n: 'Olive', cost: 100, c: [112, 128, 88], tr: '170,230,110', d: 'Olive drab, with a green tracer.' },
      { k: 'desert', n: 'Desert', cost: 100, c: [204, 176, 124], tr: '255,214,130', d: 'Sand, with a pale gold tracer.' },
      { k: 'navy', n: 'Navy', cost: 150, c: [64, 92, 150], tr: '110,210,255', d: 'Navy blue, with a cyan tracer.' },
      { k: 'crimson', n: 'Crimson', cost: 150, c: [178, 62, 66], tr: '255,110,110', d: 'Deep red, with a red tracer.' },
      { k: 'hazard', n: 'Hazard', cost: 400, c: [236, 190, 50], stripe: 1, tr: '255,236,90', d: 'Yellow and black stripes, with a bright yellow tracer.' },
    ],
  };
  const PK = ['casing', 'nose', 'fill', 'liner', 'fuse', 'cal', 'paint'], PNAME = { casing: 'CASING', nose: 'NOSE', fill: 'FILL', liner: 'LINER', fuse: 'FUSE', cal: 'CALIBRE', paint: 'PAINT' };
  const part = (cat, k) => PARTS[cat].find(p => p.k === k) || PARTS[cat][0];
  const UPG = [
    { k: 'barrel', n: 'Longer barrel', max: 4, cost: l => [250, 650, 1400, 2800][l], d: l => `+${(l + 1) * 6}% muzzle speed` },
    { k: 'rack', n: 'Ammo rack', max: 3, cost: l => [500, 1500, 3500][l], d: l => `${8 + l + 1} shells per level` },
    { k: 'fillq', n: 'Better filler', max: 4, cost: l => [300, 800, 1800, 3600][l], d: l => `+${(l + 1) * 15}% blast, heat and jet` },
    { k: 'harden', n: 'Hardened bands', max: 4, cost: l => [400, 1000, 2200, 4400][l], d: l => `+${(l + 1) * 8}% penetration` },
    { k: 'range', n: 'Rangefinder', max: 3, cost: l => [200, 600, 1500][l], d: l => 'Longer aiming line' },
    { k: 'salvage', n: 'Salvage crew', max: 5, cost: l => [300, 700, 1500, 3000, 6000][l], d: l => `+${(l + 1) * 10}% coins from every yard` },
    { k: 'mull', n: 'Spotter', max: 1, cost: l => 900, d: l => 'One shell that hits nothing comes back' },
  ];
  function stats(d) {
    const c = part('casing', d.casing), n = part('nose', d.nose), f = part('fill', d.fill), l = part('liner', d.liner), u = part('fuse', d.fuse), cal = part('cal', d.cal), q = 1 + lv('fillq') * .15;
    return { c, n, f, l, u, cal, q, w: cal.w, mass: c.mass * cal.mass, pen: c.pen * n.pen * cal.pen * (1 + lv('harden') * .08), spd: c.spd * cal.spd * (1 + lv('barrel') * .06), bl: f.blast * cal.blast, jet: f.jetOk ? l.jet * q : 0, jetOk: !!f.jetOk };
  }
  /* ---------- levels ---------- */
  const LEVELS = [
    { n: 'A-Frame', hint: 'Lob one over the frame, onto the plank.', par: 2, reward: 150 },
    { n: 'Brick Stack', hint: 'High explosive tears brick apart.', par: 3, reward: 240 },
    { n: 'Timber Rig', hint: 'Wood splinters and chars. Blast it apart.', par: 3, reward: 300 },
    { n: 'Gantry', hint: 'The core hangs in a glass cage under the beam.', par: 3, reward: 360 },
    { n: 'Glass House', hint: 'Glass stops nothing. The brick hut inside does.', par: 4, reward: 420 },
    { n: 'Kiln', hint: 'A thick brick dome: a pointed nose and a delay fuse.', par: 4, reward: 500 },
    { n: 'Container Stack', hint: 'Steel boxes. Find the one with the glow.', par: 4, reward: 580 },
    { n: 'Blast Wall', hint: 'Do not go through the wall. Go over it.', par: 3, reward: 660 },
    { n: 'Signal Tower', hint: 'Tall and thin. The core is in the top room.', par: 3, reward: 740 },
    { n: 'Twin Rigs', hint: 'Two cores, two frames.', par: 6, reward: 820 },
    { n: 'Pipe Rack', hint: 'Concrete decks on steel legs.', par: 4, reward: 900 },
    { n: 'Stone Keep', hint: 'Stone walls, a keep on a hill.', par: 4, reward: 1000 },
    { n: 'Smelter', hint: 'Thick steel. Cook the same spot until it lets go.', par: 4, reward: 1100 },
    { n: 'Dry Dock', hint: 'The core sits in the pit, under a steel lid.', par: 4, reward: 1200 },
    { n: 'Vault', hint: 'Concrete outside, steel inside.', par: 5, reward: 1320 },
    { n: 'Pyramid', hint: 'Solid stone. The chamber is in the middle.', par: 4, reward: 1450 },
    { n: 'Reactor', hint: 'Concrete, then lead, then steel. Bring something sharp.', par: 5, reward: 1600 },
    { n: 'Dam', hint: 'A leaning wall of concrete. The core hides behind it.', par: 6, reward: 1750 },
    { n: 'High Rise', hint: 'Steel floors and glass, all the way up.', par: 4, reward: 1900 },
    { n: 'Fortress Line', hint: 'Walls in front, armour behind.', par: 5, reward: 2050 },
    { n: 'Deep Bunker', hint: 'Two slabs of concrete under the hill.', par: 5, reward: 2200 },
    { n: 'Lead Tomb', hint: 'Lead shrugs off blasts and heat. Jets, hard noses and thermite do not care.', par: 5, reward: 2400 },
    { n: 'The Foundry', hint: 'Three cores in a steel hall.', par: 7, reward: 2600 },
    { n: 'The Citadel', hint: 'Everything at once.', par: 6, reward: 3000 },
    { n: 'Crane Yard', hint: 'The core swings in a cage under the jib.', par: 3, reward: 3300 },
    { n: 'Twin Silos', hint: 'Two concrete silos, a core in each.', par: 5, reward: 3600 },
    { n: 'Truss Bridge', hint: 'The core hangs under the deck, between the piers.', par: 5, reward: 3900 },
    { n: 'Blast Furnace', hint: 'Stone outside, a steel hearth inside.', par: 4, reward: 4200 },
    { n: 'Cooling Tower', hint: 'It is open at the top. Drop one in.', par: 3, reward: 4500 },
    { n: 'Bunker Row', hint: 'Three small bunkers, each lined with lead.', par: 7, reward: 4800 },
    { n: 'Sky Vault', hint: 'A steel vault on stilts. Cut the legs, or crack the box.', par: 3, reward: 5100 },
    { n: 'Sub Pen', hint: 'A roof too thick to bother with. Try the door.', par: 4, reward: 5400 },
    { n: 'Layer Cake', hint: 'Wood, brick, lead, concrete, steel. Then the pit.', par: 7, reward: 5700 },
    { n: 'The Onion', hint: 'Five rings. Peel them.', par: 6, reward: 6000 },
    { n: 'Stronghold', hint: 'A bunker inside the hill. A flat shot fits down the tunnel.', par: 4, reward: 6500 },
    { n: 'The Monolith', hint: 'A solid block: stone, concrete, lead, steel.', par: 8, reward: 7000 },
  ];
  let GY = 176;
  const rect = (x, y, w, h, m) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, m); };
  const box = (x, y, w, h, th, m) => { rect(x, y, w, th, m); rect(x, y + h - th, w, th, m); rect(x, y, th, h, m); rect(x + w - th, y, th, h, m); };
  const disc = (cx, cy, r, m, r0 = -1) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d <= r && d > r0) set(x, y, m); } };
  const halfDisc = (cx, cy, r, m, r0 = -1) => { for (let y = Math.floor(cy - r); y < cy; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d <= r && d > r0) set(x, y, m); } };
  const roof = (x, y, w, m) => { for (let j = 0; j < w / 2; j++) for (let i = j; i < w - j; i++) set(x + i, y - j, m); };
  // a leaning beam, w pixels wide, from (xt,yt) at the top to (xb,yb) at the bottom
  const leg = (xt, yt, xb, yb, w, m) => { for (let y = yt; y < yb; y++) { const xc = lp(xt, xb, (y - yt) / (yb - yt)); for (let i = 0; i < w; i++) set(Math.round(xc - w / 2) + i, y, m); } };
  function core(cx, cy, r, stand = true) {   // the core, on a little steel stand that reaches down to whatever is below it
    disc(cx, cy, r, CORE);
    if (stand) for (let x = Math.round(cx - r * .5); x <= Math.round(cx + r * .5); x++) { let y = Math.floor(cy + r); while (y > 0 && mat[idx(x, y)] !== CORE) y--; for (let k = 1; k < 40; k++) { const yy = y + k; if (!inb(x, yy) || mat[idx(x, yy)]) break; set(x, yy, STEEL); } }
  }
  function ground(fn) { for (let x = 0; x < GW; x++) { const h = fn ? fn(x) : GY; for (let y = h; y < GH; y++) set(x, y, y >= GH - 4 ? BED : DIRT, y >= GH - 4 ? undefined : y === h ? rgb(60, 88, 108) : y === h + 1 ? rgb(38, 56, 74) : undefined); } }
  function aframe(x, g, h, w, o = {}) {   // a steel A: two leaning legs and a crossbar
    const sp = o.spread || h * .42; leg(x + 4, g - h, x - sp, g, w, STEEL); leg(x + 6, g - h * .84, x + sp, g, w - 3, STEEL); const cy = g - Math.round(h * .46); rect(x - Math.round(sp * .46), cy, Math.round(sp * .98), 8, STEEL); return cy;
  }
  function build(n) {
    mat.fill(0); hp.fill(0); heat.fill(0); col.fill(0); GY = 176; const g = GY;
    const B = [
      () => { ground(); aframe(262, g, 118, 16); rect(288, g - 90, 56, 4, WOOD); rect(334, g - 86, 12, 86, BRICK); rect(330, g - 89, 20, 3, WOOD); core(314, g - 96.5, 6); },
      () => { ground(); rect(232, g - 72, 14, 72, BRICK); rect(304, g - 72, 14, 72, BRICK); rect(224, g - 77, 102, 5, WOOD); rect(262, g - 9, 26, 9, BRICK); core(275, g - 15.5, 6); rect(268, g - 108, 14, 31, BRICK); rect(264, g - 111, 22, 3, WOOD); },
      () => { ground(); for (const x of [214, 262, 310]) rect(x, g - 96, 6, 96, WOOD); for (const y of [32, 64, 96]) rect(208, g - y - 4, 114, 4, WOOD); leg(262, g - 60, 222, g - 34, 3, WOOD); leg(268, g - 92, 308, g - 66, 3, WOOD); leg(308, g - 28, 270, g, 3, WOOD); core(290, g - 74.5, 6); rect(228, g - 46, 12, 10, WOOD); rect(232, g - 110, 16, 10, WOOD); },
      () => { ground(); rect(212, g - 124, 10, 124, STEEL); rect(332, g - 124, 10, 124, STEEL); rect(202, g - 134, 150, 10, STEEL); rect(206, g - 4, 22, 4, STEEL); rect(326, g - 4, 22, 4, STEEL); rect(271, g - 124, 3, 30, STEEL); rect(252, g - 94, 41, 3, STEEL); rect(252, g - 64, 41, 3, STEEL); rect(252, g - 91, 3, 27, GLASS); rect(290, g - 91, 3, 27, GLASS); core(272.5, g - 70.5, 6, false); leg(222, g - 60, 252, g - 124, 4, STEEL); },
      () => { ground(); rect(206, g - 84, 5, 84, STEEL); rect(346, g - 84, 5, 84, STEEL); rect(202, g - 89, 153, 5, STEEL); rect(211, g - 80, 3, 80, GLASS); rect(343, g - 80, 3, 80, GLASS); rect(276, g - 84, 4, 40, GLASS); for (let x = 214; x < 343; x += 26) rect(x, g - 92, 3, 3, STEEL); box(254, g - 44, 50, 44, 8, BRICK); core(279, g - 14.5, 6); rect(224, g - 14, 16, 14, WOOD); rect(316, g - 22, 14, 22, WOOD); },
      () => { ground(); halfDisc(278, g, 48, BRICK, 33); rect(268, g - 78, 20, 34, BRICK); rect(274, g - 78, 8, 30, E); rect(264, g - 10, 28, 10, BRICK); core(278, g - 17, 7); rect(216, g - 3, 12, 3, BRICK); rect(328, g - 3, 12, 3, BRICK); },
      () => { ground(); const bx = (x, y, c) => { box(x, y, 54, 26, 4, STEEL); if (c) core(x + 27, y + 26 - 4 - 6.5, 6); }; bx(206, g - 26); bx(262, g - 26); bx(318, g - 26); bx(234, g - 52); bx(290, g - 52, 1); bx(262, g - 78); },
      () => { ground(); rect(232, g - 86, 16, 86, CONC); rect(226, g - 8, 28, 8, CONC); rect(286, g - 34, 50, 6, STEEL); rect(290, g - 28, 6, 28, STEEL); rect(326, g - 28, 6, 28, STEEL); core(311, g - 40.5, 6.5); rect(352, g - 46, 12, 46, CONC); },
      () => { ground(); box(260, g - 150, 42, 150, 8, STONE); for (const y of [30, 60, 90, 118]) rect(268, g - y - 3, 26, 3, WOOD); rect(260, g - 138, 4, 14, GLASS); rect(298, g - 138, 4, 14, GLASS); core(281, g - 127.5, 6); rect(254, g - 154, 54, 4, STONE); roof(258, g - 155, 46, STONE); },
      () => { ground(); const c1 = aframe(238, g, 100, 14); core(240, c1 - 6.5, 6); const c2 = aframe(330, g, 134, 15, { spread: 40 }); core(332, c2 - 6.5, 6); rect(262, g - 60, 52, 4, WOOD); },
      () => { ground(); for (const x of [210, 262, 314, 358]) rect(x, g - 112, 8, 112, STEEL); for (const y of [28, 56, 84, 112]) rect(204, g - y - 6, 168, 6, CONC); disc(240, g - 45, 10, STEEL, 6); disc(292, g - 101, 10, STEEL, 6); disc(338, g - 17, 10, STEEL, 6); rect(326, g - 76, 22, 14, BRICK); core(288, g - 68.5, 6); },
      () => { ground(x => x > 196 ? Math.max(g - 28, Math.round(g - (x - 196) * .6)) : g); const b = g - 28; rect(248, b - 30, 10, 30, STONE); for (const x of [248, 254]) rect(x, b - 35, 4, 5, STONE); box(284, b - 78, 76, 78, 10, STONE); for (let x = 284; x < 360; x += 12) rect(x, b - 84, 7, 6, STONE); rect(294, b - 42, 56, 5, WOOD); core(322, b - 16.5, 6.5); rect(306, b - 60, 14, 18, WOOD); },
      () => { ground(); rect(238, g - 8, 92, 8, CONC); box(244, g - 70, 80, 62, 9, STEEL); rect(300, g - 104, 14, 36, STEEL); rect(304, g - 104, 6, 34, E); core(284, g - 22.5, 7.5); rect(254, g - 30, 12, 15, STEEL); rect(222, g - 26, 10, 26, BRICK); },
      () => { ground(x => x > 244 && x < 322 ? g + 16 : g); rect(238, g - 5, 90, 6, STEEL); rect(246, g + 1, 4, 15, STEEL); rect(316, g + 1, 4, 15, STEEL); core(283, g + 9.5, 6); rect(212, g - 46, 8, 46, STEEL); rect(204, g - 52, 60, 6, STEEL); rect(256, g - 46, 3, 22, STEEL); rect(250, g - 24, 15, 10, STEEL); },
      () => { ground(); box(236, g - 74, 96, 74, 10, CONC); box(250, g - 56, 68, 52, 7, STEEL); core(284, g - 21.5, 7); rect(246, g - 64, 76, 4, E); rect(232, g - 78, 104, 4, CONC); rect(346, g - 30, 10, 30, BRICK); },
      () => { ground(); for (let j = 0; j < 78; j++) rect(204 + j, g - 1 - j, Math.max(0, 156 - j * 2), 1, STONE); rect(266, g - 34, 34, 20, E); core(283, g - 21.5, 6.5); for (let j = 0; j < 26; j++) set(238 + j, g - 14 - Math.floor(j * .6), E); },
      () => { ground(); rect(222, g - 8, 124, 8, CONC); const cx = 284, cy = g - 48; disc(cx, cy, 40, CONC, 31); disc(cx, cy, 31, LEAD, 24); disc(cx, cy, 24, STEEL, 18); core(cx, cy + 6, 8.5); rect(cx - 12, cy + 15, 24, 4, STEEL); rect(250, g - 12, 68, 5, CONC); },
      () => { ground(); leg(250, g - 124, 214, g, 34, CONC); rect(244, g - 128, 22, 5, CONC); box(294, g - 50, 60, 50, 5, STEEL); core(324, g - 11.5, 6.5); rect(294, g - 60, 60, 10, CONC); rect(266, g - 10, 16, 10, BRICK); },
      () => { ground(); for (let f = 0; f <= 9; f++) rect(250, g - f * 16 - 4, 66, 4, STEEL); for (const x of [250, 280, 311]) rect(x, g - 148, 5, 148, STEEL); for (let f = 0; f < 9; f++) { rect(247, g - f * 16 - 14, 3, 10, GLASS); rect(316, g - f * 16 - 14, 3, 10, GLASS); } rect(280, g - 170, 4, 22, STEEL); core(298, g - 74.5, 5.5); rect(258, g - 30, 12, 10, WOOD); rect(292, g - 126, 12, 10, WOOD); box(334, g - 40, 36, 40, 6, BRICK); },
      () => { ground(); rect(206, g - 44, 12, 44, STONE); rect(230, g - 30, 12, 30, STONE); for (const x of [206, 213]) rect(x, g - 49, 5, 5, STONE); box(262, g - 58, 66, 58, 7, STEEL); rect(256, g - 64, 78, 6, STEEL); core(295, g - 13.5, 6.5); rect(272, g - 34, 46, 4, CONC); box(340, g - 86, 34, 86, 7, BRICK); for (const y of [28, 56]) rect(347, g - y, 20, 3, WOOD); },
      () => { ground(x => x > 200 && x < 376 ? Math.round(g - 26 * Math.sin((x - 200) / 176 * Math.PI)) : g); rect(252, g - 22, 72, 7, CONC); rect(256, g - 9, 64, 7, CONC); rect(264, g - 2, 48, 18, E); core(288, g + 8.5, 6.5); rect(262, g - 2, 3, 18, CONC); rect(311, g - 2, 3, 18, CONC); },
      () => { ground(x => x > 214 && x < 360 ? Math.round(g - 12 * Math.sin((x - 214) / 146 * Math.PI)) : g); box(244, g - 52, 88, 52, 9, CONC); box(253, g - 43, 70, 43, 8, LEAD); rect(261, g - 35, 54, 35, E); core(288, g - 7.5, 7); rect(240, g - 56, 96, 4, CONC); },
      () => { ground(); box(210, g - 84, 166, 84, 6, STEEL); for (const x of [262, 318]) rect(x, g - 78, 6, 78, STEEL); for (const y of [28, 56]) rect(216, g - y - 4, 154, 4, STEEL); rect(204, g - 90, 178, 6, STEEL); core(238, g - 12, 5.5); core(292, g - 66.5, 5.5); core(348, g - 38.5, 5.5); for (const x of [226, 336]) { rect(x, g - 50, 10, 18, BRICK); } rect(280, g - 20, 20, 20, CONC); },
      () => { ground(x => x > 204 ? g - 12 : g); const b = g - 12; rect(206, b, 190, 12, STONE); box(222, b - 60, 24, 60, 6, BRICK); box(350, b - 60, 24, 60, 6, BRICK); box(254, b - 46, 88, 46, 8, STONE); rect(250, b - 52, 96, 6, CONC); box(264, b - 124, 68, 72, 8, STEEL); disc(298, b - 86, 18, LEAD, 12); rect(272, b - 68, 52, 4, STEEL); core(298, b - 86, 8, false); rect(294, b - 78, 8, 10, STEEL); rect(258, b - 130, 80, 6, STONE); roof(266, b - 131, 64, BRICK); for (const x of [282, 310]) rect(x, b - 38, 5, 38, STEEL); },
      () => { ground(); rect(300, g - 150, 10, 150, STEEL); rect(290, g - 6, 30, 6, CONC); rect(214, g - 160, 152, 8, STEEL); leg(232, g - 152, 300, g - 96, 4, STEEL); rect(344, g - 152, 20, 22, CONC); rect(232, g - 152, 3, 48, STEEL); box(216, g - 104, 35, 32, 3, STEEL); core(233.5, g - 81.5, 6, false); rect(330, g - 44, 30, 44, BRICK); rect(336, g - 38, 18, 38, E); rect(326, g - 47, 38, 3, WOOD); },
      () => { ground(); box(222, g - 112, 46, 112, 7, CONC); halfDisc(245, g - 111, 23, CONC, 16); core(245, g - 7, 6); rect(229, g - 60, 32, 4, WOOD); box(304, g - 142, 46, 142, 7, CONC); halfDisc(327, g - 141, 23, CONC, 16); rect(311, g - 72, 32, 4, STEEL); core(327, g - 78.5, 6); rect(268, g - 100, 36, 3, STEEL); },
      () => { ground(); rect(214, g - 62, 16, 62, BRICK); rect(346, g - 62, 16, 62, BRICK); rect(206, g - 70, 164, 8, STEEL); rect(224, g - 112, 128, 6, STEEL); for (const x of [224, 256, 288, 320, 346]) rect(x, g - 106, 5, 36, STEEL); leg(229, g - 106, 256, g - 70, 4, STEEL); leg(325, g - 106, 290, g - 70, 4, STEEL); rect(286, g - 62, 3, 16, STEEL); box(270, g - 46, 35, 28, 3, STEEL); core(287.5, g - 27.5, 6, false); },
      () => { ground(); leg(262, g - 132, 243, g, 12, STONE); leg(306, g - 132, 325, g, 12, STONE); rect(254, g - 138, 60, 6, STEEL); rect(250, g - 44, 68, 6, STEEL); rect(262, g - 96, 44, 4, STEEL); core(284, g - 7, 7); rect(272, g - 158, 8, 20, STEEL); rect(288, g - 150, 8, 12, STEEL); rect(222, g - 20, 14, 20, BRICK); },
      () => { ground(); for (let j = 0; j < 124; j++) { const hw = 27 + Math.round(22 * Math.pow((j - 84) / 84, 2)); rect(290 - hw - 6, g - 1 - j, 6, 1, CONC); rect(290 + hw, g - 1 - j, 6, 1, CONC); } rect(260, g - 54, 60, 3, STEEL); rect(266, g - 20, 4, 20, STEEL); rect(310, g - 20, 4, 20, STEEL); core(290, g - 7, 7); },
      () => { ground(); for (const x of [232, 292, 352]) { halfDisc(x, g, 24, CONC, 16); halfDisc(x, g, 16, LEAD, 11.5); core(x, g - 4.5, 4.5, false); } rect(256, g - 6, 12, 6, CONC); rect(316, g - 6, 12, 6, CONC); },
      () => { ground(); for (const x of [236, 264, 304, 332]) rect(x, g - 100, 7, 100, STEEL); rect(228, g - 108, 120, 8, CONC); leg(240, g - 100, 266, g - 50, 3, STEEL); leg(335, g - 100, 308, g - 50, 3, STEEL); rect(236, g - 52, 103, 4, STEEL); box(250, g - 152, 76, 44, 7, STEEL); core(288, g - 121.5, 6.5, false); rect(246, g - 156, 84, 4, STEEL); },
      () => { ground(); rect(212, g - 72, 156, 18, CONC); rect(212, g - 54, 14, 54, CONC); rect(354, g - 54, 14, 54, CONC); rect(226, g - 54, 8, 54, STEEL); rect(288, g - 54, 8, 30, CONC); rect(290, g - 12, 26, 12, STEEL); core(303, g - 18.5, 6.5, false); rect(206, g - 76, 168, 4, STEEL); },
      () => { ground(x => x > 250 && x < 322 ? g + 16 : g); rect(244, g - 5, 84, 6, STEEL); rect(244, g - 12, 84, 7, CONC); rect(244, g - 18, 84, 6, LEAD); rect(244, g - 25, 84, 7, BRICK); rect(244, g - 30, 84, 5, WOOD); core(286, g + 9.5, 6); rect(236, g - 34, 8, 34, STONE); rect(328, g - 34, 8, 34, STONE); },
      () => { ground(); rect(226, g - 8, 128, 8, CONC); const cx = 290, cy = g - 62; disc(cx, cy, 54, STONE, 45); disc(cx, cy, 45, LEAD, 39); disc(cx, cy, 39, CONC, 31); disc(cx, cy, 31, STEEL, 25); disc(cx, cy, 25, BRICK, 19); core(cx, cy + 8, 9); rect(cx - 12, cy + 17, 24, 3, STEEL); },
      () => { ground(x => x > 190 ? Math.max(g - 50, Math.round(g - (x - 190) * .9)) : g); box(262, g - 42, 70, 40, 6, CONC); rect(268, g - 36, 58, 28, E); core(300, g - 14.5, 6.5, false); rect(208, g - 31, 60, 13, E); box(284, g - 100, 30, 50, 6, STONE); for (const x of [284, 296, 308]) rect(x, g - 105, 6, 5, STONE); },
      () => { ground(); rect(236, g - 112, 110, 112, STONE); rect(250, g - 98, 82, 84, CONC); rect(262, g - 86, 58, 60, LEAD); rect(272, g - 76, 38, 40, STEEL); rect(279, g - 69, 24, 26, E); core(291, g - 50, 7, false); },
    ];
    B[n]();
    support(true); bodies.length = 0;   // tidy any stray piece the builder left floating
    coreN = 0; for (let i = 0; i < N; i++) if (mat[i] === CORE) coreN++; coreLeft = coreN; dirty = true;
  }
  /* ---------- what holds what up ---------- */
  const seen = new Uint8Array(N), queue = new Int32Array(N);
  // structures are stiff: a hit punches a hole, and only a piece that is cut off completely comes loose
  function support(init) {
    seen.fill(0); let qh = 0, qt = 0;
    for (let x = 0; x < GW; x++) { const i = idx(x, GH - 1); if (isStatic(mat[i])) { seen[i] = 1; queue[qt++] = i; } }
    while (qh < qt) { const i = queue[qh++], x = i % GW; for (let k = 0; k < 4; k++) { const j = k === 0 ? i - GW : k === 1 ? i + GW : k === 2 ? (x > 0 ? i - 1 : -1) : (x < GW - 1 ? i + 1 : -1); if (j < 0 || j >= N || seen[j] || !isStatic(mat[j])) continue; seen[j] = 1; queue[qt++] = j; } }
    const recent = blasts.some(bl => bl.t < .4);
    for (let s = 0; s < N; s++) {
      if (seen[s] || !isStatic(mat[s])) continue;
      qh = 0; qt = 0; queue[qt++] = s; seen[s] = 2; const cells = [];
      while (qh < qt) { const i = queue[qh++], x = i % GW; cells.push(i); for (let k = 0; k < 4; k++) { const j = k === 0 ? i - GW : k === 1 ? i + GW : k === 2 ? (x > 0 ? i - 1 : -1) : (x < GW - 1 ? i + 1 : -1); if (j < 0 || j >= N || seen[j] || !isStatic(mat[j])) continue; seen[j] = 2; queue[qt++] = j; } }
      if (init) { for (const i of cells) { mat[i] = E; hp[i] = 0; col[i] = 0; } continue; }
      if (cells.length < 9 || bodies.length >= 14) {   // crumbs just drop
        for (const i of cells) { const m = mat[i], c = col[i], x = i % GW, y = (i / GW) | 0, T = heat[i]; mat[i] = E; hp[i] = 0; col[i] = 0; heat[i] = 0; if (m === CORE) debris(x + .5, y + .5, (R() - .5) * 8, -R() * 6, rgb(255, 120, 150), 3, 600); else if (T > M[m].melt * .7 && !M[m].burns) debris(x + .5, y + .5, (R() - .5) * 8, -R() * 4, 0, 1, 700); else debris(x + .5, y + .5, (R() - .5) * 8, -R() * 6, c, m === GLASS ? 2 : 0); }
        continue;
      }
      let rest = false; for (const i of cells) { const j = i + GW; if (j < N && mat[j] && seen[j] !== 2) { rest = true; break; } }
      if (rest && !recent) continue;   // lying on rubble: leave it be
      const b = makeBody(cells);
      for (const bl of blasts) { if (bl.t > .4) continue; const dx = b.x - bl.x, dy = b.y - bl.y, d = Math.hypot(dx, dy); if (d < bl.r * 4) { const k = bl.P * 3 / (1 + d * .08) / Math.sqrt(1 + b.n * .004); b.vx += dx / (d + 1) * k; b.vy += Math.min(0, dy / (d + 1) * k) - k * .12; b.w += (dx > 0 ? 1 : -1) * k * .012 * (.4 + R()); } }
      bodies.push(b);
    }
  }
  /* ---------- loose chunks: rigid, they fall, spin, tumble and settle ---------- */
  function makeBody(cells) {
    let sx = 0, sy = 0, mx = GW, my = GH, Mx = 0, My = 0;
    for (const i of cells) { const x = i % GW, y = (i / GW) | 0; sx += x + .5; sy += y + .5; if (x < mx) mx = x; if (y < my) my = y; if (x > Mx) Mx = x; if (y > My) My = y; }
    const n = cells.length, cx = sx / n, cy = sy / n, mw = Mx - mx + 1, mh = My - my + 1, map = new Int32Array(mw * mh).fill(-1), cs = []; let I = 0, rad = 0;
    for (const i of cells) { const x = i % GW, y = (i / GW) | 0, lx = x + .5 - cx, ly = y + .5 - cy; map[(y - my) * mw + (x - mx)] = cs.length; cs.push({ lx, ly, m: mat[i], c: col[i], h: hp[i], t: heat[i], dead: false }); I += lx * lx + ly * ly + 1 / 6; rad = Math.max(rad, Math.hypot(lx, ly)); mat[i] = E; hp[i] = 0; col[i] = 0; heat[i] = 0; }
    return { x: cx, y: cy, a: 0, vx: 0, vy: 0, w: 0, cells: cs, n, I, rad: rad + 1.5, map, mw, mh, ox: mx + .5 - cx, oy: my + .5 - cy, age: 0, rest: 0, snd: 0, px: -99, py: -99, pa: 0 };
  }
  const ctc = { n: 0, px: 0, py: 0, nx: 0, ny: 0, hit: [] };
  function contacts(b) {
    const c = Math.cos(b.a), s = Math.sin(b.a), step = b.n > 2600 ? 2 : 1; let n = 0, px = 0, py = 0, nx = 0, ny = 0; ctc.hit.length = 0;
    for (let k = 0; k < b.cells.length; k += step) {
      const q = b.cells[k]; if (q.dead) continue; const X = b.x + c * q.lx - s * q.ly, Y = b.y + s * q.lx + c * q.ly, gx = Math.floor(X), gy = Math.floor(Y);
      if (gy >= GH) { n++; px += X; py += Y; ny -= 2; continue; }
      if (gx < 0 || gx >= GW || gy < 0) continue; const i = gy * GW + gx; if (!mat[i]) continue;
      n++; px += X; py += Y; if (ctc.hit.length < 40) ctc.hit.push(i, k);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const ex = gx + dx, ey = gy + dy; if (ey >= GH) continue; if (ex < 0 || ex >= GW || ey < 0 || !mat[ey * GW + ex]) { nx += dx; ny += dy; } }
    }
    ctc.n = n; ctc.px = px; ctc.py = py; ctc.nx = nx; ctc.ny = ny; return ctc;
  }
  function stampBody(b) {
    const c = Math.cos(b.a), s = Math.sin(b.a), x0 = Math.max(0, Math.floor(b.x - b.rad)), x1 = Math.min(GW - 1, Math.ceil(b.x + b.rad)), y0 = Math.max(0, Math.floor(b.y - b.rad)), y1 = Math.min(GH - 1, Math.ceil(b.y + b.rad)), cool = Math.exp(-b.age * .2);
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const dx = gx + .5 - b.x, dy = gy + .5 - b.y, cx = Math.round(c * dx + s * dy - b.ox), cy = Math.round(-s * dx + c * dy - b.oy); if (cx < 0 || cy < 0 || cx >= b.mw || cy >= b.mh) continue;
      const k = b.map[cy * b.mw + cx]; if (k < 0) continue; const q = b.cells[k]; if (q.dead) continue; const i = gy * GW + gx; if (mat[i] && !M[mat[i]].loose) continue;
      mat[i] = q.m; col[i] = q.c; hp[i] = q.h; heat[i] = q.t * cool;
    }
    dirty = true;
  }
  function stepBodies(h) {
    for (let k = bodies.length - 1; k >= 0; k--) {
      const b = bodies[k]; b.age += h; const sub = Math.hypot(b.vx, b.vy) * h > .45 ? 3 : 2, hh = h / sub; let gone = false;
      for (let q = 0; q < sub && !gone; q++) {
        b.vy += G * hh; b.x += b.vx * hh; b.y += b.vy * hh; b.a += b.w * hh;
        const ct = contacts(b);
        if (ct.n) {
          const px = ct.px / ct.n, py = ct.py / ct.n; let nx = ct.nx, ny = ct.ny, L = Math.hypot(nx, ny);
          if (L < .5) { nx = b.x - px; ny = b.y - py; L = Math.hypot(nx, ny); if (L < .01) { nx = 0; ny = -1; L = 1; } } nx /= L; ny /= L;
          const rx = px - b.x, ry = py - b.y, vpx = b.vx - b.w * ry, vpy = b.vy + b.w * rx, vn = vpx * nx + vpy * ny;
          if (vn < 0) {
            const rn = rx * ny - ry * nx, kn = 1 / b.n + rn * rn / b.I, j = -(1 + .1) * vn / kn;
            b.vx += j * nx / b.n; b.vy += j * ny / b.n; b.w += rn * j / b.I;
            const tx = -ny, ty = nx, vt = vpx * tx + vpy * ty, rt = rx * ty - ry * tx, kt = 1 / b.n + rt * rt / b.I, jt = cl(-vt / kt, -.5 * j, .5 * j);
            b.vx += jt * tx / b.n; b.vy += jt * ty / b.n; b.w += rt * jt / b.I;
            if (-vn > 15) crash(b, ct, -vn);
          }
          const push = Math.min(.5, .1 + ct.n * .015); b.x += nx * push; b.y += ny * push;
          b.vx *= .98; b.vy *= .98; b.w *= Math.hypot(b.vx, b.vy) < 8 ? .9 : .955;
        }
        if (b.y - b.rad > GH + 10 || b.x + b.rad < -20 || b.x - b.rad > GW + 20) gone = true;
      }
      if (gone) { bodies.splice(k, 1); continue; }
      // it has settled once it has hardly moved for a third of a second
      if ((b.rest += h) > .33) { const still = Math.hypot(b.x - b.px, b.y - b.py) < .3 && Math.abs(b.a - b.pa) < .09; b.rest = 0; b.px = b.x; b.py = b.y; b.pa = b.a; if (still) { stampBody(b); bodies.splice(k, 1); continue; } }
      if (b.age > 9) { stampBody(b); bodies.splice(k, 1); }
    }
  }
  function crash(b, ct, v) {   // a hard landing: brittle stuff breaks up, and it dents what it lands on
    const sh = cl((v - 14) / 40, 0, 1), dmg = v * .04 * Math.sqrt(b.n), c = Math.cos(b.a), s = Math.sin(b.a);
    for (let q = 0; q < ct.hit.length; q += 2) { const i = ct.hit[q], cell = b.cells[ct.hit[q + 1]]; if (mat[i] && mat[i] !== BED && hurt(i, dmg * (.5 + R()))) destroy(i, (R() - .5) * 40, -10 - R() * 20); if (!cell.dead && R() < M[cell.m].brit * (.3 + sh)) { cell.dead = true; const X = b.x + c * cell.lx - s * cell.ly, Y = b.y + s * cell.lx + c * cell.ly; debris(X, Y, (R() - .5) * v + b.vx * .3, -R() * v * .5, cell.m === CORE ? rgb(255, 120, 150) : cell.c, cell.m === CORE ? 3 : cell.m === GLASS ? 2 : 0, 600); } }
    if (sh > .25) for (const cell of b.cells) { if (!cell.dead && R() < M[cell.m].brit * sh * .22) { cell.dead = true; const X = b.x + c * cell.lx - s * cell.ly, Y = b.y + s * cell.lx + c * cell.ly; debris(X, Y, (R() - .5) * v * .8 + b.vx * .3, -R() * v * .5, cell.m === CORE ? rgb(255, 120, 150) : cell.c, cell.m === CORE ? 3 : cell.m === GLASS ? 2 : 0, 600); } }
    if (t - b.snd > .25) { b.snd = t; smoke(ct.px / ct.n, ct.py / ct.n, Math.min(8, 2 + b.n / 120), 1 + Math.min(2, b.n / 800)); K.shake(Math.min(14, v * .12 + b.n / 400)); K.noise(.25 + Math.min(.4, b.n / 2500), Math.min(.4, .08 + b.n / 5000), 170); sparks(ct.px / ct.n, ct.py / ct.n, 6, -Math.PI / 2, 2.4, 50); }
  }
  /* ---------- heat, and loose rubble ---------- */
  function stepCells(dt) {
    frame++; const flip = frame & 1;
    for (let y = GH - 1; y >= 0; y--) {
      for (let q = 0; q < GW; q++) {
        const x = flip ? q : GW - 1 - q, i = y * GW + x, m = mat[i]; if (!m) continue;
        let T = heat[i];
        if (T > .5) {
          const mm = M[m];
          if (T > 6) for (let k = 0; k < 4; k++) {   // heat runs along the metal into cooler neighbours
            const j = k === 0 ? i - GW : k === 1 ? i + GW : k === 2 ? (x > 0 ? i - 1 : -1) : (x < GW - 1 ? i + 1 : -1); if (j < 0 || j >= N) continue; const n = mat[j]; if (!n) continue;
            const d = T - heat[j]; if (d > 2) { const f = d * .17 * Math.min(mm.cond, M[n].cond); heat[j] += f; T -= f; }
          }
          T -= (3 + T * .055) * dt;
          if (T > mm.melt) {
            if (mm.burns) {   // wood chars; charred wood that is cooked again falls to bits
              const [r, gg, b] = unpack(col[i]);
              if (r + gg + b >= 170) { col[i] = rgb(r * .42 | 0, gg * .36 | 0, b * .32 | 0); hp[i] = Math.max(.5, hp[i] * .55); T = 150; if (R() < .4 && fx.length < 1200) fx.push({ k: 'f', x: x + .5, y: y + .5, vx: (R() - .5) * 4, vy: -8 - R() * 6, t: 0, l: .5 + R() * .7 }); }
              else if (R() < dt * 2.5) { heat[i] = 0; destroy(i, (R() - .5) * 12, -R() * 8); continue; }
            } else if (m !== BED && R() < dt * (.3 + 1.7 * (T / mm.melt - 1))) {   // white hot: it lets go and drops away
              heat[i] = 0; if (m === CORE && R() < .3) sparks(x + .5, y + .5, 2, 0, TAU, 30); destroy(i, (R() - .5) * 12, -R() * 7, Math.min(1100, T + 250)); continue;
            }
          } else if (mm.burns && T > mm.melt * .55 && R() < .03 && fx.length < 1200) fx.push({ k: 'f', x: x + .5, y: y + .5, vx: 0, vy: -6, t: 0, l: .4 });
          heat[i] = T > .5 ? T : 0;
        }
        if (!M[m].loose || stamp[i] === frame) continue;
        let j = -1;
        if (y < GH - 1 && !mat[i + GW]) j = i + GW;
        else if (y < GH - 1) { const d = R() < .5 ? -1 : 1; for (const s of [d, -d]) { const nx = x + s; if (nx >= 0 && nx < GW && !mat[i + GW + s] && !mat[i + s]) { j = i + GW + s; break; } } }
        if (j >= 0) { mat[j] = mat[i]; col[j] = col[i]; hp[j] = hp[i]; heat[j] = heat[i]; stamp[j] = frame; mat[i] = E; col[i] = 0; hp[i] = 0; heat[i] = 0; }
      }
    }
  }
  // what is left burning where a charge went off: it keeps the metal around it cooking for a while
  function stepHots(h) {
    for (let k = hots.length - 1; k >= 0; k--) {
      const o = hots[k]; o.t += h; if (o.t > o.l) { hots.splice(k, 1); continue; } const f = 1 - o.t / o.l, r = o.r, cx = Math.floor(o.x), cy = Math.floor(o.y), ri = Math.ceil(r);
      for (let yy = -ri; yy <= ri; yy++) for (let xx = -ri; xx <= ri; xx++) { const d = Math.hypot(xx, yy); if (d > r) continue; const nx = cx + xx, ny = cy + yy; if (!inb(nx, ny)) continue; const j = idx(nx, ny), n = mat[j]; if (n && n !== BED) warm(j, o.P * f * h * (1 - d / r) * 2, Math.min(M[n].melt * 1.3, o.maxT)); }
      if (R() < .35 * f) sparks(o.x + (R() - .5) * r, o.y + (R() - .5) * r, 1, -Math.PI / 2, TAU, 50); if (R() < .05 * f) embers(o.x, o.y, 1, 16);
      if (o.burn && R() < .6 && fx.length < 1300) fx.push({ k: 'f', x: o.x + (R() - .5) * r * 1.4, y: o.y + (R() - .5) * r * 1.2, vx: (R() - .5) * 5, vy: -9 - R() * 9, t: 0, l: .5 + R() * .7 });
    }
  }
  function stepParts(dt) {
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k]; p.t += dt; p.vy += G * dt; p.vx *= .996;
      const ox = p.x, oy = p.y; p.x += p.vx * dt; p.y += p.vy * dt;
      const x = Math.floor(p.x), y = Math.floor(p.y);
      if (x < -30 || x >= GW + 30 || y >= GH || p.t > 9) { parts.splice(k, 1); continue; }
      if (p.k === 1 && p.h - p.t * 230 < 150) { p.k = 0; p.c = rgb(70, 62, 66); }   // a drop that has gone cold
      if (y < 0 || x < 0 || x >= GW) continue;
      const i = idx(x, y);
      if (mat[i]) {
        if (!p.b && R() < .55) { p.b = 1; p.x = ox; p.y = oy; p.vy = -Math.abs(p.vy) * .28; p.vx *= .5; continue; }
        if (p.k === 1) warm(i, (p.h - p.t * 230) * .3, 1500);
        else if (p.k === 0 && R() < .45) { const px = Math.floor(ox), py = Math.floor(oy); if (inb(px, py) && !mat[idx(px, py)]) { const j = idx(px, py); mat[j] = RUB; col[j] = p.c; hp[j] = M[RUB].hp; heat[j] = 0; } }
        parts.splice(k, 1);
      }
    }
  }
  /* ---------- the gun and its shells ---------- */
  const GUN = { x: 34, y: 0 }, BL = 31, PH = 17;   // pivot column, ground row; barrel length and pivot height in pixels of the world
  let ang = .5, pow = .7, slot = 0, aiming = false;
  const vel = (d, a = ang, p = pow) => { const S = stats(d), v = (62 + 104 * p) * S.spd; return [Math.cos(a) * v, -Math.sin(a) * v]; };
  const muzzle = (a = ang) => [GUN.x + Math.cos(a) * BL, GUN.y - PH - Math.sin(a) * BL];
  let phase = 'aim', charge = 0, hitT = -1, after = 0, slowT = 0, autoCur = 1, speedI = 0, paused = false, ffwd = 0, word = '', more = false, wide = false, shotCore = 0;
  const SPEEDS = [1, 2, .5], focus = [0, 0];
  function fire() {
    if (mode !== 'play' || phase !== 'aim' || shots <= 0 || end) return;
    phase = 'shot'; charge = .42; hitT = -1; after = 0; word = ''; paused = false; ffwd = 0; slowT = 0; more = false; shotCore = coreLeft; aiming = false;
    K.sfx(160, .42, 'sawtooth', .05, 900);
  }
  function launch() {
    const d = design(slot), S = stats(d), [vx, vy] = vel(d), [mx, my] = muzzle(), ux = Math.cos(ang), uy = -Math.sin(ang);
    const E0 = S.mass * Math.pow(Math.hypot(vx, vy) / 100, 2) * 22;
    shells.push({ x: mx, y: my, vx, vy, ux, uy, S, d, pen: 0, live: true, E: E0, E0, small: false, t: 0, out: 0, travel: 0, hit: false, near: false, cut: 0, crush: 0, inside: false, gap: 0, lodged: false, snd: 0 });
    shots--; used++; recoil = 1; focus[0] = mx; focus[1] = my;
    flash(mx + ux * 2, my + uy * 2, 5, .16); sparks(mx, my, 16, Math.atan2(uy, ux), 1.1, 150); arcs(mx + ux * 4, my + uy * 4, 7, 16, '90,200,255'); smoke(mx, my, 5, 1); glow(mx + ux * 3, my + uy * 3, 5, .5, ux * 6, uy * 6);
    K.sfx(90, .35, 'sawtooth', .12, -50); K.noise(.3, .3, 400); K.shake(7);
  }
  const explosive = s => s.S.f.blast > 0 || s.S.jet > 0;
  const casC = d => ({ steel: [143, 154, 166], alu: [196, 204, 214], ti: [172, 182, 204], tung: [92, 100, 116], heavy: [86, 102, 94] }[d.casing] || [143, 154, 166]);
  function firstHit(s) {
    s.hit = true; s.near = true; if (hitT < 0) { hitT = 0; focus[0] = s.x; focus[1] = s.y; slowT = 1.2; word = pick(['Smashing!', 'Direct hit!', 'Crunch!', 'Dug in!']); }
    const back = Math.atan2(-s.uy, -s.ux); flash(s.x, s.y, 4.5, .2); sparks(s.x, s.y, 30, back, 2.8, 130); arcs(s.x, s.y, 5, 18); K.shake(5); K.noise(.16, .22, 1500); K.sfx(220, .12, 'square', .06, -120);
    if (s.S.f.tandem && !s.pre) { s.pre = 1; blast(s.x + s.ux * 2.5, s.y + s.uy * 2.5, 5.5 * Math.sqrt(s.S.q), 8 * s.S.q, { heat: 350, back }); }   // the precursor charge
  }
  function carve(s, i, cx, cy, m) {
    const c0 = col[i], back = Math.atan2(-s.uy, -s.ux), a = back + (R() - .5) * 2.4, v = 14 + R() * 44;
    mat[i] = E; hp[i] = 0; heat[i] = 0; col[i] = 0; dirty = true;
    if (m === GLASS) debris(cx + .5, cy + .5, (R() - .5) * 40, -R() * 26, c0, 2);
    else if (m === CORE) debris(cx + .5, cy + .5, Math.cos(a) * v, Math.sin(a) * v - 8, rgb(255, 120, 150), 3, 700);
    else if (M[m].burns || M[m].hp < 6) { debris(cx + .5, cy + .5, Math.cos(a) * v, Math.sin(a) * v - 8, c0, 0); if (R() < .4) debris(cx + .5, cy + .5, (R() - .5) * 46, -R() * 30, c0, 0); }
    else { if (R() < .6) debris(cx + .5, cy + .5, Math.cos(a) * v, Math.sin(a) * v - 6, 0, 1, 820 + R() * 200); if (R() < .3) debris(cx + .5, cy + .5, Math.cos(a) * v * .7, Math.sin(a) * v * .7 - 10, c0, 0); }
    const hot = s.S.c.hot, hk = Math.min(1.4, .3 + M[m].hp / 12) * (hot ? 60 : 34);
    for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) { const d = Math.hypot(xx, yy); if (d > 3.3) continue; const nx = cx + xx, ny = cy + yy; if (!inb(nx, ny)) continue; const j = idx(nx, ny), n = mat[j]; if (n && n !== BED) warm(j, hk * (1 - d / 3.6), Math.min(M[n].melt * 1.25, hot ? 780 : 640)); }
  }
  function lodge(s) {
    if (!s.hit) firstHit(s);
    s.lodged = true; s.vx = s.vy = 0; s.fuse = explosive(s) ? (s.E > 0 ? .6 : .85) : 1.1; s.crush = Math.max(s.crush, 2.5);
    sparks(s.x, s.y, 22, Math.atan2(-s.uy, -s.ux), 3, 110); K.noise(.14, .16, 2000); K.sfx(700, .08, 'square', .04, -400);
  }
  function shatter(s) {   // an inert slug that has stopped: it breaks up
    const rc = casC(s.d), back = Math.atan2(-s.uy, -s.ux);
    for (let q = 0; q < 20; q++) { const a = back + (R() - .5) * 2.8, v = 16 + R() * 50; debris(s.x - s.ux * 2, s.y - s.uy * 2, Math.cos(a) * v, Math.sin(a) * v - 10, rgb(rc[0] + rint(-15, 30), rc[1] + rint(-15, 30), rc[2] + rint(-15, 30)), 0); }
    clump(s.x - s.ux * 2, s.y - s.uy * 2, Math.cos(back) * 20, Math.sin(back) * 20 - 14, 9, 800);
    sparks(s.x, s.y, 26, back, 3.2, 110); embers(s.x, s.y, 4, 20); K.noise(.18, .16, 2200); s.live = false;
  }
  function detonate(s) {
    s.live = false; const S = s.S, f = S.f, q = S.q, ux = s.ux, uy = s.uy, off = s.small ? 0 : 3.5, x = s.x - ux * off, y = s.y - uy * off, back = Math.atan2(-uy, -ux);
    if (s.small) { blast(x, y, 5.2 * q, 5 * q, { heat: 300, back }); hots.push({ x, y, r: 4, P: 500, l: 1.6, t: 0, maxT: 640 }); return; }
    if (hitT < 0) { hitT = 0; focus[0] = x; focus[1] = y; word = 'Airburst!'; }
    const rc = casC(s.d); for (let k = 0; k < 14; k++) { const a = back + (R() - .5) * 3.6, v = 24 + R() * 60; debris(x, y, Math.cos(a) * v, Math.sin(a) * v - 10, rgb(rc[0] + rint(-15, 30), rc[1] + rint(-15, 30), rc[2] + rint(-15, 30)), 0); }
    if (S.jet > 0) { if (S.l.fan) for (const da of [-.24, 0, .24]) { const c = Math.cos(da), sn = Math.sin(da); jet(s.x - ux, s.y - uy, ux * c - uy * sn, ux * sn + uy * c, 36 + 36 * S.jet, 30 * S.jet); } else jet(s.x - ux, s.y - uy, ux, uy, 40 + 40 * S.jet, 44 * S.jet); }
    const bl = S.bl, maxT = f.maxT || 640;
    if (bl > 0) {
      blast(x, y, (5 + 5.5 * bl) * Math.sqrt(q) * S.n.splash, 10 * bl * q * S.n.splash, { heat: (f.bheat || 950) * q * (f.heat || f.burn ? 1 : Math.min(1, Math.sqrt(bl))), maxT, back, thru: S.n.thru || 0 });
      hots.push({ x, y, r: (4 + 5 * Math.min(bl, 1.2)) * (f.hotR || 1), P: (f.hotP || 900) * q, l: f.hotL || 3.2, t: 0, maxT, burn: f.burn });
    }
    if (f.frag) frag(x, y, 46, 4.5 * q, 36);
    if (f.heat) { for (let k = 0; k < 9; k++) { const a = R() * TAU, v = 14 + R() * 40; clump(x, y, Math.cos(a) * v, Math.sin(a) * v - 16, rint(8, 13), 1250 * q); } K.sfx(300, .8, 'sawtooth', .05, -200); }
    if (f.cluster) for (let k = 0; k < 6; k++) shells.push({ x: x - ux * 2, y: y - uy * 2 - 1, vx: -ux * 14 + (R() - .5) * 54, vy: -26 - R() * 28, ux, uy, S, d: s.d, live: true, small: true, t: 0 });
    if (!f.blast && !S.jet) { sparks(x, y, 12, back, 3, 60); K.noise(.15, .2, 900); dirty = true; }
  }
  // the nose, three, five or seven pixels wide: the middle leads
  const XSW = { 3: [[-1, 1], [0, 0], [1, 1]], 5: [[-2, 3], [-1, 1], [0, 0], [1, 1], [2, 3]], 7: [[-3, 5], [-2, 3], [-1, 1], [0, 0], [1, 1], [2, 3], [3, 5]] };
  function stepShells(h) {
    for (let k = shells.length - 1; k >= 0; k--) {
      const s = shells[k];
      if (!s.live) { shells.splice(k, 1); continue; }
      s.t += h;
      if (s.small) {
        s.vy += G * h; s.x += s.vx * h; s.y += s.vy * h; const x = Math.floor(s.x), y = Math.floor(s.y);
        if (x < -10 || x > GW + 10 || y >= GH) { s.live = false; continue; }
        if (y >= 0 && x >= 0 && x < GW && mat[idx(x, y)]) { s.x -= s.vx * h; s.y -= s.vy * h; detonate(s); }
        continue;
      }
      if (s.near && s.cut < 1) s.cut = Math.min(1, s.cut + h * 3.5);
      const S = s.S, back = Math.atan2(-s.uy, -s.ux);
      if (s.lodged) {   // stuck fast: the metal around the nose cooks while the fuse runs down
        s.fuse -= h; const cx = Math.floor(s.x), cy = Math.floor(s.y);
        const hotT = S.f.maxT || 640; for (let yy = -6; yy <= 6; yy++) for (let xx = -6; xx <= 6; xx++) { const nx = cx + xx, ny = cy + yy, d = Math.hypot(xx, yy); if (inb(nx, ny) && d < 6.4) { const j = idx(nx, ny), n = mat[j]; if (n && n !== BED) warm(j, 1500 * h * (1 - d / 7) * (.3 + .7 * M[n].cond), Math.min(M[n].melt * 1.3, hotT)); } }
        if (R() < .5) sparks(s.x, s.y, 2, back, 2.6, 80); if (R() < .2) debris(s.x - s.ux, s.y - s.uy, Math.cos(back) * 12 + (R() - .5) * 14, -6 - R() * 8, 0, 1, 800);
        if (s.fuse <= 0) { if (explosive(s)) detonate(s); else shatter(s); }
        continue;
      }
      const sp0 = Math.hypot(s.vx, s.vy), sub = Math.max(1, Math.ceil((s.inside ? Math.min(sp0, 30) : sp0) * h / .5));
      for (let n = 0; n < sub && s.live && !s.lodged; n++) {
        const hh = h / sub; s.vy += G * hh * (s.inside ? .25 : 1); const sp = Math.hypot(s.vx, s.vy); if (sp > 2 && !s.inside) { s.ux = s.vx / sp; s.uy = s.vy / sp; }
        const mv = s.inside ? Math.min(sp, 30) : sp; s.x += s.ux * mv * hh; s.y += s.uy * mv * hh; s.out += mv * hh; if (s.hit) s.travel += mv * hh;
        if (s.x < -24 || s.x > GW + 24 || s.y > GH + 6) { s.live = false; if (!s.hit && lv('mull') && !mullUsed) { mullUsed = true; shots++; used--; say('Missed! The spotter hands you the shell back', '#7ce8d8'); } else if (!s.hit) say('Missed!', '#ffb36a'); break; }
        if (!s.near || S.u.air) { for (let a = 2; a <= 46; a += 2) { const ax = Math.floor(s.x + s.ux * a), ay = Math.floor(s.y + s.uy * a); if (inb(ax, ay) && isStatic(mat[idx(ax, ay)])) { s.near = true; if (S.u.air && a <= 6 && explosive(s)) detonate(s); break; } } if (!s.live) break; }
        let any = 0, blocked = false, hard = 0, lastM = 0;
        for (const [o, lag] of XSW[S.w]) {
          const cx = Math.floor(s.x - s.ux * lag - s.uy * o), cy = Math.floor(s.y - s.uy * lag + s.ux * o); if (!inb(cx, cy)) continue; const i = idx(cx, cy), m = mat[i]; if (!m) continue;
          if (m === BED) { blocked = true; break; }
          any++; lastM = m; hard = Math.max(hard, M[m].hp); const cost = Math.min(hp[i], 80) * soft(i) / S.pen * KP * (M[m].loose ? .3 : 1);
          if (s.E >= cost) { s.E -= cost; carve(s, i, cx, cy, m); }
          else { if (hurt(i, s.E * S.pen / KP)) carve(s, i, cx, cy, m); else warm(i, 300, Math.min(M[m].melt * 1.2, 640)); s.E = 0; blocked = true; break; }
        }
        if (any || blocked) {
          if (!s.hit) firstHit(s);
          s.inside = true; s.gap = 0; s.pen += any / S.w;
          sparks(s.x, s.y, hard >= 10 ? 4 : hard > 3 ? 2 : 1, back, 2.5, 80 + hard * 3); if (hard >= 10 && R() < .25) arcs(s.x, s.y, 1, 12);
          if (t - s.snd > .05) { s.snd = t; if (hard >= 10) { K.sfx(900 + R() * 500, .06, 'square', .035, -300); K.noise(.05, .06, 2500); } else if (lastM === GLASS) K.sfx(2400 + R() * 800, .05, 'triangle', .04); else K.noise(.08, .09, 300 + hard * 60); }
          const nv = Math.sqrt(Math.max(0, s.E) / (S.mass * 22)) * 100; s.vx = s.ux * nv; s.vy = s.uy * nv;
          s.crush = cl((1 - s.E / s.E0) * 3.5, s.crush, 4);
          if (blocked || nv < 12) { lodge(s); break; }
        } else if (s.inside) { s.gap += mv * hh; if (s.gap > 3.5) { s.inside = false; sparks(s.x, s.y, 14, Math.atan2(s.uy, s.ux), 1.3, 90); K.noise(.1, .08, 1400); } }
        if (s.hit && S.u.delay && s.travel >= S.u.delay && explosive(s)) { if (s.inside && any) lodge(s); else detonate(s); break; }   // the fuse runs out: buried, it cooks a moment first; in the open it just goes off
      }
    }
  }
  /* ---------- game state ---------- */
  const SV = () => { const s = K.save; if (!s.ss1) s.ss1 = { coins: 0, own: {}, up: {}, stars: {}, total: 0, slots: [{ casing: 'steel', nose: 'round', fill: 'he', liner: 'none', fuse: 'impact' }, { casing: 'steel', nose: 'round', fill: 'he', liner: 'none', fuse: 'impact' }, { casing: 'steel', nose: 'round', fill: 'he', liner: 'none', fuse: 'impact' }] }; return s.ss1; };
  let mode = 'map', coins = 0, own = {}, up = {}, stars = {}, slots = [], total = 0;
  let mullUsed = false, shopSel = null, mapPage = 0;
  let lvl = 0, shots = 0, used = 0, end = null, endT = 0, settle = 0, recoil = 0, msgs = [], res = null, wsSlot = 0, botT = 0, sel = 0, coreT = 0, acc = 0;
  const lv = k => up[k] || 0, owns = (cat, k) => part(cat, k).cost === 0 || !!own[cat + ':' + k];
  const design = i => slots[i] || slots[0];
  function save() { if (K.bot) return; const S = SV(); S.coins = coins; S.own = own; S.up = up; S.stars = stars; S.slots = slots; S.total = total; K.persist(); }
  function say(s, c = '#fff') { msgs.push({ s, c, t: 0 }); if (msgs.length > 2) msgs.shift(); }
  const WIDE = [WW / 2, 452, .8], ZC = 2.1, cam = { x: WIDE[0], y: WIDE[1], z: WIDE[2] };
  function startLevel(n) {
    lvl = n; build(n); GUN.y = (() => { for (let y = 0; y < GH; y++) if (mat[idx(GUN.x, y)]) return y; return GY; })();
    for (let x = 0; x <= GUN.x + 40; x++) for (let y = GUN.y - 70; y < GUN.y; y++) set(x, y, E);
    parts.length = 0; fx.length = 0; shells.length = 0; bodies.length = 0; blasts.length = 0; hots.length = 0;
    shots = 8 + lv('rack'); used = 0; mullUsed = false; end = null; endT = 0; settle = 0; mode = 'play'; msgs = []; coreT = 0; acc = 0;
    phase = 'aim'; charge = 0; hitT = -1; after = 0; slowT = 0; autoCur = 1; paused = false; ffwd = 0; more = false; recoil = 0;
    cam.x = WIDE[0]; cam.y = WIDE[1]; cam.z = WIDE[2];
    ang = .5; pow = .7; say(`${n + 1}. ${LEVELS[n].n}: ${LEVELS[n].hint}`, '#ffd890');
  }
  function finish(win) {
    const L = LEVELS[lvl], st = win ? (used <= L.par ? 3 : used <= L.par + 1 ? 2 : 1) : 0, first = win && !stars[lvl];
    let got = 0; if (win) { got = Math.round(L.reward * (.6 + .2 * st) * (first ? 1 : .35) * (1 + lv('salvage') * .1)); if (st > (stars[lvl] || 0)) stars[lvl] = st; coins += got; total += got; K.score = total; K.chime(523, [0, 4, 7, 12, 16]); } else K.sfx(160, .5, 'sawtooth', .07, -60);
    res = { win, st, got, first }; mode = 'result'; save();
  }
  /* ---------- input ---------- */
  const btn = {}, inR = (b, x, y) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  const keys = new Set();
  const toWorld = (sx, sy) => [(sx - 640) / cam.z + cam.x, (sy - 360) / cam.z + cam.y];
  const pivotPx = () => [GUN.x * CS, (GUN.y - PH) * CS];
  function aimAt(x, y) { const [wx, wy] = toWorld(x, y), [px, py] = pivotPx(), dx = wx - px, dy = py - wy; ang = cl(Math.atan2(dy, dx), -.08, 1.42); pow = cl((Math.hypot(dx, dy) - 70) / 860, .12, 1); }
  GAME.down = (x, y) => {
    K.audio && K.audio();
    for (const k in btn) if (inR(btn[k], x, y)) return press(k);
    if (more) { more = false; return; }
    if (mode === 'play' && phase === 'aim' && !end && y < 616) { aiming = true; aimAt(x, y); }
  };
  GAME.move = (x, y) => { if (aiming && mode === 'play' && phase === 'aim') aimAt(x, y); };
  GAME.up = (x, y) => { if (aiming && mode === 'play' && phase === 'aim') { aiming = false; const [wx, wy] = x == null ? [1e4, 0] : toWorld(x, y), [px, py] = pivotPx(); if (Math.hypot(wx - px, wy - py) > 70) fire(); } aiming = false; };
  GAME.key = (c, d) => {
    if (d) keys.add(c); else keys.delete(c);
    if (!d) return;
    if (mode === 'play') {
      if (phase === 'aim') { if (c === 'Space' || c === 'Enter') fire(); if (c === 'Digit1' || c === 'Digit2' || c === 'Digit3') slot = +c.slice(5) - 1; if (c === 'KeyR') startLevel(lvl); }
      else { if (c === 'Space' || c === 'Enter') press(hitT < 0 ? 'skip' : 'finish'); if (c === 'KeyP') press('pause'); if (c === 'KeyF') press('finish'); if (c === 'KeyX') press('speed'); if (c === 'KeyC') press('wide'); }
      return;
    }
    if (mode === 'result' && (c === 'Enter' || c === 'Space')) press(res.win && lvl < LEVELS.length - 1 ? 'next' : 'map');
    if (mode === 'map') { if (c === 'ArrowRight') sel = Math.min(LEVELS.length - 1, sel + 1); if (c === 'ArrowLeft') sel = Math.max(0, sel - 1); if (c === 'ArrowDown') sel = Math.min(LEVELS.length - 1, sel + 6); if (c === 'ArrowUp') sel = Math.max(0, sel - 6); mapPage = Math.floor(sel / 18); if (c === 'Enter' || c === 'Space') press('lvl' + sel); if (c === 'KeyW') press('shop'); }
    if (mode === 'shop' && (c === 'Escape' || c === 'Enter')) press('back');
  };
  const unlocked = n => n === 0 || !!stars[n - 1];
  function press(k) {
    if (k.startsWith('lvl')) { const n = +k.slice(3); sel = n; mapPage = Math.floor(n / 18); if (!unlocked(n)) { say('Clear the level before it first', '#ff8a8a'); return; } return startLevel(n); }
    if (k === 'shop') { mode = 'shop'; shopSel = null; return; }
    if (k === 'pg0' || k === 'pg1') { mapPage = +k.slice(2); return; }
    if (k === 'back' || k === 'map' || k === 'menu') { mode = 'map'; return; }
    if (k === 'next') { if (unlocked(lvl + 1)) startLevel(lvl + 1); else mode = 'map'; return; }
    if (k === 'retry' || k === 'reset') return startLevel(lvl);
    if (k === 'fire') return fire();
    if (k === 'pause') { paused = !paused; return; }
    if (k === 'finish') { if (phase === 'shot') { ffwd = 2; paused = false; } return; }
    if (k === 'skip') { if (phase === 'shot' && hitT < 0) { ffwd = 1; paused = false; } return; }
    if (k === 'speed') { speedI = (speedI + 1) % SPEEDS.length; return; }
    if (k === 'more') { more = !more; return; }
    if (k === 'wide') { wide = !wide; more = false; return; }
    if (k === 'cash') { K.score = total; K.over({ title: 'Range closed', text: `You earned ${total.toLocaleString('en-US')} coins and ${Object.values(stars).reduce((a, b) => a + b, 0)} stars.` }); return; }
    if (k.startsWith('slot')) { slot = +k.slice(4); return; }
    if (k.startsWith('ws')) { wsSlot = +k.slice(2); return; }
    if (k.startsWith('p:')) {   // a part you own goes straight on; one you do not is shown first, and a second tap buys it
      const [, cat, pk] = k.split(':'), p = part(cat, pk), looking = shopSel && shopSel[0] === cat && shopSel[1] === pk; shopSel = [cat, pk];
      if (!owns(cat, pk)) { if (!looking) return; if (coins < p.cost) { say('Not enough coins', '#ff8a8a'); return; } coins -= p.cost; own[cat + ':' + pk] = true; K.chime(660, [0, 4, 7]); }
      slots[wsSlot] = { ...slots[wsSlot], [cat]: pk }; save(); return;
    }
    if (k.startsWith('u:')) { const u = UPG.find(q => q.k === k.slice(2)), l = lv(u.k); if (l >= u.max) return; if (coins < u.cost(l)) { say('Not enough coins', '#ff8a8a'); return; } coins -= u.cost(l); up[u.k] = l + 1; K.chime(660, [0, 4, 7, 12]); save(); return; }
  }
  /* ---------- kit hooks ---------- */
  const BOTLV = [9, 3, 12, 0, 10, 1, 22, 4, 18, 2, 6]; let botN = 0;   // the attract demo works through these
  GAME.reset = () => {
    const S = SV(); coins = S.coins || 0; own = { ...(S.own || {}) }; up = { ...(S.up || {}) }; stars = { ...(S.stars || {}) }; total = S.total || 0; slots = (S.slots || []).map(d => ({ ...d })); while (slots.length < 3) slots.push({ casing: 'steel', nose: 'round', fill: 'he', liner: 'none', fuse: 'impact' });
    mode = 'map'; msgs = []; K.score = total; sel = Math.max(0, LEVELS.findIndex((L, i) => !stars[i])); if (sel < 0) sel = LEVELS.length - 1; mapPage = Math.floor(sel / 18); speedI = 0; wide = false;
    if (K.bot) { up = { barrel: 2, fillq: 2, rack: 1 }; slots = [{ casing: 'tung', nose: 'point', fill: 'he', liner: 'cu', fuse: 'impact' }, { casing: 'steel', nose: 'round', fill: 'therm', liner: 'none', fuse: 'impact' }, { casing: 'steel', nose: 'point', fill: 'he', liner: 'none', fuse: 'short' }]; startLevel(BOTLV[botN++ % BOTLV.length]); botT = 1.2; }
  };
  function endShot() { phase = 'aim'; ffwd = 0; paused = false; slowT = 0; more = false; }
  function simStep() {
    const h = 1 / 60;
    stepShells(h); stepHots(h); stepParts(h); stepBodies(h); stepCells(h);
    for (const b of blasts) b.t += h; while (blasts.length && blasts[0].t > 1) blasts.shift();
    if (dirty && (frame % 6 === 0)) { dirty = false; support(); }
    if (phase === 'shot' && charge <= 0) {
      if (hitT >= 0) hitT += h;
      if (!shells.length) { after += h; if (hots.length && after > afterMax() - .6) after = afterMax() - .6; if ((after >= afterMax() && !bodies.length) || after > 9) endShot(); }
    }
  }
  const afterMax = () => hitT >= 0 ? 5.2 : .7;
  function stepFx(dt) {
    for (let k = fx.length - 1; k >= 0; k--) {
      const f = fx[k]; f.t += dt;
      if (f.k === 's') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy *= .98; f.r += dt * 3; }
      else if (f.k === 'f') { f.x += f.vx * dt; f.y += f.vy * dt; }
      else if (f.k === 'g') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .97; f.vy *= .97; }
      else if (f.k === 'e') { f.vy += G * .12 * dt; f.vx *= .975; f.vy *= .975; f.x += f.vx * dt; f.y += f.vy * dt; }
      else if (f.k === 'k') { f.vy += G * .6 * dt; f.vx *= .985; const nx = f.x + f.vx * dt, ny = f.y + f.vy * dt, cx = Math.floor(nx), cy = Math.floor(ny); if (inb(cx, cy) && isStatic(mat[idx(cx, cy)])) { f.vy *= -.35; f.vx *= .6; } else { f.x = nx; f.y = ny; } }
      if (f.t > f.l) fx.splice(k, 1);
    }
  }
  GAME.update = dt => {
    t += dt; for (const m of msgs) m.t += dt; msgs = msgs.filter(m => m.t < 3.4);
    if (mode !== 'play') return;
    if (phase === 'aim' && keys.size) { const fast = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.5 : 1; if (keys.has('ArrowLeft') || keys.has('KeyA')) ang = cl(ang + dt * .5 * fast, -.08, 1.42); if (keys.has('ArrowRight') || keys.has('KeyD')) ang = cl(ang - dt * .5 * fast, -.08, 1.42); if (keys.has('ArrowUp') || keys.has('KeyW')) pow = cl(pow + dt * .35 * fast, .12, 1); if (keys.has('ArrowDown') || keys.has('KeyS')) pow = cl(pow - dt * .35 * fast, .12, 1); }
    recoil = Math.max(0, recoil - dt * 2.2);
    let steps = 0;
    if (phase === 'shot') {
      if (!paused) {
        if (charge > 0) { charge -= dt * (ffwd ? 4 : 1); if (charge <= 0) launch(); }
        else {
          slowT = Math.max(0, slowT - dt);
          const flying = shells.some(s => !s.small && !s.hit), target = slowT > 0 ? .4 : flying ? .6 : 1;
          autoCur = lp(autoCur, target, 1 - Math.exp(-dt * (target < autoCur ? 16 : 3)));
          if (ffwd) steps = ffwd === 2 ? 10 : 8; else { acc = Math.min(acc + dt * SPEEDS[speedI] * autoCur, .1); while (acc >= 1 / 60) { acc -= 1 / 60; steps++; } }
        }
      }
    } else { autoCur = 1; acc = Math.min(acc + dt, .1); while (acc >= 1 / 60) { acc -= 1 / 60; steps++; } }
    let done = 0;
    for (let q = 0; q < steps; q++) { simStep(); done++; if (ffwd === 1 && (hitT >= 0 || !shells.length || shells.some(s => s.near))) ffwd = 0; if (!ffwd && q >= 3) break; if (phase !== 'shot' && q >= 3) break; }
    stepFx(done / 60); stepCam(dt);
    if ((coreT += dt) > .2) { coreT = 0; let n = 0; for (let i = 0; i < N; i++) if (mat[i] === CORE) n++; for (const b of bodies) for (const c of b.cells) if (c.m === CORE && !c.dead) n++; coreLeft = n; }
    if (!end) {
      if (coreLeft <= coreN * .1) { end = 'win'; endT = 0; word = 'Core destroyed!'; K.shake(10); K.chime(392, [0, 7, 12]); }
      else if (phase === 'aim' && shots <= 0) { settle += dt; if (settle > 1.3) { end = 'lose'; endT = 0; } }
    } else { endT += dt; if (endT > (end === 'win' ? 3 : .9)) { if (K.bot) { startLevel(BOTLV[botN++ % BOTLV.length]); botT = 1.4; } else { endShot(); finish(end === 'win'); } } }
  };
  function stepCam(dt) {
    let tx = WIDE[0], ty = WIDE[1], tz = WIDE[2], rate = 4.5;
    if (phase === 'shot' && !wide && ffwd !== 2 && !(end && endT > 1.6)) {
      tz = ZC; rate = 8;
      if (charge > 0) { const [mx, my] = muzzle(); tx = (mx - 10) * CS; ty = (my + 6) * CS; rate = 6; }
      else {
        const s = shells.find(q => !q.small);
        if (s && !s.hit) { const lead = (paused ? 0 : SPEEDS[speedI] * autoCur) / rate; focus[0] = s.x - s.ux * 6 + s.vx * lead; focus[1] = s.y - s.uy * 6 + s.vy * lead; }
        tx = focus[0] * CS; ty = Math.min(focus[1] * CS, WH - 360 / tz + 70);
      }
    }
    const k = 1 - Math.exp(-dt * rate), kz = 1 - Math.exp(-dt * 5);
    cam.x = lp(cam.x, tx, k); cam.y = lp(cam.y, ty, k); cam.z = lp(cam.z, tz, kz);
  }
  // aim with a quick ballistic search: the path that gets closest to the core before it hits anything else
  function solve(d) {
    const cs = []; for (let i = 0; i < N; i++) if (mat[i] === CORE) cs.push(i); if (!cs.length) return null; const c0 = cs[0], x0 = c0 % GW, y0 = (c0 / GW) | 0; let cx = 0, cy = 0, n = 0; for (const i of cs) { const x = i % GW, y = (i / GW) | 0; if (Math.abs(x - x0) < 18 && Math.abs(y - y0) < 18) { cx += x; cy += y; n++; } }
    if (!n) return null; cx /= n; cy /= n; let best = null;
    for (let a = -.06; a < 1.38; a += .03) for (let p = .2; p <= 1; p += .025) {
      let [vx, vy] = vel(d, a, p), [x, y] = muzzle(a), md = 1e9;
      let hx = -1, hy = 0;
      for (let s = 0; s < 1000; s++) { vy += G / 90; x += vx / 90; y += vy / 90; if (y > GH || x > GW || x < 0) break; const dd = Math.hypot(x - cx, y - cy); if (dd < md) md = dd; if (y > 0) { const m = mat[idx(Math.floor(x), Math.floor(y))]; if (m) { hx = x; hy = y; break; } } }
      if (hx < 0) continue;
      // what still stands between where it lands and the core
      let wall = 0; const L = Math.hypot(cx - hx, cy - hy); for (let q = 0; q < L; q++) { const i = idx(Math.floor(hx + (cx - hx) * q / L), Math.floor(hy + (cy - hy) * q / L)), m = mat[i]; if (m && m !== CORE) wall += m === BED ? 99 : Math.min(40, hp[i]); }
      const sp = Math.hypot(vx, vy) || 1, aim = L > 1 ? (vx * (cx - hx) + vy * (cy - hy)) / (sp * L) : 1, sc = L * .4 + wall * .5 + (1 - aim) * 16 + a * 1.2; if (!best || sc < best.sc) best = { a, p, sc };
    }
    return best;
  }
  GAME.bot = dt => {
    if (mode !== 'play' || end || phase !== 'aim') return;
    if ((botT -= dt) > 0) { if (GAME._aim) { ang = lp(ang, GAME._aim.a, dt * 3); pow = lp(pow, GAME._aim.p, dt * 3); } return; }
    if (!GAME._aim) { slot = used % 3; GAME._aim = solve(design(slot)); if (GAME._aim) { GAME._aim.a += (R() - .5) * .02; } botT = 1.1; return; }
    ang = GAME._aim.a; pow = GAME._aim.p; fire(); GAME._aim = null; botT = .8;
  };
  let posed = false;
  /* ---------- drawing ---------- */
  function tx(g, s, x, y, font, c, al = 'center', st) { g.font = font; g.textAlign = al; g.textBaseline = 'middle'; if (st) { g.lineWidth = st; g.strokeStyle = 'rgba(4,8,16,.7)'; g.strokeText(s, x, y); } g.fillStyle = c; g.fillText(s, x, y); }
  const F = (px, w = 800) => `${w} ${px}px Nunito, sans-serif`, D = px => `${px}px "Russo One", sans-serif`;
  function rr(g, x, y, w, h, r, fill, stroke, lw = 2) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
  const INK = '#e6edf7', DIM = '#8a98ad', OFF = '#4f5d74', TEAL = '#4fe0c8', ORANGE = '#ff8a1e', GOLD = '#ffd23f', PAN = 'rgba(15,24,40,.94)', EDGE = '#24344c';
  function panel(g, x, y, w, h, r = 10, on) { rr(g, x, y, w, h, r, PAN, on ? ORANGE : EDGE, 2); }
  function hbtn(g, k, x, y, w, h, label, o = {}) {
    if (!o.off) btn[k] = { x, y, w, h };
    if (o.hot) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#ff9c34'); gr.addColorStop(1, '#f07c10'); rr(g, x, y, w, h, 9, gr, '#ffb866', 1.5); }
    else rr(g, x, y, w, h, 9, o.fill || 'rgba(24,36,56,.96)', EDGE, 1.5);
    tx(g, label, x + w / 2, y + h / 2 + (o.sub ? -8 : 1), F(o.px || 16), o.off ? OFF : o.hot ? '#1c1204' : (o.c || INK)); if (o.sub) tx(g, o.sub, x + w / 2, y + h / 2 + 13, F(11, 700), o.hot ? '#3a2408' : DIM);
  }
  const wc = document.createElement('canvas'); wc.width = GW; wc.height = GH; const wx = wc.getContext('2d'), img = wx.createImageData(GW, GH), d32 = new Uint32Array(img.data.buffer);
  const GW2 = GW / 2, GH2 = GH / 2, gc = document.createElement('canvas'); gc.width = GW2; gc.height = GH2; const gx = gc.getContext('2d'), gimg = gx.createImageData(GW2, GH2), gacc = new Float32Array(GW2 * GH2 * 3);
  // draw anything through a low-res buffer so it comes out as crisp pixel art (ps = world px per art pixel)
  const pool = {};
  function pix(g, x0, y0, w, h, ps, fn, soft) {
    x0 = Math.floor(x0 / ps) * ps; y0 = Math.floor(y0 / ps) * ps;
    const cw = Math.max(1, Math.ceil(w / ps)), ch = Math.max(1, Math.ceil(h / ps)), key = cw + 'x' + ch;
    let c = pool[key]; if (!c) { c = document.createElement('canvas'); c.width = cw; c.height = ch; c.x = c.getContext('2d', { willReadFrequently: true }); pool[key] = c; }
    const x = c.x; x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.clearRect(0, 0, cw, ch); x.save(); x.setTransform(1 / ps, 0, 0, 1 / ps, -x0 / ps, -y0 / ps); fn(x); x.restore();
    const im = x.getImageData(0, 0, cw, ch), d = im.data; for (let i = 3; i < d.length; i += 4) d[i] = soft ? (d[i] < 24 ? 0 : Math.min(255, Math.round(d[i] / 64) * 64 + 40)) : d[i] > 100 ? 255 : 0; x.putImageData(im, 0, 0);
    g.save(); g.imageSmoothingEnabled = false; g.drawImage(c, x0, y0, cw * ps, ch * ps); g.restore();
  }
  /* the yard at night: flat navy, with gantry cranes standing in the dark behind */
  const CRANES = [[], []];
  { let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let L = 0; L < 2; L++) for (let x = -900; x < 2700; x += L ? 520 + rnd() * 260 : 330 + rnd() * 240) CRANES[L].push({ x: Math.round(x / 8) * 8, h: Math.round((L ? 380 + rnd() * 300 : 300 + rnd() * 420) / 8) * 8, w: Math.round((200 + rnd() * 260) / 8) * 8, s: rnd() < .5 ? -1 : 1, b: .3 + rnd() * .4, c: rnd() }); }
  function backdrop(g) {
    const v = K.view; g.fillStyle = '#0b1422'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    for (let L = 0; L < 2; L++) {
      const par = L ? .5 : .24, zl = WIDE[2] * (1 + (cam.z / WIDE[2] - 1) * par * 1.1), ox = WIDE[0] + (cam.x - WIDE[0]) * par, oy = WIDE[1] + (cam.y - WIDE[1]) * par, gy0 = 704;
      g.save(); g.translate(640, 360); g.scale(zl, zl); g.translate(-ox, -oy); g.fillStyle = L ? '#132136' : '#0f1a2b';
      for (const c of CRANES[L]) {
        const top = gy0 - c.h; g.fillRect(c.x - 16, top, 32, c.h + 200); g.fillRect(c.x - c.w * (c.s > 0 ? .3 : .7), top - 40, c.w, 40);
        g.fillRect(c.x - 32, top + Math.round(c.h * c.b / 8) * 8, 64, 96); const hx = c.x + c.s * c.w * .5; g.fillRect(hx - 3, top, 6, Math.round(c.h * (.3 + c.c * .4) / 8) * 8); g.fillRect(hx - 24, top + Math.round(c.h * (.3 + c.c * .4) / 8) * 8, 48, 48);
        if (c.c > .5) g.fillRect(c.x + c.s * 44, top + 40, 10, c.h * .6);
      }
      g.restore();
    }
  }
  const HC = { tan: [226, 188, 116], tan2: [238, 172, 86], pur: [168, 118, 178], pur2: [188, 102, 158], or: [255, 142, 28], red: [248, 86, 26], yel: [255, 212, 72] }, WHT = rgb(255, 251, 238), YEL = rgb(255, 222, 96);
  function heatCol(c, T, m, x, y) {   // heat shows up block by block: sand, violet, orange, red, yellow, then white
    const mm = M[m], r = c & 255, gg = (c >> 8) & 255, b = (c >> 16) & 255;
    if (mm.burns) { const k = cl(T / mm.melt, 0, 1), e = hsh(x + ((t * 6) | 0) * 7, y) < k * .5 ? 1 : k * .3; return rgb(lp(r, 255, e) | 0, lp(gg, 120, e) | 0, lp(b, 30, e) | 0); }
    if (m === CORE) { const k = cl(T / 430, 0, 1); return rgb(255, lp(gg, 240, k) | 0, lp(b, 230, k) | 0); }
    if (T > mm.melt * .8 || T > 600) return hsh(x * 3 + ((t * 9) | 0), y * 5) < .1 ? YEL : WHT;
    const k = T / 560, h = hsh(x >> 1, y >> 1); let q, a = 1;
    if (k < .17) { q = HC.tan; a = cl(.18 + h * .3 + (k - .05) * 3, 0, .8); }
    else if (k < .3) { q = h < .2 ? HC.pur : HC.tan; a = h < .2 ? .85 : .7 + h * .3; }
    else if (k < .44) q = h < .28 ? HC.pur2 : h < .62 ? HC.tan2 : HC.tan;
    else if (k < .6) q = h < .7 ? HC.or : h < .86 ? HC.tan2 : HC.pur2;
    else if (k < .78) q = h < .55 ? HC.red : HC.or;
    else q = h < .24 ? HC.yel : h < .62 ? HC.or : HC.red;
    return rgb(lp(r, q[0], a) | 0, lp(gg, q[1], a) | 0, lp(b, q[2], a) | 0);
  }
  function drawWorld(g) {
    gacc.fill(0); const pulse = .8 + Math.sin(t * 5) * .2;
    for (let i = 0; i < N; i++) {
      const m = mat[i]; if (!m) { d32[i] = 0; continue; }
      let c = col[i]; const T = heat[i];
      if (T > 30) {
        const x = i % GW, y = (i / GW) | 0; c = heatCol(c, T, m, x, y);
        if (T > 130) { const j = ((y >> 1) * GW2 + (x >> 1)) * 3, gl = cl((T - 130) / 600, 0, .75); gacc[j] += gl * .5; gacc[j + 1] += gl * .22; gacc[j + 2] += gl * .05; }
      } else if (m === CORE) { const x = i % GW, y = (i / GW) | 0, j = ((y >> 1) * GW2 + (x >> 1)) * 3; c = rgb(255, cl(((c >> 8) & 255) * pulse + 24 * (1 - pulse), 0, 255) | 0, (c >> 16) & 255); gacc[j] += .26 * pulse; gacc[j + 1] += .05; gacc[j + 2] += .12 * pulse; }
      d32[i] = c;
    }
    for (const b of bodies) {   // tumbling chunks, rotated pixel by pixel
      const cs = Math.cos(b.a), sn = Math.sin(b.a), x0 = Math.max(0, Math.floor(b.x - b.rad)), x1 = Math.min(GW - 1, Math.ceil(b.x + b.rad)), y0 = Math.max(0, Math.floor(b.y - b.rad)), y1 = Math.min(GH - 1, Math.ceil(b.y + b.rad)), cool = Math.exp(-b.age * .2);
      for (let gy = y0; gy <= y1; gy++) for (let gxx = x0; gxx <= x1; gxx++) {
        const dx = gxx + .5 - b.x, dy = gy + .5 - b.y, cx = Math.round(cs * dx + sn * dy - b.ox), cy = Math.round(-sn * dx + cs * dy - b.oy); if (cx < 0 || cy < 0 || cx >= b.mw || cy >= b.mh) continue;
        const k = b.map[cy * b.mw + cx]; if (k < 0) continue; const q = b.cells[k]; if (q.dead) continue; const T = q.t * cool;
        d32[gy * GW + gxx] = T > 30 ? heatCol(q.c, T, q.m, cx + 7, cy + 3) : q.c;
        if (T > 130 || q.m === CORE) { const j = ((gy >> 1) * GW2 + (gxx >> 1)) * 3, gl = q.m === CORE ? .4 : cl((T - 130) / 600, 0, .75); gacc[j] += gl * .5; gacc[j + 1] += gl * .2; gacc[j + 2] += gl * (q.m === CORE ? .25 : .05); }
      }
    }
    for (const p of parts) { if (p.k !== 1 && p.k !== 3) continue; const x = Math.floor(p.x) >> 1, y = Math.floor(p.y) >> 1; if (x < 0 || y < 0 || x >= GW2 || y >= GH2) continue; const j = (y * GW2 + x) * 3; gacc[j] += .34; gacc[j + 1] += p.k === 3 ? .08 : .17; gacc[j + 2] += p.k === 3 ? .16 : .04; }
    // the ground runs on past the edges of the range
    const eL = (() => { for (let y = 0; y < GH; y++) if (mat[idx(0, y)]) return y; return GH; })(), eR = (() => { for (let y = 0; y < GH; y++) if (mat[idx(GW - 1, y)]) return y; return GH; })();
    g.fillStyle = '#1a2634'; g.fillRect(-3000, eL * CS, 3000, 3000); g.fillRect(WW, eR * CS, 3000, 3000); g.fillRect(0, WH - 1, WW, 3000); g.fillStyle = '#3c586c'; g.fillRect(-3000, eL * CS, 3000, CS); g.fillRect(WW, eR * CS, 3000, CS); g.fillStyle = '#26384a'; g.fillRect(-3000, eL * CS + CS, 3000, CS); g.fillRect(WW, eR * CS + CS, 3000, CS);
    wx.putImageData(img, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(wc, 0, 0, WW, WH);
    const gd = gimg.data; for (let j = 0, q = 0; j < gacc.length; j += 3, q += 4) { gd[q] = cl(gacc[j] * 255, 0, 255); gd[q + 1] = cl(gacc[j + 1] * 255, 0, 255); gd[q + 2] = cl(gacc[j + 2] * 255, 0, 255); gd[q + 3] = 255; }
    gx.putImageData(gimg, 0, 0); g.save(); g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true; g.globalAlpha = .42; g.drawImage(gc, -6, -6, WW + 12, WH + 12); g.globalAlpha = .3; g.drawImage(gc, -28, -28, WW + 56, WH + 56); g.restore();
  }
  function drawParts(g) {
    const q = 2;
    for (const p of parts) {
      const x = Math.floor(p.x * CS / q) * q, y = Math.floor(p.y * CS / q) * q;
      if (p.k === 1) { const T = p.h - p.t * 230; g.fillStyle = T > 760 ? '#fffbe8' : T > 520 ? '#ffd84a' : T > 330 ? '#ff9a2a' : '#d8521e'; g.fillRect(x, y, 3, 3); }
      else if (p.k === 3) { g.fillStyle = '#ff7896'; g.fillRect(x, y, 3, 3); }
      else { const c = p.c; g.fillStyle = `rgb(${c & 255},${(c >> 8) & 255},${(c >> 16) & 255})`; g.fillRect(x, y, p.k === 2 ? 2 : 3, p.k === 2 ? 2 : 3); }
    }
  }
  function drawFx(g) {
    for (const f of fx) {
      const k = f.t / f.l;
      if (f.k === 's') { g.fillStyle = `rgba(60,74,96,${(.13 * (1 - k)).toFixed(3)})`; g.beginPath(); g.arc(f.x * CS, f.y * CS, f.r * CS, 0, TAU); g.fill(); }
      else if (f.k === 'k') { const h = 1 - k, c = h > .7 ? '255,252,235' : h > .42 ? '255,214,120' : h > .2 ? '255,150,60' : '200,84,40', x = f.x * CS, y = f.y * CS; g.strokeStyle = `rgba(${c},${Math.min(1, h * 1.7).toFixed(2)})`; g.lineWidth = f.w; g.beginPath(); g.moveTo(x, y); g.lineTo(x - f.vx * .045 * CS, y - f.vy * .045 * CS); g.stroke(); if (f.st && h > .25) { g.lineWidth = .7; g.beginPath(); g.moveTo(x - 2.4, y); g.lineTo(x + 2.4, y); g.moveTo(x, y - 2.4); g.lineTo(x, y + 2.4); g.stroke(); } }
      else if (f.k === 'a') { g.strokeStyle = `rgba(${f.c},${(.85 * (1 - k)).toFixed(2)})`; g.lineWidth = .8; g.beginPath(); f.p.forEach((q, i) => i ? g.lineTo(q[0] * CS, q[1] * CS) : g.moveTo(q[0] * CS, q[1] * CS)); g.stroke(); g.fillStyle = `rgba(220,250,255,${(1 - k).toFixed(2)})`; const q = f.p[1]; g.fillRect(q[0] * CS - 1, q[1] * CS - 1, 2, 2); }
      else if (f.k === 'g') { const a = Math.min(1, f.t * 9) * Math.pow(1 - k, 1.3), x = f.x * CS, y = f.y * CS, r = f.r * CS * (1 + k * .35); g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,214,120,${(.62 * a).toFixed(3)})`); gr.addColorStop(.45, `rgba(255,140,44,${(.36 * a).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
      else if (f.k === 'x') { const x = f.x * CS, y = f.y * CS, r = f.r * CS * (.7 + k * .6); g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,246,${(1 - k * k).toFixed(3)})`); gr.addColorStop(.38, `rgba(255,236,170,${(.95 * (1 - k)).toFixed(3)})`); gr.addColorStop(.7, `rgba(255,150,50,${(.5 * (1 - k)).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
      else if (f.k === 'v') { const x = f.x * CS, y = f.y * CS, r = f.r * CS; g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); g.rotate(f.a); const gr = g.createLinearGradient(0, 0, r, 0); gr.addColorStop(0, `rgba(255,214,140,${(.5 * (1 - k)).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -4); g.lineTo(r, -r * .34); g.lineTo(r, r * .34); g.lineTo(0, 4); g.closePath(); g.fill(); g.restore(); }
      else if (f.k === 'e') { const a = Math.min(1, (1 - k) * 2.5) * .9, x = f.x * CS, y = f.y * CS, r = f.r * CS; g.globalAlpha = a; g.fillStyle = k < .6 ? '#a8582a' : '#7a3c1c'; g.beginPath(); g.ellipse(x, y, r * .75, r * 1.05, .3, 0, TAU); g.fill(); g.fillStyle = k < .4 ? '#f0b070' : k < .7 ? '#d08444' : '#a8582a'; g.beginPath(); g.ellipse(x - r * .12, y - r * .2, r * .38, r * .55, .3, 0, TAU); g.fill(); g.globalAlpha = 1; }
      else if (f.k === 'f') { g.fillStyle = `rgba(255,${(190 - k * 120) | 0},50,${(1 - k).toFixed(2)})`; const s = 3 + k * 4; g.fillRect(Math.floor(f.x * CS / 2) * 2 - s / 2, Math.floor(f.y * CS / 2) * 2 - s / 2, s, s); }
      else if (f.k === 'j' || f.k === 'r') { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = f.k === 'j' ? `rgba(255,232,170,${1 - k})` : `rgba(255,200,120,${.6 * (1 - k)})`; g.lineWidth = f.k === 'j' ? 7 * (1 - k) + 2 : 1.2; g.beginPath(); g.moveTo(f.x * CS, f.y * CS); g.lineTo(f.x2 * CS, f.y2 * CS); g.stroke(); g.restore(); }
    }
  }
  const FILLC = { he: '#e8b83e', frag: '#aab2bc', therm: '#ff7a2a', incend: '#ff5a3c', cluster: '#4fd0e8', tandem: '#f0d060', plasma: '#b48cff', none: '#56606e' };
  const NOSE = { round: [17, .2, 1, 2.6], flat: [7, .1, 1, 8], point: [27, .42, .82, .7], ap: [27, .42, .82, .7], drill: [34, .62, .5, .5] };   // length, curve, shoulder, tip half-height
  const shellL = d => ({ 3: 78, 5: 72, 7: 82 }[part('cal', d.cal).w]), shellR = d => ({ 3: 6.5, 5: 10, 7: 13.5 }[part('cal', d.cal).w]);
  // a shell pointing right with its nose at (0,0); o.cut fades in the cut-away, o.crush flattens the nose
  function shellArt(g, d, o = {}) {
    const [cr, cg, cb] = casC(d), crush = (o.crush || 0) * CS, cut = o.cut || 0, r = shellR(d), kr = r / 10, N = NOSE[d.nose] || NOSE.round, pt = part('paint', d.paint);
    const L = Math.max(30, shellL(d) - crush * .85), nl = Math.max(4, N[0] - crush * .7), flat = Math.max(N[3] * kr, cl(crush / 30, 0, 1) * r * .8);
    const cA = `rgb(${cr},${cg},${cb})`, cL = `rgb(${Math.min(255, cr + 38)},${Math.min(255, cg + 38)},${Math.min(255, cb + 38)})`, cD = `rgb(${cr * .72 | 0},${cg * .72 | 0},${cb * .74 | 0})`;
    const path = () => { g.beginPath(); g.moveTo(-L, -r * .8); g.lineTo(-L + 7, -r); g.lineTo(-nl, -r); g.quadraticCurveTo(-nl * N[1], -r * N[2], 0, -flat); g.lineTo(0, flat); g.quadraticCurveTo(-nl * N[1], r * N[2], -nl, r); g.lineTo(-L + 7, r); g.lineTo(-L, r * .8); g.closePath(); };
    path(); g.fillStyle = cA; g.fill();
    g.save(); path(); g.clip();
    g.fillStyle = cL; g.fillRect(-L, -r, L, 4.2 * kr); g.fillStyle = cD; g.fillRect(-L, r - 4.6 * kr, L, 4.6 * kr);
    if (pt.c) {   // paint on the body, between the bands and the nose
      const x0 = -L + 23, x1 = -nl - 1, c = pt.c;
      if (x1 - x0 > 4) { g.save(); g.beginPath(); g.rect(x0, -r, x1 - x0, 2 * r); g.clip(); g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; g.fillRect(x0, -r, x1 - x0, 2 * r);
        if (pt.stripe) { g.fillStyle = '#1c1c20'; for (let x = x0 - 2 * r; x < x1; x += 12) { g.beginPath(); g.moveTo(x, r); g.lineTo(x + 6, r); g.lineTo(x + 6 + r * 1.5, -r); g.lineTo(x + r * 1.5, -r); g.closePath(); g.fill(); } }
        g.fillStyle = 'rgba(255,255,255,.26)'; g.fillRect(x0, -r, x1 - x0, 4.2 * kr); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x0, r - 4.6 * kr, x1 - x0, 4.6 * kr); g.restore(); }
    }
    if (d.nose === 'ap') { g.fillStyle = '#3d4654'; g.fillRect(-nl * .62, -r, nl, 2 * r); g.fillStyle = '#5a6676'; g.fillRect(-nl * .62, -r, nl, 3.5 * kr); g.fillStyle = '#e8b23a'; g.fillRect(-nl * .62 - 2.5, -r, 2.5, 2 * r); }
    if (d.nose === 'drill') { g.fillStyle = '#3d4654'; g.fillRect(-nl, -r, nl, 2 * r); g.strokeStyle = '#93a2b4'; g.lineWidth = 1.4; for (let x = -nl + 2; x < 0; x += 6) { g.beginPath(); g.moveTo(x, -r); g.lineTo(x + 6, r); g.stroke(); } g.fillStyle = '#e8b23a'; g.fillRect(-nl - 2.5, -r, 2.5, 2 * r); }
    if (d.nose === 'flat') { g.fillStyle = '#3d4654'; g.fillRect(-3.2, -r, 3.2, 2 * r); g.fillStyle = '#c8553a'; g.fillRect(-nl - 2, -r, 2, 2 * r); }
    if (cut > 0) {   // the cut-away: filler, liner and fuse
      g.globalAlpha = cut; const x0 = -L + 25, x1 = -nl * .55, hh = Math.max(3, r - 3.4 * kr);
      if (x1 - x0 > 6) {
        g.fillStyle = '#121a26'; g.beginPath(); g.roundRect(x0, -hh, x1 - x0, hh * 2, 4 * kr); g.fill();
        g.fillStyle = FILLC[d.fill] || '#56606e'; g.beginPath(); g.roundRect(x0 + 1.5, -hh + 1.5, x1 - x0 - 3, hh * 2 - 3, 3.5 * kr); g.fill();
        g.fillStyle = 'rgba(0,0,0,.2)'; for (let k = 0; k < 16; k++) { const px = x0 + 3 + (k * 37 % 100) / 100 * Math.max(1, x1 - x0 - 8), py = -hh + 3 + (k * 53 % 100) / 100 * (hh * 2 - 7); g.fillRect(px, py, 1.5, 1.5); }
        if (d.fill === 'cluster') { g.fillStyle = '#12303c'; for (let k = 0; k < 6; k++) g.fillRect(x0 + 4 + (k % 3) * Math.max(3, (x1 - x0 - 12) / 3), k < 3 ? -hh + 2.5 : 1, 4, Math.min(4, hh - 2)); }
        if (d.fill === 'tandem') { g.fillStyle = '#121a26'; g.fillRect(x0 + (x1 - x0) * .7, -hh, 2.4, hh * 2); }
        if (d.fill === 'plasma') { g.fillStyle = '#f0e6ff'; g.beginPath(); g.ellipse((x0 + x1) / 2, 0, (x1 - x0) * .28, hh * .45, 0, 0, TAU); g.fill(); }
        if (d.liner && d.liner !== 'none') { const ap = x1 - hh * 1.5, e = x1 - 1.5, w = hh - 1.5; g.fillStyle = '#121a26'; g.beginPath(); g.moveTo(e, -w); g.lineTo(ap, 0); g.lineTo(e, w); g.closePath(); g.fill(); g.fillStyle = d.liner === 'ta' ? '#9ab4d0' : d.liner === 'tri' ? '#f0cf6a' : '#d87a3a'; g.beginPath(); g.moveTo(e, -w); g.lineTo(ap, 0); g.lineTo(e, w); g.lineTo(e, w - 2.6); g.lineTo(ap + 3.4, 0); g.lineTo(e, -w + 2.6); g.closePath(); g.fill(); if (d.liner === 'tri') g.fillRect(ap + 2, -.9, e - ap - 2, 1.8); }
      }
      g.fillStyle = { impact: '#e8eef4', short: '#5cf28a', long: '#5ad8ff', air: '#ff7ab8', stop: '#ffb060' }[d.fuse] || '#e8eef4'; g.fillRect(-L + 22, -2.5 * kr, 4, 5 * kr);
      g.globalAlpha = 1;
    }
    g.fillStyle = '#d98a3a'; g.fillRect(-L + 9, -r, 7, 2 * r); g.fillStyle = '#f2b466'; g.fillRect(-L + 9, -r, 7, 3.6 * kr); g.fillStyle = '#a8602a'; g.fillRect(-L + 9, r - 4 * kr, 7, 4 * kr); g.fillStyle = '#c8553a'; g.fillRect(-L + 18.5, -r, 2.6, 2 * r);
    g.fillStyle = '#2a323c'; g.fillRect(-L, -r, 2.6, 2 * r);
    if (cut < .5 && !pt.stripe) { g.fillStyle = 'rgba(236,242,248,.75)'; g.fillRect(-L * .56, -1, 5, 1.6); g.fillRect(-L * .56 + 7, -1, 2, 1.6); g.fillRect(-L * .56 + 11, -1, 3.2, 1.6); }
    if (o.hot > 0) { const gr = g.createLinearGradient(0, 0, -22, 0); gr.addColorStop(0, `rgba(255,252,236,${o.hot})`); gr.addColorStop(.35, `rgba(255,190,80,${o.hot * .85})`); gr.addColorStop(.7, `rgba(255,110,40,${o.hot * .5})`); gr.addColorStop(1, 'rgba(255,90,30,0)'); g.fillStyle = gr; g.fillRect(-22, -r, 22, 2 * r); }
    g.restore();
  }
  const shellIcon = (g, d, x, y, sc, o = {}, ps = 3) => pix(g, x - 4, y - 15 * sc, 90 * sc + 8, 30 * sc, ps, c => { c.translate(x + (shellL(d) + 1) * sc, y); c.scale(sc, sc); shellArt(c, d, o); });
  function drawShells(g) {
    for (const s of shells) {
      if (s.small) { const x = Math.floor(s.x * CS / 2) * 2, y = Math.floor(s.y * CS / 2) * 2; g.fillStyle = '#12303c'; g.fillRect(x - 4, y - 4, 8, 8); g.fillStyle = '#4fd0e8'; g.fillRect(x - 4, y - 4, 4, 4); continue; }
      const a = Math.atan2(s.uy, s.ux), X = s.x * CS, Y = s.y * CS, L = shellL(s.d), tr = part('paint', s.d.paint).tr;
      if (!s.hit && s.out > 4) {   // tracer
        const len = Math.min(s.out * CS - 60, 230); if (len > 4) { const x0 = X - s.ux * (L - 2), y0 = Y - s.uy * (L - 2), gr = g.createLinearGradient(x0, y0, x0 - s.ux * len, y0 - s.uy * len); gr.addColorStop(0, 'rgba(255,244,220,.95)'); gr.addColorStop(.3, `rgba(${tr},.65)`); gr.addColorStop(1, `rgba(${tr},0)`); g.strokeStyle = gr; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 - s.ux * len, y0 - s.uy * len); g.stroke();
          if (s.t < .5) { g.fillStyle = `rgba(150,220,255,${(1 - s.t * 2).toFixed(2)})`; for (let q = 0; q < 9; q++) { const d = (q * 37 + (t * 60 | 0) * 13) % len; g.fillRect(x0 - s.ux * d - 1.5, y0 - s.uy * d - 1 + ((q % 3) - 1) * 1.5, 4, 1.6); } } }
      }
      const hot = s.hit ? cl(.35 + s.pen / 6, 0, 1) : 0;
      pix(g, X - s.ux * L / 2 - 60, Y - s.uy * L / 2 - 60, 120, 120, 1.5, c => { c.translate(X, Y); c.rotate(a); if (s.out < 22) { c.beginPath(); c.rect(-s.out * CS, -24, s.out * CS + 4, 48); c.clip(); } shellArt(c, s.d, { cut: s.cut, crush: s.crush, hot }); });
      if (s.hit) { const r = 20 + (s.lodged ? 8 * Math.sin(t * 30) + 10 : 0), gr = g.createRadialGradient(X, Y, 0, X, Y, r); gr.addColorStop(0, 'rgba(255,246,214,.85)'); gr.addColorStop(.4, 'rgba(255,150,50,.45)'); gr.addColorStop(1, 'rgba(255,80,10,0)'); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(X - r, Y - r, r * 2, r * 2); g.restore(); }
    }
  }
  function gunArt(g) {
    const [px, py] = pivotPx(), gy = GUN.y * CS - py, rk = recoil * recoil * 20, ck = charge > 0 ? 1 - charge / .42 : 0, lit = Math.max(ck, recoil * .8);
    const teal = lit > .05 ? `rgb(${lp(60, 190, lit) | 0},${lp(200, 255, lit) | 0},${lp(180, 250, lit) | 0})` : '#3fc8b2';
    g.save(); g.translate(px, py);
    {   // the trail: a long leg back to a spade in the ground
      const x0 = -16, y0 = 24, x1 = -116, y1 = gy - 6, TL = Math.hypot(x1 - x0, y1 - y0); g.save(); g.translate(x0, y0); g.rotate(Math.atan2(y1 - y0, x1 - x0));
      g.fillStyle = '#4a5c68'; g.fillRect(0, -5, TL, 10); g.fillStyle = '#62788a'; g.fillRect(0, -5, TL, 3); g.fillStyle = '#2f3d48'; g.fillRect(0, 3, TL, 2);
      g.fillStyle = teal; g.fillRect(TL * .4, -1.5, TL * .22, 3); g.fillStyle = '#62788a'; g.fillRect(TL * .74, 5, 2, 8); g.fillRect(TL * .74 - 5, 12, 12, 2);
      g.fillStyle = '#33424e'; g.fillRect(TL - 9, -8, 10, 16); g.fillStyle = ORANGE; g.fillRect(TL - 1, -8, 4, 5); g.restore();
    }
    {   // the wheel
      const wx0 = -4, wy0 = gy - 30; g.fillStyle = '#16202a'; g.beginPath(); g.arc(wx0, wy0, 30, 0, TAU); g.fill();
      for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + .13; g.fillRect(wx0 + Math.cos(a) * 30 - 3, wy0 + Math.sin(a) * 30 - 3, 6, 6); }
      for (const [r, c] of [[25, '#24313c'], [20, '#5e7686'], [15, '#2a3844'], [11, '#8fa4ae'], [7, '#33424e']]) { g.fillStyle = c; g.beginPath(); g.arc(wx0, wy0, r, 0, TAU); g.fill(); }
      g.fillStyle = '#8fa4ae'; for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + .4; g.fillRect(wx0 + Math.cos(a) * 17.5 - 1.5, wy0 + Math.sin(a) * 17.5 - 1.5, 3, 3); }
      g.fillStyle = ORANGE; g.fillRect(wx0 - 2.5, wy0 - 2.5, 5, 5); g.fillStyle = '#1a242e'; g.fillRect(wx0 - 1, wy0 - 1, 2, 2);
    }
    g.fillStyle = '#2a3844'; g.beginPath(); g.moveTo(-24, gy - 46); g.lineTo(-13, 2); g.lineTo(13, 2); g.lineTo(18, gy - 46); g.closePath(); g.fill();
    g.fillStyle = '#3d4e5c'; g.fillRect(-13, -5, 26, 12); g.fillStyle = '#16202a'; g.fillRect(-3, -3, 6, 6);
    g.save(); g.rotate(-ang); const B = BL * CS;
    g.fillStyle = '#5d707d'; g.fillRect(14 - rk, -6, 46, 12); g.fillRect(58 - rk, -4.5, B - 70, 9);
    g.fillStyle = '#8496a2'; g.fillRect(14 - rk, -6, 46, 2.6); g.fillRect(58 - rk, -4.5, B - 70, 2.4); g.fillStyle = '#44545f'; g.fillRect(14 - rk, 3.5, 46, 2.5); g.fillRect(58 - rk, 2.4, B - 70, 2.1);
    g.fillStyle = '#4f6272'; g.fillRect(-30 - rk, -9, 46, 18); g.fillStyle = '#6a8090'; g.fillRect(-30 - rk, -9, 46, 4); g.fillStyle = '#394854'; g.fillRect(-30 - rk, 5, 46, 4);
    g.fillStyle = '#2c3a46'; g.fillRect(-38 - rk, -7, 9, 14); g.fillStyle = ORANGE; g.fillRect(-22 - rk, -10, 4, 20); g.fillRect(9 - rk, -10, 3, 20); g.fillRect(57 - rk, -7, 3, 14);
    g.fillStyle = '#4f6272'; g.fillRect(-18 - rk, -18, 16, 9); g.fillStyle = '#394854'; g.fillRect(-14 - rk, -21, 8, 4); g.fillStyle = teal; g.fillRect(-4 - rk, -17, 4, 6);
    g.fillStyle = '#2c3a46'; g.fillRect(B - 15 - rk, -8, 15, 16); g.fillStyle = '#0b1422'; g.fillRect(B - 12 - rk, -8, 3, 5); g.fillRect(B - 12 - rk, 3, 3, 5); g.fillRect(B - 6 - rk, -8, 3, 5); g.fillRect(B - 6 - rk, 3, 3, 5); g.fillStyle = ORANGE; g.fillRect(B - 17 - rk, -6, 2.5, 12);
    if (lit > .05) { g.fillStyle = teal; g.fillRect(20 - rk, -1, B - 40, 1.6); }
    g.restore(); g.restore();
  }
  function drawGun(g) { const [px, py] = pivotPx(); pix(g, px - 136, py - 150, 300, 150 + PH * CS + 6, 2, gunArt); }
  function drawAim(g) {
    if (end || phase !== 'aim') return;
    const d = design(slot); let [vx, vy] = vel(d), [x, y] = muzzle(); const T = .7 + lv('range') * .5 + (aiming ? .15 : 0);
    for (let s = 0; s < T * 60; s++) { vy += G / 60; x += vx / 60; y += vy / 60; if (!inb(Math.floor(x), Math.floor(y)) && y > 0) break; if (y > 0 && mat[idx(Math.floor(x), Math.floor(y))]) break; if (s % 3 === 0) { g.fillStyle = `rgba(120,236,220,${(.9 * (1 - s / (T * 60))).toFixed(2)})`; g.fillRect(Math.floor(x * CS / 4) * 4 - 2, Math.floor(y * CS / 4) * 4 - 2, 5, 5); } }
  }
  function hud(g) {
    const L = LEVELS[lvl], shot = phase === 'shot', hit = shot && hitT >= 0, pct = Math.round(100 * (coreN ? coreLeft / coreN : 0));
    // status
    const s = end === 'win' ? 'CORE DESTROYED!' : end === 'lose' ? 'Out of shells' : hit ? `${word.toUpperCase()}  ·  Next shot soon` : `${shots} shot${shots === 1 ? '' : 's'} left  ·  3★ in ${L.par}  ·  Core ${pct >= 100 ? 'OK' : pct + '%'}`;
    g.font = F(16); const w = g.measureText(s).width + 36; panel(g, 64, 14, w, 40, 9); tx(g, s, 64 + 18, 34 - (hit && !end ? 2 : 0), F(16), end === 'win' ? '#5cf28a' : end === 'lose' ? '#ff8a8a' : INK, 'left');
    if (hit && !end) { rr(g, 82, 46, w - 36, 3, 1.5, 'rgba(255,255,255,.14)'); const k = cl(after / afterMax(), 0, 1), bw = (w - 36) * .34; rr(g, 82 + (w - 36 - bw) * (shells.length ? .5 + .5 * Math.sin(t * 3) : k), 46, bw, 3, 1.5, TEAL); }
    hbtn(g, 'reset', 1040, 14, 118, 56, 'Reset', { off: shot }); hbtn(g, 'menu', 1168, 14, 96, 56, 'Menu');
    // the bar along the bottom
    panel(g, 80, 624, 1120, 84, 12); const bx = i => 87 + i * 222.4, bw = 216, by = 631, bh = 70;
    if (shot) {
      hbtn(g, 'pause', bx(0), by, bw, bh, paused ? 'Resume' : 'Pause'); hbtn(g, 'finish', bx(1), by, bw, bh, 'Finish', { hot: true }); hbtn(g, 'skip', bx(2), by, bw, bh, 'Skip', { off: hit });
      const v = SPEEDS[speedI] * (charge > 0 || paused ? 1 : autoCur), lab = Math.abs(v - Math.round(v)) < .04 ? Math.round(v) + '×' : v.toFixed(1) + '×'; hbtn(g, 'speed', bx(3), by, bw, bh, lab);
      hbtn(g, 'more', bx(4), by, bw, bh, '···', { px: 22 });
      if (more) { panel(g, bx(4) - 4, by - 76, bw + 8, 66, 10); hbtn(g, 'wide', bx(4) + 2, by - 70, bw - 4, 54, wide ? 'Chase camera' : 'Wide camera', { sub: 'C' }); }
    } else {
      for (let i = 0; i < 3; i++) {
        const d = design(i), x = bx(i), on = i === slot; btn['slot' + i] = { x, y: by, w: bw, h: bh };
        rr(g, x, by, bw, bh, 9, on ? 'rgba(255,138,30,.16)' : 'rgba(24,36,56,.96)', on ? ORANGE : EDGE, on ? 2.5 : 1.5);
        shellIcon(g, d, x + 10, by + 35, 1.05, { cut: 1 }, 3);
        { const f = part('fill', d.fill); tx(g, `${i + 1}  ${f.s || f.n}`, x + 104, by + 26, F(15), on ? '#ffd9a8' : INK, 'left'); }
        { const bits = [part('nose', d.nose).n, { impact: 'Impact', short: 'Short', long: 'Long', stop: 'On stop', air: 'Prox' }[part('fuse', d.fuse).k]]; if (part('liner', d.liner).k !== 'none') bits.push('jet'); g.font = F(11, 700); while (bits.length > 1 && g.measureText(bits.join(' · ')).width > 104) bits.pop(); tx(g, bits.join(' · '), x + 104, by + 47, F(11, 700), DIM, 'left'); }
      }
      rr(g, bx(3), by, bw, bh, 9, 'rgba(24,36,56,.96)', EDGE, 1.5); tx(g, `${Math.round(ang * 180 / Math.PI)}°  ·  ${Math.round(pow * 100)}%`, bx(3) + bw / 2, by + 24, F(16), INK); rr(g, bx(3) + 22, by + 44, bw - 44, 9, 4.5, 'rgba(255,255,255,.1)'); rr(g, bx(3) + 22, by + 44, Math.max(9, (bw - 44) * pow), 9, 4.5, pow > .88 ? ORANGE : TEAL);
      hbtn(g, 'fire', bx(4), by, bw, bh, 'Fire', { hot: !end && shots > 0, off: !!end || shots <= 0, sub: 'Space', px: 20 });
    }
    if (paused && shot) tx(g, 'PAUSED', 640, 300, D(46), INK, 'center', 8);
    if (end === 'win') tx(g, 'CORE DESTROYED', 640, 250, D(60), '#5cf28a', 'center', 9);
    if (end === 'lose') tx(g, 'OUT OF SHELLS', 640, 250, D(54), '#ff8a8a', 'center', 9);
  }
  function drawPlay(g, still) {
    backdrop(g);
    g.save(); g.translate(640, 360); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
    drawWorld(g); drawParts(g); drawGun(g); if (!still) drawAim(g); drawShells(g); drawFx(g); g.restore();
    if (!still && !posed) hud(g);
  }
  function drawMap(g) {
    backdrop(g); const v = K.view; g.fillStyle = 'rgba(8,14,24,.5)'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    tx(g, 'SHELLSMITH', 640, 58, D(52), ORANGE, 'center', 8); tx(g, 'Pick a yard. Design your shells in the Workshop.', 640, 100, F(17), '#cfe0f0');
    tx(g, `◉ ${coins.toLocaleString('en-US')}`, 1240, 40, D(26), GOLD, 'right', 5); tx(g, `★ ${Object.values(stars).reduce((a, b) => a + b, 0)} / ${LEVELS.length * 3}`, 1240, 72, F(15), GOLD, 'right');
    LEVELS.forEach((L, i) => {
      if (Math.floor(i / 18) !== mapPage) return; const q = i % 18;
      const cx = 42 + (q % 6) * 202, cy = 126 + Math.floor(q / 6) * 128, ok = unlocked(i), st = stars[i] || 0, on = i === sel;
      btn['lvl' + i] = { x: cx, y: cy, w: 192, h: 118 };
      rr(g, cx, cy, 192, 118, 12, ok ? 'rgba(16,26,44,.94)' : 'rgba(16,26,44,.6)', on ? ORANGE : ok ? '#2c4262' : '#1a2638', on ? 3 : 2);
      tx(g, `${i + 1}`, cx + 22, cy + 26, D(20), ok ? ORANGE : OFF); tx(g, L.n, cx + 42, cy + 26, D(L.n.length > 13 ? 13 : 15), ok ? INK : OFF, 'left');
      if (!ok) tx(g, '🔒', cx + 96, cy + 66, '24px sans-serif', '#fff'); else tx(g, `3★ in ${L.par}`, cx + 14, cy + 62, F(12, 700), DIM, 'left');
      tx(g, '★'.repeat(st) + '☆'.repeat(3 - st), cx + 14, cy + 92, D(20), st ? GOLD : '#3a4a62', 'left');
      tx(g, `◉ ${L.reward}`, cx + 180, cy + 92, D(14), GOLD, 'right');
    });
    for (let pg = 0; pg < Math.ceil(LEVELS.length / 18); pg++) hbtn(g, 'pg' + pg, 640 - 150 + pg * 154, 516, 146, 38, `Yards ${pg * 18 + 1}–${Math.min(LEVELS.length, pg * 18 + 18)}`, { hot: pg === mapPage, px: 14 });
    if (unlocked(sel)) tx(g, LEVELS[sel].hint, 640, 586, F(15), '#cfe0f0');
    hbtn(g, 'shop', 380, 626, 300, 70, 'Workshop', { hot: true, sub: 'Design and upgrade your shells (W)', px: 20 });
    hbtn(g, 'cash', 700, 626, 200, 70, 'Cash out', { sub: `${total.toLocaleString('en-US')} coins earned`, px: 18 });
  }
  function bar(g, x, y, w, label, v, c) { tx(g, label, x, y + 6, F(12), DIM, 'left'); rr(g, x + 92, y, w - 92, 12, 6, 'rgba(255,255,255,.08)'); rr(g, x + 92, y, Math.max(6, (w - 92) * cl(v, 0, 1)), 12, 6, c); }
  function drawShop(g) {
    const v = K.view; g.fillStyle = '#0b1422'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.strokeStyle = 'rgba(79,224,200,.05)'; g.lineWidth = 1; for (let x = 0; x < 1280; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 720); g.stroke(); } for (let y = 0; y < 720; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(1280, y); g.stroke(); }
    tx(g, 'WORKSHOP', 80, 40, D(34), ORANGE, 'left', 6); tx(g, `◉ ${coins.toLocaleString('en-US')}`, 1240, 40, D(26), GOLD, 'right', 5);
    for (let i = 0; i < 3; i++) hbtn(g, 'ws' + i, 420 + i * 150, 18, 136, 44, `Shell ${i + 1}`, { hot: i === wsSlot });
    // the cut-away blueprint
    const d = slots[wsSlot], S = stats(d), sc = S.w === 7 ? 4.5 : 5, X = 290, Y = 142, r = shellR(d), tipX = X + (shellL(d) + 1) * sc, N = NOSE[d.nose] || NOSE.round, cur = cat => part(cat, d[cat]).k;
    rr(g, 60, 72, 940, 140, 14, 'rgba(79,224,200,.04)', 'rgba(79,224,200,.22)', 2);
    shellIcon(g, d, X, Y, sc, { cut: 1 }, 5);
    const lab = (s, ax, ay, lx, ly) => { g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ax, ay); g.lineTo(lx, ly); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ax, ay, 3, 0, TAU); g.fill(); tx(g, s, lx + (lx < ax ? -6 : 6), ly, F(13), '#e8f4ff', lx < ax ? 'right' : 'left'); };
    lab('FUSE: ' + S.u.n, X + 25 * sc, Y, X - 16, Y + 44); lab('CASING: ' + S.c.n, X + 14 * sc, Y - r * sc + 5, X - 16, Y - 44); lab('FILL: ' + S.f.n, X + 40 * sc, Y + 2 * sc, tipX + 26, Y + 44);
    if (cur('liner') !== 'none') lab('LINER: ' + S.l.n, tipX - (N[0] * .55 + 5) * sc, Y - 1.5 * sc, tipX + 26, Y + 2); lab('NOSE: ' + S.n.n, tipX - Math.min(8, N[0] * .5) * sc, Y - 2.5 * sc, tipX + 26, Y - 40);
    tx(g, `${S.cal.n} calibre  ·  ${part('paint', d.paint).n} paint`, 984, 196, F(12, 700), DIM, 'right');
    if (cur('liner') !== 'none' && !S.jetOk) tx(g, 'This fill cannot form a jet: the liner does nothing', 984, 90, F(12), '#ffb36a', 'right');
    // part pickers
    PK.forEach((cat, ri) => {
      const y = 224 + ri * 59; tx(g, PNAME[cat], 66, y + 23, F(13), '#ffd9a8', 'left');
      PARTS[cat].forEach((p, j) => {
        const x = 196 + j * 100, w = 94, mine = owns(cat, p.k), on = cur(cat) === p.k, look = shopSel && shopSel[0] === cat && shopSel[1] === p.k, nm = p.s || p.n; btn['p:' + cat + ':' + p.k] = { x, y, w, h: 46 };
        rr(g, x, y, w, 46, 9, on ? 'rgba(255,138,30,.2)' : mine ? 'rgba(24,36,56,.96)' : 'rgba(10,16,28,.8)', on ? ORANGE : look ? TEAL : EDGE, on || look ? 2.5 : 1.5);
        let cx = x + w / 2;
        if (cat === 'paint') { const c = p.c || [143, 154, 166]; rr(g, x + 9, y + 8, 15, 15, 3, `rgb(${c[0]},${c[1]},${c[2]})`); if (p.stripe) { g.fillStyle = '#1c1c20'; g.beginPath(); g.moveTo(x + 9, y + 23); g.lineTo(x + 14, y + 23); g.lineTo(x + 24, y + 13); g.lineTo(x + 24, y + 8); g.closePath(); g.fill(); } cx += 9; }
        tx(g, nm, cx, y + 16, F(nm.length > 9 ? 11.5 : 13), on ? '#ffd9a8' : mine ? INK : DIM);
        tx(g, mine ? (on ? 'equipped' : 'owned') : `◉ ${p.cost}`, x + w / 2, y + 34, F(11), on ? ORANGE : mine ? OFF : coins >= p.cost ? GOLD : '#8a6060');
      });
    });
    // the part you are looking at
    { const [sc0, sk] = shopSel || ['casing', cur('casing')], sp = part(sc0, sk), mine = owns(sc0, sk), on = cur(sc0) === sk;
      panel(g, 60, 640, 940, 66, 10, !mine); tx(g, `${PNAME[sc0]}  ·  ${sp.n}`, 78, 660, F(15), '#ffd9a8', 'left'); tx(g, sp.d, 78, 685, F(13, 700), '#cfe0f0', 'left');
      tx(g, on ? 'Equipped' : mine ? 'Owned' : coins >= sp.cost ? `◉ ${sp.cost}  ·  tap it again to buy` : `◉ ${sp.cost}  ·  not enough coins`, 984, 660, F(14), on ? ORANGE : mine ? DIM : coins >= sp.cost ? GOLD : '#c87878', 'right'); }
    // stats and upgrades
    const px = 1030; rr(g, 1016, 72, 246, 140, 12, PAN, EDGE, 1.5);
    tx(g, 'THIS SHELL', px, 90, F(13), TEAL, 'left');
    bar(g, px, 104, 218, 'Penetration', S.mass * S.pen * S.spd * S.spd * (5 / S.w) / 9, TEAL); bar(g, px, 125, 218, 'Blast', S.bl * S.q * S.n.splash / 2.6, GOLD); bar(g, px, 146, 218, 'Heat', S.f.blast > 0 ? ((S.f.maxT || 640) - 540) / 960 * (S.f.burn ? 1.6 : 1) : 0, ORANGE); bar(g, px, 167, 218, 'Jet', S.jet / 2.6, '#d87a3a'); bar(g, px, 188, 218, 'Range', S.spd / 1.7, '#5cf28a');
    UPG.forEach((u, i) => { const l = lv(u.k), y = 224 + i * 61, mx = l >= u.max, k = 'u:' + u.k; btn[k] = { x: 1016, y, w: 246, h: 54 }; rr(g, 1016, y, 246, 54, 9, mx ? 'rgba(92,242,138,.1)' : 'rgba(24,36,56,.96)', EDGE, 1.5); tx(g, `${u.n}  ${l}/${u.max}`, px - 2, y + 18, F(14), INK, 'left'); tx(g, mx ? 'maxed' : u.d(l), px - 2, y + 38, F(11, 700), DIM, 'left'); tx(g, mx ? '✓' : `◉ ${u.cost(l)}`, 1250, y + 18, F(14), mx ? '#5cf28a' : coins >= u.cost(l) ? GOLD : '#8a6060', 'right'); });
    hbtn(g, 'back', 1016, 662, 200, 44, 'To the range →', { hot: true });
  }
  function drawResult(g) {
    drawPlay(g, true); g.fillStyle = 'rgba(6,10,18,.6)'; g.fillRect(K.view.x0, K.view.y0, K.view.x1 - K.view.x0, K.view.y1 - K.view.y0);
    const r = res; rr(g, 340, 150, 600, 400, 18, 'rgba(13,21,36,.97)', r.win ? '#5cf28a' : '#ff8a8a', 3);
    tx(g, r.win ? 'CORE DESTROYED' : 'THE CORE SURVIVED', 640, 214, D(42), r.win ? '#5cf28a' : '#ff8a8a', 'center', 6);
    if (r.win) { tx(g, '★'.repeat(r.st) + '☆'.repeat(3 - r.st), 640, 290, D(60), GOLD); tx(g, `${used} shell${used > 1 ? 's' : ''} (3★ in ${LEVELS[lvl].par})`, 640, 348, F(18), DIM); tx(g, `+ ◉ ${r.got}${r.first ? '' : '  (replay)'}`, 640, 400, D(36), GOLD); }
    else { tx(g, LEVELS[lvl].hint, 640, 300, F(19), '#cfe0f0'); tx(g, 'Try a different shell in the Workshop.', 640, 340, F(17), DIM); }
    hbtn(g, 'retry', 380, 460, 160, 64, 'Retry', { px: 18 }); hbtn(g, 'shop', 560, 460, 180, 64, 'Workshop', { px: 18 });
    if (r.win && lvl < LEVELS.length - 1) hbtn(g, 'next', 760, 460, 160, 64, 'Next →', { hot: true, sub: 'Enter', px: 18 }); else hbtn(g, 'map', 760, 460, 160, 64, 'Yards', { hot: true, px: 18 });
  }
  GAME.draw = g => {
    for (const k in btn) delete btn[k];
    if (mode === 'map') drawMap(g); else if (mode === 'shop') drawShop(g); else if (mode === 'result') drawResult(g); else drawPlay(g);
    msgs.forEach((m, i) => { g.globalAlpha = Math.min(1, (3.4 - m.t) * 2); g.font = F(16); const w = Math.max(320, g.measureText(m.s).width + 44); panel(g, 640 - w / 2, 84 + i * 44, w, 36, 9); tx(g, m.s, 640, 102 + i * 44, F(16), m.c); g.globalAlpha = 1; });
  };
  { const u = GAME.update; GAME.update = dt => { if (posed) { t += dt; return; } u(dt); }; }
  // cover art: a shell caught at the moment it goes off
  GAME.pose = () => {
    slots[0] = { casing: 'steel', nose: 'point', fill: 'he', liner: 'none', fuse: 'impact' }; startLevel(9); msgs = []; slot = 0; const s = solve(design(0)); if (s) { ang = s.a; pow = s.p; }
    fire(); charge = 0; launch(); for (let k = 0; k < 1200 && !(blasts.length && blasts[0].t > .3); k++) { simStep(); stepFx(1 / 60); }
    cam.x = focus[0] * CS; cam.y = focus[1] * CS; cam.z = ZC; posed = true;
  };
  GAME.test = {
    st: () => ({ mode, lvl, shots, used, end, coreN, coreLeft, coins, stars: { ...stars }, shells: shells.length, bodies: bodies.length, parts: parts.length, fx: fx.length, slot, ang, pow, slots, phase, hitT, after, charge, auto: autoCur, cam: { ...cam } }),
    start: n => startLevel(n), press, fire: (a, p, s = slot) => { ang = a; pow = p; slot = s; fire(); }, solve: s => solve(design(s ?? slot)),
    // run the simulation flat out (no slow motion) until the shot is over; returns the steps it took
    play: (max = 1500) => { if (phase === 'shot' && charge > 0) { charge = 0; launch(); } let k = 0; for (; k < max && phase === 'shot'; k++) simStep(); coreLeft = 0; for (let i = 0; i < N; i++) if (mat[i] === CORE) coreLeft++; return k; },
    steps: n => { if (phase === 'shot' && charge > 0) { charge = 0; launch(); } for (let k = 0; k < n; k++) simStep(); stepFx(n / 60); },
    setCoins: v => { coins = v; save(); }, design: (i, d) => { slots[i] = { ...slots[i], ...d }; for (const c of PK) own[c + ':' + slots[i][c]] = true; }, upg: (k, l) => { up[k] = l; },
    loose: () => { support(); const r = bodies.map(b => [b.x | 0, b.y | 0, b.mw, b.mh, b.n, M[b.cells[0].m].n]); bodies.length = 0; return r; },
    bods: () => bodies.map(b => [b.x, b.y, b.vx, b.vy, b.w, b.rest, b.age].map(v => +v.toFixed(2)).concat(b.n, contacts(b).n)), view: (x, y, z) => { cam.x = x; cam.y = y; cam.z = z; }, count: m => { let n = 0; for (let i = 0; i < N; i++) if (mat[i] === m) n++; return n; },
    shell: () => shells.map(s => ({ x: +s.x.toFixed(1), y: +s.y.toFixed(1), E: +(s.E || 0).toFixed(1), E0: +(s.E0 || 0).toFixed(1), pen: s.pen, lodged: s.lodged, hit: s.hit, travel: s.travel })),
  };
})();
