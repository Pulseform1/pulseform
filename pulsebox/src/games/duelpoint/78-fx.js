  /* ---------- 78 fx: effects and the frame ----------
     Listens on the bus for shots, swings and explosions and turns them into tracers, sparks, bullet marks and light.
     renderFrame draws one picture: the camera at your eyes (or circling the map behind a menu), the rival, smokes, walls
     and the charge, then your own gun in a second pass on top. `screen` is which screen is up; 99-main changes it. */
  let screen = 'menu', posed = false;
  const _v = [0, 0, 0];
  function buildFx() {
    const add = o => { X.scene.add(o); return o; }, fm = o => new THREE.MeshBasicMaterial(Object.assign({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }, o));
    // muzzle flash: a spiky star facing you and two crossed flames along the barrel
    X.starT = canvasTex(128, 128, g => { g.translate(64, 64); for (let i = 0; i < 7; i++) { g.rotate(TAU / 7 + .3); const gr = g.createLinearGradient(0, 0, 0, -62); gr.addColorStop(0, 'rgba(255,245,210,1)'); gr.addColorStop(1, 'rgba(255,140,40,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(-6, 0); g.lineTo(0, -40 - (i % 3) * 10); g.lineTo(6, 0); g.fill(); } const rg = g.createRadialGradient(0, 0, 2, 0, 0, 34); rg.addColorStop(0, 'rgba(255,255,240,1)'); rg.addColorStop(.45, 'rgba(255,200,110,.85)'); rg.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = rg; g.fillRect(-64, -64, 128, 128); });
    const sideT = canvasTex(128, 64, g => { const rg = g.createRadialGradient(24, 32, 2, 30, 32, 90); rg.addColorStop(0, 'rgba(255,250,220,1)'); rg.addColorStop(.3, 'rgba(255,190,90,.8)'); rg.addColorStop(1, 'rgba(255,110,30,0)'); g.fillStyle = rg; g.beginPath(); g.ellipse(48, 32, 48, 18, 0, 0, 7); g.fill(); });
    X.mflash = new THREE.Group(); X.mflash.add(new THREE.Mesh(new THREE.PlaneGeometry(.24, .24), fm({ map: X.starT })));
    for (const rz of [0, Math.PI / 2]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(.3, .1), fm({ map: sideT })); pl.rotation.y = Math.PI / 2; pl.position.z = -.13; const hold = new THREE.Group(); hold.rotation.z = rz; hold.add(pl); X.mflash.add(hold); }
    X.muzzle = add(new THREE.PointLight('#ffcf8a', 0, 10)); X.flashL = add(new THREE.PointLight('#ffffff', 0, 34));
    // pools
    const trG = new THREE.BoxGeometry(.014, .014, 1); trG.translate(0, 0, .5);
    X.tracers = Array.from({ length: 14 }, () => { const m = add(new THREE.Mesh(trG, fm({ color: '#ffe9b0' }))); m.visible = false; m.userData.t = 0; return m; }); X.trN = 0;
    const spG = new THREE.BoxGeometry(.035, .035, .035);
    X.sparks = Array.from({ length: 70 }, () => { const m = add(new THREE.Mesh(spG, new THREE.MeshBasicMaterial({ color: '#ffd28a' }))); m.visible = false; m.userData = { t: 0, v: [0, 0, 0] }; return m; }); X.spN = 0;
    const markT = canvasTex(64, 64, g => { const rg = g.createRadialGradient(32, 32, 2, 32, 32, 30); rg.addColorStop(0, 'rgba(10,10,10,.95)'); rg.addColorStop(.25, 'rgba(20,18,16,.8)'); rg.addColorStop(.5, 'rgba(60,54,48,.35)'); rg.addColorStop(1, 'rgba(60,54,48,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); });
    const mkM = new THREE.MeshBasicMaterial({ map: markT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), mkG = new THREE.PlaneGeometry(.16, .16);
    X.marks = Array.from({ length: 56 }, () => { const m = add(new THREE.Mesh(mkG, mkM)); m.visible = false; return m; }); X.mkN = 0;
    // smoke clouds and Rampart walls, made as the match needs them
    X.smokeM = new THREE.MeshLambertMaterial({ color: '#b6aedb', transparent: true, opacity: .94, depthWrite: false }); X.smokeG = new THREE.SphereGeometry(1, 16, 10); X.smokes = [];
    X.wallM = new THREE.MeshLambertMaterial({ color: '#ffb347', emissive: '#a85a10', emissiveIntensity: .7, transparent: true, opacity: .88 }); X.walls = [];
    // the charge: a squat device with a ring and a blinking light
    const ch = X.charge = new THREE.Group(), dk = new THREE.MeshLambertMaterial({ color: '#2a2e38' });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.2, .25, .26, 14), dk); b.position.y = .13; ch.add(b);
    const rg = new THREE.Mesh(new THREE.TorusGeometry(.23, .025, 8, 20), new THREE.MeshLambertMaterial({ color: FOE })); rg.rotation.x = Math.PI / 2; rg.position.y = .2; ch.add(rg);
    const an = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .4, 6), dk); an.position.set(.1, .44, 0); ch.add(an);
    X.chargeLamp = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), new THREE.MeshBasicMaterial({ color: WARN })); X.chargeLamp.position.y = .31; ch.add(X.chargeLamp);
    X.chargePL = new THREE.PointLight(WARN, 0, 7); X.chargePL.position.y = .7; ch.add(X.chargePL); ch.visible = false; add(ch);
    X.flareBall = add(new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }))); X.flareBall.visible = false;
    X.boom = add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), fm({ color: '#ffb060', opacity: .8 }))); X.boom.visible = false; X.boomT = 0;
    X.ejects = []; X.casings = [];
  }
  function spark(p, v, col, t) { const m = X.sparks[X.spN++ % X.sparks.length]; m.visible = true; m.position.set(p[0], p[1], p[2]); m.material.color.set(col); m.userData.t = t; m.userData.v = v; }
  // where a fighter's muzzle is, near enough for a tracer to start from
  function muzzleOf(f) {
    const d = viewDir(f.yaw, f.pitch), rx = Math.cos(f.yaw), rz = -Math.sin(f.yaw), mine = M && f === me(), side = mine && f.scoped ? 0 : mine ? .14 : .1, drop = mine ? (f.scoped ? .06 : .12) : .28, out = mine ? .75 : .7;
    _v[0] = f.x + d[0] * out + rx * side; _v[1] = eyeY(f) - drop + d[1] * out; _v[2] = f.z + d[2] * out + rz * side; return _v;
  }
  on('shot', (f, S, first) => {
    if (!X || !ready) return; const mine = f === me(), mz = muzzleOf(f), G = gun(f);
    const tr = X.tracers[X.trN++ % X.tracers.length], L = Math.hypot(S.end[0] - mz[0], S.end[1] - mz[1], S.end[2] - mz[2]);
    tr.position.set(mz[0], mz[1], mz[2]); tr.lookAt(S.end[0], S.end[1], S.end[2]); tr.scale.set(1, 1, Math.max(.1, L)); tr.visible = L > 1.5; tr.userData.t = .07; tr.material.opacity = mine ? .5 : .85;
    if (first) { X.muzzle.position.set(mz[0], mz[1], mz[2]); X.muzzle.intensity = G.sil ? 1.2 : 4; if (mine) { X.flashT = G.sil ? .025 : .05; X.ejects.push({ k: G.k, t: G.k === 'breaker' ? .3 : G.k === 'longbow' || G.k === 'kite' ? .6 : .01 }); } }
    if (S.hit) { const c = (OPS[S.hit.f.op] || OPS.vex).col; for (let i = 0; i < 5; i++) spark(S.end, [rnd(-1.5, 1.5), rnd(-.5, 2), rnd(-1.5, 1.5)], S.hit.head ? '#fff3c4' : c, .28); }
    else if (S.dist < 139) {
      for (let i = 0; i < 3; i++) spark(S.end, [S.n[0] * 2 + rnd(-1.5, 1.5), S.n[1] * 2 + rnd(0, 2), S.n[2] * 2 + rnd(-1.5, 1.5)], '#ffd28a', .22);
      const mk = X.marks[X.mkN++ % X.marks.length]; mk.visible = true; mk.position.set(S.end[0] + S.n[0] * .012, S.end[1] + S.n[1] * .012, S.end[2] + S.n[2] * .012); mk.lookAt(S.end[0] + S.n[0], S.end[1] + S.n[1], S.end[2] + S.n[2]); mk.rotation.z = Math.random() * 6;
    }
  });
  on('melee', (f, heavy, S) => { if (X && ready && S) for (let i = 0; i < 8; i++) spark(S.end, [rnd(-1.5, 1.5), rnd(-.5, 2), rnd(-1.5, 1.5)], (OPS[other(f).op] || OPS.vex).col, .32); });
  on('flarePop', fl => { if (X && ready) { X.flashL.position.set(fl.x, fl.y, fl.z); X.flashL.intensity = 18; } });
  on('boom', (x, z) => { if (X && ready) { X.boom.position.set(x, .5, z); X.boom.visible = true; X.boomT = .7; X.shake = .5; X.flashL.position.set(x, 2, z); X.flashL.intensity = 30; } });
  on('round', () => { if (X && ready) for (const m of X.marks) m.visible = false; });
  on('land', f => { if (X && M && f === me()) X.dip = .09; });

  function renderFrame(dt) {
    if (!X || !ready) return; const cam = X.camera; X.t += dt; tunePixels(dt); X.seaT.offset.x = X.t * .003; X.seaT.offset.y = X.t * .0016;
    const live = M && (screen === 'play' || (screen === 'over' && posed));
    if (!live) {   // behind the menus: a slow flight round the site
      const a = X.t * .06 + 2.4; cam.position.set(41 + Math.cos(a) * 30, 19, 21 + Math.sin(a) * 26); cam.rotation.set(0, 0, 0); cam.lookAt(38, 0, 21); cam.fov = 55; cam.updateProjectionMatrix();
      for (const A of X.agents.values()) A.visible = false; X.charge.visible = false; for (const g of X.smokes) g.visible = false; for (const w of X.walls) w.visible = false;
      X.renderer.render(X.scene, cam); return;
    }
    const P = me(), G = gun(P);
    // the camera: your eyes (gliding over steps and crouches), kicked by recoil; when you die it sinks and turns to who did it
    const ey = eyeY(P); X.camY = Math.abs(ey - X.camY) > 1.2 ? ey : X.camY + (ey - X.camY) * Math.min(1, dt * 22);
    X.dip = Math.max(0, (X.dip || 0) - dt * .5); X.shake = Math.max(0, X.shake - dt);
    let yaw = P.yaw, pitch = P.pitch + M.camKick, y = X.camY - X.dip;
    if (!P.alive && M.deathInfo) { const k = Math.min(1, M.deathInfo.t * 2); y = lp(y, P.y + .5, k); yaw += angDiff(M.deathInfo.yaw, yaw) * k; pitch = lp(pitch, .1, k); }
    cam.position.set(P.x + (Math.random() - .5) * X.shake * .3, y + (Math.random() - .5) * X.shake * .3, P.z); cam.rotation.set(pitch, yaw, 0);
    const fov = 2 * Math.atan(Math.tan(BASE_FOV * D2R / 2) / zoomOf(P)) / D2R; cam.fov += (fov - cam.fov) * Math.min(1, dt * 18); cam.updateProjectionMatrix();

    // your gun
    if (X.viewKey !== G.k + P.op) { if (X.viewGun) X.view.remove(X.viewGun); X.viewGun = viewGun(G.k, P.op); if (G.melee) X.viewGun.scale.setScalar(1.35); X.view.add(X.viewGun); X.viewKey = G.k + P.op; X.viewGun.add(X.mflash); X.drawT = .3; }
    X.drawT = Math.max(0, (X.drawT || 0) - dt); const dr = X.drawT / .3, sway = Math.sin(X.t * 1.3) * .004;
    const v = Math.hypot(P.vx, P.vz), bob = Math.sin(P.walkT * 1.9) * .012 * Math.min(1, v / 4), rel = P.reloadT > 0 ? Math.sin(Math.min(1, 1 - P.reloadT / G.rel) * Math.PI) : 0, VO = VOS[G.k] || [.2, -.2, -.28];
    const turn = cl(angDiff(P.yaw, X.lastYaw == null ? P.yaw : X.lastYaw) / Math.max(dt, .001) * .006, -.05, .05); X.lastYaw = P.yaw; X.lag = lp(X.lag || 0, turn, Math.min(1, dt * 10));   // the gun trails a turn slightly
    X.view.visible = P.alive && !(P.scoped && G.scope);
    X.view.position.set(VO[0] + bob - rel * .05 + X.lag * .5, VO[1] + Math.abs(bob) * .6 + sway + rel * .1 - P.kick * .2 - dr * dr * .25 - X.dip * .5, VO[2] + P.kick * .8);
    X.view.rotation.set(P.kick * 1.4 + rel * .12 - dr * .6, .02 + rel * .3 + X.lag, -rel * .55 + dr * .3 + X.lag * .6);
    X.mflash.position.set(0, .025, -(X.viewGun.userData.len || .5) - .03); X.mflash.visible = X.flashT > 0 && !G.melee; X.mflash.rotation.z = Math.random() * 3; X.mflash.scale.setScalar(G.cat === 'Sniper' || G.cat === 'Shotgun' ? 1.5 : G.cat === 'Sidearm' ? .8 : 1);
    viewAnim(P, G, dt);
    if (G.melee) { X.view.rotation.x += .28; X.view.rotation.y += .5; X.view.rotation.z -= .2; }
    if (P.swing) {
      const d = P.swing.heavy ? .55 : .32, q = Math.min(1, P.swing.t / d);
      if (P.swing.heavy) { const wind = q < .35 ? q / .35 : 1, th = q < .35 ? 0 : Math.sin((q - .35) / .65 * Math.PI); X.view.position.z += wind * .06 * (1 - th) - th * .16; X.view.position.y += .03 * wind; X.view.position.x -= .06 * th; X.view.rotation.x += .25 * wind - .35 * th; }
      else { const sd = P.swing.side, a = q < .22 ? q / .22 : 1, sw = q < .22 ? 0 : Math.sin(Math.min(1, (q - .22) / .5) * Math.PI / 2), k = a * (q > .72 ? 1 - (q - .72) / .28 : 1);
        X.view.position.x += k * (sd > 0 ? lp(.06, -.22, sw) : lp(-.2, .08, sw)); X.view.position.y += k * (.05 - .07 * sw); X.view.position.z -= k * .04; X.view.rotation.y += sd * k * lp(-.5, .8, sw); X.view.rotation.z += sd * k * lp(.7, -.6, sw); X.view.rotation.x -= k * .15; }
    }
    if (X.inspT > 0) { if (P.reloadT > 0 || P.kick > 0) X.inspT = 0; else X.inspT -= dt; }
    if (X.inspT > 0) { const q = 1 - X.inspT / 2.6, e = smooth(cl(Math.sin(q * Math.PI) * 1.6, 0, 1)), tw = Math.sin(q * TAU) * e; X.view.position.x -= e * .03; X.view.position.y += e * .035; X.view.position.z -= e * .1; X.view.rotation.y += e * .85; X.view.rotation.z += e * .3 + tw * .25; X.view.rotation.x += tw * .15; }
    X.adsK = lp(X.adsK || 0, P.scoped && !G.scope && P.alive ? 1 : 0, Math.min(1, dt * 16));
    if (X.adsK > .001) { const a = X.adsK, sy = X.viewGun.userData.sight || .09; X.view.position.x = lp(X.view.position.x, 0, a); X.view.position.y = lp(X.view.position.y, -sy - P.kick * .05, a); X.view.position.z = lp(X.view.position.z, VO[2] - .03 + P.kick * .5, a); X.view.rotation.y = lp(X.view.rotation.y, 0, a); X.view.rotation.z = lp(X.view.rotation.z, 0, a); X.view.rotation.x = lp(X.view.rotation.x, P.kick * .5, a); }
    if (X.flashT > 0) X.flashT -= dt;

    // the rival
    for (const [f, A] of X.agents) if (!M.fs.includes(f)) { X.scene.remove(A); X.agents.delete(f); }
    for (const f of M.fs) if (f !== P) updateAgent(f, dt);
    // smokes, Rampart walls, the charge, a flare in flight
    while (X.smokes.length < M.smokes.length) { const g = new THREE.Group(); for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(X.smokeG, X.smokeM); m.position.set((Math.random() - .5) * .7, (Math.random() - .5) * .5, (Math.random() - .5) * .7); m.scale.setScalar(.72 + i * .045); g.add(m); } X.scene.add(g); X.smokes.push(g); }
    X.smokes.forEach((g, i) => { const s = M.smokes[i]; g.visible = !!s; if (s) { g.position.set(s.x, s.y + 1.4, s.z); g.scale.set(s.r, s.r * .85, s.r); g.rotation.y += dt * .12; } });
    while (X.walls.length < M.walls.length) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), X.wallM); m.castShadow = !X.low; X.scene.add(m); X.walls.push(m); }
    X.walls.forEach((m, i) => { const w = M.walls[i]; m.visible = !!w; if (w) { m.scale.set(w.x1 - w.x0, 3 * w.grow + .01, w.z1 - w.z0); m.position.set((w.x0 + w.x1) / 2, 1.5 * w.grow, (w.z0 + w.z1) / 2); } });
    X.charge.visible = !!M.planted && !(M.phase === 'end' && M.last && M.last.why === 'boom');
    if (M.planted) { const C = M.planted, lit = !M.defused && C.beep > Math.max(.06, cl(C.t / 12, .12, 1) - .08); X.charge.position.set(C.x, C.y, C.z); X.chargeLamp.material.color.set(M.defused ? YOU : lit ? WARN : '#401018'); X.chargePL.intensity = lit ? 2.4 : 0; }
    const fl = M.flares[0]; X.flareBall.visible = !!fl; if (fl) X.flareBall.position.set(fl.x, fl.y, fl.z);
    // tracers, sparks, lights fading
    for (const t of X.tracers) if (t.visible && (t.userData.t -= dt) <= 0) t.visible = false;
    for (const s of X.sparks) if (s.visible) { const u = s.userData; if ((u.t -= dt) <= 0) { s.visible = false; continue; } u.v[1] -= 9 * dt; s.position.x += u.v[0] * dt; s.position.y += u.v[1] * dt; s.position.z += u.v[2] * dt; }
    X.muzzle.intensity = Math.max(0, X.muzzle.intensity - dt * 60); X.flashL.intensity = Math.max(0, X.flashL.intensity - dt * 50);
    if (X.boomT > 0) { X.boomT -= dt; const k = 1 - X.boomT / .7; X.boom.scale.setScalar(1 + k * 15); X.boom.material.opacity = .8 * (1 - k); X.boom.visible = X.boomT > 0; }

    X.renderer.render(X.scene, cam);
    if (X.view.visible) {   // your gun, over the world, with its own depth
      X.vroot.position.copy(cam.position); X.vroot.quaternion.copy(cam.quaternion); updateCasings(dt); X.vmuzzle.intensity = X.flashT > 0 ? 3 : 0;
      const ac = X.renderer.autoClear; X.renderer.autoClear = false; X.renderer.clearDepth(); X.renderer.render(X.vscene, cam); X.renderer.autoClear = ac;
    }
  }
  // a point in the world on the screen, in the HUD's 1280 by 720 units (null when it is behind you)
  function toScreen(x, y, z) {
    if (!X || !ready) return null; const p = new THREE.Vector3(x, y, z).project(X.camera); if (p.z > 1) return null;
    const V = K.view; return [lp(V.x0, V.x1, (p.x + 1) / 2), lp(V.y0, V.y1, (1 - p.y) / 2)];
  }
