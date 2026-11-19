// The camp: a canvas wall tent on an A-frame and ridge pole that you can walk into (bedroll, sea chest, meat box,
// lantern), a stone-ringed campfire with a cooking tripod and kettle, log seats, a plank table with a coffee pot and
// tin cups, a woodpile with a chopping block and axe, a meat-drying rack and a lantern post. Built in camp-local
// coordinates (+z points from the tent door toward the fire).
import * as THREE from 'three';
import { patch, U } from './fx.js';
import { rockGeometry } from './plants.js';
import { Campfire } from './fire.js';
import { Lantern } from './lantern.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const TENT = { cz: -2.7, W: 3.4, L: 4.2, wallH: 1.45, H: 2.75, door: 0.68 };

function cylBetween(a, b, r, mat, seg = 8) {
  const d = V().subVectors(b, a), len = d.length(), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.castShadow = true; m.receiveShadow = true; return m;
}
function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
// a panel subdivided for sag, from corner o along u (width) and v (height), with UVs in metres
function panel(o, u, v, nu, nv, sagFn) {
  const g = new THREE.PlaneGeometry(1, 1, nu, nv), p = g.attributes.position, uv = g.attributes.uv, lu = u.length(), lv = v.length(), q = V();
  for (let i = 0; i < p.count; i++) {
    const a = p.getX(i) + .5, b = p.getY(i) + .5;
    q.copy(o).addScaledVector(u, a).addScaledVector(v, b); if (sagFn) sagFn(q, a, b);
    p.setXYZ(i, q.x, q.y, q.z); uv.setXY(i, a * lu / 1.6, b * lv / 1.6);
  }
  g.computeVertexNormals(); return g;
}
function shapeWall(pts, z, flip) {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), g = new THREE.ShapeGeometry(s), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { uv.setXY(i, p.getX(i) / 1.6, p.getY(i) / 1.6); p.setZ(i, z); }
  if (flip) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 2]; ix[i + 2] = t; } }
  g.computeVertexNormals(); return g;
}

export class Camp {
  constructor(scene, world, tex, plants) {
    this.world = world; const c = world.camp; this.c = c;
    this.yaw = ((world.seed % 360) / 360) * Math.PI * 2;
    this.group = new THREE.Group(); this.group.position.set(c.x, c.h, c.z); this.group.rotation.y = this.yaw; scene.add(this.group); this.group.updateMatrixWorld();
    this.colliders = []; this.interact = [];
    const M = this.mats = this.makeMats(tex);
    this.buildTent(M); this.buildInterior(M); this.buildFire(M, plants); this.buildCamp(M, plants);
    this.group.traverse(o => { if (o.isMesh && !o.material.isShaderMaterial && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
  }
  makeMats(tex) {
    const canvas = new THREE.MeshStandardMaterial({ map: tex.canvas.map, normalMap: tex.canvas.normalMap, normalScale: new THREE.Vector2(.6, .6), roughness: .92, side: THREE.DoubleSide });
    patch(canvas, 'canvas', sh => {
      sh.uniforms.uSunCol = U.uSunCol; sh.uniforms.uSunDirF = U.uSunDirW;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uSunCol; uniform vec3 uSunDirF;')
        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
// sunlight glowing through the canvas when seen from inside
if ( ! gl_FrontFacing ) { vec3 sv = normalize( ( viewMatrix * vec4( uSunDirF, 0.0 ) ).xyz ); reflectedLight.directDiffuse += diffuseColor.rgb * uSunCol * ( 0.05 + 0.13 * max( dot( - normal, sv ), 0.0 ) ); reflectedLight.indirectDiffuse *= 0.55; }`);
    });
    const wood = new THREE.MeshStandardMaterial({ map: tex.wood.map, normalMap: tex.wood.normalMap, roughness: .88 });
    const darkWood = new THREE.MeshStandardMaterial({ map: tex.wood2.map, normalMap: tex.wood2.normalMap, roughness: .85, color: 0xb09080 });
    const pole = new THREE.MeshStandardMaterial({ map: tex.bark.dead.map, normalMap: tex.bark.dead.normalMap, roughness: .9, color: 0xc8b8a0 });
    const bark = new THREE.MeshStandardMaterial({ map: tex.bark.spruce.map, normalMap: tex.bark.spruce.normalMap, roughness: .95 });
    const endGrain = new THREE.MeshStandardMaterial({ roughness: .9, map: tex.endGrain });
    const iron = new THREE.MeshStandardMaterial({ color: 0x1e1c1a, metalness: .45, roughness: .78 });
    const tinM = new THREE.MeshStandardMaterial({ color: 0x9a9890, metalness: .85, roughness: .35 });
    const enamel = new THREE.MeshStandardMaterial({ color: 0x3c5266, metalness: .2, roughness: .35 });
    const rope = new THREE.MeshStandardMaterial({ color: 0xa8916a, roughness: 1 });
    const blanket = new THREE.MeshStandardMaterial({ map: tex.blanket, roughness: 1, envMapIntensity: .5 });
    const oilcloth = new THREE.MeshStandardMaterial({ color: 0x7a6448, roughness: .62, map: tex.canvas.map, envMapIntensity: .6 });
    const char = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1, map: tex.bark.pine.map });
    const leather = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: .7 });
    return { canvas, wood, darkWood, pole, bark, endGrain, iron, tin: tinM, enamel, rope, blanket, oilcloth, char, leather, rock: null };
  }
  // ground height in camp-local space under a local point
  gy(x, z) { const p = V(x, 0, z).applyMatrix4(this.group.matrixWorld); return this.world.height(p.x, p.z) - this.c.h; }
  toWorld(x, z, y = 0) { return V(x, y, z).applyMatrix4(this.group.matrixWorld); }
  addBox(cx, cz, hx, hz, rot = 0) { const w = this.toWorld(cx, cz); this.colliders.push({ t: 'box', x: w.x, z: w.z, hx, hz, rot: this.yaw + rot }); }
  addCircle(cx, cz, r) { const w = this.toWorld(cx, cz); this.colliders.push({ t: 'c', x: w.x, z: w.z, r }); }
  addSeg(ax, az, bx, bz) { const a = this.toWorld(ax, az), b = this.toWorld(bx, bz); this.colliders.push({ t: 's', ax: a.x, az: a.z, bx: b.x, bz: b.z }); }
  addInteract(id, x, y, z, r, label) { const w = this.toWorld(x, z, y); const it = { id, pos: w, r, label }; this.interact.push(it); return it; }

  buildTent(M) {
    const T = TENT, g = new THREE.Group(); g.position.set(0, this.gy(0, T.cz), T.cz); this.group.add(g); this.tent = g;
    const hw = T.W / 2, hl = T.L / 2, eave = .14;
    const mesh = (geo, mat = M.canvas) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    // walls, with a slight flare at the sod cloth
    for (const s of [-1, 1]) {
      mesh(panel(V(s * hw, 0, s > 0 ? hl : -hl), V(0, 0, s > 0 ? -T.L : T.L), V(0, T.wallH, 0), 10, 3, (q, a, b) => { q.x += s * (1 - b) * (1 - b) * .06; q.x += s * Math.sin(a * Math.PI * 3) * .012 * b; }));
      // roof, sagging between the ridge and the eaves
      const o = V(s * (hw + eave), T.wallH - .05, s > 0 ? hl + .22 : -hl - .22), u = V(0, 0, s > 0 ? -T.L - .44 : T.L + .44), v = V(-s * (hw + eave), T.H - T.wallH + .05, 0);
      mesh(panel(o, u, v, 14, 7, (q, a, b) => { q.y -= .055 * Math.sin(Math.PI * b) * (.55 + .45 * Math.abs(Math.sin(a * Math.PI * 2))); }));
    }
    const back = [[-hw, 0], [hw, 0], [hw, T.wallH], [0, T.H], [-hw, T.wallH]];
    mesh(shapeWall(back, -hl, true));
    const d = T.door;
    const front = [[-hw, 0], [-d, 0], [-d, 1.92], [d, 1.92], [d, 0], [hw, 0], [hw, T.wallH], [0, T.H], [-hw, T.wallH]];
    mesh(shapeWall(front, hl, false));
    // door flaps rolled and tied back
    for (const s of [-1, 1]) {
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(.075, .085, 1.85, 10), M.canvas); roll.position.set(s * (d + .1), .95, hl + .06); roll.rotation.z = s * .05; roll.castShadow = true; g.add(roll);
      for (const y of [.55, 1.45]) { const tie = new THREE.Mesh(new THREE.TorusGeometry(.088, .008, 4, 12), M.rope); tie.rotation.x = Math.PI / 2; tie.position.set(s * (d + .1), y, hl + .06); g.add(tie); }
    }
    // ridge pole, back upright, front shear-legs
    g.add(cylBetween(V(0, T.H + .04, -hl - .35), V(0, T.H + .04, hl + .5), .045, M.pole));
    g.add(cylBetween(V(0, 0, -hl + .06), V(0, T.H + .02, -hl + .06), .05, M.pole));
    for (const s of [-1, 1]) g.add(cylBetween(V(s * .85, 0, hl + .55), V(-s * .18, T.H + .32, hl + .42), .05, M.pole));
    // ground sheet
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(T.W - .1, T.L - .1).rotateX(-Math.PI / 2), M.oilcloth); sheet.position.y = .045; sheet.material.polygonOffset = true; sheet.material.polygonOffsetFactor = -1; sheet.receiveShadow = true; g.add(sheet);
    // guy ropes and stakes
    const stake = new THREE.CylinderGeometry(.018, .01, .35, 5);
    for (const s of [-1, 1]) for (const z of [-hl + .1, 0, hl - .1]) {
      const top = V(s * (hw + eave), T.wallH - .06, z), gnd = V(s * (hw + 1.35), 0, z);
      gnd.y = this.gy(s * (hw + 1.35), T.cz + z) - g.position.y;
      g.add(cylBetween(top, V(gnd.x, gnd.y + .12, gnd.z), .006, M.rope, 4));
      const st = new THREE.Mesh(stake, M.pole); st.position.set(gnd.x, gnd.y + .1, gnd.z); st.rotation.z = -s * .35; g.add(st);
    }
    // walls you bump into (the doorway is open)
    const z0 = T.cz;
    this.addSeg(-hw, z0 - hl, -hw, z0 + hl); this.addSeg(hw, z0 - hl, hw, z0 + hl); this.addSeg(-hw, z0 - hl, hw, z0 - hl);
    this.addSeg(-hw, z0 + hl, -d + .02, z0 + hl); this.addSeg(d - .02, z0 + hl, hw, z0 + hl);
    for (const s of [-1, 1]) this.addCircle(s * .85, z0 + hl + .55, .08);
    this.tentBounds = { cz: z0, hw, hl };
  }
  buildInterior(M) {
    const T = TENT, z0 = T.cz, g = this.tent;
    // bedroll: a padded tick, the striped wool blanket on top, a pillow and a rolled spare blanket
    const bed = new THREE.Group(); bed.position.set(-.95, .03, -.55); g.add(bed);
    const tick = new THREE.BoxGeometry(.8, .1, 2.0, 6, 1, 12); { const p = tick.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const e = Math.max(Math.abs(x) / .4, Math.abs(z) / 1.0); if (y > 0) p.setY(i, y - Math.pow(e, 6) * .05 + Math.sin(z * 7) * .006); } tick.computeVertexNormals(); }
    const tk = new THREE.Mesh(tick, M.oilcloth); tk.position.y = .05; tk.receiveShadow = true; bed.add(tk);
    const bl = new THREE.BoxGeometry(.84, .03, 1.45, 8, 1, 12); { const p = bl.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) + Math.cos(x / .42 * Math.PI / 2) * .03 - (Math.abs(x) > .38 ? .06 : 0) + Math.sin(z * 9 + x * 4) * .008); } bl.computeVertexNormals(); }
    const blk = new THREE.Mesh(bl, M.blanket); blk.position.set(0, .12, .22); blk.castShadow = true; blk.receiveShadow = true; bed.add(blk);
    const pillow = new THREE.Mesh(new THREE.SphereGeometry(.5, 16, 10), M.canvas); pillow.scale.set(.58, .17, .32); pillow.position.set(0, .17, -.76); pillow.castShadow = true; bed.add(pillow);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .78, 16), M.blanket); roll.rotation.z = Math.PI / 2; roll.position.set(0, .2, .98); roll.castShadow = true; bed.add(roll);
    this.addInteract('bed', -.95, .3, z0 - .55, 1.3, () => 'Rest in the bedroll');
    // the sea chest at the back: planks, iron bands, a lid that opens
    const chest = new THREE.Group(); chest.position.set(.9, 0, -1.68); g.add(chest);
    chest.add(box(.92, .44, .5, M.wood, 0, .22, 0));
    for (const x of [-.36, .36]) chest.add(box(.04, .46, .52, M.iron, x, .23, 0));
    const lid = new THREE.Group(); lid.position.set(0, .44, -.25); chest.add(lid);
    const lidM = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .92, 16, 1, false, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), M.wood);
    lidM.scale.set(1, .6, 1); lidM.position.set(0, 0, .25); lidM.castShadow = true; lid.add(lidM);
    for (const x of [-.36, .36]) { const band = new THREE.Mesh(new THREE.TorusGeometry(.254, .012, 4, 16, Math.PI).rotateY(Math.PI / 2), M.iron); band.position.set(x, 0, .25); band.scale.set(1, .6, 1); lid.add(band); }
    chest.add(box(.08, .1, .02, M.iron, 0, .4, .26));
    this.chestLid = lid; this.chestOpen = 0;
    this.addBox(.9, z0 - 1.68, .48, .27);
    this.addInteract('chest', .9, .5, z0 - 1.68, 1.2, () => 'Open the chest');
    // meat box: a salted, lidded crate by the right wall
    const mb = new THREE.Group(); mb.position.set(1.18, 0, -.25); mb.rotation.y = -Math.PI / 2; g.add(mb);
    mb.add(box(.72, .48, .5, M.darkWood, 0, .24, 0)); mb.add(box(.76, .05, .54, M.darkWood, 0, .5, 0));
    for (const x of [-.39, .39]) { const h = new THREE.Mesh(new THREE.TorusGeometry(.05, .01, 4, 10, Math.PI), M.rope); h.position.set(x, .35, 0); h.rotation.y = Math.PI / 2; mb.add(h); }
    this.addBox(1.18, z0 - .25, .26, .38);
    this.meatBox = this.addInteract('meatbox', 1.18, .55, z0 - .25, 1.1, () => 'Meat box');
    // an upturned crate as a night table, with a tin cup and a book
    const crate = new THREE.Group(); crate.position.set(1.15, 0, .85); g.add(crate);
    crate.add(box(.5, .42, .4, M.wood, 0, .21, 0));
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(.04, .035, .09, 14, 1, true), M.tin); cup.position.set(-.1, .47, .05); crate.add(cup);
    crate.add(box(.16, .04, .22, M.leather, .1, .44, -.03));
    this.addBox(1.15, z0 + .85, .25, .2);
    // rifle pegs on the back pole
    for (const y of [1.15, 1.45]) { const peg = cylBetween(V(0, y, -T.L / 2 + .1), V(0, y + .02, -T.L / 2 + .3), .015, M.pole); g.add(peg); }
    this.rackPos = V(0, 1.3, -T.L / 2 + .26);
  }
  buildFire(M, plants) {
    const fz = 3.1, gy = this.gy(0, fz), g = new THREE.Group(); g.position.set(0, gy, fz); this.group.add(g); this.fireGroup = g;
    // ash bed and a ring of stones
    const rocks = [rockGeometry(201, .75, 2), rockGeometry(202, .65, 2), rockGeometry(203, .8, 2)];
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + (i % 2) * .08, r = .82 + (i % 3) * .03, s = .17 + ((i * 37) % 10) / 100;
      const m = new THREE.Mesh(rocks[i % 3], plants.rockMat); m.position.set(Math.cos(a) * r, s * .35, Math.sin(a) * r); m.scale.set(s * 1.2, s, s); m.rotation.y = a * 3.1; m.castShadow = true; m.receiveShadow = true; g.add(m);
    }
    // charred logs laid in a star, raised where they meet
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + .3, out = V(Math.cos(a) * .72, .06, Math.sin(a) * .72), inn = V(Math.cos(a) * .1, .2, Math.sin(a) * .1);
      g.add(cylBetween(out, inn, .065, M.char, 7));
    }
    this.fire = new Campfire(g);
    // cooking tripod with a hanging kettle
    const apex = V(0, 1.75, 0);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + Math.PI / 2; g.add(cylBetween(V(Math.cos(a) * .95, 0, Math.sin(a) * .95), apex.clone().add(V(Math.cos(a) * .05, .12, Math.sin(a) * .05)), .022, M.pole, 6)); }
    g.add(cylBetween(apex, V(0, .95, 0), .006, M.iron, 4));
    const pot = new THREE.Group(); pot.position.y = .62; g.add(pot);
    const potG = new THREE.LatheGeometry([[0, 0], [.12, 0], [.155, .03], [.165, .1], [.158, .2], [.15, .22], [.155, .23]].map(([x, y]) => new THREE.Vector2(x, y)), 22);
    const potM = new THREE.Mesh(potG, M.iron); potM.castShadow = true; pot.add(potM);
    const bail = new THREE.Mesh(new THREE.TorusGeometry(.16, .005, 4, 18, Math.PI), M.iron); bail.position.y = .22; pot.add(bail);
    const lidp = new THREE.Mesh(new THREE.CylinderGeometry(.15, .155, .02, 22), M.iron); lidp.position.y = .235; pot.add(lidp);
    this.pot = pot;
    this.addCircle(0, fz, .95);
    this.addInteract('fire', 0, .5, fz, 1.9, () => 'Campfire');
    this.firePos = this.toWorld(0, fz, gy);
    // log seats and a stump around the fire
    const seat = (x, z, rot, len) => {
      const y = this.gy(x, z), lg = new THREE.Mesh(new THREE.CylinderGeometry(.21, .23, len, 14), [M.bark, M.endGrain, M.endGrain]);
      lg.rotation.set(0, rot, Math.PI / 2); lg.position.set(x, y + .19, z); lg.castShadow = true; lg.receiveShadow = true; this.group.add(lg);
      this.addBox(x, z, len / 2, .24, rot); return lg;
    };
    seat(-2.3, fz + .3, Math.PI / 2 - .35, 1.8); seat(2.35, fz + .2, Math.PI / 2 + .3, 1.7);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.27, .32, .45, 14), [M.bark, M.endGrain, M.endGrain]); st.position.set(.4, this.gy(.4, fz + 2.4) + .2, fz + 2.4); st.castShadow = true; this.group.add(st); this.addCircle(.4, fz + 2.4, .3);
    this.seats = [this.addInteract('seat', -2.3, .4, fz + .3, 1.2, () => 'Sit by the fire'), this.addInteract('seat', 2.35, .4, fz + .2, 1.2, () => 'Sit by the fire'), this.addInteract('seat', .4, .45, fz + 2.4, .9, () => 'Sit by the fire')];
  }
  buildCamp(M, plants) {
    // plank table with trestles, a coffee pot, tin cups, a plate and a knife
    const tx = 3.5, tz = .9, tr = .25, t = new THREE.Group(); t.position.set(tx, this.gy(tx, tz), tz); t.rotation.y = tr; this.group.add(t);
    t.add(box(1.5, .05, .72, M.wood, 0, .8, 0));
    for (const x of [-.58, .58]) for (const s of [-1, 1]) { const leg = box(.05, .9, .06, M.wood, x, .4, 0); leg.rotation.x = s * .38; t.add(leg); }
    t.add(box(1.2, .04, .05, M.wood, 0, .3, 0));
    const lathe = (pts, m, seg = 18) => { const me = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), m); me.castShadow = true; return me; };
    const cp = lathe([[0, 0], [.08, 0], [.095, .04], [.085, .15], [.05, .2], [.045, .22], [0, .23]], M.enamel); cp.position.set(-.45, .825, -.1); t.add(cp);
    const spout = cylBetween(V(-.36, .9, -.1), V(-.29, .99, -.1), .012, M.enamel, 6); t.add(spout);
    for (const [x, z] of [[-.05, .15], [.18, .12]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.042, .038, .085, 14, 1, true), M.tin); c.position.set(x, .87, z); t.add(c); }
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(.13, .1, .015, 20), M.enamel); plate.position.set(.42, .833, -.05); t.add(plate);
    t.add(box(.2, .008, .025, M.tin, .25, .83, .2));
    this.addBox(tx, tz, .78, .4, tr);
    this.addInteract('table', tx, .9, tz, 1.4, () => 'Camp table');
    // woodpile beside the tent and a chopping block with the axe
    const wx = -3.7, wz = -1.9, wp = new THREE.Group(); wp.position.set(wx, this.gy(wx, wz), wz); wp.rotation.y = .05; this.group.add(wp);
    const split = new THREE.CylinderGeometry(.09, .09, .62, 7, 1, false, 0, Math.PI * 1.25);
    let n = 0;
    for (let row = 0; row < 4; row++) for (let k = 0; k < 7 - row; k++) {
      const m = new THREE.Mesh(split, [M.bark, M.endGrain, M.endGrain]); m.rotation.set(Math.PI / 2, 0, (n * 1.7) % 6.28); m.position.set(0, .1 + row * .16, -.55 + k * .175 + row * .08); m.castShadow = true; m.receiveShadow = true; wp.add(m); n++;
    }
    this.addBox(wx, wz, .4, .7, .05);
    this.woodpile = this.addInteract('woodpile', wx, .5, wz, 1.4, () => 'Woodpile');
    const bx = -2.9, bz = .9, blk = new THREE.Group(); blk.position.set(bx, this.gy(bx, bz), bz); this.group.add(blk);
    const cb = new THREE.Mesh(new THREE.CylinderGeometry(.28, .32, .46, 14), [M.bark, M.endGrain, M.endGrain]); cb.position.y = .23; cb.castShadow = true; blk.add(cb);
    const axe = new THREE.Group(); axe.position.set(.05, .5, 0); axe.rotation.set(0, .6, -.95); blk.add(axe);
    axe.add(cylBetween(V(0, 0, 0), V(0, .72, 0), .017, M.wood, 6));
    const head = box(.03, .1, .17, M.iron, 0, .04, .05); axe.add(head);
    this.addCircle(bx, bz, .34);
    // drying rack for meat
    const rx = 3.9, rz = -3.5, rack = new THREE.Group(); rack.position.set(rx, this.gy(rx, rz), rz); rack.rotation.y = .4; this.group.add(rack);
    for (const x of [-1.05, 1.05]) for (const s of [-1, 1]) rack.add(cylBetween(V(x, 0, s * .45), V(x, 1.85, 0), .035, M.pole, 6));
    rack.add(cylBetween(V(-1.25, 1.78, 0), V(1.25, 1.78, 0), .035, M.pole, 6));
    this.hooks = [];
    for (let k = 0; k < 5; k++) { const x = -.8 + k * .4, hk = new THREE.Mesh(new THREE.TorusGeometry(.03, .004, 4, 10, Math.PI * 1.4), M.iron); hk.position.set(x, 1.72, 0); rack.add(hk); this.hooks.push({ group: rack, x }); }
    this.rack = rack;
    for (const x of [-1.05, 1.05]) this.addCircle(rx + Math.cos(.4) * x, rz - Math.sin(.4) * x, .2);
    this.addInteract('rack', rx, 1.2, rz, 1.6, () => 'Meat rack');
    // lantern post by the door
    const lx = 1.15, lz = -.2, post = new THREE.Group(); post.position.set(lx, this.gy(lx, lz), lz); this.group.add(post);
    post.add(cylBetween(V(0, 0, 0), V(0, 1.85, 0), .04, M.pole, 7));
    post.add(cylBetween(V(0, 1.7, 0), V(.38, 1.72, 0), .025, M.pole, 5));
    this.lantern = new Lantern(); this.lanternHome = new THREE.Group(); this.lanternHome.position.set(.36, 1.44, 0); post.add(this.lanternHome); this.lanternHome.add(this.lantern.group);
    this.addCircle(lx, lz, .08);
    this.lanternSpot = this.addInteract('lantern', lx + .36, 1.4, lz, 1.3, () => 'Lantern');
  }
  update(dt, night, wind) {
    this.fire.update(dt, night, wind);
    if (!this.lantern.carried) this.lantern.update(dt, night);
    this.chestLid.rotation.x += ((this.chestOpen ? -1.6 : 0) - this.chestLid.rotation.x) * Math.min(1, dt * 6);
  }
  // inside the tent? (rain sounds, sheltered light)
  inside(x, z) {
    const p = V(x, 0, z).sub(V(this.c.x, 0, this.c.z)).applyAxisAngle(V(0, 1, 0), -this.yaw), b = this.tentBounds;
    return Math.abs(p.x) < b.hw && Math.abs(p.z - b.cz) < b.hl;
  }
}
