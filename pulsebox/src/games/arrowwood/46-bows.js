  /* ---------- 46 bows: four skins on one bow (same size, draw and string travel), their arrows, and the first-person view ----------
     A bow's grip sits at the origin, its limbs run along ±Y in segments that flex toward the archer (+Z) as you draw, and
     the arrow points down -Z. Every skin shares this shape, so what you see in a friend's hands matches what they shoot. */
  const BOW_LOOK = {
    longbow: { L: 1.56, string: '#d9cfb4', fletch: ['#e9e2cf', '#e9e2cf', '#7a2f2a'], head: '#8d9196', shaft: '#9a7b52' },
    cupid: { L: 1.4, string: '#ffe6ee', fletch: ['#f2a7bd', '#f2a7bd', '#c8283c'], head: '#d94a6e', shaft: '#e9d4c8' },
    yardstick: { L: 1.46, string: '#cdb88a', fletch: ['#e8c35a', '#1a1206', '#e8c35a'], head: '#2a2a2a', shaft: '#e8c35a' },
    cashout: { L: 1.42, string: '#e0c050', fletch: ['#6aa35a', '#6aa35a', '#d4af37'], head: '#d4af37', shaft: '#3d6b3a' },
  };
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
    // at rest the bow hangs low on the left; drawn, it comes up beside your line of sight
    const bx = lp(lp(-.19, .03, r), -.27, s) + bobX, by = lp(lp(-.16, -.066, r), -.44, s) + bobY - low * .05 + tremble, bz = lp(lp(-.48, -.62, r), -.4, s) - VM.kick * .03;
    VM.bow.g.position.set(bx, by, bz); VM.bow.g.rotation.set(lp(-.06, .001, r) + VM.kick * .22, lp(.16, -.03, r) + s * .6, lp(.42, -.16, r) + s * .5);
    // first person: the string travels less than on a body (the hand would be behind your eye)
    VM.bow.setDraw(VM.draw * .72, !out && nockP >= .3);
    if (nockP < 1 && !out) { const k = sm(cl((nockP - .3) / .7, 0, 1)); VM.bow.arrow.position.x += (1 - k) * .12; VM.bow.arrow.position.y -= (1 - k) * .08; VM.bow.arrow.position.z += (1 - k) * .3; }
    VM.bow.g.updateMatrix();
    const nk = VM.bow.nockLocal(_vp).applyMatrix4(VM.bow.g.matrix), wl = _vg.copy(VM.handL.userData.wrist).applyMatrix4(VM.bow.g.matrix);
    aimLimb(VM.foreL, _ve.set(wl.x - .2, wl.y - .13, wl.z + .17), wl);
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
