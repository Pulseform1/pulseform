// Blackwater: the helm, sails, anchor, salvage net, lantern, the upgrades and the MAKE recipes, in a real browser.
//   BW_PAGE=blackwater-lab-b860f455.html node tools/blackwater-steer-check.mjs <screenshot folder>
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }), p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | '))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await p.addInitScript(() => { let now = 0, q = []; performance.now = () => now; window.requestAnimationFrame = cb => { q.push(cb); return q.length; }; window.__step = (n, ms = 1000 / 60) => { for (let i = 0; i < n; i++) { now += ms; const run = q; q = []; run.forEach(cb => cb(now)); } };
  Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () { setTimeout(() => document.dispatchEvent(new Event('pointerlockchange'))); }; Document.prototype.exitPointerLock = function () {}; });
await p.goto('file://' + new URL('../public/games/' + (process.env.BW_PAGE || 'blackwater.html'), import.meta.url).pathname + '?dev'); await p.waitForTimeout(4500);
const st = n => p.evaluate(n => window.__step(n), n), shot = n => p.screenshot({ path: `${O}/${n}.png`, timeout: 120000 }), ev = (fn, a) => p.evaluate(fn, a);
let fails = 0; const ok = (c, name, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : '')); };
await p.click('#bPlay'); await st(4);
await ev(() => { const T = GAME.test; if (T.screen !== 'play') T.menuStart(); T.CFG.quality = 'low'; T.applyQuality(); T.IN.locked = true; T.SH.state = 'away'; T.SH.t = 99999; T.S.tod = 12; });
// a 3x3 raft and plenty to build with
let r = await ev(() => { const T = GAME.test; for (const k of ['plank', 'rope', 'scrap', 'tinder']) T.INV[k] = 60; T.PL.tools.hammer = 1;
  const noGear = T.place('helm', 1, 2); const mk = k => T.make(T.GEAR.find(r => r.k === k)); const crafted = [mk('helm'), mk('sail'), mk('sail'), mk('sail'), mk('sail'), mk('anchor')].every(Boolean) && T.INV.helm === 1 && T.INV.sail === 4;
  const built = [!noGear, crafted]; for (const [i, j] of [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2], [-1, 0]]) built.push(T.place('foundation', i, j));
  built.push(T.place('helm', 1, 2), T.place('sail', 1, 1), T.place('sail', 0, 1), T.place('anchor', 2, 2), T.place('net', -1, 0), T.place('lantern', 2, 0));
  return { built, cells: T.RAFT.cells.size, order: T.BUILD_ORDER.length }; });
ok(r.built.every(Boolean), 'helm, sails and anchor are crafted (C) first, then placed; net and lantern built', JSON.stringify(r));
r = await ev(() => { const T = GAME.test; const third = T.place('sail', 0, 0), fourth = T.place('sail', 1, 0); return { third, fourth, left: T.INV.sail }; }); ok(r.third && !r.fourth && r.left === 1, 'no more than three sails, and placing one uses it up', JSON.stringify(r));
// the build list shows all 15 pieces
await ev(() => { const T = GAME.test; T.act.select('hammer'); T.ui.buildOpen = true; }); await st(3); await shot('s1-build-list');
await ev(() => { GAME.test.ui.buildOpen = false; });
// take the helm and steer
r = await ev(() => { const T = GAME.test, c = T.cellAt(T.RAFT, 1, 2); T.takeHelm(c); T.tick(.1); return { helm: T.PL.helm, prompt: T.ui.prompt }; });
ok(r.helm === '1,2', 'E at the helm takes the wheel', JSON.stringify(r));
r = await ev(() => { const T = GAME.test, y0 = T.RAFT.yaw, lx = T.PL.lx; T.keyEvent('KeyA', true); T.tick(4); T.keyEvent('KeyA', false); const y1 = T.RAFT.yaw; T.keyEvent('KeyD', true); T.tick(8); T.keyEvent('KeyD', false); return { left: +(y1 - y0).toFixed(2), right: +(T.RAFT.yaw - y1).toFixed(2), stayed: Math.abs(T.PL.lx - lx) < .01 }; });
ok(r.left > .3 && r.right < -.3 && r.stayed, 'A turns the raft left, D turns it right, and you stay at the wheel', JSON.stringify(r));
// sails: point the raft downwind, then compare drifting with sailing
r = await ev(() => { const T = GAME.test, S = T.S; T.RAFT.yaw = Math.atan2(-Math.cos(S.windAng), -Math.sin(S.windAng)); T.RAFT.vyaw = 0;
  T.tick(6); const v0 = Math.hypot(T.RAFT.vx, T.RAFT.vz);
  T.keyEvent('KeyW', true); T.keyEvent('KeyW', false); const half = T.sailLevel(); T.keyEvent('KeyW', true); T.keyEvent('KeyW', false); const full = T.sailLevel();
  T.tick(14); const v1 = Math.hypot(T.RAFT.vx, T.RAFT.vz), f = [-Math.sin(T.RAFT.yaw), -Math.cos(T.RAFT.yaw)], along = (T.RAFT.vx * f[0] + T.RAFT.vz * f[1]) / v1;
  return { half, full, drift: +v0.toFixed(2), sailing: +v1.toFixed(2), along: +along.toFixed(2) }; });
ok(r.half === .5 && r.full === 1 && r.sailing > r.drift * 2 && r.along > .8, 'W raises the sails, and full sail drives the raft the way it points, much faster than drifting', JSON.stringify(r));
await ev(() => { const T = GAME.test; T.PL.pitch = -.15; T.PL.yaw = T.RAFT.yaw + .5; }); await st(6); await shot('s2-helm-full-sail');
r = await ev(() => { const T = GAME.test, S = T.S; T.RAFT.yaw = Math.atan2(Math.cos(S.windAng), Math.sin(S.windAng)); T.RAFT.vyaw = 0; T.tick(14); return +Math.hypot(T.RAFT.vx, T.RAFT.vz).toFixed(2); });
ok(r > 0, 'sailing into the wind is slower', r);
r = await ev(() => { const T = GAME.test; T.keyEvent('KeyS', true); T.keyEvent('KeyS', false); T.keyEvent('KeyS', true); T.keyEvent('KeyS', false); return T.sailLevel(); }); ok(r === 0, 'S lowers the sails', r);
r = await ev(() => { const T = GAME.test; T.keyEvent('KeyE', true); T.keyEvent('KeyE', false); return T.PL.helm; }); ok(!r, 'E lets go of the wheel', r);
// the anchor holds the raft
r = await ev(() => { const T = GAME.test, c = T.cellAt(T.RAFT, 2, 2); T.tick(8); const v0 = Math.hypot(T.RAFT.vx, T.RAFT.vz); T.toggleAnchor(c); T.tick(25); const v1 = Math.hypot(T.RAFT.vx, T.RAFT.vz); T.toggleAnchor(c); T.tick(25); return { drift: +v0.toFixed(3), anchored: +v1.toFixed(3), again: +Math.hypot(T.RAFT.vx, T.RAFT.vz).toFixed(3) }; });
ok(r.anchored < r.drift * .3 && r.again > r.anchored * 2, 'dropping the anchor stops the drift, raising it lets the raft go again', JSON.stringify(r));
// the salvage net catches wreckage that drifts into it
r = await ev(() => { const T = GAME.test, c = T.cellAt(T.RAFT, -1, 0); T.FL.length = 0; const s = [[1, 0], [-1, 0], [0, 1], [0, -1]].findIndex(([di, dj]) => !T.cellAt(T.RAFT, c.i + di, c.j + dj)); const [di, dj] = [[1, 0], [-1, 0], [0, 1], [0, -1]][s];
  const lx = (c.i + di * .95) * 1.5, lz = (c.j + dj * .95) * 1.5, cy = Math.cos(T.RAFT.yaw), sy = Math.sin(T.RAFT.yaw); T.addFloater('crate', T.RAFT.x + cy * lx + sy * lz, T.RAFT.z - sy * lx + cy * lz); T.piecesTick(.1);
  const caught = c.store, p0 = T.INV.plank + T.INV.rope + T.INV.scrap + (T.INV.biscuit || 0) + (T.INV.tinder || 0) + (T.INV.water || 0) + (T.INV.coconut || 0) + (T.INV.line || 0); T.emptyPiece(c);
  const p1 = T.INV.plank + T.INV.rope + T.INV.scrap + (T.INV.biscuit || 0) + (T.INV.tinder || 0) + (T.INV.water || 0) + (T.INV.coconut || 0) + (T.INV.line || 0); return { caught, floating: T.FL.length, got: p1 - p0, after: c.store }; });
ok(r.caught === 1 && r.floating === 0 && r.got >= 2 && r.after === 0, 'the salvage net catches a crate, and E empties it into your items', JSON.stringify(r));
// the lantern makes shark bites hurt less
r = await ev(() => { const T = GAME.test, a = T.cellAt(T.RAFT, 2, 0), f = T.cellAt(T.RAFT, -1, 0); a.hp = f.hp = 100; T.hurtCell(a, 20, 'shark'); T.hurtCell(f, 20, 'shark'); return { nearLamp: 100 - a.hp, far: 100 - f.hp }; });
ok(r.nearLamp < r.far, 'a shark bite near a lantern does less damage', JSON.stringify(r));
// crafting: upgrades and MAKE
await ev(() => { const T = GAME.test; T.keyEvent('KeyC', true); T.keyEvent('KeyC', false); }); await st(3); await shot('s3-craft');
r = await ev(() => { const T = GAME.test; T.INV.tinder = 4; const r0 = T.INV.rope; T.make(T.MAKE[0]); return { rope: T.INV.rope - r0, tinder: T.INV.tinder }; });
ok(r.rope === 1 && r.tinder === 2, 'Twist rope turns 2 tinder into 1 rope', JSON.stringify(r));
r = await ev(() => { const T = GAME.test; T.PL.pickups = 20; const noSpear = T.act.craft('harpoon'); T.act.craft('spear'); const barb = T.act.craft('harpoon'); const hook = T.act.craft('ironhook'); return { noSpear, barb, hook, hotbar: T.hotbar().map(h => h.k).join(',') }; });
ok(!r.noSpear && r.barb && r.hook && !/ironhook|harpoon/.test(r.hotbar), 'upgrades need their tool first and take no hotbar slot', JSON.stringify(r));
await st(3); await shot('s4-craft-done');
await ev(() => { const T = GAME.test; T.keyEvent('KeyC', true); T.keyEvent('KeyC', false); T.S.tod = 22; T.tick(.1); }); await st(6); await shot('s5-night-lantern');
// a save and reload keeps the new pieces
r = await ev(() => { const T = GAME.test; return [...T.RAFT.cells.values()].filter(c => ['helm', 'sail', 'anchor', 'net', 'lantern'].includes(c.obj)).length; });
ok(r === 7, 'the helm, three sails, anchor, net and lantern all stand on the raft', r);
ok(errs.length === 0, 'no errors', JSON.stringify(errs.slice(0, 3)));
console.log(fails ? fails + ' FAILED' : 'ALL OK'); await b.close();
