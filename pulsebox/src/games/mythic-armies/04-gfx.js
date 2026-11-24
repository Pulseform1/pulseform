/* ---------- three.js setup, shared materials and the parametric creature kit ---------- */

const GFX = { r: null, w: 1, h: 1, dpr: 1, maxDpr: 1.5, frameMs: 16, slow: 0 };
const LIN = {};
function lin(hex) { let c = LIN[hex]; if (!c) { c = new THREE.Color(hex); c.convertSRGBToLinear(); LIN[hex] = c; } return c; }
const RIM = { uRim: { value: new THREE.Color(0, 0, 0) }, uRimPow: { value: 2.4 } };
const MAT = {};
function initMaterials() {
  MAT.lit = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.08, flatShading: true });
  MAT.lit.onBeforeCompile = sh => {
    sh.uniforms.uRim = RIM.uRim; sh.uniforms.uRimPow = RIM.uRimPow;
    sh.fragmentShader = 'uniform vec3 uRim;\nuniform float uRimPow;\n' + sh.fragmentShader.replace('#include <dithering_fragment>',
      '#include <dithering_fragment>\n  float rimF = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));\n  gl_FragColor.rgb += uRim * pow(rimF, uRimPow);');
  };
  MAT.glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  MAT.add = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
}
function setRim(hex, k) { RIM.uRim.value.copy(lin(hex)).multiplyScalar(k == null ? 1 : k); }

/* shared primitive geometry, stripped to positions only (flat shading derives normals in the shader) */
const PRIMS = {};
function prim(n) {
  let g = PRIMS[n];
  if (g) return g;
  const T = THREE;
  switch (n) {
    case 'box': g = new T.BoxGeometry(1, 1, 1); break;
    case 'sph': g = new T.SphereGeometry(0.5, 10, 7); break;
    case 'sphl': g = new T.SphereGeometry(0.5, 7, 5); break;
    case 'hemi': g = new T.SphereGeometry(0.5, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2); break;
    case 'cyl': g = new T.CylinderGeometry(0.5, 0.5, 1, 8); break;
    case 'cylt': g = new T.CylinderGeometry(0.3, 0.5, 1, 8); break;
    case 'cone': g = new T.ConeGeometry(0.5, 1, 7); break;
    case 'cone4': g = new T.ConeGeometry(0.5, 1, 4); break;
    case 'ico': g = new T.IcosahedronGeometry(0.5, 0); break;
    case 'oct': g = new T.OctahedronGeometry(0.5, 0); break;
    case 'dod': g = new T.DodecahedronGeometry(0.5, 0); break;
    case 'tet': g = new T.TetrahedronGeometry(0.5, 0); break;
    case 'tor': g = new T.TorusGeometry(0.5, 0.08, 5, 18); break;
    case 'torh': g = new T.TorusGeometry(0.5, 0.1, 5, 10, Math.PI); break;
    case 'wedge': g = new T.CylinderGeometry(0.5, 0.5, 1, 3); break;
    case 'ring': g = new T.RingGeometry(0.4, 0.5, 28); break;
    case 'disc': g = new T.CircleGeometry(0.5, 20); break;
  }
  if (g.index) g = g.toNonIndexed();
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  PRIMS[n] = g;
  return g;
}
const UP_V = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
class Kit {
  constructor() { this.parts = { root: { pivot: new THREE.Vector3(), parent: null, items: [] } }; this.order = ['root']; }
  part(name, pivot, parent) {
    if (!this.parts[name]) this.order.push(name);
    this.parts[name] = { pivot: new THREE.Vector3(pivot[0], pivot[1], pivot[2]), parent: parent || 'root', items: [] };
    return name;
  }
  add(part, pr, col, p, s, r, kind) {
    const m = new THREE.Matrix4();
    if (r && r.isQuaternion) _q.copy(r);
    else { _e.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0); _q.setFromEuler(_e); }
    if (typeof s === 'number') _s.set(s, s, s); else _s.set(s[0], s[1], s[2]);
    m.compose(_v.set(p[0], p[1], p[2]), _q, _s);
    (this.parts[part] || this.parts.root).items.push({ g: prim(pr), m, col, kind: kind || 'l' });
  }
}
function mergeItems(items, pivot, bb) {
  let n = 0;
  for (const it of items) n += it.g.attributes.position.count;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const it of items) {
    const pa = it.g.attributes.position, c = lin(it.col);
    for (let i = 0; i < pa.count; i++) {
      _v.fromBufferAttribute(pa, i).applyMatrix4(it.m);
      bb.expandByPoint(_v);
      _v.sub(pivot);
      pos[o] = _v.x; pos[o + 1] = _v.y; pos[o + 2] = _v.z;
      col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b;
      o += 3;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return g;
}
function kitToDef(kit) {
  const def = { parts: [], bb: new THREE.Box3(), verts: 0 };
  for (const name of kit.order) {
    const P = kit.parts[name], by = { l: [], g: [], a: [] }, geos = {};
    for (const it of P.items) by[it.kind].push(it);
    for (const k of ['l', 'g', 'a']) if (by[k].length) { geos[k] = mergeItems(by[k], P.pivot, def.bb); def.verts += geos[k].attributes.position.count; }
    def.parts.push({ name, pivot: P.pivot, parent: P.parent, geos });
  }
  return def;
}
function disposeDef(def) { for (const p of def.parts) for (const k in p.geos) p.geos[k].dispose(); }

/* model cache: one merged definition per character, shared by every instance; evicted defs are disposed once unused */
const DEF_CACHE = new Map(), DEF_MAX = 48;
function getDef(id) {
  let d = DEF_CACHE.get(id);
  if (d) { DEF_CACHE.delete(id); DEF_CACHE.set(id, d); return d; }
  d = buildCreature(CHAR[id]);
  d.use = 0;
  DEF_CACHE.set(id, d);
  if (DEF_CACHE.size > DEF_MAX) {
    for (const [k, v] of DEF_CACHE) { if (DEF_CACHE.size <= DEF_MAX) break; if (!v.use && k !== id) { disposeDef(v); DEF_CACHE.delete(k); } }
  }
  return d;
}
function makeModel(id, opts) {
  const def = getDef(id), c = CHAR[id];
  def.use++;
  const root = new THREE.Group(), inner = new THREE.Group(), scaler = new THREE.Group();
  root.add(inner); inner.add(scaler);
  const groups = {};
  for (const p of def.parts) {
    const g = p.name === 'root' ? scaler : new THREE.Group();
    groups[p.name] = g;
    for (const k in p.geos) { const mesh = new THREE.Mesh(p.geos[k], k === 'l' ? MAT.lit : k === 'g' ? MAT.glow : MAT.add); g.add(mesh); }
  }
  for (const p of def.parts) {
    if (p.name === 'root') continue;
    const par = def.parts.find(x => x.name === p.parent) || def.parts[0];
    groups[p.name].position.copy(p.pivot).sub(par.pivot);
    groups[p.name].userData.p0 = groups[p.name].position.clone();
    groups[p.parent === 'root' || !groups[p.parent] ? 'root' : p.parent].add(groups[p.name]);
  }
  const s = def.scale * ((opts && opts.scale) || 1);
  scaler.scale.setScalar(s);
  root.userData = { id, def, c, P: groups, melee: c.rng < 2, inner, scaler, h: def.height * s, w: def.width * s, ph: (c.seed % 1000) / 160, released: false };
  if (c.r >= 4 && !(opts && opts.noAura)) addAura(root, c);
  return root;
}
function releaseModel(m) {
  if (!m || m.userData.released) return;
  m.userData.released = true;
  m.userData.def.use--;
  if (m.userData.aura) { m.userData.aura.geometry.dispose(); }
  if (m.parent) m.parent.remove(m);
}
/* Legendary and Mythic units carry a ring of drifting motes */
let AURA_MAT = null;
function addAura(root, c) {
  if (!AURA_MAT) AURA_MAT = new THREE.PointsMaterial({ size: 0.09, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const n = c.r === 5 ? 46 : 26, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), R = rng(c.seed + 7);
  const def = getDef(c.id), w = Math.max(0.6, def.width * def.scale * 0.6), h = def.height * def.scale;
  const a = lin(FAC[c.fac].glow), b = lin(c.r === 5 ? '#ff9af0' : '#ffd970');
  for (let i = 0; i < n; i++) {
    const ang = R() * Math.PI * 2, rad = w * (0.7 + R() * 0.6);
    pos[i * 3] = Math.cos(ang) * rad; pos[i * 3 + 1] = R() * h; pos[i * 3 + 2] = Math.sin(ang) * rad;
    const cc = R() < 0.5 ? a : b;
    col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, AURA_MAT);
  root.add(pts);
  root.userData.aura = pts;
}
let DOT_TEX = null;
function dotTexture() {
  if (DOT_TEX) return DOT_TEX;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const x = cv.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  DOT_TEX = new THREE.CanvasTexture(cv);
  return DOT_TEX;
}

/* ---------- creature builder ---------- */
const BODY_H = { bip: 1.75, bru: 2.35, gol: 2.3, qd: 1.45, drk: 2.2, srp: 2.1, avi: 1.6, flt: 1.5, swm: 1.2, crw: 1.0, ent: 2.4, ray: 1.3, oct: 1.9, fsh: 1.5, spc: 1.95 };
function palette(c) {
  const f = FAC[c.fac], R = rng(c.seed + 99), P = f.pal;
  const i1 = Math.floor(R() * P.length);
  let i2 = Math.floor(R() * P.length); if (i2 === i1) i2 = (i2 + 2) % P.length;
  let i3 = Math.floor(R() * P.length); if (i3 === i1 || i3 === i2) i3 = (i1 + 3) % P.length;
  const shade = (hex, k) => { const col = new THREE.Color(hex); col.offsetHSL((R() - 0.5) * 0.04, 0, k); return '#' + col.getHexString(); };
  const gold = c.r >= 4 ? '#f0c85a' : c.r === 3 ? '#d8b0ff' : '#c8ccd6';
  return {
    p1: shade(P[i1], 0), p2: shade(P[i2], 0.02), p3: shade(P[i3], -0.08), dark: shade(P[i1], -0.22), light: shade(P[i1], 0.16),
    acc: pick(R, f.accent), metal: c.r >= 4 ? '#e8c45a' : '#b9bfca', trim: gold, bone: '#e9e2cc', eye: c.fac === 'gloom' ? '#7dffb8' : c.fac === 'ember' ? '#ffd23a' : '#fff6c8',
    cloth: shade(P[(i1 + 1) % P.length], -0.04), wood: '#7a5634', leaf: c.fac === 'wild' ? '#5fbf4a' : c.fac === 'gloom' ? '#4a6a3a' : '#3aa88a', coral: '#ff8a8a'
  };
}
function buildCreature(c) {
  const K = new Kit(), R = rng(c.seed), pal = palette(c), has = t => c.parts.has(t);
  const ctx = { c, K, R, pal, has, r: c.r, v: (a, b) => a + R() * (b - a) };
  (BUILDERS[c.body] || BUILDERS.bip)(ctx);
  const def = kitToDef(K);
  const size = new THREE.Vector3(); def.bb.getSize(size);
  def.rawH = Math.max(0.3, def.bb.max.y);
  const target = (BODY_H[c.body] || 1.7) * (1 + 0.07 * c.r) * (c.parts.has('crown') ? 1.05 : 1);
  def.scale = target / def.rawH;
  def.height = def.rawH;
  def.width = Math.max(size.x, size.z);
  def.body = c.body;
  return def;
}

/* shared part makers; positions are in model space, the creature faces +z */
function eyes(x, part, cx, cy, cz, sep, size, n) {
  const { K, pal, has } = x;
  if (has('eye1') || n === 1) { K.add(part, 'sph', '#ffffff', [cx, cy, cz], size * 2.1); K.add(part, 'sph', pal.eye, [cx, cy, cz + size * 0.9], size * 1.1, null, 'g'); return; }
  if (has('eye3')) { K.add(part, 'sph', pal.eye, [cx, cy + size * 1.6, cz], size, null, 'g'); }
  K.add(part, 'sph', pal.eye, [cx - sep, cy, cz], size, null, 'g');
  K.add(part, 'sph', pal.eye, [cx + sep, cy, cz], size, null, 'g');
}
function headGear(x, part, cx, cy, cz, hr, opt) {
  const { K, pal, has, R, r } = x;
  opt = opt || {};
  const top = cy + hr;
  x.topY = top + 0.15; x.headPart = part; x.headZ = cz;
  if (has('horns')) for (const s of [-1, 1]) {
    K.add(part, 'cone', pal.bone, [cx + s * hr * 0.55, top - hr * 0.05, cz - hr * 0.2], [hr * 0.28, hr * 1.1, hr * 0.28], [-0.5, 0, -s * 0.45]);
    K.add(part, 'cone', pal.bone, [cx + s * hr * 0.85, top + hr * 0.55, cz - hr * 0.55], [hr * 0.16, hr * 0.6, hr * 0.16], [-1.1, 0, -s * 0.2]);
  }
  if (has('horns4')) for (const s of [-1, 1]) for (const k of [0, 1]) {
    K.add(part, 'cone', k ? pal.trim : pal.bone, [cx + s * hr * (0.45 + k * 0.4), top - hr * (0.1 + k * 0.35), cz - hr * 0.3], [hr * 0.25, hr * (1.3 - k * 0.3), hr * 0.25], [-0.7 - k * 0.3, 0, -s * (0.5 + k * 0.5)]);
  }
  if (has('unihorn')) K.add(part, 'cone', r >= 3 ? pal.trim : '#f4efe0', [cx, top, cz + hr * 0.45], [hr * 0.22, hr * 1.7, hr * 0.22], [0.75, 0, 0], r >= 3 ? 'g' : 'l');
  if (has('antlers')) for (const s of [-1, 1]) {
    const ax = cx + s * hr * 0.45;
    K.add(part, 'cyl', pal.wood, [ax + s * hr * 0.3, top + hr * 0.5, cz - hr * 0.1], [hr * 0.12, hr * 1.3, hr * 0.12], [0, 0, -s * 0.5]);
    K.add(part, 'cyl', pal.wood, [ax + s * hr * 0.75, top + hr * 1.15, cz], [hr * 0.09, hr * 0.8, hr * 0.09], [0.3, 0, -s * 1.0]);
    K.add(part, 'cyl', pal.wood, [ax + s * hr * 0.4, top + hr * 1.25, cz + hr * 0.1], [hr * 0.08, hr * 0.7, hr * 0.08], [0.2, 0, s * 0.2]);
    if (has('glowcore') || r >= 3) K.add(part, 'sphl', pal.acc, [ax + s * hr * 1.0, top + hr * 1.45, cz], hr * 0.16, null, 'g');
    x.topY = top + hr * 1.6;
  }
  if (has('ears') && !opt.noEars) for (const s of [-1, 1]) K.add(part, 'cone', opt.earCol || pal.p1, [cx + s * hr * 0.6, top - hr * 0.05, cz - hr * 0.1], [hr * 0.35, hr * 0.9, hr * 0.18], [0, 0, -s * 0.35]);
  if (has('crest')) for (let i = 0; i < 4; i++) K.add(part, 'cone4', pal.acc, [cx, top + hr * 0.05 - i * hr * 0.12, cz + hr * 0.3 - i * hr * 0.35], [hr * 0.12, hr * (0.8 - i * 0.12), hr * 0.4], [-0.6 - i * 0.2, 0, 0], c3g(x));
  if (has('tusks')) for (const s of [-1, 1]) K.add(part, 'cone', pal.bone, [cx + s * hr * 0.4, cy - hr * 0.45, cz + hr * 0.75], [hr * 0.16, hr * 0.7, hr * 0.16], [0.6, 0, s * 0.3]);
  if (has('antennae')) for (const s of [-1, 1]) {
    K.add(part, 'cyl', pal.dark, [cx + s * hr * 0.35, top + hr * 0.45, cz + hr * 0.2], [hr * 0.05, hr * 1.0, hr * 0.05], [0.4, 0, -s * 0.35]);
    K.add(part, 'sphl', pal.acc, [cx + s * hr * 0.55, top + hr * 0.92, cz + hr * 0.42], hr * 0.15, null, 'g');
  }
  if (has('hood')) {
    K.add(part, 'cone', pal.cloth, [cx, cy + hr * 0.25, cz - hr * 0.1], [hr * 2.35, hr * 2.4, hr * 2.35]);
    K.add(part, 'sph', '#120c18', [cx, cy - hr * 0.05, cz + hr * 0.38], [hr * 1.45, hr * 1.35, hr * 0.9]);
    x.topY = cy + hr * 1.5;
  }
  if (has('hat')) {
    K.add(part, 'cyl', pal.dark, [cx, top - hr * 0.1, cz], [hr * 2.8, hr * 0.12, hr * 2.8]);
    K.add(part, 'cone', pal.dark, [cx, top + hr * 0.75, cz - hr * 0.15], [hr * 1.6, hr * 1.8, hr * 1.6], [-0.2, 0, 0.12]);
    K.add(part, 'cyl', pal.acc, [cx, top + hr * 0.05, cz], [hr * 1.65, hr * 0.18, hr * 1.65], null, 'g');
    x.topY = top + hr * 1.6;
  }
  if (has('helm')) {
    K.add(part, 'cyl', pal.metal, [cx, cy + hr * 0.25, cz], [hr * 2.2, hr * 1.5, hr * 2.2]);
    K.add(part, 'box', '#1a1a22', [cx, cy + hr * 0.1, cz + hr * 1.02], [hr * 1.3, hr * 0.22, hr * 0.12]);
    K.add(part, 'sph', pal.metal, [cx, cy + hr * 1.0, cz], [hr * 2.2, hr * 0.9, hr * 2.2]);
    if (r >= 1) K.add(part, 'box', r >= 3 ? pal.acc : pal.p2, [cx, cy + hr * 1.45, cz - hr * 0.3], [hr * 0.25, hr * 0.7, hr * 1.6], [0.2, 0, 0], r >= 3 ? 'g' : 'l');
    x.topY = cy + hr * 1.6;
  }
  if (has('mask')) K.add(part, 'box', pal.trim, [cx, cy, cz + hr * 0.82], [hr * 1.5, hr * 0.55, hr * 0.15]);
  if (has('mush') && !opt.noMush) {
    K.add(part, 'hemi', '#d8483a', [cx, top - hr * 0.2, cz], [hr * 3.0, hr * 1.8, hr * 3.0]);
    for (let i = 0; i < 5; i++) K.add(part, 'sphl', '#fff0e0', [cx + Math.cos(i * 1.3) * hr * 0.9, top + hr * 0.35, cz + Math.sin(i * 1.3) * hr * 0.9], hr * 0.22);
    x.topY = top + hr * 0.9;
  }
  if (has('crown')) {
    const cy2 = x.topY - 0.06;
    K.add(part, 'cyl', pal.trim, [cx, cy2, cz], [hr * 1.3, hr * 0.3, hr * 1.3]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; K.add(part, 'cone4', pal.trim, [cx + Math.cos(a) * hr * 0.6, cy2 + hr * 0.3, cz + Math.sin(a) * hr * 0.6], [hr * 0.18, hr * 0.5, hr * 0.18]); }
    K.add(part, 'oct', pal.acc, [cx, cy2 + hr * 0.1, cz + hr * 0.62], hr * 0.22, null, 'g');
    x.topY = cy2 + hr * 0.6;
  }
  if (has('halo')) { K.add(part, 'tor', r >= 4 ? '#fff2a0' : pal.acc, [cx, x.topY + 0.1, cz - hr * 0.2], [hr * 1.9, hr * 1.9, hr * 1.9], [Math.PI / 2 - 0.25, 0, 0], 'g'); x.topY += 0.15; }
  if (has('mane')) for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    K.add(part, 'cone', opt.maneCol || pal.p2, [cx + Math.cos(a) * hr * 0.95, cy + Math.sin(a) * hr * 0.95, cz - hr * 0.35], [hr * 0.45, hr * 0.9, hr * 0.45], [0, 0, a - Math.PI / 2], has('flames') ? 'g' : 'l');
  }
  if (has('flames') && !opt.noFlame) for (let i = 0; i < 3; i++) K.add(part, 'cone', i ? '#ffd23a' : '#ff6a1a', [cx + (i - 1) * hr * 0.35, top + hr * 0.2, cz - hr * 0.35], [hr * 0.4, hr * (1.1 - Math.abs(i - 1) * 0.4), hr * 0.4], [-0.3, 0, (i - 1) * 0.3], 'g');
}
function c3g(x) { return x.r >= 3 ? 'g' : 'l'; }
function backGear(x, part, cx, cy, cz, w, len) {
  const { K, pal, has, r } = x;
  if (has('spikes')) for (let i = 0; i < 4; i++) K.add(part, 'cone', r >= 3 ? pal.acc : pal.bone, [cx, cy + 0.02, cz + len * 0.35 - i * len * 0.25], [w * 0.22, w * 0.5, w * 0.22], [-0.35, 0, 0], r >= 4 ? 'g' : 'l');
  if (has('plates')) for (const s of [-1, 1]) K.add(part, 'box', pal.metal, [cx + s * w * 0.42, cy - w * 0.05, cz], [w * 0.4, w * 0.18, len * 0.7], [0, 0, s * 0.35]);
  if (has('shell')) {
    K.add(part, 'hemi', pal.p2, [cx, cy - w * 0.25, cz], [w * 1.35, w * 1.1, len * 1.1]);
    for (let i = 0; i < 5; i++) K.add(part, 'cyl', pal.p3, [cx + Math.cos(i * 1.25) * w * 0.32, cy + w * 0.18, cz + Math.sin(i * 1.25) * len * 0.3], [w * 0.28, w * 0.1, w * 0.28], [0, 0, 0]);
  }
  if (has('leaves')) for (let i = 0; i < 6; i++) K.add(part, 'oct', i % 2 ? x.pal.leaf : '#8fd85a', [cx + Math.sin(i * 2.1) * w * 0.4, cy + 0.05 + (i % 3) * 0.04, cz + Math.cos(i * 2.1) * len * 0.35], [w * 0.35, w * 0.12, w * 0.5], [0.3, i, 0]);
  if (has('coral')) for (let i = 0; i < 4; i++) {
    const px = cx + (i - 1.5) * w * 0.28;
    K.add(part, 'cyl', pal.coral, [px, cy + w * 0.3, cz - len * 0.1], [w * 0.08, w * 0.6, w * 0.08], [0, 0, (i - 1.5) * 0.4]);
    K.add(part, 'sphl', '#ffc0a0', [px + (i - 1.5) * w * 0.1, cy + w * 0.62, cz - len * 0.1], w * 0.12);
  }
  if (has('shards')) for (let i = 0; i < 4; i++) K.add(part, 'oct', pal.acc, [cx + (i - 1.5) * w * 0.3, cy + w * 0.35, cz - i * len * 0.12], [w * 0.18, w * 0.6, w * 0.18], [0.2, i, (i - 1.5) * 0.25], 'g');
  if (has('chains')) for (let i = 0; i < 5; i++) K.add(part, 'tor', '#8a8a92', [cx - w * 0.5 + i * w * 0.25, cy - w * 0.1 - Math.sin(i / 4 * Math.PI) * w * 0.25, cz + len * 0.3], w * 0.18, [0, i % 2 ? Math.PI / 2 : 0, 0]);
  if (has('flames')) for (let i = 0; i < 3; i++) K.add(part, 'cone', i === 1 ? '#ffd23a' : '#ff7a1a', [cx + (i - 1) * w * 0.25, cy + w * 0.3, cz - len * 0.1 - i * 0.05], [w * 0.3, w * 0.8, w * 0.3], [-0.4, 0, (i - 1) * 0.3], 'g');
  if (has('glowcore')) K.add(part, 'ico', pal.acc, [cx, cy - w * 0.1, cz + len * 0.42], w * 0.35, null, 'g');
}
function wings(x, parent, ax, ay, az, span, kind) {
  const { K, pal, r } = x;
  for (const s of [-1, 1]) {
    const pn = K.part(s < 0 ? 'wingL' : 'wingR', [ax + s * 0.05, ay, az], parent);
    if (kind === 'fwings') {
      for (let i = 0; i < 5; i++) {
        const t = i / 4, len = span * (1 - t * 0.35);
        K.add(pn, 'sph', i % 2 ? pal.p2 : pal.light, [ax + s * len * 0.5, ay + 0.15 - t * 0.28, az - t * 0.12], [len, 0.16, 0.06 + 0.03 * (1 - t)], [0, 0, s * (0.25 - t * 0.5)], r >= 4 && i === 0 ? 'g' : 'l');
      }
      if (r >= 3) K.add(pn, 'sph', pal.acc, [ax + s * span * 0.6, ay + 0.2, az - 0.05], [span * 0.6, 0.06, 0.04], [0, 0, s * 0.3], 'g');
    } else if (kind === 'iwings') {
      for (const k of [0, 1]) K.add(pn, 'sph', k ? pal.acc : '#c8f0ff', [ax + s * span * 0.45, ay + (k ? -0.15 : 0.12), az - 0.05], [span * (k ? 0.7 : 0.95), 0.03, span * (k ? 0.35 : 0.45)], [0.2, s * 0.3, s * (k ? -0.35 : 0.3)], 'a');
    } else {
      K.add(pn, 'cyl', pal.dark, [ax + s * span * 0.35, ay + 0.25, az], [0.05, span * 0.75, 0.05], [0, 0, s * 1.1]);
      K.add(pn, 'cyl', pal.dark, [ax + s * span * 0.85, ay + 0.2, az - 0.05], [0.04, span * 0.6, 0.04], [0, 0, -s * 2.4]);
      K.add(pn, 'wedge', pal.p2, [ax + s * span * 0.55, ay + 0.0, az - 0.04], [span * 0.95, 0.03, span * 0.75], [Math.PI / 2, 0, s * 0.15]);
      K.add(pn, 'wedge', pal.p3, [ax + s * span * 0.85, ay - 0.05, az - 0.06], [span * 0.55, 0.03, span * 0.5], [Math.PI / 2, 0, -s * 0.3]);
    }
  }
}
function weaponR(x, part, hx, hy, hz) {
  const { K, pal, has, r } = x;
  const metal = pal.metal, wood = pal.wood, g = r >= 3 ? 'g' : 'l';
  if (has('sword')) { K.add(part, 'box', metal, [hx, hy + 0.35, hz + 0.05], [0.07, 0.62, 0.025]); K.add(part, 'box', pal.trim, [hx, hy + 0.04, hz + 0.05], [0.22, 0.05, 0.06]); if (r >= 3) K.add(part, 'box', pal.acc, [hx, hy + 0.35, hz + 0.07], [0.025, 0.5, 0.01], null, 'g'); }
  if (has('axe')) { K.add(part, 'cyl', wood, [hx, hy + 0.25, hz], [0.05, 0.75, 0.05]); K.add(part, 'wedge', metal, [hx + 0.12, hy + 0.5, hz], [0.32, 0.05, 0.3], [Math.PI / 2, 0, Math.PI / 2]); }
  if (has('spear') || has('trident')) {
    K.add(part, 'cyl', wood, [hx, hy + 0.3, hz], [0.04, 1.3, 0.04]);
    if (has('trident')) for (let i = -1; i <= 1; i++) K.add(part, 'cone', pal.trim, [hx + i * 0.08, hy + 1.02, hz], [0.04, 0.22, 0.04], null, g);
    else K.add(part, 'cone4', metal, [hx, hy + 1.03, hz], [0.08, 0.26, 0.04], null, g);
  }
  if (has('staff')) { K.add(part, 'cyl', wood, [hx, hy + 0.25, hz], [0.045, 1.25, 0.045]); K.add(part, 'ico', pal.acc, [hx, hy + 0.95, hz], 0.16, null, 'g'); K.add(part, 'tor', pal.trim, [hx, hy + 0.95, hz], 0.2, [Math.PI / 2, 0, 0]); }
  if (has('hammer')) { K.add(part, 'cyl', wood, [hx, hy + 0.2, hz], [0.05, 0.75, 0.05]); K.add(part, 'box', metal, [hx, hy + 0.58, hz], [0.36, 0.2, 0.2]); if (r >= 2) K.add(part, 'box', pal.acc, [hx, hy + 0.58, hz + 0.105], [0.12, 0.08, 0.01], null, 'g'); }
  if (has('mace')) { K.add(part, 'cyl', wood, [hx, hy + 0.2, hz], [0.045, 0.6, 0.045]); K.add(part, 'dod', metal, [hx, hy + 0.52, hz], 0.2); }
  if (has('scythe')) { K.add(part, 'cyl', '#3a3040', [hx, hy + 0.35, hz], [0.04, 1.5, 0.04]); K.add(part, 'torh', pal.eye, [hx + 0.22, hy + 1.02, hz], [0.45, 0.4, 0.5], [0, 0, 0.2], 'g'); }
  if (has('blades')) K.add(part, 'cone4', metal, [hx, hy + 0.22, hz + 0.08], [0.06, 0.45, 0.02], [0.3, 0, 0], g);
  if (has('orb')) K.add(part, 'ico', pal.acc, [hx, hy + 0.05, hz + 0.12], 0.14, null, 'g');
  if (has('lantern')) { K.add(part, 'cyl', '#2a2430', [hx, hy - 0.18, hz + 0.1], [0.02, 0.2, 0.02]); K.add(part, 'box', '#2a2430', [hx, hy - 0.38, hz + 0.1], [0.16, 0.2, 0.16]); K.add(part, 'sph', pal.eye, [hx, hy - 0.38, hz + 0.1], 0.13, null, 'g'); }
  if (has('book')) K.add(part, 'box', pal.p2, [hx, hy, hz + 0.15], [0.22, 0.28, 0.08], [0.3, 0, 0]);
}
function weaponL(x, part, hx, hy, hz) {
  const { K, pal, has, r } = x;
  if (has('shield')) { K.add(part, 'cyl', pal.metal, [hx - 0.05, hy + 0.1, hz + 0.08], [0.5, 0.06, 0.5], [Math.PI / 2, 0, 0]); K.add(part, 'cyl', pal.p2, [hx - 0.05, hy + 0.1, hz + 0.115], [0.36, 0.02, 0.36], [Math.PI / 2, 0, 0]); K.add(part, 'oct', r >= 2 ? pal.acc : pal.trim, [hx - 0.05, hy + 0.1, hz + 0.14], 0.12, null, r >= 2 ? 'g' : 'l'); }
  if (has('bow')) { K.add(part, 'torh', pal.wood, [hx, hy + 0.05, hz + 0.1], [0.55, 0.75, 0.4], [0, Math.PI / 2, Math.PI / 2]); K.add(part, 'cyl', '#f0f0f0', [hx, hy + 0.05, hz + 0.1], [0.01, 0.78, 0.01], null, r >= 2 ? 'g' : 'l'); }
  if (has('blades')) K.add(part, 'cone4', pal.metal, [hx, hy + 0.22, hz + 0.08], [0.06, 0.45, 0.02], [0.3, 0, 0], r >= 3 ? 'g' : 'l');
}

const BUILDERS = {
  bip(x) {
    const { K, R, pal, has, v, r, c } = x;
    const small = c.r === 0 && (has('sword') && has('shield')) ? 1 : 0;
    const dwarf = c.fac === 'stone' && !has('skull'), tall = c.fac === 'star' || c.fac === 'tide';
    const leg = (dwarf ? v(0.34, 0.42) : tall ? v(0.56, 0.68) : v(0.46, 0.6)) - small * 0.08, th = v(0.48, 0.6), tw = dwarf ? v(0.56, 0.64) : v(0.44, 0.58), hr = v(0.22, 0.27) + small * 0.04, arm = v(0.48, 0.58);
    const torso = dwarf ? 'box' : pick(R, ['cylt', 'cylt', 'sph', 'dod']);
    const skin = has('skull') ? pal.bone : c.fac === 'ember' ? pal.p1 : c.fac === 'tide' ? '#5ab0b8' : c.fac === 'gloom' ? '#a8b0a0' : c.fac === 'star' ? '#e8e0f8' : c.fac === 'stone' ? '#c89a78' : '#c8a070';
    const sy = leg + th;
    K.part('body', [0, leg, 0]);
    if (torso === 'box') K.add('body', 'box', pal.p1, [0, leg + th * 0.5, 0], [tw, th, tw * 0.62]);
    else if (torso === 'sph') { K.add('body', 'sph', pal.p1, [0, leg + th * 0.45, 0.02], [tw * 1.1, th * 1.05, tw * 0.8]); K.add('body', 'cylt', pal.p2, [0, leg + th * 0.8, 0], [tw * 0.9, th * 0.35, tw * 0.6], [0, 0, Math.PI]); }
    else if (torso === 'dod') K.add('body', 'dod', pal.p1, [0, leg + th * 0.5, 0], [tw * 1.05, th * 1.05, tw * 0.75]);
    else K.add('body', 'cylt', pal.p1, [0, leg + th * 0.5, 0], [tw, th, tw * 0.7], [0, 0, Math.PI]);
    K.add('body', 'cyl', pal.dark, [0, leg + 0.04, 0], [tw * 0.95, 0.08, tw * 0.68]);
    if (r >= 2) K.add('body', 'oct', pal.acc, [0, leg + th * 0.6, tw * 0.36], 0.08, null, 'g');
    if (has('plates')) for (const s of [-1, 1]) K.add('body', 'sph', pal.metal, [s * tw * 0.55, sy - 0.04, 0], [0.24, 0.16, 0.26]);
    if (has('shell')) K.add('body', 'hemi', pal.p2, [0, leg + th * 0.45, -tw * 0.3], [tw * 1.2, tw * 1.2, tw * 0.9], [-Math.PI / 2, 0, 0]);
    if (has('coral')) for (let i = 0; i < 3; i++) K.add('body', 'cyl', pal.coral, [(i - 1) * 0.12, sy + 0.05, -tw * 0.3], [0.04, 0.35, 0.04], [-0.3, 0, (i - 1) * 0.5]);
    if (has('glowcore')) K.add('body', 'ico', pal.acc, [0, leg + th * 0.55, tw * 0.3], 0.12, null, 'g');
    if (has('flames')) for (let i = 0; i < 3; i++) K.add('body', 'cone', i === 1 ? '#ffd23a' : '#ff7a1a', [(i - 1) * 0.12, sy + 0.05, -tw * 0.35], [0.12, 0.4, 0.12], [-0.4, 0, (i - 1) * 0.3], 'g');
    if (has('leaves')) for (let i = 0; i < 5; i++) K.add('body', 'oct', pal.leaf, [Math.cos(i * 1.3) * tw * 0.5, leg + th * (0.2 + i * 0.15), Math.sin(i * 1.3) * tw * 0.4], [0.16, 0.06, 0.24], [0.5, i, 0]);
    for (const s of [-1, 1]) {
      const pn = K.part(s < 0 ? 'legL' : 'legR', [s * tw * 0.28, leg, 0]);
      K.add(pn, 'cylt', pal.dark, [s * tw * 0.28, leg * 0.5, 0], [0.22, leg, 0.22], [0, 0, Math.PI]);
      K.add(pn, 'box', pal.p3, [s * tw * 0.28, 0.05, 0.05], [0.2, 0.1, 0.3]);
    }
    if (has('cape')) { K.part('cape', [0, sy - 0.02, -tw * 0.35], 'body'); K.add('cape', 'box', r >= 4 ? '#8a1a2a' : pal.cloth, [0, sy - th * 0.9, -tw * 0.4], [tw * 1.25, th * 1.75, 0.04], [0.12, 0, 0]); }
    if (has('wings')) wings(x, 'body', 0, sy - 0.1, -tw * 0.35, 0.65, 'wings');
    if (has('fwings')) wings(x, 'body', 0, sy - 0.1, -tw * 0.35, 0.9, 'fwings');
    if (has('iwings')) wings(x, 'body', 0, sy - 0.15, -tw * 0.3, 0.6, 'iwings');
    if (has('tail')) { K.part('tail', [0, leg + 0.05, -tw * 0.3], 'body'); K.add('tail', 'cone', pal.p1, [0, leg - 0.05, -tw * 0.3 - 0.3], [0.16, 0.7, 0.16], [-1.9, 0, 0]); }
    for (const s of [-1, 1]) {
      const pn = K.part(s < 0 ? 'armL' : 'armR', [s * (tw * 0.5 + 0.06), sy - 0.06, 0], 'body');
      const ax = s * (tw * 0.5 + 0.08);
      K.add(pn, 'sphl', has('plates') ? pal.metal : pal.p2, [ax, sy - 0.06, 0], 0.22);
      K.add(pn, 'cylt', has('claws') ? skin : pal.p2, [ax, sy - 0.06 - arm * 0.5, 0.02], [0.16, arm, 0.16], [0, 0, Math.PI]);
      K.add(pn, 'sphl', skin, [ax, sy - 0.06 - arm, 0.04], 0.15);
      if (has('claws')) for (let i = -1; i <= 1; i++) K.add(pn, 'cone', pal.bone, [ax + i * 0.04, sy - 0.12 - arm, 0.08], [0.03, 0.12, 0.03], [Math.PI, 0, 0]);
      if (s > 0) weaponR(x, pn, ax, sy - 0.06 - arm, 0.06); else weaponL(x, pn, ax, sy - 0.06 - arm, 0.06);
    }
    const hy = sy + hr * 0.95;
    K.part('head', [0, sy, 0], 'body');
    if (has('snout')) {
      K.add('head', 'sph', skin, [0, hy, 0], [hr * 2, hr * 1.9, hr * 2.1]);
      K.add('head', 'box', skin, [0, hy - hr * 0.25, hr * 0.95], [hr * 1.1, hr * 0.7, hr * 1.3]);
      if (has('fin')) K.add('head', 'wedge', pal.p2, [0, hy + hr * 1.1, -hr * 0.2], [hr * 0.1, hr * 1.2, hr * 1.3], [0, Math.PI / 2, 0]);
      for (let i = -1; i <= 1; i += 2) K.add('head', 'cone', '#ffffff', [i * hr * 0.3, hy - hr * 0.6, hr * 1.4], [hr * 0.12, hr * 0.25, hr * 0.12], [Math.PI, 0, 0]);
    } else K.add('head', 'sph', skin, [0, hy, 0], [hr * 2, hr * 2.1, hr * 1.95]);
    if (has('skull')) { K.add('head', 'sph', '#14101a', [-hr * 0.38, hy + hr * 0.05, hr * 0.78], hr * 0.45); K.add('head', 'sph', '#14101a', [hr * 0.38, hy + hr * 0.05, hr * 0.78], hr * 0.45); K.add('head', 'box', pal.bone, [0, hy - hr * 0.75, hr * 0.35], [hr * 1.2, hr * 0.4, hr * 1.0]); }
    eyes(x, 'head', 0, hy + hr * 0.08, hr * 0.92, hr * 0.38, hr * 0.2);
    if (dwarf) { const bc = pick(R, ['#c8742a', '#8a5a3a', '#d8d0c0', '#e8b040']); K.add('head', 'cone', bc, [0, hy - hr * 0.85, hr * 0.55], [hr * 1.5, hr * 1.5, hr * 0.9], [Math.PI + 0.25, 0, 0]); K.add('head', 'sph', bc, [0, hy - hr * 0.3, hr * 0.8], [hr * 0.9, hr * 0.35, hr * 0.3]); }
    if (has('fin') && !has('snout')) for (const s of [-1, 1]) K.add('head', 'wedge', pal.p2, [s * hr * 1.0, hy, 0], [hr * 0.1, hr * 1.1, hr * 0.9], [0, 0, s * 0.4]);
    headGear(x, 'head', 0, hy, 0, hr, { earCol: skin });
  },
  bru(x) {
    const { K, pal, has, v, r, c } = x;
    const leg = v(0.45, 0.6), th = v(0.8, 1.0), tw = v(0.75, 0.95), hr = v(0.18, 0.24), arm = v(0.95, 1.15);
    const skin = c.fac === 'tide' ? '#7a8a90' : c.fac === 'gloom' ? '#8a9a7a' : c.fac === 'stone' ? '#9a8a78' : pal.p1;
    const sy = leg + th;
    K.part('body', [0, leg, 0]);
    K.add('body', 'sph', skin, [0, leg + th * 0.55, -0.05], [tw, th * 1.15, tw * 0.8]);
    K.add('body', 'sph', pal.p2, [0, leg + th * 0.3, 0.12], [tw * 0.8, th * 0.6, tw * 0.6]);
    K.add('body', 'cyl', pal.dark, [0, leg + 0.06, 0], [tw * 0.8, 0.14, tw * 0.62]);
    backGear(x, 'body', 0, sy, -0.15, tw, tw * 0.8);
    if (has('helm') || has('plates')) for (const s of [-1, 1]) K.add('body', 'sph', pal.metal, [s * tw * 0.5, sy - 0.05, 0], [0.42, 0.3, 0.42]);
    for (const s of [-1, 1]) {
      const pn = K.part(s < 0 ? 'legL' : 'legR', [s * tw * 0.25, leg, 0]);
      K.add(pn, 'cylt', pal.dark, [s * tw * 0.25, leg * 0.5, 0], [0.3, leg, 0.3], [0, 0, Math.PI]);
      K.add(pn, 'box', pal.p3, [s * tw * 0.25, 0.06, 0.08], [0.3, 0.12, 0.4]);
    }
    for (const s of [-1, 1]) {
      const pn = K.part(s < 0 ? 'armL' : 'armR', [s * tw * 0.52, sy - 0.15, 0.05], 'body');
      const ax = s * tw * 0.6;
      K.add(pn, 'sph', skin, [ax, sy - 0.15, 0.05], 0.3);
      K.add(pn, 'cylt', skin, [ax + s * 0.04, sy - 0.15 - arm * 0.5, 0.1], [0.25, arm, 0.25], [0, 0, Math.PI]);
      K.add(pn, 'dod', skin, [ax + s * 0.05, sy - 0.15 - arm, 0.12], 0.3);
      if (s > 0) weaponR(x, pn, ax + 0.05, sy - 0.15 - arm, 0.15);
    }
    const hy = sy + hr * 0.4;
    K.part('head', [0, sy - 0.05, 0.2], 'body');
    K.add('head', 'sph', skin, [0, hy, 0.25], [hr * 2.2, hr * 2, hr * 2.1]);
    K.add('head', 'box', skin, [0, hy - hr * 0.6, hr * 1.5], [hr * 1.6, hr * 0.6, hr * 1.0]);
    eyes(x, 'head', 0, hy + hr * 0.2, 0.25 + hr * 0.95, hr * 0.42, hr * 0.2);
    headGear(x, 'head', 0, hy, 0.25, hr * 1.1, { earCol: skin, noFlame: false });
  },
  gol(x) {
    const { K, pal, has, v, r, R } = x;
    const leg = v(0.45, 0.6), th = v(0.75, 0.95), tw = v(0.8, 1.0), arm = v(0.8, 1.0);
    const stone = pal.p1, stone2 = pal.p3, sy = leg + th;
    K.part('body', [0, leg, 0]);
    K.add('body', 'dod', stone, [0, leg + th * 0.5, 0], [tw, th, tw * 0.75]);
    K.add('body', 'dod', stone2, [0, sy, -0.08], [tw * 0.9, th * 0.45, tw * 0.6]);
    if (has('plates')) { K.add('body', 'box', pal.metal, [0, leg + th * 0.5, tw * 0.3], [tw * 0.8, th * 0.7, 0.12]); for (let i = 0; i < 6; i++) K.add('body', 'sphl', pal.trim, [(i % 3 - 1) * tw * 0.3, leg + th * (0.3 + Math.floor(i / 3) * 0.35), tw * 0.37], 0.06); }
    if (has('coral')) for (let i = 0; i < 5; i++) K.add('body', 'cyl', pal.coral, [(i - 2) * 0.18, sy + 0.15, -0.1], [0.06, 0.5, 0.06], [-0.2, 0, (i - 2) * 0.35]);
    if (has('chains')) for (let i = 0; i < 6; i++) K.add('body', 'tor', '#7a7a84', [-tw * 0.45 + i * tw * 0.18, leg + th * 0.75 - Math.sin(i / 5 * Math.PI) * 0.25, tw * 0.38], 0.12, [0, i % 2 ? Math.PI / 2 : 0, 0]);
    if (has('shell')) K.add('body', 'hemi', pal.p2, [0, sy - 0.1, -tw * 0.3], [tw * 1.2, tw * 0.9, tw * 0.8], [-Math.PI / 2, 0, 0]);
    K.add('body', 'ico', has('glowcore') || r >= 2 ? pal.acc : '#555', [0, leg + th * 0.55, tw * 0.33], 0.22, null, has('glowcore') || r >= 2 ? 'g' : 'l');
    for (let i = 0; i < 5; i++) K.add('body', 'box', pal.acc, [Math.cos(i * 1.7) * tw * 0.35, leg + th * (0.2 + (i % 3) * 0.25), Math.sin(i * 1.7) * 0.1 + tw * 0.36], [0.03, 0.18, 0.02], [0, 0, i], r >= 1 ? 'g' : 'l');
    if (has('shards')) for (let i = 0; i < 5; i++) K.add('body', 'oct', pal.acc, [(i - 2) * tw * 0.22, sy + 0.2 + Math.abs(i - 2) * -0.06, -0.15], [0.16, 0.55 - Math.abs(i - 2) * 0.1, 0.16], [0, i, (i - 2) * 0.25], 'g');
    if (has('spikes')) for (let i = 0; i < 4; i++) K.add('body', 'cone', pal.dark, [(i - 1.5) * 0.25, sy + 0.1, -0.3], [0.14, 0.45, 0.14], [-0.5, 0, (i - 1.5) * 0.3]);
    if (has('flames')) for (let i = 0; i < 3; i++) K.add('body', 'cone', i === 1 ? '#ffd23a' : '#ff6a1a', [(i - 1) * 0.3, sy + 0.25, -0.05], [0.2, 0.6, 0.2], [-0.2, 0, (i - 1) * 0.3], 'g');
    for (const s of [-1, 1]) {
      const pn = K.part(s < 0 ? 'legL' : 'legR', [s * tw * 0.28, leg, 0]);
      K.add(pn, 'box', stone2, [s * tw * 0.28, leg * 0.55, 0], [0.32, leg * 0.8, 0.34], [0, 0.2 * s, 0]);
      K.add(pn, 'dod', stone, [s * tw * 0.28, 0.1, 0.06], [0.4, 0.22, 0.48]);
    }
    for (const s of [-1, 1]) {
      const pn = K.part(s < 0 ? 'armL' : 'armR', [s * tw * 0.62, sy - 0.1, 0], 'body');
      const ax = s * tw * 0.75;
      K.add(pn, 'dod', stone2, [ax, sy - 0.05, 0], 0.42);
      K.add(pn, 'box', stone, [ax + s * 0.03, sy - 0.1 - arm * 0.45, 0.05], [0.3, arm * 0.6, 0.3], [0, 0, s * 0.08]);
      K.add(pn, 'dod', stone2, [ax + s * 0.06, sy - 0.15 - arm * 0.9, 0.08], 0.42);
    }
    K.part('head', [0, sy + 0.1, 0.05], 'body');
    K.add('head', 'box', stone, [0, sy + 0.28, 0.1], [0.42, 0.36, 0.38]);
    eyes(x, 'head', 0, sy + 0.3, 0.3, 0.1, 0.05);
    if (has('helm')) K.add('head', 'box', pal.metal, [0, sy + 0.45, 0.1], [0.5, 0.16, 0.46]);
    headGear(x, 'head', 0, sy + 0.28, 0.1, 0.2, { noFlame: true });
  },
  qd(x) {
    const { K, pal, has, v, r, c } = x;
    const longLeg = has('antlers') || has('unihorn') || has('mane') ? 1 : 0, shortLeg = has('shell') || has('claws') || has('snout') ? 1 : 0;
    const leg = longLeg ? v(0.6, 0.8) : shortLeg ? v(0.22, 0.32) : v(0.38, 0.52);
    const bl = v(0.9, 1.2) + (has('shell') ? 0.2 : 0), bw = v(0.42, 0.58) + (has('plates') ? 0.08 : 0), bh = bw * v(0.85, 1.05);
    const by = leg + bh * 0.4;
    const fur = pal.p1;
    K.part('body', [0, by, 0]);
    K.add('body', 'sph', fur, [0, by, 0], [bw, bh, bl]);
    K.add('body', 'sph', pal.light, [0, by - bh * 0.18, bl * 0.12], [bw * 0.8, bh * 0.6, bl * 0.7]);
    backGear(x, 'body', 0, by + bh * 0.45, 0, bw, bl);
    if (has('wings')) wings(x, 'body', 0, by + bh * 0.4, bl * 0.15, 0.9, 'wings');
    const legs = [['legFL', -1, 1], ['legFR', 1, 1], ['legBL', -1, -1], ['legBR', 1, -1]];
    for (const [n, sx, sz] of legs) {
      const lx = sx * bw * 0.32, lz = sz * bl * 0.3;
      K.part(n, [lx, by - bh * 0.1, lz]);
      K.add(n, 'cylt', pal.dark, [lx, (by - bh * 0.1) * 0.5, lz], [0.14 + bw * 0.12, by - bh * 0.1, 0.14 + bw * 0.12], [0, 0, Math.PI]);
      K.add(n, 'box', longLeg ? '#2a2420' : pal.p3, [lx, 0.04, lz + 0.03], [0.15, 0.08, 0.18]);
      if (has('claws')) for (let i = -1; i <= 1; i++) K.add(n, 'cone', pal.bone, [lx + i * 0.05, 0.05, lz + 0.14], [0.03, 0.12, 0.03], [Math.PI / 2, 0, 0]);
    }
    if (has('tail') || has('mane')) {
      K.part('tail', [0, by + bh * 0.1, -bl * 0.45], 'body');
      const tl = has('ears') && has('tail') ? 0.75 : 0.55;
      K.add('tail', has('ears') && !has('spikes') ? 'sph' : 'cone', pal.p2, [0, by + bh * 0.1 + 0.05, -bl * 0.45 - tl * 0.45], [0.18, tl, 0.18], [-2.2, 0, 0], has('glowcore') ? 'g' : 'l');
      if (has('flames')) K.add('tail', 'cone', '#ffb23a', [0, by + bh * 0.2, -bl * 0.45 - tl * 0.8], [0.14, 0.4, 0.14], [-2.3, 0, 0], 'g');
    }
    const neck = longLeg ? 0.42 : 0.2, hr = v(0.19, 0.26) * (has('shell') ? 0.85 : 1);
    const hz = bl * 0.5 + 0.08, hy = by + bh * 0.25 + neck;
    K.part('head', [0, by + bh * 0.2, bl * 0.42], 'body');
    if (neck > 0.3) K.add('head', 'cylt', fur, [0, by + bh * 0.2 + neck * 0.5, bl * 0.45], [0.2, neck + 0.1, 0.22], [0.35, 0, 0]);
    K.add('head', 'sph', fur, [0, hy, hz], [hr * 2, hr * 1.9, hr * 2.1]);
    K.add('head', has('snout') ? 'cone' : 'box', pal.light, [0, hy - hr * 0.3, hz + hr * 1.0], has('snout') ? [hr * 0.9, hr * 1.6, hr * 0.9] : [hr * 1.1, hr * 0.8, hr * 1.2], has('snout') ? [Math.PI / 2, 0, 0] : null);
    K.add('head', 'sphl', '#1a1014', [0, hy - hr * 0.15, hz + hr * 1.62], hr * 0.2);
    eyes(x, 'head', 0, hy + hr * 0.25, hz + hr * 0.82, hr * 0.45, hr * 0.17);
    headGear(x, 'head', 0, hy, hz, hr, { earCol: fur, maneCol: has('flames') ? '#ff8a2a' : pal.p2 });
    if (has('mane')) for (let i = 0; i < 5; i++) K.add('body', 'cone', has('flames') ? '#ff8a2a' : pal.p2, [0, by + bh * 0.4, bl * 0.35 - i * 0.12], [0.16, 0.36, 0.16], [-0.6, 0, 0], has('flames') || has('halo') ? 'g' : 'l');
  },
  drk(x) {
    const { K, pal, has, v, r } = x;
    const leg = v(0.45, 0.6), bl = v(1.1, 1.4), bw = v(0.5, 0.65), bh = bw * 0.95, by = leg + bh * 0.4;
    K.part('body', [0, by, 0]);
    K.add('body', 'sph', pal.p1, [0, by, 0], [bw, bh, bl]);
    K.add('body', 'sph', pal.light, [0, by - bh * 0.2, bl * 0.1], [bw * 0.75, bh * 0.55, bl * 0.75]);
    backGear(x, 'body', 0, by + bh * 0.45, 0, bw, bl);
    for (const [n, sx, sz] of [['legFL', -1, 1], ['legFR', 1, 1], ['legBL', -1, -1], ['legBR', 1, -1]]) {
      const lx = sx * bw * 0.4, lz = sz * bl * 0.3;
      K.part(n, [lx, by - bh * 0.1, lz]);
      K.add(n, 'cylt', pal.p1, [lx, (by - bh * 0.1) * 0.5, lz], [0.2, by - bh * 0.1, 0.2], [0, 0, Math.PI]);
      for (let i = -1; i <= 1; i++) K.add(n, 'cone', pal.bone, [lx + i * 0.06, 0.05, lz + 0.14], [0.04, 0.14, 0.04], [Math.PI / 2, 0, 0]);
    }
    wings(x, 'body', 0, by + bh * 0.45, bl * 0.12, v(1.1, 1.4), has('fwings') ? 'fwings' : 'wings');
    K.part('tail', [0, by, -bl * 0.45], 'body');
    for (let i = 0; i < 4; i++) K.add('tail', 'cone', i % 2 ? pal.p1 : pal.p2, [0, by - i * 0.08, -bl * 0.45 - 0.2 - i * 0.3], [0.26 - i * 0.05, 0.45, 0.26 - i * 0.05], [-1.75, 0, 0]);
    if (has('spikes')) K.add('tail', 'cone4', pal.acc, [0, by - 0.32, -bl * 0.45 - 1.35], [0.2, 0.35, 0.06], [-1.6, 0, 0], 'g');
    const nk = 0.6, hr = 0.24;
    K.part('head', [0, by + bh * 0.3, bl * 0.42], 'body');
    for (let i = 0; i < 3; i++) K.add('head', 'sph', pal.p1, [0, by + bh * 0.35 + i * nk * 0.33, bl * 0.48 + i * 0.12], 0.3 - i * 0.03);
    const hy = by + bh * 0.4 + nk, hz = bl * 0.5 + 0.4;
    K.add('head', 'sph', pal.p1, [0, hy, hz], [hr * 2.1, hr * 1.7, hr * 2.4]);
    K.add('head', 'box', pal.p1, [0, hy - hr * 0.2, hz + hr * 1.3], [hr * 1.3, hr * 0.8, hr * 1.6]);
    K.add('head', 'box', pal.dark, [0, hy - hr * 0.7, hz + hr * 1.2], [hr * 1.1, hr * 0.25, hr * 1.4]);
    for (let i = -1; i <= 1; i += 2) K.add('head', 'cone', '#ffffff', [i * hr * 0.4, hy - hr * 0.6, hz + hr * 1.8], [hr * 0.12, hr * 0.3, hr * 0.12], [Math.PI, 0, 0]);
    eyes(x, 'head', 0, hy + hr * 0.25, hz + hr * 0.9, hr * 0.55, hr * 0.17);
    if (has('flames') || r >= 3) K.add('head', 'cone', '#ffb43a', [0, hy - hr * 0.3, hz + hr * 2.5], [hr * 0.5, hr * 1.1, hr * 0.5], [Math.PI / 2, 0, 0], 'a');
    headGear(x, 'head', 0, hy, hz, hr, { noFlame: true });
  },
  srp(x) {
    const { K, pal, has, v, r } = x;
    const th = v(0.22, 0.3), coils = 3;
    K.part('body', [0, 0, 0]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; K.add('body', 'sph', i % 2 ? pal.p1 : pal.p2, [Math.cos(a) * 0.5, th * 0.8, Math.sin(a) * 0.45 - 0.1], [th * 2.2, th * 1.6, th * 2.2]); }
    K.part('neck', [0, th, 0.3]);
    const pts = [];
    for (let i = 0; i < 9; i++) { const t = i / 8; pts.push([Math.sin(t * Math.PI * 1.4) * 0.25, th + t * 1.45, 0.3 + Math.sin(t * Math.PI) * 0.3 - t * 0.15]); }
    pts.forEach((p, i) => { const s = th * (2.2 - i * 0.12); K.add('neck', 'sph', i % 2 ? pal.p1 : pal.p2, p, [s, s * 1.1, s]); if (i % 2 === 0) K.add('neck', 'sph', pal.light, [p[0], p[1], p[2] + s * 0.35], [s * 0.7, s * 0.8, s * 0.4]); });
    if (has('spikes') || has('fin') || has('crest')) for (let i = 1; i < 8; i++) { const p = pts[i]; K.add('neck', has('fin') ? 'wedge' : 'cone', has('crest') ? pal.acc : pal.p3, [p[0], p[1], p[2] - th * 0.9], has('fin') ? [0.03, 0.25, 0.25] : [0.08, 0.25, 0.08], has('fin') ? [0, Math.PI / 2, 0] : [-1.2, 0, 0], has('crest') && r >= 2 ? 'g' : 'l'); }
    if (has('plates')) for (let i = 1; i < 8; i += 2) K.add('neck', 'box', pal.metal, [pts[i][0], pts[i][1], pts[i][2] - th * 0.7], [th * 1.6, 0.12, 0.2]);
    if (has('flames') || has('glowcore')) for (let i = 2; i < 8; i += 2) K.add('neck', 'sph', pal.acc, [pts[i][0], pts[i][1], pts[i][2] + th * 0.75], th * 0.35, null, 'g');
    if (has('leaves')) for (let i = 1; i < 9; i += 2) K.add('neck', 'oct', pal.leaf, [pts[i][0] + 0.12, pts[i][1], pts[i][2] - 0.1], [0.2, 0.06, 0.28], [0.4, i, 0.3]);
    const top = pts[8], hr = th * 1.25;
    const headAt = (px, py, pz, s) => {
      K.add('neck', 'sph', pal.p1, [px, py + hr * 0.4, pz + hr * 0.2], [hr * 2 * s, hr * 1.7 * s, hr * 2.4 * s]);
      K.add('neck', 'box', pal.p1, [px, py + hr * 0.2, pz + hr * 1.3 * s], [hr * 1.2 * s, hr * 0.7 * s, hr * 1.5 * s]);
      eyes(x, 'neck', px, py + hr * 0.65, pz + hr * 1.0 * s, hr * 0.5 * s, hr * 0.17 * s);
    };
    headAt(top[0], top[1], top[2], 1);
    if (has('heads3')) for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) K.add('neck', 'sph', pal.p1, [top[0] + s * (0.15 + i * 0.12), top[1] - 0.6 + i * 0.12, top[2] - 0.05], th * 1.4);
      headAt(top[0] + s * 0.62, top[1] - 0.15, top[2] + 0.05, 0.85);
      K.add('neck', 'cone', pal.bone, [top[0] + s * 0.62, top[1] + 0.25, top[2]], [0.06, 0.25, 0.06], [-0.4, 0, -s * 0.4]);
    }
    if (has('trident') || has('halo') && has('crown')) {
      for (const s of [-1, 1]) {
        const pn = K.part(s < 0 ? 'armL' : 'armR', [s * th * 1.1, top[1] - 0.35, top[2]], 'neck');
        K.add(pn, 'cylt', pal.light, [s * (th * 1.1 + 0.15), top[1] - 0.5, top[2] + 0.05], [0.08, 0.38, 0.08], [0, 0, s * 0.6 + Math.PI]);
        if (s > 0) weaponR(x, pn, s * (th * 1.1 + 0.3), top[1] - 0.65, top[2] + 0.08);
      }
    }
    headGear(x, 'neck', top[0], top[1] + hr * 0.4, top[2] + hr * 0.2, hr, { noEars: false });
  },
  avi(x) {
    const { K, pal, has, v, r, c } = x;
    const bw = v(0.36, 0.48), bl = v(0.62, 0.8), hov = 0.55, by = hov + 0.4;
    K.part('body', [0, by, 0]);
    K.add('body', 'sph', pal.p1, [0, by, 0], [bw, bw * 1.05, bl]);
    K.add('body', 'sph', pal.light, [0, by - bw * 0.18, bl * 0.16], [bw * 0.75, bw * 0.75, bl * 0.6]);
    backGear(x, 'body', 0, by + bw * 0.3, -0.05, bw, bl * 0.8);
    for (const s of [-1, 1]) {
      const pn = K.part(s < 0 ? 'legL' : 'legR', [s * bw * 0.2, by - bw * 0.35, 0.05], 'body');
      K.add(pn, 'cyl', '#c9a050', [s * bw * 0.2, by - bw * 0.35 - 0.18, 0.05], [0.05, 0.36, 0.05]);
      for (let i = -1; i <= 1; i++) K.add(pn, 'cone', '#c9a050', [s * bw * 0.2 + i * 0.05, by - bw * 0.35 - 0.38, 0.1], [0.03, 0.12, 0.03], [Math.PI / 2 + 0.6, 0, 0]);
    }
    wings(x, 'body', 0, by + bw * 0.25, 0.05, v(0.85, 1.15) * (c.r >= 3 ? 1.2 : 1), has('wings') ? 'wings' : 'fwings');
    K.part('tail', [0, by, -bl * 0.42], 'body');
    for (let i = -2; i <= 2; i++) K.add('tail', 'sph', i % 2 ? pal.p2 : pal.p3, [i * 0.07, by - 0.05, -bl * 0.42 - 0.25], [0.1, 0.03, 0.5], [0.4, i * 0.25, 0], has('flames') && Math.abs(i) === 2 ? 'g' : 'l');
    if (has('flames')) for (let i = -1; i <= 1; i++) K.add('tail', 'cone', '#ffb23a', [i * 0.12, by - 0.02, -bl * 0.42 - 0.5], [0.08, 0.45, 0.08], [-1.9, 0, 0], 'g');
    const hr = v(0.17, 0.22), hy = by + bw * 0.55 + hr, hz = bl * 0.42;
    K.part('head', [0, by + bw * 0.4, bl * 0.35], 'body');
    K.add('head', 'sph', pal.p1, [0, hy, hz], hr * 2);
    const beak = has('ears') && has('wings') ? '#2a2026' : '#f0b030';
    K.add('head', 'cone', beak, [0, hy - hr * 0.15, hz + hr * 1.25], [hr * 0.6, hr * (has('wings') ? 0.5 : 1.1), hr * 0.6], [Math.PI / 2, 0, 0]);
    if (has('ears') && !has('wings')) { K.add('head', 'sph', '#fff4d0', [-hr * 0.42, hy + hr * 0.1, hz + hr * 0.75], hr * 0.55); K.add('head', 'sph', '#fff4d0', [hr * 0.42, hy + hr * 0.1, hz + hr * 0.75], hr * 0.55); }
    eyes(x, 'head', 0, hy + hr * 0.12, hz + hr * 0.9, hr * 0.42, hr * 0.2);
    headGear(x, 'head', 0, hy, hz, hr, { earCol: pal.p1 });
  },
  flt(x) {
    const { K, pal, has, v, r, R } = x;
    const cy = 1.0, cr = v(0.35, 0.45);
    K.part('body', [0, cy, 0]);
    if (has('shards')) {
      K.add('body', 'oct', pal.acc, [0, cy, 0], [cr * 1.6, cr * 2.4, cr * 1.6], null, 'g');
      K.add('body', 'oct', pal.p1, [0, cy, 0], [cr * 1.9, cr * 1.4, cr * 1.9], [0, 0.4, 0]);
    } else if (has('mush')) {
      K.add('body', 'cylt', '#f0e4cc', [0, cy - 0.25, 0], [cr * 1.0, cr * 1.3, cr * 1.0]);
      K.add('body', 'hemi', '#c8503a', [0, cy + 0.05, 0], [cr * 2.6, cr * 1.6, cr * 2.6]);
      for (let i = 0; i < 6; i++) K.add('body', 'sphl', '#fff0e0', [Math.cos(i) * cr * 0.8, cy + cr * 0.55, Math.sin(i) * cr * 0.8], cr * 0.2);
      for (let i = 0; i < 6; i++) K.add('body', 'sphl', '#e8f0a0', [Math.cos(i * 1.1) * cr * 1.6, cy - 0.3 + (i % 3) * 0.2, Math.sin(i * 1.1) * cr * 1.2], 0.06, null, 'g');
    } else if (has('iwings')) {
      K.add('body', 'sph', '#ffe8d0', [0, cy + 0.32, 0], cr * 0.85);
      K.add('body', 'cone', pal.p1, [0, cy - 0.12, 0], [cr * 0.9, cr * 1.5, cr * 0.9], [Math.PI, 0, 0]);
      K.add('body', 'sph', pal.leaf, [0, cy + 0.5, -0.03], [cr * 0.95, cr * 0.5, cr * 0.95]);
      wings(x, 'body', 0, cy + 0.1, -0.08, 0.75, 'iwings');
    } else {
      K.add('body', has('spikes') ? 'sph' : 'ico', pal.p1, [0, cy, 0], cr * 2);
      K.add('body', 'sph', pal.light, [0, cy - cr * 0.3, cr * 0.4], [cr * 1.4, cr * 1.0, cr * 1.0]);
      if (has('spikes')) for (let i = 0; i < 14; i++) { const a = i * 2.4, b = Math.acos(1 - 2 * (i + 0.5) / 14); const d = new THREE.Vector3(Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)); K.add('body', 'cone', pal.p3, [d.x * cr * 1.05, cy + d.y * cr * 1.05, d.z * cr * 1.05], [0.08, 0.3, 0.08], new THREE.Quaternion().setFromUnitVectors(UP_V, d)); }
      if (has('fin')) for (const s of [-1, 1]) K.add('body', 'wedge', pal.acc, [s * cr * 1.0, cy, 0], [0.04, 0.35, 0.3], [0, 0, s * 0.5]);
      if (has('eye1')) { K.add('body', 'sph', '#ffffff', [0, cy + 0.05, cr * 0.75], cr * 0.9); K.add('body', 'sph', pal.eye, [0, cy + 0.05, cr * 1.15], cr * 0.42, null, 'g'); K.add('body', 'sph', '#05040a', [0, cy + 0.05, cr * 1.3], cr * 0.2); }
    }
    if (!has('eye1') && !has('iwings')) eyes(x, 'body', 0, cy + cr * 0.15, cr * 0.95, cr * 0.35, cr * 0.16);
    if (has('iwings')) eyes(x, 'body', 0, cy + 0.34, cr * 0.75, cr * 0.25, cr * 0.1);
    if (has('glowcore')) K.add('body', 'ico', pal.acc, [0, cy + (has('iwings') ? 0 : 0), cr * 0.2], cr * 0.6, null, 'a');
    K.part('orbit', [0, cy, 0]);
    const n = has('shards') ? 5 : has('halo') ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, rad = cr * 2.2;
      if (has('shards') || has('halo')) K.add('orbit', has('halo') && !has('shards') ? 'box' : 'oct', pal.acc, [Math.cos(a) * rad, cy + Math.sin(a * 2) * 0.15, Math.sin(a) * rad], has('halo') && !has('shards') ? [0.3, 0.4, 0.06] : [0.14, 0.32, 0.14], [0, -a, 0], 'g');
      else K.add('orbit', 'sphl', pal.acc, [Math.cos(a) * rad, cy, Math.sin(a) * rad], 0.07, null, 'g');
    }
    headGear(x, 'body', 0, cy + cr * 0.6, 0, cr * 0.7, { noEars: false, noMush: true });
    if (has('leaves') && !has('iwings')) for (let i = 0; i < 5; i++) K.add('body', 'oct', pal.leaf, [Math.cos(i * 1.3) * cr, cy + 0.1, Math.sin(i * 1.3) * cr], [0.2, 0.06, 0.3], [0.4, i, 0]);
  },
  swm(x) {
    const { K, pal, has, R, r } = x;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + R(), rad = 0.25 + R() * 0.35, px = Math.cos(a) * rad, pz = Math.sin(a) * rad * 0.8, py = 0.35 + R() * 0.7;
      const s = 0.12 + R() * 0.08, pn = K.part('m' + i, [px, py, pz]);
      const col = i % 2 ? pal.p1 : pal.p2;
      if (has('fin')) { K.add(pn, 'sph', '#c8d8e8', [px, py, pz], [s * 1.2, s * 1.1, s * 2.2]); K.add(pn, 'cone', '#a8c0d8', [px, py, pz - s * 1.4], [s * 0.9, s * 0.8, s * 0.2], [-Math.PI / 2, 0, 0]); }
      else if (has('flames') || has('glowcore')) { K.add(pn, 'ico', pal.acc, [px, py, pz], s * 1.8, null, 'g'); K.add(pn, 'cone', has('flames') ? '#ff7a1a' : '#fff6c0', [px, py + s * 1.0, pz], [s * 1.1, s * 1.8, s * 1.1], null, 'a'); }
      else if (has('iwings')) { K.add(pn, 'sph', '#e8c040', [px, py, pz], [s, s, s * 2]); K.add(pn, 'box', '#2a2010', [px, py, pz], [s * 1.02, s * 0.3, s * 0.6]); K.add(pn, 'cone', '#2a2010', [px, py, pz + s * 1.3], [s * 0.2, s * 0.8, s * 0.2], [Math.PI / 2, 0, 0]); K.add(pn, 'sph', '#d8f0ff', [px, py + s * 0.6, pz], [s * 2.6, s * 0.1, s * 0.8], null, 'a'); }
      else if (has('ears')) { K.add(pn, 'sph', '#6a6070', [px, py * 0.4, pz], [s * 1.3, s, s * 1.8]); K.add(pn, 'cone', '#c8a0a0', [px, py * 0.4, pz - s * 1.6], [s * 0.2, s * 1.4, s * 0.2], [-Math.PI / 2, 0, 0]); for (const k of [-1, 1]) K.add(pn, 'sph', '#c8a0a0', [px + k * s * 0.5, py * 0.4 + s * 0.6, pz + s * 0.5], s * 0.5); }
      else { K.add(pn, 'dod', col, [px, py * 0.5, pz], s * 2); }
      eyes(x, pn, px, (has('ears') ? py * 0.4 : has('fin') || has('flames') || has('glowcore') || has('iwings') ? py : py * 0.5) + s * 0.15, pz + s * 0.85, s * 0.35, s * 0.17);
    }
    x.topY = 1.2;
  },
  crw(x) {
    const { K, pal, has, v, r } = x;
    const spider = has('eye3'), snail = has('snail'), bw = v(0.45, 0.6), bl = v(0.55, 0.75), by = snail ? 0.2 : 0.38;
    K.part('body', [0, by, 0]);
    if (snail) {
      K.add('body', 'sph', pal.light, [0, 0.14, 0.1], [0.34, 0.24, 1.0]);
      for (let i = 0; i < 4; i++) K.add('body', 'tor', i % 2 ? pal.p2 : pal.p1, [0, 0.55 + i * 0.03, -0.12], [0.42 - i * 0.08, 0.42 - i * 0.08, 0.6], [0, Math.PI / 2, 0]);
      K.add('body', 'sph', pal.p1, [0, 0.55, -0.12], [0.28, 0.6, 0.6]);
      K.part('head', [0, 0.3, 0.45], 'body');
      for (const s of [-1, 1]) { K.add('head', 'cyl', pal.light, [s * 0.08, 0.45, 0.55], [0.04, 0.35, 0.04], [0.3, 0, -s * 0.25]); K.add('head', 'sph', pal.eye, [s * 0.13, 0.62, 0.6], 0.07, null, 'g'); }
      if (has('glowcore')) for (let i = 0; i < 4; i++) K.add('body', 'sph', pal.acc, [0, 0.01, -0.3 - i * 0.25], [0.3 - i * 0.05, 0.02, 0.22], null, 'g');
      x.topY = 1.0;
      return;
    }
    K.add('body', 'sph', pal.p1, [0, by, 0], [bw * 1.6, bw * 0.9, bl * 1.6]);
    if (spider) K.add('body', 'sph', pal.p2, [0, by + 0.15, -bl * 0.9], [bw * 1.8, bw * 1.5, bl * 1.6]);
    backGear(x, 'body', 0, by + bw * 0.4, 0, bw * 1.4, bl * 1.4);
    const nl = spider ? 8 : 6;
    for (let i = 0; i < nl; i++) {
      const s = i % 2 ? 1 : -1, k = Math.floor(i / 2), lz = bl * (0.45 - k * (spider ? 0.32 : 0.45));
      const pn = K.part('leg' + i, [s * bw * 0.6, by, lz], 'body');
      K.add(pn, 'cyl', pal.dark, [s * (bw * 0.6 + 0.2), by + 0.1, lz], [0.06, 0.45, 0.06], [0, 0, s * 1.0]);
      K.add(pn, 'cylt', pal.dark, [s * (bw * 0.6 + 0.45), by * 0.45, lz + 0.03], [0.05, by + 0.15, 0.05], [0, 0, Math.PI - s * 0.25]);
    }
    const hz = bl * 0.85;
    K.part('head', [0, by, bl * 0.7], 'body');
    K.add('head', 'sph', pal.p3, [0, by + 0.02, hz], [bw * 0.9, bw * 0.7, bw * 0.8]);
    eyes(x, 'head', 0, by + 0.1, hz + bw * 0.35, bw * 0.2, 0.05);
    if (spider) for (let i = 0; i < 4; i++) K.add('head', 'sph', pal.eye, [(i - 1.5) * 0.08, by + 0.2, hz + bw * 0.3], 0.035, null, 'g');
    if (has('claws')) for (const s of [-1, 1]) {
      const pn = K.part(s < 0 ? 'armL' : 'armR', [s * bw * 0.6, by, bl * 0.7], 'body');
      K.add(pn, 'cyl', pal.p2, [s * bw * 0.8, by + 0.05, bl * 0.95], [0.08, 0.4, 0.08], [1.2, 0, s * 0.4]);
      K.add(pn, 'sph', pal.p2, [s * bw * 0.95, by + 0.15, bl * 1.25], [0.28, 0.18, 0.32]);
      K.add(pn, 'cone', pal.p2, [s * bw * 0.85, by + 0.22, bl * 1.45], [0.08, 0.28, 0.08], [1.3, 0, s * 0.3]);
    }
    if (has('horns')) { K.add('head', 'cone', pal.p2, [0, by + 0.25, hz + 0.2], [0.12, 0.6, 0.12], [0.5, 0, 0]); K.add('head', 'cone', pal.p2, [0, by + 0.45, hz + 0.33], [0.06, 0.2, 0.06], [-0.4, 0, 0]); }
    if (has('glowcore')) K.add('body', 'ico', pal.acc, [0, by + bw * 0.45, -bl * 0.1], 0.18, null, 'g');
    if (spider) for (let i = 0; i < 3; i++) K.add('body', 'box', pal.acc, [0, by + 0.42, -bl * 0.9 + (i - 1) * 0.15], [0.3 - i * 0.05, 0.02, 0.04], null, 'g');
    x.topY = by + 0.7;
  },
  ent(x) {
    const { K, pal, has, v, r } = x;
    const h = v(1.25, 1.5), tw = v(0.32, 0.4), bark = '#6a4a30', bark2 = '#4a3422';
    K.part('body', [0, 0.2, 0]);
    K.add('body', 'cylt', bark, [0, h * 0.5, 0], [tw * 2, h, tw * 2]);
    for (let i = 0; i < 5; i++) K.add('body', 'box', bark2, [Math.cos(i * 1.25) * tw * 0.85, h * (0.3 + (i % 3) * 0.2), Math.sin(i * 1.25) * tw * 0.85], [0.06, h * 0.35, 0.06], [0, 0, 0.1]);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; K.add('body', 'cone', bark2, [Math.cos(a) * tw * 1.1, 0.12, Math.sin(a) * tw * 1.1], [0.16, 0.5, 0.16], [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2]); }
    K.add('body', 'sph', '#1a1008', [0, h * 0.72, tw * 0.86], [tw * 1.1, tw * 0.8, 0.12]);
    eyes(x, 'body', 0, h * 0.75, tw * 0.95, tw * 0.3, 0.06);
    if (has('glowcore')) K.add('body', 'ico', pal.acc, [0, h * 0.45, tw * 0.85], 0.15, null, 'g');
    if (has('mush')) for (let i = 0; i < 3; i++) K.add('body', 'hemi', '#d8603a', [tw * 0.9, h * (0.3 + i * 0.12), 0.05 * i], [0.22 - i * 0.04, 0.12, 0.22 - i * 0.04], [0, 0, -0.3]);
    if (has('spikes')) for (let i = 0; i < 6; i++) K.add('body', 'cone', '#3a5a2a', [Math.cos(i) * tw, h * (0.2 + i * 0.1), Math.sin(i) * tw], [0.06, 0.25, 0.06], [Math.sin(i) * 1.3, 0, -Math.cos(i) * 1.3]);
    for (const s of [-1, 1]) {
      const pn = K.part(s < 0 ? 'armL' : 'armR', [s * tw * 0.9, h * 0.8, 0], 'body');
      K.add(pn, 'cylt', bark, [s * (tw + 0.32), h * 0.62, 0.05], [0.14, 0.8, 0.14], [0.2, 0, s * 2.4]);
      K.add(pn, 'cyl', bark2, [s * (tw + 0.62), h * 0.42, 0.12], [0.06, 0.35, 0.06], [0.4, 0, s * 0.6]);
      K.add(pn, 'cyl', bark2, [s * (tw + 0.52), h * 0.36, 0.2], [0.05, 0.3, 0.05], [0.9, 0, -s * 0.2]);
      if (has('leaves')) K.add(pn, 'ico', pal.leaf, [s * (tw + 0.58), h * 0.5, 0.05], 0.28);
    }
    K.part('head', [0, h + 0.2, 0], 'body');
    const leaf = pal.leaf, leaf2 = '#9ad85a';
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; K.add('head', 'ico', i % 2 ? leaf : leaf2, [Math.cos(a) * 0.42, h + 0.25 + (i % 3) * 0.12, Math.sin(a) * 0.36 - 0.05], 0.48 - (i % 3) * 0.06); }
    K.add('head', 'ico', leaf2, [0, h + 0.62, -0.05], 0.55);
    if (r >= 2) for (let i = 0; i < 5; i++) K.add('head', 'sphl', i % 2 ? '#ffd0f0' : '#fff6a0', [Math.cos(i * 1.4) * 0.55, h + 0.45 + (i % 2) * 0.2, Math.sin(i * 1.4) * 0.45 + 0.05], 0.07, null, 'g');
    x.topY = h + 1.0;
    const sx = { has: t => t !== 'leaves' && x.has(t) && t !== 'mush' };
    headGear(Object.assign({}, x, sx), 'head', 0, h + 0.6, 0, 0.35, { noEars: true, noMush: true });
  },
  ray(x) {
    const { K, pal, has, v, r } = x;
    const y = 0.9, w = v(1.1, 1.4);
    K.part('body', [0, y, 0]);
    K.add('body', 'oct', pal.p1, [0, y, 0.05], [w * 0.55, 0.22, 0.9]);
    K.add('body', 'oct', pal.light, [0, y - 0.04, 0.1], [w * 0.35, 0.14, 0.6]);
    for (const s of [-1, 1]) {
      const pn = K.part(s < 0 ? 'wingL' : 'wingR', [s * w * 0.2, y, 0], 'body');
      K.add(pn, 'wedge', pal.p1, [s * w * 0.48, y, 0], [w * 0.62, 0.05, 0.75], [0, s * Math.PI / 2 + Math.PI / 2, 0]);
      if (has('glowcore') || r >= 2) K.add(pn, 'wedge', pal.acc, [s * w * 0.5, y + 0.03, 0], [w * 0.35, 0.02, 0.42], [0, s * Math.PI / 2 + Math.PI / 2, 0], 'a');
    }
    K.part('tail', [0, y, -0.4], 'body');
    K.add('tail', 'cylt', pal.dark, [0, y, -0.4 - 0.6], [0.04, 1.2, 0.04], [Math.PI / 2, 0, 0]);
    K.add('tail', 'cone4', pal.acc, [0, y, -1.62], [0.1, 0.25, 0.03], [-Math.PI / 2, 0, 0], 'g');
    eyes(x, 'body', 0, y + 0.1, 0.42, 0.14, 0.05);
    if (has('glowcore')) for (let i = 0; i < 6; i++) K.add('body', 'sphl', '#ffffff', [Math.cos(i * 2) * 0.4, y + 0.1, Math.sin(i * 2) * 0.3], 0.03, null, 'g');
    x.topY = y + 0.3;
  },
  oct(x) {
    const { K, pal, has, v, r } = x;
    const jelly = has('glowcore') && !has('eye1') && !has('spikes'), hy = jelly ? 1.35 : 1.15, hr = v(0.42, 0.52) * (has('eye1') ? 1.2 : 1);
    K.part('head', [0, hy - 0.2, 0]);
    if (jelly) {
      K.add('head', 'hemi', pal.p1, [0, hy, 0], [hr * 2.4, hr * 1.8, hr * 2.4], null, 'a');
      K.add('head', 'hemi', pal.acc, [0, hy + 0.02, 0], [hr * 1.5, hr * 1.2, hr * 1.5], null, 'g');
      K.add('head', 'tor', pal.light, [0, hy, 0], [hr * 1.2, hr * 1.2, hr * 1.2], [Math.PI / 2, 0, 0]);
    } else {
      K.add('head', 'sph', pal.p1, [0, hy + hr * 0.4, -hr * 0.2], [hr * 2, hr * 2.6, hr * 2.1], [-0.3, 0, 0]);
      K.add('head', 'sph', pal.light, [0, hy - hr * 0.2, hr * 0.4], [hr * 1.5, hr * 1.0, hr * 1.2]);
      if (has('spikes')) for (let i = 0; i < 5; i++) K.add('head', 'cone', pal.p3, [(i - 2) * hr * 0.35, hy + hr * 1.5 - Math.abs(i - 2) * 0.1, -hr * 0.5], [0.1, 0.4, 0.1], [-0.6, 0, (i - 2) * 0.35]);
    }
    if (has('eye1')) { K.add('head', 'sph', '#fff8e8', [0, hy + hr * 0.1, hr * 0.75], hr * 1.0); K.add('head', 'sph', pal.eye, [0, hy + hr * 0.1, hr * 1.18], hr * 0.5, null, 'g'); K.add('head', 'box', '#05040a', [0, hy + hr * 0.1, hr * 1.42], [hr * 0.12, hr * 0.45, 0.02]); }
    else if (!jelly) eyes(x, 'head', 0, hy + hr * 0.05, hr * 0.85, hr * 0.42, hr * 0.17);
    if (has('glowcore') && !jelly) K.add('head', 'ico', pal.acc, [0, hy + hr * 1.1, 0], hr * 0.4, null, 'g');
    const nt = 8;
    K.part('tenA', [0, hy - 0.25, 0]);
    K.part('tenB', [0, hy - 0.25, 0]);
    for (let i = 0; i < nt; i++) {
      const a = i / nt * Math.PI * 2 + 0.2, pn = i % 2 ? 'tenA' : 'tenB';
      for (let k = 0; k < 6; k++) {
        const t = k / 5, rad = hr * 0.6 + t * (jelly ? 0.25 : 0.65), yy = hy - 0.25 - t * (jelly ? 1.15 : 0.95) + (jelly ? 0 : Math.max(0, t - 0.6) * 0.8);
        K.add(pn, jelly ? 'sphl' : 'sph', jelly ? (k % 2 ? pal.acc : pal.light) : k % 2 ? pal.p1 : pal.p2, [Math.cos(a) * rad, Math.max(0.05, yy), Math.sin(a) * rad + (jelly ? 0 : 0.1)], (jelly ? 0.07 : 0.17) * (1 - t * 0.6), null, jelly ? 'g' : 'l');
      }
    }
    if (has('chains')) for (let i = 0; i < 6; i++) K.add('head', 'tor', '#8a8a96', [Math.cos(i) * hr * 1.1, hy - 0.1 + i * 0.04, Math.sin(i) * hr * 1.0], 0.12, [i, 0, 0]);
    headGear(x, 'head', 0, hy + hr * (jelly ? 0.6 : 1.1), 0, hr * 0.8, { noEars: true });
  },
  fsh(x) {
    const { K, pal, has, v, r } = x;
    const whale = has('fin') && has('glowcore'), y = whale ? 1.0 : 0.95, bl = whale ? 1.6 : v(0.85, 1.05), bw = whale ? 0.75 : v(0.42, 0.55), angler = has('lure');
    K.part('body', [0, y, 0]);
    K.add('body', 'sph', pal.p1, [0, y, 0], [bw, bw * (angler ? 1.15 : 1.0), bl]);
    K.add('body', 'sph', pal.light, [0, y - bw * 0.22, bl * 0.05], [bw * 0.75, bw * 0.6, bl * 0.85]);
    K.add('body', 'wedge', pal.p2, [0, y + bw * 0.5, -bl * 0.05], [0.04, bw * 0.6, bl * 0.4], [0, Math.PI / 2, -0.3]);
    for (const s of [-1, 1]) K.add('body', 'wedge', pal.p2, [s * bw * 0.5, y - bw * 0.15, bl * 0.12], [0.03, bw * 0.4, bw * 0.45], [0.4, Math.PI / 2, s * 1.0]);
    K.part('tail', [0, y, -bl * 0.42], 'body');
    K.add('tail', 'cone', pal.p1, [0, y, -bl * 0.42 - 0.15], [bw * 0.5, 0.35, bw * 0.3], [-Math.PI / 2, 0, 0]);
    K.add('tail', 'wedge', pal.p2, [0, y, -bl * 0.42 - 0.38], whale ? [0.04, bw * 1.4, 0.5] : [0.04, bw * 1.1, 0.4], whale ? [Math.PI / 2, 0, Math.PI / 2] : [0, Math.PI / 2, 0]);
    eyes(x, 'body', 0, y + bw * 0.15, bl * 0.42, bw * 0.42, bw * 0.1);
    if (angler) {
      for (let i = 0; i < 6; i++) K.add('body', 'cone', '#ffffff', [(i - 2.5) * bw * 0.16, y - bw * 0.12, bl * 0.48], [0.04, 0.12, 0.04], [Math.PI + 0.3, 0, 0]);
      K.add('body', 'cylt', pal.dark, [0, y + bw * 0.75, bl * 0.3], [0.03, 0.6, 0.03], [0.8, 0, 0]);
      K.add('body', 'sph', '#fff8a0', [0, y + bw * 0.85, bl * 0.6], 0.12, null, 'g');
      K.add('body', 'sph', '#fff8a0', [0, y + bw * 0.85, bl * 0.6], 0.22, null, 'a');
    }
    if (has('unihorn')) K.add('body', 'cone', '#f4efe0', [0, y + 0.05, bl * 0.5 + 0.45], [0.08, 1.0, 0.08], [Math.PI / 2, 0, 0]);
    if (whale) { for (let i = 0; i < 6; i++) K.add('body', 'box', pal.light, [0, y - bw * 0.35, bl * 0.25 - i * 0.12], [bw * 0.7, 0.02, 0.04]); K.add('body', 'cone', '#bff6ff', [0, y + bw * 0.75, bl * 0.2], [0.12, 0.45, 0.12], null, 'a'); for (let i = 0; i < 8; i++) K.add('body', 'sphl', pal.acc, [Math.cos(i * 0.8) * bw * 0.42, y + bw * 0.2, Math.sin(i * 0.8) * bl * 0.3], 0.05, null, 'g'); }
    x.topY = y + bw * 0.8; x.headPart = 'body'; x.headZ = bl * 0.2;
  },
  spc(x) {
    const { K, pal, has, v, r } = x;
    const robe = has('crown') ? '#2a2038' : pal.cloth, y = 0.35, h = v(1.0, 1.2);
    K.part('body', [0, y, 0]);
    K.add('body', 'cone', robe, [0, y + h * 0.5, 0], [0.75, h, 0.6]);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; K.add('body', 'cone', robe, [Math.cos(a) * 0.3, y - 0.05, Math.sin(a) * 0.25], [0.12, 0.35, 0.12], [Math.PI, 0, 0]); }
    K.add('body', 'cyl', pal.trim, [0, y + h * 0.62, 0], [0.38, 0.05, 0.3]);
    if (has('glowcore')) K.add('body', 'ico', pal.acc, [0, y + h * 0.55, 0.18], 0.12, null, 'g');
    if (has('chains')) for (let i = 0; i < 5; i++) K.add('body', 'tor', '#7a7a84', [-0.25 + i * 0.12, y + h * 0.4, 0.22], 0.08, [0, i % 2 ? 1.5 : 0, 0]);
    for (const s of [-1, 1]) {
      const pn = K.part(s < 0 ? 'armL' : 'armR', [s * 0.22, y + h * 0.85, 0], 'body');
      K.add(pn, 'cylt', robe, [s * 0.32, y + h * 0.62, 0.08], [0.14, 0.5, 0.14], [0.3, 0, s * 0.35 + Math.PI]);
      K.add(pn, 'sphl', pal.bone, [s * 0.4, y + h * 0.4, 0.15], 0.08);
      if (s > 0) weaponR(x, pn, s * 0.4, y + h * 0.4, 0.15); else weaponL(x, pn, s * 0.4, y + h * 0.4, 0.15);
    }
    K.part('head', [0, y + h, 0], 'body');
    const hy = y + h + 0.15, hr = 0.2;
    K.add('head', 'cone', robe, [0, hy + 0.05, -0.05], [0.5, 0.62, 0.5]);
    K.add('head', 'sph', has('skull') ? pal.bone : '#08060c', [0, hy - 0.04, 0.09], [0.3, 0.3, 0.26]);
    if (has('skull')) { K.add('head', 'sph', '#08060c', [-0.06, hy, 0.2], 0.08); K.add('head', 'sph', '#08060c', [0.06, hy, 0.2], 0.08); }
    eyes(x, 'head', 0, hy - 0.02, 0.2, 0.06, 0.035);
    const sx = { has: t => t !== 'hood' && x.has(t) };
    headGear(Object.assign({}, x, sx), 'head', 0, hy + 0.1, 0, hr, { noEars: true });
  }
};

/* ---------- animation of a built model ---------- */
const FLYERS = { avi: 1, flt: 1, ray: 1, fsh: 1, spc: 1, swm: 1, oct: 0 };
function animModel(m, t, st, k) {
  const U = m.userData, P = U.P, body = U.def.body;
  t += U.ph;
  const fly = FLYERS[body];
  const inner = U.inner;
  inner.position.set(0, fly ? Math.sin(t * 2.2) * 0.06 * U.h : Math.sin(t * 2) * 0.008 * U.h, 0);
  inner.rotation.set(0, 0, 0);
  const walk = st === 'walk', atk = st === 'atk', cast = st === 'cast';
  const sw = walk ? Math.sin(t * 9) : 0;
  const set = (n, x, y, z) => { const g = P[n]; if (g) g.rotation.set(x, y || 0, z || 0); };
  set('legL', sw * 0.6); set('legR', -sw * 0.6);
  set('legFL', sw * 0.5); set('legBR', sw * 0.5); set('legFR', -sw * 0.5); set('legBL', -sw * 0.5);
  for (let i = 0; i < 8; i++) if (P['leg' + i]) set('leg' + i, 0, (walk ? Math.sin(t * 12 + i * 1.7) : Math.sin(t * 2 + i) * 0.15) * 0.25, 0);
  let aR = Math.sin(t * 1.6) * 0.06 - sw * 0.5, aL = -Math.sin(t * 1.6) * 0.06 + sw * 0.5;
  let lunge = 0, headX = Math.sin(t * 1.1) * 0.05;
  if (atk) {
    const melee = U.melee;
    if (melee) { aR = k < 0.45 ? -2.3 * easeOut(k / 0.45) : -2.3 + 3.0 * easeOut(clamp((k - 0.45) / 0.2, 0, 1)); lunge = Math.sin(k * Math.PI) * 0.35; headX = k < 0.5 ? -0.3 * k : 0.5 * Math.sin(k * Math.PI); }
    else { aR = -1.5 * Math.sin(Math.min(1, k * 1.5) * Math.PI * 0.5) + (k > 0.6 ? (k - 0.6) * 2 : 0); lunge = -Math.sin(k * Math.PI) * 0.08; }
  }
  if (cast) { const e = Math.sin(k * Math.PI); aR = -2.6 * e; aL = -2.6 * e; inner.position.y += e * 0.12 * U.h; }
  set('armR', aR, 0, 0.05); set('armL', aL, 0, -0.05);
  inner.position.z += lunge * U.h * 0.5;
  if (atk && !U.melee && body !== 'bip') inner.rotation.x = -Math.sin(k * Math.PI) * 0.08;
  if (atk && U.melee && !P.armR) inner.rotation.x = Math.sin(k * Math.PI) * 0.18;
  const flap = fly ? Math.sin(t * 7) * 0.5 : Math.sin(t * 2.4) * 0.15;
  if (P.wingL) { set('wingL', 0, 0, -flap - (cast ? 0.3 : 0)); set('wingR', 0, 0, flap + (cast ? 0.3 : 0)); }
  if (body === 'ray' && P.wingL) { set('wingL', 0, 0, -Math.sin(t * 3) * 0.35); set('wingR', 0, 0, Math.sin(t * 3) * 0.35); }
  set('tail', Math.sin(t * 1.7) * 0.06, Math.sin(t * 1.3) * (body === 'fsh' ? 0.45 : 0.25), 0);
  set('head', headX, Math.sin(t * 0.7) * 0.15, 0);
  set('neck', Math.sin(t * 1.2) * 0.05 + (atk ? Math.sin(k * Math.PI) * 0.25 : 0), 0, Math.sin(t * 0.9) * 0.07);
  set('cape', 0.1 + Math.sin(t * 2) * 0.05 + (walk ? 0.25 : 0));
  if (P.orbit) P.orbit.rotation.y = t * 0.9;
  if (P.tenA) { set('tenA', Math.sin(t * 2) * 0.1, t * 0.2, Math.cos(t * 1.7) * 0.08); set('tenB', -Math.sin(t * 2) * 0.1, -t * 0.15, -Math.cos(t * 1.7) * 0.08); }
  for (let i = 0; i < 6; i++) { const g = P['m' + i]; if (g) { g.position.y = g.userData.p0.y + Math.sin(t * 3 + i * 1.3) * 0.08; g.position.x = g.userData.p0.x + Math.cos(t * 1.7 + i) * 0.05; } }
  if (U.aura) U.aura.rotation.y = t * 0.4;
}
