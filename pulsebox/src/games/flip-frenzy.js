/* Flip Frenzy: a neon pinball table. Pull the plunger, keep the ball alive with two flippers, and work the table:
   pop bumpers, slingshots, three top lanes, a bank of drop targets and a lock saucer that starts multiball.
   Three balls a game. */
const GAME = {
  id: 'flip-frenzy', title: 'Flip Frenzy', tagline: 'Neon pinball. Light the lanes, lock two balls, hit the jackpot.',
  font: 'Russo One', accent: '#ff4fd8', accent2: '#3de8ff', bg: '#070616', noHud: true, scoreLabel: 'Score',
  how: ['Left flipper: Left arrow, A or tap the left half. Right flipper: Right arrow, D or tap the right half.', 'Hold Space or Down (or hold the right half) to pull the plunger, then let go. A soft pull drops into the top lanes: hit the flashing one for a skill shot.', 'Light all 3 top lanes (roll through them, or ride the orbit over the top) to raise the multiplier. Complete the lanes or drop all 3 targets to light the lock. Lock 2 balls in the saucer for MULTIBALL!'],
  skins: [
    { name: 'Chrome', price: 0, c: ['#ffffff', '#8a94a8'] }, { name: 'Plasma', price: 50, c: ['#ff9af0', '#c02aa8'] }, { name: 'Ice', price: 110, c: ['#c8f6ff', '#2aa8d8'] },
    { name: 'Lava', price: 190, c: ['#ffd27a', '#e83a1a'] }, { name: 'Toxic', price: 290, c: ['#d8ff6a', '#3aa81a'] }, { name: 'Black Hole', price: 450, c: ['#6a5aff', '#05030f'], ring: true },
  ],
};
(() => {
  const BR = 9, GR = 1100, X0 = 400, X1 = 880;
  // ---- the table, as segments the ball bounces off ----
  const SEG = [], KICK = [];
  const seg = (ax, ay, bx, by, e = .45) => SEG.push({ ax, ay, bx, by, e });
  function arc(cx, cy, r, a0, a1, n, e) { let px = cx + Math.cos(a0) * r, py = cy + Math.sin(a0) * r; for (let i = 1; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; seg(px, py, x, y, e); px = x; py = y; } }
  arc(640, 250, 230, Math.PI, Math.PI * 2, 28, .4);              // the top dome
  seg(410, 250, 410, 545); seg(410, 545, 548, 642);               // left wall and slant to the flipper
  seg(870, 250, 870, 720);                                         // the outer wall of the shooter lane
  seg(842, 290, 842, 545); seg(842, 545, 732, 642);               // the shooter lane's inner wall, then the right slant
  seg(842, 720, 842, 640);                                         // the bottom of the shooter lane
  // slingshots: two triangles above the flippers; the long edge kicks
  for (const d of [-1, 1]) {   // each sits clear of its wall so a ball can roll down the inlane behind it
    const ax = d < 0 ? 452 : 800, ay = 470, bx = ax, by = 530, cx = d < 0 ? 507 : 773, cy = 552;
    seg(ax, ay, bx, by, .3); seg(bx, by, cx, cy, .3); KICK.push({ ax, ay, bx: cx, by: cy, d, lit: 0 });
  }
  // the top lanes: posts between them
  for (const x of [565, 615, 665, 715]) seg(x, 62, x, 104, .3);
  const LANES = [590, 640, 690];
  const BUMP = [{ x: 575, y: 215, r: 27 }, { x: 705, y: 215, r: 27 }, { x: 640, y: 300, r: 27 }];
  const DROPS = [{ x: 455, y: 380 }, { x: 455, y: 420 }, { x: 455, y: 460 }];     // a bank on the left, facing the middle
  const SAUCER = { x: 800, y: 340 };
  const FL = [{ x: 548, y: 642, side: -1 }, { x: 732, y: 642, side: 1 }], FLEN = 80, FREST = .52, FUP = -.5;

  let balls, ballNo, score, mult, lanes, drops, locks, lockLit, multiball, bumpHits, msgs, flip, plunger, save, saucer, lights, tilt, pressing, botT, skill, over, jackpot, lastMission, missions;

  function newBall() { return { x: 856, y: 700, vx: 0, vy: 0, lane: true, trail: [] }; }
  GAME.reset = () => {
    balls = [newBall()]; ballNo = 1; score = 0; mult = 1; lanes = [0, 0, 0]; drops = [0, 0, 0]; locks = 0; lockLit = false; multiball = false; bumpHits = 0;
    msgs = []; flip = [{ a: FREST, w: 0, on: false }, { a: FREST, w: 0, on: false }]; plunger = { p: 0, hold: false }; save = 12; saucer = null; lights = { t: 0 }; pressing = [false, false]; botT = 0;
    skill = Math.floor(Math.random() * 3); over = false; jackpot = 0; missions = { lanes: 0, drops: 0, bumpers: 0 }; K.score = 0;
  };
  const add = (n, x, y, c) => { const v = n * mult; score += v; K.score = score; if (x != null) K.pop(x, y, '+' + v.toLocaleString(), c || '#fff', 20); };
  const say = (t, c = '#ff4fd8', d = 1.8) => msgs.push({ t, c, k: 0, d });

  /* ---------- physics ---------- */
  function collideSeg(b, s, e, vx = 0, vy = 0, rad = BR) {
    const dx = s.bx - s.ax, dy = s.by - s.ay, l2 = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((b.x - s.ax) * dx + (b.y - s.ay) * dy) / l2));
    const cx = s.ax + dx * k, cy = s.ay + dy * k, ex = b.x - cx, ey = b.y - cy, d = Math.hypot(ex, ey);
    if (d >= rad || d === 0) return null;
    const nx = ex / d, ny = ey / d; b.x = cx + nx * rad; b.y = cy + ny * rad;
    const rvx = b.vx - vx, rvy = b.vy - vy, vn = rvx * nx + rvy * ny;
    if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; }
    return { nx, ny, vn, k };
  }
  function flipSeg(i) { const f = FL[i], a = flip[i].a, dir = f.side < 0 ? 1 : -1, ang = f.side < 0 ? a : Math.PI - a; return { ax: f.x, ay: f.y, bx: f.x + Math.cos(ang) * FLEN, by: f.y + Math.sin(ang) * FLEN, ang, dir }; }
  function stepFlippers(dt) {
    for (let i = 0; i < 2; i++) {
      const F = flip[i], target = F.on ? FUP : FREST, sp = F.on ? 26 : 14, prev = F.a;
      F.a += Math.sign(target - F.a) * Math.min(Math.abs(target - F.a), sp * dt); F.w = (F.a - prev) / dt;
    }
  }
  function stepBall(b, dt) {
    if (b.held) return;
    if (b.x > 842 && b.y > 600) { const top = 700 - plunger.p * 26; if (b.y >= top && b.vy >= 0) { b.lane = true; b.x = 856; b.y = top; b.vx = 0; b.vy = 0; return; } }   // resting on the plunger
    b.vy += GR * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    const sp = Math.hypot(b.vx, b.vy); if (sp > 2400) { b.vx *= 2400 / sp; b.vy *= 2400 / sp; }
    if (b.x < 842) b.lane = false;
    for (const s of SEG) { const h = collideSeg(b, s, s.e); if (h && -h.vn > 300) K.sfx(160, .03, 'square', .025); }
    for (const kk of KICK) { const h = collideSeg(b, kk, .4); if (h && -h.vn > 60) { b.vx += h.nx * 520; b.vy += h.ny * 520; kk.lit = .15; add(10); K.sfx(420, .06, 'square', .06, -200); } }
    for (const bp of BUMP) {
      const dx = b.x - bp.x, dy = b.y - bp.y, d = Math.hypot(dx, dy);
      if (d < bp.r + BR) { const nx = dx / d, ny = dy / d; b.x = bp.x + nx * (bp.r + BR); b.y = bp.y + ny * (bp.r + BR); const vn = b.vx * nx + b.vy * ny; b.vx += -vn * nx + nx * 620; b.vy += -vn * ny + ny * 620; bp.lit = .18; add(100, bp.x, bp.y - 34, '#3de8ff'); bumpHits++; missions.bumpers++; K.sfx(520 + Math.random() * 80, .07, 'square', .07, 200); K.shake(2);
        if (missions.bumpers === 30) { add(15000, 640, 260, '#ffd23f'); say('BUMPER BLITZ! +15,000', '#ffd23f'); } }
    }
    for (let i = 0; i < 3; i++) if (!drops[i]) {
      const D = DROPS[i], s = { ax: D.x, ay: D.y - 16, bx: D.x, by: D.y + 16 }, h = collideSeg(b, s, .5, 0, 0, BR + 5);
      if (h) { drops[i] = 1; add(750, D.x + 30, D.y, '#ff9a3a'); K.sfx(300, .08, 'square', .07); if (drops.every(Boolean)) dropsDone(); }
    } else collideSeg(b, { ax: DROPS[i].x - 6, ay: DROPS[i].y - 16, bx: DROPS[i].x - 6, by: DROPS[i].y + 16 }, .4);
    for (let i = 0; i < 2; i++) {
      const fs = flipSeg(i), h = collideSeg(b, fs, .25, 0, 0, BR + 6);
      if (h) {   // the flipper's surface moves where it touches: push the ball along with it
        const r = h.k * FLEN, w = flip[i].w * (FL[i].side < 0 ? 1 : -1), pvx = -Math.sin(fs.ang) * w * r, pvy = Math.cos(fs.ang) * w * r;
        const vn = pvx * h.nx + pvy * h.ny; if (vn > 0) { b.vx += h.nx * vn * 1.15; b.vy += h.ny * vn * 1.15; }
      }
    }
    // the top lanes light as the ball rolls through
    if (b.y > 58 && b.y < 112) for (let i = 0; i < 3; i++) if (Math.abs(b.x - LANES[i]) < 22 && !b.laneT) { b.laneT = .4; laneHit(i); }
    if (b.laneT > 0) b.laneT -= dt;
    // an orbit: riding the top of the dome lights the next lane
    if (b.orbT > 0) b.orbT -= dt; else if (b.y < 48 && Math.abs(b.x - 640) < 50) { b.orbT = 1.2; const i = lanes.indexOf(0); add(1000, 640, 60, '#3de8ff'); K.sfx(990, .08, 'triangle', .07); if (i >= 0) laneHit(i); }
    // the saucer
    if (b.sc > 0) b.sc -= dt; else if (!saucer && Math.hypot(b.x - SAUCER.x, b.y - SAUCER.y) < 14 && Math.hypot(b.vx, b.vy) < 900) { b.held = true; b.x = SAUCER.x; b.y = SAUCER.y; b.vx = b.vy = 0; saucer = { b, t: 0 }; saucerHit(b); }
  }
  function laneHit(i) {
    if (skill != null && skill === i && lights.skillOn) { add(10000, LANES[i], 50, '#ffd23f'); say('SKILL SHOT! +10,000', '#ffd23f'); K.chime(659, [0, 4, 7, 12]); }
    lights.skillOn = false;
    if (!lanes[i]) { lanes[i] = 1; add(500, LANES[i], 130, '#ffd23f'); K.sfx(880, .08, 'triangle', .08); }
    if (lanes.every(Boolean)) { lanes = [0, 0, 0]; if (mult < 5) mult++; missions.lanes++; add(5000, 640, 150, '#ffd23f'); say(`LANES COMPLETE · ${mult}X MULTIPLIER`, '#ffd23f'); if (!multiball && !lockLit) { lockLit = true; setTimeout(() => say('LOCK IS LIT! SHOOT THE SAUCER', '#3de8ff'), 900); } K.chime(523, [0, 4, 7, 12]); }
  }
  function dropsDone() {
    missions.drops++; add(5000, 520, 420, '#ff9a3a'); K.chime(392, [0, 4, 7, 12]); setTimeout(() => { drops = [0, 0, 0]; }, 900);
    if (!multiball && !lockLit) { lockLit = true; say('LOCK IS LIT! SHOOT THE SAUCER', '#3de8ff'); } else say('TARGETS DOWN! +5,000', '#ff9a3a');
  }
  function saucerHit(b) {
    K.sfx(200, .2, 'sawtooth', .07, 300);
    if (multiball) { jackpot++; const j = 25000 * jackpot; add(j / mult, SAUCER.x - 60, SAUCER.y - 40, '#ff4fd8'); say(`JACKPOT! ${j.toLocaleString()}`, '#ff4fd8'); K.chime(523, [0, 4, 7, 12, 16]); K.shake(8); K.burst(SAUCER.x, SAUCER.y, ['#ff4fd8', '#fff', '#3de8ff'], 40, 420); return; }
    add(2500, SAUCER.x - 50, SAUCER.y - 40, '#3de8ff');
    if (lockLit) { locks++; lockLit = false; say(locks >= 2 ? 'MULTIBALL!' : `BALL ${locks} LOCKED!`, '#3de8ff'); K.chime(440, [0, 7, 12]);
      if (locks >= 2) { locks = 0; multiball = true; jackpot = 0; save = 10; setTimeout(() => { if (!over) { for (let k = 0; k < 2; k++) { const nb = newBall(); nb.x = 640 + (k ? 60 : -60); nb.y = 120; nb.lane = false; nb.vx = k ? 200 : -200; nb.vy = 100; balls.push(nb); } K.shake(10); K.flash('#ff4fd8', .3); } }, 500); }
    }
  }
  function drain(b) {
    balls.splice(balls.indexOf(b), 1); K.sfx(140, .4, 'sawtooth', .08, -80);
    if (balls.length) { if (balls.length === 1 && multiball) { multiball = false; say('MULTIBALL OVER', '#fff', 1.4); } return; }
    if (save > 0) { balls.push(newBall()); say('BALL SAVED!', '#5fe08a'); return; }
    multiball = false;
    if (ballNo >= 3) { over = true; K.over({ title: 'Game over', text: `Final score ${score.toLocaleString()}. Multiplier reached ${mult}X, ${missions.lanes} lane sets, ${missions.drops} target banks.`, delay: 900 }); return; }
    ballNo++; mult = 1; save = 10; skill = Math.floor(Math.random() * 3); lights.skillOn = true; balls.push(newBall()); say(`BALL ${ballNo}`, '#fff', 1.4);
    K.coin(Math.min(5, Math.floor(score / 40000)));
  }

  /* ---------- update ---------- */
  GAME.update = dt => {
    lights.t += dt; for (const m of msgs) m.k += dt; msgs = msgs.filter(m => m.k < m.d);
    if (over) return;
    if (save > 0 && balls.some(b => !b.lane)) save -= dt;
    if (plunger.hold) plunger.p = Math.min(1, plunger.p + dt * 1.4);
    const n = 10, h = dt / n;
    for (let s = 0; s < n; s++) {
      stepFlippers(h);
      for (const b of balls.slice()) { stepBall(b, h); if (b.y > 740) drain(b); }
      // balls knock each other
      for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) { const a = balls[i], c = balls[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy); if (d < BR * 2 && d > 0 && !a.held && !c.held) { const nx = dx / d, ny = dy / d, p = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny; if (p > 0) { a.vx -= p * nx; a.vy -= p * ny; c.vx += p * nx; c.vy += p * ny; } const o = (BR * 2 - d) / 2; a.x -= nx * o; a.y -= ny * o; c.x += nx * o; c.y += ny * o; } }
    }
    for (const b of balls) { b.trail.push([b.x, b.y]); if (b.trail.length > 8) b.trail.shift();
      // a ball that has come to a dead stop somewhere (and is not on the plunger, in the saucer or cradled on a raised flipper) gets a nudge
      const still = Math.hypot(b.vx, b.vy) < 25 && !b.lane && !b.held && !(flip[0].on || flip[1].on);
      b.still = still ? (b.still || 0) + dt : 0; if (b.still > 2.5) { b.still = 0; b.vx = (640 - b.x) * 2 + (Math.random() - .5) * 200; b.vy = -500; K.shake(6); say('NUDGE!', '#fff', 1); } }
    for (const bp of BUMP) if (bp.lit > 0) bp.lit -= dt; for (const kk of KICK) if (kk.lit > 0) kk.lit -= dt;
    if (saucer && (saucer.t += dt) > 1.1) { const b = saucer.b; b.held = false; b.sc = .8; b.x -= 18; b.y += 10; b.vx = -380 - Math.random() * 120; b.vy = 260; saucer = null; K.sfx(300, .1, 'square', .07, 200); }
  };
  // the first ball gets a skill shot lane
  const _r = GAME.reset; GAME.reset = () => { _r(); lights.skillOn = true; };

  /* ---------- input ---------- */
  function setFlip(i, on) { if (flip[i].on !== on && on) K.sfx(i ? 240 : 220, .04, 'square', .05); flip[i].on = on; }
  function plungeRelease() { if (!plunger.hold) return; plunger.hold = false; const b = balls.find(q => q.lane && q.y > 660); if (b) { b.vy = -(900 + plunger.p * 1750); K.sfx(180 + plunger.p * 300, .12, 'sawtooth', .07, 400); } plunger.p = 0; }
  const laneBall = () => balls.some(q => q.lane && q.y > 660);
  GAME.key = (c, d) => {
    if (c === 'ArrowLeft' || c === 'KeyA' || c === 'KeyZ' || c === 'ShiftLeft') setFlip(0, d);
    if (c === 'ArrowRight' || c === 'KeyD' || c === 'Slash' || c === 'ShiftRight') setFlip(1, d);
    if (c === 'Space' || c === 'ArrowDown' || c === 'KeyS' || c === 'Enter') { if (d) { if (laneBall()) plunger.hold = true; else { setFlip(0, true); setFlip(1, true); } } else { plungeRelease(); if (!plunger.hold) { setFlip(0, false); setFlip(1, false); } } }
  };
  const ptrs = new Map();
  GAME.down = (x, y, e) => { const s = x < 640 ? 0 : 1; ptrs.set(e && e.pointerId, s); if (s === 1 && laneBall()) plunger.hold = true; else setFlip(s, true); };
  GAME.up = (x, y, e) => { const s = ptrs.get(e && e.pointerId); ptrs.delete(e && e.pointerId); if (s === 1 && plunger.hold) plungeRelease(); if (s != null) setFlip(s, [...ptrs.values()].includes(s)); };

  /* ---------- the demo player ---------- */
  GAME.bot = dt => {
    if (laneBall() && !plunger.hold) { plunger.hold = true; botT = .5 + Math.random() * .4; }
    if (plunger.hold && (botT -= dt) <= 0) plungeRelease();
    for (let i = 0; i < 2; i++) {
      const f = FL[i], b = balls.find(q => !q.lane && q.vy > -100 && q.y > 560 && q.y < 668 && (i ? q.x > 640 : q.x < 640) && Math.abs(q.x - (f.x + f.side * -45)) < 70);
      if (flip[i].cd > 0) flip[i].cd -= dt;
      if (b && !flip[i].on && !(flip[i].cd > 0)) { setFlip(i, true); flip[i].tt = .18; }
      if (flip[i].on && (flip[i].tt -= dt) <= 0) { setFlip(i, false); flip[i].cd = .3; }
    }
  };

  /* ---------- drawing ---------- */
  const glow = (g, c, b) => { g.shadowColor = c; g.shadowBlur = b; };
  function table(g) {
    const t = lights.t;
    const gr = g.createLinearGradient(0, 0, 0, 720); gr.addColorStop(0, '#16123a'); gr.addColorStop(1, '#0a0820');
    g.fillStyle = gr; g.beginPath(); g.moveTo(410, 720); g.lineTo(410, 250); g.arc(640, 250, 230, Math.PI, 0); g.lineTo(870, 720); g.fill();
    // a starfield and a grid on the playfield
    g.save(); g.clip(); g.strokeStyle = 'rgba(120,90,255,.08)'; g.lineWidth = 1; for (let y = 0; y < 720; y += 40) { g.beginPath(); g.moveTo(400, y); g.lineTo(880, y); g.stroke(); } for (let x = 400; x < 880; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 720); g.stroke(); }
    for (let i = 0; i < 50; i++) { g.fillStyle = `rgba(255,255,255,${.2 + (Math.sin(t * 2 + i) + 1) * .2})`; g.fillRect(420 + (i * 97) % 440, 30 + (i * 61) % 600, 2, 2); }
    // a big logo in the middle
    g.globalAlpha = .1; g.font = '54px "Russo One"'; g.textAlign = 'center'; g.fillStyle = '#ff4fd8'; g.fillText('FLIP', 640, 470); g.fillText('FRENZY', 640, 525); g.globalAlpha = 1;
    g.restore();
    // walls as neon tubes
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [c, w, b] of [['rgba(61,232,255,.35)', 9, 14], ['#3de8ff', 3, 0]]) { g.strokeStyle = c; g.lineWidth = w; glow(g, '#3de8ff', b); g.beginPath(); for (const s of SEG) { g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); } g.stroke(); }
    g.shadowBlur = 0;
    // slingshots
    for (const kk of KICK) { const lit = kk.lit > 0; g.fillStyle = lit ? 'rgba(255,79,216,.55)' : 'rgba(255,79,216,.18)'; g.beginPath(); g.moveTo(kk.ax, kk.ay); g.lineTo(kk.ax, kk.ay + 60); g.lineTo(kk.bx, kk.by); g.fill(); g.strokeStyle = '#ff4fd8'; g.lineWidth = lit ? 6 : 4; glow(g, '#ff4fd8', lit ? 20 : 8); g.beginPath(); g.moveTo(kk.ax, kk.ay); g.lineTo(kk.bx, kk.by); g.stroke(); g.shadowBlur = 0; }
    // top lanes
    LANES.forEach((x, i) => { const on = lanes[i], sk = lights.skillOn && skill === i && Math.floor(t * 4) % 2; g.fillStyle = on ? '#ffd23f' : sk ? '#ff4fd8' : 'rgba(255,210,63,.18)'; if (on || sk) glow(g, on ? '#ffd23f' : '#ff4fd8', 16); g.beginPath(); g.arc(x, 128, 8, 0, 7); g.fill(); g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '11px "Russo One"'; g.textAlign = 'center'; g.fillText('ABC'[i], x, 90); });
    // drop targets
    DROPS.forEach((D, i) => { if (drops[i]) { g.fillStyle = 'rgba(255,154,58,.2)'; g.fillRect(D.x - 7, D.y - 16, 5, 32); return; } g.fillStyle = '#ff9a3a'; glow(g, '#ff9a3a', 12); g.beginPath(); g.roundRect(D.x - 5, D.y - 16, 12, 32, 3); g.fill(); g.shadowBlur = 0; });
    // saucer
    const lit = lockLit || multiball; g.fillStyle = '#05030f'; g.beginPath(); g.arc(SAUCER.x, SAUCER.y, 16, 0, 7); g.fill(); g.strokeStyle = lit && Math.floor(t * 5) % 2 ? '#3de8ff' : 'rgba(61,232,255,.4)'; g.lineWidth = 4; glow(g, '#3de8ff', lit ? 20 : 4); g.beginPath(); g.arc(SAUCER.x, SAUCER.y, 18, 0, 7); g.stroke(); g.shadowBlur = 0;
    g.fillStyle = lit ? '#3de8ff' : 'rgba(255,255,255,.4)'; g.font = '12px "Russo One"'; g.textAlign = 'center'; g.fillText(multiball ? 'JACKPOT' : lockLit ? 'LOCK' : 'SAUCER', SAUCER.x, SAUCER.y - 26);
    for (let i = 0; i < 2; i++) { g.fillStyle = i < locks ? '#3de8ff' : 'rgba(61,232,255,.2)'; g.beginPath(); g.arc(SAUCER.x - 8 + i * 16, SAUCER.y + 30, 5, 0, 7); g.fill(); }
    // bumpers
    for (const bp of BUMP) { const l = bp.lit > 0, s = l ? 1.12 : 1; glow(g, '#3de8ff', l ? 30 : 12); g.fillStyle = l ? '#bff8ff' : '#1a6a8a'; g.beginPath(); g.arc(bp.x, bp.y, bp.r * s, 0, 7); g.fill(); g.shadowBlur = 0; g.fillStyle = '#0a0820'; g.beginPath(); g.arc(bp.x, bp.y, bp.r * .62, 0, 7); g.fill(); g.strokeStyle = '#3de8ff'; g.lineWidth = 3; g.beginPath(); g.arc(bp.x, bp.y, bp.r * .62, 0, 7); g.stroke(); g.fillStyle = '#3de8ff'; g.font = '13px "Russo One"'; g.fillText('100', bp.x, bp.y + 5); }
    // flippers
    for (let i = 0; i < 2; i++) { const s = flipSeg(i); g.lineCap = 'round'; glow(g, '#ff4fd8', 14); g.strokeStyle = '#ff4fd8'; g.lineWidth = 18; g.beginPath(); g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); g.stroke(); g.shadowBlur = 0; g.strokeStyle = '#ffe0f8'; g.lineWidth = 8; g.beginPath(); g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s.ax, s.ay, 5, 0, 7); g.fill(); }
    // the plunger
    const py = 712 - plunger.p * 26; g.fillStyle = '#3de8ff'; g.fillRect(848, py, 16, 720 - py + 10); g.fillStyle = '#fff'; g.fillRect(848, py, 16, 4);
    // ball save light
    if (save > 0 && balls.some(b => !b.lane)) { g.fillStyle = Math.floor(t * 6) % 2 ? '#5fe08a' : 'rgba(95,224,138,.3)'; g.font = '13px "Russo One"'; g.textAlign = 'center'; g.fillText('BALL SAVE', 640, 700); }
  }
  function drawBall(g, b) {
    const s = K.skin;
    for (let i = 0; i < b.trail.length; i++) { g.fillStyle = s.c[0]; g.globalAlpha = i / b.trail.length * .25; g.beginPath(); g.arc(b.trail[i][0], b.trail[i][1], BR * i / b.trail.length, 0, 7); g.fill(); } g.globalAlpha = 1;
    const gr = g.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, BR); gr.addColorStop(0, '#fff'); gr.addColorStop(.4, s.c[0]); gr.addColorStop(1, s.c[1]);
    glow(g, s.c[0], 10); g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, BR, 0, 7); g.fill(); g.shadowBlur = 0;
    if (s.ring) { g.strokeStyle = '#b8a8ff'; g.lineWidth = 2; g.beginPath(); g.ellipse(b.x, b.y, BR + 5, 4, lights.t * 3, 0, 7); g.stroke(); }
  }
  GAME.drawSkin = (g, s, r) => { const gr = g.createRadialGradient(-r * .3, -r * .3, 2, 0, 0, r * .8); gr.addColorStop(0, '#fff'); gr.addColorStop(.4, s.c[0]); gr.addColorStop(1, s.c[1]); g.shadowColor = s.c[0]; g.shadowBlur = 18; g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * .75, 0, 7); g.fill(); g.shadowBlur = 0; if (s.ring) { g.strokeStyle = '#b8a8ff'; g.lineWidth = 4; g.beginPath(); g.ellipse(0, 0, r * 1.05, r * .3, -.4, 0, 7); g.stroke(); } };
  function panel(g, x, y, w, h) { g.fillStyle = 'rgba(20,14,50,.85)'; g.strokeStyle = 'rgba(255,79,216,.45)'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill(); g.stroke(); }
  GAME.draw = g => {
    const v = K.view; g.fillStyle = '#070616'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    // side art: slow neon rays
    for (let i = 0; i < 12; i++) { g.strokeStyle = `rgba(${i % 2 ? '255,79,216' : '61,232,255'},.06)`; g.lineWidth = 30; g.beginPath(); g.moveTo(640, 900); g.lineTo(640 + Math.cos(-Math.PI / 2 + (i - 5.5) * .28 + Math.sin(lights.t * .3) * .05) * 1400, 900 + Math.sin(-Math.PI / 2 + (i - 5.5) * .28) * 1400); g.stroke(); }
    table(g);
    for (const b of balls) drawBall(g, b);
    // left panel: score and state
    panel(g, 60, 40, 300, 300); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ff4fd8'; g.font = '18px "Russo One"'; g.fillText('SCORE', 210, 76);
    g.fillStyle = '#fff'; g.font = `${score > 9999999 ? 34 : 42}px "Russo One"`; glow(g, '#ff4fd8', 16); g.fillText(score.toLocaleString(), 210, 122); g.shadowBlur = 0;
    g.font = '18px "Russo One"'; g.fillStyle = '#3de8ff'; g.fillText(`BALL ${Math.min(ballNo, 3)} / 3`, 210, 176);
    g.fillStyle = '#ffd23f'; g.fillText(`MULTIPLIER ${mult}X`, 210, 210);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '15px "Russo One"'; g.fillText(`BEST ${Math.max(K.save.best, score).toLocaleString()}`, 210, 244);
    if (multiball) { g.fillStyle = Math.floor(lights.t * 5) % 2 ? '#ff4fd8' : '#3de8ff'; g.font = '24px "Russo One"'; g.fillText('MULTIBALL!', 210, 296); }
    // right panel: the goals
    panel(g, 920, 40, 300, 300); g.fillStyle = '#3de8ff'; g.font = '18px "Russo One"'; g.fillText('TABLE GOALS', 1070, 76);
    const goals = [['Light lanes A B C', lanes.filter(Boolean).length + ' / 3', `${mult}X`], ['Drop targets', drops.filter(Boolean).length + ' / 3', lockLit ? 'LOCK LIT' : ''], ['Lock balls', locks + ' / 2', multiball ? 'GO!' : ''], ['Bumper blitz', Math.min(30, missions.bumpers) + ' / 30', missions.bumpers >= 30 ? 'DONE' : '']];
    goals.forEach(([a, b, c], i) => { const y = 118 + i * 52; g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = '15px "Russo One"'; g.fillText(a, 945, y); g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '13px "Russo One"'; g.fillText(b, 945, y + 20); g.textAlign = 'right'; g.fillStyle = '#ffd23f'; g.fillText(c, 1196, y + 10); });
    g.textAlign = 'center';
    // controls reminder
    panel(g, 60, 380, 300, 150); g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '14px "Russo One"';
    ['LEFT FLIPPER:  ← / A / left half', 'RIGHT FLIPPER:  → / D / right half', 'PLUNGER:  hold Space, let go'].forEach((s, i) => g.fillText(s, 210, 420 + i * 34));
    // messages over the table
    msgs.slice(-2).forEach((m, i) => { const a = Math.min(1, m.k * 6, (m.d - m.k) * 3); g.globalAlpha = Math.max(0, a); g.fillStyle = 'rgba(7,6,22,.8)'; g.beginPath(); g.roundRect(440, 560 - i * 50, 400, 40, 12); g.fill(); g.fillStyle = m.c; g.font = '20px "Russo One"'; glow(g, m.c, 14); g.fillText(m.t, 640, 581 - i * 50); g.shadowBlur = 0; g.globalAlpha = 1; });
    if (laneBall() && !K.bot && ballNo === 1 && score === 0) { g.fillStyle = '#fff'; g.font = '16px "Russo One"'; g.fillText('Hold Space (or the right side)', 1070, 380); g.fillText('and let go to launch!', 1070, 404); }
  };
  GAME.test = { st: () => ({ score, ballNo, balls: balls.map(b => ({ x: Math.round(b.x), y: Math.round(b.y), lane: b.lane })), mult, lanes, drops, locks, multiball, over }), flip: setFlip, plunge: p => { plunger.hold = true; plunger.p = p; plungeRelease(); }, lanes: () => lanes, drops: () => drops };
})();
