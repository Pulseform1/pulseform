  /* ---------- 76 guns: the gun kit and the guns built from it, first-person hands, moving parts, casings ----------
     Finishes are canvas textures (brushed steel, stippled polymer, cerakote, wood, carbon weave, digital camo) lit by a small
     reflection map. The kit and the guns are in gunModel below; viewAnim moves the working parts in first person. */
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
    const M2 = GMAT[k] = {
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
    // plain colours are read as linear light, which washes strong colours out: convert the ones meant to be seen as picked
    for (const q of ['fin', 'acc', 'glow', 'tritium', 'red', 'lamp', 'sleeve', 'glove', 'shell', 'brass']) M2[q].color.convertSRGBToLinear();
    M2.fin.envMapIntensity = Math.min(M2.fin.envMapIntensity, .6);
    return M2;
  }
  // merge the plain meshes under a group into one mesh per material, so a gun is a handful of draw calls, not hundreds
  function bake(group, cast) {
    const by = new Map();
    for (const o of [...group.children]) {
      if (o.isGroup) { bake(o, cast); continue; }
      if (!o.isMesh || o.userData.live) continue;
      o.updateMatrix(); const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrix);
      if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(g); group.remove(o);
    }
    for (const [mat, list] of by) {
      let n = 0; for (const g of list) n += g.attributes.position.count;
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let at = 0;
      for (const g of list) { P.set(g.attributes.position.array, at * 3); N.set(g.attributes.normal.array, at * 3); if (g.attributes.uv) U.set(g.attributes.uv.array, at * 2); at += g.attributes.position.count; g.dispose(); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
      const m = new THREE.Mesh(geo, mat); m.castShadow = !!cast; group.add(m);
    }
  }
  /* Every gun is assembled from the same kit, so the arsenal reads as one family:
       side()   a silhouette drawn in (z, y) and given thickness, with bevelled edges, curves and cut-outs
       lathe()  a turned part (barrels, suppressors, brakes, scopes) spun round the bore from [z, radius] pairs
       hull()   a body with one cross-section all the way along (handguards, pumps)
       rbox()   a box with rounded edges
     Forward is -z, the trigger sits near the origin and the muzzle is at z = -len. Moving parts (slide, bolt, pump,
     magazine, the support hand) are their own groups so the first-person view can animate them. Each gun reports where
     its grip and its support hand go, which is how both your own hands and your rival's arms find it. */
  function gunModel(k, opts = {}) {
    const W = GUNS[k], m = gmats(k), G = new THREE.Group(), cast = !!opts.cast, parts = {};
    let T = G, len = .5, port = [.02, .03, 0], sight = .09, sup = [0, -.05, -.3], pistolHold = false;
    const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); T.add(o); return o; };
    const box = (w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
    const rbox = (w, h, d, mat, x, y, z, r = .004, rx = 0, rz = 0) => {
      const s = new THREE.Shape(), a = w / 2 - r, b = h / 2 - r; s.moveTo(-a, -h / 2); s.lineTo(a, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -b); s.lineTo(w / 2, b); s.quadraticCurveTo(w / 2, h / 2, a, h / 2); s.lineTo(-a, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, b); s.lineTo(-w / 2, -b); s.quadraticCurveTo(-w / 2, -h / 2, -a, -h / 2);
      const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 3 }); g.translate(0, 0, -d / 2); return add(g, mat, x, y, z, rx, 0, rz);
    };
    const trace = (P, s) => { P.forEach((p, i) => p[0] === 'q' ? s.quadraticCurveTo(p[1], p[2], p[3], p[4]) : i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); return s; };
    const side = (pts, w, mat, x = 0, bev = .005, holes) => {
      const s = trace(pts, new THREE.Shape()); if (holes) for (const h of holes) s.holes.push(trace(h, new THREE.Path()));
      const d = Math.max(.002, w - bev * 2), g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev * .9, bevelSegments: 2, curveSegments: 6 });
      g.translate(0, 0, -d / 2); g.rotateY(-Math.PI / 2); return add(g, mat, x);
    };
    const lathe = (pts, mat, y = 0, x = 0, seg = 18) => { const q = pts.map(p => new THREE.Vector2(Math.max(p[1], .0001), -p[0])); if (q[0].y > q[q.length - 1].y) q.reverse(); const g = new THREE.LatheGeometry(q, seg); g.rotateX(-Math.PI / 2); return add(g, mat, x, y, 0); };
    const hull = (sec, z0, z1, mat, bev = .003) => { const s = new THREE.Shape(); sec.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); const g = new THREE.ExtrudeGeometry(s, { depth: Math.abs(z1 - z0) - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1 }); return add(g, mat, 0, 0, Math.min(z0, z1) + bev); };
    const oct = (w, h, cy, c) => [[-w / 2 + c, cy - h / 2], [w / 2 - c, cy - h / 2], [w / 2, cy - h / 2 + c], [w / 2, cy + h / 2 - c], [w / 2 - c, cy + h / 2], [-w / 2 + c, cy + h / 2], [-w / 2, cy + h / 2 - c], [-w / 2, cy - h / 2 + c]];
    const frame = (w, h, cy, t, z0, z1, mat) => { const s = new THREE.Shape(), a = w / 2, b = h / 2, c = Math.min(.006, t * 1.2); s.moveTo(-a + c, cy - b); s.lineTo(a - c, cy - b); s.lineTo(a, cy - b + c); s.lineTo(a, cy + b - c); s.lineTo(a - c, cy + b); s.lineTo(-a + c, cy + b); s.lineTo(-a, cy + b - c); s.lineTo(-a, cy - b + c);
      const hp = new THREE.Path(); hp.moveTo(-a + t, cy - b + t); hp.lineTo(-a + t, cy + b - t); hp.lineTo(a - t, cy + b - t); hp.lineTo(a - t, cy - b + t); s.holes.push(hp); return add(new THREE.ExtrudeGeometry(s, { depth: Math.abs(z1 - z0), bevelEnabled: false }), mat, 0, 0, Math.min(z0, z1)); };
    const tube = (r, z0, z1, mat, y = 0, x = 0, seg = 18, rB) => add(new THREE.CylinderGeometry(rB == null ? r : rB, r, Math.abs(z1 - z0), seg), mat, x, y, (z0 + z1) / 2, Math.PI / 2);
    const vtube = (r, y0, y1, mat, x, z, rTop) => add(new THREE.CylinderGeometry(rTop == null ? r : rTop, r, Math.abs(y1 - y0), 14), mat, x, (y0 + y1) / 2, z);
    const pin = (y, z, w, r = .0038, mat = m.steel) => add(new THREE.CylinderGeometry(r, r, w + .003, 10), mat, 0, y, z, 0, 0, Math.PI / 2);
    const ring = (r, t, z, mat, y = 0, x = 0) => add(new THREE.TorusGeometry(r, t, 6, 20), mat, x, y, z);
    const disc = (r, x, y, z, mat, back) => add(new THREE.CircleGeometry(r, 18), mat, x, y, z, 0, back ? 0 : Math.PI);
    const rail = (z0, z1, y, w = .028) => { rbox(w, .008, z1 - z0, m.dark, 0, y, (z0 + z1) / 2, .002); for (let z = z0 + .008; z < z1 - .004; z += .0125) box(w + .004, .0065, .006, m.dark, 0, y + .0066, z); };
    const guardLoop = (z, y) => { add(new THREE.TorusGeometry(.023, .0042, 8, 18, Math.PI), m.metal, 0, y, z, 0, Math.PI / 2, Math.PI); side([[z + .004, y - .002], [z + .011, y - .022], [z + .016, y - .022], [z + .011, y - .002]], .007, m.steel, 0, .0015); };
    const decal = (text, sub, w, h, sx, y, z, col = 'rgba(240,238,232,.9)') => {
      const key = text + '|' + sub + '|' + col; let mat = DECAL[key];
      if (!mat) { const t = canvasTex(256, 64, (g, cw, ch) => { g.clearRect(0, 0, cw, ch); g.fillStyle = col; g.textBaseline = 'middle'; g.font = `700 ${sub ? 30 : 38}px "Chakra Petch", monospace`; g.fillText(text, 6, sub ? 22 : 32); if (sub) { g.globalAlpha = .75; g.font = '700 15px monospace'; g.fillText(sub, 8, 50); } }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        mat = DECAL[key] = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: .6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); }
      for (const s of [1, -1]) add(new THREE.PlaneGeometry(w, h), mat, sx * s, y, z, 0, s * Math.PI / 2, 0);
    };
    const group = (x, y, z, rx = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.x = rx; g.userData.p0 = g.position.clone(); G.add(g); return g; };
    // sights and gadgets
    const holo = (z, y) => {   // a window sight: hooded frame, glass, a ring reticle
      rbox(.034, .012, .056, m.dark, 0, y + .006, z, .003); frame(.038, .042, y + .033, .0036, z - .024, z + .02, m.dark);
      box(.03, .031, .0012, m.glass, 0, y + .033, z - .02); add(new THREE.TorusGeometry(.0046, .0007, 6, 20), m.red, 0, y + .033, z - .018); add(new THREE.SphereGeometry(.0009, 6, 6), m.red, 0, y + .033, z - .018);
      vtube(.005, y + .056, y + .062, m.poly, 0, z + .01); rbox(.006, .012, .016, m.poly, .021, y + .03, z + .012, .002);
    };
    const prism = (z, y, long) => {   // a boxy magnified sight you look straight through
      const L = long ? .1 : .07; rbox(.03, .012, L * .7, m.dark, 0, y + .006, z, .003); frame(.044, .052, y + .036, .005, z - L / 2, z + L / 2, m.dark); for (const dz of [-L / 2 + .004, L / 2 - .004]) box(.033, .036, .0012, m.glass, 0, y + .034, z + dz);
      add(new THREE.SphereGeometry(.0011, 8, 6), m.red, 0, y + .034, z - L / 2 + .008); for (const [w2, h2, dx, dy] of [[.006, .0008, -.006, 0], [.006, .0008, .006, 0], [.0008, .006, 0, -.006]]) box(w2, h2, .0005, m.red, dx, y + .034 + dy, z - L / 2 + .008);
      vtube(.008, y + .061, y + .07, m.acc, 0, z); rbox(.01, .014, .02, m.acc, .0245, y + .034, z, .003);
    };
    const scope = (z0, z1, y, r, bell) => {   // a tube scope: flared bells at both ends, turrets, mounting rings, coated lenses
      lathe([[z0, bell * .86], [z0, bell], [z0 + .045, bell], [z0 + .1, r], [z1 - .075, r], [z1 - .03, r * 1.28], [z1, r * 1.28], [z1, r * 1.1]], m.metal, y, 0, 24);
      disc(bell * .88, 0, y, z0 + .004, m.lens); disc(r * 1.12, 0, y, z1 - .004, m.lens, true); ring(bell * 1.005, .0028, z0 + .012, m.glow, y); ring(r * 1.3, .003, z1 - .012, m.rubber, y);
      const zt = lp(z0, z1, .52); vtube(.013, y + r, y + r + .028, m.acc, 0, zt); vtube(.0145, y + r + .028, y + r + .034, m.dark, 0, zt); add(new THREE.CylinderGeometry(.013, .013, .026, 14), m.acc, r + .013, y, zt, 0, 0, Math.PI / 2);
      for (const z of [lp(z0, z1, .3), lp(z0, z1, .74)]) { ring(r + .003, .0045, z, m.dark, y); rbox(.022, y - r - .05, .022, m.dark, 0, .05 + (y - r - .05) / 2, z, .003); }
    };
    const counter = (y, z, hw) => {   // a little screen on the left of the receiver showing the rounds left
      rbox(.008, .026, .038, m.dark, -hw - .003, y, z, .002); const c = document.createElement('canvas'); c.width = 64; c.height = 44; const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
      const p = add(new THREE.PlaneGeometry(.03, .02), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), -hw - .0075, y, z, 0, -Math.PI / 2, 0); p.userData.live = true; parts.counter = { c, t, last: -1 };
    };
    // muzzle ends, turned on the lathe: 'brake' (ported block), 'flash' (slim hider), 'supp' (a suppressor of length sl), 'crown' (bare)
    const muzzle = (kind, z, y, r, sl = .2) => {
      if (kind === 'supp') { lathe([[z, .006], [z, r * 1.75], [z + .006, r * 1.95], [z + sl - .03, r * 1.95], [z + sl - .012, r * 1.5], [z + sl, r * 1.1]], m.dark, y, 0, 22); for (let i = 0; i < 5; i++) ring(r * 1.97, .0016, z + .016 + i * .009, m.metal, y); ring(r * 1.97, .0024, z + sl - .04, m.glow, y); disc(.0065, 0, y, z - .0005, m.rubber); }
      else if (kind === 'brake') { lathe([[z, .0065], [z, r * 1.35], [z + .008, r * 1.6], [z + .058, r * 1.6], [z + .068, r * 1.05]], m.dark, y, 0, 8); for (let i = 0; i < 3; i++) box(r * 3.4, r * .7, .009, m.rubber, 0, y, z + .016 + i * .017); disc(.0065, 0, y, z - .0005, m.rubber); }
      else if (kind === 'flash') { lathe([[z, .0065], [z, r * 1.25], [z + .04, r * 1.4], [z + .05, r * 1.05]], m.dark, y, 0, 14); for (let a = 0; a < 4; a++) box(.003, .003, .03, m.rubber, Math.cos(a * Math.PI / 2 + .78) * r * 1.3, y + Math.sin(a * Math.PI / 2 + .78) * r * 1.3, z + .02); disc(.006, 0, y, z - .0005, m.rubber); }
      else { ring(r, .002, z + .002, m.steel, y); disc(r * .62, 0, y, z - .0005, m.rubber); }
    };
    const GRIP = [[-.01, -.03], [.03, -.03], ['q', .048, -.07, .058, -.116], ['q', .06, -.13, .047, -.13], [.016, -.13], ['q', .005, -.13, .004, -.118], ['q', -.002, -.078, -.02, -.058]];
    const pistolGrip = (mat = m.poly) => { side(GRIP, .032, mat, 0, .008); for (let i = 0; i < 4; i++) box(.0335, .003, .028, m.rubber, 0, -.062 - i * .014, .024 + i * .006, -.28); };

    /* ---- pistols: Pip, Wasp (compensator, red dot, long magazine), Quill (suppressor) ---- */
    const pistol = o => {
      len = o.supp ? .37 : o.comp ? .236 : .207; port = [.012, .05, -.045]; sight = o.rdot ? .07 : .058; pistolHold = true;
      side([[-.175, .015], [-.175, -.006], [-.09, -.006], [-.083, -.046], ['q', -.081, -.056, -.069, -.056], [-.02, -.056], ['q', -.008, -.056, -.005, -.044], [.022, -.116], ['q', .024, -.124, .034, -.124], [.058, -.122], ['q', .068, -.12, .066, -.108], ['q', .058, -.06, .045, -.028], [.056, -.012], [.066, .002], [.048, .015]], .028, m.fin, 0, .006,
        [[[-.075, -.012], [-.075, -.043], ['q', -.075, -.049, -.069, -.049], [-.022, -.049], ['q', -.014, -.049, -.014, -.04], [-.016, -.012]]]);
      side([[.002, -.032], [.03, -.106], [.056, -.106], ['q', .05, -.062, .036, -.03]], .0312, m.poly, 0, .003);   // grip panels
      side([[-.04, -.014], [-.047, -.04], [-.041, -.043], [-.034, -.016]], .007, m.steel, 0, .0015);   // trigger
      rail(-.168, -.095, -.012, .02); pin(.004, -.03, .028); pin(.004, .012, .028); rbox(.004, .007, .026, m.steel, -.0148, .02, -.01, .002);
      if (o.light) { rbox(.025, .024, .052, m.poly, 0, -.029, -.14, .006); disc(.0085, 0, -.029, -.1665, m.lamp); ring(.0095, .0018, -.166, m.steel, -.029); rbox(.006, .008, .012, m.acc, .0135, -.03, -.12, .002); }
      lathe([[-.207, .005], [-.207, .0092], [-.19, .0092]], m.steel, .034); disc(.005, 0, .034, -.2075, m.rubber);
      if (o.supp) muzzle('supp', -.37, .034, .0092, .168);
      T = parts.slide = group(0, 0, 0);
      side([[-.2, .017], [-.2, .044], ['q', -.2, .053, -.19, .053], [.03, .053], [.043, .044], [.043, .017]], .03, m.metal, 0, .005);
      for (let i = 0; i < 6; i++) box(.0312, .024, .0026, m.dark, 0, .033, .032 - i * .0068, 0, 0, 0); for (let i = 0; i < 4; i++) box(.0312, .018, .0026, m.dark, 0, .036, -.157 - i * .0068);
      rbox(.014, .003, .036, m.rubber, .004, .0532, -.045, .001); rbox(.012, .0025, .09, m.dark, 0, .054, -.12, .001);
      rbox(.005, .008, .008, m.dark, 0, .058, -.19, .0015); add(new THREE.SphereGeometry(.0018, 6, 6), m.tritium, 0, .0595, -.1858);
      if (o.rdot) { rbox(.024, .008, .036, m.dark, 0, .0565, -.008, .003); frame(.028, .026, .072, .0032, -.026, .006, m.dark); box(.02, .016, .001, m.glass, 0, .0715, -.02); add(new THREE.SphereGeometry(.0009, 6, 6), m.red, 0, .0715, -.019); }
      else { rbox(.021, .009, .008, m.dark, 0, .058, .03, .0015); for (const sx of [-.0058, .0058]) add(new THREE.SphereGeometry(.0018, 6, 6), m.tritium, sx, .059, .0343); }
      if (o.comp) { rbox(.031, .037, .034, m.dark, 0, .034, -.2185, .006); for (let i = 0; i < 3; i++) rbox(.013, .004, .006, m.rubber, 0, .0528, -.209 - i * .009, .001); disc(.0055, 0, .034, -.236, m.rubber); }
      decal(o.name, o.sub, .07, .0175, .0155, .03, -.105);
      T = parts.mag = group(0, -.062, .027, -.25);
      rbox(.02, o.ext ? .15 : .1, .032, m.dark, 0, o.ext ? -.025 : 0, 0, .003); rbox(.031, .013, .044, o.ext ? m.acc : m.poly, 0, o.ext ? -.106 : -.057, .003, .004);
      T = G; sup = [-.016, -.1, .03];
    };

    /* ---- long guns with a receiver, handguard, pistol grip and stock: Gnat, Hornet, Mako, Paladin, Vesper, Lancer, Torrent ---- */
    const carbine = o => {
      const BY = .03, rf = o.rf == null ? -.2 : o.rf, rb = .13, top = .058, hz = o.hz, hw = o.wide ? .031 : .023; len = o.len; port = [hw, .03, -.02]; sight = o.sightY;
      // upper receiver, with its ejection port and brass deflector
      side([[rf - .006, .022], [rf, top], [rb - .012, top], [rb, top - .014], [rb, .002], [rf, .002]], hw * 2, o.upper || m.metal, 0, .006);
      rbox(.003, .019, .056, m.rubber, hw - .0005, .03, -.02, .003); side([[.012, .02], [.03, .02], [.036, .034], [.022, .04]], .012, m.metal, hw - .003, .003);
      // lower receiver: magazine well, a real trigger guard, in the gun's own finish
      side([[rf + .02, .004], [rb, .004], [rb, -.022], [.03, -.03], [.012, -.034], [.004, -.07], [-.062, -.07], ['q', -.071, -.07, -.071, -.06], [-.074, -.034], [-.086, -.034], [-.092, -.072], [-.162, -.068], [-.168, -.03], [rf + .02, -.022]], hw * 2 - .003, o.lower || m.fin, 0, .006,
        [[[-.064, -.04], [-.064, -.057], ['q', -.064, -.063, -.058, -.063], [-.005, -.063], ['q', .001, -.063, .001, -.056], [-.001, -.04]]]);
      side([[-.03, -.036], [-.037, -.055], [-.031, -.058], [-.024, -.038]], .008, m.steel, 0, .0015);
      pin(-.012, .07, hw * 2); pin(-.012, -.07, hw * 2); pin(-.02, .0, hw * 2, .003); rbox(.004, .007, .022, m.steel, -hw + .001, -.013, .034, .002, -.4); add(new THREE.CylinderGeometry(.005, .005, .004, 10), m.steel, hw - .001, -.016, -.058, 0, 0, Math.PI / 2);
      pistolGrip();
      // handguard
      const hb = o.hg === 'oct' ? BY - .033 : o.hg === 'round' ? BY - .03 : -.032;
      if (o.hg === 'oct') { hull(oct(.05, .064, BY - .001, .015), hz, rf, o.hgMat || m.fin); for (let z = hz + .03; z < rf - .03; z += .045) for (const sx of [-1, 1]) { rbox(.004, .012, .028, m.rubber, sx * .0245, BY - .001, z, .002); rbox(.004, .01, .026, m.rubber, sx * .019, BY - .0275, z, .002, 0, sx * .78); } }
      else if (o.hg === 'round') { tube(.03, hz, rf, o.hgMat || m.fin, BY, 0, 20); ring(.03, .003, hz + .004, m.dark, BY); ring(.03, .003, rf - .004, m.dark, BY); for (let z = hz + .03; z < rf - .02; z += .042) for (let a = 0; a < 6; a++) { const t = a / 6 * TAU + .52; add(new THREE.CylinderGeometry(.006, .006, .004, 8), m.rubber, Math.cos(t) * .0295, BY + Math.sin(t) * .0295, z, 0, 0, t - Math.PI / 2); } }
      else if (o.hg === 'shroud') { tube(.031, hz, rf, m.heat, BY, 0, 18); ring(.031, .0035, hz + .004, m.dark, BY); ring(.031, .0035, rf - .004, m.dark, BY); }
      else { side([[rf, top - .004], [hz + .024, top - .004], [hz, top - .024], [hz, -.016], [hz + .02, -.032], [rf, -.032]], .052, o.hgMat || m.fin, 0, .008); for (let z = hz + .04; z < rf - .03; z += .048) for (const sx of [-1, 1]) rbox(.004, .012, .03, m.rubber, sx * .0258, .012, z, .002); }
      if (o.glow !== false) for (const sx of [-1, 1]) rbox(.0025, .005, (rf - hz) * .7, m.glow, sx * (o.hg === 'slab' ? .0262 : o.hg === 'oct' ? .0252 : .0302), o.hg === 'oct' ? BY - .016 : o.hg === 'slab' ? -.014 : BY, (hz + rf) / 2, .001);
      rail(o.hg === 'round' || o.hg === 'shroud' ? rf : hz + .012, rb - .016, top + .0035, hw > .03 ? .03 : .028);
      // barrel and muzzle
      const br = o.br || .011, mz = -len, tipL = o.tip === 'supp' ? o.sl : o.tip === 'brake' ? .068 : o.tip === 'flash' ? .05 : 0;
      if (mz + tipL < hz) { tube(br, mz + tipL - .004, hz, m.steel, BY); if (hz - mz - tipL > .1) { rbox(.022, .03, .028, m.dark, 0, BY + .006, hz - .05, .005); rbox(.008, .014, .012, m.dark, 0, BY + .026, hz - .05, .002); } }
      muzzle(o.tip, mz, BY, br, o.sl);
      // stock
      const sb = rb;
      if (o.stock === 'ar') { tube(.0145, sb, sb + .2, m.metal, .026); side([[sb + .07, .052], [sb + .28, .056], [sb + .295, .05], [sb + .3, -.066], [sb + .286, -.078], [sb + .22, -.05], ['q', sb + .13, -.014, sb + .07, .0]], .04, m.poly, 0, .009, [[[sb + .19, .012], [sb + .25, -.03], [sb + .268, -.022], [sb + .268, .02]]]); rbox(.043, .13, .016, m.rubber, 0, -.01, sb + .303, .006); rbox(.03, .014, .1, o.cheek || m.fin, 0, .063, sb + .19, .005); }
      else if (o.stock === 'skel') { tube(.012, sb, sb + .27, m.metal, .034); side([[sb + .02, -.012], [sb + .27, -.062], [sb + .27, -.048], [sb + .02, .002]], .014, m.metal, 0, .004); rbox(.03, .135, .02, m.rubber, 0, -.008, sb + .28, .007); rbox(.026, .016, .12, o.cheek || m.fin, 0, .05, sb + .17, .006); }
      else if (o.stock === 'wire') { for (const sx of [-.016, .016]) tube(.0034, sb - .04, sb + (o.short ? .1 : .18), m.steel, .006, sx, 8); rbox(.04, .02, .024, m.metal, 0, .006, sb + .008, .005); rbox(.042, .07, .014, m.rubber, 0, -.008, sb + (o.short ? .104 : .184), .006); }
      else if (o.stock === 'fixed') { side([[sb, .05], [sb + .25, .058], [sb + .27, .05], [sb + .27, -.068], [sb + .25, -.076], [sb + .13, -.05], ['q', sb + .05, -.03, sb, -.02]], .042, m.poly, 0, .009, [[[sb + .06, .03], [sb + .06, -.008], [sb + .19, -.042], [sb + .23, -.03], [sb + .23, .034]]]); rbox(.046, .13, .016, m.rubber, 0, -.008, sb + .277, .006); }
      else if (o.stock === 'thumb') { side([[sb, .042], [sb + .03, .05], [sb + .29, .054], [sb + .31, .046], [sb + .31, -.07], [sb + .29, -.08], [sb + .14, -.07], ['q', sb + .1, -.07, sb + .08, -.04], ['q', sb + .04, -.03, sb, -.024]], .044, o.cheek || m.fin, 0, .01, [[[sb + .1, .022], [sb + .12, -.04], [sb + .2, -.048], [sb + .22, .024]]]); rbox(.048, .13, .016, m.rubber, 0, -.012, sb + .317, .006); }
      else if (o.stock === 'heavy') { side([[sb, .05], [sb + .27, .062], [sb + .29, .054], [sb + .29, -.074], [sb + .27, -.08], [sb + .2, -.07], ['q', sb + .1, -.05, sb, -.03]], .05, m.poly, 0, .01); rbox(.054, .14, .016, m.rubber, 0, -.008, sb + .297, .006); rbox(.02, .01, .1, m.steel, 0, .07, sb + .16, .004); }
      // what the support hand holds
      if (o.fore === 'vgrip') { const z = lp(hz, rf, .42); vtube(.0155, hb - .09, hb + .004, m.poly, 0, z, .019); vtube(.0195, hb - .098, hb - .088, m.acc, 0, z); for (let i = 0; i < 3; i++) ring(.0172, .0016, z, m.rubber, hb - .03 - i * .018).rotation.x = Math.PI / 2; sup = [0, hb - .05, z]; }
      else if (o.fore === 'angled') { const z = lp(hz, rf, .45); side([[z - .05, hb + .004], [z + .04, hb + .004], [z + .01, hb - .034], [z - .022, hb - .034]], .03, m.poly, 0, .006); sup = [0, hb - .028, z - .005]; }
      else sup = [0, hb - .012, lp(hz, rf, .45)];
      // sight
      if (o.sight === 'holo') holo(-.045, top + .008); else if (o.sight === 'prism') prism(-.02, top + .008, false); else if (o.sight === 'dmr') prism(-.02, top + .008, true);
      if (o.backup !== false) { rbox(.02, .014, .012, m.dark, 0, top + .016, hz + .03, .002); rbox(.004, .012, .004, m.dark, 0, top + .028, hz + .03, .001); rbox(.022, .014, .014, m.dark, 0, top + .016, rb - .03, .002); }
      if (o.counter) counter(.03, .06, hw);
      if (o.laser) { rbox(.02, .024, .052, m.poly, -.038, BY, hz + .09, .004); disc(.007, -.038, BY + .004, hz + .0635, m.red); disc(.005, -.038, BY - .006, hz + .0635, m.lamp); rbox(.012, .01, .02, m.dark, -.03, BY, hz + .09, .002); }
      // charging handle (moves when you rack it) and the magazine (comes out when you reload)
      T = parts.bolt = group(0, 0, 0); if (o.sideHandle) { rbox(.012, .012, .03, m.steel, -hw - .004, .032, .0, .003); rbox(.016, .01, .01, o.lower || m.fin, -hw - .012, .032, -.012, .003); } else { rbox(.034, .008, .022, m.dark, 0, top + .003, rb - .006, .002); rbox(.056, .008, .01, m.dark, 0, top + .003, rb + .002, .002); }
      T = parts.mag = group(0, -.058, -.127);
      if (o.mag === 'curve') { const c = o.curve || .03; side([[.024, .03], [-.024, .03], ['q', -.026, -.06, -.024 - c, -.14], [.02 - c, -.15], ['q', .03, -.06, .024, .03]], hw * 2 - .016, o.magMat || m.poly, 0, .005); for (let i = 0; i < 4; i++) box(hw * 2 - .014, .0035, .046, m.rubber, 0, -.02 - i * .03, -c * (i + .6) / 4.6, c * 3 * (i + 1) / 4); rbox(hw * 2 - .01, .012, .052, m.acc, 0, -.15, -c - .002, .004, c * 5); }
      else if (o.mag === 'stick') { rbox(.026, o.magL || .16, .034, m.poly, 0, -(o.magL || .16) / 2 + .03, 0, .004); for (let i = 0; i < 4; i++) box(.028, .003, .036, m.rubber, 0, -.01 - i * .03, 0); rbox(.03, .012, .04, m.acc, 0, -(o.magL || .16) + .028, 0, .004); }
      else if (o.mag === 'short') { rbox(.03, .085, .054, m.poly, 0, -.012, 0, .005); rbox(.034, .012, .058, m.acc, 0, -.058, 0, .004); for (let i = 0; i < 2; i++) box(.032, .003, .056, m.rubber, 0, -.0 - i * .025, 0); }
      else if (o.mag === 'box') { rbox(.064, .1, .125, m.poly, 0, -.02, .0, .008); rbox(.066, .014, .127, m.acc, 0, .012, 0, .004); rbox(.03, .02, .03, m.metal, 0, .04, 0, .004); for (let i = 0; i < 4; i++) vtube(.0046, .034, .064, m.brass, -.028 + i * .0, -.03 + i * .011); }
      T = G;
    };

    /* ---- shotguns: Breaker (pump, wood, a saddle of spare shells) and Thresher (automatic, drum) ---- */
    const shotgun = o => {
      const BY = .03; len = o.len; port = [.024, .028, -.03]; sight = o.auto ? .09 : .068;
      side([[-.15, .03], [-.14, .054], [.1, .054], ['q', .128, .052, .13, .03], [.13, -.024], [.03, -.03], [.012, -.034], [.004, -.07], [-.062, -.07], ['q', -.071, -.07, -.071, -.06], [-.074, -.03], [-.15, -.03]], .046, o.auto ? m.fin : m.metal, 0, .007, [[[-.064, -.04], [-.064, -.057], ['q', -.064, -.063, -.058, -.063], [-.005, -.063], ['q', .001, -.063, .001, -.056], [-.001, -.04]]]);
      side([[-.03, -.036], [-.037, -.055], [-.031, -.058], [-.024, -.038]], .008, m.steel, 0, .0015); rbox(.003, .018, .058, m.rubber, .0226, .026, -.03, .003); pin(-.01, .07, .046); pin(-.01, -.09, .046);
      tube(.019, -len + .01, -.14, m.steel, BY, 0, 18); muzzle(o.auto ? 'brake' : 'crown', -len, BY, o.auto ? .016 : .019);
      rbox(.03, .01, .3, m.heat, 0, BY + .024, -len + .22, .004); add(new THREE.SphereGeometry(.0042, 8, 6), m.glow, 0, BY + .026, -len + .03);
      if (o.auto) {
        side([[-.15, .05], [-.4, .05], [-.42, .036], [-.42, -.03], [-.4, -.04], [-.15, -.04]], .054, m.poly, 0, .008); for (let z = -.36; z < -.18; z += .045) for (const sx of [-1, 1]) rbox(.004, .014, .028, m.rubber, sx * .027, .004, z, .002);
        rail(-.4, .1, .058); for (const sx of [-.009, .009]) rbox(.004, .02, .006, m.dark, sx, .074, .08, .001); ring(.008, .0022, .08, m.dark, .086); pistolGrip();
        side([[.13, .05], [.36, .06], [.38, .052], [.38, -.07], [.36, -.078], [.24, -.05], ['q', .16, -.03, .13, -.02]], .044, m.poly, 0, .009, [[[.18, .028], [.2, -.012], [.31, -.04], [.33, .03]]]); rbox(.048, .13, .016, m.rubber, 0, -.008, .387, .006);
        decal('THRESHER', '12 GA · AUTO', .12, .03, .0236, .02, -.06);
        T = parts.mag = group(0, -.1, -.115); add(new THREE.CylinderGeometry(.064, .064, .05, 26), m.poly, 0, -.022, 0, 0, 0, Math.PI / 2); for (const sx of [-.0255, .0255]) { add(new THREE.TorusGeometry(.05, .004, 6, 26), m.acc, sx, -.022, 0, 0, Math.PI / 2, 0); add(new THREE.CylinderGeometry(.02, .02, .003, 14), m.dark, sx * 1.02, -.022, 0, 0, 0, Math.PI / 2); } rbox(.03, .06, .042, m.poly, 0, .04, 0, .004); T = G; sup = [0, -.058, -.3];
      } else {
        tube(.0165, -len + .09, -.14, m.metal, BY - .04, 0, 16); lathe([[-len + .074, .008], [-len + .074, .018], [-len + .09, .018]], m.dark, BY - .04);
        for (const z of [-len + .11, -.2]) rbox(.026, .07, .014, m.dark, 0, BY - .02, z, .006);
        for (const sx of [-.009, .009]) rbox(.004, .018, .006, m.dark, sx, .062, .1, .001); ring(.008, .0022, .1, m.dark, .074);
        // wooden stock with a pistol-grip wrist, and a rubber pad
        side([[.12, .04], [.2, .044], [.44, .05], [.45, .04], [.45, -.098], [.43, -.104], [.3, -.076], ['q', .2, -.05, .15, -.062], ['q', .11, -.075, .07, -.118], [.03, -.118], ['q', .02, -.08, .03, -.03], [.12, -.024]], .046, m.fin, 0, .011); rbox(.05, .15, .018, m.rubber, 0, -.028, .458, .006);
        // shells on the side
        rbox(.006, .044, .104, m.dark, -.0258, .008, -.03, .002); for (let i = 0; i < 4; i++) { const sz = -.066 + i * .024; vtube(.0095, -.012, .03, m.shell, -.0338, sz); vtube(.0098, -.02, -.01, m.brass, -.0338, sz); }
        decal('BREAKER', '12 GA · PUMP', .13, .032, .0236, .012, -.005);
        T = parts.pump = group(0, 0, 0); hull(oct(.056, .058, BY - .04, .016), -.46, -.24, m.fin, .004); for (let i = 0; i < 7; i++) for (const sx of [-1, 1]) rbox(.004, .03, .012, m.rubber, sx * .0285, BY - .04, -.43 + i * .028, .002); T = G; sup = [0, -.052, -.35];
      }
    };

    /* ---- bolt-action rifles: Kite (light, one-piece stock) and Longbow (heavy chassis, fluted barrel, bipod) ---- */
    const boltgun = o => {
      const BY = .03, big = o.big; len = o.len; port = [.03, .04, .03]; sight = .11;
      lathe([[-.24, .012], [-.24, big ? .0235 : .0205], [.1, big ? .0235 : .0205], [.12, .014], [.12, .008]], m.metal, BY, 0, 20); rbox(.002, .014, .07, m.rubber, big ? .0228 : .0198, BY + .004, .02, .002);
      if (big) {
        side([[-.56, .008], [-.56, -.038], [-.24, -.046], [.02, -.04], [.012, -.034], [.004, -.07], [-.062, -.07], ['q', -.071, -.07, -.071, -.06], [-.074, -.034], [-.23, -.03], [-.23, .012]], .056, m.fin, 0, .008, [[[-.064, -.04], [-.064, -.057], ['q', -.064, -.063, -.058, -.063], [-.005, -.063], ['q', .001, -.063, .001, -.056], [-.001, -.04]]]);
        side([[.0, .016], [.13, .016], [.2, .05], [.5, .058], [.52, .05], [.52, -.094], [.5, -.102], [.3, -.08], ['q', .26, -.02, .2, -.02], [.14, -.03], [.06, -.118], [.03, -.118], ['q', .02, -.08, .024, -.034], [.0, -.03]], .05, m.fin, 0, .011, [[[.1, -.01], [.07, -.09], [.2, -.062], ['q', .22, -.02, .16, -.006]]]);
        rbox(.054, .15, .018, m.rubber, 0, -.022, .528, .006); rbox(.05, .022, .15, m.acc, 0, .068, .37, .008); vtube(.007, -.16, -.1, m.dark, 0, .44); vtube(.012, -.168, -.158, m.rubber, 0, .44);
        lathe([[-.95, .0155], [-.56, .0185], [-.24, .0205]], m.steel, BY, 0, 16); for (let a = 0; a < 6; a++) { const t = a / 6 * TAU; box(.0035, .0035, .5, m.dark, Math.cos(t) * .0178, BY + Math.sin(t) * .0178, -.6); }
        muzzle('brake', -len, BY, .0155); for (const sx of [-.014, .014]) { tube(.0045, -.76, -.54, m.poly, -.055, sx, 8); rbox(.009, .012, .02, m.rubber, sx, -.055, -.765, .003); } rbox(.036, .02, .03, m.dark, 0, -.046, -.53, .004);
        for (let z = -.5; z < -.28; z += .05) for (const sx of [-1, 1]) rbox(.004, .012, .03, m.rubber, sx * .028, -.012, z, .002);
        rail(-.2, .1, .054, .026); scope(-.34, .17, .112, .024, .037); decal('LONGBOW', '.338 · BOLT', .13, .033, .0285, -.014, -.42); sup = [0, -.05, -.42];
      } else {
        side([[-.5, .01], [-.5, -.028], [-.3, -.036], [.02, -.036], [.01, -.04], [.004, -.07], [-.062, -.07], ['q', -.071, -.07, -.071, -.06], [-.074, -.036], [-.2, -.03], [-.2, .012]], .048, m.fin, 0, .01, [[[-.064, -.042], [-.064, -.057], ['q', -.064, -.063, -.058, -.063], [-.005, -.063], ['q', .001, -.063, .001, -.056], [-.001, -.042]]]);
        side([[.0, .014], [.12, .014], [.17, .042], [.43, .034], [.45, .026], [.45, -.092], [.43, -.098], [.25, -.06], ['q', .16, -.04, .12, -.06], ['q', .09, -.09, .07, -.116], [.03, -.116], ['q', .018, -.08, .024, -.036], [.0, -.034]], .046, m.fin, 0, .012);
        rbox(.05, .13, .016, m.rubber, 0, -.03, .457, .006); lathe([[-.95, .0115], [-.5, .0135], [-.24, .017]], m.steel, BY, 0, 14); muzzle('crown', -len, BY, .0115);
        scope(-.25, .11, .104, .02, .028); decal('KITE', '.308 · BOLT', .1, .025, .0245, -.012, -.3); sup = [0, -.044, -.34];
      }
      side([[-.03, -.038], [-.037, -.055], [-.031, -.058], [-.024, -.04]], .008, m.steel, 0, .0015);
      T = parts.boltL = group(0, BY, big ? .07 : .06); parts.boltL.userData.z0 = big ? .07 : .06;
      tube(big ? .0148 : .013, 0, .055, m.steel, 0); add(new THREE.CylinderGeometry(.0052, .0046, .06, 8), m.steel, .036, 0, .04, 0, 0, Math.PI / 2); add(new THREE.SphereGeometry(big ? .0135 : .011, 12, 10), m.dark, .07, 0, .04);
      T = parts.mag = group(0, big ? -.068 : -.05, -.11); rbox(big ? .036 : .03, big ? .07 : .034, big ? .08 : .062, m.poly, 0, 0, 0, .005); rbox(big ? .04 : .034, .012, big ? .084 : .066, m.acc, 0, big ? -.04 : -.02, 0, .004);
      T = G;
    };

    if (k === 'pip') pistol({ light: 1, name: 'PIP', sub: 'DP-9 · 12 RD' });
    else if (k === 'wasp') pistol({ comp: 1, ext: 1, rdot: 1, name: 'WASP', sub: 'AUTO · 13 RD' });
    else if (k === 'quill') pistol({ supp: 1, name: 'QUILL', sub: 'SUPPRESSED · 15' });
    else if (k === 'stub') {   // sawn-off double: two short barrels that break open, a wooden forend and a bird's-head grip
      len = .36; port = null; sight = .06; pistolHold = true;
      side([[-.07, .052], [.04, .052], ['q', .062, .046, .058, .02], [.048, -.004], [-.07, -.004]], .058, m.metal, 0, .008);
      side([[-.075, .016], [-.24, .016], ['q', -.252, .004, -.238, -.02], [-.075, -.024]], .05, m.fin, 0, .01);
      side([[.004, -.002], [.05, .004], ['q', .1, -.026, .094, -.096], ['q', .09, -.126, .062, -.12], ['q', .034, -.114, .03, -.07], [.018, -.03]], .036, m.fin, 0, .012);
      guardLoop(-.035, -.006); for (const sx of [-.011, .011]) side([[.03, .05], [.044, .072], [.052, .066], [.042, .05]], .008, m.steel, sx, .002); pin(.02, -.05, .058, .005);
      decal('STUB', '12 GA · 2 RD', .07, .0175, .0292, .03, -.008);
      T = parts.brk = group(0, .02, -.06);
      for (const sx of [-.0148, .0148]) { lathe([[-.3, .0098], [-.3, .0152], [-.29, .0158], [-.02, .0158], [0, .0145], [0, .008]], m.steel, .012, sx, 16); disc(.0098, sx, .012, -.3005, m.rubber); }
      rbox(.06, .012, .022, m.dark, 0, .012, -.283, .004); rbox(.005, .007, .262, m.metal, 0, .0295, -.14, .002); add(new THREE.SphereGeometry(.0036, 8, 6), m.brass, 0, .0355, -.29);
      T = G; sup = [-.016, -.1, .03];
    } else if (k === 'hammer') {   // revolver: under-lugged heavy barrel with a vented rib, a fluted cylinder that turns, wooden grip
      len = .27; port = null; sight = .066; pistolHold = true;
      side([[-.066, .052], [.046, .052], ['q', .066, .044, .06, .016], [.056, -.004], [.01, -.008], [-.004, -.03], [-.05, -.03], [-.066, -.006]], .032, m.steel, 0, .007);
      side([[-.272, .012], ['q', -.272, .05, -.26, .05], [-.066, .05], [-.066, -.006], [-.25, -.006], ['q', -.272, -.004, -.272, .012]], .026, m.steel, 0, .007);
      rbox(.012, .008, .2, m.metal, 0, .055, -.165, .002); for (let i = 0; i < 5; i++) rbox(.014, .004, .02, m.rubber, 0, .0555, -.1 - i * .034, .001);
      disc(.0062, 0, .034, -.2725, m.rubber); ring(.009, .002, -.27, m.metal, .034); side([[-.264, .058], [-.25, .07], [-.24, .058]], .005, m.dark, 0, .001); add(new THREE.SphereGeometry(.002, 6, 6), m.acc, 0, .067, -.25); rbox(.016, .008, .012, m.dark, 0, .058, .04, .002);
      side([[.018, .0], [.06, .004], ['q', .1, -.026, .096, -.092], ['q', .092, -.122, .064, -.116], ['q', .036, -.11, .034, -.07], [.02, -.03]], .038, m.fin, 0, .012); add(new THREE.CylinderGeometry(.0045, .0045, .04, 8), m.brass, 0, -.06, .066, 0, 0, Math.PI / 2);
      side([[.044, .05], [.062, .074], [.072, .068], [.058, .048]], .009, m.metal, 0, .002); guardLoop(-.012, -.03); decal('HAMMER', '.44 · 6 RD', .085, .021, .0165, .02, -.16);
      T = parts.cyl = group(0, .022, -.02);
      add(new THREE.CylinderGeometry(.0265, .0265, .054, 24), m.metal, 0, 0, 0, Math.PI / 2); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; add(new THREE.CylinderGeometry(.008, .008, .034, 8), m.dark, Math.cos(a) * .0255, Math.sin(a) * .0255, -.011, Math.PI / 2); }
      T = G; sup = [-.016, -.1, .04];
    }
    else if (k === 'gnat') { carbine({ len: .32, rf: -.16, hz: -.26, hg: 'shroud', br: .0105, tip: 'flash', stock: 'wire', short: 1, mag: 'stick', magL: .13, sight: 'holo', sightY: .099, fore: 'vgrip', backup: false, sideHandle: 1, glow: false }); decal('GNAT', 'SMG · 20 RD', .085, .021, .0236, .02, .05); }
    else if (k === 'hornet') { carbine({ len: .52, rf: -.18, hz: -.27, hg: 'slab', hgMat: m.poly, upper: m.fin, lower: m.poly, br: .0115, tip: 'supp', sl: .25, stock: 'wire', mag: 'stick', magL: .17, sight: 'holo', sightY: .099, counter: 1, backup: false, sideHandle: 1 }); decal('HORNET', 'SMG · 30 RD', .1, .025, .0236, .028, .06); }
    else if (k === 'mako') { carbine({ len: .7, hz: -.47, hg: 'round', br: .0115, tip: 'flash', stock: 'fixed', mag: 'curve', curve: .02, sight: 'prism', sightY: .1 }); decal('MAKO', 'BURST · 24 RD', .1, .025, .0236, .028, .06); }
    else if (k === 'paladin') { carbine({ len: .9, hz: -.56, hg: 'oct', br: .0105, tip: 'brake', stock: 'thumb', mag: 'short', sight: 'dmr', sightY: .1, backup: false }); decal('PALADIN', 'DMR · 12 RD', .12, .03, .0236, .028, .06); }
    else if (k === 'vesper') { carbine({ len: .84, hz: -.5, hg: 'oct', br: .012, tip: 'supp', sl: .32, stock: 'skel', mag: 'curve', curve: .034, sight: 'holo', sightY: .099, fore: 'angled', counter: 1 }); decal('VESPER', 'SUPPRESSED · 30', .12, .03, .0236, .028, .06); }
    else if (k === 'lancer') { carbine({ len: .79, hz: -.53, hg: 'slab', br: .012, tip: 'brake', stock: 'ar', mag: 'curve', curve: .028, sight: 'holo', sightY: .099, fore: 'vgrip', counter: 1, laser: 1 }); decal('LANCER', 'DP-ARMS · 5.7', .12, .03, .0236, .028, .06); }
    else if (k === 'torrent') { carbine({ len: .95, rf: -.25, hz: -.62, hg: 'shroud', wide: 1, br: .014, tip: 'brake', stock: 'heavy', mag: 'box', sight: 'holo', sightY: .099, counter: 1, sideHandle: 1, glow: false, upper: m.fin, lower: m.metal }); rbox(.016, .012, .16, m.dark, 0, .078, -.44, .004); for (const z of [-.37, -.51]) rbox(.012, .022, .012, m.dark, 0, .068, z, .003); for (const sx of [-.014, .014]) tube(.0045, -.84, -.64, m.poly, -.014, sx, 8); decal('TORRENT', 'LMG · 100 RD', .13, .033, .0316, .028, .06); sup = [0, -.02, -.42]; }
    else if (k === 'breaker') shotgun({ len: .79 });
    else if (k === 'thresher') shotgun({ len: .66, auto: 1 });
    else if (k === 'kite') boltgun({ len: .95 });
    else if (k === 'longbow') boltgun({ len: 1.03, big: 1 });
    else {   // the knife: a clipped blade with a fuller and a lit edge, a guard, a shaped grip, a pommel
      len = .24; port = null; pistolHold = true;
      side([[-.02, .022], [-.165, .022], ['q', -.21, .02, -.242, .003], ['q', -.2, -.01, -.16, -.012], [-.02, -.012]], .006, m.steel, 0, .0022);
      rbox(.0064, .005, .13, m.dark, 0, .012, -.095, .001); rbox(.0066, .0016, .16, m.glow, 0, -.0085, -.105, .0005);
      rbox(.03, .052, .012, m.acc, 0, .005, -.014, .004); side([[-.008, .017], [.03, .02], ['q', .07, .022, .1, .012], [.104, -.014], ['q', .07, -.024, .04, -.016], ['q', .02, -.02, -.008, -.014]], .024, m.poly, 0, .009);
      for (let i = 0; i < 4; i++) rbox(.0255, .034, .004, m.rubber, 0, .0, .014 + i * .021, .002); rbox(.028, .032, .016, m.metal, 0, -.001, .108, .006); decal('DP', 'BLADE', .05, .0125, .0036, .008, -.1);
    }
    if (k === 'pip' || k === 'wasp' || k === 'quill' || k === 'stub' || k === 'hammer' || k === 'knife') pistolHold = true;

    const grip = k === 'knife' ? [0, 0, .045] : k === 'hammer' ? [0, -.055, .052] : k === 'stub' ? [0, -.058, .05] : pistolHold ? [0, -.062, .026] : k === 'breaker' ? [0, -.07, .05] : k === 'kite' || k === 'longbow' ? [0, -.072, .046] : [0, -.076, .026];
    if (opts.hands) {   // your own gloves and sleeves: fingers wrapped round the grip, the other hand under the gun
      const op = OPS[opts.op] || OPS.vex, band = gmats.band[op.col] || (gmats.band[op.col] = new THREE.MeshStandardMaterial({ color: LC(op.col), roughness: .5 }));
      const arm = (par, x, y, z, rx, ry, l) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, 0); par.add(g); const was = T; T = g;
        lathe([[-.03, .03], [-.03, .037], [.0, .04], [.02, .043], [.03, .046], [l, .056], [l, .02]], m.sleeve, 0, 0, 14); lathe([[.012, .0445], [.012, .0475], [.04, .0485], [.04, .046]], band, 0, 0, 14); T = was; };
      const fingers = (n, x, y0, z, w, dy, mat = m.glove) => { for (let i = 0; i < n; i++) rbox(w, .0155, .019, mat, x, y0 - i * dy, z, .0065); };
      T = group(grip[0], grip[1], grip[2], k === 'knife' ? 0 : -.25);
      if (k === 'knife') { rbox(.013, .05, .074, m.glove, .019, -.002, 0, .005); rbox(.013, .04, .07, m.glove, -.018, -.006, 0, .005); for (let i = 0; i < 4; i++) rbox(.042, .017, .0165, m.glove, 0, -.024, -.027 + i * .018, .0065); rbox(.012, .013, .04, m.glove, -.011, .02, -.022, .005); rbox(.006, .024, .04, band, .0265, -.004, .012, .002); arm(T, .006, -.02, .045, 1.1, -.3, .42); }
      else { rbox(.014, .074, .054, m.glove, .0215, 0, .002, .006); rbox(.046, .072, .016, m.glove, .002, 0, .03, .006); fingers(4, -.002, .027, -.029, .05, .0178); rbox(.014, .018, .05, m.glove, -.0215, .032, -.012, .006); rbox(.0065, .03, .034, band, .0292, .004, .008, .002); rbox(.02, .012, .03, m.rubber, .024, .03, .004, .003); arm(T, .01, -.036, .034, .7, -.2, .42); }
      if (k !== 'knife') {
        T = parts.lhand = group(sup[0], sup[1], sup[2], pistolHold ? .3 : 0);
        rbox(.056, .018, .08, m.glove, 0, 0, 0, .007); rbox(.014, .044, .07, m.glove, -.032, .022, 0, .006); for (let i = 0; i < 4; i++) rbox(.012, .034, .0165, m.glove, -.034, .034, -.027 + i * .018, .0055); rbox(.014, .03, .046, m.glove, .032, .016, .006, .006); rbox(.03, .004, .05, m.rubber, 0, -.0105, 0, .002);
        arm(T, -.02, -.012, .034, .5, .55, pistolHold ? .38 : .55);
      }
      T = G;
    }
    bake(G, cast);
    G.userData.len = len; G.userData.port = port; G.userData.sight = sight; G.userData.parts = parts; G.userData.k = k; G.userData.grip = grip; G.userData.sup = sup; G.userData.pistolHold = pistolHold;
    if (opts.flash) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: X.starT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.setScalar(.4); sp.position.set(0, .03, -len - .06); sp.visible = false; G.add(sp); G.userData.flash = sp; }
    return G;
  }
  gmats.band = {};
  function viewGun(k, op) { return gunModel(k, { hands: true, op }); }
  // the armory pictures: each gun rendered side-on into a small transparent image, once
  function gunIcon(k) {
    if (ICON[k] !== undefined) return ICON[k];
    if (!X || !ready) return null;
    try {
      const w = 480, h = 150, r = X.renderer, rt = new THREE.WebGLRenderTarget(w, h); rt.texture.encoding = THREE.sRGBEncoding;
      const sc = new THREE.Scene(), gm = gunModel(k); sc.add(gm); sc.add(new THREE.HemisphereLight('#ffffff', '#5a6270', 1.5));
      const kl = new THREE.DirectionalLight('#fff4e0', 2.6); kl.position.set(3, 4, 1); sc.add(kl); const rl = new THREE.DirectionalLight('#9fd8ff', 2.4); rl.position.set(-3, 2, -1); sc.add(rl);
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
