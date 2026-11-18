  /* ---------- 77 skins, drawn: finishes, the parts each line adds, knife blades, idle effects and kill effects ----------
     skinMats(k, line) swaps a gun's paint (and accents, glows and metals where the line wants) for the line's own;
     skinKit adds the line's parts to a built gun, sized from the gun itself, so one line fits every weapon. Parts that
     move (rings, embers, arcs, a hovering crystal) stay separate meshes with an anim(m, t, dt) the frame calls. */
  const SKTX = {}, SKMAT = {};
  function skinTex(line) {
    if (SKTX[line]) return SKTX[line];
    const L = LINES[line], S = 512, rr2 = (a, b) => a + R() * (b - a), out = {};
    const veins = (g, w, h, n, col, lw, jag) => { g.strokeStyle = col; g.lineCap = 'round'; for (let i = 0; i < n; i++) { let x = R() * w, y = R() * h, a = R() * TAU; g.lineWidth = lw * (.5 + R()); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 14; k++) { a += (R() - .5) * jag; x += Math.cos(a) * 16; y += Math.sin(a) * 16; g.lineTo(x, y); } g.stroke(); } };
    const blots = (g, w, h, n, r0, r1, col) => { for (let i = 0; i < n; i++) { const x = R() * w, y = R() * h, r = rr2(r0, r1); for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.fillStyle = col; g.beginPath(); g.ellipse(x + dx, y + dy, r, r * rr2(.5, 1), R() * 3, 0, TAU); g.fill(); } } };
    const specks = (g, w, h, n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${R() < .5 ? '0,0,0' : '255,255,255'},${a * R()})`; g.fillRect(R() * w, R() * h, 1, 1); } };
    if (line === 'dune') out.map = canvasTex(S, S, (g, w, h) => { g.fillStyle = L.base; g.fillRect(0, 0, w, h); blots(g, w, h, 26, 30, 80, L.alt); blots(g, w, h, 18, 20, 50, '#e2c896'); specks(g, w, h, 9000, .1); }, [3, 3]);
    else if (line === 'nightshift') out.map = canvasTex(S, S, (g, w, h) => { g.fillStyle = L.base; g.fillRect(0, 0, w, h); specks(g, w, h, 14000, .08); g.fillStyle = L.alt; g.fillRect(w * .44, 0, w * .12, h); g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < h; y += 22) g.fillRect(w * .44, y, w * .12, 3); }, [4, 4]);
    else if (line === 'tidewater') out.map = canvasTex(S, S, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1d4b78'); gr.addColorStop(1, L.base); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) { const y0 = i * h / 9, a = rr2(6, 14); g.strokeStyle = `rgba(190,230,255,${rr2(.15, .4)})`; g.lineWidth = rr2(1.5, 4); g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + Math.sin(x / w * TAU * 2 + i) * a); g.stroke(); } specks(g, w, h, 6000, .08); }, [3, 3]);
    else if (line === 'circuit') { const traces = []; for (let i = 0; i < 60; i++) { let x = Math.floor(R() * 32) * 16, y = Math.floor(R() * 32) * 16; const p = [[x, y]]; for (let k = 0; k < 5; k++) { if (R() < .5) x += (R() < .5 ? -1 : 1) * 16 * (1 + Math.floor(R() * 4)); else y += (R() < .5 ? -1 : 1) * 16 * (1 + Math.floor(R() * 4)); p.push([x, y]); } traces.push(p); }
      const draw = (g, bg, col, pad) => { g.fillStyle = bg; g.fillRect(0, 0, S, S); g.strokeStyle = col; g.lineWidth = 3; for (const p of traces) { g.beginPath(); p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.fillStyle = pad; for (const [x, y] of [p[0], p[p.length - 1]]) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); } } };
      out.map = canvasTex(S, S, g => { draw(g, L.base, '#2f7a52', '#b8ffd8'); specks(g, S, S, 6000, .08); }, [3, 3]); out.em = canvasTex(S, S, g => draw(g, '#000000', '#1c7a46', L.alt), [3, 3]); }
    else if (line === 'glacier') out.map = canvasTex(S, S, (g, w, h) => { g.fillStyle = L.base; g.fillRect(0, 0, w, h); blots(g, w, h, 30, 20, 90, 'rgba(160,200,230,.22)'); veins(g, w, h, 18, 'rgba(110,170,220,.55)', 2, 1.2); veins(g, w, h, 24, 'rgba(255,255,255,.7)', 1, 1.6); }, [2, 2]);
    else if (line === 'aurum') out.map = canvasTex(S, S, (g, w, h) => { g.fillStyle = L.base; g.fillRect(0, 0, w, h); blots(g, w, h, 20, 30, 100, 'rgba(200,190,170,.18)'); veins(g, w, h, 16, '#c9962c', 3.2, 1); veins(g, w, h, 20, '#f2cf6a', 1.4, 1.4); }, [2, 2]);
    else if (line === 'inferno') { const cracks = []; for (let i = 0; i < 26; i++) { let x = R() * S, y = R() * S, a = R() * TAU; const p = [[x, y]]; for (let k = 0; k < 12; k++) { a += (R() - .5) * 1.4; x += Math.cos(a) * 18; y += Math.sin(a) * 18; p.push([x, y]); } cracks.push([p, .8 + R() * 3]); }
      const draw = (g, bg, col, glow) => { g.fillStyle = bg; g.fillRect(0, 0, S, S); for (const [p, lw] of cracks) { for (const [c, k] of [[glow, 3.5], [col, 1]]) { g.strokeStyle = c; g.lineWidth = lw * k; g.beginPath(); p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); } } };
      out.map = canvasTex(S, S, g => { draw(g, L.base, '#ff9a3a', 'rgba(120,30,0,.6)'); specks(g, S, S, 12000, .12); }, [2, 2]); out.em = canvasTex(S, S, g => draw(g, '#000000', '#ffd07a', 'rgba(255,80,0,.55)'), [2, 2]); }
    else if (line === 'storm') { out.map = canvasTex(S, S, (g, w, h) => { g.fillStyle = L.base; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y++) { g.fillStyle = `rgba(255,255,255,${R() * .03})`; g.fillRect(0, y, w, 1); } g.strokeStyle = 'rgba(79,210,255,.5)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { let x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rr2(-30, 30); y += rr2(10, 30); g.lineTo(x, y); } g.stroke(); } }, [2, 2]);
      out.em = canvasTex(S, S, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = L.alt; g.lineWidth = 2.5; for (let i = 0; i < 14; i++) { let x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rr2(-30, 30); y += rr2(10, 30); g.lineTo(x, y); } g.stroke(); } }, [2, 2]); }
    else if (line === 'voidline') { out.map = canvasTex(S, S, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#141026'); gr.addColorStop(.5, '#0a0812'); gr.addColorStop(1, '#1a1030'); g.fillStyle = gr; g.fillRect(0, 0, w, h); blots(g, w, h, 20, 30, 120, 'rgba(90,60,180,.12)'); specks(g, w, h, 4000, .1); }, [2, 2]);
      out.em = canvasTex(S, S, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let i = 0; i < 7; i++) { const y0 = i * h / 7; for (const [c, lw] of [['rgba(120,50,220,.6)', 9], [L.alt, 3], ['#f0dcff', 1]]) { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); for (let x = 0; x <= w; x += 6) g.lineTo(x, y0 + Math.sin(x / w * TAU + i * 1.7) * 18 + Math.sin(x / w * TAU * 3 + i) * 6); g.stroke(); } } }, [1, 2]); }
    else if (line === 'solaris') { out.map = canvasTex(S, S, (g, w, h) => { g.fillStyle = L.base; g.fillRect(0, 0, w, h); blots(g, w, h, 16, 30, 90, 'rgba(230,220,200,.25)'); g.strokeStyle = '#d4a24c'; g.lineWidth = 2; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a) * w * .7, h / 2 + Math.sin(a) * h * .7); g.stroke(); } g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2, 60, 0, TAU); g.stroke(); }, [2, 2]);
      out.em = canvasTex(S, S, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffcf6a'; g.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * 70, h / 2 + Math.sin(a) * 70); g.lineTo(w / 2 + Math.cos(a) * w * .6, h / 2 + Math.sin(a) * h * .6); g.stroke(); } g.lineWidth = 8; g.beginPath(); g.arc(w / 2, h / 2, 60, 0, TAU); g.stroke(); }, [2, 2]); }
    return SKTX[line] = out;
  }
  // the animated finishes, ticked every frame
  const SKIN_LIVE = [];
  function skinTick(dt) { const t = X ? X.t : 0; for (const L2 of SKIN_LIVE) L2(t, dt); }
  function skinMats(base, k, line) {
    const key = k + '|' + line; if (SKMAT[key]) return SKMAT[key];
    const L = LINES[line], T = skinTex(line), env = (m, ei) => { if (X && X.env) { m.envMap = X.env; m.envMapIntensity = ei; } return m; }, tier = RARITY[L.r].tier, lc = c => new THREE.Color(c).convertSRGBToLinear();
    const M2 = Object.assign({}, base);
    const phys = o => env(new THREE.MeshPhysicalMaterial(o), .9), std = (o, ei = .7) => env(new THREE.MeshStandardMaterial(o), ei);
    M2.acc = std({ color: lc(L.alt), roughness: .4, metalness: .45 }, .8);   // accents take the line's second colour unless the line says otherwise below
    if (line === 'dune') M2.fin = std({ map: T.map, roughness: .78, metalness: .05 }, .4);
    else if (line === 'nightshift') M2.fin = std({ map: T.map, roughness: .86, metalness: .05 }, .3);
    else if (line === 'tidewater') { M2.fin = phys({ map: T.map, roughness: .32, metalness: .35, clearcoat: 1, clearcoatRoughness: .1 }); M2.acc = std({ color: lc('#d9a441'), map: base.brass.map, metalness: 1, roughness: .28 }, 1.3); }
    else if (line === 'circuit') { M2.fin = std({ map: T.map, emissive: lc('#ffffff'), emissiveMap: T.em, emissiveIntensity: 1.1, roughness: .55, metalness: .25 }, .5); M2.glow = new THREE.MeshBasicMaterial({ color: lc(L.alt), toneMapped: false }); }
    else if (line === 'glacier') { M2.fin = phys({ map: T.map, roughness: .18, metalness: .05, clearcoat: 1, clearcoatRoughness: .04 }); M2.metal = std({ color: lc('#b8d6ee'), map: base.metal.map, roughnessMap: base.metal.roughnessMap, metalness: .8, roughness: .25 }, 1.4); M2.glow = new THREE.MeshBasicMaterial({ color: lc(L.alt), toneMapped: false }); }
    else if (line === 'aurum') { M2.fin = phys({ map: T.map, roughness: .2, metalness: .1, clearcoat: 1, clearcoatRoughness: .05 }); M2.metal = std({ color: lc('#e3b341'), map: base.metal.map, roughnessMap: base.metal.roughnessMap, metalness: 1, roughness: .22 }, 1.6); M2.acc = M2.metal; M2.dark = std({ color: lc('#b88a2a'), metalness: 1, roughness: .3 }, 1.4); }
    else if (line === 'inferno') { M2.fin = std({ map: T.map, emissive: lc('#ffffff'), emissiveMap: T.em, emissiveIntensity: 1.4, roughness: .8, metalness: .2 }, .3); M2.acc = std({ color: lc('#3a2a22'), roughness: .5, metalness: .7 }, .8); M2.glow = new THREE.MeshBasicMaterial({ color: lc(L.alt), toneMapped: false });
      const f = M2.fin; SKIN_LIVE.push(t => { f.emissiveIntensity = 1.05 + Math.sin(t * 2.2) * .35 + Math.sin(t * 5.3) * .12; }); }
    else if (line === 'storm') { M2.fin = std({ map: T.map, emissive: lc('#ffffff'), emissiveMap: T.em, emissiveIntensity: .8, roughness: .35, metalness: .85 }, 1.2); M2.acc = std({ color: lc('#c8743a'), metalness: 1, roughness: .3 }, 1.3); M2.glow = new THREE.MeshBasicMaterial({ color: lc(L.alt), toneMapped: false });
      const f = M2.fin; let nx = 0, on = 1; SKIN_LIVE.push((t, dt) => { if ((nx -= dt) <= 0) { nx = .04 + R() * .25; on = R() < .25 ? 2.4 : .55 + R() * .3; } f.emissiveIntensity = lp(f.emissiveIntensity, on, .5); }); }
    else if (line === 'voidline' || line === 'solaris') { const vo = line === 'voidline';
      M2.fin = phys({ map: T.map, emissive: lc('#ffffff'), emissiveMap: T.em, emissiveIntensity: vo ? 1.5 : 1.1, roughness: vo ? .25 : .3, metalness: vo ? .6 : .1, clearcoat: 1, clearcoatRoughness: .05 });
      M2.metal = std({ color: lc(vo ? '#2a2440' : '#e3b341'), metalness: 1, roughness: .2 }, 1.6); M2.acc = std({ color: lc(L.alt), emissive: lc(L.alt), emissiveIntensity: .6, metalness: .6, roughness: .3 }, 1); M2.glow = new THREE.MeshBasicMaterial({ color: lc(L.alt), toneMapped: false });
      const em = T.em; SKIN_LIVE.push(t => { em.offset.x = (t * (vo ? .12 : .05)) % 1; }); }
    for (const q of ['fin']) if (M2[q] !== base[q] && M2[q].color && !M2[q].map) M2[q].color.convertSRGBToLinear();
    return SKMAT[key] = M2;
  }
  // a line's parts, sized from the gun: bb is the gun's box, len its barrel, ax the barrel's axis height
  function skinKit(G, k, line, m, len) {
    const L = LINES[line], tier = RARITY[L.r].tier; if (tier < 1 || k === 'knife') return;
    G.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(G), top = bb.max.y, ax = .025, lc = c => new THREE.Color(c).convertSRGBToLinear();
    // the gun's own surface under a point along it (so parts sit on the barrel, not up at the height of the sight)
    const ray = new THREE.Raycaster(), meshes = []; G.traverse(o => { if (o.isMesh) meshes.push(o); });
    const topAt = z => { ray.set(new THREE.Vector3(0, top + .2, z), new THREE.Vector3(0, -1, 0)); const h = ray.intersectObjects(meshes, false)[0]; return h ? h.point.y : ax + .02; };
    const K2 = new THREE.Group(); G.add(K2);
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); K2.add(o); return o; };
    const glowM = c => new THREE.MeshBasicMaterial({ color: lc(c), toneMapped: false, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false });
    const live = (o, fn) => { o.userData.live = true; o.userData.anim = fn; return o; };
    const along = q => lp(bb.max.z, -len, q);   // along the gun: 0 at the back, 1 at the muzzle
    if (line === 'tidewater') for (const q of [.72, .8, .88]) add(new THREE.TorusGeometry(.016, .0028, 8, 18), m.acc, 0, ax, along(q));
    if (line === 'circuit') { add(new THREE.BoxGeometry(.012, .024, .05), m.dark, .024, ax + .01, along(.45)); add(new THREE.BoxGeometry(.003, .016, .04), m.glow, .031, ax + .01, along(.45)); }
    if (line === 'glacier') {   // ice: shards along the top and a crown of them round the muzzle
      const ice = new THREE.MeshPhysicalMaterial({ color: lc('#cfeaff'), roughness: .05, metalness: 0, clearcoat: 1, transparent: true, opacity: .82, emissive: lc('#3a8ad0'), emissiveIntensity: .35 }); if (X.env) { ice.envMap = X.env; ice.envMapIntensity = 1.6; }
      for (let i = 0; i < 7; i++) { const q = .15 + i * .1, s = .014 + R() * .014, z = along(q), o = add(new THREE.OctahedronGeometry(s, 0), ice, (R() - .5) * .01, topAt(z) + s * .6, z, R() * .4, R(), R() * .4); o.scale.set(.6, 1.7 + R() * .6, .8); }
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, o = add(new THREE.ConeGeometry(.007, .045, 5), ice, Math.cos(a) * .018, ax + Math.sin(a) * .018, along(.97), 0, 0, 0); o.rotation.set(Math.PI / 2 + Math.sin(a) * .5, 0, -Math.cos(a) * .5); }
    }
    if (line === 'aurum') { for (const sx of [-1, 1]) { add(new THREE.BoxGeometry(.003, .03, (bb.max.z - bb.min.z) * .3), m.metal, sx * ((bb.max.x - bb.min.x) / 2 + .001), ax - .005, along(.3)); }
      add(new THREE.CylinderGeometry(.014, .012, .03, 12), m.metal, 0, ax, along(1) - .01, Math.PI / 2); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .78; add(new THREE.ConeGeometry(.004, .022, 4), m.metal, Math.cos(a) * .012, ax + Math.sin(a) * .012, along(1) - .03, -Math.PI / 2); } }
    if (line === 'inferno') {   // heat fins on top, a burning core on the side, embers that rise
      for (let i = 0; i < 6; i++) { const z = along(.5 + i * .07), h = .02 + i % 2 * .006; add(new THREE.BoxGeometry(.003, h, .022), m.acc, 0, topAt(z) + h / 2 - .003, z); }
      const core = live(add(new THREE.BoxGeometry(.006, .02, .07), glowM(L.alt), (bb.max.x - bb.min.x) / 2 + .002, ax, along(.4)), (o, t) => { o.material.opacity = .65 + Math.sin(t * 4) * .3; });
      for (let i = 0; i < 8; i++) { const z0 = along(.5 + R() * .4), e = live(add(new THREE.PlaneGeometry(.006, .006), glowM(i % 2 ? '#ffd27a' : L.alt), 0, topAt(z0), z0), (o, t, dt) => { const u = o.userData; u.k = (u.k == null ? R() : u.k) + dt * (.6 + u.s); if (u.k > 1) { u.k = 0; o.position.z = along(.5 + R() * .45); u.y0 = topAt(o.position.z); o.position.x = (R() - .5) * .03; } o.position.y = (u.y0 || topAt(o.position.z)) + u.k * .1; o.material.opacity = (1 - u.k) * .9; o.rotation.z += dt * 3; }); e.userData.s = R(); e.material.side = THREE.DoubleSide; }
    }
    if (line === 'storm') {   // copper coils, capacitors, and arcs that jump between them
      for (let i = 0; i < 7; i++) add(new THREE.TorusGeometry(.017, .0032, 6, 16), m.acc, 0, ax, along(.55 + i * .045));
      for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(.006, .006, .05, 10), m.glow, sx * .022, ax + .012, along(.35), Math.PI / 2);
      for (let i = 0; i < 3; i++) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(18), 3)); const ln = new THREE.Line(g, new THREE.LineBasicMaterial({ color: lc('#bff2ff'), transparent: true, blending: THREE.AdditiveBlending, toneMapped: false })); ln.userData.live = true; K2.add(ln);
        ln.userData.anim = (o, t, dt) => { const u = o.userData; if ((u.n = (u.n || 0) - dt) > 0) return; u.n = .03 + R() * .12; o.visible = R() < .55; const p = o.geometry.attributes.position.array, z0 = along(.5 + R() * .3), z1 = z0 - .04 - R() * .05; for (let j = 0; j < 6; j++) { const q = j / 5; p[j * 3] = (R() - .5) * .03; p[j * 3 + 1] = ax + .018 + (R() - .3) * .015; p[j * 3 + 2] = lp(z0, z1, q); } o.geometry.attributes.position.needsUpdate = true; }; }
    }
    if (line === 'voidline') {   // two rings turning round the muzzle, a crystal hovering over the receiver, motes
      for (const [r, sp] of [[.03, 1.6], [.022, -2.3]]) live(add(new THREE.TorusGeometry(r, .0022, 6, 32), glowM(L.alt), 0, ax, along(.98)), (o, t) => { o.rotation.set(t * sp * .4, t * sp, 0); });
      const cz = along(.62), cy0 = topAt(cz) + .04, cr = live(add(new THREE.OctahedronGeometry(.014, 0), new THREE.MeshPhysicalMaterial({ color: lc('#2a1840'), emissive: lc(L.alt), emissiveIntensity: .9, roughness: .1, metalness: .4, clearcoat: 1 }), 0, cy0, cz), (o, t) => { o.rotation.y = t * 1.4; o.position.y = cy0 + Math.sin(t * 2) * .006; }); cr.scale.set(1, 1.6, 1);
      for (let i = 0; i < 6; i++) live(add(new THREE.PlaneGeometry(.005, .005), glowM(i % 2 ? '#f0dcff' : L.alt), 0, 0, 0), (o, t) => { const a = t * 1.3 + i * TAU / 6; o.position.set(Math.cos(a) * .045, ax + Math.sin(a * 1.3) * .03, along(.6) + Math.sin(a) * .1); o.material.opacity = .5 + Math.sin(t * 5 + i) * .4; });
    }
    if (line === 'solaris') {   // a sun halo behind the sight, gilded wings, motes of light
      const halo = new THREE.Group(); halo.position.set(0, top + .03, along(.12)); K2.add(halo); halo.userData.live = true; halo.userData.anim = (o, t) => { o.rotation.z = t * .5; };
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.028, .0025, 6, 32), glowM(L.alt)); halo.add(ring); for (let i = 0; i < 12; i++) { const ray = new THREE.Mesh(new THREE.PlaneGeometry(.004, .018), glowM(i % 2 ? '#fff1c4' : L.alt)); const a = i / 12 * TAU; ray.position.set(Math.cos(a) * .04, Math.sin(a) * .04, 0); ray.rotation.z = a - Math.PI / 2; halo.add(ray); }
      halo.rotation.y = Math.PI / 2;   // face the sides, so you see it edge-on in first person and full from others
      for (const sx of [-1, 1]) add(new THREE.BoxGeometry(.002, .018, (bb.max.z - bb.min.z) * .25), m.metal, sx * ((bb.max.x - bb.min.x) / 2 + .002), top - .01, along(.45), sx * .25);
      for (let i = 0; i < 6; i++) live(add(new THREE.PlaneGeometry(.005, .005), glowM('#fff1c4'), 0, 0, 0), (o, t) => { const a = t * .9 + i * TAU / 6; o.position.set(Math.cos(a) * .05, top + .02 + Math.sin(a * 2) * .02, along(.5) + Math.sin(a) * .12); o.material.opacity = .45 + Math.sin(t * 4 + i) * .4; });
    }
  }
  // knife blades by line: the shape of the blade and what is built round it
  const KNIFE_SHAPE = { dune: 'kukri', nightshift: 'tanto', tidewater: 'kukri', circuit: 'tanto', glacier: 'crystal', aurum: 'ornate', inferno: 'cleaver', storm: 'coil', voidline: 'energy', solaris: 'energy' };
  // call every moving part's anim under a gun (first person or a rival's)
  function animKit(G, dt) { if (!G) return; let A = G.userData.kitAnims; if (!A) { A = G.userData.kitAnims = []; G.traverse(o => { if (o.userData.anim) A.push(o); }); } const t = X.t; for (const o of A) o.userData.anim(o, t, dt); }

  /* ---------- kill effects: what a Legendary or Mythic (and the Epics) does to the rival it finishes ---------- */
  function buildKillFx() {
    const glowM = () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    X.kx = { parts: [], shells: [], bolts: [] };
    const pg = new THREE.PlaneGeometry(1, 1), cg = new THREE.CylinderGeometry(.5, .5, .12, 12);
    const dot = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    for (let i = 0; i < 90; i++) { const mt = glowM(); if (i >= 30) mt.map = dot; else { mt.blending = THREE.NormalBlending; mt.transparent = true; } const m = new THREE.Mesh(i < 30 ? cg : pg, mt); m.visible = false; m.userData = { t: 0, life: 0 }; X.scene.add(m); X.kx.parts.push(m); }
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), glowM()); m.visible = false; m.userData = { t: 9 }; X.scene.add(m); X.kx.shells.push(m); }
    for (let i = 0; i < 2; i++) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(16 * 3), 3)); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, toneMapped: false })); l.visible = false; l.userData = { t: 9 }; X.scene.add(l); X.kx.bolts.push(l); }
  }
  function killFx(v, line) {
    const L = LINES[line], K3 = L && L.kill; if (!K3 || !X || !X.kx) return; const c = [v.x, v.y + 1.1, v.z], kx = X.kx, cols = [K3.col, K3.col2];
    const part = (pos, vel, col, life, size, mode, i) => { const m = kx.parts.find(p => !p.visible && (mode === 'coin') === (kx.parts.indexOf(p) < 30)) || kx.parts[(kx.pn = (kx.pn || 0) + 1) % kx.parts.length]; m.visible = true; m.position.set(pos[0], pos[1], pos[2]); m.material.color.set(col); m.scale.setScalar(size); Object.assign(m.userData, { t: 0, life, v: vel.slice(), mode, size, c0: [pos[0], pos[1], pos[2]], cen: c, spin: rnd(-8, 8) }); };
    const shell = (col, r, life, implode) => { const m = kx.shells.find(s => s.userData.t > s.userData.life) || kx.shells[0]; m.visible = true; m.position.set(c[0], c[1], c[2]); m.material.color.set(col); Object.assign(m.userData, { t: 0, life, r, implode }); };
    if (K3.kind === 'shards') { for (let i = 0; i < 26; i++) part(c, [rnd(-4, 4), rnd(0, 5), rnd(-4, 4)], pick(cols), rnd(.7, 1.1), rnd(.05, .12), 'fall'); shell(K3.col, 1.8, .4); }
    else if (K3.kind === 'coins') { for (let i = 0; i < 22; i++) part(c, [rnd(-2.5, 2.5), rnd(3, 6), rnd(-2.5, 2.5)], pick(cols), rnd(1, 1.4), rnd(.07, .1), 'coin'); shell(K3.col2, 1.4, .35); }
    else if (K3.kind === 'flame') { for (let i = 0; i < 34; i++) part([c[0] + rnd(-.3, .3), c[1] + rnd(-.8, .4), c[2] + rnd(-.3, .3)], [rnd(-.8, .8), rnd(1.5, 4), rnd(-.8, .8)], pick(cols), rnd(.6, 1.1), rnd(.08, .2), 'rise'); shell(K3.col, 1.6, .35); }
    else if (K3.kind === 'bolt') { const b = kx.bolts.find(q => q.userData.t > .35) || kx.bolts[0], p = b.geometry.attributes.position.array; for (let j = 0; j < 16; j++) { const q = j / 15; p[j * 3] = c[0] + (j && j < 15 ? rnd(-.6, .6) : 0); p[j * 3 + 1] = lp(c[1] + 22, v.y, q); p[j * 3 + 2] = c[2] + (j && j < 15 ? rnd(-.6, .6) : 0); } b.geometry.attributes.position.needsUpdate = true; b.visible = true; b.material.color.set(K3.col2); b.userData.t = 0;
      for (let i = 0; i < 20; i++) part([c[0], v.y + .1, c[2]], [rnd(-5, 5), rnd(1, 5), rnd(-5, 5)], pick(cols), rnd(.4, .7), rnd(.04, .08), 'fall'); shell(K3.col, 1.5, .3); X.flashL.position.set(c[0], c[1] + 1, c[2]); X.flashL.intensity = 22; }
    else if (K3.kind === 'void') { for (let i = 0; i < 36; i++) { const a = rnd(0, TAU), r = rnd(1.2, 2.4); part([c[0] + Math.cos(a) * r, c[1] + rnd(-1, 1), c[2] + Math.sin(a) * r], [0, 0, 0], pick(cols), rnd(.45, .6), rnd(.06, .12), 'suck'); } shell(K3.col, 2.4, .6, true); }
    else if (K3.kind === 'sun') { for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; part(c, [Math.cos(a) * 6, rnd(-.5, .5), Math.sin(a) * 6], pick(cols), .5, rnd(.08, .14), 'ray'); } shell(K3.col2, 2.2, .45); X.flashL.position.set(c[0], c[1], c[2]); X.flashL.intensity = 18; }
  }
  function stepKillFx(dt) {
    const kx = X.kx; if (!kx) return; const q = X.camera.quaternion;
    for (const m of kx.parts) { if (!m.visible) continue; const u = m.userData; u.t += dt; const k = u.t / u.life; if (k >= 1) { m.visible = false; continue; }
      if (u.mode === 'suck') { const f = k * k * (3 - 2 * k); m.position.set(lp(u.c0[0], u.cen[0], f), lp(u.c0[1], u.cen[1], f), lp(u.c0[2], u.cen[2], f)); }   // drawn into the middle
      if (u.mode === 'fall' || u.mode === 'coin') { u.v[1] -= 12 * dt; } else if (u.mode === 'rise') { u.v[0] *= .96; u.v[2] *= .96; }
      if (u.mode !== 'suck') { m.position.x += u.v[0] * dt; m.position.y += u.v[1] * dt; m.position.z += u.v[2] * dt; }
      if (u.mode === 'coin') { m.rotation.x += u.spin * dt; m.rotation.z += u.spin * .7 * dt; m.material.opacity = 1 - Math.max(0, k - .7) / .3; }
      else { m.quaternion.copy(q); m.material.opacity = (1 - k) * .95; m.scale.setScalar(u.size * 2.2 * (u.mode === 'rise' ? 1 + k : u.mode === 'ray' ? 1 - k * .5 : 1)); }
    }
    for (const s of kx.shells) { const u = s.userData; if (!s.visible) continue; u.t += dt; const k = u.t / u.life; if (k >= 1) { s.visible = false; continue; } s.scale.setScalar(u.implode ? u.r * (1 - k) + .05 : .2 + u.r * k); s.material.opacity = u.implode ? .5 * k : .55 * (1 - k); }
    for (const b of kx.bolts) { const u = b.userData; if (!b.visible) continue; u.t += dt; b.visible = u.t < .35; b.material.opacity = Math.random() < .3 ? .3 : 1 - u.t / .35; }
  }
