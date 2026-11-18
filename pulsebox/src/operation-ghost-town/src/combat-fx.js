import * as T from 'three';
// Combat effects for every arena: tracers, muzzle light, impact dust and sparks, bullet holes, blood, explosions with
// fireballs, smoke and debris, and camera shake. Everything is pooled: two particle clouds (soft smoke and additive
// fire/sparks), a ring of tracer streaks and an instanced set of bullet holes, so a firefight costs a handful of draws.
const N_SOFT = 1400, N_HOT = 1200, N_TRACER = 48, N_HOLE = 160;
function softSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.45, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
function holeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  let r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(10,8,6,1)'); r.addColorStop(.22, 'rgba(18,14,10,.95)'); r.addColorStop(.42, 'rgba(60,52,40,.55)'); r.addColorStop(1, 'rgba(80,70,55,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(20,16,12,.55)'; g.lineWidth = 1.5; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.random() * .6; g.beginPath(); g.moveTo(32 + Math.cos(a) * 6, 32 + Math.sin(a) * 6); g.lineTo(32 + Math.cos(a) * (14 + Math.random() * 10), 32 + Math.sin(a) * (14 + Math.random() * 10)); g.stroke(); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
function cloud(n, additive, map) {
  const geo = new T.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 4), size = new Float32Array(n);
  geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 4)); geo.setAttribute('size', new T.BufferAttribute(size, 1));
  const mat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending, uniforms: { map: { value: map }, scale: { value: 600 } },
    vertexShader: 'attribute float size;attribute vec4 color;varying vec4 vC;uniform float scale;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=max(size*scale/max(.1,-mv.z),2.5);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform sampler2D map;varying vec4 vC;void main(){vec4 t=texture2D(map,gl_PointCoord);gl_FragColor=vec4(vC.rgb,vC.a*t.a);if(gl_FragColor.a<.004)discard;\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  const pts = new T.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = additive ? 6 : 5;
  return { pts, pos, col, size, n, list: [], geo };
}
export class CombatFX {
  constructor(world) {
    this.world = world; const scene = world.scene, map = softSprite();
    this.soft = cloud(N_SOFT, false, map); this.hot = cloud(N_HOT, true, map); scene.add(this.soft.pts, this.hot.pts);
    // tracers: thin glowing streaks
    this.tracerMat = new T.MeshBasicMaterial({ color: '#ffd28a', transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
    const tg = new T.BoxGeometry(1, 1, 1); tg.translate(0, 0, -.5);
    this.tracerGeo = tg; this.tracers = []; this.ti = 0;   // tracers are made the first time they are needed
    // bullet holes on walls and the ground
    this.holes = null; this.hi = 0;
    // a muzzle flash light and an explosion light, moved to wherever they are needed
    this.flashLight = new T.PointLight('#ffb35a', 0, 9, 2); scene.add(this.flashLight); this.flashT = 0;
    this.boomLight = new T.PointLight('#ff9a4a', 0, 34, 1.6); scene.add(this.boomLight); this.boomT = 0;
    this.shakeAmt = 0; this._v = new T.Vector3(); this._q = new T.Quaternion(); this._m = new T.Matrix4(); this._s = new T.Vector3();
    this.lastShot = new Map();
  }
  add(c, x, y, z, vx, vy, vz, r, g, b, a, size, life, o = {}) {
    if (c.list.length >= c.n) c.list.shift();
    c.list.push({ x, y, z, vx, vy, vz, r, g, b, a, size, life, max: life, grow: o.grow || 0, drag: o.drag ?? 1.8, grav: o.grav ?? 0, fade: o.fade ?? 1, rise: o.rise || 0 });
  }
  shake(a) { this.shakeAmt = Math.min(1.2, this.shakeAmt + a); }
  // where a shot went: e.origin (the muzzle) to e.point (what it hit)
  shot(e) {
    if (!e.origin || !e.point) return;
    const o = e.origin, p = e.point, dx = p.x - o.x, dy = p.y - o.y, dz = p.z - o.z, d = Math.hypot(dx, dy, dz) || 1, me = this.world.selfId === e.id;
    // tracer: start a little ahead of the muzzle so it doesn't sit in front of the player's eye
    if (this.tracers.length < N_TRACER) { const m = new T.Mesh(this.tracerGeo, this.tracerMat.clone()); m.visible = false; m.frustumCulled = false; this.world.scene.add(m); this.tracers.push({ m, life: 0, max: 1, from: new T.Vector3(), to: new T.Vector3() }); }
    const tr = this.tracers[this.ti = (this.ti + 1) % this.tracers.length], start = me ? 1.2 : .4;
    if (d > start + .5) { tr.from.set(o.x + dx / d * start, o.y + dy / d * start - (me ? .08 : 0), o.z + dz / d * start); tr.to.set(p.x, p.y, p.z); tr.life = tr.max = Math.min(.2, .06 + d / 700); tr.m.visible = true; }
    // muzzle light for other shooters close by
    if (!me) { this.flashLight.position.set(o.x, o.y, o.z); this.flashLight.intensity = 7; this.flashT = .06; for (let k = 0; k < 3; k++) this.add(this.hot, o.x, o.y, o.z, dx / d * 3 + (Math.random() - .5), dy / d * 3 + (Math.random() - .5), dz / d * 3 + (Math.random() - .5), 1, .75, .35, .9, .12 + Math.random() * .1, .07); }
    this.lastShot.set(e.id, { p, nx: -dx / d, ny: -dy / d, nz: -dz / d, t: performance.now() });
    // the impact: unless a hit event says it was a body, it is dust, sparks, chips and a hole
    this.pendingImpact = this.pendingImpact || []; this.pendingImpact.push({ id: e.id, p, nx: -dx / d, ny: -dy / d, nz: -dz / d, at: performance.now() });
  }
  impact(q) {
    const { p, nx, ny, nz } = q, ground = p.y < .15, surf = this.world.surfaceTone || [.62, .58, .5], far = Math.min(2.2, 1 + this.world.camera.position.distanceTo(this._v.set(p.x, p.y, p.z)) / 25);
    for (let k = 0; k < 7; k++) { const s = .6 + Math.random() * 1.6; this.add(this.soft, p.x + nx * .05, p.y + ny * .05, p.z + nz * .05, (nx + (Math.random() - .5) * .9) * s, (ny + Math.random() * .8) * s, (nz + (Math.random() - .5) * .9) * s, surf[0], surf[1], surf[2], .7, (.28 + Math.random() * .22) * far, .55 + Math.random() * .55, { grow: 1.1, drag: 3.2, grav: -.3 }); }
    for (let k = 0; k < 5; k++) { const s = 3 + Math.random() * 5; this.add(this.hot, p.x, p.y, p.z, (nx + (Math.random() - .5) * 1.4) * s, (ny + Math.random() * 1.2) * s, (nz + (Math.random() - .5) * 1.4) * s, 1, .78, .38, 1, (.05 + Math.random() * .04) * far, .2 + Math.random() * .22, { drag: 1, grav: 9.8 }); }
    for (let k = 0; k < 3; k++) { const s = 1.5 + Math.random() * 2; this.add(this.soft, p.x, p.y, p.z, (nx + (Math.random() - .5)) * s, (ny + Math.random()) * s + 1, (nz + (Math.random() - .5)) * s, surf[0] * .6, surf[1] * .6, surf[2] * .6, 1, .04, .6, { drag: .4, grav: 9.8 }); }
    // a hole, facing back along the shot (on the ground, facing up)
    const n = ground ? this._v.set(0, 1, 0) : this._v.set(nx, Math.abs(ny) > .9 ? ny : ny * .3, nz).normalize();
    this._q.setFromUnitVectors(new T.Vector3(0, 0, 1), n); const sc = .12 + Math.random() * .06; this._s.set(sc, sc, sc);
    this._m.compose(new T.Vector3(p.x + n.x * .012, ground ? .012 : p.y + n.y * .012, p.z + n.z * .012), this._q, this._s);
    if (!this.holes) { this.holes = new T.InstancedMesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: holeTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), N_HOLE); this.holes.count = 0; this.holes.frustumCulled = false; this.world.scene.add(this.holes); }
    this.holes.setMatrixAt(this.hi, this._m); this.hi = (this.hi + 1) % N_HOLE; this.holes.count = Math.min(N_HOLE, this.holes.count + 1); this.holes.instanceMatrix.needsUpdate = true;
  }
  // a body was hit: a red puff where the shot landed instead of dust
  hit(e) {
    const q = (this.pendingImpact || []).find(x => x.id === e.id) || this.lastShot.get(e.id); if (!q) return;
    if (this.pendingImpact) this.pendingImpact = this.pendingImpact.filter(x => x !== q);
    const p = q.p, head = !!e.head;
    for (let k = 0; k < (head ? 14 : 9); k++) { const s = .5 + Math.random() * 1.8; this.add(this.soft, p.x, p.y, p.z, (-q.nx + (Math.random() - .5)) * s, (Math.random() - .2) * s, (-q.nz + (Math.random() - .5)) * s, .55, .06, .05, .75, .1 + Math.random() * .14, .35 + Math.random() * .35, { grow: 1.4, drag: 4, grav: 1.5 }); }
    for (let k = 0; k < 6; k++) { const s = 2 + Math.random() * 3; this.add(this.soft, p.x, p.y, p.z, (-q.nx + (Math.random() - .5)) * s, Math.random() * s, (-q.nz + (Math.random() - .5)) * s, .45, .03, .03, 1, .035, .5, { drag: .5, grav: 9.8 }); }
    const a = this.world.avatars?.get(e.target); if (a) { a.userData.hitT = .18; a.userData.hitDir = Math.atan2(q.nx, q.nz); }
  }
  explosion(e) {
    const p = e.point; if (!p) return; const x = p.x, y = Math.max(.2, p.y), z = p.z;
    this.boomLight.position.set(x, y + 1.2, z); this.boomLight.intensity = 60; this.boomT = .9;
    // the fireball
    for (let k = 0; k < 36; k++) { const a = Math.random() * Math.PI * 2, u = Math.random(), s = 2 + Math.random() * 7; this.add(this.hot, x, y + .3, z, Math.cos(a) * s * (1 - u * .5), (1 + u * 3) * s * .6, Math.sin(a) * s * (1 - u * .5), 1, .55 + Math.random() * .3, .18, 1, .5 + Math.random() * .9, .25 + Math.random() * .35, { grow: 2.2, drag: 5, grav: -2 }); }
    for (let k = 0; k < 10; k++) this.add(this.hot, x + (Math.random() - .5), y + .2, z + (Math.random() - .5), 0, 1.5, 0, 1, .9, .6, 1, 1.4 + Math.random(), .18, { grow: 4, drag: 2 });
    // smoke column
    for (let k = 0; k < 34; k++) { const a = Math.random() * Math.PI * 2, s = Math.random() * 3.5, g = .05 + Math.random() * .07; this.add(this.soft, x + Math.cos(a) * .4, y + .3 + Math.random(), z + Math.sin(a) * .4, Math.cos(a) * s, 1.5 + Math.random() * 3.5, Math.sin(a) * s, g, g * .95, g * .9, .8, .7 + Math.random() * .9, 2.4 + Math.random() * 2.4, { grow: 1.6, drag: 1.4, rise: .8, fade: .7 }); }
    // dust ring along the ground
    for (let k = 0; k < 26; k++) { const a = k / 26 * Math.PI * 2, s = 7 + Math.random() * 4, t2 = this.world.surfaceTone || [.62, .58, .5]; this.add(this.soft, x, .25, z, Math.cos(a) * s, .3 + Math.random(), Math.sin(a) * s, t2[0], t2[1], t2[2], .6, .5 + Math.random() * .4, 1.2 + Math.random(), { grow: 1.8, drag: 3 }); }
    // sparks and chunks
    for (let k = 0; k < 40; k++) { const a = Math.random() * Math.PI * 2, s = 6 + Math.random() * 14; this.add(this.hot, x, y + .3, z, Math.cos(a) * s * .7, 4 + Math.random() * 10, Math.sin(a) * s * .7, 1, .7, .3, 1, .05 + Math.random() * .05, .6 + Math.random() * .7, { drag: .6, grav: 12 }); }
    for (let k = 0; k < 18; k++) { const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 8; this.add(this.soft, x, y + .3, z, Math.cos(a) * s * .6, 4 + Math.random() * 8, Math.sin(a) * s * .6, .16, .14, .12, 1, .08 + Math.random() * .08, 1.1 + Math.random() * .6, { drag: .3, grav: 14 }); }
    const cam = this.world.camera.position, d = Math.hypot(cam.x - x, cam.z - z); this.shake(Math.max(0, 1 - d / 40) * 1.1);
  }
  // red smoke where an artillery strike is about to land
  strikeMarker(p) {
    if (!p) return; for (let k = 0; k < 40; k++) this.add(this.soft, p.x + (Math.random() - .5) * .6, .2 + Math.random() * .3, p.z + (Math.random() - .5) * .6, (Math.random() - .5) * .8, 1.2 + Math.random() * 1.6, (Math.random() - .5) * .8, .85, .12, .1, .75, .35 + Math.random() * .3, 2.5 + Math.random() * 1.8, { grow: 2.2, drag: .8, rise: .3, fade: .6 });
    this.strikeAt = { p, t: 2.2 };
  }
  update(dt) {
    const now = performance.now();
    // shots with no body hit within a moment become surface impacts
    if (this.pendingImpact) { for (let i = this.pendingImpact.length - 1; i >= 0; i--) { const q = this.pendingImpact[i]; if (now - q.at > 30) { this.impact(q); this.pendingImpact.splice(i, 1); } } }
    for (const c of [this.soft, this.hot]) {
      const L = c.list; let w = 0;
      for (let i = 0; i < L.length; i++) {
        const q = L[i]; q.life -= dt; if (q.life <= 0) continue;
        const k = Math.exp(-q.drag * dt); q.vx *= k; q.vz *= k; q.vy = q.vy * k - q.grav * dt + q.rise * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; if (q.y < .02 && q.grav > 0) { q.y = .02; q.vy *= -.25; q.vx *= .5; q.vz *= .5; }
        L[w++] = q; const f = q.life / q.max, j = (w - 1);
        c.pos[j * 3] = q.x; c.pos[j * 3 + 1] = q.y; c.pos[j * 3 + 2] = q.z;
        c.col[j * 4] = q.r; c.col[j * 4 + 1] = q.g; c.col[j * 4 + 2] = q.b; c.col[j * 4 + 3] = q.a * Math.min(1, f * 2.2) ** q.fade;
        c.size[j] = q.size * (1 + q.grow * (1 - f));
      }
      L.length = w; c.geo.setDrawRange(0, w);
      c.geo.attributes.position.needsUpdate = true; c.geo.attributes.color.needsUpdate = true; c.geo.attributes.size.needsUpdate = true;
    }
    const s = innerHeight * Math.min(2, devicePixelRatio || 1) * .5 / Math.tan(this.world.camera.fov * Math.PI / 360); this.soft.pts.material.uniforms.scale.value = s; this.hot.pts.material.uniforms.scale.value = s;
    for (const tr of this.tracers) {
      if (!tr.m.visible) continue; tr.life -= dt; if (tr.life <= 0) { tr.m.visible = false; continue; }
      const f = 1 - tr.life / tr.max, head = this._v.copy(tr.from).lerp(tr.to, Math.min(1, f * 1.6)), tail = new T.Vector3().copy(tr.from).lerp(tr.to, Math.max(0, f * 1.6 - .45));
      const len = head.distanceTo(tail); if (len < .01) { tr.m.visible = false; continue; }
      tr.m.position.copy(tail); tr.m.lookAt(head); tr.m.rotateY(Math.PI); tr.m.scale.set(.03, .03, len); tr.m.material.opacity = .85 * (1 - f * .5);
    }
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.flashLight.intensity = 0; }
    if (this.boomT > 0) { this.boomT -= dt; this.boomLight.intensity = Math.max(0, this.boomT / .9) ** 2 * 60; }
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.6);
    if (this.strikeAt) { this.strikeAt.t -= dt; const p = this.strikeAt.p; if (Math.random() < dt * 30) this.add(this.soft, p.x + (Math.random() - .5) * .4, .2, p.z + (Math.random() - .5) * .4, (Math.random() - .5) * .5, 1.5 + Math.random(), (Math.random() - .5) * .5, .85, .14, .1, .7, .4, 2.4, { grow: 2, drag: .8, rise: .3, fade: .6 }); if (this.strikeAt.t <= 0) this.strikeAt = null; }
  }
  dispose() {
    for (const c of [this.soft, this.hot]) { this.world.scene.remove(c.pts); c.geo.dispose(); c.pts.material.dispose(); }
    for (const tr of this.tracers) { this.world.scene.remove(tr.m); tr.m.material.dispose(); }
    this.tracerGeo.dispose(); this.world.scene.remove(this.flashLight, this.boomLight); if (this.holes) { this.world.scene.remove(this.holes); this.holes.geometry.dispose(); this.holes.material.map.dispose(); this.holes.material.dispose(); }
  }
}
