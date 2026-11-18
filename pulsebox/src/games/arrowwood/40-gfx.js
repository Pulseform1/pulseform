  /* ---------- 40 gfx: the renderer, light, sky and every texture (all painted here at load time: no image files) ---------- */
  let X = null, gfxReady = false, gfxFailed = false;
  const LAZY = [];   // modules that need THREE objects at top level register an init here (THREE loads after this script runs)
  const LC = c => new THREE.Color(c).convertSRGBToLinear();
  const loadScript = u => new Promise((res, rej) => { const s = document.createElement('script'); s.src = u; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  // a seeded random for art, so the wood looks the same on every machine
  const art = W.rng(9001), ar = (a, b) => a + art() * (b - a);
  function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function tex(c, o = {}) {
    const t = new THREE.CanvasTexture(c); t.encoding = o.linear ? THREE.LinearEncoding : THREE.sRGBEncoding;
    t.wrapS = t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; t.anisotropy = X ? Math.min(8, X.renderer.capabilities.getMaxAnisotropy()) : 4;
    if (o.rep) t.repeat.set(o.rep[0], o.rep[1]); return t;
  }
  // a normal map from a grey height picture
  function normalFrom(c, k = 2) {
    const g = c.getContext('2d'), w = c.width, h = c.height, src = g.getImageData(0, 0, w, h).data, [o, og] = cvs(w, h), im = og.createImageData(w, h), d = im.data;
    const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (H(x - 1, y) - H(x + 1, y)) * k, dy = (H(x, y - 1) - H(x, y + 1)) * k, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
      d[i] = (dx / l * .5 + .5) * 255; d[i + 1] = (dy / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
    }
    og.putImageData(im, 0, 0); return tex(o, { linear: true });
  }
  const noiseAt = (x, y, s) => { let v = 0, a = .5, f = s; for (let o = 0; o < 4; o++) { v += a * vn2(x * f, y * f); a *= .5; f *= 2; } return v; };
  const vn2 = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), h = (a, b) => { let n = (a * 374761393 + b * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }; const A = h(i, j), B = h(i + 1, j), C = h(i, j + 1), D = h(i + 1, j + 1); return A + (B - A) * u + (C - A) * v + (A - B - C + D) * u * v; };
  // tiling noise image (wraps at the edges) painted pixel by pixel
  function paint(w, h, fn) { const [c, g] = cvs(w, h), im = g.createImageData(w, h), d = im.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, gg, b, a = 255] = fn(x, y); const i = (y * w + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = a; } g.putImageData(im, 0, 0); return c; }
  const tile = (x, y, w, h, s) => { const fx = x / w, fy = y / h; return lp(lp(noiseAt(x, y, s), noiseAt(x - w, y, s), fx), lp(noiseAt(x, y - h, s), noiseAt(x - w, y - h, s), fx), fy); };

  const TEX = {};
  function makeTextures(q) {
    const S = q === 'low' ? .5 : 1;
    // bark: deep vertical fissures, plates, a little lichen
    {
      const w = 256 * S | 0, h = 512 * S | 0, hc = paint(w, h, (x, y) => { const f = Math.abs(Math.sin((x / w) * TAU * 6 + tile(x, y, w, h, .02) * 9 + Math.sin(y / h * TAU * 2) * .6)); const v = Math.pow(f, .35) * .75 + tile(x, y, w, h, .09) * .3; return [v * 255, v * 255, v * 255]; });
      const g = hc.getContext('2d'), hd = g.getImageData(0, 0, w, h).data;
      const col = paint(w, h, (x, y) => { const v = hd[(y * w + x) * 4] / 255, n = tile(x, y, w, h, .05), li = tile(x + 77, y, w, h, .03) > .62 ? .25 : 0; return [(48 + v * 52 + n * 18) * (1 - li * .3) + li * 60, (40 + v * 42 + n * 14) + li * 70, (33 + v * 30 + n * 8) + li * 30]; });
      TEX.bark = tex(col); TEX.barkN = normalFrom(hc, 3.2);
    }
    // oak leaves: clusters of lobed leaves on twigs, cut out
    {
      const [c, g] = cvs(256 * S, 256 * S); g.scale(S, S);
      const leaf = (x, y, a, s, col) => { g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s); g.fillStyle = col; g.beginPath(); g.moveTo(0, 0);
        for (let k = 0; k <= 8; k++) { const t = k / 8, yy = -t * 34, ww = Math.sin(t * Math.PI) * 13 * (1 + .28 * Math.sin(t * Math.PI * 7)); g.lineTo(ww, yy); }
        for (let k = 8; k >= 0; k--) { const t = k / 8, yy = -t * 34, ww = Math.sin(t * Math.PI) * 13 * (1 + .28 * Math.sin(t * Math.PI * 7 + .5)); g.lineTo(-ww, yy); }
        g.fill(); g.strokeStyle = 'rgba(30,40,10,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -32); g.stroke(); g.restore(); };
      g.strokeStyle = '#3a2c1c'; g.lineWidth = 3; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(128, 250); g.quadraticCurveTo(ar(60, 190), ar(140, 200), ar(30, 226), ar(20, 120)); g.stroke(); }
      for (let k = 0; k < 70; k++) { const a = ar(0, TAU), r = Math.sqrt(art()) * 100; const shade = ar(.7, 1.15), hue = art(); const col = `rgb(${(hue < .15 ? 120 : 62) * shade | 0},${(hue < .15 ? 128 : 104) * shade | 0},${(hue < .15 ? 46 : 38) * shade | 0})`; leaf(128 + Math.cos(a) * r, 120 + Math.sin(a) * r * .9, a + ar(-1, 1), ar(.8, 1.35), col); }
      TEX.leaves = tex(c, { clamp: true });
    }
    // fern frond
    {
      const [c, g] = cvs(128 * S, 256 * S); g.scale(S, S); g.strokeStyle = '#4b6a2a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(64, 256); g.quadraticCurveTo(70, 120, 64, 4); g.stroke();
      for (let k = 0; k < 26; k++) { const t = k / 26, y = 250 - t * 240, w = (1 - t) * 52 + 6; for (const s of [-1, 1]) { g.fillStyle = `rgb(${70 + art() * 25 | 0},${108 + art() * 30 | 0},${38 + art() * 14 | 0})`; g.beginPath(); g.moveTo(64, y); g.quadraticCurveTo(64 + s * w * .6, y - 10, 64 + s * w, y - 4 - t * 6); g.quadraticCurveTo(64 + s * w * .5, y + 2, 64, y + 3); g.fill(); } }
      TEX.fern = tex(c, { clamp: true });
    }
    // grass clump
    {
      const [c, g] = cvs(128 * S, 128 * S); g.scale(S, S);
      for (let k = 0; k < 46; k++) { const x = ar(10, 118), lean = ar(-18, 18), hgt = ar(50, 124); g.strokeStyle = `rgb(${88 + art() * 40 | 0},${118 + art() * 40 | 0},${48 + art() * 20 | 0})`; g.lineWidth = ar(1.5, 3); g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + lean * .3, 128 - hgt * .6, x + lean, 128 - hgt); g.stroke(); }
      TEX.grass = tex(c, { clamp: true });
    }
    // forest floor detail: leaf litter, twigs, soil (tiles)
    {
      const w = 512 * S | 0, [c, g] = cvs(w, w), base = paint(w, w, (x, y) => { const n = tile(x, y, w, w, .03), m = tile(x + 40, y + 9, w, w, .12); const v = .55 + n * .35 + m * .15; return [v * 255, v * 248, v * 236]; });
      g.drawImage(base, 0, 0);
      for (let k = 0; k < 900 * S; k++) { const x = ar(0, w), y = ar(0, w), s = ar(2, 7) * S, a = ar(0, TAU); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = `rgba(${pick([120, 140, 96, 160])},${pick([90, 100, 80, 110])},${pick([50, 60, 40])},${ar(.25, .6)})`; g.beginPath(); g.ellipse(0, 0, s, s * .5, 0, 0, TAU); g.fill(); g.restore(); }
      g.strokeStyle = 'rgba(60,40,25,.45)'; for (let k = 0; k < 60 * S; k++) { g.lineWidth = ar(.8, 2); g.beginPath(); const x = ar(0, w), y = ar(0, w); g.moveTo(x, y); g.lineTo(x + ar(-20, 20), y + ar(-20, 20)); g.stroke(); }
      TEX.floor = tex(c);
    }
    // dressed stone: courses of blocks with mortar, weathering and moss
    {
      const w = 512 * S | 0, h = 512 * S | 0, [hc, hg] = cvs(w, h), [cc, cg] = cvs(w, h);
      hg.fillStyle = '#222'; hg.fillRect(0, 0, w, h); cg.fillStyle = '#4f4b44'; cg.fillRect(0, 0, w, h);
      const rows = 8; for (let r = 0; r < rows; r++) { const y0 = r * h / rows; let x = -art() * 60 * S; while (x < w) { const bw = ar(50, 110) * S, inset = 3 * S, tone = ar(.75, 1.15);
        const grd = hg.createLinearGradient(0, y0, 0, y0 + h / rows); grd.addColorStop(0, '#999'); grd.addColorStop(.5, '#bbb'); grd.addColorStop(1, '#888'); hg.fillStyle = grd; hg.fillRect(x + inset, y0 + inset, bw - inset * 2, h / rows - inset * 2);
        cg.fillStyle = `rgb(${118 * tone | 0},${112 * tone | 0},${100 * tone | 0})`; cg.fillRect(x + inset, y0 + inset, bw - inset * 2, h / rows - inset * 2);
        for (let k = 0; k < 18; k++) { cg.fillStyle = `rgba(${art() < .5 ? '40,38,34' : '170,165,150'},${ar(.05, .16)})`; cg.beginPath(); cg.arc(x + ar(0, bw), y0 + ar(0, h / rows), ar(2, 9) * S, 0, TAU); cg.fill(); }
        if (art() < .35) { cg.fillStyle = `rgba(70,96,40,${ar(.25, .6)})`; cg.beginPath(); cg.ellipse(x + ar(0, bw), y0 + inset + 2, ar(10, 30) * S, ar(4, 10) * S, 0, 0, TAU); cg.fill(); }
        x += bw; } }
      const n = paint(w, h, (x, y) => { const v = tile(x, y, w, h, .05); return [v * 255, v * 255, v * 255]; }); cg.globalAlpha = .25; cg.globalCompositeOperation = 'multiply'; cg.drawImage(n, 0, 0); cg.globalCompositeOperation = 'source-over'; cg.globalAlpha = 1;
      TEX.stone = tex(cc); TEX.stoneN = normalFrom(hc, 4);
    }
    // rough rock with lichen
    { const w = 256 * S | 0, hc = paint(w, w, (x, y) => { const v = tile(x, y, w, w, .04) * .7 + tile(x, y, w, w, .16) * .3; return [v * 255, v * 255, v * 255]; });
      const hd = hc.getContext('2d').getImageData(0, 0, w, w).data;
      TEX.rock = tex(paint(w, w, (x, y) => { const v = hd[(y * w + x) * 4] / 255, li = tile(x + 31, y + 7, w, w, .06); return li > .6 ? [96 + v * 30, 112 + v * 30, 70 + v * 20] : [78 + v * 70, 76 + v * 66, 70 + v * 58]; })); TEX.rockN = normalFrom(hc, 3); }
    // weathered planks
    { const w = 256 * S | 0, c = paint(w, w, (x, y) => { const plank = Math.floor(x / (w / 4)), grain = Math.sin(y * .25 + tile(x, y, w, w, .05) * 14 + plank * 5) * .5 + .5, edge = (x % (w / 4)) < 2 * S ? .4 : 1; const v = (.55 + grain * .25 + plank * .03) * edge; return [120 * v, 92 * v, 64 * v]; }); TEX.planks = tex(c); }
    // cloth weave and leather
    { const w = 128, c = paint(w, w, (x, y) => { const v = .82 + ((x + y) % 4 < 2 ? .08 : -.04) + tile(x, y, w, w, .1) * .14; return [v * 255, v * 255, v * 255]; }); TEX.cloth = tex(c); TEX.clothN = normalFrom(c, 1.2); }
    { const w = 128, c = paint(w, w, (x, y) => { const v = .7 + tile(x, y, w, w, .2) * .3 - (tile(x + 9, y, w, w, .5) > .72 ? .12 : 0); return [v * 255, v * 255, v * 255]; }); TEX.leather = tex(c); }
    // the bow skins: dark carved wood, ruler stock, bank notes, coins
    { const w = 64, h = 512, c = paint(w, h, (x, y) => { const g2 = Math.sin(y * .07 + tile(x, y, w, h, .05) * 10) * .5 + .5, v = .35 + g2 * .2; return [92 * v * 1.4, 58 * v * 1.4, 38 * v * 1.4]; }); TEX.bowWood = tex(c); }
    { const [c, g] = cvs(1024, 64); g.fillStyle = '#e8c35a'; g.fillRect(0, 0, 1024, 64); const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(90,60,10,.25)'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 64);
      g.fillStyle = '#1a1206'; g.font = 'bold 15px Arial'; for (let k = 0; k <= 100; k++) { const x = 6 + k * 10.1, L = k % 10 === 0 ? 26 : k % 5 === 0 ? 18 : 10; g.fillRect(x, 0, 1.6, L); g.fillRect(x, 64 - L, 1.6, L); if (k % 10 === 0 && k) g.fillText(String(k / 10), x - 4, 44); }
      TEX.ruler = tex(c); }
    { const [c, g] = cvs(256, 128); g.fillStyle = '#9fbf8a'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#3f6a3a'; g.lineWidth = 6; g.strokeRect(6, 6, 244, 116); g.lineWidth = 1.5; g.strokeRect(14, 14, 228, 100);
      for (let k = 0; k < 40; k++) { g.strokeStyle = 'rgba(60,100,60,.25)'; g.beginPath(); g.arc(128, 64, 10 + k * 1.6, 0, TAU); g.stroke(); }
      g.fillStyle = '#d9e8c8'; g.beginPath(); g.ellipse(128, 64, 30, 38, 0, 0, TAU); g.fill(); g.fillStyle = '#3f6a3a'; g.beginPath(); g.moveTo(128, 40); g.quadraticCurveTo(150, 64, 128, 92); g.quadraticCurveTo(106, 64, 128, 40); g.fill();
      g.font = 'bold 30px Georgia'; g.fillText('100', 26, 50); g.fillText('100', 182, 110); g.font = 'bold 11px Georgia'; g.fillText('ARROWWOOD TREASURY', 70, 24); TEX.bill = tex(c); }
    { const [c, g] = cvs(128, 128); const gr = g.createRadialGradient(54, 50, 6, 64, 64, 64); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(.6, '#e2b23a'); gr.addColorStop(1, '#9a6a12'); g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 62, 0, TAU); g.fill(); g.strokeStyle = '#8a5a0a'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 52, 0, TAU); g.stroke(); g.fillStyle = '#8a5a0a'; g.font = 'bold 54px Georgia'; g.fillText('$', 48, 84); TEX.coin = tex(c); }
    // particle sprites
    const sprite = (fn, s = 64) => { const [c, g] = cvs(s, s); fn(g, s); return tex(c, { clamp: true }); };
    TEX.dot = sprite((g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
    TEX.heart = sprite((g, s) => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(32, 54); g.bezierCurveTo(-6, 28, 12, 2, 32, 18); g.bezierCurveTo(52, 2, 70, 28, 32, 54); g.fill(); });
    TEX.petal = sprite((g, s) => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(32, 32, 26, 14, .6, 0, TAU); g.fill(); });
    TEX.leafP = sprite((g, s) => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(32, 4); g.quadraticCurveTo(58, 30, 32, 60); g.quadraticCurveTo(6, 30, 32, 4); g.fill(); });
    TEX.chip = sprite((g, s) => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(10, 20); g.lineTo(54, 8); g.lineTo(46, 40); g.lineTo(14, 52); g.fill(); });
  }

  // a soft sky: deep blue up high, warm haze at the horizon, a bright patch around the sun
  function makeSky(scene) {
    const geo = new THREE.SphereGeometry(900, 24, 16), mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { sun: { value: X.sunDir.clone() }, top: { value: LC('#4f7fb6') }, mid: { value: LC('#a9c3cf') }, hor: { value: LC('#d9d2b4') } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position.z = gl_Position.w; }',
      fragmentShader: 'uniform vec3 sun, top, mid, hor; varying vec3 vD; void main(){ float h = vD.y; vec3 c = mix(hor, mid, smoothstep(-.02,.18,h)); c = mix(c, top, smoothstep(.15,.7,h)); float s = max(0., dot(vD, normalize(sun))); c += vec3(1.,.86,.6) * (pow(s, 600.)*6. + pow(s, 12.)*.25); gl_FragColor = vec4(c,1.); }' });
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = -10; scene.add(m); return m;
  }

  function initGfx() {
    loadCfg(); LAZY.forEach(f => f());
    const q = quality(), low = q === 'low';
    const glc = document.createElement('canvas'); glc.id = 'gl'; glc.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;background:#0b120c';
    const cv2 = document.getElementById('cv'); cv2.parentNode.insertBefore(glc, cv2);
    const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: !low, powerPreference: 'high-performance' });
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.autoClear = false;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(CFG.fov, innerWidth / innerHeight, .05, 1200); camera.rotation.order = 'YXZ';
    scene.fog = new THREE.FogExp2(LC('#93a594'), .0165); scene.add(camera);
    const sunDir = new THREE.Vector3(-.55, .62, .45).normalize();
    X = { renderer, scene, camera, q, low, sunDir, t: 0, shake: 0, wind: { time: { value: 0 }, amt: { value: 1 } }, dyn: 1, frameMs: 16 };
    const hemi = new THREE.HemisphereLight(LC('#c7d8e6'), LC('#3b3a24'), .62), sun = new THREE.DirectionalLight(LC('#ffe2b6'), 2.3);
    sun.position.copy(sunDir).multiplyScalar(80); scene.add(hemi, sun, sun.target);
    const fill = new THREE.DirectionalLight(LC('#9fb4c8'), .25); fill.position.set(.6, .3, -.6); scene.add(fill);
    X.hemi = hemi; X.sun = sun;
    makeTextures(q);
    makeSky(scene);
    // the first-person bow and hands draw on top, in their own little scene
    X.vmScene = new THREE.Scene(); X.vmCam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, .01, 5);
    X.vmScene.add(new THREE.HemisphereLight(LC('#d6e2ea'), LC('#4a3f2a'), .75)); X.vmSun = new THREE.DirectionalLight(LC('#ffe2b6'), 1.6); X.vmScene.add(X.vmSun);
    applyQuality(true);
    addEventListener('resize', onResize); onResize();
  }
  function applyQuality(first) {
    const q = quality(); X.q = q; X.low = q === 'low';
    const pr = Math.min(window.devicePixelRatio || 1, q === 'low' ? 1 : q === 'high' ? 2 : 1.5) * X.dyn;
    X.renderer.setPixelRatio(pr);
    const sh = q !== 'low'; X.renderer.shadowMap.enabled = sh; X.sun.castShadow = sh;
    if (sh) { const s = q === 'high' ? 2048 : 1024; X.sun.shadow.mapSize.set(s, s); const c = X.sun.shadow.camera; c.left = c.bottom = -38; c.right = c.top = 38; c.near = 1; c.far = 200; X.sun.shadow.bias = -.0004; X.sun.shadow.normalBias = .04; if (X.sun.shadow.map) { X.sun.shadow.map.dispose(); X.sun.shadow.map = null; } }
    if (!first) { X.scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); }
    onResize();
  }
  function onResize() { if (!X) return; X.renderer.setSize(innerWidth, innerHeight, false); X.camera.aspect = innerWidth / innerHeight; X.camera.updateProjectionMatrix(); X.vmCam.aspect = X.camera.aspect; X.vmCam.updateProjectionMatrix(); }
  // shared material helper: standard materials with the wind uniform added where asked
  function std(o, env) { return new THREE.MeshStandardMaterial(o); }
  function windify(mat, k = 1, mode = 'leaf') {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = X.wind.time; sh.uniforms.uWind = X.wind.amt;
      sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3]);
        #else
          vec3 ip = vec3(0.);
        #endif
        float ph = uTime * ${mode === 'grass' ? '2.3' : '1.4'} + ip.x * .23 + ip.z * .19;
        float hgt = ${mode === 'grass' ? 'max(0., position.y)' : 'position.y + 1.5'};
        float sway = (sin(ph) + .45 * sin(ph * 2.7 + 1.3)) * uWind * ${(.035 * k).toFixed(3)} * hgt;
        transformed.x += sway; transformed.z += cos(ph * 1.2) * uWind * ${(.025 * k).toFixed(3)} * hgt;`);
    };
    mat.customProgramCacheKey = () => 'wind' + mode + k;
    return mat;
  }
