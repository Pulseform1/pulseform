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
  '#########....................XX..c.......X......##',
  '#########.oooooooooooc.......XX..........X......##',
  '#########.oXoooXoooXo........................c..##',
  '#......:..ooooooooooo.....c.........X...........##',
  '#......:..ooooooocooo...........................##',
  '#.DDDD.#..ooocooooooo..####:##########.....X....##',
  '#.DDDD.#..ooooooooooo..:_____c____####..........##',
  '#......#..oXoooXoooXo..:__c_______#####__####::###',
  '#......#..ooooooooooo##########___#####__##.....c#',
  '#......#.cooooooooooo##########______c___##......#',
  '#.....c#...7........X77__######____c_____##.AAAA.#',
  '###::###...8.........88__###########:######.AAAA.#',
  '#........PPPPPPPPPPPPPP__##########____####......#',
  '#........PPPPPPPPPPPPPP__##########____####......#',
  '#######################__##########____######::###',
  '#######################__############:######....##',
  '#######################______________________...##',
  '#######################______________________..c##',
  '##################################################',
  '##################################################',
]);
export default { k: 'dunewatch', n: 'Dunewatch', theme: 'desert', mech: 'storm', roundT: 90,
  tag: 'A caravan fort on open sand: miles of dunes, a cramped bazaar, and an old aqueduct under the walls.',
  tip: 'A sandstorm blows through now and then: nobody sees further than a dozen metres while it lasts. Cross the Dunes under it; the Bazaar and the Aqueduct never see far anyway.',
  src: m.src, roofs: m.roofs, doors: m.doors,
  areas: [
    { k: 'aspawn', n: 'Caravan', r: [43, 9, 48, 16], col: '#8a9a5b', lane: 'any' },
    { k: 'dunes', n: 'Dunes', r: [24, 1, 47, 6], col: '#e2bf86', lane: 'dunes' },
    { k: 'ruins', n: 'Ruins', r: [27, 1, 32, 4], col: '#c9a26b', lane: 'dunes' },
    { k: 'gap', n: 'Dune Gap', r: [23, 1, 23, 6], col: '#f0d29a', lane: 'dunes' },
    { k: 'serai', n: 'Caravanserai', r: [38, 7, 47, 8], col: '#b8a07a', lane: 'any' },
    { k: 'bazaar', n: 'Bazaar', r: [33, 9, 40, 12], col: '#d9a441', lane: 'bazaar' },
    { k: 'dogleg', n: 'Dogleg', r: [31, 8, 33, 12], col: '#c9862e', lane: 'bazaar' },
    { k: 'stalls', n: 'Stalls', r: [24, 8, 30, 9], col: '#e0a84a', lane: 'bazaar' },
    { k: 'spice', n: 'Spice Door', r: [27, 7, 27, 7], col: '#d26a3a', lane: 'bazaar' },
    { k: 'bgate', n: 'Bazaar Gate', r: [23, 8, 23, 9], col: '#b5803f', lane: 'bazaar' },
    { k: 'rug', n: 'Rug Shop', r: [35, 13, 38, 17], col: '#a0522d', lane: 'aqueduct' },
    { k: 'cistern', n: 'Cistern', r: [44, 17, 47, 19], col: '#3f8f8a', lane: 'aqueduct' },
    { k: 'aqueduct', n: 'Aqueduct', r: [25, 18, 43, 19], col: '#2aa7a0', lane: 'aqueduct' },
    { k: 'shaft', n: 'Shaft', r: [23, 12, 24, 19], col: '#4fb0a8', lane: 'aqueduct' },
    { k: 'site', n: 'Courtyard', r: [8, 2, 22, 13], col: '#ff8a3d', lane: 'any' },
    { k: 'rampart', n: 'Rampart', r: [9, 12, 22, 15], col: '#8d6bb0', lane: 'any' },
    { k: 'postern', n: 'Postern', r: [1, 13, 8, 15], col: '#6b7fb0', lane: 'any' },
    { k: 'dspawn', n: 'Keep', r: [1, 5, 7, 12], col: '#4f7fb0', lane: 'any' },
  ],
  routes: {
    dunes: [[45.5, 7.5], [36, 3.5], [23.5, 4]],
    bazaar: [[45.5, 7.5], [39.5, 9.5], [33, 11.5], [31.5, 8.5], [23.5, 8.5]],
    aqueduct: [[45.5, 17.5], [34, 18.5], [23.5, 15], [21.5, 12.5], [20.5, 14.5]],
  },
};
