// ARROWWOOD maps in Node (no browser): every map is fair and playable.
//   node tools/arrowwood-maps-test.mjs [map ...]
// For each map: spawns and free-for-all spawns stand clear (and out of the water), targets aren't buried, the overtime ground,
// the flanks and the other camp can be walked to from both camps (a walk over a 1 m grid with the real step and wall rules),
// the map is the same turned half a circle, and full bot matches (1v1, 2v2, free for all) play out with eliminations.
import * as W from '../arrowwood/shared/world.js';
import * as E from '../arrowwood/server/engine.js';
let fails = 0; const ok = (c, name, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : '')); };
const ids = process.argv.slice(2).length ? process.argv.slice(2) : W.MAP_IDS;
for (const id of ids) {
  W.useMap(id); console.log(`\n${W.mapInfo().n} (${id}): ${W.TREES.length} trees, ${W.BOXES.length} boxes, ${W.TARGETS.length} targets, zone "${W.ZONE.name}"`);
  const g = (x, z) => W.groundAt(x, z, W.terrainH(x, z) + 3);
  const clear = ([x, z]) => !W.blocked(x, g(x, z), z) && !W.inWater(x, z, g(x, z) + .3);
  ok([...W.SPAWNS[0], ...W.SPAWNS[1]].every(clear), 'team spawns stand clear');
  const badFfa = W.FFA_SPAWNS.filter(s => !clear(s)); ok(!badFfa.length, 'free-for-all spawns stand clear and dry', badFfa.map(s => s.map(v => v.toFixed(0)).join(',')).join(' '));
  const buried = W.TARGETS.filter(k => k.kind === 'ground' && (W.blocked(k.x, k.y - 1.25, k.z, 1) || W.inWater(k.x, k.z, k.y - 1.2))); ok(!buried.length, 'targets on posts stand in the open', buried.length);
  // the half turn: every box and tree has its twin
  const twin = (list, f) => list.every(a => list.some(b => Math.abs(b.x - (140 - a.x)) < .01 && Math.abs(b.z - (140 - a.z)) < .01 && f(a, b)));
  if (id !== 'kingswood') ok(twin(W.BOXES, (a, b) => Math.abs((a.y1 - a.y0) - (b.y1 - b.y0)) < .6 || a.kind === 'plinth') && twin(W.TREES, () => true), 'point-symmetric: every box and trunk has its half-turn twin');   // (the King's Wood pairs the Old Tower with Split Oak instead)
  ok(Math.abs(W.terrainH(30, 100) - W.terrainH(110, 40)) < 1e-6 && Math.abs(W.terrainH(57, 81) - W.terrainH(83, 59)) < 1e-6, 'the ground is the same turned round');
  // walk the 1 m grid from a camp: a step may rise at most PL.step, and a body must fit
  const reach = (sx, sz) => { const N = 141, seen = new Uint8Array(N * N), H = new Float32Array(N * N).fill(NaN), q = [[sx, sz]]; seen[sz * N + sx] = 1; H[sz * N + sx] = g(sx, sz);
    while (q.length) { const [x, z] = q.pop(); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz; if (nx < 7 || nz < 7 || nx > 133 || nz > 133 || seen[nz * N + nx]) continue;
      const y0 = H[z * N + x], y1 = W.groundAt(nx, nz, y0 + .3); if (y1 - y0 > W.PL.step + .02 || W.blocked(nx, y1, nz) || W.blocked((x + nx) / 2, Math.max(y0, y1), (z + nz) / 2)) continue; seen[nz * N + nx] = 1; H[nz * N + nx] = y1; q.push([nx, nz]); } }
    return (x, z) => { for (let r = 0; r <= 2; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (seen[(Math.round(z) + b) * N + Math.round(x) + a]) return true; return false; }; };
  const fromS = reach(70, 126), fromN = reach(70, 14);
  const goals = [['the other camp', 70, 14, 70, 126], ['the overtime ground', W.ZONE.x, W.ZONE.z, W.ZONE.x, W.ZONE.z], ...W.AREAS.filter(a => !/Camp/.test(a.n)).map(a => [a.n, a.x, a.z, a.x, a.z])];
  const missing = goals.filter(([n, x1, z1, x2, z2]) => !fromS(x1, z1) || !fromN(x2, z2)); ok(!missing.length, 'both camps can walk to the other camp, the overtime ground and every landmark', missing.map(m => m[0]).join(', '));
  const lost = W.FFA_SPAWNS.filter(([x, z]) => !fromS(x, z)); ok(!lost.length, 'every free-for-all spawn joins the rest of the wood', lost.length);
  // bot matches
  for (const mode of ['1v1', '2v2', 'ffa']) {
    const room = E.createRoom({ code: 'T', mode, offline: true, map: id, fast: true }), me = E.join(room, { name: 'Me' }).id;
    E.fillBots(room, 'hard'); E.message(room, me, { t: 'start' }); let res = null, elims = 0, shots = 0, ot = 0, maxT = 0, bad = 0;
    for (let i = 0; i < 20 * 900 && !res; i++) { const p = room.players.get(me); if (p.st.alive) { p.st.x = 70; p.st.z = 133; p.st.y = W.terrainH(70, 133); } E.step(room);
      for (const o of E.drain(room)) { if (o.m.t === 'results') res = o.m; if (o.m.t === 'elim') elims++; if (o.m.t === 'shot') shots++; if (o.m.t === 'overtime') ot++; }
      for (const q of room.players.values()) if (!Number.isFinite(q.st.x + q.st.y + q.st.z)) bad++; maxT = room.t; }
    ok(res && elims + ot >= 2 && !bad && room.map === id, `${mode}: a bot match plays out on this map`, res ? `${res.score ? res.score.join('-') : ''} ${res.reason}, ${elims} eliminations, ${shots} shots${ot ? ', ' + ot + ' overtime' : ''}, ${maxT.toFixed(0)} s` : `no result after ${maxT.toFixed(0)} s, ${elims} eliminations`);
  }
}
// a random room draws a map per match and says so before anyone is placed
{ const room = E.createRoom({ code: 'R', mode: '1v1', offline: true, map: 'random', fast: true }), me = E.join(room, { name: 'Me' }).id; E.fillBots(room, 'normal'); E.drain(room);
  const seen = new Set(); let order = true;
  for (let k = 0; k < 6; k++) { for (const q of room.players.values()) q.ready = true; E.message(room, me, { t: 'start' }); const out = E.drain(room), mi = out.findIndex(o => o.m.t === 'map'), ci = out.findIndex(o => o.m.t === 'corr'); if (mi < 0 || (ci >= 0 && ci < mi)) order = false; if (mi >= 0) seen.add(out[mi].m.id); room.phase = 'lobby'; }
  ok(seen.size >= 2 && order, 'a random room picks a fresh map each match and announces it before placing anyone', [...seen].join(', ')); }
{ const room = E.createRoom({ code: 'P', mode: 'practice', map: 'mirewood' }); ok(room.map === 'kingswood', 'the practice range is always the King\'s Wood'); }
console.log(fails ? `\n${fails} FAILED` : '\nALL OK');
process.exit(fails ? 1 : 0);
