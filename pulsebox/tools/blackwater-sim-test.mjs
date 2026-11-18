// Runs Blackwater Drift's simulation (parts 10-40) in Node and plays through the survival checklist.
//   node tools/blackwater-sim-test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'games', 'blackwater');
const code = fs.readdirSync(dir).filter(f => /^[1-4]\d-.*\.js$/.test(f)).sort().map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const K = { save: {}, persist() {} };
const T = new Function('K', code + `
  return { S, RAFT: () => RAFT, DRIFT, PL, HK, FS, FL, SH, CT, INV, act, lifeTick, newRun, addFloater, waterH, seaFrame, spawnGiant, spawnPool, summon, give, place, cellAt, exposed,
    seed, on, snapshot, loadRun, craftable, eat, toWorld, eyePos, CS, DECK, ui, FISH, cellUnder, ckey, hurtCell, SAIL, canPlace, platformAt, TOOLS, PIECES, SPN };`)(K);
let failed = 0;
const ok = (c, name, extra = '') => { if (!c) failed++; console.log((c ? '  ok   ' : '  FAIL ') + name + (extra !== '' ? '  (' + extra + ')' : '')); };
const section = n => console.log('\n' + n);
const DT = 1 / 60, I0 = () => ({ mx: 0, mz: 0, jump: false, brace: false, use: false });
let I = I0(); const run = (s, each) => { for (let i = 0; i < Math.round(s / DT); i++) { T.lifeTick(DT, I); if (each && each() === true) return true; } return false; };
const lookAt = (x, y, z) => { const e = T.eyePos(); T.PL.yaw = Math.atan2(-(x - e[0]), -(z - e[2])); T.PL.pitch = Math.atan2(y - e[1], Math.hypot(x - e[0], z - e[2])); };
const fresh = () => { T.seed(5); T.newRun(); T.S.pt = 9999; T.SH.t = 9999; T.S.nextPool = 9999; T.FL.length = 0; T.SPN = null; };

section('waves and buoyancy');
fresh(); T.seaFrame();
ok(T.RAFT().cells.size === 4 && T.PL.onRaft, 'you start alone on a tiny raft (2 x 2)', T.RAFT().cells.size + ' cells');
ok(T.PL.tools.hook && T.PL.tools.torch && !T.PL.torch, 'with a rope hook and an unlit torch');
let ys = []; run(10, () => { ys.push(T.RAFT().y); });
ok(Math.max(...ys) - Math.min(...ys) > .15, 'the raft rides the swell', `heave range ${(Math.max(...ys) - Math.min(...ys)).toFixed(2)} m`);
{ const R = T.RAFT(); const h = T.waterH(R.x, R.z); ok(Math.abs(R.y + .12 - h) < .5, 'it sits at the water line', `raft ${R.y.toFixed(2)}, sea ${h.toFixed(2)}`); }
// a giant swell: the near side lifts first, then the whole raft rides up and drops
fresh(); T.S.sea = T.S.seaTo = .2; run(2); const R0 = T.RAFT();
T.spawnGiant(R0, 6, 0); const g = T.S.giants[0]; g.s = R0.x - 140;
let peak = -9, minP = 0, maxP = 0, tPeak = 0, tPitch = 0, tt = 0;
run(25, () => { tt += DT; const R = T.RAFT(); if (R.y > peak) { peak = R.y; tPeak = tt; } if (Math.abs(R.roll) > Math.abs(maxP)) { maxP = R.roll; tPitch = tt; } });
ok(peak > 4, 'a giant swell lifts the raft right up', `peak ${peak.toFixed(1)} m`);
ok(Math.abs(maxP) > .12 && tPitch < tPeak, 'the side the crest reaches first rises before the top (it tilts up the face)', `tilt ${(maxP * 57).toFixed(0)}° at ${tPitch.toFixed(1)} s, top at ${tPeak.toFixed(1)} s`);
ok(T.RAFT().y < peak - 3, 'and drops into the trough behind it', T.RAFT().y.toFixed(1));

section('hook a barrel');
fresh(); run(1);
{ const e = T.eyePos(); const b = T.addFloater('barrel', e[0] + 9, e[2] + 2); lookAt(b.x, b.y + 1.2, b.z);
  T.PL.tool = 'hook'; T.act.useDown(); run(.6); T.act.useUp(); const st = T.HK.state;
  let splashed = false; run(4, () => { if (T.HK.state === 'water') { splashed = true; return true; } });
  ok(st === 'fly' && splashed, 'the hook arcs through the air and lands in the water', `${Math.hypot(T.HK.x - e[0], T.HK.z - e[2]).toFixed(1)} m out`);
  // walk the hook onto the barrel if the throw fell short: reel while sweeping
  T.HK.x = b.x + .5; T.HK.z = b.z; run(.2);
  ok(T.HK.items.includes(b), 'it snags the barrel');
  I.use = true; const before = T.PL.pickups, inv0 = JSON.stringify(T.INV); let t = 0; run(30, () => { t += DT; return T.HK.state === 'idle'; }); I = I0();
  ok(T.PL.pickups === before + 1 && !T.FL.includes(b), 'reeling hauls it in and you open it', `${t.toFixed(1)} s, ${inv0} -> ${JSON.stringify(T.INV)}`); }
{ fresh(); run(1); const e = T.eyePos(); const p = T.addFloater('plank', e[0] + 9, e[2]); const q = T.addFloater('panel', e[0] + 9, e[2] + 1);
  const time = f => { T.HK.state = 'water'; T.HK.x = f.x; T.HK.z = f.z; T.HK.items = []; run(.1); I.use = true; let t = 0; run(40, () => { t += DT; return T.HK.state === 'idle'; }); I = I0(); return t; };
  const tp = time(p), tq = time(q); ok(tq > tp * 1.6, 'heavy salvage reels in more slowly', `plank ${tp.toFixed(1)} s, platform ${tq.toFixed(1)} s`); }
{ fresh(); run(1); const e = T.eyePos(); const p = T.addFloater('plank', e[0] + 1.6, e[2]); run(.1); const n = T.PL.pickups; T.act.interact(); ok(T.PL.pickups === n + 1, 'wreckage that drifts against the raft can be grabbed with E'); }
{ fresh(); let seen = 0, kinds = new Set(); for (let i = 0; i < 60 * 150; i++) { T.lifeTick(DT, I); } seen = T.FL.length; T.FL.forEach(f => kinds.add(f.k));
  ok(seen >= 5 && kinds.has('barrel') && kinds.has('crate'), 'salvage drifts past in groups, including barrels and crates early on', `${seen} pieces in view: ${[...kinds].join(', ')}`); }

section('expand the deck');
fresh(); T.give('plank', 12); T.give('rope', 5); T.give('scrap', 3);
ok(T.act.craft('hammer') && T.PL.tool === 'hammer', 'craft a hammer from salvage');
ok(T.place('foundation', 2, 0) && T.RAFT().cells.size === 5, 'snap a new foundation onto the edge', T.RAFT().cells.size + ' cells');
ok(!T.place('foundation', 5, 5), 'but not floating loose');
ok(T.place('wall', 2, 0, 0) && T.cellAt(T.RAFT(), 2, 0).walls[0], 'a wall on its outer edge');
ok(T.place('reinforce', 2, 0) && T.cellAt(T.RAFT(), 2, 0).reinforce, 'and reinforce it');

section('fish, cook and eat');
fresh(); T.give('plank', 10); T.give('rope', 6); T.give('scrap', 4); T.PL.pickups = 4;
ok(T.craftable().includes('rod') && T.act.craft('rod'), 'a fishing rod becomes craftable after a few pickups');
{ T.PL.tool = 'rod'; T.PL.yaw = 0; T.PL.pitch = .2; T.act.useDown(); run(.5); T.act.useUp(); let bit = false; run(30, () => { if (T.FS.state === 'bite') { bit = true; return true; } });
  ok(bit, 'the bobber lands and a fish bites'); I.use = true; let caught = false, snaps = 0, tick = 0;
  T.on('catch', () => { caught = true; }); T.on('snap', () => snaps++);
  run(60, () => { tick++; I.use = T.FS.tension < .82; return caught || T.FS.state === 'idle'; }); I = I0();
  const f = T.FS.last; ok(caught && f, 'reeling with the tension in hand lands it', f ? `${T.FISH[f.k].n}, ${(f.len * 100).toFixed(0)} cm, ${f.kg.toFixed(1)} kg` : 'got away');
  const h0 = T.PL.hunger = 50; T.act.select('food'); T.act.useDown(); ok(T.PL.hunger > h0, 'eating it fills you up', `${h0} -> ${T.PL.hunger.toFixed(0)}`); }
{ T.give('fish:mackerel'); T.give('tinder'); T.place('fire', 0, 0); const c = T.cellAt(T.RAFT(), 0, 0); T.PL.lx = 1.5; T.PL.lz = 0; T.PL.tool = 'hammer'; lookAt(...T.toWorld(T.RAFT(), 0, T.DECK, 0)); run(.1);
  T.act.interact(); ok(c.fire.lit, 'light the fire pit with dry tinder'); T.act.interact(); run(16); T.act.interact();
  ok(T.INV['cooked:mackerel'] === 1, 'cook a fish over it'); }

section('sharks');
fresh(); run(1);
{ const R = T.RAFT(), cellsBefore = R.cells.size; Object.assign(T.SH, { state: 'circle', t: .5, x: R.x + 10, z: R.z, ang: 0 }); T.PL.play = 999;
  let latched = false, fin = 0; run(30, () => { if (T.SH.state === 'circle') fin++; if (T.SH.state === 'bite') { latched = true; return true; } });
  ok(fin > 0 && latched, 'a fin circles, then the shark latches onto an exposed edge');
  run(20, () => T.RAFT().cells.size < cellsBefore);
  ok(T.RAFT().cells.size === cellsBefore - 1, 'it tears that foundation off the raft', `${cellsBefore} -> ${T.RAFT().cells.size} cells`); }
{ fresh(); T.give('plank', 9); T.give('scrap', 3); T.PL.pickups = 6; T.act.craft('spear'); run(1); const R = T.RAFT();
  Object.assign(T.SH, { state: 'circle', t: .1, x: R.x + 10, z: R.z }); T.PL.play = 999; run(20, () => T.SH.state === 'bite');
  const c = R.cells.get(T.SH.cell), [x, , z] = T.toWorld(R, c.i * T.CS, 0, c.j * T.CS); T.PL.lx = c.i * T.CS; T.PL.lz = c.j * T.CS; run(.05);
  let hits = 0; for (let n = 0; n < 6 && T.SH.state === 'bite'; n++) { lookAt(T.SH.x, T.SH.y + .2, T.SH.z); if (T.act.useDown() !== false) {} hits = T.SH.hits; run(.7); }
  ok(T.SH.state === 'flee' && R.cells.has(T.ckey(c.i, c.j)), 'the spear drives it off before it gets the piece', `${hits} hits, piece at ${Math.ceil(c.hp)}%`); }
{ fresh(); const R = T.RAFT(); for (const [i, j] of [[2, 0], [3, 0]]) R.cells.set(T.ckey(i, j), Object.assign({}, T.cellAt(R, 0, 0), { i, j, hp: 100, walls: [0, 0, 0, 0] }));
  T.hurtCell(T.cellAt(R, 2, 0), 200, 'shark'); ok(!R.cells.has('3,0') && T.DRIFT.length === 1, 'a piece cut off from the raft drifts away on its own');
  const d0 = T.DRIFT[0]; run(20); ok(Math.hypot(d0.x - R.x, d0.z - R.z) > 2, 'and floats off', Math.hypot(d0.x - R.x, d0.z - R.z).toFixed(1) + ' m'); }

section('whirlpool');
const pool = paddleOut => { fresh(); run(.5); const R = T.RAFT(), a = 0; const p = T.spawnPool(R, 1, [R.x + 30, R.z], 26, 300); p.age = 20;
  T.give('plank', 5); T.give('rope', 2); T.PL.pickups = 6; T.act.craft('oar'); let minD = 99;
  run(70, () => { const d = Math.hypot(p.x - R.x, p.z - R.z); minD = Math.min(minD, d); if (paddleOut && d < 50) { T.PL.yaw = Math.atan2(-(R.x - p.x), -(R.z - p.z)); I.use = true; } else I.use = false; });
  I = I0(); return [minD, Math.hypot(p.x - R.x, p.z - R.z)]; };
{ const [m1] = pool(false), [m2, end2] = pool(true);
  ok(m1 < 12, 'left alone, the current draws the raft in towards the middle', `closest ${m1.toFixed(1)} m`);
  ok(end2 > 40, 'paddling with the oar crosses the outer current and gets clear', `ended ${end2.toFixed(1)} m out (closest ${m2.toFixed(1)} m)`); }

section('Cthulhu');
fresh(); run(1);
{ T.S.tod = 12; T.summon(); ok(T.S.tod > 19.4, 'the test trigger waits for night'); const phases = []; T.on('cthulhu', p => phases.push(p)); run(100);
  ok(phases.join(',') === 'rumble,rise,tower,sink,gone', 'rumble, rise, tower, sink, gone', phases.join(','));
  ok(T.CT.cool > 0, 'then it does not return for several nights'); }
{ fresh(); run(1); T.summon(); let pools = 0, giant = 0, rings = 0; run(40, () => { pools = Math.max(pools, T.S.pools.length); giant = Math.max(giant, T.S.giants.length); rings = Math.max(rings, T.S.rings.length); });
  const R = T.RAFT(), angs = T.S.pools.map(p => Math.atan2(p.z - R.z, p.x - R.x)).sort((a, b) => a - b); let gap = 0; angs.forEach((a, i) => { gap = Math.max(gap, ((angs[(i + 1) % angs.length] - a) + 2 * Math.PI) % (2 * Math.PI)); });
  ok(rings >= 2 && giant >= 1 && pools === 4, 'foam rings, a big swell, and four whirlpools round the raft', `${rings} rings, ${pools} pools`);
  ok(gap > 1.6, 'with an opening between them to steer through', `widest gap ${(gap * 57).toFixed(0)}°`); }
{ let fired = 0; for (let n = 0; n < 2000; n++) { fresh(); T.seed(n * 7 + 1); T.S.nights = 5; T.CT.cool = 0; T.S.tod = 19.3999; T.lifeTick(DT * 3, I); if (T.CT.pending >= 0) fired++; }
  ok(fired > 15 && fired < 70, 'on its own it comes on about 2% of eligible nights', `${fired} of 2000`);
  fresh(); T.S.nights = 1; T.S.tod = 19.39; let early = 0; for (let n = 0; n < 2000; n++) { T.CT.pending = -1; T.S.nights = 1; T.S.tod = 19.3999; T.lifeTick(DT * 3, I); if (T.CT.pending >= 0) early++; }
  ok(early === 0, 'never in the first three nights'); }

section('weather');
fresh(); T.S.phase = 'build'; T.S.pt = .01; T.S.severe = true; let thunder = 0, flash = 0, maxSea = 0; T.on('thunder', () => thunder++); T.on('flash', () => flash++);
run(200, () => { maxSea = Math.max(maxSea, T.S.sea); });
ok(flash > 3 && thunder > 0 && thunder <= flash, 'lightning flashes, and its thunder follows later', `${flash} flashes, ${thunder} thunderclaps so far`);
ok(maxSea > .8, 'the sea builds up through the storm', maxSea.toFixed(2));

section('steering, a little');
// drift only, for a baseline
const drift = (setup, s = 60, each) => { fresh(); T.S.wind = T.S.windTo = 7; T.S.phase = 'calm'; T.S.pt = 9999; run(.5); const R = T.RAFT(); setup && setup(R); const x0 = R.x, z0 = R.z; run(s, each); I = I0(); return [R.x - x0, R.z - z0]; };
const wdir = () => [Math.cos(T.S.windAng), Math.sin(T.S.windAng)];
{ const [dx, dz] = drift(); const base = Math.hypot(dx, dz) / 60;
  const [px, pz] = drift(R => { T.give('plank', 5); T.give('rope', 2); T.PL.pickups = 6; T.act.craft('oar'); }, 60, () => { const [wx, wz] = wdir(); T.PL.yaw = Math.atan2(wz, -wx); I.use = true; });   // paddle across the wind
  const [wx, wz] = wdir(), across = Math.abs(px * -wz + pz * wx) / 60;
  ok(across > .08 && across < .45, 'the oar nudges the raft across the drift, but only a little', `${across.toFixed(2)} m/s across, drift ${base.toFixed(2)} m/s`);
  ok(T.PL.arms < .2, 'and your arms tire', T.PL.arms.toFixed(2)); }
// build a sail and a steering oar
const rig = R => { T.give('plank', 20); T.give('rope', 20); T.give('scrap', 10);
  ok(T.place('sail', 0, 0) && !T.place('helm', 1, 1), 'a sail can be built (the raft already has its one steering oar)'); T.cellAt(R, 0, 0).up = true; };
{ let sp = 0; const [dx, dz] = drift(R => { rig(R); R.yaw = Math.atan2(-Math.cos(T.S.windAng), -Math.sin(T.S.windAng)); }, 40, () => { sp = Math.hypot(T.RAFT().vx, T.RAFT().vz); });   // bow pointed downwind

  ok(T.SAIL.fill > .9 && sp > .6 && sp < 1.4, 'running before the wind, the sail fills and the raft moves, not fast', `fill ${T.SAIL.fill.toFixed(2)}, ${sp.toFixed(2)} m/s`); }
{ drift(R => { rig(R); R.yaw = Math.atan2(Math.cos(T.S.windAng), Math.sin(T.S.windAng)); }, 5);   // bow into the wind
  ok(T.SAIL.fill === 0, 'pointed into the wind it only flaps'); }
{ let y0 = 0; drift(R => { rig(R); y0 = R.yaw; T.PL.helm = T.ckey(0, 1); }, 20, () => { I.mx = -1; });
  const turned = T.RAFT().yaw - y0; ok(turned > .6 && turned < 2.6, 'at the helm, A turns the raft slowly', `${(turned * 180 / Math.PI).toFixed(0)}° in 20 s`); }
{ const [dx, dz] = drift(R => { T.give('plank', 5); T.give('rope', 5); T.give('scrap', 5); T.place('anchor', 0, 0); T.cellAt(R, 0, 0).up = true; }, 40);
  ok(Math.hypot(dx, dz) / 40 < .08, 'the anchor holds the raft almost still', (Math.hypot(dx, dz) / 40).toFixed(3) + ' m/s'); }
{ fresh(); T.give('plank', 30); T.give('rope', 20); const R = T.RAFT(), n0 = R.cells.size; ok(T.place('platform', 2, 0) && R.cells.size === n0 + 4, 'a platform adds four foundations at once', `${n0} -> ${R.cells.size}`); }
{ fresh(); const R = T.RAFT(); T.give('plank', 10); T.give('rope', 10); ok(T.place('net', 1, 0), 'a debris net hangs off an edge'); const c = T.cellAt(R, 1, 0);
  const [wx, wz] = T.toWorld(R, 1 * T.CS + 1.1 * (T.cellAt(R, 2, 0) ? 0 : 1), 0, 0); T.addFloater('plank', wx, wz); run(1); ok(c.store === 1, 'and catches wreckage that drifts into it'); }
{ fresh(); const R = T.RAFT(); T.give('plank', 5); T.give('scrap', 5); T.give('tinder', 2); T.place('lantern', 0, 0); T.S.tod = 22; run(.1); T.PL.play = 999;
  Object.assign(T.SH, { state: 'circle', t: .1, x: R.x + 10, z: R.z }); run(5); ok(T.SH.state === 'circle', 'at night sharks keep off the edges a lantern lights'); }
{ fresh(); T.give('scrap', 10); T.give('rope', 5); T.give('plank', 5); T.PL.pickups = 9; ok(!T.act.craft('spear2'), 'an upgrade needs the tool first');
  ok(T.act.craft('hook2') && T.PL.tool === 'hook', 'the metal hook upgrades the hook you have'); }

section('steering from the start');
{ fresh(); const R = T.RAFT(); ok([...R.cells.values()].some(c => c.obj === 'helm'), 'every raft starts with a steering oar');
  T.S.wind = T.S.windTo = 4; T.S.phase = 'calm'; T.S.pt = 9999; run(.5); T.PL.helm = T.ckey(0, 1); const y0 = R.yaw, x0 = R.x, z0 = R.z;
  run(20, () => { I.mx = -1; I.mz = 1; }); I = I0();
  ok(R.yaw - y0 > .3, 'at the helm, A turns it', ((R.yaw - y0) * 180 / Math.PI).toFixed(0) + '° in 20 s');
  ok(T.PL.helm, 'and W rows without letting go of the helm'); }

section('saving');
fresh(); T.give('plank', 7); T.place; const snap = JSON.parse(JSON.stringify(T.snapshot())); T.newRun(); T.loadRun(snap);
ok(T.INV.plank === 7 && T.RAFT().cells.size === 4, 'a saved raft comes back as it was');

console.log(failed ? `\n${failed} FAILED` : '\nall checks passed'); process.exit(failed ? 1 : 0);
