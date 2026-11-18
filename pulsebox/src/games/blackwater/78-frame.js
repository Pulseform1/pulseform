  /* ---------- 78 frame: the simulation into the picture, every frame ---------- */
  const _e = [0, 0, 0]; let _c;
  function lightFrame() {
    const a = (S.tod - 6) / 12 * Math.PI, sun = new THREE.Vector3(Math.cos(a) * .88, Math.sin(a), -.42).normalize(), moon = new THREE.Vector3(-Math.cos(a) * .8, -Math.sin(a) * .9 + .25, .5).normalize();
    const day = sm(cl((sun.y + .1) / .35, 0, 1)), twi = Math.exp(-(((sun.y - .02) / .14) ** 2)) * (sun.y > -.25 ? 1 : 0), u = X.common;
    u.uSunDir.value.copy(sun); u.uMoonDir.value.copy(moon); u.uDay.value = day; u.uTwi.value = twi; u.uCloud.value = S.cloud; u.uFlash.value = S.flash; u.uTime.value = S.t; u.uRain.value = S.rain; u.uSea.value = S.sea;
    u.uSunCol.value.copy(LC('#ffa860').lerp(LC('#fff3df'), cl(sun.y / .35, 0, 1)));
    const R0 = RAFT; X.sun.position.set(R0.x + sun.x * 40, sun.y * 40, R0.z + sun.z * 40); X.sun.target.position.set(R0.x, 0, R0.z);
    X.sun.intensity = 1.9 * day * (1 - .72 * S.cloud) * (sun.y > 0 ? 1 : 0); X.sun.color.copy(u.uSunCol.value);
    X.moon.position.set(R0.x + moon.x * 40, moon.y * 40, R0.z + moon.z * 40); X.moon.target.position.set(R0.x, 0, R0.z); X.moon.intensity = (1 - day) * .45 * (1 - .65 * S.cloud) * (moon.y > 0 ? 1 : 0);
    X.bolt.intensity = S.flash * 2.4; X.hemi.intensity = .08 + .55 * day * (1 - .4 * S.cloud) + S.flash * .7; X.hemi.color.copy(LC('#cfe3ff')).multiplyScalar(1); X.hemi.groundColor.copy(LC('#183040'));
    X.vhemi.intensity = X.hemi.intensity; X.vsun.intensity = X.sun.intensity * .7 + X.moon.intensity * .6 + S.flash * 1.5;
    X.ocean.material.uniforms.uMoonVis.value = (1 - day) * (1 - .9 * S.cloud);
    X.ocean.material.uniforms.uFog.value = .00065 + S.cloud * .0012 + S.rain * .0035;
    // the haze for solid things: about the colour of the horizon
    const hz = _c.setRGB(lp(.006, .5, day), lp(.01, .66, day), lp(.024, .82, day)); const g = hz.r * .3 + hz.g * .5 + hz.b * .2; hz.lerp(new THREE.Color(g * .62, g * .66, g * .72), S.cloud * .88);
    X.scene.fog.color.copy(hz).offsetHSL(0, 0, S.flash * .2); X.scene.fog.density = .0008 + S.cloud * .0015 + S.rain * .004;
    return { day, sun };
  }
  function renderFrame(dt) {
    X.t += dt; seaFrame(); syncSea(X.sea); const L = lightFrame(), cam = X.camera;
    // the camera: your eyes, riding the deck; the raft's tilt only partly reaches the view (less still in reduced motion)
    eyePos(_e); const rel = PL.yaw - RAFT.yaw, k = PL.onRaft ? (CFG.reduce ? .12 : .45) : 0;
    const tf = -RAFT.roll * Math.sin(rel) + RAFT.pitch * Math.cos(rel), tr = RAFT.roll * Math.cos(rel) + RAFT.pitch * Math.sin(rel);
    X.shake = Math.max(0, (X.shake || 0) - dt * 2); const sh = CFG.reduce ? 0 : X.shake;
    cam.position.set(_e[0] + (Math.random() - .5) * sh * .06, _e[1] + (Math.random() - .5) * sh * .06, _e[2]); cam.rotation.set(PL.pitch + tf * k, PL.yaw, -tr * k);
    cam.updateMatrixWorld();
    // the ocean follows you, snapped to its first ring spacing
    X.ocean.position.set(Math.round(cam.position.x / 2) * 2, 0, Math.round(cam.position.z / 2) * 2);
    const ou = X.ocean.material.uniforms; ou.uCam.value.copy(cam.position);
    { updateRaftMask(); const m = rotM(RAFT); ou.uRaftT.value.set(RAFT.x, RAFT.z, Math.cos(RAFT.yaw), Math.sin(RAFT.yaw)); ou.uRaftP.value.set(RAFT.y, m[3], m[5]); }
    const n = RAFT.cells.size, cur = currentAt(RAFT.x, RAFT.z, [0, 0]); let ci = 0, cj = 0; for (const c of RAFT.cells.values()) { ci += c.i / n; cj += c.j / n; } const [rcx, rcz] = flatW(RAFT, ci * CS, cj * CS); ou.uRaft.value.set(rcx, rcz, Math.sqrt(n) * CS * .56 + .2, 0); ou.uRaftV.value.set(RAFT.vx - cur[0] * .5 + paddle[0], RAFT.vz - cur[1] * .5 + paddle[1]);
    // underwater: the waterline pass while the lens is near the surface, thick blue haze once it is under
    const wh = waterH(cam.position.x, cam.position.z); X.underOn = !PL.onRaft && cam.position.y < wh + .7; const fully = !PL.onRaft && cam.position.y < wh - .15;
    if (fully) { X.scene.fog.color.setRGB(0, .045 * Math.max(L.day, .15), .06 * Math.max(L.day, .15)); X.scene.fog.density = .09; }
    X.under.material.uniforms.uInv.value.copy(cam.projectionMatrixInverse).premultiply(cam.matrixWorld); X.under.material.uniforms.uCamP.value.copy(cam.position); X.under.material.uniforms.uDay.value = L.day;
    syncSea(X.under.material.uniforms); X.sky.position.copy(cam.position);
    // the raft and what broke away
    for (const b of [RAFT, ...DRIFT]) {
      let rec = b === RAFT ? { G: X.raftG, map: X.cellG } : X.drifts.get(b);
      if (!rec) { rec = { G: new THREE.Group(), map: new Map() }; rec.G.rotation.order = 'YXZ'; X.scene.add(rec.G); X.drifts.set(b, rec); }
      rec.G.rotation.order = 'YXZ'; rec.G.position.set(b.x, b.y, b.z); rec.G.rotation.set(b.pitch, b.yaw, b.roll); syncRaft(b, rec.G, rec.map);
      for (const m of rec.map.values()) { const c = m.userData.cell; m.position.set(c.shake ? (Math.random() - .5) * c.shake * .12 : 0, c.shake ? Math.random() * c.shake * .06 : 0, 0); }
    }
    for (const [b, rec] of X.drifts) if (!DRIFT.includes(b)) { X.scene.remove(rec.G); X.drifts.delete(b); }
    // fires: flames, a light, the fish on the spit
    let fireNear = null, fd = 1e9;
    X.raftG.traverse(o => { if (o.userData.fire) { const F = o.userData.fire.fire; o.visible = !!(F && F.lit); if (o.visible) { o.scale.set(.5 + Math.random() * .12, .85 + Math.random() * .2, 1); o.getWorldPosition(_v1); const d = _v1.distanceTo(cam.position); if (d < fd) { fd = d; fireNear = _v1.clone(); } } } if (o.userData.cook) { const F = o.userData.cook.fire; o.visible = !!(F && F.cook); if (o.visible) o.material = F.cook.done ? MAT.hurt : MAT.shark; } });
    if (!fireNear && (S.tod < 6.6 || S.tod > 18.4)) X.raftG.traverse(o => { if (o.userData.lamp) { o.getWorldPosition(_v1); const d = _v1.distanceTo(cam.position); if (d < fd) { fd = d; fireNear = _v1.clone(); } } });   // lanterns light the deck at night
    X.firePt.intensity = fireNear ? 1.6 + Math.random() * .5 : 0; if (fireNear) X.firePt.position.copy(fireNear).add(_v2.set(0, .4, 0));
    // your torch: warm, flickering, on your hands and the wood near you
    const fl = PL.torch ? 1.5 + Math.sin(X.t * 17) * .15 + Math.sin(X.t * 31) * .1 + (Math.random() - .5) * .25 : 0;
    X.torch.intensity = fl; X.torch.position.set(cam.position.x + Math.sin(PL.yaw + 1.2) * -.35, cam.position.y + .05, cam.position.z + Math.cos(PL.yaw + 1.2) * -.35); X.vtorch.intensity = fl * .8;
    // salvage
    for (const f of FL) { let m = X.items.get(f.id); if (!m) { m = itemMesh(f.k); m.rotation.order = 'YXZ'; X.items.set(f.id, m); X.scene.add(m); } m.position.set(f.x, f.y, f.z); m.rotation.set(f.pitch, f.yaw, f.roll); }
    for (const [id, m] of X.items) if (!FL.some(f => f.id === id)) { X.scene.remove(m); X.items.delete(id); }
    // hook and rope: slack lies on the water, tension pulls it straight
    const hand = handWorld(), hv = HK.state === 'fly' || HK.state === 'water';
    X.hook.visible = hv; X.rope.visible = hv;
    if (hv) {
      X.hook.position.set(HK.x, HK.y + .05, HK.z); X.hook.rotation.y += dt * .3;
      const pts = [], slack = HK.state === 'water' ? 1 - HK.tension : .35, N = 24;
      for (let i = 0; i <= N; i++) { const t = i / N, x = lp(hand.x, HK.x, t), z = lp(hand.z, HK.z, t); let y = lp(hand.y, HK.y, t) - Math.sin(Math.PI * t) * slack * Math.min(3, Math.hypot(HK.x - hand.x, HK.z - hand.z) * .12); if (HK.state === 'water') y = Math.max(y, waterH(x, z) + .02); pts.push([x, y, z]); }
      bendRope(X.rope, pts);
    }
    // the bobber and the fishing line
    const bv = FS.state === 'fly' || FS.state === 'wait' || FS.state === 'bite' || FS.state === 'fight'; X.bobber.visible = bv; X.line.visible = bv;
    if (bv) { X.bobber.position.set(FS.x, FS.y, FS.z); const tip = rodTip(); const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push([lp(tip.x, FS.x, t), lp(tip.y, FS.y, t) - Math.sin(Math.PI * t) * (1 - FS.tension) * .8, lp(tip.z, FS.z, t)]); } bendRope(X.line, pts); }
    // the shark
    X.cache.visible = CACHE.on; X.cache.position.set(CACHE.x, CACHE.y, CACHE.z); X.cache.rotation.y = .6;
    for (const b of X.bubbles) { b.visible = CACHE.on; if (!CACHE.on) continue; const p = (X.t * .25 + b.userData.ph) % 1, top = waterH(CACHE.x, CACHE.z); b.position.set(CACHE.x + Math.sin(b.userData.ph * 40 + X.t) * .25, lp(CACHE.y + .3, top, p), CACHE.z + Math.cos(b.userData.ph * 33 + X.t) * .25); b.scale.setScalar(.6 + p * 1.2); }
    // friends on the raft (or in the water)
    if (!X.peers) X.peers = new Map();
    for (const [id, o] of X.peers) if (!NET.peers.has(id)) { X.scene.remove(o); X.peers.delete(id); }
    for (const [id, p] of NET.peers) {
      if (!p.pose) continue; let o = X.peers.get(id); if (!o) { o = personMesh(p.col || '#ffd23f', p.name || 'Friend'); X.scene.add(o); X.peers.set(id, o); o.userData.pos = null; }
      const q = p.pose, tgt = q.onRaft ? toWorld(RAFT, q.lx, DECK + q.ly, q.lz) : [q.wx, q.wy - 1.45, q.wz];
      const cur = o.userData.pos || (o.userData.pos = tgt.slice()); for (let i = 0; i < 3; i++) cur[i] += (tgt[i] - cur[i]) * Math.min(1, dt * 12);
      o.position.set(cur[0], cur[1], cur[2]); o.rotation.y = q.yaw; o.userData.flame.visible = !!q.torch;
      const sw = Math.sin(X.t * 6) * (q.onRaft ? .25 : .7); o.userData.armL.rotation.x = sw; o.userData.armR.rotation.x = q.tool === 'hook' || q.tool === 'rod' ? -.9 : -sw;
    }
    X.shark.visible = SH.state !== 'away';
    if (X.shark.visible) { X.shark.position.set(SH.x, SH.y, SH.z); X.shark.rotation.set(0, -SH.yaw, SH.state === 'bite' ? Math.sin(X.t * 24) * .12 : 0); X.shark.userData.tail.rotation.y = Math.sin(SH.swim) * .45; }
    // the thing from below
    X.ct.visible = CT.state !== 'none';
    if (X.ct.visible) { X.ct.position.set(CT.x, CT.y - 8, CT.z); X.ct.rotation.y = Math.atan2(RAFT.x - CT.x, RAFT.z - CT.z);
      X.ct.userData.feelers.forEach(f => f.userData.segs.forEach((s, i) => { s.rotation.x = Math.sin(X.t * .9 + f.userData.ph + i * .6) * .16; s.rotation.z = Math.cos(X.t * .7 + f.userData.ph + i * .4) * .1; }));
      X.ct.userData.arms.forEach(a => a.userData.segs.forEach((s, i) => { s.rotation.z = a.userData.side * (-.05 + Math.sin(X.t * .45 + i * .5 + a.userData.ph) * .07); s.rotation.x = Math.sin(X.t * .35 + i * .3) * .05; }));
      if (S.flash > .3) X.bolt.position.set(CT.x + 80, 150, CT.z + 40), X.bolt.target.position.set(CT.x, 30, CT.z); }
    else if (S.flash > .3 && !X.boltSet) { X.bolt.position.set(RAFT.x + rnd(-200, 200), 200, RAFT.z + rnd(-200, 200)); X.bolt.target.position.set(RAFT.x, 0, RAFT.z); }
    fxTick(dt, cam.position); X.funnel.material.uniforms.uDay.value = L.day;
    ghostFrame(); viewFrame(dt);
    // draw: the world, your hands over it, then the waterline across the lens
    const r = X.renderer; r.clear(); r.render(X.scene, cam);
    X.vcam.position.set(0, 0, 0); r.clearDepth(); if (!fully || PL.onRaft) r.render(X.vscene, X.vcam);
    if (X.underOn) r.render(X.uscene, X.ucam);
  }
  function handWorld() { return new THREE.Vector3(.24, -.2, -.6).applyMatrix4(X.camera.matrixWorld); }
  function rodTip() { const t = X.vgroup.userData && X.vgroup.userData.tip; if (!t) return handWorld(); X.vroot.updateMatrixWorld(true); const p = new THREE.Vector3(); t.getWorldPosition(p); return p.applyMatrix4(X.camera.matrixWorld); }
  // what the hammer is about to build, shown on the deck
  function ghostFrame() {
    while (X.ghost.children.length) X.ghost.remove(X.ghost.children[0]);
    const a = ui.aim; if (PL.tool !== 'hammer' || !a || !ui.buildKind || !PL.onRaft) return;
    const k = ui.buildKind, ok = canPlace(k, a.i, a.j, a.side) && has(PIECES[k].need), m = ok ? MAT.ghostOk : MAT.ghostNo;
    const x0 = a.i * CS, z0 = a.j * CS; let o;
    if (k === 'foundation') o = new THREE.Mesh(new THREE.BoxGeometry(CS * .98, .36, CS * .98), m), o.position.set(x0, DECK - .2, z0);
    else if (k === 'wall') { const [dx, dz] = SIDES[a.side]; o = new THREE.Mesh(new THREE.BoxGeometry(dx ? .1 : CS, 1.25, dz ? .1 : CS), m); o.position.set(x0 + dx * CS * .47, DECK + .6, z0 + dz * CS * .47); }
    else if (k === 'shelter') o = new THREE.Mesh(new THREE.BoxGeometry(CS, 2.2, CS), m), o.position.set(x0, DECK + 1.1, z0);
    else o = new THREE.Mesh(new THREE.BoxGeometry(CS * .9, k === 'floor' ? .06 : .6, CS * .9), m), o.position.set(x0, DECK + (k === 'floor' ? 0 : .3), z0);
    X.ghost.add(o); X.ghost.position.set(RAFT.x, RAFT.y, RAFT.z); X.ghost.rotation.order = 'YXZ'; X.ghost.rotation.set(RAFT.pitch, RAFT.yaw, RAFT.roll);
  }
  // hands and tool: pulled back while charging, thrown forward, bobbing as you walk, the torch flame flickering
  function viewFrame(dt) {
    if (X.vtool !== PL.tool + (PL.tools.rod ? 1 : 0)) { X.vroot.remove(X.vgroup); X.vgroup = viewModel(PL.tool); X.vroot.add(X.vgroup); X.vtool = PL.tool + (PL.tools.rod ? 1 : 0); }
    const g = X.vgroup, ch = HK.state === 'charge' ? HK.charge : FS.state === 'charge' ? FS.charge : 0, reel = (HK.reel && HK.state === 'water') || (FS.reel && FS.state === 'fight');
    X.vbob = (X.vbob || 0) + dt * (PL.onRaft ? 6 : 3);
    g.position.set(Math.sin(X.vbob * .5) * .006, Math.sin(X.vbob) * .006 + (reel ? Math.sin(X.t * 18) * .01 : 0), ch * .16);
    g.rotation.set(ch * .35 + (PL.cool > .3 ? -(PL.cool - .3) * 1.2 : 0), 0, PL.tool === 'oar' && PL.paddleT ? Math.sin(PL.paddleT * 4) * .25 : 0);
    if (g.userData.spear) g.position.z -= PL.cool > .3 ? (PL.cool - .3) * 1.2 : 0;
    if (g.userData.flame) { g.userData.flame.visible = PL.torch; g.userData.flame.scale.set(.08 + Math.random() * .02, .14 + Math.random() * .03, 1); }
    X.vroot.visible = PL.onRaft || !PL.under; X.vroot.scale.setScalar(.6); X.vroot.position.set(.08, -.085, -.02);
  }
