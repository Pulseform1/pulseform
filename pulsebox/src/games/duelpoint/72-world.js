  /* ---------- 72 world: the mesh of Saltworks, generated from the map's cells ----------
     Only faces you could ever see are made: the ground of open cells, the tops of solids, and a side wherever a
     neighbour is lower. Textures are sized in metres so they never stretch, and corners are darkened in the vertex colours
     (which also puts the Tunnel in shade on phones, where there are no shadow maps). One mesh per material. */
  function buildWorld() {
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
      const ua = e < 2 ? a[1] : a[0], ub = e < 2 ? b[1] : b[0];
      quad(k, [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]], n, [uv(ua, y0), uv(ub, y0), uv(ub, y1), uv(ua, y1)], shade, tint);
    };
    const hex = c => { const v = parseInt(c.slice(1), 16); return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255].map(q => Math.pow(q, 2.2)); };
    const roofed = new Uint8Array(NC); for (const rf of ROOFS) for (let j = rf.r[1]; j <= rf.r[3]; j++) for (let i = rf.r[0]; i <= rf.r[2]; i++) roofed[idx(i, j)] = 1;
    const tall = (i, j) => { const k = idx(i, j); return k >= 0 && CH[k] >= 1 && !CAX[k] ? 1 : 0; };
    // how dark a grid corner is: darker the more solid cells meet there
    const corner = (ci, cj) => 1 - .13 * (tall(ci - 1, cj - 1) + tall(ci, cj - 1) + tall(ci - 1, cj) + tall(ci, cj));
    const GROUND_TINT = { pier: WHITE, yard: [1, .98, .93], site: [.9, .9, .9], tunnel: [.7, .7, .73], alley: [.8, .8, .83], gate: [1, .9, .74], sheds: [1, .9, .74] };
    const STEEL = ['#b5523f', '#2f8f8a', '#d6a23a', '#3d5a80', '#8a8f96'].map(hex);
    // containers that touch share a colour
    const group = new Int16Array(NC).fill(-1); let groups = 0;
    for (let k = 0; k < NC; k++) if (SRC[Math.floor(k / GW)][k % GW] === 'X' && group[k] < 0) { const st = [k]; group[k] = groups; while (st.length) { const q = st.pop(), qi = q % GW, qj = Math.floor(q / GW); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = idx(qi + di, qj + dj); if (nk >= 0 && group[nk] < 0 && chAt(qi + di, qj + dj) === 'X') { group[nk] = groups; st.push(nk); } } } groups++; }
    const uvWall = (u, y) => [u / 4, y / WALL_H], uvBox = (u, y) => [u / CS, y / BOX_H], uvCrate = (u, y) => [u / CS, y / CRATE_H], uvDock = (u, y) => [u / CS, y / DOCK_H], uvPlain = (u, y) => [u / 4, y / 4];

    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const c = SRC[j][i], k = j * GW + i, x0 = i * CS, z0 = j * CS, x1 = x0 + CS, z1 = z0 + CS, area = AREA[k] >= 0 ? AREAS[AREA[k]] : null, dim = roofed[k] ? .62 : 1;
      if ('.oAD'.includes(c)) {   // open ground
        const sd = [corner(i, j), corner(i, j + 1), corner(i + 1, j + 1), corner(i + 1, j)].map(s => s * dim);
        flat(area && area.k === 'pier' ? 'deck' : 'ground', x0, z0, x1, z1, 0, 1, 4, sd, area ? GROUND_TINT[area.k] : WHITE); continue;
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
      const top = CH[k], kind = c === '#' ? 'wall' : c === 'X' ? 'steel' : c === 'c' ? 'crate' : c === 'P' ? 'dock' : 'quay';
      const tint = kind === 'steel' ? STEEL[group[k] % STEEL.length] : kind === 'quay' ? [.86, .85, .82] : WHITE, uv = kind === 'wall' ? uvWall : kind === 'steel' ? uvBox : kind === 'crate' ? uvCrate : kind === 'dock' ? uvDock : uvPlain;
      const mat = kind === 'quay' ? 'ground' : kind;
      // the top
      if (kind === 'wall') flat('ground', x0, z0, x1, z1, top, 1, 4, [1, 1, 1, 1], [.62, .6, .57]);
      else if (kind === 'crate') quad('crate', [[x0, top, z0], [x0, top, z1], [x1, top, z1], [x1, top, z0]], [0, 1, 0], [[0, 0], [0, 1], [1, 1], [1, 0]], [1, 1, 1, 1]);
      else flat(kind === 'steel' ? 'steeltop' : 'ground', x0, z0, x1, z1, top, 1, kind === 'steel' ? CS : 4, [1, 1, 1, 1], kind === 'dock' ? [.88, .88, .86] : kind === 'steel' ? tint.map(q => q * .8) : tint);
      // the sides
      for (let e = 0; e < 4; e++) {
        const ni = i + (e === 0 ? 1 : e === 1 ? -1 : 0), nj = j + (e === 2 ? 1 : e === 3 ? -1 : 0), nk = idx(ni, nj);
        if (nk < 0 && c !== '~') continue;
        const nh = nk < 0 ? -1.4 : CH[nk]; if (nh >= top) continue;
        const d = nk >= 0 && roofed[nk] ? .62 : 1, lo = (nh <= .01 ? .78 : .92) * d;
        wallFace(mat, i, j, e, nh, top, uv, [lo, lo, d, d], tint);
        // the painted band that names the lane
        if (kind === 'wall' && nk >= 0 && nh <= .01 && AREA[nk] >= 0) wallFace('band', i, j, e, 1.28, 1.6, uvPlain, [d, d, d, d], hex(AREAS[AREA[nk]].col), .012);
        if (kind === 'dock' && nh <= .8) wallFace('band', i, j, e, top - .16, top, uvPlain, [1, 1, 1, 1], hex('#f2c230'), .012);
      }
    }
    // the Tunnel's roof: the underside you see, a top, and beams with lamps
    const lampM = new THREE.MeshBasicMaterial({ color: '#ffe2a8' }), beamM = new THREE.MeshLambertMaterial({ color: '#4a3b2c' });
    for (const rf of ROOFS) {
      const x0 = rf.r[0] * CS, z0 = rf.r[1] * CS, x1 = (rf.r[2] + 1) * CS, z1 = (rf.r[3] + 1) * CS;
      flat('roof', x0, z0, x1, z1, rf.h, -1, 2, [.8, .8, .8, .8]); flat('roof', x0, z0 - CS, x1, z1 + CS, rf.h + .3, 1, 2, [1, 1, 1, 1]);
      for (const xx of [x0, x1]) quad('roof', [[xx, rf.h, z0], [xx, rf.h, z1], [xx, rf.h + .3, z1], [xx, rf.h + .3, z0]], [xx === x0 ? -1 : 1, 0, 0], [[0, 0], [3, 0], [3, .15], [0, .15]], [.9, .9, .9, .9]);
      for (let x = x0 + 2; x < x1; x += 4) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(.22, .26, z1 - z0), beamM); beam.position.set(x, rf.h - .13, (z0 + z1) / 2); X.scene.add(beam);
        if ((x - x0 - 2) % 8 === 0) { const lamp = new THREE.Mesh(new THREE.BoxGeometry(.5, .08, .2), lampM); lamp.position.set(x, rf.h - .31, (z0 + z1) / 2); X.scene.add(lamp); if (sh) { const pl = new THREE.PointLight('#ffd9a0', .9, 11, 1.6); pl.position.set(x, rf.h - .5, (z0 + z1) / 2); X.scene.add(pl); } }
      }
    }
    // doorways: the wall carries on above them, with the name of where the door leads painted over it
    const signs = [];
    for (const d of DOORS) {
      const x0 = d[0] * CS, z0 = d[1] * CS, x1 = (d[2] + 1) * CS, z1 = (d[3] + 1) * CS, across = d[1] === d[3];   // across: a door in a wall that runs east-west
      flat('wall', x0, z0, x1, z1, DOOR_H, -1, 4, [.6, .6, .6, .6]);
      const faces = across ? [[[x0, z0], [x1, z0], [0, 0, -1], 0, -1], [[x0, z1], [x1, z1], [0, 0, 1], 0, 1]] : [[[x0, z0], [x0, z1], [-1, 0, 0], -1, 0], [[x1, z0], [x1, z1], [1, 0, 0], 1, 0]];
      for (const [a, b, n, di, dj] of faces) {
        const ua = across ? a[0] : a[1], ub = across ? b[0] : b[1];
        quad('wall', [[a[0], DOOR_H, a[1]], [b[0], DOOR_H, b[1]], [b[0], WALL_H, b[1]], [a[0], WALL_H, a[1]]], n, [uvWall(ua, DOOR_H), uvWall(ub, DOOR_H), uvWall(ub, WALL_H), uvWall(ua, WALL_H)], [1, 1, 1, 1]);
        // seen from this side, the door leads to the area on the other side
        const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, to = areaAt(mx - n[0] * 3, mz - n[2] * 3); if (to) signs.push({ x: mx + n[0] * .02, z: mz + n[2] * .02, ry: Math.atan2(n[0], n[2]), a: to });
      }
    }
    // textures
    const T = {
      wall: canvasTex(512, 512, (g, w, h) => {
        grain(g, w, h, '#d6ccb6', .09, 12000);
        g.fillStyle = 'rgba(70,60,45,.13)'; for (let yy = 0; yy < h; yy += 43) g.fillRect(0, yy, w, 2);   // courses of block showing through the wash
        for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,252,240,${.05 + Math.random() * .1})`; g.fillRect(Math.random() * w, Math.random() * h * .8, 30 + Math.random() * 110, 12 + Math.random() * 40); }
        g.fillStyle = 'rgba(95,82,62,.5)'; g.fillRect(0, 0, w, 9); g.fillStyle = 'rgba(60,50,38,.5)'; g.fillRect(0, 9, w, 3);
        for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(120,105,80,${.02 + Math.random() * .04})`; g.fillRect(0, Math.random() * h, w, 2 + Math.random() * 10); }
        for (let i = 0; i < 16; i++) { const x = Math.random() * w, l = 60 + Math.random() * 200, gr = g.createLinearGradient(0, 0, 0, l); gr.addColorStop(0, 'rgba(90,80,60,.16)'); gr.addColorStop(1, 'rgba(90,80,60,0)'); g.fillStyle = gr; g.fillRect(x, 0, 4 + Math.random() * 14, l); }
        const dg = g.createLinearGradient(0, h * .8, 0, h); dg.addColorStop(0, 'rgba(150,135,105,0)'); dg.addColorStop(.35, 'rgba(150,135,105,.75)'); dg.addColorStop(1, 'rgba(110,98,78,.95)'); g.fillStyle = dg; g.fillRect(0, h * .8, w, h * .2);
        g.strokeStyle = 'rgba(60,50,40,.3)'; g.lineWidth = 1; for (let i = 0; i < 5; i++) { let x = Math.random() * w, y = Math.random() * h * .7; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (Math.random() - .5) * 30; y += 12 + Math.random() * 22; g.lineTo(x, y); } g.stroke(); }
      }),
      ground: canvasTex(512, 512, (g, w, h) => {
        grain(g, w, h, '#b8b2a6', .11, 14000);
        for (let i = 0; i < 22; i++) { g.fillStyle = `rgba(60,52,40,${.04 + Math.random() * .06})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 18 + Math.random() * 60, 10 + Math.random() * 36, Math.random() * 3, 0, 7); g.fill(); }
        for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${.1 + Math.random() * .25})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
        g.strokeStyle = 'rgba(40,36,30,.42)'; g.lineWidth = 3; for (const q of [0, 256]) { g.beginPath(); g.moveTo(q + 1, 0); g.lineTo(q + 1, h); g.moveTo(0, q + 1); g.lineTo(w, q + 1); g.stroke(); }
      }),
      deck: canvasTex(512, 512, (g, w, h) => {
        for (let r = 0; r < 8; r++) { const v = 118 + Math.random() * 34; g.fillStyle = `rgb(${v + 28},${v},${v - 34})`; g.fillRect(0, r * 64, w, 64); for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(60,38,18,${.05 + Math.random() * .1})`; g.fillRect(Math.random() * w, r * 64 + Math.random() * 64, 40 + Math.random() * 160, 1 + Math.random() * 2); }
          g.fillStyle = 'rgba(30,20,10,.75)'; g.fillRect(0, r * 64, w, 3); const off = (r % 2) * 128 + 60; for (const x of [off, off + 256]) { g.fillRect(x % w, r * 64, 3, 64); g.fillStyle = 'rgba(20,14,8,.8)'; for (const dx of [-10, 12]) for (const dy of [14, 50]) { g.beginPath(); g.arc((x + dx + w) % w, r * 64 + dy, 2.2, 0, 7); g.fill(); } g.fillStyle = 'rgba(30,20,10,.75)'; } }
      }),
      steel: canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = '#d2d2d2'; g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 32) { const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, 'rgba(0,0,0,.28)'); gr.addColorStop(.3, 'rgba(255,255,255,.14)'); gr.addColorStop(.6, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.28)'); g.fillStyle = gr; g.fillRect(x, 0, 32, h); }
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 0, w, 12); g.fillRect(0, h - 14, w, 14);
        for (let i = 0; i < 14; i++) { const x = Math.random() * w, l = 30 + Math.random() * 120, gr = g.createLinearGradient(0, 12, 0, 12 + l); gr.addColorStop(0, 'rgba(90,45,20,.35)'); gr.addColorStop(1, 'rgba(90,45,20,0)'); g.fillStyle = gr; g.fillRect(x, 12, 3 + Math.random() * 8, l); }
      }),
      steeltop: canvasTex(128, 128, (g, w, h) => { grain(g, w, h, '#c4c4c4', .1, 1500); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); }),
      crate: canvasTex(256, 256, (g, w, h) => {
        grain(g, w, h, '#b08552', .12, 2500); for (let r = 0; r < 8; r++) { g.fillStyle = 'rgba(60,35,15,.4)'; g.fillRect(0, r * 32, w, 3); }
        g.strokeStyle = '#6f4d2a'; g.lineWidth = 22; g.strokeRect(11, 11, w - 22, h - 22); g.lineWidth = 18; g.beginPath(); g.moveTo(16, 16); g.lineTo(w - 16, h - 16); g.stroke();
        g.fillStyle = 'rgba(20,14,8,.7)'; for (const [x, y] of [[14, 14], [w - 14, 14], [14, h - 14], [w - 14, h - 14]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
      }),
      dock: canvasTex(256, 256, (g, w, h) => { grain(g, w, h, '#a9a49a', .12, 4000); for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(50,44,36,${.05 + Math.random() * .08})`; g.fillRect(Math.random() * w, 40 + Math.random() * 200, 20 + Math.random() * 60, 4 + Math.random() * 30); } }),
      roof: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#6a6d72'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(0,0,0,.4)'); gr.addColorStop(.5, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); } }),
    };
    X.tex = T;
    for (const k in bags) {
      const b = bags[k], geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3)); geo.setIndex(b.i);
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: T[k] || null, vertexColors: true })); m.castShadow = sh && k !== 'band' && k !== 'deck'; m.receiveShadow = sh; X.scene.add(m);
    }
    // the site: a painted ring on the ground
    const ringT = canvasTex(512, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.translate(w / 2, h / 2); g.strokeStyle = 'rgba(255,138,61,.95)'; g.lineWidth = 16; g.beginPath(); g.arc(0, 0, 226, 0, TAU); g.stroke();
      g.lineWidth = 6; g.setLineDash([26, 20]); g.beginPath(); g.arc(0, 0, 196, 0, TAU); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(255,138,61,.1)'; g.beginPath(); g.arc(0, 0, 226, 0, TAU); g.fill();
      g.lineWidth = 12; g.beginPath(); g.moveTo(0, -70); g.lineTo(62, 0); g.lineTo(0, 70); g.lineTo(-62, 0); g.closePath(); g.stroke();
    }); ringT.wrapS = ringT.wrapT = THREE.ClampToEdgeWrapping;
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 10.4), new THREE.MeshBasicMaterial({ map: ringT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); ring.rotation.x = -Math.PI / 2; ring.position.set(41, .02, 21); X.scene.add(ring);
    // door signs
    const signMat = {};
    for (const s of signs) {
      const m = signMat[s.a.k] || (signMat[s.a.k] = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, map: (() => { const t = canvasTex(256, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = s.a.col; g.fillRect(0, 8, 14, 48); g.font = '700 46px "Chakra Petch", sans-serif'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(40,38,34,.82)'; g.fillText(s.a.n.toUpperCase(), 26, 34); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; })() }));
      const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .65), m); p.position.set(s.x, 3.35, s.z); p.rotation.y = s.ry; X.scene.add(p);
    }
    // beyond the sea wall: water, a jetty with a boat, a lighthouse; and two cranes over the east wall
    const lam = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o)), box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); X.scene.add(o); return o; };
    const seaT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#1d7f88'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(190,240,240,${.08 + Math.random() * .2})`; g.fillRect(Math.random() * w, Math.random() * h, 10 + Math.random() * 40, 1.5); } }, [70, 40]);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 800), lam('#ffffff', { map: seaT })); sea.rotation.x = -Math.PI / 2; sea.position.set(MW / 2, -1.4, -398); X.scene.add(sea); X.seaT = seaT;
    const wood = lam('#8a6a48'), dark = lam('#3a3f48');
    box(3, .25, 20, wood, 21, .55, -10); for (let z = -2; z > -20; z -= 4.4) for (const x of [19.7, 22.3]) box(.3, 2.4, .3, dark, x, -.4, z);
    box(7, 1.3, 2.6, lam('#a23b34'), 27.5, -.9, -12); box(2.4, 1.3, 1.9, lam('#efeae0'), 26, .35, -12); box(.12, 2.2, .12, dark, 29, .9, -12);
    const lh = new THREE.Group(); for (let s = 0; s < 5; s++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(2.1 - s * .22, 2.32 - s * .22, 4, 16), lam(s % 2 ? '#c8463c' : '#f2efe6')); seg.position.y = 2 + s * 4; lh.add(seg); }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 1.8, 12), new THREE.MeshBasicMaterial({ color: '#fff3c4' })); cap.position.y = 20.9; lh.add(cap); const hat = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.6, 12), dark); hat.position.y = 22.6; lh.add(hat); lh.position.set(-22, -1.4, -78); X.scene.add(lh);
    for (const z of [10, 34]) { box(.9, 30, .9, dark, 72, 15, z - 3); box(.9, 30, .9, dark, 72, 15, z + 3); box(1.2, 1.2, 7.4, dark, 72, 29.4, z); box(26, 1.1, 1.1, lam('#c9862e'), 62, 30.4, z); box(.2, 9, .2, dark, 52, 25.5, z); }
  }
