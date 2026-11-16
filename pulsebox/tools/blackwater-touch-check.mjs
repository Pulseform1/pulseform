// Blackwater Drift in a real browser (iPad touch): plays through the checklist and saves screenshots.
//   node tools/blackwater-touch-check.mjs <screenshot folder>      (build first: python3 tools/build-games.py blackwater)
import { createRequire } from 'module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const O = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ ...devices['iPad Pro 11 landscape'], deviceScaleFactor: 1 }), p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
await p.addInitScript(() => { let now = 0, q = []; performance.now = () => now; window.requestAnimationFrame = cb => { q.push(cb); return q.length; }; window.__step = (n, ms = 1000 / 60) => { for (let i = 0; i < n; i++) { now += ms; const run = q; q = []; run.forEach(cb => cb(now)); } }; });
await p.goto('file://' + new URL('../public/games/blackwater.html', import.meta.url).pathname + ''); await p.waitForTimeout(4500);
const st = n => p.evaluate(n => window.__step(n), n), shot = n => p.screenshot({ path: `${O}/${n}.png`, timeout: 120000 }), ev = (fn, a) => p.evaluate(fn, a);
const ok = (c, name, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : ''));
const cdp = await ctx.newCDPSession(p), pts = new Map();
const touch = async (type, id, x, y) => { if (type === 'touchEnd') pts.delete(id); else pts.set(id, { x, y, id }); await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...pts.values()] }); };
const G2P = (x, y) => ev(([x, y]) => { const r = document.getElementById('cv').getBoundingClientRect(), V = K.view; return [r.left + (x - V.x0) / (V.x1 - V.x0) * r.width, r.top + (y - V.y0) / (V.y1 - V.y0) * r.height]; }, [x, y]);
const btnAt = async k => { const b2 = await ev(k => GAME.test.touchButtons().find(b => b.k === k), k); return b2 ? G2P(b2.x, b2.y) : null; };
await p.tap('#bPlay'); await st(4);
await ev(() => { GAME.test.CFG.quality = 'low'; GAME.test.applyQuality(); });
const [wx, wy] = await G2P(640, 347); await touch('touchStart', 1, wx, wy); await st(1); await touch('touchEnd', 1); await st(4);
ok(await ev(() => GAME.test.screen) === 'play', 'tap WAKE UP to start');
await ev(() => { const T = GAME.test, e = T.eyePos(); T.FL.length = 0; const f = T.addFloater('crate', e[0] + 11, e[2]); window.__crate = f; T.PL.yaw = Math.atan2(-(f.x - e[0]), -(f.z - e[2])); T.PL.pitch = -.02; });
await st(3); await shot('t1-touch-hud');
// hold THROW, let go: the hook flies
let [ux, uy] = await btnAt('use'); await touch('touchStart', 2, ux, uy); await st(30); const ch = await ev(() => GAME.test.HK.charge); await touch('touchEnd', 2); await st(6);
ok(ch > .3 && ['fly', 'water'].includes(await ev(() => GAME.test.HK.state)), 'hold THROW and let go to cast the hook', `charge ${ch.toFixed(2)}`);
await ev(() => { GAME.test.tick(2); const T = GAME.test, f = window.__crate; if (!T.HK.items.length) { T.HK.x = f.x + .3; T.HK.z = f.z; T.tick(.1); } });
// hold REEL with the same thumb and drag it: it reels and aims at once
[ux, uy] = await btnAt('use'); const y0 = await ev(() => GAME.test.PL.yaw);
await touch('touchStart', 3, ux, uy); for (let i = 1; i <= 10; i++) { await touch('touchMove', 3, ux - i * 8, uy - i * 2); await st(3); }
const mid = await ev(() => ({ reel: GAME.test.HK.reel, yaw: GAME.test.PL.yaw })); await shot('t2-reel-and-aim');
await ev(() => GAME.test.tick(14)); await touch('touchEnd', 3); await st(2);
ok(mid.reel && Math.abs(mid.yaw - y0) > .1, 'holding REEL and dragging the same thumb reels in while turning the view', `turned ${((mid.yaw - y0) * 57).toFixed(0)}°`);
ok(await ev(() => GAME.test.PL.pickups) === 1, 'the crate comes aboard', JSON.stringify(await ev(() => GAME.test.INV)));
// the move stick walks you across the deck
const lx0 = await ev(() => [GAME.test.PL.lx, GAME.test.PL.lz]); const [sx, sy] = await G2P(260, 560);
await touch('touchStart', 4, sx, sy); await touch('touchMove', 4, sx, sy - 70); await ev(() => GAME.test.tick(.6)); await st(2); await touch('touchEnd', 4);
const lx1 = await ev(() => [GAME.test.PL.lx, GAME.test.PL.lz]); ok(Math.hypot(lx1[0] - lx0[0], lx1[1] - lx0[1]) > .3, 'the left stick walks you across the deck', `${Math.hypot(lx1[0] - lx0[0], lx1[1] - lx0[1]).toFixed(2)} m`);
// GRAB appears when wreckage bumps the raft
await ev(() => { const T = GAME.test, e = T.eyePos(); T.addFloater('plank', e[0] + 1.4, e[2] + .4); T.tick(.1); }); await st(2);
const g = await btnAt('grab'); let n0 = await ev(() => GAME.test.PL.pickups);
if (g) { await touch('touchStart', 5, g[0], g[1]); await st(1); await touch('touchEnd', 5); await st(2); }
ok(g && (await ev(() => GAME.test.PL.pickups)) === n0 + 1, 'a GRAB button appears for wreckage against the raft, and takes it');
// build by touch: craft a hammer, PIECE, aim, BUILD
await ev(() => { const T = GAME.test; T.give('plank', 8); T.give('rope', 4); T.act.craft('hammer'); const R = T.RAFT; T.PL.lx = 1.5; T.PL.lz = .75; T.tick(.05); const e = T.eyePos(), c = Math.cos(R.yaw), s = Math.sin(R.yaw), w = [R.x + c * 3 + s * .75, R.z - s * 3 + c * .75]; T.PL.yaw = Math.atan2(-(w[0] - e[0]), -(w[1] - e[2])); T.PL.pitch = Math.atan2(R.y + .32 - e[1], Math.hypot(w[0] - e[0], w[1] - e[2])); });
await st(3); [ux, uy] = await btnAt('use'); await touch('touchStart', 6, ux, uy); await st(1); await touch('touchEnd', 6); await st(3); await shot('t3-built');
ok(await ev(() => GAME.test.RAFT.cells.size) === 5, 'BUILD places a foundation by touch');
// iPad layout: the buttons sit inside the screen and do not overlap each other
const lay = await ev(() => { const B = GAME.test.touchButtons(), V = K.view; return { inside: B.every(b => b.x - b.r > V.x0 && b.x + b.r < V.x1 && b.y - b.r > V.y0 && b.y + b.r < V.y1), overlap: B.some((a, i) => B.some((c, j) => j > i && Math.hypot(a.x - c.x, a.y - c.y) < a.r + c.r)) }; });
ok(lay.inside && !lay.overlap, 'the touch buttons fit the iPad screen without overlapping', JSON.stringify(lay));
console.log('ERRORS', JSON.stringify(errs.slice(0, 6), null, 1)); await b.close();
