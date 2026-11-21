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
  // the agents' materials: fabric with a woven grain, armour plates with panel lines and worn edges, skin, rubber and
  // trim, all lit by the map's reflections. Made once per operative and shared by every copy.
  const AGM = {}, AGTX = {};
  function agentTex() {
    if (AGTX.fab) return AGTX;
    AGTX.fab = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { const v = 175 + (((x >> 2) + (y >> 2)) % 2 ? 22 : -10) + R() * 20; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 4, 2); } for (let i = 0; i < 30; i++) { g.strokeStyle = 'rgba(90,90,90,.25)'; g.lineWidth = 1; g.beginPath(); const y = R() * h; g.moveTo(0, y); g.lineTo(w, y + (R() - .5) * 20); g.stroke(); } }, [4, 4]);
    AGTX.plate = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d6d6d6'; g.fillRect(0, 0, w, h); for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${R() < .5 ? '0,0,0' : '255,255,255'},${R() * .06})`; g.fillRect(R() * w, R() * h, 2, 2); } g.strokeStyle = 'rgba(40,40,40,.55)'; g.lineWidth = 2; for (const y of [64, 160]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } for (const x of [96, 200]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(R() * w, R() * h, R() * 14, 1.5); } g.fillStyle = 'rgba(30,30,30,.6)'; for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(R() * w, R() * h, 2.5, 0, TAU); g.fill(); } }, [2, 2]);
    return AGTX;
  }
  function agentMats(id, kit, op) {
    if (AGM[id]) return AGM[id]; const T = agentTex(), env = m => { if (X.env) { m.envMap = X.env; m.envMapIntensity = .7; } return m; };
    const st = (c, o) => env(new THREE.MeshStandardMaterial(Object.assign({ color: LC(c) }, o)));
    return AGM[id] = { suit: st(kit.suit, { map: T.fab, roughness: .88, metalness: 0 }), plate: st(kit.plate, { map: T.plate, roughness: .42, metalness: .35 }), cloth: st(kit.cloth, { map: T.fab, roughness: .82, metalness: 0 }),
      skin: st(kit.skin, { roughness: .62, metalness: 0 }), dark: st('#15171c', { roughness: .6, metalness: .25 }), acc: st(op.col, { roughness: .35, metalness: .5, emissive: LC(op.col), emissiveIntensity: .12 }),
      metal: st('#9aa3ad', { roughness: .3, metalness: .9 }), glow: new THREE.MeshBasicMaterial({ color: LC(op.col), toneMapped: false, side: THREE.DoubleSide }) };
  }
  let SHP = null;
  function shadowShapes() {
    if (SHP) return SHP; const leg = new THREE.CylinderGeometry(.095, .07, .92, 8), body = new THREE.CylinderGeometry(.2, .17, .64, 10), head = new THREE.SphereGeometry(.16, 10, 8);
    body.translate(0, .27, 0); head.translate(0, .7, 0); const bh = [body, head].map(g => g.toNonIndexed()), n = bh[0].attributes.position.count + bh[1].attributes.position.count, P = new Float32Array(n * 3);
    P.set(bh[0].attributes.position.array, 0); P.set(bh[1].attributes.position.array, bh[0].attributes.position.count * 3); const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(P, 3)); bg.computeBoundingSphere();
    return SHP = { m: new THREE.MeshBasicMaterial({ color: '#000000' }), leg, body: bg, arm: new THREE.CylinderGeometry(.07, .06, .5, 6) };
  }
  function pxHide(r, s, c, geo) { geo.drawRange.count = 0; }
  function pxShow(r, s, c, geo) { geo.drawRange.count = Infinity; }
  function agentModel(f) {
    const G = new THREE.Group(), op = OPS[f.op] || OPS.vex, kit = KIT[f.op] || KIT.vex, sh = !X.low, w = kit.wide; G.rotation.order = 'YXZ';
    const M = agentMats(f.op, kit, op);
    let T = G;
    const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); T.add(m); return m; };
    const cyl = (rt, rb2, h, seg = 12) => new THREE.CylinderGeometry(rt, rb2, h, seg), sph = (r, a = 14, b = 10) => new THREE.SphereGeometry(r, a, b);
    // a box with a rounded outline (seen from the front), d deep
    const rb = (bw, h, d, r = .015) => { r = Math.min(r, bw / 2 - .001, h / 2 - .001); const s = new THREE.Shape(), a = bw / 2 - r, b = h / 2 - r; s.moveTo(-a, -h / 2); s.lineTo(a, -h / 2); s.quadraticCurveTo(bw / 2, -h / 2, bw / 2, -b); s.lineTo(bw / 2, b); s.quadraticCurveTo(bw / 2, h / 2, a, h / 2); s.lineTo(-a, h / 2); s.quadraticCurveTo(-bw / 2, h / 2, -bw / 2, b); s.lineTo(-bw / 2, -b); s.quadraticCurveTo(-bw / 2, -h / 2, -a, -h / 2); const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 3 }); g.translate(0, 0, -d / 2); return g; };
    const turn = (pts, seg = 14) => { const q = pts.map(p => new THREE.Vector2(Math.max(.0001, p[0]), p[1])); if (q[0].y > q[q.length - 1].y) q.reverse(); return new THREE.LatheGeometry(q, seg); };   // [radius, height] pairs
    const bone = (par, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); par.add(g); return g; };
    const UP = new THREE.Vector3(0, 1, 0);
    const limb = (a, b, r0, r1, mat) => { const va = new THREE.Vector3(a[0], a[1], a[2]), d = new THREE.Vector3(b[0], b[1], b[2]).sub(va), L = d.length(), m = add(cyl(r1, r0, L, 10), mat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.quaternion.setFromUnitVectors(UP, d.normalize()); return m; };

    /* An athletic frame under a plate carrier: broad shoulders, a waist, thighs that taper to the knee, calves, proper
       boots, pads at the knees. Each leg is hip, knee and ankle, so the boots stay flat on the floor whatever the knees do. */
    const hip = bone(G, 0, .95, 0);
    const leg = side => {
      const th = bone(hip, side * .112 * w, 0, 0); th.rotation.order = 'ZXY'; T = th;
      add(turn([[0, .03], [.098 * w, .03], [.113 * w, -.06], [.107 * w, -.2], [.09, -.36], [.08, -.46]], 14), M.suit).scale.z = 1.1;   // thigh
      add(rb(.132 * w, .2, .036, .04), M.plate, 0, -.2, -.103);   // thigh plate
      for (const y of [-.1, -.3]) add(cyl(.112 * w - (y < -.2 ? .014 : 0), .112 * w - (y < -.2 ? .018 : .004), .024, 14), M.dark, 0, y, 0).scale.z = 1.1;   // straps
      if (side > 0) { add(rb(.052, .17, .12, .016), M.dark, .118 * w, -.2, .005); add(rb(.03, .06, .05, .01), M.acc, .146 * w, -.165, .005); add(rb(.034, .07, .034, .008), M.metal, .122 * w, -.095, .02); }   // holster and sidearm
      else { add(rb(.046, .12, .1, .014), M.cloth, -.118 * w, -.19, .01); add(rb(.022, .13, .036, .006), M.metal, -.146 * w, -.2, .012, .15); }   // pouch and knife
      const sn = bone(th, 0, -.46, 0); T = sn;
      add(turn([[.076, 0], [.085, -.1], [.076, -.21], [.06, -.33], [.056, -.42]], 14), M.suit, 0, 0, .01);   // shin and calf
      const kn = add(sph(.09, 12, 10), M.plate, 0, -.005, -.034); kn.scale.set(1, 1.18, .74); add(rb(.07, .06, .024, .02), M.dark, 0, -.005, -.096);   // knee pad
      add(rb(.11, .25, .034, .034), M.plate, 0, -.215, -.07);   // shin guard
      const ft = bone(sn, 0, -.42, 0); ft.rotation.order = 'XZY'; T = ft;
      add(cyl(.064, .072, .11, 12), M.dark, 0, .005, .004);   // boot collar
      add(rb(.122, .09, .2, .03), M.dark, 0, -.02, -.028); add(sph(.063, 12, 8), M.dark, 0, -.028, -.135).scale.set(.97, .64, 1.1);   // boot and toe
      add(rb(.132, .03, .3, .012), M.plate, 0, -.055, -.048); add(rb(.06, .04, .014, .008), M.acc, 0, -.005, .076);   // sole, heel tab
      return { th, sn, ft };
    };
    const L = leg(-1), Rg = leg(1);
    const torso = bone(hip, 0, 0, 0); T = torso;
    add(turn([[0, -.085], [.1 * w, -.085], [.166 * w, -.03], [.174 * w, .05], [.164 * w, .12], [0, .12]], 16), M.suit).scale.z = .8;   // pelvis
    add(rb(.1, .12, .04, .03), M.plate, 0, -.03, -.122 * w);
    add(cyl(.172 * w, .172 * w, .055, 16), M.dark, 0, .11, 0).scale.z = .8; add(rb(.07, .05, .03, .012), M.acc, 0, .11, -.142 * w);   // belt and buckle
    for (const sx of [-1, 1]) add(rb(.075, .085, .05, .016), M.cloth, sx * .105 * w, .085, -.125 * w, 0, sx * -.45); add(rb(.16, .09, .06, .02), M.cloth, 0, .09, .135 * w);
    add(turn([[.16 * w, .12], [.153 * w, .2], [.166 * w, .29], [.2 * w, .39], [.224 * w, .47], [.212 * w, .52], [.15 * w, .57], [.078, .6], [0, .6]], 18), M.suit).scale.z = .72;   // waist to shoulders
    for (const sx of [-1, 1]) add(sph(.084, 12, 10), M.suit, sx * .232 * w, .5, 0);   // the shoulders the arms hang from
    add(rb(.2 * w, .08, .03, .02), M.plate, 0, .165, -.126 * w);   // belly plate
    // chest and back armour
    const front = new THREE.Shape(); [[-.15, .5], [.15, .5], [.168, .37], [.115, .215], [-.115, .215], [-.168, .37]].forEach((p, i) => i ? front.lineTo(p[0] * w, p[1]) : front.moveTo(p[0] * w, p[1]));
    const plateG = new THREE.ExtrudeGeometry(front, { depth: .035, bevelEnabled: true, bevelThickness: .014, bevelSize: .014, bevelSegments: 2 });
    add(plateG, M.plate, 0, 0, -.178 * w); add(plateG, M.plate, 0, 0, .13 * w); add(rb(.07, .07, .012, .02), M.acc, .065 * w, .42, -.196 * w, 0, 0, Math.PI / 4); for (let i = 0; i < 3; i++) add(rb(.058, .085, .035, .01), M.cloth, (-.068 + i * .068) * w, .27, -.2 * w);
    for (const sx of [-1, 1]) add(rb(.05, .2, .05, .015), M.dark, sx * .1 * w, .52, 0, .0, 0, 0);   // shoulder straps
    // the trim: glowing edges down the chest plate and across the collar bone, chevrons on both shoulders, a collar ring
    for (const sx of [-1, 1]) { add(rb(.008, .2, .01, .003), M.glow, sx * .135 * w, .36, -.214 * w, 0, 0, sx * -.32); add(rb(.05, .008, .01, .003), M.glow, sx * .06 * w, .49, -.214 * w);
      const ch = add(new THREE.ConeGeometry(.028, .03, 3), M.glow, sx * .232 * w, .47, -.05, 0, 0, Math.PI); ch.scale.z = .3; ch.rotation.y = sx * Math.PI / 2; }
    add(new THREE.TorusGeometry(.078, .014, 8, 18), M.plate, 0, .575, 0, Math.PI / 2);
    // the belt: pouches round it, a holster with a sidearm on the right hip, a knife on the left
    T = torso; for (let i = 0; i < 4; i++) { const a = -2.2 + i * .55; add(rb(.06, .07, .04, .012), i % 2 ? M.cloth : M.dark, Math.sin(a) * .17 * w, .02, Math.cos(a) * -.13 * w, 0, -a); }
    add(rb(.03, .02, .025, .006), M.metal, 0, .11, -.15 * w);
    add(cyl(.056, .07, .11), M.skin, 0, .6, 0); add(cyl(.074, .09, .05, 14), M.suit, 0, .575, 0);
    const cap = (sx, mat, k = 1) => { const c = add(sph(.104 * k, 14, 10), mat, sx * .25 * w, .555, 0, 0, 0, sx * -.38); c.scale.set(1.12, .6, 1.16); const c2 = add(sph(.09 * k, 12, 8), M.dark, sx * .262 * w, .525, 0, 0, 0, sx * -.38); c2.scale.set(1.12, .5, 1.16); };
    // what they carry on their back, and their shoulders
    if (f.op === 'bastion') { add(rb(.3, .34, .15, .04), M.cloth, 0, .37, .21); add(cyl(.062, .062, .36, 12), M.plate, 0, .58, .2, 0, 0, Math.PI / 2); for (const sx of [-1, 1]) { const pd = add(rb(.17, .1, .2, .04), M.plate, sx * .285, .535, 0, 0, 0, sx * -.3); pd.scale.z = 1; add(rb(.12, .03, .15, .012), M.acc, sx * .3, .592, 0, 0, 0, sx * -.3); } }
    else if (f.op === 'iris') { add(rb(.22, .26, .09, .03), M.plate, 0, .38, .175); add(cyl(.006, .006, .34, 6), M.dark, .08, .66, .19); add(sph(.012, 8, 6), M.glow, .08, .835, .19); add(rb(.14, .03, .01, .01), M.glow, 0, .44, .222); for (const sx of [-1, 1]) cap(sx, M.plate); }
    else if (f.op === 'vex') { add(rb(.24, .28, .1, .03), M.dark, 0, .37, .175); for (const sx of [-1, 1]) cap(sx, M.cloth, 1.06); }
    else {
      for (const sx of [-1, 1]) { add(rb(.13, .07, .17, .03), M.plate, sx * .262 * w, .565, 0, 0, 0, sx * -.32); add(rb(.11, .05, .15, .02), M.plate, sx * .292 * w, .515, 0, 0, 0, sx * -.62); }   // shoulder pads: two overlapping plates
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
    // a head with a face: a skull a little taller than it is wide, ears, brows over dark eyes, a nose, and a gaiter pulled up
    // over the jaw and neck (each operative's own mask, visor or helmet goes on top)
    add(sph(.124, 16, 12), M.skin).scale.set(.95, 1.06, 1); add(new THREE.SphereGeometry(.131, 16, 8, 0, TAU, Math.PI * .57, Math.PI * .43), M.suit).scale.set(.96, 1.06, 1.01);
    add(rb(.075, .05, .03, .016), M.dark, 0, -.068, -.116); if (!['vex', 'bastion', 'wraith'].includes(f.op)) add(sph(.02, 8, 6), M.skin, 0, -.014, -.121).scale.set(.75, 1.1, 1);   // (not under a hood, a helm or a mask)
    for (const sx of [-1, 1]) { add(rb(.036, .014, .012, .005), M.dark, sx * .043, .012, -.112, 0, sx * -.3); add(rb(.044, .01, .014, .004), M.suit, sx * .043, .03, -.113, 0, sx * -.3, sx * -.1); add(sph(.022, 8, 6), M.skin, sx * .116, -.002, .004).scale.set(.45, 1, .75); }
    if (f.op === 'vex') {
      add(new THREE.SphereGeometry(.16, 18, 12, 0, TAU, 0, Math.PI * .64), M.cloth, 0, .012, .018); add(new THREE.TorusGeometry(.128, .024, 8, 20), M.cloth, 0, .0, -.05, .12); add(new THREE.ConeGeometry(.09, .16, 10), M.cloth, 0, .06, .16, 1.9);
      add(rb(.19, .034, .03, .012), M.glow, 0, .012, -.118); add(new THREE.TorusGeometry(.105, .042, 8, 18), M.cloth, 0, -.125, .0, Math.PI / 2);
    } else if (f.op === 'iris') {
      const dome = add(new THREE.SphereGeometry(.152, 18, 12, 0, TAU, 0, Math.PI * .56), M.plate, 0, .012, .008); dome.scale.set(1, .96, 1.08);
      add(new THREE.CylinderGeometry(.137, .132, .062, 22, 1, true, Math.PI - 1.15, 2.3), M.glow, 0, .004, 0); add(rb(.3, .016, .02, .006), M.plate, 0, .042, -.115);
      for (const sx of [-1, 1]) add(cyl(.042, .042, .03, 14), M.plate, sx * .148, -.005, .01, 0, 0, Math.PI / 2); add(cyl(.005, .005, .2, 6), M.dark, -.15, .11, .03); add(sph(.01, 8, 6), M.glow, -.15, .215, .03); add(rb(.05, .05, .05, .01), M.dark, 0, -.085, -.11);
    } else if (f.op === 'nova') {   // a sleek half helmet, a crest fin and a gold visor
      add(new THREE.SphereGeometry(.147, 18, 12, 0, TAU, 0, Math.PI * .5), M.plate, 0, .012, .012); { const fs = new THREE.Shape(); [[.15, 0], [-.15, 0], [-.19, .11], [-.06, .05]].forEach((q, i) => i ? fs.lineTo(q[0], q[1]) : fs.moveTo(q[0], q[1])); add(new THREE.ExtrudeGeometry(fs, { depth: .022, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 1 }), M.acc, -.011, .135, .03, 0, Math.PI / 2, 0); }
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
      gunHold.position.set(...(knife ? [.17, -.17, -.33] : gd.pistolHold ? [.03, -.04, -.47] : gd.k === 'stub' ? [.09, -.11, -.36] : [.118, -.07, -.255]));
      const hold = gunHold.position, Rt = [hold.x + gd.grip[0] * s, hold.y + gd.grip[1] * s, hold.z + gd.grip[2] * s];
      let Lt = knife ? [-.2, -.34, -.2] : gd.pistolHold ? [Rt[0] - .05, Rt[1] - .015, Rt[2] + .005] : [hold.x + gd.sup[0] * s - .01, hold.y + gd.sup[1] * s, hold.z + gd.sup[2] * s];
      const SR = [.235 * w, 0, 0], SL = [-.235 * w, 0, 0];
      while (Math.hypot(Lt[0] - SL[0], Lt[1] - SL[1], Lt[2] - SL[2]) > a + b - .02 && Lt[2] < -.2) Lt[2] += .02;   // a long handguard: slide the hand back to where the arm reaches
      T = armMesh;
      for (const [S, Tg, px] of [[SR, Rt, 1], [SL, Lt, -1]]) {
        const d = new THREE.Vector3(Tg[0] - S[0], Tg[1] - S[1], Tg[2] - S[2]), Ld = Math.min(d.length(), a + b - .005); d.normalize();
        const x = (a * a - b * b + Ld * Ld) / (2 * Ld), h = Math.sqrt(Math.max(0, a * a - x * x)), pole = new THREE.Vector3(px * .55, -1, .25); pole.addScaledVector(d, -pole.dot(d)).normalize();
        const E = [S[0] + d.x * x + pole.x * h, S[1] + d.y * x + pole.y * h, S[2] + d.z * x + pole.z * h], Hn = [S[0] + d.x * Ld, S[1] + d.y * Ld, S[2] + d.z * Ld];
        limb(S, E, .07, .058, M.suit); limb(E, Hn, .056, .044, M.suit); add(sph(.062, 10, 8), M.plate, E[0], E[1], E[2]).scale.set(1, 1, 1.05);   // upper arm, forearm, elbow pad
        const fa = new THREE.Vector3(Hn[0] - E[0], Hn[1] - E[1], Hn[2] - E[2]).normalize(), mid = [lp(E[0], Hn[0], .58), lp(E[1], Hn[1], .58), lp(E[2], Hn[2], .58)];
        const br = add(cyl(.052, .058, .12, 10), M.plate, mid[0], mid[1], mid[2]); br.quaternion.setFromUnitVectors(UP, fa); add(sph(.03, 8, 6), M.acc, mid[0] - fa.y * .0 + px * .0, mid[1] + .05, mid[2]).scale.set(1, .4, 1.4);   // bracer with a light on it
        // the hand: a palm in line with the forearm, four fingers closed round the grip (or cupped under the handguard), a thumb
        const hand = new THREE.Group(); hand.position.set(Hn[0], Hn[1], Hn[2]); hand.lookAt(Hn[0] + fa.x, Hn[1] + fa.y, Hn[2] + fa.z); if (px < 0 && !gd.pistolHold && !knife) hand.rotateZ(-1.2); armMesh.add(hand); const was = T; T = hand;
        add(cyl(.044, .048, .03, 10), M.dark, 0, 0, -.005, Math.PI / 2); add(rb(.074, .034, .078, .012), M.dark, 0, 0, .042);   // cuff, palm
        add(rb(.07, .03, .05, .012), M.dark, -px * .012, -.02, .09, .9); add(rb(.066, .028, .04, .012), M.dark, -px * .014, -.05, .092, 1.9);   // fingers, curled
        add(rb(.024, .026, .055, .01), M.dark, px * .03, .012, .06, -.3, px * .5); add(rb(.07, .02, .03, .006), M.plate, 0, .024, .05);   // thumb, knuckle guard
        T = was;
      }
      bake(armMesh, false);
    };
    bake(G, false);
    // the shadow: every piece of the body casting its own would draw the whole fighter again into the shadow map; four
    // plain shapes on the bones give much the same shadow for four draws. They draw nothing in the picture itself (an empty
    // draw range just for that pass: the shadow pass, which runs no hooks, draws them whole).
    if (sh) { const S = shadowShapes(), px = (par, geo, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, S.m); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; m.userData.px = true; m.raycast = () => {}; m.onBeforeRender = pxHide; m.onAfterRender = pxShow; par.add(m); return m; };
      for (const lg of [L, Rg]) px(lg.th, S.leg, 0, -.42, -.01);
      px(torso, S.body, 0, 0, 0); px(arms, S.arm, 0, -.1, -.24, Math.PI / 2); }
    G.userData = { hip, L, Rg, torso, head, arms, gunHold, tails, pose, gk: '', flash: null, op: f.op, dead: 0 };
    X.scene.add(G); return G;
  }
  // enemies wear a red outline you can pick out at a glance, even in shade or against a busy wall: every piece of the body
  // and gun gets a copy drawn from the inside, pushed out in flat red. The push is a fixed 1.8 cm of world, so the rim keeps
  // its proportion to the body at any range instead of swamping a far silhouette. Up close it is held to a hairline (OL_HI
  // screen pixels). Where 1.8 cm comes to less than a pixel (past about 10 m) it is drawn one device pixel wide, the
  // thinnest line that stays whole, and faded in proportion down to OL_A, so a far enemy has a crisp light-red edge round
  // their own colours, not a red fill, on every screen and quality (an antialiased line smears its pixel over two, so it
  // fades less far, OL_AA). The copies push out along normals averaged across hard
  // edges, so boxes and plates get a closed rim on both sides instead of splitting open at their corners. Only the outer
  // edge shows: as each piece draws it marks its pixels in the stencil with that fighter's number, and the red copies,
  // drawn after, skip their fighter's marks (and mark their own, so overlapping copies don't stack up their red), so an arm
  // or the gun held across the chest adds no red lines inside the body. Walls and smoke still hide it.
  const OL_TH = .018, OL_LO = 1, OL_HI = 1.5, OL_A = .6, OL_AA = .8;   // metres; device pixels; CSS pixels; the faintest it fades to
  let OLM = null, OLV = null, OLAA = null;
  function outlineMat() {
    if (OLM) return OLM;
    OLV = new THREE.Vector4();
    OLM = new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(FOE) }, th: { value: OL_TH }, vh: { value: 720 }, lo: { value: OL_LO }, hi: { value: OL_HI }, amin: { value: OL_A } }, side: THREE.BackSide,
      // blended, but kept in the solid pass so it still draws before smoke and everything see-through
      blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      stencilWrite: true, stencilWriteMask: 0xff, stencilFunc: THREE.NotEqualStencilFunc, stencilRef: 0, stencilZPass: THREE.ReplaceStencilOp,
      vertexShader: 'attribute vec3 olN; uniform float th, vh, lo, hi, amin; varying float vA; void main() { vec4 v = modelViewMatrix * vec4(position, 1.0); vec3 n = normalMatrix * olN; float l = length(n);' +
        ' float px = 2.0 * max(-v.z, .05) / (projectionMatrix[1][1] * vh), w = th / px; vA = clamp(w / lo, amin, 1.0);' +
        ' if (l > 1e-6) v.xyz += n * (length(olN) / l * clamp(w, lo, hi) * px); gl_Position = projectionMatrix * v; }',
      fragmentShader: 'uniform vec3 col; varying float vA; void main() { gl_FragColor = vec4(col, vA); }' });
    return OLM;
  }
  // the pixel limits need the height of what is being drawn, in device pixels: read just before each outline draws.
  // The floor is a whole device pixel whatever the resolution: thinner, an antialiased line goes pink and patchy and a
  // plain one breaks up into dots; below it the line fades instead of thinning.
  function olPx(r) {
    if (!OLM) return; r.getCurrentViewport(OLV); const pr = r.getRenderTarget() ? 1 : r.getPixelRatio(), U = OLM.uniforms;
    if (OLAA == null) OLAA = !!(r.getContext().getContextAttributes() || {}).antialias;
    const vh = Math.max(1, OLV.w), lo = OL_LO, hi = Math.max(lo, OL_HI * pr), am = OLAA && !r.getRenderTarget() ? OL_AA : OL_A;
    if (U.vh.value !== vh || U.lo.value !== lo || U.hi.value !== hi || U.amin.value !== am) { U.vh.value = vh; U.lo.value = lo; U.hi.value = hi; U.amin.value = am; OLM.uniformsNeedUpdate = true; }
  }
  // the directions the copy is pushed along: at each corner, the average of every face that meets there (so a box's rim
  // stays closed round its edges), lengthened so each of those faces still moves out by the full width. Once per shape.
  function olNormals(g) {
    if (!g || g.attributes.olN || !g.attributes.normal) return;
    const P = g.attributes.position, N = g.attributes.normal, n = P.count, at = new Int32Array(n), key = new Map(), sum = [], seen = [], out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const k = Math.round(P.getX(i) * 1e4) + ',' + Math.round(P.getY(i) * 1e4) + ',' + Math.round(P.getZ(i) * 1e4);
      let c = key.get(k); if (c === undefined) { c = sum.length; key.set(k, c); sum.push([0, 0, 0]); seen.push([]); } at[i] = c;
      const x = N.getX(i), y = N.getY(i), z = N.getZ(i), L = seen[c];
      if (!L.some(q => q[0] * x + q[1] * y + q[2] * z > .999)) { L.push([x, y, z]); const s = sum[c]; s[0] += x; s[1] += y; s[2] += z; }
    }
    for (let i = 0; i < n; i++) {
      const c = at[i], s = sum[c], l = Math.hypot(s[0], s[1], s[2]);
      if (l < .3) { out[i * 3] = N.getX(i); out[i * 3 + 1] = N.getY(i); out[i * 3 + 2] = N.getZ(i); continue; }   // a sheet seen from both sides: its own normal
      const x = s[0] / l, y = s[1] / l, z = s[2] / l; let m = 1; for (const q of seen[c]) m = Math.min(m, q[0] * x + q[1] * y + q[2] * z);
      const k = 1 / Math.max(m, 1 / 1.5); out[i * 3] = x * k; out[i * 3 + 1] = y * k; out[i * 3 + 2] = z * k;
    }
    g.setAttribute('olN', new THREE.BufferAttribute(out, 3));
  }
  // the red copy reads its fighter's number; the piece itself, while its copy shows, writes that number into the stencil
  // for the length of its own draw (the materials are shared, so the setting is put back straight after)
  function olPre(r, sc, cam, geo, mat) { olPx(r); mat.stencilRef = this.userData.olRef; }
  function olMark(r, sc, cam, geo, mat) { const ol = this.userData.ol; if (!ol || !ol.visible || !mat) return; mat.stencilWrite = true; mat.stencilWriteMask = 0xff; mat.stencilFunc = THREE.AlwaysStencilFunc; mat.stencilRef = ol.userData.olRef; mat.stencilZPass = THREE.ReplaceStencilOp; }
  function olUnmark(r, sc, cam, geo, mat) { if (!mat || !mat.stencilWrite) return; mat.stencilWrite = false; mat.stencilRef = 0; mat.stencilZPass = THREE.KeepStencilOp; }
  let olN = 0;
  function outline(root, show) {
    // see-through parts of the gun (glass, glows, decals) get no outline; the body always does, even when caught half-faded by a cloak
    const add = [], gh = root.userData.gunHold, U = root.userData; if (!U.olRef) U.olRef = olN++ % 255 + 1;
    const walk = (o, inGun) => { if (o.userData.isOL || o.userData.px) return; inGun = inGun || o === gh; if (o.isMesh && !o.userData.ol && !(inGun && o.material && o.material.transparent)) add.push(o); for (const c of o.children) walk(c, inGun); };
    walk(root, false);
    // copies made for pieces since thrown away (an old gun, old arms) give their memory back
    U.olGeos = (U.olGeos || []).filter(m => { let q = m; while (q && q !== root) q = q.parent; if (q) return true; m.geometry.dispose(); return false; });
    const hook = (o, m) => { o.userData.ol = m;
      const b0 = o.onBeforeRender, a0 = o.onAfterRender, own = THREE.Object3D.prototype;   // keep any hooks a piece already has
      o.onBeforeRender = b0 === own.onBeforeRender ? olMark : function (...a) { b0.apply(this, a); olMark.apply(this, a); };
      o.onAfterRender = a0 === own.onAfterRender ? olUnmark : function (...a) { olUnmark.apply(this, a); a0.apply(this, a); }; };
    const olMesh = (geo, par) => { const m = new THREE.Mesh(geo, outlineMat()); m.userData.isOL = true; m.userData.olRef = U.olRef; m.raycast = () => {}; m.onBeforeRender = olPre; m.renderOrder = 1; par.add(m); return m; };
    // the pieces baked into a bone (or a gun part) never move or hide on their own: their copies are merged into one per
    // bone, a draw each instead of one per piece. Anything else keeps a copy of its own, riding on the piece.
    const byP = new Map();
    for (const o of add) {
      if (o.userData.baked && o.visible && o.parent && !o.geometry.index) { if (!byP.has(o.parent)) byP.set(o.parent, []); byP.get(o.parent).push(o); continue; }
      olNormals(o.geometry); const m = olMesh(o.geometry, o); m.frustumCulled = o.frustumCulled; hook(o, m);
    }
    for (const [par, list] of byP) {
      let n = 0; for (const o of list) { olNormals(o.geometry); n += o.geometry.attributes.position.count; }
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3); let at = 0;
      for (const o of list) { const g = o.geometry; P.set(g.attributes.position.array, at * 3); N.set(g.attributes.olN.array, at * 3); at += g.attributes.position.count; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('olN', new THREE.BufferAttribute(N, 3)); geo.computeBoundingSphere();
      const m = olMesh(geo, par); U.olGeos.push(m); for (const o of list) hook(o, m);
    }
    root.traverse(o => { if (o.userData.isOL) o.visible = show; });
  }
  function updateAgent(f, dt) {
    let A = X.agents.get(f);
    if (!A || A.userData.op !== f.op) { if (A) { X.scene.remove(A); if (A.userData.ownM) for (const m of new Set(A.userData.ownM.values())) m.dispose(); } A = agentModel(f); X.agents.set(f, A); }
    const U = A.userData, fk0 = gun(f).k, fsk = skinFor(f, fk0) || '', fk = fk0;
    if (U.gk !== fk || U.gsk !== fsk) { U.gsk = fsk; while (U.gunHold.children.length) U.gunHold.remove(U.gunHold.children[0]); const gm = gunModel(fk, { cast: false, flash: true, skin: fsk }); gm.scale.setScalar(1.08); U.gunHold.add(gm); U.gk = fk; U.flash = gm.userData.flash; U.pose(gm.userData); }
    A.visible = true; A.position.set(ipos(f, 'x'), ipos(f, 'y'), ipos(f, 'z')); A.rotation.y = f.yaw;
    { const P = M ? me() : null, foeSide = !!P && f.team !== P.team, op = f.cloak > 0 && f.alive ? (foeSide ? .07 : .35) : 1; U.cop = lp(U.cop == null ? 1 : U.cop, op, Math.min(1, dt * 10));
      // the fade goes on this fighter's own copies of its materials (everyone playing the same operative shares the
      // originals, so fading those turned every other Wraith on the field see-through too)
      const o2 = U.cop > .99 ? 1 : U.cop, cs = U.copSet == null ? 1 : U.copSet;
      if (o2 === 1 ? cs !== 1 : Math.abs(cs - o2) > .01 || U.copGk !== U.gk) { const own = U.ownM || (U.ownM = new Map()), mine = m => { let c = own.get(m); if (!c) { c = m.clone(); own.set(m, c); own.set(c, c); } return c; };
        const walk = o => { if (o === U.gunHold) return; if (o.isMesh && !o.userData.isOL && !o.userData.px && o.material && !o.material.isShaderMaterial) { const m = o.material = mine(o.material); m.transparent = o2 < 1; m.opacity = o2; m.depthWrite = o2 >= 1; } for (const c of o.children) walk(c); }; walk(A); U.copSet = o2; U.copGk = U.gk; }
      U.gunHold.visible = U.cop > .5;
      // the red edge only on a fully solid body: a see-through one draws after it, so the whole red copy would show through.
      // Redone whenever the gun is rebuilt (a new gun or a new skin on it), so the new gun and arms get theirs.
      const red = foeSide && f.alive && (U.copSet == null || U.copSet === 1), gid = U.gk + '|' + U.gsk;
      if (U.olOn !== red || (red && U.olGk !== gid)) { outline(A, red); U.olOn = red; U.olGk = gid; } }
    U.kn = lp(U.kn || 0, f.alive && (f.plant > 0 || f.defuse > 0) ? 1 : 0, Math.min(1, dt * 9));   // planting or defusing: down on one knee
    const sp = Math.hypot(f.vx, f.vz), sl = f.slide ? 1 : 0, amp = Math.min(1, sp / 3.5) * (f.sprinting ? 1.15 : .8) * (1 - sl), ph = f.walkT * 1.9, cr = Math.max(f.crouch, U.kn) * (1 - sl);
    animKit(U.gunHold.children[0], dt);
    U.sl = lp(U.sl || 0, sl, Math.min(1, dt * 12)); U.spr = lp(U.spr || 0, f.sprinting ? 1 : 0, Math.min(1, dt * 8)); const sk = U.sl;
    /* legs: each boot is put where it belongs (planted in a shooter's stance, or carried through its stride) and the knee
       is solved to it, so feet never sink or skate through the floor. The stride follows the way they are really moving:
       forward, backing off or stepping sideways. */
    { const cy = Math.cos(f.yaw), sy = Math.sin(f.yaw), kk = Math.min(1, dt * 10), dirF = sp > .4 ? -(f.vx * sy + f.vz * cy) / sp : 0, dirR = sp > .4 ? (f.vx * cy - f.vz * sy) / sp : 0;
      U.vf = lp(U.vf || 0, dirF, kk); U.vr = lp(U.vr || 0, dirR, kk); U.amp = lp(U.amp || 0, amp, kk);
      const am = U.amp, still = 1 - Math.min(1, am * 1.4), stride = am * (f.sprinting ? .36 : .3) * (1 - cr * .45), lift = am * (f.sprinting ? .2 : .14);
      const hipY = .95 - .035 - cr * .4 - sk * .55 - (U.kn || 0) * .14 + Math.abs(Math.sin(ph)) * am * .035 - am * .03, L1 = .46, L2 = .42;
      U.hip.position.y = hipY; U.hip.position.x = Math.sin(ph) * am * .012;
      for (const [lg, o, side] of [[U.L, 0, -1], [U.Rg, Math.PI, 1]]) { const p = ph + o, sw = Math.sin(p), up = Math.max(0, Math.cos(p));
        // where the ankle goes, from the hip joint: forward, out to the side, and how far below
        const fz = (side < 0 ? .13 : -.1) * (still + cr * .5) + sw * stride * U.vf + cr * .04, tx = side * (.035 + cr * .05 + still * .02) + sw * stride * .7 * U.vr - U.hip.position.x, dy = Math.max(.2, hipY - .07 - up * lift);
        const down = Math.hypot(tx, dy), rz = Math.atan2(tx, dy), D = Math.min(Math.hypot(down, fz), L1 + L2 - .004);
        const bend = Math.PI - Math.acos(cl((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1)), a = Math.atan2(fz, down) + Math.acos(cl((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1));
        const toe = up * (-.55 * (.5 - .5 * sw) + .22 * (.5 + .5 * sw)) - (side > 0 ? cr * .0 : 0);   // heel up as it leaves the floor, toe up as it comes down
        lg.th.rotation.set(a, 0, rz); lg.sn.rotation.x = -bend; lg.ft.rotation.set(bend - a + toe, 0, -rz); } }
    // a slide: the lead leg out straight, the other tucked, leaning back low; a sprint: leaning into it
    if (sk > .01) { for (const lg of [U.L, U.Rg]) { lg.th.rotation.z *= 1 - sk; lg.ft.rotation.set(lp(lg.ft.rotation.x, .3, sk), 0, 0); }
      U.L.th.rotation.x = lp(U.L.th.rotation.x, -1.35, sk); U.L.sn.rotation.x = lp(U.L.sn.rotation.x, 0, sk); U.Rg.th.rotation.x = lp(U.Rg.th.rotation.x, -.4, sk); U.Rg.sn.rotation.x = lp(U.Rg.sn.rotation.x, -2.1, sk); }
    U.torso.rotation.x = -.05 - cr * .3 - amp * .1 - f.pitch * .1 - U.spr * .22 + sk * .5; U.torso.rotation.y = Math.sin(ph) * amp * .09; U.torso.rotation.z = -Math.sin(ph) * amp * .025; U.torso.position.y = Math.sin(X.t * 1.7 + f.x) * .004;
    U.tails.rotation.x = .1 + amp * .55 + Math.sin(ph * 2) * amp * .08 + cr * .5;
    const sw = f.swing ? Math.sin(Math.min(1, f.swing.t / .4) * Math.PI) : 0;
    U.arms.rotation.x = f.pitch * .9 + f.kick * 1.2 - (f.swing && f.swing.heavy ? 0 : sw * .7) + Math.sin(ph * 2) * amp * .03; U.arms.rotation.y = f.swing && !f.swing.heavy ? (f.swing.t / .4 - .5) * 1.3 * (f.swing.side || 1) * (sw > 0 ? 1 : 0) : 0; U.arms.position.z = f.swing && f.swing.heavy ? -sw * .25 : 0;
    U.arms.rotation.x -= U.spr * .5;   // gun down while sprinting
    // using an ability: the body plays the same gesture you see in first person
    if (f.castT > 0) { f.castT -= dt; const D = f.castD || .5, q = cl(1 - f.castT / D, 0, 1), c = Math.sin(q * Math.PI), kd = f.castK;
      if (kd === 'throw') { const wind = sm(cl(q / .45, 0, 1)) * (1 - sm(cl((q - .45) / .15, 0, 1))), fl = sm(cl((q - .45) / .15, 0, 1)) * (1 - sm(cl((q - .7) / .3, 0, 1)));
        U.arms.rotation.x -= wind * 1.1 - fl * .35; U.arms.rotation.z += wind * .35; U.torso.rotation.y += wind * .35 - fl * .25; U.torso.rotation.x += fl * .18; }
      else if (kd === 'place') { U.torso.rotation.x += c * .55; U.arms.rotation.x += c * .7; U.hip.position.y -= c * .12; }
      else if (kd === 'push') { U.arms.rotation.x -= c * .4; U.torso.rotation.x += c * .12; U.torso.rotation.y -= c * .2; }
      else if (kd === 'heal') { U.arms.rotation.x += c * .35; U.arms.rotation.z += c * .25; U.torso.rotation.x += c * .1; }
      else if (kd === 'dash') { U.torso.rotation.y += c * .4; U.arms.rotation.z -= c * .35; U.torso.rotation.x += c * .15; }
      else { U.arms.rotation.x -= c * .55; U.arms.rotation.z += c * .3; U.torso.rotation.y += c * .2; } }
    U.head.rotation.x = f.pitch * .6 - sk * .3;
    if (U.flash) { U.flash.visible = f.kick > .05 && f.alive && !gun(f).melee; if (U.flash.visible) U.flash.material.rotation = Math.random() * 6; }
    // the rival's gun works too: slide, bolt, pump, magazine; and the arms tip it over to reload
    { const gm = U.gunHold.children[0], G = gun(f); if (gm && gm.userData.parts) animParts(gm, f, G, dt, false);
      const rt = f.reloadT > 0 ? 1 - f.reloadT / G.rel : -1, tl = rt < 0 ? 0 : sm(cl(rt / .14, 0, 1)) * (1 - sm(cl((rt - .88) / .12, 0, 1))); U.arms.rotation.z = -tl * .45; U.arms.rotation.x -= tl * .35; }
    // kneeling over the charge: leaning in, head down, both hands at the floor (the gun put away); planting, the charge is in
    // the hands on its way down; defusing, the hands work at it
    if (U.kn > .01) { const k = U.kn, work = f.defuse > 0 ? Math.sin(X.t * 13) * .07 : 0; U.torso.rotation.x -= .5 * k; U.head.rotation.x -= .3 * k; U.arms.rotation.x = lp(U.arms.rotation.x, -1.0 + work, k); U.arms.rotation.z = lp(U.arms.rotation.z, 0, k); U.arms.position.z = lp(U.arms.position.z, .05, k); }
    U.gunHold.visible = U.gunHold.visible && U.kn < .5;
    { const hold = f.alive && f.plant > 0; if (hold && !U.held) { U.held = X.chargeCopy(); U.held.scale.setScalar(.75); U.arms.add(U.held); } if (U.held) { U.held.visible = hold; if (hold) U.held.position.set(.03, -.2, -.4); } }
    if (f.alive) { U.rag = null; f.rag = null; U.dead = 0; A.rotation.x = 0; A.rotation.z = 0; A.position.y = f.y; }
    else ragdoll(f, A, U, dt);
  }
  // who shot them and from where, so the body goes down away from the shot (every device hears the kill)
  on('kill', (v, by, head) => { v.rag = { fx: by ? by.x : null, fz: by ? by.z : null, head: !!head }; });
  /* A body going down. Where it lies and which way it fell are fixed the moment it dies, so nothing the player does after
     (looking round on the death cam, the facing their device still sends) moves it. The knees give first, the body twists
     away from the shot and topples, faster and faster, lands with a small bounce and settles loose: one knee up, the arms
     flung, the head rolled aside. A headshot drops it straight down before it tips. Shot from behind, it pitches onto its
     face. A wall closer than a body length stops the fall short: it slumps against the wall instead of sinking through. */
  function ragdoll(f, A, U, dt) {
    let R = U.rag;
    if (!R) {
      const hit = f.rag || {}, x0 = A.position.x, y0 = A.position.y, z0 = A.position.z;
      let dx = hit.fx != null ? x0 - hit.fx : Math.sin(f.yaw), dz = hit.fz != null ? z0 - hit.fz : Math.cos(f.yaw); const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      // the way the shot pushes first; if a wall is in the way, to either side, then the other way: the clearest one wins
      const push = Math.atan2(dx, dz), plan = d => { const turnB = angDiff(d, f.yaw), turnF = angDiff(d + Math.PI, f.yaw), fwd = Math.abs(turnB) > Math.abs(turnF) + .3, yaw1 = f.yaw + cl(fwd ? turnF : turnB, -1.3, 1.3) * .85, s = fwd ? -1 : 1, fx = Math.sin(yaw1) * s, fz = Math.cos(yaw1) * s;
        return { fwd, yaw1, s, fx, fz, room: los(x0, y0 + .45, z0, x0 + fx * 1.9, y0 + .45, z0 + fz * 1.9, false) }; };
      let P2 = null; for (const off of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) { const c = plan(push + off); if (!P2 || c.room > P2.room + .05) P2 = c; if (c.room >= 1.75) break; }
      const { fwd, yaw1, s, fx, fz, room } = P2, aEnd = room >= 1.75 ? 1.5 : cl(Math.asin(cl((room - .2) / 1.6, 0, 1)), .5, 1.5);
      const sd = String(f.key || f.name).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7) + (M ? M.round * 131 : 0), rn = k => { const v = Math.sin(sd * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
      R = U.rag = { x: x0, y: y0, z: z0, yaw0: f.yaw, yaw1, fwd, s, fx, fz, aEnd, slump: aEnd < 1.15, head: !!hit.head, t: 0, leg: rn(1) < .5 ? 0 : 1, side: rn(2) < .5 ? -1 : 1, r3: rn(3), slide: cl(room - 1.8, 0, .3) };
    }
    R.t += dt; const t = R.t, t0 = R.head ? .16 : .1, T = R.head ? .58 : .5, u = cl((t - t0) / T, 0, 1), ti = t0 + T;
    const buckle = smooth(cl(t / (R.head ? .16 : .22), 0, 1)), g = smooth(u), land = t > ti ? Math.exp(-(t - ti) * 7) * Math.abs(Math.sin((t - ti) * 17)) : 0;
    const a = R.aEnd * u * u - .12 * land;   // gravity: slow to tip, fast at the end; then the bounce dies away
    A.rotation.y = R.yaw0 + angDiff(R.yaw1, R.yaw0) * g; A.rotation.x = a * R.s; A.rotation.z = R.side * .1 * g;
    A.position.set(R.x + R.fx * R.slide * g, R.y + (R.fwd ? .16 : .13) * Math.sin(Math.max(0, a)) - (R.head ? .06 : 0) * buckle * (1 - g), R.z + R.fz * R.slide * g);
    // the limbs: knees giving way, then loose on the floor
    const hipDrop = (R.head ? .3 : .2) * buckle * (1 - g * .55) + (R.slump ? (R.fwd ? .5 : .32) * g : 0);
    U.hip.position.y = .95 - hipDrop;
    [U.L, U.Rg].forEach((lg, i) => { const bent = i === R.leg, kneeT = R.fwd ? (bent ? -.35 : .05) : R.slump ? 1.25 : bent ? .95 : .12, kneeS = R.fwd ? (bent ? -1.1 : -.15) : R.slump ? -1.35 : bent ? -1.55 : -.12;
      const kt = R.fwd && R.slump ? 1.45 : kneeT, ks = R.fwd && R.slump ? -2.35 : kneeS;   // (slumped forward against a wall: kneeling)
      lg.th.rotation.x = lp(.55 * buckle, kt, g); lg.sn.rotation.x = lp(-1.1 * buckle, ks, g); lg.th.rotation.z = (i ? -1 : 1) * .12 * g; lg.th.rotation.y = 0; lg.ft.rotation.set(.35 * g - .2 * buckle * (1 - g), 0, (i ? 1 : -1) * .25 * g); });
    U.hip.position.x = 0; U.torso.rotation.z = 0;
    U.torso.rotation.x = lp(.25 * buckle, R.fwd ? .2 : -.18, g); U.torso.rotation.y = R.side * .22 * g; U.torso.position.y = 0;
    U.arms.rotation.x = lp(-.5 * buckle, R.fwd ? -1.25 : R.slump ? -.9 : 1.15 + R.r3 * .5, g); U.arms.rotation.y = R.side * .35 * g; U.arms.rotation.z = R.side * (R.fwd ? -.2 : .45) * g; U.arms.position.z = 0;
    U.head.rotation.x = lp(.3 * buckle, R.fwd ? .45 : R.slump ? .55 : -.4, g); U.head.rotation.z = R.side * .45 * g; U.head.rotation.y = R.side * .25 * g;
    U.tails.rotation.x = .1 + .4 * g; U.gunHold.visible = false; if (U.held) U.held.visible = false;
  }
