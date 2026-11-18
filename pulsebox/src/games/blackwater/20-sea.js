  /* ---------- 20 sea: one wave model for the picture and the physics ----------
     Eight Gerstner waves of different directions and lengths (long swells down to short chop), sized by the sea state
     (0 calm .. 1 storm), plus things laid on top: giant swells (a single long crest that travels across the sea),
     whirlpools (a bowl with a spiral current), the rings Cthulhu sends out, and waterspouts. Every frame seaFrame()
     fills WV/WP and the event arrays; waterH() reads them in JavaScript and SEA_GLSL reads the same numbers as uniforms,
     so the raft, the debris, the bobber and the drawn ocean all agree. Positions are kept near the origin: when the raft
     drifts far, the world is shifted back and the shift is folded into the wave phases (no seams, no precision loss). */
  const NW = 8;
  // [heading of travel (radians from +x), wavelength (m), height calm, height storm, steepness]
  const WAVE_DEF = [
    [.30, 74, .34, 1.85, .42], [.66, 47, .22, 1.2, .5], [-.12, 31, .14, .8, .55], [.98, 19, .08, .47, .6],
    [-.48, 11.5, .045, .26, .62], [1.36, 7.3, .028, .16, .62], [.12, 4.6, .016, .1, .6], [-.86, 3.1, .01, .065, .58],
  ];
  const WV = new Float32Array(NW * 4), WP = new Float32Array(NW * 4);   // per wave: dirx, dirz, k, A | phase, steep*A
  const GI = new Float32Array(8), PO = new Float32Array(16), RI = new Float32Array(16), SP = new Float32Array(4);
  const S = {
    t: 0, ox: 0, oz: 0, sea: .14, seaTo: .14, wind: 4, windTo: 4, windAng: .45, rain: 0, rainTo: 0, cloud: .25, cloudTo: .25,
    phase: 'calm', pt: 300, severe: false, flash: 0, bolts: [], nextBolt: 9, giants: [], pools: [], rings: [], spouts: [],
    tod: 7.2, day: 1, nights: 0, nextPool: 420, nextGiant: 40, spoutDone: false, forceFlash: 0,
  };
  const DAY_LEN = 840;   // seconds for a full day
  const isNight = () => S.tod > 19.4 || S.tod < 5.4;
  const darkness = () => { const t = S.tod; return t > 19.4 ? cl((t - 19.4) / 1.2, 0, 1) : t < 5.4 ? cl((5.4 - t) / 1, 0, 1) : 0; };

  // fill the wave arrays for this moment (the only place sizes, phases and event uniforms are worked out)
  function seaFrame() {
    for (let i = 0; i < NW; i++) {
      const d = WAVE_DEF[i], k = TAU / d[1], w = Math.sqrt(G * k), dx = Math.cos(d[0]), dz = Math.sin(d[0]);
      const A = lp(d[2], d[3], S.sea) * (1 + .15 * Math.sin(S.t * .05 + i));   // sets of bigger swells come and go
      WV[i * 4] = dx; WV[i * 4 + 1] = dz; WV[i * 4 + 2] = k; WV[i * 4 + 3] = A;
      WP[i * 4] = ((k * (dx * S.ox + dz * S.oz) - w * S.t) % TAU + TAU) % TAU; WP[i * 4 + 1] = d[4] * A;
    }
    GI.fill(0); S.giants.slice(0, 2).forEach((g, n) => { GI[n * 4] = g.dx; GI[n * 4 + 1] = g.dz; GI[n * 4 + 2] = g.s; GI[n * 4 + 3] = g.A; });
    PO.fill(0); S.pools.slice(0, 4).forEach((p, n) => { PO[n * 4] = p.x; PO[n * 4 + 1] = p.z; PO[n * 4 + 2] = p.R; PO[n * 4 + 3] = p.str; });
    RI.fill(0); S.rings.slice(0, 4).forEach((r, n) => { RI[n * 4] = r.x; RI[n * 4 + 1] = r.z; RI[n * 4 + 2] = r.age * 11; RI[n * 4 + 3] = r.A * cl(1 - r.age / 40, 0, 1); });
    SP.fill(0); const s0 = S.spouts[0]; if (s0) { SP[0] = s0.x; SP[1] = s0.z; SP[2] = s0.form; SP[3] = s0.life; }
  }
  // the Gerstner sum at a point of the undisturbed surface: out = [dx, dy, dz]
  const _d = [0, 0, 0];
  function gerst(x, z) {
    let ox = 0, oy = 0, oz = 0;
    for (let i = 0; i < NW; i++) {
      const j = i * 4, th = WV[j + 2] * (WV[j] * x + WV[j + 1] * z) + WP[j], c = Math.cos(th), qa = WP[j + 1];
      ox += qa * WV[j] * c; oz += qa * WV[j + 1] * c; oy += WV[j + 3] * Math.sin(th);
    }
    _d[0] = ox; _d[1] = oy; _d[2] = oz; return _d;
  }
  // what sits on top of the waves (heights only)
  function extras(x, z) {
    let h = 0;
    for (let n = 0; n < 2; n++) { const A = GI[n * 4 + 3]; if (!A) continue; const d = GI[n * 4] * x + GI[n * 4 + 1] * z - GI[n * 4 + 2], q = d > 0 ? d / 20 : d / 62; h += A * Math.exp(-q * q) - A * .22 * Math.exp(-(((d - 40) / 24) ** 2)); }
    for (let n = 0; n < 4; n++) { const st = PO[n * 4 + 3]; if (!st) continue; const R0 = PO[n * 4 + 2], r = Math.hypot(x - PO[n * 4], z - PO[n * 4 + 1]) / R0; h -= st * 2.4 * Math.exp(-r * r * 4.5) + st * .5 * Math.exp(-r * r); }
    for (let n = 0; n < 4; n++) { const A = RI[n * 4 + 3]; if (!A) continue; const r = Math.hypot(x - RI[n * 4], z - RI[n * 4 + 1]), d = r - RI[n * 4 + 2]; h += A * Math.exp(-((d / 7) ** 2)) * Math.cos(d * .45); }
    if (SP[2]) { const r = Math.hypot(x - SP[0], z - SP[1]); h += .6 * SP[2] * Math.exp(-((r / 5) ** 2)); }
    return h;
  }
  // the height of the sea at a world point: find the undisturbed point the waves carried here, then read its height
  function waterH(x, z) {
    let gx = x, gz = z;
    for (let it = 0; it < 3; it++) { const d = gerst(gx, gz); gx = x - d[0]; gz = z - d[2]; }
    return gerst(gx, gz)[1] + extras(gx, gz);
  }
  // how the water moves you: a wind drift, and the pull of whirlpools and waterspouts
  function currentAt(x, z, out = [0, 0]) {
    const base = .1 + .028 * S.wind; out[0] = Math.cos(S.windAng) * base; out[1] = Math.sin(S.windAng) * base;
    for (const p of S.pools) {
      const dx = x - p.x, dz = z - p.z, r = Math.hypot(dx, dz) || .01, f = p.str * cl(1.6 - r / (p.R * 1.5), 0, 1) * Math.min(2, p.R / (r + 4));
      out[0] += (-dz / r * 2.2 - dx / r * 1.25) * f; out[1] += (dx / r * 2.2 - dz / r * 1.25) * f;
    }
    for (const s of S.spouts) {
      if (s.form < .5) continue; const dx = x - s.x, dz = z - s.z, r = Math.hypot(dx, dz) || .01, f = s.form * cl(1 - r / 34, 0, 1) * 3.2;
      out[0] += (-dz / r * 1.4 - dx / r * .6) * f; out[1] += (dx / r * 1.4 - dz / r * .6) * f;
    }
    return out;
  }
  // the wave field as GLSL: the same arithmetic, fed from the same arrays
  const SEA_GLSL = `
uniform vec4 uW[${NW}]; uniform vec4 uP[${NW}]; uniform vec4 uGi[2]; uniform vec4 uPo[4]; uniform vec4 uRi[4]; uniform vec4 uSp;
float sq(float v) { return v * v; }
vec3 gerst(vec2 p, out vec3 n, out float crest) {
  vec3 o = vec3(0.0); vec3 b = vec3(1.0, 0.0, 0.0), t = vec3(0.0, 0.0, 1.0); crest = 0.0;
  for (int i = 0; i < ${NW}; i++) {
    vec4 w = uW[i]; vec4 q = uP[i]; float th = w.z * dot(w.xy, p) + q.x, s = sin(th), c = cos(th);
    o.x += q.y * w.x * c; o.z += q.y * w.y * c; o.y += w.w * s;
    float wa = w.z * w.w, qk = q.y * w.z;
    b += vec3(-qk * w.x * w.x * s, wa * w.x * c, -qk * w.x * w.y * s);
    t += vec3(-qk * w.x * w.y * s, wa * w.y * c, -qk * w.y * w.y * s);
    crest += max(0.0, s) * qk;
  }
  n = normalize(cross(t, b)); return o;
}
float extras(vec2 p) {
  float h = 0.0;
  for (int n = 0; n < 2; n++) { vec4 g = uGi[n]; if (g.w == 0.0) continue; float d = dot(g.xy, p) - g.z, q = d > 0.0 ? d / 20.0 : d / 62.0; h += g.w * exp(-q * q) - g.w * 0.22 * exp(-sq((d - 40.0) / 24.0)); }
  for (int n = 0; n < 4; n++) { vec4 w = uPo[n]; if (w.w == 0.0) continue; float r = length(p - w.xy) / w.z; h -= w.w * 2.4 * exp(-r * r * 4.5) + w.w * 0.5 * exp(-r * r); }
  for (int n = 0; n < 4; n++) { vec4 w = uRi[n]; if (w.w == 0.0) continue; float d = length(p - w.xy) - w.z; h += w.w * exp(-sq(d / 7.0)) * cos(d * 0.45); }
  if (uSp.z > 0.0) { float r = length(p - uSp.xy); h += 0.6 * uSp.z * exp(-sq(r / 5.0)); }
  return h;
}
float waterH(vec2 x) {
  vec2 g = x; vec3 n; float c;
  for (int it = 0; it < 3; it++) { vec3 d = gerst(g, n, c); g = x - d.xz; }
  vec3 d = gerst(g, n, c); return d.y + extras(g);
}`;
  // push the arrays into a material's uniforms
  const seaUniforms = () => ({ uW: { value: [] }, uP: { value: [] }, uGi: { value: [] }, uPo: { value: [] }, uRi: { value: [] }, uSp: { value: null } });
  function syncSea(u) {
    const v4 = (arr, i, old) => { const o = old || new THREE.Vector4(); o.set(arr[i], arr[i + 1], arr[i + 2], arr[i + 3]); return o; };
    for (let i = 0; i < NW; i++) { u.uW.value[i] = v4(WV, i * 4, u.uW.value[i]); u.uP.value[i] = v4(WP, i * 4, u.uP.value[i]); }
    for (let i = 0; i < 2; i++) u.uGi.value[i] = v4(GI, i * 4, u.uGi.value[i]);
    for (let i = 0; i < 4; i++) { u.uPo.value[i] = v4(PO, i * 4, u.uPo.value[i]); u.uRi.value[i] = v4(RI, i * 4, u.uRi.value[i]); }
    u.uSp.value = v4(SP, 0, u.uSp.value);
  }

  /* ---------- weather: calm, clouds building, the storm, easing off; lightning and its thunder; day and night ---------- */
  function weatherTick(dt, raft) {
    S.t += dt;
    const prev = S.tod; S.tod = (S.tod + dt * 24 / DAY_LEN) % 24; if (S.tod < prev) S.day++;
    if (prev < 19.4 && S.tod >= 19.4) { S.nights++; emit('dusk', S.nights); }
    S.pt -= dt;
    if (S.pt <= 0) {
      if (S.phase === 'calm') { S.phase = 'build'; S.pt = rnd(70, 100); S.severe = S.day > 1 && chance(.55); }
      else if (S.phase === 'build') { S.phase = 'storm'; S.pt = rnd(150, 230); S.spoutDone = false; say(S.severe ? 'A bad storm is on you' : 'Rain', '#9fd0ff'); }
      else if (S.phase === 'storm') { S.phase = 'ease'; S.pt = rnd(70, 110); }
      else { S.phase = 'calm'; S.pt = rnd(260, 420); }
    }
    const P = S.phase, sev = S.severe ? 1 : .62;
    S.cloudTo = P === 'calm' ? .22 : P === 'build' ? .55 + .3 * sev : P === 'storm' ? .95 : .5;
    S.rainTo = P === 'storm' ? .55 + .45 * sev : 0;
    S.windTo = P === 'calm' ? 4 : P === 'build' ? 9 : P === 'storm' ? 11 + 9 * sev : 7;
    S.seaTo = P === 'calm' ? .14 : P === 'build' ? .32 : P === 'storm' ? .55 + .42 * sev : .3;
    S.cloud = ease(S.cloud, S.cloudTo, .05, dt); S.rain = ease(S.rain, S.rainTo, S.rainTo > S.rain ? .12 : .08, dt);
    S.wind = ease(S.wind, S.windTo, .05, dt); S.sea = ease(S.sea, S.seaTo, .022, dt);   // the sea builds and settles slowly
    S.windAng += Math.sin(S.t * .003) * dt * .002;
    // lightning: a flash now, its thunder when the sound gets here
    S.flash = Math.max(0, S.flash - dt * 3.2);
    if ((P === 'storm' && S.rain > .3) || S.forceFlash > 0) {
      S.nextBolt -= dt;
      if (S.nextBolt <= 0) { const dist = S.forceFlash > 0 ? rnd(600, 1500) : rnd(700, 7000); S.nextBolt = S.forceFlash > 0 ? rnd(3, 6) : rnd(5, 17); S.flash = cl(1.25 - dist / 8000, .35, 1); S.bolts.push({ at: S.t + dist / 343, dist }); emit('flash', dist); }
    }
    S.forceFlash = Math.max(0, S.forceFlash - dt);
    S.bolts = S.bolts.filter(b => { if (S.t >= b.at) { emit('thunder', b.dist); return false; } return true; });
    // giant swells in a bad storm: they start far out upwind, so you can see them coming
    if (P === 'storm' && S.severe && S.sea > .75) { S.nextGiant -= dt; if (S.nextGiant <= 0) { S.nextGiant = rnd(55, 95); spawnGiant(raft, rnd(4.5, 7)); } }
    for (const g of S.giants) g.s += g.c * dt;
    S.giants = S.giants.filter(g => g.s - (g.dx * raft.x + g.dz * raft.z) < 320);
    // a waterspout, sometimes, in a bad storm: a ring of spray first, then the funnel, travelling
    if (P === 'storm' && S.severe && !S.spoutDone && S.pt < 150) { S.spoutDone = true; if (chance(.4)) spawnSpout(raft); }
    for (const s of S.spouts) { s.age += dt; s.x += s.vx * dt; s.z += s.vz * dt; s.form = s.age < 9 ? s.age / 9 * .45 : s.age < 13 ? lp(.45, 1, (s.age - 9) / 4) : s.age > s.life - 8 ? cl((s.life - s.age) / 8, 0, 1) : 1; }
    S.spouts = S.spouts.filter(s => s.age < s.life);
    // whirlpools now and then, ahead of the raft in its drift
    S.nextPool -= dt; if (S.nextPool <= 0 && !S.pools.length) { S.nextPool = rnd(480, 760); spawnPool(raft, 1); }
    for (const p of S.pools) { p.age += dt; p.str = p.peak * cl(p.age / 12, 0, 1) * cl((p.life - p.age) / (p.fade || 25), 0, 1); }
    S.pools = S.pools.filter(p => p.age < p.life);
    for (const r of S.rings) r.age += dt; S.rings = S.rings.filter(r => r.age < 40);
  }
  function spawnGiant(raft, A, dir) {
    const a = dir == null ? S.windAng + rnd(-.25, .25) : dir, dx = Math.cos(a), dz = Math.sin(a);
    S.giants.push({ dx, dz, s: dx * raft.x + dz * raft.z - 900, A, c: 12 }); emit('giant');
  }
  function spawnSpout(raft) {
    const a = S.windAng + Math.PI + rnd(-.6, .6), d = rnd(140, 200), x = raft.x + Math.cos(a) * d, z = raft.z + Math.sin(a) * d;
    const to = Math.atan2(raft.z + rnd(-30, 30) - z, raft.x + rnd(-30, 30) - x), sp = rnd(3, 4.5);
    S.spouts.push({ x, z, vx: Math.cos(to) * sp, vz: Math.sin(to) * sp, age: 0, life: 85, form: 0 }); emit('spout');
  }
  function spawnPool(raft, peak, at, R0 = 26, life = 130) {
    const p = at || (() => { const a = S.windAng + rnd(-.25, .25), d = rnd(55, 70); return [raft.x + Math.cos(a) * d, raft.z + Math.sin(a) * d]; })();
    S.pools.push({ x: p[0], z: p[1], R: R0, peak, str: 0, age: 0, life }); emit('pool'); return S.pools[S.pools.length - 1];
  }
