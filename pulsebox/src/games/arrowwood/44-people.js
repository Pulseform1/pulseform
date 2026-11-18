  /* ---------- 44 people: chunky toy-figure archers (rounded blocks, painted faces, hats, quivers), animated by hand ----------
     The root stands at the feet facing -Z. Arms are placed by two-bone IK so the bow hand and the string hand land exactly
     where the bow and its string are; legs swing on a stride cycle. */
  const PGEO = {}, PMAT = {};
  // a box with rounded edges and true round normals (the toy-figure look)
  function roundBox(w, h, d, r, seg = 3) {
    const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, n = g.attributes.normal, hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), cx = cl(x, -hx, hx), cy = cl(y, -hy, hy), cz = cl(z, -hz, hz);
      v.set(x - cx, y - cy, z - cz); const L = v.length() || 1; v.multiplyScalar(1 / L); p.setXYZ(i, cx + v.x * r, cy + v.y * r, cz + v.z * r); n.setXYZ(i, v.x, v.y, v.z);
    }
    return g;
  }
  const turned = (pts, seg = 12) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  function limbGeo(r0, r1, len, seg = 10) { const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10, y = -t * len, bulge = Math.sin(t * Math.PI) * .12 + 1; const r = lp(r0, r1, t) * bulge * (k === 0 || k === 10 ? .55 : 1); pts.push([Math.max(.004, r), y]); } return turned(pts, seg); }
  const ARM = { up: .31, fore: .31, sh: .27 };
  function peopleGeos() {
    if (PGEO.torso) return PGEO;
    const at = (g, x, y, z) => { g.translate(x, y, z); return g; };
    PGEO.torso = at(roundBox(.46, .5, .26, .05), 0, .03, 0);
    PGEO.pelvis = at(roundBox(.43, .2, .25, .04), 0, -.03, 0);
    PGEO.belt = at(roundBox(.45, .065, .27, .02, 2), 0, .06, 0); PGEO.buckle = at(roundBox(.075, .06, .02, .008, 2), 0, .06, -.14);
    PGEO.strap = roundBox(.06, .62, .02, .01, 2);
    PGEO.head = at(roundBox(.32, .31, .3, .085, 4), 0, .16, 0);
    PGEO.face = new THREE.PlaneGeometry(.27, .25); PGEO.face.rotateY(Math.PI); PGEO.face.translate(0, .15, -.1515);
    PGEO.upper = at(roundBox(.15, ARM.up + .02, .15, .04), 0, -ARM.up / 2 + .02, 0);
    PGEO.fore = at(roundBox(.135, ARM.fore, .135, .035), 0, -ARM.fore / 2, 0);
    PGEO.bracer = at(roundBox(.15, .16, .15, .03, 2), 0, -.18, 0);
    PGEO.hand = at(roundBox(.13, .13, .14, .045), 0, -.03, 0);
    PGEO.thigh = at(roundBox(.2, .47, .21, .045), 0, -.2, 0); PGEO.shin = at(roundBox(.185, .44, .2, .04), 0, -.2, 0);
    PGEO.foot = at(roundBox(.2, .12, .3, .045), 0, -.01, -.045); PGEO.cuff = at(roundBox(.205, .05, .215, .02, 2), 0, -.4, 0);
    PGEO.quiver = new THREE.CylinderGeometry(.075, .062, .55, 12, 1, true); PGEO.quiverBot = new THREE.CircleGeometry(.062, 12); PGEO.quiverRim = new THREE.TorusGeometry(.075, .012, 6, 16);
    PGEO.fletch = new THREE.ConeGeometry(.012, .07, 4); PGEO.shaft = new THREE.CylinderGeometry(.005, .005, .14, 4);
    PGEO.cape = new THREE.PlaneGeometry(.44, .62, 3, 6); PGEO.cape.translate(0, -.31, 0); { const p = PGEO.cape.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.abs(p.getX(i)) * .2 + p.getY(i) * -.05); }
    return PGEO;
  }
  function pmat(key, o) { if (!PMAT[key]) PMAT[key] = std(Object.assign({ roughness: .5, metalness: 0 }, o)); return PMAT[key]; }
  const SKINS = ['#f1c7a0', '#e0ac82', '#c68a5e', '#9a6340', '#f5d3b5', '#7a4b2e'], HAIRS = ['#2b1d12', '#5a3a1e', '#8a5a2a', '#1a1410', '#d9a441', '#b4472f'], PANTS = ['#2f3b52', '#3a3a3f', '#4a3a2a', '#2c4a3a'];
  // faces: drawn once per expression and shared
  const FACES = {};
  function faceTex(k) {
    if (FACES[k]) return FACES[k];
    const [c, g] = cvs(128, 128), ink = '#1d1a1a';
    const eye = (x, y, w, h, look) => { g.fillStyle = ink; g.beginPath(); g.ellipse(x, y, w, h, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - w * .3 + look, y - h * .38, w * .38, 0, TAU); g.fill(); };
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (k === 0) { eye(42, 56, 8, 11, 0); eye(86, 56, 8, 11, 0); g.strokeStyle = ink; g.lineWidth = 6; g.beginPath(); g.arc(64, 74, 22, .2 * Math.PI, .8 * Math.PI); g.stroke(); }
    else if (k === 1) { eye(42, 56, 8, 11, 2); eye(86, 56, 8, 11, 2); g.fillStyle = ink; g.beginPath(); g.moveTo(40, 82); g.quadraticCurveTo(64, 112, 88, 82); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(48, 82, 32, 6); }
    else if (k === 2) { eye(42, 58, 7, 9, 0); eye(86, 58, 7, 9, 0); g.strokeStyle = ink; g.lineWidth = 6; g.beginPath(); g.moveTo(30, 38); g.lineTo(52, 44); g.moveTo(98, 38); g.lineTo(76, 44); g.stroke(); g.beginPath(); g.moveTo(48, 90); g.quadraticCurveTo(66, 96, 82, 86); g.stroke(); }
    else if (k === 3) { eye(42, 56, 8, 11, -1); g.strokeStyle = ink; g.lineWidth = 6; g.beginPath(); g.moveTo(76, 58); g.quadraticCurveTo(86, 50, 96, 58); g.stroke(); g.beginPath(); g.arc(64, 72, 20, .15 * Math.PI, .7 * Math.PI); g.stroke(); }
    else { eye(42, 58, 9, 9, 0); eye(86, 58, 9, 9, 0); g.fillStyle = '#ff8fa3'; g.globalAlpha = .45; g.beginPath(); g.ellipse(30, 78, 10, 6, 0, 0, TAU); g.ellipse(98, 78, 10, 6, 0, 0, TAU); g.fill(); g.globalAlpha = 1; g.strokeStyle = ink; g.lineWidth = 6; g.beginPath(); g.arc(64, 78, 12, .1 * Math.PI, .9 * Math.PI); g.stroke(); }
    return FACES[k] = tex(c, { clamp: true });
  }
  // the shirt: team colour with a darker yoke, a v-neck and a little leaf crest
  const SHIRTS = {};
  function shirtTex(col) {
    if (SHIRTS[col]) return SHIRTS[col];
    const [c, g] = cvs(128, 128), base = new THREE.Color(col), dk = base.clone().multiplyScalar(.72).getStyle(), lt = base.clone().lerp(new THREE.Color('#fff'), .3).getStyle();
    g.fillStyle = col; g.fillRect(0, 0, 128, 128); g.fillStyle = dk; g.fillRect(0, 0, 128, 22); g.fillRect(0, 112, 128, 16);
    g.fillStyle = 'rgba(255,255,255,.08)'; for (let y = 0; y < 128; y += 6) g.fillRect(0, y, 128, 2);
    g.fillStyle = lt; g.beginPath(); g.moveTo(64, 34); g.quadraticCurveTo(84, 54, 64, 86); g.quadraticCurveTo(44, 54, 64, 34); g.fill(); g.strokeStyle = dk; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 40); g.lineTo(64, 82); g.stroke();
    return SHIRTS[col] = tex(c, { clamp: true });
  }
  // one archer. o: { col, seed, dummy, bow }
  function makePerson(o) {
    const G = peopleGeos(), R = W.rng((o.seed || 1) * 7 + 3), seed = o.seed || 0, col = new THREE.Color(o.col || '#7fae5a');
    const hex = col.getHexString(), shirt = pmat('sh' + hex, { color: LC('#ffffff'), map: shirtTex('#' + hex), roughness: .55 });
    const shirtPlain = pmat('sp' + hex, { color: col.clone().convertSRGBToLinear(), roughness: .55 }), shirtDark = pmat('sd' + hex, { color: col.clone().convertSRGBToLinear().multiplyScalar(.6), roughness: .6, side: THREE.DoubleSide });
    const leather = pmat('lea', { color: LC('#8a5a33'), roughness: .6 }), leatherD = pmat('lead', { color: LC('#4a3020'), roughness: .62 }), gold = pmat('gold', { color: LC('#f2c230'), metalness: .6, roughness: .3 });
    const pants = o.dummy ? pmat('straw', { color: LC('#d8b86a'), roughness: .9 }) : pmat('pa' + (seed % 4), { color: LC(PANTS[seed % 4]), roughness: .6 });
    const skin = o.dummy ? pmat('straw', {}) : pmat('sk' + (seed % 6), { color: LC(SKINS[seed % 6]), roughness: .45 });
    const hairC = HAIRS[(seed >> 2) % 6], hair = pmat('hr' + hairC, { color: LC(hairC), roughness: .7 });
    const M = (g, m, x = 0, y = 0, z = 0, p) => { const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; (p || root).add(mesh); return mesh; };
    const J = (p, x, y, z) => { const j = new THREE.Group(); j.position.set(x, y, z); p.add(j); return j; };
    const root = new THREE.Group(), hips = J(root, 0, .98, 0), spine = J(hips, 0, .08, 0), chest = J(spine, 0, .14, 0), neck = J(chest, 0, .28, 0), head = J(neck, 0, 0, 0);
    M(G.pelvis, pants, 0, 0, 0, hips);
    M(G.torso, o.dummy ? pants : shirt, 0, 0, 0, chest);
    M(G.head, skin, 0, 0, 0, head);
    if (!o.dummy) {
      M(G.belt, leatherD, 0, 0, 0, hips); M(G.buckle, gold, 0, 0, 0, hips);
      const fc = new THREE.Mesh(G.face, pmat('face' + (seed % 5), { map: faceTex(seed % 5), transparent: true, alphaTest: .3, roughness: .6, polygonOffset: true, polygonOffsetFactor: -2 })); head.add(fc);
      // the quiver strap across the chest, the quiver on the back with its arrows
      const st = M(G.strap, leatherD, 0, .03, -.135, chest); st.rotation.z = .72; const st2 = M(G.strap, leatherD, 0, .03, .135, chest); st2.rotation.z = -.72;
      const q = J(chest, .1, .06, .2); q.rotation.set(.25, 0, -.42); M(G.quiver, leather, 0, 0, 0, q); M(G.quiverBot, leatherD, 0, -.275, 0, q).rotation.x = Math.PI / 2; M(G.quiverRim, leatherD, 0, .275, 0, q).rotation.x = Math.PI / 2;
      root.userData.quiver = []; const fm = pmat('fl', { color: LC('#f4f1e8'), roughness: .6 }), fr = pmat('flr', { color: LC('#e04848'), roughness: .6 }), sm2 = pmat('shaftm', { color: LC('#c49a63') });
      for (let k = 0; k < 9; k++) { const g2 = J(q, (k % 3 - 1) * .028, .31 + (k % 2) * .02, (Math.floor(k / 3) - 1) * .028); M(G.shaft, sm2, 0, -.05, 0, g2); M(G.fletch, k % 3 === 1 ? fr : fm, 0, .04, 0, g2); root.userData.quiver.push(g2); }
      // what they wear on their head
      const look = seed % 6, hat = pmat('hat' + hex, { color: col.clone().convertSRGBToLinear().multiplyScalar(.85), roughness: .6 });
      const B = (w, h, d, r, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const mm = M(roundBox(w, h, d, r, 2), m, x, y, z, head); mm.rotation.set(rx, ry, rz); return mm; };
      if (look === 0) { B(.36, .07, .34, .03, hat, 0, .33, .01); B(.36, .3, .06, .03, hat, 0, .2, .16); for (const sx of [-1, 1]) B(.05, .28, .32, .02, hat, sx * .17, .2, .01); B(.42, .14, .08, .04, hat, 0, .03, .14); }
      else if (look === 1) { const capG = new THREE.CylinderGeometry(.02, .2, .2, 4, 1); capG.rotateY(Math.PI / 4); capG.scale(1, 1, 1.2); M(capG, hat, 0, .38, .02, head).rotation.x = -.2; B(.36, .05, .36, .02, hat, 0, .3, 0); const fe = M(roundBox(.025, .26, .06, .01, 2), pmat('feather', { color: LC('#e83e3e'), roughness: .5 }), .12, .42, .06, head); fe.rotation.set(-.6, 0, -.5); B(.33, .1, .3, .04, hair, 0, .25, .03); }
      else if (look === 2) { B(.34, .1, .32, .04, hair, 0, .31, .01); for (let k = 0; k < 7; k++) { const sp = new THREE.ConeGeometry(.05, .14, 5); const m2 = M(sp, hair, (k % 4 - 1.5) * .07, .38 + (k % 2) * .02, (k < 4 ? -.05 : .07), head); m2.rotation.set((k < 4 ? -.4 : .4), 0, (k % 4 - 1.5) * .3); } }
      else if (look === 3) { B(.34, .12, .33, .045, hair, 0, .3, .01); B(.335, .05, .315, .02, hat, 0, .25, 0); const tail = M(roundBox(.06, .14, .04, .015, 2), hat, .1, .25, .16, head); tail.rotation.set(.5, 0, .4); }
      else if (look === 4) { B(.35, .16, .33, .07, hat, 0, .3, .01); B(.36, .06, .34, .025, pmat('rib' + hex, { color: col.clone().convertSRGBToLinear().multiplyScalar(.55), roughness: .6 }), 0, .23, .01); M(new THREE.SphereGeometry(.055, 10, 8), pmat('pom', { color: LC('#f7f3ea'), roughness: .8 }), 0, .4, .01, head); }
      else { B(.34, .11, .33, .045, hair, 0, .3, .01); B(.33, .2, .06, .03, hair, 0, .19, .14); const pt = M(new THREE.CylinderGeometry(.04, .025, .22, 8), hair, 0, .14, .2, head); pt.rotation.x = .5; }
      if (R() < .4) { const cape = M(G.cape, shirtDark, 0, .25, .14, chest); cape.rotation.x = .12; root.userData.cape = cape; }
    } else {
      M(new THREE.CylinderGeometry(.035, .045, 1.3, 8), pmat('post', { color: LC('#7a5636'), roughness: .8 }), 0, .2, 0, root);
      const [cv0, g] = cvs(64, 64); for (const [r, c] of [[30, '#ffffff'], [22, '#e8443a'], [14, '#ffffff'], [6, '#e8443a']]) { g.fillStyle = c; g.beginPath(); g.arc(32, 32, r, 0, TAU); g.fill(); }
      M(new THREE.CircleGeometry(.15, 24), std({ map: tex(cv0, { clamp: true }), roughness: .7 }), 0, .05, -.135, chest).rotation.y = Math.PI;
      const fc = new THREE.Mesh(G.face, pmat('face4d', { map: faceTex(2), transparent: true, alphaTest: .3, polygonOffset: true, polygonOffsetFactor: -2 })); head.add(fc);
      M(roundBox(.4, .06, .38, .02, 2), pmat('strawHat', { color: LC('#e9cf7c'), roughness: .9 }), 0, .32, 0, head);
    }
    const arm = s => {
      const sh = J(chest, s * ARM.sh, .2, 0); M(G.upper, o.dummy ? pants : shirtPlain, 0, 0, 0, sh);
      const el = J(sh, 0, -ARM.up, 0); M(G.fore, o.dummy ? pants : skin, 0, 0, 0, el);
      if (s < 0 && !o.dummy) M(G.bracer, leather, 0, 0, 0, el);
      const hd = J(el, 0, -ARM.fore, 0); M(G.hand, o.dummy ? pants : s > 0 ? leatherD : skin, 0, 0, 0, hd); return { sh, el, hd };
    };
    const leg = s => { const hp = J(hips, s * .105, -.04, 0); M(G.thigh, pants, 0, 0, 0, hp); const kn = J(hp, 0, -.45, 0); M(G.shin, pants, 0, 0, 0, kn); if (!o.dummy) M(G.cuff, leatherD, 0, 0, 0, kn); const ft = J(kn, 0, -.43, 0); M(G.foot, o.dummy ? pants : leatherD, 0, 0, 0, ft); return { hp, kn, ft }; };
    const P = { root, hips, spine, chest, neck, head, L: arm(-1), R: arm(1), LL: leg(-1), RL: leg(1), phase: 0, speed: 0, mvAng: 0, crouch: 0, draw: 0, raise: 0, sprint: 0, lastPos: null, dummy: !!o.dummy, bow: null, t: R() * 10 };
    if (!o.dummy) { P.bow = makeBow(o.bow || 'longbow'); chest.add(P.bow.g); }
    root.traverse(m => { if (m.isMesh) m.userData.person = P; });
    return P;
  }
  // two-bone IK: put the hand at `target` (in the shoulder's parent space) with the elbow toward `pole`
  let _v, DOWN, _q, _t, _p, _a;
  LAZY.push(() => { _v = [0, 1, 2, 3, 4].map(() => new THREE.Vector3()); DOWN = new THREE.Vector3(0, -1, 0); _q = new THREE.Quaternion(); _t = new THREE.Vector3(); _p = new THREE.Vector3(); _a = new THREE.Vector3(); });
  function ik(arm, target, pole, L1 = ARM.up, L2 = ARM.fore) {
    const S = arm.sh.position, d = _v[0].copy(target).sub(S), dist = cl(d.length(), .08, L1 + L2 - .002); d.normalize();
    const a = Math.acos(cl((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
    const pl = _v[1].copy(pole).sub(S); const n = _v[2].copy(d).cross(pl).normalize(); const side = _v[3].copy(n).cross(d).normalize();
    const u = _v[4].copy(d).multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a)).normalize();
    arm.sh.quaternion.setFromUnitVectors(DOWN, u);
    const E = _v[1].copy(S).addScaledVector(u, L1), f = _v[2].copy(d).multiplyScalar(dist).add(S).sub(E).normalize();
    _q.copy(arm.sh.quaternion).invert(); f.applyQuaternion(_q); arm.el.quaternion.setFromUnitVectors(DOWN, f);
  }
  /* pose one archer for this frame. s: { x, y, z, yaw, pitch, crouch, sprint, draw (0..1 pull), aim (0..1 bow raised), alive, arrows, inAir } */
  function posePerson(P, s, dt) {
    const root = P.root; P.t += dt;
    if (P.lastPos) { const dx = s.x - P.lastPos[0], dz = s.z - P.lastPos[1], sp = Math.hypot(dx, dz) / Math.max(dt, 1e-3); P.speed = ease(P.speed, Math.min(sp, 8), 10, dt); if (sp > .3) P.mvAng = angD(Math.atan2(-dx, -dz), s.yaw); }
    P.lastPos = [s.x, s.z];
    root.position.set(s.x, s.y, s.z); root.rotation.y = s.yaw;
    P.crouch = ease(P.crouch, s.crouch ? 1 : 0, 10, dt); P.sprint = ease(P.sprint, s.sprint ? 1 : 0, 6, dt);
    P.raise = ease(P.raise, s.aim, 9, dt); P.draw = s.draw != null ? ease(P.draw, s.draw, 20, dt) : P.draw;
    const c = P.crouch, mv = cl(P.speed / 4.4, 0, 1.5);
    // legs: turn the hips toward the way you are walking (backwards walks backwards)
    let ang = P.mvAng, back = 1; if (Math.abs(ang) > Math.PI / 2) { ang = angD(ang, Math.PI); back = -1; }
    P.hips.rotation.y = ease(P.hips.rotation.y, mv > .1 ? cl(ang, -1.1, 1.1) * .8 : 0, 8, dt);
    P.phase += dt * P.speed * 1.75 * back;
    const A = (.42 + .32 * P.sprint) * cl(mv, 0, 1), ph = P.phase;
    const stance = (1 - cl(mv * 3, 0, 1)) * P.raise * .14;
    P.LL.hp.rotation.x = Math.sin(ph) * A + c * 1.15 + stance; P.RL.hp.rotation.x = -Math.sin(ph) * A + c * 1.15 - stance;
    P.LL.kn.rotation.x = -Math.max(0, -Math.cos(ph)) * A * 1.5 - c * 1.85 - .05; P.RL.kn.rotation.x = -Math.max(0, Math.cos(ph)) * A * 1.5 - c * 1.85 - .05;
    P.LL.ft.rotation.x = c * .7 + Math.max(0, Math.sin(ph)) * A * .3; P.RL.ft.rotation.x = c * .7 + Math.max(0, -Math.sin(ph)) * A * .3;
    if (s.inAir) { P.LL.hp.rotation.x += .5; P.RL.hp.rotation.x += .3; P.LL.kn.rotation.x -= .8; P.RL.kn.rotation.x -= .6; }
    P.hips.position.y = .98 - c * .4 + Math.abs(Math.sin(ph)) * .035 * cl(mv, 0, 1);
    P.hips.position.z = c * .12;
    // the upper body leans into a sprint, a crouch, and follows the aim
    const pitch = cl(s.pitch, -1.2, 1.2) * P.raise;
    P.spine.rotation.x = -(c * .32 + P.sprint * .2) + pitch * .25; P.spine.rotation.y = -P.hips.rotation.y * .8;
    P.chest.rotation.x = pitch * .2 + Math.sin(P.t * 1.6) * .012; P.neck.rotation.x = pitch * .25 - c * .1 + P.sprint * .15; P.head.rotation.x = pitch * .2;
    // arms: the bow out in front of the left shoulder; the right hand on the string, pulled back toward the chin
    const bow = P.bow;
    if (P.dummy) { P.L.sh.rotation.set(0, 0, -1.4); P.R.sh.rotation.set(0, 0, 1.4); P.L.el.rotation.set(0, 0, 0); P.R.el.rotation.set(0, 0, 0); return; }
    const cp = Math.cos(pitch * .55), sp2 = Math.sin(pitch * .55), raise = P.raise * (1 - P.sprint);
    const aimT = _t.set(-.06, .22 + sp2 * .56, -cp * .56), restT = _p.set(-.2, -.2 + Math.sin(ph) * .05 * mv, -.18 - Math.sin(ph) * .12 * mv), runT = _a.set(-.24, -.18, Math.sin(ph) * .22);
    const bowPos = new THREE.Vector3().copy(restT).lerp(runT, P.sprint).lerp(aimT, raise);
    if (bow) {
      bow.g.position.copy(bowPos);
      bow.g.rotation.set(lp(-.25, pitch * .55, raise), lp(.5, 0, raise), lp(.9, .14, raise));
      bow.setDraw(P.draw * raise, s.arrows > 0 || P.draw > .05);
      bow.g.updateMatrix();
      const nk = bow.nockLocal(_a.set(0, 0, 0)).applyMatrix4(bow.g.matrix);
      ik(P.L, bowPos, _p.set(-.6, -.3, .2));
      const handR = raise > .05 ? nk : _t.set(.22, -.2 - Math.sin(ph) * .05 * mv, -.05 + Math.sin(ph) * .14 * mv);
      ik(P.R, handR, _p.set(.7, -.1, .5));
    }
    if (root.userData.cape) root.userData.cape.rotation.x = .12 + mv * .45 + Math.sin(P.t * 2.3) * .04 + P.sprint * .3;
    if (root.userData.quiver) root.userData.quiver.forEach((f, k) => f.visible = k < (s.arrows | 0));
  }
