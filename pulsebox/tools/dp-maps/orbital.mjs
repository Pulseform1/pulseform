import { art } from './_art.mjs';
/* ORBITAL (space, one site, low gravity). A ring station: a ring corridor runs all the way round the Core, the dome in the
   middle, where the gravity is turned down and the plant diamond sits among stacks you can jump onto.
   Attackers cycle in through the Airlock on the west; defenders start on the Command deck just outside the ring on the east
   and reach the Core through the short East Link. Three ways in:
     North Ring   out of the Airlock's north door, round the roofed NW Bend and along the North Ring (the Observatory bay on
                  the way), then down the North Link into the dome's north door.
     Spoke        out of the south door into the Lock Hall and straight down the roofed Spoke into the dome's west door: the
                  shortest way, and one long sightline.
     South Ring   across the Spoke, down the open west ring and round the SW Bend to the South Ring and the Cargo Bay's
                  containers, then up the South Link into the dome's south door.
   The doors into the dome are offset like a pinwheel, so no corridor looks straight through it, and a stack stands just
   inside each attackers' door: step round it left or right. */
const m = art([
  '########################################',
  '########################################',
  '########################################',
  '########################################',
  '############__c__#######################',
  '############_____#######################',
  '############_____#######################',
  '############________________############',
  '###########__________________###########',
  '##########___########X.####___##########',
  '#########___#########..#####___#########',
  '########___##########.X######___########',
  '#....:.___###########::#######__########',
  '#AAA.:...#######LLLLLLLL######..#....###',
  '#AAA.##..######LLLLLLLLLL#####..:DDD.###',
  '#AAA.##..#####LXXLLooXXLXX####..:DDD.###',
  '#....##..####LLLLLooooooLLL###..#DDD.###',
  '#::####..####LXLLoooocoooLL:....#....###',
  '#...c.#..####LLLooooooooooL:....########',
  '#.....#..####LLLooooXoooooL###..########',
  '#.....____X_:LLXoocoooooooL###..########',
  '#.....______:LLXooooooocooL###..########',
  '#.....#..####LLLLooocooooLX###..########',
  '#######..####LLLLLooooooLLL###..########',
  '#######..#####LLLXXooooLXX####..########',
  '#######..######LLLLLLLLLL#####..########',
  '#######..#######LLLLLLLL######..########',
  '#######...#######:::##########..########',
  '########...######..X#########...########',
  '#########...#####...########...#########',
  '##########...####X..#######...##########',
  '###########..................###########',
  '############..c...........c.############',
  '#############c........XX...#############',
  '#############..XX.....XX...#############',
  '#############..XX........c.#############',
  '#############......c.......#############',
  '########################################',
  '########################################',
  '########################################',
]);
export default { k: 'orbital', n: 'Orbital', theme: 'space', mech: 'lowg', roundT: 90,
  tag: 'A ring station over a blue world: a corridor all the way round, and the Core dome in the middle.',
  tip: 'In the Core dome the gravity is turned down: jump three times as high, onto the stacks round the plant diamond, for angles nobody expects. The ring runs all the way round, so watch both arcs.',
  src: m.src, roofs: m.roofs, doors: m.doors,
  areas: [
    { k: 'warc', n: 'West Ring', r: [7, 12, 8, 27], col: '#5a8fb0', lane: 'any' },
    { k: 'earc', n: 'East Ring', r: [30, 12, 31, 27], col: '#6f7fc0', lane: 'any' },
    { k: 'nw', n: 'NW Bend', r: [7, 7, 12, 12], col: '#38e8ff', lane: 'north' },
    { k: 'ne', n: 'NE Bend', r: [27, 7, 31, 12], col: '#8fb8ff', lane: 'any' },
    { k: 'sw', n: 'SW Bend', r: [7, 27, 12, 32], col: '#c0705a', lane: 'south' },
    { k: 'se', n: 'SE Bend', r: [27, 27, 31, 32], col: '#a77fb0', lane: 'any' },
    { k: 'narc', n: 'North Ring', r: [12, 7, 27, 8], col: '#2fc4d8', lane: 'north' },
    { k: 'obs', n: 'Observatory', r: [12, 4, 16, 6], col: '#c46bff', lane: 'north' },
    { k: 'nlink', n: 'North Link', r: [21, 9, 22, 12], col: '#7fd8e8', lane: 'north' },
    { k: 'sarc', n: 'South Ring', r: [12, 31, 27, 32], col: '#b5523f', lane: 'south' },
    { k: 'bay', n: 'Cargo Bay', r: [13, 33, 26, 36], col: '#8d6bb0', lane: 'south' },
    { k: 'slink', n: 'South Link', r: [17, 27, 19, 30], col: '#d98a6b', lane: 'south' },
    { k: 'lockn', n: 'Lock North', r: [5, 12, 6, 13], col: '#9ab07b', lane: 'north' },
    { k: 'lockh', n: 'Lock Hall', r: [1, 17, 5, 22], col: '#a3b86c', lane: 'spoke' },
    { k: 'spoke', n: 'Spoke', r: [6, 20, 12, 21], col: '#d9a441', lane: 'spoke' },
    { k: 'elink', n: 'East Link', r: [27, 17, 29, 18], col: '#4f9fd0', lane: 'any' },
    { k: 'site', n: 'Core', r: [13, 13, 26, 26], col: '#ff8a3d', lane: 'any' },
    { k: 'aspawn', n: 'Airlock', r: [1, 12, 4, 16], col: '#8a9a5b', lane: 'any' },
    { k: 'dspawn', n: 'Command', r: [32, 13, 36, 17], col: '#4f7fb0', lane: 'any' },
  ],
  routes: {
    north: [[6, 12.5], [8, 11], [11.5, 8], [21.5, 8], [21.5, 11.5]],
    spoke: [[1.5, 18.5], [5, 20.5], [11.5, 20.5]],
    south: [[1.5, 18.5], [6, 20.5], [7.5, 23], [8, 27.5], [11.5, 31], [18, 30], [18, 28]],
  },
};
