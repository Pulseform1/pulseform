// Duelpoint heatmaps: whole bot matches (5v5 by default) on each map, in Node with the game's own simulation, recording
// where every kill happens (the killer's spot and the victim's), how far apart they were, where fighters spend their time,
// which side takes each round and how, and which site gets the charge. Writes one JSON file per map; tools/duelpoint-
// heatmap.py draws them.
//   node tools/duelpoint-heatmap.mjs <out dir> [matches per map] [map keys, comma separated] [team size]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'games', 'duelpoint');
const parts = fs.readdirSync(dir).filter(f => /^[1-6]\d-.*\.js$/.test(f)).sort();
const code = parts.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const K = { save: {}, persist() {}, bot: false, state: 'play' }, MP = { online: () => false, isHost: () => true, send() {}, opts: {}, name: 'Tester', id: 0 };
const T = new Function('K', 'MP', code + `
  return { SRC, get GW() { return GW; }, get GH() { return GH; }, CS, MAPS, AREAS, AREA, SITES, NAV, idx, seed, startMatch, tick, on, sideOf, get M() { return M; } };`)(K, MP);

const out = process.argv[2] || 'heatmaps', per = +process.argv[3] || 10, only = process.argv[4] ? process.argv[4].split(',') : null, size = +process.argv[5] || 5, DT = 1 / 60;
fs.mkdirSync(out, { recursive: true });
let cur = null;
T.on('kill', (v, by) => { if (!cur || !v) return; const M = T.M, k = { v: [+v.x.toFixed(1), +v.z.toFixed(1)], vs: T.sideOf(v), ph: M.planted ? 'post' : 'pre', t: +(M.t || 0).toFixed(1) };
  if (by && by !== v) { k.k = [+by.x.toFixed(1), +by.z.toFixed(1)]; k.ks = T.sideOf(by); k.d = +Math.hypot(by.x - v.x, by.z - v.z).toFixed(1); } cur.kills.push(k); });
T.on('end', (wi, why) => { if (cur) { cur.rounds.push({ why, att: why === 'boom' || why === 'elim_def', site: T.M.planted ? T.M.planted.s : null }); } });

for (const mi of T.MAPS.keys()) {
  const def = T.MAPS[mi]; if (only && !only.includes(def.k)) continue;
  cur = { k: def.k, n: def.n, src: def.src, areas: def.areas, size, matches: 0, kills: [], rounds: [], occ: {}, t0: Date.now() };
  for (let n = 0; n < per; n++) {
    T.seed(n * 7907 + mi * 131 + 3); T.startMatch({ mode: 'bot', diff: 1, size, map: mi }); const M = T.M; M.fs[0].bot = { diff: 1 + (n % 2) }; M.fs[0].local = false;
    for (const f of M.fs) if (f.bot) f.bot.diff = 1 + ((n + (f.team | 0)) % 2);   // a mix of the middle two levels on both sides
    let s = 0;
    for (; s < 60 * 60 * 30 && !M.over; s++) {
      T.tick(DT);
      if (s % 30 === 0 && M.phase === 'live') for (const f of M.fs) { if (!f.alive) continue; const key = Math.floor(f.x / 2) + ',' + Math.floor(f.z / 2) + ',' + T.sideOf(f)[0]; cur.occ[key] = (cur.occ[key] || 0) + 1; }
    }
    cur.matches++;
  }
  cur.secs = (Date.now() - cur.t0) / 1000; delete cur.t0;
  fs.writeFileSync(path.join(out, def.k + '.json'), JSON.stringify(cur));
  const att = cur.rounds.filter(r => r.att).length;
  console.log(`${def.n.padEnd(14)} ${cur.matches} matches, ${cur.rounds.length} rounds, attackers won ${(100 * att / Math.max(1, cur.rounds.length)).toFixed(0)}%, ${cur.kills.length} kills, ${cur.secs.toFixed(0)} s`);
}
