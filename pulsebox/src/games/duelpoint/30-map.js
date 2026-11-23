  /* ---------- 30 map: the maps (Saltworks and six more), loaded one per match ----------
     A grid of 2 m cells, 32 by 22. x runs east with the columns, z runs south with the rows; the sea is to the north.
       #  wall (6 m)          X  container (3 m, nothing sees over it)     c  crate (1.1 m: crouch behind, jump onto)
       P  loading dock (1.5 m, you stand on it)      7 8  the dock's stairs, rising south      ~  sea wall (a fence)
       o  the site (plant here; site A on a two-site map)      q  site B      r  site C      A D  attacker and defender spawns      .  open ground
     Each map but Saltworks has a mechanic of its own, and these cells for it:
       T  a teleporter pad (one way: MAP.tps sends it to its exit)      J  a jump pad (MAP.pads: where it throws you)
       H  a high ledge (3.2 m: reached by a jump pad, dropped off)       i  ice (no grip: you slide, and stop late)
       g  tall grass (hides you; bullets go straight through)            L  low gravity (jump onto the containers)
       V  a steam vent (puffs a cloud that blocks sight, on a clock)      < > ^ v  a conveyor belt running that way
       G  a gate (open; a switch at MAP.sw closes it into a wall)         W  a breakable wall (enough fire knocks it down)
     And two pieces for places to hide and to be watched from, on any map:
       h  a half wall (1.2 m: crouch behind it unseen, stand and shoot over it; nobody climbs it)
       w  a window (a sill, an opening from 1.05 to 2.25 m, wall above: you see and shoot through it, nobody walks through)
     The Gate's opening into the Yard is offset from the Yard's doorway, so neither spawn can see the other.
     Three ways from the Gate (west) to the site: Pier along the north, the Yard and its doorway through the middle,
     the roofed Tunnel along the south. Everything else (rays, movement, bot paths, the world mesh) reads these cells. */
  // the grid's size is the map's own: the one-site maps are 32 by 22, the two-site maps bigger (loadMap sets these)
  const CS = 2, MAXNC = 72 * 52; let GW = 32, GH = 22, MW = GW * CS, MH = GH * CS, NC = GW * GH;
  const WALL_H = 6, BOX_H = 3, CRATE_H = 1.45, DOCK_H = 1.5, FENCE_H = 1.1, DOOR_H = 2.7, HALF_H = 1.2, SILL_H = 1.05, WIN_H = 2.25, HIGH_H = 3.2, GRASS_H = 1.75, GATE_H = 3.6, BRK_HP = 320;
  const WALKABLE = '.oqrADP78HJTigLVG<>^v', BELTS = '>v<^';   // belt directions: east, south, west, north
  /* Every map is one of these: rows of cells (all 32 by 22), roofs and doorways as rectangles [col0, row0, col1, row1],
     named areas, the attacker's routes and the defender's holds in cell units, and a theme for the look (72-world).
     Saltworks was drawn by hand; the others were laid out by tools/duelpoint-mapgen.mjs and checked for fairness there. */
  const MAPS = [
    { k: 'saltworks', n: 'Saltworks', theme: 'harbor', rw: ['pier', 'split', 'mid', 'mid', 'tunnel', 'tunnel'], src: [
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
    ...MAP_DEFS,   // the rest are drawn in tools/duelpoint-maps.mjs, which writes 29-maps.js
  ];
  // the map being played: these keep their identity and are refilled in place by loadMap, so everything that reads them stays wired up
  // SITE holds every plantable cell; SITES each site on its own ({ k: 'A', cells, c: centre }); siteC is site A's centre.
  // RSITE says which site each attacker route ends at.
  const SRC = [], ROOFS = [], DOORS = [], AREAS = [], ROUTES = {}, RSITE = {}, HOLDS = [], SPAWN = { att: [], def: [] }, SITE = [], SITES = [], siteC = [0, 0], navCells = [];
  // the map's mechanic: teleporters, jump pads, gates and their switches, breakable walls, vents (and per cell: ice,
  // grass, low gravity, belts, which teleporter or pad a cell is)
  const TPS = [], PADS = [], GATES = [], BRKS = [], VENTS = [];
  // the ultimate orbs' spots: halfway along two of the attackers' ways in (or where the map says)
  const ORBS = [];
  // each side's spawn room for the buy phase: the cells within a few steps of its spawn (you move freely inside, a barrier
  // holds you there until the round goes live)
  const ZONE = { att: new Uint8Array(MAXNC), def: new Uint8Array(MAXNC) };
  let MAP = MAPS[0];
  // per cell: height at the low and high end (they differ only on stairs), which way stairs run (0 none, 2 along z),
  // the ceiling above it (0 = open sky), whether it is a fence, whether a fighter can stand there, its area
  const ICE = new Uint8Array(MAXNC), GRASS = new Uint8Array(MAXNC), LOWG = new Uint8Array(MAXNC), BELT = new Uint8Array(MAXNC), TPX = new Int8Array(MAXNC), PADX = new Int8Array(MAXNC), GATEX = new Int8Array(MAXNC), BRKX = new Int8Array(MAXNC);
  const CH = new Float32Array(MAXNC), CB = new Float32Array(MAXNC), CAX = new Uint8Array(MAXNC), CEIL = new Float32Array(MAXNC), FENCE = new Uint8Array(MAXNC), NAV = new Uint8Array(MAXNC), AREA = new Int8Array(MAXNC).fill(-1);
  const idx = (i, j) => i < 0 || j < 0 || i >= GW || j >= GH ? -1 : j * GW + i;
  const chAt = (i, j) => { const k = idx(i, j); return k < 0 ? ' ' : SRC[j][i]; };
  const C = (c, r) => [c * CS, r * CS];
  function loadMap(n) {
    MAP = MAPS[((n | 0) % MAPS.length + MAPS.length) % MAPS.length];
    GW = MAP.src[0].length; GH = MAP.src.length; MW = GW * CS; MH = GH * CS; NC = GW * GH;
    const fill = (a, b) => { a.length = 0; a.push(...b); };
    fill(SRC, MAP.src); fill(ROOFS, MAP.roofs || []); fill(DOORS, MAP.doors || []); fill(AREAS, MAP.areas);
    for (const k in ROUTES) delete ROUTES[k]; for (const k in MAP.routes) ROUTES[k] = MAP.routes[k].map(p => C(p[0], p[1]));
    for (const k in RSITE) delete RSITE[k]; for (const k in ROUTES) RSITE[k] = (MAP.rsite && MAP.rsite[k]) || 0;
    fill(HOLDS, (MAP.holds || []).map(h => ({ p: C(h.p[0], h.p[1]), look: C(h.look[0], h.look[1]), lane: h.lane, s: h.s || 0 })));
    SPAWN.att.length = SPAWN.def.length = SITE.length = 0; SITES.length = 0; CH.fill(0); CB.fill(0); CEIL.fill(0); FENCE.fill(0); NAV.fill(0); CAX.fill(0); AREA.fill(-1);
    for (const a of [ICE, GRASS, LOWG, BELT]) a.fill(0); for (const a of [TPX, PADX, GATEX, BRKX]) a.fill(-1); for (const a of [TPS, PADS, GATES, BRKS, VENTS]) a.length = 0;
    const siteCells = [[], [], []];
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const c = SRC[j][i], k = j * GW + i, mid = [i * CS + 1, j * CS + 1];
      let a = 0, b = 0;
      if (c === '#') a = b = WALL_H; else if (c === 'X') a = b = BOX_H; else if (c === 'c') a = b = CRATE_H; else if (c === 'P') a = b = DOCK_H;
      else if (c === '~') { a = b = FENCE_H; FENCE[k] = 1; } else if (c === '7') { b = DOCK_H / 2; CAX[k] = 2; } else if (c === '8') { a = DOCK_H / 2; b = DOCK_H; CAX[k] = 2; }
      else if (c === 'H') a = b = HIGH_H; else if (c === 'W') a = b = WALL_H;
      else if (c === 'h') { a = b = HALF_H; FENCE[k] = 1; } else if (c === 'w') { a = b = SILL_H; FENCE[k] = 1; }   // (FENCE: nobody steps up onto it)
      CH[k] = a; CB[k] = b; NAV[k] = WALKABLE.includes(c) ? 1 : 0;
      if (c === 'i') ICE[k] = 1; else if (c === 'g') GRASS[k] = 1; else if (c === 'L') LOWG[k] = 1; else if (BELTS.includes(c)) BELT[k] = BELTS.indexOf(c) + 1; else if (c === 'V') VENTS.push(mid);
      if (c === 'A') SPAWN.att.push(mid); if (c === 'D') SPAWN.def.push(mid); if (c === 'o' || c === 'q' || c === 'r') { SITE.push(mid); siteCells['oqr'.indexOf(c)].push(mid); }
      AREAS.forEach((A, q) => { if (i >= A.r[0] && i <= A.r[2] && j >= A.r[1] && j <= A.r[3]) AREA[k] = q; });
    }
    for (const rf of ROOFS) for (let j = rf.r[1]; j <= rf.r[3]; j++) for (let i = rf.r[0]; i <= rf.r[2]; i++) CEIL[idx(i, j)] = rf.h;
    // a doorway is only a doorway with a wall on both sides of it to hold up the wall over it: an opening at a wall's end, or
    // between two walls that stop short, keeps no wall over it (it hung in the air) and no ceiling
    { const solid = (i, j) => { const k = idx(i, j); return k < 0 || CH[k] >= DOOR_H; };
      const held = d => d[0] !== d[2] ? solid(d[0] - 1, d[1]) && solid(d[2] + 1, d[3]) : d[1] !== d[3] ? solid(d[0], d[1] - 1) && solid(d[2], d[3] + 1) : (solid(d[0] - 1, d[1]) && solid(d[0] + 1, d[1])) || (solid(d[0], d[1] - 1) && solid(d[0], d[1] + 1));
      const keep = DOORS.filter(held); DOORS.length = 0; DOORS.push(...keep); }
    for (const d of DOORS) for (let j = d[1]; j <= d[3]; j++) for (let i = d[0]; i <= d[2]; i++) CEIL[idx(i, j)] = DOOR_H;
    for (let k = 0; k < NC; k++) if (SRC[Math.floor(k / GW)][k % GW] === 'w') CEIL[k] = WIN_H;   // a window: the wall carries on above the opening
    siteCells.forEach((cells, q) => { if (!cells.length) return; const c = [0, 0]; for (const p of cells) { c[0] += p[0] / cells.length; c[1] += p[1] / cells.length; } SITES.push({ k: 'ABC'[q], cells, c }); });
    siteC[0] = SITES[0].c[0]; siteC[1] = SITES[0].c[1];
    // the mechanic's pieces
    (MAP.tps || []).forEach((t, n) => { TPS.push({ a: C(t[0] + .5, t[1] + .5), b: C(t[2] + .5, t[3] + .5), yaw: t[4] }); TPX[idx(t[0], t[1])] = n; });
    (MAP.pads || []).forEach((t, n) => { PADS.push({ a: C(t[0] + .5, t[1] + .5), b: C(t[2] + .5, t[3] + .5), h: CH[idx(t[2], t[3])] }); PADX[idx(t[0], t[1])] = n; });
    const groupOf = (ch, X2, list, mk) => { for (let k = 0; k < NC; k++) if (SRC[Math.floor(k / GW)][k % GW] === ch && X2[k] < 0) {
      const n = list.length, st = [k], cells = []; X2[k] = n; while (st.length) { const q = st.pop(); cells.push(q); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = idx(q % GW + di, Math.floor(q / GW) + dj); if (nk >= 0 && X2[nk] < 0 && SRC[Math.floor(nk / GW)][nk % GW] === ch) { X2[nk] = n; st.push(nk); } } }
      const c = [0, 0]; for (const q of cells) { c[0] += ((q % GW) + .5) * CS / cells.length; c[1] += (Math.floor(q / GW) + .5) * CS / cells.length; } list.push(mk(cells, c)); } };
    groupOf('G', GATEX, GATES, (cells, c) => ({ cells, c, open: true, sw: [] }));
    groupOf('W', BRKX, BRKS, (cells, c) => ({ cells, c, hp: BRK_HP * cells.length / 2, HP: BRK_HP * cells.length / 2 }));
    for (const w of MAP.sw || []) { const G = GATES[w[2] | 0]; if (G) G.sw.push(C(w[0] + .5, w[1] + .5)); }
    // attackers who start at both ends of the map take turns at each end, so a team is split across them
    if (MAP.split && SPAWN.att.length) { const cx = MW / 2, a = SPAWN.att.filter(p => p[0] < cx), b = SPAWN.att.filter(p => p[0] >= cx); SPAWN.att.length = 0; for (let n = 0; n < Math.max(a.length, b.length); n++) { if (a[n]) SPAWN.att.push(a[n]); if (b[n]) SPAWN.att.push(b[n]); } }
    navCells.length = 0; for (let k = 0; k < NC; k++) if (NAV[k]) navCells.push([(k % GW) * CS + 1, Math.floor(k / GW) * CS + 1]);
    resetMech(); placeOrbs(); spawnZones();
    return MAP;
  }
  // the nearest cell to stand still on: open ground, not a belt, ice, a pad, a teleporter or a vent
  function plainNear(i0, j0) {
    for (let r = 0; r <= 4; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = i0 + di, j = j0 + dj, k = idx(i, j);
      if (k >= 0 && NAV[k] && !BELT[k] && !ICE[k] && TPX[k] < 0 && PADX[k] < 0 && !CAX[k] && '.oqrADgL'.includes(SRC[j][i])) return [i, j]; }
    return null;
  }
  function spawnZones() {
    for (const side of ['att', 'def']) {
      const Z = ZONE[side], q = []; Z.fill(0);
      for (const p of SPAWN[side]) { const k = idx(Math.floor(p[0] / CS), Math.floor(p[1] / CS)); if (k >= 0 && !Z[k]) { Z[k] = 1; q.push([k, 0]); } }
      while (q.length) { const [k, d] = q.shift(); if (d >= 3) continue; const i = k % GW, j = Math.floor(k / GW);
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = idx(i + di, j + dj); if (nk < 0 || Z[nk] || !NAV[nk] || TPX[nk] >= 0 || PADX[nk] >= 0 || CH[nk] > STEP) continue; Z[nk] = 2; q.push([nk, d + 1]); } }
    }
    /* The defenders are not penned in their spawn: in the buy phase they may go anywhere on their own half (every cell a good
       way nearer their spawn than the attackers'), sites included, to set up before the attackers come; the barrier stands
       across the ways in, a few cells short of the middle. */
    if (SPAWN.def.length && SPAWN.att.length) {
      const dist = side => { const D = new Int16Array(NC).fill(-1), q = []; for (const p of SPAWN[side]) { const k = idx(Math.floor(p[0] / CS), Math.floor(p[1] / CS)); if (k >= 0 && D[k] < 0) { D[k] = 0; q.push(k); } }
        for (let h = 0; h < q.length; h++) { const k = q[h], i = k % GW, j = Math.floor(k / GW); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = idx(i + di, j + dj); if (nk < 0 || D[nk] >= 0 || !NAV[nk] || CH[nk] > STEP) continue; D[nk] = D[k] + 1; q.push(nk); } }
        return D; };
      const dD = dist('def'), dA = dist('att'), Z = ZONE.def, q = [];
      for (let k = 0; k < NC; k++) if (Z[k]) q.push(k);
      for (let h = 0; h < q.length; h++) { const k = q[h], i = k % GW, j = Math.floor(k / GW);
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = idx(i + di, j + dj); if (nk < 0 || Z[nk] || !NAV[nk] || TPX[nk] >= 0 || PADX[nk] >= 0 || CH[nk] > STEP || dD[nk] < 0) continue;
          if (dA[nk] >= 0 && dD[nk] > dA[nk] - 5) continue; Z[nk] = 2; q.push(nk); } }
    }
  }
  // one point on your side of the barrier (for the ends of a line drawn across the floor)
  const inZoneP = (side, x, z) => { const k = idx(Math.floor(x / CS), Math.floor(z / CS)); return k >= 0 && !!ZONE[side][k]; };
  const inZone = (side, x, z) => { const Z = ZONE[side]; for (const [ox, oz] of [[-RAD, -RAD], [RAD, -RAD], [-RAD, RAD], [RAD, RAD]]) { const k = idx(Math.floor((x + ox) / CS), Math.floor((z + oz) / CS)); if (k < 0 || !Z[k]) return false; } return true; };
  function placeOrbs() {
    ORBS.length = 0;
    if (MAP.orbs) { for (const o of MAP.orbs) ORBS.push(C(o[0] + .5, o[1] + .5)); return; }
    const a = SPAWN.att[0]; if (!a) return; const mids = [];
    for (const k of Object.keys(ROUTES).sort()) {
      const S = SITES[RSITE[k] || 0], pts = [...ROUTES[k], S.c], line = []; let x = a[0], z = a[1];
      for (const q of pts) { const pp = findPath(x, z, q[0], q[1]); if (!pp.length) break; line.push([x, z], ...pp); x = q[0]; z = q[1]; }
      let L = 0; for (let i = 1; i < line.length; i++) L += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]); if (L < 8) continue;
      let t = L * .5; for (let i = 1; i < line.length; i++) { const d = Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]); if (t <= d) { const u = t / d, px = lp(line[i - 1][0], line[i][0], u), pz = lp(line[i - 1][1], line[i][1], u), c = plainNear(...nearestNav(px, pz)); if (c) mids.push(C(c[0] + .5, c[1] + .5)); break; } t -= d; }
    }
    if (!mids.length) return; let best = [mids[0]], bd = -1;   // the two that are furthest apart
    for (let i = 0; i < mids.length; i++) for (let j = i + 1; j < mids.length; j++) { const d = Math.hypot(mids[i][0] - mids[j][0], mids[i][1] - mids[j][1]); if (d > bd) { bd = d; best = [mids[i], mids[j]]; } }
    ORBS.push(...best.slice(0, ORB.n));
  }
  // gates shut into walls and open again; breakable walls fall to rubble. Both reset every round.
  function setGate(g, open) { const G = GATES[g]; if (!G) return; G.open = open; for (const k of G.cells) { CH[k] = CB[k] = open ? 0 : GATE_H; NAV[k] = open ? 1 : 0; } }
  function setWall(b, up) { const B = BRKS[b]; if (!B) return; if (up) B.hp = B.HP; else B.hp = 0; for (const k of B.cells) { CH[k] = CB[k] = up ? WALL_H : 0; NAV[k] = up ? 0 : 1; } }
  function resetMech() { GATES.forEach((G, g) => setGate(g, true)); BRKS.forEach((B, b) => setWall(b, true)); }
  const mechOf = () => MAP.mech || '';

  // a round's length on this map (the two-site maps are bigger, so their rounds run longer)
  const roundT = () => MAP.roundT || ROUND_T;
  // the maps for a mode: sites 1 (the seven one-site maps) or 2 (the six two-site maps)
  const mapPool = sites => MAPS.map((m, i) => i).filter(i => ((MAPS[i].sites || 1) > 1) === (sites === 2));   // STANDARD takes the two- and three-site maps
  // the ground under a point; hMove is the same for movement, where fences and the edge of the map are walls
  function hAt(x, z) {
    const i = Math.floor(x / CS), j = Math.floor(z / CS), k = idx(i, j); if (k < 0) return 0;
    return CAX[k] ? lp(CH[k], CB[k], z / CS - j) : CH[k];
  }
  const hMove = (x, z) => { const k = idx(Math.floor(x / CS), Math.floor(z / CS)); return k < 0 || FENCE[k] ? 99 : hAt(x, z); };
  // which site a point is on: 0 (A, or the only site), 1 (B), or -1
  const siteAt = (x, z) => { const c = chAt(Math.floor(x / CS), Math.floor(z / CS)); return c === 'o' ? 0 : c === 'q' ? 1 : c === 'r' ? 2 : -1; };
  const onSite = (x, z) => siteAt(x, z) >= 0;
  const twoSites = () => SITES.length > 1;
  const nearestSite = (x, z) => { let b = SITES[0], bd = 1e9; for (const S of SITES) { const d = Math.hypot(S.c[0] - x, S.c[1] - z); if (d < bd) { bd = d; b = S; } } return b; };
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
    let best = null, bd = 1e9; for (const p of navCells) { const d = Math.hypot(p[0] - x, p[1] - z); if (d < bd && NAV[idx(Math.floor(p[0] / CS), Math.floor(p[1] / CS))]) { bd = d; best = p; } }
    return cellOf(best[0], best[1]);
  }
  // can a fighter walk the straight line between two points? (used to straighten paths and by bots that strafe)
  function walkLine(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az); if (d < .01) return true;
    const n = Math.ceil(d / .35), px = -(bz - az) / d * (RAD + .1), pz = (bx - ax) / d * (RAD + .1), endK = idx(Math.floor(bx / CS), Math.floor(bz / CS)); let prev = hAt(ax, az);
    for (let s = 1; s <= n; s++) {
      const x = lp(ax, bx, s / n), z = lp(az, bz, s / n), h = hAt(x, z), k = idx(Math.floor(x / CS), Math.floor(z / CS));
      if (!NAV[k] || Math.abs(h - prev) > STEP) return false;
      if ((TPX[k] >= 0 || PADX[k] >= 0) && k !== endK) return false;   // never across a teleporter or a jump pad by accident
      if (hMove(x + px, z + pz) > h + STEP || hMove(x - px, z - pz) > h + STEP) return false;
      prev = h;
    }
    return true;
  }
  const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]], BELTS_D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const gCost = new Float32Array(MAXNC), cameFrom = new Int32Array(MAXNC), closed = new Uint8Array(MAXNC);
  // A* over the cells, then pulled straight wherever a fighter could walk it directly. Returns points in metres.
  function findPath(x0, z0, x1, z1) {
    const [si, sj] = nearestNav(x0, z0), [ti, tj] = nearestNav(x1, z1), sk = idx(si, sj), tk = idx(ti, tj);
    gCost.fill(1e9); closed.fill(0); cameFrom.fill(-1); gCost[sk] = 0; const open = [sk];
    while (open.length) {
      let bi = 0, bf = 1e9; for (let n = 0; n < open.length; n++) { const k = open[n], f = gCost[k] + Math.hypot(k % GW - ti, Math.floor(k / GW) - tj); if (f < bf) { bf = f; bi = n; } }
      const k = open[bi]; open[bi] = open[open.length - 1]; open.pop(); if (k === tk) break; if (closed[k]) continue; closed[k] = 1;
      const i = k % GW, j = Math.floor(k / GW), relax = (nk, w) => { const g = gCost[k] + w; if (g < gCost[nk]) { gCost[nk] = g; cameFrom[nk] = k; open.push(nk); } };
      // stepping onto a teleporter or a jump pad takes you to its other end, and nowhere else
      if (TPX[k] >= 0 && k !== sk) { const t = TPS[TPX[k]]; relax(idx(Math.floor(t.b[0] / CS), Math.floor(t.b[1] / CS)), 1); continue; }
      if (PADX[k] >= 0 && k !== sk) { const t = PADS[PADX[k]]; relax(idx(Math.floor(t.b[0] / CS), Math.floor(t.b[1] / CS)), Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1]) / CS * .7); continue; }
      for (const [di, dj, w] of NB) {
        const nk = idx(i + di, j + dj);
        if (di && dj) { if (!joined(i, j, di, 0) || !joined(i, j, 0, dj) || !joined(i + di, j, 0, dj) || !joined(i, j + dj, di, 0)) continue; }
        else if (!joined(i, j, di, dj)) { if (!(nk >= 0 && NAV[nk] && CH[k] - CH[nk] > STEP && CH[k] - CH[nk] <= HIGH_H + .1 && !CAX[k] && !CAX[nk])) continue; }   // or a drop off a ledge (one way)
        let cw = w; if (BELT[nk]) { const bd = BELTS_D[BELT[nk] - 1], along = bd[0] * di + bd[1] * dj; cw *= along > 0 ? .55 : along < 0 ? 2.4 : 1; }   // belts: quick with them, slow against
        relax(nk, cw);
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
