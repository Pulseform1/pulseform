// Blackwater Drift in a real browser (mouse and keys): plays through the checklist and saves screenshots.
//   node tools/blackwater-desktop-check.mjs <screenshot folder>      (build first: python3 tools/build-games.py blackwater)
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 960, height: 540 } }), p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | '))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await p.addInitScript(() => { let now = 0, q = []; performance.now = () => now; window.requestAnimationFrame = cb => { q.push(cb); return q.length; }; window.__step = (n, ms = 1000 / 60) => { for (let i = 0; i < n; i++) { now += ms; const run = q; q = []; run.forEach(cb => cb(now)); } };
  /* headless Chromium cannot lock the pointer: pretend it is locked, the way a real click would leave it */
  Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () { setTimeout(() => document.dispatchEvent(new Event('pointerlockchange'))); }; Document.prototype.exitPointerLock = function () {}; });
await p.goto('file://' + new URL('../public/games/blackwater.html', import.meta.url).pathname + '?dev'); await p.waitForTimeout(4500);
const st = n => p.evaluate(n => window.__step(n), n), shot = n => p.screenshot({ path: `${O}/${n}.png`, timeout: 120000 }), ev = (fn, a) => p.evaluate(fn, a), out = {};
const ok = (c, name, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : ''));
const G2P = (x, y) => ev(([x, y]) => { const r = document.getElementById('cv').getBoundingClientRect(), V = K.view; return [r.left + (x - V.x0) / (V.x1 - V.x0) * r.width, r.top + (y - V.y0) / (V.y1 - V.y0) * r.height]; }, [x, y]);
await p.click('#bPlay'); await st(4);
// reel in a log, find it in ITEMS, PLACE it, rotate it, set it down, SOLIDIFY
await ev(() => { GAME.test.CFG.quality = 'low'; GAME.test.applyQuality(); });
const [wx, wy] = await G2P(640, 347); await p.mouse.click(wx, wy); await st(4);
await ev(() => { GAME.test.IN.locked = true; GAME.test.SH.state = 'away'; GAME.test.SH.t = 99999; });
let r = await ev(() => { const T = GAME.test, e = T.eyePos(); T.FL.length = 0; const f = T.addFloater('log', e[0] + 1, e[2]); T.collect(f); return T.INV.log; });
ok(r === 1, 'a log you haul in goes into your inventory as a log', r);
await ev(() => GAME.test.keyEvent('KeyI', true)); await ev(() => GAME.test.keyEvent('KeyI', false)); await st(4); await shot('l1-items');
r = await ev(() => GAME.test.panelName); ok(r === 'inv', 'I opens the items screen', r);
// click PLACE on the log row
const [px, py] = await G2P(640 + 240 - 214 + 48, 150 + 20); await p.mouse.click(px, py); await st(3);
r = await ev(() => ({ panel: GAME.test.panelName, place: !!GAME.test.ui.place }));
ok(r.place && !r.panel, 'PLACE closes the screen and starts placing the log', JSON.stringify(r));
await ev(() => { const T = GAME.test; T.IN.locked = true; T.PL.lx = .3; T.PL.lz = 2.0; T.PL.yaw = T.RAFT.yaw + Math.atan2(-(.75 - .3), -(.75 - 2.0)); T.PL.pitch = -.9; T.tick(.1); }); await st(4); await shot('l2-ghost');
r = await ev(() => { const T = GAME.test, P = T.ui.place, r0 = P.rot; T.keyEvent('KeyR', true); T.keyEvent('KeyR', false); T.keyEvent('KeyR', true); T.keyEvent('KeyR', false); T.tick(.05); return { turned: Math.round((P.rot - r0) * 180 / Math.PI), ok: P.ok, at: [P.lx.toFixed(2), P.lz.toFixed(2)] }; });
ok(r.turned === 30, 'R rotates it 15 degrees a press', JSON.stringify(r));
await st(3); await shot('l3-rotated');
// click: set it down (it stays put when you look away)
r = await ev(() => { const T = GAME.test; T.act.useDown(); T.act.useUp(); const P = T.ui.place, at = [P.lx, P.lz]; T.PL.pitch = -.2; T.tick(.2); return { set: P.set, ok: P.ok, stayed: P.lx === at[0] && P.lz === at[1] }; });
ok(r.set && r.ok && r.stayed, 'click sets it down where it was (it waits for SOLIDIFY)', JSON.stringify(r));
await ev(() => { GAME.test.PL.pitch = -.9; GAME.test.tick(.05); }); await st(3); await shot('l4-set');
r = await ev(() => { const T = GAME.test; T.act.useDown(); T.act.useUp(); T.tick(.05); return { logs: T.RAFT.logs.length, solid: T.RAFT.logs[0] && T.RAFT.logs[0].solid, inv: T.INV.log || 0, placing: !!T.ui.place }; });
ok(r.logs === 1 && r.solid && r.inv === 0 && !r.placing, 'click SOLIDIFY fixes it to the raft', JSON.stringify(r));
await st(4); await shot('l5-solid');
// it braces the deck: a shark bite on a braced cell does less
r = await ev(() => { const T = GAME.test, L = T.RAFT.logs[0], c = [...T.RAFT.cells.values()].find(c => Math.round(L.lx / 1.5) === c.i && Math.round(L.lz / 1.5) === c.j); return c ? c.i + ',' + c.j : null; });
ok(!!r, 'the log lies across a cell of the deck', r);
console.log('ERRORS', JSON.stringify(errs)); await b.close();
