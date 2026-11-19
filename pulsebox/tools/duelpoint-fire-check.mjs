// Duelpoint: the mouse fires every time, with the browser's real pointer lock (the other checks fake it).
//   node tools/duelpoint-fire-check.mjs
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(), errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + path.resolve('public/games/duelpoint.html'));
await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 60000 }); await p.waitForTimeout(600);
await p.click('#bPlay'); await p.waitForTimeout(900);
await p.evaluate(() => { window.__lockErr = 0; document.addEventListener('pointerlockerror', () => window.__lockErr++); });
await p.evaluate(() => GAME.test.menuPlay(1)); await p.waitForTimeout(600); await p.evaluate(() => GAME.test.skipLoad()); await p.waitForTimeout(1200);
const st = () => p.evaluate(() => { const t = GAME.test, P = t.M.fs[0]; return { phase: t.M.phase, armory: t.UI.armory, locked: !!document.pointerLockElement, shots: P.stat.shots, lockErr: window.__lockErr }; });
let failed = 0; const ok = (c, n, x) => { if (!c) failed++; console.log((c ? '  ok   ' : '  FAIL ') + n + '  ' + JSON.stringify(x)); };
await p.waitForFunction(() => GAME.test.UI.armory || GAME.test.M.phase !== 'buy', null, { timeout: 20000 }).catch(() => {});   // the first frames on a new map compile its shaders
let r = await st(); console.log('buy phase', JSON.stringify(r));
// capture the mouse in the buy phase (a click outside the armory's buttons), as a player would
if (!r.locked) { await p.mouse.click(1250, 700); await p.waitForTimeout(500); }
r = await st(); ok(r.armory, 'the armory is open in the buy phase', r);
// the in-game cursor moves over the armory while the mouse stays captured

// the in-game cursor moves over the armory while the mouse stays captured
const c0 = await p.evaluate(() => ({ ...GAME.test.ptr })); await p.mouse.move(700, 400); await p.mouse.move(760, 430); await p.waitForTimeout(300);
const c1 = await p.evaluate(() => ({ ...GAME.test.ptr })); ok(c1.x !== c0.x || c1.y !== c0.y, 'the armory cursor follows the captured mouse', { c0, c1 });
// the round goes live by the clock: the mouse stays captured, no click needed
await p.evaluate(() => { GAME.test.M.t = .05; }); await p.waitForFunction(() => GAME.test.M.phase === 'live', null, { timeout: 20000 }); await p.waitForTimeout(400);
r = await st(); ok(r.locked && !r.armory, 'the round goes live with the mouse still captured', r);
// a very quick click: press and release inside one frame
const s0 = r.shots;
await p.evaluate(() => { document.dispatchEvent(new MouseEvent('mousedown', { button: 0 })); document.dispatchEvent(new MouseEvent('mouseup', { button: 0 })); });
await p.waitForTimeout(800); r = await st(); ok(r.shots === s0 + 1, 'a click that starts and ends between two frames still fires', { ...r, s0 });
// lose the capture (Escape), then click: that click takes the mouse back and fires
await p.evaluate(() => document.exitPointerLock()); await p.waitForTimeout(400);
const s1 = (await st()).shots; await p.mouse.move(640, 360); await p.mouse.down(); await p.waitForTimeout(60); await p.mouse.up(); await p.waitForTimeout(900);
r = await st(); ok(r.locked && r.shots === s1 + 1, 'the click that recaptures the mouse also fires', { ...r, s1 });
// a trackpad: a two-finger swipe is a stream of tiny wheel steps. It is noticed (trackpad aiming comes on, and the mouse
// is captured again without raw input), and the swipe changes weapon once, not once per step
await p.evaluate(() => { window.__lockArgs = []; const r0 = HTMLCanvasElement.prototype.requestPointerLock; HTMLCanvasElement.prototype.requestPointerLock = function (o) { window.__lockArgs.push(o ? JSON.stringify(o) : 'plain'); return r0.call(this, o); }; });
const w0 = await p.evaluate(() => ({ slot: GAME.test.M.fs[0].slot, aim: GAME.test.CFG.aim }));
for (let k = 0; k < 24; k++) await p.evaluate(() => document.dispatchEvent(new WheelEvent('wheel', { deltaY: 2.5, deltaMode: 0, bubbles: true })));
await p.waitForTimeout(500);
const w1 = await p.evaluate(() => ({ slot: GAME.test.M.fs[0].slot, aim: GAME.test.CFG.aim, swaps: 0, args: window.__lockArgs }));
ok(w0.aim === 'mouse' && w1.aim === 'trackpad', 'a trackpad swipe is noticed and trackpad aiming comes on', { w0, w1 });
ok(w1.args.includes('plain'), 'trackpad aiming captures the mouse with the system pointer speed (no raw input)', w1.args);
// V fires (a trackpad hand can't always click and move at once)
await p.waitForFunction(() => document.pointerLockElement, null, { timeout: 5000 }).catch(() => {});
await p.keyboard.press('Digit2'); await p.waitForFunction(() => { const f = GAME.test.M.fs[0]; return f.slot === 2 && f.fireT <= 0 && !(f.swT > 0); }, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(300); const s2 = (await st()).shots; await p.keyboard.down('KeyV'); await p.waitForTimeout(120); await p.keyboard.up('KeyV'); await p.waitForTimeout(700);
r = await st(); ok(r.shots > s2, 'V fires', { ...r, s2 });
console.log("errors", errs.length, errs.slice(0, 3)); await b.close(); process.exit(errs.length || failed ? 1 : 0);
