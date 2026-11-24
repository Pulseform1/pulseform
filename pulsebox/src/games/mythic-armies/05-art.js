/* ---------- card art (rendered from each character's 3D model), card faces, icons ---------- */

const FONT_D = "'Cinzel', 'Palatino Linotype', Georgia, serif", FONT_U = "'Nunito', 'Segoe UI', system-ui, sans-serif";
const ART = { r: null, scene: null, cam: null, W: 400, H: 296, img: new Map(), sil: new Map(), wait: new Map(), queue: [], busy: false, lights: null };
function initArt() {
  const cv = document.createElement('canvas');
  cv.width = ART.W; cv.height = ART.H;
  ART.r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true });
  ART.r.setPixelRatio(1);
  ART.r.setSize(ART.W, ART.H, false);
  ART.r.outputEncoding = THREE.sRGBEncoding;
  ART.r.toneMapping = THREE.ACESFilmicToneMapping;
  ART.r.toneMappingExposure = 1.2;
  ART.r.setClearColor(0x000000, 0);
  ART.scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x302040, 0.75);
  const key = new THREE.DirectionalLight(0xfff0dd, 1.6); key.position.set(-3, 5, 6);
  const rim = new THREE.DirectionalLight(0xffffff, 1.6); rim.position.set(4, 3, -5);
  const rim2 = new THREE.DirectionalLight(0xffffff, 0.8); rim2.position.set(-5, 1, -3);
  ART.scene.add(hemi, key, rim, rim2);
  ART.lights = { hemi, key, rim, rim2 };
  ART.cam = new THREE.PerspectiveCamera(28, ART.W / ART.H, 0.1, 60);
}
function artReady(id) { return ART.img.has(id); }
function getArt(id) {
  if (ART.img.has(id)) return Promise.resolve(ART.img.get(id));
  if (ART.wait.has(id)) return ART.wait.get(id).p;
  let res; const p = new Promise(r => { res = r; });
  ART.wait.set(id, { p, res });
  ART.queue.push(id);
  pumpArt();
  return p;
}
function pumpArt() {
  if (ART.busy || !ART.queue.length) return;
  ART.busy = true;
  setTimeout(async () => {
    const id = ART.queue.shift();
    try { await renderArt(id); } catch (e) { console.warn('art', id, e); }
    ART.busy = false;
    pumpArt();
  }, 0);
}
const _box = new THREE.Box3(), _ctr = new THREE.Vector3(), _sz = new THREE.Vector3();
async function renderArt(id) {
  const c = CHAR[id], f = FAC[c.fac];
  const m = makeModel(id, { noAura: true });
  const pose = c.role === 'M' || c.role === 'H' ? ['cast', 0.42] : c.rng > 2 ? ['atk', 0.35] : ['atk', 0.32];
  animModel(m, 0.6, pose[0], pose[1]);
  const facing = c.body === 'srp' || c.body === 'oct' ? 0.35 : c.body === 'qd' || c.body === 'drk' || c.body === 'fsh' || c.body === 'crw' ? 0.75 : 0.45;
  m.rotation.y = facing;
  if (c.body === 'ray') m.rotation.x = 0.55;
  ART.scene.add(m);
  m.updateMatrixWorld(true);
  _box.setFromObject(m);
  _box.getCenter(_ctr); _box.getSize(_sz);
  const fov = ART.cam.fov * Math.PI / 180, aspect = ART.W / ART.H;
  const fitH = _sz.y * 1.18, fitW = Math.max(_sz.x, _sz.z) * 1.05 / aspect;
  const dist = Math.max(fitH, fitW) / 2 / Math.tan(fov / 2) + Math.max(_sz.x, _sz.z) * 0.5;
  ART.cam.position.set(_ctr.x + dist * 0.12, _ctr.y + _sz.y * 0.02, _ctr.z + dist);
  ART.cam.lookAt(_ctr.x, _ctr.y + _sz.y * 0.04, _ctr.z);
  ART.lights.rim.color.set(f.glow); ART.lights.rim2.color.set(f.col);
  ART.lights.hemi.color.set(f.light); ART.lights.hemi.groundColor.set(f.dark);
  setRim(f.glow, 0.35 + c.r * 0.06);
  const prevSize = ART.r.getSize(new THREE.Vector2());
  if (prevSize.x !== ART.W || prevSize.y !== ART.H) ART.r.setSize(ART.W, ART.H, false);
  ART.r.setClearColor(0x000000, 0);
  ART.r.render(ART.scene, ART.cam);
  releaseModel(m);
  setRim('#000000', 0);
  const W = ART.W, H = ART.H;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  x.drawImage(factionBg(c.fac), 0, 0, W, H);
  const rc = RAR[c.r].col;
  const g = x.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.55, W * (0.38 + c.r * 0.05));
  g.addColorStop(0, hexA(c.r >= 2 ? rc : f.light, 0.32 + c.r * 0.06)); g.addColorStop(1, hexA(rc, 0));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  if (c.r >= 3) {
    x.save(); x.translate(W / 2, H * 0.55); x.globalCompositeOperation = 'lighter';
    const nr = c.r === 5 ? 24 : 14;
    for (let i = 0; i < nr; i++) { x.rotate(Math.PI * 2 / nr); x.fillStyle = hexA(c.r === 5 ? (i % 2 ? '#ff8ae8' : '#8af0ff') : rc, 0.07); x.beginPath(); x.moveTo(0, 0); x.lineTo(W, -18); x.lineTo(W, 18); x.fill(); }
    x.restore();
  }
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(W / 2, H * 0.92, W * 0.3, H * 0.05, 0, 0, Math.PI * 2); x.fill();
  x.drawImage(ART.r.domElement, 0, 0, W, H);
  const fg = x.createLinearGradient(0, H * 0.75, 0, H);
  fg.addColorStop(0, hexA(f.dark, 0)); fg.addColorStop(1, hexA(f.dark, 0.55));
  x.fillStyle = fg; x.fillRect(0, H * 0.75, W, H * 0.25);
  const R = rng(c.seed + 5);
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 10 + c.r * 6; i++) { const px = R() * W, py = R() * H, s = 0.6 + R() * 2.2; x.fillStyle = hexA(R() < 0.5 ? f.glow : rc, 0.35 + R() * 0.4); x.beginPath(); x.arc(px, py, s, 0, Math.PI * 2); x.fill(); }
  x.globalCompositeOperation = 'source-over';
  const vg = x.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  x.fillStyle = vg; x.fillRect(0, 0, W, H);
  const sv = document.createElement('canvas'); sv.width = W / 2; sv.height = H / 2;
  const sx = sv.getContext('2d');
  sx.drawImage(factionBg(c.fac), 0, 0, W / 2, H / 2);
  sx.fillStyle = 'rgba(6,4,14,0.72)'; sx.fillRect(0, 0, W / 2, H / 2);
  const tmp = document.createElement('canvas'); tmp.width = W / 2; tmp.height = H / 2;
  const tx = tmp.getContext('2d');
  tx.drawImage(ART.r.domElement, 0, 0, W / 2, H / 2);
  ART.dirty = true;
  tx.globalCompositeOperation = 'source-in'; tx.fillStyle = hexA(f.col, 0.55); tx.fillRect(0, 0, W / 2, H / 2);
  sx.drawImage(tmp, 0, 0);
  const [img, sil] = await Promise.all([canvasToImage(cv, 0.9), canvasToImage(sv, 0.8)]);
  ART.img.set(id, img); ART.sil.set(id, sil);
  if (ART.img.size > 90) { const k = ART.img.keys().next().value; const old = ART.img.get(k); ART.img.delete(k); ART.sil.delete(k); if (old && old.src.startsWith('blob:')) URL.revokeObjectURL(old.src); }
  const w = ART.wait.get(id); ART.wait.delete(id);
  if (w) w.res(img);
}
function canvasToImage(cv, q) {
  return new Promise(res => {
    const done = url => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(im); im.src = url; };
    if (cv.toBlob) cv.toBlob(b => done(b ? URL.createObjectURL(b) : cv.toDataURL('image/jpeg', q)), 'image/jpeg', q);
    else done(cv.toDataURL('image/jpeg', q));
  });
}
function hexA(hex, a) { const c = new THREE.Color(hex); return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`; }
function mix(h1, h2, t) { const a = new THREE.Color(h1), b = new THREE.Color(h2); a.lerp(b, t); return '#' + a.getHexString(); }

/* painted faction backdrops, cached per faction */
const BG_CACHE = {};
function factionBg(fid) {
  if (BG_CACHE[fid]) return BG_CACHE[fid];
  const W = 400, H = 296, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), f = FAC[fid], R = rng(hashStr(fid));
  const sky = x.createLinearGradient(0, 0, 0, H);
  const skies = { ember: ['#2a0806', '#7a1f0c', '#e0641e'], wild: ['#06281c', '#1f6a3a', '#9ad86a'], stone: ['#1c1830', '#6a4a5a', '#e8a86a'],
    tide: ['#021a36', '#0a5a8a', '#4ad0e0'], star: ['#05061e', '#24206a', '#7a5ac8'], gloom: ['#08040e', '#2a1840', '#4a7a5a'] }[fid];
  sky.addColorStop(0, skies[0]); sky.addColorStop(0.55, skies[1]); sky.addColorStop(1, skies[2]);
  x.fillStyle = sky; x.fillRect(0, 0, W, H);
  const ridge = (y0, amp, col, rough, spikes) => {
    x.fillStyle = col; x.beginPath(); x.moveTo(0, H);
    let y = y0;
    for (let px = 0; px <= W + 20; px += 20) { y = y0 + Math.sin(px * 0.012 + R() * 2) * amp + (R() - 0.5) * rough; if (spikes && R() < 0.3) y -= spikes * R(); x.lineTo(px, y); }
    x.lineTo(W, H); x.fill();
  };
  if (fid === 'star') {
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.7})`; x.fillRect(R() * W, R() * H * 0.8, R() < 0.1 ? 2 : 1, R() < 0.1 ? 2 : 1); }
    const au = x.createLinearGradient(0, 40, W, 120); au.addColorStop(0, 'rgba(120,255,220,0)'); au.addColorStop(0.5, 'rgba(160,255,230,0.25)'); au.addColorStop(1, 'rgba(200,140,255,0)');
    x.fillStyle = au; x.beginPath(); x.moveTo(0, 60); x.bezierCurveTo(120, 20, 260, 120, W, 50); x.lineTo(W, 90); x.bezierCurveTo(260, 160, 120, 60, 0, 100); x.fill();
    x.fillStyle = '#f4eecc'; x.beginPath(); x.arc(W * 0.78, H * 0.22, 30, 0, Math.PI * 2); x.fill();
    x.fillStyle = skies[1]; x.beginPath(); x.arc(W * 0.78 + 12, H * 0.2, 27, 0, Math.PI * 2); x.fill();
    ridge(H * 0.78, 10, '#1a1850', 10); ridge(H * 0.88, 6, '#0e0c30', 6);
  } else if (fid === 'ember') {
    ridge(H * 0.55, 20, '#3a0c08', 30, 60);
    x.strokeStyle = 'rgba(255,140,40,0.7)'; x.lineWidth = 2;
    for (let i = 0; i < 6; i++) { x.beginPath(); let px = R() * W, py = H * 0.65; x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (R() - 0.5) * 50; py += 12; x.lineTo(px, py); } x.stroke(); }
    ridge(H * 0.8, 8, '#1a0604', 10);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,${120 + R() * 100},40,${0.4 + R() * 0.5})`; x.beginPath(); x.arc(R() * W, R() * H * 0.8, R() * 1.8 + 0.4, 0, 7); x.fill(); }
  } else if (fid === 'wild') {
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(220,255,180,0.06)'; x.beginPath(); const px = 60 + i * 70; x.moveTo(px, 0); x.lineTo(px + 40, 0); x.lineTo(px + 120, H); x.lineTo(px + 50, H); x.fill(); }
    x.globalCompositeOperation = 'source-over';
    const tree = (px, base, h, col) => { x.fillStyle = col; x.fillRect(px - 3, base - h * 0.3, 6, h * 0.3); for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(px, base - h + k * h * 0.22); x.lineTo(px - h * 0.22, base - h * 0.35 + k * h * 0.2); x.lineTo(px + h * 0.22, base - h * 0.35 + k * h * 0.2); x.fill(); } };
    for (let i = 0; i < 12; i++) tree(R() * W, H * 0.75, 80 + R() * 60, '#164a2a');
    for (let i = 0; i < 8; i++) tree(R() * W, H * 0.95, 110 + R() * 70, '#0a2a16');
    for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(230,255,150,${0.3 + R() * 0.5})`; x.beginPath(); x.arc(R() * W, R() * H, R() * 1.6 + 0.4, 0, 7); x.fill(); }
  } else if (fid === 'stone') {
    ridge(H * 0.45, 25, '#4a3a4a', 40, 50); ridge(H * 0.62, 18, '#2e2630', 30, 40);
    for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(127,224,255,0.7)'; const px = R() * W, py = H * 0.75 + R() * 40, s = 6 + R() * 10; x.beginPath(); x.moveTo(px, py - s * 2); x.lineTo(px + s * 0.5, py); x.lineTo(px - s * 0.5, py); x.fill(); }
    ridge(H * 0.85, 6, '#16121a', 8);
  } else if (fid === 'tide') {
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) { x.fillStyle = 'rgba(160,255,255,0.05)'; const px = R() * W; x.beginPath(); x.moveTo(px, 0); x.lineTo(px + 30, 0); x.lineTo(px + 90 - R() * 60, H); x.lineTo(px + 40 - R() * 60, H); x.fill(); }
    x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 9; i++) { x.strokeStyle = i % 2 ? '#c84a6a' : '#e87a5a'; x.lineWidth = 4; const px = R() * W, py = H; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + (R() - 0.5) * 40, py - 40, px + (R() - 0.5) * 30, py - 60 - R() * 40); x.stroke(); }
    ridge(H * 0.9, 5, '#04263a', 6);
    for (let i = 0; i < 25; i++) { x.strokeStyle = 'rgba(200,255,255,0.5)'; x.lineWidth = 1; x.beginPath(); x.arc(R() * W, R() * H * 0.9, 1 + R() * 3, 0, 7); x.stroke(); }
  } else {
    x.fillStyle = 'rgba(200,255,220,0.9)'; x.beginPath(); x.arc(W * 0.25, H * 0.25, 26, 0, 7); x.fill();
    const mg = x.createRadialGradient(W * 0.25, H * 0.25, 20, W * 0.25, H * 0.25, 90); mg.addColorStop(0, 'rgba(150,255,190,0.35)'); mg.addColorStop(1, 'rgba(150,255,190,0)');
    x.fillStyle = mg; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#120a18'; x.lineCap = 'round';
    for (let i = 0; i < 6; i++) { let px = R() * W, py = H; x.lineWidth = 6; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (R() - 0.5) * 40; py -= 30 + R() * 20; x.lineTo(px, py); } x.stroke(); x.lineWidth = 2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 30, py - 20); x.moveTo(px, py + 20); x.lineTo(px - 25, py - 5); x.stroke(); }
    ridge(H * 0.86, 6, '#0c0612', 8);
    const fog = x.createLinearGradient(0, H * 0.6, 0, H); fog.addColorStop(0, 'rgba(120,255,180,0)'); fog.addColorStop(1, 'rgba(120,255,180,0.18)');
    x.fillStyle = fog; x.fillRect(0, 0, W, H);
  }
  BG_CACHE[fid] = cv;
  return cv;
}

/* ---------- icons drawn as paths (shared by cards and the DOM) ---------- */
function rrect(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
function drawCrestSymbol(x, fid, cx, cy, s, col) {
  x.save(); x.translate(cx, cy); x.scale(s / 20, s / 20); x.fillStyle = col; x.strokeStyle = col; x.lineWidth = 2.4; x.lineJoin = 'round';
  x.beginPath();
  if (fid === 'ember') { x.moveTo(0, -15); x.bezierCurveTo(10, -4, 12, 4, 8, 11); x.bezierCurveTo(5, 16, -5, 16, -8, 11); x.bezierCurveTo(-12, 4, -6, -2, -4, -8); x.bezierCurveTo(-2, -2, 2, 0, 0, -15); x.fill(); }
  else if (fid === 'wild') { x.moveTo(0, -15); x.bezierCurveTo(14, -8, 12, 8, 0, 15); x.bezierCurveTo(-12, 8, -14, -8, 0, -15); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.moveTo(0, -10); x.lineTo(0, 13); x.stroke(); }
  else if (fid === 'stone') { x.moveTo(-15, 12); x.lineTo(-5, -8); x.lineTo(0, 0); x.lineTo(6, -14); x.lineTo(15, 12); x.closePath(); x.fill(); }
  else if (fid === 'tide') { x.lineWidth = 3.2; x.moveTo(-15, 2); x.bezierCurveTo(-9, -12, 0, -12, 1, -2); x.bezierCurveTo(2, 6, 10, 4, 8, -2); x.moveTo(-15, 11); x.bezierCurveTo(-7, 4, 3, 16, 15, 8); x.stroke(); }
  else if (fid === 'star') { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 5 : 15; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill(); }
  else { x.arc(0, 0, 13, 0, Math.PI * 2); x.fill(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(5, -3, 11, 0, Math.PI * 2); x.fill(); x.globalCompositeOperation = 'source-over'; x.beginPath(); x.arc(-4, 2, 2.5, 0, 7); x.fill(); }
  x.restore();
}
function drawCrest(x, fid, cx, cy, r) {
  const f = FAC[fid];
  const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 2, cx, cy, r);
  g.addColorStop(0, mix(f.col, '#ffffff', 0.25)); g.addColorStop(1, f.mid);
  x.fillStyle = '#1a1420'; x.beginPath(); x.arc(cx, cy, r + 3, 0, 7); x.fill();
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  x.strokeStyle = 'rgba(255,240,200,0.7)'; x.lineWidth = Math.max(1, r * 0.08); x.beginPath(); x.arc(cx, cy, r - r * 0.1, 0, 7); x.stroke();
  drawCrestSymbol(x, fid, cx, cy, r * 1.05, '#fff8e8');
}
function drawGem(x, r, cx, cy, s) {
  const col = RAR[r].col;
  x.save(); x.translate(cx, cy);
  const pts = r >= 4 ? 8 : r >= 2 ? 6 : 4;
  x.beginPath();
  for (let i = 0; i < pts; i++) { const a = i / pts * Math.PI * 2 - Math.PI / 2; x.lineTo(Math.cos(a) * s, Math.sin(a) * s * 1.1); }
  x.closePath();
  const g = x.createLinearGradient(-s, -s, s, s);
  if (r === 5) { g.addColorStop(0, '#ff8ae8'); g.addColorStop(0.35, '#ffe36a'); g.addColorStop(0.65, '#7af0ff'); g.addColorStop(1, '#a87aff'); }
  else { g.addColorStop(0, mix(col, '#ffffff', 0.55)); g.addColorStop(0.5, col); g.addColorStop(1, RAR[r].deep); }
  x.fillStyle = g; x.fill();
  x.strokeStyle = '#1a1420'; x.lineWidth = s * 0.16; x.stroke();
  x.fillStyle = 'rgba(255,255,255,0.65)'; x.beginPath(); x.ellipse(-s * 0.25, -s * 0.35, s * 0.25, s * 0.14, -0.6, 0, 7); x.fill();
  x.restore();
}
function drawRoleIcon(x, role, cx, cy, s, col) {
  x.save(); x.translate(cx, cy); x.scale(s / 20, s / 20); x.fillStyle = col; x.strokeStyle = col; x.lineWidth = 2.6; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath();
  if (role === 'D') { x.moveTo(0, -14); x.lineTo(12, -9); x.lineTo(11, 3); x.quadraticCurveTo(8, 11, 0, 15); x.quadraticCurveTo(-8, 11, -11, 3); x.lineTo(-12, -9); x.closePath(); x.fill(); }
  else if (role === 'S') { x.moveTo(-12, 12); x.lineTo(10, -10); x.moveTo(12, 12); x.lineTo(-10, -10); x.stroke(); x.beginPath(); x.moveTo(-13, 6); x.lineTo(-6, 13); x.moveTo(13, 6); x.lineTo(6, 13); x.stroke(); }
  else if (role === 'R') { x.moveTo(-13, 13); x.lineTo(11, -11); x.stroke(); x.beginPath(); x.moveTo(13, -13); x.lineTo(4, -12); x.lineTo(12, -4); x.closePath(); x.fill(); x.beginPath(); x.moveTo(-13, 13); x.lineTo(-13, 6); x.moveTo(-13, 13); x.lineTo(-6, 13); x.stroke(); }
  else if (role === 'M') { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, rr = i % 2 ? 4 : 14; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill(); }
  else if (role === 'H') { x.moveTo(-4, -13); x.lineTo(4, -13); x.lineTo(4, -4); x.lineTo(13, -4); x.lineTo(13, 4); x.lineTo(4, 4); x.lineTo(4, 13); x.lineTo(-4, 13); x.lineTo(-4, 4); x.lineTo(-13, 4); x.lineTo(-13, -4); x.lineTo(-4, -4); x.closePath(); x.fill(); }
  else { x.moveTo(0, -15); x.lineTo(5, 4); x.lineTo(0, 7); x.lineTo(-5, 4); x.closePath(); x.fill(); x.beginPath(); x.moveTo(-8, 7); x.lineTo(8, 7); x.stroke(); x.beginPath(); x.moveTo(0, 8); x.lineTo(0, 14); x.stroke(); }
  x.restore();
}
function drawStatIcon(x, k, cx, cy, s, col) {
  x.save(); x.translate(cx, cy); x.scale(s / 20, s / 20); x.fillStyle = col; x.strokeStyle = col; x.lineWidth = 2.6; x.lineCap = 'round';
  x.beginPath();
  if (k === 'hp') { x.moveTo(0, 13); x.bezierCurveTo(-16, 2, -12, -14, 0, -6); x.bezierCurveTo(12, -14, 16, 2, 0, 13); x.fill(); }
  else if (k === 'atk') { x.moveTo(-11, 11); x.lineTo(9, -9); x.stroke(); x.beginPath(); x.moveTo(12, -12); x.lineTo(5, -11); x.lineTo(11, -5); x.fill(); x.beginPath(); x.moveTo(-13, 5); x.lineTo(-5, 13); x.stroke(); }
  else if (k === 'def') { x.moveTo(0, -13); x.lineTo(11, -8); x.lineTo(10, 3); x.quadraticCurveTo(7, 10, 0, 14); x.quadraticCurveTo(-7, 10, -10, 3); x.lineTo(-11, -8); x.closePath(); x.fill(); }
  else if (k === 'spd') { x.moveTo(-12, -6); x.lineTo(4, -6); x.moveTo(-14, 1); x.lineTo(6, 1); x.moveTo(-10, 8); x.lineTo(2, 8); x.stroke(); x.beginPath(); x.moveTo(6, -10); x.lineTo(14, 1); x.lineTo(6, 12); x.closePath(); x.fill(); }
  else { x.arc(0, 0, 11, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, 5, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, 1.6, 0, 7); x.fill(); }
  x.restore();
}
function wrap(x, text, X, Y, maxW, lh, maxLines, align) {
  const words = text.split(' '); let line = '', lines = [];
  for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
  lines.forEach((l, i) => x.fillText(l, align === 'center' ? X + maxW / 2 : X, Y + i * lh));
  return lines.length;
}
function fitFont(x, text, maxW, size, weight, fam) { let s = size; do { x.font = `${weight} ${s}px ${fam}`; s -= 1; } while (x.measureText(text).width > maxW && s > 10); return s + 1; }

/* ---------- the card face (500 x 700 design units) ---------- */
const FRAMES = [
  { a: '#5b6370', b: '#a3acb9', c: '#4a515c', trim: '#dfe5ee', panel: '#161a22' },
  { a: '#1f6a4e', b: '#78dcaa', c: '#1a4a3c', trim: '#d6ffe8', panel: '#0d1c18' },
  { a: '#1a4590', b: '#6abaff', c: '#14306a', trim: '#e6f4ff', panel: '#0b1428' },
  { a: '#43187e', b: '#c08aff', c: '#2a0f56', trim: '#ffe7a8', panel: '#150a26' },
  { a: '#8a5208', b: '#ffdd78', c: '#9a6410', trim: '#fff3c8', panel: '#1e1406' },
  { a: '#6a1aa0', b: '#ff9ae6', c: '#1a6aa0', trim: '#ffffff', panel: '#140a22' }
];
const CARD_W = 500, CARD_H = 700, ART_RECT = [32, 92, 436, 280], TEXT_RECT = [34, 412, 432, 210];
function drawCard(x, W, c, opts) {
  opts = opts || {};
  const s = W / CARD_W, F = FRAMES[c.r], f = FAC[c.fac], missing = !!opts.missing;
  x.save(); x.scale(s, s);
  x.clearRect(0, 0, CARD_W, CARD_H);
  rrect(x, 0, 0, CARD_W, CARD_H, 30);
  let g = x.createLinearGradient(0, 0, CARD_W, CARD_H);
  if (c.r === 5 && !missing) { ['#ff8ae8', '#ffe36a', '#7af0ff', '#a87aff', '#ff8ae8', '#7af0ff'].forEach((col, i) => g.addColorStop(i / 5, col)); }
  else { g.addColorStop(0, F.b); g.addColorStop(0.45, F.a); g.addColorStop(0.55, F.c); g.addColorStop(1, F.b); }
  x.fillStyle = missing ? '#2a2834' : g; x.fill();
  x.save(); rrect(x, 0, 0, CARD_W, CARD_H, 30); x.clip();
  x.globalAlpha = 0.18; x.strokeStyle = '#ffffff'; x.lineWidth = 1;
  for (let i = -CARD_H; i < CARD_W; i += 9) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + CARD_H, CARD_H); x.stroke(); }
  x.restore();
  x.globalAlpha = 1;
  rrect(x, 12, 12, CARD_W - 24, CARD_H - 24, 22);
  x.fillStyle = missing ? '#121019' : F.panel; x.fill();
  const pg = x.createLinearGradient(0, 0, 0, CARD_H);
  pg.addColorStop(0, hexA(f.col, missing ? 0.05 : 0.22)); pg.addColorStop(0.6, hexA(f.dark, 0)); pg.addColorStop(1, hexA(f.col, missing ? 0.04 : 0.16));
  x.fillStyle = pg; x.fill();
  x.strokeStyle = missing ? '#3a3846' : F.trim; x.lineWidth = 2; rrect(x, 18, 18, CARD_W - 36, CARD_H - 36, 18); x.stroke();
  const [ax, ay, aw, ah] = ART_RECT;
  x.save();
  x.beginPath(); x.moveTo(ax, ay + ah); x.lineTo(ax, ay + 40); x.quadraticCurveTo(ax, ay, ax + 40, ay); x.lineTo(ax + aw - 40, ay); x.quadraticCurveTo(ax + aw, ay, ax + aw, ay + 40); x.lineTo(ax + aw, ay + ah); x.closePath();
  x.fillStyle = '#05040a'; x.fill(); x.clip();
  const img = missing ? opts.sil : opts.art;
  if (img && img.naturalWidth) { const sc = Math.max(aw / img.naturalWidth, ah / img.naturalHeight), iw = img.naturalWidth * sc, ih = img.naturalHeight * sc; x.drawImage(img, ax + (aw - iw) / 2, ay + (ah - ih) * 0.4, iw, ih); }
  else { x.drawImage(factionBg(c.fac), ax, ay, aw, ah); x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(ax, ay, aw, ah); }
  if (missing) { x.fillStyle = 'rgba(255,255,255,0.75)'; x.font = `900 84px ${FONT_D}`; x.textAlign = 'center'; x.fillText('?', ax + aw / 2, ay + ah / 2 + 30); x.textAlign = 'left'; }
  x.restore();
  x.strokeStyle = missing ? '#3a3846' : F.trim; x.lineWidth = 4;
  x.beginPath(); x.moveTo(ax, ay + ah); x.lineTo(ax, ay + 40); x.quadraticCurveTo(ax, ay, ax + 40, ay); x.lineTo(ax + aw - 40, ay); x.quadraticCurveTo(ax + aw, ay, ax + aw, ay + 40); x.lineTo(ax + aw, ay + ah); x.stroke();
  const ny = 22, nh = 58;
  rrect(x, 70, ny, CARD_W - 140, nh, 14);
  const ng = x.createLinearGradient(0, ny, 0, ny + nh); ng.addColorStop(0, missing ? '#2a2834' : mix(F.a, '#000', 0.2)); ng.addColorStop(1, missing ? '#1a1822' : mix(F.c, '#000', 0.45));
  x.fillStyle = ng; x.fill(); x.strokeStyle = missing ? '#4a4856' : F.trim; x.lineWidth = 2.5; x.stroke();
  x.fillStyle = '#fff8ec'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const nm = missing ? '? ? ?' : c.short;
  fitFont(x, nm, CARD_W - 170, 34, 700, FONT_D);
  x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 6; x.fillText(nm, CARD_W / 2, ny + nh / 2 + 2); x.shadowBlur = 0;
  drawCrest(x, c.fac, 58, 52, 34);
  {
    const cx = CARD_W - 58, cy = 52, sz = 28;
    x.fillStyle = '#1a1420'; x.beginPath(); x.arc(cx, cy, sz + 8, 0, 7); x.fill();
    x.strokeStyle = missing ? '#4a4856' : F.trim; x.lineWidth = 2.5; x.beginPath(); x.arc(cx, cy, sz + 5, 0, 7); x.stroke();
    drawGem(x, c.r, cx, cy, sz * 0.82);
  }
  const ry = ay + ah - 6;
  x.beginPath(); x.moveTo(60, ry); x.lineTo(CARD_W - 60, ry); x.lineTo(CARD_W - 44, ry + 21); x.lineTo(CARD_W - 60, ry + 42); x.lineTo(60, ry + 42); x.lineTo(44, ry + 21); x.closePath();
  x.fillStyle = missing ? '#22202c' : mix(f.mid, '#000', 0.25); x.fill(); x.strokeStyle = missing ? '#3a3846' : F.trim; x.lineWidth = 2; x.stroke();
  x.font = `800 20px ${FONT_U}`; x.fillStyle = '#f4ecdc';
  const roleTxt = `${ROLES[c.role].name.toUpperCase()}  ·  ${f.name.toUpperCase()}`;
  const tw = x.measureText(roleTxt).width;
  drawRoleIcon(x, c.role, CARD_W / 2 - tw / 2 - 18, ry + 21, 16, RAR[c.r].col);
  x.fillText(roleTxt, CARD_W / 2 + 6, ry + 22);
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  const [tx, ty, tw2, th] = TEXT_RECT;
  if (missing) {
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.font = `700 22px ${FONT_U}`; x.textAlign = 'center';
    x.fillText('Not discovered yet', CARD_W / 2, ty + 70);
    x.font = `600 18px ${FONT_U}`; x.fillText(`${RAR[c.r].name} · ${f.name}`, CARD_W / 2, ty + 102);
    x.textAlign = 'left';
  } else {
    let y = ty + 22;
    x.fillStyle = mix(RAR[c.r].col, '#ffffff', 0.35); x.font = `800 21px ${FONT_U}`;
    x.fillText('◆ ' + c.act.name, tx + 6, y);
    x.fillStyle = '#ece6da'; x.font = `600 18px ${FONT_U}`;
    y += 24 + 22 * (wrap(x, actDesc(c.act), tx + 6, y + 24, tw2 - 12, 22, 2) - 1);
    if (c.pas) {
      y += 34;
      x.fillStyle = mix(RAR[c.r].col, '#ffffff', 0.35); x.font = `800 19px ${FONT_U}`;
      x.fillText('◇ ' + c.pas.name, tx + 6, y);
      x.fillStyle = '#d8d2c6'; x.font = `600 17px ${FONT_U}`;
      y += 22 * wrap(x, pasDesc(c.pas), tx + 6, y + 22, tw2 - 12, 21, 2);
    }
    x.fillStyle = 'rgba(255,240,215,0.62)'; x.font = `italic 600 16px ${FONT_U}`; x.textAlign = 'center';
    wrap(x, c.flavour, tx + 4, ty + th - 30, tw2 - 8, 19, 2, 'center');
    x.textAlign = 'left';
  }
  const sy = 636, keys = ['hp', 'atk', 'def', 'spd', 'rng'];
  rrect(x, 30, sy - 4, CARD_W - 60, 46, 12); x.fillStyle = 'rgba(0,0,0,0.42)'; x.fill();
  keys.forEach((k, i) => {
    const cx = 30 + (CARD_W - 60) * (i + 0.5) / 5;
    drawStatIcon(x, k, cx - 26, sy + 19, 15, ['#ff7a8a', '#ffb35a', '#7ac8ff', '#9affb0', '#e0b0ff'][i]);
    x.fillStyle = '#fff6e6'; x.font = `800 21px ${FONT_U}`;
    const v = missing ? '?' : k === 'rng' ? (c.rng < 2 ? 'Melee' : String(c.rng)) : String(c[k]);
    fitFont(x, v, 52, 21, 800, FONT_U);
    x.fillText(v, cx - 12, sy + 27);
  });
  x.fillStyle = 'rgba(255,255,255,0.55)'; x.font = `700 12px ${FONT_U}`;
  x.fillText(`#${String(c.num).padStart(3, '0')} / ${CHARS.length}`, 34, CARD_H - 15);
  x.textAlign = 'right'; x.fillText('MYTHIC ARMIES · PROTOTYPE SET', CARD_W - 34, CARD_H - 15); x.textAlign = 'left';
  if (c.r >= 3 && !missing) {
    x.strokeStyle = F.trim; x.lineWidth = 2;
    for (const [cx, cy, sx, sy2] of [[24, 24, 1, 1], [CARD_W - 24, 24, -1, 1], [24, CARD_H - 24, 1, -1], [CARD_W - 24, CARD_H - 24, -1, -1]]) {
      x.beginPath(); x.moveTo(cx, cy + sy2 * 46); x.quadraticCurveTo(cx, cy, cx + sx * 46, cy); x.stroke();
      x.beginPath(); x.arc(cx + sx * 9, cy + sy2 * 9, 4, 0, 7); x.fillStyle = F.trim; x.fill();
    }
  }
  if (opts.variant === 'radiant' && !missing) {
    x.fillStyle = 'rgba(255,255,255,0.9)'; x.font = `900 14px ${FONT_U}`; x.textAlign = 'center';
    rrect(x, CARD_W / 2 - 56, ay + 8, 112, 24, 12); x.fillStyle = 'rgba(20,10,40,0.7)'; x.fill();
    x.fillStyle = '#fff'; x.fillText('✦ RADIANT ✦', CARD_W / 2, ay + 25); x.textAlign = 'left';
  }
  x.restore();
}
function drawCardBack(x, W) {
  const s = W / CARD_W;
  x.save(); x.scale(s, s);
  x.clearRect(0, 0, CARD_W, CARD_H);
  rrect(x, 0, 0, CARD_W, CARD_H, 30);
  const g = x.createLinearGradient(0, 0, CARD_W, CARD_H); g.addColorStop(0, '#d8b45a'); g.addColorStop(0.5, '#8a6420'); g.addColorStop(1, '#e8c86a');
  x.fillStyle = g; x.fill();
  rrect(x, 14, 14, CARD_W - 28, CARD_H - 28, 22);
  const bg = x.createRadialGradient(CARD_W / 2, CARD_H / 2, 20, CARD_W / 2, CARD_H / 2, CARD_H * 0.6);
  bg.addColorStop(0, '#3a2a7a'); bg.addColorStop(0.6, '#1a1240'); bg.addColorStop(1, '#0a0820');
  x.fillStyle = bg; x.fill();
  x.save(); rrect(x, 14, 14, CARD_W - 28, CARD_H - 28, 22); x.clip();
  x.strokeStyle = 'rgba(255,220,140,0.13)'; x.lineWidth = 2;
  for (let r = 40; r < 520; r += 26) { x.beginPath(); x.arc(CARD_W / 2, CARD_H / 2, r, 0, 7); x.stroke(); }
  x.translate(CARD_W / 2, CARD_H / 2);
  for (let i = 0; i < 24; i++) { x.rotate(Math.PI / 12); x.fillStyle = 'rgba(255,220,140,0.06)'; x.beginPath(); x.moveTo(0, 0); x.lineTo(500, -14); x.lineTo(500, 14); x.fill(); }
  x.restore();
  x.strokeStyle = '#e8c86a'; x.lineWidth = 3; rrect(x, 26, 26, CARD_W - 52, CARD_H - 52, 16); x.stroke();
  drawSigil(x, CARD_W / 2, CARD_H / 2 - 20, 1.6);
  x.fillStyle = '#f4dc9a'; x.font = `900 40px ${FONT_D}`; x.textAlign = 'center';
  x.fillText('MYTHIC', CARD_W / 2, CARD_H / 2 + 150); x.font = `700 26px ${FONT_D}`; x.fillText('A R M I E S', CARD_W / 2, CARD_H / 2 + 188);
  x.textAlign = 'left';
  x.restore();
}
/* the game's emblem: a shield crowned with two wings and a star */
function drawSigil(x, cx, cy, s) {
  x.save(); x.translate(cx, cy); x.scale(s, s);
  const gold = x.createLinearGradient(0, -80, 0, 80); gold.addColorStop(0, '#fff2b8'); gold.addColorStop(0.5, '#e8b24a'); gold.addColorStop(1, '#9a6a1a');
  x.fillStyle = gold; x.strokeStyle = '#3a2408'; x.lineWidth = 3;
  for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(sd * 18, -10); for (let i = 0; i < 4; i++) { x.quadraticCurveTo(sd * (40 + i * 12), -50 + i * 14, sd * (70 - i * 4), -40 + i * 18); x.lineTo(sd * (34 + i * 6), -8 + i * 10); } x.closePath(); x.fill(); x.stroke(); }
  x.beginPath(); x.moveTo(0, -46); x.lineTo(34, -32); x.lineTo(30, 14); x.quadraticCurveTo(22, 40, 0, 56); x.quadraticCurveTo(-22, 40, -30, 14); x.lineTo(-34, -32); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = '#2a1a5a'; x.beginPath(); x.moveTo(0, -34); x.lineTo(24, -24); x.lineTo(21, 12); x.quadraticCurveTo(15, 32, 0, 44); x.quadraticCurveTo(-15, 32, -21, 12); x.lineTo(-24, -24); x.closePath(); x.fill();
  x.fillStyle = '#fff2b8'; x.beginPath();
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 7 : 17; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr + 4); } x.closePath(); x.fill();
  x.restore();
}

/* ---------- cached card images for DOM use ---------- */
const THUMB = new Map(), THUMB_W = 300;
async function cardThumb(id, variant, missing) {
  const key = id + (missing ? ':m' : ':' + (variant || 'std'));
  if (THUMB.has(key)) return THUMB.get(key);
  const p = (async () => {
    const img = await getArt(id);
    const cv = document.createElement('canvas'); cv.width = THUMB_W; cv.height = Math.round(THUMB_W * 1.4);
    drawCard(cv.getContext('2d'), THUMB_W, CHAR[id], { art: img, sil: ART.sil.get(id), missing, variant });
    const im = await canvasToImage(cv, 0.88);
    return im.src;
  })();
  THUMB.set(key, p);
  return p;
}
function cardCanvas(id, W, variant) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Math.round(W * 1.4);
  const draw = img => drawCard(cv.getContext('2d'), W, CHAR[id], { art: img, variant });
  draw(ART.img.get(id));
  if (!ART.img.has(id)) getArt(id).then(draw);
  return cv;
}
const ICONS = {};
function iconURL(kind, a, size) {
  const k = kind + a + size;
  if (ICONS[k]) return ICONS[k];
  const cv = document.createElement('canvas'); cv.width = cv.height = size * 2;
  const x = cv.getContext('2d');
  if (kind === 'crest') drawCrest(x, a, size, size, size * 0.8);
  else if (kind === 'gem') drawGem(x, a, size, size, size * 0.75);
  else if (kind === 'role') drawRoleIcon(x, a, size, size, size * 0.85, '#fff3dc');
  else if (kind === 'stat') drawStatIcon(x, a, size, size, size * 0.85, ({ hp: '#ff7a8a', atk: '#ffb35a', def: '#7ac8ff', spd: '#9affb0', rng: '#e0b0ff' })[a]);
  else if (kind === 'sigil') drawSigil(x, size, size * 1.05, size / 75);
  return (ICONS[k] = cv.toDataURL());
}
