  /* ---------- 60 net: online play over the room relay ----------
     Each device simulates its own fighter and streams it twenty times a second; the rival is drawn a tenth of a second
     in the past, between two received snapshots, so it moves smoothly. The shooter decides hits against what they see
     and sends the damage; the victim applies it and reports its own death. The host runs the clock and calls rounds.
     Every message names the fighter it is about (f: its key); a hit also names its victim (v). */
  function net(m) { if (M && M.online && MP.online()) MP.send(m); }
  const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
  // every fighter this device runs (you, and the bots if you host) streams its state, tagged with whose it is
  function goneFor(f) {   // a dropped fighter who did not come back in time
    f.gone = true; f.alive = false; f.dc = 0;
    if (M.fs.length <= 2 || !M.fs.some(q => q.team === f.team && !q.gone)) { M.wins[0] = Math.max(M.wins[0], M.wins[1] + 1); M.host = true; matchOver('left'); } else if (M.host) judge();
  }
  function netTick(dt) {
    if (!M.online) return;
    if (!M.over) for (const f of M.fs) if (f.dc && M.time - f.dc > DC_WAIT) goneFor(f);
    M.netT -= dt; if (M.netT > 0) return; M.netT = .05;
    for (const f of M.fs) if (!f.net && !f.gone) net({ t: 's', f: f.key, x: r2(f.x), y: r2(f.y), z: r2(f.z), yw: r3(f.yaw), pt: r3(f.pitch), vx: r2(f.vx), vz: r2(f.vz), cr: r2(f.crouch), sl: f.slot, g: f.guns[f.slot], hp: Math.ceil(f.hp), sh: f.sh,
      al: f.alive ? 1 : 0, sc: f.scoped, pl: f.plant > 0 ? 1 : 0, df: f.defuse > 0 ? 1 : 0, st: f.step > 0 ? 1 : 0, op: f.op, rd: f.ready ? 1 : 0, sp: f.sprinting ? 1 : 0, sd: f.slide ? 1 : 0, rt: f.rating || 0, sk: (f.skins && f.skins[f.guns[f.slot]]) || 0 });
  }
  function netMsg(m) {
    if (!M || !M.online || M.over) return;
    switch (m.t) {   // the host's calls
      case 'live': if (!M.host) { M.phase = 'live'; M.t = roundT(); emit('live'); } return;
      case 'end': if (!M.host) endRound(m.wi ^ (M.flip || 0), m.why); return;
      case 'rs': if (!M.host) startRound(m.n); return;
      case 'over': if (!M.host) matchOver(); return;
    }
    if (m.t === 'mp-rejoin') { M.alias = M.alias || {}; const key = M.alias[String(m.old)] || String(m.old); M.alias[String(m.from)] = key; const R0 = M.byKey[key]; if (R0) R0.dc = 0; return; }   // back with a new room id: same fighter
    const F = M.byKey[String(m.f != null ? m.f : (M.alias && M.alias[String(m.from)]) || m.from)];
    if (!F || !F.net) return;   // about nobody here, or about a fighter this device runs itself
    if (F.dc) F.dc = 0;
    if (m.t === 'gate') { const G = GATES[m.g | 0]; if (G && G.open !== !!m.o) toggleGate(m.g | 0, F, true); return; }   // someone used a gate's switch
    if (m.t === 'brk') { hitWall(m.b | 0, +m.d || 0, F, true); return; }   // someone shot a breakable wall
    switch (m.t) {
      case 's':
        { const sn = F.snaps || (F.snaps = []), q = { at: M.time, x: m.x, y: m.y, z: m.z, yw: m.yw, pt: m.pt, vx: m.vx, vz: m.vz }; if (sn.length && Math.hypot(sn[sn.length - 1].x - m.x, sn[sn.length - 1].z - m.z) > 6) sn.length = 0; if (sn.length && sn[sn.length - 1].at >= M.time) sn[sn.length - 1] = q; else sn.push(q); if (sn.length > 12) sn.shift(); }   // two in the same instant: keep the newer
        if (m.rt) F.rating = m.rt; if (m.g) { F.skins = F.skins || {}; F.skins[m.g] = m.sk || null; } F.op = m.op || F.op; F.hp = m.hp; F.sh = m.sh; F.slot = m.sl; if (m.g) F.guns[m.sl] = m.g; F.crouch = m.cr; F.scoped = m.sc || 0; F.plant = m.pl ? 1 : 0; F.defuse = m.df ? 1 : 0; F.ready = !!m.rd; F.sprinting = !!m.sp; if (m.sd && !F.slide) emit('slide', F); F.slide = m.sd ? { t: SLIDE_T } : null;
        if (m.st && !(F.step > 0)) emit('step', F); F.step = m.st ? .3 : 0;
        if (m.al && !F.alive && M.phase === 'buy' && !F.gone) F.alive = true;
        break;
      case 'sh': { const S = castShot(F, viewDir(m.a, m.b)); F.kick = .08; F.cloak = 0; emit('shot', F, S, true); break; }
      case 'kn': F.swing = { t: 0, heavy: !!m.h, side: 1 }; emit('melee', F, !!m.h, null); break;
      case 'hit': { const V = M.byKey[String(m.v)]; if (V && !V.net) applyDamage(V, m.d, F, !!m.h, m.w); break; }
      case 'dead': {
        if (!F.alive) break; const by = M.byKey[String(m.by)] || other(F); F.alive = false; F.hp = 0; F.stat.d++; by.stat.k++; if (m.h) by.stat.hs++; if (!by.net && by.team !== F.team) by.credits = Math.min(CASH.cap, by.credits + CASH.kill);
        M.feed.unshift({ a: by.name, b: F.name, w: GUNS[m.w] ? GUNS[m.w].n : m.w, head: !!m.h, t: 0, mine: by === me() }); emit('kill', F, by, !!m.h, m.w); if (M.host) judge(); break;
      }
      case 'ab': spendAb(F, m.k); applyAbility(F, m.k, m.d || {}); break;
      case 'orb': takeOrb(m.i | 0, F); break;   // someone took an ultimate orb
      case 'kx': kitTrip(m.id, m.v, true); break;   // a snare or mine went off on the victim's device
      case 'kd': { const s2 = M.kit && M.kit.sentries.find(q => q.id === m.id); if (s2) hurtSentry(s2, m.d, true); break; }   // someone shot a sentry
      case 'nd': F.smokes = Math.max(0, (F.smokes || 0) - 1); F.throwT = .6; addNade({ x: m.x, y: m.y, z: m.z, vx: m.vx, vy: m.vy, vz: m.vz }); emit('throw', F); break;
      case 'pl': if (!M.planted) plantAt(m.x, m.z, F); break;
      case 'df': defuseDone(F); break;
      case 'rdy': F.ready = true; break;
    }
  }
  // place a network fighter between the two snapshots either side of "a tenth of a second ago"
  function netFollow(f, dt) {
    for (const k of ['flash', 'reveal', 'kick']) if (f[k] > 0) f[k] = Math.max(0, f[k] - dt);
    if (f.swing) { f.swing.t += dt; if (f.swing.t > .7) f.swing = null; }
    const sn = f.snaps; if (!sn || !sn.length) return; const rt = M.time - .1; while (sn.length > 2 && sn[1].at <= rt) sn.shift();
    const a = sn[0], b = sn[1] || a, k = b === a || b.at - a.at < 1e-6 ? 1 : cl((rt - a.at) / (b.at - a.at), 0, 1.4);
    f.x = lp(a.x, b.x, k); f.y = lp(a.y, b.y, k); f.z = lp(a.z, b.z, k); f.yaw = a.yw + angDiff(b.yw, a.yw) * k; f.pitch = lp(a.pt, b.pt, k); f.vx = b.vx; f.vz = b.vz; f.walkT += Math.hypot(f.vx, f.vz) * dt;
  }
  /* The room: two to four friends. VERSUS (2v2) splits them into two teams of at least two (seat order: 1st and 3rd against
     2nd and 4th); DUEL is one-on-one with two players; CO-OP puts everyone on one team. Bots fill the short team, run by the host; the host's settings say who attacks first. */
  function seatsFor(cfg, roster) {
    const humans = roster.filter(p => !p.bot), coop = cfg.team === 'coop';
    if (cfg.teams) {   // from the party: the host's teams, everyone's operative and rating; bots fill up to the team size (or just enough for a rival)
      const seats = humans.map((p, i) => ({ key: String(p.id), name: p.name, team: cfg.teams[p.id] != null ? +cfg.teams[p.id] : i % 2, op: cfg.hops && cfg.hops[p.id], rating: cfg.rts && cfg.rts[p.id] })), size = cfg.size || 2; let b = 0;
      for (const t of [0, 1]) { const have = seats.filter(s => s.team === t).length, want = cfg.fill === false ? Math.max(1, have) : Math.max(size, have); for (let n = have; n < want; n++, b++) seats.push({ key: 'b' + b, name: cfg.names[b % cfg.names.length], team: t, bot: true, op: cfg.ops[b % cfg.ops.length] }); }
      return seats;
    }
    const seats = humans.map((p, i) => ({ key: String(p.id), name: p.name, team: coop ? 0 : i % 2 }));
    const size = coop ? Math.max(2, humans.length) : Math.max(cfg.team === 'duel' ? 1 : 2, ...[0, 1].map(t => seats.filter(s => s.team === t).length));
    let b = 0; for (const t of [0, 1]) for (let n = seats.filter(s => s.team === t).length; n < size; n++, b++) seats.push({ key: 'b' + b, name: cfg.names[b % cfg.names.length], team: t, bot: true, op: cfg.ops[b % cfg.ops.length] });
    return seats;
  }
  Object.assign(MP.opts, {
    max: 4, min: 2, bots: 0, solo: false, onClose: () => { if (screen !== 'menu') toMenu(); }, sub: 'Create a room and send your friends the code. Two to four players.',
    config: () => ({ hostAtt: R() < .5 ? 1 : 0, decHostAtt: R() < .5 ? 1 : 0, map: pick(mapPool(CFG.sites)), sites: CFG.sites, team: CFG.team, botDiff: CFG.diff === 'auto' ? diffFor(STATS.rating).i : CFG.diff,
      names: [...BOT_NAMES].sort(() => R() - .5), ops: Array.from({ length: 4 }, () => pick(Object.keys(OPS))) }),
    onStart: (cfg, roster) => { cfg.names = cfg.names || BOT_NAMES; cfg.ops = cfg.ops || ['vex']; startMatch({ mode: 'online', seats: seatsFor(cfg, roster), hostAtt: cfg.hostAtt, decHostAtt: cfg.decHostAtt, map: cfg.map, botDiff: cfg.botDiff }); emit('matchStart'); },
    onMsg: netMsg,
    // someone's connection dropped: they get DC_WAIT seconds to come back (their game rejoins the room by itself) before
    // they count as gone. Gone: in a duel you win; in a team game they drop out. If the host dropped, the room's next
    // player became host and took over the bots and the clock.
    onLeave: id => {
      if (!M || !M.online || M.over) return;
      if (id === -1) { matchOver('dropped'); return; }   // it was you, and getting back in failed
      const f = M.byKey[(M.alias && M.alias[String(id)]) || String(id)]; if (f && !f.gone && !f.dc) f.dc = M.time;
    },
    onHost: id => { if (!M || !M.online || M.over) return;
      if (String(id) === String(MP.id)) { if (!M.host) { M.host = true; for (const f of M.fs) if (f.isBot) { f.net = false; f.bot = { diff: 1 }; } } }
      else if (M.host) { M.host = false; for (const f of M.fs) if (f.isBot) { f.net = true; f.bot = null; f.snaps = []; } } },   // someone else hosts now: their bots, their clock
    // your own connection: lost (the game keeps running while it reconnects) and back. Back, you may no longer be the host.
    rejoin: true,
    onDrop: on => { if (M && M.online) M.dropped = on; },
    onRejoin: () => { if (!M || !M.online || M.over) return; M.dropped = false; const host = MP.hostId === MP.id;
      if (M.host && !host) { M.host = false; for (const f of M.fs) if (f.isBot) { f.net = true; f.bot = null; f.snaps = []; } }
      else if (!M.host && host) MP.opts.onHost(MP.id); },
  });
