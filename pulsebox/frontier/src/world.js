// The wilderness as pure functions of (x, z) in metres, so the main thread and the workers agree exactly.
// Rolling hills, mountain ranges (ridged noise), lakes (basins dipping below the water line y = 0) and rivers (the
// zero-lines of a slow noise field, carved down below the water line). The camp's ground is levelled.
import { makeNoise, smooth, lerp, clamp, hash2 } from './noise.js';

export const WATER_Y = 0;
const S = { h: 0, m: 0, lake: 0, river: 0, rv: 1 };

export class World {
  constructor(seed) { this.seed = seed >>> 0; this.n = makeNoise(this.seed); this.k = makeNoise((this.seed ^ 0x9e3779b9) >>> 0); this.camp = null; }

  // the camp, and the kind of country it was chosen for: that shapes the land for a few kilometres around it
  setCamp(x, z, region) { this._dens = null; this.camp = null; const h = this.sample(x, z).h; this.camp = { x, z, h: Math.max(h, 2.2), region: region || null }; return this.camp; }

  // the ground before anything else is added; `o` gets the fields other systems use
  sample(x, z, o = S) {
    const n = this.n;
    const wx = x + 170 * n.fbm(x * .0006 + 3.1, z * .0006 - 7.7, 3), wz = z + 170 * n.fbm(x * .0006 - 11.3, z * .0006 + 5.9, 3);
    // mountain ranges: a slow mask, then ridged noise on top
    let m = smooth(-0.02, 0.3, n.fbm(wx * .00028 + 17.2, wz * .00028 - 4.4, 3));
    // a mountain valley camp sits in a ring of giants: past the valley floor the ranges close in and rise far higher
    let ring = 0;
    if (this.camp && this.camp.region === 'valley') { const d = Math.hypot(x - this.camp.x, z - this.camp.z); ring = smooth(420, 1000, d) * (1 - smooth(3400, 4600, d)); m = Math.max(m, ring * (.8 + .2 * n.fbm(wx * .0011 + 3, wz * .0011 - 8, 2))); }
    let h = 10 + 12 * n.fbm(wx * .0011, wz * .0011, 4) + 1.7 * n.fbm(x * .013, z * .013, 2) + 0.22 * n.n2(x * .17, z * .17);
    if (m > 0) { const r = n.ridged(wx * .0007 + 5.5, wz * .0007 + 1.3, 6); h += m * (24 + 290 * Math.pow(r, 1.75)) + m * 30 * n.fbm(wx * .003, wz * .003, 3); if (ring > 0) h += ring * (90 + 430 * Math.pow(n.ridged(wx * .0009 - 2.1, wz * .0009 + 7.7, 5), 1.5)); }
    // lakes sink below the water line, mostly away from the mountains
    const L = n.fbm(wx * .00068 - 40.1, wz * .00068 + 12.7, 3);
    const lake = smooth(0.22, 0.38, L) * (1 - 0.9 * m);
    h = lerp(h, -7 - 4 * lake, lake);
    // rivers follow the zero-lines of their own field and only ever carve downwards
    const rv = Math.abs(n.fbm(wx * .00042 + 80.3, wz * .00042 - 33.9, 3));
    const bank = smooth(0.0042, 0.028 + 0.13 * m, rv);
    const bed = -2.3 + 3.4 * smooth(0, 0.0042, rv);
    h = Math.min(h, lerp(bed, h, bank));
    if (this.camp) {
      const dx = x - this.camp.x, dz = z - this.camp.z, d = Math.sqrt(dx * dx + dz * dz);
      if (d < 44) h = lerp(this.camp.h + 0.06 * n.n2(x * .4, z * .4) * smooth(7, 12, d), h, smooth(13, 42, d));
    }
    o.h = h; o.m = m; o.lake = lake; o.river = 1 - bank; o.rv = rv; return o;
  }
  height(x, z) { return this.sample(x, z).h; }
  normal(x, z, out = [0, 1, 0], e = .6) {
    const hx = this.height(x + e, z) - this.height(x - e, z), hz = this.height(x, z + e) - this.height(x, z - e);
    const l = Math.hypot(hx, 2 * e, hz); out[0] = -hx / l; out[1] = 2 * e / l; out[2] = -hz / l; return out;
  }

  // 0..1 how wooded a spot is (before the camp clearing)
  forestRaw(x, z, s) {
    const k = this.k;
    let f = k.fbm(x * .0021 + 200, z * .0021 - 90, 4) + 0.25 - 0.25 * s.m;
    f = smooth(-0.22, 0.18, f);
    f *= 1 - smooth(130, 200, s.h);              // treeline
    f *= smooth(0.9, 2.6, s.h);                  // nothing grows in the water or on the beach
    const reg = this.camp && this.camp.region, d = reg ? Math.hypot(x - this.camp.x, z - this.camp.z) : 1e9;
    if (reg === 'forest' && d < 4000) { const k2 = 1 - smooth(3000, 4000, d); f = Math.max(f, k2 * smooth(-0.5, -0.05, k.fbm(x * .0021 + 200, z * .0021 - 90, 4)) * smooth(0.9, 2.6, s.h) * (1 - smooth(130, 200, s.h))); f *= 1 - k2 * .7 * (1 - smooth(-0.8, -0.55, k.n2(x * .012 + 9, z * .012 - 3))); }   // deep forest: thick timber, few clearings
    else f *= smooth(-0.66, -0.34, k.n2(x * .012 + 9, z * .012 - 3)); // meadows and clearings
    if (reg === 'valley' && d < 3200 && s.h < this.camp.h + 70) f *= .22 + .78 * smooth(1700, 3200, d) + .5 * smooth(.25, .6, k.n2(x * .006 - 4, z * .006 + 9));   // the valley floor lies open, with stands of timber
    return f;
  }
  forest(x, z, s = this.sample(x, z)) {
    let f = this.forestRaw(x, z, s);
    if (this.camp) { const d = Math.hypot(x - this.camp.x, z - this.camp.z); f *= smooth(21, 34, d); }
    return f * this.denClear(x, z);
  }
  // Bear dens: one at most in each 520 m square, set into a wooded hillside deep in thick timber, well away from camp.
  // Known to the world itself (here and in the workers alike), so no tree grows out of the rock or across the mouth.
  // The cave faces downhill; its rock dome sits back into the slope, the mouth at the foot of it.
  denSite(i, j) {
    const C = this._dens || (this._dens = new Map()), nk = (i + 32768) * 65536 + (j + 32768); if (C.has(nk)) return C.get(nk);
    const hs = k => { let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
    const CELL = 520, R = 9, key = i + ',' + j; let site = null;
    const far0 = x => !this.camp || Math.hypot(x[0] - this.camp.x, x[1] - this.camp.z) > 450;
    // a few tries in the square for a wooded hillside
    for (let t = 0; t < 5 && !site && hs(3) < .8; t++) {
      const px = (i + .15 + hs(10 + t) * .7) * CELL, pz = (j + .15 + hs(20 + t) * .7) * CELL; if (!far0([px, pz])) continue;
      const s = this.sample(px, pz, {}); if (s.h < 4 || this.forestRaw(px, pz, s) < .6) continue;
      const n = this.normal(px, pz, [0, 1, 0], 5); if (n[1] > .93 || n[1] < .7) continue;   // a hillside, not the flat and not a cliff
      let around = 0; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, qx = px + Math.cos(a) * 55, qz = pz + Math.sin(a) * 55; around += this.forestRaw(qx, qz, this.sample(qx, qz, {})); } around /= 6;
      if (around < .5) continue;
      const L = Math.hypot(n[0], n[2]), fx = n[0] / L, fz = n[2] / L, yaw = Math.atan2(fx, fz);   // facing downhill
      const x = px - fx * 3, z = pz - fz * 3, hf = this.height(x + fx * R * .8, z + fz * R * .8);   // the dome sits back into the hill
      site = { key, id: Math.abs(i * 7919 + j * 104729), x, z, yaw, fx, fz, h: hf - .4, R: 70, door: { x: x + fx * (R + 4), z: z + fz * (R + 4) } };
    }
    C.set(nk, site); return site;
  }
  // 0..1: no trees in the rock or in front of the mouth; the timber stands thick right up to it everywhere else
  denClear(x, z) {
    const i = Math.floor(x / 520), j = Math.floor(z / 520); let k = 1;
    for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) {
      const s = this.denSite(a, b); if (!s) continue;
      const d = Math.hypot(x - s.x, z - s.z); if (d > 20) continue;
      k = Math.min(k, smooth(8, 12.5, d), smooth(3, 6.5, Math.hypot(x - s.door.x, z - s.door.z)));
    }
    return k;
  }
  // which tree grows here: 0 pine, 1 spruce, 2 aspen
  species(x, z, s, r) {
    const k = this.k, a = k.fbm(x * .004 - 51, z * .004 + 77, 2);
    if (a > 0.22 && s.h < 120 && r < 0.85) return 2;
    const sp = 0.35 + 0.5 * s.m + (s.h > 80 ? 0.2 : 0) + 0.25 * k.n2(x * .006, z * .006);
    return r < sp ? 1 : 0;
  }
  // grass blades per square metre, scaled 0..1
  grass(x, z, s, f, ny) {
    let g = 1 - 0.8 * f;
    // deep in the timber the floor is not bare: patches of grass come up between the trunks
    if (f > .7) g = Math.max(g, .55 * smooth(.7, .95, f) * smooth(.1, .45, this.k.n2(x * .09 - 7, z * .09 + 4)));
    g *= smooth(0.55, 1.4, s.h);
    g *= smooth(0.72, 0.86, ny);
    g *= 1 - smooth(150, 185, s.h);
    g *= 0.55 + 0.45 * smooth(-0.4, 0.3, this.k.n2(x * .05 + 3, z * .05 - 8));
    if (this.camp) {
      const d = Math.hypot(x - this.camp.x, z - this.camp.z); g *= smooth(6.5, 12, d);
      // the valley's tall grass: patches of it, waist to chest high, where a crouching hunter (or a cat) can hide
      if (this.camp.region === 'valley' && d < 3000 && f < .35) { const tall = smooth(.05, .35, this.k.n2(x * .021 + 41, z * .021 - 17)) * smooth(18, 30, d); g = g * (1 + 1.1 * tall) + .35 * tall * smooth(0.72, 0.86, ny) * smooth(0.55, 1.4, s.h); }
      // spots of super-tall grass on open ground everywhere: shoulder high to over your head, thick enough to vanish into.
      // Values above 2.15 tell the grass shader to grow the blades tall (see grass.js)
      if (d > 26 && f < .3 && g > .35) { const sup = smooth(.42, .62, this.k.n2(x * .034 + 71, z * .034 + 13)) * smooth(0.8, 0.9, ny) * (1 - smooth(120, 150, s.h)); if (sup > 0) g = Math.max(g, 2.15 + .85 * sup); }
    }
    return clamp(g, 0, 3);
  }

  // places for the camp, by the kind chosen on the menu
  findSpawn(kind) {
    const step = 64;
    for (let r = 300; r < 16000; r += step) {
      const steps = Math.max(6, Math.floor(2 * Math.PI * r / step));
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2 + r * 0.137, x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (this.spawnOK(kind, x, z)) return { x, z };
      }
    }
    return { x: 0, z: 0 };
  }
  spawnOK(kind, x, z) {
    const s = this.sample(x, z), h = s.h;
    if (h < 2.6 || s.river > 0.01) return false;
    let lo = h, hi = h;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, y = this.height(x + Math.cos(a) * 14, z + Math.sin(a) * 14); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    if (hi - lo > 2.6) return false;
    if (kind === 'forest') {
      if (s.m > 0.25 || h > 70 || s.lake > 0.01) return false;
      let f = 0; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, rr = 45 + (i & 1) * 50, px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr, ps = this.sample(px, pz, { ...S }); if (ps.h < 2) return false; f += this.forestRaw(px, pz, ps); }
      return f / 12 > 0.8;
    }
    if (kind === 'valley') {
      if (s.m < 0.55 || h > 95) return false;
      let peak = 0, water = false;
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8;
        for (const rr of [70, 140, 400, 750]) { const y = this.height(x + Math.cos(a) * rr, z + Math.sin(a) * rr); peak = Math.max(peak, y - h); if (rr <= 140 && y < -0.3) water = true; }
      }
      return water && peak > 110;
    }
    // lake: a level spot a short walk from open water
    if (h > 7 || s.m > 0.3) return false;
    let wet = 0, near = 0;
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8;
      if (this.height(x + Math.cos(a) * 26, z + Math.sin(a) * 26) < 0) near++;
      if (this.height(x + Math.cos(a) * 110, z + Math.sin(a) * 110) < -1.5) wet++;
    }
    return near === 0 && wet >= 4 && this.sample(x, z).lake > 0.05;
  }
}

// deterministic per-object randoms
export const rnd = (x, z, s) => hash2(Math.floor(x * 7.31), Math.floor(z * 7.31), s);
export { smooth, lerp, clamp };
