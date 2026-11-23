  /* ---------- 48 kit, fourth part: holding a site ----------
     The tools whose job is to lock a site down, rebuilt so each is strong where it is put, readable to both sides, and has
     an answer. Everything here can be set in the buy phase (on your side of the barrier) and is shown to rivals in some way.
     AXIOM   Q Sentry: guards a 90 degree arc round the way it was set facing (its head sweeps it, and the arc shows on the
               floor). A rival who walks into the arc in its sight is revealed at once, the eye turns amber, and after a
               0.6 s lock it fires (10 a shot, 4 a second). 80 health. The Q key again beside it picks it up.
             E Tripwire: a wire at shin height across the doorway you look at (two walls no more than 8 m apart, up to 6 m
               out). It arms in 1.5 s. A rival who walks across it is revealed for 3 s and, 0.4 s later, a burst where they
               crossed does up to 60 within 3.2 m. Jump over it and it never knows. Rivals see the wire within 10 m; one
               bullet into either anchor breaks it. The E key again beside it picks it up.
             C Slow Field: the canister waits where it lands. Armed after 1 s, a rival within 3.5 m opens the 5 m field
               (half speed, 6 s). It blinks; rivals see it within 12 m, and one bullet breaks it.
     BASTION Q Rampart: 500 health and 20 s. Rivals' bullets wear it down (body damage), and the wall shows it on its faces (cracks, dead panels, holes): what is
               left. The Q key again within 4.5 m reinforces it, once: full health and 8 s more.
             C Ward Beacon: it stays (20 s of the live round) and pulses: +15 shield at once to teammates within 6 m, then
               +5 every 2 s, up to 50. A tall amber light anyone can see; 60 health.
     TALON   E Snare: set on the floor where you aim, up to 8 m. The first rival over it is leashed to it: they cannot get
               more than 2.2 m away for 3 s, move at a third of their speed, and are revealed for 4 s. Rivals see it within
               6 m. One bullet into it breaks it, and frees whoever it holds. The E key again beside it picks it up.
     Picking up gives the charge back; it can go down again 6 s later (1.5 s in the buy phase). A picked-up sentry keeps
     its damage. As with every ability, what happens to a fighter is worked out on that fighter's own device and told to
     the others; what happens to a device (set, set off, picked up, broken, hurt) goes as a message with its name. */
  const SENTRY = { hp: 80, arc: .785, range: 22, lock: .6, rate: .25, dmg: 10, scan: .2, reveal: 1.5 };
  const WIRE = { reach: 6, len: 8, h: .45, arm: 1.5, fuse: .4, r: 3.2, dmg: 60, lit: 3, see: 10 };
  const CAN = { arm: 1, trip: 3.5, r: 5, T: 6, see: 12 };
  const RAMP = { hp: 500, T: 20, more: 8, reach: 4.5 };
  const BEACON = { hp: 60, T: 20, first: 15, every: 2, pulse: 5, r: 6, cap: 50 };
  const SNARE = { reach: 8, arm: .8, trip: 1.3, hold: 3, leash: 2.2, lit: 4, see: 6 };
  const PICK = { r: 2.5, cd: 6, cdBuy: 1.5 };
  // the name a thing left in the world goes by on every device (the caster's device makes it; see ability())
  const devId = (f, k, d) => typeof d.id === 'string' && d.id ? d.id.slice(0, 48) : kitId(f, k) + ':' + (M.kit.n = (M.kit.n || 0) + 1);
  // what the player is told when a placement has nowhere to go
  const NO_SPOT = { axiome: 'NO DOORWAY THERE: AIM BETWEEN TWO WALLS', tessele: 'NOT PAST THE BARRIER' };
  // seconds before a picked-up device can go down again (0: ready)
  const pkWait = (f, k) => f && f.pkT && f.pkT[k] > M.time ? f.pkT[k] - M.time : 0;

  /* ---- placing ---- */
  function placeSentry(f, d) {
    if (![d.x, d.z, d.yaw].every(finite)) return false; const K2 = M.kit, hk = f.key + ':q', hp = K2.held[hk] > 0 ? Math.min(SENTRY.hp, K2.held[hk]) : SENTRY.hp; delete K2.held[hk];
    K2.sentries.push({ id: devId(f, 'q', d), x: d.x, z: d.z, y: hAt(d.x, d.z), yaw: d.yaw, aim: d.yaw, pitch: 0, hp, cd: 0, by: f, target: null, lockT: 0, scanT: 0, bd: 0, flash: 0 }); return true;
  }
  // the Tripwire's anchors: where the aim meets the floor ahead (up to 6 m), then across it, wall to wall
  function wireAim(f, d, S) {
    let hx = d[0], hz = d[2]; const hl = Math.hypot(hx, hz); if (hl < .2) { hx = -Math.sin(f.yaw); hz = -Math.cos(f.yaw); } else { hx /= hl; hz /= hl; }
    const out = Math.max(.8, Math.min(WIRE.reach, (S ? S.dist : WIRE.reach) * Math.max(hl, .2) - .3, rayGrid(f.x, f.y + WIRE.h, f.z, hx, 0, hz, WIRE.reach) - .4));
    const cx = f.x + hx * out, cz = f.z + hz * out, y = hAt(cx, cz), h = y + WIRE.h, px = -hz, pz = hx; if (Math.abs(y - f.y) > 1.3) return null;
    const l1 = rayGrid(cx, h, cz, px, 0, pz, WIRE.len), l2 = rayGrid(cx, h, cz, -px, 0, -pz, WIRE.len); if (l1 + l2 > WIRE.len || l1 + l2 < .8) return null;
    return { ax: r2(cx + px * (l1 - .06)), az: r2(cz + pz * (l1 - .06)), bx: r2(cx - px * (l2 - .06)), bz: r2(cz - pz * (l2 - .06)), y: r2(y) };
  }
  function placeWire(f, d) {
    if (![d.ax, d.az, d.bx, d.bz, d.y].every(finite)) return false; const ex = d.bx - d.ax, ez = d.bz - d.az, L = Math.hypot(ex, ez); if (L > WIRE.len + .5 || L < .3) return false;
    const K2 = M.kit; K2.wires = K2.wires.filter(W => W.by !== f);
    K2.wires.push({ id: devId(f, 'e', d), ax: d.ax, az: d.az, bx: d.bx, bz: d.bz, ex, ez, len2: L * L, y: d.y, x: (d.ax + d.bx) / 2, z: (d.az + d.bz) / 2, arm: WIRE.arm, fuse: -1, by: f, sd: {} }); return true;
  }
  // the Slow Field canister comes down (46's lobLand) and waits
  function placeCan(B, x, y, z) {
    if (!buyLandOk(B, x, z, 'c')) return; const K2 = M.kit; K2.cans = K2.cans.filter(C => C.by !== B.by);
    K2.cans.push({ id: B.id || kitId(B.by, 'c'), x, y, z, arm: CAN.arm, by: B.by }); emit('canSet', K2.cans[K2.cans.length - 1]);
  }
  function placeRampart(f, d) {
    if (![d.x, d.z].every(finite)) return false; const ax = d.ax ? 1 : 0, w = ax ? { x0: d.x - .3, x1: d.x + .3, z0: d.z - 2.6, z1: d.z + 2.6 } : { x0: d.x - 2.6, x1: d.x + 2.6, z0: d.z - .3, z1: d.z + .3 };
    Object.assign(w, { t: RAMP.T, grow: 0, hp: RAMP.hp, max: RAMP.hp, by: f, id: devId(f, 'q', d), re: 0 }); M.walls.push(w); emit('wall', w); return true;
  }
  function placeBeacon(f, d) {
    if (![d.x, d.z].every(finite)) return false; const K2 = M.kit; K2.beacons = K2.beacons.filter(B => B.by !== f);
    K2.beacons.push({ id: devId(f, 'c', d), x: d.x, y: hAt(d.x, d.z), z: d.z, t: BEACON.T, tick: .8, n: 0, hp: BEACON.hp, flash: 0, by: f }); return true;
  }
  function placeSnare(f, d) {
    if (![d.x, d.z].every(finite)) return false; const K2 = M.kit; K2.snares = K2.snares.filter(s => s.by !== f);
    K2.snares.push({ id: devId(f, 'e', d), x: d.x, z: d.z, y: hAt(d.x, d.z), arm: SNARE.arm, by: f, sprung: '', t: 0 }); return true;
  }

  /* ---- the key again: pick it up (Sentry, Tripwire, Snare) or reinforce it (Rampart) ---- */
  const near2 = (f, x, z, r) => Math.hypot(x - f.x, z - f.z) < r;
  function pickDev(f, k) {
    const K2 = M && M.kit; if (!K2 || !f.alive) return null; const key = f.op + k, O = OPS[f.op], mx = k === 'e' ? 1 : (O && O[k] && O[k].max) || 1; if ((f.ab[k] | 0) >= mx) return null;
    if (key === 'axiomq') { for (const s of K2.sentries) if (s.by === f && near2(f, s.x, s.z, PICK.r)) return s; }
    else if (key === 'axiome') { for (const W of K2.wires) if (W.by === f && W.fuse < 0 && (near2(f, W.ax, W.az, PICK.r) || near2(f, W.bx, W.bz, PICK.r) || near2(f, W.x, W.z, PICK.r))) return W; }
    else if (key === 'talone') { for (const s of K2.snares) if (s.by === f && !s.sprung && near2(f, s.x, s.z, PICK.r)) return s; }
    return null;
  }
  function rampOf(f) { if (!M || f.op !== 'bastion' || !f.alive) return null; for (const w of M.walls) if (w.by === f && w.hp > 0 && !w.re && near2(f, (w.x0 + w.x1) / 2, (w.z0 + w.z1) / 2, RAMP.reach)) return w; return null; }
  function pickUp(f, k, D, fromNet) {
    const K2 = M.kit; let A = null; for (const a of [K2.sentries, K2.wires, K2.snares]) if (a.includes(D)) A = a; if (!A) return false;
    A.splice(A.indexOf(D), 1); if (A === K2.sentries) K2.held[f.key + ':q'] = D.hp;
    const O = OPS[f.op], mx = k === 'e' ? 1 : (O && O[k] && O[k].max) || 1; f.ab[k] = Math.min(mx, (f.ab[k] | 0) + 1);
    f.pkT = f.pkT || {}; f.pkT[k] = M.time + (M.phase === 'buy' ? PICK.cdBuy : PICK.cd); emit('kitPick', f, D);
    if (f === me()) say((O && O[k] ? O[k].n.toUpperCase() : 'IT') + ' PICKED UP', O ? O.col : BONE);
    if (!fromNet) net({ t: 'pk', k, id: D.id, f: f.key }); return true;
  }
  function reinforce(w, fromNet) { if (!w || w.re || !(w.hp > 0)) return false; w.re = 1; w.hp = w.max; w.t += RAMP.more; emit('wallMend', w); if (w.by === me()) say('RAMPART REINFORCED', OPS.bastion.col); if (!fromNet) net({ t: 'rf', id: w.id, f: w.by.key }); return true; }
  // (from readyAb: true if the key press was used this way)
  function kitAltTry(f, k) {
    if (!M || !f || !f.alive || abBlocked(f, k)) return false;
    const D = pickDev(f, k); if (D) return pickUp(f, k, D, false);
    if (k === 'q' && f.op === 'bastion') { const w = rampOf(f); if (w) return reinforce(w, false); }
    return false;
  }
  // the hint for it, under the crosshair ('' when there is nothing to pick up or reinforce)
  function kitAltHint(f, keyOf) {
    if (!M || !f || !f.alive || (M.phase !== 'live' && M.phase !== 'buy')) return '';
    for (const k of ['q', 'e']) if (pickDev(f, k)) return keyOf(k) + ' · PICK UP ' + OPS[f.op][k].n.toUpperCase();
    if (rampOf(f)) return keyOf('q') + ' · REINFORCE RAMPART';
    return '';
  }

  /* ---- set off, broken, hurt ---- */
  // a trap set off by a rival (from kitTrip: the victim's own device decided it); true if it was there to set off
  function lockTrip(id, v) {
    const K2 = M.kit;
    for (const s of K2.snares) if (s.id === id) { if (s.sprung) return false; s.sprung = v ? v.key : '-'; s.t = SNARE.hold; s.arm = 0;
      if (v) { v.snare = Math.max(v.snare || 0, SNARE.hold); v.reveal = Math.max(v.reveal || 0, SNARE.lit); if (v === me()) say('SNARED: YOU ARE LEASHED', WARN); else if (s.by === me()) say('SNARE SPRUNG', OPS.talon.col); }
      emit('snared', s, v); return true; }
    for (const W of K2.wires) if (W.id === id) { if (W.fuse >= 0) return false; W.fuse = WIRE.fuse;
      if (v) { const q = cl(((v.x - W.ax) * W.ex + (v.z - W.az) * W.ez) / W.len2, 0, 1); W.x = W.ax + W.ex * q; W.z = W.az + W.ez * q; v.reveal = Math.max(v.reveal || 0, WIRE.lit); if (v === me()) say('TRIPWIRE!', WARN); else if (W.by === me()) say('TRIPWIRE CROSSED', OPS.axiom.col); }
      emit('mineArm', W); return true; }
    for (let i = 0; i < K2.cans.length; i++) { const C = K2.cans[i]; if (C.id !== id) continue; K2.cans.splice(i, 1); const F = { x: C.x, y: C.y, z: C.z, r: CAN.r, t: CAN.T, T: CAN.T, by: C.by }; K2.fields.push(F); emit('fieldStart', F); return true; }
    return false;
  }
  // one bullet: a rival's dormant Tessel device, Tripwire anchor, canister or Snare breaks
  function kitBreak(id, fromNet) {
    const K2 = M && M.kit; if (!K2 || typeof id !== 'string') return false;
    for (const [A, kind] of [[K2.devs, 'dev'], [K2.wires, 'wire'], [K2.cans, 'can'], [K2.snares, 'snare']]) for (let i = 0; i < A.length; i++) { const o = A[i]; if (o.id !== id) continue;
      A.splice(i, 1); if (kind === 'snare' && o.sprung) { const v = M.byKey[o.sprung]; if (v) v.snare = Math.min(v.snare || 0, .2); }
      emit('kitBreak', o, kind); if (o.by === me()) say(kind === 'dev' ? (o.k === 'q' ? 'YOUR LULL WAS BROKEN' : 'YOUR LIGHTLINE WAS BROKEN') : kind === 'wire' ? 'TRIPWIRE BROKEN' : kind === 'can' ? 'SLOW FIELD BROKEN' : 'SNARE BROKEN', DIM);
      if (!fromNet) net({ t: 'kb', id }); return true; }
    return false;
  }
  // a rival's bullet against the small things: the nearest it meets before whatever else it hit. Beacons take damage; the
  // rest break. Decided on the shooter's device, told to the others
  const TSP = [0, 0, 0];
  function trapShot(f, S, G) {
    const K2 = M.kit; if (!(K2.devs.length || K2.wires.length || K2.cans.length || K2.snares.length || K2.beacons.length)) return false; let best = null, bt = S.dist + .2;
    const test = (o, x, y, z, r) => { TSP[0] = x; TSP[1] = y; TSP[2] = z; const t = raySphere(S.o, S.d, TSP, r); if (t > 0 && t < bt) { bt = t; best = o; } };
    for (const D of K2.devs) if (enemyOf(D.by, f)) for (let i = 0; i < devN(D) && i < 2; i++) { devPt(D, i, TSP); test(D, TSP[0], D.k === 'q' ? TSP[1] : D.y + .4, TSP[2], D.k === 'q' ? .3 : .22); }
    for (const W of K2.wires) if (enemyOf(W.by, f)) { test(W, W.ax, W.y + WIRE.h, W.az, .2); test(W, W.bx, W.y + WIRE.h, W.bz, .2); }
    for (const C of K2.cans) if (enemyOf(C.by, f)) test(C, C.x, C.y + .2, C.z, .25);
    for (const s of K2.snares) if (enemyOf(s.by, f)) test(s, s.x, s.y + .1, s.z, .32);
    for (const B of K2.beacons) if (enemyOf(B.by, f)) test(B, B.x, B.y + .5, B.z, .3);
    if (!best) return false;
    if (K2.beacons.includes(best)) hurtSentry(best, dmgAt(G, bt, 2), false); else kitBreak(best.id, false);
    return true;
  }
  function hurtWall(w, dmg, fromNet) {
    if (!w || !(w.hp > 0) || !(dmg > 0) || !M.walls.includes(w)) return; w.hp -= dmg; w.hitT = .15; emit('kitWallHit', w);   // (its own event: 'wallHit' is a map's breakable wall, by number)
    if (w.hp <= 0) { w.hp = 0; w.t = 0; emit('wallBreak', w); if (w.by === me()) say('RAMPART DOWN', WARN); }
    if (!fromNet) net({ t: 'wd', id: w.id, d: dmg });
  }

  /* ---- every frame ---- */
  // a fighter crossing a line on the floor (Tripwire, as for a Lightline): which side they stand, remembered per fighter
  function crossed(W, v, high) {
    const px = v.x - W.ax, pz = v.z - W.az, s = (px * W.ex + pz * W.ez) / W.len2; if (s < -.02 || s > 1.02 || Math.abs(v.y - W.y) > 1.5) { W.sd[v.key] = 0; return false; }
    const side = W.ex * pz - W.ez * px > 0 ? 1 : -1, was = W.sd[v.key]; W.sd[v.key] = side; return !high && !!was && was !== side;
  }
  function stepLock(dt) {
    const K2 = M.kit, live = M.phase === 'live';
    // Sentry: a look round its arc five times a second; whoever it has is revealed, then fired on once it has locked
    for (const s of K2.sentries) {
      s.cd -= dt; s.flash = Math.max(0, s.flash - dt); const hy = s.y + .78;
      if ((s.scanT -= dt) <= 0) { s.scanT = SENTRY.scan; let best = null, bd = 1e9;
        if (live) for (const v of M.fs) { if (!v.alive || !enemyOf(s.by, v) || !duelOk(s.by, v) || v.phase > 0) continue; const d = Math.hypot(v.x - s.x, v.z - s.z); if (d > SENTRY.range || d >= bd || (v.cloak > 0 && d > 5)) continue;
          if (Math.abs(angDiff(yawTo(s.x, s.z, v.x, v.z), s.yaw)) > SENTRY.arc) continue; if (los(s.x, hy, s.z, v.x, v.y + 1.1, v.z) < Math.hypot(d, v.y + 1.1 - hy) - .4) continue; best = v; bd = d; }
        if (best !== s.target) { s.target = best; s.lockT = SENTRY.lock; if (best) { emit('sentryLock', s, best); if (best === me()) say('A SENTRY HAS YOU', WARN); } }
        if (best) best.reveal = Math.max(best.reveal || 0, SENTRY.reveal); }
      const v = s.target;
      if (v && v.alive) { const d = Math.hypot(v.x - s.x, v.z - s.z), want = yawTo(s.x, s.z, v.x, v.z); s.bd = d; s.aim += cl(angDiff(want, s.aim), -4 * dt, 4 * dt); s.pitch = Math.atan2(v.y + 1.1 - hy, d); s.lockT -= dt;
        if (s.lockT <= 0 && s.cd <= 0 && Math.abs(angDiff(want, s.aim)) < .12) { s.cd = SENTRY.rate; emit('sentryShot', s, v);
          if (!v.net && Math.random() < cl(1.15 - d / 28, .3, .85)) { applyDamage(v, SENTRY.dmg, s.by, false, 'sentry'); if (v.bot) v.bot.hitBy = { x: s.x, z: s.z, t: M.time }; if (v === me()) M.hurtDir = Math.atan2(s.x - v.x, s.z - v.z); } } }
      else { s.target = null; const sw = s.yaw + Math.sin(M.time * .9 + s.x) * SENTRY.arc * .85; s.aim += cl(angDiff(sw, s.aim), -1.2 * dt, 1.2 * dt); s.pitch *= .9; }   // (idle, it sweeps its arc: you can see what it guards)
    }
    // Tripwire: arms, then waits for a rival's feet to cross it (worked out where that rival is run); a beat, then the burst
    for (const W of K2.wires) {
      if (W.arm > 0) { W.arm -= dt; continue; }
      if (W.fuse < 0) { if (!live) continue; for (const v of M.fs) { if (v.net || !v.alive || !enemyOf(W.by, v)) continue; if (crossed(W, v, v.y > W.y + WIRE.h - .05)) { kitTrip(W.id, v.key, false); break; } } continue; }
      if ((W.fuse -= dt) <= 0) { W.done = true; emit('mineBoom', W);
        for (const v of M.fs) { if (v.net || !v.alive || !enemyOf(W.by, v)) continue; const d = Math.hypot(v.x - W.x, v.y + .8 - W.y - WIRE.h, v.z - W.z); if (d > WIRE.r || los(W.x, W.y + .5, W.z, v.x, v.y + .9, v.z, false) < d - .5) continue;
          applyDamage(v, Math.round(WIRE.dmg * cl(1.2 - d / WIRE.r, .35, 1)), W.by, false, 'tripwire'); if (v.bot) v.bot.hitBy = { x: W.x, z: W.z, t: M.time }; } }
    }
    if (K2.wires.length) K2.wires = K2.wires.filter(W => !W.done);
    // Slow Field canisters: arm, then a rival near opens the field
    for (const C of K2.cans) { if (C.arm > 0) { C.arm -= dt; continue; } if (!live) continue;
      let hit = null; for (const v of M.fs) if (!v.net && v.alive && enemyOf(C.by, v) && Math.hypot(v.x - C.x, v.z - C.z) < CAN.trip && Math.abs(v.y - C.y) < 2) { hit = v; break; }
      if (hit) { kitTrip(C.id, hit.key, false); break; } }
    // Snare: arms, waits for a rival's feet; sprung, it holds them on a leash
    for (const s of K2.snares) {
      if (s.sprung) { const v = M.byKey[s.sprung]; if ((s.t -= dt) <= 0 || !v || !v.alive) { s.done = true; continue; }
        if (!v.net) { const dx = v.x - s.x, dz = v.z - s.z, L = Math.hypot(dx, dz), R2 = SNARE.leash; if (L > R2) { const k = R2 / L, nx = s.x + dx * k, nz = s.z + dz * k; if (!blocked(nx, nz, v.y)) { v.x = nx; v.z = nz; } v.vx *= .3; v.vz *= .3; } }
        continue; }
      if (s.arm > 0) { s.arm -= dt; continue; } if (!live) continue;
      let hit = null; for (const v of M.fs) if (!v.net && v.alive && enemyOf(s.by, v) && Math.hypot(v.x - s.x, v.z - s.z) < SNARE.trip && Math.abs(v.y - s.y) < 1) { hit = v; break; }
      if (hit) { kitTrip(s.id, hit.key, false); break; }
    }
    if (K2.snares.length) K2.snares = K2.snares.filter(s => !s.done);
    // Ward Beacon: waits through the buy phase, then pulses shield into its team for 20 s (each device for its own)
    for (const B of K2.beacons) { B.flash = Math.max(0, (B.flash || 0) - dt); if (!live) continue; B.t -= dt; if ((B.tick -= dt) > 0) continue; B.tick = BEACON.every; const give = B.n++ ? BEACON.pulse : BEACON.first;
      for (const v of M.fs) if (!v.net && v.alive && v.team === B.by.team && Math.hypot(v.x - B.x, v.z - B.z) < BEACON.r && Math.abs(v.y - B.y) < 2.5 && (v.sh | 0) < BEACON.cap) { v.sh = Math.min(BEACON.cap, (v.sh | 0) + give); if (v === me()) say('+' + give + ' SHIELD', OPS.bastion.col); }
      emit(B.n === 1 ? 'beaconPop' : 'beaconPulse', B); }
    if (K2.beacons.length) K2.beacons = K2.beacons.filter(B => B.t > 0);
    for (const w of M.walls) if (w.hitT > 0) w.hitT -= dt;
  }

  /* ---- bots ---- */
  // Axiom's Tripwire and Slow Field, and Bastion's Ward Beacon, set at a hold; the rest is in 50-bot
  function lockBot(f, B, P, side, sees, there, look, dt) {
    if (M.phase !== 'live' || !look) return;
    const hold = (side === 'def' && P.k === 'hold') || (side === 'att' && P.k === 'post' && M.planted);
    if (!hold || !there || sees) return;
    if (f.op === 'axiom' && f.ab.e && !(B.wireT > M.time)) { B.wireT = M.time + 1.5; const yaw = yawTo(f.x, f.z, look[0], look[1]); for (const o of [0, .5, -.5, 1, -1]) { const q = wireAim(f, viewDir(yaw + o, 0), null); if (q) { botCast(f, 'e', q); break; } } }
    if (f.op === 'axiom' && f.ab.c && R() < dt * .4) { const dx = look[0] - f.x, dz = look[1] - f.z, L = Math.hypot(dx, dz); if (L > 4) { const tx = f.x + dx / L * Math.min(L * .7, 12), tz = f.z + dz / L * Math.min(L * .7, 12), T = cl(Math.hypot(tx - f.x, tz - f.z) / 13, .45, 1.1), y0 = eyeY(f) - .1, ty = hAt(tx, tz) + .1;
      botCast(f, 'c', { x: f.x, y: y0, z: f.z, vx: (tx - f.x) / T, vy: (ty - y0 + LOB_G / 2 * T * T) / T, vz: (tz - f.z) / T }); } }
    if (f.op === 'bastion' && f.ab.c && M.t < roundT() - 3 && R() < dt * .5) botCast(f, 'c', { x: f.x, y: f.y, z: f.z });
  }
  const trapLive = o => { const K2 = M.kit; return !!K2 && (K2.sentries.includes(o) || K2.beacons.includes(o) || K2.wires.includes(o) || K2.cans.includes(o) || K2.snares.includes(o) || K2.devs.includes(o)); };
  // a rival's device a bot can see near it: the nearest worth a bullet (a sentry, a beacon, a trap within sight of it)
  function botTrapTarget(f, B) {
    if (B.trapAt > M.time && B.trapM === M.kit) return B.trap && trapLive(B.trap.o) ? B.trap : null; B.trapM = M.kit; B.trapAt = M.time + .25; B.trap = null; const K2 = M.kit; if (!K2) return null; const ey = eyeY(f); let bd = 1e9;
    const consider = (o, x, y, z, r) => { const d = Math.hypot(x - f.x, z - f.z); if (d > r || d >= bd) return; if (los(f.x, ey, f.z, x, y, z) < Math.hypot(d, y - ey) - .35) return; bd = d; B.trap = { o, x, y, z }; };
    for (const s of K2.sentries) if (enemyOf(s.by, f)) consider(s, s.x, s.y + .6, s.z, 20);
    for (const b of K2.beacons) if (enemyOf(b.by, f)) consider(b, b.x, b.y + .5, b.z, 20);
    for (const W of K2.wires) if (enemyOf(W.by, f)) consider(W, W.ax, W.y + WIRE.h, W.az, WIRE.see * .8);
    for (const C of K2.cans) if (enemyOf(C.by, f)) consider(C, C.x, C.y + .2, C.z, CAN.see * .8);
    for (const s of K2.snares) if (enemyOf(s.by, f) && !s.sprung) consider(s, s.x, s.y + .1, s.z, SNARE.see * .8);
    for (const D of K2.devs) if (enemyOf(D.by, f) && devReach(D, f) < TRIG.glint) { devPt(D, 0, TSP); consider(D, TSP[0], D.k === 'q' ? TSP[1] : D.y + .4, TSP[2], TRIG.glint); }
    return B.trap;
  }
