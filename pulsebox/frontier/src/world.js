// The wilderness as pure functions of (x, z) in metres, so the main thread and the workers agree exactly.
// Rolling hills, mountain ranges (ridged noise), lakes (basins dipping below the water line y = 0) and rivers (the
// zero-lines of a slow noise field, carved down below the water line). The camp's ground is levelled.
import { makeNoise, smooth, lerp, clamp, hash2 } from './noise.js';

export const WATER_Y = 0;
const S = { h: 0, m: 0, lake: 0, river: 0, rv: 1 };

export class World {
  constructor(seed) { this.seed = seed >>> 0; this.n = makeNoise(this.seed); this.k = makeNoise((this.seed ^ 0x9e3779b9) >>> 0); this.camp = null; }

  setCamp(x, z) { this.camp = null; const h = this.sample(x, z).h; this.camp = { x, z, h: Math.max(h, 2.2) }; return this.camp; }

  // the ground before anything else is added; `o` gets the fields other systems use
  sample(x, z, o = S) {
    const n = this.n;
    const wx = x + 170 * n.fbm(x * .0006 + 3.1, z * .0006 - 7.7, 3), wz = z + 170 * n.fbm(x * .0006 - 11.3, z * .0006 + 5.9, 3);
    // mountain ranges: a slow mask, then ridged noise on top
    const m = smooth(-0.02, 0.3, n.fbm(wx * .00028 + 17.2, wz * .00028 - 4.4, 3));
    let h = 10 + 12 * n.fbm(wx * .0011, wz * .0011, 4) + 1.7 * n.fbm(x * .013, z * .013, 2) + 0.22 * n.n2(x * .17, z * .17);
    if (m > 0) { const r = n.ridged(wx * .0007 + 5.5, wz * .0007 + 1.3, 6); h += m * (24 + 290 * Math.pow(r, 1.75)) + m * 30 * n.fbm(wx * .003, wz * .003, 3); }
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
    f *= smooth(-0.66, -0.34, k.n2(x * .012 + 9, z * .012 - 3)); // meadows and clearings
    return f;
  }
  forest(x, z, s = this.sample(x, z)) {
    let f = this.forestRaw(x, z, s);
    if (this.camp) { const d = Math.hypot(x - this.camp.x, z - this.camp.z); f *= smooth(21, 34, d); }
    return f;
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
    g *= smooth(0.55, 1.4, s.h);
    g *= smooth(0.72, 0.86, ny);
    g *= 1 - smooth(150, 185, s.h);
    g *= 0.55 + 0.45 * smooth(-0.4, 0.3, this.k.n2(x * .05 + 3, z * .05 - 8));
    if (this.camp) { const d = Math.hypot(x - this.camp.x, z - this.camp.z); g *= smooth(6.5, 12, d); }
    return clamp(g, 0, 1);
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
