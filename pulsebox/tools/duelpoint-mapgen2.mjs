// Lays out Duelpoint's two-site maps from a seed, keeps only fair ones, and writes them into src/games/duelpoint/30-map.js.
//   node tools/duelpoint-mapgen2.mjs          generate the six maps, check them, print them, write them in
// The plan of every map (44 by 30 cells of 2 m, so 88 by 60 m): attackers spawn in the west, defenders in the east.
// Site A is in the north-east, site B in the south-east. Each site has two ways in for attackers: its long lane along the
// edge of the map, through a doorway (the main), and a link up from Mid. Defenders reach both sites from their spawn,
// through a back door. A map is fair when:
//   every attacker route reaches its site in 8 to 18 s, the defender reaches each site in under 7.5 s and can rotate
//   between them in under 15 s, neither spawn can see the other or a site, and every open cell can be walked to.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'games', 'duelpoint');
const mapFile = path.join(dir, '30-map.js');
const parts = fs.readdirSync(dir).filter(f => /^[1-3]\d-.*\.js$/.test(f)).sort();
const code = parts.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const K = { save: {}, persist() {}, bot: false, state: 'play' }, MP = { online: () => false, isHost: () => true, send() {}, opts: {} };
const T = new Function('K', 'MP', code + `; return { MAPS, loadMap, findPath, pathLen, rayGrid, SPAWN, SITES, NAV, idx, CS, size: () => [GW, GH] };`)(K, MP);
const SPD = 5.4;

// theme, name, tagline, callouts [attacker spawn, A long, A site, Mid, B long, B site, defender spawn], seed base, roof over a lane
const THEMES = [
  ['harbor', 'Breakwater', 'A storm-battered port. Two loading yards, one charge.', ['Ferry Ramp', 'A Seawall', 'A Cranes', 'Customs', 'B Warehouse', 'B Drydock', 'Lighthouse'], 101, ''],
  ['neon', 'Skyline', 'Rooftop arcades over a city that never sleeps.', ['Elevators', 'A Billboards', 'A Helipad', 'Food Court', 'B Arcade', 'B Penthouse', 'Skybridge'], 211, 'B'],
  ['snow', 'Glacier Pass', 'A research outpost buried in the ice.', ['Snowcat Bay', 'A Ridge', 'A Antenna', 'Mess Hall', 'B Ice Cave', 'B Reactor', 'Bunker'], 307, 'B'],
  ['desert', 'Sandgate', 'An old caravan fort where the dunes meet the wall.', ['Caravan', 'A Ramparts', 'A Keep', 'Bazaar', 'B Cistern', 'B Tomb', 'Oasis'], 401, 'A'],
  ['jungle', 'Verdance', 'Temple ruins swallowed by the rainforest.', ['Landing', 'A Canopy', 'A Altar', 'Courtyard', 'B River', 'B Shrine', 'Waterfall'], 503, ''],
  ['lava', 'Ironworks', 'A foundry on the rim of a live caldera.', ['Rail Yard', 'A Catwalk', 'A Crucible', 'Pump Room', 'B Slag Tunnel', 'B Furnace', 'Control'], 601, 'B'],
];
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function layout(seed, roofLane) {
  const R = rng(seed), ri = (a, b) => a + Math.floor(R() * (b - a + 1)), W = 44, H = 30;
  const g = Array.from({ length: H }, (_, j) => Array.from({ length: W }, (_, i) => i === 0 || j === 0 || i === W - 1 || j === H - 1 ? '#' : '.'));
  const set = (i, j, c) => { if (i > 0 && j > 0 && i < W - 1 && j < H - 1) g[j][i] = c; };
  const at = (i, j) => g[j] && g[j][i];
  const rN = ri(9, 10), rS = ri(19, 20), mid = Math.round((rN + rS) / 2);
  const doors = [];
  const gapIn = (row, c0, w) => { for (let i = c0; i < c0 + w; i++) set(i, row, '.'); doors.push([c0, row, c0 + w - 1, row]); };
  // the lane walls between the long lanes and Mid (cols 6 to 37), with a crossing near the attackers and each site's link
  for (const r of [rN, rS]) for (let i = 6; i <= 37; i++) set(i, r, '#');
  const cross = [ri(9, 12), ri(9, 12)], linkA = ri(28, 30), linkB = ri(28, 30);
  gapIn(rN, cross[0], 2); gapIn(rS, cross[1], 2); gapIn(rN, linkA, 2); gapIn(rS, linkB, 2);
  // the east block between Mid and the defenders, and a shield for the attackers' spawn
  for (let j = rN + 1; j < rS; j++) for (let i = 32; i <= 37; i++) set(i, j, '#');
  for (let j = mid - 3; j <= mid + 2; j++) set(5, j, '#');
  // the defenders' spawn, behind its own wall, and the attackers'
  for (let j = mid - 2; j <= mid + 1; j++) { set(1, j, 'A'); set(2, j, 'A'); set(40, j, 'D'); set(41, j, 'D'); }
  for (let j = mid - 3; j <= mid + 2; j++) set(38, j, '#');
  // the site rooms: a wall across each long lane with the main doorway, and a back wall with the defenders' door
  const chA = ri(24, 26), chB = ri(24, 26), dA = ri(2, rN - 4), dB = ri(rS + 2, H - 5);
  for (let j = 1; j < rN; j++) if (j !== dA && j !== dA + 1 && j !== dA + 2) set(chA, j, '#'); doors.push([chA, dA, chA, dA + 1]);
  for (let j = rS + 1; j < H - 1; j++) if (j !== dB && j !== dB + 1 && j !== dB + 2) set(chB, j, '#'); doors.push([chB, dB, chB, dB + 1]);
  const bA = ri(2, rN - 4), bB = ri(rS + 2, H - 5);
  for (let j = 1; j < rN; j++) if (j !== bA && j !== bA + 1) set(38, j, '#'); doors.push([38, bA, 38, bA + 1]);
  for (let j = rS + 1; j < H - 1; j++) if (j !== bB && j !== bB + 1) set(38, j, '#'); doors.push([38, bB, 38, bB + 1]);
  // the sites: five by four (or five), a container in each, a crate at a corner
  const sA = ri(chA + 3, 32), sB = ri(chB + 3, 32), hA = ri(2, rN - 6), hB = ri(rS + 2, H - 7);
  const site = (s0, h0, ch, rows) => { for (let j = h0; j < h0 + rows; j++) for (let i = s0; i <= s0 + 4; i++) if (at(i, j) === '.') set(i, j, ch); };
  site(sA, hA, 'o', ri(4, 5)); site(sB, hB, 'q', ri(4, 5));
  const boxIn = (s0, h0, ch) => { const bx = s0 + ri(1, 3), by = h0 + ri(1, 2); set(bx, by, 'X'); if (R() < .6) set(bx + (R() < .5 ? 1 : 0), by + 1, 'X'); if (R() < .8) set(s0 + (R() < .5 ? 0 : 4), h0 + (R() < .5 ? 0 : 3), 'c'); };
  boxIn(sA, hA, 'o'); boxIn(sB, hB, 'q');
  // Mid: a building in the middle to break the long sightline, and crates
  const mx = ri(14, 19), mw2 = ri(3, 5), mh0 = mid - ri(1, 2), mh1 = mid + ri(0, 1);
  for (let j = mh0; j <= mh1; j++) for (let i = mx; i < mx + mw2; i++) set(i, j, '#');
  const place = (n, c, i0, i1, j0, j1, wide) => { for (let t = 0; t < n * 4 && n > 0; t++) { const i = ri(i0, i1), j = ri(j0, j1); if (at(i, j) !== '.') continue; set(i, j, c); if (wide && at(i + 1, j) === '.') set(i + 1, j, c); n--; } };
  place(ri(2, 3), 'X', 8, chA - 3, 2, rN - 2, true); place(ri(3, 5), 'c', 7, chA - 2, 1, rN - 1);
  place(ri(2, 3), 'X', 8, chB - 3, rS + 2, H - 3, true); place(ri(3, 5), 'c', 7, chB - 2, rS + 1, H - 2);
  place(ri(2, 3), 'X', 7, 30, rN + 2, rS - 2, true); place(ri(3, 5), 'c', 6, 31, rN + 1, rS - 1);
  place(ri(1, 2), 'c', chA + 1, 37, 1, rN - 1); place(ri(1, 2), 'c', chB + 1, 37, rS + 1, H - 2);
  place(ri(2, 3), 'c', 39, 42, 1, H - 2);
  // keep doorways and the cells either side of them clear
  for (const d of doors) for (let j = d[1] - 1; j <= d[3] + 1; j++) for (let i = d[0] - 1; i <= d[2] + 1; i++) if (at(i, j) === 'c' || at(i, j) === 'X') set(i, j, '.');
  const src = g.map(r => r.join(''));
  const roofs = roofLane === 'A' ? [{ r: [8, 1, chA - 1, rN - 1], h: 2.8 }] : roofLane === 'B' ? [{ r: [8, rS + 1, chB - 1, H - 2], h: 2.8 }] : [];
  const routes = {
    along: [[3, rN - 3], [chA - 1.5, dA + 1], [chA + 1.5, dA + 1]],
    amid: [[6.5, mid - 4.5], [linkA + 1, rN + 1.5], [linkA + 1, rN - 1.5]],
    bmid: [[6.5, mid + 4.5], [linkB + 1, rS - 1.5], [linkB + 1, rS + 1.5]],
    blong: [[3, rS + 3], [chB - 1.5, dB + 1], [chB + 1.5, dB + 1]],
  };
  return { src, roofs, doors, routes, rN, rS, mid, chA, chB, dA, dB, bA, bB, linkA, linkB, sA, sB, hA, hB };
}
function areasFor(L, n) {
  const { rN, rS, chA, chB } = L;
  return [
    { k: 'aspawn', n: n[0], r: [1, 1, 5, 28], col: '#8a9a5b', lane: 'any' },
    { k: 'along', n: n[1], r: [6, 1, chA - 1, rN - 1], col: '#2aa7a0', lane: 'along' },
    { k: 'asite', n: n[2], r: [chA, 1, 37, rN], col: '#ff8a3d', lane: 'any' },
    { k: 'mid', n: n[3], r: [6, rN + 1, 31, rS - 1], col: '#d9a441', lane: 'mid' },
    { k: 'blong', n: n[4], r: [6, rS + 1, chB - 1, 28], col: '#b5523f', lane: 'blong' },
    { k: 'bsite', n: n[5], r: [chB, rS, 37, 28], col: '#c46bff', lane: 'any' },
    { k: 'dspawn', n: n[6], r: [38, 1, 42, 28], col: '#4f7fb0', lane: 'any' },
  ];
}
const sees = (p, q) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]); return T.rayGrid(p[0], 1.6, p[1], (q[0] - p[0]) / L, 0, (q[1] - p[1]) / L, 200) >= L - .5; };
const walk = (a, b) => { const q = T.findPath(a[0], a[1], b[0], b[1]); return q.length ? T.pathLen(q, a[0], a[1]) / SPD : 1e9; };
function check(def) {
  T.MAPS.push(def); T.loadMap(T.MAPS.length - 1); T.MAPS.pop();
  const a = T.SPAWN.att[0], d = T.SPAWN.def[0], out = { ok: true, why: [], times: {} };
  for (const [name, pts] of Object.entries(def.routes)) {
    const S = T.SITES[def.rsite[name]].c; let x = a[0], z = a[1], t = 0;
    for (const p of [...pts.map(q => [q[0] * 2, q[1] * 2]), S]) { t += walk([x, z], p); x = p[0]; z = p[1]; }
    out.times[name] = t;
    if (t < 8 || t > 18) { out.ok = false; out.why.push(`${name} ${t > 1e8 ? 'no path' : t.toFixed(1) + 's'}`); }
  }
  const dA = walk(d, T.SITES[0].c), dB = walk(d, T.SITES[1].c), rot = walk(T.SITES[0].c, T.SITES[1].c);
  out.times.defA = dA; out.times.defB = dB; out.times.rotate = rot;
  if (dA > 7.5 || dB > 7.5) { out.ok = false; out.why.push(`defender slow ${dA.toFixed(1)}/${dB.toFixed(1)}`); }
  if (rot > 15) { out.ok = false; out.why.push(`rotate ${rot.toFixed(1)}s`); }
  const allSite = [...T.SITES[0].cells, ...T.SITES[1].cells];
  if (T.SPAWN.att.some(p => allSite.some(q => sees(p, q)) || T.SPAWN.def.some(q => sees(p, q)))) { out.ok = false; out.why.push('spawn sees'); }
  const seen = new Set(); const st = [[Math.floor(a[0] / 2), Math.floor(a[1] / 2)]];
  while (st.length) { const [i, j] = st.pop(), k = T.idx(i, j); if (k < 0 || seen.has(k) || !T.NAV[k]) continue; seen.add(k); st.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]); }
  const [GW, GH] = T.size(); let n = 0; for (let k = 0; k < GW * GH; k++) if (T.NAV[k]) n++; if (seen.size !== n) { out.ok = false; out.why.push(`${n - seen.size} cells cut off`); }
  return out;
}
// defender holds: near each site, watching where each way in arrives; and one in the middle of each site
function holdsFor(def, L, seed) {
  T.MAPS.push(def); T.loadMap(T.MAPS.length - 1); T.MAPS.pop();
  const R = rng(seed), out = [], [GW, GH] = T.size();
  const ent = [['along', 0, [L.chA + .5, L.dA + 1]], ['amid', 0, [L.linkA + 1, L.rN + .5]], ['blong', 1, [L.chB + .5, L.dB + 1]], ['bmid', 1, [L.linkB + 1, L.rS + .5]]];
  for (const [lane, s, e] of ent) {
    const E = [e[0] * 2, e[1] * 2], S = T.SITES[s].c, c = [];
    for (let j = 1; j < GH - 1; j++) for (let i = L.chA; i < 38; i++) {
      const k = T.idx(i, j); if (!T.NAV[k]) continue; const p = [i * 2 + 1, j * 2 + 1], dS = Math.hypot(p[0] - S[0], p[1] - S[1]), dE = Math.hypot(p[0] - E[0], p[1] - E[1]);
      if (dS < 14 && dE > 7 && dE < 22 && sees(p, E)) c.push(p);
    }
    for (let t = 0; t < 2 && c.length; t++) { const p = c.splice(Math.floor(R() * c.length), 1)[0]; out.push({ p: [p[0] / 2, p[1] / 2], look: e, lane, s }); }
  }
  out.push({ p: [T.SITES[0].c[0] / 2 + 1.5, T.SITES[0].c[1] / 2], look: [L.chA + .5, L.dA + 1], lane: 'any', s: 0 });
  out.push({ p: [T.SITES[1].c[0] / 2 + 1.5, T.SITES[1].c[1] / 2], look: [L.chB + .5, L.dB + 1], lane: 'any', s: 1 });
  return out;
}
const made = [];
for (const [theme, name, tag, names, base, roofLane] of THEMES) {
  let seed = base * 1000, def = null, L = null, tries = 0, res = null;
  for (;;) {
    L = layout(seed, roofLane);
    def = { k: name.toLowerCase().replace(/\W/g, ''), n: name, tag, theme, sites: 2, roundT: 100, src: L.src, roofs: L.roofs, doors: L.doors, areas: areasFor(L, names), routes: L.routes, rsite: { along: 0, amid: 0, bmid: 1, blong: 1 }, holds: [] };
    res = check(def); if (res.ok) break; seed++; if (++tries > 4000) throw new Error(name + ': no fair layout: ' + res.why.join(', '));
  }
  def.holds = holdsFor(def, L, seed);
  console.log(`${name} (seed ${seed}, ${tries} tries) ` + Object.entries(res.times).map(([k, v]) => `${k} ${v.toFixed(1)}s`).join(', ') + '\n' + def.src.join('\n') + '\n');
  made.push(def);
}
const js = made.map(d => '    ' + JSON.stringify(d).replace(/"(\w+)":/g, '$1: ').replace(/"/g, "'").replace(/,(?=\S)/g, ', ') + ',').join('\n');
let s = fs.readFileSync(mapFile, 'utf8');
if (!s.includes('/*@maps2*/')) s = s.replace(/(\n    \/\*@maps\*\/[\s\S]*?)\n  \];/, '$1\n    /*@maps2*/\n  ];');
s = s.replace(/\n    \/\*@maps2\*\/[\s\S]*?\n  \];/, '\n    /*@maps2*/\n' + js + '\n  ];');
fs.writeFileSync(mapFile, s); console.log('wrote', made.length, 'two-site maps');
