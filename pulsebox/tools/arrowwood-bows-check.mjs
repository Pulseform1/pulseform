// ARROWWOOD: buying and equipping bows, and their finishers in a real 2v2.
//   node arrowwood/server/node-server.js --dev &   then   node tools/arrowwood-bows-check.mjs [base URL]
// 1) Two players earn coins (the dev server's test grant), buy Cashout and The Yardstick in the shop and equip them.
// 2) A reload keeps the bow owned and equipped (the server keeps it, keyed to the player's private key).
// 3) In a 2v2, Cashout lands a final hit: the victim's camera pulls into the third-person Cashout finisher, their
//    teammate sees it happen in the world and keeps playing. Then The Yardstick does the same the other way.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'http://localhost:8790';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let fails = 0; const ok = (c, name, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : '')); };
const errs = [], ctxs = {};
const T = (p, fn, a) => p.evaluate(fn, a);
const until = async (p, fn, a, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await T(p, fn, a); if (r) return r; await p.waitForTimeout(150); } return null; };
async function session(name, url, ctx) {
  ctx = ctx || await b.newContext({ viewport: { width: 1000, height: 560 } }); ctxs[name] = ctx; const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(name + ': ' + m.text().slice(0, 200)); });
  await p.goto(url); await p.waitForTimeout(600); await p.click('#bPlay'); await until(p, () => GAME.test.ready, null, 30000); await until(p, () => GAME.test.PROFILE.loaded);
  return p;
}
const q = '&dev&norender&nolock', url = BASE + '/games/arrowwood.html?' + q.slice(1);
const A = await session('A', url), D = await session('D', url);
const grant = p => T(p, async () => (await fetch(GAME.test.SERVER.http + '/api/arrowwood/devgrant', { headers: { 'x-aw-key': GAME.test.KEY } })).json());
await grant(A); await grant(A); await grant(D); await grant(D);
const buy = async (p, bow) => { await T(p, () => GAME.test.act('shop')); await p.waitForTimeout(300); await T(p, b => GAME.test.act('pickBow', b), bow); const c0 = await T(p, async () => (await (await fetch(GAME.test.SERVER.http + '/api/arrowwood/profile', { headers: { 'x-aw-key': GAME.test.KEY } })).json()).coins); await T(p, () => GAME.test.act('buy')); return { got: await until(p, b => GAME.test.PROFILE.owned.includes(b) && GAME.test.PROFILE.equipped === b && GAME.test.PROFILE.coins, bow), c0 }; };
const ba = await buy(A, 'cashout'), bd = await buy(D, 'yardstick');
const priceOf = b => T(A, id => GAME.test.W.BOWS.find(q => q.id === id).price, b), pC = await priceOf('cashout'), pY = await priceOf('yardstick');
ok(ba.got && ba.c0 - ba.got === pC, `Cashout bought for ${pC} coins and equipped`, `${ba.c0} -> ${ba.got}`);
ok(bd.got && bd.c0 - bd.got === pY, `The Yardstick bought for ${pY} coins and equipped`, `${bd.c0} -> ${bd.got}`);
// the grid: every bow, cheapest first, five to a row, each with a picture, a name and a price
await T(A, () => GAME.test.act('shopGrid')); await A.waitForTimeout(400);
const grid = await T(A, () => { const cards = [...document.querySelectorAll('#awBowGrid .bowc')], g = document.getElementById('awBowGrid'), cols = getComputedStyle(g).gridTemplateColumns.split(' ').length; return { n: cards.length, cols, ids: cards.map(c => c.dataset.v), imgs: cards.every(c => c.querySelector('img')) }; });
const sorted = await T(A, ids => ids.map(id => GAME.test.W.BOWS.find(b => b.id === id).price).every((p, i, a) => !i || a[i - 1] <= p), grid.ids);
ok(grid.n === 34 && grid.cols === 5 && grid.imgs && sorted, 'the shop grid shows all 34 bows, five to a row, cheapest first, each with a picture', `${grid.n} bows, ${grid.cols} per row`);
for (let i = 0; i < 40 && !(await T(A, () => Object.keys(GAME.test.UI.thumbs || {}).length >= 34)); i++) await A.waitForTimeout(250);
ok(await T(A, () => [...document.querySelectorAll('#awBowGrid img')].every(i => i.src.startsWith('data:image/png'))), 'every card has its bow\'s picture');
await T(A, () => GAME.test.act('pickBow', 'cashout')); await A.waitForTimeout(400);
const shopShown = await T(A, () => !!document.querySelector('#aw canvas.prev') && /EQUIPPED/.test(document.getElementById('aw').textContent));
ok(shopShown, 'the shop shows the 3D preview, the price/balance and EQUIPPED');
// reload: the server still has it
await A.reload(); await A.waitForTimeout(500); await A.click('#bPlay'); await until(A, () => GAME.test.ready, null, 30000);
const after = await until(A, () => GAME.test.PROFILE.loaded && GAME.test.PROFILE);
ok(after && after.owned.includes('cashout') && after.equipped === 'cashout' && after.coins === ba.got, 'after a reload Cashout is still owned and equipped, coins unchanged', after && `${after.equipped}, ${after.coins}`);
await T(A, () => GAME.test.act('back'));
// the 2v2: A (Cashout) and B against C and D (Yardstick)
await T(A, () => { GAME.test.act('friends'); GAME.test.act('mode', '2v2'); GAME.test.act('create'); });
const code = await until(A, () => GAME.test.CL.ids.online && GAME.test.CL.code);
const B = await session('B', BASE + '/games/arrowwood.html?room=' + code + q), C = await session('C', BASE + '/games/arrowwood.html?room=' + code + q);
await T(D, c => GAME.test.connect(c, null), code); await until(A, () => GAME.test.CL.lobby.length === 4, null, 15000);
const P = { A, B, C, D }, teamOf = p => T(p, () => GAME.test.CL.lobby.find(q => q.id === GAME.test.CL.ids.online).team), idOf = p => T(p, () => GAME.test.CL.ids.online);
// A+B on one side, C+D on the other
for (let k = 0; k < 4; k++) { const ta = await teamOf(A); for (const [n, want] of [['B', 'same'], ['C', 'other'], ['D', 'other']]) { const t = await teamOf(P[n]); if ((want === 'same') !== (t === ta)) { const id = await idOf(P[n]); await T(A, i => GAME.test.act('move', i), id); await A.waitForTimeout(400); } } }
const okTeams = (await teamOf(A)) === (await teamOf(B)) && (await teamOf(C)) === (await teamOf(D)) && (await teamOf(A)) !== (await teamOf(C));
ok(okTeams, 'teams: A+B vs C+D');
const bowsInLobby = await until(B, () => GAME.test.CL.lobby.map(q => q.bow).sort().join(','), null, 3000);
ok(/cashout/.test(bowsInLobby) && /yardstick/.test(bowsInLobby), 'everyone sees which bow each archer carries', bowsInLobby);
for (const p of [B, C, D]) await T(p, () => { const me = GAME.test.CL.lobby.find(q => q.id === GAME.test.CL.ids.online); if (!me.ready) GAME.test.act('ready'); });
await until(A, () => GAME.test.CL.lobby.every(q => q.ready || q.id === GAME.test.CL.host)); await T(A, () => GAME.test.act('start'));
await until(D, () => GAME.test.CL.phase === 'live', null, 15000);
async function kill(shooter, victim, from, at) {
  await T(victim, a => GAME.test.tp(a[0], a[1], Math.PI, 0), at); await T(shooter, a => GAME.test.tp(a[0], a[1], 0, 0), from); await shooter.waitForTimeout(700);
  const vid = await idOf(victim), tgt = await T(shooter, id => { const q = GAME.test.CL.players.get(id).buf.slice(-1)[0]; return [q[1], q[2] + 1.62, q[3]]; }, vid);
  await until(shooter, () => GAME.test.ME.nockT === 0);
  await T(shooter, t => { GAME.test.aimAt(...t, 1); GAME.test.startDraw(); }, tgt); await until(shooter, () => GAME.test.ME.drawT >= 1, null, 8000); await T(shooter, t => { GAME.test.aimAt(...t, 1); GAME.test.release(); }, tgt);
  return until(victim, () => { const f = GAME.test.finishers().find(f => f.mine); return GAME.test.ME.cam === 'finisher' && f && f.kind; }, null, 8000);
}
// keep the bystanders out of the line of fire
await T(B, () => GAME.test.tp(40, 110, 0, 0)); await T(D, () => GAME.test.tp(100, 40, Math.PI, 0));
const k1 = await kill(A, C, [70, 100], [70, 74]);
ok(k1 === 'cashout', 'Cashout lands the last hit: the victim sees the Cashout finisher in third person', k1);
const dSees = await until(D, () => GAME.test.finishers().map(f => f.kind).join(','), null, 4000);
ok(/cashout/.test(dSees || ''), 'the victim\'s teammate sees the cash burst happen in the wood', dSees);
const dCan = await T(D, () => GAME.test.ME.alive && GAME.test.CL.phase === 'live');
ok(dCan, 'and the survivors keep fighting');
const k2 = await kill(D, A, [70, 100], [70, 74]);
ok(k2 === 'yardstick', 'The Yardstick lands a final hit: its victim sees the giant ruler finisher', k2);
const bSees = await until(B, () => GAME.test.finishers().map(f => f.kind).join(','), null, 4000);
ok(/yardstick/.test(bSees || '') && (await T(B, () => GAME.test.ME.alive && GAME.test.CL.phase === 'live')), 'B sees it in the world and plays on', bSees);
ok(errs.length === 0, 'no errors', JSON.stringify(errs.slice(0, 3)));
console.log(fails ? fails + ' FAILED' : 'ALL OK'); await b.close();
