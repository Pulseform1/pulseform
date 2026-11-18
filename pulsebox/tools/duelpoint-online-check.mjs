// Duelpoint online robustness, two real browsers through the live room relay:
//   a dropped connection mid-match gets back into the same match (friend and host), focus loss or Escape never pauses
//   an online match, an idle party is kept alive by pings, and someone who never comes back is dropped after the wait.
//   node tools/duelpoint-online-check.mjs <shots dir>
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2] || '/tmp', URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--proxy-server=' + process.env.HTTPS_PROXY] });
const errs = []; let failed = 0;
const ok = (c, n, x = '') => { if (!c) failed++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : '')); };
async function open(tag, name) {
  const ctx = await b.newContext({ viewport: { width: 960, height: 540 }, ignoreHTTPSErrors: true }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(tag + ': ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.addInitScript(n => {
    Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {};
    try { localStorage.setItem('pbx-mp-name', n); } catch (e) {}
    window.__pings = 0; const s0 = WebSocket.prototype.send; WebSocket.prototype.send = function (d) { if (/mp-ping|mp-hb/.test(String(d))) window.__pings++; return s0.call(this, d); };
  }, name);
  await p.goto(URL0); await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 60000 }); await p.waitForTimeout(600);
  await p.click('#bPlay'); await p.waitForTimeout(800);
  return p;
}
// a dropped connection may linger on the server unseen (it never closed); the game notices its silence within 7 s, so wait for states, not a fixed time
const until = async (p, fn, ms) => { const t0 = Date.now(); for (;;) { const s = await st(p); if (fn(s) || Date.now() - t0 > ms) return s; await p.waitForTimeout(500); } };
const T = (p, fn, a) => p.evaluate(fn, a), st = p => T(p, () => { const t = GAME.test, M = t.M; return M ? { over: M.over ? M.over.why : null, host: M.host, round: M.round, phase: M.phase, time: +M.time.toFixed(1), online: MP.online(), rejoining: MP.rejoining, dropped: !!M.dropped, kstate: K.state, gone: M.fs.filter(f => f.gone).map(f => f.name), dc: M.fs.filter(f => f.dc).map(f => f.name) } : { none: 1, kstate: K.state, online: MP.online() }; });

// a party of two on one team, bots on the other
const H = await open('host', 'Hosty'), C = await open('friend', 'Frendo');
await T(H, () => { GAME.test.openParty(); MP.create(); }); await H.waitForFunction(() => MP.online(), null, { timeout: 20000 });
const code = await T(H, () => MP.code);
await T(C, c => { GAME.test.openParty(); MP.join(c); }, code); await C.waitForFunction(() => MP.online(), null, { timeout: 20000 });
await H.waitForTimeout(1500);
// an idle party stays alive: the connection pings itself
await H.waitForTimeout(12000);
let r = await T(H, () => ({ pings: window.__pings, online: MP.online(), n: MP.players().length, who: MP.players().map(p => p.id + ':' + p.name).join(' ') }));
ok(r.pings >= 1 && r.online && r.n === 2, 'an idle party keeps sending heartbeats and keeps both players', JSON.stringify(r));
await T(C, () => { GAME.test.PARTY.ready = true; }); await C.waitForTimeout(1200);
await T(H, () => { const id = MP.players().find(p => p.id !== MP.id).id; GAME.test.PARTY.teams[id] = 0; GAME.test.PARTY.set.size = 2; MP.send({ t: 'lteam', teams: GAME.test.PARTY.teams, set: GAME.test.PARTY.set }); }); await H.waitForTimeout(800);
await T(H, () => MP.start()); await H.waitForTimeout(2500);
await T(H, () => { const t = GAME.test; t.skipLoad && t.skipLoad(); t.UI.armory = false; t.M.t = .01; }); await T(C, () => { const t = GAME.test; t.skipLoad && t.skipLoad(); t.UI.armory = false; t.M.t = .01; });
await H.waitForTimeout(2500);
r = { h: await st(H), c: await st(C) };
ok(r.h.online && r.c.online && !r.h.over && !r.c.over && r.h.host && !r.c.host, 'the party is in a match: the host runs it', JSON.stringify(r));

// focus lost and Escape: an online match keeps running
// (software rendering here runs a few frames a second, so the clock is compared over a few seconds, not against real time)
const t0 = (await st(H)).time; await T(H, () => { window.dispatchEvent(new Event('blur')); }); await H.waitForTimeout(5000); r = await st(H);
ok(r.kstate === 'play' && r.time > t0, 'the host losing focus does not pause the online match', `K.state ${r.kstate}, clock ${t0} -> ${r.time}`);
await H.keyboard.press('Escape'); await H.waitForTimeout(500); r = await T(H, () => ({ k: K.state, opts: GAME.test.UI.opts }));
ok(r.k === 'play', 'Escape in an online match opens the settings over it instead of pausing', JSON.stringify(r)); await T(H, () => { GAME.test.UI.opts = false; });

// the friend's connection falls over: they get back into the same match
await T(C, () => MP._drop()); await C.waitForTimeout(700);
r = { h: await st(H), c: await st(C) };
ok(r.c.rejoining && !r.c.over && r.c.kstate === 'play', 'the friend loses the connection: their game keeps running while it reconnects', JSON.stringify(r.c));
await C.waitForFunction(() => MP.online(), null, { timeout: 20000 }); await H.waitForTimeout(2500);
r = { h: await st(H), c: await st(C) };
ok(!r.h.over && !r.c.over && !r.h.gone.length && !r.h.dc.length && r.c.online && !r.c.dropped, 'the friend is back in the same match; the host never dropped them', JSON.stringify(r));
const moved = await T(C, () => { const P = GAME.test.M.fs[0]; P.x += .6; return P.key; }); await H.waitForTimeout(1200);
r = await T(H, k => { const f = GAME.test.M.byKey[k]; return f && f.snaps && f.snaps.length > 0; }, moved);
ok(r, 'the host sees the friend move again after the reconnect', r);
await H.screenshot({ path: O + '/online-after-friend-drop.png' });

// the host's connection falls over: the friend takes over the room, and the old host comes back as a player
await T(H, () => MP._drop());
r = { c: await until(C, s => s.host, 15000) };
ok(r.c.host && !r.c.over, 'the host drops: the friend becomes host and the match goes on', JSON.stringify(r.c));
await H.waitForFunction(() => MP.online(), null, { timeout: 20000 }); await until(H, s => !s.host, 12000); await until(C, s => s.host, 12000);
r = { h: await st(H), c: await st(C), bots: await T(H, () => GAME.test.M.fs.filter(f => f.isBot).every(f => f.net && !f.bot)) };
ok(!r.h.host && r.c.host && r.bots && !r.h.over && !r.c.over, 'the old host is back as a player: one host, and its bots now follow the new host', JSON.stringify(r));
// the round still ends and the next one starts on both
const rd = r.c.round; await T(C, () => { GAME.test.M.t = .05; }); await C.waitForTimeout(9000);
r = { h: await st(H), c: await st(C) };
ok(r.h.round === r.c.round && (r.c.round > rd || r.c.phase === 'end'), 'rounds still move on for both after the handover', JSON.stringify({ h: [r.h.round, r.h.phase], c: [r.c.round, r.c.phase], from: rd }));

// someone who never comes back: dropped after the wait, and the team game carries on
await C.close(); r = await until(H, s => s.dc.length === 1, 15000);
ok(r.dc.length === 1 && !r.over, 'a friend who closes the game gets the reconnect wait first', JSON.stringify(r));
await T(H, () => { GAME.test.M.time += 25; }); await H.waitForTimeout(2500); r = await st(H);   // the wait runs on game time, which crawls under software rendering
ok(r.gone.length === 1 && !r.dc.length && !r.over, 'after the wait they count as gone and the host plays on with the bots', JSON.stringify(r));
await H.screenshot({ path: O + '/online-after-leave.png' });
console.log('ERRORS', JSON.stringify(errs.slice(0, 8))); if (errs.length) failed++;
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
await b.close(); process.exit(failed ? 1 : 0);
