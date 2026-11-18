  /* ---------- 74 agents: the rival's body and how it moves ----------
     Built to the hitboxes in 40-sim: about 1.82 m tall, 0.6 m across, head at eye height. Each operative has their own
     outfit and headgear, so you know who you face from the outline alone: Vex hooded with coat tails, Iris in a sleek
     helmet with a wrap-round visor and an aerial, Bastion broad with a bucket helm and heavy shoulders. The body is bones
     (hips, two-part legs, torso, head, arms); each bone's pieces are merged into one mesh per material. The arms are
     solved to the gun: the right hand goes to its grip and the left to wherever that gun is held, so hands sit on the weapon. */
  const KIT = {
    vex: { suit: '#2a2740', plate: '#4c4573', cloth: '#6a55c2', skin: '#b9886a', wide: 1 },
    iris: { suit: '#1b3640', plate: '#2f7480', cloth: '#d8e6e4', skin: '#8a5a3c', wide: .96 },
    bastion: { suit: '#474334', plate: '#8a7448', cloth: '#b9742a', skin: '#d2a47e', wide: 1.13 },
    nova: { suit: '#2b2a24', plate: '#d8c04a', cloth: '#3a3a40', skin: '#c58c66', wide: .95 },
    wraith: { suit: '#1d2130', plate: '#5c6684', cloth: '#a9b8ff', skin: '#b39a8a', wide: .97 },
    talon: { suit: '#2e3a24', plate: '#5f6f3c', cloth: '#8a6a40', skin: '#9a6b4a', wide: 1 },
    ember: { suit: '#3a2620', plate: '#7a3e22', cloth: '#ff7a2f', skin: '#d8a07a', wide: 1.02 },
    axiom: { suit: '#25303e', plate: '#d9dde3', cloth: '#5aa0ff', skin: '#8a5a3c', wide: 1.05 },
  };
  function agentModel(f) {
    const G = new THREE.Group(), op = OPS[f.op] || OPS.vex, kit = KIT[f.op] || KIT.vex, sh = !X.low, w = kit.wide; G.rotation.order = 'YXZ';
    const lam = c => new THREE.MeshLambertMaterial({ color: LC(c) });
    const M = { suit: lam(kit.suit), plate: lam(kit.plate), cloth: lam(kit.cloth), skin: lam(kit.skin), dark: lam('#15171c'), acc: lam(op.col), glow: new THREE.MeshBasicMaterial({ color: LC(op.col), toneMapped: false, side: THREE.DoubleSide }) };
    let T = G;
    const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); T.add(m); return m; };
    const cyl = (rt, rb2, h, seg = 12) => new THREE.CylinderGeometry(rt, rb2, h, seg), sph = (r, a = 14, b = 10) => new THREE.SphereGeometry(r, a, b);
    // a box with a rounded outline (seen from the front), d deep
    const rb = (bw, h, d, r = .015) => { r = Math.min(r, bw / 2 - .001, h / 2 - .001); const s = new THREE.Shape(), a = bw / 2 - r, b = h / 2 - r; s.moveTo(-a, -h / 2); s.lineTo(a, -h / 2); s.quadraticCurveTo(bw / 2, -h / 2, bw / 2, -b); s.lineTo(bw / 2, b); s.quadraticCurveTo(bw / 2, h / 2, a, h / 2); s.lineTo(-a, h / 2); s.quadraticCurveTo(-bw / 2, h / 2, -bw / 2, b); s.lineTo(-bw / 2, -b); s.quadraticCurveTo(-bw / 2, -h / 2, -a, -h / 2); const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 3 }); g.translate(0, 0, -d / 2); return g; };
    const turn = (pts, seg = 14) => { const q = pts.map(p => new THREE.Vector2(Math.max(.0001, p[0]), p[1])); if (q[0].y > q[q.length - 1].y) q.reverse(); return new THREE.LatheGeometry(q, seg); };   // [radius, height] pairs
    const bone = (par, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); par.add(g); return g; };
    const UP = new THREE.Vector3(0, 1, 0);
    const limb = (a, b, r0, r1, mat) => { const va = new THREE.Vector3(a[0], a[1], a[2]), d = new THREE.Vector3(b[0], b[1], b[2]).sub(va), L = d.length(), m = add(cyl(r1, r0, L, 10), mat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.quaternion.setFromUnitVectors(UP, d.normalize()); return m; };

    const hip = bone(G, 0, .95, 0);
    const leg = side => {
      const th = bone(hip, side * .115 * w, 0, 0); T = th;
      add(cyl(.1 * w, .08, .46), M.suit, 0, -.23, 0); add(rb(.125, .21, .03, .03), M.plate, 0, -.2, -.085); add(cyl(.102 * w, .102 * w, .035), M.dark, 0, -.06, 0);
      if (side > 0) { add(rb(.05, .15, .11, .015), M.dark, .1 * w, -.2, 0); add(rb(.03, .05, .04, .01), M.acc, .128 * w, -.15, 0); } else add(rb(.04, .1, .09, .012), M.cloth, -.1 * w, -.17, .01);
      const sn = bone(th, 0, -.46, 0); T = sn;
      add(cyl(.076, .058, .42), M.suit, 0, -.21, 0); const kn = add(sph(.085), M.plate, 0, -.005, -.028); kn.scale.set(1, 1.1, .8); add(rb(.105, .25, .03, .03), M.plate, 0, -.2, -.066); add(cyl(.07, .075, .06), M.dark, 0, -.38, 0);
      add(rb(.125, .095, .27, .035), M.dark, 0, -.433, -.045); add(rb(.132, .028, .285, .012), M.plate, 0, -.476, -.045);
      return { th, sn };
    };
    const L = leg(-1), Rg = leg(1);
    const torso = bone(hip, 0, 0, 0); T = torso;
    add(turn([[0, -.05], [.155 * w, -.05], [.176 * w, .03], [.172 * w, .12], [0, .12]]), M.suit).scale.z = .76;
    add(cyl(.18 * w, .18 * w, .055, 16), M.dark, 0, .1, 0).scale.z = .78; add(rb(.07, .05, .03, .012), M.acc, 0, .1, -.142 * w);
    for (const sx of [-1, 1]) add(rb(.075, .085, .05, .016), M.cloth, sx * .105 * w, .075, -.125 * w, 0, sx * -.45); add(rb(.16, .09, .06, .02), M.cloth, 0, .08, .135 * w);
    add(turn([[.166 * w, .12], [.176 * w, .2], [.212 * w, .37], [.218 * w, .47], [.16 * w, .545], [.075, .585], [0, .585]], 16), M.suit).scale.z = .66;
    // chest and back armour
    const front = new THREE.Shape(); [[-.15, .5], [.15, .5], [.168, .37], [.115, .215], [-.115, .215], [-.168, .37]].forEach((p, i) => i ? front.lineTo(p[0] * w, p[1]) : front.moveTo(p[0] * w, p[1]));
    const plateG = new THREE.ExtrudeGeometry(front, { depth: .035, bevelEnabled: true, bevelThickness: .014, bevelSize: .014, bevelSegments: 2 });
    add(plateG, M.plate, 0, 0, -.178 * w); add(plateG, M.plate, 0, 0, .13 * w); add(rb(.07, .07, .012, .02), M.acc, .065 * w, .42, -.196 * w, 0, 0, Math.PI / 4); for (let i = 0; i < 3; i++) add(rb(.058, .085, .035, .01), M.cloth, (-.068 + i * .068) * w, .27, -.2 * w);
    for (const sx of [-1, 1]) add(rb(.05, .2, .05, .015), M.dark, sx * .1 * w, .52, 0, .0, 0, 0);   // shoulder straps
    add(cyl(.058, .072, .1), M.skin, 0, .6, 0);
    // what they carry on their back, and their shoulders
    if (f.op === 'bastion') { add(rb(.3, .34, .15, .04), M.cloth, 0, .37, .21); add(cyl(.062, .062, .36, 12), M.plate, 0, .58, .2, 0, 0, Math.PI / 2); for (const sx of [-1, 1]) { const pd = add(rb(.17, .1, .2, .04), M.plate, sx * .285, .535, 0, 0, 0, sx * -.3); pd.scale.z = 1; add(rb(.12, .03, .15, .012), M.acc, sx * .3, .592, 0, 0, 0, sx * -.3); } }
    else if (f.op === 'iris') { add(rb(.22, .26, .09, .03), M.plate, 0, .38, .175); add(cyl(.006, .006, .34, 6), M.dark, .08, .66, .19); add(sph(.012, 8, 6), M.glow, .08, .835, .19); add(rb(.14, .03, .01, .01), M.glow, 0, .44, .222); for (const sx of [-1, 1]) add(sph(.098), M.plate, sx * .245 * w, .525, 0).scale.set(1, .8, 1); }
    else if (f.op === 'vex') { add(rb(.24, .28, .1, .03), M.dark, 0, .37, .175); for (const sx of [-1, 1]) add(sph(.1), M.cloth, sx * .25 * w, .525, 0).scale.set(1.05, .8, 1.05); }
    else {
      for (const sx of [-1, 1]) add(rb(.12, .08, .15, .03), M.plate, sx * .262 * w, .535, 0, 0, 0, sx * -.28);   // shoulder pads
      if (f.op === 'nova') { add(rb(.18, .22, .08, .03), M.plate, 0, .38, .17); add(rb(.04, .18, .02, .01), M.glow, 0, .38, .215); for (const sx of [-1, 1]) add(cyl(.025, .025, .2, 8), M.dark, sx * .07, .38, .2); }
      else if (f.op === 'wraith') { add(rb(.34, .58, .014, .03), M.cloth, 0, .24, .17, -.06); add(rb(.36, .05, .04, .015), M.plate, 0, .52, .16); }
      else if (f.op === 'talon') { const q = add(cyl(.055, .05, .42, 10), M.cloth, .08, .36, .19, 0, 0, -.45); for (let k = 0; k < 3; k++) add(new THREE.ConeGeometry(.018, .07, 6), M.glow, .16 + k * .022, .58 - k * .012, .19 + (k - 1) * .025, 0, 0, -.45); add(rb(.05, .3, .015, .01), M.dark, 0, .36, .16, 0, 0, .6); }
      else if (f.op === 'ember') { for (const sx of [-1, 1]) { add(cyl(.065, .065, .34, 12), M.plate, sx * .075, .37, .2); add(sph(.065, 12, 8), M.plate, sx * .075, .54, .2); } add(new THREE.TorusGeometry(.12, .015, 6, 16, Math.PI), M.dark, 0, .55, .25, 0, 0, 0); add(rb(.05, .04, .02, .01), M.glow, 0, .3, .27); }
      else if (f.op === 'axiom') { add(rb(.26, .3, .14, .035), M.suit, 0, .37, .2); add(rb(.2, .06, .02, .01), M.glow, 0, .44, .275); add(cyl(.008, .008, .36, 6), M.dark, -.09, .66, .22); add(sph(.018, 8, 6), M.glow, -.09, .845, .22); }
    }
    // coat tails that swing as they run (Vex only)
    const tails = bone(torso, 0, .1, .1 * w); if (f.op === 'vex') { T = tails; for (const sx of [-1, 1]) add(rb(.15, .5, .014, .03), M.cloth, sx * .085, -.26, .02, .08, 0, sx * .06); T = torso; }
    // the head
    const head = bone(torso, 0, .7, 0); T = head;
    add(sph(.124), M.skin); add(rb(.16, .075, .1, .03), M.suit, 0, -.07, -.062);
    if (f.op === 'vex') {
      add(new THREE.SphereGeometry(.16, 18, 12, 0, TAU, 0, Math.PI * .64), M.cloth, 0, .012, .018); add(new THREE.TorusGeometry(.128, .024, 8, 20), M.cloth, 0, .0, -.05, .12); add(new THREE.ConeGeometry(.09, .16, 10), M.cloth, 0, .06, .16, 1.9);
      add(rb(.19, .034, .03, .012), M.glow, 0, .012, -.118); add(new THREE.TorusGeometry(.105, .042, 8, 18), M.cloth, 0, -.125, .0, Math.PI / 2);
    } else if (f.op === 'iris') {
      const dome = add(new THREE.SphereGeometry(.152, 18, 12, 0, TAU, 0, Math.PI * .56), M.plate, 0, .012, .008); dome.scale.set(1, .96, 1.08);
      add(new THREE.CylinderGeometry(.137, .132, .062, 22, 1, true, Math.PI - 1.15, 2.3), M.glow, 0, .004, 0); add(rb(.3, .016, .02, .006), M.plate, 0, .042, -.115);
      for (const sx of [-1, 1]) add(cyl(.042, .042, .03, 14), M.plate, sx * .148, -.005, .01, 0, 0, Math.PI / 2); add(cyl(.005, .005, .2, 6), M.dark, -.15, .11, .03); add(sph(.01, 8, 6), M.glow, -.15, .215, .03); add(rb(.05, .05, .05, .01), M.dark, 0, -.085, -.11);
    } else if (f.op === 'nova') {   // a sleek half helmet, a crest fin and a gold visor
      add(new THREE.SphereGeometry(.147, 18, 12, 0, TAU, 0, Math.PI * .5), M.plate, 0, .012, .012); add(rb(.026, .12, .3, .01), M.acc, 0, .145, .02);
      add(rb(.27, .034, .03, .012), M.glow, 0, .005, -.124); for (const sx of [-1, 1]) add(rb(.022, .085, .08, .008), M.plate, sx * .142, -.015, -.035);
    } else if (f.op === 'wraith') {   // a close cowl, a high collar and a blank mask with two slits
      add(new THREE.SphereGeometry(.158, 18, 12, 0, TAU, 0, Math.PI * .62), M.suit, 0, .014, .022); add(rb(.19, .2, .05, .05), M.plate, 0, -.025, -.118);
      for (const sx of [-1, 1]) add(rb(.05, .013, .02, .006), M.glow, sx * .045, .008, -.146); add(new THREE.CylinderGeometry(.152, .128, .15, 16, 1, true), M.cloth, 0, -.12, 0);
    } else if (f.op === 'talon') {   // a brimmed ranger's cap, goggles pushed up, a feather
      add(new THREE.SphereGeometry(.15, 16, 10, 0, TAU, 0, Math.PI * .5), M.cloth, 0, .02, 0); add(cyl(.21, .21, .014, 20), M.cloth, 0, .03, -.025);
      for (const sx of [-1, 1]) { add(cyl(.032, .032, .03, 12), M.dark, sx * .05, .075, -.135, Math.PI / 2); add(cyl(.024, .024, .032, 12), M.glow, sx * .05, .075, -.14, Math.PI / 2); }
      add(rb(.016, .17, .004, .006), M.acc, .15, .1, .05, 0, 0, -.5);
    } else if (f.op === 'ember') {   // a respirator with two filters and a crest of flame
      add(rb(.17, .09, .085, .03), M.dark, 0, -.06, -.1); for (const sx of [-1, 1]) add(cyl(.032, .036, .045, 10), M.plate, sx * .072, -.07, -.138, Math.PI / 2);
      for (let i = 0; i < 5; i++) add(new THREE.ConeGeometry(.034, .15, 6), M.glow, 0, .13 + (2 - Math.abs(i - 2)) * .022, -.09 + i * .045, -.25 + i * .12);
    } else if (f.op === 'axiom') {   // an engineer's hard hat with a lamp and a glowing visor
      add(turn([[0, .175], [.11, .165], [.155, .1], [.165, .03], [.2, .005], [.2, -.008], [0, -.008]], 18), M.plate, 0, .018, 0); add(rb(.23, .045, .03, .012), M.glow, 0, -.008, -.128);
      add(cyl(.028, .028, .03, 10), M.dark, 0, .16, -.12, Math.PI / 2); add(sph(.02, 8, 6), M.glow, 0, .16, -.137);
    } else {
      add(turn([[0, .185], [.1, .178], [.158, .13], [.17, .02], [.174, -.075], [.15, -.075]], 16), M.plate, 0, 0, .004); add(rb(.3, .045, .07, .015), M.plate, 0, .055, -.13); add(rb(.34, .03, .3, .012), M.dark, 0, -.065, 0);
      add(rb(.21, .03, .02, .008), M.glow, 0, .005, -.172); add(rb(.032, .09, .02, .008), M.glow, 0, -.045, -.172); for (const sx of [-1, 1]) add(rb(.02, .1, .1, .008), M.acc, sx * .172, .0, -.02);
    }
    // arms: rebuilt whenever the gun changes, so the hands land on it
    const arms = bone(torso, 0, .5, 0), armMesh = bone(arms, 0, 0, 0), gunHold = bone(arms, 0, 0, 0);
    const pose = gd => {
      while (armMesh.children.length) { const c = armMesh.children[0]; armMesh.remove(c); if (c.geometry) c.geometry.dispose(); }
      const s = 1.08, a = .29, b = .27, knife = gd.k === 'knife';
      gunHold.position.set(...(knife ? [.17, -.17, -.33] : gd.pistolHold ? [.02, -.05, -.46] : [.085, -.1, -.3]));
      const hold = gunHold.position, Rt = [hold.x + gd.grip[0] * s, hold.y + gd.grip[1] * s, hold.z + gd.grip[2] * s];
      let Lt = knife ? [-.2, -.34, -.2] : gd.pistolHold ? [Rt[0] - .05, Rt[1] - .015, Rt[2] + .005] : [hold.x + gd.sup[0] * s - .01, hold.y + gd.sup[1] * s, hold.z + gd.sup[2] * s];
      const SR = [.235 * w, 0, 0], SL = [-.235 * w, 0, 0];
      while (Math.hypot(Lt[0] - SL[0], Lt[1] - SL[1], Lt[2] - SL[2]) > a + b - .02 && Lt[2] < -.2) Lt[2] += .02;   // a long handguard: slide the hand back to where the arm reaches
      T = armMesh;
      for (const [S, Tg, px] of [[SR, Rt, 1], [SL, Lt, -1]]) {
        const d = new THREE.Vector3(Tg[0] - S[0], Tg[1] - S[1], Tg[2] - S[2]), Ld = Math.min(d.length(), a + b - .005); d.normalize();
        const x = (a * a - b * b + Ld * Ld) / (2 * Ld), h = Math.sqrt(Math.max(0, a * a - x * x)), pole = new THREE.Vector3(px * .7, -1, .2); pole.addScaledVector(d, -pole.dot(d)).normalize();
        const E = [S[0] + d.x * x + pole.x * h, S[1] + d.y * x + pole.y * h, S[2] + d.z * x + pole.z * h], Hn = [S[0] + d.x * Ld, S[1] + d.y * Ld, S[2] + d.z * Ld];
        limb(S, E, .064, .054, M.suit); limb(E, Hn, .052, .042, M.suit); add(sph(.057, 10, 8), M.plate, E[0], E[1], E[2]); add(sph(.05, 10, 8), M.dark, Hn[0], Hn[1], Hn[2]);
        const mid = [(E[0] + Hn[0]) / 2, (E[1] + Hn[1]) / 2, (E[2] + Hn[2]) / 2]; add(sph(.056, 10, 8), M.acc, mid[0], mid[1], mid[2]).scale.set(1, .5, 1);
      }
      bake(armMesh, sh);
    };
    bake(G, sh);
    G.userData = { hip, L, Rg, torso, head, arms, gunHold, tails, pose, gk: '', flash: null, op: f.op, dead: 0 };
    X.scene.add(G); return G;
  }
  // enemies wear a red outline you can pick out at a glance, even in shade or against a busy wall: every piece of the body
  // and gun gets a copy drawn from the inside, pushed out along its normals in flat red. The push grows with distance, so the
  // line stays about two pixels wide whether they are across the site or in your face. Walls and smoke still hide it.
  let OLM = null;
  function outlineMat() {
    if (OLM) return OLM;
    OLM = new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(FOE) }, k: { value: .0036 } }, side: THREE.BackSide,
      vertexShader: 'uniform float k; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vec3 n = normalize(mat3(modelMatrix) * normal); w.xyz += n * (k * length(w.xyz - cameraPosition) + .006); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 col; void main() { gl_FragColor = vec4(col, 1.0); }' });
    return OLM;
  }
  function outline(root, show) {
    const add = []; root.traverse(o => { if (o.isMesh && !o.userData.isOL && !o.userData.ol && !(o.material && o.material.transparent)) add.push(o); });
    for (const o of add) { const m = new THREE.Mesh(o.geometry, outlineMat()); m.userData.isOL = true; m.raycast = () => {}; m.frustumCulled = o.frustumCulled; o.add(m); o.userData.ol = m; }
    root.traverse(o => { if (o.userData.isOL) o.visible = show; });
  }
  function updateAgent(f, dt) {
    let A = X.agents.get(f);
    if (!A || A.userData.op !== f.op) { if (A) X.scene.remove(A); A = agentModel(f); X.agents.set(f, A); }
    const U = A.userData, fk = gun(f).k;
    if (U.gk !== fk) { while (U.gunHold.children.length) U.gunHold.remove(U.gunHold.children[0]); const gm = gunModel(fk, { cast: !X.low, flash: true }); gm.scale.setScalar(1.08); U.gunHold.add(gm); U.gk = fk; U.flash = gm.userData.flash; U.pose(gm.userData); }
    A.visible = true; A.position.set(ipos(f, 'x'), ipos(f, 'y'), ipos(f, 'z')); A.rotation.y = f.yaw;
    { const P = M ? me() : null, foeSide = !!P && f.team !== P.team, op = f.cloak > 0 && f.alive ? (foeSide ? .07 : .35) : 1; U.cop = lp(U.cop == null ? 1 : U.cop, op, Math.min(1, dt * 10));
      if (Math.abs((U.copSet || 1) - U.cop) > .01 || (U.cop < 1 && U.copGk !== U.gk)) { const o2 = U.cop > .99 ? 1 : U.cop; const walk = o => { if (o === U.gunHold) return; if (o.isMesh && !o.userData.isOL && o.material && !o.material.isShaderMaterial) { o.material.transparent = o2 < 1; o.material.opacity = o2; o.material.depthWrite = o2 >= 1; } for (const c of o.children) walk(c); }; walk(A); U.copSet = o2; U.copGk = U.gk; }
      U.gunHold.visible = U.cop > .5;
      const red = foeSide && f.alive && U.cop > .9; if (U.olOn !== red || U.olGk !== U.gk) { outline(A, red); U.olOn = red; U.olGk = U.gk; } }
    const sp = Math.hypot(f.vx, f.vz), sl = f.slide ? 1 : 0, amp = Math.min(1, sp / 3.5) * (f.sprinting ? 1.15 : .8) * (1 - sl), ph = f.walkT * 1.9, cr = f.crouch * (1 - sl);
    U.sl = lp(U.sl || 0, sl, Math.min(1, dt * 12)); U.spr = lp(U.spr || 0, f.sprinting ? 1 : 0, Math.min(1, dt * 8)); const sk = U.sl;
    // legs: swing with the stride, the trailing knee bends; a crouch folds both
    for (const [lg, o] of [[U.L, 0], [U.Rg, Math.PI]]) { const s = Math.sin(ph + o); lg.th.rotation.x = s * amp + cr * 1.1; lg.sn.rotation.x = -Math.max(0, -Math.cos(ph + o)) * amp * 1.2 - cr * 1.9; }
    // a slide: the lead leg out straight, the other tucked, leaning back low; a sprint: leaning into it
    if (sk > .01) { U.L.th.rotation.x = lp(U.L.th.rotation.x, -1.35, sk); U.L.sn.rotation.x = lp(U.L.sn.rotation.x, 0, sk); U.Rg.th.rotation.x = lp(U.Rg.th.rotation.x, -.4, sk); U.Rg.sn.rotation.x = lp(U.Rg.sn.rotation.x, -2.1, sk); }
    U.hip.position.y = .95 - cr * .4 - sk * .55 + Math.abs(Math.sin(ph)) * amp * .03;
    U.torso.rotation.x = -cr * .3 - amp * .1 - f.pitch * .1 - U.spr * .22 + sk * .5; U.torso.rotation.y = Math.sin(ph) * amp * .09; U.torso.position.y = Math.sin(X.t * 1.7 + f.x) * .004;
    U.tails.rotation.x = .1 + amp * .55 + Math.sin(ph * 2) * amp * .08 + cr * .5;
    const sw = f.swing ? Math.sin(Math.min(1, f.swing.t / .4) * Math.PI) : 0;
    U.arms.rotation.x = f.pitch * .9 + f.kick * 1.2 - (f.swing && f.swing.heavy ? 0 : sw * .7) + Math.sin(ph * 2) * amp * .03; U.arms.rotation.y = f.swing && !f.swing.heavy ? (f.swing.t / .4 - .5) * 1.3 * (f.swing.side || 1) * (sw > 0 ? 1 : 0) : 0; U.arms.position.z = f.swing && f.swing.heavy ? -sw * .25 : 0;
    U.arms.rotation.x -= U.spr * .5;   // gun down while sprinting
    U.head.rotation.x = f.pitch * .6 - sk * .3;
    if (U.flash) { U.flash.visible = f.kick > .05 && f.alive && !gun(f).melee; if (U.flash.visible) U.flash.material.rotation = Math.random() * 6; }
    // the rival's gun works too: slide, bolt, pump, magazine; and the arms tip it over to reload
    { const gm = U.gunHold.children[0], G = gun(f); if (gm && gm.userData.parts) animParts(gm, f, G, dt, false);
      const rt = f.reloadT > 0 ? 1 - f.reloadT / G.rel : -1, tl = rt < 0 ? 0 : sm(cl(rt / .14, 0, 1)) * (1 - sm(cl((rt - .88) / .12, 0, 1))); U.arms.rotation.z = -tl * .45; U.arms.rotation.x -= tl * .35; }
    // a dead fighter falls back and stays down
    U.dead = f.alive ? 0 : Math.min(1, U.dead + dt * 2.6); const d = smooth(U.dead);
    A.rotation.x = d * 1.5; A.position.y = f.y + d * .14;
  }
