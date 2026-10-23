/* Brick Blitz: breakout with endless generated levels, power-ups and falling coins. 3 lives. */
const GAME = {
  id: 'brick-blitz', title: 'Brick Blitz', tagline: 'Smash every brick. Grab power-ups. Never let the ball drop!',
  font: 'Bungee', accent: '#ff5fa2', accent2: '#5ff3ff', bg: '#0b0820',
  how: ['Move with the mouse, your finger, or the arrow keys.', 'Tap or press Space to launch the ball.', 'Catch power-ups: M = multiball, W = wide, F = fireball, S = slow.'],
  skins: [
    { name: 'Neon', price: 0, c: ['#5ff3ff', '#ff5fa2'] }, { name: 'Lime', price: 60, c: ['#c6ff3d', '#2bd46b'] }, { name: 'Sunset', price: 150, c: ['#ffb347', '#ff4d6a'] },
    { name: 'Grape', price: 250, c: ['#c79bff', '#6a3bff'] }, { name: 'Ice', price: 400, c: ['#e8fbff', '#62b6ff'] }, { name: 'Royal', price: 700, c: ['#ffe36e', '#b07cff'] },
  ],
};
(() => {
  const PY = 664, COLS = 12, BW = 92, BHt = 30, GAP = 6, TOP = 96, LEFT = (W - COLS * (BW + GAP) + GAP) / 2;
  let pad, balls, bricks, drops, lives, level, combo, stuck, wideT, fireT, slowT, keys, launchAt, dead, clearT, trail;
  GAME.drawSkin = (gr, s) => {
    const gd = gr.createLinearGradient(-44, 0, 44, 0); gd.addColorStop(0, s.c[0]); gd.addColorStop(1, s.c[1]);
    gr.fillStyle = gd; gr.beginPath(); gr.roundRect(-44, 14, 88, 16, 8); gr.fill();
    gr.shadowColor = s.c[0]; gr.shadowBlur = 14; gr.fillStyle = '#fff'; gr.beginPath(); gr.arc(0, -10, 12, 0, 7); gr.fill(); gr.shadowBlur = 0;
  };
  const PATTERNS = [
    (r, c) => true,
    (r, c) => (r + c) % 2 === 0,
    (r, c, R) => Math.abs(c - 5.5) <= r + .5,
    (r, c, R) => Math.abs(c - 5.5) + Math.abs(r - (R - 1) / 2) <= R / 2 + 1.5,
    (r, c) => r % 2 === 0,
    (r, c) => c % 3 !== 1,
    (r, c) => Math.random() < .75,
    (r, c, R) => r === 0 || r === R - 1 || c === 0 || c === COLS - 1 || (r === Math.floor(R / 2) && c > 2 && c < 9),
  ];
  function buildLevel() {
    const R = Math.min(9, 5 + Math.floor(level / 2)), pat = level === 1 ? PATTERNS[0] : K.pick(PATTERNS), h0 = K.irand(0, 360);
    bricks = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) if (pat(r, c, R)) {
      const hp = Math.max(1, Math.min(3, 1 + Math.floor((level - 1 + (R - r) * .4) / 3) - (Math.random() < .5 ? 1 : 0)));
      bricks.push({ x: LEFT + c * (BW + GAP), y: TOP + r * (BHt + GAP), hp, max: hp, hue: (h0 + r * 22) % 360, hit: 0 });
    }
    if (!bricks.length) buildLevel();
  }
  function newBall() { balls = [{ x: pad.x, y: PY - 24, vx: 0, vy: 0, r: 11 }]; stuck = true; launchAt = K.t + 1.4; combo = 0; }
  GAME.reset = () => {
    pad = { x: W / 2, tx: W / 2, w: 170 }; lives = 3; level = 1; drops = []; wideT = fireT = slowT = 0; keys = {}; dead = false; clearT = 0; trail = [];
    buildLevel(); newBall();
  };
  const speed = () => Math.min(900, 520 + level * 22) * (slowT > 0 ? .7 : 1);
  function launch() {
    if (!stuck || dead) return; stuck = false;
    const a = K.rand(-.35, .35); balls[0].vx = Math.sin(a) * speed(); balls[0].vy = -Math.cos(a) * speed(); K.sfx(520, .08, 'square', .08);
  }
  GAME.down = (x) => { pad.tx = x; launch(); };
  GAME.move = (x) => { pad.tx = x; };
  GAME.key = (c, d) => { keys[c] = d; if (d && (c === 'Space' || c === 'ArrowUp')) launch(); };
  GAME.bot = dt => {
    if (stuck) { if (K.t > launchAt - .9) launch(); return; }
    let best = null;
    for (const b of balls) if (b.vy > 0 && (!best || b.y > best.y)) best = b;
    if (!best) { pad.tx = balls[0] ? balls[0].x : W / 2; return; }
    let x = best.x + best.vx * ((PY - best.y) / best.vy);
    const span = W - 2 * best.r; x -= best.r; x = ((x % (2 * span)) + 2 * span) % (2 * span); x = (x > span ? 2 * span - x : x) + best.r;
    if (GAME._aim === undefined || Math.random() < .02) GAME._aim = K.rand(-.4, .4) * pad.w / 2 + (Math.random() < .03 ? 140 : 0);
    pad.tx = x + GAME._aim;
  };
  function hitBrick(b, ball) {
    b.hp -= ball.fire ? 3 : 1; b.hit = .15;
    if (b.hp <= 0) {
      bricks.splice(bricks.indexOf(b), 1); combo++;
      K.add(1); K.burst(b.x + BW / 2, b.y + BHt / 2, [`hsl(${b.hue},90%,65%)`, '#fff'], 10, 260, { square: true, life: .5 });
      K.sfx(380 + Math.min(combo, 16) * 40, .07, 'square', .07);
      if (combo > 2 && combo % 3 === 0) K.pop(b.x + BW / 2, b.y, `x${combo}`, '#ffe36e', 30);
      const r = Math.random();
      if (r < .1) drops.push({ x: b.x + BW / 2, y: b.y, t: K.pick(['M', 'W', 'F', 'S', 'M']) });
      else if (r < .24) drops.push({ x: b.x + BW / 2, y: b.y, t: '$' });
      if (!bricks.length) { clearT = 1.6; K.add(5); K.coin(3, W / 2, H / 2); K.toast(`Level ${level} clear!`); K.chime(523, [0, 4, 7, 12, 16]); balls.length = 1; }
    } else K.sfx(240, .05, 'square', .06);
  }
  GAME.update = dt => {
    if (dead) return;
    const pw = pad.w * (wideT > 0 ? 1.5 : 1);
    if (keys.ArrowLeft || keys.KeyA) pad.tx = pad.x - 1100 * dt; if (keys.ArrowRight || keys.KeyD) pad.tx = pad.x + 1100 * dt;
    pad.tx = K.clamp(pad.tx, pw / 2, W - pw / 2);
    const mv = K.bot ? 1100 * dt : 99999; pad.x += K.clamp(pad.tx - pad.x, -mv, mv);
    wideT -= dt; fireT -= dt; slowT -= dt;
    if (clearT > 0) { clearT -= dt; if (clearT <= 0) { level++; buildLevel(); newBall(); } return; }
    if (stuck) { balls[0].x = pad.x; balls[0].y = PY - 24; if (K.t > launchAt) launch(); }
    else for (let step = 0; step < 4; step++) for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i], sd = dt / 4; b.fire = fireT > 0;
      const sp = Math.hypot(b.vx, b.vy), want = speed(); b.vx *= want / sp; b.vy *= want / sp;
      b.x += b.vx * sd; b.y += b.vy * sd;
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y < b.r + 40) { b.y = b.r + 40; b.vy = Math.abs(b.vy); }
      if (b.vy > 0 && b.y + b.r >= PY && b.y < PY + 18 && Math.abs(b.x - pad.x) < pw / 2 + b.r) {
        const off = K.clamp((b.x - pad.x) / (pw / 2), -1, 1), a = off * 1.05, s = Math.hypot(b.vx, b.vy);
        b.vx = Math.sin(a) * s; b.vy = -Math.cos(a) * s; b.y = PY - b.r; combo = 0; K.sfx(330, .06, 'triangle', .1);
      }
      for (const br of bricks) {
        const cx = K.clamp(b.x, br.x, br.x + BW), cy = K.clamp(b.y, br.y, br.y + BHt), dx = b.x - cx, dy = b.y - cy;
        if (dx * dx + dy * dy < b.r * b.r) {
          if (!b.fire) { if (Math.abs(dx) > Math.abs(dy)) { b.vx = Math.sign(dx || -b.vx) * Math.abs(b.vx); } else { b.vy = Math.sign(dy || -b.vy) * Math.abs(b.vy); } }
          hitBrick(br, b); break;
        }
      }
      if (b.y > H + 30) {
        balls.splice(i, 1);
        if (!balls.length) {
          lives--; K.shake(14); K.sfx(180, .4, 'sawtooth', .12, -100); fireT = wideT = slowT = 0;
          if (lives <= 0) { dead = true; K.over(); return; }
          K.pop(W / 2, H / 2, lives === 1 ? 'Last ball!' : `${lives} balls left`, '#ff8aa8', 40); newBall(); return;
        }
      }
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i]; d.y += 230 * dt;
      if (d.y > PY - 14 && d.y < PY + 20 && Math.abs(d.x - pad.x) < pw / 2 + 16) {
        drops.splice(i, 1);
        if (d.t === '$') { K.coin(1, d.x, d.y); continue; }
        K.chime(660, [0, 7, 12]); K.pop(d.x, PY - 40, { M: 'Multiball!', W: 'Wide!', F: 'Fireball!', S: 'Slow-mo!' }[d.t], '#5ff3ff', 32);
        if (d.t === 'W') wideT = 12; if (d.t === 'F') fireT = 8; if (d.t === 'S') slowT = 9;
        if (d.t === 'M' && !stuck) { const src = balls[0]; for (let k = 0; k < 2 && balls.length < 8; k++) { const a = K.rand(-.8, .8); balls.push({ x: src.x, y: src.y, vx: Math.sin(a) * speed(), vy: -Math.cos(a) * speed(), r: 11 }); } }
      } else if (d.y > H + 30) drops.splice(i, 1);
    }
    for (const br of bricks) br.hit = Math.max(0, br.hit - dt);
    trail.push(balls.map(b => [b.x, b.y])); if (trail.length > 8) trail.shift();
  };
  GAME.draw = gr => {
    const v = K.view, s = K.skin;
    gr.fillStyle = '#0b0820'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    gr.strokeStyle = 'rgba(120,90,255,.12)'; gr.lineWidth = 1;
    for (let x = 0; x <= W; x += 64) { gr.beginPath(); gr.moveTo(x, 0); gr.lineTo(x, H); gr.stroke(); }
    for (let y = 0; y <= H; y += 64) { gr.beginPath(); gr.moveTo(0, y); gr.lineTo(W, y); gr.stroke(); }
    gr.fillStyle = 'rgba(255,255,255,.06)'; gr.fillRect(0, 0, W, 40);
    gr.font = '20px Bungee, Arial Black'; gr.textBaseline = 'middle'; gr.textAlign = 'left'; gr.fillStyle = '#ff8aa8';
    gr.fillText('♥'.repeat(Math.max(0, lives || 0)), 70, 21); gr.textAlign = 'right'; gr.fillStyle = '#b9b4e6'; gr.fillText(`LEVEL ${level}`, W - 150, 21);
    for (const b of bricks) {
      const l = 45 + 15 * (b.hp / b.max) + b.hit * 200;
      gr.shadowColor = `hsl(${b.hue},90%,60%)`; gr.shadowBlur = 10;
      gr.fillStyle = `hsl(${b.hue},85%,${Math.min(90, l)}%)`; gr.beginPath(); gr.roundRect(b.x, b.y, BW, BHt, 6); gr.fill(); gr.shadowBlur = 0;
      gr.fillStyle = 'rgba(255,255,255,.3)'; gr.fillRect(b.x + 6, b.y + 4, BW - 12, 5);
      if (b.hp > 1) { gr.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < b.hp; k++) gr.fillRect(b.x + BW / 2 - (b.hp * 10) / 2 + k * 10, b.y + BHt - 10, 6, 5); }
    }
    for (const d of drops) {
      if (d.t === '$') { gr.fillStyle = '#ffcf2e'; gr.shadowColor = '#ffcf2e'; gr.shadowBlur = 12; gr.beginPath(); gr.arc(d.x, d.y, 11, 0, 7); gr.fill(); gr.shadowBlur = 0; gr.fillStyle = '#fff6c4'; gr.beginPath(); gr.arc(d.x - 3, d.y - 3, 4, 0, 7); gr.fill(); continue; }
      gr.fillStyle = { M: '#5ff3ff', W: '#c6ff3d', F: '#ff7a3d', S: '#c79bff' }[d.t]; gr.beginPath(); gr.roundRect(d.x - 20, d.y - 13, 40, 26, 13); gr.fill();
      gr.fillStyle = '#0b0820'; gr.font = '16px Bungee, Arial Black'; gr.textAlign = 'center'; gr.fillText(d.t, d.x, d.y + 1);
    }
    trail.forEach((f, i) => f.forEach(([x, y]) => { gr.globalAlpha = i / trail.length * .35; gr.fillStyle = fireT > 0 ? '#ff7a3d' : s.c[0]; gr.beginPath(); gr.arc(x, y, 9, 0, 7); gr.fill(); }));
    gr.globalAlpha = 1;
    for (const b of balls) { gr.shadowColor = fireT > 0 ? '#ff7a3d' : s.c[0]; gr.shadowBlur = 20; gr.fillStyle = fireT > 0 ? '#ffd2a0' : '#fff'; gr.beginPath(); gr.arc(b.x, b.y, b.r, 0, 7); gr.fill(); }
    gr.shadowBlur = 0;
    const pw = pad.w * (wideT > 0 ? 1.5 : 1), gd = gr.createLinearGradient(pad.x - pw / 2, 0, pad.x + pw / 2, 0); gd.addColorStop(0, s.c[0]); gd.addColorStop(1, s.c[1]);
    gr.shadowColor = s.c[1]; gr.shadowBlur = 18; gr.fillStyle = gd; gr.beginPath(); gr.roundRect(pad.x - pw / 2, PY, pw, 18, 9); gr.fill(); gr.shadowBlur = 0;
    gr.fillStyle = 'rgba(255,255,255,.45)'; gr.fillRect(pad.x - pw / 2 + 12, PY + 3, pw - 24, 4);
    if (clearT > 0) { gr.fillStyle = 'rgba(255,255,255,.08)'; gr.fillRect(0, 0, W, H); }
  };
})();
