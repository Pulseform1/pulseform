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
  function coverFrom(f, ex, ez, ey) {
    let best = null, bd = 1e9;
    for (const q of navCells) { const d = Math.hypot(q[0] - f.x, q[1] - f.z); if (d < 1.5 || d > 9 || d >= bd) continue;
      const de = Math.hypot(q[0] - ex, q[1] - ez); if (de < 4) continue;
      if (los(ex, ey, ez, q[0], hAt(q[0], q[1]) + 1.4, q[1], true) >= Math.hypot(de, ey - hAt(q[0], q[1]) - 1.4) - .3) continue;   // still seen there
      if (!walkLine(f.x, f.z, q[0], q[1]) && d > 4) continue; best = q; bd = d; }
    return best;
  }
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
    if (pistolRound(M.round)) { const r = R(); if (r < .25) buy(f, 'hammer'); else if (r < .4) buy(f, 'quill'); else if (r < .52) buy(f, pick(['viper', 'brick'])); else if (r < .72) { buy(f, 'light'); buy(f, pick(['stub', 'flux'])); } else { buy(f, 'wasp'); buy(f, 'stub'); } return; }
    if (has && GUNS[has].cost >= 2050) { if (f.sh < 50 && f.credits >= 1000) buy(f, 'heavy'); else if (f.sh < 25) buy(f, 'light'); return; }
    if (c >= 3900) { const r = R(); buy(f, r < .1 + .08 * d && c >= 5700 ? pick(['longbow', 'lumen']) : r < .2 ? pick(['torrent', 'hailstorm', 'cyclone', 'harpoon']) : r < .45 ? pick(['lancer', 'warden']) : r < .7 ? pick(['vesper', 'nova']) : pick(['raptor', 'specter', 'lancer'])); buy(f, 'heavy'); }
    else if (c >= 3300) { buy(f, pick(['lancer', 'vesper', 'nova', 'raptor', 'specter'])); buy(f, 'light'); }
    else if (c >= 2450 && R() < .6) { buy(f, pick(['mako', 'paladin', 'raptor'])); buy(f, 'light'); }
    else if (c >= 1950 && R() < .55) { buy(f, pick(['hornet', 'thresher', 'hornet', 'saber', 'pulsar', 'tempest'])); buy(f, 'light'); }
    else if (c >= 1350 && R() < .4) { buy(f, pick(['gnat', 'breaker', 'kite', 'grinder', 'saber'])); buy(f, 'light'); }
    else if (R() < .5) buy(f, pick(['quill', 'hammer', 'stub', 'viper', 'flux']));
  }
  // use an ability at a chosen place, without having to look there first
  function botCast(f, k, data) { if (!f.ab[k] || M.phase !== 'live') return; f.ab[k] = 0; applyAbility(f, k, data); net({ t: 'ab', k, d: data }); }
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
    if (B.hitBy && M.time - B.hitBy.t < .05) { if (!sees) { B.last = { x: B.hitBy.x, z: B.hitBy.z, t: M.time, heard: true }; B.alarm = M.time; } if (B.err) { B.err[0] += rnd(-1, 1) * .035; B.err[1] += rnd(-.2, 1) * .03; } }   // shot: turn to it, and the hit throws the aim
    // what it believes about where you are is a moment old: it aims at that, so moving makes it miss
    B.hist = B.hist || []; if (sees) B.hist.push({ t: M.time, x: e.x, z: e.z, y: e.y, cr: e.crouch }); else B.hist.length = 0;
    while (B.hist.length > 1 && B.hist[1].t <= M.time - D.lag) B.hist.shift();
    const seen = B.hist[0] || { x: e.x, z: e.z, y: e.y, cr: e.crouch };
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
      const dS = Math.hypot(seen.x - f.x, seen.z - f.z), toS = yawTo(f.x, f.z, seen.x, seen.z), mv = Math.hypot(f.vx, f.vz);
      const ty = B.head && dS > 3 ? seen.y + lp(EYE, CEYE, seen.cr) - .03 : seen.y + lp(1.1, .75, seen.cr), aimP = Math.atan2(ty - eyeY(f), dS), pt = patOf(f, G);
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
      if (P.k === 'push' && !fresh && Math.hypot(siteC[0] - f.x, siteC[1] - f.z) < 20 && !(B.chk && B.chkT > M.time)) {
        const vis = HOLDS.filter(h => { const d = Math.hypot(h.p[0] - f.x, h.p[1] - f.z); return d > 3 && d < 22 && los(f.x, eyeY(f), f.z, h.p[0], hAt(h.p[0], h.p[1]) + 1.5, h.p[1], true) >= d - .5; });
        B.chk = vis.length ? pick(vis).p : null; B.chkT = M.time + rnd(.9, 1.6);
      }
      const lk = sees ? [e.x, e.z] : fresh && (P.k !== 'push' || B.lostT < 2.5) ? [B.last.x, B.last.z] : P.k === 'push' && B.chk ? B.chk : node && Math.hypot(node[0] - f.x, node[1] - f.z) > .8 ? node : P.look;
      if (lk) { const d = Math.max(1.5, Math.hypot(lk[0] - f.x, lk[1] - f.z)); tYaw = yawTo(f.x, f.z, lk[0], lk[1]); tPitch = Math.atan2(hAt(lk[0], lk[1]) + 1.5 - eyeY(f), d); }
      if (G.scope && f.scoped) f.scoped = 0;
    }
    const rate = (engaged ? D.turn : B.alarm && M.time - B.alarm < .6 ? D.turn * .8 : 2.2 + B.diff * .8) * dt;
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
      I.walk = M.t > 30 && !fresh && ((P.k === 'hold') || (P.k === 'push' && B.diff > 0 && Math.hypot(siteC[0] - f.x, siteC[1] - f.z) < 15));
      // sprint the long, quiet stretches (rotations, retakes, the early push); now and then a good bot slides into a fight it heard
      const far = P.dest ? Math.hypot(P.dest[0] - f.x, P.dest[1] - f.z) : 0;
      I.sprint = !I.walk && !sees && !engaged && Math.abs(da) < .45 && M.time - (B.engT || -9) > 2 && far > 5 && (B.diff > 0 || M.t > ROUND_T - 15);
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
