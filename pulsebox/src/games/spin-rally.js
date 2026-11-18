/* Spin Rally: side-view table tennis. Your paddle follows your finger or mouse; swing forward for a deeper, harder
   return, swing up for topspin, down for backspin, and smash a high ball. Beat five opponents in a row to win the cup.
   Matches are first to 7 (win by 2). Serves switch every two points. */
const GAME = {
  id: 'spin-rally', title: 'Spin Rally', tagline: 'Table tennis with real spin. Beat five rivals to lift the cup.',
  font: 'Bungee', accent: '#ff7a2e', accent2: '#3dd6ff', bg: '#0c1426', noHud: true, scoreLabel: 'Points',
  how: ['Move your paddle with your finger or mouse (or the arrow keys). Meet the ball and it goes back by itself.', 'Swing forward as you hit for a deeper, faster shot. Swing up for topspin, down for backspin. Hit a high ball hard to SMASH.', 'Tap, click or press Space to serve. First to 7 wins the match. Beat all five rivals to win the cup!'],
  skins: [
    { name: 'Classic Red', price: 0, c: ['#e8303a', '#1a1a1a'] }, { name: 'Ocean', price: 40, c: ['#2a8aff', '#0a2a5a'] }, { name: 'Lime', price: 90, c: ['#8aff3a', '#1a4a0a'] },
    { name: 'Sunset', price: 160, c: ['#ff9a2e', '#ff3a8a'] }, { name: 'Midnight', price: 260, c: ['#3a2a8a', '#ffd23f'] }, { name: 'Golden', price: 420, c: ['#ffd23f', '#a86a10'], glow: true },
  ],
};
(() => {
  const TY = 470, TL = 240, TR = 1040, NETX = 640, NETY = 418, FLOOR = 690, BR = 8, G = 1350;
  const RIVALS = [
    { name: 'Benny', miss: .2, title: 'The Rookie', c: '#3dd6ff', speed: 520, react: .26, err: 90, power: .45, spin: .2, smash: .05, skin: '#f2c49a' },
    { name: 'Mei', miss: .15, title: 'Club Champ', c: '#5fe08a', speed: 640, react: .2, err: 70, power: .55, spin: .4, smash: .12, skin: '#e8b48a' },
    { name: 'Diego', miss: .11, title: 'The Wall', c: '#ffd23f', speed: 760, react: .15, err: 55, power: .55, spin: .5, smash: .1, skin: '#c8865a' },
    { name: 'Anya', miss: .08, title: 'Spin Doctor', c: '#c47cff', speed: 840, react: .12, err: 45, power: .7, spin: .9, smash: .2, skin: '#f4d0b0' },
    { name: 'Kenji', miss: .06, title: 'The Legend', c: '#ff4a5a', speed: 960, react: .09, err: 35, power: .82, spin: .8, smash: .32, skin: '#e0b088' },
  ];
  let P, C, ball, score, server, serves, phase, pt, rival, msg, rally, ptr, keys, trail, crowd, matchStats, stars;

  GAME.reset = () => {
    rival = 0; P = { x: 160, y: 420, vx: 0, vy: 0, hx: [], tx: 160, ty: 420, swing: 0 }; keys = {}; ptr = null; trail = []; stars = [];
    crowd = Array.from({ length: 90 }, (_, i) => ({ x: (i * 37) % 1400 - 60, y: 70 + (i % 3) * 38 + (i * 13) % 18, c: ['#3a4a7a', '#4a3a6a', '#2a5a6a', '#5a4a3a'][i % 4], h: (i * 7) % 3, ph: i }));
    newMatch();
  };
  function newMatch() { score = [0, 0]; server = 0; serves = 0; C = { x: 1120, y: 420, vx: 0, vy: 0, tx: 1120, ty: 420, swing: 0, think: 0 }; matchStats = { smashes: 0, longest: 0 }; msg = { t: `vs ${RIVALS[rival].name.toUpperCase()}`, s: `${RIVALS[rival].title} · Match ${rival + 1} of 5`, k: 0, d: 2.2 }; setupServe(); }
  function setupServe() { phase = 'serve'; pt = 0; rally = 0; ball = { x: 0, y: 0, vx: 0, vy: 0, spin: 0, last: server, bounces: [0, 0], live: false, held: true }; trail = []; }
  const say = (t, s, d = 1.4) => { msg = { t, s, k: 0, d }; };

  /* ---------- the shot: aim at a landing spot on the far side, clear the net, add spin ---------- */
  function shotTo(b, side, L, speed, spin, err) {
    // side 0 = hit by the player toward the right; side 1 = by the CPU toward the left
    L += (Math.random() - .5) * 2 * err;
    const dx = L - b.x, dist = Math.abs(dx); let T = dist / speed, vy = 0;
    const g = G + spin * 420;
    for (let k = 0; k < 30; k++) {   // raise the arc until it clears the net
      vy = ((TY - BR) - b.y - .5 * g * T * T) / T;
      const tn = (NETX - b.x) / (dx / T), yn = b.y + vy * tn + .5 * g * tn * tn;
      if (tn <= 0 || yn < NETY - BR - 6) break; T *= 1.07;
    }
    b.vx = dx / T; b.vy = vy; b.spin = spin; b.last = side; b.bounces = [0, 0]; b.live = true; b.held = false;
  }
  function hit(who, side, pvx, pvy, quality) {
    const b = ball, R = RIVALS[rival], mine = side === 0, dir = mine ? 1 : -1;
    let power, spin, err, smash = false;
    if (mine) {
      power = Math.max(.15, Math.min(1.1, .35 + pvx / 1500)); spin = Math.max(-1, Math.min(1, -pvy / 1100)); err = 22 + (1 - quality) * 150;
      if (b.y < 395 && pvx > 520) smash = true;
    } else {
      power = R.power * (.7 + Math.random() * .5); spin = (Math.random() * 2 - 1) * R.spin; err = R.err; if (b.y < 400 && Math.random() < R.smash * 3) smash = true;
      if (b.spin > .5 && Math.random() > R.spin) err += 60;   // heavy spin is hard to read
    }
    // a mistake: harder balls (fast, spinning, smashed, long rallies) make one more likely
    const sp = Math.hypot(b.vx, b.vy), pm = (mine ? (K.bot ? .1 : 0) : R.miss) + (sp > 1100 ? .12 : 0) + (sp > 1600 ? .25 : 0) + Math.abs(b.spin) * .08 + Math.min(.12, rally * .006);
    if ((!mine || K.bot) && Math.random() < pm) {
      const wild = Math.random() < .5;   // long, or into the net
      const L2 = mine ? (wild ? TR + 40 + Math.random() * 120 : NETX + 40) : (wild ? TL - 40 - Math.random() * 120 : NETX - 40);
      b.vx = (L2 - b.x) / (wild ? .55 : .5); b.vy = wild ? -380 : 120; b.spin = 0; b.last = side; b.bounces = [0, 0]; b.live = true; b.held = false;
      who.swing = .22; rally++; K.sfx(700, .05, 'square', .08); return;
    }
    // returning spin: the incoming spin pushes your ball off line unless you swing through it
    err += Math.abs(b.spin) * 40;
    let L = mine ? NETX + 90 + power * 280 : NETX - 90 - power * 280, speed = 620 + power * 700;
    if (smash) { speed = 1700 + power * 300; spin = .6; L = mine ? 900 + Math.random() * 100 : 380 - Math.random() * 100; err *= .6; if (mine) { matchStats.smashes++; K.shake(7); say('SMASH!', '', .9); } }
    shotTo(b, side, Math.max(mine ? 660 : TL + 10, Math.min(mine ? TR - 10 : 620, L)), speed, spin, err);
    who.swing = .22; rally++; matchStats.longest = Math.max(matchStats.longest, rally);
    K.sfx(smash ? 520 : 760 + Math.random() * 80, .05, 'square', smash ? .12 : .09); K.noise(.03, .08, 2500);
    if (smash) K.burst(b.x, b.y, ['#fff', '#ff7a2e', '#ffd23f'], 16, 320, { life: .35 });
  }
  function serve(side) {
    if (phase !== 'serve' || side !== server) return;
    const who = side ? C : P, b = ball; b.x = who.x + (side ? -24 : 24); b.y = Math.min(who.y - 50, 370);   // tossed up, struck on the way down
    // the serve bounces once on your side, then on theirs
    // try serves until one clears the net and lands deep enough on the other side
    const dir = side ? -1 : 1; let best = null;
    for (let k = 0; k < 60 && !best; k++) {
      const B1 = side ? 840 + Math.random() * 120 : 440 - Math.random() * 120, vx = dir * (520 + Math.random() * 360), t = (B1 - b.x) / vx; if (t <= .05) continue;
      const vy = ((TY - BR) - b.y - .5 * G * t * t) / t, vi = vy + G * t, up = -vi * .84, tn = (NETX - B1) / vx, yn = TY - BR + up * tn + .5 * G * tn * tn;
      const t2 = -2 * up / G, land = B1 + vx * t2;
      if (yn < NETY - BR - 10 && (side ? land > TL + 60 && land < NETX - 60 : land < TR - 60 && land > NETX + 60)) best = { vx, vy };
    }
    if (!best) best = { vx: dir * 700, vy: -300 };
    b.vx = best.vx; b.vy = best.vy; b.spin = 0; b.last = side; b.bounces = [0, 0]; b.live = true; b.held = false; b.serve = true;
    phase = 'rally'; rally = 0; who.swing = .2; K.sfx(700, .05, 'square', .08);
  }

  /* ---------- points ---------- */
  function point(winner, why) {
    if (phase !== 'rally') return;
    phase = 'point'; pt = 0; score[winner]++; ball.live = false;
    if (winner === 0) { K.score += 10 + Math.min(20, rally * 2); K.sfx(660, .1, 'triangle', .08); K.sfx(990, .12, 'triangle', .08, 0, .08); crowd.forEach(c => c.jump = .6); }
    else K.sfx(220, .2, 'triangle', .07, -60);
    say(winner === 0 ? 'YOUR POINT' : `${RIVALS[rival].name.toUpperCase()}'S POINT`, why);
    if (++serves >= 2 || (score[0] >= 6 && score[1] >= 6)) { serves = 0; server = 1 - server; }
  }
  function checkMatch() {
    const [a, b] = score;
    if ((a >= 7 || b >= 7) && Math.abs(a - b) >= 2) {
      if (a > b) {
        K.score += 100 * (rival + 1); K.coin(3 + rival * 2); K.chime(523, [0, 4, 7, 12, 16]); K.burst(640, 300, ['#ffd23f', '#fff', '#ff7a2e', '#3dd6ff'], 60, 520);
        if (rival === RIVALS.length - 1) { phase = 'done'; K.score += 500; K.coin(15); K.over({ title: 'CUP WINNER!', text: `You beat all five rivals, ending with ${a}-${b} against ${RIVALS[rival].name}. Longest rally: ${matchStats.longest}.`, delay: 1400 }); return true; }
        phase = 'won'; pt = 0; say('MATCH WON!', `${a} - ${b} · next up: ${RIVALS[rival + 1].name}, ${RIVALS[rival + 1].title}`, 2.6); return true;
      }
      phase = 'done'; K.over({ title: `${RIVALS[rival].name} wins`, text: `You lost ${a}-${b} in match ${rival + 1} of 5. Longest rally: ${matchStats.longest}.`, delay: 1200 }); return true;
    }
    return false;
  }

  /* ---------- ball ---------- */
  function stepBall(dt) {
    const b = ball; if (!b.live) return;
    const px = b.x, py = b.y;
    b.vy += (G + b.spin * 420) * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    // the net
    if ((px - NETX) * (b.x - NETX) <= 0 && b.y > NETY - BR && b.y < TY) { b.x = NETX - Math.sign(b.vx) * (BR + 3); b.vx *= -.25; b.vy *= .3; K.sfx(160, .08, 'triangle', .07); netShake = .4; }
    // the table
    if (b.vy > 0 && py <= TY - BR && b.y > TY - BR && b.x > TL && b.x < TR) {
      b.y = TY - BR; b.vy = -b.vy * .84; b.vx += b.spin * 140 * Math.sign(b.vx); b.spin *= .45;
      const side = b.x < NETX ? 0 : 1; K.sfx(1100 + Math.random() * 100, .03, 'square', .06);
      stars.push({ x: b.x, t: 0 });
      if (b.serve && side === b.last && b.bounces[side] === 0) { b.bounces[side] = 1; return; }
      if (side === b.last) return point(1 - b.last, b.serve ? 'Fault on the serve' : 'Hit your own side');
      b.serve = false; b.bounces[side]++;
      if (b.bounces[side] >= 2) return point(b.last, 'Double bounce!');
    }
    if (b.y > FLOOR - BR) {
      const opp = 1 - b.last;
      if (b.bounces[opp] >= 1) return point(b.last, rally > 6 ? `What a rally! (${rally})` : 'Too good!');
      return point(opp, b.serve ? 'The serve missed' : (b.x > TL && b.x < TR ? 'Into the net' : 'Out!'));
    }
    if (b.x < -80 || b.x > 1360) { const opp = 1 - b.last; return point(b.bounces[opp] >= 1 ? b.last : opp, b.bounces[opp] >= 1 ? 'Unreturnable!' : 'Long!'); }
    // paddles: sweep the path so fast balls can't slip through
    for (const [who, side] of [[P, 0], [C, 1]]) {
      if (b.last === side) continue;
      const hx = who.x, top = who.y - 42, bot = who.y + 42;
      if ((px - hx) * (b.x - hx) <= 0 || Math.abs(b.x - hx) < 16) {
        if (b.y > top - BR && b.y < bot + BR && (side === 0 ? b.vx < 0 : b.vx > 0)) {
          if (b.bounces[side] < 1) { if (b.x > TL - 30 && b.x < TR + 30) return point(1 - side, 'Hit it before the bounce'); }
          const q = 1 - Math.min(1, Math.abs(b.y - who.y) / 50);
          hit(who, side, side === 0 ? who.vx : -who.vx, who.vy, q);
          b.x = hx + (side === 0 ? 18 : -18);
          return;
        }
      }
    }
  }
  let netShake = 0;
  // where will the ball be when it reaches x? (for the CPU and the demo player)
  function predict(side) {
    const b = { ...ball, bounces: [...ball.bounces] }; const strike = side ? 1110 : 170; let t = 0, best = null;
    for (let i = 0; i < 400; i++) {
      const dt = 1 / 120; t += dt; b.vy += (G + b.spin * 420) * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.vy > 0 && b.y > TY - BR && b.x > TL && b.x < TR) { b.y = TY - BR; b.vy = -b.vy * .84; b.vx += b.spin * 140 * Math.sign(b.vx); b.spin *= .45; const s = b.x < NETX ? 0 : 1; b.bounces[s]++; }
      const after = b.bounces[side] >= 1;
      if (after && b.vy > 0 && b.y > 300 && !best) best = { x: b.x, y: b.y, t };   // falling after the bounce: a comfortable height
      if (after && (side ? b.x > strike : b.x < strike)) return { x: strike, y: b.y, t };
      if (b.y > FLOOR) break;
    }
    return best;
  }

  /* ---------- update ---------- */
  GAME.update = dt => {
    if (msg && (msg.k += dt) > msg.d) msg = null; netShake = Math.max(0, netShake - dt);
    for (const s of stars) s.t += dt; stars = stars.filter(s => s.t < .4);
    for (const c of crowd) if (c.jump > 0) c.jump -= dt;
    // the player's paddle chases the pointer (or keys) and remembers its speed for the swing
    if (keys.l) P.tx -= 760 * dt; if (keys.r) P.tx += 760 * dt; if (keys.u) P.ty -= 760 * dt; if (keys.d) P.ty += 760 * dt;
    P.tx = Math.max(40, Math.min(600, P.tx)); P.ty = Math.max(180, Math.min(660, P.ty));
    movePaddle(P, P.tx, P.ty, dt, 1);
    // the CPU
    const R = RIVALS[rival];
    if (phase === 'rally' && ball.live && ball.last === 0 && ball.vx > 0) {
      if ((C.think -= dt) <= 0) { C.think = R.react; const p = predict(1); if (p) { C.tx = Math.max(700, Math.min(1240, p.x + 10)); C.ty = p.y + (Math.random() - .5) * 18; } }
    } else if (phase !== 'serve' || server === 0) { C.tx += (1120 - C.tx) * dt * 2; C.ty += (400 - C.ty) * dt * 2; }
    const cs = R.speed; const dx = C.tx - C.x, dy = C.ty - C.y, d = Math.hypot(dx, dy), m = Math.min(d, cs * dt);
    const ox = C.x, oy = C.y; if (d > 0) { C.x += dx / d * m; C.y += dy / d * m; } C.vx = (C.x - ox) / dt; C.vy = (C.y - oy) / dt;
    if (P.swing > 0) P.swing -= dt; if (C.swing > 0) C.swing -= dt;
    if (phase === 'serve') {
      pt += dt; const who = server ? C : P; ball.x = who.x + (server ? -26 : 26); ball.y = who.y - 30 + Math.sin(pt * 6) * 6;
      if (server === 1 && pt > 1.1) serve(1);
      if (server === 0 && K.bot && pt > .8) serve(0);
    } else if (phase === 'rally') {
      const n = 4; for (let i = 0; i < n && phase === 'rally'; i++) stepBall(dt / n);
      trail.push([ball.x, ball.y, ball.spin]); if (trail.length > 14) trail.shift();
    } else if (phase === 'point') { pt += dt; stepFree(dt); if (pt > 1.3 && !checkMatch()) setupServe(); }
    else if (phase === 'won') { pt += dt; if (pt > 2.8) { rival++; newMatch(); } }
  };
  function stepFree(dt) { const b = ball; b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y > FLOOR - BR) { b.y = FLOOR - BR; b.vy *= -.5; b.vx *= .7; } }
  function movePaddle(p, tx, ty, dt, k) {
    const ox = p.x, oy = p.y; p.x += (tx - p.x) * Math.min(1, dt * 22); p.y += (ty - p.y) * Math.min(1, dt * 22);
    const vx = (p.x - ox) / dt, vy = (p.y - oy) / dt; p.vx += (vx - p.vx) * Math.min(1, dt * 14); p.vy += (vy - p.vy) * Math.min(1, dt * 14);
  }

  /* ---------- input ---------- */
  GAME.down = (x, y) => { ptr = true; P.tx = x; P.ty = y; if (phase === 'serve' && server === 0) serve(0); };
  GAME.move = (x, y) => { P.tx = x; P.ty = y; };
  GAME.up = () => { ptr = null; };
  GAME.key = (c, dn) => {
    if (c === 'ArrowLeft' || c === 'KeyA') keys.l = dn; if (c === 'ArrowRight' || c === 'KeyD') keys.r = dn; if (c === 'ArrowUp' || c === 'KeyW') keys.u = dn; if (c === 'ArrowDown' || c === 'KeyS') keys.d = dn;
    if (dn && (c === 'Space' || c === 'Enter')) { if (phase === 'serve' && server === 0) serve(0); else { P.tx += 140; setTimeout(() => { P.tx -= 140; }, 140); } }   // Space: a forward lunge
  };

  /* ---------- the demo player ---------- */
  let botThink = 0;
  GAME.bot = dt => {
    if (phase === 'rally' && ball.live && ball.last === 1 && ball.vx < 0) {
      if ((botThink -= dt) <= 0) { botThink = .12; const p = predict(0); if (p) { P.tx = Math.max(60, Math.min(560, p.x - 10)); P.ty = p.y; } }
      const d = Math.hypot(ball.x - P.x, ball.y - P.y); if (d < 120) { P.tx += 30; }
    } else if (phase !== 'rally') { P.tx = 170; P.ty = 400; }
  };

  /* ---------- drawing ---------- */
  function person(g, x, y, face, shirt, skin, swing) {
    // a simple player standing behind the paddle: legs, body, head, and the arm reaching to the paddle
    const bx = x - face * 70, by = Math.max(330, Math.min(470, y + 20));
    g.strokeStyle = '#1a2238'; g.lineWidth = 16; g.lineCap = 'round';
    g.beginPath(); g.moveTo(bx - 8, by + 60); g.lineTo(bx - 18, FLOOR - 4); g.moveTo(bx + 8, by + 60); g.lineTo(bx + 20, FLOOR - 4); g.stroke();
    g.fillStyle = shirt; g.beginPath(); g.roundRect(bx - 22, by - 30, 44, 92, 16); g.fill();
    g.strokeStyle = skin; g.lineWidth = 11; g.beginPath(); g.moveTo(bx + face * 14, by - 18); g.quadraticCurveTo(bx + face * (40 + swing * 60), by - 10, x - face * 8, y + 22); g.stroke();
    g.fillStyle = skin; g.beginPath(); g.arc(bx, by - 52, 20, 0, 7); g.fill(); g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(bx, by - 58, 20, Math.PI, 0); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(bx + face * 9, by - 52, 4, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(bx + face * 10, by - 52, 2, 0, 7); g.fill();
  }
  function paddle(g, x, y, c1, c2, face, tilt, glowC) {
    g.save(); g.translate(x, y); g.rotate(tilt);
    g.fillStyle = '#c89a5a'; g.fillRect(-5 * face - 3, 26, 8, 30);
    if (glowC) { g.shadowColor = glowC; g.shadowBlur = 18; }
    g.fillStyle = c2; g.beginPath(); g.ellipse(0, 0, 13, 40, 0, 0, 7); g.fill(); g.shadowBlur = 0;
    g.fillStyle = c1; g.beginPath(); g.ellipse(face * 3, 0, 10, 37, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(face * 1, -12, 3, 14, 0, 0, 7); g.fill();
    g.restore();
  }
  GAME.drawSkin = (g, s, r) => { g.save(); g.rotate(-.6); g.fillStyle = '#c89a5a'; g.fillRect(-5, r * .5, 10, r * .7); if (s.glow) { g.shadowColor = s.c[0]; g.shadowBlur = 16; } g.fillStyle = s.c[1]; g.beginPath(); g.ellipse(0, -r * .1, r * .62, r * .7, 0, 0, 7); g.fill(); g.shadowBlur = 0; g.fillStyle = s.c[0]; g.beginPath(); g.ellipse(0, -r * .1, r * .54, r * .62, 0, 0, 7); g.fill(); g.restore(); };
  GAME.draw = g => {
    const v = K.view, R = RIVALS[rival], t = K.t;
    // arena: dark stands, spotlights, the floor
    const bg = g.createLinearGradient(0, v.y0, 0, v.y1); bg.addColorStop(0, '#0c1426'); bg.addColorStop(.6, '#1a2440'); bg.addColorStop(1, '#0a0f1c'); g.fillStyle = bg; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    for (const c of crowd) { const j = c.jump > 0 ? Math.sin(c.jump * 20) * 6 : Math.sin(t * 2 + c.ph) * 1.5; g.fillStyle = c.c; g.beginPath(); g.arc(c.x, c.y - j, 13, 0, 7); g.fill(); g.fillRect(c.x - 15, c.y + 8 - j, 30, 40); }
    g.fillStyle = '#121a30'; g.fillRect(v.x0, 220, v.x1 - v.x0, 30);
    g.fillStyle = '#ff7a2e'; g.font = '18px Bungee'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let x = 120; x < 1280; x += 360) g.fillText('SPIN RALLY OPEN', x + (t * 20) % 360 - 180, 236);
    for (const sx of [300, 980]) { const lg = g.createRadialGradient(sx, 0, 10, sx, 300, 520); lg.addColorStop(0, 'rgba(255,240,200,.16)'); lg.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = lg; g.beginPath(); g.moveTo(sx - 40, v.y0); g.lineTo(sx + 40, v.y0); g.lineTo(sx + 300, FLOOR); g.lineTo(sx - 300, FLOOR); g.fill(); }
    const fl = g.createLinearGradient(0, 560, 0, 720); fl.addColorStop(0, '#2a3a6a'); fl.addColorStop(1, '#1a2448'); g.fillStyle = fl; g.fillRect(v.x0, 560, v.x1 - v.x0, v.y1 - 560);
    g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 2; for (let x = -200; x < 1500; x += 90) { g.beginPath(); g.moveTo(x, 560); g.lineTo(640 + (x - 640) * 1.8, 720); g.stroke(); }
    // players behind the table
    const sk = K.skin;
    person(g, C.x, C.y, -1, R.c, R.skin, C.swing);
    person(g, P.x, P.y, 1, sk.c[0], '#e8b48a', P.swing);
    // the table: top, front edge, legs, net
    g.fillStyle = '#0a1a3a'; g.fillRect(TL + 40, TY + 14, 16, FLOOR - TY - 14); g.fillRect(TR - 56, TY + 14, 16, FLOOR - TY - 14); g.fillRect(NETX - 8, TY + 14, 16, 120);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(NETX, FLOOR, 440, 14, 0, 0, 7); g.fill();
    g.fillStyle = '#1f5ac8'; g.beginPath(); g.moveTo(TL - 18, TY - 22); g.lineTo(TR + 18, TY - 22); g.lineTo(TR, TY); g.lineTo(TL, TY); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(TL - 14, TY - 20); g.lineTo(TR + 14, TY - 20); g.lineTo(TR, TY - 1); g.lineTo(TL, TY - 1); g.closePath(); g.moveTo(TL - 7, TY - 11); g.lineTo(TR + 7, TY - 11); g.stroke();
    g.fillStyle = '#174aa8'; g.fillRect(TL, TY, TR - TL, 14); g.fillStyle = '#fff'; g.fillRect(TL, TY, TR - TL, 3);
    for (const s of stars) { g.strokeStyle = `rgba(255,255,255,${1 - s.t / .4})`; g.lineWidth = 2; g.beginPath(); g.ellipse(s.x, TY - 4, 6 + s.t * 50, 2 + s.t * 8, 0, 0, 7); g.stroke(); }
    const ns = Math.sin(t * 60) * netShake * 4; g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(NETX - 3 + ns, NETY, 6, TY - NETY); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; for (let y = NETY + 6; y < TY; y += 6) { g.beginPath(); g.moveTo(NETX - 3 + ns, y); g.lineTo(NETX + 3 + ns, y); g.stroke(); } g.fillStyle = '#fff'; g.fillRect(NETX - 4 + ns, NETY - 3, 8, 5); g.fillStyle = '#ddd'; g.fillRect(NETX - 2, NETY - 3, 4, TY - NETY + 3);
    // the ball's shadow on the table or floor, its spin-coloured trail, and the ball
    const b = ball, onT = b.x > TL && b.x < TR, sy = onT && b.y < TY ? TY - 2 : FLOOR - 2, sk2 = Math.max(.2, 1 - (sy - b.y) / 400);
    g.fillStyle = `rgba(0,0,0,${.35 * sk2})`; g.beginPath(); g.ellipse(b.x, sy, 9 * sk2 + 3, 3, 0, 0, 7); g.fill();
    for (let i = 1; i < trail.length; i++) { const k = i / trail.length, sp = trail[i][2]; g.strokeStyle = sp > .25 ? `rgba(255,122,46,${k * .6})` : sp < -.25 ? `rgba(61,214,255,${k * .6})` : `rgba(255,255,255,${k * .35})`; g.lineWidth = BR * 1.6 * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(trail[i - 1][0], trail[i - 1][1]); g.lineTo(trail[i][0], trail[i][1]); g.stroke(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x, b.y, BR, 0, 7); g.fill(); g.fillStyle = 'rgba(255,170,90,.6)'; g.beginPath(); g.arc(b.x + 2, b.y + 2, BR * .6, 0, Math.PI); g.fill();
    // paddles in front
    paddle(g, C.x, C.y, R.c, '#1a1a1a', -1, -Math.max(-.6, Math.min(.6, C.vy / 2000)) - C.swing * 1.5, null);
    paddle(g, P.x, P.y, sk.c[0], sk.c[1], 1, Math.max(-.6, Math.min(.6, P.vy / 2000)) + P.swing * 1.5, sk.glow ? sk.c[0] : null);
    // scoreboard
    g.fillStyle = 'rgba(8,12,24,.9)'; g.beginPath(); g.roundRect(420, 14, 440, 66, 16); g.fill();
    g.font = '16px Bungee'; g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText('YOU', 440, 36); g.textAlign = 'right'; g.fillStyle = R.c; g.fillText(R.name.toUpperCase(), 840, 36);
    g.font = '30px Bungee'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(`${score[0]}  -  ${score[1]}`, 640, 56);
    g.font = '12px Bungee'; g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText(`MATCH ${rival + 1}/5 · FIRST TO 7`, 640, 30);
    for (const [x, s] of [[452, 0], [828, 1]]) if (server === s) { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, 58, 6, 0, 7); g.fill(); }
    g.textAlign = 'left'; g.font = '14px Bungee'; g.fillStyle = '#ffd23f'; g.fillText(`${K.score} PTS`, 30, 700); g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(rally > 2 && phase === 'rally' ? `RALLY ${rally}` : '', 1200, 700);
    // the cup ladder
    RIVALS.forEach((r, i) => { const x = 1000 + i * 48, done = i < rival, cur = i === rival; g.fillStyle = done ? '#ffd23f' : cur ? r.c : 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(x, 46, cur ? 13 : 10, 0, 7); g.fill(); if (done) { g.fillStyle = '#141414'; g.font = '12px Bungee'; g.textAlign = 'center'; g.fillText('✓', x, 47); } });
    if (msg) { const a = Math.min(1, msg.k * 5, (msg.d - msg.k) * 3); g.globalAlpha = Math.max(0, a); g.textAlign = 'center'; g.font = `${msg.t.length > 14 ? 40 : 52}px Bungee`; g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText(msg.t, 640, 300); g.fillStyle = '#ffd23f'; g.fillText(msg.t, 640, 300); if (msg.s) { g.font = '18px Bungee'; g.strokeText(msg.s, 640, 346); g.fillStyle = '#fff'; g.fillText(msg.s, 640, 346); } g.globalAlpha = 1; }
    if (phase === 'serve' && server === 0 && !K.bot && !msg) { g.textAlign = 'center'; g.font = '18px Bungee'; g.fillStyle = '#fff'; g.fillText('TAP, CLICK OR SPACE TO SERVE', 640, 140); }
  };
  GAME.test = { st: () => ({ phase, score, rival, server, rally, ball: { x: Math.round(ball.x), y: Math.round(ball.y), last: ball.last, b: ball.bounces } }), serve, setRival: r => { rival = r; newMatch(); } };
})();
