// Runs Duelpoint's simulation parts (10 to 60) in Node, with no page and no renderer, and checks the rules the design asks for.
//   node tools/duelpoint-sim-test.mjs            every check
//   node tools/duelpoint-sim-test.mjs map        print the map with the attack routes (1-4) and hold spots (H)
//   node tools/duelpoint-sim-test.mjs matches N  only the bot matches, N of them (default 20)
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
  return { SRC, get GW() { return GW; }, get GH() { return GH; }, CS, findPath, pathLen, SPAWN, SITE, siteC, ROUTES, HOLDS, SITES, MAPS, mapPool, dailyStore, storeLeft, codeHash, ALL_SKINS_HASH, allSkinIds, LINES, skinOfId, skinPrice, skinSort, botSkins, matchCoins, roundT, loadingNow, skipLoad, LOAD_T, BUY_T, hAt, hMove, rayGrid, walkLine, NAV, idx, GUNS, dmgAt, CASH, DIFF, D2R, SPD, WIN_ROUNDS, WHY, SPRINT, SLIDE_V, diffFor, STATS, MAPS, loadMap,
    seed, startMatch, tick, buy, fire, altAction, reload, spreadOf, patOf, moveErr, switchTo, giveAmmo, applyDamage, endRound, startRound, sideOf, me, foe, on, eyeY, yawTo, canSee, ability, onSite, areaAt,
    hitboxes, headOf, castShot, viewDir, BRKS, BRKX, lootAt, setCharge, ultCost, OPS, takeOrb, ORBS, hasAb, plantAt, stepKits: dt => stepKits(dt), get M() { return M; }, setInput: fn => { readInput = fn; } };`)(K, MP);

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
  M.phase = 'live'; T.endRound(0, 'elim_def'); ok(P.credits === 3200 && F.credits === 2400, 'win +2600, first loss +1600', P.credits + ' ' + F.credits);
  M.phase = 'live'; T.endRound(0, 'elim_def'); M.phase = 'live'; T.endRound(0, 'elim_def'); ok(F.credits === 2400 + 2000 + 2400, 'losses pay 1600, 2000, then 2400');
  P.alive = true; T.startRound(5); ok(P.credits === 800 && P.guns[2] === 'pip' && !P.guns[1], 'round 5 is a pistol round: everyone back to 800 and a pistol');
  ok(F.lossRun === 0, 'the loss bonus starts again at the half', 'loss run ' + F.lossRun); M.phase = 'live'; T.endRound(0, 'elim_def'); ok(F.credits === 800 + 1600, 'so losing the second pistol round pays 1600, not 2400', F.credits);
}

// whole matches, bot against bot, watching for errors, fighters that stop moving, and rounds that never end
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
  [M, P, F] = lab(); M.chargePing = null; T.setCharge(null, P.x + 5, P.z, false, P);
  ok(M.chargePing && Math.abs(M.chargePing.x - (P.x + 5)) < .01, 'the charge going down mid-round pings where it lies');
  [M, P, F] = lab('lancer'); P.op = 'nova'; P.ab.q = 0; F.hp = 1; F.sh = 0; T.applyDamage(F, 50, P, false, 'lancer');
  ok(!F.alive && P.ab.q === 1, 'Nova gets a Surge back for a kill', `q ${P.ab.q}`);
  [M, P, F] = lab('lancer'); P.op = 'nova'; P.ab.q = T.OPS.nova.q.max; F.hp = 1; F.sh = 0; T.applyDamage(F, 50, P, false, 'lancer');
  ok(P.ab.q === T.OPS.nova.q.max, 'but never more than she can carry', `q ${P.ab.q}`);
  [M, P, F] = lab('lancer'); P.op = 'vex'; P.ab.q = 0; F.hp = 1; F.sh = 0; T.applyDamage(F, 50, P, false, 'lancer'); ok(P.ab.q === 0, 'other operatives get no free charge');
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
  [M, P, F] = setup('wraith'); F.bot = { diff: 1 }; F.team = 1; Object.assign(F, { x: 56, z: 9 }); T.ability(P, 'e'); run(.5);
  ok(F.bot.last && F.bot.last.heard && Math.hypot(F.bot.last.x - M.kit.lures[0].x, F.bot.last.z - M.kit.lures[0].z) < .1, 'Wraith Ghost Step: a rival bot hears it as real', JSON.stringify(F.bot.last && { x: +F.bot.last.x.toFixed(1), z: +F.bot.last.z.toFixed(1) }));
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
  const pool = T.mapPool(2), bySite = [0, 0, 0], why = {}, sizes = {}; let rounds = 0, plants = 0, done = 0, err = 0, boomWins = 0;
  ok(pool.length === 6 && T.mapPool(1).length === 7, 'six two-site maps and seven one-site maps', `${pool.length} and ${T.mapPool(1).length}`);
  for (let n = 0; n < count; n++) {
    try {
      T.seed(n * 6151 + 17); const size = [1, 2, 1, 4][n % 4]; sizes[size] = (sizes[size] || 0) + 1; T.startMatch({ mode: 'bot', diff: 1, size, map: pool[n % pool.length] }); const M = T.M; M.fs[0].bot = { diff: 1 + (n % 2) }; M.fs[0].local = false;
      if (!n) ok(T.SITES.length >= 2 && T.roundT() >= 100, 'a STANDARD map has two or three sites and rounds of 100 s or more', T.SITES.map(S => S.k + ' ' + S.cells.length + ' cells').join(', ') + ', ' + T.roundT() + ' s');
      let planted = false, lastRound = 0;
      for (let i = 0; i < 60 * 60 * 30 && !M.over; i++) {
        T.tick(DT);
        if (M.round !== lastRound) { lastRound = M.round; planted = false; }
        if (M.planted && !planted) { planted = true; plants++; bySite[M.planted.s]++; }
        if (M.phase === 'end' && M.last && !M.last.seen2) { M.last.seen2 = true; rounds++; why[M.last.why] = (why[M.last.why] || 0) + 1; if (M.last.why === 'boom') boomWins++; }
      }
      if (M.over) done++;
    } catch (e) { err++; console.log(e.stack); }
  }
  ok(!err, 'no errors'); ok(done === count, 'every match finishes', `${done}/${count}`);
  ok(bySite[0] > 0 && bySite[1] > 0, 'attackers plant on both sites', `A ${bySite[0]}, B ${bySite[1]}${bySite[2] ? ', C ' + bySite[2] : ''}`);
  ok(plants / Math.max(1, rounds) > .2 && boomWins > 0, 'planting is a real way to win', `${plants} plants in ${rounds} rounds, ${boomWins} won by the charge`);
  console.log(`    ${Object.entries(why).map(([k, v]) => `${T.WHY[k]} ${v}`).join(', ')}; team sizes ${Object.entries(sizes).map(([k, v]) => `${k}v${k} x${v}`).join(', ')}`);
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
else if (arg === 'quick') { mapChecks(); gunplayChecks(); hitboxChecks(); moveChecks(); loadChecks(); }
else if (arg === 'hit') hitboxChecks();
else if (arg === 'teams') { teamChecks(7); teamChecks(6, 3); teamChecks(8, 4); }
else if (arg === 'kits') kitChecks();
else if (arg === 'ults') ultChecks();
else if (arg === 'skins') skinChecks();
else { mapChecks(); gunplayChecks(); hitboxChecks(); moveChecks(); loadChecks(); kitChecks(); ultChecks(); skinChecks(); teamChecks(7); teamChecks(6, 3); teamChecks(8, 4); matchChecks(20); twoSiteChecks(12); }
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
