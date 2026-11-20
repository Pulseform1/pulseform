// Duelpoint: every skin line on a few weapons, as contact sheets, to compare the lines side by side and catch parts
// that float, clip or sit crooked.
//   node tools/duelpoint-skin-gallery.mjs <out dir> [guns=vesper,pip,knife] [rarities=all|legendary,mythic,...] [view=side|three]
// Writes one sheet per rarity: <out>/skins-<rarity>-<view>.png (a row per line, a column per weapon).
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2] || '.', GUNS = (process.argv[3] || 'vesper,pip,knife').split(','), RAR = process.argv[4] || 'all', VIEW = process.argv[5] || 'three';
const URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.goto(URL0, { timeout: 120000 });
await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 90000 }); await p.waitForTimeout(500);
const order = ['common', 'rare', 'epic', 'legendary', 'mythic', 'paragon'], want = RAR === 'all' ? order : RAR.startsWith('line:') ? [RAR] : RAR.split(',');
for (const r of want) {
  const url = await p.evaluate(async ([r, guns, view, CW]) => {
    const t = GAME.test, X = t.X, THREE = window.THREE, L = t.LINES, lines = r.startsWith('line:') ? r.slice(5).split('+') : Object.keys(L).filter(k => L[k].r === r);
    const cw = CW, ch = Math.round(cw / 2), lab = 150, W = lab + cw * guns.length, H = ch * lines.length, out = document.createElement('canvas'); out.width = W; out.height = H;
    const g = out.getContext('2d'); g.fillStyle = '#1a1e25'; g.fillRect(0, 0, W, H);
    const rr = X.renderer, rt = new THREE.WebGLRenderTarget(cw * 2, ch * 2); rt.texture.encoding = THREE.sRGBEncoding;
    const buf = new Uint8Array(cw * 2 * ch * 2 * 4), cv = document.createElement('canvas'); cv.width = cw * 2; cv.height = ch * 2; const cx = cv.getContext('2d');
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i]; g.fillStyle = i % 2 ? '#20252e' : '#1a1e25'; g.fillRect(0, i * ch, W, ch);
      g.fillStyle = '#fff'; g.font = 'bold 17px sans-serif'; g.fillText(L[ln].n, 10, i * ch + 30); g.fillStyle = '#9aa'; g.font = '13px sans-serif'; g.fillText(ln + (L[ln].pat ? ' / ' + L[ln].pat : ''), 10, i * ch + 50);
      for (let j = 0; j < guns.length; j++) {
        const sc = new THREE.Scene(), gm = t.gunModel(guns[j], { skin: ln + ':' + guns[j] }); sc.add(gm);
        sc.add(new THREE.HemisphereLight('#ffffff', '#5a6270', 1.5)); const kl = new THREE.DirectionalLight('#fff4e0', 2.6); kl.position.set(3, 4, 1); sc.add(kl); const rl = new THREE.DirectionalLight('#9fd8ff', 2.4); rl.position.set(-3, 2, -1); sc.add(rl);
        gm.traverse(o => { if (o.userData && o.userData.anim) try { o.userData.anim(o, 1.3, .016); } catch (e) {} });
        const bb = new THREE.Box3().setFromObject(gm), c = bb.getCenter(new THREE.Vector3()), s = bb.getSize(new THREE.Vector3());
        const dir = view === 'side' ? new THREE.Vector3(1, 0, 0) : view === 'left' ? new THREE.Vector3(-1, .15, .25) : new THREE.Vector3(1, .42, .55), R2 = Math.max(s.x, s.y, s.z), ud = gm.userData, bo = ud.bore || { y: .03, z: -(ud.len || .3) };
        let cam = new THREE.PerspectiveCamera(22, cw / ch, .005, 20); cam.position.copy(c).addScaledVector(dir.normalize(), Math.max(s.z * 1.55, s.y * 2.9, .3)); cam.lookAt(c);
        if (view === 'muzzle') { const tg = new THREE.Vector3(0, bo.y, bo.z + .02); cam.position.set(-.1, bo.y + .055, bo.z - .1); cam.lookAt(tg); }
        else if (view === 'top') { const tg = new THREE.Vector3(0, bb.max.y - .035, c.z - s.z * .12); cam = new THREE.PerspectiveCamera(30, cw / ch, .005, 20); cam.position.set(-.16, bb.max.y + .12, tg.z + .05); cam.lookAt(tg); }
        else if (view === 'stock') { const tg = new THREE.Vector3(0, c.y, bb.max.z - s.z * .2); cam = new THREE.PerspectiveCamera(26, cw / ch, .005, 20); cam.position.set(.32, c.y + .08, tg.z + .05); cam.lookAt(tg); }
        else if (view === 'ads') { cam = new THREE.PerspectiveCamera(32, cw / ch, .005, 20); cam.position.set(0, ud.sight || .09, .24); cam.lookAt(0, ud.sight || .09, -2); }
        { const d = cam.position.distanceTo(c); cam.near = Math.max(.004, d * .35); cam.far = d * 3; cam.updateProjectionMatrix(); }   // a render target's depth is coarse: keep the range tight
        const prev = rr.getRenderTarget(); rr.setRenderTarget(rt); rr.setClearColor(0x2a303a, 1); rr.clear(); rr.render(sc, cam); rr.readRenderTargetPixels(rt, 0, 0, cw * 2, ch * 2, buf); rr.setRenderTarget(prev);
        const id = cx.createImageData(cw * 2, ch * 2); for (let y = 0; y < ch * 2; y++) id.data.set(buf.subarray((ch * 2 - 1 - y) * cw * 2 * 4, (ch * 2 - y) * cw * 2 * 4), y * cw * 2 * 4); cx.putImageData(id, 0, 0);
        g.drawImage(cv, lab + j * cw + 2, i * ch + 2, cw - 4, ch - 4);
        gm.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
      }
    }
    rt.dispose(); return out.toDataURL('image/png');
  }, [r, GUNS, VIEW, +(process.env.DPW || 420)]);
  const f = `${O}/skins-${r.replace(/[:+]/g, "_")}-${GUNS[0]}-${VIEW}.png`; fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); console.log(f);
}
console.log('errors', JSON.stringify(errs.slice(0, 5))); await b.close();
