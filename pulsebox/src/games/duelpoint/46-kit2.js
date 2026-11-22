  /* ---------- 46 kit, second part: every operative's C, and VANTA ----------
     VEX     C Gloom: a lobbed orb that bursts into dark; rivals caught see only 5 m for 3.5 s.
     IRIS    C Watcher: an eye fixed where you aim (up to 22 m); for 20 s it marks rivals who walk into its view.
     BASTION C Ward Beacon: set at your feet, it stays and pulses shield into teammates near it (48).
     NOVA    C Updraft: straight up, high enough for a ledge.
     WRAITH  C Tether: an anchor at your feet; the key again steps you back to it (free), any time that round.
     TALON   C Shock Bolt: bounces once, then bursts for up to 45 within 3.5 m.
     EMBER   C Flashpoint: a flash that flies ahead and bends round the corner, left (left click) or right (right click).
     AXIOM   C Slow Field: a lobbed canister that waits where it lands; a rival near it opens a 5 m slowing field (48).
     VANTA (Duelist)
             C Phase Front: a wall of light rolls 14 m out ahead along the nearest straight line, stopping bullets and sight
               (anyone can walk through it); it holds 5 s where it stops.
             Q Sunder: an instant bolt down the aim (a head it meets in the open: dead); it goes on through walls, Exposing (25% more damage taken, 4 s).
             E Overcharge: for 12 s, a rival you kill leaves a charge where they fell; shoot it within 3 s for a ward that
               stops the next hit (20 s). Comes back after two kills.
             X Duel Field: a beam; the first rival it meets is sealed in a dome with you for up to 12 s: nobody else sees
               in, shoots in or gets in, and neither of you gets out, until one of you falls.
     Lobbed things share one flight (gravity 14, the same as a firebomb), so the aiming arc the preview draws is the path. */
  const LOB_G = 14;
  function kitAim2(f, key, d, S, alt) {
    const e = eyeY(f), lob = (sp, up) => ({ x: f.x + d[0] * .5, y: e - .1 + d[1] * .5, z: f.z + d[2] * .5, vx: d[0] * sp + f.vx * .4, vy: d[1] * sp + up, vz: d[2] * sp + f.vz * .4 });
    if (key.startsWith('tessel')) return tesselAim(f, key, d, S, alt);   // (47: Tessel)
    if (key === 'vexc') return lob(alt ? 8 : 15, alt ? 2 : 3);
    if (key === 'talonc') return lob(alt ? 11 : 19, 2);
    if (key === 'axiomc') return lob(alt ? 8 : 14, 3);
    if (key === 'irisc') { if (S.dist > 22) return null; const n = S.n, flat = Math.abs(n[1]) > .7, back = flat ? [-d[0], -d[2]] : [n[0], n[2]];   // on a wall it looks out of it; on the floor, back at you
      return { x: S.end[0] + n[0] * .08, y: Math.max(S.end[1] + n[1] * .08, hAt(S.end[0], S.end[2]) + .15), z: S.end[2] + n[2] * .08, yaw: yawTo(0, 0, back[0], back[1]) }; }
    if (key === 'bastionc' || key === 'wraithc') return { x: f.x, y: f.y, z: f.z };
    if (key === 'novac' || key === 'vantae') return {};
    if (key === 'emberc') {   // ahead (as far as is open, up to 5 m), then round the corner (up to 4 m)
      const fx = -Math.sin(f.yaw), fz = -Math.cos(f.yaw), side = alt ? 1 : -1, sx = Math.cos(f.yaw) * side, sz = -Math.sin(f.yaw) * side;
      const a = Math.max(1, Math.min(5, los(f.x, e, f.z, f.x + fx * 5, e, f.z + fz * 5) - .4)), ax = f.x + fx * a, az = f.z + fz * a, b = Math.max(.5, Math.min(4, los(ax, e, az, ax + sx * 4, e, az + sz * 4) - .4));
      return { ax, az, x: ax + sx * b, y: e + .3, z: az + sz * b }; }
    if (key === 'vantac') { const fx = -Math.sin(f.yaw), fz = -Math.cos(f.yaw), ax = Math.abs(fx) >= Math.abs(fz) ? 1 : 0, dir = ax ? Math.sign(fx) : Math.sign(fz); return { x: f.x + (ax ? dir * 1.2 : 0), z: f.z + (ax ? 0 : dir * 1.2), ax, dir }; }
    if (key === 'vantaq') return { x: f.x + d[0] * .6, y: e + d[1] * .6, z: f.z + d[2] * .6, dx: d[0], dy: d[1], dz: d[2] };
    if (key === 'vantax') { const Z = duelZone(f, d); return { t: Z.t ? Z.t.key : '', px: r2(Z.p[0]), py: r2(Z.p[1]), pz: r2(Z.p[2]), fail: !Z.t }; }   // (nobody in the circle: it is not spent)
    return undefined;
  }
  /* Duel Field: you point at a spot (where your aim meets the world, up to 40 m, brought down to the floor) and a circle of
     DUEL_R metres opens there; the rival standing nearest its middle is taken into the dome with you. */
  const DUEL_R = 5;
  function duelZone(f, d) {
    const S = castShot(f, d), o = [f.x, eyeY(f), f.z], L = Math.min(40, S.dist || 40), px = o[0] + d[0] * L, pz = o[2] + d[2] * L, p = [px, hAt(px, pz), pz];
    let t = null, bd = DUEL_R; for (const v of M.fs) { if (!v.alive || v.team === f.team || v.duel || !duelOk(f, v)) continue; const dd = Math.hypot(v.x - p[0], v.z - p[2]); if (dd < bd && Math.abs(v.y - p[1]) < 3) { bd = dd; t = v; } }
    return { t, p };
  }
  // (kept for the bots: the rival straight down the aim)
  function duelTarget(f, d) {
    const S = castShot(f, d); if (S.hit && S.dist <= 40 && !S.hit.f.duel) return S.hit.f;
    let best = null, bd = .045; const o = [f.x, eyeY(f), f.z];
    for (const v of M.fs) { if (!v.alive || v.team === f.team || v.duel || !duelOk(f, v)) continue; const dx = v.x - o[0], dy = v.y + 1.1 - o[1], dz = v.z - o[2], L = Math.hypot(dx, dy, dz); if (L > 40) continue;
      const a = Math.acos(cl((dx * d[0] + dy * d[1] + dz * d[2]) / L, -1, 1)); if (a < bd && los(o[0], o[1], o[2], v.x, v.y + 1.1, v.z) >= L - .4) { best = v; bd = a; } }
    return best;
  }
  // in a Duel Field? only its other half counts (for sight, shots and harm)
  const duelOk = (a, b) => !a || !b || a === b || (a.duel ? a.duel.id : 0) === (b.duel ? b.duel.id : 0);
  function kitApply2(f, key, d) {
    const K2 = M.kit;
    if (key.startsWith('tessel')) return tesselApply(f, key, d);   // (47: Tessel)
    if (key === 'vexc' || key === 'talonc' || key === 'axiomc') { if (![d.x, d.y, d.z, d.vx, d.vy, d.vz].every(finite) || Math.hypot(d.vx, d.vy, d.vz) > 40) return false; K2.lobs.push({ k: key, x: d.x, y: d.y, z: d.z, vx: d.vx, vy: d.vy, vz: d.vz, t: 0, by: f, bounce: key === 'talonc' ? 1 : 0, id: typeof d.id === 'string' ? d.id.slice(0, 48) : kitId(f, 'c') }); return true; }
    if (key === 'irisc') { if (d.act) { const W = irisEye(f); if (W) { W.act = EYE_ON; W.tick = .15; emit('eyeWake', W); } return true; }
      K2.eyes = K2.eyes.filter(W => W.by !== f); K2.eyes.push({ id: kitId(f, 'c') + ':' + (K2.eyeN = (K2.eyeN || 0) + 1), x: d.x, y: d.y, z: d.z, yaw: d.yaw, act: 0, cd: 0, tick: 0, by: f, seen: 0 }); return true; }   // (it stays, asleep, until woken or shot)
    if (key === 'bastionc') return placeBeacon(f, d);   // (48)
    // (Updraft: high enough to land on a shipping container, 3 m)
    if (key === 'novac') { if (!f.net) { f.vy = 13; f.ground = false; } emit('updraft', f); return true; }
    if (key === 'wraithc') {
      if (d.back) { const T = f.tether; f.tether = null; if (T) { const from = [f.x, f.z]; if (!f.net) { f.x = T.x; f.z = T.z; f.y = hAt(T.x, T.z); f.vx = f.vz = f.vy = 0; } emit('tetherBack', f, from, [T.x, T.z]); } return true; }
      f.tether = { x: d.x, z: d.z, y: hAt(d.x, d.z) }; emit('tetherSet', f); return true; }
    if (key === 'emberc') { const fl = { x: d.x, y: d.y, z: d.z, t: .55, by: f }; M.flares.push(fl); emit('flare', fl); emit('curveFlash', f, d); return true; }
    if (key === 'vantac') {   // the wall: a thin slab across the way it rolls, 6 m wide and 3 m tall
      const w = { x0: 0, x1: 0, z0: 0, z1: 0, t: 99, grow: 0, soft: true, front: { x: d.x, z: d.z, ax: d.ax, dir: d.dir, s: 0, hold: 0, by: f } }; placeFront(w); M.walls.push(w); emit('front', w); return true; }
    if (key === 'vantaq') { sunderNow(f, d); K2.sunders.push({ x: d.x, y: d.y, z: d.z, dx: d.dx, dy: d.dy, dz: d.dz, s: 35, by: f, hit: [], t: .3 }); emit('sunder', f, d); return true; }
    if (key === 'vantae') { f.over = 12; emit('overcharge', f); return true; }
    if (key === 'vantax') {
      const v = d.t && M.byKey[d.t]; emit('duelZone', f, d);
      if (v && v.alive && f.alive && !v.duel && !f.duel && (d.px == null || Math.hypot(v.x - d.px, v.z - d.pz) < DUEL_R + 3)) { const mx = (f.x + v.x) / 2, mz = (f.z + v.z) / 2, r = Math.max(7.5, Math.hypot(f.x - v.x, f.z - v.z) / 2 + 3), D = { id: f.key + '>' + v.key + ':' + M.round, x: mx, z: mz, r, until: M.time + 12, a: f, b: v };
        f.duel = v.duel = D; f.scoped = v.scoped = 0; emit('duelStart', D); }
      else if (f === me()) say('THE BEAM MET NOBODY', DIM);
      return true; }
    return false;
  }
  /* Sunder, all at once: the bolt runs 35 m down the aim in an instant. The first rival it meets in the open takes it
     (a head: dead; the body 45, the legs 30) and is Exposed; it goes on through walls, and every rival it passes there is
     Exposed (no harm through a wall). Each device does this for its own fighters, as with every ability's harm. */
  function sunderNow(f, d) {
    const L0 = .6, o = [d.x - d.dx * L0, d.y - d.dy * L0, d.z - d.dz * L0], dir = [d.dx, d.dy, d.dz];
    let wall = rayGrid(o[0], o[1], o[2], dir[0], dir[1], dir[2], 40); for (const w of M.walls) { if (w.soft) continue; const t = rayBox(o, dir, [w.x0, 0, w.z0], [w.x1, 3 * w.grow, w.z1]); if (t > 0 && t < wall) wall = t; }
    let first = null, fd = wall; for (const v of M.fs) { if (!enemyOf(f, v) || !duelOk(f, v)) continue; const hb = hitboxes(v), th = raySphere(o, dir, hb.head, hb.hr), tb = rayFrame(o, dir, hb, hb.body), ta = rayFrame(o, dir, hb, hb.arms), tbody = tb > 0 && (ta <= 0 || tb <= ta) ? tb : ta, near = th > 0 && (tbody <= 0 || th <= tbody) ? th : tbody;
      if (near > 0 && near < fd) { fd = near; first = { v, head: near === th, leg: near === tb && o[1] + dir[1] * tb < hb.leg }; } }
    for (const v of localFs()) { if (!enemyOf(f, v) || !duelOk(f, v)) continue; let on = first && first.v === v;
      if (!on) for (const hy of [eyeY(v) - .1, v.y + 1, v.y + .4]) { const px = v.x - o[0], py = hy - o[1], pz = v.z - o[2], along = px * dir[0] + py * dir[1] + pz * dir[2]; if (along < 0 || along > 35) continue; if (Math.hypot(px - dir[0] * along, py - dir[1] * along, pz - dir[2] * along) < .7) { on = true; break; } }
      if (!on) continue; v.exposed = 4; emit('sundered', v, { by: f }); if (v === me()) say('EXPOSED', WARN);
      if (first && first.v === v) applyDamage(v, first.head ? 200 : first.leg ? 30 : 45, f, first.head, 'sunder', first.leg); }
  }
  /* Iris's Watcher: fixed where she aims, it stays the whole round, asleep and unseen by rivals. The C key again wakes it
     for EYE_ON seconds: it looks out (marking rivals in its view every second), glows, and can be shot out with one hit;
     then it rests EYE_REST seconds before it can wake again. */
  const EYE_ON = 6, EYE_REST = 6;
  function irisEye(f) { return M && M.kit ? M.kit.eyes.find(W => W.by === f && !W.down) : null; }
  function breakEye(W, fromNet) { const K2 = M.kit; if (!K2 || W.down) return; W.down = true; K2.eyes = K2.eyes.filter(q => q !== W); emit('eyeDown', W); if (!fromNet) net({ t: 'ed', id: W.id }); }
  const placeFront = w => { const F = w.front, cx = F.x + (F.ax ? F.dir * F.s : 0), cz = F.z + (F.ax ? 0 : F.dir * F.s), half = 3, th = .16;
    if (F.ax) { w.x0 = cx - th; w.x1 = cx + th; w.z0 = cz - half; w.z1 = cz + half; } else { w.x0 = cx - half; w.x1 = cx + half; w.z0 = cz - th; w.z1 = cz + th; } };
  // Overcharge's charge, shot: the shooter's own device decides, and tells the others
  function hexShot(f, S) {
    const K2 = M.kit; if (!K2 || !K2.hexes.length) return false;
    for (const h of K2.hexes) { if (h.by !== f) continue; const t = raySphere(S.o, S.d, [h.x, h.y, h.z], .42); if (t > 0 && t < S.dist + .3) { takeHex(f, h, false); return true; } }
    return false;
  }
  function takeHex(f, h, fromNet) { const K2 = M.kit; K2.hexes = K2.hexes.filter(q => q !== h); f.ward = 20; emit('wardOn', f, h); if (!fromNet) net({ t: 'hx', id: h.id, f: f.key }); }
  on('kill', (v, by) => {
    if (!M || !by || !v || by === v || by.op !== 'vanta' || by.team === v.team || M.mode === 'demo') return; const K2 = M.kit || (M.kit = freshKit());
    if (by.over > 0) { const h = { id: v.key + ':' + M.round + ':' + Math.round(M.time * 10), x: v.x, y: v.y + 1.25, z: v.z, t: 3, by }; K2.hexes.push(h); emit('hex', h); }
    if ((by.ab.e | 0) < 1 && !by.net) { by.eK = (by.eK | 0) + 1; if (by.eK >= OPS.vanta.e.kills) { by.ab.e = 1; by.eK = 0; emit('abBack', by, 'e'); } }
  });
  function stepKits2(dt) {
    const K2 = M.kit;
    for (const f of M.fs) {
      for (const k of ['murk', 'exposed', 'ward', 'over', 'slowF']) if (f[k] > 0) f[k] = Math.max(0, f[k] - dt);
      // signatures that come back with time
      const E = OPS[f.op] && OPS[f.op].e; if (E && E.rech && (f.ab.e | 0) < 1 && M.phase === 'live' && !f.net && !(f.op === 'tessel' && tesselDorm(f, 'e'))) {   // (a Lightline set and not yet fired is still in use)
        f.eT = (f.eT || 0) + dt; if (f.eT >= E.rech) { f.ab.e = 1; f.eT = 0; emit('abBack', f, 'e'); } }
    }
    // the lobbed ones: Gloom, Shock Bolt (one bounce), Slow Field
    for (const B of K2.lobs) {
      B.t += dt; B.vy -= LOB_G * dt; const sp = Math.hypot(B.vx, B.vy, B.vz) || 1, step = sp * dt, dx = B.vx / sp, dy = B.vy / sp, dz = B.vz / sp, hit = rayGrid(B.x, B.y, B.z, dx, dy, dz, step + .05);
      if (hit < step + .05 || B.t > 3) {
        B.x += dx * Math.max(0, hit - .08); B.y += dy * Math.max(0, hit - .08); B.z += dz * Math.max(0, hit - .08);
        if (B.bounce > 0 && B.t <= 3) { B.bounce--; const n = rayN, dot = B.vx * n[0] + B.vy * n[1] + B.vz * n[2]; B.vx = (B.vx - 2 * dot * n[0]) * .45; B.vy = (B.vy - 2 * dot * n[1]) * .45; B.vz = (B.vz - 2 * dot * n[2]) * .45; emit('lobBounce', B); continue; }
        B.done = true; lobLand(B);
      } else { B.x += B.vx * dt; B.y += B.vy * dt; B.z += B.vz * dt; }
    }
    K2.lobs = K2.lobs.filter(B => !B.done);
    for (const G2 of K2.glooms) G2.t -= dt; K2.glooms = K2.glooms.filter(G2 => G2.t > 0);
    // Slow Field: everyone the other side inside it, slowed while there
    for (const F of K2.fields) { F.t -= dt; for (const v of localFs()) if (enemyOf(F.by, v) && Math.hypot(v.x - F.x, v.z - F.z) < F.r && Math.abs(v.y - F.y) < 2) { if (!(v.slowF > 0) && v === me()) say('SLOWED', WARN); v.slowF = .2; } }
    K2.fields = K2.fields.filter(F => F.t > 0);
    // Watcher: a look every 1.6 s; rivals in its view are marked
    for (const W of K2.eyes) { if (!(W.act > 0)) { W.cd = Math.max(0, (W.cd || 0) - dt); continue; } W.act -= dt; if (W.act <= 0) { W.act = 0; W.cd = EYE_REST; emit('eyeSleep', W); continue; } if ((W.tick -= dt) > 0) continue; W.tick = 1; let n = 0;
      for (const v of M.fs) { if (!v.alive || !enemyOf(W.by, v) || !duelOk(W.by, v)) continue; const dd = Math.hypot(v.x - W.x, v.z - W.z); if (dd > 25 || Math.abs(angDiff(yawTo(W.x, W.z, v.x, v.z), W.yaw)) > .9) continue;
        if (los(W.x, W.y, W.z, v.x, eyeY(v) - .1, v.z) < Math.hypot(dd, eyeY(v) - .1 - W.y) - .4) continue; v.reveal = Math.max(v.reveal, 1.4); n++; if (v === me()) say('A WATCHER SEES YOU', WARN); }
      W.seen = n; if (n) emit('eyeSpot', W); }
    K2.eyes = K2.eyes.filter(W => !W.down);
    // (Ward Beacon: 48)
    // Phase Front: rolls out 14 m, through walls and all, then holds
    for (const w of M.walls) { const F = w.front; if (!F) continue;
      if (F.s < 14 && !F.stop) { const was = F.s, step = dt * 4.4; F.s = Math.min(14, F.s + step); const cx = F.x + (F.ax ? F.dir * F.s : 0), cz = F.z + (F.ax ? 0 : F.dir * F.s); placeFront(w); }   // (it rolls through walls)
      else { F.hold += dt; if (F.hold >= 5) w.t = 0; } }
    // Sunder: flies 40 m/s for 35 m through anything; rivals it passes are Exposed
    for (const B of K2.sunders) if ((B.t -= dt) <= 0) B.done = true;   // (the bolt is instant: this is only how long it shows)
    K2.sunders = K2.sunders.filter(B => !B.done);
    for (const h of K2.hexes) h.t -= dt; K2.hexes = K2.hexes.filter(h => h.t > 0);
    // a bot with Overcharge takes its charge a moment after the kill
    for (const h of K2.hexes) if (h.by.bot && !h.by.net && h.t < 2.5 && h.by.alive) { takeHex(h.by, h, false); break; }
    // Duel Field: kept inside; over when one falls, leaves, or the time runs out
    for (const f of M.fs) { const D = f.duel; if (!D) continue; const o = D.a === f ? D.b : D.a;
      if (!f.alive || !o || !o.alive || o.gone || f.gone || M.time > D.until || o.duel !== D || M.phase !== 'live') { f.duel = null; if (o && o.duel === D) o.duel = null; emit('duelEnd', D, f.alive ? f : o && o.alive ? o : null); continue; }
      if (!f.net) { const dx = f.x - D.x, dz = f.z - D.z, L = Math.hypot(dx, dz), R2 = D.r - RAD; if (L > R2) { const k = R2 / L, nx = D.x + dx * k, nz = D.z + dz * k; if (!blocked(nx, nz, f.y)) { f.x = nx; f.z = nz; } f.vx *= .3; f.vz *= .3; } } }
    stepTessel(dt);   // (47: Lightlines, Lull, Glasshouse)
  }
  // where a lobbed thing lands
  function lobLand(B) {
    const K2 = M.kit, x = B.x, z = B.z, y = hAt(x, z);
    if (B.k.startsWith('tessel')) { tesselLand(B, x, z); return; }   // (47: Bloom and Lull)
    if (B.k === 'vexc') { const G2 = { x, y: Math.max(y, B.y), z, t: 3.5, by: B.by }; K2.glooms.push(G2); emit('gloomPop', G2);
      for (const v of localFs()) { if (!enemyOf(B.by, v)) continue; const d = Math.hypot(v.x - x, v.z - z); if (d > 6 || los(x, G2.y + .4, z, v.x, eyeY(v), v.z, false) < Math.hypot(d, eyeY(v) - G2.y - .4) - .4) continue; v.murk = 3.5; if (v === me()) say('GLOOM', OPS.vex.col); } }
    if (B.k === 'talonc') { emit('shockPop', { x, y: B.y, z, by: B.by });
      for (const v of localFs()) { if (!enemyOf(B.by, v)) continue; const d = Math.hypot(v.x - x, v.y + .9 - B.y, v.z - z); if (d > 3.5 || los(x, B.y + .2, z, v.x, v.y + .9, v.z, false) < d - .5) continue; applyDamage(v, Math.round(45 * cl(1.25 - d / 3.5, .3, 1)), B.by, false, 'shockbolt'); } }
    if (B.k === 'axiomc') placeCan(B, x, y, z);   // (48: it waits where it lands)
  }
