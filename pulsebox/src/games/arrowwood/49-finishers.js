  /* ---------- 49 finishers: what each bow does to the archer it eliminates (the four originals live in 48-fx) ----------
     Each is a short scene of about two seconds: step(f, t, dt) runs every frame with t counting up from the hit.
     f.x0/y0/z0 is where they stood, f.gy the ground there, f.back the way the arrow was flying. Props go in f.objs
     (cleared with the round); a body tinted with overMat gets its own materials back when it respawns. */
  const FX = {};
  const fv = (x, y, z) => new THREE.Vector3(x, y, z);
  const fxM = (k, o) => bmat('fx-' + k, Object.assign({ roughness: .5 }, o));
  const fxGlow = (k, col, i = 1) => bmat('fxg-' + k, { color: LC(col), emissive: LC(col), emissiveIntensity: i, roughness: .4 });
  function obj(f, mesh, x, y, z) { mesh.position.set(x, y, z); mesh.castShadow = true; X.scene.add(mesh); f.objs.push(mesh); return mesh; }
  function limpP(P, k) { P.L.sh.rotation.set(k * .6, 0, -.5 - k * .8); P.R.sh.rotation.set(k * .6, 0, .5 + k * .8); P.L.el.rotation.set(-.4, 0, 0); P.R.el.rotation.set(-.4, 0, 0); }
  function armsUp(P, a, b) { P.L.sh.rotation.set(0, 0, -2.6 - a); P.R.sh.rotation.set(0, 0, 2.6 + b); P.L.el.rotation.set(0, 0, 0); P.R.el.rotation.set(0, 0, 0); }
  function overMat(P, mat) { P.root.traverse(o => { if (o.isMesh) { if (!o.userData.mat0) o.userData.mat0 = o.material; o.material = mat; } }); }
  function gone(f) { f.P.root.visible = false; f.P.dead = true; }
  function say(f, txt, col, h = 2.4) { floatText([f.x0, f.y0 + h, f.z0], txt, col, 2.4, true); }
  function sfx(f, k) { emit('finSfx', k, f.c); }
  const cue = (f, key, t, when) => t >= when && !f[key] && (f[key] = 1);   // true once, the first frame t passes 'when'
  const ring = (f, n, r, fn) => { for (let k = 0; k < n; k++) { const a = k / n * TAU; fn(f.x0 + Math.cos(a) * r, f.z0 + Math.sin(a) * r, a, k); } };
  function runFX(f, dt) {
    const D = FX[f.kind], P = f.P, m = f.m;
    if (!f.init) {
      f.init = 1; f.x0 = m.p[0]; f.y0 = m.p[1]; f.z0 = m.p[2]; f.gy = groundY(f.x0, f.z0); f.c = [f.x0, f.y0 + 1, f.z0];
      f.back = fv(m.d[0], 0, m.d[2]); if (f.back.lengthSq() < 1e-6) f.back.set(0, 0, 1); f.back.normalize();
      P.root.position.set(f.x0, f.y0, f.z0); P.root.rotation.set(0, m.yaw, 0); P.root.scale.set(1, 1, 1); limpP(P, .2);
    }
    D.step(f, f.t, dt);
    for (const a of P.stuck || []) a.visible = P.root.visible;
  }

  // ---- 1-6: the cheap and cheerful
  FX.partypopper = { dur: 2, step(f, t) {
    if (cue(f, 'a', t, 0)) { const c = obj(f, new THREE.Mesh(new THREE.ConeGeometry(.5, 1.4, 16, 1, true), fxM('popper', { color: LC('#ff5fa2'), side: THREE.DoubleSide })), f.x0 + 1.6, f.gy + .9, f.z0); c.rotation.z = 1.1; f.cone = c; sfx(f, 'pop'); }
    f.cone.scale.setScalar(Math.min(1, t * 4) * (t > .45 ? 1 + Math.sin((t - .45) * 30) * .06 * Math.max(0, 1 - (t - .45) * 3) : 1));
    limpP(f.P, .3);
    if (cue(f, 'b', t, .45)) { const cols = [[1, .35, .6], [1, .85, .2], [.3, .75, 1], [.5, .9, .4], [.7, .45, 1]]; for (const col of cols) burst('cube', [f.x0 + .6, f.gy + 1.2, f.z0], 30, { col, size: .07, sp: 6, up: 2.5, g: 4, drag: 1.5, flutter: 4, life: 2.4, floor: true });
      breakApart(f.P, f.m, { power: 1.4, quiet: true }); gone(f); say(f, 'SURPRISE!', '#ffd23a'); sfx(f, 'bang'); }
  } };
  FX.pocketsize = { dur: 2, step(f, t) {
    const k = Math.min(1, t / 1.1), s = lp(1, .12, sm(k)) * (1 + Math.sin(t * 22) * .05 * (1 - k)); f.P.root.scale.setScalar(s); armsUp(f.P, Math.sin(t * 20) * .3, Math.cos(t * 20) * .3);
    if (cue(f, 'a', t, .1)) sfx(f, 'shrink');
    if (cue(f, 'b', t, 1.3)) { gone(f); burst('star', [f.x0, f.gy + .15, f.z0], 8, { col: [1, 1, .8], size: .15, sp: 1.5, g: 0, life: .4 }); burst('dust', [f.x0, f.gy + .1, f.z0], 6, { col: [1, 1, 1], size: .2, sp: .5, g: 0, life: .5, grow: 1 }); say(f, 'squeak!', '#ffffff', 1); sfx(f, 'squeak'); }
  } };
  FX.sugarrush = { dur: 1.9, step(f, t) {
    f.P.root.position.x = f.x0 + (t < .5 ? (Math.random() - .5) * .08 : 0); f.P.root.scale.setScalar(1 + sm(Math.min(1, t / .5)) * .15); limpP(f.P, .4);
    if (cue(f, 'a', t, .5)) { gone(f); const cols = ['#ff4d6d', '#ffd23a', '#4fc3ff', '#7ee36b', '#b06bff', '#ffffff'];
      for (let k = 0; k < 46; k++) { const col = cols[k % cols.length], gm = k % 3 === 0 ? new THREE.SphereGeometry(.07, 8, 6) : k % 3 === 1 ? new THREE.CylinderGeometry(.05, .05, .1, 10) : new THREE.TorusGeometry(.05, .02, 6, 12);
        const d = obj(f, new THREE.Mesh(gm, fxM('candy' + col, { color: LC(col), roughness: .25 })), f.x0, f.y0 + 1, f.z0); const a = Math.random() * TAU, sp = 2 + Math.random() * 3.5;
        DEBRIS.push({ m: d, v: fv(Math.cos(a) * sp, 2 + Math.random() * 4, Math.sin(a) * sp), w: fv(Math.random() * 9, Math.random() * 9, Math.random() * 9), t: 0, s0: d.scale.clone(), life: 3.2 }); f.objs.pop(); }
      say(f, 'SWEET!', '#ff7eb6'); sfx(f, 'pop'); }
  } };
  FX.skyfloat = { dur: 2.6, hi: 2.2, far: 5, step(f, t) {
    if (cue(f, 'a', t, 0)) { f.bl = []; const cols = ['#ff4d6d', '#ffd23a', '#4fc3ff', '#7ee36b', '#b06bff', '#ff9f1a']; for (let k = 0; k < 6; k++) { const b = obj(f, new THREE.Mesh(new THREE.SphereGeometry(.28, 14, 10), fxM('bal' + k, { color: LC(cols[k]), roughness: .15 })), f.x0, f.y0, f.z0); b.scale.set(1, 1.18, 1); const s2 = obj(f, new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, 1, 4), fxM('str', { color: LC('#ffffff') })), f.x0, f.y0, f.z0); f.bl.push([b, s2, (k / 6) * TAU]); } sfx(f, 'boing'); }
    const h = Math.max(0, t - .35) ** 2 * 3.2, sw = Math.sin(t * 2.5) * .3; f.P.root.position.set(f.x0 + sw * h * .1, f.y0 + h, f.z0); armsUp(f.P, .2, .2); f.camY = 1 + h * .8;
    for (const [b, st, a] of f.bl) { const gr = Math.min(1, t * 3), bx = f.x0 + Math.cos(a + t * .6) * .45 + sw * h * .1, by = f.y0 + h + 2.4 + Math.sin(a * 3) * .25, bz = f.z0 + Math.sin(a + t * .6) * .45; b.position.set(bx, by, bz); b.scale.set(gr, gr * 1.18, gr); st.position.set((bx + f.x0) / 2, (by + f.y0 + h + 1.9) / 2, (bz + f.z0) / 2); st.scale.y = Math.max(.01, by - (f.y0 + h + 1.9)); }
    if (cue(f, 'b', t, 2.2)) { for (const [b, st] of f.bl) { b.visible = st.visible = false; } burst('cube', [f.x0, f.y0 + h + 2.2, f.z0], 40, { col: [1, .5, .7], size: .06, sp: 3, g: 4, life: 1.5 }); gone(f); say(f, 'BYE!', '#ffffff', h + 3); sfx(f, 'pop'); }
  } };
  FX.bitbow = { dur: 2.2, step(f, t) {
    limpP(f.P, .1); f.P.root.scale.set(1, 1, 1);
    if (cue(f, 'a', t, .2)) { breakApart(f.P, f.m, { float: true, quiet: true, power: .25, life: 1.8 }); gone(f); for (let k = 0; k < 4; k++) burst('cube', [f.x0, f.y0 + .3 + k * .45, f.z0], 12, { col: [[1, .25, .25], [1, 1, 1], [1, .85, .2], [.3, .8, 1]][k], size: .09, sp: .8, up: .5, g: -1.5, life: 1.8 }); say(f, 'GAME OVER', '#ff4d4d'); sfx(f, 'blip'); }
  } };
  FX.bubbleburst = { dur: 2.5, hi: 2, far: 4.6, step(f, t) {
    if (cue(f, 'a', t, 0)) { f.bub = obj(f, new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 18), fxM('bubble', { color: LC('#cfefff'), transparent: true, opacity: .32, roughness: .02, metalness: .3, emissive: LC('#3a6a8a'), emissiveIntensity: .15, depthWrite: false })), f.x0, f.y0 + 1, f.z0); f.bub.castShadow = false; sfx(f, 'blub'); }
    const g = Math.min(1, t * 3), h = Math.max(0, t - .5) ** 1.5 * 2.6; f.bub.scale.setScalar(g * (1 + Math.sin(t * 9) * .03)); f.bub.position.set(f.x0 + Math.sin(t * 1.7) * h * .15, f.y0 + 1 + h, f.z0);
    f.P.root.position.set(f.bub.position.x, f.y0 + h, f.z0); f.P.root.rotation.z = Math.sin(t * 2) * .3; armsUp(f.P, Math.sin(t * 5) * .4, Math.cos(t * 5) * .4); f.camY = 1 + h * .7;
    if (cue(f, 'b', t, 2.1)) { f.bub.visible = false; gone(f); burst('dust', [f.bub.position.x, f.bub.position.y, f.z0], 30, { col: [.8, .95, 1], size: .12, sp: 3, g: 6, life: 1, a: .8 }); say(f, 'POP!', '#bfe9ff', h + 2.6); sfx(f, 'pop'); }
  } };
  // ---- 7-12
  FX.blossom = { dur: 2.2, step(f, t) {
    if (cue(f, 'a', t, 0)) { f.fl = []; ring(f, 10, .9, (x, z, a, k) => { const fl = obj(f, new THREE.Group(), x, groundY(x, z), z); const col = ['#ff7eb6', '#ffd23a', '#ffffff', '#c06bff'][k % 4]; for (let j = 0; j < 5; j++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 4), fxM('pet' + col, { color: LC(col) })); p.position.set(Math.cos(j * 1.257) * .08, .25, Math.sin(j * 1.257) * .08); fl.add(p); } const st = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .25, 5), fxM('stem', { color: LC('#3f9e3a') })); st.position.y = .12; fl.add(st); fl.scale.setScalar(.01); f.fl.push(fl); }); sfx(f, 'chime'); }
    f.fl.forEach((fl, k) => fl.scale.setScalar(sm(cl((t - k * .05) * 2.5, 0, 1)) * 1.4));
    const k = sm(cl((t - .5) / .8, 0, 1)); f.P.root.scale.set(1 - k * .7, 1 - k * .9, 1 - k * .7); limpP(f.P, .6);
    if (cue(f, 'b', t, .55)) { f.bush = obj(f, new THREE.Mesh(new THREE.SphereGeometry(.9, 14, 10), fxM('bush', { color: LC('#3f9b3a'), roughness: .7 })), f.x0, f.gy + .5, f.z0); f.bush.scale.setScalar(.01); for (let j = 0; j < 9; j++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), fxM('bb' + (j % 3), { color: LC(['#ff7eb6', '#ffd23a', '#ffffff'][j % 3]) })); const a = j * 2.4; b.position.set(Math.cos(a) * .75, .3 + (j % 3) * .2, Math.sin(a) * .75); f.bush.add(b); } }
    if (f.bush) f.bush.scale.set(sm(k) * 1, sm(k) * .8, sm(k) * 1);
    if (cue(f, 'c', t, 1.3)) { gone(f); burst('petal', [f.x0, f.gy + 1, f.z0], 60, { col: [1, .5, .75], size: .1, sp: 2.5, up: 2, g: 1, drag: 1.6, flutter: 4, life: 2.4, floor: true }); say(f, 'BLOOM!', '#ff7eb6'); }
  } };
  FX.gloop = { dur: 2.2, step(f, t) {
    if (cue(f, 'a', t, 0)) { overMat(f.P, fxM('slime', { color: LC('#8fe03a'), transparent: true, opacity: .85, roughness: .1, emissive: LC('#2f6a00'), emissiveIntensity: .4 })); f.pud = obj(f, new THREE.Mesh(new THREE.CircleGeometry(1, 28), fxM('pud', { color: LC('#7cd030'), roughness: .05, transparent: true, opacity: .9 })), f.x0, f.gy + .03, f.z0); f.pud.rotation.x = -Math.PI / 2; f.pud.scale.setScalar(.01); sfx(f, 'splat'); }
    const k = sm(cl(t / 1.2, 0, 1)); f.P.root.scale.set(1 + k * .9, Math.max(.02, 1 - k), 1 + k * .9); limpP(f.P, k); f.pud.scale.setScalar(.2 + k * 1.1);
    if (cue(f, 'b', t, 1.25)) { gone(f); say(f, 'GLOOP!', '#9cff4a', 1.2); }
    if (t > 1.2 && Math.random() < .2) burst('dust', [f.x0 + (Math.random() - .5) * 1.4, f.gy + .05, f.z0 + (Math.random() - .5) * 1.4], 1, { col: [.6, 1, .3], size: .12, sp: .2, up: 2, g: 1, life: .6, grow: .5 });
  } };
  FX.beekeeper = { dur: 2.4, far: 5, step(f, t) {
    if (cue(f, 'a', t, 0)) { f.dir = fv(-f.back.z, 0, f.back.x); if (Math.random() < .5) f.dir.negate(); sfx(f, 'buzz'); }
    const run = Math.max(0, t - .35) * 6.5, P = f.P, x = f.x0 + f.dir.x * run, z = f.z0 + f.dir.z * run; P.root.position.set(x, groundY(x, z), z); P.root.rotation.set(0, Math.atan2(-f.dir.x, -f.dir.z), 0);
    const ph = t * 16; P.LL.hp.rotation.x = Math.sin(ph) * .9; P.RL.hp.rotation.x = -Math.sin(ph) * .9; P.LL.kn.rotation.x = -Math.max(0, -Math.cos(ph)) * 1.2; P.RL.kn.rotation.x = -Math.max(0, Math.cos(ph)) * 1.2; armsUp(P, Math.sin(ph) * .5, -Math.sin(ph) * .5);
    for (let k = 0; k < 6; k++) burst('cube', [x + Math.sin(t * 9 + k) * .7, groundY(x, z) + 1.6 + Math.cos(t * 7 + k * 2) * .4, z + Math.cos(t * 8 + k) * .7], 1, { col: k % 2 ? [1, .8, .1] : [.1, .1, .1], size: .06, sp: .5, g: 0, life: .25 });
    if (cue(f, 'b', t, .3)) say(f, 'BZZZ!', '#ffd23a');
    if (cue(f, 'c', t, 2)) gone(f);
  } };
  FX.origami = { dur: 2.4, hi: 2, far: 5, step(f, t) {
    if (cue(f, 'a', t, 0)) { overMat(f.P, fxM('paper', { color: LC('#f7f5ef'), roughness: .9, flatShading: true })); sfx(f, 'paper'); }
    const k = sm(cl(t / .5, 0, 1)); f.P.root.scale.set(1, 1, Math.max(.06, 1 - k)); limpP(f.P, 0);
    if (cue(f, 'b', t, .6)) { gone(f); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -.9, -.6, 0, .5, 0, .08, .4, 0, 0, -.9, 0, .08, .4, .6, 0, .5, 0, 0, -.9, 0, .08, .4, 0, -.25, .4], 3)); g.computeVertexNormals();
      f.plane = obj(f, new THREE.Mesh(g, fxM('plane', { color: LC('#ffffff'), side: THREE.DoubleSide, roughness: .9, flatShading: true })), f.x0, f.y0 + 1.2, f.z0); f.plane.rotation.y = Math.atan2(f.back.x, f.back.z) + Math.PI; say(f, 'FOLDED!', '#ffffff'); }
    if (f.plane) { const u = t - .6; f.plane.position.set(f.x0 - f.back.x * u * 6, f.y0 + 1.2 + Math.sin(u * 2.2) * 1.2 + u * 1.2, f.z0 - f.back.z * u * 6); f.plane.rotation.z = Math.sin(u * 2.2) * .5; f.camY = 1.2 + u; }
  } };
  FX.frostfall = { dur: 2.4, step(f, t) {
    for (let k = 0; k < 3; k++) burst('dust', [f.x0 + (Math.random() - .5) * 3, f.y0 + 4, f.z0 + (Math.random() - .5) * 3], 1, { col: [1, 1, 1], size: .08, sp: .2, g: 1.2, life: 2, a: .9, floor: true });
    limpP(f.P, .2);
    if (cue(f, 'a', t, .5)) { gone(f); burst('dust', [f.x0, f.gy + 1, f.z0], 18, { col: [1, 1, 1], size: .6, sp: 1.5, g: .2, life: 1, grow: 1.5, a: .8 }); f.sm = obj(f, new THREE.Group(), f.x0, f.gy, f.z0); f.sm.rotation.y = f.m.yaw;
      const snow = fxM('snow', { color: LC('#f7fbff'), roughness: .9 }); [[.45, .4], [.33, 1.0], [.24, 1.45]].forEach(([r, y]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), snow); b.position.y = y; b.castShadow = true; f.sm.add(b); });
      const nose = new THREE.Mesh(new THREE.ConeGeometry(.045, .26, 8), fxM('carrot', { color: LC('#ff8a1a') })); nose.rotation.x = -Math.PI / 2; nose.position.set(0, 1.45, -.33); f.sm.add(nose);
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.03, 6, 4), fxM('coal', { color: LC('#111111') })); e.position.set(sx * .08, 1.53, -.21); f.sm.add(e); const arm = new THREE.Mesh(new THREE.CylinderGeometry(.015, .02, .5, 5), fxM('twig', { color: LC('#6b4a2c') })); arm.position.set(sx * .45, 1.05, 0); arm.rotation.z = sx * 1.1; f.sm.add(arm); }
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .22, 14), fxM('hat', { color: LC('#1a1a1a') })); hat.position.y = 1.75; f.sm.add(hat); const sc = new THREE.Mesh(new THREE.TorusGeometry(.26, .06, 8, 16), fxM('scarf', { color: LC('#c8202a') })); sc.rotation.x = Math.PI / 2; sc.position.y = 1.22; f.sm.add(sc);
      say(f, 'BRRR!', '#bff0ff', 2.5); sfx(f, 'freeze'); }
    if (f.sm) f.sm.scale.setScalar(sm(cl((t - .5) * 3, 0, 1)));
  } };
  FX.toonbow = { dur: 2.3, hi: 1.8, step(f, t) {
    limpP(f.P, .1);
    if (cue(f, 'a', t, 0)) { const an = new THREE.Group(), mm = fxM('anvil', { color: LC('#3a3f47'), metalness: .8, roughness: .35 }); [[1.1, .3, .6, 0, 0], [.5, .35, .45, 0, .32], [1.4, .18, .55, 0, .58]].forEach(([w, h, d, x, y]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mm); b.position.set(x, y, 0); b.castShadow = true; an.add(b); }); f.an = obj(f, an, f.x0, f.y0 + 12, f.z0); }
    const fall = cl((t - .15) / .4, 0, 1); f.an.position.y = lp(f.y0 + 12, f.gy + .35 * 0 + .12, fall * fall);
    if (cue(f, 'b', t, .55)) { X.shake = Math.max(X.shake, f.mine ? .8 : .3); burst('dust', [f.x0, f.gy + .2, f.z0], 20, { col: [.9, .9, .85], size: .6, sp: 2.5, up: .3, g: .2, grow: 1.4, a: .5, life: 1.1 }); say(f, 'BONK!', '#ffd23a'); sfx(f, 'bonk'); f.P.dead = true; }
    if (f.b) { const k = t - .55; f.P.root.scale.set(1.35, .12, 1.35); f.an.position.y = f.gy + .12 + Math.abs(Math.sin(k * 9)) * .2 * Math.exp(-k * 5);
      if (!f.stars) { f.stars = []; for (let j = 0; j < 4; j++) f.stars.push(obj(f, new THREE.Mesh(starGeo(.12, .03), fxGlow('toonstar', '#ffd23a', .8)), f.x0, f.gy + 1, f.z0)); }
      f.stars.forEach((s, j) => { const a = t * 5 + j * TAU / 4; s.position.set(f.x0 + Math.cos(a) * .7, f.gy + 1.05 + Math.sin(t * 7 + j) * .06, f.z0 + Math.sin(a) * .7); s.rotation.y = a; }); }
  } };
  // ---- 13-18
  FX.hexbow = { dur: 2.4, far: 4.2, step(f, t) {
    limpP(f.P, .3);
    if (cue(f, 'a', t, .3)) { gone(f); burst('dust', [f.x0, f.gy + 1, f.z0], 30, { col: [.4, 1, .45], size: .7, sp: 2, g: -.2, grow: 1.6, a: .75, life: 1.3 }); burst('star', [f.x0, f.gy + 1, f.z0], 10, { col: [.6, 1, .6], size: .2, sp: 3, g: 0, life: .5 });
      const fr = new THREE.Group(), fm = fxM('frog', { color: LC('#4caf3c'), roughness: .35 }); const body = new THREE.Mesh(new THREE.SphereGeometry(.22, 14, 10), fm); body.scale.set(1, .7, 1.2); body.position.y = .16; fr.add(body);
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), fm); e.position.set(sx * .1, .32, -.14); fr.add(e); const pu = new THREE.Mesh(new THREE.SphereGeometry(.04, 8, 6), fxM('pupil', { color: LC('#111111') })); pu.position.set(sx * .1, .34, -.19); fr.add(pu); const l = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), fm); l.scale.set(.8, .4, 1.6); l.position.set(sx * .18, .05, .1); fr.add(l); }
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(.08, .06, .07, 6), fxM('crown', { color: LC('#ffd23a'), metalness: 1, roughness: .2 })); crown.position.set(0, .34, -.02); fr.add(crown); f.frog = obj(f, fr, f.x0, f.gy, f.z0); f.fdir = fv(-f.back.z, 0, f.back.x);
      say(f, 'RIBBIT!', '#7eff6a'); sfx(f, 'poof'); }
    if (f.frog) { const u = t - .3, hop = Math.floor(u / .45), ph = (u % .45) / .45, d = (hop + sm(ph)) * .9, x = f.x0 + f.fdir.x * d, z = f.z0 + f.fdir.z * d; f.frog.position.set(x, groundY(x, z) + Math.sin(ph * Math.PI) * .45, z); f.frog.rotation.y = Math.atan2(-f.fdir.x, -f.fdir.z); f.frog.scale.y = 1 + Math.sin(ph * Math.PI * 2) * .15; }
  } };
  FX.rootbind = { dur: 2.3, step(f, t) {
    if (cue(f, 'a', t, 0)) { f.roots = []; ring(f, 7, .55, (x, z, a) => { const g = new THREE.Group(), rm = fxM('root', { color: LC('#6b4a2c'), roughness: .9 }); for (let j = 0; j < 6; j++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.03 * (1 - j / 7), .05 * (1 - j / 7), .4, 6), rm); s.position.set(-Math.cos(a) * j * .06, j * .32 + .2, -Math.sin(a) * j * .06); s.rotation.set(Math.sin(a) * .4, 0, -Math.cos(a) * .4); g.add(s); } const lf = new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 4), fxM('rleaf', { color: LC('#5cb83a') })); lf.position.set(0, 1.4, 0); lf.scale.set(1.5, .4, 1); g.add(lf); f.roots.push(obj(f, g, x, groundY(x, z) - 2, z)); }); sfx(f, 'crack'); burst('chip', [f.x0, f.gy + .1, f.z0], 20, { col: [.4, .3, .2], size: .06, sp: 3, up: 2, floor: true }); }
    const up = sm(cl(t / .6, 0, 1)), down = sm(cl((t - .8) / .8, 0, 1)); f.roots.forEach(r => { r.position.y = groundY(r.position.x, r.position.z) - 2 + up * 2 - down * 2.2; });
    f.P.root.position.y = f.y0 - down * 2.3; limpP(f.P, .2); armsUp(f.P, Math.sin(t * 12) * .3 * (1 - down), Math.cos(t * 12) * .3 * (1 - down));
    if (cue(f, 'b', t, .8)) { say(f, 'ROOTED!', '#8fd35a'); }
    if (cue(f, 'c', t, 1.7)) { gone(f); burst('dust', [f.x0, f.gy + .2, f.z0], 12, { col: [.55, .45, .3], size: .5, sp: 1, g: .3, grow: 1.2, a: .5, life: 1 }); }
  } };
  FX.dune = { dur: 2.2, step(f, t) {
    if (cue(f, 'a', t, 0)) { f.sand = fxM('sand', { color: LC('#e2c48a'), roughness: 1 }); overMat(f.P, f.sand); f.wind = [-f.back.z * 2 + f.back.x, f.back.x * 2 + f.back.z]; sfx(f, 'wind'); }
    limpP(f.P, .2);
    if (cue(f, 'b', t, .45)) { breakApart(f.P, f.m, { mat: f.sand, quiet: true, power: .3, wind: f.wind, life: 1.4 }); gone(f); say(f, 'DUST!', '#f0d79a'); }
    if (t < 1.6) for (let k = 0; k < 6; k++) burst('dust', [f.x0 + (Math.random() - .5) * .5, f.gy + Math.random() * 1.8, f.z0 + (Math.random() - .5) * .5], 1, { col: [.9, .78, .55], size: .25, sp: .3, vx: f.wind[0] * 1.5, vz: f.wind[1] * 1.5, g: 0, grow: 1.2, a: .6, life: 1.4 });
  } };
  FX.frostbite = { dur: 2.2, step(f, t) {
    if (cue(f, 'a', t, 0)) { f.ice = obj(f, new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 1.1), fxM('iceblock', { color: LC('#bfe8ff'), transparent: true, opacity: .5, roughness: .05, metalness: .1, depthWrite: false })), f.x0, f.y0 + 1.1, f.z0); f.ice.scale.setScalar(.01); f.iceM = fxM('icebody', { color: LC('#a8dcff'), roughness: .15, emissive: LC('#1a4060'), emissiveIntensity: .5 }); overMat(f.P, f.iceM); sfx(f, 'freeze'); }
    const k = sm(cl(t / .3, 0, 1)); f.ice.scale.set(k, k, k); limpP(f.P, .15);
    if (cue(f, 'b', t, .3)) say(f, 'FROZEN!', '#bff0ff', 2.6);
    if (cue(f, 'c', t, 1.15)) { f.ice.visible = false; breakApart(f.P, f.m, { mat: f.iceM, quiet: true, power: 1.2 }); gone(f); burst('chip', [f.x0, f.y0 + 1, f.z0], 50, { col: [.75, .9, 1], size: .07, sp: 5, up: 2, life: 1.4, floor: true }); burst('spark', [f.x0, f.y0 + 1, f.z0], 20, { col: [.8, .95, 1], size: .08, sp: 3, life: .3 }); X.shake = Math.max(X.shake, f.mine ? .4 : 0); sfx(f, 'shatter'); }
  } };
  FX.emberwood = { dur: 2.3, step(f, t) {
    if (cue(f, 'a', t, 0)) { sfx(f, 'burn'); }
    if (t < 1.25) for (let k = 0; k < 4; k++) burst('spark', [f.x0 + (Math.random() - .5) * .6, f.y0 + Math.random() * 1.8, f.z0 + (Math.random() - .5) * .6], 1, { col: [1, .45 + Math.random() * .3, .1], size: .16, sp: .3, up: 3, g: -2, life: .6 });
    if (cue(f, 'b', t, .45)) { f.ash = fxM('char', { color: LC('#2a2422'), roughness: 1, emissive: LC('#ff4a10'), emissiveIntensity: .35 }); overMat(f.P, f.ash); say(f, 'TOASTED!', '#ff8a2a'); }
    limpP(f.P, .5); f.P.root.rotation.x = -sm(cl((t - .4) / .8, 0, 1)) * .3;
    if (cue(f, 'c', t, 1.25)) { breakApart(f.P, f.m, { mat: fxM('ash', { color: LC('#3a3634'), roughness: 1 }), quiet: true, power: .35, life: 1.6 }); gone(f); burst('dust', [f.x0, f.gy + .5, f.z0], 24, { col: [.25, .23, .22], size: .6, sp: 1, g: -.4, grow: 1.6, a: .6, life: 1.6 }); }
  } };
  FX.gorgon = { dur: 2.3, step(f, t) {
    if (cue(f, 'a', t, .25)) { f.stone = fxM('stone', { color: LC('#8a8f94'), roughness: .95, flatShading: true }); overMat(f.P, f.stone); burst('dust', [f.x0, f.y0 + 1, f.z0], 12, { col: [.6, .62, .6], size: .5, sp: 1, g: 0, grow: 1.2, a: .5, life: .8 }); say(f, 'PETRIFIED!', '#c8d0c8'); sfx(f, 'crack'); }
    limpP(f.P, t < .25 ? 1 : .2); f.P.root.position.x = f.x0 + (t > .9 && t < 1.3 ? (Math.random() - .5) * .04 : 0);
    if (cue(f, 'b', t, 1.3)) { breakApart(f.P, f.m, { mat: f.stone, quiet: true, power: .7 }); gone(f); burst('dust', [f.x0, f.gy + .6, f.z0], 18, { col: [.6, .6, .58], size: .7, sp: 1.6, g: .2, grow: 1.4, a: .55, life: 1.3 }); X.shake = Math.max(X.shake, f.mine ? .3 : 0); sfx(f, 'rumble'); }
  } };
  // ---- 19-24
  FX.discofever = { dur: 2.6, hi: 1.7, far: 4.4, step(f, t) {
    if (cue(f, 'a', t, 0)) { f.ball = obj(f, new THREE.Mesh(new THREE.IcosahedronGeometry(.45, 1), fxM('disco', { color: LC('#e6e9ee'), metalness: 1, roughness: .05, flatShading: true })), f.x0, f.y0 + 9, f.z0); f.spots = []; ring(f, 5, 1.2, (x, z, a, k) => { const s = obj(f, new THREE.Mesh(new THREE.CircleGeometry(.45, 20), new THREE.MeshBasicMaterial({ color: ['#ff3b8f', '#3bc4ff', '#ffe23b', '#7bff6a', '#b06bff'][k], transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false })), x, groundY(x, z) + .04, z); s.rotation.x = -Math.PI / 2; s.castShadow = false; f.spots.push([s, a]); }); sfx(f, 'disco'); }
    f.ball.position.y = lp(f.y0 + 9, f.y0 + 3.2, sm(cl(t / .5, 0, 1))); f.ball.rotation.y = t * 3;
    f.spots.forEach(([s, a]) => { const b = a + t * 2.2; s.position.set(f.x0 + Math.cos(b) * 1.2, groundY(f.x0, f.z0) + .04, f.z0 + Math.sin(b) * 1.2); });
    if (t < 1.8) { const P = f.P, b = Math.sin(t * 12); P.hips.position.x = b * .08; P.root.rotation.y = f.m.yaw + Math.sin(t * 6) * .4; armsUp(P, b > 0 ? .4 : -1.6, b > 0 ? -1.6 : .4); P.LL.kn.rotation.x = -Math.max(0, b) * .5; P.RL.kn.rotation.x = -Math.max(0, -b) * .5; }
    if (cue(f, 'b', t, .6)) say(f, 'GROOVY!', '#ff5ac8', 2.6);
    if (cue(f, 'c', t, 1.8)) { gone(f); for (const col of [[1, .3, .7], [.3, .8, 1], [1, .9, .3]]) burst('star', [f.x0, f.y0 + 1, f.z0], 14, { col, size: .18, sp: 3, g: 1, life: .9 }); sfx(f, 'pop'); }
  } };
  FX.galeforce = { dur: 2.5, hi: 2.4, far: 5.2, step(f, t) {
    if (cue(f, 'a', t, 0)) { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128; const g = cv.getContext('2d'); for (let k = 0; k < 9; k++) { g.strokeStyle = `rgba(255,255,255,${.25 + Math.random() * .4})`; g.lineWidth = 3; g.beginPath(); g.moveTo(0, k * 14 + 4); g.lineTo(64, k * 14 + 10); g.stroke(); }
      const tw = tex(cv, { rep: [3, 1] }); f.tw = tw; f.tor = obj(f, new THREE.Mesh(new THREE.CylinderGeometry(1.6, .25, 5, 24, 1, true), new THREE.MeshBasicMaterial({ map: tw, color: '#dfeaf0', transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false })), f.x0, f.gy + 2.5, f.z0); f.tor.castShadow = false; f.tor.scale.setScalar(.01); sfx(f, 'wind'); }
    f.tor.scale.setScalar(sm(cl(t / .4, 0, 1))); f.tor.rotation.y = t * 9; f.tw.offset.x = t * 2;
    const h = Math.max(0, t - .5) ** 2 * 4, a = t * t * 8; f.P.root.position.set(f.x0 + Math.cos(a) * Math.min(1, h * .3), f.y0 + h, f.z0 + Math.sin(a) * Math.min(1, h * .3)); f.P.root.rotation.set(Math.sin(t * 5) * .4, a, Math.cos(t * 4) * .4); armsUp(f.P, .3, .3); f.camY = 1 + h * .6;
    for (let k = 0; k < 3; k++) { const b = t * 7 + k * 2.1, r = .5 + k * .35; burst(k ? 'leaf' : 'dust', [f.x0 + Math.cos(b) * r, f.gy + .3 + k * 1.3, f.z0 + Math.sin(b) * r], 1, { col: k ? [.4, .7, .3] : [.85, .85, .8], size: k ? .12 : .4, sp: .5, up: 2, g: -1, life: .7, a: .6 }); }
    if (cue(f, 'b', t, .4)) say(f, 'WHOOSH!', '#bff4f0', 3);
    if (cue(f, 'c', t, 2.1)) { gone(f); f.tor.visible = false; }
  } };
  FX.skyrocket = { dur: 2.7, hi: 2.8, far: 6, step(f, t) {
    if (cue(f, 'a', t, 0)) sfx(f, 'rocket');
    const h = t < .45 ? 0 : (t - .45) ** 2 * 9; f.P.root.position.set(f.x0, f.y0 + h, f.z0); f.P.root.rotation.set(0, f.m.yaw + h * .3, 0); armsUp(f.P, -.2, -.2); f.camY = 1 + Math.min(h, 22) * .75;
    const fy = f.y0 + h; for (let k = 0; k < 4; k++) burst('spark', [f.x0 + (Math.random() - .5) * .3, fy, f.z0 + (Math.random() - .5) * .3], 1, { col: [1, .5 + Math.random() * .4, .1], size: .22, sp: .4, vy: -6, g: 0, life: .5 });
    if (t < .45) burst('dust', [f.x0, f.gy + .1, f.z0], 2, { col: [.85, .85, .85], size: .5, sp: 1.6, up: .2, g: 0, grow: 1.5, a: .5, life: 1 });
    if (cue(f, 'b', t, .5)) say(f, 'BLAST OFF!', '#ff5a3a', 2.4);
    if (cue(f, 'c', t, 2.05)) { gone(f); const p = [f.x0, fy, f.z0]; for (const col of [[1, .3, .3], [.3, .8, 1], [1, .9, .3], [.5, 1, .5]]) burst('star', p, 22, { col, size: .3, sp: 9, g: 2, drag: 1.2, life: 1.4 }); burst('spark', p, 40, { col: [1, .95, .8], size: .2, sp: 7, g: 2, life: 1 }); sfx(f, 'boom'); }
  } };
  FX.thunderclap = { dur: 2.3, step(f, t) {
    if (cue(f, 'a', t, .2)) { const pts = [], parts = []; let x = f.x0 + (Math.random() - .5) * 4, z = f.z0 + (Math.random() - .5) * 4; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push(fv(lp(x, f.x0, u) + (k && k < 8 ? (Math.random() - .5) * 1.6 : 0), lp(f.y0 + 30, f.y0 + 1.6, u), lp(z, f.z0, u) + (k && k < 8 ? (Math.random() - .5) * 1.6 : 0))); }
      for (let k = 0; k < 8; k++) { const a = pts[k], b = pts[k + 1], d = b.clone().sub(a), L = d.length(), c = new THREE.CylinderGeometry(.09, .09, L, 5); c.translate(0, L / 2, 0); c.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(fv(0, 1, 0), d.normalize()))); c.translate(a.x, a.y, a.z); parts.push(c); }
      f.bolt = obj(f, new THREE.Mesh(merge(parts), new THREE.MeshBasicMaterial({ color: '#f4fbff', transparent: true })), 0, 0, 0); f.bolt.castShadow = false;
      f.zap = fxM('zapped', { color: LC('#1a1a1a'), roughness: 1, emissive: LC('#2a6aff'), emissiveIntensity: .25 }); overMat(f.P, f.zap); X.shake = Math.max(X.shake, f.mine ? .9 : .4); burst('spark', [f.x0, f.y0 + 1.6, f.z0], 40, { col: [.7, .85, 1], size: .1, sp: 6, life: .5 }); say(f, 'ZAP!', '#fff35a'); sfx(f, 'zap'); }
    if (f.bolt) f.bolt.material.opacity = Math.max(0, 1 - (t - .2) * 3) * (Math.random() < .5 ? 1 : .4), f.bolt.visible = f.bolt.material.opacity > .02;
    const P = f.P; if (t > .2 && t < 1.1) { P.root.rotation.set((Math.random() - .5) * .15, f.m.yaw + (Math.random() - .5) * .3, (Math.random() - .5) * .15); armsUp(P, Math.random() * .6, Math.random() * .6); if (Math.random() < .3) burst('spark', [f.x0, f.y0 + Math.random() * 1.8, f.z0], 2, { col: [.6, .8, 1], size: .06, sp: 2, life: .2 }); }
    if (t >= 1.1) { const k = sm(cl((t - 1.1) / .4, 0, 1)); P.root.rotation.set(-k * 1.45, f.m.yaw, 0); limpP(P, 1); if (cue(f, 'b', t, 1.5)) { burst('dust', [f.x0, f.gy + .2, f.z0], 10, { col: [.3, .3, .3], size: .5, sp: 1, g: -.3, grow: 1.4, a: .5, life: 1.2 }); P.dead = true; } }
  } };
  FX.spectral = { dur: 2.5, hi: 1.9, step(f, t) {
    const P = f.P, k = sm(cl((t - .1) / .55, 0, 1)); P.root.rotation.set(-k * 1.45, f.m.yaw, 0); limpP(P, 1);
    if (cue(f, 'a', t, .45)) { P.dead = true; f.ghost = new THREE.Group(); const gm = fxM('ghost', { color: LC('#c8f4ff'), transparent: true, opacity: .55, emissive: LC('#5fd0ff'), emissiveIntensity: .6, depthWrite: false });
      P.root.updateMatrixWorld(true); P.root.traverse(o => { if (!o.isMesh || !o.visible) return; const d = new THREE.Mesh(o.geometry, gm); o.matrixWorld.decompose(d.position, d.quaternion, d.scale); f.ghost.add(d); });
      f.ghost.position.set(0, 0, 0); obj(f, f.ghost, 0, 0, 0); f.ghost.castShadow = false; say(f, 'BOO!', '#c8f4ff', 2.8); sfx(f, 'ghost'); }
    if (f.ghost) { const u = t - .45; f.ghost.position.set(Math.sin(u * 3) * .3, u * 1.6, 0); f.ghost.traverse(o => { if (o.material) o.material.opacity = Math.max(0, .55 - u * .3); }); f.camY = 1 + u * .8; if (Math.random() < .5) burst('dust', [f.x0 + Math.sin(u * 3) * .3, f.y0 + 1.2 + u * 1.6, f.z0], 1, { col: [.7, .95, 1], size: .3, sp: .3, g: -.5, life: .8, a: .4, grow: 1 }); }
  } };
  // ---- 25-30
  FX.magmacore = { dur: 2.4, step(f, t) {
    if (cue(f, 'a', t, 0)) { f.lava = obj(f, new THREE.Mesh(new THREE.CircleGeometry(1.3, 28), fxGlow('lava', '#ff5a10', 1.2)), f.x0, f.gy + .04, f.z0); f.lava.rotation.x = -Math.PI / 2; f.lava.scale.setScalar(.01); f.lava.castShadow = false; f.hot = fxM('molten', { color: LC('#3a1a10'), emissive: LC('#ff4a10'), emissiveIntensity: .6, roughness: .6 }); sfx(f, 'burn'); }
    f.lava.scale.setScalar(sm(cl(t / .4, 0, 1)) * (1 + Math.sin(t * 6) * .03));
    if (cue(f, 'b', t, .35)) { overMat(f.P, f.hot); say(f, 'MELTED!', '#ff7a2a'); }
    const down = sm(cl((t - .4) / 1.2, 0, 1)); f.P.root.position.y = f.y0 - down * 2; armsUp(f.P, Math.sin(t * 10) * .4, Math.cos(t * 10) * .4);
    if (Math.random() < .5) burst('spark', [f.x0 + (Math.random() - .5) * 2, f.gy + .1, f.z0 + (Math.random() - .5) * 2], 1, { col: [1, .5, .1], size: .14, sp: .5, up: 3, g: 4, life: .7 });
    if (cue(f, 'c', t, 1.65)) { gone(f); burst('dust', [f.x0, f.gy + .3, f.z0], 12, { col: [.3, .25, .25], size: .6, sp: 1, g: -.5, grow: 1.5, a: .5, life: 1.2 }); }
  } };
  FX.arrowstorm = { dur: 2.3, hi: 2.2, far: 4.8, step(f, t) {
    if (cue(f, 'a', t, 0)) { f.rain = []; for (let k = 0; k < 30; k++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 2.2, x = f.x0 + Math.cos(a) * r, z = f.z0 + Math.sin(a) * r, am = makeArrowMesh('arrowstorm'); am.scale.setScalar(1.6); f.rain.push({ m: obj(f, am, x, f.y0 + 14 + Math.random() * 4, z), x, z, t0: Math.random() * .7, gy: groundY(x, z), done: false }); } sfx(f, 'volley'); }
    for (const r of f.rain) { const u = t - r.t0; if (u < 0) continue; const y = f.y0 + 16 - u * u * 30; if (!r.done && y <= r.gy + .5) { r.done = true; burst('chip', [r.x, r.gy + .05, r.z], 3, { col: [.5, .4, .3], size: .05, sp: 1.5, floor: true }); } r.m.position.set(r.x, r.done ? r.gy + .5 : y, r.z); r.m.lookAt(r.x, r.m.position.y + 5, r.z); }
    const k = sm(cl((t - .35) / .4, 0, 1)); f.P.root.rotation.set(-k * 1.45, f.m.yaw, 0); limpP(f.P, k);
    if (cue(f, 'b', t, .35)) { say(f, 'VOLLEY!', '#e3b341', 2.6); }
    if (cue(f, 'c', t, .9)) f.P.dead = true;
  } };
  FX.abductor = { dur: 2.7, hi: 3, far: 6, step(f, t) {
    if (cue(f, 'a', t, 0)) { const u = new THREE.Group(); const hull = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 12), fxM('ufo', { color: LC('#c9ced6'), metalness: 1, roughness: .25 })); hull.scale.set(1, .25, 1); u.add(hull); const dome = new THREE.Mesh(new THREE.SphereGeometry(.6, 18, 10, 0, TAU, 0, Math.PI / 2), fxM('dome', { color: LC('#9affb0'), transparent: true, opacity: .6, emissive: LC('#2a8a3a'), emissiveIntensity: .6 })); dome.position.y = .2; u.add(dome); for (let k = 0; k < 8; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), fxGlow('ufol', k % 2 ? '#5cff7a' : '#ffe23a', 1.5)); l.position.set(Math.cos(k / 8 * TAU) * 1.25, -.05, Math.sin(k / 8 * TAU) * 1.25); u.add(l); }
      f.ufo = obj(f, u, f.x0, f.y0 + 14, f.z0); f.beam = obj(f, new THREE.Mesh(new THREE.CylinderGeometry(.5, 1.3, 1, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#9affb0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })), f.x0, f.y0, f.z0); f.beam.castShadow = false; sfx(f, 'ufo'); }
    const uy = f.y0 + lp(14, 6, sm(cl(t / .5, 0, 1))) + (t > 2 ? (t - 2) ** 2 * 30 : 0); f.ufo.position.set(f.x0 + (t > 2 ? (t - 2) ** 2 * 40 : 0), uy, f.z0); f.ufo.rotation.y = t * 2;
    const on = t > .5 && t < 2; f.beam.material.opacity = on ? .25 + Math.sin(t * 20) * .05 : 0; const top = uy - .3, bot = f.gy; f.beam.scale.y = Math.max(.01, top - bot); f.beam.position.set(f.x0, (top + bot) / 2, f.z0);
    const h = sm(cl((t - .6) / 1.2, 0, 1)) * (uy - f.y0 - 1.5); f.P.root.position.y = f.y0 + h; f.P.root.rotation.y = f.m.yaw + t * 3; f.P.root.scale.setScalar(1 - sm(cl((t - .9) / .9, 0, 1)) * .8); armsUp(f.P, .3, .3); f.camY = 1 + h * .6;
    if (cue(f, 'b', t, .6)) say(f, 'BEAMED UP!', '#9affb0', 2.6);
    if (cue(f, 'c', t, 1.85)) gone(f);
  } };
  FX.midas = { dur: 2.3, step(f, t) {
    if (cue(f, 'a', t, .2)) { overMat(f.P, fxM('gold', { color: LC('#f2c230'), metalness: 1, roughness: .18 })); burst('star', [f.x0, f.y0 + 1, f.z0], 16, { col: [1, .9, .4], size: .18, sp: 2, g: 0, life: .7 }); say(f, 'GOLDEN!', '#ffd23a'); sfx(f, 'chime'); }
    limpP(f.P, t < .2 ? .6 : .6); if (Math.random() < .3) burst('spark', [f.x0 + (Math.random() - .5) * .6, f.y0 + Math.random() * 1.8, f.z0 + (Math.random() - .5) * .6], 1, { col: [1, .9, .5], size: .1, sp: .2, g: 0, life: .4 });
    const k = sm(cl((t - .8) / .55, 0, 1)); f.P.root.rotation.set(-k * 1.5, f.m.yaw, 0);
    if (cue(f, 'b', t, 1.35)) { f.P.dead = true; X.shake = Math.max(X.shake, f.mine ? .3 : 0); burst('dust', [f.x0, f.gy + .2, f.z0], 10, { col: [.85, .8, .6], size: .5, sp: 1.5, g: .2, grow: 1.2, a: .5, life: .9 }); sfx(f, 'clank'); }
  } };
  FX.arcane = { dur: 2.4, step(f, t) {
    if (cue(f, 'a', t, 0)) { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'); g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 118, 0, TAU); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 92, 0, TAU); g.stroke(); g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, b = (k + 2) / 6 * TAU; g.moveTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); g.lineTo(128 + Math.cos(b) * 92, 128 + Math.sin(b) * 92); } g.stroke(); g.font = 'bold 22px serif'; g.fillStyle = '#ffffff'; for (let k = 0; k < 12; k++) { g.save(); g.translate(128, 128); g.rotate(k / 12 * TAU); g.fillText('ᚠᚱᚾᛉᛟᛞ'[k % 6], -6, -98); g.restore(); }
      f.circ = obj(f, new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ map: tex(cv, { clamp: true }), color: '#5fe8ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })), f.x0, f.gy + .05, f.z0); f.circ.rotation.x = -Math.PI / 2; f.circ.castShadow = false; sfx(f, 'magic'); }
    f.circ.rotation.z = t * 1.5; f.circ.material.opacity = Math.min(1, t * 3) * (t > 1.9 ? Math.max(0, 1 - (t - 1.9) * 3) : 1);
    f.P.root.position.y = f.y0 + sm(cl(t / 1, 0, 1)) * .5; armsUp(f.P, .5, .5);
    for (let k = 0; k < 3; k++) { const a = Math.random() * TAU, r = Math.random() * 1.4; burst('star', [f.x0 + Math.cos(a) * r, f.gy + .1, f.z0 + Math.sin(a) * r], 1, { col: [.4, .9, 1], size: .12, sp: .2, up: 3, g: -1.5, life: .9 }); }
    if (cue(f, 'b', t, 1.1)) { breakApart(f.P, f.m, { mat: fxGlow('arcane', '#7fe8ff', .9), float: true, quiet: true, power: .3, life: 1.1 }); gone(f); burst('star', [f.x0, f.y0 + 1.3, f.z0], 30, { col: [.5, .95, 1], size: .2, sp: 4, g: 0, life: .7 }); say(f, 'VANISHED!', '#7fe8ff'); sfx(f, 'zap'); }
  } };
  FX.starfall = { dur: 2.4, hi: 2.4, far: 6, step(f, t) {
    if (cue(f, 'a', t, 0)) { f.met = obj(f, new THREE.Mesh(new THREE.IcosahedronGeometry(.7, 1), fxM('meteor', { color: LC('#3a2a22'), emissive: LC('#ff6a1a'), emissiveIntensity: .8, flatShading: true, roughness: .9 })), f.x0 + 14, f.y0 + 26, f.z0 + 6); sfx(f, 'falling'); }
    const k = cl(t / .75, 0, 1); f.met.position.set(lp(f.x0 + 14, f.x0, k), lp(f.y0 + 26, f.y0 + .6, k), lp(f.z0 + 6, f.z0, k)); f.met.rotation.x += .2; f.met.visible = !f.b;
    if (!f.b) { burst('spark', [f.met.position.x, f.met.position.y, f.met.position.z], 4, { col: [1, .6, .2], size: .3, sp: .6, g: 0, life: .4 }); burst('dust', [f.met.position.x, f.met.position.y, f.met.position.z], 1, { col: [.4, .35, .35], size: .6, sp: .2, g: -.4, grow: 1.4, a: .5, life: 1 }); limpP(f.P, .2); }
    if (cue(f, 'b', t, .75)) { breakApart(f.P, f.m, { power: 2.2, quiet: true }); gone(f); X.shake = 1; burst('spark', [f.x0, f.gy + .4, f.z0], 60, { col: [1, .7, .3], size: .2, sp: 9, up: 2, g: 6, life: 1 }); burst('dust', [f.x0, f.gy + .4, f.z0], 30, { col: [.45, .4, .35], size: 1, sp: 3, up: .5, g: .1, grow: 1.6, a: .6, life: 1.6 });
      f.crater = obj(f, new THREE.Mesh(new THREE.RingGeometry(.3, 1.8, 28), fxM('crater', { color: LC('#2a2420'), roughness: 1, transparent: true, opacity: .85 })), f.x0, f.gy + .04, f.z0); f.crater.rotation.x = -Math.PI / 2; f.crater.castShadow = false; say(f, 'KABOOM!', '#ffb02e', 2.8); sfx(f, 'boom'); }
  } };
  FX.voidstring = { dur: 2.4, hi: 1.6, step(f, t) {
    if (cue(f, 'a', t, 0)) { f.hole = obj(f, new THREE.Mesh(new THREE.SphereGeometry(.5, 20, 14), new THREE.MeshBasicMaterial({ color: '#000000' })), f.x0 + f.back.x * 1.6, f.y0 + 1.1, f.z0 + f.back.z * 1.6); f.hole.castShadow = false;
      f.disk = obj(f, new THREE.Mesh(new THREE.RingGeometry(.5, 1.3, 40), new THREE.MeshBasicMaterial({ color: '#5a1fb8', transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false })), f.hole.position.x, f.hole.position.y, f.hole.position.z); f.disk.castShadow = false; f.disk.rotation.x = 1.2; sfx(f, 'void'); }
    const g = sm(cl(t / .35, 0, 1)) * (t > 1.7 ? Math.max(0, 1 - (t - 1.7) * 2.5) : 1); f.hole.scale.setScalar(g); f.disk.scale.setScalar(g * (1 + Math.sin(t * 12) * .05)); f.disk.rotation.z = t * 4;
    const k = sm(cl((t - .3) / 1.1, 0, 1)), P = f.P, hx = f.hole.position.x, hz = f.hole.position.z; P.root.position.set(lp(f.x0, hx, k), lp(f.y0, f.y0 + .6, k), lp(f.z0, hz, k)); P.root.rotation.set(k * 3, f.m.yaw + k * 9, k * 2); P.root.scale.setScalar(Math.max(.01, 1 - k)); limpP(P, 1);
    for (let j = 0; j < 3; j++) { const a = Math.random() * TAU, r = 2 + Math.random(); burst('spark', [hx + Math.cos(a) * r, f.y0 + 1.1 + (Math.random() - .5) * 2, hz + Math.sin(a) * r], 1, { col: [.7, .4, 1], size: .1, sp: .1, vx: -Math.cos(a) * r * 2, vz: -Math.sin(a) * r * 2, g: 0, life: .4 }); }
    if (cue(f, 'b', t, .3)) say(f, 'GONE!', '#d29bff', 2.6);
    if (cue(f, 'c', t, 1.4)) gone(f);
    if (cue(f, 'd', t, 2.05)) { burst('star', [hx, f.y0 + 1.1, hz], 24, { col: [.8, .5, 1], size: .2, sp: 4, g: 0, life: .5 }); sfx(f, 'pop'); }
  } };
