// Media for the Cluck Launch 2 hub entry, all rendered from the real game page.
//   node tools/cluck2/media.mjs outdir
// writes outdir/f/0000.png... (trailer frames, 854x480 at 30 fps), outdir/shot1.png, outdir/shot2.png (960x540)
// and outdir/cover.png plus cover-1..3 (600x600, a few moments apart: pick the best). Then encode, for example:
//   ffmpeg -y -framerate 30 -i outdir/f/%04d.png -c:v libx264 -pix_fmt yuv420p -crf 26 -preset slow -movflags +faststart public/media/cluck-launch-2-trailer.mp4
//   ffmpeg -y -i outdir/cover-2.png -q:v 3 public/media/cluck-launch-2-cover.jpg   (and the same for shot1 / shot2)
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = process.argv[2]; fs.mkdirSync(OUT + '/f', { recursive: true });
const URL = 'file://' + path.resolve('public/games/cluck-launch-2.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: process.env.HTTPS_PROXY ? ['--proxy-server=' + process.env.HTTPS_PROXY] : [] });
const errs = [];
async function open(w, h) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, ignoreHTTPSErrors: true });
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; localStorage.clear(); });
  await p.goto(URL); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(900);
  await p.evaluate(() => {
    window.__t = performance.now(); window.AudioContext = window.webkitAudioContext = undefined;
    S.intro = true; S.runs = 3; S.tier.helmet = 4; S.tier.sled = 4; S.tier.glider = 4; S.tier.rocket = 4; S.tier.tank = 4; S.tier.ramp = 3; S.cape = 'hero'; S.own.capes.push('hero'); S.coins = 12500; save();
    // put Pepper at x, flying low; then line up things she can break ahead of her so every clip has smashing in it
    window.low = (x, vx, h, th, n) => {
      AUTO = null; input.up = input.down = input.rocket = false; F.x = x; F.y = Math.max(groundY(x), SEA) + h; F.vx = vx; F.vy = -2; F.th = th; F.phase = 'air'; F.contact = false; F.air = 5; cam.init = false; setHint(null);
      F.splash = false; F.done = false; F.stopT = 0; F.tumble = 0; F.landT = 0; endAt = 0;
      const R = regionAt(x), list = (OBS[R.id] || OBS.farm).filter(q => q[1] * 1.6 < vx * F.st.smash * 0.7);
      for (let i = 0; i < (n ?? 7) && list.length; i++) {
        const ox = x + 9 + i * (7 + (i % 3) * 2), [type, hp, w, hh, pay] = list[(i * 3 + 1) % list.length], wet = isWater(ox); if (wet !== !!R.water) continue;
        const o = { k: 'ob', type, x: ox, y: wet ? SEA : groundY(ox), bx: ox, w, h: hh, hp, hp0: hp, pay: Math.round(pay * R.mult * 3), ph: i };
        cellAt(Math.floor(ox / CELL), Math.max(0, Math.floor((Math.max(o.y, SEA) + 0.5) / CELL))).push(o);
      }
    };
    // freeze a moment and frame it by hand: zoomed in, Pepper where we want her on screen
    window.seedRun = n => { world.seed = n; world.cells.clear(); };   // the same world every time, so the media can be made again
    window.coinArc = (x0, n, h) => { for (let i = 0; i < n; i++) { const x = x0 + i * 2.2, y = groundY(x) + h + Math.sin(i / (n - 1) * Math.PI) * 3; cellAt(Math.floor(x / CELL), Math.floor(y / CELL)).push({ k: 'coin', x, y, r: 0.9, v: 1 }); } };
    window.frameAt = (vh, fx, fy) => { cam.vh = vh; cam.k = Math.min(H, W * 0.8) / vh; cam.x = F.x + (0.5 - fx) * W / cam.k; cam.y = F.y + (fy - 0.5) * H / cam.k; draw(clock, 0); };
  });
  return p;
}
const SEED1 = +(process.env.SEED1 || 5), X1 = +(process.env.X1 || 30900);
const tick = (p, k = 1) => p.evaluate(k => { for (let i = 0; i < k; i++) { window.__t += 1000 / 30; frame(window.__t); } }, k);

// ---------- trailer ----------
{
  const p = await open(854, 480);
  let n = 0;
  const shot = async () => { await tick(p); await p.screenshot({ path: `${OUT}/f/${String(n++).padStart(4, '0')}.png` }); };
  const seg = async (frames, setup, each) => { if (setup) await p.evaluate(setup); for (let i = 0; i < frames; i++) { if (each) await p.evaluate(each); await shot(); } };
  await seg(50, () => { toTitle(); });                                                      // the title, Pepper flying behind it
  await seg(80, () => { startRun(); seedRun(7); AUTO = 'demo'; setHint(null); });                        // down the ramp, a perfect jump, rocket
  await seg(60, 'low(260, 40, 1.2, -0.03)');                                                 // the farm: fences, hay, barns
  await seg(55, () => { low(7400, 44, 1.2, -0.03); });                                       // the savanna
  await seg(45, () => { low(10400, 42, 1.0, 0); });                                          // skipping over the ocean
  await seg(55, () => { S.tier.helmet = 6; F.look = curLook(); F.st = stats(); low(12700, 48, 1.2, -0.03); }); // the volcano isles
  await seg(55, () => { low(22500, 50, 1.4, -0.04); });                                      // the Alps
  await seg(60, () => { S.tier.helmet = 8; F.look = curLook(); F.st = stats(); low(30300, 62, 1.4, -0.04); }); // the neon megacity
  await seg(45, () => { low(38000, 56, 1.2, -0.03); });                                      // the beach
  await seg(70, () => { low(WORLD - 115, 58, 2.6, -0.02, 2); }, () => { $('conf').hidden = true; });                              // the finish line: all the way round
  await p.waitForTimeout(2800);                                                              // the ending panel appears on a timer
  await seg(45, () => { $('conf').hidden = true; });  // confetti animates with requestAnimationFrame, which is off while capturing
  console.log('trailer frames', n);
  await p.close();
}
// ---------- screenshots ----------
{
  const p = await open(960, 540);
  await p.evaluate(([SEED1, X1]) => { S.tier.helmet = 6; startRun(); seedRun(SEED1); goRamp(); for (let i = 0; i < 600 && F.phase !== 'air'; i++) update(1 / 60); F.look = curLook(); F.st = stats(); low(X1, 50, 0.7, -0.02, 9); coinArc(X1 + 36, 9, 2); }, [SEED1, X1]);
  await tick(p, 24); await p.evaluate(() => { $('banner').hidden = true; $('pops').innerHTML = ''; frameAt(26, 0.4, 0.64); }); await p.screenshot({ path: OUT + '/shot1.png' });
  await p.evaluate(() => { low(WORLD - 34, 40, 3.0, -0.02, 0); $('pops').innerHTML = ''; });
  await tick(p, 8); await p.evaluate(() => { $('pops').innerHTML = ''; $('banner').hidden = true; frameAt(34, 0.3, 0.64); }); await p.screenshot({ path: OUT + '/shot2.png' });
  await p.evaluate(() => { F.done = true; mode = 'title'; S.coins = 48000; S.tier.helmet = 5; toShop(); __cl.setTab('gear'); });
  await tick(p, 10); await p.screenshot({ path: OUT + '/shot3-shop.png' });
  await p.close();
}
// ---------- cover: a real scene with the logo on top ----------
{
  const p = await open(600, 600);
  await p.evaluate(() => { S.tier.helmet = 6; S.tier.rocket = 6; S.cape = 'royal'; S.own.capes.push('royal'); startRun(); goRamp(); for (let i = 0; i < 600 && F.phase !== 'air'; i++) update(1 / 60); F.look = curLook(); F.st = stats(); seedRun(3); low(900, 44, 0.6, 0.1, 6); coinArc(930, 8, 2.5); keys.Space = true; $('hud').hidden = true; });
  for (let k = 0; k < 4; k++) {
    await tick(p, k ? 3 : 9);
    await p.evaluate(() => { $('hud').hidden = true; frameAt(17, 0.42, 0.7); });
    await p.evaluate(() => {
      $('hud').hidden = true; let el = document.getElementById('coverLogo');
      if (!el) { el = document.createElement('div'); el.id = 'coverLogo'; document.body.appendChild(el);
        el.style.cssText = 'position:fixed;left:0;right:0;top:26px;text-align:center;font-family:var(--big);line-height:.9;pointer-events:none;z-index:50';
        el.innerHTML = '<div style="font-size:104px;color:#fff;-webkit-text-stroke:9px #1d2440;paint-order:stroke fill;text-shadow:0 7px 0 #1d2440;transform:rotate(-3deg)">CLUCK</div><div style="font-size:112px;color:#ffd23f;-webkit-text-stroke:9px #1d2440;paint-order:stroke fill;text-shadow:0 8px 0 #1d2440;transform:rotate(2deg)">LAUNCH <span style="color:#e8362f">2</span></div><div style="display:inline-block;margin-top:12px;font-size:24px;color:#fff;background:#2f8fe8;border:4px solid #1d2440;border-radius:14px;padding:2px 14px;-webkit-text-stroke:0;box-shadow:0 4px 0 #1d2440;transform:rotate(-2deg)">AROUND THE WORLD!</div>'; }
    });
    await p.screenshot({ path: `${OUT}/cover${k ? '-' + k : ''}.png` });
  }
  await p.close();
}
console.log('errors', errs);
await b.close();
