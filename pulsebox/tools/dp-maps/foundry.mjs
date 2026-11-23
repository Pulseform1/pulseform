import { art } from './_art.mjs';
/* FOUNDRY (lava, one site, steam vents). Attackers come up from the Loading Bay in the south, defenders hold Control in the
   north, and the site is the Smelter in the centre-north: a casting floor with the crucible, reached from three sides.
     Catwalk       west: up the Pipe Run, a switchback stair onto a raised walkway (1.5 m: you see over the containers), north
                   along the Pit and out onto the Ledge over the Smelter's west side. Drop in, or take the stairs down.
     Furnace Hall  centre: a roofed hall straight up the middle, furnaces for cover, into the Smelter's south mouth (3 wide).
     Slag Yard     east: an open yard of containers that bends north and round through the Slag Bend to the east door (2 wide).
   The Pit links the Scrapyard to the Furnace Hall's west door under the Catwalk; the Boiler links the hall to the yard.
   Steam vents sit at the three chokes into the Smelter: the Ledge drop, the Hall mouth and the east door. */
const m = art([
  '############################################',
  '##################..DDDD..##################',
  '###############..:..DDDD..:..###############',
  '###############..:........:..###############',
  '###############::##########::###############',
  '############........hh...X.....#############',
  '############....oooooooooooX...#.........###',
  '############7...oooooooocoo.X..#..XX.....###',
  '############8...ooXXooooooo..X.:.........###',
  '#########PPPPPV.ooXXooooooo...X:V........###',
  '#########PPPPP..oooooooXXoo....#.....XX..###',
  '#########PP#....ocoooooooco.h..#.........###',
  '#########PP#....ooooooooooo...Xw.XX......###',
  '#########PP#__...h....XXX......#..hh.....###',
  '#########PP#__hc....XX.....c...#......XX.###',
  '#########PP#####__##:::###__####.........###',
  '#########PP########_XV__########...c.....###',
  '######...PP.......#_____###..............###',
  '######...PP.......#_X___###..............###',
  '######..7PP...c...:_XX__###..XX..........###',
  '######..8PP.......:_____###..XX.....c....###',
  '######..PPP.......w___X_###........XX....###',
  '######..####......#_____###..............###',
  '######..###.......:c____:...c............###',
  '######..###.......:_____:......X.........###',
  '######..###......##########....X....XX...###',
  '######...........##########.........XX...###',
  '######...........#........#..............###',
  '###########......:..AAAA..:......c.......###',
  '###########......:..AAAA..:..............###',
  '###########......#........#...........XX.###',
  '############################################',
]);
export default { k: 'foundry', n: 'Foundry', theme: 'lava', mech: 'vent', roundT: 90,
  tag: 'A smelter on the rim of a live caldera: a high catwalk, a furnace hall up the middle, and a yard of slag containers.',
  tip: 'Steam vents at the three chokes into the Smelter puff in turn, a cloud that blocks sight for five seconds. Listen for the hiss and move under it. The Catwalk is high enough to see over the containers.',
  src: m.src, roofs: m.roofs, doors: m.doors,
  areas: [
    { k: 'aspawn', n: 'Loading Bay', r: [18, 27, 25, 30], col: '#8a9a5b', lane: 'any' },
    { k: 'scrap', n: 'Scrapyard', r: [6, 23, 17, 30], col: '#b08a5b', lane: 'any' },
    { k: 'pipe', n: 'Pipe Run', r: [6, 17, 8, 27], col: '#c96f3d', lane: 'cat' },
    { k: 'cat', n: 'Catwalk', r: [8, 9, 10, 21], col: '#ffb347', lane: 'cat' },
    { k: 'pit', n: 'Pit', r: [11, 17, 17, 22], col: '#8d6bb0', lane: 'hall' },
    { k: 'hall', n: 'Furnace Hall', r: [18, 16, 24, 24], col: '#d9a441', lane: 'hall' },
    { k: 'boiler', n: 'Boiler', r: [25, 23, 26, 24], col: '#a0603a', lane: 'slag' },
    { k: 'yard', n: 'Slag Yard', r: [26, 17, 40, 30], col: '#b5523f', lane: 'slag' },
    { k: 'bend', n: 'Slag Bend', r: [31, 6, 40, 16], col: '#c46b4a', lane: 'slag' },
    { k: 'site', n: 'Smelter', r: [12, 5, 30, 15], col: '#ff8a3d', lane: 'any' },
    { k: 'ledge', n: 'Ledge', r: [11, 6, 13, 10], col: '#ffd23f', lane: 'cat' },
    { k: 'pourw', n: 'West Pour', r: [15, 2, 17, 4], col: '#7f6fc0', lane: 'any' },
    { k: 'poure', n: 'East Pour', r: [26, 2, 28, 4], col: '#6f8fc0', lane: 'any' },
    { k: 'dspawn', n: 'Control', r: [18, 1, 25, 3], col: '#4f7fb0', lane: 'any' },
  ],
  routes: {
    cat: [[16.5, 28.5], [10, 26.5], [6.5, 22], [7.5, 18.5], [8.5, 20.5], [9.5, 19], [9.5, 11], [13, 9.5]],
    hall: [[16.5, 28.5], [15, 24.5], [18.5, 24], [21.5, 17]],
    slag: [[27, 28.5], [33, 23], [35, 15], [34, 10], [32.5, 9]],
  },
};
