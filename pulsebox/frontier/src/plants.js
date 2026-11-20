// Procedural plant and rock models. Trees are a curved, root-flared trunk with bark, branch whorls, and needle or leaf
// cards whose normals point out from the crown so they shade like a volume. Each tree has a near model, a lighter
// mid-distance model, and an impostor painted into an atlas for the far forest.
import * as THREE from 'three';
import { mulberry } from './noise.js';
import { windify, windDepth, patch } from './fx.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

class GB {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.i = []; }
  get vc() { return this.p.length / 3; }
  v(x, y, z, nx, ny, nz, u, v, ao) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.uv.push(u, v); this.c.push(ao, ao, ao); return this.vc - 1; }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i); g.computeBoundingSphere(); g.computeBoundingBox(); return g;
  }
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// a tube along points [{p: Vector3, r}], uRep times around, v in metres / vLen
function tube(gb, pts, radial, uRep, vLen, ao0 = .55, ao1 = 1) {
  const base = gb.vc, up = V(0, 1, 0), t = V(), nA = V(), nB = V(); let len = 0;
  for (let k = 0; k < pts.length; k++) {
    const a = pts[Math.max(0, k - 1)].p, b = pts[Math.min(pts.length - 1, k + 1)].p; t.subVectors(b, a).normalize();
    if (k > 0) len += pts[k].p.distanceTo(pts[k - 1].p);
    nA.crossVectors(Math.abs(t.y) > .95 ? V(1, 0, 0) : up, t).normalize(); nB.crossVectors(t, nA).normalize();
    const ao = ao0 + (ao1 - ao0) * (k / (pts.length - 1));
    for (let s = 0; s <= radial; s++) {
      const an = s / radial * Math.PI * 2, cx = Math.cos(an), sx = Math.sin(an);
      const nx = nA.x * cx + nB.x * sx, ny = nA.y * cx + nB.y * sx, nz = nA.z * cx + nB.z * sx, r = pts[k].r, p = pts[k].p;
      gb.v(p.x + nx * r, p.y + ny * r, p.z + nz * r, nx, ny, nz, s / radial * uRep, len / vLen, ao);
    }
  }
  const row = radial + 1;
  for (let k = 0; k < pts.length - 1; k++) for (let s = 0; s < radial; s++) { const a = base + k * row + s, b = a + 1, c = a + row, d = c + 1; gb.i.push(a, b, c, b, d, c); }
}
// a foliage card: base at p, growing along `a` (unit) for L, width W across `s` (unit); normals bent outward from the crown axis
function card(gb, p, a, s, L, W, crownC, ao, bendUp = 0.3, uv = [0, 0, 1, 1]) {
  const fn = V().crossVectors(s, a).normalize();
  if (fn.y < 0) fn.negate();
  const base = gb.vc;
  const corners = [[-.5, 0, uv[0], uv[1]], [.5, 0, uv[2], uv[1]], [.5, 1, uv[2], uv[3]], [-.5, 1, uv[0], uv[3]]];
  for (const [cs, ca, u, v] of corners) {
    const q = V().copy(p).addScaledVector(s, cs * W).addScaledVector(a, ca * L);
    const out = V(q.x - crownC.x, (q.y - crownC.y) * 0.6 + bendUp, q.z - crownC.z).normalize();
    const n = out.multiplyScalar(0.75).addScaledVector(fn, 0.25).normalize();
    gb.v(q.x, q.y, q.z, n.x, n.y, n.z, u, v, ao * (ca > .5 ? 1 : .82));
  }
  gb.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
}
const rotAround = (v, axis, ang) => v.clone().applyAxisAngle(axis, ang);

function spinePts(R, H, r0, rings, flare = .5, wob = .6) {
  const ph = R() * 6.28, ph2 = R() * 6.28, lean = V((R() - .5) * .025, 0, (R() - .5) * .025), pts = [];
  for (let k = 0; k <= rings; k++) {
    const t = k / rings, y = t * H;
    const x = lean.x * y + Math.sin(t * 3.1 + ph) * .1 * wob * t, z = lean.z * y + Math.sin(t * 2.7 + ph2) * .1 * wob * t;
    let r = r0 * Math.pow(1 - t, .82) + .012; if (t < .08) r *= 1 + (.08 - t) / .08 * flare;
    pts.push({ p: V(x, y, z), r });
  }
  return pts;
}
const spineAt = (pts, y) => { for (let k = 1; k < pts.length; k++) if (pts[k].p.y >= y) { const a = pts[k - 1], b = pts[k], t = (y - a.p.y) / (b.p.y - a.p.y); return { p: a.p.clone().lerp(b.p, t), r: a.r + (b.r - a.r) * t }; } return pts[pts.length - 1]; };

// ---- species ----
function spruce(seed, lod) {
  const R = mulberry(seed), H = 19 + R() * 5, trunk = new GB(), fol = new GB(), r0 = H * .016 + .07;
  const pts = spinePts(R, H, r0, lod ? 6 : 12, .55, .4); tube(trunk, pts, lod ? 5 : 9, 2, 1.3, .5, .9);
  let y = H * (.05 + R() * .05); const step = lod ? 1.25 : .62, crownC = V(0, H * .42, 0);
  while (y < H * .96) {
    const t = y / H, sp = spineAt(pts, y), cr = (H - y) * (.27 + R() * .05) + .35, nb = lod ? 4 : 5 + ((R() * 2) | 0), rot = R() * 6.28;
    for (let b = 0; b < nb; b++) {
      const az = rot + b / nb * 6.28 + (R() - .5) * .5, len = cr * (.75 + R() * .35), droop = -.32 + t * .55 + (R() - .5) * .2;
      const dir = V(Math.cos(az) * Math.cos(droop), Math.sin(droop), Math.sin(az) * Math.cos(droop));
      const tip = sp.p.clone().addScaledVector(dir, len); tip.y -= len * len * .02 * (1 - t);
      if (!lod && t < .85) tube(trunk, [{ p: sp.p.clone(), r: .045 }, { p: sp.p.clone().lerp(tip, .5).add(V(0, -.05 * len, 0)), r: .025 }, { p: tip, r: .01 }], 4, 1, .6, .35, .6);
      const side = V(-dir.z, 0, dir.x).normalize(), nc = lod ? 1 + (len > 2.2 ? 1 : 0) : Math.max(1, Math.min(6, Math.round(len / .62)));
      for (let c = 0; c < nc; c++) {
        const s0 = nc === 1 ? .25 : .1 + .7 * c / (nc - 1), pos = sp.p.clone().lerp(tip, s0); pos.y -= len * s0 * s0 * .1 * (1 - t);
        const L = (lod ? 2.1 : 1.3) * (.8 + len * .2) * (c === nc - 1 ? 1 : .9), W = L * .85;
        const a = V(dir.x, dir.y * .5 - .08, dir.z).normalize(), tilt = (c & 1 ? .45 : -.35) + (R() - .5) * .4;
        const ao = .3 + .7 * Math.min(1, (s0 + .2)) * (.55 + .45 * t);
        card(fol, pos, a, rotAround(side, a, tilt), L, W, crownC, ao);
        if (!lod && (c === nc - 1 || t < .6)) card(fol, pos, a, rotAround(side, a, 1.35), L * .85, W * .75, crownC, ao * .95);
      }
    }
    y += step * (.8 + R() * .4) * (1 - t * .25);
  }
  for (let k = 0; k < (lod ? 2 : 4); k++) { const a = V((R() - .5) * .5, 1, (R() - .5) * .5).normalize(), s = V(1, 0, 0).applyAxisAngle(V(0, 1, 0), k * 1.2); card(fol, V(0, H * .9, 0), a, s, H * .12, H * .07, crownC, 1, .8); }
  // dark inner fill so you cannot see straight through the crown
  for (let y2 = H * .1; y2 < H * .85; y2 += lod ? 2.4 : 1.25) {
    const cr = (H - y2) * .24 + .3, sp = spineAt(pts, y2), n = lod ? 2 : 3;
    for (let k = 0; k < n; k++) { const an = k / n * Math.PI + R() * .5, s = V(Math.cos(an), 0, Math.sin(an)); card(fol, sp.p.clone().add(V(0, -.2, 0)), V(0, 1, 0), s, (lod ? 2.6 : 1.7), cr * 1.6, crownC, .3 + .25 * (y2 / H), .1); }
  }
  return { trunk: trunk.build(), fol: fol.build(), H, r0, bark: 'spruce', leaf: 'spruce' };
}
function pine(seed, lod) {
  const R = mulberry(seed), H = 22 + R() * 6, trunk = new GB(), fol = new GB(), r0 = H * .017 + .1;
  const pts = spinePts(R, H, r0, lod ? 6 : 12, .45, .9); tube(trunk, pts, lod ? 6 : 10, 2, 1.6, .55, .95);
  const c0 = H * (.48 + R() * .1), crownC = V(0, H * .78, 0);
  if (!lod) for (let k = 0; k < 7; k++) { // dead stubs below the crown
    const y = H * (.18 + R() * .3), sp = spineAt(pts, y), az = R() * 6.28, d = V(Math.cos(az), -.1, Math.sin(az)), l = .3 + R() * .6;
    tube(trunk, [{ p: sp.p.clone(), r: .04 }, { p: sp.p.clone().addScaledVector(d, l), r: .012 }], 4, 1, .5, .5, .6);
  }
  let y = c0;
  while (y < H * .97) {
    const t = (y - c0) / (H - c0), sp = spineAt(pts, y), nb = 2 + ((R() * 3) | 0), rot = R() * 6.28;
    for (let b = 0; b < nb; b++) {
      const az = rot + b / nb * 6.28 + (R() - .5) * .9, len = (H - y) * .26 + 1.3 + R() * 1.4, up = .12 + R() * .35;
      const dir = V(Math.cos(az) * Math.cos(up), Math.sin(up), Math.sin(az) * Math.cos(up));
      const mid = sp.p.clone().addScaledVector(dir, len * .55); mid.y -= .25 * len * .3; const tip = sp.p.clone().addScaledVector(dir, len); tip.y += .25;
      tube(trunk, [{ p: sp.p.clone(), r: .09 * (1 - t * .5) }, { p: mid, r: .05 }, { p: tip, r: .018 }], lod ? 3 : 5, 1, .8, .45, .7);
      const tufts = lod ? 2 : 3 + ((R() * 2) | 0);
      for (let k = 0; k < tufts; k++) {
        const s0 = k === tufts - 1 ? 1 : .45 + .5 * k / tufts, pos = s0 < .55 ? sp.p.clone().lerp(mid, s0 / .55) : mid.clone().lerp(tip, (s0 - .55) / .45);
        const a = V(dir.x * .6 + (R() - .5) * .4, .75 + R() * .3, dir.z * .6 + (R() - .5) * .4).normalize(), L = (lod ? 2.6 : 1.7) * (.85 + R() * .3);
        const s = V(-a.z, 0, a.x).normalize().applyAxisAngle(a, R() * 3);
        card(fol, pos, a, s, L, L, crownC, .45 + .55 * (s0 * .6 + .4) * (.7 + .3 * t), .4);
        if (!lod || k === tufts - 1) card(fol, pos, a, rotAround(s, a, Math.PI / 2), L, L, crownC, .5 + .5 * s0, .4);
      }
    }
    y += (lod ? 2.0 : 1.05) * (.8 + R() * .5);
  }
  for (let k = 0; k < 3; k++) { const a = V((R() - .5) * .4, 1, (R() - .5) * .4).normalize(), s = V(1, 0, 0).applyAxisAngle(V(0, 1, 0), k * 1.05); card(fol, V(0, H * .95, 0), a, s, 2.4, 2.2, crownC, 1, .8); }
  return { trunk: trunk.build(), fol: fol.build(), H, r0, bark: 'pine', leaf: 'pine' };
}
function aspen(seed, lod) {
  const R = mulberry(seed), H = 13 + R() * 5, trunk = new GB(), fol = new GB(), r0 = H * .012 + .05;
  const pts = spinePts(R, H, r0, lod ? 5 : 10, .3, 1.4); tube(trunk, pts, lod ? 5 : 8, 1, 1.1, .6, .95);
  const c0 = H * (.4 + R() * .1), crownC = V(0, H * .72, 0), crR = H * .17;
  let y = c0;
  while (y < H * .95) {
    const t = (y - c0) / (H - c0), sp = spineAt(pts, y), nb = 2 + ((R() * 2) | 0), rot = R() * 6.28;
    for (let b = 0; b < nb; b++) {
      const az = rot + b / nb * 6.28 + (R() - .5), up = .6 + R() * .45, len = crR * (.6 + Math.sin(Math.PI * (.15 + t * .8)) * .9) * (.8 + R() * .4);
      const dir = V(Math.cos(az) * Math.cos(up), Math.sin(up), Math.sin(az) * Math.cos(up)), tip = sp.p.clone().addScaledVector(dir, len);
      tube(trunk, [{ p: sp.p.clone(), r: .05 }, { p: sp.p.clone().lerp(tip, .5).add(V(0, .1, 0)), r: .03 }, { p: tip, r: .01 }], lod ? 3 : 4, 1, .6, .6, .8);
      const nc = lod ? 2 : 4 + ((R() * 3) | 0);
      for (let c = 0; c < nc; c++) {
        const s0 = .3 + .7 * (c + R() * .5) / nc, pos = sp.p.clone().lerp(tip, s0).add(V((R() - .5) * .6, (R() - .5) * .5, (R() - .5) * .6));
        const L = (lod ? 2.3 : 1.35) * (.8 + R() * .4), a = V((R() - .5), 1.2, (R() - .5)).normalize(), s = V(Math.cos(R() * 6.28), 0, Math.sin(R() * 6.28));
        const base = pos.clone().addScaledVector(a, -L * .5);
        card(fol, base, a, s, L, L, crownC, .45 + .55 * s0, .5);
        if (!lod) card(fol, base, a, rotAround(s, a, 1.57), L, L, crownC, .5 + .5 * s0, .5);
      }
    }
    y += (lod ? 1.5 : .8) * (.8 + R() * .4);
  }
  return { trunk: trunk.build(), fol: fol.build(), H, r0, bark: 'aspen', leaf: 'aspen' };
}
function snag(seed, lod) {
  const R = mulberry(seed), H = 12 + R() * 8, trunk = new GB(), r0 = H * .017 + .08;
  const pts = spinePts(R, H, r0, lod ? 5 : 9, .5, .8); pts[pts.length - 1].r = r0 * .35; tube(trunk, pts, lod ? 5 : 8, 2, 1.4, .55, .9);
  for (let k = 0; k < (lod ? 4 : 11); k++) {
    const y = H * (.25 + R() * .7), sp = spineAt(pts, y), az = R() * 6.28, d = V(Math.cos(az), -.2 + R() * .5, Math.sin(az)).normalize(), l = .5 + R() * 1.8 * (1 - y / H);
    tube(trunk, [{ p: sp.p.clone(), r: .06 }, { p: sp.p.clone().addScaledVector(d, l), r: .012 }], 4, 1, .6, .55, .8);
  }
  return { trunk: trunk.build(), fol: null, H, r0, bark: 'dead', leaf: null };
}

// ---- small plants and rocks ----
function bush(seed, leaf) {
  const R = mulberry(seed), fol = new GB(), C = V(0, .3, 0);
  for (let k = 0; k < 16; k++) {
    const az = R() * 6.28, el = R() * 1.1, r = .5 + R() * .35, p = V(Math.cos(az) * Math.cos(el) * r * .7, .15 + Math.sin(el) * r * .7, Math.sin(az) * Math.cos(el) * r * .7);
    const a = V(p.x, p.y + .5, p.z).normalize(), s = V(-a.z, 0, a.x).normalize().applyAxisAngle(a, R() * 3), L = .9 + R() * .4;
    card(fol, p.clone().addScaledVector(a, -L * .45), a, s, L, L, C, .45 + .55 * Math.sin(el + .3), .4);
  }
  return fol.build();
}
function fern(seed) {
  const R = mulberry(seed), g = new GB(), C = V(0, 0, 0), n = 8;
  for (let k = 0; k < n; k++) {
    const az = k / n * 6.28 + R() * .5, len = .75 + R() * .35, w = .32, rise = .55 + R() * .2, segs = 5, base = g.vc;
    const dir = V(Math.cos(az), 0, Math.sin(az)), side = V(-dir.z, 0, dir.x);
    for (let s = 0; s <= segs; s++) {
      const t = s / segs, along = t * len, h = Math.sin(t * Math.PI * .8) * rise * len - t * t * .2;
      const cen = V(dir.x * along, h, dir.z * along), nrm = V(dir.x * .3, 1, dir.z * .3).normalize(), ww = w * (1 - t * .3);
      g.v(cen.x - side.x * ww, cen.y, cen.z - side.z * ww, nrm.x, nrm.y, nrm.z, 0, t, .5 + .5 * t);
      g.v(cen.x + side.x * ww, cen.y, cen.z + side.z * ww, nrm.x, nrm.y, nrm.z, 1, t, .5 + .5 * t);
    }
    for (let s = 0; s < segs; s++) { const a = base + s * 2; g.i.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  return g.build();
}
function crossCards(seed, w, h, n = 3) {
  const R = mulberry(seed), g = new GB(), C = V(0, -1, 0);
  for (let k = 0; k < n; k++) { const an = k / n * Math.PI + R() * .3, s = V(Math.cos(an), 0, Math.sin(an)); card(g, V((R() - .5) * .3, 0, (R() - .5) * .3), V(0, 1, 0), s, h, w, C, 1, .9); }
  return g.build();
}
export function rockGeometry(seed, flat = 0.7, detail = 3) {
  const R = mulberry(seed); let g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g);
  const p = g.attributes.position, v = V();
  const bumps = []; for (let k = 0; k < 9; k++) bumps.push([V(R() - .5, R() - .5, R() - .5).normalize(), .1 + R() * .25, 2 + R() * 4]);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const d = v.clone().normalize(); let r = 1;
    for (const [b, a, k] of bumps) r += a * Math.pow(Math.max(0, d.dot(b)), k) - a * .3;
    r += (Math.sin(d.x * 9 + d.y * 7) * Math.sin(d.z * 8 - d.y * 5)) * .05;
    v.copy(d).multiplyScalar(r); v.y *= flat; if (v.y < -.25) v.y = -.25 + (v.y + .25) * .3;
    // facets: quantise along a few planes for a fractured look
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) * .5 + p.getZ(i) * .3; uv[i * 2 + 1] = p.getY(i) * .5 + p.getZ(i) * .2; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const col = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const y = p.getY(i), m = y > .2 ? .85 + .15 * R() : .7; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = m; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function log(seed) {
  const R = mulberry(seed), g = new GB(), L = 5 + R() * 2, r = .26 + R() * .08, pts = [];
  for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push({ p: V(-L / 2 + t * L, r * .85 + Math.sin(t * 3) * .04, Math.sin(t * 2.3) * .12), r: r * (1 - t * .25) }); }
  tube(g, pts, 9, 2, 1.4, .55, .8);
  for (const k of [0, 2]) { const s = (R() - .5) * 2.4, b = V(-L / 2 + L * (.25 + k * .2), r * .9, 0), d = V(.3, .5, s).normalize(); tube(g, [{ p: b, r: .07 }, { p: b.clone().addScaledVector(d, .7), r: .02 }], 4, 1, .5, .5, .7); }
  return g.build();
}
function stump(seed) {
  const R = mulberry(seed), g = new GB(), pts = [];
  for (let k = 0; k <= 3; k++) { const t = k / 3; pts.push({ p: V(0, -.2 + t * .75, 0), r: (.38 - t * .06) * (k === 0 ? 1.4 : 1) }); }
  tube(g, pts, 10, 2, 1.2, .55, .8);
  const top = g.vc, y = .55, n = 10; g.v(0, y + .02, 0, 0, 1, 0, .5, .5, .9);
  for (let s = 0; s <= n; s++) { const an = s / n * 6.28, rr = .32, jag = (s % 2) * .06 * R(); g.v(Math.cos(an) * rr, y + jag, Math.sin(an) * rr, 0, 1, 0, .5 + Math.cos(an) * .5, .5 + Math.sin(an) * .5, .8); }
  for (let s = 0; s < n; s++) g.i.push(top, top + 2 + s, top + 1 + s);
  return g.build();
}

// ---- materials ----
function foliageMat(tex, key, k, uKOut) {
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.42, side: THREE.DoubleSide, vertexColors: true, roughness: .88, metalness: 0, alphaToCoverage: true });
  const w = windify(m, key, k);
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    sh.uniforms.uSunCol = UREF.sunCol; sh.uniforms.uSunDirF = UREF.sunDir;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uSunCol; uniform vec3 uSunDirF;')
      .replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
reflectedLight.directSpecular *= 0.0; reflectedLight.indirectSpecular *= 0.0;   // leaves seen edge-on no longer sparkle
{ vec3 sv = normalize( ( viewMatrix * vec4( uSunDirF, 0.0 ) ).xyz ); float bl = pow( max( dot( - geometryViewDir, sv ), 0.0 ), 3.0 );
  reflectedLight.directDiffuse += diffuseColor.rgb * uSunCol * ( 0.06 + 0.14 * bl ) * vColor.r; }`);
  };
  if (uKOut) uKOut.uK = w.uK;
  return m;
}
const UREF = { sunCol: null, sunDir: null };
function barkMat(tex, key, k) {
  const m = new THREE.MeshStandardMaterial({ map: tex.map, normalMap: tex.normalMap, normalScale: new THREE.Vector2(1.2, 1.2), vertexColors: true, roughness: .95, metalness: 0 });
  return windify(m, key, k);
}

// builds every prototype and material, and paints the impostor atlas
export function buildPlants(renderer, tex, U) {
  UREF.sunCol = U.uSunCol; UREF.sunDir = U.uSunDirW;
  const protos = [], add = (fn, seed, kind) => { const near = fn(seed, 0), mid = fn(seed, 1); protos.push({ kind, near, mid, H: near.H, r0: near.r0 }); };
  add(pine, 11, 'pine'); add(pine, 12, 'pine'); add(pine, 13, 'pine');
  add(spruce, 21, 'spruce'); add(spruce, 22, 'spruce'); add(spruce, 23, 'spruce');
  add(aspen, 31, 'aspen'); add(aspen, 32, 'aspen'); add(aspen, 33, 'aspen');
  add(snag, 41, 'dead'); add(snag, 42, 'dead');
  const mats = {};
  for (const p of protos) {
    const k = [1 / p.H, p.kind === 'aspen' ? .22 : .32, p.kind === 'aspen' ? .05 : .015];
    const bk = p.near.bark, lk = p.near.leaf;
    p.barkMat = barkMat(tex.bark[bk], 'bark', k); p.barkDepth = windDepth('bark', p.barkMat.uK, null);
    if (lk) { const o = {}; p.folMat = foliageMat(tex.leaf[lk], 'leaf', k, o); p.folDepth = windDepth('leaf', o.uK, tex.leaf[lk]); }
    p.barkMat = p.barkMat.mat;
  }
  // props
  const props = [];
  const P = (geo, mat, depth, opt) => props.push({ geo, mat, depth, ...opt });
  const leafK = (h, sway, fl) => [1 / h, sway, fl];
  { const o = {}; const m = foliageMat(tex.leaf.bush, 'leaf', leafK(1.2, .06, .03), o); P(bush(51, 'bush'), m, windDepth('leaf', o.uK, tex.leaf.bush), { shadow: true, r: 1.1 }); }
  { const o = {}; const m = foliageMat(tex.leaf.fir, 'leaf', leafK(1.2, .04, .01), o); P(bush(52, 'fir'), m, windDepth('leaf', o.uK, tex.leaf.fir), { shadow: true, r: 1.0 }); }
  { const o = {}; const m = foliageMat(tex.leaf.fern, 'leaf', leafK(.8, .05, .03), o); P(fern(53), m, null, { shadow: false, r: .8 }); }
  { const o = {}; const m = foliageMat(tex.leaf.flower, 'leaf', leafK(.6, .06, .03), o); P(crossCards(54, .7, .6), m, null, { shadow: false, r: .5 }); }
  const rockMat = new THREE.MeshStandardMaterial({ map: tex.rock, normalMap: tex.rockN, normalScale: new THREE.Vector2(1.4, 1.4), vertexColors: true, roughness: .92 });
  P(rockGeometry(55, .95, 2), rockMat, null, { shadow: true, rock: true, r: .7 });
  P(rockGeometry(56, .62, 3), rockMat, null, { shadow: true, rock: true, r: 1.0 });
  const logMat = barkMat(tex.bark.dead, 'bark', [0, 0, 0]).mat;
  P(log(57), logMat, null, { shadow: true, r: .35 });
  P(stump(58), barkMat(tex.bark.pine, 'bark', [0, 0, 0]).mat, null, { shadow: true, r: .4 });
  { const o = {}; const m = foliageMat(tex.leaf.tuft, 'leaf', leafK(1.2, .12, .05), o); P(crossCards(59, 1.1, 1.3, 4), m, null, { shadow: false, r: .5 }); }
  const atlas = paintImpostors(renderer, protos);
  return { protos, props, atlas, rockMat };
}

// paint each tree from the side into a 2048 x 1024 atlas (8 x 2 cells), lit flat; the billboard shader lights it
function paintImpostors(renderer, protos) {
  const cols = 8, rows = 2, W = 2048, Hh = 1024, cw = W / cols, ch = Hh / rows;
  const rt = new THREE.WebGLRenderTarget(W, Hh, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, 0, -100, 100);
  const prevRT = renderer.getRenderTarget(), prevClear = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha(), prevAuto = renderer.autoClear;
  renderer.setRenderTarget(rt); renderer.setClearColor(new THREE.Color(.05, .07, .035), 0); renderer.autoClear = false; renderer.clear();
  const cells = [];
  protos.forEach((p, i) => {
    const bb = new THREE.Box3().setFromBufferAttribute(p.near.trunk.attributes.position); if (p.near.fol) bb.union(new THREE.Box3().setFromBufferAttribute(p.near.fol.attributes.position));
    const rad = Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x), Math.abs(bb.min.z), Math.abs(bb.max.z));
    const fw = Math.max(rad * 2.06, (bb.max.y + .3) * .5), fh = fw * 2;
    cam.left = -fw / 2; cam.right = fw / 2; cam.bottom = -.15; cam.top = fh - .15; cam.position.set(0, 0, 50); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    scene.clear();
    const tm = new THREE.MeshBasicMaterial({ map: p.barkMat.map, vertexColors: true });
    scene.add(new THREE.Mesh(p.near.trunk, tm));
    let fm = null; if (p.near.fol) { fm = new THREE.MeshBasicMaterial({ map: p.folMat.map, vertexColors: true, alphaTest: .42, side: THREE.DoubleSide }); scene.add(new THREE.Mesh(p.near.fol, fm)); }
    const cx = i % cols, cy = Math.floor(i / cols);
    rt.viewport.set(cx * cw, cy * ch, cw, ch); rt.scissor.set(cx * cw, cy * ch, cw, ch); rt.scissorTest = true;
    renderer.setRenderTarget(rt); renderer.render(scene, cam);
    tm.dispose(); if (fm) fm.dispose();
    cells.push({ u: cx / cols, v: cy / rows, fw, fh, base: -.15 });
  });
  rt.scissorTest = false; rt.viewport.set(0, 0, W, Hh); rt.scissor.set(0, 0, W, Hh);
  renderer.setRenderTarget(prevRT); renderer.setClearColor(prevClear, prevA); renderer.autoClear = prevAuto;
  return { texture: rt.texture, rt, cells, cellSize: [1 / cols, 1 / rows] };
}

// the far-forest billboard material: each instance turns to face the camera around its own upright axis
export function billboardMaterial(atlas, U) {
  const m = new THREE.MeshStandardMaterial({ map: atlas.texture, alphaTest: .38, roughness: .95, metalness: 0, alphaToCoverage: true });
  const uCell = { value: new THREE.Vector2(...atlas.cellSize) };
  patch(m, 'billboard', sh => {
    sh.uniforms.uCell = uCell; sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aP; attribute vec4 aC; uniform vec2 uCell; uniform float uTime; uniform vec4 uWind;')
      .replace('#include <beginnormal_vertex>', `vec3 toC = cameraPosition - aP.xyz; toC.y = 0.0; toC = normalize( toC + vec3( 1e-4, 0.0, 0.0 ) );
vec3 rgt = vec3( toC.z, 0.0, - toC.x );
vec3 objectNormal = normalize( toC * 0.7 + rgt * position.x * 1.1 + vec3( 0.0, 0.45, 0.0 ) );`)
      .replace('#include <begin_vertex>', `float sway = position.y * position.y * uWind.z * 0.25 * sin( uTime * 0.9 + dot( aP.xz, vec2( 0.071, 0.053 ) ) );
vec3 transformed = aP.xyz + rgt * position.x * aC.z * aP.w + vec3( uWind.x * sway, ( position.y * aC.w - 0.15 ) * aP.w, uWind.y * sway );`)
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vec2( aC.x, aC.y ) + vec2( position.x + 0.5, position.y ) * uCell;');
  });
  return m;
}
