  /* ---------- 74 agents: the rival's body and how it moves ----------
     Built to the same size as the hitboxes in 40-sim: 1.82 m tall standing, 0.6 m wide, head at eye height. The legs are
     two bones each and walk with the fighter's speed; the hips drop into a crouch; arms and head follow the aim; the gun
     in the hands is the real model of whatever they hold. */
  function agentModel(f) {
    const G = new THREE.Group(), op = OPS[f.op] || OPS.vex, sh = !X.low; G.rotation.order = 'YXZ';
    const lam = c => new THREE.MeshLambertMaterial({ color: c }), suit = lam('#2b313d'), plate = lam('#465064'), acc = lam(op.col), skin = lam('#c8916a'), boot = lam('#16181d'), glow = new THREE.MeshBasicMaterial({ color: op.col });
    const add = (par, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = sh; par.add(m); return m; };
    const cyl = (rt, rb, h, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg), sph = r => new THREE.SphereGeometry(r, 14, 10), bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    // a limb between two points
    const UP = new THREE.Vector3(0, 1, 0);
    const limb = (par, a, b, r0, r1, mat) => { const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), m = add(par, cyl(r1, r0, d.length(), 8), mat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.quaternion.setFromUnitVectors(UP, d.normalize()); return m; };
    const hip = new THREE.Group(); hip.position.y = .95; G.add(hip);
    const leg = side => {
      const th = new THREE.Group(); th.position.set(side * .115, 0, 0); hip.add(th); add(th, cyl(.098, .08, .46), suit, 0, -.23, 0); add(th, bx(.13, .2, .05), plate, 0, -.2, -.075);
      const sn = new THREE.Group(); sn.position.y = -.46; th.add(sn); add(sn, cyl(.076, .06, .44), suit, 0, -.22, 0); add(sn, sph(.085), plate, 0, 0, -.015); add(sn, bx(.13, .1, .28), boot, 0, -.44, -.05);
      return { th, sn };
    };
    const L = leg(-1), Rg = leg(1);
    const torso = new THREE.Group(); hip.add(torso);
    add(torso, cyl(.19, .17, .16, 12), suit, 0, .06, 0).scale.z = .78; add(torso, cyl(.2, .2, .05, 12), plate, 0, .13, 0).scale.z = .8;
    add(torso, cyl(.235, .185, .44, 12), suit, 0, .38, 0).scale.z = .68;
    add(torso, bx(.36, .33, .09), acc, 0, .41, -.135); add(torso, bx(.26, .08, .1), plate, 0, .22, -.14); add(torso, bx(.3, .36, .13), plate, 0, .4, .155); add(torso, bx(.1, .12, .06), acc, .1, .36, .23);
    for (const s of [-1, 1]) { add(torso, sph(.1), plate, s * .265, .56, 0); add(torso, bx(.07, .2, .07), plate, s * .16, .34, -.19); }
    add(torso, cyl(.06, .075, .1), skin, 0, .66, 0);
    const head = new THREE.Group(); head.position.set(0, .77, 0); torso.add(head);
    add(head, sph(.128), skin, 0, 0, 0); add(head, new THREE.SphereGeometry(.152, 16, 10, 0, TAU, 0, Math.PI * .58), plate, 0, .02, .005); add(head, bx(.215, .06, .05), glow, 0, .005, -.125); add(head, bx(.05, .09, .1), plate, -.15, -.01, 0); add(head, bx(.05, .09, .1), plate, .15, -.01, 0); add(head, bx(.16, .05, .1), suit, 0, -.085, -.07);
    // the arms hold a gun out in front; the whole group tips with the aim
    const arms = new THREE.Group(); arms.position.set(0, .54, 0); torso.add(arms);
    limb(arms, [.265, .02, 0], [.3, -.2, -.12], .062, .055, suit); limb(arms, [.3, -.2, -.12], [.1, -.15, -.36], .055, .048, suit); add(arms, sph(.058), boot, .1, -.15, -.37);
    limb(arms, [-.265, .02, 0], [-.27, -.2, -.24], .062, .055, suit); limb(arms, [-.27, -.2, -.24], [-.03, -.16, -.56], .055, .048, suit); add(arms, sph(.058), boot, -.03, -.16, -.57);
    add(arms, bx(.09, .1, .12), acc, .32, -.02, -.02);
    const gunHold = new THREE.Group(); gunHold.position.set(.09, -.08, -.34); arms.add(gunHold);
    G.userData = { hip, L, Rg, torso, head, arms, gunHold, gk: '', flash: null, op: f.op, dead: 0 };
    X.scene.add(G); return G;
  }
  function updateAgent(f, dt) {
    let A = X.agents.get(f);
    if (!A || A.userData.op !== f.op) { if (A) X.scene.remove(A); A = agentModel(f); X.agents.set(f, A); }
    const U = A.userData, fk = gun(f).k;
    if (U.gk !== fk) { while (U.gunHold.children.length) U.gunHold.remove(U.gunHold.children[0]); const gm = gunModel(fk, { cast: !X.low, flash: true }); gm.scale.setScalar(1.08); U.gunHold.add(gm); U.gk = fk; U.flash = gm.userData.flash; }
    A.visible = true; A.position.set(f.x, f.y, f.z); A.rotation.y = f.yaw;
    const sp = Math.hypot(f.vx, f.vz), amp = Math.min(1, sp / 3.5) * .8, ph = f.walkT * 1.9, cr = f.crouch;
    // legs: swing with the stride, the trailing knee bends; a crouch folds both
    for (const [lg, o] of [[U.L, 0], [U.Rg, Math.PI]]) { const s = Math.sin(ph + o); lg.th.rotation.x = s * amp + cr * 1.1; lg.sn.rotation.x = -Math.max(0, -Math.cos(ph + o)) * amp * 1.2 - cr * 1.9; }
    U.hip.position.y = .95 - cr * .4 + Math.abs(Math.sin(ph)) * amp * .03;
    U.torso.rotation.x = -cr * .3 - amp * .08 - f.pitch * .1; U.torso.rotation.y = Math.sin(ph) * amp * .08;
    const sw = f.swing ? Math.sin(Math.min(1, f.swing.t / .4) * Math.PI) : 0;
    U.arms.rotation.x = f.pitch * .9 + f.kick * 1.2 - (f.swing && f.swing.heavy ? 0 : sw * .7); U.arms.rotation.y = f.swing && !f.swing.heavy ? (f.swing.t / .4 - .5) * 1.3 * (f.swing.side || 1) * (sw > 0 ? 1 : 0) : 0; U.arms.position.z = f.swing && f.swing.heavy ? -sw * .25 : 0;
    U.head.rotation.x = f.pitch * .6;
    if (U.flash) { U.flash.visible = f.kick > .05 && f.alive && !gun(f).melee; if (U.flash.visible) U.flash.material.rotation = Math.random() * 6; }
    // a dead fighter falls back and stays down
    U.dead = f.alive ? 0 : Math.min(1, U.dead + dt * 2.6); const d = smooth(U.dead);
    A.rotation.x = d * 1.5; A.position.y = f.y + d * .14;
  }
