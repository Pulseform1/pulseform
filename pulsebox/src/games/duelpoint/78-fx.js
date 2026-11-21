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
    // Rampart: a barricade of dark armoured slabs, seamed and riveted, with Bastion's amber running hot through a hex lattice
    { const tex = canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4a4438'); gr.addColorStop(1, '#2c2924'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 4; for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,.12)'; for (let y = 8; y < h; y += 64) for (let x = 8; x < w; x += 24) g.fillRect(x, y, 3, 3);
        g.strokeStyle = 'rgba(255,190,90,.35)'; g.lineWidth = 2; const s2 = 22; for (let r = 0; r < 14; r++) for (let c = 0; c < 8; c++) { const cx = c * s2 * 1.5 + 6, cy = r * s2 * .866 * 2 + (c % 2) * s2 * .866; g.beginPath(); for (let k = 0; k < 6; k++) g.lineTo(cx + Math.cos(k * Math.PI / 3) * s2 * .9, cy + Math.sin(k * Math.PI / 3) * s2 * .9); g.closePath(); g.stroke(); } }),
        glowT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffb347'; g.lineWidth = 2.5; const s2 = 22; for (let r = 0; r < 14; r++) for (let c = 0; c < 8; c++) { const cx = c * s2 * 1.5 + 6, cy = r * s2 * .866 * 2 + (c % 2) * s2 * .866; g.beginPath(); for (let k = 0; k < 6; k++) g.lineTo(cx + Math.cos(k * Math.PI / 3) * s2 * .9, cy + Math.sin(k * Math.PI / 3) * s2 * .9); g.closePath(); g.stroke(); }
          g.fillStyle = '#ffd27a'; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5); });
      tex.wrapS = tex.wrapT = glowT.wrapS = glowT.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1); glowT.repeat.set(2, 1);
      X.wallM = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: glowT, emissive: '#ffb347', emissiveIntensity: 1.1, roughness: .55, metalness: .35 }); } X.walls = [];
    /* the charge: a six-sided base on three splayed feet, a canister wound with three glowing coils inside a cage of four
       struts, a collar and a cap with the lamp under its guard, a keypad with a little screen, a carry handle and an aerial.
       Built from plain shapes and then merged into one mesh per material (the lamp stays its own, to blink). */
    const ch = X.charge = new THREE.Group(), dk = new THREE.MeshLambertMaterial({ color: LC('#3c414d') }), mt = new THREE.MeshPhongMaterial({ color: LC('#aeb4be'), shininess: 70, specular: LC('#666c78') }), pn = new THREE.MeshLambertMaterial({ color: LC('#5a606d') }), coil = new THREE.MeshBasicMaterial({ color: FOE }), scr = new THREE.MeshBasicMaterial({ color: '#7fe8d8' });
    { const put = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); ch.add(o); return o; };
      put(new THREE.CylinderGeometry(.24, .27, .05, 6), dk, 0, .045, 0); put(new THREE.CylinderGeometry(.2, .24, .02, 6), mt, 0, .08, 0);
      for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + .5; put(new THREE.BoxGeometry(.06, .03, .18), mt, Math.cos(a) * .27, .022, Math.sin(a) * .27, 0, -a + Math.PI / 2, 0); put(new THREE.CylinderGeometry(.04, .05, .02, 8), dk, Math.cos(a) * .35, .01, Math.sin(a) * .35); }
      put(new THREE.CylinderGeometry(.13, .15, .24, 12), pn, 0, .2, 0);
      for (let i = 0; i < 3; i++) put(new THREE.TorusGeometry(.146 - i * .005, .015, 6, 20), coil, 0, .125 + i * .075, 0, Math.PI / 2);
      for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + .78; put(new THREE.BoxGeometry(.03, .28, .03), mt, Math.cos(a) * .195, .21, Math.sin(a) * .195); }
      put(new THREE.CylinderGeometry(.215, .215, .03, 12), dk, 0, .345, 0); put(new THREE.CylinderGeometry(.1, .165, .06, 10), pn, 0, .39, 0);
      for (const ry of [0, Math.PI / 2]) put(new THREE.TorusGeometry(.078, .009, 5, 12, Math.PI), mt, 0, .42, 0, 0, ry, 0);   // the lamp's guard
      put(new THREE.BoxGeometry(.12, .13, .03), dk, 0, .2, .16, -.12); put(new THREE.BoxGeometry(.085, .035, .012), scr, 0, .238, .176, -.12);
      for (let i = 0; i < 6; i++) put(new THREE.BoxGeometry(.02, .016, .012), mt, -.03 + (i % 3) * .03, .2 - Math.floor(i / 3) * .028, .18, -.12);
      put(new THREE.TorusGeometry(.06, .012, 6, 12, Math.PI), mt, 0, .2, -.16, 0, Math.PI / 2, -Math.PI / 2);   // the carry handle
      put(new THREE.CylinderGeometry(.008, .008, .34, 5), dk, .13, .53, -.08); put(new THREE.SphereGeometry(.016, 8, 6), coil, .13, .705, -.08); }
    X.chargeLamp = new THREE.Mesh(new THREE.SphereGeometry(.056, 12, 8), new THREE.MeshBasicMaterial({ color: WARN })); X.chargeLamp.position.y = .44; X.chargeLamp.userData.live = true; bake(ch, false); ch.add(X.chargeLamp);
    /* the defuser: a hand unit clamped to the charge by a cable. A screen with a bar that fills as the defuse runs, three
       lamps that come on by thirds, a dial, two probes. Held in your hands in first person, and by anyone you watch. */
    { const dkD = new THREE.MeshLambertMaterial({ color: '#1e2129' }), mtD = mt, glv = new THREE.MeshLambertMaterial({ color: '#2a2d36' }), rub = new THREE.MeshLambertMaterial({ color: '#14161a' }), off = '#16323a';
      const proto = new THREE.Group(), put = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); proto.add(o); return o; };
      put(new THREE.BoxGeometry(.1, .045, .17), dkD, 0, 0, 0); for (const sx of [-1, 1]) put(new THREE.BoxGeometry(.014, .052, .15), mtD, sx * .056, 0, 0);
      put(new THREE.BoxGeometry(.078, .004, .084), new THREE.MeshBasicMaterial({ color: '#06202a' }), 0, .0245, .022);
      put(new THREE.CylinderGeometry(.014, .014, .012, 10), mtD, .03, .03, -.052); put(new THREE.BoxGeometry(.03, .008, .016), mtD, -.022, .027, -.052);
      put(new THREE.BoxGeometry(.066, .024, .022), dkD, 0, 0, -.094); for (const sx of [-1, 1]) put(new THREE.CylinderGeometry(.0045, .003, .07, 6), mtD, sx * .02, 0, -.135, Math.PI / 2);
      put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, -.012, .085), new THREE.Vector3(.035, -.07, .13), new THREE.Vector3(-.02, -.15, .03), new THREE.Vector3(0, -.2, -.14)]), 14, .0065, 5), rub, 0, 0, 0);
      put(new THREE.CylinderGeometry(.004, .004, .07, 5), dkD, -.04, .055, .07);
      bake(proto, false);
      X.defuserMk = hands => { const g = proto.clone(), U = g.userData = { leds: [] };
        const bar = new THREE.Mesh(new THREE.BoxGeometry(.066, .006, .016).translate(.033, 0, 0), new THREE.MeshBasicMaterial({ color: YOU })); bar.position.set(-.033, .028, .048); g.add(bar); U.bar = bar;
        for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(.014, .006, .014), new THREE.MeshBasicMaterial({ color: off })); l.position.set(-.022 + i * .022, .028, .012); g.add(l); U.leds.push(l); }
        if (hands) for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(.03, .06, .11), glv); h.position.set(sx * .074, -.006, .01); g.add(h); const f = new THREE.Mesh(new THREE.BoxGeometry(.05, .024, .1), glv); f.position.set(sx * .046, -.034, .01); g.add(f); const arm = new THREE.Mesh(new THREE.CylinderGeometry(.03, .036, .34, 8), glv); arm.position.set(sx * .11, -.12, .16); arm.rotation.set(.9, 0, sx * -.25); g.add(arm); }
        U.set = (q, t) => { bar.scale.x = Math.max(.001, cl(q, 0, 1)); U.leds.forEach((l, i) => l.material.color.set(q >= (i + 1) / 3 - .001 ? YOU : (q > i / 3 && Math.sin(t * 16) > 0 ? '#bff8ee' : off))); };
        return g; }; }
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
    buildKitFx(); buildKitFx2(); buildKillFx();
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
  on('wallCut', (f, heavy, W) => { if (!X || !ready) return; const e = W.end, n = W.n;
    for (let i = 0; i < (heavy ? 14 : 9); i++) spark(e, [n[0] * 2.5 + rnd(-1.6, 1.6), rnd(-.2, 2.4), n[2] * 2.5 + rnd(-1.6, 1.6)], i % 3 ? '#cfc4b2' : '#8a8172', .45);
    const mk = X.marks[X.mkN++ % X.marks.length]; mk.visible = true; mk.position.set(e[0] + n[0] * .012, e[1] + n[1] * .012, e[2] + n[2] * .012); mk.lookAt(e[0] + n[0], e[1] + n[1], e[2] + n[2]); mk.rotation.z = Math.random() * 6; });
  on('melee', (f, heavy, S) => { if (X && ready && S) for (let i = 0; i < 8; i++) spark(S.end, [rnd(-1.5, 1.5), rnd(-.5, 2), rnd(-1.5, 1.5)], (OPS[other(f).op] || OPS.vex).col, .32); });
  on('flarePop', fl => { if (X && ready) { X.flashL.position.set(fl.x, fl.y, fl.z); X.flashL.intensity = 18; } });
  on('boom', (x, z) => { if (X && ready) { X.boom.position.set(x, .5, z); X.boom.visible = true; X.boomT = .7; X.shake = .5; X.flashL.position.set(x, 2, z); X.flashL.intensity = 30; } });
  on('round', () => { if (X && ready) for (const m of X.marks) m.visible = false; });
  // a skin with a kill effect plays it on the rival it finishes
  on('kill', (v, by, head, wk) => { if (!X || !ready || !by || v === by) return; const sk = skinOfId(skinFor(by, wk)); if (sk) killFx(v, sk.line); });
  on('land', f => { if (X && M && f === me()) X.dip = .09; });
  /* ---- abilities: your off hand comes into view and does the thing, in your operative's colours. Each ability is one of a
     few gestures: throw (up with a glowing charge, wound back, flung down the view), place (down to the floor ahead, set
     it, back), push (palm out, a ring of light bursts off it), pulse (palm up, the charge swells and rings out), heal (to
     the chest, glowing), dash (a quick sweep across) and surge (a fist that crackles). Rivals' bodies play the same move. */
  const AB_KIND = { vexq: 'dash', vexe: 'throw', vexx: 'pulse', irisq: 'pulse', irise: 'throw', irisx: 'pulse', bastionq: 'push', bastione: 'heal', bastionx: 'heal',
    novaq: 'surge', novae: 'push', novax: 'surge', wraithq: 'pulse', wraithe: 'push', wraithx: 'pulse', talonq: 'throw', talone: 'place', talonx: 'push',
    emberq: 'throw', embere: 'push', emberx: 'throw', axiomq: 'place', axiome: 'place', axiomx: 'place' };
  const AB_D = { throw: .62, place: .7, push: .55, pulse: .72, heal: .8, dash: .36, surge: .6 };
  on('ability', (f, k) => { f.castK = AB_KIND[f.op + k] || 'push'; f.castD = AB_D[f.castK]; f.castT = f.castD; f.castBig = k === 'x'; });
  // the hand itself: a sleeve, a glove, fingers and thumb, a charge of light in the palm and a ring for bursts (one per operative, kept)
  function abHand(op) {
    X.abHands = X.abHands || {}; if (X.abHands[op]) return X.abHands[op];
    const O = OPS[op] || OPS.vex, c = new THREE.Color(O.col), std = (col, r = .85) => new THREE.MeshStandardMaterial({ color: col, roughness: r, metalness: 0 });
    const glove = std(new THREE.Color('#6a707c').lerp(c, .16).convertSRGBToLinear(), .9), sleeve = std(new THREE.Color('#262c38').lerp(c, .42).convertSRGBToLinear()), band = std(LC(O.col), .5);
    const H = new THREE.Group(), add = (geo, m, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.x = rx; H.add(o); return o; }, B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    add(new THREE.CylinderGeometry(.031, .031, .03, 12), sleeve, 0, -.004, .05, Math.PI / 2); add(new THREE.CylinderGeometry(.032, .032, .016, 12), band, 0, -.004, .07, Math.PI / 2);   // the cuff (the forearm is laid each frame, see abHandFrame)
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.03, .038, 1, 12), sleeve); arm.geometry.translate(0, .5, 0);
    add(B(.07, .024, .08), glove, 0, 0, 0); const fing = [];
    for (let i = 0; i < 4; i++) fing.push(add(B(.0155, .018, .062), glove, -.026 + i * .0173, .002, -.066 + Math.abs(i - 1.5) * .006));
    const thumb = add(B(.017, .018, .05), glove, .042, .004, -.012); thumb.rotation.y = -.55;
    const orb = new THREE.Mesh(new THREE.SphereGeometry(.026, 16, 12), new THREE.MeshBasicMaterial({ color: LC(O.col), transparent: true }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: X.glowT || (X.glowT = canvasTex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); })), color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.setScalar(.16); orb.add(glow);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.05, .006, 8, 32), new THREE.MeshBasicMaterial({ color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    H.visible = false; X.vroot.add(H, orb, ring, arm); orb.visible = ring.visible = arm.visible = false;
    return X.abHands[op] = { H, orb, ring, fing, glow, arm };
  }
  // keyframes for the hand: [q, x, y, z, rx, ry, rz], eased between
  const AB_KF = {
    throw: [[0, -.16, -.38, -.3, -.2, 0, .3], [.3, -.11, -.1, -.33, -.35, .1, .2], [.48, -.085, -.065, -.23, .35, .15, .1], [.62, -.03, -.035, -.55, -.75, 0, 0], [1, -.12, -.42, -.45, -.9, 0, .3]],
    place: [[0, -.06, -.42, -.3, -.4, 0, .2], [.45, -.04, -.17, -.42, -1.0, 0, 0], [.6, -.04, -.18, -.43, -1.1, 0, 0], [1, -.07, -.44, -.36, -.6, 0, .2]],
    push: [[0, -.17, -.36, -.28, 0, 0, .3], [.35, -.05, -.075, -.42, 1.45, 0, 0], [.55, -.05, -.07, -.44, 1.5, 0, 0], [1, -.16, -.4, -.32, .4, 0, .3]],
    pulse: [[0, -.15, -.38, -.3, -.2, 0, .3], [.38, -.07, -.1, -.31, -.25, 0, .05], [.65, -.07, -.095, -.31, -.25, 0, .05], [1, -.14, -.4, -.32, -.3, 0, .3]],
    heal: [[0, -.15, -.4, -.25, 0, 0, .3], [.3, -.05, -.14, -.25, 1.3, .35, 0], [.75, -.05, -.145, -.25, 1.3, .35, 0], [1, -.13, -.42, -.28, .3, 0, .3]],
    dash: [[0, .06, -.24, -.32, -.1, 0, -.4], [.45, -.08, -.14, -.36, -.1, .2, .1], [.75, -.24, -.16, -.34, -.1, .5, .5], [1, -.3, -.34, -.3, -.2, .5, .6]],
    surge: [[0, -.15, -.38, -.3, -.3, 0, .3], [.3, -.08, -.11, -.33, -.2, .1, .1], [.7, -.08, -.11, -.33, -.2, .1, .1], [1, -.14, -.4, -.33, -.3, 0, .3]],
  };
  function abKey(kind, q) { const K2 = AB_KF[kind], o = [0, 0, 0, 0, 0, 0]; let i = 0; while (i < K2.length - 2 && q > K2[i + 1][0]) i++;
    const a = K2[i], b = K2[i + 1], t = sm(cl((q - a[0]) / Math.max(1e-6, b[0] - a[0]), 0, 1)); for (let j = 0; j < 6; j++) o[j] = lp(a[j + 1], b[j + 1], t); return o; }
  function abHandFrame(P, dt) {
    const live = P.alive && P.castT > 0 && P.castK && !(P.scoped && gun(P).scope), hold = !live && P.alive && (X.rdyK || 0) > .02, R = abHand(P.op);
    for (const k in X.abHands) { const h = X.abHands[k]; if (h !== R || (!live && !hold)) { h.H.visible = h.orb.visible = h.ring.visible = h.arm.visible = false; } }
    if (X.abL) X.abL.intensity = 0;
    if (hold) { abHold(P, R, dt); return; }
    if (!live) return;
    const kind = P.castK, q = 1 - P.castT / (P.castD || .5), o = abKey(kind, q), big = P.castBig ? 1.25 : 1, { H, orb, ring, fing, glow, arm } = R;
    H.visible = true; H.position.set(o[0], o[1], o[2]); H.rotation.set(o[3], o[4], o[5]);
    // the forearm: from the wrist back to an elbow down at the bottom left, out of sight, whatever the hand is doing
    { H.updateMatrix(); const w = new THREE.Vector3(0, -.004, .07).applyMatrix4(H.matrix), e = new THREE.Vector3(-.2, -.5, .02), d = e.clone().sub(w), L = d.length();
      arm.visible = true; arm.position.copy(w); arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); arm.scale.set(1, L, 1); }
    const curl = kind === 'surge' ? 1 : kind === 'throw' && q > .1 && q < .56 ? .7 : kind === 'place' && q < .5 ? .6 : 0;   // a fist, or fingers closed round what it holds
    for (const f of fing) { f.scale.z = 1 - curl * .45; f.rotation.x = curl * .9; }
    // the charge: in the palm, then off down the view (a throw), set down (place), swelling (pulse, heal, surge)
    let ov = 0, os = 0, fly = 0;
    if (kind === 'throw') { ov = q < .58 ? 1 : q < .8 ? 1 : 0; os = sm(cl(q / .25, 0, 1)); fly = q < .56 ? 0 : (q - .56) / .24; }
    else if (kind === 'place') { ov = q < .52 ? 1 : 0; os = .8 * sm(cl(q / .2, 0, 1)); }
    else if (kind === 'pulse') { ov = q < .85 ? 1 : 0; os = sm(cl(q / .38, 0, 1)) * (1.3 - .6 * sm(cl((q - .6) / .25, 0, 1))); }
    else if (kind === 'heal') { ov = q > .2 && q < .9 ? 1 : 0; os = .9 + Math.sin(X.t * 14) * .15; }
    else if (kind === 'surge') { ov = q > .15 && q < .85 ? 1 : 0; os = .55 + Math.random() * .35; H.position.x += (Math.random() - .5) * .004; H.position.y += (Math.random() - .5) * .004; }
    else if (kind === 'push') { ov = q > .25 && q < .6 ? 1 : 0; os = .7; }
    else if (kind === 'dash') { ov = q < .8 ? 1 : 0; os = .6; }
    orb.visible = ov > 0; if (ov) { H.updateMatrix(); const palm = new THREE.Vector3(0, kind === 'push' || kind === 'heal' ? -.045 : .045, -.03).applyMatrix4(H.matrix);
      if (fly > 0) palm.set(lp(palm.x, 0, fly), lp(palm.y, .02, fly), palm.z - fly * 1.4);
      orb.position.copy(palm); orb.scale.setScalar(Math.max(.001, os * big * (fly > 0 ? 1 - fly * .5 : 1))); orb.material.opacity = fly > 0 ? 1 - fly : 1; glow.material.opacity = (fly > 0 ? 1 - fly : 1) * (.8 + Math.random() * .2); }
    // a ring bursts off the palm (push) or the charge (pulse), growing and fading
    const rq = kind === 'push' ? (q - .3) / .45 : kind === 'pulse' ? (q - .4) / .45 : kind === 'heal' ? (q - .35) / .5 : -1;
    ring.visible = rq > 0 && rq < 1; if (ring.visible) { ring.position.copy(kind === 'pulse' || kind === 'heal' ? orb.position : H.position); if (kind === 'push') ring.position.z -= .05; ring.rotation.set(kind === 'push' ? 0 : Math.PI / 2, 0, 0); ring.scale.setScalar((1 + rq * (kind === 'push' ? 2.6 : 1.8)) * big * (kind === 'heal' ? .6 : 1)); ring.material.opacity = (1 - rq) * .85; }
  }
  // the hold: the off hand up and forward, the ability crackling in the palm, lighting the gun and the glove in its colour
  function abHold(P, R, dt) {
    const k = sm(X.rdyK), t = X.t, { H, orb, ring, fing, glow, arm } = R, col = (OPS[P.op] || OPS.vex).col, big = P.rdy === 'x' ? 1.3 : 1;
    H.visible = true; H.position.set(-.15 + Math.sin(t * 1.3) * .003, lp(-.46, -.19, k) + Math.sin(t * 2.1) * .004, -.37); H.rotation.set(lp(-.6, -.2, k), .18, .3);   // low on the left, the gun's side kept clear
    { H.updateMatrix(); const w = new THREE.Vector3(0, -.004, .07).applyMatrix4(H.matrix), e = new THREE.Vector3(-.2, -.5, .02), d = e.clone().sub(w), L = d.length(); arm.visible = true; arm.position.copy(w); arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); arm.scale.set(1, L, 1); }
    for (const f of fing) { f.scale.z = .75; f.rotation.x = .55; }   // fingers curled round it
    H.updateMatrix(); const palm = new THREE.Vector3(0, .05, -.035).applyMatrix4(H.matrix); orb.visible = true; orb.position.copy(palm);
    const pulse = .85 + .15 * Math.sin(t * 9) + (Math.random() - .5) * .08; orb.scale.setScalar(k * pulse * big * .62); orb.material.opacity = 1; glow.material.opacity = .75 + Math.random() * .25; glow.scale.setScalar(.2 + .05 * Math.sin(t * 7));
    ring.visible = true; ring.position.copy(palm); ring.rotation.set(t * 2.2, t * 1.4, 0); ring.scale.setScalar(k * (.9 + .1 * Math.sin(t * 5)) * big * .5); ring.material.opacity = .85;
    X.abL.color.set(col); X.abL.position.copy(palm); X.abL.intensity = k * (1.4 + .4 * Math.sin(t * 13) + Math.random() * .3);
  }
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
    /* a reload is held where you can watch it: the gun out in front, tipped muzzle-up and rolled so the magazine well
       faces you, low and to the left of centre, clear of the HUD; then rolled the other way to show the hand on the
       charging handle or the slide */
    reload: {
      rifle: [[0, 0, 0, 0, 0, 0, 0], [.1, -.09, .11, -.14, .3, .35, -.6], [.19, -.09, .096, -.14, .27, .35, -.64], [.26, -.09, .11, -.14, .3, .35, -.6], [.68, -.09, .11, -.14, .3, .35, -.6], [.76, -.09, .125, -.14, .33, .35, -.58], [.83, -.06, .09, -.1, .18, .3, .12], [.92, -.06, .08, -.09, .16, .3, .16], [1, 0, 0, 0, 0, 0, 0]],
      sidearm: [[0, 0, 0, 0, 0, 0, 0], [.1, -.057, .1, -.124, .45, .3, -.5], [.19, -.057, .088, -.124, .42, .3, -.54], [.26, -.057, .1, -.124, .45, .3, -.5], [.68, -.057, .1, -.124, .45, .3, -.5], [.76, -.057, .118, -.124, .5, .3, -.48], [.84, -.04, .075, -.1, .22, .5, .12], [.93, -.03, .06, -.08, .18, .45, .1], [1, 0, 0, 0, 0, 0, 0]],
      shotgun: [[0, 0, 0, 0, 0, 0, 0], [.1, -.09, .12, -.14, .32, .35, -.78], [.84, -.09, .125, -.14, .32, .35, -.78], [.92, -.03, .05, -.06, .08, .1, -.1], [1, 0, 0, 0, 0, 0, 0]],
      sniper: [[0, 0, 0, 0, 0, 0, 0], [.1, -.1, .1, -.2, .25, .3, -.5], [.19, -.1, .088, -.2, .22, .3, -.54], [.26, -.1, .1, -.2, .25, .3, -.5], [.68, -.1, .1, -.2, .25, .3, -.5], [.76, -.1, .115, -.2, .28, .3, -.48], [.84, -.05, .06, -.12, .12, .15, .2], [.95, -.02, .03, -.04, .04, .05, .12], [1, 0, 0, 0, 0, 0, 0]],
      stub: [[0, 0, 0, 0, 0, 0, 0], [.12, -.06, .1, -.12, .28, .3, -.45], [.74, -.06, .1, -.12, .28, .3, -.45], [.84, -.04, .08, -.07, .12, .2, -.15], [.92, -.02, .05, -.02, .2, .05, 0], [1, 0, 0, 0, 0, 0, 0]],
      revolver: [[0, 0, 0, 0, 0, 0, 0], [.1, -.05, .1, -.12, .5, .25, -.35], [.3, -.05, .11, -.12, .62, .25, -.35], [.44, -.05, .095, -.12, .32, .3, -.42], [.78, -.05, .095, -.12, .32, .3, -.42], [.88, -.03, .08, -.08, .12, .2, .3], [.95, -.01, .04, -.02, .05, .05, -.1], [1, 0, 0, 0, 0, 0, 0]],
    },
    inspect: {
      rifle: [[0, 0, 0, 0, 0, 0, 0], [.14, -.04, .045, -.09, .05, .95, .28], [.3, -.04, .05, -.1, -.02, 1.08, .4], [.44, .01, .05, -.14, -.1, .3, -.95], [.6, .01, .05, -.14, -.16, .08, -1.05], [.72, -.01, .075, -.07, .55, .12, -.05], [.86, 0, .055, -.05, .45, .02, .05], [1, 0, 0, 0, 0, 0, 0]],
      sidearm: [[0, 0, 0, 0, 0, 0, 0], [.14, -.05, .05, -.08, .05, .9, .3], [.3, -.05, .055, -.09, 0, 1.05, .35], [.48, -.06, .07, -.08, .12, -.5, -.5], [.64, -.06, .07, -.08, -.02, -.7, -.62], [.78, -.02, .08, -.06, .5, .05, -.2], [.9, 0, .04, -.03, .3, 0, 0], [1, 0, 0, 0, 0, 0, 0]],
      sniper: [[0, 0, 0, 0, 0, 0, 0], [.16, -.05, .05, -.08, .04, .85, .25], [.36, -.05, .06, -.1, -.05, 1, .35], [.56, -.04, .07, -.1, .5, .3, .1], [.72, -.03, .065, -.08, .55, -.1, -.2], [.88, -.01, .04, -.04, .3, 0, 0], [1, 0, 0, 0, 0, 0, 0]],
      shotgun: [[0, 0, 0, 0, 0, 0, 0], [.16, -.04, .05, -.09, .05, .9, .3], [.34, -.04, .055, -.1, -.05, 1.05, .45], [.52, .01, .05, -.13, -.1, .3, -.95], [.68, -.02, .065, -.08, .45, .1, -.1], [.86, 0, .04, -.04, .3, 0, 0], [1, 0, 0, 0, 0, 0, 0]],
      melee: [[0, 0, 0, 0, 0, 0, 0], [.14, -.05, .05, -.05, .15, .55, .45], [.28, -.05, .06, -.06, .1, .65, .5], [.62, -.05, .07, -.06, .1, .5, .3], [.78, -.03, .06, -.05, .45, .15, -.25], [.9, -.01, .03, -.02, .2, .05, -.05], [1, 0, 0, 0, 0, 0, 0]],
    },
  };
  const INSP_D = 3.4;
  // the knife's swings, [q, dx, dy, dz, rx, ry, rz] on top of how it is held: a slash from the right, one from the left, the stab
  const KNIFE = {
    r: [[0, 0, 0, 0, 0, 0, 0], [.18, .09, .07, .04, -.25, -.55, .55], [.42, -.24, .07, -.16, 0, 1.0, -.85], [.6, -.3, .02, -.1, .1, 1.2, -1.0], [1, 0, 0, 0, 0, 0, 0]],
    l: [[0, 0, 0, 0, 0, 0, 0], [.18, -.2, .08, 0, -.15, .95, -.5], [.42, .08, .08, -.16, -.05, -.35, .6], [.6, .12, .03, -.1, .05, -.5, .8], [1, 0, 0, 0, 0, 0, 0]],
    stab: [[0, 0, 0, 0, 0, 0, 0], [.3, .05, -.03, .13, -.05, -.15, .1], [.45, -.08, .06, -.22, -.12, -.22, .25], [.62, -.08, .055, -.2, -.12, -.22, .25], [1, 0, 0, 0, 0, 0, 0]],
  };
  function kfAt(K, q) { if (q <= 0) return K[0].slice(1); for (let i = 1; i < K.length; i++) if (q <= K[i][0]) { const a = K[i - 1], b = K[i], u = (q - a[0]) / (b[0] - a[0]), e = u * u * (3 - 2 * u); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * e); } return K[K.length - 1].slice(1); }
  const vkfKind = (G, kind) => G.melee ? (kind === 'inspect' ? 'melee' : 'rifle') : kind === 'reload' && G.k === 'stub' ? 'stub' : kind === 'reload' && G.k === 'hammer' ? 'revolver' : kind === 'reload' && G.k === 'thresher' ? 'rifle' : G.cat === 'Sidearm' ? 'sidearm' : G.cat === 'Shotgun' ? 'shotgun' : G.cat === 'Sniper' ? 'sniper' : 'rifle';
  function vkf(kind, G, q) {
    const K = VKF[kind][vkfKind(G, kind)] || VKF[kind].rifle; if (q <= 0) return K[0].slice(1);
    for (let i = 1; i < K.length; i++) if (q <= K[i][0]) { const a = K[i - 1], b = K[i], u = (q - a[0]) / (b[0] - a[0]), e = u * u * (3 - 2 * u); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * e); }
    return K[K.length - 1].slice(1);
  }
  function renderFrame(dt) {
    if (!X || !ready) return; const cam = X.camera; X.t += dt; X.frameN = (X.frameN || 0) + 1; iconsAhead(dt); audioFrame(); tunePixels(dt); skinTick(dt); if (X.seaT) { X.seaT.offset.x = X.t * .003; X.seaT.offset.y = X.t * .0016; } mechFrame(dt);
    const live = M && (screen === 'play' || (screen === 'over' && posed)) && !loadingNow();
    if (!live) {   // behind the menus: a slow flight round the site
      if (screen === 'over' && M && M.prog && !(M.overStage | 0) && heroWork()) return;   // (93-after: the line-up's pictures, one a frame)
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
    if (X.viewKey !== G.k + P.op + vsk) { X.inspT = 0; if (X.viewGun) X.view.remove(X.viewGun); X.viewGun = viewGun(G.k, P.op, vsk); if (G.melee) X.viewGun.scale.setScalar(1.35); X.view.add(X.viewGun); X.viewKey = G.k + P.op + vsk; X.viewGun.add(X.mflash); X.drawD = Math.max(.35, (G.equip || .75) * .7); X.drawT = X.drawD; X.recP = X.recV = 0; }
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
    viewAnim(P, G, dt, { draw: chamber, insp: X.inspT > 0 ? 1 - X.inspT / (X.inspD || INSP_D) : -1 });
    { const pb = X.viewGun.userData.parts.boltL; if (pb) { X.view.rotation.z += pb.rotation.z * .14; X.view.position.y -= pb.rotation.z * .012; } }   // working a bolt rolls the rifle
    // the knife turns over in the fingers as it is drawn, and twice when you look it over: the blade rolls about its own
    // length while the hand and arm stay where they are (the hand is turned back by the same amount)
    { const rh = X.viewGun.userData.parts.rhand, iqk = X.inspT > 0 ? 1 - X.inspT / (X.inspD || INSP_D) : -1, spin = !G.melee ? 0 : X.drawT > 0 ? (1 - sm(cl(dq, 0, 1))) * TAU : iqk > 0 && !(X.inspLine && INSPECT[X.inspLine]) ? sm(cl((iqk - .28) / .34, 0, 1)) * TAU * 2 : 0;
      X.viewGun.rotation.z = spin; if (rh && G.melee) rh.rotation.z = -spin; }
    if (G.melee) { X.view.rotation.x += .28; X.view.rotation.y += .5; X.view.rotation.z -= .2; }
    if (P.swing) {   // a slash winds up to one side, cuts across and follows through; a stab draws back to the hip and drives straight in
      const d = P.swing.heavy ? .55 : .32, q = Math.min(1, P.swing.t / d), k = kfAt(P.swing.heavy ? KNIFE.stab : P.swing.side > 0 ? KNIFE.r : KNIFE.l, q);
      X.view.position.x += k[0]; X.view.position.y += k[1]; X.view.position.z += k[2]; X.view.rotation.x += k[3]; X.view.rotation.y += k[4]; X.view.rotation.z += k[5];
    }
    if (X.inspT > 0) { if (P.reloadT > 0 || P.kick > 0 || P.scoped || P.plant > 0 || P.defuse > 0 || P.castT > 0 || !P.alive) X.inspT = 0; else X.inspT -= dt; }   // (anything else you do with the gun ends the look)
    if (X.inspT > 0) { const iq = 1 - X.inspT / (X.inspD || INSP_D), k = X.inspLine && INSPECT[X.inspLine] ? insPose(G, X.inspLine, iq) : vkf('inspect', G, iq); X.view.position.x += k[0]; X.view.position.y += k[1]; X.view.position.z += k[2]; X.view.rotation.x += k[3]; X.view.rotation.y += k[4]; X.view.rotation.z += k[5]; }
    insView(P, G, dt);   // a Legendary or better: its own show, on the gun as it is now held
    X.adsK = lp(X.adsK || 0, P.scoped && !G.scope && P.alive ? 1 : 0, Math.min(1, dt * 16));
    if (X.adsK > .001) { const a = X.adsK, sy = X.viewGun.userData.sight || .09; X.view.position.x = lp(X.view.position.x, 0, a); X.view.position.y = lp(X.view.position.y, -sy - rk * .05, a); X.view.position.z = lp(X.view.position.z, VO[2] - .03 + rk * .5, a); X.view.rotation.y = lp(X.view.rotation.y, 0, a); X.view.rotation.z = lp(X.view.rotation.z, 0, a); X.view.rotation.x = lp(X.view.rotation.x, rk * .5, a); }
    if (X.flashT > 0) X.flashT -= dt;
    // planting or defusing: you kneel, the gun goes down out of sight; planting, the charge is in your hands, set down as it arms
    X.kneel = lp(X.kneel || 0, P.alive && (P.plant > 0 || P.defuse > 0) ? 1 : 0, Math.min(1, dt * 10));
    if (X.kneel > .001) { const k = sm(X.kneel); X.view.position.y -= .32 * k; X.view.rotation.x -= .95 * k; X.view.position.z += .1 * k; }
    if (!X.vcharge) { X.vcharge = X.chargeCopy(); X.vcharge.scale.setScalar(.42); X.vroot.add(X.vcharge); }
    { const q = P.alive && P.plant > 0 ? cl(P.plant / PLANT_T, 0, 1) : -1; X.vcharge.visible = q >= 0 && X.kneel > .3;
      if (q >= 0) { const s2 = sm(cl(q / .35, 0, 1)), d2 = sm(cl((q - .35) / .55, 0, 1)); X.vcharge.position.set(.03 + Math.sin(X.t * 9) * .003 * (1 - d2), lp(-.5, -.26, s2) - d2 * .3, -.66 - d2 * .12); X.vcharge.rotation.set(lp(.9, .45, s2) + d2 * .25, .35 - d2 * .3, 0); } }
    if (!X.vdefuser) { X.vdefuser = X.defuserMk(true); X.vdefuser.visible = false; X.vroot.add(X.vdefuser); }
    { const q = P.alive && P.defuse > 0 ? cl(P.defuse / DEFUSE_T, 0, 1) : -1; X.vdefuser.visible = q >= 0 && X.kneel > .3;
      if (q >= 0) { const k = sm(cl((X.kneel - .3) / .7, 0, 1)); X.vdefuser.position.set(.005 + Math.sin(X.t * 11) * .0015, lp(-.42, -.2, k) + Math.sin(X.t * 2.3) * .004, -.4); X.vdefuser.rotation.set(.95, Math.sin(X.t * 1.7) * .03, 0); X.vdefuser.userData.set(q, X.t); } }
    // the off hand casts (see abHandFrame): the gun dips out of its way, further for a throw or a placing
    if (P.castT > 0) { const D = P.castD || .5, q = 1 - Math.max(0, P.castT) / D, c = Math.sin(Math.min(1, q) * Math.PI), dk = P.castK === 'throw' || P.castK === 'place' ? 1.25 : P.castK === 'dash' ? .5 : .9;
      X.view.position.y -= c * .08 * dk; X.view.position.x += c * .035 * dk; X.view.rotation.x -= c * .45 * dk; X.view.rotation.z += c * .3 * dk; }
    // a readied ability: the gun drops away and turns aside, out of the off hand's way
    X.rdyK = lp(X.rdyK || 0, P.alive && P.rdy && !(P.castT > 0) ? 1 : 0, Math.min(1, dt * 12)); if (X.rdyK > .001) { const k = sm(X.rdyK); X.view.position.y -= .075 * k; X.view.position.x += .04 * k; X.view.rotation.x -= .42 * k; X.view.rotation.z += .26 * k; }
    abHandFrame(P, dt); if (P.castT > 0) P.castT -= dt;

    // the rival
    for (const [f, A] of X.agents) if (!f.decoy && !M.fs.includes(f)) {   // (a Mirage copy is kept: 79-kitfx2 uses it again)
      X.scene.remove(A); X.agents.delete(f); }
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
    X.walls.forEach((m, i) => { const w = M.walls[i]; m.visible = !!w && !w.front; if (w) { m.scale.set(w.x1 - w.x0, 3 * w.grow + .01, w.z1 - w.z0); m.position.set((w.x0 + w.x1) / 2, 1.5 * w.grow, (w.z0 + w.z1) / 2); } });
    X.charge.visible = !!M.planted && !(M.phase === 'end' && M.last && M.last.why === 'boom');
    if (M.planted) { const C = M.planted, lit = !M.defused && C.beep > Math.max(.06, cl(C.t / 12, .12, 1) - .08); X.charge.position.set(C.x, C.y, C.z); X.chargePL.position.set(C.x, C.y + .7, C.z); X.chargeLamp.material.color.set(M.defused ? YOU : lit ? WARN : '#401018'); X.chargePL.intensity = lit && X.charge.visible ? 2.4 : 0; }
    else X.chargePL.intensity = 0;
    kitFx(dt); kitFx2(dt); stepKillFx(dt); animKit(X.viewGun, dt); lootFx(dt);
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
      X.vroot.position.copy(cam.position); X.vroot.quaternion.copy(cam.quaternion); updateCasings(dt); updateDrops(dt); insLight();
      aimArms(X.viewGun); const ac = X.renderer.autoClear; X.renderer.autoClear = false; X.renderer.clearDepth(); X.renderer.render(X.vscene, cam); X.renderer.autoClear = ac;
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
