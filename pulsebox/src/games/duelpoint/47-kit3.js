  /* ---------- 47 kit, third part: TESSEL (Architect) ----------
     Tessel builds the room a fight happens in, out of light.
       C Bloom: a lobbed seed of light that opens into a 3.4 m globe of glare for 9 s. It blocks sight as a smoke does.
       Q Lull: a lobbed lens that settles where it lands; for 7 s rivals within 4.5 m of it move at half speed. One bullet
         from a rival breaks the lens and ends it.
       E Lightline: a curtain of light drawn from your feet along your aim (up to 20 m, stopping at the first wall), or with
         the other click across your view (up to 16 m wide). For 14 s it blocks sight both ways, but not bullets and not
         feet; a rival who walks through it is Lit (shown through walls to Tessel's side) for 2.5 s. It comes back 40 s
         after it is used.
       X Glasshouse: a 10 m square of Lightlines rises round the spot you point at (up to 30 m away) for 10 s, and rivals
         inside it move at half speed.
     A Lightline is a sheet standing on a line across the floor: sight (los) stops where a ray crosses it, shots go on. Who
     walks through one is worked out on every device for every fighter, from the line and where they stand, so all agree. */
  const LINE = { len: 20, wide: 8, h: 3.3, T: 14, lit: 2.5 }, LULL = { r: 4.5, T: 7 }, BLOOM = { R: 3.4, T: 9 }, HOUSE = { half: 5, T: 10, reach: 30 };
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
      if (!alt) {   // along your aim, from your feet to the first wall
        const ax = f.x + hx * .7, az = f.z + hz * .7, n = Math.max(1.5, Math.min(LINE.len, rayGrid(ax, f.y + 1.7, az, hx, 0, hz, LINE.len) - .15));
        return { ax: r2(ax), az: r2(az), bx: r2(ax + hx * n), bz: r2(az + hz * n), y: r2(f.y) };
      }
      // across your view, where you look (2 to 10 m out), each side running on until a wall
      const out = Math.max(2, Math.min(10, (S.dist || 10) * Math.max(hl, .2) - .6, rayGrid(f.x, f.y + 1.7, f.z, hx, 0, hz, 10) - .5)), cx = f.x + hx * out, cz = f.z + hz * out, y = hAt(cx, cz), px = -hz, pz = hx;
      const l1 = Math.max(.5, Math.min(LINE.wide, rayGrid(cx, y + 1.7, cz, px, 0, pz, LINE.wide) - .15)), l2 = Math.max(.5, Math.min(LINE.wide, rayGrid(cx, y + 1.7, cz, -px, 0, -pz, LINE.wide) - .15));
      return { ax: r2(cx + px * l1), az: r2(cz + pz * l1), bx: r2(cx - px * l2), bz: r2(cz - pz * l2), y: r2(y) };
    }
    if (key === 'tesselx') {   // where your aim meets the world (up to 30 m), brought to the floor
      const L = Math.max(2, Math.min(HOUSE.reach, S.dist || HOUSE.reach) - .3); let x = f.x + d[0] * L, z = f.z + d[2] * L;
      const [ci, cj] = nearestNav(x, z); if (Math.floor(x / CS) !== ci || Math.floor(z / CS) !== cj) { x = (ci + .5) * CS; z = (cj + .5) * CS; }
      return { x: r2(x), z: r2(z) };
    }
    return undefined;
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
      const L = addLine(f, d.ax, d.az, d.bx, d.bz, d.y, LINE.T); emit('lightline', L, f); return true;
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
    if (B.k === 'tesselq') { const Z = { id: B.id, x, y, z, r: LULL.r, t: LULL.T, T: LULL.T, by: B.by }; K2.lenses.push(Z); emit('lullStart', Z); }
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
  // bots: each ability with a reason
  function tesselBot(f, B, P, side, sees, engaged, fresh, near, dE, e, dt, last, roll) {
    const lobAt = (k, tx, tz) => { const dx = tx - f.x, dz = tz - f.z, d = Math.hypot(dx, dz), T = cl(d / 13, .45, 1.1), y0 = eyeY(f) - .1, ty = hAt(tx, tz) + .1;
      botCast(f, k, { x: f.x, y: y0, z: f.z, vx: dx / T, vy: (ty - y0 + LOB_G / 2 * T * T) / T, vz: dz / T, id: f.key + ':' + M.round + ':' + Math.round(M.time * 100) }); };
    // C Bloom: glare on a spot ahead of a push, or where a rival was last seen
    if (f.ab.c && !sees && side === 'att' && P.k === 'push' && near < 24 && near > 7 && roll) { const hs = HOLDS.filter(q => q.lane === P.lane || q.lane === 'any'), h = hs.length ? pick(hs) : null; if (h && Math.hypot(h.p[0] - f.x, h.p[1] - f.z) < 22) lobAt('c', h.p[0], h.p[1]); }
    else if (f.ab.c && last && !sees && dE > 6 && dE < 20 && side === 'def' && roll) lobAt('c', last.x, last.z);
    // Q Lull: where a rival was heard or seen, or on the charge while it is being defused
    if (f.ab.q && !sees && ((last && dE > 5 && dE < 18 && roll) || (side === 'att' && M.planted && e && e.defuse > 0))) { const tg = side === 'att' && M.planted && e && e.defuse > 0 ? [M.planted.x, M.planted.z] : [last.x, last.z]; lobAt('q', tg[0], tg[1]); }
    // E Lightline: cut the sight line to a rival when losing a fight; or draw one along a push to cover a crossing
    if (f.ab.e) {
      if (engaged && e && e.alive && f.hp < 60 && dE > 4 && R() < dt * 2) { const mx = (f.x + e.x) / 2, mz = (f.z + e.z) / 2, dx = e.x - f.x, dz = e.z - f.z, L = Math.hypot(dx, dz) || 1, px = -dz / L, pz = dx / L, w = 5; botCast(f, 'e', { ax: r2(mx + px * w), az: r2(mz + pz * w), bx: r2(mx - px * w), bz: r2(mz - pz * w), y: r2(hAt(mx, mz)) }); }
      else if (!sees && side === 'att' && P.k === 'push' && near < 22 && near > 8 && R() < dt * .5) { const tg = siteOfPlan(P, f), dx = tg[0] - f.x, dz = tg[1] - f.z, L = Math.hypot(dx, dz) || 1, hx = dx / L, hz = dz / L, n = Math.max(1.5, Math.min(LINE.len, rayGrid(f.x, f.y + 1.7, f.z, hx, 0, hz, LINE.len) - .15)); botCast(f, 'e', { ax: r2(f.x), az: r2(f.z), bx: r2(f.x + hx * n), bz: r2(f.z + hz * n), y: r2(f.y) }); }
    }
  }
  // the ultimate: on a rival in sight, or over the charge in a retake or after a plant
  function tesselUlt(f, B, P, side, sees, engaged, fresh, near, dE, e, dt) {
    const at = (x, z) => botCast(f, 'x', { x: r2(x), z: r2(z) });
    if (sees && e && e.alive && dE > 4 && dE < 25 && R() < dt * 1.5) at(e.x, e.z);
    else if (M.planted && !sees && fresh && R() < dt * .8 && ((P.k === 'retake' && Math.hypot(M.planted.x - f.x, M.planted.z - f.z) < 26) || (side === 'att' && Math.hypot(M.planted.x - f.x, M.planted.z - f.z) < 20))) at(M.planted.x, M.planted.z);
  }
