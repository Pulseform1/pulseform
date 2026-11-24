/* ---------- main renderer, scene switching, adaptive resolution, hub backdrop ---------- */

const SC = { cur: null, all: {}, t: 0, last: 0, needs: true, fpsAcc: 0, fpsN: 0, frameLog: null, overlay: null };
function initMain() {
  const canvas = $('#gl');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false });
  r.outputEncoding = THREE.sRGBEncoding;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.1;
  r.setClearColor(0x0d0a1c, 1);
  GFX.r = r;
  GFX.maxDpr = Math.min(window.devicePixelRatio || 1, 1.5);
  GFX.dpr = GFX.maxDpr;
  window.addEventListener('resize', onResize);
  onResize();
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); toast('Graphics were reset. Reloading the view…'); });
  requestAnimationFrame(loop);
}
function onResize() {
  GFX.w = window.innerWidth; GFX.h = window.innerHeight;
  GFX.r.setPixelRatio(GFX.dpr);
  GFX.r.setSize(GFX.w, GFX.h, false);
  for (const k in SC.all) if (SC.all[k].resize) SC.all[k].resize(GFX.w, GFX.h);
  SC.needs = true;
}
function setScene(name) {
  const nx = SC.all[name];
  if (SC.cur === nx) return;
  if (SC.cur && SC.cur.exit) SC.cur.exit();
  SC.cur = nx;
  if (nx && nx.enter) nx.enter();
  if (nx && nx.resize) nx.resize(GFX.w, GFX.h);
  SC.needs = true;
}
function loop(now) {
  requestAnimationFrame(loop);
  const ms = now - (SC.last || now);
  SC.last = now;
  if (document.hidden || SC.manual) return;
  frame(Math.min(0.05, ms / 1000), ms);
}
function frame(dt, ms) {
  SC.t += dt;
  const cur = SC.cur, live = cur && (cur.live || SC.needs) || SC.overlay;
  if (!live) return;
  const w0 = performance.now();
  if (cur && cur.update) cur.update(dt, SC.t);
  const r = GFX.r;
  if (cur && (cur.live || SC.needs)) r.render(cur.scene, cur.camera);
  if (SC.overlay) SC.overlay.draw(dt, SC.t);
  SC.needs = false;
  if (SC.frameLog) SC.frameLog.push([ms, performance.now() - w0]);
  if (!SC.manual) adaptRes(ms, cur && cur.live);
}
/* drop the resolution when frames are slow (school Chromebooks), raise it again when there is headroom */
function adaptRes(ms, live) {
  if (!live || ms <= 0 || ms > 200) return;
  SC.fpsAcc += ms; SC.fpsN++;
  if (SC.fpsN < 90) return;
  const avg = SC.fpsAcc / SC.fpsN;
  SC.fpsAcc = 0; SC.fpsN = 0;
  GFX.frameMs = avg;
  let d = GFX.dpr;
  if (avg > 30 && d > 0.75) d = Math.max(0.75, d - 0.25);
  else if (avg < 18 && d < GFX.maxDpr) d = Math.min(GFX.maxDpr, d + 0.25);
  if (d !== GFX.dpr) { GFX.dpr = d; onResize(); }
}
function gradientTexture(stops, h) {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = h || 256;
  const x = cv.getContext('2d'), g = x.createLinearGradient(0, 0, 0, cv.height);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  x.fillStyle = g; x.fillRect(0, 0, 4, cv.height);
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding;
  return t;
}
function starField(n, rad, size, colors) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u), rr = rad * (0.7 + Math.random() * 0.3);
    pos[i * 3] = Math.cos(a) * s * rr; pos[i * 3 + 1] = Math.abs(u) * rr * 0.8 + 2; pos[i * 3 + 2] = Math.sin(a) * s * rr;
    const c = lin(colors[i % colors.length]);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false }));
}
let CARD_BACK_TEX = null;
function cardBackTexture() {
  if (CARD_BACK_TEX) return CARD_BACK_TEX;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 358;
  drawCardBack(cv.getContext('2d'), 256);
  CARD_BACK_TEX = new THREE.CanvasTexture(cv); CARD_BACK_TEX.encoding = THREE.sRGBEncoding; CARD_BACK_TEX.anisotropy = 4;
  return CARD_BACK_TEX;
}

/* ---------- hub backdrop: floating isle, featured champion, orbiting cards and packs ---------- */
function makeHubScene() {
  const scene = new THREE.Scene();
  scene.background = gradientTexture(['#0a0820', '#1e1650', '#4a2a6a', '#8a4a5a']);
  scene.fog = new THREE.Fog(0x1a1240, 14, 40);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xc8b8ff, 0x2a1830, 0.9));
  const key = new THREE.DirectionalLight(0xffe0b0, 1.4); key.position.set(-4, 8, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8af0ff, 1.2); rim.position.set(5, 3, -6); scene.add(rim);
  const world = new THREE.Group(); scene.add(world);
  const K = new Kit();
  K.add('root', 'cone', '#3a2a4a', [0, -1.6, 0], [4.4, 3.2, 4.4], [Math.PI, 0, 0]);
  K.add('root', 'cyl', '#5a8a4a', [0, -0.05, 0], [4.6, 0.25, 4.6]);
  K.add('root', 'cyl', '#6a5a7a', [0, -0.35, 0], [4.5, 0.4, 4.5]);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; K.add('root', 'dod', i % 2 ? '#4a3a5a' : '#5a4a6a', [Math.cos(a) * 2.2, -0.5 - (i % 3) * 0.3, Math.sin(a) * 2.2], 0.5 + (i % 3) * 0.2); }
  K.add('root', 'cyl', '#c8a86a', [0, 0.2, 0], [1.9, 0.2, 1.9]);
  K.add('root', 'cyl', '#8a6a3a', [0, 0.1, 0], [2.1, 0.12, 2.1]);
  K.add('root', 'tor', '#ffd070', [0, 0.31, 0], [1.75, 1.75, 1.75], [Math.PI / 2, 0, 0], 'g');
  const crystals = [[-1.8, 1.4], [1.9, 1.0], [-1.2, -1.7], [1.4, -1.5]];
  crystals.forEach(([x, z], i) => { K.add('root', 'oct', ['#8af0ff', '#ff9ae6', '#ffe36a', '#9affb0'][i], [x, 0.5, z], [0.35, 1.1, 0.35], [0, i, 0.15], 'g'); });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; K.add('root', 'cone', '#3a6a3a', [Math.cos(a) * 1.85, 0.4, Math.sin(a) * 1.85], [0.3, 0.6, 0.3]); }
  const def = kitToDef(K);
  const isle = new THREE.Group();
  for (const p of def.parts) for (const k in p.geos) isle.add(new THREE.Mesh(p.geos[k], k === 'l' ? MAT.lit : MAT.glow));
  world.add(isle);
  const stars = starField(500, 30, 0.22, ['#ffffff', '#fff2c0', '#c8e0ff', '#ffc8f0']);
  scene.add(stars);
  const orbit = new THREE.Group(); world.add(orbit);
  const cardGeo = new THREE.PlaneGeometry(0.62, 0.87);
  const backMat = new THREE.MeshBasicMaterial({ map: cardBackTexture(), side: THREE.DoubleSide, transparent: true, toneMapped: false });
  const cards = [];
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(cardGeo, backMat); m.userData.a = i / 7 * Math.PI * 2; m.userData.y = 1.2 + (i % 3) * 0.5; orbit.add(m); cards.push(m); }
  const H = { scene, camera, live: true, world, cards, model: null, modelId: null };
  H.setFeatured = id => {
    if (H.modelId === id) return;
    if (H.model) releaseModel(H.model);
    H.modelId = id;
    H.model = makeModel(id, { scale: 0.85 });
    const hh = H.model.userData.h; if (hh > 2.6) H.model.scale.setScalar(2.6 / hh);
    H.model.position.y = 0.32;
    world.add(H.model);
    SC.needs = true;
  };
  H.resize = (w, h) => {
    camera.aspect = w / h;
    const portrait = h > w * 1.05;
    camera.fov = portrait ? 58 : 40;
    camera.updateProjectionMatrix();
    world.position.set(portrait ? 0 : -(w > 900 ? 1.5 : 1.2), portrait ? 1.4 : 0.1, 0);
    H.portrait = portrait;
  };
  H.update = (dt, t) => {
    const p = H.portrait;
    camera.position.set(Math.sin(t * 0.08) * 1.2, p ? 4.2 : 3.4, p ? 12.5 : 10);
    camera.lookAt(world.position.x * 0.55, p ? 1.9 : 1.3, 0);
    isle.rotation.y = t * 0.05;
    world.position.y += Math.sin(t * 0.8) * 0.0015;
    cards.forEach((m, i) => {
      const a = m.userData.a + t * 0.25;
      m.position.set(Math.cos(a) * 3.1, m.userData.y + Math.sin(t * 1.3 + i) * 0.15, Math.sin(a) * 3.1);
      m.rotation.set(0.15 * Math.sin(t + i), -a + Math.PI / 2 + t * 0.6, 0.1);
    });
    if (H.model) { H.model.rotation.y = Math.sin(t * 0.3) * 0.7 + 0.3; animModel(H.model, t, 'idle', 0); }
    stars.rotation.y = t * 0.01;
  };
  return H;
}
