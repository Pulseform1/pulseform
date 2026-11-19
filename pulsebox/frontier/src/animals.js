// Animal models built in code as skinned meshes: a skeleton per species, and a skin lofted along it (rump to snout
// in one smooth sweep, then legs, ears and tail), coloured by coat pattern and given a fur texture. Antlers, horns
// and wings are rigid parts riding on their bones. pose() drives walking, trotting, galloping, hopping, grazing,
// alert, lying down and falling over.
import * as THREE from 'three';
import { mulberry } from './noise.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function furTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), R = mulberry(77);
  g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, S, S); g.lineCap = 'round';
  for (let i = 0; i < 9000; i++) {
    const x = R() * S, y = R() * S, l = 3 + R() * 6, a = Math.PI / 2 + (R() - .5) * .7, v = 150 + R() * 105;
    g.strokeStyle = `rgba(${v},${v},${v},.55)`; g.lineWidth = .8 + R() * .8;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { if (x + ox < -10 || x + ox > S + 10 || y + oy < -10 || y + oy > S + 10) continue; g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// ---- skinned loft builder ----
class Skin {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.si = []; this.sw = []; this.i = []; }
  // st: [{p, rx, ry, w: [[bone, weight], ...], rb (belly radius), s (0..1 along the part)}], col(s, ang) -> [r,g,b]
  loft(st, seg, col, vScale = .25) {
    const base = this.p.length / 3, up = V(0, 1, 0);
    let len = 0, side0 = null, flip = false;
    st.forEach((s, k) => {
      const a = st[Math.max(0, k - 1)].p, b = st[Math.min(st.length - 1, k + 1)].p, t = V().subVectors(b, a).normalize();
      if (k) len += s.p.distanceTo(st[k - 1].p);
      let side = Math.abs(t.x) < .7 ? V(1, 0, 0) : V().crossVectors(t, up).normalize();
      side.addScaledVector(t, -side.dot(t)).normalize();
      const upv = V().crossVectors(t, side).normalize();
      if (k === 0) { side0 = side; flip = V().crossVectors(side, upv).dot(t) < 0; }
      const w = s.w.slice(0, 4); while (w.length < 4) w.push([0, 0]); const tot = w.reduce((q, x) => q + x[1], 0) || 1;
      for (let j = 0; j <= seg; j++) {
        const an = j / seg * Math.PI * 2, ca = Math.cos(an), sa = Math.sin(an), ry = sa < 0 ? (s.rb ?? s.ry) : s.ry, rx = s.rx;
        const off = V().addScaledVector(side, ca * rx).addScaledVector(upv, sa * ry);
        const n = V().addScaledVector(side, ca * ry).addScaledVector(upv, sa * rx).normalize();
        this.p.push(s.p.x + off.x, s.p.y + off.y, s.p.z + off.z); this.n.push(n.x, n.y, n.z); this.uv.push(j / seg * 2, len / vScale);
        const cc = col(s.s ?? k / (st.length - 1), sa, ca, s); this.c.push(cc[0], cc[1], cc[2]);
        for (const [bi, bw] of w) { this.si.push(bi); this.sw.push(bw / tot); }
      }
    });
    const row = seg + 1;
    for (let k = 0; k < st.length - 1; k++) for (let j = 0; j < seg; j++) {
      const a = base + k * row + j, b = a + 1, c = a + row, d = c + 1;
      if (flip) this.i.push(a, c, b, b, c, d); else this.i.push(a, b, c, b, d, c);
    }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.i); g.computeBoundingSphere(); g.boundingSphere.radius *= 1.35; return g;
  }
}
const hex = h => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map(v => Math.pow(v, 2.2)); };
const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));

// ---- quadruped from a few measurements ----
function quadruped(o) {
  const B = [], idx = {}, bone = (name, parent, p) => { idx[name] = B.length; B.push({ name, parent, p }); return B.length - 1; };
  const { L, hipH, shH, R, H } = o;
  bone('root', null, V(0, 0, 0));
  const hips = V(0, hipH + H * .25, -L / 2), spine = V(0, (hipH + shH) / 2 + H * .3, 0), chest = V(0, shH + H * .28 + (o.hump || 0) * .4, L / 2);
  bone('hips', 'root', hips); bone('spine', 'hips', spine); bone('chest', 'spine', chest);
  const nb = V(0, chest.y + H * .3, L / 2 + R * .55), na = o.neckAng * Math.PI / 180, nd = V(0, Math.sin(na), Math.cos(na));
  bone('neck', 'chest', nb); const hd = nb.clone().addScaledVector(nd, o.neckLen); bone('head', 'neck', hd);
  bone('tail', 'hips', V(0, hips.y + H * .35, -L / 2 - R * .75));
  const legs = [['FL', 1, 1], ['FR', -1, 1], ['HL', 1, -1], ['HR', -1, -1]];
  for (const [n, sx, sz] of legs) {
    const front = sz > 0, top = front ? shH : hipH, x = sx * R * (o.legX || .62), z = sz * L / 2 + (front ? -R * .1 : R * .1);
    bone(n + '0', front ? 'chest' : 'hips', V(x, top, z));
    bone(n + '1', n + '0', V(x, top * .52, z + (front ? -.01 : .06) * top));
    bone(n + '2', n + '1', V(x, top * (front ? .24 : .27), z + (front ? .0 : -.07) * top));
  }
  const sk = new Skin(), w = (...a) => { const r = []; for (let i = 0; i < a.length; i += 2) r.push([idx[a[i]], a[i + 1]]); return r; };
  const col = o.col;
  // body, neck and head in one sweep: rump -> chest -> neck -> head -> nose
  const hdDir = V(0, -Math.sin(o.headAng * Math.PI / 180), Math.cos(o.headAng * Math.PI / 180));
  const st = [
    { p: V(0, hips.y - H * .08, -L / 2 - R * 1.04), rx: R * .1, ry: H * .12, w: w('hips', 1), s: 0 },
    { p: V(0, hips.y - H * .06, -L / 2 - R * .94), rx: R * .48, ry: H * .52, w: w('hips', 1), s: .02 },
    { p: V(0, hips.y - H * .05, -L / 2 - R * .7), rx: R * .78, ry: H * .8, w: w('hips', 1), s: .05 },
    { p: V(0, hips.y - H * .1, -L / 2 - R * .2), rx: R * .95, ry: H * .95, rb: H * .9, w: w('hips', 1), s: .1 },
    { p: V(0, (hips.y + spine.y) / 2 - H * .15, -L / 4), rx: R * 1.04, ry: H * 1.0, rb: H * (1.05 + (o.belly || 0)), w: w('hips', .5, 'spine', .5), s: .25 },
    { p: V(0, spine.y - H * .2, 0), rx: R * 1.08, ry: H * 1.02, rb: H * (1.1 + (o.belly || 0)), w: w('spine', 1), s: .42 },
    { p: V(0, (spine.y + chest.y) / 2 - H * .15 + (o.hump || 0) * .25, L / 4), rx: R * 1.04, ry: H * 1.05 + (o.hump || 0) * .6, rb: H * 1.05, w: w('spine', .5, 'chest', .5), s: .58 },
    { p: V(0, chest.y - H * .12 + (o.hump || 0) * .15, L / 2 - R * .1), rx: R * .95, ry: H * 1.02 + (o.hump || 0) * .5, rb: H * 1.0, w: w('chest', 1), s: .72 },
    { p: V(0, chest.y - H * .05, L / 2 + R * .45), rx: R * .72, ry: H * .82, w: w('chest', .7, 'neck', .3), s: .8 },
  ];
  const nr0 = o.neckR0, nr1 = o.neckR1;
  for (let k = 1; k <= 3; k++) { const t = k / 4; st.push({ p: nb.clone().addScaledVector(nd, o.neckLen * t), rx: nr0 + (nr1 - nr0) * t, ry: (nr0 + (nr1 - nr0) * t) * (o.neckDeep || 1.25), w: w('neck', 1 - t * .6, 'head', t * .6), s: .82 + t * .1 }); }
  const hl = o.headLen;
  st.push({ p: hd.clone().addScaledVector(hdDir, -hl * .05), rx: o.headR, ry: o.headR * 1.15, w: w('head', 1), s: .93, head: 1 });
  st.push({ p: hd.clone().addScaledVector(hdDir, hl * .35), rx: o.headR * .82, ry: o.headR * .9, rb: o.headR * (o.jowl || .95), w: w('head', 1), s: .95, head: 1 });
  st.push({ p: hd.clone().addScaledVector(hdDir, hl * .75), rx: o.snoutR * 1.05, ry: o.snoutR * 1.1, rb: o.snoutR * (o.snoutDrop || 1.1), w: w('head', 1), s: .98, head: 1 });
  st.push({ p: hd.clone().addScaledVector(hdDir, hl * .98), rx: o.snoutR * .8, ry: o.snoutR * .85, w: w('head', 1), s: .995, head: 1, nose: 1 });
  st.push({ p: hd.clone().addScaledVector(hdDir, hl * 1.02), rx: o.snoutR * .2, ry: o.snoutR * .2, w: w('head', 1), s: 1, head: 1, nose: 1 });
  sk.loft(st, 14, (s, sa, ca, stn) => col('body', s, sa, ca, stn), .3);
  // legs
  for (const [n, sx, sz] of legs) {
    const a = B[idx[n + '0']].p, b = B[idx[n + '1']].p, c = B[idx[n + '2']].p, foot = V(c.x, 0, c.z + (sz > 0 ? .02 : .03)), front = sz > 0, lr = o.legR;
    const par = front ? 'chest' : 'hips';
    const ls = [
      { p: a.clone().add(V(0, H * .55, 0)), rx: lr * 1.6, ry: lr * 2.6, w: w(par, .7, n + '0', .3), s: 0 },
      { p: a.clone(), rx: lr * 1.45, ry: lr * (front ? 2.1 : 2.6), w: w(n + '0', 1), s: .2 },
      { p: a.clone().lerp(b, .55), rx: lr * 1.05, ry: lr * (front ? 1.4 : 1.9), w: w(n + '0', 1), s: .35 },
      { p: b.clone(), rx: lr * .8, ry: lr * 1.0, w: w(n + '0', .4, n + '1', .6), s: .5 },
      { p: b.clone().lerp(c, .5), rx: lr * .62, ry: lr * .78, w: w(n + '1', 1), s: .65 },
      { p: c.clone(), rx: lr * .62, ry: lr * .75, w: w(n + '1', .4, n + '2', .6), s: .78 },
      { p: c.clone().lerp(foot, .7), rx: lr * .52, ry: lr * .6, w: w(n + '2', 1), s: .9 },
      { p: foot.clone().add(V(0, o.hoofH || .06, 0)), rx: lr * (o.paw ? 1.0 : .62), ry: lr * (o.paw ? 1.3 : .75), w: w(n + '2', 1), s: .95, hoof: 1 },
      { p: foot.clone().add(V(0, .005, (o.paw ? .05 : .012))), rx: lr * (o.paw ? 1.05 : .7), ry: lr * (o.paw ? 1.5 : .85), w: w(n + '2', 1), s: 1, hoof: 1 },
    ];
    sk.loft(ls, 9, (s, sa, ca, stn) => col('leg', s, sa, ca, stn, front), .25);
  }
  // tail
  const tb = B[idx.tail].p;
  sk.loft([{ p: tb.clone().add(V(0, .02, .05)), rx: o.tailR, ry: o.tailR, w: w('hips', .5, 'tail', .5), s: 0 }, { p: tb.clone().add(V(0, -o.tailLen * .45, -o.tailLen * .3)), rx: o.tailR * .9, ry: o.tailR * 1.1, w: w('tail', 1), s: .5 }, { p: tb.clone().add(V(0, -o.tailLen, -o.tailLen * .35)), rx: o.tailR * .3, ry: o.tailR * .3, w: w('tail', 1), s: 1 }], 7, (s, sa, ca, stn) => col('tail', s, sa, ca, stn), .2);
  // ears
  for (const sx of [1, -1]) {
    const e0 = hd.clone().add(V(sx * o.headR * .7, o.headR * .8, -hl * .05)), ed = V(sx * (o.earOut ?? .7), o.earUp ?? .7, -.25).normalize();
    sk.loft([{ p: e0, rx: o.earW * .5, ry: o.earW * .25, w: w('head', 1), s: 0 }, { p: e0.clone().addScaledVector(ed, o.earLen * .5), rx: o.earW, ry: o.earW * .35, w: w('head', 1), s: .5 }, { p: e0.clone().addScaledVector(ed, o.earLen), rx: o.earW * .15, ry: o.earW * .1, w: w('head', 1), s: 1 }], 7, (s, sa, ca, stn) => col('ear', s, sa, ca, stn), .1);
  }
  return { bones: B, idx, geo: sk.build(), dims: { hips, chest, hd, hdDir, nb } };
}

// ---- birds ----
function bird(o) {
  const B = [], idx = {}, bone = (name, parent, p) => { idx[name] = B.length; B.push({ name, parent, p }); };
  bone('root', null, V(0, 0, 0));
  const body = V(0, o.bodyY, 0); bone('hips', 'root', body); bone('spine', 'hips', body.clone().add(V(0, 0, .01))); bone('chest', 'spine', body.clone().add(V(0, 0, o.bodyL * .3)));
  const nb = body.clone().add(V(0, o.bodyH * .5, o.bodyL * .42)); bone('neck', 'chest', nb);
  const hd = nb.clone().add(V(0, o.neckLen * .92, o.neckLen * (o.neckFwd ?? .3))); bone('head', 'neck', hd);
  bone('tail', 'hips', body.clone().add(V(0, o.bodyH * .2, -o.bodyL * .5)));
  if (o.legs) for (const [n, sx] of [['HL', 1], ['HR', -1]]) { bone(n + '0', 'hips', V(sx * o.bodyW * .4, o.bodyY - o.bodyH * .3, 0)); bone(n + '1', n + '0', V(sx * o.bodyW * .4, o.legH * .5, -.02)); bone(n + '2', n + '1', V(sx * o.bodyW * .4, .03, .02)); }
  bone('wingL', 'chest', body.clone().add(V(o.bodyW * .45, o.bodyH * .35, o.bodyL * .15))); bone('wingR', 'chest', body.clone().add(V(-o.bodyW * .45, o.bodyH * .35, o.bodyL * .15)));
  const sk = new Skin(), w = (...a) => { const r = []; for (let i = 0; i < a.length; i += 2) r.push([idx[a[i]], a[i + 1]]); return r; }, col = o.col;
  const L = o.bodyL, W = o.bodyW, H = o.bodyH;
  const st = [
    { p: body.clone().add(V(0, H * .15, -L * .55)), rx: W * .1, ry: H * .08, w: w('hips', 1), s: 0 },
    { p: body.clone().add(V(0, H * .05, -L * .38)), rx: W * .38, ry: H * .32, w: w('hips', 1), s: .12 },
    { p: body.clone().add(V(0, 0, -L * .12)), rx: W * .5, ry: H * .48, rb: H * .52, w: w('hips', .6, 'spine', .4), s: .3 },
    { p: body.clone().add(V(0, 0, L * .12)), rx: W * .5, ry: H * .5, rb: H * .55, w: w('spine', .5, 'chest', .5), s: .5 },
    { p: body.clone().add(V(0, H * .08, L * .34)), rx: W * .38, ry: H * .42, w: w('chest', 1), s: .65 },
    { p: nb.clone(), rx: o.neckR * 1.2, ry: o.neckR * 1.25, w: w('chest', .5, 'neck', .5), s: .72 },
    { p: nb.clone().lerp(hd, .5), rx: o.neckR, ry: o.neckR, w: w('neck', 1), s: .8 },
    { p: hd.clone(), rx: o.headR, ry: o.headR * 1.05, w: w('head', 1), s: .9, head: 1 },
    { p: hd.clone().add(V(0, -o.headR * .1, o.headR * .9)), rx: o.billW, ry: o.billH, w: w('head', 1), s: .95, head: 1, bill: 1 },
    { p: hd.clone().add(V(0, -o.headR * .2, o.headR * .9 + o.billL)), rx: o.billW * .7, ry: o.billH * .4, w: w('head', 1), s: 1, head: 1, bill: 1 },
  ];
  sk.loft(st, 12, (s, sa, ca, stn) => col('body', s, sa, ca, stn), .15);
  if (o.legs) for (const n of ['HL', 'HR']) { const a = B[idx[n + '0']].p, b = B[idx[n + '1']].p, c = B[idx[n + '2']].p; sk.loft([{ p: a.clone().add(V(0, .05, 0)), rx: .03, ry: .04, w: w('hips', .5, n + '0', .5), s: 0 }, { p: b, rx: .012, ry: .012, w: w(n + '0', .5, n + '1', .5), s: .5 }, { p: c, rx: .01, ry: .01, w: w(n + '1', .5, n + '2', .5), s: .8 }, { p: V(c.x, .005, c.z + .05), rx: .008, ry: .004, w: w(n + '2', 1), s: 1 }], 5, (s, sa, ca, stn) => col('leg', s, sa, ca, stn), .1); }
  return { bones: B, idx, geo: sk.build(), dims: { hd, nb, body } };
}

// rigid extras
function antlers(spec, mat) {
  const g = new THREE.Group(), R = mulberry(spec.seed || 3);
  const tube = (a, b, r0, r1) => { const d = V().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, d.length(), 6), mat); m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.castShadow = true; g.add(m); };
  for (const sx of [1, -1]) {
    if (spec.palm) { // moose: a broad palm with tines along its edge
      const base = V(sx * .1, .05, 0), out = V(sx * .45, .12, -.05); tube(base, out, .05, .045);
      const palm = new THREE.Mesh(new THREE.SphereGeometry(.5, 12, 8), mat); palm.scale.set(.75, .08, .42); palm.position.set(sx * .62, .22, -.02); palm.rotation.z = sx * .35; palm.castShadow = true; g.add(palm);
      for (let k = 0; k < 6; k++) { const a = k / 5, p = V(sx * (.4 + a * .45), .26 + Math.sin(a * 3) * .05, -.15 + a * .3); tube(p, p.clone().add(V(sx * .06, .16, 0)), .025, .01); }
    } else { // deer and elk: a curved main beam with tines rising from it
      const n = spec.points, s = spec.size; let p = V(sx * .05 * s, 0, 0), dir = V(sx * .7, .55, -.45).normalize();
      for (let k = 0; k < n; k++) {
        const q = p.clone().addScaledVector(dir, s * .2); tube(p, q, s * .034 * (1 - k * .1), s * .028 * (1 - k * .1));
        if (k > 0 && k < n - 1) { const t = q.clone().add(V(sx * .015 * s, s * (.15 + R() * .06), s * .05)); tube(q, t, s * .02, s * .007); }
        p = q; dir.add(V(-sx * .16, .02, .3)).normalize();
      }
    }
  }
  return g;
}
function horns(mat, s = 1) {
  const g = new THREE.Group();
  for (const sx of [1, -1]) { const t = new THREE.Mesh(new THREE.TorusGeometry(.09 * s, .022 * s, 6, 10, Math.PI * .55), mat); t.position.set(sx * .12 * s, .02, 0); t.rotation.set(0, Math.PI / 2, sx > 0 ? .3 : Math.PI - .3); t.castShadow = true; g.add(t); }
  return g;
}

// ---- species ----
const C = {};
export const SPECIES = {
  deer: { name: 'deer', graze: [1.55, -.85], label: 'Mule deer', meat: 'venison', lb: [55, 85], walk: 1.3, trot: 3.2, run: 11, stride: 1.25, herd: [2, 5], wary: 1, sight: 75, hear: 1, hp: 1, scale: [.9, 1.1], gait: 'gallop',
    build: () => quadruped({ L: .82, hipH: .78, shH: .76, R: .18, H: .2, neckAng: 50, neckLen: .46, neckR0: .12, neckR1: .072, headLen: .3, headR: .075, snoutR: .042, headAng: 55, legR: .036, tailLen: .18, tailR: .035, earLen: .2, earW: .065, earUp: .55, earOut: .85,
      col: (part, s, sa, ca, st, front) => { const back = hex('#7a5a3e'), belly = hex('#d8cfc0'), dark = hex('#2a201a'); if (part === 'tail') return s > .55 ? dark : mixc(hex('#e8e4dc'), back, sa > 0 ? .4 : 0); if (part === 'ear') return mixc(back, dark, s); if (part === 'leg') return st.hoof ? dark : mixc(back, hex('#5e4a3a'), s * .8);
        if (st.nose) return dark; let c = mixc(back, belly, (-sa - .35) * 2.2); if (s < .06 && sa < .3) c = mixc(c, hex('#ede8de'), .8); if (st.head) c = mixc(c, hex('#d6cbb8'), sa < -.2 ? .7 : 0); if (s > .8 && s < .9 && sa < 0) c = mixc(c, belly, .7); return c; } }),
    extras: (rig, rnd, mats) => rnd < .45 ? [{ bone: 'head', obj: antlers({ points: 4, size: 1.0, seed: 5 }, mats.antler), at: [0, .11, -.06] }] : [] },
  elk: { name: 'elk', graze: [1.5, -.8], label: 'Elk', meat: 'elk meat', lb: [160, 240], walk: 1.4, trot: 3.6, run: 12, stride: 1.7, herd: [3, 7], wary: .8, sight: 85, hear: .9, hp: 2, scale: [.92, 1.1], gait: 'gallop',
    build: () => quadruped({ L: 1.2, hipH: 1.08, shH: 1.12, R: .27, H: .32, neckAng: 42, neckLen: .7, neckR0: .2, neckR1: .1, neckDeep: 1.45, headLen: .5, headR: .1, snoutR: .065, headAng: 50, legR: .05, tailLen: .1, tailR: .04, earLen: .2, earW: .07, earUp: .6, earOut: .8,
      col: (part, s, sa, ca, st) => { const body = hex('#b08a5e'), dark = hex('#3a2416'), rump = hex('#e2d2b4'); if (part === 'tail') return rump; if (part === 'ear') return body; if (part === 'leg') return st.hoof ? hex('#1a1410') : mixc(dark, body, s < .3 ? .2 : 0); if (st.nose) return hex('#1a1410');
        if (s < .07 && sa < .4) return rump; if (s > .76) return mixc(dark, hex('#4e3220'), sa); return mixc(body, hex('#8a6a48'), (-sa - .4) * 1.5); } }),
    extras: (rig, rnd, mats) => rnd < .4 ? [{ bone: 'head', obj: antlers({ points: 6, size: 1.9, seed: 9 }, mats.antler), at: [0, .14, -.1] }] : [] },
  moose: { name: 'moose', graze: [1.15, -.55], label: 'Moose', meat: 'moose meat', lb: [250, 380], walk: 1.3, trot: 3.4, run: 9.5, stride: 1.9, herd: [1, 2], wary: .6, sight: 55, hear: .9, hp: 2, scale: [.95, 1.1], gait: 'trot', water: 1,
    build: () => quadruped({ L: 1.3, hipH: 1.22, shH: 1.4, R: .32, H: .42, hump: .1, neckAng: 22, neckLen: .5, neckR0: .25, neckR1: .17, neckDeep: 1.4, headLen: .72, headR: .13, snoutR: .1, snoutDrop: 1.5, jowl: 1.3, headAng: 40, legR: .055, tailLen: .08, tailR: .04, earLen: .24, earW: .085, earUp: .5, earOut: 1,
      col: (part, s, sa, ca, st) => { const b = hex('#2a1e16'), leg = hex('#9a8a74'); if (part === 'leg') return st.hoof ? hex('#141010') : mixc(b, leg, (s - .3) * 3); if (st.nose) return hex('#3a2c22'); return mixc(b, hex('#3e2c20'), sa * .5 + .2); } }),
    extras: (rig, rnd, mats) => rnd < .45 ? [{ bone: 'head', obj: antlers({ palm: 1 }, mats.antler), at: [0, .14, -.05] }] : [] },
  bison: { name: 'bison', graze: [.7, -.2], label: 'Bison', meat: 'bison meat', lb: [300, 450], walk: 1.1, trot: 3.2, run: 10, stride: 1.6, herd: [4, 9], wary: .5, sight: 65, hear: .7, hp: 2, scale: [.92, 1.12], gait: 'gallop',
    build: () => quadruped({ L: 1.35, hipH: .9, shH: 1.15, R: .42, H: .48, hump: .32, belly: .1, neckAng: -12, neckLen: .32, neckR0: .38, neckR1: .3, neckDeep: 1.1, headLen: .5, headR: .2, snoutR: .13, headAng: 75, jowl: 1.35, legR: .07, legX: .5, tailLen: .4, tailR: .03, earLen: .12, earW: .07, earUp: .1, earOut: 1,
      col: (part, s, sa, ca, st) => { const b = hex('#4a3020'), shag = hex('#2a1a10'); if (part === 'leg') return st.hoof ? hex('#100c0a') : mixc(b, shag, s > .6 ? 1 : .4); if (part === 'tail') return shag; if (st.nose) return hex('#141010'); return s > .55 ? mixc(shag, hex('#5a3a22'), sa * .4) : mixc(b, hex('#5e4430'), sa * .3); } }),
    extras: (rig, rnd, mats) => [{ bone: 'head', obj: horns(mats.horn, 1.2), at: [0, .15, -.02] }] },
  bear: { name: 'bear', graze: [1.0, -.35], label: 'Grizzly bear', meat: 'bear meat', lb: [180, 320], walk: 1.2, trot: 3.5, run: 11, stride: 1.2, herd: [1, 1], wary: .5, sight: 45, hear: 1.1, hp: 2, scale: [.9, 1.15], gait: 'gallop', bear: 1,
    build: () => quadruped({ L: .9, hipH: .58, shH: .66, R: .33, H: .36, hump: .12, belly: .1, neckAng: 18, neckLen: .26, neckR0: .27, neckR1: .2, neckDeep: 1.1, headLen: .36, headR: .16, snoutR: .075, headAng: 25, legR: .1, legX: .55, hoofH: .03, paw: 1, tailLen: .06, tailR: .04, earLen: .08, earW: .06, earUp: .9, earOut: .5,
      col: (part, s, sa, ca, st) => { const b = hex('#4a3424'), tip = hex('#8a6a4a'); if (part === 'leg') return st.hoof ? hex('#1a1410') : hex('#2e2018'); if (st.nose) return hex('#120e0c'); if (st.head && s > .97) return hex('#8a6e52'); return mixc(b, tip, sa * .5 + (s > .55 && s < .75 ? .3 : 0)); } }) },
  rabbit: { name: 'rabbit', graze: [.6, -.2], label: 'Cottontail rabbit', meat: 'rabbit', lb: [2, 3], walk: .6, trot: 2.5, run: 8, stride: .5, herd: [1, 2], wary: 1.2, sight: 35, hear: 1.2, hp: 1, scale: [.9, 1.1], gait: 'hop', small: 1,
    build: () => quadruped({ L: .14, hipH: .1, shH: .085, R: .07, H: .075, neckAng: 40, neckLen: .05, neckR0: .045, neckR1: .04, headLen: .09, headR: .04, snoutR: .025, headAng: 30, legR: .014, legX: .55, tailLen: .03, tailR: .025, earLen: .1, earW: .025, earUp: 1, earOut: .25,
      col: (part, s, sa) => { const b = hex('#8a7a66'); if (part === 'tail') return hex('#f2efe8'); if (part === 'ear') return mixc(b, hex('#3a2e24'), s - .5); return mixc(b, hex('#d8d0c4'), (-sa - .3) * 2); } }) },
  turkey: { name: 'turkey', graze: [1.25, .2], label: 'Wild turkey', meat: 'turkey', lb: [12, 20], walk: .9, trot: 2.6, run: 7, stride: .5, herd: [4, 8], wary: 1, sight: 60, hear: 1, hp: 1, scale: [.92, 1.08], gait: 'biped', bird: 1,
    build: () => bird({ bodyY: .5, bodyL: .5, bodyW: .32, bodyH: .3, neckLen: .26, neckR: .03, neckFwd: .35, headR: .035, billW: .012, billH: .01, billL: .03, legs: 1, legH: .4,
      col: (part, s, sa, ca, st) => { if (part === 'leg') return hex('#a07a6a'); if (st.bill) return hex('#8a7a6a'); if (st.head) return mixc(hex('#c03028'), hex('#6a8ab8'), sa); if (s > .68 && s < .85) return mixc(hex('#b84030'), hex('#2a2018'), s < .76 ? 0 : .7); const b = mixc(hex('#3a2a1c'), hex('#5a4228'), sa * .5 + .3); return s < .1 ? hex('#6a4a2a') : b; } }),
    extras: (rig, rnd, mats) => { const fan = new THREE.Mesh(new THREE.CircleGeometry(.26, 14, 0, Math.PI), mats.fan); fan.rotation.set(-1.25, 0, Math.PI); fan.position.set(0, 0, -.02); fan.castShadow = true; return [{ bone: 'tail', obj: fan, at: [0, .02, -.02] }]; } },
  duck: { name: 'duck', graze: [1.4, .3], label: 'Mallard', meat: 'duck', lb: [2, 3], walk: .6, trot: 1.2, run: 1.6, stride: .3, herd: [3, 7], wary: 1.1, sight: 60, hear: 1.1, hp: 1, scale: [.95, 1.05], gait: 'swim', bird: 1, swim: 1, small: 1,
    build: () => bird({ bodyY: .05, bodyL: .36, bodyW: .18, bodyH: .14, neckLen: .12, neckR: .028, neckFwd: .25, headR: .032, billW: .022, billH: .009, billL: .05,
      col: (part, s, sa, ca, st) => { if (st.bill) return hex('#d8b030'); if (st.head || s > .78) return s > .84 || st.head ? hex('#1e5a32') : hex('#f0f0ea'); if (s > .6) return hex('#6a3a24'); if (s < .1) return hex('#1a1a1a'); return mixc(hex('#b8b4ac'), hex('#8a8680'), sa * .5 + .5); } }),
    extras: (rig, rnd, mats) => { const out = []; for (const [b, sx] of [['wingL', 1], ['wingR', -1]]) { const wg = new THREE.Mesh(new THREE.SphereGeometry(.5, 10, 6), mats.wing); wg.scale.set(.09, .03, .2); wg.position.set(sx * .02, 0, -.05); wg.castShadow = true; const pv = new THREE.Group(); pv.add(wg); out.push({ bone: b, obj: pv, at: [0, 0, 0], wing: sx }); } return out; } },
};

// shared geometry and materials per species, built once
let MATS = null;
export function speciesAssets(name) {
  if (!MATS) {
    const fur = furTexture();
    MATS = { skin: new THREE.MeshStandardMaterial({ map: fur, vertexColors: true, roughness: .92, metalness: 0 }), antler: new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: .75 }), horn: new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: .4 }),
      fan: new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: .8, side: THREE.DoubleSide }), wing: new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: .8 }) };
  }
  if (!C[name]) { const sp = SPECIES[name], rig = sp.build(); C[name] = { rig, sp }; }
  return { ...C[name], mats: MATS };
}

// one animal: its own skeleton on the shared skin
export function makeAnimal(name, rnd) {
  const { rig, sp, mats } = speciesAssets(name);
  const bones = rig.bones.map(b => { const o = new THREE.Bone(); o.name = b.name; return o; });
  rig.bones.forEach((b, i) => { if (b.parent) { const pi = rig.idx[b.parent]; bones[pi].add(bones[i]); bones[i].position.copy(b.p).sub(rig.bones[pi].p); } else bones[i].position.copy(b.p); });
  const mesh = new THREE.SkinnedMesh(rig.geo, mats.skin); mesh.add(bones[0]); mesh.bind(new THREE.Skeleton(bones)); mesh.castShadow = true; mesh.receiveShadow = true;
  const B = {}; bones.forEach(b => { B[b.name] = b; b.userData.rest = b.position.clone(); });
  const wings = [], ex = sp.extras ? sp.extras(rig, rnd, mats) : [];
  for (const e of ex) { e.obj.position.set(...e.at); B[e.bone].add(e.obj); if (e.wing) wings.push(e); }
  return { mesh, B, rig, sp, wings, male: ex.some(e => e.bone === 'head') && name !== 'bison' };
}

const q = new THREE.Quaternion(), e = new THREE.Euler();
const rot = (b, x, y = 0, z = 0) => { e.set(x, y, z); b.quaternion.setFromEuler(e); };
// p: { gait: 'stand'|'walk'|'trot'|'run', phase, speed, headDown 0..1, alert 0..1, lie 0..1, fall 0..1, look (yaw offset), flap }
export function pose(a, p) {
  const B = a.B, sp = a.sp, ph = p.phase * Math.PI * 2;
  const lie = p.lie || 0, fall = p.fall || 0;
  let bob = 0, pitch = 0;
  const legs = [['FL', 0, 1], ['FR', .5, 1], ['HL', .5, 0], ['HR', 0, 0]];
  const moving = p.gait !== 'stand', run = p.gait === 'run', trot = p.gait === 'trot';
  const amp = moving ? (run ? .62 : trot ? .45 : .32) : 0;
  for (const [n, off0, front] of legs) {
    if (!B[n + '0']) continue;
    let off = off0;
    if (p.gait === 'walk') off = { FL: .25, FR: .75, HL: 0, HR: .5 }[n];
    if (run && sp.gait === 'gallop') off = { FL: .55, FR: .65, HL: 0, HR: .1 }[n];
    if (sp.gait === 'hop' && moving) off = front ? .5 : 0;
    const t = ph + off * Math.PI * 2, sw = Math.sin(t), lift = Math.max(0, -Math.cos(t));
    let a0 = sw * amp, a1 = 0, a2 = 0;
    if (front) { a1 = lift * amp * 1.6; a2 = -lift * amp * .6; } else { a1 = -lift * amp * 1.1; a2 = lift * amp * 1.4; }
    // lying down: legs folded under
    a0 = a0 * (1 - lie) + lie * (front ? -1.35 : 1.25); a1 = a1 * (1 - lie) + lie * (front ? 2.5 : -2.4); a2 = a2 * (1 - lie) + lie * (front ? -.4 : 1.2);
    // falling: legs go limp and stiffen out
    a0 = a0 * (1 - fall) + fall * (front ? .45 : -.4); a1 *= 1 - fall; a2 *= 1 - fall;
    rot(B[n + '0'], a0); if (B[n + '1']) rot(B[n + '1'], a1); if (B[n + '2']) rot(B[n + '2'], a2);
  }
  if (moving) { bob = Math.abs(Math.sin(ph * 2)) * (run ? .05 : .015) * (sp.small ? .3 : 1); pitch = Math.sin(ph * 2) * (run ? .05 : .01); }
  if (sp.gait === 'hop' && moving) { bob = Math.max(0, Math.sin(ph)) * .08; pitch = Math.cos(ph) * .15; }
  const H = (a.rig.dims.hips || a.rig.dims.body).y;
  B.hips.position.y = B.hips.userData.rest.y + bob - lie * H * .62;
  rot(B.hips, pitch);
  rot(B.spine, 0);
  // head and neck: graze, alert, look
  const down = (p.headDown || 0) * (1 - fall), al = (p.alert || 0) * (1 - down);
  const gz = sp.graze || [1.5, -.8];
  rot(B.chest, -pitch * .5 + lie * .05 + down * .06);
  B.chest.position.y = B.chest.userData.rest.y - down * .04;
  rot(B.neck, down * gz[0] - al * .35 + (run ? .25 : 0) + lie * .25 + fall * .6, (p.look || 0) * .6 * (1 - down));
  rot(B.head, down * gz[1] - al * .15 + Math.sin(p.t * 1.7) * .03 * (1 - down) - fall * .3, (p.look || 0) * .4, p.tilt || 0);
  if (B.tail) rot(B.tail, (run ? -.6 : .1) * (1 - fall) + (p.flag || 0) * -1.2 + (sp.name === 'turkey' ? -(p.display || 0) * 1.1 : 0));
  // biped legs
  if (sp.gait === 'biped' && B.HL0) { for (const [n, off] of [['HL', 0], ['HR', .5]]) { const t = ph + off * Math.PI * 2; rot(B[n + '0'], Math.sin(t) * amp * 1.2 - lie * 1.2); rot(B[n + '1'], -Math.max(0, Math.cos(t)) * amp * 1.5 + lie * 2); } B.hips.position.y = B.hips.userData.rest.y + bob - lie * .3; }
  // wings
  for (const w of a.wings) { const f = p.flap || 0; w.obj.rotation.z = w.wing * (f > 0 ? Math.sin(p.t * 20) * 1.1 * f + .4 * f : 0); w.obj.rotation.x = 0; }
}
