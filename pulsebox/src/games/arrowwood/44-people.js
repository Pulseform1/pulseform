  /* ---------- 44 people: archers built from smooth turned shapes, animated by hand (walk, strafe, crouch, sprint, draw) ----------
     The root stands at the feet facing -Z. Arms are placed by two-bone IK so the bow hand and the string hand land exactly
     where the bow and its string are; legs swing on a stride cycle. */
  const PGEO = {}, PMAT = {};
  const turned = (pts, seg = 12) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  function limbGeo(r0, r1, len, seg = 10) { const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10, y = -t * len, bulge = Math.sin(t * Math.PI) * .12 + 1; const r = lp(r0, r1, t) * bulge * (k === 0 || k === 10 ? .55 : 1); pts.push([Math.max(.004, r), y]); } return turned(pts, seg); }
  function peopleGeos() {
    if (PGEO.torso) return PGEO;
    const s = X && X.low ? 9 : 14;
    PGEO.torso = turned([[.02, -.02], [.14, 0], [.155, .08], [.17, .2], [.19, .3], [.165, .36], [.07, .41], [.04, .43]], s); PGEO.torso.scale(1, 1, .68);
    PGEO.vest = turned([[.15, .02], [.162, .1], [.176, .2], [.196, .3], [.17, .35], [.1, .37]], s); PGEO.vest.scale(1.04, 1, .74);
    PGEO.pelvis = turned([[.04, -.12], [.13, -.1], [.155, -.02], [.15, .05], [.13, .1]], s); PGEO.pelvis.scale(1, 1, .7);
    PGEO.skirt = turned([[.15, .06], [.16, -.02], [.19, -.14], [.215, -.26]], s); PGEO.skirt.scale(1, 1, .8);
    PGEO.head = new THREE.SphereGeometry(.105, s, s - 2); PGEO.head.scale(.9, 1.12, 1);
    PGEO.jaw = new THREE.SphereGeometry(.08, s, 8, 0, TAU, Math.PI * .45, Math.PI * .55); PGEO.jaw.scale(.95, .9, .95);
    PGEO.nose = new THREE.ConeGeometry(.018, .05, 6); PGEO.nose.rotateX(-Math.PI / 2 - .3);
    PGEO.eye = new THREE.SphereGeometry(.011, 6, 5);
    PGEO.hood = new THREE.SphereGeometry(.135, s, 10, Math.PI * 1.97, Math.PI * 1.06, 0, Math.PI * .74);   // open at the front (-Z), so the face shows PGEO.hood.scale(1, 1.12, 1.05);
    PGEO.cowl = turned([[.08, .02], [.13, -.04], [.21, -.12], [.24, -.17]], s); PGEO.cowl.scale(1, 1, .78);
    PGEO.upper = limbGeo(.058, .047, .29, s - 4); PGEO.fore = limbGeo(.047, .036, .26, s - 4); PGEO.bracer = limbGeo(.05, .045, .16, s - 4);
    PGEO.hand = new THREE.SphereGeometry(.045, 8, 6); PGEO.hand.scale(.75, 1.15, .95); PGEO.hand.translate(0, -.04, 0);
    PGEO.thigh = limbGeo(.085, .062, .45, s - 4); PGEO.shin = limbGeo(.062, .046, .43, s - 4); PGEO.boot = limbGeo(.058, .052, .25, s - 4);
    PGEO.foot = new THREE.SphereGeometry(.055, 8, 6); PGEO.foot.scale(.85, .6, 1.9); PGEO.foot.translate(0, -.02, -.07);
    PGEO.belt = new THREE.TorusGeometry(.155, .022, 6, 20); PGEO.belt.rotateX(Math.PI / 2); PGEO.belt.scale(1, 1, .72);
    PGEO.pouch = new THREE.BoxGeometry(.09, .1, .05);
    PGEO.quiver = new THREE.CylinderGeometry(.06, .05, .55, 10, 1, true); PGEO.quiverBot = new THREE.CircleGeometry(.05, 10);
    PGEO.fletch = new THREE.ConeGeometry(.009, .06, 4);
    PGEO.cape = new THREE.PlaneGeometry(.42, .7, 3, 6); PGEO.cape.translate(0, -.35, 0); { const p = PGEO.cape.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.abs(p.getX(i)) * .25 + p.getY(i) * -.05); }
    return PGEO;
  }
  function pmat(key, o) { if (!PMAT[key]) PMAT[key] = std(o); return PMAT[key]; }
  const SKINS = ['#e0b08c', '#c98f68', '#a26d4a', '#7a4f33', '#e8c3a2'], HAIRS = ['#2b1d12', '#4a3020', '#6b4a2a', '#1a1410', '#8a6a3a'];
  // one archer. o: { col, seed, dummy }
  function makePerson(o) {
    const G = peopleGeos(), R = W.rng(o.seed || 1), col = new THREE.Color(o.col || '#7fae5a');
    const cloth = pmat('cl' + col.getHexString(), { color: col.clone().convertSRGBToLinear().multiplyScalar(o.dummy ? 1 : .78), map: TEX.cloth, normalMap: TEX.clothN, roughness: .92 });
    const clothDark = pmat('cd' + col.getHexString(), { color: col.clone().convertSRGBToLinear().multiplyScalar(.5), map: TEX.cloth, normalMap: TEX.clothN, roughness: .95, side: THREE.DoubleSide });
    const leather = pmat('lea', { color: LC('#6a4a2e'), map: TEX.leather, roughness: .7 }), leatherD = pmat('lead', { color: LC('#3b2a1c'), map: TEX.leather, roughness: .75 });
    const trousers = pmat('tr' + (o.dummy ? 'd' : ''), { color: LC(o.dummy ? '#c9b07a' : '#4a4236'), map: TEX.cloth, roughness: .95 });
    const skin = o.dummy ? pmat('straw', { color: LC('#d6bf86'), map: TEX.cloth, roughness: 1 }) : pmat('sk' + (o.seed % 5), { color: LC(SKINS[(o.seed || 0) % 5]), roughness: .62 });
    const hair = pmat('hr' + (o.seed % 5), { color: LC(HAIRS[(o.seed || 0) % 5]), roughness: .8 }), dark = pmat('eye', { color: LC('#16110c'), roughness: .4 });
    const M = (g, m, x = 0, y = 0, z = 0, p) => { const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; (p || root).add(mesh); return mesh; };
    const J = (p, x, y, z) => { const j = new THREE.Group(); j.position.set(x, y, z); p.add(j); return j; };
    const root = new THREE.Group(), hips = J(root, 0, .98, 0), spine = J(hips, 0, .08, 0), chest = J(spine, 0, .14, 0), neck = J(chest, 0, .38, 0), head = J(neck, 0, .1, 0);
    M(G.pelvis, trousers, 0, 0, 0, hips); M(G.skirt, cloth, 0, 0, 0, hips); M(G.belt, leatherD, 0, .045, 0, hips); M(G.pouch, leather, .12, -.03, -.08, hips).rotation.y = .5;
    M(G.torso, cloth, 0, -.12, 0, chest); if (!o.dummy) M(G.vest, leather, 0, -.12, 0, chest);
    M(G.head, skin, 0, .02, 0, head); M(G.jaw, skin, 0, -.02, -.012, head);
    if (!o.dummy) { M(G.nose, skin, 0, .0, -.1, head); for (const s of [-1, 1]) M(G.eye, dark, s * .036, .025, -.088, head); M(G.hood, cloth, 0, .03, .01, head); M(G.cowl, cloth, 0, .3, 0, chest);
      if (R() < .5) M(new THREE.SphereGeometry(.07, 8, 6, 0, TAU, Math.PI * .5, Math.PI * .5), hair, 0, -.03, -.03, head).scale.set(1.05, .8, .9);
      const cape = M(G.cape, clothDark, 0, .28, .1, chest); cape.rotation.x = .12; root.userData.cape = cape;
      const q = J(chest, .07, .02, .16); q.rotation.set(.32, 0, -.5); M(G.quiver, leatherD, 0, 0, 0, q); M(G.quiverBot, leatherD, 0, -.275, 0, q).rotation.x = Math.PI / 2;
      root.userData.quiver = []; const fm = pmat('fl', { color: LC('#8a7d68'), roughness: .85 }); for (let k = 0; k < 9; k++) { const f = M(G.fletch, fm, (k % 3 - 1) * .022, .3 + (k % 2) * .015, (Math.floor(k / 3) - 1) * .022, q); root.userData.quiver.push(f); }
    } else { M(new THREE.CylinderGeometry(.03, .04, 1.3, 6), pmat('post', { color: LC('#5a4028'), roughness: .9 }), 0, .2, 0, root); const tg = cvs(64, 64); const g = tg[1]; for (const [r, c] of [[30, '#f1e6c8'], [22, '#b54a2c'], [14, '#f1e6c8'], [6, '#b54a2c']]) { g.fillStyle = c; g.beginPath(); g.arc(32, 32, r, 0, TAU); g.fill(); } M(new THREE.CircleGeometry(.13, 20), std({ map: tex(tg[0], { clamp: true }), roughness: .9 }), 0, .1, -.12, chest).rotation.y = Math.PI; }
    const arm = s => { const sh = J(chest, s * .2, .22, 0), up = M(G.upper, cloth, 0, 0, 0, sh), el = J(sh, 0, -.29, 0), fo = M(G.fore, s < 0 ? cloth : cloth, 0, 0, 0, el); if (s < 0 && !o.dummy) M(G.bracer, leather, 0, -.08, 0, el); const hd = J(el, 0, -.26, 0); M(G.hand, o.dummy ? skin : s > 0 ? leatherD : skin, 0, 0, 0, hd); return { sh, el, hd }; };
    const leg = s => { const hp = J(hips, s * .095, -.04, 0); M(G.thigh, trousers, 0, 0, 0, hp); const kn = J(hp, 0, -.45, 0); M(G.shin, trousers, 0, 0, 0, kn); if (!o.dummy) M(G.boot, leatherD, 0, -.19, 0, kn); const ft = J(kn, 0, -.43, 0); M(G.foot, o.dummy ? trousers : leatherD, 0, 0, 0, ft); return { hp, kn, ft }; };
    const P = { root, hips, spine, chest, neck, head, L: arm(-1), R: arm(1), LL: leg(-1), RL: leg(1), phase: 0, speed: 0, mvAng: 0, crouch: 0, draw: 0, raise: 0, sprint: 0, lastPos: null, dummy: !!o.dummy, bow: null, t: R() * 10 };
    if (!o.dummy) { P.bow = makeBow(o.bow || 'longbow'); chest.add(P.bow.g); }
    root.traverse(m => { if (m.isMesh) m.userData.person = P; });
    return P;
  }
  // two-bone IK: put the hand at `target` (in the shoulder's parent space) with the elbow toward `pole`
  let _v, DOWN, _q, _t, _p, _a;
  LAZY.push(() => { _v = [0, 1, 2, 3, 4].map(() => new THREE.Vector3()); DOWN = new THREE.Vector3(0, -1, 0); _q = new THREE.Quaternion(); _t = new THREE.Vector3(); _p = new THREE.Vector3(); _a = new THREE.Vector3(); });
  function ik(arm, target, pole, L1 = .29, L2 = .3) {
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
