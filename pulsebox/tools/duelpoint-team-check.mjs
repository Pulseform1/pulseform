// Duelpoint: team play in a real browser: the charge carrier (chosen, passed on, dropped, fetched by a bot), guns on the floor
// (dropped, picked up, swapped, bought for a teammate, dropped on death), overtime, and the full buy phase.
//   node tools/duelpoint-team-check.mjs <shots>
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2] || '.', URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [], ok = (c, n, x = '') => { console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : '')); if (!c) process.exitCode = 1; };
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
await p.addInitScript(() => { Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {}; });
await p.goto(URL0, { timeout: 120000 });
await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 90000 }); await p.waitForTimeout(600);
await p.click('#bPlay'); await p.waitForTimeout(900);
const T = (fn, a) => p.evaluate(fn, a);
// a 3v3 where we attack first
let r = await T(() => { const t = GAME.test, X2 = t.team(); t.CFG.sites = 1; t.CFG.win = 5; let tries = 0; do { if (t.M) t.toMenu(); t.menuPlay(3); t.skipLoad(); } while (t.st().fs[0].side !== 'att' && tries++ < 20);
  const M = t.M, P = M.fs[0]; return { side: t.st().fs[0].side, carrier: M.charge && M.charge.k, me: P.key, t: M.t }; });
ok(r.side === 'att' && r.carrier === r.me, 'attacking, the charge starts with you (a person before a bot)', JSON.stringify(r));
r = await T(() => { const t = GAME.test, X2 = t.team(), M = t.M, P = M.fs[0], mate = M.fs.find(f => f !== P && f.team === P.team); const g = X2.giveCharge(P, mate); return { g, carrier: M.charge.k, mate: mate.key }; });
ok(r.g && r.carrier === r.mate, 'in the armory you hand the charge to a teammate', JSON.stringify(r));
r = await T(() => { const t = GAME.test, X2 = t.team(), M = t.M, P = M.fs[0], mate = M.byKey[M.charge.k]; const g = X2.giveCharge(P, P); return { g, carrier: M.charge.k, me: P.key }; });
ok(r.g && r.carrier === r.me, '...and take it back from a bot', JSON.stringify(r));
// the buy phase runs its whole time even when everyone has bought
r = await T(() => { const t = GAME.test, M = t.M; M.fs.forEach(f => f.ready = true); const t0 = M.t; t.tick(.5); return { t0: +t0.toFixed(2), t1: +M.t.toFixed(2) }; });
ok(r.t0 - r.t1 > .4 && r.t1 > 2, 'everyone ready: the buy phase keeps counting down (no cut to 1.5 s)', JSON.stringify(r));
// guns: buy, drop it (T), it lies on the floor, walk on it with the slot free and it is yours again
r = await T(() => { const t = GAME.test, X2 = t.team(), M = t.M, P = M.fs[0]; P.credits = 9000; t.buy('vesper'); const had = P.guns[1]; X2.dropHeld(P); const loot = M.loot.map(d => d.k), slot = P.guns[1];
  const d = M.loot[0]; P.x = d.x; P.z = d.z; d.at -= 5; t.tick(.1); return { had, loot, slot, back: P.guns[1], left: M.loot.length }; });
ok(r.had === 'vesper' && r.loot[0] === 'vesper' && r.slot === null && r.back === 'vesper' && r.left === 0, 'T drops the gun in your hand; walking over it picks it up', JSON.stringify(r));
await p.waitForTimeout(300);
// buy one for a teammate: it lands at their feet and the bot takes it
r = await T(() => { const t = GAME.test, X2 = t.team(), M = t.M, P = M.fs[0], mate = M.fs.find(f => f !== P && f.team === P.team && f.bot); mate.guns[1] = null; const c0 = P.credits; const ok2 = X2.buyFor(P, mate, 'lancer'); const n = M.loot.length; t.tick(.2); return { ok2, spent: c0 - P.credits, n, got: mate.guns[1], left: M.loot.length }; });
ok(r.ok2 && r.spent === 2900 && r.n === 1 && r.got === 'lancer' && r.left === 0, 'buying for a teammate: the gun lands at their feet and they pick it up', JSON.stringify(r));
// F swaps: stand on a better gun with your slot full
r = await T(() => { const t = GAME.test, X2 = t.team(), M = t.M, P = M.fs[0], mate = M.fs.find(f => f !== P && f.team === P.team && f.bot); mate.credits = 9000; X2.buyFor(mate, P, 'torrent'); const d = M.loot.find(q => q.k === 'torrent'); P.x = d.x; P.z = d.z; d.at -= 5; t.tick(.05);
  const near = P.nearLoot && P.nearLoot.k; X2.stepLoot(P, { use: true }, true); return { near, now: P.guns[1], floor: M.loot.map(q => q.k) }; });
ok(r.near === 'torrent' && r.now === 'torrent' && r.floor.includes('vesper'), 'F swaps your gun for the one underfoot (yours drops)', JSON.stringify(r));
await T(() => { const t = GAME.test, M = t.M; t.UI.armory = false; M.t = .01; t.tick(.3); });
await p.waitForTimeout(500); await p.screenshot({ path: O + '/team-floor.png' });
// live: only the carrier plants; the carrier dies, the charge drops, and a bot goes and picks it up
r = await T(() => { const t = GAME.test, X2 = t.team(), M = t.M, P = M.fs[0]; const live = M.phase; X2.applyDamage(P, 200, M.fs.find(f => f.team !== P.team), false, 'vesper');
  const floor = M.charge && !M.charge.k, at = M.charge && [M.charge.x, M.charge.z].map(v => +v.toFixed(1)), gunDown = M.loot.some(d => d.k === 'torrent');
  for (const f of M.fs) if (f.team !== P.team) { f.bot = { diff: 0, dummy: true }; f.x = 1; f.z = 1; }   // the defenders stand aside
  let n = 0; while (M.charge && !M.charge.k && n++ < 60 * 25) t.tick(1 / 60); const c = M.charge && M.byKey[M.charge.k];
  return { live, floor, at, gunDown, by: c && c.name, bot: !!(c && c.bot), secs: +(n / 60).toFixed(1) }; });
ok(r.live === 'live' && r.floor && r.gunDown, 'the carrier dies: the charge and their gun fall where they fell', JSON.stringify(r));
ok(r.bot, 'a bot on the team goes and picks the charge up', JSON.stringify(r));
// overtime: at 4-4 (first to 5) the match goes on; sides swap every round; two clear wins it
r = await T(() => { const t = GAME.test, X2 = t.team(), M = t.M; M.wins = [4, 4]; M.round = 8; M.phase = 'end'; M.t = 0; t.tick(.02); const r9 = M.round, s9 = t.st().fs[0].side, over9 = !!M.over;
  M.wins = [5, 4]; M.phase = 'end'; M.t = 0; t.tick(.02); const r10 = M.round, s10 = t.st().fs[0].side, over10 = !!M.over;
  M.wins = [6, 4]; M.phase = 'end'; M.t = 0; t.tick(.02); return { r9, s9, over9, r10, s10, over10, over: !!M.over, ot: X2.otRound(9) }; });
ok(r.r9 === 9 && !r.over9 && r.r10 === 10 && r.s9 !== r.s10 && !r.over10 && r.over, 'overtime at 4-4: rounds go on, sides swap each round, two clear wins', JSON.stringify(r));
r = await T(() => { const t = GAME.test, X2 = t.team(), M = t.M; const D = (a, b) => { M.wins = [a, b]; return X2.matchDecided(); }; return [D(5, 3), D(4, 4), D(5, 4), D(6, 4), D(7, 7), D(8, 7)]; });
ok(JSON.stringify(r) === JSON.stringify([true, false, false, true, false, true]), 'who has won: first to 5; in overtime two clear; sudden death after six overtime rounds', JSON.stringify(r));
console.log('ERRORS', JSON.stringify(errs)); await b.close();
