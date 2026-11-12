// @use mp
/* Duelpoint: a first-person 1v1 tactical shooter. One map, two sides. Attackers carry a charge and plant it on the site;
   defenders stop them or defuse it. Buy weapons and armour with the credits you earn each round, pick one of three
   operatives with two abilities each, and play first to five rounds against a bot (three difficulties) or a friend online.
   Rendering: Three.js r128 from cdnjs, loaded at runtime. The map is a grid of 2 m cells (walls, tall and low crates), so
   movement, line of sight and bullets all use fast grid tests. Online: each player simulates themself and streams their
   state; the shooter decides hits and tells the victim; the host runs the round clock and calls the winner. */
const GAME = {
  id: 'duelpoint', title: 'Duelpoint', tagline: 'One map. One rival. Every round counts.',
  font: 'Chakra Petch', accent: '#ff4655', accent2: '#3ee6c1', bg: '#0b0f17', noSkins: true, noHud: true, scoreLabel: 'Rounds won',
  how: [
    'Click to grab the mouse. WASD to move, mouse to aim, left click to shoot, right click to scope the Longbow. Shift walks quietly, Ctrl or C crouches, Space jumps, R reloads, 1 2 3 switch weapons.',
    'Q and E are your operative\'s two abilities (one charge each per round). B opens the buy menu during the buy phase.',
    'Attacking: carry the charge to the red site and hold F to plant it. Defending: stop them, or hold F on the charge to defuse it. Killing your rival also wins the round, unless the charge is already ticking.',
    'Standing still and crouching makes you accurate. Running makes you loud and your shots wild. Headshots hit hardest.',
    'First to 5 rounds. Sides swap after round 4. On a phone: left thumb moves, right thumb looks, buttons fire and use abilities.',
  ],
  skins: [{ name: 'Default', price: 0 }],
};
(() => {
  'use strict';
  const TAU = Math.PI * 2, cl = (v, a, b) => v < a ? a : v > b ? b : v, lp = (a, b, t) => a + (b - a) * t, R = Math.random;
  const rnd = (a, b) => a + R() * (b - a), pick = a => a[Math.floor(R() * a.length)];
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  /* ---------- the map: 2 m cells. # wall, C tall crate, c low crate (jump on it, crouch behind it), S the site ---------- */
  const MAP = [
    '############################',
    '#AA.....#.......#..........#',
    '#AA.....#..cc...#....C...D.#',
    '#.......#..cc...####.....D.#',
    '#..##..............#.......#',
    '#..##....#####.....#..##...#',
    '#........#...#..SSSSS.##...#',
    '###...c..#...#..ScSSS......#',
    '#.....c.........SSSCS..#####',
    '#....######.....SSSSS......#',
    '#..........#..C.........c..#',
    '#..C.......#....#####...c..#',
    '#..........###..#...#......#',
    '#.....##........#...#..##..#',
    '#AA...##..c.........#..##D.#',
    '#AA.......c.....#.........D#',
    '#.........................##',
    '############################',
  ];
  const CS = 2, GWc = MAP[0].length, GHc = MAP.length, MW = GWc * CS, MH = GHc * CS;
  const HT = { '#': 6, C: 2.6, c: 1.1 };
  const cellAt = (x, z) => { const i = Math.floor(x / CS), j = Math.floor(z / CS); return i < 0 || j < 0 || i >= GWc || j >= GHc ? '#' : MAP[j][i]; };
  const hAt = (x, z) => HT[cellAt(x, z)] || 0;
  const spawns = { A: [], D: [] }, site = [];
  MAP.forEach((r, j) => [...r].forEach((ch, i) => { const p = [i * CS + 1, j * CS + 1]; if (ch === 'A') spawns.A.push(p); if (ch === 'D') spawns.D.push(p); if (ch === 'S') site.push(p); }));
  const siteC = site.reduce((a, p) => [a[0] + p[0] / site.length, a[1] + p[1] / site.length], [0, 0]);
  const onSite = (x, z) => cellAt(x, z) === 'S';
  const walk = (i, j) => i >= 0 && j >= 0 && i < GWc && j < GHc && !HT[MAP[j][i]];

  // a 3D ray through the grid: the distance to the first wall or crate it meets (or max)
  function rayGrid(ox, oy, oz, dx, dy, dz, max) {
    let i = Math.floor(ox / CS), j = Math.floor(oz / CS); const si = dx > 0 ? 1 : -1, sj = dz > 0 ? 1 : -1;
    const tdx = Math.abs(CS / (dx || 1e-9)), tdz = Math.abs(CS / (dz || 1e-9));
    let tx = ((dx > 0 ? (i + 1) * CS - ox : ox - i * CS) / Math.abs(dx || 1e-9)), tz = ((dz > 0 ? (j + 1) * CS - oz : oz - j * CS) / Math.abs(dz || 1e-9)), t = 0;
    for (let k = 0; k < 120 && t < max; k++) {
      const h = i < 0 || j < 0 || i >= GWc || j >= GHc ? 99 : HT[MAP[j][i]] || 0;
      if (h) { const tn = Math.min(tx, tz, max); const y0 = oy + dy * t, y1 = oy + dy * tn; if (Math.min(y0, y1) < h) { if (y0 < h) return t; return t + (h - y0) / (y1 - y0) * (tn - t); } }
      if (tx < tz) { t = tx; tx += tdx; i += si; } else { t = tz; tz += tdz; j += sj; }
    }
    return max;
  }
  // ray against a sphere / an axis-aligned box: the distance or -1
  function raySphere(o, d, c, r) { const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2], b = ox * d[0] + oy * d[1] + oz * d[2], q = ox * ox + oy * oy + oz * oz - r * r, h = b * b - q; if (h < 0) return -1; const t = -b - Math.sqrt(h); return t > 0 ? t : -1; }
  function rayBox(o, d, mn, mx) { let t0 = 0, t1 = 1e9; for (let a = 0; a < 3; a++) { const inv = 1 / (d[a] || 1e-9); let ta = (mn[a] - o[a]) * inv, tb = (mx[a] - o[a]) * inv; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return -1; } return t0; }

  /* ---------- weapons, armour, operatives ---------- */
  const GUNS = {
    pip: { n: 'Pip', k: 'pip', slot: 2, cost: 0, mag: 12, res: 36, dmg: 26, hs: 3, rpm: 380, spr: .006, mv: .045, rec: .012, rel: 1.4, auto: false, fall: .85, col: '#9aa4b0', desc: 'Sidearm. Free, accurate if you take your time.' },
    hornet: { n: 'Hornet', k: 'hornet', slot: 1, cost: 1000, mag: 25, res: 75, dmg: 22, hs: 2.5, rpm: 780, spr: .02, mv: .04, rec: .009, rel: 2.2, auto: true, fall: .75, col: '#3ee6c1', desc: 'SMG. Sprays fast and stays accurate on the move.' },
    breaker: { n: 'Breaker', k: 'breaker', slot: 1, cost: 900, mag: 6, res: 18, dmg: 12, pel: 9, hs: 2, rpm: 90, spr: .07, mv: .08, rec: .05, rel: 2.6, auto: false, fall: .45, col: '#ffb347', desc: 'Shotgun. Deadly up close, useless far away.' },
    lancer: { n: 'Lancer', k: 'lancer', slot: 1, cost: 2900, mag: 25, res: 75, dmg: 39, hs: 4, rpm: 600, spr: .004, mv: .07, rec: .016, rel: 2.4, auto: true, fall: 1, col: '#ff4655', desc: 'Rifle. A headshot kills an armoured rival.' },
    longbow: { n: 'Longbow', k: 'longbow', slot: 1, cost: 3500, mag: 5, res: 15, dmg: 150, hs: 1.7, rpm: 42, spr: .001, mv: .12, rec: .08, rel: 3, auto: false, scope: 1, fall: 1, col: '#c58cff', desc: 'Sniper. Scope with right click. One shot to the body kills.' },
  };
  const ARMOR = [{ k: 'light', n: 'Light shield', cost: 400, sh: 25 }, { k: 'heavy', n: 'Heavy shield', cost: 1000, sh: 50 }];
  const OPS = {
    vex: { n: 'VEX', role: 'Shade', col: '#7a5cff', q: { n: 'Blink', d: 'Dash 6 m the way you are moving.' }, e: { n: 'Veil', d: 'Throw a smoke cloud that blocks sight for 12 s.' } },
    iris: { n: 'IRIS', role: 'Seer', col: '#3ee6c1', q: { n: 'Ping', d: 'Reveal your rival through walls for 3 s.' }, e: { n: 'Flare', d: 'A flash that blinds whoever looks at it.' } },
    bastion: { n: 'BASTION', role: 'Warden', col: '#ffb347', q: { n: 'Rampart', d: 'Raise a wall in front of you for 12 s.' }, e: { n: 'Patch', d: 'Heal 60 health over 3 s.' } },
  };
  const DIFF = [{ n: 'Recruit', react: .55, err: .09, spray: .5, hs: .15 }, { n: 'Veteran', react: .34, err: .05, spray: .8, hs: .3 }, { n: 'Elite', react: .2, err: .028, spray: 1, hs: .5 }];
  const ROUNDS_TO_WIN = 5, BUY_T = 14, ROUND_T = 80, PLANT_T = 3.5, DEFUSE_T = 6, FUSE_T = 38, END_T = 4.5;
  const EYE = 1.62, CEYE = 1.12, RAD = .34, SPD = 5.4, WALK = 2.7, CSPD = 2.3, GRAV = 19, JUMP = 6.2;

  /* ---------- the fighters and the match ---------- */
  let M = null;   // the match: { fs: [me, foe], round, wins, phase, t, planted, smokes, walls, flashes, feed, diff, online, ... }
  let mode = 'menu', keys = {}, mouse = { l: false, r: false }, menuT = 0, selOp = 'vex', selDiff = 1, posed = false;
  function fighter(o) {
    return Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, crouch: 0, hp: 100, sh: 0, alive: true, guns: { 1: null, 2: 'pip' }, slot: 2, ammo: {}, fireT: 0, reloadT: 0,
      recoil: 0, kick: 0, credits: 800, ab: { q: 1, e: 1 }, flash: 0, reveal: 0, heal: null, dash: null, footT: 0, step: 0, ground: true, scoped: false, plant: 0, defuse: 0, lossRun: 0, kills: 0, deaths: 0, walkT: 0, carrying: false }, o);
  }
  const me = () => M.fs[0], foe = () => M.fs[1];
  const other = f => M.fs[0] === f ? M.fs[1] : M.fs[0];
  const gun = f => GUNS[f.guns[f.slot]] || GUNS.pip;
  const eyeY = f => f.y + lp(EYE, CEYE, f.crouch);
  // who attacks: one side for rounds 1-4, swapped for 5-8, a coin flip for the decider
  const attIdx = () => M.round <= 4 ? M.att0 : M.round <= 8 ? 1 - M.att0 : (M.decider ? M.att0 : 1 - M.att0);
  const sideOf = f => M.fs.indexOf(f) === attIdx() ? 'att' : 'def';
  function giveAmmo(f, k) { const G = GUNS[k]; f.ammo[k] = { mag: G.mag, res: G.res }; }

  /* ---------- collision with the grid and with Rampart walls ---------- */
  const solidAt = (x, z, feet) => { if (hAt(x, z) > feet + .42) return true; for (const w of M.walls) if (x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1) return true; return false; };
  function blocked(x, z, feet) { for (const [a, b] of [[RAD, 0], [-RAD, 0], [0, RAD], [0, -RAD], [RAD * .7, RAD * .7], [-RAD * .7, RAD * .7], [RAD * .7, -RAD * .7], [-RAD * .7, -RAD * .7]]) if (solidAt(x + a, z + b, feet)) return true; return false; }
  function groundAt(x, z, feet) { let g = 0; for (const [a, b] of [[0, 0], [RAD, 0], [-RAD, 0], [0, RAD], [0, -RAD]]) { const h = hAt(x + a, z + b); if (h && h <= feet + .42) g = Math.max(g, h); } return g; }
  function moveF(f, dx, dz) {
    if (!blocked(f.x + dx, f.z, f.y)) f.x += dx; else f.vx = 0;
    if (!blocked(f.x, f.z + dz, f.y)) f.z += dz; else f.vz = 0;
    const g = groundAt(f.x, f.z, f.y); if (f.y > g + .001 || f.vy > 0) f.ground = false; if (f.y <= g) { f.y = g; f.vy = 0; f.ground = true; }
  }
  // one step of a fighter's body from its intent: { mx, mz (local, -1..1), walk, crouch, jump }
  function stepBody(f, I, dt) {
    if (!f.alive) return;
    const frozen = M.phase === 'buy' || M.phase === 'end' || f.plant > 0 || f.defuse > 0;
    f.crouch = cl(f.crouch + (I.crouch ? 1 : -1) * dt * 8, 0, 1);
    let sp = I.walk ? WALK : SPD; if (f.crouch > .5) sp = CSPD; if (f.scoped) sp *= .55; if (gun(f).k === 'longbow' || gun(f).k === 'lancer') sp *= .95;
    const s = Math.sin(f.yaw), c = Math.cos(f.yaw); let wx = -s * I.mz + c * I.mx, wz = -c * I.mz - s * I.mx; const L = Math.hypot(wx, wz); if (L > 1) { wx /= L; wz /= L; }
    if (frozen) wx = wz = 0;
    const acc = f.ground ? 14 : 3; f.vx += (wx * sp - f.vx) * Math.min(1, dt * acc); f.vz += (wz * sp - f.vz) * Math.min(1, dt * acc);
    if (f.dash) { f.dash.t -= dt; f.vx = f.dash.dx * 36; f.vz = f.dash.dz * 36; if (f.dash.t <= 0) { f.dash = null; f.vx *= .2; f.vz *= .2; } }
    if (I.jump && f.ground && !frozen && f.crouch < .5) { f.vy = JUMP; f.ground = false; snd('jump', f); }
    f.vy -= GRAV * dt; f.y += f.vy * dt;
    moveF(f, f.vx * dt, f.vz * dt);
    const v = Math.hypot(f.vx, f.vz); f.walkT += v * dt;
    if (f.ground && v > 3.6 && !I.walk && f.crouch < .5) { f.footT -= dt; if (f.footT <= 0) { f.footT = .36; f.step = .5; snd('step', f); } }
    if (f.step > 0) f.step -= dt;
    if (f.heal) { f.heal.t -= dt; f.hp = Math.min(100, f.hp + 20 * dt); if (f.heal.t <= 0) f.heal = null; }
    for (const k of ['flash', 'reveal', 'kick']) if (f[k] > 0) f[k] = Math.max(0, f[k] - dt);
    f.recoil = Math.max(0, f.recoil - dt * (f.fireT > 0 ? 1.2 : 4));
  }

  /* ---------- shooting ---------- */
  function spreadOf(f) {
    const G = gun(f), v = Math.hypot(f.vx, f.vz) / SPD; let s = G.spr + G.mv * Math.min(1, v * 1.2) + (f.ground ? 0 : .12) + f.recoil * .6;
    if (f.crouch > .5) s *= .7; if (G.scope && !f.scoped) s += .06; if (G.scope && f.scoped) s = G.spr + G.mv * v * 2 + (f.ground ? 0 : .2);
    return s;
  }
  function viewDir(yaw, pitch) { const cp = Math.cos(pitch); return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp]; }
  // where a fighter can be hit: a head sphere and a body box
  function hitboxes(f) { const e = eyeY(f); return { head: [f.x, e - .02, f.z], hr: .2, mn: [f.x - .3, f.y, f.z - .3], mx: [f.x + .3, e - .2, f.z + .3] }; }
  function castShot(f, d) {
    const o = [f.x, eyeY(f), f.z]; let dist = rayGrid(o[0], o[1], o[2], d[0], d[1], d[2], 120), hit = null;
    for (const w of M.walls) { const t = rayBox(o, d, [w.x0, 0, w.z0], [w.x1, 3, w.z1]); if (t > 0 && t < dist) dist = t; }
    const t2 = other(f); if (t2.alive) { const hb = hitboxes(t2), th = raySphere(o, d, hb.head, hb.hr), tb = rayBox(o, d, hb.mn, hb.mx); if (th > 0 && th < dist) { dist = th; hit = { f: t2, head: true }; } else if (tb > 0 && tb < dist) { dist = tb; hit = { f: t2, head: false }; } }
    return { o, d, dist, hit, end: [o[0] + d[0] * dist, o[1] + d[1] * dist, o[2] + d[2] * dist] };
  }
  function fire(f) {
    const G = gun(f), A = f.ammo[G.k]; if (!f.alive || f.fireT > 0 || f.reloadT > 0 || M.phase === 'buy' || f.plant > 0 || f.defuse > 0) return false;
    if (!A || A.mag <= 0) { if (A && A.res > 0) reload(f); else if (f === me()) snd('dry', f); return false; }
    A.mag--; f.fireT = 60 / G.rpm; const base = spreadOf(f);
    for (let p = 0; p < (G.pel || 1); p++) {
      const a = R() * TAU, r = Math.sqrt(R()) * base, yaw = f.yaw + Math.cos(a) * r, pitch = f.pitch + Math.sin(a) * r + f.recoil * .5;
      const S = castShot(f, viewDir(yaw, pitch));
      fxShot(f, S, p === 0);
      if (S.hit && (f.local || f.bot)) { const fall = lp(1, G.fall, cl((S.dist - 14) / 26, 0, 1)); damage(S.hit.f, Math.round(G.dmg * fall * (S.hit.head ? G.hs : 1)), f, S.hit.head, G.k); }
    }
    f.recoil = Math.min(.12, f.recoil + G.rec); f.kick = .08; if (f === me()) M.camKick += G.rec * (G.scope ? .4 : 1);
    if (G.scope && f.scoped) f.scoped = false;
    net({ t: 'sh', i: M.fs.indexOf(f) });
    snd('shot', f, G.k);
    if (A.mag === 0 && A.res > 0) setTimeout(() => { if (M && f.alive && f.ammo[G.k] && f.ammo[G.k].mag === 0) reload(f); }, 260);
    return true;
  }
  function reload(f) { const G = gun(f), A = f.ammo[G.k]; if (!A || f.reloadT > 0 || A.mag >= G.mag || A.res <= 0) return; f.reloadT = G.rel; f.scoped = false; snd('reload', f); }
  function stepGun(f, dt) {
    if (f.fireT > 0) f.fireT -= dt;
    if (f.reloadT > 0) { f.reloadT -= dt; if (f.reloadT <= 0) { const G = gun(f), A = f.ammo[G.k], n = Math.min(G.mag - A.mag, A.res); A.mag += n; A.res -= n; } }
  }
  function switchTo(f, slot) { if (!f.guns[slot] || f.slot === slot) return; f.slot = slot; f.reloadT = 0; f.scoped = false; f.fireT = Math.max(f.fireT, .35); snd('swap', f); }
  // damage lands on the victim's own device online (the shooter's word is final); shields soak two thirds while they last
  function damage(v, dmg, by, head, wk) {
    if (!v.alive) return;
    if (v.net) { net({ t: 'hit', d: dmg, h: head ? 1 : 0, w: wk }); fxHitMarker(head, by); return; }
    applyDamage(v, dmg, by, head, wk);
  }
  function applyDamage(v, dmg, by, head, wk) {
    if (!v.alive || M.phase === 'end' && !M.planted) return;
    const soak = Math.min(v.sh, Math.round(dmg * .66)); v.sh -= soak; v.hp -= dmg - soak; v.lastHit = { by, head };
    if (by === me() || v === me()) fxHitMarker(head, by, v);
    if (v === me()) { M.hurt = 1; M.hurtDir = Math.atan2(by.x - v.x, by.z - v.z); }
    if (v.hp <= 0) { v.hp = 0; die(v, by, head, wk); }
  }
  function die(v, by, head, wk) {
    v.alive = false; v.deaths++; by.kills++; v.plant = v.defuse = 0; M.feed.unshift({ a: by.name, b: v.name, w: GUNS[wk] ? GUNS[wk].n : wk, head, t: 0, mine: by === me() });
    snd('die', v); if (by === me()) { by.credits = Math.min(9000, by.credits + 200); M.killFx = 1; }
    if (v === me()) M.deathCam = { t: 0, by };
    net({ t: 'dead', i: M.fs.indexOf(v), hs: head ? 1 : 0, w: wk });
    if (M.host) judge();
  }

  /* ---------- abilities ---------- */
  function ability(f, k) {
    if (!f.alive || M.phase !== 'live' || !f.ab[k] || f.plant > 0 || f.defuse > 0) return;
    const op = f.op, d = viewDir(f.yaw, f.pitch); f.ab[k] = 0;
    if (op === 'vex' && k === 'q') { let dx = f.vx, dz = f.vz; const L = Math.hypot(dx, dz); if (L < .5) { dx = -Math.sin(f.yaw); dz = -Math.cos(f.yaw); } else { dx /= L; dz /= L; } f.dash = { t: .17, dx, dz }; snd('blink', f); }
    if (op === 'vex' && k === 'e') { const S = castShot(f, d), dd = Math.min(S.dist, 24) - .5, x = f.x + d[0] * dd, z = f.z + d[2] * dd; throwThing(f, 'smoke', x, z); }
    if (op === 'iris' && k === 'q') { other(f).reveal = 3.2; if (f === me()) M.say = { s: 'RIVAL REVEALED', t: 0 }; snd('ping', f); }
    if (op === 'iris' && k === 'e') { const S = castShot(f, d), dd = Math.min(S.dist - .6, 12); throwThing(f, 'flash', f.x + d[0] * dd, f.z + d[2] * dd, eyeY(f) + d[1] * dd); }
    if (op === 'bastion' && k === 'q') { const fx = -Math.sin(f.yaw), fz = -Math.cos(f.yaw), cx = f.x + fx * 2.6, cz = f.z + fz * 2.6, side = Math.abs(fx) > Math.abs(fz); placeWall(cx, cz, side, f); }
    if (op === 'bastion' && k === 'e') { f.heal = { t: 3 }; snd('heal', f); }
    net({ t: 'ab', i: M.fs.indexOf(f), k });
  }
  function throwThing(f, kind, x, z, y = 1.4) {
    if (f.local || f.bot) net({ t: 'th', kind, x: +x.toFixed(2), z: +z.toFixed(2), y: +y.toFixed(2) });
    if (kind === 'smoke') M.smokes.push({ x, z, r: 0, R: 3.8, t: 12 });
    if (kind === 'flash') M.flares.push({ x, y, z, t: .55, by: f });
    snd(kind === 'smoke' ? 'smoke' : 'throw', f);
  }
  function placeWall(cx, cz, alongX, f) {
    const w = alongX ? { x0: cx - .3, x1: cx + .3, z0: cz - 2.6, z1: cz + 2.6 } : { x0: cx - 2.6, x1: cx + 2.6, z0: cz - .3, z1: cz + .3 };
    w.t = 12; w.grow = 0; M.walls.push(w); if (f.local || f.bot) net({ t: 'wl', cx: +cx.toFixed(2), cz: +cz.toFixed(2), ax: alongX ? 1 : 0 }); snd('wall', f);
  }
  function popFlare(fl) {
    for (const f of M.fs) {
      if (!f.alive) continue; const ex = f.x, ey = eyeY(f), ez = f.z, dx = fl.x - ex, dy = fl.y - ey, dz = fl.z - ez, L = Math.hypot(dx, dy, dz);
      if (L > 26 || los(ex, ey, ez, fl.x, fl.y, fl.z) < L - .3) continue;
      const v = viewDir(f.yaw, f.pitch), dot = (v[0] * dx + v[1] * dy + v[2] * dz) / L; f.flash = Math.max(f.flash, dot > .5 ? 2.4 : dot > 0 ? 1.2 : .35);
    }
    M.flashFx = { x: fl.x, y: fl.y, z: fl.z, t: .3 }; snd('flare', fl.by);
  }
  // how far you can see from a point toward another before a wall, a Rampart or a smoke stops you
  function los(ax, ay, az, bx, by, bz, smoke = true) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz), d = [dx / L, dy / L, dz / L]; let t = rayGrid(ax, ay, az, d[0], d[1], d[2], L);
    for (const w of M.walls) { const tw = rayBox([ax, ay, az], d, [w.x0, 0, w.z0], [w.x1, 3, w.z1]); if (tw > 0 && tw < t) t = tw; }
    if (smoke) for (const s of M.smokes) { if (s.r < 1.5) continue; const ts = raySphere([ax, ay, az], d, [s.x, 1.3, s.z], s.r * .92); const inside = Math.hypot(ax - s.x, az - s.z) < s.r; if (inside) return 0; if (ts > 0 && ts < t) t = ts; }
    return t;
  }
  const canSee = (a, b) => { const e = eyeY(a), L = Math.hypot(b.x - a.x, b.z - a.z); return [eyeY(b) - .05, b.y + 1].some(y => los(a.x, e, a.z, b.x, y, b.z) >= Math.hypot(L, y - e) - .35); };

  /* ---------- the round: plant, defuse, who wins ---------- */
  function stepObjective(f, I, dt) {
    if (!f.alive || M.phase !== 'live') { f.plant = f.defuse = 0; return; }
    const side = sideOf(f);
    if (side === 'att' && !M.planted && I.use && onSite(f.x, f.z) && f.ground) { if (!f.plant) snd('plantStart', f); f.plant += dt; if (f.plant >= PLANT_T) { f.plant = 0; plantAt(f, f.x, f.z); } } else f.plant = 0;
    if (side === 'def' && M.planted && I.use && Math.hypot(f.x - M.planted.x, f.z - M.planted.z) < 1.8 && f.ground) { if (!f.defuse) snd('defuseStart', f); f.defuse += dt; if (f.defuse >= DEFUSE_T) { f.defuse = 0; defused(f); } } else f.defuse = 0;
  }
  function plantAt(f, x, z, remote) {
    M.planted = { x, z, t: FUSE_T, beep: 0 }; f.credits = Math.min(9000, f.credits + 300); M.say = { s: 'CHARGE PLANTED', t: 0, c: '#ff4655' }; snd('planted', f);
    if (!remote) net({ t: 'pl', x: +x.toFixed(2), z: +z.toFixed(2) });
    if (M.host) judge();
  }
  function defused(f, remote) { M.defused = true; M.say = { s: 'CHARGE DEFUSED', t: 0, c: '#3ee6c1' }; snd('defused', f); if (!remote) net({ t: 'df' }); if (M.host) judge(); }
  // the host decides when a round is over
  function judge() {
    if (M.phase !== 'live') return; const A = M.fs.find(f => sideOf(f) === 'att'), D = other(A);
    let w = null, why = '';
    if (M.defused) { w = D; why = 'Charge defused'; }
    else if (M.planted && M.planted.t <= 0) { w = A; why = 'Charge detonated'; }
    else if (!D.alive) { w = A; why = M.planted ? 'Defender eliminated' : 'Defender eliminated'; }
    else if (!A.alive && !M.planted) { w = D; why = 'Attacker eliminated'; }
    else if (M.t <= 0 && !M.planted) { w = D; why = 'Time ran out'; }
    if (w) endRound(M.fs.indexOf(w), why);
  }
  function endRound(wi, why, remote) {
    if (M.phase === 'end') return; M.phase = 'end'; M.t = END_T; M.wins[wi]++; M.last = { wi, why };
    if (!remote) net({ t: 'end', wi, why });
    M.fs.forEach((f, i) => { const won = i === wi; f.lossRun = won ? 0 : f.lossRun + 1; f.credits = Math.min(9000, f.credits + (won ? 2600 : Math.min(2900, 1900 + (f.lossRun - 1) * 500))); });
    snd(wi === 0 ? 'win' : 'lose'); if (M.planted && why === 'Charge detonated') M.boom = 1;
  }
  function startRound(n) {
    M.round = n; M.phase = 'buy'; M.t = BUY_T; M.planted = null; M.defused = false; M.smokes = []; M.walls = []; M.flares = []; M.feed = []; M.boom = 0; M.say = null; M.deathCam = null;
    M.fs.forEach((f, i) => {
      const side = sideOf(f), sp = spawns[side === 'att' ? 'A' : 'D'], p = sp[(i + n) % sp.length];
      if (!f.alive || n === 1 || n === 5 || (n === 9)) { f.guns = { 1: null, 2: 'pip' }; f.sh = 0; f.ammo = {}; }
      if (n === 5 || n === 9) f.credits = 800;
      f.x = p[0] + rnd(-.3, .3); f.z = p[1] + rnd(-.3, .3); f.y = 0; f.vx = f.vz = f.vy = 0; f.hp = 100; f.alive = true; f.ab = { q: 1, e: 1 }; f.flash = f.reveal = 0; f.heal = f.dash = null; f.plant = f.defuse = 0; f.scoped = false; f.reloadT = 0; f.fireT = 0;
      for (const s of [1, 2]) if (f.guns[s]) giveAmmo(f, f.guns[s]); f.slot = f.guns[1] ? 1 : 2;
      f.yaw = Math.atan2(-(siteC[0] - f.x), -(siteC[1] - f.z)); f.pitch = 0; f.carrying = side === 'att';
      if (f.bot) f.bot.plan = null;
    });
    if (n === 5) M.say = { s: 'SIDES SWAPPED', t: 0 }; if (n === 9) M.say = { s: 'DECIDER', t: 0 };
    snd('round');
  }
  function buy(f, k) {
    if (M.phase !== 'buy') return false;
    const G = GUNS[k], A = ARMOR.find(a => a.k === k);
    if (G) { if (f.credits < G.cost || f.guns[G.slot] === k) return false; f.credits -= G.cost; f.guns[G.slot] = k; giveAmmo(f, k); f.slot = G.slot; snd('buy', f); net({ t: 'by', g: f.guns }); return true; }
    if (A) { if (f.credits < A.cost || f.sh >= A.sh) return false; f.credits -= A.cost; f.sh = A.sh; snd('buy', f); return true; }
    return false;
  }

  /* ---------- the bot: paths over the grid, holds angles, peeks, reacts like a person ---------- */
  function bfs(si, sj, ti, tj) {
    const key = (i, j) => j * GWc + i, prev = new Int32Array(GWc * GHc).fill(-2), q = [key(si, sj)]; prev[q[0]] = -1;
    for (let h = 0; h < q.length; h++) { const k = q[h], i = k % GWc, j = (k / GWc) | 0; if (i === ti && j === tj) break; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + a, nj = j + b; if (!walk(ni, nj)) continue; const nk = key(ni, nj); if (prev[nk] !== -2) continue; prev[nk] = k; q.push(nk); } }
    const out = []; let k = key(ti, tj); if (prev[k] === -2) return out; while (k !== -1) { out.unshift([(k % GWc) * CS + 1, ((k / GWc) | 0) * CS + 1]); k = prev[k]; } return out;
  }
  const cellOf = (x, z) => [cl(Math.floor(x / CS), 0, GWc - 1), cl(Math.floor(z / CS), 0, GHc - 1)];
  const LANES = [[28, 8], [27, 19], [29, 32]];   // the three ways into the site, in metres
  const walkCells = []; MAP.forEach((r, j) => [...r].forEach((ch, i) => { if (!HT[ch]) walkCells.push([i * CS + 1, j * CS + 1]); }));
  function pathTo(f, x, z) { const [a, b] = cellOf(f.x, f.z), [c, d] = cellOf(x, z); let p = bfs(a, b, c, d); if (!p.length) { const n = walkCells.reduce((m, q) => Math.hypot(q[0] - x, q[1] - z) < Math.hypot(m[0] - x, m[1] - z) ? q : m); const [e, g] = cellOf(n[0], n[1]); p = bfs(a, b, e, g); } return p; }
  function holdSpot(nearX, nearZ, rMin, rMax, lookX, lookZ) {
    const c = walkCells.filter(q => { const d = Math.hypot(q[0] - nearX, q[1] - nearZ); return d >= rMin && d <= rMax && los(q[0], 1.5, q[1], lookX, 1, lookZ, false) >= Math.hypot(q[0] - lookX, q[1] - lookZ) - 1; });
    return c.length ? pick(c) : [nearX, nearZ];
  }
  function botBuy(f) {
    const c = f.credits, B = f.bot, D = DIFF[B.diff];
    if (c >= 3900) { buy(f, R() < .2 * D.spray + .1 && c >= 4500 ? 'longbow' : 'lancer'); buy(f, 'heavy'); }
    else if (c >= 3000 && R() < .5) buy(f, 'lancer');
    else if (c >= 1900) { buy(f, R() < .6 ? 'hornet' : 'breaker'); buy(f, 'light'); }
    else if (c >= 400 && M.round !== 1 && M.round !== 5) buy(f, 'light');
    else if (c >= 400 && R() < .5) buy(f, 'light');
  }
  function botThink(f, dt) {
    const B = f.bot, D = DIFF[B.diff], e = other(f), side = sideOf(f), I = { mx: 0, mz: 0, walk: false, crouch: false, jump: false, use: false, fire: false };
    if (!f.alive) return I;
    if (M.phase === 'buy') { if (!B.bought) { B.bought = true; botBuy(f); } return I; }
    B.bought = false;
    // what the bot knows: sight, sound, a Ping
    const sees = e.alive && canSee(f, e), dE = Math.hypot(e.x - f.x, e.z - f.z), toE = Math.atan2(-(e.x - f.x), -(e.z - f.z)), inFov = Math.abs(angDiff(toE, f.yaw)) < 1.15 || dE < 5;
    if (sees && inFov) { B.seen = (B.seen || 0) + dt; B.last = { x: e.x, z: e.z, t: M.t }; } else B.seen = 0;
    if (e.alive && (e.step > 0 && dE < 22 || f.reveal > 0 && false || e.reveal > 0 && f.op === 'iris')) B.last = { x: e.x, z: e.z, t: M.t };
    // plans
    if (!B.plan) {
      if (side === 'att') { const lane = pick(LANES), s = pick(site); B.plan = { k: 'push', path: [...pathTo(f, lane[0], lane[1]), ...[]], goal: s, smoke: R() < .7 }; B.plan.path2 = null; }
      else { const lk = pick(LANES), h = holdSpot(siteC[0], siteC[1], 3, 10, lk[0], lk[1]); B.plan = { k: 'hold', path: pathTo(f, h[0], h[1]), look: lk }; }
    }
    const P = B.plan;
    if (M.planted && side === 'def' && P.k !== 'defuse') { B.plan = { k: 'defuse', path: pathTo(f, M.planted.x, M.planted.z) }; }
    if (M.planted && side === 'att' && P.k !== 'post') { const h = holdSpot(M.planted.x, M.planted.z, 5, 12, M.planted.x, M.planted.z); B.plan = { k: 'post', path: pathTo(f, h[0], h[1]), look: [M.planted.x, M.planted.z] }; }
    // aim: at the rival when seen (after reacting), else where the path or the hold looks
    let tYaw = f.yaw, tPitch = 0, engaged = false;
    if (sees && inFov && B.seen > D.react * (B.diff === 2 ? 1 : 1.2)) {
      engaged = true; if (!B.aimHead || B.newTgt) { B.aimHead = R() < D.hs; B.newTgt = false; B.err = [rnd(-1, 1) * D.err * 2.2, rnd(-1, 1) * D.err * 2.2]; }
      B.err[0] *= Math.pow(.25, dt); B.err[1] *= Math.pow(.25, dt);
      const ty = B.aimHead ? eyeY(e) - .02 : e.y + 1.05, ey = eyeY(f); tYaw = toE + B.err[0]; tPitch = Math.atan2(ty - ey, dE) + B.err[1];
    } else { if (!sees) B.newTgt = true;
      const lookAt = B.last && M.t - B.last.t > -6 && B.last.t - M.t < 6 ? [B.last.x, B.last.z] : P.look || (P.path && P.path[0]) || [e.x, e.z];
      tYaw = Math.atan2(-(lookAt[0] - f.x), -(lookAt[1] - f.z)); }
    const rate = (3.5 + B.diff * 2.2) * dt; f.yaw += cl(angDiff(tYaw, f.yaw), -rate, rate); f.pitch += cl(tPitch - f.pitch, -rate * .6, rate * .6);
    // shoot when the crosshair is close enough
    if (engaged) { const off = Math.abs(angDiff(tYaw - B.err[0], f.yaw)) + Math.abs(tPitch - B.err[1] - f.pitch); const G = gun(f); if (off < spreadOf(f) * 2 + .04 + (G.pel ? .05 : 0) && (!G.scope || R() < .5)) { I.fire = true; if (G.scope) f.scoped = true; } }
    if (gun(f).k === 'pip' && f.guns[1]) switchTo(f, 1);
    // abilities
    if (M.phase === 'live') {
      if (f.op === 'vex' && f.ab.e && side === 'att' && P.k === 'push' && P.path && P.path.length < 7 && P.smoke) { const s0 = holdSpot(siteC[0], siteC[1], 0, 6, f.x, f.z); f.yaw = Math.atan2(-(s0[0] - f.x), -(s0[1] - f.z)); f.pitch = -.05; ability(f, 'e'); }
      if (f.op === 'vex' && f.ab.q && engaged && f.hp < 45) ability(f, 'q');
      if (f.op === 'iris' && f.ab.q && M.t < ROUND_T - 12) ability(f, 'q');
      if (f.op === 'iris' && f.ab.e && !sees && B.last && Math.hypot(B.last.x - f.x, B.last.z - f.z) < 14 && R() < dt * .8) { f.yaw = Math.atan2(-(B.last.x - f.x), -(B.last.z - f.z)) + Math.PI * .5; ability(f, 'e'); }
      if (f.op === 'bastion' && f.ab.q && engaged && f.hp < 70 && !f.wallUsed) { ability(f, 'q'); }
      if (f.op === 'bastion' && f.ab.e && f.hp < 60 && !sees) ability(f, 'e');
    }
    // move along the path; strafe a little while fighting with a spray weapon, hold still with a rifle
    let goal = null;
    if (P.path && P.path.length) { goal = P.path[0]; if (Math.hypot(goal[0] - f.x, goal[1] - f.z) < .7) P.path.shift(); }
    else if (P.k === 'push' && !P.path2) { P.path2 = true; P.path = pathTo(f, P.goal[0], P.goal[1]); }
    if (engaged) { goal = null; const G = gun(f); if (G.auto && G.k !== 'lancer') { B.str = (B.str || 1) * (R() < dt * 1.5 ? -1 : 1); I.mx = B.str * .7; } if (B.diff > 0 && R() < dt * .5) B.crouchT = 1.2; }
    if (B.crouchT > 0) { B.crouchT -= dt; I.crouch = true; }
    if (goal) { const want = Math.atan2(-(goal[0] - f.x), -(goal[1] - f.z)), da = angDiff(want, f.yaw); I.mz = Math.cos(da); I.mx = -Math.sin(da); if (sees === false && P.k === 'hold' && !P.path.length) I.walk = true; }
    // the objective
    if (side === 'att' && !M.planted && onSite(f.x, f.z) && !sees && (!P.path || !P.path.length)) { I.mx = I.mz = 0; I.use = true; }
    if (side === 'def' && M.planted && Math.hypot(f.x - M.planted.x, f.z - M.planted.z) < 1.5 && (!sees || M.planted.t < DEFUSE_T + 1)) { I.mx = I.mz = 0; I.use = true; }
    if (I.fire && !gun(f).auto) { if (B.semi > 0) I.fire = false; B.semi = .12 + .25 * (1 - D.spray); }
    if (B.semi > 0) B.semi -= dt;
    return I;
  }

  /* ---------- online: stream yourself, believe the shooter, the host keeps the clock ---------- */
  const net = m => { if (M && M.online) MP.send(m); };
  let sendT = 0;
  function netTick(dt) {
    if (!M.online) return; sendT -= dt; if (sendT > 0) return; sendT = 1 / 20; const f = me();
    MP.send({ t: 's', x: +f.x.toFixed(2), y: +f.y.toFixed(2), z: +f.z.toFixed(2), yw: +f.yaw.toFixed(3), pt: +f.pitch.toFixed(3), cr: +f.crouch.toFixed(2), sl: f.slot, g: f.guns[f.slot], hp: f.hp, sh: f.sh, al: f.alive ? 1 : 0, vx: +f.vx.toFixed(1), vz: +f.vz.toFixed(1), st: f.step > 0 ? 1 : 0, pl: f.plant > 0 ? 1 : 0, df: f.defuse > 0 ? 1 : 0, sc: f.scoped ? 1 : 0, op: f.op });
  }
  function onMsg(m) {
    if (!M || !M.online) return; const F = foe();
    if (m.t === 's') { F.tgt = m; F.op = m.op || F.op; F.hp = m.hp; F.sh = m.sh; F.slot = m.sl; if (m.g) F.guns[m.sl] = m.g; F.crouch = m.cr; F.step = m.st ? .3 : 0; F.plant = m.pl ? 1 : 0; F.defuse = m.df ? 1 : 0; F.scoped = !!m.sc; if (!m.al && F.alive && M.phase === 'live') { F.alive = false; } if (m.al && !F.alive && M.phase === 'buy') F.alive = true; }
    if (m.t === 'sh') { const S = castShot(F, viewDir(F.yaw, F.pitch)); fxShot(F, S, true); snd('shot', F, gun(F).k); }
    if (m.t === 'hit') applyDamage(me(), m.d, F, !!m.h, m.w);
    if (m.t === 'dead') { if (F.alive) { F.alive = false; F.deaths++; me().kills++; me().credits = Math.min(9000, me().credits + 200); M.feed.unshift({ a: me().name, b: F.name, w: GUNS[m.w] ? GUNS[m.w].n : m.w, head: !!m.hs, t: 0, mine: true }); M.killFx = 1; snd('die', F); } if (M.host) judge(); }
    if (m.t === 'th') { if (m.kind === 'smoke') M.smokes.push({ x: m.x, z: m.z, r: 0, R: 3.8, t: 12 }); else M.flares.push({ x: m.x, y: m.y, z: m.z, t: .55, by: F }); snd(m.kind === 'smoke' ? 'smoke' : 'throw', F); }
    if (m.t === 'wl') { const w = m.ax ? { x0: m.cx - .3, x1: m.cx + .3, z0: m.cz - 2.6, z1: m.cz + 2.6 } : { x0: m.cx - 2.6, x1: m.cx + 2.6, z0: m.cz - .3, z1: m.cz + .3 }; w.t = 12; w.grow = 0; M.walls.push(w); snd('wall', F); }
    if (m.t === 'pl') plantAt(F, m.x, m.z, true);
    if (m.t === 'df') defused(F, true);
    if (m.t === 'end' && !M.host) endRound(1 - m.wi, m.why, true);
    if (m.t === 'rs' && !M.host) startRound(m.n);
    if (m.t === 'live' && !M.host) { M.phase = 'live'; M.t = ROUND_T; snd('go'); }
    if (m.t === 'over' && !M.host) matchOver();
  }
  Object.assign(MP.opts, {
    max: 2, min: 2, bots: 0, solo: 'Duel the bot',
    config: () => ({ v: 1 }),
    onStart: (cfg, ros) => startMatch(ros),
    onMsg,
    onLeave: () => { if (M && M.online && mode === 'play') { M.say = { s: 'Your rival left the duel', t: 0 }; M.wins[0] = ROUNDS_TO_WIN; matchOver(); } },
  });

  /* ---------- a match ---------- */
  function startMatch(ros) {
    const online = MP.online() && ros && ros.length > 1, mine = online ? ros.findIndex(r => r.id === MP.id) : 0;
    const A = fighter({ name: online ? ros[mine].name : (MP.name || 'You'), op: selOp, local: true }), Bf = online ? fighter({ name: ros[1 - mine].name, op: 'vex', net: true }) : fighter({ name: pick(['Rook', 'Kestrel', 'Nyx', 'Talon', 'Mercer', 'Sable']), op: pick(Object.keys(OPS)), bot: { diff: selDiff } });
    M = { fs: [A, Bf], wins: [0, 0], round: 0, phase: 'buy', t: 0, planted: null, smokes: [], walls: [], flares: [], feed: [], online, host: !online || MP.isHost(), att0: online ? (mine === 0 ? 0 : 1) : (R() < .5 ? 0 : 1), decider: R() < .5 ? 0 : 1, camKick: 0, hurt: 0, acc: 0, buyOpen: true };
    mode = 'play'; startRound(1); if (M.host) net({ t: 'rs', n: 1 });
    buildMap(); lockMouse();
  }
  function matchOver() {
    if (mode === 'over') return; mode = 'over'; const w = M.wins[0] >= M.wins[1]; K.score = M.wins[0]; unlockMouse();
    try { if (window.parent !== window && !M.online) window.parent.postMessage({ pbx: 'score', score: M.wins[0] * 10 + (w ? 50 : 0) }, location.origin); } catch (e) {}
    if (M.host) net({ t: 'over' }); snd(w ? 'win' : 'lose');
  }
  function tick(dt) {
    if (!M || mode !== 'play') return;
    M.t -= dt;
    if (M.phase === 'buy' && M.t <= 0 && M.host) { M.phase = 'live'; M.t = ROUND_T; net({ t: 'live' }); snd('go'); M.buyOpen = false; }
    if (M.phase === 'live') { if (M.planted) { M.planted.t -= dt; M.planted.beep -= dt; if (M.planted.beep <= 0) { M.planted.beep = cl(M.planted.t / 12, .12, 1); snd('beep'); } } if (M.host) judge(); }
    if (M.phase === 'end' && M.t <= 0 && M.host) {
      if (M.wins[0] >= ROUNDS_TO_WIN || M.wins[1] >= ROUNDS_TO_WIN) return matchOver();
      startRound(M.round + 1); net({ t: 'rs', n: M.round });
    }
    // bodies, guns, the objective
    for (const f of M.fs) {
      let I;
      if (f.local) I = localInput(f); else if (f.bot) I = botThink(f, dt); else { netFollow(f, dt); continue; }
      stepBody(f, I, dt); stepGun(f, dt); stepObjective(f, I, dt);
      if (I.fire && M.phase === 'live') { const G = gun(f); if (G.auto || !f.semiHeld) fire(f); }
      f.semiHeld = !!I.fire;
    }
    for (const s of M.smokes) { s.t -= dt; s.r = s.t > 11.4 ? lp(0, s.R, (12 - s.t) / .6) : s.t < 1 ? s.R * s.t : s.R; } M.smokes = M.smokes.filter(s => s.t > 0);
    for (const w of M.walls) { w.t -= dt; w.grow = Math.min(1, w.grow + dt * 4); } M.walls = M.walls.filter(w => w.t > 0);
    for (const fl of M.flares) { fl.t -= dt; if (fl.t <= 0) popFlare(fl); } M.flares = M.flares.filter(fl => fl.t > 0);
    for (const k of M.feed) k.t += dt; M.feed = M.feed.filter(k => k.t < 6).slice(0, 4);
    if (M.say) { M.say.t += dt; if (M.say.t > 2.6) M.say = null; }
    M.camKick *= Math.pow(.02, dt); M.hurt = Math.max(0, M.hurt - dt * 1.5); if (M.killFx) M.killFx = Math.max(0, M.killFx - dt * 2); if (M.deathCam) M.deathCam.t += dt;
    netTick(dt);
  }
  function netFollow(f, dt) {
    const m = f.tgt; if (!m) return; const k = Math.min(1, dt * 14);
    f.x += (m.x - f.x) * k; f.y += (m.y - f.y) * k; f.z += (m.z - f.z) * k; f.yaw += angDiff(m.yw, f.yaw) * k; f.pitch += (m.pt - f.pitch) * k; f.vx = m.vx; f.vz = m.vz; f.walkT += Math.hypot(f.vx, f.vz) * dt;
    for (const kk of ['flash', 'reveal', 'kick']) if (f[kk] > 0) f[kk] = Math.max(0, f[kk] - dt);
  }

  /* ---------- 3D: loaded at runtime ---------- */
  let ready = false, failed = false, X = null;
  const script = u => new Promise((res, rej) => { const s = document.createElement('script'); s.src = u; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  (async () => { try { await script('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'); init3D(); ready = true; } catch (e) { console.error(e); failed = true; } })();
  const touch = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  function canvasTex(w, h, fn, rep = [1, 1]) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = X ? X.aniso : 4; t.encoding = THREE.sRGBEncoding; return t; }
  const noiseFill = (g, w, h, base, amt, n = 4000) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const v = R(); g.fillStyle = v < .5 ? `rgba(0,0,0,${amt * R()})` : `rgba(255,255,255,${amt * .6 * R()})`; g.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); } };
  function init3D() {
    const low = touch(), glc = document.createElement('canvas'); glc.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;background:#0b0f17';
    const cv = document.getElementById('cv'); cv.parentNode.insertBefore(glc, cv);
    const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: !low, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1.25 : 1.75)); renderer.setSize(innerWidth, innerHeight, false);
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    if (!low) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#9fc4e8'); scene.fog = new THREE.Fog('#b9d2ea', 40, 120);
    const camera = new THREE.PerspectiveCamera(78, innerWidth / innerHeight, .05, 300); scene.add(camera);
    scene.add(new THREE.HemisphereLight('#dcecff', '#6b5a48', .62));
    const sun = new THREE.DirectionalLight('#fff1d6', 1.55); sun.position.set(MW * .35, 60, MH * .15); sun.target.position.set(MW / 2, 0, MH / 2); scene.add(sun, sun.target);
    if (!low) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -40; sc.right = 40; sc.top = 30; sc.bottom = -30; sc.near = 10; sc.far = 140; sun.shadow.bias = -.0005; sun.shadow.normalBias = .03; sc.updateProjectionMatrix(); }
    X = { renderer, scene, camera, glc, low, aniso: Math.min(8, renderer.capabilities.getMaxAnisotropy()), built: false, agents: new Map(), fx: [], t: 0 };
    addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
    buildMap();
  }
  function buildMap() {
    if (!X || X.built) return; X.built = true; const { scene } = X, sh = !X.low;
    // floor: worn concrete tiles
    const floorT = canvasTex(512, 512, (g, w, h) => { noiseFill(g, w, h, '#8f8a80', .12, 9000); g.strokeStyle = 'rgba(40,36,30,.35)'; g.lineWidth = 3; for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * 128, 0); g.lineTo(k * 128, h); g.moveTo(0, k * 128); g.lineTo(w, k * 128); g.stroke(); } for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(30,26,20,${.05 + R() * .08})`; g.beginPath(); g.ellipse(R() * w, R() * h, 20 + R() * 60, 10 + R() * 40, R() * 3, 0, 7); g.fill(); } }, [MW / 8, MH / 8]);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(MW, MH), new THREE.MeshStandardMaterial({ map: floorT, roughness: .92 })); floor.rotation.x = -Math.PI / 2; floor.position.set(MW / 2, 0, MH / 2); floor.receiveShadow = sh; scene.add(floor);
    // walls: warm plaster with a darker base band and panel lines; tall crates: painted steel; low crates: wood
    const wallT = canvasTex(256, 512, (g, w, h) => { noiseFill(g, w, h, '#d9c9b0', .08, 4000); g.fillStyle = '#7d6e5e'; g.fillRect(0, h * .82, w, h * .18); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, h * .815, w, 4); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(w - 3, 0, 3, h); g.fillStyle = '#b5523f'; g.fillRect(0, h * .3, w, 10); }, [1, 1]);
    const steelT = canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, '#4f6f8f', .1, 3000); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); for (let k = 1; k < 6; k++) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(k * w / 6, 10, 6, h - 20); } g.fillStyle = '#ffd23f'; g.font = 'bold 40px monospace'; g.fillText('DP-07', 40, 140); });
    const woodT = canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, '#a87a4a', .12, 2500); for (let k = 0; k < 8; k++) { g.fillStyle = 'rgba(60,35,15,.35)'; g.fillRect(0, k * 32, w, 3); } g.strokeStyle = 'rgba(60,35,15,.6)'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12); g.beginPath(); g.moveTo(10, 10); g.lineTo(w - 10, h - 10); g.stroke(); });
    const mats = { '#': new THREE.MeshStandardMaterial({ map: wallT, roughness: .95 }), C: new THREE.MeshStandardMaterial({ map: steelT, roughness: .6, metalness: .35 }), c: new THREE.MeshStandardMaterial({ map: woodT, roughness: .85 }) };
    for (const ch of ['#', 'C', 'c']) {
      const cells = []; MAP.forEach((r, j) => [...r].forEach((cc, i) => { if (cc === ch) cells.push([i, j]); }));
      const h = HT[ch], geo = new THREE.BoxGeometry(CS, h, CS), m = new THREE.InstancedMesh(geo, mats[ch], cells.length), o = new THREE.Object3D();
      cells.forEach(([i, j], k) => { o.position.set(i * CS + 1, h / 2, j * CS + 1); o.rotation.y = ch === '#' ? 0 : ((i * 7 + j * 3) % 4) * Math.PI / 2; o.updateMatrix(); m.setMatrixAt(k, o.matrix); });
      m.castShadow = m.receiveShadow = sh; scene.add(m);
    }
    // the site: a red painted zone with hazard edging and the emblem
    const siteT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = 'rgba(255,70,85,.28)'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,70,85,.7)'; for (let k = -w; k < w * 2; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 16, 0); g.lineTo(k - h + 16, h); g.lineTo(k - h, h); g.fill(); } g.clearRect(12, 12, w - 24, h - 24); g.fillStyle = 'rgba(255,70,85,.22)'; g.fillRect(12, 12, w - 24, h - 24); });
    for (const [x, z] of site) { const p = new THREE.Mesh(new THREE.PlaneGeometry(CS, CS), new THREE.MeshBasicMaterial({ map: siteT, transparent: true, depthWrite: false })); p.rotation.x = -Math.PI / 2; p.position.set(x, .02, z); scene.add(p); }
    const emT = canvasTex(256, 256, (g, w, h) => { g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 14; g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w - 20, h / 2); g.lineTo(w / 2, h - 20); g.lineTo(20, h / 2); g.closePath(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(w / 2, h / 2, 28, 0, 7); g.fill(); });
    const em = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: emT, transparent: true, depthWrite: false })); em.rotation.x = -Math.PI / 2; em.position.set(siteC[0], .03, siteC[1]); scene.add(em);
    // spawn barriers (only during the buy phase) and some lamps on the walls
    X.barriers = new THREE.Group(); for (const [x, z] of [...spawns.A, ...spawns.D]) { const b = new THREE.Mesh(new THREE.BoxGeometry(CS, 3, CS), new THREE.MeshBasicMaterial({ color: '#3ee6c1', transparent: true, opacity: .06, depthWrite: false })); b.position.set(x, 1.5, z); X.barriers.add(b); } X.scene.add(X.barriers);
    // dynamic bits
    X.smokeMat = new THREE.MeshLambertMaterial({ color: '#b9b2d8', transparent: true, opacity: .93, depthWrite: false });
    X.smokes = []; X.walls = []; X.tracers = []; X.sparks = [];
    X.wallMat = new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#a85a10', emissiveIntensity: .6, roughness: .5, transparent: true, opacity: .88 });
    X.charge = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(.22, .26, .32, 16), new THREE.MeshStandardMaterial({ color: '#2a2e38', roughness: .4, metalness: .6 })); body.position.y = .16; X.charge.add(body);
    X.chargeLight = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff4655' })); X.chargeLight.position.y = .36; X.charge.add(X.chargeLight);
    X.chargePL = new THREE.PointLight('#ff4655', 0, 6); X.chargePL.position.y = .6; X.charge.add(X.chargePL); X.charge.visible = false; scene.add(X.charge);
    X.muzzle = new THREE.PointLight('#ffcf8a', 0, 9); scene.add(X.muzzle);
    X.flashL = new THREE.PointLight('#ffffff', 0, 30); scene.add(X.flashL);
    X.view = new THREE.Group(); X.camera.add(X.view); X.viewGun = null; X.viewKey = '';
    X.mflash = new THREE.Mesh(new THREE.PlaneGeometry(.22, .22), new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(.4, 'rgba(255,190,90,.8)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  }
  // a fighter: helmet with a glowing visor in the operative's colour, a vest, two arms holding the gun, legs that walk
  function agentModel(f) {
    const G = new THREE.Group(), op = OPS[f.op] || OPS.vex, suit = new THREE.MeshStandardMaterial({ color: '#2b3140', roughness: .7 }), vest = new THREE.MeshStandardMaterial({ color: op.col, roughness: .55 }), skin = new THREE.MeshStandardMaterial({ color: '#c8916a', roughness: .7 });
    const glow = new THREE.MeshBasicMaterial({ color: op.col });
    const part = (geo, mat, x, y, z, par = G) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; par.add(m); return m; };
    const hip = new THREE.Group(); hip.position.y = .92; G.add(hip);
    const legL = new THREE.Group(), legR = new THREE.Group(); legL.position.set(-.13, 0, 0); legR.position.set(.13, 0, 0); hip.add(legL, legR);
    for (const L of [legL, legR]) { part(new THREE.BoxGeometry(.17, .5, .2), suit, 0, -.25, 0, L); part(new THREE.BoxGeometry(.18, .44, .2), suit, 0, -.68, 0, L); part(new THREE.BoxGeometry(.2, .1, .3), new THREE.MeshStandardMaterial({ color: '#15171c' }), 0, -.88, -.04, L); }
    const torso = new THREE.Group(); hip.add(torso);
    part(new THREE.BoxGeometry(.46, .56, .28), suit, 0, .3, 0, torso); part(new THREE.BoxGeometry(.5, .4, .32), vest, 0, .36, 0, torso);
    const head = new THREE.Group(); head.position.set(0, .72, 0); torso.add(head);
    part(new THREE.SphereGeometry(.15, 16, 12), skin, 0, 0, 0, head); part(new THREE.SphereGeometry(.17, 16, 10, 0, TAU, 0, Math.PI * .55), suit, 0, .03, 0, head); part(new THREE.BoxGeometry(.26, .06, .05), glow, 0, .01, -.15, head);
    const arms = new THREE.Group(); arms.position.set(0, .5, 0); torso.add(arms);
    part(new THREE.BoxGeometry(.12, .12, .5), suit, -.2, 0, -.2, arms); part(new THREE.BoxGeometry(.12, .12, .5), suit, .2, -.02, -.22, arms);
    const gunM = part(new THREE.BoxGeometry(.08, .12, .62), new THREE.MeshStandardMaterial({ color: '#1d2027', metalness: .5, roughness: .4 }), .05, .02, -.55, arms);
    G.userData = { hip, legL, legR, torso, head, arms, gunM };
    X.scene.add(G); return G;
  }
  // first-person guns: a few boxes and cylinders each, in the weapon's colour
  function viewGun(k) {
    const G = new THREE.Group(), W = GUNS[k], dark = new THREE.MeshStandardMaterial({ color: '#23262e', metalness: .55, roughness: .38 }), acc = new THREE.MeshStandardMaterial({ color: W.col, metalness: .3, roughness: .45 }), grip = new THREE.MeshStandardMaterial({ color: '#15161a', roughness: .8 });
    const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); G.add(o); return o; };
    const cyl = (r, l, m, x, y, z) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 12), m); o.rotation.x = Math.PI / 2; o.position.set(x, y, z); G.add(o); return o; };
    const L = k === 'pip' ? .26 : k === 'hornet' ? .4 : k === 'breaker' ? .62 : k === 'lancer' ? .66 : .86;
    box(.07, .09, L, dark, 0, 0, -L / 2); box(.072, .03, L * .7, acc, 0, .055, -L * .45); cyl(k === 'breaker' ? .028 : .016, L * .55, dark, 0, .01, -L - L * .2);
    box(.05, .12, .06, grip, 0, -.09, -.06); if (k !== 'pip') { box(.045, .13, .07, acc, 0, -.1, -L * .5); box(.06, .08, .22, dark, 0, -.01, .1); }
    if (k === 'longbow') { cyl(.03, .3, dark, 0, .1, -L * .45); const lens = cyl(.031, .01, new THREE.MeshBasicMaterial({ color: '#7fe3ff' }), 0, .1, -L * .45 - .15); lens; }
    const hand = new THREE.MeshStandardMaterial({ color: '#2b3140', roughness: .7 }); box(.09, .09, .3, hand, .02, -.11, .12); box(.08, .08, .26, hand, -.07, -.05, -L * .55);
    G.userData.len = L; return G;
  }
  // effects
  function fxShot(f, S, main) {
    if (!X) return;
    const isMe = f === me(), from = isMe ? null : [f.x - Math.sin(f.yaw) * .5, eyeY(f) - .25, f.z - Math.cos(f.yaw) * .5];
    X.tracers.push({ a: from || [S.o[0], S.o[1] - .15, S.o[2]], b: S.end, t: .06, me: isMe });
    if (main) { X.muzzle.position.set(...(from || S.o)); X.muzzle.intensity = 4; if (isMe) X.flashT = .05; else f.mflash = .06; }
    if (!S.hit) for (let i = 0; i < 4; i++) X.sparks.push({ p: [...S.end], v: [rnd(-2, 2), rnd(0, 3), rnd(-2, 2)], t: .25 });
    else for (let i = 0; i < 6; i++) X.sparks.push({ p: [...S.end], v: [rnd(-1.5, 1.5), rnd(-1, 2), rnd(-1.5, 1.5)], t: .3, blood: 1 });
  }
  function fxHitMarker(head, by, v) { if (by === me()) { M.hitMark = { t: .25, head, kill: v && v.hp <= 0 }; snd(head ? 'headshot' : 'hit'); } }
  // sound: little synth hits through the kit, quieter with distance
  function snd(k, f, g) {
    if (!M && k !== 'buy') return; const d = f && M ? Math.hypot(f.x - me().x, f.z - me().z) : 0, v = cl(1 - d / 45, .08, 1), mine = !f || f === me();
    if (k === 'shot') { const big = g === 'longbow' || g === 'breaker'; K.noise(big ? .22 : .09, (big ? .32 : .2) * v, big ? 300 : 900); K.sfx(big ? 70 : 130, .09, 'square', .07 * v, -60); }
    else if (k === 'step') { if (!mine) K.noise(.04, .09 * v, 2200); }
    else if (k === 'reload') K.sfx(520, .05, 'square', .04 * v, 0, .1), K.sfx(380, .05, 'square', .04 * v, 0, .6);
    else if (k === 'hit') K.sfx(1600, .04, 'square', .05); else if (k === 'headshot') { K.sfx(2200, .05, 'square', .06); K.sfx(2900, .05, 'square', .05, 0, .05); }
    else if (k === 'die') K.sfx(220, .5, 'sawtooth', .07 * v, -150);
    else if (k === 'beep') K.sfx(1800, .06, 'square', .05);
    else if (k === 'planted') { K.chime(392, [0, 6, 12]); } else if (k === 'defused') K.chime(523, [0, 4, 7, 12]);
    else if (k === 'win') K.chime(523, [0, 4, 7, 12, 16]); else if (k === 'lose') K.sfx(260, .6, 'triangle', .07, -120);
    else if (k === 'round' || k === 'go') K.sfx(k === 'go' ? 880 : 440, .15, 'triangle', .07);
    else if (k === 'buy') K.sfx(990, .05, 'square', .05);
    else if (k === 'flare') K.noise(.3, .25 * v, 3000); else if (k === 'smoke') K.noise(.6, .12 * v, 400);
    else if (k === 'blink') K.sfx(600, .15, 'sine', .06 * v, 900); else if (k === 'ping') K.sfx(1200, .3, 'sine', .06, -600);
    else if (k === 'wall') K.sfx(90, .3, 'sawtooth', .06 * v, 80); else if (k === 'heal') K.chime(660, [0, 7]);
    else if (k === 'dry') K.sfx(300, .03, 'square', .03); else if (k === 'swap') K.sfx(700, .03, 'square', .03);
    else if (k === 'plantStart' || k === 'defuseStart') K.sfx(600, .1, 'square', .05 * v);
    else if (k === 'jump') { if (!mine) K.noise(.05, .06 * v, 1500); }
  }
  function render(dt) {
    if (!X || !X.built) return; const cam = X.camera; X.t += dt;
    const live = M && (mode === 'play' || mode === 'over');
    if (!live) { // the menu: a slow flight round the map
      const a = X.t * .08; cam.position.set(MW / 2 + Math.cos(a) * 30, 22, MH / 2 + Math.sin(a) * 22); cam.lookAt(MW / 2, 0, MH / 2); cam.fov = 60; cam.updateProjectionMatrix();
      for (const [, A] of X.agents) A.visible = false; X.view.visible = false; X.renderer.render(X.scene, cam); return;
    }
    const P = me(), G = gun(P);
    // camera: your eyes, kicked by recoil; a death cam that turns to your killer
    cam.position.set(P.x, eyeY(P), P.z);
    let yaw = P.yaw, pitch = P.pitch + M.camKick;
    if (!P.alive && M.deathCam) { const b = M.deathCam.by, k = Math.min(1, M.deathCam.t * 2); cam.position.y = lp(eyeY(P), .5, k); yaw = lp(yaw, Math.atan2(-(b.x - P.x), -(b.z - P.z)), k); pitch = 0; }
    cam.rotation.set(0, 0, 0); cam.rotation.order = 'YXZ'; cam.rotation.y = yaw; cam.rotation.x = pitch;
    const fov = P.scoped ? 26 : 78; cam.fov += (fov - cam.fov) * Math.min(1, dt * 18); cam.updateProjectionMatrix();
    // viewmodel
    if (X.viewKey !== G.k) { if (X.viewGun) X.view.remove(X.viewGun); X.viewGun = viewGun(G.k); X.view.add(X.viewGun); X.viewKey = G.k; X.viewGun.add(X.mflash); }
    const v = Math.hypot(P.vx, P.vz), bob = Math.sin(P.walkT * 1.9) * .012 * Math.min(1, v / 4), rel = P.reloadT > 0 ? Math.sin(Math.min(1, 1 - P.reloadT / G.rel) * Math.PI) : 0;
    X.view.visible = P.alive && !P.scoped; X.view.position.set(.22 + bob, -.2 + Math.abs(bob) * .6 - rel * .12 - P.kick * .2, -.32 + P.kick * .8);
    X.view.rotation.set(P.kick * 1.4 - rel * .7, 0, rel * .3); X.mflash.position.set(0, .01, -(X.viewGun.userData.len || .5) * 1.25); X.mflash.visible = X.flashT > 0; X.mflash.rotation.z = R() * 3;
    if (X.flashT > 0) X.flashT -= dt; X.muzzle.intensity = Math.max(0, X.muzzle.intensity - dt * 60);
    // the rival
    for (const f of M.fs) {
      if (f === P) continue; let A = X.agents.get(f); if (!A || A.userData.op !== f.op) { if (A) X.scene.remove(A); A = agentModel(f); A.userData.op = f.op; X.agents.set(f, A); }
      const U = A.userData; A.visible = true; A.position.set(f.x, f.y, f.z); A.rotation.y = f.yaw;
      const sw = Math.sin(f.walkT * 1.8) * Math.min(1, Math.hypot(f.vx, f.vz) / 3) * .7; U.legL.rotation.x = sw; U.legR.rotation.x = -sw;
      U.hip.position.y = .92 - f.crouch * .42; U.legL.rotation.x += f.crouch * -.9; U.legR.rotation.x += f.crouch * -.9; U.torso.rotation.x = f.crouch * .25;
      U.arms.rotation.x = f.pitch * .8; U.head.rotation.x = f.pitch * .5;
      if (!f.alive) { A.rotation.z = lp(A.rotation.z, 1.45, Math.min(1, dt * 6)); A.position.y = f.y - .1; } else A.rotation.z = 0;
    }
    // smokes, walls, the charge, tracers, sparks
    while (X.smokes.length < M.smokes.length) { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), X.smokeMat); m.position.set(rnd(-.3, .3), rnd(-.2, .3), rnd(-.3, .3)); m.scale.setScalar(.85 + i * .05); g.add(m); } X.scene.add(g); X.smokes.push(g); }
    X.smokes.forEach((g, i) => { const s = M.smokes[i]; g.visible = !!s; if (s) { g.position.set(s.x, 1.4, s.z); g.scale.set(s.r, s.r * .85, s.r); g.rotation.y += dt * .1; } });
    while (X.walls.length < M.walls.length) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), X.wallMat); m.castShadow = true; X.scene.add(m); X.walls.push(m); }
    X.walls.forEach((m, i) => { const w = M.walls[i]; m.visible = !!w; if (w) { m.scale.set(w.x1 - w.x0, 3 * w.grow, w.z1 - w.z0); m.position.set((w.x0 + w.x1) / 2, 1.5 * w.grow, (w.z0 + w.z1) / 2); } });
    X.charge.visible = !!M.planted; if (M.planted) { X.charge.position.set(M.planted.x, 0, M.planted.z); const on = M.planted.beep > Math.max(.06, cl(M.planted.t / 12, .12, 1) - .08); X.chargeLight.material.color.set(on ? '#ff4655' : '#401018'); X.chargePL.intensity = on ? 2.5 : 0; }
    X.barriers.visible = M.phase === 'buy';
    if (M.flashFx) { X.flashL.position.set(M.flashFx.x, M.flashFx.y, M.flashFx.z); X.flashL.intensity = M.flashFx.t * 60; M.flashFx.t -= dt; if (M.flashFx.t <= 0) M.flashFx = null; } else X.flashL.intensity = 0;
    if (!X.tracerObjs) X.tracerObjs = []; X.tracers = X.tracers.filter(tr => (tr.t -= dt) > 0);
    while (X.tracerObjs.length < X.tracers.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#ffe8a8', transparent: true })); X.scene.add(l); X.tracerObjs.push(l); }
    X.tracerObjs.forEach((l, i) => { const tr = X.tracers[i]; l.visible = !!tr; if (tr) { const a = l.geometry.attributes.position.array; a.set(tr.a, 0); a.set(tr.b, 3); l.geometry.attributes.position.needsUpdate = true; l.material.opacity = tr.t / .06; } });
    if (!X.sparkObjs) { X.sparkObjs = []; X.sparkMat = new THREE.MeshBasicMaterial({ color: '#ffd28a' }); X.bloodMat = new THREE.MeshBasicMaterial({ color: '#c8283a' }); }
    X.sparks = X.sparks.filter(s => (s.t -= dt) > 0); for (const s of X.sparks) { s.v[1] -= 9 * dt; for (let a = 0; a < 3; a++) s.p[a] += s.v[a] * dt; }
    while (X.sparkObjs.length < Math.min(60, X.sparks.length)) { const m = new THREE.Mesh(new THREE.BoxGeometry(.04, .04, .04), X.sparkMat); X.scene.add(m); X.sparkObjs.push(m); }
    X.sparkObjs.forEach((m, i) => { const s = X.sparks[i]; m.visible = !!s; if (s) { m.position.set(...s.p); m.material = s.blood ? X.bloodMat : X.sparkMat; } });
    X.renderer.render(X.scene, cam);
  }

  /* ---------- input ---------- */
  let sens = 0.0022; try { sens = +(localStorage.getItem('dp-sens') || sens); } catch (e) {}
  const locked = () => document.pointerLockElement === document.getElementById('cv');
  function lockMouse() { if (touch() || K.bot) return; const c = document.getElementById('cv'); try { c && c.requestPointerLock && c.requestPointerLock(); } catch (e) {} }
  function unlockMouse() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} }
  document.addEventListener('mousemove', e => { if (!locked() || !M || mode !== 'play') return; const P = me(), s = sens * (P.scoped ? .33 : 1); P.yaw -= e.movementX * s; P.pitch = cl(P.pitch - e.movementY * s, -1.45, 1.45); });
  document.addEventListener('mousedown', e => { if (!locked() || !M || mode !== 'play') return; if (e.button === 0) mouse.l = true; if (e.button === 2) { const P = me(); if (gun(P).scope && P.alive && P.reloadT <= 0) { P.scoped = !P.scoped; snd('swap', P); } } });
  document.addEventListener('mouseup', e => { if (e.button === 0) mouse.l = false; });
  document.addEventListener('contextmenu', e => { if (mode === 'play') e.preventDefault(); });
  const TS = { stick: null, look: null, fire: null, btn: new Map() };   // touch state
  function localInput() {
    const I = { mx: (keys.d ? 1 : 0) - (keys.a ? 1 : 0), mz: (keys.w ? 1 : 0) - (keys.s ? 1 : 0), walk: !!keys.walk, crouch: !!keys.crouch || [...TS.btn.values()].includes('crouch'), jump: !!keys.jump || [...TS.btn.values()].includes('jump'), use: !!keys.use || [...TS.btn.values()].includes('use'), fire: mouse.l || !!TS.fire };
    if (TS.stick) { const dx = TS.stick.x - TS.stick.x0, dy = TS.stick.y - TS.stick.y0, L = Math.hypot(dx, dy); if (L > 8) { I.mx = dx / Math.max(L, 60); I.mz = -dy / Math.max(L, 60); } }
    if (M.buyMenu && M.phase === 'buy') I.fire = false;
    return I;
  }
  const KM = { KeyW: 'w', ArrowUp: 'w', KeyS: 's', ArrowDown: 's', KeyA: 'a', ArrowLeft: 'a', KeyD: 'd', ArrowRight: 'd', ShiftLeft: 'walk', ShiftRight: 'walk', ControlLeft: 'crouch', KeyC: 'crouch', Space: 'jump', KeyF: 'use' };
  GAME.key = (c, d) => {
    if (KM[c]) keys[KM[c]] = d;
    if (!d || !M || mode !== 'play') { if (d && mode === 'menu' && (c === 'Enter' || c === 'Space')) click('play'); if (d && mode === 'over' && c === 'Enter') click('again'); return; }
    const P = me();
    if (c === 'KeyR') reload(P); if (c === 'Digit1') switchTo(P, 1); if (c === 'Digit2' || c === 'Digit3') switchTo(P, 2);
    if (c === 'KeyQ') ability(P, 'q'); if (c === 'KeyE') ability(P, 'e');
    if (c === 'KeyB' && M.phase === 'buy') { M.buyMenu = !M.buyMenu; if (M.buyMenu) unlockMouse(); else lockMouse(); }
  };

  /* ---------- drawing the HUD (the kit's 2D canvas over the 3D one) ---------- */
  const DF = n => `700 ${n}px "Chakra Petch", Impact, sans-serif`, BF = (n, w = 800) => `${w} ${n}px Nunito, system-ui, sans-serif`;
  const RED = '#ff4655', TEAL = '#3ee6c1', INK = '#0b0f17', PAPER = '#ece8e1';
  function tx(g, s, x, y, font, c, al = 'center', sh = 0) { g.font = font; g.textAlign = al; g.textBaseline = 'middle'; if (sh) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillText(s, x + sh * .4, y + sh * .5); } g.fillStyle = c; g.fillText(s, x, y); }
  function rr(g, x, y, w, h, r, f, s, lw = 2) { g.beginPath(); g.roundRect(x, y, w, h, r); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.strokeStyle = s; g.lineWidth = lw; g.stroke(); } }
  const BTN = {}; let hover = null;
  function button(g, k, x, y, w, h, label, o = {}) {
    BTN[k] = { x, y, w, h }; const hv = hover === k, on = o.on, dis = o.dis;
    g.save(); g.beginPath(); g.moveTo(x + 12, y); g.lineTo(x + w, y); g.lineTo(x + w - 12, y + h); g.lineTo(x, y + h); g.closePath();
    g.fillStyle = dis ? 'rgba(40,46,58,.7)' : on ? (o.c || RED) : hv ? 'rgba(255,70,85,.85)' : (o.bg || 'rgba(18,24,36,.88)'); g.fill(); g.strokeStyle = dis ? 'rgba(255,255,255,.1)' : on || hv ? '#fff' : 'rgba(236,232,225,.35)'; g.lineWidth = 2; g.stroke(); g.restore();
    tx(g, label, x + w / 2, y + h / 2 + (o.sub ? -9 : 1), DF(o.size || 22), dis ? '#6a7080' : on || hv ? '#fff' : PAPER); if (o.sub) tx(g, o.sub, x + w / 2, y + h / 2 + 15, BF(13), dis ? '#5a6070' : on || hv ? '#fff' : '#9aa4b4');
  }
  function toScreen(x, y, z) { const v = new THREE.Vector3(x, y, z).project(X.camera); if (v.z > 1) return null; const V = K.view; return [V.x0 + (v.x + 1) / 2 * (V.x1 - V.x0), V.y0 + (1 - v.y) / 2 * (V.y1 - V.y0)]; }
  function drawHUD(g) {
    const P = me(), F = foe(), G = gun(P), V = K.view, side = sideOf(P);
    // scope overlay
    if (P.scoped && P.alive) { g.fillStyle = '#000'; g.beginPath(); g.rect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0); g.arc(640, 360, 300, 0, TAU, true); g.fill(); g.strokeStyle = 'rgba(0,0,0,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(340, 360); g.lineTo(940, 360); g.moveTo(640, 60); g.lineTo(640, 660); g.stroke(); }
    // the rival revealed by a Ping, and the charge when it is planted
    if (F.alive && F.reveal > 0 && X) { const s = toScreen(F.x, F.y + 1.2, F.z); if (s) { g.strokeStyle = RED; g.lineWidth = 3; g.beginPath(); g.moveTo(s[0], s[1] - 26); g.lineTo(s[0] + 18, s[1]); g.lineTo(s[0], s[1] + 26); g.lineTo(s[0] - 18, s[1]); g.closePath(); g.stroke(); tx(g, F.name, s[0], s[1] - 40, BF(14), RED); } }
    if (M.planted && X) { const s = toScreen(M.planted.x, .5, M.planted.z); if (s) { const p = 1 + Math.sin(X.t * 10) * .1; g.fillStyle = 'rgba(255,70,85,.9)'; g.beginPath(); g.arc(s[0], s[1], 9 * p, 0, TAU); g.fill(); } }
    // crosshair: a gap that opens with spread
    if (P.alive && !P.scoped) { const gap = 5 + spreadOf(P) * 260, c = '#3ee6c1'; g.fillStyle = 'rgba(0,0,0,.6)'; for (const [a, b, w, h] of [[-gap - 9, -1.5, 9, 3], [gap, -1.5, 9, 3], [-1.5, -gap - 9, 3, 9], [-1.5, gap, 3, 9]]) g.fillRect(640 + a - 1, 360 + b - 1, w + 2, h + 2); g.fillStyle = c; for (const [a, b, w, h] of [[-gap - 9, -1.5, 9, 3], [gap, -1.5, 9, 3], [-1.5, -gap - 9, 3, 9], [-1.5, gap, 3, 9]]) g.fillRect(640 + a, 360 + b, w, h); g.fillRect(639, 359, 2, 2); }
    if (M.hitMark && (M.hitMark.t -= 1 / 60) > 0) { const c = M.hitMark.kill ? RED : M.hitMark.head ? '#ffd23f' : '#fff'; g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.moveTo(640 + a * 8, 360 + b * 8); g.lineTo(640 + a * 16, 360 + b * 16); } g.stroke(); }
    // top: the score and the clock
    const ph = M.phase, t = Math.max(0, Math.ceil(M.t)), clock = M.planted && ph === 'live' ? '' : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    g.fillStyle = 'rgba(11,15,23,.78)'; g.beginPath(); g.moveTo(520, 10); g.lineTo(760, 10); g.lineTo(740, 66); g.lineTo(540, 66); g.closePath(); g.fill();
    tx(g, String(M.wins[0]), 560, 38, DF(34), TEAL); tx(g, String(M.wins[1]), 720, 38, DF(34), RED);
    if (M.planted && ph === 'live') { const p = 1 + Math.sin(X ? X.t * 12 : 0) * .08; g.fillStyle = RED; g.beginPath(); g.arc(640, 36, 14 * p, 0, TAU); g.fill(); } else tx(g, clock, 640, 36, DF(30), ph === 'buy' ? TEAL : PAPER);
    tx(g, ph === 'buy' ? 'BUY PHASE' : `ROUND ${M.round}`, 640, 60, DF(12), '#9aa4b4');
    tx(g, P.name.toUpperCase(), 500, 30, DF(14), TEAL, 'right'); tx(g, side === 'att' ? 'ATTACK' : 'DEFEND', 500, 50, DF(12), side === 'att' ? RED : TEAL, 'right');
    tx(g, F.name.toUpperCase(), 780, 30, DF(14), RED, 'left'); tx(g, (OPS[F.op] || OPS.vex).n, 780, 50, DF(12), '#9aa4b4', 'left');
    // kill feed
    M.feed.forEach((k, i) => { const y = 92 + i * 34, a = Math.min(1, (6 - k.t) * 2); g.globalAlpha = a; rr(g, 900, y - 14, 360, 28, 4, k.mine ? 'rgba(62,230,193,.25)' : 'rgba(255,70,85,.25)'); tx(g, `${k.a}  [${k.w}${k.head ? ' ◎' : ''}]  ${k.b}`, 1250, y, BF(15), '#fff', 'right'); g.globalAlpha = 1; });
    // bottom left: health and shield; bottom right: ammo and abilities
    rr(g, 30, 640, 260, 54, 6, 'rgba(11,15,23,.75)'); tx(g, String(Math.ceil(P.hp)), 80, 667, DF(40), P.hp > 30 ? PAPER : RED); tx(g, 'HP', 116, 676, DF(12), '#9aa4b4', 'left');
    rr(g, 150, 660, 120, 8, 4, 'rgba(255,255,255,.15)'); rr(g, 150, 660, 120 * P.hp / 100, 8, 4, P.hp > 30 ? PAPER : RED); if (P.sh) { rr(g, 150, 674, 120 * P.sh / 50, 6, 3, '#7fc8ff'); tx(g, `⛨ ${P.sh}`, 278, 677, BF(13), '#7fc8ff', 'left'); }
    const A = P.ammo[G.k] || { mag: 0, res: 0 }; rr(g, 990, 640, 260, 54, 6, 'rgba(11,15,23,.75)'); tx(g, String(A.mag), 1090, 667, DF(40), A.mag ? PAPER : RED, 'right'); tx(g, `/ ${A.res}`, 1098, 674, DF(18), '#9aa4b4', 'left'); tx(g, G.n.toUpperCase(), 1238, 667, DF(16), G.col, 'right');
    if (P.reloadT > 0) tx(g, 'RELOADING', 640, 420, DF(16), '#ffd23f', 'center', 2);
    const op = OPS[P.op]; [['Q', 'q'], ['E', 'e']].forEach(([key, k], i) => { const x = 330 + i * 92, on = P.ab[k]; rr(g, x, 640, 80, 54, 6, on ? 'rgba(11,15,23,.78)' : 'rgba(11,15,23,.4)', on ? op.col : 'rgba(255,255,255,.12)'); tx(g, op[k].n.toUpperCase(), x + 40, 660, DF(14), on ? '#fff' : '#5a6070'); tx(g, key, x + 40, 682, DF(14), on ? op.col : '#5a6070'); });
    if (ph === 'buy') tx(g, `◈ ${P.credits}`, 990, 620, DF(22), '#ffd23f', 'left');
    // the objective
    const onS = onSite(P.x, P.z);
    if (P.alive && ph === 'live') {
      if (side === 'att' && !M.planted) tx(g, onS ? (P.plant ? '' : 'HOLD F TO PLANT') : 'Carry the charge to the red site', 640, 560, onS ? DF(20) : BF(16), onS ? '#ffd23f' : 'rgba(236,232,225,.65)', 'center', 2);
      if (side === 'def' && M.planted && !P.defuse) tx(g, Math.hypot(P.x - M.planted.x, P.z - M.planted.z) < 1.8 ? 'HOLD F TO DEFUSE' : 'The charge is planted: find it and defuse it', 640, 560, DF(18), '#ffd23f', 'center', 2);
      const pr = P.plant ? P.plant / PLANT_T : P.defuse ? P.defuse / DEFUSE_T : 0;
      if (pr) { rr(g, 490, 520, 300, 16, 8, 'rgba(0,0,0,.6)'); rr(g, 490, 520, 300 * pr, 16, 8, P.plant ? RED : TEAL); tx(g, P.plant ? 'PLANTING' : 'DEFUSING', 640, 500, DF(16), '#fff', 'center', 2); }
    }
    if (F.plant || F.defuse) tx(g, F.plant ? 'You hear them planting!' : 'They are defusing!', 640, 470, DF(18), RED, 'center', 2);
    // being hurt, flashed, killed
    if (M.hurt > 0) { const a = M.hurtDir - P.yaw + Math.PI; g.save(); g.translate(640, 360); g.rotate(-a); g.fillStyle = `rgba(255,70,85,${M.hurt * .7})`; g.beginPath(); g.arc(0, -150, 60, Math.PI * 1.2, Math.PI * 1.8); g.arc(0, -150, 46, Math.PI * 1.8, Math.PI * 1.2, true); g.fill(); g.restore(); }
    if (P.flash > 0) { g.fillStyle = `rgba(255,255,255,${Math.min(1, P.flash / 1.2)})`; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0); }
    if (M.killFx) { g.strokeStyle = `rgba(255,70,85,${M.killFx})`; g.lineWidth = 4; g.beginPath(); g.arc(640, 360, 40 + (1 - M.killFx) * 30, 0, TAU); g.stroke(); }
    if (!P.alive && M.phase !== 'end') { g.fillStyle = 'rgba(80,0,10,.25)'; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0); tx(g, `ELIMINATED BY ${(F.name || '').toUpperCase()}`, 640, 300, DF(34), RED, 'center', 3); if (M.planted && sideOf(P) === 'att') tx(g, 'The charge is still ticking...', 640, 344, BF(18), '#fff'); }
    if (M.say) { const a = Math.min(1, M.say.t * 5, (2.6 - M.say.t) * 3); g.globalAlpha = Math.max(0, a); tx(g, M.say.s, 640, 200, DF(40), M.say.c || '#fff', 'center', 4); g.globalAlpha = 1; }
    if (ph === 'end' && M.last) { const won = M.last.wi === 0; g.fillStyle = won ? 'rgba(62,230,193,.18)' : 'rgba(255,70,85,.18)'; g.fillRect(V.x0, 230, V.x1 - V.x0, 140); tx(g, won ? 'ROUND WON' : 'ROUND LOST', 640, 280, DF(64), won ? TEAL : RED, 'center', 4); tx(g, M.last.why.toUpperCase(), 640, 336, DF(20), '#fff', 'center', 2); }
    if (ph === 'buy') { if (M.buyMenu) drawBuy(g); else tx(g, touch() ? 'Tap BUY to shop' : 'Press B to open the buy menu', 640, 600, BF(16), TEAL, 'center', 2); }
    if (!touch() && !locked() && !M.buyMenu && mode === 'play' && !K.bot) { rr(g, 440, 400, 400, 60, 8, 'rgba(11,15,23,.85)', TEAL); tx(g, 'CLICK TO FIGHT', 640, 430, DF(24), TEAL); }
    if (touch() && mode === 'play') drawTouch(g);
  }
  function drawBuy(g) {
    const P = me(); rr(g, 190, 120, 900, 420, 10, 'rgba(11,15,23,.94)', 'rgba(236,232,225,.3)');
    tx(g, 'ARMORY', 220, 150, DF(28), PAPER, 'left'); tx(g, `◈ ${P.credits} credits`, 1060, 150, DF(22), '#ffd23f', 'right'); tx(g, `Round starts in ${Math.ceil(M.t)}`, 640, 150, BF(15), '#9aa4b4');
    const items = [...Object.values(GUNS).filter(G => G.k !== 'pip'), ...ARMOR.map(a => ({ k: a.k, n: a.n, cost: a.cost, desc: `+${a.sh} shield`, col: '#7fc8ff', armor: a }))];
    items.forEach((it, i) => {
      const x = 220 + (i % 3) * 285, y = 180 + Math.floor(i / 3) * 170, owned = it.armor ? P.sh >= it.armor.sh : P.guns[GUNS[it.k].slot] === it.k, can = !owned && P.credits >= it.cost, b = { x, y, w: 265, h: 150 }; BTN['buy:' + it.k] = b; const hv = hover === 'buy:' + it.k;
      rr(g, x, y, 265, 150, 8, owned ? 'rgba(62,230,193,.16)' : hv && can ? 'rgba(255,70,85,.2)' : 'rgba(255,255,255,.04)', owned ? TEAL : can ? 'rgba(236,232,225,.35)' : 'rgba(255,255,255,.08)');
      tx(g, it.n.toUpperCase(), x + 16, y + 28, DF(24), can || owned ? it.col : '#5a6070', 'left'); tx(g, owned ? 'OWNED' : `◈ ${it.cost}`, x + 250, y + 28, DF(18), owned ? TEAL : can ? '#ffd23f' : '#5a6070', 'right');
      g.font = BF(14, 700); g.fillStyle = can || owned ? '#cfd6e2' : '#5a6070'; g.textAlign = 'left'; let line = '', yy = y + 64; for (const w of it.desc.split(' ')) { const tt = line ? line + ' ' + w : w; if (g.measureText(tt).width > 230) { g.fillText(line, x + 16, yy); line = w; yy += 19; } else line = tt; } g.fillText(line, x + 16, yy);
      if (!it.armor) { const G = GUNS[it.k]; tx(g, `DMG ${G.dmg}${G.pel ? '×' + G.pel : ''} · MAG ${G.mag} · ${G.auto ? 'AUTO' : 'SEMI'}`, x + 16, y + 130, BF(12), '#8a94a4', 'left'); }
    });
    button(g, 'closeBuy', 540, 500, 200, 44, 'DONE  (B)', { size: 18 });
  }
  const TB = () => ({ fire: [1150, 540, 70], jump: [1210, 420, 40], crouch: [1050, 640, 36], reload: [1215, 650, 32], q: [1010, 470, 36], e: [1080, 420, 36], use: [930, 580, 42], swap: [1225, 330, 30], scope: [1110, 330, 32], buy: [640, 230, 40] });
  function drawTouch(g) {
    const P = me(), T = TB(), lab = { fire: 'FIRE', jump: 'JUMP', crouch: 'DUCK', reload: 'R', q: OPS[P.op].q.n, e: OPS[P.op].e.n, use: 'F', swap: '1/2', scope: '◎', buy: 'BUY' };
    for (const k in T) { if (k === 'buy' && M.phase !== 'buy') continue; if (k === 'scope' && !gun(P).scope) continue; if (k === 'use' && !(onSite(P.x, P.z) || M.planted)) continue; const [x, y, r] = T[k], held = [...TS.btn.values()].includes(k) || (k === 'fire' && TS.fire); g.fillStyle = held ? 'rgba(255,70,85,.55)' : 'rgba(11,15,23,.45)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = 'rgba(236,232,225,.5)'; g.lineWidth = 2; g.stroke(); tx(g, lab[k], x, y, DF(k === 'fire' ? 20 : 12), '#fff'); }
    if (TS.stick) { g.strokeStyle = 'rgba(236,232,225,.4)'; g.lineWidth = 3; g.beginPath(); g.arc(TS.stick.x0, TS.stick.y0, 60, 0, TAU); g.stroke(); g.fillStyle = 'rgba(236,232,225,.5)'; const dx = TS.stick.x - TS.stick.x0, dy = TS.stick.y - TS.stick.y0, L = Math.min(60, Math.hypot(dx, dy)), a = Math.atan2(dy, dx); g.beginPath(); g.arc(TS.stick.x0 + Math.cos(a) * L, TS.stick.y0 + Math.sin(a) * L, 26, 0, TAU); g.fill(); }
  }
  function drawMenu(g) {
    const V = K.view; g.fillStyle = 'rgba(11,15,23,.55)'; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0);
    g.fillStyle = RED; g.fillRect(80, 64, 8, 92); tx(g, 'DUELPOINT', 104, 104, DF(84), PAPER, 'left', 4); tx(g, 'One map. One rival. Every round counts.', 108, 160, BF(20, 700), '#cfd6e2', 'left');
    tx(g, 'CHOOSE YOUR OPERATIVE', 80, 222, DF(18), '#9aa4b4', 'left');
    Object.entries(OPS).forEach(([k, o], i) => {
      const x = 80 + i * 290, y = 240, on = selOp === k, hv = hover === 'op:' + k; BTN['op:' + k] = { x, y, w: 270, h: 250 };
      rr(g, x, y - (hv ? 4 : 0), 270, 250, 8, on ? 'rgba(18,24,36,.95)' : 'rgba(18,24,36,.75)', on ? o.col : 'rgba(236,232,225,.2)', on ? 3 : 2);
      g.fillStyle = o.col; g.fillRect(x, y - (hv ? 4 : 0), 270, 6); tx(g, o.n, x + 18, y + 40, DF(34), on ? o.col : PAPER, 'left'); tx(g, o.role.toUpperCase(), x + 252, y + 42, DF(14), '#9aa4b4', 'right');
      [['Q', 'q'], ['E', 'e']].forEach(([key, a], j) => { const yy = y + 86 + j * 76; rr(g, x + 16, yy - 18, 34, 34, 6, null, o.col); tx(g, key, x + 33, yy - 1, DF(18), o.col); tx(g, o[a].n.toUpperCase(), x + 62, yy - 6, DF(18), '#fff', 'left'); g.font = BF(13, 700); g.fillStyle = '#9aa4b4'; g.textAlign = 'left'; let line = '', y2 = yy + 16; for (const w of o[a].d.split(' ')) { const tt = line ? line + ' ' + w : w; if (g.measureText(tt).width > 186) { g.fillText(line, x + 62, y2); line = w; y2 += 16; } else line = tt; } g.fillText(line, x + 62, y2); });
    });
    tx(g, 'BOT DIFFICULTY', 980, 222, DF(18), '#9aa4b4', 'left');
    DIFF.forEach((D, i) => button(g, 'diff:' + i, 980, 240 + i * 62, 220, 50, D.n.toUpperCase(), { on: selDiff === i, size: 20 }));
    button(g, 'play', 980, 440, 220, 64, 'PLAY', { on: true, size: 30, sub: 'vs bot or online' });
    tx(g, 'WASD move · mouse aim · click shoot · Q E abilities · F plant/defuse · B buy · R reload', 640, 560, BF(15), '#9aa4b4');
    tx(g, 'Every name, operative and place here is original.', 640, 590, BF(13), '#5a6070');
  }
  function drawOver(g) {
    const V = K.view, w = M.wins[0] > M.wins[1]; g.fillStyle = 'rgba(11,15,23,.8)'; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0);
    tx(g, w ? 'VICTORY' : 'DEFEAT', 640, 200, DF(110), w ? TEAL : RED, 'center', 5); tx(g, `${M.wins[0]} — ${M.wins[1]}`, 640, 300, DF(54), PAPER);
    const P = me(); tx(g, `${P.kills} kills · ${P.deaths} deaths · vs ${foe().name}${M.online ? '' : ' (' + DIFF[selDiff].n + ')'}`, 640, 360, BF(20), '#cfd6e2');
    button(g, 'again', 430, 430, 200, 60, M.online ? 'LOBBY' : 'REMATCH', { on: true, size: 24 }); button(g, 'menu', 650, 430, 200, 60, 'MENU', { size: 24 });
  }
  function click(k) {
    if (!k) return; K.sfx(700, .04, 'square', .04);
    if (k.startsWith('op:')) selOp = k.slice(3); else if (k.startsWith('diff:')) selDiff = +k.slice(5);
    else if (k === 'play') { mode = 'lobby'; MP.opts.sub = `${OPS[selOp].n} · first to ${ROUNDS_TO_WIN} rounds. Duel the bot, or create a room for a friend.`; MP.show(); }
    else if (k === 'again') { if (M.online) { mode = 'lobby'; MP.show(); } else startMatch(null); }
    else if (k === 'menu') { mode = 'menu'; M = null; MP.leave && MP.leave(); unlockMouse(); }
    else if (k === 'closeBuy') { M.buyMenu = false; lockMouse(); }
    else if (k.startsWith('buy:')) { if (!buy(me(), k.slice(4))) K.sfx(160, .1, 'square', .05); }
  }

  /* ---------- kit hooks ---------- */
  function startDemo() {
    const A = fighter({ name: 'Rook', op: pick(Object.keys(OPS)), bot: { diff: 1 } }), Bf = fighter({ name: 'Kestrel', op: pick(Object.keys(OPS)), bot: { diff: 1 } });
    M = { fs: [A, Bf], wins: [0, 0], round: 0, phase: 'buy', t: 0, planted: null, smokes: [], walls: [], flares: [], feed: [], online: false, host: true, att0: 0, decider: 0, camKick: 0, hurt: 0, acc: 0 };
    mode = 'play'; startRound(1); M.t = 1; A.credits = Bf.credits = 4500;
  }
  GAME.reset = () => { keys = {}; mouse.l = false; MP.hide && MP.hide(); unlockMouse(); posed = false; if (K.bot) { startDemo(); return; } M = null; mode = 'menu'; };
  GAME.update = dt => {
    menuT += dt; if (!M || (mode !== 'play' && mode !== 'over') || posed) return;
    M.acc += Math.min(dt, .1); let n = 0; while (M.acc >= 1 / 60 && n < 6) { tick(1 / 60); M.acc -= 1 / 60; n++; }
    if (K.bot && M.wins.some(w => w >= ROUNDS_TO_WIN)) startDemo();
  };
  let lastDraw = 0;
  GAME.draw = g => {
    const now = performance.now(), dt = Math.min(.1, (now - (lastDraw || now)) / 1000); lastDraw = now;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.restore();
    for (const k in BTN) delete BTN[k];
    if (!ready) { const V = K.view; g.fillStyle = INK; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0); tx(g, failed ? 'Could not load the 3D engine. Check your connection and reload.' : 'LOADING...', 640, 360, DF(28), failed ? RED : PAPER); return; }
    render(dt); if (posed) return;
    if (mode === 'menu') drawMenu(g); else if (mode === 'play' && M) drawHUD(g); else if (mode === 'over' && M) drawOver(g);
    if (touch() && innerHeight > innerWidth * 1.05) { const V = K.view; g.fillStyle = 'rgba(11,15,23,.9)'; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0); tx(g, 'Turn your device sideways', 640, 360, DF(50), PAPER); }
  };
  const inB = (b, x, y) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  GAME.down = (x, y, e) => {
    K.audio && K.audio(); const hit = Object.keys(BTN).find(k => inB(BTN[k], x, y));
    if (mode === 'menu' || mode === 'over') return click(hit);
    if (mode !== 'play' || !M) return;
    if (M.buyMenu && M.phase === 'buy') { if (hit) return click(hit); return; }
    if (!touch()) { if (!locked()) lockMouse(); return; }
    const id = e ? e.pointerId : 0, T = TB();
    for (const k in T) { const [bx, by, r] = T[k]; if (Math.hypot(x - bx, y - by) < r + 8) { const P = me();
      if (k === 'fire') { TS.fire = id; return; } if (k === 'reload') return reload(P); if (k === 'q' || k === 'e') return ability(P, k); if (k === 'swap') return switchTo(P, P.slot === 1 ? 2 : 1);
      if (k === 'scope') { if (gun(P).scope) P.scoped = !P.scoped; return; } if (k === 'buy' && M.phase === 'buy') { M.buyMenu = true; return; } TS.btn.set(id, k); return; } }
    if (x < 560) TS.stick = { id, x0: x, y0: y, x, y }; else TS.look = { id, x, y };
  };
  GAME.move = (x, y, e) => {
    hover = Object.keys(BTN).find(k => inB(BTN[k], x, y)) || null; const c = document.getElementById('cv'); if (c && !locked()) c.style.cursor = hover ? 'pointer' : 'default';
    const id = e ? e.pointerId : 0;
    if (TS.stick && TS.stick.id === id) { TS.stick.x = x; TS.stick.y = y; }
    if (TS.look && TS.look.id === id && M) { const P = me(), s = .0055 * (P.scoped ? .35 : 1); P.yaw -= (x - TS.look.x) * s; P.pitch = cl(P.pitch - (y - TS.look.y) * s, -1.4, 1.4); TS.look.x = x; TS.look.y = y; }
  };
  GAME.up = (x, y, e) => { const id = e ? e.pointerId : 0; if (TS.stick && TS.stick.id === id) TS.stick = null; if (TS.look && TS.look.id === id) TS.look = null; if (TS.fire === id) TS.fire = null; TS.btn.delete(id); };
  GAME.bot = () => {};
  // the cover shot: a defender holding the site, the rival peeking in, mid-fight
  GAME.pose = () => {
    posed = false; startDemo(); for (let i = 0; i < 60; i++) tick(1 / 60); M.phase = 'live'; M.t = 52;
    const P = me(), F = foe(); P.x = 37; P.z = 15; P.y = 0; F.x = 27; F.z = 18.5; F.y = 0; F.alive = P.alive = true; P.guns[1] = 'lancer'; P.slot = 1; giveAmmo(P, 'lancer'); F.guns[1] = 'lancer'; F.slot = 1; F.op = 'vex';
    P.yaw = Math.atan2(-(F.x - P.x), -(F.z - P.z)) + .03; P.pitch = Math.atan2(eyeY(F) - .3 - eyeY(P), Math.hypot(F.x - P.x, F.z - P.z)); F.yaw = Math.atan2(-(P.x - F.x), -(P.z - F.z)); F.vx = 2; M.smokes.push({ x: 24, z: 12, r: 3.6, R: 3.6, t: 8 });
    P.bot = null; P.local = true; F.bot = null; posed = true; if (ready) { render(1 / 60); fire(P); render(1 / 60); }
  };
  GAME.test = {
    st: () => M && { mode, phase: M.phase, round: M.round, t: +M.t.toFixed(1), wins: M.wins, planted: !!M.planted, fs: M.fs.map(f => ({ n: f.name, side: sideOf(f), hp: f.hp, alive: f.alive, x: +f.x.toFixed(1), z: +f.z.toFixed(1), y: +f.y.toFixed(2), gun: gun(f).k, cr: f.credits, k: f.kills })) },
    menu: () => { mode = 'menu'; }, solo: () => startMatch(null), demo: () => startDemo(), M: () => M, tick: (s, h = 1 / 60) => { for (let i = 0; i < s / h; i++) tick(h); return GAME.test.st(); }, keys: () => keys, mouse,
    botMe: d => { me().bot = { diff: d }; me().local = false; }, buy: k => buy(me(), k), ability: k => ability(me(), k), fire: () => fire(me()), click, ready: () => ready, X: () => X,
    grid: () => MAP.map(r => r).join('\n'),
  };
})();
