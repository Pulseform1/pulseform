// Wildlife: herds that graze, wander, bed down and go to water by the clock; notice you by sight, sound and scent
// (downwind of you they smell you); stare, then bolt. Some fight: a grizzly rears, roars and charges home, then mauls;
// a moose runs you down; a cougar stalks you from behind, freezes when you turn, and springs from close in; wolves
// circle and rush in one at a time. A wounded predator comes for you. Ducks paddle and take off.
// Groups are spawned in suitable country around the player and removed far behind. Shot animals fold and lie
// still (no blood) until you harvest them.
import * as THREE from 'three';
import { SPECIES, makeAnimal, pose } from './animals.js';

const TAU = Math.PI * 2;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
// how likely each kind is to be up and about at an hour
const ACTIVE = {
  deer: h => (h > 5 && h < 10) || (h > 16 && h < 21.5) ? 1 : h > 10 && h < 16 ? .45 : .2,
  elk: h => (h > 5 && h < 10.5) || (h > 15.5 && h < 21) ? 1 : h > 10 && h < 16 ? .5 : .25,
  moose: h => (h > 5 && h < 11) || (h > 15 && h < 21) ? 1 : .4,
  bison: h => h > 6 && h < 19.5 ? 1 : .2,
  bear: h => h > 6.5 && h < 20 ? 1 : .3,
  rabbit: h => h > 17 || h < 8.5 ? 1 : .35,
  turkey: h => h > 6 && h < 18.5 ? 1 : 0,
  duck: h => h > 5.5 && h < 20 ? 1 : .4,
  cougar: h => h < 8 || h > 17.5 ? 1 : .55,
  goat: h => h > 6 && h < 19.5 ? 1 : .35,
  wolf: h => h < 8.5 || h > 17 ? 1 : .5,
};
const FAR = 900;   // how far an animal is still drawn and kept: far enough to glass a goat on the mountain

// Where a shot lands matters: each zone does its own damage, and a broken shoulder, hip or leg makes the animal limp.
const ZONES = {
  head: { k: 'head', label: 'Head', mult: 4, vital: true }, neck: { k: 'neck', label: 'Neck', mult: 2.6, vital: true },
  heart: { k: 'heart', label: 'Heart & lungs', mult: 3, vital: true }, shoulder: { k: 'shoulder', label: 'Shoulder', mult: 1.8, lame: .3 },
  gut: { k: 'gut', label: 'Gut', mult: 1 }, hind: { k: 'hind', label: 'Hindquarter', mult: 1.3, lame: .25 }, leg: { k: 'leg', label: 'Leg', mult: .6, lame: .35 },
};
// the animals are drawn about two and a half times life size (the small game a little more), so a shot can be placed
const SIZE = { rabbit: 2.8, duck: 2.6, turkey: 2.6 };
class Animal {
  constructor(W, kind, x, z, group, rnd) {
    this.W = W; this.kind = kind; this.sp = SPECIES[kind]; this.group = group;
    const m = this.m = makeAnimal(kind, rnd);
    this.size = SIZE[kind] || 2.4; this.reach = .6 + .4 * this.size; this.lame = 0;
    this.scale = (this.sp.scale[0] + (this.sp.scale[1] - this.sp.scale[0]) * ((rnd * 7.3) % 1)) * this.size;
    m.mesh.scale.setScalar(this.scale); m.mesh.rotation.order = 'YXZ'; W.scene.add(m.mesh);
    this.pos = new THREE.Vector3(x, 0, z); this.yaw = Math.random() * TAU; this.speed = 0; this.phase = Math.random();
    this.state = 'graze'; this.t = Math.random() * 5; this.stateT = 3 + Math.random() * 6; this.aware = 0; this.hp = this.sp.hp; this.wounded = false;
    this.headDown = 0; this.alertK = 0; this.lie = 0; this.fall = 0; this.roll = 0; this.flap = 0; this.fly = 0; this.vy = 0;
    this.slot = new THREE.Vector2((Math.random() - .5) * 2, (Math.random() - .5) * 2).multiplyScalar(group.spread);
    this.look = 0; this.lookT = 0; this.display = 0; this.called = 0; this.jawK = 0; this.crouchK = 0; this.swipe = 0; this.atkT = 0; this.strikes = 0; this.roarT = 0;
    this.ground();
  }
  get L() { return (this.m.rig.dims.chest?.z ?? .3) * 2 * this.scale; }
  ground() {
    const w = this.W.world, h = w.height(this.pos.x, this.pos.z);
    if (this.sp.swim && h < -.15 && this.state !== 'fly') this.pos.y = 0;
    else if (this.state !== 'fly' && this.state !== 'fallfly') this.pos.y = h;
    return h;
  }
  canGo(x, z) {
    const w = this.W.world, h = w.height(x, z);
    if (this.sp.swim) return h < -.2; // ducks keep to the water
    if (h < (this.sp.water ? -1.1 : -.25)) return false;
    // steers by about its real footprint, so the bigger look does not wedge it in the trees
    let blocked = false; this.W.flora.near(x, z, .42 * this.scale / this.size, () => { blocked = true; }); if (blocked) return false;
    const n = w.normal(x, z, this._n || (this._n = [0, 1, 0]), 1.5); if (n[1] < (this.sp.climber ? .3 : this.sp.predator === 'cougar' ? .55 : .72)) return false;
    const c = this.W.camp; if (c && Math.hypot(x - c.c.x, z - c.c.z) < 12) return false;
    return true;
  }
  steer(tx, tz, speed, dt, turn = 2.5) {
    let want = Math.atan2(tx - this.pos.x, tz - this.pos.z);
    // feel ahead for trees, water and cliffs, and swing around them
    const look = 1.6 + speed * .45;
    for (const off of [0, .5, -.5, 1, -1, 1.6, -1.6, 2.4, -2.4]) {
      const a = want + off * (this._side || 1), x = this.pos.x + Math.sin(a) * look, z = this.pos.z + Math.cos(a) * look;
      // clear just ahead as well as further on (a trunk can sit between the two)
      if (this.canGo(x, z) && this.canGo(this.pos.x + Math.sin(a) * .7, this.pos.z + Math.cos(a) * .7)) { want = a; if (off) this._side = Math.sign(off) * (this._side || 1); break; }
      if (off === -2.4) { want = this.yaw + Math.PI; }
    }
    this.yaw += Math.max(-turn * dt, Math.min(turn * dt, angDiff(this.yaw, want)));
    this.speed += (speed - this.speed) * Math.min(1, dt * 3);
  }
  move(dt) {
    if (this.lame > .5 && this.state !== 'down' && this.state !== 'dead') this.speed = Math.min(this.speed, this.sp.walk * .6);   // badly wounded: it can only limp
    if (this.speed < .01) return;
    const nx = this.pos.x + Math.sin(this.yaw) * this.speed * dt, nz = this.pos.z + Math.cos(this.yaw) * this.speed * dt;
    if (this.state === 'flee' || this.canGo(nx, nz) || !this.canGo(this.pos.x, this.pos.z)) { this.pos.x = nx; this.pos.z = nz; }
    else { this.speed *= .5; this.yaw += (this._side || 1) * .5; }   // up against something: turn off it
  }
  perceive(dt, P) {
    const dx = this.pos.x - P.pos.x, dz = this.pos.z - P.pos.z, d = Math.hypot(dx, dz); this.dist = d;
    if (d > 260) { this.aware = Math.max(0, this.aware - dt * .2); return; }
    const sp = this.sp, fwd = [Math.sin(this.yaw), Math.cos(this.yaw)], to = [-dx / d, -dz / d];
    const facing = fwd[0] * to[0] + fwd[1] * to[1] > -.35;
    const hearR = (10 + 48 * P.noise) * sp.hear, sightR = sp.sight * (P.night ? (P.lantern ? .9 : .4) : 1) * (P.crouched ? .55 : 1) * (P.moving ? 1 : .45) * (P.hidden ? (P.crouched ? .3 : .55) : 1);   // the super-tall grass hides you
    const w = P.wind, scent = d < 85 && (w.x * dx + w.z * dz) / d > .65;
    let stim = 0;
    if (d < hearR) stim += (1 - d / hearR) * 2.2;
    if (facing && d < sightR) stim += (1 - d / sightR) * (this.state === 'graze' || this.state === 'drink' ? .8 : 1.8);
    if (scent) stim += 1.2 * (1 - d / 85);
    if (d < 6) stim += 3;
    this.aware = Math.max(0, Math.min(2, this.aware + stim * dt * sp.wary * .9 - dt * .12));
  }
  setState(s, t) { this.state = s; this.stateT = t; }
  update(dt, P, hours) {
    const sp = this.sp, g = this.group; this.t += dt;
    if (this.state === 'down' || this.state === 'dead' || this.state === 'fallfly') return this.updateDown(dt);
    this.perceive(dt, P);
    const act = ACTIVE[this.kind](hours), lead = g.leader === this ? null : g.leader;
    if (this.fight(dt, P)) return this.finish(dt);
    // a den bear: anyone who comes onto its ground (or that it sees close by) is charged, for real, every time
    if (this.den && !P.dead && this.state !== 'charge' && this.state !== 'rear' && this.state !== 'attack' && !(this.state === 'flee' && this.homing)) {
      const dd = Math.hypot(P.pos.x - this.den.x, P.pos.z - this.den.z);
      if (dd < this.den.R || (this.dist < 40 && this.aware > .5)) { this.real = true; this.mad = true; this.homing = false; g.charged = true; this.setState('rear', .9); this.W.call('roar', this); if (this.W.onDen) this.W.onDen(this); }
    }
    // the group bolts together
    if (g.fleeUntil > this.W.time && !this.mad && this.state !== 'flee' && this.state !== 'charge' && this.state !== 'rear' && this.state !== 'fly') this.startFlee(P, g.fleeFrom);
    if (this.state !== 'flee' && this.state !== 'charge' && this.state !== 'rear' && this.state !== 'fly') {
      if (this.aware > 1 || (this.wounded && this.aware > .2)) {
        if (sp.bear && !g.charged && this.dist < 45) { g.charged = true; this.real = Math.random() < .75 || this.wounded; this.setState('rear', 1.4); this.W.call('roar', this); }
        else if (sp.ornery && this.dist < 30 && (this.m.male || this.wounded || Math.random() < .4) && !g.charged) { g.charged = true; this.real = true; this.setState('charge', 6); this.W.call('bellow', this); }
        else if (sp.predator && !this.fled && this.dist < 30 && Math.random() < .5) { this.real = true; this.setState('charge', 5); this.W.call(sp.predator === 'wolf' ? 'snarl' : 'scream', this); }
        else { this.W.alarm(g, P.pos); this.startFlee(P, P.pos); }
      } else if (this.aware > .35 && this.state !== 'alert') { this.setState('alert', 2 + Math.random() * 3); if (sp.name === 'deer' && Math.random() < .5) this.W.call('snort', this); }
    }
    this.stateT -= dt;
    let gait = 'stand', head = 0, alertK = 0, lie = 0;
    switch (this.state) {
      case 'alert': {
        const want = Math.atan2(P.pos.x - this.pos.x, P.pos.z - this.pos.z); this.yaw += Math.max(-dt, Math.min(dt, angDiff(this.yaw, want))) * .8;
        alertK = 1; this.speed *= .9; if (this.stateT < 0) this.setState(this.aware > .3 ? 'alert' : 'graze', 3);
        if (sp.name === 'turkey') this.display = Math.min(1, this.display + dt);
        break;
      }
      case 'flee': {
        const fx = this.fleeTo.x, fz = this.fleeTo.y;
        if (sp.swim) { this.setState('fly', 12); break; }
        this.steer(fx, fz, (this.wounded ? .75 : 1) * (1 - this.lame) * sp.run * (this.stateT > 2 ? 1 : .7), dt, 4);
        gait = 'run'; if (this.stateT < 0 || Math.hypot(fx - this.pos.x, fz - this.pos.z) < 6) { this.setState('alert', 4); this.aware = .5; if (this.homing) { this.homing = false; this.aware = 0; } }
        break;
      }
      case 'rear': { alertK = 1; this.speed *= .8; this.rear = Math.min(1, (this.rear || 0) + dt * 2); this.jawK = 1; if (this.stateT < 0) { this.rear = 0; this.setState('charge', this.real ? 9 : 3.5); this.W.call('roar', this); } break; }
      case 'charge': {
        this.steer(P.pos.x, P.pos.z, (1 - this.lame) * sp.run * (sp.ornery ? .8 : .9) * (this.mad ? 1.12 : 1), dt, 5); gait = 'run'; this.jawK = sp.predator ? 1 : 0; head = sp.ornery ? .55 : 0;
        if (this.real) { if (this.dist < (sp.ornery ? 2.6 : 2.3) * this.reach) this.startAttack(P); else if (this.stateT < 0) { if (this.mad && this.denNear(P)) this.stateT = 5; else if (this.den) this.goHome(); else { g.fleeUntil = this.W.time + 10; this.startFlee(P, P.pos); } } }
        else if (this.dist < 3 * this.reach || this.stateT < 0) { g.fleeUntil = this.W.time + 10; this.startFlee(P, P.pos); }
        break;
      }
      case 'fly': {
        this.fly = Math.min(1, this.fly + dt); this.flap = 1;
        const want = Math.atan2(this.pos.x - P.pos.x, this.pos.z - P.pos.z); this.yaw += angDiff(this.yaw, want) * Math.min(1, dt * 1.5);
        this.speed += (14 - this.speed) * Math.min(1, dt * .8); this.pos.y += dt * (3 + 4 * this.fly);
        this.pos.x += Math.sin(this.yaw) * this.speed * dt; this.pos.z += Math.cos(this.yaw) * this.speed * dt;
        if (this.stateT < 0) this.gone = true;
        break;
      }
      case 'rest': { lie = 1; this.speed *= .8; if (this.stateT < 0 || act > .7) this.setState('graze', 5); break; }
      case 'drink': { head = 1; this.speed *= .8; if (this.stateT < 0) { g.water = null; this.setState('graze', 5); } break; }
      default: { // graze / walk / idle
        const tgt = lead ? { x: lead.pos.x + this.slot.x, z: lead.pos.z + this.slot.y } : g.target;
        const d = Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z);
        if (sp.swim) { if (d > 3) { this.steer(tgt.x, tgt.z, sp.walk, dt, 1.5); gait = 'walk'; } else this.speed *= .95; break; }
        if (d > (lead ? 3 : 2.5)) { this.steer(tgt.x, tgt.z, d > 14 ? sp.trot : sp.walk, dt); gait = d > 14 ? 'trot' : 'walk'; this.state = 'walk'; }
        else {
          this.speed *= Math.pow(.05, dt);
          if (this.state === 'walk') this.setState('graze', 4 + Math.random() * 8);
          if (g.water && !lead && d < 3) { this.setState('drink', 20 + Math.random() * 20); break; }
          if (g.water && lead && lead.state === 'drink') { this.setState('drink', 15 + Math.random() * 20); break; }
          if (this.stateT < 0) {
            if (Math.random() < 1 - act) { this.setState('rest', 40 + Math.random() * 120); break; }
            this.setState(Math.random() < .7 ? 'graze' : 'idle', 3 + Math.random() * 9);
            if (!lead) this.W.wander(g, this);
          }
          head = this.state === 'graze' ? 1 : 0;
          if (this.state === 'idle') { this.lookT -= dt; if (this.lookT < 0) { this.lookT = 2 + Math.random() * 3; this.look = (Math.random() - .5) * 1.4; } }
        }
      }
    }
    return this.finish(dt, gait, head, alertK, lie);
  }
  finish(dt, gait = this.gait, head = 0, alertK = this.state === 'stalk' ? 1 : 0, lie = 0) {
    if (this.lame > .5 && (gait === 'run' || gait === 'trot')) gait = 'walk';
    const sp = this.sp;
    if (this.state !== 'fly') this.move(dt);
    this.jawK += ((this.state === 'attack' || this.state === 'rear' || (this.state === 'charge' && sp.predator) || this.state === 'circle' ? 1 : 0) * (this.state === 'circle' ? .35 : 1) - this.jawK) * Math.min(1, dt * 6);
    this.crouchK += ((this.state === 'stalk' ? 1 : 0) - this.crouchK) * Math.min(1, dt * 4); this.swipe = Math.max(0, this.swipe - dt * 2.4);
    this.display = Math.max(0, this.display - dt * .3);
    this.headDown += (head - this.headDown) * Math.min(1, dt * 2.2); this.alertK += (alertK - this.alertK) * Math.min(1, dt * 4); this.lie += (lie - this.lie) * Math.min(1, dt * .9);
    const spd = this.speed; if (spd > .05) this.phase += dt * spd / (sp.stride * this.scale);
    if (this.state !== 'fly') { if (spd > sp.trot * 1.15) gait = 'run'; else if (spd > sp.walk * 1.4) gait = gait === 'run' ? 'run' : 'trot'; else if (spd > .12) gait = 'walk'; else gait = 'stand'; }
    if (this.fightGait) { gait = this.fightGait; this.fightGait = null; }
    this.gait = gait;
    this.ground();
  }
  // the fight: stalking, springing, mauling, circling; returns true while it is in charge of the animal
  fight(dt, P) {
    const sp = this.sp, s = this.state, g = this.group, W = this.W;
    if (P.dead) { if (s === 'attack' || s === 'stalk' || s === 'pounce' || s === 'circle') { this.setState('graze', 5); this.aware = 0; } return false; }
    const toP = Math.atan2(P.pos.x - this.pos.x, P.pos.z - this.pos.z), look = P.look ? Math.abs(angDiff(Math.atan2(P.look.x, P.look.z), Math.atan2(this.pos.x - P.pos.x, this.pos.z - P.pos.z))) : 9;   // how far off your line of sight it is
    // a cougar: comes in behind you, freezes when you turn its way, and springs from close in
    if (sp.predator === 'cougar' && (s === 'graze' || s === 'walk' || s === 'idle' || s === 'alert' || s === 'rest') && this.dist < 85 && !this.fled && !P.inCamp) { this.setState('stalk', 40); }
    if (s === 'stalk') {
      if (P.inCamp || this.dist > 110) { this.setState('graze', 4); return false; }
      const seen = look < .45 && this.dist < 60;
      if (seen && this.aware > 1.6) { if (this.dist < 22 && Math.random() < .55) { this.real = true; this.setState('charge', 5); W.call('scream', this); } else { this.fled = true; W.alarm(g, P.pos); this.startFlee(P, P.pos); } return true; }
      if (seen) { this.speed *= Math.pow(.02, dt); this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 2); this.fightGait = 'stand'; }
      else { this.steer(P.pos.x, P.pos.z, sp.walk * 1.1, dt, 3); this.fightGait = 'walk'; this.aware = Math.min(this.aware, .9); }
      if (this.dist < 9) { this.setState('pounce', 1.2); this.leapY = 0; this.leapV = 4.2; W.call('scream', this); }
      return true;
    }
    if (s === 'pounce') {
      this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 8); this.speed = (1 - this.lame) * sp.run * 1.05; this.fightGait = 'run';
      this.leapV -= 14 * dt; this.leapY = Math.max(0, (this.leapY || 0) + this.leapV * dt);
      if (this.dist < 2.1 * this.reach) { this.leapY = 0; this.startAttack(P); } else if (this.stateT < 0) { this.leapY = 0; this.setState('charge', 3); this.real = true; }
      return true;
    }
    // wolves: the pack rings you, snarling, and one at a time they rush in
    if (sp.predator === 'wolf' && (s === 'graze' || s === 'walk' || s === 'idle' || s === 'alert' || s === 'rest') && !g.scattered && !P.inCamp && (this.dist < 38 || (P.night && this.dist < 70 && this.aware > .4))) { for (const m of g.members) if (m.state !== 'down' && m.state !== 'dead' && m.state !== 'flee') m.setState('circle', 7 + Math.random() * 6); g.rushT = 2; W.call('snarl', this); }
    if (s === 'circle') {
      if (g.scattered || P.inCamp || this.dist > 120) { this.setState('graze', 4); return false; }
      const R = 13 + (this.slot.x + 1) * 3, a = Math.atan2(this.pos.x - P.pos.x, this.pos.z - P.pos.z) + .5;
      this.steer(P.pos.x + Math.sin(a) * R, P.pos.z + Math.cos(a) * R, sp.trot, dt, 4); this.fightGait = 'trot';
      g.rushT -= dt / Math.max(1, g.members.length); if (g.rushT < 0 && !g.members.some(m => m.state === 'charge' || m.state === 'attack')) { g.rushT = 3 + Math.random() * 3; this.real = true; this.setState('charge', 5); W.call('snarl', this); }
      return true;
    }
    if (s === 'attack') {
      this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 7);
      const reach = (sp.ornery ? 2.4 : sp.bear ? 2.0 : 1.7) * this.reach;
      if (this.mad && this.dist > reach + 3) { this.setState('charge', 5); return true; }   // (you will not outrun it)
      if (this.dist > reach + 1.4) { this.steer(P.pos.x, P.pos.z, sp.trot * 1.4, dt, 6); this.fightGait = 'trot'; } else { this.speed *= Math.pow(.01, dt); this.fightGait = 'stand'; }
      if (sp.bear) this.rear = Math.max(0, (this.rear || 0) - dt * 2);
      this.atkT -= dt;
      if (this.atkT <= 0 && this.dist < reach + .8) {
        this.swipe = 1; this.strikes++; this.atkT = this.mad ? .9 : sp.bear ? 1.05 : sp.ornery ? 1.6 : sp.predator === 'cougar' ? .85 : 1.2;
        const k = this.scale / this.size, dmg = sp.bear ? 26 + 16 * Math.random() : sp.ornery ? 30 + 12 * Math.random() : sp.predator === 'cougar' ? (this.strikes === 1 ? 34 : 16 + 8 * Math.random()) : 11 + 8 * Math.random();
        W.attack(this, dmg * k * (this.mad ? 1.45 : 1));
        W.call(sp.bear ? 'roar' : sp.ornery ? 'bellow' : sp.predator === 'cougar' ? 'scream' : 'snarl', this);
      }
      // it breaks off: a moose after one blow, a wolf after a bite or two, a bear or a cat when it has done enough (or is hurt)
      const done = sp.ornery ? this.strikes >= 1 && this.atkT < .8 : sp.predator === 'wolf' ? this.strikes >= 1 + (this.slot.y > 0 ? 1 : 0) && this.atkT < .6 : this.strikes >= (this.wounded ? 6 : 3) || (this.wounded && this.hp < this.sp.hp * .3);
      if (this.mad) { if (this.hp < this.maxHp * .22 || !this.denNear(P)) this.goHome(); return true; }
      if (done) { if (sp.predator === 'wolf' && !g.scattered) this.setState('circle', 6); else { g.fleeUntil = W.time + 12; this.fled = true; this.startFlee(P, P.pos); } }
      return true;
    }
    return false;
  }
  // a den bear keeps after you while you are anywhere near its den; done with you, it goes back to the mouth of its cave
  denNear(P) { return !!this.den && Math.hypot(P.pos.x - this.den.x, P.pos.z - this.den.z) < this.den.R * 1.8; }
  goHome() { this.mad = false; this.homing = true; this.fleeTo = new THREE.Vector2(this.den.door.x, this.den.door.z); this.setState('flee', 14); }
  startAttack(P) { this.setState('attack', 30); this.atkT = this.sp.ornery ? .05 : .25; this.strikes = 0; if (this.sp.ornery) this.atkT = 0; }
  startFlee(P, from) {
    const a = Math.atan2(this.pos.x - from.x, this.pos.z - from.z) + (Math.random() - .5) * .6, r = 90 + Math.random() * 80;
    this.fleeTo = new THREE.Vector2(this.pos.x + Math.sin(a) * r, this.pos.z + Math.cos(a) * r);
    this.setState('flee', 9 + Math.random() * 7);
    if (this.sp.swim) this.W.call('quack', this);
    if (this.sp.name === 'turkey') this.W.call('gobble', this);
  }
  hit(zone, power) {
    if (this.state === 'down' || this.state === 'dead' || this.state === 'fallfly') return false;
    const z = zone && typeof zone === 'object' ? zone : zone ? ZONES.heart : ZONES.gut; this.lastZone = z;
    // a good shot (head, neck, heart and lungs, the shoulder over them) drops it where it stands; anything else wounds it,
    // and a wounded animal can only limp: you can follow it and finish it
    // a den bear drops only to a head shot; anything else wounds it (the heart hardest) and it keeps coming
    const good = this.den ? z === ZONES.head : z.vital || z === ZONES.shoulder;
    if (this.sp.small || this.sp.bird || good) this.hp = 0;
    else { this.hp -= power * z.mult * (this.den && z.vital ? 1.3 : 1); if (this.hp > 0) this.lame = this.den ? Math.min(.25, this.lame + .06) : .85; }
    if (this.hp > 0) {
      this.wounded = true; this.aware = 2; const sp = this.sp;
      if (this.den) { this.mad = true; this.homing = false; }
      if ((sp.bear || sp.ornery || sp.predator === 'cougar') && this.dist < (this.den ? 160 : 90) && this.state !== 'attack' && this.state !== 'charge') { this.real = true; this.setState('charge', 9); this.W.call(sp.bear ? 'roar' : sp.ornery ? 'bellow' : 'scream', this); }
      if (sp.predator === 'wolf' && Math.random() < .5) { this.group.scattered = true; this.W.alarm(this.group, this.W.lastShot || this.pos); }
      return false;
    }
    this.state = this.state === 'fly' ? 'fallfly' : 'down'; this.downT = 0; this.rollDir = Math.random() < .5 ? 1 : -1; this.speed *= this.state === 'fallfly' ? .5 : .08; this.rear = 0; this.leapY = 0;   // down in its tracks
    if (this.sp.predator === 'wolf') { const left = this.group.members.filter(m => m.state !== 'down' && m.state !== 'dead'); if (left.length <= 1 || Math.random() < .5) { this.group.scattered = true; this.W.alarm(this.group, this.pos); } }
    return true;
  }
  updateDown(dt) {
    this.downT += dt;
    if (this.state === 'fallfly') { this.vy -= 9.8 * dt; this.pos.y += this.vy * dt; this.pos.x += Math.sin(this.yaw) * this.speed * dt; this.pos.z += Math.cos(this.yaw) * this.speed * dt; this.speed *= .99; this.flap = 0; const h = Math.max(this.W.world.height(this.pos.x, this.pos.z), this.sp.swim ? 0 : -9); if (this.pos.y <= h) { this.pos.y = h; this.state = 'down'; this.downT = 0; } return; }
    this.speed *= Math.pow(.02, dt); this.move(dt);
    this.fall = Math.min(1, this.downT * 1.8);
    this.roll = this.rollDir * 1.45 * smooth(.15, .95, this.downT);
    if (this.downT > 1.4) this.state = 'dead';
    this.ground();
  }
  render(dt, camDist) {
    const m = this.m.mesh;
    m.position.copy(this.pos);
    // lean into the slope
    let pitch = 0;
    if (this.state !== 'fly' && !this.sp.swim) { const L = Math.max(.3, this.L), w = this.W.world, f = w.height(this.pos.x + Math.sin(this.yaw) * L / 2, this.pos.z + Math.cos(this.yaw) * L / 2), b = w.height(this.pos.x - Math.sin(this.yaw) * L / 2, this.pos.z - Math.cos(this.yaw) * L / 2); pitch = Math.atan2(f - b, L) * (1 - this.roll * this.roll / 2.1); }
    if (this.state === 'fly') pitch = .25;
    const R = (this.m.rig.dims.chest ? this.m.rig.dims.chest.y : .3) * this.scale;
    m.rotation.set(-pitch + (this.rear || 0) * -.9, this.yaw, this.roll);
    m.position.y -= Math.abs(this.roll) / 1.45 * R * .55;
    if (this.rear) m.position.y += this.rear * .4 * this.scale;
    if (this.leapY) m.position.y += this.leapY;
    if (camDist < 260 || this.state === 'fly') pose(this.m, { gait: this.gait || 'stand', phase: this.phase, headDown: this.headDown, alert: this.alertK, lie: this.lie, fall: this.fall, look: this.look, t: this.t, flap: this.flap, display: this.display, flag: this.state === 'flee' && this.kind === 'deer' ? 1 : 0, jaw: this.jawK * (.75 + .25 * Math.sin(this.t * 9)), crouch: this.crouchK, swipe: this.swipe });
    // fur shells close up (or through the scope)
    const fur = camDist < this.W.furR && this.state !== 'down' || (camDist < this.W.furR && this.state === 'dead');
    const fn = this.W.furN ?? 7, every = fn >= 7 ? 1 : fn > 0 ? Math.ceil(7 / fn) : 0;   // fewer shells on lower graphics, none on Low
    this.m.shells.forEach((s, i) => { s.visible = fur && every > 0 && i % every === every - 1; });
    // eyes that throw back the lantern (and a little moonlight): brightest looking straight at you
    if (this.m.shine.length) { const L = this.W.lightK; let o = 0; if (L > .02 && this.state !== 'dead' && this.state !== 'down' && camDist < 140) { const c = this.W.camPos, dx = c.x - this.pos.x, dz = c.z - this.pos.z, dl = Math.hypot(dx, dz) || 1, f = (Math.sin(this.yaw) * dx + Math.cos(this.yaw) * dz) / dl; o = L * smooth(.2, .85, f) * (1 - smooth(60, 140, camDist)) * (this.sp.predator ? 1 : .7); } for (const s of this.m.shine) s.material.opacity = o; }
  }
  dispose() { this.W.scene.remove(this.m.mesh); this.gone = true; }
}

export class Wildlife {
  constructor(scene, world, flora, camp, audio) {
    this.scene = scene; this.world = world; this.flora = flora; this.camp = camp; this.audio = audio;
    this.groups = []; this.animals = []; this.time = 0; this.spawnT = 0; this.target = 20; this.onBump = null; this.onAttack = null; this.seeded = false;
    this.region = null; this.home = null; this.furR = 32; this.lightK = 0; this.camPos = new THREE.Vector3(); this.dens = null; this.onDen = null;
  }
  call(kind, a) { if (this.audio && this.audio.ctx && a.dist < 220) this.audio.animal(kind, a.dist, this.panOf ? this.panOf(a.pos) : 0); }
  alarm(g, from) { g.fleeUntil = this.time + 8; g.fleeFrom = from.clone(); }
  bump(a) { if (this.onBump) this.onBump(a); }
  attack(a, dmg) { if (this.onAttack) this.onAttack(a, dmg); }
  wander(g, leader) {
    // den bears keep to the mouth of their cave
    if (g.den) { const a = Math.random() * TAU, r = 3 + Math.random() * 14; g.target = { x: g.den.door.x + Math.sin(a) * r, z: g.den.door.z + Math.cos(a) * r }; return; }
    // drift about the home range; sometimes head to water
    const w = this.world;
    if (!g.water && !leader.sp.swim && (leader.kind === 'deer' || leader.kind === 'elk' || leader.kind === 'moose') && Math.random() < .12) {
      for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, x = g.target.x + Math.cos(a) * 90, z = g.target.z + Math.sin(a) * 90; if (w.height(x, z) < -.3) { for (let r = 90; r > 0; r -= 4) { const px = g.target.x + Math.cos(a) * r, pz = g.target.z + Math.sin(a) * r; if (w.height(px, pz) > .3) { g.water = true; g.target = { x: px, z: pz }; return; } } } }
    }
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * TAU, r = (leader.sp.swim ? 6 : 10) + Math.random() * (leader.sp.small ? 10 : 30);
      const x = leader.pos.x + Math.sin(a) * r, z = leader.pos.z + Math.cos(a) * r, dh = Math.hypot(x - g.home.x, z - g.home.z);
      if (dh < 140 && leader.canGo(x, z)) { g.target = { x, z }; return; }
    }
    g.target = { x: g.home.x, z: g.home.z };
  }
  // which kind of country this is: the camp's region holds for a few kilometres around it
  regionK(x, z) { const r = this.region, c = this.home, near = !c || Math.hypot(x - c.x, z - c.z) < 3500; return { forest: near && r === 'forest', valley: near && r === 'valley', lake: near && r === 'lake' }; }
  // habitat suitability at a spot for each kind
  habitat(x, z) {
    const w = this.world, s = w.sample(x, z, {}), h = s.h, f = w.forest(x, z, s), n = w.normal(x, z, [0, 1, 0], 2);
    if (h < -1) return { duck: 3 };
    const R = this.regionK(x, z), hc = this.home ? this.home.h : 10;
    // mountain goats and cougars keep to the steep high ground
    if (h > hc + 35 && n[1] < .86 && n[1] > .35 && h < 420) return { goat: 3 * (R.valley ? 1.6 : .6), cougar: .35 * (R.valley ? 1.4 : .5) };
    if (h < .6 || n[1] < .8) return {};
    let wet = false; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; if (w.height(x + Math.cos(a) * 45, z + Math.sin(a) * 45) < -.5) { wet = true; break; } }
    const open = 1 - f;
    // the deep forest is big-game country: bears, moose, elk and wolves; the small game keeps to the open
    const big = R.forest ? 3 : 1, small = R.forest ? .35 : 1;
    return {
      deer: 2.2 * (f > .15 && f < .9 ? 1 : .4) * (h < 140 ? 1 : .3) * (R.forest ? .6 : 1),
      elk: 1.4 * (open > .5 ? 1 : .3) * (h < 170 ? 1 : .2) * (R.forest ? 2.2 : R.valley ? 1.5 : 1),
      moose: (wet ? 1.6 : .15 * f) * (R.forest ? 4 : R.lake ? 1.8 : 1),
      bison: 1.5 * (f < .12 && n[1] > .93 && s.m < .35 && h < 90 ? 1 : 0) * (R.forest ? .2 : 1),
      bear: .35 * (f > .4 || s.m > .4 ? 1 : .2) * big * 1.4,
      wolf: .3 * (f > .35 ? 1 : .3) * big,
      cougar: .12 * (s.m > .3 || f > .5 ? 1 : .2) * (R.valley ? 2 : 1),
      rabbit: 1.6 * (open > .35 ? 1 : .3) * small,
      turkey: 1.1 * (f > .45 ? 1 : .15) * (h < 120 ? 1 : 0) * small,
    };
  }
  spawnGroup(kind, x, z, n) {
    const sp = SPECIES[kind], g = { kind, members: [], leader: null, home: { x, z }, target: { x, z }, spread: kind === 'bison' ? 7 : kind === 'duck' ? 4 : sp.small ? 3 : kind === 'goat' ? 6 : 5, fleeUntil: 0, fleeFrom: null };
    n = n ?? Math.round(sp.herd[0] + Math.random() * (sp.herd[1] - sp.herd[0]));
    for (let i = 0; i < n; i++) {
      let px = x, pz = z;
      for (let k = 0; k < 10; k++) { const tx = x + (Math.random() - .5) * g.spread * 2.5, tz = z + (Math.random() - .5) * g.spread * 2.5, h = this.world.height(tx, tz); if (sp.swim ? h < -.4 : h > .5 && (!sp.climber || this.world.normal(tx, tz, [0, 1, 0], 1.5)[1] > .3)) { px = tx; pz = tz; break; } }
      const a = new Animal(this, kind, px, pz, g, Math.random()); g.members.push(a); this.animals.push(a);
    }
    g.leader = g.members[0]; this.groups.push(g); return g;
  }
  removeGroup(g) { if (g.den) g.den.group = null; for (const a of g.members) { a.dispose(); this.animals.splice(this.animals.indexOf(a), 1); } this.groups.splice(this.groups.indexOf(g), 1); }
  trySpawn(P, rMin, rMax) {
    for (let tries = 0; tries < 12; tries++) {
      const a = Math.random() * TAU, r = rMin + Math.random() * (rMax - rMin), x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r;
      const hab = this.habitat(x, z), kinds = Object.keys(hab).filter(k => hab[k] > 0);
      if (!kinds.length) continue;
      // fewer of what we already have nearby
      const have = {}; for (const g of this.groups) have[g.kind] = (have[g.kind] || 0) + 1;
      let tot = 0; const wts = kinds.map(k => { const v = hab[k] / (1 + (have[k] || 0) * 1.4); tot += v; return v; });
      let pick = Math.random() * tot, kind = kinds[0]; for (let i = 0; i < kinds.length; i++) { pick -= wts[i]; if (pick <= 0) { kind = kinds[i]; break; } }
      if (kind === 'bear' && (have.bear || 0) >= (this.regionK(x, z).forest ? 2 : 1)) continue;
      if ((kind === 'cougar' || kind === 'wolf') && (have[kind] || 0) >= 1) continue;
      return this.spawnGroup(kind, x, z);
    }
    return null;
  }
  // the first animals: some close enough to find within a few minutes
  seed(P) {
    this.seeded = true;
    for (let i = 0; i < 9; i++) this.trySpawn(P, 60, 240);
    if (!this.groups.some(g => g.kind === 'deer')) for (let k = 0; k < 20; k++) { const a = Math.random() * TAU, r = 90 + Math.random() * 60, x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r; if (this.habitat(x, z).deer > 0) { this.spawnGroup('deer', x, z); break; } }
  }
  update(dt, P, hours) {
    this.time += dt;
    if (!this.seeded) this.seed(P);
    this.spawnT -= dt;
    if (this.spawnT < 0) {
      this.spawnT = 1.5;
      for (const g of [...this.groups]) { const d = Math.hypot(g.leader.pos.x - P.pos.x, g.leader.pos.z - P.pos.z); if (d > (g.kind === 'goat' ? FAR : 560) || g.members.every(a => a.gone)) this.removeGroup(g); }
      if (this.groups.length < this.target) this.trySpawn(P, 130, this.regionK(P.pos.x, P.pos.z).valley ? 640 : 330);
      // every den within a few hundred metres has its bears at home (one, sometimes two; bigger and far tougher)
      if (this.dens) this.dens.near(P.pos.x, P.pos.z, 420, s => {
        if (s.cleared || s.group) return;
        const g = this.spawnGroup('bear', s.door.x, s.door.z, s.id % 3 === 0 ? 2 : 1); g.den = s; g.home = { x: s.door.x, z: s.door.z }; g.target = { ...g.home }; s.group = g;
        for (const a of g.members) { a.den = s; a.maxHp = a.hp = a.sp.hp * 3.2; a.scale *= 1.08; a.m.mesh.scale.setScalar(a.scale); }
      });
      // a den whose bears are all dead stays empty
      for (const g of this.groups) if (g.den && !g.den.cleared && g.members.every(a => a.state === 'down' || a.state === 'dead')) this.dens.clear(g.den);
    }
    for (const g of this.groups) {
      if (g.leader.state === 'down' || g.leader.state === 'dead' || g.leader.gone) { const alive = g.members.find(a => a.state !== 'down' && a.state !== 'dead' && !a.gone); if (alive) g.leader = alive; }
    }
    for (const a of this.animals) {
      if (a.gone) { a.m.mesh.visible = false; continue; }
      const d = a.dist ?? 999;
      if (d > 300 && Math.random() > dt * 4) continue; // far away: think less often
      a.update(d > 300 ? .25 : dt, P, hours);
    }
  }
  render(dt, cam) {
    this.camPos.copy(cam);
    for (const a of this.animals) {
      if (a.gone) continue;
      const d = Math.hypot(a.pos.x - cam.x, a.pos.z - cam.z);
      a.m.mesh.visible = d < FAR;
      if (a.m.mesh.visible) a.render(dt, d);
    }
  }
  // a shot along a ray: nearest animal hit before `maxT`
  raycast(o, dir, maxT) {
    let best = null; const c = new THREE.Vector3(), oc = new THREE.Vector3();
    for (const a of this.animals) {
      if (a.gone || a.state === 'dead' || a.state === 'down') continue;
      const dd = Math.hypot(a.pos.x - o.x, a.pos.z - o.z); if (dd > maxT + 5) continue;
      a.m.mesh.updateMatrixWorld(true);
      for (const part of this.parts(a)) {
        part.bone.getWorldPosition(c); c.add(part.off); if (part.fw) { c.x += Math.sin(a.yaw) * part.fw; c.z += Math.cos(a.yaw) * part.fw; }
        oc.subVectors(o, c); const b = oc.dot(dir), cc = oc.lengthSq() - part.r * part.r, disc = b * b - cc; if (disc < 0) continue;
        let t = -b - Math.sqrt(disc); if (t <= 0 && cc < 0) t = .01;   // fired from inside it, point blank
        if (t > 0 && t < maxT && (!best || t < best.t)) best = { a, t, vital: part.zone.vital, zone: part.zone, point: o.clone().addScaledVector(dir, t) };
      }
    }
    return best;
  }
  parts(a) {
    if (a._parts) return a._parts;
    const B = a.m.B, s = a.scale, sp = a.sp, R = (sp.bird ? .14 : .2) * s, out = [], V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const body = sp.bird ? (sp.name === 'duck' ? .11 : .2) : ({ deer: .26, elk: .4, moose: .5, bison: .62, bear: .45, rabbit: .09, cougar: .22, goat: .3, wolf: .2 }[sp.name] || .3);
    out.push({ bone: B.head, r: R * .75, zone: ZONES.head, off: V3(0, 0, 0) });
    if (sp.bird) { out.push({ bone: B.chest, r: body * s, zone: ZONES.heart, off: V3(0, 0, 0) }, { bone: B.hips, r: body * .9 * s, zone: ZONES.gut, off: V3(0, 0, 0) }); return (a._parts = out); }
    out.push({ bone: B.neck, r: body * .55 * s, zone: ZONES.neck, off: V3(0, 0, 0) });
    out.push({ bone: B.chest, r: body * .62 * s, zone: ZONES.heart, off: V3(0, -body * .3 * s, 0), fw: body * .12 * s });     // low behind the front leg
    out.push({ bone: B.chest, r: body * .78 * s, zone: ZONES.shoulder, off: V3(0, body * .22 * s, 0), fw: body * .18 * s });  // the shoulder over it
    out.push({ bone: B.spine, r: body * .9 * s, zone: ZONES.gut, off: V3(0, 0, 0) });
    out.push({ bone: B.hips, r: body * .88 * s, zone: ZONES.hind, off: V3(0, 0, 0) });
    for (const n of ['FL1', 'FR1', 'HL1', 'HR1']) if (B[n]) out.push({ bone: B[n], r: body * .32 * s, zone: ZONES.leg, off: V3(0, 0, 0) });
    return (a._parts = out);
  }
  carcassNear(p, dir) {
    let best = null, bs = 9;
    for (const a of this.animals) {
      if (a.state !== 'dead' || a.gone) continue;
      const d = Math.hypot(a.pos.x - p.x, a.pos.z - p.z); if (d > 3.2 + (a.L || 1) * .5) continue;
      const tx = (a.pos.x - p.x) / d, tz = (a.pos.z - p.z) / d, dot = tx * dir.x + tz * dir.z; if (dot < .3 && d > 1.2) continue;
      if (d < bs) { bs = d; best = a; }
    }
    return best;
  }
  harvest(a) {
    const sp = a.sp, lb = Math.round((sp.lb[0] + Math.random() * (sp.lb[1] - sp.lb[0])) * (a.scale / (a.size || 1)) * .45); // dressed meat is a bit under half the live weight
    a.gone = true; a.m.mesh.visible = false;
    return { kind: sp.name, label: sp.label, meat: sp.meat, lb: Math.max(1, lb) };
  }
  // any animals within r of p hear a gunshot
  gunshot(p) {
    this.lastShot = p.clone();
    for (const g of this.groups) for (const a of g.members) { const d = Math.hypot(a.pos.x - p.x, a.pos.z - p.z); if (d < 320) a.aware = Math.min(2, a.aware + 3 * (1 - d / 320)); }
    // a shot breaks up a wolf ring now and then; a stalking cat thinks better of it
    for (const g of this.groups) { if (g.kind === 'wolf' && g.members.some(a => a.state === 'circle') && Math.random() < .3) { g.scattered = true; this.alarm(g, p); } if (g.kind === 'cougar') for (const a of g.members) if (a.state === 'stalk' && Math.random() < .6) { a.fled = true; a.startFlee(null, p); } }
  }
}
