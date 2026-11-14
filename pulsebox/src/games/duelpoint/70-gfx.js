  /* ---------- 70 gfx: Three.js, loaded when the page opens; textures, sky and light; picture quality ----------
     X holds everything the drawing parts share: renderer, scene, camera, the first-person scene (drawn on top of the world
     so a gun never pokes into a wall), the reflection map, and pools of effects. 'low' is the phone tier: no shadows, a
     capped pixel ratio that also drops by itself if frames get slow. */
  let X = null, ready = false, failed = false;
  const isTouch = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const BASE_FOV = 70.5;   // vertical, which is 103 degrees across on a 16:9 screen
  const SUN = [-.46, .7, -.55];   // towards the sun: over the sea, north-west, mid afternoon
  const loadScript = u => new Promise((res, rej) => { const s = document.createElement('script'); s.src = u; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  function canvasTex(w, h, fn, rep = [1, 1]) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = X ? X.aniso : 4; t.encoding = THREE.sRGBEncoding; return t;
  }
  // a flat colour with fine grain: the base of most textures
  const grain = (g, w, h, base, amt, n = 4000) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { g.fillStyle = Math.random() < .5 ? `rgba(0,0,0,${amt * Math.random()})` : `rgba(255,255,255,${amt * .6 * Math.random()})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } };

  function initGfx() {
    loadSave();
    const low = CFG.quality === 'low' || (CFG.quality !== 'high' && isTouch());
    const glc = document.createElement('canvas'); glc.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;background:#0c1016';
    const cv2 = document.getElementById('cv'); cv2.parentNode.insertBefore(glc, cv2);
    const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: !low, powerPreference: 'high-performance' });
    const pr = Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2); renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false);
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .92;
    if (!low) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    const scene = new THREE.Scene(), haze = new THREE.Color('#cfe3ee'); scene.background = haze; scene.fog = new THREE.Fog(haze, 90, 420);
    const camera = new THREE.PerspectiveCamera(BASE_FOV, innerWidth / innerHeight, .05, 900); camera.rotation.order = 'YXZ'; scene.add(camera);
    scene.add(new THREE.HemisphereLight('#dfeeff', '#8a7a66', low ? .72 : .5));
    const sun = new THREE.DirectionalLight('#fff0d8', low ? 1.15 : 1.3); sun.position.set(MW / 2 + SUN[0] * 90, SUN[1] * 90, MH / 2 + SUN[2] * 90); sun.target.position.set(MW / 2, 0, MH / 2); scene.add(sun, sun.target);
    if (!low) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -46; sc.right = 46; sc.top = 40; sc.bottom = -40; sc.near = 20; sc.far = 190; sun.shadow.bias = -.0006; sun.shadow.normalBias = .04; sc.updateProjectionMatrix(); }
    X = { renderer, scene, camera, glc, low, pr, basePr: pr, aniso: Math.min(8, renderer.capabilities.getMaxAnisotropy()), t: 0, slow: 0, agents: new Map(), camY: EYE, flashT: 0, shake: 0 };
    // a small reflection map for metal: sky above, warm ground below, three bright panels
    { const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
      es.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e4f0ff'); gr.addColorStop(.46, '#a9c3dd'); gr.addColorStop(.52, '#8c7c68'); gr.addColorStop(1, '#2a241e'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) })));
      for (const [x, y, z, sz] of [[6, 10, 4, 7], [-9, 6, -5, 5], [2, 3, 12, 4]]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide })); pl.position.set(x, y, z); pl.lookAt(0, 0, 0); es.add(pl); }
      X.env = pm.fromScene(es, .02).texture; pm.dispose(); }
    // the first-person scene: your gun and hands, lit like the world
    X.vscene = new THREE.Scene(); X.vroot = new THREE.Group(); X.vscene.add(X.vroot); X.vscene.add(new THREE.HemisphereLight('#e2f0ff', '#8a7a66', .6));
    { const vs = new THREE.DirectionalLight('#fff0d8', 1.5); vs.position.set(SUN[0] * 50, SUN[1] * 50, SUN[2] * 50); X.vscene.add(vs); const rim = new THREE.DirectionalLight('#9fd8ff', .8); rim.position.set(-1, .6, -1.5); X.vroot.add(rim, rim.target); }
    X.vmuzzle = new THREE.PointLight('#ffcf8a', 0, 2); X.vmuzzle.position.set(.1, -.05, -.8); X.vroot.add(X.vmuzzle);
    X.view = new THREE.Group(); X.vroot.add(X.view); X.viewGun = null; X.viewKey = '';
    addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
    buildSky(); buildWorld(); buildFx();
  }
  function buildSky() {
    // the dome: deep blue overhead, pale haze at the horizon, a glow round the sun, a few long clouds
    const th = Math.acos(SUN[1]) / Math.PI, ph = ((Math.atan2(SUN[2], -SUN[0]) / TAU) + 1) % 1;
    const tex = canvasTex(1024, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h * .5); gr.addColorStop(0, '#3f7fc4'); gr.addColorStop(.55, '#86b8e0'); gr.addColorStop(1, '#cfe3ee'); g.fillStyle = gr; g.fillRect(0, 0, w, h * .5); g.fillStyle = '#cfe3ee'; g.fillRect(0, h * .5, w, h * .5);
      for (const dx of [-w, 0, w]) { const sg = g.createRadialGradient(ph * w + dx, th * h, 4, ph * w + dx, th * h, 190); sg.addColorStop(0, 'rgba(255,252,235,1)'); sg.addColorStop(.06, 'rgba(255,244,205,.95)'); sg.addColorStop(.3, 'rgba(255,230,180,.35)'); sg.addColorStop(1, 'rgba(255,230,180,0)'); g.fillStyle = sg; g.fillRect(0, 0, w, h * .5); }
      for (let i = 0; i < 26; i++) { const x = Math.random() * w, y = h * (.3 + Math.random() * .16), rw = 60 + Math.random() * 150; g.fillStyle = `rgba(255,255,255,${.1 + Math.random() * .2})`; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + (Math.random() - .5) * rw, y + (Math.random() - .5) * 8, rw * (.3 + Math.random() * .5), 5 + Math.random() * 9, 0, 0, 7); g.fill(); } }
    });
    tex.wrapT = THREE.ClampToEdgeWrapping;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 20), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false })); dome.renderOrder = -10; X.scene.add(dome); X.dome = dome;
  }
  // keep the frame rate on slow phones: if frames run long for a while, draw fewer pixels (never fewer than the screen's own)
  function tunePixels(dt) {
    if (dt > .034) X.slow += dt; else X.slow = Math.max(0, X.slow - dt * .5);
    if (X.slow > 1.5 && X.pr > .8) { X.pr = Math.max(.75, X.pr - .25); X.renderer.setPixelRatio(X.pr); X.renderer.setSize(innerWidth, innerHeight, false); X.slow = 0; }
  }
  (async () => { try { if (typeof document === 'undefined') return; await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'); initGfx(); ready = true; } catch (e) { console.error(e); failed = true; } })();
