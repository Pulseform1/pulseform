// ARROWWOOD: two separate browser sessions play a whole 1v1 match against a real multiplayer server.
//   node arrowwood/server/node-server.js --dev &   then   node tools/arrowwood-1v1-check.mjs [base URL] [screenshot dir]
// The host makes a room in the menus; the guest opens the invite link; both ready up; the host shoots real arrows
// (mouse-equivalent draw and release, aimed with the same ballistics the game uses) until someone has five round wins.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'http://localhost:8790', OUT = process.argv[3] || '';
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
if (process.env.HTTPS_PROXY && !/localhost|127\./.test(BASE)) args.push('--proxy-server=' + process.env.HTTPS_PROXY);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args });
let fails = 0; const ok = (c, name, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : '')); };
const errs = [];
async function session(name, url) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }), p = await ctx.newPage();   // separate contexts: separate storage, separate player keys
  p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text() + JSON.stringify(m.location()))) errs.push(name + ': ' + m.text().slice(0, 200)); });
  await p.goto(url); await p.waitForTimeout(800); await p.click('#bPlay');
  for (let i = 0; i < 80 && !(await p.evaluate(() => GAME.test.ready)); i++) await p.waitForTimeout(250);
  return p;
}
const T = (p, fn, a) => p.evaluate(fn, a);
const until = async (p, fn, a, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await T(p, fn, a); if (r) return r; await p.waitForTimeout(150); } return null; };
const host = await session('host', BASE + '/games/arrowwood.html?dev&norender&nolock');
await T(host, () => { GAME.test.act('friends'); GAME.test.act('mode', '1v1'); GAME.test.act('create'); });
const code = await until(host, () => GAME.test.CL.ids.online && GAME.test.UI.open === 'room' && GAME.test.CL.code);
ok(!!code, 'the host makes a 1v1 room and sees its code', code);
const link = await T(host, () => document.querySelector('#aw .code') && location.origin + location.pathname + '?room=' + GAME.test.CL.code);
const guest = await session('guest', link + '&dev&norender&nolock');
const joined = await until(guest, () => GAME.test.CL.ids.online && GAME.test.UI.open === 'room' && GAME.test.CL.lobby.length);
ok(joined === 2, 'the guest opens the invite link in another browser and lands in the same room', joined);
const teams = await until(host, () => GAME.test.CL.lobby.length === 2 && GAME.test.CL.lobby.map(q => q.team).sort().join(''));
ok(teams === '01', 'one archer on each team', teams);
if (OUT) await host.screenshot({ path: OUT + '/1v1-lobby.png' });
await T(guest, () => GAME.test.act('ready'));
await until(host, () => GAME.test.CL.lobby.every(q => q.ready || q.id === GAME.test.CL.host));
await T(host, () => GAME.test.act('start'));
const started = await until(guest, () => GAME.test.CL.src === 'online' && ['intro', 'live'].includes(GAME.test.CL.phase));
ok(!!started, 'the host starts the match and both enter round 1');
const seen = { finisherGuest: 0, scores: [] };
for (let r = 0; r < 12; r++) {
  const live = await until(host, () => GAME.test.CL.phase === 'live' || GAME.test.CL.phase === 'results', null, 15000);
  if (!live || (await T(host, () => GAME.test.CL.phase)) === 'results') break;
  // the host stands on the lane, the guest 26 m up it; a full-draw arrow at the guest's head
  await T(guest, () => GAME.test.tp(70, 75, Math.PI, 0)); await T(host, () => GAME.test.tp(70, 101, 0, 0)); await host.waitForTimeout(400);
  const target = await T(host, () => { const g = [...GAME.test.CL.players.values()].find(p => p.id !== GAME.test.CL.me && p.buf.length); const q = g.buf[g.buf.length - 1]; return [q[1], q[2] + 1.62, q[3]]; });
  await T(host, t => { GAME.test.aimAt(t[0], t[1], t[2], 1); GAME.test.startDraw(); }, target);
  await until(host, () => GAME.test.ME.drawT >= 1, null, 8000);
  await T(host, t => { GAME.test.aimAt(t[0], t[1], t[2], 1); GAME.test.release(); }, target);
  const prev = seen.scores.length, res = await until(guest, n => GAME.test.CL.lastRound && GAME.test.CL.lastRound.score.reduce((a, b) => a + b, 0) > n && GAME.test.CL.lastRound, prev, 8000);
  if (await T(guest, () => GAME.test.ME.cam === 'finisher' || GAME.test.ME.cam === 'dead' || GAME.test.finishers().some(f => f.mine))) seen.finisherGuest++;
  if (res) seen.scores.push(res.score.join('-'));
  if (r === 0 && OUT) await guest.screenshot({ path: OUT + '/1v1-round1-guest.png' });
}
ok(seen.scores.length >= 5, 'rounds end on a confirmed elimination and the score counts up', seen.scores.join(' '));
const results = await until(host, () => GAME.test.CL.results, null, 15000);
ok(results && Math.max(...results.score) === 5, 'first to five round wins: the match ends', results && results.score.join('–'));
ok(seen.finisherGuest >= 4, 'the eliminated archer sees the third-person finisher', seen.finisherGuest);
const coinsH = results && results.coins[await T(host, () => GAME.test.CL.ids.online)], coinsG = results && results.coins[await T(guest, () => GAME.test.CL.ids.online)];
const idH = await T(host, () => GAME.test.CL.ids.online), rowsH = (results && results.coinRows || {})[idH] || [], sumH = rowsH.reduce((a, r) => a + r[1], 0);
ok(coinsH === sumH && rowsH.some(r => /elimination/.test(r[0])) && rowsH.some(r => /5 rounds won/.test(r[0])) && rowsH.some(r => r[0] === 'Victory'), 'the winner is paid for playing, every elimination, every round won and the win', rowsH.map(r => r.join(' ')).join(', '));
ok(coinsG >= 25 && coinsG < coinsH, 'the loser is paid less, but still paid', `${coinsH} / ${coinsG}`);
const shown = await until(host, () => GAME.test.UI.open === 'results', null, 6000);
ok(!!shown, 'the results screen opens with Rematch');
if (OUT) await host.screenshot({ path: OUT + '/1v1-results.png' });
// rewards are granted once: the server balance moved by exactly the match reward, and a refresh on the results
// screen brings the results back without paying out again
const bal = p => T(p, async () => (await (await fetch(GAME.test.SERVER.http + '/api/arrowwood/profile', { headers: { 'x-aw-key': GAME.test.KEY } })).json()).coins);
await host.waitForTimeout(800); const gb1 = await bal(guest), hb1 = await bal(host);
await guest.reload(); await guest.waitForTimeout(600); await guest.click('#bPlay'); await until(guest, () => GAME.test.ready, null, 30000);
const back = await until(guest, () => GAME.test.UI.open === 'results' && GAME.test.CL.results && GAME.test.CL.results.score.join('-'), null, 15000);
ok(!!back, 'a player who refreshes on the results screen comes back to the results', back);
await host.waitForTimeout(800); const gb2 = await bal(guest), hb2 = await bal(host);
ok(gb2 === gb1 && hb2 === hb1, 'the coins were granted once (no second payout after the refresh)', `host ${hb1}->${hb2}, guest ${gb1}->${gb2}`);
// rematch with the same teams
await T(host, () => GAME.test.act('rematch')); await T(guest, () => GAME.test.act('rematch'));
const again = await until(host, () => GAME.test.CL.phase === 'intro' || (GAME.test.CL.phase === 'live' && GAME.test.CL.score.join('') === '00'), null, 8000);
ok(!!again, 'Rematch starts a new match with the same teams');
ok(errs.length === 0, 'no errors in either browser', JSON.stringify(errs.slice(0, 3)));
console.log(fails ? fails + ' FAILED' : 'ALL OK'); await b.close();
