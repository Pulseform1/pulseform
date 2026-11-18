  /* ---------- 46 bows: four skins on one bow (same size, draw and string travel), their arrows, and the first-person view ----------
     A bow's grip sits at the origin, its limbs run along ±Y in segments that flex toward the archer (+Z) as you draw, and
     the arrow points down -Z. Every skin shares this shape, so what you see in a friend's hands matches what they shoot. */
  const BOW_LOOK = {
    longbow: { L: 1.56, string: '#d9cfb4', fletch: ['#e9e2cf', '#e9e2cf', '#7a2f2a'], head: '#8d9196', shaft: '#9a7b52' },
    cupid: { L: 1.4, string: '#ffe6ee', fletch: ['#f2a7bd', '#f2a7bd', '#c8283c'], head: '#d94a6e', shaft: '#e9d4c8' },
    yardstick: { L: 1.46, string: '#cdb88a', fletch: ['#e8c35a', '#1a1206', '#e8c35a'], head: '#2a2a2a', shaft: '#e8c35a' },
    cashout: { L: 1.42, string: '#e0c050', fletch: ['#6aa35a', '#6aa35a', '#d4af37'], head: '#d4af37', shaft: '#3d6b3a' },
  };
  /* The other bows are built from a recipe: kind (the limb shape), colours (col, and col2 for stripes), finish (metal, rough,
     opacity, glow), deco (something on every other segment), tip (what sits on each end), grip and string colours, and the
     arrow and trail colours (filled in from the recipe when not given). */
  const GEN = {
    partypopper: { kind: 'round', col: '#ff5fa2', col2: '#ffd23a', stripes: 1, deco: 'streamer', decoCol: '#4fc3ff', tip: 'hat', tipCol: '#7b5cff', grip: '#ffffff', string: '#ffffff' },
    pocketsize: { kind: 'tube', th: 1.5, col: '#2fb5ff', deco: 'button', decoCol: '#ff3b3b', tip: 'button', tipCol: '#3bd16f', grip: '#ff9f1a', string: '#333333', rough: .35 },
    sugarrush: { kind: 'twist', col: '#ffffff', col2: '#e8202a', stripes: 1, tip: 'lolly', tipCol: '#ff5fa2', grip: '#e8202a', string: '#ffffff', rough: .3 },
    skyfloat: { kind: 'beads', col: '#ff4d6d', palette: ['#ff4d6d', '#ffd23a', '#4fc3ff', '#7ee36b', '#b06bff', '#ff9f1a'], tip: 'balloon', tipCol: '#ff4d6d', grip: '#f4f4f4', string: '#ffffff', rough: .2 },
    bitbow: { kind: 'blocks', col: '#e83a3a', col2: '#ffffff', stripes: 1, tip: 'cube', tipCol: '#ffd23a', grip: '#333333', string: '#ffffff', flat: 1 },
    bubbleburst: { kind: 'beads', col: '#bfe9ff', opacity: .45, rough: .05, metal: .2, tip: 'orb', tipCol: '#e6f7ff', grip: '#c0c6cc', string: '#e6f7ff', iri: 1 },
    blossom: { kind: 'twist', col: '#4caf3c', deco: 'flower', decoCol: '#ff7eb6', tip: 'flower', tipCol: '#ff7eb6', grip: '#6b4a2c', string: '#c8e6a0' },
    gloop: { kind: 'beads', col: '#8fe03a', opacity: .78, glow: '#2f6a00', rough: .15, tip: 'drip', tipCol: '#8fe03a', grip: '#3a7a1a', string: '#c8ff8a' },
    beekeeper: { kind: 'round', th: 1.2, col: '#ffc21a', col2: '#1a1a1a', stripes: 1, tip: 'bee', tipCol: '#ffc21a', grip: '#e09a1a', string: '#3a2a10' },
    origami: { kind: 'facet', col: '#f7f5ef', col2: '#e2ddd0', stripes: 1, tip: 'crane', tipCol: '#ff6b6b', grip: '#d9d4c7', string: '#9a948a', flat: 1 },
    frostfall: { kind: 'round', col: '#f3f1ea', deco: 'birch', decoCol: '#2a2a2a', tip: 'flake', tipCol: '#dff4ff', grip: '#c8202a', string: '#e6f4ff', scarf: '#c8202a' },
    toonbow: { kind: 'round', th: 1.6, col: '#ff3b30', outline: 1, deco: 'nut', decoCol: '#d0d0d0', tip: 'ball', tipCol: '#ffd23a', grip: '#2a2a2a', string: '#111111', rough: .4 },
    hexbow: { kind: 'twist', col: '#5b2a86', col2: '#3a1a5a', tip: 'bottle', tipCol: '#5cff7a', grip: '#2a1a3a', string: '#b9ff9a', glowTip: 1 },
    rootbind: { kind: 'twist', col: '#6b4a2c', deco: 'thorn', decoCol: '#3a2a1a', tip: 'leaf', tipCol: '#5cb83a', grip: '#4a3020', string: '#8aa060' },
    dune: { kind: 'blade', col: '#d8b97a', deco: 'inlay', decoCol: '#2fc4b2', tip: 'scarab', tipCol: '#e8b730', grip: '#8a5a2a', string: '#f0e0b0', metalTip: 1 },
    frostbite: { kind: 'crystal', col: '#9fdcff', opacity: .72, glow: '#1a5a88', rough: .08, deco: 'shard', decoCol: '#dff6ff', tip: 'spike', tipCol: '#dff6ff', grip: '#6fb6e0', string: '#e6f8ff', flat: 1 },
    emberwood: { kind: 'round', col: '#1e1a18', deco: 'ember', decoCol: '#ff6a1a', tip: 'flame', tipCol: '#ff8a1a', grip: '#3a2a20', string: '#ffb070', glowTip: 1 },
    gorgon: { kind: 'round', col: '#3f7a5a', col2: '#6f8a3a', stripes: 1, metal: .45, rough: .45, deco: 'scale', decoCol: '#2c5a40', tip: 'snake', tipCol: '#4f9a6a', grip: '#8a6a2a', string: '#c8d8a0' },
    discofever: { kind: 'facet', col: '#d9dde3', metal: 1, rough: .12, deco: 'gem', decoCol: '#ff5ac8', rainbow: 1, tip: 'disco', tipCol: '#e6e9ee', grip: '#9b5cff', string: '#ff9be6', flat: 1 },
    galeforce: { kind: 'blade', col: '#f4f8fa', col2: '#3fc4c4', stripes: 1, deco: 'feather', decoCol: '#ffffff', tip: 'wing', tipCol: '#ffffff', grip: '#2a9a9a', string: '#bff4f0' },
    skyrocket: { kind: 'tube', col: '#e8202a', col2: '#ffffff', stripes: 1, metal: .5, rough: .3, tip: 'fin', tipCol: '#e8202a', grip: '#9aa3ad', string: '#dddddd' },
    thunderclap: { kind: 'blade', col: '#2a2f38', metal: .8, rough: .3, deco: 'bolt', decoCol: '#ffe23a', tip: 'bolt', tipCol: '#ffe23a', grip: '#14171c', string: '#fff59a', glowTip: 1 },
    spectral: { kind: 'round', col: '#8fe6ff', opacity: .42, glow: '#3fbfff', tip: 'wisp', tipCol: '#c8f4ff', grip: '#5fa8c8', string: '#c8f4ff', glowTip: 1 },
    magmacore: { kind: 'blocks', col: '#1a1614', col2: '#2a2220', stripes: 1, deco: 'ember', decoCol: '#ff5a1a', tip: 'flame', tipCol: '#ff7a1a', grip: '#3a1a10', string: '#ff9a50', glowTip: 1, flat: 1 },
    arrowstorm: { kind: 'blade', col: '#c8ced6', metal: 1, rough: .22, deco: 'ring', decoCol: '#e3b341', tip: 'wing', tipCol: '#ffffff', grip: '#e3b341', string: '#f2e6c0' },
    abductor: { kind: 'tube', col: '#c9ced6', metal: 1, rough: .2, deco: 'light', decoCol: '#5cff7a', tip: 'saucer', tipCol: '#9aa3ad', grip: '#5cff7a', string: '#9affb0', glowTip: 1 },
    midas: { kind: 'round', th: 1.15, col: '#f2c230', metal: 1, rough: .18, deco: 'gem', decoCol: '#d0102a', tip: 'gem', tipCol: '#d0102a', grip: '#b8902a', string: '#ffe680' },
    arcane: { kind: 'round', col: '#18205a', rough: .4, deco: 'rune', decoCol: '#4fe0ff', tip: 'orb', tipCol: '#7fe8ff', grip: '#0c1030', string: '#9ff0ff', glowTip: 1 },
    starfall: { kind: 'round', col: '#0f1a4a', rough: .35, deco: 'star', decoCol: '#ffd23a', tip: 'star', tipCol: '#ffd23a', grip: '#1a2a6a', string: '#ffe8a0', glowTip: 1 },
    voidstring: { kind: 'crystal', col: '#0a0810', glow: '#3a1060', rough: .2, metal: .4, deco: 'vring', decoCol: '#b46bff', tip: 'vring', tipCol: '#b46bff', grip: '#1a1022', string: '#d29bff', glowTip: 1, flat: 1 },
  };
  for (const [k, r] of Object.entries(GEN)) {   // fill in what every bow needs: length, string, arrow colours, trail
    const c2 = r.col2 || r.decoCol || r.tipCol || r.col;
    BOW_LOOK[k] = Object.assign({ L: 1.48, gen: 1, fletch: [r.tipCol || r.col, r.col, c2], head: r.metalTip ? '#e8b730' : r.tipCol || '#8d9196', shaft: r.kind === 'blocks' ? r.col : '#9a7b52' }, r);
  }
  const trailOf = skin => { const L = BOW_LOOK[skin] || BOW_LOOK.longbow; const c = new THREE.Color(L.trailCol || L.decoCol || L.tipCol || L.col || '#fff0c0'); return [c.r * .7 + .3, c.g * .7 + .3, c.b * .7 + .3]; };
  const BMAT = {}; let _UP, _vq, _vu, _vd;
  LAZY.push(() => { _UP = new THREE.Vector3(0, 1, 0); _vq = new THREE.Quaternion(); _vu = new THREE.Vector3(); _vd = new THREE.Vector3(); });
  const bmat = (k, o) => BMAT[k] || (BMAT[k] = std(o));
  const heartShape = s => { const h = new THREE.Shape(); h.moveTo(0, -s); h.bezierCurveTo(-s * 1.6, s * .2, -s * .6, s * 1.25, 0, s * .45); h.bezierCurveTo(s * .6, s * 1.25, s * 1.6, s * .2, 0, -s); return h; };
  const heartGeo = (s, d) => { const g = new THREE.ExtrudeGeometry(heartShape(s), { depth: d, bevelEnabled: true, bevelThickness: d * .4, bevelSize: s * .15, bevelSegments: 2, curveSegments: 10 }); g.translate(0, 0, -d / 2); return g; };
  const ARROW_GEO = {};
  function arrowGeo(skin) {
    if (ARROW_GEO[skin]) return ARROW_GEO[skin];
    const L = BOW_LOOK[skin] || BOW_LOOK.longbow, parts = [], colr = (g, c) => tint(g, () => { const k = new THREE.Color(c).convertSRGBToLinear(); return [k.r, k.g, k.b]; });
    const shaft = new THREE.CylinderGeometry(.0048, .0048, .74, 6); shaft.rotateX(Math.PI / 2); shaft.translate(0, 0, .41); parts.push(colr(shaft, L.shaft));
    let head; if (skin === 'cupid') { head = heartGeo(.022, .008); head.rotateX(Math.PI / 2); head.translate(0, 0, .02); }
    else if (skin === 'yardstick') { head = new THREE.ConeGeometry(.007, .05, 6); head.rotateX(-Math.PI / 2); head.translate(0, 0, .025); }
    else { head = new THREE.ConeGeometry(.011, .07, 4); head.rotateX(-Math.PI / 2); head.translate(0, 0, .035); }
    parts.push(colr(head, L.head));
    for (let k = 0; k < 3; k++) { const f = new THREE.PlaneGeometry(.022, .1); f.translate(.013, 0, 0); f.rotateX(Math.PI / 2); f.rotateZ(k * TAU / 3); f.translate(0, 0, .73); parts.push(colr(f, L.fletch[k])); }
    const nock = new THREE.CylinderGeometry(.006, .006, .015, 6); nock.rotateX(Math.PI / 2); nock.translate(0, 0, .785); parts.push(colr(nock, '#222'));
    return ARROW_GEO[skin] = merge(parts);
  }
  const arrowMat = () => bmat('arrow', { vertexColors: true, roughness: .55, metalness: .25, side: THREE.DoubleSide });
  // an arrow with its head at the origin and its fletching back along +Z
  function makeArrowMesh(skin) { const m = new THREE.Mesh(arrowGeo(skin), arrowMat()); m.castShadow = true; return m; }

  function makeBow(skin) {
    if (BOW_LOOK[skin] && BOW_LOOK[skin].gen) return makeGenBow(skin, BOW_LOOK[skin]);
    const look = BOW_LOOK[skin] || BOW_LOOK.longbow, g = new THREE.Group(), N = 6, half = look.L / 2, grip = .07, segL = (half - grip) / N;
    const rest = [.02, .04, .07, .1, .14, .2], flex = [.05, .08, .12, .15, .19, .24];   // how each segment bends at rest and at full draw
    const limbMat = skin === 'cupid' ? bmat('rose', { color: LC('#e7a68e'), metalness: .85, roughness: .26 }) : skin === 'yardstick' ? bmat('ruler', { map: TEX.ruler, roughness: .6 }) : skin === 'cashout' ? bmat('bills', { map: TEX.bill, roughness: .8 }) : bmat('wood', { map: TEX.bowWood, roughness: .5, color: LC('#7a5238') });
    const segGeo = k => {
      const t = k / N, w0 = lp(1, .55, t), w1 = lp(1, .55, (k + 1) / N);
      if (skin === 'yardstick') { const b = new THREE.BoxGeometry(.05, segL * 1.02, .009); const uv = b.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getY(i) * segL + k * segL) / 1.0, uv.getX(i)); b.translate(0, segL / 2, 0); return b; }
      if (skin === 'cashout') { const b = new THREE.BoxGeometry(.07 * w0, segL * .96, .045 * w0); const uv = b.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i) * .5 + (k % 2) * .5); b.translate(0, segL / 2, 0); return b; }
      const c = new THREE.CylinderGeometry(.017 * w1, .017 * w0, segL * 1.04, 8); c.scale(1, 1, skin === 'cupid' ? .8 : .72); c.translate(0, segL / 2, 0); return c;
    };
    const geos = Array.from({ length: N }, (_, k) => segGeo(k));
    const limbs = [1, -1].map(dir => {
      const base = new THREE.Group(); base.position.y = grip * dir; g.add(base); let parent = base; const nodes = [];
      for (let k = 0; k < N; k++) {
        const node = new THREE.Group(); if (k) node.position.y = segL * dir; parent.add(node);
        const m = new THREE.Mesh(geos[k], limbMat); m.castShadow = true; if (dir < 0) m.scale.y = -1; node.add(m);
        if (skin === 'cupid' && k % 2 === 1) { const h = new THREE.Mesh(heartGeo(.016, .006), bmat('heartP', { color: LC('#d94a6e'), metalness: .4, roughness: .35 })); h.position.set(0, segL * .5 * dir, -.012); h.rotation.y = Math.PI; node.add(h); }
        if (skin === 'yardstick' && k % 2 === 0) { const s = new THREE.Mesh(new THREE.BoxGeometry(.056, .014, .016), bmat('strap', { color: LC('#1d1a17'), roughness: .8 })); s.position.y = segL * .2 * dir; node.add(s); const m2 = new THREE.Mesh(geos[k], limbMat); m2.position.z = -.011; m2.scale.set(.85, dir < 0 ? -1 : 1, 1); node.add(m2); }
        if (skin === 'cashout' && k % 2 === 0) { const band = new THREE.Mesh(new THREE.BoxGeometry(.074, .02, .049), bmat('band', { color: LC('#d8b94a'), roughness: .5 })); band.position.y = segL * .5 * dir; node.add(band); }
        parent = node; nodes.push(node);
      }
      const tip = new THREE.Group(); tip.position.y = segL * dir; parent.add(tip);
      if (skin === 'cupid') { const h = new THREE.Mesh(heartGeo(.036, .012), bmat('heartP', {})); h.rotation.y = Math.PI; h.rotation.z = dir < 0 ? Math.PI : 0; tip.add(h); }
      else if (skin === 'cashout') { const c = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .008, 16), bmat('coin', { map: TEX.coin, metalness: .8, roughness: .3, color: LC('#ffd86a') })); c.rotation.x = Math.PI / 2; tip.add(c); }
      else if (skin === 'longbow') { const n = new THREE.Mesh(new THREE.ConeGeometry(.011, .05, 6), bmat('horn', { color: LC('#e2d6bc'), roughness: .4 })); n.position.y = .02 * dir; if (dir < 0) n.rotation.z = Math.PI; tip.add(n); }
      return { dir, nodes };
    });
    // the grip
    const gripMat = skin === 'cashout' ? bmat('gold', { color: LC('#d4af37'), metalness: 1, roughness: .22 }) : skin === 'yardstick' ? bmat('tape', { color: LC('#7d7f80'), roughness: .65 }) : skin === 'cupid' ? bmat('rose', {}) : bmat('grip', { map: TEX.leather, color: LC('#3b2416'), roughness: .8 });
    const gm = new THREE.Mesh(new THREE.CylinderGeometry(.021, .021, grip * 2 + .02, 10), gripMat); gm.scale.z = .85; gm.castShadow = true; g.add(gm);
    if (skin === 'cashout') for (const y of [-grip, grip]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.024, .006, 6, 14), bmat('chrome', { color: LC('#dfe3e8'), metalness: 1, roughness: .15 })); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring); }
    if (skin === 'cupid') { const rib = new THREE.PlaneGeometry(.035, .32, 1, 6); rib.translate(0, -.16, 0); for (const s of [-1, 1]) { const r = new THREE.Mesh(rib, windify(bmat('ribbon', { color: LC('#c8283c'), side: THREE.DoubleSide, roughness: .6 }), 2)); r.position.set(.02 * s, -.02, .02); r.rotation.z = s * .25; g.add(r); } const bow2 = new THREE.Mesh(heartGeo(.028, .01), bmat('heartP', {})); bow2.position.set(0, 0, -.03); bow2.rotation.y = Math.PI; g.add(bow2); }
    // the string: two thin lengths from the tips to the nock point
    const strMat = bmat('str' + skin, { color: LC(look.string), roughness: .6, metalness: skin === 'cashout' ? .7 : 0 });
    const strs = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.0018, .0018, 1, 4), strMat); g.add(m); return m; });
    const arrow = makeArrowMesh(skin); g.add(arrow);
    const tipYZ = (dir, d) => { let y = grip * dir, z = 0, a = 0; for (let k = 0; k < N; k++) { a += rest[k] + d * flex[k]; y += Math.cos(a) * segL * dir; z += Math.sin(a) * segL; } return [y, z]; };
    const B = { g, skin, draw: 0, nockZ: 0, arrow, limbs,
      setDraw(d, nocked) {
        d = cl(d, 0, 1); B.draw = d;
        for (const L of limbs) L.nodes.forEach((n, k) => n.rotation.x = (rest[k] + d * flex[k]) * L.dir);
        const [yu, zu] = tipYZ(1, d), [yl, zl] = tipYZ(-1, d), nz = zu + d * .6; B.nockZ = nz;
        const set = (m, ay, az) => { const dy = -ay, dz = nz - az, L = Math.hypot(dy, dz); m.position.set(0, ay + dy / 2, az + dz / 2); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(_UP, _vd.set(0, dy / L, dz / L)); };
        set(strs[0], yu, zu); set(strs[1], yl, zl);
        arrow.visible = !!nocked; arrow.position.set(-.012, 0, nz - .79);
      },
      nockLocal(v) { return v.set(0, 0, B.nockZ); },
    };
    B.setDraw(0, true);
    return B;
  }


  // ---- recipe bows: the same frame, joints and string as every bow (so draw and aim match), dressed by the recipe
  function makeGenBow(skin, R) {
    const g = new THREE.Group(), N = 6, half = R.L / 2, grip = .07, segL = (half - grip) / N, th = R.th || 1;
    const rest = [.02, .04, .07, .1, .14, .2], flex = [.05, .08, .12, .15, .19, .24];
    const C = c => LC(c), spin = [];
    const M = (key, o) => bmat(skin + key, Object.assign({ roughness: R.rough != null ? R.rough : .5, metalness: R.metal || 0, flatShading: !!R.flat }, o));
    const glowM = (key, col, k = 1) => bmat(skin + key, { color: C(col), emissive: C(col), emissiveIntensity: .9 * k, roughness: .4 });
    const limbM = k => R.palette ? M('p' + (k % R.palette.length), { color: C(R.palette[k % R.palette.length]) }) : R.stripes && k % 2 ? M('l2', { color: C(R.col2) }) : M('l1', { color: C(R.col), transparent: R.opacity != null, opacity: R.opacity != null ? R.opacity : 1, emissive: R.glow ? C(R.glow) : C('#000000'), emissiveIntensity: R.glow ? .8 : 0 });
    const segGeo = k => {
      const w0 = lp(1, .6, k / N), w1 = lp(1, .6, (k + 1) / N); let gm;
      if (R.kind === 'blocks') gm = new THREE.BoxGeometry(.05 * w0 * th, segL * .94, .05 * w0 * th);
      else if (R.kind === 'tube') gm = new THREE.CylinderGeometry(.02 * w1 * th, .02 * w0 * th, segL * 1.02, 12);
      else if (R.kind === 'crystal') { gm = new THREE.CylinderGeometry(.012 * w1, .03 * w0, segL * 1.06, 5); }
      else if (R.kind === 'blade') { gm = new THREE.CylinderGeometry(.008 * w1, .012 * w0, segL * 1.04, 4); gm.scale(5 * w0, 1, 1); }
      else if (R.kind === 'facet') { gm = new THREE.CylinderGeometry(.018 * w1, .028 * w0, segL * 1.04, 3); }
      else if (R.kind === 'beads') { gm = new THREE.SphereGeometry(segL * .55 * lp(1, .75, k / N), 14, 10); gm.scale(1, 1.15, 1); }
      else if (R.kind === 'twist') { const parts = [new THREE.CylinderGeometry(.013 * w1 * th, .017 * w0 * th, segL * 1.04, 8)]; for (let j = 0; j < 4; j++) { const a = (k * 4 + j) * 1.3, b = new THREE.SphereGeometry(.009 * w0 * th, 6, 5); b.translate(Math.cos(a) * .014 * w0, (j / 4 - .5) * segL, Math.sin(a) * .014 * w0); parts.push(b); } gm = merge(parts); }
      else { gm = new THREE.CylinderGeometry(.017 * w1 * th, .017 * w0 * th, segL * 1.04, 10); gm.scale(1, 1, .78); }
      gm.translate(0, segL / 2, 0); return gm;
    };
    const geos = Array.from({ length: N }, (_, k) => segGeo(k));
    // decorations on a segment (in the segment's own frame: +Y along the limb, -Z faces the target)
    const deco = (node, k, dir) => {
      const y = segL * .5 * dir, add = (m, x, yy, z) => { m.position.set(x, yy, z); node.add(m); return m; }, dc = R.decoCol || '#ffffff';
      switch (R.deco) {
        case 'streamer': for (let j = 0; j < 5; j++) { const a = j * 1.2 + k; add(new THREE.Mesh(new THREE.SphereGeometry(.007, 5, 4), M('st' + (j % 3), { color: C(['#4fc3ff', '#ffd23a', '#7ee36b'][j % 3]) })), Math.cos(a) * .028, y + (j - 2) * .012 * dir, Math.sin(a) * .028); } break;
        case 'button': add(new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .01, 14), M('btn', { color: C(dc), roughness: .3 })), 0, y, -.03).rotation.x = Math.PI / 2; break;
        case 'flower': { const fl = new THREE.Group(); for (let j = 0; j < 5; j++) { const pt = new THREE.Mesh(new THREE.SphereGeometry(.009, 6, 4), M('pet', { color: C(dc) })); pt.position.set(Math.cos(j * 1.256) * .012, Math.sin(j * 1.256) * .012, 0); fl.add(pt); } fl.add(new THREE.Mesh(new THREE.SphereGeometry(.007, 6, 4), M('pc', { color: C('#ffd23a') }))); add(fl, k % 4 ? .022 : -.022, y, -.012); } break;
        case 'birch': add(new THREE.Mesh(new THREE.BoxGeometry(.036, .006, .03), M('bir', { color: C(dc) })), 0, y, 0); break;
        case 'nut': { const n = add(new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .012, 6), M('nut', { color: C(dc), metalness: .9, roughness: .3 })), 0, y, -.026); n.rotation.x = Math.PI / 2; } break;
        case 'thorn': for (const sx of [-1, 1]) { const t = add(new THREE.Mesh(new THREE.ConeGeometry(.005, .025, 5), M('thn', { color: C(dc) })), sx * .018, y, 0); t.rotation.z = -sx * Math.PI / 2; } if (k % 2 === 0) add(new THREE.Mesh(new THREE.SphereGeometry(.013, 6, 4), M('lf', { color: C('#5cb83a') })), .02, y + .02 * dir, -.01).scale.set(1.6, .5, 1); break;
        case 'inlay': add(new THREE.Mesh(new THREE.BoxGeometry(.03, segL * .6, .004), M('inl', { color: C(dc), metalness: .3, roughness: .3 })), 0, y, -.008); break;
        case 'shard': { const sh = add(new THREE.Mesh(new THREE.ConeGeometry(.008, .045, 4), M('shd', { color: C(dc), transparent: true, opacity: .8, roughness: .05 })), .02, y, -.01); sh.rotation.z = -1.1; } break;
        case 'ember': add(new THREE.Mesh(new THREE.BoxGeometry(.006, segL * .7, .036), glowM('emb', dc)), 0, y, 0).rotation.y = .4; break;
        case 'scale': for (let j = 0; j < 3; j++) add(new THREE.Mesh(new THREE.SphereGeometry(.01, 6, 4), M('scl', { color: C(dc), metalness: .5, roughness: .4 })), (j - 1) * .012, y, -.016).scale.set(1, 1, .4); break;
        case 'gem': add(new THREE.Mesh(new THREE.OctahedronGeometry(.012), R.rainbow ? glowM('gm' + (k % 3), ['#ff5ac8', '#4fc3ff', '#ffd23a'][k % 3], .7) : M('gem', { color: C(dc), metalness: .3, roughness: .1, emissive: C(dc), emissiveIntensity: .25 })), 0, y, -.024); break;
        case 'feather': { const f = add(new THREE.Mesh(new THREE.PlaneGeometry(.02, .07), M('fth', { color: C(dc), side: THREE.DoubleSide })), .03, y, 0); f.rotation.z = -.9; } break;
        case 'bolt': { const b = add(new THREE.Mesh(new THREE.BoxGeometry(.008, segL * .8, .02), glowM('blt', dc)), 0, y, -.004); b.rotation.z = (k % 2 ? .35 : -.35); } break;
        case 'ring': add(new THREE.Mesh(new THREE.TorusGeometry(.026, .005, 6, 16), M('rng', { color: C(dc), metalness: 1, roughness: .2 })), 0, y, 0).rotation.x = Math.PI / 2; break;
        case 'light': add(new THREE.Mesh(new THREE.SphereGeometry(.008, 8, 6), glowM('lgt', dc, 1.4)), 0, y, -.02); break;
        case 'rune': add(new THREE.Mesh(new THREE.TorusGeometry(.021, .003, 4, 16), glowM('run', dc, 1.2)), 0, y, 0).rotation.x = Math.PI / 2; break;
        case 'star': add(new THREE.Mesh(starGeo(.014, .004), glowM('str', dc, .8)), 0, y, -.02); break;
        case 'vring': { const r = add(new THREE.Mesh(new THREE.TorusGeometry(.03, .003, 4, 20), glowM('vr', dc, 1.3)), 0, y, 0); r.rotation.x = Math.PI / 2; spin.push([r, k % 2 ? 2.2 : -1.7]); } break;
      }
    };
    // what sits on each end of the bow
    const tipObj = (tip, dir) => {
      const t = new THREE.Group(), tc = R.tipCol || R.col, tm = R.glowTip ? glowM('tip', tc) : M('tip', { color: C(tc) }), add = (m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); t.add(m); return m; };
      switch (tip) {
        case 'hat': { const h = add(new THREE.Mesh(new THREE.ConeGeometry(.03, .08, 10), tm), 0, .04 * dir); if (dir < 0) h.rotation.z = Math.PI; add(new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), M('pom', { color: C('#ffffff') })), 0, .085 * dir); } break;
        case 'button': add(new THREE.Mesh(new THREE.SphereGeometry(.032, 14, 10), tm)).scale.set(1, .7, 1); break;
        case 'lolly': { const d = add(new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .012, 20), tm), 0, .05 * dir); d.rotation.x = Math.PI / 2; add(new THREE.Mesh(new THREE.TorusGeometry(.028, .006, 6, 18), M('swl', { color: C('#ffffff') })), 0, .05 * dir, -.007); } break;
        case 'balloon': { const b = add(new THREE.Mesh(new THREE.SphereGeometry(.05, 14, 10), M('bal', { color: C(tc), roughness: .2 })), 0, .07 * dir); b.scale.set(1, 1.15, 1); add(new THREE.Mesh(new THREE.ConeGeometry(.008, .014, 6), M('bal', {})), 0, .018 * dir); } break;
        case 'cube': add(new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .05), tm), 0, .03 * dir); break;
        case 'orb': add(new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 12), R.glowTip ? tm : M('orb', { color: C(tc), transparent: true, opacity: .55, roughness: .05, metalness: .3 })), 0, .035 * dir); break;
        case 'flower': { for (let j = 0; j < 6; j++) add(new THREE.Mesh(new THREE.SphereGeometry(.016, 8, 6), tm), Math.cos(j * 1.05) * .022, .03 * dir + Math.sin(j * 1.05) * .022, 0).scale.set(1, 1, .5); add(new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), M('pc', { color: C('#ffd23a') })), 0, .03 * dir); } break;
        case 'drip': add(new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 10), M('l1', {})), 0, .03 * dir).scale.set(1, 1.5, 1); break;
        case 'bee': { add(new THREE.Mesh(new THREE.SphereGeometry(.026, 12, 8), M('l1', {})), 0, .03 * dir).scale.set(1, 1.4, 1); for (const sx of [-1, 1]) { const w = add(new THREE.Mesh(new THREE.SphereGeometry(.02, 8, 6), M('wng', { color: C('#e8f6ff'), transparent: true, opacity: .6 })), sx * .028, .035 * dir, .01); w.scale.set(1, .4, .7); } } break;
        case 'crane': { const b = add(new THREE.Mesh(new THREE.TetrahedronGeometry(.03), tm), 0, .03 * dir); b.rotation.set(.6, .8, 0); for (const sx of [-1, 1]) { const w = add(new THREE.Mesh(new THREE.PlaneGeometry(.05, .025), M('pw', { color: C('#ffffff'), side: THREE.DoubleSide, flatShading: true })), sx * .03, .035 * dir, 0); w.rotation.set(0, sx * .5, sx * .4); } } break;
        case 'flake': for (let j = 0; j < 3; j++) add(new THREE.Mesh(new THREE.BoxGeometry(.075, .008, .008), M('flk', { color: C(tc), emissive: C('#3a6a8a'), emissiveIntensity: .3 })), 0, .035 * dir).rotation.z = j * Math.PI / 3; break;
        case 'ball': add(new THREE.Mesh(new THREE.SphereGeometry(.035, 14, 10), tm), 0, .03 * dir); break;
        case 'bottle': { add(new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 10), M('btl', { color: C('#c8f0ff'), transparent: true, opacity: .45, roughness: .05 })), 0, .045 * dir); add(new THREE.Mesh(new THREE.SphereGeometry(.024, 12, 10), tm), 0, .042 * dir); add(new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, .028, 8), M('crk', { color: C('#8a5a2a') })), 0, .08 * dir); } break;
        case 'leaf': { const l = add(new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), tm), 0, .035 * dir); l.scale.set(.6, 1.4, .2); } break;
        case 'scarab': { add(new THREE.Mesh(new THREE.SphereGeometry(.028, 12, 8), M('scb', { color: C(tc), metalness: 1, roughness: .25 })), 0, .03 * dir).scale.set(1, 1.3, .55); add(new THREE.Mesh(new THREE.SphereGeometry(.01, 8, 6), M('scg', { color: C('#2fc4b2'), metalness: .3 })), 0, .03 * dir, -.015); } break;
        case 'spike': for (let j = 0; j < 3; j++) { const c = add(new THREE.Mesh(new THREE.ConeGeometry(.012, .07 - j * .015, 5), M('spk', { color: C(tc), transparent: true, opacity: .85, roughness: .05, flatShading: true })), (j - 1) * .014, .04 * dir, 0); c.rotation.z = (j - 1) * -.35 * dir; if (dir < 0) c.rotation.x = Math.PI; } break;
        case 'flame': { const f1 = add(new THREE.Mesh(new THREE.ConeGeometry(.026, .08, 10), tm), 0, .045 * dir); const f2 = add(new THREE.Mesh(new THREE.ConeGeometry(.014, .05, 8), glowM('fl2', '#fff0a0', 1.2)), 0, .04 * dir, -.004); if (dir < 0) { f1.rotation.z = f2.rotation.z = Math.PI; } spin.push([f1, 0, 'flick']); } break;
        case 'snake': { const h = add(new THREE.Mesh(new THREE.ConeGeometry(.022, .06, 8), tm), 0, .03 * dir, -.02); h.rotation.x = dir > 0 ? -1.1 : -2.0; for (const sx of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(.005, 6, 4), glowM('eye', '#ffd23a', 1.2)), sx * .01, .035 * dir, -.035); } break;
        case 'disco': add(new THREE.Mesh(new THREE.IcosahedronGeometry(.035, 1), M('dsc', { color: C('#e6e9ee'), metalness: 1, roughness: .05, flatShading: true })), 0, .035 * dir); break;
        case 'wing': for (const sx of [-1, 1]) { const w = add(new THREE.Mesh(new THREE.PlaneGeometry(.09, .035), M('wg', { color: C(tc), side: THREE.DoubleSide })), sx * .045, .02 * dir, .01); w.rotation.z = sx * .5 * dir; } break;
        case 'fin': for (let j = 0; j < 3; j++) { const f = add(new THREE.Mesh(new THREE.BoxGeometry(.004, .05, .035), tm), 0, .01 * dir); f.rotation.y = j * TAU / 3; f.translateZ(.024); } add(new THREE.Mesh(new THREE.ConeGeometry(.02, .045, 12), M('ncn', { color: C('#ffffff'), metalness: .4 })), 0, .045 * dir).rotation.z = dir < 0 ? Math.PI : 0; break;
        case 'bolt': { const b = add(new THREE.Mesh(new THREE.BoxGeometry(.012, .06, .03), tm), 0, .03 * dir); b.rotation.z = .5; const b2 = add(new THREE.Mesh(new THREE.BoxGeometry(.012, .04, .03), tm), .012, .065 * dir); b2.rotation.z = -.4; } break;
        case 'wisp': add(new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 10), M('wsp', { color: C(tc), transparent: true, opacity: .45, emissive: C(tc), emissiveIntensity: .8 })), 0, .04 * dir).scale.set(1, 1.6, 1); break;
        case 'saucer': { add(new THREE.Mesh(new THREE.SphereGeometry(.04, 16, 8), M('sau', { color: C(tc), metalness: 1, roughness: .2 })), 0, .03 * dir).scale.set(1, .3, 1); add(new THREE.Mesh(new THREE.SphereGeometry(.018, 12, 8, 0, TAU, 0, Math.PI / 2), M('dom', { color: C('#9affb0'), transparent: true, opacity: .6, emissive: C('#2a8a3a') })), 0, .036 * dir); } break;
        case 'gem': add(new THREE.Mesh(new THREE.OctahedronGeometry(.03), M('tgm', { color: C(tc), metalness: .3, roughness: .05, emissive: C(tc), emissiveIntensity: .3 })), 0, .035 * dir).scale.set(1, 1.4, 1); break;
        case 'star': add(new THREE.Mesh(starGeo(.035, .01), tm), 0, .035 * dir); break;
        case 'vring': { add(new THREE.Mesh(new THREE.SphereGeometry(.018, 12, 10), M('blk', { color: C('#050308'), roughness: .1, metalness: .6 })), 0, .03 * dir); const r = add(new THREE.Mesh(new THREE.TorusGeometry(.035, .004, 4, 24), glowM('vr', R.decoCol, 1.3)), 0, .03 * dir); spin.push([r, 3]); } break;
      }
      return t;
    };
    const limbs = [1, -1].map(dir => {
      const base = new THREE.Group(); base.position.y = grip * dir; g.add(base); let parent = base; const nodes = [];
      for (let k = 0; k < N; k++) {
        const node = new THREE.Group(); if (k) node.position.y = segL * dir; parent.add(node);
        const m = new THREE.Mesh(geos[k], limbM(k)); m.castShadow = true; if (dir < 0) m.scale.y = -1; node.add(m);
        if (R.outline) { const o = new THREE.Mesh(geos[k], bmat('outline', { color: LC('#111111'), side: THREE.BackSide })); o.scale.set(1.35, dir < 0 ? -1.04 : 1.04, 1.35); node.add(o); }
        if (R.deco && (k % 2 === 1 || R.deco === 'ember' || R.deco === 'rune' || R.deco === 'streamer')) deco(node, k, dir);
        parent = node; nodes.push(node);
      }
      const tip = new THREE.Group(); tip.position.y = segL * dir; parent.add(tip); tip.add(tipObj(R.tip, dir));
      return { dir, nodes };
    });
    // the grip: wrapped in its own colour, with bands; a scarf for Frostfall
    const gm = new THREE.Mesh(new THREE.CylinderGeometry(.022 * Math.max(1, th * .85), .022 * Math.max(1, th * .85), grip * 2 + .02, 12), M('grip', { color: C(R.grip || '#3b2416'), metalness: R.metal ? .4 : 0, emissive: R.glowTip ? C(R.grip) : C('#000'), emissiveIntensity: R.glowTip ? .25 : 0 })); gm.castShadow = true; g.add(gm);
    for (const y of [-grip, grip]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.024 * Math.max(1, th * .85), .004, 6, 14), M('band', { color: C(R.decoCol || R.tipCol || '#d8b94a'), metalness: .6, roughness: .3 })); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring); }
    if (R.scarf) { const sc = new THREE.Mesh(new THREE.TorusGeometry(.03, .012, 8, 16), M('scf', { color: C(R.scarf), roughness: .9 })); sc.rotation.x = Math.PI / 2; sc.position.y = .05; g.add(sc); const tail = new THREE.Mesh(new THREE.BoxGeometry(.03, .14, .008), M('scf', {})); tail.position.set(.02, -.02, .03); tail.rotation.z = .3; g.add(tail); }
    const strMat = bmat('str' + skin, { color: LC(R.string || '#d9cfb4'), roughness: .6, emissive: R.glowTip ? LC(R.string || '#fff') : LC('#000'), emissiveIntensity: R.glowTip ? .4 : 0 });
    const strs = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.0018, .0018, 1, 4), strMat); g.add(m); return m; });
    const arrow = makeArrowMesh(skin); g.add(arrow);
    const tipYZ = (dir, d) => { let y = grip * dir, z = 0, a = 0; for (let k = 0; k < N; k++) { a += rest[k] + d * flex[k]; y += Math.cos(a) * segL * dir; z += Math.sin(a) * segL; } return [y, z]; };
    const B = { g, skin, draw: 0, nockZ: 0, arrow, limbs,
      setDraw(d, nocked) {
        d = cl(d, 0, 1); B.draw = d; const tt = performance.now() / 1000;
        for (const L of limbs) L.nodes.forEach((n, k) => n.rotation.x = (rest[k] + d * flex[k]) * L.dir);
        const [yu, zu] = tipYZ(1, d), [yl, zl] = tipYZ(-1, d), nz = zu + d * .6; B.nockZ = nz;
        const set = (m, ay, az) => { const dy = -ay, dz = nz - az, L = Math.hypot(dy, dz); m.position.set(0, ay + dy / 2, az + dz / 2); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(_UP, _vd.set(0, dy / L, dz / L)); };
        set(strs[0], yu, zu); set(strs[1], yl, zl);
        arrow.visible = !!nocked; arrow.position.set(-.012, 0, nz - .79);
        for (const [m, sp, kind] of spin) { if (kind === 'flick') { const f = 1 + Math.sin(tt * 17 + m.id) * .12; m.scale.set(f, 1 + Math.sin(tt * 13) * .15, f); } else m.rotation.z = tt * sp; }
      },
      nockLocal(v) { return v.set(0, 0, B.nockZ); },
    };
    B.setDraw(0, true);
    return B;
  }
  function starGeo(r, d) { const s = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + Math.PI / 2, rr = k % 2 ? r * .45 : r; if (k) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g; }

  // ---- your own bow and hands, drawn over the world from the eye
  const VM = { bow: null, skin: '', g: null, raise: 0, draw: 0, snap: 0, kick: 0, sprint: 0 };
  /* ---- first-person hands: built joint by joint (palm, three bones a finger, a two-bone thumb, knuckles and nails),
     shaded skin with warmer knuckles and fingertips, a leather shooting glove on the string fingers. Positions are in the
     bow's frame: the grip runs along Y, the arrow flies down -Z, the archer is behind (+Z). */
  const _hy = () => new THREE.Vector3(0, 1, 0);
  function handPart(list, a, b, ra, rb, col) {   // a tapered bone from a to b, with a round joint at a
    const d = new THREE.Vector3().subVectors(b, a), L = d.length(); d.normalize();
    const g = new THREE.CylinderGeometry(rb, ra, L, 10, 1, true); g.translate(0, L / 2, 0); g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(_hy(), d))); g.translate(a.x, a.y, a.z);
    tint(g, () => col.a || col); list.push(g);
    const j = new THREE.SphereGeometry(ra * 1.04, 10, 8); j.translate(a.x, a.y, a.z); tint(j, () => col.j || col.a || col); list.push(j);
    return { d, L };
  }
  function nail(list, a, b, r, out) {   // a fingernail on the back of the last bone (out: the way the back of the finger faces)
    const d = new THREE.Vector3().subVectors(b, a), L = d.length(); d.normalize();
    const z = out.clone().addScaledVector(d, -out.dot(d)).normalize(), x = new THREE.Vector3().crossVectors(d, z);
    const g = roundBox(r * 1.45, L * .62, r * .5, r * .22, 2), M = new THREE.Matrix4().makeBasis(x, d, z);
    M.setPosition(a.clone().addScaledVector(d, L * .62).addScaledVector(z, r * .78)); g.applyMatrix4(M); tint(g, () => [1.28, 1.12, 1.08]); list.push(g);
  }
  function fingerChain(list, pts, radii, out, cols) {
    for (let k = 0; k < pts.length - 1; k++) handPart(list, pts[k], pts[k + 1], radii[k], radii[k + 1], cols[k]);
    const tip = new THREE.SphereGeometry(radii[radii.length - 1], 10, 8), e = pts[pts.length - 1]; tip.translate(e.x, e.y, e.z); tint(tip, () => cols[cols.length - 1].a || cols[cols.length - 1]); list.push(tip);
    nail(list, pts[pts.length - 2], pts[pts.length - 1], radii[radii.length - 1], out(pts[pts.length - 1]));
  }
  const SKINC = { a: [1, 1, 1], j: [1.04, .9, .88] }, TIPC = { a: [1.03, .93, .9], j: [1.04, .9, .88] }, GLOVE = { a: [.42, .3, .24], j: [.38, .27, .22] };
  // the bow hand, closed round the grip just under the arrow; you see the thumb over the index finger and the curled fingertips
  function gripHand(mat) {
    const parts = [], P = (deg, R, y) => { const a = deg * Math.PI / 180; return new THREE.Vector3(R * Math.cos(a), y, -R * Math.sin(a)); };
    const radial = p => new THREE.Vector3(p.x, 0, p.z).normalize();
    const F = [[-.014, .0094, 0], [-.036, .0099, 4], [-.058, .0092, 6], [-.078, .0081, 14]];
    for (const [y, r, sw] of F) fingerChain(parts, [P(160 + sw * .3, .049, y), P(102 + sw, .036, y), P(50 + sw, .0315, y - .002), P(10 + sw * 1.5, .029, y - .003)], [r * 1.12, r, r * .93, r * .85], radial, [SKINC, SKINC, TIPC]);
    // the thumb: from the heel of the hand, over the top of the index finger, pointing forward
    fingerChain(parts, [P(238, .046, -.026), P(200, .043, .0), P(146, .035, .006), P(100, .031, .004)], [.0135, .0115, .0105, .0095], p => new THREE.Vector3(0, 1, 0).add(radial(p)).normalize(), [SKINC, SKINC, TIPC]);
    // the palm and the back of the hand: a soft slab on the left-back of the grip, knuckle bumps along its front edge
    const palm = roundBox(.032, .098, .09, .014, 3); palm.rotateY(212 * Math.PI / 180); const pc = P(212, .046, -.047); palm.translate(pc.x, pc.y, pc.z); tint(palm, () => [1, 1, 1]); parts.push(palm);
    const heel = new THREE.SphereGeometry(.026, 12, 10); heel.scale(.9, 1.2, 1); const hc = P(244, .04, -.06); heel.translate(hc.x, hc.y, hc.z); tint(heel, () => [1, .97, .96]); parts.push(heel);
    const wrist = new THREE.CylinderGeometry(.03, .032, .06, 12); wrist.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(_hy(), new THREE.Vector3(-.3, -.35, .88).normalize()))); const wc = P(256, .05, -.062); wrist.translate(wc.x, wc.y, wc.z); tint(wrist, () => [.98, .96, .95]); parts.push(wrist);
    { const d = new THREE.Vector3(-.3, -.35, .88).normalize(), e = new THREE.SphereGeometry(.031, 12, 10); e.translate(wc.x + d.x * .03, wc.y + d.y * .03, wc.z + d.z * .03); tint(e, () => [.98, .96, .95]); parts.push(e); }
    const h = new THREE.Mesh(merge(parts), mat); h.userData.wrist = P(262, .055, -.07); return h;
  }
  // the string hand: three fingers hooked on the string (one above the arrow, two below), a shooting glove on them, thumb tucked
  function stringHand(mat) {
    const parts = [], V = (x, y, z) => new THREE.Vector3(x, y, z), out = () => V(.6, .1, -.8).normalize();
    const F = [[.014, .0092], [-.012, .0097], [-.034, .009]];
    for (const [y, r] of F) fingerChain(parts, [V(.053, y, .03), V(.017, y, .009), V(-.004, y, -.013), V(-.013, y, .005)], [r * 1.12, r, r * .94, r * .86], () => V(-.2, 0, -1), [SKINC, GLOVE, GLOVE]);
    fingerChain(parts, [V(.051, -.054, .03), V(.026, -.058, .016), V(.026, -.059, .038), V(.04, -.056, .046)], [.009, .0082, .0076, .007], () => V(0, 0, -1), [SKINC, SKINC, TIPC]);   // little finger curled into the palm
    fingerChain(parts, [V(.058, -.02, .078), V(.044, -.046, .062), V(.034, -.062, .046), V(.03, -.07, .03)], [.0135, .0118, .0106, .0096], () => V(1, -.2, 0).normalize(), [SKINC, SKINC, TIPC]);   // thumb, tucked down the jaw
    const palm = roundBox(.03, .096, .084, .013, 3); palm.translate(.064, -.02, .066); tint(palm, () => [1, 1, 1]); parts.push(palm);
    const strap = roundBox(.034, .02, .07, .006, 2); strap.translate(.066, -.005, .06); tint(strap, () => [.36, .25, .2]); parts.push(strap);
    const band = new THREE.TorusGeometry(.032, .007, 6, 16); band.rotateY(Math.PI / 2); band.rotateZ(.3); band.translate(.07, -.03, .108); tint(band, () => [.36, .25, .2]); parts.push(band);
    const wrist = new THREE.CylinderGeometry(.03, .032, .06, 12); wrist.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(_hy(), V(.35, -.4, .85).normalize()))); wrist.translate(.07, -.032, .108); parts.push(wrist);
    { const d = V(.35, -.4, .85).normalize(), e = new THREE.SphereGeometry(.031, 12, 10); e.translate(.07 + d.x * .03, -.032 + d.y * .03, .108 + d.z * .03); parts.push(e); }
    const h = new THREE.Mesh(merge(parts), mat); h.userData.wrist = V(.074, -.036, .125); return h;
  }
  const VMG = {};
  function buildViewModel(skin, col) {
    if (VM.g) X.vmScene.remove(VM.g);
    VM.g = new THREE.Group(); X.vmScene.add(VM.g); VM.skin = skin;
    VM.bow = makeBow(skin); VM.g.add(VM.bow.g);
    if (!VMG.fore) { VMG.fore = limbGeo(.043, .031, .26, 14); VMG.sleeve = limbGeo(.056, .05, .1, 14); VMG.brace = limbGeo(.046, .04, .12, 14); VMG.brace.translate(0, -.12, 0); VMG.cuff = new THREE.TorusGeometry(.052, .008, 6, 18); VMG.cuff.rotateX(Math.PI / 2); VMG.cuff.translate(0, -.1, 0); }
    const c = new THREE.Color(col).convertSRGBToLinear(), sleeve = std({ color: c.clone().multiplyScalar(.85), roughness: .6 }), cuffM = std({ color: c.clone().multiplyScalar(.55), roughness: .6 });
    const skinM = std({ color: LC('#e2a987'), roughness: .5, vertexColors: true }), brace = std({ color: LC('#7a4e2c'), roughness: .55 }), skinA = std({ color: LC('#dda07c'), roughness: .52 });
    VM.handL = gripHand(skinM); VM.bow.g.add(VM.handL);
    VM.handR = stringHand(skinM);
    const arm = withBrace => { const g = new THREE.Group(); g.add(new THREE.Mesh(VMG.fore, skinA)); g.add(new THREE.Mesh(VMG.sleeve, sleeve)); if (withBrace) g.add(new THREE.Mesh(VMG.brace, brace)); return g; };
    VM.foreL = arm(true); VM.foreR = arm(false); VM.braceL = new THREE.Group();
    VM.g.add(VM.foreL, VM.handR, VM.foreR);
  }
  let _vp, _vg, _ve; LAZY.push(() => { _vp = new THREE.Vector3(); _vg = new THREE.Vector3(); _ve = new THREE.Vector3(); });
  function aimLimb(mesh, from, to) { _vd.copy(to).sub(from); const L = _vd.length(); mesh.position.copy(from); mesh.quaternion.setFromUnitVectors(_vu.set(0, -1, 0), _vd.multiplyScalar(1 / L)); mesh.scale.set(1, L / .26, 1); }
  function poseViewModel(dt) {
    if (!VM.g) return;
    const show = ME.cam === 'fp' && ME.alive && CL.src; VM.g.visible = !!show; if (!show) return;
    const drawing = ME.drawing, p = drawing ? W.drawPower(ME.drawT) : 0, d = 1 - (1 - p) * (1 - p);
    VM.raise = ease(VM.raise, drawing ? 1 : 0, drawing ? 14 : 8, dt); VM.sprint = ease(VM.sprint, ME.st.sprint ? 1 : 0, 8, dt);
    VM.draw = drawing ? d : ease(VM.draw, 0, 45, dt);
    VM.kick = Math.max(0, VM.kick - dt * 4); VM.snap = Math.max(0, VM.snap - dt * 5);
    const nockP = ME.nockT > 0 ? 1 - ME.nockT / W.BOW.nock : 1, out = ME.arrows <= 0 && !drawing;
    const bobX = Math.sin(ME.bob) * .012 * ME.moveAmt, bobY = -Math.abs(Math.cos(ME.bob)) * .014 * ME.moveAmt, tremble = drawing && ME.drawT > 2.2 ? Math.sin(X.t * 31) * .0012 * Math.min(1, ME.drawT - 2.2) : 0;
    const r = VM.raise, s = VM.sprint, low = ME.nockT > 0 ? Math.sin(nockP * Math.PI) * .25 : 0;
    // at rest the bow hangs low in the bottom-left corner; drawn, it comes up canted to the left of your line of sight, so
    // the target and the aim line stay clear and the arrow points in at the crosshair
    const bx = lp(lp(-.27, -.235, r), -.3, s) + bobX, by = lp(lp(-.24, -.165, r), -.46, s) + bobY - low * .05 + tremble, bz = lp(lp(-.5, -.66, r), -.42, s) - VM.kick * .03;
    VM.bow.g.position.set(bx, by, bz); VM.bow.g.rotation.set(lp(-.08, .001, r) + VM.kick * .22, lp(.16, -.13, r) + s * .6, lp(.62, .86, r) + s * .4);
    VM.bow.g.scale.setScalar(.74); VM.handR.scale.setScalar(.74);
    // first person: the string travels less than on a body (the hand would be behind your eye)
    VM.bow.setDraw(VM.draw * .72, !out && nockP >= .3);
    if (nockP < 1 && !out) { const k = sm(cl((nockP - .3) / .7, 0, 1)); VM.bow.arrow.position.x += (1 - k) * .12; VM.bow.arrow.position.y -= (1 - k) * .08; VM.bow.arrow.position.z += (1 - k) * .3; }
    VM.bow.g.updateMatrix();
    const nk = VM.bow.nockLocal(_vp).applyMatrix4(VM.bow.g.matrix), wl = _vg.copy(VM.handL.userData.wrist).applyMatrix4(VM.bow.g.matrix);
    aimLimb(VM.foreL, _ve.set(wl.x - .2, wl.y - .2, wl.z + .1), wl);
    // the string hand rides the nock (reaching down for the next arrow while nocking; flicking back on release)
    const reach = ME.nockT > 0 ? Math.sin(cl(nockP * 1.3, 0, 1) * Math.PI) : 0;
    VM.handR.position.copy(nk); VM.handR.position.lerp(_ve.set(.2, -.34, .02), reach);
    VM.handR.position.x += VM.snap * .05; VM.handR.position.z += VM.snap * .08; VM.handR.quaternion.copy(VM.bow.g.quaternion);
    if (VM.snap > 0) VM.handR.rotateZ(-VM.snap * .5);
    VM.handR.visible = VM.handR.position.z < -.12 || reach > .1;
    VM.handR.updateMatrix(); const wr = _vp.copy(VM.handR.userData.wrist).applyMatrix4(VM.handR.matrix);
    aimLimb(VM.foreR, _ve.set(wr.x + .13, wr.y - .1, wr.z + .2), wr); VM.foreR.visible = VM.handR.visible;
  }
  on('release', () => { VM.snap = 1; VM.kick = 1; });
