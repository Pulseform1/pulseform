  /* ---------- 30 me: your body (moved here at once and checked by the server), the draw, the release, the cameras ---------- */
  const ME = {
    st: { x: 70, y: 0, z: 120, vy: 0, yaw: 0, pitch: 0, crouch: false, sprint: false, onGround: true },
    alive: true, hp: 100, arrows: 6, drawing: false, drawT: 0, nockT: 0, cid: 0, seq: 0, sendAcc: 0, full: false, crouchHold: false, crouchToggle: false,
    eye: W.PL.eye, bob: 0, moveAmt: 0, lastStepPhase: 0, releasedAt: -9, hurtAt: -9, hurtDir: 0, spawnAt: 0, cam: 'fp', specId: null, deadAt: 0,
  };
  ME.st.y = W.terrainH(ME.st.x, ME.st.z);
  const canAct = () => CL.src && live() && ME.alive;
  on('corr', m => {
    ME.st.x = m.p[0]; ME.st.y = m.p[1]; ME.st.z = m.p[2]; ME.st.vy = 0;
    if (m.spawn) { ME.st.yaw = m.yaw; ME.st.pitch = 0; ME.drawing = false; ME.drawT = 0; ME.nockT = 0; ME.alive = true; ME.hp = 100; ME.cam = 'fp'; ME.specId = null; ME.deadAt = 0; ME.spawnAt = now(); ME.st.crouch = false; ME.crouchToggle = false; emit('spawn'); }
  });
  on('meSnap', (p, e) => {
    const f = e[6], wasAlive = ME.alive; ME.alive = !!(f & 1);
    if (ME.hp > e[7] && ME.alive) { ME.hurtAt = now(); }
    ME.hp = e[7]; if (CL.src === 'practice') ME.arrows = 99; else if (!ME.drawing || e[8] < ME.arrows) ME.arrows = e[8];
    if (wasAlive && !ME.alive) { ME.drawing = false; }
    if (!wasAlive && ME.alive && ME.cam !== 'fp') { ME.cam = 'fp'; ME.specId = null; }
  });
  on('worldReset', () => { ME.drawing = false; ME.cam = 'fp'; ME.specId = null; ME.alive = true; });
  on('roundStart', () => { ME.drawing = false; ME.cam = 'fp'; ME.specId = null; });
  function startDraw() {
    if (!canAct() || ME.drawing || ME.nockT > 0 || ME.arrows <= 0) { if (canAct() && ME.arrows <= 0) emit('toast', 'Out of arrows: find a bundle or pull your misses out of the trees'); return false; }
    if (ME.st.sprint) ME.st.sprint = false;
    ME.drawing = true; ME.drawT = 0; ME.full = false; send({ t: 'draw' }); emit('drawStart'); return true;
  }
  function cancelDraw(quiet) { if (!ME.drawing) return; ME.drawing = false; ME.drawT = 0; send({ t: 'cancel' }); if (!quiet) emit('drawCancel'); }
  function release() {
    if (!ME.drawing) return; ME.drawing = false;
    if (!canAct()) return;
    const power = W.drawPower(ME.drawT), full = W.isFull(power), speed = W.launchSpeed(power), o = W.shotOrigin(ME.st, full), v = W.aimVector(ME.st.yaw, ME.st.pitch, speed), cid = ++ME.cid;
    send({ t: 'fire', cid, yaw: ME.st.yaw, pitch: ME.st.pitch, dt: ME.drawT });
    // the arrow leaves the bow now; the server's copy takes over its id when it arrives
    const a = { id: 'L' + cid, tmpId: 'L' + cid, by: CL.me, o, v, g: W.gravFor(power), local: true, t0: now(), pw: power, end: null };
    CL.arrows.set(a.tmpId, a); CL.cidMap.set(cid, a); emit('arrowNew', a);
    if (CL.src !== 'practice' && !W.BOW.infinite) ME.arrows = Math.max(0, ME.arrows - 1);   // the quiver never runs out
    ME.nockT = W.BOW.nock; ME.releasedAt = now(); ME.drawT = 0; emit('release', power);
  }
  function meTick(dt, I) {
    const st = ME.st;
    ME.nockT = Math.max(0, ME.nockT - dt);
    st.crouch = (I.crouch || ME.crouchToggle) && ME.alive;
    const sprintWant = !!I.sprint && !st.crouch && (I.mz > .2);
    if (sprintWant && ME.drawing) cancelDraw();   // sprinting lowers the bow
    st.sprint = sprintWant && !ME.drawing;
    if (canAct()) {
      let left = dt; while (left > 1e-4) { const h = Math.min(left, 1 / 60); W.moveStep(st, { mx: I.mx, mz: I.mz, jump: I.jump, drawing: ME.drawing }, h); left -= h; I.jump = false; }
      ME.moveAmt = ease(ME.moveAmt, Math.hypot(I.mx, I.mz) > .1 && st.onGround ? 1 : 0, 8, dt);
    } else { ME.moveAmt = ease(ME.moveAmt, 0, 8, dt); if (ME.drawing && !canAct()) ME.drawing = false; }
    if (ME.drawing) { ME.drawT += dt; if (!ME.full && ME.drawT >= W.BOW.fullDraw) { ME.full = true; emit('fullDraw'); } }
    ME.eye = ease(ME.eye, W.eyeHeight(st.crouch), 12, dt);
    const sp = st.sprint ? 1.5 : st.crouch ? .6 : ME.drawing ? .65 : 1; ME.bob += dt * 7.5 * sp * ME.moveAmt;
    if (Math.floor(ME.bob / Math.PI) !== ME.lastStepPhase) { ME.lastStepPhase = Math.floor(ME.bob / Math.PI); if (ME.moveAmt > .5) emit('myStep', st); }
    // report where you are about twenty times a second
    ME.sendAcc += dt; if (ME.sendAcc >= .05 && CL.src) { ME.sendAcc = 0; send({ t: 'in', s: ++ME.seq, p: [+st.x.toFixed(3), +st.y.toFixed(3), +st.z.toFixed(3)], yaw: +st.yaw.toFixed(4), pitch: +st.pitch.toFixed(4), c: st.crouch, sp: st.sprint }); }
  }
  // the dotted preview: the same launch speed and gravity the real arrow will have
  function previewNow() { const p = W.drawPower(ME.drawT), v = W.aimVector(ME.st.yaw, ME.st.pitch, W.launchSpeed(p)); return { o: W.shotOrigin(ME.st, W.isFull(p)), v, p, g: W.gravFor(p) }; }
  function myEye(out) { out[0] = ME.st.x; out[1] = ME.st.y + ME.eye; out[2] = ME.st.z; return out; }
