// The scout drone (G): send it up from where you stand and fly it out over the country to look for game.
// Day vision is the plain camera; night vision (N) brings the dark up nearly to daylight in black and white, and rings
// the body heat of every animal in view. Put the centre ring on an animal and click (or E) to pin it: the pin
// follows that animal and stays on your screen, the compass and the map once you are back on foot, so you can walk
// straight to it. The battery runs down in the air and charges again while the drone is packed; while you fly, you
// stand still and blind where you left yourself, so mind the wolves.
// Landing (X): the drone settles on the ground and stays there as a lookout, and the view comes back to you. G flies it
// again from where it sits (if you are within range of it); walk up to it and press E to pack it away (it charges only
// while packed).
import * as THREE from 'three';
import { WATER_Y } from './world.js';

const $ = s => document.querySelector(s);
const RANGE = 520, BATTERY = 150, CEIL = 170, MAXPINS = 3;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const alive = a => a && !a.gone && a.state !== 'down' && a.state !== 'dead' && a.state !== 'fallfly';
const fmtD = d => d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m';

export class Drone {
  constructor(G, camera, renderer, scene) {
    this.G = G; this.cam = camera; this.r = renderer; this.scene = scene; this.landed = null; this.landing = false; this.model = null; this.on = false; this.batt = BATTERY; this.nv = false; this.pins = [];
    this.pos = V(); this.vel = V(); this.yaw = 0; this.pitch = 0; this.vy = 0; this.fov = 72; this.target = null; this.up = 0;
    this.el = $('#drone'); this.pinBox = $('#pins'); this.heatBox = $('#heat'); this.pinEls = []; this.heatEls = []; this._v = V(); this._f = V();
    this.baseExposure = renderer.toneMappingExposure;
  }
  get battery() { return this.batt / BATTERY; }
  toggle() { if (this.on) this.recall(); else this.launch(); }
  launch() {
    const G = this.G, P = G.player, L = this.landed;
    if (G.dead || P.seated || P.sleeping) return;
    if (P.swimming) { G.ui.toast('Not while you are swimming.'); return; }
    if (L) { const d = Math.hypot(L.x - P.pos.x, L.z - P.pos.z); if (d > RANGE - 5) { G.ui.toast(`The drone sits ${fmtD(d)} away, out of signal. Walk within ${RANGE} m of it to fly it.`); return; } }
    if (this.batt < 8) { G.ui.toast(L ? 'The drone battery is flat. Walk to it and press E to pack it away; it charges in your pack.' : 'The drone battery is flat. It charges while it is packed away.'); return; }
    this.on = true; this.landing = false; this.vel.set(0, 0, 0); this.vy = 3; this.pitch = -.3; this.fov = 72;
    if (L) { this.pos.set(L.x, L.y + .4, L.z); this.yaw = L.yaw; this.landed = null; this.showModel(false); } else { this.pos.set(P.pos.x, P.pos.y + 2.4, P.pos.z); this.yaw = P.yaw; }
    P.frozen = true; P.vel.set(0, 0, 0); this.gunVis = G.weapons.root.children.map(c => c.visible); for (const c of G.weapons.root.children) if (!c.isLight) c.visible = false; G.handL.visible = false;   // (the gun's light stays: a light coming or going makes every material rebuild its shader, a freeze)
    this.el.hidden = false; this.setVision(this.nv);
    G.ui.toast(G.input.isTouch ? 'Drone up. Drag to fly and look; Pin marks the animal in the ring.' : 'Drone up. WASD fly, Space up, C down, wheel zoom, N night vision, click to pin, X to land, G to bring it back.');
  }
  // a small quadcopter, seen only when it sits on the ground
  buildModel() {
    const g = new THREE.Group(), dark = new THREE.MeshLambertMaterial({ color: 0x2a2d33 }), grey = new THREE.MeshLambertMaterial({ color: 0x8a9098 }), prop = new THREE.MeshLambertMaterial({ color: 0x1a1c20, transparent: true, opacity: .85 });
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(.26, .08, .18), dark, 0, .12, 0); add(new THREE.BoxGeometry(.16, .04, .12), grey, 0, .175, 0);
    add(new THREE.SphereGeometry(.035, 10, 8), new THREE.MeshLambertMaterial({ color: 0x0a0c10 }), 0, .1, -.1);
    for (const [x, z] of [[.17, .14], [-.17, .14], [.17, -.14], [-.17, -.14]]) {
      const arm = add(new THREE.BoxGeometry(.03, .02, .22), dark, x / 2, .13, z / 2); arm.rotation.y = Math.atan2(x, z);
      add(new THREE.CylinderGeometry(.02, .02, .05, 8), grey, x, .15, z); add(new THREE.CylinderGeometry(.09, .09, .006, 16), prop, x, .18, z);
      add(new THREE.BoxGeometry(.012, .1, .012), dark, x * .55, .05, z * .55);
    }
    add(new THREE.SphereGeometry(.012, 6, 4), new THREE.MeshBasicMaterial({ color: 0x5dff7a }), .13, .12, -.09); add(new THREE.SphereGeometry(.012, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff8a1a }), -.13, .12, -.09);
    g.scale.setScalar(1.6); g.visible = false; this.scene.add(g); return g;
  }
  showModel(on) { if (!this.model) this.model = this.buildModel(); const L = this.landed; this.model.visible = on && !!L; if (on && L) { this.model.position.set(L.x, L.y, L.z); this.model.rotation.y = L.yaw; } }
  // close enough to pack it away
  get nearLanded() { const L = this.landed, P = this.G.player.pos; return !!L && !this.on && Math.hypot(L.x - P.x, L.z - P.z) < 2.6 && Math.abs(L.y - P.y) < 2.5; }
  pickUp() { if (!this.nearLanded) return false; this.landed = null; this.showModel(false); this.G.ui.toast('You pack the drone away. It charges in your pack.'); return true; }
  recall(why) {
    if (!this.on) return; const G = this.G;
    this.on = false; G.player.frozen = false; G.weapons.root.children.forEach((c, i) => { if (!c.isLight) c.visible = this.gunVis ? this.gunVis[i] !== false : true; }); this.el.hidden = true; this.applyVision(false); this.up = 0;
    this.cam.fov = 72; this.cam.updateProjectionMatrix(); G.player.applyCamera(); this.target = null;
    if (why) G.ui.toast(why); else if (this.pins.length) G.ui.toast(`Drone packed. Follow the pin${this.pins.length > 1 ? 's' : ''} to the game.`);
  }
  setVision(nv) { this.nv = nv; this.applyVision(this.on && nv); $('#dronemode').textContent = nv ? 'NIGHT VISION' : 'DAY VISION'; }
  applyVision(on) {
    // night vision: the dark brought up nearly to daylight, shown in black and white (the filter is in style.css)
    this.r.toneMappingExposure = on ? this.baseExposure * (1.15 + 8 * this.G.sky.night) : this.baseExposure;
    document.body.classList.toggle('nv', on);
  }
  // the animal under the centre ring, if any (closest to the line of sight, not hidden behind a hill)
  pick() {
    const W = this.G.wildlife, cam = this.cam, f = cam.getWorldDirection(this._f), tol = .03 + .05 * (cam.fov / 72);
    let best = null, bestA = tol;
    for (const a of W.animals) {
      if (!alive(a)) continue; const t = this._v.set(a.pos.x, a.pos.y + .6 * a.scale, a.pos.z).sub(cam.position), d = t.length(); if (d > 650 || d < 1) continue;
      const ang = Math.acos(Math.min(1, t.dot(f) / d)); if (ang < bestA && this.clear(a, d)) { bestA = ang; best = a; }
    }
    return best;
  }
  clear(a, d) { // a few samples of the ground along the line: is a hill in the way?
    const c = this.cam.position, w = this.G.world, n = Math.min(12, Math.ceil(d / 25));
    for (let i = 1; i < n; i++) { const k = i / n, x = c.x + (a.pos.x - c.x) * k, z = c.z + (a.pos.z - c.z) * k, y = c.y + (a.pos.y + .8 - c.y) * k; if (w.height(x, z) > y + .5) return false; }
    return true;
  }
  // Pins: up to three at once, on animals (the pin follows them) or on any spot (from the drone, on foot with P, or on
  // the map). A fourth takes the place of the oldest.
  nextN() { return (this.pins.reduce((m, p) => Math.max(m, p.n), 0) % 9) + 1; }
  addPin(p) {
    const G = this.G, gone = this.pins.length >= MAXPINS ? this.pins.shift() : null; p.n = this.nextN(); this.pins.push(p);
    return gone ? ` (pin ${gone.n}, ${gone.label.toLowerCase()}, was taken off: three at a time)` : '';
  }
  // the ground where a view line first meets it (up to 900 m), or null
  groundHit(o, d) {
    const w = this.G.world; let prev = 0;
    for (let t = 1; t < 900; t += t < 60 ? 1 : t < 300 ? 3 : 6) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; if (y < Math.max(w.height(x, z), WATER_Y)) { let a = prev, b = t; for (let i = 0; i < 8; i++) { const m = (a + b) / 2, yy = o.y + d.y * m; if (yy < Math.max(w.height(o.x + d.x * m, o.z + d.z * m), WATER_Y)) b = m; else a = m; } return { x: o.x + d.x * b, z: o.z + d.z * b }; } prev = t; }
    return null;
  }
  pinAt(x, z, from, tol = 6) {
    const G = this.G, near = this.pins.findIndex(p => p.place && Math.hypot(p.x - x, p.z - z) < tol);
    if (near >= 0) { const p = this.pins.splice(near, 1)[0]; G.ui.toast(`Pin ${p.n} taken off.`); return; }
    const y = Math.max(G.world.height(x, z), WATER_Y), p = { place: true, label: 'Pin', x, y, z, lost: false }, more = this.addPin(p);
    p.label = 'Pin ' + p.n;
    G.ui.toast(`Pinned the spot, ${fmtD(Math.hypot(x - G.player.pos.x, z - G.player.pos.z))} from you${more}.`);
  }
  pinLook() { const c = this.cam, d = c.getWorldDirection(this._f).clone(), h = this.groundHit(c.position, d); if (!h) { this.G.ui.toast('Look at the ground to pin a spot.'); return; } this.pinAt(h.x, h.z, 'look'); }
  pin(a) {
    const G = this.G; if (!a) { this.pinLook(); return; }
    const i = this.pins.findIndex(p => p.a === a); if (i >= 0) { this.pins.splice(i, 1); G.ui.toast(`Pin taken off the ${a.sp.label.toLowerCase()}.`); return; }
    const more = this.addPin({ a, label: a.sp.label, x: a.pos.x, y: a.pos.y, z: a.pos.z, lost: false });
    G.ui.toast(`Pinned: ${a.sp.label}, ${fmtD(Math.hypot(a.pos.x - G.player.pos.x, a.pos.z - G.player.pos.z))} from you. The pin follows it${more}.`);
  }
  update(dt, input, sens) {
    const G = this.G, P = G.player;
    // pins follow their animals; one you walk up to (or that wanders off the land you know) is cleared
    for (let i = this.pins.length - 1; i >= 0; i--) { const p = this.pins[i], a = p.a; if (p.place) continue;
      if (a && !a.gone) { p.x = a.pos.x; p.y = a.pos.y; p.z = a.pos.z; p.down = !alive(a); } else p.lost = true;
      if (!this.on && Math.hypot(p.x - P.pos.x, p.z - P.pos.z) < (p.down ? 3 : 8)) { this.pins.splice(i, 1); G.ui.toast(p.down ? `You reach the ${p.label.toLowerCase()}.` : `The ${p.label.toLowerCase()} should be right here.`); } }
    if (!this.on) { if (!this.landed) this.batt = Math.min(BATTERY, this.batt + dt * .9); return; }
    // look and zoom
    const k = .0022 * sens * (this.fov / 72);
    this.yaw -= input.lookX * k; this.pitch = Math.max(-1.52, Math.min(.5, this.pitch - input.lookY * k));
    if (input.wheel) this.fov = Math.max(12, Math.min(72, this.fov * (input.wheel > 0 ? 1.25 : .8)));
    // fly
    const mv = input.move(), fast = input.down('ShiftLeft') || input.down('ShiftRight') || input.touchRun, sp = fast ? 24 : 12;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    const wx = (fx * mv.y + rx * mv.x) * sp, wz = (fz * mv.y + rz * mv.x) * sp;
    if (input.hit('KeyX') || this.landReq) { this.landReq = false; this.landing = !this.landing; if (this.landing) G.ui.toast('Landing...'); }
    const up = this.landing ? -.75 : (input.down('Space') ? 1 : 0) - (input.down('KeyC') || input.down('ControlLeft') ? 1 : 0) + this.up;
    this.vel.x += (wx - this.vel.x) * Math.min(1, dt * 2.5); this.vel.z += (wz - this.vel.z) * Math.min(1, dt * 2.5); this.vy += (up * (fast ? 12 : 7) - this.vy) * Math.min(1, dt * 3);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt; this.pos.y += this.vy * dt;
    // tethered to you; kept off the ground and the water, and under the ceiling
    const dx = this.pos.x - P.pos.x, dz = this.pos.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d > RANGE) { this.pos.x = P.pos.x + dx / d * RANGE; this.pos.z = P.pos.z + dz / d * RANGE; }
    const gh = G.world.height(this.pos.x, this.pos.z), g = Math.max(gh, WATER_Y), lo = this.landing ? g + .02 : g + 1.8, hi = g + CEIL;
    if (this.landing && this.pos.y <= g + .25) {   // touchdown
      if (gh < WATER_Y + .05) { this.landing = false; this.pos.y = g + 1.8; G.ui.toast("Can't land on water."); }
      else { this.landed = { x: this.pos.x, y: gh, z: this.pos.z, yaw: this.yaw }; this.landing = false; this.showModel(true); this.recall(G.input.isTouch ? 'Drone landed. Drone flies it again from there; walk to it and tap Use to pack it.' : 'Drone landed. G flies it again from there; walk to it and press E to pack it.'); return; }
    }
    if (this.pos.y < lo) { this.pos.y = lo; this.vy = Math.max(0, this.vy); } if (this.pos.y > hi) { this.pos.y = hi; this.vy = Math.min(0, this.vy); }
    // a gentle hover wobble
    const t = G.gameTime;
    this.cam.position.set(this.pos.x, this.pos.y + Math.sin(t * 2.1) * .04, this.pos.z);
    this.cam.rotation.set(this.pitch + Math.sin(t * 1.3) * .002, this.yaw, (-this.vel.x * rx - this.vel.z * rz) * -.004, 'YXZ');
    if (Math.abs(this.cam.fov - this.fov) > .05) { this.cam.fov += (this.fov - this.cam.fov) * Math.min(1, dt * 10); this.cam.updateProjectionMatrix(); }
    if (input.hit('KeyN')) this.setVision(!this.nv);
    if (this.nv) this.applyVision(true);
    this.target = this.pick();
    if (input.clicked.has(0) || input.hit('KeyE') || input.touchFire) this.pin(this.target);
    this.batt -= dt; if (this.batt <= 0) { this.batt = 0; this.recall('The drone battery ran out. It flies home to your pack.'); return; }
    // the readout
    const alt = this.pos.y - g, pct = Math.round(this.battery * 100);
    $('#dronestat').innerHTML = `<span>Battery <b class="${pct < 20 ? 'low' : ''}">${pct}%</b></span><span>Height <b>${Math.round(alt)} m</b></span><span>From you <b>${Math.round(d)} m</b>${d > RANGE - 30 ? ' <em>signal edge</em>' : ''}</span><span>Zoom <b>${(72 / this.fov).toFixed(1)}x</b></span>`;
    const tg = this.target, tl = $('#dronetarget');
    if (tg) { const pinned = this.pins.some(p => p.a === tg); tl.textContent = `${tg.sp.label} · ${fmtD(Math.hypot(tg.pos.x - P.pos.x, tg.pos.z - P.pos.z))} from you · ${pinned ? 'pinned (click to unpin)' : input.isTouch ? 'tap Pin' : 'click to pin'}`; tl.classList.add('on'); this.el.classList.add('lock'); }
    else { tl.classList.remove('on'); this.el.classList.remove('lock'); }
  }
  // screen markers: pins (always, on foot and in the air) and, in night vision, the heat of every animal in view
  draw() {
    const G = this.G, cam = this.cam, P = G.player, w = innerWidth, h = innerHeight, show = G.state === 'play' || G.state === 'ui';
    while (this.pinEls.length < this.pins.length) { const e = document.createElement('div'); e.className = 'pin'; e.innerHTML = '<i></i><b></b><span></span>'; this.pinBox.appendChild(e); this.pinEls.push(e); }
    this.pinEls.forEach((e, i) => {
      const p = this.pins[i]; if (!p || !show) { e.style.display = 'none'; return; }
      if (p.place && !p.y) p.y = Math.max(G.world.height(p.x, p.z), WATER_Y);
      const v = this._v.set(p.x, p.y + 2.2, p.z).project(cam), behind = v.z > 1; let sx = (v.x * .5 + .5) * w, sy = (-v.y * .5 + .5) * h;
      const edge = behind || sx < 30 || sx > w - 30 || sy < 70 || sy > h - 40;
      if (edge) { let ex = sx - w / 2, ey = sy - h / 2; if (behind) { ex = -ex; ey = -ey; } const s = Math.min((w / 2 - 40) / Math.abs(ex || 1), (h / 2 - 60) / Math.abs(ey || 1)); sx = w / 2 + ex * s; sy = h / 2 + ey * s; }
      const d = Math.hypot(p.x - P.pos.x, p.z - P.pos.z);
      e.style.display = 'block'; e.style.transform = `translate(${sx | 0}px, ${sy | 0}px)`; e.classList.toggle('edge', edge); e.classList.toggle('down', !!p.down);
      e.children[1].textContent = p.n; e.children[2].textContent = `${p.label}${p.down ? ' (down)' : p.lost ? ' (last seen)' : ''} · ${fmtD(d)}`;
    });
    let n = 0;
    if (this.on && this.nv) for (const a of G.wildlife.animals) {
      if (!alive(a) || n >= 30) continue; const v = this._v.set(a.pos.x, a.pos.y + .6 * a.scale, a.pos.z); if (v.distanceTo(cam.position) > 600) continue;
      v.project(cam); if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue;
      let e = this.heatEls[n]; if (!e) { e = document.createElement('i'); this.heatBox.appendChild(e); this.heatEls.push(e); }
      e.style.display = 'block'; e.style.transform = `translate(${((v.x * .5 + .5) * w) | 0}px, ${((-v.y * .5 + .5) * h) | 0}px)`; e.className = a.sp.predator ? 'hot' : ''; n++;
    }
    for (let i = n; i < this.heatEls.length; i++) this.heatEls[i].style.display = 'none';
  }
  save() { return { batt: this.batt, nv: this.nv, landed: this.landed, pins: this.pins.map(p => ({ n: p.n, label: p.label, x: p.x, y: p.y, z: p.z, place: !!p.place, lost: !p.place })) }; }
  load(d) { if (!d) return; this.batt = d.batt ?? BATTERY; this.nv = !!d.nv; this.pins = d.pins || []; this.landed = d.landed || null; this.showModel(true); }
  reset() { if (this.on) this.recall(); this.batt = BATTERY; this.pins = []; this.landed = null; this.landing = false; this.showModel(false); }
}
