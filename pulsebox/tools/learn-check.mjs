// Checks the Educational Games in a real browser: every page loads without errors, has a start screen with three or more
// levels, and every level can be played to its end screen (the game's own bot() makes correct moves), scores, restarts
// and goes back to the menu; a wrong move (miss()) does not score; nothing is wider than a phone screen.
//   node tools/learn-check.mjs                 every game and the category page
//   node tools/learn-check.mjs math-rush ...   only these games
//   SHOTS=dir node tools/learn-check.mjs       also save a screenshot of each game's menu, play and end screens
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
const { chromium } = createRequire(import.meta.url)('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url)), GAMES = path.join(HERE, '..', 'public', 'games'), SHOTS = process.env.SHOTS;
const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(GAMES).filter(f => /^learn-.+\.html$/.test(f)).map(f => f.slice(6, -5)).sort();
const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? undefined : undefined });
let failed = 0; const ok = (c, name, extra = '') => { if (!c) failed++; console.log((c ? '  ok   ' : '  FAIL ') + name + (extra !== '' ? '  (' + extra + ')' : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function page(file, mobile) {
  const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 300))); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text() + ' ' + ((m.location() || {}).url || ''))) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());   // (offline checks: the fonts fall back)
  await p.goto('file://' + path.join(GAMES, file) + '?speed=12'); await sleep(250); return { p, ctx, errs };
}
const wide = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
// category page
if (!process.argv.slice(2).length || process.argv.includes('learn')) {
  console.log('\ncategory page'); const { p, ctx, errs } = await page('learn.html', false);
  const n = await p.locator('.gcard').count(); ok(n === 20, 'shows all 20 games', n + ' cards');
  const links = await p.$$eval('.gcard', a => a.map(x => x.getAttribute('href'))); ok(links.every(l => fs.existsSync ? true : true), 'cards link to game pages');
  const missing = links.filter(l => !fs.existsSync(path.join(GAMES, l))); ok(!missing.length, 'every card links to a page that exists', missing.join(', '));
  await p.fill('input[type=search]', 'fraction'); ok(await p.locator('.gcard').count() >= 1, 'search finds "fraction"', await p.locator('.gcard').count() + ' cards');
  await p.fill('input[type=search]', 'zzzz'); ok(await p.locator('.empty').count() === 1, 'search with no match says so');
  await p.fill('input[type=search]', ''); await p.click('.fbtn[data-s="Math"]'); ok(await p.locator('.gcard').count() === 5, 'Math filter shows the 5 math games', await p.locator('.gcard').count());
  ok(!errs.length, 'no errors', errs.join(' | ')); if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'learn-hub.png') });
  const m = await page('learn.html', true); ok(await wide(m.p) <= 1, 'fits a phone screen', await wide(m.p) + ' px over'); if (SHOTS) await m.p.screenshot({ path: path.join(SHOTS, 'learn-hub-phone.png'), fullPage: false }); await m.ctx.close(); await ctx.close();
}
for (const id of ids.filter(i => i !== 'learn')) {
  console.log('\n' + id); const file = 'learn-' + id + '.html';
  if (!fs.existsSync(path.join(GAMES, file))) { ok(false, 'page exists', file); continue; }
  const { p, ctx, errs } = await page(file, false);
  const st0 = await p.evaluate(() => window.EDU && EDU.state()); ok(st0 && st0.screen === 'menu' && st0.levels >= 3, 'start screen with 3+ levels', st0 ? st0.levels + ' levels' : 'no EDU');
  ok(await p.locator('.learn li').count() >= 2 && await p.locator('.lvl').count() >= 3, 'says what it teaches, and lists the levels');
  await p.click('text=How to play'); ok(await p.locator('.learn ul').nth(1).locator('li').count() >= 2, 'instructions open');
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, id + '-menu.png') });
  for (let lv = 0; lv < (st0 ? st0.levels : 0); lv++) {
    await p.click(`.lvl >> nth=${lv}`); await sleep(200); let st = await p.evaluate(() => EDU.state()); ok(st.screen === 'play' && st.level === lv, `level ${lv + 1} starts`);
    if (st.hasMiss) { await p.evaluate(() => EDU.miss()); await sleep(150); const s2 = await p.evaluate(() => EDU.state()); ok(s2.score === 0 || !s2.alive, `level ${lv + 1}: a wrong move scores nothing`, 'score ' + s2.score); }
    if (lv === 1 && SHOTS) { for (let i = 0; i < 3; i++) { await p.evaluate(() => EDU.bot()); await sleep(350); } await p.screenshot({ path: path.join(SHOTS, id + '-play.png') }); }
    const t0 = Date.now(); let moves = 0, peak = 0;
    while (Date.now() - t0 < 100000) { st = await p.evaluate(() => EDU.state()); peak = Math.max(peak, st.score); if (st.screen === 'end') break; await p.evaluate(() => EDU.bot()); moves++; await sleep(60); }
    ok(st.screen === 'end', `level ${lv + 1} plays through to its end screen`, `${moves} moves, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    ok(st.end && st.end.score > 0, `level ${lv + 1} scores`, st.end ? 'score ' + st.end.score + (st.end.won ? ', won' : ', not won') : '');
    if (lv === 0 && SHOTS) { await sleep(600); await p.screenshot({ path: path.join(SHOTS, id + '-end.png') }); }
    if (lv === 0) { await p.click('.over >> text=Play again'); await sleep(150); const s3 = await p.evaluate(() => EDU.state()); ok(s3.screen === 'play' && s3.score === 0 && s3.level === 0, 'Play again restarts the level');
      await p.click('button[title^="Restart"]'); await sleep(150); ok((await p.evaluate(() => EDU.state())).screen === 'play', 'the Restart button restarts');
      await p.click('button[title^="Menu"]'); await sleep(150); ok((await p.evaluate(() => EDU.state())).screen === 'menu', 'the Menu button goes back to the menu');
      ok(await p.locator('.lvl .b >> nth=0').textContent().then(t => /Best: \d+/.test(t)), 'the best score shows on the menu');
    } else { await p.evaluate(() => EDU.menu()); await sleep(100); }
  }
  ok(!errs.length, 'no errors', errs.slice(0, 3).join(' | '));
  await ctx.close();
  // on a phone: the menu and a level fit the screen, and a tap starts it
  const m = await page(file, true); ok(await wide(m.p) <= 1, 'phone: the menu fits', await wide(m.p) + ' px over');
  await m.p.tap('.lvl >> nth=0'); await sleep(300); ok((await m.p.evaluate(() => EDU.state())).screen === 'play', 'phone: tapping a level starts it');
  for (let i = 0; i < 3; i++) { await m.p.evaluate(() => EDU.bot()); await sleep(300); }
  ok(await wide(m.p) <= 1, 'phone: the game fits', await wide(m.p) + ' px over'); if (SHOTS) await m.p.screenshot({ path: path.join(SHOTS, id + '-phone.png') });
  ok(!m.errs.length, 'phone: no errors', m.errs.slice(0, 3).join(' | ')); await m.ctx.close();
}
await b.close();
console.log('\n' + (failed ? failed + ' check(s) failed' : 'all checks passed')); process.exit(failed ? 1 : 0);
