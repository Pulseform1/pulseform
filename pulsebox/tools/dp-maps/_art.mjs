// Draw a Duelpoint map as a picture: one string per row of 2 m cells, every row the same length.
// The cells are the game's own (see src/games/duelpoint/30-map.js), plus two for drawing:
//   :  a doorway: open ground under a lintel (the wall carries on above it, with a sign naming where it leads)
//   _  open ground under a roof (indoors: dim, a ceiling, lamps)
// Anything outside the walls you draw should be '#' (solid): carve the map out of rock, don't fence an open field.
// art(rows, { roofH }) returns { src, doors, roofs } for the map's definition.
export function art(rows, o = {}) {
  const H = rows.length, W = rows[0].length;
  rows.forEach((r, j) => { if (r.length !== W) throw new Error(`row ${j} is ${r.length} wide, row 0 is ${W}`); });
  const g = rows.map(r => r.split('')), doors = [], roofs = [], seen = new Set();
  const comp = (ch, i0, j0) => { const st = [[i0, j0]], cells = []; seen.add(i0 + ',' + j0);
    while (st.length) { const [i, j] = st.pop(); cells.push([i, j]); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj, k = a + ',' + b; if (a >= 0 && b >= 0 && a < W && b < H && !seen.has(k) && g[b][a] === ch) { seen.add(k); st.push([a, b]); } } }
    return cells; };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (g[j][i] === ':' && !seen.has(i + ',' + j)) { const c = comp(':', i, j); const xs = c.map(p => p[0]), ys = c.map(p => p[1]); doors.push([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]); }
  }
  // roofs: cover the '_' cells with rectangles, greedily (widest run first, then as far down as it stays full)
  const roofed = (i, j) => j < H && i < W && g[j][i] === '_';
  const used = new Set();
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (!roofed(i, j) || used.has(i + ',' + j)) continue;
    let i1 = i; while (roofed(i1 + 1, j) && !used.has((i1 + 1) + ',' + j)) i1++;
    let j1 = j; for (;;) { let full = true; for (let a = i; a <= i1; a++) if (!roofed(a, j1 + 1) || used.has(a + ',' + (j1 + 1))) { full = false; break; } if (!full) break; j1++; }
    for (let b = j; b <= j1; b++) for (let a = i; a <= i1; a++) used.add(a + ',' + b);
    roofs.push({ r: [i, j, i1, j1], h: o.roofH || 3 });
  }
  const src = g.map(r => r.map(c => c === ':' || c === '_' ? '.' : c).join(''));
  return { src, doors, roofs };
}
