// Duelpoint's maps, drawn by hand (in cells of 2 m) with a few drawing commands, checked for fairness, and written into
// src/games/duelpoint/29-maps.js. Saltworks stays in 30-map.js.
//   node tools/duelpoint-maps.mjs            check every map, print it, write the file
//   node tools/duelpoint-maps.mjs <key>      just that map, printed with its routes and holds, nothing written
// Cells (see 30-map.js):  # wall  X container  c crate  P dock (7 8 its stairs)  H high ledge  o q r sites A B C
//   A D spawns  T teleporter  J jump pad  i ice  g tall grass  L low gravity  V steam vent  < > ^ v belts  G gate  W breakable wall
//   h half wall (1.2 m: seen and shot over, not climbed)  w window (seen and shot through between 1.05 and 2.25 m, not walked through)
// Fair means: every attackers' way in reaches its site in the time band, defenders reach every site first, the rotation
// between sites is quick enough, no spawn can see a site or the other spawn, and every open cell can be walked to.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'games', 'duelpoint');
const outFile = path.join(dir, '29-maps.js');
const SPD = 5.4, lp = (a, b, t) => a + (b - a) * t;

// ---------- drawing ----------
function sheet(W, H) {
  const g = Array.from({ length: H }, (_, j) => Array.from({ length: W }, (_, i) => i === 0 || j === 0 || i === W - 1 || j === H - 1 ? '#' : '.'));
  const inside = (i, j) => i > 0 && j > 0 && i < W - 1 && j < H - 1;
  const D = {
    W, H, g, doors: [], roofs: [],
    at(i, j, c) { if (inside(i, j)) g[j][i] = c; return D; },
    rect(i0, j0, i1, j1, c) { for (let j = Math.min(j0, j1); j <= Math.max(j0, j1); j++) for (let i = Math.min(i0, i1); i <= Math.max(i0, i1); i++) D.at(i, j, c); return D; },
    // a wall line from one cell to another (straight), with gaps left open
    wall(i0, j0, i1, j1, c = '#') { const n = Math.max(Math.abs(i1 - i0), Math.abs(j1 - j0)); for (let s = 0; s <= n; s++) D.at(i0 + Math.round((i1 - i0) * s / (n || 1)), j0 + Math.round((j1 - j0) * s / (n || 1)), c); return D; },
    // a doorway through a wall: open cells under a lintel
    door(i0, j0, i1, j1) { D.rect(i0, j0, i1, j1, '.'); D.doors.push([Math.min(i0, i1), Math.min(j0, j1), Math.max(i0, i1), Math.max(j0, j1)]); return D; },
    roof(i0, j0, i1, j1, h = 2.8) { D.roofs.push({ r: [i0, j0, i1, j1], h }); return D; },
    src: () => g.map(r => r.join('')),
  };
  return D;
}

// ---------- the maps ----------
const MAPS = [];

/* NEON ROW (neon, one site, teleporters). No middle: two streets past a block of shuttered towers, and a teleporter in each
   street that drops you into the other one, half way along. Quick to switch lanes, loud when you do. */
{
  const d = sheet(40, 26);
  d.wall(5, 7, 5, 18);                                   // the shield in front of the attackers' lobby
  d.rect(9, 8, 26, 17, '#');                             // the shuttered block between the streets
  // the north street: kiosks, then a choke into the Arcade
  d.rect(14, 3, 15, 4, 'X'); d.at(9, 6, 'c'); d.at(19, 1, 'c'); d.at(20, 6, 'c'); d.at(11, 2, 'c');
  d.wall(22, 1, 22, 2); d.wall(22, 6, 22, 7);
  // the south street, under the subway roof for a stretch, and its own choke into the Canal
  d.rect(13, 20, 14, 20, 'X'); d.at(10, 23, 'c'); d.at(17, 18, 'c'); d.at(19, 23, 'c');
  d.roof(9, 21, 18, 24); d.wall(22, 18, 22, 19); d.wall(22, 23, 22, 24);
  // the site, walled off from both yards with a door from each, and a back door to the defenders
  d.wall(27, 7, 34, 7); d.door(29, 7, 30, 7);
  d.wall(27, 18, 34, 18); d.door(29, 18, 31, 18);
  d.wall(35, 7, 35, 18); d.door(35, 12, 35, 13);
  d.rect(28, 10, 32, 15, 'o'); d.rect(31, 11, 31, 12, 'X'); d.at(28, 10, 'c'); d.at(32, 15, 'c'); d.at(33, 9, 'c');
  d.rect(23, 9, 26, 16, '#');
  d.roof(22, 2, 26, 6, 3);                               // the Arcade: a covered walk, dark under its sign boards
  d.at(28, 3, 'c'); d.at(32, 2, 'c'); d.rect(30, 4, 31, 4, 'X');   // cover in the yard by the signs
  d.at(32, 19, '7'); d.at(32, 20, '8'); d.rect(31, 21, 33, 23, 'P');   // the Noodle Bar's raised terrace, looking in through the south door
  // spawns
  d.rect(1, 10, 2, 15, 'A'); d.rect(37, 10, 38, 15, 'D');
  // the teleporters: north street to south street and back, each a little way past the other's mouth
  d.at(18, 2, 'T'); d.at(18, 23, 'T');
  MAPS.push({ k: 'neonrow', n: 'Neon Row', theme: 'neon', mech: 'tele', tag: 'Two streets of shuttered towers, and no way through the middle.', tip: 'Step on a teleporter to come out in the other street. Both ends are loud.',
    roundT: 90, src: d.src(), roofs: d.roofs, doors: d.doors,
    tps: [[18, 2, 17, 19, Math.PI / 2], [18, 23, 17, 6, Math.PI / 2]],
    areas: [
      { k: 'aspawn', n: 'Lobby', r: [1, 1, 5, 24], col: '#8a9a5b', lane: 'any' },
      { k: 'north', n: 'Arcade Street', r: [6, 1, 21, 7], col: '#ff3ea5', lane: 'north' }, { k: 'arcade', n: 'Arcade', r: [22, 1, 26, 8], col: '#c06bff', lane: 'north' },
      { k: 'south', n: 'Canal Walk', r: [6, 18, 21, 24], col: '#3df2ff', lane: 'south' }, { k: 'canal', n: 'Canal', r: [22, 17, 26, 24], col: '#4f7fb0', lane: 'south' },
      { k: 'nyard', n: 'Signs', r: [27, 1, 34, 6], col: '#ffd23f', lane: 'north' }, { k: 'site', n: 'Plaza', r: [27, 8, 34, 17], col: '#ff8a3d', lane: 'any' },
      { k: 'syard', n: 'Noodle Bar', r: [27, 19, 34, 24], col: '#7bd88f', lane: 'south' }, { k: 'dspawn', n: 'Garage', r: [35, 1, 38, 24], col: '#4f7fb0', lane: 'any' },
    ],
    routes: { north: [[4, 5], [22.5, 4], [29.5, 7.5]], south: [[4, 20.5], [22.5, 21], [30, 18.5]], tele: [[4, 5], [18.5, 2.5], [22.5, 21], [30, 18.5]], tele2: [[4, 20.5], [18.5, 23.5], [22.5, 4], [29.5, 7.5]] },
  });
}

/* FROSTLINE (snow, one site, ice). A research camp on a frozen lake. The Reactor sits in the north-east corner; the Ridge runs
   straight at it along the north, the frozen Pond fills the middle (fast across, but you slide and stop late), and the
   long way round goes through the Hangar and up the Gantry. */
{
  const d = sheet(40, 26);
  d.wall(3, 8, 3, 17); d.rect(1, 10, 2, 15, 'A');
  // the Reactor: walls west and south, a door from the Ridge, one from the Pumphouse, one from the Gantry, the defenders' own
  d.wall(26, 1, 26, 9); d.door(26, 3, 26, 4);
  d.wall(26, 10, 38, 10); d.door(28, 10, 29, 10); d.door(32, 10, 33, 10); d.door(36, 10, 37, 10);
  d.rect(29, 3, 34, 7, 'o'); d.rect(31, 4, 31, 5, 'X'); d.at(29, 7, 'c'); d.at(34, 3, 'c'); d.rect(36, 2, 37, 3, 'X'); d.at(28, 1, 'c');
  // the Ridge: tents and a snowcat shed
  d.wall(5, 7, 25, 7); d.door(12, 7, 13, 7); d.rect(9, 3, 10, 4, 'X'); d.at(16, 2, 'c'); d.at(19, 5, 'c'); d.rect(22, 1, 23, 2, 'X');
  // the Pond: ice from bank to bank, an ice block in the middle
  d.rect(8, 9, 21, 15, 'i'); d.rect(14, 11, 15, 12, 'X');
  // the Pumphouse (roofed) and the Gantry beside it
  d.wall(22, 8, 22, 9); d.wall(22, 15, 22, 16); d.roof(23, 11, 29, 16, 3); d.wall(30, 11, 30, 16); d.at(26, 13, 'c');
  d.wall(35, 11, 35, 24); d.door(35, 13, 35, 14);
  // the Hangar: a long roofed shed along the south
  d.wall(5, 17, 34, 17); d.door(13, 17, 14, 17); d.door(31, 17, 32, 17); d.roof(8, 19, 27, 24, 3.2);
  d.rect(11, 21, 12, 22, 'X'); d.at(17, 19, 'c'); d.at(21, 23, 'c'); d.rect(24, 20, 24, 21, 'X'); d.at(29, 22, 'c');
  d.rect(36, 15, 38, 20, 'D');
  MAPS.push({ k: 'frostline', n: 'Frostline', theme: 'snow', mech: 'ice', tag: 'A research camp on a frozen lake.', tip: 'The Pond is ice: you run fast across it, but you slide and stop late. Counter-strafing does not work on ice.',
    roundT: 90, src: d.src(), roofs: d.roofs, doors: d.doors,
    areas: [
      { k: 'aspawn', n: 'Base Camp', r: [1, 1, 4, 24], col: '#8a9a5b', lane: 'any' }, { k: 'ridge', n: 'Ridge', r: [5, 1, 25, 6], col: '#2aa7a0', lane: 'ridge' },
      { k: 'pond', n: 'The Pond', r: [5, 8, 22, 16], col: '#7fc8ff', lane: 'pond' }, { k: 'pump', n: 'Pumphouse', r: [23, 11, 29, 16], col: '#d9a441', lane: 'pond' },
      { k: 'site', n: 'Reactor', r: [27, 1, 38, 9], col: '#ff8a3d', lane: 'any' }, { k: 'gantry', n: 'Gantry', r: [31, 11, 34, 16], col: '#8d6bb0', lane: 'hangar' },
      { k: 'hangar', n: 'Hangar', r: [5, 18, 34, 24], col: '#b5523f', lane: 'hangar' }, { k: 'dspawn', n: 'Lodge', r: [36, 11, 38, 24], col: '#4f7fb0', lane: 'any' },
    ],
    routes: { ridge: [[4, 6.5], [25.5, 3.5]], pond: [[6, 12.5], [24, 13], [28.5, 10.5]], hangar: [[4, 19], [31.5, 17.5], [32.5, 10.5]] },
  });
}

/* DUNEWATCH (desert, one site, sandstorm). A ruined caravan fort on open sand: long, wide sightlines across the Dunes and the
   courtyard, a narrow Bazaar through the middle, and the sunken Canal along the south. Every so often a sandstorm blows in
   and nobody can see more than a dozen metres. */
{
  const d = sheet(40, 26);
  d.wall(4, 9, 4, 16); d.rect(1, 10, 2, 15, 'A');
  // the Dunes: wide open, a few broken columns and a tumbled pyramid of blocks
  d.at(9, 3, 'X'); d.at(14, 6, 'X'); d.rect(17, 2, 19, 4, 'X'); d.at(23, 7, 'X'); d.at(12, 2, 'c'); d.at(21, 6, 'c');
  d.wall(5, 9, 25, 9); d.door(10, 9, 11, 9);
  // the Bazaar: a narrow covered street of stalls straight through the middle
  d.rect(5, 10, 25, 11, '#'); d.rect(5, 14, 25, 15, '#'); d.door(9, 10, 10, 11); d.door(9, 14, 10, 15); d.roof(6, 12, 25, 13, 3);
  d.at(13, 12, 'c'); d.at(19, 13, 'c');
  // the Canal: a long dry channel with stone banks
  d.wall(5, 16, 25, 16); d.door(16, 16, 17, 16);
  d.rect(8, 20, 9, 20, 'X'); d.at(14, 18, 'c'); d.at(18, 22, 'c'); d.rect(22, 19, 22, 20, 'X'); d.at(11, 23, 'c');
  // the Courtyard and the site: a big square open to the Dunes, the Bazaar's mouth and the Canal steps
  d.rect(28, 7, 34, 18, 'o'); d.rect(30, 9, 30, 10, 'X'); d.rect(32, 15, 33, 15, 'X'); d.at(28, 7, 'c'); d.at(34, 13, 'c'); d.at(29, 17, 'c');
  d.wall(26, 1, 26, 3); d.wall(26, 19, 26, 24); d.wall(35, 1, 35, 9); d.wall(35, 16, 35, 24); d.door(35, 6, 35, 7); d.door(35, 18, 35, 19);
  d.rect(37, 10, 38, 15, 'D');
  MAPS.push({ k: 'dunewatch', n: 'Dunewatch', theme: 'desert', mech: 'storm', tag: 'A caravan fort on open sand. You can see for miles, until the storm comes in.', tip: 'A sandstorm blows through now and then: nobody sees further than a dozen metres while it lasts. Push in under it.',
    roundT: 90, src: d.src(), roofs: d.roofs, doors: d.doors,
    areas: [
      { k: 'aspawn', n: 'Caravan', r: [1, 1, 4, 24], col: '#8a9a5b', lane: 'any' }, { k: 'dunes', n: 'Dunes', r: [5, 1, 25, 8], col: '#e2bf86', lane: 'dunes' },
      { k: 'bazaar', n: 'Bazaar', r: [5, 10, 25, 15], col: '#d9a441', lane: 'bazaar' }, { k: 'canal', n: 'Canal', r: [5, 17, 25, 24], col: '#2aa7a0', lane: 'canal' },
      { k: 'site', n: 'Courtyard', r: [26, 4, 34, 18], col: '#ff8a3d', lane: 'any' }, { k: 'nwall', n: 'Rampart', r: [26, 1, 34, 3], col: '#b5523f', lane: 'dunes' },
      { k: 'swall', n: 'Steps', r: [27, 19, 34, 24], col: '#8d6bb0', lane: 'canal' }, { k: 'dspawn', n: 'Keep', r: [35, 1, 38, 24], col: '#4f7fb0', lane: 'any' },
    ],
    routes: { dunes: [[4, 6], [25, 5]], bazaar: [[6, 12.5], [26, 12.5]], canal: [[4, 19], [25, 20], [29, 19]] },
  });
}

/* OVERGROWTH (jungle, one site, tall grass). Temple ruins under the canopy. The attackers come up from the south-west, the
   defenders down from the north-east, and the Shrine sits between them. Fields of tall grass hide whoever is crouched in
   them, and bullets go straight through. */
{
  const d = sheet(40, 26);
  d.rect(1, 19, 2, 24, 'A'); d.wall(5, 17, 5, 24); d.wall(1, 16, 4, 16); d.door(2, 16, 3, 16); d.door(5, 20, 5, 21);
  d.rect(36, 1, 38, 6, 'D'); d.wall(35, 1, 35, 7); d.wall(35, 8, 38, 8); d.door(35, 3, 35, 4);
  // the Shrine
  d.rect(22, 9, 28, 15, 'o'); d.rect(24, 11, 25, 12, 'X'); d.at(22, 9, 'c'); d.at(28, 15, 'c');
  d.wall(21, 8, 29, 8); d.door(24, 8, 26, 8); d.wall(21, 16, 29, 16); d.door(23, 16, 24, 16); d.wall(21, 8, 21, 16); d.door(21, 11, 21, 13); d.wall(29, 8, 29, 16); d.door(29, 13, 29, 14);
  // the Canopy: a grass field across the north-west
  d.rect(6, 2, 18, 7, 'g'); d.rect(10, 4, 11, 5, 'X'); d.at(15, 3, 'c'); d.wall(6, 9, 18, 9); d.door(9, 9, 10, 9);
  d.wall(19, 1, 19, 6);
  // the Temple Steps in the middle: a raised terrace reached by stairs
  d.rect(9, 11, 15, 15, '.'); d.at(12, 11, '7'); d.at(12, 12, '8'); d.rect(11, 13, 14, 15, 'P'); d.at(17, 12, 'c');
  // the Riverbed: grass in patches along the south, and the ruined aqueduct
  d.rect(9, 19, 16, 23, 'g'); d.rect(22, 19, 27, 22, 'g'); d.rect(18, 21, 19, 21, 'X'); d.wall(6, 17, 20, 17); d.door(13, 17, 14, 17); d.at(30, 21, 'c');
  d.wall(30, 17, 30, 19); d.wall(32, 9, 38, 9); d.rect(32, 10, 38, 24, '.');
  d.rect(31, 2, 33, 6, 'g'); d.at(26, 3, 'c'); d.rect(23, 4, 24, 5, 'X');
  MAPS.push({ k: 'overgrowth', n: 'Overgrowth', theme: 'jungle', mech: 'grass', tag: 'Temple ruins swallowed by the rainforest.', tip: 'Tall grass hides whoever is in it, from you and from bots, but bullets go straight through. Shoot where the grass moves.',
    roundT: 90, src: d.src(), roofs: d.roofs, doors: d.doors,
    areas: [
      { k: 'aspawn', n: 'Landing', r: [1, 17, 4, 24], col: '#8a9a5b', lane: 'any' }, { k: 'canopy', n: 'Canopy', r: [1, 1, 18, 8], col: '#7bd88f', lane: 'canopy' },
      { k: 'steps', n: 'Temple Steps', r: [6, 10, 20, 16], col: '#d9a441', lane: 'steps' }, { k: 'river', n: 'Riverbed', r: [6, 18, 31, 24], col: '#2aa7a0', lane: 'river' },
      { k: 'site', n: 'Shrine', r: [21, 8, 29, 16], col: '#ff8a3d', lane: 'any' }, { k: 'falls', n: 'Falls', r: [19, 1, 34, 7], col: '#4f7fb0', lane: 'canopy' },
      { k: 'roots', n: 'Roots', r: [30, 9, 38, 24], col: '#8d6bb0', lane: 'river' }, { k: 'dspawn', n: 'Sanctum', r: [35, 1, 38, 7], col: '#4f7fb0', lane: 'any' },
    ],
    routes: { canopy: [[3, 16.5], [9.5, 9.5], [20, 5], [25, 7.5]], steps: [[6, 18], [13.5, 17.5], [20.5, 12]], river: [[6, 21], [29.5, 18], [29.5, 13.5]] },
  });
}

/* FOUNDRY (lava, one site, steam vents). A foundry on a caldera rim. The Catwalk runs high along the north, the Smelter is a
   great roofed hall in the middle, and the Slag Tunnel creeps along the south. Steam vents at the chokes puff in turn and
   block sight for a few seconds: time your push on the hiss. */
{
  const d = sheet(40, 26);
  d.wall(3, 9, 3, 16); d.rect(1, 10, 2, 15, 'A');
  // the Catwalk: a raised walkway along the north, up stairs at each end
  d.at(6, 1, '7'); d.at(6, 2, '8'); d.rect(6, 3, 22, 4, 'P'); d.at(23, 1, '7'); d.at(23, 2, '8'); d.rect(23, 3, 23, 4, 'P'); d.wall(5, 7, 24, 7); d.door(17, 7, 18, 7);
  d.at(12, 6, 'c'); d.at(20, 5, 'c'); d.at(14, 1, 'c');
  // the Smelter: a roofed hall, the crucible in the middle, vents at both mouths
  d.wall(5, 8, 25, 8); d.wall(5, 17, 25, 17); d.door(8, 8, 9, 8); d.roof(6, 9, 23, 16, 4);
  d.rect(13, 11, 15, 14, 'X'); d.at(9, 10, 'c'); d.at(19, 15, 'c'); d.at(6, 12, 'V'); d.at(24, 12, 'V');
  // the Slag Tunnel
  d.wall(5, 20, 22, 20); d.door(10, 20, 11, 20); d.roof(6, 21, 24, 24, 2.8); d.at(16, 22, 'c'); d.rect(20, 23, 21, 23, 'X');
  d.rect(6, 18, 24, 19, '.'); d.at(14, 18, 'c');
  // the site: a casting floor with three ways in, and a vent at the tunnel's mouth
  d.rect(28, 8, 33, 17, 'o'); d.rect(30, 10, 31, 11, 'X'); d.at(28, 8, 'c'); d.at(33, 15, 'c'); d.at(31, 16, 'c');
  d.wall(26, 1, 26, 3); d.wall(26, 18, 26, 24); d.door(26, 21, 26, 22); d.at(25, 22, 'V'); d.wall(35, 1, 35, 24); d.door(35, 11, 35, 13);
  d.wall(27, 18, 34, 18); d.door(30, 18, 31, 18);
  d.rect(37, 10, 38, 15, 'D');
  MAPS.push({ k: 'foundry', n: 'Foundry', theme: 'lava', mech: 'vent', tag: 'A foundry on the rim of a live caldera.', tip: 'Steam vents at the chokes puff in turn, a cloud that blocks sight for five seconds. Listen for the hiss and move under it.',
    roundT: 90, src: d.src(), roofs: d.roofs, doors: d.doors,
    areas: [
      { k: 'aspawn', n: 'Loading Bay', r: [1, 1, 4, 24], col: '#8a9a5b', lane: 'any' }, { k: 'cat', n: 'Catwalk', r: [5, 1, 25, 6], col: '#ffb347', lane: 'cat' },
      { k: 'smelter', n: 'Smelter', r: [5, 8, 25, 17], col: '#d9a441', lane: 'smelter' }, { k: 'slag', n: 'Slag Tunnel', r: [5, 18, 25, 24], col: '#b5523f', lane: 'slag' },
      { k: 'site', n: 'Casting Floor', r: [26, 4, 34, 17], col: '#ff8a3d', lane: 'any' }, { k: 'pour', n: 'Pour', r: [26, 1, 34, 3], col: '#c46bff', lane: 'cat' },
      { k: 'drain', n: 'Drain', r: [27, 19, 34, 24], col: '#8d6bb0', lane: 'slag' }, { k: 'dspawn', n: 'Control', r: [35, 1, 38, 24], col: '#4f7fb0', lane: 'any' },
    ],
    routes: { cat: [[4, 6], [6.5, 1.5], [6.5, 3.5], [22.5, 3.5], [27, 5]], smelter: [[5, 9], [8.5, 8.5], [25, 12.5]], slag: [[4, 18.5], [10.5, 20.5], [27, 21.5], [30.5, 18.5]] },
  });
}

/* ORBITAL (space, one site, low gravity). A station deck over a blue world. The Observatory runs along the north, the
   Service Duct creeps along the south, and the middle is the Hydroponics dome, where the gravity is turned down: jump onto
   the planters and the stacked crates for angles nobody expects. The site is in low gravity too. */
{
  const d = sheet(40, 26);
  d.wall(4, 8, 4, 17); d.rect(1, 10, 2, 15, 'A');
  d.wall(5, 7, 26, 7); d.door(11, 7, 12, 7); d.roof(6, 1, 25, 6, 3.4);
  d.rect(9, 3, 10, 4, 'X'); d.at(15, 2, 'c'); d.at(19, 5, 'c'); d.rect(22, 2, 23, 3, 'X');
  // the dome: low gravity and tall stacks
  d.rect(7, 9, 24, 16, 'L'); d.rect(10, 11, 11, 12, 'X'); d.rect(15, 13, 16, 14, 'X'); d.rect(20, 10, 20, 11, 'X'); d.at(13, 15, 'c'); d.at(18, 10, 'c');
  d.wall(5, 18, 26, 18); d.door(15, 18, 16, 18); d.wall(25, 8, 25, 10); d.wall(25, 15, 25, 17);
  // the Service Duct
  d.roof(6, 19, 25, 24, 2.6); d.wall(6, 21, 21, 21); d.door(9, 21, 10, 21); d.door(17, 21, 18, 21); d.at(13, 23, 'c');
  // the site: the Core, in low gravity, with a ring of stacks
  d.rect(27, 8, 34, 17, 'L'); d.rect(28, 9, 33, 16, 'o'); d.rect(30, 11, 31, 12, 'X'); d.at(28, 9, 'c'); d.at(33, 16, 'c'); d.rect(33, 10, 33, 10, 'X');
  d.wall(26, 1, 26, 6); d.door(26, 3, 26, 4); d.wall(26, 19, 26, 24); d.door(26, 22, 26, 23);
  d.wall(27, 7, 34, 7); d.door(30, 7, 31, 7); d.wall(27, 18, 34, 18); d.door(29, 18, 30, 18); d.wall(35, 1, 35, 24); d.door(35, 12, 35, 13);
  d.rect(37, 10, 38, 15, 'D');
  MAPS.push({ k: 'orbital', n: 'Orbital', theme: 'space', mech: 'lowg', tag: 'A station deck over a blue world.', tip: 'In the dome and on the Core the gravity is turned down: jump three times as high, onto the stacks, for angles nobody expects.',
    roundT: 90, src: d.src(), roofs: d.roofs, doors: d.doors,
    areas: [
      { k: 'aspawn', n: 'Airlock', r: [1, 1, 4, 24], col: '#8a9a5b', lane: 'any' }, { k: 'obs', n: 'Observatory', r: [5, 1, 25, 6], col: '#38e8ff', lane: 'obs' },
      { k: 'dome', n: 'Hydroponics', r: [5, 8, 26, 17], col: '#7bd88f', lane: 'dome' }, { k: 'duct', n: 'Service Duct', r: [5, 19, 25, 24], col: '#b5523f', lane: 'duct' },
      { k: 'site', n: 'Core', r: [27, 8, 34, 17], col: '#ff8a3d', lane: 'any' }, { k: 'deck', n: 'Upper Deck', r: [27, 1, 34, 6], col: '#c46bff', lane: 'obs' },
      { k: 'bay', n: 'Cargo Bay', r: [27, 19, 34, 24], col: '#8d6bb0', lane: 'duct' }, { k: 'dspawn', n: 'Command', r: [35, 1, 38, 24], col: '#4f7fb0', lane: 'any' },
    ],
    routes: { obs: [[4, 7], [25.5, 3.5], [30.5, 7.5]], dome: [[5, 12.5], [26, 12.5]], duct: [[4, 18.5], [15.5, 18.5], [25.5, 22.5], [29.5, 18.5]] },
  });
}

/* BREAKWATER (harbor, two sites, breakable walls). A storm-battered port. The long lanes run along the sea wall and the
   warehouses; the middle is the Customs hall and the yard behind it, and the yard's ways onto the sites start the round
   bricked up. Shoot a wall down and it stays down for the round: a new way in, and a new angle to watch. */
{
  const d = sheet(52, 36);
  d.wall(3, 13, 3, 22); d.rect(1, 15, 2, 20, 'A');
  d.wall(4, 10, 32, 10); d.wall(4, 25, 32, 25); d.door(9, 10, 10, 10); d.door(9, 25, 10, 25);
  // A Seawall and B Warehouse (the long lanes)
  d.rect(12, 3, 13, 4, 'X'); d.at(20, 7, 'c'); d.rect(26, 2, 27, 2, 'X'); d.at(8, 2, 'c'); d.at(30, 8, 'c');
  d.rect(12, 31, 13, 32, 'X'); d.at(20, 27, 'c'); d.rect(26, 33, 27, 33, 'X'); d.at(8, 33, 'c'); d.at(30, 28, 'c'); d.roof(14, 26, 25, 34, 3.2);
  // Customs: a roofed hall in the middle, and the Yard behind it
  d.wall(14, 12, 28, 12); d.wall(14, 23, 28, 23); d.wall(14, 12, 14, 23); d.wall(28, 12, 28, 23); d.door(14, 17, 14, 18); d.door(28, 14, 28, 15); d.door(28, 20, 28, 21);
  d.roof(15, 13, 27, 22, 3.6); d.rect(19, 15, 20, 16, 'X'); d.rect(23, 19, 24, 20, 'X'); d.at(17, 21, 'c'); d.at(26, 14, 'c');
  d.at(7, 13, 'c'); d.at(11, 22, 'c');
  // the sites, and the bricked-up links from the Yard
  d.wall(33, 1, 33, 11); d.door(33, 4, 33, 6); d.wall(29, 12, 44, 12); d.rect(36, 12, 37, 12, 'W'); d.wall(44, 1, 44, 11); d.door(44, 6, 44, 7);
  d.rect(36, 3, 41, 8, 'o'); d.rect(38, 5, 39, 5, 'X'); d.at(36, 3, 'c'); d.at(41, 8, 'c');
  d.wall(33, 24, 33, 34); d.door(33, 29, 33, 31); d.wall(29, 23, 44, 23); d.rect(36, 23, 37, 23, 'W'); d.wall(44, 24, 44, 34); d.door(44, 28, 44, 29);
  d.rect(36, 27, 41, 32, 'q'); d.rect(38, 30, 39, 30, 'X'); d.at(36, 32, 'c'); d.at(41, 27, 'c');
  d.wall(41, 13, 41, 22); d.door(41, 17, 41, 18); d.at(32, 17, 'c'); d.rect(35, 18, 36, 18, 'X'); d.at(39, 15, 'c');
  d.rect(49, 15, 50, 20, 'D');
  MAPS.push({ k: 'breakwater', n: 'Breakwater', theme: 'harbor', mech: 'break', sites: 2, roundT: 105, tag: 'A storm-battered port. Two loading yards, one charge.', tip: 'The Yard’s ways onto A and B start the round bricked up. Shoot a wall to bring it down: it stays open for the round.',
    src: d.src(), roofs: d.roofs, doors: d.doors,
    areas: [
      { k: 'aspawn', n: 'Ferry Ramp', r: [1, 1, 3, 34], col: '#8a9a5b', lane: 'any' }, { k: 'along', n: 'A Seawall', r: [4, 1, 32, 9], col: '#2aa7a0', lane: 'along' },
      { k: 'plaza', n: 'Fish Market', r: [4, 11, 13, 24], col: '#d9a441', lane: 'amid' }, { k: 'mid', n: 'Customs', r: [14, 12, 28, 23], col: '#c9862e', lane: 'amid' },
      { k: 'yard', n: 'Yard', r: [29, 13, 40, 22], col: '#8d6bb0', lane: 'bmid' }, { k: 'blong', n: 'B Warehouse', r: [4, 26, 32, 34], col: '#b5523f', lane: 'blong' },
      { k: 'asite', n: 'A Cranes', r: [34, 1, 43, 11], col: '#ff8a3d', lane: 'any' }, { k: 'bsite', n: 'B Drydock', r: [34, 24, 43, 34], col: '#c46bff', lane: 'any' },
      { k: 'dspawn', n: 'Lighthouse', r: [42, 1, 50, 34], col: '#4f7fb0', lane: 'any' },
    ],
    routes: { along: [[4, 6], [32.5, 5]], amid: [[5, 16], [14, 17.5], [28.5, 14.5], [36.5, 13.5]], bmid: [[5, 19], [14, 17.5], [28.5, 20.5], [36.5, 22]], blong: [[4, 29], [32.5, 30]] },
    rsite: { along: 0, amid: 0, bmid: 1, blong: 1 }, rbrk: { amid: 0, bmid: 1 },
  });
}

/* SKYLINE (neon, two sites, jump pads). Rooftops over a city that never sleeps. A tower stands in the middle of the
   Market, and a jump pad on each side throws you onto its roof; behind each site a Heaven ledge looks down on it, reached
   by the defenders' own pads. Height wins fights here. */
{
  const d = sheet(52, 36);
  d.wall(3, 13, 3, 22); d.rect(1, 15, 2, 20, 'A');
  d.wall(4, 11, 30, 11); d.wall(4, 24, 30, 24); d.door(14, 11, 15, 11); d.door(14, 24, 15, 24);
  d.rect(10, 3, 11, 4, 'X'); d.at(18, 7, 'c'); d.rect(24, 2, 25, 3, 'X'); d.at(7, 8, 'c'); d.at(28, 6, 'c');
  d.rect(10, 31, 11, 32, 'X'); d.at(18, 28, 'c'); d.rect(24, 32, 25, 33, 'X'); d.at(7, 27, 'c'); d.at(28, 29, 'c');
  // the Market and its tower
  d.rect(18, 15, 21, 20, 'H'); d.at(16, 17, 'J'); d.at(23, 18, 'J'); d.at(9, 14, 'c'); d.at(12, 21, 'c'); d.rect(26, 13, 27, 13, 'X'); d.rect(26, 22, 27, 22, 'X');
  d.wall(30, 12, 30, 23); d.door(30, 14, 30, 15); d.door(30, 20, 30, 21);
  // the sites, with a Heaven ledge on the far side of each and a way through underneath
  d.wall(31, 1, 31, 10); d.door(31, 4, 31, 6); d.wall(31, 11, 45, 11); d.door(33, 11, 34, 11);
  d.rect(34, 3, 40, 8, 'o'); d.rect(37, 5, 37, 6, 'X'); d.at(34, 8, 'c'); d.at(40, 3, 'c');
  d.rect(43, 1, 45, 4, 'H'); d.rect(43, 7, 45, 10, 'H'); d.at(47, 2, 'J'); d.at(47, 9, 'J');
  d.wall(31, 25, 31, 34); d.door(31, 29, 31, 31); d.wall(31, 24, 45, 24); d.door(33, 24, 34, 24);
  d.rect(34, 27, 40, 32, 'q'); d.rect(37, 29, 37, 30, 'X'); d.at(34, 27, 'c'); d.at(40, 32, 'c');
  d.rect(43, 25, 45, 28, 'H'); d.rect(43, 31, 45, 34, 'H'); d.at(47, 26, 'J'); d.at(47, 33, 'J');
  d.wall(46, 11, 46, 24); d.door(46, 17, 46, 18);
  d.at(36, 17, 'c'); d.rect(39, 15, 40, 15, 'X'); d.rect(39, 20, 40, 20, 'X');
  d.rect(49, 15, 50, 20, 'D');
  MAPS.push({ k: 'skyline', n: 'Skyline', theme: 'neon', mech: 'pads', sites: 2, roundT: 105, tag: 'Rooftop arcades over a city that never sleeps.', tip: 'Jump pads throw you onto the Market tower and the Heaven ledges behind the sites. Height wins fights; dropping down is quick.',
    src: d.src(), roofs: d.roofs, doors: d.doors,
    pads: [[16, 17, 19, 17], [23, 18, 20, 18], [47, 2, 44, 2], [47, 9, 44, 9], [47, 26, 44, 26], [47, 33, 44, 33]],
    areas: [
      { k: 'aspawn', n: 'Rooftop Bar', r: [1, 1, 3, 34], col: '#8a9a5b', lane: 'any' }, { k: 'along', n: 'A Billboards', r: [4, 1, 30, 10], col: '#ff3ea5', lane: 'along' },
      { k: 'mid', n: 'Market', r: [4, 12, 29, 23], col: '#d9a441', lane: 'amid' }, { k: 'blong', n: 'B Arcade', r: [4, 25, 30, 34], col: '#3df2ff', lane: 'blong' },
      { k: 'link', n: 'Skybridge', r: [31, 12, 45, 23], col: '#8d6bb0', lane: 'bmid' }, { k: 'asite', n: 'A Plaza', r: [32, 1, 42, 10], col: '#ff8a3d', lane: 'any' },
      { k: 'aheaven', n: 'A Heaven', r: [43, 1, 45, 10], col: '#ffd23f', lane: 'any' }, { k: 'bsite', n: 'B Hotel', r: [32, 25, 42, 34], col: '#c46bff', lane: 'any' },
      { k: 'bheaven', n: 'B Heaven', r: [43, 25, 45, 34], col: '#ffd23f', lane: 'any' }, { k: 'dspawn', n: 'Penthouse', r: [47, 1, 50, 34], col: '#4f7fb0', lane: 'any' },
    ],
    routes: { along: [[4, 7], [30.5, 5]], amid: [[5, 15], [16.5, 17.5], [20, 16], [30, 14.5], [33.5, 11.5]], bmid: [[5, 20], [23.5, 18.5], [30, 20.5], [33.5, 24]], blong: [[4, 28], [30.5, 30]] },
    rsite: { along: 0, amid: 0, bmid: 1, blong: 1 },
  });
}

/* GLACIER PASS (snow, two sites, gates). A research outpost buried in the ice. A big open Courtyard in the middle, with the
   Market hall in it; from the Courtyard a blast door leads onto each site, and a switch beside it on the site's side shuts
   it into a wall (and opens it again). Shut doors make the long lanes the only way in. */
{
  const d = sheet(52, 36);
  d.wall(3, 13, 3, 22); d.rect(1, 15, 2, 20, 'A');
  d.wall(4, 10, 33, 10); d.wall(4, 25, 33, 25); d.door(8, 10, 9, 10); d.door(8, 25, 9, 25);
  d.rect(13, 4, 14, 5, 'X'); d.at(21, 2, 'c'); d.at(26, 7, 'c'); d.rect(29, 3, 29, 4, 'X'); d.roof(16, 1, 27, 9, 3);
  d.rect(13, 30, 14, 31, 'X'); d.at(21, 33, 'c'); d.at(26, 28, 'c'); d.rect(29, 31, 29, 32, 'X');
  // the Courtyard and the Market hall in it
  d.wall(20, 15, 26, 15); d.wall(20, 20, 26, 20); d.wall(20, 15, 20, 20); d.wall(26, 15, 26, 20); d.door(20, 17, 20, 18); d.door(23, 20, 24, 20); d.door(26, 16, 26, 17); d.roof(21, 16, 25, 19, 3);
  d.at(10, 13, 'c'); d.at(15, 22, 'c'); d.rect(30, 13, 31, 13, 'X'); d.rect(30, 22, 31, 22, 'X'); d.at(17, 17, 'c');
  // the sites, each with a blast door from the Courtyard
  d.wall(34, 1, 34, 11); d.door(34, 4, 34, 6); d.wall(34, 11, 44, 11); d.rect(36, 11, 37, 11, 'G'); d.wall(44, 1, 44, 11); d.door(44, 5, 44, 6);
  d.rect(36, 3, 41, 8, 'o'); d.rect(39, 5, 39, 6, 'X'); d.at(36, 3, 'c'); d.at(41, 8, 'c');
  d.wall(34, 24, 34, 34); d.door(34, 29, 34, 31); d.wall(34, 24, 44, 24); d.rect(36, 24, 37, 24, 'G'); d.wall(44, 24, 44, 34); d.door(44, 29, 44, 30);
  d.rect(36, 27, 41, 32, 'q'); d.rect(39, 29, 39, 30, 'X'); d.at(36, 32, 'c'); d.at(41, 27, 'c');
  d.wall(44, 12, 44, 23); d.door(44, 17, 44, 18); d.at(38, 17, 'c'); d.rect(41, 14, 41, 15, 'X'); d.rect(41, 20, 41, 21, 'X');
  d.rect(49, 15, 50, 20, 'D');
  MAPS.push({ k: 'glacierpass', n: 'Glacier Pass', theme: 'snow', mech: 'gate', sites: 2, roundT: 105, tag: 'A research outpost buried in the ice.', tip: 'A blast door leads from the Courtyard onto each site. Press F at the switch beside it, on the site side, to shut it into a wall, or open it again.',
    src: d.src(), roofs: d.roofs, doors: d.doors, sw: [[38, 10, 0], [38, 25, 1]],
    areas: [
      { k: 'aspawn', n: 'Drill Camp', r: [1, 1, 3, 34], col: '#8a9a5b', lane: 'any' }, { k: 'along', n: 'A Tunnels', r: [4, 1, 33, 9], col: '#2aa7a0', lane: 'along' },
      { k: 'mid', n: 'Courtyard', r: [4, 11, 33, 24], col: '#7fc8ff', lane: 'amid' }, { k: 'blong', n: 'B Icefall', r: [4, 26, 33, 34], col: '#b5523f', lane: 'blong' },
      { k: 'asite', n: 'A Lab', r: [35, 1, 43, 10], col: '#ff8a3d', lane: 'any' }, { k: 'link', n: 'Pipes', r: [34, 12, 43, 23], col: '#8d6bb0', lane: 'bmid' },
      { k: 'bsite', n: 'B Hangar', r: [35, 25, 43, 34], col: '#c46bff', lane: 'any' }, { k: 'dspawn', n: 'Dorms', r: [45, 1, 50, 34], col: '#4f7fb0', lane: 'any' },
    ],
    routes: { along: [[4, 6], [33.5, 5]], amid: [[5, 15], [32, 14], [36.5, 11.5]], bmid: [[5, 20], [32, 21], [36.5, 24]], blong: [[4, 29], [33.5, 30]] },
    rsite: { along: 0, amid: 0, bmid: 1, blong: 1 },
  });
}

/* SANDGATE (desert, two sites, split spawns). An old caravan fort where the dunes meet the wall. The defenders hold the Keep
   in the middle, with a door straight up onto A and one straight down onto B. The attackers start at both ends of the map,
   half the team on each side, and can hit either site from either end. */
{
  const d = sheet(52, 36);
  d.wall(3, 13, 3, 22); d.rect(1, 15, 2, 20, 'A'); d.wall(48, 13, 48, 22); d.rect(49, 15, 50, 20, 'A');
  // the Keep, and the dunes either side of it
  d.wall(21, 12, 30, 12); d.wall(21, 23, 30, 23); d.wall(21, 12, 21, 23); d.wall(30, 12, 30, 23); d.door(25, 12, 26, 12); d.door(25, 23, 26, 23);
  d.rect(24, 16, 27, 19, 'D'); d.roof(22, 13, 29, 22, 3.4);
  d.rect(8, 13, 17, 22, '#'); d.door(8, 17, 17, 18); d.roof(8, 17, 17, 18, 2.8); d.rect(34, 13, 43, 22, '#'); d.door(34, 17, 43, 18); d.roof(34, 17, 43, 18, 2.8);
  // A on the north, B on the south: a door from each side, a door from the Keep
  d.wall(19, 1, 19, 11); d.door(19, 4, 19, 6); d.wall(32, 1, 32, 11); d.door(32, 4, 32, 6); d.wall(19, 11, 32, 11); d.door(25, 11, 26, 11);
  d.rect(22, 3, 29, 8, 'o'); d.rect(25, 5, 26, 5, 'X'); d.at(22, 8, 'c'); d.at(29, 3, 'c');
  d.wall(19, 24, 19, 34); d.door(19, 29, 19, 31); d.wall(32, 24, 32, 34); d.door(32, 29, 32, 31); d.wall(19, 24, 32, 24); d.door(25, 24, 26, 24);
  d.rect(22, 27, 29, 32, 'q'); d.rect(25, 30, 26, 30, 'X'); d.at(22, 27, 'c'); d.at(29, 32, 'c');
  // cover in the four dunes
  d.at(10, 5, 'c'); d.rect(14, 8, 15, 8, 'X'); d.at(6, 10, 'c'); d.at(41, 5, 'c'); d.rect(36, 8, 37, 8, 'X'); d.at(45, 10, 'c');
  d.at(10, 30, 'c'); d.rect(14, 27, 15, 27, 'X'); d.at(6, 25, 'c'); d.at(41, 30, 'c'); d.rect(36, 27, 37, 27, 'X'); d.at(45, 25, 'c');
  MAPS.push({ k: 'sandgate', n: 'Sandgate', theme: 'desert', mech: 'split', split: true, sites: 2, roundT: 100, tag: 'An old caravan fort where the dunes meet the wall.', tip: 'The attackers start at both ends, half the team on each side; the defenders start in the Keep between the sites. Watch both doors.',
    src: d.src(), roofs: d.roofs, doors: d.doors,
    areas: [
      { k: 'wspawn', n: 'West Camp', r: [1, 1, 3, 34], col: '#8a9a5b', lane: 'any' }, { k: 'espawn', n: 'East Camp', r: [48, 1, 50, 34], col: '#8a9a5b', lane: 'any' },
      { k: 'wn', n: 'West Dunes', r: [4, 1, 18, 12], col: '#e2bf86', lane: 'wn' }, { k: 'ws', n: 'West Wash', r: [4, 23, 18, 34], col: '#2aa7a0', lane: 'ws' },
      { k: 'en', n: 'East Dunes', r: [33, 1, 47, 12], col: '#e2bf86', lane: 'en' }, { k: 'es', n: 'East Wash', r: [33, 23, 47, 34], col: '#2aa7a0', lane: 'es' },
      { k: 'wt', n: 'West Arch', r: [4, 13, 20, 22], col: '#d9a441', lane: 'any' }, { k: 'et', n: 'East Arch', r: [31, 13, 47, 22], col: '#d9a441', lane: 'any' },
      { k: 'asite', n: 'A Gatehouse', r: [20, 1, 31, 10], col: '#ff8a3d', lane: 'any' }, { k: 'bsite', n: 'B Cistern', r: [20, 25, 31, 34], col: '#c46bff', lane: 'any' },
      { k: 'dspawn', n: 'Keep', r: [21, 11, 30, 24], col: '#4f7fb0', lane: 'any' },
    ],
    routes: { wn: [[4, 12], [18.5, 5]], ws: [[4, 23], [18.5, 30]], en: [[47, 12], [32.5, 5]], es: [[47, 23], [32.5, 30]] },
    rsite: { wn: 0, en: 0, ws: 1, es: 1 },
  });
}

/* VERDANCE (jungle, three sites). Temple ruins swallowed by the rainforest, with three places to plant: A up in the north,
   B in the sunken courtyard in the middle, C down in the south. Three sites are a lot to hold: the defenders have to
   spread out, and rotate fast. */
{
  const d = sheet(52, 36);
  d.wall(3, 13, 3, 22); d.rect(1, 15, 2, 20, 'A');
  d.wall(4, 10, 29, 10); d.wall(4, 25, 29, 25); d.door(24, 10, 25, 10); d.door(24, 25, 25, 25); d.door(8, 10, 9, 10); d.door(8, 25, 9, 25);
  d.rect(12, 4, 13, 5, 'X'); d.at(19, 2, 'c'); d.at(24, 7, 'c'); d.rect(12, 30, 13, 31, 'X'); d.at(19, 33, 'c'); d.at(24, 28, 'c'); d.roof(14, 27, 22, 34, 3);
  d.rect(9, 14, 10, 15, 'X'); d.at(15, 20, 'c'); d.rect(19, 13, 20, 13, 'X'); d.rect(19, 22, 20, 22, 'X');
  // A
  d.wall(30, 1, 30, 9); d.door(30, 4, 30, 6); d.wall(30, 9, 42, 9); d.door(33, 9, 34, 9); d.wall(42, 1, 42, 9); d.door(42, 5, 42, 6);
  d.rect(33, 2, 39, 7, 'o'); d.rect(36, 4, 36, 5, 'X'); d.at(33, 2, 'c'); d.at(39, 7, 'c');
  // B: the sunken courtyard
  d.wall(29, 12, 29, 23); d.door(29, 14, 29, 15); d.door(29, 20, 29, 21); d.wall(29, 12, 41, 12); d.wall(29, 23, 41, 23); d.wall(41, 12, 41, 23); d.door(41, 17, 41, 18);
  d.rect(32, 14, 38, 21, 'q'); d.rect(35, 16, 35, 17, 'X'); d.rect(33, 20, 33, 20, 'X'); d.at(37, 14, 'c');
  // C
  d.wall(30, 26, 30, 34); d.door(30, 29, 30, 31); d.wall(30, 26, 42, 26); d.door(33, 26, 34, 26); d.wall(42, 26, 42, 34); d.door(42, 29, 42, 30);
  d.rect(33, 28, 39, 33, 'r'); d.rect(36, 30, 36, 31, 'X'); d.at(33, 33, 'c'); d.at(39, 28, 'c');
  d.wall(43, 1, 43, 34); d.door(43, 5, 43, 6); d.door(43, 17, 43, 18); d.door(43, 29, 43, 30);
  d.rect(49, 15, 50, 20, 'D');
  MAPS.push({ k: 'verdance', n: 'Verdance', theme: 'jungle', mech: 'three', sites: 3, roundT: 105, tag: 'Temple ruins swallowed by the rainforest.', tip: 'Three sites: A in the north, B in the sunken courtyard in the middle, C in the south. Defenders, spread out and rotate fast.',
    src: d.src(), roofs: d.roofs, doors: d.doors,
    areas: [
      { k: 'aspawn', n: 'Riverboat', r: [1, 1, 3, 34], col: '#8a9a5b', lane: 'any' }, { k: 'along', n: 'A Canopy', r: [4, 1, 29, 9], col: '#7bd88f', lane: 'along' },
      { k: 'mid', n: 'Garden', r: [4, 11, 28, 24], col: '#d9a441', lane: 'bmid' }, { k: 'clong', n: 'C Roots', r: [4, 26, 29, 34], col: '#2aa7a0', lane: 'clong' },
      { k: 'asite', n: 'A Temple', r: [31, 1, 41, 8], col: '#ff8a3d', lane: 'any' }, { k: 'bsite', n: 'B Courtyard', r: [30, 13, 40, 22], col: '#c46bff', lane: 'any' },
      { k: 'csite', n: 'C Shrine', r: [31, 27, 41, 34], col: '#ffd23f', lane: 'any' }, { k: 'gap', n: 'Steps', r: [30, 9, 42, 12], col: '#8d6bb0', lane: 'alink' },
      { k: 'gap2', n: 'Stairs', r: [30, 23, 42, 26], col: '#8d6bb0', lane: 'clink' }, { k: 'dspawn', n: 'Sanctum', r: [43, 1, 50, 34], col: '#4f7fb0', lane: 'any' },
    ],
    routes: { along: [[4, 6], [30, 5]], alink: [[5, 14], [24.5, 10.5], [33.5, 9.5]], bmid: [[5, 17], [28.5, 14.5]], clink: [[5, 21], [24.5, 25.5], [33.5, 26]], clong: [[4, 29], [30, 30]] },
    rsite: { along: 0, alink: 0, bmid: 1, clink: 2, clong: 2 },
  });
}

/* IRONWORKS (lava, two sites, conveyor belts). A foundry on the rim of a caldera. The ore belts never stop: B Long's belt
   carries you toward the site, A Long's runs back toward the attackers, and the Spine belt between the sites runs north.
   Walk with a belt and you fly; walk against it and you crawl. */
{
  const d = sheet(52, 36);
  d.wall(3, 13, 3, 22); d.rect(1, 15, 2, 20, 'A');
  d.wall(4, 10, 32, 10); d.wall(4, 25, 32, 25); d.door(10, 10, 11, 10); d.door(10, 25, 11, 25);
  d.rect(8, 4, 30, 5, '<'); d.at(14, 2, 'c'); d.rect(20, 7, 21, 8, 'X'); d.at(26, 2, 'c'); d.at(6, 7, 'c');
  d.rect(8, 29, 30, 30, '>'); d.at(14, 33, 'c'); d.rect(20, 27, 21, 27, 'X'); d.at(26, 33, 'c'); d.at(6, 28, 'c'); d.roof(16, 26, 26, 34, 3.4);
  // the Furnace floor in the middle
  d.wall(13, 13, 13, 22); d.door(13, 16, 13, 19); d.rect(17, 15, 19, 16, 'X'); d.rect(23, 19, 25, 20, 'X'); d.at(21, 13, 'c'); d.at(16, 21, 'c'); d.at(28, 17, 'c'); d.roof(14, 12, 31, 23, 4.2);
  d.wall(32, 11, 32, 24); d.door(32, 14, 32, 15); d.door(32, 20, 32, 21);
  // the sites, and the Spine belt between them
  d.wall(33, 1, 33, 10); d.door(33, 4, 33, 6); d.wall(33, 10, 45, 10); d.door(39, 10, 41, 10); d.wall(45, 1, 45, 10); d.door(45, 5, 45, 6);
  d.rect(35, 2, 42, 7, 'o'); d.rect(38, 4, 38, 5, 'X'); d.at(35, 7, 'c'); d.at(42, 2, 'c');
  d.wall(33, 25, 33, 34); d.door(33, 29, 33, 31); d.wall(33, 25, 45, 25); d.door(39, 25, 41, 25); d.wall(45, 25, 45, 34); d.door(45, 29, 45, 30);
  d.rect(35, 28, 42, 33, 'q'); d.rect(38, 30, 38, 31, 'X'); d.at(35, 28, 'c'); d.at(42, 33, 'c');
  d.rect(39, 11, 41, 24, '^'); d.wall(45, 11, 45, 24); d.door(45, 17, 45, 18); d.at(36, 17, 'c'); d.rect(43, 14, 43, 15, 'X'); d.rect(43, 20, 43, 21, 'X');
  d.rect(49, 15, 50, 20, 'D');
  MAPS.push({ k: 'ironworks', n: 'Ironworks', theme: 'lava', mech: 'belts', sites: 2, roundT: 105, tag: 'A foundry on the rim of a live caldera.', tip: 'Ore belts never stop: B Long carries you toward the site, A Long runs back at you, and the Spine between the sites runs north.',
    src: d.src(), roofs: d.roofs, doors: d.doors,
    areas: [
      { k: 'aspawn', n: 'Rail Yard', r: [1, 1, 3, 34], col: '#8a9a5b', lane: 'any' }, { k: 'along', n: 'A Belt', r: [4, 1, 32, 9], col: '#ffb347', lane: 'along' },
      { k: 'mid', n: 'Furnace', r: [4, 11, 31, 24], col: '#d9a441', lane: 'amid' }, { k: 'blong', n: 'B Belt', r: [4, 26, 32, 34], col: '#b5523f', lane: 'blong' },
      { k: 'asite', n: 'A Crucible', r: [34, 1, 44, 9], col: '#ff8a3d', lane: 'any' }, { k: 'spine', n: 'Spine', r: [33, 11, 44, 24], col: '#8d6bb0', lane: 'bmid' },
      { k: 'bsite', n: 'B Slag Pit', r: [34, 26, 44, 34], col: '#c46bff', lane: 'any' }, { k: 'dspawn', n: 'Control', r: [46, 1, 50, 34], col: '#4f7fb0', lane: 'any' },
    ],
    routes: { along: [[4, 7], [32.5, 5]], amid: [[5, 15], [13, 17.5], [32, 14.5], [40, 10.5]], bmid: [[5, 20], [13, 18.5], [32, 20.5], [40, 25]], blong: [[4, 28], [32.5, 30]] },
    rsite: { along: 0, amid: 0, bmid: 1, blong: 1 },
  });
}

// ---------- maps drawn as pictures, one file each in tools/dp-maps/<key>.mjs (see tools/dp-maps/_art.mjs) ----------
// a file there takes the place of the map above with the same key (or is added at the end)
{
  const md = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dp-maps');
  for (const f of fs.readdirSync(md).filter(f => /^[a-z0-9]+\.mjs$/.test(f)).sort()) {
    try { const def = (await import(path.join(md, f))).default; const i = MAPS.findIndex(m => m.k === def.k); if (i >= 0) MAPS[i] = def; else MAPS.push(def); }
    catch (e) { console.log('SKIPPED tools/dp-maps/' + f + ': ' + e.message); }
  }
}

// ---------- checks ----------
const parts = fs.readdirSync(dir).filter(f => /^[1-3]\d-.*\.js$/.test(f) && f !== '29-maps.js').sort();
const code = parts.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const K = { save: {}, persist() {}, bot: false, state: 'play' }, MP = { online: () => false, isHost: () => true, send() {}, opts: {} };
const T = new Function('K', 'MP', 'MAP_DEFS', code.replace('const MAP_DEFS = ', 'const MAP_DEFS_UNUSED = ') + `; return { setWall, resetMech, MAPS, loadMap, findPath, pathLen, rayGrid, SPAWN, SITE, SITES, siteC, NAV, TPS, TPX, PADS, PADX, idx, size: () => [GW, GH], CS, HOLDS, ROUTES, RSITE, joined, CH, CAX, STEP, HIGH_H, ZONE };`)(K, MP, []);
const sees = (p, q) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]); return T.rayGrid(p[0], 1.6, p[1], (q[0] - p[0]) / L, 0, (q[1] - p[1]) / L, 200) >= L - .5; };
const walk = (a, b) => { const q = T.findPath(a[0], a[1], b[0], b[1]); return q.length || Math.hypot(a[0] - b[0], a[1] - b[1]) < 1.5 ? T.pathLen(q, a[0], a[1]) / SPD : 1e9; };
// where you end up after stepping on a cell (a teleporter or a jump pad moves you)
const after = p => { const [GW] = T.size(), k = T.idx(Math.floor(p[0] / 2), Math.floor(p[1] / 2)); if (k >= 0 && T.TPX[k] >= 0) return T.TPS[T.TPX[k]].b; if (k >= 0 && T.PADX[k] >= 0) return T.PADS[T.PADX[k]].b; return p; };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function load(def) { T.MAPS.push(def); T.loadMap(T.MAPS.length - 1); T.MAPS.pop(); }
function check(def) {
  load(def);
  const many = T.SITES.length > 1, band = many ? [9, 21] : [8, 19], defMax = many ? 8.5 : 6.5, out = { ok: true, why: [], times: {} };
  const [W, H] = T.size(); if (def.src.some(r => r.length !== W)) { out.ok = false; out.why.push('ragged rows'); }
  if (!def.rsite && many) { out.ok = false; out.why.push('no rsite'); }
  const starts = def.split ? [T.SPAWN.att.find(p => p[0] < W), T.SPAWN.att.find(p => p[0] > W)] : [T.SPAWN.att[0]];
  for (const [name, pts] of Object.entries(def.routes)) {
    const S = T.SITES[def.rsite ? def.rsite[name] : 0].c;
    let a = T.SPAWN.att[0]; if (def.split) { const p0 = [pts[0][0] * 2, pts[0][1] * 2]; a = T.SPAWN.att.reduce((b, p) => Math.hypot(p[0] - p0[0], p[1] - p0[1]) < Math.hypot(b[0] - p0[0], b[1] - p0[1]) ? p : b); }
    let x = a[0], z = a[1], t = 0; const brk = def.rbrk && def.rbrk[name]; if (brk != null) T.setWall(brk, false);
    for (const p of [...pts.map(q => [q[0] * 2, q[1] * 2]), S]) { t += walk([x, z], p); [x, z] = after(p); }
    if (brk != null) T.resetMech(); out.times[name] = t;
    if (t < band[0] || t > band[1]) { out.ok = false; out.why.push(`${name} ${t > 1e8 ? 'no path' : t.toFixed(1) + 's'}`); }
  }
  T.SITES.forEach((S, i) => { const t = Math.min(...T.SPAWN.def.map(p => walk(p, S.c))); out.times['def' + S.k] = t; if (t > defMax) { out.ok = false; out.why.push(`defender to ${S.k} ${t.toFixed(1)}s`); } });
  for (let i = 0; i + 1 < T.SITES.length; i++) { const t = walk(T.SITES[i].c, T.SITES[i + 1].c); out.times['rot' + T.SITES[i].k + T.SITES[i + 1].k] = t; if (t > 17) { out.ok = false; out.why.push(`rotate ${t.toFixed(1)}s`); } }
  const allSite = T.SITES.flatMap(S => S.cells);
  if (T.SPAWN.att.some(p => allSite.some(q => sees(p, q)) || T.SPAWN.def.some(q => sees(p, q)))) { out.ok = false; out.why.push('spawn sees'); }
  if (T.SPAWN.def.some(p => T.SPAWN.att.some(q => sees(p, q)))) { out.ok = false; out.why.push('defenders see attackers'); }
  // every open cell can be reached (teleporters and pads count as the way they go)
  const seen = new Set(), st = [T.SPAWN.att[0], ...T.SPAWN.def].map(p => [Math.floor(p[0] / 2), Math.floor(p[1] / 2)]);
  // walking the way a fighter can: steps no higher than a stair, drops off ledges, teleporters and pads to where they go
  while (st.length) { const [i, j] = st.pop(), k = T.idx(i, j); if (k < 0 || seen.has(k) || !T.NAV[k]) continue; seen.add(k);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = T.idx(i + di, j + dj); if (nk < 0 || !T.NAV[nk]) continue; if (T.joined(i, j, di, dj) || (T.CH[k] - T.CH[nk] > T.STEP && T.CH[k] - T.CH[nk] <= T.HIGH_H + .1 && !T.CAX[k] && !T.CAX[nk])) st.push([i + di, j + dj]); } if (T.TPX[k] >= 0) { const b = T.TPS[T.TPX[k]].b; st.push([Math.floor(b[0] / 2), Math.floor(b[1] / 2)]); } if (T.PADX[k] >= 0) { const b = T.PADS[T.PADX[k]].b; st.push([Math.floor(b[0] / 2), Math.floor(b[1] / 2)]); } }
  let n = 0; for (let k = 0; k < W * H; k++) if (T.NAV[k]) n++; if (seen.size !== n) { out.ok = false; out.why.push(`${n - seen.size} cells cut off`); }
  if (T.SPAWN.att.length < 4 || T.SPAWN.def.length < 4) { out.ok = false; out.why.push('spawns too small for 4v4'); }
  // the buy-phase barrier: each side's spawn room (the cells round its spawn) holds four standing apart
  for (const side of ['att', 'def']) { let n = 0; for (let k = 0; k < W * H; k++) if (T.ZONE[side][k]) n++; if (n < 8) { out.ok = false; out.why.push(`${side} spawn room too small for 4v4 (${n} cells)`); } }
  return out;
}
// defender holds: the places a defender may be waiting. For each way in: up to three spots near the site that watch where it
// arrives, chosen for how tucked away they are (in a corner, behind a half wall or a crate, at a window, up on a ledge, in
// the dark under a roof), and up to two close ones just inside the entry that cannot be seen from the approach (the corner
// you have to check as you come through). And one on each site.
function holdsFor(def, seed) {
  load(def);
  const R = rng(seed), out = [], [W, H] = T.size(), ch = (i, j) => (def.src[j] || '')[i] || '#';
  const dark = (i, j) => (def.roofs || []).some(r => i >= r.r[0] && i <= r.r[2] && j >= r.r[1] && j <= r.r[3]);
  const score = (i, j, E) => { let tuck = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if ((a || b) && !T.NAV[T.idx(i + a, j + b)]) tuck++;
    const dx = E[0] / 2 - (i + .5), dz = E[1] / 2 - (j + .5), sx = Math.abs(dx) > .6 ? Math.sign(dx) : 0, sz = Math.abs(dz) > .6 ? Math.sign(dz) : 0;
    const front = [[sx, sz], [Math.abs(dx) >= Math.abs(dz) ? sx : 0, Math.abs(dx) >= Math.abs(dz) ? 0 : sz]].some(([a, b]) => (a || b) && 'hwc'.includes(ch(i + a, j + b)));
    return 1 + Math.min(tuck, 5) + (front ? 5 : 0) + (T.CH[T.idx(i, j)] >= 1.4 ? 3 : 0) + (dark(i, j) ? 2 : 0); };
  const take = (c, n, lane, s, e) => { const got = []; for (let t = 0; t < n && c.length; t++) {
      const tot = c.reduce((a, q) => a + q.w, 0); let r = R() * tot, k = 0; while (k < c.length - 1 && (r -= c[k].w) > 0) k++;
      const p = c[k].p; got.push(p); out.push({ p: [p[0] / 2, p[1] / 2], look: e, lane, s }); c = c.filter(q => Math.hypot(q.p[0] - p[0], q.p[1] - p[1]) >= 5); } };
  for (const [lane, pts] of Object.entries(def.routes)) {
    const s = def.rsite ? def.rsite[lane] : 0, e = pts[pts.length - 1], E = [e[0] * 2, e[1] * 2], S = T.SITES[s].c, far = [], near = [];
    if (out.some(h => h.s === s && Math.hypot(h.look[0] - e[0], h.look[1] - e[1]) < 1)) continue;   // two ways that arrive at the same door share its holds
    const b = pts.length > 1 ? pts[pts.length - 2] : null, B = b ? [b[0] * 2, b[1] * 2] : T.SPAWN.att[0];   // where the attackers come from
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
      const k = T.idx(i, j); if (!T.NAV[k] || 'AD'.includes(def.src[j][i]) || T.TPX[k] >= 0 || T.PADX[k] >= 0) continue;
      const p = [i * 2 + 1, j * 2 + 1], dS = Math.hypot(p[0] - S[0], p[1] - S[1]), dE = Math.hypot(p[0] - E[0], p[1] - E[1]); if (!sees(p, E)) continue;
      if (dS < 16 && dE > 7 && dE < 24) { const w = score(i, j, E); far.push({ p, w: w * w }); }
      else if (dE > 2.4 && dE <= 7 && dS < Math.hypot(B[0] - S[0], B[1] - S[1]) && !sees(p, B)) { const w = score(i, j, E); near.push({ p, w: w * w }); }
    }
    take(far, 3, lane, s, e); take(near, 2, lane, s, e);
  }
  T.SITES.forEach((S, s) => { const lanes = Object.keys(def.routes).filter(l => (def.rsite ? def.rsite[l] : 0) === s), e = def.routes[lanes[0]].slice(-1)[0]; out.push({ p: [S.c[0] / 2, S.c[1] / 2], look: e, lane: 'any', s }); });
  return out;
}
function show(def) {
  load(def); const g = def.src.map(r => r.split(''));
  Object.values(def.routes).forEach((pts, n) => pts.forEach(p => { const i = Math.floor(p[0]), j = Math.floor(p[1]); if (g[j] && g[j][i] === '.') g[j][i] = String(n + 1); }));
  for (const h of def.holds || []) { const i = Math.floor(h.p[0]), j = Math.floor(h.p[1]); if (g[j] && '.oqrPH'.includes(g[j][i])) g[j][i] = '*'; }
  return '     ' + Array.from({ length: g[0].length }, (_, i) => i % 10).join('') + '\n' + g.map((r, j) => String(j).padStart(3) + '  ' + r.join('')).join('\n');
}

// how straight each way in is: the farthest a fighter coming along it can see onto its site (a rifle lane is long, a
// way that bends is short). node tools/duelpoint-maps.mjs --lanes
function laneSight(def) {
  load(def); const out = {};
  for (const [name, pts] of Object.entries(def.routes)) {
    const S = T.SITES[def.rsite ? def.rsite[name] : 0], cells = S.cells; let a = T.SPAWN.att[0];
    if (def.split) { const p0 = [pts[0][0] * 2, pts[0][1] * 2]; a = T.SPAWN.att.reduce((b, p) => Math.hypot(p[0] - p0[0], p[1] - p0[1]) < Math.hypot(b[0] - p0[0], b[1] - p0[1]) ? p : b); }
    const brk = def.rbrk && def.rbrk[name]; if (brk != null) T.setWall(brk, false);
    let x = a[0], z = a[1], best = 0, from = null; const path = [];
    for (const p of [...pts.map(q => [q[0] * 2, q[1] * 2]), S.c]) { const q = T.findPath(x, z, p[0], p[1]); for (const w of q) path.push(w); [x, z] = after(p); }
    let to = null, far = 0; const dense = []; for (let k = 0; k + 1 < path.length; k++) { const a2 = path[k], c2 = path[k + 1], n = Math.max(1, Math.ceil(Math.hypot(c2[0] - a2[0], c2[1] - a2[1]))); for (let q = 0; q < n; q++) dense.push([lp(a2[0], c2[0], q / n), lp(a2[1], c2[1], q / n)]); }
    const lines = []; for (const p of dense) { if (cells.some(c => Math.hypot(c[0] - p[0], c[1] - p[1]) < 1.5)) break; let seenFar = false; for (const c of cells) { const d = Math.hypot(c[0] - p[0], c[1] - p[1]); if (d > 14 && sees(p, c)) { if (!seenFar) far++; seenFar = true; lines.push([p, c]); } if (d > best && sees(p, c)) { best = d; from = p; to = c; } } }
    if (brk != null) T.resetMech(); out[name] = { site: S.k, open: best, from, to, path, far, lines };
  }
  return out;
}
/* Bend the ways in: at every site reached by two or more long, straight ways, the straightest stays as it is (the rifle
   lane) and each other one gets a chicane a few metres short of the site: two short runs of crates, one from each side,
   that make you zig-zag through and cut the long look onto the site, so the fight there is close. A chicane is kept only
   if the map stays fair (every check above), the lane's long look is gone, the rifle lane is untouched, and it stands on
   plain floor (no doorway, roof, waypoint or special cell). Writes the crates into tools/dp-maps/<key>.mjs.
   node tools/duelpoint-maps.mjs --bend [key] */
function bend(def) {
  const md = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dp-maps'), file = path.join(md, def.k + '.mjs'); if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, 'utf8'), a0 = raw.indexOf('art(['), rowsAt = []; { const re = /'([^'\n]*)'/g; re.lastIndex = a0; let mm; while (rowsAt.length < def.src.length && (mm = re.exec(raw))) if (mm[1].length === def.src[0].length) rowsAt.push({ at: mm.index + 1, s: mm[1] }); }
  if (rowsAt.length !== def.src.length) return ['rows not found'];
  const art = rowsAt.map(r => r.s.split('')), log = [];
  // a lane is a way onto the site: routes that arrive through the same doorway (their last stop within a few cells) are one lane
  const L0 = laneSight(def), bySite = {};
  for (const [n, v] of Object.entries(L0)) { const e = def.routes[n][def.routes[n].length - 1], lanes2 = bySite[v.site] = bySite[v.site] || []; let g = lanes2.find(q => Math.hypot(q.e[0] - e[0], q.e[1] - e[1]) < 3.5);
    if (!g) lanes2.push(g = { e, names: [], v: null }); g.names.push(n); if (!g.v || v.open > g.v.open) { g.v = v; g.n = n; } }
  for (const k of Object.keys(bySite)) bySite[k] = bySite[k].map(g => [g.n, g.v, g.names]);
  const wp = new Set(); for (const pts of Object.values(def.routes)) for (const q of pts) wp.add(Math.floor(q[0]) + ',' + Math.floor(q[1]));
  for (const [site, lanes] of Object.entries(bySite)) {
    lanes.sort((x, y) => y[1].open - x[1].open); const keep = lanes[0];
    if (lanes.length < 2) { log.push(`${site}: one way in, nothing to bend`); continue; }
    for (const [name, v, group] of lanes.slice(1)) {
      if (v.far === 0) { log.push(`${site} ${name}: already bends (${v.open.toFixed(0)} m)`); continue; }
      // break the long looks: containers in the way, a few metres short of the site, until no step along the lane sees the
      // site from more than 14 m (each one must lower that count, keep the map fair and leave the rifle lane's look alone)
      let done = v.far === 0, cur = v; const why = { unfair: 0, keep: 0, none: 0 }, placed = [];
      for (let it = 0; it < 8 && !done && placed.length + (v.placedBefore || 0) < 8; it++) {
        load(def); const siteCells = new Set(T.SITES.flatMap(S2 => S2.cells).map(c => Math.floor(c[0] / 2) + ',' + Math.floor(c[1] / 2)));
        // score the floor cells by how many of the lane's far looks cross them, just outside the site (1.5 to 12 m out)
        const score = new Map();
        for (const [f, t] of cur.lines) { const L = Math.hypot(t[0] - f[0], t[1] - f[1]); let u0 = 0, seenC = new Set();
          for (let u = 0; u <= L; u += .5) { const x = lp(t[0], f[0], u / L), z = lp(t[1], f[1], u / L); if (siteCells.has(Math.floor(x / 2) + ',' + Math.floor(z / 2))) u0 = u + .5; }
          for (let u = u0 + 1.5; u <= Math.min(L, u0 + 12); u += .5) { const x = lp(t[0], f[0], u / L), z = lp(t[1], f[1], u / L), ci = Math.floor(x / 2), cj = Math.floor(z / 2), key = ci + ',' + cj; if (seenC.has(key)) continue; seenC.add(key);
            if (siteCells.has(key) || wp.has(key) || !art[cj] || !'._'.includes(art[cj][ci]) || def.src[cj][ci] !== '.') continue; score.set(key, (score.get(key) || 0) + 1); } }
        const cand = [...score.entries()].sort((a2, b2) => b2[1] - a2[1]).slice(0, 10).map(([k2]) => k2.split(',').map(Number));
        let bestC = null;
        for (const [ci, cj] of cand) {
          const keepSrc = def.src; def.src = keepSrc.map((r, jj) => jj === cj ? r.slice(0, ci) + 'X' + r.slice(ci + 1) : r);
          const r = check(def), L1 = r.ok ? laneSight(def) : null; def.src = keepSrc;
          if (!r.ok) { why.unfair++; continue; } if (L1[keep[0]].open < keep[1].open - 1) { why.keep++; continue; }
          if (L1[name].lines.length < cur.lines.length * .93 && (!bestC || L1[name].lines.length < bestC.L.lines.length)) bestC = { ci, cj, L: L1[name] };   // each must cut a real share of the long looks
        }
        if (!bestC) { why.none++; break; }
        def.src = def.src.map((r, jj) => jj === bestC.cj ? r.slice(0, bestC.ci) + 'X' + r.slice(bestC.ci + 1) : r); art[bestC.cj][bestC.ci] = 'X'; placed.push([bestC.ci, bestC.cj]); cur = bestC.L; if (cur.far === 0 || cur.lines.length <= v.lines.length * .15) done = true;
      }
      if (done) log.push(`${site} ${name}: ${placed.length} container(s) at ${placed.map(c => c.join(',')).join(' ')} (far looks ${v.far} -> 0, longest ${v.open.toFixed(0)} m -> ${cur.open.toFixed(0)} m), ${keep[0]} stays straight (${keep[1].open.toFixed(0)} m)`);
      else if (placed.length) { log.push(`${site} ${name}: PARTLY ${placed.length} container(s) at ${placed.map(c => c.join(',')).join(' ')} (far looks ${v.far} -> ${cur.far}, longest ${v.open.toFixed(0)} m -> ${cur.open.toFixed(0)} m) ${JSON.stringify(why)}`); }
      if (!done && !placed.length) log.push(`${site} ${name}: NOTHING PLACED (${v.open.toFixed(0)} m from ${v.from.map(q => (q / 2).toFixed(0))}) ${JSON.stringify(why)}`);
    }
  }
  let out = raw; for (let j = rowsAt.length - 1; j >= 0; j--) { const r = rowsAt[j], ns = art[j].join(''); if (ns !== r.s) out = out.slice(0, r.at) + ns + out.slice(r.at + r.s.length); }
  if (out !== raw) fs.writeFileSync(file, out);
  return log;
}
const only = process.argv[2];
if (only === '--bend') { for (const def of MAPS) { if (process.argv[3] && def.k !== process.argv[3]) continue; console.log(def.n); for (const l of bend(def)) console.log('   ' + l); } process.exit(0); }
if (only === '--lanes') { for (const def of MAPS) { const L = laneSight(def), bySite = {}; for (const [n, v] of Object.entries(L)) (bySite[v.site] = bySite[v.site] || []).push(n + ' ' + v.open.toFixed(0) + 'm' + (v.from ? ' from (' + (v.from[0] / 2).toFixed(0) + ',' + (v.from[1] / 2).toFixed(0) + ')' : ''));
  console.log(def.n.padEnd(14), Object.entries(bySite).map(([k, v]) => k + ': ' + v.join(' | ')).join('    ')); } process.exit(0); }
let bad = 0;
for (const def of MAPS) {
  if (only && def.k !== only) continue;
  const r = check(def);
  def.holds = holdsFor(def, def.k.length * 977);
  console.log(`${r.ok ? 'OK  ' : 'BAD '} ${def.n.padEnd(14)} ${Object.entries(r.times).map(([k, v]) => `${k} ${v > 1e8 ? '—' : v.toFixed(1)}`).join('  ')}${r.ok ? '' : '   <- ' + r.why.join(', ')}`);
  if (only || !r.ok) console.log(show(def) + '\n');
  if (!r.ok) bad++;
}
if (!only) {
  if (bad) { console.log(`\n${bad} map(s) not fair: nothing written`); process.exit(1); }
  const js = MAPS.map(d => '    ' + JSON.stringify(d).replace(/'/g, '’').replace(/"(\w+)":/g, '$1: ').replace(/"/g, "'").replace(/,(?=\S)/g, ', ') + ',').join('\n');
  fs.writeFileSync(outFile, `  /* ---------- 29 maps: the hand-drawn maps (all but Saltworks), written by tools/duelpoint-maps.mjs: edit them there ---------- */\n  const MAP_DEFS = [\n${js}\n  ];\n`);
  console.log('wrote', MAPS.length, 'maps to', path.relative(process.cwd(), outFile));
}
