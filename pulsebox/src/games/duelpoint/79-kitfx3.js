  /* ---------- 79 kit effects, third part: TESSEL ----------
     LIGHTLINE: a curtain of rose light standing on a line across the floor: a bright body (so you cannot see through it),
     the energy lattice climbing it, a hot edge along its foot and its top. It rises in a quarter second and thins out over
     its last half second. LULL: a glass lens on the floor in a field whose ripples run inward to it. GLASSHOUSE: its four
     walls are Lightlines; the floor inside glows. BLOOM: a cloud of glare (78-fx draws the cloud; here, its glow).
     Everything is made once (buildKitFx3) and pooled; nothing is made in a frame. */
  function buildKitFx3() {
    const K = X.kf2, col = OPS.tessel.col, add = o => { X.scene.add(o); o.visible = false; return o; };
    const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }, o || {}));
    const flat = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; return m; };
    const K3 = X.kf3 = {};
    // the body of a curtain: rose light, brightest at the foot, nearly opaque all the way up
    const bodyT = canvasTex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,206,230,.95)'); gr.addColorStop(.75, 'rgba(255,160,204,.97)'); gr.addColorStop(1, 'rgba(255,232,244,.99)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const sheet = new THREE.PlaneGeometry(1, 1); sheet.translate(.5, .5, 0);
    const edgeG = new THREE.BoxGeometry(1, .04, .04); edgeG.translate(.5, 0, 0);
    K3.lines = []; for (let i = 0; i < 10; i++) { const g = new THREE.Group(), s = new THREE.Group(), body = new THREE.Mesh(sheet, new THREE.MeshBasicMaterial({ map: bodyT, color: '#ffffff', transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })),
      lat = new THREE.Mesh(sheet, energyMat(col, { hex: 4, scan: 1, rim: 0, base: .05, rx: 4, ry: 1 })), top = new THREE.Mesh(edgeG, basic('#ffffff')), foot = new THREE.Mesh(edgeG, basic(col, { opacity: .95 }));
      lat.position.z = .01; s.add(body, lat); g.add(s, top, foot); foot.position.y = .03; g.userData = { s, body, lat, top, foot }; K3.lines.push(add(g)); }
    // Lull: the lens, a ring round it, a field disc and two ripples running in
    K3.lenses = []; for (let i = 0; i < 4; i++) { const g = new THREE.Group(), lens = new THREE.Mesh(new THREE.SphereGeometry(.24, 18, 10), new THREE.MeshBasicMaterial({ color: '#ffc4de', toneMapped: false })), beam = new THREE.Mesh(new THREE.CylinderGeometry(.03, .06, 2.2, 8, 1, true), basic(col, { opacity: .55 })), ring = new THREE.Mesh(new THREE.TorusGeometry(.25, .025, 6, 28), basic(col)),
      disc = flat(new THREE.CircleGeometry(1, 48), energyMat('#ffc2dd', { hex: 6, rim: 0, base: .1 })), rim = flat(new THREE.RingGeometry(.965, 1, 56), basic('#ffd6ea', { opacity: .85 })), rip = [0, 1].map(() => flat(new THREE.RingGeometry(.94, 1, 48), basic(col, { opacity: .6 }))), halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: K.glowT, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      lens.scale.set(1, .45, 1); lens.position.y = .28; beam.position.y = 1.4; ring.rotation.x = Math.PI / 2; ring.position.y = .28; disc.position.y = .04; rim.position.y = .05; halo.position.y = .3; halo.scale.setScalar(1.6); for (const r of rip) r.position.y = .045;
      g.add(lens, beam, ring, disc, rim, halo, ...rip); g.userData = { lens, beam, ring, disc, rim, rip, halo }; K3.lenses.push(add(g)); }   // (a thin beam over the lens, so it can be found and shot)
    // Glasshouse: the glowing floor inside
    K3.floors = []; for (let i = 0; i < 2; i++) { const m = flat(new THREE.PlaneGeometry(1, 1), energyMat(col, { hex: 8, rim: 0, base: .08, rx: 3, ry: 3 })); K3.floors.push(add(m)); }
    // Bloom: a soft glow inside the glare cloud
    K3.glares = []; for (let i = 0; i < 4; i++) K3.glares.push(add(new THREE.Sprite(new THREE.SpriteMaterial({ map: K.glowT, color: '#ffd0e6', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: .55 }))));
    X.smokeLM = new THREE.MeshLambertMaterial({ color: '#ffd8ea', emissive: '#e07aa8', emissiveIntensity: .7, transparent: true, opacity: .95, depthWrite: false });   // (78-fx dresses a glare cloud in this)
    // previews: a ghost of the curtain, and the Glasshouse's square
    K3.pvLine = add(new THREE.Group()); { const s = new THREE.Mesh(sheet, energyMat('#ffffff', { hex: 4, op: .5, scan: 1, rim: 0, base: .14, rx: 4 })), f = new THREE.Mesh(edgeG, basic('#ffffff', { opacity: .9 })); f.position.y = .04; K3.pvLine.add(s, f); K3.pvLine.userData = { s, f }; }
    K3.pvSquare = add(flat(new THREE.RingGeometry(.97, 1, 4, 1), basic('#ffffff', { opacity: .9, blending: THREE.NormalBlending }))); K3.pvSquare.rotation.z = Math.PI / 4;
  }
  // place a curtain (a group whose +x runs from a to b) on a line
  function setLine(g, ax, az, bx, bz, y, h) { const len = Math.hypot(bx - ax, bz - az); g.position.set(ax, y, az); g.rotation.y = Math.atan2(-(bz - az), bx - ax); return len; }
  // the preview while Lightline or Glasshouse is ready (from the same sums as the ability)
  function previewTessel(P, d, kind, col, pulse) {
    const K3 = X.kf3; if (!K3) return;
    if (kind === 'line') { const g = K3.pvLine, len = setLine(g, d.ax, d.az, d.bx, d.bz, d.y, LINE.h), u = g.userData; g.visible = true; u.s.scale.set(len, LINE.h * (.92 + .08 * pulse), 1); u.f.scale.x = len;
      u.s.material.uniforms.col.value.set(col); u.s.material.uniforms.op.value = .38 + .12 * pulse; u.s.material.uniforms.rep.value.set(len / 2.5, LINE.h / 2.5); u.f.material.color.set(col); }
    else if (kind === 'house') { const m = K3.pvSquare, y = hAt(d.x, d.z); m.visible = true; m.position.set(d.x, y + .05, d.z); m.scale.setScalar(HOUSE.half * Math.SQRT2); m.material.color.set(col); m.material.opacity = .9 * pulse;
      const K = X.kf2; K.pvDisc.visible = true; K.pvDisc.position.set(d.x, y + .04, d.z); K.pvDisc.scale.setScalar(.6); K.pvDisc.material.color.set(col); }
  }
  function hidePreviewTessel() { const K3 = X.kf3; if (K3) K3.pvLine.visible = K3.pvSquare.visible = false; }
  function kitFx3(dt) {
    const K3 = X.kf3, K2 = M.kit; if (!K3 || !K2) return;
    // Lightlines (a Glasshouse's walls among them)
    const Ls = K2.lines || [];
    for (let i = 0; i < K3.lines.length; i++) { const g = K3.lines[i], L = Ls[i]; g.visible = !!L; if (!L) continue; const u = g.userData, len = setLine(g, L.ax, L.az, L.bx, L.bz, L.y0, 0), H = L.y - L.y0 + (L.y1 - L.y) * L.rise, fade = Math.min(1, L.t / .5), hot = (L.pulseT || 0) > X.t ? (L.pulseT - X.t) / .5 : 0;
      u.s.scale.set(len, Math.max(.01, H), 1); u.top.position.y = H; u.top.scale.x = u.foot.scale.x = len; u.foot.position.y = L.y - L.y0 + .03;
      u.body.material.opacity = fade; u.lat.material.uniforms.op.value = fade; u.lat.material.uniforms.pulse.value = hot * .6; u.lat.material.uniforms.rep.value.set(len / 2.5, H / 2.5); u.top.material.opacity = u.foot.material.opacity = fade; }
    // Lull lenses
    const Zs = K2.lenses || [];
    for (let i = 0; i < K3.lenses.length; i++) { const g = K3.lenses[i], Z = Zs[i]; g.visible = !!Z; if (!Z) continue; const u = g.userData, k = Math.min(1, (Z.T - Z.t) / .3) * Math.min(1, Z.t / .5);
      g.position.set(Z.x, Z.y, Z.z); u.disc.scale.setScalar(Z.r * k); u.rim.scale.setScalar(Z.r * k); u.disc.material.uniforms.op.value = .8 * k; u.rim.material.opacity = .8 * k; u.ring.rotation.z = X.t * 1.5; u.lens.rotation.y = X.t * .8; u.halo.material.opacity = .6 + .25 * Math.sin(X.t * 3); u.beam.material.opacity = (.4 + .15 * Math.sin(X.t * 4)) * k;
      for (let j = 0; j < 2; j++) { const q = ((X.t * .55 + j * .5) % 1), r = u.rip[j]; r.scale.setScalar(Math.max(.05, Z.r * k * (1 - q))); r.material.opacity = .55 * k * Math.sin(q * Math.PI); } }   // (the ripples run in: everything here slows to the lens)
    // the Glasshouse's floor
    const Hs = K2.houses || [];
    for (let i = 0; i < K3.floors.length; i++) { const m = K3.floors[i], H = Hs[i]; m.visible = !!H; if (!H) continue; const k = Math.min(1, (H.T - H.t) / .4) * Math.min(1, H.t / .5); m.position.set(H.x, H.y + .04, H.z); m.scale.set(H.half * 2, H.half * 2, 1); m.material.uniforms.op.value = .55 * k; }
    // Bloom's glow, inside each glare cloud
    let n = 0; for (const s of M.smokes) { if (!s.glare || n >= K3.glares.length) continue; const sp = K3.glares[n++]; sp.visible = true; sp.position.set(s.x, s.y + 1.4, s.z); sp.scale.setScalar(s.r * 2.6); sp.material.opacity = .5 + .1 * Math.sin(X.t * 2 + n); }
    for (; n < K3.glares.length; n++) K3.glares[n].visible = false;
  }
  function hideKitFx3() { const K3 = X && X.kf3; if (!K3) return; for (const k of ['lines', 'lenses', 'floors', 'glares']) for (const m of K3[k]) m.visible = false; hidePreviewTessel(); }
  // the moments
  const fx3 = () => X && ready && X.kf3 && M;
  on('lightline', L => { if (!fx3()) return; const c = OPS.tessel.col; burst('ring', L.ax, L.y, L.az, c, 1.6, .45); burst('ring', L.bx, L.y, L.bz, c, 1.6, .45);
    for (let i = 0; i < 16; i++) { const q = i / 15; spark([lp(L.ax, L.bx, q), L.y + .1, lp(L.az, L.bz, q)], [rnd(-.4, .4), rnd(2, 5), rnd(-.4, .4)], i % 2 ? '#ffffff' : c, .6); } });
  on('glasshouse', H => { if (!fx3()) return; const c = OPS.tessel.col; burst('shell', H.x, H.y + 1, H.z, c, H.half * 1.3, .6); burst('ring', H.x, H.y, H.z, '#ffffff', H.half * 1.5, .7); X.shake = Math.max(X.shake || 0, .2); });
  on('bloomPop', s => { if (!fx3()) return; burst('shell', s.x, s.y + 1.3, s.z, '#ffe0ee', 3.6, .4); burst('ring', s.x, s.y, s.z, OPS.tessel.col, 4, .5); X.flashL.position.set(s.x, s.y + 1.4, s.z); X.flashL.intensity = 10;
    for (let i = 0; i < 18; i++) spark([s.x, s.y + 1.3, s.z], [rnd(-5, 5), rnd(-1, 5), rnd(-5, 5)], i % 3 ? '#fff4fa' : OPS.tessel.col, .5); });
  on('lullStart', Z => { if (!fx3()) return; burst('ring', Z.x, Z.y, Z.z, OPS.tessel.col, Z.r, .5); burst('shell', Z.x, Z.y + .3, Z.z, '#ffd6ea', 1.2, .35); });
  on('lensBreak', Z => { if (!fx3()) return; burst('shell', Z.x, Z.y + .3, Z.z, '#ffffff', 1.4, .3); for (let i = 0; i < 22; i++) spark([Z.x, Z.y + .3, Z.z], [rnd(-4, 4), rnd(1, 5), rnd(-4, 4)], i % 2 ? '#ffffff' : OPS.tessel.col, .5); });
  on('lit', (L, v) => { L.pulseT = X ? X.t + .5 : 0; if (!fx3()) return; burst('shell', v.x, v.y + 1.1, v.z, OPS.tessel.col, 1.3, .45); burst('ring', v.x, v.y, v.z, '#ffffff', 1.4, .4); });
  // a bullet through a Lightline: a spray of light where it passed
  const SH3 = [0, 0, 0];
  on('shot', (f, S) => { if (!fx3() || !S || !M.kit || !M.kit.lines || !M.kit.lines.length) return; const t = lineT(S.o, S.d, S.dist); if (t >= S.dist) return;
    SH3[0] = S.o[0] + S.d[0] * t; SH3[1] = S.o[1] + S.d[1] * t; SH3[2] = S.o[2] + S.d[2] * t; for (let i = 0; i < 3; i++) spark(SH3, [rnd(-1, 1), rnd(-.5, 1.5), rnd(-1, 1)], i ? OPS.tessel.col : '#ffffff', .3); });
