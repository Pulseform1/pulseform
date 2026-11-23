import { art } from './_art.mjs';
/* OVERGROWTH (jungle, one site, tall grass). Attackers land in the north-west, defenders hold the Reliquary in the
   south-east. The site is the Sunken Temple, a walled courtyard with a raised altar in the middle and grass in its corners.
   Three ways there, each its own kind of fight:
     Vine Hall   a long straight overgrown hall along the north (grass curtains, sniper sightline), round the Falls, down the
                 Vine Steps on the east side and in at the Vine Gate (2 wide).
     Ruins       broken rooms in the middle: Gatehouse, the roofed Pillar Hall, the Broken Hall, then the Arch Court and the
                 wide Arch (3 wide). Corners and doorways everywhere; the Collapse links it to Vine Hall.
     Riverbed    a winding 2-wide ravine down the south-west, a grass curtain at the end, in at the River Mouth.
   The Bridge runs from the Broken Hall down into the Riverbed. Defenders come up the roofed Sanctum to the Temple's east door,
   or out through the Vine Drop to catch Vine Hall from the side. */
const m = art([
  '########################################',
  '#.....####ggg#####ggg#####.....g########',
  '#.AAA.:.......ggg....X.gg.....gg########',
  '#.AAA.:.....c.ggg......gg.......########',
  '#.AAA.###########::#######......########',
  '#.....###########::#######g.....########',
  '##::#########______#######..c...########',
  '#.....#.....#______########..###########',
  '#.....:..X..w__X___########gg###########',
  '#.....:..X..#______########.._##########',
  '#..####.....:___X__########.._##########',
  '#..####.....:______########g.###########',
  '#..#####::#######::########..###########',
  '#.._###.......w........####X.:::__######',
  '#..####..c....#..X.....####gg:::__######',
  '#..####.......:...X.X..####..###__######',
  '#....##.......:....Xc..####..###__######',
  '#....####::########:::#####::###__######',
  '###..####..########.XX..h...Xgg#__######',
  '###..####gg########.oooooo7oogg#__######',
  '###..####..########.ohoooo8oog.#__######',
  '###........######__.oXXooPPPo..w__######',
  '###..ggg...######__.oooooPPPoX.#__######',
  '#########..########.ooohoPPPoX.#__######',
  '#########..########.ooooooooh..:__######',
  '#########...gggX..:Xoooooooco..:__######',
  '#########...ggg..X:gggoocooooh.#__######',
  '###################gggooooooo..#__######',
  '###################ggg.........#......##',
  '################################.DDDD.##',
  '################################.DDDD.##',
  '################################......##',
  '########################################',
]);
export default { k: 'overgrowth', n: 'Overgrowth', theme: 'jungle', mech: 'grass', roundT: 90,
  tag: 'A sunken temple swallowed by the rainforest: a long vine hall, broken ruins, and a riverbed ravine.',
  tip: 'Tall grass hides whoever is in it, from you and from bots, but bullets go straight through. Vine Hall and the Riverbed both end in grass: shoot where it moves.',
  src: m.src, roofs: m.roofs, doors: m.doors,
  areas: [
    { k: 'aspawn', n: 'Landing', r: [1, 1, 5, 5], col: '#8a9a5b', lane: 'any' },
    { k: 'trail', n: 'Trailhead', r: [1, 6, 5, 9], col: '#a3b86c', lane: 'any' },
    { k: 'vine', n: 'Vine Hall', r: [6, 1, 25, 3], col: '#7bd88f', lane: 'vine' },
    { k: 'falls', n: 'Falls', r: [26, 1, 31, 6], col: '#4f9fb0', lane: 'vine' },
    { k: 'vsteps', n: 'Vine Steps', r: [27, 7, 28, 17], col: '#5fae6e', lane: 'vine' },
    { k: 'collapse', n: 'Collapse', r: [17, 4, 18, 5], col: '#c9a86b', lane: 'ruins' },
    { k: 'gatehouse', n: 'Gatehouse', r: [6, 7, 12, 12], col: '#d9a441', lane: 'ruins' },
    { k: 'pillars', n: 'Pillar Hall', r: [13, 6, 18, 12], col: '#c9862e', lane: 'ruins' },
    { k: 'broken', n: 'Broken Hall', r: [7, 13, 14, 16], col: '#b07a4f', lane: 'ruins' },
    { k: 'arch', n: 'Arch Court', r: [15, 13, 22, 17], col: '#e0b46b', lane: 'ruins' },
    { k: 'river', n: 'Riverbed', r: [1, 10, 4, 22], col: '#2aa7a0', lane: 'river' },
    { k: 'ravine', n: 'Ravine', r: [5, 21, 10, 24], col: '#3c8f9a', lane: 'river' },
    { k: 'bridge', n: 'Bridge', r: [9, 17, 10, 20], col: '#8d6bb0', lane: 'river' },
    { k: 'mouth', n: 'River Mouth', r: [9, 25, 18, 26], col: '#4fb3c9', lane: 'river' },
    { k: 'sanctum', n: 'Sanctum', r: [31, 13, 33, 27], col: '#6f7fc0', lane: 'any' },
    { k: 'vdrop', n: 'Vine Drop', r: [29, 13, 31, 14], col: '#9bc46b', lane: 'vine' },
    { k: 'site', n: 'Sunken Temple', r: [19, 18, 30, 28], col: '#ff8a3d', lane: 'any' },
    { k: 'altar', n: 'Altar', r: [25, 19, 27, 23], col: '#ffb066', lane: 'any' },
    { k: 'dspawn', n: 'Reliquary', r: [32, 28, 37, 31], col: '#4f7fb0', lane: 'any' },
  ],
  routes: {
    vine: [[7.5, 2.5], [24.5, 3], [28, 7], [28, 16]],
    ruins: [[3, 7.5], [7, 9], [12.5, 11], [17.5, 12.5], [20.5, 16.5]],
    river: [[2, 9], [2, 16], [4, 19.5], [9.5, 22], [10, 25.5], [17.5, 25.5]],
  },
};
