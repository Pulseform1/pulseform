// ARROWWOOD hub cover (600x600), rendered from the game itself on a stepped clock: an archer at full draw on a crest at
// sunset, a lightning finisher striking in the sky behind, a glow pass, embers, and the title in the game's own font.
// Needs the local server (node arrowwood/server/node-server.js --dev).
//   node tools/arrowwood-cover.mjs [scratch dir]      writes public/media/arrowwood-cover.jpg
// Every look setting lives in DEF below (camera from the hero's feet as [right, forward, up], sun as degrees off the camera's line).
import { createRequire } from 'module'; import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const MEDIA = new URL('../public/media/', import.meta.url).pathname, OUT = process.argv[2] || '/tmp/aw-cover'; fs.mkdirSync(OUT, { recursive: true });
const DEF = { size: 1200, hero: [46, 112], enemy: [39.5, 136.1], enemy2: [59, 110], finOn: 'foe2', cam: [1.7, 2.0, 0.3], pan: 4, tilt: 3, fov: 42, sunCam: [35, 6], arrow: false,
  sunCol: '#ffc48a', sunI: 3.3, hemiSky: '#d6d0f2', hemiGnd: '#4a5a6a', hemiI: .72, fillCol: '#d2dbff', fillI: .9, exp: 1.15, skyTop: '#33499e', skyMid: '#e0836a', skyHor: '#ffd39a',
  bloomTh: .8, vig: .4, strap: 'BOW BATTLES · 1v1 · 2v2 · FREE FOR ALL · BOTS' };
const O = Object.assign({}, DEF, JSON.parse(process.argv[3] || '{}')), S = O.size;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: S, height: S } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { let now = 0, q = []; performance.now = () => now; window.requestAnimationFrame = cb => { q.push(cb); return q.length; }; window.__step = (n, ms) => { for (let i = 0; i < n; i++) { now += ms; const run = q; q = []; run.forEach(cb => cb(now)); } }; setInterval(() => { if (!window.__manual) window.__step(1, 33); }, 30); });
await p.goto('http://localhost:8790/games/arrowwood.html?dev&nolock&quality=high', { timeout: 120000, waitUntil: 'domcontentloaded' }); p.setDefaultTimeout(300000); await p.waitForSelector('#bPlay'); await p.waitForTimeout(800); await p.click('#bPlay');
for (let i = 0; i < 200 && !(await p.evaluate(() => GAME.test && GAME.test.ready)); i++) await p.waitForTimeout(300);
const st = (n, ms = 1000 / 24) => p.evaluate(([n, ms]) => window.__step(n, ms), [n, ms]);
await p.evaluate(() => { window.__manual = true; GAME.test.act('practice'); }); await st(30, 50);
await p.evaluate(() => { const room = GAME.test.CL.local.room; for (const q of room.players.values()) if (q.dummy) { q.home = [300, 300]; q.st.x = 300; q.st.z = 300; q.dummy = 'still'; } });
const res = await p.evaluate(async (O) => {
  const T = GAME.test, X = T.X, W = T.W, L = c => new THREE.Color(c).convertSRGBToLinear();
  document.getElementById('aw').style.display = 'none'; document.getElementById('cv').style.opacity = '0';
  const H = O.hero || [62, 104], E = O.enemy || [75, 79], E2 = O.enemy2 || [64, 74];
  const yawTo = (a, b) => Math.atan2(-(b[0] - a[0]), -(b[1] - a[1]));
  T.tp(H[0] + 1.5, H[1] + 3, yawTo(H, E), 0);
  T.stage({ id: 'hero', x: H[0], z: H[1], yaw: yawTo(H, E), team: 0, draw: 1, pitch: O.hp ?? .04, bow: O.bow || 'emberwood' });
  T.stage({ id: 'foe', x: E[0], z: E[1], yaw: yawTo(E, H), team: 1, draw: 1, pitch: .02, bow: O.foeBow || 'thunderclap' });
  if (O.foe2 !== false) T.stage({ id: 'foe2', x: E2[0], z: E2[1], yaw: yawTo(E2, H), team: 1, bow: 'longbow' });
  return 'ok';
}, O);
await st(20, 50);
// light and weather: an evening sun low behind the enemy (so the long shadows run toward us)
await p.evaluate((O) => { const T = GAME.test, X = T.X, L = c => new THREE.Color(c).convertSRGBToLinear();
  const sd = new THREE.Vector3(...(O.sun || [.35, .2, -.92])).normalize(); X.sunDir.copy(sd); if (X.sky && X.sky.material.uniforms) { const u = X.sky.material.uniforms; u.sun.value.copy(sd); u.top.value = L(O.skyTop || '#2b3f86'); u.mid.value = L(O.skyMid || '#d9825f'); u.hor.value = L(O.skyHor || '#ffcf8f'); }
  X.sun.color = L(O.sunCol || '#ffb46a'); X.sun.intensity = O.sunI || 3.0; X.hemi.color = L(O.hemiSky || '#ffcfae'); X.hemi.groundColor = L(O.hemiGnd || '#3c4a63'); X.hemi.intensity = O.hemiI || .62;
  X.scene.fog.color = L(O.fog || '#f0b07e'); X.scene.fog.density = O.fogD || .0085; if (X.clouds) X.clouds.material.color = L(O.cloud || '#ffb894');
  X.renderer.toneMappingExposure = O.exp || 1.0; X.scene.traverse(o => { if (o.isDirectionalLight && o !== X.sun) o.color = L(O.fillCol || '#7f9bdc'); });
}, O);
// the finisher on the second enemy: lightning
if (O.fin !== false) { await p.evaluate((O) => { const T = GAME.test; T.finish(O.finOn || 'foe2', O.fin || 'thunderclap'); T.ME.cam = 'fp'; T.ME.fin = null; }, O); }
await st(O.finSteps || 7, 1000 / 24);
const shot = await p.evaluate(async (O) => { try {
  const L2 = c => new THREE.Color(c).convertSRGBToLinear();
  const T = GAME.test, X = T.X, R = X.renderer, S = R.domElement.width, cam = new THREE.PerspectiveCamera(O.fov || 44, 1, .05, 1200);
  const hero = T.CL.players.get('hero').model.root.position, foe = T.CL.players.get('foe').model.root.position;
  const fwd = new THREE.Vector3(foe.x - hero.x, 0, foe.z - hero.z).normalize(), right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const c = O.cam || [1.25, -2.6, 1.05], look = O.look || [ -0.6, 9, 1.35];   // [right, forward, up] from the hero's feet
  cam.position.copy(hero).addScaledVector(right, c[0]).addScaledVector(fwd, c[1]); cam.position.y = hero.y + c[2];
  const tgt = hero.clone(); tgt.y = hero.y + (O.lookY || 1.35); cam.lookAt(tgt); cam.rotateY(-(O.pan || 0) * Math.PI / 180); cam.rotateX((O.tilt || 0) * Math.PI / 180); cam.updateMatrixWorld();
  // the arrow in flight: the hero's nocked arrow, copied out ahead of the bow with a glowing trail drawn after
  let trail = null;
  if (O.arrow !== false) {
    const src = T.CL.players.get('hero').model.bow.arrow; src.updateMatrixWorld(true); const a = new THREE.Mesh(src.geometry, src.material.clone()); a.material.emissive = new THREE.Color('#ff7a2a'); a.material.emissiveIntensity = .9;
    const tip = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); src.matrixWorld.decompose(tip, q, sc);
    const aim = new THREE.Vector3(foe.x, foe.y + 1.3, foe.z).sub(tip).normalize(), along = O.arrowAt || 5.5, pos = tip.clone().addScaledVector(aim, along);
    a.position.copy(pos); a.scale.setScalar((O.arrowScale || 1.7) * sc.x); a.lookAt(pos.clone().sub(aim)); X.scene.add(a); a.updateMatrixWorld();
    const pr = v => { const w = v.clone().project(cam); return [(w.x + 1) / 2, (1 - w.y) / 2]; };
    trail = { head: pr(pos), tail: pr(tip.clone().addScaledVector(aim, Math.max(.4, along - (O.trailLen || 4.6)))) };
  }
  // the sun placed by the picture: behind the hero, a few degrees off (O.sunCam = [right deg, up deg] from the camera's line)
  if (O.sunCam) { const d = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), -O.sunCam[0] * Math.PI / 180).applyAxisAngle(new THREE.Vector3(1, 0, 0), O.sunCam[1] * Math.PI / 180).applyQuaternion(cam.quaternion).normalize();
    X.sunDir.copy(d); if (X.sky.material.uniforms) X.sky.material.uniforms.sun.value.copy(d); }
  // a cool fill from the camera's side, so the shaded face still reads
  X.scene.traverse(o => { if (o.isDirectionalLight && o !== X.sun) { o.position.copy(cam.position).sub(hero).normalize(); o.color = L2(O.fillCol || '#8fa6e6'); o.intensity = O.fillI ?? .55; } });
  X.sun.target.position.set(hero.x, 0, hero.z); X.sun.position.set(hero.x + X.sunDir.x * 90, X.sunDir.y * 90, hero.z + X.sunDir.z * 90); X.sun.target.updateMatrixWorld();
  X.sun.shadow.camera.left = X.sun.shadow.camera.bottom = -40; X.sun.shadow.camera.right = X.sun.shadow.camera.top = 40; X.sun.shadow.camera.updateProjectionMatrix();
  if (O.noWords !== false) X.scene.traverse(o => { if (o.isSprite) o.visible = false; });
  R.shadowMap.needsUpdate = true; R.setClearColor(0x000000); R.clear(); R.render(X.scene, cam);
  const url = R.domElement.toDataURL('image/png');
  // the lightning alone, for its glow: everything else hidden, black behind
  let boltUrl = null; { let bolt = null; X.scene.traverse(o => { if (!bolt && o.isMesh && o.material && o.material.isMeshBasicMaterial && o.material.transparent && o.material.color.r > .9 && o.material.color.b > .99 && o.visible) bolt = o; });
    if (bolt) { const vis = []; X.scene.traverse(o => { if (o !== X.scene && o.visible) { vis.push(o); } }); vis.forEach(o => { if (o.isMesh || o.isPoints || o.isSprite || o.isLine) o.visible = false; }); bolt.visible = true; let q = bolt.parent; while (q) { q.visible = true; q = q.parent; }
      const fog = X.scene.fog, op = bolt.material.opacity; X.scene.fog = null; bolt.material.opacity = 1; R.setClearColor(0x000000, 1); R.clear(); R.render(X.scene, cam); boltUrl = R.domElement.toDataURL('image/png');
      X.scene.fog = fog; bolt.material.opacity = op; vis.forEach(o => o.visible = true); } }
  const sunScr = (() => { const v = cam.position.clone().addScaledVector(X.sunDir, 500).project(cam); return [(v.x + 1) / 2, (1 - v.y) / 2, v.z < 1]; })();
  return { url, trail, sunScr, boltUrl };
 } catch (e) { return { err: e.message + ' ' + (e.stack || '').split('\n').slice(0, 6).join(' | ') }; } }, O);
if (shot.err) { console.log('ERR', shot.err); process.exit(1); }
fs.writeFileSync(OUT + '/raw.png', Buffer.from(shot.url.split(',')[1], 'base64'));
if (shot.boltUrl) fs.writeFileSync(OUT + '/bolt.png', Buffer.from(shot.boltUrl.split(',')[1], 'base64'));
// the finish: glow on the bright bits, a warm grade and vignette, embers, then the title in the game's own font
const fin = await p.evaluate(async ({ raw, bolt, O }) => {
  await document.fonts.load('150px "Lilita One"'); const fontOk = document.fonts.check('150px "Lilita One"');
  const img = new Image(); img.src = raw; await img.decode();
  const S = img.width, k = S / 1200, mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return [c, c.getContext('2d')]; };
  const [c, g] = mk(); g.drawImage(img, 0, 0);
  // glow: only what's really bright (the bolt, the ember tips, the sun's haze), blurred and added back
  { const d = g.getImageData(0, 0, S, S), [bc, bg] = mk(), o = bg.createImageData(S, S), th = O.bloomTh || .74;
    for (let i = 0; i < d.data.length; i += 4) { const r = d.data[i], gg = d.data[i + 1], bb = d.data[i + 2], l = (.3 * r + .59 * gg + .11 * bb) / 255, w = Math.max(0, (l - th) / (1 - th)); o.data[i] = r * w; o.data[i + 1] = gg * w; o.data[i + 2] = bb * w; o.data[i + 3] = 255; }
    bg.putImageData(o, 0, 0); g.globalCompositeOperation = 'lighter'; g.filter = `blur(${7 * k}px)`; g.drawImage(bc, 0, 0); g.globalAlpha = .8; g.filter = `blur(${24 * k}px)`; g.drawImage(bc, 0, 0); g.globalAlpha = 1; g.filter = 'none'; g.globalCompositeOperation = 'source-over'; }
  if (bolt) { const b0 = new Image(); b0.src = bolt; await b0.decode(); const [bi, bg2] = mk(); bg2.drawImage(b0, 0, 0);
    { const d = bg2.getImageData(0, 0, S, S); for (let i = 0; i < d.data.length; i += 4) { const a = Math.max(d.data[i], d.data[i + 1], d.data[i + 2]); d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = a; } bg2.putImageData(d, 0, 0); }   // the black behind it becomes see-through
    const [tc, tg] = mk();
    for (const [blur, col, a] of [[30, '#3d6dff', .9], [12, '#8fd8ff', 1], [3, '#ffffff', 1]]) { tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, S, S); tg.filter = `blur(${blur * k}px)`; tg.drawImage(bi, 0, 0); tg.filter = 'none'; tg.globalCompositeOperation = 'source-in'; tg.fillStyle = col; tg.fillRect(0, 0, S, S);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; for (let n = 0; n < (blur > 20 ? 3 : 2); n++) g.drawImage(tc, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; } }
  // grade: a warm wash from the sun's side, cooler and darker toward the top-left, then the corners down
  { let gr = g.createLinearGradient(S, S * .35, 0, 0); gr.addColorStop(0, 'rgba(255,150,70,.22)'); gr.addColorStop(.6, 'rgba(255,120,80,0)'); gr.addColorStop(1, 'rgba(40,20,90,.18)'); g.globalCompositeOperation = 'soft-light'; g.fillStyle = gr; g.fillRect(0, 0, S, S); g.globalCompositeOperation = 'source-over';
    const v = g.createRadialGradient(S * .55, S * .45, S * .32, S * .5, S * .5, S * .8); v.addColorStop(0, 'rgba(10,4,20,0)'); v.addColorStop(1, `rgba(10,4,20,${O.vig ?? .45})`); g.fillStyle = v; g.fillRect(0, 0, S, S); }
  // embers drifting up through the picture
  { let seed = 11; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647; g.globalCompositeOperation = 'lighter';
    const keep = O.keepOut || [.25, .18, .72, .62];
    for (let i = 0, n = 0; i < 400 && n < (O.embers ?? 34); i++) { const x = R() * S, y = S * (.12 + R() * .62), r = (1 + R() * R() * 3) * k * 1.3, col = R() < .5 ? '255,205,110' : '255,130,50';
      if (x > keep[0] * S && x < keep[2] * S && y > keep[1] * S && y < keep[3] * S) continue; n++;
      const rg = g.createRadialGradient(x, y, 0, x, y, r * 4); rg.addColorStop(0, `rgba(${col},${.9})`); rg.addColorStop(.25, `rgba(${col},.55)`); rg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r * 4, 0, Math.PI * 2); g.fill(); }
    g.globalCompositeOperation = 'source-over'; }
  // a dark band for the title
  { const band = g.createLinearGradient(0, S * .62, 0, S); band.addColorStop(0, 'rgba(18,6,28,0)'); band.addColorStop(.55, 'rgba(18,6,28,.72)'); band.addColorStop(1, 'rgba(12,4,20,.92)'); g.fillStyle = band; g.fillRect(0, S * .62, S, S * .38); }
  // the title, an arrow under it, the strap line
  const ty = (O.titleY || 1000) * k, fsz = (O.titleSize || 168) * k;
  g.save(); g.translate(S / 2, ty); g.rotate(-.035);
  g.font = `400 ${fsz}px 'Lilita One', Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
  const tw = g.measureText('ARROWWOOD').width;
  // the arrow: shaft under the word, fletching at the left, a head at the right
  { const y = 36 * k, x0 = Math.max(-tw / 2 - 10 * k, -S / 2 + 84 * k), x1 = Math.min(tw / 2 + 10 * k, S / 2 - 80 * k); g.lineCap = 'round';
    g.strokeStyle = '#1c0a06'; g.lineWidth = 15 * k; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1 - 20 * k, y); g.stroke();
    g.strokeStyle = '#f6e3bf'; g.lineWidth = 7 * k; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1 - 20 * k, y); g.stroke();
    for (const s of [-1, 1]) { g.fillStyle = '#1c0a06'; g.beginPath(); g.moveTo(x0 + 6 * k, y); g.lineTo(x0 - 30 * k, y + s * 26 * k); g.lineTo(x0 + 34 * k, y + s * 26 * k); g.lineTo(x0 + 58 * k, y); g.closePath(); g.fill();
      g.fillStyle = s < 0 ? '#ff6a2a' : '#ffb14a'; g.beginPath(); g.moveTo(x0 + 12 * k, y + s * 3 * k); g.lineTo(x0 - 20 * k, y + s * 21 * k); g.lineTo(x0 + 32 * k, y + s * 21 * k); g.lineTo(x0 + 50 * k, y + s * 3 * k); g.closePath(); g.fill(); }
    g.fillStyle = '#1c0a06'; g.beginPath(); g.moveTo(x1 + 30 * k, y); g.lineTo(x1 - 26 * k, y - 25 * k); g.lineTo(x1 - 14 * k, y); g.lineTo(x1 - 26 * k, y + 25 * k); g.closePath(); g.fill();
    const hg = g.createLinearGradient(0, y - 18 * k, 0, y + 18 * k); hg.addColorStop(0, '#fff2b0'); hg.addColorStop(1, '#ffa021'); g.fillStyle = hg; g.beginPath(); g.moveTo(x1 + 18 * k, y); g.lineTo(x1 - 20 * k, y - 17 * k); g.lineTo(x1 - 10 * k, y); g.lineTo(x1 - 20 * k, y + 17 * k); g.closePath(); g.fill(); }
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 22 * k; g.shadowOffsetY = 8 * k; g.strokeStyle = '#1c0a06'; g.lineWidth = 22 * k; g.strokeText('ARROWWOOD', 0, 0); g.shadowColor = 'transparent';
  const fg = g.createLinearGradient(0, -fsz * .78, 0, 0); fg.addColorStop(0, '#fff6cf'); fg.addColorStop(.45, '#ffd25a'); fg.addColorStop(1, '#ff8a1e'); g.fillStyle = fg; g.fillText('ARROWWOOD', 0, 0);
  g.globalAlpha = .35; g.strokeStyle = '#fffbe8'; g.lineWidth = 2 * k; g.strokeText('ARROWWOOD', 0, -2 * k); g.globalAlpha = 1;
  g.restore();
  g.font = `400 ${36 * k}px 'Lilita One', Impact, sans-serif`; g.textAlign = 'center'; g.letterSpacing = `${3 * k}px`; g.lineJoin = 'round';
  const strap = O.strap || 'BOW BATTLES · 1v1 · 2v2 · FREE FOR ALL'; g.strokeStyle = 'rgba(12,4,20,.9)'; g.lineWidth = 8 * k; g.strokeText(strap, S / 2, ty + 112 * k); g.fillStyle = '#f7ead2'; g.fillText(strap, S / 2, ty + 112 * k);
  const out = document.createElement('canvas'); out.width = out.height = 600; const og = out.getContext('2d'); og.imageSmoothingQuality = 'high'; og.drawImage(c, 0, 0, 600, 600);
  return { big: c.toDataURL('image/jpeg', .92), small: out.toDataURL('image/jpeg', .9), fontOk };
}, { raw: shot.url, bolt: shot.boltUrl, O });
fs.writeFileSync(OUT + '/cover-big.jpg', Buffer.from(fin.big.split(',')[1], 'base64'));
fs.writeFileSync(OUT + '/cover.jpg', Buffer.from(fin.small.split(',')[1], 'base64')); fs.copyFileSync(OUT + '/cover.jpg', MEDIA + 'arrowwood-cover.jpg');
console.log('font', fin.fontOk ? 'Lilita One' : 'MISSING (fell back)', '->', MEDIA + 'arrowwood-cover.jpg');
fs.writeFileSync(OUT + '/meta.json', JSON.stringify({ trail: shot.trail, sun: shot.sunScr }));
console.log('raw done', JSON.stringify({ trail: shot.trail, sun: shot.sunScr }), 'errors', errs.slice(0, 3));
await b.close();
