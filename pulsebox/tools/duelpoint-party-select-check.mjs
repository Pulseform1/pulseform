// Duelpoint party agent select, through the real room relay: N players in a party at team size S (default 3 players, 2v2).
// Everyone readies up, the host starts, everyone lands on agent select; a pick a teammate has locked in cannot be taken;
// when all have locked in the match starts on every screen with the same fighters, and nobody on a team shares an operative.
//   node tools/duelpoint-party-select-check.mjs <shots> [players] [size]
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2], NP = +(process.argv[3] || 3), SIZE = +(process.argv[4] || 2), URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--proxy-server=' + process.env.HTTPS_PROXY] });
const errs = [], ok = (c, n, x = '') => { console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : '')); if (!c) process.exitCode = 1; };
async function open(tag, i) {
  const ctx = await b.newContext({ viewport: { width: 960, height: 540 }, ignoreHTTPSErrors: true }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(tag + ': ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.addInitScript(n => { Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {}; try { localStorage.setItem('pbx-mp-name', n); } catch (e) {} }, 'P' + i + Math.floor(Math.random() * 90 + 10));
  await p.goto(URL0, { timeout: 120000 }); await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 120000 }); await p.waitForTimeout(400);
  await p.click('#bPlay'); await p.waitForTimeout(600); return p;
}
const T = (p, fn, a) => p.evaluate(fn, a), wait = ms => new Promise(r => setTimeout(r, ms));
const P = []; for (let i = 0; i < NP; i++) P.push(await open(i ? 'friend' + i : 'host', i));
await T(P[0], () => { GAME.test.openParty(); MP.create(); }); await P[0].waitForFunction(() => MP.online(), null, { timeout: 20000 }); const code = await T(P[0], () => MP.code);
for (let i = 1; i < NP; i++) { await T(P[i], c => { GAME.test.openParty(); MP.join(c); }, code); await P[i].waitForFunction(() => MP.online(), null, { timeout: 20000 }); }
await wait(2500);
await T(P[0], s => { const t = GAME.test; t.PARTY.set.size = s; t.PARTY.set.fill = true; t.partyFns().hostTeams(); }, SIZE); await wait(1200);
// everyone picks vex in the lobby (a clash on purpose), then readies up
for (let i = 1; i < NP; i++) await T(P[i], () => { GAME.test.CFG.op = 'vex'; GAME.test.PARTY.ready = true; });
await T(P[0], () => { GAME.test.CFG.op = 'vex'; }); await wait(2000);
let r = await T(P[0], () => { const t = GAME.test; return { n: MP.players().length, size: t.PARTY.set.size, teams: Object.values(t.PARTY.teams).join(''), ready: MP.players().every(p => p.id === MP.hostId || (t.PARTY.prof.get(p.id) || {}).rd) }; });
ok(r.n === NP && r.ready, `${NP} in the party at ${SIZE}v${SIZE}, all ready`, JSON.stringify(r));
await P[0].screenshot({ path: `${O}/ps-${NP}-${SIZE}-party.png` });
await T(P[0], () => GAME.test.partyFns().startParty ? GAME.test.partyFns().startParty() : MP.start()); await wait(2500);
const sel = await Promise.all(P.map(p => T(p, () => { const t = GAME.test, S = t.UI.sel; return { screen: t.screen, online: !!(S && S.online), op: S && S.op }; })));
ok(sel.every(s => s.screen === 'select' && s.online), 'everyone is on agent select', JSON.stringify(sel));
await P[Math.min(1, NP - 1)].screenshot({ path: `${O}/ps-${NP}-${SIZE}-select.png` });
// the host locks in iris; a teammate of the host then tries iris too and finds it taken
await T(P[0], () => { const S = GAME.test.UI.sel; S.op = 'iris'; GAME.test.lockIn(); }); await wait(1500);
const mate = await T(P[0], () => { const S = GAME.test.UI.sel; if (!S) return null; const my = S.online.myT; const m = [...S.online.roster].find(p => !p.bot && p.id !== MP.id && S.online.team(p.id) === my); return m ? m.id : null; });
if (mate != null) { const mi = await Promise.all(P.map(p => T(p, () => MP.id))); const pm = P[mi.indexOf(mate)];
  const seen = await T(pm, () => { const t = GAME.test, S = t.UI.sel; S.op = 'iris'; return { taken: [...S.online.picks].some(([id, p]) => p.op === 'iris' && p.lk) }; }); await wait(400);
  const after = await T(pm, () => GAME.test.UI.sel.op);
  ok(seen.taken && after !== 'iris', 'a teammate sees the host locked in Iris, and cannot take her', JSON.stringify({ seen, after })); }
else console.log('  (no human teammate of the host at this size)');
await P[Math.min(1, NP - 1)].screenshot({ path: `${O}/ps-${NP}-${SIZE}-select2.png` });
for (let i = 1; i < NP; i++) await T(P[i], () => GAME.test.lockIn());
await wait(4500);
const st = await Promise.all(P.map(p => T(p, () => { const t = GAME.test, M = t.M; return { screen: t.screen, n: M && M.fs.length, keys: M && M.fs.map(f => f.key + ':' + f.op).sort().join(','), split: M && [0, 1].map(t => M.fs.filter(f => f.team === t).map(f => f.key).sort().join('+')).sort().join(' | '), byTeam: M && JSON.stringify([0, 1].map(t => M.fs.filter(f => f.team === t).map(f => f.op))), mine: M && M.fs[0].op }; })));
ok(st.every(s => s.n === 2 * SIZE || (SIZE * 2 < NP && s.n === NP)), `the match starts on every screen with ${2 * SIZE} fighters`, st.map(s => s.screen + '/' + s.n).join(' '));
ok(st.every(s => s.keys === st[0].keys && s.split === st[0].split), 'the same fighters, operatives and teams on every screen', st.map(s => s.keys + ' ' + s.split).join(' / '));
{ const by = JSON.parse(st[0].byTeam); ok(by.every(a => new Set(a).size === a.length), 'nobody on a team shares an operative', st[0].byTeam); }
ok(st[0].mine === 'iris', 'the host plays the Iris they locked in', st[0].mine);
await P[0].screenshot({ path: `${O}/ps-${NP}-${SIZE}-match.png` });
console.log('errors', JSON.stringify(errs.slice(0, 5))); await b.close();
