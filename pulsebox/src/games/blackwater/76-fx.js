  /* ---------- 76 fx: rain, spray and splashes, the waterspout's funnel ---------- */
  function buildFx() {
    const q = X.q, nRain = q === 'low' ? 700 : q === 'high' ? 3200 : 1700, nSpray = q === 'low' ? 260 : q === 'high' ? 1100 : 600;
    // rain: short streaks in a box round the camera, slanted by the wind
    const rg = new THREE.BufferGeometry(), rp = new Float32Array(nRain * 6); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    X.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: LC('#aebfcc'), transparent: true, opacity: 0, depthWrite: false })); X.rain.frustumCulled = false; X.scene.add(X.rain);
    X.rainP = Array.from({ length: nRain }, () => [rnd(-22, 22), rnd(-2, 18), rnd(-22, 22), rnd(.7, 1.3)]);
    // spray and splashes: soft points with their own velocity and life
    const sg = new THREE.BufferGeometry(), sp = new Float32Array(nSpray * 3), sa = new Float32Array(nSpray); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('alpha', new THREE.BufferAttribute(sa, 1));
    const dot = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    X.sprayM = new THREE.ShaderMaterial({ uniforms: { uMap: { value: dot }, uCol: { value: new THREE.Color(1, 1, 1) }, uScale: { value: innerHeight * .5 } }, transparent: true, depthWrite: false,
      vertexShader: 'attribute float alpha; varying float vA; uniform float uScale; void main() { vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(uScale * (0.16 + alpha * 0.12) / -mv.z, 1.0, 34.0); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D uMap; uniform vec3 uCol; varying float vA; void main() { vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(uCol, t.a * vA * 0.75); }' });
    X.spray = new THREE.Points(sg, X.sprayM); X.spray.frustumCulled = false; X.scene.add(X.spray);
    X.sprayP = Array.from({ length: nSpray }, () => ({ x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, big: 1 })); X.sprayN = 0;
    // the waterspout: a twisting, tapering column of streaked spray
    const fm = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uForm: { value: 0 }, uDay: { value: 1 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; uniform float uTime; void main() { vUv = uv; vec3 p = position; p.x += sin(uv.y * 5.0 + uTime) * uv.y * 6.0; p.z += cos(uv.y * 4.0 + uTime * 0.7) * uv.y * 4.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'varying vec2 vUv; uniform float uTime; uniform float uForm; uniform float uDay; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9, 78.2))) * 43758.5); } void main() { float s = h(vec2(floor(vUv.x * 40.0 + vUv.y * 8.0 - uTime * 3.0), 1.0)); float a = (0.25 + 0.5 * s) * smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y)) * smoothstep(1.0 - uForm, 1.0 - uForm + 0.15, 1.0 - vUv.y); gl_FragColor = vec4(vec3(0.62, 0.66, 0.7) * (0.15 + 0.85 * uDay), a * 0.75 * uForm); }' });
    const fg = new THREE.CylinderGeometry(14, 2.2, 140, 24, 20, true); fg.translate(0, 70, 0);
    X.funnel = new THREE.Mesh(fg, fm); X.funnel.visible = false; X.scene.add(X.funnel);
  }
  // throw spray: n drops from a point, with a spread and an upward kick
  function sprayAt(x, y, z, n, up = 3, spread = 2, big = 1, wind = 1) {
    const wx = Math.cos(S.windAng) * S.wind * .35 * wind, wz = Math.sin(S.windAng) * S.wind * .35 * wind;
    for (let i = 0; i < n; i++) { const p = X.sprayP[X.sprayN++ % X.sprayP.length]; Object.assign(p, { x: x + rnd(-.3, .3) * spread, y, z: z + rnd(-.3, .3) * spread, vx: rnd(-1, 1) * spread + wx, vy: rnd(.4, 1) * up, vz: rnd(-1, 1) * spread + wz, life: 0, max: rnd(.7, 1.6), big }); }
  }
  function fxTick(dt, cam) {
    const R = X.rainP, rp = X.rain.geometry.attributes.position.array, wx = Math.cos(S.windAng) * S.wind * .05, wz = Math.sin(S.windAng) * S.wind * .05;
    X.rain.material.opacity = cl(S.rain * .55, 0, .55) * (X.underOn ? 0 : 1); X.rain.visible = S.rain > .02;
    if (X.rain.visible) for (let i = 0; i < R.length; i++) {
      const p = R[i]; p[1] -= dt * 14 * p[3]; p[0] += wx * dt * 14; p[2] += wz * dt * 14;
      if (p[1] < -3 || Math.abs(p[0]) > 22 || Math.abs(p[2]) > 22) { p[0] = rnd(-22, 22); p[1] = rnd(8, 18); p[2] = rnd(-22, 22); }
      const x = cam.x + p[0], y = cam.y + p[1], z = cam.z + p[2], L = .45 * p[3];
      rp.set([x, y, z, x - wx * L, y + L, z - wz * L], i * 6);
    }
    X.rain.geometry.attributes.position.needsUpdate = true;
    // wind lifts spray off the crests round the raft in a storm
    if (S.wind > 10 && !X.low) { const n = Math.floor((S.wind - 10) * dt * 6 + R_()); for (let i = 0; i < n; i++) { const a = rnd(0, TAU), r = rnd(3, 25), x = RAFT.x + Math.cos(a) * r, z = RAFT.z + Math.sin(a) * r; sprayAt(x, waterH(x, z) + .1, z, 3, 1.2, 1, 1.2, 1.4); } }
    const sp = X.spray.geometry.attributes.position.array, sa = X.spray.geometry.attributes.alpha.array;
    X.sprayP.forEach((p, i) => { if (p.life < p.max) { p.life += dt; p.vy -= 9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; } sp[i * 3] = p.x; sp[i * 3 + 1] = p.life < p.max ? p.y : -999; sp[i * 3 + 2] = p.z; sa[i] = p.life < p.max ? (1 - p.life / p.max) * p.big : 0; });
    X.spray.geometry.attributes.position.needsUpdate = X.spray.geometry.attributes.alpha.needsUpdate = true;
    X.sprayM.uniforms.uCol.value.setRGB(.85, .9, .95).multiplyScalar(.2 + .8 * Math.max(X.common.uDay.value, S.flash));
    // the waterspout
    const s0 = S.spouts[0]; X.funnel.visible = !!s0 && s0.form > .3;
    if (s0) { X.funnel.position.set(s0.x, waterH(s0.x, s0.z) - 1, s0.z); X.funnel.scale.setScalar(.6 + s0.form * .4); X.funnel.rotation.y += dt * 1.6; X.funnel.material.uniforms.uTime.value = S.t; X.funnel.material.uniforms.uForm.value = cl((s0.form - .3) / .7, 0, 1); X.funnel.material.uniforms.uDay.value = Math.max(X.common.uDay.value, S.flash);
      if (R_() < dt * 30 * s0.form) { const a = rnd(0, TAU), r = 4 + (1 - s0.form) * 6; sprayAt(s0.x + Math.cos(a) * r, waterH(s0.x, s0.z), s0.z + Math.sin(a) * r, 6, 5, 3, 3, 0); } }
  }
  const R_ = Math.random;   // effects never touch the simulation's random stream
