// Duelpoint's global queue, with real browsers through the live room relay: two players queueing for 1v1 are matched
// into one match on opposite sides; four queueing for 2v2 land in one match two against two, with no bots; cancelling
// leaves the queue. The tests queue on their own shard (Q1VT, Q2VT), apart from real players.
//   node tools/duelpoint-queue-check.mjs <shots dir>
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2] || '/tmp', URL0 = 'file://' + path.resolve('public/games/duelpoint.html'), SHARD = 29;   // 'Q1VT'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--proxy-server=' + process.env.HTTPS_PROXY] });
const errs = []; let failed = 0;
const ok = (c, n, x = '') => { if (!c) failed++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : '')); };
async function open(tag, name) {
  const ctx = await b.newContext({ viewport: { width: 800, height: 450 }, ignoreHTTPSErrors: true }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(tag + ': ' + e.message));
  await p.addInitScript(n => { Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {}; try { localStorage.setItem('pbx-mp-name', n); } catch (e) {} }, name);
  await p.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 120000 }); await p.waitForTimeout(500);
  await p.click('#bPlay'); await p.waitForTimeout(600); return p;
}
const st = p => p.evaluate(() => { const t = GAME.test, M = t.M; return { screen: t.screen, q: t.QUE.mode, found: !!t.QUE.found, online: MP.online(), code: MP.code, inMatch: !!(M && M.online && t.screen === 'play'), humans: M && M.online ? M.fs.filter(f => !f.bot && !f.isBot).length : 0, bots: M && M.online ? M.fs.filter(f => f.bot || f.isBot).length : 0, team: M && M.online ? M.fs[0].team : null, who: M && M.online ? M.fs.map(f => f.name + ':' + f.team + (f.net ? 'n' : '') + (f.bot ? 'b' : '')).join(' ') : '', size: M && M.online ? M.fs.length : 0 }; });
// each device sees itself on side 0, so compare who is with whom: every device must agree, with n a side
const sides = ss => ss.map(s => { const fs = s.who.split(' ').map(w => w.split(':')), mine = fs.filter(f => f[1][0] === fs[0][1][0]).map(f => f[0]).sort(), all = fs.map(f => f[0]).sort(); const a = all.filter(n => !mine.includes(n)); return [mine, a].sort((x, y) => x[0] < y[0] ? -1 : 1).map(x => x.join('+')).join(' v '); });
async function untilAll(ps, fn, ms) { const t0 = Date.now(); for (;;) { const ss = await Promise.all(ps.map(st)); if (ss.every(fn) || Date.now() - t0 > ms) return ss; await ps[0].waitForTimeout(700); } }

// cancelling
{ const A = await open('a', 'Solo'); await A.evaluate(s => GAME.test.queueStart(1, s), SHARD); await A.waitForTimeout(2500);
  const s1 = await st(A); await A.evaluate(() => GAME.test.queueStop()); await A.waitForTimeout(300); const s2 = await st(A);
  ok(s1.q === 1 && s2.q === 0, 'join the 1v1 queue, then cancel out of it', JSON.stringify({ before: s1.q, after: s2.q })); await A.context().close(); }

// 1v1: two players find each other
{ const A = await open('a', 'Ace'), B = await open('b', 'Bolt');
  await A.evaluate(s => GAME.test.queueStart(1, s), SHARD); await A.waitForTimeout(800); await B.evaluate(s => GAME.test.queueStart(1, s), SHARD);
  const ss = await untilAll([A, B], s => s.inMatch, 45000);
  ok(ss.every(s => s.inMatch), 'two players queueing for 1v1 both land in a match', JSON.stringify(ss.map(s => s.screen + '/' + s.code)));
  ok(ss[0].code === ss[1].code && ss.every(s => s.humans === 2 && s.size === 2), 'the same match, the two of them and nobody else', JSON.stringify(ss.map(s => `${s.code} ${s.humans}h ${s.size}`)));
  { const v = sides(ss); ok(new Set(v).size === 1 && v[0].split(' v ').every(x => x.split('+').length === 1), 'on opposite sides', JSON.stringify(v)); }
  await A.screenshot({ path: O + '/queue-1v1.png' }); await A.context().close(); await B.context().close(); }

// 2v2: four players
{ const P = []; for (const n of ['Cleo', 'Dash', 'Echo', 'Fang']) P.push(await open(n, n));
  for (const p of P) { await p.evaluate(s => GAME.test.queueStart(2, s), SHARD); await p.waitForTimeout(500); }
  const ss = await untilAll(P, s => s.inMatch, 60000);
  ok(ss.every(s => s.inMatch), 'four players queueing for 2v2 all land in a match', JSON.stringify(ss.map(s => s.screen)));
  ok(new Set(ss.map(s => s.code)).size === 1 && ss.every(s => s.humans === 4 && s.bots === 0), 'one match, all four of them and no bots', JSON.stringify(ss.map(s => `${s.code} ${s.humans}h ${s.bots}b`)));
  { const v = sides(ss); ok(new Set(v).size === 1 && v[0].split(' v ').every(x => x.split('+').length === 2), 'two on each side, and every device agrees who is with whom', JSON.stringify(v)); }
  await P[0].screenshot({ path: O + '/queue-2v2.png' }); for (const p of P) await p.context().close(); }

console.log('errors', JSON.stringify(errs.slice(0, 5))); console.log(failed ? failed + ' check(s) failed' : 'all checks passed'); await b.close(); process.exit(failed ? 1 : 0);
