// Duelpoint: what a map costs on a low-end machine (FAST picture quality, as a Chromebook gets): the time to build it,
// its draw calls and triangles, the frame time standing in it, and the textures held on the graphics card after playing
// several maps in a row (they must not pile up).
//   node tools/duelpoint-mapcost.mjs [maps=saltworks,neonrow,dunewatch,foundry,orbital,overgrowth,frostline] [quality=low]
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const KEYS = (process.argv[2] || 'saltworks,neonrow,dunewatch,foundry,orbital,overgrowth,frostline').split(','), Q = process.argv[3] || 'low', URL0 = 'file://' + path.resolve(process.env.HTML || 'public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = []; const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
await p.addInitScript(q => { Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {};
  try { const k = Object.keys(localStorage).find(x => /duelpoint/.test(x)); } catch (e) {} window.__q = q; }, Q);
await p.goto(URL0, { timeout: 120000 });
await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test, null, { timeout: 90000 });
await p.evaluate(q => { GAME.test.CFG.quality = q; }, Q);   // before the renderer is made
await p.waitForFunction(() => GAME.test.ready(), null, { timeout: 90000 }); await p.waitForTimeout(600);
await p.click('#bPlay'); await p.waitForTimeout(900);
console.log(`quality ${Q}: low = ${await p.evaluate(() => GAME.test.X.low)}`);
console.log('map          build ms   draws   tris     frame ms   textures');
const rows = [];
for (const key of KEYS) {
  const r = await p.evaluate(async key => {
    const t = GAME.test, mi = t.MAPS.findIndex(m => m.k === key); if (mi < 0) return null; if (t.M) t.toMenu(); t.seed(5);   // (the same side and spawn every time, so two builds can be compared)
    const t0 = performance.now(); t.play({ mode: 'bot', diff: 0, size: 1, map: mi }); const build = performance.now() - t0;
    t.skipLoad(); t.UI.armory = false; const M = t.M; M.phase = 'live'; M.t = 80; const F = M.fs[1]; F.bot = { diff: 0, dummy: true, home: [F.x, F.z] };
    await new Promise(r => setTimeout(r, 1500));
    const info = t.X.renderer.info; let n = 0, sum = 0, last = performance.now(), draws = 0, tris = 0; info.autoReset = false;   // (count the whole frame: the world and your gun's layer)
    await new Promise(res => { const f = now => { const d = now - last; last = now; if (n++ > 2) sum += d; draws = info.render.calls; tris = info.render.triangles; info.reset(); M.phase = 'live'; M.t = 80; if (n < 63) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    info.autoReset = true;
    return { build: Math.round(build), draws, tris, frame: +(sum / 60).toFixed(1), tex: info.memory.textures, geo: info.memory.geometries };
  }, key);
  if (!r) { console.log(key, 'not found'); continue; } rows.push(r);
  console.log(key.padEnd(12), String(r.build).padStart(8), String(r.draws).padStart(7), String(r.tris).padStart(7), String(r.frame).padStart(11), String(r.tex).padStart(10));
}
const grow = rows.length > 2 ? rows[rows.length - 1].tex - rows[1].tex : 0;
console.log(`textures held after ${rows.length} maps: ${rows.length ? rows[rows.length - 1].tex : 0} (${grow > 0 ? '+' : ''}${grow} since the second map)`);
console.log('errors', errs.length, errs.slice(0, 3)); await b.close();
