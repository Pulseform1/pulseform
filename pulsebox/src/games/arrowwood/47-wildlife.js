  /* ---------- 47 wildlife: birds flitting over the wood, and now and then a deer ----------
     All for the look and feel of the place: nobody can shoot them (arrows go straight through), they never block anyone,
     and each player sees their own. Little birds fly in small flocks over the treetops, and now and then one swoops down
     past you. Deer are a rare sight: every minute or two one (sometimes a pair) turns up out of view, grazes in a clearing
     or bounds across in front of you, and is gone again. Come close and they bolt. */
  const WILD = { flocks: [], birds: [], deer: [], swoopT: 8, deerT: 35 + Math.random() * 30, visits: 0 };
  // a part for a merged model: a geometry moved into place and painted one colour
  function part(geo, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)));
    const c = LC(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo;
  }
  const sph = (w, h) => new THREE.SphereGeometry(1, w || 14, h || 10);
  function buildWildlife() {
    if (WILD.built) return; WILD.built = true; const low = X.q === 'low';
    Object.assign(WM, { M: new THREE.Matrix4(), W: new THREE.Matrix4(), L: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), one: new THREE.Vector3(1, 1, 1), mir: new THREE.Matrix4().makeScale(-1, 1, 1) });
    // ---- birds: every bird in the sky is one instance of three meshes (body, pale belly and beak, wings), three draw calls in all
    const BIRD = [['#6b4f3a', '#e9dcc4'], ['#3f5a7a', '#dfe7ef'], ['#b4523a', '#f1d9b8'], ['#e2b93b', '#f5ecc8'], ['#4d4d4d', '#d9d9d9']];
    const nFlock = low ? 2 : 4, per = low ? 4 : 5, nB = nFlock * per;
    const bodyG = merge([part(sph(8, 6), '#ffffff', 0, 0, 0, 0, 0, 0, .085, .072, .13), part(sph(8, 6), '#ffffff', 0, .05, -.13, 0, 0, 0, .058, .058, .058), part(sph(6, 4), '#ffffff', 0, .015, .17, -.15, 0, 0, .04, .008, .075)]);
    const paleG = merge([part(sph(8, 6), '#ffffff', 0, -.03, -.01, 0, 0, 0, .063, .049, .091), part(new THREE.ConeGeometry(.017, .055, 5), '#f0b040', 0, .045, -.19, -Math.PI / 2)]);
    const wingG = part(sph(6, 4), '#ffffff', .12, 0, 0, 0, 0, 0, .12, .008, .055);
    const bm = new THREE.MeshLambertMaterial({ vertexColors: true }), wm = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const mk = (g, m, n) => { const im = new THREE.InstancedMesh(g, m, n); im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); X.scene.add(im); return im; };
    WILD.im = { body: mk(bodyG, bm, nB), pale: mk(paleG, bm, nB), wing: mk(wingG, wm, nB * 2) };
    for (let f = 0; f < nFlock; f++) {
      const F = { a: .021 + f * .006, b: .017 + f * .005, p: f * 2.1, q: f * 1.3, h: 15 + f * 2.5, birds: [] };
      for (let k = 0; k < per; k++) {
        const n = WILD.birds.length, [c1, c2] = BIRD[n % BIRD.length], B = { n, off: [(Math.random() - .5) * 5, (Math.random() - .5) * 1.5, (Math.random() - .5) * 5], ph: Math.random() * TAU, p: new THREE.Vector3(), ry: 0, rx: 0 };
        WILD.im.body.setColorAt(n, LC(c1)); WILD.im.pale.setColorAt(n, LC(c2)); WILD.im.wing.setColorAt(n * 2, LC(c1)); WILD.im.wing.setColorAt(n * 2 + 1, LC(c1));
        F.birds.push(B); WILD.birds.push(B);
      }
      WILD.flocks.push(F);
    }
    for (const im of Object.values(WILD.im)) im.instanceColor.needsUpdate = true;
    // ---- deer: smooth and rounded, a body of overlapping ellipsoids, a long tapering neck, a soft head with big ears, slim
    // legs that bend at the knee. Each moving part is one merged mesh with its colours painted in (about a dozen per deer).
    const mkDeer = buck => {
      const coatM = new THREE.MeshLambertMaterial({ vertexColors: true }), coat = buck ? '#8a5a2e' : '#a5713f', pale = '#efe5d3', dark = '#2b1e15', g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const torso = new THREE.Mesh(merge([
        part(sph(), coat, 0, 1.0, 0, 0, 0, 0, .245, .28, .52),          // the barrel
        part(sph(), coat, 0, 1.02, -.34, 0, 0, 0, .22, .28, .27),      // chest and shoulders
        part(sph(), coat, 0, 1.04, .36, 0, 0, 0, .235, .27, .27),      // haunches
        part(sph(), pale, 0, .84, -.02, 0, 0, 0, .19, .11, .43),      // the pale belly
        part(sph(), pale, 0, 1.05, .56, 0, 0, 0, .14, .16, .07),      // the white rump patch
      ]), coatM); torso.castShadow = true; body.add(torso);
      // the neck swings down to graze from the base of the chest; the head nods on its own at the top
      const neck = new THREE.Group(); neck.position.set(0, 1.0, -.42); body.add(neck);
      const nl = .62, nd = new THREE.Vector3(0, Math.cos(.5), -Math.sin(.5));
      neck.add(new THREE.Mesh(merge([
        part(new THREE.CylinderGeometry(.075, .13, nl, 12, 1, true), coat, 0, nd.y * nl / 2, nd.z * nl / 2, -.5),
        part(sph(10, 8), pale, 0, nd.y * nl * .62, nd.z * nl * .62 - .04, -.5, 0, 0, .06, .1, .05),   // the pale throat
      ]), coatM));
      const head = new THREE.Group(); head.position.set(0, nd.y * nl, nd.z * nl); neck.add(head);
      const hp = [
        part(sph(), coat, 0, .02, -.06, -.2, 0, 0, .095, .095, .15),                                   // skull
        part(new THREE.CylinderGeometry(.045, .072, .18, 10), coat, 0, -.03, -.2, -Math.PI / 2 - .25),   // the tapering muzzle
        part(sph(8, 6), dark, 0, -.055, -.29, 0, 0, 0, .034, .028, .025),                              // nose
        part(sph(8, 6), pale, 0, -.08, -.22, 0, 0, 0, .05, .025, .06),                                 // chin
      ];
      for (const sx of [-1, 1]) {
        hp.push(part(sph(10, 6), coat, sx * .085, .12, .02, 0, 0, sx * -.75, .04, .1, .02));          // big soft ears
        hp.push(part(sph(8, 6), pale, sx * .087, .118, .008, 0, 0, sx * -.75, .026, .07, .012));
        hp.push(part(sph(8, 6), dark, sx * .072, .045, -.1, 0, 0, 0, .021, .021, .021));               // eyes
        if (buck) {   // antlers: a curving beam with three tines
          const ac = '#d8c7a4';
          hp.push(part(new THREE.CylinderGeometry(.014, .024, .3, 6), ac, sx * .08, .2, .0, -.25, 0, sx * -.5));
          hp.push(part(new THREE.CylinderGeometry(.012, .018, .26, 6), ac, sx * .17, .38, -.06, -.55, 0, sx * -.15));
          for (let t = 0; t < 3; t++) hp.push(part(new THREE.CylinderGeometry(.007, .013, .13, 5), ac, sx * (.13 + t * .025), .3 + t * .07, -.1 - t * .03, -1.0, 0, sx * .2));
        }
      }
      head.add(new THREE.Mesh(merge(hp), coatM));
      const tail = new THREE.Group(); tail.position.set(0, 1.15, .6); body.add(tail);
      tail.add(new THREE.Mesh(merge([part(sph(10, 8), coat, 0, -.06, .02, .3, 0, 0, .05, .1, .035), part(sph(10, 8), pale, 0, -.07, .045, .3, 0, 0, .042, .085, .02)]), coatM));
      // legs: a muscled upper leg, a slim shin and a small dark hoof
      const legs = [[-.11, -.34, 1], [.11, -.34, 1], [-.12, .38, 0], [.12, .38, 0]].map(([lx, lz, front]) => {
        const hip = new THREE.Group(); hip.position.set(lx, .93, lz); body.add(hip);
        hip.add(new THREE.Mesh(part(new THREE.CylinderGeometry(front ? .075 : .1, .045, .46, 10), coat, 0, -.23, front ? 0 : .02), coatM));
        const knee = new THREE.Group(); knee.position.y = -.46; hip.add(knee);
        knee.add(new THREE.Mesh(merge([part(new THREE.CylinderGeometry(.036, .027, .42, 8), coat, 0, -.21, 0), part(sph(8, 6), coat, 0, 0, 0, 0, 0, 0, .042, .045, .042), part(new THREE.CylinderGeometry(.022, .034, .06, 8), dark, 0, -.44, -.005)]), coatM));
        return { hip, knee, front };
      });
      g.scale.setScalar(buck ? 1.06 : .94); g.visible = false; X.scene.add(g);
      return { g, body, neck, head, tail, legs, buck, on: false, mat: coatM, fade: 1 };
    };
    WILD.deer = [mkDeer(false), mkDeer(true)];
  }
  const groundOf = (x, z) => W.groundAt(x, z, W.terrainH(x, z) + 2);
  const wildOpen = (ax, az, bx, bz, rad = 1.2) => { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5); for (let i = 1; i <= n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; if (x < 8 || z < 8 || x > 132 || z > 132 || W.blocked(x, groundOf(x, z) + .3, z, rad)) return false; } return true; };
  // can the camera see this spot? (roughly: inside the view cone and not too far into the haze)
  const inView = (x, z, cam, fw, far = 75) => { const dx = x - cam.x, dz = z - cam.z, d = Math.hypot(dx, dz); if (d > far) return false; if (d < 3) return true; const fl = Math.hypot(fw.x, fw.z) || 1; return (dx * fw.x + dz * fw.z) / (d * fl) > Math.cos(.95); };
  // a deer visit: one deer (now and then a pair) turns up, then either grazes in a clearing near you for a while or bounds
  // across your path, and leaves again. They arrive out of sight where they can; where they can't (the clearing is in
  // view), they step out of the trees at its far edge, fading in from the haze, never popping up in plain sight.
  function deerVisit(cam, fw) {
    const fl = Math.hypot(fw.x, fw.z) || 1, fx = fw.x / fl, fz = fw.z / fl, rx = -fz, rz = fx, pair = Math.random() < .3;
    const free = (x, z) => x > 10 && z > 10 && x < 130 && z < 130 && !W.blocked(x, groundOf(x, z) + .3, z, 1) && W.creekDist(x, z) > W.CREEK_W + 1;
    let plan = null;
    if (Math.random() < .5) {   // bounding across in front of you: in from one side, out the other
      search: for (const ahead of [14, 19, 25]) for (const side of Math.random() < .5 ? [1, -1] : [-1, 1]) {
        const ax = cam.x + rx * side * 30 + fx * ahead * .8, az = cam.z + rz * side * 30 + fz * ahead * .8, mx = cam.x + fx * ahead, mz = cam.z + fz * ahead, ex = cam.x - rx * side * 32 + fx * ahead, ez = cam.z - rz * side * 32 + fz * ahead;
        if (free(ax, az) && wildOpen(ax, az, mx, mz, .8) && wildOpen(mx, mz, ex, ez, .8)) { plan = { st: 'flee', at: [ax, az], path: [[mx, mz], [ex, ez]] }; break search; }
      }
    }
    if (!plan) {   // grazing in a clearing near you: out of sight if one is, else at the far edge of one you can see
      const ms = W.MEADOWS.map(m => ({ m, d: Math.hypot(m.x - cam.x, m.z - cam.z) })).filter(o => o.d > 16 && o.d < 70).sort(() => Math.random() - .5);
      for (const pass of [0, 1]) { for (const { m } of ms) {
        const ax = m.x - cam.x, az = m.z - cam.z, L = Math.hypot(ax, az) || 1;
        for (let k = 0; k < 6; k++) {
          const a = Math.atan2(az, ax) + (Math.random() - .5) * 1.6, r = m.r * (.45 + Math.random() * .35), x = m.x + Math.cos(a) * r, z = m.z + Math.sin(a) * r, d = Math.hypot(x - cam.x, z - cam.z), seen = inView(x, z, cam, fw);
          if (free(x, z) && (pass ? d > 26 : !seen)) { plan = { st: 'graze', at: [x, z], home: m }; break; }
        }
        if (plan) break; } if (plan) break; }
    }
    if (!plan) return false;
    WILD.deer.forEach((D, i) => {
      if (i === 1 && !pair) return; const off = i ? 1.8 : 0, x = plan.at[0] + off, z = plan.at[1] + off * .6;
      Object.assign(D, { on: true, x, z, y: groundOf(x, z), yaw: Math.atan2(x - cam.x, z - cam.z), st: plan.st, t: 2 + Math.random() * 4, gait: i * 1.3, cool: 0, s: 0, life: 30 + Math.random() * 20,
        home: plan.home || { x, z, r: 6 }, goal: null, path: plan.path ? plan.path.map(([px, pz]) => [px + off, pz + off * .6]) : null, leaving: false, done: false, fade: inView(x, z, cam, fw) ? 0 : 1, fadeDir: 1 });
      D.g.visible = true;
    });
    WILD.visits++; return true;
  }
  // fading a deer: its own material goes see-through for the moment it takes
  const setFade = D => { const m = D.mat, f = Math.max(0, Math.min(1, D.fade)), tr = f < .999; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = f; m.depthWrite = !tr || f > .5; };
  const WM = {};   // scratch matrices, made once three.js has loaded
  function updateWildlife(dt) {
    if (!WILD.built) return; const cam = X.camera.position, t = X.t, fw = X.camera.getWorldDirection(new THREE.Vector3());
    // ---- birds: each flock drifts over the wood on its own loop; the birds weave round its middle, wings beating
    const im = WILD.im, _M = WM.M, _W = WM.W, _L = WM.L;
    for (const F of WILD.flocks) {
      const cx = 70 + 46 * Math.sin(t * F.a + F.p), cz = 70 + 46 * Math.sin(t * F.b + F.q), cy = W.terrainH(cx, cz) + F.h + 2 * Math.sin(t * .3 + F.p);
      for (const B of F.birds) {
        const P = B.p, px = P.x, py = P.y, pz = P.z;
        if (B.swoop) {   // diving down past you and up again
          const S = B.swoop; S.t += dt / S.T; const u = Math.min(1, S.t), a = S.a, m = S.m, e = S.e, q = 1 - u;
          P.set(q * q * a.x + 2 * q * u * m.x + u * u * e.x, q * q * a.y + 2 * q * u * m.y + u * u * e.y, q * q * a.z + 2 * q * u * m.z + u * u * e.z); if (u >= 1) B.swoop = null;
        } else {
          const tx = cx + B.off[0] + Math.sin(t * 1.3 + B.ph) * 1.6, ty = cy + B.off[1] + Math.sin(t * 2.1 + B.ph) * .5, tz = cz + B.off[2] + Math.cos(t * 1.1 + B.ph) * 1.6;
          if (!B.init) { P.set(tx, ty, tz); B.init = true; } else { const k = Math.min(1, dt * 1.6); P.set(px + (tx - px) * k, py + (ty - py) * k, pz + (tz - pz) * k); }
        }
        const vx = P.x - px, vy = P.y - py, vz = P.z - pz; if (vx * vx + vy * vy + vz * vz > 1e-6) { B.ry = Math.atan2(-vx, -vz); B.rx = Math.max(-.6, Math.min(.6, Math.atan2(vy, Math.hypot(vx, vz)) * .8)); }
        _M.compose(P, WM.q.setFromEuler(WM.e.set(B.rx, B.ry, 0, 'YXZ')), WM.one); im.body.setMatrixAt(B.n, _M); im.pale.setMatrixAt(B.n, _M);
        const glide = B.swoop && B.swoop.t > .35 && B.swoop.t < .65, fl = glide ? .15 : Math.sin(t * 22 + B.ph) * .9;
        _L.makeRotationZ(fl).setPosition(0, .035, 0); _W.multiplyMatrices(_M, _L); im.wing.setMatrixAt(B.n * 2, _W);
        _L.makeRotationZ(-fl).setPosition(0, .035, 0); _L.multiply(WM.mir); _W.multiplyMatrices(_M, _L); im.wing.setMatrixAt(B.n * 2 + 1, _W);
      }
    }
    im.body.instanceMatrix.needsUpdate = im.pale.instanceMatrix.needsUpdate = im.wing.instanceMatrix.needsUpdate = true;
    WILD.swoopT -= dt; if (WILD.swoopT <= 0 && WILD.flocks.length) {   // now and then one swoops down past you
      WILD.swoopT = 10 + Math.random() * 14; const B = WILD.flocks[Math.floor(Math.random() * WILD.flocks.length)].birds[0];
      if (B && !B.swoop) { const side = Math.random() < .5 ? -1 : 1, rx = -fw.z * side, rz = fw.x * side, a = B.p.clone();
        const m = new THREE.Vector3(cam.x + fw.x * 7 + rx * 2, cam.y + .6, cam.z + fw.z * 7 + rz * 2), e = new THREE.Vector3(cam.x + fw.x * 8 + rx * 26, cam.y + 14, cam.z + fw.z * 8 + rz * 26);
        B.swoop = { a, m, e, t: 0, T: 3.2 }; }
    }
    // ---- deer: a rare visit every minute or two, and only while you're in the wood
    const out = WILD.deer.filter(D => D.on);
    if (!out.length) { WILD.deerT -= dt; if (WILD.deerT <= 0) WILD.deerT = deerVisit(cam, fw) ? 70 + Math.random() * 70 : 8; }
    for (const D of out) {
      const dMe = Math.hypot(D.x - cam.x, D.z - cam.z), vis = inView(D.x, D.z, cam, fw); D.cool -= dt; D.life -= dt; if (vis) D.seen = true;
      if ((D.st === 'graze' || D.st === 'walk') && dMe < 14 && D.cool <= 0) {   // startled: bound off, cutting across in front of you
        const fl = Math.hypot(fw.x, fw.z) || 1, fx = fw.x / fl, fz = fw.z / fl, rx = -fz, rz = fx; let path = null;
        for (const side of Math.random() < .5 ? [1, -1] : [-1, 1]) {
          const mx = cam.x + fx * 8 + rx * side * 2, mz = cam.z + fz * 8 + rz * side * 2, ex = cam.x + fx * 14 + rx * side * 34, ez = cam.z + fz * 14 + rz * side * 34;
          if (wildOpen(D.x, D.z, mx, mz) && wildOpen(mx, mz, ex, ez)) { path = [[mx, mz], [ex, ez]]; break; }
        }
        if (!path) { const ax = D.x - cam.x, az = D.z - cam.z, L = Math.hypot(ax, az) || 1; path = [[D.x + ax / L * 34, D.z + az / L * 34]]; }
        D.st = 'flee'; D.path = path; D.cool = 30; D.leaving = true;
      }
      // a grazing visit runs its course and they wander off
      if (D.life <= 0 && !D.leaving) { const ax = D.x - cam.x, az = D.z - cam.z, L = Math.hypot(ax, az) || 1; D.st = 'walk'; D.goal = [D.x + ax / L * 40, D.z + az / L * 40]; D.leaving = true; }
      let speed = 0, goal = null;
      if (D.st === 'graze') { D.t -= dt; if (D.t <= 0) { const a = Math.random() * TAU, r = Math.random() * D.home.r * .7; D.goal = [D.home.x + Math.cos(a) * r, D.home.z + Math.sin(a) * r]; D.st = 'walk'; } }
      if (D.st === 'walk') { if (!D.goal) D.goal = [D.home.x, D.home.z]; goal = D.goal; speed = D.leaving ? 1.6 : 1.1; if (Math.hypot(goal[0] - D.x, goal[1] - D.z) < .6) { if (D.leaving) D.done = true; else { D.st = 'graze'; D.t = 4 + Math.random() * 7; } } }
      if (D.st === 'flee') { goal = D.path[0]; speed = 8.5; if (Math.hypot(goal[0] - D.x, goal[1] - D.z) < 1.2) { D.path.shift(); if (!D.path.length) { D.st = 'walk'; D.leaving = true; const ax = D.x - cam.x, az = D.z - cam.z, L = Math.hypot(ax, az) || 1; D.goal = [D.x + ax / L * 30, D.z + az / L * 30]; } } }
      if (goal && speed) {
        const dx = goal[0] - D.x, dz = goal[1] - D.z, L = Math.hypot(dx, dz) || 1, want = Math.atan2(-dx, -dz); let dy = want - D.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        D.yaw += Math.max(-dt * 5, Math.min(dt * 5, dy)); const step = Math.min(L, speed * dt); D.x += dx / L * step; D.z += dz / L * step;
      }
      D.x = Math.max(6, Math.min(134, D.x)); D.z = Math.max(6, Math.min(134, D.z)); const gy = groundOf(D.x, D.z); D.y += (gy - D.y) * Math.min(1, dt * 12);
      // gone once they've left: at once if you can't see them, else fading into the trees; never vanishing in plain sight
      if (D.done || D.leaving && dMe > 32 || dMe > 90 || D.life < -60) { D.leaving = true; D.fadeDir = -1; if (!vis) D.fade = 0; }
      D.fade += D.fadeDir * dt / 1.6; if (D.fadeDir > 0 && D.fade > 1) D.fade = 1;
      if (D.fade <= 0 && D.fadeDir < 0) { D.on = false; D.done = false; D.fade = 1; D.fadeDir = 1; setFade(D); D.g.visible = false; continue; }
      setFade(D);
      // the gait: a walk, or the high bounding leaps of a deer in flight; grazing puts the head down
      const flee = D.st === 'flee', walk = D.st === 'walk'; D.gait += dt * (flee ? 11.5 : walk ? 5 : 0);
      const leap = flee ? Math.max(0, Math.sin(D.gait * .5)) : 0, hop = flee ? leap * 1.15 : 0;
      D.g.position.set(D.x, D.y + hop, D.z); D.g.rotation.y = D.yaw; D.body.rotation.x = flee ? (Math.cos(D.gait * .5) * .25) : 0;
      D.legs.forEach((lg, i) => { const front = lg.front, s = Math.sin(D.gait + (i % 2) * Math.PI + (front ? 0 : Math.PI * .5));
        if (flee) { const tuck = 1 - leap; lg.hip.rotation.x = front ? -.9 * leap + .3 * tuck : .9 * leap - .3 * tuck; lg.knee.rotation.x = front ? 1.2 * tuck : -1.1 * tuck; }
        else if (walk) { lg.hip.rotation.x = s * .32; lg.knee.rotation.x = Math.max(0, -s) * (front ? .55 : -.55); }
        else { lg.hip.rotation.x = 0; lg.knee.rotation.x = 0; } });
      // grazing swings the neck down and forward from the chest and tips the nose to the grass; running holds it up
      const grazing = D.st === 'graze', nk = grazing ? -1.95 : flee ? .2 : 0; D.neck.rotation.x += (nk - D.neck.rotation.x) * Math.min(1, dt * 3);
      D.head.rotation.x = (grazing ? .9 + Math.sin(t * 2 + D.x) * .1 : walk ? Math.sin(D.gait) * .05 : -.1) * Math.min(1, Math.abs(D.neck.rotation.x) / 1.9 + (grazing ? 0 : 1));
      D.tail.rotation.x = flee ? -.9 : Math.max(0, Math.sin(t * 7 + D.z)) * .35;   // the white tail flicks, and goes up as they run
    }
  }
