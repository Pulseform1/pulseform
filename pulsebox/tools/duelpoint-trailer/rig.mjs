// The capture rig for the Duelpoint trailer: the real game in a browser on a virtual clock (requestAnimationFrame,
// performance.now and Date.now only move when the rig steps them), so each frame is simulated, drawn and saved at an exact
// 30 fps however slowly the software renderer runs. Shots are written as numbered JPEGs; cut.mjs puts them together.
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
const { chromium } = createRequire(import.meta.url)('playwright');
export const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, '..', '..');
export const W = 1280, H = 720, FPS = 30;
const CLOCK = `(() => { let now = 1000, id = 0; const q = []; window.requestAnimationFrame = fn => { q.push([++id, fn]); return id; };
  window.cancelAnimationFrame = i => { const k = q.findIndex(e => e[0] === i); if (k >= 0) q.splice(k, 1); };
  performance.now = () => now; const D0 = Date.now(); Date.now = () => D0 + now;
  window.__step = ms => { now += ms; const run = q.splice(0); for (const e of run) { try { e[1](now); } catch (err) { console.error(err); } } };
  window.__auto = true; (function tick() { if (window.__auto) window.__step(1000 / 60); setTimeout(tick, 2); })(); })();`;
export async function open(out) {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage(); const errs = [];
  p.on('pageerror', e => { errs.push(String(e.stack || e).slice(0, 300)); console.log('PAGE ERROR', String(e).slice(0, 200)); });
  await p.addInitScript(CLOCK);
  // a recording copy of the game with one addition: a bot with bot.act(f, dt, I) is directed by it (the shipped page is untouched)
  const src = fs.readFileSync(path.join(ROOT, 'public', 'games', 'duelpoint.html'), 'utf8'), hook = "    if (B.dummy) {   // the range's target: pace about, face the player, never shoot";
  if (src.split(hook).length !== 2) throw new Error('director hook: anchor not found');
  const page = path.join(out, 'duelpoint-recording.html'); fs.writeFileSync(page, src.replace(hook, "    if (B.act) return B.act(f, dt, I) || I;\n" + hook));
  await p.goto('file://' + page);
  await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 180000, polling: 200 });
  await p.evaluate(() => { document.getElementById('bPlay').click(); });
  await p.waitForTimeout(600);
  // helpers inside the page: T (the game's test handle), a cinematic camera through the renderer's own hook, HUD on/off
  await p.evaluate(() => {
    const T = window.T = GAME.test; T.CFG.quality = 'high'; T.CFG.shake = 0;
    window.hud = on => { for (const c of document.querySelectorAll('canvas')) if (c !== T.X.renderer.domElement) c.style.visibility = on ? '' : 'hidden'; document.querySelectorAll('.kit-ui, #ui, .hud').forEach(e => e.style.visibility = on ? '' : 'hidden'); };
    // cine(fn): fn(t) -> { p: [x, y, z], at: [x, y, z], fov }, t in seconds since the shot began; null gives the game its camera back
    window.cine = fn => { const X = T.X; window.__cineT = 0; if (!fn) { X.camHook = null; return; }
      X.camHook = cam => { const c = fn(window.__cineT), M = T.M; cam.position.set(c.p[0], c.p[1], c.p[2]); cam.up.set(0, 1, 0); cam.lookAt(c.at[0], c.at[1], c.at[2]); if (c.roll) cam.rotateZ(c.roll); cam.fov = c.fov || 50; cam.updateProjectionMatrix();
        X.view.visible = false; const P = T.M.fs[0];   // no first-person gun; everyone drawn, the viewer's own body too
        for (const f of M.fs) { const A = X.agents.get(f); if (f === P) T.updateAgent(f, 1 / 30); const A2 = X.agents.get(f); if (A2) A2.visible = !f.hide; } }; };
    window.ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
    window.lerp = (a, b, t) => a + (b - a) * t;
    window.match = (o, op) => { T.CFG.op = op || 'vanta'; T.toMenu(); T.play(o); T.skipLoad(); T.UI.armory = false; const M = T.M; return M; };
    window.live = () => { const M = T.M; M.phase = 'live'; M.t = 85; T.UI.armory = false; };
    // directing: F(i) a fighter; act(f, fn) scripts it (fn(f, dt, I) fills the input I); still(f) stands; place, aimAt, gun, cast
    window.F = i => T.M.fs[i];
    window.act = (f, fn) => { f.bot = Object.assign(f.bot || { diff: 2 }, { act: fn }); f.local = false; };
    window.still = f => act(f, (f, dt, I) => I);
    window.place = (f, x, z, yaw) => Object.assign(f, { x, z, y: T.hAt(x, z), yaw: yaw == null ? f.yaw : yaw, pitch: 0, vx: 0, vy: 0, vz: 0, px: x, pz: z, ground: true, alive: true, hp: 100 });
    window.yawTo = (ax, az, bx, bz) => Math.atan2(-(bx - ax), -(bz - az));
    window.aimAt = (f, x, y, z) => { const dx = x - f.x, dz = z - f.z, dy = y - (f.y + 1.62); f.yaw = Math.atan2(-dx, -dz); f.pitch = Math.atan2(dy, Math.hypot(dx, dz)); };
    window.gun = (f, k) => { f.guns[1] = k; f.slot = 1; T.kit().giveAmmo(f, k); f.reloadT = 0; f.fireT = 0; };
    window.setOp = (f, op) => { f.op = op; const A = T.X.agents.get(f); if (A) { T.X.scene.remove(A); T.X.agents.delete(f); } };
    window.open1 = (x, z) => T.hAt(x, z) < .05;
  });
  await p.waitForTimeout(400);
  const api = {
    p, b, errs, out,
    run: (fn, arg) => p.evaluate(fn, arg),
    // let the game run on its own (fast) for a while of game time
    async idle(sec) { await p.evaluate(() => { window.__auto = false; }); for (let i = 0; i < sec * 60; i += 30) await p.evaluate(n => { for (let k = 0; k < n; k++) window.__step(1000 / 60); }, Math.min(30, sec * 60 - i)); },
    // record a shot: n frames at 30 fps; each(frame, t) may run page code before a frame
    async shot(name, sec, each) {
      await p.evaluate(() => { window.__auto = false; }); const n = Math.round(sec * FPS), dir = path.join(out, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); const t0 = Date.now();
      for (let i = 0; i < n; i++) { if (each) await each(i, i / FPS);
        await p.evaluate(t => { window.__cineT = t; if (T.X) T.X.slow = 0; window.__step(1000 / 30); }, i / FPS);
        await p.screenshot({ path: path.join(dir, String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 94 }); }
      console.log(`shot ${name}: ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`); },
    async close() { await b.close(); }
  };
  return api;
}
