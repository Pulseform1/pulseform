import { art } from './_art.mjs';
/* DUNEWATCH (desert, one site, sandstorm). A caravan fort on open sand, drawn wide: the attackers come in from the
   Caravan in the east, the defenders hold from the Keep in the west, and the Courtyard sits west of centre, a wide square of
   columns with a raised rampart along its south edge.
   Ways in: the Dunes, a huge open stretch of sand across the north with long sightlines, onto the courtyard through the
   5-wide Dune Gap; the Bazaar, a narrow roofed market street with a dogleg, stalls and side doors (the Spice Door onto the
   dunes, the Rug Shop down to the aqueduct), onto it through the Bazaar Gate; and the Aqueduct, a long 2-wide sunken hall
   along the south that comes up a shaft and the stairs onto the rampart, over the site. */
const m = art([
  '##################################################',
  '########################........................##',
  '########################...........XX.......X...##',
  '########################...c....................##',
  '#########....................XX..c.......X......##',
  '#########...c........c.......XX..........X......##',
  '#########.ooooooooooo........................c..##',
  '#......#..oXoooXoooXo.....c.........X...........##',
  '#.DDDD.#..ooooooooooo...........................##',
  '#.DDDD.#..ooooooocooo..####:##########.....X....##',
  '#......#..ooocoooooooXX:_____c____####..........##',
  '#......#..ooooooooooo..:X_cX______#####__####::###',
  '#......:..oXoooXoooXo##########___#####__##.....c#',
  '#......:..ooooooooooo##########______c___##......#',
  '#.....c#.co7ooooooooX77__######____c_____##.AAAA.#',
  '###::###...8.X...X.XX88__###########:######.AAAA.#',
  '#........PPPPPPPPPPPPPP__##########____####......#',
  '#........PPPPPPPPPPPPPP__##########____####......#',
  '#######################__##########____######::###',
  '#######################__##########___c#####....##',
  '#######################__############:######....##',
  '#######################______________________...##',
  '#######################______________________..c##',
  '##################################################',
]);
export default { k: 'dunewatch', n: 'Dunewatch', theme: 'desert', mech: 'storm', roundT: 90,
  tag: 'A caravan fort on open sand: miles of dunes, a cramped bazaar, and an old aqueduct under the walls.',
  tip: 'A sandstorm blows through now and then: nobody sees further than a dozen metres while it lasts. Cross the Dunes under it; the Bazaar and the Aqueduct never see far anyway.',
  src: m.src, roofs: m.roofs, doors: m.doors,
  areas: [
    { k: 'aspawn', n: 'Caravan', r: [43, 11, 48, 18], col: '#8a9a5b', lane: 'any' },
    { k: 'dunes', n: 'Dunes', r: [24, 1, 47, 8], col: '#e2bf86', lane: 'dunes' },
    { k: 'ruins', n: 'Ruins', r: [27, 4, 32, 6], col: '#c9a26b', lane: 'dunes' },
    { k: 'gap', n: 'Dune Gap', r: [23, 4, 23, 8], col: '#f0d29a', lane: 'dunes' },
    { k: 'serai', n: 'Caravanserai', r: [38, 9, 47, 10], col: '#b8a07a', lane: 'any' },
    { k: 'bazaar', n: 'Bazaar', r: [33, 11, 40, 14], col: '#d9a441', lane: 'bazaar' },
    { k: 'dogleg', n: 'Dogleg', r: [31, 10, 33, 14], col: '#c9862e', lane: 'bazaar' },
    { k: 'stalls', n: 'Stalls', r: [24, 10, 30, 11], col: '#e0a84a', lane: 'bazaar' },
    { k: 'spice', n: 'Spice Door', r: [27, 9, 27, 9], col: '#d26a3a', lane: 'bazaar' },
    { k: 'bgate', n: 'Bazaar Gate', r: [23, 10, 23, 11], col: '#b5803f', lane: 'bazaar' },
    { k: 'rug', n: 'Rug Shop', r: [35, 15, 38, 20], col: '#a0522d', lane: 'aqueduct' },
    { k: 'cistern', n: 'Cistern', r: [44, 19, 47, 22], col: '#3f8f8a', lane: 'aqueduct' },
    { k: 'aqueduct', n: 'Aqueduct', r: [25, 21, 43, 22], col: '#2aa7a0', lane: 'aqueduct' },
    { k: 'shaft', n: 'Shaft', r: [23, 14, 24, 22], col: '#4fb0a8', lane: 'aqueduct' },
    { k: 'site', n: 'Courtyard', r: [8, 4, 22, 15], col: '#ff8a3d', lane: 'any' },
    { k: 'rampart', n: 'Rampart', r: [9, 14, 22, 17], col: '#8d6bb0', lane: 'any' },
    { k: 'postern', n: 'Postern', r: [1, 15, 8, 17], col: '#6b7fb0', lane: 'any' },
    { k: 'dspawn', n: 'Keep', r: [1, 7, 7, 14], col: '#4f7fb0', lane: 'any' },
  ],
  routes: {
    dunes: [[45.5, 9.5], [36, 5.5], [23.5, 6]],
    bazaar: [[45.5, 9.5], [39.5, 11.5], [33, 13.5], [31.5, 10.5], [23.5, 10.5]],
    aqueduct: [[45.5, 20.5], [34, 21.5], [23.5, 18], [21.5, 16.5]],
  },
};
