  /* ---------- 70 gfx: Three.js, loaded when the page opens; textures, sky and light; picture quality ----------
     X holds everything the drawing parts share: renderer, scene, camera, the first-person scene (drawn on top of the world
     so a gun never pokes into a wall), the reflection map, and pools of effects. 'low' is the phone tier: no shadows, a
     capped pixel ratio that also drops by itself if frames get slow. */
  let X = null, ready = false, failed = false;
  let touchK = null; const isTouch = () => touchK != null ? touchK : (touchK = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);   // asked many times a frame: kept until the window changes
  // A screen that can be touched is not always being touched: a touchscreen laptop or Chromebook played with a mouse or
  // trackpad should get the mouse layout. So once the player actually uses one, that decides it: moving a mouse or
  // clicking one switches to the mouse layout, touching the screen switches back to the touch one.
  let touchBy = false;
  if (typeof addEventListener !== 'undefined') {
    addEventListener('resize', () => { if (!touchBy) touchK = null; });
    addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && (e.movementX || e.movementY)) { touchK = false; touchBy = true; } }, { passive: true, capture: true });
    addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') { touchK = false; touchBy = true; } else if (e.pointerType === 'touch' || e.pointerType === 'pen') { touchK = true; touchBy = true; } }, { passive: true, capture: true });
    addEventListener('touchstart', () => { touchK = true; touchBy = true; }, { passive: true, capture: true });
  }
  // a low-powered computer (a Chromebook, four cores or fewer, or 4 GB of memory or less) plays in FAST, like a phone
  const lowEnd = () => { try { const n = navigator; return /CrOS/.test(n.userAgent || '') || (n.hardwareConcurrency || 8) <= 4 || (n.deviceMemory || 8) <= 4; } catch (e) { return false; } };
  const BASE_FOV = 70.5;   // vertical, which is 103 degrees across on a 16:9 screen
  // the field of view setting (CFG.fov) is how wide the view is across a 16:9 screen, 90 to 115 degrees; the camera wants it upright
  const fovH = () => CFG.fov ? cl(+CFG.fov, 90, 115) : 103;
  const baseFov = () => CFG.fov ? 2 * Math.atan(Math.tan(fovH() * D2R / 2) * 9 / 16) / D2R : BASE_FOV;
  const SUN = [-.46, .7, -.55];   // towards the sun: over the sea, north-west, mid afternoon
  // a colour as you picked it: Three.js reads plain colours as linear light, which turns strong colours pale
  const LC = hex => new THREE.Color(hex).convertSRGBToLinear();
  const loadScript = u => new Promise((res, rej) => { const s = document.createElement('script'); s.src = u; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  function canvasTex(w, h, fn, rep = [1, 1]) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = X ? X.aniso : 4; t.encoding = THREE.sRGBEncoding; if (X && X.texLog) X.texLog.push(t); return t;
  }
  // a flat colour with fine grain: the base of most textures
  const grain = (g, w, h, base, amt, n = 4000) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { g.fillStyle = Math.random() < .5 ? `rgba(0,0,0,${amt * Math.random()})` : `rgba(255,255,255,${amt * .6 * Math.random()})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } };

  function initGfx() {
    loadSave();
    const low = CFG.quality === 'low' || (CFG.quality !== 'high' && (isTouch() || lowEnd()));
    if (low && !isTouch()) { GAME.maxDpr = 1.25; dispatchEvent(new Event('resize')); }   // the HUD's own canvas too: fewer pixels to clear and draw each frame
    const glc = document.createElement('canvas'); glc.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;background:#0c1016';
    const cv2 = document.getElementById('cv'); cv2.parentNode.insertBefore(glc, cv2);
    const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: !low, powerPreference: 'high-performance' });
    const pr = Math.min(window.devicePixelRatio || 1, low ? (isTouch() ? 1.5 : 1) : 2); renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false);
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .92;
    if (!low) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    const scene = new THREE.Scene(), haze = new THREE.Color('#cfe3ee'); scene.background = haze; scene.fog = new THREE.Fog(haze, 90, 420);
    const camera = new THREE.PerspectiveCamera(baseFov(), innerWidth / innerHeight, .05, 900); camera.rotation.order = 'YXZ'; scene.add(camera);
    const hemi = new THREE.HemisphereLight('#dfeeff', '#8a7a66', low ? .72 : .5); scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff0d8', low ? 1.15 : 1.3); sun.position.set(MW / 2 + SUN[0] * 90, SUN[1] * 90, MH / 2 + SUN[2] * 90); sun.target.position.set(MW / 2, 0, MH / 2); scene.add(sun, sun.target);
    if (!low) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -46; sc.right = 46; sc.top = 40; sc.bottom = -40; sc.near = 20; sc.far = 190; sun.shadow.bias = -.0006; sun.shadow.normalBias = .04; sc.updateProjectionMatrix(); }
    X = { hemi, sun, renderer, scene, camera, glc, low, pr, basePr: pr, aniso: Math.min(8, renderer.capabilities.getMaxAnisotropy()), t: 0, slow: 0, agents: new Map(), camY: EYE, flashT: 0, shake: 0 };
    // a small reflection map for metal: sky above, warm ground below, three bright panels
    { const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
      es.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e4f0ff'); gr.addColorStop(.46, '#a9c3dd'); gr.addColorStop(.52, '#7e7f83'); gr.addColorStop(1, '#2b2c30'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) })));
      for (const [x, y, z, sz] of [[6, 10, 4, 7], [-9, 6, -5, 5], [2, 3, 12, 4]]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide })); pl.position.set(x, y, z); pl.lookAt(0, 0, 0); es.add(pl); }
      X.env = pm.fromScene(es, .02).texture; pm.dispose(); }
    // the first-person scene: your gun and hands, lit like the world
    X.vscene = new THREE.Scene(); X.vroot = new THREE.Group(); X.vscene.add(X.vroot); X.vscene.add(new THREE.HemisphereLight('#e2f0ff', '#8a7a66', .5));
    { const vs = new THREE.DirectionalLight('#fff0d8', 1.25); vs.position.set(SUN[0] * 50, SUN[1] * 50, SUN[2] * 50); X.vscene.add(vs); const rim = new THREE.DirectionalLight('#9fd8ff', .8); rim.position.set(-1, .6, -1.5); X.vroot.add(rim, rim.target); }
    X.vmuzzle = new THREE.PointLight('#ffcf8a', 0, 2); X.vmuzzle.position.set(.1, -.05, -.8); X.vroot.add(X.vmuzzle);
    X.abL = new THREE.PointLight('#ffffff', 0, 1.1, 2); X.vroot.add(X.abL);   // a readied ability's glow on the hands and gun (made now, so no shader has to change when it lights)
    X.view = new THREE.Group(); X.vroot.add(X.view); X.viewGun = null; X.viewKey = '';
    addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
    X.texLog = []; buildWorld(); buildSky(); X.mapTex = X.texLog; X.texLog = null; buildFx(); warmShaders(); try { buildPortraits(); } catch (e) { console.warn(e); }
  }
  function buildSky() {
    const TH = X.theme || { sky: ['#3f7fc4', '#86b8e0', '#cfe3ee'] }, S = TH.sky; if (X.dome) { X.scene.remove(X.dome); X.dome.material.map.dispose(); }
    // the dome: deep blue overhead, pale haze at the horizon, a glow round the sun, a few long clouds
    const th = Math.acos(SUN[1]) / Math.PI, ph = ((Math.atan2(SUN[2], -SUN[0]) / TAU) + 1) % 1;
    const tex = canvasTex(X.low ? 1024 : 2048, X.low ? 512 : 1024, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h * .5); gr.addColorStop(0, S[0]); gr.addColorStop(.55, S[1]); gr.addColorStop(1, S[2]); g.fillStyle = gr; g.fillRect(0, 0, w, h * .5); g.fillStyle = S[2]; g.fillRect(0, h * .5, w, h * .5);
      if (TH.stars) for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${.3 + Math.random() * .7})`; g.fillRect(Math.random() * w, Math.random() * h * .45, Math.random() < .1 ? 2 : 1, Math.random() < .1 ? 2 : 1); }
      for (const dx of [-w, 0, w]) { const sg = g.createRadialGradient(ph * w + dx, th * h, 4 * w / 1024, ph * w + dx, th * h, 190 * w / 1024); sg.addColorStop(0, 'rgba(255,252,235,1)'); sg.addColorStop(.06, 'rgba(255,244,205,.95)'); sg.addColorStop(.3, 'rgba(255,230,180,.35)'); sg.addColorStop(1, 'rgba(255,230,180,0)'); g.fillStyle = sg; g.fillRect(0, 0, w, h * .5); }
      g.save(); g.scale(w / 1024, h / 512); skyClouds(g, 1024, 512, TH, ph); g.restore();   // (72-horizon)
    });
    tex.wrapT = THREE.ClampToEdgeWrapping;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 20), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false })); dome.renderOrder = -10; X.scene.add(dome); X.dome = dome;
  }
  // keep the frame rate on slow phones: if frames run long for a while, draw fewer pixels (never fewer than the screen's own)
  // (and if that is not enough, the shadows go: they draw every fighter and gun a second time)
  function tunePixels(dt) {
    if (dt > .034) X.slow += dt; else X.slow = Math.max(0, X.slow - dt * .5);
    if (X.slow > 1.2 && X.pr > .8) { X.pr = Math.max(.75, X.pr - .25); X.renderer.setPixelRatio(X.pr); X.renderer.setSize(innerWidth, innerHeight, false); X.slow = 0; }
    else if (X.slow > 2 && X.renderer.shadowMap.enabled) { X.renderer.shadowMap.enabled = false; X.sun.castShadow = false; X.scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; }); X.slow = 0; }
  }
  (async () => { try { if (typeof document === 'undefined') return; await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'); initGfx(); ready = true; } catch (e) { console.error(e); failed = true; } })();
