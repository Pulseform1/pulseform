  /* ---------- 42 forest: The King's Wood built from the shared map, in a bright toy-like style: rolling green hills, round
     trees and bushes, clean bricks and planks (the shapes that block arrows are the shapes you see) ---------- */
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  // merge indexed or plain geometries into one (position, normal, uv, color)
  function merge(list) {
    let nv = 0, ni = 0; const parts = list.map(g => { const ix = g.index ? g.index.array : null, n = g.attributes.position.count; const r = { g, n, ix, ni: ix ? ix.length : n }; nv += n; ni += r.ni; return r; });
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), C = new Float32Array(nv * 3).fill(1), I = new Uint32Array(ni);
    let ov = 0, oi = 0;
    for (const { g, n, ix } of parts) {
      P.set(g.attributes.position.array, ov * 3); if (g.attributes.normal) N.set(g.attributes.normal.array, ov * 3); if (g.attributes.uv) U.set(g.attributes.uv.array, ov * 2); if (g.attributes.color) C.set(g.attributes.color.array, ov * 3);
      if (ix) for (let k = 0; k < ix.length; k++) I[oi + k] = ix[k] + ov; else for (let k = 0; k < n; k++) I[oi + k] = k + ov;
      oi += ix ? ix.length : n; ov += n;
    }
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('uv', new THREE.BufferAttribute(U, 2)); out.setAttribute('color', new THREE.BufferAttribute(C, 3)); out.setIndex(new THREE.BufferAttribute(I, 1));
    return out;
  }
  const tint = (g, fn) => { const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const [r, gg, b] = fn(p.getX(i), p.getY(i), p.getZ(i), n ? n.getY(i) : 0); c[i * 3] = r; c[i * 3 + 1] = gg; c[i * 3 + 2] = b; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
  // a box with its texture scaled to the world (s metres per repeat), so stone courses stay the same size everywhere
  function worldBox(w, h, d, s) {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / s, uv.getY(i) * dims[f][1] / s); }
    return g;
  }
  // routes people actually take: kept clear of ferns and worn into the floor
  const PATHS = [];
  { const half = [[[70, 118], [70, 104], [69, 90], [70, 79]], [[62, 116], [48, 104], [36, 92], [28, 84]], [[78, 116], [92, 106], [104, 92], [110, 74], [113, 66]], [[48, 104], [56, 90], [60, 80]], [[92, 106], [84, 92], [80, 80]], [[36, 92], [22, 100], [14, 112]]];
    for (const pth of half) { PATHS.push(pth); PATHS.push(pth.map(([x, z]) => [140 - x, 140 - z])); } }
  function pathDist(x, z) {
    let best = 1e9;
    for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) { const [ax, az] = p[i], [bx, bz] = p[i + 1], dx = bx - ax, dz = bz - az, t = cl(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1), d = Math.hypot(x - ax - dx * t, z - az - dz * t); if (d < best) best = d; }
    return best;
  }
  const visH = (x, z) => { if (x < -1500) return STAGE.y; const cx = cl(x, 0, 140), cz = cl(z, 0, 140), out = Math.hypot(x - cx, z - cz); return W.terrainH(cx, cz) + out * .38; };
  const treeNear = (x, z, r) => W.TREES.some(t => Math.hypot(t.x - x, t.z - z) < t.r + r);
  const boxNear = (x, z, m) => W.BOXES.some(b => { const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; return Math.abs(lx) < b.hx + m && Math.abs(lz) < b.hz + m; });

  // a ball of leaves: a smooth sphere, a little lumpy, lighter on top and darker underneath
  function leafBall(R, r, cx, cy, cz, sx, sy, sz, base) {
    const g = new THREE.SphereGeometry(r, X.low ? 8 : 10, X.low ? 6 : 7), p = g.attributes.position, sd = R() * 50;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + .06 * (noiseAt(x * 1.1 + sd, y * 1.1 + z, 1) - .5) * 2; p.setXYZ(i, x * k * sx, y * k * sy, z * k * sz); }
    g.translate(cx, cy, cz); g.computeVertexNormals();
    const c = new THREE.Color(base).convertSRGBToLinear(), lift = .9 + R() * .2;
    tint(g, (x, y) => { const k = cl((y - cy) / (r * sy) * .5 + .5, 0, 1); const f = lp(.55, 1.08, k) * lift; return [c.r * f, c.g * f, c.b * f]; });
    return g;
  }
  const LEAF_COLS = ['#4caf3c', '#5cbc43', '#3f9e3a', '#6ac24a', '#47a83f'], PINE_COLS = ['#2f8a4a', '#2a7d44', '#368f52'];
  // one tree: a tapered trunk and a crown of balls (or, now and then, a stack of cones). Returns [trunk geos, crown geos].
  function treeGeos(t, ground) {
    const R = W.rng((t.seed || 5) + Math.round(t.x * 31 + t.z * 17)), H = t.h, r = t.r, tall = t.kind === 'tall', pine = !tall && t.kind !== 'split' && R() < .22, trunkH = H * (pine ? .3 : tall ? .6 : .52), tr = [], cr = [];
    const lean = [t.lean ? t.lean[0] : 0, t.lean ? t.lean[1] : 0];
    const trunk = new THREE.CylinderGeometry(r * .72, r * 1.08, trunkH + .6, 8, 2); trunk.translate(0, trunkH / 2 - .3, 0);
    { const p = trunk.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + lean[0] * y); p.setZ(i, p.getZ(i) + lean[1] * y); } }
    trunk.translate(t.x, ground, t.z); trunk.computeVertexNormals(); tint(trunk, (x, y, z, ny) => { const k = .85 + .15 * Math.sin(Math.atan2(z - t.z, x - t.x) * 3 + y); return [k, k, k]; }); tr.push(trunk);
    const top = [t.x + lean[0] * trunkH, ground + trunkH, t.z + lean[1] * trunkH];
    if (pine) {
      const col = pick2(R, PINE_COLS); for (let k = 0; k < 3; k++) { const rad = H * (.26 - k * .06), hh = H * .3, g = new THREE.ConeGeometry(rad, hh, 9, 1); g.translate(top[0], top[1] + k * H * .2 + hh / 2 - H * .04, top[2]); g.computeVertexNormals();
        const c = new THREE.Color(col).convertSRGBToLinear(); tint(g, (x, y, z, ny) => { const f = ny < -.5 ? .55 : .85 + k * .1 + R() * .02; return [c.r * f, c.g * f, c.b * f]; }); cr.push(g); }
      return [tr, cr];
    }
    if (tall) {   // a wide, flat-bottomed crown about seven metres across
      const col = pick2(R, ['#3f9e3a', '#47a83f', '#368f36', '#4caf3c']), main = 3.1 + R() * .5;
      cr.push(leafBall(R, main, top[0], top[1] + main * .55, top[2], 1.15, .62, 1.15, col));
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + R() * .8, rr = main * (.62 + R() * .18), d = main * (.75 + R() * .25); cr.push(leafBall(R, rr, top[0] + Math.cos(a) * d, top[1] + main * (.15 + R() * .35), top[2] + Math.sin(a) * d, 1.1, .7, 1.1, col)); }
      cr.push(leafBall(R, main * .6, top[0] + (R() - .5), top[1] + main * 1.05, top[2] + (R() - .5), 1, .8, 1, col));
      for (let k = 0; k < 3; k++) { const a = R() * TAU, b = new THREE.CylinderGeometry(r * .2, r * .38, main * 1.1, 6); b.translate(0, main * .55, 0); b.rotateZ(1); b.rotateY(a); b.translate(top[0], top[1] - trunkH * .1, top[2]); b.computeVertexNormals(); tr.push(b); }
      return [tr, cr];
    }
    const big = t.kind === 'split' ? 1.25 : 1, main = (H * .3 + .4) * big, col = pick2(R, LEAF_COLS);
    cr.push(leafBall(R, main, top[0], top[1] + main * .62, top[2], 1, .9, 1, col));
    const n = t.kind === 'oak' || t.kind === 'split' ? 4 : 2;
    for (let k = 0; k < n; k++) { const a = k / n * TAU + R() * 1.2, rr = main * (.55 + R() * .2), d = main * .72; cr.push(leafBall(R, rr, top[0] + Math.cos(a) * d, top[1] + main * (.25 + R() * .5), top[2] + Math.sin(a) * d, 1, .88, 1, col)); }
    if (R() < .4) cr.push(leafBall(R, main * .5, top[0] + (R() - .5) * main * .4, top[1] + main * 1.25, top[2] + (R() - .5) * main * .4, 1, .9, 1, col));
    // a couple of stubby branches poking out of the trunk
    for (let k = 0; k < 2; k++) { const a = R() * TAU, b = new THREE.CylinderGeometry(r * .18, r * .3, main * .7, 6); b.translate(0, main * .35, 0); b.rotateZ(.9); b.rotateY(a); b.translate(top[0], top[1] - trunkH * .15, top[2]); b.computeVertexNormals(); tr.push(b); }
    return [tr, cr];
  }
  const pick2 = (R, a) => a[Math.floor(R() * a.length)];

  function buildForest() {
    const S = X.scene, q = X.q;
    const std2 = o => new THREE.MeshStandardMaterial(Object.assign({ roughness: .78, metalness: 0 }, o));
    // The big merged scenery (trees, bushes, walls, the ground) is cut into tiles of the wood, so three.js can skip the tiles
    // behind you and, for the sun's shadow, everything outside the shadow box round you. One mesh for the whole wood was drawn
    // in full every frame, twice where there are shadows.
    // Each tile is a draw call of its own, so only the heavy layers are cut up, into big tiles (a 3 x 3 grid over the wood); the
    // light ones (walls, rocks, logs, pebbles) stay whole.
    const TILE = 66, tileKey = (x, z, t) => t ? Math.floor((x + 26) / t) + ',' + Math.floor((z + 26) / t) : '0';
    const tiled = (list, mat, cast, recv, t = TILE) => {
      const groups = new Map();
      for (const g of list) { if (!g.boundingBox) g.computeBoundingBox(); const bb = g.boundingBox, k = tileKey((bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2, t); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(g); }
      const out = []; for (const gs of groups.values()) { const m = new THREE.Mesh(merge(gs), mat); m.castShadow = !!cast; m.receiveShadow = !!recv; S.add(m); out.push(m); }
      list.forEach(g => g.dispose()); return out;
    };
    // the same for instanced bits (flowers, pebbles, wall-top blocks): one instanced mesh per tile, each with a bounding sphere that
    // really holds its instances (three.js otherwise culls an instanced mesh by its single shape at the world's corner)
    const tiledInst = (geo, mat, items, cast, recv, t = TILE) => {
      const groups = new Map(), v = new THREE.Vector3(); if (!geo.boundingSphere) geo.computeBoundingSphere();
      for (const it of items) { v.setFromMatrixPosition(it.m); const k = tileKey(v.x, v.z, t); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); }
      const out = [];
      for (const its of groups.values()) {
        const g = geo.clone(), box = new THREE.Box3(), sv = new THREE.Vector3(); let rmax = 0;
        for (const it of its) { box.expandByPoint(v.setFromMatrixPosition(it.m)); sv.setFromMatrixScale(it.m); rmax = Math.max(rmax, Math.max(sv.x, sv.y, sv.z)); }
        const sph = box.getBoundingSphere(new THREE.Sphere()); sph.radius += (geo.boundingSphere.radius + geo.boundingSphere.center.length()) * rmax; g.boundingSphere = sph;
        const m = new THREE.InstancedMesh(g, mat, its.length); its.forEach((it, i) => { m.setMatrixAt(i, it.m); if (it.c) m.setColorAt(i, it.c); });
        m.castShadow = !!cast; m.receiveShadow = !!recv; S.add(m); out.push(m);
      }
      return out;
    };
    // ---- ground: rolling grassy hills coloured by height and slope, sandy creek banks, worn dirt paths
    {
      const ext = 26, size = 140 + ext * 2, seg = q === 'low' ? 140 : 220, geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2); geo.translate(70, 0, 70);
      const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, visH(p.getX(i), p.getZ(i))); geo.computeVertexNormals();
      const n = geo.attributes.normal, col = new Float32Array(p.count * 3);
      // where the crowns meet overhead the grass lies in shade (painted in, so it reads even without shadows)
      const SH = 192, SO = -26, shade = new Float32Array(SH * SH);
      for (const t of W.TREES) { if (t.kind !== 'tall' && t.kind !== 'split') continue; const R0 = 4.6; for (let gz = Math.floor(t.z - R0); gz <= t.z + R0; gz++) for (let gx = Math.floor(t.x - R0); gx <= t.x + R0; gx++) { const i = gx - SO, j = gz - SO; if (i < 0 || j < 0 || i >= SH || j >= SH) continue; const d = Math.hypot(gx - t.x, gz - t.z), v = 1 - sm(cl((d - 2.2) / 2.4, 0, 1)); if (v > shade[j * SH + i]) shade[j * SH + i] = v; } }
      const shadeAt = (x, z) => { const i = cl(Math.round(x - SO), 0, SH - 1), j = cl(Math.round(z - SO), 0, SH - 1); return shade[j * SH + i]; };
      const SHADEC = LC('#2f6f2a'), G1 = LC('#47a334'), G2 = LC('#62b83f'), G3 = LC('#378a2c'), DIRT = LC('#b98a55'), SAND = LC('#dcc98c'), SLOPE = LC('#7f8f44'), BED = LC('#9a9178');
      const c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ny = n.getY(i), nz1 = noiseAt(x, z, .045), nz2 = noiseAt(x + 40, z - 9, .16);
        c.copy(G1).lerp(G2, cl((y - .5) / 4, 0, 1) * .8).lerp(G3, cl(nz1 * 1.6 - .6, 0, 1) * .55); c.multiplyScalar(.94 + nz2 * .12);
        c.lerp(SLOPE, cl((.93 - ny) * 4, 0, .6));
        const pd = pathDist(x, z); if (pd < 2) c.lerp(DIRT, (1 - sm(cl((pd - .5) / 1.5, 0, 1))) * .85);
        const shd = shadeAt(x, z); if (shd > 0) { c.lerp(SHADEC, shd * .45); c.multiplyScalar(1 - shd * .22); }
        const cd = W.creekDist(x, z); if (cd < W.CREEK_W + 3) { const k = 1 - sm(cl((cd - W.CREEK_W + .3) / 3, 0, 1)); c.lerp(cd < W.CREEK_W ? BED : SAND, k); }
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const map = TEX.grassTile; map.repeat.set(size / 7, size / 7);
      // one vertex buffer, a separate list of triangles per tile (no seams in the lighting where the tiles meet)
      const gm = std2({ map, vertexColors: true, roughness: .92 }), cellW = size / seg, per = Math.max(1, Math.round(TILE / cellW)), idx = geo.index.array, P = geo.attributes.position; X.ground = [];
      for (let ty = 0; ty < seg; ty += per) for (let tx = 0; tx < seg; tx += per) {
        const ix = [], box = new THREE.Box3(), v = new THREE.Vector3();
        for (let iy = ty; iy < Math.min(seg, ty + per); iy++) for (let ix0 = tx; ix0 < Math.min(seg, tx + per); ix0++) { const c = (iy * seg + ix0) * 6; for (let k = 0; k < 6; k++) { const vi = idx[c + k]; ix.push(vi); box.expandByPoint(v.fromBufferAttribute(P, vi)); } }
        const g = new THREE.BufferGeometry(); for (const a of ['position', 'normal', 'uv', 'color']) g.setAttribute(a, geo.attributes[a]); g.setIndex(ix); g.boundingSphere = box.getBoundingSphere(new THREE.Sphere()); g.boundingBox = box;
        const m = new THREE.Mesh(g, gm); m.receiveShadow = true; S.add(m); X.ground.push(m);
      }
    }
    // ---- the creek: bright, clear blue water
    {
      const N = 150, half = W.CREEK_W + 1.5, pos = [], uv = [], idx = [];
      for (let k = 0; k <= N; k++) { const x = -20 + k * 180 / N, zc = W.creekZ(cl(x, 0, 140)), dz = .3 * Math.cos((x - 70) * .06), L = Math.hypot(1, dz), nx = -dz / L, nz = 1 / L, y = W.waterY(cl(x, 0, 140));
        pos.push(x + nx * half, y, zc + nz * half, x - nx * half, y, zc - nz * half); uv.push(k * .6, 0, k * .6, 1); if (k) { const a = (k - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const rip = paint(128, 128, (x, y) => { const v = tile(x, y, 128, 128, .08) * .6 + tile(x, y, 128, 128, .2) * .4; return [v * 255, v * 255, v * 255]; });
      const rn = normalFrom(rip, 4);
      const mat = std2({ color: LC('#3aa9e6'), roughness: .08, metalness: .1, transparent: true, opacity: .8, normalMap: rn, normalScale: new THREE.Vector2(.35, .35), side: THREE.DoubleSide });   // both sides: the strip is wound facing down, which hid the creek from above
      const m = new THREE.Mesh(g, mat); m.renderOrder = 2; S.add(m); X.water = { m, rn };
    }
    // ---- trees: the map's trunks (the ones arrows hit) plus a ring of the same outside the edge, so the wood closes in
    {
      const trunks = [], crowns = [], R = W.rng(77), extra = [];
      for (let k = 0; k < (q === 'low' ? 60 : 110); k++) { let x, z; if (R() < .5) { x = R() * 180 - 20; z = R() < .5 ? -18 + R() * 20 : 138 + R() * 20; } else { z = R() * 180 - 20; x = R() < .5 ? -18 + R() * 20 : 138 + R() * 20; }
        if (x > 3 && x < 137 && z > 3 && z < 137) continue; extra.push({ x, z, r: .35 + R() * .2, h: 6 + R() * 4, lean: [0, 0], kind: R() < .3 ? 'oak' : 'oak2', seed: (R() * 1e6) | 0 }); }
      for (const t of [...W.TREES, ...extra]) { const [a, b] = treeGeos(t, visH(t.x, t.z)); trunks.push(...a); crowns.push(...b); }
      X.trunks = tiled(trunks, std2({ color: LC('#8a5a33'), vertexColors: true, roughness: .85 }), true, true);
      X.leaves = tiled(crowns, windify(std2({ vertexColors: true, roughness: .7 }), .25), true, true);
    }
    // ---- bushes (from the map) with a few flowers; small rocks and flower patches on the grass
    {
      const R = W.rng(4242), parts = [], flowers = [];
      for (const b of W.BUSHES) {
        const y = visH(b.x, b.z), col = pick2(R, ['#3f9b3a', '#4aa83d', '#358f36', '#52b142']), n = 2 + (R() * 2 | 0);
        for (let k = 0; k < n; k++) { const a = R() * TAU, d = k ? b.r * .55 : 0, rr = b.r * (k ? .7 + R() * .2 : 1); parts.push(leafBall(R, rr, b.x + Math.cos(a) * d, y + rr * .55, b.z + Math.sin(a) * d, 1.1, .78, 1.1, col)); }
        if (R() < .35) { const fc = pick2(R, ['#ff5f9e', '#ffd23a', '#ff7a3a', '#c06bff', '#ffffff']); for (let k = 0; k < 6; k++) { const a = R() * TAU, u = R() * .9 + .1; flowers.push([b.x + Math.cos(a) * b.r * .9 * u, y + b.r * (.55 + .45 * Math.sqrt(1 - u * u)) * .95, b.z + Math.sin(a) * b.r * .9 * u, fc]); } }
      }
      X.bushes = tiled(parts, windify(std2({ vertexColors: true, roughness: .72 }), .15), true, true);
      // flower patches on open grass
      const free = (x, z) => W.creekDist(x, z) > W.CREEK_W + .8 && pathDist(x, z) > 1.4 && !treeNear(x, z, .6) && !boxNear(x, z, .5);
      for (let k = 0; k < (q === 'low' ? 60 : 110); k++) { const x = 8 + R() * 124, z = 8 + R() * 124; if (!free(x, z)) continue; const fc = pick2(R, ['#ff5f9e', '#ffd23a', '#ff7a3a', '#c06bff', '#ff4a4a']); for (let j = 0; j < 5; j++) { const fx = x + (R() - .5) * 1.6, fz = z + (R() - .5) * 1.6; flowers.push([fx, visH(fx, fz) + .22 + R() * .08, fz, fc, 1]); } }
      if (flowers.length) {
        // a flower is tiny: five low-poly petals, a centre and a stem (about 50 triangles; there are hundreds of them)
        const fg = merge([...[0, 1, 2, 3, 4].map(k => { const g = new THREE.OctahedronGeometry(.048, 0); g.scale(1, .42, 1); g.translate(Math.cos(k * TAU / 5) * .055, 0, Math.sin(k * TAU / 5) * .055); return g; }), (() => { const g = new THREE.OctahedronGeometry(.036, 0); g.scale(1, .6, 1); g.translate(0, .01, 0); tint(g, () => [1.6, 1.3, .2]); return g; })(), (() => { const g = new THREE.CylinderGeometry(.01, .012, .24, 3, 1, true); g.translate(0, -.12, 0); tint(g, () => [.3, .7, .25]); return g; })()]);
        tiledInst(fg, std2({ vertexColors: true, roughness: .6 }), flowers.map(([x, y, z, fc]) => ({ m: new THREE.Matrix4().makeTranslation(x, y, z), c: new THREE.Color(fc).convertSRGBToLinear() })));
      }
      // pebbles
      const pg = new THREE.DodecahedronGeometry(.22, 0), Q = new THREE.Quaternion(), peb = [];
      for (let k = 0; k < 400 && peb.length < 90; k++) { const x = 8 + R() * 124, z = 8 + R() * 124; if (!free(x, z)) continue; const s = .6 + R() * 1.4; Q.setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3)); peb.push({ m: new THREE.Matrix4().compose(V3(x, visH(x, z), z), Q, V3(s, s * .6, s)) }); }
      tiledInst(pg, std2({ color: LC('#a2a6aa'), roughness: .8, flatShading: true }), peb, false, true, 0);
    }
    // ---- stone: walls, the tower and the bridge in clean bricks with a broken top; rocks; logs; planks
    {
      const wallG = [], deckG = [], woodG = [], blocks = [], rocks = [], logs = [];
      const R = W.rng(31);
      for (const b of W.BOXES) {
        const w = b.hx * 2, d = b.hz * 2, h = b.y1 - b.y0, M4 = new THREE.Matrix4().makeRotationY(b.a).setPosition(b.x, 0, b.z);
        if (b.kind === 'rock') { rocks.push(b); continue; }
        if (b.kind === 'log') { logs.push(b); continue; }
        if (b.mat === 'wood') { const g = worldBox(w, h, d, 2); g.translate(0, (b.y0 + b.y1) / 2, 0); g.applyMatrix4(M4); woodG.push(g); continue; }
        if (b.kind === 'deck') { const g = worldBox(w, h, d, 2.4); g.translate(0, (b.y0 + b.y1) / 2, 0); g.applyMatrix4(M4); deckG.push(g); continue; }
        const jag = b.kind === 'parapet' ? .18 : Math.min(.5, h * .28), body = h - jag;
        const g = worldBox(w, body, d, 2.4); g.translate(0, b.y0 + body / 2, 0); g.applyMatrix4(M4); wallG.push(g);
        const along = b.hx >= b.hz, L = along ? w : d, T = along ? d : w, n = Math.max(1, Math.round(L / .6));
        for (let k = 0; k < n; k++) {
          const u = -L / 2 + (k + .5) * L / n, hh = jag * (b.kind === 'parapet' ? 1 : R() < .25 ? 0 : .5 + R() * .5); if (hh < .05) continue;
          const lx = along ? u : 0, lz = along ? 0 : u, [wx, wz] = [b.x + lx * b.c + lz * b.s, b.z - lx * b.s + lz * b.c];
          blocks.push({ x: wx, y: b.y0 + body + hh / 2, z: wz, sx: (along ? L / n : T) * .94, sy: hh, sz: (along ? T : L / n) * .94, a: b.a });
        }
      }
      const stoneM = std2({ map: TEX.brick, roughness: .82, color: LC('#bdb8ad') });
      for (const [list, mat] of [[wallG, stoneM], [deckG, stoneM], [woodG, std2({ map: TEX.plankB, roughness: .8 })]]) if (list.length) tiled(list, mat, true, true, 0);
      const Q = new THREE.Quaternion();
      if (blocks.length) tiledInst(new THREE.BoxGeometry(1, 1, 1), std2({ color: LC('#aeaaa0'), roughness: .8 }), blocks.map(k => { Q.setFromEuler(new THREE.Euler(0, k.a, 0)); return { m: new THREE.Matrix4().compose(V3(k.x, k.y, k.z), Q, V3(k.sx, k.sy, k.sz)), c: new THREE.Color().setScalar(.88 + R() * .14) }; }), true, true, 0);
      // rocks: chunky faceted boulders, a lick of moss on top
      const rg = []; for (const b of rocks) { const g = new THREE.DodecahedronGeometry(1, 1), p = g.attributes.position, sd = R() * 10; for (let i = 0; i < p.count; i++) { const v = V3(p.getX(i), p.getY(i), p.getZ(i)), n = 1 + .16 * (noiseAt(v.x * 2 + sd, v.y * 2 + v.z, 1) - .5) * 2; p.setXYZ(i, v.x * n, v.y * n, v.z * n); }
        g.scale(b.hx * 1.1, (b.y1 - b.y0) / 2, b.hz * 1.1); g.rotateY(b.a); g.translate(b.x, (b.y0 + b.y1) / 2, b.z); g.computeVertexNormals(); tint(g, (x, y, z, ny) => ny > .6 ? [.62, .88, .5] : [1, 1, 1]); rg.push(g); }
      if (rg.length) tiled(rg, std2({ color: LC('#9da3a8'), roughness: .85, vertexColors: true, flatShading: true }), true, true, 0);
      // logs: brown bark with pale cut ends
      const lg = []; for (const b of logs) { const r = (b.y1 - b.y0) * .44, g = new THREE.CylinderGeometry(r, r, b.hx * 2, q === 'low' ? 10 : 14, 1); g.rotateZ(Math.PI / 2);
        tint(g, (x, y, z, ny) => [1, 1, 1]); const nn = g.attributes.normal, cc = g.attributes.color; for (let i = 0; i < nn.count; i++) if (Math.abs(nn.getX(i)) > .9) cc.setXYZ(i, 2.2, 1.9, 1.35);
        g.rotateY(b.a); g.translate(b.x, b.y0 + r * 1.05, b.z); lg.push(g); }
      if (lg.length) tiled(lg, std2({ color: LC('#7c5131'), roughness: .85, vertexColors: true }), true, true, 0);
    }
    // ---- the bridge's arch underneath (stone faces that curve up from the banks, leaving the creek open under the middle),
    // the tower's beams, camp banners, the zone stones
    {
      const br = W.PROPS.find(p => p.t === 'bridge'), stoneM = std2({ map: TEX.brick, roughness: .82, color: LC('#b5b0a5') }), parts = [];
      if (br) for (const sx of [-1.45, 1.45]) for (let k = 0; k <= 16; k++) { const u = k / 16, z = br.z - br.len / 2 + u * br.len, top = W.groundAt(br.x, z, 50) - .45, bot = lp(top - .42, top - 3.4, Math.pow(Math.abs(u - .5) * 2, 2.2)); const g = worldBox(.4, Math.max(.2, top - Math.max(bot, visH(br.x + sx, z) - .3)), br.len / 16 + .05, 2.4); g.translate(br.x + sx, (top + Math.max(bot, visH(br.x + sx, z) - .3)) / 2, z); parts.push(g); }
      const tw = W.PROPS.find(p => p.t === 'tower');
      if (tw) { for (let k = 0; k < 3; k++) { const g = new THREE.BoxGeometry(.2, .24, 2 * tw.s + .6); g.translate(tw.x - 1.5 + k * 1.6, tw.top - .4 - k * .3, tw.z); parts.push(g); } }
      if (parts.length) { const m = new THREE.Mesh(merge(parts), stoneM); m.castShadow = m.receiveShadow = true; S.add(m); }
      // banners at the two camps
      for (const [x, z, team] of [[55.8, 125.5, 0], [84.2, 125.5, 0], [84.2, 14.5, 1], [55.8, 14.5, 1]]) {
        const [c, g] = cvs(128, 256); g.fillStyle = W.TEAMS[team].col; g.fillRect(0, 0, 128, 256); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, 0, 128, 14); g.fillStyle = '#fffaf0';
        g.beginPath(); if (team === 0) { g.moveTo(64, 60); g.quadraticCurveTo(104, 110, 64, 190); g.quadraticCurveTo(24, 110, 64, 60); } else { g.moveTo(64, 60); g.lineTo(100, 150); g.lineTo(64, 190); g.lineTo(28, 150); } g.fill();
        g.beginPath(); g.moveTo(0, 256); g.lineTo(64, 214); g.lineTo(128, 256); g.globalCompositeOperation = 'destination-out'; g.fill(); g.globalCompositeOperation = 'source-over';
        const y = visH(x, z), pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, 4.2, 8), std2({ color: LC('#6b4a2c') })); pole.position.set(x, y + 2.1, z); pole.castShadow = true; S.add(pole);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), std2({ color: LC('#ffd34a'), metalness: .3, roughness: .35 })); knob.position.set(x, y + 4.25, z); S.add(knob);
        const fg = new THREE.PlaneGeometry(.9, 1.8, 6, 6); fg.translate(.46, -.9, 0); const flag = new THREE.Mesh(fg, windify(std2({ map: tex(c, { clamp: true }), side: THREE.DoubleSide, alphaTest: .5, roughness: .9 }), 3)); flag.position.set(x + .05, y + 4, z); flag.rotation.y = team ? Math.PI : 0; flag.castShadow = true; S.add(flag);
      }
      // the marked clearing for overtime: a ring of standing stones around the bridge
      const ring = []; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, x = W.ZONE.x + Math.cos(a) * W.ZONE.r, z = W.ZONE.z + Math.sin(a) * W.ZONE.r; if (W.creekDist(x, z) < W.CREEK_W + .8 || W.blocked(x, W.terrainH(x, z), z)) continue; const g = new THREE.BoxGeometry(.34, 1.2 + art() * .4, .24); g.translate(x, visH(x, z) + .5, z); ring.push(g); }
      if (ring.length) { const m = new THREE.Mesh(merge(ring), std2({ color: LC('#8e949a'), roughness: .8 })); m.castShadow = true; S.add(m); }
      const zg = new THREE.CylinderGeometry(W.ZONE.r, W.ZONE.r, 6, 48, 1, true), zm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { col: { value: new THREE.Color('#ffd34a') }, t: { value: 0 }, a: { value: 0 } },
        vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
        fragmentShader: 'uniform vec3 col; uniform float t, a; varying vec2 vU; void main(){ float f = pow(1. - vU.y, 2.2) * (.55 + .45 * sin(vU.x * 60. + t * 3.)); gl_FragColor = vec4(col, f * a); }' });
      const zone = new THREE.Mesh(zg, zm); zone.position.set(W.ZONE.x, W.terrainH(W.ZONE.x, W.ZONE.z) + 1.6, W.ZONE.z); zone.visible = false; S.add(zone); X.zone = zone;
    }
    // ---- targets: a painted bullseye on a post (the ground), on a trunk (the trees), or hanging under a balloon (the sky).
    // The face looks toward the middle of the wood; a flying one turns slowly as it circles. All forty are drawn as a handful
    // of instanced meshes (one per part), not forty little groups: that alone saves a few hundred draw calls a frame.
    {
      const c = document.createElement('canvas'); c.width = c.height = 256; const g2 = c.getContext('2d');
      [['#f7f1e3', 124], ['#d6452f', 104], ['#f7f1e3', 82], ['#d6452f', 60], ['#f7f1e3', 38], ['#f2c230', 18]].forEach(([col, r]) => { g2.fillStyle = col; g2.beginPath(); g2.arc(128, 128, r, 0, Math.PI * 2); g2.fill(); });
      g2.strokeStyle = 'rgba(60,30,10,.45)'; g2.lineWidth = 6; g2.beginPath(); g2.arc(128, 128, 124, 0, Math.PI * 2); g2.stroke();
      const face = new THREE.CanvasTexture(c); face.encoding = THREE.sRGBEncoding; face.anisotropy = 4;
      // a touch of glow from the paint itself, so they catch the eye without a sprite each
      const faceM = new THREE.MeshStandardMaterial({ map: face, emissiveMap: face, emissive: new THREE.Color('#5a4a30'), roughness: .7 }), rimM = std2({ color: LC('#7a4a26') }), postM = std2({ color: LC('#8a5a33') });
      const BAL = ['#ff6b6b', '#4fc3f7', '#ffd23a', '#7bd88f', '#c792ea', '#ff9f43'];
      const T = W.TARGETS, nT = T.length, ground = T.filter(k => k.kind === 'ground'), fly = T.filter(k => k.kind === 'fly');
      const inst = (geo, mat, n, shadow) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.frustumCulled = false; m.castShadow = !!shadow; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); X.scene.add(m); return m; };
      const discG = new THREE.CylinderGeometry(1, 1, .09, 28); discG.rotateX(Math.PI / 2);
      const postG = new THREE.CylinderGeometry(.06, .08, 1, 8); postG.translate(0, -.5, 0);
      const footG = new THREE.CylinderGeometry(.28, .32, .12, 10);
      const balG = merge([new THREE.SphereGeometry(.42, 14, 10), (() => { const k = new THREE.ConeGeometry(.06, .1, 6); k.rotateX(Math.PI); k.translate(0, -.44, 0); return k; })()]);
      const strG = new THREE.CylinderGeometry(.008, .008, 1, 3); strG.translate(0, .5, 0);
      const M = { disc: inst(discG, [rimM, faceM, faceM], nT, true), post: inst(postG, postM, ground.length, true), foot: inst(footG, postM, ground.length),
        bal: inst(balG, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .35 }), fly.length, true), str: inst(strG, new THREE.MeshBasicMaterial({ color: '#e8dcc0' }), fly.length) };
      X.tgts = T.map((k, i) => {
        const o = { k, i, in: 1, r: k.kind === 'fly' ? W.TARGET.rFly * .9 : W.TARGET.r, p: [k.x, k.y, k.z], bal: null, col: null };
        if (k.kind === 'ground') { o.gi = ground.indexOf(k); o.h = k.y - visH(k.x, k.z) + .1; }
        if (k.kind === 'fly') { o.fi = fly.indexOf(k); const cc = LC(BAL[i % BAL.length]); o.col = cc.toArray(); M.bal.setColorAt(o.fi, cc); o.bal = [k.x, k.y + 1.55, k.z]; }
        return o;
      });
      if (M.bal.instanceColor) M.bal.instanceColor.needsUpdate = true;
      const G = new THREE.Matrix4(), L = new THREE.Matrix4(), O = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sv = new THREE.Vector3();
      const put = (m, i, local) => { O.multiplyMatrices(G, local); m.setMatrixAt(i, O); };
      // each frame: the flying ones circle on the room's clock; a broken one is gone until it stands again, then pops back in
      X.tgtUpdate = (dt, st) => {
        for (const o of X.tgts) {
          const k = o.k, i = o.i, up = !!CL.tg[i];
          if (!up) { o.in = 0; M.disc.setMatrixAt(i, Z); if (o.gi != null) { M.post.setMatrixAt(o.gi, Z); M.foot.setMatrixAt(o.gi, Z); } if (o.fi != null) { M.bal.setMatrixAt(o.fi, Z); M.str.setMatrixAt(o.fi, Z); } continue; }
          const ein = o.in = Math.min(1, o.in + dt * 2.2), sc = Math.max(.01, ein * ein * (3 - 2 * ein) * (1 + .22 * Math.sin(ein * Math.PI)));
          let yaw = k.face || 0; if (k.kind === 'fly') { const pp = W.targetPos(k, st); o.p = pp; yaw += st * .5 * k.dir; }
          G.compose(v.set(o.p[0], o.p[1], o.p[2]), q.setFromEuler(e.set(0, yaw, 0)), sv.set(sc, sc, sc));
          put(M.disc, i, L.makeScale(o.r, o.r, 1));
          if (o.gi != null) { put(M.post, o.gi, L.makeScale(1, o.h, 1).setPosition(0, 0, -.08)); put(M.foot, o.gi, L.makeTranslation(0, -o.h + .15, -.08)); }
          if (o.fi != null) { const by = 1.55 + Math.sin(st * 2.1 + i) * .06; put(M.bal, o.fi, L.makeScale(1, 1.18, 1).setPosition(0, by, 0)); put(M.str, o.fi, L.makeScale(1, by - .52 - o.r, 1).setPosition(0, o.r, 0));
            O.multiplyMatrices(G, L.makeTranslation(0, by, 0)); v.setFromMatrixPosition(O); o.bal = [v.x, v.y, v.z]; }
        }
        for (const m of Object.values(M)) m.instanceMatrix.needsUpdate = true;
      };
      X.tgtMesh = M;
    }
  }
