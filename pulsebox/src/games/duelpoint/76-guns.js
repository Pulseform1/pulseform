  /* ---------- 76 guns: gun models, first-person hands, moving parts, casings (carried over from the first version) ----------
     Built from bevelled side profiles (written in real z/y: forward is -z, the trigger sits near z = 0, the muzzle at z = -len),
     turned barrels and scopes, and small parts. Finishes are canvas textures (brushed steel, stippled polymer, cerakote, wood,
     carbon weave, digital camo) lit by a small reflection map. Moving parts (slide, pump, bolt, charging handle, magazine,
     support hand) are animated by the first-person view, the rifles carry a live ammo counter, and the rival holds the same
     model. */
  let GTX = null;
  const DECAL = {}, GMAT = {}, ICON = {};
  function gunTex() {
    if (GTX) return GTX;
    const T = (w, h, fn, rep) => canvasTex(w, h, fn, rep);
    GTX = {
      brushed: T(256, 256, (g, w, h) => { g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1100; i++) { g.fillStyle = R() < .5 ? `rgba(0,0,0,${.04 + R() * .09})` : `rgba(255,255,255,${.04 + R() * .08})`; g.fillRect(R() * w - 40, R() * h, 30 + R() * 170, 1); } }, [6, 6]),
      stipple: T(128, 128, (g, w, h) => { g.fillStyle = '#7c7c7c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1600; i++) { g.fillStyle = R() < .5 ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.13)'; g.beginPath(); g.arc(R() * w, R() * h, .6 + R() * 1.3, 0, 7); g.fill(); } }, [12, 12]),
      cera: T(128, 128, (g, w, h) => { g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { g.fillStyle = R() < .5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.08)'; g.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); } }, [10, 10]),
      wood: T(256, 256, (g, w, h) => { g.fillStyle = '#80502a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 80; i++) { const y = R() * h; g.strokeStyle = `rgba(${R() < .55 ? '45,22,8' : '170,110,60'},${.14 + R() * .26})`; g.lineWidth = .5 + R() * 2.5; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 12) g.lineTo(x, y + Math.sin(x * .03 + i) * 4 + Math.sin(x * .12 + i * 2) * 1.4); g.stroke(); } }, [5, 5]),
      carbon: T(64, 64, (g) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const on = (i + j) % 2, gr = on ? g.createLinearGradient(i * 16, 0, i * 16 + 16, 0) : g.createLinearGradient(0, j * 16, 0, j * 16 + 16); gr.addColorStop(0, '#3a3a40'); gr.addColorStop(.5, '#77777f'); gr.addColorStop(1, '#3a3a40'); g.fillStyle = gr; g.fillRect(i * 16, j * 16, 16, 16); } }, [36, 36]),
      camo: T(128, 128, (g, w, h) => { g.fillStyle = '#2a8a75'; g.fillRect(0, 0, w, h); const cs = ['#3ee6c1', '#1b5248', '#1f2a33', '#30b496']; for (let i = 0; i < 170; i++) { g.fillStyle = cs[i % 4]; g.fillRect(Math.floor(R() * 16) * 8, Math.floor(R() * 16) * 8, 8 * (1 + Math.floor(R() * 3)), 8 * (1 + Math.floor(R() * 2))); } }, [8, 8]),
      holes: T(64, 64, (g, w, h) => { g.fillStyle = '#5a5e66'; g.fillRect(0, 0, w, h); g.fillStyle = '#0a0b0d'; for (const [x, y] of [[16, 16], [48, 16], [16, 48], [48, 48]]) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); } }, [1, 10]),
    };
    return GTX;
  }
  function gmats(k) {
    if (GMAT[k]) return GMAT[k];
    const W = GUNS[k], T = gunTex();
    const std = (o, ei = 1) => { const m = new THREE.MeshStandardMaterial(o); if (X && X.env) { m.envMap = X.env; m.envMapIntensity = ei; } return m; };
    const basic = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
    const fin = {
      pip: std({ color: '#8f99a6', map: T.cera, roughness: .5, metalness: .35 }),
      hornet: std({ color: '#ffffff', map: T.camo, roughness: .62, metalness: .1 }, .5),
      breaker: std({ color: '#ffffff', map: T.wood, roughness: .45, metalness: 0 }, .45),
      lancer: std({ color: '#d4323e', map: T.cera, roughness: .42, metalness: .3 }),
      longbow: std({ color: '#9468dc', map: T.carbon, roughness: .3, metalness: .45 }, 1.1),
      stub: std({ color: '#ffffff', map: T.wood, roughness: .45 }, .45), hammer: std({ color: '#ffd9a8', map: T.wood, roughness: .4 }, .5),
      vesper: std({ color: '#d0509a', map: T.carbon, roughness: .3, metalness: .45 }, 1.1),
    }[k] || std({ color: W.col, map: T.cera, roughness: .45, metalness: .3 });
    return GMAT[k] = {
      fin,
      metal: std({ color: '#3b4049', map: T.brushed, metalness: .85, roughness: .32 }),
      dark: std({ color: '#1d2026', map: T.brushed, metalness: .7, roughness: .42 }),
      steel: std({ color: '#a2a9b3', map: T.brushed, metalness: .95, roughness: .2 }, 1.2),
      poly: std({ color: '#2b2e35', map: T.stipple, roughness: .86, metalness: .05 }, .4),
      rubber: std({ color: '#121316', roughness: .95 }, .2),
      heat: std({ color: '#ffffff', map: T.holes, metalness: .7, roughness: .4 }),
      acc: std({ color: W.col, roughness: .4, metalness: .3 }),
      brass: std({ color: '#d9a441', metalness: 1, roughness: .26 }, 1.3),
      shell: std({ color: '#b8262a', roughness: .5 }, .5),
      lens: std({ color: '#0d2633', metalness: 1, roughness: .02, emissive: k === 'longbow' ? '#3a1866' : '#0b3550', emissiveIntensity: .8 }, 2),
      glass: std({ color: '#9fdcff', transparent: true, opacity: .2, metalness: 1, roughness: 0, depthWrite: false }, 2),
      glow: basic(W.col), tritium: basic('#7dff9a'), red: basic('#ff2a3a'), lamp: basic('#fff4d6'),
      glove: std({ color: '#24272e', map: T.stipple, roughness: .9 }, .3),
      sleeve: std({ color: '#323a4a', roughness: .8 }, .3),
    };
  }
  function gunModel(k, opts = {}) {
    const W = GUNS[k], m = gmats(k), G = new THREE.Group(), cast = !!opts.cast, parts = {};
    let T = G, len = .5, port = [.02, .03, 0], sight = .09;
    const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = cast; T.add(o); return o; };
    const box = (w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
    // a cylinder along z from z0 (front) to z1 (back); rB is the back radius when it differs
    const tube = (r, z0, z1, mat, y = 0, x = 0, seg = 20, rB) => add(new THREE.CylinderGeometry(rB == null ? r : rB, r, Math.abs(z1 - z0), seg), mat, x, y, (z0 + z1) / 2, Math.PI / 2);
    const vtube = (r, y0, y1, mat, x, z, rTop) => add(new THREE.CylinderGeometry(rTop == null ? r : rTop, r, Math.abs(y1 - y0), 16), mat, x, (y0 + y1) / 2, z);
    // a side profile [[z, y], ...] extruded to width w, centred on x
    const prof = (pts, w, mat, x = 0, bev = .004) => {
      const s = new THREE.Shape(); pts.forEach(([u, v], i) => i ? s.lineTo(u, v) : s.moveTo(u, v));
      const d = Math.max(.002, w - bev * 2), g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * .8, bevelSegments: 2, curveSegments: 4 });
      g.translate(0, 0, -d / 2); g.rotateY(-Math.PI / 2); return add(g, mat, x);
    };
    const ring = (r, t, z, mat, y = 0, x = 0) => add(new THREE.TorusGeometry(r, t, 8, 24), mat, x, y, z);
    const knurl = (r, z0, z1, n, mat, y = 0) => { for (let i = 0; i < n; i++) ring(r, .0017, z0 + (z1 - z0) * (i + .5) / n, mat, y); };
    const rail = (z0, z1, y, w = .03) => { box(w, .008, z1 - z0, m.dark, 0, y, (z0 + z1) / 2); for (let z = z0 + .009; z < z1 - .004; z += .013) box(w + .004, .007, .0062, m.dark, 0, y + .0068, z); };
    const guard = (z, y) => { add(new THREE.TorusGeometry(.022, .0042, 8, 18, Math.PI), m.poly, 0, y, z, 0, Math.PI / 2, Math.PI); box(.007, .02, .006, m.steel, 0, y - .009, z + .004, .3); };
    const screw = (x, y, z) => add(new THREE.CylinderGeometry(.0034, .0034, .003, 8), m.steel, x, y, z, 0, 0, Math.PI / 2);
    const lensF = (r, x, y, z, mat) => add(new THREE.CircleGeometry(r, 20), mat, x, y, z, 0, Math.PI);
    const decal = (text, sub, w, h, sx, y, z, col = 'rgba(240,238,232,.92)') => {
      const key = text + '|' + sub + '|' + col; let mat = DECAL[key];
      if (!mat) { const t = canvasTex(256, 64, (g, cw, ch) => { g.clearRect(0, 0, cw, ch); g.fillStyle = col; g.textBaseline = 'middle'; g.font = `700 ${sub ? 30 : 38}px "Chakra Petch", monospace`; g.fillText(text, 6, sub ? 22 : 32); if (sub) { g.globalAlpha = .75; g.font = '700 15px monospace'; g.fillText(sub, 8, 50); } }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        mat = DECAL[key] = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: .6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); }
      for (const s of [1, -1]) add(new THREE.PlaneGeometry(w, h), mat, sx * s, y, z, 0, s * Math.PI / 2, 0);
    };
    const holo = (z, y) => { // a holographic sight: base, side posts, hood, glass and a ring reticle
      box(.034, .01, .06, m.dark, 0, y + .005, z); for (const sx of [-.0155, .0155]) box(.004, .036, .05, m.dark, sx, y + .028, z);
      box(.035, .005, .056, m.dark, 0, y + .048, z - .002); box(.027, .029, .0015, m.glass, 0, y + .029, z - .018);
      add(new THREE.TorusGeometry(.0045, .0007, 6, 20), m.red, 0, y + .029, z - .016); add(new THREE.SphereGeometry(.0009, 6, 6), m.red, 0, y + .029, z - .016);
      box(.008, .007, .012, m.poly, .0195, y + .03, z + .012); box(.008, .007, .012, m.poly, .0195, y + .02, z + .012);
    };
    const counter = (y, z, hw) => { // a little screen on the left of the receiver (the side you see) showing the rounds left
      box(.008, .026, .036, m.dark, -hw - .004, y, z); const c = document.createElement('canvas'); c.width = 64; c.height = 44; const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
      add(new THREE.PlaneGeometry(.03, .02), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), -hw - .0085, y, z, 0, -Math.PI / 2, 0); parts.counter = { c, t, last: -1 };
    };
    const reticle = (y, z) => { add(new THREE.SphereGeometry(.0011, 8, 6), m.red, 0, y, z); for (const [w, h, dx, dy] of [[.006, .0008, -.006, 0], [.006, .0008, .006, 0], [.0008, .006, 0, -.006]]) box(w, h, .0005, m.red, dx, y + dy, z); };
    const group = (x, y, z, rx = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.x = rx; g.userData.p0 = g.position.clone(); G.add(g); return g; };
    const PGRIP = [[-.01, -.004], [.03, -.004], [.062, -.11], [.058, -.118], [.02, -.118], [-.012, -.06], [-.026, -.02]];
    const RGRIP = [[-.008, -.03], [.024, -.03], [.054, -.12], [.046, -.13], [.01, -.13], [-.016, -.06]];
    const RLOWER = [[-.18, -.008], [.12, -.008], [.12, -.03], [0, -.035], [-.06, -.035], [-.07, -.06], [-.155, -.06], [-.17, -.035], [-.18, -.03]];
    const curvedMag = (step, mat = m.poly) => { let py = 0, pz = 0; for (let i = 0; i < 4; i++) { const a = .1 + i * step, dy = -Math.cos(a) * .042, dz = -Math.sin(a) * .042; box(.03, .044, .034, mat, 0, py + dy / 2, pz + dz / 2, a); box(.031, .004, .035, m.dark, 0, py + dy, pz + dz, a); py += dy; pz += dz; } box(.034, .012, .04, m.acc, 0, py - .004, pz - .003, .4); };
    const chHandle = () => { T = parts.bolt = group(0, 0, 0); box(.034, .008, .02, m.dark, 0, .06, .12); box(.054, .008, .009, m.dark, 0, .06, .128); T = G; };
    if (k === 'pip' || k === 'wasp' || k === 'quill') { // pistols: a frame and a moving slide with tritium sights; the Wasp adds a compensator, mini red dot and long mag, the Quill a suppressor
      const o = { pip: { light: 1, name: 'PIP', sub: 'DP-9 · 12 RD' }, wasp: { comp: 1, ext: 1, rdot: 1, name: 'WASP', sub: 'AUTO · 13 RD' }, quill: { supp: 1, name: 'QUILL', sub: 'SUPPRESSED · 15' } }[k];
      len = o.supp ? .362 : o.comp ? .238 : .207; port = [.012, .05, -.045]; sight = o.rdot ? .066 : .056;
      prof([[-.17, .014], [-.17, -.004], [-.06, -.004], [-.04, -.012], [-.012, -.01], [.005, -.002], [.02, .014]], .026, m.fin);
      prof(PGRIP, .028, m.poly); rail(-.165, -.075, -.012, .02);
      if (o.light) { box(.024, .022, .05, m.poly, 0, -.027, -.14); lensF(.0085, 0, -.027, -.1655, m.lamp); ring(.0095, .0018, -.1655, m.steel, -.027); }
      box(.004, .006, .026, m.steel, -.0145, .02, -.008); screw(-.0136, .003, -.03); screw(-.0136, .003, .006); box(.008, .016, .01, m.metal, 0, .043, .046, -.4);
      guard(-.035, -.006); tube(.0092, -.207, -.19, m.steel, .03);
      if (o.supp) { tube(.017, -.362, -.205, m.dark, .03); knurl(.0175, -.35, -.31, 4, m.metal, .03); lensF(.006, 0, .03, -.3626, m.rubber); ring(.0172, .002, -.215, m.glow, .03); }
      T = parts.slide = group(0, 0, 0);
      prof([[-.2, .05], [.035, .05], [.04, .04], [.04, .012], [-.2, .012], [-.205, .03]], .03, m.metal);
      for (let i = 0; i < 6; i++) box(.031, .026, .0028, m.dark, 0, .032, .03 - i * .007);
      for (let i = 0; i < 4; i++) box(.031, .02, .0028, m.dark, 0, .035, -.155 - i * .007);
      box(.013, .003, .034, m.rubber, .004, .0505, -.045);
      box(.006, .009, .007, m.dark, 0, .056, -.19); add(new THREE.SphereGeometry(.0018, 6, 6), m.tritium, 0, .058, -.1862);
      if (o.rdot) { box(.022, .008, .034, m.dark, 0, .054, -.01); for (const sx of [-.0105, .0105]) box(.003, .018, .026, m.dark, sx, .066, -.01); box(.024, .004, .03, m.dark, 0, .076, -.012); box(.018, .016, .0012, m.glass, 0, .066, -.022); add(new THREE.SphereGeometry(.0009, 6, 6), m.red, 0, .066, -.021); }
      else { box(.02, .009, .007, m.dark, 0, .056, .03); for (const sx of [-.0055, .0055]) add(new THREE.SphereGeometry(.0018, 6, 6), m.tritium, sx, .057, .0338); }
      if (o.comp) { box(.03, .036, .032, m.dark, 0, .031, -.221); for (let i = 0; i < 3; i++) box(.012, .004, .006, m.rubber, 0, .0495, -.212 - i * .009); }
      decal(o.name, o.sub, .07, .0175, .0155, .029, -.1);
      T = parts.mag = group(0, -.06, .025, -.25);
      box(.02, o.ext ? .15 : .1, .032, m.dark, 0, o.ext ? -.025 : 0, 0); box(.03, .012, .042, o.ext ? m.acc : m.fin, 0, o.ext ? -.106 : -.057, .003);
      T = G;
    } else if (k === 'stub') { // sawn-off double: two short barrels that break open to reload, wooden forend and grip, twin hammers
      len = .36; port = null; sight = .058;
      prof([[-.06, .05], [.04, .05], [.05, .02], [.04, -.004], [-.06, -.004]], .058, m.metal);
      prof([[-.065, .016], [-.23, .016], [-.24, .004], [-.225, -.016], [-.065, -.02]], .05, m.fin);
      prof(PGRIP, .03, m.fin); guard(-.035, -.006); for (const sx of [-.01, .01]) box(.006, .016, .012, m.steel, sx, .056, .042, -.5);
      decal('STUB', '12 GA · 2 RD', .07, .0175, .0292, .028, -.005);
      T = parts.brk = group(0, .02, -.06);
      for (const sx of [-.0145, .0145]) { tube(.0145, -.3, 0, m.steel, .012, sx); lensF(.0095, sx, .012, -.3005, m.rubber); }
      box(.058, .01, .02, m.dark, 0, .012, -.285); box(.004, .006, .26, m.metal, 0, .029, -.14); add(new THREE.SphereGeometry(.0035, 8, 6), m.brass, 0, .034, -.29);
      T = G;
    } else if (k === 'hammer') { // revolver: ribbed heavy barrel, a six-shot cylinder that turns with each shot, wooden grip, hammer spur
      len = .27; port = null; sight = .062;
      prof([[-.065, .05], [.05, .05], [.062, .035], [.055, -.004], [-.065, -.004]], .032, m.steel);
      tube(.0115, -.27, -.06, m.steel, .034); box(.013, .012, .21, m.metal, 0, .05, -.165); box(.02, .024, .2, m.steel, 0, .017, -.165); lensF(.006, 0, .034, -.2705, m.rubber);
      box(.004, .012, .01, m.dark, 0, .061, -.262); add(new THREE.SphereGeometry(.002, 6, 6), m.acc, 0, .066, -.26); box(.014, .006, .012, m.dark, 0, .058, .045);
      prof([[.03, .004], [.062, 0], [.092, -.095], [.077, -.112], [.042, -.108], [.02, -.03]], .036, m.fin); box(.008, .02, .012, m.metal, 0, .058, .062, -.6);
      guard(-.005, -.006); decal('HAMMER', '.44 · 6 RD', .085, .021, .0162, .02, .012);
      T = parts.cyl = group(0, .022, -.02);
      add(new THREE.CylinderGeometry(.026, .026, .052, 12), m.metal, 0, 0, 0, Math.PI / 2); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; box(.006, .006, .046, m.dark, Math.cos(a) * .025, Math.sin(a) * .025, 0); }
      T = G;
    } else if (k === 'gnat') { // compact SMG: lime polymer, short shroud, vertical foregrip, collapsed wire stock, mini holo
      len = .3; port = [.021, .03, -.02]; sight = .086;
      prof([[-.17, .045], [.08, .045], [.09, .03], [.09, -.012], [-.17, -.012]], .04, m.fin);
      prof([[-.06, -.01], [.07, -.01], [.075, -.03], [-.06, -.03]], .034, m.poly); prof(RGRIP, .03, m.poly); guard(-.035, -.03);
      tube(.016, -.27, -.17, m.dark, .018); for (let i = 0; i < 4; i++) box(.034, .004, .012, m.rubber, 0, .018, -.19 - i * .02); tube(.01, -.3, -.27, m.steel, .018); lensF(.006, 0, .018, -.3005, m.rubber);
      rail(-.15, .06, .05); holo(-.05, .057); vtube(.012, -.08, -.012, m.poly, 0, -.2, .014); vtube(.0135, -.088, -.078, m.acc, 0, -.2);
      for (const sx of [-.014, .014]) box(.005, .005, .1, m.steel, sx, .005, .14); box(.036, .05, .012, m.rubber, 0, -.005, .195);
      box(.0015, .012, .036, m.rubber, .0205, .028, -.02); decal('GNAT', 'SMG · 20 RD', .085, .021, .0205, .016, -.06);
      T = parts.bolt = group(0, 0, 0); box(.01, .01, .024, m.steel, -.024, .03, .02);
      T = parts.mag = group(0, -.085, -.1, .05); box(.026, .12, .03, m.poly, 0, 0, 0); box(.03, .01, .034, m.acc, 0, -.062, 0);
      T = G;
    } else if (k === 'thresher') { // auto shotgun: orange receiver, drum magazine, ported muzzle, ghost ring sight
      len = .66; port = [.026, .03, -.05]; sight = .084;
      prof([[-.2, .055], [.12, .055], [.13, .03], [.12, -.03], [-.2, -.03]], .05, m.fin);
      prof([[-.2, .015], [-.42, .015], [-.43, -.005], [-.42, -.045], [-.2, -.045]], .052, m.poly); for (let i = 0; i < 5; i++) box(.054, .01, .02, m.dark, 0, -.015, -.24 - i * .036);
      tube(.018, -.62, -.2, m.steel, .032); box(.03, .012, .18, m.heat, 0, .055, -.52); box(.044, .036, .05, m.dark, 0, .032, -.64); for (let i = 0; i < 3; i++) box(.046, .022, .006, m.rubber, 0, .034, -.625 - i * .013);
      rail(-.18, .1, .06); for (const sx of [-.009, .009]) box(.004, .018, .006, m.dark, sx, .074, .085); ring(.008, .0022, .085, m.dark, .084); add(new THREE.SphereGeometry(.004, 8, 6), m.glow, 0, .056, -.655);
      prof([[.12, .05], [.12, -.03], [.2, -.06], [.38, -.08], [.4, -.08], [.4, .05]], .046, m.poly); prof([[.4, -.085], [.43, -.085], [.43, .055], [.4, .055]], .05, m.rubber);
      prof(RGRIP, .03, m.poly); guard(-.035, -.03); box(.0015, .02, .05, m.rubber, .0255, .028, -.05); decal('THRESHER', '12 GA · AUTO', .12, .03, .0255, .02, -.07);
      T = parts.mag = group(0, -.1, -.11);
      add(new THREE.CylinderGeometry(.062, .062, .046, 24), m.poly, 0, -.02, 0, 0, 0, Math.PI / 2); add(new THREE.TorusGeometry(.056, .004, 6, 24), m.acc, .024, -.02, 0, 0, Math.PI / 2, 0); add(new THREE.CylinderGeometry(.016, .016, .05, 12), m.dark, 0, -.02, 0, 0, 0, Math.PI / 2); box(.03, .05, .04, m.poly, 0, .04, 0);
      T = G;
    } else if (k === 'mako') { // burst rifle: blue lower, round ported handguard, compact 2x optic, solid stock
      len = .7; port = [.023, .025, 0]; sight = .1;
      prof([[-.18, .055], [.13, .055], [.135, .03], [.13, -.01], [-.18, -.01]], .046, m.metal); prof(RLOWER, .044, m.fin); prof(RGRIP, .03, m.poly); guard(-.035, -.035);
      tube(.029, -.48, -.18, m.fin, .022, 0, 18); for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) box(.004, .01, .03, m.rubber, sx * .028, .022, -.22 - i * .05);
      tube(.012, -.66, -.48, m.steel, .022); tube(.017, -.7, -.66, m.dark, .022, 0, 6); lensF(.007, 0, .022, -.7005, m.rubber);
      rail(-.17, .1, .062); for (const z of [-.025, .025]) box(.022, .016, .016, m.dark, 0, .073, z);
      for (const sx of [-.017, .017]) box(.005, .036, .07, m.dark, sx, .1, 0); box(.039, .006, .07, m.dark, 0, .121, 0); box(.039, .008, .07, m.dark, 0, .079, 0); box(.03, .03, .0012, m.glass, 0, .1, -.034); box(.03, .03, .0012, m.glass, 0, .1, .034); reticle(.1, -.03); box(.008, .012, .016, m.acc, .021, .1, .01);
      prof([[.13, .05], [.13, -.02], [.24, -.06], [.36, -.07], [.38, -.07], [.38, .055]], .046, m.poly); prof([[.38, -.075], [.405, -.075], [.405, .06], [.38, .06]], .05, m.rubber);
      box(.0015, .016, .05, m.rubber, .0232, .025, 0); decal('MAKO', 'BURST · 24 RD', .1, .025, .0232, .034, -.08);
      chHandle(); T = parts.mag = group(0, -.055, -.112); curvedMag(.07); T = G;
    } else if (k === 'paladin') { // marksman rifle: sand furniture, thumbhole stock, long free-floated barrel, 1.5x scope
      len = .9; port = [.023, .025, 0]; sight = .098;
      prof([[-.2, .05], [.12, .05], [.13, .03], [.12, -.01], [-.2, -.01]], .044, m.metal); prof([[-.2, -.008], [.12, -.008], [.12, -.03], [-.2, -.03]], .044, m.fin);
      prof([[-.2, .04], [-.55, .04], [-.565, .02], [-.565, -.03], [-.55, -.04], [-.2, -.04]], .05, m.fin); for (let i = 0; i < 6; i++) box(.052, .016, .018, m.dark, 0, .0, -.24 - i * .05);
      prof([[.12, .04], [.12, -.03], [.18, -.09], [.24, -.09], [.26, -.02], [.4, -.075], [.43, -.085], [.43, .05], [.22, .05], [.18, .02], [.15, .04]], .046, m.fin); prof([[.43, -.09], [.455, -.09], [.455, .055], [.43, .055]], .05, m.rubber);
      prof(RGRIP, .03, m.poly); guard(-.035, -.03);
      tube(.011, -.86, -.565, m.steel, .02); tube(.015, -.9, -.86, m.dark, .02, 0, 8); for (let i = 0; i < 2; i++) box(.032, .02, .006, m.rubber, 0, .02, -.875 - i * .012); lensF(.007, 0, .02, -.9005, m.rubber);
      rail(-.18, .1, .052); for (const z of [-.04, .02]) box(.02, .016, .016, m.dark, 0, .066, z);
      for (const sx of [-.019, .019]) box(.005, .04, .1, m.dark, sx, .098, -.01); box(.043, .006, .1, m.dark, 0, .121, -.01); box(.043, .008, .1, m.dark, 0, .077, -.01); for (const z of [-.06, .04]) box(.03, .034, .0012, m.glass, 0, .098, z); reticle(.098, -.055); box(.01, .014, .02, m.acc, .024, .1, 0); box(.03, .01, .02, m.acc, 0, .127, -.01);
      box(.0015, .016, .05, m.rubber, .0222, .025, 0); decal('PALADIN', 'DMR · 12 RD', .12, .03, .0252, 0, -.38);
      chHandle(); T = parts.mag = group(0, -.065, -.11); box(.03, .075, .05, m.poly, 0, 0, 0); box(.034, .012, .054, m.acc, 0, -.042, 0); T = G;
    } else if (k === 'vesper') { // suppressed rifle: carbon-magenta furniture, slotted handguard, long can, angled grip, skeleton stock, holo, counter
      len = .84; port = [.023, .025, 0]; sight = .099;
      prof([[-.2, .056], [.13, .056], [.135, .03], [.13, -.01], [-.2, -.01]], .046, m.metal); prof(RLOWER, .044, m.fin); prof(RGRIP, .03, m.poly); guard(-.035, -.035);
      prof([[-.2, .055], [-.5, .055], [-.51, .04], [-.51, -.025], [-.5, -.032], [-.2, -.032]], .05, m.fin); for (let i = 0; i < 5; i++) for (const y of [.012, -.012]) box(.052, .008, .022, m.rubber, 0, y, -.24 - i * .05);
      tube(.023, -.84, -.53, m.dark, .02, 0, 20); knurl(.0235, -.83, -.79, 5, m.metal, .02); ring(.0235, .0025, -.55, m.glow, .02); lensF(.007, 0, .02, -.8405, m.rubber); tube(.013, -.53, -.51, m.steel, .02);
      prof([[-.36, -.032], [-.44, -.032], [-.42, -.068], [-.39, -.068]], .03, m.poly);
      tube(.015, .13, .3, m.metal, .03); box(.02, .012, .17, m.poly, 0, .055, .33); box(.02, .012, .18, m.poly, 0, -.05, .33, -.05); box(.02, .12, .016, m.poly, 0, 0, .25); prof([[.41, -.08], [.435, -.08], [.435, .07], [.41, .07]], .046, m.rubber);
      rail(-.5, .125, .062); holo(-.06, .07); box(.026, .012, .03, m.dark, 0, .078, .07); counter(.03, .07, .023);
      box(.0015, .016, .05, m.rubber, .0232, .025, 0); decal('VESPER', 'SUPPRESSED · 30', .12, .03, .0252, .03, -.35);
      chHandle(); T = parts.mag = group(0, -.055, -.112); curvedMag(.09); T = G;
    } else if (k === 'kite') { // light bolt sniper: one-piece stock, slim barrel, 2.5x scope, working bolt
      len = .95; port = [.028, .04, .03];
      tube(.02, -.22, .1, m.metal, .03);
      prof([[-.5, .012], [-.5, -.03], [.06, -.03], [.06, -.11], [.1, -.11], [.14, -.06], [.2, -.045], [.4, -.09], [.44, -.09], [.44, .03], [.42, .042], [.16, .042], [.12, .02], [.1, .012]], .05, m.fin);
      prof([[.44, -.095], [.465, -.095], [.465, .045], [.44, .045]], .052, m.rubber); guard(.03, -.03);
      tube(.012, -.95, -.22, m.steel, .03, 0, 14, .016); tube(.016, -.95, -.92, m.dark, .03, 0, 8); lensF(.007, 0, .03, -.9505, m.rubber);
      for (const z of [-.13, .03]) { box(.022, .03, .016, m.dark, 0, .07, z); ring(.0195, .003, z, m.dark, .1); }
      tube(.019, -.17, .06, m.metal, .1, 0, 20); tube(.027, -.24, -.17, m.metal, .1, 0, 20, .019); tube(.019, .06, .1, m.metal, .1, 0, 20, .024); lensF(.025, 0, .1, -.2405, m.lens); add(new THREE.CircleGeometry(.021, 16), m.lens, 0, .1, .1005);
      vtube(.01, .118, .132, m.acc, 0, -.05); ring(.0195, .003, -.17, m.glow, .1); decal('KITE', '.308 · BOLT', .1, .025, .0252, -.01, -.3);
      T = parts.boltL = group(0, .03, .06); parts.boltL.userData.z0 = .06; tube(.013, 0, .045, m.steel, 0); add(new THREE.CylinderGeometry(.0045, .0045, .05, 8), m.steel, .028, 0, .035, 0, 0, Math.PI / 2); add(new THREE.SphereGeometry(.01, 10, 8), m.dark, .054, 0, .035);
      T = parts.mag = group(0, -.045, -.06); box(.03, .03, .06, m.poly, 0, 0, 0); box(.034, .008, .064, m.acc, 0, -.018, 0);
      T = G;
    } else if (k === 'torrent') { // machine gun: white receiver, feed cover, slotted shroud, carry handle, folded bipod, box magazine with a belt
      len = .95; port = [.032, .02, -.05]; sight = .119;
      prof([[-.25, .06], [.14, .06], [.15, .03], [.14, -.035], [-.25, -.035]], .062, m.fin); prof([[-.22, .08], [.08, .08], [.1, .062], [-.22, .062]], .058, m.metal);
      tube(.032, -.62, -.25, m.dark, .022, 0, 18); for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) box(.004, .012, .028, m.rubber, sx * .031, .022, -.29 - i * .055);
      tube(.014, -.92, -.62, m.steel, .022); tube(.021, -.95, -.9, m.dark, .022, 0, 8); lensF(.008, 0, .022, -.9505, m.rubber);
      box(.016, .012, .16, m.dark, 0, .068, -.44); for (const z of [-.37, -.51]) box(.012, .022, .012, m.dark, 0, .058, z);
      for (const sx of [-.012, .012]) box(.008, .008, .2, m.poly, sx, -.02, -.74); box(.026, .014, .02, m.dark, 0, -.012, -.63);
      prof([[.14, .05], [.14, -.035], [.22, -.06], [.4, -.075], [.42, -.075], [.42, .06]], .05, m.poly); prof([[.42, -.08], [.445, -.08], [.445, .065], [.42, .065]], .054, m.rubber);
      prof(RGRIP, .03, m.poly); guard(-.035, -.035);
      rail(-.2, .06, .082); holo(-.06, .09); counter(.025, .06, .031);
      box(.0015, .022, .05, m.rubber, .0315, .02, -.05); decal('TORRENT', 'LMG · 100 RD', .13, .033, .0315, .02, -.12);
      T = parts.bolt = group(0, 0, 0); box(.012, .014, .03, m.steel, -.034, .03, -.02);
      T = parts.mag = group(0, -.1, -.1); box(.06, .1, .12, m.poly, 0, 0, 0); box(.062, .012, .122, m.acc, 0, .03, 0); box(.008, .05, .012, m.brass, -.026, .07, 0);
      T = G;
    } else if (k === 'knife') { // combat knife: tanto blade with a dark fuller and a red edge line, guard, ribbed grip, pommel
      len = .24; port = null;
      prof([[-.02, .022], [-.19, .022], [-.235, .008], [-.212, -.008], [-.02, -.012]], .0065, m.steel, 0, .0015);
      box(.0072, .006, .14, m.dark, 0, .012, -.1); box(.007, .0018, .15, m.glow, 0, -.006, -.11);
      box(.03, .05, .012, m.acc, 0, .005, -.014);
      prof([[-.008, .016], [.09, .016], [.1, .008], [.1, -.012], [.09, -.018], [-.008, -.014]], .022, m.poly);
      for (let i = 0; i < 4; i++) box(.0235, .036, .004, m.dark, 0, .001, .012 + i * .021);
      box(.027, .03, .016, m.metal, 0, 0, .105); decal('DP', 'BLADE', .05, .0125, .0038, .008, -.1);
    } else if (k === 'hornet') { // SMG: camo upper, long knurled suppressor, flashlight, straight mag, wire stock, holo sight
      len = .5; port = [.023, .03, -.03];
      prof([[-.2, .05], [.06, .05], [.07, .04], [.07, -.01], [-.2, -.01]], .044, m.fin);
      prof([[-.06, -.008], [.06, -.008], [.07, -.03], [-.07, -.03]], .036, m.poly);
      prof([[-.008, -.03], [.022, -.03], [.05, -.12], [.046, -.128], [.012, -.128], [-.014, -.06]], .03, m.poly); guard(-.035, -.03);
      decal('HORNET', 'SMG · 25 RD', .1, .025, .0225, .02, -.07);
      tube(.025, -.5, -.235, m.dark, .022); knurl(.0256, -.485, -.445, 5, m.metal, .022); knurl(.0256, -.29, -.25, 5, m.metal, .022); lensF(.008, 0, .022, -.5006, m.rubber); tube(.012, -.235, -.2, m.steel, .022);
      for (const sx of [-.0257, .0257]) box(.0015, .006, .14, m.glow, sx, .022, -.37);
      tube(.011, -.2, -.15, m.poly, 0, -.033); lensF(.009, -.033, 0, -.2006, m.lamp); box(.012, .01, .03, m.dark, -.025, 0, -.175);
      for (const sx of [-.016, .016]) box(.006, .006, .2, m.steel, sx, 0, .17); box(.036, .016, .02, m.metal, 0, 0, .075); box(.042, .065, .014, m.rubber, 0, -.01, .275);
      rail(-.18, .05, .055); holo(-.04, .062); box(.0015, .012, .04, m.rubber, .0225, .03, -.03); counter(.03, .04, .022);
      T = parts.bolt = group(0, 0, 0); box(.01, .012, .03, m.steel, -.027, .032, 0); box(.014, .01, .008, m.fin, -.035, .032, -.012);
      T = parts.mag = group(0, -.1, -.11, .05);
      box(.03, .14, .036, m.poly, 0, 0, 0); for (let i = 0; i < 4; i++) box(.032, .004, .038, m.dark, 0, .04 - i * .025, 0); box(.034, .012, .042, m.acc, 0, -.072, -.002);
      T = G;
    } else if (k === 'breaker') { // pump shotgun: wood furniture, perforated heat shield, side saddle of shells, ghost ring sight
      len = .79; port = [.024, .025, -.03];
      prof([[-.14, .05], [.12, .05], [.13, .03], [.13, -.03], [-.14, -.03]], .046, m.metal);
      decal('BREAKER', '12 GA · PUMP', .13, .032, .0232, .012, -.005);
      tube(.02, -.79, -.12, m.steel, .028); tube(.0235, -.79, -.772, m.dark, .028); box(.034, .014, .32, m.heat, 0, .053, -.5);
      tube(.017, -.7, -.12, m.metal, -.012); tube(.019, -.716, -.7, m.dark, -.012); add(new THREE.SphereGeometry(.0045, 10, 8), m.glow, 0, .052, -.784);
      for (const sx of [-.009, .009]) box(.004, .018, .006, m.dark, sx, .058, .1); ring(.008, .0022, .1, m.dark, .07);
      box(.0015, .016, .05, m.rubber, .0236, .025, -.03); screw(-.0236, .0, .06); screw(-.0236, .0, .09);
      prof([[.13, .04], [.13, -.03], [.2, -.055], [.43, -.095], [.43, .05], [.2, .045]], .05, m.fin);
      prof([[.43, -.1], [.466, -.1], [.466, .055], [.43, .055]], .054, m.rubber); for (let i = 0; i < 5; i++) box(.056, .006, .006, m.rubber, 0, -.085 + i * .032, .468);
      prof([[-.008, -.03], [.02, -.03], [.048, -.11], [.04, -.12], [.005, -.12], [-.025, -.04]], .034, m.fin); guard(-.045, -.03);
      box(.005, .042, .1, m.dark, -.0255, .008, -.03); for (let i = 0; i < 4; i++) { const sz = -.066 + i * .024; vtube(.0095, -.012, .03, m.shell, -.0335, sz); vtube(.0098, -.02, -.01, m.brass, -.0335, sz); }
      T = parts.pump = group(0, 0, 0);
      prof([[-.24, .02], [-.46, .02], [-.47, 0], [-.47, -.045], [-.46, -.052], [-.24, -.052], [-.23, -.03]], .056, m.fin);
      for (let i = 0; i < 7; i++) box(.058, .005, .009, m.rubber, 0, -.052, -.27 - i * .028);
      for (const z of [-.235, -.468]) box(.058, .01, .008, m.acc, 0, -.03, z);
      T = G;
    } else if (k === 'lancer') { // rifle: red cerakote, vented handguard, curved mag, vertical grip, laser, holo sight, counter
      len = .79; port = [.023, .025, 0];
      prof([[-.2, .056], [.13, .056], [.135, .03], [.13, -.01], [-.2, -.01]], .046, m.metal);
      prof([[-.18, -.008], [.12, -.008], [.12, -.03], [0, -.035], [-.06, -.035], [-.07, -.06], [-.155, -.06], [-.17, -.035], [-.18, -.03]], .044, m.fin);
      prof([[-.008, -.03], [.024, -.03], [.054, -.12], [.046, -.13], [.01, -.13], [-.016, -.06]], .03, m.poly); guard(-.035, -.035);
      prof([[-.2, .058], [-.52, .058], [-.535, .045], [-.535, -.025], [-.52, -.035], [-.2, -.035]], .054, m.fin);
      for (let i = 0; i < 6; i++) box(.056, .012, .03, m.poly, 0, .015, -.25 - i * .045);
      for (const sx of [-.028, .028]) box(.002, .006, .25, m.glow, sx, -.012, -.37);
      decal('LANCER', 'DP-ARMS · 5.7', .12, .03, .0273, .038, -.36); decal('DP', 'SAFE · AUTO', .045, .012, .0224, -.02, .05);
      tube(.012, -.7, -.535, m.steel, .02); tube(.019, -.79, -.7, m.dark, .02, 0, 8); for (let i = 0; i < 3; i++) box(.042, .006, .01, m.rubber, 0, .02, -.722 - i * .022); lensF(.008, 0, .02, -.7905, m.rubber);
      tube(.016, .13, .3, m.metal, .03); prof([[.22, .07], [.22, -.02], [.3, -.075], [.4, -.085], [.42, -.085], [.42, .07]], .046, m.poly);
      box(.04, .02, .12, m.fin, 0, .08, .33); prof([[.42, -.09], [.446, -.09], [.446, .075], [.42, .075]], .05, m.rubber);
      rail(-.52, .125, .062); holo(-.06, .07); box(.026, .012, .03, m.dark, 0, .078, .07); box(.02, .012, .025, m.dark, 0, .078, -.5); counter(.03, .07, .023);
      box(.0015, .016, .05, m.rubber, .0232, .025, 0); box(.012, .014, .02, m.metal, .028, .035, .06); screw(-.0225, -.02, .0); screw(-.0225, -.02, .03);
      vtube(.016, -.11, -.035, m.poly, 0, -.42, .018); vtube(.019, -.118, -.108, m.acc, 0, -.42);
      box(.02, .022, .05, m.poly, -.04, 0, -.45); box(.02, .01, .02, m.dark, -.031, 0, -.45); lensF(.007, -.04, .004, -.4755, m.red); lensF(.005, -.04, -.005, -.4755, m.lamp);
      T = parts.bolt = group(0, 0, 0); box(.034, .008, .02, m.dark, 0, .06, .12); box(.054, .008, .009, m.dark, 0, .06, .128);
      T = parts.mag = group(0, -.055, -.112);
      let py = 0, pz = 0; for (let i = 0; i < 4; i++) { const a = .1 + i * .09, dy = -Math.cos(a) * .042, dz = -Math.sin(a) * .042; box(.03, .044, .034, m.poly, 0, py + dy / 2, pz + dz / 2, a); box(.031, .004, .035, m.dark, 0, py + dy, pz + dz, a); py += dy; pz += dz; }
      box(.034, .012, .04, m.acc, 0, py - .004, pz - .003, .4);
      T = G;
    } else { // longbow: carbon chassis, fluted barrel, slotted brake, big scope with turrets, working bolt, bipod
      len = 1.03; port = [.03, .04, .03];
      tube(.023, -.24, .12, m.metal, .03); rail(-.2, .1, .052, .026);
      prof([[-.24, .012], [-.55, .012], [-.565, -.005], [-.565, -.04], [-.24, -.045], [-.2, -.03]], .056, m.fin);
      prof([[-.24, .015], [.13, .015], [.13, -.03], [-.24, -.03]], .05, m.fin);
      prof([[.13, .02], [.13, -.03], [.2, -.09], [.26, -.09], [.28, -.02], [.47, -.08], [.5, -.09], [.5, .06], [.24, .06], [.2, .025], [.16, .045]], .05, m.fin);
      prof([[.5, -.1], [.53, -.1], [.53, .07], [.5, .07]], .054, m.rubber); box(.052, .022, .14, m.acc, 0, .072, .38); vtube(.007, -.15, -.09, m.dark, 0, .44); vtube(.012, -.16, -.148, m.rubber, 0, .44);
      prof([[-.012, -.025], [.02, -.025], [.045, -.11], [.035, -.12], [0, -.12], [-.03, -.04]], .032, m.poly); guard(-.045, -.03);
      decal('LONGBOW', '.338 · BOLT', .13, .033, .0282, -.014, -.4);
      tube(.016, -.96, -.24, m.steel, .03, 0, 16, .02); for (let a = 0; a < 6; a++) { const t = a / 6 * TAU; box(.004, .004, .45, m.dark, Math.cos(t) * .0172, .03 + Math.sin(t) * .0172, -.53); }
      box(.05, .036, .07, m.dark, 0, .03, -.995); for (let i = 0; i < 3; i++) box(.052, .026, .008, m.rubber, 0, .03, -.976 - i * .018); lensF(.009, 0, .03, -1.0305, m.rubber);
      tube(.024, -.22, .08, m.metal, .11, 0, 24); tube(.036, -.32, -.22, m.metal, .11, 0, 24, .024); tube(.036, -.36, -.32, m.metal, .11, 0, 24); knurl(.0365, -.355, -.33, 4, m.dark, .11);
      tube(.024, .08, .14, m.metal, .11, 0, 24, .031); tube(.031, .14, .17, m.rubber, .11, 0, 24); lensF(.033, 0, .11, -.3605, m.lens); add(new THREE.CircleGeometry(.027, 20), m.lens, 0, .11, .1705);
      ring(.0255, .0035, -.22, m.glow, .11); for (const z of [-.16, .04]) { box(.026, .034, .022, m.dark, 0, .078, z); ring(.0262, .004, z, m.dark, .11); }
      vtube(.014, .134, .162, m.acc, 0, -.05); vtube(.0155, .162, .168, m.dark, 0, -.05); add(new THREE.CylinderGeometry(.014, .014, .028, 16), m.acc, .036, .11, -.05, 0, 0, Math.PI / 2); add(new THREE.CylinderGeometry(.012, .012, .02, 16), m.acc, -.033, .11, -.05, 0, 0, Math.PI / 2);
      box(.014, .016, .026, m.dark, 0, -.05, -.5); for (const sx of [-.012, .012]) box(.008, .008, .22, m.poly, sx, -.055, -.62);
      T = parts.boltL = group(0, .03, .07); parts.boltL.userData.z0 = .07;
      tube(.015, 0, .055, m.steel, 0); add(new THREE.CylinderGeometry(.005, .005, .06, 8), m.steel, .033, 0, .04, 0, 0, Math.PI / 2); add(new THREE.SphereGeometry(.013, 12, 10), m.dark, .066, 0, .04);
      T = parts.mag = group(0, -.065, -.07);
      box(.036, .07, .08, m.poly, 0, 0, 0); box(.04, .012, .084, m.acc, 0, -.04, 0);
      T = G;
    }
    if (k === 'hornet') sight = .091; if (k === 'breaker') sight = .068; if (k === 'lancer') sight = .099;
    if (opts.hands && k === 'knife') {
      const op = OPS[opts.op] || OPS.vex, band = new THREE.MeshStandardMaterial({ color: op.col, roughness: .5 });
      T = group(0, 0, .045);
      box(.012, .046, .072, m.glove, .019, -.002, 0); box(.012, .036, .07, m.glove, -.018, -.006, 0); for (let i = 0; i < 4; i++) box(.04, .016, .016, m.glove, 0, -.024, -.027 + i * .018);
      box(.011, .012, .04, m.glove, -.011, .02, -.022); box(.006, .022, .04, band, .026, -.004, .01);
      const arm = new THREE.Group(); arm.position.set(.006, -.02, .04); arm.rotation.set(1.1, -.3, 0); T.add(arm);
      const sl = new THREE.Mesh(new THREE.CylinderGeometry(.04, .047, .42, 14), m.sleeve); sl.rotation.x = Math.PI / 2; sl.position.z = .23; arm.add(sl);
      const bd = new THREE.Mesh(new THREE.CylinderGeometry(.0435, .0435, .03, 14), band); bd.rotation.x = Math.PI / 2; bd.position.z = .035; arm.add(bd);
      T = G;
    } else if (opts.hands) { // gloves wrapped round the grip and the support, sleeves in the operative's colour
      const op = OPS[opts.op] || OPS.vex, band = new THREE.MeshStandardMaterial({ color: op.col, roughness: .5 });
      const arm = (par, x, y, z, rx, ry, l) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, 0); par.add(g);
        const s = new THREE.Mesh(new THREE.CylinderGeometry(.04, .047, l, 14), m.sleeve); s.rotation.x = Math.PI / 2; s.position.z = l / 2 + .02; g.add(s);
        const b = new THREE.Mesh(new THREE.CylinderGeometry(.0435, .0435, .03, 14), band); b.rotation.x = Math.PI / 2; b.position.z = .035; g.add(b);
        const c = new THREE.Mesh(new THREE.CylinderGeometry(.036, .04, .04, 14), m.glove); c.rotation.x = Math.PI / 2; c.position.z = .0; g.add(c); };
      const PIS = GUNS[k].cat === 'Sidearm', HG = { hammer: [-.052, .05, -.38], kite: [-.072, .088, -.32] }[k] || (PIS ? [-.055, .022, -.25] : [-.072, .024, -.25]);
      T = group(0, HG[0], HG[1], HG[2]);
      box(.012, .07, .052, m.glove, .021, 0, 0); box(.046, .07, .016, m.glove, .002, 0, .029); for (let i = 0; i < 4; i++) box(.05, .0145, .017, m.glove, -.002, .026 - i * .0175, -.029);
      box(.013, .017, .05, m.glove, -.021, .031, -.012); box(.006, .026, .03, band, .028, .005, .006);
      arm(T, .01, -.035, .03, .7, -.2, .42);
      const L = PIS ? [-.016, HG[0] - .045, HG[1] + .008, .3] : { gnat: [0, -.065, -.2, 0], hornet: [0, -.04, -.165, 0], breaker: [0, -.068, -.35, 0], thresher: [0, -.07, -.33, 0], mako: [0, -.02, -.36, 0], paladin: [0, -.06, -.42, 0], vesper: [0, -.07, -.4, 0], lancer: [0, -.088, -.42, 0], kite: [0, -.05, -.36, 0], longbow: [0, -.07, -.42, 0], torrent: [0, -.035, -.42, 0] }[k];
      T = parts.lhand = group(L[0], L[1], L[2], L[3]);
      box(.052, .016, .075, m.glove, 0, 0, 0); box(.012, .042, .066, m.glove, -.031, .022, 0); for (let i = 0; i < 3; i++) box(.004, .03, .016, m.glove, -.038, .03, -.022 + i * .022); box(.012, .028, .045, m.glove, .031, .016, .004);
      arm(T, -.02, -.01, .03, .5, .55, PIS ? .38 : .55);
      T = G;
    }
    G.userData.len = len; G.userData.port = port; G.userData.sight = sight; G.userData.parts = parts; G.userData.k = k;
    if (opts.flash) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: X.starT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.setScalar(.4); sp.position.set(0, .025, -len - .06); sp.visible = false; G.add(sp); G.userData.flash = sp; }
    return G;
  }
  function viewGun(k, op) { return gunModel(k, { hands: true, op }); }
  // the armory pictures: each gun rendered side-on into a small transparent image, once
  function gunIcon(k) {
    if (ICON[k] !== undefined) return ICON[k];
    if (!X || !ready) return null;
    try {
      const w = 480, h = 150, r = X.renderer, rt = new THREE.WebGLRenderTarget(w, h); rt.texture.encoding = THREE.sRGBEncoding;
      const sc = new THREE.Scene(), gm = gunModel(k); sc.add(gm); sc.add(new THREE.HemisphereLight('#ffffff', '#5a6270', 2));
      const kl = new THREE.DirectionalLight('#fff4e0', 3.2); kl.position.set(3, 4, 1); sc.add(kl); const rl = new THREE.DirectionalLight('#9fd8ff', 2.4); rl.position.set(-3, 2, -1); sc.add(rl);
      const bb = new THREE.Box3().setFromObject(gm), c = bb.getCenter(new THREE.Vector3()), s = bb.getSize(new THREE.Vector3());
      const hw = Math.max(s.z / 2, s.y / 2 * w / h) * 1.06, hh = hw * h / w, cam = new THREE.OrthographicCamera(-hw, hw, hh, -hh, .01, 10); cam.position.set(c.x + 3, c.y, c.z); cam.lookAt(c);
      const prev = r.getRenderTarget(), cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
      r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(sc, cam); const buf = new Uint8Array(w * h * 4); r.readRenderTargetPixels(rt, 0, 0, w, h, buf); r.setRenderTarget(prev); r.setClearColor(cc, ca); rt.dispose();
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d'), id = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++) id.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      ctx.putImageData(id, 0, 0); return ICON[k] = cv;
    } catch (e) { console.error(e); return ICON[k] = false; }
  }
  // spent brass flying out of the ejection port (first person only)
  const CASE = { pip: [.0045, .019], wasp: [.0045, .019], quill: [.0045, .019], gnat: [.0045, .019], hornet: [.0045, .019], mako: [.005, .03], paladin: [.005, .03], vesper: [.005, .03], lancer: [.005, .03], torrent: [.005, .03], kite: [.006, .04], longbow: [.0065, .045], breaker: [.0095, .05], thresher: [.0095, .05] }, CASEGEO = {};
  const VOS = { knife: [.15, -.15, -.31], pip: [.17, -.17, -.3], wasp: [.17, -.17, -.3], quill: [.17, -.17, -.3], stub: [.17, -.18, -.3], hammer: [.17, -.17, -.3], gnat: [.2, -.19, -.3], hornet: [.2, -.19, -.3], breaker: [.2, -.2, -.27], thresher: [.2, -.2, -.28], mako: [.2, -.2, -.28], paladin: [.21, -.21, -.27], vesper: [.2, -.2, -.28], lancer: [.2, -.2, -.28], kite: [.22, -.22, -.26], longbow: [.23, -.23, -.25], torrent: [.21, -.21, -.27] };
  function viewAnim(P, G, dt) {
    const U = X.viewGun.userData, pp = U.parts, A = P.ammo[G.k] || { mag: 0 }, sm = x => x * x * (3 - 2 * x);
    const st = P.fireT > 0 ? 60 / G.rpm - P.fireT : 9, shotT = st >= 0 ? st : 9, r = P.reloadT > 0 ? 1 - P.reloadT / G.rel : -1, win = (a, b) => cl((r - a) / (b - a), 0, 1);
    if (pp.slide) pp.slide.position.z = Math.max(shotT < .08 ? (1 - shotT / .08) * .03 : 0, A.mag === 0 && r < 0 ? .03 : 0);
    if (pp.bolt) pp.bolt.position.z = (shotT < .05 ? (1 - shotT / .05) * .012 : 0) + (r > .82 ? Math.sin(win(.82, .97) * Math.PI) * .05 : 0);
    if (pp.pump) { const s = cl((shotT - .16) / .36, 0, 1); pp.pump.position.z = Math.sin(s * Math.PI) * .085 + (r > .85 ? Math.sin(win(.85, 1) * Math.PI) * .085 : 0); }
    if (pp.boltL) { const s = cl((shotT - (G.k === 'kite' ? .12 : .28)) / (G.k === 'kite' ? .45 : .8), 0, 1), s2 = r > .8 ? win(.8, 1) : 0, q = Math.max(s, s2), lift = q <= 0 || q >= 1 ? 0 : q < .2 ? q / .2 : q > .8 ? (1 - q) / .2 : 1, back = q < .2 || q > .8 ? 0 : Math.sin((q - .2) / .6 * Math.PI); pp.boltL.rotation.z = sm(cl(lift, 0, 1)) * 1.1; pp.boltL.position.z = pp.boltL.userData.z0 + back * .075; }
    if (pp.cyl) { const want = (G.mag - A.mag) * TAU / 6; pp.cyl.rotation.z += (want - pp.cyl.rotation.z) * Math.min(1, dt * 22); }
    if (pp.brk) pp.brk.rotation.x = -(r < 0 ? 0 : sm(win(.05, .25)) * (1 - sm(win(.8, .95)))) * .75;
    let magOut = 0;
    if (pp.mag) { magOut = r < 0 ? 0 : r < .3 ? sm(win(.1, .3)) : r < .55 ? 1 : 1 - sm(win(.55, .8)); pp.mag.position.y = pp.mag.userData.p0.y - magOut * .34; pp.mag.position.z = pp.mag.userData.p0.z + magOut * .05; pp.mag.rotation.x = (G.cat === 'Sidearm' ? -.25 : G.k === 'hornet' || G.k === 'gnat' ? .05 : 0) + magOut * .5; }
    if (pp.lhand && G.cat !== 'Sidearm') {
      const p0 = pp.lhand.userData.p0; let h = 0, tx = p0.x, ty = p0.y, tz = p0.z;
      if (G.k === 'breaker') { h = r < 0 ? 0 : sm(win(.05, .2)) * (1 - sm(win(.85, 1))); tx = -.005; ty = -.06 + Math.sin(r * Math.PI * 10) * .018; tz = -.06; }
      else if (pp.mag) { h = r < 0 ? 0 : sm(win(.38, .55)) * (1 - sm(win(.78, .9))); const mp = pp.mag.position; tx = mp.x - .01; ty = mp.y - .06; tz = mp.z; }
      pp.lhand.position.set(lp(p0.x, tx, h), lp(p0.y, ty, h), lp(p0.z, tz, h));
    }
    if (pp.counter && pp.counter.last !== A.mag) { const { c, t } = pp.counter, g = c.getContext('2d'); pp.counter.last = A.mag; g.fillStyle = '#05080c'; g.fillRect(0, 0, 64, 44); const low = A.mag <= G.mag * .25; g.fillStyle = low ? WARN : GUNS[G.k].col; g.font = '700 30px "Chakra Petch", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(A.mag).padStart(2, '0'), 32, 20); g.fillRect(6, 38, 52 * A.mag / G.mag, 3); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(6 + 52 * A.mag / G.mag, 38, 52 * (1 - A.mag / G.mag), 3); t.needsUpdate = true; }
  }
  function updateCasings(dt) {
    if (!X.casings) X.casings = []; if (!X.ejects) X.ejects = [];
    X.vroot.updateMatrixWorld(true);
    for (const e of X.ejects) e.t -= dt;
    for (const e of X.ejects.filter(e => e.t <= 0)) {
      if (!X.viewGun || X.viewGun.userData.k !== e.k || !CASE[e.k] || !X.viewGun.userData.port) continue; const [rr, ll] = CASE[e.k], key = e.k;
      if (!CASEGEO[key]) CASEGEO[key] = new THREE.CylinderGeometry(rr, rr, ll, 10);
      const mm = new THREE.Mesh(CASEGEO[key], e.k === 'breaker' || e.k === 'thresher' ? gmats(e.k).shell : gmats(e.k).brass), v = new THREE.Vector3(...X.viewGun.userData.port); X.viewGun.localToWorld(v); X.vroot.worldToLocal(v);
      mm.position.copy(v); mm.rotation.set(R() * 3, R() * 3, R() * 3); X.vroot.add(mm); X.casings.push({ m: mm, v: [1.3 + R() * .6, 1.1 + R() * .6, .35 + R() * .3], s: [rnd(-20, 20), rnd(-20, 20), rnd(-20, 20)], t: .7 });
    }
    X.ejects = X.ejects.filter(e => e.t > 0);
    X.casings = X.casings.filter(c => { c.t -= dt; c.v[1] -= 7 * dt; c.m.position.x += c.v[0] * dt; c.m.position.y += c.v[1] * dt; c.m.position.z += c.v[2] * dt; c.m.rotation.x += c.s[0] * dt; c.m.rotation.y += c.s[1] * dt; c.m.rotation.z += c.s[2] * dt; if (c.t <= 0) X.vroot.remove(c.m); return c.t > 0; });
  }
