// Duelpoint: the match length you pick (best of 5, 7, 9 or 11) sets when sides swap, the pistol rounds and when it ends.
//   node tools/duelpoint-length-check.mjs <shots>
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2] || '.', URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [], ok = (c, n, x = '') => { console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : '')); if (!c) process.exitCode = 1; };
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {}; });
await p.goto(URL0, { timeout: 120000 });
await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 90000 }); await p.waitForTimeout(600);
await p.click('#bPlay'); await p.waitForTimeout(900); await p.screenshot({ path: O + '/len-menu.png' });
for (const w of [3, 4, 5, 6]) {
  const r = await p.evaluate(w => { const t = GAME.test; if (t.M) t.toMenu(); t.CFG.win = w; t.CFG.sites = 1; t.menuPlay(1); t.skipLoad(); const M = t.M, seen = [];
    // decide each round in turn for alternating teams (so it runs the full length), and note who attacks
    let guard = 0;
    while (!M.over && guard++ < 40) {
      const r = M.round, att = t.st().fs[0].side, a = M.wins[0], c = M.wins[1];
      seen.push(att[0]);
      // the side that is behind wins the round, so we reach the decider
      const loser = a <= c ? 1 : 0; for (const f of M.fs) if (f.team === loser) { f.hp = 0; f.alive = false; }
      M.phase = 'live'; M.t = 30; t.tick(.1); for (let i = 0; i < 20 && M.round === r && !M.over; i++) t.tick(.5);
    }
    return { over: !!M.over, wins: M.wins.slice(), rounds: seen.length, sides: seen.join('') };
  }, w);
  const H = w - 1, exp = 'x'.repeat(H) + 'y'.repeat(H) + 'z';
  const swapOK = new Set(r.sides.slice(0, H)).size === 1 && new Set(r.sides.slice(H, 2 * H)).size === 1 && r.sides[0] !== r.sides[H];
  ok(r.over && Math.max(...r.wins) === w && r.rounds === 2 * w - 1 && swapOK, `best of ${2 * w - 1}: first to ${w}, sides swap after round ${H}`, JSON.stringify(r));
}
console.log('ERRORS', JSON.stringify(errs)); await b.close();
