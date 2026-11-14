  /* ---------- 40 sim: fighters, movement, shooting, the knife, abilities, the charge, rounds, money ----------
     M is the match. M.fs[0] is always the fighter this device shows (you, or the camera bot in a demo), M.fs[1] the rival.
     A fighter is driven by one of three things: local input, a bot (50-bot), or the network (60-net).
     Modes: 'bot' (you against a bot), 'online', 'range' (practice: endless money, a target that comes back), 'demo'. */
  let M = null;
  let readInput = () => ({ mx: 0, mz: 0, walk: false, crouch: false, jump: false, use: false, fire: false, rapid: false });   // 90-input replaces this
  const BOT_NAMES = ['Rook', 'Kestrel', 'Mercer', 'Talon', 'Nyx', 'Sable', 'Quill', 'Ember', 'Wren', 'Onyx'];
  const WHY = { elim_att: 'Attacker eliminated', elim_def: 'Defender eliminated', time: 'Time ran out', boom: 'Charge detonated', defuse: 'Charge defused', left: 'Rival left the match' };

  function fighter(o) {
    return Object.assign({
      name: '', op: 'vex', local: false, bot: null, net: false,
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, crouch: 0, ground: true, jumpHeld: false,
      hp: 100, sh: 0, alive: true, guns: { 1: null, 2: 'pip', 3: 'knife' }, slot: 2, ammo: {},
      fireT: 0, reloadT: 0, spray: 0, sseed: 0, burst: null, scoped: 0, kick: 0, swing: null, semiHeld: false,
      credits: CASH.start, spent: {}, lossRun: 0, ready: false, ab: { q: 1, e: 1 }, abT: 0,
      flash: 0, reveal: 0, heal: null, dash: null, plant: 0, defuse: 0, footT: 0, step: 0, walkT: 0,
      stat: { k: 0, d: 0, hs: 0, dmg: 0, shots: 0, hits: 0 },
    }, o);
  }
  const me = () => M.fs[0], foe = () => M.fs[1], other = f => M.fs[0] === f ? M.fs[1] : M.fs[0];
  const gun = f => GUNS[f.guns[f.slot]] || GUNS.knife;
  const eyeY = f => f.y + lp(EYE, CEYE, f.crouch);
  // who attacks: one side for rounds 1 to 4, the other for 5 to 8, and a side fixed at the start for a decider
  const attIdx = () => M.mode === 'range' ? 0 : M.round <= 4 ? M.att0 : M.round <= 8 ? 1 - M.att0 : M.decAtt;
  const sideOf = f => M.fs.indexOf(f) === attIdx() ? 'att' : 'def';
  const pistolRound = n => n === 1 || n === 5;
  function giveAmmo(f, k) { const G = GUNS[k]; if (G && !G.melee) f.ammo[k] = { mag: G.mag, res: G.res }; }
  const say = (s, c) => { M.say = { s, c: c || BONE, t: 0 }; emit('say', s, c); };

  /* ---------- the body ---------- */
  const solidAt = (x, z, feet) => {
    if (hMove(x, z) > feet + STEP) return true;
    for (const w of M.walls) if (x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1 && feet < 3 * w.grow) return true;
    return false;
  };
  const RING = [[RAD, 0], [-RAD, 0], [0, RAD], [0, -RAD], [RAD * .7, RAD * .7], [-RAD * .7, RAD * .7], [RAD * .7, -RAD * .7], [-RAD * .7, -RAD * .7]];
  function blocked(x, z, feet) { for (const [a, b] of RING) if (solidAt(x + a, z + b, feet)) return true; return false; }
  function groundAt(x, z, feet) { let g = 0; for (const [a, b] of [[0, 0], [RAD, 0], [-RAD, 0], [0, RAD], [0, -RAD]]) { const h = hMove(x + a, z + b); if (h <= feet + STEP && h > g) g = h; } return g; }
  function moveF(f, dx, dz) {
    if (!blocked(f.x + dx, f.z, f.y)) f.x += dx; else f.vx = 0;
    if (!blocked(f.x, f.z + dz, f.y)) f.z += dz; else f.vz = 0;
    const g = groundAt(f.x, f.z, f.y), was = f.ground;
    if (f.y > g + .001 || f.vy > 0) f.ground = false;
    if (f.y <= g) { if (!was && f.vy < -4) emit('land', f); f.y = g; f.vy = 0; f.ground = true; }
    const k = idx(Math.floor(f.x / CS), Math.floor(f.z / CS)), top = k >= 0 && CEIL[k] ? CEIL[k] - 1.85 : 99;   // a roof or lintel overhead
    if (f.y > top) { f.y = top; if (f.vy > 0) f.vy = 0; }
  }
  // one step of a fighter's body from its intent I: { mx, mz (-1..1, how hard and which way), walk, crouch, jump }
  function stepBody(f, I, dt) {
    if (!f.alive) return;
    const G = gun(f), frozen = (M.phase === 'buy' && M.mode !== 'range') || f.plant > 0 || f.defuse > 0;
    f.crouch = cl(f.crouch + (I.crouch ? 1 : -1) * dt * 8, 0, 1);
    let sp = (f.crouch > .5 ? CSPD : I.walk ? WALK : SPD) * G.spd; if (f.scoped) sp *= G.scope ? .55 : .76;
    const s = Math.sin(f.yaw), c = Math.cos(f.yaw); let wx = -s * I.mz + c * I.mx, wz = -c * I.mz - s * I.mx; const L = Math.hypot(wx, wz); if (L > 1) { wx /= L; wz /= L; }
    if (frozen) wx = wz = 0;
    // head for the wanted velocity at a fixed rate: quickest when braking against your motion (the counter-strafe), slowest in the air
    const tx = wx * sp, tz = wz * sp, ddx = tx - f.vx, ddz = tz - f.vz, dl = Math.hypot(ddx, ddz);
    const rate = !f.ground ? 6 : Math.hypot(tx, tz) < .01 ? 26 : tx * f.vx + tz * f.vz < 0 ? 80 : 44;
    if (dl > 0) { const stp = Math.min(dl, rate * dt); f.vx += ddx / dl * stp; f.vz += ddz / dl * stp; }
    if (f.dash) { f.dash.t -= dt; f.vx = f.dash.dx * 36; f.vz = f.dash.dz * 36; if (f.dash.t <= 0) { f.dash = null; f.vx *= .2; f.vz *= .2; } }
    if (I.jump && !f.jumpHeld && f.ground && !frozen && f.crouch < .5) { f.vy = JUMP; f.ground = false; emit('jump', f); }
    f.jumpHeld = !!I.jump;
    f.vy -= GRAV * dt; f.y += f.vy * dt;
    moveF(f, f.vx * dt, f.vz * dt);
    const v = Math.hypot(f.vx, f.vz); f.walkT += v * dt;
    // running is loud: a footstep every stride, which bots hear and the other player's speakers play
    if (f.ground && v > 3.6 && f.crouch < .5) { f.footT -= dt; if (f.footT <= 0) { f.footT = .36; f.step = .5; emit('step', f); } }
    if (f.step > 0) f.step -= dt;
    if (f.heal) { f.heal.t -= dt; f.hp = Math.min(100, f.hp + 20 * dt); if (f.heal.t <= 0) { f.heal = null; f.hp = Math.round(f.hp); } }
    for (const k of ['flash', 'reveal', 'kick']) if (f[k] > 0) f[k] = Math.max(0, f[k] - dt);
    if (f.swing) { f.swing.t += dt; if (f.swing.t > .7) f.swing = null; }
  }

  /* ---------- shooting ---------- */
  // movement error in degrees: none below 28% of run speed (standing, or the instant a counter-strafe stops you),
  // the walk figure at half speed, the run figure at full speed, the jump figure in the air
  function moveErr(f, G) {
    const A = G.acc, fr = Math.hypot(f.vx, f.vz) / SPD;
    let e = fr <= .28 ? 0 : fr <= .5 ? lp(0, A.walk, (fr - .28) / .22) : lp(A.walk, A.run, Math.min(1, (fr - .5) / .5));
    if (!f.ground) e = Math.max(e, A.jump); return e;
  }
  // the half-angle of the cone the next bullet can leave in, in radians
  function spreadOf(f) {
    const G = gun(f), A = G.acc, sc = G.scope && f.scoped, ad = !G.scope && G.ads && f.scoped;
    let e = (sc ? A.sfs : A.fs) * (ad ? .8 : 1) + Math.min(A.max, A.inc * Math.max(0, f.spray - A.free)) * (ad ? .85 : 1) + moveErr(f, G);
    if (f.crouch > .5 && f.ground) e *= .85;
    return e * D2R;
  }
  // where the spray has pushed the next bullet: up first, then side to side
  function patOf(f, G) {
    const P = G.pat; if (!P) return [0, 0]; const n = Math.max(0, f.spray - G.acc.free);
    return [n > P.hs0 ? P.hk * Math.sin((n - P.hs0) * .85 + f.sseed) * D2R : 0, Math.min(P.vmax, P.vk * n) * D2R];
  }
  const viewDir = (yaw, pitch) => { const cp = Math.cos(pitch); return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp]; };
  // ray against a sphere / an axis-aligned box: the distance, or -1
  function raySphere(o, d, c, r) { const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2], b = ox * d[0] + oy * d[1] + oz * d[2], q = ox * ox + oy * oy + oz * oz - r * r, h = b * b - q; if (h < 0) return -1; const t = -b - Math.sqrt(h); return t > 0 ? t : -1; }
  function rayBox(o, d, mn, mx) { let t0 = 0, t1 = 1e9; for (let a = 0; a < 3; a++) { const inv = 1 / (d[a] || 1e-9); let ta = (mn[a] - o[a]) * inv, tb = (mx[a] - o[a]) * inv; if (ta > tb) { const s = ta; ta = tb; tb = s; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return -1; } return t0; }
  // where a fighter can be hit: a head sphere, and a body box whose lower 45% is the legs
  function hitboxes(f) { const e = eyeY(f); return { head: [f.x, e - .02, f.z], hr: .2, mn: [f.x - .3, f.y, f.z - .3], mx: [f.x + .3, e - .2, f.z + .3], leg: f.y + (e - .2 - f.y) * .45 }; }
  // a bullet from f's eyes along d: what it meets first (the world, a Rampart, or the rival)
  function castShot(f, d) {
    const o = [f.x, eyeY(f), f.z]; let dist = rayGrid(o[0], o[1], o[2], d[0], d[1], d[2], 140), hit = null; const n = [rayN[0], rayN[1], rayN[2]];
    for (const w of M.walls) { const t = rayBox(o, d, [w.x0, 0, w.z0], [w.x1, 3 * w.grow, w.z1]); if (t > 0 && t < dist) { dist = t; n[0] = -Math.sign(d[0]) * (w.x1 - w.x0 < 1 ? 1 : 0); n[1] = 0; n[2] = -Math.sign(d[2]) * (w.x1 - w.x0 < 1 ? 0 : 1); } }
    const v = other(f);
    if (v.alive) { const hb = hitboxes(v), th = raySphere(o, d, hb.head, hb.hr), tb = rayBox(o, d, hb.mn, hb.mx); if (th > 0 && th < dist) { dist = th; hit = { f: v, head: true }; } else if (tb > 0 && tb < dist) { dist = tb; hit = { f: v, head: false, leg: o[1] + d[1] * tb < hb.leg }; } }
    return { o, d, dist, hit, n, end: [o[0] + d[0] * dist, o[1] + d[1] * dist, o[2] + d[2] * dist] };
  }
  // pull the trigger: one shot, a burst (the Pip's alternate fire, the Mako aimed down sights), or a knife swing
  function fire(f, alt) {
    const G = gun(f), A = f.ammo[G.k];
    if (!f.alive || f.fireT > 0 || f.reloadT > 0 || f.burst || (M.phase === 'buy' && M.mode !== 'range') || f.plant > 0 || f.defuse > 0) return false;
    if (G.melee) return melee(f, alt === 'heavy');
    if (!A || A.mag <= 0) { if (A && A.res > 0) reload(f); else { f.fireT = .25; emit('dry', f); } return false; }
    if (alt === 'burst3' || (G.alt === 'burst4' && f.scoped)) { const three = alt === 'burst3'; f.burst = { n: Math.min(A.mag, three ? 3 : 4), gap: three ? 60 / 1100 : 60 / 900, t: 0, err: three ? 2.2 : 0 }; f.fireT = three ? .5 : .36; stepBurst(f, 0); return true; }
    shootOne(f, 0, false); return true;
  }
  function stepBurst(f, dt) {
    if (!f.burst) return; f.burst.t -= dt;
    while (f.burst && f.burst.t <= 0) { const A = f.ammo[gun(f).k]; if (!f.alive || !A || A.mag <= 0) { f.burst = null; break; } shootOne(f, f.burst.err, true); f.burst.t += f.burst.gap; if (--f.burst.n <= 0) f.burst = null; }
  }
  function shootOne(f, extra, inBurst) {
    const G = gun(f), A = f.ammo[G.k]; A.mag--; f.stat.shots++;
    if (!inBurst) f.fireT = Math.max(f.fireT, -.02) + 60 / (G.rpm * (G.spin ? 1 + G.spin * Math.min(1, f.spray / 14) : 1));   // keep the fraction of a tick, so the rate is exact
    if (f.spray < .5) f.sseed = R() * TAU;
    const base = spreadOf(f) + extra * D2R, pt = patOf(f, G), a = R() * TAU, r = Math.sqrt(R()) * base, ps = (G.pspr || 0) * D2R; let landed = false;
    let y0 = 0, p0 = 0;
    for (let p = 0; p < (G.pel || 1); p++) {
      const a2 = R() * TAU, r2 = Math.sqrt(R()) * ps, yw = f.yaw + pt[0] + Math.cos(a) * r + Math.cos(a2) * r2, pc = f.pitch + pt[1] + Math.sin(a) * r + Math.sin(a2) * r2, S = castShot(f, viewDir(yw, pc));
      if (p === 0) { y0 = yw; p0 = pc; }
      emit('shot', f, S, p === 0);
      if (S.hit && !f.net) { landed = true; damage(S.hit.f, dmgAt(G, S.dist, S.hit.head ? 1 : S.hit.leg ? 3 : 2), f, S.hit.head, G.k); }
    }
    if (landed) f.stat.hits++;
    f.spray += 1; f.kick = .08; if (f === me()) M.camKick += G.punch * D2R * (f.scoped && G.scope ? .4 : 1);
    if (!f.net) net({ t: 'sh', a: r3(y0), b: r3(p0) });
    if (A.mag === 0 && A.res > 0) f.autoReload = .26;
  }
  // the knife: a light slash (50, 75 to the head) or a heavy stab (75, 150 in the back). A small fan of rays, so a swing
  // that is nearly on target still connects; it reaches 2.4 m (2 m for the stab).
  function melee(f, heavy) {
    f.fireT = heavy ? 1 : .42; f.swingSide = -(f.swingSide || 1); f.swing = { t: 0, heavy, side: f.swingSide };
    const e = other(f), range = heavy ? 2 : 2.4; let S = null;
    for (const [dy, dp] of [[0, 0], [.08, 0], [-.08, 0], [0, .07], [0, -.09], [.16, 0], [-.16, 0], [0, -.18]]) { const s2 = castShot(f, viewDir(f.yaw + dy, f.pitch + dp)); if (s2.hit && s2.dist <= range) { S = s2; break; } }
    emit('melee', f, heavy, S);
    if (S && !f.net) { const back = Math.abs(angDiff(e.yaw, f.yaw)) < 1.05; damage(e, heavy ? (back ? 150 : 75) : (S.hit.head ? 75 : 50), f, S.hit.head || (heavy && back), 'knife'); }
    if (!f.net) net({ t: 'kn', h: heavy ? 1 : 0 });
    return true;
  }
  function reload(f) { const G = gun(f), A = f.ammo[G.k]; if (!A || f.reloadT > 0 || A.mag >= G.mag || A.res <= 0 || !f.alive) return; f.reloadT = G.rel; f.scoped = 0; f.burst = null; emit('reload', f); }
  function stepGun(f, dt) {
    const G = gun(f);
    if (f.fireT > -1) f.fireT -= dt;   // below zero it counts how long the trigger has rested
    stepBurst(f, dt);
    if (f.autoReload > 0 && (f.autoReload -= dt) <= 0 && f.alive && !f.burst) reload(f);
    // the spray settles once the trigger has rested a moment: from its worst to nothing in 'recov' seconds
    if (f.fireT < -.05 && !f.burst && f.spray > 0) f.spray = Math.max(0, f.spray - dt * (G.acc.free + 1 + (G.acc.inc ? G.acc.max / G.acc.inc : 4)) / G.acc.recov);
    if (f.reloadT > 0) { f.reloadT -= dt; if (f.reloadT <= 0) { const A = f.ammo[G.k], n = Math.min(G.mag - A.mag, A.res); A.mag += n; if (M.mode !== 'range') A.res -= n; f.spray = 0; } }
  }
  function switchTo(f, slot) { if (!f.guns[slot] || f.slot === slot || !f.alive) return; f.slot = slot; f.reloadT = 0; f.autoReload = 0; f.scoped = 0; f.burst = null; f.spray = 0; f.fireT = Math.max(f.fireT, GUNS[f.guns[slot]].equip * .7); emit('swap', f); }
  const cycleWeapon = (f, dir = 1) => { const order = [1, 2, 3].filter(s => f.guns[s]); switchTo(f, order[(order.indexOf(f.slot) + (dir > 0 ? 1 : order.length - 1)) % order.length]); };
  // the alternate fire: scope a sniper (twice for the Longbow's 5x), aim down sights, the Pip's burst, the knife's stab
  function altAction(f) {
    const G = gun(f); if (!f.alive || f.reloadT > 0) return;
    if (G.melee) fire(f, 'heavy');
    else if (G.scope) { f.scoped = (f.scoped + 1) % (G.scope.length + 1); emit('swap', f); }
    else if (G.ads) f.scoped = f.scoped ? 0 : 1;
    else if (G.alt === 'burst3') fire(f, 'burst3');
  }
  // Damage is decided by the shooter and applied on the victim's own device (online it travels as a message).
  // Shields soak it until they run out.
  function damage(v, dmg, by, head, wk) {
    if (!v.alive || M.phase === 'end') return;
    if (v.net) { net({ t: 'hit', d: dmg, h: head ? 1 : 0, w: wk }); by.stat.dmg += Math.min(dmg, v.hp + v.sh); emit('hurt', v, by, dmg, head); return; }
    applyDamage(v, dmg, by, head, wk);
  }
  function applyDamage(v, dmg, by, head, wk) {
    if (!v.alive || M.phase === 'end') return;
    const real = Math.min(dmg, v.hp + v.sh), soak = Math.min(v.sh, dmg); v.sh -= soak; v.hp -= dmg - soak; if (!by.net) by.stat.dmg += real;
    if (v === me()) { M.hurt = 1; M.hurtDir = Math.atan2(by.x - v.x, by.z - v.z); }
    emit('hurt', v, by, dmg, head);
    if (v.hp <= 0) { v.hp = 0; die(v, by, head, wk); }
  }
  function die(v, by, head, wk) {
    if (!v.alive) return;
    v.alive = false; v.plant = v.defuse = 0; v.scoped = 0; v.burst = null; v.stat.d++; by.stat.k++; if (head) by.stat.hs++;
    M.feed.unshift({ a: by.name, b: v.name, w: GUNS[wk] ? GUNS[wk].n : wk, head, t: 0, mine: by === me() });
    if (!by.net) by.credits = Math.min(CASH.cap, by.credits + CASH.kill);
    if (v === me()) M.deathInfo = { by: by.name, w: GUNS[wk] ? GUNS[wk].n : wk, head, hp: Math.ceil(by.hp), sh: by.sh, yaw: yawTo(v.x, v.z, by.x, by.z), t: 0 };
    emit('kill', v, by, head, wk);
    if (!v.net) net({ t: 'dead', h: head ? 1 : 0, w: wk });
    if (M.mode === 'range') v.respawn = 1.6;
    else if (M.host) judge();
  }

  /* ---------- sight ---------- */
  // how far you can see from a to b before a wall, a Rampart or (unless told otherwise) a smoke gets in the way
  function los(ax, ay, az, bx, by, bz, smoke = true) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz) || 1e-6, d = [dx / L, dy / L, dz / L], o = [ax, ay, az];
    let t = rayGrid(ax, ay, az, d[0], d[1], d[2], L);
    for (const w of M.walls) { const tw = rayBox(o, d, [w.x0, 0, w.z0], [w.x1, 3 * w.grow, w.z1]); if (tw > 0 && tw < t) t = tw; }
    if (smoke) for (const s of M.smokes) { if (s.r < 1.5) continue; if (Math.hypot(ax - s.x, az - s.z) < s.r) return 0; const ts = raySphere(o, d, [s.x, s.y + 1.3, s.z], s.r * .92); if (ts > 0 && ts < t) t = ts; }
    return t;
  }
  function canSee(a, b) {
    if (a.flash > .5) return false; const ea = eyeY(a), d = Math.hypot(b.x - a.x, b.z - a.z);
    for (const hy of [eyeY(b) - .05, b.y + .9]) { const L = Math.hypot(d, hy - ea); if (los(a.x, ea, a.z, b.x, hy, b.z) >= L - .25) return true; }
    return false;
  }

  /* ---------- abilities: one use of each per round ---------- */
  function ability(f, k) {
    if (!f.alive || M.phase !== 'live' || !f.ab[k] || f.plant > 0 || f.defuse > 0) return false;
    const d = viewDir(f.yaw, f.pitch), key = f.op + k, S = castShot(f, d); let data = {};
    if (key === 'vexq') { let dx = f.vx, dz = f.vz; const L = Math.hypot(dx, dz); if (L < .5) { dx = -Math.sin(f.yaw); dz = -Math.cos(f.yaw); } else { dx /= L; dz /= L; } data = { dx, dz }; }
    if (key === 'vexe') { const dd = Math.max(1, Math.min(S.hit ? 24 : S.dist, 24) - .6); data = { x: f.x + d[0] * dd, z: f.z + d[2] * dd }; }
    if (key === 'irise') { const dd = Math.max(.5, Math.min((S.hit ? 12 : S.dist) - .6, 12)); data = { x: f.x + d[0] * dd, y: eyeY(f) + d[1] * dd, z: f.z + d[2] * dd }; }
    if (key === 'bastionq') { const fx = -Math.sin(f.yaw), fz = -Math.cos(f.yaw); data = { x: f.x + fx * 2.6, z: f.z + fz * 2.6, ax: Math.abs(fx) > Math.abs(fz) ? 1 : 0 }; }
    f.ab[k] = 0; if (M.mode === 'range') f.abT = 4;
    applyAbility(f, k, data); net({ t: 'ab', k, d: data });
    return true;
  }
  // the effect itself, the same whether it was your key press, a bot's choice, or a message from the other player
  function applyAbility(f, k, d) {
    const key = f.op + k;
    if (key === 'vexq' && !f.net) f.dash = { t: .17, dx: d.dx, dz: d.dz };
    if (key === 'vexe') { const s = { x: d.x, z: d.z, y: hAt(d.x, d.z) > 2 ? 0 : hAt(d.x, d.z), r: 0, R: 3.8, t: 12, T: 12 }; M.smokes.push(s); emit('smoke', s); }
    if (key === 'irisq') { other(f).reveal = 3.2; if (other(f) === me()) say('YOU ARE REVEALED', WARN); else if (f === me()) say('RIVAL REVEALED', YOU); }
    if (key === 'irise') { const fl = { x: d.x, y: d.y, z: d.z, t: .55, by: f }; M.flares.push(fl); emit('flare', fl); }
    if (key === 'bastionq') { const w = d.ax ? { x0: d.x - .3, x1: d.x + .3, z0: d.z - 2.6, z1: d.z + 2.6 } : { x0: d.x - 2.6, x1: d.x + 2.6, z0: d.z - .3, z1: d.z + .3 }; w.t = 12; w.grow = 0; M.walls.push(w); emit('wall', w); }
    if (key === 'bastione') f.heal = { t: 3 };
    emit('ability', f, k);
  }
  function popFlare(fl) {
    for (const f of M.fs) {
      if (!f.alive || f.net) continue; const ex = f.x, ey = eyeY(f), ez = f.z, dx = fl.x - ex, dy = fl.y - ey, dz = fl.z - ez, L = Math.hypot(dx, dy, dz) || .01;
      if (L > 26 || los(ex, ey, ez, fl.x, fl.y, fl.z) < L - .3) continue;
      const v = viewDir(f.yaw, f.pitch), dot = (v[0] * dx + v[1] * dy + v[2] * dz) / L; f.flash = Math.max(f.flash, dot > .5 ? 2.4 : dot > 0 ? 1.2 : .35);
    }
    emit('flarePop', fl);
  }

  /* ---------- the charge ---------- */
  function stepObjective(f, I, dt) {
    if (M.phase !== 'live' || !f.alive || M.mode === 'range') { f.plant = f.defuse = 0; return; }
    const side = sideOf(f);
    if (side === 'att' && !M.planted && I.use && f.ground && onSite(f.x, f.z)) {
      if (f.plant === 0) emit('plantStart', f); f.plant += dt; f.scoped = 0;
      if (f.plant >= PLANT_T) { f.plant = 0; plantAt(f.x, f.z, f); net({ t: 'pl', x: +f.x.toFixed(2), z: +f.z.toFixed(2) }); }
    } else f.plant = 0;
    if (side === 'def' && M.planted && !M.defused && I.use && f.ground && Math.hypot(f.x - M.planted.x, f.z - M.planted.z) < 1.7) {
      if (f.defuse === 0) emit('defuseStart', f); f.defuse += dt; f.scoped = 0;
      if (f.defuse >= DEFUSE_T) { f.defuse = 0; defuseDone(f); net({ t: 'df' }); }
    } else f.defuse = 0;
  }
  function plantAt(x, z, f) {
    M.planted = { x, z, y: hAt(x, z), t: FUSE_T, beep: 0 }; if (!f.net) f.credits = Math.min(CASH.cap, f.credits + CASH.plant);
    say('CHARGE PLANTED', FOE); emit('planted', f);
  }
  function defuseDone(f) { M.defused = true; emit('defused', f); if (M.host) judge(); }

  /* ---------- rounds and money ---------- */
  // the host decides when a round is over and who took it
  function judge() {
    if (M.phase !== 'live' || M.mode === 'range') return;
    const ai = attIdx(), att = M.fs[ai], def = M.fs[1 - ai];
    if (M.defused) return endRound(1 - ai, 'defuse');
    if (M.planted) { if (M.planted.t <= 0) return endRound(ai, 'boom'); if (!def.alive) return endRound(ai, 'elim_def'); return; }
    if (!att.alive) return endRound(1 - ai, 'elim_att');
    if (!def.alive) return endRound(ai, 'elim_def');
    if (M.t <= 0) return endRound(1 - ai, 'time');
  }
  function endRound(wi, why) {
    if (M.phase === 'end') return;
    M.phase = 'end'; M.t = END_T; M.wins[wi]++; M.last = { wi, why };
    M.fs.forEach((f, i) => { if (f.net) return; const won = i === wi; f.lossRun = won ? 0 : f.lossRun + 1; f.credits = Math.min(CASH.cap, f.credits + (won ? CASH.win : CASH.loss[Math.min(2, f.lossRun - 1)])); });
    if (why === 'boom') emit('boom', M.planted.x, M.planted.z);
    emit('end', wi, why);
    if (M.host) net({ t: 'end', wi, why });
  }
  function startRound(n) {
    M.round = n; M.phase = 'buy'; M.t = BUY_T; M.planted = null; M.defused = false; M.smokes = []; M.walls = []; M.flares = []; M.feed = []; M.say = null; M.deathInfo = null; M.last = null;
    const decider = n === WIN_ROUNDS * 2 - 1;
    M.fs.forEach(f => {
      const side = sideOf(f), sp = SPAWN[side], p = sp[n % sp.length];
      if (!f.alive || pistolRound(n) || decider) { f.guns = { 1: null, 2: 'pip', 3: 'knife' }; f.sh = 0; f.ammo = {}; }
      if (!f.net && n === 5) f.credits = CASH.start; if (!f.net && decider) f.credits = CASH.decider;
      Object.assign(f, { x: p[0], z: p[1], y: 0, vx: 0, vy: 0, vz: 0, hp: 100, alive: true, ground: true, crouch: 0, flash: 0, reveal: 0, heal: null, dash: null, plant: 0, defuse: 0, scoped: 0, reloadT: 0, fireT: 0, spray: 0, burst: null, swing: null, autoReload: 0, ready: false, spent: {}, pitch: 0 });
      f.ab = { q: 1, e: 1 }; for (const s of [1, 2]) if (f.guns[s]) giveAmmo(f, f.guns[s]); f.slot = f.guns[1] ? 1 : 2;
      f.yaw = yawTo(f.x, f.z, side === 'att' ? f.x + 10 : f.x - 10, f.z);
      if (f.bot) f.bot = { diff: f.bot.diff, dummy: f.bot.dummy };
    });
    if (n === 5) say('SIDES SWAPPED'); else if (decider) say('DECIDER');
    emit('round', n);
  }
  const canBuy = () => M.phase === 'buy' || M.mode === 'range';
  // Buying over something you bought this round refunds it; choosing it again sells it back.
  function buy(f, k) {
    if (!canBuy()) return false;
    const G = GUNS[k], A = ARMOR.find(a => a.k === k), sp = f.spent; let ok = false;
    if (G && !G.melee) {
      const s = G.slot, prev = sp[s];
      if (f.guns[s] === k) { if (prev && prev.k === k) { f.credits += G.cost; f.guns[s] = prev.was; if (prev.was) giveAmmo(f, prev.was); delete sp[s]; f.slot = f.guns[1] ? 1 : 2; ok = true; } }
      else { const refund = prev ? GUNS[prev.k].cost : 0; if (f.credits + refund >= G.cost) { f.credits += refund - G.cost; sp[s] = { k, was: prev ? prev.was : f.guns[s] }; f.guns[s] = k; giveAmmo(f, k); f.slot = s; f.scoped = 0; f.reloadT = 0; ok = true; } }
    } else if (A) {
      if (f.sh >= A.sh) { if (sp.sh && sp.sh.k === A.k) { f.credits += A.cost; f.sh = sp.sh.was; delete sp.sh; ok = true; } }
      else { const refund = sp.sh ? ARMOR.find(a => a.k === sp.sh.k).cost : 0; if (f.credits + refund >= A.cost) { f.credits += refund - A.cost; sp.sh = { k: A.k, was: sp.sh ? sp.sh.was : f.sh }; f.sh = A.sh; ok = true; } }
    }
    if (M.mode === 'range') f.credits = CASH.cap;
    emit('buy', f, ok); return ok;
  }
  // closing the armory says you are ready: when both are, the buy phase ends early
  function setReady(f) { if (M.phase !== 'buy' || f.ready) return; f.ready = true; if (!f.net) net({ t: 'rdy' }); }

  /* ---------- a match ---------- */
  // o: { mode, diff, rival: { name }, hostAtt, decHostAtt }
  function startMatch(o) {
    const mode = o.mode, online = mode === 'online', host = !online || MP.isHost(), ops = Object.keys(OPS);
    const A = fighter(mode === 'demo' ? { name: 'Rook', op: pick(ops), bot: { diff: 1 } } : { name: online ? MP.name : 'You', op: CFG.op, local: true });
    const B = fighter(online ? { name: (o.rival && o.rival.name) || 'Rival', op: 'vex', net: true } : { name: pick(BOT_NAMES.filter(n => n !== A.name)), op: pick(ops), bot: { diff: o.diff == null ? 1 : o.diff, dummy: mode === 'range' } });
    const hostAtt = o.hostAtt == null ? (R() < .5 ? 1 : 0) : o.hostAtt, decHostAtt = o.decHostAtt == null ? (R() < .5 ? 1 : 0) : o.decHostAtt;
    M = { mode, online, host, fs: [A, B], wins: [0, 0], round: 0, phase: 'buy', t: 0, time: 0, att0: (hostAtt ? host : !host) ? 0 : 1, decAtt: (decHostAtt ? host : !host) ? 0 : 1,
      planted: null, defused: false, smokes: [], walls: [], flares: [], feed: [], say: null, last: null, over: null, deathInfo: null, hurt: 0, hurtDir: 0, camKick: 0, netT: 0 };
    startRound(1);
    if (mode === 'range') { M.phase = 'live'; M.t = 0; A.credits = CASH.cap; Object.assign(A, { x: 9, z: 5, yaw: yawTo(9, 5, 30, 5) }); placeDummy(B); }
    if (mode === 'demo') { M.t = 1.5; A.credits = B.credits = 4500; }
    return M;
  }
  // the range's target: stands somewhere down the Pier and paces from side to side
  function placeDummy(f) {
    const p = pick([[22, 3], [30, 7], [40, 5], [52, 3], [34, 9], [46, 9]]);
    Object.assign(f, { x: p[0], z: p[1], y: 0, vx: 0, vz: 0, hp: 100, sh: pick([0, 25, 50]), alive: true, yaw: yawTo(p[0], p[1], me().x, me().z), respawn: 0, guns: { 1: null, 2: 'pip', 3: 'knife' }, slot: 2 });
    giveAmmo(f, 'pip'); f.bot = { diff: 0, dummy: true, home: p };
  }
  function matchOver(why) {
    if (M.over) return; const won = M.wins[0] > M.wins[1];
    M.over = { won, why: why || '' }; M.phase = 'end';
    emit('over', won); if (M.host) net({ t: 'over' });
  }
  const NEUTRAL = { mx: 0, mz: 0, walk: false, crouch: false, jump: false, use: false, fire: false };
  function tick(dt) {
    if (!M || M.over) return;
    M.time += dt; if (M.mode !== 'range') M.t -= dt;
    if (M.phase === 'buy' && M.host && M.mode !== 'range') {
      if (M.t > 1.5 && M.fs.every(f => f.ready)) M.t = 1.5;
      if (M.t <= 0) { M.phase = 'live'; M.t = ROUND_T; emit('live'); net({ t: 'live' }); }
    }
    if (M.phase === 'live' && M.planted) { const P = M.planted; P.t -= dt; P.beep -= dt; if (P.beep <= 0) { P.beep = cl(P.t / 12, .12, 1); emit('beep'); } }
    if (M.phase === 'live' && M.host) judge();
    if (M.phase === 'end' && M.host && M.t <= 0) {
      if (M.wins[0] >= WIN_ROUNDS || M.wins[1] >= WIN_ROUNDS) return matchOver();
      startRound(M.round + 1); net({ t: 'rs', n: M.round });
    }
    for (const f of M.fs) {
      if (f.net) { netFollow(f, dt); continue; }
      const I = !f.alive ? NEUTRAL : f.bot ? botThink(f, dt) : readInput(f);
      stepBody(f, I, dt); stepGun(f, dt); stepObjective(f, I, dt);
      if (I.fire && f.alive && (M.phase !== 'buy' || M.mode === 'range')) { const G = gun(f); if (G.auto || !f.semiHeld || (I.rapid && f.fireT < -.07)) fire(f); }
      f.semiHeld = !!I.fire;
      if (M.mode === 'range') { if (f.abT > 0 && (f.abT -= dt) <= 0) f.ab = { q: 1, e: 1 }; if (!f.alive && f.bot && (f.respawn -= dt) <= 0) placeDummy(f); }
    }
    for (const s of M.smokes) { s.t -= dt; s.r = s.t > s.T - .6 ? lp(0, s.R, (s.T - s.t) / .6) : s.t < 1 ? s.R * Math.max(0, s.t) : s.R; } M.smokes = M.smokes.filter(s => s.t > 0);
    for (const w of M.walls) { w.t -= dt; w.grow = Math.min(1, w.grow + dt * 4); } M.walls = M.walls.filter(w => w.t > 0);
    for (const fl of M.flares) { fl.t -= dt; if (fl.t <= 0) popFlare(fl); } M.flares = M.flares.filter(fl => fl.t > 0);
    for (const k of M.feed) k.t += dt; M.feed = M.feed.filter(k => k.t < 6).slice(0, 4);
    if (M.say) { M.say.t += dt; if (M.say.t > 2.6) M.say = null; }
    if (M.deathInfo) M.deathInfo.t += dt;
    M.camKick *= Math.pow(.02, dt); M.hurt = Math.max(0, M.hurt - dt * 1.5);
    netTick(dt);
  }
