  /* ---------- 71 the map's mechanic, made visible, and the life around each map ----------
     buildMech runs at the end of buildWorld. The ground of special cells (ice, belts, vents, low gravity) is part of the
     world mesh (72-world); what is made here is everything that moves or changes: teleporter and jump pads, belts'
     running chevrons, vent glow, the gates (which rise out of the floor), the breakable walls (which crack, then fall),
     tall grass that sways, motes drifting in low gravity, and each theme's life beyond the walls (gulls, traffic, snow,
     dust, fireflies, embers, a turning station ring). mechFrame steps it all once a frame. */
  const MECH_COL = { harbor: '#38e8ff', neon: '#ff3ea5', snow: '#5ad1ff', desert: '#ffb347', jungle: '#9dff6b', lava: '#ff7a2a', space: '#38e8ff', autumn: '#ffc04a' };
  function buildMech(W, TH) {
    const Z = X.mech = { gates: [], brks: [], tps: [], pads: [], vents: [], motes: null, grass: null, life: [], t: 0 };
    const col = MECH_COL[MAP.theme] || '#38e8ff', add = o => { W.add(o); return o; };
    const glow = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }, o || {}));
    const disc = (r, mat, y = .03) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 36), mat); m.rotation.x = -Math.PI / 2; m.position.y = y; return m; };
    const ringT = canvasTex(256, 256, (g, w, h) => { g.translate(w / 2, h / 2); for (const [r, lw, a] of [[118, 10, 1], [92, 5, .7], [64, 3, .5]]) { g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = lw; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(0, 0, 118, 0, TAU); g.fill(); for (let k = 0; k < 6; k++) { g.rotate(TAU / 6); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(-4, -118, 8, 18); } });
    const chevT = canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; for (const y of [30, 64, 98]) { g.globalAlpha = y === 64 ? 1 : .55; g.beginPath(); g.moveTo(30, y + 18); g.lineTo(64, y - 14); g.lineTo(98, y + 18); g.stroke(); } });
    // teleporters: a ring on the floor and a column of light where you step on, a fainter ring where you come out
    for (const t of TPS) {
      const g = add(new THREE.Group()); g.position.set(t.a[0], hAt(t.a[0], t.a[1]), t.a[1]);
      const ring = g.add(disc(.95, glow(col, { map: ringT, opacity: .9 }))) && g.children[0];
      const colm = new THREE.Mesh(new THREE.CylinderGeometry(.85, .85, 3.2, 24, 1, true), glow(col, { opacity: .16 })); colm.position.y = 1.6; g.add(colm);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(.8, .035, 6, 32), glow(col, { opacity: .8 })); halo.rotation.x = Math.PI / 2; g.add(halo);
      const out = add(disc(.75, glow(col, { map: ringT, opacity: .35 }))); out.position.set(t.b[0], hAt(t.b[0], t.b[1]) + .03, t.b[1]);
      Z.tps.push({ ring, colm, halo, out });
    }
    // jump pads: a glowing disc with chevrons pointing where it throws you
    for (const p of PADS) {
      const g = add(new THREE.Group()); g.position.set(p.a[0], hAt(p.a[0], p.a[1]), p.a[1]);
      const base = disc(.9, glow('#ffd23f', { map: ringT, opacity: .7 })); g.add(base);
      const arrow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), glow('#fff4b0', { map: chevT, opacity: .9 })); arrow.rotation.x = -Math.PI / 2; arrow.rotation.z = Math.atan2(p.b[0] - p.a[0], p.b[1] - p.a[1]) + Math.PI; arrow.position.y = .05; g.add(arrow);
      const lift = new THREE.Mesh(new THREE.CylinderGeometry(.75, .9, 1.6, 20, 1, true), glow('#ffd23f', { opacity: .12 })); lift.position.y = .8; g.add(lift);
      Z.pads.push({ base, arrow, lift });
    }
    // vents: the glow under the grate when it blows (the steam itself is a smoke cloud)
    for (const v of VENTS) { const m = add(disc(.85, glow('#ffb070', { opacity: 0 }), .06)); m.position.x = v[0]; m.position.z = v[1]; Z.vents.push(m); }
    // gates: a steel shutter in each opening that rises out of the floor; a switch post beside it on the site's side
    const shutT = canvasTex(256, 256, (g, w, h) => { grain(g, w, h, '#8a9098', .14, 2500); g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 4);
      for (let x = -h; x < w; x += 48) { g.fillStyle = '#e8b520'; g.beginPath(); g.moveTo(x, h); g.lineTo(x + 24, h); g.lineTo(x + 24 + 40, h - 40); g.lineTo(x + 40, h - 40); g.closePath(); g.fill(); } g.fillStyle = '#1c1f24'; g.fillRect(0, h - 44, w, 4); });
    GATES.forEach((G, gi) => {
      let i0 = 1e9, j0 = 1e9, i1 = -1, j1 = -1; for (const k of G.cells) { const i = k % GW, j = Math.floor(k / GW); i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j); }
      const w = (i1 - i0 + 1) * CS, d = (j1 - j0 + 1) * CS, thin = w > d ? [w, .5] : [.5, d];
      const m = add(new THREE.Mesh(new THREE.BoxGeometry(thin[0], GATE_H, thin[1]), new THREE.MeshLambertMaterial({ map: shutT, color: LC('#c8ccd2') }))); m.position.set((i0 + i1 + 1) * CS / 2, -GATE_H / 2, (j0 + j1 + 1) * CS / 2); m.castShadow = !X.low;
      const sws = G.sw.map(p => { const post = add(new THREE.Group()); post.position.set(p[0], hAt(p[0], p[1]), p[1]);
        const b = new THREE.Mesh(new THREE.BoxGeometry(.32, 1.25, .32), new THREE.MeshLambertMaterial({ color: LC('#3a3f48') })); b.position.y = .62; post.add(b);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(.34, .16, .34), new THREE.MeshBasicMaterial({ color: '#7bff8a', toneMapped: false })); lamp.position.y = 1.3; post.add(lamp);
        const ring = disc(.9, glow('#7bff8a', { map: ringT, opacity: .25 })); post.add(ring); return { lamp, ring }; });
      Z.gates.push({ m, gi, sws, y: -GATE_H / 2 });
    });
    // breakable walls: plaster over brick that cracks as it is shot, then gives way
    const brkT = canvasTex(256, 512, (g, w, h) => { grain(g, w, h, '#cdbfa5', .12, 5000); g.fillStyle = 'rgba(120,70,50,.5)'; for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 * 24; x < w; x += 48) if (Math.random() < .25) g.fillRect(x, y, 44, 28);
      g.strokeStyle = 'rgba(40,30,24,.55)'; g.lineWidth = 3; for (let k = 0; k < 7; k++) { let x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 7; s++) { x += (Math.random() - .5) * 60; y += Math.random() * 50; g.lineTo(x, y); } g.stroke(); }
      g.fillStyle = 'rgba(255,90,40,.85)'; g.font = '900 60px sans-serif'; g.textAlign = 'center'; g.fillText('✕', w / 2, h * .42); });
    BRKS.forEach((B, bi) => {
      const parts = B.cells.map(k => { const gq = new THREE.BoxGeometry(CS, WALL_H, CS); gq.translate(((k % GW) + .5) * CS, WALL_H / 2, (Math.floor(k / GW) + .5) * CS); return gq; });
      const geo = parts.length === 1 ? parts[0] : mergeGeos(parts), m = add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: brkT, color: LC('#ffffff') }))); m.castShadow = !X.low; m.receiveShadow = !X.low;
      Z.brks.push({ m, bi, shake: 0 });
    });
    // tall grass: tufts of crossed blades over every grass cell, swaying in the wind
    const gcells = []; for (let k = 0; k < NC; k++) if (GRASS[k]) gcells.push(k);
    if (gcells.length) {
      const bladeT = canvasTex(128, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let k = 0; k < 26; k++) { const x = 8 + Math.random() * (w - 16), lean = (Math.random() - .5) * 30, top = 10 + Math.random() * 60, c = 60 + Math.random() * 70;
        g.strokeStyle = `rgb(${c * .55 | 0},${c + 60 | 0},${c * .35 | 0})`; g.lineWidth = 4 + Math.random() * 4; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + lean * .3, h * .5, x + lean, top); g.stroke(); } });
      const blades = []; for (let a = 0; a < 3; a++) { const p = new THREE.PlaneGeometry(1.5, 1.95); p.translate(0, .97, 0); p.rotateY(a * Math.PI / 3); blades.push(p); }
      const tuft = mergeGeos(blades), per = X.low ? 2 : 4, n = gcells.length * per;
      const gm = new THREE.MeshLambertMaterial({ map: bladeT, alphaTest: .45, side: THREE.DoubleSide, color: LC('#c8f0a0') });
      gm.onBeforeCompile = sh => { sh.uniforms.uT = Z.windT = Z.windT || { value: 0 }; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vec4 wp = instanceMatrix * vec4(0.,0.,0.,1.); float sw = sin(uT * 1.7 + wp.x * .35 + wp.z * .21) * .16 + sin(uT * 3.1 + wp.z * .5) * .05; transformed.x += sw * max(0., position.y); transformed.z += sw * .6 * max(0., position.y);'); };
      const im = add(new THREE.InstancedMesh(tuft, gm, n)), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
      let n2 = 0; for (const k of gcells) for (let r = 0; r < per; r++) { const i = k % GW, j = Math.floor(k / GW); M4.compose(v.set((i + .2 + Math.random() * .6) * CS, 0, (j + .2 + Math.random() * .6) * CS), q.setFromEuler(e.set(0, Math.random() * TAU, 0)), s.set(.8 + Math.random() * .4, .85 + Math.random() * .3, .8 + Math.random() * .4)); im.setMatrixAt(n2++, M4); }
      im.frustumCulled = false; Z.grass = im;
    }
    // low gravity: motes drifting slowly upward over the low-gravity floor
    const lcells = []; for (let k = 0; k < NC; k++) if (LOWG[k]) lcells.push(k);
    if (lcells.length) {
      const n = Math.min(500, lcells.length * 3), pos = new Float32Array(n * 3), sp = new Float32Array(n);
      for (let a = 0; a < n; a++) { const k = lcells[Math.floor(Math.random() * lcells.length)]; pos[a * 3] = ((k % GW) + Math.random()) * CS; pos[a * 3 + 1] = Math.random() * 5; pos[a * 3 + 2] = (Math.floor(k / GW) + Math.random()) * CS; sp[a] = .15 + Math.random() * .35; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      Z.motes = add(new THREE.Points(geo, new THREE.PointsMaterial({ color: LC('#9ad8ff'), size: .09, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending }))); Z.motes.userData.sp = sp;
    }
    // belts: the chevrons in their ground run with the belt (72-world made one texture for each direction)
    Z.belts = X.beltT || [];
    // the spawn barriers: a wall of light round each side's spawn room in the buy phase, dropped when the round goes live
    const barT = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.25, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.5)'; for (let y = 6; y < h; y += 22) g.fillRect(0, y, w, 2); });
    Z.barriers = ['att', 'def'].map(side => {
      const Zs = ZONE[side], P = [], U = [], I = []; const quad = (a, b) => { const n = P.length / 3; P.push(a[0], 0, a[1], b[0], 0, b[1], b[0], 3.2, b[1], a[0], 3.2, a[1]); U.push(0, 0, 1, 0, 1, 1, 0, 1); I.push(n, n + 1, n + 2, n, n + 2, n + 3); };
      for (let k = 0; k < NC; k++) { if (!Zs[k]) continue; const i = k % GW, j = Math.floor(k / GW), x0 = i * CS, z0 = j * CS, x1 = x0 + CS, z1 = z0 + CS;
        for (const [di, dj, a, b] of [[1, 0, [x1, z0], [x1, z1]], [-1, 0, [x0, z0], [x0, z1]], [0, 1, [x0, z1], [x1, z1]], [0, -1, [x0, z0], [x1, z0]]]) { const nk = idx(i + di, j + dj); if (nk >= 0 && NAV[nk] && !Zs[nk]) quad(a, b); } }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I);
      const m = add(new THREE.Mesh(geo, glow(side === 'att' ? '#ff8a3d' : '#4fd0ff', { map: barT, opacity: .7 }))); m.visible = false; return { m, side, y: 1 };
    });
    buildLife(W, TH);
  }
  // merge plain geometries (positions, normals and uvs; indexed or not) into one
  function mergeGeos(list) {
    let nv = 0, ni = 0; for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), I = new Uint32Array(ni); let ov = 0, oi = 0;
    for (const g of list) { const n = g.attributes.position.count; P.set(g.attributes.position.array, ov * 3); N.set(g.attributes.normal.array, ov * 3); U.set(g.attributes.uv.array, ov * 2);
      if (g.index) for (let k = 0; k < g.index.count; k++) I[oi + k] = g.index.array[k] + ov; else for (let k = 0; k < n; k++) I[oi + k] = ov + k; oi += g.index ? g.index.count : n; ov += n; }
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('uv', new THREE.BufferAttribute(U, 2)); out.setIndex(new THREE.BufferAttribute(I, 1)); return out;
  }

  /* ---------- life beyond the walls, one kind for each theme ---------- */
  function buildLife(W, TH) {
    const Z = X.mech, t = MAP.theme, add = o => { W.add(o); return o; }, cx = MW / 2, cz = MH / 2, R = Math.max(MW, MH);
    const bas = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: LC(c) }, o || {})), lam = c => new THREE.MeshLambertMaterial({ color: LC(c) });
    const life = fn => Z.life.push(fn);
    // birds: a few dark V shapes wheeling in wide circles (gulls over the harbour, parrots over the jungle, a hawk over the sand)
    const birds = (n, c, h0, r0, sp, size = 1) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.6, 0, .2, 0, 0, -.15, .6, 0, .2, 0, 0, -.15, 0, .05, .1, 0, 0, -.15]), 3));
      for (let b = 0; b < n; b++) { const m = add(new THREE.Mesh(geo, bas(c, { side: THREE.DoubleSide }))); m.scale.setScalar(size * (.8 + Math.random() * .4)); const ph = Math.random() * TAU, r = r0 * (.6 + Math.random() * .8), h = h0 + Math.random() * 10, w = sp * (.7 + Math.random() * .6) * (Math.random() < .5 ? 1 : -1), ox = cx + (Math.random() - .5) * R * .4, oz = cz + (Math.random() - .5) * R * .3;
        life(T => { const a = ph + T * w / r * 6; m.position.set(ox + Math.cos(a) * r, h + Math.sin(T * .7 + ph) * 2, oz + Math.sin(a) * r * .7); m.rotation.y = -a + (w > 0 ? 0 : Math.PI); const f = Math.sin(T * 9 + ph) * .5; m.scale.y = 1 + f; }); } };
    // a cloud of drifting points (snow, dust, embers, fireflies)
    const drift = (n, c, size, box, step, op = .85) => { const pos = new Float32Array(n * 3); for (let a = 0; a < n; a++) { pos[a * 3] = box[0] + Math.random() * (box[1] - box[0]); pos[a * 3 + 1] = box[2] + Math.random() * (box[3] - box[2]); pos[a * 3 + 2] = box[4] + Math.random() * (box[5] - box[4]); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const p = add(new THREE.Points(geo, new THREE.PointsMaterial({ color: LC(c), size, transparent: true, opacity: op, depthWrite: false, blending: t === 'snow' || t === 'desert' || t === 'autumn' ? THREE.NormalBlending : THREE.AdditiveBlending }))); p.frustumCulled = false;
      life((T, dt) => { const a = geo.attributes.position.array; for (let k = 0; k < n; k++) step(a, k * 3, T, dt, box); geo.attributes.position.needsUpdate = true; }); };
    const wrap = (a, i, box) => { if (a[i] < box[0]) a[i] += box[1] - box[0]; if (a[i] > box[1]) a[i] -= box[1] - box[0]; if (a[i + 2] < box[4]) a[i + 2] += box[5] - box[4]; if (a[i + 2] > box[5]) a[i + 2] -= box[5] - box[4]; };
    const lowN = X.low ? .5 : 1, mapBox = [-6, MW + 6, 0, 16, -6, MH + 6];
    if (t === 'harbor') {
      birds(7, '#f4f4f0', 16, 26, 4, 1.2);
      // the lighthouse lamp sweeps round; the boat rocks on the swell
      const beam = add(new THREE.Mesh(new THREE.ConeGeometry(4, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: .12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })));
      beam.geometry.translate(0, -30, 0); beam.position.set(MW + 26, 21, -30); life(T => { beam.rotation.set(Math.PI / 2, 0, T * .6); });
      W.traverse(o => { if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.width === 7 && o.position.y < 0) { const y0 = o.position.y; life(T => { o.position.y = y0 + Math.sin(T * 1.3) * .12; o.rotation.z = Math.sin(T * .9) * .04; }); } });
    } else if (t === 'neon') {
      // air traffic between the towers: small craft with lit noses and tails on long loops
      for (let k = 0; k < (X.low ? 5 : 10); k++) { const g = add(new THREE.Group()), body = new THREE.Mesh(new THREE.BoxGeometry(2.4, .7, 1.1), lam('#20242e')); g.add(body);
        const nose = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, 1), bas(['#3df2ff', '#ffd23f', '#ff3ea5'][k % 3])); nose.position.x = 1.25; g.add(nose); const tail = new THREE.Mesh(new THREE.BoxGeometry(.2, .3, 1.1), bas('#ff2a4a')); tail.position.x = -1.25; g.add(tail);
        const r = R * (.75 + Math.random() * .6), h = 18 + Math.random() * 30, sp = (.04 + Math.random() * .05) * (k % 2 ? 1 : -1), ph = Math.random() * TAU;
        life(T => { const a = ph + T * sp; g.position.set(cx + Math.cos(a) * r, h + Math.sin(T * .4 + ph) * 2, cz + Math.sin(a) * r * .8); g.rotation.y = -a + (sp > 0 ? -Math.PI / 2 : Math.PI / 2); }); }
      // signs flicker now and then
      const signs = []; W.traverse(o => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial && o.geometry && o.geometry.parameters && o.geometry.parameters.depth === .4) signs.push(o); });
      for (const sgn of signs) { const c0 = sgn.material.color.clone(), ph = Math.random() * 50; sgn.material = sgn.material.clone(); life(T => { const f = Math.sin(T * 13 + ph) > .97 || (Math.sin(T * .3 + ph) > .995) ? .25 : 1; sgn.material.color.copy(c0).multiplyScalar(f); }); }
      // a fine rain
      drift(Math.round(900 * lowN), '#8fb4ff', .05, [-10, MW + 10, 0, 22, -10, MH + 10], (a, i, T, dt, box) => { a[i + 1] -= dt * 16; a[i] += dt * 1.5; if (a[i + 1] < 0) { a[i + 1] += 22; } wrap(a, i, box); }, .45);
    } else if (t === 'snow') {
      drift(Math.round(1400 * lowN), '#ffffff', .11, mapBox, (a, i, T, dt, box) => { a[i + 1] -= dt * (1.1 + (i % 7) * .08); a[i] += dt * (1.2 + Math.sin(T * .5 + i) * .8); a[i + 2] += Math.sin(T + i) * dt * .3; if (a[i + 1] < 0) a[i + 1] += 16; wrap(a, i, box); });
      // a weather mast with a spinning anemometer and a turning radar dish beyond the walls
      const mast = add(new THREE.Group()); mast.position.set(MW + 14, 0, cz - 10); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.25, .35, 22, 8), lam('#c0392b')); pole.position.y = 11; mast.add(pole);
      const cups = new THREE.Group(); cups.position.y = 22.4; mast.add(cups); for (let k = 0; k < 3; k++) { const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, .1, .1), lam('#e0e6ea')); arm.rotation.y = k * TAU / 3; arm.geometry.translate(1.1, 0, 0); cups.add(arm); const cup = new THREE.Mesh(new THREE.SphereGeometry(.28, 8, 6), lam('#e0e6ea')); cup.position.set(Math.cos(-k * TAU / 3) * 2.2, 0, Math.sin(-k * TAU / 3) * 2.2); cups.add(cup); }
      const dish = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 8, 0, TAU, 0, 1.1), lam('#e8eef4')); dish.position.set(-18, 8, MH + 16); dish.material.side = THREE.DoubleSide; add(dish);
      life(T => { cups.rotation.y = T * 4; dish.rotation.set(-.6, T * .35, 0); });
    } else if (t === 'desert') {
      birds(2, '#3a2a1e', 26, 34, 3, 2.2);
      drift(Math.round(700 * lowN), '#e8c992', .07, mapBox, (a, i, T, dt, box) => { a[i] += dt * (5 + (i % 5)); a[i + 1] += Math.sin(T * 2 + i) * dt * .4; a[i + 2] += dt * 1.2; if (a[i + 1] < .1 || a[i + 1] > 8) a[i + 1] = .3 + (i % 13) * .5; wrap(a, i, box); }, .5);
      // the storm thickens the dust: the cloud follows the map's sandstorm
      const sand = X.scene.fog; life(() => { const s = M ? M.storm || 0 : 0; sand.near = lp(TH.far * .2, 4, s); sand.far = lp(TH.far, STORM_SIGHT * 1.6, s); });
    } else if (t === 'jungle') {
      birds(6, '#d8452f', 14, 22, 5, .9);
      drift(Math.round(240 * lowN), '#d8ff70', .14, [-4, MW + 4, .4, 4.5, -4, MH + 4], (a, i, T, dt) => { a[i] += Math.sin(T * .8 + i * 1.7) * dt * .6; a[i + 1] += Math.cos(T * 1.1 + i) * dt * .3; a[i + 2] += Math.cos(T * .7 + i * 2.3) * dt * .6; });
      // a waterfall over the far wall
      const fallT = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#bfe8ff'; g.fillRect(0, 0, w, h); for (let k = 0; k < 120; k++) { g.fillStyle = `rgba(255,255,255,${.2 + Math.random() * .5})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 10 + Math.random() * 30); } });
      fallT.wrapS = fallT.wrapT = THREE.RepeatWrapping; fallT.repeat.set(2, 1.5);
      const fall = add(new THREE.Mesh(new THREE.PlaneGeometry(10, 26), new THREE.MeshBasicMaterial({ map: fallT, transparent: true, opacity: .85 }))); fall.position.set(cx + 8, 13, -16); life(T => { fallT.offset.y = T * .9; });
      const pool = add(new THREE.Mesh(new THREE.CircleGeometry(9, 24), new THREE.MeshBasicMaterial({ color: LC('#4fa8c8'), transparent: true, opacity: .8 }))); pool.rotation.x = -Math.PI / 2; pool.position.set(cx + 8, .05, -12);
    } else if (t === 'lava') {
      drift(Math.round(500 * lowN), '#ffae55', .09, [-30, MW + 30, 0, 26, -30, MH + 30], (a, i, T, dt, box) => { a[i + 1] += dt * (1.2 + (i % 5) * .3); a[i] += Math.sin(T + i) * dt * .5; if (a[i + 1] > 26) a[i + 1] = 0; wrap(a, i, box); });
      // smoke from the chimneys: grey puffs that rise and fade
      const puffM = new THREE.MeshLambertMaterial({ color: LC('#4a4040'), transparent: true, opacity: .5, depthWrite: false }), puffG = new THREE.SphereGeometry(2.4, 8, 6);
      const tops = []; W.traverse(o => { if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.radiusTop === 2.4) tops.push(o.position.clone()); });
      for (const p of tops.slice(0, 8)) for (let k = 0; k < 3; k++) { const m = add(new THREE.Mesh(puffG, puffM.clone())), ph = k / 3; life(T => { const u = (T * .12 + ph) % 1; m.position.set(p.x + u * 6, p.y + 1 + u * 22, p.z + u * 3); m.scale.setScalar(.6 + u * 2.4); m.material.opacity = .45 * (1 - u); }); }
    } else if (t === 'autumn') {
      // leaves coming down: slowly, swinging from side to side, carried east on the breeze (the rooks are the far flocks)
      drift(Math.round(380 * lowN), '#d8662a', .13, [-6, MW + 6, 0, 12, -6, MH + 6], (a, i, T, dt, box) => { a[i + 1] -= dt * (.7 + (i % 5) * .12); a[i] += dt * (1 + Math.sin(T * 1.3 + i) * 1.4); a[i + 2] += Math.cos(T * 1.1 + i * .7) * dt * .8; if (a[i + 1] < .05) a[i + 1] += 12; wrap(a, i, box); }, .9);
    } else if (t === 'space') {
      // the station's great ring turning overhead, a shuttle on its way in, tumbling rocks
      const ring = add(new THREE.Mesh(new THREE.TorusGeometry(120, 3.5, 8, 64), lam('#8a96aa'))); ring.position.set(cx, 70, cz - 160); ring.rotation.x = 1.1;
      const lights = add(new THREE.Mesh(new THREE.TorusGeometry(120, .8, 4, 64), bas('#38e8ff'))); lights.position.copy(ring.position); lights.rotation.x = 1.1;
      const sh = add(new THREE.Group()); const hull = new THREE.Mesh(new THREE.BoxGeometry(6, 1.6, 2.4), lam('#d4dcea')); sh.add(hull); const eng = new THREE.Mesh(new THREE.BoxGeometry(.4, 1, 1.6), bas('#7fd8ff')); eng.position.x = -3.2; sh.add(eng); const blink = new THREE.Mesh(new THREE.SphereGeometry(.25, 6, 4), bas('#ff3b3b')); blink.position.set(3, .9, 0); sh.add(blink);
      const rocks = []; for (let k = 0; k < 8; k++) { const r = add(new THREE.Mesh(new THREE.DodecahedronGeometry(2 + Math.random() * 5, 0), lam('#6a6058'))); r.position.set(cx + (Math.random() - .5) * 400, 30 + Math.random() * 80, cz - 120 - Math.random() * 200); r.userData.s = [Math.random() * .3, Math.random() * .3]; rocks.push(r); }
      life(T => { ring.rotation.z = T * .02; lights.rotation.z = T * .02; const u = (T * .015) % 1; sh.position.set(lp(-300, MW + 300, u), 45 + Math.sin(u * 6) * 6, cz - 90); blink.visible = Math.sin(T * 6) > .6; for (const r of rocks) { r.rotation.x += r.userData.s[0] * .016; r.rotation.y += r.userData.s[1] * .016; } });
    }
    farLife(W, TH, add, life, bas, lam, cx, cz);

  }

  /* ---------- life farther out: movement against the horizon, all of it well past the walls ----------
     A flock or two in V formation (one instanced mesh each, every bird flapping), a high aircraft with blinking lights and,
     by day, a contrail; and each theme's own: ships and a sail on the sea, a camel caravan over the dunes with dust devils,
     a cable car between two pylons, a seaplane over the canopy, ore buckets on a cableway and drones over the works,
     streams of hover-cars along the skyways and a blimp with a lit screen, freighters crossing the station's sky. It all
     stays inside the theme's fog (farther would be lost in it), and the Low setting has fewer of each. */
  function farLife(W, TH, add, life, bas, lam, cx, cz) {
    const t = MAP.theme, low = X.low, F = TH.far || 300, ex = Math.max(0, MW / 2 - 32, (MH / 2 - 22) / .8), D = r => Math.min(r + ex, F * .72);
    const rnd2 = (a, b) => a + Math.random() * (b - a), m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), p4 = new THREE.Vector3(), s4 = new THREE.Vector3();
    const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
    // boxes of one colour made one mesh (one draw): parts are [w, h, d, x, y, z]
    const merged = (parts, m) => new THREE.Mesh(mergeGeos(parts.map(([w, h, d, x = 0, y = 0, z = 0]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z))), m);
    // a flock: a V of birds flying a wide loop round the map; local -z is a bird's nose, x its wings
    const birdGeo = new THREE.BufferGeometry(); birdGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.6, 0, .2, 0, 0, -.15, .6, 0, .2, 0, 0, -.15, 0, .05, .1, 0, 0, -.15]), 3));
    const flock = (n, col, alt, dist, speed, size) => {
      const im = add(new THREE.InstancedMesh(birdGeo, bas(col, { side: THREE.DoubleSide }), n)); im.frustumCulled = false;
      const offs = []; for (let k = 0; k < n; k++) { const row = Math.ceil(k / 2), side = k % 2 ? 1 : -1; offs.push([k ? side * row * 1.7 * size : 0, row * 2 * size + rnd2(-.4, .4) * size, rnd2(-.5, .5) * size]); }
      const ph = Math.random() * TAU, dir = Math.random() < .5 ? 1 : -1;
      life(T => { const a = ph + T * speed / dist * dir, hx = cx + Math.cos(a) * dist, hz = cz + Math.sin(a) * dist * .8, dx = -Math.sin(a) * dir, dz = Math.cos(a) * .8 * dir, yaw = Math.atan2(-dx, -dz), c = Math.cos(yaw), sn = Math.sin(yaw);
        for (let k = 0; k < n; k++) { const o = offs[k]; p4.set(hx + o[0] * c + o[1] * sn, alt + o[2] + Math.sin(T * .6 + k) * .5, hz - o[0] * sn + o[1] * c); e4.set(0, yaw, Math.sin(T * 1.3 + k) * .15); q4.setFromEuler(e4); const fl = 1 + Math.sin(T * 7 + k * 1.7) * .6; s4.set(size, size * fl, size); m4.compose(p4, q4, s4); im.setMatrixAt(k, m4); }
        im.instanceMatrix.needsUpdate = true; });
    };
    // a high aircraft crossing the sky: a white body, red and green lights at the wing tips, a strobe; by day a contrail
    const plane = (alt, dist, speed, day) => {
      const g = add(new THREE.Group()); g.add(merged([[1.2, 1.2, 9], [11, .25, 2, 0, 0, .5], [3.6, .2, 1, 0, .2, 4], [.2, 1.8, 1.2, 0, 1, 4]], lam('#e8ecf0')));
      const red = box(.4, .4, .4, bas('#ff3b3b'), -5.6, 0, .5), grn = box(.4, .4, .4, bas('#3bff6a'), 5.6, 0, .5), strobe = box(.5, .5, .5, bas('#ffffff'), 0, .8, 0); g.add(red, grn, strobe);
      const ph = Math.random(), ang = Math.random() * TAU, ux = Math.cos(ang), uz = Math.sin(ang);
      life(T => { const u = ((T * speed / (dist * 2.4) + ph) % 1) * 2 - 1; g.position.set(cx + ux * u * dist * 1.2 - uz * dist * .35, alt, cz + uz * u * dist * 1.2 + ux * dist * .35); g.rotation.y = Math.atan2(-ux, -uz); strobe.visible = Math.sin(T * 9) > .85; red.visible = grn.visible = Math.sin(T * 3) > -.6; });
    };
    const day = t !== 'neon' && t !== 'space' && t !== 'lava';
    if (day) { flock(low ? 7 : 11, t === 'harbor' || t === 'snow' ? '#f4f4f0' : t === 'jungle' ? '#2b2520' : '#2a221c', 34, D(110), 9, 1.3); if (!low) flock(7, t === 'jungle' ? '#e04a2a' : '#3a3530', 46, D(150), 8, 1.1); plane(Math.min(110, F * .3), D(190), 70, t !== 'jungle'); }
    if (t === 'harbor') {
      // ships crossing the sea beyond the sea wall, and a sail; each rocks on the swell
      const hullM = lam('#2f3d4f'), deck = lam('#e6e1d6'), redM = lam('#b5523f');
      for (let k = 0; k < (low ? 2 : 3); k++) { const g = add(new THREE.Group()), L = 22 + k * 7; g.add(merged([[L, 3, 5, 0, .5, 0], [L * .8, 1, 4.4, L * .05, 2.2, 0]], k === 1 ? redM : hullM)); g.add(merged([[L * .3, 3.4, 4, -L * .3, 3.8, 0], [.8, 3.4, .8, -L * .3, 7, 0]], deck));
        if (k !== 1) g.add(merged([0, 1, 2, 3].map(c => [L * .12, 2.2, 3.8, L * (.02 + c * .13), 3.3, 0]), lam(['#c0392b', '#2f8f8a', '#d6a23a'][k % 3])));
        const z = -70 - k * 50, sp = (2.2 + k * .8) * (k % 2 ? -1 : 1), ph = Math.random() * 900, span = Math.min(F * 1.4, 700);
        life(T => { const u = ((T * sp + ph) % span + span) % span; g.position.set(cx - span / 2 + u, -1.2 + Math.sin(T * .9 + k) * .25, z); g.rotation.set(Math.sin(T * .7 + k) * .03, sp > 0 ? 0 : Math.PI, Math.sin(T * .9 + k) * .05); }); }
      const sail = add(new THREE.Group()); sail.add(box(5, 1, 1.6, lam('#f2efe8'), 0, .2, 0)); const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, .7, 0, 0, 7, 0, 3, .9, 0]), 3)); sg.computeVertexNormals(); sail.add(new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ color: LC('#ffffff'), side: THREE.DoubleSide })));
      life(T => { const a = T * .02; sail.position.set(cx + Math.cos(a) * 160, -1.1 + Math.sin(T * 1.1) * .2, -70 - Math.abs(Math.sin(a)) * 60); sail.rotation.set(0, -a, Math.sin(T * .8) * .08); });
    } else if (t === 'desert') {
      // a camel caravan walking the dunes: bodies sway, legs swing, two riders
      const cm = lam('#a8784a'), rm = lam('#3a2a1e'), cloth = lam('#2f6f9a'), N = low ? 4 : 6, cams = [];
      for (let k = 0; k < N; k++) { const g = add(new THREE.Group()); g.add(merged([[1, 1.1, 2.6, 0, 2.4, 0], [.8, .7, .9, 0, 3.2, .1], [.4, 1.4, .4, 0, 3.2, -1.4], [.45, .45, .9, 0, 3.9, -1.75], [.22, 2, .22, -.32, 1, -.9], [.22, 2, .22, .32, 1, -.9], [.22, 2, .22, -.32, 1, .9], [.22, 2, .22, .32, 1, .9]], cm));
        if (k % 3 === 1) g.add(merged([[.6, .9, .5, 0, 3.9, .1], [.7, .3, .6, 0, 4.4, .1]], rm));
        g.scale.setScalar(1.6); cams.push({ g, legs: [] }); }
      const R0 = D(105), sp = .9 / R0, dir = Math.random() < .5 ? 1 : -1, ph = Math.random() * TAU;
      life(T => { cams.forEach((c, k) => { const a = ph + T * sp * dir - k * 3.4 / R0 * dir, x = cx + Math.cos(a) * R0, z = cz + Math.sin(a) * R0 * .8; c.g.position.set(x, Math.abs(Math.sin(T * 2.4 + k)) * .12, z); c.g.rotation.set(Math.sin(T * 2.4 + k) * .04, Math.atan2(Math.sin(a) * dir, -Math.cos(a) * .8 * dir), Math.sin(T * 1.2 + k) * .05);
        c.legs.forEach((l, j) => { l.rotation.x = Math.sin(T * 3 + k + (j === 0 || j === 3 ? 0 : Math.PI)) * .35; }); }); });
      // dust devils: tall spinning funnels of sand that wander and fade
      for (let k = 0; k < (low ? 1 : 2); k++) { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(3, .6, 24, 10, 1, true), new THREE.MeshBasicMaterial({ color: LC('#e2c48e'), transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide }))), ph = Math.random() * TAU, R1 = D(80 + k * 50);
        life(T => { const a = ph + T * .015; m.position.set(cx + Math.cos(a) * R1 + Math.sin(T * .3 + k) * 8, 12, cz + Math.sin(a) * R1 * .8); m.rotation.y = T * 3; m.material.opacity = .12 + .12 * (.5 + .5 * Math.sin(T * .2 + k * 2)); }); }
    } else if (t === 'snow') {
      // a cable car between two pylons across the valley
      const a0 = Math.random() * TAU, R2 = D(150), A = [cx + Math.cos(a0) * R2, cz + Math.sin(a0) * R2 * .8], B = [cx + Math.cos(a0 + 1.1) * R2, cz + Math.sin(a0 + 1.1) * R2 * .8], pm = lam('#5a6470');
      add(merged([A, B].flatMap(P => [[1.6, 34, 1.6, P[0], 17, P[1]], [5, 1, 1, P[0], 34, P[1]]]), pm));
      const cab = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(A[0], 33.5, A[1]), new THREE.Vector3(B[0], 33.5, B[1])]); add(new THREE.Line(cab, new THREE.LineBasicMaterial({ color: LC('#20242a') })));
      const car = add(new THREE.Group()); car.add(box(3, 2.4, 2.2, lam('#c0392b'), 0, -3.4, 0)); car.add(box(2.6, .8, 1.9, bas('#bfe4ff'), 0, -3, 0)); car.add(box(.15, 2.2, .15, pm, 0, -1.1, 0));
      life(T => { const u = .5 - .5 * Math.cos(T * .05); car.position.set(lp(A[0], B[0], u), 33.5 - Math.sin(u * Math.PI) * 3, lp(A[1], B[1], u)); car.rotation.y = Math.atan2(B[0] - A[0], B[1] - A[1]); });
    } else if (t === 'jungle') {
      // a seaplane circling low over the canopy, its propeller a blur
      const g = add(new THREE.Group()), body = lam('#d8d0b8'), trim = lam('#c0392b'); g.add(box(1.3, 1.3, 7, body)); g.add(box(10, .25, 1.6, trim, 0, .7, -.5)); g.add(box(.2, 1.6, 1, trim, 0, 1, 3.2)); g.add(box(3.4, .2, .9, body, 0, .3, 3.2));
      for (const sx of [-1.6, 1.6]) g.add(box(.5, .5, 4.5, body, sx, -1.6, -.4));
      const prop = box(.12, 2.6, .12, lam('#202020'), 0, 0, -3.6); g.add(prop); const R3 = D(95), ph = Math.random() * TAU;
      life(T => { const a = ph + T * .09; g.position.set(cx + Math.cos(a) * R3, 42 + Math.sin(T * .3) * 4, cz + Math.sin(a) * R3 * .8); g.rotation.set(0, Math.atan2(Math.sin(a), -Math.cos(a) * .8), -.25); prop.rotation.z = T * 40; });
    } else if (t === 'lava') {
      // ore buckets on an endless cableway, and two drones with blinking lights
      const a0 = Math.random() * TAU, R4 = D(120), A = [cx + Math.cos(a0) * R4, cz + Math.sin(a0) * R4 * .8], B = [cx + Math.cos(a0 + 1.4) * R4, cz + Math.sin(a0 + 1.4) * R4 * .8], pm = lam('#3a3230');
      for (const P of [A, B]) add(box(2, 30, 2, pm, P[0], 15, P[1]));
      for (const off of [-1.2, 1.2]) { const c = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(A[0], 29, A[1] + off), new THREE.Vector3(B[0], 29, B[1] + off)]); add(new THREE.Line(c, new THREE.LineBasicMaterial({ color: LC('#1a1412') }))); }
      const bk = [], bm2 = lam('#5a4a40'), ore = bas('#ff7a2a'); for (let k = 0; k < (low ? 6 : 10); k++) { const g = add(new THREE.Group()); g.add(merged([[2.4, 2, 2.4, 0, -3.2, 0], [.16, 2.2, .16, 0, -1.1, 0]], bm2)); g.add(box(2, .3, 2, ore, 0, -2.1, 0)); bk.push(g); }
      life(T => { bk.forEach((g, k) => { const u = (T * .012 + k / bk.length) % 1, back = u > .5, v = back ? (1 - u) * 2 : u * 2, off = back ? -1.2 : 1.2; g.position.set(lp(A[0], B[0], v), 29, lp(A[1], B[1], v) + off); g.children[1].visible = !back; }); });
      for (let k = 0; k < (low ? 1 : 2); k++) { const g = add(new THREE.Group()); g.add(box(1.6, .5, 1.6, lam('#2a2a2e'))); const l = box(.4, .3, .4, bas('#ff2a2a'), 0, -.3, 0); g.add(l); const R5 = D(70 + k * 40), ph = Math.random() * TAU;
        life(T => { const a = ph + T * (.12 + k * .05); g.position.set(cx + Math.cos(a) * R5, 26 + k * 8 + Math.sin(T * .8 + k) * 2, cz + Math.sin(a) * R5 * .8); l.visible = Math.sin(T * 6 + k) > .4; }); }
    } else if (t === 'neon') {
      // streams of hover-cars along three skyways, each way at its own height and speed; and a blimp with a lit screen
      const cols = ['#3df2ff', '#ffd23f', '#ff3ea5', '#ffffff', '#ff7a2a'], carGeo = new THREE.BoxGeometry(3.6, 1, 1.6);
      for (let w = 0; w < 3; w++) { const n = low ? 10 : 18, im = add(new THREE.InstancedMesh(carGeo, bas('#ffffff'), n)); im.frustumCulled = false; const cc = new THREE.Color();
        for (let k = 0; k < n; k++) { cc.set(LC(cols[(k + w) % cols.length])); im.setColorAt(k, cc); }
        const ang = w * 2.1 + Math.random() * .6, ux = Math.cos(ang), uz = Math.sin(ang), off = D(60 + w * 30), h = 34 + w * 18, span = 520, sp = 14 + w * 4;
        life(T => { for (let k = 0; k < n; k++) { const lane = k % 2 ? 1 : -1, u = (((T * sp * lane + k * span / n) % span) + span) % span - span / 2; p4.set(cx + ux * u - uz * (off + lane * 2.5), h + lane * .8, cz + uz * u + ux * (off + lane * 2.5)); e4.set(0, Math.atan2(-ux * lane, -uz * lane) + Math.PI / 2, 0); q4.setFromEuler(e4); s4.set(1, 1, 1); m4.compose(p4, q4, s4); im.setMatrixAt(k, m4); } im.instanceMatrix.needsUpdate = true; }); }
      const blimp = add(new THREE.Group()), bb = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 10), lam('#3a3e4e')); bb.scale.set(3.4, 1, 1); blimp.add(bb);
      const scrT = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#100820'; g.fillRect(0, 0, w, h); g.font = '900 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ff3ea5'; g.fillText('DUELPOINT', w / 2, h / 2 + 2); });
      for (const sd of [-1, 1]) { const scr = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshBasicMaterial({ map: scrT, side: THREE.DoubleSide })); scr.position.set(0, -.5, sd * 4.05); blimp.add(scr); }
      blimp.scale.setScalar(1.6); const R6 = D(120), ph = Math.random() * TAU; life(T => { const a = ph + T * .03; blimp.position.set(cx + Math.cos(a) * R6, 105, cz + Math.sin(a) * R6 * .8); blimp.rotation.y = -a + Math.PI / 2; scrT.offset.x = (T * .1) % 1; });
    } else if (t === 'autumn') {
      // a windmill on the far hill, its sails turning, facing the estate; a hot-air balloon drifting slowly over the valley
      const a0 = Math.random() * TAU, R7 = D(150), wx = cx + Math.cos(a0) * R7, wz = cz + Math.sin(a0) * R7 * .8, mill = add(new THREE.Group()); mill.position.set(wx, 0, wz); mill.rotation.y = Math.atan2(cx - wx, cz - wz);
      // (each part in one colour is one mesh: the tower and cap, the sails and their stocks)
      mill.add(new THREE.Mesh(mergeGeos([new THREE.CylinderGeometry(3, 4.4, 18, 10).translate(0, 9, 0), new THREE.ConeGeometry(3.8, 4.4, 10).translate(0, 20.2, 0)]), lam('#d8c8aa')));
      const sails = new THREE.Group(); sails.position.set(0, 17.6, 4.2); mill.add(sails);
      sails.add(new THREE.Mesh(mergeGeos([new THREE.BoxGeometry(1, 1, 1.4), ...[0, 1, 2, 3].map(k => new THREE.BoxGeometry(.3, 11, .2).translate(0, 5.6, 0).rotateZ(k * Math.PI / 2))]), lam('#4a3424')));
      sails.add(new THREE.Mesh(mergeGeos([0, 1, 2, 3].map(k => new THREE.BoxGeometry(1.7, 9, .1).translate(.95, 6.4, .05).rotateZ(k * Math.PI / 2))), lam('#efe6d2')));
      const bal = add(new THREE.Group()), env = new THREE.Mesh(new THREE.SphereGeometry(5, 14, 10).scale(1, 1.2, 1), lam('#c8452a')); bal.add(env);
      bal.add(new THREE.Mesh(mergeGeos([new THREE.CylinderGeometry(5.05, 5.05, 2.2, 14, 1, true).translate(0, .6, 0), new THREE.BoxGeometry(1.6, 1.2, 1.6).translate(0, -7.6, 0)]), lam('#d8a038')));
      const R8 = D(110), ph = Math.random() * TAU;
      life(T => { sails.rotation.z = -T * .55; const a = ph + T * .006; bal.position.set(cx + Math.cos(a) * R8, 52 + Math.sin(T * .2) * 3, cz + Math.sin(a) * R8 * .8); bal.rotation.y = T * .05; });
    } else if (t === 'space') {
      // freighters crossing on long lanes, nav lights blinking; a satellite turning
      for (let k = 0; k < (low ? 2 : 4); k++) { const g = add(new THREE.Group()), hm = lam(['#9aa6ba', '#c9d2e0', '#7a8496', '#b8a88a'][k]); g.add(merged([[14, 3, 4], [4, 5, 5, -6, 0, 0]], hm)); g.add(box(.6, 2, 2.4, bas('#7fd8ff'), -8.4, 0, 0)); const nl = box(.5, .5, .5, bas('#ff3b3b'), 7.2, 1.8, 0); g.add(nl);
        const ang = Math.random() * TAU, ux = Math.cos(ang), uz = Math.sin(ang), off = D(150 + k * 40), h = 40 + k * 18, span = 700, sp = (6 + k * 2) * (k % 2 ? 1 : -1), ph = Math.random() * span;
        life(T => { const u = (((T * sp + ph) % span) + span) % span - span / 2; g.position.set(cx + ux * u - uz * off, h, cz + uz * u + ux * off); g.rotation.y = Math.atan2(uz, ux) * -1 + (sp > 0 ? 0 : Math.PI); nl.visible = Math.sin(T * 4 + k) > .5; }); }
      const sat = add(new THREE.Group()); sat.add(box(2, 2, 3, lam('#d4b46a'))); for (const sd of [-1, 1]) sat.add(box(7, .1, 2.4, lam('#2a4a8a'), sd * 4.6, 0, 0)); sat.position.set(cx + 60, 90, cz - D(140)); life(T => { sat.rotation.set(T * .1, T * .07, 0); });
    }
  }

  // once a frame: pulse the pads, run the belts, move the gates, crack and drop the walls, and step the life
  function mechFrame(dt) {
    const Z = X.mech; if (!Z) return; Z.t += dt; const T = Z.t;
    if (!M) { for (const fn of Z.life) fn(T, dt); return; }   // behind the menus and agent select the world still lives: ships at sea, birds, planes (until they run they all sit at the origin, in each other)
    if (Z.windT) Z.windT.value = T;
    Z.tps.forEach((p, i) => { const s = 1 + Math.sin(T * 3 + i) * .06; p.ring.scale.setScalar(s); p.colm.material.opacity = .12 + Math.sin(T * 2.2 + i) * .05; p.halo.position.y = .3 + ((T * .6 + i * .3) % 1) * 2.6; p.halo.material.opacity = .8 * (1 - ((T * .6 + i * .3) % 1)); p.out.rotation.z = -T * .8; });
    Z.pads.forEach((p, i) => { p.base.rotation.z = T * 1.5; p.arrow.material.opacity = .55 + Math.sin(T * 6 + i) * .35; p.lift.material.opacity = .08 + Math.max(0, Math.sin(T * 3 + i)) * .1; });
    for (const b of Z.belts) { const d = b.userData.dir; if (d === 0) b.offset.x -= dt * BELT_V / 2; else if (d === 2) b.offset.x += dt * BELT_V / 2; else if (d === 1) b.offset.y -= dt * BELT_V / 2; else b.offset.y += dt * BELT_V / 2; }
    Z.vents.forEach((m, n) => { const on = M.vent && M.vent[n]; m.material.opacity = lp(m.material.opacity, on ? .75 + Math.sin(T * 20) * .1 : 0, Math.min(1, dt * 6)); });
    for (const g of Z.gates) { const G = GATES[g.gi], want = G && !G.open ? GATE_H / 2 : -GATE_H / 2 - .02; g.y += cl(want - g.y, -dt * 9, dt * 9); g.m.position.y = g.y; g.m.visible = g.y > -GATE_H / 2;
      for (const s of g.sws) { s.lamp.material.color.set(G && G.open ? '#7bff8a' : '#ff4a3a'); s.ring.material.opacity = .18 + Math.sin(T * 4) * .08; } }
    for (const w of Z.brks) { const B = BRKS[w.bi]; if (!B) continue; w.m.visible = B.hp > 0; if (!w.m.visible) continue; const k = cl(B.hp / B.HP, 0, 1); w.m.material.color.setRGB(lp(.45, 1, k), lp(.38, 1, k), lp(.34, 1, k));
      if (w.shake > 0) { w.shake = Math.max(0, w.shake - dt); w.m.position.x = Math.sin(T * 90) * .03 * w.shake * 8; } else w.m.position.x = 0; }
    if (Z.motes) { const a = Z.motes.geometry.attributes.position.array, sp = Z.motes.userData.sp; for (let k = 0; k < sp.length; k++) { a[k * 3 + 1] += sp[k] * dt; a[k * 3] += Math.sin(T * .7 + k) * dt * .1; if (a[k * 3 + 1] > 5) a[k * 3 + 1] = 0; } Z.motes.geometry.attributes.position.needsUpdate = true; }
    // the barriers: up through the buy phase, then they sink away as the round goes live
    for (const b of Z.barriers || []) { const up = M.phase === 'buy' && M.mode !== 'range' && M.mode !== 'demo'; b.y = up ? 1 : Math.max(0, b.y - dt * 2.2); b.m.visible = b.y > 0; if (b.m.visible) { b.m.scale.y = b.y; b.m.material.opacity = .55 * b.y + Math.sin(T * 3) * .08 * b.y; } }
    for (const fn of Z.life) fn(T, dt);
    ambTick(dt);
  }
  // a wall hit shudders; a wall that falls bursts into dust and chips
  on('wallHit', (b, dmg) => { const w = X && X.mech && X.mech.brks.find(q => q.bi === b); if (w) w.shake = Math.max(w.shake || 0, dmg >= 60 ? .3 : .12); });   // (a blade's chop shakes it hard)
  on('wallDown', b => { if (!X || !ready) return; const B = BRKS[b]; if (!B) return;
    for (const k of B.cells) { const x = ((k % GW) + .5) * CS, z = (Math.floor(k / GW) + .5) * CS; for (let n = 0; n < 14; n++) spark([x + rnd(-1, 1), rnd(.3, 4.5), z + rnd(-1, 1)], [rnd(-4, 4), rnd(1, 5), rnd(-4, 4)], n % 2 ? '#cdbfa5' : '#8a5a40', .9); }
    X.shake = Math.max(X.shake || 0, .35); });
