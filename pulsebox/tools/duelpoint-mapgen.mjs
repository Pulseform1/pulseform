// Lays out Duelpoint maps from a seed and keeps only fair ones, then writes them into src/games/duelpoint/30-map.js.
//   node tools/duelpoint-mapgen.mjs          generate the six maps, check them, print them, write them in
// A map is fair when: every attacker route reaches the site in 6 to 14 s, the defender gets there first (under 5.5 s),
// no attacker spawn can see the site or the defender spawn, and every open cell can be walked to.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'games', 'duelpoint');
const mapFile = path.join(dir, '30-map.js');
const parts = fs.readdirSync(dir).filter(f => /^[1-3]\d-.*\.js$/.test(f)).sort();
const code = parts.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const K = { save: {}, persist() {}, bot: false, state: 'play' }, MP = { online: () => false, isHost: () => true, send() {}, opts: {} };
const T = new Function('K', 'MP', code + `; return { MAPS, loadMap, findPath, pathLen, rayGrid, SPAWN, SITE, siteC, NAV, idx, GW, GH, CS };`)(K, MP);

const THEMES = [
  ['neon', 'Neon Row', ['Rooftops', 'Arcade', 'Market', 'Vault', 'Hotel', 'Subway'], 3],
  ['snow', 'Frostline', ['Ridge', 'Camp', 'Hangar', 'Reactor', 'Lodge', 'Ice Cut'], 11],
  ['desert', 'Dunewatch', ['Dunes', 'Gatehouse', 'Bazaar', 'Tomb', 'Fort', 'Canal'], 21],
  ['jungle', 'Overgrowth', ['Canopy', 'Outpost', 'Temple Steps', 'Shrine', 'Camp', 'Riverbed'], 37],
  ['lava', 'Foundry', ['Catwalk', 'Intake', 'Smelter', 'Crucible', 'Control', 'Slag Tunnel'], 53],
  ['space', 'Orbital', ['Observatory', 'Airlock', 'Hydroponics', 'Core', 'Command', 'Service Duct'], 71],
];
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function layout(seed, roofed) {
  const R = rng(seed), ri = (a, b) => a + Math.floor(R() * (b - a + 1)), W = 32, H = 22;
  const g = Array.from({ length: H }, (_, j) => Array.from({ length: W }, (_, i) => i === 0 || j === 0 || i === W - 1 || j === H - 1 ? '#' : '.'));
  const set = (i, j, c) => { if (i > 0 && j > 0 && i < W - 1 && j < H - 1) g[j][i] = c; };
  const rN = ri(5, 6), rS = ri(15, 16), mid = Math.round((rN + rS) / 2);
  // lane dividers, with doorways (2 wide) near the start, the middle and the site
  const gaps = { N: [ri(7, 10), ri(13, 16), ri(19, 23)], S: [ri(7, 10), ri(13, 16), ri(19, 23)] };
  for (const [r, key] of [[rN, 'N'], [rS, 'S']]) for (let i = 6; i <= 26; i++) if (!gaps[key].some(x => i === x || i === x + 1)) set(i, r, '#');
  // spawns behind shields
  for (let j = rN + 1; j < rS; j++) set(4, j, '#');
  for (let j = mid - 2; j <= mid + 1; j++) { set(1, j, 'A'); set(2, j, 'A'); set(29, j, 'D'); set(30, j, 'D'); }
  for (let j = rN + 2; j <= rS - 2; j++) set(27, j, '#');
  // the site, with a box in it
  const s0 = ri(19, 21);
  for (let j = mid - 2; j <= mid + 2; j++) for (let i = s0; i <= s0 + 4; i++) set(i, j, 'o');
  const bx = s0 + ri(1, 3), by = mid + ri(-1, 0); set(bx, by, 'X'); if (R() < .6) set(bx, by + 1, 'X');
  if (R() < .7) set(s0 + (R() < .5 ? 0 : 4), mid + (R() < .5 ? -2 : 2), 'c');
  // the middle: a wall with doorways between the yard and the site
  const mw = ri(11, 15), mg = [ri(rN + 1, mid - 2), ri(mid + 1, rS - 2)];
  for (let j = rN + 1; j < rS; j++) if (!mg.some(y => j === y || j === y + 1)) set(mw, j, '#');
  // cover: containers and crates in every lane
  const place = (n, c, i0, i1, j0, j1, sz) => { for (let t = 0; t < n; t++) { const i = ri(i0, i1), j = ri(j0, j1); if (g[j][i] !== '.') continue; set(i, j, c); if (sz) { if (g[j][i + 1] === '.') set(i + 1, j, c); } } };
  place(ri(2, 3), 'X', 7, 24, 2, rN - 2, true); place(ri(3, 5), 'c', 6, 26, 1, rN - 1);
  place(ri(2, 3), 'X', 7, 24, rS + 2, 19, true); place(ri(3, 5), 'c', 6, 26, rS + 1, 20);
  place(ri(1, 2), 'X', 6, mw - 2, rN + 2, rS - 2, true); place(ri(2, 4), 'c', 5, s0 - 2, rN + 1, rS - 1); place(ri(1, 3), 'c', 24, 26, rN + 1, rS - 1);
  place(ri(2, 4), 'c', 28, 30, 1, 20);
  const src = g.map(r => r.join(''));
  const roofs = roofed ? [{ r: [8, rS + 1, 17, 20], h: 2.8 }] : [];
  const gN = gaps.N, gS = gaps.S, nearN = gN[2], nearS = gS[2];
  const routes = {
    pier: [[3.5, rN - 1.5], [nearN + 1, rN - 1.5], [nearN + 1, rN + 1.5]],
    split: [[5.5, mid], [gN[0] + 1, rN + 1.5], [gN[0] + 1, rN - 1.5], [nearN + 1, rN - 1.5], [nearN + 1, rN + 1.5]],
    mid: [[5.5, mid], [mw + .5, mg[R() < .5 ? 0 : 1] + 1]],
    tunnel: [[3.5, rS + 1.5], [nearS + 1, rS + 1.5], [nearS + 1, rS - 1.5]],
  };
  return { src, roofs, routes, rN, rS, mid, s0, mw, mg, nearN, nearS };
}
function areasFor(L, names) {
  const { rN, rS, s0 } = L;
  return [
    { k: 'pier', n: names[0], r: [1, 1, 30, rN], col: '#2aa7a0' }, { k: 'gate', n: names[1], r: [1, rN + 1, 4, rS - 1], col: '#8a9a5b' },
    { k: 'yard', n: names[2], r: [5, rN + 1, s0 - 2, rS - 1], col: '#d9a441' }, { k: 'site', n: names[3], r: [s0 - 1, rN + 1, 26, rS - 1], col: '#ff8a3d' },
    { k: 'sheds', n: names[4], r: [27, rN + 1, 30, rS - 1], col: '#4f7fb0' }, { k: 'tunnel', n: names[5], r: [1, rS, 30, 20], col: '#b5523f' },
  ];
}
function check(def) {
  T.MAPS.push(def); T.loadMap(T.MAPS.length - 1); T.MAPS.pop();
  const a = T.SPAWN.att[0], d = T.SPAWN.def[0], s = T.siteC, out = { ok: true, why: [] };
  for (const [name, pts] of Object.entries(def.routes)) {
    let x = a[0], z = a[1], len = 0, good = true;
    for (const p of [...pts.map(q => [q[0] * 2, q[1] * 2]), s]) { const q = T.findPath(x, z, p[0], p[1]); if (!q.length) { good = false; break; } len += T.pathLen(q, x, z); x = p[0]; z = p[1]; }
    if (!good || len / 5.4 < 6 || len / 5.4 > 14.5) { out.ok = false; out.why.push(`${name} ${good ? (len / 5.4).toFixed(1) + 's' : 'no path'}`); }
  }
  const dp = T.findPath(d[0], d[1], s[0], s[1]); if (!dp.length || T.pathLen(dp, d[0], d[1]) / 5.4 > 5.5) { out.ok = false; out.why.push('defender slow'); }
  const sees = (p, q) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]); return T.rayGrid(p[0], 1.6, p[1], (q[0] - p[0]) / L, 0, (q[1] - p[1]) / L, 200) >= L - .5; };
  if (T.SPAWN.att.some(p => T.SITE.some(q => sees(p, q)) || T.SPAWN.def.some(q => sees(p, q)))) { out.ok = false; out.why.push('spawn sees'); }
  // every open cell is reachable from the attacker spawn
  const seen = new Set(); const st = [[Math.floor(a[0] / 2), Math.floor(a[1] / 2)]];
  while (st.length) { const [i, j] = st.pop(), k = T.idx(i, j); if (k < 0 || seen.has(k) || !T.NAV[k]) continue; seen.add(k); st.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]); }
  let n = 0; for (let k = 0; k < T.GW * T.GH; k++) if (T.NAV[k]) n++; if (seen.size !== n) { out.ok = false; out.why.push(`${n - seen.size} cells cut off`); }
  return out;
}
// defender holds: near the site, each watching where a lane comes in
function holdsFor(def, L) {
  T.MAPS.push(def); T.loadMap(T.MAPS.length - 1); T.MAPS.pop();
  const R = rng(L.s0 * 31 + L.mid), ent = { pier: [L.nearN + 1, L.rN + .5], tunnel: [L.nearS + 1, L.rS + .5], mid: [L.mw + .5, L.mg[0] + 1] }, out = [];
  const sees = (p, q) => { const L2 = Math.hypot(q[0] - p[0], q[1] - p[1]); return T.rayGrid(p[0], 1.6, p[1], (q[0] - p[0]) / L2, 0, (q[1] - p[1]) / L2, 200) >= L2 - .5; };
  for (const [lane, e] of Object.entries(ent)) {
    const E = [e[0] * 2, e[1] * 2], c = [];
    for (let j = 1; j < 21; j++) for (let i = L.s0 - 1; i < 29; i++) { const k = T.idx(i, j); if (!T.NAV[k] || def.src[j][i] === 'D') continue; const p = [i * 2 + 1, j * 2 + 1], dS = Math.hypot(p[0] - T.siteC[0], p[1] - T.siteC[1]), dE = Math.hypot(p[0] - E[0], p[1] - E[1]); if (dS < 12 && dE > 7 && sees(p, E)) c.push([i + .5, j + .5]); }
    for (let t = 0; t < 2 && c.length; t++) { const p = c.splice(Math.floor(R() * c.length), 1)[0]; out.push({ p, look: e, lane }); }
  }
  out.push({ p: [L.s0 + 5.5, L.mid + .5], look: [L.mw + .5, L.mid], lane: 'any' });
  return out;
}
const made = [];
for (const [theme, name, names, base] of THEMES) {
  const roofed = theme === 'lava' || theme === 'space' || theme === 'snow';
  let seed = base * 1000, def = null, L = null, tries = 0;
  for (;;) { L = layout(seed, roofed); def = { k: name.toLowerCase().replace(/\W/g, ''), n: name, theme, src: L.src, roofs: L.roofs, doors: [], areas: areasFor(L, names), routes: L.routes, holds: [] }; const r = check(def); tries++; if (r.ok) break; seed++; if (tries > 4000) throw new Error(name + ' never fair: ' + r.why.join(', ')); }
  def.holds = holdsFor(def, L);
  console.log(`${name} (seed ${seed}, ${tries} tries)\n` + def.src.join('\n') + '\n');
  made.push(def);
}
const js = made.map(d => '    ' + JSON.stringify(d).replace(/"(\w+)":/g, '$1: ').replace(/"/g, "'").replace(/,(?=\S)/g, ', ') + ',').join('\n');
let s = fs.readFileSync(mapFile, 'utf8');
s = s.replace(/\n    \/\*@maps\*\/[\s\S]*?\n  \];/, '\n    /*@maps*/\n' + js + '\n  ];');
fs.writeFileSync(mapFile, s); console.log('wrote', made.length, 'maps');
