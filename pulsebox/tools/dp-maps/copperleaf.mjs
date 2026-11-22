import { art } from './_art.mjs';
/* COPPERLEAF (autumn, three sites). A cider estate on a hillside in the last warm week of autumn. The attackers come in
   at the Cart Yard in the west, the defenders hold the Manor in the east, and there are three places to plant. A, the
   Press House, is the north-east hall with the press vats in it, roofed over its back half. B, the Orchard, is the open
   walled garden in the middle, the nearest site to the attackers and the easiest to rotate onto. C, the Cooperage, is
   the south-east yard with a raised cart bay in its corner and a roofed barrel store along its west side.
   The attackers' ways in: the Hedgerow (A Long, the rifle lane along the north wall, bent by the hedge at its middle),
   the Granary (a roofed hall off the north of the Mill Square) to the Cider Yard and A's lower door, or from the Cider
   Yard into the top of the Orchard; the Mill Square itself onto B's two west doors; the Kiln (a roofed hall off the south
   of the square, the kiln chimney standing up through its roof) to the Barrel Yard and C's upper door; and the Brook
   Walk (C Long, through the Boathouse) to C's west door. The defenders hold the Terrace between the three sites, a door
   onto each, with the Gallery up to A's back door and the Cellar Stair down to C's. */
const m = art([
  '####################################################',
  '####################################################',
  '###............##############:ooooooooooco##########',
  '###.....c......##.....c......:oooooooooooo#..#######',
  '###............##............#oooooooooooo:..#######',
  '###.......XX.................#ooooXXoooooo:..#######',
  '###.......XX............c....#ooooXXoooooo#..#######',
  '###...########################oooooooooooo#..#######',
  '###...########..........#....#ocoooooooooo#..#######',
  '###...########..c.......:....:oooooooocooo#..#######',
  '###...########..........:....:oooooooooooo#..#######',
  '###...########.......c..#..c.#oooooooooooo#..#######',
  '###...########..........#....#######::#####..#######',
  '###...############::######::#######.......#.......##',
  '#....c.#..c............#qqqqqqqqqq#.......#.......##',
  '#......#...........XX..:qcqqqqqqqq#.c.....#.......##',
  '#......#...............:qqqqqqqcqq#.......:.......##',
  '#.AA...#.....####......#qqqXXqqqqq:.......:.DD....##',
  '#.AA...#.....####......#qqqXXqqqqq:.......#.DD....##',
  '#.AA...:.....####......#qqqqqqqqqq#.......#.DD....##',
  '#.AA...:.....####.c....#qqqqqqqqqq#.....c.#.DD....##',
  '#.AA...#.XX..####......#qqqqqqXqqq:.......#.DD....##',
  '#.AA...#.XX.........c..#qqcqqqXqqq:.......:.DD....##',
  '#......#...............:qqqqqqqqqq#...XX..:.......##',
  '#....c.#...............:qqqqqqqqcq#.......#.......##',
  '#......#...............#qqqqqqqqqq#.......#.......##',
  '###...############::######::#######.......#.......##',
  '###...########..........#....#######::#####..#######',
  '###...########..........#.c..#rrrrrrrrrrrr#..#######',
  '###...########...##.....:....:rrrrrrrrrrcr#..#######',
  '###...########...##.....:....:rrrXXrrrrrrr:..#######',
  '###...########........c.#..c.#rrrXXrrrrrrr:..#######',
  '###...########################rrrrrrrrr77r#..#######',
  '###..........##.........##...:rrrrrrrrr88r#..#######',
  '###..........##.........##...:rcrrrrrrPPPP#..#######',
  '###.....c.............c......#rrrrrrrrPPPP#..#######',
  '###........................c.#rrrrrrrrPPPP#..#######',
  '###..........##..............#rrrrrcrrPPPP##########',
  '####################################################',
  '####################################################',
]);
export default {
  k: 'copperleaf', n: 'Copperleaf', theme: 'autumn', mech: 'three', sites: 3, roundT: 105,
  tag: 'A cider estate on an autumn hillside: a press house, an orchard and a cooperage to plant on.',
  tip: 'Three sites: A the Press House in the north-east, B the walled Orchard in the middle (closest to you on attack), C the Cooperage in the south-east. Defenders hold the Terrace, a door onto every site.',
  src: m.src, doors: m.doors,
  roofs: [
    { r: [14, 8, 23, 12], h: 3.2 },                                                          // the Granary
    { r: [14, 27, 23, 28], h: 3.2 }, { r: [14, 29, 16, 31], h: 3.2 }, { r: [19, 29, 23, 31], h: 3.2 },   // the Kiln, round its chimney
    { r: [17, 33, 23, 37], h: 3.2 },                                                         // the Boathouse over the Brook Walk
    { r: [36, 2, 41, 11], h: 3.6 },                                                          // the back of the Press House
    { r: [30, 33, 37, 37], h: 3.4 },                                                         // the barrel store in the Cooperage
  ],
  areas: [
    { k: 'aspawn', n: 'Cart Yard', r: [1, 14, 6, 25], col: '#8a9a5b', lane: 'any' },
    { k: 'track', n: 'Cart Track', r: [3, 7, 5, 13], col: '#b08a4a', lane: 'along' },
    { k: 'hedge', n: 'Hedgerow', r: [3, 2, 28, 6], col: '#c8772e', lane: 'along' },
    { k: 'granary', n: 'Granary', r: [14, 8, 23, 12], col: '#d9a441', lane: 'ashort' },
    { k: 'cider', n: 'Cider Yard', r: [25, 8, 28, 12], col: '#b5523f', lane: 'ashort' },
    { k: 'mid', n: 'Mill Square', r: [8, 14, 22, 25], col: '#c9a26a', lane: 'bmain' },
    { k: 'kiln', n: 'Kiln', r: [14, 27, 23, 31], col: '#a0603a', lane: 'cshort' },
    { k: 'barrel', n: 'Barrel Yard', r: [25, 27, 28, 31], col: '#8d5a3a', lane: 'cshort' },
    { k: 'brookt', n: 'Brook Track', r: [3, 26, 5, 32], col: '#5f8f7a', lane: 'clong' },
    { k: 'brook', n: 'Brook Walk', r: [3, 33, 28, 37], col: '#4f8f8a', lane: 'clong' },
    { k: 'boat', n: 'Boathouse', r: [17, 33, 24, 37], col: '#6a7f8f', lane: 'clong' },
    { k: 'asite', n: 'A Press House', r: [30, 2, 41, 11], col: '#ff8a3d', lane: 'any' },
    { k: 'bsite', n: 'B Orchard', r: [24, 14, 33, 25], col: '#c46bff', lane: 'any' },
    { k: 'csite', n: 'C Cooperage', r: [30, 28, 41, 37], col: '#ffd23f', lane: 'any' },
    { k: 'cbay', n: 'Cart Bay', r: [38, 32, 41, 37], col: '#e0b020', lane: 'any' },
    { k: 'terrace', n: 'Terrace', r: [35, 13, 41, 26], col: '#7a8f4a', lane: 'any' },
    { k: 'gallery', n: 'Gallery', r: [43, 3, 44, 12], col: '#6f8fc0', lane: 'any' },
    { k: 'cellar', n: 'Cellar Stair', r: [43, 27, 44, 36], col: '#5f7fa8', lane: 'any' },
    { k: 'dspawn', n: 'Manor', r: [43, 13, 49, 26], col: '#4f7fb0', lane: 'any' },
  ],
  routes: {
    along: [[4.5, 12], [4.5, 6], [16, 5.5], [28, 3.5], [29.5, 3]],
    ashort: [[7.5, 19], [18.5, 13.5], [24.5, 10], [29.5, 10]],
    bnorth: [[7.5, 19], [18.5, 13.5], [24.5, 9.5], [26.5, 12], [27, 13.5]],
    bmain: [[7.5, 18.5], [11, 16], [23.5, 16]],
    blow: [[7.5, 19.5], [12, 23], [23.5, 24]],
    cshort: [[7.5, 19.5], [18.5, 26.5], [24.5, 30], [29.5, 30]],
    clong: [[4.5, 27], [4.5, 35.5], [16, 35.5], [28, 34], [29.5, 34]],
  },
  rsite: { along: 0, ashort: 0, bnorth: 1, bmain: 1, blow: 1, cshort: 2, clong: 2 },
};
