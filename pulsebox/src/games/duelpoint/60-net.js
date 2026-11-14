  /* ---------- 60 net: online play over the room relay ----------
     Each device simulates its own fighter and streams it twenty times a second; the rival is drawn a tenth of a second
     in the past, between two received snapshots, so it moves smoothly. The shooter decides hits against what they see
     and sends the damage; the victim applies it and reports its own death. The host runs the clock and calls rounds.
     Messages name no fighter: a message is always about its sender, who is M.fs[1] on the receiving device. */
  function net(m) { if (M && M.online && MP.online()) MP.send(m); }
  const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
  function netTick(dt) {
    if (!M.online) return; M.netT -= dt; if (M.netT > 0) return; M.netT = .05; const f = me();
    net({ t: 's', x: r2(f.x), y: r2(f.y), z: r2(f.z), yw: r3(f.yaw), pt: r3(f.pitch), vx: r2(f.vx), vz: r2(f.vz), cr: r2(f.crouch), sl: f.slot, g: f.guns[f.slot], hp: Math.ceil(f.hp), sh: f.sh,
      al: f.alive ? 1 : 0, sc: f.scoped, pl: f.plant > 0 ? 1 : 0, df: f.defuse > 0 ? 1 : 0, st: f.step > 0 ? 1 : 0, op: f.op, rd: f.ready ? 1 : 0 });
  }
  function netMsg(m) {
    if (!M || !M.online || M.over) return; const F = foe(), P = me();
    switch (m.t) {
      case 's':
        (F.snaps || (F.snaps = [])).push({ at: M.time, x: m.x, y: m.y, z: m.z, yw: m.yw, pt: m.pt, vx: m.vx, vz: m.vz }); if (F.snaps.length > 12) F.snaps.shift();
        F.op = m.op || F.op; F.hp = m.hp; F.sh = m.sh; F.slot = m.sl; if (m.g) F.guns[m.sl] = m.g; F.crouch = m.cr; F.scoped = m.sc || 0; F.plant = m.pl ? 1 : 0; F.defuse = m.df ? 1 : 0; F.ready = !!m.rd;
        if (m.st && !(F.step > 0)) emit('step', F); F.step = m.st ? .3 : 0;
        if (m.al && !F.alive && M.phase === 'buy') F.alive = true;
        break;
      case 'sh': { const S = castShot(F, viewDir(m.a, m.b)); F.kick = .08; emit('shot', F, S, true); break; }
      case 'kn': F.swing = { t: 0, heavy: !!m.h, side: 1 }; emit('melee', F, !!m.h, null); break;
      case 'hit': applyDamage(P, m.d, F, !!m.h, m.w); break;
      case 'dead':
        if (!F.alive) break; F.alive = false; F.hp = 0; F.stat.d++; P.stat.k++; if (m.h) P.stat.hs++; P.credits = Math.min(CASH.cap, P.credits + CASH.kill);
        M.feed.unshift({ a: P.name, b: F.name, w: GUNS[m.w] ? GUNS[m.w].n : m.w, head: !!m.h, t: 0, mine: true }); emit('kill', F, P, !!m.h, m.w); if (M.host) judge(); break;
      case 'ab': F.ab[m.k] = 0; applyAbility(F, m.k, m.d || {}); break;
      case 'pl': if (!M.planted) plantAt(m.x, m.z, F); break;
      case 'df': defuseDone(F); break;
      case 'rdy': F.ready = true; break;
      case 'live': if (!M.host) { M.phase = 'live'; M.t = ROUND_T; emit('live'); } break;
      case 'end': if (!M.host) endRound(1 - m.wi, m.why); break;
      case 'rs': if (!M.host) startRound(m.n); break;
      case 'over': if (!M.host) matchOver(); break;
    }
  }
  // place a network fighter between the two snapshots either side of "a tenth of a second ago"
  function netFollow(f, dt) {
    for (const k of ['flash', 'reveal', 'kick']) if (f[k] > 0) f[k] = Math.max(0, f[k] - dt);
    if (f.swing) { f.swing.t += dt; if (f.swing.t > .7) f.swing = null; }
    const sn = f.snaps; if (!sn || !sn.length) return; const rt = M.time - .1; while (sn.length > 2 && sn[1].at <= rt) sn.shift();
    const a = sn[0], b = sn[1] || a, k = b === a ? 0 : cl((rt - a.at) / (b.at - a.at), 0, 1.4);
    f.x = lp(a.x, b.x, k); f.y = lp(a.y, b.y, k); f.z = lp(a.z, b.z, k); f.yaw = a.yw + angDiff(b.yw, a.yw) * k; f.pitch = lp(a.pt, b.pt, k); f.vx = b.vx; f.vz = b.vz; f.walkT += Math.hypot(f.vx, f.vz) * dt;
  }
  // the room: two seats, no bots; the host's settings say who attacks first and in a decider
  Object.assign(MP.opts, {
    max: 2, min: 2, bots: 0, solo: false, sub: 'Create a room and send your friend the code.',
    config: () => ({ hostAtt: R() < .5 ? 1 : 0, decHostAtt: R() < .5 ? 1 : 0 }),
    onStart: (cfg, roster) => { const rival = roster.find(p => p.id !== MP.id) || {}; startMatch({ mode: 'online', rival, hostAtt: cfg.hostAtt, decHostAtt: cfg.decHostAtt }); emit('matchStart'); },
    onMsg: netMsg,
    onLeave: () => { if (M && M.online && !M.over) { M.wins[0] = Math.max(M.wins[0], M.wins[1] + 1); M.host = true; matchOver('left'); } },
  });
