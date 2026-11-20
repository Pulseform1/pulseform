// The guns, held in coat sleeves and leather gloves: a bolt-action long rifle with a telescopic sight, a pump shotgun,
// a side-by-side double barrel and a single-action revolver; and the fishing rod (fishing.js drives it).
// Right mouse (or the touch aim button) brings the sights up: each gun is set so its sight line runs straight down the
// middle of the view, and an aimed shot goes exactly along that line (if the sights sway, the shot sways with them).
// The long rifle's scope fills the view with its own picture; the wheel changes its power and Shift steadies your breath.
// Shots are traced through the world: hills and trunks stop them before an animal does. Ammunition is bought at camp.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function mats(tex) {
  return {
    steel: new THREE.MeshStandardMaterial({ color: 0x1c1f25, metalness: .88, roughness: .3 }),
    blued: new THREE.MeshStandardMaterial({ color: 0x141a28, metalness: .9, roughness: .24 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb08a3e, metalness: .92, roughness: .28 }),
    case: new THREE.MeshStandardMaterial({ color: 0x5c5850, metalness: .82, roughness: .36 }),
    wood: new THREE.MeshStandardMaterial({ map: tex.wood2.map, normalMap: tex.wood2.normalMap, color: 0xb07850, roughness: .46, metalness: 0 }),
    darkwood: new THREE.MeshStandardMaterial({ map: tex.wood2.map, normalMap: tex.wood2.normalMap, color: 0x7a4a2c, roughness: .5, metalness: 0 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x3a3026, roughness: .95 }),
    glove: new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: .7 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x102a3a, metalness: 1, roughness: .05, emissive: 0x0a1820, emissiveIntensity: .4 }),
    black: new THREE.MeshStandardMaterial({ color: 0x060606, roughness: .9 }),
    // fiber-optic sight inserts: unlit, so they read in shade and at dusk; green at the back, orange at the front
    fiberR: new THREE.MeshBasicMaterial({ color: 0x5dff7a }), fiberF: new THREE.MeshBasicMaterial({ color: 0xff8a1a }),
    cork: new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: .9 }),
    line: new THREE.LineBasicMaterial({ color: 0xe8e4d8, transparent: true, opacity: .7 }),
  };
}
const cyl = (r0, r1, len, m, seg = 14) => { const g = new THREE.CylinderGeometry(r1, r0, len, seg).rotateX(-Math.PI / 2); return new THREE.Mesh(g, m); };
const bx = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
// a stock from a side profile (y up, z back), extruded across
function stock(pts, depth, m) {
  const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 3, curveSegments: 8 });
  g.translate(0, 0, -depth / 2); g.rotateY(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i) * 2.2, p.getY(i) * 2.2 + p.getX(i));
  return new THREE.Mesh(g, m);
}
// a turned part from [z, radius] pairs, along -z
function lathe(prof, m, seg = 18) { const g = new THREE.LatheGeometry(prof.map(([z, r]) => new THREE.Vector2(r, z)), seg).rotateX(Math.PI / 2); return new THREE.Mesh(g, m); }   // (+90 degrees keeps the profile's z running forward, down -z)
// coat sleeves and gloved hands: right on the grip at `rh`, left under the fore-end at `lh` (null: one hand)
function arms(M, rh, lh) {
  const g = new THREE.Group();
  const limb = (hand, shoulder, r0, r1) => { const d = V().subVectors(shoulder, hand), s = cyl(r1, r0, d.length(), M.sleeve, 12); s.position.copy(hand).addScaledVector(d, .5); s.lookAt(hand); g.add(s); return s; };
  const fist = (p, sx) => { const h = new THREE.Mesh(new THREE.SphereGeometry(.038, 12, 10), M.glove); h.scale.set(sx, .92, 1.45); h.position.copy(p); g.add(h); const cuff = cyl(.046, .044, .05, M.glove, 12); cuff.position.copy(p).add(V(0, -.005, .07)); g.add(cuff); return h; };
  fist(rh, 1); limb(rh.clone().add(V(0, -.01, .08)), V(.16, -.32, .55), .046, .056);
  if (lh) { g.userData.leftHand = fist(lh, 1.15); g.userData.left = limb(lh.clone().add(V(0, -.012, .07)), V(-.22, -.34, .42), .044, .054); }
  return g;
}

function longRifle(M) {
  const g = new THREE.Group();
  // barrel: heavy, tapering, with a crowned muzzle
  g.add(at(lathe([[-.06, .0145], [-.25, .0135], [-.6, .011], [-.84, .0102], [-.845, .0085]], M.blued, 16), 0, 0, 0));
  g.add(at(cyl(.017, .017, .21, M.blued, 18), 0, 0, -.05));                       // receiver
  g.add(at(bx(.03, .012, .1, M.blued), 0, -.014, -.06));
  const bolt = new THREE.Group(); at(bolt, 0, 0, .04); g.add(bolt);                  // the bolt: lifts, draws back, runs home, turns down
  bolt.add(at(cyl(.0105, .0105, .12, M.steel, 12), 0, 0, -.02));
  const arm = at(cyl(.0045, .0045, .055, M.steel, 8), .03, 0, 0); arm.rotation.y = Math.PI / 2; bolt.add(arm);
  bolt.add(at(new THREE.Mesh(new THREE.SphereGeometry(.0105, 12, 10), M.steel), .058, 0, 0));
  g.add(at(bx(.008, .02, .012, M.steel), 0, -.028, .045));                          // trigger
  const guard = new THREE.Mesh(new THREE.TorusGeometry(.024, .003, 6, 16, Math.PI), M.steel); guard.rotation.set(0, Math.PI / 2, Math.PI); at(guard, 0, -.03, .045); g.add(guard);
  g.add(stock([[-.12, -.004], [-.56, -.004], [-.57, -.02], [-.55, -.034], [-.12, -.04]], .042, M.darkwood));
  g.add(stock([[.02, .01], [.1, .012], [.16, -.004], [.4, -.03], [.42, -.13], [.38, -.14], [.17, -.074], [.12, -.1], [.06, -.098], [.04, -.04]], .04, M.darkwood));
  g.add(at(bx(.044, .1, .01, M.black), 0, -.085, .422));                            // butt plate
  // the telescope: rings, a long tube, the eyepiece and objective bells, two turrets
  const SY = .058;
  g.add(at(lathe([[.0, .019], [-.04, .018], [-.06, .0145], [-.3, .0145], [-.34, .021], [-.39, .022], [-.395, .02]], M.blued, 24), 0, SY, -.02));
  for (const z of [-.1, -.26]) { g.add(at(bx(.012, SY - .012, .014, M.blued), 0, SY / 2, z)); g.add(at(cyl(.017, .017, .016, M.blued, 16), 0, SY, z)); }
  g.add(at(cyl(.009, .009, .016, M.blued, 12), 0, SY + .02, -.18)); const tr = at(cyl(.009, .009, .016, M.blued, 12), .02, SY, -.18); tr.rotation.y = Math.PI / 2; g.add(tr);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(.0195, 24), M.glass); at(lens, 0, SY, -.414); lens.rotation.y = Math.PI; g.add(lens);
  const eye = new THREE.Mesh(new THREE.CircleGeometry(.017, 20), M.glass); at(eye, 0, SY, -.019); g.add(eye);
  const muzzle = at(new THREE.Object3D(), 0, 0, -.85); g.add(muzzle);
  return { group: g, bolt, muzzle, rear: V(0, SY, -.02), front: V(0, SY, -.41), adsZ: -.02, rh: V(0, -.05, .07), lh: V(-.005, -.04, -.36), hip: V(.14, -.16, -.3) };
}
// sights that stand clear of the gun, so the sight picture is open: a rear blade (or ghost ring) and a front post, each
// with fiber-optic dots; returns the height of the sight line
function frontPost(g, M, z, base, top, r = .0072) {
  g.add(at(bx(r * 1.3, top - base, .01, M.steel), 0, (top + base) / 2, z));
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), M.fiberF), 0, top, z + .003));   // on the shooter's side of the post
}
function rearBlade(g, M, z, base, top, gap = .007, r = .0034) {
  for (const x of [-1, 1]) { g.add(at(bx(.009, top - base + .004, .006, M.steel), x * (gap / 2 + .0045), (top + base) / 2, z)); g.add(at(new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), M.fiberR), x * (gap / 2 + .0045), top - .003, z + .0035)); }
  g.add(at(bx(gap + .018, .004, .008, M.steel), 0, base + .002, z));
}
function ghostRing(g, M, z, base, y) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.0085, .0022, 8, 22), M.steel); at(ring, 0, y, z); g.add(ring);
  for (const x of [-1, 1]) g.add(at(bx(.003, y - base, .006, M.steel), x * .0085, (y + base) / 2 - .004, z));
  for (const a of [-.6, Math.PI + .6]) g.add(at(new THREE.Mesh(new THREE.SphereGeometry(.0011, 8, 6), M.fiberR), Math.cos(a) * .0085, y + Math.sin(a) * .0085, z + .003));
}
function pumpGun(M) {
  const g = new THREE.Group();
  g.add(at(lathe([[-.12, .0135], [-.8, .0128], [-.805, .011]], M.steel, 16), 0, 0, 0));
  g.add(at(cyl(.0105, .0105, .58, M.steel, 12), 0, -.025, -.42));
  g.add(at(bx(.044, .064, .2, M.case), 0, -.012, -.03));
  g.add(at(bx(.046, .004, .1, M.steel), 0, -.012, -.04)); // ejection port line
  const pump = new THREE.Group(); g.add(pump);
  const fore = lathe([[-.28, .019], [-.3, .022], [-.47, .022], [-.49, .019]], M.wood, 16); at(fore, 0, -.025, 0); pump.add(fore);
  for (let i = 0; i < 7; i++) { const rb = new THREE.Mesh(new THREE.TorusGeometry(.0222, .0016, 4, 18), M.darkwood); at(rb, 0, -.025, -.31 - i * .025); pump.add(rb); }
  g.add(at(bx(.008, .022, .012, M.steel), 0, -.05, .05));
  const guard = new THREE.Mesh(new THREE.TorusGeometry(.024, .003, 6, 16, Math.PI), M.steel); guard.rotation.set(0, Math.PI / 2, Math.PI); at(guard, 0, -.05, .05); g.add(guard);
  g.add(stock([[.07, .015], [.15, .0], [.4, -.04], [.42, -.14], [.38, -.15], [.16, -.08], [.07, -.05]], .042, M.wood));
  g.add(at(bx(.046, .11, .01, M.black), 0, -.09, .42));
  g.add(at(bx(.012, .004, .7, M.steel), 0, .016, -.45)); // rib
  ghostRing(g, M, -.02, .02, .038); frontPost(g, M, -.785, .018, .038);
  const muzzle = at(new THREE.Object3D(), 0, 0, -.81); g.add(muzzle);
  return { group: g, pump, muzzle, rear: V(0, .038, -.02), front: V(0, .038, -.785), adsZ: -.14, rh: V(0, -.06, .085), lh: V(-.005, -.05, -.39), hip: V(.15, -.17, -.3) };
}
function doubleGun(M) {
  const g = new THREE.Group(), barrels = new THREE.Group(); g.add(barrels); barrels.position.set(0, -.012, -.06);
  for (const x of [-.0128, .0128]) barrels.add(at(lathe([[0, .0138], [-.7, .0128], [-.705, .0112]], M.steel, 16), x, .012, 0));
  barrels.add(at(bx(.01, .006, .69, M.steel), 0, .025, -.35));
  frontPost(barrels, M, -.69, .028, .048);
  barrels.add(stock([[-.06, .0], [-.3, .0], [-.31, -.018], [-.06, -.024]], .046, M.wood));
  g.add(at(bx(.052, .058, .12, M.case), 0, -.012, .0));
  for (const x of [-.017, .017]) { const h = at(bx(.006, .018, .012, M.case), x, .012, .062); h.rotation.x = -.9; g.add(h); }   // hammers, laid back below the sight line
  for (const z of [.035, .05]) g.add(at(bx(.007, .02, .006, M.steel), 0, -.05, z));
  const guard = new THREE.Mesh(new THREE.TorusGeometry(.027, .003, 6, 16, Math.PI), M.steel); guard.rotation.set(0, Math.PI / 2, Math.PI); at(guard, 0, -.05, .045); g.add(guard);
  g.add(stock([[.06, .02], [.15, -.008], [.39, -.045], [.4, -.135], [.36, -.14], [.15, -.07], [.06, -.045]], .042, M.wood));
  rearBlade(g, M, .03, .017, .036, .007, .0013);
  const muzzle = at(new THREE.Object3D(), 0, .012, -.71); barrels.add(muzzle);
  return { group: g, barrels, muzzle, rear: V(0, .036, .03), front: V(0, .036, -.75), adsZ: -.14, rh: V(0, -.055, .08), lh: V(-.005, -.04, -.27), hip: V(.15, -.165, -.3) };
}
function revolver(M) {
  const g = new THREE.Group();
  g.add(at(lathe([[-.03, .0095], [-.2, .0088], [-.205, .0075]], M.blued, 12), 0, .012, 0)); // barrel
  g.add(at(cyl(.005, .005, .15, M.blued, 8), 0, -.004, -.1)); // ejector rod housing
  g.add(at(bx(.02, .034, .07, M.blued), 0, .006, .015)); // frame
  const cylg = new THREE.Group(); at(cylg, 0, .006, -.012); g.add(cylg);
  cylg.add(cyl(.0175, .0175, .04, M.blued, 18));
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, f = cyl(.003, .003, .002, M.black, 8); at(f, Math.cos(a) * .011, Math.sin(a) * .011, -.021); cylg.add(f); const fl = bx(.003, .003, .03, M.steel); at(fl, Math.cos(a + .52) * .0175, Math.sin(a + .52) * .0175, 0); cylg.add(fl); }
  const hammer = new THREE.Group(); at(hammer, 0, .011, .045); g.add(hammer);   // low enough to keep the sight picture clear
  hammer.add(at(bx(.007, .022, .01, M.case), 0, .008, .0)); hammer.add(at(bx(.012, .004, .012, M.case), 0, .019, .004));
  g.add(at(bx(.006, .016, .008, M.steel), 0, -.016, .03));
  const guard = new THREE.Mesh(new THREE.TorusGeometry(.016, .0025, 6, 14, Math.PI), M.brass); guard.rotation.set(0, Math.PI / 2, Math.PI); at(guard, 0, -.016, .028); g.add(guard);
  const grip = stock([[.035, -.008], [.055, -.012], [.09, -.075], [.085, -.095], [.06, -.092], [.03, -.04]], .028, M.wood); g.add(grip);
  frontPost(g, M, -.198, .02, .034, .0034); rearBlade(g, M, .05, .022, .034, .006, .0022);
  const muzzle = at(new THREE.Object3D(), 0, .012, -.21); g.add(muzzle);
  return { group: g, cyl: cylg, hammer, muzzle, rear: V(0, .034, .05), front: V(0, .034, -.198), adsZ: -.36, rh: V(.002, -.05, .07), lh: V(-.012, -.062, .06), hip: V(.13, -.15, -.36) };
}
function rod(M) {
  const g = new THREE.Group();
  const pole = lathe([[.3, .009], [0, .008], [-.4, .006], [-1.2, .004], [-2.1, .0022]], M.darkwood, 10); g.add(pole);
  g.add(at(cyl(.014, .014, .26, M.cork, 12), 0, 0, .16));
  const reel = new THREE.Group(); at(reel, 0, -.035, .02); g.add(reel);
  const drum = cyl(.028, .028, .022, M.brass, 18); drum.rotation.y = Math.PI / 2; reel.add(drum);
  const handle = at(bx(.004, .004, .03, M.steel), .016, .0, .015); reel.add(handle); reel.add(at(new THREE.Mesh(new THREE.SphereGeometry(.006, 8, 6), M.wood), .02, 0, .03));
  g.add(at(bx(.006, .03, .006, M.steel), 0, -.018, .02));
  const tip = at(new THREE.Object3D(), 0, 0, -2.12); g.add(tip);
  return { group: g, reel, tip, muzzle: tip, rear: V(0, .02, 0), front: V(0, .02, -1), adsZ: -.2, rh: V(0, -.03, .1), lh: V(-.01, -.03, .32), hip: V(.16, -.2, -.35), rod: true };
}

export const GUNS = {
  longrifle: { key: 'longrifle', name: 'Long rifle', ammo: 'rifle', mag: 5, fov: 40, scope: [8, 4], cycle: 1.2, reloadEach: .62, pellets: 1, spread: 0, hip: .035, range: 900, power: 2.4, kick: .075, sound: 'rifle' },
  pump: { key: 'pump', name: 'Pump shotgun', ammo: 'shell', mag: 5, fov: 52, cycle: .82, reloadEach: .55, pellets: 9, spread: .032, hip: .02, range: 62, power: .55, kick: .085, sound: 'shotgun' },
  double: { key: 'double', name: 'Double barrel', ammo: 'shell', mag: 2, fov: 54, cycle: .2, reloadAll: 1.75, pellets: 12, spread: .042, hip: .022, range: 52, power: .55, kick: .11, sound: 'shotgun' },
  revolver: { key: 'revolver', name: 'Revolver', ammo: 'pistol', mag: 6, fov: 56, cycle: .36, reloadEach: .44, pellets: 1, spread: .003, hip: .018, range: 150, power: 1.1, kick: .055, sound: 'pistol' },
  rod: { key: 'rod', name: 'Fishing rod', rod: true },
};
export const ORDER = ['longrifle', 'pump', 'double', 'revolver', 'rod'];
// boxes of ammunition at the camp chest: how many in a box and what it costs
export const AMMO = { rifle: { name: 'Rifle cartridges', box: 10, price: 9 }, shell: { name: 'Shotgun shells', box: 10, price: 7 }, pistol: { name: 'Revolver cartridges', box: 12, price: 5 } };

export class Weapons {
  constructor(camera, tex, glow) {
    this.cam = camera; this.M = mats(tex);
    this.root = new THREE.Group(); camera.add(this.root);
    this.models = { longrifle: longRifle(this.M), pump: pumpGun(this.M), double: doubleGun(this.M), revolver: revolver(this.M), rod: rod(this.M) };
    for (const m of Object.values(this.models)) {
      const h = new THREE.Group(); h.add(m.group); const a = arms(this.M, m.rh, m.lh); h.add(a); m.arms = a; m.holder = h; h.visible = false; this.root.add(h);
      h.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 10; } });
    }
    this.current = null; this.want = null; this.raise = 0; this.ads = 0; this.kick = 0; this.cool = 0; this.reloading = 0; this.reloadT = 0; this.act = 0; this.sway = 0; this.scoped = 0; this.zoomI = 0;
    this.ammo = { longrifle: 5, pump: 5, double: 2, revolver: 6 }; this.reserve = { rifle: 10, shell: 12, pistol: 18 };
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 })); this.flash.renderOrder = 12; this.flash.scale.setScalar(.2); this.root.add(this.flash);
    this.flashLight = new THREE.PointLight(0xffa050, 0, 18, 2); this.root.add(this.flashLight);
    this.puffs = []; this.glow = glow; this._a = V(); this._b = V();
  }
  select(k) { if (k === this.current && k) return; this.want = k; }
  cycle(dir) { const order = [null, ...ORDER], i = order.indexOf(this.want); this.select(order[(i + (dir > 0 ? 1 : order.length - 1)) % order.length]); }
  get gun() { return this.current && GUNS[this.current]; }
  update(dt, input, ctx) {
    if (this.want !== this.current) { this.raise -= dt * 4; this.ads = 0; this.scoped = 0; if (this.raise <= 0) { this.raise = 0; if (this.current) this.models[this.current].holder.visible = false; if (this.current === 'rod' && ctx.fishing) ctx.fishing.stow(); this.current = this.want; this.reloading = 0; if (this.current) this.models[this.current].holder.visible = true; } }
    else if (this.current) this.raise = Math.min(1, this.raise + dt * 3);
    const g = this.gun, m = this.current && this.models[this.current];
    this.cool -= dt; this.kick *= Math.pow(.0004, dt); this.act = Math.max(0, this.act - dt / (g && g.cycle ? Math.max(.4, g.cycle * .9) : 1));
    if (!g) { ctx.setFov(72); ctx.scope(0); return; }
    this.sway += dt; const bob = ctx.bob, ph = ctx.phase, low = 1 - this.raise;
    if (g.rod) { // the rod: fishing.js casts and reels; here it only sits in the hands
      const p = m.hip.clone(); p.y += -Math.abs(Math.cos(ph)) * .012 * bob - low * .4 + Math.sin(this.sway * 1.2) * .003; m.holder.position.copy(p);
      m.holder.rotation.set(.35 + low * .5 + (ctx.fishing ? ctx.fishing.rodPitch : 0), .05, .08);
      if (ctx.fishing) ctx.fishing.update(dt, input, m, this.raise > .9); ctx.setFov(72); ctx.scope(0); return;
    }
    const aimHeld = (input.mouseDown[2] || input.touchAim) && !this.reloading && this.raise > .9;
    this.ads += ((aimHeld ? 1 : 0) - this.ads) * Math.min(1, dt * (g.scope ? 8 : 11));
    // the scope: once the rifle is up, the view goes through the glass; the wheel changes its power
    const scopeOn = g.scope && this.ads > .82;
    if (scopeOn && input.wheel) this.zoomI = input.wheel > 0 ? 0 : 1;
    this.scoped += ((scopeOn ? 1 : 0) - this.scoped) * Math.min(1, dt * 14);
    // reload: round by round (rifle, pump, revolver), or both barrels at once
    const k = this.current, a = g.ammo;
    if ((input.hit('KeyR') || (this.ammo[k] === 0 && this.reserve[a] > 0 && this.cool < -.3)) && !this.reloading && this.ammo[k] < g.mag && this.reserve[a] > 0) { this.reloading = 1; this.reloadT = g.reloadAll || g.reloadEach; ctx.sound(k === 'double' ? 'break' : 'reload'); }
    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const n = g.reloadAll ? Math.min(g.mag - this.ammo[k], this.reserve[a]) : 1;
        this.ammo[k] += n; this.reserve[a] -= n; ctx.sound('load');
        if (this.ammo[k] >= g.mag || this.reserve[a] <= 0 || g.reloadAll) { this.reloading = 0; if (k === 'longrifle' || k === 'pump') { this.act = 1; ctx.sound(k === 'pump' ? 'pump' : 'bolt'); } } else this.reloadT = g.reloadEach;
      }
      if ((input.clicked.has(0) || input.touchFire) && this.ammo[k] > 0 && !g.reloadAll) this.reloading = 0;
    }
    // fire
    const trig = input.clicked.has(0) || input.touchFire;
    if (trig && this.raise > .9 && !this.reloading && this.cool <= 0) {
      if (this.ammo[k] <= 0) { ctx.sound('click'); this.cool = .3; }
      else { this.ammo[k]--; this.cool = g.cycle; this.fire(g, ctx); if (k === 'longrifle' || k === 'pump') { this.act = 1; setTimeout(() => ctx.sound(k === 'pump' ? 'pump' : 'bolt'), 240); } if (k === 'revolver') { this.act = 1; setTimeout(() => ctx.sound('cock'), 120); } }
    }
    // pose: hip -> sights (the sight line on the view's centre line), with breathing sway, walk bob and recoil
    const ads = this.ads, rl = this.reloading ? 1 : 0, aim = V(0, -m.rear.y, m.adsZ - m.rear.z - .02);
    const p = m.hip.clone().lerp(aim, ads);
    const sw = 1 - ads * .85;
    p.x += Math.sin(ph) * .01 * bob * sw + Math.sin(this.sway * .9) * .0018 * (1 - ads * .6);
    p.y += -Math.abs(Math.cos(ph)) * .012 * bob * sw + Math.sin(this.sway * 1.3) * .002 * (1 - ads * .6) - low * .38 - rl * (k === 'revolver' ? .02 : .05);
    p.z += this.kick * (k === 'revolver' ? .05 : .09);
    m.holder.position.copy(p);
    const muzzleUp = this.kick * (k === 'revolver' ? 1.1 : .5);
    m.holder.rotation.set(muzzleUp + rl * (k === 'double' ? .2 : .45) + low * .6, (1 - ads) * .05, (1 - ads) * .05 + rl * (k === 'revolver' ? .6 : .35));
    // the actions
    const c = Math.min(1, this.act), arc = Math.sin(c * Math.PI);
    if (m.bolt) { const lift = Math.min(1, c * 4) * Math.min(1, (1 - c) * 4); m.bolt.rotation.z = -lift * 1.2; m.bolt.position.z = .04 + arc * .07; }
    if (m.pump) m.pump.position.z = arc * .09;
    if (m.barrels) { const open = this.reloading ? Math.min(1, (1 - this.reloadT / g.reloadAll) * 4) * (this.reloadT > .2 ? 1 : this.reloadT / .2) : 0; m.barrels.rotation.x = open * .5; }
    if (m.cyl) { m.cyl.rotation.z = (this.cylA || 0) + (1 - Math.min(1, this.act * 1.5)) * 0; m.hammer.rotation.x = -Math.min(1, this.act * 2.5) * .6 + (this.act > .6 ? 0 : 0); }
    if (m.arms.userData.left) m.arms.userData.left.visible = m.arms.userData.leftHand.visible = !ctx.lanternInHand;
    m.holder.visible = this.scoped < .5;
    ctx.scope(this.scoped, g.scope ? g.scope[this.zoomI] : 0);
    ctx.setFov(this.scoped > .5 ? g.scope[this.zoomI] : 72 + (g.fov - 72) * ads);
    // flash and smoke
    this.flash.material.opacity = Math.max(0, this.flash.material.opacity - dt * 22); this.flashLight.intensity = Math.max(0, this.flashLight.intensity - dt * 900);
    for (const s of this.puffs) { s.userData.t += dt; const kk = s.userData.t / 2.2; s.position.addScaledVector(s.userData.v, dt); s.userData.v.multiplyScalar(Math.pow(.3, dt)); s.userData.v.y += dt * .25; s.scale.setScalar(.3 + kk * 2.2); s.material.opacity = Math.max(0, .35 * (1 - kk)); if (kk >= 1) { s.parent && s.parent.remove(s); s.userData.dead = true; } }
    this.puffs = this.puffs.filter(s => !s.userData.dead);
  }
  // where an aimed shot goes: along the sights (rear to front) as they sit in the view right now
  aimRay(o, d) {
    const m = this.models[this.current]; m.holder.updateMatrixWorld(true);
    this.cam.getWorldPosition(o);
    if (this.scoped > .5 || this.ads < .85) { this.cam.getWorldDirection(d); return; }
    m.group.localToWorld(this._a.copy(m.rear)); m.group.localToWorld(this._b.copy(m.front)); d.subVectors(this._b, this._a).normalize();
    const f = this.cam.getWorldDirection(new THREE.Vector3()); if (d.dot(f) < .995) d.copy(f);   // never further off than the sights could be
  }
  fire(g, ctx) {
    const m = this.models[this.current];
    this.kick = 1; ctx.recoil(g.kick * (1 - this.ads * .35) * (this.scoped > .5 ? 1.4 : 1));
    if (this.current === 'revolver') this.cylA = (this.cylA || 0) + Math.PI / 3;
    m.muzzle.updateMatrixWorld(true); const mp = new THREE.Vector3(); m.muzzle.getWorldPosition(mp);
    if (this.scoped < .5) { this.root.worldToLocal(this.flash.position.copy(mp)); this.flash.material.opacity = 1; this.flash.material.rotation = Math.random() * 6; this.flashLight.position.copy(this.flash.position); this.flashLight.intensity = 60; }
    const o = V(), dir = V(); this.aimRay(o, dir);
    for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx.puff, color: 0xc8c4bc, transparent: true, depthWrite: false, opacity: .35 })); s.position.copy(mp); s.userData = { t: 0, v: dir.clone().multiplyScalar(1.5 + i * 1.2).add(V(0, .2, 0)) }; ctx.scene.add(s); this.puffs.push(s); }
    ctx.sound('shot', g.sound);
    // each pellet: an aimed shot is true to the sights; from the hip it wanders
    const spread = g.spread + (1 - this.ads) * g.hip;
    for (let kk = 0; kk < g.pellets; kk++) {
      const d = dir.clone(); if (spread) { d.x += (Math.random() - .5) * spread * 2; d.y += (Math.random() - .5) * spread * 2; d.z += (Math.random() - .5) * spread * 2; d.normalize(); }
      ctx.trace(o, d, g.range, g.power, kk === 0, g);
    }
  }
  get label() { const g = this.gun; if (!g) return ''; if (g.rod) return 'Fishing rod'; return `${g.name}  ${this.ammo[this.current]} / ${this.reserve[g.ammo]}`; }
  // older saves kept a lever rifle and a two-barrel shotgun
  load(ammo, reserve) {
    if (reserve && ('shotgun' in reserve || 'rifle' in reserve) && !('shell' in reserve)) { this.reserve.rifle = reserve.rifle | 0; this.reserve.shell = reserve.shotgun | 0; }
    else if (reserve) Object.assign(this.reserve, reserve);
    if (ammo) for (const k of Object.keys(this.ammo)) if (ammo[k] != null) this.ammo[k] = ammo[k];
  }
}
