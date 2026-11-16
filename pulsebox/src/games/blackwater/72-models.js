  /* ---------- 72 models: wood, the raft's pieces, salvage, hook and rope, the shark, the thing from below, hands ---------- */
  const MAT = {};
  function woodTex(base, dark, rep) {
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { const y = Math.random() * h, a = .05 + Math.random() * .2; g.strokeStyle = `rgba(${dark},${a})`; g.lineWidth = .6 + Math.random() * 2.4; g.beginPath(); for (let x = 0; x <= w; x += 8) { const yy = y + Math.sin(x * .03 + i) * 3 + Math.sin(x * .11 + i * 2) * 1.2; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${dark},${Math.random() * .18})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 4, 1); }
      for (let i = 0; i < 6; i++) { const x = Math.random() * w, y = Math.random() * h, r = 3 + Math.random() * 7; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${dark},.7)`); gr.addColorStop(1, `rgba(${dark},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    }, rep);
  }
  function buildModels() {
    _m4 = new THREE.Matrix4(); _q = new THREE.Quaternion(); _v1 = new THREE.Vector3(); _v2 = new THREE.Vector3(); _s = new THREE.Vector3(); _z = new THREE.Vector3(0, 0, 1); _c = new THREE.Color();
    const std = (o, env = .5) => { const m = new THREE.MeshStandardMaterial(o); m.envMap = X.env; m.envMapIntensity = env; return m; };
    const wood = woodTex('#7a5a3c', '40,24,12', [1, 1]), wetWood = woodTex('#4e3826', '18,10,4', [1, 1]), drift = woodTex('#8b8578', '50,46,40', [1, 1]);
    MAT.deck = std({ map: wood, roughness: .62, color: LC('#ffffff') }, .35);
    MAT.wet = std({ map: wetWood, roughness: .32, color: LC('#ffffff') }, .7);       // wet wood: darker, glossier
    MAT.drift = std({ map: drift, roughness: .7 }, .3);
    MAT.log = std({ map: wetWood, roughness: .45, color: LC('#9a8070') }, .5);
    MAT.hurt = std({ map: wetWood, roughness: .5, color: LC('#7a5040') }, .4);
    MAT.rope = std({ color: LC('#b9a27a'), roughness: .9 }, .2);
    MAT.iron = std({ color: LC('#3a3d42'), roughness: .45, metalness: .8 }, 1);
    MAT.rust = std({ color: LC('#6a4030'), roughness: .8, metalness: .4 }, .5);
    MAT.canvas = std({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#b9ab88'; g.fillRect(0, 0, w, h); for (let i = 0; i < 64; i++) { g.fillStyle = `rgba(80,60,30,${Math.random() * .12})`; g.fillRect(0, i * 2, w, 1); g.fillRect(i * 2, 0, 1, h); } for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(60,40,20,.12)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 6 + Math.random() * 14, 0, 7); g.fill(); } }), roughness: .85, side: THREE.DoubleSide }, .2);
    MAT.stone = std({ color: LC('#4a4a4a'), roughness: .8 }, .2);
    MAT.barrel = std({ map: woodTex('#6b4a2c', '30,16,6', [2, 1]), roughness: .45 }, .5);
    MAT.crate = std({ map: woodTex('#8a6a44', '40,24,10', [1, 1]), roughness: .6 }, .35);
    MAT.shark = std({ vertexColors: true, roughness: .38 }, .7);
    MAT.skin = std({ color: LC('#c8946a'), roughness: .6 }, .25);
    MAT.sleeve = std({ color: LC('#4a5560'), roughness: .9 }, .15);
    MAT.flame = new THREE.SpriteMaterial({ map: canvasTex(64, 128, (g, w, h) => { const gr = g.createRadialGradient(32, 90, 2, 32, 80, 60); gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(.25, 'rgba(255,190,80,.95)'); gr.addColorStop(.6, 'rgba(240,90,20,.5)'); gr.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(32, 80, 26, 48, 0, 0, 7); g.fill(); }), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    MAT.glass = std({ color: LC('#cfefff'), roughness: .05, metalness: .1, transparent: true, opacity: .35 }, 1.2); MAT.fresh = std({ color: LC('#4fb8e8'), roughness: .1, transparent: true, opacity: .75 }, 1);
    MAT.bobber = std({ color: LC('#e8402a'), roughness: .4 }, .6); MAT.white = std({ color: LC('#f0eee8'), roughness: .5 }, .5);
    MAT.ghostOk = new THREE.MeshBasicMaterial({ color: LC('#7fe0a0'), transparent: true, opacity: .35, depthWrite: false });
    MAT.ghostNo = new THREE.MeshBasicMaterial({ color: LC('#ff6a5a'), transparent: true, opacity: .3, depthWrite: false });
    X.raftG = new THREE.Group(); X.scene.add(X.raftG); X.raftVer = -1; X.cellG = new Map(); X.drifts = new Map();
    X.items = new Map(); X.ghost = new THREE.Group(); X.scene.add(X.ghost);
    // hook, rope and bobber
    X.hook = hookMesh(); X.scene.add(X.hook); X.rope = ropeMesh(MAT.rope, .012); X.scene.add(X.rope); X.line = ropeMesh(MAT.white, .004); X.scene.add(X.line);
    X.bobber = new THREE.Group(); { const a = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8, 0, TAU, 0, Math.PI / 2), MAT.bobber), b = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8, 0, TAU, Math.PI / 2, Math.PI / 2), MAT.white); X.bobber.add(a, b); } X.scene.add(X.bobber);
    X.shark = sharkMesh(); X.scene.add(X.shark);
    // the sunken supply crate, and the bubbles that give it away
    X.cache = new THREE.Group(); X.cache.add(box(.9, .55, .6, MAT.crate), box(.92, .08, .62, MAT.iron, 0, .2, 0), box(.92, .08, .62, MAT.iron, 0, -.2, 0), box(.95, .12, .1, MAT.rust, 0, .3, .26)); X.scene.add(X.cache);
    X.bubbles = []; const bg = new THREE.SphereGeometry(.06, 6, 4), bm = std({ color: LC('#dff6ff'), roughness: .1, transparent: true, opacity: .6 }, 1);
    for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(bg, bm); b.userData.ph = i / 14; X.scene.add(b); X.bubbles.push(b); }
    X.ct = cthulhuMesh(); X.ct.visible = false; X.scene.add(X.ct);
  }
  const box = (w, h, d, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; return o; };
  const cyl = (r, l, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 10) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, seg), m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; return o; };
  // one cell of raft, in the raft's own frame: logs underneath, deck boards (fewer and darker as it is damaged), what stands on it
  function cellMesh(c, body) {
    const g = new THREE.Group(), x0 = c.i * CS, z0 = c.j * CS, rnd2 = n => ((Math.sin(c.i * 12.9 + c.j * 78.2 + n * 37.7) * 43758.5) % 1 + 1) % 1;
    for (let k = 0; k < 3; k++) g.add(cyl(.16, CS * .98, MAT.log, x0 - .48 + k * .48, DECK - .32, z0, 0, 0, Math.PI / 2 + (rnd2(k) - .5) * .04));
    const dmg = c.hp < 100 ? 1 - c.hp / 100 : 0, gone = dmg > .7 ? 2 : dmg > .4 ? 1 : 0;
    for (let k = 0; k < 5; k++) {
      if (gone && (k === 1 || (gone > 1 && k === 3))) continue;   // boards torn out: real gaps
      const tilt = dmg > .25 && k === 4 ? .12 : 0, m = k % 2 ? MAT.wet : MAT.deck;
      g.add(box(.27, .05, CS * (.96 - rnd2(k + 3) * .06), dmg > .55 ? MAT.hurt : m, x0 - .6 + k * .3, DECK - .1 + rnd2(k) * .01, z0 + (rnd2(k + 9) - .5) * .05, tilt, 0, (rnd2(k + 5) - .5) * .02));
    }
    g.add(box(CS * .98, .05, .09, MAT.wet, x0, DECK - .14, z0 - .55), box(CS * .98, .05, .09, MAT.wet, x0, DECK - .14, z0 + .55));
    if (c.floor) for (let k = 0; k < 7; k++) g.add(box(CS * .98, .03, .2, MAT.deck, x0, DECK - .05, z0 - .63 + k * .21));
    c.walls.forEach((w, s) => { if (!w) return; const [dx, dz] = SIDES[s], wg = new THREE.Group(); for (let k = 0; k < 6; k++) wg.add(box(.24, 1.2 + rnd2(k + 20) * .1, .06, k % 2 ? MAT.deck : MAT.wet, -.62 + k * .25, DECK + .55, 0)); wg.add(box(CS, .08, .1, MAT.wet, 0, DECK + .95, .03), box(CS, .08, .1, MAT.wet, 0, DECK + .3, .03)); wg.position.set(x0 + dx * CS * .47, 0, z0 + dz * CS * .47); wg.rotation.y = dx ? Math.PI / 2 : 0; g.add(wg); });
    if (c.reinforce) SIDES.forEach(([di, dj], s) => { if (cellAt(body, c.i + di, c.j + dj)) return; g.add(box(dx0(di, CS * .98), .12, dx0(dj, CS * .98), MAT.iron, x0 + di * CS * .49, DECK - .2, z0 + dj * CS * .49)); for (const t of [-.5, 0, .5]) g.add(box(di ? .05 : .08, .2, dj ? .05 : .08, MAT.rust, x0 + di * CS * .5 + (di ? 0 : t), DECK - .15, z0 + dj * CS * .5 + (dj ? 0 : t))); });
    if (c.shelter) { for (const [px, pz] of [[-.66, -.66], [.66, -.66], [-.66, .66], [.66, .66]]) g.add(cyl(.05, 2.3, MAT.wet, x0 + px, DECK + 1.1 + (pz > 0 ? -.15 : 0), z0 + pz)); const roof = new THREE.Mesh(new THREE.PlaneGeometry(CS * 1.08, CS * 1.12), MAT.canvas); roof.position.set(x0, DECK + 2.15, z0); roof.rotation.set(-Math.PI / 2 + .14, 0, 0); roof.castShadow = true; g.add(roof); }
    if (c.obj === 'catcher') {   // a canvas funnel on four posts over a barrel; the water shows in the barrel
      g.add(cyl(.28, .55, MAT.barrel, x0, DECK + .27, z0)); for (const [px, pz] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) g.add(cyl(.035, 1.2, MAT.wet, x0 + px, DECK + .6, z0 + pz));
      const fun = new THREE.Mesh(new THREE.ConeGeometry(.78, .5, 12, 1, true), MAT.canvas); fun.rotation.x = Math.PI; fun.position.set(x0, DECK + 1.05, z0); g.add(fun);
      if (c.store) { const w = cyl(.25, .04, MAT.fresh, x0, DECK + .1 + .4 * c.store / 4, z0); g.add(w); } }
    if (c.obj === 'still') {   // a glass box over a dark tray; drops gather in a jar
      g.add(box(1, .06, .8, MAT.iron, x0, DECK + .03, z0), box(.98, .45, .78, MAT.glass, x0, DECK + .28, z0)); const roof = box(1.04, .03, .84, MAT.glass, x0, DECK + .56, z0, .25); g.add(roof);
      g.add(cyl(.11, .26, MAT.glass, x0 + .62, DECK + .13, z0)); if (c.store) g.add(cyl(.09, .22 * c.store / 3, MAT.fresh, x0 + .62, DECK + .02 + .11 * c.store / 3, z0)); }
    if (c.obj === 'trap') {   // a slatted cage hanging off the open edge on two ropes
      const s = SIDES.findIndex(([di, dj]) => !cellAt(body, c.i + di, c.j + dj)), [di, dj] = SIDES[Math.max(0, s)], tx0 = x0 + di * 1.05, tz0 = z0 + dj * 1.05;
      for (let k = 0; k < 5; k++) g.add(box(di ? .05 : .7, .5, dj ? .05 : .7, MAT.wet, tx0 + (di ? (k - 2) * .14 : 0), DECK - .45, tz0 + (dj ? (k - 2) * .14 : 0)));
      g.add(box(.72, .05, .72, MAT.wet, tx0, DECK - .7, tz0), box(.72, .05, .72, MAT.wet, tx0, DECK - .2, tz0), cyl(.02, .4, MAT.rope, x0 + di * .7, DECK, z0 + dj * .7));
      for (let k = 0; k < (c.store || 0); k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), MAT.shark); f.scale.set(3, 1, 1); f.position.set(tx0 + (k - 1) * .12, DECK - .55 + k * .08, tz0); g.add(f); } }
    if (c.obj === 'storage') { g.add(box(.8, .6, .6, MAT.crate, x0 + .2, DECK + .27, z0 - .2), box(.82, .06, .62, MAT.wet, x0 + .2, DECK + .58, z0 - .2), box(.06, .62, .62, MAT.iron, x0 - .19, DECK + .27, z0 - .2)); }
    if (c.obj === 'fire') { for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; g.add(box(.16, .12, .12, MAT.stone, x0 + Math.cos(a) * .36, DECK + .03, z0 + Math.sin(a) * .36, 0, a, 0)); } g.add(box(.7, .04, .7, MAT.iron, x0, DECK - .03, z0)); for (let k = 0; k < 3; k++) g.add(cyl(.04, .55, MAT.log, x0, DECK + .08, z0, Math.PI / 2, k * 1.05, 0));
      const fl = new THREE.Sprite(MAT.flame); fl.scale.set(.55, .9, 1); fl.position.set(x0, DECK + .45, z0); fl.visible = false; fl.userData.fire = c; g.add(fl);
      const spit = box(.6, .025, .025, MAT.iron, x0, DECK + .42, z0); g.add(spit); const fish = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), MAT.shark); fish.scale.set(3, 1, 1); fish.position.set(x0, DECK + .38, z0); fish.visible = false; fish.userData.cook = c; g.add(fish); }
    g.userData.cell = c; return g;
  }
  const dx0 = (d, L) => d ? .14 : L;
  // logs placed on the deck, and the see-through one you are placing
  function syncLogs(body, G) {
    if (!X.logMats) { X.logMats = { ok: new THREE.MeshBasicMaterial({ color: '#8fe0a0', transparent: true, opacity: .45, depthWrite: false }), bad: new THREE.MeshBasicMaterial({ color: '#ff6a5a', transparent: true, opacity: .45, depthWrite: false }), set: new THREE.MeshBasicMaterial({ color: '#e8d080', transparent: true, opacity: .6, depthWrite: false }) }; X.logGeo = new THREE.CylinderGeometry(.17, .19, LOG_LEN, 12); X.logGeo.rotateZ(Math.PI / 2); }
    G.userData.logs = G.userData.logs || [];
    const want = body === RAFT ? body.logs.length : 0; const list = G.userData.logs;
    while (list.length < want) { const m = new THREE.Mesh(X.logGeo, MAT.log); m.castShadow = true; G.add(m); list.push(m); }
    while (list.length > want) G.remove(list.pop());
    list.forEach((m, n) => { const L = body.logs[n]; m.position.set(L.lx, DECK + .17, L.lz); m.rotation.set(0, -L.rot, 0); });
    if (body !== RAFT) return;
    if (!X.logGhost) X.logGhost = new THREE.Mesh(X.logGeo, X.logMats.ok); if (X.logGhost.parent !== G) G.add(X.logGhost);
    const P = ui.place, gh = X.logGhost; gh.visible = !!P; if (P) { gh.material = !P.ok ? X.logMats.bad : P.set ? X.logMats.set : X.logMats.ok; gh.position.set(P.lx, DECK + .19, P.lz); gh.rotation.set(0, -P.rot, 0); }
  }
  function syncRaft(body, G, map) {
    syncLogs(body, G);
    for (const [k, m] of map) if (body.cells.get(k) !== m.userData.cell || m.userData.v !== cellVer(m.userData.cell)) { G.remove(m); m.traverse(o => { if (o.geometry) o.geometry.dispose(); }); map.delete(k); }
    for (const [k, c] of body.cells) if (!map.has(k)) { const m = cellMesh(c, body); m.userData.v = cellVer(c); map.set(k, m); G.add(m); }
  }
  const cellVer = c => [Math.ceil(c.hp / 15), c.floor, c.walls.join(''), c.shelter, c.obj, c.reinforce, c.store || 0].join('|');
  // salvage
  function itemMesh(k) {
    const g = new THREE.Group();
    if (k === 'plank') g.add(box(1.9, .05, .26, MAT.drift));
    else if (k === 'log') g.add(cyl(.17, 2, MAT.log, 0, 0, 0, 0, 0, Math.PI / 2));
    else if (k === 'crate') { g.add(box(.75, .7, .75, MAT.crate)); for (const s of [-1, 1]) g.add(box(.78, .08, .08, MAT.wet, 0, s * .2, .37), box(.78, .08, .08, MAT.wet, 0, s * .2, -.37)); }
    else if (k === 'barrel') { const b = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .95, 14), MAT.barrel); b.rotation.z = Math.PI / 2; g.add(b); for (const x of [-.3, 0, .3]) g.add(cyl(.355, .05, MAT.iron, x, 0, 0, 0, 0, Math.PI / 2, 14)); }
    else if (k === 'panel') { for (let n = 0; n < 5; n++) g.add(box(.28, .05, 1.5, n % 2 ? MAT.wet : MAT.drift, -.6 + n * .3, 0, 0)); g.add(box(1.5, .06, .1, MAT.wet, 0, .05, .4), box(1.5, .06, .1, MAT.wet, 0, .05, -.4)); }
    else { for (let n = 0; n < 5; n++) g.add(box(.26, .05, 1.3, MAT.wet, -.55 + n * .27, 0, 0)); g.add(box(1.4, .07, .1, MAT.rust, 0, .05, 0)); }
    g.traverse(o => { if (o.isMesh) o.castShadow = false; }); return g;
  }
  function hookMesh() {
    const g = new THREE.Group(); g.add(cyl(.018, .32, MAT.iron, 0, .1, 0));
    for (let k = 0; k < 3; k++) { const a = k / 3 * TAU, t = new THREE.Mesh(new THREE.TorusGeometry(.09, .016, 6, 10, Math.PI * 1.1), MAT.iron); t.position.set(Math.cos(a) * .08, -.04, Math.sin(a) * .08); t.rotation.set(0, -a, Math.PI / 2); g.add(t); }
    return g;
  }
  // a rope as a strip of segments, bent every frame through the points we give it
  function ropeMesh(m, r) {
    const N = 28, geo = new THREE.CylinderGeometry(r, r, 1, 5, 1, true); geo.translate(0, .5, 0); geo.rotateX(Math.PI / 2);
    const im = new THREE.InstancedMesh(geo, m, N); im.frustumCulled = false; im.userData.N = N; im.count = 0; return im;
  }
  let _m4, _q, _v1, _v2, _s, _z;   // scratch maths objects, made once Three.js has loaded
  function bendRope(im, pts) {
    const n = Math.min(pts.length - 1, im.userData.N); im.count = n;
    for (let i = 0; i < n; i++) { _v1.set(...pts[i]); _v2.set(...pts[i + 1]); const L = _v1.distanceTo(_v2) || .001; _q.setFromUnitVectors(_z, _v2.sub(_v1).normalize()); _s.set(1, 1, L); _m4.compose(_v1, _q, _s); im.setMatrixAt(i, _m4); }
    im.instanceMatrix.needsUpdate = true;
  }
  // a shark: a spindle body, dark above and pale below, dorsal fin, a tail that swings
  function sharkMesh() {
    const g = new THREE.Group(), pts = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16, r = Math.sin(Math.PI * Math.pow(t, .7)) * .42 * (1 - t * .45); pts.push(new THREE.Vector2(Math.max(.01, r), t * 3.1 - 1.4)); }
    const geo = new THREE.LatheGeometry(pts, 14); geo.rotateZ(-Math.PI / 2); geo.scale(1, .8, 1);
    const pos = geo.attributes.position, col = []; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); const c = y > -.05 ? [.22, .25, .28] : [.82, .82, .8]; col.push(...c); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const body = new THREE.Mesh(geo, MAT.shark); g.add(body);
    const fin = (pts2, w) => { const s = new THREE.Shape(); pts2.forEach(([a, b], i) => i ? s.lineTo(a, b) : s.moveTo(a, b)); const eg = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); eg.translate(0, 0, -w / 2); return new THREE.Mesh(eg, new THREE.MeshStandardMaterial({ color: LC('#383e44'), roughness: .5 })); };
    const dor = fin([[-.35, 0], [.25, 0], [-.25, .62], [-.4, .55]], .05); dor.position.set(.1, .26, 0); g.add(dor); g.userData.fin = dor;
    const tail = new THREE.Group(); tail.position.set(-1.62, 0, 0); const t1 = fin([[0, 0], [-.55, .6], [-.42, .1], [-.5, -.42]], .04); tail.add(t1); g.add(tail); g.userData.tail = tail;
    for (const s of [-1, 1]) { const p = fin([[0, 0], [-.42, -.08], [-.2, 0]], .03); p.position.set(.45, -.18, s * .26); p.rotation.set(s * 1.2, 0, -.3); g.add(p); }
    g.visible = false; return g;
  }
  // the thing from below: a vast head with a face of feelers, two arms like towers, folded wings. Wet, dark, scaled.
  function cthulhuMesh() {
    const g = new THREE.Group(), bump = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 10) for (let x = 0; x < w; x += 12) { const gr = c.createRadialGradient(x + 6 + (y % 20 ? 6 : 0), y + 5, 0, x + 6, y + 5, 8); gr.addColorStop(0, '#c0c0c0'); gr.addColorStop(1, '#404040'); c.fillStyle = gr; c.beginPath(); c.ellipse(x + 6 + (y % 20 ? 6 : 0), y + 5, 6, 5, 0, 0, 7); c.fill(); } }, [12, 12], false);
    const skin = new THREE.MeshStandardMaterial({ color: LC('#14201a'), roughness: .3, metalness: .12, bumpMap: bump, bumpScale: .9, envMap: X.env, envMapIntensity: .9 });
    const lump = (geo, amp) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = Math.sin(x * 3.1 + y * 1.7) * Math.cos(z * 2.3 - y * 2.9) + Math.sin(x * 7 + z * 5) * .3; const k = 1 + n * amp; p.setXYZ(i, x * k, y * k, z * k); } geo.computeVertexNormals(); return geo; };
    const body = new THREE.Mesh(lump(new THREE.SphereGeometry(1, 40, 24), .06), skin); body.scale.set(34, 30, 26); body.position.y = 6; g.add(body);
    const head = new THREE.Mesh(lump(new THREE.SphereGeometry(1, 48, 32), .1), skin); head.scale.set(13, 27, 14); head.position.set(0, 54, 0); head.rotation.x = -.42; g.add(head);
    const brow = new THREE.Mesh(lump(new THREE.SphereGeometry(1, 32, 16), .12), skin); brow.scale.set(15, 8, 11); brow.position.set(0, 42, 9); g.add(brow);
    for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshBasicMaterial({ color: LC('#c8d860') })); eye.position.set(s * 6.5, 43, 19); eye.scale.set(1, .55, 1); g.add(eye); }
    g.userData.feelers = []; g.userData.arms = [];
    const chain = (n, r0, r1, len) => { const c = new THREE.Group(), segs = []; let par = c; for (let i = 0; i < n; i++) { const t = i / n, r = lp(r0, r1, t), s = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(lp(r0, r1, t + 1 / n), r, len / n * 1.08, 10), skin); m.position.y = len / n / 2; s.add(m); s.position.y = i ? len / n : 0; par.add(s); par = s; segs.push(s); } c.userData.segs = segs; return c; };
    for (let k = 0; k < 11; k++) { const f = chain(9, 1.9, .3, 36); const a = (k / 10 - .5) * 1.7; f.position.set(Math.sin(a) * 9, 37, 13 + Math.cos(a) * 4); f.rotation.set(Math.PI, 0, a * .3); f.userData.ph = k * .7; g.add(f); g.userData.feelers.push(f); }
    for (const s of [-1, 1]) { const a = chain(12, 5, .6, 80); a.position.set(s * 40, -6, 18); a.rotation.set(-.2, 0, s * -.15); a.userData.ph = s; a.userData.side = s; g.add(a); g.userData.arms.push(a); }
    const wingM = new THREE.MeshStandardMaterial({ color: LC('#10170f'), roughness: .5, side: THREE.DoubleSide, transparent: true, opacity: .92 });
    for (const s of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(s * 30, 26); sh.lineTo(s * 52, 10); sh.lineTo(s * 40, 4); sh.lineTo(s * 46, -8); sh.lineTo(s * 26, -2); sh.lineTo(s * 24, -16); sh.lineTo(0, -4); const w = new THREE.Mesh(new THREE.ShapeGeometry(sh), wingM); w.position.set(s * 16, 30, -14); w.rotation.y = s * .5; g.add(w); }
    g.traverse(o => { if (o.isMesh) o.frustumCulled = false; }); g.scale.setScalar(1.6);
    return g;
  }
  // first person: two hands and whatever tool is out
  function buildView() { X.vtool = ''; X.vgroup = new THREE.Group(); X.vroot.add(X.vgroup); }
  function viewModel(tool) {
    const g = new THREE.Group(), hand = (x, y, z, r = 0) => { const h = new THREE.Group(); h.add(box(.09, .1, .11, MAT.skin)); const arm = cyl(.05, .5, MAT.sleeve, 0, -.06, .26, Math.PI / 2 - .2); h.add(arm); h.position.set(x, y, z); h.rotation.z = r; return h; };
    const right = hand(.24, -.24, -.42), left = hand(-.26, -.27, -.5, .2); g.add(right);
    if (tool === 'hook') { const coil = new THREE.Mesh(new THREE.TorusGeometry(.09, .025, 6, 16), MAT.rope); coil.position.set(-.22, -.22, -.48); coil.rotation.set(1.2, .3, 0); g.add(coil, left); const hk = hookMesh(); hk.scale.setScalar(.9); hk.position.set(.24, -.12, -.5); g.add(hk); g.userData.tip = hk; }
    else if (tool === 'torch') { const st = cyl(.022, .36, MAT.wet, .26, -.2, -.52, -.35); g.add(st); const wrap = cyl(.038, .09, MAT.canvas, .26, -.03, -.58, -.35); g.add(wrap); const fl = new THREE.Sprite(MAT.flame); fl.scale.set(.085, .15, 1); fl.position.set(.26, .05, -.62); g.add(fl); g.userData.flame = fl; }
    else if (tool === 'hammer') { g.add(cyl(.016, .28, MAT.wet, .25, -.17, -.5, -.6)); g.add(box(.11, .045, .045, MAT.iron, .25, -.05, -.57, -.6)); }
    else if (tool === 'rod') { const r = cyl(.012, 1.4, MAT.wet, .24, .3, -.9, -1.05); g.add(r, left); const reel = cyl(.05, .04, MAT.iron, .24, -.16, -.45, 0, 0, Math.PI / 2); g.add(reel); g.userData.tip = new THREE.Object3D(); g.userData.tip.position.set(.24, .78, -1.5); g.add(g.userData.tip); }
    else if (tool === 'spear') { g.add(cyl(.018, 1.6, MAT.wet, .2, -.1, -.7, -1.45), left); const tip = new THREE.Mesh(new THREE.ConeGeometry(.04, .2, 6), MAT.iron); tip.position.set(.2, -.04, -1.55); tip.rotation.x = -1.45; g.add(tip); g.userData.spear = true; }
    else if (tool === 'oar') { g.add(cyl(.022, 1.5, MAT.wet, .05, -.35, -.6, .4, 0, 1.1), left); g.add(box(.05, .4, .18, MAT.deck, -.55, -.62, -.5, 0, 0, 1.1)); }
    else if (tool === 'food') { const f = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), MAT.shark); f.scale.set(2.4, 1, 1); f.position.set(.22, -.15, -.42); g.add(f); }
    return g;
  }
