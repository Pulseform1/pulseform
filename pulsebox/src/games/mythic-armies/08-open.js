/* ---------- the pack opening: 3D foil packs, tearing, themed particles, card reveals; and box opening ---------- */

const PW = 2.2, PH = 3.5, CRIMP = 0.085, TEAR = 0.862;
const OPEN = { scene: null, leave: null };
const TWEENS = [];
function tween(dur, fn, ease) {
  return new Promise(res => TWEENS.push({ t: 0, dur, fn, ease: ease || (k => k), res }));
}
function runTweens(dt) {
  for (let i = TWEENS.length - 1; i >= 0; i--) {
    const w = TWEENS[i];
    w.t += dt;
    const k = Math.min(1, w.t / w.dur);
    w.fn(w.ease(k));
    if (k >= 1) { TWEENS.splice(i, 1); w.res(); }
  }
}
function flash(op, ms, col) {
  const f = $('#flash');
  f.style.background = col || '#fff';
  f.style.transition = 'none'; f.style.opacity = op;
  void f.offsetWidth;
  f.style.transition = `opacity ${ms}ms ease-out`; f.style.opacity = 0;
}

/* printed pack artwork (also used for shop thumbnails) */
const FAM_STYLE = {
  dragonfire: ['#ff8a2a', '#5a0e06', '#2a0402'], wildheart: ['#8ae05a', '#0f4a22', '#03180a'], stoneforge: ['#ffc46a', '#4a3a2e', '#16100c'],
  deeptide: ['#5ff2ff', '#0a3a6a', '#020e20'], starfall: ['#d8c8ff', '#2a2a7a', '#06061e'], gloomveil: ['#7dffb8', '#3a1a58', '#0a0414']
};
function drawPackFront(x, W, H, fam, tier, flatEdges, art) {
  const F = FAMILY[fam], f = FAC[F.fac], T = TIER[tier], st = FAM_STYLE[fam], R = rng(hashStr(fam));
  const cr = H * CRIMP;
  x.clearRect(0, 0, W, H);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, st[2]); g.addColorStop(0.45, st[1]); g.addColorStop(1, st[2]);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.save(); x.translate(W / 2, H * 0.47); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 28; i++) { x.rotate(Math.PI / 14); x.fillStyle = hexA(st[0], 0.05); x.beginPath(); x.moveTo(0, 0); x.lineTo(H, -H * 0.06); x.lineTo(H, H * 0.06); x.fill(); }
  x.restore();
  x.globalAlpha = 0.18;
  for (let i = 0; i < 26; i++) drawCrestSymbol(x, F.fac, R() * W, cr + R() * (H - cr * 2), 10 + R() * 18, st[0]);
  x.globalAlpha = 1;
  const ax = W * 0.12, ay = H * 0.27, aw = W * 0.76, ah = H * 0.4;
  const glow = x.createRadialGradient(W / 2, ay + ah * 0.55, 10, W / 2, ay + ah * 0.55, aw * 0.75);
  glow.addColorStop(0, hexA(st[0], 0.75)); glow.addColorStop(1, hexA(st[0], 0));
  x.fillStyle = glow; x.fillRect(0, 0, W, H);
  x.save();
  x.beginPath(); x.moveTo(ax, ay + ah); x.lineTo(ax, ay + aw * 0.5); x.arc(W / 2, ay + aw * 0.5, aw / 2, Math.PI, 0); x.lineTo(ax + aw, ay + ah); x.closePath();
  x.fillStyle = hexA(st[2], 0.6); x.fill(); x.clip();
  if (art && art.naturalWidth) { const sc = Math.max(aw / art.naturalWidth, ah / art.naturalHeight) * 1.05; x.drawImage(art, W / 2 - art.naturalWidth * sc / 2, ay + ah - art.naturalHeight * sc * 0.98, art.naturalWidth * sc, art.naturalHeight * sc); }
  else { drawCrest(x, F.fac, W / 2, ay + ah * 0.55, aw * 0.3); }
  x.restore();
  x.strokeStyle = T.col; x.lineWidth = W * 0.014;
  x.beginPath(); x.moveTo(ax, ay + ah); x.lineTo(ax, ay + aw * 0.5); x.arc(W / 2, ay + aw * 0.5, aw / 2, Math.PI, 0); x.lineTo(ax + aw, ay + ah); x.stroke();
  drawSigil(x, W / 2, cr + H * 0.075, W / 520);
  x.textAlign = 'center'; x.fillStyle = '#fff4dc'; x.shadowColor = 'rgba(0,0,0,0.7)'; x.shadowBlur = W * 0.02;
  x.font = `900 ${W * 0.085}px ${FONT_D}`; x.fillText('MYTHIC ARMIES', W / 2, cr + H * 0.165);
  x.font = `900 ${W * 0.13}px ${FONT_D}`;
  const nm = F.name.toUpperCase();
  fitFont(x, nm, W * 0.86, W * 0.13, 900, FONT_D);
  x.fillStyle = st[0]; x.fillText(nm, W / 2, ay + ah + H * 0.075);
  x.shadowBlur = 0;
  const by = ay + ah + H * 0.1, bh = H * 0.065;
  const tg = x.createLinearGradient(0, by, 0, by + bh);
  tg.addColorStop(0, T.col); tg.addColorStop(1, T.col2);
  x.fillStyle = tg; x.fillRect(W * 0.1, by, W * 0.8, bh);
  x.fillStyle = '#1a1020'; x.font = `900 ${W * 0.06}px ${FONT_U}`;
  x.fillText(`${T.name.toUpperCase()} PACK · 5 CARDS`, W / 2, by + bh * 0.72);
  x.fillStyle = 'rgba(255,255,255,0.7)'; x.font = `700 ${W * 0.035}px ${FONT_U}`;
  x.fillText(F.tag.toUpperCase(), W / 2, by + bh + H * 0.04);
  for (const [y0, y1] of [[0, cr], [H - cr, H]]) {
    const cg = x.createLinearGradient(0, y0, 0, y1);
    cg.addColorStop(0, T.col2); cg.addColorStop(0.5, T.col); cg.addColorStop(1, T.col2);
    x.fillStyle = cg; x.fillRect(0, y0, W, y1 - y0);
    x.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < W; i += W / 48) x.fillRect(i, y0, W / 140, y1 - y0);
  }
  x.textAlign = 'left';
  if (flatEdges) { x.globalCompositeOperation = 'destination-in'; x.fillStyle = '#000'; rrect(x, 0, 0, W, H, W * 0.03); x.fill(); x.globalCompositeOperation = 'source-over'; }
}
function packMaps(fam, tier, art) {
  const W = 512, H = 816;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  drawPackFront(cv.getContext('2d'), W, H, fam, tier, false, art);
  const bump = document.createElement('canvas'); bump.width = W / 2; bump.height = H / 2;
  const b = bump.getContext('2d');
  b.fillStyle = '#000'; b.fillRect(0, 0, W / 2, H / 2);
  b.fillStyle = '#fff'; b.textAlign = 'center';
  b.save(); b.scale(0.5, 0.5);
  drawSigil(b, W / 2, H * CRIMP + H * 0.075, W / 520);
  b.font = `900 ${W * 0.085}px ${FONT_D}`; b.fillText('MYTHIC ARMIES', W / 2, H * CRIMP + H * 0.165);
  b.strokeStyle = '#888'; b.lineWidth = 6;
  b.beginPath(); b.arc(W / 2, H * 0.27 + W * 0.38, W * 0.38, Math.PI, 0); b.stroke();
  for (let i = 0; i < W; i += W / 48) { b.fillStyle = '#fff'; b.fillRect(i, 0, W / 100, H * CRIMP); b.fillRect(i, H * (1 - CRIMP), W / 100, H * CRIMP); }
  b.restore();
  const rm = document.createElement('canvas'); rm.width = 64; rm.height = 102;
  const r = rm.getContext('2d');
  r.fillStyle = 'rgb(0,150,90)'; r.fillRect(0, 0, 64, 102);
  r.fillStyle = 'rgb(0,60,240)'; r.fillRect(0, 0, 64, 102 * CRIMP); r.fillRect(0, 102 * (1 - CRIMP), 64, 102 * CRIMP);
  r.fillRect(0, 102 * 0.66, 64, 102 * 0.08);
  r.fillStyle = 'rgb(0,80,200)'; r.beginPath(); r.arc(32, 102 * 0.27 + 24, 26, Math.PI, 0); r.lineTo(56, 102 * 0.67); r.lineTo(8, 102 * 0.67); r.fill();
  r.fillStyle = 'rgb(0,120,140)'; r.fillRect(10, 102 * 0.3, 44, 102 * 0.33);
  const tex = c => { const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t; };
  const map = tex(cv); map.encoding = THREE.sRGBEncoding;
  return { map, bump: tex(bump), rough: tex(rm) };
}
function packBackCanvas(fam, tier) {
  const W = 256, H = 408, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), st = FAM_STYLE[fam], T = TIER[tier];
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, st[1]); g.addColorStop(1, st[2]);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.globalAlpha = 0.15; drawSigil(x, W / 2, H / 2, 1.4); x.globalAlpha = 1;
  x.fillStyle = '#fff4dc'; x.textAlign = 'center'; x.font = `900 18px ${FONT_D}`;
  x.fillText('MYTHIC ARMIES', W / 2, H * 0.2);
  x.font = `700 12px ${FONT_U}`; x.fillStyle = 'rgba(255,255,255,0.75)';
  ['Contains 5 different cards.', `${T.name} odds. ${T.note}`, 'Six realms. 180 characters in the', 'prototype set, 1,000+ planned.'].forEach((l, i) => x.fillText(l, W / 2, H * 0.32 + i * 18));
  for (let i = 0; i < 24; i++) { x.fillStyle = '#fff'; x.fillRect(W / 2 - 50 + i * 4.2, H * 0.72, i % 3 ? 2 : 3, 34); }
  for (const [y0, y1] of [[0, H * CRIMP], [H * (1 - CRIMP), H]]) { x.fillStyle = T.col2; x.fillRect(0, y0, W, y1 - y0); x.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < W; i += W / 48) x.fillRect(i, y0, 2, y1 - y0); }
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding;
  return t;
}
let ENV = null;
function envMap() {
  if (ENV) return ENV;
  const pm = new THREE.PMREMGenerator(GFX.r);
  const sc = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 10), new THREE.MeshBasicMaterial({ map: gradientTexture(['#ffffff', '#8a7ac8', '#2a1a4a', '#100818']), side: THREE.BackSide }));
  sc.add(sky);
  const pl = (c, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m); };
  pl(0xffffff, -5, 5, 5, 4, 2); pl(0xffd090, 6, 2, 3, 2, 6); pl(0x80e0ff, -6, -1, -3, 3, 5); pl(0xff90e0, 3, -4, 5, 5, 1.5);
  ENV = pm.fromScene(sc, 0.04).texture;
  pm.dispose();
  sky.geometry.dispose();
  return ENV;
}
function zig(u) { return (Math.sin(u * 90) * 0.012 + Math.sin(u * 37 + 1) * 0.008); }
function bulge(u, t) {
  if (t < CRIMP || t > 1 - CRIMP) return 0.012 + (Math.sin(u * 300) > 0 ? 0.006 : 0);
  const k = (t - CRIMP) / (1 - 2 * CRIMP);
  return 0.012 + 0.17 * Math.pow(Math.sin(Math.PI * u), 0.5) * Math.pow(Math.sin(Math.PI * k), 0.4);
}
/* a patch of the pack surface between u0..u1 (width) and t0..t1 (height); side +1 front, -1 back */
function packSheet(u0, u1, t0, t1, su, sv, side, ox, oy) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= sv; j++) for (let i = 0; i <= su; i++) {
    const u = u0 + (u1 - u0) * i / su;
    let t = t0 + (t1 - t0) * j / sv;
    if ((j === 0 && t0 === TEAR) || (j === sv && t1 === TEAR)) t += zig(u);
    pos.push((u - 0.5) * PW - (ox || 0), (t - 0.5) * PH - (oy || 0), side * bulge(u, t));
    uv.push(side > 0 ? u : 1 - u, t);
  }
  for (let j = 0; j < sv; j++) for (let i = 0; i < su; i++) {
    const a = j * (su + 1) + i, b = a + 1, c = a + su + 1, d = c + 1;
    if (side > 0) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const SHEEN = { uTime: { value: 0 } };
function packMaterials(fam, tier, art) {
  const mp = packMaps(fam, tier, art);
  const front = new THREE.MeshStandardMaterial({ map: mp.map, bumpMap: mp.bump, bumpScale: 0.025, roughnessMap: mp.rough, metalnessMap: mp.rough, roughness: 1, metalness: 1, envMap: envMap(), envMapIntensity: 0.9 });
  front.onBeforeCompile = sh => {
    sh.uniforms.uTime = SHEEN.uTime;
    sh.fragmentShader = 'uniform float uTime;\n' + sh.fragmentShader.replace('#include <dithering_fragment>',
      '#include <dithering_fragment>\n  float bandP = fract((vUv.x * 0.7 + vUv.y) * 0.6 - uTime * 0.12);\n  float band = pow(max(0.0, 1.0 - abs(bandP - 0.5) * 7.0), 2.0);\n  vec3 rb = 0.5 + 0.5 * cos(6.2831 * (vUv.y * 1.5 + uTime * 0.05 + vec3(0.0, 0.33, 0.67)));\n  gl_FragColor.rgb += band * metalnessFactor * 0.55 * mix(vec3(1.0), rb, 0.6);');
  };
  const back = new THREE.MeshStandardMaterial({ map: packBackCanvas(fam, tier), roughness: 0.45, metalness: 0.55, envMap: envMap(), envMapIntensity: 1.0 });
  return { front, back, dispose() { for (const m of [front, back]) { if (m.map) m.map.dispose(); if (m.bumpMap) m.bumpMap.dispose(); if (m.roughnessMap) m.roughnessMap.dispose(); m.dispose(); } } };
}
function buildPack(mats) {
  const g = new THREE.Group(), geos = [];
  const add = (geo, mat, parent) => { geos.push(geo); const m = new THREE.Mesh(geo, mat); (parent || g).add(m); return m; };
  const body = new THREE.Group(); g.add(body);
  add(packSheet(0, 1, 0, TEAR, 18, 26, 1), mats.front, body);
  add(packSheet(0, 1, 0, TEAR, 10, 14, -1), mats.back, body);
  const strip = new THREE.Group(); g.add(strip);
  const pieces = [], N = 8;
  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N, ox = ((u0 + u1) / 2 - 0.5) * PW, oy = (TEAR - 0.5) * PH;
    const pc = new THREE.Group(); pc.position.set(ox, oy, 0);
    add(packSheet(u0, u1, TEAR, 1, 3, 4, 1, ox, oy), mats.front, pc);
    add(packSheet(u0, u1, TEAR, 1, 2, 2, -1, ox, oy), mats.back, pc);
    strip.add(pc); pieces.push(pc);
  }
  return { g, body, strip, pieces, dispose() { geos.forEach(x => x.dispose()); } };
}

/* ---------- particles (one pooled Points object per system) ---------- */
const FX_TEX = {};
function fxTexture(kind) {
  if (FX_TEX[kind]) return FX_TEX[kind];
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const x = cv.getContext('2d');
  x.translate(32, 32);
  if (kind === 'leaves') { x.fillStyle = '#fff'; x.beginPath(); x.moveTo(0, -28); x.bezierCurveTo(22, -14, 18, 16, 0, 28); x.bezierCurveTo(-18, 16, -22, -14, 0, -28); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -24); x.lineTo(0, 26); x.stroke(); }
  else if (kind === 'bubbles') { x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 24, 0, 7); x.stroke(); x.fillStyle = 'rgba(255,255,255,0.25)'; x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(-9, -9, 5, 0, 7); x.fill(); }
  else if (kind === 'stars') { x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = i % 2 ? 6 : 30; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.fill(); const g = x.createRadialGradient(0, 0, 0, 0, 0, 14); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(-32, -32, 64, 64); }
  else if (kind === 'sparks') { const g = x.createLinearGradient(0, -30, 0, 30); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(-4, -30, 8, 60); const g2 = x.createRadialGradient(0, 0, 0, 0, 0, 12); g2.addColorStop(0, '#fff'); g2.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g2; x.fillRect(-32, -32, 64, 64); }
  else { const g = x.createRadialGradient(0, 0, 0, 0, 0, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(kind === 'wisps' ? 0.5 : 0.3, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(-32, -32, 64, 64); }
  const t = new THREE.CanvasTexture(cv);
  return (FX_TEX[kind] = t);
}
const FX_VS = `attribute float aSize; attribute float aAlpha; attribute vec3 aColor; attribute float aRot; varying float vA; varying vec3 vC; varying float vR; uniform float uScale;
void main(){ vA = aAlpha; vC = aColor; vR = aRot; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`;
const FX_FS = `uniform sampler2D map; varying float vA; varying vec3 vC; varying float vR;
void main(){ vec2 p = gl_PointCoord - 0.5; float c = cos(vR), s = sin(vR); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5; vec4 t = texture2D(map, p); gl_FragColor = vec4(vC * t.rgb, t.a * vA); }`;
class Particles {
  constructor(n, kind, additive) {
    this.n = n; this.kind = kind;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.c = new Float32Array(n * 3);
    this.s = new Float32Array(n); this.a = new Float32Array(n); this.life = new Float32Array(n); this.max = new Float32Array(n); this.rot = new Float32Array(n); this.spin = new Float32Array(n); this.size0 = new Float32Array(n);
    this.grav = new Float32Array(n); this.drag = 0.98;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.c, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.s, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.a, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aRot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({ uniforms: { map: { value: fxTexture(kind) }, uScale: { value: 6 } }, vertexShader: FX_VS, fragmentShader: FX_FS, transparent: true, depthWrite: false, blending: additive === false ? THREE.NormalBlending : THREE.AdditiveBlending });
    this.pts = new THREE.Points(g, this.mat);
    this.pts.frustumCulled = false;
    this.next = 0;
  }
  emit(x, y, z, vx, vy, vz, col, size, life, grav, spin) {
    const i = this.next; this.next = (this.next + 1) % this.n;
    this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z;
    this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
    const c = lin(col); this.c[i * 3] = c.r; this.c[i * 3 + 1] = c.g; this.c[i * 3 + 2] = c.b;
    this.size0[i] = size; this.s[i] = size; this.life[i] = life; this.max[i] = life; this.grav[i] = grav || 0; this.rot[i] = Math.random() * 6; this.spin[i] = spin || 0;
  }
  update(dt) {
    this.mat.uniforms.uScale.value = 5.5 * (this.k || 1) * GFX.h / 720 * GFX.dpr;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.a[i] = 0; continue; }
      this.life[i] -= dt;
      const k = this.life[i] / this.max[i];
      this.v[i * 3 + 1] += this.grav[i] * dt;
      for (let j = 0; j < 3; j++) { this.v[i * 3 + j] *= this.drag; this.p[i * 3 + j] += this.v[i * 3 + j] * dt; }
      this.rot[i] += this.spin[i] * dt;
      this.a[i] = Math.min(1, k * 3) * Math.min(1, (1 - k) * 8);
      this.s[i] = this.size0[i] * (0.6 + 0.4 * k);
    }
    const at = this.geo.attributes;
    at.position.needsUpdate = at.aAlpha.needsUpdate = at.aSize.needsUpdate = at.aRot.needsUpdate = at.aColor.needsUpdate = true;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}
const FX_COLORS = { motes: ['#ffffff', '#fff2c0', '#c8e0ff', '#ffd0f0'], embers: ['#ff7a1a', '#ffb43a', '#ffd86a', '#ff4a10'], leaves: ['#8ae05a', '#5fbf4a', '#d8ff6a', '#ffe36a'], sparks: ['#ffd27a', '#ffffff', '#7fe0ff', '#ffb04a'],
  bubbles: ['#bff6ff', '#7affff', '#ffffff', '#5ff2ff'], stars: ['#fff2a8', '#ffffff', '#a8f0ff', '#ffd0ff'], wisps: ['#7dffb8', '#c08aff', '#b8ffde', '#8a6aff'] };
function fxEmit(P, kind, mode, x, y, z, n) {
  const cols = FX_COLORS[kind];
  for (let i = 0; i < n; i++) {
    const c = cols[i % cols.length], r = Math.random;
    if (mode === 'burst') {
      const a = r() * Math.PI * 2, sp = 1.5 + r() * 3.5;
      const vy = kind === 'leaves' ? 1 + r() * 2 : kind === 'bubbles' ? 2 + r() * 2 : Math.sin(a) * sp + 1.5;
      P.emit(x + (r() - 0.5) * PW, y, z, Math.cos(a) * sp, vy, (r() - 0.2) * 2.5, c, kind === 'sparks' ? 14 + r() * 10 : 18 + r() * 22, 1.2 + r() * 1.4, kind === 'embers' ? 0.6 : kind === 'leaves' ? -1.4 : kind === 'bubbles' ? 1.2 : kind === 'sparks' ? -5 : 0.2, kind === 'leaves' ? (r() - 0.5) * 8 : 0);
    } else {
      const px = (r() - 0.5) * 9, py = -3 + r() * 1, pz = -2 + r() * 3;
      if (kind === 'leaves') P.emit(px, 4 + r(), pz, (r() - 0.5) * 0.6, -0.6 - r() * 0.4, 0, c, 16 + r() * 14, 7, 0, (r() - 0.5) * 3);
      else if (kind === 'stars') P.emit(px, (r() - 0.5) * 6, pz, 0, 0.05, 0, c, 10 + r() * 16, 3 + r() * 3, 0, 0.3);
      else if (kind === 'wisps') P.emit(px, py, pz, (r() - 0.5) * 0.3, 0.4 + r() * 0.4, 0, c, 40 + r() * 40, 5 + r() * 3, 0, 0);
      else if (kind === 'bubbles') P.emit(px, py, pz, (r() - 0.5) * 0.2, 0.7 + r() * 0.6, 0, c, 10 + r() * 16, 6, 0.05, 0);
      else if (kind === 'sparks') P.emit(px, py, pz, (r() - 0.5) * 0.3, 0.3 + r() * 0.4, 0, r() < 0.5 ? '#a89a8a' : c, 12 + r() * 20, 5, 0, 0);
      else P.emit(px, py, pz, (r() - 0.5) * 0.4, 0.8 + r() * 0.8, 0, c, 8 + r() * 12, 4 + r() * 2, 0.1, 0);
    }
  }
}
function glowTexture() {
  if (FX_TEX.glow) return FX_TEX.glow;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const x = cv.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return (FX_TEX.glow = new THREE.CanvasTexture(cv));
}
function raysTexture() {
  if (FX_TEX.rays) return FX_TEX.rays;
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const x = cv.getContext('2d'); x.translate(128, 128);
  for (let i = 0; i < 18; i++) { x.rotate(Math.PI * 2 / 18); const g = x.createLinearGradient(0, 0, 128, 0); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(128, -9 - (i % 3) * 4); x.lineTo(128, 9 + (i % 3) * 4); x.fill(); }
  return (FX_TEX.rays = new THREE.CanvasTexture(cv));
}

/* ---------- card meshes with a holographic face shader ---------- */
const CARD_VS = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
const CARD_FS = `uniform sampler2D map; uniform float uHolo; uniform float uTime; uniform vec2 uTilt; uniform float uBright; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vec4 c = texture2D(map, vUv);
  if (c.a < 0.5) discard;
  float inArt = step(0.064, vUv.x) * step(vUv.x, 0.936) * step(0.469, vUv.y) * step(vUv.y, 0.869);
  float inText = step(0.068, vUv.x) * step(vUv.x, 0.932) * step(0.105, vUv.y) * step(vUv.y, 0.415);
  float mask = mix(1.0, 0.22, inArt) * (1.0 - inText * 0.92);
  vec3 v = normalize(vV);
  float facing = dot(normalize(vN), v);
  float t = vUv.x * 1.1 + vUv.y * 0.7 + uTilt.x * 1.8 + uTilt.y * 1.3 + (1.0 - facing) * 2.0;
  vec3 rb = 0.5 + 0.5 * cos(6.2831 * (t + vec3(0.0, 0.33, 0.67)));
  float band = pow(max(0.0, 1.0 - abs(fract(t * 0.45 + uTime * 0.04) - 0.5) * 3.2), 3.0);
  vec3 col = c.rgb * uBright + rb * uHolo * mask * (0.16 + band * 0.55);
  vec2 cell = floor(vUv * vec2(70.0, 98.0));
  float sp = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
  col += step(0.975, sp) * uHolo * mask * max(0.0, sin(uTime * 2.5 + sp * 60.0 + uTilt.x * 6.0)) * 0.9;
  gl_FragColor = vec4(col, 1.0);
}`;
const CARD_GEO = { g: null };
function cardGeo() { return CARD_GEO.g || (CARD_GEO.g = new THREE.PlaneGeometry(1.4, 1.96)); }
let BACK_MAT = null;
function makeCard3D(faceTex, holo) {
  const g = new THREE.Group();
  const face = new THREE.Mesh(cardGeo(), new THREE.ShaderMaterial({ uniforms: { map: { value: faceTex }, uHolo: { value: holo }, uTime: SHEEN.uTime, uTilt: { value: new THREE.Vector2() }, uBright: { value: 1 } }, vertexShader: CARD_VS, fragmentShader: CARD_FS }));
  if (!BACK_MAT) BACK_MAT = new THREE.MeshBasicMaterial({ map: cardBackTexture(), alphaTest: 0.5, toneMapped: false });
  const back = new THREE.Mesh(cardGeo(), BACK_MAT);
  back.rotation.y = Math.PI;
  g.add(face, back);
  g.userData = { face, back };
  return { g };
}
async function faceTexture(id, variant) {
  const img = await getArt(id);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 717;
  drawCard(cv.getContext('2d'), 512, CHAR[id], { art: img, variant });
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4;
  return t;
}
function holoFor(r, variant) { return variant === 'radiant' ? 1.0 : [0, 0, 0.35, 0.55, 0.75, 1.0][r]; }

/* ---------- the opening scene ---------- */
function makeOpenScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 7.5);
  const amb = new THREE.HemisphereLight(0xffffff, 0x302040, 0.7);
  const key = new THREE.DirectionalLight(0xfff0e0, 1.3); key.position.set(-3, 4, 6);
  const rim = new THREE.DirectionalLight(0x8af0ff, 1.4); rim.position.set(4, 2, -4);
  const spot = new THREE.PointLight(0xffffff, 1.0, 14); spot.position.set(2, 2, 4);
  scene.add(amb, key, rim, spot);
  const bgMat = new THREE.MeshBasicMaterial({ map: gradientTexture(['#05040e', '#1a1240', '#05040e']), depthWrite: false, toneMapped: false });
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(60, 34), bgMat); bg.position.z = -12; scene.add(bg);
  const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.22, toneMapped: false }));
  floorGlow.position.set(0, -0.5, -6); scene.add(floorGlow);
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: raysTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: false }));
  rays.position.z = -1.2; scene.add(rays);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: false }));
  scene.add(glow);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, side: THREE.DoubleSide, toneMapped: false }));
  scene.add(ring);
  const O = { scene, camera, live: true, amb, key, rim, spot, bgMat, floorGlow, rays, glow, ring, P: null, burst: null, pack: null, mats: null, cards: [], state: 'none', tilt: new THREE.Vector2(), ptr: { x: 0, y: 0 }, rot: { x: 0, y: 0, vx: 0, vy: 0 }, dist: 7.5, viewH: 4, viewW: 4 };
  O.resize = (w, h) => {
    camera.aspect = w / h;
    const vfov = camera.fov * Math.PI / 180;
    const needH = 5.2, needW = 3.6;
    O.dist = Math.max(needH / 2 / Math.tan(vfov / 2), needW / 2 / Math.tan(vfov / 2) / camera.aspect);
    camera.position.z = O.dist + (O.push || 0);
    camera.updateProjectionMatrix();
    O.viewH = 2 * Math.tan(vfov / 2) * O.dist; O.viewW = O.viewH * camera.aspect;
  };
  O.update = (dt, t) => {
    SHEEN.uTime.value = t;
    runTweens(dt);
    camera.position.z = O.dist + (O.push || 0);
    camera.position.x = O.shake ? (Math.random() - 0.5) * O.shake : 0;
    camera.position.y = O.shake ? (Math.random() - 0.5) * O.shake : 0;
    if (O.P) {
      if (Math.random() < dt * (O.fxRate || 10)) fxEmit(O.P, O.fx, 'ambient', 0, 0, 0, 1);
      O.P.update(dt); O.burst.update(dt);
    }
    rays.rotation.z += dt * 0.25;
    if (O.pack && (O.state === 'idle' || O.state === 'tearing')) {
      const R = O.rot;
      if (!O.dragging) { R.y += (Math.sin(t * 0.6) * 0.18 - R.y) * Math.min(1, dt * 2); R.x += (Math.sin(t * 0.45) * 0.06 - R.x) * Math.min(1, dt * 2); }
      O.pack.g.rotation.set(R.x, R.y, 0);
      O.pack.g.position.y = Math.sin(t * 1.2) * 0.05 + (O.packY || 0);
      if (O.hold && O.state !== 'done') { O.tearDir = O.tearDir || 1; setTear(O, O.tear + dt * 1.1); }
      spot.position.x = Math.sin(t * 0.7) * 3;
    }
    if (O.strip) {
      const s = O.strip;
      s.vy -= 9 * dt; s.g.position.x += s.vx * dt; s.g.position.y += s.vy * dt; s.g.position.z += s.vz * dt; s.g.rotation.z += s.spin * dt; s.g.rotation.x += s.spin * 0.6 * dt;
      if (s.g.position.y < -10) { s.g.visible = false; O.strip = null; }
    }
    const cur = O.cards[O.ci];
    if (cur && (O.state === 'reveal' || O.state === 'shown')) {
      O.tilt.x += (O.ptr.x * 0.35 - O.tilt.x) * Math.min(1, dt * 6);
      O.tilt.y += (O.ptr.y * 0.25 - O.tilt.y) * Math.min(1, dt * 6);
      const base = O.state === 'shown' ? 0 : Math.PI;
      cur.g.rotation.set(-O.tilt.y + Math.sin(t * 1.3) * 0.03, base + O.tilt.x + Math.sin(t * 0.9) * 0.04, 0);
      cur.g.userData.face.material.uniforms.uTilt.value.set(O.tilt.x, O.tilt.y);
      if (O.preGlow) { glow.material.opacity = O.preGlow * 1.7 * (0.7 + 0.3 * Math.sin(t * 5)); const gs = O.glowS || 1, pu = 1 + 0.06 * Math.sin(t * 5); glow.scale.set(gs * 0.95 * pu, gs * 1.2 * pu, 1); }
    }
    if (O.hero) { animModel(O.hero, t, 'idle', 0); O.hero.rotation.y = Math.sin(t * 0.4) * 0.4; }
  };
  return O;
}
function setTear(O, v) {
  const p = clamp(v, 0, 1);
  if (p > O.tear + 0.025) { SFX.tearBit(p); O.tearSnd = p; vibrate(5); }
  O.tear = Math.max(O.tear, p);
  const N = O.pack.pieces.length;
  O.pack.pieces.forEach((pc, i) => {
    const idx = O.tearDir < 0 ? N - 1 - i : i;
    const k = clamp(O.tear * (N + 1.5) - idx, 0, 1);
    pc.rotation.x = -k * 0.55; pc.rotation.z = (O.tearDir < 0 ? -1 : 1) * k * 0.12; pc.position.z = k * 0.12;
  });
  const m = $('#tearMeter i'); if (m) m.style.width = (O.tear * 100) + '%';
  if (O.tear >= 1 && O.state === 'tearing') tornOpen(O);
}

/* entry point: open a pack item from the inventory */
async function openPack(item, preset) {
  if (!item) return;
  const res = preset || openPackItem(item);
  refreshCurrency();
  go('open');
  const O = SC.all.open;
  O.res = res; O.item = item; O.fam = item.family; O.tier = item.tier;
  O.fx = FAMILY[item.family].fx; O.fxRate = 10;
  cleanupOpen(O);
  const s = $('#s-open');
  s.innerHTML = `<div class="open-top"><button class="back" id="openBack" aria-label="Leave">‹</button><span class="tag" style="padding:6px 12px;font-size:12px;background:rgba(10,8,24,.75)">${FAMILY[item.family].name} · ${TIER[item.tier].name}</span></div>
    <div class="reveal-name" id="revName"></div><div class="big-banner" id="banner"></div>
    <div class="tear-meter" id="tearMeter"><i></i></div><div class="open-hint" id="openHint">Preparing your pack…</div>`;
  $('#openBack').onclick = () => { SFX.back(); go('packs'); };
  const st = FAM_STYLE[item.family];
  O.bgMat.map.dispose();
  O.bgMat.map = gradientTexture(['#020108', st[2], mix(st[1], '#000000', 0.35), st[2], '#020108']); O.bgMat.needsUpdate = true;
  O.floorGlow.material.color.set(st[0]);
  O.rim.color.set(st[0]);
  O.P = new Particles(260, O.fx, O.fx === 'leaves' ? false : true);
  O.burst = new Particles(300, 'motes');
  O.scene.add(O.P.pts, O.burst.pts);
  for (let i = 0; i < 40; i++) { fxEmit(O.P, O.fx, 'ambient', 0, 0, 0, 1); O.P.life[i] *= Math.random(); }
  const feat = CHARS.filter(c => c.fac === FAMILY[item.family].fac && c.r === 4)[0];
  const art = await getArt(feat.id);
  if (UI.screen !== 'open' || O.res !== res) return;
  O.mats = packMaterials(item.family, item.tier, art);
  O.pack = buildPack(O.mats);
  O.scene.add(O.pack.g);
  O.tear = 0; O.tearDir = 0; O.rot = { x: 0, y: 0 }; O.packY = 0;
  O.faces = Promise.all(res.reveal.map(rv => faceTexture(rv.c.id, rv.variant)));
  O.state = 'intro';
  SFX.whoosh();
  await tween(0.7, k => { O.pack.g.position.y = (1 - k) * 6; O.pack.g.rotation.z = (1 - k) * 0.6; }, easeBack);
  O.state = 'idle';
  $('#openHint').innerHTML = IS_TOUCH ? 'Swipe across the top seam to tear · or press and hold' : 'Drag across the top seam to tear it open · or hold the mouse button';
  guideCheck();
}
function cleanupOpen(O) {
  TWEENS.length = 0;
  for (const c of O.cards) { O.scene.remove(c.g); c.g.userData.face.material.uniforms.map.value.dispose(); c.g.userData.face.material.dispose(); }
  O.cards = [];
  if (O.pack) { O.scene.remove(O.pack.g); O.pack.dispose(); O.pack = null; }
  if (O.mats) { O.mats.dispose(); O.mats = null; }
  if (O.P) { O.scene.remove(O.P.pts, O.burst.pts); O.P.dispose(); O.burst.dispose(); O.P = null; }
  if (O.hero) { releaseModel(O.hero); O.hero = null; }
  if (O.boxCleanup) { O.boxCleanup(); O.boxCleanup = null; }
  O.strip = null; O.hold = false; O.dragging = false; O.preGlow = 0; O.push = 0; O.shake = 0;
  O.rays.material.opacity = 0; O.glow.material.opacity = 0; O.ring.material.opacity = 0; O.rays.position.x = 0; O.heroWide = false;
  O.amb.intensity = 0.7;
  O.state = 'none';
}
OPEN.leave = () => { const O = SC.all.open; if (O) cleanupOpen(O); };

function openPointer(O) {
  const cv = $('#gl'), ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  let down = null, holdTimer = 0;
  const hit = e => {
    if (!O.pack) return null;
    v2.set(e.clientX / GFX.w * 2 - 1, -(e.clientY / GFX.h) * 2 + 1);
    ray.setFromCamera(v2, O.camera);
    const hs = ray.intersectObject(O.pack.g, true);
    return hs.length ? hs[0] : null;
  };
  cv.addEventListener('pointerdown', e => {
    if (UI.screen !== 'open') return;
    O.ptr.x = e.clientX / GFX.w * 2 - 1; O.ptr.y = e.clientY / GFX.h * 2 - 1;
    if (O.state === 'idle') {
      const h = hit(e);
      down = { x: e.clientX, y: e.clientY, t: performance.now(), tear: !!(h && h.uv && h.uv.y > TEAR - 0.12), onPack: !!h, lastX: e.clientX };
      if (down.tear) { O.state = 'tearing'; O.tearStartX = e.clientX; }
      O.dragging = !down.tear;
      clearTimeout(holdTimer);
      if (h) holdTimer = setTimeout(() => { if (down && Math.hypot(down.lastX - down.x, (down.lastY || down.y) - down.y) < 12) { O.hold = true; if (O.state === 'idle') O.state = 'tearing'; } }, 380);
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    } else if (O.state === 'reveal') flipCurrent(O);
    else if (O.state === 'shown') nextCard(O);
    else if (O.state === 'box' && O.boxTap) O.boxTap();
  });
  cv.addEventListener('pointermove', e => {
    if (UI.screen !== 'open') return;
    O.ptr.x = e.clientX / GFX.w * 2 - 1; O.ptr.y = e.clientY / GFX.h * 2 - 1;
    if (!down) return;
    const dx = e.clientX - down.lastX, dy = e.clientY - (down.lastY == null ? down.y : down.lastY);
    down.lastX = e.clientX; down.lastY = e.clientY;
    if (O.state === 'tearing' && !O.hold) {
      const total = e.clientX - O.tearStartX;
      if (!O.tearDir && Math.abs(total) > 6) O.tearDir = Math.sign(total);
      const packPx = GFX.w * (PW / O.viewW) * 0.9;
      if (O.tearDir) setTear(O, Math.abs(total) / packPx * (Math.sign(total) === O.tearDir ? 1 : 0));
    } else if (O.dragging && O.state === 'idle') {
      O.rot.y = clamp(O.rot.y + dx * 0.012, -1.3, 1.3);
      O.rot.x = clamp(O.rot.x + dy * 0.006, -0.5, 0.5);
    }
  });
  const up = () => {
    clearTimeout(holdTimer);
    down = null; O.dragging = false; O.hold = false;
    if (O.state === 'tearing' && O.tear < 1) { O.state = 'idle'; }
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  window.addEventListener('keydown', e => {
    if (UI.screen !== 'open' || e.repeat) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (O.state === 'idle') { O.state = 'tearing'; O.hold = true; }
      else if (O.state === 'reveal') flipCurrent(O);
      else if (O.state === 'shown') nextCard(O);
    }
  });
  window.addEventListener('keyup', e => { if ((e.key === ' ' || e.key === 'Enter') && O.hold) { O.hold = false; if (O.state === 'tearing' && O.tear < 1) O.state = 'idle'; } });
}

async function tornOpen(O) {
  O.state = 'torn'; O.hold = false;
  SFX.rip(); vibrate(30);
  $('#openHint').style.opacity = 0; $('#tearMeter').style.opacity = 0;
  const sp = O.pack.strip;
  const wp = new THREE.Vector3(); sp.getWorldPosition(wp);
  O.pack.g.remove(sp); O.scene.add(sp);
  sp.position.copy(O.pack.g.position); sp.rotation.copy(O.pack.g.rotation);
  O.strip = { g: sp, vx: (O.tearDir || 1) * 3.5, vy: 5, vz: 2.5, spin: (O.tearDir || 1) * -4 };
  fxEmit(O.burst, O.fx, 'burst', 0, (TEAR - 0.5) * PH, 0.3, 70);
  fxEmit(O.P, O.fx, 'burst', 0, (TEAR - 0.5) * PH, 0.3, 50);
  flash(0.35, 400, FAM_STYLE[O.fam][0]);
  O.fxRate = 25;
  const faces = await O.faces;
  if (UI.screen !== 'open') return;
  O.cards = O.res.reveal.map((rv, i) => {
    const cd = makeCard3D(faces[i], holoFor(rv.r, rv.variant));
    cd.g.rotation.set(O.pack.g.rotation.x, Math.PI + O.pack.g.rotation.y, 0);
    cd.g.position.set(O.pack.g.position.x, O.pack.g.position.y - 0.3, -0.02 + i * 0.005);
    cd.g.scale.setScalar(1.35);
    O.pack.g.add(cd.g);
    cd.g.position.set(0, -0.4, 0.0 - (4 - i) * 0.008);
    cd.g.rotation.set(0, Math.PI, 0);
    return Object.assign(cd, rv);
  });
  await tween(0.35, k => { O.pack.g.rotation.x *= 0.85; O.pack.g.rotation.y *= 0.85; }, easeOut);
  SFX.slide();
  await tween(0.9, k => {
    O.cards.forEach((cd, i) => { const kk = clamp(k * 1.4 - (4 - i) * 0.08, 0, 1); cd.g.position.y = -0.4 + easeOut(kk) * 2.0; });
    O.pack.body.position.y = -easeIn(k) * 0.4;
  });
  const cards = O.cards;
  cards.forEach(cd => { const wpos = new THREE.Vector3(); cd.g.getWorldPosition(wpos); O.pack.g.remove(cd.g); O.scene.add(cd.g); cd.g.position.copy(wpos); cd.g.rotation.set(0, Math.PI, 0); });
  const pk = O.pack.g;
  SFX.whoosh();
  await tween(0.6, k => {
    pk.position.y = -easeIn(k) * 8; pk.rotation.z = k * 0.4;
    cards.forEach((cd, i) => { cd.g.position.y = lerp(cd.g.position.y, 0.1 + (4 - i) * 0.02, k * 0.3); cd.g.position.z = lerp(cd.g.position.z, (4 - i) * -0.03, k * 0.3); cd.g.rotation.z = lerp(cd.g.rotation.z, (i - 2) * 0.03, k * 0.3); });
  });
  O.scene.remove(pk); O.pack.dispose(); O.pack = null;
  O.fxRate = 8;
  O.ci = 0;
  presentCard(O);
}
const ROW = (O, i) => { const narrow = O.viewW < O.viewH; const sp = narrow ? O.viewW / 5.4 : Math.min(1.25, O.viewW / 7); return new THREE.Vector3((i - 2) * sp, -O.viewH / 2 + (narrow ? 0.95 : 0.85), 0.6); };
async function presentCard(O) {
  const cd = O.cards[O.ci];
  if (!cd) return summary(O);
  O.state = 'moving';
  O.cards.forEach((c, i) => { c.g.visible = i <= O.ci; });
  const rarity = cd.r;
  const targetScale = Math.min(O.viewH * 0.56 / 1.96, O.viewW * 0.78 / 1.4);
  O.cardY = O.viewH * 0.085;
  const p0 = cd.g.position.clone(), s0 = cd.g.scale.x;
  await tween(0.45, k => { cd.g.position.lerpVectors(p0, new THREE.Vector3(0, O.cardY, 0.8), k); cd.g.scale.setScalar(lerp(s0, targetScale, k)); }, easeOut);
  O.preGlow = 0;
  if (rarity >= 2) {
    O.glow.position.set(0, O.cardY, 0.5); O.glow.material.color.set(RAR[rarity].col); O.glow.scale.setScalar(1);
    O.glowS = targetScale;
    O.preGlow = rarity === 2 ? 0.45 : rarity === 3 ? 0.7 : 1;
    SFX.shimmer(rarity);
    if (rarity >= 3) { O.rays.material.color.set(RAR[rarity].col); tween(0.8, k => { O.rays.material.opacity = k * (rarity >= 4 ? 0.35 : 0.18); }); }
  }
  O.state = 'reveal';
  O.tilt.set(0, 0);
  $('#revName').className = 'reveal-name';
  $('#openHint').style.opacity = 1;
  $('#openHint').textContent = `Card ${O.ci + 1} of 5 · tap to flip`;
}
async function flipCurrent(O) {
  const cd = O.cards[O.ci];
  if (!cd || O.state !== 'reveal') return;
  O.state = 'flipping';
  $('#openHint').style.opacity = 0;
  const r = cd.r, col = RAR[r].col;
  if (r >= 3) {
    const big = r >= 4;
    if (big) { tween(0.6, k => { O.amb.intensity = lerp(0.7, 0.15, k); O.key.intensity = lerp(1.3, 0.3, k); }); }
    SFX.riser(big ? 1.9 : 0.8);
    await tween(big ? 1.9 : 0.8, k => {
      O.shake = k * (big ? 0.06 : 0.03);
      O.push = -k * (big ? 1.4 : 0.8);
      O.rays.material.opacity = (big ? 0.35 : 0.18) + k * (big ? 0.5 : 0.25);
      O.rays.scale.setScalar(1 + k * (big ? 0.6 : 0.3));
      O.rays.material.color.set(r === 5 ? `hsl(${(k * 720) % 360},90%,70%)` : col);
      cd.g.position.y = O.cardY + k * 0.15;
      if (big && k > 0.35 && !O.hero) summonHero(O, cd);
      if (Math.random() < 0.6) fxEmit(O.burst, 'motes', 'burst', 0, -1.5, 0.5, 1);
    }, easeIn);
    O.shake = 0;
  }
  SFX.flip(r);
  const rot0 = cd.g.rotation.y;
  if (r >= 3) { flash(r >= 4 ? 0.95 : 0.6, r >= 4 ? 900 : 500, r === 5 ? '#ffe6fa' : '#fff6e0'); SFX.reveal(r); if (r >= 4) SFX.boom(); vibrate(r >= 4 ? [40, 30, 80] : 30); }
  O.state = 'flipping2';
  await tween(r >= 3 ? 0.35 : 0.45, k => { O.tilt.set(0, 0); cd.g.rotation.y = lerp(Math.PI, 0, k); cd.g.position.z = 0.8 + Math.sin(k * Math.PI) * 0.6; }, easeInOut);
  O.state = 'shown';
  if (r < 3) SFX.reveal(r);
  if (r >= 2) {
    fxEmit(O.burst, 'motes', 'burst', 0, 0, 1, 30 + r * 25);
    for (let i = 0; i < 20 + r * 20; i++) O.burst.emit(cd.g.position.x, cd.g.position.y, 0.9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, Math.random() * 2, r === 5 ? ['#ff8ae8', '#7af0ff', '#ffe36a'][i % 3] : col, 14 + Math.random() * 20, 1 + Math.random(), -1);
    O.ring.position.set(cd.g.position.x, cd.g.position.y, 0.6); O.ring.material.color.set(col);
    tween(0.9, k => { O.ring.scale.setScalar(0.5 + k * (2 + r)); O.ring.material.opacity = (1 - k) * 0.9; }, easeOut);
  }
  O.preGlow = 0;
  tween(0.5, k => { O.glow.material.opacity *= (1 - k); });
  if (r >= 4) {
    const b = $('#banner'); b.textContent = RAR[r].name.toUpperCase() + '!';
    b.style.color = col; b.style.textShadow = `0 0 30px ${col}, 0 4px 0 rgba(0,0,0,.5)`;
    b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
    tween(1.5, k => { O.amb.intensity = lerp(0.15, 0.7, k); O.key.intensity = lerp(0.3, 1.3, k); O.push = lerp(-1.4, -0.6, k); });
    if (O.heroWide) { const x0 = cd.g.position.x; tween(0.8, k => { cd.g.position.x = lerp(x0, -O.viewW * 0.14, k); O.rays.position.x = lerp(0, O.viewW * 0.2, k); }, easeInOut); }
  } else if (r === 3) tween(0.6, k => { O.push = lerp(-0.8, -0.3, k); });
  const rn = $('#revName');
  rn.innerHTML = `<span style="color:${col}">${RAR[r].name.toUpperCase()}${cd.variant === 'radiant' ? ' · RADIANT' : ''}</span><b>${esc(cd.c.name)}</b>${cd.isNew ? '<span class="newb">NEW!</span>' : `<span class="dupb">Duplicate · +${cd.ess} Essence</span>`}`;
  rn.className = 'reveal-name on';
  $('#openHint').style.opacity = 1;
  $('#openHint').textContent = O.ci < 4 ? 'Tap for the next card' : 'Tap to see your pull';
}
function summonHero(O, cd) {
  const m = makeModel(cd.c.id, { scale: 1 });
  const wide = O.viewW > O.viewH * 1.2;
  const h = m.userData.h, targetH = O.viewH * (wide ? 0.8 : 0.95);
  m.scale.setScalar(targetH / Math.max(h, m.userData.w * 0.8));
  const x = wide ? O.viewW * 0.27 : 0, y = wide ? -O.viewH * 0.42 : -O.viewH * 0.3;
  m.position.set(x, y, -2.4 - m.userData.w * m.scale.x * 0.55);
  m.rotation.y = wide ? -0.5 : 0.3;
  O.scene.add(m);
  O.hero = m; O.heroWide = wide;
  const s1 = m.scale.x;
  tween(1.0, k => { m.scale.setScalar(s1 * (0.3 + 0.7 * k)); m.position.y = y - (1 - k) * 2; }, easeBack);
  O.burst.emit(x, y + targetH * 0.5, -2, 0, 0, 0, RAR[cd.r].col, 500, 1.4, 0);
}
async function nextCard(O) {
  const cd = O.cards[O.ci];
  if (!cd || O.state !== 'shown') return;
  O.state = 'moving';
  $('#revName').className = 'reveal-name';
  SFX.whoosh();
  const p0 = cd.g.position.clone(), s0 = cd.g.scale.x, tgt = ROW(O, O.ci);
  const ts = O.viewW < O.viewH ? O.viewW / 5.6 / 1.4 : Math.min(0.62, O.viewW / 7 / 1.4 * 0.95);
  const r0 = cd.g.rotation.clone();
  tween(0.4, k => { O.rays.material.opacity *= (1 - k); O.push = lerp(O.push || 0, 0, k); O.rays.position.x *= (1 - k); });
  if (O.hero) { const h = O.hero; O.hero = null; tween(0.5, k => { h.position.y -= k * 0.4; h.scale.multiplyScalar(0.94); }).then(() => releaseModel(h)); }
  await tween(0.45, k => { cd.g.position.lerpVectors(p0, tgt, k); cd.g.scale.setScalar(lerp(s0, ts, k)); cd.g.rotation.set(r0.x * (1 - k), r0.y * (1 - k), (O.ci - 2) * -0.04 * k); }, easeOut);
  O.ci++;
  presentCard(O);
}
function summary(O) {
  O.state = 'summary';
  $('#openHint').style.opacity = 0;
  tween(0.4, k => { O.cards.forEach(c => { c.g.position.y -= k * 0.25; }); });
  const s = $('#s-open');
  const box = el('div', 'summary');
  box.innerHTML = `<h2 class="title">Your pull</h2><div class="sum-cards" id="sumCards"></div><div class="sub" id="sumInfo"></div><div class="bar" id="sumBtns" style="justify-content:center"></div>`;
  s.appendChild(box);
  const sc = box.querySelector('#sumCards');
  O.res.reveal.forEach((rv, i) => {
    const d = el('div', 'sum-card', `<img alt="">${rv.isNew ? '<span class="newb">NEW!</span>' : `<span class="dupb">+${rv.ess} Essence</span>`}`);
    d.style.animationDelay = (i * 0.07) + 's';
    cardThumb(rv.c.id, rv.variant, false).then(u => { d.querySelector('img').src = u; });
    d.onclick = () => openViewer(rv.c.id);
    sc.appendChild(d);
  });
  const nNew = O.res.reveal.filter(r => r.isNew).length;
  box.querySelector('#sumInfo').innerHTML = `${nNew} new discover${nNew === 1 ? 'y' : 'ies'} · ${Object.keys(S.seen).length} / ${CHARS.length} found · Legendary+ guaranteed within ${PITY_PACKS - S.pity} packs`;
  const btns = box.querySelector('#sumBtns');
  const same = S.items.find(i => i.type === 'pack' && i.family === O.fam && i.tier === O.tier) || S.items.find(i => i.type === 'pack');
  if (same) { const b = el('button', 'btn gold', `Open next pack (${packsLeft()})`); b.onclick = () => { SFX.click(); openPack(same); }; btns.appendChild(b); }
  else if (S.items.length) { const b = el('button', 'btn gold', 'Open a box'); b.onclick = () => { SFX.click(); go('packs'); }; btns.appendChild(b); }
  const b2 = el('button', 'btn', 'View collection'); b2.onclick = () => { SFX.click(); go('binder'); };
  const b3 = el('button', 'btn', 'Done'); b3.onclick = () => { SFX.click(); go(S.items.length ? 'packs' : 'hub'); };
  btns.append(b2, b3);
  checkAchToasts();
}
function checkAchToasts() { for (const a of ACHS) if (!S.ach[a.id] && a.test()) { S.ach[a.id] = 'ready'; toast(`Achievement: ${a.text}`, 'quest'); } refreshBadges(); }

/* ---------- boxes: the box opens to show its packs ---------- */
function boxTextureCanvas(b) {
  const fam = b.packs[0].family, tier = b.packs[0].tier, st = FAM_STYLE[fam] || FAM_STYLE.starfall;
  const W = 512, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, st[1]); g.addColorStop(1, st[2]);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = TIER[tier].col; x.lineWidth = 14; x.strokeRect(12, 12, W - 24, H - 24);
  x.save(); x.translate(W / 2, H * 0.42); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 20; i++) { x.rotate(Math.PI / 10); x.fillStyle = hexA(st[0], 0.06); x.beginPath(); x.moveTo(0, 0); x.lineTo(400, -30); x.lineTo(400, 30); x.fill(); }
  x.restore();
  drawSigil(x, W / 2, H * 0.36, 1.5);
  x.fillStyle = '#fff4dc'; x.textAlign = 'center'; x.font = `900 46px ${FONT_D}`; x.fillText('MYTHIC ARMIES', W / 2, H * 0.68);
  x.fillStyle = st[0]; x.font = `900 34px ${FONT_D}`;
  fitFont(x, b.name.toUpperCase(), W - 60, 34, 900, FONT_D); x.fillText(b.name.toUpperCase(), W / 2, H * 0.79);
  x.fillStyle = '#fff'; x.font = `800 24px ${FONT_U}`; x.fillText(`${b.packs.length} PACKS INSIDE`, W / 2, H * 0.88);
  return cv;
}
async function openBox(item) {
  go('open');
  const O = SC.all.open;
  cleanupOpen(O);
  const packs = openBoxItem(item);
  refreshCurrency();
  const s = $('#s-open');
  s.innerHTML = `<div class="open-top"><button class="back" id="openBack" aria-label="Leave">‹</button><span class="tag" style="padding:6px 12px;background:rgba(10,8,24,.75)">${esc(item.name)}</span></div><div class="open-hint" id="openHint">Tap the box to open it</div>`;
  $('#openBack').onclick = () => { SFX.back(); go('packs'); };
  const fam = item.packs[0].family;
  O.fx = FAMILY[fam] ? FAMILY[fam].fx : 'stars'; O.fam = fam; O.fxRate = 8;
  O.P = new Particles(200, O.fx, O.fx !== 'leaves'); O.burst = new Particles(200, 'motes');
  O.scene.add(O.P.pts, O.burst.pts);
  const tex = new THREE.CanvasTexture(boxTextureCanvas(item)); tex.encoding = THREE.sRGBEncoding;
  const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.4, envMap: envMap() });
  const plain = new THREE.MeshStandardMaterial({ color: new THREE.Color(FAM_STYLE[fam][1]), roughness: 0.5, metalness: 0.5, envMap: envMap() });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe8b84a, roughness: 0.3, metalness: 1, envMap: envMap() });
  const bodyG = new THREE.BoxGeometry(2.6, 1.6, 2.0), lidG = new THREE.BoxGeometry(2.75, 0.5, 2.15), trimG = new THREE.BoxGeometry(2.8, 0.1, 2.2);
  const g = new THREE.Group();
  const body = new THREE.Mesh(bodyG, [plain, plain, plain, plain, side, plain]);
  const lid = new THREE.Group();
  const lidM = new THREE.Mesh(lidG, [plain, plain, side, plain, plain, plain]);
  const trim = new THREE.Mesh(trimG, gold); trim.position.y = -0.22;
  lid.add(lidM, trim); lid.position.y = 1.05;
  g.add(body, lid); g.position.y = -0.6; g.rotation.set(0.35, -0.5, 0);
  O.scene.add(g);
  const mats = [];
  const packMeshes = [];
  for (let i = 0; i < packs.length; i++) {
    const p = packs[i];
    const m = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(packFrontSmall(p.family, p.tier)), roughness: 0.35, metalness: 0.6, envMap: envMap() });
    m.map.encoding = THREE.sRGBEncoding; mats.push(m);
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.43), m);
    pm.visible = false; O.scene.add(pm); packMeshes.push(pm);
  }
  O.boxCleanup = () => { O.scene.remove(g); packMeshes.forEach(p => { O.scene.remove(p); p.geometry.dispose(); }); mats.forEach(m => { m.map.dispose(); m.dispose(); }); tex.dispose(); side.dispose(); plain.dispose(); gold.dispose(); bodyG.dispose(); lidG.dispose(); trimG.dispose(); };
  SFX.whoosh();
  await tween(0.6, k => { g.position.y = -0.6 + (1 - k) * 5; }, easeBack);
  O.state = 'box';
  await new Promise(res => { O.boxTap = res; });
  O.boxTap = null; O.state = 'boxopen';
  $('#openHint').style.opacity = 0;
  SFX.lid(); flash(0.4, 500, FAM_STYLE[fam][0]);
  fxEmit(O.burst, O.fx, 'burst', 0, 0.8, 0.5, 60);
  await tween(0.7, k => { lid.position.y = 1.05 + k * 3; lid.position.z = -k * 2; lid.rotation.x = -k * 1.2; g.rotation.x = 0.35 + k * 0.25; });
  SFX.shimmer(3);
  const n = packs.length, narrow = O.viewW < O.viewH;
  const perRow = narrow ? Math.min(n, 5) : Math.min(n, 8), rows = Math.ceil(n / perRow), sp = Math.min(1.0, O.viewW * 0.9 / perRow);
  await tween(1.2, k => {
    packMeshes.forEach((pm, i) => {
      const kk = clamp(k * 1.6 - i * 0.04, 0, 1); pm.visible = kk > 0;
      const row = Math.floor(i / perRow), col = i % perRow, cnt = Math.min(perRow, n - row * perRow);
      const tx = (col - (cnt - 1) / 2) * sp, ty = 0.9 - row * 1.55 + (rows > 1 ? 0.7 : 0);
      pm.position.set(lerp(0, tx, easeOut(kk)), lerp(-0.4, ty, easeOut(kk)), lerp(0, 1.2, kk));
      pm.rotation.set(0, (1 - kk) * 3, (col - (cnt - 1) / 2) * -0.05);
      pm.scale.setScalar(Math.min(1, sp / 1.0));
    });
    g.position.y = -0.6 - k * 4;
  });
  const hint = $('#openHint');
  hint.innerHTML = `${n} packs added to your collection of packs`;
  hint.style.opacity = 1;
  const row = el('div', 'bar'); row.style.cssText = 'position:absolute;left:0;right:0;bottom:calc(70px + var(--safe-b));justify-content:center';
  const b1 = el('button', 'btn gold', 'Open the first pack'); b1.onclick = () => { SFX.click(); openPack(packs[0]); };
  const b2 = el('button', 'btn', 'Back to packs'); b2.onclick = () => { SFX.click(); go('packs'); };
  row.append(b1, b2);
  $('#s-open').appendChild(row);
  O.state = 'boxdone';
  guideCheck();
}
function packFrontSmall(fam, tier) { const cv = document.createElement('canvas'); cv.width = 160; cv.height = 254; drawPackFront(cv.getContext('2d'), 160, 254, fam, tier, true); return cv; }
