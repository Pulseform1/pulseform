// The scout drone (G): send it up from where you stand and fly it out over the country to look for game.
// Day vision is the plain camera; night vision (N) brightens the dark to a green picture and shows the body heat of
// every animal in view as a small marker. Put the centre ring on an animal and click (or E) to pin it: the pin
// follows that animal and stays on your screen, the compass and the map once you are back on foot, so you can walk
// straight to it. The battery runs down in the air and charges again while the drone is packed; while you fly, you
// stand still and blind where you left yourself, so mind the wolves.
import * as THREE from 'three';
import { WATER_Y } from './world.js';

const $ = s => document.querySelector(s);
const RANGE = 520, BATTERY = 150, CEIL = 170, MAXPINS = 3;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const alive = a => a && !a.gone && a.state !== 'down' && a.state !== 'dead' && a.state !== 'fallfly';
const fmtD = d => d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m';

export class Drone {
  constructor(G, camera, renderer) {
    this.G = G; this.cam = camera; this.r = renderer; this.on = false; this.batt = BATTERY; this.nv = false; this.pins = [];
    this.pos = V(); this.vel = V(); this.yaw = 0; this.pitch = 0; this.vy = 0; this.fov = 72; this.target = null; this.up = 0;
    this.el = $('#drone'); this.pinBox = $('#pins'); this.heatBox = $('#heat'); this.pinEls = []; this.heatEls = []; this._v = V(); this._f = V();
    this.baseExposure = renderer.toneMappingExposure;
  }
  get battery() { return this.batt / BATTERY; }
  toggle() { if (this.on) this.recall(); else this.launch(); }
  launch() {
    const G = this.G, P = G.player;
    if (G.dead || P.seated || P.sleeping) return;
    if (P.swimming) { G.ui.toast('Not while you are swimming.'); return; }
    if (this.batt < 8) { G.ui.toast('The drone battery is flat. It charges while it is packed away.'); return; }
    this.on = true; this.pos.set(P.pos.x, P.pos.y + 2.4, P.pos.z); this.vel.set(0, 0, 0); this.vy = 3; this.yaw = P.yaw; this.pitch = -.3; this.fov = 72;
    P.frozen = true; P.vel.set(0, 0, 0); G.weapons.root.visible = false; G.handL.visible = false;
    this.el.hidden = false; this.setVision(this.nv);
    G.ui.toast(G.input.isTouch ? 'Drone up. Drag to fly and look; Pin marks the animal in the ring.' : 'Drone up. WASD fly, Space up, C down, wheel zoom, N night vision, click to pin, G to bring it back.');
  }
  recall(why) {
    if (!this.on) return; const G = this.G;
    this.on = false; G.player.frozen = false; G.weapons.root.visible = true; this.el.hidden = true; this.applyVision(false); this.up = 0;
    this.cam.fov = 72; this.cam.updateProjectionMatrix(); G.player.applyCamera(); this.target = null;
    if (why) G.ui.toast(why); else if (this.pins.length) G.ui.toast(`Drone packed. Follow the pin${this.pins.length > 1 ? 's' : ''} to the game.`);
  }
  setVision(nv) { this.nv = nv; this.applyVision(this.on && nv); $('#dronemode').textContent = nv ? 'NIGHT VISION' : 'DAY VISION'; }
  applyVision(on) {
    this.r.toneMappingExposure = on ? this.baseExposure * (1.25 + 2.6 * this.G.sky.night) : this.baseExposure;
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
  pin(a) {
    const G = this.G; if (!a) { G.ui.toast('Nothing in the ring. Centre an animal, then pin it.'); return; }
    const i = this.pins.findIndex(p => p.a === a); if (i >= 0) { this.pins.splice(i, 1); G.ui.toast(`Pin taken off the ${a.sp.label.toLowerCase()}.`); return; }
    if (this.pins.length >= MAXPINS) this.pins.shift();
    const n = (this.pins.reduce((m, p) => Math.max(m, p.n), 0) % 9) + 1;
    this.pins.push({ a, n, label: a.sp.label, x: a.pos.x, y: a.pos.y, z: a.pos.z, lost: false });
    G.ui.toast(`Pinned: ${a.sp.label}, ${fmtD(Math.hypot(a.pos.x - G.player.pos.x, a.pos.z - G.player.pos.z))} from you. The pin follows it.`);
  }
  update(dt, input, sens) {
    const G = this.G, P = G.player;
    // pins follow their animals; one you walk up to (or that wanders off the land you know) is cleared
    for (let i = this.pins.length - 1; i >= 0; i--) { const p = this.pins[i], a = p.a;
      if (a && !a.gone) { p.x = a.pos.x; p.y = a.pos.y; p.z = a.pos.z; p.down = !alive(a); } else p.lost = true;
      if (!this.on && Math.hypot(p.x - P.pos.x, p.z - P.pos.z) < (p.down ? 3 : 8)) { this.pins.splice(i, 1); G.ui.toast(p.down ? `You reach the ${p.label.toLowerCase()}.` : `The ${p.label.toLowerCase()} should be right here.`); } }
    if (!this.on) { this.batt = Math.min(BATTERY, this.batt + dt * .9); return; }
    // look and zoom
    const k = .0022 * sens * (this.fov / 72);
    this.yaw -= input.lookX * k; this.pitch = Math.max(-1.52, Math.min(.5, this.pitch - input.lookY * k));
    if (input.wheel) this.fov = Math.max(12, Math.min(72, this.fov * (input.wheel > 0 ? 1.25 : .8)));
    // fly
    const mv = input.move(), fast = input.down('ShiftLeft') || input.down('ShiftRight') || input.touchRun, sp = fast ? 24 : 12;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    const wx = (fx * mv.y + rx * mv.x) * sp, wz = (fz * mv.y + rz * mv.x) * sp;
    const up = (input.down('Space') ? 1 : 0) - (input.down('KeyC') || input.down('ControlLeft') ? 1 : 0) + this.up;
    this.vel.x += (wx - this.vel.x) * Math.min(1, dt * 2.5); this.vel.z += (wz - this.vel.z) * Math.min(1, dt * 2.5); this.vy += (up * (fast ? 12 : 7) - this.vy) * Math.min(1, dt * 3);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt; this.pos.y += this.vy * dt;
    // tethered to you; kept off the ground and the water, and under the ceiling
    const dx = this.pos.x - P.pos.x, dz = this.pos.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d > RANGE) { this.pos.x = P.pos.x + dx / d * RANGE; this.pos.z = P.pos.z + dz / d * RANGE; }
    const g = Math.max(G.world.height(this.pos.x, this.pos.z), WATER_Y), lo = g + 1.8, hi = g + CEIL;
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
  save() { return { batt: this.batt, nv: this.nv, pins: this.pins.map(p => ({ n: p.n, label: p.label, x: p.x, y: p.y, z: p.z, lost: true })) }; }
  load(d) { if (!d) return; this.batt = d.batt ?? BATTERY; this.nv = !!d.nv; this.pins = d.pins || []; }
  reset() { if (this.on) this.recall(); this.batt = BATTERY; this.pins = []; }
}
