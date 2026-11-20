// Pure generation: terrain chunk vertex data, what grows on a 64 m chunk, and the grass field around the player.
// Runs inside web workers (worker.js) or on the main thread as a fallback.
import { smooth, clamp, hash2 } from './noise.js';

const S = {}, S2 = {};
// a square of terrain: (res+1)^2 grid vertices plus a skirt hanging below every edge to hide LOD cracks
export function terrainChunk(world, x0, z0, size, res, skirt) {
  const n = res + 1, step = size / res, gn = n + 2;
  const H = new Float32Array(gn * gn);
  for (let j = 0; j < gn; j++) for (let i = 0; i < gn; i++) H[j * gn + i] = world.height(x0 + (i - 1) * step, z0 + (j - 1) * step);
  const nv = n * n + 4 * n, pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), sp = new Uint8Array(nv * 4), sp2 = new Uint8Array(nv * 4);
  const k = world.k;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const v = j * n + i, x = x0 + i * step, z = z0 + j * step, h = H[(j + 1) * gn + i + 1];
    const hx = H[(j + 1) * gn + i + 2] - H[(j + 1) * gn + i], hz = H[(j + 2) * gn + i + 1] - H[j * gn + i + 1], l = Math.hypot(hx, 2 * step, hz);
    const nx = -hx / l, ny = 2 * step / l, nz = -hz / l;
    pos[v * 3] = i * step; pos[v * 3 + 1] = h; pos[v * 3 + 2] = j * step; nrm[v * 3] = nx; nrm[v * 3 + 1] = ny; nrm[v * 3 + 2] = nz;
    world.sample(x, z, S); const f = world.forest(x, z, S);
    const nz1 = k.n2(x * .02 + 31, z * .02 - 17), nz2 = k.n2(x * .07, z * .07);
    let rock = smooth(0.8, 0.6, ny + nz2 * .03) + smooth(140, 240, h) * smooth(0.97, 0.86, ny) * .8 + S.m * smooth(0.95, 0.88, ny) * .35;
    rock = clamp(rock + smooth(0.55, 0.8, nz1) * .25 * smooth(0.97, 0.9, ny), 0, 1);
    const snow = smooth(178, 222, h + nz1 * 22) * smooth(0.62, 0.82, ny);
    const sand = clamp(smooth(1.9 + nz2 * .5, 0.5, h) + S.lake * smooth(3.5, 1.5, h) * .5, 0, 1);
    let dirt = smooth(0.62, 0.82, k.n2(x * .045 - 7, z * .045 + 3)) * .55 * (1 - f);
    if (world.camp) { const d = Math.hypot(x - world.camp.x, z - world.camp.z); dirt = Math.max(dirt, 1 - smooth(4.5, 10 + nz2 * 2, d)); }
    const free = Math.max(0, 1 - rock - snow - sand);
    const forest = Math.min(free, f * 1.05) * (1 - dirt * .6);
    sp[v * 4] = forest * 255; sp[v * 4 + 1] = rock * (1 - snow) * 255; sp[v * 4 + 2] = sand * (1 - rock) * 255; sp[v * 4 + 3] = snow * 255;
    sp2[v * 4] = Math.min(free - forest, dirt) * 255; sp2[v * 4 + 1] = (1 - 0.42 * f) * 255; sp2[v * 4 + 2] = smooth(1.6, -0.2, h) * 255; sp2[v * 4 + 3] = clamp(S.m, 0, 1) * 255;
  }
  // skirts: copies of the edge vertices pushed down
  let v = n * n;
  const edge = (i, j) => { const s = j * n + i; pos[v * 3] = pos[s * 3]; pos[v * 3 + 1] = pos[s * 3 + 1] - skirt; pos[v * 3 + 2] = pos[s * 3 + 2]; for (let c = 0; c < 3; c++) nrm[v * 3 + c] = nrm[s * 3 + c]; for (let c = 0; c < 4; c++) { sp[v * 4 + c] = sp[s * 4 + c]; sp2[v * 4 + c] = sp2[s * 4 + c]; } v++; };
  for (let i = 0; i < n; i++) edge(i, 0); for (let i = 0; i < n; i++) edge(i, n - 1); for (let j = 0; j < n; j++) edge(0, j); for (let j = 0; j < n; j++) edge(n - 1, j);
  let lo = Infinity, hi = -Infinity; for (let i = 0; i < n * n; i++) { lo = Math.min(lo, pos[i * 3 + 1]); hi = Math.max(hi, pos[i * 3 + 1]); }
  return { pos, nrm, sp, sp2, lo: lo - skirt, hi };
}

// Tree kinds: 0-2 pine, 3-5 spruce, 6-8 aspen, 9-10 dead snags, 11 young spruce.
// Prop kinds: 0 leafy bush, 1 juniper, 2 fern, 3 flowers, 4 small rock, 5 boulder, 6 fallen log, 7 stump, 8 tall grass.
export function flora(world, cx, cz, C) {
  const x0 = cx * C, z0 = cz * C, trees = [], props = [], seed = world.seed;
  const nrm = [0, 1, 0];
  const at = (x, z) => { world.sample(x, z, S); return S; };
  // trees on a jittered 4.5 m lattice
  const cell = 4.5, nc = Math.round(C / cell);
  for (let j = 0; j < nc; j++) for (let i = 0; i < nc; i++) {
    const gx = cx * nc + i, gz = cz * nc + j, r1 = hash2(gx, gz, seed + 1), r2 = hash2(gx, gz, seed + 2), r3 = hash2(gx, gz, seed + 3);
    const x = x0 + (i + .15 + r1 * .7) * C / nc, z = z0 + (j + .15 + r2 * .7) * C / nc, s = at(x, z);
    if (s.h < 1.0) continue;
    const f = world.forest(x, z, s);
    if (r3 > f * 0.66) { // the odd young spruce at forest edges
      if (f > 0.1 && f < 0.55 && hash2(gx, gz, seed + 9) < 0.07) { world.normal(x, z, nrm, 1); if (nrm[1] > .8) trees.push(x, s.h - .1, z, hash2(gx, gz, seed + 4) * 6.283, .28 + hash2(gx, gz, seed + 5) * .3, 11); }
      continue;
    }
    world.normal(x, z, nrm, 1); if (nrm[1] < 0.72) continue;
    const r4 = hash2(gx, gz, seed + 4), r5 = hash2(gx, gz, seed + 5), r6 = hash2(gx, gz, seed + 6), r7 = hash2(gx, gz, seed + 7);
    let kind;
    if (r6 < 0.035) kind = 9 + (r7 < .5 ? 0 : 1);
    else { const sp = world.species(x, z, s, r6); kind = sp * 3 + Math.min(2, (r7 * 3) | 0); }
    const sc = (0.78 + r5 * 0.42) * (0.85 + 0.25 * f) * (kind >= 6 && kind <= 8 ? 0.9 : 1);
    trees.push(x, s.h - 0.12 - (1 - nrm[1]) * 1.2, z, r4 * 6.283, sc, kind);
  }
  // undergrowth, rocks and deadfall on a finer lattice
  const pc = 2.0, np = Math.round(C / pc);
  for (let j = 0; j < np; j++) for (let i = 0; i < np; i++) {
    const gx = cx * np + i, gz = cz * np + j, r = hash2(gx, gz, seed + 11);
    if (r > 0.42) continue;
    const x = x0 + (i + hash2(gx, gz, seed + 12)) * pc, z = z0 + (j + hash2(gx, gz, seed + 13)) * pc, s = at(x, z);
    if (s.h < 0.4) continue;
    world.normal(x, z, nrm, .8);
    const f = world.forest(x, z, s), q = hash2(gx, gz, seed + 14), rot = hash2(gx, gz, seed + 15) * 6.283, sz = hash2(gx, gz, seed + 16);
    const camp = world.camp ? Math.hypot(x - world.camp.x, z - world.camp.z) : 1e9;
    if (camp < 13) continue;
    const rocky = smooth(0.9, 0.7, nrm[1]) + s.m * .3 + smooth(70, 180, s.h) * .6;   // the mountains: boulders and scree up high
    const edge = 4 * f * (1 - f);
    if (r < 0.02 + 0.06 * rocky) { // rocks
      if (nrm[1] < .5) continue;   // nothing lodges on a sheer face
      // on a slope a stone sits down into the hill, so its low side does not hang in the air
      const big = q < 0.12 + 0.2 * Math.min(1, rocky), sc = big ? 1.1 + sz * 2.4 : 0.22 + sz * .5;
      props.push(x, s.h - (big ? .45 : .06) - (1 - nrm[1]) * sc * 1.1, z, rot, sc, big ? 5 : 4); continue;
    }
    if (s.h < 1.3) { if (q < 0.25 && nrm[1] > .85) props.push(x, s.h, z, rot, .7 + sz * .6, 8); continue; }
    if (nrm[1] < 0.7) continue;
    if (f > 0.35 && r < 0.02 + 0.11 * f && q < 0.25) { props.push(x, s.h - .05, z, rot, .7 + sz * .5, q < 0.12 ? 6 : 7); continue; }
    if (f > 0.3 && q < 0.55 * f) { props.push(x, s.h - .05, z, rot, .55 + sz * .7, 2); continue; }
    if (q < 0.04 + 0.22 * edge) { props.push(x, s.h - .08, z, rot, .6 + sz * .8, q < 0.12 * edge ? 1 : 0); continue; }
    // (no wildflowers in the meadows: at a distance their petals read as glitter in the grass)
  }
  return { trees: new Float32Array(trees), props: new Float32Array(props) };
}

// grass field: per metre, the ground height (relative to h0), how dense the grass is, and how dry
export function grassField(world, x0, z0, n, step, h0) {
  const out = new Float32Array(n * n * 4), nrm = [0, 1, 0], k = world.k;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = x0 + i * step, z = z0 + j * step, s = world.sample(x, z, S2), o = (j * n + i) * 4;
    world.normal(x, z, nrm, step);
    const f = world.forest(x, z, s);
    out[o] = s.h - h0; out[o + 1] = world.grass(x, z, s, f, nrm[1]); out[o + 2] = clamp(.5 + k.n2(x * .015 + 5, z * .015 - 2) * .7 + (s.h > 60 ? .15 : 0), 0, 1); out[o + 3] = f;
  }
  return out;
}

// a square of the survey map: parchment, water ink, forest tint, hill shading and 20 m contours (RGBA, n x n)
export function mapTile(world, x0, z0, size, n) {
  const m = n + 1, step = size / n, H = new Float32Array(m * m), F = new Float32Array(m * m), out = new Uint8Array(n * n * 4);
  for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) { const x = x0 + i * step, z = z0 + j * step, s = world.sample(x, z, S2); H[j * m + i] = s.h; F[j * m + i] = s.h > 0 ? world.forestRaw(x, z, s) : 0; }
  const cl = 20;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const h = H[j * m + i], hx = H[j * m + i + 1] - h, hz = H[(j + 1) * m + i] - h, f = F[j * m + i], o = (j * n + i) * 4;
    let r, g, b;
    if (h < 0) { const d = Math.min(1, -h / 9); r = 118 - 40 * d; g = 150 - 35 * d; b = 156 - 22 * d; if (h > -.6) { r += 18; g += 14; b += 6; } }
    else {
      const t = Math.min(1, h / 230); r = 214 - 30 * t; g = 198 - 36 * t; b = 158 - 30 * t;
      r -= 62 * f; g -= 38 * f; b -= 58 * f;
      if (h > 190) { const k = Math.min(1, (h - 190) / 25); r += (242 - r) * k; g += (238 - g) * k; b += (226 - b) * k; }
      const shade = Math.max(-.35, Math.min(.3, -(hx + hz) / step * .55)); r *= 1 + shade; g *= 1 + shade; b *= 1 + shade * .9;
      if (Math.floor(h / cl) !== Math.floor((h + hx) / cl) || Math.floor(h / cl) !== Math.floor((h + hz) / cl)) { r *= .78; g *= .72; b *= .64; }
      if (h < 1.2) { r = r * .7 + 70 * .3; g = g * .7 + 90 * .3; b = b * .7 + 96 * .3; }
    }
    out[o] = Math.max(0, Math.min(255, r)); out[o + 1] = Math.max(0, Math.min(255, g)); out[o + 2] = Math.max(0, Math.min(255, b)); out[o + 3] = 255;
  }
  return out;
}
