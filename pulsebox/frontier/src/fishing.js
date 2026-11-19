// Fishing. With the rod in hand at the water's edge, hold the trigger and let go to cast (the longer you hold, the
// further the float flies). Watch the float: a nibble twitches it, a bite drags it under. Click then to set the hook.
// The fight: hold to reel in (the line tightens), ease off when the fish runs or the line snaps. Land it and it is
// yours: meat for the spit and coins by the pound. What bites depends on the water: lake, river, shallows or deep.
import * as THREE from 'three';
import { WATER_Y } from './world.js';

export const FISH = {
  perch: { name: 'Yellow perch', lb: [.4, 1.6], fight: .3, pay: 2.4, col: 0xb8a040, belly: 0xe8dcb0, bars: 1 },
  brook: { name: 'Brook trout', lb: [.6, 3.2], fight: .5, pay: 2.2, col: 0x4a5a3a, belly: 0xd88a50, spots: 1 },
  bass: { name: 'Smallmouth bass', lb: [1, 5.5], fight: .62, pay: 1.8, col: 0x6a5a30, belly: 0xd8ccaa, bars: 1 },
  pike: { name: 'Northern pike', lb: [3, 19], fight: .78, pay: 1.5, col: 0x3a5a2a, belly: 0xd8d4a8, spots: 1, long: 1 },
  laketrout: { name: 'Lake trout', lb: [4, 24], fight: .72, pay: 1.6, col: 0x4a5258, belly: 0xe0dcd0, spots: 1 },
  catfish: { name: 'Channel catfish', lb: [2, 17], fight: .7, pay: 1.4, col: 0x5a5a58, belly: 0xd8d8cc },
  sturgeon: { name: 'Lake sturgeon', lb: [22, 75], fight: 1.0, pay: 1.3, col: 0x4a463e, belly: 0xb8b0a0, long: 1 },
};
const rand = (a, b) => a + Math.random() * (b - a);

function fishModel(f) {
  const g = new THREE.Group(), L = f.long ? 1.35 : 1;
  const tex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#' + f.col.toString(16).padStart(6, '0')); gr.addColorStop(.55, '#' + f.col.toString(16).padStart(6, '0')); gr.addColorStop(1, '#' + f.belly.toString(16).padStart(6, '0')); x.fillStyle = gr; x.fillRect(0, 0, 128, 64);
    if (f.spots) for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(${200 + Math.random() * 55},${180 + Math.random() * 60},${120 + Math.random() * 60},.55)`; x.beginPath(); x.arc(Math.random() * 128, Math.random() * 38, 1 + Math.random() * 2, 0, 7); x.fill(); }
    if (f.bars) for (let i = 0; i < 7; i++) { x.fillStyle = 'rgba(20,24,10,.35)'; x.fillRect(14 + i * 15, 0, 6, 40); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: .35, metalness: .25 }), fin = new THREE.MeshStandardMaterial({ color: f.col, roughness: .6, side: THREE.DoubleSide, transparent: true, opacity: .85 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.5, 20, 12), m); body.scale.set(.14, .2, .5 * L); g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.1, .14, 3), fin); tail.rotation.x = -Math.PI / 2; tail.scale.set(.25, 1, 1.2); tail.position.z = -.3 * L; g.add(tail);
  const dors = new THREE.Mesh(new THREE.ConeGeometry(.04, .1, 3), fin); dors.scale.set(.2, 1, 1.6); dors.position.set(0, .1, .02); g.add(dors);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), new THREE.MeshStandardMaterial({ color: 0x080808, roughness: .1 })); for (const s of [1, -1]) { const e = eye.clone(); e.position.set(s * .06, .03, .2 * L); g.add(e); }
  return g;
}

export class Fishing {
  constructor(G, scene, camera, audio) {
    this.G = G; this.scene = scene; this.cam = camera; this.audio = audio;
    this.state = 'idle'; this.t = 0; this.power = 0; this.rodPitch = 0; this.caught = 0; this.best = null;
    const bob = this.bob = new THREE.Group();
    const top = new THREE.Mesh(new THREE.SphereGeometry(.05, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc8261a, roughness: .4 }));
    const bot = new THREE.Mesh(new THREE.SphereGeometry(.05, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2eee4, roughness: .4 }));
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .09, 6), new THREE.MeshStandardMaterial({ color: 0x2a1a10 })); stick.position.y = .07;
    bob.add(top, bot, stick); bob.visible = false; scene.add(bob);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(.06, .1, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); this.ring.rotation.x = -Math.PI / 2; scene.add(this.ring); this.ringT = 0;
    const N = 28; this.lineGeo = new THREE.BufferGeometry(); this.lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    this.line = new THREE.Line(this.lineGeo, new THREE.LineBasicMaterial({ color: 0xe6e2d6, transparent: true, opacity: .75 })); this.line.frustumCulled = false; this.line.visible = false; scene.add(this.line); this.N = N;
    this.bobPos = new THREE.Vector3(); this.tip = new THREE.Vector3(); this.held = null; this.heldT = 0; this.jump = null;
    this.ui = document.querySelector('#fishbar');
  }
  get busy() { return this.state !== 'idle'; }
  get caughtLabel() { return this.caught ? `${this.caught} fish` : ''; }
  stow() { this.reset(); }
  reset() { this.state = 'idle'; this.bob.visible = false; this.line.visible = false; this.power = 0; this.fish = null; this.ui.hidden = true; }
  toast(s) { this.G.ui.toast(s); }
  // where a cast of `d` metres lands: the furthest open water along your line of sight, if there is any
  landing(d) {
    const P = this.G.player, w = this.G.world, yaw = P.yaw, dx = -Math.sin(yaw), dz = -Math.cos(yaw); let best = null;
    for (let r = 3; r <= d; r += .5) { const x = P.pos.x + dx * r, z = P.pos.z + dz * r; if (w.height(x, z) < WATER_Y - .45) best = { x, z, r }; }
    return best;
  }
  // what is down there: by the kind of water and its depth
  pick(x, z) {
    const w = this.G.world, s = w.sample(x, z, {}), depth = WATER_Y - s.h, river = s.river > .5 && s.lake < .2, R = Math.random();
    if (river) return R < .45 ? 'brook' : R < .78 ? 'bass' : 'catfish';
    if (depth > 4.5) return R < .04 ? 'sturgeon' : R < .4 ? 'laketrout' : R < .72 ? 'pike' : 'perch';
    return R < .4 ? 'perch' : R < .7 ? 'bass' : R < .9 ? 'pike' : 'catfish';
  }
  update(dt, input, m, ready) {
    const G = this.G, down = input.mouseDown[0] || input.touchFire, press = input.clicked.has(0) || input.touchFire;
    m.tip.updateMatrixWorld(true); m.tip.getWorldPosition(this.tip);
    this.t += dt; const st = this.state;
    let pitch = 0;
    if (st === 'idle' && ready && press) { this.state = 'charge'; this.power = input.isTouch ? .65 : 0; }
    if (this.state === 'charge') {
      this.power = Math.min(1, this.power + dt * .8); pitch = -.6 * this.power;
      if (!input.mouseDown[0] || input.isTouch) { const d = 7 + this.power * 24, L = this.landing(d);
        if (!L) { this.toast('Face open water to cast. Walk to the shore of a lake or river.'); this.state = 'idle'; }
        else { this.state = 'cast'; this.flyT = 0; this.flyD = L; this.from = this.tip.clone(); this.bob.visible = true; this.line.visible = true; this.audio.mech('cock'); this.fishKind = this.pick(L.x, L.z); this.nibbles = Math.floor(Math.random() * 3); this.tries = 2;
          const h = G.sky.hours, dawn = (h > 5 && h < 9) || (h > 17 && h < 21) ? .65 : 1, lake = G.spawn === 'lake' ? .7 : 1; this.waitT = rand(4, 14) * dawn * lake; }
      }
    }
    if (this.state === 'cast') {
      this.flyT += dt / .7; const k = Math.min(1, this.flyT), L = this.flyD; pitch = .35 * (1 - k);
      this.bobPos.set(this.from.x + (L.x - this.from.x) * k, this.from.y + (WATER_Y - this.from.y) * k + Math.sin(k * Math.PI) * (2 + L.r * .08), this.from.z + (L.z - this.from.z) * k);
      if (k >= 1) { this.state = 'wait'; this.splash(.3); this.audio.splash(false); }
    }
    if (this.state === 'wait' || this.state === 'bite') {
      this.waitT -= dt; const L = this.flyD; this.bobPos.set(L.x, WATER_Y + Math.sin(this.t * 2.1) * .01, L.z);
      if (this.state === 'wait' && this.waitT < 0) { if (this.nibbles > 0) { this.nibbles--; this.twitch = .35; this.waitT = rand(1.2, 3.5); this.audio.splash(false, 0); } else { this.state = 'bite'; this.biteT = 1.35; this.audio.splash(true); this.splash(.6); } }
      if (this.twitch > 0) { this.twitch -= dt; this.bobPos.y -= Math.sin(this.twitch / .35 * Math.PI * 3) * .03; }
      if (this.state === 'bite') { this.biteT -= dt; this.bobPos.y -= .12; if (press) return this.hook(); if (this.biteT < 0) { this.tries--; this.toast(this.tries > 0 ? 'Missed it. Something took the bait and let go. Wait for another bite.' : 'It stole your bait. Reel in and cast again.'); if (this.tries > 0) { this.state = 'wait'; this.waitT = rand(3, 9); this.nibbles = 1; } else this.state = 'reelin'; } }
      else if (press && this.waitT > .2 && this.state === 'wait') { this.toast('Too soon: wait for the float to go under.'); this.state = 'reelin'; }
    }
    if (this.state === 'reelin') { const v = new THREE.Vector3().subVectors(this.tip, this.bobPos); v.y = 0; const d = v.length(); if (d < 2.5) return this.reset(); this.bobPos.addScaledVector(v.normalize(), Math.min(d, dt * 9)); this.bobPos.y = WATER_Y; this.audio.reel(Math.random() < .5); }
    if (this.state === 'fight') { pitch = this.fightStep(dt, input); }
    this.rodPitch += (pitch - this.rodPitch) * Math.min(1, dt * 8);
  }
  hook() {
    const f = FISH[this.fishKind]; this.state = 'fight'; this.fish = { kind: this.fishKind, f, lb: Math.round(rand(f.lb[0], f.lb[1]) * Math.pow(Math.random(), .6) * 10) / 10 || f.lb[0], dist: this.flyD.r, tension: .2, stamina: 1, run: 0, runT: 1 };
    this.fish.lb = Math.max(f.lb[0], this.fish.lb); this.ui.hidden = false; this.audio.splash(true); this.splash(.8);
    this.toast(this.fish.lb > 12 ? 'Fish on! Something heavy. Hold to reel, ease off when it runs.' : 'Fish on! Hold to reel; ease off when the line goes tight.');
  }
  fightStep(dt, input) {
    const F = this.fish, f = F.f, heavy = 1 + F.lb / 18;
    F.runT -= dt; if (F.runT < 0) { F.run = Math.random() < .45 + f.fight * .3 ? rand(.6, 1) * f.fight * F.stamina : 0; F.runT = rand(.8, 2.2); if (F.run > .55 && Math.random() < .4) this.leap(); }
    const reel = input.mouseDown[0] || (input.isTouch && input.touchFire);
    if (reel) { F.dist -= dt * (input.isTouch ? 6 : 2.4) * (1 - F.run * .7); F.tension += dt * (.35 + F.run * 1.25) * heavy * .7; this.audio.reel(Math.random() < .6); }
    else { F.tension -= dt * 1.1; F.dist += dt * F.run * 2.2; }
    F.tension = Math.max(0, F.tension); F.stamina = Math.max(.15, F.stamina - dt * (.04 + F.tension * .09) / heavy);
    // the float follows the fish in toward you
    const P = this.G.player, v = new THREE.Vector3(this.bobPos.x - P.pos.x, 0, this.bobPos.z - P.pos.z).normalize();
    this.bobPos.set(P.pos.x + v.x * Math.max(1.5, F.dist), WATER_Y - .1 - F.run * .1, P.pos.z + v.z * Math.max(1.5, F.dist));
    if (this.G.world.height(this.bobPos.x, this.bobPos.z) > WATER_Y - .1) F.dist = Math.min(F.dist, 1.4);   // up into the shallows: it is yours
    // the bar: how tight, and how far
    this.ui.querySelector('i').style.width = Math.min(100, F.tension * 100) + '%'; this.ui.classList.toggle('hot', F.tension > .75); this.ui.querySelector('b').textContent = `${Math.max(0, F.dist).toFixed(0)} m`;
    if (F.tension >= 1) { this.audio.mech('cock'); this.toast(F.lb > 10 ? 'Snap! The line parts. A big one got away.' : 'Snap! The line parts and the fish is gone.'); this.reset(); return 0; }
    if (F.dist > 45) { this.toast('It ran all your line out and broke off.'); this.reset(); return 0; }
    if (F.dist <= 1.6) { this.land(); return 0; }
    return -.45 - F.tension * .3 + Math.sin(this.t * 13) * .03 * F.run;
  }
  land() {
    const F = this.fish, f = F.f, G = this.G, coins = Math.max(1, Math.round(F.lb * f.pay));
    G.coins += coins; this.caught++; G.stats.taken[f.name.toLowerCase()] = (G.stats.taken[f.name.toLowerCase()] || 0) + 1;
    const meat = f.name.split(' ').pop().toLowerCase(), lb = Math.max(.5, Math.round(F.lb * .5 * 10) / 10); G.life.addMeat(G.life.pack.meat, meat, lb, 'raw');
    if (!this.best || F.lb > this.best.lb) this.best = { name: f.name, lb: F.lb };
    this.toast(`A ${F.lb} lb ${f.name.toLowerCase()}! +${coins} coins, and ${lb} lb of fish for the spit.`);
    if (G.coinPop) G.coinPop(coins);
    // hold it up to look at
    if (this.held) this.cam.remove(this.held); this.held = fishModel(f); const s = Math.pow(F.lb / 3, .33) * .9; this.held.scale.setScalar(s); this.held.position.set(.05, -.12, -.55); this.held.rotation.set(.1, Math.PI / 2 + .3, .15); this.cam.add(this.held); this.heldT = 2.6;
    this.held.traverse(o => { if (o.isMesh) o.renderOrder = 11; });
    this.audio.splash(true); this.reset();
  }
  leap() { const f = this.fish; if (!f) return; if (this.jump) this.scene.remove(this.jump.m); const m = fishModel(f.f); m.scale.setScalar(Math.pow(f.lb / 3, .33) * .9); this.scene.add(m); this.jump = { m, t: 0, p: this.bobPos.clone(), yaw: Math.random() * 6 }; this.audio.splash(true); this.splash(.9); }
  splash(k) { this.ring.position.set(this.bobPos.x, WATER_Y + .01, this.bobPos.z); this.ringT = 1; this.ringK = k; }
  // every frame: the float, the line and the ripples, and a landed fish held up to see
  tick(dt) {
    if (this.bob.visible) {
      this.bob.position.copy(this.bobPos);
      const p = this.lineGeo.attributes.position, a = this.tip, b = this.bobPos, d = a.distanceTo(b), slack = this.state === 'fight' ? .05 + (1 - Math.min(1, this.fish ? this.fish.tension * 1.3 : 0)) * .2 : this.state === 'cast' ? .02 : .35;
      for (let i = 0; i < this.N; i++) { const t = i / (this.N - 1); p.setXYZ(i, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * d * slack * .25, a.z + (b.z - a.z) * t); }
      p.needsUpdate = true; this.lineGeo.computeBoundingSphere();
    }
    if (this.ringT > 0) { this.ringT -= dt * .8; const k = 1 - this.ringT; this.ring.scale.setScalar(1 + k * 8 * (this.ringK || .5)); this.ring.material.opacity = Math.max(0, this.ringT) * .5; }
    if (this.jump) { const J = this.jump; J.t += dt; const k = J.t / .7; J.m.position.set(J.p.x, WATER_Y + Math.sin(Math.min(1, k) * Math.PI) * .9, J.p.z); J.m.rotation.set(-Math.cos(k * Math.PI) * 1.1, J.yaw, Math.sin(J.t * 20) * .3); if (k >= 1) { this.scene.remove(J.m); this.jump = null; } }
    if (this.held) { this.heldT -= dt; this.held.rotation.z = .15 + Math.sin(this.heldT * 9) * .12 * Math.max(0, this.heldT - 1); if (this.heldT <= 0) { this.cam.remove(this.held); this.held = null; } }
  }
  save() { return { caught: this.caught, best: this.best }; }
  load(d) { if (!d) return; this.caught = d.caught || 0; this.best = d.best || null; }
}
