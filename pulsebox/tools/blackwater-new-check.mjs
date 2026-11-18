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
await p.goto('file://' + new URL('../public/games/' + (process.env.BW_PAGE || 'blackwater.html'), import.meta.url).pathname + '?dev'); await p.waitForTimeout(4500);
const st = n => p.evaluate(n => window.__step(n), n), shot = n => p.screenshot({ path: `${O}/${n}.png`, timeout: 120000 }), ev = (fn, a) => p.evaluate(fn, a), out = {};
const ok = (c, name, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : ''));
const G2P = (x, y) => ev(([x, y]) => { const r = document.getElementById('cv').getBoundingClientRect(), V = K.view; return [r.left + (x - V.x0) / (V.x1 - V.x0) * r.width, r.top + (y - V.y0) / (V.y1 - V.y0) * r.height]; }, [x, y]);
await p.click('#bPlay'); await st(4);
// the additions: key panel, thirst and drinking, rain catcher, water still, fish trap, the sunken crate, and no sea on the deck
await ev(() => { GAME.test.CFG.quality = 'low'; GAME.test.applyQuality(); });
const [wx, wy] = await G2P(640, 347); await p.mouse.click(wx, wy); await st(4);
await ev(() => { GAME.test.IN.locked = true; });
await st(10); await shot('n1-keys');
let r = await ev(() => { const T = GAME.test; T.PL.thirst = 40; const w0 = T.INV.water; T.keyEvent('KeyQ', true); T.keyEvent('KeyQ', false); return { thirst: Math.round(T.PL.thirst), water: [w0, T.INV.water] }; });
ok(r.thirst === 80 && r.water[1] === r.water[0] - 1, 'Q drinks fresh water: thirst goes up', JSON.stringify(r));
r = await ev(() => { const T = GAME.test; T.PL.thirst = 100; T.tick(60); return +T.PL.thirst.toFixed(1); });
ok(r < 95 && r > 85, 'thirst drains over time (about 16 minutes full to empty)', r);
// build the three new pieces on a bigger raft
r = await ev(() => { const T = GAME.test; T.SH.state = 'away'; T.SH.t = 99999; T.give('plank', 60); T.give('rope', 20); T.give('scrap', 20); T.PL.tools.hammer = 1;
  for (const [i, j] of [[2, 0], [2, 1], [-1, 0]]) T.place('foundation', i, j, 0);
  return [T.place('catcher', 0, 0, 0), T.place('still', 1, 0, 0), T.place('trap', 2, 1, 0)]; });
ok(r.every(Boolean), 'build a rain catcher, a water still and a fish trap', JSON.stringify(r));
r = await ev(() => { const T = GAME.test; for (let k = 0; k < 80; k++) { T.S.rain = .9; T.S.cloud = .9; T.S.tod = 12; T.tick(1); } const c = T.cellAt(T.RAFT, 0, 0); return c.store; });
ok(r >= 2, 'the rain catcher fills while it rains', r);
r = await ev(() => { const T = GAME.test; T.S.rain = 0; T.S.cloud = .1; T.S.tod = 9; T.tick(200); return [T.cellAt(T.RAFT, 1, 0).store, T.cellAt(T.RAFT, 2, 1).store]; });
ok(r[0] >= 1 && r[1] >= 1, 'the still makes water in the sun; the trap catches fish', JSON.stringify(r));
await ev(() => { const T = GAME.test; T.SH.state = 'away'; T.SH.t = 999; T.PL.onRaft = true; T.PL.lx = .2; T.PL.lz = 1.9; T.PL.yaw = -Math.PI * .2; T.PL.pitch = -.5; T.tick(.2); }); await st(6); console.log('meshes', await ev(() => { const X = GAME.test.X; let objs = []; X.scene.traverse(o => { if (o.userData && o.userData.cell && o.userData.v) objs.push(o.userData.cell.i + ',' + o.userData.cell.j + ':' + o.children.length + ':' + o.userData.v); }); return objs.join('  '); }));
console.log('cells', await ev(() => { const T = GAME.test; return [...T.RAFT.cells.values()].map(c => c.i + ',' + c.j + ':' + (c.obj || '-')).join(' ') + ' | pl ' + T.PL.lx.toFixed(1) + ',' + T.PL.lz.toFixed(1) + ' yaw ' + T.RAFT.yaw.toFixed(2); })); await shot('n2-pieces');
r = await ev(() => { const T = GAME.test, c = T.cellAt(T.RAFT, 2, 1), w0 = T.INV.water || 0; const fishBefore = Object.keys(T.INV).filter(k => k.startsWith('fish:')).reduce((a, k) => a + T.INV[k], 0);
  T.act.interact && null; const n = c.store; c.store && (() => { const save = T.ui.aim; })(); return { n }; });
// empty the trap and the catcher by standing at them and pressing E
r = await ev(() => { const T = GAME.test; const res = {};
  T.FL.length = 0; for (const [i, j] of [[2, 1], [0, 0]]) { T.PL.onRaft = true; T.PL.lx = i * 1.5 + .3; T.PL.lz = j * 1.5 + .3; T.PL.pitch = -1.45; T.tick(.05);
    const before = JSON.stringify(T.INV); T.act.interact(); res[i + ',' + j] = { prompt: T.ui.prompt, changed: before !== JSON.stringify(T.INV) }; }
  return res; });
ok(Object.values(r).every(v => v.changed), 'E empties the trap (fish) and the catcher (fresh water)', JSON.stringify(r));
// the sunken crate: it appears with bubbles, you dive to it and open it
await ev(() => { const T = GAME.test; T.CACHE.t = 0; T.tick(.1); });
r = await ev(() => ({ on: GAME.test.CACHE.on, d: Math.hypot(GAME.test.CACHE.x - GAME.test.RAFT.x, GAME.test.CACHE.z - GAME.test.RAFT.z).toFixed(1) }));
ok(r.on, 'a sunken crate appears near the raft', JSON.stringify(r));
await ev(() => { const T = GAME.test, C = T.CACHE; Object.assign(T.PL, { onRaft: false, wx: C.x + 2.5, wz: C.z, wy: C.y + 1.2, yaw: Math.PI / 2, pitch: -.35 }); T.keyEvent('ShiftLeft', true); T.tick(.5); });
await st(6); await shot('n3-dive');
r = await ev(() => { const T = GAME.test, C = T.CACHE; Object.assign(T.PL, { wx: C.x + 1.2, wz: C.z, wy: C.y + .6 }); T.tick(.05); const air = T.PL.air; const p0 = T.ui.prompt, s0 = JSON.stringify(T.INV); T.act.interact(); T.keyEvent('ShiftLeft', false); return { p0, air: Math.round(air), got: s0 !== JSON.stringify(T.INV), on: C.on }; });
ok(r.got && !r.on && r.air < 100, 'dive down (breath runs low) and open it with E', JSON.stringify(r));
// no sea on the deck: a giant swell under the raft, looking at the deck
await ev(() => { const T = GAME.test, R = T.RAFT; Object.assign(T.PL, { onRaft: true, lx: .75, lz: .75, pitch: -.6, yaw: Math.PI / 2 }); Object.assign(T.S, { sea: .7, seaTo: .7, cloud: .7, rain: .3, tod: 14, nextGiant: 9999 }); T.spawnGiant(R, 7, 0); T.S.giants[T.S.giants.length - 1].s = R.x - 60; T.tick(4); });
await st(10); await shot('n4-swell');
await ev(() => { const T = GAME.test; T.tick(3); }); await st(10); await shot('n5-swell2');
console.log('ERRORS', JSON.stringify(errs)); await b.close();
