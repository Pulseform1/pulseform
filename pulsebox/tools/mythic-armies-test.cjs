// End-to-end checks for MYTHIC ARMIES (public/games/mythic-armies.html, built by tools/build-mythic-armies.mjs).
//   node tools/mythic-armies-test.cjs [loop|sim|perf|all]
// loop: the whole first-session loop at 1280x720, 844x390 and 390x844 (touch on phones), failing on any page or console error:
//       starter box -> tear and reveal a pack -> binder + viewer -> army -> battles -> shop purchase -> quest claim -> reload restores the save.
// sim:  opens packs headlessly with the page's own pack logic and reports rarity rates, duplicates and pity.
// perf: frame times in pack opening, binder and battle at 1280x720 with 4x CPU throttling. Headless Chromium renders WebGL in
//       software (SwiftShader), so the rAF interval is pessimistic; the JS time per frame is reported alongside it.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.resolve(__dirname, '../public/games/mythic-armies.html');
const mode = process.argv[2] || 'all';
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
let failures = 0;

async function newPage(browser, vp, touch) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await p.goto(PAGE);
  await p.waitForFunction(() => window.MA && MA.state().screen === 'hub', null, { timeout: 90000 });
  await p.evaluate(() => MA.wipe());
  await p.reload();
  await p.waitForFunction(() => window.MA && MA.state().screen === 'hub', null, { timeout: 90000 });
  return { p, errors, ctx };
}
const state = p => p.evaluate(() => MA.state());
async function waitOpen(p, s, ms) { const t = Date.now(); while (Date.now() - t < (ms || 60000)) { if ((await state(p)).open === s) return true; await p.waitForTimeout(150); } throw new Error('timed out waiting for pack state ' + s); }
function check(cond, msg) { if (!cond) { failures++; console.log('  FAIL', msg); } else console.log('  ok  ', msg); }

async function loop(browser, vp) {
  const touch = vp.width < 900;
  console.log(`\n== full loop ${vp.width}x${vp.height}${touch ? ' (touch)' : ''}`);
  const { p, errors, ctx } = await newPage(browser, vp, touch);
  const tap = async sel => { if (touch) await p.tap(sel); else await p.click(sel); };
  check(await p.evaluate(() => MA.S.items.length === 1 && MA.S.items[0].type === 'box'), 'fresh save starts with the free Starter Box');
  await tap('#tPacks'); await p.waitForTimeout(300);
  await tap('.invi'); await waitOpen(p, 'box');
  await p.mouse.click(vp.width / 2, vp.height / 2);
  await waitOpen(p, 'boxdone');
  check(await p.evaluate(() => MA.S.items.filter(i => i.type === 'pack').length === 4), 'box opened into 4 packs');
  await tap('text=Open the first pack');
  await waitOpen(p, 'idle');
  await p.mouse.move(vp.width / 2, vp.height / 2); await p.mouse.down();
  const t0 = Date.now(); while ((await state(p)).open === 'idle' || (await state(p)).open === 'tearing') { if (Date.now() - t0 > 60000) throw new Error('tear timeout'); await p.waitForTimeout(150); }
  await p.mouse.up();
  for (let i = 0; i < 5; i++) {
    await waitOpen(p, 'reveal'); await p.mouse.click(vp.width / 2, vp.height / 2);
    await waitOpen(p, 'shown'); await p.mouse.click(vp.width / 2, vp.height / 2);
  }
  await waitOpen(p, 'summary');
  check(await p.evaluate(() => MA.S.cards.length === 5 && MA.S.stats.packs === 1), 'pack revealed 5 cards into the collection');
  await p.evaluate(() => MA.openHeadless(3));
  await p.evaluate(() => MA.go('binder')); await p.waitForTimeout(1500);
  check(await p.evaluate(() => document.querySelectorAll('.slot').length > 0), 'binder shows a page of cards');
  await p.evaluate(() => document.querySelector('.slot:not(.missing)').click()); await p.waitForTimeout(1200);
  check(await p.evaluate(() => !document.getElementById('viewer').hidden && !!document.querySelector('#vw3d canvas')), 'card viewer opens with a 3D model');
  await p.evaluate(() => document.getElementById('vwFlip').click()); await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById('vwClose').click());
  await p.evaluate(() => MA.go('army')); await p.waitForTimeout(500);
  await tap('text=Auto-fill'); await p.waitForTimeout(500);
  check(await p.evaluate(() => MA.S.army.filter(Boolean).length === 6), 'army auto-filled with six units');
  await p.evaluate(() => MA.go('map')); await p.waitForTimeout(600);
  await tap('.node.next'); await p.waitForTimeout(300);
  await tap('text=Fight!');
  const tb = Date.now(); while (!(await p.$('.result'))) { if (Date.now() - tb > 240000) throw new Error('battle timeout'); await p.waitForTimeout(500); }
  check(await p.evaluate(() => MA.S.stats.battles === 1), 'watched battle finished with a result screen');
  for (let n = 1; n <= 2; n++) { await p.evaluate(n => MA.startBattle(MA.STAGES[n]), n); await p.waitForTimeout(800); await p.evaluate(() => MA.skipBattle()); await p.waitForTimeout(900); }
  check(await p.evaluate(() => MA.S.stats.battles === 3), 'two more battles via skip-to-result');
  const coins0 = await p.evaluate(() => { MA.S.coins += 500; return MA.S.coins; });
  await p.evaluate(() => MA.go('shop')); await p.waitForTimeout(600);
  await tap('.buy');
  await p.waitForTimeout(300);
  check(await p.evaluate(c => MA.S.coins === c - 180, coins0), 'shop sold a Standard pack for 180 coins');
  await p.evaluate(() => { document.getElementById('modal').hidden = true; MA.go('quests'); });
  const claimed = await p.evaluate(() => { const i = MA.S.quests.list.findIndex(q => q.done && !q.claimed); return i >= 0 ? MA.claimQuest(i) : 0; });
  check(claimed > 0, 'claimed a completed daily quest (+' + claimed + ' coins)');
  const snap = () => p.evaluate(() => [MA.S.coins, MA.S.essence, MA.S.cards, MA.S.items.length, MA.S.units, MA.S.army, MA.S.quests, MA.S.campaign].map(x => JSON.stringify(x)));
  await p.waitForTimeout(1200);
  if (process.env.MA_DEBUG) console.log('  debug', await p.evaluate(() => { let j; try { j = JSON.stringify(MA.S).length; } catch (e) { j = e.message; } const st = JSON.parse(localStorage.getItem('mythic-armies-save') || 'null'); return [j, st && st.coins, st && st.cards.length, sessionStorage.getItem('ma-test'), location.href.slice(-30)]; }));
  const before = await snap();
  await p.reload();
  await p.waitForFunction(() => window.MA && MA.state().screen === 'hub', null, { timeout: 90000 });
  const after = await snap();
  const diff = before.map((b, i) => b === after[i] ? null : ['coins', 'essence', 'cards', 'items', 'units', 'army', 'quests', 'campaign'][i] + ': ' + b.slice(0, 120) + ' -> ' + after[i].slice(0, 120)).filter(Boolean);
  check(!diff.length, 'reload restores cards, coins, upgrades, packs, army, quests and campaign' + (diff.length ? ' | ' + diff.join(' | ') : ''));
  check(errors.length === 0, 'no page or console errors' + (errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''));
  await ctx.close();
}

async function sim(browser) {
  console.log('\n== pack simulation (page logic, scratch inventory)');
  const { p, ctx } = await newPage(browser, { width: 640, height: 400 }, false);
  const r = await p.evaluate(() => ({ std: MA.simulate(300), greater: MA.simulate(300, null, 'greater'), grand: MA.simulate(300, null, 'grand'), long: MA.simulate(5000) }));
  const names = ['C', 'U', 'R', 'E', 'L', 'M'];
  for (const [k, v] of Object.entries(r)) {
    console.log(`  ${k.padEnd(8)} ${v.packs} packs: ` + names.map((n, i) => `${n} ${v.pct[i]}%`).join(' ') + ` | dup-in-pack ${v.dupInPack} | first duplicate in pack ${v.firstDupPack} (card ${v.firstDupCard}) | distinct ${v.distinct}/180 | pity triggers ${v.pityHits}`);
    check(v.dupInPack === 0, k + ': never two copies of a character in one pack');
  }
  await ctx.close();
  return r;
}

async function perf(browser) {
  console.log('\n== frame times at 1280x720, 4x CPU throttling');
  const { p, ctx } = await newPage(browser, { width: 1280, height: 720 }, false);
  const cdp = await ctx.newCDPSession(p);
  await p.evaluate(() => { MA.S.guide = 99; MA.S.items = []; MA.openHeadless(12); for (const c of MA.S.cards) MA.S.units[c.uid] = { lvl: 4, xp: 0, star: 0 }; });
  const measure = async (label, secs) => {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await p.evaluate(() => MA.frames(true));
    await p.waitForTimeout(secs * 1000);
    const f = await p.evaluate(() => MA.frames(false));
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const gaps = f.map(x => x[0]).filter(x => x > 0).sort((a, b) => a - b), work = f.map(x => x[1]).sort((a, b) => a - b);
    const q = (a, k) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * k))].toFixed(1) : 'n/a';
    const st = await state(p);
    console.log(`  ${label.padEnd(16)} frames ${f.length} | rAF interval median ${q(gaps, 0.5)} ms p95 ${q(gaps, 0.95)} | JS per frame median ${q(work, 0.5)} ms p95 ${q(work, 0.95)} | dpr ${st.dpr}`);
    return { label, frames: f.length, rafMedian: +q(gaps, 0.5), rafP95: +q(gaps, 0.95), jsMedian: +q(work, 0.5), jsP95: +q(work, 0.95) };
  };
  const out = [];
  await p.evaluate(() => MA.testReveal(['wi03', 'sn20', 'ti23', 'em27', 'sr30'], 'starfall'));
  await waitOpen(p, 'idle');
  out.push(await measure('pack (idle foil)', 6));
  await p.mouse.move(640, 360); await p.mouse.down();
  out.push(await measure('pack (tearing)', 5));
  await p.mouse.up();
  await waitOpen(p, 'reveal', 120000);
  await p.mouse.click(640, 360);
  out.push(await measure('card reveal', 6));
  await p.evaluate(() => MA.go('binder')); await p.waitForTimeout(3000);
  out.push(await measure('binder', 5));
  await p.evaluate(() => { MA.go('army'); document.querySelector('.bar .btn.small').click(); MA.startBattle(MA.STAGES[10]); });
  await p.waitForTimeout(2500);
  out.push(await measure('battle', 8));
  await ctx.close();
  return out;
}

(async () => {
  const browser = await chromium.launch({ proxy, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    if (mode === 'sim' || mode === 'all') await sim(browser);
    if (mode === 'loop' || mode === 'all') for (const vp of (process.env.MA_VP ? [process.env.MA_VP.split('x').map(Number)].map(([width, height]) => ({ width, height })) : [{ width: 1280, height: 720 }, { width: 844, height: 390 }, { width: 390, height: 844 }])) await loop(browser, vp);
    if (mode === 'perf' || mode === 'all') await perf(browser);
  } catch (e) { failures++; console.log('  FAIL', e.message); }
  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})();
