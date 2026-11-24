// Makes the MYTHIC ARMIES store media from the built page (run tools/build-mythic-armies.mjs first):
//   public/media/mythic-armies-cover.jpg (600x600), -shot1.jpg and -shot2.jpg (960x540), -trailer.mp4 (854x480, 30 fps, ~20 s, H.264).
// The page is stepped frame by frame (MA.manual / MA.tick) and CSS animations are driven on the same virtual clock,
// so the trailer plays at true speed even though headless Chromium renders slowly. Needs ffmpeg on PATH.
// Run: node tools/mythic-armies-media.cjs
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(ROOT, 'public/games/mythic-armies.html');
const OUT = path.join(ROOT, 'public/media');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-media-'));
const ff = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a]);

async function open(browser, vp) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.error('pageerror', e.message));
  await p.goto(PAGE);
  await p.waitForFunction(() => window.MA && MA.state().screen === 'hub', null, { timeout: 90000 });
  await p.evaluate(() => MA.wipe());
  await p.reload();
  await p.waitForFunction(() => window.MA && MA.state().screen === 'hub', null, { timeout: 90000 });
  await p.evaluate(() => {
    MA.S.guide = 99; MA.S.settings.sfx = false; MA.S.settings.music = false;
    document.getElementById('guide').hidden = true;
    MA.manual(true);
    window.__vt = 0;
    window.__step = (dt, n) => {
      for (let i = 0; i < (n || 1); i++) { window.__vt += dt * 1000; MA.tick(dt); }
      for (const a of document.getAnimations()) { if (a.__t0 == null) a.__t0 = window.__vt; a.pause(); a.currentTime = window.__vt - a.__t0; }
    };
  });
  return p;
}
const step = (p, n) => p.evaluate(n => window.__step(1 / 30, n), n || 1);
async function until(p, cond, max) { for (let i = 0; i < (max || 900); i++) { if (await p.evaluate(cond)) return true; await step(p, 1); } return false; }
async function stageSave(p) {
  await p.evaluate(() => {
    MA.S.items = [];
    MA.S.coins = 4200; MA.S.essence = 640;
    MA.openHeadless(24, 'greater');
    const S = MA.S;
    for (const c of S.cards) S.units[c.uid] = { lvl: 6, xp: 0, star: 1 };
    MA.go('army');
    document.querySelector('.bar .btn.small').click();
    S.coins = 4200; S.essence = 640;
    document.getElementById('toasts').innerHTML = '';
  });
}

(async () => {
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch({ proxy, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

  /* ---- shot 1: a Legendary reveal; cover: a Mythic reveal with the logo ---- */
  const revealShot = async (vp, ids, fam, file, logo) => {
    const p = await open(browser, vp);
    await p.evaluate(([ids, fam]) => MA.testReveal(ids, fam), [ids, fam]);
    await until(p, () => MA.state().open === 'idle');
    await step(p, 10);
    await p.evaluate(() => { const O = MA.SC.all.open; O.hold = true; O.state = 'tearing'; });
    await until(p, () => MA.state().open === 'reveal');
    await step(p, 20);
    await p.mouse.click(vp.width / 2, vp.height / 2);
    await until(p, () => MA.state().open === 'shown');
    await step(p, 34);
    if (logo) await p.evaluate(() => { const d = document.createElement('div'); d.className = 'hub-logo'; d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;padding:40px 0 26px;text-align:center;z-index:60;font-size:70px;pointer-events:none;background:linear-gradient(rgba(8,6,20,0),rgba(8,6,20,.85) 45%)'; d.innerHTML = '<small>THE SIX REALMS</small>MYTHIC ARMIES'; document.body.appendChild(d); document.getElementById('top').style.display = 'none'; document.querySelectorAll('.open-top,.open-hint,.reveal-name').forEach(e => e.style.display = 'none'); const O = MA.SC.all.open, cd = O.cards[0]; cd.g.scale.multiplyScalar(0.74); cd.g.position.y = O.viewH * 0.07; MA.tick(0.001); });
    else await p.evaluate(() => document.querySelectorAll('.open-hint').forEach(e => e.style.display = 'none'));
    await p.screenshot({ path: path.join(TMP, file + '.png'), timeout: 120000 });
    await p.context().close();
  };
  const only = process.env.MA_ONLY;
  if (!only || only === 'shot1') await revealShot({ width: 1280, height: 720 }, ['em27'], 'dragonfire', 'shot1');
  if (!only || only === 'cover') await revealShot({ width: 900, height: 900 }, ['sr30'], 'starfall', 'cover', true);
  if (!only || only === 'shot1') ff('-i', path.join(TMP, 'shot1.png'), '-vf', 'scale=960:540:flags=lanczos', '-q:v', '3', path.join(OUT, 'mythic-armies-shot1.jpg'));
  if (!only || only === 'cover') ff('-i', path.join(TMP, 'cover.png'), '-vf', 'scale=600:600:flags=lanczos', '-q:v', '3', path.join(OUT, 'mythic-armies-cover.jpg'));
  if (only) { await browser.close(); return; }
  console.log('shot1 + cover done');

  /* ---- shot 2: a boss battle mid-fight ---- */
  {
    const p = await open(browser, { width: 1280, height: 720 });
    await stageSave(p);
    await p.evaluate(() => MA.startBattle(MA.STAGES[7]));
    await step(p, 36 + 150);
    await p.screenshot({ path: path.join(TMP, 'shot2.png'), timeout: 120000 });
    ff('-i', path.join(TMP, 'shot2.png'), '-vf', 'scale=960:540:flags=lanczos', '-q:v', '3', path.join(OUT, 'mythic-armies-shot2.jpg'));
    await p.context().close();
    console.log('shot2 done');
  }

  /* ---- trailer: hub, pack opening with an Epic and a Legendary, collection viewer, battle, end card ---- */
  {
    const vp = { width: 854, height: 480 };
    const p = await open(browser, vp);
    let f = 0;
    const fdir = path.join(TMP, 'frames'); fs.mkdirSync(fdir);
    const cap = async (n) => { for (let i = 0; i < (n || 1); i++) { await step(p, 1); await p.screenshot({ path: path.join(fdir, String(f++).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 90, timeout: 120000 }); } };
    const capUntil = async (cond, max) => { for (let i = 0; i < (max || 300); i++) { if (await p.evaluate(cond)) return; await cap(1); } };
    await stageSave(p);
    await p.evaluate(() => { MA.go('hub'); document.getElementById('guide').hidden = true; document.getElementById('toasts').innerHTML = ''; });
    await step(p, 5);
    await cap(52);
    await p.evaluate(() => MA.testReveal(['ti23', 'em27'], 'dragonfire'));
    await capUntil(() => MA.state().open === 'idle', 60);
    await cap(8);
    await p.evaluate(() => { const O = MA.SC.all.open; O.hold = true; O.state = 'tearing'; });
    for (let c = 0; c < 2; c++) {
      await capUntil(() => MA.state().open === 'reveal', 120);
      await cap(c ? 10 : 5);
      await p.mouse.click(vp.width / 2, vp.height / 2);
      await capUntil(() => MA.state().open === 'shown', 140);
      await cap(c ? 62 : 24);
      if (!c) await p.mouse.click(vp.width / 2, vp.height / 2);
    }
    const own = await p.evaluate(() => { const ids = MA.S.cards.map(c => c.charId); return ids.sort((a, b) => MA.CHARS.find(x => x.id === b).r - MA.CHARS.find(x => x.id === a).r)[0]; });
    await p.evaluate(() => { MA.go('binder'); document.getElementById('toasts').innerHTML = ''; });
    await cap(14);
    await p.evaluate(id => MA.openViewer(id), own);
    await cap(40);
    await p.evaluate(() => { document.getElementById('vwClose').click(); MA.startBattle(MA.STAGES[11]); });
    await cap(24);
    await p.evaluate(() => { document.getElementById('btSpeed').click(); });
    await cap(100);
    await p.evaluate(() => { const d = document.createElement('div'); d.id = 'endcard'; d.style.cssText = 'position:fixed;inset:0;z-index:80;display:grid;place-items:center;background:radial-gradient(90% 90% at 50% 45%,#2a1d58,#0d0a1c 75%);text-align:center'; d.innerHTML = '<div><div class="hub-logo" style="font-size:64px"><small>THE SIX REALMS</small>MYTHIC ARMIES</div><div style="margin-top:14px;font:800 20px Nunito,sans-serif;color:#f2c46d;letter-spacing:.12em">RIP · COLLECT · COMMAND</div><div style="margin-top:8px;color:#b8b0c9;font:600 14px Nunito,sans-serif">Free on PulseBox</div></div>'; document.body.appendChild(d); });
    await cap(40);
    console.log('frames', f);
    ff('-framerate', '30', '-i', path.join(fdir, '%04d.jpg'), '-vf', 'fade=t=in:st=0:d=0.4,fade=t=out:st=' + (f / 30 - 0.5).toFixed(2) + ':d=0.5,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-profile:v', 'high', '-movflags', '+faststart', '-an', path.join(OUT, 'mythic-armies-trailer.mp4'));
    await p.context().close();
  }
  await browser.close();
  for (const n of ['cover.jpg', 'shot1.jpg', 'shot2.jpg', 'trailer.mp4']) console.log(n, Math.round(fs.statSync(path.join(OUT, 'mythic-armies-' + n)).size / 1024) + ' KB');
  fs.rmSync(TMP, { recursive: true, force: true });
})();
