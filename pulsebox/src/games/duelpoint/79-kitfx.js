  /* ---------- 79 kit effects: what the newer operatives' abilities look like ----------
     Everything here is unlit and made up front in small pools (buildKitFx), so nothing new has to compile in the middle of
     a round. Traps and mines are shown to their own team, and to rivals only once they are close. */
  function buildKitFx() {
    X.kf2mats = [];   // (every energy material, its clock moved each frame by kitFx2)
    const add = o => { X.scene.add(o); return o; }, glow = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }, o || {}));
    const flameT = canvasTex(64, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h * .78, 2, w / 2, h * .62, h * .6); gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(.25, 'rgba(255,190,80,.95)'); gr.addColorStop(.6, 'rgba(255,90,20,.55)'); gr.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2, 0); g.bezierCurveTo(w * 1.05, h * .5, w * .95, h, w / 2, h); g.bezierCurveTo(w * .05, h, -w * .05, h * .5, w / 2, 0); g.fill(); });
    const poolT = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,200,90,.95)'); gr.addColorStop(.55, 'rgba(255,100,20,.6)'); gr.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const ringT = canvasTex(128, 128, (g, w, h) => { g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 56, 0, TAU); g.stroke(); g.globalAlpha = .35; g.lineWidth = 16; g.beginPath(); g.arc(64, 64, 50, 0, TAU); g.stroke(); });
    const flameG = new THREE.PlaneGeometry(.9, 1.6); flameG.translate(0, .8, 0);
    const disc = (r, mat) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), mat); m.rotation.x = -Math.PI / 2; return m; };
    X.kf = { fires: [], darts: [], pulses: [], bombs: [], waves: [], shells: [], mines: [], snares: [], sentries: [], rings: [], booms: [], ringT };
    for (let i = 0; i < 3; i++) {   // fire pools: a glowing floor and licking flames
      const g = new THREE.Group(), pool = disc(1, glow('#ffffff', { map: poolT, opacity: .9 })); pool.position.y = .03; g.add(pool);
      const flames = []; for (let k = 0; k < 9; k++) { const f = new THREE.Mesh(flameG, glow('#ffffff', { map: flameT, opacity: .85 })); g.add(f); flames.push(f); }
      g.userData = { pool, flames }; g.visible = false; X.kf.fires.push(add(g));
    }
    const lit = c => new THREE.MeshLambertMaterial({ color: LC(c) });
    const dartM = lit('#2b3a2a'), tipM = glow('#9dff6b', { opacity: 1 });
    for (let i = 0; i < 2; i++) { const g = new THREE.Group(), b = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .34, 6), dartM); b.rotation.x = Math.PI / 2; g.add(b); const t = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), tipM); t.position.z = -.18; g.add(t); g.visible = false; X.kf.darts.push(add(g)); }
    for (let i = 0; i < 3; i++) { const m = add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), glow('#7bd65a', { opacity: .3, wireframe: true }))); m.visible = false; m.userData = { t: 9 }; X.kf.pulses.push(m); }
    for (let i = 0; i < 2; i++) { const m = add(new THREE.Mesh(new THREE.SphereGeometry(.1, 10, 8), glow('#ffb060', { opacity: 1 }))); m.visible = false; X.kf.bombs.push(m); }
    for (let i = 0; i < 2; i++) { const m = add(new THREE.Mesh(new THREE.SphereGeometry(.22, 14, 10), glow('#fff07a', { opacity: .95 }))); m.visible = false; X.kf.waves.push(m); }
    for (let i = 0; i < 3; i++) { const m = add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), glow('#ffe14d', { opacity: .45 }))); m.visible = false; m.userData = { t: 9 }; X.kf.shells.push(m); }
    const devM = lit('#2a2e36'), edgeM = lit('#59616e');
    for (let i = 0; i < 2; i++) {   // tripmines: a squat disc with a lamp
      const g = new THREE.Group(), b = new THREE.Mesh(new THREE.CylinderGeometry(.16, .19, .07, 12), devM); b.position.y = .035; g.add(b); const e = new THREE.Mesh(new THREE.TorusGeometry(.17, .012, 6, 16), edgeM); e.rotation.x = Math.PI / 2; e.position.y = .07; g.add(e);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), glow('#ff3b3b', { opacity: 1 })); lamp.position.y = .09; g.add(lamp); g.userData = { lamp }; g.visible = false; X.kf.mines.push(add(g));
    }
    for (let i = 0; i < 2; i++) {   // snares: two pegs and a tripwire glow ring
      const g = new THREE.Group(); for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.03, .04, .22, 6), devM); p.position.set(sx * .55, .11, 0); g.add(p); }
      const ring = disc(.9, glow('#ffffff', { map: ringT, color: '#7bd65a', opacity: .55 })); ring.position.y = .03; g.add(ring); g.userData = { ring }; g.visible = false; X.kf.snares.push(add(g));
    }
    // sentries: a braced tripod on a footplate, a column with a glowing collar, and a turret that turns on a yoke:
    // an armoured gun pod (it tilts between the yoke arms) with twin barrels, a sensor eye, side plates, an ammo box and fins
    const bodyM = lit('#2c333e'), plateM = lit('#8a95a6'), midM = lit('#4c5664'), stripeM = glow('#5aa0ff', { opacity: .9 });
    const Y = new THREE.Vector3(0, 1, 0), bx = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
    const cyl = (r0, r1, h, n, m, x, y, z) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, n), m); o.position.set(x, y, z); return o; };
    const strut = (a, b, r, m) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), m); o.position.copy(A).addScaledVector(d, .5); o.quaternion.setFromUnitVectors(Y, d.normalize()); return o; };
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      g.add(cyl(.2, .24, .05, 8, bodyM, 0, .025, 0)); g.add(cyl(.17, .2, .02, 8, midM, 0, .06, 0));   // footplate
      for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + Math.PI / 6, c = Math.cos(a), sn = Math.sin(a);   // folding legs: an upper strut, a brace and a foot pad
        g.add(strut([c * .08, .36, sn * .08], [c * .3, .03, sn * .3], .022, midM)); g.add(strut([c * .1, .14, sn * .1], [c * .22, .14, sn * .22], .012, bodyM));
        const ft = bx(.07, .03, .13, bodyM, c * .31, .015, sn * .31); ft.rotation.y = -a + Math.PI / 2; g.add(ft); }
      g.add(cyl(.065, .095, .42, 10, plateM, 0, .29, 0));   // column
      g.add(cyl(.13, .12, .07, 12, bodyM, 0, .52, 0)); const col = new THREE.Mesh(new THREE.TorusGeometry(.128, .011, 6, 24), stripeM); col.rotation.x = Math.PI / 2; col.position.y = .52; g.add(col);   // collar and its blue ring
      const head = new THREE.Group(); head.position.y = .56; g.add(head);   // (turns: the yoke and everything on it)
      head.add(cyl(.12, .13, .04, 12, midM, 0, .02, 0));
      for (const sx of [-1, 1]) { head.add(bx(.03, .22, .11, bodyM, sx * .148, .12, .02)); const tr = cyl(.042, .042, .045, 10, plateM, sx * .148, .22, 0); tr.rotation.z = Math.PI / 2; head.add(tr); }   // yoke arms and trunnions
      const ant = cyl(.005, .007, .2, 4, midM, .1, .14, .09); head.add(ant); const tip = new THREE.Mesh(new THREE.SphereGeometry(.014, 6, 4), stripeM); tip.position.set(.1, .245, .09); head.add(tip);   // a whip antenna
      const pod = new THREE.Group(); pod.position.y = .22; head.add(pod);   // (tilts: the gun pod)
      pod.add(bx(.2, .15, .3, bodyM, 0, 0, 0)); const cw = bx(.17, .045, .24, plateM, 0, .088, .01); cw.rotation.x = -.06; pod.add(cw);   // body and top cowl
      const wedge = bx(.2, .1, .08, midM, 0, -.035, -.16); wedge.rotation.x = .45; pod.add(wedge);   // a sloped chin
      const man = cyl(.075, .09, .07, 8, plateM, 0, .005, -.18); man.rotation.x = Math.PI / 2; pod.add(man);   // the mantlet the barrels come out of
      const bars = new THREE.Group(); pod.add(bars);
      for (const sx of [-1, 1]) { const br = cyl(.017, .019, .3, 8, midM, sx * .035, -.005, -.33); br.rotation.x = Math.PI / 2; bars.add(br); bars.add(bx(.048, .036, .05, bodyM, sx * .035, -.005, -.47));
        const sh = cyl(.026, .026, .1, 8, bodyM, sx * .035, -.005, -.25); sh.rotation.x = Math.PI / 2; bars.add(sh); }   // twin barrels, their heat shrouds and muzzle brakes
      for (const sx of [-1, 1]) { pod.add(bx(.018, .13, .25, plateM, sx * .108, 0, .005)); pod.add(bx(.005, .022, .2, stripeM, sx * .119, .025, .005)); }   // side plates, Axiom's blue down them
      const eh = cyl(.048, .052, .07, 10, bodyM, 0, .12, -.08); eh.rotation.x = Math.PI / 2; pod.add(eh);   // the sensor housing on top
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.04, .007, 6, 16), plateM); ring.position.set(0, .12, -.116); pod.add(ring);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), glow('#5aa0ff', { opacity: 1 })); eye.position.set(0, .12, -.112); eye.scale.z = .5; pod.add(eye);
      pod.add(bx(.14, .1, .07, midM, 0, -.01, .185)); for (let k = 0; k < 4; k++) pod.add(bx(.006, .05, .06, plateM, -.045 + k * .03, .09, .12));   // ammo box at the back, cooling fins on top
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(.24, .24), glow('#ffe0a0', { map: X.starT, opacity: 1 })); fl.position.set(0, -.005, -.52); pod.add(fl);
      g.userData = { head, pod, bars, eye, tip, fl }; g.visible = false; X.kf.sentries.push(add(g));
    }
    for (let i = 0; i < 6; i++) { const m = add(disc(1, glow('#ffffff', { map: ringT, opacity: .6 }))); m.visible = false; X.kf.rings.push(m); }   // status rings under fighters (Surge, a daze, a snare)
    for (let i = 0; i < 2; i++) { const m = add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), glow('#ffb060', { opacity: .8 }))); m.visible = false; m.userData = { t: 9 }; X.kf.booms.push(m); }
    X.smokeHM = new THREE.MeshLambertMaterial({ color: '#e2a46a', emissive: '#5a2a08', transparent: true, opacity: .9, depthWrite: false });   // Heat Haze
    // the ultimates and their orbs
    X.kf.orbs = []; for (let i = 0; i < 3; i++) { const g = add(new THREE.Group()), gem = new THREE.Mesh(new THREE.OctahedronGeometry(.32, 0), glow('#b8f0ff', { opacity: .95 })); gem.position.y = 1.1; g.add(gem);
      const halo = new THREE.Mesh(new THREE.OctahedronGeometry(.5, 0), glow('#5ad1ff', { opacity: .25, wireframe: true })); halo.position.y = 1.1; g.add(halo); const base = disc(.9, glow('#5ad1ff', { map: ringT, opacity: .5 })); base.position.y = .03; g.add(base); g.userData = { gem, halo }; g.visible = false; X.kf.orbs.push(g); }
    X.kf.beams = []; for (let i = 0; i < 3; i++) { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1, 8, 1, true), glow('#b6ff8a', { opacity: .9 }))); m.visible = false; X.kf.beams.push(m); }
    X.kf.domes = []; for (let i = 0; i < 2; i++) { const g = add(new THREE.Group()), dome = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, TAU, 0, Math.PI / 2), energyMat('#5aa0ff', { hex: 9, rim: 1.3, scan: .8, rx: 4, base: .05 }));   // (79-kitfx2: the energy look)
      g.add(dome);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(.22, .28, .5, 10), lit('#2a2e36')); core.position.y = .25; g.add(core); const eye = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), glow('#5aa0ff', { opacity: 1 })); eye.position.y = .58; g.add(eye); g.userData = { dome, eye }; g.visible = false; X.kf.domes.push(g); }
    X.kf.chans = []; for (let i = 0; i < 2; i++) { const g = add(new THREE.Group()); for (let k = 0; k < 3; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.7 + k * .25, .04, 6, 28), glow('#8f6bff', { opacity: .7 })); r.rotation.x = Math.PI / 2; g.add(r); }
      const col = new THREE.Mesh(new THREE.CylinderGeometry(.6, .9, 3.2, 20, 1, true), glow('#3a1a7a', { opacity: .35 })); col.position.y = 1.6; g.add(col); g.visible = false; X.kf.chans.push(g); }
  }
  // a tracer from a to b (a sentry's shot)
  function tracerAB(a, b, col) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (L < 1) return; const tr = X.tracers[X.trN++ % X.tracers.length], u = tr.userData;
    u.a = [a[0], a[1], a[2]]; u.d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L, (b[2] - a[2]) / L]; u.L = L; u.age = 0; u.s0 = .3; u.len = 2; u.w = .012; u.op = .5; u.mat.color.set(col); tr.position.set(a[0], a[1], a[2]); tr.lookAt(b[0], b[1], b[2]); tr.visible = false; u.live = true;
  }
  on('dartPulse', D => { if (!X || !ready) return; const m = X.kf.pulses.find(p => p.userData.t > .7) || X.kf.pulses[0]; m.userData.t = 0; m.position.set(D.x, D.y, D.z); });
  on('wavePop', w => { if (!X || !ready) return; const m = X.kf.shells.find(p => p.userData.t > .5) || X.kf.shells[0]; m.userData.t = 0; m.position.set(w.x, w.y, w.z); X.flashL.position.set(w.x, w.y, w.z); X.flashL.intensity = 10;
    for (let i = 0; i < 14; i++) spark([w.x, w.y, w.z], [rnd(-5, 5), rnd(-1, 5), rnd(-5, 5)], '#fff07a', .35); if (me() && Math.hypot(me().x - w.x, me().z - w.z) < 8) X.shake = Math.max(X.shake, .35); });
  on('mineBoom', m => { if (!X || !ready) return; const b = X.kf.booms.find(p => p.userData.t > .5) || X.kf.booms[0]; b.userData.t = 0; b.position.set(m.x, m.y + .3, m.z); X.flashL.position.set(m.x, m.y + 1, m.z); X.flashL.intensity = 16;
    for (let i = 0; i < 18; i++) spark([m.x, m.y + .2, m.z], [rnd(-6, 6), rnd(1, 7), rnd(-6, 6)], '#ffb060', .4); if (me() && Math.hypot(me().x - m.x, me().z - m.z) < 10) X.shake = Math.max(X.shake, .45); });
  on('sentryShot', (s, v) => { if (!X || !ready) return; const a = [s.x - Math.sin(s.aim) * .45, s.y + .78, s.z - Math.cos(s.aim) * .45]; tracerAB(a, [v.x + rnd(-.3, .3), v.y + 1.1 + rnd(-.3, .3), v.z + rnd(-.3, .3)], '#ffd28a'); s.muzzle = .05; });
  on('sentryDown', s => { if (!X || !ready) return; for (let i = 0; i < 16; i++) spark([s.x, s.y + .7, s.z], [rnd(-3, 3), rnd(0, 4), rnd(-3, 3)], '#9fb6ff', .5); });
  on('nightwalk', (f, a, b) => { if (!X || !ready) return; for (const p of [a, b]) for (let i = 0; i < 18; i++) spark([p[0], hAt(p[0], p[1]) + rnd(.2, 2.4), p[1]], [rnd(-3, 3), rnd(-1, 3), rnd(-3, 3)], i % 2 ? '#8f6bff' : '#1c0c3a', .6); });
  on('lockPop', L => { if (!X || !ready) return; const m = X.kf.shells.find(p => p.userData.t > .5) || X.kf.shells[0]; m.userData.t = 0; m.position.set(L.x, L.y + 1, L.z); m.material.color.set('#5aa0ff'); for (let i = 0; i < 24; i++) spark([L.x, L.y + .6, L.z], [rnd(-8, 8), rnd(0, 4), rnd(-8, 8)], '#9fc4ff', .7); });
  on('orb', o => { if (!X || !ready) return; for (let i = 0; i < 16; i++) spark([o.x, hAt(o.x, o.z) + 1.1, o.z], [rnd(-2, 2), rnd(1, 4), rnd(-2, 2)], '#b8f0ff', .6); });
  on('snared', (sn, v) => { if (!X || !ready) return; for (let i = 0; i < 10; i++) spark([sn.x, sn.y + .2, sn.z], [rnd(-2, 2), rnd(1, 3), rnd(-2, 2)], '#9dff6b', .4); });
  function kitFx(dt) {
    const K2 = M.kit, P = me(), kf = X.kf; if (!kf) return;
    const mine = o => o.by && o.by.team === P.team, near = (o, r) => Math.hypot(o.x - P.x, o.z - P.z) < r;
    const list = (pool, items, fn) => { pool.forEach((m, i) => { const it = items && items[i]; m.visible = !!it; if (it) fn(m, it, i); }); };
    list(kf.fires, K2 && K2.fires, (g, F) => { const U = g.userData, k = Math.min(1, (F.T - F.t) / .25) * Math.min(1, F.t / .6); g.position.set(F.x, F.y, F.z); U.pool.scale.setScalar(F.r * (1 + Math.sin(X.t * 9 + F.x) * .03) * k); U.pool.material.opacity = .85 * k;
      U.flames.forEach((f, i) => { const a = i / U.flames.length * TAU + i * .7, r = (i % 3) / 3 * F.r * .75 + .3; f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); f.scale.set(k * (1 + Math.sin(X.t * 11 + i) * .15), k * (1 + Math.sin(X.t * 13 + i * 2) * .3), 1); f.quaternion.copy(X.camera.quaternion); f.material.opacity = .8 * k; });
      if (Math.random() < dt * 14) spark([F.x + rnd(-F.r, F.r) * .7, F.y + .2, F.z + rnd(-F.r, F.r) * .7], [rnd(-.5, .5), rnd(2, 4), rnd(-.5, .5)], '#ffb060', .5); });
    list(kf.darts, K2 && K2.darts, (g, D) => { g.position.set(D.x, D.y, D.z); if (D.stuck < 0) g.lookAt(D.x - D.vx, D.y - D.vy, D.z - D.vz); g.children[1].material.opacity = D.stuck < 0 ? 1 : .55 + Math.sin(X.t * 14) * .45; });
    for (const m of kf.pulses) { const u = m.userData; u.t += dt; m.visible = u.t < .7; if (m.visible) { m.scale.setScalar(.5 + u.t / .7 * 16); m.material.opacity = .35 * (1 - u.t / .7); } }
    list(kf.bombs, K2 && K2.bombs, (m, B) => { m.position.set(B.x, B.y, B.z); if (Math.random() < .6) spark([B.x, B.y, B.z], [rnd(-.4, .4), rnd(-.2, .6), rnd(-.4, .4)], '#ff7a2f', .3); });
    list(kf.waves, K2 && K2.waves, (m, w) => { m.position.set(w.x, w.y, w.z); m.scale.setScalar(1 + Math.sin(X.t * 40) * .25 + (.45 - w.t) * 2); });
    for (const m of kf.shells) { const u = m.userData; u.t += dt; m.visible = u.t < .4; if (m.visible) { m.scale.setScalar(.3 + u.t / .4 * 4.5); m.material.opacity = .5 * (1 - u.t / .4); } }
    for (const m of kf.booms) { const u = m.userData; u.t += dt; m.visible = u.t < .45; if (m.visible) { m.scale.setScalar(.4 + u.t / .45 * 3.4); m.material.opacity = .8 * (1 - u.t / .45); } }
    list(kf.mines, K2 && K2.mines && K2.mines.filter(m => mine(m) || near(m, 5)), (g, m) => { g.position.set(m.x, m.y, m.z); const rate = m.fuse >= 0 ? 30 : m.arm > 0 ? 3 : 6; g.userData.lamp.visible = Math.sin(X.t * rate) > 0 || m.fuse >= 0; g.userData.lamp.material.color.set(m.arm > 0 ? '#ffb347' : '#ff3b3b'); });
    list(kf.snares, K2 && K2.snares && K2.snares.filter(s => mine(s) || s.sprung || near(s, SNARE.see)), (g, s) => { g.position.set(s.x, s.y, s.z); g.userData.ring.material.opacity = (s.sprung ? .8 : mine(s) ? .55 : .26) * (s.arm > 0 ? .4 : 1) * (.75 + Math.sin(X.t * (s.sprung ? 14 : 4)) * .25); });
    list(kf.sentries, K2 && K2.sentries, (g, s, i) => { const U = g.userData; g.position.set(s.x, s.y, s.z); U.head.rotation.y = s.aim; U.pod.rotation.x = s.pitch || 0; const ec = s.flash > 0 ? '#ffffff' : s.target ? (s.lockT > 0 ? '#ffb347' : '#ff5a4d') : '#5aa0ff'; U.tip.visible = !!s.target || Math.sin(X.t * 4 + i) > -.3; U.eye.material.color.set(ec); U.eye.scale.setScalar(s.target ? 1.25 : 1); U.eye.scale.z = .5;   // (blue sweeping, amber locking on, red firing)
      s.muzzle = Math.max(0, (s.muzzle || 0) - dt); U.fl.visible = s.muzzle > 0; U.fl.rotation.z = Math.random() * 6; U.bars.position.z = s.muzzle * 1.2; });   // (the barrels kick back on a shot)
    // the ultimates: orbs waiting to be taken, Piercer's bolts, Lockdown's dome, Nightwalk gathering and where it comes out
    list(kf.orbs, M.orbs && M.orbs.filter(o => !o.taken), (g, o, i) => { g.position.set(o.x, hAt(o.x, o.z), o.z); g.userData.gem.rotation.y = X.t * 2 + i; g.userData.gem.position.y = 1.1 + Math.sin(X.t * 2.4 + i) * .12; g.userData.halo.rotation.y = -X.t; g.userData.halo.position.y = g.userData.gem.position.y; });
    list(kf.beams, K2 && K2.bolts, (m, B) => { const dx = B.b[0] - B.a[0], dy = B.b[1] - B.a[1], dz = B.b[2] - B.a[2], L = Math.hypot(dx, dy, dz); m.position.set(B.a[0] + dx / 2, B.a[1] + dy / 2, B.a[2] + dz / 2); m.scale.set(1 + (.5 - B.t) * 3, L, 1 + (.5 - B.t) * 3); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L)); m.material.opacity = B.t / .5; });
    list(kf.domes, K2 && K2.locks, (g, L) => { const k = 1 - L.t / L.T; g.position.set(L.x, L.y, L.z); g.userData.dome.scale.setScalar(.5 + k * L.R); g.userData.dome.material.uniforms.op.value = .3 + k * .7; g.userData.dome.material.uniforms.pulse.value = k > .9 ? (k - .9) * 6 : 0; g.userData.eye.material.color.set(Math.sin(X.t * (8 + k * 30)) > 0 ? '#ffffff' : '#5aa0ff'); });
    list(kf.chans, M.fs.filter(f => f.chan && f.alive && (f.team === P.team || f === P)).flatMap(f => [[f.chan.fx, f.chan.fz, f.chan], [f.chan.x, f.chan.z, f.chan]]), (g, [x, z, c], i) => { const k = 1 - c.t / c.T; g.position.set(x, hAt(x, z), z); g.rotation.y = X.t * 3 * (i % 2 ? -1 : 1); g.scale.setScalar(i % 2 ? .4 + k * .6 : 1.2 - k * .5); });
    // status rings: Surge (yellow) under a rival, a daze (gold, over the head), a snare (green); Bulwark (amber), Overdrive (white), held by a Lockdown (blue)
    const st = []; for (const f of M.fs) { if (!f.alive || f === P) continue; if (f.surge > 0) st.push([f, '#ffe14d', .05, .55]); if (f.daze > 0) st.push([f, '#ffd23f', eyeY(f) + .35, .3]); if (f.snare > 0) st.push([f, '#7bd65a', .05, .75]);
      if (f.guard > 0) st.push([f, '#ffb347', 1.1, .7]); if (f.od > 0) st.push([f, '#ffffff', .1, .9]); if (f.lock > 0) st.push([f, '#5aa0ff', eyeY(f) + .3, .45]); }
    list(kf.rings, st, (m, [f, c, y, r]) => { m.position.set(ipos(f, 'x'), ipos(f, 'y') + y, ipos(f, 'z')); m.scale.setScalar(r * (1 + Math.sin(X.t * 8) * .08)); m.material.color.set(c); m.rotation.z = X.t * 2; });
  }
  function hideKitFx() { hideKitFx2(); if (!X.kf) return; for (const k of ['fires', 'darts', 'pulses', 'bombs', 'waves', 'shells', 'mines', 'snares', 'sentries', 'rings', 'booms', 'orbs', 'beams', 'domes', 'chans']) for (const m of X.kf[k]) m.visible = false; }
