// Duelpoint's daily spin and the touch button layout, on a desktop and on a small phone.
// The spin: thirteen slices, every one a skin; a spin lands on one, which is then yours and saved, with the pointer stopped
// on that very slice; a second spin waits for tomorrow, even after a reload.
// The layout: on a phone, Settings > Button layout; FIRE dragged up and left lands where it was dropped, a size is kept,
// both are saved with the settings, and a match then has FIRE there.
//   node tools/duelpoint-wheel-check.mjs <shots dir>
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2] || '.', URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = []; let failed = 0; const ok = (c, n, x = '') => { if (!c) failed++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : '')); };
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('pbx-duelpoint') || '{}').dp || {});
async function page(vp, touch) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); return p;
}
const boot = async p => { await p.goto(URL0, { timeout: 120000 }); await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 90000 }); await p.waitForTimeout(500); await p.evaluate(() => document.getElementById('bPlay').click()); await p.waitForTimeout(800); };

for (const [vp, touch, tag] of [[{ width: 1366, height: 768 }, false, 'desktop'], [{ width: 667, height: 375 }, true, 'phone']]) {
  console.log(tag);
  const p = await page(vp, touch); await boot(p);
  await p.evaluate(() => GAME.test.openWheel()); await p.waitForTimeout(600); await p.screenshot({ path: `${O}/wheel-${tag}.png` });
  const sl = await p.evaluate(() => GAME.test.wheelSlices().map(q => q.r + ':' + q.id));
  ok(sl.length === 13 && sl.every(s => !s.endsWith(':null')), 'thirteen slices, every one a skin', sl.slice(0, 4).join(' ') + ' ...');
  ok(['common', 'rare', 'epic', 'legendary', 'mythic', 'paragon'].every(r => sl.some(s => s.startsWith(r + ':'))), 'every rarity is on the wheel, Paragon included');
  await p.evaluate(() => GAME.test.spinWheel()); await p.waitForTimeout(6200); await p.screenshot({ path: `${O}/wheel-${tag}-won.png` });
  const st = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('pbx-duelpoint') || '{}').dp.stats; return { won: GAME.test.WH.prize, spun: s.spun, day: GAME.test.wheelDay(), has: s.skins.includes(GAME.test.WH.prize) }; });
  ok(st.won && st.has && st.spun === st.day, 'it lands on a skin, which is now yours and saved, with today\'s spin used', st.won);
  const under = await p.evaluate(() => { const W2 = GAME.test.WH, sl = GAME.test.wheelSlices(), a = Math.PI * 2 / sl.length, rot = ((W2.rot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), i = Math.floor(((Math.PI * 2 - rot) % (Math.PI * 2)) / a); return { id: sl[i].id, prize: W2.prize }; });
  ok(under.id === under.prize, 'the pointer stops on the slice it was won from', JSON.stringify(under));
  await p.evaluate(() => GAME.test.spinWheel()); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => !!GAME.test.WH.spin)), 'a second spin the same day does nothing');
  await boot(p); await p.evaluate(() => GAME.test.openWheel()); await p.waitForTimeout(500); await p.evaluate(() => GAME.test.spinWheel()); await p.waitForTimeout(300);
  const after = await p.evaluate(() => ({ spin: !!GAME.test.WH.spin, prize: GAME.test.WH.prize }));
  ok(!after.spin && after.prize === st.won, 'after a reload: still used, today\'s prize shown, no new spin', JSON.stringify(after));
  if (touch) {
    // the button layout: drag FIRE up and left, make it bigger, done
    await p.evaluate(() => { GAME.esc(); GAME.test.UI.panel = 'settings'; GAME.test.touchEdit(); }); await p.waitForTimeout(500);
    const map = await p.evaluate(() => { const V = K.view, c = document.getElementById('cv'); return { s: c.clientWidth / (V.x1 - V.x0), x0: V.x0, y0: V.y0 }; }), P = (x, y) => [(x - map.x0) * map.s, (y - map.y0) * map.s];
    const f0 = await p.evaluate(() => GAME.test.touchAt('fire')), [ax, ay] = P(f0.x + 8, f0.y + 4), [bx, by] = P(f0.x - 220, f0.y - 110);
    const cdp = await p.context().newCDPSession(p), touchE = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await touchE('touchStart', ax, ay); for (let i = 1; i <= 8; i++) { await touchE('touchMove', ax + (bx - ax) * i / 8, ay + (by - ay) * i / 8); await p.waitForTimeout(40); } await touchE('touchEnd'); await p.waitForTimeout(300);
    const f1 = await p.evaluate(() => GAME.test.touchAt('fire'));
    ok(Math.abs(f1.x - (f0.x - 228)) < 3 && Math.abs(f1.y - (f0.y - 114)) < 3, 'FIRE dragged up and left lands where it was dropped (held where the finger took it)', `${Math.round(f0.x)},${Math.round(f0.y)} → ${Math.round(f1.x)},${Math.round(f1.y)}`);
    await p.evaluate(() => { const L = GAME.test.CFG.tlay; L.fire = Object.assign({}, L.fire, { s: 1.3 }); }); await p.screenshot({ path: `${O}/layout-editor.png` });
    await p.evaluate(() => GAME.esc()); await p.waitForTimeout(300);
    const cfg = (await saved(p)).cfg || {};
    ok(cfg.tlay && cfg.tlay.fire && cfg.tlay.fire.s === 1.3 && cfg.tlay.fire.x < -150, 'the layout is saved with the settings', JSON.stringify(cfg.tlay));
    await boot(p); await p.evaluate(() => { const t = GAME.test; t.CFG.quality = 'low'; t.menuPlay(1, false); t.skipLoad(); t.UI.armory = false; t.M.phase = 'live'; t.M.t = 80; }); await p.waitForTimeout(1200);
    const f2 = await p.evaluate(() => GAME.test.touchAt('fire')); await p.screenshot({ path: `${O}/layout-match.png` });
    ok(Math.abs(f2.x - f1.x) < 6 && Math.abs(f2.y - f1.y) < 6 && Math.abs(f2.r / f0.r - 1.3) < .02, 'after a reload a match has FIRE there, and bigger', `${Math.round(f2.x)},${Math.round(f2.y)} r ${f2.r.toFixed(0)}`);
  }
  await p.context().close();
}
console.log('errors', JSON.stringify(errs.slice(0, 5))); console.log(failed || errs.length ? (failed + ' check(s) failed') : 'all checks passed'); await b.close(); process.exit(failed || errs.length ? 1 : 0);
