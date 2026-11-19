// First-person walking: follows the ground, slows on steep climbs, wades and swims, bumps into trunks, rocks, logs
// and the tent walls (the doorway is open), with a gentle head bob and footstep cues for the audio.
import * as THREE from 'three';
import { WATER_Y } from './world.js';

export class Player {
  constructor(camera, world) {
    this.cam = camera; this.world = world;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.yaw = 0; this.pitch = 0;
    this.r = 0.3; this.eyeH = 1.64; this.crouched = false; this.crouchK = 0; this.onGround = true; this.vy = 0;
    this.bob = 0; this.bobAmt = 0; this.stepPhase = 0; this.onStep = null; this.swimming = false; this.wading = 0;
    this.blockers = []; this.speed = 0; this.seated = null; this.sleeping = false; this.frozen = false;
    this._n = [0, 1, 0];
  }
  place(x, z, yaw) { this.pos.set(x, this.world.height(x, z), z); this.yaw = yaw; this.pitch = -0.05; this.vel.set(0, 0, 0); }
  look(dx, dy, sens = 1) {
    const k = 0.0022 * sens;
    this.yaw -= dx * k; this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch - dy * k));
  }
  update(dt, input, collide) {
    const mv = this.frozen ? { x: 0, y: 0 } : input.move();
    if (input.hit('KeyC') || input.hit('ControlLeft')) this.crouched = !this.crouched;
    const running = (input.down('ShiftLeft') || input.down('ShiftRight') || input.touchRun) && mv.y > 0.2 && !this.crouched;
    const ground = this.world.height(this.pos.x, this.pos.z), depth = WATER_Y - ground;
    this.swimming = depth > 1.25; this.wading = Math.max(0, Math.min(1, depth / 1.2));
    let speed = this.crouched ? 1.6 : running ? 6.2 : 3.1;
    if (this.swimming) speed = 1.7; else speed *= 1 - 0.5 * this.wading;
    // uphill is harder; very steep ground pushes you back down
    const n = this.world.normal(this.pos.x, this.pos.z, this._n, .7);
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const want = fwd.multiplyScalar(mv.y).addScaledVector(right, mv.x).multiplyScalar(speed);
    if (!this.swimming) { const up = -(want.x * n[0] + want.z * n[2]) / Math.max(.1, speed); if (up > 0) want.multiplyScalar(1 - Math.min(.65, up * (1 - n[1]) * 3.2)); }
    const acc = this.onGround || this.swimming ? 10 : 2;
    this.vel.x += (want.x - this.vel.x) * Math.min(1, acc * dt); this.vel.z += (want.z - this.vel.z) * Math.min(1, acc * dt);
    if (!this.swimming && n[1] < 0.62) { this.vel.x += n[0] * 9 * dt; this.vel.z += n[2] * 9 * dt; }
    // jump and gravity
    if (input.hit('Space') && !this.frozen && this.onGround && !this.swimming && !this.crouched) { this.vy = 4.3; this.onGround = false; }
    this.vy -= 15 * dt;
    let nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
    // collisions, twice to settle corners
    for (let it = 0; it < 2; it++) { const p = collide(nx, nz, this.r, this.pos.y); nx = p.x; nz = p.z; }
    const g = this.world.height(nx, nz);
    let ny = this.pos.y + this.vy * dt;
    if (this.swimming) { const target = WATER_Y - 1.32; ny = this.pos.y + (target - this.pos.y) * Math.min(1, dt * 4); this.vy = 0; this.onGround = false; if (g > target) ny = Math.max(ny, g); }
    else if (ny <= g + 0.02 || (this.onGround && ny - g < 0.35)) { ny = g; this.vy = 0; this.onGround = true; }
    else this.onGround = false;
    this.speed = Math.hypot(nx - this.pos.x, nz - this.pos.z) / Math.max(dt, 1e-4);
    this.pos.set(nx, ny, nz);
    // head bob and footsteps
    this.crouchK += ((this.crouched ? 1 : 0) - this.crouchK) * Math.min(1, dt * 8);
    const moving = this.onGround && this.speed > .4;
    this.bobAmt += ((moving ? Math.min(1, this.speed / 6) : 0) - this.bobAmt) * Math.min(1, dt * 6);
    if (moving || this.swimming) {
      const prev = this.stepPhase; this.stepPhase += dt * (this.swimming ? 2.2 : 1.7 + this.speed * .55);
      if (Math.floor(prev / Math.PI) !== Math.floor(this.stepPhase / Math.PI) && this.onStep) this.onStep(this.swimming ? 'swim' : this.wading > .05 ? 'water' : running ? 'run' : 'walk');
    }
    this.applyCamera();
  }
  eye() { return this.eyeH - 0.62 * this.crouchK; }
  applyCamera() {
    const b = this.bobAmt, ph = this.stepPhase;
    const sit = this.seated ? -0.62 : 0, lie = this.sleeping ? -1.35 : 0;
    this.cam.position.set(this.pos.x + Math.cos(ph) * .025 * b * Math.cos(this.yaw), this.pos.y + this.eye() + sit + lie + Math.abs(Math.sin(ph)) * .045 * b - .02 * b, this.pos.z - Math.cos(ph) * .025 * b * Math.sin(this.yaw));
    this.cam.rotation.set(this.pitch, this.yaw, Math.sin(ph) * .004 * b, 'YXZ');
  }
}

// circle / segment / box push-out for a walker of radius r at (x, z)
export function pushOut(x, z, r, col) {
  if (col.t === 'c') {
    const dx = x - col.x, dz = z - col.z, d = Math.hypot(dx, dz), rr = col.r + r;
    if (d < rr && d > 1e-5) { x = col.x + dx / d * rr; z = col.z + dz / d * rr; }
  } else if (col.t === 's') {
    const ex = col.bx - col.ax, ez = col.bz - col.az, l2 = ex * ex + ez * ez, t = Math.max(0, Math.min(1, ((x - col.ax) * ex + (z - col.az) * ez) / l2));
    const px = col.ax + ex * t, pz = col.az + ez * t, dx = x - px, dz = z - pz, d = Math.hypot(dx, dz);
    if (d < r && d > 1e-5) { x = px + dx / d * r; z = pz + dz / d * r; }
  } else {
    const c = Math.cos(col.rot), s = Math.sin(col.rot), dx = x - col.x, dz = z - col.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c; // into box space (inverse of three's rotation.y)
    const qx = Math.max(-col.hx, Math.min(col.hx, lx)), qz = Math.max(-col.hz, Math.min(col.hz, lz));
    let ox = lx - qx, oz = lz - qz, d = Math.hypot(ox, oz), nlx = lx, nlz = lz;
    if (d < r) {
      if (d > 1e-5) { nlx = qx + ox / d * r; nlz = qz + oz / d * r; }
      else { const px = col.hx - Math.abs(lx), pz = col.hz - Math.abs(lz); if (px < pz) nlx = Math.sign(lx || 1) * (col.hx + r); else nlz = Math.sign(lz || 1) * (col.hz + r); }
      x = col.x + nlx * c + nlz * s; z = col.z - nlx * s + nlz * c;
    }
  }
  return [x, z];
}
