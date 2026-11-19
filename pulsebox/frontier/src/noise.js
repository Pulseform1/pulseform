// Seeded 2D simplex noise with fractal sums. Everything in the world (terrain, forests, rivers, where a deer grazes) is
// derived from these, so the same seed always grows the same wilderness.
const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];

export function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function hash2(x, z, s = 0) { let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

export function makeNoise(seed) {
  const rnd = mulberry(seed), p = new Uint8Array(512), perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  // one octave, roughly -1..1
  function n2(xin, yin) {
    const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s), t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t), i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2, ii = i & 255, jj = j & 255;
    let n = 0, t0 = .5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { const g = GRAD[p[ii + p[jj]] & 7]; t0 *= t0; n += t0 * t0 * (g[0] * x0 + g[1] * y0); }
    let t1 = .5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { const g = GRAD[p[ii + i1 + p[jj + j1]] & 7]; t1 *= t1; n += t1 * t1 * (g[0] * x1 + g[1] * y1); }
    let t2 = .5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { const g = GRAD[p[ii + 1 + p[jj + 1]] & 7]; t2 *= t2; n += t2 * t2 * (g[0] * x2 + g[1] * y2); }
    return 70 * n;
  }
  // fractal sum, normalised to about -1..1
  function fbm(x, y, oct = 5, lac = 2.03, gain = .5) { let a = 1, f = 1, s = 0, t = 0; for (let o = 0; o < oct; o++) { s += a * n2(x * f, y * f); t += a; a *= gain; f *= lac; } return s / t; }
  // sharp crests (mountain ridges), 0..1
  function ridged(x, y, oct = 5) { let a = 1, f = 1, s = 0, t = 0, w = 1; for (let o = 0; o < oct; o++) { let v = 1 - Math.abs(n2(x * f, y * f)); v *= v; v *= w; w = Math.min(1, v * 1.6); s += a * v; t += a; a *= .5; f *= 2.07; } return s / t; }
  return { n2, fbm, ridged };
}
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
