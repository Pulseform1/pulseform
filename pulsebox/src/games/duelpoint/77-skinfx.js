  /* ---------- 77 skin effects: the glow the newer lines wear, every reload effect, the Paragon sounds ----------
     Cheap enough for an iPad. A line's glow materials and textures are made once and shared by every gun that wears it
     (so the whole line breathes and flows together, driven once a frame); its static glowing parts are merged into the
     gun's own draw calls by bake(); idle particles move in the vertex shader from one shared buffer per line, so they
     cost no work per frame and no buffers per gun. A reload (or a Mythic's inspect) borrows a rig from a small pool,
     hangs it on the gun, and hands it back the moment the reload ends, is cancelled, the fighter dies, or the gun is
     swapped out or dropped (a rig nobody touched last frame is collected), so nothing lingers and nothing leaks. */
  const SFX = {}, LFX = {}, MR = Math.random, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const lcF = c => new THREE.Color(c).convertSRGBToLinear();
  const ADD = () => ({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  // the shared textures and shapes, drawn once
  function sfx() {
    if (SFX.glow) return SFX;
    const T = (w, h, fn) => { const t = canvasTex(w, h, (g, cw, ch) => { g.clearRect(0, 0, cw, ch); fn(g, cw, ch); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
    const rad = (g, w, h, st) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); for (const [a, c] of st) gr.addColorStop(a, c); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
    const W = a => `rgba(255,255,255,${a})`;
    SFX.glow = T(128, 128, (g, w, h) => rad(g, w, h, [[0, W(1)], [.12, W(.85)], [.35, W(.3)], [.7, W(.07)], [1, W(0)]]));
    SFX.dot = T(64, 64, (g, w, h) => rad(g, w, h, [[0, W(1)], [.25, W(.9)], [.55, W(.35)], [1, W(0)]]));
    SFX.sq = T(32, 32, g => { g.fillStyle = W(.3); g.fillRect(3, 3, 26, 26); g.fillStyle = W(1); g.fillRect(8, 8, 16, 16); });
    SFX.star = T(64, 64, (g, w, h) => { rad(g, w, h, [[0, W(1)], [.18, W(.5)], [.45, W(0)]]); g.fillStyle = W(.95); for (const [a, b] of [[30, 3], [3, 30]]) { g.beginPath(); g.ellipse(32, 32, a, b, 0, 0, TAU); g.fill(); } });
    SFX.ring = T(128, 128, (g, w, h) => rad(g, w, h, [[0, W(0)], [.6, W(0)], [.78, W(.55)], [.86, W(1)], [.9, W(.6)], [1, W(0)]]));
    // a circle of runes: two rings, sixteen glyphs between them, ticks inside, a star at the heart
    SFX.rune = T(256, 256, g => {
      g.translate(128, 128); g.strokeStyle = W(1); g.shadowColor = W(1); g.shadowBlur = 6; g.lineCap = 'round';
      for (const [r, lw] of [[122, 3], [112, 1.5], [78, 2.5], [70, 1]]) { g.lineWidth = lw; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
      for (let i = 0; i < 16; i++) { g.save(); g.rotate(i / 16 * TAU); g.translate(0, -95); g.lineWidth = 2.2; g.beginPath(); const s = 7, seed = (i * 7919) % 13;
        g.moveTo(-s * .2, -s); g.lineTo(-s * .2, s); if (seed & 1) { g.moveTo(-s * .2, -s * .3); g.lineTo(s * .7, -s); } if (seed & 2) { g.moveTo(-s * .2, s * .2); g.lineTo(s * .7, s * .8); } if (seed & 4) { g.moveTo(s * .7, -s); g.lineTo(s * .7, s * .3); } if (seed & 8) { g.moveTo(-s * .8, 0); g.lineTo(s * .3, 0); } g.stroke(); g.restore(); }
      for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, r0 = i % 4 ? 62 : 54; g.lineWidth = 1.2; g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * 68, Math.sin(a) * 68); g.stroke(); }
      g.lineWidth = 1.6; g.beginPath(); for (let i = 0; i <= 6; i++) { const a = i * 2 / 6 * TAU * 1.5 - Math.PI / 2; g.lineTo(Math.cos(a) * 46, Math.sin(a) * 46); } g.stroke(); g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.stroke(); });
    // a portal: spiral arms winding into a bright rim
    SFX.portal = T(256, 256, g => { g.translate(128, 128); const gr = g.createRadialGradient(0, 0, 10, 0, 0, 126); gr.addColorStop(0, W(0)); gr.addColorStop(.75, W(.15)); gr.addColorStop(.92, W(.9)); gr.addColorStop(1, W(0)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 126, 0, TAU); g.fill();
      g.lineCap = 'round'; for (let k = 0; k < 5; k++) { g.strokeStyle = W(.85); g.lineWidth = 3.5; g.beginPath(); for (let i = 0; i <= 40; i++) { const q = i / 40, a = k / 5 * TAU + q * 4.2, r = 18 + q * 100; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); } });
    // a tear in the air: a jagged bright seam with a glow round it
    SFX.tear = T(64, 256, (g, w, h) => { const pts = []; for (let y = 0; y <= h; y += 16) pts.push([w / 2 + (y && y < h ? (MR() - .5) * 18 : 0), y]); for (const [lw, a] of [[22, .18], [12, .4], [5, .9], [2, 1]]) { g.strokeStyle = W(a); g.lineWidth = lw; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); } });
    // energy running along a strip: soft dashes that wrap
    SFX.flow = canvasTex(256, 16, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 4; i++) { const x0 = i * w / 4, gr = g.createLinearGradient(x0, 0, x0 + w / 4, 0); gr.addColorStop(0, W(.15)); gr.addColorStop(.55, W(.5)); gr.addColorStop(.82, W(1)); gr.addColorStop(1, W(.15)); g.fillStyle = gr; g.fillRect(x0, 3, w / 4, h - 6); } g.fillStyle = W(.6); g.fillRect(0, 7, w, 2); }, [1, 1]);
    SFX.plane = new THREE.PlaneGeometry(1, 1); SFX.oct = new THREE.OctahedronGeometry(1, 0); SFX.box = new THREE.BoxGeometry(1, 1, 1); SFX.sph = new THREE.SphereGeometry(1, 12, 8);
    SFX.thin = new THREE.TorusGeometry(1, .05, 6, 40); for (const k of ['plane', 'oct', 'box', 'sph', 'thin']) SFX[k].userData.shared = true;   // used by every gun: never freed with one
    return SFX;
  }
  // points that glow: each has a colour, an alpha and a size in metres (so they shrink with distance like everything else)
  const PT_FS = 'uniform sampler2D map; varying vec3 vC; varying float vA; void main() { float a = texture2D(map, gl_PointCoord).a * vA; if (a < .015) discard; gl_FragColor = vec4(vC, a); }';
  const RL_VS = 'attribute float alpha; attribute float size; attribute vec3 tint; uniform float scale; varying vec3 vC; varying float vA; void main() { vC = tint; vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * projectionMatrix[1][1] * scale / max(.02, -mv.z); gl_Position = projectionMatrix * mv; }';
  /* idle particles, moved entirely in the shader: object z runs from 0 at the back of the gun to -1 at the muzzle, x and
     y are metres off the barrel. mode 0 sparks spat off the barrel, 1 motes circling it, 2 frost drifting down, 3 spirit
     wisps rising and swaying, 4 pixels blinking on the surface, 5 runes rising round it */
  const IDLE_VS = `attribute vec4 seed; uniform float t, scale, mode; uniform vec3 c1, c2; varying vec3 vC; varying float vA;
    void main() {
      float sp = .3 + seed.y * .45, ph = fract(t * sp + seed.x * 7.13), f1 = fract(seed.x * 3.7 + seed.z * .37), s = .004 + seed.w * .003, a = sin(ph * 3.14159);
      vec3 p;
      if (mode < .5) { p = vec3((seed.z - .5) * .02 + sin(ph * 11. + seed.x * 40.) * .003, .006 + pow(ph, 1.4) * .065, -(.45 + .55 * f1)); a = (1. - ph) * (.6 + .4 * sin(t * 30. + seed.x * 50.)); s *= .8; }
      else if (mode < 1.5) { float an = t * (.6 + seed.y) + seed.x * 6.283; float r = .03 + seed.z * .022; p = vec3(cos(an) * r, sin(an * 1.3) * r * .8, -(.25 + .7 * fract(seed.x * 5.1 + t * .03))); a = .55 + .45 * sin(t * 3. + seed.x * 20.); }
      else if (mode < 2.5) { p = vec3((seed.z - .5) * .07 + sin(t + seed.x * 9.) * .008, .05 - ph * .11, -(.15 + .85 * f1)); s *= .85; }
      else if (mode < 3.5) { p = vec3(sin(ph * 6. + seed.x * 20.) * .01 * ph, ph * .085, -(.12 + .78 * f1)); s = (.006 + .009 * ph) * (1. - ph * .45); a = pow(a, 1.5); }
      else if (mode < 4.5) { float an = seed.z * 6.283, r = .018 + seed.w * .012; p = vec3(cos(an) * r, sin(an) * r * .75 + .006, -(.08 + .88 * f1)); a = step(.55, fract(t * (1.2 + seed.y * 2.) + seed.x)); s = .0028; }
      else { float an = t * .5 + seed.x * 6.283, r = .034 + seed.z * .01; p = vec3(cos(an) * r, -.012 + ph * .08, -(.3 + .55 * f1)); s = .0055; }
      vA = a; vC = seed.w > .6 ? c2 : c1;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = s * projectionMatrix[1][1] * scale / max(.02, -mv.z); gl_Position = projectionMatrix * mv;
    }`;
  const IDLE_MODE = { sparks: 0, motes: 1, frost: 2, wisps: 3, pixels: 4, runes: 5 };
  // one buffer of seeds per size, shared by every gun
  function idleGeo(n) {
    const key = 'idle' + n; if (SFX[key]) return SFX[key];
    const g = new THREE.BufferGeometry(), sd = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) sd[i] = MR();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('seed', new THREE.BufferAttribute(sd, 4)); g.boundingSphere = new THREE.Sphere(V3(0, 0, 0), 4); g.userData.shared = true; return SFX[key] = g;
  }
  const screenScale = () => X && X.renderer ? X.renderer.domElement.height / 2 : 360;
  // a line's glow, shared: materials made once and driven once a frame
  function lineFx(line) {
    if (LFX[line]) return LFX[line];
    const L = LINES[line], gk = L.gk || {}, S = sfx(), tier = RARITY[L.r].tier, ca = lcF(L.alt), cb = lcF(gk.c2 || '#ffffff');
    const F = { tier }, ft = S.flow.clone(); ft.needsUpdate = true; ft.wrapS = THREE.RepeatWrapping; ft.repeat.set(tier >= 4 ? 3 : 2, 1);
    F.glowA = new THREE.MeshBasicMaterial(Object.assign({ color: ca.clone() }, ADD()));
    F.glowB = new THREE.MeshBasicMaterial(Object.assign({ color: cb.clone() }, ADD()));
    F.flow = new THREE.MeshBasicMaterial(Object.assign({ color: ca.clone(), map: ft, side: THREE.DoubleSide }, ADD())); F.flow.userData.keepUV = true;
    F.halo = new THREE.SpriteMaterial(Object.assign({ map: S.glow, color: ca.clone() }, ADD()));
    F.haloB = new THREE.SpriteMaterial(Object.assign({ map: S.glow, color: cb.clone() }, ADD()));
    F.rune = new THREE.MeshBasicMaterial(Object.assign({ map: S.rune, color: ca.clone(), side: THREE.DoubleSide }, ADD()));
    F.tear = new THREE.MeshBasicMaterial(Object.assign({ map: S.tear, color: cb.clone(), side: THREE.DoubleSide }, ADD()));
    F.glass = new THREE.MeshPhysicalMaterial({ color: lcF('#e4eef6'), roughness: .04, metalness: 0, transparent: true, opacity: .3, clearcoat: 1, depthWrite: false }); if (X && X.env) { F.glass.envMap = X.env; F.glass.envMapIntensity = 1.4; }
    F.shard = new THREE.MeshPhysicalMaterial({ color: lcF('#0a0812'), emissive: ca.clone(), emissiveIntensity: .6, roughness: .08, metalness: .5, clearcoat: 1, flatShading: true }); if (X && X.env) { F.shard.envMap = X.env; F.shard.envMapIntensity = 1.6; }
    F.ice = new THREE.MeshPhysicalMaterial({ color: lcF('#d8f0ff'), emissive: ca.clone(), emissiveIntensity: .5, roughness: .05, metalness: 0, clearcoat: 1, transparent: true, opacity: .85, flatShading: true }); if (X && X.env) { F.ice.envMap = X.env; F.ice.envMapIntensity = 1.6; }
    if (gk.pts) F.pts = new THREE.ShaderMaterial({ uniforms: { t: { value: 0 }, scale: { value: 360 }, mode: { value: IDLE_MODE[gk.pts] || 0 }, map: { value: gk.pts === 'pixels' ? S.sq : S.dot }, c1: { value: new THREE.Color(L.alt) }, c2: { value: new THREE.Color(gk.c2 || '#ffffff') } },
      vertexShader: IDLE_VS, fragmentShader: PT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const sp = tier >= 5 ? 2.6 : tier >= 4 ? 2.1 : 1.6, fsp = tier >= 5 ? 1.1 : tier >= 4 ? .8 : .5;
    SKIN_LIVE.push(t => {
      // it breathes; a Paragon's heart also beats
      const k = .8 + .2 * Math.sin(t * sp) + (tier >= 5 ? .35 * Math.pow(Math.max(0, Math.sin(t * sp * .5)), 12) : 0);
      F.glowA.color.copy(ca).multiplyScalar(.85 + .45 * k); F.glowB.color.copy(cb).multiplyScalar(.6 + .4 * k); F.flow.color.copy(ca).multiplyScalar(.9 + .5 * k);
      F.halo.opacity = .45 + .4 * k; F.haloB.opacity = .35 + .35 * k; F.rune.opacity = .6 + .35 * k; F.tear.opacity = .7 + .3 * Math.sin(t * 17) * Math.sin(t * 5.3);
      F.shard.emissiveIntensity = .4 + .5 * k; F.ice.emissiveIntensity = .3 + .4 * k;
      ft.offset.x = -(t * fsp) % 1;   // light runs toward the muzzle
      if (F.pts) { F.pts.uniforms.t.value = t; F.pts.uniforms.scale.value = screenScale(); }
    });
    return LFX[line] = F;
  }
  /* the glow kit, built onto a gun (h carries skinKit's measures: the gun's box, barrel length, bore height, the surface
     under a point, a point along it, and its add and live helpers) */
  function glowKit(G, K2, k, line, h, gko) {
    const L = LINES[line], gk = gko || L.gk, F = lineFx(line), S = sfx(), tier = F.tier, low = !!(X && X.low), { bb, len, ax, topAt, along, add, live } = h;
    // the gun's own side under a point: sx -1 is the side you see in first person (and in the store)
    const ray = new THREE.Raycaster(), sideAt = (y, z, sx = 1) => { ray.set(V3(sx > 0 ? bb.max.x + .2 : bb.min.x - .2, y, z), V3(-sx, 0, 0)); const q = ray.intersectObjects(h.meshes, false)[0]; return q ? Math.abs(q.point.x) : null; };
    const sprite = (mat, x, y, z, s) => { const sp = new THREE.Sprite(mat); sp.position.set(x, y, z); sp.scale.setScalar(s); sp.userData.live = true; K2.add(sp); return sp; };
    const strip = (x0, z0, z1, y, wd, face) => {   // a lit strip: u runs from the back to the front, so its light flows to the muzzle
      const g = new THREE.PlaneGeometry(Math.abs(z0 - z1), wd); if (face === 'top') g.rotateX(-Math.PI / 2); else if (face < 0) g.rotateX(Math.PI); g.rotateY(Math.PI / 2);
      const o = new THREE.Mesh(g, F.flow); o.position.set(x0, y, (z0 + z1) / 2); K2.add(o); return o; };
    const sights = G.userData.sightGlow = [], keep = o => { o.userData.live = true; return o; };
    // energy strips down each side of the receiver, in short runs that hug the body, and along the top of the barrel
    if (gk.strips) {
      const ys = ax + .002, segs = 3, za = along(.16), zb = along(.6);
      for (let i = 0; i < segs; i++) { const z0 = lp(za, zb, i / segs), z1 = lp(za, zb, (i + 1) / segs) + .004; for (const sx of [1, -1]) { const xs = [z0, (z0 + z1) / 2, z1].map(z => sideAt(ys, z, sx)).filter(v => v != null); if (xs.length) strip(sx * (Math.max(...xs) + .0012), z0, z1, ys, .0034, sx); } }
      if (gk.strips >= 3) for (let i = 0; i < 4; i++) { const z0 = along(.56 + i * .09), z1 = along(.56 + (i + 1) * .09) + .003, ys2 = [topAt(z0), topAt(z1), topAt((z0 + z1) / 2)]; if (Math.max(...ys2) - Math.min(...ys2) < .008) strip(0, z0, z1, Math.max(...ys2) + .0009, .0032, 'top'); }   // only where the top runs flat
    }
    // glowing rings round the barrel, the last one turning on the rarest
    for (let i = 0; i < (gk.rings || 0); i++) { const z = along(Math.min(.96, .8 + i * .06)), r = cl(h.rAt(z) + .0032, .01, .034); add(new THREE.TorusGeometry(r, .0016, 6, 24), F.glowA, 0, ax, z); }
    if (gk.rings && tier >= 4) { const z = h.tip + .006, r = cl(h.rM + .009, .016, .04); live(add(new THREE.TorusGeometry(r, .0011, 6, 32), F.glowB, 0, ax, z), (o, t) => { o.rotation.set(Math.sin(t * 1.3) * .5, Math.cos(t * 1.1) * .5, t * 2); }); }
    // an energy cell on the receiver: a glowing core in a glass tube with caps, and its halo
    for (let i = 0; i < (gk.cell || 0); i++) { const sx = i ? 1 : -1, z = along(.33), y = ax - .006, xs = sideAt(y, z, sx); if (xs == null) continue; const x = sx * (xs + .0062);
      add(new THREE.CylinderGeometry(.0034, .0034, .03, 10), F.glowA, x, y, z, Math.PI / 2); add(new THREE.CylinderGeometry(.0055, .0055, .032, 12, 1, true), F.glass, x, y, z, Math.PI / 2);
      for (const dz of [-.017, .017]) add(new THREE.CylinderGeometry(.006, .006, .004, 12), h.m.dark || h.m.acc, x, y, z + dz, Math.PI / 2);
      if (!low) sprite(F.halo, x + sx * .003, y, z, .03); }
    // halos: on the sight (hidden while you aim down it) and at the muzzle
    if (gk.sight) { const z = along(.2), sp = sprite(F.haloB, 0, topAt(z) + .005, z, .022); sights.push(sp); }
    if (gk.muzzle) sprite(F.halo, 0, ax, along(1) - .006, low ? .03 : .045);
    // drifting particles, moved by the shader
    if (gk.pts && F.pts && !low) { const p = new THREE.Points(idleGeo(18), F.pts); p.position.set(0, ax + .004, bb.max.z); p.scale.set(1, 1, bb.max.z + len); p.frustumCulled = false; p.userData.live = true; K2.add(p); }
    // the signature piece
    const zc = along(.42), yTop = topAt(zc);
    if (gk.sig === 'star') {   // a captive star over the receiver: a white-hot core in a gyroscope of three rings, and plasma vents
      const FA = h.formAt, gy = new THREE.Group(); if (FA) gy.position.set(FA.x, FA.y, FA.z); else gy.position.set(0, yTop + .034, zc); K2.add(gy); gy.userData.live = true;
      const core = keep(new THREE.Mesh(SFX.sph, F.glowB)); core.scale.setScalar(.0055); gy.add(core); const hs = new THREE.Sprite(F.halo); hs.scale.setScalar(.05); gy.add(hs);
      const rings = (low ? [.019] : [.014, .019, .024]).map((r, i) => { const o = keep(new THREE.Mesh(SFX.thin, i === 1 ? F.glowB : F.glowA)); o.scale.setScalar(r); gy.add(o); return o; });
      gy.userData.anim = (o, t) => { rings[0].rotation.set(t * 2.1, t * .7, 0); if (rings[2]) { rings[1].rotation.set(t * .6, t * 1.7 + 1, t * .4); rings[2].rotation.set(-t * .9, .5, t * 1.4); } core.scale.setScalar(.0055 * (1 + .25 * Math.sin(t * 9))); hs.scale.setScalar(.045 + .012 * Math.sin(t * 2.6)); o.position.y = yTop + .034 + Math.sin(t * 1.6) * .003; };
      for (let i = 0; i < 4; i++) { const z = along(.62 + i * .055); for (const sx of [-1, 1]) { const xs = sideAt(ax, z, sx); if (xs != null) add(new THREE.BoxGeometry(.0012, .0035, .016), F.glowB, sx * (xs + .0004), ax + .002, z); } }
    }
    else if (gk.sig === 'rift') {   // a tear hanging over the receiver, black glass shards circling it
      const FA = h.formAt, gy = new THREE.Group(); if (FA) gy.position.set(FA.x, FA.y, FA.z); else gy.position.set(0, yTop + .036, zc); K2.add(gy); gy.userData.live = true;
      const tear = keep(new THREE.Mesh(SFX.plane, F.tear)); tear.scale.set(.012, .048, 1); tear.rotation.y = Math.PI / 2; gy.add(tear); const hs = new THREE.Sprite(F.halo); hs.scale.setScalar(.055); gy.add(hs);
      const sh = [0, 1, 2, 3].map(i => { const o = keep(new THREE.Mesh(SFX.oct, F.shard)); o.scale.set(.0035, .008, .0035); gy.add(o); return o; });
      gy.userData.anim = (o, t) => { tear.scale.x = .01 + .005 * Math.abs(Math.sin(t * 3.1)) + (Math.sin(t * 23) > .9 ? .006 : 0); sh.forEach((s, i) => { const a = t * 1.2 + i * TAU / 4; s.position.set(Math.cos(a) * .022, Math.sin(a * 1.7 + i) * .012, Math.sin(a) * .022); s.rotation.set(t * 2 + i, t * 1.3, 0); }); o.position.y = yTop + .036 + Math.sin(t * 1.3) * .003; };
    }
    else if (gk.sig === 'glyph') {   // circles of runes turning round the barrel, and runestones orbiting it
      const FA = h.formAt;
      if (FA && !FA.ring) {   // a top line on a short gun: the circles turn on its flanks instead, clear of the sights
        for (const sx of [-1, 1]) { const r = live(add(SFX.plane, F.rune, sx * (FA.hw + .001), ax, FA.z1, 0, Math.PI / 2, 0), (o, t) => { o.rotation.x = sx * t * .6; }); r.scale.setScalar(FA.med); }
      } else {
        const R = FA ? FA.R : .0375, z1 = FA ? FA.z1 : along(.74), z2 = FA ? FA.z2 : along(.93), zs = FA ? (FA.z1 + FA.z2) / 2 : along(.5);
        const r1 = live(add(SFX.plane, F.rune, 0, ax, z1), (o, t) => { o.rotation.z = t * .6; }); r1.scale.setScalar(R * 2);
        const r2 = live(add(SFX.plane, F.rune, 0, ax, z2), (o, t) => { o.rotation.z = -t * 1.1; }); r2.scale.setScalar(R * 1.35);
        for (let i = 0; i < 3; i++) live(add(SFX.box, F.glowA, 0, 0, 0), (o, t) => { const a = t * .8 + i * TAU / 3; o.position.set(Math.cos(a) * R * 1.05, ax + Math.sin(a) * R * 1.05, zs + Math.sin(t * 1.3 + i) * .02); o.rotation.set(t, a, 0); }).scale.set(.004, .009, .0025);
      }
    }
    else if (gk.sig === 'crescent') {   // a silver crescent moon riding over the receiver
      const c = live(add(new THREE.TorusGeometry(.013, .0026, 6, 24, Math.PI * 1.25), F.glowA, 0, yTop + .03, zc, 0, Math.PI / 2, 0), (o, t) => { o.position.y = yTop + .03 + Math.sin(t * 1.4) * .003; o.rotation.x = Math.sin(t * .7) * .2; });
      sprite(F.haloB, 0, yTop + .03, zc, .04); c.rotation.z = -.6;
    }
    else if (gk.sig === 'icicles') {   // glowing ice grown along the top
      for (let i = 0; i < 6; i++) { const z = along(.2 + i * .1), s = .009 + (i % 3) * .004, o = add(SFX.oct, F.ice, (i % 2 - .5) * .006, topAt(z) + s * .7, z, i * .3, i, i * .2); o.scale.set(s * .55, s * 1.8, s * .7); }
    }
    else if (gk.sig === 'fans') {   // two RGB fans in the side of the receiver
      for (const q of [.28, .44]) { const z = along(q), xs = sideAt(ax - .004, z, -1); if (xs == null) continue; const fx = new THREE.Group(); fx.position.set(-xs - .0016, ax - .004, z); fx.rotation.y = -Math.PI / 2; K2.add(fx); fx.userData.live = true;
        const rg = new THREE.Mesh(SFX.thin, F.glowA); rg.scale.setScalar(.0105); fx.add(rg); const hub = new THREE.Group(); fx.add(hub);
        for (let i = 0; i < 5; i++) { const bl = new THREE.Mesh(SFX.box, h.m.dark || h.m.acc); bl.scale.set(.0022, .0085, .0008); bl.position.set(Math.cos(i / 5 * TAU) * .005, Math.sin(i / 5 * TAU) * .005, 0); bl.rotation.z = i / 5 * TAU + .5; hub.add(bl); }
        fx.userData.anim = (o, t) => { hub.rotation.z = -t * 14; }; }
    }
  }
  // the glow on a knife: a halo on the blade and particles drifting off it
  function knifeGlow(G, line) {
    const L = LINES[line], gk = L.gk, F = lineFx(line), low = !!(X && X.low), K2 = new THREE.Group(); G.add(K2);
    const sp = new THREE.Sprite(F.halo); sp.position.set(0, .004, -.13); sp.scale.setScalar(.06); sp.userData.live = true; K2.add(sp);
    if (gk.pts && F.pts && !low) { const p = new THREE.Points(idleGeo(14), F.pts); p.position.set(0, -.004, -.02); p.scale.set(.5, .5, .22); p.frustumCulled = false; p.userData.live = true; K2.add(p); }
    if (F.tier >= 4) { const r = new THREE.Mesh(SFX.thin, F.glowB); r.scale.setScalar(.022); r.position.set(0, .005, -.016); r.userData.live = true; r.userData.anim = (o, t) => { o.rotation.set(t * 1.5, t * .9, 0); }; K2.add(r); }
  }

  /* ---------- reload effects ----------
     The kinds, and what each does through a reload (r runs 0..1: the old magazine comes out by .22, the hand fetches a
     fresh one until .42, it rises and seats by .78, then the bolt or slide):
       ghost   the fresh magazine lit up as it arrives (hot: cools from white; scan: flickers like a hologram; flicker: like a neon tube)
       halo    a glow round the magazine that peaks as it seats;  shock: a ring blown outwards as it seats (2: a second, in the other colour)
       rune    a circle under the well that the magazine rises through (rune, portal, ring)
       parts   sparks, flame, suck (drawn in), spiral, voxel (falls apart, builds back), frost, glint, rise
       arcs    lightning between the magazine and the gun;  crys: ice crystals grow on the magazine and shatter */
  const RLK = {
    snap: { halo: .7, shock: 1, sweep: 0 },
    sparks: { halo: 1, shock: 1, ghost: .55, parts: ['sparks'] },
    flame: { halo: 1, shock: 1, ghost: .6, parts: ['flame'] },
    frost: { halo: 1, shock: 1, ghost: .5, parts: ['frost'], crys: 1 },
    bolt: { halo: 1, shock: 1, ghost: .7, parts: ['sparks'], arcs: 1 },
    void: { halo: 1, shock: 1, ghost: .8, parts: ['suck'] },
    digital: { halo: .9, shock: 1, ghost: 1, scan: 1, parts: ['voxel'] },
    runes: { halo: 1, ghost: .8, rune: 'rune', parts: ['rise'] },
    gold: { halo: 1, shock: 1, ghost: .7, parts: ['glint'] },
    motes: { halo: 1, shock: 1, ghost: .7, parts: ['spiral'] },
    cell: { halo: 1.1, shock: 1, ghost: 1.2, parts: ['spiral'] },
    neon: { halo: 1, shock: 1, ghost: 1.1, flicker: 1, parts: ['sparks'] },
    forge: { halo: 1.5, shock: 2, ghost: 1.5, hot: 1, rune: 'ring', parts: ['sparks', 'flame'] },
    rift: { halo: 1.4, shock: 2, ghost: 1.3, scan: 1, rune: 'portal', parts: ['voxel', 'suck'] },
    glyph: { halo: 1.4, shock: 2, ghost: 1.3, rune: 'rune', rune2: 1, parts: ['rise', 'spiral'] },
  };
  const RFX = { free: [], busy: [], frame: 0, cap: 10 }, RN = 56;
  function rfxRig() {
    const S = sfx(), g = new THREE.Group(), geo = new THREE.BufferGeometry(), A = k => { const a = new THREE.BufferAttribute(new Float32Array(RN * k), k); a.setUsage(THREE.DynamicDrawUsage); return a; };
    geo.setAttribute('position', A(3)); geo.setAttribute('tint', A(3)); geo.setAttribute('alpha', A(1)); geo.setAttribute('size', A(1)); geo.boundingSphere = new THREE.Sphere(V3(0, 0, 0), 4);
    const pm = new THREE.ShaderMaterial({ uniforms: { map: { value: S.dot }, scale: { value: 360 } }, vertexShader: RL_VS, fragmentShader: PT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, pm); pts.frustumCulled = false; geo.userData.shared = true;
    const am = map => new THREE.MeshBasicMaterial(Object.assign({ map, color: 0xffffff, opacity: 0, side: THREE.DoubleSide }, ADD()));
    const ring = new THREE.Mesh(S.plane, am(S.ring)), ring2 = new THREE.Mesh(S.plane, am(S.ring)), rune = new THREE.Mesh(S.plane, am(S.rune)), rune2 = new THREE.Mesh(S.plane, am(S.rune));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map: S.glow, opacity: 0 }, ADD())));
    const ghostM = new THREE.MeshBasicMaterial(Object.assign({ color: 0xffffff, opacity: 0 }, ADD())), crysM = new THREE.MeshBasicMaterial(Object.assign({ color: 0xffffff, opacity: .9 }, ADD()));
    const crys = []; for (let i = 0; i < 7; i++) crys.push(new THREE.Mesh(SFX.oct, crysM));
    const arcs = []; for (let i = 0; i < 2; i++) { const ag = new THREE.BufferGeometry(); ag.userData.shared = true; ag.setAttribute('position', new THREE.BufferAttribute(new Float32Array(30), 3)); const l = new THREE.Line(ag, new THREE.LineBasicMaterial(Object.assign({ color: 0xffffff }, ADD()))); l.frustumCulled = false; arcs.push(l); g.add(l); }
    const sw = new THREE.Mesh(S.plane, am(S.ring)), swh = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map: S.glow, opacity: 0 }, ADD())));
    for (const o of [pts, ring, ring2, rune, rune2, halo, sw, swh, ...arcs]) { o.renderOrder = 3; g.add(o); }
    return { g, pts, pm, ring, ring2, rune, rune2, halo, sw, swh, ghostM, crysM, crys, arcs, ghosts: [], P: Array.from({ length: RN }, () => ({ age: 1, life: 0 })), c1: new THREE.Color(), c2: new THREE.Color(), l1: new THREE.Color(), l2: new THREE.Color(), gun: null, stamp: 0 };
  }
  // where a gun's magazine (or cylinder) seats, and how big it is, measured once per gun
  function rfxAnchor(Gm) {
    const U = Gm.userData; if (U.rfxA) return U.rfxA; const pp = U.parts || {}, host = pp.mag || pp.cyl || null;
    let well, lc = V3(0, -.03, 0), size = V3(.03, .06, .04);
    if (host) { const box = new THREE.Box3(); for (const c of host.children) if (c.isMesh && !c.userData.rfx) { if (!c.geometry.boundingBox) c.geometry.computeBoundingBox(); box.union(c.geometry.boundingBox); } if (!box.isEmpty()) { box.getCenter(lc); box.getSize(size); } well = host.userData.p0.clone(); if (pp.mag) { lc.y = Math.min(lc.y, -size.y * .3); } }
    else if (pp.brk) { well = pp.brk.userData.p0.clone(); well.z += .03; }
    else if (pp.pump) well = V3(0, -.04, -.06);   // a pump gun loads shell by shell into the tube under it
    else well = V3(0, -.02, -.08);
    const w = Math.max(.024, Math.min(.06, Math.max(size.x, size.z))), hh = Math.max(.04, Math.min(.18, size.y));
    return U.rfxA = { host, mag: !!pp.mag, well, lc, w, h: hh, bottom: V3(well.x, well.y + (pp.mag ? -hh * .82 : -hh * .5), well.z), shells: !host && !!pp.pump };
  }
  function rfxTake(Gm, rl, mode, full) {
    let rig = RFX.free.pop();
    if (!rig && RFX.busy.length >= RFX.cap) { const lent = full && RFX.busy.find(q => !q.full); if (!lent) return null; rfxDrop(lent); rig = RFX.free.pop(); }   // all out: your own gun takes one back from a rival's
    if (!rig) rig = rfxRig();
    RFX.busy.push(rig); rig.gun = Gm; Gm.userData.rig = rig; Gm.add(rig.g); rig.g.visible = true;
    rig.mode = mode; rig.full = full; rig.low = !!(X && X.low); rig.K = RLK[rl.kind] || RLK.snap; rig.kind = rl.kind; rig.c1.set(rl.col); rig.c2.set(rl.col2); rig.A = rfxAnchor(Gm);
    rig.l1.copy(rig.c1).convertSRGBToLinear(); rig.l2.copy(rig.c2).convertSRGBToLinear();
    for (const p of rig.P) { p.age = 1; p.life = 0; } rig.q0 = -1; rig.done = {}; rig.acc = 0; rig.arcT = 0;
    const S = sfx(); rig.pm.uniforms.map.value = rig.K.parts && (rig.K.parts[0] === 'voxel' || rig.K.parts[0] === 'rise') ? S.sq : rig.K.parts && rig.K.parts[0] === 'glint' ? S.star : S.dot;
    rig.rune.material.map = rig.K.rune === 'portal' ? S.portal : rig.K.rune === 'ring' ? S.ring : S.rune; rig.rune2.material.map = S.rune;
    for (const o of [rig.ring, rig.ring2, rig.rune, rig.rune2, rig.halo, rig.sw, rig.swh]) { o.visible = false; o.material.opacity = 0; } for (const a of rig.arcs) a.visible = false;
    return rig;
  }
  function rfxGhosts(rig, on) {   // the lit copy of the magazine rides inside it, sharing its shapes
    const A = rig.A; if (!A.host) return;
    if (on && !rig.ghosts.length) { for (const c of A.host.children) if (c.isMesh && !c.userData.rfx) { const o = new THREE.Mesh(c.geometry, rig.ghostM); o.userData.rfx = true; o.position.copy(c.position).sub(A.lc).multiplyScalar(1.05).add(A.lc); o.quaternion.copy(c.quaternion); o.scale.copy(c.scale).multiplyScalar(1.05); A.host.add(o); rig.ghosts.push(o); }
      if (rig.K.crys && !rig.low) rig.crys.forEach((c, i) => { const a = i / rig.crys.length * TAU; c.position.set(A.lc.x + Math.cos(a) * A.w * .45, A.lc.y + (i / rig.crys.length - .5) * A.h * .7, A.lc.z + Math.sin(a) * A.w * .45); c.rotation.set(MR() * 3, MR() * 3, MR() * 3); c.userData.rfx = true; A.host.add(c); }); }
    if (!on && rig.ghosts.length) { for (const o of rig.ghosts) o.parent && o.parent.remove(o); rig.ghosts.length = 0; for (const c of rig.crys) c.parent && c.parent.remove(c); }
  }
  function rfxDrop(rig) {
    rfxGhosts(rig, false); if (rig.g.parent) rig.g.parent.remove(rig.g); if (rig.gun && rig.gun.userData.rig === rig) rig.gun.userData.rig = null; rig.gun = null;
    const i = RFX.busy.indexOf(rig); if (i >= 0) RFX.busy.splice(i, 1); RFX.free.push(rig);
  }
  // once a frame (from skinTick): a rig nobody touched last frame belongs to a gun that has gone, so it comes back
  function rfxTick() { RFX.frame++; for (let i = RFX.busy.length - 1; i >= 0; i--) { const rig = RFX.busy[i]; if (rig.stamp < RFX.frame - 1) rfxDrop(rig); } }
  /* called by animParts for every gun, every frame: r is the reload (or -1), insp the inspect (or -1). full is your own
     gun (and the store's), the rest get a lighter version: no lit magazine, crystals or lightning, fewer and bigger points */
  function skinFx(Gm, P, G, r, insp, dt, fp, full) {
    const U = Gm.userData; if (U.sightGlow && U.sightGlow.length && fp) { const show = !(X.adsK > .2); for (const s of U.sightGlow) s.visible = show; }
    const L = U.line && LINES[U.line]; let rig = U.rig; if (!L || !L.rl) { if (rig) rfxDrop(rig); return; }
    const tier = RARITY[L.r].tier, mode = r >= 0 && P.alive !== false && !G.melee ? 'reload' : fp && insp > 0 && tier >= 4 ? 'inspect' : null;
    if (!mode || (rig && rig.mode !== mode)) { if (rig) rfxDrop(rig); rig = null; if (!mode) return; }
    if (!rig) { rig = rfxTake(Gm, L.rl, mode, full); if (!rig) return; }
    rig.stamp = RFX.frame; rig.pm.uniforms.scale.value = screenScale();
    if (mode === 'reload') rfxReload(rig, r, Math.min(dt, .05), G); else rfxInspect(rig, insp, Math.min(dt, .05));
  }
  const env = (q, a, b, c, d) => q < a || q > d ? 0 : q < b ? sm((q - a) / (b - a)) : q <= c ? 1 : 1 - sm((q - c) / (d - c));
  function rfxEmit(rig, n, fn) { for (const p of rig.P) { if (n <= 0) break; if (p.age < p.life) continue; p.age = 0; p.hot = 0; p.g = 0; p.vx = p.vy = p.vz = 0; p.at = null; fn(p); n--; } }
  function rfxReload(rig, r, dt, G) {
    const K = rig.K, A = rig.A, full = rig.full, lite = rig.low || !full, sz = full ? 1 : 2.2, pk = (full ? 1 : .4) * (rig.low ? .6 : 1), host = A.host, c1 = rig.l1, c2 = rig.l2;   // lite: a rival's gun, or low quality
    // where the magazine is right now, in the gun's space
    let mc = A.well.clone().add(A.lc); if (host) { host.updateMatrix(); mc = A.lc.clone().applyMatrix4(host.matrix); }
    const seatQ = A.shells ? (r * 5) % 1 : r, seat = A.shells ? env(seatQ, .45, .5, .55, .75) * (r > .1 && r < .86 ? 1 : 0) : env(r, .76, .79, .82, .97);
    const arrive = env(r, .38, .5, .7, .88), gather = env(r, .2, .42, .78, .95);
    // the lit magazine
    if (K.ghost && full && host && A.mag) { const on = r > .4 && r < .92; rfxGhosts(rig, on);
      if (on) { let op = K.ghost * env(r, .42, .48, .62, .86); if (K.scan) op *= MR() < .25 ? .25 : 1; if (K.flicker && r < .56) op *= MR() < .45 ? 0 : 1;
        // additive over the magazine: the forge's runs white-hot and cools; the rest tint it in the line's colour, flaring paler as it arrives
        if (K.hot) { rig.ghostM.opacity = cl(op, 0, 1); rig.ghostM.color.copy(c2).lerp(c1, sm(cl((r - .45) / .35, 0, 1))); } else { rig.ghostM.opacity = cl(op * .55, 0, .7); rig.ghostM.color.copy(c1).lerp(c2, .15 + .35 * (1 - arrive)); } }
      if (K.crys && !rig.low) { const gq = cl((r - .44) / .3, 0, 1), on2 = r > .44 && r < .79; rig.crys.forEach((c, i) => { c.visible = on2; c.scale.set(.002 + gq * .0035, (.004 + gq * .011) * (1 + (i % 3) * .3), .002 + gq * .0035); }); rig.crysM.color.copy(c2).lerp(c1, .4); } }
    else rfxGhosts(rig, false);
    // the halo round the magazine
    const hv = K.halo * Math.max(gather * .45, seat * 1.1); rig.halo.visible = hv > .01; if (rig.halo.visible) { rig.halo.position.copy(r > .76 ? A.well : mc); rig.halo.scale.setScalar(A.w * (2.6 + seat * 2.4) * (full ? 1 : 1.5)); rig.halo.material.opacity = cl(hv, 0, 1); rig.halo.material.color.copy(c1).lerp(c2, seat * .6); }
    // the shock ring(s) blown out as it seats
    for (const [o, d, c] of [[rig.ring, 0, c1], [rig.ring2, .035, c2]]) { if (o === rig.ring2 && (K.shock !== 2 || lite)) { o.visible = false; continue; }
      const q = A.shells ? -1 : (r - .77 - d) / .18; o.visible = !!K.shock && q > 0 && q < 1; if (!o.visible) continue; o.position.copy(A.well); o.position.y -= .004; o.rotation.set(-Math.PI / 2, 0, 0); o.scale.setScalar(A.w * (1.2 + sm(q) * 5.5) * (full ? 1 : 1.4)); o.material.opacity = (1 - q) * (1 - q) * 1.1; o.material.color.copy(c); }
    // the rune circle the magazine rises through
    if (K.rune) { const q = env(r, .16, .3, .78, .92), fl = seat * .6; rig.rune.visible = q > .01; if (rig.rune.visible) { rig.rune.position.copy(A.bottom); rig.rune.rotation.set(-Math.PI / 2, 0, (K.rune === 'portal' ? -6 : 1.6) * r * (G.rel || 2)); rig.rune.scale.setScalar(A.w * (K.rune === 'ring' ? 2.4 : 3.4) * (.4 + .6 * q + fl) * (full ? 1 : 1.3)); rig.rune.material.opacity = cl(q * .95 + fl, 0, 1); rig.rune.material.color.copy(c1).lerp(c2, fl); }
      rig.rune2.visible = !!K.rune2 && !lite && q > .01; if (rig.rune2.visible) { rig.rune2.position.copy(A.bottom).lerp(A.well, .5); rig.rune2.rotation.set(-Math.PI / 2, 0, -2.4 * r * (G.rel || 2)); rig.rune2.scale.setScalar(A.w * 2.2 * (.4 + .6 * q)); rig.rune2.material.opacity = q * .8; rig.rune2.material.color.copy(c2); } }
    /* the charge and the sweep: while the fresh magazine comes, a ring of light gathers round the receiver over the well,
       turning and brightening; once it is home the ring runs down the barrel to the muzzle, shedding sparks */
    { const q0 = A.shells ? .86 : .79, len = rig.gun.userData.len || .6, big = K.shock === 2 ? 1.3 : 1, ax = .02, rr0 = G.cat === 'Sidearm' ? .042 : G.cat === 'Sniper' ? .056 : .06, chg = K.sweep !== 0 && !A.shells ? env(r, .26, .5, q0 - .01, q0 + .01) : 0, q = (r - q0) / (A.shells ? .13 : .17), fire = K.sweep !== 0 && q > 0 && q < 1;
      rig.sw.visible = rig.swh.visible = chg > .01 || fire;
      if (fire) { const e = sm(q), z = lp(A.well.z, -len + .01, e), a = Math.sin(q * Math.PI * .5 + Math.PI * .5) * (1 - q * q), rad = lp(rr0, .028, Math.min(1, e * 2.2));
        rig.sw.position.set(0, ax, z); rig.sw.rotation.set(0, 0, q * 5); rig.sw.scale.setScalar(rad * 2.2 * big * (full ? 1 : 1.3)); rig.sw.material.opacity = cl(a * 1.1, 0, 1); rig.sw.material.color.copy(c1).lerp(c2, .5);
        rig.swh.position.set(0, ax, z); rig.swh.scale.setScalar(.07 * big * (full ? 1 : 1.5)); rig.swh.material.opacity = a * .9; rig.swh.material.color.copy(c2);
        if (rig.done.sweepZ == null) rig.done.sweepZ = z; const trail = Math.floor((rig.done.sweepZ - z) / .018); if (trail > 0) { rig.done.sweepZ -= trail * .018; rfxEmit(rig, Math.min(5, trail * (K.shock === 2 ? 2 : 1)), p => { const an = MR() * TAU, rw = rad * (.7 + MR() * .4); p.x = Math.cos(an) * rw; p.y = ax + Math.sin(an) * rw; p.z = z; p.vx = Math.cos(an) * .06; p.vy = Math.sin(an) * .06 + .02; p.vz = .03; p.life = .25 + MR() * .25; p.s = (.0024 + MR() * .0018) * sz; p.mode = 'fly'; p.hot = MR() < .5; }); } }
      else if (chg > .01) { const fl = .85 + .15 * Math.sin(r * 90);
        rig.sw.position.set(0, ax, A.well.z); rig.sw.rotation.set(0, 0, r * (G.rel || 2) * 3); rig.sw.scale.setScalar(rr0 * 2.2 * (1.25 - .25 * chg) * big * (full ? 1 : 1.3)); rig.sw.material.opacity = chg * .85 * fl; rig.sw.material.color.copy(c1).lerp(c2, chg * .4);
        rig.swh.position.set(0, ax, A.well.z); rig.swh.scale.setScalar(rr0 * 3 * big); rig.swh.material.opacity = chg * .35; rig.swh.material.color.copy(c1);
        if (full && MR() < dt * 30 * chg) rfxEmit(rig, 1, p => { const an = MR() * TAU, rw = rr0 * (1.6 + MR() * .6); p.ox = Math.cos(an) * rw; p.oy = Math.sin(an) * rw; p.oz = (MR() - .5) * .02; p.life = .3; p.s = (.0022 + MR() * .0015) * sz; p.mode = 'suck'; p.hot = MR() < .5; p.at = V3(0, ax, A.well.z); }); } }
    // lightning between the magazine and the gun
    for (const a of rig.arcs) a.visible = false;
    if (K.arcs && full && !rig.low && r > .3 && r < .82 && host) { if ((rig.arcT -= dt) <= 0) { rig.arcT = .03 + MR() * .05; for (const a of rig.arcs) { a.userData.on = MR() < .7; const p = a.geometry.attributes.position.array, from = mc, to = A.well; for (let j = 0; j < 10; j++) { const q = j / 9, jit = j && j < 9 ? A.w * .9 : 0; p[j * 3] = lp(from.x, to.x, q) + (MR() - .5) * jit; p[j * 3 + 1] = lp(from.y, to.y, q) + (MR() - .5) * jit; p[j * 3 + 2] = lp(from.z, to.z, q) + (MR() - .5) * jit; } a.geometry.attributes.position.needsUpdate = true; a.material.color.copy(MR() < .5 ? c1 : c2); } }
      for (const a of rig.arcs) a.visible = a.userData.on; }
    // particles: bursts at the moments, streams through the swap
    const parts = K.parts || [], once = (key, q) => { if (rig.done[key] || r < q) return false; rig.done[key] = 1; return r < q + .12; };
    for (const kind of parts) {
      if (kind === 'sparks') { const burst = (n, at, up) => rfxEmit(rig, Math.round(n * pk), p => { const a = MR() * TAU, s = (.25 + MR() * .45) * (full ? 1 : 2); p.x = at.x; p.y = at.y; p.z = at.z; p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s; p.vy = (up ? .2 + MR() * .5 : -.1 - MR() * .3) * (full ? 1 : 2); p.g = -2.6 * (full ? 1 : 2); p.life = .25 + MR() * .3; p.s = (.0022 + MR() * .002) * sz; p.mode = 'fly'; p.hot = 1; });
        if (once('s0', .04)) burst(10, A.well, false); if (once('s1', .78)) burst(22, A.well, true); if (A.shells && seatQ > .45 && seatQ < .52 && !rig.done['sh' + Math.floor(r * 5)]) { rig.done['sh' + Math.floor(r * 5)] = 1; burst(8, A.well, true); } }
      else if (kind === 'flame') { if (r > .26 && r < .82) { rig.acc += dt * 70 * pk * (K.hot ? .6 : 1); const n = Math.floor(rig.acc); rig.acc -= n; rfxEmit(rig, n, p => { const a = MR() * TAU, rr = MR() * A.w * .6; p.x = mc.x + Math.cos(a) * rr; p.y = (r < .42 ? A.well.y : mc.y + A.h * .3) + (MR() - .5) * .01; p.z = mc.z + Math.sin(a) * rr; p.vx = (MR() - .5) * .05; p.vz = (MR() - .5) * .05; p.vy = (.12 + MR() * .12) * (full ? 1 : 2); p.g = .2; p.life = .22 + MR() * .2; p.s = (.006 + MR() * .005) * sz; p.mode = 'flame'; p.hot = 1; }); }
        if (once('f1', .78)) rfxEmit(rig, Math.round(14 * pk), p => { const a = MR() * TAU; p.x = A.well.x; p.y = A.well.y; p.z = A.well.z; p.vx = Math.cos(a) * .3; p.vz = Math.sin(a) * .3; p.vy = .15 + MR() * .2; p.g = .4; p.life = .3; p.s = .008 * sz; p.mode = 'flame'; p.hot = 1; }); }
      else if (kind === 'suck') { if (r > .2 && r < .78) { rig.acc += dt * 55 * pk; const n = Math.floor(rig.acc); rig.acc -= n; rfxEmit(rig, n, p => { const a = MR() * TAU, b = (MR() - .5) * 2.4, rr = A.w * (2.4 + MR() * 1.4); p.ox = Math.cos(a) * Math.cos(b) * rr; p.oy = Math.sin(b) * rr; p.oz = Math.sin(a) * Math.cos(b) * rr; p.life = .28 + MR() * .12; p.s = (.003 + MR() * .002) * sz; p.mode = 'suck'; p.hot = MR() < .3; }); } }
      else if (kind === 'spiral') { if (r > .34 && r < .8) { rig.acc += dt * 50 * pk; const n = Math.floor(rig.acc); rig.acc -= n; rfxEmit(rig, n, p => { p.a0 = MR() * TAU; p.life = .4 + MR() * .15; p.s = (.0028 + MR() * .002) * sz; p.mode = 'spiral'; p.hot = MR() < .4; p.h0 = .6 + MR() * .6; }); } }
      else if (kind === 'voxel') { const box = (q, out) => rfxEmit(rig, Math.round(q * pk), p => { p.ox = (MR() - .5) * A.w; p.oy = (MR() - .5) * A.h * .8; p.oz = (MR() - .5) * A.w; const a = MR() * TAU; p.dx = Math.cos(a) * A.w * 2.2; p.dy = (MR() - .2) * A.h * .8; p.dz = Math.sin(a) * A.w * 2.2; p.life = .22 + MR() * .14; p.s = (.0032 + MR() * .0016) * sz; p.mode = out ? 'vout' : 'vin'; p.hot = MR() < .35; });
        if (r > .02 && r < .2) { rig.acc += dt * 90; const n = Math.floor(rig.acc); rig.acc -= n; box(n, true); }
        if (r > .42 && r < .72) { rig.acc += dt * 110; const n = Math.floor(rig.acc); rig.acc -= n; box(n, false); } }
      else if (kind === 'frost') { if (r > .38 && r < .78) { rig.acc += dt * 40 * pk; const n = Math.floor(rig.acc); rig.acc -= n; rfxEmit(rig, n, p => { p.a0 = MR() * TAU; p.life = .5; p.s = (.0025 + MR() * .002) * sz; p.mode = 'spiral'; p.hot = MR() < .6; p.h0 = 1.2; }); }
        if (once('fr', .79)) rfxEmit(rig, Math.round(18 * pk), p => { const a = MR() * TAU, s = .3 + MR() * .3; p.x = mc.x; p.y = mc.y; p.z = mc.z; p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s; p.vy = MR() * .3; p.g = -2; p.life = .35 + MR() * .2; p.s = (.003 + MR() * .003) * sz; p.mode = 'fly'; p.hot = MR() < .5; }); }
      else if (kind === 'glint') { if (r > .45 && r < .85 && MR() < dt * 14) rfxEmit(rig, 1, p => { p.ox = (MR() - .5) * A.w * .9; p.oy = (MR() - .5) * A.h * .7; p.oz = (MR() - .5) * A.w * .9; p.life = .25; p.s = .009 * sz; p.mode = 'glint'; p.hot = MR() < .5; });
        if (once('g1', .78)) rfxEmit(rig, Math.round(10 * pk), p => { const a = MR() * TAU, s = .2 + MR() * .2; p.x = A.well.x; p.y = A.well.y; p.z = A.well.z; p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s; p.vy = .1 + MR() * .2; p.g = -1; p.life = .35; p.s = .008 * sz; p.mode = 'fly'; p.hot = 1; }); }
      else if (kind === 'rise') { if (r > .2 && r < .84) { rig.acc += dt * 38 * pk; const n = Math.floor(rig.acc); rig.acc -= n; rfxEmit(rig, n, p => { const a = MR() * TAU, rr = A.w * (1.1 + MR() * .5); p.x = A.bottom.x + Math.cos(a) * rr; p.y = A.bottom.y; p.z = A.bottom.z + Math.sin(a) * rr; p.vx = -Math.cos(a) * .02; p.vz = -Math.sin(a) * .02; p.vy = .09 + MR() * .07; p.g = 0; p.life = .5 + MR() * .3; p.s = (.0036 + MR() * .002) * sz; p.mode = 'fly'; p.hot = MR() < .3; }); } }
    }
    rfxPoints(rig, dt, mc);
  }
  // a Mythic or Paragon, inspected: a ring of light sweeps from the back of the gun to the muzzle, shedding sparks
  function rfxInspect(rig, q, dt) {
    const Gm = rig.gun, U = Gm.userData, len = U.len || .6, k = cl((q - .25) / .5, 0, 1), z = lp(.08, -len, sm(k)), on = q > .25 && q < .8;
    rig.ring.visible = on; rig.halo.visible = on; rig.rune.visible = false; rig.rune2.visible = false; rig.ring2.visible = false; rig.sw.visible = rig.swh.visible = false; for (const a of rig.arcs) a.visible = false;
    if (on) { const a = Math.sin(k * Math.PI); rig.ring.position.set(0, .025, z); rig.ring.rotation.set(0, 0, 0); rig.ring.scale.setScalar(.075 + a * .02); rig.ring.material.opacity = a; rig.ring.material.color.copy(rig.l1).lerp(rig.l2, a * .5);
      rig.halo.position.set(0, .025, z); rig.halo.scale.setScalar(.07); rig.halo.material.opacity = a * .8; rig.halo.material.color.copy(rig.l1);
      rfxEmit(rig, MR() < dt * 40 ? 1 : 0, p => { const an = MR() * TAU; p.x = Math.cos(an) * .03; p.y = .025 + Math.sin(an) * .03; p.z = z; p.vx = Math.cos(an) * .05; p.vy = Math.sin(an) * .05 + .03; p.vz = .05; p.g = 0; p.life = .4; p.s = .003; p.mode = 'fly'; p.hot = MR() < .5; }); }
    rfxPoints(rig, dt, V3(0, .025, z));
  }
  // step the points and write them out
  function rfxPoints(rig, dt, mc) {
    const tc = SFX.tc || (SFX.tc = new THREE.Color()), ga = rig.pts.geometry.attributes, P = ga.position.array, C = ga.tint.array, Al = ga.alpha.array, Sz = ga.size.array, c1 = rig.c1, c2 = rig.c2, A = rig.A;
    rig.P.forEach((p, i) => {
      if (p.age >= p.life) { Al[i] = 0; Sz[i] = 0; return; } p.age += dt; const k = Math.min(1, p.age / p.life); let a = 1 - k, s = p.s;
      if (p.mode === 'fly' || p.mode === 'flame') { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.mode === 'flame') { s *= 1 + k * .8; a = Math.sin(k * Math.PI) * .9; } P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = p.z; }
      else if (p.mode === 'suck') { const f = 1 - sm(k), o = p.at || mc; P[i * 3] = o.x + p.ox * f; P[i * 3 + 1] = o.y + p.oy * f; P[i * 3 + 2] = o.z + p.oz * f; a = sm(Math.min(1, k * 3)); }
      else if (p.mode === 'spiral') { const an = p.a0 + k * 7, rr = A.w * (1.6 - k * 1.1) * p.h0; P[i * 3] = mc.x + Math.cos(an) * rr; P[i * 3 + 1] = mc.y - A.h * .5 * (1 - k) + A.h * .1; P[i * 3 + 2] = mc.z + Math.sin(an) * rr; a = Math.sin(k * Math.PI); }
      else if (p.mode === 'vout' || p.mode === 'vin') { const f = p.mode === 'vout' ? sm(k) : 1 - sm(k); P[i * 3] = mc.x + p.ox + p.dx * f; P[i * 3 + 1] = mc.y + p.oy + p.dy * f; P[i * 3 + 2] = mc.z + p.oz + p.dz * f; a = p.mode === 'vout' ? 1 - k : Math.min(1, k * 4) * (1 - k * k); }
      else if (p.mode === 'glint') { P[i * 3] = mc.x + p.ox; P[i * 3 + 1] = mc.y + p.oy; P[i * 3 + 2] = mc.z + p.oz; a = Math.sin(k * Math.PI); s *= .4 + Math.sin(k * Math.PI) * .8; }
      const c = p.hot ? (p.mode === 'flame' ? tc.copy(c2).lerp(c1, k) : c2) : c1; C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b; Al[i] = cl(a, 0, 1); Sz[i] = s;
    });
    ga.position.needsUpdate = ga.tint.needsUpdate = ga.alpha.needsUpdate = ga.size.needsUpdate = true;
  }

  /* ---------- Paragon sounds: a layer on the kill sound, and a reload of its own (Mythics get a softer one) ---------- */
  const PSND = {
    forge: o => { for (const [f, v, d] of [[220, .12, 1.1], [607, .07, .8], [1188, .05, .6], [1958, .035, .4]]) tone(o, f, d, 'sine', v, 0, .02); hiss(o, .5, .2, 'lowpass', 900, 0); tone(o, 55, .6, 'sine', .35, -15, .02); hiss(o, .35, .06, 'highpass', 6000, .08); },
    rift: o => { tone(o, 160, .38, 'sawtooth', .05, 1500); hiss(o, .4, .08, 'bandpass', 900, 0, 4); for (let i = 0; i < 4; i++) tone(o, 1800 + i * 420, .05, 'square', .025, 0, .3 + i * .045); tone(o, 90, .7, 'sine', .38, -50, .36); },
    glyph: o => { for (const [f, d] of [[392, 0], [494, .04], [587, .08], [784, .12], [988, .2]]) { tone(o, f, 1.2, 'sine', .045, 0, d); tone(o, f * 1.005, 1.1, 'sine', .03, 0, d + .01); } tone(o, 1568, .9, 'triangle', .03, 0, .25); hiss(o, 1, .03, 'highpass', 7500, .1); },
  };
  on('kill', (v, by, head, wk) => { if (!canHear() || !M || by !== me() || v === me()) return; const sk = skinOfId(skinFor(me(), wk)); if (sk && PSND[sk.L.sound]) PSND[sk.L.sound](outFor(null)); });
  on('reload', f => {
    if (!canHear() || !M || !f) return; const G = gun(f), sk = skinOfId(skinFor(f, G.k)); if (!sk || sk.R.tier < 4) return; const o = outFor(f, f === me() ? .6 : .9), seat = G.rel * .78, snd = sk.L.sound;
    tone(o, 300, Math.min(.9, G.rel * .4), 'sine', .03, 900, G.rel * .3); hiss(o, G.rel * .35, .04, 'bandpass', 2400, G.rel * .3, 3);   // a charge rising as the fresh one comes
    if (sk.R.tier < 5) { tone(o, 1318, .3, 'triangle', .04, 0, seat); return; }
    if (snd === 'forge') { tone(o, 2093, .5, 'triangle', .07, 0, seat); tone(o, 2793, .4, 'sine', .04, 0, seat + .005); hiss(o, .25, .12, 'lowpass', 1400, seat); for (let i = 0; i < 3; i++) tone(o, 3200 + i * 500, .06, 'sine', .02, 0, seat + .05 + i * .04); }
    else if (snd === 'rift') { tone(o, 400, .25, 'square', .03, 1200, seat - .2); tone(o, 70, .35, 'sine', .3, -20, seat); hiss(o, .2, .1, 'highpass', 3000, seat); }
    else { [784, 988, 1175, 1568].forEach((fq, i) => tone(o, fq, .5, 'sine', .04, 0, seat - .12 + i * .045)); hiss(o, .5, .03, 'highpass', 8000, seat); }
  });
