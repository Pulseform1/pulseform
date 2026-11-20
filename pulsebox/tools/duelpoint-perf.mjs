// Duelpoint: where the frame time goes in a bot match, by team size (CPU profile of the page's own code).
//   node tools/duelpoint-perf.mjs [sizes=1,4] [seconds=8]
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const SIZES = (process.argv[2] || '1,4').split(',').map(Number), SECS = +(process.argv[3] || 8), URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const size of SIZES) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {}; });
  await p.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 120000 });
  await p.click('#bPlay'); await p.waitForTimeout(500);
  await p.evaluate(sz => { const t = GAME.test; t.CFG.sites = 2; t.CFG.quality = 'high'; t.menuPlay(sz); t.skipLoad(); t.UI.armory = false; t.botMe(1); t.M.t = .01; }, size);
  await p.waitForTimeout(2500);
  const cdp = await p.context().newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  await p.evaluate(() => { window.__ft = []; let last = performance.now(); const f = () => { const n = performance.now(); window.__ft.push(n - last); last = n; if (window.__ft.length < 100000) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await p.waitForTimeout(SECS * 1000);
  const { profile } = await cdp.send('Profiler.stop');
  const st = await p.evaluate(() => { const t = GAME.test, ft = window.__ft.slice(1).sort((a, b) => a - b), q = x => ft[Math.floor(ft.length * x)] || 0; return { frames: ft.length, avg: ft.reduce((a, b) => a + b, 0) / ft.length, p50: q(.5), p95: q(.95), max: ft[ft.length - 1], phase: t.M.phase, alive: t.M.fs.filter(f => f.alive).length, info: t.X.renderer.info.render, mem: t.X.renderer.info.memory, progs: t.X.renderer.info.programs.length }; });
  // self time by function
  const byId = new Map(profile.nodes.map(n => [n.id, n])), self = new Map(); let total = 0;
  const dts = profile.timeDeltas; profile.samples.forEach((id, i) => { const n = byId.get(id), cf = n.callFrame, k = (cf.functionName || '(anon)') + ':' + (cf.lineNumber + 1) + (cf.url.includes('duelpoint') ? '' : ' ' + cf.url.split('/').pop().slice(0, 30)); const d = dts[i] || 0; total += d; self.set(k, (self.get(k) || 0) + d); });
  console.log(`\n=== ${size}v${size}: ${st.frames} frames in ${SECS}s, avg ${st.avg.toFixed(1)} ms, p50 ${st.p50.toFixed(1)}, p95 ${st.p95.toFixed(1)}, max ${st.max.toFixed(0)}; phase ${st.phase}, alive ${st.alive}; draw calls ${st.info.calls}, tris ${st.info.triangles}, geos ${st.mem.geometries}, tex ${st.mem.textures}, programs ${st.progs}`);
  [...self].sort((a, b) => b[1] - a[1]).slice(0, 28).forEach(([k, v]) => console.log(`  ${(v / 1000).toFixed(0).padStart(6)} ms ${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`));
  if (errs.length) console.log('errors', errs.slice(0, 3));
  await p.context().close();
}
await b.close();
