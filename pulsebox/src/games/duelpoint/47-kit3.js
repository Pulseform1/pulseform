  /* ---------- 47 kit, third part: TESSEL (Architect) ----------
     Tessel builds the room a fight happens in, out of light.
       C Bloom: a lobbed seed of light that opens into a 3.4 m globe of glare for 9 s. It blocks sight as a smoke does.
       Q Lull: a lobbed lens that settles where it lands and waits, dormant. Triggered, for 7 s rivals within 4.5 m of it
         move at half speed. One bullet from a rival breaks the lens, dormant or not.
       E Lightline: two small posts and the line between them: from your feet along your aim (20 m, straight through
         walls), or with the other click across your view (16 m wide, through walls); its posts stand on open floor. It waits, dormant. Triggered, a curtain
         rises on the line for 14 s: it blocks sight both ways, but not bullets and not feet; a rival who walks through it
         is Lit (shown through walls to Tessel's side) for 2.5 s. It comes back 40 s after it is fired. One bullet from a
         rival into either post breaks a dormant one.
       TRIGGER (its own key, 4 by default): look at one of your dormant devices (the crosshair on it, within a small
         radius) from within 20 m with a clear line of sight, and press it: the device fires. Only in the live round;
         both can be set in the buy phase, on your side of the barrier. Dormant devices last until fired, broken or the
         round ends, and a new one of a kind replaces the old. Tessel's side always sees them (faint, with a marker);
         a rival sees only a faint glint within 6 m.
       X Glasshouse: a 10 m square of Lightlines rises round the spot you point at (up to 30 m away) for 10 s, and rivals
         inside it move at half speed.
     A Lightline is a sheet standing on a line across the floor: sight (los) stops where a ray crosses it, shots go on. Who
     walks through one is worked out on every device for every fighter, from the line and where they stand, so all agree. */
  const LINE = { len: 20, wide: 8, h: 3.3, T: 14, lit: 2.5 }, LULL = { r: 4.5, T: 7 }, TRIG = { r: 20, ang: .05, rad: .5, see: 60, losEvery: .15, glint: 6 }, BLOOM = { R: 3.4, T: 9 }, HOUSE = { half: 5, T: 10, reach: 30 };
  const finite = v => typeof v === 'number' && isFinite(v);
  // in-place removal of what has run out (no new array each frame)
  const keepLive = o => o.t > 0;
  function prune(a, keep) { let n = 0; for (let i = 0; i < a.length; i++) if (keep(a[i])) a[n++] = a[i]; a.length = n; }
  // where the ability goes, on the caster's device (the preview draws the same)
  function tesselAim(f, key, d, S, alt) {
    const e = eyeY(f), lob = (sp, up) => ({ x: f.x + d[0] * .5, y: e - .1 + d[1] * .5, z: f.z + d[2] * .5, vx: d[0] * sp + f.vx * .4, vy: d[1] * sp + up, vz: d[2] * sp + f.vz * .4 });
    if (key === 'tesselc') return lob(alt ? 8 : 15, alt ? 2 : 3);
    if (key === 'tesselq') return Object.assign(lob(alt ? 8 : 14, 3), { id: f.key + ':' + M.round + ':' + Math.round(M.time * 100) });
    let hx = d[0], hz = d[2]; const hl = Math.hypot(hx, hz);
    if (hl < .2) { hx = -Math.sin(f.yaw); hz = -Math.cos(f.yaw); } else { hx /= hl; hz /= hl; }
    if (key === 'tessele') {
      if (!alt) {   // along your aim, from your feet, its full length (through walls)
        const ax = f.x + hx * .7, az = f.z + hz * .7, n = LINE.len;
        return zoneClip(f, openEnds({ ax: r2(ax), az: r2(az), bx: r2(ax + hx * n), bz: r2(az + hz * n), y: r2(f.y) }));
      }
      return zoneClip(f, openEnds(acrossLine(f, hx, hz, Math.max(hl, .2) * (S.dist || 10))));
    }
    if (key === 'tesselx') {   // where your aim meets the world (up to 30 m), brought to the floor
      const L = Math.max(2, Math.min(HOUSE.reach, S.dist || HOUSE.reach) - .3); let x = f.x + d[0] * L, z = f.z + d[2] * L;
      const [ci, cj] = nearestNav(x, z); if (Math.floor(x / CS) !== ci || Math.floor(z / CS) !== cj) { x = (ci + .5) * CS; z = (cj + .5) * CS; }
      return { x: r2(x), z: r2(z) };
    }
    return undefined;
  }
  // across a view (hx, hz flat and of length 1), where it looks (2 to 10 m out), each side running on until a wall
  function acrossLine(f, hx, hz, dist) {
    const out = Math.max(2, Math.min(10, dist - .6, rayGrid(f.x, f.y + 1.7, f.z, hx, 0, hz, 10) - .5)), cx = f.x + hx * out, cz = f.z + hz * out, y = hAt(cx, cz), px = -hz, pz = hx;
    const l1 = LINE.wide, l2 = LINE.wide;   // (through the walls either side: openEnds brings the posts back to open floor)
    return { ax: r2(cx + px * l1), az: r2(cz + pz * l1), bx: r2(cx - px * l2), bz: r2(cz - pz * l2), y: r2(y) };
  }
  // a Lightline runs through walls; only its two posts must stand in the open (on the map, not inside a wall), so each end is
  // drawn back along the line to the nearest open floor
  function openEnds(o) {
    if (!o) return o; const open = (x, z) => x > .3 && z > .3 && x < MW - .3 && z < MH - .3 && hAt(x, z) < o.y + 1.2;
    for (const [e, s] of [['b', 'a'], ['a', 'b']]) { const x0 = o[e + 'x'], z0 = o[e + 'z'], sx = o[s + 'x'], sz = o[s + 'z'], n = Math.max(1, Math.ceil(Math.hypot(x0 - sx, z0 - sz) / .25)); let x = x0, z = z0;
      for (let i = 1; i <= n && !open(x, z); i++) { x = lp(x0, sx, i / n); z = lp(z0, sz, i / n); } o[e + 'x'] = r2(x); o[e + 'z'] = r2(z); }
    return Math.hypot(o.bx - o.ax, o.bz - o.az) < 1.2 ? null : o;
  }
  // in the buy phase a line keeps to your side of the barrier: it stops where the barrier starts (none at all if it starts past it)
  function zoneClip(f, o) {
    if (!o || !M || M.phase !== 'buy' || M.mode === 'range' || M.mode === 'demo' || !sideOf(f)) return o; const sd = sideOf(f);
    if (!inZoneP(sd, o.ax, o.az)) { if (!inZoneP(sd, o.bx, o.bz)) return null; let t = o.ax; o.ax = o.bx; o.bx = t; t = o.az; o.az = o.bz; o.bz = t; }
    const L = Math.hypot(o.bx - o.ax, o.bz - o.az), n = Math.max(1, Math.ceil(L / .25)); let k = 0;
    for (let i = 1; i <= n; i++) { const q = i / n; if (!inZoneP(sd, lp(o.ax, o.bx, q), lp(o.az, o.bz, q))) break; k = q; }
    if (k * L < 1.2) return null; o.bx = r2(lp(o.ax, o.bx, k)); o.bz = r2(lp(o.az, o.bz, k)); return o;
  }
  // a Lightline into the world
  function addLine(f, ax, az, bx, bz, y, T, low) {
    const ex = bx - ax, ez = bz - az, L = { ax, az, bx, bz, ex, ez, len2: Math.max(1e-4, ex * ex + ez * ez), y0: y - (low || .25), y1: y + LINE.h, y, t: T, T, by: f, sd: {}, rise: 0 };
    M.kit.lines.push(L); return L;
  }
  // the ability itself, the same on every device (what comes over the network is checked first)
  function tesselApply(f, key, d) {
    const K2 = M.kit;
    if (key === 'tesselc' || key === 'tesselq') {
      if (![d.x, d.y, d.z, d.vx, d.vy, d.vz].every(finite) || Math.hypot(d.vx, d.vy, d.vz) > 40) return false;
      K2.lobs.push({ k: key, x: d.x, y: d.y, z: d.z, vx: d.vx, vy: d.vy, vz: d.vz, t: 0, by: f, bounce: 0, id: typeof d.id === 'string' ? d.id.slice(0, 48) : f.key + ':lz' }); return true;
    }
    if (key === 'tessele') {
      if (![d.ax, d.az, d.bx, d.bz, d.y].every(finite) || Math.hypot(d.bx - d.ax, d.bz - d.az) > LINE.len + 1) return false;
      setDev({ id: typeof d.id === 'string' && d.id ? d.id.slice(0, 48) : kitId(f, 'e'), k: 'e', ax: d.ax, az: d.az, bx: d.bx, bz: d.bz, y: d.y, x: (d.ax + d.bx) / 2, z: (d.az + d.bz) / 2, by: f }); return true;
    }
    if (key === 'tesselx') {
      if (![d.x, d.z].every(finite) || d.x < 0 || d.z < 0 || d.x > GW * CS || d.z > GH * CS) return false;
      const h = HOUSE.half, y = hAt(d.x, d.z), H = { x: d.x, z: d.z, y, half: h, t: HOUSE.T, T: HOUSE.T, by: f, lines: [] };
      for (const [a, b] of [[[-h, -h], [h, -h]], [[h, -h], [h, h]], [[h, h], [-h, h]], [[-h, h], [-h, -h]]]) H.lines.push(addLine(f, d.x + a[0], d.z + a[1], d.x + b[0], d.z + b[1], y, HOUSE.T, 1.6));
      for (const L of H.lines) L.house = H;
      K2.houses.push(H); emit('glasshouse', H, f);
      if (f === me()) say('GLASSHOUSE', OPS.tessel.col); else if (me().team !== f.team && Math.abs(me().x - d.x) < h + 2 && Math.abs(me().z - d.z) < h + 2) say('GLASSHOUSE: GET OUT', WARN);
      return true;
    }
    return false;
  }
  // where a lobbed Bloom or Lull comes down
  function tesselLand(B, x, z) {
    const K2 = M.kit, y = hAt(x, z);
    if (B.k === 'tesselc') { const s = { x, z, y, r: 0, R: BLOOM.R, t: BLOOM.T, T: BLOOM.T, glare: 1 }; M.smokes.push(s); emit('smoke', s); emit('bloomPop', s); }
    if (B.k === 'tesselq') { if (!buyLandOk(B, x, z, 'q')) return; setDev({ id: B.id, k: 'q', x, y, z, by: B.by }); }
  }
  // a lob that comes down past the barrier in the buy phase is not set: the charge comes back (the same on every device)
  function buyLandOk(B, x, z, k) {
    if (!M || M.phase !== 'buy' || M.mode === 'range' || M.mode === 'demo' || !B.by || !sideOf(B.by) || inZoneP(sideOf(B.by), x, z)) return true;
    const O = OPS[B.by.op], mx = (O && O[k] && O[k].max) || 1; B.by.ab[k] = Math.min(mx, (B.by.ab[k] | 0) + 1); if (B.by === me()) say('NOT PAST THE BARRIER', WARN); emit('abNo', B.by, k); return false;
  }
  /* ---- dormant devices: set, looked at, fired, broken ---- */
  // a new one of a kind replaces Tessel's old one
  function setDev(D) { const K2 = M.kit; for (let i = K2.devs.length - 1; i >= 0; i--) { const o = K2.devs[i]; if (o.by === D.by && o.k === D.k) { K2.devs.splice(i, 1); emit('devGone', o); } } K2.devs.push(D); emit('devSet', D); }
  const tesselDorm = (f, k) => { const Ds = M && M.kit && M.kit.devs; if (Ds) for (let i = 0; i < Ds.length; i++) if (Ds[i].by === f && Ds[i].k === k) return Ds[i]; return null; };
  // the points of a device you can look at (and shoot): a Lull's lens; a Lightline's two posts and the middle of its line
  const devN = D => D.k === 'q' ? 1 : 3;
  function devPt(D, i, o) { if (D.k === 'q') { o[0] = D.x; o[1] = D.y + .28; o[2] = D.z; } else if (i === 0) { o[0] = D.ax; o[1] = D.y + .5; o[2] = D.az; } else if (i === 1) { o[0] = D.bx; o[1] = D.y + .5; o[2] = D.bz; } else { o[0] = D.x; o[1] = D.y + .5; o[2] = D.z; } return o; }
  // how far a spot on the floor is from a device: from the lens, or from the line
  function devDist(D, x, z) { if (D.k === 'q') return Math.hypot(x - D.x, z - D.z); const ex = D.bx - D.ax, ez = D.bz - D.az, s = cl(((x - D.ax) * ex + (z - D.az) * ez) / Math.max(1e-4, ex * ex + ez * ez), 0, 1); return Math.hypot(x - D.ax - ex * s, z - D.az - ez * s); }
  const TLP = [0, 0, 0];
  /* which of her dormant devices Tessel is looking at: the crosshair within TRIG.ang (about 3 degrees) of one of its points,
     or within TRIG.rad metres of it, whichever is wider (forgiving up close); the nearest to the crosshair wins. Worked
     out once a frame; no sight check here (that is tesselState's, a few times a second) */
  function tesselLook(f) {
    if (f.tlAt === M.time && f.tlM === M) return f.tlD; f.tlAt = M.time; f.tlM = M; f.tlD = null;
    const Ds = M.kit && M.kit.devs; if (!Ds || !Ds.length || !f.alive) return null;
    const cp = Math.cos(f.pitch), dx = -Math.sin(f.yaw) * cp, dy = Math.sin(f.pitch), dz = -Math.cos(f.yaw) * cp, ey = eyeY(f); let ba = 1e9;
    for (let n = 0; n < Ds.length; n++) { const D = Ds[n]; if (D.by !== f) continue;
      for (let i = 0; i < devN(D); i++) { devPt(D, i, TLP); const vx = TLP[0] - f.x, vy = TLP[1] - ey, vz = TLP[2] - f.z, L = Math.hypot(vx, vy, vz); if (L > TRIG.see || L < .05) continue;
        const a = Math.acos(cl((vx * dx + vy * dy + vz * dz) / L, -1, 1)); if (a > Math.max(TRIG.ang, Math.atan2(TRIG.rad, L)) || a >= ba) continue; ba = a; f.tlD = D; f.tlI = i; f.tlDist = L; } }
    return f.tlD;
  }
  // 'ok' (in reach and in sight: it can be fired), 'far', 'hidden' (something in the way), or null (not looking at one)
  function tesselState(f) {
    const D = tesselLook(f); if (!D) return null; if (f.tlDist > TRIG.r) return 'far';
    if (f.tlLosD !== D || f.tlLosI !== f.tlI || !(M.time - f.tlLosT <= TRIG.losEvery) || f.tlLosT > M.time) { f.tlLosD = D; f.tlLosI = f.tlI; f.tlLosT = M.time; devPt(D, f.tlI, TLP); f.tlLos = los(f.x, eyeY(f), f.z, TLP[0], TLP[1], TLP[2]) >= f.tlDist - .35; }
    return f.tlLos ? 'ok' : 'hidden';
  }
  // the Trigger key
  function tesselTrigger(f) {
    if (!M || !f || f.op !== 'tessel' || !f.alive) return false; f.tlAt = -1; const D = tesselLook(f), mine = f === me();   // (looked at afresh: the aim may have moved since this frame's look)
    if (M.phase !== 'live') { emit('abNo', f, 't'); if (mine && D) say('IT FIRES ONCE THE ROUND IS LIVE', DIM); return false; }
    if (f.lock > 0 || f.chan || f.plant > 0 || f.defuse > 0) { emit('abNo', f, 't'); return false; }
    if (!D) { emit('abNo', f, 't'); if (mine) say(tesselDorm(f, 'q') || tesselDorm(f, 'e') ? 'LOOK AT A DEVICE TO TRIGGER IT' : 'NOTHING SET TO TRIGGER', DIM); return false; }
    f.tlLosT = -9; const st = tesselState(f);
    if (st !== 'ok') { emit('abNo', f, 't'); if (mine) say(st === 'far' ? 'TOO FAR: WITHIN 20 m' : 'NO CLEAR SIGHT OF IT', WARN); return false; }
    fireDev(D, false); return true;
  }
  // a dormant device goes off: the same on every device (online it comes as a message)
  function fireDev(D, fromNet) {
    const K2 = M.kit, i = K2 ? K2.devs.indexOf(D) : -1; if (i < 0) return false; K2.devs.splice(i, 1);
    if (D.k === 'q') { const Z = { id: D.id, x: D.x, y: D.y, z: D.z, r: LULL.r, t: LULL.T, T: LULL.T, by: D.by }; K2.lenses.push(Z); emit('lullStart', Z); }
    else { const L = addLine(D.by, D.ax, D.az, D.bx, D.bz, D.y, LINE.T); emit('lightline', L, D.by); }
    emit('devFire', D); if (D.by === me()) say(D.k === 'q' ? 'LULL' : 'LIGHTLINE', OPS.tessel.col);
    if (!fromNet) net({ t: 'tt', id: D.id, f: D.by.key }); return true;
  }
  // how near a fighter stands to the nearest of a device's points (the network check on a trigger)
  function devReach(D, f) { let b = 1e9; for (let i = 0; i < devN(D); i++) { devPt(D, i, TLP); b = Math.min(b, Math.hypot(TLP[0] - f.x, TLP[1] - eyeY(f), TLP[2] - f.z)); } return b; }
  // a bot fires one when it is in reach and in sight of a point of it (the nearest)
  function botFireDev(f, D) {
    if (M.phase !== 'live' || f.lock > 0 || f.chan) return false; let bi = -1, bd = TRIG.r; const ey = eyeY(f);
    for (let i = 0; i < devN(D); i++) { devPt(D, i, TLP); const d = Math.hypot(TLP[0] - f.x, TLP[1] - ey, TLP[2] - f.z); if (d < bd) { bd = d; bi = i; } }
    if (bi < 0) return false; devPt(D, bi, TLP); if (los(f.x, ey, f.z, TLP[0], TLP[1], TLP[2]) < bd - .35) return false; return fireDev(D, false);
  }
  /* sight against Lightlines: how far along the ray (o, d, both 3D, d of length 1) it first crosses one, or tmax. Each line
     is a sheet over the segment a-b on the floor plan, from y0 to y1 */
  function lineT(o, d, tmax) {
    const Ls = M && M.kit && M.kit.lines; if (!Ls || !Ls.length) return tmax; let best = tmax;
    for (let i = 0; i < Ls.length; i++) { const L = Ls[i], den = d[0] * L.ez - d[2] * L.ex; if (den > -1e-6 && den < 1e-6) continue;
      const wx = L.ax - o[0], wz = L.az - o[2], t = (wx * L.ez - wz * L.ex) / den; if (t <= 0 || t >= best) continue;
      const s = (wx * d[2] - wz * d[0]) / den; if (s < 0 || s > 1) continue; const y = o[1] + d[1] * t; if (y < L.y0 || y > L.y + (L.y1 - L.y) * L.rise) continue; best = t; }
    return best;
  }
  // a rival's bullet against a Lull lens: one hit breaks it. Decided on the shooter's device, and told to the others
  const LZC = [0, 0, 0];
  function lensShot(f, S) {
    const Zs = M.kit && M.kit.lenses; if (!Zs || !Zs.length) return false;
    for (const Z of Zs) { if (!enemyOf(Z.by, f)) continue; LZC[0] = Z.x; LZC[1] = Z.y + .28; LZC[2] = Z.z; const t = raySphere(S.o, S.d, LZC, .3); if (t > 0 && t < S.dist + .25) { breakLens(Z, false); return true; } }
    return false;
  }
  function breakLens(Z, fromNet) { const K2 = M.kit; if (!K2 || Z.down) return; Z.down = true; Z.t = 0; prune(K2.lenses, q => !q.down); emit('lensBreak', Z); if (!fromNet) net({ t: 'lz', id: Z.id }); }
  function stepTessel(dt) {
    const K2 = M.kit;
    // Lightlines: rise, last, and light up a rival who walks through
    for (const L of K2.lines) {
      L.t -= dt; L.rise = Math.min(1, L.rise + dt * 4);
      for (const v of M.fs) {
        if (!v.alive || !enemyOf(L.by, v)) continue; const px = v.x - L.ax, pz = v.z - L.az, s = (px * L.ex + pz * L.ez) / L.len2;
        if (s < -.02 || s > 1.02 || v.y + 1.2 < L.y0 || v.y > L.y1) { L.sd[v.key] = 0; continue; }
        const side = L.ex * pz - L.ez * px > 0 ? 1 : -1, was = L.sd[v.key]; L.sd[v.key] = side;
        if (was && was !== side) { v.reveal = Math.max(v.reveal, LINE.lit); emit('lit', L, v); if (v === me()) say('LIT: YOU ARE SEEN', WARN); else if (L.by === me()) say('A RIVAL CROSSED YOUR LIGHTLINE', OPS.tessel.col); }
      }
    }
    prune(K2.lines, keepLive);
    // Lull: rivals near the lens move at half speed (each device for its own fighters)
    for (const Z of K2.lenses) { Z.t -= dt; for (const v of M.fs) if (!v.net && v.alive && enemyOf(Z.by, v) && Math.hypot(v.x - Z.x, v.z - Z.z) < Z.r && Math.abs(v.y - Z.y) < 2) { if (!(v.slowF > 0) && v === me()) say('LULLED', WARN); v.slowF = .2; } }
    prune(K2.lenses, keepLive);
    // Glasshouse: inside the square, rivals move at half speed
    for (const H of K2.houses) { H.t -= dt; for (const v of M.fs) if (!v.net && v.alive && enemyOf(H.by, v) && Math.abs(v.x - H.x) < H.half && Math.abs(v.z - H.z) < H.half && Math.abs(v.y - H.y) < 3) { if (!(v.slowF > 0) && v === me()) say('SLOWED', WARN); v.slowF = .2; } }
    prune(K2.houses, keepLive);
  }
  // bots: each ability with a reason. Lull and Lightline are set where rivals will come and fired when one does
  function tesselBot(f, B, P, side, sees, engaged, fresh, near, dE, e, dt, last, roll) {
    const id = () => f.key + ':' + M.round + ':' + Math.round(M.time * 100), there = P.path && !P.path.length, look = P.look || (B.last ? [B.last.x, B.last.z] : null);
    const lobAt = (k, tx, tz) => { const dx = tx - f.x, dz = tz - f.z, d = Math.hypot(dx, dz), T = cl(d / 13, .45, 1.1), y0 = eyeY(f) - .1, ty = hAt(tx, tz) + .1, n = id();
      botCast(f, k, { x: f.x, y: y0, z: f.z, vx: dx / T, vy: (ty - y0 + LOB_G / 2 * T * T) / T, vz: dz / T, id: n }); return n; };
    const dq = tesselDorm(f, 'q'), de = tesselDorm(f, 'e');
    // C Bloom: glare on a spot ahead of a push, or where a rival was last seen
    if (f.ab.c && !sees && side === 'att' && P.k === 'push' && near < 24 && near > 7 && roll) { const hs = HOLDS.filter(q => q.lane === P.lane || q.lane === 'any'), h = hs.length ? pick(hs) : null; if (h && Math.hypot(h.p[0] - f.x, h.p[1] - f.z) < 22) lobAt('c', h.p[0], h.p[1]); }
    else if (f.ab.c && last && !sees && dE > 6 && dE < 20 && side === 'def' && roll) lobAt('c', last.x, last.z);
    // Q Lull: set on the way rivals come to a hold, or by the charge after a plant; on a rival just heard, it fires as it lands
    if (f.ab.q && !dq && !sees) {
      if (side === 'def' && P.k === 'hold' && there && look && Math.hypot(look[0] - f.x, look[1] - f.z) > 4 && roll) lobAt('q', look[0], look[1]);
      else if (side === 'att' && M.planted && P.k === 'post' && roll) lobAt('q', M.planted.x + rnd(-1.5, 1.5), M.planted.z + rnd(-1.5, 1.5));
      else if (last && dE > 5 && dE < 18 && roll) B.tAuto = lobAt('q', last.x, last.z);
    }
    // E Lightline: set across the way into a hold (fired when a rival comes); drawn and fired at once to cut a losing fight or cover a push
    if (f.ab.e && !de) {
      let D = null;
      if (engaged && e && e.alive && f.hp < 60 && dE > 4 && R() < dt * 2) { const mx = (f.x + e.x) / 2, mz = (f.z + e.z) / 2, dx = e.x - f.x, dz = e.z - f.z, L = Math.hypot(dx, dz) || 1, px = -dz / L, pz = dx / L, w = 5; botCast(f, 'e', { ax: r2(mx + px * w), az: r2(mz + pz * w), bx: r2(mx - px * w), bz: r2(mz - pz * w), y: r2(hAt(mx, mz)), id: id() }); D = tesselDorm(f, 'e'); }
      else if (!sees && side === 'att' && P.k === 'push' && near < 22 && near > 8 && R() < dt * .5) { const tg = siteOfPlan(P, f), dx = tg[0] - f.x, dz = tg[1] - f.z, L = Math.hypot(dx, dz) || 1, hx = dx / L, hz = dz / L, n = LINE.len, o = openEnds({ ax: r2(f.x), az: r2(f.z), bx: r2(f.x + hx * n), bz: r2(f.z + hz * n), y: r2(f.y) }); if (o) { o.id = id(); botCast(f, 'e', o); D = tesselDorm(f, 'e'); } }
      else if (!sees && side === 'def' && P.k === 'hold' && there && look && R() < dt * .5) { const dx = look[0] - f.x, dz = look[1] - f.z, L = Math.hypot(dx, dz); if (L > 4) { const o = openEnds(acrossLine(f, dx / L, dz / L, Math.min(L, 10))); if (o) { o.id = id(); botCast(f, 'e', o); } } }
      if (D) botFireDev(f, D);
    }
    // the trigger, a few times a second: a device a rival has come near (one in sight, or just heard), or the Lull by a charge being defused
    if ((B.tT = (B.tT || 0) - dt) <= 0 && M.kit.devs.length && M.phase === 'live') { B.tT = .25; const at = sees && e ? e : last;
      for (const D of M.kit.devs) { if (D.by !== f) continue;
        const go = D.id === B.tAuto || (at && devDist(D, at.x, at.z) < (D.k === 'q' ? LULL.r - .8 : 2.5)) || (D.k === 'q' && side === 'att' && M.planted && e && e.defuse > 0 && devDist(D, M.planted.x, M.planted.z) < LULL.r);
        if (go && botFireDev(f, D)) { if (D.id === B.tAuto) B.tAuto = null; break; } } }
  }
  // the ultimate: on a rival in sight, or over the charge in a retake or after a plant
  function tesselUlt(f, B, P, side, sees, engaged, fresh, near, dE, e, dt) {
    const at = (x, z) => botCast(f, 'x', { x: r2(x), z: r2(z) });
    if (sees && e && e.alive && dE > 4 && dE < 25 && R() < dt * 1.5) at(e.x, e.z);
    else if (M.planted && !sees && fresh && R() < dt * .8 && ((P.k === 'retake' && Math.hypot(M.planted.x - f.x, M.planted.z - f.z) < 26) || (side === 'att' && Math.hypot(M.planted.x - f.x, M.planted.z - f.z) < 20))) at(M.planted.x, M.planted.z);
  }
