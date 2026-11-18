  /* ---------- 71 the map's mechanic, made visible, and the life around each map ----------
     buildMech runs at the end of buildWorld. The ground of special cells (ice, belts, vents, low gravity) is part of the
     world mesh (72-world); what is made here is everything that moves or changes: teleporter and jump pads, belts'
     running chevrons, vent glow, the gates (which rise out of the floor), the breakable walls (which crack, then fall),
     tall grass that sways, motes drifting in low gravity, and each theme's life beyond the walls (gulls, traffic, snow,
     dust, fireflies, embers, a turning station ring). mechFrame steps it all once a frame. */
  const MECH_COL = { harbor: '#38e8ff', neon: '#ff3ea5', snow: '#5ad1ff', desert: '#ffb347', jungle: '#9dff6b', lava: '#ff7a2a', space: '#38e8ff' };
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
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const p = add(new THREE.Points(geo, new THREE.PointsMaterial({ color: LC(c), size, transparent: true, opacity: op, depthWrite: false, blending: t === 'snow' || t === 'desert' ? THREE.NormalBlending : THREE.AdditiveBlending }))); p.frustumCulled = false;
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
    } else if (t === 'space') {
      // the station's great ring turning overhead, a shuttle on its way in, tumbling rocks
      const ring = add(new THREE.Mesh(new THREE.TorusGeometry(120, 3.5, 8, 64), lam('#8a96aa'))); ring.position.set(cx, 70, cz - 160); ring.rotation.x = 1.1;
      const lights = add(new THREE.Mesh(new THREE.TorusGeometry(120, .8, 4, 64), bas('#38e8ff'))); lights.position.copy(ring.position); lights.rotation.x = 1.1;
      const sh = add(new THREE.Group()); const hull = new THREE.Mesh(new THREE.BoxGeometry(6, 1.6, 2.4), lam('#d4dcea')); sh.add(hull); const eng = new THREE.Mesh(new THREE.BoxGeometry(.4, 1, 1.6), bas('#7fd8ff')); eng.position.x = -3.2; sh.add(eng); const blink = new THREE.Mesh(new THREE.SphereGeometry(.25, 6, 4), bas('#ff3b3b')); blink.position.set(3, .9, 0); sh.add(blink);
      const rocks = []; for (let k = 0; k < 8; k++) { const r = add(new THREE.Mesh(new THREE.DodecahedronGeometry(2 + Math.random() * 5, 0), lam('#6a6058'))); r.position.set(cx + (Math.random() - .5) * 400, 30 + Math.random() * 80, cz - 120 - Math.random() * 200); r.userData.s = [Math.random() * .3, Math.random() * .3]; rocks.push(r); }
      life(T => { ring.rotation.z = T * .02; lights.rotation.z = T * .02; const u = (T * .015) % 1; sh.position.set(lp(-300, MW + 300, u), 45 + Math.sin(u * 6) * 6, cz - 90); blink.visible = Math.sin(T * 6) > .6; for (const r of rocks) { r.rotation.x += r.userData.s[0] * .016; r.rotation.y += r.userData.s[1] * .016; } });
    }
  }

  // once a frame: pulse the pads, run the belts, move the gates, crack and drop the walls, and step the life
  function mechFrame(dt) {
    const Z = X.mech; if (!Z || !M) return; Z.t += dt; const T = Z.t;
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
    for (const fn of Z.life) fn(T, dt);
    ambTick(dt);
  }
  // a wall hit shudders; a wall that falls bursts into dust and chips
  on('wallHit', b => { const w = X && X.mech && X.mech.brks.find(q => q.bi === b); if (w) w.shake = .12; });
  on('wallDown', b => { if (!X || !ready) return; const B = BRKS[b]; if (!B) return;
    for (const k of B.cells) { const x = ((k % GW) + .5) * CS, z = (Math.floor(k / GW) + .5) * CS; for (let n = 0; n < 14; n++) spark([x + rnd(-1, 1), rnd(.3, 4.5), z + rnd(-1, 1)], [rnd(-4, 4), rnd(1, 5), rnd(-4, 4)], n % 2 ? '#cdbfa5' : '#8a5a40', .9); }
    X.shake = Math.max(X.shake || 0, .35); });
