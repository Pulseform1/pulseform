// Wildlife: herds that graze, wander, bed down and go to water by the clock; notice you by sight, sound and scent
// (downwind of you they smell you); stare, then bolt. Bears rear and bluff-charge. Ducks paddle and take off.
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
};

class Animal {
  constructor(W, kind, x, z, group, rnd) {
    this.W = W; this.kind = kind; this.sp = SPECIES[kind]; this.group = group;
    const m = this.m = makeAnimal(kind, rnd);
    this.scale = this.sp.scale[0] + (this.sp.scale[1] - this.sp.scale[0]) * ((rnd * 7.3) % 1);
    m.mesh.scale.setScalar(this.scale); m.mesh.rotation.order = 'YXZ'; W.scene.add(m.mesh);
    this.pos = new THREE.Vector3(x, 0, z); this.yaw = Math.random() * TAU; this.speed = 0; this.phase = Math.random();
    this.state = 'graze'; this.t = Math.random() * 5; this.stateT = 3 + Math.random() * 6; this.aware = 0; this.hp = this.sp.hp; this.wounded = false;
    this.headDown = 0; this.alertK = 0; this.lie = 0; this.fall = 0; this.roll = 0; this.flap = 0; this.fly = 0; this.vy = 0;
    this.slot = new THREE.Vector2((Math.random() - .5) * 2, (Math.random() - .5) * 2).multiplyScalar(group.spread);
    this.look = 0; this.lookT = 0; this.display = 0; this.called = 0;
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
    let blocked = false; this.W.flora.near(x, z, .35 * this.scale, () => { blocked = true; }); if (blocked) return false;
    const n = w.normal(x, z, this._n || (this._n = [0, 1, 0]), 1.5); if (n[1] < .72) return false;
    const c = this.W.camp; if (c && Math.hypot(x - c.c.x, z - c.c.z) < 12) return false;
    return true;
  }
  steer(tx, tz, speed, dt, turn = 2.5) {
    let want = Math.atan2(tx - this.pos.x, tz - this.pos.z);
    // feel ahead for trees, water and cliffs, and swing around them
    const look = 1.6 + speed * .45;
    for (const off of [0, .5, -.5, 1, -1, 1.6, -1.6, 2.4, -2.4]) {
      const a = want + off * (this._side || 1), x = this.pos.x + Math.sin(a) * look, z = this.pos.z + Math.cos(a) * look;
      if (this.canGo(x, z)) { want = a; if (off) this._side = Math.sign(off) * (this._side || 1); break; }
      if (off === -2.4) { want = this.yaw + Math.PI; }
    }
    this.yaw += Math.max(-turn * dt, Math.min(turn * dt, angDiff(this.yaw, want)));
    this.speed += (speed - this.speed) * Math.min(1, dt * 3);
  }
  move(dt) {
    if (this.speed < .01) return;
    const nx = this.pos.x + Math.sin(this.yaw) * this.speed * dt, nz = this.pos.z + Math.cos(this.yaw) * this.speed * dt;
    if (this.state === 'flee' || this.canGo(nx, nz) || !this.canGo(this.pos.x, this.pos.z)) { this.pos.x = nx; this.pos.z = nz; }
    else this.speed *= .5;
  }
  perceive(dt, P) {
    const dx = this.pos.x - P.pos.x, dz = this.pos.z - P.pos.z, d = Math.hypot(dx, dz); this.dist = d;
    if (d > 260) { this.aware = Math.max(0, this.aware - dt * .2); return; }
    const sp = this.sp, fwd = [Math.sin(this.yaw), Math.cos(this.yaw)], to = [-dx / d, -dz / d];
    const facing = fwd[0] * to[0] + fwd[1] * to[1] > -.35;
    const hearR = (10 + 48 * P.noise) * sp.hear, sightR = sp.sight * (P.night ? (P.lantern ? .9 : .4) : 1) * (P.crouched ? .55 : 1) * (P.moving ? 1 : .45);
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
    // the group bolts together
    if (g.fleeUntil > this.W.time && this.state !== 'flee' && this.state !== 'charge' && this.state !== 'rear' && this.state !== 'fly') this.startFlee(P, g.fleeFrom);
    if (this.state !== 'flee' && this.state !== 'charge' && this.state !== 'rear' && this.state !== 'fly') {
      if (this.aware > 1 || (this.wounded && this.aware > .2)) {
        if (sp.bear && !g.charged && this.dist < 28 && !this.wounded) { g.charged = true; this.setState('rear', 1.6); this.W.call('bear', this); }
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
        this.steer(fx, fz, (this.wounded ? .75 : 1) * sp.run * (this.stateT > 2 ? 1 : .7), dt, 4);
        gait = 'run'; if (this.stateT < 0 || Math.hypot(fx - this.pos.x, fz - this.pos.z) < 6) { this.setState('alert', 4); this.aware = .5; }
        break;
      }
      case 'rear': { alertK = 1; this.speed *= .8; this.rear = Math.min(1, (this.rear || 0) + dt * 2); if (this.stateT < 0) { this.rear = 0; this.setState('charge', 3.5); this.W.call('bear', this); } break; }
      case 'charge': {
        this.steer(P.pos.x, P.pos.z, sp.run * .85, dt, 5); gait = 'run';
        if (this.dist < 2.2) this.W.bump(this);
        if (this.dist < 3 || this.stateT < 0) { g.fleeUntil = this.W.time + 10; this.startFlee(P, P.pos); }
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
    if (this.state !== 'fly') this.move(dt);
    this.display = Math.max(0, this.display - dt * .3);
    this.headDown += (head - this.headDown) * Math.min(1, dt * 2.2); this.alertK += (alertK - this.alertK) * Math.min(1, dt * 4); this.lie += (lie - this.lie) * Math.min(1, dt * .9);
    const spd = this.speed; if (spd > .05) this.phase += dt * spd / (sp.stride * this.scale);
    if (this.state !== 'fly') { if (spd > sp.trot * 1.15) gait = 'run'; else if (spd > sp.walk * 1.4) gait = gait === 'run' ? 'run' : 'trot'; else if (spd > .12) gait = 'walk'; else gait = 'stand'; }
    this.gait = gait;
    this.ground();
  }
  startFlee(P, from) {
    const a = Math.atan2(this.pos.x - from.x, this.pos.z - from.z) + (Math.random() - .5) * .6, r = 90 + Math.random() * 80;
    this.fleeTo = new THREE.Vector2(this.pos.x + Math.sin(a) * r, this.pos.z + Math.cos(a) * r);
    this.setState('flee', 9 + Math.random() * 7);
    if (this.sp.swim) this.W.call('quack', this);
    if (this.sp.name === 'turkey') this.W.call('gobble', this);
  }
  hit(vital, power) {
    if (this.state === 'down' || this.state === 'dead' || this.state === 'fallfly') return false;
    this.hp -= vital || this.sp.hp <= 1 ? 99 : power;
    if (this.hp > 0) { this.wounded = true; this.aware = 2; return false; }
    this.state = this.state === 'fly' ? 'fallfly' : 'down'; this.downT = 0; this.rollDir = Math.random() < .5 ? 1 : -1; this.speed *= .5;
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
    if (camDist < 260 || this.state === 'fly') pose(this.m, { gait: this.gait || 'stand', phase: this.phase, headDown: this.headDown, alert: this.alertK, lie: this.lie, fall: this.fall, look: this.look, t: this.t, flap: this.flap, display: this.display, flag: this.state === 'flee' && this.kind === 'deer' ? 1 : 0 });
  }
  dispose() { this.W.scene.remove(this.m.mesh); }
}

export class Wildlife {
  constructor(scene, world, flora, camp, audio) {
    this.scene = scene; this.world = world; this.flora = flora; this.camp = camp; this.audio = audio;
    this.groups = []; this.animals = []; this.time = 0; this.spawnT = 0; this.target = 13; this.onBump = null; this.seeded = false;
  }
  call(kind, a) { if (this.audio && this.audio.ctx && a.dist < 220) this.audio.animal(kind, a.dist, this.panOf ? this.panOf(a.pos) : 0); }
  alarm(g, from) { g.fleeUntil = this.time + 8; g.fleeFrom = from.clone(); }
  bump(a) { if (this.onBump) this.onBump(a); }
  wander(g, leader) {
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
  // habitat suitability at a spot for each kind
  habitat(x, z) {
    const w = this.world, s = w.sample(x, z, {}), h = s.h, f = w.forest(x, z, s), n = w.normal(x, z, [0, 1, 0], 2);
    if (h < -1) return { duck: 3 };
    if (h < .6 || n[1] < .8) return {};
    let wet = false; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; if (w.height(x + Math.cos(a) * 45, z + Math.sin(a) * 45) < -.5) { wet = true; break; } }
    const open = 1 - f;
    return {
      deer: 2.2 * (f > .15 && f < .9 ? 1 : .4) * (h < 140 ? 1 : .3),
      elk: 1.4 * (open > .5 ? 1 : .3) * (h < 170 ? 1 : .2),
      moose: wet ? 1.6 : .15 * f,
      bison: 1.5 * (f < .12 && n[1] > .93 && s.m < .35 && h < 90 ? 1 : 0),
      bear: .35 * (f > .4 || s.m > .4 ? 1 : .2),
      rabbit: 1.6 * (open > .35 ? 1 : .3),
      turkey: 1.1 * (f > .45 ? 1 : .15) * (h < 120 ? 1 : 0),
    };
  }
  spawnGroup(kind, x, z, n) {
    const sp = SPECIES[kind], g = { kind, members: [], leader: null, home: { x, z }, target: { x, z }, spread: kind === 'bison' ? 7 : kind === 'duck' ? 4 : sp.small ? 3 : 5, fleeUntil: 0, fleeFrom: null };
    n = n ?? Math.round(sp.herd[0] + Math.random() * (sp.herd[1] - sp.herd[0]));
    for (let i = 0; i < n; i++) {
      let px = x, pz = z;
      for (let k = 0; k < 10; k++) { const tx = x + (Math.random() - .5) * g.spread * 2.5, tz = z + (Math.random() - .5) * g.spread * 2.5, h = this.world.height(tx, tz); if (sp.swim ? h < -.4 : h > .5) { px = tx; pz = tz; break; } }
      const a = new Animal(this, kind, px, pz, g, Math.random()); g.members.push(a); this.animals.push(a);
    }
    g.leader = g.members[0]; this.groups.push(g); return g;
  }
  removeGroup(g) { for (const a of g.members) { a.dispose(); this.animals.splice(this.animals.indexOf(a), 1); } this.groups.splice(this.groups.indexOf(g), 1); }
  trySpawn(P, rMin, rMax) {
    for (let tries = 0; tries < 12; tries++) {
      const a = Math.random() * TAU, r = rMin + Math.random() * (rMax - rMin), x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r;
      const hab = this.habitat(x, z), kinds = Object.keys(hab).filter(k => hab[k] > 0);
      if (!kinds.length) continue;
      // fewer of what we already have nearby
      const have = {}; for (const g of this.groups) have[g.kind] = (have[g.kind] || 0) + 1;
      let tot = 0; const wts = kinds.map(k => { const v = hab[k] / (1 + (have[k] || 0) * 1.4); tot += v; return v; });
      let pick = Math.random() * tot, kind = kinds[0]; for (let i = 0; i < kinds.length; i++) { pick -= wts[i]; if (pick <= 0) { kind = kinds[i]; break; } }
      if (kind === 'bear' && (have.bear || 0) >= 1) continue;
      return this.spawnGroup(kind, x, z);
    }
    return null;
  }
  // the first animals: some close enough to find within a few minutes
  seed(P) {
    this.seeded = true;
    for (let i = 0; i < 6; i++) this.trySpawn(P, 70, 260);
    if (!this.groups.some(g => g.kind === 'deer')) for (let k = 0; k < 20; k++) { const a = Math.random() * TAU, r = 90 + Math.random() * 60, x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r; if (this.habitat(x, z).deer > 0) { this.spawnGroup('deer', x, z); break; } }
  }
  update(dt, P, hours) {
    this.time += dt;
    if (!this.seeded) this.seed(P);
    this.spawnT -= dt;
    if (this.spawnT < 0) {
      this.spawnT = 1.5;
      for (const g of [...this.groups]) { const d = Math.hypot(g.leader.pos.x - P.pos.x, g.leader.pos.z - P.pos.z); if (d > 520 || g.members.every(a => a.gone)) this.removeGroup(g); }
      if (this.groups.length < this.target) this.trySpawn(P, 170, 330);
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
    for (const a of this.animals) {
      if (a.gone) continue;
      const d = Math.hypot(a.pos.x - cam.x, a.pos.z - cam.z);
      a.m.mesh.visible = d < 480;
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
        part.bone.getWorldPosition(c); c.add(part.off);
        oc.subVectors(o, c); const b = oc.dot(dir), cc = oc.lengthSq() - part.r * part.r, disc = b * b - cc; if (disc < 0) continue;
        const t = -b - Math.sqrt(disc); if (t > 0 && t < maxT && (!best || t < best.t)) best = { a, t, vital: part.vital, point: o.clone().addScaledVector(dir, t) };
      }
    }
    return best;
  }
  parts(a) {
    if (a._parts) return a._parts;
    const B = a.m.B, s = a.scale, sp = a.sp, R = (sp.bird ? .14 : .2) * s, out = [];
    const body = sp.bird ? (sp.name === 'duck' ? .11 : .2) : ({ deer: .26, elk: .4, moose: .5, bison: .62, bear: .45, rabbit: .09 }[sp.name] || .3);
    out.push({ bone: B.chest, r: body * s, vital: true, off: new THREE.Vector3(0, -body * .2 * s, 0) });
    out.push({ bone: B.spine, r: body * .95 * s, vital: false, off: new THREE.Vector3() });
    out.push({ bone: B.hips, r: body * .9 * s, vital: false, off: new THREE.Vector3() });
    out.push({ bone: B.head, r: R * .7, vital: true, off: new THREE.Vector3() });
    if (!sp.bird) out.push({ bone: B.neck, r: body * .55 * s, vital: true, off: new THREE.Vector3() });
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
    const sp = a.sp, lb = Math.round((sp.lb[0] + Math.random() * (sp.lb[1] - sp.lb[0])) * a.scale * .45); // dressed meat is a bit under half the live weight
    a.gone = true; a.m.mesh.visible = false;
    return { kind: sp.name, label: sp.label, meat: sp.meat, lb: Math.max(1, lb) };
  }
  // any animals within r of p hear a gunshot
  gunshot(p) {
    for (const g of this.groups) for (const a of g.members) { const d = Math.hypot(a.pos.x - p.x, a.pos.z - p.z); if (d < 320) a.aware = Math.min(2, a.aware + 3 * (1 - d / 320)); }
  }
}
