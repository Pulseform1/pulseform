// Frames for Cluck Launch 2 trailer/shots: node tools/cluck2/media.mjs outdir
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = process.argv[2]; fs.mkdirSync(OUT + '/f', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 854, height: 480 }, deviceScaleFactor: 1 });
await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + path.resolve('public/games/cluck-launch-2.html')); await p.waitForTimeout(800);
await p.evaluate(() => { window.__t = performance.now(); sfx && (window.AudioContext = null); S.tier.helmet = 4; S.tier.sled = 4; S.tier.glider = 4; S.tier.rocket = 3; S.tier.tank = 3; S.tier.ramp = 3; S.coins = 12500; save(); });
let n = 0; const tick = async (k = 1) => { for (let i = 0; i < k; i++) await p.evaluate(() => { window.__t += 1000 / 30; frame(window.__t); }); };
const shot = async () => { await tick(); await p.screenshot({ path: `${OUT}/f/${String(n++).padStart(4, '0')}.png` }); };
const seg = async (frames, setup) => { if (setup) await p.evaluate(setup); for (let i = 0; i < frames; i++) await shot(); };
// 1: launch off the ramp
await seg(75, () => { startRun(); AUTO = 'demo'; });
// 2: slide low through the farm smashing
const low = (x, vx, h, th) => `(() => { AUTO = null; input.up = input.down = input.rocket = false; F.x = ${x}; F.y = Math.max(groundY(${x}), SEA) + ${h}; F.vx = ${vx}; F.vy = -2; F.th = ${th}; F.phase = 'air'; F.contact = false; cam.x = F.x; cam.y = F.y; })()`;
await seg(60, low(260, 38, 2.5, -0.05));
await seg(60, low(5300, 44, 2.5, -0.05));
await seg(55, low(10400, 40, 1.2, 0));
await p.evaluate(() => { S.tier.helmet = 7; F.look = curLook(); F.st = stats(); });
await seg(70, low(30300, 62, 2.5, -0.05));
console.log('frames', n, 'errors', errs);
await b.close();
