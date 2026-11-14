  /* ---------- 30 map: Saltworks ----------
     A grid of 2 m cells, 32 by 22. x runs east with the columns, z runs south with the rows; the sea is to the north.
       #  wall (6 m)          X  container (3 m, nothing sees over it)     c  crate (1.1 m: crouch behind, jump onto)
       P  loading dock (1.5 m, you stand on it)      7 8  the dock's stairs, rising south      ~  sea wall (a fence)
       o  the site (plant here)      A D  attacker and defender spawns      .  open ground
     The Gate's opening into the Yard is offset from the Yard's doorway, so neither spawn can see the other.
     Three ways from the Gate (west) to the site: Pier along the north, the Yard and its doorway through the middle,
     the roofed Tunnel along the south. Everything else (rays, movement, bot paths, the world mesh) reads these cells. */
  const CS = 2;
  const SRC = [
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
  ];
  const GW = SRC[0].length, GH = SRC.length, MW = GW * CS, MH = GH * CS;
  const WALL_H = 6, BOX_H = 3, CRATE_H = 1.1, DOCK_H = 1.5, FENCE_H = 1.1;
  // rectangles are [col0, row0, col1, row1], inclusive
  const ROOFS = [{ r: [7, 17, 17, 19], h: 2.8 }];                       // the Tunnel's roof
  const DOORS = [[1, 5, 2, 5], [11, 5, 12, 5], [20, 5, 21, 5], [28, 5, 29, 5], [2, 15, 3, 15], [18, 15, 19, 15], [27, 15, 28, 15], [15, 10, 15, 11], [25, 8, 25, 9]];
  const DOOR_H = 2.7;
  const AREAS = [
    { k: 'pier', n: 'Pier', r: [1, 1, 30, 5], col: '#2aa7a0' }, { k: 'gate', n: 'Gate', r: [1, 6, 5, 14], col: '#8a9a5b' },
    { k: 'yard', n: 'Yard', r: [6, 6, 15, 14], col: '#d9a441' }, { k: 'site', n: 'Site', r: [16, 6, 24, 14], col: '#ff8a3d' },
    { k: 'sheds', n: 'Sheds', r: [25, 6, 30, 14], col: '#4f7fb0' }, { k: 'tunnel', n: 'Tunnel', r: [1, 15, 19, 20], col: '#b5523f' },
    { k: 'alley', n: 'Alley', r: [20, 15, 30, 20], col: '#8d6bb0' },
  ];
  // per cell: height at the low and high end (they differ only on stairs), which way stairs run (0 none, 2 along z),
  // the ceiling above it (0 = open sky), whether it is a fence, whether a fighter can stand there, its area
  const NC = GW * GH, CH = new Float32Array(NC), CB = new Float32Array(NC), CAX = new Uint8Array(NC), CEIL = new Float32Array(NC), FENCE = new Uint8Array(NC), NAV = new Uint8Array(NC), AREA = new Int8Array(NC).fill(-1);
  const idx = (i, j) => i < 0 || j < 0 || i >= GW || j >= GH ? -1 : j * GW + i;
  const chAt = (i, j) => { const k = idx(i, j); return k < 0 ? ' ' : SRC[j][i]; };
  const SPAWN = { att: [], def: [] }, SITE = [];
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const c = SRC[j][i], k = j * GW + i, mid = [i * CS + 1, j * CS + 1];
    let a = 0, b = 0;
    if (c === '#') a = b = WALL_H; else if (c === 'X') a = b = BOX_H; else if (c === 'c') a = b = CRATE_H; else if (c === 'P') a = b = DOCK_H;
    else if (c === '~') { a = b = FENCE_H; FENCE[k] = 1; } else if (c === '7') { b = DOCK_H / 2; CAX[k] = 2; } else if (c === '8') { a = DOCK_H / 2; b = DOCK_H; CAX[k] = 2; }
    CH[k] = a; CB[k] = b; NAV[k] = '.oADP78'.includes(c) ? 1 : 0;
    if (c === 'A') SPAWN.att.push(mid); if (c === 'D') SPAWN.def.push(mid); if (c === 'o') SITE.push(mid);
    AREAS.forEach((A, n) => { if (i >= A.r[0] && i <= A.r[2] && j >= A.r[1] && j <= A.r[3]) AREA[k] = n; });
  }
  for (const rf of ROOFS) for (let j = rf.r[1]; j <= rf.r[3]; j++) for (let i = rf.r[0]; i <= rf.r[2]; i++) CEIL[idx(i, j)] = rf.h;
  for (const d of DOORS) for (let j = d[1]; j <= d[3]; j++) for (let i = d[0]; i <= d[2]; i++) CEIL[idx(i, j)] = DOOR_H;
  const siteC = SITE.reduce((s, p) => [s[0] + p[0] / SITE.length, s[1] + p[1] / SITE.length], [0, 0]);

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
  const navCells = []; for (let k = 0; k < NC; k++) if (NAV[k]) navCells.push([(k % GW) * CS + 1, Math.floor(k / GW) * CS + 1]);
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

  /* ---------- authored spots, in cell units (C turns them into metres) ---------- */
  const C = (c, r) => [c * CS, r * CS];
  // the attacker's routes: points to pass on the way in
  const ROUTES = {
    pier: [C(1.5, 5.5), C(8, 2.5), C(17, 2.5), C(20.5, 5.5)],
    split: [C(5.5, 13), C(11.5, 5.5), C(17, 2.5), C(20.5, 5.5)],
    mid: [C(5.5, 13), C(10, 10.5), C(14, 11), C(16.5, 11)],
    tunnel: [C(2.5, 15.5), C(5, 18.5), C(13, 18.5), C(18.5, 17), C(18.5, 14.5)],
  };
  // where a defender waits and what they watch
  const HOLDS = [
    { p: C(23, 11.5), look: C(15.5, 11.5), lane: 'mid' }, { p: C(24, 13.5), look: C(16.5, 11), lane: 'mid' },
    { p: C(17, 7.5), look: C(16, 11), lane: 'mid' }, { p: C(27, 2), look: C(12, 1.5), lane: 'pier' },
    { p: C(22.5, 7.5), look: C(20.5, 5.5), lane: 'pier' }, { p: C(21, 19.5), look: C(17.5, 18.5), lane: 'tunnel' },
    { p: C(23.5, 13), look: C(18.5, 15), lane: 'tunnel' }, { p: C(26.5, 9), look: C(19, 10), lane: 'any' },
  ];
