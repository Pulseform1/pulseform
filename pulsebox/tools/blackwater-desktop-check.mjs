// Blackwater Drift in a real browser (mouse and keys): plays through the checklist and saves screenshots.
//   node tools/blackwater-desktop-check.mjs <screenshot folder>      (build first: python3 tools/build-games.py blackwater)
import { chromium } from 'playwright';
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
await ev(() => { GAME.test.CFG.quality = 'low'; GAME.test.applyQuality(); });
// the menu's own WAKE UP button
const [wx, wy] = await G2P(640, 347); await p.mouse.click(wx, wy); await st(4);
await ev(() => { GAME.test.IN.locked = true; });   // headless browsers can't lock the pointer: stand in for it
const s0 = await ev(() => ({ screen: GAME.test.screen, cells: GAME.test.RAFT.cells.size, tools: Object.keys(GAME.test.PL.tools), torch: GAME.test.PL.torch }));
ok(s0.screen === 'play' && s0.cells === 4 && s0.tools.join() === 'hook,torch' && !s0.torch, 'start on a tiny raft with a rope hook and an unlit torch', JSON.stringify(s0)); await shot('d1-start');
// a barrel drifts by: aim at it, hold the button, let go, hold again to reel
await ev(() => { const T = GAME.test, e = T.eyePos(); T.FL.length = 0; const f = T.addFloater('barrel', e[0] + 12, e[2] + 3); window.__barrel = f.id; T.PL.yaw = Math.atan2(-(f.x - e[0]), -(f.z - e[2])); T.PL.pitch = -.02; });
await p.mouse.down(); await st(30); await shot('d2-charge'); await p.mouse.up(); await st(12); await shot('d3-hook-flying');
await ev(() => GAME.test.tick(2)); const hk = await ev(() => ({ st: GAME.test.HK.state, n: GAME.test.HK.items.length }));
if (!hk.n) await ev(() => { const T = GAME.test, f = T.FL.find(f => f.id === window.__barrel); T.HK.x = f.x + .4; T.HK.z = f.z; T.tick(.1); });
await st(4); await shot('d4-hooked-slack');
await p.mouse.down(); await ev(() => GAME.test.tick(1)); await st(3); await shot('d5-reeling');
const reeled = await ev(() => { const T = GAME.test; T.tick(12); return { st: T.HK.state, inv: { ...T.INV }, pickups: T.PL.pickups }; }); await p.mouse.up();
ok(reeled.st === 'idle' && reeled.pickups === 1 && Object.keys(reeled.inv).length, 'hook and reel in a barrel: its contents land in your inventory', JSON.stringify(reeled.inv));
// enough salvage for a first upgrade, the hammer from the CRAFT menu, a foundation
await ev(() => { const T = GAME.test; T.give('plank', 12); T.give('rope', 6); T.give('scrap', 4); T.PL.pickups = 6; });
await p.keyboard.press('KeyC'); await st(3); await shot('d6-craft');
const [cx, cy] = await G2P(640, 194); await p.mouse.click(cx, cy); await st(2); await p.keyboard.press('KeyC'); await ev(() => { GAME.test.IN.locked = true; });
const ham = await ev(() => GAME.test.PL.tool); ok(ham === 'hammer', 'craft a hammer by clicking it in the craft menu');
await ev(() => { const T = GAME.test, R = T.RAFT; T.PL.lx = 1.5; T.PL.lz = .75; const [x, , z] = [0, 0, 0]; T.tick(.05); const e = T.eyePos(); const t = T.lifeTick; const w = (() => { const c = Math.cos(R.yaw), s = Math.sin(R.yaw), lx = 2 * 1.5, lz = 0.75; return [R.x + c * lx + s * lz, R.z - s * lx + c * lz]; })(); T.PL.yaw = Math.atan2(-(w[0] - e[0]), -(w[1] - e[2])); T.PL.pitch = Math.atan2(R.y + .32 - e[1], Math.hypot(w[0] - e[0], w[1] - e[2])); T.ui.buildKind = 'foundation'; });
await st(4); await shot('d7-build-preview'); await p.mouse.down(); await st(1); await p.mouse.up(); await st(10);
const cells = await ev(() => GAME.test.RAFT.cells.size); ok(cells === 5, 'expand the deck: click places a foundation where the preview was', cells + ' cells'); await shot('d8-built');
// fishing: craft a rod, cast, wait for a bite, reel with the tension in hand, eat it
await p.keyboard.press('KeyC'); await st(2); await ev(() => GAME.test.act.craft('rod')); await p.keyboard.press('KeyC'); await ev(() => { const T = GAME.test; T.IN.locked = true; T.PL.yaw += 1.5; T.PL.pitch = .15; });
await st(2); await p.keyboard.press('Digit4'); await p.mouse.down(); await st(25); await p.mouse.up(); await st(10); await ev(() => GAME.test.tick(2)); await st(2); await shot('d9-bobber');
await ev(() => { const T = GAME.test; for (let i = 0; i < 60 * 30 && T.FS.state !== 'bite'; i++) T.lifeTick(1 / 60, { mx: 0, mz: 0, use: false }); }); await st(1); await shot('d10-bite');
let caught = false; for (let k = 0; k < 220 && !caught; k++) { const s = await ev(() => ({ t: GAME.test.FS.tension, st: GAME.test.FS.state, f: GAME.test.FS.last })); if (s.st === 'idle') { caught = !!s.f; break; } if (s.t < .8) await p.mouse.down(); else await p.mouse.up(); await ev(() => GAME.test.tick(.15)); if (k === 12) { await st(2); await shot('d11-fight'); } }
await p.mouse.up();
const fish = await ev(() => ({ f: GAME.test.FS.last, inv: Object.keys(GAME.test.INV).filter(k => k.startsWith('fish:') && GAME.test.INV[k] > 0) }));
ok(caught && fish.inv.length, 'catch a fish with the rod', fish.f ? `${fish.f.k} ${(fish.f.len * 100).toFixed(0)} cm` : 'none');
const h0 = await ev(() => { GAME.test.PL.hunger = 40; return 40; }); await p.keyboard.press('Digit5'); const tool = await ev(() => GAME.test.PL.tool); await p.mouse.down(); await st(1); await p.mouse.up();
const h1 = await ev(() => GAME.test.PL.hunger); ok(h1 > h0, 'eat it from the hotbar', `${tool}: hunger ${h0} -> ${h1.toFixed(0)}`);
// a giant swell: watch the crest come, ride up the face, drop over the back
await ev(() => { const T = GAME.test, R = T.RAFT; Object.assign(T.S, { sea: .55, seaTo: .55, cloud: .8, cloudTo: .8, rain: .4, phase: 'storm', pt: 999, severe: true, nextGiant: 9999, tod: 15 }); T.spawnGiant(R, 7, 0); T.S.giants[T.S.giants.length - 1].s = R.x - 130; T.PL.lx = .75; T.PL.lz = .75; T.PL.tool = 'hook'; T.PL.yaw = Math.PI / 2; T.PL.pitch = .08; window.__ys = []; });
await ev(() => GAME.test.tick(5)); await st(3); await shot('d12-giant-approach');
const ride = await ev(() => { const T = GAME.test; let ys = [], max = -9; for (let i = 0; i < 60 * 16; i++) { T.lifeTick(1 / 60, { mx: 0, mz: 0, use: false, brace: true }); ys.push(T.RAFT.y); } const k = ys.indexOf(Math.max(...ys)); return { max: ys[k], min: Math.min(...ys.slice(k)) }; });
await st(3); await shot('d13-giant-after');
ok(ride.max > 4.5 && ride.min < ride.max - 3, 'the raft rides up a giant swell and drops behind it', `top ${ride.max.toFixed(1)} m, then ${ride.min.toFixed(1)} m`);
// a shark tears a piece off
await ev(() => { const T = GAME.test, R = T.RAFT; T.S.giants.length = 0; Object.assign(T.S, { sea: .2, seaTo: .2, rain: 0, rainTo: 0, cloud: .3, cloudTo: .3, phase: 'calm', pt: 999 }); Object.assign(T.SH, { state: 'circle', t: 4, x: R.x + 12, z: R.z, ang: 0, hits: 0 }); T.PL.play = 999; T.tick(8); });
const sh = await ev(() => ({ st: GAME.test.SH.state, cell: GAME.test.SH.cell }));
await ev(() => { const T = GAME.test, R = T.RAFT, c = R.cells.get(T.SH.cell); const e = T.eyePos(); T.PL.yaw = Math.atan2(-(T.SH.x - e[0]), -(T.SH.z - e[2])); T.PL.pitch = -.35; }); await st(3); await shot('d14-shark-latched');
const lost = await ev(() => { const T = GAME.test, n = T.RAFT.cells.size; T.tick(25); return [n, T.RAFT.cells.size]; });
ok(sh.st === 'bite' && lost[1] === lost[0] - 1, 'a shark latches onto an edge and tears that foundation away', `${lost[0]} -> ${lost[1]} cells`); await st(3); await shot('d15-piece-gone');
// whirlpool: paddle out with the oar
await ev(() => { const T = GAME.test, R = T.RAFT; T.SH.state = 'away'; T.SH.t = 9999; T.give('plank', 5); T.give('rope', 2); T.act.craft('oar'); const p = T.spawnPool(R, 1, [R.x + 28, R.z], 26, 400); p.age = 20; window.__pool = p; T.tick(8); });
await ev(() => { const T = GAME.test, R = T.RAFT, p = window.__pool; T.PL.yaw = Math.atan2(-(R.x - p.x), -(R.z - p.z)); T.PL.pitch = -.2; }); await st(3); await shot('d16-whirlpool');
const d0 = await ev(() => Math.hypot(window.__pool.x - GAME.test.RAFT.x, window.__pool.z - GAME.test.RAFT.z));
await p.mouse.down(); const d1 = await ev(() => { const T = GAME.test, R = T.RAFT, p = window.__pool; for (let i = 0; i < 60 * 40; i++) { T.PL.yaw = Math.atan2(-(R.x - p.x), -(R.z - p.z)); T.lifeTick(1 / 60, { mx: 0, mz: 0, use: true }); } return Math.hypot(p.x - R.x, p.z - R.z); }); await p.mouse.up();
ok(d1 > 45, 'paddle out of a whirlpool with the oar', `${d0.toFixed(0)} m -> ${d1.toFixed(0)} m from its centre`);
// the thing from below, by the developer key, at night
await ev(() => { GAME.test.S.pools.length = 0; }); await p.keyboard.press('F8');
const ph = []; for (const [t, name] of [[5, 'd17-rumble'], [16, 'd18-rising'], [12, 'd19-tower'], [12, 'd20-whirlpools-gap']]) { await ev(t => GAME.test.tick(t), t); await ev(() => { const T = GAME.test, R = T.RAFT; T.PL.yaw = Math.atan2(-(T.CT.x - R.x), -(T.CT.z - R.z)); T.PL.pitch = .1; }); if (name === 'd20-whirlpools-gap') await ev(() => { GAME.test.PL.pitch = -.45; }); await st(3); ph.push(await ev(() => GAME.test.CT.state)); await shot(name); }
await ev(() => GAME.test.tick(60)); ph.push(await ev(() => GAME.test.CT.state));
ok(ph.join() === 'rumble,rise,tower,tower,none', 'F8 (with ?dev) calls Cthulhu at night: rumble, rise, tower, sink, gone', ph.join());
console.log('ERRORS', JSON.stringify(errs.slice(0, 6), null, 1)); await b.close();
