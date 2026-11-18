// Duelpoint bug sweep in real browsers: the lobby, bot matches, every gun, money, smokes, the range, online, touch.
//   node tools/duelpoint-bug-check.mjs <shots> [url]
import { createRequire } from 'module'; import path from 'path';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const O = process.argv[2], URL0 = process.argv[3] || 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--proxy-server=' + process.env.HTTPS_PROXY] });
const errs = [], ok = (c, n, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : ''));
async function open(tag, dev) {
  const ctx = await b.newContext(dev ? { ...devices[dev], ignoreHTTPSErrors: true } : { viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(tag + ': ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.addInitScript(() => { Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {}; try { localStorage.setItem('pbx-mp-name', 'Q' + Math.floor(Math.random() * 90 + 10)); } catch (e) {} });
  await p.goto(URL0 + (URL0.startsWith('http') ? '?nc=' + Date.now() : ''));
  await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 60000 }); await p.waitForTimeout(600);
  await p.click('#bPlay'); await p.waitForTimeout(900);
  return p;
}
const T = (p, fn, a) => p.evaluate(fn, a);
const p = await open('desk');
// ---- the lobby can be closed without closing the game
await T(p, () => MP.show()); await p.waitForTimeout(300);
let r = await T(p, () => ({ shown: !document.getElementById('mp-box').hidden, back: !!document.getElementById('mp-back') && !document.getElementById('mp-back').parentNode.hidden }));
ok(r.shown && r.back, 'PLAY WITH FRIENDS opens the lobby, with a Back button', JSON.stringify(r));
await p.screenshot({ path: O + '/bug-lobby.png' });
await p.click('#mp-back'); await p.waitForTimeout(300);
r = await T(p, () => ({ hidden: document.getElementById('mp-box').hidden, screen: GAME.test.screen, kit: K.state }));
ok(r.hidden && r.screen === 'menu' && r.kit === 'play', 'Back closes the lobby and leaves you on the game menu', JSON.stringify(r));
await T(p, () => MP.show()); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
r = await T(p, () => ({ hidden: document.getElementById('mp-box').hidden, kit: K.state }));
ok(r.hidden && r.kit === 'play', 'Escape closes it too, and the game keeps running', JSON.stringify(r));
await T(p, () => MP.show()); await p.click('#mp-create'); await p.waitForFunction(() => MP.online(), null, { timeout: 20000 });
await p.click('#mp-back'); await p.waitForTimeout(500);
r = await T(p, () => ({ online: MP.online(), hidden: document.getElementById('mp-box').hidden }));
ok(!r.online && r.hidden, 'Back from inside a room leaves the room', JSON.stringify(r));
// ---- a 2v2 bot match: buy, fire every class, smoke, money, round flow
await T(p, () => GAME.test.menuPlay(2)); await p.waitForTimeout(600);
r = await T(p, () => ({ load: GAME.test.loadingNow(), armory: GAME.test.UI.armory, sites: GAME.test.SITES.length }));
ok(r.load && !r.armory, 'a match opens on the loading screen, armory closed until it ends', JSON.stringify(r));
await p.screenshot({ path: O + '/bug-loading.png' });
await T(p, () => GAME.test.skipLoad()); await p.waitForTimeout(900);
r = await T(p, () => ({ n: GAME.test.M.fs.length, cr: GAME.test.M.fs[0].credits, armory: GAME.test.UI.armory, round: GAME.test.M.round }));
ok(r.n === 4 && r.cr === 800 && r.armory && r.round === 1, '2v2 starts: four fighters, pistol round, 800 to spend, armory open', JSON.stringify(r));
r = await T(p, () => { const t = GAME.test, P = t.M.fs[0]; const a = t.buy('quill'), s = t.buy('smoke'); return { a, s, cr: P.credits, g: P.guns[2], sm: P.smokes }; });
ok(r.a && r.s && r.cr === 100 && r.g === 'quill' && r.sm === 1, 'buy a Quill and a smoke on the pistol round', JSON.stringify(r));
await T(p, () => { const t = GAME.test; t.UI.armory = false; t.M.t = .01; t.tick(.2); });
const shots = {};
await p.mouse.move(640, 360); await p.mouse.down(); await p.waitForTimeout(300); await p.mouse.up();
for (const g of ['quill', 'stub', 'wasp', 'hammer', 'gnat', 'hornet', 'breaker', 'thresher', 'mako', 'paladin', 'vesper', 'lancer', 'kite', 'longbow', 'torrent', 'pip']) {
  await T(p, g => { const t = GAME.test, P = t.M.fs[0], G = t.GUNS[g]; P.alive = true; P.hp = 100; P.guns[G.slot] = g; P.slot = G.slot; P.ammo[g] = { mag: G.mag, res: 90 }; P.fireT = 0; P.reloadT = 0; P.burst = null; t.M.phase = 'live'; t.M.t = 60; }, g);
  await p.mouse.move(640, 360); await p.mouse.down();
  shots[g] = await T(p, () => { const t = GAME.test, s0 = t.M.fs[0].stat.shots; t.tick(.5); return t.M.fs[0].stat.shots - s0; });
  await p.waitForTimeout(250); await p.mouse.up();
}
ok(Object.values(shots).every(n => n >= 1), 'every gun fires with the mouse (and the game keeps drawing)', JSON.stringify(shots));
r = await T(p, () => { const t = GAME.test, P = t.M.fs[0]; P.smokes = 1; P.throwT = 0; const ok2 = t.throwNade(); t.tick(2.2); return { ok2, clouds: t.M.smokes.filter(s => s.grey).length }; });
ok(r.ok2 && r.clouds >= 1, 'G throws the smoke and it pops into a cloud', JSON.stringify(r));
await p.waitForTimeout(600); await p.screenshot({ path: O + '/bug-fight.png' });
// play the match out with the bots, round by round
r = await T(p, () => { const t = GAME.test; t.botMe(1); const seen = []; for (let i = 0; i < 60 * 900 && !t.M.over; i++) { const rd = t.M.round; t.tick(1 / 60); if (t.M.round !== rd) seen.push(t.M.fs[0].credits); } return { over: !!t.M.over, wins: t.M.wins, rounds: seen.length + 1, credits: seen }; });
ok(r.over && Math.max(...r.wins) === 5, 'a whole 2v2 match plays out to 5 rounds', JSON.stringify({ wins: r.wins, rounds: r.rounds }));
ok(r.credits.length >= 4 && r.credits.every(c => c >= 0 && c <= 9000), 'money moves every round and stays within 0-9000', r.credits.join(','));
await p.waitForTimeout(800); await p.screenshot({ path: O + '/bug-over.png' });
r = await T(p, () => GAME.test.screen); ok(r === 'over', 'the match ends on the results screen', r);
// play again, 1v1
await T(p, () => { GAME.test.menuPlay(1); GAME.test.skipLoad(); }); await p.waitForTimeout(800);
r = await T(p, () => ({ n: GAME.test.M.fs.length, cr: GAME.test.M.fs[0].credits, screen: GAME.test.screen }));
ok(r.n === 2 && r.cr === 800 && r.screen === 'play', 'a 1v1 duel starts fresh', JSON.stringify(r));
// the practice range
await T(p, () => { GAME.test.toMenu(); GAME.test.play({ mode: 'range' }); }); await p.waitForTimeout(800);
r = await T(p, () => { const t = GAME.test, P = t.M.fs[0]; const a = t.buy('longbow'), c = P.credits; P.slot = 1; P.fireT = 0; t.fire(); return { a, c, phase: t.M.phase, shots: P.stat.shots }; });
ok(r.a && r.phase === 'live' && r.shots === 1, 'the practice range: anything is free and fires', JSON.stringify(r));
await T(p, () => GAME.test.toMenu()); await p.waitForTimeout(400);
r = await T(p, () => ({ screen: GAME.test.screen })); ok(r.screen === 'menu', 'back to the menu from the range', r.screen);
// ---- online: a room, a friend, a 2v2 with bots filling in
const H = p, C = await open('friend');
await T(H, () => MP.show()); await H.click('#mp-create'); await H.waitForFunction(() => MP.online(), null, { timeout: 20000 }); const code = await T(H, () => MP.code);
await T(C, () => MP.show()); await C.click('#mp-joinb'); await C.fill('#mp-code', code); await C.click('#mp-joingo'); await C.waitForFunction(() => MP.online(), null, { timeout: 20000 });
await H.waitForTimeout(800); await H.click('#mp-start'); await H.waitForTimeout(2500); await C.waitForTimeout(1500);
const hs = await T(H, () => ({ n: GAME.test.M && GAME.test.M.fs.length, online: GAME.test.M && GAME.test.M.online })), cs = await T(C, () => ({ n: GAME.test.M && GAME.test.M.fs.length, online: GAME.test.M && GAME.test.M.online }));
ok(hs.online && cs.online && hs.n === 4 && cs.n === 4, 'two friends online play 2v2, bots fill the other seats', JSON.stringify({ hs, cs }));
await T(H, () => { const t = GAME.test; t.UI.armory = false; t.M.t = .01; }); await T(C, () => { const t = GAME.test; t.UI.armory = false; t.M.t = .01; });
await H.waitForTimeout(2000);
r = await T(C, () => { const t = GAME.test, P = t.M.fs[0]; P.ammo.pip = { mag: 12, res: 36 }; P.slot = 2; P.fireT = 0; t.M.phase = 'live'; return t.fire(); });
await H.waitForTimeout(1500);
ok(r, 'the friend fires online without breaking anything', r);
await C.close(); await H.waitForTimeout(3000);
r = await T(H, () => ({ screen: GAME.test.screen, over: !!(GAME.test.M && GAME.test.M.over), n: GAME.test.M && GAME.test.M.fs.length }));
ok(r.screen === 'play' || r.screen === 'over', 'when the friend leaves, the host is not stuck', JSON.stringify(r));
// ---- a phone: the FIRE button
const ph = await open('phone', 'iPhone 13 landscape');
await T(ph, () => { GAME.test.menuPlay(1); GAME.test.skipLoad(); }); await ph.waitForTimeout(800);
await T(ph, () => { const t = GAME.test; t.UI.armory = false; t.M.t = .01; t.tick(.2); const P = t.M.fs[0]; P.ammo.pip = { mag: 12, res: 36 }; });
const fb = await T(ph, () => { const b = GAME.test.touchButtons().find(b => b.k === 'fire'); const c = document.getElementById('cv').getBoundingClientRect(), V = K.view; return [c.left + (b.x - V.x0) / (V.x1 - V.x0) * c.width, c.top + (b.y - V.y0) / (V.y1 - V.y0) * c.height]; });
const cdp = await ph.context().newCDPSession(ph);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fb[0], y: fb[1], id: 1 }] });
const ts = await T(ph, () => { const t = GAME.test, s0 = t.M.fs[0].stat.shots; t.tick(.4); return t.M.fs[0].stat.shots - s0; });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
ok(ts >= 1, 'on a phone, holding FIRE shoots', ts);
await ph.waitForTimeout(500); await ph.screenshot({ path: O + '/bug-phone.png' });
console.log('ERRORS', JSON.stringify(errs.slice(0, 8))); await b.close();
