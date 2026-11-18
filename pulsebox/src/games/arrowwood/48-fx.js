  /* ---------- 48 fx: archers on screen, arrows (flying, stuck, in bodies), impacts, the aim arc, pings, finishers, cameras ---------- */
  let PS = {}, ARC = null, AIMMARK = null, FINS = [], BILLS = null, COINS3 = null, THWACK = null; const DEBRIS = [], FLOATS = [], RINGS = [], AIM_N = 190;
  const hashId = id => { let h = 7; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
  // ---- a small particle system on points with per-particle size, colour, fade and spin
  function partSys(map, max, additive) {
    const g = new THREE.BufferGeometry(), pos = new Float32Array(max * 3), col = new Float32Array(max * 4), sz = new Float32Array(max), rt = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('acol', new THREE.BufferAttribute(col, 4)); g.setAttribute('asize', new THREE.BufferAttribute(sz, 1)); g.setAttribute('arot', new THREE.BufferAttribute(rt, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { map: { value: map }, sc: { value: innerHeight * .5 } },
      vertexShader: 'attribute vec4 acol; attribute float asize, arot; varying vec4 vC; varying float vR; uniform float sc; void main(){ vC = acol; vR = arot; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = asize * sc / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D map; varying vec4 vC; varying float vR; void main(){ vec2 p = gl_PointCoord - .5; float c = cos(vR), s = sin(vR); p = mat2(c,-s,s,c) * p + .5; vec4 t = texture2D(map, p); gl_FragColor = vec4(vC.rgb * t.rgb, vC.a * t.a); if (gl_FragColor.a < .02) discard; }' });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; X.scene.add(pts);
    const P = { pts, g, m, max, n: 0, list: [] };
    P.add = (x, y, z, vx, vy, vz, o = {}) => { if (P.list.length >= max) P.list.shift(); P.list.push({ x, y, z, vx, vy, vz, life: o.life || 1, age: 0, size: o.size || .1, grow: o.grow || 0, col: o.col || [1, 1, 1], a: o.a == null ? 1 : o.a, g: o.g == null ? 9.8 : o.g, drag: o.drag || 0, rot: Math.random() * TAU, spin: o.spin || 0, flutter: o.flutter || 0, floor: o.floor }); };
    P.step = dt => {
      const L = P.list; let w = 0;
      for (const p of L) { p.age += dt; if (p.age >= p.life) continue; p.vy -= p.g * dt; const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; if (p.flutter) { p.vx += Math.sin(p.age * 7 + p.rot) * p.flutter * dt; p.vz += Math.cos(p.age * 6 + p.rot) * p.flutter * dt; } p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.spin * dt;
        if (p.floor) { const gy = visH(p.x, p.z) + .02; if (p.y < gy) { p.y = gy; p.vy = 0; p.vx *= .5; p.vz *= .5; p.spin *= .5; } }
        L[w++] = p; }
      L.length = w; const n = Math.min(w, max);
      for (let i = 0; i < n; i++) { const p = L[i], f = 1 - p.age / p.life, fade = Math.min(1, f * 3) * Math.min(1, p.age * 12); pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; col[i * 4] = p.col[0]; col[i * 4 + 1] = p.col[1]; col[i * 4 + 2] = p.col[2]; col[i * 4 + 3] = p.a * fade; sz[i] = p.size * (1 + p.grow * p.age); rt[i] = p.rot; }
      g.setDrawRange(0, n); for (const k of ['position', 'acol', 'asize', 'arot']) g.attributes[k].needsUpdate = true;
    };
    return P;
  }
  function initFx() {
    PS.dust = partSys(TEX.dot, 500, false); PS.chip = partSys(TEX.chip, 300, false); PS.cube = partSys(TEX.square, 500, false); PS.trail = partSys(TEX.dot, 900, true); PS.star = partSys(TEX.star, 120, true); PS.leaf = partSys(TEX.leafP, 400, false); PS.petal = partSys(TEX.petal, 400, false); PS.heart = partSys(TEX.heart, 200, false); PS.spark = partSys(TEX.dot, 300, true);
    // the aim preview: a short line of faint dots
    // the aim line: round dots a fixed size on screen (white with a dark rim, so they read on sky and on grass), every 0.7 m
    // of the flight to where the arrow will land, and a ring at that spot
    const n = AIM_N, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aa', new THREE.BufferAttribute(new Float32Array(n), 1));
    ARC = new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: true, uniforms: { px: { value: 7 }, sc: { value: 600 } },
      vertexShader: 'attribute float aa; varying float vA; uniform float px, sc; void main(){ vA = aa; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = clamp(.07 * sc / -mv.z, px, px * 2.4); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; vec3 c = mix(vec3(1., .98, .9), vec3(.32, .3, .27), smoothstep(.3, .38, d)); gl_FragColor = vec4(c, vA * (1. - smoothstep(.44, .5, d)) * (d > .38 ? .3 : 1.)); }' }));
    ARC.frustumCulled = false; ARC.visible = false; ARC.renderOrder = 15; X.scene.add(ARC);
    AIMMARK = new THREE.Group(); const ringS = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.ring, color: new THREE.Color('#ffffff'), transparent: true, depthTest: false })), dotS = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.dot, color: new THREE.Color('#ffd23a'), transparent: true, depthTest: false }));
    ringS.renderOrder = dotS.renderOrder = 16; AIMMARK.add(ringS, dotS); AIMMARK.userData = { ringS, dotS }; AIMMARK.visible = false; X.scene.add(AIMMARK);
    // cash: bills and coins for the Cashout finisher
    BILLS = { m: new THREE.InstancedMesh(new THREE.PlaneGeometry(.26, .12), std({ map: TEX.bill, side: THREE.DoubleSide, roughness: .8 }), 260), list: [] };
    COINS3 = { m: new THREE.InstancedMesh(new THREE.CylinderGeometry(.045, .045, .008, 14), std({ map: TEX.coin, metalness: .85, roughness: .28, color: LC('#ffd86a') }), 90), list: [] };
    for (const B of [BILLS, COINS3]) { B.m.count = 0; B.m.frustumCulled = false; B.m.castShadow = true; X.scene.add(B.m); }
    const [c, gg] = cvs(1024, 256); gg.font = '900 150px Impact, Arial Black, sans-serif'; gg.textAlign = 'center'; gg.lineWidth = 18; gg.lineJoin = 'round'; gg.strokeStyle = '#1a1206'; gg.save(); gg.translate(512, 128); gg.rotate(-.08); gg.strokeText('THWACK!', 0, 50); gg.fillStyle = '#ffd23f'; gg.fillText('THWACK!', 0, 50); gg.restore();
    THWACK = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c, { clamp: true }), depthTest: false, transparent: true })); THWACK.visible = false; THWACK.renderOrder = 20; X.scene.add(THWACK);
  }
  // ---- archers
  function ensureModel(p) {
    const col = p.dummy ? '#c9b07a' : CL.src === 'practice' ? W.TEAMS[p.team | 0].col : teamCol(p.team, p.slot, CL.mode), bow = p.bow || 'longbow', key = col + bow + (p.dummy ? 'd' : '');
    if (p.model && p.modelKey === key) return p.model;
    if (p.model) X.scene.remove(p.model.root);
    p.model = makePerson({ col, seed: hashId(p.id), dummy: p.dummy, bow }); p.modelKey = key; p.model.stuck = []; X.scene.add(p.model.root);
    return p.model;
  }
  on('playerGone', p => { if (p.model) X && X.scene.remove(p.model.root); p.model = null; });
  on('unstickAll', p => { if (p.model) { p.model.stuck.forEach(m => m.parent && m.parent.remove(m)); p.model.stuck = []; p.model.fin = null; resetDeath(p.model); } });
  function resetDeath(P) { P.root.visible = true; P.root.scale.set(1, 1, 1); P.root.rotation.set(0, P.root.rotation.y, 0); P.root.rotation.x = 0; P.root.rotation.z = 0; if (P.bow && P.bow.g.parent !== P.chest) { P.bow.g.parent && P.bow.g.parent.remove(P.bow.g); P.chest.add(P.bow.g); } P.dead = false; }
  function updateCharacters(dt) {
    const rt = srvNow() - INTERP;
    for (const p of CL.players.values()) {
      const P = ensureModel(p), mine = p.id === CL.me;
      if (P.fin || P.dead) { P.root.visible = P.root.visible && !(mine && ME.cam === 'fp'); continue; }
      let s;
      if (mine) { const st = ME.st; s = { x: st.x, y: st.y, z: st.z, yaw: st.yaw, pitch: st.pitch, crouch: st.crouch, sprint: st.sprint, draw: ME.drawing ? 1 - (1 - W.drawPower(ME.drawT)) ** 2 : 0, aim: ME.drawing ? 1 : 0, arrows: ME.arrows, inAir: !st.onGround }; }
      else { const q = sampleP(p, rt); if (!q) { P.root.visible = false; continue; } s = { x: q.x, y: q.y, z: q.z, yaw: q.yaw, pitch: q.pitch, crouch: !!(q.f & 2), sprint: !!(q.f & 4), draw: (q.f & 8) ? 1 - (1 - q.draw) ** 2 : 0, aim: (q.f & 8) ? 1 : 0, arrows: p.arrows, inAir: false }; p.vis = s;
        if (!(q.f & 1) && !P.fin) { P.root.visible = false; continue; } }
      P.root.visible = !(mine && ME.cam === 'fp');
      posePerson(P, s, dt);
      // footsteps you can hear (and place)
      const stepPh = Math.floor(P.phase / Math.PI); if (stepPh !== P.lastStep) { P.lastStep = stepPh; if (!mine && P.speed > .8) emit('step', s, P.speed, p); }
    }
  }
  // ---- arrows
  const ARW = new Map();
  on('arrowNew', a => { if (!X) return; const shooter = CL.players.get(a.by); const m = makeArrowMesh((shooter && shooter.bow) || (a.by === CL.me ? PROFILE.equipped : 'longbow')); m.visible = false; X.scene.add(m); ARW.set(a, m); if (a.by !== CL.me) emit('shotHeard', a); });
  on('arrowGone', a => { const m = ARW.get(a); if (m) { X.scene.remove(m); ARW.delete(a); } });
  const STUCK = new Map();
  on('stuckNew', s => { if (!X) return; const shooter = CL.players.get(s.by); const m = makeArrowMesh((shooter && shooter.bow) || 'longbow'); placeArrow(m, s.p, s.d, .12); X.scene.add(m); STUCK.set(s.id, { m, s, wob: 1, base: m.quaternion.clone() }); });
  on('stuckGone', s => { const k = STUCK.get(s.id); if (k) { X.scene.remove(k.m); STUCK.delete(s.id); if (s.by === CL.me) burst('spark', s.p, 6, { col: [1, .9, .6], size: .05, sp: 1 }); } });
  on('worldReset', () => { for (const b of DEBRIS) X && X.scene.remove(b.m); DEBRIS.length = 0; for (const f of FLOATS) X && X.scene.remove(f.s); FLOATS.length = 0; for (const [, m] of ARW) X && X.scene.remove(m); ARW.clear(); for (const [, k] of STUCK) X && X.scene.remove(k.m); STUCK.clear(); FINS.forEach(f => f.objs.forEach(o => o.parent && o.parent.remove(o))); FINS = []; if (BILLS) { BILLS.list = []; COINS3.list = []; } });
  const _ld = { v: null };
  function placeArrow(m, p, d, bury) { const v = new THREE.Vector3(p[0], p[1], p[2]); m.position.copy(v).addScaledVector(new THREE.Vector3(d[0], d[1], d[2]), -bury + .12); m.lookAt(v.x - d[0], v.y - d[1], v.z - d[2]); }
  function arrowTime(a) { return a.local ? now() - a.t0 : srvNow() - INTERP - a.tm; }
  function endTime(a) { const p = a.end.m.p, dx = p[0] - a.o[0], dz = p[2] - a.o[2], hv = Math.hypot(a.v[0], a.v[2]); return hv > .1 ? Math.hypot(dx, dz) / hv : .3; }
  function updateArrows(dt) {
    for (const [id, a] of CL.arrows) {
      const m = ARW.get(a); const t = arrowTime(a);
      if (a.end && t >= endTime(a)) { finishArrow(a); CL.arrows.delete(id); if (m) { X.scene.remove(m); ARW.delete(a); } continue; }
      if (t > 8) { CL.arrows.delete(id); if (m) { X.scene.remove(m); ARW.delete(a); } continue; }
      if (!m) continue;
      if (t < 0) { m.visible = false; continue; }
      const p = W.arrowAt(a.o, a.v, t), vy = a.v[1] - W.GRAV * t; m.visible = true; m.position.set(p[0], p[1], p[2]); m.lookAt(p[0] - a.v[0], p[1] - vy, p[2] - a.v[2]);
      // a bright streak behind every arrow in the air, in the colour of its bow
      if (t > .03) { const sh = CL.players.get(a.by), col = TRAIL[(sh && sh.bow) || 'longbow'] || TRAIL.longbow, prev = a.lastTrail || p; for (let k = 0; k < 3; k++) { const u = k / 3; PS.trail.add(lp(prev[0], p[0], u), lp(prev[1], p[1], u), lp(prev[2], p[2], u), 0, 0, 0, { life: .32, size: .09 + (a.pw || 1) * .05, col, a: .85, g: 0 }); } a.lastTrail = p; }
      // a fly-by you can hear
      if (a.by !== CL.me && !a.whoosh) { const c = X.camera.position, d = Math.hypot(p[0] - c.x, p[1] - c.y, p[2] - c.z); if (d < 3.5) { a.whoosh = true; emit('whoosh', p); } }
    }
    for (const [, k] of STUCK) if (k.wob > 0) { k.wob = Math.max(0, k.wob - dt * 2.2); k.m.quaternion.copy(k.base); k.m.rotateX(Math.sin(k.wob * 40) * .06 * k.wob); }
  }
  const TRAIL = { longbow: [1, .92, .7], cupid: [1, .5, .75], yardstick: [1, .85, .25], cashout: [.45, 1, .5] };
  function finishArrow(a) {
    const e = a.end; if (!e) return;
    if (e.kind === 'stick') { addStuck(e.m); impact(e.m.p, e.m.mat, e.m.d); emit('impact', e.m.p, e.m.mat); }
    else bodyHitVisual(e.m);
  }
  on('bodyHit', m => bodyHitVisual(m));
  function bodyHitVisual(m) {
    const p = CL.players.get(m.v); impact(m.p, 'body'); emit('impact', m.p, 'body', m);
    if (p && p.model) { const shooter = CL.players.get(m.by), am = makeArrowMesh((shooter && shooter.bow) || 'longbow'); am.scale.setScalar(.85); const off = new THREE.Vector3(m.off[0], m.off[1], m.off[2]), d = new THREE.Vector3(m.dl[0], m.dl[1], m.dl[2]);
      am.position.copy(off).addScaledVector(d, .1); am.lookAt(off.clone().sub(d)); p.model.root.add(am); am.position.copy(off).addScaledVector(d, .1); am.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), d); p.model.stuck.push(am); }
  }
  function burst(kind, p, n, o = {}) { const P = PS[kind]; if (!P) return; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, u = Math.random() * 2 - 1, s = (o.sp || 2) * (.4 + Math.random() * .8), r = Math.sqrt(1 - u * u); P.add(p[0], p[1], p[2], Math.cos(a) * r * s + (o.vx || 0), Math.abs(u) * s * (o.up || 1) + (o.vy || 0), Math.sin(a) * r * s + (o.vz || 0), { life: (o.life || .8) * (.6 + Math.random() * .8), size: o.size || .08, col: o.col, g: o.g, drag: o.drag, spin: (Math.random() - .5) * 10, flutter: o.flutter, grow: o.grow, a: o.a, floor: o.floor }); } }
  function impact(p, mat, d) {
    const ring = (col, size) => RINGS.push({ p: [p[0], p[1], p[2]], t: 0, col, size, s: new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.ring, color: new THREE.Color(...col), transparent: true, depthWrite: false })) });
    if (mat === 'wood') { burst('cube', p, 10, { col: [.62, .42, .24], size: .07, sp: 3, up: 1.5, life: 1, floor: true }); burst('dust', p, 4, { col: [.7, .58, .42], size: .3, sp: .5, g: .3, life: .7, grow: 1, a: .4 }); }
    else if (mat === 'stone') { burst('cube', p, 9, { col: [.72, .72, .7], size: .07, sp: 3.2, up: 1.5, life: .9, floor: true }); burst('spark', p, 10, { col: [1, .85, .45], size: .05, sp: 4, life: .25 }); burst('dust', p, 5, { col: [.85, .85, .8], size: .3, sp: .6, g: .2, life: .8, grow: 1.2, a: .4 }); }
    else if (mat === 'water') { burst('dust', p, 16, { col: [.75, .92, 1], size: .12, sp: 2.4, up: 3, g: 9, life: .75, a: .8 }); ring([.8, .95, 1], 1.6); }
    else if (mat === 'body') { burst('star', p, 5, { col: [1, 1, .8], size: .22, sp: 1.6, g: 0, life: .35 }); burst('cube', p, 12, { col: [1, .35, .3], size: .06, sp: 3, up: 1.5, life: .7, floor: true }); ring([1, 1, 1], 1.1); }
    else { burst('cube', p, 10, { col: [.35, .55, .22], size: .07, sp: 2.6, up: 2, life: 1, floor: true }); burst('cube', p, 6, { col: [.55, .4, .25], size: .06, sp: 2.2, up: 2, life: 1, floor: true }); burst('dust', p, 6, { col: [.7, .62, .45], size: .32, sp: .8, g: .5, life: .9, grow: 1.4, a: .45 }); }
  }
  // floating numbers over whoever got hit (bigger and gold for a headshot)
  const NUMTEX = {};
  function numTex(txt, col) { const k = txt + col; if (NUMTEX[k]) return NUMTEX[k]; const [c, g] = cvs(256, 96); g.font = '900 64px Nunito, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 12; g.lineJoin = 'round'; g.strokeStyle = '#1b1b1b'; g.strokeText(txt, 128, 50); g.fillStyle = col; g.fillText(txt, 128, 48); return NUMTEX[k] = tex(c, { clamp: true }); }
  function floatText(p, txt, col, scale = 1) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: numTex(txt, col), transparent: true, depthTest: false, depthWrite: false })); s.renderOrder = 30; s.position.set(p[0], p[1], p[2]); X.scene.add(s); FLOATS.push({ s, t: 0, scale, vx: (Math.random() - .5) * .6 }); }
  on('hitInfo', m => { if (!X) return; const kill = m.hp <= 0, head = m.zone === 'head'; floatText([m.p[0], m.p[1] + .4, m.p[2]], kill ? (head ? 'HEADSHOT!' : 'KO!') : '-' + m.dmg, kill ? '#ffd23a' : head ? '#ffb02e' : '#ffffff', kill ? 1.5 : head ? 1.25 : 1); });
  // the toy-figure break-apart: every block of the archer flies off, bounces, and pops away
  function breakApart(P, m) {
    P.root.updateMatrixWorld(true);
    const dir = new THREE.Vector3(m.d[0], 0, m.d[2]); if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1); dir.normalize();
    const c = new THREE.Vector3(m.p[0], m.p[1] + 1, m.p[2]);
    P.root.traverse(o => {
      if (!o.isMesh || !o.visible) return; let vis = true; for (let q = o; q && q !== P.root; q = q.parent) if (!q.visible) vis = false; if (!vis) return;
      // a fresh mesh, not clone(): clone copies userData, which points back at the archer
      const d = new THREE.Mesh(o.geometry, o.material); o.matrixWorld.decompose(d.position, d.quaternion, d.scale); d.castShadow = true; X.scene.add(d);
      const out = d.position.clone().sub(c); out.y = Math.max(.2, out.y + .4); out.normalize();
      DEBRIS.push({ m: d, v: out.multiplyScalar(1.6 + Math.random() * 2.4).addScaledVector(dir, 2.2).add(new THREE.Vector3(0, 2 + Math.random() * 2.2, 0)), w: new THREE.Vector3((Math.random() - .5) * 14, (Math.random() - .5) * 14, (Math.random() - .5) * 14), t: Math.random() * -.05, s0: d.scale.clone() });
    });
    burst('dust', [c.x, c.y, c.z], 14, { col: [1, 1, 1], size: .5, sp: 1.6, g: .3, life: .9, grow: 1.6, a: .55 });
    burst('cube', [c.x, c.y, c.z], 26, { col: [1, .85, .3], size: .07, sp: 4.5, up: 2.5, life: 1.3, floor: true });
  }
  function updateDebris(dt) {
    for (let i = DEBRIS.length - 1; i >= 0; i--) {
      const b = DEBRIS[i]; b.t += dt; if (b.t < 0) continue; const m = b.m;
      b.v.y -= 16 * dt; m.position.addScaledVector(b.v, dt); m.rotation.x += b.w.x * dt; m.rotation.y += b.w.y * dt; m.rotation.z += b.w.z * dt;
      const gy = visH(m.position.x, m.position.z) + .06; if (m.position.y < gy) { m.position.y = gy; if (b.v.y < 0) b.v.y *= -.32; b.v.x *= .55; b.v.z *= .55; b.w.multiplyScalar(.5); }
      if (b.t > 2.4) { const k = Math.max(0, 1 - (b.t - 2.4) / .35); m.scale.copy(b.s0).multiplyScalar(k); if (k <= 0) { X.scene.remove(m); DEBRIS.splice(i, 1); if (Math.random() < .3) burst('star', [m.position.x, m.position.y + .1, m.position.z], 1, { col: [1, 1, .85], size: .25, sp: .2, g: 0, life: .3 }); } }
    }
    for (let i = FLOATS.length - 1; i >= 0; i--) { const f = FLOATS[i]; f.t += dt; const k = f.t / .95, pop = f.t < .12 ? f.t / .12 * 1.25 : lp(1.25, 1, cl((f.t - .12) / .15, 0, 1)); f.s.position.y += dt * 1.1; f.s.position.x += f.vx * dt; const dk = cl(f.s.position.distanceTo(X.camera.position) * .13, .8, 6); f.s.scale.set(1.15 * f.scale * pop * dk, .43 * f.scale * pop * dk, 1); f.s.material.opacity = 1 - sm(cl((k - .6) / .4, 0, 1)); if (k >= 1) { X.scene.remove(f.s); FLOATS.splice(i, 1); } }
    for (let i = RINGS.length - 1; i >= 0; i--) { const r = RINGS[i]; if (!r.s.parent) { r.s.position.set(...r.p); X.scene.add(r.s); } r.t += dt; const k = r.t / .4; r.s.scale.setScalar(.2 + k * r.size); r.s.material.opacity = 1 - k; if (k >= 1) { X.scene.remove(r.s); r.s.material.dispose(); RINGS.splice(i, 1); } }
  }
  // ---- the aim line: the same launch speed and gravity the real arrow will have, flown until it meets the world
  // (a tree, a wall, the ground); leaves let arrows through, so they don't stop it. Settings can cut it back to a short arc.
  let _aimF, _aimR, _aimU; LAZY.push(() => { _aimF = new THREE.Vector3(); _aimR = new THREE.Vector3(); _aimU = new THREE.Vector3(); });
  function updateArc() {
    if (!ARC) return; const show = ME.drawing && ME.cam === 'fp' && canAct(); ARC.visible = show; AIMMARK.visible = false; if (!show) return;
    const { o, v } = previewNow(), sp = Math.hypot(v[0], v[1], v[2]) || 1, full = CFG.aimLine !== 'short', pa = ARC.geometry.attributes.position, aa = ARC.geometry.attributes.aa, k0 = cl(ME.drawT / .1, 0, 1);
    const pr = X.renderer.getPixelRatio(); ARC.material.uniforms.px.value = 6 * pr; ARC.material.uniforms.sc.value = innerHeight * pr * .5 / Math.tan(X.camera.fov * Math.PI / 360);
    // seen from behind, a fast arrow's path lies almost on your line of sight; so the drawn line leaves from the bow (low on the
    // left of the screen) and eases onto the true flight over the first dozen metres, which keeps it readable as an arc
    const cam = X.camera, fwd = _aimF.set(0, 0, -1).applyQuaternion(cam.quaternion), rt = _aimR.set(1, 0, 0).applyQuaternion(cam.quaternion), up = _aimU.set(0, 1, 0).applyQuaternion(cam.quaternion);
    const sx = cam.position.x + rt.x * -.3 + up.x * -.24 + fwd.x * 1.1 - o[0], sy = cam.position.y + rt.y * -.3 + up.y * -.24 + fwd.y * 1.1 - o[1], sz = cam.position.z + rt.z * -.3 + up.z * -.24 + fwd.z * 1.1 - o[2];
    const step = .7 / sp, maxT = full ? 4.5 : 13 / sp; let prev = o, n = 0, hit = null;
    for (let i = 1; i < AIM_N; i++) {
      const t = i * step; if (t > maxT) break; const p = W.arrowAt(o, v, t);
      if (full) { const h = W.sweepWorld(prev, p); if (h) { hit = [lp(prev[0], p[0], h.t), lp(prev[1], p[1], h.t), lp(prev[2], p[2], h.t)]; break; } }
      const dist = t * sp, ease = full ? 1 - sm(cl(dist / 14, 0, 1)) : 0; pa.setXYZ(n, p[0] + sx * ease, p[1] + sy * ease, p[2] + sz * ease); aa.setX(n, k0 * (full ? cl((dist - .6) / 1.5, 0, 1) * .95 : (i < 2 ? 0 : .55 * Math.pow(1 - i / 18, 1.5)))); n++; prev = p;
    }
    for (let i = n; i < AIM_N; i++) aa.setX(i, 0);
    ARC.geometry.setDrawRange(0, n); pa.needsUpdate = aa.needsUpdate = true;
    if (hit) { const c = X.camera.position, d = Math.hypot(hit[0] - c.x, hit[1] - c.y, hit[2] - c.z), k = d * .045 * (1 + Math.sin(X.t * 8) * .06); AIMMARK.visible = true; AIMMARK.position.set(hit[0], hit[1] + .02, hit[2]); AIMMARK.userData.ringS.scale.setScalar(k); AIMMARK.userData.dotS.scale.setScalar(k * .45); AIMMARK.userData.ringS.material.opacity = .9 * k0; }
  }
  // ---- pings
  const PINGS = [];
  on('ping', m => { if (!X) return; const g = new THREE.Group(), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.dot, color: new THREE.Color('#ffe08a'), transparent: true, depthTest: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(.9); g.add(sp);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 6, 6, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending })); beam.position.y = 3; g.add(beam); g.position.set(m.p[0], m.p[1], m.p[2]); X.scene.add(g); PINGS.push({ g, t: 0, m }); });
  // ---- finishers: the bow that landed the last arrow decides what happens to you
  on('elim', m => { if (X) startFinisher(m); });
  function startFinisher(m) {
    const p = CL.players.get(m.v); if (!p) return; const P = ensureModel(p);
    const f = { m, P, p, t: 0, kind: m.bow || 'longbow', mine: m.v === CL.me, objs: [], hit: false, dur: m.v === CL.me ? 2.2 : 1.7 };
    P.fin = f; P.root.visible = true; P.root.position.set(m.p[0], m.p[1], m.p[2]); P.root.rotation.set(0, m.yaw, 0); P.draw = 0; P.raise = 0;
    const killer = CL.players.get(m.k), kpos = killer && (killer.id === CL.me ? ME.st : killer.vis);
    f.fromYaw = kpos ? Math.atan2(kpos.x - m.p[0], kpos.z - m.p[2]) : m.yaw + Math.PI;
    if (f.kind === 'cupid') for (let k = 0; k < 6; k++) { const h = new THREE.Mesh(heartGeo(.32, .14), bmat('bigHeart', { color: LC('#e0476b'), roughness: .3, metalness: .1, emissive: LC('#5a0f20') })); h.userData.k = k; X.scene.add(h); f.objs.push(h); }
    if (f.kind === 'cupid') { const big = new THREE.Mesh(heartGeo(1.5, .7), bmat('bigHeart', {})); big.visible = false; X.scene.add(big); f.big = big; f.objs.push(big); }
    if (f.kind === 'yardstick') { const r = new THREE.Mesh(new THREE.BoxGeometry(.9, 7.2, .16), [bmat('rulerS', { color: LC('#c9a24a') }), bmat('rulerS', {}), bmat('rulerS', {}), bmat('rulerS', {}), bmat('rulerBig', { map: TEX.ruler, roughness: .55 }), bmat('rulerBig', {})]);
      r.geometry.translate(0, 3.6, 0); const uv = r.geometry.attributes.uv; for (let i = 16; i < 24; i++) uv.setXY(i, uv.getY(i), uv.getX(i)); r.castShadow = true; X.scene.add(r); f.ruler = r; f.objs.push(r); }
    if (f.mine) { ME.cam = 'finisher'; ME.fin = f; ME.deadAt = now(); finisherCam(f); }
    emit('finisher', f);
  }
  const groundY = (x, z) => visH(x, z);
  function finisherCam(f) {
    const m = f.m, C = new THREE.Vector3(m.p[0], m.p[1] + 1, m.p[2]), base = f.fromYaw, far = f.kind === 'cashout' ? 4.2 : f.kind === 'yardstick' ? 5.2 : 3.4, hi = f.kind === 'yardstick' ? 2.1 : 1.3;
    let best = null, bestScore = -1;
    for (const off of [.7, -.7, 1.4, -1.4, .2, -.2, 2.2, -2.2, Math.PI]) for (const [dist, h] of [[far, hi], [far * .75, hi * .6], [far * .55, .45]]) {
      const a = base + off, cam = new THREE.Vector3(C.x + Math.sin(a) * dist, C.y + h, C.z + Math.cos(a) * dist), dir = cam.clone().sub(C), L = dir.length(); dir.normalize();
      const clear = Math.min(W.rayWorld([C.x, C.y, C.z], [dir.x, dir.y, dir.z], L), W.rayWorld([C.x, C.y + .6, C.z], [dir.x, dir.y, dir.z], L));
      const okGround = cam.y > groundY(cam.x, cam.z) + .35, score = (clear >= L - .05 ? 2 : clear / L) + (okGround ? 1 : 0) - Math.abs(off) * .02;
      if (score > bestScore) { bestScore = score; best = { cam: clear >= L - .05 ? cam : C.clone().addScaledVector(dir, Math.max(1.2, clear * .85)), a, dist }; }
      if (score >= 2.9) break;
    }
    f.cam = best; f.camFrom = X.camera.position.clone(); f.lookFrom = X.camera.getWorldDirection(new THREE.Vector3()).add(X.camera.position);
    // the giant ruler swings in from the side the camera sees side-on
    if (f.ruler) placeRuler(f, best.a + Math.PI / 2);
  }
  function updateFinishers(dt) {
    for (let i = FINS.length - 1; i >= 0; i--) { const f = FINS[i]; f.t += dt; stepFinisher(f, dt); if (f.t > 6 && !f.mine) { f.objs.forEach(o => o.parent && o.parent.remove(o)); FINS.splice(i, 1); } }
  }
  // the ruler stands 6.2 m to one side and falls toward the victim; its marked face turned to the camera
  function placeRuler(f, side) {
    const m = f.m, px = m.p[0] + Math.sin(side) * 6.2, pz = m.p[2] + Math.cos(side) * 6.2, dx = -Math.sin(side), dz = -Math.cos(side);
    f.ruler.position.set(px, groundY(px, pz) - .1, pz); f.rulerAxis = new THREE.Vector3(dz, 0, -dx).normalize(); f.rulerYaw = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(dz, -dx), 0)); f.ruler.quaternion.copy(f.rulerYaw);
  }
  on('finisher', f => { FINS.push(f); if (f.ruler && !f.rulerAxis) placeRuler(f, f.fromYaw + Math.PI / 2); });
  function stepFinisher(f, dt) {
    const P = f.P, m = f.m, t = f.t, root = P.root, x0 = m.p[0], y0 = m.p[1], z0 = m.p[2];
    const limp = k => { P.L.sh.rotation.set(k * .6, 0, -.5 - k * .8); P.R.sh.rotation.set(k * .6, 0, .5 + k * .8); P.L.el.rotation.set(-.4, 0, 0); P.R.el.rotation.set(-.4, 0, 0); };
    if (f.kind === 'longbow') {
      // a moment's wobble, then the toy archer bursts into its blocks
      root.position.set(x0, y0, z0); root.rotation.set(0, m.yaw, 0); limp(.3); root.rotation.z = Math.sin(t * 40) * .05;
      if (t > .12 && !f.hit) { f.hit = true; breakApart(P, m); root.visible = false; P.dead = true; X.shake = Math.max(X.shake, f.mine ? .4 : 0); emit('pop', m.p); }
    } else if (f.kind === 'cupid') {
      // hearts swirl up around them; a giant heart stamps the ground; petals and tiny hearts where they stood
      const lift = sm(cl(t / .9, 0, 1)); root.position.set(x0, y0 + lift * .25, z0); root.rotation.set(0, m.yaw + lift * 1.2, 0); limp(lift); P.neck.rotation.x = -lift * .3;
      f.objs.filter(o => o.userData.k != null).forEach(h => { const k = h.userData.k, a = k / 6 * TAU + t * 2.6, r = 1.1 - lift * .3, s = Math.min(1, t * 2.5) * (1 - cl((t - 1.05) * 6, 0, 1)); h.position.set(x0 + Math.cos(a) * r, y0 + .4 + k * .25 + t * .5, z0 + Math.sin(a) * r); h.rotation.set(0, -a, Math.sin(t * 5 + k) * .3); h.scale.setScalar(Math.max(.001, s)); });
      if (f.big) { const T = t - .85; if (T > 0) { f.big.visible = true; const fallT = cl(T / .22, 0, 1), gy = groundY(x0, z0); f.big.position.set(x0, gy + 1.4 + (1 - fallT * fallT) * 8, z0); f.big.rotation.set(0, f.cam ? f.cam.a : f.fromYaw, 0); const sq = T > .22 ? Math.max(.6, 1 - Math.sin(cl((T - .22) * 6, 0, 1) * Math.PI) * .35) : 1; f.big.scale.set(2 - sq, sq, 2 - sq); if (T > .9) f.big.scale.multiplyScalar(Math.max(.001, 1 - (T - .9) * 2)); }
        if (T > .22 && !f.hit) { f.hit = true; root.visible = false; P.dead = true; const c = [x0, groundY(x0, z0) + .9, z0]; burst('petal', c, 140, { col: [.95, .45, .55], size: .1, sp: 4, up: 1.5, g: 1.2, drag: 1.6, flutter: 4, life: 2.6, floor: true }); burst('heart', c, 60, { col: [1, .35, .5], size: .16, sp: 3, up: 2, g: .6, drag: 1.2, life: 2, grow: .3 }); burst('spark', c, 30, { col: [1, .6, .75], size: .2, sp: 3, life: .5 }); emit('cupidPop', m.p); } }
    } else if (f.kind === 'yardstick') {
      // a giant ruler swings down: THWACK. Flattened.
      root.position.set(x0, y0, z0); root.rotation.set(0, m.yaw, 0); limp(.4);
      if (f.ruler && f.rulerAxis) { const sw = cl((t - .2) / .38, 0, 1); let ang = sw * sw * sw * (Math.PI / 2 - .06); if (t > .58) ang = Math.PI / 2 - .06 - Math.sin(cl((t - .58) * 3, 0, 1) * Math.PI) * .14;
        f.ruler.quaternion.setFromAxisAngle(f.rulerAxis, ang).multiply(f.rulerYaw); }
      if (t > .58 && !f.hit) { f.hit = true; emit('thwack', m.p); X.shake = 1; THWACK.visible = true; f.thw = 0; burst('dust', [x0, groundY(x0, z0) + .2, z0], 18, { col: [.55, .48, .36], size: .6, sp: 2.5, up: .3, g: .2, grow: 1.4, a: .5, life: 1.2 }); burst('leaf', [x0, groundY(x0, z0) + .3, z0], 20, { col: [.5, .42, .2], size: .12, sp: 3, up: 2, g: 2, drag: 2, flutter: 3, life: 2, floor: true }); }
      if (f.hit) { const k = t - .58, sq = 1 + Math.sin(Math.min(k * 18, Math.PI)) * .3 * Math.exp(-k * 4); root.scale.set(1.35 * sq, Math.max(.13, .14 / sq), 1.35 * sq); P.dead = true;
        f.thw += dt; THWACK.position.set(x0, groundY(x0, z0) + 2.4 + f.thw * .6, z0); const ts = Math.min(1, f.thw * 8) * (1 - cl((f.thw - .9) * 3, 0, 1)); THWACK.scale.set(4.4 * ts, 1.1 * ts, 1); THWACK.visible = ts > .01; }
    } else if (f.kind === 'cashout') {
      // a rattle, then a cloud of bank notes and spinning coins; a cash register rings
      root.position.set(x0 + (t < .3 ? (Math.random() - .5) * .06 : 0), y0, z0); root.rotation.set(0, m.yaw, 0); limp(.5); root.scale.setScalar(1 + sm(cl(t / .3, 0, 1)) * .12);
      if (t > .3 && !f.hit) { f.hit = true; root.visible = false; P.dead = true; emit('cashout', m.p); const c = [x0, y0 + 1, z0];
        for (let k = 0; k < 130; k++) { const a = Math.random() * TAU, u = Math.random(), s = 2 + Math.random() * 4; BILLS.list.push({ x: c[0], y: c[1] + Math.random() * .5, z: c[2], vx: Math.cos(a) * s * (1 - u * .5), vy: 2 + u * 6, vz: Math.sin(a) * s * (1 - u * .5), rx: Math.random() * TAU, ry: Math.random() * TAU, rz: Math.random() * TAU, sx: (Math.random() - .5) * 12, sy: (Math.random() - .5) * 12, age: 0 }); }
        for (let k = 0; k < 60; k++) { const a = Math.random() * TAU, s = 1.5 + Math.random() * 3.5; COINS3.list.push({ x: c[0], y: c[1], z: c[2], vx: Math.cos(a) * s, vy: 3 + Math.random() * 5, vz: Math.sin(a) * s, rx: 0, ry: 0, rz: 0, sx: 15 + Math.random() * 15, sy: Math.random() * 8, age: 0, coin: true }); }
        burst('spark', c, 40, { col: [1, .9, .4], size: .18, sp: 4, life: .6 }); if (BILLS.list.length > 250) BILLS.list.splice(0, BILLS.list.length - 250); if (COINS3.list.length > 90) COINS3.list.splice(0, COINS3.list.length - 90); }
    }
    for (const a of P.stuck || []) a.visible = root.visible;
  }
  function updateCash(dt) {
    if (!BILLS) return; const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(1, 1, 1), Pp = new THREE.Vector3();
    for (const B of [BILLS, COINS3]) {
      let n = 0;
      for (const b of B.list) { b.age += dt; const gy = groundY(b.x, b.z) + (b.coin ? .02 : .01);
        if (b.y > gy) { if (b.coin) { b.vy -= 9.8 * dt; } else { b.vy = Math.max(b.vy - 9.8 * dt, -1.1); b.vx *= Math.exp(-1.6 * dt); b.vz *= Math.exp(-1.6 * dt); b.vx += Math.sin(b.age * 5 + b.rx) * 1.6 * dt; } b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.rx += b.sx * dt; b.ry += b.sy * dt; }
        if (b.y <= gy) { b.y = gy; if (b.coin && b.vy < -1.5) { b.vy *= -.35; b.y = gy + .001; } else { b.vy = 0; b.vx = b.vz = 0; b.rx = b.coin ? 0 : Math.PI / 2; b.sx = b.sy = 0; } }
        if (b.age > 9) continue; E.set(b.rx, b.ry, b.rz); Q.setFromEuler(E); M.compose(Pp.set(b.x, b.y, b.z), Q, S); B.m.setMatrixAt(n++, M); if (n >= (B === BILLS ? 260 : 90)) break; }
      B.list = B.list.filter(b => b.age <= 9); B.m.count = n; B.m.instanceMatrix.needsUpdate = true;
    }
  }
  // ---- cameras
  function updateCamera(dt) {
    const cam = X.camera;
    if (!CL.src && ME.cam !== 'finisher' && ME.cam !== 'dead') {   // the menus: a slow drift past the bridge
      const a = X.t * .04, r = 24; cam.position.set(70 + Math.sin(a) * r, W.terrainH(70, 70) + 5.5 + Math.sin(X.t * .1) * .8, 70 + Math.cos(a) * r); cam.lookAt(70, W.terrainH(70, 70) + 1.4, 70); return;
    }
    if (ME.cam === 'finisher' && ME.fin) {
      const f = ME.fin, k = sm(cl(f.t / .35, 0, 1)), C = new THREE.Vector3(f.m.p[0], f.m.p[1] + (f.kind === 'yardstick' && f.hit ? .3 : 1), f.m.p[2]);
      let target = f.cam.cam.clone(); if (f.kind === 'cashout') { const back = target.clone().sub(C); target = C.clone().add(back.multiplyScalar(1 + sm(cl((f.t - .2) / 1.2, 0, 1)) * .55)); }
      cam.position.copy(f.camFrom).lerp(target, k); const look = f.lookFrom.clone().lerp(C, k); cam.lookAt(look);
      if (f.t > f.dur) { const mate = CL.mode !== 'ffa' && CL.src === 'online' && [...CL.players.values()].find(p => p.id !== CL.me && !p.dummy && p.team === (meP() || {}).team && p.alive && CL.phase !== 'roundEnd'); if (mate) { ME.cam = 'spectate'; ME.specId = mate.id; } else ME.cam = 'dead'; }
    } else if (ME.cam === 'dead') {
      const f = ME.fin; if (f && f.cam) { cam.position.lerp(f.cam.cam, .02); cam.lookAt(f.m.p[0], f.m.p[1] + .6, f.m.p[2]); }
      const mate = CL.mode !== 'ffa' && CL.src === 'online' && [...CL.players.values()].find(p => p.id !== CL.me && p.team === (meP() || {}).team && p.alive); if (mate && live()) { ME.cam = 'spectate'; ME.specId = mate.id; }
    } else if (ME.cam === 'spectate') {
      const p = CL.players.get(ME.specId); if (!p || !p.alive || !p.vis) { const mate = [...CL.players.values()].find(q => q.id !== CL.me && q.team === (meP() || {}).team && q.alive && q.vis); if (mate) ME.specId = mate.id; else { ME.cam = 'dead'; } }
      if (p && p.vis) { const s = p.vis, T = new THREE.Vector3(s.x, s.y + (s.crouch ? 1.25 : 1.65), s.z), fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw), want = new THREE.Vector3(s.x - fx * 2.6 + fz * .55 * -1, T.y + .35 - s.pitch * .8, s.z - fz * 2.6 + fx * .55), d = want.clone().sub(T), L = d.length(); d.normalize();
        const clear = W.rayWorld([T.x, T.y, T.z], [d.x, d.y, d.z], L); const pos = T.clone().addScaledVector(d, Math.max(.4, Math.min(L, clear - .2))); cam.position.lerp(pos, 1 - Math.exp(-12 * dt)); cam.lookAt(T.x + fx * 10, T.y + Math.sin(s.pitch) * 10, T.z + fz * 10); }
    } else {
      const st = ME.st, bob = Math.sin(ME.bob * 2) * .025 * ME.moveAmt;
      cam.position.set(st.x, st.y + ME.eye + bob, st.z); cam.rotation.set(st.pitch + (ME.releasedAt > now() - .12 ? -.006 : 0), st.yaw, Math.sin(ME.bob) * .004 * ME.moveAmt);
    }
    if (X.shake > 0) { X.shake = Math.max(0, X.shake - dt * 2.5); cam.position.x += (Math.random() - .5) * .12 * X.shake; cam.position.y += (Math.random() - .5) * .12 * X.shake; }
    const hurt = now() - ME.hurtAt; if (hurt < .3 && ME.cam === 'fp') cam.rotation.z += Math.sin(hurt * 40) * .02 * (1 - hurt / .3);
  }
  function renderFrame(dt) { visualUpdate(dt); drawFrame(); dynRes(dt); }
  // keep it smooth on an iPad or a laptop: if frames run long for a couple of seconds, draw fewer pixels (and more when there's room)
  const DYN = { acc: 0, n: 0, slowT: 0, fastT: 0 };
  function dynRes(dt) {
    if (DEV || CFG.quality !== 'auto') return; DYN.acc += dt; DYN.n++;
    if (DYN.acc < .5) return; const avg = DYN.acc / DYN.n * 1000; DYN.acc = 0; DYN.n = 0;
    if (avg > 23) { DYN.slowT += .5; DYN.fastT = 0; } else if (avg < 15) { DYN.fastT += .5; DYN.slowT = 0; } else { DYN.slowT = DYN.fastT = 0; }
    if (DYN.slowT >= 2 && X.dyn > .55) { X.dyn = Math.max(.55, X.dyn - .15); DYN.slowT = 0; applyQuality(); }
    else if (DYN.fastT >= 6 && X.dyn < 1) { X.dyn = Math.min(1, X.dyn + .1); DYN.fastT = 0; applyQuality(); }
  }
  function visualUpdate(dt) {
    X.t += dt; X.wind.time.value = X.t; X.wind.amt.value = .85 + .35 * Math.sin(X.t * .23) + .15 * Math.sin(X.t * .71);
    updateCharacters(dt); updateArrows(dt); for (const k in PS) PS[k].step(dt); updateFinishers(dt); updateCash(dt); updateDebris(dt); updateCamera(dt); updateArc(); poseViewModel(dt);
    for (let i = PINGS.length - 1; i >= 0; i--) { const p = PINGS[i]; p.t += dt; p.g.children[0].scale.setScalar(.7 + Math.sin(X.t * 6) * .15); if (p.t > 7) { X.scene.remove(p.g); PINGS.splice(i, 1); } }
    X.picks.forEach((g, i) => { g.visible = !!CL.picks[i]; g.userData.glow.material.opacity = .35 + Math.sin(X.t * 3 + i) * .2; if (g.userData.ring) { g.userData.ring.rotation.z = X.t * 1.5; g.userData.ring.position.y = .08 + Math.sin(X.t * 2.4 + i) * .04; g.userData.ring.scale.setScalar(1 + Math.sin(X.t * 3 + i) * .06); } });
    const zone = X.zone, ot = CL.phase === 'overtime'; zone.visible = ot; if (ot) { const inn = CL.zoneIn || [0, 0], col = inn[0] && inn[1] ? '#f4f1e6' : inn[0] ? W.TEAMS[0].col : inn[1] ? W.TEAMS[1].col : '#e9c46a'; zone.material.uniforms.col.value.set(col); zone.material.uniforms.t.value = X.t; zone.material.uniforms.a.value = .55; }
    if (X.water) X.water.rn.offset.set(X.t * .03, X.t * .011);
    // the sun's shadow follows you (snapped, so it doesn't shimmer)
    const c = X.camera.position, sx = Math.round(c.x / 4) * 4, sz = Math.round(c.z / 4) * 4; X.sun.target.position.set(sx, 0, sz); X.sun.position.set(sx + X.sunDir.x * 90, X.sunDir.y * 90, sz + X.sunDir.z * 90); X.sun.target.updateMatrixWorld();
  }
  // draw it (skipped by the automated multi-player checks, which still run everything above)
  function drawFrame() {
    X.renderer.clear(); X.renderer.render(X.scene, X.camera);
    if (VM.g && VM.g.visible) { X.renderer.clearDepth(); X.vmCam.fov = 62; X.vmCam.updateProjectionMatrix(); X.vmSun.position.copy(X.sunDir); X.renderer.render(X.vmScene, X.vmCam); }
  }
