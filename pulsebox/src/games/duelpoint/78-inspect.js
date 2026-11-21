  /* ---------- 78 inspect: looking over a Legendary, a Mythic or a Paragon (Y) ----------
     Every line from Legendary up has an inspect of its own: its own way of turning the gun over (kf: keyframes
     [q, dx, dy, dz, rx, ry, rz] on top of where the gun is held), its own show of light (fx, run every frame with q going
     0..1) and its own sound (snd). The 22 are in 78-inspects; this file is what they are made with.
     One rig serves whichever gun is being looked over (yours in a match, or the one on the locker's turntable): two
     clouds of glowing points (flying sparks that are stepped here, and dots a script places itself each frame), and
     pools of glows, flat shapes, dark discs, crystals, rings and lightning. Shapes in `g` ride on the gun; those in `w`
     (and every point) live in the space round it, so embers rise straight up and a trail stays where it was left
     however the gun is turned. A script switches on what it wants each frame; whatever it does not ask for is off.
     Nothing is made until the first inspect, nothing is added per inspect but a few shared shapes, and it all comes off
     the gun the moment the inspect ends, is cut short, or the gun is put away. */
  const INS = { rig: null, tex: {}, sim: [190, 100, 150], dots: [80, 70, 30], cols: {} };
  const iC = c => INS.cols[c] || (INS.cols[c] = new THREE.Color(c).convertSRGBToLinear());
  const IUP = { x: 0, y: 1, z: 0 }, irs = () => Math.random() - .5, irr = (a, b) => a + Math.random() * (b - a);
  const rdir = () => { const u = Math.random() * 2 - 1, a = Math.random() * TAU, s = Math.sqrt(1 - u * u); return new THREE.Vector3(Math.cos(a) * s, u, Math.sin(a) * s); };
  const hueC = (h, l = .6) => new THREE.Color().setHSL(((h % 1) + 1) % 1, 1, l).convertSRGBToLinear();
  // the pictures the scripts use beyond the reload effects' own (77-skinfx), each drawn the first time it is wanted
  function insTex(k) {
    if (INS.tex[k]) return INS.tex[k];
    const T = (w, h, fn, rep) => { const t = canvasTex(w, h, (g, cw, ch) => { g.clearRect(0, 0, cw, ch); fn(g, cw, ch); }); t.wrapS = rep ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; t.wrapT = THREE.ClampToEdgeWrapping; return t; };
    const W = a => `rgba(255,255,255,${a})`, rad = (g, x, y, r, st) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); for (const [a, c] of st) gr.addColorStop(a, c); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    let t;
    if (k === 'wing') t = T(256, 256, (g, w, h) => {   // a raised wing: feathers hung along its arm, short by the root (bottom left), long and upswept at the tip
      g.translate(14, h - 44); const arm = q => [2 * (1 - q) * q * 36 + q * q * 140, 2 * (1 - q) * q * -112 + q * q * -150];
      for (let i = 15; i >= 0; i--) { const q = i / 15, [bx, by] = arm(q), a = lp(.5, -1.0, Math.pow(q, .8)), L = lp(56, 112, q); g.save(); g.translate(bx, by); g.rotate(a);
        const gr = g.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, W(1)); gr.addColorStop(.6, W(.85)); gr.addColorStop(1, W(.15)); g.fillStyle = gr;
        g.beginPath(); g.moveTo(0, -5); g.quadraticCurveTo(L * .55, -L * .13, L, 0); g.quadraticCurveTo(L * .55, L * .1, 0, 6); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(2, 0); g.lineTo(L * .93, 0); g.stroke(); g.restore(); }
      g.strokeStyle = W(1); g.lineWidth = 11; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(36, -112, 140, -150); g.stroke(); });
    else if (k === 'galaxy') t = T(256, 256, (g, w, h) => {   // two spiral arms of stars round a bright heart
      g.translate(w / 2, h / 2); g.lineCap = 'round';
      for (let arm = 0; arm < 2; arm++) { g.strokeStyle = W(.1); g.lineWidth = 26; g.beginPath(); for (let i = 0; i <= 60; i++) { const q = i / 60, a = arm * Math.PI + q * 5, r = 8 + q * 104; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); g.strokeStyle = W(.16); g.lineWidth = 9; g.stroke();
        for (let i = 0; i < 260; i++) { const q = Math.random(), a = arm * Math.PI + q * 5 + (Math.random() - .5) * .5, r = 8 + q * 104 + (Math.random() - .5) * 16 * q, s = .6 + Math.random() * 1.9; g.fillStyle = W((.35 + Math.random() * .65) * (1 - q * .5)); g.fillRect(Math.cos(a) * r - s / 2, Math.sin(a) * r - s / 2, s, s); } }
      rad(g, 0, 0, 44, [[0, W(1)], [.25, W(.7)], [1, W(0)]]); });
    else if (k === 'aurora') t = T(256, 128, (g, w, h) => {   // a curtain of light: bright at its foot, fading upward, in folds that wrap
      for (let x = 0; x < w; x++) { const b = .5 + .3 * Math.sin(x / w * TAU * 3 + 1) + .2 * Math.sin(x / w * TAU * 7 + 2.4), top = h * (.05 + .5 * (1 - b)), gr = g.createLinearGradient(0, top, 0, h); gr.addColorStop(0, W(0)); gr.addColorStop(.55, W(.35 * b)); gr.addColorStop(.92, W(.95 * b)); gr.addColorStop(1, W(0)); g.fillStyle = gr; g.fillRect(x, top, 1, h - top); } }, true);
    else if (k === 'rays') t = T(256, 256, (g, w, h) => {   // shafts of light from a sun
      g.translate(w / 2, h / 2); for (let i = 0; i < 44; i++) { const a = Math.random() * TAU, wd = .02 + Math.random() * .07, L = 60 + Math.random() * 66, gr = g.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L); gr.addColorStop(0, W(.5)); gr.addColorStop(1, W(0)); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - wd) * L, Math.sin(a - wd) * L); g.lineTo(Math.cos(a + wd) * L, Math.sin(a + wd) * L); g.fill(); }
      rad(g, 0, 0, 40, [[0, W(1)], [.4, W(.5)], [1, W(0)]]); });
    else if (k === 'corona') t = T(256, 256, (g, w, h) => {   // the ring of fire round a covered sun, with its streamers
      g.translate(w / 2, h / 2); for (let i = 0; i < 90; i++) { const a = Math.random() * TAU, wd = .012 + Math.random() * .04, L = 62 + Math.random() * Math.random() * 62, gr = g.createLinearGradient(Math.cos(a) * 52, Math.sin(a) * 52, Math.cos(a) * L, Math.sin(a) * L); gr.addColorStop(0, W(.55)); gr.addColorStop(1, W(0)); g.fillStyle = gr; g.beginPath(); g.moveTo(Math.cos(a - wd) * 52, Math.sin(a - wd) * 52); g.lineTo(Math.cos(a) * L, Math.sin(a) * L); g.lineTo(Math.cos(a + wd) * 52, Math.sin(a + wd) * 52); g.fill(); }
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 127); gr.addColorStop(0, W(0)); gr.addColorStop(.4, W(0)); gr.addColorStop(.425, W(1)); gr.addColorStop(.5, W(.5)); gr.addColorStop(.72, W(.1)); gr.addColorStop(1, W(0)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 127, 0, TAU); g.fill(); });
    else if (k === 'fan') t = T(256, 256, (g, w, h) => {   // white light split into its colours, fanning from the middle of the left edge
      for (let i = 0; i < 120; i++) { const q = i / 119, a = (q - .5) * 1.05, c = `hsla(${Math.round(q * 290)},100%,60%,`, gr = g.createLinearGradient(0, h / 2, Math.cos(a) * w, h / 2 + Math.sin(a) * w); gr.addColorStop(0, c + '.95)'); gr.addColorStop(.7, c + '.5)'); gr.addColorStop(1, c + '0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(Math.cos(a - .008) * w, h / 2 + Math.sin(a - .008) * w); g.lineTo(Math.cos(a + .008) * w, h / 2 + Math.sin(a + .008) * w); g.fill(); } });
    else if (k === 'cloud') t = T(128, 128, (g, w, h) => { for (let i = 0; i < 9; i++) rad(g, 64 + (Math.random() - .5) * 60, 64 + (Math.random() - .5) * 40, 26 + Math.random() * 22, [[0, W(.75)], [.6, W(.4)], [1, W(0)]]); });
    else if (k === 'white') t = T(4, 4, (g, w, h) => { g.fillStyle = W(1); g.fillRect(0, 0, w, h); });
    else if (k === 'disc') t = T(128, 128, g => rad(g, 64, 64, 63, [[0, W(1)], [.93, W(1)], [1, W(0)]]));
    else if (k === 'flake') t = T(64, 64, g => { g.translate(32, 32); g.strokeStyle = W(1); g.lineCap = 'round'; for (let i = 0; i < 6; i++) { g.rotate(TAU / 6); g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -27); g.stroke(); g.lineWidth = 2; for (const y of [-11, -19]) { g.beginPath(); g.moveTo(-7, y - 6); g.lineTo(0, y); g.lineTo(7, y - 6); g.stroke(); } } });
    else if (k === 'crack') t = T(256, 96, (g, w, h) => {   // a crack running the length of the picture, with branches, glowing from inside
      const path = [[0, h / 2]]; for (let x = 20; x < w; x += 20) path.push([x, h / 2 + (Math.random() - .5) * 26]); path.push([w, h / 2]);
      const br = []; for (let i = 2; i < path.length - 2; i += 2) { const [x, y] = path[i], d = i % 4 ? 1 : -1; br.push([[x, y], [x + 12, y + d * 14], [x + 26, y + d * 20], [x + 34, y + d * 34]]); }
      g.lineJoin = g.lineCap = 'round'; for (const [lw, a] of [[18, .12], [9, .4], [3.5, .9], [1.5, 1]]) { g.strokeStyle = W(a); g.lineWidth = lw; g.beginPath(); path.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.lineWidth = lw * .6; for (const b of br) { g.beginPath(); b.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); } } });
    else if (k === 'beam') t = T(32, 256, (g, w, h) => { for (let x = 0; x < w; x++) { const a = Math.exp(-Math.pow((x - 15.5) / 5.5, 2)), gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, W(0)); gr.addColorStop(.35, W(.5 * a)); gr.addColorStop(.9, W(a)); gr.addColorStop(1, W(0)); g.fillStyle = gr; g.fillRect(x, 0, 1, h); } });
    return INS.tex[k] = t;
  }
  function insRig() {
    if (INS.rig) return INS.rig;
    const S = sfx(), g = new THREE.Group(), w = new THREE.Group(), sh = geo => { geo.userData.shared = true; return geo; };
    const cloud = (map, i) => {
      const n = INS.sim[i] + INS.dots[i], geo = sh(new THREE.BufferGeometry()), A = k => { const a = new THREE.BufferAttribute(new Float32Array(n * k), k); a.setUsage(THREE.DynamicDrawUsage); return a; };
      geo.setAttribute('position', A(3)); geo.setAttribute('tint', A(3)); geo.setAttribute('alpha', A(1)); geo.setAttribute('size', A(1)); geo.boundingSphere = new THREE.Sphere(V3(0, 0, 0), 9);
      const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: map }, scale: { value: 360 } }, vertexShader: RL_VS, fragmentShader: PT_FS, transparent: true, depthWrite: false, blending: i === 2 ? THREE.NormalBlending : THREE.AdditiveBlending });
      const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = i === 2 ? 2 : 5; w.add(pts);
      return { pts, mat, geo, n, simN: INS.sim[i], P: Array.from({ length: INS.sim[i] }, () => ({ age: 1, life: 0 })), nd: 0 };
    };
    const am = () => new THREE.MeshBasicMaterial(Object.assign({ map: S.glow, color: 0xffffff, opacity: 0, side: THREE.DoubleSide }, ADD()));
    const spm = () => new THREE.SpriteMaterial(Object.assign({ map: S.glow, opacity: 0 }, ADD()));
    const pool = (n, mk, par, ro = 3) => Array.from({ length: n }, () => { const o = mk(); o.visible = false; o.renderOrder = ro; o.frustumCulled = false; par.add(o); return o; });
    const rig = INS.rig = { g, w, gun: null, root: null, line: '', q: -1, t: 0, dur: 4, m: new THREE.Matrix4(), done: {}, acc: {}, ix: {}, gh: [], lightC: new THREE.Color(), lightP: new THREE.Vector3(), lightV: 0, boostV: 0, shakeV: 0, cam: new THREE.Vector3() };
    rig.cl = [cloud(S.dot, 0), cloud(S.star, 1), cloud(S.dot, 2)];
    rig.pl = pool(14, () => new THREE.Mesh(S.plane, am()), g); rig.plW = pool(14, () => new THREE.Mesh(S.plane, am()), w);
    rig.sp = pool(6, () => new THREE.Sprite(spm()), g); rig.spW = pool(14, () => new THREE.Sprite(spm()), w);
    rig.sh = pool(6, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: insTex('cloud'), color: 0x000000, transparent: true, depthWrite: false })), w, 1);
    rig.dk = pool(5, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: insTex('disc'), color: 0x000000, transparent: true, depthWrite: false })), w, 6);
    rig.cr = pool(10, () => new THREE.Mesh(S.oct, am()), g); rig.crW = pool(7, () => new THREE.Mesh(S.oct, am()), w);
    rig.to = pool(6, () => new THREE.Mesh(S.thin, am()), g);
    // lightning and drawn lines: a ribbon of twelve points, two corners at each, turned to face you every frame
    rig.ln = pool(13, () => { const ag = sh(new THREE.BufferGeometry()), ix = []; ag.setAttribute('position', new THREE.BufferAttribute(new Float32Array(72), 3)); for (let j = 0; j < 11; j++) ix.push(j * 2, j * 2 + 1, j * 2 + 2, j * 2 + 1, j * 2 + 3, j * 2 + 2); ag.setIndex(ix);
      const l = new THREE.Mesh(ag, new THREE.MeshBasicMaterial(Object.assign({ color: 0xffffff, side: THREE.DoubleSide }, ADD()))); l.userData.off = new Float32Array(36); l.userData.pt = new Float32Array(36); l.userData.t = -9; return l; }, w, 4);
    rig.wingG = sh(new THREE.PlaneGeometry(1, 1).translate(.5 - 14 / 256, .5 - 44 / 256, 0)); rig.fanG = sh(new THREE.PlaneGeometry(1, 1).translate(.5, 0, 0)); rig.beamG = sh(new THREE.PlaneGeometry(1, 1).translate(0, .5, 0));
    return rig;
  }
  // the inspect is over (or the gun has gone): everything comes off it, and its finish goes back to how it glows by itself
  function insEnd() {
    const rig = INS.rig; if (!rig || !rig.gun) return;
    if (rig.g.parent) rig.g.parent.remove(rig.g); if (rig.w.parent) rig.w.parent.remove(rig.w);
    for (const G2 of rig.gh) { if (G2.grp.parent) G2.grp.parent.remove(G2.grp); G2.mat.dispose(); } rig.gh.length = 0;
    if (rig.fin && !rig.driven) rig.fin.emissiveIntensity = rig.ei0;
    rig.gun = null; rig.root = null; rig.fin = null; rig.lightV = 0; rig.shakeV = 0; rig.q = -1;
  }
  function insBegin(rig, Gm, root, line, G) {
    insEnd(); const U = Gm.userData, L = LINES[line], D = INSPECT[line], S = sfx();
    rig.gun = Gm; rig.root = root; rig.line = line; rig.q = -1; rig.done = {}; rig.acc = {}; rig.dur = D.dur; rig.low = !!(X && X.low);
    rig.bright = root === X.vroot && !(MAP && THEMES[MAP.theme] && (THEMES[MAP.theme].stars || THEMES[MAP.theme].glow));   // a daylight map: glows get a little shade behind them
    Gm.add(rig.g); root.add(rig.w);
    for (const c of rig.cl) for (const p of c.P) { p.age = 1; p.life = 0; } for (const l of rig.ln) l.userData.t = -9;
    rig.cl[1].mat.uniforms.map.value = D.b === 'sq' ? S.sq : D.b === 'flake' ? insTex('flake') : S.star;
    const mats = SKMAT[U.k + '|' + line]; rig.fin = mats && mats.fin && mats.fin.emissiveMap ? mats.fin : null; rig.driven = ['pulse', 'flicker', 'surge', 'flowpulse'].includes(L.live); rig.ei0 = rig.fin ? rig.fin.emissiveIntensity : 1;
    const melee = !!G.melee, len = U.len || .3, ax = melee ? .004 : U.bore ? U.bore.y : .025, top = melee ? .03 : Math.max(ax + .03, (U.sight || ax + .05) - .012);
    const c1 = iC(L.rl ? L.rl.col : L.alt), c2 = iC(L.rl ? L.rl.col2 : '#ffffff');
    const use = k => { const a = rig[k], i = rig.ix[k] = (rig.ix[k] || 0) + 1; return a[i - 1] || null; };
    const paint = (m, col, op) => { m.color.copy(col); if (op > 1) m.color.multiplyScalar(op); m.opacity = cl(op, 0, 1); };
    const NB = THREE.NormalBlending, AB = THREE.AdditiveBlending;
    const plane = (k, bl) => (map, p, rot, sx, sy, col, op, geo) => { if (!(op > .004)) return null; const o = use(k); if (!o) return null; o.visible = true; o.geometry = geo || S.plane; o.material.map = map; o.material.blending = bl; o.renderOrder = bl === NB ? 2 : 3; o.position.copy(p); o.rotation.order = rot[3] || 'XYZ'; o.rotation.set(rot[0], rot[1], rot[2]); o.scale.set(sx, sy, 1); paint(o.material, col, op); return o; };
    const sprite = (k, bl) => (map, p, sx, sy, col, op, rot = 0) => { if (!(op > .004)) return null; if (k === 'spW' && bl === AB && sx >= .22 && rig.bright) c.shade(p, Math.max(sx, sy) * 1.5, .3 * Math.min(1, op)); const o = use(k); if (!o) return null; o.visible = true; o.material.map = map; o.material.rotation = rot; o.material.blending = bl; o.renderOrder = bl === NB ? 2 : 3; o.position.copy(p); o.scale.set(sx, sy, 1); paint(o.material, col, op); return o; };
    const crystal = (k, bl) => (p, s, rot, col, op) => { if (!(op > .004)) return null; const o = use(k); if (!o) return null; o.visible = true; o.material.map = insTex('white'); o.material.blending = bl; o.renderOrder = bl === NB ? 2 : 3; o.position.copy(p); o.scale.set(s[0], s[1], s[2]); o.rotation.set(rot[0], rot[1], rot[2]); paint(o.material, col, op); return o; };
    // twelve points (o.userData.pt) made a ribbon wd wide, facing the eye
    const ribbon = (o, wd, col, op) => { o.visible = true; o.material.color.copy(col).multiplyScalar(Math.max(0, op)); const P2 = o.userData.pt, A = o.geometry.attributes.position.array, cam = rig.cam, n = 12; let sx = 0, sy = 1, sz = 0;
      for (let j = 0; j < n; j++) { const j0 = Math.max(0, j - 1), j1 = Math.min(n - 1, j + 1), tx = P2[j1 * 3] - P2[j0 * 3], ty = P2[j1 * 3 + 1] - P2[j0 * 3 + 1], tz = P2[j1 * 3 + 2] - P2[j0 * 3 + 2], vx = cam.x - P2[j * 3], vy = cam.y - P2[j * 3 + 1], vz = cam.z - P2[j * 3 + 2];
        let cx = ty * vz - tz * vy, cy = tz * vx - tx * vz, cz = tx * vy - ty * vx; const L = Math.hypot(cx, cy, cz); if (L > 1e-7) { sx = cx / L; sy = cy / L; sz = cz / L; } const h = wd * .5 * (j === 0 || j === n - 1 ? .3 : 1);
        A[j * 6] = P2[j * 3] + sx * h; A[j * 6 + 1] = P2[j * 3 + 1] + sy * h; A[j * 6 + 2] = P2[j * 3 + 2] + sz * h; A[j * 6 + 3] = P2[j * 3] - sx * h; A[j * 6 + 4] = P2[j * 3 + 1] - sy * h; A[j * 6 + 5] = P2[j * 3 + 2] - sz * h; }
      o.geometry.attributes.position.needsUpdate = true; };
    const c = rig.ctx = {
      len, ax, top, melee, c1, c2, e: env, low: rig.low, k: U.k, st: {}, wingG: rig.wingG, fanG: rig.fanG, beamG: rig.beamG,
      P: (x, y, z) => new THREE.Vector3(x, y, z), W: v => v.clone().applyMatrix4(rig.m), along: f => lp(melee ? .02 : .04, -len, f),
      mz: V3(0, ax, -len), rc: V3(0, ax + .012, -len * (melee ? .5 : .3)), tp: V3(0, top, -len * (melee ? .5 : .3)), bk: V3(0, ax, .03),
      pl: plane('pl', AB), plW: plane('plW', AB), sp: sprite('sp', AB), spW: sprite('spW', AB), cr: crystal('cr', AB), crW: crystal('crW', AB),
      // the same, drawn solid in their own colour (they keep it against a bright sky, where light added to light goes white)
      pn: plane('pl', NB), pnW: plane('plW', NB), snW: sprite('spW', NB), cn: crystal('cr', NB), cnW: crystal('crW', NB),
      // a soft patch of shade behind a point (in the space round the gun), so what glows there shows against a bright day
      shade: (p, s, op) => { if (!(op > .004)) return; const o = use('sh'); if (!o) return; o.visible = true; o.position.copy(p); o.position.z -= .06; o.scale.set(s, s, 1); o.material.opacity = cl(op, 0, .8); },
      dk: (map, p, s, col, op) => { if (!(op > .004)) return null; const o = use('dk'); if (!o) return null; o.visible = true; o.material.map = map; o.position.copy(p); o.scale.set(s, s, 1); o.material.color.copy(col); o.material.opacity = cl(op, 0, 1); return o; },
      tor: (p, r, rot, col, op, solid) => { if (!(op > .004)) return null; const o = use('to'); if (!o) return null; o.visible = true; o.material.map = solid ? insTex('white') : S.glow; o.material.blending = solid ? NB : AB; o.position.copy(p); o.scale.setScalar(r); o.rotation.set(rot[0], rot[1], rot[2]); paint(o.material, col, op); return o; },
      // lightning from a to b (both in the space round the gun): its kinks hold for a moment, then it strikes afresh
      arc: (a, b, jit, col, op, hold = .05, wd = .007) => { if (!(op > .004)) return; const o = use('ln'); if (!o) return; const st = o.userData, n = 12, off = st.off, P2 = st.pt;
        if (!(rig.t - st.t < hold && rig.t >= st.t)) { st.t = rig.t; for (let j = 0; j < n; j++) { const k = j && j < n - 1 ? jit * Math.sin(j / (n - 1) * Math.PI) : 0; off[j * 3] = irs() * 2 * k; off[j * 3 + 1] = irs() * 2 * k; off[j * 3 + 2] = irs() * 2 * k; } }
        for (let j = 0; j < n; j++) { const u = j / (n - 1); P2[j * 3] = lp(a.x, b.x, u) + off[j * 3]; P2[j * 3 + 1] = lp(a.y, b.y, u) + off[j * 3 + 1]; P2[j * 3 + 2] = lp(a.z, b.z, u) + off[j * 3 + 2]; } ribbon(o, wd, col, op); },
      // a straight line of light, drawn from a as far as u (0..1) of the way to b
      line: (a, b, u, col, op, wd = .0045) => { if (!(op > .004) || u <= 0) return; const o = use('ln'); if (!o) return; const P2 = o.userData.pt; for (let j = 0; j < 12; j++) { const v = j / 11 * Math.min(1, u); P2[j * 3] = lp(a.x, b.x, v); P2[j * 3 + 1] = lp(a.y, b.y, v); P2[j * 3 + 2] = lp(a.z, b.z, v); } ribbon(o, wd, col, op); },
      // sparks: n of them, each set up by fn (place, speed, weight, life, size, colours); b picks the second cloud (stars, squares or flakes)
      emit: (n, fn, b = 0) => { n = Math.round(n); if (n <= 0) return; for (const p of rig.cl[b].P) { if (p.age < p.life) continue; p.age = 0; p.vx = p.vy = p.vz = 0; p.g = 0; p.drag = 0; p.pull = 0; p.s = .005; p.s1 = 1; p.col = c1; p.col2 = null; p.fade = 0; p.life = .5; p.a = 1; fn(p); if (--n <= 0) break; } },
      put: (p, v) => { p.x = v.x; p.y = v.y; p.z = v.z; }, to: (p, v, k) => { p.tx = v.x; p.ty = v.y; p.tz = v.z; p.pull = k; },
      rate: (key, per) => { const a = (rig.acc[key] || 0) + per * c.dt * (rig.low ? .55 : 1), n = Math.floor(a); rig.acc[key] = a - n; return n; },
      n: v => rig.low ? Math.ceil(v * .55) : v,
      once: (key, q0) => { if (rig.done[key] || c.q < q0) return false; rig.done[key] = 1; return c.q < q0 + .2; },
      // a dot placed by the script itself this frame
      dot: (p, s, col, a, b = 0) => { const C = rig.cl[b], i = C.simN + C.nd; if (i >= C.n || !(a > .004)) return; C.nd++; insPoint(C, i, p.x, p.y, p.z, col, a, s); },
      boost: v => { rig.boostV = Math.max(rig.boostV, v); }, shake: v => { rig.shakeV = Math.max(rig.shakeV, v); },
      light: (col, v, pGun) => { if (v <= rig.lightV) return; rig.lightV = v; rig.lightC.copy(col); rig.lightP.copy(pGun).applyMatrix4(rig.m); },
      lightW: (col, v, p) => { if (v <= rig.lightV) return; rig.lightV = v; rig.lightC.copy(col); rig.lightP.copy(p); },
      // a shaft of light from a to b (in the space round the gun), turned to face you along its length
      beam: (a, b, wd, col, op, map) => { if (!(op > .004)) return; const d = b.clone().sub(a), L = d.length(); if (L < 1e-5) return; const o = use('plW'); if (!o) return; d.multiplyScalar(1 / L); const side = d.clone().cross(rig.cam.clone().sub(a)).normalize(), nrm = side.clone().cross(d);
        o.visible = true; o.geometry = rig.beamG; o.material.map = map || insTex('beam'); o.position.copy(a); o.quaternion.setFromRotationMatrix((INS.mx || (INS.mx = new THREE.Matrix4())).makeBasis(side, d, nrm)); o.scale.set(wd, L, 1); paint(o.material, col, op); },
      // a copy of the gun's own body in pure light, riding on it a little out of place (set i; made the first time it is asked for)
      ghost: (i, col, op, dx, dy, dz, sc = 1) => { let G2 = rig.gh[i]; if (!G2) { const mat = new THREE.MeshBasicMaterial(Object.assign({ color: 0xffffff, opacity: 0 }, ADD())), grp = new THREE.Group(); for (const o of Gm.children) if (o.isMesh && o.userData.baked) grp.add(new THREE.Mesh(o.geometry, mat)); grp.renderOrder = 3; rig.g.add(grp); G2 = rig.gh[i] = { grp, mat }; }
        G2.grp.visible = op > .004; if (!G2.grp.visible) return; G2.grp.position.set(dx, dy, dz); G2.grp.scale.setScalar(sc); paint(G2.mat, col, op); },
    };
  }
  function insPoint(C, i, x, y, z, col, a, s) {
    const ga = C.geo.attributes, P = ga.position.array, T = ga.tint.array;
    P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; T[i * 3] = Math.pow(Math.max(0, col.r), .4545); T[i * 3 + 1] = Math.pow(Math.max(0, col.g), .4545); T[i * 3 + 2] = Math.pow(Math.max(0, col.b), .4545); ga.alpha.array[i] = cl(a, 0, 1); ga.size.array[i] = s * 1.75;
  }
  /* one frame of an inspect: q is how far through it is (0..1). root is the space round the gun (your view, or the
     turntable's scene) */
  function insFrame(Gm, root, line, q, dt, G, cam) {
    const D = INSPECT[line]; if (!D) return; const rig = insRig(); if (cam) rig.cam.copy(cam); else rig.cam.set(0, 0, 0);
    if (rig.gun !== Gm || rig.line !== line || q < rig.q - .02) insBegin(rig, Gm, root, line, G);
    const c = rig.ctx; rig.q = q; rig.t = q * rig.dur; c.q = q; c.t = rig.t; c.dt = dt = Math.min(dt, .05);
    for (const k of ['pl', 'plW', 'sp', 'spW', 'dk', 'sh', 'cr', 'crW', 'to', 'ln']) { for (const o of rig[k]) o.visible = false; rig.ix[k] = 0; }
    for (const G2 of rig.gh) G2.grp.visible = false; for (const C of rig.cl) { C.nd = 0; C.mat.uniforms.scale.value = screenScale(); }
    rig.lightV = 0; rig.boostV = 0; rig.shakeV = 0;
    Gm.updateWorldMatrix(true, false); root.updateWorldMatrix(true, false); rig.m.copy(root.matrixWorld).invert().multiply(Gm.matrixWorld);
    c.fw = V3(0, 0, -1).transformDirection(rig.m);   // which way the barrel points, in the space round the gun
    D.fx(c);
    // step the sparks and write both clouds out
    const tc = INS.tc || (INS.tc = new THREE.Color());
    for (const C of rig.cl) {
      const ga = C.geo.attributes, Al = ga.alpha.array, Sz = ga.size.array;
      for (let i = 0; i < C.simN; i++) { const p = C.P[i]; if (p.age >= p.life) { Al[i] = 0; Sz[i] = 0; continue; } p.age += dt; const k = Math.min(1, p.age / p.life);
        if (p.pull) { p.vx += (p.tx - p.x) * p.pull * dt; p.vy += (p.ty - p.y) * p.pull * dt; p.vz += (p.tz - p.z) * p.pull * dt; }
        p.vy += p.g * dt; if (p.drag) { const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; p.vz *= d; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const a = (p.fade === 1 ? Math.sin(k * Math.PI) : p.fade === 2 ? Math.min(1, k * 6) * (1 - k) : 1 - k) * p.a;
        insPoint(C, i, p.x, p.y, p.z, p.col2 ? tc.copy(p.col).lerp(p.col2, k) : p.col, a, p.s * lp(1, p.s1, k)); }
      for (let i = C.simN + C.nd; i < C.n; i++) { Al[i] = 0; Sz[i] = 0; }
      ga.position.needsUpdate = ga.tint.needsUpdate = ga.alpha.needsUpdate = ga.size.needsUpdate = true;
    }
    // the gun's own glow swells with the show
    if (rig.fin) { if (rig.driven) rig.fin.emissiveIntensity *= 1 + rig.boostV; else rig.fin.emissiveIntensity = rig.ei0 * (1 + rig.boostV); }
    if (LFX[line]) LFX[line].boost = rig.boostV;
  }
  // how the gun is turned through an inspect: the line's own keyframes, scaled to the kind of gun it is (a pistol is
  // brought closer, a long rifle held further off), with any shake the show asked for
  const INS_KS = { rifle: [1, 1, 1], sidearm: [.7, .9, .45], sniper: [1.1, 1, 1.25], shotgun: [1, 1, 1], melee: [.6, .8, .35] };
  function insPose(G, line, q) {
    const D = INSPECT[line], k = kfAt(D.kf, q), s = INS_KS[vkfKind(G, 'inspect')] || INS_KS.rifle, rig = INS.rig, sh = rig && rig.gun ? rig.shakeV : 0;
    return [k[0] * s[0] + irs() * sh, k[1] * s[1] + irs() * sh, k[2] * s[2], k[3] + irs() * sh * 4, k[4], k[5] + irs() * sh * 6];
  }
  // Y: look your gun over. A Legendary or better starts its own show (and its sound, which stops if the inspect is cut short)
  function startInspect(P) {
    const G = gun(P), sk = skinOfId(skinFor(P, G.k)), D = sk && INSPECT[sk.line] ? INSPECT[sk.line] : null;
    X.inspD = D ? D.dur : INSP_D; X.inspT = X.inspD; X.inspLine = D ? sk.line : null; insSound(D);
  }
  function insSound(D) {
    if (INS.gain) { try { INS.gain.gain.setTargetAtTime(0, K.ac.currentTime, .03); } catch (e) {} INS.gain = null; }
    if (!D || !D.snd || !canHear()) return; const gn = K.ac.createGain(); gn.gain.value = 1; gn.connect(outFor(null)); INS.gain = gn; try { D.snd(gn, D.dur); } catch (e) {}
  }
  // called once a frame from renderFrame, after the gun has been posed: run the show, or take it down
  function insView(P, G, dt) {
    const rig = INS.rig, on = X.inspT > 0 && X.inspLine && X.viewGun && X.viewGun.userData.line === X.inspLine && INSPECT[X.inspLine];
    if (on) insFrame(X.viewGun, X.vroot, X.inspLine, cl(1 - X.inspT / X.inspD, 0, 1), dt, G);
    else { if (rig && rig.gun && rig.root === X.vroot) insEnd(); if (X.inspLine && !(X.inspT > 0)) { X.inspLine = null; insSound(null); } }
  }
  // the light the show throws on the gun and your hands (the muzzle flash's lamp, borrowed while no shot is being fired)
  function insLight() {
    const vm = X.vmuzzle, rig = INS.rig;
    if (X.flashT > 0) { if (X.insLit) { vm.color.set('#ffcf8a'); vm.position.set(.1, -.05, -.8); X.insLit = false; } vm.intensity = 3; return; }
    if (rig && rig.gun && rig.root === X.vroot && rig.lightV > 0) { vm.intensity = Math.min(6, rig.lightV); vm.color.copy(rig.lightC); vm.position.copy(rig.lightP); X.insLit = true; return; }
    if (X.insLit) { vm.color.set('#ffcf8a'); vm.position.set(.1, -.05, -.8); X.insLit = false; } vm.intensity = 0;
  }
