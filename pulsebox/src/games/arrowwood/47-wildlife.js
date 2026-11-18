  /* ---------- 47 wildlife: birds flitting over the wood, deer wandering the meadows ----------
     All for the look and feel of the place: nobody can shoot them (arrows go straight through), they never block anyone,
     and each player sees their own. Little birds fly in small flocks over the treetops, and now and then one swoops down
     past you. Deer graze in the meadows; come close and they bound away, cutting across in front of you. */
  const WILD = { flocks: [], deer: [], swoopT: 8 };
  function buildWildlife() {
    if (WILD.built) return; WILD.built = true;
    const lamb = c => new THREE.MeshLambertMaterial({ color: LC(c) });
    // ---- birds: a round body, a head and beak, a tail, two wings that flap
    const BIRD = [['#6b4f3a', '#e9dcc4'], ['#3f5a7a', '#dfe7ef'], ['#b4523a', '#f1d9b8'], ['#e2b93b', '#f5ecc8'], ['#4d4d4d', '#d9d9d9']];
    const wingG = new THREE.BoxGeometry(.24, .012, .11); wingG.translate(.12, 0, 0);
    const mkBird = n => {
      const [c1, c2] = BIRD[n % BIRD.length], m = lamb(c1), g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(.085, 8, 6), m); body.scale.set(1, .85, 1.55); g.add(body);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), lamb(c2)); belly.scale.set(.9, .7, 1.3); belly.position.set(0, -.03, -.01); g.add(belly);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.058, 8, 6), m); head.position.set(0, .05, -.13); g.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(.017, .055, 5), lamb('#e3a32d')); beak.rotation.x = -Math.PI / 2; beak.position.set(0, .045, -.19); g.add(beak);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(.07, .012, .12), m); tail.position.set(0, .015, .17); tail.rotation.x = -.15; g.add(tail);
      const wl = new THREE.Mesh(wingG, m), wr = new THREE.Mesh(wingG, m); wr.scale.x = -1; wl.position.y = wr.position.y = .035; g.add(wl, wr);
      g.userData = { wl, wr, ph: Math.random() * 9 }; X.scene.add(g); return g;
    };
    const nFlock = X.q === 'low' ? 2 : 4, per = X.q === 'low' ? 4 : 5;
    for (let f = 0; f < nFlock; f++) {
      const F = { a: .021 + f * .006, b: .017 + f * .005, p: f * 2.1, q: f * 1.3, h: 15 + f * 2.5, birds: [] };
      for (let k = 0; k < per; k++) F.birds.push({ g: mkBird(f * per + k), off: [(Math.random() - .5) * 5, (Math.random() - .5) * 1.5, (Math.random() - .5) * 5], ph: Math.random() * TAU, p: new THREE.Vector3() });
      WILD.flocks.push(F);
    }
    // ---- deer: a body, neck and head, ears, a white tail, four legs that bend at the knee; bucks wear antlers
    const legG = new THREE.BoxGeometry(.085, .42, .1); legG.translate(0, -.21, 0); const shinG = new THREE.BoxGeometry(.065, .42, .075); shinG.translate(0, -.21, 0);
    const mkDeer = buck => {
      const coat = lamb(buck ? '#8a5a2e' : '#a77445'), pale = lamb('#efe5d3'), dark = lamb('#2b1e15'), g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const torso = new THREE.Mesh(new THREE.BoxGeometry(.42, .46, 1.15), coat); torso.position.y = 1.02; torso.castShadow = true; body.add(torso);
      const belly = new THREE.Mesh(new THREE.BoxGeometry(.36, .1, .9), pale); belly.position.y = .8; body.add(belly);
      const rump = new THREE.Mesh(new THREE.BoxGeometry(.38, .3, .14), pale); rump.position.set(0, 1.05, .58); body.add(rump);
      const neck = new THREE.Group(); neck.position.set(0, 1.18, -.5); body.add(neck);
      const nk = new THREE.Mesh(new THREE.BoxGeometry(.18, .55, .2), coat); nk.position.set(0, .22, -.05); nk.rotation.x = -.35; neck.add(nk);
      const head = new THREE.Group(); head.position.set(0, .48, -.16); neck.add(head);
      const skull = new THREE.Mesh(new THREE.BoxGeometry(.19, .2, .34), coat); skull.position.z = -.08; head.add(skull);
      const muzzle = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, .14), pale); muzzle.position.set(0, -.04, -.27); head.add(muzzle);
      const nose = new THREE.Mesh(new THREE.BoxGeometry(.07, .05, .04), dark); nose.position.set(0, -.01, -.35); head.add(nose);
      for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.BoxGeometry(.06, .16, .04), coat); ear.position.set(sx * .12, .13, .02); ear.rotation.z = sx * -.6; head.add(ear);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(.022, 6, 4), dark); eye.position.set(sx * .095, .04, -.12); head.add(eye); }
      if (buck) for (const sx of [-1, 1]) {   // antlers: a beam with three tines
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(.018, .026, .42, 5), lamb('#d8c7a4')); beam.position.set(sx * .1, .3, .02); beam.rotation.set(-.3, 0, sx * -.45); head.add(beam);
        for (let t = 0; t < 3; t++) { const tine = new THREE.Mesh(new THREE.CylinderGeometry(.011, .016, .16, 4), beam.material); tine.position.set(sx * (.14 + t * .045), .3 + t * .09, -.03 - t * .02); tine.rotation.set(-.7, 0, sx * .1); head.add(tine); }
      }
      const tail = new THREE.Mesh(new THREE.BoxGeometry(.1, .18, .06), pale); tail.position.set(0, 1.12, .64); tail.rotation.x = .4; body.add(tail);
      const legs = [[-.14, -.42], [.14, -.42], [-.14, .42], [.14, .42]].map(([lx, lz]) => {
        const hip = new THREE.Group(); hip.position.set(lx, .9, lz); body.add(hip); const th = new THREE.Mesh(legG, coat); hip.add(th);
        const knee = new THREE.Group(); knee.position.y = -.42; hip.add(knee); const sh = new THREE.Mesh(shinG, coat); knee.add(sh);
        const hoof = new THREE.Mesh(new THREE.BoxGeometry(.07, .06, .09), dark); hoof.position.y = -.43; knee.add(hoof); return { hip, knee };
      });
      g.scale.setScalar(buck ? 1.08 : .95); X.scene.add(g);
      return { g, body, neck, head, tail, legs, buck };
    };
    // they live in the meadows away from the spawns, in pairs
    const homes = W.MEADOWS.filter(m => m.z > 24 && m.z < 116);
    homes.slice(0, X.q === 'low' ? 2 : 4).forEach((m, i) => { for (let k = 0; k < 2; k++) {
      const D = mkDeer(k === 0 && i % 2 === 0), x = m.x + (Math.random() - .5) * m.r, z = m.z + (Math.random() - .5) * m.r;
      Object.assign(D, { x, z, y: W.terrainH(x, z), yaw: Math.random() * TAU, home: m, st: 'graze', t: 2 + Math.random() * 5, gait: 0, cool: 0, path: null, s: 0 }); WILD.deer.push(D); } });
  }
  const groundOf = (x, z) => W.groundAt(x, z, W.terrainH(x, z) + 2);
  const wildOpen = (ax, az, bx, bz) => { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5); for (let i = 1; i <= n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; if (x < 8 || z < 8 || x > 132 || z > 132 || W.blocked(x, groundOf(x, z) + .3, z, 1.2)) return false; } return true; };
  function updateWildlife(dt) {
    if (!WILD.built) return; const cam = X.camera.position, t = X.t, fw = X.camera.getWorldDirection(new THREE.Vector3());
    // ---- birds: each flock drifts over the wood on its own loop; the birds weave round its middle, wings beating
    for (const F of WILD.flocks) {
      const cx = 70 + 46 * Math.sin(t * F.a + F.p), cz = 70 + 46 * Math.sin(t * F.b + F.q), cy = W.terrainH(cx, cz) + F.h + 2 * Math.sin(t * .3 + F.p);
      for (const B of F.birds) {
        const g = B.g, prev = g.position.clone();
        if (B.swoop) {   // diving down past you and up again
          const S = B.swoop; S.t += dt / S.T; const u = Math.min(1, S.t), a = S.a, m = S.m, e = S.e, q = 1 - u;
          g.position.set(q * q * a.x + 2 * q * u * m.x + u * u * e.x, q * q * a.y + 2 * q * u * m.y + u * u * e.y, q * q * a.z + 2 * q * u * m.z + u * u * e.z); if (u >= 1) B.swoop = null;
        } else {
          const tx = cx + B.off[0] + Math.sin(t * 1.3 + B.ph) * 1.6, ty = cy + B.off[1] + Math.sin(t * 2.1 + B.ph) * .5, tz = cz + B.off[2] + Math.cos(t * 1.1 + B.ph) * 1.6;
          if (!B.init) { g.position.set(tx, ty, tz); B.init = true; } else g.position.lerp(new THREE.Vector3(tx, ty, tz), Math.min(1, dt * 1.6));
        }
        const v = g.position.clone().sub(prev); if (v.lengthSq() > 1e-6) { g.rotation.y = Math.atan2(-v.x, -v.z); g.rotation.x = Math.max(-.6, Math.min(.6, Math.atan2(v.y, Math.hypot(v.x, v.z)) * .8)); }
        const glide = B.swoop && B.swoop.t > .35 && B.swoop.t < .65, fl = glide ? .15 : Math.sin(t * 22 + g.userData.ph) * .9; g.userData.wl.rotation.z = fl; g.userData.wr.rotation.z = -fl;
      }
    }
    WILD.swoopT -= dt; if (WILD.swoopT <= 0 && WILD.flocks.length) {   // now and then one swoops down past you
      WILD.swoopT = 10 + Math.random() * 14; const B = WILD.flocks[Math.floor(Math.random() * WILD.flocks.length)].birds[0];
      if (B && !B.swoop) { const side = Math.random() < .5 ? -1 : 1, rx = -fw.z * side, rz = fw.x * side, a = B.g.position.clone();
        const m = new THREE.Vector3(cam.x + fw.x * 7 + rx * 2, cam.y + .6, cam.z + fw.z * 7 + rz * 2), e = new THREE.Vector3(cam.x + fw.x * 8 + rx * 26, cam.y + 14, cam.z + fw.z * 8 + rz * 26);
        B.swoop = { a, m, e, t: 0, T: 3.2 }; }
    }
    // ---- deer
    const me = ME.st;
    for (const D of WILD.deer) {
      const dMe = Math.hypot(D.x - me.x, D.z - me.z); D.cool -= dt;
      if ((D.st === 'graze' || D.st === 'walk') && dMe < 14 && D.cool <= 0 && ME.alive) {   // startled: bound off, cutting across in front of you
        const yawMe = me.yaw, fx = -Math.sin(yawMe), fz = -Math.cos(yawMe), rx = -fz, rz = fx; let path = null;
        for (const side of Math.random() < .5 ? [1, -1] : [-1, 1]) {
          const mx = me.x + fx * 8 + rx * side * 2, mz = me.z + fz * 8 + rz * side * 2, ex = me.x + fx * 14 + rx * side * 30, ez = me.z + fz * 14 + rz * side * 30;
          if (wildOpen(D.x, D.z, mx, mz) && wildOpen(mx, mz, ex, ez)) { path = [[mx, mz], [ex, ez]]; break; }
        }
        if (!path) { const ax = D.x - me.x, az = D.z - me.z, L = Math.hypot(ax, az) || 1; path = [[D.x + ax / L * 30, D.z + az / L * 30]]; }
        D.st = 'flee'; D.path = path; D.cool = 12;
      }
      let speed = 0, goal = null;
      if (D.st === 'graze') { D.t -= dt; if (D.t <= 0) { const a = Math.random() * TAU, r = Math.random() * D.home.r * .8; D.goal = [D.home.x + Math.cos(a) * r, D.home.z + Math.sin(a) * r]; D.st = 'walk'; } }
      if (D.st === 'walk') { goal = D.goal; speed = 1.1; if (Math.hypot(goal[0] - D.x, goal[1] - D.z) < .6) { D.st = 'graze'; D.t = 4 + Math.random() * 6; } }
      if (D.st === 'flee') { goal = D.path[0]; speed = 8.5; if (Math.hypot(goal[0] - D.x, goal[1] - D.z) < 1.2) { D.path.shift(); if (!D.path.length) { D.st = 'walk'; D.goal = [D.home.x, D.home.z]; } } }
      if (goal && speed) {
        const dx = goal[0] - D.x, dz = goal[1] - D.z, L = Math.hypot(dx, dz) || 1, want = Math.atan2(-dx, -dz); let dy = want - D.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        D.yaw += Math.max(-dt * 5, Math.min(dt * 5, dy)); const step = Math.min(L, speed * dt); D.x += dx / L * step; D.z += dz / L * step;
      }
      D.x = Math.max(6, Math.min(134, D.x)); D.z = Math.max(6, Math.min(134, D.z)); const gy = groundOf(D.x, D.z); D.y += (gy - D.y) * Math.min(1, dt * 12);
      // the gait: a walk, or the high bounding leaps of a deer in flight; grazing puts the head down
      const flee = D.st === 'flee', walk = D.st === 'walk'; D.gait += dt * (flee ? 11.5 : walk ? 5 : 0);
      const leap = flee ? Math.max(0, Math.sin(D.gait * .5)) : 0, hop = flee ? leap * 1.15 : 0;
      D.g.position.set(D.x, D.y + hop, D.z); D.g.rotation.y = D.yaw; D.body.rotation.x = flee ? (Math.cos(D.gait * .5) * .28) : 0;
      D.legs.forEach((lg, i) => { const front = i < 2, s = Math.sin(D.gait + (i % 2) * Math.PI + (front ? 0 : Math.PI * .5));
        if (flee) { const tuck = 1 - leap; lg.hip.rotation.x = front ? -.9 * leap + .3 * tuck : .9 * leap - .3 * tuck; lg.knee.rotation.x = front ? 1.2 * tuck : -1.1 * tuck; }
        else if (walk) { lg.hip.rotation.x = s * .35; lg.knee.rotation.x = Math.max(0, -s) * (front ? .5 : -.5); }
        else { lg.hip.rotation.x = 0; lg.knee.rotation.x = 0; } });
      const grazing = D.st === 'graze'; D.neck.rotation.x += ((grazing ? 1.25 : flee ? -.25 : 0) - D.neck.rotation.x) * Math.min(1, dt * 3);
      D.head.rotation.x = grazing ? Math.sin(t * 2 + D.x) * .12 : 0; D.tail.rotation.x = flee ? -.6 : .4 + Math.max(0, Math.sin(t * 7 + D.z)) * .5;   // the white tail up as they run
    }
  }
