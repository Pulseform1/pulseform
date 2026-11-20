// Duelpoint party: switching sides when the teams are full, with real browsers through the live room relay. In a full
// 1v1 party: a player's switch request waits (and can be taken back); the host picks one player and then another on the
// other side to trade them; two players who both ask to switch trade places. Every device sees the same teams.
//   node tools/duelpoint-party-trade-check.mjs
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--proxy-server=' + process.env.HTTPS_PROXY] });
const errs = []; let failed = 0;
const ok = (c, n, x = '') => { if (!c) failed++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : '')); };
async function open(tag, name) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(tag + ': ' + e.message));
  await p.addInitScript(n => { Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {}; try { localStorage.setItem('pbx-mp-name', n); } catch (e) {} }, name);
  await p.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 120000 }); await p.waitForTimeout(500);
  await p.click('#bPlay'); await p.waitForTimeout(600); return p;
}
const T = (p, fn, a) => p.evaluate(fn, a), wait = ms => new Promise(r => setTimeout(r, ms));
const H = await open('host', 'Hale'), C = await open('friend', 'Coral');
await T(H, () => { GAME.test.openParty(); MP.create(); }); await H.waitForFunction(() => MP.online() && MP.code, null, { timeout: 30000 }); const code = await T(H, () => MP.code);
await T(C, c => { GAME.test.openParty(); MP.join(c); }, code); await C.waitForFunction(() => MP.online() && MP.players().length === 2, null, { timeout: 30000 });
const ids = await T(H, () => ({ h: MP.id, c: MP.players().find(p => p.id !== MP.id).id }));
// a full 1v1: the host on A, the friend on B
await T(H, i => { const t = GAME.test; t.PARTY.set.size = 1; t.PARTY.teams[i.h] = 0; t.PARTY.teams[i.c] = 1; t.PARTY.want.clear(); MP.send({ t: 'lteam', teams: t.PARTY.teams, set: t.PARTY.set, want: [] }); }, ids); await wait(1200);
const teams = p => T(p, i => { const t = GAME.test; return { h: t.PARTY.teams[i.h] || 0, c: t.PARTY.teams[i.c] || 0, want: [...t.PARTY.want].sort().join(',') }; }, ids);
let a = await teams(H), z = await teams(C);
ok(a.h === 0 && a.c === 1 && z.h === 0 && z.c === 1, 'a full 1v1 party: host on A, friend on B, on both screens', JSON.stringify([a, z]));
// the friend asks to switch: nobody to trade with yet, so it waits; asking again takes it back
await T(C, () => MP.to(MP.hostId, { t: 'lswap' })); await wait(1500); a = await teams(H); z = await teams(C);
ok(a.c === 1 && z.want === String(ids.c), 'asking to switch into a full team waits for a trade (and the friend sees it waiting)', JSON.stringify([a, z]));
await T(C, () => MP.to(MP.hostId, { t: 'lswap' })); await wait(1500); z = await teams(C);
ok(z.want === '' && z.c === 1, 'asking again takes the request back', JSON.stringify(z));
// the host's way: pick the friend, then pick someone on the other side: they trade
await T(H, i => { const f = GAME.test.partyFns(); f.hostClick(i.c); }, ids); const pk = await T(H, () => GAME.test.PARTY.pick);
await T(H, i => { const f = GAME.test.partyFns(); f.hostClick(i.h); }, ids); await wait(1500); a = await teams(H); z = await teams(C);
ok(pk === ids.c && a.h === 1 && a.c === 0 && z.h === 1 && z.c === 0, 'the host picks the friend, then themself on the other side: they trade, on both screens', JSON.stringify({ picked: pk, a, z }));
// both ask: the second request finds the first and they trade
await T(C, () => MP.to(MP.hostId, { t: 'lswap' })); await wait(1200);
await T(H, i => GAME.test.partyFns().swapTeam(i.h, true), ids); await wait(1500); a = await teams(H); z = await teams(C);
ok(a.h === 0 && a.c === 1 && z.h === 0 && z.c === 1 && z.want === '', 'two players who both ask to switch trade places', JSON.stringify([a, z]));
// with an open seat the move is direct (2v2 with two players)
await T(H, () => { const t = GAME.test; t.PARTY.set.size = 2; MP.send({ t: 'lteam', teams: t.PARTY.teams, set: t.PARTY.set, want: [] }); }); await wait(800);
await T(C, () => MP.to(MP.hostId, { t: 'lswap' })); await wait(1500); z = await teams(C);
ok(z.c === 0 && z.h === 0 && z.want === '', 'with room on the other side, switching is straight across', JSON.stringify(z));
await H.screenshot({ path: (process.argv[2] || '/tmp') + '/party-trade.png' });
console.log('errors', JSON.stringify(errs.slice(0, 5))); console.log(failed ? failed + ' check(s) failed' : 'all checks passed');
await b.close(); process.exit(failed ? 1 : 0);
