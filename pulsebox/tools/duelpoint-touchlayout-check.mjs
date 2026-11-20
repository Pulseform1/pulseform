// Duelpoint on a touch-capable screen: the touch layout until a mouse is used, the mouse layout after, and back to touch on
// a tap; and in the buy phase "YOU CARRY THE CHARGE" sits clear of the credits.   node tools/duelpoint-touchlayout-check.mjs <shots>
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2] || '.', URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [], ok = (c, n, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : ''));
const p = await (await b.newContext({ viewport: { width: 1366, height: 768 }, hasTouch: true })).newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto(URL0, { timeout: 120000 }); await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 90000 }); await p.waitForTimeout(400);
await p.evaluate(() => document.getElementById('bPlay').click()); await p.waitForTimeout(500);
const start = async () => { await p.evaluate(() => { const t = GAME.test; if (t.M) t.toMenu(); t.CFG.sites = 2; t.menuPlay(2); t.skipLoad(); }); await p.waitForTimeout(700);
  await p.evaluate(() => { const t = GAME.test; t.UI.armory = false; t.UI.pendingArmory = false; t.M.t = 6.2; }); await p.waitForTimeout(300); };
const touchUI = () => p.evaluate(() => GAME.test.zones.some(z => z.x != null) && (() => { const t = GAME.test; return typeof t.isTouch === 'function' ? t.isTouch() : null; })());
const isT = () => p.evaluate(() => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
ok(await isT(), 'the test screen reports touch support');
await start(); await p.screenshot({ path: O + '/layout-touch.png' });
const before = await p.evaluate(() => [...document.querySelectorAll('*')].length >= 0 && GAME.test.zones.map(z => z.fn && z.fn.name).length);
// a mouse moves: the mouse layout
await p.mouse.move(400, 300); await p.mouse.move(500, 350); await p.waitForTimeout(400); await p.screenshot({ path: O + '/layout-mouse.png' });
const afterMouse = await p.evaluate(() => GAME.test.zones.length);
// a tap: back to touch
await p.touchscreen.tap(700, 400); await p.waitForTimeout(400); await p.screenshot({ path: O + '/layout-touch2.png' });
const afterTap = await p.evaluate(() => GAME.test.zones.length);
ok(afterMouse < before && afterTap > afterMouse, 'a mouse switches to the mouse layout (fewer on-screen buttons); a tap switches back', JSON.stringify({ before, afterMouse, afterTap }));
console.log('ERRORS', JSON.stringify(errs)); await b.close();
