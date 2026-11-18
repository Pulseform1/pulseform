  /* ---------- 70 gfx: Three.js, the sky and the ocean ----------
     The ocean is one mesh: a disc of rings that are dense under you and widen towards the horizon, moved with the camera
     (snapped to its own spacing so nothing swims). Its vertex shader runs the shared wave model; short waves fade out
     only where the rings are too sparse to draw them (far away), so near the raft the picture is exactly the physics.
     The fragment shader does the look: sky reflection weighted by viewing angle, light through the crests, sun and moon
     glitter on fine ripples, whitecaps, the raft's wake, whirlpool spirals, rain rings, and a haze into the sky. */
  let X = null, ready = false, failed = false;
  const isTouch = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const LC = hex => new THREE.Color(hex).convertSRGBToLinear();
  const loadScript = u => new Promise((res, rej) => { const s = document.createElement('script'); s.src = u; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  function canvasTex(w, h, fn, rep = [1, 1], srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = X ? X.aniso : 4; if (srgb) t.encoding = THREE.sRGBEncoding; return t;
  }
  const quality = () => CFG.quality === 'auto' ? (isTouch() ? 'low' : 'medium') : CFG.quality;

  // shared GLSL: noise, and the sky's colour in any direction (the sky dome and the ocean's reflections both use it)
  const COMMON_GLSL = `
uniform vec3 uSunDir; uniform vec3 uMoonDir; uniform vec3 uSunCol; uniform float uDay; uniform float uTwi; uniform float uCloud; uniform float uFlash; uniform float uTime; uniform float uRain; uniform float uSea;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
vec3 skyCol(vec3 d) {
  float y = max(d.y, 0.0);
  vec3 zen = mix(vec3(0.004, 0.008, 0.02), vec3(0.07, 0.2, 0.52), uDay);
  vec3 hor = mix(vec3(0.016, 0.026, 0.055), vec3(0.5, 0.66, 0.82), uDay);
  vec2 sh = normalize(uSunDir.xz + 1e-4); float toward = max(0.0, dot(normalize(d.xz + 1e-4), sh));
  hor = mix(hor, vec3(0.95, 0.42, 0.16), uTwi * (1.0 - uCloud * 0.7) * pow(toward, 3.0));
  zen = mix(zen, vec3(0.12, 0.1, 0.25), uTwi * 0.5);
  vec3 c = mix(hor, zen, pow(y, 0.42));
  float g = dot(c, vec3(0.3, 0.5, 0.2)); c = mix(c, vec3(g * 0.62, g * 0.66, g * 0.72), uCloud * 0.88);
  float sd = max(dot(d, uSunDir), 0.0); c += uSunCol * (pow(sd, 6.0) * 0.18 + pow(sd, 60.0) * 0.5) * (1.0 - uCloud * 0.85) * step(-0.08, uSunDir.y);
  float md = max(dot(d, uMoonDir), 0.0); c += vec3(0.5, 0.58, 0.75) * pow(md, 30.0) * 0.06 * (1.0 - uDay) * (1.0 - uCloud * 0.7);
  c += uFlash * vec3(0.42, 0.47, 0.66) * (0.25 + uCloud * 0.55);
  return c;
}`;

  function initGfx() {
    loadCfg();
    const q = quality(), low = q === 'low';
    const glc = document.createElement('canvas'); glc.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;background:#04101a';
    const cv2 = document.getElementById('cv'); cv2.parentNode.insertBefore(glc, cv2);
    const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: !low, powerPreference: 'high-performance' });
    const pr = Math.min(window.devicePixelRatio || 1, low ? 1.25 : q === 'high' ? 2 : 1.6); renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false);
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = q === 'high'; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.autoClear = false;
    const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(LC('#9fb6c8'), .002);
    const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .08, 6000); camera.rotation.order = 'YXZ'; scene.add(camera);
    const hemi = new THREE.HemisphereLight('#cfe3ff', '#20384a', .5), sun = new THREE.DirectionalLight('#fff1d8', 1.6), moon = new THREE.DirectionalLight('#9fb4e6', 0), bolt = new THREE.DirectionalLight('#cfd8ff', 0);
    scene.add(hemi, sun, sun.target, moon, moon.target, bolt, bolt.target);
    if (q === 'high') { sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = sc.bottom = -9; sc.right = sc.top = 9; sc.near = 1; sc.far = 60; sun.shadow.bias = -.0008; sun.shadow.normalBias = .03; }
    const torch = new THREE.PointLight('#ffad5a', 0, 11, 1.6), firePt = new THREE.PointLight('#ff9a40', 0, 9, 1.6); scene.add(torch, firePt);
    X = { renderer, scene, camera, glc, q, low, pr, aniso: Math.min(8, renderer.capabilities.getMaxAnisotropy()), hemi, sun, moon, bolt, torch, firePt, t: 0 };
    // a small reflection map for wet wood and skin
    { const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
      es.add(new THREE.Mesh(new THREE.SphereGeometry(20, 24, 12), new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: canvasTex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fbbd6'); gr.addColorStop(.48, '#d9e6ee'); gr.addColorStop(.52, '#1c3240'); gr.addColorStop(1, '#0a1820'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) })));
      X.env = pm.fromScene(es, .03).texture; pm.dispose(); }
    // the first-person scene: hands and the tool in them, drawn over the world
    X.vscene = new THREE.Scene(); X.vcam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .02, 10); X.vroot = new THREE.Group(); X.vscene.add(X.vroot);
    X.vhemi = new THREE.HemisphereLight('#cfe3ff', '#20384a', .6); X.vsun = new THREE.DirectionalLight('#fff1d8', 1.2); X.vsun.position.set(.5, 1, .3); X.vtorch = new THREE.PointLight('#ffad5a', 0, 3, 1.5); X.vtorch.position.set(.25, -.05, -.45);
    X.vscene.add(X.vhemi, X.vsun, X.vtorch);
    addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = X.vcam.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); X.vcam.updateProjectionMatrix(); });
    X.common = { uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, .95, .85) }, uDay: { value: 1 }, uTwi: { value: 0 }, uCloud: { value: 0 }, uFlash: { value: 0 }, uTime: { value: 0 }, uRain: { value: 0 }, uSea: { value: 0 } };
    X.sea = seaUniforms();
    buildSky(); buildOcean(); buildUnder(); buildModels(); buildFx(); buildView();
  }
  function buildSky() {
    const u = Object.assign({}, X.common, { uStars: { value: 1 } });
    const m = new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main() { vD = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }',
      fragmentShader: COMMON_GLSL + `
varying vec3 vD;
void main() {
  vec3 d = normalize(vD); vec3 c = skyCol(d);
  // the sun's disc, the moon's, the stars
  float sd = dot(d, uSunDir); c += uSunCol * smoothstep(0.9993, 0.9997, sd) * 18.0 * (1.0 - uCloud * 0.97) * step(0.0, d.y + 0.02);
  float md = dot(d, uMoonDir); c += vec3(0.85, 0.9, 1.0) * smoothstep(0.9995, 0.99975, md) * 2.4 * (1.0 - uDay) * (1.0 - uCloud * 0.92);
  vec2 sp = d.xz / max(0.05, d.y + 0.15) * 160.0; float st = step(0.9965, hash(floor(sp))) * smoothstep(0.0, 0.25, d.y);
  c += vec3(0.8, 0.85, 1.0) * st * (1.0 - uDay) * (1.0 - uCloud) * (0.4 + 0.6 * noise(sp * 0.1 + uTime));
  // clouds: a layer seen from below, drifting; thicker and darker in a storm, lit from beneath by lightning
  if (d.y > 0.0) {
    vec2 cp = d.xz / (d.y + 0.08) * 1.6 + vec2(uTime * 0.006, uTime * 0.002);
    float cov = mix(0.62, 0.18, uCloud), n = fbm(cp), cl = smoothstep(cov, cov + 0.35, n) * smoothstep(0.0, 0.18, d.y);
    vec3 lit = mix(vec3(0.02, 0.025, 0.04), vec3(0.95, 0.96, 1.0), uDay) * (1.0 - uCloud * 0.62);
    lit = mix(lit, vec3(1.0, 0.55, 0.3), uTwi * 0.6 * (1.0 - uCloud));
    vec3 cc = mix(lit, lit * 0.45, smoothstep(0.4, 1.0, n)) + uFlash * vec3(0.7, 0.75, 1.0) * (0.6 + n);
    c = mix(c, cc, cl * 0.92);
  }
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}` });
    X.sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), m); X.sky.renderOrder = -10; X.scene.add(X.sky);
  }
  function oceanGeometry() {
    const q = X.q, seg = q === 'low' ? 110 : q === 'high' ? 256 : 176, grow = q === 'low' ? 1.058 : q === 'high' ? 1.028 : 1.04;
    const pos = [], idx = [], rings = []; let r = 0, step = q === 'high' ? .22 : .32;
    rings.push(0); while (r < 3200) { r += step; step *= grow; rings.push(r); }
    pos.push(0, 0, 0);
    for (let n = 1; n < rings.length; n++) for (let s = 0; s < seg; s++) { const a = s / seg * TAU; pos.push(Math.cos(a) * rings[n], 0, Math.sin(a) * rings[n]); }
    for (let s = 0; s < seg; s++) idx.push(0, 1 + (s + 1) % seg, 1 + s);
    for (let n = 1; n < rings.length - 1; n++) for (let s = 0; s < seg; s++) {
      const a = 1 + (n - 1) * seg + s, b = 1 + (n - 1) * seg + (s + 1) % seg, c = a + seg, d = b + seg; idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5); return g;
  }
  // which raft cells exist, as a 32 x 32 map centred on cell (0, 0): the ocean's vertex shader keeps the water out of them
  function raftMask() { if (!X.mask) { X.maskData = new Uint8Array(32 * 32 * 4); X.mask = new THREE.DataTexture(X.maskData, 32, 32, THREE.RGBAFormat); X.mask.magFilter = X.mask.minFilter = THREE.NearestFilter; X.maskVer = -1; } return X.mask; }
  function updateRaftMask() {
    raftMask(); if (X.maskVer === RAFT.ver && X.maskCells === RAFT.cells.size) return; X.maskVer = RAFT.ver; X.maskCells = RAFT.cells.size;
    X.maskData.fill(0); for (const c of RAFT.cells.values()) { const i = c.i + 16, j = c.j + 16; if (i >= 0 && j >= 0 && i < 32 && j < 32) X.maskData[(j * 32 + i) * 4] = 255; }
    X.mask.needsUpdate = true;
  }
  function buildOcean() {
    const u = Object.assign({}, X.common, X.sea, { uCam: { value: new THREE.Vector3() }, uRaft: { value: new THREE.Vector4() }, uRaftV: { value: new THREE.Vector2() }, uUnder: { value: 0 }, uMask: { value: raftMask() }, uRaftT: { value: new THREE.Vector4(0, 0, 1, 0) }, uRaftP: { value: new THREE.Vector3() }, uFog: { value: .0011 }, uMoonVis: { value: 0 } });
    const q = X.q;
    const m = new THREE.ShaderMaterial({ uniforms: u, side: THREE.DoubleSide, fog: false, defines: { QUAL: q === 'low' ? 0 : q === 'high' ? 2 : 1 },
      vertexShader: SEA_GLSL.replace(/vec3 gerst\(vec2 p, out vec3 n, out float crest\) \{/, 'vec3 gerstF(vec2 p, out vec3 n, out float crest, float sp) {').replace('float th = w.z * dot(w.xy, p) + q.x, s = sin(th), c = cos(th);', 'float th = w.z * dot(w.xy, p) + q.x, s = sin(th), c = cos(th); float fd = clamp(6.2831 / w.z / (sp * 5.0) - 0.4, 0.0, 1.0); s *= fd; c *= fd;')
        .replace(/float waterH\(vec2 x\) \{[\s\S]*\}$/, '') + `
uniform vec3 uCam; uniform sampler2D uMask; uniform vec4 uRaftT; uniform vec3 uRaftP;
varying vec3 vW; varying vec3 vN; varying float vCrest; varying float vH; varying float vSp;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float r = length(wp.xz - uCam.xz), sp = max(0.25, r * 0.034);
  vec3 n; float crest; vec3 d = gerstF(wp.xz, n, crest, sp);
  float e0 = extras(wp.xz), e1 = extras(wp.xz + vec2(0.7, 0.0)), e2 = extras(wp.xz + vec2(0.0, 0.7));
  n = normalize(n + vec3(-(e1 - e0) / 0.7, 0.0, -(e2 - e0) / 0.7));
  wp.xyz += d; wp.y += e0;
  // the raft keeps the sea out: inside any of its cells the surface stays below the logs' waterline, so no wave shows through the deck
  { vec2 q = wp.xz - uRaftT.xy; float lx = uRaftT.z * q.x - uRaftT.w * q.y, lz = uRaftT.w * q.x + uRaftT.z * q.y;
    vec2 ij = floor(vec2(lx, lz) / 1.5 + 0.5) + 16.0;
    if (ij.x >= 0.0 && ij.y >= 0.0 && ij.x < 32.0 && ij.y < 32.0 && texture2D(uMask, (ij + 0.5) / 32.0).r > 0.5) { float top = uRaftP.x + uRaftP.y * lx + uRaftP.z * lz + 0.04; if (wp.y > top) { d.y -= wp.y - top; wp.y = top; } } }
  vW = wp.xyz; vN = n; vCrest = crest; vH = d.y + e0; vSp = sp;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`,
      fragmentShader: COMMON_GLSL + `
uniform vec4 uGi[2]; uniform vec4 uPo[4]; uniform vec4 uRi[4]; uniform vec4 uSp;
uniform vec4 uRaft; uniform vec2 uRaftV; uniform float uUnder; uniform float uFog; uniform float uMoonVis;
varying vec3 vW; varying vec3 vN; varying float vCrest; varying float vH; varying float vSp;
// fine ripples: a few drifting noise layers turned into a normal
vec2 ripple(vec2 p, float t) {
  vec2 g = vec2(0.0); float a = 1.0, f = 0.55;
  for (int i = 0; i < (QUAL == 0 ? 2 : QUAL == 1 ? 3 : 4); i++) {
    vec2 q = p * f + vec2(t * 0.35 * f + float(i) * 7.1, t * 0.23 * f);
    float h0 = noise(q), hx = noise(q + vec2(0.07, 0.0)), hz = noise(q + vec2(0.0, 0.07));
    g += vec2(hx - h0, hz - h0) / 0.07 * a * 0.11; a *= 0.6; f *= 2.1;
  }
  return g;
}
// rain: rings spreading in a grid of cells, each with its own moment
vec2 rainRings(vec2 p, float t) {
  vec2 g = vec2(0.0);
  for (int k = 0; k < 2; k++) {
    vec2 q = p * (k == 0 ? 2.2 : 3.1) + float(k) * 13.7; vec2 id = floor(q), f = fract(q) - 0.5;
    float ph = fract(t * 1.6 + hash(id) * 7.0), r = length(f - (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.5);
    float w = sin((r - ph * 0.45) * 60.0) * smoothstep(0.08, 0.0, abs(r - ph * 0.45)) * (1.0 - ph);
    g += normalize(f + 1e-4) * w * 0.35;
  }
  return g;
}
void main() {
  vec3 toC = cameraPosition - vW; float dist = length(toC); vec3 V = toC / dist;
  bool below = !gl_FrontFacing;
  float fade = exp(-dist * 0.013);
  vec2 rg = ripple(vW.xz, uTime) * (0.6 + uSea * 0.8) * fade;
  #if QUAL > 0
  if (uRain > 0.05) rg += rainRings(vW.xz, uTime) * uRain * exp(-dist * 0.06);
  #endif
  vec3 N = normalize(vN + vec3(rg.x, 0.0, rg.y));
  if (below) N = -N;
  float cosT = max(dot(N, V), 0.0), fres = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 refl = skyCol(R);
  // the water's own colour: deep blue-black, lifted where light shines through a crest
  float light = max(uDay, 0.09 + uFlash * 0.35);
  vec3 deep = mix(vec3(0.002, 0.03, 0.085), vec3(0.006, 0.02, 0.032), uSea) * light;
  float thin = clamp(vH * 0.35 + 0.35, 0.0, 1.0) * pow(max(0.0, dot(V, -normalize(vec3(uSunDir.x, -0.25, uSunDir.z)))), 2.0);
  vec3 sss = vec3(0.0, 0.42, 0.42) * thin * uDay * (1.0 - uCloud * 0.6) * (0.6 + 0.4 * clamp(vCrest * 3.0, 0.0, 1.0));
  vec3 water = deep + sss + vec3(0.0, 0.04, 0.05) * clamp(vH * 0.3, 0.0, 1.0) * light;
  refl = mix(refl, refl * vec3(0.55, 0.75, 0.9), 0.35);   // the sea tints what it reflects
  vec3 col = mix(water, refl * 0.82, fres * (1.0 - uCloud * 0.25));
  // glitter: the sun and the moon on the ripples
  float sunVis = (1.0 - uCloud * 0.92) * step(0.0, uSunDir.y);
  float sd = max(dot(R, uSunDir), 0.0); col += uSunCol * (pow(sd, 1400.0) * 70.0 + pow(sd, 160.0) * 0.9 + pow(sd, 18.0) * 0.025) * sunVis * fade;
  float md = max(dot(R, uMoonDir), 0.0); col += vec3(0.6, 0.7, 0.9) * (pow(md, 500.0) * 5.0 + pow(md, 40.0) * 0.12) * uMoonVis;
  // foam: whitecaps on steep crests (more in a storm), the raft's wake, the big events
  float fn = noise(vW.xz * 0.9 + uTime * 0.3) * 0.6 + noise(vW.xz * 3.1 - uTime * 0.5) * 0.4;
  float foam = smoothstep(0.62 - uSea * 0.14, 0.95, vCrest * 1.7 + (fn - 0.5) * 0.6) * smoothstep(0.1, 0.6, uSea);
  vec2 rp = vW.xz - uRaft.xy; float rd = length(rp) - uRaft.z;
  float sp = length(uRaftV) + 0.12; vec2 back = -uRaftV / sp; float along = dot(rp, back), side = abs(dot(rp, vec2(-back.y, back.x)));
  float wake = smoothstep(0.55, 0.0, rd) * smoothstep(-0.4, 0.0, rd) * 0.35 + smoothstep(uRaft.z * 0.9 + along * 0.12, uRaft.z * 0.4, side) * step(0.0, rd) * step(0.0, along) * exp(-along * 0.18) * clamp(sp * 1.2, 0.15, 0.8) * 0.45;
  foam += wake * smoothstep(0.45, 0.8, fn + 0.2);
  for (int n = 0; n < 2; n++) { vec4 g = uGi[n]; if (g.w == 0.0) continue; float d = dot(g.xy, vW.xz) - g.z; foam += smoothstep(-14.0, 0.0, d) * smoothstep(5.0, 0.0, d) * clamp(g.w / 5.0, 0.0, 1.0) * smoothstep(0.3, 0.7, fn); }
  for (int n = 0; n < 4; n++) { vec4 w = uPo[n]; if (w.w == 0.0) continue; vec2 q = vW.xz - w.xy; float r = length(q) / w.z, a = atan(q.y, q.x);
    float arm = sin(a * 3.0 + log(r + 0.05) * 7.0 + uTime * 2.2 * w.w) * 0.5 + 0.5; foam += smoothstep(0.55, 0.95, arm * (0.7 + fn * 0.6)) * smoothstep(1.6, 0.4, r) * smoothstep(0.02, 0.12, r) * w.w; col *= 1.0 - 0.45 * w.w * exp(-r * r * 6.0); }
  for (int n = 0; n < 4; n++) { vec4 w = uRi[n]; if (w.w == 0.0) continue; float d = length(vW.xz - w.xy) - w.z; foam += exp(-d * d / 18.0) * clamp(w.w * 1.6, 0.0, 1.0) * smoothstep(0.3, 0.7, fn); }
  if (uSp.z > 0.0) { float r = length(vW.xz - uSp.xy); foam += smoothstep(9.0, 3.0, abs(r - 6.0 - (1.0 - uSp.z) * 6.0)) * uSp.z * smoothstep(0.25, 0.7, fn); }
  foam = clamp(foam, 0.0, 1.0);
  vec3 foamCol = vec3(0.86, 0.9, 0.92) * (max(uDay, 0.0) * (1.0 - uCloud * 0.55) + 0.05 + uFlash * 0.32);
  col = mix(col, foamCol, foam * (1.0 - fres * 0.35));
  col += uFlash * vec3(0.35, 0.4, 0.55) * (fres * 0.45 + 0.02);
  // underneath, looking up: a bright window overhead, dark green-blue beyond it
  if (below) { float win = smoothstep(0.62, 0.8, dot(-V, vec3(0.0, 1.0, 0.0))); col = mix(vec3(0.0, 0.05, 0.065) * light, skyCol(vec3(0.0, 1.0, 0.0)) * 0.8, win) + foam * 0.15 * light; }
  // haze into the horizon, the same colour as the sky there
  vec3 hz = skyCol(normalize(vec3(-V.x, 0.015, -V.z)));
  col = mix(hz, col, exp(-dist * uFog));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}` });
    if (X.ocean) { X.scene.remove(X.ocean); X.ocean.geometry.dispose(); X.ocean.material.dispose(); }
    X.ocean = new THREE.Mesh(oceanGeometry(), m); X.ocean.frustumCulled = false; X.scene.add(X.ocean);
  }
  // the waterline across the lens: for each pixel, is the near plane there under the sea?
  function buildUnder() {
    const u = Object.assign({}, X.sea, { uInv: { value: new THREE.Matrix4() }, uCamP: { value: new THREE.Vector3() }, uDay: { value: 1 }, uOn: { value: 0 } });
    const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main() { vUv = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: SEA_GLSL + `
uniform mat4 uInv; uniform vec3 uCamP; uniform float uDay;
varying vec2 vUv;
void main() {
  vec4 p = uInv * vec4(vUv, -1.0, 1.0); p /= p.w;
  vec3 q = uCamP + normalize(p.xyz - uCamP) * 0.11;
  float h = waterH(q.xz), d = q.y - h;
  if (d > 0.012) discard;
  float line = smoothstep(0.012, 0.0, abs(d)) * smoothstep(-0.03, -0.0, d);
  vec3 tint = vec3(0.0, 0.11, 0.14) * (0.15 + 0.85 * uDay);
  gl_FragColor = vec4(mix(tint, vec3(0.02, 0.06, 0.07), line), mix(0.62, 0.9, line));
}` });
    X.under = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); X.under.frustumCulled = false; X.uscene = new THREE.Scene(); X.uscene.add(X.under); X.ucam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
