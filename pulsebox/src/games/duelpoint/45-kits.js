  /* ---------- 45 kits: the five newer operatives' abilities ----------
     NOVA (Striker)    Q Surge: 3.5 s of speed, and sprays settle twice as fast.  E Shockwave: a blast where you aim that
                       dazes whoever it catches (slow, shaky aim) and stings for 15.
     WRAITH (Phantom)  Q Shroud: 5 s nearly invisible beyond 5 m, silent feet; firing ends it.  E Ghost Step: fake
                       footsteps then a burst of fake gunfire where you aim, which rivals (and bots) hear as real.
     TALON (Tracker)   Q Recon Dart: a dart that sticks where it lands and pulses twice, revealing rivals in its sight.
                       E Snare: a trap on the ground ahead; the first rival over it is slowed and revealed.
     EMBER (Pyre)      Q Ignite: a lobbed firebomb that leaves a burning pool (30 a second) for 5 s.  E Heat Haze: a
                       line of amber haze across your view that blocks sight for 10 s.
     AXIOM (Engineer)  Q Sentry: a turret that fires on rivals in front of it until it is shot down (60 health).
                       E Tripmine: a mine at your feet that arms, then bursts for up to 75 when a rival comes near.
     The things they leave in the world live in M.kit and are stepped by stepKits. Like damage, every effect on a fighter
     is worked out on that fighter's own device: a trap or mine that goes off there tells the others, so all screens agree. */
  const KIT_N = { fires: [], darts: [], bombs: [], waves: [], mines: [], snares: [], sentries: [], lures: [] };
  const freshKit = () => Object.fromEntries(Object.keys(KIT_N).map(k => [k, []]));
  const enemyOf = (a, b) => a.team !== b.team;
  const kitId = (f, k) => f.key + ':' + k + ':' + M.round;
  // where an ability goes, worked out on the caster's device; returns the data every device applies
  function kitAim(f, key, d, S) {
    const e = eyeY(f), reach = (max, back = .6) => Math.max(1, Math.min(S.hit ? max : S.dist, max) - back);
    if (key === 'novae') { const dd = Math.max(1, Math.min(S.dist, 18) - .4); return { x: f.x + d[0] * dd, y: e + d[1] * dd, z: f.z + d[2] * dd }; }   // aimed at a rival, it goes off on them
    if (key === 'wraithe') { const dd = reach(20); return { x: f.x + d[0] * dd, z: f.z + d[2] * dd }; }
    if (key === 'talonq') return { x: f.x + d[0] * .5, y: e + d[1] * .5, z: f.z + d[2] * .5, vx: d[0] * 42, vy: d[1] * 42 + 1.5, vz: d[2] * 42 };
    if (key === 'talone') { const dd = Math.min(reach(5, .4), 5); return { x: f.x - Math.sin(f.yaw) * dd, z: f.z - Math.cos(f.yaw) * dd }; }
    if (key === 'emberq') return { x: f.x + d[0] * .5, y: e - .1 + d[1] * .5, z: f.z + d[2] * .5, vx: d[0] * 15 + f.vx * .4, vy: d[1] * 15 + 3, vz: d[2] * 15 + f.vz * .4 };
    if (key === 'embere') { const dd = Math.min(reach(10), 10); return { x: f.x + d[0] * dd, z: f.z + d[2] * dd, px: Math.cos(f.yaw), pz: -Math.sin(f.yaw) }; }
    if (key === 'axiomq') { const fx = -Math.sin(f.yaw), fz = -Math.cos(f.yaw), dd = walkLine(f.x, f.z, f.x + fx * 1.4, f.z + fz * 1.4) ? 1.4 : .6; return { x: f.x + fx * dd, z: f.z + fz * dd, yaw: f.yaw }; }
    if (key === 'axiome') return { x: f.x, z: f.z };
    return {};
  }
  // the ability itself, the same on every device
  function kitApply(f, key, d) {
    const K2 = M.kit || (M.kit = freshKit());
    if (key === 'novaq') { f.surge = 3.5; return true; }
    if (key === 'novae') { K2.waves.push({ x: d.x, y: d.y, z: d.z, t: .45, by: f }); return true; }
    if (key === 'wraithq') { f.cloak = 5; return true; }
    if (key === 'wraithe') { K2.lures.push({ x: d.x, z: d.z, t: 4.2, step: 0, shots: 0, by: f, loud: 0 }); return true; }
    if (key === 'talonq') { K2.darts.push({ x: d.x, y: d.y, z: d.z, vx: d.vx, vy: d.vy, vz: d.vz, stuck: -1, pulses: 0, by: f }); return true; }
    if (key === 'talone') { K2.snares.push({ id: kitId(f, 'e'), x: d.x, z: d.z, y: hAt(d.x, d.z), arm: .8, by: f }); return true; }
    if (key === 'emberq') { K2.bombs.push({ x: d.x, y: d.y, z: d.z, vx: d.vx, vy: d.vy, vz: d.vz, t: 0, by: f }); return true; }
    if (key === 'embere') { for (const o of [-2.6, 0, 2.6]) { const x = d.x + d.px * o, z = d.z + d.pz * o, s = { x, z, y: hAt(x, z) > 2 ? 0 : hAt(x, z), r: 0, R: 2.1, t: 10, T: 10, heat: 1 }; M.smokes.push(s); emit('smoke', s); } return true; }
    if (key === 'axiomq') { K2.sentries.push({ id: kitId(f, 'q'), x: d.x, z: d.z, y: hAt(d.x, d.z), yaw: d.yaw, aim: d.yaw, pitch: 0, hp: 60, cd: .8, by: f, target: null, flash: 0 }); return true; }
    if (key === 'axiome') { K2.mines.push({ id: kitId(f, 'e'), x: d.x, z: d.z, y: hAt(d.x, d.z), arm: 1.5, fuse: -1, by: f }); return true; }
    return false;
  }
  // the fighters this device is in charge of
  const localFs = () => M.fs.filter(v => !v.net && v.alive);
  // a mine or snare set off: on the victim's device first, then on every other device by message
  function kitTrip(id, vKey, fromNet) {
    const K2 = M.kit; if (!K2) return;
    const sn = K2.snares.find(s => s.id === id);
    if (sn) { const v = M.byKey[vKey]; K2.snares = K2.snares.filter(s => s !== sn); if (v) { v.snare = 2.6; v.reveal = Math.max(v.reveal, 3); if (v === me()) say('SNARED', WARN); } emit('snared', sn, v); }
    const mn = K2.mines.find(m => m.id === id); if (mn && mn.fuse < 0) { mn.fuse = .35; emit('mineArm', mn); }
    if (!fromNet) net({ t: 'kx', id, v: vKey });
  }
  // a shot or blast against a sentry, decided by the shooter's device
  function hurtSentry(s, dmg, fromNet) {
    const K2 = M.kit; if (!K2 || !K2.sentries.includes(s)) return; s.hp -= dmg; s.flash = .12; emit('sentryHit', s);
    if (s.hp <= 0) { K2.sentries = K2.sentries.filter(q => q !== s); emit('sentryDown', s); }
    if (!fromNet) net({ t: 'kd', id: s.id, d: dmg });
  }
  // the sentries rivals' shots can hit: a small box on its legs
  function sentryBoxes(f) { return M.kit ? M.kit.sentries.filter(s => enemyOf(s.by, f)).map(s => ({ s, mn: [s.x - .28, s.y, s.z - .28], mx: [s.x + .28, s.y + .95, s.z + .28] })) : []; }
  function stepKits(dt) {
    const K2 = M.kit || (M.kit = freshKit());
    for (const f of M.fs) for (const k of ['surge', 'cloak', 'daze', 'snare']) if (f[k] > 0) f[k] = Math.max(0, f[k] - dt);
    // Shockwave: a short fuse, then a blast
    for (const w of K2.waves) if ((w.t -= dt) <= 0) {
      for (const v of localFs()) { if (!enemyOf(w.by, v)) continue; const d = Math.hypot(v.x - w.x, v.y + 1 - w.y, v.z - w.z); if (d > 4.5 || los(w.x, w.y, w.z, v.x, eyeY(v) - .2, v.z, false) < d - .4) continue; v.daze = 2.5; applyDamage(v, 15, w.by, false, 'shockwave'); if (v === me()) say('DAZED', WARN); }
      emit('wavePop', w);
    }
    K2.waves = K2.waves.filter(w => w.t > 0);
    // Ghost Step: footsteps, then three bursts of gunfire, from nowhere
    for (const L of K2.lures) { L.t -= dt; L.step -= dt; L.loud = Math.max(0, L.loud - dt); const firing = L.t < 2;
      if (L.step <= 0) { L.step = firing ? .11 : .34; L.loud = .3; emit(firing ? 'lureShot' : 'lureStep', L); if (firing) L.shots++; if (firing && L.shots % 4 === 0) L.step = .55; } }
    K2.lures = K2.lures.filter(L => L.t > 0);
    // Recon Dart: flies, sticks, pulses twice
    for (const D of K2.darts) {
      if (D.stuck < 0) {
        D.vy -= 4 * dt; const sp = Math.hypot(D.vx, D.vy, D.vz), step = sp * dt, dx = D.vx / sp, dy = D.vy / sp, dz = D.vz / sp, hit = rayGrid(D.x, D.y, D.z, dx, dy, dz, step + .05);
        if (hit < step + .05) { D.x += dx * Math.max(0, hit - .05); D.y += dy * Math.max(0, hit - .05); D.z += dz * Math.max(0, hit - .05); D.stuck = 0; D.n = [rayN[0], rayN[1], rayN[2]]; emit('dartStick', D); }
        else { D.x += D.vx * dt; D.y += D.vy * dt; D.z += D.vz * dt; if (D.y < -5) D.stuck = 99; }
      } else {
        D.stuck += dt;
        if ((D.pulses === 0 && D.stuck > .35) || (D.pulses === 1 && D.stuck > 2.1)) {
          D.pulses++; emit('dartPulse', D);
          for (const v of M.fs) if (v.alive && enemyOf(D.by, v)) { const d = Math.hypot(v.x - D.x, v.z - D.z); if (d < 16 && los(D.x, D.y, D.z, v.x, eyeY(v) - .1, v.z) >= Math.hypot(d, eyeY(v) - D.y) - .5) { v.reveal = Math.max(v.reveal, 2.2); if (v === me()) say('YOU ARE REVEALED', WARN); } }
        }
      }
    }
    K2.darts = K2.darts.filter(D => D.stuck < 3.2);
    // Ignite: the firebomb arcs, and where it lands it burns
    for (const B of K2.bombs) {
      B.t += dt; B.vy -= 14 * dt; const sp = Math.hypot(B.vx, B.vy, B.vz) || 1, step = sp * dt, dx = B.vx / sp, dy = B.vy / sp, dz = B.vz / sp, hit = rayGrid(B.x, B.y, B.z, dx, dy, dz, step + .05);
      if (hit < step + .05 || B.t > 3) { const x = B.x + dx * Math.max(0, hit - .1), z = B.z + dz * Math.max(0, hit - .1), y = hAt(x, z); B.done = true; const fire = { x, z, y, r: 3.2, t: 5, T: 5, by: B.by, tick: 0 }; K2.fires.push(fire); emit('fireStart', fire); }
      else { B.x += B.vx * dt; B.y += B.vy * dt; B.z += B.vz * dt; }
    }
    K2.bombs = K2.bombs.filter(B => !B.done);
    for (const F of K2.fires) {
      F.t -= dt; F.tick -= dt; if (F.tick > 1e-6) continue; F.tick += .25;
      for (const v of localFs()) if (enemyOf(F.by, v) && Math.hypot(v.x - F.x, v.z - F.z) < F.r && Math.abs(v.y - F.y) < 1.6) { applyDamage(v, 7.5, F.by, false, 'ignite'); if (v.bot) v.bot.hitBy = { x: F.x, z: F.z, t: M.time }; }
    }
    K2.fires = K2.fires.filter(F => F.t > 0);
    // Snare: arms, then waits for a rival's feet (worked out where that rival is run)
    for (const s of K2.snares) { if (s.arm > 0) { s.arm -= dt; continue; } const v = localFs().find(q => enemyOf(s.by, q) && Math.hypot(q.x - s.x, q.z - s.z) < 1.3 && Math.abs(q.y - s.y) < 1); if (v) { kitTrip(s.id, v.key, false); break; } }
    // Tripmine: arms, a rival comes near, a short beep, then the burst
    for (const m of K2.mines) {
      if (m.arm > 0) { m.arm -= dt; continue; }
      if (m.fuse < 0) { const v = localFs().find(q => enemyOf(m.by, q) && Math.hypot(q.x - m.x, q.z - m.z) < 2.2 && Math.abs(q.y - m.y) < 1.4); if (v) kitTrip(m.id, v.key, false); continue; }
      if ((m.fuse -= dt) <= 0) {
        for (const v of localFs()) { if (!enemyOf(m.by, v)) continue; const d = Math.hypot(v.x - m.x, v.y + .8 - m.y - .2, v.z - m.z); if (d > 3.4 || los(m.x, m.y + .25, m.z, v.x, v.y + .9, v.z, false) < d - .5) continue; applyDamage(v, Math.round(75 * cl(1.25 - d / 3.4, .35, 1)), m.by, false, 'tripmine'); if (v.bot) v.bot.hitBy = { x: m.x, z: m.z, t: M.time }; }
        m.done = true; emit('mineBoom', m);
      }
    }
    K2.mines = K2.mines.filter(m => !m.done);
    // Sentry: turns to the nearest rival it can see in front of it and fires; damage lands on the victim's own device
    for (const s of K2.sentries) {
      s.cd -= dt; s.flash = Math.max(0, s.flash - dt); const hy = s.y + .78; let best = null, bd = 1e9;
      for (const v of M.fs) { if (!v.alive || !enemyOf(s.by, v)) continue; const d = Math.hypot(v.x - s.x, v.z - s.z); if (d > 22 || d >= bd || (v.cloak > 0 && d > 5)) continue;
        if (Math.abs(angDiff(yawTo(s.x, s.z, v.x, v.z), s.yaw)) > 1.3) continue; if (los(s.x, hy, s.z, v.x, v.y + 1.1, v.z) < Math.hypot(d, v.y + 1.1 - hy) - .4) continue; best = v; bd = d; }
      s.target = best;
      if (best) { const want = yawTo(s.x, s.z, best.x, best.z); s.aim += cl(angDiff(want, s.aim), -4 * dt, 4 * dt); s.pitch = Math.atan2(best.y + 1.1 - hy, bd);
        if (s.cd <= 0 && Math.abs(angDiff(want, s.aim)) < .12) { s.cd = .28; emit('sentryShot', s, best); if (!best.net && Math.random() < cl(1.15 - bd / 28, .3, .85)) { applyDamage(best, 11, s.by, false, 'sentry'); if (best.bot) best.bot.hitBy = { x: s.x, z: s.z, t: M.time }; if (best === me()) M.hurtDir = Math.atan2(s.x - best.x, s.z - best.z); } } }
      else s.aim += cl(angDiff(s.yaw, s.aim), -1.5 * dt, 1.5 * dt);
    }
  }
