// ARROWWOOD on a touch screen (Chromium emulating an iPad Pro 11 in landscape, real multi-touch through the DevTools
// protocol): one finger walks on the move stick while another holds DRAW and drags from the button to adjust the aim,
// both at the same time; lifting the draw finger shoots.
//   node arrowwood/server/node-server.js --dev &   then   node tools/arrowwood-touch-check.mjs [base URL] [screenshot dir]
import { createRequire } from 'module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'http://localhost:8790', OUT = process.argv[3] || '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let fails = 0; const ok = (c, name, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : '')); };
const ctx = await b.newContext({ ...devices['iPad Pro 11 landscape'] }), p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
const T = (fn, a) => p.evaluate(fn, a), until = async (fn, a, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await T(fn, a); if (r) return r; await p.waitForTimeout(120); } return null; };
await p.goto(BASE + '/games/arrowwood.html?dev&nolock&quality=low' + (OUT ? '' : '&norender')); await p.waitForTimeout(600);
await p.tap('#bPlay'); await until(() => GAME.test.ready, null, 40000);
ok(await T(() => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0), 'the page sees a touch screen');
await T(() => GAME.test.act('practice')); await until(() => GAME.test.CL.phase === 'live' && GAME.test.CL.players.size > 2);
await T(() => GAME.test.tp(70, 121, 0, 0)); await p.waitForTimeout(400);
const cdp = await ctx.newCDPSession(p);
const toCss = (x, y) => T(([x, y]) => { const r = document.getElementById('cv').getBoundingClientRect(), V = K.view; return [r.left + (x - V.x0) / (V.x1 - V.x0) * r.width, r.top + (y - V.y0) / (V.y1 - V.y0) * r.height]; }, [x, y]);
const dB = await T(() => { const V = K.view, u = 1.15 / Math.max(.75, Math.min(1.4, Math.min((V.x1 - V.x0) / 1280, (V.y1 - V.y0) / 720))); return [V.x1 - 150 * u, V.y1 - 165 * u]; });
const [dx, dy] = await toCss(dB[0], dB[1]);
const stick = await toCss(220, 520);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 1 })) });
const p0 = await T(() => GAME.test.pos());
// finger 1 on the move stick, pushed forward
await touch('touchStart', [[stick[0], stick[1], 1]]); await touch('touchMove', [[stick[0], stick[1] - 70, 1]]);
// finger 2 on DRAW, both held
await touch('touchStart', [[stick[0], stick[1] - 70, 1], [dx, dy, 2]]);
await p.waitForTimeout(200);
const drawing = await T(() => GAME.test.ME.drawing);
// drag the draw finger (from the button itself) to the left and up while still walking
for (let k = 1; k <= 8; k++) { await touch('touchMove', [[stick[0], stick[1] - 70, 1], [dx - k * 12, dy - k * 4, 2]]); await p.waitForTimeout(60); }
await until(() => GAME.test.ME.drawT >= .9, null, 8000);
const mid = await T(() => ({ pos: GAME.test.pos(), drawing: GAME.test.ME.drawing, drawT: GAME.test.ME.drawT }));
if (OUT) await p.screenshot({ path: OUT + '/touch-drawing.png', timeout: 120000 });
ok(drawing && mid.drawing, 'holding DRAW pulls the string while the other thumb is down');
ok(Math.hypot(mid.pos.x - p0.x, mid.pos.z - p0.z) > .8, 'the move stick walks at the same time (slowly: drawing slows you)', Math.hypot(mid.pos.x - p0.x, mid.pos.z - p0.z).toFixed(2) + ' m');
ok(mid.pos.yaw > p0.yaw + .1 && mid.pos.pitch > p0.pitch + .02, 'dragging from the DRAW button turns the aim (left and up)', `yaw ${(mid.pos.yaw - p0.yaw).toFixed(2)}, pitch ${(mid.pos.pitch - p0.pitch).toFixed(2)}`);
const n0 = await T(() => GAME.test.ME.cid);
await touch('touchEnd', [[dx - 96, dy - 32, 2]]);   // lift only the draw finger (finger 1 stays down)
const fired = await until(n => GAME.test.ME.cid > n && !GAME.test.ME.drawing, n0, 4000);
ok(!!fired, 'lifting the draw finger shoots');
const stillWalking = await T(() => !!GAME.test.IN.stick);
ok(stillWalking, 'the move thumb is still down and still walking');
await touch('touchEnd', []);
const stopped = await T(() => !GAME.test.IN.stick);
ok(stopped, 'lifting the last finger lets go of the stick');
// LOWER cancels without spending an arrow
await until(() => GAME.test.ME.nockT === 0); const cid0 = await T(() => GAME.test.ME.cid); const lb = await T(() => { const V = K.view, u = 1.15 / Math.max(.75, Math.min(1.4, Math.min((V.x1 - V.x0) / 1280, (V.y1 - V.y0) / 720))); return [[V.x1 - 150 * u, V.y1 - 165 * u], [V.x1 - 295 * u, V.y1 - 92 * u]]; });
const [d2, c2] = [await toCss(...lb[0]), await toCss(...lb[1])];
await touch('touchStart', [[d2[0], d2[1], 3]]); await p.waitForTimeout(250); await touch('touchStart', [[d2[0], d2[1], 3], [c2[0], c2[1], 4]]); await p.waitForTimeout(100); const lowered = await T(() => !GAME.test.ME.drawing); await touch('touchEnd', []);
const canceled = lowered && (await T(() => GAME.test.ME.cid)) === cid0;
ok(canceled, 'LOWER drops the draw without loosing the arrow');
ok(errs.length === 0, 'no errors', JSON.stringify(errs.slice(0, 3)));
console.log(fails ? fails + ' FAILED' : 'ALL OK'); await b.close();
