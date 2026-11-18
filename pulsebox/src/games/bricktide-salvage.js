// @use mp
/* Bricktide Salvage: a turn-based artillery duel across a valley. Each side has a fort built from real pixels (brick,
   stone, wood, steel, concrete, ice) that cracks, crumbles, heats up and collapses, and a cannon on top of it. Take turns:
   aim, pick a shell from your arsenal, mind the wind, fire. A blast near a cannon, or a cannon toppling off its crumbling
   fort, costs that side a life; three lives each. Campaign against bots that get sharper, quick battles, two players on
   one device, or an online room with a friend. Coins from wins unlock new shells and cannon colours. */
const GAME = {
  id: 'bricktide-salvage', title: 'Bricktide Salvage', tagline: 'Your shot. Their turn.',
  font: 'Titan One', accent: '#f3cf85', accent2: '#7ad7ff', bg: '#16233a', noHud: true, noSkins: true, scoreLabel: 'Salvage score',
  how: [
    'Aim by dragging (or moving the mouse) away from your cannon: the direction sets the angle and the distance sets the power. Let go, click Fire or press Space to shoot. Keyboard: arrows aim, 1 to 9 pick a shell.',
    'One shot each per turn. A blast close to a cannon, or a cannon that topples off its crumbling fort, costs that side a life. Three lives each.',
    'Watch the wind: it changes every turn and pushes every shell except the rocket. The dotted guide only shows the start of the arc.',
    'Forts are real pixels: knock out what holds a cannon up and gravity does the rest. Water swallows shells and lava swallows everything.',
    'Win battles for coins, and spend them in the Armory on new shells (drill, fire pot, rocket, brick crate, mortar, quake charge) and cannon colours.',
  ],
  skins: [{ name: 'Crew', price: 0 }],
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
    if (m === GLASS || m === ICE) { if (R() < .6) debris(x + .5, y + .5, vx + (R() - .5) * 30, vy + (R() - .5) * 30, c, 2); return; }
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
        if (b.y - b.rad > GH + 10 || b.x + b.rad < -20 || b.x - b.rad > GW + 20 || (L.liquid && wet(b.x, b.y))) gone = true;
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
        if (L.liquid && y + 1 >= liq[x]) { mat[i] = E; col[i] = 0; hp[i] = 0; heat[i] = 0; continue; }
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
      if (x < -30 || x >= GW + 30 || y >= GH || p.t > 9 || (L.liquid && x >= 0 && x < GW && y >= liq[x])) { parts.splice(k, 1); continue; }
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
  /* ---------- landscapes ---------- */
  const LANDS = [
    { k: 'sunlit', n: 'Sunlit Keep', sky: ['#7cc8ea', '#d8f0f2'], sun: [1050, 140, '#fff4c8'], far: '#a8d2b8', mid: '#86c09c', near: '#6aa884', grass: [104, 170, 92], dirt: [128, 100, 72], ext: '#5b4632', cloud: 'rgba(255,255,255,.85)', smoke: '120,124,128', liquid: null, hint: 'Rolling hills, a gentle breeze.' },
    { k: 'canyon', n: 'Red Canyon', sky: ['#f2a679', '#ffe0b4'], sun: [980, 150, '#fff0c8'], far: '#e3a17c', mid: '#cf7e5c', near: '#b8633f', grass: [214, 150, 96], dirt: [178, 98, 62], ext: '#7a3e24', cloud: 'rgba(255,240,224,.7)', smoke: '150,110,90', liquid: null, hint: 'A deep gorge and a mesa in the way.' },
    { k: 'frost', n: 'Frostwatch', sky: ['#a7cdea', '#eef6fb'], sun: [1080, 120, '#ffffff'], far: '#cfe1ee', mid: '#b4cee2', near: '#97b6cf', grass: [236, 244, 250], dirt: [136, 154, 176], ext: '#56677d', cloud: 'rgba(255,255,255,.9)', smoke: '150,160,175', liquid: null, snow: 1, hint: 'Ice cracks and melts. Slippery footing.' },
    { k: 'twilight', n: 'Twilight Fort', sky: ['#241f48', '#b45d86'], moon: [1020, 130, '#fff1d6'], far: '#4e3d70', mid: '#3d2f5c', near: '#2e2448', grass: [86, 120, 118], dirt: [62, 62, 90], ext: '#28223c', cloud: 'rgba(220,190,230,.35)', smoke: '120,100,140', liquid: null, stars: 1, hint: 'A hill in the middle hides each side from the other.' },
    { k: 'harbor', n: 'Harbor Narrows', sky: ['#8fd0ef', '#e4f5fb'], sun: [300, 130, '#fff6d0'], far: '#9cc8d6', mid: '#7fb2c4', near: '#6a9db0', grass: [222, 204, 150], dirt: [176, 150, 108], ext: '#6e5a3e', cloud: 'rgba(255,255,255,.9)', smoke: '130,140,150', liquid: { c: [58, 140, 196], top: [150, 220, 240], a: 200, kill: 0 }, hint: 'Shells that fall short sink in the channel.' },
    { k: 'volcano', n: 'Ember Peak', sky: ['#2a1418', '#a8432a'], sun: [640, 210, '#ffb070'], far: '#5a2a26', mid: '#44201e', near: '#321716', grass: [96, 72, 66], dirt: [72, 52, 50], ext: '#2a1614', cloud: 'rgba(80,40,40,.5)', smoke: '90,70,70', liquid: { c: [255, 110, 30], top: [255, 220, 120], a: 255, kill: 1 }, embers: 1, hint: 'Lava eats rubble, shells and cannons alike.' },
  ];
  let L = LANDS[0];
  const ICE = 10; M[ICE] = { n: 'ice', c: [196, 230, 248], hp: 3, melt: 240, brit: .9, cond: .3, a: 236 };
  const liq = new Int16Array(GW).fill(999);   // the row where water or lava starts in each column
  const wet = (x, y) => { const c = Math.floor(x); return c >= 0 && c < GW && y >= liq[c]; };
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t2 = Math.imul(a ^ a >>> 15, 1 | a); t2 = t2 + Math.imul(t2 ^ t2 >>> 7, 61 | t2) ^ t2; return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296; }; }
  let srnd = mulberry(1);
  // the ground line for each landscape: plateaus for the two forts, something different in between
  function terrain(k, x) {
    const s = (a, f, p) => a * Math.sin(x * f + p), mid = x > 112 && x < 288, e = cl(Math.min(x - 100, 300 - x) / 40, 0, 1), ease = e * e * (3 - 2 * e), P = 158;
    switch (k) {
      case 'canyon': { const m = x > 186 && x < 214 ? 112 + Math.abs(x - 200) * .8 : 194; return Math.round(lp(P + s(2, .07, 1), m, ease)); }
      case 'frost': return Math.round(lp(P + s(2, .05, 2), 176 + s(2, .1, 1), ease));
      case 'twilight': return Math.round(lp(P + s(2, .06, 0), 178 - 52 * Math.exp(-Math.pow((x - 200) / 34, 2)) + s(3, .09, 2), ease));
      case 'harbor': return Math.round(lp(P + s(1.5, .06, 3), 192, ease));
      case 'volcano': return Math.round(lp(P + s(2, .08, 1), x > 170 && x < 230 ? 150 + Math.pow(Math.abs(x - 200) / 30, 2) * 38 : 190, ease));
      default: return Math.round(lp(P + s(2, .05, 1), 170 + s(6, .045, 1.2) + s(3, .11, 0), ease));
    }
  }
  function ground() {
    const g = L.grass, d = L.dirt; M[DIRT].c = d; liq.fill(999);
    for (let x = 0; x < GW; x++) {
      const h = terrain(L.k, x);
      for (let y = h; y < GH; y++) {
        if (y >= GH - 4) { set(x, y, BED); continue; }
        const top = y - h, k = 1 + (hsh(x, y) - .5) * .06;
        set(x, y, DIRT, top < 2 ? rgb(cl(g[0] * k, 0, 255) | 0, cl(g[1] * k, 0, 255) | 0, cl(g[2] * k, 0, 255) | 0) : top < 4 && L.snow ? rgb(220, 232, 242) : undefined);
      }
      if (L.liquid && x > 118 && x < 282) liq[x] = L.k === 'volcano' ? 184 : 172;
    }
    if (L.k === 'frost') for (let x = 150; x < 250; x++) { const h = terrain('frost', x); for (let y = h - 6; y < h; y++) set(x, y, ICE); }
    if (L.k === 'canyon') for (let y = 108; y < 120; y++) for (let x = 184; x < 216; x++) if (!mat[idx(x, y)]) set(x, y, STONE);
    if (L.k === 'volcano') for (let x = 186; x < 214; x++) for (let y = 128; y < 150; y++) if (Math.abs(x - 200) < (y - 126) * .7 && !mat[idx(x, y)]) set(x, y, STONE);
  }
  /* ---------- forts (built facing the enemy: dx grows towards the middle of the map) ---------- */
  const FORTS = {
    outpost: { n: 'Outpost', b: (R2) => { R2(-14, 0, 28, 4, STONE); for (let j = 0; j < 10; j++) R2(12 + j, 0, 3, 10 - j, DIRT); R2(-12, 4, 3, 6, WOOD); }, gun: 0 },
    keep: { n: 'Stone Keep', b: (R2) => { R2(-12, 0, 24, 30, STONE); R2(-8, 4, 16, 20, E); R2(-8, 13, 16, 2, WOOD); for (let k = 0; k < 2; k++) R2(-12 + k * 21, 30, 3, 3, STONE); R2(16, 0, 6, 18, BRICK); R2(17, 18, 4, 2, BRICK); }, gun: 0 },
    bastion: { n: 'Brick Bastion', b: (R2) => { for (let j = 0; j < 28; j++) R2(10 + Math.floor(j * .3), j, Math.max(3, 11 - Math.floor(j * .25)), 1, BRICK); R2(-15, 0, 3, 17, WOOD); R2(3, 0, 3, 17, WOOD); R2(-17, 17, 24, 3, WOOD); leg2(R2); }, gun: -6 },
    bunker: { n: 'Concrete Bunker', b: (R2) => { R2(-16, 0, 32, 4, CONC); R2(-16, 4, 4, 10, CONC); R2(12, 4, 4, 10, CONC); R2(-18, 14, 36, 4, STEEL); for (let j = 0; j < 14; j++) R2(18 + j, 0, 1, 14 - j, DIRT); R2(-12, 4, 6, 4, WOOD); }, gun: -2 },
    castle: { n: 'Twin Towers', b: (R2) => { R2(-22, 0, 10, 28, STONE); R2(12, 0, 10, 34, STONE); R2(-12, 22, 24, 3, WOOD); for (let k = 0; k < 2; k++) { R2(-22 + k * 7, 28, 3, 3, STONE); R2(12 + k * 7, 34, 3, 3, STONE); } R2(-19, 6, 4, 6, GLASS); R2(15, 8, 4, 6, GLASS); }, gun: 0 },
    timber: { n: 'Timber Tower', b: (R2) => { R2(-14, 0, 28, 5, BRICK); R2(-12, 5, 3, 31, WOOD); R2(9, 5, 3, 31, WOOD); for (const u of [16, 26]) R2(-12, u, 24, 2, WOOD); R2(-14, 36, 28, 3, WOOD); for (let j = 0; j < 10; j++) { R2(-9 + j * 2, 6 + j, 2, 1, WOOD); R2(7 - j * 2, 6 + j, 2, 1, WOOD); } R2(14, 30, 3, 12, STEEL); }, gun: 0 },
    icewall: { n: 'Ice Wall', b: (R2) => { R2(-14, 0, 28, 18, ICE); R2(-10, 4, 8, 8, E); R2(-12, 18, 24, 3, STONE); for (let j = 0; j < 16; j++) R2(14 + Math.floor(j / 2), 0, 2, 16 - j, ICE); }, gun: 0 },
    citadel: { n: 'Steel Citadel', b: (R2) => { R2(-20, 0, 40, 12, STONE); R2(-20, 12, 40, 3, STEEL); R2(14, 15, 5, 18, STEEL); R2(-20, 15, 4, 10, STEEL); R2(19, 0, 6, 26, BRICK); R2(-14, 4, 10, 6, E); R2(-14, 4, 10, 1, WOOD); }, gun: -3 },
  };
  function leg2(R2) { for (let j = 0; j < 14; j++) R2(-12 + j, 3 + j, 2, 1, WOOD); }
  const FORT_KEYS = Object.keys(FORTS);
  const FX0 = [58, 342];   // fort centres, left and right
  function buildFort(side, key) {
    const cx = FX0[side < 0 ? 1 : 0], dir = side < 0 ? -1 : 1, F = FORTS[key];
    let gy = 0; for (let x = cx - 34; x <= cx + 34; x++) gy = Math.max(gy, terrain(L.k, x));
    for (let x = cx - 34; x <= cx + 34; x++) for (let y = terrain(L.k, x); y < gy; y++) set(x, y, DIRT);   // a level pad
    const SC = 1.3, R2 = (dx0, up0, w0, h0, m) => { const dx = Math.round(dx0 * SC), up = Math.round(up0 * SC), w = Math.max(1, Math.round((dx0 + w0) * SC) - dx), h = Math.max(1, Math.round((up0 + h0) * SC) - up); for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) { const x = cx + dir * (dx + i), y = gy - 1 - up - j; if (m) set(x, y, m); else if (inb(x, y)) { const q = idx(x, y); mat[q] = 0; hp[q] = 0; col[q] = 0; heat[q] = 0; } } };
    F.b(R2);
    return cx + dir * Math.round(F.gun * SC);
  }
  /* ---------- players and their cannons ---------- */
  const CANNON_COLS = [
    { n: 'Bronze', c: '#c98a3e', cost: 0 }, { n: 'Navy', c: '#3d6fb6', cost: 0 }, { n: 'Crimson', c: '#c4404a', cost: 150 }, { n: 'Jade', c: '#3fae7a', cost: 150 },
    { n: 'Royal', c: '#7a52c8', cost: 250 }, { n: 'Gold', c: '#e7b93a', cost: 400 }, { n: 'Frost', c: '#9fd6ee', cost: 300 }, { n: 'Obsidian', c: '#2c2c36', cost: 500 },
  ];
  const P = [];   // two players: { name, col, bot, remote, side, x, y, lives, ang, pow, w, ammo, vy, falling, fall0, hitShot, flash, spawn }
  function surfaceAt(x) { for (let y = 0; y < GH; y++) { for (let dx = -2; dx <= 2; dx++) if (inb(x + dx, y) && isStatic(mat[idx(x + dx, y)])) return y; } return GH; }
  function seatCannon(p) {
    p.y = surfaceAt(p.x);
    for (let y = p.y - 9; y < p.y; y++) for (let x = p.x - 5; x <= p.x + 5; x++) if (inb(x, y)) { const q = idx(x, y); mat[q] = 0; hp[q] = 0; col[q] = 0; }
  }
  /* ---------- the arsenal ---------- */
  const WEAP = [
    { k: 'ball', n: 'Cannonball', ammo: 99, cost: 0, c: '#2c3038', d: 'The old reliable. Never runs out.' },
    { k: 'heavy', n: 'Heavy shell', ammo: 3, cost: 0, c: '#8a9aaa', d: 'Digs into the fort before it goes off. A bigger blast.' },
    { k: 'cluster', n: 'Cluster', ammo: 2, cost: 0, c: '#4fb4d8', d: 'Bursts at the top of its arc into five bomblets.' },
    { k: 'bounce', n: 'Bouncer', ammo: 2, cost: 0, c: '#d8504a', d: 'Bounces up to three times, then goes off.' },
    { k: 'drill', n: 'Drill', ammo: 2, cost: 300, c: '#c9a24a', d: 'Bores straight through 26 pixels of anything, then blows.' },
    { k: 'fire', n: 'Fire pot', ammo: 2, cost: 450, c: '#e8692a', d: 'A small blast, then a long, white-hot burn. Melts steel and ice.' },
    { k: 'bricks', n: 'Brick crate', ammo: 2, cost: 400, c: '#c46e4c', d: 'No blast: builds a brick wall where it lands. Shield yourself.' },
    { k: 'rocket', n: 'Rocket', ammo: 2, cost: 600, c: '#e9eef4', d: 'Flies dead straight and ignores the wind. A small blast.' },
    { k: 'mortar', n: 'Mortar', ammo: 2, cost: 750, c: '#5a6a4a', d: 'A huge, shallow blast that shaves a fort down.' },
    { k: 'quake', n: 'Quake charge', ammo: 1, cost: 1000, c: '#9a6ad8', d: 'Shakes everything near it loose. Forts come down.' },
  ];
  const WK = Object.fromEntries(WEAP.map((w, i) => [w.k, i]));
  const BOOM = { ball: [7, 9], heavy: [10, 13], bomblet: [4.8, 6], bounce: [8, 10], drill: [7.5, 10], fire: [5, 5], rocket: [6.5, 10], mortar: [13, 8], quake: [16, 4] };
  /* ---------- state ---------- */
  const SV = () => { const s = K.save; if (!s.bt1) s.bt1 = { coins: 0, own: {}, cols: {}, colr: 0, camp: {}, total: 0, wins: 0 }; return s.bt1; };
  let coins = 0, own = {}, cols = {}, colr = 0, camp = {}, total = 0, wins = 0;
  let mode = 'menu', kind = 'quick', level = -1, cur = 0, turnN = 0, wind = 0, phase = 'aim', after = 0, slowT = 0, winner = -1, endT = 0, res = null, msgs = [], botT = 0, botPlan = null, acc = 0, firstShot = true;
  let qLand = 0, qDiff = 1, qFortL = 'keep', qFortR = 'keep', armTab = 0, passGate = false, shooterLocal = true, recoil = [0, 0];
  let seed = 1, net = null;   // online: { base: Uint8Array, baseCol, want, got, end, sent, lastAim }
  const owns = k => WEAP[WK[k]].cost === 0 || !!own[k];
  const lvOk = n => n === 0 || !!camp[n - 1];
  function save() { if (K.bot) return; const S = SV(); Object.assign(S, { coins, own, cols, colr, camp, total, wins }); K.persist(); }
  function say(s, c = '#fff') { msgs.push({ s, c, t: 0 }); if (msgs.length > 2) msgs.shift(); }
  const DIFF = [{ n: 'Easy', acc: .13, think: 1.6 }, { n: 'Normal', acc: .065, think: 1.3 }, { n: 'Hard', acc: .028, think: 1 }];
  const CAMPAIGN = [
    { land: 0, me: 'keep', bot: 'outpost', acc: .15, arms: ['ball'], reward: 150 },
    { land: 0, me: 'keep', bot: 'keep', acc: .12, arms: ['ball', 'heavy'], reward: 180 },
    { land: 1, me: 'bastion', bot: 'bastion', acc: .105, arms: ['ball', 'heavy', 'cluster'], reward: 210 },
    { land: 2, me: 'icewall', bot: 'keep', acc: .095, arms: ['ball', 'heavy', 'bounce'], reward: 240 },
    { land: 4, me: 'keep', bot: 'bunker', acc: .085, arms: ['ball', 'heavy', 'cluster', 'bounce'], reward: 270 },
    { land: 3, me: 'castle', bot: 'castle', acc: .075, arms: ['ball', 'heavy', 'cluster', 'drill'], reward: 300 },
    { land: 1, me: 'timber', bot: 'bastion', acc: .065, arms: ['ball', 'heavy', 'bounce', 'drill', 'fire'], reward: 340 },
    { land: 5, me: 'bunker', bot: 'bunker', acc: .058, arms: ['ball', 'heavy', 'cluster', 'fire', 'rocket'], reward: 380 },
    { land: 4, me: 'castle', bot: 'citadel', acc: .05, arms: ['ball', 'heavy', 'drill', 'rocket', 'mortar'], reward: 420 },
    { land: 2, me: 'icewall', bot: 'citadel', acc: .042, arms: ['ball', 'heavy', 'fire', 'mortar', 'bricks'], reward: 460 },
    { land: 3, me: 'citadel', bot: 'castle', acc: .034, arms: ['ball', 'heavy', 'cluster', 'drill', 'rocket', 'quake'], reward: 520 },
    { land: 5, me: 'citadel', bot: 'citadel', acc: .026, arms: ['ball', 'heavy', 'cluster', 'drill', 'fire', 'mortar', 'quake'], reward: 600 },
  ];
  const BATTLE_N = ['First Volley', 'Keep and Keep', 'Gorge Duel', 'Thin Ice', 'Channel Fire', 'Towers at Dusk', 'Timber and Brick', 'Ember Bunkers', 'Steel Across the Water', 'Frozen Citadel', 'Night Siege', 'The Last Peak'];
  /* ---------- setting up a battle ---------- */
  // cfg: { land, forts: [left, right], seed, first, wind, names, cols, bots: [bool,bool], remote: [bool,bool], acc: [a,a], arms: [[...],[...]] }
  function setup(cfg) {
    seed = cfg.seed; srnd = mulberry(seed); L = LANDS[cfg.land];
    mat.fill(0); hp.fill(0); heat.fill(0); col.fill(0);
    parts.length = 0; fx.length = 0; shells.length = 0; bodies.length = 0; blasts.length = 0; hots.length = 0;
    ground();
    P.length = 0;
    for (let s = 0; s < 2; s++) {
      const x = buildFort(s ? -1 : 1, cfg.forts[s]);
      const ammo = {}; for (const k of cfg.arms[s]) ammo[k] = WEAP[WK[k]].ammo;
      P.push({ name: cfg.names[s], col: cfg.cols[s], bot: !!cfg.bots[s], remote: !!cfg.remote[s], acc: cfg.acc[s], side: s ? -1 : 1, x, y: 0, spawn: x, lives: 3, ang: .7, pow: .62, w: 'ball', ammo, vy: 0, falling: false, fall0: 0, hitShot: false, flash: 0, tAng: .7, tPow: .62 });
    }
    support(true); bodies.length = 0;
    for (const p of P) seatCannon(p);
    cur = cfg.first; turnN = 0; wind = cfg.wind; phase = 'aim'; after = 0; winner = -1; endT = 0; msgs = []; botPlan = null; botT = 1.2; firstShot = true;
    cam.x = WIDE[0]; cam.y = WIDE[1]; cam.z = WIDE[2]; recoil = [0, 0];
    passGate = !P[0].bot && !P[1].bot && !P[0].remote && !P[1].remote;
    if (net) { net.base = mat.slice(); net.baseCol = col.slice(); net.end = null; net.got = []; net.want = 0; }
    mode = 'play'; dirty = true;
    say(`${L.n}${kind === 'camp' ? ' · Battle ' + (level + 1) + ': ' + BATTLE_N[level] : ''}`, '#ffe2a0');
    if (passGate) phase = 'pass';
  }
  function windNext() { return Math.round((srnd() * 2 - 1) * (L.k === 'harbor' || L.k === 'frost' ? 9 : 7)) / 7; }
  function startQuick(land, diff, vsBot = true) {
    kind = vsBot ? 'quick' : 'local'; level = -1; const s = (Math.random() * 1e9) | 0, rf = () => FORT_KEYS.filter(k => k !== 'outpost')[Math.floor(Math.random() * (FORT_KEYS.length - 1))];
    const mine = WEAP.filter(w => owns(w.k)).map(w => w.k), botArms = ['ball', 'heavy', 'cluster', 'bounce', ...(diff >= 1 ? ['drill', 'fire'] : []), ...(diff >= 2 ? ['rocket', 'mortar'] : [])];
    setup({ land, forts: [qFortL === 'random' ? rf() : qFortL, qFortR === 'random' ? rf() : qFortR], seed: s, first: Math.random() < .5 ? 0 : 1, wind: 0, names: vsBot ? ['You', `${DIFF[diff].n} bot`] : ['Player 1', 'Player 2'], cols: [CANNON_COLS[colr].c, vsBot ? '#c4404a' : '#3d6fb6'], bots: [false, vsBot], remote: [false, false], acc: [0, DIFF[diff].acc], arms: [mine, vsBot ? botArms : mine] });
    if (kind === 'local') { P[1].col = CANNON_COLS[colr === 1 ? 0 : 1].c; }
  }
  function startCampaign(n) {
    kind = 'camp'; level = n; const C = CAMPAIGN[n], mine = WEAP.filter(w => owns(w.k)).map(w => w.k);
    setup({ land: C.land, forts: [C.me, C.bot], seed: (n + 1) * 7919 + ((Math.random() * 1e6) | 0), first: 0, wind: 0, names: ['You', `Captain ${['Moss', 'Brine', 'Cinder', 'Frost', 'Gull', 'Dusk', 'Ash', 'Ember', 'Tide', 'Glacier', 'Raven', 'Magma'][n]}`], cols: [CANNON_COLS[colr].c, '#c4404a'], bots: [false, true], remote: [false, false], acc: [0, C.acc], arms: [mine, C.arms] });
  }
  /* ---------- firing ---------- */
  const muzzle = p => { const a = p.ang, bx = p.x + p.side * Math.cos(a) * 7, by = p.y - 5 - Math.sin(a) * 7; return [bx, by]; };
  const speedOf = (k, pw) => (k === 'rocket' ? 150 : (48 + 112 * pw) * (k === 'mortar' ? 1.04 : 1));
  const WINDA = 16;
  function launch(pi, k, a, pw, local = true) {
    const p = P[pi], v = speedOf(k, pw), [mx, my] = muzzle({ ...p, ang: a });
    p.ang = a; p.pow = pw; p.w = k; if (k !== 'ball' && p.ammo[k] > 0) p.ammo[k]--;
    shells.push({ k, x: mx, y: my, vx: Math.cos(a) * v * p.side, vy: -Math.sin(a) * v, t: 0, live: true, owner: pi, bn: 0, dig: 0, burrow: 0, split: false, trail: [], lastFree: [mx, my] });
    phase = 'shot'; after = 0; slowT = 0; shooterLocal = local; for (const q of P) { q.hitShot = false; }
    recoil[pi] = 1; firstShot = false;
    flash(mx, my, 3.5, .14); smoke(mx, my, 6, 1); sparks(mx, my, 10, Math.atan2(-Math.sin(a), Math.cos(a) * p.side), 1, 120);
    K.sfx(k === 'rocket' ? 300 : 95, .35, 'sawtooth', .12, k === 'rocket' ? 600 : -50); K.noise(.3, .28, 380); K.shake(5);
    focus[0] = mx; focus[1] = my;
  }
  function fireLocal() {
    if (mode !== 'play' || phase !== 'aim') return; const p = P[cur]; if (p.bot || p.remote) return;
    if (!(p.w === 'ball' || p.ammo[p.w] > 0)) p.w = 'ball';
    if (net) MP.send({ t: 'fire', turn: turnN, k: p.w, a: p.ang, p: p.pow });
    launch(cur, p.w, p.ang, p.pow, true);
  }
  /* ---------- what a cannon takes ---------- */
  function hitPlayer(pi, why) {
    const p = P[pi]; if (p.hitShot || p.lives <= 0) return; p.hitShot = true; p.lives--; p.flash = 1;
    say(pi === cur ? `${why} ${P[pi].name === 'You' ? 'Own goal!' : 'Own goal for ' + p.name + '!'}` : `${why} ${p.name} ${p.name === 'You' ? 'lose' : 'loses'} a life.`, pi === 0 && P[1].bot ? '#ff9a9a' : '#ffe08a');
    K.shake(10); K.sfx(180, .4, 'square', .08, -120); slowT = Math.max(slowT, 1);
    for (let q = 0; q < 24; q++) debris(p.x + (R() - .5) * 6, p.y - 4, (R() - .5) * 60, -20 - R() * 40, rgb(90 + rint(0, 60), 70, 50), 0);
  }
  function boom(x, y, k, o = {}) {
    const [r, Pw] = BOOM[k] || BOOM.ball;
    blast(x, y, r, Pw, { heat: k === 'fire' ? 1500 : 520, maxT: k === 'fire' ? 1400 : 640, back: o.back });
    if (k === 'fire') { hots.push({ x, y, r: 7, P: 1500, l: 5, t: 0, maxT: 1400, burn: 1 }); for (let q = 0; q < 8; q++) { const a = R() * TAU, v = 14 + R() * 40; clump(x, y, Math.cos(a) * v, Math.sin(a) * v - 16, rint(6, 11), 1250); } }
    if (k === 'quake') { for (let yy = -11; yy <= 11; yy++) for (let xx = -11; xx <= 11; xx++) { if (xx * xx + yy * yy > 121) continue; const cx = Math.floor(x + xx), cy = Math.floor(y + yy); if (!inb(cx, cy)) continue; const i = idx(cx, cy), m = mat[i]; if (m && m !== BED && m !== DIRT && M[m].hp < 20 && R() < .55) { mat[i] = RUB; hp[i] = M[RUB].hp; } } K.shake(16); dirty = true; }
    for (let pi = 0; pi < 2; pi++) { const p = P[pi], d = Math.hypot(x - p.x, y - (p.y - 3)); if (d < r * .72 + 3.5) hitPlayer(pi, d < 4 ? 'Direct hit!' : 'Hit!'); }
    slowT = Math.max(slowT, .7);
  }
  function buildWall(x, y) {   // the brick crate: a wall grows up from where it lands
    const bx = Math.floor(x), by = Math.floor(y); let base = by; while (base < GH - 1 && !mat[idx(bx, base + 1)]) base++;
    for (let j = 0; j < 18; j++) for (let i = -3; i <= 3; i++) {
      const cx = bx + i, cy = base - j; if (!inb(cx, cy) || mat[idx(cx, cy)]) continue;
      if (P.some(p => Math.abs(cx - p.x) <= 5 && cy >= p.y - 9 && cy < p.y)) continue;
      set(cx, cy, BRICK);
    }
    smoke(bx, base - 6, 10, 1.4); K.sfx(140, .3, 'triangle', .1, -40); K.noise(.2, .2, 500); dirty = true;
  }
  function splash(s) {
    const x = s.x, y = liq[Math.floor(cl(s.x, 0, GW - 1))];
    if (L.liquid.kill) { for (let q = 0; q < 14; q++) debris(x, y - 1, (R() - .5) * 40, -20 - R() * 40, 0, 1, 1000); flash(x, y, 3, .2); K.noise(.3, .2, 400); }
    else { for (let q = 0; q < 22; q++) fx.push({ k: 'p', x: x + (R() - .5) * 3, y: y - 1, vx: (R() - .5) * 30, vy: -30 - R() * 50, t: 0, l: .9 + R() * .5 }); K.noise(.35, .16, 900); }
    s.live = false; say('Splash! It sank.', '#bfe8ff');
  }
  function explode(s, k) { s.live = false; const [fx0, fy0] = s.lastFree; boom(fx0, fy0, k || s.k, { back: Math.atan2(-s.vy, -s.vx) }); }
  function stepShells(h) {
    for (let n = shells.length - 1; n >= 0; n--) {
      const s = shells[n];
      if (!s.live) { shells.splice(n, 1); continue; }
      s.t += h;
      if (s.burrow > 0) {   // the drill, boring on through whatever it is in
        const ux = s.vx / (Math.hypot(s.vx, s.vy) || 1), uy = s.vy / (Math.hypot(s.vx, s.vy) || 1);
        for (let q = 0; q < 2 && s.live; q++) {
          s.x += ux * .9; s.y += uy * .9; s.burrow -= .9;
          for (let o = -1; o <= 1; o++) { const cx = Math.floor(s.x - uy * o), cy = Math.floor(s.y + ux * o); if (!inb(cx, cy)) continue; const i = idx(cx, cy), m = mat[i]; if (m === BED) { s.burrow = 0; break; } if (m) { destroy(i, -ux * 30 + (R() - .5) * 30, -uy * 30 - 10); warm(i, 0, 0); } }
          if (R() < .6) sparks(s.x, s.y, 2, Math.atan2(-uy, -ux), 1.6, 90);
          if (s.burrow <= 0 || !inb(Math.floor(s.x), Math.floor(s.y))) { s.lastFree = [s.x, s.y]; explode(s, 'drill'); break; }
        }
        dirty = true; continue;
      }
      if (s.k !== 'rocket') { s.vy += G * h; s.vx += wind * WINDA * h; }
      if (s.k === 'cluster' && !s.split && s.t > .25 && s.vy > 0) {   // bursts at the top of the arc
        s.split = true; s.live = false; flash(s.x, s.y, 3, .15); K.sfx(600, .12, 'square', .05, -200);
        for (let q = 0; q < 5; q++) shells.push({ k: 'bomblet', x: s.x, y: s.y, vx: s.vx + (q - 2) * 9, vy: s.vy - 8 + Math.abs(q - 2) * 4, t: 0, live: true, owner: s.owner, bn: 0, trail: [], lastFree: [s.x, s.y] });
        continue;
      }
      const sp = Math.hypot(s.vx, s.vy), sub = Math.max(1, Math.ceil(sp * h / .45));
      for (let q = 0; q < sub && s.live; q++) {
        const hh = h / sub; s.x += s.vx * hh; s.y += s.vy * hh;
        if (s.x < -30 || s.x > GW + 30 || s.y > GH + 4 || s.t > 12) { s.live = false; if (!['bomblet'].includes(s.k)) say('Missed!', '#ffcf9a'); break; }
        if (s.y < 0 || s.x < 0 || s.x >= GW) { s.lastFree = [s.x, s.y]; continue; }
        if (L.liquid && wet(s.x, s.y)) { splash(s); break; }
        // straight into a cannon
        const hitC = P.findIndex(p => Math.abs(s.x - p.x) < 4.6 && s.y > p.y - 7.5 && s.y < p.y);
        if (hitC >= 0 && !(hitC === s.owner && s.t < .35)) { s.lastFree = [s.x, s.y]; if (s.k === 'bricks') buildWall(s.x, s.y); else explode(s, s.k === 'heavy' || s.k === 'drill' ? 'heavy' : s.k); break; }
        const cx = Math.floor(s.x), cy = Math.floor(s.y), m = mat[idx(cx, cy)];
        if (!m) { s.lastFree = [s.x, s.y]; continue; }
        if (s.k === 'bounce' && s.bn < 3) {   // bounce off the surface it hit
          const [fx0, fy0] = s.lastFree; s.x = fx0; s.y = fy0; let nx = 0, ny = 0;
          for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) { const a = Math.floor(fx0 + xx), b = Math.floor(fy0 + yy); if (inb(a, b) && mat[idx(a, b)]) { nx -= xx; ny -= yy; } }
          const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl; const vn = s.vx * nx + s.vy * ny;
          s.vx = (s.vx - 2 * vn * nx) * .62; s.vy = (s.vy - 2 * vn * ny) * .62; s.bn++;
          sparks(fx0, fy0, 8, Math.atan2(ny, nx), 2, 60); K.sfx(420 - s.bn * 60, .1, 'triangle', .08, -100);
          if (Math.hypot(s.vx, s.vy) < 18) { explode(s); } break;
        }
        if (s.k === 'drill') { s.burrow = 26; K.sfx(200, .6, 'sawtooth', .05, 300); break; }
        if (s.k === 'heavy' && s.dig < 7 && m !== BED) {   // digs a few pixels in before it goes off
          let budget = 30; for (let o = -1; o <= 1; o++) { const a = Math.floor(s.x + (s.vy / sp) * o), b = Math.floor(s.y - (s.vx / sp) * o); if (!inb(a, b)) continue; const i = idx(a, b), mm = mat[i]; if (mm && mm !== BED && budget > 0) { budget -= Math.min(hp[i], 30); destroy(i, -s.vx * .2, -s.vy * .2 - 8); } }
          s.dig++; s.vx *= .7; s.vy *= .7; sparks(s.x, s.y, 3, Math.atan2(-s.vy, -s.vx), 2, 80); if (s.dig >= 7 || Math.hypot(s.vx, s.vy) < 10) explode(s); continue;
        }
        if (s.k === 'bricks') { s.live = false; buildWall(s.lastFree[0], s.lastFree[1]); break; }
        explode(s); break;
      }
      if (s.live) { s.trail.push([s.x, s.y]); if (s.trail.length > 16) s.trail.shift(); }
    }
  }
  /* ---------- cannons fall when what is under them goes ---------- */
  function stepCannons(h) {
    for (let pi = 0; pi < 2; pi++) {
      const p = P[pi]; let held = false;
      for (let dx = -3; dx <= 3 && !held; dx++) { const x = p.x + dx; if (inb(x, p.y) && isStatic(mat[idx(x, p.y)])) held = true; }
      if (!held) { if (!p.falling) { p.falling = true; p.fall0 = p.y; p.vy = 0; } p.vy += G * h; p.fy = (p.fy ?? p.y) + p.vy * h; const ny = Math.floor(p.fy);
        let landed = false; for (let y = p.y + 1; y <= ny; y++) { let solid = false; for (let dx = -3; dx <= 3; dx++) { const x = p.x + dx; if (inb(x, y) && isStatic(mat[idx(x, y)])) solid = true; } p.y = y; if (solid) { landed = true; break; } }
        if (p.y >= GH - 1 || (L.liquid && wet(p.x, p.y - 2))) { hitPlayer(pi, L.liquid && L.liquid.kill ? 'Into the lava!' : L.liquid ? 'Sunk!' : 'Fell!'); respawn(p); continue; }
        if (landed) { const drop = p.y - p.fall0; p.falling = false; p.fy = undefined; p.vy = 0; smoke(p.x, p.y - 1, 4, 1); K.noise(.2, .2, 260); if (drop >= 10) hitPlayer(pi, 'Toppled!'); }
      } else { p.falling = false; p.fy = undefined; p.vy = 0; let lift = 0; while (lift < 6 && inb(p.x, p.y - 1) && [-2, 0, 2].some(dx => inb(p.x + dx, p.y - 1) && isStatic(mat[idx(p.x + dx, p.y - 1)]))) { p.y--; lift++; } }
      if (p.flash > 0) p.flash = Math.max(0, p.flash - h * 1.6);
    }
  }
  function respawn(p) { p.falling = false; p.fy = undefined; p.vy = 0; p.x = p.spawn; for (let k = 0; k < 40 && P.some(q => q !== p && Math.abs(q.x - p.x) < 10); k++) p.x += p.side; seatCannon(p); smoke(p.x, p.y - 4, 10, 1.6); }
  /* ---------- turns ---------- */
  function settled() { return !shells.length && !bodies.length && P.every(p => !p.falling) && parts.length < 60; }
  function endTurn() {
    phase = 'aim'; after = 0; slowT = 0;
    const dead = P.findIndex(p => p.lives <= 0);
    if (dead >= 0) { winner = P[0].lives <= 0 && P[1].lives <= 0 ? cur : 1 - dead; phase = 'over'; endT = 0; say(`${P[winner].name} ${P[winner].name === 'You' ? 'win' : 'wins'} the duel!`, '#9effb0'); K.chime(392, [0, 4, 7, 12]); return; }
    cur = 1 - cur; turnN++; wind = windNext(); botPlan = null; botT = .9;
    if (passGate) phase = 'pass';
  }
  /* ---------- online: the shooter's world is the one both screens keep ---------- */
  Object.assign(MP.opts, {
    max: 2, min: 2, bots: 0, solo: 'Play a bot instead', sub: 'A duel for two. Take turns firing at each other’s fort.',
    config: () => ({ land: Math.floor(Math.random() * LANDS.length), forts: [pick(FORT_KEYS.slice(1)), pick(FORT_KEYS.slice(1))], seed: (Math.random() * 1e9) | 0, first: Math.random() < .5 ? 0 : 1 }),
    onStart: (cfg, roster) => {
      if (roster.length < 2 || roster[1].bot) { net = null; startQuick(Math.floor(Math.random() * LANDS.length), 1, true); return; }
      net = { me: roster.findIndex(r => r.id === MP.id) }; kind = 'online'; level = -1;
      const mine = WEAP.map(w => w.k);   // everyone gets the full arsenal online
      setup({ land: cfg.land, forts: cfg.forts, seed: cfg.seed, first: cfg.first, wind: 0, names: roster.map(r => r.id === MP.id ? 'You' : r.name), cols: [roster[0].col, roster[1].col], bots: [false, false], remote: roster.map(r => r.id !== MP.id), acc: [0, 0], arms: [mine, mine] });
    },
    onMsg: m => {
      if (!net || mode !== 'play') return;
      if (m.t === 'aim' && P[cur].remote) { P[cur].tAng = m.a; P[cur].tPow = m.p; P[cur].w = m.k; }
      if (m.t === 'fire' && P[cur].remote && phase === 'aim' && m.turn === turnN) launch(cur, m.k, m.a, m.p, false);
      if (m.t === 'sync' && m.turn === turnN) { net.got[m.i] = m.d; net.want = m.n; }
      if (m.t === 'end' && m.turn === turnN) net.end = m;
    },
    onLeave: () => { if (net && mode === 'play' && phase !== 'over') { winner = net.me; phase = 'over'; endT = 0; say('Your opponent left. You win!', '#9effb0'); } },
  });
  function encodeDiff() {   // runs of changed cells since the last agreed world: "start,length,material" in base 36
    const out = []; let i = 0;
    while (i < N) { if (mat[i] === net.base[i]) { i++; continue; } const m = mat[i], s0 = i; while (i < N && mat[i] !== net.base[i] && mat[i] === m) i++; out.push(s0.toString(36) + ',' + (i - s0).toString(36) + ',' + m.toString(36)); }
    return out.join(';');
  }
  function sendResult() {
    const d = encodeDiff(), chunks = []; for (let k = 0; k < d.length; k += 14000) chunks.push(d.slice(k, k + 14000)); if (!chunks.length) chunks.push('');
    chunks.forEach((c, i) => MP.send({ t: 'sync', turn: turnN, i, n: chunks.length, d: c }));
    const nw = windNext();
    MP.send({ t: 'end', turn: turnN, lives: P.map(p => p.lives), xs: P.map(p => p.x), ys: P.map(p => p.y), wind: nw });
    net.base = mat.slice(); net.baseCol = col.slice(); return nw;
  }
  function applyResult() {
    const e = net.end, d = net.got.join('');
    mat.set(net.base); col.set(net.baseCol); hp.fill(0); bodies.length = 0; shells.length = 0; parts.length = 0;
    if (d) for (const run of d.split(';')) { const [a, b, c] = run.split(',').map(v => parseInt(v, 36)); for (let i = a; i < a + b; i++) { mat[i] = c; col[i] = c ? tone(c, i % GW, (i / GW) | 0) : 0; } }
    for (let i = 0; i < N; i++) hp[i] = mat[i] ? M[mat[i]].hp : 0;
    e.lives.forEach((v, i) => { P[i].lives = v; P[i].x = e.xs[i]; P[i].y = e.ys[i]; P[i].falling = false; });
    net.base = mat.slice(); net.baseCol = col.slice(); net.end = null; net.got = []; net.want = 0; dirty = true;
    endTurn(); wind = e.wind;
  }
  /* ---------- the simulation step ---------- */
  const WIDE = [WW / 2, 470, .8], cam = { x: WIDE[0], y: WIDE[1], z: WIDE[2] }, focus = [0, 0];
  function simStep() {
    const h = 1 / 60;
    stepShells(h); stepHots(h); stepParts(h); stepBodies(h); stepCells(h); if (P.length) stepCannons(h);
    for (const b of blasts) b.t += h; while (blasts.length && blasts[0].t > 1) blasts.shift();
    if (dirty && (frame % 6 === 0)) { dirty = false; support(); }
    if (phase === 'shot') {
      if (settled()) after += h; else after = 0;
      if (after > .8) {
        if (!net) endTurn();
        else if (shooterLocal) { const nw = sendResult(); endTurn(); wind = nw; }
        else phase = 'sync';
      }
    } else if (phase === 'sync') { if (net.end && net.got.filter(x => x !== undefined).length >= net.want) applyResult(); }
  }
  function stepFx(dt) {
    for (let k = fx.length - 1; k >= 0; k--) {
      const f = fx[k]; f.t += dt;
      if (f.k === 's') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy *= .98; f.r += dt * 3; }
      else if (f.k === 'f') { f.x += f.vx * dt; f.y += f.vy * dt; }
      else if (f.k === 'p') { f.vy += G * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
      else if (f.k === 'g') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .97; f.vy *= .97; }
      else if (f.k === 'e') { f.vy += G * .12 * dt; f.vx *= .975; f.vy *= .975; f.x += f.vx * dt; f.y += f.vy * dt; }
      else if (f.k === 'k') { f.vy += G * .6 * dt; f.vx *= .985; const nx = f.x + f.vx * dt, ny = f.y + f.vy * dt, cx = Math.floor(nx), cy = Math.floor(ny); if (inb(cx, cy) && isStatic(mat[idx(cx, cy)])) { f.vy *= -.35; f.vx *= .6; } else { f.x = nx; f.y = ny; } }
      if (f.t > f.l) fx.splice(k, 1);
    }
  }
  /* ---------- the bot: a ballistic search with the wind, then a human-sized error ---------- */
  function trace(pi, k, a, pw, tx, ty, wd) {
    const p = P[pi], v = speedOf(k, pw); let [x, y] = muzzle({ ...p, ang: a }), vx = Math.cos(a) * v * p.side, vy = -Math.sin(a) * v, md = 1e9, hx = -1, hy = 0, wall = 0;
    for (let s = 0; s < 900; s++) {
      if (k !== 'rocket') { vy += G / 60; vx += wd * WINDA / 60; }
      x += vx / 60; y += vy / 60; if (x < 0 || x >= GW || y > GH) break; const dd = Math.hypot(x - tx, y - ty); if (dd < md) md = dd;
      if (y > 0) { if (L.liquid && wet(x, y)) { hx = x; hy = y; md += 30; break; } const m = mat[idx(Math.floor(x), Math.floor(y))]; if (m) { hx = x; hy = y; break; } }
    }
    if (hx >= 0) { const Ld = Math.hypot(tx - hx, ty - hy); for (let q = 0; q < Ld; q++) { const i = idx(Math.floor(hx + (tx - hx) * q / Ld), Math.floor(hy + (ty - hy) * q / Ld)), m = mat[i]; if (m && m !== BED) wall += Math.min(hp[i], 20); } }
    return { md, wall, hx, hy };
  }
  function planBot(pi) {
    const p = P[pi], foe = P[1 - pi], tx = foe.x, ty = foe.y - 3, have = k => k === 'ball' || p.ammo[k] > 0;
    let best = null;
    for (let a = .12; a < 1.42; a += .035) for (let pw = .2; pw <= 1.001; pw += .025) {
      const r = trace(pi, 'ball', a, pw, tx, ty, wind), sc = r.md + r.wall * .35 + (a > 1 ? 2 : 0);
      if (!best || sc < best.sc) best = { a, pw, sc, ...r };
    }
    let k = 'ball';
    if (best.wall > 12) k = have('drill') ? 'drill' : have('heavy') ? 'heavy' : have('mortar') ? 'mortar' : 'ball';
    else if (best.md < 6 && have('heavy') && R() < .4) k = 'heavy';
    else if (have('cluster') && R() < .25) k = 'cluster';
    else if (have('fire') && R() < .15) k = 'fire';
    else if (have('quake') && foe.lives === 1 && R() < .5) k = 'quake';
    if (k === 'rocket' || (have('rocket') && R() < .15 && Math.abs(foe.y - p.y) < 30)) { k = 'rocket'; best.a = Math.atan2(-(ty - (p.y - 5)), Math.abs(tx - p.x)); best.pw = 1; }
    const g = () => (R() + R() + R() - 1.5) / 1.5, err = p.acc * (1 + (turnN < 2 ? .6 : 0));
    return { k, a: cl(best.a + g() * err * 1.4, .05, 1.48), pw: cl(best.pw + g() * err * 2.2, .15, 1) };
  }
  /* ---------- input ---------- */
  const btn = {}, inR = (b, x, y) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h, keys = new Set();
  const toWorld = (sx, sy) => [(sx - 640) / cam.z + cam.x, (sy - 360) / cam.z + cam.y];
  const myTurn = () => mode === 'play' && phase === 'aim' && P[cur] && !P[cur].bot && !P[cur].remote;
  let aiming = false, downAt = null, lastAimSend = 0;
  function aimAt(sx, sy) {
    const p = P[cur], [wx, wy] = toWorld(sx, sy), px = p.x * CS, py = (p.y - 5) * CS, dx = (wx - px) * p.side, dy = py - wy;
    p.ang = cl(Math.atan2(dy, Math.max(dx, -40)), .03, 1.5); p.pow = cl((Math.hypot(dx, dy) - 30) / 560, .15, 1); sendAim();
  }
  function sendAim() { if (!net || t - lastAimSend < .12) return; lastAimSend = t; const p = P[cur]; MP.send({ t: 'aim', a: p.ang, p: p.pow, k: p.w }); }
  GAME.down = (x, y, e) => {
    K.audio && K.audio();
    for (const k in btn) if (inR(btn[k], x, y)) return press(k);
    if (mode === 'play' && phase === 'pass') { phase = 'aim'; return; }
    if (mode === 'play' && phase === 'over' && endT > 1.2) return finish();
    if (mode === 'play' && phase === 'shot' && !net) { ffwd = true; return; }
    if (myTurn() && y < 600 && y > 92) { aiming = true; downAt = [x, y, e && e.pointerType]; aimAt(x, y); }
  };
  GAME.move = (x, y, e) => { if (!myTurn()) return; if (aiming || (e && e.pointerType === 'mouse' && y < 600 && y > 92)) aimAt(x, y); };
  GAME.up = (x, y, e) => {
    if (aiming && myTurn()) { aiming = false; const quick = downAt && Math.hypot(x - downAt[0], y - downAt[1]) < 14, mouse = downAt && downAt[2] === 'mouse'; if (mouse && quick) fireLocal(); else if (!mouse && !quick) fireLocal(); }
    aiming = false;
  };
  GAME.key = (c, d) => {
    if (d) keys.add(c); else keys.delete(c); if (!d) return;
    if (mode === 'play') {
      if (phase === 'pass' && (c === 'Enter' || c === 'Space')) { phase = 'aim'; return; }
      if (phase === 'over' && endT > 1.2 && (c === 'Enter' || c === 'Space')) return finish();
      if (phase === 'shot' && c === 'Space' && !net) { ffwd = true; return; }
      if (myTurn()) { if (c === 'Space' || c === 'Enter') fireLocal(); const n = /^Digit(\d)$/.exec(c); if (n) pickW(+n[1] - 1); if (c === 'KeyQ') cycleW(-1); if (c === 'KeyE') cycleW(1); }
      if (c === 'Escape' && phase !== 'shot') press('quit');
      return;
    }
    if (c === 'Escape' && mode !== 'menu') mode = 'menu';
  };
  const armsOf = p => WEAP.filter(w => w.k in p.ammo);
  function pickW(i) { const p = P[cur], list = armsOf(p); if (list[i] && (list[i].k === 'ball' || p.ammo[list[i].k] > 0)) { p.w = list[i].k; sendAim(); } }
  function cycleW(d) { const p = P[cur], list = armsOf(p).filter(w => w.k === 'ball' || p.ammo[w.k] > 0); const i = list.findIndex(w => w.k === p.w); p.w = list[(i + d + list.length) % list.length].k; sendAim(); }
  function press(k) {
    if (k === 'm:camp') { mode = 'camp'; return; } if (k === 'm:quick') { mode = 'quick'; return; } if (k === 'm:arm') { mode = 'arm'; return; }
    if (k === 'm:local') { startQuick(qLand, 1, false); return; }
    if (k === 'm:online') { mode = 'lobby'; MP.show(); return; }
    if (k === 'back' || k === 'menu') { mode = 'menu'; net = null; MP.leave(); MP.hide(); return; }
    if (k.startsWith('lvl')) { const n = +k.slice(3); if (lvOk(n)) startCampaign(n); else say('Win the battle before it first', '#ff9a9a'); return; }
    if (k.startsWith('land')) { qLand = +k.slice(4); return; } if (k.startsWith('diff')) { qDiff = +k.slice(4); return; }
    if (k.startsWith('fl:')) { qFortL = k.slice(3); return; } if (k.startsWith('fr:')) { qFortR = k.slice(3); return; }
    if (k === 'go') { startQuick(qLand, qDiff, true); return; }
    if (k.startsWith('w:')) { const i = +k.slice(2); pickW(i); return; }
    if (k === 'fire') return fireLocal();
    if (k === 'skip') { ffwd = true; return; }
    if (k === 'quit') { if (net) { MP.leave(); net = null; } mode = 'menu'; return; }
    if (k === 'again') { if (kind === 'camp') startCampaign(level); else if (kind === 'local') startQuick(qLand, 1, false); else startQuick(qLand, qDiff, true); return; }
    if (k === 'next') { if (lvOk(level + 1) && level + 1 < CAMPAIGN.length) startCampaign(level + 1); else mode = 'camp'; return; }
    if (k.startsWith('buy:')) { const w = WEAP[WK[k.slice(4)]]; if (owns(w.k)) return; if (coins < w.cost) { say('Not enough coins', '#ff9a9a'); return; } coins -= w.cost; own[w.k] = true; K.chime(660, [0, 4, 7]); save(); return; }
    if (k.startsWith('col:')) { const i = +k.slice(4), c = CANNON_COLS[i]; if (c.cost && !cols[i]) { if (coins < c.cost) { say('Not enough coins', '#ff9a9a'); return; } coins -= c.cost; cols[i] = true; K.chime(660, [0, 4, 7]); } colr = i; save(); return; }
  }
  function finish() {
    const won = winner >= 0 && !P[winner].bot && !P[winner].remote && kind !== 'local', livesLeft = winner >= 0 ? P[winner].lives : 0;
    let got = 0, first = false, st = 0;
    if (kind === 'camp' && won) { st = livesLeft; first = !camp[level]; if (st > (camp[level] || 0)) camp[level] = st; got = Math.round(CAMPAIGN[level].reward * (.6 + .2 * st) * (first ? 1 : .4)); }
    else if (kind === 'quick' && won) got = Math.round((70 + 30 * livesLeft) * [.7, 1, 1.5][qDiff]);
    else if (kind === 'online' && won) got = 150 + 40 * livesLeft;
    else if (kind !== 'local') got = 25;
    if (won) wins++;
    coins += got; total += got; K.score = total; save();
    res = { won, got, st, first, kind, name: winner >= 0 ? P[winner].name : '' }; mode = 'result';
    if (net) { MP.leave(); net = null; }
  }
  /* ---------- kit hooks ---------- */
  let ffwd = false;
  GAME.reset = () => {
    const S = SV(); coins = S.coins || 0; own = { ...(S.own || {}) }; cols = { ...(S.cols || {}) }; colr = S.colr || 0; camp = { ...(S.camp || {}) }; total = S.total || 0; wins = S.wins || 0;
    K.score = total; mode = 'menu'; msgs = []; net = null;
    if (K.bot) { kind = 'demo'; const l = Math.floor(Math.random() * LANDS.length), f = FORT_KEYS.slice(1); setup({ land: l, forts: [pick(f), pick(f)], seed: (Math.random() * 1e9) | 0, first: 0, wind: 0, names: ['Blue crew', 'Red crew'], cols: ['#3d6fb6', '#c4404a'], bots: [true, true], remote: [false, false], acc: [.05, .05], arms: [WEAP.map(w => w.k), WEAP.map(w => w.k)] }); return; }
    if (/[?&]room=/.test(location.search)) { mode = 'lobby'; MP.show(); }
  };
  GAME.update = dt => {
    t += dt; if (posed) return; for (const m of msgs) m.t += dt; msgs = msgs.filter(m => m.t < 3.6);
    if (mode !== 'play') return;
    if (myTurn() && keys.size) { const p = P[cur], f = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.5 : 1; if (keys.has('ArrowLeft') || keys.has('KeyA')) p.ang = cl(p.ang + dt * .45 * f * p.side, .03, 1.5); if (keys.has('ArrowRight') || keys.has('KeyD')) p.ang = cl(p.ang - dt * .45 * f * p.side, .03, 1.5); if (keys.has('ArrowUp') || keys.has('KeyW')) p.pow = cl(p.pow + dt * .3 * f, .15, 1); if (keys.has('ArrowDown') || keys.has('KeyS')) p.pow = cl(p.pow - dt * .3 * f, .15, 1); sendAim(); }
    for (const p of P) if (p.remote) { p.ang = lp(p.ang, p.tAng, 1 - Math.exp(-dt * 10)); p.pow = lp(p.pow, p.tPow, 1 - Math.exp(-dt * 10)); }
    recoil = recoil.map(r => Math.max(0, r - dt * 2.5));
    // bots aim slowly, then fire
    if (phase === 'aim' && P[cur].bot) {
      if ((botT -= dt) <= 0 && !botPlan) { botPlan = planBot(cur); botT = DIFF[1].think + R() * .6; }
      if (botPlan) { const p = P[cur]; p.w = botPlan.k; p.ang = lp(p.ang, botPlan.a, 1 - Math.exp(-dt * 3)); p.pow = lp(p.pow, botPlan.pw, 1 - Math.exp(-dt * 3)); if (botT <= 0) { launch(cur, botPlan.k, botPlan.a, botPlan.pw, true); botPlan = null; } }
    }
    if (phase === 'shot' || phase === 'sync') slowT = Math.max(0, slowT - dt);
    let steps = 0; const rate = ffwd ? 4 : phase === 'shot' && slowT > 0 ? .45 : 1;
    acc = Math.min(acc + dt * rate, .2); while (acc >= 1 / 60 && steps < 10) { acc -= 1 / 60; simStep(); steps++; }
    if (phase !== 'shot') ffwd = false;
    stepFx(steps / 60); stepCam(dt);
    if (phase === 'over') { endT += dt; if (K.bot && endT > 3) GAME.reset(); }
  };
  function stepCam(dt) {
    let tx = WIDE[0], ty = WIDE[1], tz = WIDE[2], rate = 3;
    const s = shells.find(q => q.live);
    if (phase === 'shot' && s) { tz = 1.02; rate = 4; focus[0] = s.x + s.vx * .25; focus[1] = s.y + s.vy * .15; tx = focus[0] * CS; ty = Math.min(focus[1] * CS, WH - 360 / tz + 60); }
    else if (phase === 'shot' && after < .7) { tz = 1.15; tx = focus[0] * CS; ty = Math.min(focus[1] * CS, WH - 360 / tz + 60); rate = 3; }
    if (s) { focus[0] = s.x; focus[1] = s.y; }
    tx = cl(tx, 640 / tz, WW - 640 / tz);
    const k = 1 - Math.exp(-dt * rate); cam.x = lp(cam.x, tx, k); cam.y = lp(cam.y, ty, k); cam.z = lp(cam.z, tz, 1 - Math.exp(-dt * 4));
  }
  function tx(g, s, x, y, font, c, al = 'center', st) { g.font = font; g.textAlign = al; g.textBaseline = 'middle'; if (st) { g.lineWidth = st; g.strokeStyle = 'rgba(4,8,16,.7)'; g.strokeText(s, x, y); } g.fillStyle = c; g.fillText(s, x, y); }
  const F = (px, w = 800) => `${w} ${px}px Nunito, sans-serif`, D = px => `${px}px "Russo One", sans-serif`;
  function rr(g, x, y, w, h, r, fill, stroke, lw = 2) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
  const INK = '#e6edf7', DIM = '#8a98ad', OFF = '#4f5d74', TEAL = '#4fe0c8', ORANGE = '#ff8a1e', GOLD = '#ffd23f', PAN = 'rgba(15,24,40,.94)', EDGE = '#24344c';
  function panel(g, x, y, w, h, r = 10, on) { rr(g, x, y, w, h, r, PAN, on ? ORANGE : EDGE, 2); }
  function hbtn(g, k, x, y, w, h, label, o = {}) {
    if (!o.off) btn[k] = { x, y, w, h };
    if (o.hot) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#f8dc98'); gr.addColorStop(1, '#e2b25a'); rr(g, x, y, w, h, 9, gr, '#fff0c4', 1.5); }
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
    g.fillStyle = L.ext; g.fillRect(-3000, eL * CS, 3000, 3000); g.fillRect(WW, eR * CS, 3000, 3000); g.fillRect(0, WH - 1, WW, 3000); g.fillStyle = `rgb(${L.grass})`; g.fillRect(-3000, eL * CS, 3000, CS * 2); g.fillRect(WW, eR * CS, 3000, CS * 2);
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
      if (f.k === 's') { g.fillStyle = `rgba(${L.smoke},${(.22 * (1 - k)).toFixed(3)})`; g.beginPath(); g.arc(f.x * CS, f.y * CS, f.r * CS, 0, TAU); g.fill(); }
      else if (f.k === 'k') { const h = 1 - k, c = h > .7 ? '255,252,235' : h > .42 ? '255,214,120' : h > .2 ? '255,150,60' : '200,84,40', x = f.x * CS, y = f.y * CS; g.strokeStyle = `rgba(${c},${Math.min(1, h * 1.7).toFixed(2)})`; g.lineWidth = f.w; g.beginPath(); g.moveTo(x, y); g.lineTo(x - f.vx * .045 * CS, y - f.vy * .045 * CS); g.stroke(); if (f.st && h > .25) { g.lineWidth = .7; g.beginPath(); g.moveTo(x - 2.4, y); g.lineTo(x + 2.4, y); g.moveTo(x, y - 2.4); g.lineTo(x, y + 2.4); g.stroke(); } }
      else if (f.k === 'a') { g.strokeStyle = `rgba(${f.c},${(.85 * (1 - k)).toFixed(2)})`; g.lineWidth = .8; g.beginPath(); f.p.forEach((q, i) => i ? g.lineTo(q[0] * CS, q[1] * CS) : g.moveTo(q[0] * CS, q[1] * CS)); g.stroke(); g.fillStyle = `rgba(220,250,255,${(1 - k).toFixed(2)})`; const q = f.p[1]; g.fillRect(q[0] * CS - 1, q[1] * CS - 1, 2, 2); }
      else if (f.k === 'g') { const a = Math.min(1, f.t * 9) * Math.pow(1 - k, 1.3), x = f.x * CS, y = f.y * CS, r = f.r * CS * (1 + k * .35); g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,214,120,${(.62 * a).toFixed(3)})`); gr.addColorStop(.45, `rgba(255,140,44,${(.36 * a).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
      else if (f.k === 'x') { const x = f.x * CS, y = f.y * CS, r = f.r * CS * (.7 + k * .6); g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,246,${(1 - k * k).toFixed(3)})`); gr.addColorStop(.38, `rgba(255,236,170,${(.95 * (1 - k)).toFixed(3)})`); gr.addColorStop(.7, `rgba(255,150,50,${(.5 * (1 - k)).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
      else if (f.k === 'v') { const x = f.x * CS, y = f.y * CS, r = f.r * CS; g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); g.rotate(f.a); const gr = g.createLinearGradient(0, 0, r, 0); gr.addColorStop(0, `rgba(255,214,140,${(.5 * (1 - k)).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -4); g.lineTo(r, -r * .34); g.lineTo(r, r * .34); g.lineTo(0, 4); g.closePath(); g.fill(); g.restore(); }
      else if (f.k === 'e') { const a = Math.min(1, (1 - k) * 2.5) * .9, x = f.x * CS, y = f.y * CS, r = f.r * CS; g.globalAlpha = a; g.fillStyle = k < .6 ? '#a8582a' : '#7a3c1c'; g.beginPath(); g.ellipse(x, y, r * .75, r * 1.05, .3, 0, TAU); g.fill(); g.fillStyle = k < .4 ? '#f0b070' : k < .7 ? '#d08444' : '#a8582a'; g.beginPath(); g.ellipse(x - r * .12, y - r * .2, r * .38, r * .55, .3, 0, TAU); g.fill(); g.globalAlpha = 1; }
      else if (f.k === 'f') { g.fillStyle = `rgba(255,${(190 - k * 120) | 0},50,${(1 - k).toFixed(2)})`; const s = 3 + k * 4; g.fillRect(Math.floor(f.x * CS / 2) * 2 - s / 2, Math.floor(f.y * CS / 2) * 2 - s / 2, s, s); }
      else if (f.k === 'p') { g.fillStyle = `rgba(214,240,255,${(1 - k).toFixed(2)})`; g.fillRect(f.x * CS - 2, f.y * CS - 2, 4, 4); }
      else if (f.k === 'j' || f.k === 'r') { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = f.k === 'j' ? `rgba(255,232,170,${1 - k})` : `rgba(255,200,120,${.6 * (1 - k)})`; g.lineWidth = f.k === 'j' ? 7 * (1 - k) + 2 : 1.2; g.beginPath(); g.moveTo(f.x * CS, f.y * CS); g.lineTo(f.x2 * CS, f.y2 * CS); g.stroke(); g.restore(); }
    }
  }
  const FILLC = { he: '#e8b83e', frag: '#aab2bc', therm: '#ff7a2a', incend: '#ff5a3c', cluster: '#4fd0e8', tandem: '#f0d060', plasma: '#b48cff', none: '#56606e' };
  const NOSE = { round: [17, .2, 1, 2.6], flat: [7, .1, 1, 8], point: [27, .42, .82, .7], ap: [27, .42, .82, .7], drill: [34, .62, .5, .5] };   // length, curve, shoulder, tip half-height
  const shellL = d => ({ 3: 78, 5: 72, 7: 82 }[part('cal', d.cal).w]), shellR = d => ({ 3: 6.5, 5: 10, 7: 13.5 }[part('cal', d.cal).w]);
  // a shell pointing right with its nose at (0,0); o.cut fades in the cut-away, o.crush flattens the nose
  /* ---------- drawing: the landscape behind the battlefield ---------- */
  const T = px => `${px}px "Titan One", sans-serif`, GOLDA = '#f3cf85';
  const CLOUDS = Array.from({ length: 9 }, (_, i) => ({ x: (i * 397) % 2400 - 400, y: 60 + (i * 137) % 260, w: 120 + (i * 53) % 140, s: 6 + (i % 3) * 3 }));
  function ridge(g, x0, x1, base, amp, f, ph, colr) { g.fillStyle = colr; g.beginPath(); g.moveTo(x0, 2000); for (let x = x0; x <= x1; x += 16) g.lineTo(x, base - amp * (.55 * Math.sin(x * f + ph) + .3 * Math.sin(x * f * 2.3 + ph * 1.7) + .15 * Math.sin(x * f * 5.1 + ph * .3))); g.lineTo(x1, 2000); g.fill(); }
  function backdrop(g, still) {
    const v = K.view, gr = g.createLinearGradient(0, v.y0, 0, v.y1); gr.addColorStop(0, L.sky[0]); gr.addColorStop(1, L.sky[1]); g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    if (L.stars) { g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 70; i++) { const x = (i * 211) % 1400 - 60, y = (i * 97) % 360, tw = .5 + .5 * Math.sin(t * 2 + i); g.globalAlpha = .3 + .6 * tw; g.fillRect(x, y, 2, 2); } g.globalAlpha = 1; }
    const sn = L.sun || L.moon; if (sn) { g.fillStyle = sn[2]; g.globalAlpha = .25; g.beginPath(); g.arc(sn[0], sn[1], 80, 0, TAU); g.fill(); g.globalAlpha = 1; g.beginPath(); g.arc(sn[0], sn[1], 44, 0, TAU); g.fill(); if (L.moon) { g.fillStyle = L.sky[0]; g.beginPath(); g.arc(sn[0] + 18, sn[1] - 10, 38, 0, TAU); g.fill(); } }
    for (let l = 0; l < 3; l++) {
      const par = [.15, .3, .5][l], zl = WIDE[2] * (1 + (cam.z / WIDE[2] - 1) * par), ox = WIDE[0] + (cam.x - WIDE[0]) * par, oy = WIDE[1] + (cam.y - WIDE[1]) * par;
      g.save(); g.translate(640, 360); g.scale(zl, zl); g.translate(-ox, -oy);
      if (l === 0) { g.fillStyle = L.cloud; for (const c of CLOUDS) { const x = ((c.x + t * c.s) % 2600) - 500; g.beginPath(); g.ellipse(x, c.y, c.w, c.w * .22, 0, 0, TAU); g.ellipse(x + c.w * .4, c.y - c.w * .14, c.w * .5, c.w * .2, 0, 0, TAU); g.fill(); } }
      ridge(g, -800, 2400, [430, 520, 600][l], [150, 110, 70][l], [.0032, .0047, .0063][l], [1, 2.3, 4.1][l] + LANDS.indexOf(L), [L.far, L.mid, L.near][l]);
      if (L.snow && l < 2) { g.fillStyle = 'rgba(255,255,255,.55)'; ridge(g, -800, 2400, [430, 520][l] - 40, [150, 110][l] * .5, [.0032, .0047][l], [1, 2.3][l] + 2, 'rgba(255,255,255,.35)'); }
      g.restore();
    }
    if (L.embers && !still) { g.fillStyle = 'rgba(255,170,90,.8)'; for (let i = 0; i < 40; i++) { const x = (i * 181 + t * 20 * (1 + i % 3)) % 1400 - 60, y = 720 - ((i * 113 + t * 40 * (1 + i % 4)) % 760); g.fillRect(x, y, 3, 3); } }
  }
  function drawLiquid(g) {
    const Lq = L.liquid; if (!Lq) return; let x0 = -1;
    for (let x = 0; x <= GW; x++) {
      const on = x < GW && liq[x] < 999;
      if (on && x0 < 0) x0 = x;
      if (!on && x0 >= 0) {
        const y = liq[x0] * CS, w = (x - x0) * CS, X = x0 * CS;
        g.fillStyle = `rgba(${Lq.c[0]},${Lq.c[1]},${Lq.c[2]},${(Lq.a / 255).toFixed(2)})`; g.fillRect(X, y + 3, w, WH - y);
        g.fillStyle = `rgb(${Lq.top[0]},${Lq.top[1]},${Lq.top[2]})`;
        for (let i = 0; i < w; i += 8) { const wv = Math.sin((X + i) * .05 + t * (Lq.kill ? 1.5 : 2.4)) * 2; g.fillRect(X + i, y + wv, 8, 4); }
        if (Lq.kill) { g.save(); g.globalCompositeOperation = 'lighter'; const gg = g.createLinearGradient(0, y - 60, 0, y + 10); gg.addColorStop(0, 'rgba(255,90,20,0)'); gg.addColorStop(1, 'rgba(255,120,40,.45)'); g.fillStyle = gg; g.fillRect(X, y - 60, w, 70); g.restore(); }
        x0 = -1;
      }
    }
  }
  /* ---------- cannons, shells and the aiming guide ---------- */
  function cannonArt(g, p, pi) {
    const px = p.x * CS, py = (p.y - 5) * CS, s = p.side, a = s > 0 ? -p.ang : Math.PI + p.ang, rk = recoil[pi] * recoil[pi] * 10, gy = p.y * CS;
    // the flag
    const fx0 = px - s * 22, wave = Math.sin(t * 5 + pi) * 3;
    g.fillStyle = '#5a4630'; g.fillRect(fx0 - 1.5, py - 34, 3, gy - py + 34);
    g.fillStyle = p.col; g.beginPath(); g.moveTo(fx0, py - 34); g.lineTo(fx0 - s * 22, py - 30 + wave); g.lineTo(fx0, py - 22); g.closePath(); g.fill();
    // the carriage and wheel
    g.fillStyle = '#6b4a2a'; g.beginPath(); g.moveTo(px - s * 16, gy); g.lineTo(px - s * 4, py - 2); g.lineTo(px + s * 8, py - 2); g.lineTo(px + s * 12, gy); g.closePath(); g.fill();
    g.fillStyle = '#4a321c'; g.fillRect(px - s * 18 - (s < 0 ? 8 : 0), gy - 5, 8, 5);
    // the barrel
    g.save(); g.translate(px, py); g.rotate(a);
    g.fillStyle = '#3a3f48'; g.fillRect(-10 - rk, -6, 38, 12); g.fillStyle = '#5a6270'; g.fillRect(-10 - rk, -6, 38, 3); g.fillStyle = '#272b31'; g.fillRect(-10 - rk, 3.5, 38, 2.5);
    g.fillStyle = p.col; g.fillRect(-4 - rk, -7, 5, 14); g.fillRect(14 - rk, -7, 3, 14); g.fillStyle = '#272b31'; g.fillRect(26 - rk, -8, 5, 16); g.beginPath(); g.arc(-10 - rk, 0, 6, 0, TAU); g.fill();
    g.restore();
    g.fillStyle = '#2e2014'; g.beginPath(); g.arc(px, gy - 8, 9, 0, TAU); g.fill(); g.strokeStyle = '#9a7a52'; g.lineWidth = 2.5; g.stroke();
    for (let k = 0; k < 6; k++) { const b = k / 6 * TAU + (p.x * .3); g.beginPath(); g.moveTo(px, gy - 8); g.lineTo(px + Math.cos(b) * 8, gy - 8 + Math.sin(b) * 8); g.stroke(); }
    if (p.flash > 0) { g.globalAlpha = p.flash * .7; g.fillStyle = '#ff3a3a'; g.fillRect(px - 26, py - 36, 52, gy - py + 36); g.globalAlpha = 1; }
  }
  function drawCannons(g) {
    P.forEach((p, i) => pix(g, p.x * CS - 64, (p.y - 5) * CS - 48, 128, 72, 2, c => cannonArt(c, p, i)));
    P.forEach((p, i) => { if (i === cur && (phase === 'aim' || phase === 'pass') && mode === 'play') { const x = p.x * CS, y = (p.y - 15) * CS + Math.sin(t * 5) * 4; g.fillStyle = GOLDA; g.beginPath(); g.moveTo(x - 9, y - 12); g.lineTo(x + 9, y - 12); g.lineTo(x, y); g.closePath(); g.fill(); } });
  }
  function shellArt(g, s) {
    const a = Math.atan2(s.vy, s.vx), X = s.x * CS, Y = s.y * CS;
    g.save(); g.translate(X, Y);
    switch (s.k) {
      case 'heavy': g.rotate(a); g.fillStyle = '#8a9aaa'; g.fillRect(-12, -5, 14, 10); g.beginPath(); g.moveTo(2, -5); g.quadraticCurveTo(10, -4, 12, 0); g.quadraticCurveTo(10, 4, 2, 5); g.fill(); g.fillStyle = '#d98a3a'; g.fillRect(-9, -5.5, 3, 11); break;
      case 'cluster': g.rotate(a); g.fillStyle = '#2d6f8a'; g.fillRect(-9, -6, 18, 12); g.fillStyle = '#4fb4d8'; for (let k = 0; k < 3; k++) g.fillRect(-7 + k * 5, -4, 3, 8); break;
      case 'bomblet': g.fillStyle = '#1e2a34'; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); g.fillStyle = '#4fb4d8'; g.fillRect(-1, -4, 2, 2); break;
      case 'bounce': g.rotate(s.t * 12); g.fillStyle = '#d8504a'; g.beginPath(); g.arc(0, 0, 6.5, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(-6.5, -1.5, 13, 3); break;
      case 'drill': g.rotate(a); g.fillStyle = '#8a7a50'; g.fillRect(-10, -5, 8, 10); g.fillStyle = '#c9a24a'; g.beginPath(); g.moveTo(-2, -5); g.lineTo(12, 0); g.lineTo(-2, 5); g.closePath(); g.fill(); g.strokeStyle = '#6a5a30'; g.lineWidth = 1.5; for (let k = 0; k < 3; k++) { const x = -1 + k * 4 + (s.t * 40) % 4; g.beginPath(); g.moveTo(x, -4 + k); g.lineTo(x + 3, 4 - k); g.stroke(); } break;
      case 'fire': g.fillStyle = '#b8643a'; g.beginPath(); g.ellipse(0, 1, 6.5, 6, 0, 0, TAU); g.fill(); g.fillStyle = '#7a3e1e'; g.fillRect(-3, -7, 6, 3); g.fillStyle = `rgb(255,${170 + Math.sin(t * 30) * 50 | 0},60)`; g.beginPath(); g.ellipse(0, -9, 3, 5, 0, 0, TAU); g.fill(); break;
      case 'rocket': g.rotate(a); g.fillStyle = '#e9eef4'; g.fillRect(-12, -4, 16, 8); g.fillStyle = '#d8504a'; g.beginPath(); g.moveTo(4, -4); g.lineTo(11, 0); g.lineTo(4, 4); g.fill(); g.fillRect(-12, -7, 4, 14); g.fillStyle = `rgba(255,${180 + R() * 60 | 0},80,.95)`; g.beginPath(); g.moveTo(-12, -3); g.lineTo(-22 - R() * 8, 0); g.lineTo(-12, 3); g.fill(); break;
      case 'bricks': g.rotate(s.t * 4); g.fillStyle = '#8a5a34'; g.fillRect(-7, -7, 14, 14); g.fillStyle = '#c46e4c'; g.fillRect(-5, -5, 4, 3); g.fillRect(1, -5, 4, 3); g.fillRect(-2, 0, 4, 3); g.strokeStyle = '#5a3a20'; g.lineWidth = 1.5; g.strokeRect(-7, -7, 14, 14); break;
      case 'mortar': g.fillStyle = '#4a5a3a'; g.beginPath(); g.arc(0, 0, 8.5, 0, TAU); g.fill(); g.fillStyle = '#6a7a52'; g.beginPath(); g.arc(-2.5, -2.5, 3.5, 0, TAU); g.fill(); break;
      case 'quake': { const r = 7 + Math.sin(t * 20) * 1.2; g.fillStyle = 'rgba(160,110,230,.35)'; g.beginPath(); g.arc(0, 0, r + 6, 0, TAU); g.fill(); g.fillStyle = '#7a4ac8'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.fillStyle = '#e6d6ff'; g.fillRect(-2, -2, 4, 4); break; }
      default: g.fillStyle = '#23272e'; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill(); g.fillStyle = '#6a7380'; g.beginPath(); g.arc(-2, -2, 2.2, 0, TAU); g.fill();
    }
    g.restore();
  }
  function drawShells(g) {
    for (const s of shells) {
      if (!s.live) continue;
      s.trail.forEach(([x, y], i) => { if (i % 2) return; g.fillStyle = `rgba(255,248,224,${(i / s.trail.length * .7).toFixed(2)})`; g.fillRect(x * CS - 1.5, y * CS - 1.5, 3, 3); });
      pix(g, s.x * CS - 40, s.y * CS - 40, 80, 80, 2, c => shellArt(c, s));
    }
  }
  function drawGuide(g) {
    if (!myTurn()) return;
    const p = P[cur], k = p.w, v = speedOf(k, p.pow); let [x, y] = muzzle(p), vx = Math.cos(p.ang) * v * p.side, vy = -Math.sin(p.ang) * v;
    for (let s = 1; s < 34; s++) {
      if (k !== 'rocket') vy += G / 60; x += vx / 60; y += vy / 60; if (inb(Math.floor(x), Math.floor(y)) && mat[idx(Math.floor(x), Math.floor(y))]) break;
      if (s % 3 === 0) { g.fillStyle = `rgba(255,255,255,${(.95 - s / 40).toFixed(2)})`; g.fillRect(x * CS - 2.5, y * CS - 2.5, 5, 5); }
    }
  }
  /* ---------- the HUD ---------- */
  function hearts(g, x, y, n, colr, al) { for (let i = 0; i < 3; i++) { const hx = x + (al === 'right' ? -i * 26 - 22 : i * 26); g.fillStyle = i < n ? colr : 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(hx + 11, y + 18); g.bezierCurveTo(hx - 4, y + 8, hx + 1, y - 2, hx + 11, y + 5); g.bezierCurveTo(hx + 21, y - 2, hx + 26, y + 8, hx + 11, y + 18); g.fill(); } }
  function windGauge(g, x, y) {
    panel(g, x - 110, y, 220, 44, 10); const w = wind, n = Math.round(Math.abs(w) * 7);
    tx(g, 'WIND', x - 92, y + 22, F(12), DIM, 'left');
    if (!n) { tx(g, 'calm', x + 18, y + 22, F(15), INK); return; }
    g.fillStyle = Math.abs(w) > .7 ? '#ff9a6a' : '#9fe2ff'; const d = Math.sign(w);
    for (let i = 0; i < n; i++) { const ax = x - 34 + i * 13 + (d < 0 ? 0 : 0), ay = y + 22; g.beginPath(); g.moveTo(ax + 5 * d + 4, ay); g.lineTo(ax - 5 * d + 4, ay - 7); g.lineTo(ax - 5 * d + 4, ay + 7); g.closePath(); g.fill(); }
    tx(g, n + '', x + 92, y + 22, F(16), INK, 'right');
  }
  function hud(g) {
    for (let i = 0; i < 2; i++) {
      const p = P[i], x = i ? 1260 - 330 : 64, on = cur === i && phase !== 'over';
      rr(g, x, 14, i ? 330 : 300, 60, 12, PAN, on ? GOLDA : EDGE, on ? 2.5 : 1.5);
      g.fillStyle = p.col; g.fillRect(i ? x + 312 : x + 12, 26, 6, 36);
      tx(g, p.name, i ? x + 300 : x + 30, 33, F(17), INK, i ? 'right' : 'left');
      tx(g, p.bot ? 'Bot' : p.remote ? 'Online' : P.filter(q => !q.bot && !q.remote).length > 1 ? `Player ${i + 1}` : 'You', i ? x + 300 : x + 30, 56, F(12, 700), DIM, i ? 'right' : 'left');
      hearts(g, i ? x + 200 : x + 130, 30, p.lives, '#ff5a6a', i ? 'right' : 'left');
    }
    windGauge(g, 640, 22);
    hbtn(g, 'quit', 1210, 86, 50, 36, '✕', { px: 15 });
    const p = P[cur];
    if (phase === 'aim' && myTurn()) {
      panel(g, 20, 626, 1240, 82, 12); const list = armsOf(p);
      list.forEach((w, i) => {
        const x = 30 + i * 88, n = w.k === 'ball' ? '∞' : p.ammo[w.k], on = p.w === w.k, off = w.k !== 'ball' && !p.ammo[w.k]; if (!off) btn['w:' + i] = { x, y: 634, w: 82, h: 66 };
        rr(g, x, 634, 82, 66, 9, on ? 'rgba(243,207,133,.22)' : 'rgba(24,36,56,.96)', on ? GOLDA : EDGE, on ? 2.5 : 1.5);
        pix(g, x + 41 - 18, 640, 36, 30, 2, c => shellArt(c, { k: w.k === 'cluster' ? 'cluster' : w.k, x: (x + 41) / CS, y: 655 / CS, vx: 1, vy: -.3, t: 0 }));
        tx(g, w.n.split(' ')[0], x + 41, 680, F(11.5), off ? OFF : on ? GOLDA : INK); tx(g, n + '', x + 74, 646, F(12), off ? OFF : DIM, 'right');
      });
      rr(g, 920, 634, 168, 66, 9, 'rgba(24,36,56,.96)', EDGE, 1.5); tx(g, `${Math.round(p.ang * 180 / Math.PI)}°  ·  ${Math.round(p.pow * 100)}%`, 1004, 656, F(16), INK); rr(g, 936, 676, 136, 9, 4.5, 'rgba(255,255,255,.1)'); rr(g, 936, 676, Math.max(9, 136 * p.pow), 9, 4.5, p.pow > .9 ? '#ff9a6a' : '#9fe2ff');
      btn.fire = { x: 1098, y: 634, w: 154, h: 66 }; const gr = g.createLinearGradient(0, 634, 0, 700); gr.addColorStop(0, '#f8dc98'); gr.addColorStop(1, '#e2b25a'); rr(g, 1098, 634, 154, 66, 10, gr, '#fff0c4', 1.5); tx(g, 'FIRE', 1175, 660, T(24), '#2a1a08'); tx(g, 'Space', 1175, 684, F(11, 700), '#5a3e12');
      tx(g, WEAP[WK[p.w]].d, 640, 606, F(13, 700), '#fff', 'center', 4);
    } else if (phase === 'aim' || phase === 'sync') {
      panel(g, 440, 640, 400, 56, 12); tx(g, phase === 'sync' ? 'Syncing the battlefield…' : `${p.name} ${p.name === 'You' ? 'are aiming' : 'is aiming'}${'.'.repeat(1 + Math.floor(t * 2) % 3)}  ·  ${WEAP[WK[p.w]].n}`, 640, 668, F(17), INK);
    } else if (phase === 'shot') {
      panel(g, 440, 640, 400, 56, 12); tx(g, `${P[cur].name}: ${WEAP[WK[P[cur].w]].n}`, net ? 640 : 590, 668, F(17), INK); if (!net) hbtn(g, 'skip', 760, 648, 70, 40, 'Skip', { px: 14 });
    }
    if (phase === 'pass') { g.fillStyle = 'rgba(8,14,26,.55)'; g.fillRect(K.view.x0, 200, K.view.x1 - K.view.x0, 260); tx(g, `${p.name}, your turn`, 640, 300, T(56), p.col, 'center', 8); tx(g, 'Pass the device, then tap or press Space when ready', 640, 360, F(18), '#fff', 'center', 4); }
    if (phase === 'over') { tx(g, winner >= 0 ? `${P[winner].name.toUpperCase()} ${P[winner].name === 'You' ? 'WIN' : 'WINS'}!` : 'DRAW', 640, 290, T(72), winner >= 0 ? P[winner].col : '#fff', 'center', 10); if (endT > 1.2 && !K.bot) tx(g, 'Tap to continue', 640, 360, F(20), '#fff', 'center', 5); }
  }
  function drawPlay(g, still) {
    backdrop(g, still);
    g.save(); g.translate(640, 360); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
    drawWorld(g); drawLiquid(g); drawParts(g); drawCannons(g); if (!still) drawGuide(g); drawShells(g); drawFx(g); g.restore();
    if (!still && !posed) hud(g);
  }
  /* ---------- menus ---------- */
  function title(g, s, y, sz = 64) { tx(g, s, 640, y, T(sz), '#fff7dc', 'center', 10); }
  function menuBack(g) { if (L !== LANDS[0]) L = LANDS[0]; cam.x = WIDE[0]; cam.y = WIDE[1]; cam.z = WIDE[2]; backdrop(g, true); const v = K.view; g.fillStyle = 'rgba(10,18,32,.5)'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
  function bigBtn(g, k, x, y, w, h, label, sub, hot) {
    btn[k] = { x, y, w, h }; if (hot) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#f8dc98'); gr.addColorStop(1, '#e2b25a'); rr(g, x, y, w, h, 14, gr, '#fff0c4', 1.5); } else rr(g, x, y, w, h, 14, PAN, EDGE, 1.5);
    tx(g, label, x + w / 2, y + h / 2 - (sub ? 10 : 0), T(26), hot ? '#2a1a08' : '#fff7dc'); if (sub) tx(g, sub, x + w / 2, y + h / 2 + 18, F(13, 700), hot ? '#5a3e12' : DIM);
  }
  function coinTag(g) { tx(g, `◉ ${coins.toLocaleString('en-US')}`, 1240, 40, F(26, 900), GOLD, 'right', 6); }
  function drawMenu(g) {
    menuBack(g); title(g, 'BRICKTIDE SALVAGE', 120, 76); tx(g, 'Your shot. Their turn.', 640, 178, F(20), '#ffe8b8', 'center', 4); coinTag(g);
    const stars = Object.values(camp).reduce((a, b) => a + b, 0);
    bigBtn(g, 'm:camp', 340, 230, 600, 86, 'Campaign', `12 battles against captains who get sharper · ${stars}/36 stars`, true);
    bigBtn(g, 'm:quick', 340, 330, 292, 80, 'Quick battle', 'Pick a landscape and a bot');
    bigBtn(g, 'm:local', 648, 330, 292, 80, 'Two players', 'Take turns on this device');
    bigBtn(g, 'm:online', 340, 424, 292, 80, 'Online duel', 'Make or join a room');
    bigBtn(g, 'm:arm', 648, 424, 292, 80, 'Armory', 'New shells and cannon colours');
    tx(g, `${wins} wins so far`, 640, 545, F(15, 700), '#cfe0f0', 'center', 3);
  }
  function drawCamp(g) {
    menuBack(g); title(g, 'CAMPAIGN', 70); coinTag(g); hbtn(g, 'back', 30, 24, 120, 44, '← Menu');
    CAMPAIGN.forEach((C, i) => {
      const x = 42 + (i % 6) * 202, y = 130 + Math.floor(i / 6) * 220, ok = lvOk(i), st = camp[i] || 0, Ld = LANDS[C.land]; btn['lvl' + i] = { x, y, w: 192, h: 200 };
      g.save(); g.beginPath(); g.roundRect(x, y, 192, 200, 14); g.clip(); const gr = g.createLinearGradient(0, y, 0, y + 120); gr.addColorStop(0, Ld.sky[0]); gr.addColorStop(1, Ld.sky[1]); g.fillStyle = gr; g.fillRect(x, y, 192, 120);
      g.fillStyle = Ld.near; g.beginPath(); g.moveTo(x, y + 120); for (let k = 0; k <= 192; k += 12) g.lineTo(x + k, y + 92 - 18 * Math.sin(k * .04 + i)); g.lineTo(x + 192, y + 120); g.fill();
      g.fillStyle = PAN; g.fillRect(x, y + 120, 192, 80); if (!ok) { g.fillStyle = 'rgba(8,12,20,.6)'; g.fillRect(x, y, 192, 200); } g.restore();
      rr(g, x, y, 192, 200, 14, null, ok ? GOLDA : EDGE, ok ? 2 : 1.5);
      tx(g, `${i + 1}`, x + 18, y + 22, T(24), '#fff7dc', 'left', 4); if (!ok) tx(g, '🔒', x + 96, y + 64, '30px sans-serif', '#fff');
      tx(g, BATTLE_N[i], x + 12, y + 138, F(15), ok ? INK : OFF, 'left'); tx(g, `${Ld.n} · vs ${FORTS[C.bot].n}`, x + 12, y + 158, F(11, 700), DIM, 'left');
      tx(g, '★'.repeat(st) + '☆'.repeat(3 - st), x + 12, y + 182, T(18), st ? GOLD : '#3a4a62', 'left'); tx(g, `◉ ${C.reward}`, x + 180, y + 182, F(13), GOLD, 'right');
    });
    tx(g, 'Stars are the lives you have left when you win.', 640, 600, F(15, 700), '#cfe0f0', 'center', 3);
  }
  function drawQuick(g) {
    menuBack(g); title(g, 'QUICK BATTLE', 70); coinTag(g); hbtn(g, 'back', 30, 24, 120, 44, '← Menu');
    LANDS.forEach((Ld, i) => {
      const x = 60 + i * 196, y = 120, on = qLand === i; btn['land' + i] = { x, y, w: 180, h: 150 };
      g.save(); g.beginPath(); g.roundRect(x, y, 180, 150, 12); g.clip(); const gr = g.createLinearGradient(0, y, 0, y + 150); gr.addColorStop(0, Ld.sky[0]); gr.addColorStop(1, Ld.sky[1]); g.fillStyle = gr; g.fillRect(x, y, 180, 150);
      g.fillStyle = Ld.mid; g.beginPath(); g.moveTo(x, y + 150); for (let k = 0; k <= 180; k += 12) g.lineTo(x + k, y + 92 - 22 * Math.sin(k * .05 + i * 2)); g.lineTo(x + 180, y + 150); g.fill();
      g.fillStyle = `rgb(${Ld.grass})`; g.fillRect(x, y + 118, 180, 6); g.fillStyle = `rgb(${Ld.dirt})`; g.fillRect(x, y + 124, 180, 26);
      if (Ld.liquid) { g.fillStyle = `rgb(${Ld.liquid.c})`; g.fillRect(x + 50, y + 122, 80, 28); } g.restore();
      rr(g, x, y, 180, 150, 12, null, on ? GOLDA : EDGE, on ? 3 : 1.5); tx(g, Ld.n, x + 90, y + 170, F(15), on ? GOLDA : INK);
    });
    tx(g, LANDS[qLand].hint, 640, 214 + 98, F(14, 700), '#cfe0f0', 'center', 3);
    tx(g, 'BOT', 70, 362, F(14), GOLDA, 'left'); DIFF.forEach((d, i) => hbtn(g, 'diff' + i, 180 + i * 150, 340, 140, 44, d.n, { hot: qDiff === i }));
    const fk = ['random', ...FORT_KEYS];
    tx(g, 'YOUR FORT', 70, 426, F(14), GOLDA, 'left'); fk.forEach((k, i) => hbtn(g, 'fl:' + k, 180 + i * 118, 404, 112, 44, k === 'random' ? 'Random' : FORTS[k].n.split(' ').pop(), { hot: qFortL === k, px: 13 }));
    tx(g, 'BOT FORT', 70, 490, F(14), GOLDA, 'left'); fk.forEach((k, i) => hbtn(g, 'fr:' + k, 180 + i * 118, 468, 112, 44, k === 'random' ? 'Random' : FORTS[k].n.split(' ').pop(), { hot: qFortR === k, px: 13 }));
    bigBtn(g, 'go', 440, 548, 400, 76, 'Battle!', `${LANDS[qLand].n} · ${DIFF[qDiff].n} bot`, true);
  }
  function drawArm(g) {
    menuBack(g); title(g, 'ARMORY', 66); coinTag(g); hbtn(g, 'back', 30, 24, 120, 44, '← Menu');
    WEAP.forEach((w, i) => {
      const x = 40 + (i % 5) * 242, y = 110 + Math.floor(i / 5) * 172, mine = owns(w.k); btn['buy:' + w.k] = { x, y, w: 230, h: 160 };
      rr(g, x, y, 230, 160, 12, PAN, mine ? '#5a7a5a' : coins >= w.cost ? GOLDA : EDGE, 1.5);
      pix(g, x + 14, y + 14, 50, 44, 2, c => shellArt(c, { k: w.k === 'cluster' ? 'cluster' : w.k, x: (x + 38) / CS, y: (y + 36) / CS, vx: 1, vy: -.3, t: 0 }));
      tx(g, w.n, x + 72, y + 30, F(17), INK, 'left'); tx(g, w.k === 'ball' ? 'Unlimited' : `${w.ammo} per battle`, x + 72, y + 52, F(12, 700), DIM, 'left');
      const words = w.d.split(' '); let line = '', ly = y + 84; g.font = F(12, 700); for (const wd of words) { if (g.measureText(line + wd).width > 204) { tx(g, line, x + 14, ly, F(12, 700), '#cfe0f0', 'left'); line = ''; ly += 17; } line += wd + ' '; } tx(g, line, x + 14, ly, F(12, 700), '#cfe0f0', 'left');
      tx(g, mine ? 'Owned' : `◉ ${w.cost}`, x + 216, y + 144, F(14), mine ? '#8fd08f' : coins >= w.cost ? GOLD : '#c87878', 'right');
    });
    tx(g, 'CANNON COLOUR', 40, 470, F(14), GOLDA, 'left');
    CANNON_COLS.forEach((c, i) => {
      const x = 40 + i * 150, y = 490, has = !c.cost || cols[i], on = colr === i; btn['col:' + i] = { x, y, w: 140, h: 96 };
      rr(g, x, y, 140, 96, 12, PAN, on ? GOLDA : EDGE, on ? 3 : 1.5); rr(g, x + 14, y + 14, 112, 34, 8, c.c); tx(g, c.n, x + 70, y + 64, F(14), INK); tx(g, on ? 'Equipped' : has ? 'Owned' : `◉ ${c.cost}`, x + 70, y + 84, F(12, 700), on ? GOLDA : has ? DIM : coins >= c.cost ? GOLD : '#c87878');
    });
    tx(g, 'Tap a shell to buy it. Everything you own comes to every battle.', 640, 620, F(14, 700), '#cfe0f0', 'center', 3);
  }
  function drawResult(g) {
    drawPlay(g, true); const v = K.view; g.fillStyle = 'rgba(8,12,22,.6)'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const r = res; rr(g, 340, 140, 600, 420, 22, 'rgba(15,24,40,.97)', r.won ? GOLDA : '#ff9a9a', 3);
    title(g, r.kind === 'local' ? `${r.name} WINS!` : r.won ? 'VICTORY!' : 'DEFEAT', 210, 54);
    if (r.kind === 'camp' && r.won) tx(g, '★'.repeat(r.st) + '☆'.repeat(3 - r.st), 640, 290, T(56), GOLD);
    tx(g, r.kind === 'camp' ? `Battle ${level + 1}: ${BATTLE_N[level]}` : r.kind === 'online' ? 'Online duel' : r.kind === 'local' ? 'Two players' : `Quick battle · ${DIFF[qDiff].n}`, 640, 350, F(18), '#cfe0f0');
    if (r.got) tx(g, `+ ◉ ${r.got}${r.first ? '' : r.kind === 'camp' && r.won ? '  (replay)' : ''}`, 640, 400, T(38), GOLD);
    bigBtn(g, 'again', 370, 460, 170, 70, 'Again', null, false); bigBtn(g, 'menu', 555, 460, 170, 70, 'Menu', null, false);
    if (r.kind === 'camp' && r.won && level + 1 < CAMPAIGN.length) bigBtn(g, 'next', 740, 460, 170, 70, 'Next →', null, true); else bigBtn(g, 'm:arm', 740, 460, 170, 70, 'Armory', null, true);
  }
  GAME.draw = g => {
    for (const k in btn) delete btn[k];
    if (mode === 'menu') drawMenu(g); else if (mode === 'camp') drawCamp(g); else if (mode === 'quick') drawQuick(g); else if (mode === 'arm') drawArm(g);
    else if (mode === 'result') drawResult(g); else if (mode === 'lobby') { menuBack(g); title(g, 'ONLINE DUEL', 70); hbtn(g, 'back', 30, 24, 120, 44, '← Menu'); }
    else drawPlay(g);
    msgs.forEach((m, i) => { g.globalAlpha = Math.min(1, (3.6 - m.t) * 2); g.font = F(16); const w = Math.max(300, g.measureText(m.s).width + 44); panel(g, 640 - w / 2, 132 + i * 44, w, 36, 9); tx(g, m.s, 640, 150 + i * 44, F(16), m.c); g.globalAlpha = 1; });
  };
  let posed = false;
  // cover art: a heavy shell bursting on the far fort, close up
  GAME.pose = () => {
    const a = WEAP.map(w => w.k); kind = 'demo';
    setup({ land: 0, forts: ['keep', 'castle'], seed: 11, first: 0, wind: 0, names: ['Blue crew', 'Red crew'], cols: ['#3d6fb6', '#c4404a'], bots: [true, true], remote: [false, false], acc: [0, 0], arms: [a, a] });
    msgs = []; const pl = planBot(0); launch(0, 'heavy', pl.a, pl.pw, true);
    for (let k = 0; k < 900 && !(blasts.length && blasts[0].t > .18); k++) { simStep(); stepFx(1 / 60); }
    const b0 = blasts[0] || { x: P[1].x, y: P[1].y }; cam.x = (b0.x - 14) * CS; cam.y = (b0.y - 4) * CS; cam.z = 1.7; posed = true;
  };
  GAME.test = {
    st: () => ({ mode, phase, cur, turnN, wind, winner, lives: P.map(p => p.lives), ys: P.map(p => p.y), xs: P.map(p => p.x), shells: shells.length, bodies: bodies.length, parts: parts.length, coins, kind, land: L.k }),
    quick: (land, diff, f) => { if (f) { qFortL = f[0]; qFortR = f[1]; } startQuick(land, diff, true); }, local: land => startQuick(land, 1, false), camp: n => startCampaign(n), press,
    fire: (k, a, pw) => { const p = P[cur]; p.w = k; p.ang = a; p.pow = pw; fireLocal(); }, plan: () => planBot(cur), setCoins: v => { coins = v; save(); },
    run: (max = 3000) => { let k = 0; for (; k < max && phase === 'shot'; k++) simStep(); return k; }, steps: n => { for (let k = 0; k < n; k++) simStep(); stepFx(n / 60); },
    view: (x, y, z) => { cam.x = x; cam.y = y; cam.z = z; }, forts: () => FORT_KEYS, lands: () => LANDS.map(l => l.k),
    setup: cfg => setup(cfg), encode: () => net ? encodeDiff() : null,
  };
})();
