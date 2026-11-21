  /* ---------- 40 sim: fighters, movement, shooting, the knife, abilities, the charge, rounds, money ----------
     M is the match. M.fs[0] is always the fighter this device shows (you, or the camera bot in a demo), M.fs[1] the rival.
     A fighter is driven by one of three things: local input, a bot (50-bot), or the network (60-net).
     Modes: 'bot' (you against a bot), 'online', 'range' (practice: endless money, a target that comes back), 'demo'. */
  let M = null;
  let readInput = () => ({ mx: 0, mz: 0, walk: false, sprint: false, crouch: false, jump: false, use: false, fire: false, rapid: false });   // 90-input replaces this
  const BOT_NAMES = ['Rook', 'Kestrel', 'Mercer', 'Harrow', 'Nyx', 'Sable', 'Quill', 'Cinder', 'Wren', 'Onyx', 'Vale', 'Ashby', 'Juno'];
  const WHY = { elim_att: 'Attacker eliminated', elim_def: 'Defender eliminated', time: 'Time ran out', boom: 'Charge detonated', defuse: 'Charge defused', left: 'Rival left the match', dropped: 'Connection lost' };

  function fighter(o) {
    return Object.assign({
      name: '', op: 'vex', local: false, bot: null, net: false, team: 0, key: '0', gone: false,
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, crouch: 0, ground: true, jumpHeld: false,
      hp: 100, sh: 0, alive: true, guns: { 1: null, 2: 'pip', 3: 'knife' }, slot: 2, ammo: {},
      fireT: 0, reloadT: 0, spray: 0, sseed: 0, burst: null, scoped: 0, kick: 0, swing: null, semiHeld: false,
      credits: CASH.start, smokes: 0, throwT: 0, spent: {}, lossRun: 0, ready: false, ab: { q: 0, e: 1 }, ult: 0, abT: 0, orbT: 0,
      flash: 0, reveal: 0, heal: null, dash: null, surge: 0, cloak: 0, daze: 0, snare: 0, guard: 0, od: 0, phase: 0, lock: 0, chan: null, volley: null, plant: 0, defuse: 0, footT: 0, step: 0, walkT: 0, sprinting: false, slide: null, slideCD: 0, crouchHeld: false,
      stat: { k: 0, d: 0, hs: 0, dmg: 0, shots: 0, hits: 0 },
    }, o);
  }
  // teams: on every device your own team is team 0. other(f) is f's nearest enemy, living ones first
  const me = () => M.fs[0];
  const other = f => { let b = null, bd = 1e9; for (const q of M.fs) if (q.team !== f.team && !q.gone) { const d = (q.alive ? 0 : 1e5) + Math.hypot(q.x - f.x, q.z - f.z); if (d < bd) { bd = d; b = q; } } return b || M.fs.find(q => q.team !== f.team) || M.fs[1]; };
  const foe = () => other(M.fs[0]);
  const teamUp = t => M.fs.some(f => f.team === t && f.alive);
  const gun = f => GUNS[f.guns[f.slot]] || GUNS.knife;
  const eyeY = f => f.y + lp(EYE, CEYE, f.crouch);
  // a fighter's position for drawing: between the last two ticks, unless it jumped (a respawn, a Blink)
  const ipos = (f, k) => { const p = f['p' + k]; return p == null || Math.abs(f[k] - p) > 1.5 ? f[k] : lp(p, f[k], tickA); };
  // who attacks: one side for the first half, the other for the second; in overtime the sides swap every round
  const attIdx = () => M.mode === 'range' ? 0 : M.round <= HALF() ? M.att0 : M.round <= 2 * HALF() ? 1 - M.att0 : (otRound(M.round) % 2 ? M.decAtt : 1 - M.decAtt);
  // is the match over at this score? first to WIN_ROUNDS, or in overtime two clear (one clear in sudden death)
  function matchDecided() { const a = M.wins[0], b = M.wins[1], ot = otRound(a + b); if (!ot) return Math.max(a, b) >= WIN_ROUNDS; return Math.abs(a - b) >= 2 || (ot > OT_MAX && a !== b); }
  const sideOf = f => f.team === attIdx() ? 'att' : 'def';
  const pistolRound = n => n === 1 || n === HALF() + 1;
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
    const pen = M && M.phase === 'buy' && M.mode !== 'range' && !f.net ? sideOf(f) : null, held = (x, z) => pen && inZone(pen, f.x, f.z) && !inZone(pen, x, z);   // the spawn barrier
    if (!blocked(f.x + dx, f.z, f.y) && !held(f.x + dx, f.z)) f.x += dx; else f.vx = 0;
    if (!blocked(f.x, f.z + dz, f.y) && !held(f.x, f.z + dz)) f.z += dz; else f.vz = 0;
    const g = groundAt(f.x, f.z, f.y), was = f.ground;
    if (f.y > g + .001 || f.vy > 0) f.ground = false;
    if (f.y <= g) { if (!was && f.vy < -4) emit('land', f); f.y = g; f.vy = 0; f.ground = true; }
    const k = idx(Math.floor(f.x / CS), Math.floor(f.z / CS)), top = k >= 0 && CEIL[k] ? CEIL[k] - 1.85 : 99;   // a roof or lintel overhead
    if (f.y > top) { f.y = top; if (f.vy > 0) f.vy = 0; }
  }
  // one step of a fighter's body from its intent I: { mx, mz (-1..1, how hard and which way), walk, crouch, jump }
  const canSlide = f => f.ground && Math.hypot(f.vx, f.vz) > SPD + .8;   // only a knife run is quick enough
  function stepBody(f, I, dt) {
    if (!f.alive) return;
    const G = gun(f), frozen = f.plant > 0 || f.defuse > 0;   // in the buy phase you move, but only inside your spawn (moveF)
    // there is no sprint: the knife is how you move fast (it is the lightest thing you can hold). Slide: crouch while running
    // that fast on the ground
    const hv = Math.hypot(f.vx, f.vz), crouchTap = I.crouch && !f.crouchHeld; f.crouchHeld = !!I.crouch;
    if (f.slideCD > 0) f.slideCD -= dt;
    if (crouchTap && !f.slide && f.ground && !frozen && f.slideCD <= 0 && canSlide(f)) {
      const k = SLIDE_V / Math.max(hv, .1); f.vx *= k; f.vz *= k; f.slide = { t: SLIDE_T }; f.sprinting = false; emit('slide', f);
    }
    f.sprinting = false;
    f.crouch = cl(f.crouch + (I.crouch || f.slide ? 1 : -1) * dt * 8, 0, 1);
    let sp = (f.sprinting ? SPRINT : f.crouch > .5 ? CSPD : I.walk ? WALK : SPD) * G.spd; if (f.scoped) sp *= G.scope ? .55 : .76;
    sp *= (f.surge > 0 ? 1.3 : 1) * (f.daze > 0 ? .6 : 1) * (f.snare > 0 ? .35 : 1);   // Surge, a Shockwave's daze, a Snare
    if (f.tagT > 0) { sp *= lp(1, f.tagK || 1, cl(f.tagT / .12, 0, 1)); f.tagT -= dt; if (f.tagT <= 0) f.tagK = 1; }   // tagged (eases off over its last moment)
    const s = Math.sin(f.yaw), c = Math.cos(f.yaw); let wx = -s * I.mz + c * I.mx, wz = -c * I.mz - s * I.mx; const L = Math.hypot(wx, wz); if (L > 1) { wx /= L; wz /= L; }
    if (frozen) wx = wz = 0;
    const ck = idx(Math.floor(f.x / CS), Math.floor(f.z / CS)), onIce = f.ground && ck >= 0 && ICE[ck];   // the floor under you: ice has no grip
    if (f.padT > 0) f.padT -= dt;   // thrown by a jump pad: you fly where it sends you
    else if (f.slide) {   // a slide carries its speed and bleeds it off; you can steer it a little, and jump out of it
      f.slide.t -= dt; const dec = Math.exp(-1.25 * dt); f.vx *= dec; f.vz *= dec;
      const v2 = Math.hypot(f.vx, f.vz); if (v2 > .1 && (wx || wz)) { const a = Math.atan2(f.vx, f.vz), b = Math.atan2(wx, wz), turn = cl(angDiff(b, a), -1.6 * dt, 1.6 * dt); f.vx = Math.sin(a + turn) * v2; f.vz = Math.cos(a + turn) * v2; }
      if (f.slide.t <= 0 || v2 < 2.4 || !f.ground && f.vy > 0) { f.slide = null; f.slideCD = SLIDE_CD; }
    } else {
      // head for the wanted velocity at a fixed rate: quickest when braking against your motion (the counter-strafe), slowest in the air.
      // A counter-strafe brakes each axis (sideways, forward) hard to exactly zero without overshooting in that step, so a short tap
      // leaves you still and accurate. Keep holding the key and you carry straight on the other way: no pause at zero, so
      // strafing side to side (A-D-A-D) keeps its speed.
      const rx = c, rz = -s, fx = -s, fz = -c, vR = f.vx * rx + f.vz * rz, vF = f.vx * fx + f.vz * fz;
      const tR = (wx * rx + wz * rz) * sp, tF = (wx * fx + wz * fz) * sp, against = (t, v) => f.ground && t !== 0 && Math.sign(t) === -Math.sign(v) && Math.abs(v) > .05;
      const cR = against(tR, vR), cF = against(tF, vF);
      const tx = tR * rx + tF * fx, tz = tR * rz + tF * fz, ddx = tx - f.vx, ddz = tz - f.vz, dl = Math.hypot(ddx, ddz);
      const rate = (!f.ground ? 6 : cR || cF ? 80 : Math.hypot(tx, tz) < .01 ? 26 : f.sprinting ? 30 : 44) * (onIce ? ICE_GRIP : 1);
      if (dl > 0) { const stp = Math.min(dl, rate * dt); f.vx += ddx / dl * stp; f.vz += ddz / dl * stp; }
      for (const [on, v0, ax, az] of [[cR, vR, rx, rz], [cF, vF, fx, fz]]) {
        if (!on) continue; const v1 = f.vx * ax + f.vz * az;
        if (Math.sign(v1) !== Math.sign(v0)) { f.vx -= v1 * ax; f.vz -= v1 * az; }   // braked through zero this step: stop exactly at zero
      }
    }
    if (f.dash) { f.dash.t -= dt; f.vx = f.dash.dx * 36; f.vz = f.dash.dz * 36; if (f.dash.t <= 0) { f.dash = null; f.vx *= .2; f.vz *= .2; } }
    if (I.jump && !f.jumpHeld && f.ground && !frozen && (f.crouch < .5 || f.slide)) { f.vy = JUMP; f.ground = false; if (f.slide) { f.slide = null; f.slideCD = SLIDE_CD; } emit('jump', f); }
    f.jumpHeld = !!I.jump;
    f.vy -= GRAV * (ck >= 0 && LOWG[ck] ? LOW_G : 1) * dt; f.y += f.vy * dt;   // low gravity: jump three times as high
    moveF(f, f.vx * dt, f.vz * dt);
    stepMech(f, dt, frozen);
    const v = Math.hypot(f.vx, f.vz); f.walkT += v * dt;
    // running is loud: a footstep every stride, which bots hear and the other player's speakers play
    if (f.ground && v > 3.6 && f.crouch < .5 && !(f.cloak > 0)) { f.footT -= dt; if (f.footT <= 0) { f.footT = f.sprinting ? .29 : .36; f.step = f.sprinting ? .7 : .5; emit('step', f); } }
    if (f.step > 0) f.step -= dt;
    if (f.heal) { f.heal.t -= dt; f.hp = Math.min(100, f.hp + 20 * dt); if (f.heal.t <= 0) { f.heal = null; f.hp = Math.round(f.hp); } }
    for (const k of ['flash', 'reveal', 'kick']) if (f[k] > 0) f[k] = Math.max(0, f[k] - dt);
    if (f.swing) { f.swing.t += dt; if (f.swing.t > .7) f.swing = null; }
  }

  /* ---------- shooting ---------- */
  // movement error in degrees: none below 28% of run speed (standing, or the instant a counter-strafe stops you),
  // the walk figure at half speed, the run figure at full speed, the jump figure in the air
  function moveErr(f, G) {
    const A = G.acc, fr = f.od > 0 ? 0 : Math.hypot(f.vx, f.vz) / SPD;   // Overdrive: running never throws your aim
    let e = fr <= .28 ? 0 : fr <= .5 ? lp(0, A.walk, (fr - .28) / .22) : lp(A.walk, A.run, Math.min(1, (fr - .5) / .5));
    if (f.slide && f.ground) e = Math.min(e, lp(A.walk, A.run, .33));   // sliding: steadier than a run (a third of the way from walking to running)
    if (!f.ground) e = Math.max(e, A.jump); return e;
  }
  // the half-angle of the cone the next bullet can leave in, in radians
  function spreadOf(f) {
    const G = gun(f), A = G.acc, sc = G.scope && f.scoped, ad = !G.scope && G.ads && f.scoped;
    const n = Math.max(0, f.spray - A.free), sp = A.inc * n + (A.inc2 ? A.inc2 * Math.max(0, n - A.n2) : 0);   // inc2: a gun that gets wilder after its n2th shot
    let e = (sc ? A.sfs : A.fs) * (ad ? .8 : 1) + Math.min(A.max, sp) * (ad ? .85 : 1) + moveErr(f, G);
    if (f.crouch > .5 && f.ground) e *= .85;
    if (f.daze > 0) e += 2.5;   // dazed by a Shockwave
    return e * D2R;
  }
  // where the spray has pushed the next bullet: up first, then side to side
  function patOf(f, G) {
    const P = G.pat; if (!P) return [0, 0]; const n = Math.max(0, f.spray - G.acc.free);
    const up = P.n2 && n > P.n2 ? P.vk * P.n2 + P.vk2 * (n - P.n2) : P.vk * n;   // vk2: a steeper climb after the n2th shot
    // (the sway starts from the middle, toward a side picked at the start of each spray, so the crosshair never jumps)
    const ads = f.scoped && !G.scope ? .85 : 1;   // aiming down sights steadies the climb and the sway a little
    return [n > P.hs0 ? P.hk * Math.sin((n - P.hs0) * .7) * (f.sseed < Math.PI ? 1 : -1) * D2R * ads : 0, Math.min(P.vmax, up) * D2R * ads];
  }
  const viewDir = (yaw, pitch) => { const cp = Math.cos(pitch); return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp]; };
  // ray against a sphere / an axis-aligned box: the distance, or -1
  function raySphere(o, d, c, r) { const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2], b = ox * d[0] + oy * d[1] + oz * d[2], q = ox * ox + oy * oy + oz * oz - r * r, h = b * b - q; if (h < 0) return -1; const t = -b - Math.sqrt(h); return t > 0 ? t : -1; }
  function rayBox(o, d, mn, mx) { let t0 = 0, t1 = 1e9; for (let a = 0; a < 3; a++) { const inv = 1 / (d[a] || 1e-9); let ta = (mn[a] - o[a]) * inv, tb = (mx[a] - o[a]) * inv; if (ta > tb) { const s = ta; ta = tb; tb = s; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return -1; } return t0; }
  /* where a fighter can be hit, matched to the model as it is posed (measured from the agent models):
     - the head: a sphere that sits where the model's head is. A crouch drops it and pushes it forward, a run or sprint
       leans it into the stride, the aim nods it, a slide lays it back;
     - the body: a box turned with the fighter, shoulder-wide and chest-deep, from the feet to the neck. Below the hips
       is the legs;
     - the arms and the gun held out in front count as body too. */
  function headOf(f) {
    const sl = f.slide ? 1 : 0, cr = f.crouch * (1 - sl), spr = f.sprinting ? 1 : 0, amp = Math.min(1, Math.hypot(f.vx, f.vz) / 3.5) * (spr ? 1.15 : .8) * (1 - sl);
    const up = lp(1.652, 1.221, cr) - .038 * spr - .636 * sl, fw = .207 * cr + .07 * amp + .15 * spr + .07 * f.pitch - .336 * sl;
    return { x: f.x - Math.sin(f.yaw) * fw, y: f.y + up + .02, z: f.z - Math.cos(f.yaw) * fw, up, cr, sl, spr, amp };
  }
  function hitboxes(f) {
    const h = headOf(f), top = f.y + h.up - .15, fc = .19 * h.cr - .34 * h.sl, hd = .23 + .04 * h.cr + .06 * h.amp + .3 * h.sl, ap = f.pitch;
    return { head: [h.x, h.y, h.z], hr: .18, x: f.x, z: f.z, yaw: f.yaw, leg: f.y + lp(.92, .55, h.cr) - .5 * h.sl,
      body: [-.3, f.y, fc - hd, .3, top, fc + hd],
      arms: h.sl ? null : [-.18, top - .32 + Math.min(0, ap) * .3 - .2 * h.spr, .1 + .19 * h.cr, .26, top + .04 + Math.max(0, ap) * .3 - .15 * h.spr, .62 + .19 * h.cr] };
  }
  // a ray against a box in a fighter's own frame (x to its right, z ahead of it): turn the ray into that frame and test there
  function rayFrame(o, d, hb, b) {
    if (!b) return -1; const r0 = Math.cos(hb.yaw), r2 = -Math.sin(hb.yaw), f0 = -Math.sin(hb.yaw), f2 = -Math.cos(hb.yaw), ox = o[0] - hb.x, oz = o[2] - hb.z;
    return rayBox([ox * r0 + oz * r2, o[1], ox * f0 + oz * f2], [d[0] * r0 + d[2] * r2, d[1], d[0] * f0 + d[2] * f2], [b[0], b[1], b[2]], [b[3], b[4], b[5]]);
  }
  // a bullet from f's eyes along d: what it meets first (the world, a Rampart, or the rival)
  function castShot(f, d) {
    const o = [f.x, eyeY(f), f.z]; let dist = rayGrid(o[0], o[1], o[2], d[0], d[1], d[2], 140), hit = null; const n = [rayN[0], rayN[1], rayN[2]];
    for (const w of M.walls) { const t = rayBox(o, d, [w.x0, 0, w.z0], [w.x1, 3 * w.grow, w.z1]); if (t > 0 && t < dist) { dist = t; n[0] = -Math.sign(d[0]) * (w.x1 - w.x0 < 1 ? 1 : 0); n[1] = 0; n[2] = -Math.sign(d[2]) * (w.x1 - w.x0 < 1 ? 0 : 1); } }
    let sentry = null; for (const b of sentryBoxes(f)) { const t = rayBox(o, d, b.mn, b.mx); if (t > 0 && t < dist) { dist = t; sentry = b.s; } }   // an enemy sentry is in the way
    for (const v of M.fs) if (v.team !== f.team && v.alive) {   // whichever part of them the bullet meets first
      const hb = hitboxes(v), th = raySphere(o, d, hb.head, hb.hr), tb = rayFrame(o, d, hb, hb.body), ta = rayFrame(o, d, hb, hb.arms);
      const tbody = tb > 0 && (ta <= 0 || tb <= ta) ? tb : ta, near = th > 0 && (tbody <= 0 || th <= tbody) ? th : tbody;
      if (near > 0 && near < dist) { dist = near; sentry = null; hit = near === th ? { f: v, head: true } : { f: v, head: false, leg: near === tb && o[1] + d[1] * tb < hb.leg }; }
    }
    return { o, d, dist, hit, sentry, n, end: [o[0] + d[0] * dist, o[1] + d[1] * dist, o[2] + d[2] * dist] };
  }
  // pull the trigger: one shot, a burst (the Pip's alternate fire, the Mako aimed down sights), or a knife swing
  function fire(f, alt) {
    const G = gun(f), A = f.ammo[G.k];
    if (!f.alive || f.fireT > 0 || f.reloadT > 0 || f.burst || (M.phase === 'buy' && M.mode !== 'range') || f.plant > 0 || f.defuse > 0) return false;
    if (G.melee) return melee(f, alt === 'heavy');
    if (!A || A.mag <= 0) { if (A && A.res > 0) reload(f); else { f.fireT = .25; emit('dry', f); } return false; }
    if (G.burst && !alt) { f.burst = { n: Math.min(A.mag, G.burst), gap: G.bgap, t: 0, err: G.berr || 0 }; f.fireT = 60 / G.rpm; stepBurst(f, 0); return true; }   // burst guns: every pull is a burst
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
      if (S.hit && !f.net) { landed = true; damage(S.hit.f, dmgAt(G, S.dist, S.hit.head ? 1 : S.hit.leg ? 3 : 2), f, S.hit.head, G.k, S.hit.leg); }
      else if (S.sentry && !f.net) hurtSentry(S.sentry, dmgAt(G, S.dist, 2), false);
      else if (!S.hit && !f.net && BRKS.length) { const e = S.end, k = idx(Math.floor((e[0] + S.d[0] * .06) / CS), Math.floor((e[2] + S.d[2] * .06) / CS)); if (k >= 0 && BRKX[k] >= 0) hitWall(BRKX[k], dmgAt(G, S.dist, 2), f); }   // a breakable wall
    }
    if (landed) f.stat.hits++;
    f.spray += 1; f.sprayFrom = 0; f.kick = .08; f.cloak = 0; f.phase = 0; if (f === me()) M.camKick = Math.min(M.camKick + G.punch * .42 * D2R * (f.scoped && G.scope ? .4 : 1), 1.6 * D2R);
    if (!f.net) net({ t: 'sh', a: r3(y0), b: r3(p0), f: f.key });
    if (A.mag === 0 && A.res > 0) f.autoReload = .26;
  }
  // the knife: a light slash (50, 75 to the head) or a heavy stab (75, 150 in the back). A small fan of rays, so a swing
  // that is nearly on target still connects; it reaches 2.4 m (2 m for the stab).
  function melee(f, heavy) {
    f.fireT = heavy ? 1 : .42; f.swingSide = -(f.swingSide || 1); f.swing = { t: 0, heavy, side: f.swingSide };
    const range = heavy ? 2 : 2.4; let S = null;
    for (const [dy, dp] of [[0, 0], [.08, 0], [-.08, 0], [0, .07], [0, -.09], [.16, 0], [-.16, 0], [0, -.18]]) { const s2 = castShot(f, viewDir(f.yaw + dy, f.pitch + dp)); if (s2.hit && s2.dist <= range) { S = s2; break; } }
    emit('melee', f, heavy, S);
    if (S && !f.net) { const e = S.hit.f, back = Math.abs(angDiff(e.yaw, f.yaw)) < 1.05; damage(e, heavy ? (back ? 150 : 75) : (S.hit.head ? 75 : 50), f, S.hit.head || (heavy && back), 'knife'); }
    else if (!S && !f.net && BRKS.length) {   // a breakable wall in reach takes the blade: a few swings and it is through
      // (the same fan as for a person, and a level swing too: looking a little down at a wall still connects, not the floor)
      for (const [dy, dp] of [[0, 0], [0, -f.pitch], [.08, 0], [-.08, 0], [0, .07], [0, -.09], [.16, 0], [-.16, 0]]) {
        const W = castShot(f, viewDir(f.yaw + dy, f.pitch + dp)); if (W.hit || W.sentry || W.dist > range + .3) continue;
        const e = W.end, k = idx(Math.floor((e[0] + W.d[0] * .06) / CS), Math.floor((e[2] + W.d[2] * .06) / CS)); if (k >= 0 && BRKX[k] >= 0) { hitWall(BRKX[k], heavy ? 120 : 70, f); emit('wallCut', f, heavy, W, BRKX[k]); break; } } }
    if (!f.net) net({ t: 'kn', h: heavy ? 1 : 0, f: f.key });
    return true;
  }
  function reload(f) { const G = gun(f), A = f.ammo[G.k]; if (!A || f.reloadT > 0 || A.mag >= G.mag || A.res <= 0 || !f.alive) return; f.reloadT = G.rel; f.scoped = 0; f.burst = null; emit('reload', f); }
  function stepGun(f, dt) {
    const G = gun(f);
    if (f.fireT > -1) f.fireT -= dt;   // below zero it counts how long the trigger has rested
    stepBurst(f, dt);
    if (f.autoReload > 0 && (f.autoReload -= dt) <= 0 && f.alive && !f.burst) reload(f);
    // the spray settles once the trigger has rested a moment: from wherever it got to (its worst, or a long spray's climb
    // and sway) to nothing in 'recov' seconds, so the crosshair glides home at the same pace however long you held it
    settleSpray(f, G, dt);
    if (f.reloadT > 0) { f.reloadT -= dt; if (f.reloadT <= 0) { const A = f.ammo[G.k], n = Math.min(G.mag - A.mag, A.res); A.mag += n; if (M.mode !== 'range') A.res -= n; f.spray = 0; } }
  }
  function settleSpray(f, G, dt) {
    if (f.fireT < -.05 && !f.burst && f.spray > 0) { const from = f.sprayFrom || (f.sprayFrom = f.spray);
      f.spray = Math.max(0, f.spray - dt * (f.surge > 0 ? 2 : 1) * Math.max(from, G.acc.free + 1 + (G.acc.inc ? G.acc.max / G.acc.inc : 4)) / G.acc.recov); if (!f.spray) f.sprayFrom = 0; }
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
  function damage(v, dmg, by, head, wk, leg) {
    if (!v.alive || M.phase === 'end') return;
    if (v.net) { net({ t: 'hit', d: dmg, h: head ? 1 : 0, l: leg ? 1 : undefined, w: wk, v: v.key, f: by.key }); by.stat.dmg += Math.min(dmg, v.hp + v.sh); emit('hurt', v, by, dmg, head, leg); return; }
    applyDamage(v, dmg, by, head, wk, leg);
  }
  function applyDamage(v, dmg, by, head, wk, leg) {
    if (!v.alive || M.phase === 'end') return;
    if (v.guard > 0) dmg *= .5;   // Bulwark
    // tagged: a bullet (or the knife) that lands slows you for a moment, harder from the heavy hitters, so running out into
    // fire is punished and the one holding the angle gets the next shot
    { const TG = GUNS[wk]; if (TG) { v.tagT = .32; v.tagK = Math.min(v.tagT > 0 && v.tagK ? v.tagK : 1, TAGK[TG.cat] || .6); } }
    const real = Math.min(dmg, v.hp + v.sh), soak = Math.min(v.sh, dmg); v.sh -= soak; v.hp -= dmg - soak; if (!by.net) by.stat.dmg += real;
    if (v === me()) { M.hurt = 1; M.hurtDir = Math.atan2(by.x - v.x, by.z - v.z); }
    if (v.bot) v.bot.hitBy = { x: by.x, z: by.z, t: M.time };
    emit('hurt', v, by, dmg, head, leg);
    if (v.hp <= 0) { v.hp = 0; die(v, by, head, wk); }
  }
  on('hurt', (v, by, dmg, head, leg) => { if (!M || !v || !by || v === by) return; const L = M.dlog || (M.dlog = {}), r = L[by.key + '>' + v.key] || (L[by.key + '>' + v.key] = { d: 0, n: 0, h: 0, l: 0 }); r.d += Math.min(dmg, 150); r.n++; if (head) r.h++; else if (leg) r.l++; });
  /* ---------- the match's numbers ----------
     A combat score: damage, 150 a kill, 50 more for each extra kill in the same round and for the round's first kill, 25 a
     plant or defuse, averaged over the rounds played. Also first kills, and the round's big moments: an ace (one fighter takes
     a whole team of three or more in a round) and a clutch (the last one standing against two or more, who wins the round). */
  const roundsPlayed = () => M ? Math.max(1, M.wins[0] + M.wins[1] + (M.phase === 'end' || M.over ? 0 : 1)) : 1;
  const csOf = f => { const s = f.stat; return Math.round(((s.dmg | 0) + 150 * s.k + (s.mb | 0) + 50 * (s.fk | 0) + 25 * ((s.pl | 0) + (s.df | 0))) / roundsPlayed()); };
  on('kill', (v, by, head, wk) => {
    if (!M || !by || !v || v === by || by.team === v.team || M.mode === 'range') return; const s = by.stat;
    s.rk = (s.rk || 0) + 1; if (s.rk > 1) s.mb = (s.mb || 0) + 50; if (s.rk === 3) s.mk = (s.mk || 0) + 1;   // (mk: rounds with three kills)
    { const c = GUNS[wk] ? GUNS[wk].cat : 'Utility'; s.cat = s.cat || {}; s.cat[c] = (s.cat[c] || 0) + 1; }   // kills by kind of weapon, for the challenges if (!M.fk) { M.fk = by.key; s.fk = (s.fk || 0) + 1; emit('firstKill', by, v); }
    const foes = M.fs.filter(q => q.team === v.team && !q.gone); if (foes.length >= 3 && s.rk >= foes.length && foes.every(q => !q.alive)) emit('ace', by);
    if (!M.clutch) for (const t of [0, 1]) { const up = M.fs.filter(q => q.team === t && q.alive), them = M.fs.filter(q => q.team !== t && q.alive); if (up.length === 1 && them.length >= 2) M.clutch = { key: up[0].key, team: t, vs: them.length }; }
  });
  on('planted', f => { if (f && f.stat) f.stat.pl = (f.stat.pl || 0) + 1; }); on('defused', f => { if (f && f.stat) f.stat.df = (f.stat.df || 0) + 1; });
  // Nova lives on momentum: every kill fills one Surge slot back up (to the most she can carry). Run on the killer's own
  // device: offline that is where the kill happens; online the kill is worked out on the victim's and this runs when word arrives
  function novaKill(by, v) { if (by && !by.net && v && by.team !== v.team && by.op === 'nova' && M.mode !== 'range' && (by.ab.q | 0) < OPS.nova.q.max) { by.ab.q = (by.ab.q | 0) + 1; emit('novaRefund', by); } }
  function die(v, by, head, wk) {
    if (!v.alive) return;
    v.alive = false; v.plant = v.defuse = 0; v.scoped = 0; v.burst = null; v.chan = null; v.volley = null; v.stat.d++; by.stat.k++; if (head) by.stat.hs++;
    ultGain(v, 1); if (by.team !== v.team) ultGain(by, 1);
    if (!by.net && by.team !== v.team) by.credits = Math.min(CASH.cap, by.credits + CASH.kill);
    // Nova lives on momentum: every kill hands back one Surge (up to the most she can carry)
    novaKill(by, v);
    M.feed.unshift({ a: by.name, b: v.name, w: GUNS[wk] ? GUNS[wk].n : wk, head, t: 0, mine: by === me() });
    if (v === me()) M.deathInfo = { by: by.name, key: by.key, op: by.op, w: GUNS[wk] ? GUNS[wk].n : wk, head, hp: Math.ceil(by.hp), sh: by.sh, yaw: yawTo(v.x, v.z, by.x, by.z), at: [v.x, v.y, v.z], kat: [by.x, by.y, by.z], t: 0 };
    emit('kill', v, by, head, wk);
    if (!v.net) net({ t: 'dead', h: head ? 1 : 0, w: wk, f: v.key, by: by.key });
    if (!v.net && M.mode !== 'range') { if (!dropGun(v, 1, true)) dropGun(v, 2, true); if (carries(v)) setCharge(null, v.x, v.z, false, v); }   // what they carried falls where they fall
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
    if (smoke && mechOf() === 'grass') for (let q = 1.4; q < t - 1.4; q += .45) { const y = ay + d[1] * q, k = idx(Math.floor((ax + d[0] * q) / CS), Math.floor((az + d[2] * q) / CS)); if (k >= 0 && GRASS[k] && y < GRASS_H) { t = q; break; } }   // tall grass hides; bullets go through
    return t;
  }
  // a clear line from a fighter's eye to a point (no smoke or cloak rules: for markers, not for spotting)
  function canSeePt(a, x, y, z) { const ey = eyeY(a), dx = x - a.x, dy = y - ey, dz = z - a.z, L = Math.hypot(dx, dy, dz); return L < .3 || rayGrid(a.x, ey, a.z, dx / L, dy / L, dz / L, L) >= L - .3; }
  function canSee(a, b) {
    if (a.flash > .5) return false; const ea = eyeY(a), d = Math.hypot(b.x - a.x, b.z - a.z);
    if (b.phase > 0 && !(b.kick > 0)) return false;   // Phase: unseen even up close
    if (b.cloak > 0 && d > 5 && !(b.kick > 0)) return false;   // Shroud
    if (M.storm > .05 && d > lp(200, STORM_SIGHT, M.storm)) return false;   // a sandstorm: nobody sees far
    for (const hy of [eyeY(b) - .05, b.y + .9]) { const L = Math.hypot(d, hy - ea); if (los(a.x, ea, a.z, b.x, hy, b.z) >= L - .25) return true; }
    return false;
  }

  /* ---------- abilities: Q bought by the charge, E free every round, X the ultimate ---------- */
  const hasAb = (f, k) => k === 'x' ? f.ult >= ultCost(f) : (f.ab[k] | 0) > 0;
  function spendAb(f, k) { if (k === 'x') { f.ult = 0; emit('ultUsed', f); } else f.ab[k] = Math.max(0, (f.ab[k] | 0) - 1); }
  function ultGain(f, n) { if (!M || M.mode === 'range' || !f || !OPS[f.op]) return; const c = ultCost(f), was = f.ult | 0; f.ult = Math.min(c, was + n); if (was < c && f.ult >= c) emit('ultReady', f); }
  function ability(f, k) {
    if (!f.alive || M.phase !== 'live' || !hasAb(f, k) || f.plant > 0 || f.defuse > 0 || f.lock > 0 || f.chan) return false;
    const d = viewDir(f.yaw, f.pitch), key = f.op + k, S = castShot(f, d); let data = {};
    if (key === 'vexq') { let dx = f.vx, dz = f.vz; const L = Math.hypot(dx, dz); if (L < .5) { dx = -Math.sin(f.yaw); dz = -Math.cos(f.yaw); } else { dx /= L; dz /= L; } data = { dx, dz }; }
    if (key === 'vexe') { const dd = Math.max(1, Math.min(S.hit ? 24 : S.dist, 24) - .6); data = { x: f.x + d[0] * dd, z: f.z + d[2] * dd }; }
    if (key === 'irise') { const dd = Math.max(.5, Math.min((S.hit ? 12 : S.dist) - .6, 12)); data = { x: f.x + d[0] * dd, y: eyeY(f) + d[1] * dd, z: f.z + d[2] * dd }; }
    if (key === 'bastionq') { const fx = -Math.sin(f.yaw), fz = -Math.cos(f.yaw); data = { x: f.x + fx * 2.6, z: f.z + fz * 2.6, ax: Math.abs(fx) > Math.abs(fz) ? 1 : 0 }; }
    if (k === 'x' || !['vex', 'iris', 'bastion'].includes(f.op)) data = kitAim(f, key, d, S);
    spendAb(f, k); if (M.mode === 'range') f.abT = 4;
    applyAbility(f, k, data); net({ t: 'ab', k, d: data, f: f.key });
    return true;
  }
  // the effect itself, the same whether it was your key press, a bot's choice, or a message from the other player
  function applyAbility(f, k, d) {
    const key = f.op + k;
    if (key === 'vexq' && !f.net) f.dash = { t: .17, dx: d.dx, dz: d.dz };
    if (key === 'vexe') { const s = { x: d.x, z: d.z, y: hAt(d.x, d.z) > 2 ? 0 : hAt(d.x, d.z), r: 0, R: 3.8, t: 12, T: 12 }; M.smokes.push(s); emit('smoke', s); }
    if (key === 'irisq') { for (const q of M.fs) if (q.team !== f.team) q.reveal = 2.2; if (me().team !== f.team) say('YOU ARE REVEALED', WARN); else if (f === me()) say(M.fs.length > 2 ? 'RIVALS REVEALED' : 'RIVAL REVEALED', YOU); }
    if (key === 'irise') { const fl = { x: d.x, y: d.y, z: d.z, t: .55, by: f }; M.flares.push(fl); emit('flare', fl); }
    if (key === 'bastionq') { const w = d.ax ? { x0: d.x - .3, x1: d.x + .3, z0: d.z - 2.6, z1: d.z + 2.6 } : { x0: d.x - 2.6, x1: d.x + 2.6, z0: d.z - .3, z1: d.z + .3 }; w.t = 12; w.grow = 0; M.walls.push(w); emit('wall', w); }
    if (key === 'bastione') f.heal = { t: 3 };
    kitApply(f, key, d);
    f.stat.ab = (f.stat.ab || 0) + 1; emit('ability', f, k);
  }
  /* ---------- pings: mark where you are looking for your team (middle click or J); it shows in the world and on the minimap ---------- */
  function ping(f, remote, at) {
    if (!M || !f || (!remote && (!f.alive || (f.pingCD || 0) > M.time))) return false;
    let p = at; if (!p) { const S = castShot(f, viewDir(f.yaw, f.pitch)), d = Math.min(S.dist, 60) - .15; p = { x: f.x + S.d[0] * d, y: eyeY(f) + S.d[1] * d, z: f.z + S.d[2] * d }; }
    if (!remote) f.pingCD = M.time + .6;
    M.pings = (M.pings || []).filter(q => q.k !== f.key && M.time - q.t0 < 4); const pg = { x: p.x, y: p.y, z: p.z, t0: M.time, k: f.key, team: f.team, name: f.name, foe: false };
    M.pings.push(pg); emit('ping', pg, f); if (!remote) net({ t: 'pg', x: r2(p.x), y: r2(p.y), z: r2(p.z), f: f.key }); return true;
  }
  /* ---------- smoke grenades ---------- */
  // thrown from the eyes along the view with a little lift; online, both devices fly the same throw and pop the same cloud
  function throwNade(f) {
    if (!f.alive || !(M.phase === 'live' || M.mode === 'range') || !(f.smokes > 0) || f.plant > 0 || f.defuse > 0 || f.throwT > 0) return false;
    if (M.mode !== 'range') f.smokes--; f.throwT = .6;
    const d = viewDir(f.yaw, f.pitch), e = eyeY(f), n = { x: f.x + d[0] * .45, y: e - .1 + d[1] * .45, z: f.z + d[2] * .45, vx: d[0] * 14 + f.vx * .5, vy: d[1] * 14 + 2.4, vz: d[2] * 14 + f.vz * .5 };
    addNade(n); net({ t: 'nd', f: f.key, x: n.x, y: n.y, z: n.z, vx: n.vx, vy: n.vy, vz: n.vz }); emit('throw', f); return true;
  }
  function lobNade(f, tx, tz) {
    if (!f.alive || M.phase !== 'live' || !(f.smokes > 0) || f.throwT > 0) return false;
    f.smokes--; f.throwT = .6; const y0 = eyeY(f) - .1, dx = tx - f.x, dz = tz - f.z, d = Math.hypot(dx, dz), T = cl(d / 13, .45, 1.1), ty = hAt(tx, tz) + .1;
    const n = { x: f.x, y: y0, z: f.z, vx: dx / T, vy: (ty - y0 + 9 * T * T) / T, vz: dz / T };
    f.yaw = yawTo(f.x, f.z, tx, tz); addNade(n); net({ t: 'nd', f: f.key, x: n.x, y: n.y, z: n.z, vx: n.vx, vy: n.vy, vz: n.vz }); emit('throw', f); return true;
  }
  function addNade(n) { M.nades.push(Object.assign({ t: 0, rest: 0, spin: 0 }, n)); }
  function stepNades(dt) {
    for (const n of M.nades) {
      n.t += dt; const h = dt / 4;
      for (let s = 0; s < 4; s++) {
        n.vy -= 18 * h; const mx = n.vx * h, my = n.vy * h, mz = n.vz * h, L = Math.hypot(mx, my, mz);
        if (L > 1e-6) {
          const hit = rayGrid(n.x, n.y, n.z, mx / L, my / L, mz / L, L + .06);
          if (hit < L + .06) {   // bounce off whatever it met, losing most of its speed
            const nx = rayN[0], ny = rayN[1], nz = rayN[2], dv = n.vx * nx + n.vy * ny + n.vz * nz, k = Math.max(0, hit - .06) / L;
            n.x += mx * k; n.y += my * k; n.z += mz * k;
            n.vx = (n.vx - 2 * dv * nx) * .45; n.vy = (n.vy - 2 * dv * ny) * .38; n.vz = (n.vz - 2 * dv * nz) * .45;
            if (ny > .5 && Math.abs(n.vy) < 1.2) { n.vy = 0; n.vx *= .7; n.vz *= .7; }
            if (Math.abs(dv) > 2.5) emit('nadeBounce', n);
            continue;
          }
          n.x += mx; n.y += my; n.z += mz;
        }
        const g = hAt(n.x, n.z); if (n.y < g + .05) { n.y = g + .05; if (n.vy < 0) n.vy = Math.abs(n.vy) < 1.2 ? 0 : -n.vy * .38; n.vx *= .8; n.vz *= .8; }
      }
      n.spin += dt * Math.hypot(n.vx, n.vz) * 3;
      if (Math.hypot(n.vx, n.vy, n.vz) < .4) n.rest += dt;
      if (n.t > NADE.fuse || n.rest > .3) { n.done = true; const s = { x: n.x, z: n.z, y: Math.max(0, n.y - .1), r: 0, R: NADE.R, t: NADE.T, T: NADE.T, grey: 1 }; M.smokes.push(s); emit('smoke', s); emit('nadePop', s); }
    }
    if (M.nades.length) M.nades = M.nades.filter(n => !n.done);
  }
  function popFlare(fl) {
    for (const f of M.fs) {
      if (!f.alive || f.net) continue; const ex = f.x, ey = eyeY(f), ez = f.z, dx = fl.x - ex, dy = fl.y - ey, dz = fl.z - ez, L = Math.hypot(dx, dy, dz) || .01;
      if (L > 26 || los(ex, ey, ez, fl.x, fl.y, fl.z) < L - .3) continue;
      const v = viewDir(f.yaw, f.pitch), dot = (v[0] * dx + v[1] * dy + v[2] * dz) / L; f.flash = Math.max(f.flash, dot > .5 ? 2.4 : dot > 0 ? 1.2 : .35);
    }
    emit('flarePop', fl);
  }

  /* ---------- the map's mechanic, under a fighter's feet ---------- */
  // a belt carries you; a teleporter pad puts you at its exit; a jump pad throws you onto the ledge it points at
  function stepMech(f, dt, frozen) {
    if (f.tpCD > 0) f.tpCD -= dt; if (f.padCD > 0) f.padCD -= dt;
    let k = idx(Math.floor(f.x / CS), Math.floor(f.z / CS)); if (k < 0 || !f.ground || frozen) return;
    if (BELT[k]) { const bd = BELTS_D[BELT[k] - 1]; moveF(f, bd[0] * BELT_V * dt, bd[1] * BELT_V * dt); k = idx(Math.floor(f.x / CS), Math.floor(f.z / CS)); if (k < 0) return; }
    if (TPX[k] >= 0 && !(f.tpCD > 0)) {
      const t = TPS[TPX[k]], from = [f.x, f.z]; f.x = t.b[0]; f.z = t.b[1]; f.y = hAt(f.x, f.z); f.vy = 0; f.tpCD = .9; f.slide = null;
      emit('tp', f, from, t.b); f.step = 1.2; return;   // loud at both ends
    }
    if (PADX[k] >= 0 && !(f.padCD > 0)) {
      const t0 = PADS[PADX[k]], lx = t0.b[0] - f.x, lz = t0.b[1] - f.z, sp = Math.hypot(f.vx, f.vz);
      if (sp > 1.5 && (f.vx * lx + f.vz * lz) / (sp * (Math.hypot(lx, lz) || 1)) < -.2) return;   // a pad throws you only if you step onto it toward where it points (or stand on it)
      const t = t0, g = GRAV * (LOWG[k] ? LOW_G : 1), dh = t.h - f.y, tl = (PAD_VY + Math.sqrt(Math.max(0, PAD_VY * PAD_VY - 2 * g * dh))) / g;
      f.vy = PAD_VY; f.vx = (t.b[0] - f.x) / tl; f.vz = (t.b[1] - f.z) / tl; f.ground = false; f.padT = tl * .95; f.padCD = .5; f.slide = null; f.sprinting = false; emit('pad', f, [f.x, f.z], t.b);
    }
  }
  // gates: stand at a switch and press the use key (F) to shut the gate into a wall, or open it again. A gate will not
  // close on anyone standing in it.
  function gateNear(f) { for (let g = 0; g < GATES.length; g++) for (const p of GATES[g].sw) if (Math.hypot(p[0] - f.x, p[1] - f.z) < 1.8) return g; return -1; }
  function toggleGate(g, by, remote) {
    const G = GATES[g]; if (!G) return false; const shut = G.open;
    if (shut) for (const q of M.fs) if (q.alive && G.cells.some(k => Math.abs(q.x - ((k % GW) + .5) * CS) < CS / 2 + RAD && Math.abs(q.z - (Math.floor(k / GW) + .5) * CS) < CS / 2 + RAD)) { if (!remote) emit('gateJam', g, by); return false; }
    setGate(g, !shut); emit('gate', g, !shut, by); if (!remote && by && !by.net) net({ t: 'gate', g, o: shut ? 0 : 1, f: by.key }); return true;
  }
  // a breakable wall takes the damage of every bullet that hits it; when it falls, it is open ground for the round
  function hitWall(b, dmg, by, remote) {
    const B = BRKS[b]; if (!B || B.hp <= 0) return; B.hp -= dmg; emit('wallHit', b, dmg);
    if (!remote && by && !by.net) net({ t: 'brk', b, d: Math.round(dmg), f: by.key });
    if (B.hp <= 0) { setWall(b, false); emit('wallDown', b); }
  }
  // the map's clock (from the start of the live phase): steam vents puff in turn, a sandstorm blows through now and then
  function stepMapClock(dt) {
    const live = M.phase === 'live', tr = live ? roundT() - M.t : -1;
    if (VENTS.length) { M.vent = M.vent || []; VENTS.forEach((v, n) => { const on = live && (tr + n * VENT_GAP) % VENT_EVERY < VENT_ON; if (on && !M.vent[n]) { const sm = { x: v[0], z: v[1], y: 0, r: 0, R: 2.9, t: VENT_ON, T: VENT_ON, steam: 1 }; M.smokes.push(sm); emit('smoke', sm); emit('vent', n); } M.vent[n] = on; }); }
    if (mechOf() === 'storm') { const ph = live ? (tr + STORM_SHIFT) % STORM_EVERY : 99, on = ph >= STORM_AT && ph < STORM_AT + STORM_LEN; M.storm = cl((M.storm || 0) + (on ? dt / 2.5 : -dt / 2), 0, 1); if (on && !M.stormOn) emit('storm', true); if (!on && M.stormOn) emit('storm', false); M.stormOn = on; }
    else M.storm = 0;
  }
  /* ---------- the charge ---------- */
  function stepObjective(f, I, dt) {
    const press = I.use && !f.useHeld; let gated = false;
    if (press && GATES.length && f.alive && !f.plant && !f.defuse) { const g = gateNear(f); if (g >= 0) { toggleGate(g, f); gated = true; } }   // a gate's switch
    f.useHeld = !!I.use;
    if (stepLoot(f, I, press && !gated && !(f.plant > 0) && !(f.defuse > 0))) f.useLock = true;   // F swapped a gun: that press plants nothing
    if (f.useLock) { if (!I.use) f.useLock = false; else I = Object.assign({}, I, { use: false }); }
    if (M.phase !== 'live' || !f.alive || M.mode === 'range') { f.plant = f.defuse = 0; f.orbT = 0; return; }
    // an ultimate orb: stand over it and hold F for a second
    const orb = M.orbs && !f.net && I.use && !(f.plant > 0) && !(f.defuse > 0) ? M.orbs.find(o => !o.taken && Math.hypot(o.x - f.x, o.z - f.z) < ORB.r) : null;
    if (orb) { f.orbT += dt; if (f.orbT >= ORB.take) { f.orbT = 0; takeOrb(orb.i, f); net({ t: 'orb', i: orb.i, f: f.key }); } } else f.orbT = 0;
    const side = sideOf(f);
    if (side === 'att' && !M.planted && I.use && f.ground && onSite(f.x, f.z) && (carries(f) || !M.charge)) {
      if (f.plant === 0) emit('plantStart', f); f.plant += dt; f.scoped = 0;
      if (f.plant >= PLANT_T) { f.plant = 0; plantAt(f.x, f.z, f); net({ t: 'pl', x: +f.x.toFixed(2), z: +f.z.toFixed(2), f: f.key }); }
    } else f.plant = 0;
    if (side === 'def' && M.planted && !M.defused && I.use && f.ground && Math.hypot(f.x - M.planted.x, f.z - M.planted.z) < 1.7) {
      if (f.defuse === 0) { emit('defuseStart', f); if (M.planted.half) f.defuse = DEFUSE_T / 2; } f.defuse += dt; f.scoped = 0;
      // halfway is a checkpoint: let go (or get pushed off) after it, and the next defuse picks up from half
      if (f.defuse >= DEFUSE_T / 2 && !M.planted.half) { M.planted.half = true; emit('defuseHalf', f); net({ t: 'dh', f: f.key }); }
      if (f.defuse >= DEFUSE_T) { f.defuse = 0; defuseDone(f); net({ t: 'df', f: f.key }); }
    } else f.defuse = 0;
  }
  function plantAt(x, z, f) {
    M.planted = { x, z, y: hAt(x, z), t: FUSE_T, beep: 0, s: Math.max(0, siteAt(x, z)), by: f.key }; M.charge = null; if (!f.net) f.credits = Math.min(CASH.cap, f.credits + CASH.plant);
    emit('planted', f); ultGain(f, 1);
  }
  function takeOrb(i, f) { const o = M.orbs && M.orbs[i]; if (!o || o.taken) return; o.taken = true; ultGain(f, 1); emit('orb', o, f); if (f === me()) say('ULTIMATE POINT', OPS[f.op].col); }
  function defuseDone(f) { M.defused = true; emit('defused', f); ultGain(f, 1); if (M.host) judge(); }

  /* ---------- guns on the floor, and the one charge the attackers share ----------
     A fighter who dies drops the gun they had (their main gun, or a sidearm better than the Pip). Anyone can drop the gun in
     their hand (T) for a teammate. Walking
     over a gun picks it up if that slot is free; F swaps it for the one you have. Bots take a better gun when they pass one.
     The charge: one attacker carries it (chosen in the buy phase, and passed on in the armory or by dropping it with H).
     A carrier who dies drops it; an attacker who walks over it picks it up; only the carrier can plant.
     Online, the device that runs a fighter decides what it drops and picks up, and tells the others. */
  const LOOT_R = 1.15, LOOK_R = 2.4;   // walk over a gun to take it into an empty slot; look at one in reach and press F to take it
  const carries = f => !!(M && M.charge && M.charge.k === f.key);
  const carrier = () => M && M.charge && M.charge.k ? M.byKey[M.charge.k] || null : null;
  function addLoot(d) { M.loot = M.loot || []; if (M.loot.some(q => q.id === d.id)) return null; d.y = hAt(d.x, d.z); d.at = M.time; M.loot.push(d); emit('loot', d); return d; }
  // put a gun on the floor at x, z (from fighter f, who dropped or bought it)
  // (fo: the teammate it was bought for, who alone may take it for the first few seconds)
  function lootAt(f, k, x, z, mag, res, fo) {
    const G = GUNS[k]; if (!G || G.melee) return null; if (solidAt(x, z, f.y + .5)) { x = f.x; z = f.z; }
    M.lootN = (M.lootN || 0) + 1; const d = addLoot({ id: f.key + '.' + M.round + '.' + M.lootN, k, x, z, m: mag != null ? mag : G.mag, r: res != null ? res : G.res, by: f.key, fo: fo || '' });
    if (d && !f.net) net({ t: 'dp', id: d.id, k, x: r2(d.x), z: r2(d.z), m: d.m, r: d.r, fo: d.fo || undefined, f: f.key }); return d;
  }
  // drop the gun in a slot (the Pip and the knife stay with you): thrown a step ahead, or where you fall
  function dropGun(f, slot, dead, at) {   // (at: where it goes instead, e.g. the spot of the gun you swapped it for)
    const k = f.guns[slot]; if (!k || slot === 3 || (slot === 2 && k === 'pip')) return null;
    const A = f.ammo[k] || {}, fx = -Math.sin(f.yaw), fz = -Math.cos(f.yaw), far = dead ? .15 : 1.25;
    f.guns[slot] = slot === 2 ? 'pip' : null; if (slot === 2) giveAmmo(f, 'pip'); delete f.spent[slot];   // a gun you dropped is not yours to sell back
    if (f.slot === slot) { f.slot = f.guns[1] ? 1 : 2; f.reloadT = 0; f.scoped = 0; f.burst = null; f.spray = 0; }
    if (!dead) emit('swap', f);
    return at ? lootAt(f, k, at.x, at.z, A.mag, A.res) : lootAt(f, k, f.x + fx * far, f.z + fz * far, A.mag, A.res);
  }
  // T: the gun in your hand
  function dropHeld(f) { if (!f.alive || f.plant > 0 || f.defuse > 0 || M.mode === 'range' || M.over) return false; return !!dropGun(f, f.slot, false); }
  function takeLoot(f, d, remote) {
    const G = GUNS[d.k]; if (!G || !M.loot) return; M.loot = M.loot.filter(q => q.id !== d.id); const s = G.slot;
    if (!remote) { const have = f.guns[s]; if (have && !(s === 2 && have === 'pip')) dropGun(f, s, false, d); }   // a swap: the one you had goes down where this one lay
    f.guns[s] = d.k; f.ammo[d.k] = { mag: d.m, res: d.r }; delete f.spent[s];
    if (!remote) { f.slot = s; f.reloadT = 0; f.scoped = 0; f.burst = null; f.spray = 0; f.fireT = Math.max(f.fireT, G.equip * .7); }
    emit('pickup', f, d); if (!remote) net({ t: 'pk', id: d.id, f: f.key });
  }
  // the charge changes hands: f carries it now, or (f null) it lies on the floor at x, z
  // (by: the fighter on this device that made it happen, named in the message so the others know who sent it)
  function setCharge(f, x, z, remote, by) {
    M.charge = f ? { k: f.key, at: M.time } : { k: '', x, z, y: hAt(x, z), at: M.time };
    if (!f && M.phase === 'live') M.chargePing = { t0: M.time, x, z };
    emit('charge', f, remote); if (!remote) net({ t: 'cc', k: f ? f.key : '', x: r2(x || 0), z: r2(z || 0), f: (by || f || me()).key });
  }
  // H: put the charge down for a teammate (a step ahead of you)
  function dropCharge(f) {
    if (!carries(f) || !f.alive || M.planted || f.plant > 0) return false; const fx = -Math.sin(f.yaw), fz = -Math.cos(f.yaw);
    let x = f.x + fx * 1.25, z = f.z + fz * 1.25; if (solidAt(x, z, f.y + .5)) { x = f.x; z = f.z; }
    f.noCharge = M.time + 1.2; setCharge(null, x, z, false, f); return true;
  }
  // the armory: hand the charge to a teammate (yours to give, or a bot's)
  function giveCharge(from, to) {
    const c = carrier(); if (!to || to.team !== from.team || sideOf(to) !== 'att' || !to.alive || M.planted) return false;
    if (c && c !== from && !(c.bot || c.isBot)) return false;   // another person has it: theirs to pass on
    setCharge(to, 0, 0, false, from); return true;
  }
  // each tick, for a fighter this device runs: the charge and any gun underfoot
  // the gun you are next to would go into an empty slot (pick it up), not take the place of one (swap)
  const lootFree = f => { const d = f.nearLoot, G = d && GUNS[d.k]; if (!G) return false; const have = f.guns[G.slot]; return !have || (G.slot === 2 && have === 'pip'); };
  function stepLoot(f, I, press) {
    // (after a round is decided the survivors can still pick up the guns lying about and keep them for the next one)
    if (!f.alive || M.mode === 'range' || M.over) { f.nearLoot = null; return false; }
    const C = M.charge;
    if (C && !C.k && !M.planted && sideOf(f) === 'att' && !(f.noCharge > M.time) && Math.hypot(C.x - f.x, C.z - f.z) < LOOT_R && Math.abs(C.y - f.y) < 1.4) setCharge(f);
    f.nearLoot = null; if (!M.loot || !M.loot.length) return false;
    // underfoot (the nearest within a step) or, failing that, the one you are looking at within reach
    let best = null, bd = LOOT_R, look = null, la = .75; for (const d of M.loot) { const dd = Math.hypot(d.x - f.x, d.z - f.z); if (Math.abs(d.y - f.y) < 1.4 && !(d.by === f.key && M.time - d.at < 1.2) && !(d.fo && d.fo !== f.key && M.time - d.at < 6) && !(f.bot && M.phase === 'buy' && d.fo !== f.key)) {
      if (dd < bd) { bd = dd; best = d; } else if (!f.bot && dd < LOOK_R) { const a = Math.abs(angDiff(yawTo(f.x, f.z, d.x, d.z), f.yaw)); if (a < la) { la = a; look = d; } } } }
    const under = !!best; best = best || look; if (!best) return false; const G = GUNS[best.k], have = f.guns[G.slot], free = !have || (G.slot === 2 && have === 'pip');
    if (f.bot) { if (free || (GUNS[have].cost || 0) < G.cost) takeLoot(f, best); return false; }
    if (free && under) { takeLoot(f, best); return false; }
    f.nearLoot = best; if (press) { takeLoot(f, best); return true; } return false;
  }

  /* ---------- rounds and money ---------- */
  // the host decides when a round is over and who took it
  function judge() {
    if (M.phase !== 'live' || M.mode === 'range') return;
    const ai = attIdx();
    if (M.defused) return endRound(1 - ai, 'defuse');
    if (M.planted) { if (M.planted.t <= 0) return endRound(ai, 'boom'); if (!teamUp(1 - ai)) return endRound(ai, 'elim_def'); return; }
    if (!teamUp(ai)) return endRound(1 - ai, 'elim_att');
    if (!teamUp(1 - ai)) return endRound(ai, 'elim_def');
    if (M.t <= 0) return endRound(1 - ai, 'time');
  }
  function endRound(wi, why) {
    if (M.phase === 'end') return;
    M.phase = 'end'; M.t = END_T; M.wins[wi]++; M.last = { wi, why };
    if (M.auto) M.adj += wi === 0 ? 18 : -12;   // the adaptive bot sharpens a little each round you take, and eases off when you lose one
    M.fs.forEach(f => { if (f.net) return; const won = f.team === wi; f.lossRun = won ? 0 : f.lossRun + 1; f.credits = Math.min(CASH.cap, f.credits + (won ? CASH.win : CASH.loss[Math.min(2, f.lossRun - 1)])); });
    if (why === 'boom') emit('boom', M.planted.x, M.planted.z);
    emit('end', wi, why);
    if (M.clutch && M.clutch.team === wi && M.byKey[M.clutch.key]) { const c = M.byKey[M.clutch.key]; c.stat.cl = (c.stat.cl || 0) + 1; emit('clutch', c, M.clutch.vs); }
    if (M.host) net({ t: 'end', wi: wi ^ (M.flip || 0), why });
  }
  // which way to face at the start of a round: down the way out of the spawn, toward the site (any map, any orientation)
  function spawnYaw(f, side) {
    let t = SITES[0].c;
    if (side === 'att') { const ks = Object.keys(ROUTES).filter(k => ROUTES[k].length); if (ks.length) { const k = ks.reduce((b, k) => Math.hypot(ROUTES[k][0][0] - f.x, ROUTES[k][0][1] - f.z) < Math.hypot(ROUTES[b][0][0] - f.x, ROUTES[b][0][1] - f.z) ? k : b); t = ROUTES[k][0]; } }
    else t = SITES.reduce((b, S) => Math.hypot(S.c[0] - f.x, S.c[1] - f.z) < Math.hypot(b.c[0] - f.x, b.c[1] - f.z) ? S : b).c;
    const p = findPath(f.x, f.z, t[0], t[1]), q = p.length ? p[Math.min(p.length - 1, 3)] : t;
    return yawTo(f.x, f.z, q[0], q[1]);
  }
  function startRound(n) {
    M.round = n; M.phase = 'buy'; M.dlog = {}; M.fk = null; M.clutch = null; for (const f of M.fs) { f.stat.rk = 0; f.stat.d0 = f.stat.dmg || 0; f.stat.k0 = f.stat.k | 0; } M.t = BUY_T + (n === 1 && M.loadT ? M.loadT : 0); resetMech(); M.vent = []; M.storm = 0; M.stormOn = false; M.planted = null; M.defused = false; M.smokes = []; M.nades = []; M.walls = []; M.flares = []; M.feed = []; M.say = null; M.deathInfo = null; M.last = null; M.kit = freshKit();
    const ot = otRound(n), decider = ot > 0;   // overtime: everyone gets the same credits every round
    const order = [...M.fs].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);   // the same on every device, so teammates never share a spawn
    M.fs.forEach(f => {
      const side = sideOf(f), sp = SPAWN[side], p = sp[(n + order.filter(q => sideOf(q) === side).indexOf(f)) % sp.length];
      if (!f.alive || pistolRound(n) || ot === 1) { f.guns = { 1: null, 2: 'pip', 3: 'knife' }; f.sh = 0; f.ammo = {}; f.smokes = 0; }   // you keep what you survived with
      if (!f.net && n === HALF() + 1) f.credits = CASH.start; if (!f.net && decider) f.credits = CASH.decider; if (n === HALF() + 1 || ot === 1) f.lossRun = 0;   // the loss bonus starts again with the new half f.spent = {}; f.throwT = 0;   // your loadout, fresh every round
      Object.assign(f, { x: p[0], z: p[1], y: 0, vx: 0, vy: 0, vz: 0, hp: 100, alive: true, ground: true, crouch: 0, flash: 0, reveal: 0, heal: null, dash: null, surge: 0, cloak: 0, daze: 0, snare: 0, plant: 0, defuse: 0, scoped: 0, reloadT: 0, fireT: 0, spray: 0, burst: null, swing: null, autoReload: 0, ready: false, spent: {}, pitch: 0 });
      f.ab.e = 1; if (n === 1 || n === HALF() + 1 || ot === 1) f.ab.q = 0; if (n === 1) f.ult = 0;
      Object.assign(f, { guard: 0, od: 0, phase: 0, lock: 0, chan: null, volley: null, orbT: 0 });
      for (const s of [1, 2]) if (f.guns[s]) giveAmmo(f, f.guns[s]); f.slot = f.guns[1] ? 1 : 2;
      f.yaw = spawnYaw(f, side); f.padT = f.tpCD = f.padCD = 0; if (f.gone) f.alive = false;
      if (f.bot) { if (M.auto && !f.bot.dummy) { const L = diffFor(M.rating + M.adj); f.bot = { diff: L.i, D: L.D }; } else f.bot = { diff: f.bot.diff, D: f.bot.D, dummy: f.bot.dummy }; }
    });
    M.orbs = ORBS.map((p, i) => ({ i, x: p[0], z: p[1], taken: false }));
    M.loot = []; { const att = M.fs.filter(f => sideOf(f) === 'att' && !f.gone).sort((a, b) => ((a.bot || a.isBot ? 1 : 0) - (b.bot || b.isBot ? 1 : 0)) || (a.key < b.key ? -1 : 1)); M.charge = att.length && M.mode !== 'range' ? { k: att[0].key, at: -9 } : null; }
    if ((n === HALF() + 1 || decider) && M.mode === 'demo') say(decider ? (suddenDeath(n) ? 'SUDDEN DEATH' : 'OVERTIME') : 'SIDES SWAPPED');   // players get the switching-sides band instead
    for (const f of M.fs) f.inv0 = { g1: f.guns[1] || '', g2: f.guns[2] || '', sh: f.sh | 0, sm: f.smokes | 0, q: f.ab.q | 0 };
    emit('round', n);
  }
  // the loss bonus: what losing this round would pay you next round (it grows with each round lost in a row), for the armory
  const lossNext = f => M && M.mode !== 'range' && M.mode !== 'demo' && !otRound(M.round + 1) && !pistolRound(M.round + 1) ? `  ·  lose and next round pays ◈ ${CASH.loss[Math.min(2, f.lossRun | 0)]}` : '';
  const canBuy = () => (M.phase === 'buy' && !loadingNow()) || M.mode === 'range';
  // the loading screen shows for the first LOAD_T seconds of the match
  // (once it has ended it stays ended, whatever the clock does afterwards)
  const loadingNow = () => { if (!M) return false; if (M.loading && !(M.round === 1 && M.phase === 'buy' && M.t > BUY_T)) M.loading = false; return !!M.loading; };
  // offline you can skip it
  const skipLoad = () => { if (loadingNow() && !M.online) { M.t = BUY_T; M.loading = false; } };
  // Buying over something you bought this round refunds it; choosing it again sells it back.
  // choose a gun (or shield) for your loadout: free, if you own it. It is yours from now on, every round, until you pick another
  // what a gun kept from an earlier round sells for: half its price (bought this round, it refunds in full)
  const resale = k => { const G = GUNS[k]; return G && !G.melee && k !== 'pip' && G.cost ? Math.floor(G.cost / 2 / 50) * 50 : 0; };
  function buy(f, k) {
    if (!canBuy()) return false;
    const G = GUNS[k], A = ARMOR.find(a => a.k === k), sp = f.spent; let ok = false;
    if (G && !G.melee) {
      const s = G.slot, prev = sp[s];
      if (f.guns[s] === k) {
        if (prev && prev.k === k) { f.credits += G.cost; f.guns[s] = prev.was; if (prev.was) giveAmmo(f, prev.was); delete sp[s]; f.slot = f.guns[1] ? 1 : 2; ok = true; }
        else if (resale(k) && !f.bot) { f.credits = Math.min(CASH.cap, f.credits + resale(k)); f.guns[s] = s === 2 ? 'pip' : null; if (s === 2) giveAmmo(f, 'pip'); f.slot = f.guns[1] ? 1 : 2; f.scoped = 0; f.reloadT = 0; ok = true; }   // a gun kept from an earlier round sells for half
      }
      else { const refund = prev ? GUNS[prev.k].cost : 0; if (f.credits + refund >= G.cost) { f.credits += refund - G.cost; sp[s] = { k, was: prev ? prev.was : f.guns[s] }; f.guns[s] = k; giveAmmo(f, k); f.slot = s; f.scoped = 0; f.reloadT = 0; ok = true; } }
    } else if (A) {
      if (f.sh >= A.sh) { if (sp.sh && sp.sh.k === A.k) { f.credits += A.cost; f.sh = sp.sh.was; delete sp.sh; ok = true; } }
      else { const refund = sp.sh ? ARMOR.find(a => a.k === sp.sh.k).cost : 0; if (f.credits + refund >= A.cost) { f.credits += refund - A.cost; sp.sh = { k: A.k, was: sp.sh ? sp.sh.was : f.sh }; f.sh = A.sh; ok = true; } }
    } else if (k === 'abq') {   // a charge of your bought ability (Q), up to its most; pressing at the most sells back one bought this round
      const Q = OPS[f.op].q; if ((f.ab.q | 0) >= Q.max) { if (sp.abq > 0) { sp.abq--; f.ab.q--; f.credits += Q.cost; ok = true; } }
      else if (f.credits >= Q.cost) { f.credits -= Q.cost; f.ab.q = (f.ab.q | 0) + 1; sp.abq = (sp.abq || 0) + 1; ok = true; }
    } else if (k === NADE.k) {   // smokes: one at a time, up to two; with two in hand, pressing again sells back one bought this round
      if ((f.smokes || 0) >= NADE.per) { if (sp.smoke > 0) { sp.smoke--; f.smokes--; f.credits += NADE.cost; ok = true; } }
      else if (f.credits >= NADE.cost) { f.credits -= NADE.cost; f.smokes = (f.smokes || 0) + 1; sp.smoke = (sp.smoke || 0) + 1; ok = true; }
    }
    if (M.mode === 'range') f.credits = CASH.cap;
    emit('buy', f, ok); return ok;
  }
  // REBUY: buy again what you bought last round (main gun, sidearm, shields, smokes, ability charges), as far as the money goes
  function lastBuyOf(f) { const sp = f.spent || {}, o = { g1: sp[1] && sp[1].k, g2: sp[2] && sp[2].k, sh: sp.sh && sp.sh.k, sm: sp.smoke | 0, q: sp.abq | 0 }; return o.g1 || o.g2 || o.sh || o.sm || o.q ? o : null; }
  on('live', () => { if (M) for (const f of M.fs) if (!f.net) { const b = lastBuyOf(f); if (b) f.lastBuy = b; } });
  const rebuyCost = f => { const b = f.lastBuy; if (!b) return 0; let c = 0; if (b.g1 && f.guns[1] !== b.g1) c += GUNS[b.g1].cost; if (b.g2 && f.guns[2] !== b.g2) c += GUNS[b.g2].cost; const A = b.sh && ARMOR.find(a => a.k === b.sh); if (A && f.sh < A.sh) c += A.cost; c += Math.max(0, b.sm - (f.smokes | 0)) * NADE.cost + Math.max(0, b.q - (f.ab.q | 0)) * OPS[f.op].q.cost; return c; };
  function rebuy(f) { const b = f.lastBuy; if (!b || !canBuy()) return false; let n = 0; const take = k => { if (buy(f, k)) n++; };
    if (b.g1 && f.guns[1] !== b.g1) take(b.g1); if (b.sh) { const A = ARMOR.find(a => a.k === b.sh); if (A && f.sh < A.sh) take(b.sh); } if (b.g2 && f.guns[2] !== b.g2) take(b.g2);
    for (let i = f.smokes | 0; i < b.sm; i++) take(NADE.k); for (let i = f.ab.q | 0; i < b.q; i++) take('abq'); return n > 0; }
  // closing the armory says you are ready (shown to your team); the buy phase still runs its full time
  function setReady(f) { if (M.phase !== 'buy' || f.ready) return; f.ready = true; if (!f.net) net({ t: 'rdy', f: f.key }); }

  /* ---------- a match ---------- */
  // o: { mode, diff, rival: { name }, hostAtt, decHostAtt }
  function startMatch(o) {
    const mode = o.mode, online = mode === 'online', host = !online || MP.isHost(), ops = Object.keys(OPS);
    const ranked = !!o.ranked && (mode === 'bot' || online);
    WIN_ROUNDS = mode === 'range' || mode === 'demo' || ranked ? 5 : winOf(o.win != null ? o.win : online ? 5 : CFG.win);   // online, everyone uses the host's length; ranked is always first to 5
    const A = fighter(mode === 'demo' ? { name: 'Rook', op: pick(ops), bot: { diff: 1 } } : { name: online ? MP.name : 'You', op: CFG.op, local: true });
    const auto = mode === 'bot' && (o.diff === 'auto' || o.diff == null), L = auto ? diffFor(STATS.rating) : null;
    const botP = () => auto ? { diff: L.i, D: L.D } : { diff: typeof o.diff === 'number' ? o.diff : 1, dummy: mode === 'range' }, used = new Set([A.name, ...(o.mates || []).map(m => m.name)]), bname = () => { const n = pick(BOT_NAMES.filter(q => !used.has(q))); used.add(n); return n; };
    let fs = [A], flip = 0;
    if (online && o.seats) {   // seats: { key, name, team (the host's numbering), bot, op } in the same order on every device; the host runs the bots
      const mine = o.seats.find(s => s.key === String(MP.id)) || o.seats[0]; flip = mine.team; A.key = mine.key; if (OPS[mine.op]) A.op = mine.op;   // (a teammate had your operative first: you play the one the room gave you)
      for (const s of o.seats) if (s !== mine) fs.push(fighter({ name: s.name, op: s.op || 'vex', key: s.key, team: s.team ^ flip, net: !(s.bot && host), isBot: !!s.bot, bot: s.bot && host ? { diff: o.botDiff == null ? 1 : o.botDiff } : null, rating: s.rating || 0, rk: s.rk, rkp: s.rkp }));
    } else if (online) fs.push(fighter({ name: (o.rival && o.rival.name) || 'Rival', op: 'vex', net: true, team: 1, key: String(o.rival && o.rival.id) }));
    else {   // bots: within a team every operative is different (eight operatives, at most five a side)
      const eOps = [], mOps = [A.op], fresh = taken => { const c = ops.filter(k => !taken.includes(k)); return pick(c.length ? c : ops); };
      for (let i = 0; i < Math.max(1, o.size | 0); i++) { const name = bname(), op = fresh(eOps); eOps.push(op); fs.push(fighter({ name, op, team: 1, key: 'e' + i, bot: botP() })); }
      for (let i = 1; i < (o.size | 0); i++) { const mt = o.mates && o.mates[i - 1]; if (mt) used.add(mt.name); const name = mt ? mt.name : bname(), op = mt && OPS[mt.op] && !mOps.includes(mt.op) ? mt.op : fresh(mOps); mOps.push(op); fs.push(fighter({ name, op, team: 0, key: 'm' + i, bot: botP() })); } }
    fs = [A, ...fs.slice(1).sort((a, b) => b.team - a.team)];   // enemies first, so M.fs[1] is always a rival
    // a map at random each match (online, the host's pick); the range is always on Saltworks
    const mapI = o.map != null ? o.map : mode === 'range' ? 0 : pick(mapPool(o.sites)); if (MAP !== MAPS[mapI]) { loadMap(mapI); emit('map', mapI); }
    const hostAtt = o.hostAtt == null ? (R() < .5 ? 1 : 0) : o.hostAtt, decHostAtt = o.decHostAtt == null ? (R() < .5 ? 1 : 0) : o.decHostAtt;
    if (online && !o.seats) flip = host ? 0 : 1;
    M = { mode, online, host, auto, flip, byKey: Object.fromEntries(fs.map(f => [f.key, f])), rating: STATS.rating, adj: 0, fs, wins: [0, 0], round: 0, phase: 'buy', t: 0, time: 0, att0: (hostAtt ? 0 : 1) ^ flip, decAtt: (decHostAtt ? 0 : 1) ^ flip,
      planted: null, defused: false, smokes: [], nades: [], walls: [], flares: [], feed: [], pings: [], say: null, last: null, over: null, deathInfo: null, hurt: 0, hurtDir: 0, camKick: 0, netT: 0, ranked, botDiff: o.botDiff != null ? o.botDiff : o.diff };
    M.size = teamSize(Math.max(fs.filter(f => f.team === 0).length, fs.filter(f => f.team === 1).length)); if (ranked) { A.rk = rankStrength(M.size); A.rkp = placed(rankedOf(M.size)) ? 1 : 0; }
    M.loadT = mode === 'bot' || online ? LOAD_T : 0; M.loading = M.loadT > 0;
    for (const f of fs) { f.rating = f === A ? STATS.rating : f.bot ? botRating(f, M) : f.rating || 0; f.skins = f === A ? Object.assign({}, STATS.equip) : f.bot || f.isBot ? botSkins() : {}; }
    startRound(1);
    if (mode === 'range') { M.phase = 'live'; M.t = 0; A.credits = CASH.cap; Object.assign(A, { x: 9, z: 5, yaw: yawTo(9, 5, 30, 5) }); placeDummy(fs[1]); }
    if (mode === 'demo') { M.t = 1.5; A.credits = fs[1].credits = 4500; }
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
    // online, nobody starts until everyone has loaded: round one waits on the loading screen
    if (M.online && !M.allIn && M.round === 1 && M.phase === 'buy') M.t = Math.max(M.t, BUY_T + LOAD_T);
    if (M.phase === 'buy' && M.host && M.mode !== 'range') {
      if (M.t <= 0) { M.phase = 'live'; M.t = roundT(); emit('live'); net({ t: 'live' }); }
    }
    if (M.phase === 'live' && M.planted) { const P = M.planted; P.t -= dt; P.beep -= dt; if (P.beep <= 0) { P.beep = cl(P.t / 12, .12, 1); emit('beep'); } }
    if (M.phase === 'live' && M.host) judge();
    stepMapClock(dt);
    if (M.phase === 'end' && M.host && M.t <= 0) {
      if (matchDecided()) return matchOver();
      startRound(M.round + 1); net({ t: 'rs', n: M.round });
    }
    for (const f of M.fs) {
      if (f.net) { netFollow(f, dt); continue; }
      let I = !f.alive ? NEUTRAL : f.bot ? botThink(f, dt) : readInput(f);
      if (f.chan || f.lock > 0) { I = Object.assign({}, I, { fire: false }); if (f.chan) Object.assign(I, { mx: 0, mz: 0, jump: false, sprint: false }); }
      stepBody(f, I, dt); stepGun(f, dt); stepObjective(f, I, dt);
      if (I.fire && f.sprinting) { f.sprinting = false; f.fireT = Math.max(f.fireT, .1); }
      { const G = gun(f); f.wind = G.wind ? cl((f.wind || 0) + ((I.fire || I.spin) && f.alive && f.reloadT <= 0 ? dt / G.wind : -dt / (G.wind * 1.6)), 0, 1) : 0; }   // a rotary gun spins up before it fires
      if (I.fire && f.alive && (M.phase !== 'buy' || M.mode === 'range') && !(gun(f).wind && f.wind < 1)) { const G = gun(f); if (G.auto || !f.semiHeld || I.press || (I.rapid && f.fireT < -.07)) fire(f); }
      f.semiHeld = !!I.fire;
      if (M.mode === 'range') { if (f.abT > 0 && (f.abT -= dt) <= 0) { f.ab = { q: OPS[f.op].q.max, e: 1 }; f.ult = ultCost(f); } if (!f.alive && f.bot && (f.respawn -= dt) <= 0) placeDummy(f); }
    }
    stepNades(dt); stepKits(dt); for (const f of M.fs) if (f.throwT > 0) f.throwT -= dt;
    for (const s of M.smokes) { s.t -= dt; s.r = s.t > s.T - .6 ? lp(0, s.R, (s.T - s.t) / .6) : s.t < 1 ? s.R * Math.max(0, s.t) : s.R; } M.smokes = M.smokes.filter(s => s.t > 0);
    for (const w of M.walls) { w.t -= dt; w.grow = Math.min(1, w.grow + dt * 4); } M.walls = M.walls.filter(w => w.t > 0);
    for (const fl of M.flares) { fl.t -= dt; if (fl.t <= 0) popFlare(fl); } M.flares = M.flares.filter(fl => fl.t > 0);
    for (const k of M.feed) k.t += dt; M.feed = M.feed.filter(k => k.t < 6).slice(0, 4);
    if (M.say) { M.say.t += dt; if (M.say.t > 2.6) M.say = null; }
    if (M.deathInfo) M.deathInfo.t += dt;
    M.camKick *= Math.pow(.02, dt); M.hurt = Math.max(0, M.hurt - dt * 1.5);
    netTick(dt);
  }
