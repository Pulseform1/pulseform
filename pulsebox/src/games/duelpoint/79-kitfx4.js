  /* ---------- 79 kit effects, fourth part: holding a site (48) ----------
     SENTRY: the arc it guards lies faint on the floor for everyone (blue sweeping, amber locking on, red firing; 79-kitfx
     colours its eye the same). TRIPWIRE: two anchors and a hot wire at shin height; rivals see it within 10 m. SLOW FIELD
     canister: a squat can with a blinking light (rivals see it within 12 m; its own side also sees the ring it watches).
     RAMPART: a health bar along its top. WARD BEACON: a tall amber light anyone can see, and its reach on the floor for
     its own side. SNARE, sprung: the leash from the trap to whoever it holds.
     Everything is pooled and made once (buildKitFx4, from buildKitFx3) so nothing compiles mid-round; nothing is made in a
     frame. */
  function buildKitFx4() {
    const K = X.kf2, add = o => { X.scene.add(o); o.visible = false; return o; };
    const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }, o || {}));
    const lit = c => new THREE.MeshLambertMaterial({ color: LC(c) }), flat = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; return m; };
    const sprite = (c, s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: K.glowT, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); sp.scale.setScalar(s); return sp; };
    const ax = OPS.axiom.col, bs = OPS.bastion.col, devM = lit('#2a2e36');
    const K4 = X.kf4 = { up: new THREE.Vector3(0, 1, 0), v: new THREE.Vector3(), c: { idle: new THREE.Color(ax), lock: new THREE.Color('#ffb347'), fire: new THREE.Color('#ff5a4d'), bar: new THREE.Color(bs), mended: new THREE.Color('#fff0c8'), low: new THREE.Color('#ff7a4a') } };
    // the Sentry's arc: a faint fan with a brighter rim, 3.5 m out (it guards 22 m; this only shows which way)
    K4.arcs = []; for (let i = 0; i < 4; i++) { const g = new THREE.Group(), th0 = Math.PI / 2 - SENTRY.arc, th = SENTRY.arc * 2, fan = flat(new THREE.CircleGeometry(3.5, 20, th0, th), basic(ax, { opacity: .1 })), rim = flat(new THREE.RingGeometry(3.36, 3.5, 20, 1, th0, th), basic(ax, { opacity: .45 }));
      fan.position.y = .03; rim.position.y = .035; g.add(fan, rim); g.userData = { fan, rim }; K4.arcs.push(add(g)); }
    // the Tripwire: a group whose +x runs from one anchor to the other
    K4.wires = []; for (let i = 0; i < 3; i++) { const g = new THREE.Group(), wire = new THREE.Mesh(new THREE.BoxGeometry(1, .022, .022), basic('#ff5a2a', { opacity: .9, blending: THREE.NormalBlending })); wire.geometry.translate(.5, 0, 0); wire.position.y = WIRE.h;   // (normal blending: it stays red on a pale floor)
      const anc = [0, 1].map(() => { const a = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(.1, .18, .1), devM), lamp = sprite('#ff7a4a', .28); b.position.y = WIRE.h; lamp.position.y = WIRE.h + .12; a.add(b, lamp); g.add(a); a.userData = { lamp }; return a; });
      g.add(wire); g.userData = { wire, anc }; K4.wires.push(add(g)); }
    // the Slow Field canister
    K4.cans = []; for (let i = 0; i < 3; i++) { const g = new THREE.Group(), body = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, .3, 10), lit('#3a4250')), band = new THREE.Mesh(new THREE.TorusGeometry(.112, .016, 6, 16), basic(ax)), lamp = sprite(ax, .4), ring = flat(new THREE.RingGeometry(.95, 1, 40), basic(ax, { opacity: .35 }));
      body.position.y = .15; band.rotation.x = Math.PI / 2; band.position.y = .22; lamp.position.y = .36; ring.position.y = .03; ring.scale.setScalar(CAN.trip); g.add(body, band, lamp, ring); g.userData = { lamp, ring }; K4.cans.push(add(g)); }
    // the Ward Beacon
    K4.beacons = []; for (let i = 0; i < 3; i++) { const g = new THREE.Group(), base = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, .18, 10), lit('#3c3428')), core = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), basic('#ffe2b0', { blending: THREE.NormalBlending, transparent: false })),
      beam = new THREE.Mesh(new THREE.CylinderGeometry(.05, .12, 2.6, 10, 1, true), basic(bs, { opacity: .45 })), halo = sprite(bs, 1.1), reach = flat(new THREE.RingGeometry(.97, 1, 48), basic(bs, { opacity: .3 }));
      base.position.y = .09; core.position.y = .3; beam.position.y = 1.6; halo.position.y = .35; reach.position.y = .03; reach.scale.setScalar(BEACON.r); g.add(base, core, beam, halo, reach); g.userData = { beam, halo, reach, core }; K4.beacons.push(add(g)); }
    // a Rampart's health: a dark bar along its top, filled in amber from one end
    K4.bars = []; for (let i = 0; i < 4; i++) { const g = new THREE.Group(), back = new THREE.Mesh(new THREE.BoxGeometry(1, .16, .1), new THREE.MeshBasicMaterial({ color: '#14100a', transparent: true, opacity: .75, depthWrite: false, toneMapped: false })), fill = new THREE.Mesh(new THREE.BoxGeometry(1, .18, .12), basic(bs, { opacity: .95, blending: THREE.NormalBlending }));
      fill.geometry.translate(.5, 0, 0); g.add(back, fill); g.userData = { back, fill }; K4.bars.push(add(g)); }
    // a sprung Snare's leash
    K4.leashes = []; for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1, 6, 1, true), basic(OPS.talon.col, { opacity: .85 })); m.geometry.translate(0, .5, 0); K4.leashes.push(add(m)); }
  }
  // a rival sees one of these only from near enough; its own side always
  const seen4 = (o, P, x, z, r) => o.by.team === P.team || Math.hypot(x - P.x, z - P.z) < r;
  function kitFx4(dt) {
    const K4 = X.kf4, K2 = M.kit, P = me(); if (!K4 || !K2 || !P) return; const C = K4.c; let n = 0;
    for (const s of K2.sentries) { if (n >= K4.arcs.length) break; const g = K4.arcs[n++], u = g.userData, c = s.target ? (s.lockT > 0 ? C.lock : C.fire) : C.idle, hot = s.target ? 1 : .4;
      g.visible = true; g.position.set(s.x, s.y, s.z); g.rotation.y = s.yaw; u.fan.material.color.copy(c); u.rim.material.color.copy(c); u.fan.material.opacity = .05 + .06 * hot; u.rim.material.opacity = .2 + .35 * hot * (s.target && s.lockT > 0 ? .6 + .4 * Math.sin(X.t * 30) : 1); }
    for (; n < K4.arcs.length; n++) K4.arcs[n].visible = false;
    n = 0; for (const W of K2.wires) { if (n >= K4.wires.length) break; const mine = W.by.team === P.team;
      if (!mine && !(Math.hypot(W.ax - P.x, W.az - P.z) < WIRE.see || Math.hypot(W.bx - P.x, W.bz - P.z) < WIRE.see || Math.hypot(W.x - P.x, W.z - P.z) < WIRE.see)) continue;
      const g = K4.wires[n++], u = g.userData, len = Math.hypot(W.bx - W.ax, W.bz - W.az), hot = W.fuse >= 0, arming = W.arm > 0;
      g.visible = true; g.position.set(W.ax, W.y, W.az); g.rotation.y = Math.atan2(-(W.bz - W.az), W.bx - W.ax); u.wire.scale.x = len; u.anc[1].position.x = len;
      u.wire.material.opacity = hot ? .6 + .4 * Math.sin(X.t * 40) : arming ? .15 + .15 * Math.sin(X.t * 8) : mine ? .75 : .3 + .2 * Math.sin(X.t * 5 + W.x);
      for (const a of u.anc) a.userData.lamp.material.opacity = hot || Math.sin(X.t * (arming ? 10 : 3)) > 0 ? .9 : .3; }
    for (; n < K4.wires.length; n++) K4.wires[n].visible = false;
    n = 0; for (const Cn of K2.cans) { if (n >= K4.cans.length) break; if (!seen4(Cn, P, Cn.x, Cn.z, CAN.see)) continue; const g = K4.cans[n++], u = g.userData;
      g.visible = true; g.position.set(Cn.x, Cn.y, Cn.z); u.lamp.material.opacity = Math.sin(X.t * (Cn.arm > 0 ? 14 : 4)) > 0 ? .95 : .2; u.ring.visible = Cn.by.team === P.team; u.ring.material.opacity = .2 + .15 * Math.sin(X.t * 3); }
    for (; n < K4.cans.length; n++) K4.cans[n].visible = false;
    n = 0; for (const B of K2.beacons) { if (n >= K4.beacons.length) break; const g = K4.beacons[n++], u = g.userData, live = M.phase === 'live', k = live ? Math.min(1, B.t / 1) : .6;
      g.visible = true; g.position.set(B.x, B.y, B.z); u.beam.material.opacity = (.3 + .15 * Math.sin(X.t * 3)) * k + (B.flash > 0 ? .4 : 0); u.halo.material.opacity = (.6 + .3 * Math.sin(X.t * 5)) * k; u.reach.visible = B.by.team === P.team; u.reach.material.opacity = .15 + .2 * Math.max(0, 1 - (B.tick || 0) / BEACON.every * 4); }
    for (; n < K4.beacons.length; n++) K4.beacons[n].visible = false;
    n = 0; for (const w of M.walls) { if (w.hp == null || n >= K4.bars.length) continue; const g = K4.bars[n++], u = g.userData, along = w.x1 - w.x0 < 1, L = along ? w.z1 - w.z0 : w.x1 - w.x0, q = Math.max(0, w.hp / w.max);
      g.visible = w.grow > .2; g.position.set((w.x0 + w.x1) / 2, 3 * w.grow + .3, (w.z0 + w.z1) / 2); g.rotation.y = along ? Math.PI / 2 : 0; u.back.scale.x = L; u.fill.position.x = -L / 2; u.fill.scale.x = Math.max(.001, L * q);
      u.fill.material.color.copy(w.re ? C.mended : q < .3 ? C.low : C.bar); u.fill.material.opacity = w.hitT > 0 ? 1 : .85; }
    for (; n < K4.bars.length; n++) K4.bars[n].visible = false;
    n = 0; for (const s of K2.snares) { if (!s.sprung || n >= K4.leashes.length) continue; const v = M.byKey[s.sprung]; if (!v || !v.alive) continue; const m = K4.leashes[n++], vx = ipos(v, 'x') - s.x, vy = ipos(v, 'y') + .9 - s.y - .12, vz = ipos(v, 'z') - s.z, L = Math.hypot(vx, vy, vz) || 1;
      m.visible = true; m.position.set(s.x, s.y + .12, s.z); K4.v.set(vx / L, vy / L, vz / L); m.quaternion.setFromUnitVectors(K4.up, K4.v); m.scale.set(1, L, 1); m.material.opacity = .6 + .3 * Math.sin(X.t * 12); }
    for (; n < K4.leashes.length; n++) K4.leashes[n].visible = false;
  }
  function hideKitFx4() { const K4 = X && X.kf4; if (!K4) return; for (const k of ['arcs', 'wires', 'cans', 'beacons', 'bars', 'leashes']) for (const m of K4[k]) m.visible = false; }
  // the moments
  const fx4 = () => X && ready && X.kf4 && M;
  on('beaconPulse', B => { if (fx4()) { burst('ring', B.x, B.y, B.z, OPS.bastion.col, BEACON.r, .6); B.flash = .3; } });
  on('beaconPop', B => { if (fx4()) { burst('ring', B.x, B.y, B.z, '#ffffff', BEACON.r, .7); burst('pillar', B.x, B.y, B.z, OPS.bastion.col, .6, .6, 3); B.flash = .5; } });
  on('beaconHit', B => { if (fx4()) for (let i = 0; i < 5; i++) spark([B.x, B.y + .4, B.z], [rnd(-2, 2), rnd(0, 3), rnd(-2, 2)], OPS.bastion.col, .3); });
  on('beaconDown', B => { if (fx4()) for (let i = 0; i < 16; i++) spark([B.x, B.y + .5, B.z], [rnd(-3, 3), rnd(0, 4), rnd(-3, 3)], OPS.bastion.col, .5); });
  on('sentryLock', s => { if (fx4()) burst('ring', s.x, s.y + .02, s.z, '#ffb347', 1.2, .35); });
  on('wallHit', w => { if (!fx4()) return; const cx = (w.x0 + w.x1) / 2, cz = (w.z0 + w.z1) / 2; spark([cx + rnd(-1, 1) * (w.x1 - w.x0) / 2, rnd(.5, 2.5), cz + rnd(-1, 1) * (w.z1 - w.z0) / 2], [rnd(-2, 2), rnd(0, 2), rnd(-2, 2)], OPS.bastion.col, .3); });
  on('wallBreak', w => { if (!fx4()) return; const cx = (w.x0 + w.x1) / 2, cz = (w.z0 + w.z1) / 2; for (let i = 0; i < 26; i++) spark([cx + rnd(-1, 1) * (w.x1 - w.x0) / 2, rnd(.2, 2.8), cz + rnd(-1, 1) * (w.z1 - w.z0) / 2], [rnd(-3, 3), rnd(0, 4), rnd(-3, 3)], i % 2 ? OPS.bastion.col : '#c8b8a0', .6); X.shake = Math.max(X.shake || 0, .15); });
  on('wallMend', w => { if (fx4()) burst('shell', (w.x0 + w.x1) / 2, 1.5, (w.z0 + w.z1) / 2, OPS.bastion.col, 3.2, .5); });
  on('kitBreak', (o, kind) => { if (!fx4()) return; const x = kind === 'wire' ? o.ax : o.x, z = kind === 'wire' ? o.az : o.z, y = (o.y || 0) + (kind === 'wire' ? WIRE.h : .3), c = kind === 'dev' ? OPS.tessel.col : kind === 'snare' ? OPS.talon.col : OPS.axiom.col;
    for (let i = 0; i < 14; i++) spark([x, y, z], [rnd(-3, 3), rnd(.5, 4), rnd(-3, 3)], i % 2 ? '#ffffff' : c, .45); });
  on('kitPick', (f, D) => { if (fx4()) burst('ring', D.x != null ? D.x : D.ax, (D.y || 0) + .02, D.z != null ? D.z : D.az, (OPS[f.op] || OPS.vex).col, 1, .4); });
  on('canSet', Cn => { if (fx4()) burst('ring', Cn.x, Cn.y + .02, Cn.z, OPS.axiom.col, .8, .4); });
