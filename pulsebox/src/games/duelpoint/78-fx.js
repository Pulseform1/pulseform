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
    if (!X.lootDummy && X.lootRing) { X.lootDummy = new THREE.Mesh(X.lootRing.g, X.lootRing.m); X.lootDummy.visible = false; X.scene.add(X.lootDummy); }   // the floor gun's ring, and the charge in your hands, ready before they first appear
    if (!X.vcharge && X.chargeCopy) { X.vcharge = X.chargeCopy(); X.vcharge.scale.setScalar(.42); X.vcharge.visible = false; X.vroot.add(X.vcharge); }
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
    // the same device, carried (on the carrier's back) or lying on the floor: copies that share its shapes, with a lamp of their own
    X.chargeLampM = new THREE.MeshBasicMaterial({ color: WARN }); X.chargeCopy = () => { const c = ch.clone(); c.traverse(o => { if (o.material === X.chargeLamp.material) o.material = X.chargeLampM; }); c.visible = true; return c; };
    X.chargeFloor = X.chargeCopy(); X.chargeFloor.visible = false; add(X.chargeFloor);
    X.lootRing = { g: new THREE.RingGeometry(.32, .4, 24), m: new THREE.MeshBasicMaterial({ color: '#efe9dc', transparent: true, opacity: .45, depthWrite: false, side: THREE.DoubleSide }) };
    X.lootObjs = new Map(); X.lootProto = new Map();
    X.flareBall = add(new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }))); X.flareBall.visible = false;
    X.boom = add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), fm({ color: '#ffb060', opacity: .8 }))); X.boom.visible = false; X.boomT = 0;
    X.ejects = []; X.casings = [];
    buildKitFx(); buildKillFx();
  }
  function spark(p, v, col, t) { const m = X.sparks[X.spN++ % X.sparks.length]; m.visible = true; m.position.set(p[0], p[1], p[2]); m.material.color.set(col); m.userData.t = t; m.userData.v = v; }
  // where a fighter's muzzle is, near enough for a tracer to start from
  function muzzleOf(f) {
    const d = viewDir(f.yaw, f.pitch), rx = Math.cos(f.yaw), rz = -Math.sin(f.yaw), mine = M && f === viewer(), side = mine && f.scoped ? 0 : mine ? .14 : .1, drop = mine ? (f.scoped ? .06 : .12) : .28, out = mine ? .75 : .7;
    _v[0] = f.x + d[0] * out + rx * side; _v[1] = eyeY(f) - drop + d[1] * out; _v[2] = f.z + d[2] * out + rz * side; return _v;
  }
  on('shot', (f, S, first) => {
    if (!X || !ready) return; const mine = f === viewer(), mz = muzzleOf(f), G = gun(f);
    // your own streaks start a few metres out and are faint; your rival's are a little clearer so you can tell where fire comes from. Shotguns show a few pellets, not all
    const L = Math.hypot(S.end[0] - mz[0], S.end[1] - mz[1], S.end[2] - mz[2]), s0 = mine ? 3.5 : .6;
    if (L > s0 + 1 && !(G.pel > 1 && Math.random() > .3)) { const tr = X.tracers[X.trN++ % X.tracers.length], u = tr.userData;
      u.a = [mz[0], mz[1], mz[2]]; u.d = [(S.end[0] - mz[0]) / L, (S.end[1] - mz[1]) / L, (S.end[2] - mz[2]) / L]; u.L = L; u.age = 0; u.s0 = s0; u.len = mine ? 1.4 : 2.2; u.w = mine ? .005 : .008; u.op = mine ? (G.sil ? .08 : .14) : (G.sil ? .16 : .3); const skf = (skinOfId(skinFor(f, G.k)) || {}).L, tc = skf && skf.fx && skf.fx.tracer; u.mat.color.set(G.rail ? '#38e8ff' : tc || '#ffffff'); if (tc) { u.op = Math.min(.6, u.op * 2.2); u.w *= 1.3; } if (G.rail) { u.op = .9; u.len = 6; u.w = .02; }
      tr.position.set(mz[0], mz[1], mz[2]); tr.lookAt(S.end[0], S.end[1], S.end[2]); tr.visible = false; tr.userData.live = true; }
    if (first && mine) { const kv = (G.kickV || VKICK[G.cat] || 1) * (f.scoped ? .55 : 1); X.recV = (X.recV || 0) + 2.6 * kv; X.recYV = (X.recYV || 0) + (Math.random() - .5) * 1.6 * kv; }
    if (first) { const skm = (skinOfId(skinFor(f, G.k)) || {}).L, mc = skm && skm.fx && skm.fx.muzzle; X.muzzle.color.set(mc || '#ffcf8a'); if (mine) for (const o of X.mflash.children) { const mt = o.material || (o.children[0] && o.children[0].material); if (mt) mt.color.set(mc || '#ffffff'); }
      X.muzzle.position.set(mz[0], mz[1], mz[2]); X.muzzle.intensity = G.sil ? 1.2 : 4; if (mine) { X.flashT = G.sil ? .025 : .05; X.ejects.push({ k: G.k, t: G.k === 'breaker' ? .3 : G.k === 'longbow' || G.k === 'kite' ? .6 : .01 }); } }
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
  // a skin with a kill effect plays it on the rival it finishes
  on('kill', (v, by, head, wk) => { if (!X || !ready || !by || v === by) return; const sk = skinOfId(skinFor(by, wk)); if (sk) killFx(v, sk.line); });
  on('land', f => { if (X && M && f === me()) X.dip = .09; });
  on('ability', f => { f.castT = .5; });
  on('dry', f => { if (X && M && f === me()) X.dryT = .16; });
  const VKICK = { Sidearm: 1.25, SMG: .7, Rifle: 1, Sniper: 2.2, Shotgun: 1.9, Heavy: .8 };   // how hard each class kicks in your hands

  /* Spectating: a couple of seconds after you die in a team game you watch through a living teammate's eyes, with their
     gun and their HUD; a click moves to the next one. viewer() is who the camera and HUD follow. */
  const viewer = () => { if (!M) return null; const P = me(); return !P.alive && UI.spec && UI.spec.alive && UI.spec.team === P.team && M.mode !== 'range' ? UI.spec : P; };
  function nextSpec() { const P = me(), mates = M.fs.filter(f => f !== P && f.team === P.team && f.alive && !f.gone); if (!mates.length) { UI.spec = null; return; } const i = mates.indexOf(UI.spec); UI.spec = mates[(i + 1) % mates.length]; X.viewKey = ''; }
  // after the death cam (killer watched for a moment) the view fades through black into a teammate's eyes
  function updateSpec() { const P = me(); if (!M || P.alive || M.mode === 'range' || M.mode === 'demo') { UI.spec = null; return; }
    if (M.deathInfo && M.deathInfo.t > 2.8 && !(UI.spec && UI.spec.alive)) { const had = UI.spec; nextSpec(); if (UI.spec && UI.spec !== had) X.specFade = 1; } }
  /* ---- reload and inspect, choreographed: keyframes [q, dx, dy, dz, rx, ry, rz] over the action (0..1), eased between,
     added on top of where the gun is held. One track per kind of weapon. */
  const VKF = {
    reload: {
      rifle: [[0, 0, 0, 0, 0, 0, 0], [.1, -.06, .085, -.02, .1, .32, -.58], [.2, -.065, .07, -.01, .06, .34, -.66], [.3, -.07, .1, -.03, .14, .3, -.72], [.6, -.07, .1, -.03, .12, .3, -.7], [.74, -.06, .12, -.02, .1, .28, -.62], [.79, -.055, .15, -.04, .2, .28, -.6], [.86, -.03, .07, 0, .05, .05, .32], [.93, -.02, .05, .02, .02, -.06, .38], [1, 0, 0, 0, 0, 0, 0]],
      sidearm: [[0, 0, 0, 0, 0, 0, 0], [.12, -.04, .07, -.01, .05, .36, -.52], [.24, -.045, .085, 0, .2, .36, -.56], [.6, -.045, .07, -.01, .05, .34, -.5], [.74, -.04, .09, -.02, .1, .3, -.45], [.79, -.035, .11, -.03, .2, .3, -.42], [.88, -.01, .05, .03, -.25, .05, .1], [1, 0, 0, 0, 0, 0, 0]],
      shotgun: [[0, 0, 0, 0, 0, 0, 0], [.1, -.05, .07, -.02, .05, .3, -1.15], [.85, -.05, .075, -.02, .05, .3, -1.15], [.92, -.01, .03, .05, .05, .05, -.1], [1, 0, 0, 0, 0, 0, 0]],
      sniper: [[0, 0, 0, 0, 0, 0, 0], [.12, -.07, .09, -.02, .12, .22, .48], [.5, -.07, .095, -.02, .12, .22, .5], [.78, -.06, .12, -.03, .2, .2, .45], [.86, -.03, .06, 0, .05, .05, .62], [.95, -.01, .03, .01, .02, 0, .2], [1, 0, 0, 0, 0, 0, 0]],
    },
    inspect: {
      rifle: [[0, 0, 0, 0, 0, 0, 0], [.14, -.04, .045, -.09, .05, .95, .28], [.3, -.04, .05, -.1, -.02, 1.08, .4], [.44, -.03, .06, -.1, -.1, .3, -1.25], [.6, -.03, .06, -.1, -.16, .05, -1.42], [.72, -.01, .075, -.07, .55, .12, -.05], [.86, 0, .055, -.05, .45, .02, .05], [1, 0, 0, 0, 0, 0, 0]],
      sidearm: [[0, 0, 0, 0, 0, 0, 0], [.14, -.05, .05, -.08, .05, .9, .3], [.3, -.05, .055, -.09, 0, 1.05, .35], [.48, -.06, .07, -.08, .12, -.5, -.5], [.64, -.06, .07, -.08, -.02, -.7, -.62], [.78, -.02, .08, -.06, .5, .05, -.2], [.9, 0, .04, -.03, .3, 0, 0], [1, 0, 0, 0, 0, 0, 0]],
      sniper: [[0, 0, 0, 0, 0, 0, 0], [.16, -.05, .05, -.08, .04, .85, .25], [.36, -.05, .06, -.1, -.05, 1, .35], [.56, -.04, .07, -.1, .5, .3, .1], [.72, -.03, .065, -.08, .55, -.1, -.2], [.88, -.01, .04, -.04, .3, 0, 0], [1, 0, 0, 0, 0, 0, 0]],
      shotgun: [[0, 0, 0, 0, 0, 0, 0], [.16, -.04, .05, -.09, .05, .9, .3], [.34, -.04, .055, -.1, -.05, 1.05, .45], [.52, -.03, .06, -.09, -.1, .3, -1.2], [.68, -.02, .065, -.08, .45, .1, -.1], [.86, 0, .04, -.04, .3, 0, 0], [1, 0, 0, 0, 0, 0, 0]],
      melee: [[0, 0, 0, 0, 0, 0, 0], [.12, -.02, .03, -.04, .2, .6, .4], [.3, -.02, .03, -.04, .2, .6, .4 - TAU * 2], [.42, -.02, .18, -.06, .1, .4, -TAU * 2.5], [.54, -.02, .03, -.04, .25, .7, -TAU * 3], [.74, 0, .05, -.05, .6, .1, -TAU * 3], [.9, 0, .02, -.02, .2, 0, -TAU * 3], [1, 0, 0, 0, 0, 0, -TAU * 3]],
    },
  };
  const INSP_D = 3.4;
  const vkfKind = (G, kind) => G.melee ? (kind === 'inspect' ? 'melee' : 'rifle') : G.cat === 'Sidearm' ? 'sidearm' : G.cat === 'Shotgun' ? 'shotgun' : G.cat === 'Sniper' ? 'sniper' : 'rifle';
  function vkf(kind, G, q) {
    const K = VKF[kind][vkfKind(G, kind)] || VKF[kind].rifle; if (q <= 0) return K[0].slice(1);
    for (let i = 1; i < K.length; i++) if (q <= K[i][0]) { const a = K[i - 1], b = K[i], u = (q - a[0]) / (b[0] - a[0]), e = u * u * (3 - 2 * u); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * e); }
    return K[K.length - 1].slice(1);
  }
  function renderFrame(dt) {
    if (!X || !ready) return; const cam = X.camera; X.t += dt; X.frameN = (X.frameN || 0) + 1; iconsAhead(dt); tunePixels(dt); skinTick(dt); if (X.seaT) { X.seaT.offset.x = X.t * .003; X.seaT.offset.y = X.t * .0016; } mechFrame(dt);
    const live = M && (screen === 'play' || (screen === 'over' && posed)) && !loadingNow();
    if (!live) {   // behind the menus: a slow flight round the site
      if (screen === 'menu' && (UI.panel === 'store' || UI.panel === 'locker') && renderGunShow(dt)) return;
      if (screen === 'select' && UI.sel) { for (const g of X.smokes) g.visible = false; for (const o of X.nadeObjs) o.visible = false; for (const w of X.walls) w.visible = false; return renderSelect(dt); }
      const a = X.t * .06 + 2.4, k = MW / 64; cam.position.set(MW / 2 + 9 * k + Math.cos(a) * 30 * k, 19 * k, MH / 2 - 1 + Math.sin(a) * 26 * k); cam.rotation.set(0, 0, 0); cam.lookAt(MW / 2 + 6 * k, 0, MH / 2 - 1); cam.fov = 55; cam.updateProjectionMatrix();
      for (const A of X.agents.values()) A.visible = false; X.charge.visible = false; for (const g of X.smokes) g.visible = false; for (const o of X.nadeObjs) o.visible = false; for (const w of X.walls) w.visible = false; hideKitFx(); hideLoot();
      X.renderer.render(X.scene, cam); return;
    }
    updateSpec(); const P = viewer(), G = gun(P); if (X.hemiBase != null) X.hemi.intensity = X.hemiBase;
    // the camera: your eyes (gliding over steps and crouches), kicked by recoil; when you die it sinks and turns to who did it
    const ey = ipos(P, 'y') + lp(EYE, CEYE, P.crouch); X.camY = Math.abs(ey - X.camY) > 1.2 ? ey : X.camY + (ey - X.camY) * Math.min(1, dt * 22);
    X.dip = Math.max(0, (X.dip || 0) - dt * .5); X.shake = Math.max(0, X.shake - dt);
    X.roll = lp(X.roll || 0, P.slide ? .075 : 0, Math.min(1, dt * 9));   // a slide tips the view a little
    // the spray: the crosshair climbs and sways with the pattern, so it always shows where the next bullet goes and you pull
    // down against it; the camera only nods a little with it (most of the climb is on screen, not in the view), and both
    // glide back as the spray settles
    { const pt = P.alive && !G.melee ? patOf(P, G) : [0, 0], fol = P.scoped && G.scope ? .25 : .14, k = Math.min(1, dt * 18);
      X.vpY = lp(X.vpY || 0, pt[0] * fol, k); X.vpP = lp(X.vpP || 0, pt[1] * fol, k);
      const k2 = Math.min(1, dt * 26); X.xhY = lp(X.xhY || 0, pt[0] - X.vpY, k2); X.xhP = lp(X.xhP || 0, pt[1] - X.vpP, k2); }
    let yaw = P.yaw + X.vpY, pitch = P.pitch + M.camKick + X.vpP, y = X.camY - X.dip - .38 * sm(X.kneel || 0);
    if (P.daze > 0) { const k = Math.min(1, P.daze / .8); yaw += Math.sin(X.t * 6.3) * .014 * k; pitch += Math.cos(X.t * 4.7) * .011 * k; }   // a Shockwave's daze rocks the view
    let deathCam = null;
    if (!P.alive && M.deathInfo) {   // the death cam: you drop, turn to whoever did it, then rise behind your body to watch them
      const D = M.deathInfo, k = Math.min(1, D.t * 2); y = lp(y, P.y + .5, k); yaw += angDiff(D.yaw, yaw) * k; pitch = lp(pitch, .1, k);
      const kf = M.byKey[D.key], tx2 = kf && kf.alive ? [ipos(kf, 'x'), ipos(kf, 'y') + 1.2, ipos(kf, 'z')] : [D.kat[0], D.kat[1] + 1.2, D.kat[2]];
      if (M.planted && D.t > 3.2 && !M.fs.some(f => f !== P && f.team === P.team && f.alive)) {   // nobody left to watch: circle the charge
        const a = X.t * .25, r = 7; deathCam = { p: [M.planted.x + Math.cos(a) * r, M.planted.y + 3.4, M.planted.z + Math.sin(a) * r], at: [M.planted.x, M.planted.y + .3, M.planted.z] };
      } else if (D.t > .55) { const u = smooth(cl((D.t - .55) / .9, 0, 1)), dx = tx2[0] - D.at[0], dz = tx2[2] - D.at[2], L = Math.hypot(dx, dz) || 1;
        deathCam = { p: [lp(ipos(P, 'x'), D.at[0] - dx / L * 2.6, u), lp(y, D.at[1] + 2.5, u), lp(ipos(P, 'z'), D.at[2] - dz / L * 2.6, u)], at: tx2, u }; }
    }
    if (deathCam) { cam.position.set(deathCam.p[0], deathCam.p[1], deathCam.p[2]); cam.lookAt(deathCam.at[0], deathCam.at[1], deathCam.at[2]); X.deathCam = deathCam; }
    else { cam.position.set(ipos(P, 'x') + (Math.random() - .5) * X.shake * .3, y + (Math.random() - .5) * X.shake * .3, ipos(P, 'z')); cam.rotation.set(pitch, yaw, X.roll); X.deathCam = null; }
    X.fovK = lp(X.fovK || 0, P.slide ? 1 : P.sprinting ? .6 : 0, Math.min(1, dt * 7));   // speed widens the view a touch
    const fov = 2 * Math.atan(Math.tan(baseFov() * (1 + X.fovK * .09) * D2R / 2) / zoomOf(P)) / D2R; cam.fov += (fov - cam.fov) * Math.min(1, dt * 18); cam.updateProjectionMatrix();

    // your gun
    const vsk = skinFor(P, G.k) || '';
    if (X.viewKey !== G.k + P.op + vsk) { if (X.viewGun) X.view.remove(X.viewGun); X.viewGun = viewGun(G.k, P.op, vsk); if (G.melee) X.viewGun.scale.setScalar(1.35); X.view.add(X.viewGun); X.viewKey = G.k + P.op + vsk; X.viewGun.add(X.mflash); X.drawD = Math.max(.35, (G.equip || .75) * .7); X.drawT = X.drawD; X.recP = X.recV = 0; }
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
    const RK = rt < 0 ? [0, 0, 0, 0, 0, 0] : vkf('reload', G, rt);   // the reload's own moves (and the seat jolt on top)
    if (G.k === 'breaker' && rt > .1 && rt < .85) { const ph = (rt * 5) % 1; RK[1] += Math.sin(ph * Math.PI) * .012; RK[3] += Math.sin(ph * Math.PI) * .06; }   // each shell pushed in
    X.view.position.set(VO[0] + bobX + swayX + X.lag * .5 + RK[0] - X.runK * .03 + sideK * .02, VO[1] + Math.abs(bob) * .6 + sway + RK[1] + seat * .012 - rk * .22 - raise * raise * .3 - X.dip * .5 - X.runK * .035 + X.air + climb * .028, VO[2] + RK[2] + rk * .9 + raise * .05 + X.runK * .02 + climb * .02);
    X.view.rotation.set(rk * 1.6 + RK[3] + seat * .05 - raise * .7 - X.runK * .14 - dry * .035 + climb * .2, .02 + RK[4] + X.lag + X.runK * .38 - sideK * .35, RK[5] + raise * .35 + X.lag * .6 + X.runK * .26 - sideK * .3);
    { const bo = X.viewGun.userData.bore; X.mflash.position.set(0, bo ? bo.y : .025, -(X.viewGun.userData.len || .5) - .03); } X.mflash.visible = X.flashT > 0 && !G.melee; X.mflash.rotation.z = Math.random() * 3; X.mflash.scale.setScalar(G.cat === 'Sniper' || G.cat === 'Shotgun' ? 1.5 : G.cat === 'Sidearm' ? .8 : 1);
    viewAnim(P, G, dt, { draw: chamber, insp: X.inspT > 0 ? 1 - X.inspT / INSP_D : -1 });
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
    if (X.inspT > 0) { const k = vkf('inspect', G, 1 - X.inspT / INSP_D); X.view.position.x += k[0]; X.view.position.y += k[1]; X.view.position.z += k[2]; X.view.rotation.x += k[3]; X.view.rotation.y += k[4]; X.view.rotation.z += k[5]; }
    X.adsK = lp(X.adsK || 0, P.scoped && !G.scope && P.alive ? 1 : 0, Math.min(1, dt * 16));
    if (X.adsK > .001) { const a = X.adsK, sy = X.viewGun.userData.sight || .09; X.view.position.x = lp(X.view.position.x, 0, a); X.view.position.y = lp(X.view.position.y, -sy - rk * .05, a); X.view.position.z = lp(X.view.position.z, VO[2] - .03 + rk * .5, a); X.view.rotation.y = lp(X.view.rotation.y, 0, a); X.view.rotation.z = lp(X.view.rotation.z, 0, a); X.view.rotation.x = lp(X.view.rotation.x, rk * .5, a); }
    if (X.flashT > 0) X.flashT -= dt;
    // planting or defusing: you kneel, the gun goes down out of sight; planting, the charge is in your hands, set down as it arms
    X.kneel = lp(X.kneel || 0, P.alive && (P.plant > 0 || P.defuse > 0) ? 1 : 0, Math.min(1, dt * 10));
    if (X.kneel > .001) { const k = sm(X.kneel); X.view.position.y -= .32 * k; X.view.rotation.x -= .95 * k; X.view.position.z += .1 * k; }
    if (!X.vcharge) { X.vcharge = X.chargeCopy(); X.vcharge.scale.setScalar(.42); X.vroot.add(X.vcharge); }
    { const q = P.alive && P.plant > 0 ? cl(P.plant / PLANT_T, 0, 1) : -1; X.vcharge.visible = q >= 0 && X.kneel > .3;
      if (q >= 0) { const s2 = sm(cl(q / .35, 0, 1)), d2 = sm(cl((q - .35) / .55, 0, 1)); X.vcharge.position.set(.03 + Math.sin(X.t * 9) * .003 * (1 - d2), lp(-.5, -.26, s2) - d2 * .3, -.66 - d2 * .12); X.vcharge.rotation.set(lp(.9, .45, s2) + d2 * .25, .35 - d2 * .3, 0); } }
    if (P.castT > 0) { P.castT -= dt; const q = 1 - Math.max(0, P.castT) / .5, c = Math.sin(Math.min(1, q) * Math.PI); X.view.position.y -= c * .07; X.view.position.x += c * .03; X.view.rotation.x -= c * .45; X.view.rotation.z += c * .35; }   // the off hand casts: the gun dips out of the way

    // the rival
    for (const [f, A] of X.agents) if (!M.fs.includes(f)) { X.scene.remove(A); X.agents.delete(f); }
    { const AP = X.agents.get(P); if (AP) AP.visible = false; } for (const f of M.fs) if (f !== P || X.deathCam) updateAgent(f, dt);   // on the death cam you see your own body fall
    // a fighter wholly behind walls is not drawn at all (nor its outline): a few lines from the camera to its head, chest, both
    // hips, feet and gun; if every one is blocked, nothing of it could show. (Not while the camera is inside a wall.)
    { const c = cam.position; if (hAt(c.x, c.z) < c.y - .05) for (const f of M.fs) { const A = X.agents.get(f); if (!A || !A.visible || (f === P && !X.deathCam)) continue;
        const x = ipos(f, 'x'), y = ipos(f, 'y'), z = ipos(f, 'z'), s = Math.sin(f.yaw), co = Math.cos(f.yaw), pts = [[x, y + 1.6, z], [x, y + 1.1, z], [x + co * .38, y + 1, z - s * .38], [x - co * .38, y + 1, z + s * .38], [x, y + .25, z], [x - s * .75, y + 1.25, z - co * .75]];
        let seen = false; for (const q of pts) { const d = Math.hypot(q[0] - c.x, q[1] - c.y, q[2] - c.z); if (d < 2.5 || los(c.x, c.y, c.z, q[0], q[1], q[2], false) >= d - .35) { seen = true; break; } }
        A.visible = seen; } }
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
    kitFx(dt); stepKillFx(dt); animKit(X.viewGun, dt); lootFx(dt);
    const fl = M.flares[0]; X.flareBall.visible = !!fl; if (fl) X.flareBall.position.set(fl.x, fl.y, fl.z);
    // tracers, sparks, lights fading
    for (const t of X.tracers) { const u = t.userData; if (!u.live) continue; u.age += dt;
      const head = Math.min(u.L, u.s0 + 620 * u.age), tail = Math.max(u.s0, head - u.len);
      if (head - tail < .05 || u.age > .25) { u.live = false; t.visible = false; continue; }
      t.visible = true; t.position.set(u.a[0] + u.d[0] * head, u.a[1] + u.d[1] * head, u.a[2] + u.d[2] * head); t.scale.set(u.w, u.w, head - tail); u.mat.opacity = u.op * (head >= u.L ? .5 : 1); }
    for (const s of X.sparks) if (s.visible) { const u = s.userData; if ((u.t -= dt) <= 0) { s.visible = false; continue; } u.v[1] -= 9 * dt; s.position.x += u.v[0] * dt; s.position.y += u.v[1] * dt; s.position.z += u.v[2] * dt; }
    X.muzzle.intensity = Math.max(0, X.muzzle.intensity - dt * 60); X.flashL.intensity = Math.max(0, X.flashL.intensity - dt * 50);
    if (X.boomT > 0) { X.boomT -= dt; const k = 1 - X.boomT / .7; X.boom.scale.setScalar(1 + k * 15); X.boom.material.opacity = .8 * (1 - k); X.boom.visible = X.boomT > 0; }

    if (X.camHook) X.camHook(cam);   // the map checks: a camera of their own (an overhead view)
    X.renderer.render(X.scene, cam);
    if (X.view.visible) {   // your gun, over the world, with its own depth
      X.vroot.position.copy(cam.position); X.vroot.quaternion.copy(cam.quaternion); updateCasings(dt); updateDrops(dt); X.vmuzzle.intensity = X.flashT > 0 ? 3 : 0;
      const ac = X.renderer.autoClear; X.renderer.autoClear = false; X.renderer.clearDepth(); X.renderer.render(X.vscene, cam); X.renderer.autoClear = ac;
    }
  }

  // guns on the floor (lying on their side over a pale ring), the charge on the floor, and the charge on its carrier's back
  function lootFx(dt) {
    const L = (M && M.loot) || [], seen = new Set();
    // in the buy phase, get a floor copy of each gun people are carrying ready, one a frame, so a gun dropped mid-fight costs nothing to show
    if (M && M.phase === 'buy') for (const f of M.fs) { const k = f.guns[1] || (f.guns[2] !== 'pip' && f.guns[2]); if (k && GUNS[k] && !X.lootProto.has(k)) { X.lootProto.set(k, gunModel(k, {})); break; } }
    for (const d of L) {
      seen.add(d.id); let o = X.lootObjs.get(d.id);
      if (!o) { let pr = X.lootProto.get(d.k); if (!pr) { pr = gunModel(d.k, {}); X.lootProto.set(d.k, pr); }
        o = new THREE.Group(); const gm = pr.clone(); gm.rotation.set(0, 0, Math.PI / 2); gm.position.y = .07; o.add(gm); const ring = new THREE.Mesh(X.lootRing.g, X.lootRing.m); ring.rotation.x = -Math.PI / 2; ring.position.y = .02; o.add(ring);
        o.rotation.y = (d.x * 7.3 + d.z * 3.1) % TAU; X.scene.add(o); X.lootObjs.set(d.id, o); }
      o.visible = true; o.position.set(d.x, d.y, d.z);
    }
    for (const [id, o] of X.lootObjs) if (!seen.has(id)) { X.scene.remove(o); X.lootObjs.delete(id); }
    const C = M && M.charge, blink = Math.sin(X.t * 5) > 0;
    X.chargeLampM.color.set(blink ? WARN : '#5a2620');
    X.chargeFloor.visible = !!(C && !C.k && !M.planted); if (X.chargeFloor.visible) { X.chargeFloor.position.set(C.x, C.y, C.z); X.chargeFloor.rotation.y = X.t * .6; }
    for (const [f, A] of X.agents) { const U = A.userData, on = !!(C && C.k === f.key && f.alive && !M.planted);
      if (on && !U.pack) { U.pack = X.chargeCopy(); U.pack.scale.setScalar(.62); U.pack.rotation.x = -Math.PI / 2 + .25; U.pack.position.set(0, .42, .2); U.torso.add(U.pack); }
      if (U.pack) U.pack.visible = on; }
  }
  function hideLoot() { if (!X || !X.lootObjs) return; for (const o of X.lootObjs.values()) o.visible = false; X.chargeFloor.visible = false; }
  // a point in the world on the screen, in the HUD's 1280 by 720 units (null when it is behind you)
  function toScreen(x, y, z) {
    if (!X || !ready) return null; const p = new THREE.Vector3(x, y, z).project(X.camera); if (p.z > 1) return null;
    const V = K.view; return [lp(V.x0, V.x1, (p.x + 1) / 2), lp(V.y0, V.y1, (1 - p.y) / 2)];
  }
