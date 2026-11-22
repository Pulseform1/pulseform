  /* ---------- 79 kit effects, second part: the C abilities, Vanta, aiming previews, and the energy look ----------
     ENERGY: one shader for everything made of light (Phase Front, the Duel Field's dome, Overcharge's charge, a Slow Field,
     wards): a drifting hex lattice whose cells flicker, scan lines climbing it, a rim that brightens where you see it edge
     on, and a pulse it can be struck with. PREVIEWS: while you hold an ability ready, where it will go is drawn in the
     world in your operative's colour: a ring where it lands, a dotted arc for a throw, a ghost of a wall, a line for a beam.
     Everything is made up front (buildKitFx2) so nothing compiles in the middle of a round. */
  const ENERGY_VS = 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }';
  const ENERGY_FS = [
    'uniform vec3 col; uniform float t, op, hexS, scan, rim, pulse, base; uniform vec2 rep; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vW;',
    'float hexd(vec2 p){ p = abs(p); return max(dot(p, vec2(.5, .8660254)), p.x); }',
    'vec4 hexg(vec2 p){ vec2 r = vec2(1., 1.7320508), h = r * .5; vec2 a = mod(p, r) - h, b = mod(p - h, r) - h; vec2 g = dot(a, a) < dot(b, b) ? a : b; return vec4(g, p - g); }',
    'void main(){ vec4 H = hexg(vUv * rep * hexS + vec2(0., t * .12)); float e = .5 - hexd(H.xy), edge = smoothstep(.07, .0, e) * step(.001, hexS);',
    '  float cell = fract(sin(dot(floor(H.zw * 10.), vec2(12.9898, 78.233))) * 43758.5453), flick = step(.93, fract(cell * 7.31 + t * .5)) * .7;',
    '  float sc = scan * pow(.5 + .5 * sin(vW.y * 14. - t * 5.), 6.), fr = pow(1. - abs(dot(normalize(vN), vV)), 2.2) * rim;',
    '  float a = op * (base + edge * .65 + flick * .4 * step(.001, hexS) + sc * .5 + fr + pulse);',
    '  vec3 c = mix(col * .55, col, clamp(edge + fr + pulse, 0., 1.)) + vec3(1.) * (edge * .25 + pulse * .6 + flick * .15);',   // (deeper in the cells, hot at the edges)
    '  gl_FragColor = vec4(c, clamp(a * .85, 0., .92)); }'].join('\n');
  function energyMat(col, o = {}) {
    const m = new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(col) }, t: { value: 0 }, op: { value: o.op == null ? 1 : o.op }, hexS: { value: o.hex == null ? 3 : o.hex }, scan: { value: o.scan || 0 }, rim: { value: o.rim == null ? .7 : o.rim }, pulse: { value: 0 }, base: { value: o.base == null ? .12 : o.base }, rep: { value: new THREE.Vector2(o.rx || 1, o.ry || 1) } },
      vertexShader: ENERGY_VS, fragmentShader: ENERGY_FS, transparent: true, depthWrite: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide });   // (normal blending by default: on a bright map, light added to light is only white)
    (X.kf2mats || (X.kf2mats = [])).push(m); return m;
  }
  function buildKitFx2() {
    const add = o => { X.scene.add(o); o.visible = false; return o; }, glowT = X.glowT || (X.glowT = canvasTex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }));
    const basic = (col, o) => new THREE.MeshBasicMaterial(Object.assign({ color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }, o || {}));
    const smokeT = canvasTex(128, 128, (g, w, h) => { for (let i = 0; i < 26; i++) { const x = 30 + Math.random() * 68, y = 30 + Math.random() * 68, r = 14 + Math.random() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
    const sprite = (col, s, blend = THREE.AdditiveBlending, map = glowT) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: col, transparent: true, depthWrite: false, blending: blend, toneMapped: false })); sp.scale.setScalar(s); return sp; };
    const flat = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; return m; };
    const K = X.kf2 = { glowT };
    // previews
    K.pvRing = add(flat(new THREE.RingGeometry(.86, 1, 56), basic('#ffffff', { opacity: .95, blending: THREE.NormalBlending }))); K.pvDisc = add(flat(new THREE.CircleGeometry(1, 48), basic('#ffffff', { opacity: .2, blending: THREE.NormalBlending })));
    { const n = 40, geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); K.pvArc = add(new THREE.Points(geo, new THREE.PointsMaterial({ size: .2, map: glowT, color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }))); K.pvArc.frustumCulled = false; }
    K.pvWall = add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), energyMat('#ffffff', { hex: 6, op: .55, scan: 1, rx: 2 })));
    K.pvBeam = add(new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 1, 6, 1, true), basic('#ffffff', { opacity: .7 }))); K.pvBeam.geometry.translate(0, .5, 0); K.pvBeam.geometry.rotateX(Math.PI / 2);   // (laid along +z, one long)
    K.pvMark = add(sprite('#ffffff', .8, THREE.NormalBlending));
    // Phase Front, the Duel Field, a Slow Field
    K.fronts = []; for (let i = 0; i < 3; i++) { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), energyMat(OPS.vanta.col, { hex: 5, scan: 1, rx: 2, base: .16, rim: 0 })); m.position.y = 1.5; g.add(m);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(6, .05, .05), basic(OPS.vanta.col)); edge.position.y = 3; g.add(edge); const foot = edge.clone(); foot.position.y = .02; g.add(foot); g.userData = { m, edge, foot }; K.fronts.push(add(g)); }
    K.domes = []; for (let i = 0; i < 2; i++) { const g = new THREE.Group(), geo = new THREE.SphereGeometry(1, 48, 24, 0, TAU, 0, Math.PI / 2), shade = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#160a1e', transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide }));
      const skin = new THREE.Mesh(geo, energyMat(OPS.vanta.col, { hex: 10, rim: 1.3, scan: .6, rx: 4, ry: 1, base: .06 })), floor = flat(new THREE.RingGeometry(.97, 1, 72), basic(OPS.vanta.col, { opacity: .9 })); floor.position.y = .03; g.add(shade, skin, floor); g.userData = { shade, skin, floor }; K.domes.push(add(g)); }
    K.fields = []; for (let i = 0; i < 2; i++) { const g = new THREE.Group(), disc = flat(new THREE.CircleGeometry(1, 48), energyMat('#9fe8ff', { hex: 7, rim: 0, base: .14 })), dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 12, 0, TAU, 0, Math.PI / 2), energyMat('#9fe8ff', { hex: 0, rim: 1, base: .0, scan: .5 })), rim = flat(new THREE.RingGeometry(.96, 1, 56), basic('#c8f4ff', { opacity: .8 }));
      disc.position.y = .04; rim.position.y = .05; dome.scale.set(1, .35, 1); g.add(disc, dome, rim); g.userData = { disc, dome, rim }; K.fields.push(add(g)); }
    // Overcharge's charge: a turning hex with a hot core; and wards round a fighter
    K.hexes = []; for (let i = 0; i < 4; i++) { const g = new THREE.Group(), hx = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .07, 6), energyMat(OPS.vanta.col, { hex: 0, rim: 1, base: .5 })); hx.rotation.x = Math.PI / 2; const core = sprite('#ffffff', .45), halo = sprite(OPS.vanta.col, 1.2); g.add(hx, core, halo); g.userData = { hx, core, halo }; K.hexes.push(add(g)); }
    K.wards = []; for (let i = 0; i < 5; i++) K.wards.push(add(new THREE.Mesh(new THREE.SphereGeometry(.62, 24, 16), energyMat(OPS.vanta.col, { hex: 6, rim: 1.2, base: .02, op: .8 }))));
    // the lobbed ones in flight, Gloom's dark, the Watcher, a Tether's anchor, Sunder's bolt, the Duel Field's beam, Flashpoint's flight
    K.lobs = []; for (let i = 0; i < 6; i++) { const g = new THREE.Group(), core = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), basic('#ffffff', { blending: THREE.NormalBlending, transparent: false })), halo = sprite('#ffffff', .6); g.add(core, halo); g.userData = { core, halo }; K.lobs.push(add(g)); }
    K.glooms = []; for (let i = 0; i < 3; i++) { const g = new THREE.Group(), puffs = []; for (let k = 0; k < 10; k++) { const s = sprite('#1a0f2a', 2, THREE.NormalBlending, smokeT); s.material.opacity = .9; g.add(s); puffs.push(s); } const glow = sprite(OPS.vex.col, 3); g.add(glow); g.userData = { puffs, glow }; K.glooms.push(add(g)); }
    K.eyes = []; for (let i = 0; i < 3; i++) { const g = new THREE.Group(), ball = new THREE.Mesh(new THREE.SphereGeometry(.09, 14, 10), new THREE.MeshBasicMaterial({ color: '#e8fffb' })), iris = new THREE.Mesh(new THREE.TorusGeometry(.055, .014, 6, 18), basic(OPS.iris.col, { blending: THREE.NormalBlending, transparent: false })), pupil = new THREE.Mesh(new THREE.CircleGeometry(.03, 12), new THREE.MeshBasicMaterial({ color: '#06201c' }));
      iris.position.z = -.075; pupil.position.z = -.088; pupil.rotation.y = Math.PI; const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(.9) * 6, 6, 24, 1, true), energyMat(OPS.iris.col, { hex: 0, rim: 0, base: .08, scan: 1 })); cone.rotation.x = Math.PI / 2; cone.position.z = -3;
      const halo = sprite(OPS.iris.col, .7); g.add(ball, iris, pupil, cone, halo); g.userData = { iris, cone, halo }; K.eyes.push(add(g)); }
    K.anchors = []; for (let i = 0; i < 2; i++) { const g = new THREE.Group(), ring = flat(new THREE.RingGeometry(.35, .42, 32), basic(OPS.wraith.col)), ring2 = flat(new THREE.RingGeometry(.18, .22, 6), basic('#ffffff')), beam = new THREE.Mesh(new THREE.CylinderGeometry(.04, .2, 1.6, 12, 1, true), energyMat(OPS.wraith.col, { hex: 0, rim: 0, base: .25, scan: 1 }));
      ring.position.y = ring2.position.y = .04; beam.position.y = .8; g.add(ring, ring2, beam); g.userData = { ring, ring2, beam }; K.anchors.push(add(g)); }
    K.sunders = []; for (let i = 0; i < 3; i++) { const g = new THREE.Group(), streak = new THREE.Mesh(new THREE.CylinderGeometry(.03, .09, 2.4, 8, 1, true), basic(OPS.vanta.col)); streak.geometry.rotateX(Math.PI / 2); const head = sprite('#ffffff', .7), halo = sprite(OPS.vanta.col, 1.8); g.add(streak, head, halo); K.sunders.push(add(g)); }
    K.beams = []; for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1, 8, 1, true), basic(OPS.vanta.col)); m.geometry.translate(0, .5, 0); m.geometry.rotateX(Math.PI / 2); m.userData.t = 9; K.beams.push(add(m)); }
    K.flights = []; for (let i = 0; i < 2; i++) { const s = sprite('#fff6d6', .5); s.userData.t = 9; K.flights.push(add(s)); }
    // bursts: rings across the floor, shells that swell and fade, pillars of light (a pool each)
    K.bRings = []; for (let i = 0; i < 8; i++) K.bRings.push(add(flat(new THREE.RingGeometry(.86, 1, 48), basic('#ffffff'))));
    K.bShells = []; for (let i = 0; i < 6; i++) K.bShells.push(add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), energyMat('#ffffff', { hex: 5, rim: 1.2, base: .1 }))));
    K.bPillars = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true), energyMat('#ffffff', { hex: 0, rim: .8, base: .25, scan: 1 })); m.geometry.translate(0, .5, 0); K.bPillars.push(add(m)); }
    K.bursts = [];
    // other players' readied abilities: a glow in the hand
    K.rdy = []; for (let i = 0; i < 6; i++) K.rdy.push(add(sprite('#ffffff', .4)));
    buildKitFx3();   // (79-kitfx3: Tessel)
  }
  // a burst: kind 'ring' | 'shell' | 'pillar', where, colour, size, how long
  function burst(kind, x, y, z, col, r, T, h) { const K = X && X.kf2; if (!K) return; K.bursts.push({ kind, x, y, z, col, r, T, t: 0, h: h || 3 }); }
  // the preview for a readied ability: what kind, and where (from the same sums the ability uses)
  const PV = { vexe: 'spot', irise: 'mark', vexx: 'spot', axiomx: 'self', bastionq: 'wall', embere: 'haze', talone: 'floor', axiomq: 'floor', axiome: 'wire', bastionc: 'floor', wraithc: 'floor',
    emberq: 'lob', emberx: 'lob', vexc: 'lob', talonc: 'lob', axiomc: 'lob', novae: 'mark', talonq: 'dart', irisc: 'eye', emberc: 'curve', vantac: 'front', vantaq: 'beam', vantax: 'zone', wraithe: 'run',
    tesselc: 'lob', tesselq: 'lob', tessele: 'line', tesselx: 'house' };
  const PV_R = { vexe: 3.8, vexx: 1, axiomx: 14, emberq: 3.2, emberx: 5.5, vexc: 6, talonc: 3.5, axiomc: 5, wraithe: 1.2, talone: 1.3, axiomq: .6, axiome: 2.2, bastionc: 6, wraithc: .5, novae: 4.5, tesselc: 3.4, tesselq: 4.5 };
  function previewFrame(P) {
    const K = X.kf2; for (const k of ['pvRing', 'pvDisc', 'pvArc', 'pvWall', 'pvBeam', 'pvMark']) K[k].visible = false; hidePreviewTessel();
    if (!P || !P.alive || !P.rdy || P.net) return; const key = P.op + P.rdy, kind = PV[key]; if (!kind) return;
    const d = abData(P, P.rdy, false), col = (OPS[P.op] || OPS.vex).col, pulse = .75 + .25 * Math.sin(X.t * 6), R = PV_R[key] || 1;
    const ring = (x, y, z, r, bad) => { K.pvRing.visible = K.pvDisc.visible = true; K.pvRing.position.set(x, y + .04, z); K.pvDisc.position.set(x, y + .035, z); K.pvRing.scale.setScalar(r); K.pvDisc.scale.setScalar(r); K.pvRing.material.color.set(bad ? WARN : col); K.pvDisc.material.color.set(bad ? WARN : col); K.pvRing.material.opacity = .95 * pulse; K.pvRing.rotation.z = X.t * .5; };
    if (!d) { const S = castShot(P, viewDir(P.yaw, P.pitch)); K.pvMark.visible = true; K.pvMark.position.set(S.end[0], S.end[1], S.end[2]); K.pvMark.material.color.set(WARN); return; }   // nowhere it can go
    if (kind === 'spot') ring(d.x, hAt(d.x, d.z), d.z, R);
    else if (kind === 'self') ring(P.x, P.y, P.z, R);
    else if (kind === 'floor') ring(d.x, hAt(d.x, d.z), d.z, R);
    else if (kind === 'mark') { K.pvMark.visible = true; K.pvMark.position.set(d.x, d.y, d.z); K.pvMark.material.color.set(col); K.pvMark.scale.setScalar(.5 * pulse + .2); if (key === 'novae') ring(d.x, d.y - 1, d.z, R); }
    else if (kind === 'eye') { K.pvMark.visible = true; K.pvMark.position.set(d.x, d.y, d.z); K.pvMark.material.color.set(col); K.pvMark.scale.setScalar(.6 * pulse); }
    else if (kind === 'lob' || kind === 'dart') {   // the throw, flown ahead: dots along its path, a ring where it comes down
      const pos = K.pvArc.geometry.attributes.position, g2 = kind === 'dart' ? 4 : key === 'emberq' || key === 'emberx' ? 14 : LOB_G; let x = d.x, y = d.y, z = d.z, vx = d.vx, vy = d.vy, vz = d.vz, n = 0, landed = false, bounce = key === 'talonc' ? 1 : 0;
      for (let s = 0; s < 160 && n < 40; s++) { const dt2 = 1 / 40; vy -= g2 * dt2; const sp = Math.hypot(vx, vy, vz) || 1, st = sp * dt2, hit = rayGrid(x, y, z, vx / sp, vy / sp, vz / sp, st + .05);
        if (hit < st + .05) { x += vx / sp * Math.max(0, hit - .08); y += vy / sp * Math.max(0, hit - .08); z += vz / sp * Math.max(0, hit - .08); if (bounce-- > 0 && kind !== 'dart') { const nn = rayN, dot = vx * nn[0] + vy * nn[1] + vz * nn[2]; vx = (vx - 2 * dot * nn[0]) * .45; vy = (vy - 2 * dot * nn[1]) * .45; vz = (vz - 2 * dot * nn[2]) * .45; continue; } landed = true; break; }
        x += vx * dt2; y += vy * dt2; z += vz * dt2; if (s % 2 === 0) { pos.setXYZ(n++, x, y, z); } }
      for (let i = n; i < 40; i++) pos.setXYZ(i, x, y, z); pos.needsUpdate = true; K.pvArc.visible = true; K.pvArc.material.color.set(col); K.pvArc.material.opacity = .9;
      if (landed && kind === 'lob') ring(x, hAt(x, z), z, R); else if (landed) { K.pvMark.visible = true; K.pvMark.position.set(x, y, z); K.pvMark.material.color.set(col); } }
    else if (kind === 'wall' || kind === 'haze' || kind === 'front') {
      let cx, cz, w, h = 3, ax; if (kind === 'wall') { cx = d.x; cz = d.z; ax = d.ax; w = 5.2; } else if (kind === 'haze') { cx = d.x; cz = d.z; ax = Math.abs(d.pz) > Math.abs(d.px) ? 1 : 0; w = 9.4; h = 2.6; } else { cx = d.x + (d.ax ? d.dir * 1.2 : 0); cz = d.z + (d.ax ? 0 : d.dir * 1.2); ax = d.ax; w = 6; }
      K.pvWall.visible = true; K.pvWall.position.set(cx, hAt(cx, cz) + h / 2, cz); K.pvWall.scale.set(ax ? .12 : w, h, ax ? w : .12); K.pvWall.material.uniforms.col.value.set(col); K.pvWall.material.uniforms.op.value = .45 + .15 * pulse;
      if (kind === 'front') { const L = 14, ex = cx + (d.ax ? d.dir * L : 0), ez = cz + (d.ax ? 0 : d.dir * L); K.pvBeam.visible = true; K.pvBeam.position.set(cx, hAt(cx, cz) + .05, cz); K.pvBeam.lookAt(ex, hAt(cx, cz) + .05, ez); K.pvBeam.scale.set(3, 3, L); K.pvBeam.material.color.set(col); K.pvBeam.material.opacity = .45; } }
    else if (kind === 'line' || kind === 'house') previewTessel(P, d, kind, col, pulse);
    else if (kind === 'wire') { const y = d.y + WIRE.h, L = Math.hypot(d.bx - d.ax, d.bz - d.az); K.pvBeam.visible = true; K.pvBeam.position.set(d.ax, y, d.az); K.pvBeam.lookAt(d.bx, y, d.bz); K.pvBeam.scale.set(1.6, 1.6, L); K.pvBeam.material.color.set(col); K.pvBeam.material.opacity = .8 * pulse; ring((d.ax + d.bx) / 2, d.y, (d.az + d.bz) / 2, .4); }   // (Tripwire: the wire across the doorway)
    else if (kind === 'curve') { const pos = K.pvArc.geometry.attributes.position, e = eyeY(P); for (let i = 0; i < 40; i++) { const q = i / 39, a = Math.min(1, q * 2), b = Math.max(0, q * 2 - 1); pos.setXYZ(i, lp(P.x, d.ax, a) + (d.x - d.ax) * b, e + .3 * q, lp(P.z, d.az, a) + (d.z - d.az) * b); } pos.needsUpdate = true; K.pvArc.visible = true; K.pvArc.material.color.set(col); K.pvMark.visible = true; K.pvMark.position.set(d.x, d.y, d.z); K.pvMark.material.color.set('#fff6d6'); }
    else if (kind === 'run') { const pos = K.pvArc.geometry.attributes.position, e = P.y + .08; let x = d.x, z = d.z, n = 0; for (let s = 0; s < 40; s++) { const nx = x + d.dx * .55, nz = z + d.dz * .55; if (blocked(nx, nz, P.y)) break; x = nx; z = nz; pos.setXYZ(n++, x, hAt(x, z) + .08, z); } for (let i = n; i < 40; i++) pos.setXYZ(i, x, hAt(x, z) + .08, z); pos.needsUpdate = true; K.pvArc.visible = true; K.pvArc.material.color.set(col); ring(x, hAt(x, z), z, .6); }   // Mirage: where the copy will run
    else if (kind === 'zone') { ring(d.px, d.py, d.pz, 5, !d.t); if (d.t && M.byKey[d.t]) { const v = M.byKey[d.t]; K.pvMark.visible = true; K.pvMark.position.set(ipos(v, 'x'), ipos(v, 'y') + 2.3, ipos(v, 'z')); K.pvMark.material.color.set(col); K.pvMark.scale.setScalar(.45 * pulse + .25); } }   // (Duel Field: the circle it opens, and whoever it would take)
    else if (kind === 'beam') { const c = X.camera.position, v = viewDir(P.yaw, P.pitch), L = 35, sx = c.x + v[0] * .8, sy = c.y - .25 + v[1] * .8, sz = c.z + v[2] * .8;   // (from the camera itself, so it never swims against the view)
      K.pvBeam.visible = true; K.pvBeam.position.set(sx, sy, sz); K.pvBeam.lookAt(c.x + v[0] * L, c.y + v[1] * L, c.z + v[2] * L); K.pvBeam.scale.set(1, 1, L); K.pvBeam.material.color.set(col); K.pvBeam.material.opacity = .55 * pulse;
      if (key === 'vantax' && d.t) { K.pvMark.visible = true; K.pvMark.position.set(ex, ey, ez); K.pvMark.material.color.set(col); K.pvMark.scale.setScalar(1.1 * pulse); } }
  }
  function kitFx2(dt) {
    const K = X.kf2, K2 = M.kit; if (!K || !K2) return; const P = me(), Vw = viewer();
    for (const m of X.kf2mats) m.uniforms.t.value = X.t;
    const list = (pool, items, fn) => pool.forEach((m, i) => { const it = items && items[i]; m.visible = !!it; if (it) fn(m, it, i); });
    previewFrame(P);
    list(K.fronts, M.walls.filter(w => w.front), (g, w) => { const F = w.front, cx = (w.x0 + w.x1) / 2, cz = (w.z0 + w.z1) / 2, fade = F.hold > 4.4 ? (5 - F.hold) / .6 : 1, k = Math.min(1, w.grow);
      g.position.set(cx, hAt(F.x, F.z), cz); g.rotation.y = F.ax ? Math.PI / 2 : 0; g.scale.set(1, k, 1); g.userData.m.material.uniforms.op.value = .85 * fade; g.userData.m.material.uniforms.pulse.value = Math.max(0, g.userData.m.material.uniforms.pulse.value - dt * 3); g.userData.edge.material.opacity = g.userData.foot.material.opacity = fade; });
    // the Duel Field: a dome where it stands; inside, the dome's dark is the world outside going dim
    const duels = []; for (const f of M.fs) if (f.duel && f.duel.a === f) duels.push(f.duel);
    list(K.domes, duels, (g, D) => { g.position.set(D.x, hAt(D.x, D.z) - .1, D.z); const k = Math.min(1, (X.t - (D.vt || (D.vt = X.t))) / .4); g.scale.set(D.r * k, D.r * 1.15 * k, D.r * k); const inside = Vw && Vw.duel === D; g.userData.shade.material.opacity = inside ? .42 : .72; g.userData.skin.material.uniforms.op.value = inside ? .7 : 1; });
    list(K.fields, K2.fields, (g, F) => { const k = Math.min(1, (F.T - F.t) / .3) * Math.min(1, F.t / .5); g.position.set(F.x, F.y, F.z); g.scale.setScalar(F.r * (.6 + .4 * k)); g.userData.disc.material.uniforms.op.value = k; g.userData.dome.material.uniforms.op.value = k * .8; g.userData.rim.material.opacity = k * (.6 + .3 * Math.sin(X.t * 4)); g.userData.disc.rotation.z = X.t * .3;
      if (Math.random() < dt * 10) spark([F.x + rnd(-F.r, F.r) * .7, F.y + .1, F.z + rnd(-F.r, F.r) * .7], [0, rnd(.4, 1.2), 0], '#c8f4ff', .8); });
    list(K.hexes, K2.hexes.filter(h => h.by === P || h.by.team === P.team), (g, h) => { g.position.set(h.x, h.y + Math.sin(X.t * 3) * .06, h.z); g.userData.hx.rotation.z = X.t * 2.5; g.rotation.y = X.t; const k = Math.min(1, h.t / .4); g.scale.setScalar(k * (1 + .08 * Math.sin(X.t * 12))); g.userData.halo.material.opacity = .6 + .3 * Math.sin(X.t * 8); });
    list(K.wards, M.fs.filter(f => f.alive && f !== Vw && (f.ward > 0 || f.wardV) && duelOk(Vw, f)), (m, f) => { m.position.set(ipos(f, 'x'), ipos(f, 'y') + 1.05, ipos(f, 'z')); m.scale.set(1, 1.55, 1); m.material.uniforms.op.value = .55 + .15 * Math.sin(X.t * 5); });
    list(K.lobs, K2.lobs, (g, B) => { const col = (OPS[B.by.op] || OPS.vex).col; g.position.set(B.x, B.y, B.z); g.userData.halo.material.color.set(B.k === 'vexc' ? '#5a2a9a' : col); g.userData.core.material.color.set(B.k === 'vexc' ? '#120a1c' : '#ffffff'); g.userData.halo.scale.setScalar(.55 + .15 * Math.sin(X.t * 20));
      if (Math.random() < .7) spark([B.x, B.y, B.z], [rnd(-.3, .3), rnd(-.2, .4), rnd(-.3, .3)], B.k === 'talonc' ? '#d8ffb0' : col, .35); });
    list(K.glooms, K2.glooms, (g, G2) => { const k = Math.min(1, (3.5 - G2.t) / .25) * Math.min(1, G2.t / .8); g.position.set(G2.x, G2.y + 1, G2.z); g.userData.puffs.forEach((s, i) => { const a = i * 2.4 + X.t * (.3 + i * .03), r = 1.2 + (i % 3) * 1.3; s.position.set(Math.cos(a) * r, Math.sin(i * 1.7 + X.t) * .6, Math.sin(a) * r); s.scale.setScalar((2.6 + (i % 4)) * k); s.material.opacity = .85 * k; s.material.rotation = X.t * .2 + i; });
      g.userData.glow.material.opacity = .5 * k; g.userData.glow.scale.setScalar(4 * k); });
    // (big and glowing enough to find: a rival sees it, through the walls' gaps, from 45 m, swelling and fading so it catches the eye)
    list(K.eyes, K2.eyes.filter(W => W.by.team === P.team || (W.act > 0 && Math.hypot(W.x - P.x, W.z - P.z) < 45)), (g, W) => { const mine = W.by.team === P.team, awake = W.act > 0, beat = .5 + .5 * Math.sin(X.t * 5), sc = mine ? (awake ? 1.5 : 1.1) : 2 + .25 * beat; g.position.set(W.x, W.y, W.z); g.rotation.y = W.yaw; g.scale.setScalar(sc); const spot = (W.flashT || 0) > X.t;   // (asleep: only Iris's side sees it, small and dim)
      g.userData.cone.visible = mine && awake; g.userData.cone.scale.setScalar(1 / sc); g.userData.cone.position.z = -3 / sc; g.userData.cone.material.uniforms.op.value = spot ? 1 : .35 + .1 * Math.sin(X.t * 3); g.userData.halo.material.opacity = spot ? 1 : mine ? (awake ? .6 : .4) : .55 + .4 * beat; g.userData.halo.scale.setScalar((mine ? .9 : 1.1 + .35 * beat) * .7); g.userData.iris.rotation.z = X.t * 2; });
    list(K.anchors, M.fs.filter(f => f.tether && (f.team === P.team)).map(f => f.tether), (g, T) => { g.position.set(T.x, T.y, T.z); g.userData.ring.rotation.z = X.t; g.userData.ring2.rotation.z = -X.t * 1.6; g.userData.beam.material.uniforms.op.value = .6 + .2 * Math.sin(X.t * 4); });
    // (Sunder is instant now: its streak is drawn by on('sunder'), and the old flying bolt shows nothing)
    list(K.sunders, [], (g, B) => { g.position.set(B.x + B.dx * B.s, B.y + B.dy * B.s, B.z + B.dz * B.s); g.lookAt(g.position.x + B.dx, g.position.y + B.dy, g.position.z + B.dz); if (Math.random() < .8) spark([g.position.x, g.position.y, g.position.z], [rnd(-.5, .5), rnd(-.5, .5), rnd(-.5, .5)], OPS.vanta.col, .3); });
    for (const m of K.beams) { const u = m.userData; u.t += dt; m.visible = u.t < .45; if (m.visible) { m.material.opacity = 1 - u.t / .45; m.scale.x = m.scale.y = 1 + u.t * 4; } }
    for (const s of K.flights) { const u = s.userData; u.t += dt; s.visible = u.t < .55; if (s.visible && u.d) { const q = u.t / .55, a = Math.min(1, q * 2), b = Math.max(0, q * 2 - 1); s.position.set(lp(u.x0, u.d.ax, a) + (u.d.x - u.d.ax) * b, lp(u.y0, u.d.y, q), lp(u.z0, u.d.az, a) + (u.d.z - u.d.az) * b); s.scale.setScalar(.5 + .2 * Math.sin(X.t * 30)); if (Math.random() < .8) spark([s.position.x, s.position.y, s.position.z], [0, 0, 0], '#ffd27a', .25); } }
    // bursts
    const live = K.bursts.filter(b => (b.t += dt) < b.T); K.bursts = live; const byKind = k => live.filter(b => b.kind === k);
    list(K.bRings, byKind('ring'), (m, b) => { const q = b.t / b.T, e = 1 - Math.pow(1 - q, 3); m.position.set(b.x, b.y + .05, b.z); m.scale.setScalar(.2 + e * b.r); m.material.color.set(b.col); m.material.opacity = 1 - q; });
    list(K.bShells, byKind('shell'), (m, b) => { const q = b.t / b.T, e = 1 - Math.pow(1 - q, 2.5); m.position.set(b.x, b.y, b.z); m.scale.setScalar(.2 + e * b.r); m.material.uniforms.col.value.set(b.col); m.material.uniforms.op.value = 1 - q; m.material.uniforms.pulse.value = (1 - q) * .4; });
    list(K.bPillars, byKind('pillar'), (m, b) => { const q = b.t / b.T; m.position.set(b.x, b.y, b.z); m.scale.set(b.r * (1 - q * .5), b.h * Math.min(1, q * 5), b.r * (1 - q * .5)); m.material.uniforms.col.value.set(b.col); m.material.uniforms.op.value = 1 - q; });
    // other players holding an ability ready: it glows in their off hand
    list(K.rdy, M.fs.filter(f => f !== Vw && f.alive && f.rdy && duelOk(Vw, f) && (f.team === P.team || canSee(P, f) || f.reveal > 0)), (s, f) => { const y = f.yaw, rx = Math.cos(y), rz = -Math.sin(y), fx = -Math.sin(y), fz = -Math.cos(y); s.position.set(ipos(f, 'x') - rx * .24 + fx * .38, ipos(f, 'y') + 1.2 + lp(0, -.4, f.crouch), ipos(f, 'z') - rz * .24 + fz * .38);   // (in the off hand: left of them and ahead)
      s.material.color.set((OPS[f.op] || OPS.vex).col); s.scale.setScalar(.35 + .1 * Math.sin(X.t * 12)); });
    // Mirage: each copy drawn as the operative itself, running (the red edge a rival gets, too), shimmering as it fades
    // (the copies are kept and used again, never rebuilt: a whole operative built mid-fight cost a frame; one or two are
    // even built ahead, a frame at a time, for each side with a Wraith on it)
    { const live = new Set(); X.decoyF = X.decoyF || new Map(); X.decoyPool = X.decoyPool || [];
      for (const w of M.fs) { if (!OPS[w.op] || !OPS[w.op].e || OPS[w.op].e.n !== OPS.wraith.e.n) continue; const have = X.decoyPool.filter(q => q.op === w.op && q.team === w.team).length + [...X.decoyF.values()].filter(q => q.op === w.op && q.team === w.team).length;
        if (have < 2) { const q = fighter({ op: w.op, key: 'mirage-pool' + X.decoyPool.length + w.team, name: '', team: w.team }); q.decoy = true; q.guns = Object.assign({}, w.guns); q.slot = w.slot; q.skins = Object.assign({}, w.skins || {}); Object.assign(q, { x: w.x, y: -50, z: w.z, px: w.x, py: -50, pz: w.z, alive: true }); updateAgent(q, dt); const A = X.agents.get(q); if (A) A.visible = false; X.decoyPool.push(q); break; } }
      for (const D of K2.decoys) { if (D.popped || !duelOk(Vw, D.by)) continue; live.add(D.id); let f = X.decoyF.get(D.id);
        if (!f) { const pi = X.decoyPool.findIndex(q => q.op === D.by.op && q.team === D.by.team); f = pi >= 0 ? X.decoyPool.splice(pi, 1)[0] : fighter({ op: D.by.op, key: 'mirage' + D.id, name: '', team: D.by.team }); f.decoy = true; f.guns = Object.assign({}, D.by.guns); f.slot = D.by.slot; f.skins = Object.assign({}, D.by.skins || {}); X.decoyF.set(D.id, f); }
        Object.assign(f, { x: D.x, y: D.y, z: D.z, px: D.x, py: D.y, pz: D.z, vx: D.moving ? D.dx * SPD : 0, vz: D.moving ? D.dz * SPD : 0, yaw: Math.atan2(-D.dx, -D.dz), pitch: 0, alive: true, walkT: D.walkT, crouch: 0, ground: true, sprinting: false });
        updateAgent(f, dt); const A = X.agents.get(f); if (A) A.visible = !(D.t < .4 && Math.random() < .5); }   // (it flickers out at the end)
      for (const [id, f] of X.decoyF) if (!live.has(id)) { const A = X.agents.get(f); if (A) A.visible = false; X.decoyF.delete(id); X.decoyPool.push(f); } }
    // Gloom: the fog closes in round you while it lasts
    { const k = Vw && Vw.murk > 0 ? Math.min(1, Vw.murk / .4, (3.5 - Vw.murk) / .25 + .2) : 0, fog = X.scene.fog;
      if (k > 0) { if (!X.murkBase) X.murkBase = { near: fog.near, far: fog.far, col: fog.color.clone(), bg: X.scene.background && X.scene.background.isColor ? X.scene.background.clone() : null };
        const B = X.murkBase, dark = new THREE.Color('#0c0714'); fog.near = lp(B.near, 1.2, k); fog.far = lp(B.far, 7, k); fog.color.copy(B.col).lerp(dark, k); if (B.bg) X.scene.background.copy(B.bg).lerp(dark, k); }
      else if (X.murkBase) { const B = X.murkBase; fog.near = B.near; fog.far = B.far; fog.color.copy(B.col); if (B.bg) X.scene.background.copy(B.bg); X.murkBase = null; } }
    kitFx3(dt);   // (79-kitfx3: Tessel)
  }
  function hideKitFx2() { const K = X && X.kf2; if (!K) return; for (const k of ['fronts', 'domes', 'fields', 'hexes', 'wards', 'lobs', 'glooms', 'eyes', 'anchors', 'sunders', 'beams', 'flights', 'bRings', 'bShells', 'bPillars', 'rdy']) for (const m of K[k]) m.visible = false; for (const k of ['pvRing', 'pvDisc', 'pvArc', 'pvWall', 'pvBeam', 'pvMark']) K[k].visible = false; K.bursts = []; hideKitFx3(); }
  // the moments
  const fxOk = () => X && ready && X.kf2 && M;
  const OPC = op => (OPS[op] || OPS.vex).col;
  on('decoyPop', D => { if (!fxOk()) return; burst('shell', D.x, D.y + 1, D.z, OPS.wraith.col, 1.6, .45); for (let i = 0; i < 26; i++) spark([D.x + rnd(-.3, .3), D.y + rnd(.2, 1.8), D.z + rnd(-.3, .3)], [rnd(-3, 3), rnd(-1, 3), rnd(-3, 3)], i % 2 ? '#dfe6ff' : OPS.wraith.col, .6); });
  on('decoy', D => { if (fxOk()) burst('ring', D.x, D.y, D.z, OPS.wraith.col, 1.4, .4); });
  on('gloomPop', G2 => { if (!fxOk()) return; burst('shell', G2.x, G2.y + .8, G2.z, OPS.vex.col, 6.5, .55); burst('ring', G2.x, G2.y, G2.z, '#b58cff', 7, .7); for (let i = 0; i < 18; i++) spark([G2.x, G2.y + 1, G2.z], [rnd(-5, 5), rnd(0, 4), rnd(-5, 5)], '#2a1440', .7); });
  on('shockPop', S => { if (!fxOk()) return; burst('shell', S.x, S.y, S.z, '#d8ffb0', 3.8, .35); burst('ring', S.x, hAt(S.x, S.z), S.z, OPS.talon.col, 4.5, .45); X.flashL.position.set(S.x, S.y + .5, S.z); X.flashL.intensity = 16; X.shake = Math.max(X.shake || 0, .25);
    for (let i = 0; i < 26; i++) spark([S.x, S.y + .2, S.z], [rnd(-6, 6), rnd(1, 6), rnd(-6, 6)], i % 3 ? '#e8ffd0' : '#ffffff', .5); });
  on('lobBounce', B => { if (!fxOk()) return; for (let i = 0; i < 8; i++) spark([B.x, B.y, B.z], [rnd(-2, 2), rnd(.5, 3), rnd(-2, 2)], '#e8ffd0', .3); });
  on('beaconPop', B => { if (!fxOk()) return; burst('pillar', B.x, B.y, B.z, OPS.bastion.col, .9, .9, 4.5); burst('ring', B.x, B.y, B.z, OPS.bastion.col, 6.5, .8); for (const f of M.fs) if (f.alive && f.team === B.by.team && Math.hypot(f.x - B.x, f.z - B.z) < 6) burst('shell', f.x, f.y + 1, f.z, '#7fc8ff', 1.1, .6); });
  on('updraft', f => { if (!fxOk()) return; const y = hAt(f.x, f.z); burst('ring', f.x, y, f.z, OPS.nova.col, 2.4, .45); burst('ring', f.x, y + .4, f.z, '#ffffff', 1.6, .35); burst('pillar', f.x, y, f.z, OPS.nova.col, .45, .4, 3); for (let i = 0; i < 14; i++) spark([f.x + rnd(-.4, .4), y + .1, f.z + rnd(-.4, .4)], [rnd(-1, 1), rnd(4, 9), rnd(-1, 1)], '#fff6c0', .5); });
  on('tetherSet', f => { if (!fxOk()) return; burst('ring', f.x, hAt(f.x, f.z), f.z, OPS.wraith.col, 1.4, .5); });
  on('tetherBack', (f, a, b) => { if (!fxOk()) return; for (const p of [a, b]) { const y = hAt(p[0], p[1]); burst('pillar', p[0], y, p[1], OPS.wraith.col, .7, .5, 2.6); burst('ring', p[0], y, p[1], '#dfe6ff', 2, .5); for (let i = 0; i < 14; i++) spark([p[0], y + rnd(.2, 2), p[1]], [rnd(-1, 1), rnd(-.5, 1.5), rnd(-1, 1)], '#c8d2ff', .6); } });
  on('curveFlash', (f, d) => { if (!fxOk()) return; const s = X.kf2.flights.find(q => q.userData.t > .55) || X.kf2.flights[0]; Object.assign(s.userData, { t: 0, d, x0: f.x, y0: eyeY(f) - .1, z0: f.z }); });
  on('fieldStart', F => { if (!fxOk()) return; burst('shell', F.x, F.y + .3, F.z, '#c8f4ff', 5, .5); for (let i = 0; i < 20; i++) spark([F.x, F.y + .3, F.z], [rnd(-5, 5), rnd(.5, 3), rnd(-5, 5)], '#e8fbff', .6); });
  on('sunder', (f, d) => { if (!fxOk()) return; for (let i = 0; i < 8; i++) spark([d.x, d.y, d.z], [d.dx * 6 + rnd(-1, 1), d.dy * 6 + rnd(-1, 1), d.dz * 6 + rnd(-1, 1)], OPS.vanta.col, .3); });
  on('sundered', v => { if (!fxOk()) return; burst('shell', v.x, v.y + 1.1, v.z, OPS.vanta.col, 1.3, .5); for (let i = 0; i < 12; i++) spark([v.x, v.y + 1.1, v.z], [rnd(-3, 3), rnd(-1, 3), rnd(-3, 3)], '#ffd0ff', .4); });
  on('overcharge', f => { if (!fxOk()) return; burst('shell', f.x, f.y + 1, f.z, OPS.vanta.col, 1.6, .5); burst('ring', f.x, hAt(f.x, f.z), f.z, OPS.vanta.col, 2.2, .5); });
  on('hex', h => { if (!fxOk()) return; burst('shell', h.x, h.y, h.z, OPS.vanta.col, .9, .35); });
  on('wardOn', (f, h) => { if (!fxOk()) return; burst('shell', f.x, f.y + 1, f.z, OPS.vanta.col, 1.2, .5); if (h) for (let i = 0; i < 14; i++) spark([h.x, h.y, h.z], [rnd(-3, 3), rnd(-1, 3), rnd(-3, 3)], '#ffffff', .4); });
  on('wardBreak', f => { if (!fxOk()) return; burst('shell', f.x, f.y + 1.05, f.z, '#ffffff', 1.4, .35); for (let i = 0; i < 18; i++) spark([f.x, f.y + 1.1, f.z], [rnd(-4, 4), rnd(-1, 4), rnd(-4, 4)], OPS.vanta.col, .5); });
  // Sunder: a streak the length of the bolt, there and gone
  on('sunder', (f, d) => { if (!fxOk()) return; const m = X.kf2.beams.find(q => q.userData.t > .45) || X.kf2.beams[0]; m.userData.t = .15; const sx = d.x, sy = d.y, sz = d.z; m.position.set(sx, sy, sz); m.lookAt(sx + d.dx, sy + d.dy, sz + d.dz); m.scale.set(.8, .8, 35); });
  // Duel Field: the circle opening where it was pointed, and the dome rising round whoever it took
  on('duelZone', (f, d) => { if (!fxOk() || d.px == null) return; burst('ring', d.px, d.py + .05, d.pz, OPS.vanta.col, 5, .6); burst('shell', d.px, d.py + 1, d.pz, OPS.vanta.col, 2.2, .45); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; spark([d.px + Math.cos(a) * 5, d.py + .2, d.pz + Math.sin(a) * 5], [-Math.cos(a) * 3, rnd(1, 3), -Math.sin(a) * 3], OPS.vanta.col, .6); } });
  on('duelBeam', (f, d) => { if (!fxOk()) return; const m = X.kf2.beams.find(q => q.userData.t > .45) || X.kf2.beams[0], e = eyeY(f); m.userData.t = 0; m.position.set(f.x, e - .2, f.z); m.lookAt(d.ex, d.ey, d.ez); m.scale.set(1, 1, Math.hypot(d.ex - f.x, d.ey - e, d.ez - f.z)); });
  on('duelStart', D => { if (!fxOk()) return; const y = hAt(D.x, D.z); burst('ring', D.x, y, D.z, OPS.vanta.col, D.r * 1.05, .6); burst('pillar', D.a.x, D.a.y, D.a.z, OPS.vanta.col, .8, .6, 4); burst('pillar', D.b.x, D.b.y, D.b.z, OPS.vanta.col, .8, .6, 4); X.shake = Math.max(X.shake || 0, .3); });
  on('duelEnd', D => { if (!fxOk()) return; burst('shell', D.x, hAt(D.x, D.z), D.z, OPS.vanta.col, D.r * 1.1, .5); });
  on('eyeSpot', W => { W.flashT = X ? X.t + .5 : 0; });
  on('eyeWake', W => { W.flashT = X ? X.t + .4 : 0; if (fxOk()) burst('ring', W.x, W.y, W.z, OPS.iris.col, 1.2, .4); });
  on('eyeDown', W => { if (!fxOk()) return; burst('shell', W.x, W.y, W.z, OPS.iris.col, .8, .3); for (let i = 0; i < 14; i++) spark([W.x, W.y, W.z], [rnd(-3, 3), rnd(-1, 3), rnd(-3, 3)], i % 2 ? '#ffffff' : OPS.iris.col, .5); });
  on('front', w => { if (!fxOk()) return; const F = w.front; burst('ring', F.x, hAt(F.x, F.z), F.z, OPS.vanta.col, 3, .4); });
  on('flarePop', fl => { if (fxOk()) burst('shell', fl.x, fl.y, fl.z, '#fff6d6', 2.2, .3); });
  // a bullet into Phase Front: the wall ripples
  on('shot', (f, S) => { if (!fxOk() || !S || S.hit) return; for (const g of X.kf2.fronts) if (g.visible && Math.abs(g.position.x - S.end[0]) < 3.2 && Math.abs(g.position.z - S.end[2]) < 3.2 && S.end[1] - g.position.y < 3.1) { g.userData.m.material.uniforms.pulse.value = .5; for (let i = 0; i < 4; i++) spark(S.end, [rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)], OPS.vanta.col, .25); } });
