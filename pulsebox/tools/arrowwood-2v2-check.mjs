// ARROWWOOD: four browser sessions in one 2v2 room. Teams are set in the lobby, the match starts, and when one archer
// goes down they watch their surviving teammate (spectate) while the other three keep playing.
//   node arrowwood/server/node-server.js --dev &   then   node tools/arrowwood-2v2-check.mjs [base URL] [screenshot dir]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'http://localhost:8790', OUT = process.argv[3] || '';
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
if (process.env.HTTPS_PROXY && !/localhost|127\./.test(BASE)) args.push('--proxy-server=' + process.env.HTTPS_PROXY);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args });
let fails = 0; const ok = (c, name, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : '')); };
const errs = [];
async function session(name, url) {
  const ctx = await b.newContext({ viewport: { width: 1100, height: 620 } }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(name + ': ' + m.text().slice(0, 200)); });
  await p.goto(url); await p.waitForTimeout(600); await p.click('#bPlay');
  for (let i = 0; i < 80 && !(await p.evaluate(() => GAME.test.ready)); i++) await p.waitForTimeout(250);
  return p;
}
const T = (p, fn, a) => p.evaluate(fn, a);
const until = async (p, fn, a, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await T(p, fn, a); if (r) return r; await p.waitForTimeout(150); } return null; };
const q = '&dev&norender&nolock';
const A = await session('A', BASE + '/games/arrowwood.html?' + q);
await T(A, () => { GAME.test.act('friends'); GAME.test.act('mode', '2v2'); GAME.test.act('create'); });
const code = await until(A, () => GAME.test.CL.ids.online && GAME.test.CL.code);
ok(!!code, 'host makes a 2v2 room', code);
const others = [];
for (const n of ['B', 'C', 'D']) others.push(await session(n, BASE + '/games/arrowwood.html?room=' + code + q));
const [B, C, D] = others;
const four = await until(A, () => GAME.test.CL.lobby.length === 4 && GAME.test.CL.lobby.length);
ok(four === 4, 'four sessions join the same room', four);
// teams: A and B Moss, C and D Russet (switch whoever is on the wrong side)
const want = { A: 0, B: 0, C: 1, D: 1 }, pages = { A, B, C, D };
for (let pass = 0; pass < 3; pass++) for (const [n, p] of Object.entries(pages)) { const t = await T(p, () => { const me = GAME.test.CL.lobby.find(q => q.id === GAME.test.CL.ids.online); return me && me.team; }); if (t !== want[n]) { const id = await T(p, () => GAME.test.CL.ids.online); await T(A, i => GAME.test.act('move', i), id); await A.waitForTimeout(400); } }
const teamsOk = await until(A, ids => { const L = GAME.test.CL.lobby; return L.filter(q => q.team === 0).length === 2 && L.filter(q => q.team === 1).length === 2; });
const exact = []; for (const [n, p] of Object.entries(pages)) exact.push((await T(p, () => GAME.test.CL.lobby.find(q => q.id === GAME.test.CL.ids.online).team)) === want[n]);
ok(!!teamsOk && exact.every(Boolean), 'the host arranges the teams in the lobby: A+B Moss, C+D Russet', exact.join(','));
if (OUT) { await T(A, () => GAME.test.openMenu('room')); await A.screenshot({ path: OUT + '/2v2-lobby.png' }); }
for (const p of [B, C, D]) await T(p, () => { const me = GAME.test.CL.lobby.find(q => q.id === GAME.test.CL.ids.online); if (!me.ready) GAME.test.act('ready'); });
await until(A, () => GAME.test.CL.lobby.every(q => q.ready || q.id === GAME.test.CL.host));
await T(A, () => GAME.test.act('start'));
ok(!!(await until(D, () => GAME.test.CL.phase === 'live', null, 15000)), 'the 2v2 match starts for everyone');
// pick roles from the real teams: A shoots; C is an opponent of A; D is C's teammate; B is A's teammate
const teamOf = async p => T(p, () => GAME.test.CL.lobby.find(q => q.id === GAME.test.CL.ids.online).team);
const tA = await teamOf(A), all = [B, C, D], foesOfA = [], matesOfA = [];
for (const p of all) ((await teamOf(p)) === tA ? matesOfA : foesOfA).push(p);
const [C2, D2] = foesOfA, B2 = matesOfA[0];
await T(C2, () => GAME.test.tp(70, 74, Math.PI, 0)); await T(D2, () => GAME.test.tp(82, 60, Math.PI, 0)); await T(B2, () => GAME.test.tp(60, 112, 0, 0)); await T(A, () => GAME.test.tp(70, 100, 0, 0)); await A.waitForTimeout(800);
const cId = await T(C2, () => GAME.test.CL.ids.online);
const tgt = await T(A, id => { const q = GAME.test.CL.players.get(id).buf.slice(-1)[0]; return [q[1], q[2] + 1.62, q[3]]; }, cId);
await T(A, t => { GAME.test.aimAt(...t, 1); GAME.test.startDraw(); }, tgt); await until(A, () => GAME.test.ME.drawT >= 1, null, 8000);  await T(A, t => { GAME.test.aimAt(...t, 1); GAME.test.release(); }, tgt);
const fin = await until(C2, () => GAME.test.ME.cam === 'finisher' && GAME.test.ME.cam, null, 6000);
ok(fin === 'finisher', 'the eliminated archer sees their finisher', fin);
const spec = await until(C2, () => GAME.test.ME.cam === 'spectate' && GAME.test.ME.specId, null, 8000);
const dId = await T(D2, () => GAME.test.CL.ids.online);
ok(spec && spec === dId, 'after the finisher they spectate their surviving teammate', spec + ' / ' + dId);
const stillLive = await T(A, () => GAME.test.CL.phase === 'live');
ok(stillLive, 'the round goes on: the others keep playing');
// the survivors keep control: D moves and B moves
const d0 = await T(D2, () => GAME.test.pos()); await T(D2, () => { GAME.test.IN.keys.KeyW = true; }); await D2.waitForTimeout(1200); await T(D2, () => { GAME.test.IN.keys.KeyW = false; }); const d1 = await T(D2, () => GAME.test.pos());
ok(Math.hypot(d1.x - d0.x, d1.z - d0.z) > 2, 'the surviving teammate still moves (and the spectator sees it)', (Math.hypot(d1.x - d0.x, d1.z - d0.z)).toFixed(1) + ' m');
const seenByC = await until(C2, () => { const d = GAME.test.CL.players.get(GAME.test.ME.specId); return d && d.vis && d.vis.z; }, null, 4000);
ok(!!seenByC, 'the spectator follows the teammate on screen');
if (OUT) await C2.screenshot({ path: OUT + '/2v2-spectate.png', timeout: 120000 });
// finish the round: A shoots D
await T(A, () => GAME.test.tp(78, 74, 0, 0)); await A.waitForTimeout(400);
const dIdA = dId; const tgtD2 = await T(A, id => { const q = GAME.test.CL.players.get(id).buf.slice(-1)[0]; return [q[1], q[2] + 1.62, q[3]]; }, dIdA);
await T(A, t => { GAME.test.aimAt(...t, 1); GAME.test.startDraw(); }, tgtD2); await until(A, () => GAME.test.ME.drawT >= 1, null, 8000); await T(A, t => { GAME.test.aimAt(...t, 1); GAME.test.release(); }, tgtD2);
const r1 = await until(B2, () => GAME.test.CL.lastRound && GAME.test.CL.lastRound, null, 8000);
ok(r1 && r1.winner === tA && r1.reason === 'elim', 'both opponents down: the shooter\'s team wins the round', r1 && r1.score.join('-'));
ok(errs.length === 0, 'no errors in four browsers', JSON.stringify(errs.slice(0, 3)));
console.log(fails ? fails + ' FAILED' : 'ALL OK'); await b.close();
