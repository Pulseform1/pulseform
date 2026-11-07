/* Tiny Tee: top-down mini golf. Drag back and let go to putt. Twelve holes, each with its own trick: bumpers, sand,
   slopes, water, a spinner, ice, portals and sliding gates. Under par earns big points and coins. */
const GAME = {
  id: 'tiny-tee', title: 'Tiny Tee', tagline: 'Twelve tricky holes. Sink it in as few putts as you can.',
  font: 'Lilita One', accent: '#ffd23f', accent2: '#5fe08a', bg: '#173a26', scoreLabel: 'Points',
  how: ['Drag back from anywhere and let go to putt. The further you pull, the harder the shot.', 'Keyboard: Left and Right aim, hold Space to charge, let go to putt.', 'Sand slows you, ice speeds you up, arrows push the ball, water costs a stroke. Beat par for big points!'],
  skins: [
    { name: 'Classic', price: 0, c: ['#ffffff', '#d8dde6'] }, { name: 'Sunny', price: 40, c: ['#ffe14a', '#e0a400'] }, { name: 'Mint', price: 90, c: ['#8affc4', '#2ab07a'] },
    { name: 'Ruby', price: 160, c: ['#ff6a7a', '#b8203a'] }, { name: 'Galaxy', price: 260, c: ['#7a5aff', '#2a1a6a'], stars: true }, { name: 'Gold Rush', price: 420, c: ['#fff0a0', '#d89a10'], trail: true },
  ],
};
(() => {
  const BR = 11, CUP = 15, PANEL = 678;
  // a hole: fairway polygons (the ball stays inside), blocks, bumpers, sand/ice/water/slope rects, spinners, movers, portals
  const HOLES = [
    { name: 'Straight Start', par: 2, tee: [290, 370], cup: [990, 370], polys: [[[200, 270], [1080, 270], [1080, 470], [200, 470]]], path: [] },
    { name: 'The Dogleg', par: 3, tee: [250, 585], cup: [985, 235], polys: [[[160, 510], [860, 510], [860, 150], [1110, 150], [1110, 660], [160, 660]]], path: [[985, 585]] },
    { name: 'Bumper Alley', par: 3, tee: [260, 370], cup: [1020, 370], polys: [[[180, 200], [1100, 200], [1100, 540], [180, 540]]],
      bumpers: [[520, 300, 26], [520, 440, 26], [700, 370, 30], [880, 290, 26], [880, 450, 26]], path: [[610, 370], [790, 370]] },
    { name: 'Sand Trap', par: 3, tee: [250, 265], cup: [1030, 265], polys: [[[160, 180], [1120, 180], [1120, 600], [160, 600]]],
      blocks: [[600, 180, 44, 270]], sand: [[700, 440, 220, 160], [920, 180, 90, 120]], path: [[560, 520], [760, 380]] },
    { name: 'The Spinner', par: 2, tee: [240, 370], cup: [1040, 370], polys: [[[160, 295], [1120, 295], [1120, 445], [160, 445]]], spinners: [[640, 370, 64, 1.6]], path: [] },
    { name: 'The Hill', par: 3, tee: [260, 245], cup: [1010, 245], polys: [[[180, 160], [1100, 160], [1100, 580], [180, 580]]],
      slopes: [[450, 160, 380, 420, 0, 300]], path: [[420, 230]] },
    { name: 'Bridge Over Water', par: 3, tee: [250, 370], cup: [1020, 370], polys: [[[160, 160], [1120, 160], [1120, 580], [160, 580]]],
      water: [[380, 160, 520, 150], [380, 430, 520, 150]], bumpers: [[640, 370, 22]], path: [[560, 335]] },
    { name: 'Zigzag', par: 4, tee: [260, 250], cup: [1010, 500], polys: [[[160, 160], [1120, 160], [1120, 600], [160, 600]]],
      blocks: [[470, 160, 26, 310], [790, 290, 26, 310]], path: [[400, 540], [640, 530], [660, 220], [900, 230]] },
    { name: 'Ice Rink', par: 3, tee: [250, 370], cup: [1010, 370], polys: [[[180, 180], [1100, 180], [1100, 560], [180, 560]]],
      ice: [[360, 180, 540, 380]], bumpers: [[935, 290, 22], [935, 450, 22]], path: [] },
    { name: 'Portal Jump', par: 2, tee: [250, 370], cup: [1030, 370], polys: [[[160, 200], [560, 200], [560, 540], [160, 540]], [[720, 200], [1120, 200], [1120, 540], [720, 540]]],
      portals: [[470, 370, 800, 370]], path: [] },
    { name: 'Sliding Gates', par: 3, tee: [240, 370], cup: [1040, 370], polys: [[[160, 245], [1120, 245], [1120, 495], [160, 495]]],
      movers: [[460, 245, 36, 130, 0, 120, 1.3, 0], [640, 245, 36, 130, 0, 120, 1.3, 2.1], [820, 245, 36, 130, 0, 120, 1.3, 4.2]], path: [] },
    { name: 'Grand Finale', par: 4, tee: [230, 520], cup: [1045, 380], polys: [[[160, 150], [1120, 150], [1120, 620], [160, 620]]],
      water: [[480, 150, 260, 190]], sand: [[480, 470, 260, 150]], slopes: [[160, 150, 300, 200, 220, 0]], bumpers: [[610, 405, 30]], spinners: [[900, 380, 70, -2]],
      blocks: [[1000, 150, 26, 150], [1000, 470, 26, 150]], path: [[410, 405], [790, 405]] },
  ];
  const SURF = { grass: [140, 1.0], sand: [520, 4.2], ice: [26, .16] };
  let hi, H0, ball, aim, drag, keyAim, charge, strokes, total, totalPar, phase, pt, last, banner, sink, trail, botT, segs, res, ripples, cards, keys = {};

  /* ---------- course building ---------- */
  function rectSegs(x, y, w, h) { return [[x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]]; }
  function load(i) {
    hi = i; H0 = HOLES[i]; segs = [];
    for (const p of H0.polys) for (let k = 0; k < p.length; k++) { const a = p[k], b = p[(k + 1) % p.length]; segs.push([a[0], a[1], b[0], b[1]]); }
    for (const b of H0.blocks || []) segs.push(...rectSegs(...b));
    ball = { x: H0.tee[0], y: H0.tee[1], vx: 0, vy: 0, moving: false, rest: 0, z: 1, warp: 0 }; last = { x: ball.x, y: ball.y };
    strokes = 0; phase = 'aim'; pt = 0; sink = null; trail = []; ripples = [];
    aim = Math.atan2(H0.cup[1] - ball.y, H0.cup[0] - ball.x); charge = null; drag = null; keyAim = 0;
    banner = { t: 0, a: `HOLE ${i + 1}`, b: `${H0.name} · Par ${H0.par}` };
  }
  GAME.reset = () => { total = 0; totalPar = 0; cards = []; botT = 0; load(0); };

  /* ---------- physics ---------- */
  const inR = (r, x, y) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
  function moverRect(m, t) { const k = (Math.sin(t * m[6] + m[7]) + 1) / 2; return [m[0] + m[4] * k, m[1] + m[5] * k, m[2], m[3]]; }
  function moverVel(m, t) { const c = Math.cos(t * m[6] + m[7]) * m[6] / 2; return [m[4] * c, m[5] * c]; }
  function spinSeg(s, t) { const a = t * s[3], c = Math.cos(a) * s[2], d = Math.sin(a) * s[2]; return [s[0] - c, s[1] - d, s[0] + c, s[1] + d]; }
  function hitSeg(sg, e, vx = 0, vy = 0) {
    const [ax, ay, bx, by] = sg, dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((ball.x - ax) * dx + (ball.y - ay) * dy) / l2));
    const cx = ax + dx * k, cy = ay + dy * k, ex = ball.x - cx, ey = ball.y - cy, d = Math.hypot(ex, ey);
    if (d >= BR || d === 0) return false;
    const nx = ex / d, ny = ey / d; ball.x = cx + nx * BR; ball.y = cy + ny * BR;
    const rvx = ball.vx - vx, rvy = ball.vy - vy, vn = rvx * nx + rvy * ny;
    if (vn < 0) { ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny; if (-vn > 60) { K.sfx(180 + Math.min(400, -vn * .3), .05, 'square', Math.min(.08, -vn / 6000)); } }
    return true;
  }
  function surface(x, y) { for (const r of H0.sand || []) if (inR(r, x, y)) return 'sand'; for (const r of H0.ice || []) if (inR(r, x, y)) return 'ice'; return 'grass'; }
  function step(dt) {
    const t = K.t;
    if (ball.warp > 0) ball.warp -= dt;
    // slopes push, the surface slows
    for (const s of H0.slopes || []) if (inR(s, ball.x, ball.y)) { ball.vx += s[4] * dt; ball.vy += s[5] * dt; }
    const sp = Math.hypot(ball.vx, ball.vy), [dec, kf] = SURF[surface(ball.x, ball.y)];
    if (sp > 0) { const ns = Math.max(0, sp - (dec + sp * kf) * dt); ball.vx *= ns / sp; ball.vy *= ns / sp; }
    // the cup pulls a slow ball in and swallows it; a fast one lips out
    const cx = H0.cup[0] - ball.x, cy = H0.cup[1] - ball.y, cd = Math.hypot(cx, cy);
    if (cd < CUP + 10) { const pull = 900 * (1 - cd / (CUP + 10)); ball.vx += cx / (cd || 1) * pull * dt; ball.vy += cy / (cd || 1) * pull * dt; }
    if (cd < CUP - 3) { if (Math.hypot(ball.vx, ball.vy) < 620) return sunk(); ball.vx *= .7; ball.vy *= .7; ball.vx += -cy / cd * 60; ball.vy += cx / cd * 60; K.sfx(900, .05, 'triangle', .06); }
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    for (const sg of segs) hitSeg(sg, .72);
    for (const m of H0.movers || []) { const r = moverRect(m, t), v = moverVel(m, t); for (const sg of rectSegs(...r)) hitSeg(sg, .7, v[0], v[1]); }
    for (const s of H0.spinners || []) {
      const sg = spinSeg(s, t), [ax, ay, bx, by] = sg, dx = bx - ax, dy = by - ay, k = Math.max(0, Math.min(1, ((ball.x - ax) * dx + (ball.y - ay) * dy) / (dx * dx + dy * dy)));
      const px = ax + dx * k - s[0], py = ay + dy * k - s[1];   // velocity of the bar where it touches: perpendicular to the radius
      if (hitSeg(sg, .6, -py * s[3], px * s[3])) K.shake(2);
    }
    for (const [bx, by, br] of H0.bumpers || []) {
      const dx = ball.x - bx, dy = ball.y - by, d = Math.hypot(dx, dy);
      if (d < br + BR) { const nx = dx / d, ny = dy / d, vn = ball.vx * nx + ball.vy * ny; ball.x = bx + nx * (br + BR); ball.y = by + ny * (br + BR); if (vn < 0) { ball.vx -= 2.15 * vn * nx; ball.vy -= 2.15 * vn * ny; ball.vx += nx * 80; ball.vy += ny * 80; } K.sfx(620, .07, 'square', .07, 300); ripples.push({ x: bx, y: by, r: br, t: 0 }); }
    }
    for (const p of H0.portals || []) if (ball.warp <= 0 && Math.hypot(ball.x - p[0], ball.y - p[1]) < 20) {
      K.burst(p[0], p[1], ['#b07aff', '#fff'], 14, 220, { life: .4 }); ball.x = p[2]; ball.y = p[3]; ball.warp = .6; trail = []; K.sfx(300, .25, 'sine', .1, 700); K.burst(p[2], p[3], ['#b07aff', '#fff'], 14, 220, { life: .4 });
    }
    for (const w of H0.water || []) if (inR(w, ball.x, ball.y)) return splash();
    // at rest: very slow for a moment (on a slope against a wall it would never quite stop)
    if (Math.hypot(ball.vx, ball.vy) < 9) { ball.rest += dt; if (ball.rest > .25 || !(H0.slopes || []).some(s => inR(s, ball.x, ball.y))) stop(); } else ball.rest = 0;
  }
  function stop() { ball.vx = ball.vy = 0; ball.moving = false; ball.rest = 0; if (phase === 'roll') { phase = 'aim'; aim = Math.atan2(H0.cup[1] - ball.y, H0.cup[0] - ball.x); if (strokes >= 8) giveUp(); } }
  function splash() {
    K.sfx(200, .35, 'sine', .1, -120); K.noise(.3, .12, 600); K.burst(ball.x, ball.y, ['#7ad8ff', '#fff'], 22, 260, { gravity: 200 }); ripples.push({ x: ball.x, y: ball.y, r: 6, t: 0, w: 1 });
    strokes++; K.pop(ball.x, ball.y - 30, 'SPLASH! +1', '#7ad8ff', 28);
    ball.x = last.x; ball.y = last.y; ball.vx = ball.vy = 0; ball.moving = false; phase = 'aim'; trail = [];
    if (strokes >= 8) giveUp();
  }
  function giveUp() { K.pop(640, 360, 'Picked up', '#fff', 34); finishHole(10); }
  function sunk() {
    ball.vx = ball.vy = 0; ball.x = H0.cup[0]; ball.y = H0.cup[1]; phase = 'sink'; sink = { t: 0 };
    K.sfx(330, .08, 'triangle', .1); K.sfx(220, .12, 'triangle', .1, 0, .08); finishHole(strokes);
  }
  const WORDS = { '-3': 'ALBATROSS!', '-2': 'EAGLE!', '-1': 'BIRDIE!', '0': 'PAR', '1': 'BOGEY', '2': 'DOUBLE BOGEY' };
  function finishHole(n) {
    phase = 'sink'; sink = sink || { t: 0 }; pt = 0;
    const d = n - H0.par, ace = n === 1, word = ace ? 'HOLE IN ONE!' : n >= 10 ? 'MAX STROKES' : WORDS[Math.max(-3, d)] || `+${d}`;
    const pts = ace ? 150 : d <= -3 ? 130 : d === -2 ? 90 : d === -1 ? 60 : d === 0 ? 35 : d === 1 ? 15 : d === 2 ? 8 : 3;
    const coins = ace ? 5 : d <= -2 ? 3 : d === -1 ? 2 : d === 0 ? 1 : 0;
    total += Math.min(n, 10); totalPar += H0.par; cards.push(Math.min(n, 10));
    K.add(pts, 640, 300, d < 0 ? '#ffd23f' : '#fff'); if (coins) K.coin(coins, H0.cup[0], H0.cup[1]);
    sink.word = word; sink.good = d < 0 || ace;
    if (sink.good) { K.chime(ace ? 523 : 587, ace ? [0, 4, 7, 12, 16] : [0, 4, 7, 12]); K.burst(H0.cup[0], H0.cup[1], ['#ffd23f', '#fff', '#5fe08a', '#ff7ad9'], ace ? 70 : 40, ace ? 520 : 380); K.shake(ace ? 10 : 5); }
  }
  function shoot(power) {
    if (phase !== 'aim' || power < .04) return;
    last = { x: ball.x, y: ball.y }; const v = 120 + power * 1180;
    ball.vx = Math.cos(aim) * v; ball.vy = Math.sin(aim) * v; ball.moving = true; ball.rest = 0; strokes++; phase = 'roll'; trail = [];
    K.sfx(260 + power * 300, .07, 'square', .09); K.noise(.05, .1, 1200);
  }

  /* ---------- update ---------- */
  GAME.update = dt => {
    if (banner && (banner.t += dt) > 1.7) banner = null;
    for (const r of ripples) r.t += dt; ripples = ripples.filter(r => r.t < .6);
    if (phase === 'roll') { const n = 5; for (let i = 0; i < n && phase === 'roll'; i++) step(dt / n); trail.push([ball.x, ball.y]); if (trail.length > 26) trail.shift(); }
    else if (phase === 'aim') {
      if (keyAim) aim += keyAim * dt * 1.6;
      if (charge) { charge.t += dt; charge.p = 1 - Math.abs(1 - (charge.t * 1.1) % 2); }
      // a mover can shove a resting ball, so keep them honest
      if ((H0.movers || []).length || (H0.spinners || []).length) { for (const m of H0.movers || []) { const r = moverRect(m, K.t), v = moverVel(m, K.t); for (const sg of rectSegs(...r)) if (hitSeg(sg, .3, v[0], v[1])) { phase = 'roll'; ball.moving = true; } } for (const s of H0.spinners || []) { const sg = spinSeg(s, K.t); if (hitSeg(sg, .5)) { const px = ball.x - s[0], py = ball.y - s[1]; ball.vx += -py * s[3] * .9; ball.vy += px * s[3] * .9; phase = 'roll'; ball.moving = true; } } }
    } else if (phase === 'sink') {
      pt += dt; if (sink) sink.t += dt;
      if (pt > 2.1) { if (hi + 1 < HOLES.length) load(hi + 1); else end(); }
    }
  };
  function end() {
    phase = 'done'; const d = total - totalPar, ds = d === 0 ? 'even par' : d > 0 ? `${d} over par` : `${-d} under par`;
    if (d < 0) K.coin(5 + Math.min(10, -d * 2));
    K.over({ title: d <= 0 ? 'Great round!' : 'Round complete', text: `${total} strokes, ${ds}, over ${HOLES.length} holes.`, delay: 400 });
  }

  /* ---------- input ---------- */
  GAME.down = (x, y) => { if (phase !== 'aim') return; drag = { x0: x, y0: y, x, y }; };
  GAME.move = (x, y) => { if (!drag) return; drag.x = x; drag.y = y; const dx = drag.x0 - x, dy = drag.y0 - y; if (Math.hypot(dx, dy) > 8) aim = Math.atan2(dy, dx); };
  GAME.up = () => { if (!drag) return; const p = Math.min(1, Math.hypot(drag.x0 - drag.x, drag.y0 - drag.y) / 230); drag = null; shoot(p); };
  GAME.key = (c, dn) => {
    if (c === 'ArrowLeft' || c === 'KeyA') keyAim = dn ? -1 : keyAim === -1 ? 0 : keyAim;
    if (c === 'ArrowRight' || c === 'KeyD') keyAim = dn ? 1 : keyAim === 1 ? 0 : keyAim;
    if (c === 'Space' || c === 'Enter') { if (dn && !charge && phase === 'aim') charge = { t: 0, p: 0 }; else if (!dn && charge) { const p = charge.p; charge = null; shoot(p); } }
  };
  const power = () => drag ? Math.min(1, Math.hypot(drag.x0 - drag.x, drag.y0 - drag.y) / 230) : charge ? charge.p : 0;

  /* ---------- the demo golfer: aims at the furthest waypoint it can see and judges the pace ---------- */
  function clearLine(ax, ay, bx, by) {
    const all = segs.concat(...(H0.water || []).map(w => rectSegs(...w)));
    for (const [cx, cy, dx, dy] of all) { const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax), d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax), d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx), d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx); if (d1 * d2 < 0 && d3 * d4 < 0) return false; }
    for (const [x, y, r] of H0.bumpers || []) { const vx = bx - ax, vy = by - ay, k = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy))); if (Math.hypot(ax + vx * k - x, ay + vy * k - y) < r + BR) return false; }
    return true;
  }
  function powerFor(d) { let v = 0; for (let p = .02; p <= 1; p += .01) { let s = 120 + p * 1180, x = 0; while (s > 1) { s = Math.max(0, s - (SURF.grass[0] + s * SURF.grass[1]) / 60); x += s / 60; } if (x >= d) { v = p; break; } v = p; } return v; }
  GAME.bot = dt => {
    if (phase !== 'aim' || (botT -= dt) > 0) return; botT = .9;
    const pts = [...(H0.path || []), H0.cup]; let tgt = null;
    for (let i = pts.length - 1; i >= 0; i--) if ((pts[i] === H0.cup || Math.hypot(pts[i][0] - ball.x, pts[i][1] - ball.y) > 70) && clearLine(ball.x, ball.y, pts[i][0], pts[i][1])) { tgt = pts[i]; break; }
    if (!tgt) tgt = pts.reduce((b, q) => Math.hypot(q[0] - ball.x, q[1] - ball.y) > 70 && (!b || Math.hypot(q[0] - ball.x, q[1] - ball.y) < Math.hypot(b[0] - ball.x, b[1] - ball.y)) ? q : b, null) || H0.cup;
    const isCup = tgt === H0.cup, d = Math.hypot(tgt[0] - ball.x, tgt[1] - ball.y);
    aim = Math.atan2(tgt[1] - ball.y, tgt[0] - ball.x) + K.rand(-.025, .025);
    const p = (H0.ice ? .7 : H0.slopes ? 1.05 : 1) * powerFor(isCup ? d + 30 : d * .95) * K.rand(.95, 1.06);
    shoot(Math.max(.08, Math.min(1, p)));
  };

  /* ---------- drawing ---------- */
  function wood(g, x, y, w, h) { g.fillStyle = '#7a4a24'; g.fillRect(x, y, w, h); g.fillStyle = '#a8703a'; g.fillRect(x + 3, y + 3, w - 6, h - 6); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(x + 3, y + 3, w - 6, 4); }
  function drawCourse(g) {
    const t = K.t;
    // the ground around the course
    g.fillStyle = '#1d4a2e'; g.fillRect(K.view.x0, K.view.y0, K.view.x1 - K.view.x0, K.view.y1 - K.view.y0);
    g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 60; i++) { const x = (i * 211) % 1400 - 60, y = (i * 97) % 760; g.beginPath(); g.arc(x, y, 3 + (i % 4), 0, 7); g.fill(); }
    // walls: a thick wooden rim drawn under the fairway, then the striped fairway on top
    for (const p of H0.polys) {
      g.save(); g.beginPath(); p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
      g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 18; g.shadowOffsetY = 8; g.lineJoin = 'round'; g.lineWidth = 30; g.strokeStyle = '#7a4a24'; g.stroke(); g.shadowColor = 'transparent';
      g.lineWidth = 22; g.strokeStyle = '#b07a42'; g.stroke(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.25)'; g.stroke();
      g.fillStyle = '#4fbf5a'; g.fill(); g.clip();
      g.fillStyle = '#47b052'; for (let x = -40; x < 1320; x += 64) { g.save(); g.translate(x, 0); g.rotate(.3); g.fillRect(0, -200, 30, 1200); g.restore(); }
      g.restore();
    }
    for (const r of H0.sand || []) { g.fillStyle = '#ecd28c'; g.beginPath(); g.roundRect(...r, 28); g.fill(); g.fillStyle = 'rgba(160,120,50,.25)'; for (let i = 0; i < 40; i++) { g.fillRect(r[0] + 10 + (i * 37) % (r[2] - 20), r[1] + 10 + (i * 53) % (r[3] - 20), 3, 3); } }
    for (const r of H0.ice || []) { const gr = g.createLinearGradient(r[0], r[1], r[0] + r[2], r[1] + r[3]); gr.addColorStop(0, '#bfeeff'); gr.addColorStop(1, '#8ad4f2'); g.fillStyle = gr; g.beginPath(); g.roundRect(...r, 18); g.fill(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(r[0] + 40 + i * 85, r[1] + 30 + (i % 2) * 120); g.lineTo(r[0] + 90 + i * 85, r[1] + 60 + (i % 2) * 120); g.stroke(); } }
    for (const w of H0.water || []) { g.fillStyle = '#2a8ad8'; g.beginPath(); g.roundRect(...w, 26); g.fill(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; for (let i = 0; i < 5; i++) { const y = w[1] + 25 + i * (w[3] - 40) / 4; g.beginPath(); for (let x = w[0] + 20; x < w[0] + w[2] - 20; x += 8) g.lineTo(x, y + Math.sin(x * .05 + t * 2 + i) * 4); g.stroke(); } }
    for (const s of H0.slopes || []) {
      g.fillStyle = 'rgba(30,90,40,.28)'; g.fillRect(s[0], s[1], s[2], s[3]);
      const a = Math.atan2(s[5], s[4]), off = (t * 40) % 70; g.fillStyle = 'rgba(255,255,255,.4)';
      g.save(); g.beginPath(); g.rect(s[0], s[1], s[2], s[3]); g.clip();
      for (let x = s[0] + 35; x < s[0] + s[2]; x += 90) for (let y = s[1] - 70; y < s[1] + s[3] + 70; y += 70) { const px = x + Math.cos(a) * off, py = y + Math.sin(a) * off; g.save(); g.translate(px, py); g.rotate(a); g.beginPath(); g.moveTo(12, 0); g.lineTo(-8, -10); g.lineTo(-3, 0); g.lineTo(-8, 10); g.fill(); g.restore(); }
      g.restore();
    }
    for (const b of H0.blocks || []) wood(g, ...b);
    for (const m of H0.movers || []) { const r = moverRect(m, t); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(r[0] + 4, r[1] + 6, r[2], r[3]); g.fillStyle = '#d84a4a'; g.fillRect(...r); g.fillStyle = '#fff'; for (let y = r[1] + 8; y < r[1] + r[3] - 8; y += 28) g.fillRect(r[0] + 4, y, r[2] - 8, 12); }
    for (const p of H0.portals || []) for (const [x, y, c] of [[p[0], p[1], '#b07aff'], [p[2], p[3], '#ff7ad9']]) { for (let k = 3; k > 0; k--) { g.strokeStyle = c; g.globalAlpha = .3 * k; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 12 + k * 6 + Math.sin(t * 4 + k) * 2, 0, 7); g.stroke(); } g.globalAlpha = 1; g.fillStyle = '#1a0a3a'; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); }
    for (const [x, y, r] of H0.bumpers || []) { const rp = ripples.find(q => q.x === x && q.y === y && !q.w), k = rp ? 1 + Math.sin(rp.t * 20) * .12 * (1 - rp.t / .6) : 1; g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + 3, y + 6, r, 0, 7); g.fill(); g.fillStyle = '#ff5a8a'; g.beginPath(); g.arc(x, y, r * k, 0, 7); g.fill(); g.fillStyle = '#ffb0c8'; g.beginPath(); g.arc(x, y, r * .6 * k, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - r * .25, y - r * .3, r * .18, 0, 7); g.fill(); }
    // the cup and its flag
    const [cx, cy] = H0.cup; g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(cx, cy, CUP + 7, 0, 7); g.fill(); g.fillStyle = '#10200f'; g.beginPath(); g.arc(cx, cy, CUP, 0, 7); g.fill(); g.fillStyle = '#2a3a2a'; g.beginPath(); g.arc(cx, cy + 3, CUP - 3, Math.PI, 0); g.fill();
  }
  function drawFlag(g) {
    const [cx, cy] = H0.cup, near = Math.hypot(ball.x - cx, ball.y - cy) < 60 && phase !== 'sink', lift = near ? -30 : 0, wave = Math.sin(K.t * 5);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx + 2, cy); g.lineTo(cx + 26, cy - 12); g.stroke();
    g.strokeStyle = '#eee'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy + lift); g.lineTo(cx, cy - 84 + lift); g.stroke();
    g.fillStyle = '#ff4a5a'; g.beginPath(); g.moveTo(cx, cy - 84 + lift); g.quadraticCurveTo(cx + 24, cy - 78 + lift + wave * 4, cx + 46, cy - 70 + lift + wave * 3); g.lineTo(cx, cy - 56 + lift); g.fill();
    g.fillStyle = '#fff'; g.font = '13px "Lilita One"'; g.textAlign = 'center'; g.fillText(String(hi + 1), cx + 16, cy - 66 + lift);
  }
  function drawBall(g, x, y, s = 1) {
    const sk = K.skin; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x + 3, y + 5, BR * s, BR * .8 * s, 0, 0, 7); g.fill();
    const gr = g.createRadialGradient(x - 4 * s, y - 4 * s, 1, x, y, BR * s); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, sk.c[0]); gr.addColorStop(1, sk.c[1]);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, BR * s, 0, 7); g.fill();
    if (sk.stars) { g.fillStyle = '#fff'; for (let i = 0; i < 4; i++) g.fillRect(x - 6 + (i * 5) % 11, y - 5 + (i * 7) % 10, 1.6, 1.6); }
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x + Math.cos(i * 1.3) * 5 * s, y + Math.sin(i * 1.3) * 5 * s, 1.1 * s, 0, 7); g.fill(); }
  }
  GAME.drawSkin = (g, s, r) => { const gr = g.createRadialGradient(-r * .35, -r * .35, 2, 0, 0, r); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, s.c[0]); gr.addColorStop(1, s.c[1]); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * .8, 0, 7); g.fill(); if (s.stars) { g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) g.fillRect(-18 + (i * 13) % 34, -16 + (i * 17) % 30, 3, 3); } if (s.trail) { g.strokeStyle = s.c[0]; g.globalAlpha = .5; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, r * .95, 2.4, 3.6); g.stroke(); g.globalAlpha = 1; } };
  GAME.draw = g => {
    drawCourse(g);
    for (const r of ripples) if (r.w) { g.strokeStyle = `rgba(255,255,255,${1 - r.t / .6})`; g.lineWidth = 3; g.beginPath(); g.arc(r.x, r.y, 8 + r.t * 60, 0, 7); g.stroke(); }
    // trail
    if (trail.length > 1) { const gold = K.skin.trail; for (let i = 1; i < trail.length; i++) { const k = i / trail.length; g.strokeStyle = gold ? `rgba(255,210,63,${k * .7})` : `rgba(255,255,255,${k * .35})`; g.lineWidth = BR * 1.4 * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(...trail[i - 1]); g.lineTo(...trail[i]); g.stroke(); } }
    for (const s of H0.spinners || []) { const [ax, ay, bx, by] = spinSeg(s, K.t); g.lineCap = 'round'; g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 16; g.beginPath(); g.moveTo(ax + 4, ay + 7); g.lineTo(bx + 4, by + 7); g.stroke(); g.strokeStyle = '#ffb02e'; g.lineWidth = 14; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.fillStyle = '#7a4a24'; g.beginPath(); g.arc(s[0], s[1], 10, 0, 7); g.fill(); }
    // aim guide
    if (phase === 'aim') {
      const p = power(), L = 50 + p * 230, ca = Math.cos(aim), sa = Math.sin(aim);
      g.fillStyle = 'rgba(255,255,255,.75)'; for (let d = 24; d < L; d += 16) { g.globalAlpha = .9 * (1 - d / (L + 20)); g.beginPath(); g.arc(ball.x + ca * d, ball.y + sa * d, 3.5, 0, 7); g.fill(); } g.globalAlpha = 1;
      if (p > 0) { const col = p < .5 ? '#5fe08a' : p < .8 ? '#ffd23f' : '#ff5a5a'; g.strokeStyle = col; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(ball.x - ca * 18, ball.y - sa * 18); g.lineTo(ball.x - ca * (18 + p * 70), ball.y - sa * (18 + p * 70)); g.stroke();
        g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.roundRect(ball.x - 40, ball.y + 26, 80, 12, 6); g.fill(); g.fillStyle = col; g.beginPath(); g.roundRect(ball.x - 38, ball.y + 28, 76 * p, 8, 4); g.fill(); }
      else if (!K.bot) { const k = (Math.sin(K.t * 4) + 1) / 2; g.strokeStyle = `rgba(255,255,255,${.3 + k * .4})`; g.lineWidth = 2; g.beginPath(); g.arc(ball.x, ball.y, BR + 6 + k * 4, 0, 7); g.stroke(); }
    }
    // the ball, shrinking into the cup when sunk
    if (phase === 'sink' && sink && sink.t < .5) drawBall(g, ball.x, ball.y, 1 - sink.t * 1.6);
    else if (phase !== 'sink') drawBall(g, ball.x, ball.y);
    drawFlag(g);
    // bottom panel: hole, par, strokes, card
    g.fillStyle = 'rgba(8,24,14,.82)'; g.beginPath(); g.roundRect(220, PANEL, 840, 36, 18); g.fill();
    g.font = '19px "Lilita One"'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = '#ffd23f'; g.fillText(`HOLE ${hi + 1}/${HOLES.length}`, 244, PANEL + 19);
    g.fillStyle = '#fff'; g.fillText(`PAR ${H0.par}`, 380, PANEL + 19); g.fillText(`STROKES ${strokes}`, 470, PANEL + 19);
    const d = total - totalPar; g.textAlign = 'right'; g.fillStyle = d < 0 ? '#5fe08a' : d > 0 ? '#ff9a8a' : '#fff'; g.fillText(`ROUND ${d === 0 ? 'E' : d > 0 ? '+' + d : d}`, 1040, PANEL + 19);
    g.textAlign = 'center'; for (let i = 0; i < HOLES.length; i++) { const x = 640 + i * 22, c = cards[i], dd = c != null ? c - HOLES[i].par : null; g.fillStyle = i === hi ? 'rgba(255,210,63,.35)' : 'rgba(255,255,255,.08)'; g.beginPath(); g.roundRect(x - 9, PANEL + 8, 18, 22, 4); g.fill(); if (c != null) { g.fillStyle = dd < 0 ? '#5fe08a' : dd > 0 ? '#ff9a8a' : '#fff'; g.font = '13px "Lilita One"'; g.fillText(String(c), x, PANEL + 20); } }
    if (banner) { const a = Math.min(1, banner.t * 5, (1.7 - banner.t) * 3); g.globalAlpha = Math.max(0, a); g.fillStyle = 'rgba(8,24,14,.85)'; g.beginPath(); g.roundRect(440, 70, 400, 84, 20); g.fill(); g.textAlign = 'center'; g.fillStyle = '#ffd23f'; g.font = '40px "Lilita One"'; g.fillText(banner.a, 640, 104); g.fillStyle = '#fff'; g.font = '19px "Lilita One"'; g.fillText(banner.b, 640, 138); g.globalAlpha = 1; }
    if (phase === 'sink' && sink && sink.word && sink.t > .25) { const k = Math.min(1, (sink.t - .25) * 5); g.save(); g.translate(640, 360); g.scale(.6 + k * .4, .6 + k * .4); g.globalAlpha = k; g.textAlign = 'center'; g.font = `${sink.word.length > 10 ? 64 : 80}px "Lilita One"`; g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,.55)'; g.strokeText(sink.word, 0, 0); g.fillStyle = sink.good ? '#ffd23f' : '#fff'; g.fillText(sink.word, 0, 0); g.restore(); g.globalAlpha = 1; }
    if (hi === 0 && strokes === 0 && phase === 'aim' && !K.bot && !banner) { g.textAlign = 'center'; g.font = '20px "Lilita One"'; g.fillStyle = '#fff'; g.fillText('Drag back from anywhere and let go to putt  ·  or Left/Right + hold Space', 640, 220); }
  };
  GAME.test = { st: () => ({ hi, phase, strokes, total, totalPar, ball: { x: Math.round(ball.x), y: Math.round(ball.y) } }), load, shoot: (a, p) => { aim = a; shoot(p); }, HOLES };
})();
