// Real-time play with the keyboard, then a phone-size touch check: node tools/cluck2/play.mjs outdir
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const url = 'file://' + path.resolve('public/games/cluck-launch-2.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errs = [];
{ const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(1000);
  const btns = await p.$$eval('button', bs => bs.filter(b => b.offsetParent).map(b => b.textContent.trim()));
  console.log('title buttons', btns);
  await p.click('text=LAUNCH!'); await p.waitForTimeout(600); for (let i = 0; i < 4 && await p.evaluate(() => mode) !== 'play'; i++) { const b2 = await p.$$eval('button', bs => bs.filter(b => b.offsetParent).map(b => b.textContent.trim())); console.log('mode', await p.evaluate(() => mode), b2); await p.click('button:visible >> nth=-1').catch(() => {}); await p.waitForTimeout(500); } await p.keyboard.press('Space');
  for (let i = 0; i < 12; i++) { await p.keyboard.down(i % 3 ? 'ArrowUp' : 'ArrowDown'); await p.waitForTimeout(300); await p.keyboard.up(i % 3 ? 'ArrowUp' : 'ArrowDown'); await p.waitForTimeout(300); }
  await p.screenshot({ path: OUT + '/play.png' });
  await p.waitForFunction(() => mode !== 'play', null, { timeout: 60000 }).catch(() => console.log('still flying'));
  await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/play-result.png' });
  console.log(await p.evaluate(() => ({ mode, dist: S.best.dist, coins: S.coins, runs: S.runs, save: !!localStorage.getItem('cluck-launch-2-save-v1') })));
  await p.close(); }
{ const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(1000); await p.screenshot({ path: OUT + '/phone-title.png' });
  await p.touchscreen.tap(200, 400); await p.waitForTimeout(500); await p.touchscreen.tap(200, 400); await p.waitForTimeout(4000);
  await p.screenshot({ path: OUT + '/phone-play.png' }); await ctx.close(); }
console.log('errors', errs); await b.close();
