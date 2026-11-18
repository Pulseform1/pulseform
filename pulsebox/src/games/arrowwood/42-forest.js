  /* ---------- 42 forest: The King's Wood built from the shared map (shapes that block arrows are the shapes you see) ---------- */
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
  const visH = (x, z) => { const cx = cl(x, 0, 140), cz = cl(z, 0, 140), out = Math.hypot(x - cx, z - cz); return W.terrainH(cx, cz) + out * .38; };
  const treeNear = (x, z, r) => W.TREES.some(t => Math.hypot(t.x - x, t.z - z) < t.r + r);
  const boxNear = (x, z, m) => W.BOXES.some(b => { const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; return Math.abs(lx) < b.hx + m && Math.abs(lz) < b.hz + m; });

  function buildForest() {
    const S = X.scene, q = X.q, dens = q === 'low' ? .5 : q === 'high' ? 1.35 : 1;
    // ---- ground: a painted map of the whole wood (paths, moss, mud, the creek bed) with leaf litter detail on top
    {
      const ext = 22, size = 140 + ext * 2, seg = q === 'low' ? 130 : 210, geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2); geo.translate(70, 0, 70);
      const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, visH(p.getX(i), p.getZ(i))); geo.computeVertexNormals();
      const R = q === 'low' ? 512 : 1024, img = paint(R, R, (px, py) => {
        const x = -ext + (px + .5) / R * size, z = -ext + (py + .5) / R * size, cd = W.creekDist(x, z), n = noiseAt(x, z, .08), n2 = noiseAt(x + 50, z, .3), pd = pathDist(x, z);
        let c = n > .5 ? [76, 84, 44] : [92, 74, 50];   // moss or leaf litter
        c = c.map((v, i) => v * (.82 + n2 * .35));
        const tr = W.TREES.reduce((m, t) => Math.min(m, Math.hypot(t.x - x, t.z - z) - t.r), 99); if (tr < 3) { const k = 1 - tr / 3; c = c.map((v, i) => lp(v, [56, 64, 34][i], k * .6) * (1 - k * .25)); }
        if (pd < 2.2) { const k = 1 - sm(cl((pd - .6) / 1.6, 0, 1)); c = c.map((v, i) => lp(v, [122, 104, 78][i] * (.9 + n2 * .2), k * .85)); }
        if (cd < W.CREEK_W + 3) { const k = 1 - sm(cl((cd - W.CREEK_W + .5) / 3.5, 0, 1)); c = c.map((v, i) => lp(v, cd < W.CREEK_W ? [88, 84, 72][i] * (.8 + n2 * .4) : [70, 60, 44][i], k)); }
        for (const a of [[70, 124, 11], [70, 16, 11]]) { const d = Math.hypot(x - a[0], z - a[1]); if (d < a[2]) c = c.map((v, i) => lp(v, [104, 112, 58][i] * (.85 + n2 * .3), (1 - d / a[2]) * .5)); }
        return c;
      });
      const map = tex(img, { clamp: true }), mat = std({ map, roughness: .96, metalness: 0 });
      const detail = TEX.floor; mat.onBeforeCompile = sh => { sh.uniforms.uDetail = { value: detail }; sh.fragmentShader = 'uniform sampler2D uDetail;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= texture2D(uDetail, vUv * 52.).rgb * 1.32;'); };
      const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; S.add(m); X.ground = m;
    }
    // ---- the creek: clear brown-green water over the stony bed
    {
      const pts = [], N = 150, half = W.CREEK_W + 1.5;
      const pos = [], uv = [], idx = [];
      for (let k = 0; k <= N; k++) { const x = -20 + k * 180 / N, zc = W.creekZ(cl(x, 0, 140)), dz = .3 * Math.cos((x - 70) * .06), L = Math.hypot(1, dz), nx = -dz / L, nz = 1 / L, y = W.waterY(cl(x, 0, 140));
        pos.push(x + nx * half, y, zc + nz * half, x - nx * half, y, zc - nz * half); uv.push(k * .6, 0, k * .6, 1); if (k) { const a = (k - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const rip = paint(128, 128, (x, y) => { const v = tile(x, y, 128, 128, .08) * .6 + tile(x, y, 128, 128, .2) * .4; return [v * 255, v * 255, v * 255]; });
      const rn = normalFrom(rip, 5); rn.repeat.set(1, 1);
      const mat = std({ color: LC('#3e5a4c'), roughness: .12, metalness: .05, transparent: true, opacity: .8, normalMap: rn, normalScale: new THREE.Vector2(.5, .5) });
      const m = new THREE.Mesh(g, mat); m.renderOrder = 2; S.add(m); X.water = { m, rn };
    }
    // ---- trees: bark trunks with flared mossy roots and limbs (one mesh), crowns of leaf cards (instanced, swaying)
    {
      const trunks = [], leaves = [], R = W.rng(77);
      const extra = []; for (let k = 0; k < (q === 'low' ? 70 : 130); k++) { const a = R() * TAU, side = R(); let x, z; if (side < .5) { x = R() * 176 - 18; z = R() < .5 ? -16 + R() * 20 : 136 + R() * 20; } else { z = R() * 176 - 18; x = R() < .5 ? -16 + R() * 20 : 136 + R() * 20; } if (x > 4 && x < 136 && z > 4 && z < 136) continue; extra.push({ x, z, r: .5 + R() * .45, h: 13 + R() * 7, lean: [(R() - .5) * .1, (R() - .5) * .1], kind: 'oak', seed: k * 13, vis: true }); }
      for (const t of [...W.TREES, ...extra]) {
        const Rt = W.rng((t.seed || 5) + Math.round(t.x * 31 + t.z * 17)), H = t.h, r = t.r, g0 = visH(t.x, t.z), crown = H * (t.kind === 'split' ? .42 : .55 + Rt() * .1);
        const prof = []; for (let k = 0; k <= 14; k++) { const y = -.8 + (crown + .8) * k / 14, f = 1 + 1.2 * Math.exp(-Math.max(0, y) * 2.4), rr = r * f * (1 - .35 * cl(y / crown, 0, 1)); prof.push(new THREE.Vector2(Math.max(.05, rr), y)); }
        const seg = q === 'low' ? 8 : 14, geo = new THREE.LatheGeometry(prof, seg), p = geo.attributes.position, uvA = geo.attributes.uv, ph = Rt() * TAU;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z);
          const root = 1 + .55 * Math.pow(Math.max(0, Math.sin(a * 4 + ph)), 3) * Math.exp(-Math.max(0, y) * 1.6), bump = 1 + .06 * Math.sin(a * 7 + y * 1.1 + ph) + .05 * Math.sin(y * 2.3 + ph);
          const k = rr * root * bump / Math.max(.001, rr), lean = Math.pow(Math.max(0, y) / H, 1.4) * H;
          p.setXYZ(i, t.x + x * k + t.lean[0] * lean, g0 + y, t.z + z * k + t.lean[1] * lean);
          uvA.setXY(i, uvA.getX(i) * Math.max(1, Math.round(r * 4)), y / 2.4);
        }
        geo.computeVertexNormals();
        tint(geo, (x, y, z, ny) => { const yy = y - g0, mo = cl(1.4 - yy * .55, 0, 1) * (.55 + .45 * Math.max(0, Math.sin(Math.atan2(z - t.z, x - t.x) + 1.2))); return [lp(1, .62, mo), lp(1, .78, mo), lp(1, .48, mo)]; });
        trunks.push(geo);
        // limbs: from the top of the trunk, out and up; leaf clusters gather at their ends and through the crown
        const top = V3(t.x + t.lean[0] * H * Math.pow(crown / H, 1.4), g0 + crown, t.z + t.lean[1] * H * Math.pow(crown / H, 1.4)), ends = [];
        const nb = t.kind === 'split' ? 6 : 4 + Math.floor(Rt() * 3);
        for (let b = 0; b < nb; b++) {
          const a = b / nb * TAU + Rt() * .8, up = .55 + Rt() * .5, len = H * (.28 + Rt() * .14), dir = V3(Math.cos(a) * (1 - up * .5), up, Math.sin(a) * (1 - up * .5)).normalize();
          const end = top.clone().addScaledVector(dir, len), bg = new THREE.CylinderGeometry(r * .12, r * .42, len, q === 'low' ? 5 : 7, 3), mid = top.clone().add(end).multiplyScalar(.5);
          const bp = bg.attributes.position; for (let i = 0; i < bp.count; i++) { const yy = bp.getY(i) / len + .5; bp.setX(i, bp.getX(i) + Math.sin(yy * 3 + b) * .25 * len * .15); }
          bg.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir))); bg.translate(mid.x, mid.y, mid.z); bg.computeVertexNormals();
          const bu = bg.attributes.uv; for (let i = 0; i < bu.count; i++) bu.setXY(i, bu.getX(i), bu.getY(i) * len / 2.4);
          trunks.push(bg); ends.push(end);
          // a second, smaller fork near the end
          const d2 = dir.clone().add(V3(Rt() - .5, .3, Rt() - .5)).normalize(), s0 = top.clone().addScaledVector(dir, len * .6), e2 = s0.clone().addScaledVector(d2, len * .55), g2 = new THREE.CylinderGeometry(r * .06, r * .18, len * .55, 5);
          g2.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d2))); g2.translate((s0.x + e2.x) / 2, (s0.y + e2.y) / 2, (s0.z + e2.z) / 2); trunks.push(g2); ends.push(e2);
        }
        const cr = H * (t.kind === 'split' ? .42 : .34), cy = top.y + H * .2, nl = Math.round((t.vis ? 22 : t.r > .7 ? 46 : 32) * (q === 'low' ? .55 : q === 'high' ? 1.15 : 1));
        for (let k = 0; k < nl; k++) {
          let pt; if (k < ends.length * 2) pt = ends[k % ends.length].clone().add(V3((Rt() - .5) * 2.5, (Rt() - .3) * 2, (Rt() - .5) * 2.5));
          else { const a = Rt() * TAU, u = Rt() * 2 - 1, rr = Math.cbrt(Rt()), s = Math.sqrt(1 - u * u); pt = V3(top.x + Math.cos(a) * s * cr * rr, cy + u * cr * .55 * rr, top.z + Math.sin(a) * s * cr * rr); }
          leaves.push({ p: pt, s: (1.9 + Rt() * 1.4) * (t.vis ? 1.3 : 1), ry: Rt() * TAU, rx: (Rt() - .5) * .6, shade: .72 + Rt() * .4 + (pt.y - cy) / (cr * 4) });
        }
      }
      const bark = std({ map: TEX.bark, normalMap: TEX.barkN, normalScale: new THREE.Vector2(1.4, 1.4), roughness: .92, vertexColors: true });
      const tm = new THREE.Mesh(merge(trunks), bark); tm.castShadow = tm.receiveShadow = true; S.add(tm); X.trunks = tm;
      trunks.forEach(g => g.dispose());
      // the leaf card: three crossed quads
      const card = merge([0, 1, 2].map(k => { const g = new THREE.PlaneGeometry(2.6, 2.6, 1, 2); g.rotateY(k * Math.PI / 3); return g; }));
      const lm = windify(std({ map: TEX.leaves, alphaTest: .45, side: THREE.DoubleSide, roughness: .8, transparent: false }), 1);
      const inst = new THREE.InstancedMesh(card, lm, leaves.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), col = new THREE.Color();
      leaves.forEach((L, i) => { E.set(L.rx, L.ry, (art() - .5) * .5); Q.setFromEuler(E); M.compose(L.p, Q, V3(L.s, L.s * (.85 + art() * .3), L.s)); inst.setMatrixAt(i, M); col.setRGB(cl(L.shade, .5, 1.25) * (.9 + art() * .15), cl(L.shade, .5, 1.25), cl(L.shade, .5, 1.2) * .9); inst.setColorAt(i, col); });
      inst.castShadow = X.q === 'high'; inst.receiveShadow = false;
      inst.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: TEX.leaves, alphaTest: .45 });
      S.add(inst); X.leaves = inst;
    }
    // ---- ferns and grass on the floor, kept off the paths, the creek and anything solid
    {
      const R = W.rng(4242), place = (n, ok) => { const out = []; for (let k = 0; k < n * 6 && out.length < n; k++) { const x = R() * 146 - 3, z = R() * 146 - 3; if (ok(x, z)) out.push([x, z, R()]); } return out; };
      const free = (x, z) => W.creekDist(x, z) > W.CREEK_W + .6 && pathDist(x, z) > 1.6 && !treeNear(x, z, .6) && !boxNear(x, z, .5) && Math.hypot(x - 70, z - 124) > 7 && Math.hypot(x - 70, z - 16) > 7;
      // fern: seven arching fronds
      const fronds = []; for (let k = 0; k < 7; k++) { const g = new THREE.PlaneGeometry(.42, 1.15, 1, 5); g.translate(0, .575, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = y / 1.15; p.setZ(i, -t * t * .55); p.setY(i, y * .9); } g.rotateX(-.75 + (k % 2) * .2); g.rotateY(k / 7 * TAU + .3); fronds.push(g); }
      const fernG = merge(fronds), fernM = windify(std({ map: TEX.fern, alphaTest: .4, side: THREE.DoubleSide, roughness: .85 }), .7, 'grass');
      const fp = place(Math.round(1500 * dens), (x, z) => free(x, z) && (treeNear(x, z, 6) || R() < .35));
      const fi = new THREE.InstancedMesh(fernG, fernM, fp.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), col = new THREE.Color();
      fp.forEach(([x, z, r], i) => { const s = .7 + r * .9; Q.setFromEuler(new THREE.Euler(0, r * TAU, 0)); M.compose(V3(x, visH(x, z) - .05, z), Q, V3(s, s * (.8 + art() * .4), s)); fi.setMatrixAt(i, M); col.setRGB(.8 + art() * .3, .85 + art() * .3, .7 + art() * .2); fi.setColorAt(i, col); });
      fi.receiveShadow = true; S.add(fi);
      const grassG = merge([0, 1].map(k => { const g = new THREE.PlaneGeometry(1, .7, 1, 2); g.translate(0, .35, 0); g.rotateY(k * Math.PI / 2 + .4); return g; }));
      const gm = windify(std({ map: TEX.grass, alphaTest: .4, side: THREE.DoubleSide, roughness: .9 }), 1.2, 'grass');
      const gp = place(Math.round(2600 * dens), (x, z) => W.creekDist(x, z) > W.CREEK_W + .3 && !treeNear(x, z, .5) && !boxNear(x, z, .3) && (pathDist(x, z) > .9) && (!treeNear(x, z, 5) || R() < .3));
      const gi = new THREE.InstancedMesh(grassG, gm, gp.length);
      gp.forEach(([x, z, r], i) => { const s = .6 + r * .8; Q.setFromEuler(new THREE.Euler(0, r * TAU, 0)); M.compose(V3(x, visH(x, z) - .03, z), Q, V3(s, s, s)); gi.setMatrixAt(i, M); col.setRGB(.85 + art() * .3, .9 + art() * .25, .7); gi.setColorAt(i, col); });
      gi.receiveShadow = true; S.add(gi);
      // low leafy bushes hugging walls and trunks
      const bp = place(Math.round(260 * dens), (x, z) => !treeNear(x, z, .9) && !boxNear(x, z, .4) && (boxNear(x, z, 2.2) || treeNear(x, z, 2.5)) && pathDist(x, z) > 2 && W.creekDist(x, z) > W.CREEK_W + 1);
      const card = merge([0, 1, 2].map(k => { const g = new THREE.PlaneGeometry(1.4, 1.1, 1, 1); g.translate(0, .45, 0); g.rotateY(k * Math.PI / 3); return g; }));
      const bi = new THREE.InstancedMesh(card, windify(std({ map: TEX.leaves, alphaTest: .45, side: THREE.DoubleSide, roughness: .85 }), .5, 'grass'), bp.length);
      bp.forEach(([x, z, r], i) => { const s = .8 + r * .9; Q.setFromEuler(new THREE.Euler(0, r * TAU, 0)); M.compose(V3(x, visH(x, z) - .1, z), Q, V3(s, s, s)); bi.setMatrixAt(i, M); col.setRGB(.55, .7, .45); bi.setColorAt(i, col); });
      S.add(bi);
    }
    // ---- stone: walls, the tower, the bridge (textured to scale), with jagged broken tops; rocks; logs; stairs and the platform
    {
      const wallG = [], deckG = [], woodG = [], blocks = [], rocks = [], logs = [];
      const R = W.rng(31);
      for (const b of W.BOXES) {
        const w = b.hx * 2, d = b.hz * 2, h = b.y1 - b.y0, M4 = new THREE.Matrix4().makeRotationY(b.a).setPosition(b.x, 0, b.z);
        if (b.kind === 'rock') { rocks.push(b); continue; }
        if (b.kind === 'log') { logs.push(b); continue; }
        if (b.mat === 'wood') { const g = worldBox(w, h, d, 2.2); g.translate(0, (b.y0 + b.y1) / 2, 0); g.applyMatrix4(M4); woodG.push(g); continue; }
        if (b.kind === 'deck') { const g = worldBox(w, h, d, 2.6); g.translate(0, (b.y0 + b.y1) / 2, 0); g.applyMatrix4(M4); deckG.push(g); continue; }
        // a wall: solid courses up to below the top, then loose blocks for a broken edge
        const jag = b.kind === 'parapet' ? .18 : Math.min(.55, h * .3), body = h - jag;
        const g = worldBox(w, body, d, 2.6); g.translate(0, b.y0 + body / 2, 0); g.applyMatrix4(M4); wallG.push(g);
        const along = b.hx >= b.hz, L = along ? w : d, T = along ? d : w, n = Math.max(1, Math.round(L / .55));
        for (let k = 0; k < n; k++) {
          const u = -L / 2 + (k + .5) * L / n, hh = jag * (b.kind === 'parapet' ? 1 : R() < .22 ? 0 : .55 + R() * .45); if (hh < .05) continue;
          const lx = along ? u : 0, lz = along ? 0 : u, [wx, wz] = [b.x + lx * b.c + lz * b.s, b.z - lx * b.s + lz * b.c];
          blocks.push({ x: wx, y: b.y0 + body + hh / 2, z: wz, sx: (along ? L / n : T) * (.92 + R() * .08), sy: hh, sz: (along ? T : L / n) * (.92 + R() * .08), a: b.a + (R() - .5) * .08 });
        }
        if (b.kind === 'tower' || b.kind === 'wall') for (let k = 0; k < 2 + R() * 3; k++) { const lx = (R() - .5) * (w + 1.6), lz = (R() < .5 ? -1 : 1) * (d / 2 + .3 + R() * .5); const [wx, wz] = [b.x + lx * b.c + lz * b.s, b.z - lx * b.s + lz * b.c]; if (W.blocked(wx, W.terrainH(wx, wz), wz)) continue; const s = .25 + R() * .3; blocks.push({ x: wx, y: W.terrainH(wx, wz) + s * .3, z: wz, sx: s * 1.3, sy: s * .8, sz: s, a: R() * TAU }); }
      }
      const stoneM = std({ map: TEX.stone, normalMap: TEX.stoneN, roughness: .9, color: LC('#d8d2c4') });
      for (const [list, mat] of [[wallG, stoneM], [deckG, stoneM], [woodG, std({ map: TEX.planks, roughness: .85 })]]) if (list.length) { const m = new THREE.Mesh(merge(list), mat); m.castShadow = m.receiveShadow = true; S.add(m); }
      const bi = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std({ map: TEX.rock, normalMap: TEX.rockN, roughness: .9, color: LC('#cfc9bb') }), blocks.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion();
      blocks.forEach((k, i) => { Q.setFromEuler(new THREE.Euler((R() - .5) * .06, k.a, (R() - .5) * .06)); M.compose(V3(k.x, k.y, k.z), Q, V3(k.sx, k.sy, k.sz)); bi.setMatrixAt(i, M); });
      bi.castShadow = bi.receiveShadow = true; S.add(bi);
      // rocks: lumpy, lichened, filling their box
      const rg = []; for (const b of rocks) { const g = new THREE.IcosahedronGeometry(1, q === 'low' ? 1 : 2), p = g.attributes.position, sd = R() * 10; for (let i = 0; i < p.count; i++) { const v = V3(p.getX(i), p.getY(i), p.getZ(i)), n = 1 + .22 * (noiseAt(v.x * 2 + sd, v.y * 2 + v.z, 1) - .5) * 2; p.setXYZ(i, v.x * n, v.y * n, v.z * n); }
        g.scale(b.hx * 1.12, (b.y1 - b.y0) / 2, b.hz * 1.12); g.rotateY(b.a); g.translate(b.x, (b.y0 + b.y1) / 2, b.z); g.computeVertexNormals(); tint(g, (x, y, z, ny) => ny > .55 ? [.7, .95, .6] : [1, 1, 1]); rg.push(g); }
      if (rg.length) { const m = new THREE.Mesh(merge(rg), std({ map: TEX.rock, normalMap: TEX.rockN, roughness: .92, vertexColors: true })); m.castShadow = m.receiveShadow = true; S.add(m); }
      // fallen logs: bark, mossy on top, cut ends
      const lg = []; for (const b of logs) { const r = (b.y1 - b.y0) * .44, g = new THREE.CylinderGeometry(r * .92, r, b.hx * 2, q === 'low' ? 8 : 12, 4); g.rotateZ(Math.PI / 2); const u = g.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * 2, u.getY(i) * b.hx / 1.2);
        g.rotateY(b.a); g.translate(b.x, b.y0 + r * 1.05, b.z); g.computeVertexNormals(); tint(g, (x, y, z, ny) => ny > .5 ? [.6, .8, .45] : [1, 1, 1]); lg.push(g); }
      if (lg.length) { const m = new THREE.Mesh(merge(lg), std({ map: TEX.bark, normalMap: TEX.barkN, roughness: .9, vertexColors: true })); m.castShadow = m.receiveShadow = true; S.add(m); }
    }
    // ---- the bridge's arch underneath, the tower's merlons and beams, camp banners, the zone stones
    {
      const br = W.PROPS.find(p => p.t === 'bridge'), stoneM = std({ map: TEX.stone, normalMap: TEX.stoneN, roughness: .9, color: LC('#cfc7b6') }), parts = [];
      if (br) for (const sx of [-1.45, 1.45]) for (let k = 0; k <= 16; k++) { const u = k / 16, z = br.z - br.len / 2 + u * br.len, top = W.groundAt(br.x, z, 50) - .45, bot = lp(top - 2.6, top - .2, Math.pow(Math.abs(u - .5) * 2, 1.5)); const g = worldBox(.4, Math.max(.2, top - Math.max(bot, visH(br.x, z) - .3)), br.len / 16 + .05, 2.6); g.translate(br.x + sx, (top + Math.max(bot, visH(br.x, z) - .3)) / 2, z); parts.push(g); }
      const tw = W.PROPS.find(p => p.t === 'tower');
      if (tw) { for (let k = 0; k < 3; k++) { const g = new THREE.BoxGeometry(.18, .22, 2 * tw.s + .6); g.rotateZ((k - 1) * .2); g.translate(tw.x - 1.5 + k * 1.6, tw.top - .4 - k * .3, tw.z); parts.push(g); } }
      if (parts.length) { const m = new THREE.Mesh(merge(parts), stoneM); m.castShadow = m.receiveShadow = true; S.add(m); }
      // banners at the two camps and by the bridge
      for (const [x, z, team] of [[55.8, 125.5, 0], [84.2, 125.5, 0], [84.2, 14.5, 1], [55.8, 14.5, 1]]) {
        const [c, g] = cvs(128, 256); g.fillStyle = W.TEAMS[team].col; g.fillRect(0, 0, 128, 256); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, 128, 18); g.fillStyle = '#efe6cf';
        g.beginPath(); if (team === 0) { g.moveTo(64, 60); g.quadraticCurveTo(104, 110, 64, 190); g.quadraticCurveTo(24, 110, 64, 60); } else { g.moveTo(64, 60); g.lineTo(100, 150); g.lineTo(64, 190); g.lineTo(28, 150); } g.fill();
        g.beginPath(); g.moveTo(0, 256); g.lineTo(64, 214); g.lineTo(128, 256); g.fillStyle = 'rgba(0,0,0,0)'; g.globalCompositeOperation = 'destination-out'; g.fill(); g.globalCompositeOperation = 'source-over';
        const y = visH(x, z), pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, 4.2, 6), std({ color: LC('#4a3524'), roughness: .8 })); pole.position.set(x, y + 2.1, z); pole.castShadow = true; S.add(pole);
        const fg = new THREE.PlaneGeometry(.9, 1.8, 6, 6); fg.translate(.46, -.9, 0); const flag = new THREE.Mesh(fg, windify(std({ map: tex(c, { clamp: true }), side: THREE.DoubleSide, alphaTest: .5, roughness: .9 }), 3)); flag.position.set(x + .05, y + 4, z); flag.rotation.y = team ? Math.PI : 0; flag.castShadow = true; S.add(flag);
      }
      // the marked clearing for overtime: a ring of old standing stones around the bridge
      const ring = []; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, x = W.ZONE.x + Math.cos(a) * W.ZONE.r, z = W.ZONE.z + Math.sin(a) * W.ZONE.r; if (W.creekDist(x, z) < W.CREEK_W + .8 || W.blocked(x, W.terrainH(x, z), z)) continue; const g = new THREE.BoxGeometry(.32, 1.1 + art() * .5, .22); g.rotateY(a); g.rotateZ((art() - .5) * .2); g.translate(x, visH(x, z) + .45, z); ring.push(g); }
      if (ring.length) { const m = new THREE.Mesh(merge(ring), std({ map: TEX.rock, normalMap: TEX.rockN, roughness: .9, color: LC('#bfb8a6') })); m.castShadow = true; S.add(m); }
      const zg = new THREE.CylinderGeometry(W.ZONE.r, W.ZONE.r, 6, 48, 1, true), zm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { col: { value: new THREE.Color('#e9c46a') }, t: { value: 0 }, a: { value: 0 } },
        vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
        fragmentShader: 'uniform vec3 col; uniform float t, a; varying vec2 vU; void main(){ float f = pow(1. - vU.y, 2.2) * (.55 + .45 * sin(vU.x * 60. + t * 3.)); gl_FragColor = vec4(col, f * a); }' });
      const zone = new THREE.Mesh(zg, zm); zone.position.set(W.ZONE.x, W.terrainH(W.ZONE.x, W.ZONE.z) + 1.6, W.ZONE.z); zone.visible = false; S.add(zone); X.zone = zone;
    }
    // ---- arrow bundles at the pickups
    {
      X.picks = W.PICKUPS.map(k => {
        const g = new THREE.Group(); g.position.set(k.x, visH(k.x, k.z), k.z);
        const stump = new THREE.Mesh(new THREE.CylinderGeometry(.32, .4, .45, 10), std({ map: TEX.bark, roughness: .9 })); stump.position.y = .2; stump.castShadow = true; g.add(stump);
        for (let n = 0; n < 3; n++) { const a = makeArrowMesh('longbow'); a.position.set((n - 1) * .06, .62, (n - 1) * .03); a.rotation.set(Math.PI / 2 - .15 + n * .1, 0, (n - 1) * .15); a.scale.setScalar(1); g.add(a); }
        const band = new THREE.Mesh(new THREE.TorusGeometry(.06, .015, 6, 12), std({ color: LC('#7a5230') })); band.rotation.x = Math.PI / 2; band.position.y = .62; g.add(band);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.dot, color: new THREE.Color('#ffd98a'), transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.setScalar(1.6); glow.position.y = .7; g.add(glow); g.userData.glow = glow;
        X.scene.add(g); return g;
      });
    }
    // ---- light in the air: drifting motes and a few soft shafts through the canopy
    {
      const n = q === 'low' ? 150 : 400, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = art() * 140; pos[i * 3 + 1] = art() * 9 + 1; pos[i * 3 + 2] = art() * 140; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const motes = new THREE.Points(g, new THREE.PointsMaterial({ map: TEX.dot, size: .09, color: LC('#fff2c8'), transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })); X.scene.add(motes); X.motes = motes;
      const [c, gg] = cvs(64, 256); const gr = gg.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(.25, 'rgba(255,240,200,.9)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 256);
      const g2 = gg.createLinearGradient(0, 0, 64, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); gg.globalCompositeOperation = 'destination-out'; gg.fillStyle = g2; gg.fillRect(0, 0, 64, 256);
      const sm2 = new THREE.MeshBasicMaterial({ map: tex(c, { clamp: true }), transparent: true, opacity: .07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
      X.shafts = [];
      for (const [x, z] of [[70, 92], [46, 70], [94, 70], [58, 112], [82, 28], [30, 100], [110, 40], [70, 48]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 26), sm2); m.position.set(x, visH(x, z) + 11, z); m.lookAt(m.position.clone().add(X.sunDir)); m.rotateX(Math.PI / 2); m.rotation.y += .4; X.scene.add(m); X.shafts.push(m); }
    }
  }
