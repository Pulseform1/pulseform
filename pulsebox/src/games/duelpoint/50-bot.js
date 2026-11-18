  /* ---------- 50 bot: a player with the same body, guns and accuracy rules, and no knowledge it has not earned ----------
     Each tick botThink returns the same intent a person's input would. What a bot knows about its rival is only what it
     has seen (in its field of view, with a clear line), heard (running steps within earshot, gunfire) or been shown by a
     Ping. Its state lives in f.bot: the plan it is following, when it last knew where the rival was, and its aim error. */
  const laneOf = (x, z) => { const a = areaAt(x, z), k = a ? a.k : ''; if (a && a.lane) return a.lane; return k === 'pier' ? 'pier' : k === 'tunnel' ? 'tunnel' : k === 'yard' || k === 'gate' ? 'mid' : 'any'; };
  // on a two-site map: which site a lane leads to (null for Mid, which leads to both)
  const laneSite = lane => twoSites() && lane in RSITE ? RSITE[lane] : null;
  const dS0 = (f, s) => Math.hypot(s.x - f.x, s.z - f.z);   // flat distance to where a rival was seen
  // which site a defender holds this round: two defenders take one each; one alone guesses
  function defSiteFor(f) {
    const team = M.fs.filter(q => q.team === f.team && q.alive).sort((a, b) => a.key < b.key ? -1 : 1);
    if (!M.defPick || M.defPick.r !== M.round) M.defPick = { r: M.round, s: R() < .5 ? 0 : 1 };
    return team.length > 1 ? (team.indexOf(f) + M.defPick.s) % 2 : M.defPick.s;
  }
  // somewhere to stand with a clear view of a point, a set distance from it (the attacker's post after planting)
  function watchSpot(x, z, rMin, rMax) {
    const c = navCells.filter(q => { const d = Math.hypot(q[0] - x, q[1] - z); return d >= rMin && d <= rMax && los(q[0], hAt(q[0], q[1]) + 1.5, q[1], x, .6, z, false) >= Math.hypot(d, hAt(q[0], q[1]) + .9) - .6; });
    return c.length ? pick(c) : [x, z];
  }
  const goTo = (P, f, x, z) => { P.dest = [x, z]; P.path = findPath(f.x, f.z, x, z); };
  function coverFrom(f, ex, ez, ey) {
    let best = null, bd = 1e9;
    for (const q of navCells) { const d = Math.hypot(q[0] - f.x, q[1] - f.z); if (d < 1.5 || d > 9 || d >= bd) continue;
      const de = Math.hypot(q[0] - ex, q[1] - ez); if (de < 4) continue;
      if (los(ex, ey, ez, q[0], hAt(q[0], q[1]) + 1.4, q[1], true) >= Math.hypot(de, ey - hAt(q[0], q[1]) - 1.4) - .3) continue;   // still seen there
      if (!walkLine(f.x, f.z, q[0], q[1]) && d > 4) continue; best = q; bd = d; }
    return best;
  }
  // attack: a route to a site. On a two-site map the attackers pick a site together each round, then each takes a way in
  function planAttack(f) {
    let lane;
    if (twoSites()) { if (!M.atkPick || M.atkPick.r !== M.round) M.atkPick = { r: M.round, s: R() < .5 ? 0 : 1 }; lane = pick(Object.keys(ROUTES).filter(k => RSITE[k] === M.atkPick.s)); }
    else lane = pick(['pier', 'split', 'mid', 'mid', 'tunnel', 'tunnel'].filter(k => ROUTES[k]));
    const S = SITES[RSITE[lane] || 0];
    return { k: 'push', lane: lane === 'split' ? 'pier' : lane, pts: ROUTES[lane].map(p => [p[0], p[1]]), site: pick(S.cells), sc: S.c, path: [] };
  }
  // defend: a spot watching a way in. On a two-site map, at the site this defender is holding; a noise from a lane that
  // leads to the other site is a reason to rotate there
  function planHold(f, lane) {
    let at = HOLDS;
    if (twoSites()) { const ls = laneSite(lane); f.bot.hs = ls != null ? ls : f.bot.hs != null ? f.bot.hs : defSiteFor(f); at = HOLDS.filter(h => h.s === f.bot.hs); }
    const c = at.filter(h => !lane || h.lane === lane || (lane === 'mid' && laneSite(h.lane) != null)), h = pick(c.length ? c : at.length ? at : HOLDS), P = { k: 'hold', lane: h.lane, look: h.look, crouch: R() < .35, sc: (SITES[h.s] || SITES[0]).c };
    goTo(P, f, h.p[0], h.p[1]); return P;
  }
  // the site a plan is about (its target, or the nearest)
  const siteOfPlan = (P, f) => P && P.sc ? P.sc : nearestSite(f.x, f.z).c;
  // buy for the kind of round: pistols on round 1 and 5, something cheap when short, a rifle and shields when rich
  function botBuy(f) {
    const c = f.credits, d = f.bot.diff, has = f.guns[1];
    if (pistolRound(M.round)) { const r = R(); if (r < .3) buy(f, 'hammer'); else if (r < .5) buy(f, 'quill'); else if (r < .75) { buy(f, 'light'); buy(f, 'stub'); } else { buy(f, 'wasp'); buy(f, 'stub'); } if (f.credits >= 200 && R() < .4) buy(f, 'smoke'); return; }
    if (has && GUNS[has].cost >= 2050) { if (f.sh < 50 && f.credits >= 1000) buy(f, 'heavy'); else if (f.sh < 25) buy(f, 'light'); }
    else if (c >= 3900) { const r = R(); buy(f, r < .1 + .08 * d && c >= 5700 ? 'longbow' : r < .2 ? 'torrent' : r < .55 ? 'lancer' : 'vesper'); buy(f, 'heavy'); }
    else if (c >= 3300) { buy(f, pick(['lancer', 'vesper'])); buy(f, 'light'); }
    else if (c >= 2450 && R() < .6) { buy(f, pick(['mako', 'paladin'])); buy(f, 'light'); }
    else if (c >= 1950 && R() < .55) { buy(f, pick(['hornet', 'thresher'])); buy(f, 'light'); }
    else if (c >= 1350 && R() < .4) { buy(f, pick(['gnat', 'breaker', 'kite'])); buy(f, 'light'); }
    else if (R() < .5) buy(f, pick(['quill', 'hammer', 'stub']));
    if (f.credits >= 200 && R() < .65) buy(f, 'smoke'); if (f.credits >= 1400 && R() < .45) buy(f, 'smoke');
  }

  // the newer operatives' abilities, each with a reason
  function kitBot(f, B, P, side, sees, engaged, fresh, near, dE, e, dt) {
    const ey = eyeY(f), there = P.path && !P.path.length, holdLook = P.look || (B.last ? [B.last.x, B.last.z] : null);
    const lob = (k, tx, tz, g) => { const dx = tx - f.x, dz = tz - f.z, d = Math.hypot(dx, dz), T = cl(d / 13, .45, 1.1), y0 = ey - .1, ty = hAt(tx, tz) + .1; botCast(f, k, { x: f.x, y: y0, z: f.z, vx: dx / T, vy: (ty - y0 + g / 2 * T * T) / T, vz: dz / T }); };
    if (f.op === 'nova') {
      if (f.ab.q && (engaged || (side === 'att' && P.k === 'push' && near < 18 && !sees) || P.k === 'retake')) ability(f, 'q');
      if (f.ab.e && fresh && !sees && dE > 5 && dE < 18 && R() < dt * 1.2) botCast(f, 'e', { x: B.last.x, y: hAt(B.last.x, B.last.z) + 1.2, z: B.last.z });
    } else if (f.op === 'wraith') {
      if (f.ab.q && !sees && ((side === 'att' && P.k === 'push' && near < 20) || (P.k === 'retake' && M.planted && Math.hypot(M.planted.x - f.x, M.planted.z - f.z) < 24))) ability(f, 'q');
      if (f.ab.e && side === 'att' && P.k === 'push' && !sees && M.t < roundT() - 8 && R() < dt * .4) {   // fake a push somewhere else
        const o = SITES.length > 1 ? SITES[1 - (RSITE[P.lane] || 0)].c : pick(HOLDS).look; botCast(f, 'e', { x: o[0], z: o[1] }); }
    } else if (f.op === 'talon') {
      if (f.ab.q && !sees && ((side === 'att' && P.k === 'push' && near < 26 && near > 8) || (side === 'def' && there && M.t < roundT() - 10))) {
        const tg = side === 'att' ? siteOfPlan(P, f) : holdLook; if (tg) { const dx = tg[0] - f.x, dz = tg[1] - f.z, dy = hAt(tg[0], tg[1]) + 2.4 - ey, L = Math.hypot(dx, dy, dz) || 1; botCast(f, 'q', { x: f.x, y: ey, z: f.z, vx: dx / L * 42, vy: dy / L * 42 + 1.5, vz: dz / L * 42 }); } }
      if (f.ab.e && there && ((side === 'def' && P.k === 'hold' && holdLook) || (side === 'att' && P.k === 'post' && M.planted))) {
        const tg = side === 'def' ? holdLook : [M.planted.x, M.planted.z], dx = tg[0] - f.x, dz = tg[1] - f.z, L = Math.hypot(dx, dz) || 1, dd = Math.min(4, L * .5); botCast(f, 'e', { x: f.x + dx / L * dd, z: f.z + dz / L * dd }); }
    } else if (f.op === 'ember') {
      if (f.ab.q && !sees && ((fresh && dE > 6 && dE < 20 && R() < dt * 1.2) || (side === 'att' && M.planted && e.defuse > 0))) { const tg = side === 'att' && M.planted && e.defuse > 0 ? [M.planted.x, M.planted.z] : [B.last.x, B.last.z]; lob('q', tg[0], tg[1], 14); }
      if (f.ab.e && side === 'att' && P.k === 'push' && near < 22 && near > 9 && !sees) {
        const hs = HOLDS.filter(q => q.lane === P.lane || q.lane === 'any'), h = hs.length ? pick(hs) : null;
        if (h) { const dx = h.p[0] - f.x, dz = h.p[1] - f.z, L = Math.hypot(dx, dz) || 1, dd = Math.min(9, L * .55); botCast(f, 'e', { x: f.x + dx / L * dd, z: f.z + dz / L * dd, px: -dz / L, pz: dx / L }); } }
    } else if (f.op === 'axiom') {
      if (f.ab.q && there && ((side === 'def' && P.k === 'hold') || (side === 'att' && P.k === 'post')) && holdLook) {
        const yaw = yawTo(f.x, f.z, holdLook[0], holdLook[1]), fx = -Math.sin(yaw), fz = -Math.cos(yaw); botCast(f, 'q', { x: f.x + fx * 1.2, z: f.z + fz * 1.2, yaw }); }
      if (f.ab.e && ((side === 'def' && P.k === 'hold' && there && M.t < roundT() - 6) || (side === 'att' && M.planted && Math.hypot(M.planted.x - f.x, M.planted.z - f.z) < 2))) botCast(f, 'e', { x: f.x, z: f.z });
    }
  }
  // use an ability at a chosen place, without having to look there first
  function botCast(f, k, data) { if (!f.ab[k] || M.phase !== 'live') return; f.ab[k] = 0; applyAbility(f, k, data); net({ t: 'ab', k, d: data, f: f.key }); }
  const magOf = (f, s) => { const k = f.guns[s], A = k && f.ammo[k]; return A ? A.mag : 0; };
  const hasAmmo = (f, s) => { const k = f.guns[s], A = k && f.ammo[k]; return !!A && A.mag + A.res > 0; };

  function botThink(f, dt) {
    const B = f.bot, D = B.D || DIFF[B.diff], e = other(f), I = { mx: 0, mz: 0, walk: false, crouch: false, jump: false, use: false, fire: false };
    if (B.dummy) {   // the range's target: pace about, face the player, never shoot
      const h = B.home || [f.x, f.z]; f.yaw = yawTo(f.x, f.z, e.x, e.z); I.mx = Math.hypot(f.x - h[0], f.z - h[1]) > 2.5 ? Math.sign(Math.cos(f.yaw) * (h[0] - f.x) - Math.sin(f.yaw) * (h[1] - f.z)) : Math.sin(M.time * 1.1 + h[0]) > 0 ? 1 : -1;
      I.walk = Math.sin(M.time * .37 + h[1]) > .3; I.crouch = Math.sin(M.time * .23 + h[0]) > .8; return I;
    }
    if (M.phase === 'buy') { if (!B.bought) { B.bought = true; botBuy(f); f.ready = true; } return I; }
    if (M.phase === 'end') return I;
    const side = sideOf(f), dE = Math.hypot(e.x - f.x, e.z - f.z), toE = yawTo(f.x, f.z, e.x, e.z);
    if (B.ph == null) { B.ph = R() * 9; B.hp0 = f.hp; B.rx = D.react; }

    // --- what it knows
    const sees = e.alive && (Math.abs(angDiff(toE, f.yaw)) < 1.1 || dE < 4) && canSee(f, e);
    if (sees) { B.seen = (B.seen || 0) + dt; B.last = { x: e.x, z: e.z, t: M.time }; B.lostT = 0; } else { B.seen = 0; B.lostT = (B.lostT || 0) + dt; }
    if (e.alive && !sees && ((e.step > 0 && dE < D.hear) || (e.kick > 0 && dE < 45) || e.reveal > 0)) B.last = { x: e.x, z: e.z, t: M.time, heard: true };
    if (M.kit) for (const L of M.kit.lures) if (L.loud > 0 && L.by.team !== f.team && Math.hypot(L.x - f.x, L.z - f.z) < D.hear * 1.4) B.last = { x: L.x, z: L.z, t: M.time, heard: true };   // a Ghost Step sounds real
    if (B.hitBy && M.time - B.hitBy.t < .05) { if (!sees) { B.last = { x: B.hitBy.x, z: B.hitBy.z, t: M.time, heard: true }; B.alarm = M.time; } if (B.err) { B.err[0] += rnd(-1, 1) * .035; B.err[1] += rnd(-.2, 1) * .03; } }   // shot: turn to it, and the hit throws the aim
    // what it believes about where you are is a moment old: it aims at that, so moving makes it miss
    B.hist = B.hist || []; if (sees) B.hist.push({ t: M.time, x: e.x, z: e.z, y: e.y, cr: e.crouch, h: headOf(e) }); else B.hist.length = 0;
    while (B.hist.length > 1 && B.hist[1].t <= M.time - D.lag) B.hist.shift();
    const seen = B.hist[0] || { x: e.x, z: e.z, y: e.y, cr: e.crouch, h: headOf(e) };
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

    // --- out of bullets or losing badly: get out of sight first, reload there, then pick the fight up again
    { const A0 = f.ammo[gun(f).k], low = f.hp + f.sh < 45 && e.hp + e.sh > f.hp + f.sh + 35, dry = A0 && A0.mag === 0 && A0.res > 0;
      if (P.k !== 'cover' && B.diff > 0 && (sees || M.time - (B.engT || -9) < 1.5) && (dry || (low && !B.fled)) && !(side === 'def' && M.planted) && !gun(f).melee) {
        const c = coverFrom(f, B.last ? B.last.x : e.x, B.last ? B.last.z : e.z, eyeY(e));
        if (c) { B.fled = low; P = B.plan = { k: 'cover', back: P, t: M.time }; goTo(P, f, c[0], c[1]); }
      }
      if (P.k === 'cover' && ((!P.path || !P.path.length) && (!A0 || A0.mag >= gun(f).mag * .6 || A0.res === 0) || M.time - P.t > 6)) { const b = P.back; P = B.plan = b && b.k !== 'cover' ? b : planHold(f, null); if (P.dest) goTo(P, f, P.dest[0], P.dest[1]); }
      if (P.k === 'cover' && A0 && !sees && A0.mag < gun(f).mag) reload(f);
    }
    // --- which weapon
    if (f.slot !== 1 && hasAmmo(f, 1) && !(magOf(f, 1) === 0 && sees)) switchTo(f, 1);
    else if (f.slot === 1 && magOf(f, 1) === 0 && sees && magOf(f, 2) > 0 && B.diff > 0) switchTo(f, 2);
    else if (f.slot !== 3 && !hasAmmo(f, 1) && !hasAmmo(f, 2)) switchTo(f, 3);
    else if (f.slot === 3 && hasAmmo(f, 2) && !hasAmmo(f, 1)) switchTo(f, 2);
    const G = gun(f), A = f.ammo[G.k];
    if (A && !sees && B.lostT > 1.2 && A.mag < G.mag * .45 && A.res > 0) reload(f);

    // --- aim. Once it has reacted it swings toward where it believes you are (a moment old), starting off by a first-sight
    // error it corrects over a flick, with a wobble that never quite settles, at a capped turn speed. Moving, being hit and
    // a long spray all make it worse. Not seeing you, it holds its crosshair at head height on the angle it expects you from.
    let tYaw = f.yaw, tPitch = f.pitch, engaged = false, goal = null;
    if (sees && B.seen > B.rx) {
      engaged = true; B.engT = M.time;
      if (!B.locked) { B.locked = true; B.head = R() < D.hs; const a = R() * TAU, m = D.err * (.6 + R() * .8); B.err = [Math.cos(a) * m, Math.sin(a) * m * .6]; B.mt = rnd(.5, 1.2); }
      const k = Math.pow(.05, dt / D.flick); B.err[0] *= k; B.err[1] *= k;
      if ((B.mt -= dt) <= 0) { B.mt = rnd(.5, 1.3); B.err[0] += rnd(-1, 1) * D.jit * 1.5; B.err[1] += rnd(-1, 1) * D.jit; }   // a little re-adjust now and then
      // a head shot aims where the head really is (a crouch or a run moves it off the feet); a body shot at the chest
      const hd = B.head && dS0(f, seen) > 3, ax = hd ? seen.h.x : seen.x, az = hd ? seen.h.z : seen.z, dS = Math.hypot(ax - f.x, az - f.z), toS = yawTo(f.x, f.z, ax, az), mv = Math.hypot(f.vx, f.vz);
      const ty = hd ? seen.h.y - .01 : seen.y + lp(1.1, .75, seen.cr), aimP = Math.atan2(ty - eyeY(f), dS), pt = patOf(f, G);
      const wob = D.jit * (1 + mv * .25 + Math.min(2, f.spray * .15));
      tYaw = toS + B.err[0] + Math.sin(M.time * 3.1 + B.ph) * wob - pt[0] * D.spray; tPitch = aimP + B.err[1] + Math.cos(M.time * 2.7 + B.ph) * wob * .7 - pt[1] * D.spray;
      const off = Math.hypot(angDiff(toS - pt[0] * D.spray, f.yaw), aimP - pt[1] * D.spray - f.pitch), size = Math.atan2(.3, dS);
      if (B.rest > 0) B.rest -= dt;
      if (G.melee) I.fire = dE < 2.2 && off < .5;
      else {
        if (G.scope && !f.scoped && off < .3) f.scoped = 1;
        if (G.wind && off < .6) I.spin = true;   // a rotary gun: spin it up while bringing it on target
        const steady = spreadOf(f) < Math.max(.012, size * (2.2 - D.spray)) || dE < (G.pel ? 9 : 5);
        if (G.auto && dE > 12 && f.spray > 2 + D.spray * 6) B.rest = .2 + (1 - D.spray) * .25;   // let a long spray settle
        if (off < size * 1.2 + D.jit && steady && !(B.rest > 0) && (!G.scope || f.scoped)) {
          if (G.auto) I.fire = true; else { B.semi = (B.semi || 0) - dt; if (B.semi <= 0) { I.fire = true; B.semi = 60 / G.rpm + .12 + .3 * (1 - D.spray); } }
        }
      }
    } else {
      if (!sees) { B.locked = false; B.rx = D.react * rnd(.85, 1.25) + (B.alarm && M.time - B.alarm < 1 ? .1 : 0); }
      const node = P.path && P.path.length ? P.path[Math.min(1, P.path.length - 1)] : null;
      // clearing a site on the way in: look at the corners someone could hold, nearest first, rather than at the floor ahead
      if (P.k === 'push' && !fresh && Math.hypot(siteOfPlan(P, f)[0] - f.x, siteOfPlan(P, f)[1] - f.z) < 20 && !(B.chk && B.chkT > M.time)) {
        const vis = HOLDS.filter(h => { const d = Math.hypot(h.p[0] - f.x, h.p[1] - f.z); return d > 3 && d < 22 && los(f.x, eyeY(f), f.z, h.p[0], hAt(h.p[0], h.p[1]) + 1.5, h.p[1], true) >= d - .5; });
        B.chk = vis.length ? pick(vis).p : null; B.chkT = M.time + rnd(.9, 1.6);
      }
      const lk = sees ? [e.x, e.z] : fresh && (P.k !== 'push' || B.lostT < 2.5) ? [B.last.x, B.last.z] : P.k === 'push' && B.chk ? B.chk : node && Math.hypot(node[0] - f.x, node[1] - f.z) > .8 ? node : P.look;
      if (lk) { const d = Math.max(1.5, Math.hypot(lk[0] - f.x, lk[1] - f.z)); tYaw = yawTo(f.x, f.z, lk[0], lk[1]); tPitch = Math.atan2(hAt(lk[0], lk[1]) + 1.5 - eyeY(f), d); }
      if (G.scope && f.scoped) f.scoped = 0;
    }
    if (!sees && M.kit && M.kit.sentries.length && !gun(f).melee) {
      const st = M.kit.sentries.find(q => q.by.team !== f.team && Math.hypot(q.x - f.x, q.z - f.z) < 20 && los(f.x, eyeY(f), f.z, q.x, q.y + .6, q.z) >= Math.hypot(q.x - f.x, q.z - f.z, q.y + .6 - eyeY(f)) - .4);
      if (st) { const d = Math.hypot(st.x - f.x, st.z - f.z); tYaw = yawTo(f.x, f.z, st.x, st.z) + Math.sin(M.time * 3 + B.ph) * D.jit; tPitch = Math.atan2(st.y + .6 - eyeY(f), d); if (Math.abs(angDiff(tYaw, f.yaw)) < Math.atan2(.25, d) + .01 && Math.abs(tPitch - f.pitch) < .05) I.fire = true; }
    }
    const rate = (engaged ? D.turn : B.alarm && M.time - B.alarm < .6 ? D.turn * .8 : 2.2 + B.diff * .8) * dt;
    f.yaw += cl(angDiff(tYaw, f.yaw), -rate, rate); f.pitch += cl(tPitch - f.pitch, -rate * .7, rate * .7);

    // --- abilities, each with a reason
    if (M.phase === 'live') {
      const sc = siteOfPlan(P, f), near = Math.hypot(sc[0] - f.x, sc[1] - f.z);
      if (f.op === 'vex' && f.ab.e && side === 'att' && P.k === 'push' && near < 22 && !sees) { const h = pick(HOLDS.filter(q => q.lane === P.lane || q.lane === 'any')); if (Math.hypot(h.p[0] - f.x, h.p[1] - f.z) < 24) botCast(f, 'e', { x: h.p[0], z: h.p[1] }); }
      if (f.op === 'vex' && f.ab.q && engaged && f.hp < 45 && Math.hypot(f.vx, f.vz) > 2) ability(f, 'q');
      if (f.op === 'iris' && f.ab.q && (side === 'att' ? near < 26 : M.t < roundT() - 10 || fresh)) ability(f, 'q');
      if (f.op === 'iris' && f.ab.e && !sees && fresh && B.last.heard && dE > 6 && dE < 16 && R() < dt * 1.5) botCast(f, 'e', { x: B.last.x, y: 1.6, z: B.last.z });
      if (f.op === 'bastion' && f.ab.q && engaged && f.hp < 70 && dE > 5) ability(f, 'q');
      if (f.op === 'bastion' && f.ab.e && f.hp < 60 && !sees) ability(f, 'e');
      kitBot(f, B, P, side, sees, engaged, fresh, near, dE, e, dt);
      // smoke grenades: attackers cover a corner before stepping onto the site; defenders smoke the lane they just heard someone in
      if (f.smokes > 0 && !sees && !(B.nadeT > M.time)) {
        if (side === 'att' && P.k === 'push' && near < 24 && near > 8) { const hs = HOLDS.filter(q => (q.lane === P.lane || q.lane === 'any') && Math.hypot(q.p[0] - f.x, q.p[1] - f.z) < 22); if (hs.length && R() < dt * 2) { const h = pick(hs); lobNade(f, h.p[0], h.p[1]); B.nadeT = M.time + 6; } }
        else if (side === 'def' && fresh && B.last.heard && dE > 8 && dE < 20 && R() < dt * .7) { lobNade(f, B.last.x, B.last.z); B.nadeT = M.time + 8; }
      }
    }

    // --- moving
    if (P.path && P.path.length) { goal = P.path[0]; if (Math.hypot(goal[0] - f.x, goal[1] - f.z) < .55) { P.path.shift(); goal = P.path[0] || null; } }
    const arrived = !P.path || !P.path.length;
    if (arrived) {
      if (P.k === 'push') { if (P.pts.length) { const q = P.pts.shift(); goTo(P, f, q[0], q[1]); } else if (!P.toSite) { P.toSite = true; goTo(P, f, P.site[0], P.site[1]); } }
      if (P.k === 'hunt') B.plan = planHold(f, null);
      if (P.k === 'cover' && !engaged) I.crouch = B.diff > 1;
      if ((P.k === 'hold' || P.k === 'post') && P.crouch && !engaged) I.crouch = true;
    }
    if (engaged && P.k !== 'cover') {   // stop to shoot; step out between bursts; better bots brake with a counter-strafe
      goal = null; B.pk = (B.pk || 0) - dt;
      if (B.pk <= 0) { B.mv = !B.mv; B.pk = B.mv ? rnd(.2, .45) * (G.cat === 'SMG' || G.pel ? 1.6 : 1) : rnd(.5, 1.2); B.str = R() < .5 ? -1 : 1; }
      const lv = Math.cos(f.yaw) * f.vx - Math.sin(f.yaw) * f.vz;
      if (B.mv) { const sx = f.x + Math.cos(f.yaw) * B.str * 1.3, sz = f.z - Math.sin(f.yaw) * B.str * 1.3; if (!walkLine(f.x, f.z, sx, sz)) B.str = -B.str; I.mx = B.str; }
      else I.mx = B.diff > 0 && Math.abs(lv) > 1.2 ? -Math.sign(lv) : 0;
      if (G.melee) goal = [e.x, e.z];
      if (B.diff > 0 && G.auto && dE < 12 && f.spray > 4) I.crouch = true;
    } else if (M.time - (B.engT || -9) < .8 && P.k !== 'retake' && P.k !== 'cover') goal = null;   // just lost a rival it was fighting: hold the angle a moment
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
      I.walk = M.t > 30 && !fresh && ((P.k === 'hold') || (P.k === 'push' && B.diff > 0 && Math.hypot(siteOfPlan(P, f)[0] - f.x, siteOfPlan(P, f)[1] - f.z) < 15));
      // sprint the long, quiet stretches (rotations, retakes, the early push); now and then a good bot slides into a fight it heard
      const far = P.dest ? Math.hypot(P.dest[0] - f.x, P.dest[1] - f.z) : 0;
      I.sprint = !I.walk && !sees && !engaged && Math.abs(da) < .45 && M.time - (B.engT || -9) > 2 && far > 5 && (B.diff > 0 || M.t > roundT() - 15);
      if (f.sprinting && B.diff > 1 && fresh && far < 9 && !B.slid) { B.slid = true; I.crouch = true; }
    }
    // stuck against something: hop, then find the way again
    B.sT = (B.sT || 0) + dt;
    if (B.sT > .6) {
      if (goal && Math.hypot(f.x - B.sx, f.z - B.sz) < .2) { B.stuck = (B.stuck || 0) + 1; I.jump = true; if (B.stuck > 1 && P.dest) goTo(P, f, P.dest[0], P.dest[1]); if (B.stuck > 4) B.plan = null; } else B.stuck = 0;
      B.sx = f.x; B.sz = f.z; B.sT = 0;
    }
    return I;
  }
