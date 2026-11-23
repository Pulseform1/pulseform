  /* ---------- 72 world: the mesh of Saltworks, generated from the map's cells ----------
     Only faces you could ever see are made: the ground of open cells, the tops of solids, and a side wherever a
     neighbour is lower. Textures are sized in metres so they never stretch, and corners are darkened in the vertex colours
     (which also puts the Tunnel in shade on phones, where there are no shadow maps). One mesh per material. */
  /* Themes: what each map looks like. Tints multiply the shared textures; `glow` makes the painted bands light up;
     sky is [overhead, middle, horizon]; extras is the scenery past the walls. */
  const THEMES = {
    harbor: { sky: ['#3f7fc4', '#86b8e0', '#cfe3ee'], fog: '#cfe3ee', far: 420, hemi: ['#dfeeff', '#8a7a66'], sun: ['#fff0d8', 1.3], tint: {} },
    neon: { sky: ['#07061a', '#24124a', '#4a1f5e'], fog: '#2a1640', far: 260, hemi: ['#8a7cff', '#2a1a3a'], sun: ['#b9a8ff', .55], stars: 1, glow: 1, tint: { wall: '#6a6f8c', ground: '#5a5e70', steel: '#c8c8ff', crate: '#b6a4cc', steeltop: '#9a9ac8', dock: '#7c80a4' }, steel: ['#ff3ea5', '#3df2ff', '#ffd23f', '#7c5cff', '#5a6290'] },
    snow: { sky: ['#6f9ccc', '#b9d3ea', '#eef4f8'], fog: '#e9f0f5', far: 230, hemi: ['#f2f8ff', '#b8c4d0'], sun: ['#ffffff', 1.15], tint: { wall: '#eef3f7', ground: '#ffffff', crate: '#9a8a78', steeltop: '#ffffff' }, steel: ['#c0392b', '#3a7fa8', '#e0e6ea', '#5a7286'] },
    desert: { sky: ['#4f8fd0', '#9cc6e8', '#f2dcb0'], fog: '#f0d9ae', far: 300, hemi: ['#fff1d6', '#b08a58'], sun: ['#ffe2b0', 1.45], tint: { wall: '#f0d29a', ground: '#f2d6a0', crate: '#c8a070', steeltop: '#e8d0a0', dock: '#f0d8a4' }, steel: ['#a0522d', '#c9a227', '#6b7f5a', '#8a6a48'] },
    jungle: { sky: ['#4a8a7a', '#9fc9a8', '#cfe6c8'], fog: '#b7d4b0', far: 200, hemi: ['#d8f0d0', '#4a5a30'], sun: ['#fff4c8', 1.1], tint: { wall: '#a8b890', ground: '#9ab070', crate: '#b08a58', steeltop: '#a0b080', dock: '#c4cca8' }, steel: ['#4f6b3a', '#7a5a3a', '#3a5a5a', '#8a8a4a'] },
    lava: { sky: ['#1a0e0c', '#5a1e10', '#c2501e'], fog: '#5a2414', far: 220, hemi: ['#ff9a6a', '#2a1410'], sun: ['#ffb070', .9], glow: 1, tint: { wall: '#7a6a62', ground: '#6a5a54', crate: '#9a7e66', steel: '#b0a0a0', steeltop: '#8a7a74', dock: '#94847a' }, steel: ['#ff6a1a', '#6a6a74', '#c9862e', '#8a3a22'] },
    autumn: { sky: ['#5f88b8', '#d9b48c', '#f3d3a2'], fog: '#ecd2a8', far: 260, hemi: ['#fff0d6', '#7a5a38'], sun: ['#ffd49a', 1.3], tint: { wall: '#f2e6d2', ground: '#efe2cc', crate: '#b8804c', steeltop: '#d8c4a4', dock: '#dcc8a6' }, steel: ['#9a3a24', '#6b7a3a', '#c08a2a', '#4a5a6a', '#7a4a6a'] },
    space: { sky: ['#000004', '#060a1e', '#141a3a'], fog: '#0a1028', far: 320, hemi: ['#bcd4ff', '#2a3044'], sun: ['#e8f0ff', 1.2], stars: 1, glow: 1, tint: { wall: '#d4dcea', ground: '#aab4c8', crate: '#8a96aa', steeltop: '#c8d0e0', dock: '#dfe6f2' }, steel: ['#e8eef6', '#38e8ff', '#ff8a3d', '#5a6680'] },
  };
  // a new map: clear the old world away and build this one, with its sky and light
  function rebuildWorld() {
    if (!X) return;
    if (X.world) { X.scene.remove(X.world); X.world.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    if (X.mapTex) for (const t of X.mapTex) t.dispose();   // the last map's textures: let go, or every map played leaves a score of them on the graphics card
    X.texLog = []; fitSun(); buildWorld(); buildSky(); X.mapTex = X.texLog; X.texLog = null; resetMini(); warmShaders();
  }
  // the sun and its shadow cover the whole map, whatever its size
  function fitSun() {
    const s = X.sun; s.position.set(MW / 2 + SUN[0] * 90, SUN[1] * 90, MH / 2 + SUN[2] * 90); s.target.position.set(MW / 2, 0, MH / 2); s.target.updateMatrixWorld();
    if (s.castShadow) { const sc = s.shadow.camera, hw = Math.max(46, MW * .72), hh = Math.max(40, MH * .9); sc.left = -hw; sc.right = hw; sc.top = hh; sc.bottom = -hh; sc.far = 190 + MW; sc.updateProjectionMatrix(); }
  }
  function buildWorld() {
    const TH = THEMES[MAP.theme] || THEMES.harbor, W = X.world = new THREE.Group(); X.scene.add(W); X.theme = TH;
    X.scene.background = new THREE.Color(TH.fog); X.scene.fog.color.set(TH.fog); X.scene.fog.far = TH.far; X.scene.fog.near = TH.far * .2;
    if (X.hemi) { X.hemi.color.set(TH.hemi[0]); X.hemi.groundColor.set(TH.hemi[1]); X.sun.color.set(TH.sun[0]); X.sun.intensity = TH.sun[1] * (X.low ? .9 : 1); }
    const sh = !X.low, bags = {}, WHITE = [1, 1, 1];
    const bag = k => bags[k] || (bags[k] = { p: [], n: [], uv: [], c: [], i: [] });
    // one four-cornered face: corners in order round the edge, its normal, a uv and a shade for each corner, a tint
    const quad = (k, P, n, UV, shade, tint = WHITE) => {
      const b = bag(k), at = b.p.length / 3;
      for (let v = 0; v < 4; v++) { b.p.push(P[v][0], P[v][1], P[v][2]); b.n.push(n[0], n[1], n[2]); b.uv.push(UV[v][0], UV[v][1]); const s = shade[v]; b.c.push(tint[0] * s, tint[1] * s, tint[2] * s); }
      const ax = P[1][0] - P[0][0], ay = P[1][1] - P[0][1], az = P[1][2] - P[0][2], bx = P[2][0] - P[0][0], by = P[2][1] - P[0][1], bz = P[2][2] - P[0][2];
      const front = (ay * bz - az * by) * n[0] + (az * bx - ax * bz) * n[1] + (ax * by - ay * bx) * n[2] > 0;   // wind it to face along the normal
      if (front) b.i.push(at, at + 1, at + 2, at, at + 2, at + 3); else b.i.push(at, at + 2, at + 1, at, at + 3, at + 2);
    };
    const flat = (k, x0, z0, x1, z1, y, up, uvs, shade, tint) => quad(k, [[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]], [0, up, 0], [[x0 / uvs, z0 / uvs], [x0 / uvs, z1 / uvs], [x1 / uvs, z1 / uvs], [x1 / uvs, z0 / uvs]], shade, tint);
    // a vertical face on one edge of a cell (e: 0 east, 1 west, 2 south, 3 north) between two heights
    const wallFace = (k, i, j, e, y0, y1, uv, shade, tint, out = 0) => {
      const x0 = i * CS, z0 = j * CS, x1 = x0 + CS, z1 = z0 + CS, n = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]][e];
      const a = e === 0 ? [x1 + out, z0] : e === 1 ? [x0 - out, z0] : e === 2 ? [x0, z1 + out] : [x0, z0 - out], b = e === 0 ? [x1 + out, z1] : e === 1 ? [x0 - out, z1] : e === 2 ? [x1, z1 + out] : [x1, z0 - out];
      const fl = e === 0 || e === 3 ? -1 : 1, ua = fl * (e < 2 ? a[1] : a[0]), ub = fl * (e < 2 ? b[1] : b[0]);   // (a texture runs left to right as you look at the face, whichever way it faces: east and north faces had it mirrored, and lettering read backwards)
      quad(k, [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]], n, [uv(ua, y0), uv(ub, y0), uv(ub, y1), uv(ua, y1)], shade, tint);
    };
    const hex = c => { const v = parseInt(c.slice(1), 16); return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255].map(q => Math.pow(q, 2.2)); };
    const TRIM = [.2, .21, .24];
    const roofed = new Uint8Array(NC); for (const rf of ROOFS) for (let j = rf.r[1]; j <= rf.r[3]; j++) for (let i = rf.r[0]; i <= rf.r[2]; i++) roofed[idx(i, j)] = 1;
    const tall = (i, j) => { const k = idx(i, j); return k >= 0 && CH[k] >= 1 && !CAX[k] ? 1 : 0; };
    // how dark a grid corner is: darker the more solid cells meet there
    const corner = (ci, cj) => 1 - .13 * (tall(ci - 1, cj - 1) + tall(ci, cj - 1) + tall(ci - 1, cj) + tall(ci, cj));
    const GROUND_TINT = { pier: WHITE, yard: [1, .98, .93], site: [.9, .9, .9], tunnel: [.7, .7, .73], alley: [.8, .8, .83], gate: [1, .9, .74], sheds: [1, .9, .74],
      aspawn: [1, .9, .74], along: WHITE, asite: [.9, .9, .9], mid: [1, .98, .93], blong: [.8, .8, .83], bsite: [.9, .9, .92], dspawn: [1, .9, .74] };
    // each area's floor leans a little toward its callout colour, so the zones read apart (the old maps keep their own)
    const tints = {}, areaTint = A => GROUND_TINT[A.k] || tints[A.k] || (tints[A.k] = hex(A.col).map(q => .86 + .14 * Math.min(1, q * 2.2)));
    const STEEL = (TH.steel || ['#b5523f', '#2f8f8a', '#d6a23a', '#3d5a80', '#8a8f96']).map(hex);
    // containers that touch share a colour
    const group = new Int16Array(NC).fill(-1); let groups = 0;
    for (let k = 0; k < NC; k++) if (SRC[Math.floor(k / GW)][k % GW] === 'X' && group[k] < 0) { const st = [k]; group[k] = groups; while (st.length) { const q = st.pop(), qi = q % GW, qj = Math.floor(q / GW); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = idx(qi + di, qj + dj); if (nk >= 0 && group[nk] < 0 && chAt(qi + di, qj + dj) === 'X') { group[nk] = groups; st.push(nk); } } } groups++; }
    const uvWall = (u, y) => [u / 16, y / WALL_H], uvBox = (u, y) => [u / CS, y / BOX_H], uvCrate = (u, y) => [u / CS, y / CRATE_H], uvDock = (u, y) => [u / CS, y / DOCK_H], uvPlain = (u, y) => [u / 4, y / 4];

    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const c = SRC[j][i], k = j * GW + i, x0 = i * CS, z0 = j * CS, x1 = x0 + CS, z1 = z0 + CS, area = AREA[k] >= 0 ? AREAS[AREA[k]] : null, dim = roofed[k] ? .62 : 1;
      if ('.oqrADTJigLVG<>^vW'.includes(c)) {   // open ground (a breakable wall and a gate stand on it; 71-mech makes them)
        const sd = [corner(i, j), corner(i, j + 1), corner(i + 1, j + 1), corner(i + 1, j)].map(s => s * dim), b = BELTS.indexOf(c);
        const bk = c === 'i' ? 'ice' : c === 'V' ? 'vent' : c === 'L' ? 'lowg' : b >= 0 ? 'belt' + b : area && area.k === 'pier' && MAP.theme === 'harbor' ? 'deck' : 'ground';
        flat(bk, x0, z0, x1, z1, 0, 1, b >= 0 || c === 'V' ? 2 : 4, sd, bk === 'ground' || bk === 'deck' ? (c === 'r' ? [.9, .9, .9] : area ? areaTint(area) : WHITE) : WHITE); continue;
      }
      if (c === '7' || c === '8') {   // the dock's stairs: four steps a cell, rising south
        for (let s = 0; s < 4; s++) {
          const za = z0 + s * .5, zb = za + .5, y = lp(CH[k], CB[k], (s + .5) / 4), yp = s ? lp(CH[k], CB[k], (s - .5) / 4) : CH[k], t = [.86, .86, .84];
          flat('ground', x0, za, x1, zb, y, 1, 4, [1, 1, 1, 1], t);
          quad('ground', [[x0, yp, za], [x1, yp, za], [x1, y, za], [x0, y, za]], [0, 0, -1], [[x0 / 4, yp / 4], [x1 / 4, yp / 4], [x1 / 4, y / 4], [x0 / 4, y / 4]], [.8, .8, .9, .9], t);
          for (const [e, di] of [[1, -1], [0, 1]]) { const nk = idx(i + di, j); if (nk >= 0 && CB[nk] < y) { const xx = e ? x0 : x1; quad('ground', [[xx, 0, za], [xx, 0, zb], [xx, y, zb], [xx, y, za]], [e ? -1 : 1, 0, 0], [[za / 4, 0], [zb / 4, 0], [zb / 4, y / 4], [za / 4, y / 4]], [.75, .75, .9, .9], t); } }
        }
        continue;
      }
      const top = CH[k], kind = c === '#' || c === 'h' || c === 'w' ? 'wall' : c === 'X' ? 'steel' : c === 'c' ? 'crate' : c === 'P' || c === 'H' ? 'dock' : 'quay';
      const tint = kind === 'steel' ? STEEL[group[k] % STEEL.length] : kind === 'quay' ? [.86, .85, .82] : WHITE, uv = kind === 'wall' ? uvWall : kind === 'steel' ? uvBox : kind === 'crate' ? uvCrate : kind === 'dock' ? uvDock : uvPlain;
      const mat = kind === 'quay' ? 'ground' : kind;
      // the top
      if (kind === 'wall') flat('ground', x0, z0, x1, z1, top, 1, 4, [1, 1, 1, 1], c === '#' ? [.62, .6, .57] : [.78, .76, .72]);
      if (c === 'w') {   // a window: the wall over the opening (its underside, its top, and a face wherever no full wall stands beside it)
        flat('wall', x0, z0, x1, z1, WIN_H, -1, 4, [.55, .55, .55, .55]); flat('ground', x0, z0, x1, z1, WALL_H, 1, 4, [1, 1, 1, 1], [.62, .6, .57]);
        for (let e = 0; e < 4; e++) { const ni = i + (e === 0 ? 1 : e === 1 ? -1 : 0), nj = j + (e === 2 ? 1 : e === 3 ? -1 : 0), nk = idx(ni, nj); if (nk < 0 || CH[nk] >= WALL_H - .01) continue;
          const d = roofed[nk] ? .62 : 1; wallFace('wall', i, j, e, Math.max(WIN_H, CH[nk]), WALL_H, uvWall, [d, d, d, d], WHITE); } }
      else if (kind === 'crate') quad('crate', [[x0, top, z0], [x0, top, z1], [x1, top, z1], [x1, top, z0]], [0, 1, 0], [[0, 0], [0, 1], [1, 1], [1, 0]], [1, 1, 1, 1]);
      else flat(kind === 'steel' ? 'steeltop' : 'ground', x0, z0, x1, z1, top, 1, kind === 'steel' ? CS : 4, [1, 1, 1, 1], kind === 'dock' ? [.88, .88, .86] : kind === 'steel' ? tint.map(q => q * .8) : tint);
      // the sides
      for (let e = 0; e < 4; e++) {
        const ni = i + (e === 0 ? 1 : e === 1 ? -1 : 0), nj = j + (e === 2 ? 1 : e === 3 ? -1 : 0), nk = idx(ni, nj);
        if (nk < 0 && c !== '~') continue;
        const nh = nk < 0 ? -1.4 : SRC[nj][ni] === 'W' ? 0 : CH[nk]; if (nh >= top) continue;   // beside a breakable wall: the face shows once it falls
        const d = nk >= 0 && roofed[nk] ? .62 : 1, lo = (nh <= .01 ? .78 : .92) * d;
        wallFace(mat, i, j, e, nh, top, uv, [lo, lo, d, d], tint);
        // the painted band that names the lane
        if (c === '#' && nk >= 0 && nh <= .01 && AREA[nk] >= 0) wallFace('band', i, j, e, 1.28, 1.6, uvPlain, [d, d, d, d], hex(AREAS[AREA[nk]].col), .012);
        if (c === 'h') wallFace('band', i, j, e, top - .13, top, uvPlain, [d, d, d, d], TRIM, .012);   // a half wall's coping
        if (c === 'w') { wallFace('band', i, j, e, top - .1, top, uvPlain, [d, d, d, d], TRIM, .014); wallFace('band', i, j, e, WIN_H, WIN_H + .1, uvPlain, [d, d, d, d], TRIM, .014); }   // a window's sill and head
        if (kind === 'dock' && nh <= .8) wallFace('band', i, j, e, top - .16, top, uvPlain, [1, 1, 1, 1], hex('#f2c230'), .012);
      }
    }
    // the Tunnel's roof: the underside you see, a top, and beams with lamps
    const lampM = new THREE.MeshBasicMaterial({ color: '#ffe2a8' }), beamM = new THREE.MeshLambertMaterial({ color: LC('#4a3b2c') });
    // the beams and lamps under the roofs, merged into one mesh per material; each lamp throws a pool of warm light on the floor
    // (painted on, not a real light: a real one per lamp made every surface in view pay for twenty lights)
    const RG = new THREE.Group(), pools = []; W.add(RG);
    // A covered area is often drawn as several roof pieces side by side: they are joined into one ceiling, cell by cell,
    // with an edge only where the ceiling ends and every beam running the same way (across the area's short span).
    const RH = new Float32Array(NC); for (const rf of ROOFS) for (let j = rf.r[1]; j <= rf.r[3]; j++) for (let i = rf.r[0]; i <= rf.r[2]; i++) { const k = idx(i, j); if (k >= 0) RH[k] = rf.h; }
    const seen = new Uint8Array(NC);
    for (let k0 = 0; k0 < NC; k0++) {
      if (!RH[k0] || seen[k0]) continue; const h = RH[k0], cells = [k0]; seen[k0] = 1; let i0 = 1e9, i1 = -1, j0 = 1e9, j1 = -1;
      for (let q = 0; q < cells.length; q++) { const k = cells[q], i = k % GW, j = Math.floor(k / GW); i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j);
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = idx(i + di, j + dj); if (nk >= 0 && !seen[nk] && RH[nk] === h) { seen[nk] = 1; cells.push(nk); } } }
      const alongX = i1 - i0 >= j1 - j0;   // beams stand every 2 cells along the long way, each spanning the short way
      for (const k of cells) {
        const i = k % GW, j = Math.floor(k / GW), x0 = i * CS, z0 = j * CS, x1 = x0 + CS, z1 = z0 + CS;
        flat('roof', x0, z0, x1, z1, h, -1, 2, [.8, .8, .8, .8]); flat('roof', x0, z0, x1, z1, h + .3, 1, 2, [1, 1, 1, 1]);
        const edge = (di, dj) => { const nk = idx(i + di, j + dj); return nk < 0 || RH[nk] !== h; };
        if (edge(-1, 0)) quad('roof', [[x0, h, z0], [x0, h, z1], [x0, h + .3, z1], [x0, h + .3, z0]], [-1, 0, 0], [[0, 0], [.5, 0], [.5, .15], [0, .15]], [.9, .9, .9, .9]);
        if (edge(1, 0)) quad('roof', [[x1, h, z1], [x1, h, z0], [x1, h + .3, z0], [x1, h + .3, z1]], [1, 0, 0], [[0, 0], [.5, 0], [.5, .15], [0, .15]], [.9, .9, .9, .9]);
        if (edge(0, -1)) quad('roof', [[x1, h, z0], [x0, h, z0], [x0, h + .3, z0], [x1, h + .3, z0]], [0, 0, -1], [[0, 0], [.5, 0], [.5, .15], [0, .15]], [.9, .9, .9, .9]);
        if (edge(0, 1)) quad('roof', [[x0, h, z1], [x1, h, z1], [x1, h + .3, z1], [x0, h + .3, z1]], [0, 0, 1], [[0, 0], [.5, 0], [.5, .15], [0, .15]], [.9, .9, .9, .9]);
        const n = alongX ? i - i0 : j - j0; if (n % 2) continue;
        const beam = new THREE.Mesh(alongX ? new THREE.BoxGeometry(.22, .26, CS) : new THREE.BoxGeometry(CS, .26, .22), beamM); beam.position.set(alongX ? x1 : (x0 + x1) / 2, h - .13, alongX ? (z0 + z1) / 2 : z1); RG.add(beam);
        if (n % 4 === 0 && (alongX ? j === Math.round((j0 + j1) / 2) : i === Math.round((i0 + i1) / 2))) { const lamp = new THREE.Mesh(alongX ? new THREE.BoxGeometry(.5, .08, .2) : new THREE.BoxGeometry(.2, .08, .5), lampM); const lx = alongX ? x1 : (x0 + x1) / 2, lz = alongX ? (z0 + z1) / 2 : z1; lamp.position.set(lx, h - .31, lz); RG.add(lamp); pools.push([lx, lz]); }
      }
    }
    bake(RG, false);
    if (pools.length) {
      if (!X.poolT) X.poolT = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.45, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
      const P = [], U = [], I = [], R2 = 3.4; pools.forEach(([x, z], n) => { const y = hAt(x, z) + .03; P.push(x - R2, y, z - R2, x + R2, y, z - R2, x + R2, y, z + R2, x - R2, y, z + R2); U.push(0, 0, 1, 0, 1, 1, 0, 1); I.push(n * 4, n * 4 + 2, n * 4 + 1, n * 4, n * 4 + 3, n * 4 + 2); });
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: X.poolT, color: '#ffcf8a', transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false })); m.renderOrder = 2; W.add(m);
    }
    // doorways: the wall carries on above them, with the name of where the door leads painted over it
    const signs = [];
    for (const d of DOORS) {
      const solid = (i, j) => { const k = idx(i, j); return k < 0 || CH[k] >= DOOR_H; }, x0 = d[0] * CS, z0 = d[1] * CS, x1 = (d[2] + 1) * CS, z1 = (d[3] + 1) * CS;
      const across = d[0] !== d[2] ? true : d[1] !== d[3] ? false : solid(d[0] - 1, d[1]) && solid(d[0] + 1, d[1]);   // across: a door in a wall that runs east-west
      flat('wall', x0, z0, x1, z1, DOOR_H, -1, 4, [.6, .6, .6, .6]);
      // the top of the wall over the door, like any other wall's top, and an end where the wall over it does not meet another
      // (without them the wall over a door was two bare faces: seen from above, a lone panel with the floor showing through)
      flat('ground', x0, z0, x1, z1, WALL_H, 1, 4, [1, 1, 1, 1], [.62, .6, .57]);
      { const ends = across ? [[d[0] - 1, d[1], x0, [-1, 0, 0]], [d[2] + 1, d[1], x1, [1, 0, 0]]] : [[d[0], d[1] - 1, z0, [0, 0, -1]], [d[0], d[3] + 1, z1, [0, 0, 1]]];
        for (const [ei, ej, c, n] of ends) { const k = idx(ei, ej); if (k >= 0 && CH[k] >= WALL_H - .01) continue;
          const P = across ? [[c, DOOR_H, z0], [c, DOOR_H, z1], [c, WALL_H, z1], [c, WALL_H, z0]] : [[x0, DOOR_H, c], [x1, DOOR_H, c], [x1, WALL_H, c], [x0, WALL_H, c]];
          quad('wall', P, n, P.map(q => uvWall(across ? q[2] : q[0], q[1])), [.9, .9, .9, .9]); } }
      const faces = across ? [[[x0, z0], [x1, z0], [0, 0, -1], 0, -1], [[x0, z1], [x1, z1], [0, 0, 1], 0, 1]] : [[[x0, z0], [x0, z1], [-1, 0, 0], -1, 0], [[x1, z0], [x1, z1], [1, 0, 0], 1, 0]];
      for (const [a, b, n, di, dj] of faces) {
        const fl = n[0] > 0 || n[2] < 0 ? -1 : 1, ua = fl * (across ? a[0] : a[1]), ub = fl * (across ? b[0] : b[1]);
        quad('wall', [[a[0], DOOR_H, a[1]], [b[0], DOOR_H, b[1]], [b[0], WALL_H, b[1]], [a[0], WALL_H, a[1]]], n, [uvWall(ua, DOOR_H), uvWall(ub, DOOR_H), uvWall(ub, WALL_H), uvWall(ua, WALL_H)], [1, 1, 1, 1]);
        // seen from this side, the door leads to the area on the other side
        const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, to = areaAt(mx - n[0] * 3, mz - n[2] * 3); if (to) signs.push({ x: mx + n[0] * .02, z: mz + n[2] * .02, ry: Math.atan2(n[0], n[2]), a: to });
      }
    }
    // textures
    const T = {
      // Walls and floors, painted clean and bold: big shapes, soft light, little noise, so a fighter reads at a glance.
      // A wall (16 m across, its full 6 m up): smooth plaster lit from above, panel seams every 2 m, a concrete coping
      // along the top and a skirting along the floor, and here and there the plaster broken away to show the brick
      // behind. Light enough that each map's tint carries its colour.
      wall: canvasTex(2048, 512, (g, w, h) => {
        if (surfWall(MAP.theme, g, w, h)) return;   // (a theme with a wall of its own: see 71-surfaces)
        const sk = Math.round(h * .075), cop = Math.round(h * .045);
        const base = g.createLinearGradient(0, 0, 0, h); base.addColorStop(0, '#ece4d2'); base.addColorStop(.6, '#ddd3bd'); base.addColorStop(1, '#cdc1a8'); g.fillStyle = base; g.fillRect(0, 0, w, h);
        // soft painted mottling: wide, faint washes rather than speckle
        for (let i = 0; i < 260; i++) { const lt = Math.random() < .55; g.fillStyle = lt ? `rgba(255,250,236,${.04 + Math.random() * .07})` : `rgba(120,104,80,${.03 + Math.random() * .05})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 120, 14 + Math.random() * 60, Math.random() * 3, 0, 7); g.fill(); }
        // brick showing through where the plaster has broken away (two or three patches, never on the skirting)
        const patch = (cx, cy, rx, ry) => {
          const pts = []; for (let a = 0; a < 14; a++) { const t = a / 14 * Math.PI * 2, r = .72 + Math.random() * .38; pts.push([cx + Math.cos(t) * rx * r, cy + Math.sin(t) * ry * r]); }
          const path = () => { g.beginPath(); pts.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
          g.save(); path(); g.clip(); g.fillStyle = '#a88e78'; g.fillRect(cx - rx * 1.2, cy - ry * 1.2, rx * 2.4, ry * 2.4);
          const bw = 34, bh = 15; for (let r = 0, y = cy - ry * 1.2; y < cy + ry * 1.2; y += bh, r++) for (let x = cx - rx * 1.2 - (r % 2) * bw / 2; x < cx + rx * 1.2; x += bw) {
            const v = Math.random() * 18; g.fillStyle = `rgb(${196 + v},${150 + v * .7},${122 + v * .5})`; g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
            g.fillStyle = 'rgba(255,230,200,.18)'; g.fillRect(x + 1.5, y + 1.5, bw - 3, 2); g.fillStyle = 'rgba(60,30,20,.18)'; g.fillRect(x + 1.5, y + bh - 3.5, bw - 3, 2); }
          const sh = g.createLinearGradient(0, cy - ry, 0, cy - ry * .4); sh.addColorStop(0, 'rgba(60,40,24,.3)'); sh.addColorStop(1, 'rgba(40,24,14,0)'); g.fillStyle = sh; g.fillRect(cx - rx * 1.2, cy - ry * 1.2, rx * 2.4, ry * .9);
          g.restore(); path(); g.lineWidth = 3; g.strokeStyle = 'rgba(110,94,72,.35)'; g.stroke(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,250,236,.6)'; g.save(); g.translate(0, 2.5); path(); g.stroke(); g.restore();
        };
        for (let n = 0, tries = 0; n < 1 && tries < 20; tries++) { const cx = 120 + Math.random() * (w - 240), cy = cop + 50 + Math.random() * (h - sk - cop - 210); if (cy > h * .62) continue; patch(cx, cy, 34 + Math.random() * 36, 22 + Math.random() * 22); n++; }
        // panel seams every 2 m: a fine recessed line with a lit lip
        for (let x = 0; x < w; x += 256) { g.fillStyle = 'rgba(80,68,50,.38)'; g.fillRect(x, cop, 3, h - sk - cop); g.fillStyle = 'rgba(255,250,236,.45)'; g.fillRect(x + 3, cop, 2, h - sk - cop); }
        // a fine horizontal reveal two-thirds of the way up
        { const y = Math.round(h * .3); g.fillStyle = 'rgba(80,68,50,.32)'; g.fillRect(0, y, w, 3); g.fillStyle = 'rgba(255,250,236,.4)'; g.fillRect(0, y + 3, w, 2); }
        // rain streaks below the coping and a little grime above the skirting
        for (let i = 0; i < 44; i++) { const x = Math.random() * w, l = 40 + Math.random() * 150, gr = g.createLinearGradient(0, cop, 0, cop + l); gr.addColorStop(0, 'rgba(100,88,66,.22)'); gr.addColorStop(1, 'rgba(100,88,66,0)'); g.fillStyle = gr; g.fillRect(x, cop, 3 + Math.random() * 10, l); }
        { const gr = g.createLinearGradient(0, h - sk - 70, 0, h - sk); gr.addColorStop(0, 'rgba(110,96,72,0)'); gr.addColorStop(1, 'rgba(110,96,72,.32)'); g.fillStyle = gr; g.fillRect(0, h - sk - 70, w, 70); }
        // the coping along the top
        g.fillStyle = '#a89d88'; g.fillRect(0, 0, w, cop); g.fillStyle = 'rgba(255,250,236,.35)'; g.fillRect(0, 0, w, 3); g.fillStyle = 'rgba(50,40,28,.45)'; g.fillRect(0, cop, w, 4); g.fillStyle = 'rgba(50,40,28,.15)'; g.fillRect(0, cop + 4, w, 6);
        for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(60,50,36,.3)'; g.fillRect(x, 0, 2, cop); }
        // the skirting along the floor: darker concrete with a bevelled top edge
        g.fillStyle = '#9c917c'; g.fillRect(0, h - sk, w, sk); g.fillStyle = 'rgba(255,250,236,.5)'; g.fillRect(0, h - sk, w, 3); g.fillStyle = 'rgba(50,40,28,.35)'; g.fillRect(0, h - sk - 4, w, 4);
        for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(60,50,36,${.05 + Math.random() * .1})`; g.fillRect(Math.random() * w, h - sk + 4 + Math.random() * (sk - 6), 6 + Math.random() * 30, 2 + Math.random() * 4); }
        for (let x = 0; x < w; x += 128) { g.fillStyle = 'rgba(60,50,36,.35)'; g.fillRect(x, h - sk, 2, sk); }
        if (MAP.theme === 'harbor' || !MAP.theme) surfHarborExtra(g, w, h);
      }),
      // A floor (4 m square): stone slabs a metre deep and two long, laid in running bond, each a touch different in tone,
      // bevelled so light catches the near edge, with the odd crack, worn patch and a few slabs cut into four.
      ground: canvasTex(512, 512, (g, w, h) => {
        if (surfGround(MAP.theme, g, w, h)) return;
        g.fillStyle = '#6e695f'; g.fillRect(0, 0, w, h);   // the grout between the slabs
        const slab = (x, y, sw, sh) => {
          const v = (Math.random() - .5) * 18, warm = Math.random() < .5 ? 4 : -2, c0 = `rgb(${190 + v + warm},${185 + v},${174 + v - warm})`, c1 = `rgb(${176 + v + warm},${171 + v},${160 + v - warm})`;
          const gr = g.createLinearGradient(x, y, x + sw * .6, y + sh); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(x + 2, y + 2, sw - 4, sh - 4);
          g.fillStyle = 'rgba(255,252,242,.42)'; g.fillRect(x + 2, y + 2, sw - 4, 3); g.fillRect(x + 2, y + 2, 3, sh - 4);
          g.fillStyle = 'rgba(40,36,28,.28)'; g.fillRect(x + 2, y + sh - 5, sw - 4, 3); g.fillRect(x + sw - 5, y + 2, 3, sh - 4);
          for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,252,240' : '90,82,70'},${.03 + Math.random() * .05})`; g.beginPath(); g.ellipse(x + Math.random() * sw, y + Math.random() * sh, 10 + Math.random() * 40, 6 + Math.random() * 20, Math.random() * 3, 0, 7); g.fill(); }
          for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(70,64,54,${.08 + Math.random() * .12})`; g.fillRect(x + 4 + Math.random() * (sw - 8), y + 4 + Math.random() * (sh - 8), 1.5, 1.5); }
          if (Math.random() < .22) { g.strokeStyle = 'rgba(60,54,44,.5)'; g.lineWidth = 1.4; let cx = x + 8 + Math.random() * (sw - 16), cy = y + 6; g.beginPath(); g.moveTo(cx, cy); for (let k = 0; k < 5; k++) { cx += (Math.random() - .5) * 26; cy += sh / 6; g.lineTo(cx, cy); } g.stroke(); }
        };
        for (let r = 0; r < 4; r++) { const y = r * 128, off = r % 2 ? 128 : 0;
          for (let x = -off; x < w; x += 256) {
            if (Math.random() < .16) { for (const [dx, dy] of [[0, 0], [128, 0], [0, 64], [128, 64]]) for (const wx of [x + dx, x + dx + w]) slab(wx, y + dy, 128, 64); }
            else for (const wx of [x, x + w]) slab(wx, y, 256, 128);
          } }
      }),
      deck: canvasTex(512, 512, (g, w, h) => {
        for (let r = 0; r < 8; r++) { const v = 118 + Math.random() * 34; g.fillStyle = `rgb(${v + 28},${v},${v - 34})`; g.fillRect(0, r * 64, w, 64); for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(60,38,18,${.05 + Math.random() * .1})`; g.fillRect(Math.random() * w, r * 64 + Math.random() * 64, 40 + Math.random() * 160, 1 + Math.random() * 2); }
          g.fillStyle = 'rgba(30,20,10,.75)'; g.fillRect(0, r * 64, w, 3); const off = (r % 2) * 128 + 60; for (const x of [off, off + 256]) { g.fillRect(x % w, r * 64, 3, 64); g.fillStyle = 'rgba(20,14,8,.8)'; for (const dx of [-10, 12]) for (const dy of [14, 50]) { g.beginPath(); g.arc((x + dx + w) % w, r * 64 + dy, 2.2, 0, 7); g.fill(); } g.fillStyle = 'rgba(30,20,10,.75)'; } }
      }),
      // corrugated steel: eight ribs a cell, each lit on one side and shaded on the other, a heavy rail top and bottom,
      // rust running down from the top rail and road dirt kicked up along the bottom
      steel: canvasTex(512, 256, (g, w, h) => {
        g.fillStyle = '#cfcfcf'; g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 64) { const gr = g.createLinearGradient(x, 0, x + 64, 0); gr.addColorStop(0, 'rgba(0,0,0,.30)'); gr.addColorStop(.12, 'rgba(255,255,255,.22)'); gr.addColorStop(.38, 'rgba(255,255,255,.10)'); gr.addColorStop(.5, 'rgba(0,0,0,.05)'); gr.addColorStop(.62, 'rgba(0,0,0,.16)'); gr.addColorStop(.88, 'rgba(0,0,0,.30)'); gr.addColorStop(1, 'rgba(0,0,0,.36)'); g.fillStyle = gr; g.fillRect(x, 0, 64, h);
          g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 7, 0, 2, h); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x + 54, 0, 2, h); }
        for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${Math.random() * .05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
        g.fillStyle = 'rgba(0,0,0,.34)'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 16, w, 16); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(0, 14, w, 2); g.fillRect(0, h - 18, w, 2);
        for (let i = 0; i < 18; i++) { const x = Math.random() * w, l = 30 + Math.random() * 130, gr = g.createLinearGradient(0, 14, 0, 14 + l); gr.addColorStop(0, 'rgba(110,52,20,.45)'); gr.addColorStop(1, 'rgba(110,52,20,0)'); g.fillStyle = gr; g.fillRect(x, 14, 2 + Math.random() * 7, l); }
        const dg = g.createLinearGradient(0, h * .72, 0, h); dg.addColorStop(0, 'rgba(70,58,44,0)'); dg.addColorStop(1, 'rgba(70,58,44,.45)'); g.fillStyle = dg; g.fillRect(0, h * .72, w, h * .28);
        for (let i = 0; i < 10; i++) { g.fillStyle = `rgba(90,40,16,${.15 + Math.random() * .2})`; g.beginPath(); g.ellipse(Math.random() * w, 20 + Math.random() * (h - 40), 3 + Math.random() * 10, 2 + Math.random() * 6, 0, 0, 7); g.fill(); }
      }),
      steeltop: canvasTex(128, 128, (g, w, h) => { grain(g, w, h, '#c4c4c4', .1, 1500); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); }),
      // a wooden shipping crate's face: six planks with gaps between them and nails at the ends, a brace corner to
      // corner, scuffs and a stencilled mark (the frame, posts and brackets round it are real 3D boards, see below)
      crate: canvasTex(512, 512, (g, w, h) => {
        g.fillStyle = '#1e140b'; g.fillRect(0, 0, w, h);
        const ph = h / 6;
        for (let r = 0; r < 6; r++) { const v = 150 + Math.random() * 30, y = r * ph; g.fillStyle = `rgb(${v + 22},${v - 12},${v - 62})`; g.fillRect(0, y + 3, w, ph - 6);
          for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(70,40,15,${.05 + Math.random() * .12})`; g.fillRect(Math.random() * w, y + 4 + Math.random() * (ph - 8), 30 + Math.random() * 180, 1 + Math.random() * 1.6); }
          const gr = g.createLinearGradient(0, y, 0, y + ph); gr.addColorStop(0, 'rgba(255,240,210,.16)'); gr.addColorStop(.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.22)'); g.fillStyle = gr; g.fillRect(0, y + 3, w, ph - 6);
          if (Math.random() < .5) { g.fillStyle = 'rgba(40,24,10,.5)'; g.beginPath(); g.ellipse(60 + Math.random() * (w - 120), y + ph / 2, 7, 4, 0, 0, 7); g.fill(); }
          g.fillStyle = 'rgba(25,18,12,.85)'; for (const x of [44, w - 44]) for (const dy of [ph * .3, ph * .7]) { g.beginPath(); g.arc(x, y + dy, 3.4, 0, 7); g.fill(); } }
        g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.atan2(h - 120, w - 120)); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-w * .62, -24, w * 1.24, 52); g.fillStyle = '#9a6c3e'; g.fillRect(-w * .62, -26, w * 1.24, 48);
        for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(70,40,15,${.08 + Math.random() * .1})`; g.fillRect(-w * .6 + Math.random() * w * 1.2, -24 + Math.random() * 44, 40 + Math.random() * 120, 1.4); }
        g.fillStyle = 'rgba(25,18,12,.85)'; for (const x of [-w * .5, -w * .2, w * .2, w * .5]) { g.beginPath(); g.arc(x, -2, 4, 0, 7); g.fill(); } g.restore();
        g.font = '700 40px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(30,22,16,.55)'; g.fillText('DP-' + (10 + Math.floor(Math.random() * 89)), w * .3, h * .2 + 14);
        g.lineWidth = 6; g.strokeStyle = 'rgba(30,22,16,.5)'; for (const x of [w * .72, w * .82]) { g.beginPath(); g.moveTo(x - 14, h * .86); g.lineTo(x, h * .78); g.lineTo(x + 14, h * .86); g.moveTo(x, h * .78); g.lineTo(x, h * .9); g.stroke(); }
        for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(255,235,200,${.05 + Math.random() * .08})`; g.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 60, 2 + Math.random() * 4); }
      }),
      // the crate's frame boards and the bare wood of the posts
      trim: canvasTex(256, 64, (g, w, h) => { grain(g, w, h, '#8a6038', .14, 900); for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(60,34,14,${.08 + Math.random() * .14})`; g.fillRect(Math.random() * w, Math.random() * h, 30 + Math.random() * 90, 1.2); } }),
      // the side of a raised dock or ledge: poured concrete in formwork panels, tie holes in rows, a chipped top edge
      dock: canvasTex(256, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#b6b1a6'); gr.addColorStop(1, '#a29d92'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,252,240' : '80,74,64'},${.04 + Math.random() * .05})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 50, 8 + Math.random() * 20, 0, 0, 7); g.fill(); }
        for (const x of [0, 128]) { g.fillStyle = 'rgba(70,64,54,.35)'; g.fillRect(x, 0, 2, h); g.fillStyle = 'rgba(255,252,240,.3)'; g.fillRect(x + 2, 0, 1, h); }
        g.fillStyle = 'rgba(70,64,54,.3)'; g.fillRect(0, h / 2, w, 2); g.fillStyle = 'rgba(255,252,240,.28)'; g.fillRect(0, h / 2 + 2, w, 1);
        for (const y of [h * .25, h * .75]) for (const x of [32, 96, 160, 224]) { g.fillStyle = 'rgba(50,46,40,.55)'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.fillStyle = 'rgba(255,252,240,.3)'; g.beginPath(); g.arc(x + 1, y + 1.5, 2, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(255,252,240,.4)'; g.fillRect(0, 0, w, 3); for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(90,84,72,.5)'; g.fillRect(Math.random() * w, 0, 6 + Math.random() * 16, 4 + Math.random() * 5); }
        const dg = g.createLinearGradient(0, h * .8, 0, h); dg.addColorStop(0, 'rgba(70,62,50,0)'); dg.addColorStop(1, 'rgba(70,62,50,.35)'); g.fillStyle = dg; g.fillRect(0, h * .8, w, h * .2);
      }),
      roof: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#6a6d72'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(0,0,0,.4)'); gr.addColorStop(.5, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); } }),
    };
    // the mechanic's floors: ice, belts (one texture each way, so each can run), vent grates, the low-gravity deck
    T.ice = canvasTex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#cfeeff'); gr.addColorStop(1, '#a8d8f4'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; for (let k = 0; k < 18; k++) { let x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); for (let q = 0; q < 5; q++) { x += (Math.random() - .5) * 120; y += (Math.random() - .5) * 120; g.lineTo(x, y); } g.stroke(); }
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(255,255,255,${.1 + Math.random() * .2})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 10 + Math.random() * 50, 4 + Math.random() * 12, Math.random() * 3, 0, 7); g.fill(); } });
    const beltDraw = dir => (g, w, h) => { g.fillStyle = '#26282c'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 2);
      g.translate(w / 2, h / 2); g.rotate([Math.PI / 2, 0, -Math.PI / 2, Math.PI][dir]);   // (the canvas's up lies along +z, south: east, south, west, north)
      g.strokeStyle = '#f2b51e'; g.lineWidth = 16; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-38, 26); g.lineTo(0, -16); g.lineTo(38, 26); g.stroke(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#111'; g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h); };
    X.beltT = [0, 1, 2, 3].map(dir => { const t = canvasTex(128, 128, beltDraw(dir)); t.userData = { dir }; T['belt' + dir] = t; return t; });
    T.vent = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#2a2c30'; g.fillRect(0, 0, w, h); g.fillStyle = '#0c0d0f'; for (let x = 12; x < w - 8; x += 14) g.fillRect(x, 10, 7, h - 20); g.strokeStyle = '#5a5e66'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); });
    T.lowg = canvasTex(256, 256, (g, w, h) => { grain(g, w, h, '#3a4256', .1, 2000); g.strokeStyle = 'rgba(110,220,255,.85)'; g.lineWidth = 3; const r = 32;
      for (let yy = 0, row = 0; yy < h + r; yy += r * 1.5, row++) for (let xx = (row % 2) * r * .866; xx < w + r; xx += r * 1.732) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * TAU / 6; g.lineTo(xx + Math.cos(a) * r * .95, yy + Math.sin(a) * r * .95); } g.closePath(); g.stroke(); } });
    X.tex = T;
    // ---- crates and containers in 3D: the box itself is the cell (its texture above), and round it real parts --------
    // a crate: four corner posts, frame boards round the top and the bottom, and a steel bracket on every corner;
    // a container: corner posts with cast corner blocks, top and bottom rails, a rib where one container ends and the next
    // starts, and on the end doors two locking bars with handles. All of it merged into a few meshes, a hand-breadth proud
    // of the cell at most, so it never changes what you can stand on or shoot past.
    {
      const PG = new THREE.Group(); W.add(PG);
      const lam = (c, map) => { const m = new THREE.MeshLambertMaterial({ color: c, map: map || null }); m.userData.keepUV = false; return m; };
      const ct = TH.tint.crate ? LC(TH.tint.crate) : new THREE.Color(1, 1, 1);
      const trimM = lam(ct.clone().multiplyScalar(.82), T.trim), brM = lam(LC('#3c3f45')), castM = lam(LC('#2e3136')), barM = lam(LC('#a4aab2'));
      const railM = STEEL.map(c => lam(new THREE.Color(c[0] * .62, c[1] * .62, c[2] * .62)));
      const bx = (m, w, h, d, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); PG.add(o); };
      const isX = (i, j) => chAt(i, j) === 'X';
      // each container group's long way, so the doors go on its ends
      const ext = {}; for (let k = 0; k < NC; k++) if (group[k] >= 0) { const i = k % GW, j = Math.floor(k / GW), e = ext[group[k]] || (ext[group[k]] = [i, j, i, j]); e[0] = Math.min(e[0], i); e[1] = Math.min(e[1], j); e[2] = Math.max(e[2], i); e[3] = Math.max(e[3], j); }
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const c = SRC[j][i], k = j * GW + i, x0 = i * CS, z0 = j * CS, x1 = x0 + CS, z1 = z0 + CS, top = CH[k];
        if (c === 'c') {
          const q = .05, t = .16;
          for (const [cx, cz] of [[x0 + q, z0 + q], [x1 - q, z0 + q], [x0 + q, z1 - q], [x1 - q, z1 - q]]) { bx(trimM, t, top - .012, t, cx, (top - .012) / 2, cz); bx(brM, t + .07, .2, t + .07, cx, top - .08, cz); bx(brM, t + .07, .16, t + .07, cx, .08, cz); }   // (the bracket stands 2 cm proud of the lid, the post stops short of it: nothing lies flush with the lid to flicker against it)
          for (const y of [top - .075, .08]) { bx(trimM, CS - .1, .13, t, (x0 + x1) / 2, y, z0 + q); bx(trimM, CS - .1, .13, t, (x0 + x1) / 2, y, z1 - q); bx(trimM, t, .13, CS - .1, x0 + q, y, (z0 + z1) / 2); bx(trimM, t, .13, CS - .1, x1 - q, y, (z0 + z1) / 2); }
        } else if (c === 'X') {
          const gi = group[k], rm = railM[gi % railM.length], E = ext[gi], longI = E[2] - E[0] >= E[3] - E[1];
          const out = [!isX(i + 1, j), !isX(i - 1, j), !isX(i, j + 1), !isX(i, j - 1)];   // east, west, south, north faces open
          const o = .04;
          for (let e = 0; e < 4; e++) {
            if (!out[e]) continue; const ni = i + (e === 0 ? 1 : e === 1 ? -1 : 0), nj = j + (e === 2 ? 1 : e === 3 ? -1 : 0), nk = idx(ni, nj); if (nk >= 0 && CH[nk] >= top) continue;
            const alongX = e >= 2, fx = e === 0 ? x1 + o : e === 1 ? x0 - o : (x0 + x1) / 2, fz = e === 2 ? z1 + o : e === 3 ? z0 - o : (z0 + z1) / 2;
            // top and bottom rails
            for (const y of [top - .1, .1]) bx(rm, alongX ? CS : .1, .18, alongX ? .1 : CS, fx, y, fz);   // (the top rail stops 1 cm under the roof, not flush with it)
            // a rib between containers every third cell along a side
            const along = alongX ? i : j; if (along % 3 === 0) bx(rm, alongX ? .12 : .1, top - .2, alongX ? .1 : .12, alongX ? x0 : fx, top / 2, alongX ? fz : z0);
            // the doors on the ends: two locking bars with their handles and keepers
            const isEnd = longI ? e < 2 : e >= 2;
            if (isEnd) for (const s of [-.45, .45]) { const bxp = alongX ? (x0 + x1) / 2 + s : fx + (e === 0 ? .04 : -.04), bzp = alongX ? fz + (e === 2 ? .04 : -.04) : (z0 + z1) / 2 + s;
              bx(barM, .06, top - .3, .06, bxp, top / 2, bzp); bx(barM, alongX ? .3 : .08, .06, alongX ? .08 : .3, bxp + (alongX ? .14 : 0), top * .45, bzp + (alongX ? 0 : .14));
              for (const y of [.28, top - .28]) bx(brM, .14, .1, .14, bxp, y, bzp); }
          }
          // corner posts and cast corner blocks where two open faces meet
          for (const [ex, ez, cx, cz] of [[0, 2, x1, z1], [0, 3, x1, z0], [1, 2, x0, z1], [1, 3, x0, z0]]) if (out[ex] && out[ez]) {
            const px = cx + (ex === 0 ? -.06 : .06), pz = cz + (ez === 2 ? -.06 : .06); bx(rm, .2, top - .012, .2, px, (top - .012) / 2, pz);
            for (const y of [top - .11, .13]) bx(castM, .28, .26, .28, px, y, pz);   // (the cast block stands 2 cm proud of the roof)
          }
        }
      }
      bake(PG, sh); PG.traverse(o => { if (o.isMesh) o.receiveShadow = sh; });
    }
    for (const k in bags) {
      const b = bags[k], geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3)); geo.setIndex(b.i);
      const m = new THREE.Mesh(geo, TH.glow && k === 'band' ? new THREE.MeshBasicMaterial({ vertexColors: true }) : k === 'ice' ? new THREE.MeshPhongMaterial({ map: T.ice, vertexColors: true, shininess: 90, specular: LC('#c8ecff') })
        : k === 'lowg' ? new THREE.MeshLambertMaterial({ map: T.lowg, vertexColors: true, emissive: LC('#3aa8d8'), emissiveMap: T.lowg, emissiveIntensity: .55 }) : new THREE.MeshLambertMaterial({ map: T[k] || null, vertexColors: true, color: LC(surfOwn(MAP.theme, k) ? '#ffffff' : TH.tint[k] || '#ffffff') })); m.castShadow = sh && k !== 'band' && k !== 'deck'; m.receiveShadow = sh; W.add(m);
    }
    // the sites: every plantable cell painted on the floor, and on a map of two or three, big letters on the walls round each
    (X.siteTex || []).forEach(t => t.dispose()); X.siteTex = [];   // the last map's paint
    X.wallMarks = []; for (const S of SITES) siteMarks(W, S, TH, sh);
    // door signs: every name painted once, in rows of one texture, and every sign on the map in one mesh (one draw; a mesh
    // and a texture for each sign cost a map with many doorways forty draws)
    if (signs.length) {
      const names = [...new Set(signs.map(s => s.a))], rowH = 64, H2 = 2 ** Math.ceil(Math.log2(names.length * rowH));
      const t = canvasTex(256, H2, (g, w) => { g.clearRect(0, 0, w, H2); names.forEach((a, r) => { const y = r * rowH; g.fillStyle = a.col; g.fillRect(0, y + 8, 14, 48); const txt = a.n.toUpperCase(); g.font = '700 46px "Chakra Petch", sans-serif'; const px = Math.min(46, Math.floor(46 * (w - 32) / g.measureText(txt).width)); g.font = `700 ${px}px "Chakra Petch", sans-serif`; g.textBaseline = 'middle'; g.fillStyle = 'rgba(40,38,34,.82)'; g.fillText(txt, 26, y + 34); }); });   // (a long name is set smaller, not cut off)
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      const geos = signs.map(s => { const r = names.indexOf(s.a), v0 = 1 - (r + 1) * rowH / H2, v1 = 1 - r * rowH / H2, q = new THREE.PlaneGeometry(2.6, .65), uv = q.attributes.uv;
        for (let k = 0; k < uv.count; k++) uv.setY(k, v0 + uv.getY(k) * (v1 - v0));
        return q.rotateY(s.ry).translate(s.x, 3.35, s.z); });
      W.add(new THREE.Mesh(mergeGeos(geos), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, map: t })));
    }
    detail(W, TH, sh, roofed, signs);
    horizonBackdrop(W, TH);   // the far distance, all the way round (72-horizon)
    if (MAP.theme !== 'harbor') { scenery(W, TH); buildMech(W, TH); return; }
    // beyond the sea wall: water, a jetty with a boat, a lighthouse; and two cranes over the east wall
    const lam = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: LC(c) }, o)), box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); W.add(o); return o; };
    const seaT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#1d7f88'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(190,240,240,${.08 + Math.random() * .2})`; g.fillRect(Math.random() * w, Math.random() * h, 10 + Math.random() * 40, 1.5); } }, [70, 40]);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 800), lam('#ffffff', { map: seaT })); sea.rotation.x = -Math.PI / 2; sea.position.set(MW / 2, -1.4, -398); W.add(sea); X.seaT = seaT;
    const wood = lam('#8a6a48'), dark = lam('#3a3f48');
    box(3, .25, 20, wood, 21, .55, -10); for (let z = -2; z > -20; z -= 4.4) for (const x of [19.7, 22.3]) box(.3, 2.4, .3, dark, x, -.4, z);
    box(7, 1.3, 2.6, lam('#a23b34'), 27.5, -.9, -12); box(2.4, 1.3, 1.9, lam('#efeae0'), 26, .35, -12); box(.12, 2.2, .12, dark, 29, .9, -12);
    const lh = new THREE.Group(); for (let s = 0; s < 5; s++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(2.1 - s * .22, 2.32 - s * .22, 4, 16), lam(s % 2 ? '#c8463c' : '#f2efe6')); seg.position.y = 2 + s * 4; lh.add(seg); }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 1.8, 12), new THREE.MeshBasicMaterial({ color: '#fff3c4' })); cap.position.y = 20.9; lh.add(cap); const hat = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.6, 12), dark); hat.position.y = 22.6; lh.add(hat); lh.position.set(-22, -1.4, -78); W.add(lh);
    for (const z of [MH * .23, MH * .77]) { const ox = MW - 64; box(.9, 30, .9, dark, 72 + ox, 15, z - 3); box(.9, 30, .9, dark, 72 + ox, 15, z + 3); box(1.2, 1.2, 7.4, dark, 72 + ox, 29.4, z); box(26, 1.1, 1.1, lam('#c9862e'), 62 + ox, 30.4, z); box(.2, 9, .2, dark, 52 + ox, 25.5, z); }
    buildMech(W, TH);
  }
  /* The sites. A site's middle (the average of its cells) often lands in a wall, a container, tall grass or under a roof,
     so its marks go on the open site cell nearest the middle that has room round it. siteSpot works that out once a map:
     x, y, z the spot, r the ring's radius, rot the way its letter reads (from the attackers' side), edges where the site
     meets open ground ([i, j, e], e as in wallFace), and lets: up to two open 2 by 2 blocks near its ways in for the
     stencilled letter, each read from the way in beside it. The HUD's site markers and the minimap use the same spot. */
  function siteSpot(S) {
    if (S.spot) return S.spot;
    const ch = 'oqr'['ABC'.indexOf(S.k)], mine = (i, j) => chAt(i, j) === ch, roof = (i, j) => CEIL[idx(i, j)] > 0;
    const openAt = (i, j) => { const k = idx(i, j); return k >= 0 && !!NAV[k] && CH[k] < 1 && !mine(i, j); };
    const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]], ROT = [-Math.PI / 2, Math.PI / 2, 0, Math.PI];   // a letter read by someone east, west, south, north of it
    const cells = S.cells.map(p => [Math.floor(p[0] / CS), Math.floor(p[1] / CS)]), edges = [];
    for (const [i, j] of cells) DIR.forEach(([di, dj], e) => { if (openAt(i + di, j + dj)) edges.push([i, j, e]); });
    // how far a point is from the nearest cell that is not this site, and from the nearest open ground that is not
    const room = (x, z) => { let any = 9, open = 9; const i0 = Math.floor(x / CS), j0 = Math.floor(z / CS);
      for (let j = j0 - 4; j <= j0 + 4; j++) for (let i = i0 - 4; i <= i0 + 4; i++) { if (mine(i, j)) continue;
        const d = Math.hypot(Math.max(i * CS - x, 0, x - (i + 1) * CS), Math.max(j * CS - z, 0, z - (j + 1) * CS)); if (d < any) any = d; if (d < open && openAt(i, j)) open = d; }
      return [any, open]; };
    // the spot: the middle of an unroofed site cell or the corner where four meet (under the roof only when all the site is)
    const sky = cells.some(([i, j]) => !roof(i, j)), ok = (i, j) => mine(i, j) && (!sky || !roof(i, j)), quad4 = (i, j) => ok(i, j) && ok(i + 1, j) && ok(i, j + 1) && ok(i + 1, j + 1), spots = [];
    for (const [i, j] of cells) { if (ok(i, j)) spots.push([(i + .5) * CS, (j + .5) * CS]); if (quad4(i, j)) spots.push([(i + 1) * CS, (j + 1) * CS]); }
    let at = spots[0] || S.c, best = 1e9;
    for (const p of spots) { const s = Math.hypot(p[0] - S.c[0], p[1] - S.c[1]) - 1.2 * Math.min(room(p[0], p[1])[0], 3); if (s < best) { best = s; at = p; } }
    const [any, open] = room(at[0], at[1]), r = cl(Math.min(open - .5, any + 1.6), 2, 4.4), a = SPAWN.att[0] || [MW / 2, MH];
    const facing = (x, z, tx, tz) => Math.abs(tx - x) > Math.abs(tz - z) ? (tx > x ? 0 : 1) : (tz > z ? 2 : 3);
    // the stencils: open 2 by 2 blocks clear of the ring, as near a way in as they can be, and apart from each other
    const blocks = [], lets = [];
    for (const [i, j] of cells) if (quad4(i, j)) {
      const x = (i + 1) * CS, z = (j + 1) * CS, dS = Math.hypot(x - at[0], z - at[1]); if (dS < r + 2.6) continue;
      let dE = 1e9, e = facing(x, z, a[0], a[1]); for (const E of edges) { const d = Math.hypot((E[0] + .5 + DIR[E[2]][0] * .5) * CS - x, (E[1] + .5 + DIR[E[2]][1] * .5) * CS - z); if (d < dE) { dE = d; e = E[2]; } }
      blocks.push({ x, z, dS, dE, rot: ROT[e] });
    }
    for (let n = 0; n < (cells.length >= 36 ? 2 : 1); n++) {
      let pick = null, ps = 1e9; for (const b of blocks) { if (lets.some(l => Math.hypot(l.x - b.x, l.z - b.z) < 9)) continue; const s = b.dE - .3 * Math.min(b.dS, 12); if (s < ps) { ps = s; pick = b; } }
      if (pick) lets.push(pick);
    }
    return (S.spot = { x: at[0], z: at[1], y: hAt(at[0], at[1]), r, rot: ROT[facing(at[0], at[1], a[0], a[1])], cells, edges, lets, sky });
  }
  /* A site's floor: one mesh over just its plantable cells, at their own height, painted from one canvas: a tint with a
     faint hatch, a bold border wherever the site meets open ground (dark at its outer side, so it reads on snow and sand
     as well as on the dark floors), the ring at the site's spot, and the letter (a plant mark on a one-site map) in the ring
     and stencilled by the ways in. Nothing is drawn off the site's cells, so nothing spills onto the ground round it. */
  /* The life on the walls and floors: what makes a lane look lived in, never anything you can hide behind or that stops
     a shot. Everything here hugs a wall (a hand-breadth proud at most) or lies flat on the ground, and keeps clear of the
     lane bands, the door signs and the site letters. Placed from a hash of the map and the cell, so every player on
     every device sees the same walls.
       on the walls: pipe runs with brackets, downpipes, wall lamps (neon tubes on the city and station maps), electrical boxes, vent grilles; and by theme icicles, vines, life rings or cloth banners
       on the floor: drain grates along the walls, manhole covers, and stains */
  function detail(W, TH, sh, roofed, signs) {
    const t = MAP.theme, seed = [...MAP.k].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const hash = (...v) => { let h = seed ^ 0x9e3779b9; for (const q of v) { h = Math.imul(h ^ (q | 0), 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; } return (h >>> 0) / 4294967296; };
    const G = new THREE.Group(); W.add(G);
    // one material per colour: bake() merges the props by material, so a fresh material for every prop left each one its own draw
    const MC = new Map(), memo = (k, mk) => MC.get(k) || (MC.set(k, mk()), MC.get(k));
    const lam = (c, o) => memo('l' + c + JSON.stringify(o || {}), () => new THREE.MeshLambertMaterial(Object.assign({ color: LC(c) }, o || {}))), bas = c => memo('b' + c, () => new THREE.MeshBasicMaterial({ color: LC(c) }));
    const PAL = { harbor: ['#6f7780', '#b8452e'], neon: ['#3a3f58', '#ff3ea5'], snow: ['#7d8a96', '#c0392b'], desert: ['#8a6a48', '#c9862e'], jungle: ['#5a6448', '#8a6a40'], lava: ['#5a4a44', '#ff6a1a'], space: ['#9aa6ba', '#38e8ff'], autumn: ['#5a4a3a', '#a0522d'] }[t] || ['#6f7780', '#b8452e'];
    const pipeM = lam(PAL[0]), bracketM = lam('#2e3136'), boxM = lam('#8f9690'), boxDoorM = lam('#a9b0aa'), lampM = lam('#30343a'), bulbM = lam(t === 'lava' ? '#e8b48a' : '#f2e8cc');
    const neon = t === 'neon' || t === 'space', NEON = t === 'space' ? ['#38e8ff', '#9ad8ff', '#ff8a3d'] : ['#ff3ea5', '#3df2ff', '#ffd23f', '#9a7cff'], neonM = NEON.map(c => lam(c));
    const put = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; G.add(o); return o; };
    // decals and glows: flat quads in one mesh per texture
    const quads = {}, quad = (key, cx, cy, cz, ux, uz, vx, vy, vz, w, h) => { const q = quads[key] || (quads[key] = { P: [], U: [], I: [] }), n = q.P.length / 3, hw = w / 2, hh = h / 2;
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) q.P.push(cx + ux * a * hw + vx * b * hh, cy + vy * b * hh, cz + uz * a * hw + vz * b * hh);
      q.U.push(0, 0, 1, 0, 1, 1, 0, 1); q.I.push(n, n + 1, n + 2, n, n + 2, n + 3); };
    const quadMesh = (key, mat, order) => { const q = quads[key]; if (!q) return; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(q.P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(q.U, 2)); g.setIndex(q.I); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.renderOrder = order || 1; W.add(m); };
    const decal = (map, o) => Object.assign(new THREE.MeshLambertMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide }), o || {});
    if (!X.detailT) X.detailT = {
      grate: canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#3a3c40'; g.fillRect(0, 0, w, h); g.fillStyle = '#121315'; for (let x = 10; x < w - 8; x += 12) g.fillRect(x, 8, 6, h - 16); g.strokeStyle = '#6a6e74'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); }),
      vent: canvasTex(128, 80, (g, w, h) => { g.fillStyle = '#7d8288'; g.fillRect(0, 0, w, h); for (let y = 10; y < h - 8; y += 9) { g.fillStyle = '#2a2c30'; g.fillRect(8, y, w - 16, 5); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(8, y + 5, w - 16, 1.5); } g.strokeStyle = '#4a4e54'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); g.fillStyle = '#2a2c30'; for (const [x, y] of [[7, 7], [w - 7, 7], [7, h - 7], [w - 7, h - 7]]) { g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); } }),
      manhole: canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#4a4c50'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.strokeStyle = '#2a2b2e'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.stroke(); g.lineWidth = 3; for (let r = 14; r < 52; r += 12) { g.beginPath(); g.arc(64, 64, r, 0, 7); g.stroke(); } for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a * Math.PI / 4) * 52, 64 + Math.sin(a * Math.PI / 4) * 52); g.stroke(); } g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(56, 56, 30, 0, 7); g.fill(); }),
      stain: canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 10; i++) { const x = 64 + (Math.random() - .5) * 50, y = 64 + (Math.random() - .5) * 50, r = 12 + Math.random() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(60,52,40,.13)'); gr.addColorStop(1, 'rgba(60,52,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } }),
      vine: canvasTex(128, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let s = 0; s < 6; s++) { let x = 10 + Math.random() * (w - 20); g.strokeStyle = '#3d5a24'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 0); const len = h * (.45 + Math.random() * .55);
        for (let y = 0; y < len; y += 8) { x += (Math.random() - .5) * 6; g.lineTo(x, y); if (Math.random() < .55) { g.save(); g.fillStyle = Math.random() < .5 ? '#5a8a34' : '#4a7a2c'; g.translate(x, y); g.rotate((Math.random() - .5) * 2.4); g.beginPath(); g.ellipse(6, 0, 7, 3.6, 0, 0, 7); g.fill(); g.restore(); } } g.stroke(); } }),
      banner: canvasTex(64, 160, (g, w, h) => { const c = ['#b8452e', '#2f6f8f', '#c9862e', '#5a7a3a'][Math.floor(Math.random() * 4)]; g.fillStyle = c; g.fillRect(0, 0, w, h - 12); for (let x = 0; x < w; x += 8) { g.beginPath(); g.moveTo(x, h - 12); g.lineTo(x + 4, h); g.lineTo(x + 8, h - 12); g.fill(); }
        g.fillStyle = 'rgba(255,240,210,.85)'; g.fillRect(0, 16, w, 6); g.fillRect(0, h - 34, w, 6); g.save(); g.translate(w / 2, h / 2); g.rotate(Math.PI / 4); g.fillRect(-12, -12, 24, 24); g.restore(); g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 3, h); }),
    };
    const DT = X.detailT;
    const nearMark = (x, z, y0, y1) => { for (const m of X.wallMarks || []) if (Math.hypot(m[0] - x, m[1] - z) < 1.6 && y1 > m[2] - .9 && y0 < m[2] + .9) return true; for (const sg of signs) if (Math.hypot(sg.x - x, sg.z - z) < 1.9 && y1 > 3.0 && y0 < 3.7) return true; return false; };
    const open = (i, j) => { const k = idx(i, j); return k >= 0 && CH[k] <= .01 && '.ADoqr'.includes(SRC[j][i]); };
    // ---- the walls, face by face (a face of a wall cell that looks onto open, unroofed ground)
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      if (SRC[j][i] !== '#') continue; const k = idx(i, j); if (CH[k] < WALL_H - .01) continue;
      for (let e = 0; e < 4; e++) {
        const ni = i + (e === 0 ? 1 : e === 1 ? -1 : 0), nj = j + (e === 2 ? 1 : e === 3 ? -1 : 0); if (!open(ni, nj) || roofed[idx(ni, nj)]) continue;
        const nx = e === 0 ? 1 : e === 1 ? -1 : 0, nz = e === 2 ? 1 : e === 3 ? -1 : 0, ux = nz ? 1 : 0, uz = nx ? 1 : 0;   // u runs along the wall
        const fx = e === 0 ? (i + 1) * CS : e === 1 ? i * CS : (i + .5) * CS, fz = e === 2 ? (j + 1) * CS : e === 3 ? j * CS : (j + .5) * CS;   // the middle of the face, on the wall
        const line = nx ? i * 2 + (e === 0 ? 1 : 0) : j * 2 + (e === 2 ? 1 : 0), along = nx ? j : i, ry = Math.atan2(nx, nz);
        const at = (u, out) => [fx + ux * u + nx * out, fz + uz * u + nz * out];
        const site = SRC[nj][ni] === 'o' || SRC[nj][ni] === 'q' || SRC[nj][ni] === 'r';
        // a pipe run high on the wall: runs of a few cells, one height per run, a bracket every cell
        const run = Math.floor(along / 5), py = 4.35 + hash(line, e, run, 2) * .5;
        if (hash(line, e, run, 1) < .24 && !nearMark(fx, fz, py - .2, py + .2)) {
          const [x, z] = at(0, .13); put(new THREE.CylinderGeometry(.075, .075, CS + .02, 8), pipeM, x, py, z, ry).rotation.z = Math.PI / 2;
          const [bx, bz] = at(-CS / 2 + .3, .07); put(new THREE.BoxGeometry(.12, .2, .14), bracketM, bx, py, bz, ry);
          if (hash(line, e, run, 3) < .5) { const [x2, z2] = at(0, .13); put(new THREE.CylinderGeometry(.045, .045, CS + .02, 6), pipeM, x2, py + .22, z2, ry).rotation.z = Math.PI / 2; }
        }
        // a downpipe now and then, with a shoe at the bottom
        if (hash(i, j, e, 4) < .05 && !site) { const [x, z] = at(.45, .12); put(new THREE.CylinderGeometry(.06, .06, 5.6, 8), pipeM, x, 2.8, z); for (const y of [1.2, 3, 4.8]) { const [bx, bz] = at(.45, .06); put(new THREE.BoxGeometry(.16, .06, .12), bracketM, bx, y, bz, ry); }
          const [sx, sz] = at(.45, .2); put(new THREE.BoxGeometry(.14, .1, .2), pipeM, sx, .12, sz, ry); }
        // lamps every few cells, or neon on the city and the station
        if (along % 3 === 1 && hash(i, j, e, 5) < .6 && !nearMark(fx, fz, 2.9, 3.9)) {
          if (neon) { const m = neonM[Math.floor(hash(line, e, 6) * neonM.length)], [x, z] = at(0, .05); put(new THREE.BoxGeometry(1.5, .06, .06), m, x, 3.35, z, ry); const [bx, bz] = at(0, .03); put(new THREE.BoxGeometry(1.6, .14, .04), bracketM, bx, 3.35, bz, ry);
          }
          else { const [px, pz] = at(0, .04); put(new THREE.BoxGeometry(.22, .3, .08), lampM, px, 3.4, pz, ry); const [ax, az] = at(0, .16); put(new THREE.BoxGeometry(.06, .06, .24), lampM, ax, 3.42, az, ry);
            const [hx, hz] = at(0, .28); put(new THREE.CylinderGeometry(.1, .2, .16, 10, 1, true), lampM, hx, 3.38, hz); put(new THREE.SphereGeometry(.075, 8, 6), bulbM, hx, 3.31, hz); }
        }
        // an electrical box with its conduit
        if (hash(i, j, e, 7) < .07 && !site && !nearMark(fx, fz, 1.8, 4.3)) { const u = (hash(i, j, e, 8) - .5) * .8, [x, z] = at(u, .07); put(new THREE.BoxGeometry(.52, .7, .14), boxM, x, 2.25, z, ry); const [dx, dz] = at(u, .145); put(new THREE.BoxGeometry(.44, .6, .02), boxDoorM, dx, 2.25, dz, ry);
          const [cx, cz] = at(u + .15, .05); put(new THREE.CylinderGeometry(.03, .03, 1.7, 6), pipeM, cx, 3.45, cz); }
        // a vent grille low on the wall (between the skirting and the lane band)
        if (hash(i, j, e, 9) < .08) { const [x, z] = at((hash(i, j, e, 10) - .5) * .9, .012); quad('vent', x, .86, z, ux, uz, 0, 1, 0, .78, .48); }
        // by theme
        if (t === 'snow' && hash(i, j, e, 11) < .5) for (let n = 0; n < 4; n++) { const L = .25 + hash(i, j, e, 12 + n) * .7, [x, z] = at(-.8 + n * .5 + hash(i, j, n, 20) * .2, .07); put(new THREE.ConeGeometry(.06 + L * .04, L, 5), lam('#e6f2fb', { emissive: LC('#2a3a48') }), x, WALL_H - L / 2, z).rotation.x = Math.PI; }
        if (t === 'jungle' && hash(i, j, e, 13) < .32) { const L = 1.8 + hash(i, j, e, 14) * 2.2, [x, z] = at((hash(i, j, e, 15) - .5) * .6, .03); quad('vine', x, WALL_H - L / 2, z, ux, uz, 0, 1, 0, 1.2, L); }
        if (t === 'harbor' && hash(i, j, e, 16) < .045 && !site && !nearMark(fx, fz, 1.9, 2.8)) { const [x, z] = at(0, .1); const r = put(new THREE.TorusGeometry(.3, .075, 6, 16), lam('#e8622c'), x, 2.35, z, ry); for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + Math.PI / 4; put(new THREE.BoxGeometry(.09, .1, .17), lam('#f2efe6'), x + ux * Math.cos(a) * .3, 2.35 + Math.sin(a) * .3, z + uz * Math.cos(a) * .3, ry); } }
        if (t === 'autumn' && hash(i, j, e, 18) < .06 && !site && !nearMark(fx, fz, 2.6, 5.6)) { const [x, z] = at(0, .03); quad('banner', x, 4.25, z, ux, uz, 0, 1, 0, .9, 2.4); const [bx, bz] = at(0, .07); put(new THREE.CylinderGeometry(.035, .035, 1.2, 6), lam('#5a4026'), bx, 5.47, bz, ry).rotation.z = Math.PI / 2; }   // harvest banners
        if (t === 'desert' && hash(i, j, e, 17) < .07 && !nearMark(fx, fz, 2.6, 5.6)) { const [x, z] = at(0, .03); quad('banner', x, 4.25, z, ux, uz, 0, 1, 0, .9, 2.4); const [bx, bz] = at(0, .07); put(new THREE.CylinderGeometry(.035, .035, 1.2, 6), lam('#5a4026'), bx, 5.47, bz, ry).rotation.z = Math.PI / 2; }
      }
    }
    // ---- the floor: drains along the walls, manhole covers out in the open, stains
    for (let j = 1; j < GH - 1; j++) for (let i = 1; i < GW - 1; i++) {
      if (SRC[j][i] !== '.' || CH[idx(i, j)] > .01) continue; const cx = (i + .5) * CS, cz = (j + .5) * CS, y = hAt(cx, cz) + .02;
      const wall = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([di, dj]) => SRC[j + dj] && SRC[j + dj][i + di] === '#');
      if (wall && hash(i, j, 30) < .06) { const [di, dj] = wall;   // a grate lying along the wall, its long side with it
        if (dj) quad('grate', cx, y, cz + dj * .62, 1, 0, 0, 0, 1, .9, .42); else quad('grate', cx + di * .62, y, cz, 0, 1, 1, 0, 0, .9, .42); }
      else if (!wall && hash(i, j, 31) < .025 && !roofed[idx(i, j)]) quad('manhole', cx, y, cz, 1, 0, 0, 0, 1, 1.05, 1.05);
      else if (t === 'autumn' && wall && hash(i, j, 36) < .07) { const [di, dj] = wall, s = .26 + hash(i, j, 37) * .12; put(new THREE.SphereGeometry(s, 8, 6), lam('#e0782a'), cx + di * .7, y + s * .7, cz + dj * .7).scale.y = .75; }   // a pumpkin against the wall
      else if (hash(i, j, 32) < .018) { const s = 1.2 + hash(i, j, 33) * 1.2; quad('stain', cx + (hash(i, j, 34) - .5), y, cz + (hash(i, j, 35) - .5), 1, 0, 0, 0, 1, s, s); }
    }
    // the merged meshes
    bake(G, sh); G.traverse(o => { if (o.isMesh) o.receiveShadow = sh; });
    quadMesh('vent', decal(DT.vent, { transparent: false }), 1); quadMesh('grate', decal(DT.grate, { transparent: false }), 1); quadMesh('manhole', decal(DT.manhole, { alphaTest: .5 }), 1); quadMesh('stain', decal(DT.stain, { opacity: .8 }), 1);
    quadMesh('vine', new THREE.MeshLambertMaterial({ map: DT.vine, alphaTest: .4, side: THREE.DoubleSide }), 1); quadMesh('banner', new THREE.MeshLambertMaterial({ map: DT.banner, alphaTest: .4, side: THREE.DoubleSide }), 1);
  }
  function siteMarks(W, S, TH, sh) {
    const P = siteSpot(S), two = SITES.length > 1, COL = '255,138,61';
    let i0 = 1e9, j0 = 1e9, i1 = -1, j1 = -1; for (const [i, j] of P.cells) { i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i); j1 = Math.max(j1, j); }
    const nw = i1 - i0 + 1, nh = j1 - j0 + 1, ppc = Math.min(64, Math.floor(2048 / Math.max(nw, nh))), pot = n => 2 ** Math.ceil(Math.log2(n)), cw = pot(nw * ppc), chh = pot(nh * ppc), m = ppc / CS;
    const ox = i0 * CS, oz = j0 * CS, px = x => (x - ox) * m, pz = z => (z - oz) * m;
    const mark = (g, size, words) => {   // the letter, or on a one-site map the plant diamond (over SITE by the ways in)
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(28,18,10,.55)'; g.fillStyle = `rgba(${COL},.97)`;
      if (two) { g.font = `900 ${size}px "Chakra Petch", sans-serif`; g.lineWidth = size * .08; g.strokeText(S.k, 0, size * .06); g.fillText(S.k, 0, size * .06); return; }
      const cy = words ? -size * .14 : 0, hh = size * (words ? .28 : .34), hw = hh * .8, dia = () => { g.beginPath(); g.moveTo(0, cy - hh); g.lineTo(hw, cy); g.lineTo(0, cy + hh); g.lineTo(-hw, cy); g.closePath(); };
      dia(); g.fillStyle = `rgba(${COL},.3)`; g.fill(); g.lineWidth = size * .13; g.stroke(); g.strokeStyle = `rgba(${COL},.97)`; g.lineWidth = size * .09; g.stroke();
      if (words) { g.font = `900 ${size * .3}px "Chakra Petch", sans-serif`; g.lineWidth = size * .04; g.strokeStyle = 'rgba(28,18,10,.55)'; g.fillStyle = `rgba(${COL},.97)`; g.strokeText('SITE', 0, size * .34); g.fillText('SITE', 0, size * .34); }
    };
    const tex = canvasTex(cw, chh, g => {
      g.fillStyle = `rgba(${COL},.2)`; g.fillRect(0, 0, cw, chh);   // the whole canvas, so the colour holds up in the mipmaps
      g.strokeStyle = `rgba(${COL},.24)`; g.lineWidth = .22 * m; g.beginPath(); for (let d = -chh; d < cw; d += 1.2 * m) { g.moveTo(d, 0); g.lineTo(d + chh, chh); } g.stroke();
      // the border: each edge stroked along the cell line, so only its inner half lands on the site
      const edgePath = () => { g.beginPath(); for (const [i, j, e] of P.edges) { const x0 = i * CS, z0 = j * CS, x1 = x0 + CS, z1 = z0 + CS, s = e === 0 ? [x1, z0, x1, z1] : e === 1 ? [x0, z0, x0, z1] : e === 2 ? [x0, z1, x1, z1] : [x0, z0, x1, z0]; g.moveTo(px(s[0]), pz(s[1])); g.lineTo(px(s[2]), pz(s[3])); } };
      g.lineCap = 'square'; edgePath(); g.strokeStyle = 'rgba(28,18,10,.5)'; g.lineWidth = 1.44 * m; g.stroke();   // a dark rim on its inner side,
      edgePath(); g.strokeStyle = `rgba(${COL},.97)`; g.lineWidth = 1.24 * m; g.stroke(); edgePath(); g.strokeStyle = 'rgba(28,18,10,.65)'; g.lineWidth = .2 * m; g.stroke();   // the band, a dark line at the edge
      // the ring, its letter read from the attackers' side
      g.save(); g.translate(px(P.x), pz(P.z)); g.rotate(P.rot); const R = P.r * m;
      g.fillStyle = `rgba(${COL},.12)`; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(28,18,10,.45)'; g.lineWidth = .56 * m; g.beginPath(); g.arc(0, 0, R - .26 * m, 0, TAU); g.stroke();
      g.strokeStyle = `rgba(${COL},.97)`; g.lineWidth = .42 * m; g.beginPath(); g.arc(0, 0, R - .26 * m, 0, TAU); g.stroke();
      g.lineWidth = .16 * m; g.setLineDash([.55 * m, .4 * m]); g.beginPath(); g.arc(0, 0, R - .85 * m, 0, TAU); g.stroke(); g.setLineDash([]);
      mark(g, Math.min(2.8, P.r * .95) * m, false); g.restore();
      for (const L of P.lets) { g.save(); g.translate(px(L.x), pz(L.z)); g.rotate(L.rot); mark(g, 3.6 * m, true); g.restore(); }
    });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; X.siteTex.push(tex);
    const pos = [], uv = [], ix = [];
    for (const [i, j] of P.cells) {
      const y = hAt((i + .5) * CS, (j + .5) * CS) + .02, n = pos.length / 3, x0 = i * CS, z0 = j * CS, x1 = x0 + CS, z1 = z0 + CS;
      for (const [x, z] of [[x0, z0], [x0, z1], [x1, z1], [x1, z0]]) { pos.push(x, y, z); uv.push(px(x) / cw, 1 - pz(z) / chh); }
      ix.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(ix); geo.computeVertexNormals();
    // lit like paint (dimmer under the stronger suns, so it never washes out to the colour of the sand), with a glow that keeps it bright in shade and at night
    const alb = cl(.6 / ((TH.sun && TH.sun[1]) || 1.2), .3, .75);
    const mat = new THREE.MeshLambertMaterial({ map: tex, color: new THREE.Color(alb, alb, alb), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, emissive: new THREE.Color(1, 1, 1), emissiveMap: tex, emissiveIntensity: TH.glow ? .7 : .3 });
    // paint, so drawn first of everything see-through (it lies on the solid floor and writes no depth): smoke, fire, snares,
    // bullet marks and shadows over the site all draw on top of it, never under it
    const floor = new THREE.Mesh(geo, mat); floor.receiveShadow = sh; floor.renderOrder = -1; W.add(floor);
    if (!two) return;
    // big letters on the walls: walk out from the spot to the first wall each way (under a roof, low enough to show beneath it)
    const letT = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(255,138,61,.92)'; g.fillRect(18, 18, w - 36, h - 36); g.fillStyle = 'rgba(20,18,16,.92)'; g.font = '900 190px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(S.k, w / 2, h / 2 + 10); });
    const letM = new THREE.MeshBasicMaterial({ map: letT, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }); X.siteTex.push(letT);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let d = 1; d < 16; d += .5) { const x = P.x + dx * d, z = P.z + dz * d; if (chAt(Math.floor(x / CS), Math.floor(z / CS)) !== '#') continue;
        const fx = dx ? (dx > 0 ? Math.floor(x / CS) * CS : Math.floor(x / CS) * CS + CS) : x, fz = dz ? (dz > 0 ? Math.floor(z / CS) * CS : Math.floor(z / CS) * CS + CS) : z;
        const ceil = CEIL[idx(Math.floor((fx - dx * .5) / CS), Math.floor((fz - dz * .5) / CS))] || 0, y = ceil ? Math.min(3.6, ceil - 1) : 3.6;
        const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), letM); p.position.set(fx - dx * .02, y, fz - dz * .02); p.rotation.y = Math.atan2(-dx, -dz); W.add(p); (X.wallMarks || (X.wallMarks = [])).push([fx, fz, y]); break; }
    }
  }
  // scenery for the other maps: what you see over the walls
  function scenery(W0, TH) {
    // everything here stands still: it is built into one group, with one material per colour, and merged at the end into a
    // mesh per material (a forest of a hundred trees was three hundred draws, every frame)
    const W = new THREE.Group(); W0.add(W);
    const MC = new Map(), memo = (k, mk) => MC.get(k) || (MC.set(k, mk()), MC.get(k));
    const lam = (c, o) => memo('l' + c + JSON.stringify(o || {}), () => new THREE.MeshLambertMaterial(Object.assign({ color: LC(c) }, o))), bas = c => memo('b' + c, () => new THREE.MeshBasicMaterial({ color: LC(c) }));
    const put = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); W.add(o); return o; };
    try { sceneryIn(W, TH, lam, bas, put); } finally { W.traverse(o => { if (o.isMesh) o.material.userData.keepUV = true; }); bake(W, false); }
  }
  function sceneryIn(W, TH, lam, bas, put) {
    // scenery stands on rings round the map, pushed out on the bigger maps so none of it ends up inside the walls
    const ex = Math.max(0, MW / 2 - 32, (MH / 2 - 22) / .8), ring = (n, r0, r1, fn) => { for (let i = 0; i < n; i++) { const a = i / n * TAU + Math.random() * .2, r = r0 + ex + Math.random() * (r1 - r0); fn(MW / 2 + Math.cos(a) * r, MH / 2 + Math.sin(a) * r * .8, i); } };
    const floor = (c, o) => { const f = put(new THREE.PlaneGeometry(1400, 1400), lam(c, o), MW / 2, -.02, MH / 2); f.rotation.x = -Math.PI / 2; return f; };
    const t = MAP.theme; X.seaT = null;
    if (t === 'neon') {   // a city at night: towers with lit windows, signs on the tops
      floor('#1a1a26'); const winT = canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#10121c'; g.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) if (Math.random() < .45) { g.fillStyle = Math.random() < .5 ? '#ffd27a' : Math.random() < .5 ? '#7af0ff' : '#ff7ad8'; g.fillRect(x, y, 4, 4); } }); winT.wrapT = winT.wrapS = THREE.RepeatWrapping; winT.repeat.set(2, 3);
      const tower = new THREE.MeshBasicMaterial({ map: winT });
      ring(26, 70, 150, (x, z, i) => { const h = 30 + Math.random() * 70, w = 10 + Math.random() * 12; put(new THREE.BoxGeometry(w, h, w), tower, x, h / 2, z); put(new THREE.BoxGeometry(w * .8, 1.2, .4), bas(['#ff3ea5', '#3df2ff', '#ffd23f', '#7c5cff'][i % 4]), x, h + 1, z);
        if (i % 3 === 0) { put(new THREE.CylinderGeometry(1.4, 1.4, 2.4, 8), lam('#3a3448'), x + w * .25, h + 1.2, z + w * .2); } else { put(new THREE.BoxGeometry(w * .5, 3, w * .5), lam('#22202e'), x, h + 1.5, z); }   // a water tank, or a plant room
        put(new THREE.CylinderGeometry(.15, .15, 8, 4), lam('#22202e'), x - w * .3, h + 4, z - w * .3); put(new THREE.BoxGeometry(.6, .6, .6), bas('#ff3a3a'), x - w * .3, h + 8.2, z - w * .3); });   // an aerial with its warning light
      ring(5, 160, 220, (x, z) => { const h = 120 + Math.random() * 60; put(new THREE.BoxGeometry(14, h, 14), tower, x, h / 2, z); put(new THREE.ConeGeometry(7, 26, 4), lam('#2a2440'), x, h + 13, z).rotation.y = Math.PI / 4; put(new THREE.BoxGeometry(.8, .8, .8), bas('#ff3a3a'), x, h + 27, z); });   // a few spires over the rest
    } else if (t === 'snow') {   // snowfields, pines and white peaks
      floor('#f4f8fb'); const pine = lam('#24442e'), snowM = lam('#ffffff');
      ring(70, 45, 120, (x, z) => { const s = 1 + Math.random() * 1.6; put(new THREE.CylinderGeometry(.3 * s, .4 * s, 2 * s, 6), lam('#4a3626'), x, s, z);
        for (let k = 0; k < 3; k++) { const r = (2.6 - k * .7) * s, y = (3.2 + k * 2.1) * s; put(new THREE.ConeGeometry(r, 3.4 * s, 8), pine, x, y, z); put(new THREE.ConeGeometry(r * .62, 1.1 * s, 8), snowM, x, y + 1.25 * s, z); } });   // a pine in three tiers, snow on each
      ring(24, 40, 90, (x, z) => { const r = .8 + Math.random() * 2; const b = put(new THREE.DodecahedronGeometry(r, 0), lam('#8a96a4'), x, r * .3, z); b.scale.y = .6; put(new THREE.SphereGeometry(r * .8, 8, 5, 0, TAU, 0, Math.PI / 2), snowM, x, r * .45, z).scale.y = .4; });   // boulders under snow
      ring(10, 220, 300, (x, z) => { const h = 60 + Math.random() * 80; put(new THREE.ConeGeometry(h * .9, h, 6), lam('#b8c8d8'), x, h / 2, z); put(new THREE.ConeGeometry(h * .36, h * .4, 6), snowM, x, h * .8, z); });
    } else if (t === 'desert') {   // dunes, broken columns, a far pyramid of stone
      floor('#e8c992'); ring(30, 60, 200, (x, z) => { const d = put(new THREE.SphereGeometry(10 + Math.random() * 20, 12, 8), lam('#e2bf86'), x, -4, z); d.scale.y = .3; });
      ring(16, 40, 70, (x, z) => { const h = 4 + Math.random() * 10; put(new THREE.CylinderGeometry(1.1, 1.3, h, 10), lam('#d8b884'), x, h / 2, z); put(new THREE.BoxGeometry(2.6, .5, 2.6), lam('#d8b884'), x, h + .25, z); });   // broken columns, with their capitals
      ring(8, 120, 190, (x, z) => { const h = 18 + Math.random() * 22, r = 16 + Math.random() * 20; put(new THREE.CylinderGeometry(r * .92, r, h, 7), lam('#c08a58'), x, h / 2, z); put(new THREE.CylinderGeometry(r * .98, r * 1.35, h * .22, 7), lam('#c89462'), x, h * .11, z); });   // mesas: sheer sides, a little scree round their feet
      put(new THREE.ConeGeometry(60, 70, 4), lam('#d4ae74'), MW / 2 + 40, 35, -180).rotation.y = Math.PI / 4;
    } else if (t === 'jungle') {   // a wall of trees, broad canopies, vines of mist
      floor('#4f6a34'); ring(110, 40, 110, (x, z) => { const s = 1 + Math.random() * 1.8, gr = Math.random() < .5 ? '#2f6a2a' : '#3f8a34'; put(new THREE.CylinderGeometry(.5 * s, .8 * s, 10 * s, 7), lam('#5a4026'), x, 5 * s, z); const c = put(new THREE.SphereGeometry(4 * s, 9, 7), lam(gr), x, 11 * s, z); c.scale.y = .7;
        const c2 = put(new THREE.SphereGeometry(2.6 * s, 8, 6), lam(gr === '#2f6a2a' ? '#3f8a34' : '#4f9a3c'), x + (Math.random() - .5) * 3 * s, 13.4 * s, z + (Math.random() - .5) * 3 * s); c2.scale.y = .65; });   // a canopy in two tiers
      ring(14, 60, 120, (x, z) => { const s = 2.6 + Math.random(); put(new THREE.CylinderGeometry(.6 * s, 1 * s, 14 * s, 7), lam('#6a4c2e'), x, 7 * s, z); const c = put(new THREE.SphereGeometry(5 * s, 10, 7), lam('#2a5a26'), x, 15 * s, z); c.scale.y = .45; });   // emergent giants over the rest
      ring(60, 34, 60, (x, z) => { const s = .8 + Math.random() * .8; const f = put(new THREE.ConeGeometry(1.6 * s, 1.4 * s, 6), lam('#3a7a30'), x, .6 * s, z); f.rotation.x = Math.PI; });   // ferns at the forest's edge
    } else if (t === 'lava') {   // a glowing lava sea round the works, chimneys smoking into a red sky
      const lavaT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ff5a10'; g.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '60,10,0' : '255,210,80'},${.2 + Math.random() * .5})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 30, 4 + Math.random() * 14, Math.random() * 3, 0, 7); g.fill(); } });
      lavaT.wrapS = lavaT.wrapT = THREE.RepeatWrapping; lavaT.repeat.set(30, 30); const lv = put(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshBasicMaterial({ map: lavaT }), MW / 2, -1.2, MH / 2); lv.rotation.x = -Math.PI / 2; X.seaT = lavaT;
      ring(12, 50, 110, (x, z) => { const h = 30 + Math.random() * 30; put(new THREE.CylinderGeometry(2.2, 3, h, 10), lam('#3a3030'), x, h / 2, z); put(new THREE.CylinderGeometry(2.4, 2.4, 1.2, 10), bas('#ff7a2a'), x, h - 2, z); put(new THREE.CylinderGeometry(3.4, 3.4, 1.4, 10), lam('#2a2222'), x, h * .3, z); });
      ring(30, 40, 70, (x, z) => { const r = 1 + Math.random() * 3; const b = put(new THREE.DodecahedronGeometry(r, 0), lam('#2a2020'), x, 0, z); b.scale.y = .55; });   // cooled rock at the shore
    } else if (t === 'autumn') {   // a valley in autumn: orchard trees and woods in red, orange and gold, hay in the stubble, poplars on the skyline
      floor('#8a7a46'); const LEAF = ['#d2691e', '#b8321e', '#e0a030', '#a8641e'];
      ring(84, 38, 110, (x, z, i) => { const s = .9 + Math.random() * 1.4; put(new THREE.CylinderGeometry(.35 * s, .55 * s, 5 * s, 6), lam('#5a3e28'), x, 2.5 * s, z); const c = put(new THREE.SphereGeometry(3.4 * s, 8, 6), lam(LEAF[i % LEAF.length]), x, 6.4 * s, z); c.scale.y = .8; });
      ring(26, 34, 60, (x, z) => { const b = put(new THREE.CylinderGeometry(1.1, 1.1, 1.5, 10), lam('#d8b860'), x, 1.1, z); b.rotation.set(0, Math.random() * 3, Math.PI / 2); });   // round hay bales in the stubble
      ring(16, 120, 170, (x, z) => { const h = 14 + Math.random() * 8; put(new THREE.CylinderGeometry(.4, .6, h * .3, 5), lam('#5a3e28'), x, h * .15, z); put(new THREE.ConeGeometry(2.2, h, 7), lam('#e0a030'), x, h * .62, z); });   // poplars
    } else if (t === 'space') {   // a station deck over nothing: a planet, a ring of panels, guide lights
      const planet = put(new THREE.SphereGeometry(140, 32, 20), lam('#3a6ab8', { emissive: LC('#0a1a3a') }), MW / 2 - 120, -60, -320); planet.rotation.z = .4;
      const rg = put(new THREE.RingGeometry(170, 230, 48), new THREE.MeshBasicMaterial({ color: LC('#9ab0d8'), side: THREE.DoubleSide, transparent: true, opacity: .35 }), MW / 2 - 120, -60, -320); rg.rotation.x = 1.2;
      ring(30, 40, 60, (x, z, i) => { put(new THREE.BoxGeometry(6, .6, 6), lam('#8a96aa'), x, -.5, z); if (i % 2) put(new THREE.BoxGeometry(.4, .4, .4), bas('#38e8ff'), x, .1, z); });
      ring(8, 90, 150, (x, z, i) => { const len = 30 + Math.random() * 30, y = 6 + Math.random() * 20, a = Math.random() * TAU; const tr = put(new THREE.BoxGeometry(len, 1, 1), lam('#5a6680'), x, y, z); tr.rotation.y = a;
        for (let k = 0; k < 2; k++) { const d = (k - .5) * len * .5; const mo = put(new THREE.CylinderGeometry(2.4, 2.4, 9, 12), lam('#c8d0e0'), x + Math.cos(a) * d, y - 2.6, z - Math.sin(a) * d); mo.rotation.z = Math.PI / 2; mo.rotation.y = a; put(new THREE.BoxGeometry(.5, .5, .5), bas(k ? '#ff8a3d' : '#38e8ff'), x + Math.cos(a) * d, y + .8, z - Math.sin(a) * d); } });   // the station's other arms, hung with modules
    }
  }