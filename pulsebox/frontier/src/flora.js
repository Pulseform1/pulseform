// Places the forest around the player: near trees (full models), mid-distance trees (lighter models), far trees as
// camera-facing impostors out to the horizon, plus undergrowth, rocks and deadfall. Instance lists are rebuilt from
// per-chunk placement data as the player walks. Also answers "what am I bumping into" for the player.
import * as THREE from 'three';
import { CHUNK } from './terrain.js';
import { billboardMaterial } from './plants.js';

const KIND_PROTO = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 4];
// per prop kind: max draw distance factor (x the prop radius setting) and whether it blocks the player
const PROP_RANGE = [1, 1, .7, .7, .9, 3.2, 1.4, 1.2, .8];

function setM(a, o, x, y, z, ry, sx, sy = sx, sz = sx) {
  const c = Math.cos(ry), s = Math.sin(ry);
  a[o] = c * sx; a[o + 1] = 0; a[o + 2] = -s * sx; a[o + 3] = 0;
  a[o + 4] = 0; a[o + 5] = sy; a[o + 6] = 0; a[o + 7] = 0;
  a[o + 8] = s * sz; a[o + 9] = 0; a[o + 10] = c * sz; a[o + 11] = 0;
  a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
}
function im(geo, mat, cap, shadow, depth) {
  const m = new THREE.InstancedMesh(geo, mat, cap); m.count = 0; m.frustumCulled = false; m.castShadow = !!shadow; m.receiveShadow = true;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); if (depth) m.customDepthMaterial = depth; return m;
}

export class Flora {
  constructor(scene, jobs, plants, U, opts = {}) {
    this.scene = scene; this.jobs = jobs; this.plants = plants; this.chunks = new Map();
    this.set(opts);
    const cap = { near: 900, mid: 2600, far: 90000, prop: 6000 };
    this.group = new THREE.Group(); scene.add(this.group);
    for (const p of plants.protos) {
      p.im = {
        nearT: im(p.near.trunk, p.barkMat, cap.near, true, p.barkDepth), midT: im(p.mid.trunk, p.barkMat, cap.mid, true, p.barkDepth),
        nearF: p.near.fol ? im(p.near.fol, p.folMat, cap.near, true, p.folDepth) : null, midF: p.mid.fol ? im(p.mid.fol, p.folMat, cap.mid, true, p.folDepth) : null,
      };
      for (const m of Object.values(p.im)) if (m) this.group.add(m);
    }
    this.shadows();
    for (const d of plants.props) { d.im = im(d.geo, d.mat, cap.prop, d.shadow, d.depth); this.group.add(d.im); }
    // far-forest impostors
    const q = new THREE.InstancedBufferGeometry();
    q.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, 0, .5, 0, 0, .5, 1, 0, -.5, 1, 0], 3));
    q.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    q.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); q.setIndex([0, 1, 2, 0, 2, 3]);
    this.aP = new THREE.InstancedBufferAttribute(new Float32Array(cap.far * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aC = new THREE.InstancedBufferAttribute(new Float32Array(cap.far * 4), 4).setUsage(THREE.DynamicDrawUsage);
    q.setAttribute('aP', this.aP); q.setAttribute('aC', this.aC); q.instanceCount = 0; this.farCap = cap.far; this.propCap = cap.prop;
    this.bb = new THREE.Mesh(q, billboardMaterial(plants.atlas, U)); this.bb.frustumCulled = false; this.group.add(this.bb);
    this.last = new THREE.Vector3(1e9, 0, 1e9); this.timer = 0; this.dirty = true; this.counts = {};
  }
  set(o) { this.vegR = o.vegR ?? this.vegR ?? 900; this.nearR = o.nearR ?? this.nearR ?? 60; this.midR = o.midR ?? this.midR ?? 150; this.propR = o.propR ?? this.propR ?? 75; this.midShadow = o.midShadow ?? this.midShadow ?? true; this.shadows(); this.dirty = true; }
  // trees past the close ring: whether they cast shadows (off on Low: they stand mostly outside the shadowed area anyway)
  shadows() { for (const p of this.plants.protos) if (p.im) { p.im.midT.castShadow = this.midShadow; if (p.im.midF) p.im.midF.castShadow = this.midShadow; } }
  update(cam, dt) {
    this.timer -= dt;
    const moved = (cam.x - this.last.x) ** 2 + (cam.z - this.last.z) ** 2;
    if (moved > 400 || this.timer < -1) this.request(cam);
    if ((this.dirty || moved > 16) && this.timer <= 0) { this.rebuild(cam); this.timer = 0.18; }
  }
  request(cam) {
    const R = this.vegR + CHUNK, pcx = Math.floor(cam.x / CHUNK), pcz = Math.floor(cam.z / CHUNK), rc = Math.ceil(R / CHUNK);
    const seen = new Set();
    for (let dz = -rc; dz <= rc; dz++) for (let dx = -rc; dx <= rc; dx++) {
      const cx = pcx + dx, cz = pcz + dz, d = Math.hypot((cx + .5) * CHUNK - cam.x, (cz + .5) * CHUNK - cam.z); if (d > R) continue;
      const key = cx + ',' + cz; seen.add(key);
      let ch = this.chunks.get(key);
      if (!ch) {
        ch = { cx, cz, data: null, col: null }; this.chunks.set(key, ch);
        ch.job = this.jobs.run({ t: 'flora', cx, cz, C: CHUNK }, 40 + d * 1.2);
        ch.job.promise.then(r => { if (ch.dead) return; ch.data = r; ch.job = null; ch.col = this.colliders(r); this.dirty = true; });
      } else if (ch.job) ch.job.prio = 40 + d * 1.2;
    }
    for (const [k, ch] of this.chunks) if (!seen.has(k)) { ch.dead = true; if (ch.job) ch.job.cancel(); this.chunks.delete(k); }
    this.jobs.resort();
  }
  colliders(r) {
    const out = [], P = this.plants.protos, t = r.trees, p = r.props;
    for (let i = 0; i < t.length; i += 6) { const k = t[i + 5]; out.push(t[i], t[i + 2], k === 11 ? .12 : P[KIND_PROTO[k]].r0 * t[i + 4] * 1.25 + .05); }
    for (let i = 0; i < p.length; i += 6) {
      const k = p[i + 5], x = p[i], z = p[i + 2], s = p[i + 4], a = p[i + 3];
      if (k === 5) out.push(x, z, s * .9);
      else if (k === 7) out.push(x, z, .42 * s);
      else if (k === 6) for (const f of [-.38, 0, .38]) out.push(x + Math.cos(a) * f * 6 * s, z - Math.sin(a) * f * 6 * s, .3 * s);
    }
    return new Float32Array(out);
  }
  rebuild(cam) {
    this.dirty = false; this.last.set(cam.x, 0, cam.z);
    const P = this.plants.protos, nearR2 = this.nearR ** 2, midR2 = this.midR ** 2, cells = this.plants.atlas.cells;
    const nearN = new Int32Array(P.length), midN = new Int32Array(P.length), propN = new Int32Array(this.plants.props.length);
    const nT = P.map(p => p.im.nearT.instanceMatrix.array), mT = P.map(p => p.im.midT.instanceMatrix.array);
    const pA = this.plants.props.map(d => d.im.instanceMatrix.array), aP = this.aP.array, aC = this.aC.array;
    let far = 0;
    const capN = P[0].im.nearT.instanceMatrix.count, capM = P[0].im.midT.instanceMatrix.count;
    const pr = PROP_RANGE.map(f => (f * this.propR) ** 2);
    for (const ch of this.chunks.values()) {
      if (!ch.data) continue;
      const dc = Math.hypot((ch.cx + .5) * CHUNK - cam.x, (ch.cz + .5) * CHUNK - cam.z);
      if (dc - 46 > this.vegR) continue;
      const t = ch.data.trees, close = dc - 46 < this.midR;
      for (let i = 0; i < t.length; i += 6) {
        const x = t[i], y = t[i + 1], z = t[i + 2], k = t[i + 5], pi = KIND_PROTO[k];
        const d2 = close ? (x - cam.x) ** 2 + (z - cam.z) ** 2 : 1e12;
        if (d2 < nearR2 && nearN[pi] < capN) { setM(nT[pi], nearN[pi]++ * 16, x, y, z, t[i + 3], t[i + 4]); continue; }
        if (d2 < midR2 && midN[pi] < capM) { setM(mT[pi], midN[pi]++ * 16, x, y, z, t[i + 3], t[i + 4]); continue; }
        if (far < this.farCap) { const c = cells[pi], o = far * 4; aP[o] = x; aP[o + 1] = y; aP[o + 2] = z; aP[o + 3] = t[i + 4]; aC[o] = c.u; aC[o + 1] = c.v; aC[o + 2] = c.fw; aC[o + 3] = c.fh; far++; }
      }
      if (dc - 46 > this.propR * 3.2) continue;
      const p = ch.data.props;
      for (let i = 0; i < p.length; i += 6) {
        const k = p[i + 5], x = p[i], z = p[i + 2], d2 = (x - cam.x) ** 2 + (z - cam.z) ** 2;
        if (d2 > pr[k] || propN[k] >= this.propCap) continue;
        const s = p[i + 4];
        if (k === 4 || k === 5) setM(pA[k], propN[k]++ * 16, x, p[i + 1], z, p[i + 3], s, s * (.75 + .45 * ((x * 13.7) % 1 + 1) % 1), s * 1.1);
        else setM(pA[k], propN[k]++ * 16, x, p[i + 1], z, p[i + 3], s);
      }
    }
    const up = (m, n) => { m.count = n; m.instanceMatrix.clearUpdateRanges(); m.instanceMatrix.addUpdateRange(0, Math.max(16, n * 16)); m.instanceMatrix.needsUpdate = true; };
    P.forEach((p, i) => { up(p.im.nearT, nearN[i]); up(p.im.midT, midN[i]); if (p.im.nearF) up(p.im.nearF, nearN[i]); if (p.im.midF) up(p.im.midF, midN[i]); });
    // foliage shares the trunk's instance list
    P.forEach(p => { if (p.im.nearF) p.im.nearF.instanceMatrix.array.set(p.im.nearT.instanceMatrix.array.subarray(0, p.im.nearT.count * 16)); if (p.im.midF) p.im.midF.instanceMatrix.array.set(p.im.midT.instanceMatrix.array.subarray(0, p.im.midT.count * 16)); });
    this.plants.props.forEach((d, i) => up(d.im, propN[i]));
    const g = this.bb.geometry; g.instanceCount = far;
    for (const a of [this.aP, this.aC]) { a.clearUpdateRanges(); a.addUpdateRange(0, Math.max(4, far * 4)); a.needsUpdate = true; }
    this.counts = { near: nearN.reduce((a, b) => a + b, 0), mid: midN.reduce((a, b) => a + b, 0), far, props: propN.reduce((a, b) => a + b, 0) };
  }
  // circles near (x, z) the player cannot walk through: calls fn(cx, cz, r)
  near(x, z, rad, fn) {
    const c0 = Math.floor((x - rad - 2) / CHUNK), c1 = Math.floor((x + rad + 2) / CHUNK), d0 = Math.floor((z - rad - 2) / CHUNK), d1 = Math.floor((z + rad + 2) / CHUNK);
    for (let cz = d0; cz <= d1; cz++) for (let cx = c0; cx <= c1; cx++) {
      const ch = this.chunks.get(cx + ',' + cz); if (!ch || !ch.col) continue; const c = ch.col;
      for (let i = 0; i < c.length; i += 3) { const dx = c[i] - x, dz = c[i + 1] - z, rr = c[i + 2] + rad; if (dx * dx + dz * dz < rr * rr) fn(c[i], c[i + 1], c[i + 2]); }
    }
  }
  // placed things of the given kinds within r of (x, z)
  propsNear(x, z, r, kinds) { return this.scan(x, z, r, 'props', kinds); }
  treesNear(x, z, r, kinds) { return this.scan(x, z, r, 'trees', kinds); }
  scan(x, z, r, list, kinds) {
    const out = [], c0 = Math.floor((x - r) / CHUNK), c1 = Math.floor((x + r) / CHUNK), d0 = Math.floor((z - r) / CHUNK), d1 = Math.floor((z + r) / CHUNK);
    for (let cz = d0; cz <= d1; cz++) for (let cx = c0; cx <= c1; cx++) {
      const ch = this.chunks.get(cx + ',' + cz); if (!ch || !ch.data) continue; const p = ch.data[list];
      for (let i = 0; i < p.length; i += 6) if (kinds.includes(p[i + 5]) && (p[i] - x) ** 2 + (p[i + 2] - z) ** 2 < r * r) out.push({ x: p[i], z: p[i + 2], kind: p[i + 5], s: p[i + 4] });
    }
    return out;
  }
  progress(cam, r = 160) { let w = 0, h = 0; for (const ch of this.chunks.values()) { if (Math.hypot((ch.cx + .5) * CHUNK - cam.x, (ch.cz + .5) * CHUNK - cam.z) < r) { w++; if (ch.data) h++; } } return w ? h / w : 0; }
}
