// The guns: a brass-framed lever-action rifle and a side-by-side double shotgun with exposed hammers, held in coat
// sleeves and leather gloves. Right mouse (or the touch aim button) brings the sights up; left mouse fires. Shots are
// traced through the world: hills and tree trunks stop them before an animal does. Ammunition is limited.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function mats(tex) {
  return {
    steel: new THREE.MeshStandardMaterial({ color: 0x20232a, metalness: .85, roughness: .32 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb08a3e, metalness: .9, roughness: .3 }),
    case: new THREE.MeshStandardMaterial({ color: 0x5a5650, metalness: .8, roughness: .38 }),
    wood: new THREE.MeshStandardMaterial({ map: tex.wood2.map, normalMap: tex.wood2.normalMap, color: 0xb07850, roughness: .5, metalness: 0 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x3a3026, roughness: .95 }),
    glove: new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: .7 }),
  };
}
const cyl = (r0, r1, len, m, seg = 12) => { const g = new THREE.CylinderGeometry(r1, r0, len, seg).rotateX(-Math.PI / 2); return new THREE.Mesh(g, m); };
const bx = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
// a stock from a side profile (y up, z back), extruded across
function stock(pts, depth, m) {
  const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -depth / 2); g.rotateY(-Math.PI / 2); // profile z -> world z, extrusion -> x
  const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i) * 2.2, p.getY(i) * 2.2 + p.getX(i));
  return new THREE.Mesh(g, m);
}
function arms(M, left = true) {
  const g = new THREE.Group();
  const rs = cyl(.05, .045, .38, M.sleeve, 10); rs.position.set(.02, -.07, .2); rs.rotation.x = .25; g.add(rs);
  const rh = new THREE.Mesh(new THREE.SphereGeometry(.04, 10, 8), M.glove); rh.scale.set(1, .9, 1.5); rh.position.set(0, -.03, .045); g.add(rh);
  if (left) {
    const ls = cyl(.048, .044, .42, M.sleeve, 10); ls.position.set(-.08, -.1, -.08); ls.rotation.set(.5, -.5, 0); g.add(ls); g.userData.left = ls;
    const lh = new THREE.Mesh(new THREE.SphereGeometry(.038, 10, 8), M.glove); lh.scale.set(1.2, .8, 1.5); lh.position.set(-.01, -.035, -.27); g.add(lh); g.userData.leftHand = lh;
  }
  return g;
}
function rifleModel(M) {
  const g = new THREE.Group();
  const barrel = cyl(.0115, .0105, .6, M.steel, 8); barrel.position.set(0, 0, -.42); g.add(barrel);
  const mag = cyl(.0085, .0085, .5, M.steel, 10); mag.position.set(0, -.021, -.38); g.add(mag);
  for (const z of [-.66, -.3]) { const band = new THREE.Mesh(new THREE.TorusGeometry(.017, .003, 4, 12), M.steel); band.position.set(0, -.01, z); band.scale.y = 1.2; g.add(band); }
  const fore = stock([[-.12, -.012], [-.34, -.012], [-.35, -.03], [-.33, -.042], [-.13, -.042]], .036, M.wood); g.add(fore);
  const rec = bx(.034, .06, .17, M.brass); rec.position.set(0, -.012, -.04); g.add(rec);
  const plate = bx(.036, .04, .1, M.steel); plate.position.set(0, -.005, -.02); plate.scale.set(1, 1, 1); g.add(plate);
  const hammer = bx(.007, .02, .012, M.steel); hammer.position.set(0, .016, .05); hammer.rotation.x = -.7; g.add(hammer);
  const lever = new THREE.Group(); lever.position.set(0, -.04, .02); g.add(lever);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(.03, .004, 5, 14, Math.PI * 1.3), M.steel); loop.rotation.y = Math.PI / 2; loop.position.set(0, -.03, .045); lever.add(loop);
  const bar = bx(.006, .006, .09, M.steel); bar.position.set(0, -.004, .0); lever.add(bar);
  const st = stock([[.04, .012], [.12, -.005], [.36, -.05], [.37, -.13], [.33, -.135], [.12, -.06], [.04, -.045]], .036, M.wood); g.add(st);
  const butt = bx(.04, .09, .008, M.steel); butt.position.set(0, -.09, .372); butt.rotation.x = .1; g.add(butt);
  const front = bx(.0035, .03, .006, M.brass); front.position.set(0, .022, -.71); g.add(front);
  for (const x of [-.0065, .0065]) { const rear = bx(.008, .026, .004, M.steel); rear.position.set(x, .021, -.3); g.add(rear); }
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -.73); g.add(muzzle);
  return { group: g, lever, muzzle, hammer, sightY: .035 };
}
function shotgunModel(M) {
  const g = new THREE.Group(), barrels = new THREE.Group(); g.add(barrels);
  for (const x of [-.0125, .0125]) { const b = cyl(.0135, .0125, .68, M.steel, 14); b.position.set(x, 0, -.4); barrels.add(b); }
  const rib = bx(.01, .006, .66, M.steel); rib.position.set(0, .012, -.4); barrels.add(rib);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(.0032, 6, 4), M.brass); bead.position.set(0, .019, -.73); barrels.add(bead);
  const fore = stock([[-.1, -.012], [-.3, -.012], [-.3, -.03], [-.1, -.035]], .044, M.wood); barrels.add(fore);
  const rec = bx(.05, .055, .12, M.case); rec.position.set(0, -.01, -.02); g.add(rec);
  for (const x of [-.016, .016]) { const h = bx(.006, .022, .012, M.case); h.position.set(x, .016, .05); h.rotation.x = -.6; g.add(h); }
  const guard = new THREE.Mesh(new THREE.TorusGeometry(.025, .003, 4, 12, Math.PI), M.steel); guard.rotation.y = Math.PI / 2; guard.rotation.z = Math.PI; guard.position.set(0, -.04, .02); g.add(guard);
  const st = stock([[.04, .02], [.14, -.01], [.38, -.045], [.39, -.13], [.35, -.135], [.14, -.065], [.04, -.04]], .04, M.wood); g.add(st);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -.75); barrels.add(muzzle);
  barrels.position.set(0, 0, 0);
  return { group: g, barrels, muzzle, sightY: .022 };
}

export const GUNS = {
  rifle: { name: 'Lever-action rifle', ammoName: 'cartridges', mag: 8, fov: 38, cycle: .62, reloadEach: .55, pellets: 1, spread: 0, range: 320, power: 1, kick: .045 },
  shotgun: { name: 'Double shotgun', ammoName: 'shells', mag: 2, fov: 56, cycle: .22, reloadEach: .8, pellets: 9, spread: .035, range: 55, power: .4, kick: .07 },
};

export class Weapons {
  constructor(camera, tex, glow) {
    this.cam = camera; this.M = mats(tex);
    this.root = new THREE.Group(); camera.add(this.root);
    const r = rifleModel(this.M), s = shotgunModel(this.M);
    this.models = { rifle: r, shotgun: s };
    for (const [k, m] of Object.entries(this.models)) { const h = new THREE.Group(); h.add(m.group); h.add(arms(this.M)); m.holder = h; h.visible = false; this.root.add(h); m.group.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 10; } }); }
    this.current = null; this.want = null; this.raise = 0; this.ads = 0; this.kick = 0; this.cool = 0; this.reloading = 0; this.reloadT = 0; this.lever = 0; this.breakOpen = 0; this.sway = 0;
    this.ammo = { rifle: 8, shotgun: 2 }; this.reserve = { rifle: 32, shotgun: 16 };
    // muzzle flash and smoke
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 })); this.flash.renderOrder = 12; this.flash.scale.setScalar(.18); this.root.add(this.flash);
    this.flashLight = new THREE.PointLight(0xffa050, 0, 18, 2); this.root.add(this.flashLight);
    this.puffs = []; this.glow = glow;
  }
  select(k) { if (k === this.current && k) return; this.want = k; }
  update(dt, input, ctx) {
    // switching: lower, swap, raise
    if (this.want !== this.current) { this.raise -= dt * 4; this.ads = 0; if (this.raise <= 0) { this.raise = 0; if (this.current) this.models[this.current].holder.visible = false; this.current = this.want; this.reloading = 0; if (this.current) this.models[this.current].holder.visible = true; } }
    else if (this.current) this.raise = Math.min(1, this.raise + dt * 3);
    const g = this.current && GUNS[this.current], m = this.current && this.models[this.current];
    this.cool -= dt; this.kick *= Math.pow(.0005, dt); this.lever = Math.max(0, this.lever - dt * 2.2);
    if (!g) { ctx.setFov(72); return; }
    const aimHeld = (input.mouseDown[2] || input.touchAim) && !this.reloading && this.raise > .9;
    this.ads += ((aimHeld ? 1 : 0) - this.ads) * Math.min(1, dt * 11);
    // reload
    if ((input.hit('KeyR') || (this.ammo[this.current] === 0 && this.reserve[this.current] > 0 && this.cool < -.3)) && !this.reloading && this.ammo[this.current] < g.mag && this.reserve[this.current] > 0) { this.reloading = 1; this.reloadT = g.reloadEach * (this.current === 'shotgun' ? 1.6 : 1); ctx.sound('reload'); }
    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const k = this.current, n = k === 'shotgun' ? Math.min(g.mag - this.ammo[k], this.reserve[k]) : 1;
        this.ammo[k] += n; this.reserve[k] -= n; ctx.sound('load');
        if (this.ammo[k] >= g.mag || this.reserve[k] <= 0 || k === 'shotgun') this.reloading = 0; else this.reloadT = g.reloadEach;
      }
      if (input.clicked.has(0) && this.ammo[this.current] > 0 && this.current === 'rifle') this.reloading = 0;
    }
    // fire
    const trig = input.clicked.has(0) || input.touchFire;
    if (trig && this.raise > .9 && !this.reloading && this.cool <= 0) {
      if (this.ammo[this.current] <= 0) { ctx.sound('click'); this.cool = .3; }
      else { this.ammo[this.current]--; this.cool = g.cycle; this.fire(g, ctx); if (this.current === 'rifle') this.lever = 1; }
    }
    // pose: hip -> sights, with breathing sway, walk bob and recoil
    this.sway += dt; const bob = ctx.bob, ph = ctx.phase, a = this.ads, low = 1 - this.raise, rl = this.reloading ? 1 : 0;
    const hip = V(.14, -.16, -.32), aim = V(0, -m.sightY, -.17);
    const p = hip.lerp(aim, a);
    p.x += Math.sin(ph) * .01 * bob * (1 - a * .8) + Math.sin(this.sway * .9) * .002 * (1 - a * .5);
    p.y += -Math.abs(Math.cos(ph)) * .012 * bob * (1 - a * .8) + Math.sin(this.sway * 1.3) * .0025 - low * .35 - rl * .06;
    p.z += this.kick * .09;
    m.holder.position.copy(p);
    m.holder.rotation.set(this.kick * .5 + rl * .5 + low * .6, (1 - a) * .05, (1 - a) * .05 + rl * .35);
    if (m.lever) m.lever.rotation.x = Math.sin(Math.min(1, this.lever) * Math.PI) * .9;
    if (m.barrels) { const open = this.reloading ? Math.min(1, (1 - this.reloadT / (g.reloadEach * 1.6)) * 3) * (this.reloadT > .15 ? 1 : this.reloadT / .15) : 0; m.barrels.rotation.x = open * .45; }
    m.holder.children[1].visible = a < .55;
    ctx.setFov(72 + (g.fov - 72) * a);
    // flash and smoke
    this.flash.material.opacity = Math.max(0, this.flash.material.opacity - dt * 22); this.flashLight.intensity = Math.max(0, this.flashLight.intensity - dt * 900);
    for (const s of this.puffs) { s.userData.t += dt; const k = s.userData.t / 2.2; s.position.addScaledVector(s.userData.v, dt); s.userData.v.multiplyScalar(Math.pow(.3, dt)); s.userData.v.y += dt * .25; s.scale.setScalar(.3 + k * 2.2); s.material.opacity = Math.max(0, .35 * (1 - k)); if (k >= 1) { s.parent && s.parent.remove(s); s.userData.dead = true; } }
    this.puffs = this.puffs.filter(s => !s.userData.dead);
  }
  fire(g, ctx) {
    const m = this.models[this.current];
    this.kick = 1; ctx.recoil(g.kick * (1 - this.ads * .35));
    m.muzzle.updateMatrixWorld(true); const mp = new THREE.Vector3(); m.muzzle.getWorldPosition(mp);
    this.root.worldToLocal(this.flash.position.copy(mp)); this.flash.material.opacity = 1; this.flash.material.rotation = Math.random() * 6; this.flashLight.position.copy(this.flash.position); this.flashLight.intensity = 60;
    const dir = new THREE.Vector3(); this.cam.getWorldDirection(dir);
    for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx.puff, color: 0xc8c4bc, transparent: true, depthWrite: false, opacity: .35 })); s.position.copy(mp); s.userData = { t: 0, v: dir.clone().multiplyScalar(1.5 + i * 1.2).add(V(0, .2, 0)) }; ctx.scene.add(s); this.puffs.push(s); }
    ctx.sound('shot', this.current);
    // trace each pellet; a hip shot is a little looser than an aimed one
    const spread = g.spread + (1 - this.ads) * (this.current === 'rifle' ? .012 : .02);
    const o = this.cam.getWorldPosition(new THREE.Vector3());
    for (let k = 0; k < g.pellets; k++) {
      const d = dir.clone(); if (spread) { d.x += (Math.random() - .5) * spread * 2; d.y += (Math.random() - .5) * spread * 2; d.z += (Math.random() - .5) * spread * 2; d.normalize(); }
      ctx.trace(o, d, g.range, g.power, k === 0);
    }
  }
  get label() { if (!this.current) return ''; const g = GUNS[this.current]; return `${g.name}  ${this.ammo[this.current]} / ${this.reserve[this.current]}`; }
}
