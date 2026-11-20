// Bear dens: caves in wooded hillsides deep in the forest, each the home of one or two grizzlies that will defend it to
// the death. Where they are comes from the world (World.denSite: one at most in each 520 m square). Each is built as
// you come within a few hundred metres and taken down again as you leave: a dome of rough rock sunk back into the slope,
// a dark mouth at its foot framed by boulders, gnawed bones scattered down the hill in front.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const CELL = 520, R = 9, H = 6.2, BUILD = 600, DROP = 800;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class Dens {
  constructor(scene, world, tex) {
    this.scene = scene; this.world = world; this.sites = new Map(); this.cleared = new Set(); this.onFound = null; this.t = 0;
    this.rockM = new THREE.MeshStandardMaterial({ map: tex.rock, normalMap: tex.rockN, roughness: .95, metalness: 0, vertexColors: true });
    this.voidM = new THREE.MeshBasicMaterial({ color: 0x020202 });
    this.boneM = new THREE.MeshStandardMaterial({ color: 0xcfc4a6, roughness: .8 });
  }
  // the den in a 520 m square, if there is one (what has happened there is kept here)
  siteIn(i, j) {
    const key = i + ',' + j; if (this.sites.has(key)) return this.sites.get(key);
    const b = this.world.denSite(i, j), site = b ? { ...b, found: false, group: null, mesh: null, cleared: this.cleared.has(key) } : null;
    this.sites.set(key, site); return site;
  }
  near(x, z, r, fn) {
    const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL), j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const s = this.siteIn(i, j); if (s && Math.hypot(s.x - x, s.z - z) < r) fn(s); }
  }
  // the rock is solid: you cannot walk into the dome (the mouth lets you a step or two in)
  collide(x, z, r, push) { this.near(x, z, R + 6, s => push({ t: 'c', x: s.x, z: s.z, r: R * .8 })); }
  update(dt, pos) {
    this.t -= dt; if (this.t > 0) return; this.t = .5;
    this.near(pos.x, pos.z, BUILD, s => { if (!s.mesh) this.build(s); });
    for (const s of this.sites.values()) if (s && s.mesh && Math.hypot(s.x - pos.x, s.z - pos.z) > DROP) {
      const b = s.mesh.userData.bones; this.scene.remove(s.mesh); this.scene.remove(b);
      for (const o of [s.mesh, b]) o.traverse(q => { if (q.geometry) q.geometry.dispose(); }); s.mesh = null;
    }
    this.near(pos.x, pos.z, 90, s => { if (!s.found) { s.found = true; if (this.onFound) this.onFound(s); } });
  }
  build(s) {
    const g = new THREE.Group(), w = this.world, rnd = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(s.id % 2147483646 + 1);
    // the dome: rough, with a deep skirt into the ground, and a hollow pressed into the front for the mouth
    const geo = new THREE.IcosahedronGeometry(1, 4), P = geo.attributes.position, v = new THREE.Vector3(), ph = [rnd() * 6, rnd() * 6, rnd() * 6];
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i); const d = v.clone().normalize();
      const bump = 1 + .13 * Math.sin(d.x * 5 + ph[0]) * Math.sin(d.z * 4 + ph[1]) + .07 * Math.sin(d.y * 9 + d.x * 7 + ph[2]);
      let x = d.x * R * bump, y = d.y > 0 ? d.y * H * bump : d.y * H * .5, z = d.z * R * bump;
      const m = smooth(.3, .72, d.z) * (1 - smooth(.4, .68, d.y)) * (1 - smooth(.36, .62, Math.abs(d.x)));   // the mouth
      z -= m * R * .5; y *= 1 - m * .2; P.setXYZ(i, x, y, z);
    }
    const sm = mergeVertices(geo, 1e-3), Q = sm.attributes.position, C = new Float32Array(Q.count * 3);
    for (let i = 0; i < Q.count; i++) {   // soot-dark round the opening, earthy low down
      v.fromBufferAttribute(Q, i); const d = v.clone().normalize(), m = smooth(.3, .72, d.z) * (1 - smooth(.4, .68, d.y)) * (1 - smooth(.36, .62, Math.abs(d.x)));
      const dark = 1 - .78 * smooth(.15, .7, m * 1.4) - .15 * Math.max(0, -d.y); C[i * 3] = dark * .92; C[i * 3 + 1] = dark * .9; C[i * 3 + 2] = dark * .86;
    }
    sm.setAttribute('color', new THREE.BufferAttribute(C, 3));
    const uv = sm.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 9, uv.getY(i) * 6);   // (fine enough to read as rough rock)
    sm.computeVertexNormals();
    const mound = new THREE.Mesh(sm, this.rockM); mound.castShadow = true; mound.receiveShadow = true; g.add(mound);
    const hole = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), this.voidM); hole.scale.set(3.1, 2.5, 2.6); hole.position.set(0, 1.9, R * .4); g.add(hole);
    // boulders framing the mouth, one laid across the top, and a couple tumbled to either side
    const stone = (sx, sy, sz, x, y, z, ry) => {
      const sg = new THREE.DodecahedronGeometry(1, 1), sp = sg.attributes.position;
      for (let i = 0; i < sp.count; i++) { v.fromBufferAttribute(sp, i); const k = .82 + rnd() * .3; sp.setXYZ(i, v.x * k, v.y * k, v.z * k); }
      sg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sp.count * 3).fill(.8), 3)); sg.computeVertexNormals();
      const b = new THREE.Mesh(sg, this.rockM); b.scale.set(sx, sy, sz); b.position.set(x, y, z); b.rotation.set(rnd() * .4, ry, rnd() * .4); b.castShadow = true; b.receiveShadow = true; g.add(b);
    };
    stone(1.7, 2.2, 1.6, -3.3, 1.3, R * .64, rnd()); stone(1.8, 2.4, 1.6, 3.4, 1.4, R * .62, rnd()); stone(3.6, 1.1, 1.5, 0, 3.85, R * .6, .1);
    stone(1.2, .9, 1.1, -5.4, .4, R * .52, rnd()); stone(1.0, .8, 1.0, 5.2, .3, R * .5, rnd());
    g.position.set(s.x, s.h, s.z); g.rotation.y = s.yaw; this.scene.add(g);
    // gnawed bones and a skull down the slope in front (laid on the ground itself)
    const bones = new THREE.Group(); this.scene.add(bones); g.userData.bones = bones;
    for (let k = 0; k < 9; k++) {
      const a = (rnd() - .5) * 1.4, r = R + 1 + rnd() * 5, bx = s.x + Math.sin(s.yaw + a) * r, bz = s.z + Math.cos(s.yaw + a) * r, by = w.height(bx, bz), skull = k === 0;
      const m = skull ? new THREE.Mesh(new THREE.SphereGeometry(.24, 10, 8), this.boneM) : new THREE.Mesh(new THREE.CylinderGeometry(.05 + rnd() * .03, .04, .5 + rnd() * .6, 6), this.boneM);
      if (skull) m.scale.set(1, .8, 1.3); m.position.set(bx, by + (skull ? .16 : .05), bz); m.rotation.set(skull ? 0 : Math.PI / 2, rnd() * 6, rnd() * .4); m.castShadow = true; bones.add(m);
    }
    s.mesh = g;
  }
  // one of each material, for the loading screen to compile their shaders before play
  warm() {
    const g = new THREE.Group(), geo = new THREE.IcosahedronGeometry(.3, 1); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
    const r = new THREE.Mesh(geo, this.rockM); r.castShadow = true; r.receiveShadow = true; g.add(r);
    const v = new THREE.Mesh(new THREE.SphereGeometry(.2, 6, 4), this.voidM); v.position.x = .7; g.add(v);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .4, 6), this.boneM); b.position.x = -.7; b.castShadow = true; g.add(b); return g;
  }
  save() { return [...this.cleared]; }
  load(list) { if (Array.isArray(list)) for (const k of list) this.cleared.add(String(k)); }
  clear(site) { site.cleared = true; this.cleared.add(site.key); }
}
