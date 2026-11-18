  /* ---------- 78 fx: effects and the frame ----------
     Listens on the bus for shots, swings and explosions and turns them into tracers, sparks, bullet marks and light.
     renderFrame draws one picture: the camera at your eyes (or circling the map behind a menu), the rival, smokes, walls
     and the charge, then your own gun in a second pass on top. `screen` is which screen is up; 99-main changes it. */
  let screen = 'menu', posed = false;
  const _v = [0, 0, 0];
  function addSmoke() { const g = new THREE.Group(); for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(X.smokeG, X.smokeM); m.position.set((Math.random() - .5) * .7, (Math.random() - .5) * .5, (Math.random() - .5) * .7); m.scale.setScalar(.72 + i * .045); g.add(m); } g.visible = false; X.scene.add(g); X.smokes.push(g); }
  function addWall() { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), X.wallM); m.castShadow = !X.low; m.visible = false; X.scene.add(m); X.walls.push(m); }
  // build every shader the match can need before it starts: a material seen for the first time mid-round (the charge, a
  // smoke, a wall, a grenade) would otherwise compile on the spot and hitch the frame
  function warmShaders() {
    if (!X || !X.renderer) return;
    if (!X.olDummy) { X.olDummy = new THREE.Mesh(new THREE.BoxGeometry(.01, .01, .01), outlineMat()); X.olDummy.visible = false; X.scene.add(X.olDummy); }
    if (!X.smokes.length) addSmoke(); if (!X.walls.length) addWall(); if (!X.nadeObjs.length) { const o = X.nadeMk(); o.visible = false; X.scene.add(o); X.nadeObjs.push(o); }
    try { X.renderer.compile(X.scene, X.camera); X.renderer.compile(X.vscene, X.camera); } catch (e) { console.warn(e); }
  }
  function buildFx() {
    const add = o => { X.scene.add(o); return o; }, fm = o => new THREE.MeshBasicMaterial(Object.assign({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }, o));
    // muzzle flash: a spiky star facing you and two crossed flames along the barrel
    X.starT = canvasTex(128, 128, g => { g.translate(64, 64); for (let i = 0; i < 7; i++) { g.rotate(TAU / 7 + .3); const gr = g.createLinearGradient(0, 0, 0, -62); gr.addColorStop(0, 'rgba(255,245,210,1)'); gr.addColorStop(1, 'rgba(255,140,40,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(-6, 0); g.lineTo(0, -40 - (i % 3) * 10); g.lineTo(6, 0); g.fill(); } const rg = g.createRadialGradient(0, 0, 2, 0, 0, 34); rg.addColorStop(0, 'rgba(255,255,240,1)'); rg.addColorStop(.45, 'rgba(255,200,110,.85)'); rg.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = rg; g.fillRect(-64, -64, 128, 128); });
    const sideT = canvasTex(128, 64, g => { const rg = g.createRadialGradient(24, 32, 2, 30, 32, 90); rg.addColorStop(0, 'rgba(255,250,220,1)'); rg.addColorStop(.3, 'rgba(255,190,90,.8)'); rg.addColorStop(1, 'rgba(255,110,30,0)'); g.fillStyle = rg; g.beginPath(); g.ellipse(48, 32, 48, 18, 0, 0, 7); g.fill(); });
    X.mflash = new THREE.Group(); X.mflash.add(new THREE.Mesh(new THREE.PlaneGeometry(.24, .24), fm({ map: X.starT })));
    for (const rz of [0, Math.PI / 2]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(.3, .1), fm({ map: sideT })); pl.rotation.y = Math.PI / 2; pl.position.z = -.13; const hold = new THREE.Group(); hold.rotation.z = rz; hold.add(pl); X.mflash.add(hold); }
    X.muzzle = add(new THREE.PointLight('#ffcf8a', 0, 10)); X.flashL = add(new THREE.PointLight('#ffffff', 0, 34));
    // pools
    // tracers: a short streak, bright at its head and fading to nothing behind, that flies down the shot's path in a few hundredths of a second
    const trT = canvasTex(4, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,200,120,0)'); gr.addColorStop(.7, 'rgba(255,214,150,.45)'); gr.addColorStop(1, 'rgba(255,240,210,1)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    trT.wrapS = trT.wrapT = THREE.ClampToEdgeWrapping;
    const trG = new THREE.PlaneGeometry(1, 1); trG.rotateX(-Math.PI / 2); trG.translate(0, 0, -.5); const trG2 = trG.clone(); trG2.rotateZ(Math.PI / 2);
    X.tracers = Array.from({ length: 24 }, () => { const mat = fm({ map: trT, color: '#ffffff', opacity: .3 }), g = new THREE.Group(); g.add(new THREE.Mesh(trG, mat), new THREE.Mesh(trG2, mat)); g.visible = false; g.userData = { mat, a: [0, 0, 0], d: [0, 0, 1], L: 0, age: 0, s0: 0, len: 1, op: .3 }; return add(g); }); X.trN = 0;
    const spG = new THREE.BoxGeometry(.035, .035, .035);
    X.sparks = Array.from({ length: 70 }, () => { const m = add(new THREE.Mesh(spG, new THREE.MeshBasicMaterial({ color: '#ffd28a' }))); m.visible = false; m.userData = { t: 0, v: [0, 0, 0] }; return m; }); X.spN = 0;
    const markT = canvasTex(64, 64, g => { const rg = g.createRadialGradient(32, 32, 2, 32, 32, 30); rg.addColorStop(0, 'rgba(10,10,10,.95)'); rg.addColorStop(.25, 'rgba(20,18,16,.8)'); rg.addColorStop(.5, 'rgba(60,54,48,.35)'); rg.addColorStop(1, 'rgba(60,54,48,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); });
    const mkM = new THREE.MeshBasicMaterial({ map: markT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), mkG = new THREE.PlaneGeometry(.16, .16);
    X.marks = Array.from({ length: 56 }, () => { const m = add(new THREE.Mesh(mkG, mkM)); m.visible = false; return m; }); X.mkN = 0;
    // smoke clouds and Rampart walls, made as the match needs them
    X.smokeM = new THREE.MeshLambertMaterial({ color: '#b6aedb', transparent: true, opacity: .94, depthWrite: false }); X.smokeG = new THREE.SphereGeometry(1, 16, 10); X.smokes = [];
    X.smokeGM = new THREE.MeshLambertMaterial({ color: '#c4c8ce', transparent: true, opacity: .96, depthWrite: false });   // a grenade's cloud is grey, Vex's Veil is violet
    { const body = new THREE.MeshStandardMaterial({ color: '#59606b', metalness: .5, roughness: .45 }), band = new THREE.MeshBasicMaterial({ color: '#c3cad4' }); X.nadeMk = () => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .13, 12), body); const t = new THREE.Mesh(new THREE.CylinderGeometry(.034, .034, .035, 10), band); t.position.y = .08; const l = new THREE.Mesh(new THREE.BoxGeometry(.012, .02, .09), body); l.position.set(.045, .05, 0); g.add(c, t, l); return g; }; X.nadeObjs = []; }
    X.wallM = new THREE.MeshLambertMaterial({ color: '#ffb347', emissive: '#a85a10', emissiveIntensity: .7, transparent: true, opacity: .88 }); X.walls = [];
    // the charge: a squat device with a ring and a blinking light
    const ch = X.charge = new THREE.Group(), dk = new THREE.MeshLambertMaterial({ color: '#2a2e38' });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.2, .25, .26, 14), dk); b.position.y = .13; ch.add(b);
    const rg = new THREE.Mesh(new THREE.TorusGeometry(.23, .025, 8, 20), new THREE.MeshLambertMaterial({ color: FOE })); rg.rotation.x = Math.PI / 2; rg.position.y = .2; ch.add(rg);
    const an = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .4, 6), dk); an.position.set(.1, .44, 0); ch.add(an);
    X.chargeLamp = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), new THREE.MeshBasicMaterial({ color: WARN })); X.chargeLamp.position.y = .31; ch.add(X.chargeLamp);
    // its light is always in the scene, just dark: a light appearing mid-round changes the light count, and every lit material
    // would then rebuild its shader at once (the stutter you used to feel the moment the charge went down)
    X.chargePL = add(new THREE.PointLight(WARN, 0, 7)); X.chargePL.position.set(0, -20, 0); ch.visible = false; add(ch);
    X.flareBall = add(new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }))); X.flareBall.visible = false;
    X.boom = add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), fm({ color: '#ffb060', opacity: .8 }))); X.boom.visible = false; X.boomT = 0;
    X.ejects = []; X.casings = [];
    buildKitFx();
  }
  function spark(p, v, col, t) { const m = X.sparks[X.spN++ % X.sparks.length]; m.visible = true; m.position.set(p[0], p[1], p[2]); m.material.color.set(col); m.userData.t = t; m.userData.v = v; }
  // where a fighter's muzzle is, near enough for a tracer to start from
  function muzzleOf(f) {
    const d = viewDir(f.yaw, f.pitch), rx = Math.cos(f.yaw), rz = -Math.sin(f.yaw), mine = M && f === me(), side = mine && f.scoped ? 0 : mine ? .14 : .1, drop = mine ? (f.scoped ? .06 : .12) : .28, out = mine ? .75 : .7;
    _v[0] = f.x + d[0] * out + rx * side; _v[1] = eyeY(f) - drop + d[1] * out; _v[2] = f.z + d[2] * out + rz * side; return _v;
  }
  on('shot', (f, S, first) => {
    if (!X || !ready) return; const mine = f === me(), mz = muzzleOf(f), G = gun(f);
    // your own streaks start a few metres out and are faint; your rival's are a little clearer so you can tell where fire comes from. Shotguns show a few pellets, not all
    const L = Math.hypot(S.end[0] - mz[0], S.end[1] - mz[1], S.end[2] - mz[2]), s0 = mine ? 3.5 : .6;
    if (L > s0 + 1 && !(G.pel > 1 && Math.random() > .3)) { const tr = X.tracers[X.trN++ % X.tracers.length], u = tr.userData;
      u.a = [mz[0], mz[1], mz[2]]; u.d = [(S.end[0] - mz[0]) / L, (S.end[1] - mz[1]) / L, (S.end[2] - mz[2]) / L]; u.L = L; u.age = 0; u.s0 = s0; u.len = mine ? 1.4 : 2.2; u.w = mine ? .005 : .008; u.op = mine ? (G.sil ? .08 : .14) : (G.sil ? .16 : .3); u.mat.color.set(G.rail ? '#38e8ff' : '#ffffff'); if (G.rail) { u.op = .9; u.len = 6; u.w = .02; }
      tr.position.set(mz[0], mz[1], mz[2]); tr.lookAt(S.end[0], S.end[1], S.end[2]); tr.visible = false; tr.userData.live = true; }
    if (first && mine) { const kv = (G.kickV || VKICK[G.cat] || 1) * (f.scoped ? .55 : 1); X.recV = (X.recV || 0) + 2.6 * kv; X.recYV = (X.recYV || 0) + (Math.random() - .5) * 1.6 * kv; }
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
  on('dry', f => { if (X && M && f === me()) X.dryT = .16; });
  const VKICK = { Sidearm: 1.25, SMG: .7, Rifle: 1, Sniper: 2.2, Shotgun: 1.9, Heavy: .8 };   // how hard each class kicks in your hands

  function renderFrame(dt) {
    if (!X || !ready) return; const cam = X.camera; X.t += dt; tunePixels(dt); if (X.seaT) { X.seaT.offset.x = X.t * .003; X.seaT.offset.y = X.t * .0016; }
    const live = M && (screen === 'play' || (screen === 'over' && posed)) && !loadingNow();
    if (!live) {   // behind the menus: a slow flight round the site
      if (screen === 'select' && UI.sel) { for (const g of X.smokes) g.visible = false; for (const o of X.nadeObjs) o.visible = false; for (const w of X.walls) w.visible = false; return renderSelect(dt); }
      const a = X.t * .06 + 2.4, k = MW / 64; cam.position.set(MW / 2 + 9 * k + Math.cos(a) * 30 * k, 19 * k, MH / 2 - 1 + Math.sin(a) * 26 * k); cam.rotation.set(0, 0, 0); cam.lookAt(MW / 2 + 6 * k, 0, MH / 2 - 1); cam.fov = 55; cam.updateProjectionMatrix();
      for (const A of X.agents.values()) A.visible = false; X.charge.visible = false; for (const g of X.smokes) g.visible = false; for (const o of X.nadeObjs) o.visible = false; for (const w of X.walls) w.visible = false; hideKitFx();
      X.renderer.render(X.scene, cam); return;
    }
    const P = me(), G = gun(P); if (X.hemiBase != null) X.hemi.intensity = X.hemiBase;
    // the camera: your eyes (gliding over steps and crouches), kicked by recoil; when you die it sinks and turns to who did it
    const ey = ipos(P, 'y') + lp(EYE, CEYE, P.crouch); X.camY = Math.abs(ey - X.camY) > 1.2 ? ey : X.camY + (ey - X.camY) * Math.min(1, dt * 22);
    X.dip = Math.max(0, (X.dip || 0) - dt * .5); X.shake = Math.max(0, X.shake - dt);
    X.roll = lp(X.roll || 0, P.slide ? .075 : 0, Math.min(1, dt * 9));   // a slide tips the view a little
    // the spray climbs the view as well as the bullets: the camera follows about half of where the pattern has pushed the
    // next shot (the crosshair stays put on screen, so the rest shows as bullets landing above it), and glides back as the spray settles
    { const pt = P.alive && !G.melee ? patOf(P, G) : [0, 0], fol = P.scoped && G.scope ? .25 : .55, k = Math.min(1, dt * 18);
      X.vpY = lp(X.vpY || 0, pt[0] * fol, k); X.vpP = lp(X.vpP || 0, pt[1] * fol, k); }
    let yaw = P.yaw + X.vpY, pitch = P.pitch + M.camKick + X.vpP, y = X.camY - X.dip;
    if (P.daze > 0) { const k = Math.min(1, P.daze / .8); yaw += Math.sin(X.t * 6.3) * .014 * k; pitch += Math.cos(X.t * 4.7) * .011 * k; }   // a Shockwave's daze rocks the view
    if (!P.alive && M.deathInfo) { const k = Math.min(1, M.deathInfo.t * 2); y = lp(y, P.y + .5, k); yaw += angDiff(M.deathInfo.yaw, yaw) * k; pitch = lp(pitch, .1, k); }
    cam.position.set(ipos(P, 'x') + (Math.random() - .5) * X.shake * .3, y + (Math.random() - .5) * X.shake * .3, ipos(P, 'z')); cam.rotation.set(pitch, yaw, X.roll);
    X.fovK = lp(X.fovK || 0, P.slide ? 1 : P.sprinting ? .6 : 0, Math.min(1, dt * 7));   // speed widens the view a touch
    const fov = 2 * Math.atan(Math.tan(BASE_FOV * (1 + X.fovK * .09) * D2R / 2) / zoomOf(P)) / D2R; cam.fov += (fov - cam.fov) * Math.min(1, dt * 18); cam.updateProjectionMatrix();

    // your gun
    if (X.viewKey !== G.k + P.op) { if (X.viewGun) X.view.remove(X.viewGun); X.viewGun = viewGun(G.k, P.op); if (G.melee) X.viewGun.scale.setScalar(1.35); X.view.add(X.viewGun); X.viewKey = G.k + P.op; X.viewGun.add(X.mflash); X.drawD = Math.max(.35, (G.equip || .75) * .7); X.drawT = X.drawD; X.recP = X.recV = 0; }
    // drawing: the gun comes up from below, then the class's chambering action (slide, charging handle, pump, bolt, cylinder; the knife flips)
    X.drawT = Math.max(0, (X.drawT || 0) - dt); const dq = 1 - X.drawT / (X.drawD || .35), raise = X.drawT > 0 ? 1 - sm(cl(dq / .5, 0, 1)) : 0, chamber = X.drawT > 0 && dq > .42 ? cl((dq - .42) / .52, 0, 1) : -1;
    // recoil on a spring: each shot kicks it, it settles by itself (sub-stepped so a slow frame cannot blow it up)
    for (let n = Math.ceil(dt / .008), i = 0; i < n; i++) { const h = dt / n; X.recV = (X.recV || 0) + (-420 * (X.recP || 0) - 30 * X.recV) * h; X.recP = (X.recP || 0) + X.recV * h; }
    X.recP = cl(X.recP, -.08, .22); const rk = X.recP;
    for (let n = Math.ceil(dt / .008), i = 0; i < n; i++) { const h = dt / n; X.recYV = (X.recYV || 0) + (-300 * (X.recY || 0) - 26 * X.recYV) * h; X.recY = (X.recY || 0) + X.recYV * h; }
    const climb = cl((X.vpP || 0) * 9, 0, 1.2), sideK = cl((X.vpY || 0) * 9, -.6, .6) + cl(X.recY || 0, -.06, .06);   // how far up the spray has walked the gun
    const v = Math.hypot(P.vx, P.vz), mv = Math.min(1, v / 4), sway = Math.sin(X.t * 1.3) * .004, swayX = Math.sin(X.t * .65) * .003, VO = VOS[G.k] || [.2, -.2, -.28];
    X.runK = lp(X.runK || 0, P.sprinting ? 1.25 : P.slide ? .5 : v > 3.6 && P.fireT < -.2 && P.reloadT <= 0 && !P.scoped && P.ground ? .55 : 0, Math.min(1, dt * 7));   // running: the gun drops and turns in
    X.air = lp(X.air || 0, P.ground ? 0 : cl(-P.vy * .006, -.03, .03), Math.min(1, dt * 10));   // jumping: it lags up, then down
    X.dryT = Math.max(0, (X.dryT || 0) - dt); const dry = Math.sin(X.dryT / .16 * Math.PI) * (X.dryT > 0 ? 1 : 0);
    const bob = Math.sin(P.walkT * 1.9) * .012 * mv * (1 + X.runK * .6), bobX = Math.cos(P.walkT * .95) * .008 * mv;
    // reloading: tip the gun to show the work, a jolt when the fresh magazine seats
    const rt = P.reloadT > 0 ? 1 - P.reloadT / G.rel : -1, tilt = rt < 0 ? 0 : sm(cl(rt / .14, 0, 1)) * (1 - sm(cl((rt - .88) / .12, 0, 1))), seat = rt > .76 && rt < .84 ? Math.sin((rt - .76) / .08 * Math.PI) : 0;
    // how each kind is held to reload: [left, up, roll, turn]. Magazine guns come up and in so the swap happens on screen
    const RH = G.k === 'breaker' ? [.045, .07, -.75, .3] : G.cat === 'Sidearm' ? [.04, .06, -.4, .3] : G.cat === 'Sniper' ? [.07, .09, .35, .2] : [.1, .13, -.62, .34];
    const turn = cl(angDiff(P.yaw, X.lastYaw == null ? P.yaw : X.lastYaw) / Math.max(dt, .001) * .006, -.05, .05); X.lastYaw = P.yaw; X.lag = lp(X.lag || 0, turn, Math.min(1, dt * 10));   // the gun trails a turn slightly
    X.view.visible = P.alive && !(P.scoped && G.scope);
    X.view.position.set(VO[0] + bobX + swayX + X.lag * .5 - tilt * RH[0] - X.runK * .03 + sideK * .02, VO[1] + Math.abs(bob) * .6 + sway + tilt * RH[1] + seat * .012 - rk * .22 - raise * raise * .3 - X.dip * .5 - X.runK * .035 + X.air + climb * .028, VO[2] + rk * .9 + raise * .05 + X.runK * .02 + climb * .02);
    X.view.rotation.set(rk * 1.6 + tilt * .12 + seat * .05 - raise * .7 - X.runK * .14 - dry * .035 + climb * .2, .02 + tilt * RH[3] + X.lag + X.runK * .38 - sideK * .35, tilt * RH[2] + raise * .35 + X.lag * .6 + X.runK * .26 - sideK * .3);
    X.mflash.position.set(0, .025, -(X.viewGun.userData.len || .5) - .03); X.mflash.visible = X.flashT > 0 && !G.melee; X.mflash.rotation.z = Math.random() * 3; X.mflash.scale.setScalar(G.cat === 'Sniper' || G.cat === 'Shotgun' ? 1.5 : G.cat === 'Sidearm' ? .8 : 1);
    viewAnim(P, G, dt, { draw: chamber, insp: X.inspT > 0 ? 1 - X.inspT / 2.6 : -1 });
    { const pb = X.viewGun.userData.parts.boltL; if (pb) { X.view.rotation.z += pb.rotation.z * .14; X.view.position.y -= pb.rotation.z * .012; } }   // working a bolt rolls the rifle
    X.viewGun.rotation.z = G.melee && X.drawT > 0 ? (1 - sm(cl(dq, 0, 1))) * TAU : 0;   // the knife flips into the hand
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
    if (X.adsK > .001) { const a = X.adsK, sy = X.viewGun.userData.sight || .09; X.view.position.x = lp(X.view.position.x, 0, a); X.view.position.y = lp(X.view.position.y, -sy - rk * .05, a); X.view.position.z = lp(X.view.position.z, VO[2] - .03 + rk * .5, a); X.view.rotation.y = lp(X.view.rotation.y, 0, a); X.view.rotation.z = lp(X.view.rotation.z, 0, a); X.view.rotation.x = lp(X.view.rotation.x, rk * .5, a); }
    if (X.flashT > 0) X.flashT -= dt;

    // the rival
    for (const [f, A] of X.agents) if (!M.fs.includes(f)) { X.scene.remove(A); X.agents.delete(f); }
    for (const f of M.fs) if (f !== P) updateAgent(f, dt);
    // smokes, Rampart walls, the charge, a flare in flight
    while (X.smokes.length < M.smokes.length) addSmoke();
    X.smokes.forEach((g, i) => { const s = M.smokes[i]; g.visible = !!s; if (s) { const mt = s.heat ? X.smokeHM : s.grey ? X.smokeGM : X.smokeM; if (g.children[0].material !== mt) for (const c of g.children) c.material = mt; g.position.set(s.x, s.y + 1.4, s.z); g.scale.set(s.r, s.r * .85, s.r); g.rotation.y += dt * .12; } });
    const NS = M.nades || []; while (X.nadeObjs.length < NS.length) { const o = X.nadeMk(); X.scene.add(o); X.nadeObjs.push(o); }
    X.nadeObjs.forEach((o, i) => { const n = NS[i]; o.visible = !!n; if (n) { o.position.set(n.x, n.y, n.z); o.rotation.set(n.spin, n.spin * .6, 0); } });
    while (X.walls.length < M.walls.length) addWall();
    X.walls.forEach((m, i) => { const w = M.walls[i]; m.visible = !!w; if (w) { m.scale.set(w.x1 - w.x0, 3 * w.grow + .01, w.z1 - w.z0); m.position.set((w.x0 + w.x1) / 2, 1.5 * w.grow, (w.z0 + w.z1) / 2); } });
    X.charge.visible = !!M.planted && !(M.phase === 'end' && M.last && M.last.why === 'boom');
    if (M.planted) { const C = M.planted, lit = !M.defused && C.beep > Math.max(.06, cl(C.t / 12, .12, 1) - .08); X.charge.position.set(C.x, C.y, C.z); X.chargePL.position.set(C.x, C.y + .7, C.z); X.chargeLamp.material.color.set(M.defused ? YOU : lit ? WARN : '#401018'); X.chargePL.intensity = lit && X.charge.visible ? 2.4 : 0; }
    else X.chargePL.intensity = 0;
    kitFx(dt);
    const fl = M.flares[0]; X.flareBall.visible = !!fl; if (fl) X.flareBall.position.set(fl.x, fl.y, fl.z);
    // tracers, sparks, lights fading
    for (const t of X.tracers) { const u = t.userData; if (!u.live) continue; u.age += dt;
      const head = Math.min(u.L, u.s0 + 620 * u.age), tail = Math.max(u.s0, head - u.len);
      if (head - tail < .05 || u.age > .25) { u.live = false; t.visible = false; continue; }
      t.visible = true; t.position.set(u.a[0] + u.d[0] * head, u.a[1] + u.d[1] * head, u.a[2] + u.d[2] * head); t.scale.set(u.w, u.w, head - tail); u.mat.opacity = u.op * (head >= u.L ? .5 : 1); }
    for (const s of X.sparks) if (s.visible) { const u = s.userData; if ((u.t -= dt) <= 0) { s.visible = false; continue; } u.v[1] -= 9 * dt; s.position.x += u.v[0] * dt; s.position.y += u.v[1] * dt; s.position.z += u.v[2] * dt; }
    X.muzzle.intensity = Math.max(0, X.muzzle.intensity - dt * 60); X.flashL.intensity = Math.max(0, X.flashL.intensity - dt * 50);
    if (X.boomT > 0) { X.boomT -= dt; const k = 1 - X.boomT / .7; X.boom.scale.setScalar(1 + k * 15); X.boom.material.opacity = .8 * (1 - k); X.boom.visible = X.boomT > 0; }

    X.renderer.render(X.scene, cam);
    if (X.view.visible) {   // your gun, over the world, with its own depth
      X.vroot.position.copy(cam.position); X.vroot.quaternion.copy(cam.quaternion); updateCasings(dt); updateDrops(dt); X.vmuzzle.intensity = X.flashT > 0 ? 3 : 0;
      const ac = X.renderer.autoClear; X.renderer.autoClear = false; X.renderer.clearDepth(); X.renderer.render(X.vscene, cam); X.renderer.autoClear = ac;
    }
  }
  // a point in the world on the screen, in the HUD's 1280 by 720 units (null when it is behind you)
  function toScreen(x, y, z) {
    if (!X || !ready) return null; const p = new THREE.Vector3(x, y, z).project(X.camera); if (p.z > 1) return null;
    const V = K.view; return [lp(V.x0, V.x1, (p.x + 1) / 2), lp(V.y0, V.y1, (1 - p.y) / 2)];
  }
