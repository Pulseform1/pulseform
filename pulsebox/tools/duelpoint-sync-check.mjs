// Duelpoint on Bluetooth earbuds: the browser is made to report 200 ms of output lateness, a rifle spray is held down
// and let go, and every sound the game starts is recorded. Checked: a whisper keeps the audio link awake; the shots after
// the first are started ahead of their moment by the lateness; letting go leaves nothing scheduled to play after it; as
// many shots are heard as were fired; with Sound sync OFF nothing is started early.
//   node tools/duelpoint-sync-check.mjs
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const errs = []; let failed = 0; const ok = (c, n, x = '') => { if (!c) failed++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : '')); };
const p = await (await b.newContext({ viewport: { width: 400, height: 225 } })).newPage();   // (small, so even a software renderer keeps the game in real time)
p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
await p.addInitScript(() => {
  Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {};
  // earbuds: the output adds 200 ms
  Object.defineProperty(AudioContext.prototype, 'outputLatency', { get() { return window.__fakeLag != null ? window.__fakeLag : .2; } });
  // every buffer sound started, and every one stopped
  window.__snd = []; const st = AudioBufferSourceNode.prototype.start, sp = AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.start = function (when = 0, ...r) { const e = { at: this.context.currentTime, when: when || this.context.currentTime, dur: this.buffer ? this.buffer.duration : 0, buf: this.buffer, loop: this.loop, stopped: null }; this.__e = e; window.__snd.push(e); return st.call(this, when, ...r); };
  AudioBufferSourceNode.prototype.stop = function (when = 0, ...r) { if (this.__e) this.__e.stopped = this.context.currentTime; return sp.call(this, when, ...r); };
});
await p.goto('file://' + path.resolve('public/games/duelpoint.html'), { timeout: 120000 });
await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 90000 }); await p.waitForTimeout(600);
await p.click('#bPlay'); await p.waitForTimeout(900);
await p.evaluate(() => { const t = GAME.test; t.seed(5); t.CFG.sites = 1; t.CFG.sync = 'auto'; t.CFG.quality = 'low'; t.menuPlay(1); t.skipLoad(); t.UI.armory = false; const M = t.M; M.phase = 'live'; M.t = 80;
  const F = M.fs[1]; F.bot = { diff: 0, dummy: true, home: [F.x, F.z] }; const P = M.fs[0]; P.guns[1] = 'lancer'; P.ammo.lancer = { mag: 25, res: 50 }; P.slot = 1; P.pitch = .6; });   // (aimed at the sky: nobody gets hurt)
await p.waitForTimeout(2500);   // the shots are baked
// the moment of each real shot of yours, on the audio clock
await p.evaluate(() => { window.__real = []; GAME.test.onEvent('shot', (f, S, first) => { if (first && f === GAME.test.M.fs[0]) window.__real.push(GAME.test.audioCtx().currentTime); }); });
const keep = await p.evaluate(() => window.__snd.some(e => e.loop && e.dur >= .9));
ok(keep, 'a whisper runs all the time and keeps the earbuds awake');
// hold the trigger, then let go
const spray = async () => {
  await p.evaluate(() => { window.__snd.length = 0; window.__real.length = 0; window.__shot0 = GAME.test.M.fs[0].stat.shots; GAME.test.M.fs[0].ammo.lancer.mag = 25; });
  await p.mouse.move(200, 112); await p.mouse.down(); await p.waitForTimeout(1300); await p.mouse.up(); await p.evaluate(() => { window.__rel = GAME.test.audioCtx().currentTime; });
  const rel = await p.evaluate(() => ({ ac: window.__snd.length ? null : null }));
  await p.waitForTimeout(150); const relT = await p.evaluate(() => window.__relT = (GAME.test.M && performance.now()));
  await p.waitForTimeout(900);
  return p.evaluate(() => { const shots = window.__real.length, B = GAME.test.shotBuf('lancer'), s = window.__snd.filter(e => e.buf === B), L = GAME.test.soundLag(), R = window.__real;
    const ahead = s.filter(e => e.when > e.at + .005), heard = s.filter(e => e.stopped == null || e.stopped >= e.when), lastReal = Math.max(...R);
    // each sound started early should be its lateness ahead of a real shot of yours
    // (a sound already playing when you let go is for a shot that then never came: the earbuds were behind anyway, so that is
    // when the old way would still have been playing your last real shots. It is not judged; one not yet playing must be called off)
    const real = ahead.filter(e => e.when < window.__rel), miss = real.filter(e => e.when + L <= lastReal + .06).map(e => Math.min(...R.map(t => Math.abs(e.when + L - t)))), worst = miss.length ? Math.max(...miss) : 0;
    const leftOver = s.filter(e => e.stopped == null && e.when > window.__rel + .06);
    const gaps = R.slice(1).map((t, i) => t - R[i]), gm = gaps.length ? +(gaps.reduce((a, c) => a + c, 0) / gaps.length).toFixed(3) : 0;
    return { gm, shots, sounds: s.length, ahead: ahead.length, lag: +L.toFixed(3), worstMiss: +worst.toFixed(3), heard: heard.length, cancelled: s.length - heard.length, leftOver: leftOver.length }; });
};
let r = await spray();
ok(r.shots >= 5, 'a held spray fires', JSON.stringify(r));
ok(r.ahead >= Math.max(2, r.shots * .3), 'the shots after the first are started ahead of their moment', `${r.ahead} of ${r.sounds} sounds`);
ok(r.ahead && r.worstMiss < .05, 'each one is started the earbuds\' lateness before its shot, so it is heard as it is fired', `lateness ${r.lag}s, worst ${r.worstMiss}s off`);
ok(r.leftOver === 0, 'letting go leaves nothing scheduled to play after the last shot', `${r.cancelled} called off`);
ok(Math.abs(r.heard - r.shots) <= 2, 'about as many shots are heard as were fired', `${r.heard} heard, ${r.shots} fired`);
// Sound sync OFF: nothing early
await p.evaluate(() => { GAME.test.CFG.sync = 0; });
r = await spray();
ok(r.ahead === 0 && r.heard === r.shots, 'with Sound sync OFF every shot plays as it is fired, none early', JSON.stringify(r));
// a wired output (5 ms): nothing is moved
await p.evaluate(() => { GAME.test.CFG.sync = 'auto'; window.__fakeLag = .005; });
r = await spray();
ok(r.ahead === 0, 'on a wired output (a few ms) nothing is moved', JSON.stringify(r));
console.log('errors', errs.length, errs.slice(0, 3)); await b.close(); process.exit(errs.length || failed ? 1 : 0);
