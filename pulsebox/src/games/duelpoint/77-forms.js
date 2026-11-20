  /* ---------- 77 forms: the top lines build their own gun ----------
     A Common, Rare or Epic paints the standard gun and bolts a few parts on. A Legendary, Mythic or Paragon re-bodies it:
     a sculpted sleeve over everything in front of the receiver (the slide, on a sidearm), a shell over the receiver and
     one over the stock (the frame, on a sidearm), its own muzzle and its own hero piece. Each line is drawn once, in
     proportion, and fitted to every weapon by measuring that weapon's body first (sights, rails, grips, lights and bipods
     are fittings, not body: they stay standing where they were), so one design sits snug on a pistol and on a sniper.
     FORMS[line] = { gun(K), knife(H) }: K carries the measured zones and the tools below, H the knife's own tools. */
  const FORMS = {}, FENV = {}, FMAT = {};
  const fv = (x, y, z) => new THREE.Vector3(x, y, z), flc = c => new THREE.Color(c).convertSRGBToLinear();
  const fss = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);

  // the body's meshes by where they live: fixed to the gun, or riding on the slide, the pump or the break-open barrels
  function formBody(G, parts) {
    const on = new Map(); for (const [n, p] of Object.entries(parts)) if (p && p.isObject3D) p.traverse(o => on.set(o, n));
    const out = { fixed: [], slide: [], pump: [], brk: [] };
    G.traverse(o => { if (!o.isMesh || o.userData.acc || o.userData.live || (o.material && (o.material.transparent || o.material.userData.keepUV))) return; const n = on.get(o); if (n == null) out.fixed.push(o); else if (out[n]) out[n].push(o); });
    return out;
  }
  /* The body's cross-section at steps along z, from z0 (the front) to z1: its top t and bottom b down the middle and its
     half-width w at a few heights between them. Then the gaps are filled, spikes taken out (a sling loop is not the
     body) and the result eased, so a sleeve laid over it follows the body smoothly and never lets a corner poke through. */
  function formEnv(meshes, z0, z1, by, lim) {
    const ray = new THREE.Raycaster(), n = Math.max(6, Math.round(Math.abs(z1 - z0) / .008)), S = [];
    const hit = (ox, oy, oz, dx, dy) => { ray.set(fv(ox, oy, oz), fv(dx, dy, 0)); const h = ray.intersectObjects(meshes, false)[0]; return h ? h.point : null; };
    for (let i = 0; i <= n; i++) {
      const z = lp(z0, z1, i / n); let t = null, b = null, w = null;
      for (const x of [0, -.004, .004, -.012, .012, -.017, .017]) { const a = hit(x, by + .4, z, 0, -1), c = hit(x, by - .4, z, 0, 1); if (a && (t == null || a.y > t)) t = a.y; if (c && (b == null || c.y < b)) b = c.y; }
      if (t != null) { t = Math.min(t, lim.t); b = Math.max(b, lim.b); if (b > t - .004) b = t - .004; }
      if (t != null) for (let k = 0; k <= 6; k++) { const y = lp(b + .0008, t - .0008, k / 6); for (const sx of [1, -1]) { const q = hit(sx * .5, y, z, -sx, 0); if (q && Math.abs(q.x) < .1) w = Math.max(w || 0, Math.abs(q.x)); } }
      S.push({ z, t, b, w });
    }
    for (const key of ['t', 'b', 'w']) {   // fill the gaps
      const v = S.map(s => s[key]), have = v.map((x, i) => x == null ? -1 : i).filter(i => i >= 0);
      if (!have.length) { S.forEach(s => s[key] = key === 't' ? by + .012 : key === 'b' ? by - .012 : .012); continue; }
      S.forEach((s, i) => { if (s[key] != null) return; let a = -1, c = -1; for (const j of have) { if (j < i) a = j; else if (c < 0) c = j; } s[key] = a < 0 ? v[c] : c < 0 ? v[a] : lp(v[a], v[c], (i - a) / (c - a)); });
    }
    const med = (key, r) => { const v = S.map(s => s[key]); S.forEach((s, i) => { const q = v.slice(Math.max(0, i - r), i + r + 1).sort((a, c) => a - c); s[key] = q[q.length >> 1]; }); };
    const dil = (key, r, up) => { const v = S.map(s => s[key]); S.forEach((s, i) => { const q = v.slice(Math.max(0, i - r), i + r + 1); s[key] = up ? Math.max(...q) : Math.min(...q); }); };
    const avg = (key, r) => { const v = S.map(s => s[key]); S.forEach((s, i) => { const q = v.slice(Math.max(0, i - r), i + r + 1); s[key] = q.reduce((a, c) => a + c, 0) / q.length; }); };
    for (const [key, up] of [['t', 1], ['b', 0], ['w', 1]]) { med(key, lim.med == null ? 2 : lim.med); dil(key, 2, up); avg(key, 2); }
    S.forEach(s => { s.w = cl(s.w, .006, .06); if (s.t < s.b + .008) { const c = (s.t + s.b) / 2; s.t = c + .004; s.b = c - .004; } });
    return S;
  }
  // the underside of whatever fitting sits on top of the body at each step (a rail, a sight's base, a sight post): a form
  // never rises into it, so a rail stays a rail standing on the new body rather than half sunk in it
  function formCaps(E, acc, by) {
    for (const e of E) { let c = Infinity; for (const a of acc) if (a.min.z - .005 < e.z && a.max.z + .005 > e.z && a.min.y > by + .012 && Math.abs((a.min.x + a.max.x) / 2) < .03) c = Math.min(c, a.min.y); e.cap = c; }
    const v = E.map(e => e.cap); E.forEach((e, i) => { e.cap = Math.min(...v.slice(Math.max(0, i - 1), i + 2)) - .0004; if (e.cap < e.b + .006) e.cap = e.b + .006; });
  }
  const envAt = (E, z, key) => { if (z <= E[0].z) return E[0][key]; const L = E[E.length - 1]; if (z >= L.z) return L[key]; const f = (z - E[0].z) / (L.z - E[0].z) * (E.length - 1), i = Math.floor(f); return lp(E[i][key], E[Math.min(i + 1, E.length - 1)][key], f - i); };

  // a sleeve lofted through the envelope: a superellipse at each step (round at n = 2, squarer as n grows) that the
  // line's style then shapes. grow(u) and wide(u) swell it along its length (u is 0 at the front, 1 at the back), lift(u)
  // raises it, mod(a, u) pushes the edge in and out round the section (a is 0 at the right, PI/2 on top)
  function formLoft(E, st, holeR, holeY, front) {
    const N = st.sides || 28, off = st.off == null ? .0022 : st.off, P = [], rings = [];
    E.forEach((e, i) => {
      const u = i / (E.length - 1), g = st.grow ? st.grow(u) : 1, W = (e.w + off) * (st.wide ? st.wide(u) : g), T = e.t + off, B = e.b - off;
      const H = (T - B) / 2 * g, yc = (T + B) / 2 + (st.lift ? st.lift(u) : 0), p = 2 / (st.n || 2.6), ring = [];
      for (let j = 0; j < N; j++) { const a = j / N * TAU + (st.rot || 0), c = Math.cos(a), s = Math.sin(a), k = st.mod ? st.mod(a, u, i) : 1;
        ring.push([W * Math.sign(c) * Math.pow(Math.abs(c), p) * k, Math.min(yc + H * Math.sign(s) * Math.pow(Math.abs(s), p) * k, e.cap == null ? Infinity : e.cap)]); }
      rings.push({ z: i === 0 && front != null ? front : e.z, r: ring, yc });
    });
    const pos = [], idx = [], add = (x, y, z) => { pos.push(x, y, z); return pos.length / 3 - 1; };
    const base = rings.map(R => R.r.map(([x, y]) => add(x, y, R.z)));
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < N; j++) { const a = base[i][j], b = base[i][(j + 1) % N], c = base[i + 1][j], d = base[i + 1][(j + 1) % N]; idx.push(a, b, c, b, d, c); }
    // the front: closed round the bore (an annulus down to the hole), the back: closed flat
    const f = rings[0], hr = holeR || 0;
    if (hr > 0) { const inner = f.r.map((p, j) => { const a = j / N * TAU + (st.rot || 0); return add(Math.cos(a) * hr, holeY + Math.sin(a) * hr, f.z); }); for (let j = 0; j < N; j++) { const a = base[0][j], b = base[0][(j + 1) % N], c = inner[j], d = inner[(j + 1) % N]; idx.push(a, c, b, b, c, d); } }
    else { const c0 = add(0, f.yc, f.z); for (let j = 0; j < N; j++) idx.push(base[0][j], c0, base[0][(j + 1) % N]); }
    const bk = rings[rings.length - 1], c1 = add(0, bk.yc, bk.z), li = rings.length - 1; for (let j = 0; j < N; j++) idx.push(base[li][j], base[li][(j + 1) % N], c1);
    let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    if (st.flat) g = g.toNonIndexed(); g.computeVertexNormals(); return g;
  }
  // an outline drawn in a zone's own proportions (u: 0 at the front to 1 at the back, v: 0 at the bottom to 1 at the
  // top), mapped onto the body's real top and bottom at each point along it, and given thickness: it sits on the body
  // like a cover. Outlines take [u, v] points and ['q', cu, cv, u, v] curves, as the guns' own silhouettes do.
  function formFlat(P, n = 8) { const out = []; let px = 0, py = 0; for (const p of P) { if (p[0] === 'q') { for (let i = 1; i <= n; i++) { const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; out.push([a * px + b * p[1] + c * p[3], a * py + b * p[2] + c * p[4]]); } px = p[3]; py = p[4]; } else { out.push([p[0], p[1]]); px = p[0]; py = p[1]; } } return out; }
  function formMap(Z, pts, margin = .0012) { return formFlat(pts).map(([u, v]) => { const z = lp(Z.z0, Z.z1, u), b = envAt(Z.E, z, 'b'), t = envAt(Z.E, z, 't'); return [z, Math.min(lp(b, t, v), capAt(Z.E, z) - margin)]; }); }
  const capAt = (E, z) => { const f = cl((z - E[0].z) / (E[E.length - 1].z - E[0].z), 0, 1) * (E.length - 1), i = Math.floor(f); return Math.min(E[i].cap == null ? Infinity : E[i].cap, E[Math.min(i + 1, E.length - 1)].cap == null ? Infinity : E[Math.min(i + 1, E.length - 1)].cap); };
  function formExtrude(zy, w, bev = .0025, holes) {
    const s = new THREE.Shape(); zy.forEach(([z, y], i) => i ? s.lineTo(z, y) : s.moveTo(z, y));
    if (holes) for (const h of holes) { const p = new THREE.Path(); h.forEach(([z, y], i) => i ? p.lineTo(z, y) : p.moveTo(z, y)); s.holes.push(p); }
    const d = Math.max(.0008, w - bev * 2), g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev * .8, bevelSegments: 2, curveSegments: 4 });
    g.translate(0, 0, -d / 2); g.rotateY(-Math.PI / 2); return g;
  }
  // a line's own materials, made once per line
  function fmat(line, key, make) { const k = line + '|' + key; return FMAT[k] || (FMAT[k] = make()); }
  const fenv = (m, ei) => { if (X && X.env) { m.envMap = X.env; m.envMapIntensity = ei; } return m; };
  const fstd = o => fenv(new THREE.MeshStandardMaterial(o), o.ei || .9), fphys = o => fenv(new THREE.MeshPhysicalMaterial(o), o.ei || 1.1);
  const fglow = (c, op = .92) => new THREE.MeshBasicMaterial({ color: flc(c), toneMapped: false, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
  const fsolid = c => new THREE.MeshBasicMaterial({ color: flc(c), toneMapped: false });

  /* Build a line's form on a built gun. The zones it measures:
       fore   everything in front of the receiver, to the muzzle (a sidearm's slide: it rides with the slide)
       recv   the receiver, top to bottom of its sides (a sidearm's frame under the slide)
       stock  the stock, back to the butt (none on a sidearm)
     Returns true when the line has a form (the painted kit then stays off). */
  function formKit(G, k, line, m, A, parts, len, bore) {
    const F = FORMS[line]; if (!F || !F.gun || k === 'knife' || !A || !A.fam) return false;
    G.updateMatrixWorld(true);
    const B = formBody(G, parts), by = bore ? bore.y : A.by || .03, tip = bore ? bore.z : -len, rM = bore ? bore.r : .012, fam = A.fam;
    const bb = new THREE.Box3(); for (const o of B.fixed) bb.expandByObject(o);
    const key = k, Z = FENV[key] || (FENV[key] = (() => {
      const z = {};
      if (fam === 'pistol') {
        const sb = new THREE.Box3(); for (const o of B.slide) sb.expandByObject(o);
        z.fore = { part: 'slide', z0: sb.min.z + .001, z1: sb.max.z - .001, E: formEnv(B.slide, sb.min.z + .001, sb.max.z - .001, by, { t: .0545, b: .017 }) };
        z.recv = { z0: A.rf + .002, z1: .036, E: formEnv(B.fixed, A.rf + .002, .036, by, { t: .0155, b: -.0075, med: 1 }) };
      } else if (fam === 'rev') {
        z.fore = { z0: tip + .001, z1: -.074, E: formEnv(B.fixed, tip + .001, -.074, by, { t: .052, b: .009 }) };
        z.recv = { z0: -.07, z1: .04, E: formEnv(B.fixed, -.07, .04, by, { t: .057, b: -.01, med: 1 }) };
      } else if (fam === 'stub') {
        const sb = new THREE.Box3(); for (const o of B.brk) sb.expandByObject(o);
        z.fore = { part: 'brk', z0: sb.min.z + .001, z1: -.066, E: formEnv(B.brk, sb.min.z + .001, -.066, .032, { t: .05, b: .013 }) };
        z.recv = { z0: -.066, z1: .056, E: formEnv(B.fixed, -.066, .056, .032, { t: .05, b: -.003, med: 1 }) };
      } else {
        const front = tip + .001, back = A.rf - .004;
        z.fore = { part: A.pump ? null : null, z0: front, z1: back, E: formEnv(B.fixed, front, back, by, { t: A.top + .003, b: A.pump ? by - .021 : by - .066 }) };
        z.recv = { z0: A.rf, z1: A.rb, E: formEnv(B.fixed, A.rf, A.rb, by, { t: A.top + .002, b: by - .06, med: 1 }) };
        const s0 = A.sb + .004, s1 = bb.max.z - .004; if (s1 > s0 + .05) z.stock = { z0: s0, z1: s1, E: formEnv(B.fixed, s0, s1, by, { t: by + .05, b: by - .16, med: 1 }) };
        if (A.pump && parts.pump) { const pb = new THREE.Box3(); for (const o of B.pump) pb.expandByObject(o); z.pump = { part: 'pump', z0: pb.min.z + .002, z1: pb.max.z - .002, E: formEnv(B.pump, pb.min.z + .002, pb.max.z - .002, by - .04, { t: by + .0, b: by - .08 }) }; }
      }
      const acc = []; G.traverse(o => { if (o.isMesh && o.userData.acc) { let on = false; for (const p of Object.values(parts)) if (p && p.isObject3D && p !== parts.slide) p.traverse(c => { if (c === o) on = true; }); if (!on) acc.push(new THREE.Box3().setFromObject(o)); } });
      const accS = []; if (parts.slide) parts.slide.traverse(o => { if (o.isMesh && o.userData.acc) accS.push(new THREE.Box3().setFromObject(o)); });
      for (const q of Object.values(z)) { formCaps(q.E, q.part === 'slide' ? accS : acc, by); for (const e of q.E) e.cap = Math.min(e.cap, (A.sight || .09) - .003); }
      for (const q of Object.values(z)) { q.wMax = Math.max(...q.E.map(e => e.w)); q.tMax = Math.max(...q.E.map(e => e.t)); q.bMin = Math.min(...q.E.map(e => e.b)); }
      return z;
    })());
    const Kg = new THREE.Group(); G.add(Kg);
    { const f = Z.fore.E[0]; Z.fore.r0 = Math.max(f.w, Math.abs(Math.min(f.t, f.cap) - by), Math.abs(by - f.b)) + .0022; }
    const holder = part => part && parts[part] ? parts[part] : Kg;
    const put = (o, part) => { o.userData.formMade = 1; if (part && parts[part]) { Kg.add(o); o.updateMatrixWorld(true); parts[part].attach(o); } else Kg.add(o); return o; };
    const K = {
      k, line, m, A, fam, by, tip, rM, len, Z, bb, L: LINES[line], low: !!(X && X.low),
      sight: A.sight || .09, boreR: cl(rM * .42, .0042, .0072), boreM: FMAT.bore || (FMAT.bore = new THREE.MeshBasicMaterial({ color: 0x000000 })),
      // the highest a piece may stand at z: under any fitting there, and below the line you aim along (in front of the eye)
      ceil: (Q, z) => Math.min(capAt(Q.E, z), (A.sight || .09) - .004),
      group: (x, y, z, part) => { const g = new THREE.Group(); g.position.set(x, y, z); return put(g, part); },
      mesh: (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, part) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return put(o, part); },
      live: (o, fn) => { o.userData.live = true; o.userData.anim = fn; return o; },
      // the zone's tools: z at u along it, the body's top, bottom and half-width there
      at: (Q, u) => lp(Q.z0, Q.z1, u), top: (Q, z) => envAt(Q.E, z, 't'), bot: (Q, z) => envAt(Q.E, z, 'b'), half: (Q, z) => envAt(Q.E, z, 'w'),
      loft: (Q, st, mat) => { const fr = Q === Z.fore; if (fr && !Q.st) Q.st = st; const g = formLoft(Q.E, st, fr ? K.boreR : 0, by, fr ? K.tip - .0012 : null), o = K.mesh(g, mat, 0, 0, 0, 0, 0, 0, Q.part);
        if (fr) K.mesh(new THREE.CircleGeometry(K.boreR + .0003, 16), K.boreM, 0, by, K.tip + .002, 0, Math.PI, 0, Q.part);
        if (Q === Z.fore) { const pa = g.attributes.position.array, z0 = pa[2]; let r = 0; for (let i = 0; i < pa.length; i += 3) if (Math.abs(pa[i + 2] - z0) < 1e-5) r = Math.max(r, Math.hypot(pa[i], pa[i + 1] - by)); Q.r0 = Math.max(Q.r0 || 0, r + .0004); }
        return o; },
      // a flat piece drawn in (z, y) and laid against the body: centred where it is drawn, turned by yaw about its own middle
      flatAt: (zy, th, mat, x, yaw = 0, bev, part) => { const P = formFlat(zy); let zc = 0, yc = 0; P.forEach(([z, y]) => { zc += z; yc += y; }); zc /= P.length; yc /= P.length;
        const g = formExtrude(P.map(([z, y]) => [z - zc, y - yc]), th, bev == null ? Math.min(.0008, th * .35) : bev); return K.mesh(g, mat, x, yc, zc, 0, yaw, 0, part); },
      shell: (Q, pts, mat, o = {}) => { const w = o.w != null ? o.w : (Q.wMax + (o.gap == null ? .0018 : o.gap)) * 2, bev = o.bev == null ? Math.min(.004, w * .18) : o.bev, zy = formMap(Q, pts, bev * .8 + .0007);
        const holes = o.holes ? o.holes.map(h => formMap(Q, h, bev * .8 + .0007)) : null; return K.mesh(formExtrude(zy, w, bev, holes), mat, o.x || 0, 0, 0, 0, 0, 0, Q.part); },
      // a plate on one side (sx -1: the left, the side you see in first person) or both, standing just off the body
      plate: (Q, pts, mat, o = {}) => { const th = o.th || .0025, out = []; for (const sx of o.sides || [-1, 1]) { const x = sx * (Q.wMax + (o.gap == null ? .0018 : o.gap) + th / 2 + (o.out || 0));
        const bev = o.bev == null ? Math.min(.0012, th * .4) : o.bev; out.push(K.mesh(formExtrude(formMap(Q, sx > 0 && o.mirror ? o.mirror : pts, bev * .8 + .0007), th, bev), mat, x, 0, 0, 0, 0, 0, Q.part)); } return out; },
      // raw shapes, in metres: an outline in (z, y) given width, centred on x
      extrude: (zy, w, mat, x = 0, bev, part, holes) => K.mesh(formExtrude(formFlat(zy), w, bev == null ? Math.min(.003, w * .2) : bev, holes ? holes.map(h => formFlat(h)) : null), mat, x, 0, 0, 0, 0, 0, part),
      lathe: (pts, mat, y, part, seg = 20, x = 0) => { const q = pts.map(p => new THREE.Vector2(Math.max(p[1], .0001), -p[0])); if (q[0].y > q[q.length - 1].y) q.reverse(); const g = new THREE.LatheGeometry(q, seg); g.rotateX(-Math.PI / 2); return K.mesh(g, mat, x, y, 0, 0, 0, 0, part); },
      tubeAlong: (pts, r, mat, seg = 40, rs = 6, part) => { const c = new THREE.CatmullRomCurve3(pts.map(p => fv(p[0], p[1], p[2]))); return K.mesh(new THREE.TubeGeometry(c, seg, r, rs, false), mat, 0, 0, 0, 0, 0, 0, part); },
      mat: (key, make) => fmat(line, key, make),
      cap: (Q, z) => capAt(Q.E, z),
      freeTop: (Q, u0, u1, need) => { for (let i = 0; i <= 20; i++) { const z = K.at(Q, lp(u1, u0, i / 20)), t = K.top(Q, z), c = capAt(Q.E, z); if (c > t + need + .002 && K.ceil(Q, z) > t + need + .002) return z; } return null; },
      // a turned muzzle cover: [dz back from the front, dr out from the sleeve's own front] pairs. It never comes inside
      // the sleeve (dr >= 0) and its front face is a ring that stops at the sleeve, so the bore stays open
      muzzle: (prof, mat) => { const F = Z.fore, st = F.st || { n: 2.6, sides: 28 }, e0 = F.E[0], z0 = K.tip - .003, g0 = st.grow ? st.grow(0) : 1, cap = Math.min(e0.cap, K.ceil(F, z0));
        const E = []; let zl = -Infinity; for (const [dz, dr] of prof) { const z = Math.max(z0 + dz, zl + 1e-4); E.push({ z, w: e0.w + dr, t: e0.t + dr, b: e0.b - dr, cap }); zl = z; }
        E.push({ z: E[E.length - 1].z + .002, w: e0.w, t: e0.t, b: e0.b, cap });
        const st2 = { n: st.n, sides: st.sides, rot: st.rot, flat: st.flat, off: (st.off == null ? .0022 : st.off) + .0007, grow: () => g0, mod: st.mod ? (a => st.mod(a, 0, 0)) : null };
        K.mesh(new THREE.CircleGeometry(K.boreR + .0002, 16), K.boreM, 0, by, z0 + .0045, 0, Math.PI, 0, F.part);
        const g = formLoft(E, st2, K.boreR, by, z0); return K.mesh(g, mat, 0, 0, 0, 0, 0, 0, F.part); },
      // a crown of pieces round the muzzle's rim (never across the bore): make(i, a, x, y, z) for n angles
      crown: (n, make, a0 = 0) => { const F = Z.fore, z0 = K.tip - .003, room = K.ceil(F, z0); for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU, p = K.surf(F, F.E[0].z, a, .0012); if (p[1] + .009 > room && Math.sin(a) > .3) continue; make(i, a, p[0], p[1], z0); } },
      // a band round the sleeve between z0 and z1, following its shape, raised by r (st: the sleeve's own style)
      band: (Q, z0, z1, r, mat, st = {}) => { const E = Q.E.filter(e => e.z >= Math.min(z0, z1) && e.z <= Math.max(z0, z1)); if (E.length < 2) { const za = Math.min(z0, z1), zb = Math.max(z0, z1); E.length = 0; for (const z of [za, zb]) E.push({ z, w: envAt(Q.E, z, 'w'), t: envAt(Q.E, z, 't'), b: envAt(Q.E, z, 'b'), cap: capAt(Q.E, z) }); }
        const st2 = Object.assign({}, st, { off: (st.off == null ? .0022 : st.off) + r, grow: null, wide: null }); return K.mesh(formLoft(E, st2, Q === Z.fore ? K.boreR : 0, by), mat, 0, 0, 0, 0, 0, 0, Q.part); },
      // a point on the sleeve's surface at z, angle a round it (0 right, PI/2 top), raised by r
      surf: (Q, z, a, r = 0) => { const w = envAt(Q.E, z, 'w') + .0022 + r, t = envAt(Q.E, z, 't') + .0022 + r, b = envAt(Q.E, z, 'b') - .0022 - r, yc = (t + b) / 2, h = (t - b) / 2; return [Math.cos(a) * w, Math.min(yc + Math.sin(a) * h, capAt(Q.E, z) - .0006 - r * .5), z]; },
      helix: (Q, z0, z1, turns, r, tr, mat, a0 = 0) => { const P = [], n = Math.max(24, Math.round(turns * 18)); for (let i = 0; i <= n; i++) { const q = i / n, z = lp(z0, z1, q); P.push(K.surf(Q, z, a0 + q * turns * TAU, r)); } return K.tubeAlong(P, tr, mat, n * 2, 6, Q.part); },
      shard: (mat, x, y, z, len, rad, rx = 0, ry = 0, rz = 0, part) => { const o = K.mesh(new THREE.OctahedronGeometry(1, 0), mat, x, y, z, rx, ry, rz, part); o.scale.set(rad, len, rad); return o; },
      // where a flat piece lies against the body's side between z0 and z1: its x at each end and the yaw that lays it along
      side: (Q, z0, z1, sx, lift = 0) => { const x0 = K.half(Q, z0) + .0022 + lift, x1 = K.half(Q, z1) + .0022 + lift; return { x: sx * (x0 + x1) / 2, yaw: sx * Math.atan2(x1 - x0, z1 - z0) }; },
    };
    F.gun(K);
    { const acc = []; G.traverse(o => { if (o.isMesh && o.userData.acc) { const b = new THREE.Box3().setFromObject(o); if (b.min.y > by + .012 && Math.abs((b.min.x + b.max.x) / 2) < .03) acc.push(b); } });
      const ceilY = (A.sight || .09) - .003, v = new THREE.Vector3(), inv = new THREE.Matrix4(), made = []; G.traverse(o => { if (o.isMesh && o.userData.formMade && !o.userData.live) made.push(o); }); G.updateMatrixWorld(true);
      for (const o of made) { const pa = o.geometry.attributes.position; inv.copy(o.matrixWorld).invert(); let ch = false;
        for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); let y = v.y;
          if (Math.abs(v.x) < .018 && v.z < (A.rb || .05) && y > ceilY) y = ceilY;
          for (const b of acc) if (v.x > b.min.x - .0002 && v.x < b.max.x + .0002 && v.z > b.min.z - .0002 && v.z < b.max.z + .0002 && y > b.min.y - .0003 && y < b.max.y) y = b.min.y - .0003;
          if (y !== v.y) { v.y = y; v.applyMatrix4(inv); pa.setXYZ(i, v.x, v.y, v.z); ch = true; } }
        if (ch) { pa.needsUpdate = true; o.geometry.computeVertexNormals(); } } }
    G.userData.formRoot = Kg; G.userData.formBy = by;
    { const F = Z.fore, zs = K.at(F, .42), top = Math.min(K.top(F, zs), K.cap(F, zs)) + .003, room = (K.sight - .016) - top, hw = K.half(F, zs) + .0022, R = F.r0 + .01;
      const z1 = K.at(F, .32), z2 = K.at(F, .1), ring = by + R * 1.08 < Math.min(K.sight - .016, K.cap(F, z1), K.cap(F, z2));
      if (room > .058) G.userData.formAt = { x: 0, y: top + .029, z: zs, hw, R, z1, z2, ring, med: R * 1.5 };
      else { const x = -(hw + .03); G.userData.formAt = { x, y: by + .002, z: zs, hw, R, z1, z2, ring, side: true, med: Math.min(R * 1.5, 2 * (K.sight - .007 - by)) };
        const ar = K.mat('arm', () => fstd({ color: flc('#3a3f48'), metalness: .9, roughness: .35 })); K.mesh(new THREE.CylinderGeometry(.0016, .0016, .03 - .006, 8), ar, -(hw + .012), by + .002, zs, 0, 0, Math.PI / 2, F.part);
        K.mesh(new THREE.CylinderGeometry(.0034, .0026, .003, 12), ar, -(hw + .0015), by + .002, zs, 0, 0, Math.PI / 2, F.part); } }
    return true;
  }
  /* For the checks (tools/duelpoint-skin-check.mjs), with window.DP_AUDIT set: every vertex a top line added (its form,
     its glowing parts and its signature piece) tested against what it must never touch: a fitting on top (a rail, a
     sight), the bore and the space in front of it, and the line you aim along. Counts go in G.userData.audit. */
  function formAudit(G, roots, A, bore, len) {
    if (typeof window === 'undefined' || !window.DP_AUDIT) return;
    G.updateMatrixWorld(true); const by = bore ? bore.y : .03, tip = bore ? bore.z : -len, hb = cl((bore ? bore.r : .012) * .42, .0042, .0072), sight = A.sight || .09;
    const acc = []; G.traverse(o => { if (o.isMesh && o.userData.acc) { const b = new THREE.Box3().setFromObject(o); if (b.min.y > by + .012 && Math.abs((b.min.x + b.max.x) / 2) < .03) acc.push(b.expandByScalar(-.0005)); } });
    const out = { rail: 0, bore: 0, front: 0, sight: 0, where: [] }, v = new THREE.Vector3(), seen = new Set();
    roots.forEach((r, ri) => { if (r) r.traverse(o => { if (!o.isMesh || seen.has(o) || o.isSprite || !o.geometry || !o.geometry.attributes.position || o.material === FMAT.bore) return; if (ri > 1) { let f = false; for (let q = o; q && q !== r; q = q.parent) if (q.userData.formMade) f = true; if (!f) return; } seen.add(o); const pa = o.geometry.attributes.position;
      if (o.userData.live && o.geometry.type === 'PlaneGeometry' && o.geometry.parameters.width < .01) return;
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); const rad = Math.hypot(v.x, v.y - by);
        for (const b of acc) if (b.containsPoint(v)) { out.rail++; if (out.where.length < 6) out.where.push('rail ' + v.toArray().map(q => q.toFixed(3))); break; }
        if (v.z < tip + .004 && v.z > tip - .004 && rad < hb - .0004) { out.bore++; if (out.where.length < 6) out.where.push('bore ' + v.toArray().map(q => q.toFixed(3))); }
        if (v.z < tip - .004 && rad < hb * 1.6) { out.front++; if (out.where.length < 6) out.where.push('front ' + v.toArray().map(q => q.toFixed(3))); }
        if (v.y > sight - .0025 && v.y < sight + .016 && v.z < (A.rb || .05) && Math.abs(v.x) < .016) { out.sight++; if (out.where.length < 6) out.where.push('sight ' + v.toArray().map(q => q.toFixed(3))); } } }); });
    G.userData.audit = out;
  }

  /* ---------- the lines ---------- */
  // Phoenix: a firebird. A keeled body running to a golden beak, layered feathers sweeping back down both flanks (short
  // and red at the front, long and gold at the back, each lit along its quill), a wing of three feathers lifting from each
  // side of the receiver, and a fan of tail feathers for a butt
  // a feather: s runs from the root (0) to the pointed tip (1), w across it; the trailing edge is split twice
  const FEATHER = [[0, 0], ['q', .3, .62, .62, .42], ['q', .86, .22, 1, 0], [.84, -.12], [.76, -.06], [.62, -.26], [.55, -.17], ['q', .3, -.46, 0, 0]];
  function feather(zr, yr, len, wid, tilt) { const c = Math.cos(tilt), s = Math.sin(tilt); return FEATHER.map(p => { const f = (a, b) => [zr + a * len * c - b * wid * s, yr + a * len * s + b * wid * c]; return p[0] === 'q' ? ['q', ...f(p[1], p[2]), ...f(p[3], p[4])] : f(p[0], p[1]); }); }
  FORMS.phoenix = {
    gun(K) {
      const { Z, m, by } = K, F = Z.fore, pis = K.fam === 'pistol' || K.fam === 'rev' || K.fam === 'stub';
      const gold = K.mat('gold', () => fstd({ color: flc('#ffbf3a'), metalness: 1, roughness: .26, ei: 1.5 })), quill = K.mat('quill', () => fglow('#ffb04a'));
      const red = K.mat('red', () => fphys({ color: flc('#b8200f'), roughness: .3, metalness: .2, clearcoat: 1, clearcoatRoughness: .1, emissive: flc('#4a0600'), emissiveIntensity: .7 }));
      const orange = K.mat('orange', () => fphys({ color: flc('#ff6a12'), roughness: .3, metalness: .25, clearcoat: 1, clearcoatRoughness: .1, emissive: flc('#7a2200'), emissiveIntensity: .7 }));
      // the body: keeled top and bottom, swelling toward the receiver
      K.loft(F, { n: 2.2, sides: 32, grow: u => .94 + .1 * fss(u), mod: a => 1 + .2 * Math.pow(Math.max(0, Math.sin(a)), 12) + .12 * Math.pow(Math.max(0, -Math.sin(a)), 12) }, m.fin);
      // feathers down each flank, overlapping like plumage
      const nF = pis ? 3 : 5, rows = [red, orange, orange, gold, gold];
      for (let i = 0; i < nF; i++) { const u0 = .06 + i * (.8 / nF), zr = K.at(F, u0), L = (K.at(F, 1) - K.at(F, 0)) * (pis ? .42 : .3) * (1 + i * .12), zt = zr + L, hz = (K.top(F, zr) - K.bot(F, zr)), wd = hz * (pis ? .5 : .62), yr = by + (i % 2 ? -1 : 1) * hz * .08;
        if (zt > F.z1 - .003) continue;
        for (const sx of [-1, 1]) { const S = K.side(F, zr, zt, sx, i * .0005);
          K.flatAt(feather(zr, yr, L, wd, (i % 2 ? -1 : 1) * .05), .0018, rows[i % rows.length], S.x, S.yaw, .0006, F.part);
          K.flatAt([[zr + L * .04, yr - .0005], [zr + L * .8, yr + L * .8 * (i % 2 ? -1 : 1) * .05 - .0003], [zr + L * .8, yr + L * .8 * (i % 2 ? -1 : 1) * .05 + .0003], [zr + L * .04, yr + .0005]], .0006, quill, S.x + sx * .0012, S.yaw, 0, F.part); } }
      // the beak: a golden collar round the muzzle, hooked over the top
      K.muzzle([[0, .0005], [.006, .003], [.03, .0045], [.05, .002], [.056, 0]], gold);
      { const r0 = F.r0, z0 = K.tip - .003, yt = Math.min(by + r0 + .007, K.ceil(F, z0 + .02)), ym = Math.min(by + r0 + .0015, yt - .002), yl = by + Math.max(K.boreR + .0045, r0 * .62);   // the hook stops above the bore
        K.flatAt([[z0 + .045, ym], ['q', z0 + .006, yt, z0 - .008, yl], [z0 + .002, yl + .0025], ['q', z0 + .012, ym, z0 + .035, ym - .0025]], .005, gold, 0, 0, .0008, F.part); }
      const R = Z.recv;
      if (R) {   // the receiver: a shell swept up into a crest at the back, and a wing of three feathers on each side
        K.shell(R, [[0, .05], [0, .9], ['q', .45, 1.02, .82, .98], [.96, 1.1], [1, .7], [1, .05]], m.fin);
        const zA = K.at(R, .3), zB = K.at(R, 1), h = K.top(R, zA) - K.bot(R, zA);
        for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) { const zr = lp(zA, zB, i * .12), L = (zB - zr) * (pis ? .85 : 1.05) - i * .004, yr = lp(K.bot(R, zr), K.top(R, zr), .3 + i * .12);
          K.flatAt(feather(zr, yr, L, h * (.42 - i * .06), (pis ? .12 : .22) - i * .05), .0018, i === 1 ? orange : i ? gold : red, sx * (R.wMax + .0034 + i * .0016), 0, .0006); }
      }
      if (Z.stock) {   // tail feathers: the butt ends in three long points
        const S = Z.stock; K.shell(S, [[0, .12], [0, .9], ['q', .5, 1, .78, .98], [1.04, 1.08], [.94, .78], [1.1, .62], [.94, .44], [1.06, .18], [.86, .06], [.4, .02]], m.fin);
        for (let i = 0; i < 3; i++) { const zr = K.at(S, .1 + i * .08), L = (S.z1 - S.z0) * .7, yr = lp(K.bot(S, zr), K.top(S, zr), .7 - i * .2); for (const sx of [-1, 1]) K.flatAt(feather(zr, yr, L, (K.top(S, zr) - K.bot(S, zr)) * .3, .1 - i * .1), .0018, i === 1 ? orange : gold, sx * (S.wMax + .003), 0, .0006); }
      }
      if (Z.pump) K.loft(Z.pump, { n: 2.2, sides: 24, mod: a => 1 + .2 * Math.pow(Math.max(0, -Math.sin(a)), 10) }, red);
    },
  };

  /* ---------- the other top lines ---------- */
  const fh = (a, b) => { const q = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return q - Math.floor(q); };
  const small = K => K.fam === 'pistol' || K.fam === 'rev' || K.fam === 'stub';
  const iron = K => K.mat('iron', () => fstd({ color: flc('#2a2420'), metalness: .85, roughness: .42, ei: .8 }));
  const goldM = K => K.mat('gold', () => fstd({ color: flc('#ffc23a'), metalness: 1, roughness: .24, ei: 1.6 }));
  // a window through a shell: the shell cut open and a lit core set inside, narrower than the shell, showing through it
  function window_(K, Q, shellPts, holes, shellMat, coreMat) { K.shell(Q, shellPts, shellMat, { holes });
    // the lit core: just big enough to back the openings, so it never shows past the shell's own edge
    const us = holes.flat().map(p => p[0]), vs = holes.flat().map(p => p[1]), u0 = Math.min(...us) - .03, u1 = Math.max(...us) + .03, v0 = Math.min(...vs) - .04, v1 = Math.max(...vs) + .04;
    K.shell(Q, [[u0, v0], [u0, v1], [u1, v1], [u1, v0]], coreMat, { w: Q.wMax * 2 - .001, bev: .0006 }); }
  // a flat flame drawn upward from its foot: w wide, h tall
  const flame = (z, y, w, h) => [[z - w / 2, y], ['q', z - w * .7, y + h * .45, z - w * .12, y + h * .7], ['q', z - w * .1, y + h * .86, z + w * .04, y + h], ['q', z + w * .3, y + h * .7, z + w * .2, y + h * .5], ['q', z + w * .62, y + h * .32, z + w / 2, y]];

  // Inferno: a furnace. Square-shouldered charcoal, a heat sink of fins ringing the barrel, a grate on each flank with
  // the fire showing through, a chimney of a muzzle and a firebox window in the receiver
  FORMS.inferno = { gun(K) {
    const { Z, m, by } = K, F = Z.fore, ir = iron(K), fire = K.mat('fire', () => fsolid('#ff6a1a')), hot = K.mat('hot', () => fsolid('#ffc070')), st = { n: 5, sides: 32 };
    K.loft(F, st, m.fin);
    const nf = small(K) ? 5 : 9; for (let i = 0; i < nf; i++) { const z = K.at(F, .06 + i * (.46 / nf)); K.band(F, z - .0011, z + .0011, small(K) ? .0028 : .0042, ir, st); }
    for (const sx of [-1, 1]) { const za = K.at(F, .58), zb = K.at(F, .9), S = K.side(F, za, zb, sx), h = (K.top(F, (za + zb) / 2) - K.bot(F, (za + zb) / 2)) * .42;
      K.flatAt([[za, by - h / 2], [zb, by - h / 2], [zb, by + h / 2], [za, by + h / 2]], .0012, fire, S.x - sx * .0004, S.yaw, 0, F.part);
      for (let i = 0; i <= 5; i++) { const z = lp(za, zb, i / 5); K.flatAt([[z - .0012, by - h / 2 - .0015], [z + .0012, by - h / 2 - .0015], [z + .0012, by + h / 2 + .0015], [z - .0012, by + h / 2 + .0015]], .002, ir, S.x + sx * .0008, S.yaw, 0, F.part); }
      K.flatAt([[za - .002, by - h / 2 - .002], [zb + .002, by - h / 2 - .002], [zb + .002, by + h / 2 + .002], [za - .002, by + h / 2 + .002], [za - .002, by - h / 2 - .002], [za, by - h / 2], [za, by + h / 2], [zb, by + h / 2], [zb, by - h / 2], [za, by - h / 2]], .0016, ir, S.x + sx * .0006, S.yaw, 0, F.part); }
    K.muzzle([[0, .002], [.004, .002], [.005, 0], [.009, .002], [.013, .002], [.014, 0], [.018, .002], [.022, .002], [.026, 0]], ir, 8, Math.PI / 8);
    K.mesh(new THREE.RingGeometry(K.boreR + .0004, K.boreR + .0018, 16), hot, 0, by, K.tip - .0035, 0, Math.PI, 0, F.part);
    if (Z.recv) window_(K, Z.recv, [[0, .04], [0, .96], [.12, 1], [.88, 1], [1, .86], [1, .04]], [[[.22, .3], [.7, .3], [.7, .62], [.22, .62]]], m.fin, fire);
    if (Z.stock) window_(K, Z.stock, [[0, .1], [0, .95], [1, 1], [1, .02], [.5, .1]], [[[.2, .42], [.4, .42], [.4, .55], [.2, .55]], [[.48, .4], [.68, .4], [.68, .53], [.48, .53]]], m.fin, fire);
    if (Z.pump) K.loft(Z.pump, { n: 5, sides: 24 }, ir);
  } };

  // Storm Coil: a Tesla gun. A slim gunmetal barrel wound with copper, a stack of white insulators, capacitors along the
  // flanks and two copper horns at the muzzle that the lightning jumps between
  FORMS.storm = { gun(K) {
    const { Z, m, by } = K, F = Z.fore, cu = K.mat('cu', () => fstd({ color: flc('#c8743a'), metalness: 1, roughness: .28, ei: 1.4 })), cer = K.mat('cer', () => fphys({ color: flc('#ece8de'), roughness: .35, metalness: 0, clearcoat: 1 })), arc = K.mat('arc', () => fsolid('#bff2ff')), glass = K.mat('glass', () => fphys({ color: flc('#cfefff'), roughness: .05, transparent: true, opacity: .35, clearcoat: 1, depthWrite: false }));
    const st = { n: 2.2, sides: 28 }; K.loft(F, st, m.fin);
    const z0 = K.at(F, .08), z1 = K.at(F, small(K) ? .7 : .6); K.helix(F, z0, z1, Math.max(6, Math.round((z1 - z0) / .009)), .0016, .0013, cu);
    for (const q of [.68, .74, .8]) { const z = K.at(F, small(K) ? q + .06 : q); if (z < F.z1 - .004) K.band(F, z - .0022, z + .0022, .004, cer, st); }
    if (!small(K)) for (const sx of [-1, 1]) { const z = K.at(F, .86), p = K.surf(F, z, sx > 0 ? -.35 : Math.PI + .35, .004); K.mesh(new THREE.CylinderGeometry(.0042, .0042, .04, 12), glass, p[0], p[1], z, Math.PI / 2, 0, 0, F.part); K.mesh(new THREE.CylinderGeometry(.0018, .0018, .038, 8), arc, p[0], p[1], z, Math.PI / 2, 0, 0, F.part); for (const dz of [-.021, .021]) K.mesh(new THREE.CylinderGeometry(.0048, .0048, .004, 12), cu, p[0], p[1], z + dz, Math.PI / 2, 0, 0, F.part); }
    K.muzzle([[0, .001], [.003, .002], [.012, .0022], [.016, 0]], cu);
    K.crown(2, (i, a, x, y, z) => { const sx = i ? -1 : 1; K.extrude([[z + .016, y - .0016], [z - .004, y - .0012], ['q', z - .012, y, z - .014, y + .004], [z - .01, y + .004], ['q', z - .006, y + .0014, z + .016, y + .0016]], .0026, cu, x + sx * .001, .0006, F.part); }, 0);
    if (Z.recv) { const R = Z.recv; K.shell(R, [[0, .08], ['q', 0, .95, .12, .98], [.88, .98], ['q', 1, .95, 1, .08], [.5, 0]], m.fin); K.plate(R, [[.15, .35], [.85, .35], [.85, .5], [.15, .5]], cu, { th: .0016 }); }
    if (Z.stock) { const S = Z.stock; K.shell(S, [[0, .2], [0, .9], [1, .98], [1, .05], [.6, .1]], m.fin); for (const q of [.35, .5]) K.plate(S, [[q, .1], [q + .05, .1], [q + .05, .9], [q, .9]], cu, { th: .0016 }); }
    if (Z.pump) K.loft(Z.pump, st, cer);
  } };

  // Nebula: an organic shell of night sky, swelling like a seed pod, with a planet turning in a porthole on the receiver
  FORMS.nebula = { gun(K) {
    const { Z, m, by } = K, F = Z.fore, sil = K.mat('sil', () => fstd({ color: flc('#c9c2e8'), metalness: 1, roughness: .2, ei: 1.4 })), star = K.mat('star', () => fsolid('#e8d8ff'));
    const planet = K.mat('planet', () => fphys({ color: flc('#7a4ad8'), emissive: flc('#5a2ab8'), emissiveIntensity: .8, roughness: .3, clearcoat: 1 })), ringM = K.mat('ringM', () => fglow('#f0c8ff', .8));
    const st = { n: 2, sides: 36, grow: u => .8 + .3 * Math.sin(Math.PI * Math.min(1, u * 1.1)) };
    K.loft(F, st, m.fin);
    for (const sx of [-1, 1]) { const za = K.at(F, .7), zb = K.at(F, .98), S = K.side(F, za, zb, sx, .001), h = K.top(F, zb) - by; K.flatAt([[za, by + .002], ['q', lp(za, zb, .6), by + h * .4, zb, by + h * 1.05], [zb, by - .002]], .0016, sil, S.x, S.yaw, .0005, F.part); }
    K.muzzle([[0, 0], [.004, .0012], [.012, .0016], [.02, 0]], sil);
    K.mesh(new THREE.TorusGeometry(Z.fore.r0 * .72, .0007, 6, 32), star, 0, by, K.tip - .0034, 0, 0, 0, F.part);
    const R = Z.recv; if (R) {
      const c = [.5, .48], rr = .3; K.shell(R, [[0, .1], ['q', 0, .95, .3, .98], ['q', .7, 1.02, .92, .82], ['q', 1.03, .5, .95, .12], ['q', .5, -.04, 0, .1]], m.fin, { holes: [Array.from({ length: 20 }, (_, i) => [c[0] + Math.cos(i / 20 * TAU) * rr * .55, c[1] + Math.sin(i / 20 * TAU) * rr])] });
      const zc = K.at(R, c[0]), yc = lp(K.bot(R, zc), K.top(R, zc), c[1]), pr = (K.top(R, zc) - K.bot(R, zc)) * rr * .82;
      const g = K.group(0, yc, zc), pl = new THREE.Mesh(new THREE.SphereGeometry(pr * .62, 20, 14), planet); g.add(pl);
      const rg = new THREE.Mesh(new THREE.TorusGeometry(pr * .95, pr * .06, 4, 32), ringM); rg.rotation.set(1.2, .3, 0); g.add(rg);
      g.userData.live = true; g.userData.anim = (o, t) => { pl.rotation.y = t * .6; rg.rotation.z = t * .25; }; pl.userData.live = rg.userData.live = true;
      for (const sx of [-1, 1]) K.mesh(new THREE.TorusGeometry(pr * 1.05, .0013, 6, 28), sil, sx * (R.wMax + .0026), yc, zc, 0, Math.PI / 2, 0);
    }
    if (Z.stock) K.shell(Z.stock, [[0, .12], ['q', .1, .95, .5, .96], ['q', .95, .98, 1.02, .7], ['q', 1.04, .1, .8, .04], [.3, .02]], m.fin);
    if (Z.pump) K.loft(Z.pump, { n: 2, sides: 28 }, m.fin);
  } };

  // Aurora: a slim polar-night body with curtains of green and rose light flowing in ribbons down both flanks
  function ribbon(K, Q, sx, amp, freq, ph, w, colA, colB) {
    const za = K.at(Q, .04), zb = K.at(Q, .96), n = 60, P = [], C = [], idx = [], ca = new THREE.Color(colA).convertSRGBToLinear(), cb = new THREE.Color(colB).convertSRGBToLinear();
    for (let i = 0; i <= n; i++) { const q = i / n, z = lp(za, zb, q), x = sx * (K.half(Q, z) + .0035), yc = K.by + Math.sin(q * TAU * freq + ph) * amp * (K.top(Q, z) - K.bot(Q, z)), tw = Math.sin(q * TAU * freq * .5 + ph) * .7, h = w * (K.top(Q, z) - K.bot(Q, z)) * (.55 + .45 * Math.sin(q * Math.PI));
      P.push(x - sx * Math.sin(tw) * h * .2, yc - h * .5, z, x + sx * Math.sin(tw) * h * .2, yc + h * .5, z); const c = ca.clone().lerp(cb, (Math.sin(q * TAU * 1.3 + ph) + 1) / 2); C.push(c.r, c.g, c.b, c.r * .3, c.g * .3, c.b * .3); if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(idx); g.computeVertexNormals();
    const mat = K.mat('rib', () => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    const o = K.mesh(g, mat, 0, 0, 0, 0, 0, 0, Q.part); o.userData.live = true; o.userData.anim = (ob, t) => { ob.material.opacity = .7 + .2 * Math.sin(t * 1.7); }; return o;
  }
  FORMS.aurora = { gun(K) {
    const { Z, m } = K, F = Z.fore, ice = K.mat('ice', () => fstd({ color: flc('#e6f4f2'), metalness: .3, roughness: .3, ei: 1.1 }));
    const st = { n: 2.4, sides: 30, grow: u => .9 + .08 * fss(u) }; K.loft(F, st, m.fin);
    for (const sx of [-1, 1]) { ribbon(K, F, sx, .18, 1.5, sx > 0 ? 0 : 1.7, .5, '#5aff9a', '#ff6ad8'); }
    for (const q of [.3, .62]) { const z = K.at(F, q); K.band(F, z - .0016, z + .0016, .0012, ice, st); }
    K.muzzle([[0, .0008], [.006, .0016], [.016, 0]], ice);
    if (Z.recv) { const R = Z.recv; K.shell(R, [[0, .05], [0, .88], ['q', .2, 1.04, .4, .9], ['q', .6, .76, .8, .96], [1, 1.02], [1, .05]], m.fin); ribbon(K, R, -1, .12, 1, 2.2, .45, '#5aff9a', '#7ac8ff'); ribbon(K, R, 1, .12, 1, .4, .45, '#5aff9a', '#7ac8ff'); }
    if (Z.stock) { K.shell(Z.stock, [[0, .1], [0, .9], ['q', .3, 1.05, .55, .9], ['q', .8, .75, 1, .96], [1, .05]], m.fin); }
    if (Z.pump) K.loft(Z.pump, st, ice);
  } };

  // Tempest: a storm engine. A fluted body that twists toward the muzzle, a turbine duct ringing the barrel, swept vanes
  // at the back of it and a vortex of blades round the muzzle
  FORMS.tempest = { gun(K) {
    const { Z, m, by } = K, F = Z.fore, steel = K.mat('steel', () => fstd({ color: flc('#b8c4d4'), metalness: 1, roughness: .22, ei: 1.5 })), bolt = K.mat('bolt', () => fsolid('#bfe8ff'));
    const st = { n: 2, sides: 36, mod: (a, u) => 1 + .045 * Math.cos(6 * a + u * 26) }; K.loft(F, st, m.fin);
    const zd = K.at(F, small(K) ? .3 : .34), dw = small(K) ? .006 : .011; K.band(F, zd - dw, zd + dw, .0055, steel, { n: 2, sides: 36 }); K.band(F, zd - dw * .3, zd + dw * .3, .0068, bolt, { n: 2, sides: 36 });
    for (const sx of [-1, 1]) { const za = K.at(F, .74), zb = K.at(F, .98), S = K.side(F, za, zb, sx, .0008), y0 = by, h = (K.top(F, zb) - K.bot(F, zb)) * .55;
      K.flatAt([[za, y0], [zb, y0 + h * .2], [zb + .004, y0 + h * .55], [zb - .006, y0 + h * .5], ['q', lp(za, zb, .5), y0 + h * .2, za, y0 + .002]], .0016, steel, S.x, S.yaw, .0005, F.part); }
    K.muzzle([[0, .0006], [.01, .0016], [.02, 0]], steel);
    K.crown(6, (i, a, x, y, z) => { const o = K.mesh(new THREE.BoxGeometry(.0016, .0055, .012), steel, x * 1.04, by + (y - by) * 1.04, z + .006, 0, 0, a + Math.PI / 2, F.part); o.rotation.y = .5; o.rotation.order = 'ZYX'; }, .3);
    if (Z.recv) { const R = Z.recv; K.shell(R, [[0, .1], [0, .82], ['q', .25, 1.03, .6, 1.0], [1, .96], [1, .1]], m.fin); K.plate(R, [[.1, .25], ['q', .3, .55, .55, .5], [.5, .3], ['q', .3, .3, .1, .25]], steel, { th: .0018 }); }
    if (Z.stock) K.shell(Z.stock, [[0, .15], ['q', .3, .95, .6, .95], [1, .95], [1, .05], ['q', .5, 0, 0, .15]], m.fin);
    if (Z.pump) K.loft(Z.pump, st, steel);
  } };

  // Prism: cut crystal. A hexagonal body that tapers to a point at the muzzle, crystals growing from the flanks and the
  // back of the receiver, and a ring of them round the muzzle
  FORMS.prism = { gun(K) {
    const { Z, m, by } = K, F = Z.fore, gem = K.mat('gem', () => fphys({ color: flc('#f4ecff'), roughness: .05, metalness: .15, clearcoat: 1, clearcoatRoughness: 0, emissive: flc('#ff8ae6'), emissiveIntensity: .22, flatShading: true, ei: 2 }));
    const gem2 = K.mat('gem2', () => fphys({ color: flc('#bfeaff'), roughness: .04, metalness: .1, clearcoat: 1, emissive: flc('#5ad0ff'), emissiveIntensity: .3, flatShading: true, transparent: true, opacity: .82, ei: 2 }));
    const st = { n: 2, sides: 6, flat: true, rot: 0, grow: u => .8 + .24 * fss(Math.min(1, u * 1.5)) }; K.loft(F, st, m.fin);
    const n = small(K) ? 1 : 2; for (let i = 0; i < n; i++) for (const sx of [-1, 1]) { const z = K.at(F, .45 + i * .25), p = K.surf(F, z, sx > 0 ? .25 : Math.PI - .25, -.002), L = small(K) ? .012 : .022; K.shard(i ? gem2 : gem, p[0], p[1], z + L * .3, L, L * .26, -1.1, 0, -sx * .55, F.part); }
    K.muzzle([[0, 0], [.005, .002], [.014, 0]], gem, 6);
    K.crown(5, (i, a, x, y, z) => { if (Math.abs(Math.sin(a) - 1) < .2) return; K.shard(i % 2 ? gem2 : gem, x * 1.05, by + (y - by) * 1.05, z + .004, .012, .0028, Math.PI / 2 - .35 * Math.sin(a) * 0, 0, 0, F.part).lookAt(new THREE.Vector3(x * 3, by + (y - by) * 3, z - .02)); }, Math.PI / 2 + .3);
    const R = Z.recv; if (R) { K.shell(R, [[0, .1], [0, .8], [.2, 1], [.7, 1], [1, .75], [1, .1], [.8, 0], [.2, 0]], m.fin, { bev: .0008 });
      const zb = K.freeTop(R, .55, .99, .02), yb = zb == null ? 0 : K.top(R, zb); if (zb != null) for (let i = 0; i < 3; i++) K.shard(i % 2 ? gem2 : gem, (i - 1) * .006, yb + .006, zb - .004 + i * .003, .016 - i * .003, .0035, -.5 - i * .15, 0, (i - 1) * .3); }
    if (Z.stock) K.shell(Z.stock, [[0, .15], [0, .85], [.3, 1], [1, .9], [1, .1], [.7, 0]], gem2, { bev: .0008 });
    if (Z.pump) K.loft(Z.pump, { n: 2, sides: 6, flat: true }, gem);
  } };

  // Magma Flow: a body of rough black rock with lava running in its cracks, molten drops hanging under the barrel and a
  // rock collar round a glowing muzzle
  FORMS.magmaflow = { gun(K) {
    const { Z, m, by } = K, F = Z.fore, rock = K.mat('rock', () => fstd({ color: flc('#1c1512'), roughness: .9, metalness: .05, flatShading: true, ei: .3 })), lava = K.mat('lava', () => fsolid('#ff5a10')), hot = K.mat('hot', () => fsolid('#ffc070'));
    const st = { n: 2.4, sides: 20, flat: true, mod: (a, u, i) => 1 + .1 * (fh(Math.round(a * 3.2), i) - .5) }; K.loft(F, st, m.fin);
    const nd = small(K) ? 2 : 3; for (let i = 0; i < nd; i++) { const z = K.at(F, .25 + i * .22), yb = K.bot(F, z) - .0015, s = small(K) ? .0026 : .0036;
      K.mesh(new THREE.SphereGeometry(s, 10, 8), lava, 0, yb - s * .9, z, 0, 0, 0, F.part); K.mesh(new THREE.ConeGeometry(s * .95, s * 1.6, 10), lava, 0, yb - s * .1, z, Math.PI, 0, 0, F.part); K.mesh(new THREE.SphereGeometry(s * .5, 8, 6), hot, 0, yb - s * 1.1, z - s * .3, 0, 0, 0, F.part); }
    K.muzzle([[0, .002], [.004, .0035], [.01, .0025], [.015, .004], [.022, .001], [.026, 0]], rock, 9);
    K.mesh(new THREE.RingGeometry(K.boreR + .0004, K.boreR + .0024, 16), hot, 0, by, K.tip - .0035, 0, Math.PI, 0, F.part);
    const jag = (n, top) => { const P = []; for (let i = 0; i <= n; i++) P.push([i / n, top + (fh(i, 3) - .5) * .12]); return P; };
    if (Z.recv) K.shell(Z.recv, [[0, .05]].concat(jag(7, .95)).concat([[1, .05]]), m.fin, { bev: .0015 });
    if (Z.stock) K.shell(Z.stock, [[0, .1]].concat(jag(6, .92)).concat([[1.02, .5], [1, .06], [.5, .02]]), m.fin, { bev: .0015 });
    if (Z.pump) K.loft(Z.pump, st, rock);
  } };

  // Permafrost: the gun frozen into a block of old blue ice (the steel shows through it), icicles hanging under the barrel
  FORMS.permafrost = { gk: { pts: 'frost', muzzle: 1, c2: '#ffffff' }, gun(K) {
    const { Z, m, by } = K, F = Z.fore, ice = K.mat('ice', () => fphys({ color: flc('#cfe9ff'), roughness: .06, metalness: 0, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .5, emissive: flc('#2a7ad0'), emissiveIntensity: .25, ei: 2 }));
    const ice2 = K.mat('ice2', () => fphys({ color: flc('#e8f6ff'), roughness: .1, clearcoat: 1, transparent: true, opacity: .8, emissive: flc('#4aa8ff'), emissiveIntensity: .35, ei: 2 }));
    const st = { n: 4.5, sides: 32, off: .0035 }; K.loft(F, st, ice);
    const ni = small(K) ? 4 : 8; for (let i = 0; i < ni; i++) { const z = K.at(F, .08 + i * (.8 / ni) + (fh(i, 1) - .5) * .03), yb = K.bot(F, z) - .0032, L = (small(K) ? .007 : .012) * (.6 + fh(i, 2)); K.mesh(new THREE.ConeGeometry(L * .22, L, 6), ice2, (fh(i, 5) - .5) * .008, yb - L / 2 + .0008, z, Math.PI, 0, 0, F.part); }
    K.muzzle([[0, .0015], [.006, .003], [.012, .001], [.016, 0]], ice2, 7);
    const nt = small(K) ? 4 : 7; for (let i = 0; i < nt; i++) { const z = K.at(F, .15 + i * (.75 / nt)), y0 = Math.min(K.top(F, z), K.cap(F, z)) + .003, room = K.ceil(F, z) - y0; if (room < .004) continue; const L = Math.min(room, (small(K) ? .008 : .014) * (.6 + fh(i, 9) * .5)); K.mesh(new THREE.ConeGeometry(L * .2, L, 5), ice2, (fh(i, 4) - .5) * .006, y0 + L / 2 - .001, z, (fh(i, 6) - .5) * .5, 0, (fh(i, 8) - .5) * .5, F.part); }
    if (Z.recv) { K.shell(Z.recv, [[0, .05], [0, .95], [1, .95], [1, .05]], ice, { gap: .0035 }); }
    if (Z.stock) K.shell(Z.stock, [[0, .1], [0, .9], [1, .95], [1, .05]], ice, { gap: .0035 });
    if (Z.pump) K.loft(Z.pump, st, ice);
  } };

  // Fission: a reactor. Hazard plating grooved like a cooling jacket with the blue core glowing in every groove, coolant
  // lines running back into the receiver and a reactor cell behind glass on its flank
  FORMS.fission = { gk: { pts: 'motes', sight: 1, c2: '#9ad0ff' }, gun(K) {
    const { Z, m, by } = K, F = Z.fore, core = K.mat('core', () => fsolid('#4a8dff')), pipe = K.mat('pipe', () => fstd({ color: flc('#9aa4b2'), metalness: 1, roughness: .3, ei: 1.3 })), glass = K.mat('glass', () => fphys({ color: flc('#cfe4ff'), roughness: .04, transparent: true, opacity: .3, clearcoat: 1, depthWrite: false }));
    const L = Math.abs(F.z1 - F.z0), per = .018 / L, gr = u => { const f = (u / per) % 1; return f < .18 ? 1 : 0; };
    const st = { n: 2.2, sides: 28, mod: (a, u) => 1 - .06 * gr(u) }; K.loft(F, st, m.fin);
    for (let u = per * .09; u < .96; u += per) { const z = K.at(F, u); if (z < F.z0 + .014) continue; K.band(F, z - .0008, z + .0008, -.0004, core, { n: 2.2, sides: 28 }); }
    if (!small(K)) for (const sx of [-1, 1]) { const P = []; for (let i = 0; i <= 6; i++) { const z = K.at(F, .1 + i * .15); P.push(K.surf(F, z, sx > 0 ? -.45 : Math.PI + .45, .0026)); } const zr = Z.recv ? K.at(Z.recv, .1) : F.z1; P.push([sx * (Z.recv ? Z.recv.wMax + .002 : .02), by - .006, zr]); K.tubeAlong(P, .0019, pipe, 60, 8); }
    K.muzzle([[0, .001], [.003, .003], [.006, .001], [.009, .003], [.012, .001], [.016, 0]], pipe);
    K.mesh(new THREE.RingGeometry(K.boreR + .0005, K.boreR + .0016, 16), core, 0, by, K.tip - .0034, 0, Math.PI, 0, F.part);
    const R = Z.recv; if (R) { K.shell(R, [[0, .05], [0, .9], [.1, 1], [.9, 1], [1, .9], [1, .05]], m.fin);
      const zc = K.at(R, .5), yc = lp(K.bot(R, zc), K.top(R, zc), .45), len = (R.z1 - R.z0) * .5, rr = Math.min(.0075, (K.top(R, zc) - K.bot(R, zc)) * .22), x = -(R.wMax + .0018 + rr);
      K.mesh(new THREE.CylinderGeometry(rr, rr, len, 16, 1, true), glass, x, yc, zc, Math.PI / 2); K.mesh(new THREE.CylinderGeometry(rr * .45, rr * .45, len * .96, 10), core, x, yc, zc, Math.PI / 2); for (const dz of [-len / 2, len / 2]) K.mesh(new THREE.CylinderGeometry(rr * 1.15, rr * 1.15, .004, 16), pipe, x, yc, zc + dz, Math.PI / 2); }
    if (Z.stock) { const S = Z.stock; K.shell(S, [[0, .1], [0, .92], [1, .98], [1, .04]], m.fin); for (let i = 0; i < 4; i++) K.plate(S, [[.2 + i * .15, .2], [.27 + i * .15, .2], [.27 + i * .15, .8], [.2 + i * .15, .8]], pipe, { th: .0014 }); }
    if (Z.pump) K.loft(Z.pump, st, m.fin);
  } };

  // Cinderwake: volcanic glass. A five-sided black body with blades of obsidian raking back along it, three claws round
  // the muzzle and a shattered edge to the receiver
  const blade = (z, y, len, h, up) => [[z, y], [z + len, y + up * h * .2], [z + len * .25, y + up * h]];
  FORMS.cinderwake = { gk: { pts: 'sparks', muzzle: 1, c2: '#ffc04a' }, gun(K) {
    const { Z, m, by } = K, F = Z.fore, obs = K.mat('obs', () => fphys({ color: flc('#100a09'), roughness: .06, metalness: .4, clearcoat: 1, emissive: flc('#ff3a0a'), emissiveIntensity: .12, flatShading: true, ei: 1.8 }));
    const st = { n: 2, sides: 5, flat: true, rot: Math.PI / 2 }; K.loft(F, st, m.fin);
    const nb = small(K) ? 2 : 4; for (let i = 0; i < nb; i++) for (const sx of [-1, 1]) { const z = K.at(F, .12 + i * (.72 / nb)), L = (F.z1 - F.z0) * (small(K) ? .35 : .2), S = K.side(F, z, Math.min(z + L, F.z1 - .002), sx, .0004), yb = by + (i % 2 ? -1 : 1) * .002, up = i % 2 ? -1 : 1; let h = (K.top(F, z) - K.bot(F, z)) * .75; if (up > 0) h = Math.min(h, K.ceil(F, z) - yb - .002); if (h > .003) K.flatAt(blade(z, yb, Math.min(L, F.z1 - .002 - z), h, up), .0018, obs, S.x, S.yaw, .0004, F.part); }
    K.muzzle([[0, .001], [.012, .0016], [.016, 0]], obs, 5, Math.PI / 2);
    K.crown(3, (i, a, x, y, z) => { const o = K.mesh(new THREE.ConeGeometry(.0026, .016, 4), obs, x * 1.02, by + (y - by) * 1.02, z - .004, 0, 0, 0, F.part); o.lookAt(new THREE.Vector3(x * 1.5, by + (y - by) * 1.5, z - .05)); o.rotateX(Math.PI / 2); }, -Math.PI / 2);
    if (Z.recv) K.shell(Z.recv, [[0, .05], [0, .85], [.15, .97], [.3, .88], [.45, 1.0], [.62, .9], [.8, 1.02], [1, .85], [1, .05]], m.fin, { bev: .0008 });
    if (Z.stock) K.shell(Z.stock, [[0, .1], [0, .9], [.5, 1.02], [1.04, .98], [.9, .7], [1.06, .45], [.92, .2], [1, .04], [.4, .02]], m.fin, { bev: .0008 });
    if (Z.pump) K.loft(Z.pump, st, obs);
  } };

  // Voidline: armour of black glass in segments that do not quite meet, the violet light inside showing at every seam,
  // two rings turning round the muzzle and a crystal riding in a cradle at the back of the receiver
  FORMS.voidline = { gun(K) {
    const { Z, m, by } = K, F = Z.fore, vi = K.mat('vi', () => fsolid('#b46bff')), obs = K.mat('obs', () => fphys({ color: flc('#0c0a14'), roughness: .1, metalness: .6, clearcoat: 1, emissive: flc('#3a1a6a'), emissiveIntensity: .3, ei: 1.6 }));
    const st = { n: 2.6, sides: 30 }; K.loft(F, Object.assign({}, st, { off: .0012 }), vi);
    const segs = small(K) ? 3 : 5; for (let i = 0; i < segs; i++) { const za = lp(F.z0, F.z1, i / segs) + (i ? .0025 : -.0012), zb = lp(F.z0, F.z1, (i + 1) / segs) - .0025; K.band(F, za, zb, .0012, i % 2 ? obs : m.fin, st); }
    K.muzzle([[0, .0006], [.008, .0012], [.014, 0]], obs);
    const r0 = F.r0; for (const [r, sp] of [[r0 + .006, 1.6], [r0 + .0035, -2.3]]) { if (by + r > K.ceil(F, K.tip)) continue; const o = K.mesh(new THREE.TorusGeometry(r, .0011, 6, 40), vi, 0, by, K.tip + .002, 0, 0, 0, F.part); K.live(o, (ob, t) => { ob.rotation.set(t * sp * .3, t * sp * .5, 0); }); }
    const R = Z.recv; if (R) { K.shell(R, [[0, .05], [0, .9], [.4, .98], [1, .92], [1, .05]], m.fin); K.plate(R, [[.33, .05], [.36, .05], [.36, .95], [.33, .95]], vi, { th: .0008, gap: .0026 }); K.plate(R, [[.66, .05], [.69, .05], [.69, .95], [.66, .95]], vi, { th: .0008, gap: .0026 });
      const zc = K.freeTop(R, .55, .99, .022); if (zc != null) { const yt = K.top(R, zc) + .002; for (const sx of [-1, 1]) K.extrude([[zc - .006, yt - .002], [zc + .006, yt - .002], [zc + .003, yt + .01], [zc - .001, yt + .01]], .0018, obs, sx * .0055, .0004);
        const cr = K.mesh(new THREE.OctahedronGeometry(.0055, 0), vi, 0, yt + .011, zc); cr.scale.set(1, 1.7, 1); K.live(cr, (o, t) => { o.rotation.y = t * 1.3; o.position.y = yt + .011 + Math.sin(t * 2) * .0012; }); } }
    if (Z.stock) { K.shell(Z.stock, [[0, .1], [0, .9], [1, .96], [1, .04]], obs); K.plate(Z.stock, [[.45, .1], [.48, .1], [.48, .9], [.45, .9]], vi, { th: .0008, gap: .0026 }); }
    if (Z.pump) K.loft(Z.pump, st, obs);
  } };

  // Solaris: white ceramic banded in gold, a sunburst crown round the muzzle, a sun medallion on each flank of the
  // receiver and gold blades sweeping back along it like folded wings
  FORMS.solaris = { gun(K) {
    const { Z, m, by } = K, F = Z.fore, g = goldM(K), sun = K.mat('sun', () => fsolid('#ffd27a')), cer = K.mat('cer', () => fphys({ color: flc('#f8f4ec'), roughness: .25, metalness: .05, clearcoat: 1, ei: 1.2 }));
    const st = { n: 2.6, sides: 30 }; K.loft(F, st, cer);
    for (const q of [.2, .5, .8]) { const z = K.at(F, q); K.band(F, z - .0018, z + .0018, .0012, g, st); }
    K.muzzle([[0, .001], [.006, .0018], [.014, 0]], g);
    K.crown(12, (i, a, x, y, z) => { const L = i % 2 ? .006 : .0095; K.mesh(new THREE.ConeGeometry(.0016, L, 4), i % 2 ? sun : g, x + Math.cos(a) * L / 2, by + (y - by) + Math.sin(a) * L / 2, z + .002, 0, 0, a - Math.PI / 2, F.part); });
    const R = Z.recv; if (R) { K.shell(R, [[0, .05], [0, .9], ['q', .5, 1.02, 1, .92], [1, .05]], cer);
      const zc = K.at(R, .45), yc = lp(K.bot(R, zc), K.top(R, zc), .45), rr = (K.top(R, zc) - K.bot(R, zc)) * .3;
      for (const sx of [-1, 1]) { const x = sx * (R.wMax + .0028); K.mesh(new THREE.CylinderGeometry(rr, rr, .0014, 24), g, x, yc, zc, 0, 0, Math.PI / 2); K.mesh(new THREE.CylinderGeometry(rr * .55, rr * .55, .0018, 24), sun, x + sx * .0003, yc, zc, 0, 0, Math.PI / 2);
        for (let i = 0; i < 3; i++) { const za = K.at(R, .62 + i * .02), zb = K.at(R, 1) + (small(K) ? .004 : .02), y0 = lp(K.bot(R, za), K.top(R, za), .62 - i * .14); K.extrude([[za, y0], ['q', lp(za, zb, .5), y0 + .006, zb, y0 + .008 - i * .002], ['q', lp(za, zb, .55), y0 + .001, za, y0 - .002]], .0014, g, x + sx * (.0012 + i * .0012), .0004); } } }
    if (Z.stock) { K.shell(Z.stock, [[0, .1], [0, .9], ['q', .5, 1, 1, .95], [1, .04]], cer); K.plate(Z.stock, [[.05, .55], ['q', .5, .8, 1, .82], [1, .74], ['q', .5, .7, .05, .5]], g, { th: .0014 }); }
    if (Z.pump) K.loft(Z.pump, st, cer);
  } };

  // Celestial: porcelain mapped with stars, banded in gold like an astronomer's instrument, an armillary sphere turning on
  // the receiver's flank and an eight-point star round the muzzle
  FORMS.celestial = { gun(K) {
    const { Z, m, by } = K, F = Z.fore, g = goldM(K), navy = K.mat('navy', () => fstd({ color: flc('#1a2448'), metalness: .6, roughness: .3, ei: 1.1 })), orb = K.mat('orb', () => fsolid('#ffe6a0'));
    const st = { n: 3, sides: 32 }; K.loft(F, st, m.fin);
    for (const q of [.15, .45, .75]) { const z = K.at(F, q); K.band(F, z - .003, z + .003, .0008, navy, st); K.band(F, z - .0009, z + .0009, .0016, g, st); }
    K.muzzle([[0, .0008], [.008, .0014], [.012, 0]], navy);
    { const r0 = F.r0, z0 = K.tip - .0032, P = []; const room = K.ceil(F, z0) - by; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; let r = i % 2 ? r0 + .0015 : r0 + (i % 4 ? .0045 : .0075); if (Math.sin(a) > .05) r = Math.max(r0 + .0004, Math.min(r, room / Math.sin(a))); P.push([Math.cos(a) * r, Math.sin(a) * r]); }
      const sh = new THREE.Shape(); P.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); sh.holes.push(new THREE.Path().absarc(0, 0, r0 - .0004, 0, TAU, true)); const ge = new THREE.ExtrudeGeometry(sh, { depth: .0016, bevelEnabled: false }); K.mesh(ge, g, 0, by, z0 + .006, 0, 0, 0, F.part); }
    const R = Z.recv; if (R) { K.shell(R, [[0, .05], [0, .92], [1, .92], [1, .05]], m.fin); K.plate(R, [[0, .78], [1, .78], [1, .86], [0, .86]], g, { th: .0012 });
      const zc = K.at(R, .5), yc = lp(K.bot(R, zc), K.top(R, zc), .45), rr = Math.min(.016, (K.top(R, zc) - K.bot(R, zc)) * .42), x = -(R.wMax + rr + .003);
      K.mesh(new THREE.CylinderGeometry(.0018, .0018, rr + .004, 8), g, x + rr / 2 + .001, yc, zc, 0, 0, Math.PI / 2);
      const arm = K.group(x, yc, zc); arm.userData.live = true;
      const core = new THREE.Mesh(new THREE.SphereGeometry(rr * .3, 14, 10), orb); arm.add(core); const rings = [0, 1, 2].map(i => { const o = new THREE.Mesh(new THREE.TorusGeometry(rr * (1 - i * .16), .0009, 5, 36), g); o.userData.live = true; arm.add(o); return o; });
      arm.userData.anim = (o, t) => { rings[0].rotation.set(t * .7, 0, .4); rings[1].rotation.set(.9, t * 1.1, 0); rings[2].rotation.set(0, .5, t * 1.5); }; core.userData.live = true; }
    if (Z.stock) { K.shell(Z.stock, [[0, .1], [0, .9], [1, .95], [1, .04]], m.fin); K.plate(Z.stock, [[0, .78], [1, .82], [1, .88], [0, .86]], g, { th: .0012 }); }
    if (Z.pump) K.loft(Z.pump, st, navy);
  } };

  // Abyss: a deep-sea hunter. A body of overlapping black scales split by red light, a finned spine along the belly, a
  // lure glowing on its stalk beside the muzzle and a ring of teeth round it
  FORMS.abyss = { gun(K) {
    const { Z, m, by } = K, F = Z.fore, red = K.mat('red', () => fsolid('#ff1a3a')), bone = K.mat('bone', () => fstd({ color: flc('#e8dcc8'), roughness: .5, metalness: .05, ei: .6 })), fin = K.mat('fin', () => fphys({ color: flc('#2a0a10'), roughness: .3, clearcoat: 1, transparent: true, opacity: .85, emissive: flc('#600010'), emissiveIntensity: .6, side: THREE.DoubleSide }));
    const segs = small(K) ? 4 : 7, st = { n: 2.3, sides: 30, grow: u => .95 + .07 * ((u * segs) % 1) }; K.loft(F, st, m.fin);
    { const za = K.at(F, .06), zb = K.at(F, small(K) ? .5 : .36), y0 = K.bot(F, (za + zb) / 2) - .0018, h = (K.top(F, za) - K.bot(F, za)) * (small(K) ? .3 : .45), P = [[za, y0 + .002]];
      for (let i = 0; i <= 5; i++) { const z = lp(za, zb, i / 5); P.push([z + .002, y0 - h * Math.sin(i / 5 * Math.PI) * (i % 2 ? .75 : 1)]); } P.push([zb, y0 + .002]); K.extrude(P, .0012, fin, 0, .0003, F.part); }
    K.muzzle([[0, .001], [.008, .002], [.014, 0]], m.fin);
    K.crown(10, (i, a, x, y, z) => { K.mesh(new THREE.ConeGeometry(.0011, .0045, 4), bone, x * .93, by + (y - by) * .93, z - .0018, -Math.PI / 2, 0, 0, F.part); });
    { const z0 = K.at(F, .14), s0 = K.surf(F, z0, Math.PI * .72, 0), r0 = F.r0, tipP = [-(r0 + .011), by + r0 * .2, K.tip - .006];
      K.tubeAlong([s0, [s0[0] - .006, s0[1] + .01, lp(z0, K.tip, .4)], [tipP[0] + .002, tipP[1] + .012, K.tip + .004], [tipP[0], tipP[1] + .0045, tipP[2] + .002]], .0009, m.fin, 30, 5, F.part);
      const lure = K.mesh(new THREE.SphereGeometry(.0034, 12, 10), red, tipP[0], tipP[1], tipP[2], 0, 0, 0, F.part); K.live(lure, (o, t) => { const k = 1 + .18 * Math.sin(t * 3); o.scale.setScalar(k); }); }
    const R = Z.recv; if (R) { K.shell(R, [[0, .05], [0, .9], [.3, .98], [.33, .9], [.62, .98], [.65, .9], [1, .95], [1, .05]], m.fin); }
    if (Z.stock) K.shell(Z.stock, [[0, .2], [0, .85], [.7, .9], [1.08, 1.05], [.92, .55], [1.08, .02], [.7, .12], [.3, .1]], m.fin);
    if (Z.pump) K.loft(Z.pump, st, m.fin);
  } };

  // Spectrum: liquid chrome. A body that swells and narrows like poured metal, rainbow-bright, with drops of it hanging
  // under the barrel and a melted edge to the receiver
  FORMS.spectrum = { gun(K) {
    const { Z, m, by } = K, F = Z.fore, chrome = K.mat('chrome', () => fphys({ map: m.fin.map, color: flc('#ffffff'), metalness: .85, roughness: .1, clearcoat: 1, clearcoatRoughness: .03, ei: 2.2 }));
    const st = { n: 2, sides: 36, grow: u => 1 + .08 * Math.sin(u * TAU * 2.2 + .6) }; K.loft(F, st, chrome);
    const nd = small(K) ? 2 : 4; for (let i = 0; i < nd; i++) { const z = K.at(F, .18 + i * (.7 / nd)), yb = K.bot(F, z) - .001, s = (small(K) ? .0022 : .0032) * (1 - i * .1);
      K.mesh(new THREE.SphereGeometry(s, 14, 10), chrome, 0, yb - s * 1.4, z, 0, 0, 0, F.part); K.mesh(new THREE.ConeGeometry(s * .92, s * 2, 14), chrome, 0, yb - s * .2, z, Math.PI, 0, 0, F.part); }
    K.muzzle([[0, .0012], [.005, .0026], [.012, .001], [.018, 0]], chrome);
    if (Z.recv) K.shell(Z.recv, [[0, .05], [0, .9], [1, .92], [1, .1], ['q', .85, -.12, .75, .08], ['q', .6, .02, .5, .1], ['q', .4, -.18, .3, .08], ['q', .15, .02, 0, .05]], chrome, { bev: .0035 });
    if (Z.stock) K.shell(Z.stock, [[0, .1], ['q', .2, 1.02, .6, .95], ['q', 1.05, .9, 1.02, .4], ['q', 1, .02, .6, .06], ['q', .4, -.1, .25, .06]], chrome, { bev: .004 });
    if (Z.pump) K.loft(Z.pump, st, chrome);
  } };

  // Eclipse: a black body with gold crescents sweeping along its flanks, an eclipse on each side of the receiver (a
  // black sun ringed in burning gold) and crescent claws curling round the muzzle
  const crescent = (z, y, r, th, a0, a1) => { const P = []; for (let i = 0; i <= 14; i++) { const a = lp(a0, a1, i / 14); P.push([z + Math.cos(a) * r, y + Math.sin(a) * r]); } for (let i = 14; i >= 0; i--) { const a = lp(a0, a1, i / 14), w = th * Math.sin(i / 14 * Math.PI); P.push([z + Math.cos(a) * (r - w), y + Math.sin(a) * (r - w) * .8]); } return P; };
  FORMS.eclipse = { gun(K) {
    const { Z, m, by } = K, F = Z.fore, g = goldM(K), cor = K.mat('cor', () => fsolid('#ffb02a')), blk = K.mat('blk', () => fphys({ color: flc('#060504'), roughness: .2, metalness: .5, clearcoat: 1, ei: 1.2 }));
    const st = { n: 2.4, sides: 30 }; K.loft(F, st, m.fin);
    for (const sx of [-1, 1]) for (const q of small(K) ? [.5] : [.3, .72]) { const z = K.at(F, q), h = (K.top(F, z) - K.bot(F, z)) * .46, S = K.side(F, z - h, z + h, sx, .0004); K.flatAt(crescent(z, by, h, h * .45, .3 * Math.PI, 1.7 * Math.PI), .0014, g, S.x, S.yaw, .0004, F.part); }
    K.muzzle([[0, .0008], [.01, .0014], [.014, 0]], blk);
    for (const sy of [-1, 1]) { const r0 = F.r0, z0 = K.tip - .003; if (sy > 0 && by + r0 + .011 > K.ceil(F, z0)) continue; K.flatAt(crescent(z0 + .006, by + sy * (r0 + .001), .009, .0035, sy > 0 ? .55 * Math.PI : 1.05 * Math.PI, sy > 0 ? .95 * Math.PI : 1.45 * Math.PI), .002, g, 0, 0, .0005, F.part); }
    const R = Z.recv; if (R) { K.shell(R, [[0, .05], [0, .9], [1, .9], [1, .05]], m.fin);
      const zc = K.at(R, .5), yc = lp(K.bot(R, zc), K.top(R, zc), .48), rr = (K.top(R, zc) - K.bot(R, zc)) * .36;
      for (const sx of [-1, 1]) { const x = sx * (R.wMax + .0026); K.mesh(new THREE.CylinderGeometry(rr * .78, rr * .78, .0016, 32), blk, x, yc, zc, 0, 0, Math.PI / 2); K.mesh(new THREE.TorusGeometry(rr * .82, .0011, 6, 40), cor, x, yc, zc, 0, Math.PI / 2, 0);
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, L = rr * (i % 2 ? .22 : .38); K.mesh(new THREE.BoxGeometry(.0008, L, .0009), i % 2 ? g : cor, x, yc + Math.sin(a) * (rr * .86 + L / 2), zc + Math.cos(a) * (rr * .86 + L / 2), a - Math.PI / 2, 0, 0); } } }
    if (Z.stock) { K.shell(Z.stock, [[0, .1], [0, .9], [1, .95], [1, .04]], m.fin); K.plate(Z.stock, crescent(.55, .5, .32, .13, .4 * Math.PI, 1.6 * Math.PI), g, { th: .0012 }); }
    if (Z.pump) K.loft(Z.pump, st, blk);
  } };

  // Overclock: a rig built to run hot. A squared body of smoked metal, a stack of cooling fins on each flank, braided
  // cables run back into the receiver and RGB light chasing along every edge; the fans turn behind the receiver's glass
  FORMS.overclock = { gk: { pts: 'pixels', sig: 'fans', sight: 1, muzzle: 1, c2: '#3affea' }, gun(K) {
    const { Z, m, by } = K, F = Z.fore, al = K.mat('al', () => fstd({ color: flc('#5a606a'), metalness: 1, roughness: .32, ei: 1.3 })), cab = K.mat('cab', () => fstd({ color: flc('#14161c'), roughness: .7, metalness: .2 })), Fx = lineFx('overclock');
    const st = { n: 7, sides: 8, flat: true, rot: Math.PI / 8 }; K.loft(F, st, m.fin);
    for (const sx of [-1, 1]) { const n = small(K) ? 5 : 9, za = K.at(F, .5), zb = K.at(F, .9); for (let i = 0; i < n; i++) { const z = lp(za, zb, i / (n - 1)), S = K.side(F, z - .001, z + .001, sx); K.mesh(new THREE.BoxGeometry(.006, (K.top(F, z) - K.bot(F, z)) * .62, .0012), al, S.x + sx * .002, by, z, 0, 0, 0, F.part); }
      const zs = K.at(F, .05), ze = K.at(F, .45), S = K.side(F, zs, ze, sx, .0004), y = by + (K.top(F, zs) - by) * .55; const pl = K.mesh(new THREE.PlaneGeometry(Math.abs(ze - zs), .0016), Fx.flow, S.x, y, (zs + ze) / 2, 0, sx * Math.PI / 2 + S.yaw, 0, F.part); }
    if (!small(K) && Z.recv) for (const sx of [-1, 1]) { const P = [K.surf(F, K.at(F, .6), sx > 0 ? -.6 : Math.PI + .6, .002), [sx * .02, by - .03, K.at(F, .9)], [sx * (Z.recv.wMax + .002), by - .02, K.at(Z.recv, .15)]]; K.tubeAlong(P, .0022, cab, 30, 8); }
    K.muzzle([[0, .001], [.006, .0018], [.014, 0]], al, 8, Math.PI / 8);
    const R = Z.recv; if (R) { K.shell(R, [[0, .05], [0, .88], [.1, 1], [.9, 1], [1, .88], [1, .05]], m.fin); K.plate(R, [[.12, .2], [.6, .2], [.6, .78], [.12, .78]], K.mat('smoke', () => fphys({ color: flc('#20242c'), roughness: .05, transparent: true, opacity: .55, clearcoat: 1 })), { th: .0008, sides: [-1], out: .004 }); }
    if (Z.stock) { K.shell(Z.stock, [[0, .1], [0, .9], [.85, 1], [1, .85], [1, .04]], m.fin); }
    if (Z.pump) K.loft(Z.pump, st, al);
  } };

  // Ghostfire: a pale body that burns with cold spirit flame along its back, a spirit lantern hanging under the barrel
  // and a crown of ghost flame round the muzzle
  FORMS.ghostfire = { gk: { pts: 'wisps', sight: 1, muzzle: 1, c2: '#eafff0' }, gun(K) {
    const { Z, m, by } = K, F = Z.fore, fl = K.mat('fl', () => new THREE.MeshBasicMaterial({ color: flc('#7dff9a'), transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })), core = K.mat('core', () => fsolid('#d8ffe0')), bone = K.mat('bone', () => fstd({ color: flc('#cfd8cc'), roughness: .5, metalness: .2, ei: .8 }));
    const st = { n: 2.2, sides: 30 }; K.loft(F, st, m.fin);
    const nf = small(K) ? 3 : 6; for (let i = 0; i < nf; i++) { const z = K.at(F, .15 + i * (.7 / nf)), y0 = Math.min(K.top(F, z), K.cap(F, z)) + .0015, room = K.ceil(F, z) - y0; if (room < .006) continue;
      for (const sx of [-1, 1]) { const S = K.side(F, z - .006, z + .006, sx, -.001), h = Math.min(room, small(K) ? .012 : .022) * (.7 + fh(i, 7) * .3); const o = K.flatAt(flame(z, y0 - .004, .012, h), .0006, fl, S.x * .55, 0, 0, F.part); K.live(o, (ob, t) => { ob.scale.y = 1 + .15 * Math.sin(t * 5 + i * 1.7); }); } }
    { const z = K.at(F, small(K) ? .3 : .22), yb = K.bot(F, z) - .002, L = small(K) ? .006 : .01;
      K.mesh(new THREE.CylinderGeometry(.0006, .0006, .006, 4), bone, 0, yb - .003, z, 0, 0, 0, F.part); const yl = yb - .006 - L / 2;
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .78; K.mesh(new THREE.BoxGeometry(.0008, L, .0008), bone, Math.cos(a) * L * .32, yl, z + Math.sin(a) * L * .32, 0, 0, 0, F.part); }
      for (const dy of [-L / 2, L / 2]) K.mesh(new THREE.CylinderGeometry(L * .4, L * .4, .0012, 8), bone, 0, yl + dy, z, 0, 0, 0, F.part);
      const c = K.mesh(new THREE.SphereGeometry(L * .22, 10, 8), core, 0, yl, z, 0, 0, 0, F.part); K.live(c, (o, t) => { o.scale.setScalar(1 + .2 * Math.sin(t * 6)); }); }
    K.muzzle([[0, .001], [.008, .0016], [.013, 0]], bone);
    const R = Z.recv; if (R) { K.shell(R, [[0, .05], [0, .88], ['q', .5, 1.02, 1, .9], [1, .05]], m.fin); }
    if (Z.stock) { const S = Z.stock; K.shell(S, [[0, .1], [0, .9], [1, .95], [1, .04]], m.fin);
      for (const sx of [-1, 1]) { const z = K.at(S, .9), y = lp(K.bot(S, z), K.top(S, z), .3), o = K.mesh(new THREE.PlaneGeometry(.006, .05), fl, sx * (S.wMax + .003), y - .025, z, 0, Math.PI / 2, 0); K.live(o, (ob, t) => { ob.rotation.x = Math.sin(t * 2 + sx) * .25; }); } }
    if (Z.pump) K.loft(Z.pump, st, m.fin);
  } };

  // Starforge: blackened iron in heavy eight-sided plate, white-hot plasma in every seam, rivets, an anvil of a brake
  // with plasma venting from its sides, and the captive star above the receiver
  FORMS.starforge = { gk: { pts: 'sparks', sig: 'star', sight: 1, muzzle: 1, c2: '#fff3d6' }, gun(K) {
    const { Z, m, by } = K, F = Z.fore, ir = iron(K), pl = K.mat('pl', () => fsolid('#ffd8a0'));
    const st = { n: 3, sides: 8, flat: true, rot: Math.PI / 8 }; K.loft(F, st, m.fin);
    const L = Math.abs(F.z1 - F.z0), nb = Math.max(2, Math.round(L / .07)); for (let i = 1; i < nb; i++) { const z = K.at(F, i / nb); K.band(F, z - .0028, z + .0028, .0014, ir, st); K.band(F, z - .0006, z + .0006, .0018, pl, st); }
    for (const sx of [-1, 1]) for (let i = 0; i < nb * 2; i++) { const z = K.at(F, (i + .5) / (nb * 2)); const p = K.surf(F, z, sx > 0 ? -.3 : Math.PI + .3, .0004); K.mesh(new THREE.SphereGeometry(.0011, 6, 4), ir, p[0], p[1], z, 0, 0, 0, F.part); }
    K.muzzle([[0, .003], [.004, .003], [.006, .0015], [.016, .0015], [.018, .003], [.024, .003], [.028, 0]], ir, 8, Math.PI / 8);
    for (const sx of [-1, 1]) { const r = F.r0 / Math.cos(Math.PI / 8) + .0032; K.mesh(new THREE.BoxGeometry(.001, .006, .007), pl, sx * r, by, K.tip + .008, 0, 0, 0, F.part); }
    const R = Z.recv; if (R) { K.shell(R, [[0, .05], [0, .86], [.08, 1], [.92, 1], [1, .86], [1, .05]], m.fin, { bev: .001 }); K.plate(R, [[.08, .15], [.92, .15], [.92, .3], [.08, .3]], ir, { th: .0018 }); K.plate(R, [[.08, .32], [.92, .32], [.92, .35], [.08, .35]], pl, { th: .0008, gap: .0024 }); }
    if (Z.stock) { K.shell(Z.stock, [[0, .1], [0, .9], [.9, 1], [1, .9], [1, .04]], m.fin, { bev: .001 }); K.plate(Z.stock, [[.1, .4], [.9, .44], [.9, .5], [.1, .46]], pl, { th: .0008 }); }
    if (Z.pump) K.loft(Z.pump, st, ir);
  } };

  // Riftborn: faceted black glass with a tear running down each flank that the light leaks through, a crown of glass
  // shards round the muzzle and the rift itself hanging over the receiver
  FORMS.riftborn = { gk: { pts: 'pixels', sig: 'rift', sight: 1, muzzle: 1, c2: '#3af0ff' }, gun(K) {
    const { Z, m, by } = K, F = Z.fore, tear = K.mat('tear', () => fsolid('#c49aff')), glass = K.mat('glass', () => fphys({ color: flc('#07060d'), roughness: .05, metalness: .5, clearcoat: 1, emissive: flc('#2a0a5a'), emissiveIntensity: .4, flatShading: true, ei: 1.8 }));
    const st = { n: 2, sides: 7, flat: true, rot: Math.PI / 2 }; K.loft(F, st, glass);
    for (const sx of [-1, 1]) { const za = K.at(F, .12), zb = K.at(F, .92), n = 14, P = [], Q = []; for (let i = 0; i <= n; i++) { const z = lp(za, zb, i / n), y = by + (fh(i, sx) - .5) * (K.top(F, z) - K.bot(F, z)) * .4, w = .0008 + .0016 * Math.sin(i / n * Math.PI); P.push([z, y + w]); Q.unshift([z, y - w]); }
      const S = K.side(F, za, zb, sx, .0002); K.flatAt(P.concat(Q), .0007, tear, S.x, S.yaw, 0, F.part); }
    K.muzzle([[0, .001], [.012, .0016], [.016, 0]], glass, 7, Math.PI / 2);
    K.crown(5, (i, a, x, y, z) => { const o = K.mesh(new THREE.OctahedronGeometry(1, 0), glass, x * 1.08, by + (y - by) * 1.08, z + .003, 0, 0, 0, F.part); o.scale.set(.0018, .0018, .008); o.lookAt(new THREE.Vector3(x * 1.6, by + (y - by) * 1.6, z - .03)); }, Math.PI / 2 + .6);
    const R = Z.recv; if (R) K.shell(R, [[0, .05], [0, .9], [.2, .98], [.35, .86], [.55, 1.0], [.75, .9], [1, .97], [1, .05]], glass, { bev: .0008 });
    if (Z.stock) K.shell(Z.stock, [[0, .1], [0, .9], [.6, 1.0], [1.04, .9], [.92, .5], [1.02, .05], [.5, .02]], glass, { bev: .0008 });
    if (Z.pump) K.loft(Z.pump, st, glass);
  } };

  // Glyphbound: old dark stone, squared and carved in courses, gold runes set into its flanks, a squared stone collar
  // at the muzzle and the circles of runes turning round the barrel
  FORMS.glyphbound = { gk: { pts: 'runes', sig: 'glyph', sight: 1, muzzle: 1, c2: '#3affd0' }, gun(K) {
    const { Z, m, by } = K, F = Z.fore, stone = K.mat('stone', () => fstd({ color: flc('#2a2c30'), roughness: .85, metalness: .05, flatShading: true, ei: .4 })), rune = K.mat('rune', () => fsolid('#ffd04a'));
    const st = { n: 6, sides: 4, flat: true, rot: Math.PI / 4, off: .003 }; K.loft(F, st, m.fin);
    const L = Math.abs(F.z1 - F.z0), nc = Math.max(2, Math.round(L / .05)); for (let i = 1; i < nc; i++) { const z = K.at(F, i / nc); K.band(F, z - .0016, z + .0016, .0012, stone, st); }
    for (const sx of [-1, 1]) for (let i = 0; i < nc; i++) { const z = K.at(F, (i + .5) / nc), S = K.side(F, z - .004, z + .004, sx, .0012), h = (K.top(F, z) - K.bot(F, z)) * .3, P = [[z - .003, by - h / 2], [z, by + h / 2], [z + .003, by - h / 2], [z + .0015, by - h / 2], [z, by + h * .1], [z - .0015, by - h / 2]]; K.flatAt(i % 2 ? P : P.map(([a, b]) => [a, 2 * by - b]), .0006, rune, S.x, S.yaw, 0, F.part); }
    K.muzzle([[0, .002], [.006, .002], [.008, .0035], [.014, .0035], [.018, 0]], stone, 4, Math.PI / 4);
    const R = Z.recv; if (R) { K.shell(R, [[0, .05], [0, .95], [1, .95], [1, .05]], m.fin, { bev: .0006 }); for (const q of [.33, .66]) K.plate(R, [[q - .01, .05], [q + .01, .05], [q + .01, .95], [q - .01, .95]], stone, { th: .0012 }); }
    if (Z.stock) K.shell(Z.stock, [[0, .1], [0, .92], [1, .85], [1, .1]], m.fin, { bev: .0006 });
    if (Z.pump) K.loft(Z.pump, st, stone);
  } };

  /* ---------- the top lines' knives ----------
     Each forges its own blade, guard, grip and pommel round the same hand-hold (the grip runs z 0 to .1, about 2.4 cm
     thick, so your glove still closes on it). The blade runs forward from the guard at z -.02. */
  function kGrip(H, mat, o = {}) {
    const { side, rbox, lathe } = H;
    if (o.round) lathe([[-.007, .0105], [.004, .0124], [.05, .0114], [.094, .0124], [.103, .0098]], mat, 0, 0, o.seg || 14);
    else side([[-.008, .017], [.03, .02], ['q', .07, .022, .1, .012], [.104, -.014], ['q', .07, -.024, .04, -.016], ['q', .02, -.02, -.008, -.014]], .024, mat, 0, .009);
    if (o.wrap) for (let i = 0; i < 4; i++) { if (o.round) lathe([[.012 + i * .021, .0128], [.017 + i * .021, .0128]], o.wrap, 0, 0, o.seg || 14); else rbox(.0255, .034, .004, o.wrap, 0, 0, .014 + i * .021, .002); }
  }
  // a lit edge along a polyline of the blade (offset in by w), a hair thicker than the blade so it shows on both faces
  function kEdge(H, P, w, th, mat) { const A = P, B = P.slice().reverse().map(([z, y]) => [z, y + w]); H.side(A.concat(B), th, mat, 0, 0); }
  const kM = (H, key, make) => fmat(H.line, 'k' + key, make);
  Object.assign(FORMS.inferno, { blade: 'furnace cleaver', knife(H) { const { side, rbox, m } = H, ir = kM(H, 'ir', () => fstd({ color: flc('#2a221e'), metalness: .85, roughness: .4 })), lava = kM(H, 'lava', () => fsolid('#ff6a1a'));
    side([[-.02, .03], [-.19, .032], [-.214, .022], [-.21, -.02], [-.02, -.014]], .0065, m.fin, 0, .002); kEdge(H, [[-.02, -.0155], [-.21, -.0215]], .003, .0072, lava);
    for (let i = 0; i < 5; i++) rbox(.009, .006, .003, ir, 0, .034, -.05 - i * .03, .001);
    rbox(.032, .054, .014, ir, 0, .006, -.014, .003); for (let i = 0; i < 3; i++) rbox(.0335, .004, .01, lava, 0, -.008 + i * .014, -.014, .001); kGrip(H, m.fin, { wrap: ir }); rbox(.03, .034, .018, ir, 0, -.001, .108, .004); } });
  Object.assign(FORMS.storm, { blade: 'tesla blade', knife(H) { const { side, rbox, lathe, m } = H, cu = kM(H, 'cu', () => fstd({ color: flc('#c8743a'), metalness: 1, roughness: .28 })), arc = kM(H, 'arc', () => fsolid('#bff2ff'));
    side([[-.02, .02], [-.2, .014], [-.25, .002], [-.2, -.01], [-.02, -.014]], .006, m.fin, 0, .002, [[[-.04, .008], [-.18, .006], [-.18, -.002], [-.04, -.004]]]); rbox(.0016, .009, .14, arc, 0, .002, -.11, .0005);
    for (const sy of [-1, 1]) side([[-.012, sy * .012], [-.03, sy * .03], [-.036, sy * .028], [-.018, sy * .01]], .008, cu, 0, .002);
    lathe([[-.012, .004], [-.012, .012], [.0, .012], [.0, .004]], cu, .002, 0, 16); kGrip(H, m.fin, { round: 1 }); H.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 60 }, (_, i) => fv(Math.cos(i * .9) * .0132, Math.sin(i * .9) * .0132, .004 + i * .0015))), 120, .0011, 5), cu); lathe([[.1, .013], [.1, .015], [.114, .012], [.118, .004]], cu, 0, 0, 16); } });
  Object.assign(FORMS.nebula, { blade: 'star scimitar', knife(H) { const { side, rbox, lathe, m } = H, sil = kM(H, 'sil', () => fstd({ color: flc('#c9c2e8'), metalness: 1, roughness: .2 })), pl = kM(H, 'pl', () => fphys({ color: flc('#7a4ad8'), emissive: flc('#5a2ab8'), emissiveIntensity: .8, clearcoat: 1 }));
    side([[-.02, .02], ['q', -.14, .04, -.24, .034], ['q', -.2, .016, -.15, -.002], ['q', -.08, -.016, -.02, -.014]], .006, m.fin, 0, .0022); kEdge(H, [[-.02, -.015], [-.08, -.0168], [-.15, -.0035], [-.2, .014], [-.24, .033]], .0016, .0066, sil);
    side([[-.006, .018], ['q', -.02, .03, -.03, .02], ['q', -.02, -.02, -.006, -.016]], .03, sil, 0, .003); kGrip(H, m.fin, { round: 1, wrap: sil }); H.add(new THREE.SphereGeometry(.013, 18, 12), pl, 0, 0, .112); H.add(new THREE.TorusGeometry(.019, .0012, 4, 32), sil, 0, 0, .112, 1.2, .3, 0); } });
  Object.assign(FORMS.phoenix, { blade: 'flame feather', knife(H) { const { side, rbox, m } = H, gold = kM(H, 'gold', () => fstd({ color: flc('#ffbf3a'), metalness: 1, roughness: .26 })), red = kM(H, 'red', () => fphys({ color: flc('#c8281a'), roughness: .3, clearcoat: 1, emissive: flc('#5a0800'), emissiveIntensity: .7 }));
    side([[-.02, .018], ['q', -.12, .034, -.25, .012], [-.205, .002], [-.215, -.004], [-.17, -.004], [-.178, -.012], [-.12, -.012], ['q', -.06, -.018, -.02, -.014]], .006, red, 0, .002); kEdge(H, [[-.03, .002], [-.22, .009]], .0014, .0066, gold);
    for (const sx of [-1, 1]) side([[-.012, .01], ['q', -.03, .05, -.004, .058], [.004, .03], ['q', .0, .018, -.006, .008]], .004, gold, sx * .009, .0012);
    rbox(.03, .03, .012, gold, 0, .002, -.012, .004); kGrip(H, m.fin, { wrap: gold }); side([[.1, .014], ['q', .13, .03, .15, .016], [.128, .002], [.14, -.012], [.1, -.012]], .02, gold, 0, .004); } });
  Object.assign(FORMS.aurora, { blade: 'polar ribbon', knife(H) { const { side, rbox, lathe, m, glowB } = H, ice = kM(H, 'ice', () => fstd({ color: flc('#e6f4f2'), metalness: .3, roughness: .3 })), gl = kM(H, 'gl', () => glowB('#5aff9a')), pk = kM(H, 'pk', () => glowB('#ff6ad8'));
    side([[-.02, .014], ['q', -.16, .02, -.26, .006], ['q', -.16, -.008, -.02, -.012]], .005, ice, 0, .0018); kEdge(H, [[-.03, -.0105], [-.12, -.008], [-.25, .004]], .002, .0056, gl); kEdge(H, [[-.03, .0115], [-.14, .014], [-.25, .0075]], .0016, .0056, pk);
    lathe([[-.016, .006], [-.016, .016], [-.006, .016], [-.006, .006]], m.fin, .001, 0, 6); kGrip(H, m.fin, { round: 1, seg: 6 }); H.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => fv(Math.cos(i * .5) * .014, Math.sin(i * .5) * .014, i * .0026))), 80, .0012, 4), gl); lathe([[.1, .012], [.108, .014], [.118, .006]], ice, 0, 0, 6); } });
  Object.assign(FORMS.tempest, { blade: 'gale kukri', knife(H) { const { side, rbox, lathe, m } = H, st = kM(H, 'st', () => fstd({ color: flc('#b8c4d4'), metalness: 1, roughness: .22 }));
    side([[-.02, .016], ['q', -.12, .03, -.2, .026], ['q', -.25, .018, -.236, -.014], [-.2, -.006], [-.19, -.016], [-.16, -.006], ['q', -.08, -.022, -.02, -.014]], .0065, m.fin, 0, .0022);
    const g = H.add(new THREE.TorusGeometry(.02, .003, 6, 28), st, 0, .002, -.014); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; H.add(new THREE.BoxGeometry(.0015, .016, .004), st, Math.cos(a) * .011, .002 + Math.sin(a) * .011, -.014, 0, .4, a); }
    kGrip(H, m.fin, { wrap: st }); lathe([[.1, .012], [.104, .015], [.12, .01], [.124, .003]], st, 0, 0, 20); } });
  Object.assign(FORMS.prism, { blade: 'cut crystal', knife(H) { const { m } = H, gem = kM(H, 'gem', () => fphys({ color: flc('#f4ecff'), roughness: .05, metalness: .15, clearcoat: 1, emissive: flc('#ff8ae6'), emissiveIntensity: .25, flatShading: true }));
    const c = H.add(new THREE.OctahedronGeometry(1, 0), gem, 0, .003, -.13); c.scale.set(.006, .02, .115); c.rotation.z = .785;
    for (let i = 0; i < 4; i++) { const sx = i % 2 ? 1 : -1, o = H.add(new THREE.OctahedronGeometry(1, 0), gem, sx * .008, .012 - (i >> 1) * .02, -.016); o.scale.set(.004, .011, .006); o.rotation.set(0, 0, sx * .5); }
    kGrip(H, m.fin, { round: 1, seg: 6 }); const pm = H.add(new THREE.OctahedronGeometry(.012, 0), gem, 0, 0, .114); pm.scale.set(1, 1, 1.4); } });
  Object.assign(FORMS.magmaflow, { blade: 'lava rock', knife(H) { const { side, rbox, m } = H, lava = kM(H, 'lava', () => fsolid('#ff5a10')), rock = kM(H, 'rock', () => fstd({ color: flc('#1c1512'), roughness: .9, flatShading: true }));
    const P = [[-.02, .024]]; for (let i = 1; i <= 9; i++) P.push([-.02 - i * .024, .024 - i * .0022 + (fh(i, 2) - .5) * .008]); P.push([-.25, .002]); for (let i = 9; i >= 1; i--) P.push([-.02 - i * .024, -.014 + i * .0012 + (fh(i, 5) - .5) * .006]); P.push([-.02, -.014]);
    side(P, .0075, rock, 0, .0015); kEdge(H, [[-.03, .004], [-.12, .0], [-.22, .002]], .0024, .0082, lava);
    rbox(.034, .05, .016, rock, 0, .005, -.014, .002); kGrip(H, m.fin, { wrap: rock }); rbox(.03, .034, .018, rock, 0, -.001, .109, .003); } });
  Object.assign(FORMS.permafrost, { blade: 'icicle', knife(H) { const { m } = H, ice = kM(H, 'ice', () => fphys({ color: flc('#d8efff'), roughness: .05, clearcoat: 1, transparent: true, opacity: .85, emissive: flc('#2a7ad0'), emissiveIntensity: .35 }));
    const b = H.add(new THREE.ConeGeometry(.013, .23, 6), ice, 0, .003, -.135, -Math.PI / 2, 0, 0); b.scale.set(1, 1, .5);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, o = H.add(new THREE.ConeGeometry(.004, .022, 5), ice, Math.cos(a) * .012, .003 + Math.sin(a) * .012, -.02, -Math.PI / 2 + .3, a, 0); }
    kGrip(H, m.fin, { round: 1, seg: 6, wrap: ice }); H.add(new THREE.OctahedronGeometry(.012, 0), ice, 0, 0, .112); } });
  Object.assign(FORMS.fission, { blade: 'reactor blade', knife(H) { const { side, rbox, lathe, m } = H, core = kM(H, 'core', () => fsolid('#4a8dff')), pipe = kM(H, 'pipe', () => fstd({ color: flc('#9aa4b2'), metalness: 1, roughness: .3 }));
    side([[-.02, .02], [-.21, .02], [-.24, .0], [-.22, -.014], [-.02, -.014]], .0065, m.fin, 0, .002, [[[-.04, .006], [-.2, .006], [-.2, .0], [-.04, .0]]]); rbox(.004, .006, .16, core, 0, .003, -.12, .001);
    lathe([[-.02, .006], [-.02, .02], [-.006, .02], [-.006, .006]], pipe, .003, 0, 20); kGrip(H, m.fin, { round: 1 }); for (let i = 0; i < 4; i++) lathe([[.012 + i * .022, .0128], [.016 + i * .022, .0128]], core, 0, 0, 16); lathe([[.1, .013], [.104, .016], [.12, .016], [.122, .006]], pipe, 0, 0, 20); } });
  Object.assign(FORMS.cinderwake, { blade: 'knapped obsidian', knife(H) { const { side, rbox, m } = H, obs = kM(H, 'obs', () => fphys({ color: flc('#100a09'), roughness: .06, metalness: .4, clearcoat: 1, flatShading: true })), em = kM(H, 'em', () => fsolid('#ff4a1a'));
    const P = [[-.02, .02]]; for (let i = 1; i <= 8; i++) P.push([-.02 - i * .026, .02 - i * .0022 - (i % 2) * .004]); P.push([-.25, -.002]); for (let i = 8; i >= 1; i--) P.push([-.02 - i * .026, -.013 + i * .0013 + (i % 2) * .004]); P.push([-.02, -.013]);
    side(P, .0062, obs, 0, .0012); kEdge(H, [[-.04, .002], [-.1, .005], [-.15, .0], [-.21, .003]], .0012, .0068, em);
    side([[-.006, .022], [-.026, .03], [-.018, .004], [-.026, -.022], [-.006, -.016]], .028, obs, 0, .002); kGrip(H, m.fin, { wrap: obs }); side([[.1, .014], [.13, .006], [.1, -.014]], .022, obs, 0, .002); } });
  Object.assign(FORMS.voidline, { blade: 'void fork', knife(H) { const { side, rbox, m } = H, vi = kM(H, 'vi', () => fsolid('#b46bff')), obs = kM(H, 'obs', () => fphys({ color: flc('#0c0a14'), roughness: .1, metalness: .6, clearcoat: 1 }));
    for (const sy of [-1, 1]) side([[-.02, sy * .006], [-.2, sy * .006], [-.24, sy * .0015], [-.2, sy * .016], [-.02, sy * .016]], .006, obs, 0, .0016); rbox(.002, .008, .2, vi, 0, 0, -.12, .0008);
    rbox(.03, .05, .012, obs, 0, 0, -.014, .004); kGrip(H, m.fin, { wrap: vi }); const r = H.add(new THREE.TorusGeometry(.022, .0012, 6, 32), vi, 0, 0, -.016); H.live(r, (o, t) => { o.rotation.set(t * 1.4, t * .8, 0); }); rbox(.026, .03, .016, obs, 0, -.001, .108, .006); } });
  Object.assign(FORMS.solaris, { blade: 'sun kris', knife(H) { const { side, rbox, m } = H, g = kM(H, 'g', () => fstd({ color: flc('#ffc23a'), metalness: 1, roughness: .24 })), cer = kM(H, 'cer', () => fphys({ color: flc('#f8f4ec'), roughness: .25, clearcoat: 1 }));
    const top = [], bot = []; for (let i = 0; i <= 12; i++) { const z = -.02 - i * .018, w = .016 * (1 - i / 13), y = Math.sin(i * 1.1) * .005; top.push([z, y + w]); bot.unshift([z, y - w * .8]); } side(top.concat([[-.25, Math.sin(13 * 1.1) * .005]]).concat(bot), .0055, cer, 0, .0015); kEdge(H, bot.slice().reverse(), .0014, .006, g);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, L = i % 2 ? .01 : .018; H.add(new THREE.ConeGeometry(.0022, L, 4), g, Math.cos(a) * (.016 + L / 2), .003 + Math.sin(a) * (.016 + L / 2), -.016, 0, 0, a - Math.PI / 2); }
    H.add(new THREE.CylinderGeometry(.016, .016, .006, 24), g, 0, .003, -.016, Math.PI / 2, 0, 0); kGrip(H, cer, { wrap: g }); H.add(new THREE.SphereGeometry(.012, 16, 12), g, 0, 0, .112); } });
  Object.assign(FORMS.celestial, { blade: 'astrolabe dagger', knife(H) { const { side, rbox, lathe, m } = H, g = kM(H, 'g', () => fstd({ color: flc('#ffc23a'), metalness: 1, roughness: .24 })), orb = kM(H, 'orb', () => fsolid('#ffe6a0'));
    side([[-.02, .02], [-.17, .02], ['q', -.22, .018, -.245, .002], ['q', -.2, -.012, -.15, -.013], [-.02, -.013]], .006, m.fin, 0, .002, [Array.from({ length: 16 }, (_, i) => [-.05 + Math.cos(i / 16 * TAU) * .012, .004 + Math.sin(i / 16 * TAU) * .009])]);
    H.add(new THREE.TorusGeometry(.0115, .0012, 6, 28), g, 0, .004, -.05, 0, Math.PI / 2, 0); kEdge(H, [[-.07, -.0118], [-.15, -.0118], [-.22, -.001]], .0012, .0066, g);
    const arm = H.grp(0, .003, -.016); for (let i = 0; i < 2; i++) { const o = new THREE.Mesh(new THREE.TorusGeometry(.02 - i * .004, .0013, 5, 32), g); o.userData.live = true; arm.add(o); } H.live(arm, (o, t) => { o.children[0].rotation.y = t; o.children[1].rotation.x = t * 1.3; });
    kGrip(H, m.fin, { round: 1, wrap: g }); H.add(new THREE.SphereGeometry(.011, 16, 12), orb, 0, 0, .112); } });
  Object.assign(FORMS.abyss, { blade: 'angler hook', knife(H) { const { side, rbox, lathe, m } = H, bone = kM(H, 'bone', () => fstd({ color: flc('#e8dcc8'), roughness: .5 })), red = kM(H, 'red', () => fsolid('#ff1a3a'));
    side([[-.02, .016], ['q', -.14, .026, -.22, .01], ['q', -.25, -.004, -.232, -.022], [-.222, -.014], ['q', -.2, -.004, -.15, -.008], ['q', -.08, -.016, -.02, -.012]], .0062, m.fin, 0, .002);
    for (let i = 0; i < 7; i++) H.add(new THREE.ConeGeometry(.0016, .007, 4), bone, 0, .0185 + Math.sin(i * .4) * .0015 - i * .0006, -.04 - i * .022, 0, 0, .2);
    rbox(.026, .04, .012, bone, 0, .002, -.014, .004); kGrip(H, m.fin, { wrap: bone }); const lu = H.add(new THREE.SphereGeometry(.0085, 14, 10), red, 0, -.004, .114); H.live(lu, (o, t) => { o.scale.setScalar(1 + .15 * Math.sin(t * 3)); }); } });
  Object.assign(FORMS.spectrum, { blade: 'liquid chrome', knife(H) { const { side, lathe, m } = H, ch = kM(H, 'ch', () => fphys({ map: m.fin.map, color: flc('#ffffff'), metalness: .85, roughness: .1, clearcoat: 1 }));
    side([[-.02, .018], ['q', -.1, .03, -.2, .02], ['q', -.26, .01, -.24, -.004], ['q', -.2, -.016, -.12, -.014], ['q', -.06, -.012, -.02, -.014]], .0075, ch, 0, .003);
    lathe([[-.026, .004], [-.026, .012], [-.016, .018], [-.006, .016], [-.004, .006]], ch, .002, 0, 20);
    for (let i = 0; i < 3; i++) { H.add(new THREE.SphereGeometry(.0028, 10, 8), ch, (i - 1) * .006, -.016 - i % 2 * .004, -.012); }
    kGrip(H, ch, { round: 1 }); H.add(new THREE.SphereGeometry(.0125, 16, 12), ch, 0, 0, .11); } });
  Object.assign(FORMS.eclipse, { blade: 'crescent', knife(H) { const { side, m } = H, g = kM(H, 'g', () => fstd({ color: flc('#ffc23a'), metalness: 1, roughness: .24 })), cor = kM(H, 'cor', () => fsolid('#ffb02a')), blk = kM(H, 'blk', () => fphys({ color: flc('#060504'), roughness: .2, metalness: .5, clearcoat: 1 }));
    const P = [], Q = []; for (let i = 0; i <= 16; i++) { const a = lp(.05, .95, i / 16) * Math.PI, z = -.02 - .11 + Math.cos(a) * .11, y = Math.sin(a) * .045 - .02; P.push([z, y]); const w = .016 * Math.sin(i / 16 * Math.PI) + .001; Q.unshift([z + Math.cos(a) * w * .3, y - w]); } side(P.concat(Q), .006, blk, 0, .0015); kEdge(H, Q.slice().reverse(), .0015, .0066, g);
    H.add(new THREE.CylinderGeometry(.016, .016, .006, 28), blk, 0, .003, -.016, Math.PI / 2, 0, 0); H.add(new THREE.TorusGeometry(.0165, .0014, 6, 32), cor, 0, .003, -.016); kGrip(H, m.fin, { wrap: g }); side([[.1, .012], [.12, .02], [.114, -.002], [.12, -.02], [.1, -.012]], .02, g, 0, .002); } });
  Object.assign(FORMS.overclock, { blade: 'heatsink tanto', knife(H) { const { side, rbox, m } = H, al = kM(H, 'al', () => fstd({ color: flc('#5a606a'), metalness: 1, roughness: .32 })), Fx = lineFx('overclock');
    side([[-.02, .022], [-.19, .022], [-.238, -.004], [-.205, -.013], [-.02, -.013]], .0065, m.fin, 0, .002, [0, 1, 2, 3, 4].map(i => [[-.05 - i * .03, .014], [-.064 - i * .03, .014], [-.064 - i * .03, .004], [-.05 - i * .03, .004]]));
    const pl = H.add(new THREE.PlaneGeometry(.19, .002), Fx.flow, -.0036, -.0105, -.115, 0, -Math.PI / 2, 0); const pr = H.add(new THREE.PlaneGeometry(.19, .002), Fx.flow, .0036, -.0105, -.115, 0, Math.PI / 2, 0);
    for (let i = 0; i < 5; i++) rbox(.03, .004, .003, al, 0, .004 - i * .006 + .012, -.014, .001); kGrip(H, m.fin, { wrap: al }); rbox(.03, .034, .02, al, 0, -.001, .11, .002); } });
  Object.assign(FORMS.ghostfire, { blade: 'spirit flame', knife(H) { const { side, rbox, m, glowB } = H, fl = kM(H, 'fl', () => new THREE.MeshBasicMaterial({ color: flc('#7dff9a'), transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })), bone = kM(H, 'bone', () => fstd({ color: flc('#cfd8cc'), roughness: .5 }));
    const b = side([[-.02, .016], ['q', -.08, .03, -.13, .018], ['q', -.16, .03, -.2, .016], ['q', -.23, .022, -.26, .004], ['q', -.2, -.006, -.15, -.008], ['q', -.08, -.014, -.02, -.012]], .004, fl, 0, 0); H.live(b, (o, t) => { o.scale.y = 1 + .08 * Math.sin(t * 6); });
    side([[-.02, .006], [-.2, .006], [-.2, .0], [-.02, -.002]], .002, kM(H, 'core', () => fsolid('#eafff0')), 0, 0);
    rbox(.03, .044, .01, bone, 0, .002, -.014, .004); kGrip(H, bone, { wrap: m.fin }); rbox(.026, .03, .016, bone, 0, -.001, .108, .006); } });
  Object.assign(FORMS.starforge, { blade: 'forged star', knife(H) { const { side, rbox, lathe, m } = H, ir = kM(H, 'ir', () => fstd({ color: flc('#2a2420'), metalness: .85, roughness: .4 })), pl = kM(H, 'pl', () => fsolid('#ffd8a0'));
    side([[-.02, .026], [-.2, .028], [-.245, .006], [-.225, -.014], [-.02, -.016]], .007, m.fin, 0, .002); kEdge(H, [[-.03, -.0035], [-.22, -.002]], .0018, .0076, pl);
    rbox(.036, .056, .014, ir, 0, .005, -.014, .003); const st = H.add(new THREE.SphereGeometry(.007, 14, 10), pl, 0, .005, -.0215); H.live(st, (o, t) => { o.scale.setScalar(1 + .2 * Math.sin(t * 7)); });
    kGrip(H, m.fin, { wrap: ir }); rbox(.032, .036, .02, ir, 0, -.001, .109, .003); } });
  Object.assign(FORMS.riftborn, { blade: 'shattered glass', knife(H) { const { side, rbox, m } = H, gl = kM(H, 'gl', () => fphys({ color: flc('#07060d'), roughness: .05, metalness: .5, clearcoat: 1, flatShading: true })), tear = kM(H, 'tear', () => fsolid('#c49aff'));
    const segs = [[-.02, -.07], [-.074, -.13], [-.134, -.19], [-.194, -.25]]; segs.forEach(([z0, z1], i) => { const t0 = .022 - i * .004, t1 = i === 3 ? .001 : .022 - (i + 1) * .004; side([[z0, t0], [z1 + .002, t1 + (i % 2 ? .002 : -.002)], [z1, i === 3 ? .001 : -.012 + i * .002], [z0 + .002, -.014 + i * .002]], .006, gl, 0, .001); });
    rbox(.0024, .006, .2, tear, 0, .002, -.12, .001); rbox(.028, .05, .012, gl, 0, .004, -.014, .002); kGrip(H, m.fin, { wrap: gl }); side([[.1, .012], [.126, .018], [.12, -.004], [.13, -.016], [.1, -.012]], .02, gl, 0, .0015); } });
  Object.assign(FORMS.glyphbound, { blade: 'runestone', knife(H) { const { side, rbox, m } = H, stone = kM(H, 'stone', () => fstd({ color: flc('#2a2c30'), roughness: .85, flatShading: true })), rune = kM(H, 'rune', () => fsolid('#ffd04a'));
    side([[-.02, .018], ['q', -.1, .036, -.2, .02], [-.25, .002], ['q', -.2, -.02, -.1, -.022], ['q', -.04, -.016, -.02, -.012]], .0085, m.fin, 0, .0015);
    for (let i = 0; i < 5; i++) { const z = -.05 - i * .036; side([[z, -.004], [z - .006, .008], [z - .012, -.004], [z - .009, -.004], [z - .006, .003], [z - .003, -.004]], .0092, rune, 0, 0); }
    rbox(.04, .04, .016, stone, 0, .002, -.014, .001); kGrip(H, stone, { wrap: m.fin }); rbox(.03, .03, .022, stone, 0, -.001, .11, .001); } });
