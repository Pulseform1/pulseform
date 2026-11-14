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
  return { SRC, GW, GH, CS, findPath, pathLen, SPAWN, SITE, siteC, ROUTES, HOLDS, hAt, hMove, rayGrid, walkLine, NAV, idx, GUNS, CASH, DIFF, D2R, SPD, WIN_ROUNDS, WHY,
    seed, startMatch, tick, buy, fire, altAction, reload, spreadOf, patOf, moveErr, switchTo, giveAmmo, applyDamage, endRound, startRound, sideOf, me, foe, on, eyeY, yawTo, canSee, ability, onSite, areaAt,
    get M() { return M; }, setInput: fn => { readInput = fn; } };`)(K, MP);

let failed = 0;
const ok = (cond, name, extra = '') => { if (!cond) failed++; console.log((cond ? '  ok   ' : '  FAIL ') + name + (extra !== '' ? '  (' + extra + ')' : '')); };
const section = name => console.log('\n' + name);
const DT = 1 / 60, run = s => { for (let i = 0; i < Math.round(s / DT); i++) T.tick(DT); };
const idle = () => ({ mx: 0, mz: 0, walk: false, crouch: false, jump: false, use: false, fire: false });

function mapChecks() {
  section('map');
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
  T.seed(7); T.startMatch({ mode: 'bot', diff: 0 }); const M = T.M, P = T.me(), F = T.foe();
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
  [M, P] = lab('lancer'); I = { ...idle(), mx: .5 }; run(.7);
  ok(deg() > .3 && deg() < runErr * .6, 'walking is in between', deg().toFixed(2) + '°');
  [M, P] = lab('lancer'); I = { ...idle(), jump: true }; run(.2);
  ok(deg() >= 9, 'jumping is hopeless', deg().toFixed(1) + '°');
  [M, P] = lab('lancer'); I = { ...idle(), fire: true }; const climb = []; let t0 = 0; while (climb.length < 12) { T.tick(DT); t0 += DT; if (P.stat.shots > climb.length) climb.push(T.patOf(P, T.GUNS.lancer)[1] / T.D2R); }
  ok(Math.abs(t0 - 11 * 60 / 585) < .04, 'the fire rate is exact', `12 shots in ${t0.toFixed(3)} s, ${(11 * 60 / t0).toFixed(0)} a minute`);
  ok(climb[1] < climb[4] && climb[4] < climb[8] && Math.abs(climb[11] - 3.4) < .01, 'a spray climbs to its ceiling', climb.map(v => v.toFixed(1)).join(' '));
  ok(deg() > 2, 'and gets wide', deg().toFixed(2) + '°');
  I = idle(); run(.6);
  ok(P.spray === 0 && deg() <= .3, 'it settles within the recovery time once you let go', `spray ${P.spray.toFixed(2)}, ${deg().toFixed(2)}°, fireT ${P.fireT.toFixed(2)}, shots ${P.stat.shots}`);
  section('damage');
  const dmgTo = (gunKey, part, dist) => { const G = T.GUNS[gunKey], row = G.dmg.find(r => dist <= r[0]) || G.dmg[G.dmg.length - 1]; return row[part]; };
  ok(dmgTo('lancer', 1, 50) >= 150, 'a Lancer headshot kills through heavy shields at any range', dmgTo('lancer', 1, 50));
  ok(dmgTo('vesper', 1, 10) >= 150 && dmgTo('vesper', 1, 40) < 150, 'the Vesper only does so up close', `${dmgTo('vesper', 1, 10)} then ${dmgTo('vesper', 1, 40)}`);
  ok(Object.values(T.GUNS).every(G => G.melee || G.dmg.every(r => r[1] > r[2] && r[2] >= r[3])), 'head > body >= legs for every gun');
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
  M.phase = 'live'; T.endRound(0, 'elim_def'); ok(P.credits === 3800 && F.credits === 2700, 'win +3000, first loss +1900');
  M.phase = 'live'; T.endRound(0, 'elim_def'); M.phase = 'live'; T.endRound(0, 'elim_def'); ok(F.credits === 2700 + 2400 + 2900, 'losses pay 1900, 2400, then 2900');
  ok(P.credits === 9000, 'money stops at 9000', P.credits);
}

// whole matches, bot against bot, watching for errors, fighters that stop moving, and rounds that never end
function matchChecks(count) {
  section(`${count} bot matches`);
  const why = {}, post = {}; let rounds = 0, plants = 0, secs = 0, stuck = 0, bad = 0, unfinished = 0, kills = 0, heads = 0; const errors = [];
  for (let n = 1; n <= count; n++) {
    T.seed(n * 7919); T.startMatch({ mode: 'demo' }); const M = T.M; M.fs[0].bot.diff = n % 3; M.fs[1].bot.diff = (n + 1) % 3;
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
else { mapChecks(); gunplayChecks(); matchChecks(20); }
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
