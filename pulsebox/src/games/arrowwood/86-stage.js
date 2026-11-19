  /* ---------- 86 stage: the bow shop's show. Open a bow and a stand-in archer draws on you, takes that bow's arrow
     and gets its finisher, again and again, in a little glade three kilometres outside the wood (past the far plane of
     every camera in a match). The main renderer draws the glade into a corner of its own canvas before each frame,
     and that corner is copied into the shop's box; the frame then draws over it as usual. ---------- */
  const STG = { on: false, built: false, skin: '', t: 0, f: null, P: null, arrow: null, el: null, ctx: null, cam: null, look: null,
    loud: true, shake: 0, a: .35, camA: 1.1, far: 4, hi: 1.3, finDur: 2.2, blob: null, vp: null };
  function buildStage() {
    if (STG.built) return; STG.built = true;
    const S = X.scene, cx = STAGE.x, cz = STAGE.z, R = W.rng(909), mat = o => new THREE.MeshStandardMaterial(Object.assign({ roughness: .8, metalness: 0 }, o));
    // the grass: a wide disc, a little darker toward its rim, with a lighter worn patch where the stand-in stands
    const gg = new THREE.CircleGeometry(30, 64, 0, TAU); gg.rotateX(-Math.PI / 2); gg.translate(cx, 0, cz);
    const G0 = LC('#6cbd48'), G1 = LC('#4f9e3a'), WORN = LC('#9cc45a');
    tint(gg, (x, y, z) => { const d = Math.hypot(x - cx, z - cz), k = cl(d / 22, 0, 1), w = 1 - cl((d - 1.2) / 1.6, 0, 1), n = .94 + .06 * Math.sin(x * 1.9 + z * .7) * Math.cos(z * 1.4);
      return [lp(lp(G0.r, G1.r, k), WORN.r, w * .5) * n, lp(lp(G0.g, G1.g, k), WORN.g, w * .5) * n, lp(lp(G0.b, G1.b, k), WORN.b, w * .5) * n]; });
    const ground = new THREE.Mesh(gg, mat({ vertexColors: true, roughness: .95 })); ground.receiveShadow = true; S.add(ground);
    // a ring of trees so the glade has a wood behind it, and bushes, rocks and flowers inside the ring
    const trunks = [], crowns = [], bush = [], rocks = [], flowers = [];
    const clearOf = ang => Math.abs(angD(ang, STG.a)) > .55 && Math.abs(angD(ang, STG.camA)) > .6;   // nothing between the camera, the shooter and the stand-in
    for (let k = 0; k < 18; k++) { const ang = k / 18 * TAU + R() * .2, d = 10.5 + R() * 5; if (!clearOf(ang) && d < 13) continue;
      const t = { x: cx + Math.sin(ang) * d, z: cz + Math.cos(ang) * d, r: .35 + R() * .2, h: 6 + R() * 4, lean: [0, 0], kind: R() < .35 ? 'oak' : 'oak2', seed: (R() * 1e6) | 0 };
      const [a, b] = treeGeos(t, 0); trunks.push(...a); crowns.push(...b); }
    for (let k = 0; k < 9; k++) { const ang = R() * TAU, d = 4.5 + R() * 5; if (!clearOf(ang)) continue; const bx = cx + Math.sin(ang) * d, bz = cz + Math.cos(ang) * d, r = .6 + R() * .5, col = pick2(R, ['#3f9b3a', '#4aa83d', '#358f36', '#52b142']);
      for (let j = 0; j < 3; j++) { const a = R() * TAU, dd = j ? r * .55 : 0, rr = r * (j ? .7 + R() * .2 : 1); bush.push(leafBall(R, rr, bx + Math.cos(a) * dd, rr * .55, bz + Math.sin(a) * dd, 1.1, .78, 1.1, col)); } }
    for (let k = 0; k < 6; k++) { const ang = R() * TAU, d = 3 + R() * 7; if (!clearOf(ang)) continue; const g = new THREE.DodecahedronGeometry(.18 + R() * .25, 0); g.scale(1, .6, 1); g.translate(cx + Math.sin(ang) * d, .05, cz + Math.cos(ang) * d); tint(g, () => { const v = .5 + R() * .1; return [v, v, v * 1.02]; }); rocks.push(g); }
    for (let k = 0; k < 70; k++) { const ang = R() * TAU, d = 2.2 + R() * 9; if (!clearOf(ang) && d < 6) continue; const c = LC(pick2(R, ['#ff5f9e', '#ffd23a', '#ff7a3a', '#c06bff', '#ffffff'])), g = new THREE.OctahedronGeometry(.07, 0);
      g.translate(cx + Math.sin(ang) * d, .14, cz + Math.cos(ang) * d); tint(g, () => [c.r, c.g, c.b]); flowers.push(g); }
    const add = (list, m, shadow) => { if (!list.length) return; const mesh = new THREE.Mesh(merge(list), m); mesh.castShadow = mesh.receiveShadow = !!shadow; S.add(mesh); list.forEach(g => g.dispose()); };
    add(trunks, mat({ color: LC('#8a5a33'), vertexColors: true, roughness: .85 }), true); add(crowns, windify(mat({ vertexColors: true, roughness: .7 }), .25), true);
    add(bush, windify(mat({ vertexColors: true, roughness: .72 }), .15), true); add(rocks, mat({ vertexColors: true, roughness: .9 })); add(flowers, mat({ vertexColors: true, roughness: .6 }));
    // the stand-in (the far team's colours), and a soft shadow under it: the sun's shadows only follow the match camera
    STG.P = makePerson({ col: W.TEAMS[1].col, seed: 31, bow: 'longbow' }); STG.P.stuck = []; STG.P.root.visible = false; S.add(STG.P.root);
    const bg = new THREE.CircleGeometry(.62, 28); bg.rotateX(-Math.PI / 2); STG.blob = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .26, depthWrite: false }));
    STG.blob.renderOrder = 2; STG.blob.position.set(cx, .02, cz); S.add(STG.blob);
    STG.cam = new THREE.PerspectiveCamera(40, 1.4, .05, 260); STG.look = new THREE.Vector3(cx, 1, cz); STG.vp = new THREE.Vector4();
  }
  // show this bow (from the shop's detail page): `holder` is the element the stage's box takes the place of
  function startStage(holder, skin) {
    if (!X || !TEX.bark || !holder) return; buildStage();
    if (!STG.el) { STG.el = document.createElement('canvas'); STG.ctx = STG.el.getContext('2d'); STG.el.onclick = () => { STG.loud = true; resetStage(); }; }
    STG.el.className = 'prev stage'; STG.el.id = 'awStage'; if (holder !== STG.el) holder.replaceWith(STG.el);
    if (STG.skin !== skin || !STG.on) { STG.skin = skin; STG.loud = true; resetStage(); }
    STG.on = true; sizeStage();
  }
  function sizeStage() {
    const el = STG.el, gl = X.renderer.domElement, dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.min(gl.width, Math.round((el.clientWidth || 360) * dpr)), h = Math.min(gl.height, Math.round((el.clientHeight || 280) * dpr));
    if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
  }
  function stopStage() {
    if (!STG.built) return; STG.on = false; clearStageFx(); STG.P.root.visible = false; STG.blob.visible = false;
  }
  // take down the last show: its props, the arrow, any blocks and bank notes still lying in the glade
  function clearStageFx() {
    const P = STG.P;
    if (STG.f) { STG.f.objs.forEach(o => o.parent && o.parent.remove(o)); STG.f = null; }
    if (STG.arrow) { X.scene.remove(STG.arrow); STG.arrow = null; }
    P.stuck.forEach(m => m.parent && m.parent.remove(m)); P.stuck = [];
    for (let i = DEBRIS.length - 1; i >= 0; i--) { const m = DEBRIS[i].m; if (m.position.x < -1500) { X.scene.remove(m); DEBRIS.splice(i, 1); } }
    for (let i = FLOATS.length - 1; i >= 0; i--) { const s = FLOATS[i].s; if (s.position.x < -1500) { X.scene.remove(s); FLOATS.splice(i, 1); } }
    if (BILLS) for (const B of [BILLS, COINS3]) B.list = B.list.filter(b => b.x > -1500);
    if (THWACK && THWACK.position.x < -1500) THWACK.visible = false;
    P.fin = null; resetDeath(P);
  }
  function resetStage() {
    if (!STG.built) return; clearStageFx();
    const k = STG.skin, D = FX[k];
    STG.far = (D && D.far || (k === 'cashout' ? 4.2 : k === 'yardstick' ? 5.2 : 3.4)) * 1.2; STG.hi = D && D.hi || (k === 'yardstick' ? 2.1 : 1.3);
    STG.finDur = D && D.dur || (k === 'cupid' ? 2.4 : 2.2); STG.t = 0; STG.shake = 0; STG.look.set(STAGE.x, 1.05, STAGE.z);
    STG.P.root.visible = true; STG.P.lastPos = null;
  }
  const ST_HIT = .85, ST_FLY = .2;
  function stepStage(dt) {
    if (!STG.el || !STG.el.isConnected) { stopStage(); return; }
    const P = STG.P, a = STG.a, x0 = STAGE.x, z0 = STAGE.z, T = STG.t += dt, fx = Math.sin(a), fz = Math.cos(a);   // (fx, fz): toward the archer who shoots
    if (!STG.f) {
      // the stand-in raises its bow and draws on you...
      const k = cl((T - .1) / .55, 0, 1);
      posePerson(P, { x: x0, y: 0, z: z0, yaw: a + Math.PI, pitch: -.03, crouch: false, sprint: false, draw: k * k, aim: k > 0 ? 1 : 0, arrows: 6, inAir: false }, dt);
      // ...and your arrow gets there first
      if (T > ST_HIT - ST_FLY) {
        if (!STG.arrow) { STG.arrow = makeArrowMesh(STG.skin); X.scene.add(STG.arrow); }
        const u = cl((T - (ST_HIT - ST_FLY)) / ST_FLY, 0, 1), A = [x0 + fx * 9, 1.62, z0 + fz * 9], B = [x0 + fx * .16, 1.3, z0 + fz * .16], m = STG.arrow;
        const p = [lp(A[0], B[0], u), lp(A[1], B[1], u), lp(A[2], B[2], u)]; m.position.set(p[0], p[1], p[2]); m.lookAt(p[0] + A[0] - B[0], p[1] + A[1] - B[1], p[2] + A[2] - B[2]);
        const sk = STG.skin, col = TRAIL[sk] || (TRAILC[sk] || (TRAILC[sk] = trailOf(sk))), q = STG.lastTrail || p;
        for (let j = 0; j < 4; j++) { const v = j / 4; PS.trail.add(lp(q[0], p[0], v), lp(q[1], p[1], v), lp(q[2], p[2], v), 0, 0, 0, { life: .3, size: .15, col, a: .85, g: 0 }); }
        STG.lastTrail = p;
        if (u >= 1) {
          STG.lastTrail = null; P.root.updateMatrixWorld(true); P.chest.attach(m); P.stuck.push(m); STG.arrow = null;
          burst('spark', B, 12, { col: [1, .95, .7], size: .08, sp: 2.5, life: .35 });
          const msg = { v: 'stage', k: null, bow: sk, zone: 'body', p: [x0, 0, z0], yaw: a + Math.PI, d: [-fx, -.05, -fz], kn: 'You', vn: 'Stand-in' };
          const f = makeFin(msg, P, null, false, a); f.dur = STG.finDur; f.cam = { a: STG.camA, cam: STG.cam.position.clone(), dist: STG.far };
          if (f.ruler) placeRuler(f, STG.camA + Math.PI / 2);
          STG.f = f;
        }
      }
    } else {
      // the finisher, exactly as it plays in a match (it shakes this little camera, not yours)
      const f = STG.f, sh = X.shake; f.t += dt; stepFinisher(f, dt); if (X.shake > sh) STG.shake = Math.max(STG.shake, X.shake); X.shake = sh;
      if (f.t > STG.finDur + 1.4) { STG.loud = false; resetStage(); }   // again, quietly: tap the box to hear it once more
    }
    // the soft shadow stays under the body while it is there
    const R = P.root; STG.blob.visible = R.visible; STG.blob.position.set(R.position.x, .02, R.position.z); STG.blob.scale.setScalar(cl(R.scale.x, .1, 1.6) / (1 + Math.max(0, R.position.y) * .35));
    // the camera: three-quarters on, the way the finisher camera frames it, drifting a little
    const f = STG.f, camA = STG.camA = a + .78 + Math.sin(X.t * .3) * .07;
    let dist = STG.far; if (f && f.kind === 'cashout') dist *= 1 + sm(cl((f.t - .2) / 1.2, 0, 1)) * .55;
    const ly = f ? (f.camY != null ? f.camY : f.kind === 'yardstick' && f.hit ? .3 : 1) : 1.05;
    STG.look.lerp(new THREE.Vector3(x0, ly, z0), 1 - Math.exp(-6 * dt));
    const c = STG.cam; c.position.set(x0 + Math.sin(camA) * dist, 1 + STG.hi, z0 + Math.cos(camA) * dist);
    if (STG.shake > 0) { STG.shake = Math.max(0, STG.shake - dt * 2.5); c.position.x += (Math.random() - .5) * .1 * STG.shake; c.position.y += (Math.random() - .5) * .1 * STG.shake; }
    c.lookAt(STG.look);
  }
  // draw the glade into the bottom-left corner of the main canvas, copy it into the shop's box; the frame then draws over it
  function drawStage() {
    const el = STG.el; if (!el || !el.isConnected || !STG.cam) return; sizeStage();
    const r = X.renderer, gl = r.domElement, pr = r.getPixelRatio(), w = el.width, h = el.height; if (w < 8 || h < 8) return;
    r.getViewport(STG.vp); const sky = X.sky, sp = sky && sky.position.clone();
    STG.cam.aspect = w / h; STG.cam.updateProjectionMatrix(); if (sky) sky.position.copy(STG.cam.position);
    r.setScissorTest(true); r.setViewport(0, 0, w / pr, h / pr); r.setScissor(0, 0, w / pr, h / pr); r.clear(); r.render(X.scene, STG.cam);
    STG.ctx.drawImage(gl, 0, gl.height - h, w, h, 0, 0, w, h);
    r.setScissorTest(false); r.setViewport(STG.vp); if (sky) sky.position.copy(sp);
  }
