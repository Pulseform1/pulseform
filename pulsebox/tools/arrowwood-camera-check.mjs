// ARROWWOOD: the finisher camera finds a clear view in tight spots (under the Stone Bridge, inside the Old Tower,
// against a broken wall, beside an oak): it never ends up inside scenery or with a wall between it and the victim.
//   node arrowwood/server/node-server.js --dev &   then   node tools/arrowwood-camera-check.mjs [base URL]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'http://localhost:8790';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let fails = 0; const ok = (c, name, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : '')); };
const p = await b.newPage(); await p.goto(BASE + '/games/arrowwood.html?dev&norender&nolock'); await p.waitForTimeout(500); await p.click('#bPlay');
for (let i = 0; i < 80 && !(await p.evaluate(() => GAME.test.ready)); i++) await p.waitForTimeout(250);
const spots = await p.evaluate(() => { const W = GAME.test.W, t = W.TREES.find(t => t.r > .6 && t.x > 30 && t.x < 110), w = W.BOXES.find(b => b.kind === 'wall' && b.hx > 2); const tw = W.PROPS.find(q => q.t === 'tower');
  return [['under the Stone Bridge (in the creek)', 70, 70, W.terrainH(70, 70)], ['inside the Old Tower', tw.x - 1.5, tw.z + 1, null], ['on the tower platform', tw.x + 1.5, tw.z, tw.plat], ['tight against a broken wall', w.x + (w.hz + .45) * w.s, w.z + (w.hz + .45) * w.c, null], ['beside an oak', t.x + t.r + .5, t.z, null]]; });
for (const [name, x, z, y] of spots) {
  const r = await p.evaluate(([x, z, y]) => GAME.test.finCam(x, z, y), [x, z, y]);
  ok(r.clear >= r.L - .06 && !r.inside && r.cam[1] > r.ground + .3, 'finisher camera ' + name + ': clear line to the victim, not inside anything', `${r.L.toFixed(1)} m back, ${r.cam.map(v => v.toFixed(1)).join(',')}`);
}
console.log(fails ? fails + ' FAILED' : 'ALL OK'); await b.close();
