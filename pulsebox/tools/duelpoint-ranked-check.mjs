// Duelpoint ranked in a real browser: placements, then rank points that depend on how strong the bots were against your
// rank, ranking up and down, a rank per team size, leaving counting as a loss, the match history, and the screens.
//   node tools/duelpoint-ranked-check.mjs <shots>
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
await T(() => { const t = GAME.test; t.CFG.queue = 'ranked'; t.CFG.size = 2; t.CFG.diff = 'auto'; t.CFG.win = 3; t.ranked().STATS.ranked = {}; t.ranked().STATS.hist = []; });
await p.waitForTimeout(500); await p.screenshot({ path: O + '/ranked-menu.png' });
// play one ranked match to the end, with a given bot level and score
const playOne = (lvl, a, bb) => T(([lvl, a, bb]) => { const t = GAME.test, R = t.ranked(); if (t.M) t.toMenu(); t.CFG.diff = lvl; t.menuPlay(2, false); t.skipLoad(); const M = t.M; const info = { ranked: M.ranked, win: M.size, diffs: M.fs.filter(f => f.bot && f.team !== M.fs[0].team).map(f => f.bot.diff) };
  M.fs[0].stat.k = 10; M.fs[0].stat.dmg = 1500; M.wins = [a, bb]; R.matchOver(); const res = M.rankRes; return Object.assign(info, { res, rv: R.rankedOf(2).rv, label: R.rankLabel(R.rankedOf(2).rv) }); }, [lvl, a, bb]);
let r = await playOne('auto', 5, 2);
ok(r.ranked && r.res && r.res.placing && r.res.n === 1, 'a ranked match against bots counts as placement 1 of 5', JSON.stringify(r));
for (let i = 0; i < 4; i++) r = await playOne(1, 5, 3);
ok(r.res.justPlaced && r.rv > 0, 'after five placements you get a rank', r.label + ' ' + r.rv);
await p.waitForTimeout(1600); await p.screenshot({ path: O + '/ranked-over.png' });
// gains: Legend bots (above you) pay far more than Recruit bots (below you); a loss costs points
const base = r.rv;
const hi = await playOne(3, 5, 3), lo = await playOne(0, 5, 3);
ok(hi.res.d > lo.res.d + 15 && lo.res.d >= 4, 'beating higher-level bots gives much more rank than beating lower ones', `Legend +${hi.res.d}, Recruit +${lo.res.d}`);
const loss = await playOne(1, 3, 5);
ok(loss.res.d < 0, 'a loss takes rank points away', `${loss.res.d} RP`);
// rank up and down across divisions
r = await T(() => { const R = GAME.test.ranked(), S = R.rankedOf(2); S.rv = 1290; S.mmr = 1290; const a = R.rankedResult(2, { won: true, opp: 1500, margin: 3, perf: .6 }); S.rv = 1205; const d = R.rankedResult(2, { won: false, opp: 900, margin: 4, perf: .3 }); return { up: a.up, a: R.rankLabel(a.before) + ' → ' + R.rankLabel(a.after), down: d.down, d: R.rankLabel(d.before) + ' → ' + R.rankLabel(d.after) }; });
ok(r.up && r.down, 'crossing 100 RP ranks you up; dropping below 0 ranks you down', `${r.a}; ${r.d}`);
// a rank per team size; leaving counts as a loss; the history keeps every match
r = await T(() => { const t = GAME.test, R = t.ranked(); const one = R.rankedOf(1); const n2 = R.rankedOf(2).n; if (t.M) t.toMenu(); t.CFG.size = 2; t.menuPlay(2, false); t.skipLoad(); t.M.t = .01; t.UI.armory = false; t.tick(.5); t.toMenu(); return { oneN: one.n, n2a: n2, n2b: R.rankedOf(2).n, last: R.STATS.hist[0], hist: R.STATS.hist.length }; });
ok(r.oneN === 0 && r.n2b === r.n2a + 1 && r.last.left === 1 && r.last.rp < 0, 'each team size has its own rank; leaving a ranked match counts as a loss', JSON.stringify(r));
ok(r.hist >= 9, 'the match history keeps your matches', r.hist + ' entries');
await T(() => { const t = GAME.test; t.UI.panel = 'career'; });
await p.waitForTimeout(500); await p.screenshot({ path: O + '/ranked-career.png' });
console.log('ERRORS', JSON.stringify(errs)); await b.close();
