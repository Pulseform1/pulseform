import * as T from 'three';
// Higher-detail procedural materials for the cutscene models: painted aircraft skin with panels, rivets, stencils,
// soot and chipped paint (colour, bump and roughness maps from one drawing), woven camouflage cloth, webbing, and a soft
// sky reflection for glass and metal. Also the shape of a tapered, twisted blade for rotors and propellers.
let ENV_RENDERER = null, ENV = null, ENV_OWNER = null;
export function setEnvRenderer(renderer) { ENV_RENDERER = renderer; }
// a small sky-and-ground reflection, made once with whatever renderer the world uses
export function skyReflection() {
  // made per renderer, and again after a scene teardown disposes it
  if (ENV && ENV_OWNER === ENV_RENDERER) return ENV;
  if (!ENV_RENDERER) return null;
  try {
    const scene = new T.Scene(), mat = new T.ShaderMaterial({ side: T.BackSide, uniforms: {}, vertexShader: 'varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec3 v;void main(){float h=v.y;vec3 c=h>0.?mix(vec3(.85,.86,.8),vec3(.36,.52,.72),pow(h,.6)):mix(vec3(.5,.47,.4),vec3(.18,.17,.15),pow(-h,.5));c+=vec3(1.,.9,.7)*pow(max(dot(v,normalize(vec3(-.5,.6,-.4))),0.),60.)*3.;gl_FragColor=vec4(c,1.);}' });
    scene.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), mat));
    const pm = new T.PMREMGenerator(ENV_RENDERER); const t = pm.fromScene(scene, .02).texture; pm.dispose(); mat.dispose(); ENV = t; ENV_OWNER = ENV_RENDERER; t.addEventListener('dispose', () => { if (ENV === t) ENV = null; });
  } catch (e) { ENV = null; }
  return ENV;
}
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function tex(c, srgb, rep = [1, 1]) { const t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; return t; }
const cache = new Map();
// painted metal skin: base colour with mottling, panel seams with rivet rows, soot streaks, chips, stencils and an emblem
function paintSkin({ base = '#56624f', seed = 7, emblem = true, stencil = 'GC-21', rep = [1, 1], wear = 1, marks = true } = {}) {
  const key = [base, seed, emblem, stencil, rep.join(), wear, marks].join('|'); if (cache.has(key)) return cache.get(key);
  const S = 1024, r = rng(seed), col = document.createElement('canvas'), hgt = document.createElement('canvas'), rough = document.createElement('canvas');
  for (const c of [col, hgt, rough]) { c.width = c.height = S; }
  const g = col.getContext('2d'), h = hgt.getContext('2d'), q = rough.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, S, S); h.fillStyle = '#808080'; h.fillRect(0, 0, S, S); q.fillStyle = '#a8a8a8'; q.fillRect(0, 0, S, S);
  // soft mottling of the paint
  for (let i = 0; i < 260; i++) { const x = r() * S, y = r() * S, s = 20 + r() * 90, l = r() < .5; g.fillStyle = l ? 'rgba(255,250,225,.035)' : 'rgba(0,0,0,.05)'; g.beginPath(); g.ellipse(x, y, s, s * (.4 + r() * .6), r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = v < .5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,240,.04)'; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); }
  // panels: a grid of uneven rectangles; each seam is a recessed line with rivets either side
  const rows = [0]; while (rows[rows.length - 1] < S) rows.push(rows[rows.length - 1] + 90 + r() * 110);
  const seam = (x0, y0, x1, y1) => {
    g.strokeStyle = 'rgba(14,18,14,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = 'rgba(255,255,235,.07)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 + 1.5, y0 + 1.5); g.lineTo(x1 + 1.5, y1 + 1.5); g.stroke();
    h.strokeStyle = '#3a3a3a'; h.lineWidth = 3; h.beginPath(); h.moveTo(x0, y0); h.lineTo(x1, y1); h.stroke();
    q.strokeStyle = '#d0d0d0'; q.lineWidth = 3; q.beginPath(); q.moveTo(x0, y0); q.lineTo(x1, y1); q.stroke();
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 14), nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    for (let k = 1; k < n; k++) for (const sd of [-1, 1]) { const x = x0 + (x1 - x0) * k / n + nx * sd * 7, y = y0 + (y1 - y0) * k / n + ny * sd * 7; g.fillStyle = 'rgba(20,24,20,.45)'; g.beginPath(); g.arc(x + .6, y + .6, 1.7, 0, 7); g.fill(); g.fillStyle = 'rgba(230,232,215,.22)'; g.beginPath(); g.arc(x - .4, y - .4, 1.1, 0, 7); g.fill(); h.fillStyle = '#b0b0b0'; h.beginPath(); h.arc(x, y, 1.8, 0, 7); h.fill(); }
  };
  for (let i = 0; i < rows.length - 1; i++) {
    seam(0, rows[i], S, rows[i]);
    let x = r() * 120; while (x < S) { seam(x, rows[i], x, rows[i + 1]); x += 120 + r() * 180; }
  }
  // inspection hatches and fasteners
  for (let i = 0; i < 18; i++) { const x = r() * (S - 80), y = r() * (S - 60), w = 30 + r() * 50, hh = 20 + r() * 34; g.strokeStyle = 'rgba(14,18,14,.5)'; g.lineWidth = 1.6; g.strokeRect(x, y, w, hh); h.strokeStyle = '#4a4a4a'; h.lineWidth = 2; h.strokeRect(x, y, w, hh); for (const [cx, cy] of [[x + 4, y + 4], [x + w - 4, y + 4], [x + 4, y + hh - 4], [x + w - 4, y + hh - 4]]) { g.fillStyle = 'rgba(200,200,185,.35)'; g.beginPath(); g.arc(cx, cy, 2, 0, 7); g.fill(); } }
  // wear: chipped paint showing bare metal, oil and exhaust soot streaking back
  for (let i = 0; i < 220 * wear; i++) { const x = r() * S, y = r() * S, s = 1 + r() * 4; g.fillStyle = 'rgba(178,182,172,.55)'; g.beginPath(); g.ellipse(x, y, s * 1.6, s, r() * 3, 0, 7); g.fill(); q.fillStyle = '#505050'; q.beginPath(); q.ellipse(x, y, s * 1.6, s, 0, 0, 7); q.fill(); }
  for (let i = 0; i < 30 * wear; i++) { const x = r() * S, y = r() * S, len = 60 + r() * 220, w = 6 + r() * 20, gr = g.createLinearGradient(x, y, x, y + len); gr.addColorStop(0, 'rgba(18,16,12,.28)'); gr.addColorStop(1, 'rgba(18,16,12,0)'); g.fillStyle = gr; g.fillRect(x, y, w, len); }
  // stencils and a fictional unit emblem: a pale ring with a ghost-wing diamond
  if (marks) { g.font = 'bold 30px monospace'; g.fillStyle = 'rgba(230,226,200,.75)'; g.fillText(stencil, 60 + r() * 300, 300 + r() * 300); g.font = 'bold 16px monospace'; g.fillText('NO STEP', 520 + r() * 300, 120 + r() * 200); g.fillText('LIFT HERE', 100 + r() * 300, 800 + r() * 150); }
  if (emblem) { const ex = 700, ey = 620; g.fillStyle = 'rgba(232,228,206,.85)'; g.beginPath(); g.arc(ex, ey, 70, 0, 7); g.fill(); g.fillStyle = base; g.beginPath(); g.arc(ex, ey, 54, 0, 7); g.fill(); g.fillStyle = 'rgba(232,228,206,.85)'; g.beginPath(); g.moveTo(ex, ey - 42); g.lineTo(ex + 28, ey); g.lineTo(ex, ey + 42); g.lineTo(ex - 28, ey); g.closePath(); g.fill(); g.fillRect(ex - 120, ey - 9, 66, 18); g.fillRect(ex + 54, ey - 9, 66, 18); }
  const out = { map: tex(col, true, rep), bumpMap: tex(hgt, false, rep), roughnessMap: tex(rough, false, rep) };
  cache.set(key, out); return out;
}
// woven cloth with a four-colour disruptive pattern (fictional, not any real issue)
function paintCamo({ colors = ['#5f6b4f', '#4b5640', '#7a7a5c', '#3c4434'], seed = 3 } = {}) {
  const key = 'camo|' + colors.join() + seed; if (cache.has(key)) return cache.get(key);
  const S = 512, r = rng(seed), c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = colors[0]; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) { const x = r() * S, y = r() * S, s = 14 + r() * 40; g.fillStyle = colors[1 + Math.floor(r() * (colors.length - 1))]; g.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, rr = s * (.6 + r() * .6); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .7); } g.closePath(); g.fill(); }
  for (let y = 0; y < S; y += 2) { g.fillStyle = y % 4 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.03)'; g.fillRect(0, y, S, 1); }
  for (let x = 0; x < S; x += 2) { g.fillStyle = 'rgba(0,0,0,.035)'; g.fillRect(x, 0, 1, S); }
  const out = tex(c, true, [2, 2]); cache.set(key, out); return out;
}
// webbing: rows of stitched loops for vests, harnesses and pouches
function paintWebbing(base = '#4f5a46') {
  const key = 'web|' + base; if (cache.has(key)) return cache.get(key);
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 32) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y + 22, S, 3); g.fillStyle = 'rgba(255,255,235,.08)'; g.fillRect(0, y + 4, S, 2); for (let x = 0; x < S; x += 32) { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x, y + 6, 3, 16); } }
  for (let i = 0; i < 2500; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.04)'; g.fillRect(Math.random() * S, Math.random() * S, 1, 2); }
  const out = tex(c, true, [1, 1]); cache.set(key, out); return out;
}
// headless tests hand these a partial canvas; fall back to plain materials there
function safe(paint, fallback) { return (...a) => { try { return paint(...a); } catch (e) { return fallback; } }; }
export const aircraftSkin = safe(paintSkin, { map: null, bumpMap: null, roughnessMap: null });
export const camoCloth = safe(paintCamo, null);
export const webbing = safe(paintWebbing, null);
// a blade along -z: tapered from the root chord to the tip, a little twisted, with a thin airfoil section and a drooping tip
export function bladeGeometry({ length = 7.9, rootChord = .5, tipChord = .32, thickness = .06, twist = .18, droop = .12, segs = 14 } = {}) {
  const prof = [[-.5, 0], [-.35, .55], [0, .75], [.4, .45], [.5, 0], [.4, -.25], [0, -.35], [-.35, -.25]], n = prof.length, pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, chord = rootChord + (tipChord - rootChord) * t, tw = twist * (1 - t), z = -t * length, dy = -droop * t * t;
    for (const [px, py] of prof) { const x = px * chord, y = py * thickness; pos.push(x * Math.cos(tw) - y * Math.sin(tw), y * Math.cos(tw) + x * Math.sin(tw) + dy, z); uv.push(px + .5, t); }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < n; j++) { const a = i * n + j, b = i * n + (j + 1) % n, c = a + n, d = b + n; idx.push(a, c, b, b, c, d); }
  const tip = segs * n; for (let j = 1; j < n - 1; j++) idx.push(tip, tip + j, tip + j + 1);
  for (let j = 1; j < n - 1; j++) idx.push(0, j + 1, j);
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
}
