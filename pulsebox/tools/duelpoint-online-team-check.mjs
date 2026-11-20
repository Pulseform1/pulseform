// Duelpoint online team play, two real players through the room relay: a ranked party (ranks travel with the seats), the
// charge carrier the same on both screens, passed from one player to the other by dropping it, a gun dropped by one and
// picked up by the other, and a gun bought for a teammate.
//   node tools/duelpoint-online-team-check.mjs <shots>
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2] || '.', URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--proxy-server=' + process.env.HTTPS_PROXY] });
const errs = [], ok = (c, n, x = '') => { console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : '')); if (!c) process.exitCode = 1; };
async function open(tag) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(tag + ': ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.addInitScript(() => { Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {}; try { localStorage.setItem('pbx-mp-name', 'Q' + Math.floor(Math.random() * 90 + 10)); } catch (e) {} });
  await p.goto(URL0, { timeout: 120000 }); await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 90000 }); await p.waitForTimeout(600);
  await p.click('#bPlay'); await p.waitForTimeout(900); return p;
}
const T = (p, fn, a) => p.evaluate(fn, a), wait = ms => new Promise(r => setTimeout(r, ms));
const H = await open('host'), C = await open('friend');
await T(H, () => { const R = GAME.test.ranked(); R.STATS.ranked = { 2: { rv: 1240, mmr: 1300, n: 9, w: 6, peak: 1240 } }; GAME.test.openParty(); MP.create(); }); await H.waitForFunction(() => MP.online(), null, { timeout: 20000 }); const code = await T(H, () => MP.code);
await T(C, c => { const R = GAME.test.ranked(); R.STATS.ranked = { 2: { rv: 610, mmr: 650, n: 7, w: 3, peak: 640 } }; GAME.test.openParty(); MP.join(c); }, code); await C.waitForFunction(() => MP.online(), null, { timeout: 20000 });
await wait(2000);
await T(H, () => { const t = GAME.test, id = MP.players().find(p => p.id !== MP.id).id; t.PARTY.set.ranked = true; t.PARTY.set.size = 2; t.PARTY.teams[id] = 0; MP.send({ t: 'lteam', teams: t.PARTY.teams, set: t.PARTY.set }); });
await T(C, () => { GAME.test.PARTY.ready = true; }); await wait(1500);
let r = await T(C, () => { const t = GAME.test, me = MP.id, hp = t.PARTY.prof.get(MP.hostId) || {}; return { ranked: t.PARTY.set.ranked, hostRk: (hp.rk || {})['2'], placed: hp.rkp }; });
ok(r.ranked && r.hostRk === 1240 && r.placed === '0100', 'the host makes the party ranked; the friend sees it, and the host\'s 2v2 rank', JSON.stringify(r));
await H.screenshot({ path: O + '/online-ranked-party.png' });
await T(H, () => { MP.start(); }); await wait(3500);
const st = p => T(p, () => { const t = GAME.test, M = t.M; return M && { ranked: M.ranked, size: M.size, n: M.fs.length, keys: M.fs.map(f => f.key).sort().join(','), carrier: M.charge && M.charge.k, rks: M.fs.filter(f => !f.isBot && !f.bot).map(f => f.rk).sort() }; });
let hs = await st(H), cs = await st(C);
ok(hs && cs && hs.ranked && cs.ranked && hs.n === 4 && hs.keys === cs.keys, 'a ranked 2v2 starts on both screens with the same four fighters', JSON.stringify({ hs, cs }));
ok(JSON.stringify(hs.rks) === JSON.stringify([1240, 610]) || JSON.stringify(cs.rks) === JSON.stringify([1240, 610]), 'each player\'s rank rides their seat into the match', JSON.stringify({ h: hs.rks, c: cs.rks }));
// make our team attack (both screens alike), clear the loading screen, and look at the charge
for (const p of [H, C]) await T(p, () => { const t = GAME.test, M = t.M; M.allIn = true; M.att0 = 0; t.team().startRound(1); M.loading = false; M.t = 12; t.UI.armory = false; });
await wait(800); hs = await st(H); cs = await st(C);
ok(hs.carrier && hs.carrier === cs.carrier, 'both screens agree who carries the charge', `${hs.carrier} / ${cs.carrier}`);
// the host drops the charge (H) and the friend walks over it: both screens say the friend has it
const hostKey = await T(H, () => GAME.test.M.fs[0].key), friendKey = await T(C, () => GAME.test.M.fs[0].key);
await T(H, hk => { const t = GAME.test, M = t.M, P = M.fs[0]; if (M.charge.k !== P.key) t.team().giveCharge(P, P); }, hostKey); await wait(800);
await T(H, () => { const t = GAME.test, P = t.M.fs[0]; t.team().dropCharge(P); }); await wait(900);
r = await T(C, () => { const M = GAME.test.M; return M.charge && { k: M.charge.k, x: M.charge.x, z: M.charge.z }; });
ok(r && r.k === '' && r.x > 0, 'the host drops the charge: the friend sees it on the floor', JSON.stringify(r));
await T(C, () => { const t = GAME.test, M = t.M, P = M.fs[0]; P.x = M.charge.x; P.z = M.charge.z; P.y = M.charge.y; }); await wait(1200);
hs = await st(H); cs = await st(C);
ok(hs.carrier === friendKey && cs.carrier === friendKey, 'the friend walks over it and picks it up, on both screens', `${hs.carrier} / ${cs.carrier} (friend ${friendKey})`);
// a gun: the host buys one and drops it (T); the friend sees it on the floor and picks it up; the host sees that
await T(C, () => { const P = GAME.test.M.fs[0]; P.x -= 6; }); await wait(600);   // step away, so the friend is not standing where it lands
const hd = await T(H, () => { const t = GAME.test, M = t.M, P = M.fs[0]; P.credits = 9000; const b1 = t.buy('vesper'), g1 = P.guns[1], d1 = t.team().dropHeld(P); return { b1, g1, d1, phase: M.phase, t: M.t, load: t.loadingNow(), loot: M.loot.map(d => d.k), online: MP.online(), alive: P.alive }; }); await wait(1000);
r = await T(C, () => GAME.test.M.loot.map(d => d.k)); r = { c: r, host: hd };
ok(r.c.includes('vesper'), 'the host drops a gun: it lies on the floor on the friend\'s screen', JSON.stringify(r));
await T(C, () => { const t = GAME.test, M = t.M, P = M.fs[0], d = M.loot.find(q => q.k === 'vesper'); P.guns[1] = null; P.x = d.x; P.z = d.z; P.y = d.y; }); await wait(1200);
r = { c: await T(C, () => ({ gun: GAME.test.M.fs[0].guns[1], floor: GAME.test.M.loot.length })), h: await T(H, fk => ({ floor: GAME.test.M.loot.length, friendGun: GAME.test.M.byKey[fk].guns[1] }), friendKey) };
ok(r.c.gun === 'vesper' && r.c.floor === 0 && r.h.floor === 0 && r.h.friendGun === 'vesper', 'the friend picks it up; it is gone from the host\'s floor too', JSON.stringify(r));
await C.waitForTimeout(400); await C.screenshot({ path: O + '/online-friend.png' });
console.log('ERRORS', JSON.stringify(errs)); await b.close();
