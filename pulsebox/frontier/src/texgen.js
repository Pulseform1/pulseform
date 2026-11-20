// Every texture in the game is painted here at load: tileable ground layers (with height in the normal map's alpha
// for height-blended transitions), bark, needle sprays, leaves, ferns, tent canvas, planks and a wool blanket.
import * as THREE from 'three';
import { mulberry } from './noise.js';

// ---------- tileable gradient noise ----------
function tiler(seed) {
  const R = mulberry(seed), gx = new Float32Array(256), gy = new Float32Array(256), P = new Uint8Array(512);
  for (let i = 0; i < 256; i++) { const a = R() * Math.PI * 2; gx[i] = Math.cos(a); gy[i] = Math.sin(a); P[i] = i; }
  for (let i = 255; i > 0; i--) { const j = (R() * (i + 1)) | 0; const t = P[i]; P[i] = P[j]; P[j] = t; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  function noise(x, y, per) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const x0 = ((xi % per) + per) % per, y0 = ((yi % per) + per) % per, x1 = (x0 + 1) % per, y1 = (y0 + 1) % per;
    const h = (a, b) => P[P[a & 255] + (b & 255)];
    const d = (k, dx, dy) => gx[k] * dx + gy[k] * dy;
    const u = fade(xf), v = fade(yf);
    const a = d(h(x0, y0), xf, yf), b = d(h(x1, y0), xf - 1, yf), c = d(h(x0, y1), xf, yf - 1), e = d(h(x1, y1), xf - 1, yf - 1);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v) * 1.41;
  }
  function fbm(u, v, per, oct = 4, gain = .5) { let s = 0, a = 1, t = 0, f = 1; for (let o = 0; o < oct; o++) { s += a * noise(u * per * f, v * per * f, per * f); t += a; a *= gain; f *= 2; } return s / t; }
  // cellular: distance to nearest and second-nearest feature point on a wrapping grid (u,v in 0..1)
  const cell = new Float32Array(64 * 64 * 2); for (let i = 0; i < cell.length; i++) cell[i] = R();
  function worley(u, v, nx, ny) {
    const x = u * nx, y = v * ny, xi = Math.floor(x), yi = Math.floor(y); let d1 = 9, d2 = 9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = ((xi + i) % nx + nx) % nx, cy = ((yi + j) % ny + ny) % ny, k = (cy * 64 + cx) * 2;
      const px = xi + i + cell[k], py = yi + j + cell[k + 1], dd = (px - x) * (px - x) + (py - y) * (py - y);
      if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd;
    }
    return [Math.sqrt(d1), Math.sqrt(d2)];
  }
  return { noise, fbm, worley, R };
}

const mix = (a, b, t) => a + (b - a) * t, clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function lerpC(a, b, t) { return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]; }
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// draws something at x,y and at its wrapped copies so the texture tiles
function wrapDraw(S, x, y, r, fn) { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) if (x + ox > -r && x + ox < S + r && y + oy > -r && y + oy < S + r) fn(x + ox, y + oy); }

function heightToNormal(hgt, W, H, strength, out, wrapX = true) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const xl = wrapX ? (x - 1 + W) % W : Math.max(0, x - 1), xr = wrapX ? (x + 1) % W : Math.min(W - 1, x + 1), yu = (y - 1 + H) % H, yd = (y + 1) % H;
    const dx = (hgt[y * W + xr] - hgt[y * W + xl]) * strength, dy = (hgt[yd * W + x] - hgt[yu * W + x]) * strength;
    const l = Math.hypot(dx, dy, 1), o = (y * W + x) * 4;
    out[o] = (-dx / l * .5 + .5) * 255; out[o + 1] = (-dy / l * .5 + .5) * 255; out[o + 2] = (1 / l * .5 + .5) * 255; out[o + 3] = hgt[y * W + x] * 255;
  }
  return out;
}
function lumHeight(px, W, H, blur = 1) {
  const n = W * H, h = new Float32Array(n);
  for (let i = 0; i < n; i++) h[i] = (px[i * 4] * .3 + px[i * 4 + 1] * .55 + px[i * 4 + 2] * .15) / 255;
  for (let b = 0; b < blur; b++) { const t = h.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) h[y * W + x] = (t[y * W + x] * 4 + t[y * W + (x + 1) % W] + t[y * W + (x - 1 + W) % W] + t[((y + 1) % H) * W + x] + t[((y - 1 + H) % H) * W + x]) / 8; }
  let lo = 1, hi = 0; for (let i = 0; i < n; i++) { lo = Math.min(lo, h[i]); hi = Math.max(hi, h[i]); }
  for (let i = 0; i < n; i++) h[i] = (h[i] - lo) / Math.max(1e-3, hi - lo);
  return h;
}
function texFrom(c, srgb = true, repeat = true) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}
function dataTex(px, W, H, srgb, repeat = true) {
  const t = new THREE.DataTexture(px, W, H, THREE.RGBAFormat); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}

// ---------- ground layers ----------
const GS = 512;
function paintGrass(T) {
  const c = canvas(GS), g = c.getContext('2d'), im = g.createImageData(GS, GS), d = im.data;
  const dark = hex('#33421b'), mid = hex('#4d5a24'), dry = hex('#7b7340'), soil = hex('#4a3b26');
  for (let y = 0; y < GS; y++) for (let x = 0; x < GS; x++) {
    const u = x / GS, v = y / GS, n1 = T.fbm(u, v, 4, 4), n2 = T.fbm(u + .37, v + .11, 8, 3), n3 = T.noise(u * 64, v * 64, 64);
    let col = lerpC(dark, mid, clamp01(.5 + n1 * 1.4)); col = lerpC(col, dry, clamp01(n2 * 1.6 - .1) * .7);
    col = lerpC(col, soil, sstep(.25, .6, -n2 - n3 * .3) * .55);
    const k = 0.85 + n3 * .15, o = (y * GS + x) * 4; d[o] = col[0] * k; d[o + 1] = col[1] * k; d[o + 2] = col[2] * k; d[o + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const R = T.R, cols = ['#56692a', '#6c7a32', '#3e5220', '#8a8546', '#a39a58', '#2f3e18', '#5f7430'].map(hex);
  g.lineCap = 'round';
  for (let i = 0; i < 16000; i++) {
    const x = R() * GS, y = R() * GS, a = R() * Math.PI * 2, l = 3 + R() * 9, cc = cols[(R() * cols.length) | 0], s = .75 + R() * .5;
    g.strokeStyle = rgba([cc[0] * s, cc[1] * s, cc[2] * s], .55 + R() * .4); g.lineWidth = .7 + R() * 1.1;
    wrapDraw(GS, x, y, l, (px, py) => { g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke(); });
  }
  return c;
}
function paintForest(T) {
  const c = canvas(GS), g = c.getContext('2d'), im = g.createImageData(GS, GS), d = im.data;
  const a0 = hex('#2a1f15'), a1 = hex('#443222'), moss = hex('#3f4b22');
  for (let y = 0; y < GS; y++) for (let x = 0; x < GS; x++) {
    const u = x / GS, v = y / GS, n1 = T.fbm(u, v, 6, 4), n2 = T.fbm(u + .5, v + .2, 3, 3);
    let col = lerpC(a0, a1, clamp01(.5 + n1 * 1.2)); col = lerpC(col, moss, sstep(.18, .4, n2) * .8);
    const o = (y * GS + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const R = T.R, cols = ['#7a5636', '#8c7452', '#54402a', '#6b5d4d', '#94704a', '#6a4a30', '#3a2c1e'].map(hex);
  g.lineCap = 'round';
  for (let i = 0; i < 2600; i++) { // fallen leaves and bark flakes under the needles
    const x = R() * GS, y = R() * GS, r = 2 + R() * 4, cc = R() < .5 ? hex('#7a5a2a') : hex('#5a4024'), a = R() * Math.PI;
    g.fillStyle = rgba(cc, .7); wrapDraw(GS, x, y, r, (px, py) => { g.beginPath(); g.ellipse(px, py, r, r * .55, a, 0, Math.PI * 2); g.fill(); });
  }
  for (let i = 0; i < 22000; i++) {
    const x = R() * GS, y = R() * GS, a = R() * Math.PI * 2, l = 5 + R() * 10, cc = cols[(R() * cols.length) | 0], s = .7 + R() * .55;
    g.strokeStyle = rgba([cc[0] * s, cc[1] * s, cc[2] * s], .75); g.lineWidth = .8 + R() * .7;
    wrapDraw(GS, x, y, l, (px, py) => { g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke(); });
  }
  for (let i = 0; i < 70; i++) { // twigs
    const x = R() * GS, y = R() * GS, a = R() * Math.PI * 2, l = 18 + R() * 50;
    g.strokeStyle = rgba(hex(R() < .5 ? '#3b2a1a' : '#5c4630'), .95); g.lineWidth = 1.6 + R() * 2.2;
    wrapDraw(GS, x, y, l, (px, py) => { g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + Math.cos(a + .3) * l * .5, py + Math.sin(a + .3) * l * .5, px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke(); });
  }
  for (let i = 0; i < 16; i++) { // cones
    const x = R() * GS, y = R() * GS, a = R() * Math.PI;
    wrapDraw(GS, x, y, 14, (px, py) => { g.save(); g.translate(px, py); g.rotate(a); g.fillStyle = '#4a2e18'; g.beginPath(); g.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#7a5530'; g.lineWidth = 1.2; for (let k = -6; k <= 6; k += 3) { g.beginPath(); g.moveTo(k, -4); g.lineTo(k + 2, 4); g.stroke(); } g.restore(); });
  }
  return c;
}
function paintDirt(T) {
  const c = canvas(GS), g = c.getContext('2d'), im = g.createImageData(GS, GS), d = im.data;
  const a0 = hex('#4e3a27'), a1 = hex('#6e5539'), a2 = hex('#3a2b1e');
  for (let y = 0; y < GS; y++) for (let x = 0; x < GS; x++) {
    const u = x / GS, v = y / GS, n1 = T.fbm(u, v, 5, 5), n2 = T.noise(u * 96, v * 96, 96);
    let col = lerpC(a0, a1, clamp01(.5 + n1 * 1.3)); col = lerpC(col, a2, clamp01(-n1 * 2 - .3));
    const k = .9 + n2 * .12, o = (y * GS + x) * 4; d[o] = col[0] * k; d[o + 1] = col[1] * k; d[o + 2] = col[2] * k; d[o + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const R = T.R;
  for (let i = 0; i < 900; i++) {
    const x = R() * GS, y = R() * GS, r = 1.2 + R() * R() * 7, sh = 82 + R() * 52, a = R() * Math.PI;   // (duller pebbles: bright ones sparkled as white dots further off)
    wrapDraw(GS, x, y, r + 2, (px, py) => {
      g.fillStyle = `rgba(20,14,8,.45)`; g.beginPath(); g.ellipse(px + 1, py + 1.3, r, r * .75, a, 0, Math.PI * 2); g.fill();
      g.fillStyle = `rgb(${sh},${sh * .92},${sh * .82})`; g.beginPath(); g.ellipse(px, py, r, r * .75, a, 0, Math.PI * 2); g.fill();
      g.fillStyle = `rgba(255,250,235,.07)`; g.beginPath(); g.ellipse(px - r * .25, py - r * .25, r * .45, r * .3, a, 0, Math.PI * 2); g.fill();
    });
  }
  return c;
}
function paintRock(T) {
  const W = GS, px = new Uint8ClampedArray(W * W * 4), hgt = new Float32Array(W * W);
  const a0 = hex('#6c6862'), a1 = hex('#8e8a82'), a2 = hex('#4a4744'), lichen = hex('#97a07a'), rust = hex('#a8834e');
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / W, n1 = T.fbm(u, v, 4, 5), n2 = T.fbm(u + .2, v * .6 + .7, 6, 4);
    const [f1, f2] = T.worley(u, v, 7, 7), crack = sstep(0, .07, f2 - f1), strata = .5 + .5 * Math.sin((v * 22 + n1 * 3) * Math.PI);
    let h = .55 + n1 * .5 + n2 * .2 + strata * .06; h *= .55 + .45 * crack;
    let col = lerpC(a0, a1, clamp01(.5 + n1 * 1.5 + strata * .15)); col = lerpC(a2, col, crack * .8 + .2);
    const ln = T.noise(u * 24 + 3, v * 24, 24), ls = T.noise(u * 48, v * 48 + 7, 48);
    col = lerpC(col, lichen, sstep(.25, .45, ln) * .55 * crack); col = lerpC(col, rust, sstep(.4, .6, ls) * .35);
    const k = .9 + T.noise(u * 128, v * 128, 128) * .1, o = (y * W + x) * 4;
    px[o] = col[0] * k; px[o + 1] = col[1] * k; px[o + 2] = col[2] * k; px[o + 3] = 255; hgt[y * W + x] = clamp01(h);
  }
  return { px, hgt };
}
function paintSand(T) {
  const W = GS, px = new Uint8ClampedArray(W * W * 4), hgt = new Float32Array(W * W);
  const a0 = hex('#8a7754'), a1 = hex('#a8936a'), a2 = hex('#5e5038');
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / W, n1 = T.fbm(u, v, 4, 4), n2 = T.noise(u * 160, v * 160, 160), rip = Math.sin((u * 18 + v * 5 + n1 * 2.2) * Math.PI * 2);
    let col = lerpC(a0, a1, clamp01(.5 + n1 * 1.3 + rip * .05)); col = lerpC(col, a2, sstep(.15, .45, -n1) * .6);
    const k = .88 + n2 * .14, o = (y * W + x) * 4; px[o] = col[0] * k; px[o + 1] = col[1] * k; px[o + 2] = col[2] * k; px[o + 3] = 255;
    hgt[y * W + x] = clamp01(.5 + rip * .15 + n2 * .1 + n1 * .2);
  }
  return { px, hgt };
}
function paintSnow(T) {
  const W = GS, px = new Uint8ClampedArray(W * W * 4), hgt = new Float32Array(W * W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / W, n1 = T.fbm(u, v, 3, 5), n2 = T.noise(u * 200, v * 200, 200), b = 228 + n1 * 30 + n2 * 6, o = (y * W + x) * 4;
    px[o] = b * .95; px[o + 1] = b * .97; px[o + 2] = Math.min(255, b * 1.03); px[o + 3] = 255; hgt[y * W + x] = clamp01(.5 + n1 * .8);
  }
  return { px, hgt };
}

export function groundTextures() {
  const T = tiler(7), layers = [];
  const fromCanvas = (c, str, blur) => { const px = c.getContext('2d').getImageData(0, 0, GS, GS).data; return { px, hgt: lumHeight(px, GS, GS, blur), str }; };
  layers.push(fromCanvas(paintGrass(T), 3, 1));
  layers.push(fromCanvas(paintForest(T), 4, 1));
  layers.push(fromCanvas(paintDirt(T), 5, 1));
  layers.push({ ...paintRock(T), str: 7 });
  layers.push({ ...paintSand(T), str: 3 });
  layers.push({ ...paintSnow(T), str: 2 });
  const n = layers.length, A = new Uint8Array(GS * GS * 4 * n), N = new Uint8Array(GS * GS * 4 * n), tmp = new Uint8ClampedArray(GS * GS * 4);
  layers.forEach((L, i) => { A.set(L.px, i * GS * GS * 4); heightToNormal(L.hgt, GS, GS, L.str, tmp); N.set(tmp, i * GS * GS * 4); });
  const mk = (data, srgb) => { const t = new THREE.DataArrayTexture(data, GS, GS, n); t.format = THREE.RGBAFormat; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 8; t.needsUpdate = true; return t; };
  // a plain rock texture too, for boulders and the fire ring
  const rock = layers[3], rockN = heightToNormal(rock.hgt, GS, GS, 6, new Uint8ClampedArray(GS * GS * 4));
  return { albedo: mk(A, true), normal: mk(N, false), rock: dataTex(new Uint8Array(rock.px), GS, GS, true), rockN: dataTex(new Uint8Array(rockN), GS, GS, false), T };
}

// low-frequency colour/brightness variation that breaks up tiling over hundreds of metres
export function macroTexture() {
  const T = tiler(19), W = 256, px = new Uint8Array(W * W * 4);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / W, o = (y * W + x) * 4;
    px[o] = (T.fbm(u, v, 4, 5) * .5 + .5) * 255; px[o + 1] = (T.fbm(u + .3, v + .6, 8, 4) * .5 + .5) * 255; px[o + 2] = (T.fbm(u + .7, v + .1, 16, 3) * .5 + .5) * 255; px[o + 3] = 255;
  }
  return dataTex(px, W, W, false);
}

// ---------- bark ----------
export function barkTexture(kind) {
  const T = tiler({ pine: 31, spruce: 37, aspen: 41, dead: 43 }[kind]), W = 256, H = 512, px = new Uint8ClampedArray(W * H * 4), hgt = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H, o = (y * W + x) * 4; let col, h;
    if (kind === 'pine') {
      const [f1, f2] = T.worley(u + T.fbm(u, v, 4, 2) * .04, v, 6, 3), edge = sstep(0.02, .2, f2 - f1), n = T.fbm(u, v, 8, 4), n2 = T.fbm(u + .3, v, 3, 3);
      col = lerpC(hex('#1c120c'), lerpC(hex('#5e3c28'), hex('#8c5a38'), clamp01(.5 + n * 1.5)), edge);
      col = lerpC(col, hex('#4a3a30'), sstep(.1, .5, n2) * .5 * edge);
      const flake = T.noise(u * 40, v * 60, 40); col = lerpC(col, hex('#a87850'), sstep(.35, .65, flake) * edge * .35);
      h = edge * (.7 + n * .3);
    } else if (kind === 'spruce') {
      const [f1, f2] = T.worley(u, v, 12, 16), edge = sstep(0, .1, f2 - f1), n = T.fbm(u, v, 6, 4);
      col = lerpC(hex('#2e241c'), lerpC(hex('#5a4a3a'), hex('#7a6a58'), clamp01(.5 + n * 1.4)), edge * .85 + .15);
      h = edge * .6 + n * .3 + .2;
    } else if (kind === 'aspen') {
      const n = T.fbm(u, v, 4, 4), lent = T.noise(u * 8, v * 64, 8), scar = T.worley(u, v * 1.0, 3, 5)[0];
      col = lerpC(hex('#b9bba6'), hex('#dcdccb'), clamp01(.5 + n * 1.3));
      col = lerpC(col, hex('#8a8c7a'), sstep(.35, .55, Math.abs(lent)) * .5);
      const eye = 1 - sstep(.05, .14, scar); col = lerpC(col, hex('#25231e'), eye * .9);
      col = lerpC(col, hex('#6e7a4e'), sstep(.3, .55, T.fbm(u + .4, v, 3, 3)) * .25);
      h = .6 + n * .2 - eye * .4 - sstep(.35, .55, Math.abs(lent)) * .1;
    } else {
      const n = T.fbm(u * 1, v, 6, 4), grain = Math.sin((u * 40 + T.fbm(u, v, 4, 3) * 4) * Math.PI);
      col = lerpC(hex('#6e665a'), hex('#a39b8c'), clamp01(.5 + n * 1.2 + grain * .1));
      const crack = sstep(.85, .97, Math.abs(grain)); col = lerpC(col, hex('#3a342c'), crack * .7);
      h = .6 + grain * .15 - crack * .4 + n * .2;
    }
    px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255; hgt[y * W + x] = clamp01(h);
  }
  const nm = heightToNormal(hgt, W, H, kind === 'pine' ? 9 : kind === 'aspen' ? 3 : 6, new Uint8ClampedArray(W * H * 4));
  return { map: dataTex(new Uint8Array(px), W, H, true), normalMap: dataTex(new Uint8Array(nm), W, H, false) };
}

// ---------- foliage cards (alpha) ----------
// spruce: a flat spray of short needles on side twigs; base of the spray at the bottom centre of the card
function sprayCanvas(R, opts) {
  const S = 256, c = canvas(S), g = c.getContext('2d'); g.lineCap = 'round';
  const { needle = 7, dense = 1, cols } = opts;
  const twig = (x0, y0, ang, len, w, depth) => {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    g.strokeStyle = '#3a2a1c'; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    const n = Math.floor(len / 2.2 * dense);
    for (let i = 0; i < n; i++) {
      const t = i / n, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t, sz = needle * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
      for (const side of [-1, 1]) {
        const a = ang + side * (0.9 + R() * .5), cc = cols[(R() * cols.length) | 0], k = .8 + R() * .4;
        g.strokeStyle = rgba([cc[0] * k, cc[1] * k, cc[2] * k], 1); g.lineWidth = 1.5 + R() * .6;
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * sz, py + Math.sin(a) * sz); g.stroke();
      }
    }
    if (depth > 0) for (let i = 0; i < 7; i++) { const t = .08 + i * .13 + R() * .05; twig(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, ang + (i & 1 ? 1 : -1) * (.6 + R() * .25), len * (.5 - t * .3), w * .6, depth - 1); }
  };
  twig(S / 2, S - 4, -Math.PI / 2 + (R() - .5) * .1, S * .92, 3, 2);
  return c;
}
// pine: tufts of long needles at twig ends
function tuftCanvas(R) {
  const S = 256, c = canvas(S), g = c.getContext('2d'); g.lineCap = 'round';
  const cols = ['#3d5a2a', '#4f6e32', '#2c4420', '#5f7d3a', '#344d24'].map(hex);
  g.strokeStyle = '#4a3222'; g.lineWidth = 5; g.beginPath(); g.moveTo(S / 2, S); g.lineTo(S / 2, S * .55); g.stroke();
  const tuft = (cx, cy, r, base) => {
    for (let i = 0; i < 130; i++) {
      const a = base + (R() - .5) * 2.6, l = r * (.55 + R() * .45), cc = cols[(R() * cols.length) | 0], k = .8 + R() * .45;
      g.strokeStyle = rgba([cc[0] * k, cc[1] * k, cc[2] * k], 1); g.lineWidth = 1.3 + R() * .7;
      g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + Math.cos(a) * l * .5, cy + Math.sin(a) * l * .5 - 4, cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.stroke();
    }
  };
  for (const [x, y, r, a] of [[S / 2, S * .55, S * .42, -Math.PI / 2], [S * .3, S * .7, S * .3, -Math.PI / 2 - .7], [S * .7, S * .68, S * .3, -Math.PI / 2 + .7]]) {
    g.strokeStyle = '#4a3222'; g.lineWidth = 3; g.beginPath(); g.moveTo(S / 2, S * .85); g.lineTo(x, y); g.stroke(); tuft(x, y, r, a);
  }
  return c;
}
function leafCanvas(R, opts) {
  const S = 256, c = canvas(S), g = c.getContext('2d'); const { cols, n = 46, size = 17, round = .78 } = opts;
  g.strokeStyle = '#4a3a26'; g.lineWidth = 2.2; g.lineCap = 'round';
  const pts = [];
  for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * S * .4; pts.push([S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r * .9]); }
  for (const [x, y] of pts) { g.beginPath(); g.moveTo(S / 2, S * .92); g.quadraticCurveTo(S / 2 + (x - S / 2) * .3, y + 30, x, y); g.stroke(); }
  pts.sort((a, b) => a[1] - b[1]);
  for (const [x, y] of pts) {
    const a = R() * Math.PI * 2, s = size * (.75 + R() * .5), cc = cols[(R() * cols.length) | 0], k = .78 + R() * .4;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = rgba([cc[0] * k, cc[1] * k, cc[2] * k]); g.beginPath(); g.moveTo(0, -s); g.bezierCurveTo(s * round, -s * .6, s * round, s * .6, 0, s * .8); g.bezierCurveTo(-s * round, s * .6, -s * round, -s * .6, 0, -s); g.fill();
    g.strokeStyle = rgba([cc[0] * k * 1.25, cc[1] * k * 1.2, cc[2] * k * 1.1], .7); g.lineWidth = 1; g.beginPath(); g.moveTo(0, -s * .9); g.lineTo(0, s * .7); g.stroke();
    g.restore();
  }
  return c;
}
function fernCanvas(R) {
  const S = 256, c = canvas(S), g = c.getContext('2d'); g.lineCap = 'round';
  const cols = ['#3f6a2a', '#4c7a30', '#5a8a38', '#36592a'].map(hex);
  g.strokeStyle = '#3d5a24'; g.lineWidth = 3; g.beginPath(); g.moveTo(S / 2, S); g.quadraticCurveTo(S / 2 + 6, S / 2, S / 2, 4); g.stroke();
  for (let i = 0; i < 26; i++) {
    const t = i / 26, y = S - t * (S - 10), len = S * .38 * Math.sin(Math.PI * (0.12 + t * .85)) * (1 - t * .25);
    for (const side of [-1, 1]) {
      const a = -Math.PI / 2 + side * (1.15 - t * .4);
      for (let k = 0; k < len; k += 4) {
        const px = S / 2 + Math.cos(a) * k, py = y + Math.sin(a) * k, w = 5.5 * (1 - k / len) + 1.5, cc = cols[(R() * cols.length) | 0];
        g.fillStyle = rgba(cc); g.beginPath(); g.ellipse(px, py, w, 2.6, a + side * 1.2, 0, Math.PI * 2); g.fill();
      }
    }
  }
  return c;
}
function flowerCanvas(R) {
  const S = 128, c = canvas(S), g = c.getContext('2d');
  g.strokeStyle = '#4a6a2a'; g.lineWidth = 2;
  const heads = [['#c9a227', '#e0c040'], ['#8a4aa0', '#a764c0'], ['#e8e4d8', '#ffffff'], ['#c0502a', '#d8703a']];
  for (let i = 0; i < 7; i++) {
    const x = 18 + R() * (S - 36), top = 12 + R() * 50, [a, b] = heads[(R() * heads.length) | 0];
    g.beginPath(); g.moveTo(x + (R() - .5) * 10, S); g.quadraticCurveTo(x, (S + top) / 2, x, top); g.stroke();
    for (let p = 0; p < 6; p++) { const an = p / 6 * Math.PI * 2; g.fillStyle = p & 1 ? a : b; g.beginPath(); g.ellipse(x + Math.cos(an) * 4.5, top + Math.sin(an) * 4.5, 4, 2.4, an, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#5a3a14'; g.beginPath(); g.arc(x, top, 2.4, 0, Math.PI * 2); g.fill();
  }
  return c;
}
function grassTuftCanvas(R) {
  const S = 128, c = canvas(S), g = c.getContext('2d'); g.lineCap = 'round';
  const cols = ['#6b7a34', '#8a8a44', '#55682a', '#a09a58', '#7a8a3a'].map(hex);
  for (let i = 0; i < 60; i++) {
    const x = S / 2 + (R() - .5) * 40, h = S * (.5 + R() * .45), bend = (R() - .5) * 50, cc = cols[(R() * cols.length) | 0];
    g.strokeStyle = rgba(cc); g.lineWidth = 1.5 + R() * 1.5; g.beginPath(); g.moveTo(x, S); g.quadraticCurveTo(x + bend * .3, S - h * .6, x + bend, S - h); g.stroke();
  }
  return c;
}

export function foliageTextures() {
  const R = mulberry(99);
  const spruceCols = ['#2a4226', '#33502c', '#223820', '#3d5a32', '#2e4a30'].map(hex);
  const out = {
    spruce: texFrom(sprayCanvas(R, { needle: 8, dense: 1.1, cols: spruceCols }), true, false),
    fir: texFrom(sprayCanvas(R, { needle: 10, dense: .9, cols: ['#2f4a24', '#3a5a2a', '#26401e', '#46663a'].map(hex) }), true, false),
    pine: texFrom(tuftCanvas(R), true, false),
    aspen: texFrom(leafCanvas(R, { cols: ['#5c8a34', '#6e9a3e', '#7fa848', '#4c7a2c', '#94b050', '#a8b048'].map(hex), n: 50, size: 15, round: .85 }), true, false),
    bush: texFrom(leafCanvas(R, { cols: ['#3e5e26', '#4a6a2a', '#56762e', '#36522a', '#5e7a30'].map(hex), n: 70, size: 11, round: .6 }), true, false),
    fern: texFrom(fernCanvas(R), true, false),
    flower: texFrom(flowerCanvas(R), true, false),
    tuft: texFrom(grassTuftCanvas(R), true, false),
  };
  for (const t of Object.values(out)) { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.premultiplyAlpha = false; }
  return out;
}

// ---------- camp materials ----------
export function canvasTexture() {
  const T = tiler(53), W = 512, px = new Uint8ClampedArray(W * W * 4), hgt = new Float32Array(W * W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / W, weave = (Math.sin(x * Math.PI * .9) * Math.sin(y * Math.PI * .9)) * .5 + .5, n = T.fbm(u, v, 4, 5), st = T.fbm(u + .3, v + .8, 3, 4);
    let col = lerpC(hex('#cdbf9e'), hex('#e2d8bf'), clamp01(.5 + n * 1.2)); col = lerpC(col, hex('#9a8a68'), sstep(.3, .6, st) * .2 * (1 - v * .6));
    const seam = sstep(.985, 1, Math.abs(Math.sin(u * Math.PI * 2))) ; col = lerpC(col, hex('#9c8e6c'), seam * .7);
    const k = .93 + weave * .08, o = (y * W + x) * 4; px[o] = col[0] * k; px[o + 1] = col[1] * k; px[o + 2] = col[2] * k; px[o + 3] = 255;
    hgt[y * W + x] = weave * .6 + n * .2 + seam * .3;
  }
  const nm = heightToNormal(hgt, W, W, 1.5, new Uint8ClampedArray(W * W * 4));
  return { map: dataTex(new Uint8Array(px), W, W, true), normalMap: dataTex(new Uint8Array(nm), W, W, false) };
}
export function woodTexture(seed = 61, base = '#7a5a3c', dark = '#3e2a1a') {
  const T = tiler(seed), W = 256, H = 512, px = new Uint8ClampedArray(W * H * 4), hgt = new Float32Array(W * H), b = hex(base), d = hex(dark);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H, warp = T.fbm(u, v, 3, 3) * .8, grain = Math.sin((u * 26 + warp * 3) * Math.PI * 2) * .5 + .5, n = T.fbm(u, v, 6, 4);
    const knot = 1 - sstep(.02, .09, T.worley(u, v, 2, 3)[0]);
    let col = lerpC(d, b, clamp01(.35 + grain * .35 + n * .9)); col = lerpC(col, d, knot * .8);
    const plank = sstep(.96, 1, Math.abs(Math.sin(u * Math.PI * 4))); col = lerpC(col, hex('#1e140c'), plank * .85);
    const o = (y * W + x) * 4; px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255; hgt[y * W + x] = clamp01(.6 + grain * .2 + n * .2 - plank * .6 - knot * .2);
  }
  const nm = heightToNormal(hgt, W, H, 3, new Uint8ClampedArray(W * H * 4));
  return { map: dataTex(new Uint8Array(px), W, H, true), normalMap: dataTex(new Uint8Array(nm), W, H, false) };
}
export function endGrainTexture() {
  const T = tiler(73), W = 256, px = new Uint8Array(W * W * 4);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const u = x / W - .5, v = y / W - .5, r = Math.hypot(u, v) * 2, a = Math.atan2(v, u), n = T.fbm(x / W, y / W, 4, 3);
    const rings = .5 + .5 * Math.sin((r * 26 + n * 2.5) * Math.PI), crack = sstep(.97, 1, Math.abs(Math.sin(a * 3 + n * 4))) * sstep(.2, .6, r);
    let col = lerpC(hex('#9c7448'), hex('#c49a64'), rings * .6 + .2 + n * .4); col = lerpC(col, hex('#5a3a22'), sstep(.25, 0, r) * .3);
    col = lerpC(col, hex('#2a1a10'), crack * .8); if (r > .9) col = lerpC(col, hex('#3a2a1e'), sstep(.9, .96, r));
    const o = (y * W + x) * 4; px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
  }
  return dataTex(px, W, W, true, false);
}
export function blanketTexture() {
  const T = tiler(71), W = 256, px = new Uint8ClampedArray(W * W * 4);
  const stripes = [[.06, '#a8242a'], [.1, '#e6dcc2'], [.13, '#2e6a3a'], [.17, '#e6dcc2'], [.2, '#d8a828'], [.24, '#e6dcc2'], [.27, '#2a3a6a']];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const v = y / W, u = x / W, fuzz = T.noise(u * 64, v * 64, 64) * .08 + T.noise(u * 128, v * 128, 128) * .05;
    let col = hex('#e2d6b8'); const vv = v < .5 ? v : 1 - v;
    for (const [e, c] of stripes) if (vv < e) { col = hex(c); break; }
    const k = .9 + fuzz, o = (y * W + x) * 4; px[o] = col[0] * k; px[o + 1] = col[1] * k; px[o + 2] = col[2] * k; px[o + 3] = 255;
  }
  return dataTex(new Uint8Array(px), W, W, true);
}
// soft round puff for smoke and steam
export function puffTexture() {
  const S = 128, c = canvas(S), g = c.getContext('2d'), R = mulberry(5);
  for (let i = 0; i < 26; i++) {
    const x = S / 2 + (R() - .5) * S * .35, y = S / 2 + (R() - .5) * S * .35, r = S * (.14 + R() * .2);
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = texFrom(c, true, false); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
export function glowTexture() {
  const S = 64, c = canvas(S), g = c.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S); const t = texFrom(c, true, false); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
export { tiler };
