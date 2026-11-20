// Duelpoint: a photo tour of every map: a crate up close, a container stack, and a wide view from each spawn, so the
// maps can be checked by eye.   node tools/duelpoint-map-tour.mjs <out dir> [map index ...]
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2] || '.', ONLY = process.argv.slice(3).map(Number), URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
fs.mkdirSync(O, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 1100, height: 620 } })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {}; });
await p.goto(URL0, { timeout: 120000 }); await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 90000 }); await p.waitForTimeout(500);
await p.click('#bPlay'); await p.waitForTimeout(700);
const n = await p.evaluate(() => GAME.test.MAPS.length);
for (let mi = 0; mi < n; mi++) {
  if (ONLY.length && !ONLY.includes(mi)) continue;
  const views = await p.evaluate(mi => { const t = GAME.test; if (t.M) t.toMenu(); t.play({ mode: 'bot', map: mi, size: 1, diff: 1 }); t.skipLoad(); t.UI.armory = false; t.M.t = .01; t.tick(.2); t.UI.armory = false;
    const M = t.M, P = M.fs[0], MAP = t.MAP, me = t.mech(), SRC = MAP.grid || MAP.rows || null; for (const f of M.fs) f.bot = f === P ? null : f.bot;
    for (const f of M.fs) if (f !== P) { f.x = -50; f.z = -50; }
    const rows = MAP.src || MAP.g || MAP.cells; const find = ch => { const out = []; const R = rows || []; for (let j = 0; j < R.length; j++) for (let i = 0; i < R[j].length; i++) if (R[j][i] === ch) out.push([i, j]); return out; };
    const free = (x, z) => { const i = Math.floor(x / 2), j = Math.floor(z / 2); const R = rows; return R && R[j] && '.oqrADTJigLV<>^vG'.includes(R[j][i]); };
    const look = (cx, cz, h) => { for (let r = 5; r <= 10; r += 1) for (let a = 0; a < 16; a++) { const ang = a / 16 * Math.PI * 2 + .3, x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r; if (free(x, z) && me.los(x, 1.6, z, cx, h, cz)) return { x, z, cx, cz, h }; } return null; };
    const v = [], cr = find('c'), bx = find('X');
    if (cr.length) { const c = cr[Math.floor(cr.length / 2)]; const q = look(c[0] * 2 + 1, c[1] * 2 + 1, .6); if (q) v.push(Object.assign(q, { tag: 'crate' })); }
    if (bx.length) { const c = bx[Math.floor(bx.length / 3)]; const q = look(c[0] * 2 + 1, c[1] * 2 + 1, 1.6); if (q) v.push(Object.assign(q, { tag: 'container' })); }
    const sp = M.fs.map(f => f.spawn).filter(Boolean); v.push({ tag: 'spawn', x: P.x, z: P.z, wide: 1 });
    return { name: MAP.n, rows: !!rows, v };
  }, mi);
  for (const v of views.v) {
    await p.evaluate(v => { const t = GAME.test, P = t.M.fs[0]; P.x = v.x; P.z = v.z; P.y = t.hAt(v.x, v.z); if (v.wide) { const S = t.SITES[0]; const c = S && S.c; if (c) P.yaw = Math.atan2(-(c[0] - P.x), -(c[1] - P.z)); P.pitch = -.05; } else { P.yaw = Math.atan2(-(v.cx - v.x), -(v.cz - v.z)); P.pitch = Math.atan2(v.h - 1.6, Math.hypot(v.cx - v.x, v.cz - v.z)); } t.M.t = 60; t.UI.armory = false; for (const f of t.M.fs) if (f !== P) { f.x = -50; f.z = -50; } t.tick(.05); }, v);
    await p.waitForTimeout(450);
    await p.screenshot({ path: `${O}/${String(mi).padStart(2, '0')}-${views.name.replace(/\W+/g, '')}-${v.tag}.png` });
  }
  // two views from high over opposite corners, to check the whole layout
  for (const [k, cx, cz] of [['over1', -.15, -.15], ['over2', 1.15, 1.15]]) {
    await p.evaluate(([cx, cz]) => { const t = GAME.test, m = t.mech(), W = m.GW * 2, H = m.GH * 2; t.X.camHook = cam => { cam.position.set(W * cx, Math.max(W, H) * .55, H * cz); cam.lookAt(W / 2, 0, H / 2); }; t.tick(.05); }, [cx, cz]);
    await p.waitForTimeout(450); await p.screenshot({ path: `${O}/${String(mi).padStart(2, '0')}-${views.name.replace(/\W+/g, '')}-${k}.png` });
  }
  await p.evaluate(() => { GAME.test.X.camHook = null; });
  console.log(mi, views.name, views.rows, views.v.map(v => v.tag).join(','));
}
console.log('ERRORS', JSON.stringify(errs.slice(0, 5))); await b.close();
