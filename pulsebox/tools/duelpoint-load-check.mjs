// Duelpoint online: the match waits on the loading screen until every player has loaded.
// A friend's "loaded" message is held back for 8 s: the host must wait, then both start together.
//   node tools/duelpoint-load-check.mjs
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--proxy-server=' + process.env.HTTPS_PROXY] });
const errs = [], ok = (c, n, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : ''));
async function open(tag) {
  const p = await (await b.newContext({ viewport: { width: 960, height: 540 }, ignoreHTTPSErrors: true })).newPage();
  p.on('pageerror', e => errs.push(tag + ': ' + e.message));
  await p.addInitScript(() => { Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {}; try { localStorage.setItem('pbx-mp-name', 'L' + Math.floor(Math.random() * 90 + 10)); } catch (e) {} });
  await p.goto('file://' + path.resolve('public/games/duelpoint.html'), { timeout: 120000 });
  await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 90000 }); await p.waitForTimeout(500);
  await p.click('#bPlay'); await p.waitForTimeout(600); return p;
}
const H = await open('host'), C = await open('friend');
await H.evaluate(() => { GAME.test.openParty(); MP.create(); }); await H.waitForFunction(() => MP.online(), null, { timeout: 20000 });
const code = await H.evaluate(() => MP.code);
// the friend's game will not say it has loaded for 8 seconds
await C.evaluate(c => { const s0 = MP.send.bind(MP), t0 = Date.now() + 1e9; window.__hold = t0; MP.send = m => { if (m && m.t === 'ld' && Date.now() < window.__hold) return; if (m && m.t === 'S' || m && m.t === 's') { if (Date.now() < window.__hold) m.rd = 0; } return s0(m); }; GAME.test.openParty(); MP.join(c); }, code);
await C.waitForFunction(() => MP.online(), null, { timeout: 20000 }); await H.waitForTimeout(1200);
await C.evaluate(() => { GAME.test.PARTY.ready = true; }); await C.waitForTimeout(1200);
await H.evaluate(() => { GAME.test.PARTY.set.size = 1; MP.start(); });
await C.evaluate(() => { window.__hold = Date.now() + 8000; });
await H.waitForTimeout(6000);
let h = await H.evaluate(() => { const M = GAME.test.M; return { load: GAME.test.loadingNow(), allIn: !!M.allIn, t: +M.t.toFixed(1), phase: M.phase }; });
ok(h.load && !h.allIn, 'six seconds in, the host is still waiting on the loading screen for the friend', JSON.stringify(h));
await H.waitForFunction(() => GAME.test.M.allIn, null, { timeout: 30000 }).catch(() => {});
await C.waitForFunction(() => GAME.test.M && GAME.test.M.allIn, null, { timeout: 30000 }).catch(() => {});
h = await H.evaluate(() => ({ allIn: !!GAME.test.M.allIn, t: +GAME.test.M.t.toFixed(1) })); const c = await C.evaluate(() => ({ allIn: !!GAME.test.M.allIn, t: +GAME.test.M.t.toFixed(1) }));
ok(h.allIn && c.allIn && Math.abs(h.t - c.t) < 1.5, 'once the friend has loaded, both start together with the same clock', JSON.stringify({ h, c }));
await H.waitForFunction(() => !GAME.test.loadingNow(), null, { timeout: 30000 }).catch(() => {});
h = await H.evaluate(() => ({ load: GAME.test.loadingNow(), phase: GAME.test.M.phase })); ok(!h.load && h.phase === 'buy', 'the loading screen then ends into the buy phase', JSON.stringify(h));
console.log('ERRORS', JSON.stringify(errs.slice(0, 6))); await b.close();
