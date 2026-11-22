// Runs Duelpoint's simulation parts (10 to 60) in Node, with no page and no renderer, and checks the rules the design asks for.
//   node tools/duelpoint-sim-test.mjs            every check
//   node tools/duelpoint-sim-test.mjs map        print the map with the attack routes (1-4) and hold spots (H)
//   node tools/duelpoint-sim-test.mjs matches N  only the bot matches, N of them (default 20)
//   node tools/duelpoint-sim-test.mjs copperleaf  only the checks on Copperleaf (three sites)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'games', 'duelpoint');
const parts = fs.readdirSync(dir).filter(f => /^[1-6]\d-.*\.js$/.test(f)).sort();
const code = parts.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
// what the simulation expects from the page: the kit's K and the room library MP
const K = { save: {}, persist() {}, bot: false, state: 'play' };
const MP = { online: () => false, isHost: () => true, send() {}, opts: {}, name: 'Tester', id: 0 };
const T = new Function('K', 'MP', code + `
  return { SRC, get GW() { return GW; }, get GH() { return GH; }, CS, findPath, pathLen, SPAWN, SITE, siteC, ROUTES, HOLDS, SITES, MAPS, mapPool, dailyStore, storeLeft, codeHash, ALL_SKINS_HASH, allSkinIds, LINES, skinOfId, skinPrice, skinSort, botSkins, matchCoins, readyAb, castReady, abData, hexShot, lensShot, duelOk, unready, canSee, castShot, viewDir, blocked, ARMOR, xpForLevel, levelOf, seasonNow, passRewards, myPass, passTier, passGrant, buyPremium, giveReward, dailyChallenges, weeklyChallenges, myChallenges, challengeProgress, matchTally, matchXp, payProgress, botCard, cardFrom, matchAwards, csOf, PASS_TIERS, PASS_XP, PASS_PRICE, TITLES, BANNERS, CH_DAILY, CH_WEEKLY, roundT, loadingNow, skipLoad, LOAD_T, BUY_T, hAt, hMove, rayGrid, walkLine, NAV, idx, GUNS, dmgAt, CASH, DIFF, D2R, SPD, WIN_ROUNDS, WHY, SPRINT, SLIDE_V, diffFor, STATS, MAPS, loadMap,
    seed, startMatch, tick, buy, fire, altAction, reload, spreadOf, patOf, moveErr, switchTo, giveAmmo, applyDamage, endRound, startRound, sideOf, me, foe, on, eyeY, yawTo, canSee, ability, onSite, areaAt,
    hitboxes, headOf, castShot, viewDir, BRKS, BRKX, setWall, lootAt, setCharge, ultCost, OPS, takeOrb, ORBS, hasAb, plantAt, ping, DEFUSE_T, sideOf: f => sideOf(f), netMsg, gunStats, dmgAt, HALF: () => HALF(), get WIN() { return WIN_ROUNDS; }, CFG, stepKits: dt => stepKits(dt), get M() { return M; }, setInput: fn => { readInput = fn; }, CH, siteAt };`)(K, MP);

let failed = 0;
const ok = (cond, name, extra = '') => { if (!cond) failed++; console.log((cond ? '  ok   ' : '  FAIL ') + name + (extra !== '' ? '  (' + extra + ')' : '')); };
const section = name => console.log('\n' + name);
const DT = 1 / 60, run = s => { for (let i = 0; i < Math.round(s / DT); i++) T.tick(DT); };
const idle = () => ({ mx: 0, mz: 0, walk: false, crouch: false, jump: false, use: false, fire: false });

function mapChecks() {
  section('map'); T.loadMap(0);
  ok(T.SRC.every(r => r.length === T.GW), 'every row is ' + T.GW + ' wide');
  ok(T.SPAWN.att.length >= 2 && T.SPAWN.def.length >= 2 && T.SITE.length >= 12, 'spawns and site exist', `att ${T.SPAWN.att.length}, def ${T.SPAWN.def.length}, site ${T.SITE.length}`);
  const a = T.SPAWN.att[0], d = T.SPAWN.def[0], s = T.siteC;
  for (const [name, pts] of Object.entries(T.ROUTES)) {
    let x = a[0], z = a[1], len = 0, good = true;
    for (const p of [...pts, s]) { const q = T.findPath(x, z, p[0], p[1]); if (!q.length) { good = false; break; } len += T.pathLen(q, x, z); x = p[0]; z = p[1]; }
    ok(good && len / 5.4 >= 6 && len / 5.4 <= 14, `route ${name} reaches the site in 6 to 14 s`, good ? `${len.toFixed(0)} m, ${(len / 5.4).toFixed(1)} s` : 'no path');
  }
  const dp = T.findPath(d[0], d[1], s[0], s[1]);
  ok(dp.length && T.pathLen(dp, d[0], d[1]) / 5.4 < 5, 'the defender reaches the site first', (T.pathLen(dp, d[0], d[1]) / 5.4).toFixed(1) + ' s');
  ok(T.findPath(d[0], d[1], 47, 27).length && Math.abs(T.hAt(47, 27) - 1.5) < .01, 'the dock is reachable by the stairs');
  ok(T.HOLDS.every(h => T.NAV[T.idx(Math.floor(h.p[0] / T.CS), Math.floor(h.p[1] / T.CS))]), 'every hold spot is standable');
  const sees = (p, q) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]); return T.rayGrid(p[0], 1.6, p[1], (q[0] - p[0]) / L, 0, (q[1] - p[1]) / L, 200) >= L - .5; };
  ok(!T.SPAWN.att.some(p => T.SITE.some(q => sees(p, q)) || T.SPAWN.def.some(q => sees(p, q))), 'no attacker spawn can see the site or the defender spawn');
  ok(Math.abs(T.rayGrid(3, 1.6, 13, 1, 0, 0, 100) - 7) < .01, 'a level ray from the Gate stops at the Gate wall');
  ok(T.rayGrid(20, 1.6, 6, 0, 0, -1, 100) === 100, 'a ray over the sea wall flies out to sea');
  ok(T.rayGrid(20, 1, 6, 0, 0, -1, 100) < 5, 'a low ray hits the sea wall');
  ok(Math.abs(T.rayGrid(25, 1.6, 37, 0, 1, 0, 100) - 1.2) < .01, 'a ray straight up in the Tunnel hits the roof');
  ok(Math.abs(T.rayGrid(14, 1.6, 21, .6, -.8, 0, 100) - 2) < .01, 'a ray aimed down hits the ground');
}

// a quiet match to measure in: you against a bot that is parked far away, in the live phase
function lab(gunKey) {
  T.seed(7); T.startMatch({ mode: 'bot', diff: 0, map: 0 }); T.skipLoad(); const M = T.M, P = T.me(), F = T.foe();
  F.bot = { diff: 0, dummy: true, home: [61, 41] }; Object.assign(F, { x: 61, z: 41 }); P.credits = 9000;
  if (gunKey) T.buy(P, gunKey); M.phase = 'live'; M.t = 80; Object.assign(P, { x: 40, z: 3, yaw: 0, pitch: 0 });   // on the Pier, facing the sea, with open ground to the east
  return [M, P, F];
}
function gunplayChecks() {
  section('gunplay');
  const deg = () => T.spreadOf(T.me()) / T.D2R; let I = idle(); T.setInput(() => I);
  let [M, P] = lab('lancer'); run(.3);
  ok(deg() <= .3, 'a rifle standing still is accurate to a fraction of a degree', deg().toFixed(2) + '°');
  I = { ...idle(), mx: 1 }; run(.7); const runErr = deg();
  ok(runErr >= 5, 'running throws a rifle off by 5° or more', runErr.toFixed(2) + '°');
  const settle = input => { [M, P] = lab('lancer'); I = { ...idle(), mx: 1 }; run(.7); I = input; let t = 0; while (deg() > .3 && t < 1) { T.tick(DT); t += DT; } return Math.round(t * 1000); };
  const letGo = settle(idle()), counter = settle({ ...idle(), mx: -1 });
  ok(counter < letGo && counter <= 70, 'a counter-strafe is accurate again sooner than letting go', `${counter} ms against ${letGo} ms`);
  { // a quick counter-strafe tap stops you dead; holding the key carries you straight on the other way, with no pause at zero
    [M, P] = lab('lancer'); I = { ...idle(), mx: 1 }; run(.7);
    const right = () => P.vx * Math.cos(P.yaw) - P.vz * Math.sin(P.yaw), v0 = right(); let back = 0, t = 0, stopMs = -1;
    I = { ...idle(), mx: -1 };
    for (; t < .08; t += DT) { T.tick(DT); back = Math.min(back, right()); if (stopMs < 0 && Math.abs(right()) < 1e-9) stopMs = Math.round(t * 1000); }
    I = idle(); for (let i = 0; i < 30; i++) { T.tick(DT); back = Math.min(back, right()); }
    ok(v0 > 5 && stopMs >= 0 && stopMs <= 80 && back > -.3 && Math.hypot(P.vx, P.vz) < .01, 'a quick counter-strafe tap stops you dead', `from ${v0.toFixed(1)} m/s, still after ${stopMs} ms, worst backwards ${(-back).toFixed(2)} m/s`);
    [M, P] = lab('lancer'); I = { ...idle(), mx: 1 }; run(.7); I = { ...idle(), mx: -1 }; let still = 0, to80 = -1;
    for (t = 0; t < .5; t += DT) { T.tick(DT); if (Math.abs(right()) < .05) still += DT; if (to80 < 0 && right() < -.8 * 5.4) to80 = t; }
    ok(still <= .034 && to80 > 0 && to80 <= .2, 'holding the other key turns you round with no pause at zero', `${Math.round(still * 1000)} ms at zero, 80% speed the other way after ${Math.round(to80 * 1000)} ms`);
    [M, P] = lab('lancer'); let sum = 0, n = 0; for (let k = 0; k < 10; k++) { I = { ...idle(), mx: k % 2 ? -1 : 1 }; for (let i = 0; i < 18; i++) { T.tick(DT); sum += Math.abs(right()); n++; } }
    ok(sum / n >= 3, 'strafing side to side (A-D-A-D every 300 ms) keeps its speed', (sum / n).toFixed(1) + ' m/s on average'); }
  [M, P] = lab('lancer'); I = { ...idle(), mx: .5 }; run(.7);
  ok(deg() > .3 && deg() < runErr * .6, 'walking is in between', deg().toFixed(2) + '°');
  [M, P] = lab('lancer'); I = { ...idle(), jump: true }; run(.2);
  ok(deg() >= 9, 'jumping is hopeless', deg().toFixed(1) + '°');
  [M, P] = lab('lancer'); I = { ...idle(), fire: true }; const climb = []; let t0 = 0; while (climb.length < 12) { T.tick(DT); t0 += DT; if (P.stat.shots > climb.length) climb.push(T.patOf(P, T.GUNS.lancer)[1] / T.D2R); }
  ok(Math.abs(t0 - 11 * 60 / 585) < .04, 'the fire rate is exact', `12 shots in ${t0.toFixed(3)} s, ${(11 * 60 / t0).toFixed(0)} a minute`);
  ok(climb[1] < climb[4] && climb[4] < climb[8] && Math.abs(climb[11] - T.GUNS.lancer.pat.vmax) < .01, 'a spray climbs to its ceiling', climb.map(v => v.toFixed(1)).join(' '));
  ok(deg() > 2, 'and gets wide', deg().toFixed(2) + '°');
  I = idle(); run(.6);
  const settled = P.spray === 0 && deg() <= .3, settledMsg = `spray ${P.spray.toFixed(2)}, ${deg().toFixed(2)}°, fireT ${P.fireT.toFixed(2)}, shots ${P.stat.shots}`;
  // the machine gun: 60 rounds, steady for ten shots, then a much steeper climb
  { const G = T.GUNS.torrent, f = { spray: 0, sseed: 0 }, at = n => (f.spray = n, T.patOf(f, G)[1] / T.D2R), early = at(10) - at(5), late = at(15) - at(10);
    ok(G.mag === 60 && G.res === 120, 'the Torrent holds 60 rounds', `${G.mag} + ${G.res}`);
    ok(late > early * 2.5, 'and climbs far harder after its tenth shot', `shots 5-10 +${early.toFixed(2)}°, 10-15 +${late.toFixed(2)}°`); }
  // the 2900 rifles: the Vesper sprays (gentle climb, tight early shots), the Lancer taps (pin-point first shot, harder climb)
  { const V = T.GUNS.vesper, L = T.GUNS.lancer, up = (G, n) => T.patOf({ spray: n, sseed: 0 }, G)[1] / T.D2R;
    ok(V.acc.free >= 2 && up(V, 2) === 0 && up(V, 8) < up(L, 8), 'the Vesper\'s first shots do not climb and its spray stays lower', `Vesper ${up(V, 8).toFixed(2)}° at shot 8, Lancer ${up(L, 8).toFixed(2)}°`);
    ok(L.acc.fs < V.acc.fs && L.dmg.length === 1, 'the Lancer\'s first shot is the more precise, with no fall-off', `${L.acc.fs}° against ${V.acc.fs}°`); }
  ok(settled, 'it settles within the recovery time once you let go', settledMsg);
  section('damage');
  const dmgTo = (gunKey, part, dist) => T.dmgAt(T.GUNS[gunKey], dist, part);
  ok(dmgTo('lancer', 1, 50) >= 150, 'a Lancer headshot kills through heavy shields at any range', dmgTo('lancer', 1, 50));
  ok(dmgTo('vesper', 1, 10) >= 150 && dmgTo('vesper', 1, 40) < 150, 'the Vesper only does so up close', `${dmgTo('vesper', 1, 10)} then ${dmgTo('vesper', 1, 40)}`);
  ok(Object.values(T.GUNS).every(G => G.head > 1 && G.legs <= 1 && G.dmg.every(r => r[1] > 0)), 'every gun multiplies head damage up and leg damage down');
  ok(dmgTo('lancer', 1, 20) === 4 * dmgTo('lancer', 2, 20) && dmgTo('kite', 1, 20) === 2 * dmgTo('kite', 2, 20), 'head multipliers: rifle x4, sniper x2', `${dmgTo('lancer', 1, 20)}/${dmgTo('lancer', 2, 20)}`);
  let F; [M, P, F] = lab(); F.sh = 50; T.applyDamage(F, 40, P, false, 'lancer');
  ok(F.hp === 100 && F.sh === 10, 'shields soak damage first', `hp ${F.hp}, shield ${F.sh}`);
  T.applyDamage(F, 160, P, true, 'lancer');
  ok(!F.alive && P.stat.k === 1 && P.stat.hs === 1 && P.credits === 9000, 'a kill is counted and paid (capped at 9000)');
  section('knife');
  const stab = (heavy, fromBehind) => { [M, P, F] = lab(); P.yaw = T.yawTo(40, 3, 60, 3); Object.assign(F, { x: 41.6, z: 3, yaw: fromBehind ? P.yaw : P.yaw + Math.PI }); P.pitch = -.4; T.switchTo(P, 3); P.fireT = 0; if (heavy) T.altAction(P); else T.fire(P); return 100 - F.hp; };
  ok(stab(false, false) === 50, 'a slash to the body does 50'); ok(stab(true, false) === 75, 'a stab does 75'); ok(stab(true, true) === 100 && !F.alive, 'a stab in the back kills');
  [M, P, F] = lab(); P.yaw = T.yawTo(40, 3, 60, 3); Object.assign(F, { x: 44, z: 3 }); T.switchTo(P, 3); P.fireT = 0; T.fire(P); ok(F.hp === 100, 'it does not reach 4 m');
  section('money');
  [M, P, F] = lab(); P.credits = 800; F.credits = 800; M.phase = 'buy';
  ok(T.buy(P, 'hammer') && P.credits === 0 && P.guns[2] === 'hammer', 'buying takes the money and gives the gun');
  ok(T.buy(P, 'quill') && P.credits === 300 && P.guns[2] === 'quill', 'buying another in the same slot refunds the first');
  ok(T.buy(P, 'quill') && P.credits === 800 && P.guns[2] === 'pip', 'choosing it again sells it back');
  ok(!T.buy(P, 'lancer') && P.credits === 800, 'you cannot buy what you cannot afford');
  ok(T.buy(P, 'smoke') && T.buy(P, 'smoke') && P.smokes === 2 && P.credits === 400 && !T.buy(P, 'nothing'), 'smoke grenades cost 200 each, two at most');
  ok(T.buy(P, 'smoke') && P.smokes === 1 && P.credits === 600, 'pressing smoke with two in hand sells one back');
  M.phase = 'live'; T.endRound(0, 'elim_def'); ok(P.credits === 600 + 3200 && F.credits === 800 + 2100, 'win +3200, first loss +2100', P.credits + ' ' + F.credits);
  M.phase = 'live'; T.endRound(0, 'elim_def'); M.phase = 'live'; T.endRound(0, 'elim_def'); ok(F.credits === 800 + 2100 + 2600 + 3000, 'losses pay 2100, 2600, then 3000');
  P.alive = true; T.startRound(5); ok(P.credits === 800 && P.guns[2] === 'pip' && !P.guns[1], 'round 5 is a pistol round: everyone back to 800 and a pistol');
  ok(F.lossRun === 0, 'the loss bonus starts again at the half', 'loss run ' + F.lossRun); M.phase = 'live'; T.endRound(0, 'elim_def'); ok(F.credits === 800 + 2100, 'so losing the second pistol round pays 2100, not 3000', F.credits);
}

// whole matches, bot against bot, watching for errors, fighters that stop moving, and rounds that never end
// a standing first shot: every pistol, SMG and rifle puts it on a head (radius .18) at 30 metres nearly every time; letting go
// of the keys leaves you accurate in well under a fifth of a second
function firstShotChecks() {
  section('first-shot accuracy');
  const head30 = Math.atan(.18 / 30) / T.D2R, odds = fs => Math.min(1, (head30 / Math.max(1e-6, fs)) ** 2);
  const gs = Object.values(T.GUNS).filter(G => ['Sidearm', 'SMG', 'Rifle'].includes(G.cat) && !G.pel), low = gs.filter(G => odds(G.acc.fs) < .85);
  ok(gs.length >= 10 && !low.length, 'a standing first shot from any pistol, SMG or rifle lands on a head at 30 m at least 85% of the time', low.map(G => G.k + ' ' + Math.round(100 * odds(G.acc.fs)) + '%').join(', ') || gs.map(G => G.k + ' ' + Math.round(100 * odds(G.acc.fs)) + '%').join(' '));
  ok(odds(T.GUNS.torrent.acc.fs) >= .5 && T.GUNS.paladin.acc.fs <= .06 && T.GUNS.lancer.acc.fs < T.GUNS.vesper.acc.fs, 'the heavy gun\'s first shot is fair at range; the tap rifles are pin-point');
  let I = idle(); T.setInput(() => I); let [M, P] = lab('vesper'); I = Object.assign({}, I, { mx: 1 }); run(1.2); const v0 = Math.hypot(P.vx, P.vz); I = Object.assign({}, I, { mx: 0 }); let t = 0; while (T.spreadOf(P) / T.D2R > T.GUNS.vesper.acc.fs + 1e-6 && t < 1) { run(1 / 60); t += 1 / 60; }
  ok(v0 > 5 && t > 0 && t <= .125, 'let go of the keys at a run and you are accurate again within 125 ms', Math.round(t * 1000) + ' ms from ' + v0.toFixed(1) + ' m/s');
}
function moveChecks() {
  section('no sprint: the knife is the quick way round; slides, adaptive bots');
  let I = idle(); T.setInput(() => I);
  let [M, P] = lab('lancer'); P.yaw = -Math.PI / 2; P.fireT = -1; I = { ...idle(), mz: 1 }; run(.8); const rifV = Math.hypot(P.vx, P.vz);
  [M, P] = lab('lancer'); P.yaw = -Math.PI / 2; P.fireT = -1; I = { ...idle(), mz: 1, sprint: true }; run(.8); const oldV = Math.hypot(P.vx, P.vz);
  ok(!P.sprinting && Math.abs(oldV - rifV) < .05, 'there is no sprint: the old sprint key changes nothing', `${rifV.toFixed(2)} vs ${oldV.toFixed(2)} m/s`);
  [M, P] = lab(); T.switchTo(P, 3); P.yaw = -Math.PI / 2; P.fireT = -1; I = { ...idle(), mz: 1 }; run(.8); const knV = Math.hypot(P.vx, P.vz);
  ok(T.GUNS[P.guns[3]].melee && knV > rifV * 1.22, 'with the knife out you move a good deal faster than with a rifle', `${rifV.toFixed(1)} → ${knV.toFixed(1)} m/s`);
  I = { ...idle(), mz: 1, crouch: true }; T.tick(DT); T.tick(DT); const slV = Math.hypot(P.vx, P.vz);
  ok(P.slide && slV > knV, 'crouching while running with the knife starts a slide that is faster still', slV.toFixed(1) + ' m/s');
  run(.4); ok(P.slide && Math.hypot(P.vx, P.vz) < slV, 'the slide bleeds off speed', Math.hypot(P.vx, P.vz).toFixed(1) + ' m/s');
  run(1); ok(!P.slide && P.crouch > .5, 'it ends in a crouch if you keep holding crouch');
  [M, P] = lab(); T.switchTo(P, 3); P.yaw = -Math.PI / 2; P.fireT = -1; I = { ...idle(), mz: 1 }; run(.6); I = { ...idle(), mz: 1, crouch: true }; run(.15);
  I = { ...idle(), mz: 1, jump: true }; T.tick(DT); ok(!P.slide && P.vy > 0, 'you can jump out of a slide');
  [M, P] = lab('lancer'); P.yaw = -Math.PI / 2; P.fireT = -1; I = { ...idle(), mz: 1 }; run(.6); I = { ...idle(), mz: 1, crouch: true }; T.tick(DT); T.tick(DT); ok(!P.slide, 'running with a rifle is too slow to slide: you just crouch');
  knifeWallChecks();
  pickupPingNovaChecks();
  tagDefusePingChecks();
  firstToNovaSlideChecks();
  armoryStatChecks();
  const lv = [600, 900, 1100, 1400, 1700].map(r => T.diffFor(r)), keys = ['react', 'err', 'flick'];
  ok(lv.every((L, i) => !i || keys.every(k => L.D[k] <= lv[i - 1].D[k]) && L.D.turn >= lv[i - 1].D.turn), 'the bot gets sharper at every step up in rating', lv.map(L => L.D.n).join(' → '));
  T.STATS.rating = 1500; T.seed(3); T.startMatch({ mode: 'bot', diff: 'auto', map: 0 }); ok(T.foe().bot.D && T.foe().bot.diff >= 2, 'an AUTO match builds its bot from your rating', T.foe().bot.D.n);
}
// the knife against a breakable wall: a pace from it, facing it, a few swings and it gives way
function knifeWallChecks() {
  let mi = -1; for (let i = 0; i < T.MAPS.length && mi < 0; i++) { T.seed(5); T.startMatch({ mode: 'bot', diff: 0, map: i }); T.skipLoad(); if (T.BRKS.length) mi = i; }
  if (mi < 0) { ok(false, 'a map with a breakable wall to test the knife on'); return; }
  const M = T.M, P = T.me(), F = T.foe(); F.bot = { diff: 0, dummy: true, home: [F.x, F.z] }; M.phase = 'live'; M.t = 80; T.setInput(() => idle());
  const B = T.BRKS[0]; let placed = false;
  for (const q of B.cells) { const gx = q % T.GW, gz = Math.floor(q / T.GW); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = T.idx(gx + dx, gz + dz); if (nk < 0 || T.BRKX[nk] >= 0) continue;
    const x = (gx + dx + .5) * T.CS, z = (gz + dz + .5) * T.CS, wx = (gx + .5) * T.CS, wz = (gz + .5) * T.CS; Object.assign(P, { x, z, y: T.hAt(x, z), vx: 0, vz: 0, pitch: 0, yaw: T.yawTo(x, z, wx, wz) });
    const S = T.castShot(P, T.viewDir(P.yaw, 0)), e = S.end, k = T.idx(Math.floor((e[0] + S.d[0] * .06) / T.CS), Math.floor((e[2] + S.d[2] * .06) / T.CS)); if (!S.hit && S.dist < 2 && k >= 0 && T.BRKX[k] === 0) { placed = true; break; } } if (placed) break; }
  ok(placed, 'stood a pace from a breakable wall (' + T.MAPS[mi].n + '), facing it'); if (!placed) return;
  T.switchTo(P, 3); const hp0 = B.hp; P.fireT = -1; T.fire(P);
  ok(hp0 - B.hp >= 60, 'one knife swing takes a real chunk out of the wall', `${hp0} → ${B.hp}`);
  let n = 1; while (B.hp > 0 && n < 30) { P.fireT = -1; T.fire(P); n++; }
  ok(B.hp <= 0 && n <= 8, 'keep swinging and the wall gives way', n + ' swings');
  // looking a little down (as you do walking up to it), or a little up: the swing still lands on the wall, not the floor
  for (const pitch of [-.35, .3]) { T.setWall(0, true); const h0 = B.hp; P.pitch = pitch; P.fireT = -1; T.fire(P); ok(h0 - B.hp >= 60, `a swing looking ${pitch < 0 ? 'down' : 'up'} at it (${pitch} rad) still cuts the wall`, `${h0} → ${B.hp}`); }
  P.pitch = 0;
}
// a rifle on the floor: look at it in reach and press F; the charge going down pings the attackers; Nova's kills give a Surge back
function pickupPingNovaChecks() {
  let I = idle(); T.setInput(() => I);
  let [M, P, F] = lab('lancer'); P.yaw = -Math.PI / 2; I = idle(); T.tick(DT);
  const d = T.lootAt(F, 'vesper', P.x + 2, P.z, 30, 60); T.tick(DT);
  ok(d && P.nearLoot && P.nearLoot.id === d.id && P.guns[1] === 'lancer', 'look at a rifle on the floor two metres off: it is offered (not taken)', d ? d.k : 'none');
  I = { ...idle(), use: true }; T.tick(DT); I = idle(); T.tick(DT);
  ok(P.guns[1] === 'vesper' && !M.loot.some(q => q.id === d.id), 'press F and it is yours', P.guns[1]);
  { const old = M.loot.find(q => q.k === 'lancer'); ok(old && Math.hypot(old.x - d.x, old.z - d.z) < .3, 'and the rifle you had goes on the floor right where that one lay', old ? `${old.k} at ${Math.hypot(old.x - d.x, old.z - d.z).toFixed(2)} m` : 'none'); }
  P.yaw = Math.PI / 2; const d2 = T.lootAt(F, 'mako', P.x + 2, P.z, 24, 48); T.tick(DT); ok(!P.nearLoot, 'a gun behind you is not offered', String(!!P.nearLoot));
  [M, P, F] = lab(); P.yaw = -Math.PI / 2; I = idle(); const d3 = T.lootAt(F, 'vesper', P.x, P.z, 30, 60); T.tick(DT); T.tick(DT);
  ok(P.guns[1] === 'vesper', 'walk over a rifle with your main slot empty and you just take it', String(P.guns[1]));
  // the round is decided: the survivor can still pick up what is lying about, and keeps it for the next round
  [M, P, F] = lab('lancer'); P.yaw = -Math.PI / 2; I = idle(); F.hp = 1; F.sh = 0; T.applyDamage(F, 50, P, false, 'lancer'); for (let i = 0; i < 3; i++) T.tick(DT);
  { const d4 = T.lootAt(F, 'vesper', P.x + 2, P.z, 30, 60); T.tick(DT);
    ok(M.phase === 'end' && P.nearLoot && P.nearLoot.id === d4.id, 'after the round is won, a rifle on the floor is still offered', `${M.phase} ${P.nearLoot ? P.nearLoot.k : 'none'}`);
    I = { ...idle(), use: true }; T.tick(DT); I = idle(); T.tick(DT);
    ok(P.guns[1] === 'vesper', 'press F and you take it, round over or not', String(P.guns[1]));
    let n = 0; while (M.phase === 'end' && n++ < 2000) T.tick(DT);
    ok(M.phase === 'buy' && P.guns[1] === 'vesper', 'and you start the next round with it', `${M.phase} ${P.guns[1]}`); }
  [M, P, F] = lab(); M.chargePing = null; T.setCharge(null, P.x + 5, P.z, false, P);
  ok(M.chargePing && Math.abs(M.chargePing.x - (P.x + 5)) < .01, 'the charge going down mid-round pings where it lies');
  [M, P, F] = lab('lancer'); P.op = 'nova'; P.ab.q = 0; F.hp = 1; F.sh = 0; T.applyDamage(F, 50, P, false, 'lancer');
  ok(!F.alive && P.ab.q === 1, 'Nova gets a Surge back for a kill', `q ${P.ab.q}`);
  [M, P, F] = lab('lancer'); P.op = 'nova'; P.ab.q = T.OPS.nova.q.max; F.hp = 1; F.sh = 0; T.applyDamage(F, 50, P, false, 'lancer');
  ok(P.ab.q === T.OPS.nova.q.max, 'but never more than she can carry', `q ${P.ab.q}`);
  [M, P, F] = lab('lancer'); P.op = 'vex'; P.ab.q = 0; F.hp = 1; F.sh = 0; T.applyDamage(F, 50, P, false, 'lancer'); ok(P.ab.q === 0, 'other operatives get no free charge');
}
// tagging (a hit slows you a moment), the halfway defuse checkpoint, and a ping for your team
function tagDefusePingChecks() {
  let I = idle(); T.setInput(() => I);
  let [M, P, F] = lab(); P.yaw = -Math.PI / 2; I = { ...idle(), mz: 1 }; run(.6); const v0 = Math.hypot(P.vx, P.vz);
  T.applyDamage(P, 20, F, false, 'longbow'); run(.12); const v1 = Math.hypot(P.vx, P.vz); run(.6); const v2 = Math.hypot(P.vx, P.vz);
  ok(v1 < v0 * .6 && v2 > v0 * .95, 'a hit tags you: slowed for a moment, then back to full speed', `${v0.toFixed(1)} → ${v1.toFixed(1)} → ${v2.toFixed(1)} m/s`);
  // the defuse: halfway is kept
  [M, P, F] = lab(); const def = T.sideOf(P) === 'def' ? P : F, att = def === P ? F : P; if (def !== P) { T.M.fs.forEach(f => { f.bot = f === P ? null : f.bot; }); }
  if (def === P) { T.plantAt(P.x + .5, P.z, att); M.planted.t = 60; I = { ...idle(), use: true }; run(T.DEFUSE_T * .62); const d1 = P.defuse; I = idle(); run(.2); I = { ...idle(), use: true }; T.tick(DT);
    ok(M.planted.half && P.defuse >= T.DEFUSE_T / 2, 'a defuse past halfway keeps its half when it is broken off', `${d1.toFixed(2)} s, then restarts at ${P.defuse.toFixed(2)} s`);
    [M, P, F] = lab(); T.plantAt(P.x + .5, P.z, att); M.planted.t = 60; I = { ...idle(), use: true }; run(T.DEFUSE_T * .3); I = idle(); run(.2); I = { ...idle(), use: true }; T.tick(DT);
    ok(!M.planted.half && P.defuse < .1, 'one let go before halfway starts again from nothing', P.defuse.toFixed(2)); }
  else ok(true, 'the defuse checkpoint (skipped: you attack on this map\'s first round)');
  // a ping marks where you look, for your team
  [M, P, F] = lab(); P.yaw = -Math.PI / 2; I = idle(); const pinged = T.ping(P);
  ok(pinged && M.pings.length === 1 && M.pings[0].team === P.team && M.pings[0].x > P.x, 'a ping marks the spot you are looking at, for your team', M.pings[0] ? `${M.pings[0].x.toFixed(1)}, ${M.pings[0].z.toFixed(1)}` : 'none');
  ok(!T.ping(P) && M.pings.length === 1, 'and pings cannot be spammed');
}
// matches are 'first to N' and attackers and defenders swap at the half; Nova's Surge comes back on a kill, offline and when
// the kill arrives from another device; a slide keeps your aim steadier than a run
function firstToNovaSlideChecks() {
  let I = idle(); T.setInput(() => I); const was = T.CFG.win;
  for (const w of [3, 4, 5, 6, 9, 11]) { T.CFG.win = w; T.seed(4); T.startMatch({ mode: 'bot', diff: 0, map: 0 }); T.skipLoad();
    const side = n => { T.startRound(n); return T.sideOf(T.me()); }, s1 = side(1), sHalf = side(w - 1), sNext = side(w);
    ok(T.WIN === w && T.HALF() === w - 1 && s1 === sHalf && sNext !== s1, `first to ${w}: you keep your side for ${w - 1} rounds, then attackers and defenders swap`, `${s1} … round ${w - 1} ${sHalf}, round ${w} ${sNext}`); }
  T.CFG.win = was;
  // Nova: online the kill is worked out on the victim's device; when word of it arrives, the killer's Surge comes back there too
  let [M, P, F] = lab('lancer'); P.op = 'nova'; P.ab.q = 0; M.online = true; F.net = true; F.alive = true; F.hp = 30;
  T.netMsg({ t: 'dead', f: F.key, by: P.key, h: 0, w: 'lancer' }); M.online = false; F.net = false;
  ok(!F.alive && P.ab.q === 1, 'online: Nova gets a Surge back when her kill is reported from the other device', `q ${P.ab.q}`);
  // a slide: steadier than running, not as steady as walking
  [M, P, F] = lab('lancer'); const G = T.GUNS.lancer; Object.assign(P, { vx: 9, vz: 0, ground: true, slide: null }); const run = T.moveErr(P, G); P.slide = { t: .3 }; const sl = T.moveErr(P, G);
  ok(sl < run * .7 && sl > G.acc.walk, 'sliding throws your aim less than running does', `run ${run.toFixed(2)}°, slide ${sl.toFixed(2)}°`);
}
// the armory's numbers: every gun has six bars between 0 and 1 and a damage table that agrees with the damage rules; and a
// teammate's credits and loadout arrive from their device, for the team panel
function armoryStatChecks() {
  let bad = [], order = [];
  for (const k of Object.keys(T.GUNS)) { const G = T.GUNS[k]; if (G.melee) continue; const S = T.gunStats(G);
    if (S.bars.length !== 6 || S.bars.some(b => !(b[1] > 0 && b[1] <= 1) || !b[2])) bad.push(k + ' bars');
    if (S.bands.length !== G.dmg.length || S.bands.some((b, i) => b.body !== T.dmgAt(G, G.dmg[i][0] - .1, 2) || b.head < b.body || b.legs > b.body)) bad.push(k + ' table'); }
  ok(!bad.length, 'every gun has six stat bars and a damage table that matches what it really does', bad.join(', ') || Object.keys(T.GUNS).length - 1 + ' guns');
  const bar = (k, n) => T.gunStats(T.GUNS[k]).bars.find(b => b[0] === n)[1];
  ok(bar('longbow', 'DAMAGE') > bar('lancer', 'DAMAGE') && bar('gnat', 'FIRE RATE') > bar('lancer', 'FIRE RATE') && bar('lancer', 'RANGE') > bar('breaker', 'RANGE') && bar('vesper', 'CONTROL') > bar('lancer', 'CONTROL') && bar('pip', 'MOBILITY') > bar('torrent', 'MOBILITY'),
    'the bars rank the guns the way they play (the Longbow hits hardest, the Gnat fires fastest, a rifle outranges a shotgun, the Vesper is steadier than the Lancer)');
  let [M, P, F] = lab(); M.online = true; F.net = true; F.credits = 800; T.netMsg({ t: 's', f: F.key, x: F.x, y: 0, z: F.z, yw: 0, pt: 0, vx: 0, vz: 0, cr: 0, sl: 1, g: 'vesper', hp: 100, sh: 50, al: 1, c: 1350, g1: 'vesper', g2: 'quill', sm: 2, aq: 1 }); M.online = false; F.net = false;
  ok(F.credits === 1350 && F.guns[1] === 'vesper' && F.guns[2] === 'quill' && F.smokes === 2 && F.ab.q === 1 && F.sh === 50, 'online: a fighter\'s credits and loadout arrive from their device (for their team\'s armory)', `◈ ${F.credits} ${F.guns[1]}+${F.guns[2]} smokes ${F.smokes}`);
  T.startRound(2); ok(P.inv0 && P.inv0.g2 === 'pip' && F.inv0, 'what everyone starts a round with is noted, so the armory can pick out what was bought since');
}
// a 4v4 plays a spread of maps: one-site ones, two-site ones, the three-site one and the one where attackers start at both ends
const FOUR_MAPS = ['saltworks', 'verdance', 'neonrow', 'sandgate', 'skyline', 'orbital', 'ironworks', 'frostline'];
function teamChecks(count, size = 2) {
  const vs = `${size}v${size}`; section(`${count} ${vs} bot matches`);
  let done = 0, rounds = 0, nan = 0, err = 0, kills = 0, plants = 0, ticks = 0, ms = 0; const why = {}, maps = [], distinct = [];
  const spread = { att: 0, attOf: 0, attBad: [], dup: 0, defOf: 0, sites: 0, sitesOf: 0 };
  const four = FOUR_MAPS.map(k => T.MAPS.findIndex(m => m.k === k)).filter(i => i >= 0);
  const onEnd = (wi, w) => { why[w] = (why[w] || 0) + 1; }; T.on('end', (wi, w) => onEnd(wi, w));
  if (size >= 4) {
    // agent select hands over the bot teammates' picks: two of them on one operative, one on yours, still make four different ones
    const teamOps = t => T.M.fs.filter(f => f.team === t).map(f => f.op), allDiff = a => new Set(a).size === a.length;
    T.seed(77); T.startMatch({ mode: 'bot', diff: 1, size, map: four[0], mates: [{ name: 'Ash', op: 'vex' }, { name: 'Bo', op: 'nova' }, { name: 'Cy', op: 'nova' }] });
    ok(allDiff(teamOps(0)) && T.M.fs.find(f => f.name === 'Bo').op === 'nova', 'agent select picks that clash are sorted out at the start (the first keeps theirs)', teamOps(0).join(','));
    // a party: two players on one team both on Vex, and the other team's two both on Iris
    const roster = [0, 1, 2, 3, 4].map(i => ({ id: i, name: 'P' + i })), cfg = () => ({ teams: { 0: 0, 1: 0, 2: 0, 3: 1, 4: 1 }, size, fill: true, hops: { 0: 'vex', 1: 'vex', 2: 'iris', 3: 'iris', 4: 'iris' }, ops: Object.keys(T.OPS), hostAtt: 1, decHostAtt: 1, map: four[0], botDiff: 1 });
    MP.opts.onStart(cfg(), roster); const M0 = T.M, s0 = [0, 1].map(t => M0.fs.filter(f => f.team === t).map(f => f.op));
    ok(s0.every(allDiff) && M0.fs.length === 2 * size && M0.byKey['0'].op === 'vex' && M0.byKey['3'].op === 'iris' && M0.byKey['1'].op !== 'vex' && M0.byKey['4'].op !== 'iris', 'party players on one team never share an operative (the first in the room keeps it)', s0.map(a => a.join(',')).join(' | '));
    const given = M0.byKey['1'].op; MP.id = 1; MP.opts.onStart(cfg(), roster); MP.id = 0;
    ok(T.M.fs[0].key === '1' && T.M.fs[0].op === given, 'the player who gave way plays the operative the room gave them, the same on every device', `${T.M.fs[0].op} / ${given}`);
  }
  for (let n = 0; n < count; n++) {
    try {
      const mi = size === 4 ? four[n % four.length] : (n * size) % T.MAPS.length, mp = T.MAPS[mi];
      T.seed(n * 104729 + 3 + size); T.startMatch({ mode: 'bot', diff: 1, size, map: mi }); const M = T.M; M.fs[0].bot = { diff: 1 }; M.fs[0].local = false; maps.push(mp.n);
      if (!n) { ok((M.fs.length === 2 * size && M.fs.filter(f => f.team === 0).length === size), `a ${vs} has ${size} on each team`);
        const spots = M.fs.map(f => f.x.toFixed(1) + ',' + f.z.toFixed(1)); ok(new Set(spots).size === spots.length, `everyone in a ${vs} starts on their own spot`, spots.join(' ')); }
      for (const t of [0, 1]) { const ops = M.fs.filter(f => f.team === t).map(f => f.op); distinct.push(new Set(ops).size === ops.length); }
      let seenRound = 0, planted = 0; const t0 = performance.now();
      for (let i = 0; i < 60 * 60 * 25 && !M.over; i++) {
        T.tick(DT); ticks++; if (i % 60 === 0 && M.fs.some(f => !Number.isFinite(f.x + f.z + f.y))) nan++;
        if (M.planted && planted !== M.round) { planted = M.round; plants++; }
        // a second and a half into each round: where the team's plans have spread them
        if (size >= 4 && M.phase === 'live' && seenRound !== M.round && M.t < T.roundT() - 1.5) {
          seenRound = M.round; const two = T.SITES.length > 1, side = f => T.sideOf(f), bots = M.fs.filter(f => f.alive && f.bot && f.bot.plan);
          const atk = bots.filter(f => side(f) === 'att' && f.bot.plan.k === 'push'), ways = new Set(atk.map(f => f.bot.plan.way)), all = mp.rw || Object.keys(T.ROUTES);
          const avail = new Set(all.filter(k => !two || !mp.rsite || mp.rsite[k] === (M.atkPick ? M.atkPick.s : 0)));
          if (atk.length >= 2) { spread.attOf++; if (ways.size >= Math.min(atk.length, avail.size)) spread.att++; else if (spread.attBad.length < 3) spread.attBad.push(`${mp.n} r${M.round}: ${[...ways].join('+')} of ${[...avail].join('/')}`); }
          const def = bots.filter(f => side(f) === 'def' && f.bot.plan.h), hs = def.map(f => f.bot.plan.h);
          if (def.length >= 2) { spread.defOf++; if (new Set(hs).size < hs.length) spread.dup++; }
          if (two && def.length >= 2) { spread.sitesOf++; if (new Set(def.map(f => f.bot.hs)).size >= 2) spread.sites++; }
        }
      }
      ms += performance.now() - t0;
      if (M.over) done++; rounds += M.wins[0] + M.wins[1]; kills += M.fs.reduce((a, f) => a + f.stat.k, 0);
    } catch (e) { err++; console.log(e.stack); }
  }
  ok(!err, 'no errors'); ok(done === count, `every ${vs} finishes`, `${done}/${count}`); ok(!nan, 'no NaN');
  if (size >= 3) ok(distinct.every(Boolean), `within each ${vs} team every operative is different`);
  if (size >= 4) {
    ok(new Set(maps).size >= Math.min(count, 4) && four.some(i => (T.MAPS[i].sites || 1) === 1 && maps.includes(T.MAPS[i].n)) && four.some(i => (T.MAPS[i].sites || 1) > 1 && maps.includes(T.MAPS[i].n)), `4v4 on one-site and two/three-site maps`, [...new Set(maps)].join(', '));
    ok(spread.attOf > 0 && spread.att / spread.attOf >= .85, 'four attackers spread over the ways in to their site', `${spread.att}/${spread.attOf} rounds${spread.attBad.length ? '; ' + spread.attBad.join('; ') : ''}`);
    ok(spread.defOf > 0 && !spread.dup, 'no two defenders take the same hold spot', `${spread.dup} of ${spread.defOf} rounds`);
    ok(!spread.sitesOf || spread.sites === spread.sitesOf, 'on a two- or three-site map the defenders split across the sites', `${spread.sites}/${spread.sitesOf} rounds`);
    ok(plants / Math.max(1, rounds) > .15, 'a 4v4 still gets the charge planted', `${plants} plants in ${rounds} rounds`);
  }
  console.log(`    ${rounds} rounds, ${kills} kills, ${plants} plants; the simulation ran ${(ticks / 60 / (ms / 1000)).toFixed(0)}x real time`);
}
function matchChecks(count) {
  section(`${count} bot matches`);
  const why = {}, post = {}; let rounds = 0, plants = 0, secs = 0, stuck = 0, bad = 0, unfinished = 0, kills = 0, heads = 0; const errors = [];
  for (let n = 1; n <= count; n++) {
    T.seed(n * 7919); T.startMatch({ mode: 'demo', map: n % T.MAPS.length }); const M = T.M; M.fs[0].bot.diff = n % 3; M.fs[1].bot.diff = (n + 1) % 3;
    let lastRound = 0, planted = false, live = 0; const still = [{ t: 0, x: 0, z: 0 }, { t: 0, x: 0, z: 0 }];
    try {
      for (let s = 0; s < 60 * 60 * 20 && !M.over; s++) {
        T.tick(DT);
        if (M.round !== lastRound) { lastRound = M.round; planted = false; live = 0; }
        if (M.phase === 'live') live += DT;
        if (M.planted && !planted) { planted = true; plants++; }
        if (M.phase === 'end' && M.last && !M.last.seen) { M.last.seen = true; rounds++; why[M.last.why] = (why[M.last.why] || 0) + 1; secs += live; if (planted) post[M.last.why] = (post[M.last.why] || 0) + 1; }
        M.fs.forEach((f, i) => {
          if (!Number.isFinite(f.x + f.y + f.z + f.yaw + f.pitch + f.hp)) bad++;
          const q = still[i]; if (M.phase !== 'live' || !f.alive || T.sideOf(f) !== 'att' || M.planted) { q.t = 0; q.x = f.x; q.z = f.z; q.flag = false; return; }
          if (Math.hypot(f.x - q.x, f.z - q.z) > 1.5) { q.t = 0; q.x = f.x; q.z = f.z; q.flag = false; }
          else if ((q.t += DT) > 20 && !q.flag) { q.flag = true; stuck++; console.log(`    match ${n} round ${M.round}: attacker still for 20 s at ${f.x.toFixed(1)}, ${f.z.toFixed(1)}, plan ${JSON.stringify(f.bot.plan, (k, v) => k === 'path' || k === 'pts' ? (v || []).length : v)} seen ${(f.bot.seen || 0).toFixed(1)} lost ${(f.bot.lostT || 0).toFixed(1)} gun ${f.guns[f.slot]} ${JSON.stringify(f.ammo[f.guns[f.slot]])} | rival ${T.foe() === f ? 'A' : 'B'} at ${T.M.fs[1 - i].x.toFixed(1)}, ${T.M.fs[1 - i].z.toFixed(1)} alive ${T.M.fs[1 - i].alive} plan ${T.M.fs[1 - i].bot.plan && T.M.fs[1 - i].bot.plan.k} t ${M.t.toFixed(0)}`); }
        });
      }
    } catch (e) { errors.push(`match ${n}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
    if (!M.over) unfinished++;
    for (const f of M.fs) { kills += f.stat.k; heads += f.stat.hs; }
  }
  ok(!errors.length, 'no errors', errors.slice(0, 3).join(' ; '));
  ok(!unfinished, 'every match finishes', unfinished ? unfinished + ' unfinished' : '');
  ok(!bad, 'no fighter state ever goes NaN');
  ok(stuck <= count / 5, 'attackers keep moving', stuck + ' stalls');
  ok((why.time || 0) / Math.max(1, rounds) < .25, 'rounds are decided, not timed out', Object.entries(why).map(([k, v]) => `${T.WHY[k]} ${v}`).join(', '));
  ok(plants / Math.max(1, rounds) > .12, 'the charge gets planted', `${plants} plants in ${rounds} rounds`);
  console.log(`    after a plant: ${Object.entries(post).map(([k, v]) => `${T.WHY[k]} ${v}`).join(', ')}`);
  console.log(`    ${rounds} rounds averaging ${(secs / Math.max(1, rounds)).toFixed(0)} s, ${kills} kills, ${(100 * heads / Math.max(1, kills)).toFixed(0)}% headshots`);
}

// the two-site maps: both sites see plants, planting wins rounds, 1v1, 2v2 and 4v4 all finish
// the newer operatives' abilities, one at a time, on the Pier with the rival placed by hand
function kitChecks() {
  section('new operatives');
  let I = idle(); T.setInput(() => I);
  const setup = (op, gunKey) => { const [M, P, F] = lab(gunKey); P.op = op; P.ab = { q: 1, e: 1 }; F.bot = { diff: 0, dummy: true, home: [50, 3] }; Object.assign(F, { x: 50, z: 3, y: 0, hp: 100, sh: 0, alive: true }); P.yaw = T.yawTo(P.x, P.z, 60, 3); P.pitch = 0; I = idle(); return [M, P, F]; };
  let M, P, F;
  [M, P, F] = setup('nova'); I = { ...idle(), mz: 1 }; run(.6); const v0 = Math.hypot(P.vx, P.vz); T.ability(P, 'q'); run(.4); const v1 = Math.hypot(P.vx, P.vz);
  ok(v1 > v0 * 1.25, 'Nova Surge: faster', `${v0.toFixed(1)} -> ${v1.toFixed(1)} m/s`);
  [M, P, F] = setup('nova'); Object.assign(F, { x: 48, z: 3 }); P.yaw = T.yawTo(P.x, P.z, 48, 3); P.pitch = -.02; T.ability(P, 'e'); run(.6);
  ok(F.daze > 0 && F.hp === 85 && T.spreadOf(F) / T.D2R >= 2.5, 'Nova Shockwave: dazes, shakes the aim and stings for 15', `daze ${F.daze.toFixed(2)}, hp ${F.hp}`);
  [M, P, F] = setup('wraith'); F.yaw = T.yawTo(F.x, F.z, P.x, P.z); const seen0 = T.canSee(F, P); T.ability(P, 'q'); const seen1 = T.canSee(F, P); Object.assign(F, { x: 43, z: 3 }); const seen2 = T.canSee(F, P);
  P.fireT = 0; T.fire(P); ok(seen0 && !seen1 && seen2 && P.cloak === 0, 'Wraith Shroud: unseen at 10 m, seen up close, and firing ends it', `${seen0} ${seen1} ${seen2} cloak ${P.cloak}`);
  // Mirage: a copy runs the way you look; a rival who shoots it is blinded and marked; a rival bot that has it in view takes it for real
  [M, P, F] = setup('wraith'); Object.assign(F, { x: 20, z: 40 }); P.yaw = -Math.PI / 2; P.pitch = 0; T.ability(P, 'e'); const D0 = M.kit.decoys[0], x0 = D0 && D0.x; run(1);
  ok(D0 && D0.x > x0 + 3 && Math.abs(D0.z - 3) < .5 && !M.kit.lures.length, 'Wraith Mirage: a copy runs ahead the way you look (no sounds)', D0 ? `${x0.toFixed(1)} → ${D0.x.toFixed(1)}` : 'none');
  if (D0) { F.alive = true; Object.assign(F, { x: D0.x + 8, z: D0.z, y: 0 }); F.yaw = T.yawTo(F.x, F.z, D0.x, D0.z); F.pitch = -.06; F.fireT = 0; F.spray = 0; F.flash = 0; const gk = F.guns[F.slot]; F.ammo[gk] = { mag: 9, res: 9 }; T.fire(F);
    ok(D0.popped && F.flash > 1 && F.reveal > 1, 'a rival who shoots it is blinded and marked', `flash ${F.flash.toFixed(1)}, reveal ${F.reveal.toFixed(1)}`); }
  [M, P, F] = setup('wraith'); F.bot = { diff: 1 }; F.team = 1; P.yaw = -Math.PI / 2; P.pitch = 0; T.ability(P, 'e'); const D1 = M.kit.decoys[0]; Object.assign(F, { x: 52, z: 3, y: 0, vx: 0, vz: 0 }); F.yaw = T.yawTo(52, 3, 41, 3); F.flash = 0;
  for (let i = 0; i < 60 && !D1.popped; i++) { Object.assign(F, { x: 52, z: 3, vx: 0, vz: 0 }); F.yaw = T.yawTo(F.x, F.z, D1.x, D1.z); T.tick(DT); }
  ok(D1.popped && F.flash > 1, 'a rival bot that has it in view falls for it, and is blinded', `popped ${D1.popped}, flash ${F.flash.toFixed(1)}`);
  [M, P, F] = setup('talon'); P.yaw = T.yawTo(P.x, P.z, 61, 3); P.pitch = .05; T.ability(P, 'q'); run(1);
  ok(M.kit.darts.length === 1 && M.kit.darts[0].stuck >= 0 && F.reveal > 0, 'Talon Recon Dart: sticks and reveals the rival', `stuck ${M.kit.darts[0] && M.kit.darts[0].stuck.toFixed(2)}, reveal ${F.reveal.toFixed(2)}`);
  [M, P, F] = setup('talon'); T.ability(P, 'e'); const sn = M.kit.snares[0]; run(1); Object.assign(F, { x: sn.x + 3, z: sn.z, bot: null, local: true }); T.setInput(f => f === F ? { ...idle(), mx: 0, mz: 1 } : I); F.yaw = T.yawTo(F.x, F.z, sn.x - 3, sn.z); run(.8);
  ok(F.snare > 0 && F.reveal > 0 && !M.kit.snares.length && Math.hypot(F.vx, F.vz) < 2.2, 'Talon Snare: the first rival over it is slowed and revealed', `snare ${F.snare.toFixed(2)}, speed ${Math.hypot(F.vx, F.vz).toFixed(1)}`);
  T.setInput(() => I);
  [M, P, F] = setup('ember'); P.yaw = T.yawTo(P.x, P.z, 50, 3); P.pitch = -.12; T.ability(P, 'q'); let landed = 0; for (let i = 0; i < 120 && !M.kit.fires.length; i++) { T.tick(DT); landed += DT; }
  const fire = M.kit.fires[0]; if (fire) Object.assign(F, { x: fire.x, z: fire.z, bot: null, vx: 0, vz: 0 }); const hp0 = F.hp; run(1.02);
  ok(fire && hp0 - F.hp >= 28 && hp0 - F.hp <= 32, 'Ember Ignite: the pool burns for 30 a second', fire ? `landed ${Math.hypot(fire.x - P.x, fire.z - P.z).toFixed(1)} m away after ${landed.toFixed(2)} s, ${hp0 - F.hp} damage in 1 s` : 'no pool');
  [M, P, F] = setup('ember'); T.ability(P, 'e'); run(.8);
  ok(M.smokes.length === 3 && M.smokes.every(q => q.heat) && !T.canSee(P, F), 'Ember Heat Haze: three clouds in a line that block sight', `${M.smokes.length} clouds`);
  [M, P, F] = setup('axiom'); Object.assign(F, { x: 52, z: 3 }); T.ability(P, 'q'); run(3);
  ok(F.hp < 100 && M.kit.sentries.length === 1, 'Axiom Sentry: fires on a rival in front of it', `rival on ${F.hp}`);
  { const st = M.kit.sentries[0]; F.guns[1] = 'lancer'; F.slot = 1; T.giveAmmo(F, 'lancer'); F.alive = true; F.hp = 100; F.yaw = T.yawTo(F.x, F.z, st.x, st.z); F.pitch = Math.atan2(st.y + .5 - T.eyeY(F), Math.hypot(st.x - F.x, st.z - F.z)); F.bot = null;
    for (let i = 0; i < 3; i++) { F.fireT = 0; F.spray = 0; T.fire(F); } ok(!M.kit.sentries.length, 'and three rifle shots bring it down', `${M.kit.sentries.length ? M.kit.sentries[0].hp : 0} health left`); }
  [M, P, F] = setup('axiom'); T.ability(P, 'e'); const mine = M.kit.mines[0]; Object.assign(P, { x: 30, z: 3 }); run(2); Object.assign(F, { x: mine.x + 1.5, z: mine.z, bot: { diff: 0, dummy: true, home: [mine.x + 1.5, mine.z] } }); run(.6);
  ok(F.hp <= 60 && !M.kit.mines.length, 'Axiom Tripmine: arms, then bursts when a rival comes near', `rival on ${F.hp}`);
  // bot matches where everyone is one of the newer operatives: no errors, and they use their abilities
  const used = {}; T.on('ability', (f, k) => { used[f.op + k] = (used[f.op + k] || 0) + 1; }); let err = 0, done = 0;
  const ops = ['nova', 'wraith', 'talon', 'ember', 'axiom'];
  for (let n = 0; n < 10; n++) {
    try { T.seed(n * 911 + 5); T.startMatch({ mode: 'demo', map: n % T.MAPS.length }); const M2 = T.M; M2.fs[0].op = ops[n % 5]; M2.fs[1].op = ops[(n + 2) % 5]; M2.fs[0].bot.diff = 1; M2.fs[1].bot.diff = 2;
      for (let i = 0; i < 60 * 60 * 25 && !M2.over; i++) T.tick(DT); if (M2.over) done++; } catch (e2) { err++; console.log(e2.stack.split('\n').slice(0, 4).join(' | ')); }
  }
  ok(!err && done === 10, 'bot matches with the new operatives finish without errors', `${done}/10`);
  const keys = ops.flatMap(o => [o + 'q', o + 'e']), missing = keys.filter(k => !used[k]);
  ok(!missing.length, 'bots use every new ability', keys.map(k => `${k} ${used[k] || 0}`).join(', '));
}
// skins: the store is the same for everyone each day, rarities are gated, prices follow rarity, a match pays by performance
function skinChecks() {
  section('skins and coins');
  const S = id => T.skinOfId(id), tierOf = id => S(id).R.tier, isPar = id => S(id).L.r === 'paragon';
  const days = Array.from({ length: 400 }, (_, i) => T.dailyStore(20000 + i)), rot = days.map(d => d.slice(1)), flat = rot.flat();
  ok(days.every(d => d.length === 8 && new Set(d).size === 8 && d.every(id => S(id))), 'eight different real skins in every three-hour set: a featured Paragon and seven more');
  ok(JSON.stringify(T.dailyStore(20123)) === JSON.stringify(T.dailyStore(20123)), 'the same day gives the same store');
  // the Paragon guarantee: exactly one, always first (its own featured slot), never among the seven, new every period
  const pars = days.map(d => d.filter(isPar).length);
  ok(days.every(d => isPar(d[0])) && pars.every(n => n === 1), 'exactly one Paragon in every set, in the featured slot, over 400 periods', `${pars.filter(n => n === 1).length} of ${days.length}`);
  ok(days.every((d, i) => !i || d[0] !== days[i - 1][0]) && days.every((d, i) => !i || S(d[0]).line !== S(days[i - 1][0]).line), 'the featured Paragon changes every period, and never to the same line twice running');
  const parLines = Object.keys(T.LINES).filter(l => T.LINES[l].r === 'paragon'), seen = new Set(days.map(d => d[0])), wk = new Set(days.map(d => S(d[0]).k));
  ok(parLines.length >= 2 && parLines.length <= 3 && parLines.every(l => days.some(d => S(d[0]).line === l)) && wk.size === 17, 'it rotates across every Paragon line and every weapon', `${parLines.length} lines, ${wk.size} weapons, ${seen.size} different skins`);
  ok(seen.size === parLines.length * 17, 'every Paragon skin comes round in turn', `${seen.size} of ${parLines.length * 17}`);
  ok(rot.every(d => d.every(id => tierOf(id) <= tierOf(d[0]) && !isPar(id))) && rot.every(d => d.every((id, i) => !i || tierOf(d[i - 1]) >= tierOf(id))), 'the seven are rarest first, under the Paragon');
  const myth = rot.filter(d => d.some(id => S(id).L.r === 'mythic')).length, perDay = rot.map(d => d.filter(id => S(id).L.r === 'mythic').length);
  ok(myth >= 16 && myth <= 80 && Math.max(...perDay) <= 1, 'a Mythic shows up in about one set in ten (about one a day), never two at once', `${myth} of 400 sets`);
  ok(T.storeLeft(3 * 3600000 * 100 + 5000) === 3 * 3600000 - 5000, 'the store turns over every three hours', T.storeLeft(3 * 3600000 * 100 + 5000));
  const now = T.dailyStore(); ok(now.length === 8 && isPar(now[0]), 'the store right now has its Paragon', S(now[0]).L.n + ' ' + S(now[0]).k);
  const all = T.allSkinIds(); ok(T.codeHash('vault 7q4k all') === T.ALL_SKINS_HASH && T.codeHash('VAULT-7Q4K-ALL') === T.ALL_SKINS_HASH && all.length === Object.keys(T.LINES).length * 17 && all.every(id => T.skinOfId(id)) && parLines.every(l => all.includes(l + ':knife')), 'the all-skins code matches however it is typed, and covers every skin on every weapon, Paragons too', `${all.length} skins in ${Object.keys(T.LINES).length} lines`);
  ok(T.codeHash('NOT-A-CODE') !== T.ALL_SKINS_HASH, 'a wrong code does not match');
  { const had = T.STATS.skins; T.STATS.skins = all.slice(); const same = days.slice(0, 60).every((d, i) => JSON.stringify(T.dailyStore(20000 + i)) === JSON.stringify(d)); T.STATS.skins = had;
    ok(same && rot.every(d => d.length === 7 && new Set(d).size === 7), 'owning every skin changes nothing: the same Paragon and seven, period after period'); }
  const tally = {}; for (const id of flat) { const r = S(id).L.r; tally[r] = (tally[r] || 0) + 1; }
  ok(tally.common > tally.rare && tally.rare > tally.epic && tally.epic > tally.legendary && tally.legendary > (tally.mythic || 0) && !tally.paragon, 'rarer lines are rarer in the seven, and no Paragon among them', JSON.stringify(tally));
  ok(T.skinPrice('dune:vesper') === 300 && T.skinPrice('voidline:vesper') === 4800 && T.skinPrice('voidline:knife') === 7200, 'prices: 300 for a Common, 4800 for a Mythic, half as much again for a knife');
  const pp = parLines.map(l => T.skinPrice(l + ':vesper')), pk = parLines.map(l => T.skinPrice(l + ':knife'));
  ok(pp.every(p => p === 8000) && pk.every(p => p === 12000) && pp[0] > T.skinPrice('voidline:vesper'), 'a Paragon costs more than a Mythic: 8000, and 12000 on a knife', pp.join('/'));
  // the new lines and the reload effects
  const L = T.LINES, glowing = Object.keys(L).filter(l => L[l].gk), hi = Object.keys(L).filter(l => S(l + ':vesper').R.tier >= 2);
  ok(glowing.length >= 10 && glowing.length <= 14 && glowing.filter(l => S(l + ':vesper').R.tier >= 2).length >= glowing.length - 2, 'ten to fourteen new glowing lines, most of them Epic and up', `${glowing.length} lines: ${glowing.map(l => L[l].r[0].toUpperCase()).join('')}`);
  ok(glowing.every(l => L[l].glow && L[l].live && L[l].rl), 'every new line glows, lives and has a reload effect');
  ok(hi.every(l => L[l].rl && L[l].rl.kind && L[l].rl.col && L[l].rl.col2), 'every Epic and up reloads with an effect of its own', `${hi.length} lines`);
  ok(parLines.every(l => L[l].kill && L[l].emblem && L[l].sound && L[l].fx && L[l].fx.idle && L[l].gk.sig), 'every Paragon has a kill effect, banner, sound, idle effect and a signature piece');
  const names = Object.values(L).map(x => x.n.toLowerCase()); ok(new Set(names).size === names.length, 'no two lines share a name');
  // the locker: rarest first
  const mix = ['dune:vesper', parLines[0] + ':vesper', 'voidline:vesper', 'tidewater:vesper', 'inferno:vesper', 'bogus:vesper'], sorted = T.skinSort(mix);
  ok(sorted.length === 5 && sorted[0] === parLines[0] + ':vesper' && sorted.every((id, i) => !i || tierOf(sorted[i - 1]) >= tierOf(id)), 'the locker lists Paragons first, then rarest down', sorted.map(id => S(id).L.r).join(' > '));
  // bots now and then carry something special
  T.seed(5); const botRolls = Array.from({ length: 3000 }, () => T.botSkins()).flatMap(o => Object.values(o)), btally = {}; for (const id of botRolls) { const r = S(id).L.r; btally[r] = (btally[r] || 0) + 1; }
  ok(botRolls.every(id => S(id)) && (btally.paragon || 0) > 0 && (btally.paragon || 0) < (btally.mythic || 0), 'bots carry a Paragon very rarely', JSON.stringify(btally));
  const fake = (k, hs, d) => ({ stat: { k, hs, d } }), M5 = w => ({ wins: [w, 5 - w], online: false });
  const big = T.matchCoins(fake(12, 6, 3), M5(5), true, { plants: 2, botLevel: 2 }).total, avg = T.matchCoins(fake(5, 2, 6), M5(3), false, { botLevel: 1 }).total;
  ok(big >= 520 && big <= 760, 'a big win pays about an eighth of a Mythic', `${big} coins, ${(big / 4800 * 100).toFixed(0)}%`);
  ok(avg >= 120 && avg <= 260 && avg < big / 2.5, 'an ordinary loss pays a fair amount, far less', `${avg} coins`);
}
// the loading screen: the first LOAD_T seconds of a match, added to round 1's buy phase; nothing can be bought under it
function progressChecks() {
  section('levels, the season pass and challenges');
  const S = T.STATS, keep = JSON.stringify(S), fake = (k, hs, d, x = {}) => ({ key: 'p', team: 0, stat: Object.assign({ k, hs, d, dmg: k * 140, shots: 100, hits: 30 }, x) }), Mx = (w, on) => ({ wins: [w, 2], online: !!on });
  ok(T.levelOf(0).l === 1 && T.levelOf(799).l === 1 && T.levelOf(800).l === 2 && T.levelOf(800 + 950).l === 3, 'level 2 at 800 XP, level 3 at 950 more', JSON.stringify(T.levelOf(1750)));
  ok(T.xpForLevel(40) === 3000 && T.xpForLevel(5) === 1400, 'each level asks a little more, up to 3000');
  const strong = T.matchXp(fake(18, 7, 9), Mx(5), true, { plants: 2, botLevel: 2 }).total, weak = T.matchXp(fake(3, 0, 10), Mx(1), false, { botLevel: 1 }).total;
  ok(strong > 600 && strong < 900 && weak > 150 && weak < strong / 2, 'a strong match pays about 700 XP, a poor one about a third', `${strong}, ${weak}`);
  // the season: 56 days from 16 November 2026, thirty tiers, the same rewards for everyone
  const t0 = Date.UTC(2026, 10, 16), s0 = T.seasonNow(t0 + 1000), s1 = T.seasonNow(t0 + 56 * 864e5 + 1000);
  ok(s0.n === 1 && s1.n === 2 && s0.name !== s1.name && Math.round(s0.left / 864e5) === 56, 'a season is eight weeks, then the next begins', `${s0.name} → ${s1.name}`);
  const R = T.passRewards(0), R2 = T.passRewards(0), R1 = T.passRewards(1), skins = R.flatMap(r => [r.f, r.p]).filter(r => r.t === 'skin');
  ok(R.length === 30 && R.every(r => r.f && r.p) && JSON.stringify(R) === JSON.stringify(R2), 'thirty tiers, a free and a premium reward on each, the same every time');
  ok(skins.length === 8 && skins.every(r => T.skinOfId(r.id)) && new Set(skins.map(r => r.id.split(':')[0])).size === 8, 'eight skins on the track, each a real one of a different line', skins.map(r => r.id).join(' '));
  ok(T.skinOfId(R[29].f.id).R.tier === 3 && T.skinOfId(R[29].p.id).R.tier === 4, 'tier 30 is a Legendary on the free track and a Mythic on the premium one');
  ok(JSON.stringify(R) !== JSON.stringify(R1), 'the next season has different rewards');
  ok(R.flatMap(r => [r.f, r.p]).every(r => (r.t === 'coins' && r.n > 0) || (r.t === 'skin') || (r.t === 'title' && T.TITLES.includes(r.s)) || (r.t === 'banner' && T.BANNERS[r.k] && r.k !== 'plain') || r.t === 'spin'), 'every reward is something real');
  // earning it
  Object.assign(S, { xp: 0, coins: 0, skins: [], titles: [], banners: [], title: '', banner: '', spins: 0, pass: null, ch: null });
  const now = Date.now(), realNow = Date.now; Date.now = () => t0 + 3 * 864e5 + 12 * 36e5;   // (a fixed day inside season 1)
  const p = T.myPass(); ok(p.xp === 0 && T.passTier() === 0 && !p.prem, 'a fresh pass starts at tier 0, free');
  p.xp = 5200; const got = T.passGrant();
  ok(got.length === 5 && got.every(q => !q.prem) && p.f === 5 && S.coins > 0 && S.skins.length === 1, '5200 pass XP is tier 5: five free rewards granted, the Rare skin among them', got.map(q => q.rw.t).join(' '));
  ok(T.passGrant().length === 0, 'nothing is granted twice');
  ok(T.buyPremium() === null, 'premium cannot be unlocked without the coins'); S.coins = 5000; const pg = T.buyPremium();
  ok(pg && pg.length === 5 && pg.every(q => q.prem) && S.coins >= 2000 && p.prem && p.p === 5, 'unlocking premium costs 3000 coins and hands over the five tiers already passed', pg.map(q => q.rw.t).join(' '));
  { const id = R[5].p.id; S.skins.push(id); const c0 = S.coins; p.xp = 6000; const g6 = T.passGrant(), dup = g6.find(q => q.prem); ok(dup && dup.rw.t === 'coins' && dup.rw.was && S.coins - c0 >= T.skinPrice(id) / 2, 'a skin you already own pays half its price in coins instead', JSON.stringify(dup.rw).slice(0, 60)); }
  // challenges
  const D = T.dailyChallenges(20000), D2 = T.dailyChallenges(20000), D3 = T.dailyChallenges(20001), Wk = T.weeklyChallenges(2900);
  ok(D.length === 3 && Wk.length === 3 && new Set(D.map(c => c.k)).size === 3 && Array.from({ length: 40 }, (_, d) => T.dailyChallenges(20000 + d)).every(L => L.length === 3 && L.filter(c => /with/.test(c.words)).length <= 1) && JSON.stringify(D) === JSON.stringify(D2) && JSON.stringify(D) !== JSON.stringify(D3), 'three daily and three weekly challenges, the same for everyone, new each day', D.map(c => c.words).join(' | '));
  ok(Wk.every(c => c.xp >= 2000) && D.every(c => c.xp >= 400 && c.xp <= 600), 'dailies pay 400 to 600 XP, weeklies 2000 or more');
  { let seen = new Set(); for (let d = 0; d < 60; d++) for (const c of T.dailyChallenges(20000 + d)) seen.add(c.k); ok(seen.size === T.CH_DAILY.length, 'over two months every kind of daily comes up', seen.size + ' of ' + T.CH_DAILY.length); }
  const list = T.myChallenges(), tally = { m: 1, k: 500, hs: 300, win: 9, rw: 99, obj: 50, dmg: 99999, fk: 50, cl: 9, mk: 9, ab: 99, Rifle: 99, SMG: 99, Sidearm: 99, Shotgun: 99, Sniper: 99, Melee: 9, Heavy: 99 };
  const pr = T.challengeProgress(tally), need = list.filter(c => c.k !== 'm' || c.n <= 1).length;
  ok(list.length === 6 && pr.done.length === need && pr.xp === pr.done.reduce((a, c) => a + c.xp, 0), 'a huge match finishes every challenge it can, and pays each one\'s XP', `${pr.done.length} done, ${pr.xp} XP`);
  ok(T.challengeProgress(tally).xp === 0 || T.myChallenges().filter(c => c.done).length >= need, 'a finished challenge is not paid again');
  // a whole match, paid
  Object.assign(S, { xp: 700, pass: null, ch: null }); const P2 = fake(14, 5, 8, { fk: 3, mk: 1, ab: 12, cat: { Rifle: 11, Sidearm: 3 } }), out = T.payProgress(P2, Mx(5), true, { plants: 1, botLevel: 2 });
  ok(out.xp.total >= 600 && out.level[1].l > out.level[0].l && S.xp === 700 + out.xp.total && T.myPass().xp === out.xp.total && out.pass.tier1 === Math.floor(out.xp.total / 1000), 'a match adds its XP to your level and to the pass alike', `+${out.xp.total} XP, level ${out.level[0].l} → ${out.level[1].l}, tier ${out.pass.tier1}`);
  ok(out.ch.moved.length >= 1 && out.got.length === out.pass.tier1, 'it moves the challenges on and grants the tiers it reached', `${out.ch.moved.length} moved, ${out.got.length} granted`);
  Date.now = realNow;
  // cards and awards
  const b1 = T.botCard('Rook', 1200), b2 = T.botCard('Rook', 1200); ok(b1.lv >= 1 && JSON.stringify(b1) === JSON.stringify(b2), 'a bot has a level, the same each time you meet it', JSON.stringify(b1));
  ok(T.cardFrom('37|3|ember').lv === 37 && T.cardFrom('37|3|ember').title === T.TITLES[3] && T.cardFrom('9999|-1|<x>').lv === 999 && T.cardFrom('9999|-1|<x>').banner === 'plain' && T.cardFrom('x|999|y').title === '', 'a card from another device is read with nothing trusted');
  T.seed(5); T.startMatch({ mode: 'bot', size: 3, diff: 1 }); const fs = T.M.fs; fs.forEach((f, i) => { f.stat.k = [9, 4, 2, 12, 3, 1][i]; f.stat.d = [3, 6, 7, 5, 8, 9][i]; f.stat.hs = [2, 3, 0, 4, 1, 0][i]; f.stat.dmg = f.stat.k * 130 + i; f.stat.fk = [0, 0, 4, 1, 0, 0][i]; f.stat.pl = i === 4 ? 3 : 0; });
  const A = T.matchAwards(fs, 0), titles = fs.map(f => A.get(f.key).title);
  ok(A.size === 6 && titles[0] === 'MATCH MVP' && titles[3] === 'TEAM MVP' && new Set(titles).size === 6 && [...A.values()].filter(a => a.top).length === 1, 'everyone in the line-up gets an award of their own; the winners\' best is the match MVP', titles.join(', '));
  ok(titles[2] === 'FIRST BLOOD' && titles[4] === 'SITE EXPERT' && titles[1] === 'SHARPSHOOTER' && A.get(fs[1].key).line === '75% headshots', 'the awards go to who led them (first kills, plants, headshots)', titles.join(', '));
  for (const k of Object.keys(S)) delete S[k]; Object.assign(S, JSON.parse(keep));
}
// abilities the genre's way: C and Q bought, E free (some come back), X; readied with the key, used with a click
function kit2Checks() {
  section('abilities: C Q E X, readied then used; every C; Vanta');
  let I = idle(); T.setInput(() => I);
  const ops = Object.keys(T.OPS);
  ok(ops.length === 10 && ops.every(k => T.OPS[k].c && T.OPS[k].c.cost > 0 && T.OPS[k].c.max >= 1 && T.OPS[k].q && T.OPS[k].e && T.OPS[k].x), 'ten agents, each with C, Q, E and X', ops.join(' '));
  const setup = (op, size = 1) => { T.seed(11); T.startMatch({ mode: 'bot', diff: 0, map: 0, size }); T.skipLoad(); const M = T.M, P = T.me(); P.op = op; M.phase = 'live'; M.t = 80; for (const f of M.fs) if (f !== P) { f.bot.dummy = true; } P.ab = { c: 2, q: 2, e: 1 }; P.ult = 9; Object.assign(P, { x: 40, z: 3, y: T.hAt(40, 3), yaw: -Math.PI / 2, pitch: -.03, vx: 0, vz: 0 }); return [M, P, T.foe()]; };
  const pin = (F, x, z) => Object.assign(F, { x, z, y: T.hAt(x, z), vx: 0, vz: 0, px: x, pz: z });
  const runPinned = (s, F, x, z) => { for (let i = 0; i < Math.round(s * 60); i++) { if (F) pin(F, x, z); T.tick(DT); } };
  // the flow
  let [M, P, F] = setup('vanta'); T.readyAb(P, 'q');
  ok(P.rdy === 'q' && P.ab.q === 2, 'Q readies the ability: nothing is spent yet'); I = Object.assign(idle(), { fire: true }); T.tick(DT); I = idle(); T.tick(DT);
  ok(!P.rdy && P.ab.q === 1 && M.kit.sunders.length === 1, 'a click uses it (one charge spent) and puts it away'); T.readyAb(P, 'c'); T.readyAb(P, 'c');
  ok(!P.rdy && P.ab.c === 2, 'the key again puts it away, unspent'); T.readyAb(P, 'q'); T.switchTo(P, 2); ok(!P.rdy, 'drawing a gun puts it away too');
  [M, P, F] = setup('nova'); T.readyAb(P, 'q'); ok(!P.rdy && P.ab.q === 1 && P.surge > 0, 'the quick ones (Surge) go the moment the key is pressed');
  [M, P, F] = setup('bastion'); T.readyAb(P, 'q'); T.castReady(P, true); const w0 = M.walls[0]; ok(w0 && (w0.x1 - w0.x0) > 3, 'the other click uses its other way: the Rampart turned along your view', w0 && `${(w0.x1 - w0.x0).toFixed(1)} by ${(w0.z1 - w0.z0).toFixed(1)}`);
  // the C abilities (a lobbed one: the rival is put where it comes down)
  let landAt = null; for (const ev of ['gloomPop', 'shockPop', 'fieldStart']) T.on(ev, g => { landAt = [g.x, g.z]; });
  const runLob = (s, F) => { landAt = null; for (let i = 0; i < Math.round(s * 60); i++) { if (landAt) pin(F, landAt[0] + .8, landAt[1]); else pin(F, 20, 40); T.tick(DT); } };
  [M, P, F] = setup('vex'); P.pitch = .1; T.ability(P, 'c', false); T.on('gloomPop', g => { if (T.M === M) pin(F, g.x + .8, g.z); }); runLob(2, F);
  ok(F.murk > 0, 'Gloom: a rival where it bursts sees only 5 m', 'murk ' + F.murk.toFixed(1));
  [M, P, F] = setup('iris'); pin(F, 50, 3); P.pitch = -.7; T.ability(P, 'c', false); P.pitch = 0; const eye = M.kit.eyes[0]; if (eye) { eye.x = 40; eye.z = 3; eye.y = 1.5; eye.yaw = -Math.PI / 2; } runPinned(1.5, F, 50, 3);
  ok(eye && !(F.reveal > 0), 'Watcher: placed, it sleeps (unseen, marking nobody)', eye ? 'reveal ' + (F.reveal || 0).toFixed(1) : 'no eye placed');
  ok(T.ability(P, 'c', false) && eye && eye.act > 0, 'the C key again wakes it, free', eye ? 'awake ' + (eye.act || 0).toFixed(1) + ' s' : '');
  runPinned(1, F, 50, 3); ok(eye && F.reveal > 0, 'awake, a rival in its view is marked', eye ? 'reveal ' + F.reveal.toFixed(1) : '');
  { P.z += 6; const dx = eye.x - F.x, dy = eye.y - T.eyeY(F), dz = eye.z - F.z, L = Math.hypot(dx, dy, dz), S = T.castShot(F, [dx / L, dy / L, dz / L]); P.z -= 6; ok(S.eye === eye, 'awake, a rival can shoot it', S.eye ? 'hit' : 'missed at ' + S.dist.toFixed(1)); }
  runPinned(20, F, 50, 3); ok(M.kit.eyes.includes(eye), 'it lasts past the old 20 s limit', M.kit.eyes.length + ' eyes');
  [M, P, F] = setup('bastion'); P.sh = 0; T.ability(P, 'c', false); runPinned(1, null); ok(P.sh === 30, 'Ward Beacon: 30 shield a moment after it is set', 'shield ' + P.sh);
  [M, P, F] = setup('nova'); const y0 = P.y; T.ability(P, 'c', false); let top = y0; for (let i = 0; i < 40; i++) { T.tick(DT); top = Math.max(top, P.y); } ok(top - y0 > 2, 'Updraft: up more than 2 m', (top - y0).toFixed(1) + ' m');
  [M, P, F] = setup('wraith'); T.ability(P, 'c', false); ok(P.tether && P.ab.c === 1, 'Tether: an anchor where you stand'); Object.assign(P, { x: 46, z: 3 }); T.readyAb(P, 'c'); ok(Math.abs(P.x - 40) < .5 && !P.tether && P.ab.c === 1, 'the key again steps you back to it, free', P.x.toFixed(1));
  [M, P, F] = setup('talon'); const hp0 = F.hp; T.on('shockPop', g => { if (T.M === M) pin(F, g.x + .8, g.z); }); T.ability(P, 'c', false); runLob(2.5, F); ok(F.hp < hp0, 'Shock Bolt: bursts and hurts a rival near it', `${hp0} → ${F.hp}`);
  [M, P, F] = setup('ember'); T.ability(P, 'c', false); ok(M.flares.length === 1, 'Flashpoint: a flash bent round a corner'); const dL = T.abData(P, 'c', false), dR = T.abData(P, 'c', true); ok(dL.z < dL.az - .3 && dR.z > dR.az + .3, 'left click bends it left, right click right', `${dL.z.toFixed(1)} / ${dR.z.toFixed(1)}`);
  [M, P, F] = setup('axiom'); T.ability(P, 'c', false); runLob(2, F); ok(F.slowF > 0, 'Slow Field: a rival inside is slowed', 'slow ' + (F.slowF || 0).toFixed(2));
  // Vanta
  [M, P, F] = setup('vanta'); pin(F, 48, 3); { const aimAt = (q, hy) => { const o = [P.x, T.eyeY(P), P.z], dx = q.x - o[0], dy = hy - o[1], dz = q.z - o[2], L = Math.hypot(dx, dy, dz); P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.asin(dy / L); };
    aimAt(F, F.y + 1); const hp00 = F.hp; T.ability(P, 'q', false); ok(F.exposed > 0 && F.hp < hp00 && F.alive, 'Sunder: instant; the rival it meets is hit and Exposed at once', `${hp00} → ${F.hp}`);
    runPinned(.6, F, 48, 3); const hpa = F.hp; T.applyDamage(F, 20, P, false, 'pip'); ok(F.exposed > 0 && Math.round(hpa - F.hp) === 25, 'an Exposed rival takes 25% more', `${(hpa - F.hp).toFixed(0)} from 20`);
    [M, P, F] = setup('vanta'); pin(F, 48, 3); const hb = T.hitboxes(F); aimAt(F, hb.head[1]); P.ab.q = 2; T.ability(P, 'q', false); ok(!F.alive, 'a Sunder to the head kills', F.alive ? 'hp ' + F.hp : 'dead'); }
  [M, P, F] = setup('vanta'); T.ability(P, 'c', false); const fw = M.walls.find(w => w.front); runPinned(1.5, null);
  ok(fw && fw.soft && fw.front.s > 4 && !T.blocked((fw.x0 + fw.x1) / 2, (fw.z0 + fw.z1) / 2, P.y), 'Phase Front: a wall that rolls out ahead, and you can walk through it', fw && 'rolled ' + fw.front.s.toFixed(1) + ' m');
  { pin(F, 56, 3); const S = T.castShot(P, T.viewDir(-Math.PI / 2, 0)); ok(!S.hit && S.dist < 15, 'it stops bullets', 'a shot stops at ' + S.dist.toFixed(1) + ' m'); }
  [M, P, F] = setup('vanta'); pin(F, 48, 3); T.ability(P, 'e', false); ok(P.over > 0 && !P.ab.e, 'Overcharge: on, for 12 s'); T.applyDamage(F, 300, P, true, 'pip');
  ok(M.kit.hexes.length === 1 && P.eK === 1, 'a kill leaves a charge where they fell (and counts toward the next Overcharge)'); const h = M.kit.hexes[0], S2 = { o: [P.x, T.eyeY(P), P.z], d: (() => { const dx = h.x - P.x, dy = h.y - T.eyeY(P), dz = h.z - P.z, L = Math.hypot(dx, dy, dz); return [dx / L, dy / L, dz / L]; })(), dist: 99 };
  ok(T.hexShot(P, S2) && P.ward > 0 && !M.kit.hexes.length, 'shooting the charge gives a ward'); M.phase = 'live'; const hpb = P.hp; F.alive = true; F.hp = 100; T.applyDamage(P, 60, F, false, 'pip'); ok(P.hp === hpb && !(P.ward > 0), 'the ward stops the next hit, whatever it was');
  // the Duel Field, in a 2v2
  [M, P, F] = setup('vanta', 2); const foes = M.fs.filter(f => f.team !== P.team), mate = M.fs.find(f => f !== P && f.team === P.team), tgt = foes[0], other = foes[1];
  pin(tgt, 47, 3); P.pitch = Math.atan2(tgt.y + 1.1 - T.eyeY(P), 7); T.ability(P, 'x', false);
  ok(P.duel && tgt.duel === P.duel, 'Duel Field: pointed at a rival, it seals you both in a dome', P.duel ? 'radius ' + P.duel.r.toFixed(1) : 'no duel');
  if (P.duel) { pin(other, 44, 3); pin(mate, 43, 3.5); const hp1 = tgt.hp, hp2 = P.hp;
    T.applyDamage(tgt, 30, mate, false, 'pip'); T.applyDamage(P, 30, other, false, 'pip'); ok(tgt.hp === hp1 && P.hp === hp2, 'nobody outside can hurt the two inside');
    ok(!T.canSee(other, P) && !T.canSee(P, other) && !T.duelOk(mate, tgt), 'nor see them, nor be seen');
    Object.assign(P, { x: P.duel.x + P.duel.r + 5 }); T.tick(DT); ok(Math.hypot(P.x - P.duel.x, P.z - P.duel.z) <= P.duel.r + .01, 'and neither gets out'); T.applyDamage(tgt, 200, P, true, 'pip'); T.tick(DT);
    ok(!P.duel && !tgt.alive, 'one falls: the dome is gone'); }
  // Tessel: Lightline, Lull, Bloom, Glasshouse
  { const O = T.OPS.tessel; ok(O && O.c.cost === 150 && O.c.max === 2 && O.q.cost === 200 && O.q.max === 2 && O.e.rech === 40 && O.x.pts === 7 && O.col !== '#ff4655', 'Tessel: Bloom 150 (two), Lull 200 (two), Lightline back 40 s after use, Glasshouse 7 points'); }
  [M, P, F] = setup('tessel'); pin(F, 56, 3);
  { const seen0 = T.canSee(P, F) && T.canSee(F, P); ok(T.ability(P, 'e', true), 'Lightline: the other click draws it across your view'); const L = M.kit.lines[0]; runPinned(.5, F, 56, 3);
    ok(L && Math.abs((L.ax + L.bx) / 2 - 50) < 1.5 && Math.hypot(L.bx - L.ax, L.bz - L.az) > 3 && !P.ab.e, 'it stands across the way you look, up to 10 m out, wall to wall', L && `at x ${((L.ax + L.bx) / 2).toFixed(1)}, ${Math.hypot(L.bx - L.ax, L.bz - L.az).toFixed(1)} m wide`);
    ok(seen0 && !T.canSee(P, F) && !T.canSee(F, P), 'it blocks sight both ways', `before ${seen0}`);
    { const o = [P.x, T.eyeY(P), P.z], dx = F.x - o[0], dy = F.y + 1.1 - o[1], dz = F.z - o[2], Ln = Math.hypot(dx, dy, dz), S = T.castShot(P, [dx / Ln, dy / Ln, dz / Ln]); ok(S.hit && S.hit.f === F, 'but not bullets', S.hit ? 'the shot hits the rival' : 'stopped at ' + S.dist.toFixed(1)); }
    ok(L && !T.blocked((L.ax + L.bx) / 2, 3, P.y), 'and anyone can walk through it'); F.reveal = 0; for (let x = 56; x >= 45; x -= .25) { pin(F, x, 3); T.tick(DT); }
    ok(F.reveal > 1.5, 'a rival who walks through it is Lit (shown through walls)', 'reveal ' + F.reveal.toFixed(1));
    runPinned(14, F, 45, 3); ok(!M.kit.lines.length && T.canSee(P, F), 'it fades after 14 s', M.kit.lines.length + ' lines'); }
  for (let i = 0; i < 27 * 60 && !P.ab.e; i++) T.tick(DT); ok(P.ab.e === 1, 'Lightline comes back 40 s after it is used', 'eT ' + P.eT.toFixed(1));
  [M, P, F] = setup('tessel'); T.ability(P, 'e', false); { const L = M.kit.lines[0]; ok(L && Math.hypot(L.ax - P.x, L.az - P.z) < 1 && Math.hypot(L.bx - L.ax, L.bz - L.az) > 8 && Math.abs(L.bz - L.az) < .2, 'a left click draws it from your feet along your aim', L && Math.hypot(L.bx - L.ax, L.bz - L.az).toFixed(1) + ' m'); }
  for (const ev of ['lullStart', 'bloomPop']) T.on(ev, g => { landAt = [g.x, g.z]; });
  [M, P, F] = setup('tessel'); T.ability(P, 'q', false); runLob(2, F); const Z = M.kit.lenses[0];
  ok(Z && F.slowF > 0, 'Lull: a rival near the lens moves at half speed', 'slow ' + (F.slowF || 0).toFixed(2));
  if (Z) { const o = [F.x, T.eyeY(F), F.z], dx = Z.x - o[0], dy = Z.y + .28 - o[1], dz = Z.z - o[2], L = Math.hypot(dx, dy, dz), S = { o, d: [dx / L, dy / L, dz / L], dist: 99 }; ok(!T.lensShot(P, S) && T.lensShot(F, S) && !M.kit.lenses.length, 'one bullet from a rival breaks the lens (not one of Tessel\'s own)'); }
  [M, P, F] = setup('tessel'); T.ability(P, 'q', false); runLob(2, F); const nZ = M.kit.lenses.length; runPinned(7.2, null); ok(nZ === 1 && !M.kit.lenses.length, 'a lens left alone lasts 7 s'); ok(T.ability(P, 'q', false) && !T.ability(P, 'q', false) && !P.ab.q, 'two Lulls, and no more');
  [M, P, F] = setup('tessel'); P.pitch = -.05; T.ability(P, 'c', false); runLob(2, F); runPinned(.8, null);
  { const s = M.smokes.find(q => q.glare); if (s) { const dx = s.x - P.x, dz = s.z - P.z, L = Math.hypot(dx, dz); pin(F, s.x + dx / L * 6, s.z + dz / L * 6); }
    ok(s && s.R === 3.4 && s.T === 9 && !T.canSee(P, F), 'Bloom: a globe of glare where it lands, that blocks sight', s ? `${Math.hypot(s.x - P.x, s.z - P.z).toFixed(1)} m out` : 'none'); }
  [M, P, F] = setup('tessel'); pin(F, 48, 3); { const o = [P.x, T.eyeY(P), P.z], dy = F.y + 1 - o[1]; P.pitch = Math.atan2(dy, 8); }
  ok(T.ability(P, 'x', false) && M.kit.houses.length === 1 && M.kit.lines.length === 4 && P.ult === 0, 'Glasshouse: four Lightlines round the spot you point at', M.kit.houses[0] && `at ${M.kit.houses[0].x.toFixed(1)}, ${M.kit.houses[0].z.toFixed(1)}`);
  runPinned(.5, F, 48, 3); ok(F.slowF > 0 && !T.canSee(P, F), 'a rival inside is slowed, and cannot see out', 'slow ' + (F.slowF || 0).toFixed(2));
  F.reveal = 0; for (let x = 48; x <= 56; x += .25) { pin(F, x, 3); T.tick(DT); } ok(F.reveal > 1.5, 'walking out through its wall, they are Lit', 'reveal ' + F.reveal.toFixed(1));
  runPinned(10, null); ok(!M.kit.houses.length && !M.kit.lines.length, 'it is gone after 10 s');
  // bots on Tessel use the whole kit
  { const usedT = {}; T.on('ability', (f, k) => { if (f.op === 'tessel' && f.bot) usedT[k] = (usedT[k] || 0) + 1; }); let errT = 0;
    for (let m = 0; m < 6; m++) { try { T.seed(300 + m); T.startMatch({ mode: 'demo', map: m % T.MAPS.length }); const M2 = T.M; M2.fs[0].op = 'tessel'; M2.fs[1].op = m % 2 ? 'vex' : 'tessel'; for (const f of M2.fs) if (f.bot) f.bot.diff = 2; for (let i = 0; i < 60 * 60 * 6 && !M2.over; i++) T.tick(DT); } catch (e2) { errT++; console.log(String(e2 && e2.stack).split('\n').slice(0, 4).join(' | ')); } }
    ok(!errT && ['c', 'q', 'e', 'x'].every(k => usedT[k] > 0), 'bots on Tessel use Bloom, Lull, Lightline and Glasshouse, without errors', JSON.stringify(usedT)); }
  // signatures that come back
  [M, P, F] = setup('iris'); T.ability(P, 'e', false); ok(!P.ab.e, 'Iris has used her Flare'); for (let i = 0; i < 41 * 60 && !P.ab.e; i++) T.tick(DT); ok(P.ab.e === 1, 'and it comes back after 40 s', P.eT.toFixed(1));
  // bots use them
  { let used = 0; const seen = new Set(); T.on('ability', (f, k) => { if (k === 'c' && f.bot) { used++; seen.add(f.op); } }); for (let m = 0; m < 6; m++) { T.seed(100 + m); T.startMatch({ mode: 'bot', diff: 2, size: 4 }); for (let i = 0; i < 60 * 260 && !T.M.over; i++) T.tick(DT); }
    ok(used > 0, 'bots buy and use their C abilities', used + ' uses by ' + [...seen].join(', ')); }
}
function loadChecks() {
  section('loading screen');
  T.seed(5); T.startMatch({ mode: 'bot', diff: 1, map: 0 }); const M = T.M, P = T.me(); P.credits = 9000;
  ok(T.loadingNow() && Math.abs(M.t - (T.BUY_T + T.LOAD_T)) < 1e-9, 'a bot match opens on the loading screen, with the full buy phase still to come', M.t.toFixed(2) + ' s');
  ok(!T.buy(P, 'lancer'), 'nothing can be bought while it shows');
  run(T.LOAD_T + .05); ok(!T.loadingNow() && M.phase === 'buy' && T.buy(P, 'lancer'), 'once it ends the buy phase runs as usual', `${M.phase} ${M.t.toFixed(1)} s`);
  T.startMatch({ mode: 'bot', diff: 1, map: 0 }); T.skipLoad(); ok(!T.loadingNow() && Math.abs(T.M.t - T.BUY_T) < 1e-9, 'offline it can be skipped');
  T.startMatch({ mode: 'range' }); ok(!T.loadingNow(), 'the range has none'); T.startMatch({ mode: 'demo' }); ok(!T.loadingNow(), 'nor the demo');
  T.startMatch({ mode: 'bot', diff: 1, map: 0 }); ok(T.M.fs.every(f => f.rating >= 600 && f.rating <= 1800), 'every player has a rating for their card', T.M.fs.map(f => f.rating).join(', '));
}
function twoSiteChecks(count) {
  section(`${count} matches on the two-site maps`);
  const pool = T.mapPool(2), bySite = [0, 0, 0], why = {}, sizes = {}; let rounds = 0, plants = 0, done = 0, err = 0, boomWins = 0, plantWins = 0;
  ok(pool.length === 7 && T.mapPool(1).length === 7, 'seven STANDARD maps (two or three sites) and seven one-site maps', `${pool.length} and ${T.mapPool(1).length}`);
  for (let n = 0; n < count; n++) {
    try {
      T.seed(n * 6151 + 17); const size = [1, 2, 1, 4][n % 4]; sizes[size] = (sizes[size] || 0) + 1; T.startMatch({ mode: 'bot', diff: 1, size, map: pool[n % pool.length] }); const M = T.M; M.fs[0].bot = { diff: 1 + (n % 2) }; M.fs[0].local = false;
      if (!n) ok(T.SITES.length >= 2 && T.roundT() >= 100, 'a STANDARD map has two or three sites and rounds of 100 s or more', T.SITES.map(S => S.k + ' ' + S.cells.length + ' cells').join(', ') + ', ' + T.roundT() + ' s');
      let planted = false, lastRound = 0;
      for (let i = 0; i < 60 * 60 * 30 && !M.over; i++) {
        T.tick(DT);
        if (M.round !== lastRound) { lastRound = M.round; planted = false; }
        if (M.planted && !planted) { planted = true; plants++; bySite[M.planted.s]++; }
        if (M.phase === 'end' && M.last && !M.last.seen2) { M.last.seen2 = true; rounds++; why[M.last.why] = (why[M.last.why] || 0) + 1; if (M.last.why === 'boom') boomWins++; const att = M.fs.find(f => T.sideOf(f) === 'att'); if (planted && att && M.last.wi === att.team) plantWins++; }
      }
      if (M.over) done++;
    } catch (e) { err++; console.log(e.stack); }
  }
  ok(!err, 'no errors'); ok(done === count, 'every match finishes', `${done}/${count}`);
  ok(bySite[0] > 0 && bySite[1] > 0, 'attackers plant on both sites', `A ${bySite[0]}, B ${bySite[1]}${bySite[2] ? ', C ' + bySite[2] : ''}`);
  // (a round won after the plant counts however it ends: the charge going off, or the retake beaten. Bots that reach a planted
  // charge always defuse it now, so the charge itself rarely goes off between them; it used to when a defender stalled short of it)
  ok(plants / Math.max(1, rounds) > .2 && plantWins >= plants * .25, 'planting is a real way to win', `${plants} plants in ${rounds} rounds, ${plantWins} won after the plant (${boomWins} by the charge going off)`);
  console.log(`    ${Object.entries(why).map(([k, v]) => `${T.WHY[k]} ${v}`).join(', ')}; team sizes ${Object.entries(sizes).map(([k, v]) => `${k}v${k} x${v}`).join(', ')}`);
}

// COPPERLEAF, the autumn cider estate with three sites: it loads, every site can be reached from both spawns and by every
// way in, a bot plants on each of A, B and C, no spawn stands in a wall, and five a side the defenders spread over all
// three sites while the attackers plant on more than one and the charge gets defused
function copperleafChecks() {
  section('Copperleaf: three sites on an autumn cider estate');
  const mi = T.MAPS.findIndex(m => m.k === 'copperleaf'); ok(mi > 0, 'Copperleaf is one of the maps', mi);
  if (mi < 0) return;
  const mp = T.loadMap(mi);
  ok(T.SITES.length === 3 && T.SITES.map(S => S.k).join('') === 'ABC' && T.SITES.every(S => S.cells.length >= 40), 'it loads with three sites, A, B and C, each a good size', T.SITES.map(S => S.k + ' ' + S.cells.length + ' cells').join(', '));
  ok(T.SITES.every((S, s) => S.cells.every(c => T.siteAt(c[0], c[1]) === s)), 'each site cell answers with its own letter (siteAt)');
  ok(T.mapPool(2).includes(mi) && !T.mapPool(1).includes(mi) && T.roundT() >= 100, 'it is played in STANDARD, with the longer rounds', T.roundT() + ' s');
  ok(mp.theme === 'autumn' && mp.n === 'Copperleaf' && !/#ff4655/i.test(JSON.stringify(mp)), 'its own name and its own autumn theme');
  ok(T.SPAWN.att.length >= 5 && T.SPAWN.def.length >= 5, 'spawn spots for five a side', `${T.SPAWN.att.length} attackers, ${T.SPAWN.def.length} defenders`);
  // no spawn spot in or against a wall: a fighter's width of open, flat ground all round it
  const clear = p => [[0, 0], [.45, 0], [-.45, 0], [0, .45], [0, -.45]].every(([dx, dz]) => { const k = T.idx(Math.floor((p[0] + dx) / T.CS), Math.floor((p[1] + dz) / T.CS)); return k >= 0 && T.NAV[k] && T.CH[k] < .01; });
  ok([...T.SPAWN.att, ...T.SPAWN.def].every(clear), 'no spawn spot overlaps a wall, a crate or a container');
  const walkT = (a, b) => { const q = T.findPath(a[0], a[1], b[0], b[1]); return q.length ? T.pathLen(q, a[0], a[1]) / T.SPD : Math.hypot(a[0] - b[0], a[1] - b[1]) < 1.5 ? 0 : Infinity; };
  const far = []; for (const S of T.SITES) for (const side of ['att', 'def']) for (const p of T.SPAWN[side]) if (!(walkT(p, S.c) < 30)) far.push(side + ' to ' + S.k);
  ok(!far.length, 'every site can be walked to from every spawn spot of both sides', far.slice(0, 3).join(', '));
  const cut = T.SITES.reduce((n, S) => n + S.cells.filter(c => !(walkT(T.SPAWN.att[0], c) < 40) || !(walkT(T.SPAWN.def[0], c) < 40)).length, 0);
  ok(!cut, 'every cell of every site can be reached by the bots\' paths from both spawns', cut + ' cut off');
  const ways = Object.entries(T.ROUTES).map(([k, pts]) => { let a = T.SPAWN.att[0], t = 0; for (const q of [...pts, T.SITES[mp.rsite[k]].c]) { t += walkT(a, q); a = q; } return [k, t]; });
  ok(ways.every(([, t]) => t >= 9 && t <= 21) && [0, 1, 2].every(s => Object.values(mp.rsite).filter(v => v === s).length >= 2), 'two or more ways in to each site, each 9 to 21 s from the Cart Yard', ways.map(([k, t]) => `${k} ${t.toFixed(1)}`).join(', '));
  ok([0, 1, 2].every(s => T.HOLDS.filter(h => h.s === s).length >= 3), 'the defenders have hold spots at every site', [0, 1, 2].map(s => T.HOLDS.filter(h => h.s === s).length).join('/'));
  // a bot attacker sent to each site in turn plants there (the defender stands out of the way)
  const got = [];
  for (let s = 0; s < 3; s++) {
    T.seed(900 + s * 7); T.startMatch({ mode: 'bot', diff: 1, size: 1, map: mi }); const M = T.M;
    for (const f of M.fs) { f.local = false; f.bot = { diff: 1 }; }
    const d = M.fs.find(f => T.sideOf(f) === 'def'); d.bot = { diff: 0, dummy: true, home: [-40, -40] }; d.x = d.z = -40;
    let at = null; for (let i = 0; i < 60 * 160 && !at && M.round === 1; i++) { M.atkPick = { r: M.round, s }; d.x = d.z = -40; T.tick(DT); if (M.planted) at = M.planted; }
    got.push(at ? at.s : -1);
  }
  ok(got.join() === '0,1,2', 'a bot attacker plants on each site: A, B and C', got.map(s => s < 0 ? 'none' : 'ABC'[s]).join(' '));
  // five a side, bots only
  const bySite = [0, 0, 0], held = [0, 0, 0], why = {}; let rounds = 0, done = 0, nan = 0, err = 0, spreadOk = 0, spreadOf = 0;
  for (let n = 0; n < 2; n++) {
    try {
      T.seed(4242 + n * 17); T.startMatch({ mode: 'bot', diff: 1, size: 5, map: mi }); const M = T.M; M.fs[0].bot = { diff: 1 }; M.fs[0].local = false;
      if (!n) { const spots = M.fs.map(f => f.x.toFixed(1) + ',' + f.z.toFixed(1)); ok(M.fs.length === 10 && new Set(spots).size === 10 && M.fs.every(f => clear([f.x, f.z])), 'five a side: everyone starts on a spot of their own, clear of the walls'); }
      let seen = 0, planted = 0;
      for (let i = 0; i < 60 * 60 * 30 && !M.over; i++) {
        T.tick(DT);
        if (M.planted && planted !== M.round) { planted = M.round; bySite[M.planted.s]++; }
        if (M.phase === 'live' && seen !== M.round && M.t < T.roundT() - 1.5) { seen = M.round; const hs = M.fs.filter(f => f.alive && f.bot && T.sideOf(f) === 'def' && f.bot.plan && f.bot.plan.h).map(f => f.bot.hs);
          hs.forEach(s => held[s]++); if (hs.length >= 3) { spreadOf++; if (new Set(hs).size === 3) spreadOk++; } }
        if (M.phase === 'end' && M.last && !M.last.seenCL) { M.last.seenCL = true; rounds++; why[M.last.why] = (why[M.last.why] || 0) + 1; }
        if (i % 120 === 0 && M.fs.some(f => !Number.isFinite(f.x + f.z + f.y))) nan++;
      }
      if (M.over) done++;
    } catch (e) { err++; console.log(e.stack); }
  }
  ok(!err && !nan && done === 2, 'two 5v5 bot matches on Copperleaf finish, with no errors', `${done}/2, ${rounds} rounds`);
  ok(spreadOf > 0 && spreadOk === spreadOf && held.every(v => v > 0), 'five defenders spread over all three sites every round', `${spreadOk}/${spreadOf} rounds; held A ${held[0]}, B ${held[1]}, C ${held[2]}`);
  ok(bySite.filter(v => v > 0).length >= 2 && (why.defuse || 0) > 0, 'plants on more than one site, and the charge gets defused', `A ${bySite[0]}, B ${bySite[1]}, C ${bySite[2]}; ${Object.entries(why).map(([k, v]) => `${T.WHY[k]} ${v}`).join(', ')}`);
}

// every map, bots only: a 1v1 and a 3v3 on each, and the map's own feature gets used
function everyMapChecks(per = 2) {
  section(`bot matches on all ${T.MAPS.length} maps`);
  const use = {}; for (const ev of ['tp', 'pad', 'gate', 'wallDown', 'vent', 'storm', 'ultUsed', 'orb']) T.on(ev, () => { use[ev] = (use[ev] || 0) + 1; });
  let allOk = true;
  T.MAPS.forEach((mp, mi) => {
    if (process.argv[4] && mp.k !== process.argv[4]) return;   // node tools/duelpoint-sim-test.mjs maps 2 <key>: one map
    const row = { rounds: 0, plants: {}, why: {}, stalls: 0, err: null, done: 0 }; for (const k in use) use[k] = 0;
    for (let n = 0; n < per; n++) {
      try {
        T.seed(mi * 7717 + n * 131 + 5); const size = n % 2 ? 3 : 1;
        T.startMatch({ mode: 'bot', diff: 1, size, map: mi }); const M = T.M; M.fs[0].bot = { diff: 1 + (n % 2) }; M.fs[0].local = false;
        const still = M.fs.map(() => ({ t: 0, x: 0, z: 0 })); let lastRound = 0, planted = false;
        for (let i = 0; i < 60 * 60 * 30 && !M.over; i++) {
          T.tick(DT);
          if (M.round !== lastRound) { lastRound = M.round; planted = false; }
          if (M.planted && !planted) { planted = true; const k = T.SITES[M.planted.s].k; row.plants[k] = (row.plants[k] || 0) + 1; }
          if (M.phase === 'end' && M.last && !M.last.seen3) { M.last.seen3 = true; row.rounds++; row.why[M.last.why] = (row.why[M.last.why] || 0) + 1; }
          M.fs.forEach((f, q) => { const st = still[q]; if (M.phase !== 'live' || !f.alive || T.sideOf(f) !== 'att' || M.planted) { st.t = 0; st.x = f.x; st.z = f.z; st.flag = false; return; }
            if (Math.hypot(f.x - st.x, f.z - st.z) > 1.5) { st.t = 0; st.x = f.x; st.z = f.z; st.flag = false; } else if ((st.t += DT) > 20 && !st.flag) { st.flag = true; row.stalls++; if (row.stalls <= 2) console.log(`    ${mp.n} round ${M.round}: attacker still for 20 s at ${f.x.toFixed(1)}, ${f.z.toFixed(1)}, plan ${f.bot.plan && f.bot.plan.k} ${f.bot.plan && f.bot.plan.lane}`); } });
        }
        if (M.over) row.done++;
      } catch (e) { row.err = e.stack.split('\n').slice(0, 3).join(' | '); }
    }
    const feat = Object.entries(use).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(' ');
    const good = !row.err && row.done === per && row.stalls <= per * 2 && Object.keys(row.plants).length >= 1;
    if (!good) allOk = false;
    console.log(`  ${good ? 'ok  ' : 'FAIL'} ${mp.n.padEnd(13)} ${row.done}/${per} done, ${row.rounds} rounds, plants ${JSON.stringify(row.plants)}, ${Object.entries(row.why).map(([k, v]) => `${k} ${v}`).join(' ')}${row.stalls ? `, ${row.stalls} stalls` : ''}${feat ? '  [' + feat + ']' : ''}${row.err ? '  ERR ' + row.err : ''}`);
  });
  ok(allOk, 'every map plays out with bots: no errors, matches finish, attackers keep moving and plant');
}

// abilities bought by the charge, the free signature, and the ultimate with its points and orbs
function ultChecks() {
  section('abilities and ultimates');
  let I = idle(); T.setInput(() => I);
  T.seed(3); T.startMatch({ mode: 'bot', diff: 0, map: 0 }); T.skipLoad(); let M = T.M, P = T.me(), F = T.foe(); P.op = 'vex';
  ok((P.ab.q | 0) === 0 && P.ab.e === 1 && (P.ult | 0) === 0, 'a match starts with no bought charges, the signature, and no ultimate points', JSON.stringify({ ab: P.ab, ult: P.ult }));
  const Q = T.OPS.vex.q, c0 = P.credits; T.buy(P, 'abq'); T.buy(P, 'abq'); const c2 = P.credits, n2 = P.ab.q; T.buy(P, 'abq'); const c3 = P.credits;
  ok(n2 === Q.max && P.ab.q === Q.max - 1 && c0 - c2 === Q.cost * Q.max && c3 === c2 + Q.cost, `Q is bought by the charge (◈ ${Q.cost}, up to ${Q.max}); pressing again at the most sells one back`, `credits ${c0} -> ${c2} -> ${c3}, charges ${P.ab.q}`);
  T.buy(P, 'abq'); M.phase = 'live'; M.t = 60; T.ability(P, 'e'); T.ability(P, 'q'); const used = { q: P.ab.q, e: P.ab.e };
  T.startRound(2); ok(P.ab.q === used.q && P.ab.e === 1, 'unused charges carry into the next round, the signature comes back', JSON.stringify({ before: used, after: P.ab }));
  T.startRound(5); ok((P.ab.q | 0) === 0, 'bought charges are cleared when sides swap', JSON.stringify(P.ab));
  // ultimate points: a death, a kill, a plant, an orb; capped at the cost
  T.startRound(6); M.phase = 'live'; M.t = 60; P.ult = 0; F.ult = 0; Object.assign(F, { x: P.x + 4, z: P.z, alive: true, hp: 100 }); T.applyDamage(F, 200, P, false, 'quill');
  ok(P.ult === 1 && F.ult === 1, 'a kill gives the killer a point, and the one who died a point', `${P.ult}, ${F.ult}`);
  ok(M.orbs && M.orbs.length === 2 && T.ORBS.length === 2, 'two ultimate orbs on the map each round', JSON.stringify(T.ORBS));
  T.takeOrb(0, P); T.takeOrb(0, P); ok(P.ult === 2 && M.orbs[0].taken, 'an orb is a point, and only once', P.ult);
  // and holding F over the other one takes it
  const u0 = P.ult; T.startRound(7); M.phase = 'live'; M.t = 60; P.ult = u0; const o = M.orbs[1]; Object.assign(P, { x: o.x, z: o.z, y: T.hAt(o.x, o.z), alive: true }); I = { ...idle(), use: true }; run(1.2); I = idle();
  ok(P.ult === u0 + 1 && o.taken, 'holding F over an orb for a second takes it', P.ult);
  // each ultimate does what it says
  const setup = (op, gunKey) => { const [M2, P2, F2] = lab(gunKey); P2.op = op; P2.ult = T.ultCost(P2); F2.bot = { diff: 0, dummy: true, home: [50, 3] }; Object.assign(F2, { x: 50, z: 3, y: 0, hp: 100, sh: 0, alive: true, reveal: 0 }); P2.yaw = T.yawTo(P2.x, P2.z, 60, 3); P2.pitch = 0; I = idle(); return [M2, P2, F2]; };
  [M, P, F] = setup('vex'); P.pitch = -.05; const to = [P.x - Math.sin(P.yaw) * 10, P.z - Math.cos(P.yaw) * 10]; T.ability(P, 'x');
  ok(P.ult === 0 && P.chan, 'using the ultimate spends its points', P.ult); run(1.4);
  ok(Math.hypot(P.x - to[0], P.z - to[1]) < 3, 'Vex Nightwalk: a second of gathering, then out where you aimed', `${P.x.toFixed(1)}, ${P.z.toFixed(1)} vs ${to.map(v => v.toFixed(1))}`);
  [M, P, F] = setup('iris'); Object.assign(F, { x: 33, z: 15 }); T.ability(P, 'x'); ok(F.reveal >= 5, 'Iris Allsight: every rival shows through walls', F.reveal.toFixed(1));
  [M, P, F] = setup('bastion'); P.hp = 40; T.ability(P, 'x'); const h0 = P.hp, s0 = P.sh; T.applyDamage(P, 40, F, false, 'quill');
  ok(h0 === 100 && s0 >= 50 && P.hp + P.sh === 100 + s0 - 20, 'Bastion Bulwark: full health, a heavy shield, half damage', `hp ${h0}, shield ${s0}, after 40: ${P.hp}+${P.sh}`);
  [M, P, F] = setup('nova', 'vesper'); T.ability(P, 'x'); I = { ...idle(), mz: 1 }; run(.8); const G = T.M.fs[0]; ok(P.od > 0 && T.moveErr(P, { acc: { walk: 3, run: 6, jump: 9 } }) === 0, 'Nova Overdrive: running no longer throws your aim', `od ${P.od.toFixed(1)}, ${Math.hypot(P.vx, P.vz).toFixed(1)} m/s`); I = idle();
  [M, P, F] = setup('wraith'); Object.assign(F, { x: P.x + 2.5, z: P.z, yaw: T.yawTo(P.x + 2.5, P.z, P.x, P.z) }); const seen0 = T.canSee(F, P); T.ability(P, 'x'); const seen1 = T.canSee(F, P);
  ok(seen0 && !seen1 && P.phase > 0, 'Wraith Phase: unseen even close up', `before ${seen0}, after ${seen1}`);
  [M, P, F] = setup('talon'); Object.assign(P, { x: 33, z: 3 }); Object.assign(F, { x: 33, z: 15, bot: null }); P.yaw = T.yawTo(33, 3, 33, 15); P.pitch = Math.atan2(F.y + 1.05 - T.eyeY(P), 12);
  const sees0 = T.canSee(P, F); T.ability(P, 'x'); run(.5); ok(!sees0 && F.hp <= 25, 'Talon Piercer: a bolt straight through a wall', `wall between: ${!sees0}, rival ${Math.round(F.hp)} hp`);
  [M, P, F] = setup('ember'); Object.assign(F, { x: P.x + 9, z: P.z, bot: { diff: 0, dummy: true, home: [P.x + 9, P.z] } }); P.yaw = T.yawTo(P.x, P.z, F.x, F.z); P.pitch = -.12; T.ability(P, 'x'); run(3);
  ok(F.hp < 100 || !F.alive, 'Ember Inferno: a great blaze where it lands', `rival ${Math.round(F.hp)} hp`);
  [M, P, F] = setup('axiom'); Object.assign(F, { x: P.x + 9, z: P.z, bot: { diff: 0, dummy: true, home: [P.x + 9, P.z] } }); T.ability(P, 'x'); run(3);
  ok(F.lock > 0 && F.snare > 0, 'Axiom Lockdown: rivals in range are held', `lock ${F.lock.toFixed(1)}`);
  const sh0 = F.stat.shots; F.fireT = 0; F.bot = null; F.local = false; T.setInput(f => f === F ? { ...idle(), fire: true } : idle()); run(.5); ok(F.stat.shots === sh0, 'held, a rival cannot fire', F.stat.shots - sh0); T.setInput(() => I);
}

function hitboxChecks() {
  section('hitboxes');
  let [M, P, F] = lab('lancer'); T.setInput(() => idle());
  // the rival stands 6 m east of the shooter on open ground
  const place = o => { Object.assign(F, { x: P.x + 6, z: P.z, y: P.y, yaw: 0, pitch: 0, crouch: 0, vx: 0, vz: 0, sprinting: false, slide: null, alive: true }, o); };
  const shootAt = (q, from) => { if (from) Object.assign(P, from); const e = T.eyeY(P), dx = q[0] - P.x, dy = q[1] - e, dz = q[2] - P.z, L = Math.hypot(dx, dy, dz); return T.castShot(P, [dx / L, dy / L, dz / L]); };
  const part = s => !s.hit ? 'miss' : s.hit.head ? 'head' : s.hit.leg ? 'legs' : 'body';
  place({ crouch: 1, yaw: 0 });   // crouched, side on (facing north): the head is pushed forward and down off the feet
  const h = T.headOf(F); let s = shootAt([h.x, h.y, h.z]);
  ok(part(s) === 'head', 'a shot at a crouched rival\'s head is a headshot', `head ${(h.y - F.y).toFixed(2)} m up, ${Math.hypot(h.x - F.x, h.z - F.z).toFixed(2)} m ahead of the feet: ${part(s)}`);
  s = shootAt([F.x, F.y + 1.10, F.z - .02]);
  ok(part(s) !== 'head', 'the old spot (eye height straight above the feet) is no longer the head when crouched', part(s));
  place({ yaw: 0 });   // standing side on to the shooter (facing north): narrow front to back
  s = shootAt([F.x, F.y + 1.2, F.z + .32]);
  ok(part(s) === 'miss', 'a shot 32 cm behind a side-on back misses (the old square box took it)', part(s));
  s = shootAt([F.x, F.y + 1.2, F.z - .15]);
  ok(part(s) === 'body', 'a shot at a side-on chest hits the body', part(s));
  place({ yaw: Math.PI / 2 });   // facing the shooter square on: shoulder wide
  s = shootAt([F.x, F.y + 1.2, F.z + .26]);
  ok(part(s) === 'body', 'facing you, the body is shoulder wide', part(s));
  s = shootAt([F.x, F.y + .7, F.z]);
  ok(part(s) === 'legs', 'below the hips is the legs', part(s));
  place({ yaw: 0 });   // the arms and gun held out in front (to the north) are body
  s = shootAt([F.x + .04, F.y + 1.38, F.z - .45]);
  ok(part(s) === 'body', 'the arms held out in front count as body', part(s));
  place({ yaw: Math.PI / 2 });   // up close and low, the bullet meets the chest before it reaches the head
  { const hh = T.headOf(F), from = { x: F.x - .62, z: F.z, crouch: 1 }; s = shootAt([hh.x, hh.y, hh.z], from);
    ok(part(s) === 'body', 'whichever part a bullet meets first is the one it hits', part(s)); Object.assign(P, { crouch: 0 }); }
  [M, P, F] = lab('lancer'); place({ vx: 0, vz: -7, sprinting: true });   // sprinting north, leaning into it
  { const hh = T.headOf(F); s = shootAt([hh.x, hh.y, hh.z]); ok(part(s) === 'head' && Math.hypot(hh.x - F.x, hh.z - F.z) > .15, 'a sprinting rival\'s head leans into the run, and that is where it is hit', part(s)); }
}

function printMap() {
  const g = T.SRC.map(r => [...r]); let n = 0;
  const mark = (pts, ch) => { for (const p of pts) { const i = Math.floor(p[0] / T.CS), j = Math.floor(p[1] / T.CS); if (g[j] && '.oAD'.includes(g[j][i])) g[j][i] = ch; } };
  for (const pts of Object.values(T.ROUTES)) { let [x, z] = T.SPAWN.att[0]; n++; for (const p of [...pts, T.siteC]) { mark(T.findPath(x, z, p[0], p[1]), String(n)); x = p[0]; z = p[1]; } }
  mark(T.HOLDS.map(h => h.p), 'H');
  console.log(g.map(r => r.join('')).join('\n') + '\n' + Object.keys(T.ROUTES).map((k, i) => `${i + 1} ${k}`).join('   ') + '   H hold spot');
}

const arg = process.argv[2];
if (arg === 'map') { printMap(); process.exit(0); }
if (arg === 'matches') matchChecks(+process.argv[3] || 20);
else if (arg === 'two') twoSiteChecks(+process.argv[3] || 12);
else if (arg === 'maps') everyMapChecks(+process.argv[3] || 2);
else if (arg === 'quick') { mapChecks(); gunplayChecks(); firstShotChecks(); hitboxChecks(); moveChecks(); loadChecks(); }
else if (arg === 'hit') hitboxChecks();
else if (arg === 'teams') { teamChecks(7); teamChecks(6, 3); teamChecks(8, 4); }
else if (arg === 'kits') kitChecks();
else if (arg === 'ults') ultChecks();
else if (arg === 'skins') skinChecks();
else if (arg === 'progress') progressChecks();
else if (arg === 'kit2') kit2Checks();
else if (arg === 'copperleaf') copperleafChecks();
else { mapChecks(); gunplayChecks(); firstShotChecks(); hitboxChecks(); moveChecks(); loadChecks(); kitChecks(); ultChecks(); skinChecks(); progressChecks(); kit2Checks(); teamChecks(7); teamChecks(6, 3); teamChecks(8, 4); matchChecks(20); twoSiteChecks(12); copperleafChecks(); }
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
