  /* ---------- 30 map: the maps (Saltworks and six more), loaded one per match ----------
     A grid of 2 m cells, 32 by 22. x runs east with the columns, z runs south with the rows; the sea is to the north.
       #  wall (6 m)          X  container (3 m, nothing sees over it)     c  crate (1.1 m: crouch behind, jump onto)
       P  loading dock (1.5 m, you stand on it)      7 8  the dock's stairs, rising south      ~  sea wall (a fence)
       o  the site (plant here)      A D  attacker and defender spawns      .  open ground
     The Gate's opening into the Yard is offset from the Yard's doorway, so neither spawn can see the other.
     Three ways from the Gate (west) to the site: Pier along the north, the Yard and its doorway through the middle,
     the roofed Tunnel along the south. Everything else (rays, movement, bot paths, the world mesh) reads these cells. */
  const CS = 2, GW = 32, GH = 22, MW = GW * CS, MH = GH * CS;
  const WALL_H = 6, BOX_H = 3, CRATE_H = 1.1, DOCK_H = 1.5, FENCE_H = 1.1, DOOR_H = 2.7;
  /* Every map is one of these: rows of cells (all 32 by 22), roofs and doorways as rectangles [col0, row0, col1, row1],
     named areas, the attacker's routes and the defender's holds in cell units, and a theme for the look (72-world).
     Saltworks was drawn by hand; the others were laid out by tools/duelpoint-mapgen.mjs and checked for fairness there. */
  const MAPS = [
    { k: 'saltworks', n: 'Saltworks', theme: 'harbor', src: [
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '#.........c....................#',
    '#............XX................#',
    '#............XX.........XX.....#',
    '#.................c.....XX.....#',
    '#..########..#######..######..##',
    '#....#.........#.........#.....#',
    '#....#..XX.....#.......c.#.X...#',
    '#....#.........#..coooo........#',
    '#AA..#.......c.#..ooXoo.....DD.#',
    '#AA..#............ooXoo.7#..DD.#',
    '#AA..#..c.........ooooo.8#..DD.#',
    '#..........XX..#..cooooPP#.c...#',
    '#..............#......cPP#.....#',
    '#....#.........#.......PP#.....#',
    '##..##############..#######..###',
    '#......###########.............#',
    '#.........X....................#',
    '#...c.................X........#',
    '#.............c...........c....#',
    '#......###########.............#',
    '################################',
    ], roofs: [{ r: [7, 17, 17, 19], h: 2.8 }], doors: [[1, 5, 2, 5], [11, 5, 12, 5], [20, 5, 21, 5], [28, 5, 29, 5], [2, 15, 3, 15], [18, 15, 19, 15], [27, 15, 28, 15], [15, 10, 15, 11], [25, 8, 25, 9]],
    areas: [
    { k: 'pier', n: 'Pier', r: [1, 1, 30, 5], col: '#2aa7a0' }, { k: 'gate', n: 'Gate', r: [1, 6, 5, 14], col: '#8a9a5b' },
    { k: 'yard', n: 'Yard', r: [6, 6, 15, 14], col: '#d9a441' }, { k: 'site', n: 'Site', r: [16, 6, 24, 14], col: '#ff8a3d' },
    { k: 'sheds', n: 'Sheds', r: [25, 6, 30, 14], col: '#4f7fb0' }, { k: 'tunnel', n: 'Tunnel', r: [1, 15, 19, 20], col: '#b5523f' },
    { k: 'alley', n: 'Alley', r: [20, 15, 30, 20], col: '#8d6bb0' },
  ],
    routes: {
    pier: [[1.5, 5.5], [8, 2.5], [17, 2.5], [20.5, 5.5]],
    split: [[5.5, 13], [11.5, 5.5], [17, 2.5], [20.5, 5.5]],
    mid: [[5.5, 13], [10, 10.5], [14, 11], [16.5, 11]],
    tunnel: [[2.5, 15.5], [5, 18.5], [13, 18.5], [18.5, 17], [18.5, 14.5]],
  },
    holds: [
    { p: [23, 11.5], look: [15.5, 11.5], lane: 'mid' }, { p: [24, 13.5], look: [16.5, 11], lane: 'mid' },
    { p: [17, 7.5], look: [16, 11], lane: 'mid' }, { p: [27, 2], look: [12, 1.5], lane: 'pier' },
    { p: [22.5, 7.5], look: [20.5, 5.5], lane: 'pier' }, { p: [21, 19.5], look: [17.5, 18.5], lane: 'tunnel' },
    { p: [23.5, 13], look: [18.5, 15], lane: 'tunnel' }, { p: [26.5, 9], look: [19, 10], lane: 'any' },
  ] },
    /*@maps*/
    {k: 'neonrow', n: 'Neon Row', theme: 'neon', src: ['################################', '#..............................#', '#.......................c....c.#', '#...........XXXX.c.....c.......#', '#..............................#', '#..............................#', '#.....####..####..#..######....#', '#...#......c.#...........c..c..#', '#...#......................#...#', '#AA.#......XX.......ooooc..#.DD#', '#AA.#........#......oXooo..#.DD#', '#AA.#.c......#......oXooo..#.DD#', '#AA.#........#......ooooo..#.DD#', '#...#........#......ooooo..#...#', '#...#c....c................#c..#', '#...#..........................#', '#.....##..######..##..#####....#', '#................c........c....#', '#..............XXXX............#', '#......................c.......#', '#........................c.....#', '################################'], roofs: [], doors: [], areas: [{k: 'pier', n: 'Rooftops', r: [1, 1, 30, 6], col: '#2aa7a0'}, {k: 'gate', n: 'Arcade', r: [1, 7, 4, 15], col: '#8a9a5b'}, {k: 'yard', n: 'Market', r: [5, 7, 18, 15], col: '#d9a441'}, {k: 'site', n: 'Vault', r: [19, 7, 26, 15], col: '#ff8a3d'}, {k: 'sheds', n: 'Hotel', r: [27, 7, 30, 15], col: '#4f7fb0'}, {k: 'tunnel', n: 'Subway', r: [1, 16, 30, 20], col: '#b5523f'}], routes: {pier: [[3.5, 4.5], [20, 4.5], [20, 7.5]], split: [[5.5, 11], [11, 7.5], [11, 4.5], [20, 4.5], [20, 7.5]], mid: [[5.5, 11], [13.5, 9]], tunnel: [[3.5, 17.5], [21, 17.5], [21, 14.5]]}, holds: [{p: [19.5, 12.5], look: [20, 6.5], lane: 'pier'}, {p: [25.5, 10.5], look: [20, 6.5], lane: 'pier'}, {p: [26.5, 10.5], look: [21, 16.5], lane: 'tunnel'}, {p: [24.5, 10.5], look: [21, 16.5], lane: 'tunnel'}, {p: [26.5, 14.5], look: [13.5, 9], lane: 'mid'}, {p: [19.5, 11.5], look: [13.5, 9], lane: 'mid'}, {p: [25.5, 11.5], look: [13.5, 11], lane: 'any'}]},
    {k: 'frostline', n: 'Frostline', theme: 'snow', src: ['################################', '#.......c....c..............c..#', '#..............................#', '#......XX......XX..............#', '#..........c..c................#', '#.....##..###..####..######....#', '#...#...................c......#', '#...#......................#...#', '#AA.#..XX....#.......coooo.#.DD#', '#AA.#........#.......oooooc#.DD#', '#AA.#....c...#.......oooXo.#.DD#', '#AA.#........#.......oooXo.#.DD#', '#...#c.......#.......ooooo.#...#', '#...#......................#...#', '#...#..........................#', '#.....####..###..####..####....#', '#...........c.............c.c..#', '#.....................c........#', '#...................XX......c..#', '#.........XX..XX..c............#', '#........c.....................#', '################################'], roofs: [{r: [8, 16, 17, 20], h: 2.8}], doors: [], areas: [{k: 'pier', n: 'Ridge', r: [1, 1, 30, 5], col: '#2aa7a0'}, {k: 'gate', n: 'Camp', r: [1, 6, 4, 14], col: '#8a9a5b'}, {k: 'yard', n: 'Hangar', r: [5, 6, 19, 14], col: '#d9a441'}, {k: 'site', n: 'Reactor', r: [20, 6, 26, 14], col: '#ff8a3d'}, {k: 'sheds', n: 'Lodge', r: [27, 6, 30, 14], col: '#4f7fb0'}, {k: 'tunnel', n: 'Ice Cut', r: [1, 15, 30, 20], col: '#b5523f'}], routes: {pier: [[3.5, 3.5], [20, 3.5], [20, 6.5]], split: [[5.5, 10], [9, 6.5], [9, 3.5], [20, 3.5], [20, 6.5]], mid: [[5.5, 10], [13.5, 7]], tunnel: [[3.5, 16.5], [22, 16.5], [22, 13.5]]}, holds: [{p: [23.5, 7.5], look: [20, 5.5], lane: 'pier'}, {p: [21.5, 9.5], look: [20, 5.5], lane: 'pier'}, {p: [23.5, 8.5], look: [22, 15.5], lane: 'tunnel'}, {p: [21.5, 11.5], look: [22, 15.5], lane: 'tunnel'}, {p: [21.5, 15.5], look: [13.5, 7], lane: 'mid'}, {p: [25.5, 8.5], look: [13.5, 7], lane: 'mid'}, {p: [26.5, 10.5], look: [13.5, 10], lane: 'any'}]},
    {k: 'dunewatch', n: 'Dunewatch', theme: 'desert', src: ['################################', '#..............................#', '#...............c.XX..XX.......#', '#.......................XXc..c.#', '#..........c..............c....#', '#....................c.........#', '#.....###..####..###..#####....#', '#...#..c.................c.....#', '#...#......................#c..#', '#AA.#..c...#....c..ooooo...#.DD#', '#AA.#......#.......ooooo...#.DD#', '#AA.#..XX..#.......oooXo...#.DD#', '#AA.#......#.......oooXo...#.DD#', '#...#..c...........coooo...#...#', '#...#..........................#', '#.....##..####..###..######....#', '#...........c.........c........#', '#.................XXc..........#', '#..............................#', '#..........XX...c..............#', '#.........c....................#', '################################'], roofs: [], doors: [], areas: [{k: 'pier', n: 'Dunes', r: [1, 1, 30, 6], col: '#2aa7a0'}, {k: 'gate', n: 'Gatehouse', r: [1, 7, 4, 14], col: '#8a9a5b'}, {k: 'yard', n: 'Bazaar', r: [5, 7, 17, 14], col: '#d9a441'}, {k: 'site', n: 'Tomb', r: [18, 7, 26, 14], col: '#ff8a3d'}, {k: 'sheds', n: 'Fort', r: [27, 7, 30, 14], col: '#4f7fb0'}, {k: 'tunnel', n: 'Canal', r: [1, 15, 30, 20], col: '#b5523f'}], routes: {pier: [[3.5, 4.5], [21, 4.5], [21, 7.5]], split: [[5.5, 11], [10, 7.5], [10, 4.5], [21, 4.5], [21, 7.5]], mid: [[5.5, 11], [11.5, 8]], tunnel: [[3.5, 16.5], [20, 16.5], [20, 13.5]]}, holds: [{p: [22.5, 10.5], look: [21, 6.5], lane: 'pier'}, {p: [26.5, 11.5], look: [21, 6.5], lane: 'pier'}, {p: [20.5, 5.5], look: [20, 15.5], lane: 'tunnel'}, {p: [19.5, 8.5], look: [20, 15.5], lane: 'tunnel'}, {p: [19.5, 12.5], look: [11.5, 8], lane: 'mid'}, {p: [21.5, 8.5], look: [11.5, 8], lane: 'mid'}, {p: [24.5, 11.5], look: [11.5, 11], lane: 'any'}]},
    {k: 'overgrowth', n: 'Overgrowth', theme: 'jungle', src: ['################################', '#..............................#', '#...............c..............#', '#.............c.XXX............#', '#..........c...................#', '#.....###..#####..##..#####....#', '#...#..........................#', '#...#......................#...#', '#AA.#..........#....oooooc.#.DD#', '#AA.#...c.....c#....oooXo..#.DD#', '#AA.#.......XX.#....oooXo..#.DD#', '#AA.#...............ooooo..#.DD#', '#...#...............coooo.c#...#', '#...#..c.......#...........#...#', '#...#..........#...............#', '#.....#..####..#######..###.c.c#', '#.....................c........#', '#.....c.............XX.........#', '#......c..............c........#', '#........c.........XX..........#', '#..............................#', '################################'], roofs: [], doors: [], areas: [{k: 'pier', n: 'Canopy', r: [1, 1, 30, 5], col: '#2aa7a0'}, {k: 'gate', n: 'Outpost', r: [1, 6, 4, 14], col: '#8a9a5b'}, {k: 'yard', n: 'Temple Steps', r: [5, 6, 18, 14], col: '#d9a441'}, {k: 'site', n: 'Shrine', r: [19, 6, 26, 14], col: '#ff8a3d'}, {k: 'sheds', n: 'Camp', r: [27, 6, 30, 14], col: '#4f7fb0'}, {k: 'tunnel', n: 'Riverbed', r: [1, 15, 30, 20], col: '#b5523f'}], routes: {pier: [[3.5, 3.5], [21, 3.5], [21, 6.5]], split: [[5.5, 10], [10, 6.5], [10, 3.5], [21, 3.5], [21, 6.5]], mid: [[5.5, 10], [15.5, 12]], tunnel: [[3.5, 16.5], [23, 16.5], [23, 13.5]]}, holds: [{p: [20.5, 10.5], look: [21, 5.5], lane: 'pier'}, {p: [25.5, 10.5], look: [21, 5.5], lane: 'pier'}, {p: [22.5, 7.5], look: [23, 15.5], lane: 'tunnel'}, {p: [25.5, 10.5], look: [23, 15.5], lane: 'tunnel'}, {p: [20.5, 10.5], look: [15.5, 7], lane: 'mid'}, {p: [23.5, 8.5], look: [15.5, 7], lane: 'mid'}, {p: [25.5, 10.5], look: [15.5, 10], lane: 'any'}]},
    {k: 'foundry', n: 'Foundry', theme: 'lava', src: ['################################', '#.........c...............c...c#', '#.............cXX..XX..XX......#', '#................c............c#', '#..............................#', '#.....###..####..####..####....#', '#...#.........#................#', '#...#...................c..#..c#', '#AA.#..XX...........ooooo..#.DD#', '#AA.#..XX.....#.....ooooo..#.DD#', '#AA.#.........#..c..oXooo..#.DD#', '#AA.#......c........ooooo..#.DD#', '#...#...............ooooo..#...#', '#...#.........#............#...#', '#...#.........#................#', '#.....###..##..#####..#####....#', '#..............................#', '#..............................#', '#......c....XX.XX..c...........#', '#.................c.........c..#', '#.......c......................#', '################################'], roofs: [{r: [8, 16, 17, 20], h: 2.8}], doors: [], areas: [{k: 'pier', n: 'Catwalk', r: [1, 1, 30, 5], col: '#2aa7a0'}, {k: 'gate', n: 'Intake', r: [1, 6, 4, 14], col: '#8a9a5b'}, {k: 'yard', n: 'Smelter', r: [5, 6, 18, 14], col: '#d9a441'}, {k: 'site', n: 'Crucible', r: [19, 6, 26, 14], col: '#ff8a3d'}, {k: 'sheds', n: 'Control', r: [27, 6, 30, 14], col: '#4f7fb0'}, {k: 'tunnel', n: 'Slag Tunnel', r: [1, 15, 30, 20], col: '#b5523f'}], routes: {pier: [[3.5, 3.5], [22, 3.5], [22, 6.5]], split: [[5.5, 10], [10, 6.5], [10, 3.5], [22, 3.5], [22, 6.5]], mid: [[5.5, 10], [14.5, 12]], tunnel: [[3.5, 16.5], [21, 16.5], [21, 13.5]]}, holds: [{p: [22.5, 10.5], look: [22, 5.5], lane: 'pier'}, {p: [24.5, 10.5], look: [22, 5.5], lane: 'pier'}, {p: [19.5, 8.5], look: [21, 15.5], lane: 'tunnel'}, {p: [19.5, 11.5], look: [21, 15.5], lane: 'tunnel'}, {p: [25.5, 9.5], look: [14.5, 8], lane: 'mid'}, {p: [24.5, 8.5], look: [14.5, 8], lane: 'mid'}, {p: [25.5, 10.5], look: [14.5, 10], lane: 'any'}]},
    {k: 'orbital', n: 'Orbital', theme: 'space', src: ['################################', '#.............c....c...........#', '#........XX....................#', '#...................c..XX......#', '#............c.................#', '#.........................c....#', '#.....##..####..####..#####....#', '#...#.........................c#', '#...#...........c.........c#...#', '#AA.#.......#........coooo.#.DD#', '#AA.#...XX..#........oXooo.#.DD#', '#AA.#.......#........ooooo.#.DD#', '#AA.#......c.........ooooo.#.DD#', '#...#................ooooo.#...#', '#...#..c..c.#.............c....#', '#.....#..####..########..##....#', '#..............................#', '#.......c....c.................#', '#.......c.....XX....XX....c..c.#', '#....................c........c#', '#..............................#', '################################'], roofs: [{r: [8, 16, 17, 20], h: 2.8}], doors: [], areas: [{k: 'pier', n: 'Observatory', r: [1, 1, 30, 6], col: '#2aa7a0'}, {k: 'gate', n: 'Airlock', r: [1, 7, 4, 14], col: '#8a9a5b'}, {k: 'yard', n: 'Hydroponics', r: [5, 7, 19, 14], col: '#d9a441'}, {k: 'site', n: 'Core', r: [20, 7, 26, 14], col: '#ff8a3d'}, {k: 'sheds', n: 'Command', r: [27, 7, 30, 14], col: '#4f7fb0'}, {k: 'tunnel', n: 'Service Duct', r: [1, 15, 30, 20], col: '#b5523f'}], routes: {pier: [[3.5, 4.5], [21, 4.5], [21, 7.5]], split: [[5.5, 11], [9, 7.5], [9, 4.5], [21, 4.5], [21, 7.5]], mid: [[5.5, 11], [12.5, 13]], tunnel: [[3.5, 16.5], [24, 16.5], [24, 13.5]]}, holds: [{p: [24.5, 9.5], look: [21, 6.5], lane: 'pier'}, {p: [25.5, 12.5], look: [21, 6.5], lane: 'pier'}, {p: [26.5, 12.5], look: [24, 15.5], lane: 'tunnel'}, {p: [25.5, 8.5], look: [24, 15.5], lane: 'tunnel'}, {p: [25.5, 13.5], look: [12.5, 8], lane: 'mid'}, {p: [21.5, 13.5], look: [12.5, 8], lane: 'mid'}, {p: [26.5, 11.5], look: [12.5, 11], lane: 'any'}]},
  ];
  // the map being played: these keep their identity and are refilled in place by loadMap, so everything that reads them stays wired up
  const SRC = [], ROOFS = [], DOORS = [], AREAS = [], ROUTES = {}, HOLDS = [], SPAWN = { att: [], def: [] }, SITE = [], siteC = [0, 0], navCells = [];
  let MAP = MAPS[0];
  // per cell: height at the low and high end (they differ only on stairs), which way stairs run (0 none, 2 along z),
  // the ceiling above it (0 = open sky), whether it is a fence, whether a fighter can stand there, its area
  const NC = GW * GH, CH = new Float32Array(NC), CB = new Float32Array(NC), CAX = new Uint8Array(NC), CEIL = new Float32Array(NC), FENCE = new Uint8Array(NC), NAV = new Uint8Array(NC), AREA = new Int8Array(NC).fill(-1);
  const idx = (i, j) => i < 0 || j < 0 || i >= GW || j >= GH ? -1 : j * GW + i;
  const chAt = (i, j) => { const k = idx(i, j); return k < 0 ? ' ' : SRC[j][i]; };
  const C = (c, r) => [c * CS, r * CS];
  function loadMap(n) {
    MAP = MAPS[((n | 0) % MAPS.length + MAPS.length) % MAPS.length];
    const fill = (a, b) => { a.length = 0; a.push(...b); };
    fill(SRC, MAP.src); fill(ROOFS, MAP.roofs || []); fill(DOORS, MAP.doors || []); fill(AREAS, MAP.areas);
    for (const k in ROUTES) delete ROUTES[k]; for (const k in MAP.routes) ROUTES[k] = MAP.routes[k].map(p => C(p[0], p[1]));
    fill(HOLDS, MAP.holds.map(h => ({ p: C(h.p[0], h.p[1]), look: C(h.look[0], h.look[1]), lane: h.lane })));
    SPAWN.att.length = SPAWN.def.length = SITE.length = 0; CEIL.fill(0); FENCE.fill(0); NAV.fill(0); CAX.fill(0); AREA.fill(-1);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const c = SRC[j][i], k = j * GW + i, mid = [i * CS + 1, j * CS + 1];
      let a = 0, b = 0;
      if (c === '#') a = b = WALL_H; else if (c === 'X') a = b = BOX_H; else if (c === 'c') a = b = CRATE_H; else if (c === 'P') a = b = DOCK_H;
      else if (c === '~') { a = b = FENCE_H; FENCE[k] = 1; } else if (c === '7') { b = DOCK_H / 2; CAX[k] = 2; } else if (c === '8') { a = DOCK_H / 2; b = DOCK_H; CAX[k] = 2; }
      CH[k] = a; CB[k] = b; NAV[k] = '.oADP78'.includes(c) ? 1 : 0;
      if (c === 'A') SPAWN.att.push(mid); if (c === 'D') SPAWN.def.push(mid); if (c === 'o') SITE.push(mid);
      AREAS.forEach((A, q) => { if (i >= A.r[0] && i <= A.r[2] && j >= A.r[1] && j <= A.r[3]) AREA[k] = q; });
    }
    for (const rf of ROOFS) for (let j = rf.r[1]; j <= rf.r[3]; j++) for (let i = rf.r[0]; i <= rf.r[2]; i++) CEIL[idx(i, j)] = rf.h;
    for (const d of DOORS) for (let j = d[1]; j <= d[3]; j++) for (let i = d[0]; i <= d[2]; i++) CEIL[idx(i, j)] = DOOR_H;
    siteC[0] = siteC[1] = 0; for (const p of SITE) { siteC[0] += p[0] / SITE.length; siteC[1] += p[1] / SITE.length; }
    navCells.length = 0; for (let k = 0; k < NC; k++) if (NAV[k]) navCells.push([(k % GW) * CS + 1, Math.floor(k / GW) * CS + 1]);
    return MAP;
  }

  // the ground under a point; hMove is the same for movement, where fences and the edge of the map are walls
  function hAt(x, z) {
    const i = Math.floor(x / CS), j = Math.floor(z / CS), k = idx(i, j); if (k < 0) return 0;
    return CAX[k] ? lp(CH[k], CB[k], z / CS - j) : CH[k];
  }
  const hMove = (x, z) => { const k = idx(Math.floor(x / CS), Math.floor(z / CS)); return k < 0 || FENCE[k] ? 99 : hAt(x, z); };
  const onSite = (x, z) => chAt(Math.floor(x / CS), Math.floor(z / CS)) === 'o';
  const areaAt = (x, z) => { const k = idx(Math.floor(x / CS), Math.floor(z / CS)); return k < 0 || AREA[k] < 0 ? null : AREAS[AREA[k]]; };

  // A ray through the cells: the distance to the first thing it meets (ground, a wall, a crate, stairs, a roof), or max.
  // rayN holds the surface normal at that hit, for bullet marks.
  const rayN = [0, 1, 0];
  function rayGrid(ox, oy, oz, dx, dy, dz, max) {
    let i = Math.floor(ox / CS), j = Math.floor(oz / CS), t = 0, ax = 0;
    const si = dx > 0 ? 1 : -1, sj = dz > 0 ? 1 : -1, adx = Math.abs(dx) || 1e-9, adz = Math.abs(dz) || 1e-9, tdx = CS / adx, tdz = CS / adz;
    let tx = (dx > 0 ? (i + 1) * CS - ox : ox - i * CS) / adx, tz = (dz > 0 ? (j + 1) * CS - oz : oz - j * CS) / adz;
    const side = () => { rayN[0] = ax === 1 ? -si : 0; rayN[1] = ax ? 0 : 1; rayN[2] = ax === 2 ? -sj : 0; };
    for (let n = 0; n < 160; n++) {
      const tn = Math.min(tx, tz, max), k = idx(i, j), y0 = oy + dy * t, y1 = oy + dy * tn;
      let s0 = 0, s1 = 0, ceil = 0;
      if (k >= 0) {
        ceil = CEIL[k];
        if (CAX[k]) { s0 = lp(CH[k], CB[k], cl((oz + dz * t) / CS - j, 0, 1)); s1 = lp(CH[k], CB[k], cl((oz + dz * tn) / CS - j, 0, 1)); } else s0 = s1 = CH[k];
      }
      if (y0 < s0 || (ceil && y0 > ceil && y0 < WALL_H)) { side(); return t; }
      if (y1 < s1) { rayN[0] = 0; rayN[1] = 1; rayN[2] = 0; return t + (y0 - s0) / ((y0 - s0) - (y1 - s1)) * (tn - t); }
      if (ceil && y1 > ceil) { rayN[0] = 0; rayN[1] = -1; rayN[2] = 0; return t + (ceil - y0) / (y1 - y0) * (tn - t); }
      if (tn >= max || i < -3 || j < -3 || i > GW + 2 || j > GH + 2) return max;
      if (tx < tz) { t = tx; tx += tdx; i += si; ax = 1; } else { t = tz; tz += tdz; j += sj; ax = 2; }
    }
    return max;
  }

  /* ---------- navigation for bots: which cells join, shortest paths, straightened ---------- */
  // the height of a cell's surface at the middle of one edge (0 east, 1 west, 2 south, 3 north)
  const edgeH = (k, e) => !CAX[k] ? CH[k] : e === 2 ? CB[k] : e === 3 ? CH[k] : (CH[k] + CB[k]) / 2;
  const joined = (i, j, di, dj) => {
    const a = idx(i, j), b = idx(i + di, j + dj); if (a < 0 || b < 0 || !NAV[a] || !NAV[b]) return false;
    const e = di > 0 ? 0 : di < 0 ? 1 : dj > 0 ? 2 : 3; return Math.abs(edgeH(a, e) - edgeH(b, e ^ 1)) <= STEP;
  };
  const cellOf = (x, z) => [cl(Math.floor(x / CS), 0, GW - 1), cl(Math.floor(z / CS), 0, GH - 1)];
  function nearestNav(x, z) {
    const [i, j] = cellOf(x, z); if (NAV[idx(i, j)]) return [i, j];
    let best = null, bd = 1e9; for (const p of navCells) { const d = Math.hypot(p[0] - x, p[1] - z); if (d < bd) { bd = d; best = p; } }
    return cellOf(best[0], best[1]);
  }
  // can a fighter walk the straight line between two points? (used to straighten paths and by bots that strafe)
  function walkLine(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az); if (d < .01) return true;
    const n = Math.ceil(d / .35), px = -(bz - az) / d * (RAD + .1), pz = (bx - ax) / d * (RAD + .1); let prev = hAt(ax, az);
    for (let s = 1; s <= n; s++) {
      const x = lp(ax, bx, s / n), z = lp(az, bz, s / n), h = hAt(x, z);
      if (!NAV[idx(Math.floor(x / CS), Math.floor(z / CS))] || Math.abs(h - prev) > STEP) return false;
      if (hMove(x + px, z + pz) > h + STEP || hMove(x - px, z - pz) > h + STEP) return false;
      prev = h;
    }
    return true;
  }
  const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  const gCost = new Float32Array(NC), cameFrom = new Int32Array(NC), closed = new Uint8Array(NC);
  // A* over the cells, then pulled straight wherever a fighter could walk it directly. Returns points in metres.
  function findPath(x0, z0, x1, z1) {
    const [si, sj] = nearestNav(x0, z0), [ti, tj] = nearestNav(x1, z1), sk = idx(si, sj), tk = idx(ti, tj);
    gCost.fill(1e9); closed.fill(0); cameFrom.fill(-1); gCost[sk] = 0; const open = [sk];
    while (open.length) {
      let bi = 0, bf = 1e9; for (let n = 0; n < open.length; n++) { const k = open[n], f = gCost[k] + Math.hypot(k % GW - ti, Math.floor(k / GW) - tj); if (f < bf) { bf = f; bi = n; } }
      const k = open[bi]; open[bi] = open[open.length - 1]; open.pop(); if (k === tk) break; if (closed[k]) continue; closed[k] = 1;
      const i = k % GW, j = Math.floor(k / GW);
      for (const [di, dj, w] of NB) {
        if (di && dj) { if (!joined(i, j, di, 0) || !joined(i, j, 0, dj) || !joined(i + di, j, 0, dj) || !joined(i, j + dj, di, 0)) continue; } else if (!joined(i, j, di, dj)) continue;
        const nk = idx(i + di, j + dj), g = gCost[k] + w; if (g < gCost[nk]) { gCost[nk] = g; cameFrom[nk] = k; open.push(nk); }
      }
    }
    if (tk !== sk && cameFrom[tk] < 0) return [];
    const cells = []; for (let k = tk; k >= 0; k = cameFrom[k]) cells.unshift([(k % GW) * CS + 1, Math.floor(k / GW) * CS + 1]);
    if (NAV[idx(...cellOf(x1, z1))]) cells.push([x1, z1]);
    const out = []; let a = [x0, z0], n = 0;
    while (n < cells.length) { let m = Math.min(cells.length - 1, n + 14); while (m > n && !walkLine(a[0], a[1], cells[m][0], cells[m][1])) m--; out.push(cells[m]); a = cells[m]; n = m + 1; }
    return out;
  }
  const pathLen = (p, x, z) => { let d = 0; for (const q of p) { d += Math.hypot(q[0] - x, q[1] - z); x = q[0]; z = q[1]; } return d; };

  loadMap(0);
