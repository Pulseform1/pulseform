// Blackwater Drift with a friend: two browsers, one room through the live Pulsebox relay. node tools/blackwater-mp-check.mjs <shots>
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--proxy-server=' + process.env.HTTPS_PROXY] });
const ok = (c, name, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : ''));
const errs = [];
async function open(tag) {
  const ctx = await b.newContext({ viewport: { width: 960, height: 540 }, ignoreHTTPSErrors: true }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(tag + ': ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.addInitScript(() => { Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {}; try { localStorage.setItem('pbx-mp-name', 'P' + Math.floor(Math.random() * 90 + 10)); } catch (e) {} });
  await p.goto('file://' + new URL('../public/games/' + (process.env.BW_PAGE || 'blackwater.html'), import.meta.url).pathname);
  await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready, null, { timeout: 60000 });
  await p.click('#bPlay'); await p.waitForTimeout(800);
  await p.evaluate(() => { GAME.test.CFG.quality = 'low'; GAME.test.applyQuality(); });
  return p;
}
const H = await open('host'), C = await open('friend');
await H.evaluate(() => MP.show()); await H.click('#mp-create'); await H.waitForFunction(() => MP.online(), null, { timeout: 20000 });
const code = await H.evaluate(() => MP.code); ok(/^[A-Z]{4}$/.test(code), 'the host makes a room', code);
await C.evaluate(() => MP.show()); await C.click('#mp-joinb'); await C.fill('#mp-code', code); await C.click('#mp-joingo');
await C.waitForFunction(() => MP.online(), null, { timeout: 20000 }); await H.waitForTimeout(800);
await H.click('#mp-start');
await H.waitForTimeout(1500); await C.waitForTimeout(2500);
const T = (p, fn) => p.evaluate(fn);
let h = await T(H, () => ({ on: GAME.test.NET.on, client: GAME.test.NET.client, screen: GAME.test.screen, cells: GAME.test.RAFT.cells.size, peers: GAME.test.NET.peers.size }));
let c = await T(C, () => ({ on: GAME.test.NET.on, client: GAME.test.NET.client, screen: GAME.test.screen, cells: GAME.test.RAFT.cells.size, peers: GAME.test.NET.peers.size, fl: GAME.test.FL.length }));
ok(h.on && !h.client && h.screen === 'play' && h.peers === 1, 'the host is playing, with one friend', JSON.stringify(h));
ok(c.on && c.client && c.screen === 'play' && c.cells === h.cells, "the friend is on the host's raft (same foundations)", JSON.stringify(c));
// wreckage: the host's floaters show up for the friend
await T(H, () => { const T = GAME.test, R = T.RAFT; T.FL.length = 0; const f = T.addFloater('crate', R.x + 1.2, R.z + .4); window.__crate = f.id; T.addFloater('plank', R.x + 8, R.z + 3); });
await C.waitForTimeout(1500);
c = await T(C, () => ({ fl: GAME.test.FL.map(f => f.k).sort().join() }));
ok(c.fl === 'crate,plank', "the host's wreckage drifts past the friend too", c.fl);
// the friend grabs the crate: it goes into the shared materials
const inv0 = await T(H, () => JSON.stringify(GAME.test.INV));
await T(C, () => { const T = GAME.test, f = T.FL.find(f => f.k === 'crate'); T.collect(f); });
await H.waitForTimeout(1500); await C.waitForTimeout(500);
const inv1 = await T(H, () => JSON.stringify(GAME.test.INV)), cinv = await T(C, () => JSON.stringify(GAME.test.INV)), hfl = await T(H, () => GAME.test.FL.map(f => f.k).join());
ok(inv1 !== inv0 && cinv === inv1 && !hfl.includes('crate'), "the friend hauls in a crate: it lands in the raft's shared materials", inv1);
// the friend builds a foundation: the host's raft grows
await T(H, () => { GAME.test.give('plank', 10); GAME.test.give('rope', 6); }); await C.waitForTimeout(1200);
const built = await T(C, () => { const T = GAME.test; return T.place('foundation', 2, 0, 0); });
await H.waitForTimeout(1500); await C.waitForTimeout(800);
h = await T(H, () => ({ cells: GAME.test.RAFT.cells.size, plank: GAME.test.INV.plank })); c = await T(C, () => ({ cells: GAME.test.RAFT.cells.size }));
ok(built && h.cells === 5 && c.cells === 5, "the friend builds a foundation on the host's raft", JSON.stringify({ h, c }));
// they see each other
h = await T(H, () => { const p = [...GAME.test.NET.peers.values()][0]; return !!(p && p.pose); }); c = await T(C, () => { const p = [...GAME.test.NET.peers.values()][0]; return !!(p && p.pose); });
ok(h && c, 'each sees where the other is standing');
const fell = await T(C, () => GAME.test.PL.onRaft); ok(fell, 'the friend arrives standing on the raft, not in the sea');
await T(H, () => { const T = GAME.test; T.PL.lx = .2; T.PL.lz = .2; T.PL.yaw = T.RAFT.yaw - 1.57; T.PL.pitch = -.15; });
await T(C, () => { const T = GAME.test; T.PL.onRaft = true; T.PL.lx = 2.9; T.PL.lz = .2; T.PL.yaw = T.RAFT.yaw + 1.6; T.PL.pitch = -.2; });
await H.waitForTimeout(2500); await C.waitForTimeout(500);
await H.screenshot({ path: O + '/mp-host.png' }); await C.screenshot({ path: O + '/mp-friend.png' });
// the waves match: the raft rides the same sea on both
const hy = await T(H, () => [GAME.test.RAFT.x, GAME.test.RAFT.z, GAME.test.S.t]), cy = await T(C, () => [GAME.test.RAFT.x, GAME.test.RAFT.z, GAME.test.S.t]);
ok(Math.hypot(hy[0] - cy[0], hy[1] - cy[1]) < 1.5 && Math.abs(hy[2] - cy[2]) < 2, 'the raft is in the same place on both screens', `${Math.hypot(hy[0] - cy[0], hy[1] - cy[1]).toFixed(2)} m apart, clocks ${(hy[2] - cy[2]).toFixed(2)} s`);
console.log('ERRORS', JSON.stringify(errs.slice(0, 6))); await b.close();
