/* Flop Hoops: two-on-two floppy physics basketball with one button per team, in the spirit of Basket Random.
   Press your button: your two players jump and swing their arms. Grab the ball by touching it; press again and the
   swing throws it. Every point changes the rules: the ball, the players, the gravity, the floor. First to 5.
   Play the computer, or two people on one device (W and Up arrow, or the left and right halves of the screen). */
const GAME = {
  id: 'flop-hoops', title: 'Flop Hoops', tagline: 'One button. Floppy players. Random rules.',
  font: 'Lilita One', accent: '#ff7a1a', accent2: '#29e0ff', bg: '#1a2a48', noSkins: true, noHud: true, scoreLabel: 'Points',
  how: ['One button per team: press it to jump and swing. Touch the ball to grab it, press again to throw.', 'Player 1: W, or tap the left half. Player 2: Up arrow, or tap the right half.', 'Every point the rules change. First to 5 wins.'],
  skins: [{ name: 'Classic', price: 0 }],
};
(() => {
  const FD = '"Lilita One", Impact, sans-serif', FB = 'Nunito, system-ui, sans-serif';
  const FLOOR = 610, LW = 40, RW = 1240, HOOPY = 300, RIM = 34;
  // rims: the team on the left shoots at the right hoop
  const HOOP = [{ x: 1150, dir: 1 }, { x: 130, dir: -1 }];
  const MODS = [
    { id: 'normal', name: 'Classic', sub: 'Just basketball', ball: { r: 20, m: 1, b: .72 }, g: 1700, size: 1 },
    { id: 'beach', name: 'Beach Ball', sub: 'Huge and floaty', ball: { r: 36, m: .35, b: .85 }, g: 1700, size: 1 },
    { id: 'bowling', name: 'Bowling Ball', sub: 'Heavy. Very heavy.', ball: { r: 18, m: 2.6, b: .3 }, g: 1700, size: 1 },
    { id: 'moon', name: 'Moon Gravity', sub: 'Everything floats', ball: { r: 20, m: 1, b: .72 }, g: 700, size: 1 },
    { id: 'tiny', name: 'Tiny Players', sub: 'Little legs, big dreams', ball: { r: 18, m: 1, b: .72 }, g: 1700, size: .72 },
    { id: 'giant', name: 'Giant Players', sub: 'Tall and wobbly', ball: { r: 20, m: 1, b: .72 }, g: 1700, size: 1.3 },
    { id: 'ice', name: 'Ice Floor', sub: 'No grip anywhere', ball: { r: 20, m: 1, b: .72 }, g: 1700, size: 1, ice: 1 },
    { id: 'bouncy', name: 'Super Bouncy', sub: 'The ball has opinions', ball: { r: 16, m: .8, b: .98 }, g: 1700, size: 1 },
  ];
  const COL = [['#ff7a1a', '#7a2a0a', '#ffd23f'], ['#29a8ff', '#0a2a5a', '#e8f4ff']];
  let rel = [0, 0], mode = 'menu', cpu = true, score, mod, P, ball, press, flash, banner, t, wait, hover, botT = 0, winner, hold = [0, 0], menuSel = 0, posed = false;
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* ---------- sound ---------- */
  const bounce = v => K.sfx(140 + v * .05, .07, 'triangle', clamp(v / 4000, .02, .14), -40);
  const swish = () => { K.sfx(1200, .25, 'sine', .06, -700); K.chime(523, [0, 4, 7, 12]); };
  const buzzer = () => { K.sfx(220, .5, 'sawtooth', .08); K.sfx(165, .5, 'sawtooth', .06); };

  /* ---------- players: a stick standing on its feet that wobbles, jumps and swings an arm ---------- */
  function mkPlayer(team, k) {
    const s = mod.size, x = team ? 980 - k * 170 : 300 + k * 170;
    return { team, k, x, y: FLOOR, vx: 0, vy: 0, a: 0, w: 0, L: 120 * s, arm: 0, armV: 0, ground: true, s, face: team ? -1 : 1, hold: false };
  }
  // the head, the shoulder and the hand, from the feet position, lean angle and arm angle
  function joints(p) {
    const ux = Math.sin(p.a), uy = -Math.cos(p.a), L = p.L;
    const sh = { x: p.x + ux * L * .78, y: p.y + uy * L * .78 }, head = { x: p.x + ux * (L + 14 * p.s), y: p.y + uy * (L + 14 * p.s) };
    const aa = p.a + Math.PI - p.face * (.35 + p.arm * 2.6), al = 58 * p.s, hand = { x: sh.x + Math.sin(aa) * al, y: sh.y - Math.cos(aa) * al };
    return { sh, head, hand, ux, uy };
  }
  function newPoint() {
    mod = score[0] + score[1] === 0 ? MODS[0] : MODS[1 + Math.floor(Math.random() * (MODS.length - 1))];
    P = [mkPlayer(0, 0), mkPlayer(0, 1), mkPlayer(1, 0), mkPlayer(1, 1)];
    ball = { x: 640, y: 160, vx: rnd(-40, 40), vy: 0, r: mod.ball.r, m: mod.ball.m, b: mod.ball.b, holder: null, cd: 0, spin: 0, last: -1 };
    banner = { t: 0, name: mod.name, sub: mod.sub }; wait = 1.4; press = [false, false];
    K.sfx(880, .08, 'square', .05); K.sfx(1100, .08, 'square', .05, 0, .1);
  }
  function startMatch(c) { cpu = c; score = [0, 0]; winner = null; mode = 'play'; newPoint(); }

  /* ---------- the button ---------- */
  function push(team) {
    if (mode !== 'play' || wait > 0) return;
    press[team] = true;
    for (const p of P) if (p.team === team) {
      if (p.ground) { const ours = ball.holder && ball.holder.team === team, tx = ours ? HOOP[team].x : ball.x + (HOOP[team].x > ball.x ? -30 : 30), dir = tx > p.x ? 1 : -1; p.vy = -(560 + rnd(0, 120)) * Math.sqrt(mod.g / 1700) * (p.s > 1 ? .92 : 1); p.vx += dir * rnd(120, 230); p.w += dir * rnd(2.2, 3.6); p.ground = false; }
      p.armV = 9;
    }
    K.sfx(team ? 520 : 440, .05, 'square', .05, 120);
  }
  function release(team) { press[team] = false; }
  // the computer's button presses: down now, up after a moment (on the game clock, not a timer)
  function tap(team, d) { if (press[team]) return; push(team); rel[team] = d; }

  /* ---------- physics ---------- */
  function stepPlayer(p, dt) {
    const g = mod.g;
    p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    // the lean: gravity tips you over, your legs try to stand you up (badly)
    const stand = p.ground ? 34 - (mod.ice ? 14 : 0) : 7;
    p.w += (Math.sin(p.a) * 6 - p.a * stand) * dt - p.w * (p.ground ? 3.2 : .6) * dt; p.a += p.w * dt; if (Math.abs(p.a) > .95) { p.a = Math.sign(p.a) * .95; p.w *= -.3; }
    // the arm swings up while the button is held, then falls
    p.arm += p.armV * dt; p.armV -= 22 * dt; if (press[p.team]) p.armV += 10 * dt; if (p.arm < 0) { p.arm = 0; p.armV = 0; } if (p.arm > 1) { p.arm = 1; p.armV = Math.min(0, p.armV); }
    if (p.y >= FLOOR) { if (!p.ground && p.vy > 200) bounce(p.vy * .3); p.y = FLOOR; p.vy = 0; p.ground = true; p.vx *= mod.ice ? .995 : .86; }
    else p.ground = false;
    if (p.x < LW + 20) { p.x = LW + 20; p.vx = Math.abs(p.vx) * .4; } if (p.x > RW - 20) { p.x = RW - 20; p.vx = -Math.abs(p.vx) * .4; }
    p.face = HOOP[p.team].x > p.x ? 1 : -1;
  }
  function collidePlayers() {
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      const a = P[i], b = P[j], ja = joints(a), jb = joints(b), mx = (ja.sh.x + a.x) / 2 - (jb.sh.x + b.x) / 2, my = (ja.sh.y + a.y) / 2 - (jb.sh.y + b.y) / 2, d = Math.hypot(mx, my) || 1, min = 40 * (a.s + b.s) / 2;
      if (d < min) { const push = (min - d) / 2, nx = mx / d; a.x += nx * push; b.x -= nx * push; const rv = (a.vx - b.vx) * nx; if (rv < 0) { a.vx -= rv * nx * .6; b.vx += rv * nx * .6; a.w += nx * 1.2; b.w -= nx * 1.2; } }
    }
  }
  function segHit(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1, k = clamp(((px - ax) * vx + (py - ay) * vy) / l2, 0, 1), cx = ax + vx * k, cy = ay + vy * k; return { cx, cy, d: Math.hypot(px - cx, py - cy) }; }
  function bounceOff(cx, cy, d, rad, vx = 0, vy = 0, e = ball.b) {
    if (d >= rad || d === 0) return false; const nx = (ball.x - cx) / d, ny = (ball.y - cy) / d;
    ball.x = cx + nx * rad; ball.y = cy + ny * rad; const rvx = ball.vx - vx, rvy = ball.vy - vy, vn = rvx * nx + rvy * ny;
    if (vn < 0) { ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny; if (-vn > 120) bounce(-vn); } return true;
  }
  function stepBall(dt) {
    const B = ball; if (B.cd > 0) B.cd -= dt;
    if (B.holder) {
      const p = B.holder, j = joints(p); B.x = j.hand.x; B.y = j.hand.y; B.vx = p.vx; B.vy = p.vy;
      // the throw: when the swinging arm passes the top, the ball flies toward the hoop, more or less
      if (p.arm > .82 && p.armV > 0) {
        const h = HOOP[p.team], dx = h.x - B.x, dy = HOOPY - B.y, T = clamp(Math.abs(dx) / 620, .55, 1.25), g = mod.g * (B.m < .5 ? .75 : 1);
        const aim = rnd(.86, 1.12); B.vx = dx / T * aim + p.vx * .25; B.vy = (dy - .5 * g * T * T) / T * rnd(.92, 1.06);
        if (B.m > 2) { B.vx *= .8; B.vy *= .85; }
        B.holder = null; p.hold = false; B.cd = .35; B.last = p.team; K.sfx(330, .1, 'square', .06, 260);
      }
      return;
    }
    B.vy += mod.g * (B.m < .5 ? .75 : 1) * dt; B.vx *= 1 - .08 * dt / Math.max(.3, B.m); B.x += B.vx * dt; B.y += B.vy * dt; B.spin += B.vx * dt * .05;
    if (B.y > FLOOR - B.r) { B.y = FLOOR - B.r; if (B.vy > 80) bounce(B.vy); B.vy = -B.vy * B.b; B.vx *= mod.ice ? .99 : .9; }
    if (B.x < LW + B.r) { B.x = LW + B.r; B.vx = Math.abs(B.vx) * B.b; } if (B.x > RW - B.r) { B.x = RW - B.r; B.vx = -Math.abs(B.vx) * B.b; }
    if (B.y < 20 + B.r) { B.y = 20 + B.r; B.vy = Math.abs(B.vy) * B.b; }
    // hoops: the front of the rim and the backboard bounce the ball; dropping through the middle scores
    for (const [team, h] of HOOP.entries()) {
      const front = h.x - h.dir * RIM, back = h.x + h.dir * (RIM + 4);
      bounceOff(front, HOOPY, Math.hypot(B.x - front, B.y - HOOPY), B.r + 4);
      const bb = segHit(B.x, B.y, back + h.dir * 10, HOOPY - 110, back + h.dir * 10, HOOPY + 20); bounceOff(bb.cx, bb.cy, bb.d, B.r + 5);
      if (B.vy > 0 && Math.abs(B.x - h.x) < RIM - B.r * .4 && B.y > HOOPY - 6 && B.y - B.vy * dt <= HOOPY - 6) return scored(team);
    }
    // players: bodies push, hands grab
    for (const p of P) {
      const j = joints(p), body = segHit(B.x, B.y, p.x, p.y - 10, j.sh.x, j.sh.y);
      bounceOff(body.cx, body.cy, body.d, B.r + 13 * p.s, p.vx, p.vy, .5);
      bounceOff(j.head.x, j.head.y, Math.hypot(B.x - j.head.x, B.y - j.head.y), B.r + 14 * p.s, p.vx, p.vy, .6);
      if (B.cd <= 0 && Math.hypot(B.x - j.hand.x, B.y - j.hand.y) < B.r + 16 * p.s) {
        if (B.holder && B.holder !== p) continue;
        B.holder = p; p.hold = true; B.cd = .2; B.last = p.team; K.sfx(260, .06, 'triangle', .08); break;
      }
    }
  }
  function scored(team) {
    score[team]++; netK[team] = 1; swish(); K.shake(10); flash = { t: 0, team }; K.burst(HOOP[team].x, HOOPY + 20, [COL[team][0], '#fff', '#ffd23f'], 30, 420);
    if (team === 0 || !cpu) K.add(10);
    if (score[team] >= 5) { winner = team; mode = 'won'; t = 0; buzzer(); if (team === 0 || !cpu) K.add(50); return; }
    mode = 'scored'; t = 0;
  }
  // a stolen ball: anyone else's hand on it while it is held knocks it loose
  function strips() {
    const B = ball; if (!B.holder) return;
    for (const p of P) if (p.team !== B.holder.team) { const j = joints(p); if (Math.hypot(B.x - j.hand.x, B.y - j.hand.y) < B.r + 12 && p.arm > .3) { B.holder.hold = false; B.holder = null; B.vy = -300; B.vx = (B.x < j.hand.x ? -1 : 1) * 220; B.cd = .25; K.sfx(180, .08, 'square', .07); return; } }
  }

  /* ---------- drawing: a bright gym ---------- */
  function rr(g, x, y, w, h, r, f) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = f; g.fill(); }
  function tx(g, s, x, y, font, c, al = 'center', st) { g.font = font; g.textAlign = al; g.textBaseline = 'middle'; if (st) { g.lineJoin = 'round'; g.lineWidth = st[1]; g.strokeStyle = st[0]; g.strokeText(s, x, y); } g.fillStyle = c; g.fillText(s, x, y); }
  const SKIN = ['#f0c8a0', '#c88a5a', '#8a5a3a', '#ffe0c0', '#e0a878', '#6a4028'], CROWD = ['#ff7a1a', '#29a8ff', '#ffd23f', '#e8e8e8', '#ff5fa2', '#7ad86a', '#9a6aff'];
  let netK = [0, 0];
  function court(g) {
    const v = K.view, W = v.x1 - v.x0, ice = mod && mod.ice;
    const wall = g.createLinearGradient(0, 0, 0, FLOOR); wall.addColorStop(0, '#121a36'); wall.addColorStop(.45, '#1e2c5a'); wall.addColorStop(1, '#30478a'); g.fillStyle = wall; g.fillRect(v.x0, v.y0, W, FLOOR - v.y0);
    // stands: three tiers of fans, back rows darker
    for (let row = 0; row < 4; row++) {
      const y = 96 + row * 34, dk = .55 + row * .15; g.fillStyle = `rgba(10,14,34,${.75 - row * .12})`; g.fillRect(v.x0, y - 22, W, 34);
      for (let i = -2; i < 96; i++) { const x = i * 14 + (row % 2) * 7, h = (i * 7 + row * 13) % 17, cheer = (mode === 'scored' || mode === 'won') && (h % 2), hop = cheer ? -Math.abs(Math.sin(t * 13 + i)) * 7 : Math.sin(t * 2 + i * 1.7) * .8;
        g.globalAlpha = dk; g.fillStyle = CROWD[h % 7]; g.beginPath(); g.roundRect(x - 5, y - 4 + hop, 11, 14, [5, 5, 0, 0]); g.fill();
        g.fillStyle = SKIN[h % 6]; g.beginPath(); g.arc(x, y - 9 + hop, 4.6, 0, 7); g.fill();
        if (cheer) { g.fillRect(x - 7, y - 16 + hop, 2, 9); g.fillRect(x + 5, y - 16 + hop, 2, 9); } }
      g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(v.x0, y + 11, W, 2);
    }
    // the jumbotron rail and hanging team pennants
    g.fillStyle = '#0a0e20'; g.fillRect(v.x0, 226, W, 14); g.fillStyle = '#ffd23f'; g.fillRect(v.x0, 238, W, 3);
    for (let i = 0; i < 8; i++) { const x = 90 + i * 160, c = COL[i % 2][0]; g.fillStyle = c; g.beginPath(); g.moveTo(x - 22, 241); g.lineTo(x + 22, 241); g.lineTo(x, 286 + Math.sin(t * 2 + i) * 3); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - 22, 241, 44, 4); }
    // spotlights
    g.save(); g.globalCompositeOperation = 'lighter'; for (const [x, a] of [[240, .07], [640, .09], [1040, .07]]) { const gr = g.createLinearGradient(0, 0, 0, FLOOR); gr.addColorStop(0, `rgba(180,210,255,${a * 1.6})`); gr.addColorStop(1, 'rgba(180,210,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 30, 0); g.lineTo(x + 30, 0); g.lineTo(x + 230, FLOOR); g.lineTo(x - 230, FLOOR); g.fill(); } g.restore();
    // LED ad boards along the sideline
    const adY = FLOOR - 46; g.fillStyle = '#0a0c18'; g.fillRect(v.x0, adY, W, 46);
    const ads = ['FLOP HOOPS', 'PULSEBOX', 'SLAM CITY', 'BOING', 'HOOP DREAMS'], off = (t * 30) % 260;
    g.save(); g.beginPath(); g.rect(v.x0, adY + 4, W, 38); g.clip(); for (let i = -1; i < 7; i++) { const x = i * 260 - off + 20; g.fillStyle = i % 2 ? '#14306a' : '#5a1a0a'; g.fillRect(x, adY + 4, 252, 38); tx(g, ads[(i + 10) % 5], x + 126, adY + 24, `24px ${FD}`, i % 2 ? '#7ac8ff' : '#ffb07a'); } g.restore();
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(v.x0, adY + 4, W, 2);
    // hardwood (or ice) floor with paint and a glossy shine
    const fl = g.createLinearGradient(0, FLOOR, 0, 720); fl.addColorStop(0, ice ? '#d8f2ff' : '#e8aa66'); fl.addColorStop(1, ice ? '#8ac8f0' : '#b0702e'); g.fillStyle = fl; g.fillRect(v.x0, FLOOR, W, v.y1 - FLOOR);
    if (!ice) for (let i = -2; i < 44; i++) { const x = i * 32; g.fillStyle = i % 3 === 0 ? 'rgba(120,60,20,.10)' : i % 3 === 1 ? 'rgba(255,220,170,.07)' : 'rgba(0,0,0,0)'; g.beginPath(); g.moveTo(x, FLOOR); g.lineTo(x + 32, FLOOR); g.lineTo(x + 32 - 40, 720); g.lineTo(x - 40, 720); g.fill(); }
    g.strokeStyle = ice ? 'rgba(255,255,255,.5)' : 'rgba(90,50,20,.28)'; g.lineWidth = 1.5; for (let x = 0; x < 1300; x += 32) { g.beginPath(); g.moveTo(x, FLOOR); g.lineTo(x - 40, 720); g.stroke(); }
    for (const [team, h] of HOOP.entries()) { const kx = h.x; g.fillStyle = ice ? 'rgba(120,180,230,.25)' : 'rgba(140,50,10,.22)'; g.beginPath(); g.moveTo(kx - 150 * h.dir, FLOOR + 8); g.lineTo(kx + 120 * h.dir, FLOOR + 8); g.lineTo(kx + 150 * h.dir, 712); g.lineTo(kx - 210 * h.dir, 712); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.stroke(); g.fillStyle = COL[1 - team][0]; g.globalAlpha = .5; g.beginPath(); g.ellipse(kx - 15 * h.dir, FLOOR + 40, 40, 10, 0, 0, 7); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.beginPath(); g.ellipse(kx, FLOOR + 60, 380, 52, 0, h.dir > 0 ? Math.PI * .5 : -Math.PI * .5, h.dir > 0 ? Math.PI * 1.5 : Math.PI * .5); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.beginPath(); g.ellipse(640, FLOOR + 56, 120, 36, 0, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,210,63,.35)'; g.beginPath(); g.ellipse(640, FLOOR + 56, 60, 18, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(v.x0, FLOOR, W, 4); g.fillRect(638, FLOOR, 4, 110);
    const sh = g.createLinearGradient(0, FLOOR, 0, FLOOR + 50); sh.addColorStop(0, 'rgba(255,255,255,.22)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(v.x0, FLOOR + 4, W, 50);
    for (const [team, h] of HOOP.entries()) {
      const back = h.x + h.dir * (RIM + 14), pole = h.x + h.dir * 96;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(pole, FLOOR + 6, 40, 7, 0, 0, 7); g.fill();
      g.fillStyle = '#3a4050'; g.fillRect(pole - 9, HOOPY - 60, 18, FLOOR - HOOPY + 60); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(pole - 6, HOOPY - 60, 4, FLOOR - HOOPY + 60);
      g.fillStyle = COL[1 - team][0]; g.beginPath(); g.roundRect(pole - 16, FLOOR - 120, 32, 120, 6); g.fill(); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(pole + (h.dir > 0 ? 6 : -16), FLOOR - 120, 10, 120);
      g.fillStyle = '#3a4050'; g.fillRect(Math.min(pole, back), HOOPY - 50, Math.abs(pole - back), 10);
      g.fillStyle = 'rgba(220,240,255,.35)'; g.fillRect(back - 8, HOOPY - 128, 16, 150); g.strokeStyle = '#f4f6fa'; g.lineWidth = 3; g.strokeRect(back - 8, HOOPY - 128, 16, 150);
      g.fillStyle = COL[1 - team][0]; g.fillRect(back - 5, HOOPY - 56, 10, 40);
    }
  }
  function hoopFront(g) {
    for (const [team, h] of HOOP.entries()) {
      const k = netK[team], sway = Math.sin(t * 30) * 6 * k, drop = 10 * k;
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2;
      for (let i = 0; i <= 6; i++) { const x0 = h.x - RIM + i * RIM / 3, x1 = h.x - RIM * .55 + i * RIM * .55 / 3 + sway; g.beginPath(); g.moveTo(x0, HOOPY); g.quadraticCurveTo((x0 + x1) / 2 + sway * .5, HOOPY + 30, x1, HOOPY + 54 + drop); g.stroke(); }
      for (let r = 1; r <= 3; r++) { const yy = HOOPY + r * (17 + drop / 3); g.beginPath(); g.moveTo(h.x - RIM + r * 5 + sway * r / 3, yy); g.lineTo(h.x + RIM - r * 5 + sway * r / 3, yy); g.stroke(); }
      const rg = g.createLinearGradient(0, HOOPY - 5, 0, HOOPY + 5); rg.addColorStop(0, '#ff8a4a'); rg.addColorStop(1, '#c8300a'); g.fillStyle = rg; g.beginPath(); g.roundRect(h.x - RIM - 5, HOOPY - 5, RIM * 2 + 10, 10, 5); g.fill(); g.strokeStyle = '#6a1a0a'; g.lineWidth = 1.5; g.stroke();
    }
  }
  function drawPlayer(g, p, refl) {
    const j = joints(p), [c, dark, light] = COL[p.team], s = p.s, O = '#141420';
    g.lineCap = 'round';
    if (!refl) { const hgt = clamp((FLOOR - p.y) / 300, 0, 1); g.fillStyle = `rgba(0,0,0,${.28 - hgt * .18})`; g.beginPath(); g.ellipse(p.x + j.ux * 20, FLOOR + 5, (34 - hgt * 14) * s, 7, 0, 0, 7); g.fill(); }
    const hip = { x: p.x + j.ux * p.L * .32, y: p.y + j.uy * p.L * .32 }, mid = { x: p.x + j.ux * p.L * .45, y: p.y + j.uy * p.L * .45 }, feet = [-1, 1].map(k => ({ x: p.x + k * 10 * s + (p.ground ? 0 : k * 6), y: p.y }));
    const line = (a, b, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); };
    // outline pass
    for (const f of feet) line(hip, f, 12 * s + 5, O);
    line(hip, mid, 30 * s + 5, O); line(mid, j.sh, 32 * s + 5, O); line(j.sh, j.hand, 11 * s + 5, O);
    g.fillStyle = O; g.beginPath(); g.arc(j.head.x, j.head.y, 16 * s + 2.5, 0, 7); g.fill();
    for (const f of feet) { g.beginPath(); g.ellipse(f.x + p.face * 4, f.y - 2, 10 * s + 2.5, 6 * s + 2.5, 0, 0, 7); g.fill(); }
    // legs, socks and team shoes
    for (const f of feet) { line(hip, f, 12 * s, '#f0b888'); line({ x: f.x + (hip.x - f.x) * .22, y: f.y + (hip.y - f.y) * .22 }, f, 12 * s, '#f4f4f4'); }
    for (const f of feet) { g.fillStyle = c; g.beginPath(); g.ellipse(f.x + p.face * 4, f.y - 2, 10 * s, 6 * s, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(f.x + p.face * 4 - 8 * s, f.y + 1, 16 * s, 2); }
    // shorts, jersey with trim and number
    line(hip, mid, 30 * s, dark); line(mid, j.sh, 32 * s, c);
    g.strokeStyle = light; g.lineWidth = 3; g.beginPath(); g.moveTo(mid.x - j.uy * 14 * s, mid.y + j.ux * 14 * s); g.lineTo(mid.x + j.uy * 14 * s, mid.y - j.ux * 14 * s); g.stroke();
    g.save(); g.translate((p.x + j.ux * p.L * .6 + j.sh.x) / 2, (p.y + j.uy * p.L * .6 + j.sh.y) / 2); g.rotate(p.a); tx(g, String(p.k ? 7 : 23), 0, 0, `${18 * s}px ${FD}`, light, 'center', [dark, 3]); g.restore();
    // head: skin, hair, headband, face
    g.fillStyle = p.team ? '#c88a5a' : '#f0c090'; if (p.k) g.fillStyle = p.team ? '#f0c8a0' : '#8a5a3a'; g.beginPath(); g.arc(j.head.x, j.head.y, 16 * s, 0, 7); g.fill();
    g.save(); g.translate(j.head.x, j.head.y); g.rotate(p.a);
    g.fillStyle = ['#3a2210', '#1a1a1a', '#e8b84a', '#6a3a1a'][p.team * 2 + p.k]; g.beginPath(); g.arc(0, -3 * s, 16 * s, Math.PI * 1.05, Math.PI * 1.95); g.fill(); if (p.k) { g.beginPath(); g.arc(-p.face * 9 * s, -12 * s, 7 * s, 0, 7); g.fill(); }
    g.fillStyle = light; g.fillRect(-16 * s, -8 * s, 32 * s, 5 * s);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(p.face * 6 * s, 0, 3.4 * s, 0, 7); g.fill(); g.fillStyle = '#141420'; g.beginPath(); g.arc(p.face * 7 * s, 0, 1.8 * s, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(p.face * 5 * s - 4, 8 * s, 8 * s, 2 * s); g.fillStyle = 'rgba(255,120,120,.35)'; g.beginPath(); g.arc(p.face * 3 * s, 5 * s, 3 * s, 0, 7); g.fill();
    g.restore();
    // the arm with a sleeve and a wristband
    line(j.sh, j.hand, 11 * s, p.team ? '#c88a5a' : '#f0c090'); line(j.sh, { x: j.sh.x + (j.hand.x - j.sh.x) * .35, y: j.sh.y + (j.hand.y - j.sh.y) * .35 }, 13 * s, c);
    line({ x: j.sh.x + (j.hand.x - j.sh.x) * .78, y: j.sh.y + (j.hand.y - j.sh.y) * .78 }, { x: j.sh.x + (j.hand.x - j.sh.x) * .86, y: j.sh.y + (j.hand.y - j.sh.y) * .86 }, 12 * s, light);
  }
  function drawBall(g) {
    const B = ball, beach = mod.id === 'beach', bowl = mod.id === 'bowling', sp = Math.hypot(B.vx, B.vy);
    if (sp > 700 && !B.holder) { for (let i = 1; i <= 5; i++) { g.fillStyle = `rgba(255,${beach ? 255 : 160},60,${.16 - i * .025})`; g.beginPath(); g.arc(B.x - B.vx * i * .012, B.y - B.vy * i * .012, B.r * (1 - i * .1), 0, 7); g.fill(); } }
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(B.x, FLOOR + 4, B.r * clamp(1 - (FLOOR - B.y) / 900, .3, 1), 5, 0, 0, 7); g.fill();
    g.save(); g.translate(B.x, B.y); g.rotate(B.spin);
    if (beach) { for (let i = 0; i < 6; i++) { g.fillStyle = ['#ff4a4a', '#fff', '#3a8aff', '#fff', '#ffd23f', '#fff'][i]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, B.r, i * Math.PI / 3, (i + 1) * Math.PI / 3); g.fill(); } }
    else { g.fillStyle = bowl ? '#3a2a6a' : '#f07020'; g.beginPath(); g.arc(0, 0, B.r, 0, 7); g.fill(); g.strokeStyle = bowl ? '#1a1030' : '#5a2a0a'; g.lineWidth = 2.5;
      if (bowl) { g.fillStyle = '#1a1030'; for (const [a, b] of [[-5, -6], [4, -7], [0, 2]]) { g.beginPath(); g.arc(a, b, 3, 0, 7); g.fill(); } }
      else { g.beginPath(); g.moveTo(-B.r, 0); g.lineTo(B.r, 0); g.moveTo(0, -B.r); g.lineTo(0, B.r); g.stroke(); g.beginPath(); g.arc(-B.r * 1.25, 0, B.r * .9, -.8, .8); g.stroke(); g.beginPath(); g.arc(B.r * 1.25, 0, B.r * .9, Math.PI - .8, Math.PI + .8); g.stroke(); } }
    g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(-B.r * .35, -B.r * .35, B.r * .35, 0, 7); g.fill();
    g.restore();
  }
  function scoreboard(g) {
    rr(g, 496, 4, 288, 66, 14, '#0a0c18'); rr(g, 500, 8, 280, 58, 12, '#1a1e34'); rr(g, 510, 16, 110, 42, 8, COL[0][0]); rr(g, 660, 16, 110, 42, 8, COL[1][0]); rr(g, 510, 16, 110, 16, [8, 8, 0, 0], 'rgba(255,255,255,.18)'); rr(g, 660, 16, 110, 16, [8, 8, 0, 0], 'rgba(255,255,255,.18)');
    tx(g, String(score[0]), 565, 38, `34px ${FD}`, '#fff'); tx(g, String(score[1]), 715, 38, `34px ${FD}`, '#fff'); tx(g, 'to 5', 640, 38, `16px ${FD}`, '#9fb0d0');
    tx(g, cpu ? 'YOU' : 'P1  (W)', 420, 38, `22px ${FD}`, COL[0][0], 'right'); tx(g, cpu ? 'CPU' : 'P2  (↑)', 860, 38, `22px ${FD}`, COL[1][0], 'left');
  }
  const BT = { cpu: { x: 340, y: 380, w: 600, h: 96 }, two: { x: 340, y: 496, w: 600, h: 96 } };
  function menu(g) {
    court(g); g.fillStyle = 'rgba(10,14,30,.55)'; g.fillRect(K.view.x0, 0, K.view.x1 - K.view.x0, 720);
    tx(g, 'FLOP HOOPS', 640, 150, `110px ${FD}`, '#ffd23f', 'center', ['#1a1a2a', 14]);
    tx(g, 'One button. Floppy players. Random rules.', 640, 236, `800 24px ${FB}`, '#fff');
    tx(g, 'Every point the game changes: beach ball, moon gravity, ice floor...', 640, 280, `700 19px ${FB}`, '#cfd8f0');
    for (const [k, b] of Object.entries(BT)) { const hv = hover === k; rr(g, b.x, b.y + 6, b.w, b.h, 18, 'rgba(0,0,0,.35)'); rr(g, b.x, b.y + (hv ? 3 : 0), b.w, b.h, 18, k === 'cpu' ? '#ff7a1a' : '#29a8ff'); tx(g, k === 'cpu' ? '1 PLAYER  vs  CPU' : '2 PLAYERS  ·  ONE DEVICE', 640, b.y + 40 + (hv ? 3 : 0), `38px ${FD}`, '#fff', 'center', ['rgba(0,0,0,.25)', 6]); tx(g, k === 'cpu' ? 'Your button: W, Space, or tap anywhere' : 'P1: W or tap left  ·  P2: Up arrow or tap right', 640, b.y + 74 + (hv ? 3 : 0), `800 17px ${FB}`, '#fff'); }
  }
  /* ---------- kit hooks ---------- */
  GAME.reset = () => { posed = false; t = 0; hold = [0, 0]; if (K.bot) startMatch(true); else { mode = 'menu'; score = [0, 0]; mod = MODS[0]; } };
  GAME.update = dt => {
    t += dt; netK = netK.map(k => Math.max(0, k - dt * 1.4)); if (mode === 'menu') return;
    dt = Math.min(dt, 1 / 30);
    if (banner && (banner.t += dt) > 2.2) banner = null;
    if (mode === 'scored') { if (t > 1.6) { mode = 'play'; newPoint(); } else { for (const p of P) stepPlayer(p, dt); } return; }
    if (mode === 'won') { for (const p of P) stepPlayer(p, dt); if (t > 2.4 && !posed) { K.over({ title: cpu ? (winner === 0 ? 'You win!' : 'The CPU wins') : `Player ${winner + 1} wins!`, text: `Final score ${score[0]} - ${score[1]}. Every point played under different rules.`, delay: 100 }); mode = 'done'; } return; }
    if (mode !== 'play') return;
    for (const tm of [0, 1]) if (rel[tm] > 0 && (rel[tm] -= dt) <= 0) release(tm);
    if (wait > 0) { wait -= dt; return; }
    for (let s = 0; s < 2; s++) { const h = dt / 2; for (const p of P) stepPlayer(p, h); collidePlayers(); stepBall(h); strips(); }
    // the CPU: jumps when the ball is near one of its players, or to swat and to shoot
    if (cpu && !K.bot) cpuThink(dt);
  };
  function cpuThink(dt) {
    if ((botT -= dt) > 0) return; botT = rnd(.12, .3);
    const mine = P.filter(p => p.team === 1), B = ball, held = B.holder && B.holder.team === 1, near = mine.some(p => Math.hypot(p.x - B.x, (p.y - p.L) - B.y) < 170);
    if (held && Math.abs(B.x - HOOP[1].x) < 700 && Math.random() < .5) tap(1, .26);
    else if (!held && (near ? Math.random() < .55 : Math.random() < .3)) tap(1, .2);
  }
  GAME.draw = g => {
    if (mode === 'menu') return menu(g);
    court(g);
    g.save(); g.beginPath(); g.rect(K.view.x0, FLOOR + 4, K.view.x1 - K.view.x0, 720); g.clip(); g.translate(0, FLOOR * 2 + 8); g.scale(1, -1); g.globalAlpha = mod.ice ? .3 : .16; for (const p of P) drawPlayer(g, p, true); drawBall(g); g.restore(); g.globalAlpha = 1;
    for (const p of P) drawPlayer(g, p); drawBall(g); hoopFront(g); scoreboard(g);
    if (banner) { const a = Math.min(1, banner.t * 4, (2.2 - banner.t) * 3); g.globalAlpha = Math.max(0, a); rr(g, 390, 250, 500, 120, 18, 'rgba(10,14,30,.85)'); tx(g, banner.name.toUpperCase(), 640, 296, `48px ${FD}`, '#ffd23f'); tx(g, banner.sub, 640, 340, `800 20px ${FB}`, '#fff'); g.globalAlpha = 1; }
    if (mode === 'scored' || mode === 'won' || mode === 'done') { const tm = flash.team, w = mode !== 'scored'; tx(g, w ? (cpu ? (tm === 0 ? 'YOU WIN!' : 'CPU WINS') : `PLAYER ${tm + 1} WINS!`) : 'BUCKET!', 640, 200, `${w ? 96 : 84}px ${FD}`, COL[tm][0], 'center', ['#141420', 12]); }
    if (wait > 0 && mode === 'play') tx(g, wait > .7 ? 'READY' : 'GO!', 640, 420, `64px ${FD}`, '#fff', 'center', ['#141420', 10]);
    if (mode === 'play' && score[0] + score[1] === 0 && wait <= 0 && t < 30 && !K.bot) tx(g, cpu ? 'Press W, Space or tap: jump and swing. Touch the ball to grab it, press again to throw!' : 'P1: W or tap the left half  ·  P2: Up arrow or tap the right half', 640, 690, `800 18px ${FB}`, '#fff', 'center', ['rgba(0,0,0,.5)', 5]);
  };
  const side = x => cpu ? 0 : x < 640 ? 0 : 1;
  GAME.down = (x, y) => {
    K.audio && K.audio();
    if (mode === 'menu') { if (x >= BT.cpu.x && x <= BT.cpu.x + BT.cpu.w && y >= BT.cpu.y && y <= BT.cpu.y + BT.cpu.h) startMatch(true); if (x >= BT.two.x && x <= BT.two.x + BT.two.w && y >= BT.two.y && y <= BT.two.y + BT.two.h) startMatch(false); return; }
    const s = side(x); hold[s] = 1; push(s);
  };
  GAME.up = (x) => { const s = side(x); hold[s] = 0; release(s); };
  GAME.move = (x, y) => { if (mode !== 'menu') return; hover = null; for (const [k, b] of Object.entries(BT)) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) hover = k; const c = document.getElementById('cv'); if (c) c.style.cursor = hover ? 'pointer' : 'default'; };
  GAME.key = (c, d) => {
    if (mode === 'menu') { if (d && (c === 'Digit1' || c === 'Enter' || c === 'Space')) startMatch(true); if (d && c === 'Digit2') startMatch(false); return; }
    const team = c === 'KeyW' || (cpu && c === 'Space') ? 0 : c === 'ArrowUp' && !cpu ? 1 : c === 'ArrowUp' && cpu ? 0 : -1;
    if (team < 0) return; if (d) push(team); else release(team);
  };
  // the demo: both teams play like the CPU
  GAME.bot = dt => {
    if ((botT -= dt) > 0) return; botT = rnd(.12, .3);
    for (const tm of [0, 1]) { const mine = P.filter(p => p.team === tm), B = ball, held = B.holder && B.holder.team === tm, near = mine.some(p => Math.hypot(p.x - B.x, (p.y - p.L) - B.y) < 170);
      if ((held && Math.random() < .5) || (!held && Math.random() < (near ? .55 : .3))) tap(tm, .24); }
  };
  GAME.pose = () => { posed = true; startMatch(true); wait = 0; banner = null; score = [3, 2]; mod = MODS[1]; P = [mkPlayer(0, 0), mkPlayer(0, 1), mkPlayer(1, 0), mkPlayer(1, 1)]; P[0].x = 980; P[0].y = 470; P[0].a = .5; P[0].arm = .9; P[0].ground = false; P[2].x = 1060; P[2].a = -.4; P[2].arm = .6; P[1].x = 700; P[1].a = .3; P[3].x = 560; P[3].a = -.6; ball = { x: 1090, y: 250, vx: 0, vy: 0, r: 36, m: .35, b: .85, holder: null, cd: 0, spin: .4, last: 0 }; };
  GAME.test = { st: () => ({ mode, score, mod: mod && mod.id, ball: ball && { x: Math.round(ball.x), y: Math.round(ball.y), held: !!ball.holder } }), start: startMatch, sim: (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) { GAME.bot(dt); GAME.update(dt); } } };
})();
