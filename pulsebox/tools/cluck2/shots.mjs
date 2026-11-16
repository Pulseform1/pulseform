// Screenshots of Cluck Launch 2 at set points: node tools/cluck2/shots.mjs outdir [url]
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = process.argv[2] || 'shots'; fs.mkdirSync(OUT, { recursive: true });
const url = process.argv[3] || 'file://' + path.resolve('public/games/cluck-launch-2.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: process.argv[3] ? ['--proxy-server=' + process.env.HTTPS_PROXY] : [] });
const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1, ignoreHTTPSErrors: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(url); await p.waitForTimeout(1200);
await p.screenshot({ path: OUT + '/1-title.png' });
// a well-equipped save so the shot shows obstacles, helmet, regions
const at = async (name, x, opts = {}) => {
  await p.evaluate(([x, o]) => {
    S.tier.helmet = o.helmet ?? 3; S.tier.sled = 3; S.tier.glider = 3; S.tier.rocket = 2; S.tier.tank = 2;
    startRun(); AUTO = null; goRamp(); for (let i = 0; i < 400 && F.phase !== 'air'; i++) update(1 / 60);
    F.x = x; F.y = Math.max(groundY(x), SEA) + (o.h ?? 3); F.vx = o.vx ?? 30; F.vy = o.vy ?? -1; F.th = -0.05; F.phase = 'air';
    for (let i = 0; i < (o.steps ?? 40); i++) { autopilot(F, 'dist'); update(1 / 60); }
  }, [x, opts]);
  await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/${name}.png` });
};
await at('2-farm', 120, { h: 1.5, vx: 34, steps: 50 });
await at('3-desert', 5200, { h: 2, vx: 40 });
await at('4-ocean', 10200, { h: 2, vx: 30, vy: -4, steps: 30 });
await at('5-jungle', 15000, { h: 2, vx: 40 });
await at('6-city', 30200, { h: 2, vx: 44, helmet: 7 });
await at('7-arctic', 25200, { h: 20, vx: 50, vy: 0, steps: 20 });
await p.evaluate(() => { endFlight(); }); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/8-results.png' });
await p.evaluate(() => { S.coins = 5000; toShop(); }); await p.waitForTimeout(600); await p.screenshot({ path: OUT + '/9-shop.png' });
console.log('errors', errs);
await b.close();
