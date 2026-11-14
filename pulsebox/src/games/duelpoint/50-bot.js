  /* ---------- 50 bot: a player with the same body, guns and accuracy rules, and no knowledge it has not earned ----------
     Each tick botThink returns the same intent a person's input would. What a bot knows about its rival is only what it
     has seen (in its field of view, with a clear line), heard (running steps within earshot, gunfire) or been shown by a
     Ping. Its state lives in f.bot: the plan it is following, when it last knew where the rival was, and its aim error. */
  const laneOf = (x, z) => { const a = areaAt(x, z), k = a ? a.k : ''; return k === 'pier' ? 'pier' : k === 'tunnel' ? 'tunnel' : k === 'yard' || k === 'gate' ? 'mid' : 'any'; };
  // somewhere to stand with a clear view of a point, a set distance from it (the attacker's post after planting)
  function watchSpot(x, z, rMin, rMax) {
    const c = navCells.filter(q => { const d = Math.hypot(q[0] - x, q[1] - z); return d >= rMin && d <= rMax && los(q[0], hAt(q[0], q[1]) + 1.5, q[1], x, .6, z, false) >= Math.hypot(d, hAt(q[0], q[1]) + .9) - .6; });
    return c.length ? pick(c) : [x, z];
  }
  const goTo = (P, f, x, z) => { P.dest = [x, z]; P.path = findPath(f.x, f.z, x, z); };
  function planAttack(f) {
    const lane = pick(['pier', 'split', 'mid', 'mid', 'tunnel', 'tunnel']);
    return { k: 'push', lane: lane === 'split' ? 'pier' : lane, pts: ROUTES[lane].map(p => [p[0], p[1]]), site: pick(SITE), path: [] };
  }
  function planHold(f, lane) {
    const c = HOLDS.filter(h => !lane || h.lane === lane), h = pick(c.length ? c : HOLDS), P = { k: 'hold', lane: h.lane, look: h.look, crouch: R() < .35 };
    goTo(P, f, h.p[0], h.p[1]); return P;
  }
  // buy for the kind of round: pistols on round 1 and 5, something cheap when short, a rifle and shields when rich
  function botBuy(f) {
    const c = f.credits, d = f.bot.diff, has = f.guns[1];
    if (pistolRound(M.round)) { const r = R(); if (r < .35) buy(f, 'hammer'); else if (r < .55) buy(f, 'quill'); else if (r < .75) { buy(f, 'light'); buy(f, 'stub'); } else { buy(f, 'wasp'); buy(f, 'stub'); } return; }
    if (has && GUNS[has].cost >= 2050) { if (f.sh < 50 && f.credits >= 1000) buy(f, 'heavy'); else if (f.sh < 25) buy(f, 'light'); return; }
    if (c >= 3900) { buy(f, R() < .1 + .08 * d && c >= 5700 ? 'longbow' : R() < .1 ? 'torrent' : R() < .5 ? 'lancer' : 'vesper'); buy(f, 'heavy'); }
    else if (c >= 3300) { buy(f, R() < .5 ? 'lancer' : 'vesper'); buy(f, 'light'); }
    else if (c >= 2450 && R() < .6) { buy(f, R() < .55 ? 'mako' : 'paladin'); buy(f, 'light'); }
    else if (c >= 1950 && R() < .55) { buy(f, pick(['hornet', 'thresher', 'hornet'])); buy(f, 'light'); }
    else if (c >= 1350 && R() < .4) { buy(f, pick(['gnat', 'breaker', 'kite'])); buy(f, 'light'); }
    else if (R() < .5) buy(f, pick(['quill', 'hammer', 'stub']));
  }
  // use an ability at a chosen place, without having to look there first
  function botCast(f, k, data) { if (!f.ab[k] || M.phase !== 'live') return; f.ab[k] = 0; applyAbility(f, k, data); net({ t: 'ab', k, d: data }); }
  const hasAmmo = (f, s) => { const k = f.guns[s], A = k && f.ammo[k]; return !!A && A.mag + A.res > 0; };

  function botThink(f, dt) {
    const B = f.bot, D = DIFF[B.diff], e = other(f), I = { mx: 0, mz: 0, walk: false, crouch: false, jump: false, use: false, fire: false };
    if (B.dummy) {   // the range's target: pace about, face the player, never shoot
      const h = B.home || [f.x, f.z]; f.yaw = yawTo(f.x, f.z, e.x, e.z); I.mx = Math.hypot(f.x - h[0], f.z - h[1]) > 2.5 ? Math.sign(Math.cos(f.yaw) * (h[0] - f.x) - Math.sin(f.yaw) * (h[1] - f.z)) : Math.sin(M.time * 1.1 + h[0]) > 0 ? 1 : -1;
      I.walk = Math.sin(M.time * .37 + h[1]) > .3; I.crouch = Math.sin(M.time * .23 + h[0]) > .8; return I;
    }
    if (M.phase === 'buy') { if (!B.bought) { B.bought = true; botBuy(f); f.ready = true; } return I; }
    if (M.phase === 'end') return I;
    const side = sideOf(f), dE = Math.hypot(e.x - f.x, e.z - f.z), toE = yawTo(f.x, f.z, e.x, e.z);
    if (B.ph == null) { B.ph = R() * 9; B.hp0 = f.hp; }

    // --- what it knows
    const sees = e.alive && (Math.abs(angDiff(toE, f.yaw)) < 1.1 || dE < 4) && canSee(f, e);
    if (sees) { B.seen = (B.seen || 0) + dt; B.last = { x: e.x, z: e.z, t: M.time }; B.lostT = 0; } else { B.seen = 0; B.lostT = (B.lostT || 0) + dt; }
    if (e.alive && !sees && ((e.step > 0 && dE < D.hear) || (e.kick > 0 && dE < 45) || e.reveal > 0)) B.last = { x: e.x, z: e.z, t: M.time, heard: true };
    const fresh = B.last && M.time - B.last.t < 4;

    // --- the plan
    if (!B.plan) B.plan = side === 'att' ? planAttack(f) : planHold(f, null);
    if (M.planted && side === 'def' && B.plan.k !== 'retake') { B.plan = { k: 'retake' }; goTo(B.plan, f, M.planted.x, M.planted.z); }
    if (M.planted && side === 'att' && B.plan.k !== 'post') { const s = watchSpot(M.planted.x, M.planted.z, 5, 13); B.plan = { k: 'post', look: [M.planted.x, M.planted.z], crouch: R() < .5 }; goTo(B.plan, f, s[0], s[1]); }
    let P = B.plan;
    if (P.k === 'hold' && B.diff > 0 && B.last && B.last.heard && M.time - B.last.t < .3 && !(P.until > M.time)) {   // turn to face the lane the noise came from
      const lane = laneOf(B.last.x, B.last.z); if (lane !== 'any' && lane !== P.lane) { P = B.plan = planHold(f, lane); P.until = M.time + 7; }
    }
    if (P.k === 'hold' && !sees && B.last && !B.last.heard && B.lostT > 3.5 && B.lostT < 3.6 && R() < .25 + .15 * B.diff) { P = B.plan = { k: 'hunt' }; goTo(P, f, B.last.x, B.last.z); }
    if (P.k === 'push' && M.t < 28 && P.pts.length) P.pts.length = 0;   // out of time: straight to the site
    if (P.k === 'post' && e.alive && e.defuse > 0 && !P.rush) { P.rush = true; goTo(P, f, M.planted.x, M.planted.z); }

    // --- which weapon
    if (f.slot !== 1 && hasAmmo(f, 1) && !(f.ammo[f.guns[1]].mag === 0 && sees)) switchTo(f, 1);
    else if (f.slot === 1 && f.ammo[f.guns[1]].mag === 0 && sees && hasAmmo(f, 2) && f.ammo[f.guns[2]].mag > 0 && B.diff > 0) switchTo(f, 2);
    else if (f.slot !== 3 && !hasAmmo(f, 1) && !hasAmmo(f, 2)) switchTo(f, 3);
    else if (f.slot === 3 && hasAmmo(f, 2) && !hasAmmo(f, 1)) switchTo(f, 2);
    const G = gun(f), A = f.ammo[G.k];
    if (A && !sees && B.lostT > 1.2 && A.mag < G.mag * .45 && A.res > 0) reload(f);

    // --- aim: at the rival once it has reacted, else where the rival was, the way it is walking, or the angle it holds
    let tYaw = f.yaw, tPitch = 0, engaged = false, goal = null;
    if (sees && B.seen > D.react) {
      engaged = true; B.engT = M.time;
      if (!B.locked) { B.locked = true; B.head = R() < D.hs; B.err = [rnd(-1, 1) * D.err * 2.2, rnd(-1, 1) * D.err * 1.5]; }
      const k = Math.pow(.2, dt); B.err[0] *= k; B.err[1] *= k;
      const ty = B.head && dE > 3 ? eyeY(e) - .02 : e.y + lp(1.05, .7, e.crouch), aimP = Math.atan2(ty - eyeY(f), dE), pt = patOf(f, G), wob = D.err * .3;
      tYaw = toE + B.err[0] + Math.sin(M.time * 5.1 + B.ph) * wob - pt[0] * D.spray; tPitch = aimP + B.err[1] + Math.cos(M.time * 4.3 + B.ph) * wob * .6 - pt[1] * D.spray;
      const off = Math.hypot(angDiff(toE - pt[0] * D.spray, f.yaw), aimP - pt[1] * D.spray - f.pitch), size = Math.atan2(.34, dE);
      if (B.rest > 0) B.rest -= dt;
      if (G.melee) I.fire = dE < 2.2 && off < .5;
      else {
        if (G.scope && !f.scoped && off < .3) f.scoped = 1;
        const steady = spreadOf(f) < Math.max(.01, size * (2 - D.spray)) || dE < (G.pel ? 9 : 6);
        if (G.auto && dE > 14 && f.spray > 3 + D.spray * 5) B.rest = .22;   // let a long spray settle
        if (off < size * 1.3 + D.err * .6 && steady && !(B.rest > 0) && (!G.scope || f.scoped)) {
          if (G.auto) I.fire = true; else { B.semi = (B.semi || 0) - dt; if (B.semi <= 0) { I.fire = true; B.semi = 60 / G.rpm + .08 + .25 * (1 - D.spray); } }
        }
      }
    } else {
      if (!sees) B.locked = false;
      const node = P.path && P.path.length ? P.path[Math.min(1, P.path.length - 1)] : null;
      const lk = sees ? [e.x, e.z] : fresh && (P.k !== 'push' || B.lostT < 2.5) ? [B.last.x, B.last.z] : node && Math.hypot(node[0] - f.x, node[1] - f.z) > .8 ? node : P.look;
      if (lk) { tYaw = yawTo(f.x, f.z, lk[0], lk[1]); tPitch = Math.atan2(hAt(lk[0], lk[1]) - f.y, Math.max(2, Math.hypot(lk[0] - f.x, lk[1] - f.z))) * .7; }
      if (G.scope && f.scoped) f.scoped = 0;
    }
    const rate = (engaged ? 7 + B.diff * 4 : 3.5 + B.diff * 2) * dt;
    f.yaw += cl(angDiff(tYaw, f.yaw), -rate, rate); f.pitch += cl(tPitch - f.pitch, -rate * .7, rate * .7);

    // --- abilities, each with a reason
    if (M.phase === 'live') {
      const near = Math.hypot(siteC[0] - f.x, siteC[1] - f.z);
      if (f.op === 'vex' && f.ab.e && side === 'att' && P.k === 'push' && near < 22 && !sees) { const h = pick(HOLDS.filter(q => q.lane === P.lane || q.lane === 'any')); if (Math.hypot(h.p[0] - f.x, h.p[1] - f.z) < 24) botCast(f, 'e', { x: h.p[0], z: h.p[1] }); }
      if (f.op === 'vex' && f.ab.q && engaged && f.hp < 45 && Math.hypot(f.vx, f.vz) > 2) ability(f, 'q');
      if (f.op === 'iris' && f.ab.q && (side === 'att' ? near < 26 : M.t < ROUND_T - 10 || fresh)) ability(f, 'q');
      if (f.op === 'iris' && f.ab.e && !sees && fresh && B.last.heard && dE > 6 && dE < 16 && R() < dt * 1.5) botCast(f, 'e', { x: B.last.x, y: 1.6, z: B.last.z });
      if (f.op === 'bastion' && f.ab.q && engaged && f.hp < 70 && dE > 5) ability(f, 'q');
      if (f.op === 'bastion' && f.ab.e && f.hp < 60 && !sees) ability(f, 'e');
    }

    // --- moving
    if (P.path && P.path.length) { goal = P.path[0]; if (Math.hypot(goal[0] - f.x, goal[1] - f.z) < .55) { P.path.shift(); goal = P.path[0] || null; } }
    const arrived = !P.path || !P.path.length;
    if (arrived) {
      if (P.k === 'push') { if (P.pts.length) { const q = P.pts.shift(); goTo(P, f, q[0], q[1]); } else if (!P.toSite) { P.toSite = true; goTo(P, f, P.site[0], P.site[1]); } }
      if (P.k === 'hunt') B.plan = planHold(f, null);
      if ((P.k === 'hold' || P.k === 'post') && P.crouch && !engaged) I.crouch = true;
    }
    if (engaged) {   // stop to shoot; step out between bursts; better bots brake with a counter-strafe
      goal = null; B.pk = (B.pk || 0) - dt;
      if (B.pk <= 0) { B.mv = !B.mv; B.pk = B.mv ? rnd(.2, .45) * (G.cat === 'SMG' || G.pel ? 1.6 : 1) : rnd(.5, 1.2); B.str = R() < .5 ? -1 : 1; }
      const lv = Math.cos(f.yaw) * f.vx - Math.sin(f.yaw) * f.vz;
      if (B.mv) { const sx = f.x + Math.cos(f.yaw) * B.str * 1.3, sz = f.z - Math.sin(f.yaw) * B.str * 1.3; if (!walkLine(f.x, f.z, sx, sz)) B.str = -B.str; I.mx = B.str; }
      else I.mx = B.diff > 0 && Math.abs(lv) > 1.2 ? -Math.sign(lv) : 0;
      if (G.melee) goal = [e.x, e.z];
      if (B.diff > 0 && G.auto && dE < 12 && f.spray > 4) I.crouch = true;
    } else if (M.time - (B.engT || -9) < .8 && P.k !== 'retake') goal = null;   // just lost a rival it was fighting: hold the angle a moment
    // the charge
    if (side === 'att' && !M.planted && P.k === 'push' && P.toSite && onSite(f.x, f.z) && (arrived || Math.hypot(P.site[0] - f.x, P.site[1] - f.z) < 1.4) && !sees && M.time - (B.engT || -9) > 1) { I.use = true; goal = null; }
    if (side === 'def' && M.planted && Math.hypot(f.x - M.planted.x, f.z - M.planted.z) < 1.5) {
      if (f.hp < B.hp0 && M.planted.t > DEFUSE_T - f.defuse + 2.5) B.wait = 1.2;   // shot at while defusing: stand up and look
      if (B.wait > 0) B.wait -= dt;
      else if ((!sees && B.lostT > 1) || M.planted.t < DEFUSE_T - f.defuse + 1.5) { I.use = true; goal = null; I.mx = 0; I.fire = false; }
    }
    B.hp0 = f.hp;
    if (goal) {
      const da = angDiff(yawTo(f.x, f.z, goal[0], goal[1]), f.yaw); I.mz = Math.cos(da); I.mx = -Math.sin(da);
      I.walk = M.t > 30 && !fresh && ((P.k === 'hold') || (P.k === 'push' && B.diff > 0 && Math.hypot(siteC[0] - f.x, siteC[1] - f.z) < 15));
    }
    // stuck against something: hop, then find the way again
    B.sT = (B.sT || 0) + dt;
    if (B.sT > .6) {
      if (goal && Math.hypot(f.x - B.sx, f.z - B.sz) < .2) { B.stuck = (B.stuck || 0) + 1; I.jump = true; if (B.stuck > 1 && P.dest) goTo(P, f, P.dest[0], P.dest[1]); if (B.stuck > 4) B.plan = null; } else B.stuck = 0;
      B.sx = f.x; B.sz = f.z; B.sT = 0;
    }
    return I;
  }
