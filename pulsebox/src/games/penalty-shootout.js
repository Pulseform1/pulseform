/* Penalty Shootout: pick a nation and win a 16-team knockout cup, one shootout at a time. Shooting: hold to aim and
   charge, release to strike (harder = faster but wilder). Saving: move your gloves to the ball before it beats you. */
const GAME = {
  id: 'penalty-shootout', title: 'Penalty Shootout', tagline: 'Five kicks. Sudden death. Win the cup!',
  font: 'Bebas Neue', accent: '#ffd23f', accent2: '#3ddc84', bg: '#0b2a16', noHud: true, scoreLabel: 'Cup score',
  how: ['Shooting: hold on the goal to aim, let the power bar build, release to shoot. More power is faster but less accurate.', 'Saving: move your gloves (mouse, finger or arrow keys) to where the ball is going.', 'Win 4 shootouts in a row to lift the cup. Keyboard: arrows aim, hold Space to charge.'],
  skins: [
    { name: 'Classic', price: 0, c: ['#ffffff', '#1a1a1a'] }, { name: 'Retro', price: 80, c: ['#c8874a', '#6a3a14'] }, { name: 'Neon', price: 180, c: ['#3aff5a', '#0a2a10'], glow: true },
    { name: 'Fire', price: 300, c: ['#ff9f1c', '#c0200a'], glow: true }, { name: 'Galaxy', price: 500, c: ['#7c4dff', '#140a3a'], glow: true }, { name: 'Gold', price: 800, c: ['#ffd23f', '#a06a00'], glow: true },
  ],
};
(() => {
  const TEAMS = [
    ['France', 'v', ['#1f3c9a', '#ffffff', '#e1262d']], ['Italy', 'v', ['#119a48', '#ffffff', '#d52b2b']], ['Germany', 'h', ['#111111', '#dd1f26', '#ffce00']], ['Netherlands', 'h', ['#c8102e', '#ffffff', '#1f4d9a']],
    ['Belgium', 'v', ['#111111', '#fdda24', '#ef3340']], ['Ireland', 'v', ['#169b62', '#ffffff', '#ff883e']], ['Nigeria', 'v', ['#008751', '#ffffff', '#008751']], ['Mexico', 'v', ['#006847', '#ffffff', '#ce1126']],
    ['Colombia', 'h', ['#fcd116', '#fcd116', '#003893', '#ce1126']], ['Argentina', 'h', ['#74acdf', '#ffffff', '#74acdf']], ['Japan', 'd', ['#ffffff', '#bc002d']], ['Spain', 'h', ['#aa151b', '#f1bf00', '#f1bf00', '#aa151b']],
    ['Austria', 'h', ['#ed2939', '#ffffff', '#ed2939']], ['Peru', 'v', ['#d91023', '#ffffff', '#d91023']], ['Poland', 'h', ['#ffffff', '#dc143c']], ['Ghana', 'h', ['#ce1126', '#fcd116', '#006b3f']],
  ].map(([n, d, c], i) => ({ i, n, d, c, kit: c.find(x => x !== '#ffffff') || c[0], rate: .4 + ((i * 37) % 11) / 20 }));
  const ROUNDS = ['Round of 16', 'Quarter-final', 'Semi-final', 'Final'];
  const FONT = '"Bebas Neue", Impact, sans-serif', BODY = '800 18px Nunito, system-ui, sans-serif';
  // goal plane: x -300..300 (posts), y 0..200 (crossbar)
  const GW = 300, GH = 200;
  let st, team, bracket, round, match, kick, aim, ball, keeper, gloves, res, resT, shooter, ptr, keys, sel, banner, stats, flash;
  const shoot = { x: g => 640 + g, y: g => 392 - g };
  const save = { x: g => 640 + g * 1.9, y: g => 610 - g * 2.45 };
  function flag(g, t, x, y, w, h) {
    g.save(); g.beginPath(); g.roundRect(x, y, w, h, h * .12); g.clip();
    if (t.d === 'd') { g.fillStyle = t.c[0]; g.fillRect(x, y, w, h); g.fillStyle = t.c[1]; g.beginPath(); g.arc(x + w / 2, y + h / 2, h * .3, 0, 7); g.fill(); }
    else t.c.forEach((c, i) => { g.fillStyle = c; if (t.d === 'v') g.fillRect(x + w * i / t.c.length, y, w / t.c.length + 1, h); else g.fillRect(x, y + h * i / t.c.length, w, h / t.c.length + 1); });
    g.restore(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, w, h, h * .12); g.stroke();
  }
  function drawBall(g, x, y, r, rot = 0, s = K.skin) {
    g.save(); g.translate(x, y); g.rotate(rot);
    if (s.glow) { g.shadowColor = s.c[0]; g.shadowBlur = r * .9; }
    g.fillStyle = s.c[0]; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.shadowBlur = 0;
    g.fillStyle = s.c[1]; g.beginPath(); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 - 1.57; g.lineTo(Math.cos(a) * r * .38, Math.sin(a) * r * .38); } g.fill();
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 - 1.57 + .63; g.beginPath(); g.arc(Math.cos(a) * r * .92, Math.sin(a) * r * .92, r * .22, 0, 7); g.fill(); }
    const sh = g.createRadialGradient(-r * .35, -r * .35, r * .1, 0, 0, r); sh.addColorStop(0, 'rgba(255,255,255,.35)'); sh.addColorStop(1, 'rgba(0,0,0,.3)'); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    g.restore();
  }
  GAME.drawSkin = (g, s, r) => drawBall(g, 0, 0, r * .9, .3, s);
  function sim(a, b) { return Math.random() < .5 + (TEAMS[a].rate - TEAMS[b].rate) * .6 ? a : b; }
  function startCup(t) {
    team = t; const others = TEAMS.map(x => x.i).filter(i => i !== t); for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
    const slot = K.irand(0, 7) * 2; bracket = [others.slice(0, 15)]; bracket[0].splice(slot, 0, t); round = 0; stats = { goals: 0, saves: 0, wins: 0 };
    st = 'bracket'; sel = 0; resT = 0;
  }
  function opponent() { const r = bracket[round], i = r.indexOf(team); return r[i ^ 1]; }
  function startMatch() {
    match = { opp: opponent(), us: [], them: [], first: Math.random() < .5 ? 'us' : 'them' };
    st = 'match'; nextKick();
  }
  const turn = () => { const n = match.us.length + match.them.length; return (n % 2 === 0) === (match.first === 'us') ? 'us' : 'them'; };
  function decided() {
    const u = match.us, t = match.them, gu = u.filter(Boolean).length, gt = t.filter(Boolean).length;
    if (u.length <= 5 && t.length <= 5) {
      if (gu > gt + (5 - t.length)) return 'us'; if (gt > gu + (5 - u.length)) return 'them';
      if (u.length === 5 && t.length === 5 && gu !== gt) return gu > gt ? 'us' : 'them';
      return null;
    }
    if (u.length === t.length && gu !== gt) return gu > gt ? 'us' : 'them';
    return null;
  }
  function nextKick() {
    const w = decided(); if (w) return endMatch(w);
    kick = turn(); res = null; resT = 0; ball = null; flash = 0;
    keeper = { x: 0, y: 0, tx: 0, ty: 0, dive: 0, t: 0 }; gloves = { x: 640, y: 380 };
    shooter = { t: 0, kicked: false };
    aim = { x: 0, y: 90, p: 0, hold: false, ht: 0 };
    if (kick === 'them') shooter.wait = K.rand(.6, 1.1);
    banner = { s: kick === 'us' ? 'YOUR KICK' : 'SAVE IT!', t: 0 };
  }
  function endMatch(w) {
    st = 'post'; resT = 0; match.win = w === 'us';
    if (match.win) { stats.wins++; K.add(100 * (round + 1)); K.coin(5 + round * 5); K.chime(523, [0, 4, 7, 12, 16]); }
    else { K.sfx(220, .7, 'sawtooth', .08, -150); }
  }
  function advance() {
    if (!match.win) return K.over({ title: `Out in the ${ROUNDS[round]}`, text: `${TEAMS[team].n} lost to ${TEAMS[match.opp].n}. ${stats.goals} goals, ${stats.saves} saves.`, delay: 100 });
    if (round === 3) { K.add(500); return K.over({ title: 'World champions!', text: `${TEAMS[team].n} lift the cup! ${stats.goals} goals, ${stats.saves} saves.`, delay: 100 }); }
    promote(); st = 'bracket'; resT = 0;
  }
  function promote() {
    const r = bracket[round], nx = [];
    for (let i = 0; i < r.length; i += 2) nx.push(r[i] === team || r[i + 1] === team ? team : sim(r[i], r[i + 1]));
    bracket.push(nx); round++;
  }
  // ---- shooting ----
  function strike() {
    if (shooter.kicked) return;
    const p = aim.p, err = 8 + p * p * 80, a = Math.random() * 6.283, e = Math.sqrt(Math.random()) * err;
    const tx = aim.x + Math.cos(a) * e, ty = aim.y + Math.sin(a) * e * .8 + p * p * 30;
    const T = .82 - p * .44;
    ball = { tx, ty, T, t: 0, r: 0 }; shooter.kicked = true; shooter.t = 0;
    // the keeper commits to a guess the moment you strike
    const read = [.3, .4, .5, .6][round], vk = [620, 680, 740, 800][round];
    const gx = Math.random() < read ? K.clamp(tx + K.rand(-60, 60), -GW + 30, GW - 30) : K.pick([-200, -120, 0, 120, 200]), gy = Math.random() < read ? K.clamp(ty, 20, 170) : K.rand(20, 150);
    keeper.tx = gx; keeper.ty = gy; keeper.v = vk; keeper.delay = .1;
    K.noise(.08, .2, 600); K.sfx(140, .12, 'square', .12, -60);
  }
  function judgeShot() {
    const { tx, ty } = ball, out = Math.abs(tx) > GW + 6 || ty > GH + 6, post = !out && (Math.abs(Math.abs(tx) - GW) < 12 || Math.abs(ty - GH) < 10);
    if (out) return Math.abs(tx) > GW + 6 ? 'WIDE!' : 'OVER!';
    if (post) return 'POST!';
    const d = Math.hypot(keeper.x - tx, keeper.y - ty);
    return d < 58 ? 'SAVED!' : 'GOAL!';
  }
  // ---- saving ----
  function aiShot() {
    const q = [.55, .65, .75, .85][round], T = [.62, .56, .5, .45][round] * K.rand(.92, 1.08);
    // aim away from where the gloves are now, usually toward a corner
    let tx, ty, best = -1;
    for (let k = 0; k < 6; k++) { const x = K.rand(-280, 280) * (Math.random() < q ? 1 : .6), y = K.rand(15, 185), sx = save.x(x), sy = save.y(y), d = Math.hypot(sx - gloves.x, sy - gloves.y) + Math.abs(x) * .4; if (d > best) { best = d; tx = x; ty = y; } }
    if (Math.random() < .07) tx = Math.sign(tx || 1) * K.rand(305, 360);
    ball = { tx, ty, T, t: 0, r: 0 }; shooter.kicked = true; shooter.t = 0;
    K.noise(.08, .2, 600); K.sfx(140, .12, 'square', .12, -60);
  }
  function judgeSave() {
    const { tx, ty } = ball;
    if (Math.abs(tx) > GW + 6 || ty > GH + 6) return 'MISSED!';
    if (Math.abs(Math.abs(tx) - GW) < 10 || Math.abs(ty - GH) < 8) return 'POST!';
    const d = Math.hypot(save.x(tx) - gloves.x, save.y(ty) - gloves.y);
    return d < 95 || (d < 125 && Math.random() < .5) ? 'SAVED!' : 'GOAL!';
  }
  function settle(r) {
    res = r; resT = 0;
    const scored = r === 'GOAL!';
    if (kick === 'us') { match.us.push(scored); if (scored) { stats.goals++; K.add(10); K.coin(1); K.chime(660, [0, 4, 7, 12]); flash = 1; K.shake(10); } else K.sfx(200, .4, 'triangle', .1, -100); }
    else { match.them.push(scored); if (r === 'SAVED!') { stats.saves++; K.add(15); K.coin(1); K.chime(784, [0, 7, 12]); K.shake(8); } else if (scored) K.sfx(160, .5, 'sawtooth', .08, -80); else K.chime(660, [0, 7]); }
    K.burst(kick === 'us' ? shoot.x(ball.tx) : save.x(ball.tx), kick === 'us' ? shoot.y(ball.ty) : save.y(ball.ty), scored ? ['#fff', '#ffd23f'] : ['#3ddc84', '#fff'], 20, 380);
  }
  GAME.reset = () => {
    keys = {}; ptr = null; res = null; banner = null; flash = 0;
    if (K.bot) { startCup(K.irand(0, 15)); const n = K.irand(0, 3); while (round < n) promote(); startMatch(); return; }
    st = 'pick'; sel = K.save.team ?? 0;
  };
  const pickRect = i => ({ x: 120 + (i % 4) * 270, y: 150 + Math.floor(i / 4) * 120, w: 250, h: 100 });
  GAME.down = (x, y) => {
    if (st === 'pick') { for (let i = 0; i < 16; i++) { const r = pickRect(i); if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) { K.save.team = i; K.persist(); K.sfx(660, .08, 'triangle'); startCup(i); } } return; }
    if (st === 'bracket') { startMatch(); return; }
    if (st === 'post') { if (resT > .8) advance(); return; }
    ptr = { x, y };
    if (kick === 'us' && !shooter.kicked) { aim.hold = true; aim.ht = 0; setAim(x, y); }
    if (kick === 'them') { gloves.tx = x; gloves.ty = y; }
  };
  GAME.move = (x, y) => { if (st !== 'match') return; if (kick === 'us' && aim.hold) setAim(x, y); if (kick === 'them') { gloves.tx = x; gloves.ty = y; } };
  GAME.up = () => { if (st === 'match' && kick === 'us' && aim.hold) { aim.hold = false; strike(); } };
  function setAim(x, y) { aim.x = K.clamp(x - 640, -420, 420); aim.y = K.clamp(392 - y, -20, 300); }
  GAME.key = (c, d) => {
    keys[c] = d;
    if (!d) { if (c === 'Space' && st === 'match' && kick === 'us' && aim.hold) { aim.hold = false; strike(); } return; }
    if (st === 'pick') { if (c === 'ArrowRight') sel = (sel + 1) % 16; if (c === 'ArrowLeft') sel = (sel + 15) % 16; if (c === 'ArrowDown') sel = (sel + 4) % 16; if (c === 'ArrowUp') sel = (sel + 12) % 16; if (c === 'Space' || c === 'Enter') { K.save.team = sel; K.persist(); startCup(sel); } return; }
    if ((c === 'Space' || c === 'Enter') && st === 'bracket') return startMatch();
    if ((c === 'Space' || c === 'Enter') && st === 'post' && resT > .8) return advance();
    if (c === 'Space' && st === 'match' && kick === 'us' && !shooter.kicked && !aim.hold) { aim.hold = true; aim.ht = 0; }
  };
  GAME.bot = dt => {
    if (st === 'bracket') { resT += dt; if (resT > 1.2) { resT = 0; startMatch(); } return; }
    if (st === 'post') { if (resT > 1.5) { if (match.win && round < 3) advance(); else { startCup(K.irand(0, 15)); startMatch(); } } return; }
    if (st !== 'match' || res) return;
    if (kick === 'us' && !shooter.kicked) {
      if (!aim.goal) aim.goal = { x: K.pick([-1, 1]) * K.rand(140, 260), y: K.rand(40, 170), p: K.rand(.35, .7) };
      aim.x += (aim.goal.x - aim.x) * Math.min(1, dt * 4); aim.y += (aim.goal.y - aim.y) * Math.min(1, dt * 4);
      if (!aim.hold && Math.abs(aim.x - aim.goal.x) < 8) { aim.hold = true; aim.ht = 0; }
      if (aim.hold && aim.p >= aim.goal.p && aim.ht < .9) { aim.hold = false; strike(); }
    }
    if (kick === 'them' && ball) { if (ball.t > .12) { gloves.tx = save.x(ball.tx) + (aim.bx ??= K.rand(-140, 140)); gloves.ty = save.y(ball.ty) + (aim.by ??= K.rand(-60, 60)); } }
    else if (kick === 'them') { gloves.tx = 640; gloves.ty = 380; aim.bx = aim.by = undefined; }
  };
  GAME.update = dt => {
    if (flash > 0) flash -= dt;
    if (banner) { banner.t += dt; if (banner.t > 1.2) banner = null; }
    if (st === 'post') resT += dt;
    if (st !== 'match') return;
    if (shooter.kicked) shooter.t += dt;
    if (kick === 'us') {
      if (!K.bot && !shooter.kicked) { const sp = 420 * dt; if (keys.ArrowLeft) aim.x -= sp; if (keys.ArrowRight) aim.x += sp; if (keys.ArrowUp) aim.y += sp; if (keys.ArrowDown) aim.y -= sp; aim.x = K.clamp(aim.x, -420, 420); aim.y = K.clamp(aim.y, -20, 300); }
      if (aim.hold) { aim.ht += dt; aim.p = .5 - .5 * Math.cos(aim.ht * Math.PI / .8); }
    } else {
      if (!K.bot && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].some(k => keys[k])) { gloves.tx = gloves.x + (keys.ArrowRight ? 300 : 0) - (keys.ArrowLeft ? 300 : 0); gloves.ty = gloves.y + (keys.ArrowDown ? 300 : 0) - (keys.ArrowUp ? 300 : 0); }
      if (gloves.tx !== undefined) { const dx = gloves.tx - gloves.x, dy = gloves.ty - gloves.y, d = Math.hypot(dx, dy), mv = Math.min(d, 1500 * dt); if (d > 1) { gloves.x += dx / d * mv; gloves.y += dy / d * mv; } }
      gloves.x = K.clamp(gloves.x, 60, 1220); gloves.y = K.clamp(gloves.y, 90, 640);
      if (!shooter.kicked) { if (shooter.wait > 0) shooter.wait -= dt; else { shooter.t += dt; if (shooter.t > 1) aiShot(); } }
    }
    if (ball && !res) {
      ball.t += dt; ball.r += dt * 14;
      if (kick === 'us') { keeper.delay -= dt; if (keeper.delay < 0) { const dx = keeper.tx - keeper.x, dy = keeper.ty - keeper.y, d = Math.hypot(dx, dy), mv = Math.min(d, keeper.v * dt); if (d > 1) { keeper.x += dx / d * mv; keeper.y += dy / d * mv; } keeper.dive = Math.min(1, keeper.dive + dt * 4); } }
      if (ball.t >= ball.T) settle(kick === 'us' ? judgeShot() : judgeSave());
    }
    if (res) { resT += dt; if (resT > 1.5) nextKick(); }
  };

  /* ---------- drawing ---------- */
  function crowd(g, y0, y1, t) {
    const v = K.view; g.fillStyle = '#0d1420'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, y1 - v.y0);
    const cols = [TEAMS[team ?? 0].kit, match ? TEAMS[match.opp].kit : '#ffd23f', '#e8e2d0', '#2a3550'];
    for (let r = 0; r < 7; r++) for (let i = 0; i < 70; i++) {
      const x = i * 19 + (r % 2) * 9 - 20, y = y0 + r * ((y1 - y0) / 7) + Math.sin(t * 6 + i * .7 + r) * (res === 'GOAL!' || res === 'SAVED!' ? 4 : 1);
      g.fillStyle = cols[(i * 7 + r * 3) % 4]; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill();
      if ((i * 13 + r * 7 + Math.floor(t * 9)) % 97 === 0) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
    }
    g.fillStyle = '#1d2a44'; g.fillRect(v.x0, y1 - 22, v.x1 - v.x0, 22);
    g.fillStyle = '#ffd23f'; g.font = `18px ${FONT}`; g.textAlign = 'center'; for (let i = 0; i < 6; i++) g.fillText('PULSEBOX CUP', (i * 260 + t * 40) % 1560 - 140, y1 - 9);
  }
  function pitch(g, top) {
    const v = K.view;
    for (let i = 0; i < 12; i++) { const y0 = top + Math.pow(i / 12, 1.6) * (v.y1 - top), y1 = top + Math.pow((i + 1) / 12, 1.6) * (v.y1 - top); g.fillStyle = i % 2 ? '#2f9a46' : '#36a84e'; g.fillRect(v.x0, y0, v.x1 - v.x0, y1 - y0 + 1); }
  }
  function player(g, x, y, s, kit, o = {}) {
    g.save(); g.translate(x, y); g.scale(s, s); if (o.rot) g.rotate(o.rot);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, 4, 26, 7, 0, 0, 7); g.fill();
    g.fillStyle = '#f1c7a5'; g.fillRect(-12, -40, 9, 40); g.fillRect(3, -40, 9, 40);
    g.fillStyle = o.shorts || '#ffffff'; g.fillRect(-15, -54, 30, 18);
    g.fillStyle = kit; g.beginPath(); g.roundRect(-18, -96, 36, 46, 8); g.fill();
    if (o.arms) { g.strokeStyle = kit; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(-16, -88); g.lineTo(-16 - o.arms[0], -88 - o.arms[1]); g.moveTo(16, -88); g.lineTo(16 + o.arms[0], -88 - o.arms[1]); g.stroke(); g.fillStyle = o.glove || '#ffd23f'; for (const k of [-1, 1]) { g.beginPath(); g.arc(k * (16 + o.arms[0]), -88 - o.arms[1], 8, 0, 7); g.fill(); } }
    g.fillStyle = '#f1c7a5'; g.beginPath(); g.arc(0, -108, 13, 0, 7); g.fill();
    g.fillStyle = o.hair || '#2a1a10'; g.beginPath(); g.arc(0, -112, 13, Math.PI, 0); g.fill();
    if (o.num) { g.fillStyle = '#fff'; g.font = `24px ${FONT}`; g.textAlign = 'center'; g.fillText(o.num, 0, -64); }
    g.restore();
  }
  function scoreboard(g) {
    const rows = [[team, match.us], [match.opp, match.them]];
    g.fillStyle = 'rgba(5,10,20,.85)'; g.beginPath(); g.roundRect(66, 14, 440, 92, 14); g.fill();
    rows.forEach(([t, k], r) => {
      const y = 26 + r * 40; flag(g, TEAMS[t], 80, y, 40, 28);
      g.fillStyle = '#fff'; g.font = `26px ${FONT}`; g.textAlign = 'left'; g.fillText(TEAMS[t].n.toUpperCase(), 130, y + 23);
      const n = Math.max(5, k.length);
      for (let i = 0; i < n; i++) { const x = 296 + i * 34 - Math.max(0, n - 6) * 34; if (x < 286) continue; g.fillStyle = i < k.length ? (k[i] ? '#3ddc84' : '#ff4d5a') : 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(x, y + 14, 12, 0, 7); g.fill(); if (i < k.length) { g.fillStyle = '#fff'; g.font = '800 14px Nunito'; g.textAlign = 'center'; g.fillText(k[i] ? '✓' : '✕', x, y + 19); } }
    });
    g.fillStyle = 'rgba(5,10,20,.85)'; g.beginPath(); g.roundRect(1040, 14, 220, 50, 14); g.fill(); g.fillStyle = '#ffd23f'; g.font = `28px ${FONT}`; g.textAlign = 'center'; g.fillText(ROUNDS[round].toUpperCase(), 1150, 48);
  }
  function drawShoot(g, t) {
    crowd(g, -40, 210, t); pitch(g, 210);
    // goal + net
    const L = shoot.x(-GW), R = shoot.x(GW), T_ = shoot.y(GH), B = shoot.y(0);
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(L + 30, T_ - 30, R - L - 60, B - T_ + 30);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5;
    for (let x = L; x <= R; x += 24) { g.beginPath(); g.moveTo(x, T_); g.lineTo(x + (x - 640) * -.08, T_ - 30); g.lineTo(x + (x - 640) * -.08, B - 4); g.stroke(); }
    for (let y = T_; y <= B; y += 20) { g.beginPath(); g.moveTo(L + 30, y - 30 * (1 - (y - T_) / (B - T_))); g.lineTo(R - 30, y - 30 * (1 - (y - T_) / (B - T_))); g.stroke(); }
    g.strokeStyle = '#fff'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(L, B); g.lineTo(L, T_); g.lineTo(R, T_); g.lineTo(R, B); g.stroke(); g.lineCap = 'butt';
    // pitch markings
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 4; g.beginPath(); g.moveTo(K.view.x0, B + 2); g.lineTo(K.view.x1, B + 2); g.stroke();
    g.beginPath(); g.moveTo(200, B + 2); g.lineTo(80, 560); g.lineTo(1200, 560); g.lineTo(1080, B + 2); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(640, 642, 10, 4, 0, 0, 7); g.fill();
    // keeper
    const opp = TEAMS[match.opp], kx = shoot.x(keeper.x), ky = shoot.y(keeper.y), dv = keeper.dive, side = Math.sign(keeper.tx || 1);
    player(g, kx, B - Math.max(0, keeper.y - 60) * .6 + 0, 1.25, '#ffd23f', { arms: [18 + dv * 30, 30 + dv * 20], glove: '#fff', rot: dv * side * Math.min(1.3, Math.abs(keeper.tx) / 180), shorts: opp.kit, hair: '#1a1a1a' });
    // ball
    if (ball) {
      const k = Math.min(1, ball.t / ball.T), bx = K.lerp(640, shoot.x(ball.tx), k), by = K.lerp(630, shoot.y(ball.ty), k) - Math.sin(k * Math.PI) * 40, r = K.lerp(22, 10, k);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(bx, K.lerp(640, B, k), r, r * .35, 0, 0, 7); g.fill();
      if (res === 'GOAL!') { const n = Math.min(1, resT * 4); drawBall(g, bx, by - n * 4, r, ball.r); } else drawBall(g, bx, by, r, ball.r);
    } else drawBall(g, 640, 630, 22, 0);
    // our striker from behind
    const me = TEAMS[team], run = shooter.kicked ? Math.min(1, shooter.t * 6) : 0;
    player(g, 560 + run * 50, 760 - run * 40, 2.2, me.kit, { num: '10', shorts: me.c[me.c.length - 1] === me.kit ? '#fff' : me.c[me.c.length - 1] });
    // aim + power
    if (!shooter.kicked) {
      const ax = shoot.x(aim.x), ay = shoot.y(aim.y);
      g.setLineDash([8, 10]); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(640, 620); g.quadraticCurveTo((640 + ax) / 2, (620 + ay) / 2 - 60, ax, ay); g.stroke(); g.setLineDash([]);
      const er = 8 + aim.p * aim.p * 80;
      g.strokeStyle = aim.p > .75 ? '#ff4d5a' : '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.arc(ax, ay, 14 + er * .9, 0, 7); g.stroke(); g.beginPath(); g.arc(ax, ay, 5, 0, 7); g.fillStyle = '#fff'; g.fill();
      g.fillStyle = 'rgba(5,10,20,.8)'; g.beginPath(); g.roundRect(1150, 300, 50, 300, 12); g.fill();
      const pg = g.createLinearGradient(0, 600, 0, 300); pg.addColorStop(0, '#3ddc84'); pg.addColorStop(.6, '#ffd23f'); pg.addColorStop(1, '#ff4d5a'); g.fillStyle = pg; g.fillRect(1160, 590 - aim.p * 280, 30, aim.p * 280);
      g.fillStyle = '#fff'; g.font = `22px ${FONT}`; g.textAlign = 'center'; g.fillText('POWER', 1175, 625);
      if (!K.bot && !aim.hold) { g.font = BODY; g.fillStyle = '#fff'; g.fillText('Hold on the goal to aim · release to shoot', 640, 700); }
    }
  }
  function drawSave(g, t) {
    crowd(g, -60, 330, t); pitch(g, 330);
    const opp = TEAMS[match.opp];
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.beginPath(); g.moveTo(K.view.x0, 600); g.lineTo(K.view.x1, 600); g.stroke();
    g.beginPath(); g.moveTo(330, 345); g.lineTo(950, 345); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(640, 452, 8, 3, 0, 0, 7); g.fill();
    // shooter running up
    const k = shooter.kicked ? 1 : Math.min(1, shooter.t), sx = K.lerp(560, 628, k), sy = K.lerp(420, 455, k);
    player(g, sx, sy, .9 + k * .15, opp.kit, { num: '9', shorts: '#fff' });
    // ball
    if (ball) {
      const kk = Math.min(1, ball.t / ball.T), e = kk * kk, bx = K.lerp(640, save.x(ball.tx), e), by = K.lerp(448, save.y(ball.ty), e) - Math.sin(kk * Math.PI) * 30, r = K.lerp(8, 44, e);
      drawBall(g, bx, by, r, ball.r);
    } else drawBall(g, 640, 448, 8, 0);
    // goal frame around us
    g.strokeStyle = '#fff'; g.lineWidth = 26; g.beginPath(); g.moveTo(save.x(-GW), 720); g.lineTo(save.x(-GW), save.y(GH)); g.lineTo(save.x(GW), save.y(GH)); g.lineTo(save.x(GW), 720); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 6; g.beginPath(); g.moveTo(save.x(-GW) + 10, 720); g.lineTo(save.x(-GW) + 10, save.y(GH) + 10); g.lineTo(save.x(GW) - 10, save.y(GH) + 10); g.lineTo(save.x(GW) - 10, 720); g.stroke();
    // gloves
    const gx = gloves.x, gy = gloves.y;
    for (const s of [-1, 1]) {
      g.save(); g.translate(gx + s * 46, gy); g.rotate(s * .25);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.roundRect(-28, -36, 60, 80, 18); g.fill();
      g.fillStyle = '#ffd23f'; g.beginPath(); g.roundRect(-30, -40, 60, 80, 18); g.fill();
      g.fillStyle = TEAMS[team].kit; g.fillRect(-30, 22, 60, 18);
      g.fillStyle = '#ffe680'; for (let i = 0; i < 4; i++) g.fillRect(-24 + i * 14, -54, 10, 30);
      g.restore();
    }
    if (!K.bot && !shooter.kicked) { g.font = BODY; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('Move your gloves to the ball', 640, 700); }
  }
  function drawPick(g) {
    const v = K.view; g.fillStyle = '#0b2a16'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.fillStyle = '#fff'; g.font = `64px ${FONT}`; g.textAlign = 'center'; g.fillText('CHOOSE YOUR NATION', 640, 100);
    TEAMS.forEach((t, i) => {
      const r = pickRect(i), on = i === sel;
      g.fillStyle = on ? '#ffd23f' : 'rgba(255,255,255,.08)'; g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, 14); g.fill();
      flag(g, t, r.x + 16, r.y + 22, 80, 56);
      g.fillStyle = on ? '#0b2a16' : '#fff'; g.font = `30px ${FONT}`; g.textAlign = 'left'; g.fillText(t.n.toUpperCase(), r.x + 110, r.y + 50);
      g.font = '800 14px Nunito'; g.fillText('★'.repeat(1 + Math.round(t.rate * 4)), r.x + 110, r.y + 74);
    });
  }
  function drawBracket(g) {
    const v = K.view; g.fillStyle = '#0b2a16'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.fillStyle = '#fff'; g.font = `56px ${FONT}`; g.textAlign = 'center'; g.fillText(`${ROUNDS[round].toUpperCase()}`, 640, 70);
    for (let r = 0; r <= round; r++) {
      const col = bracket[r], hgt = 560 / col.length;
      col.forEach((ti, i) => {
        const x = 70 + r * 290, y = 110 + i * hgt + hgt / 2 - 16, me = ti === team, out = r < round && !bracket[r + 1].includes(ti);
        g.globalAlpha = out ? .35 : 1; g.fillStyle = me ? '#ffd23f' : 'rgba(255,255,255,.1)'; g.beginPath(); g.roundRect(x, y, 230, 32, 8); g.fill();
        flag(g, TEAMS[ti], x + 6, y + 5, 32, 22); g.fillStyle = me ? '#0b2a16' : '#fff'; g.font = `22px ${FONT}`; g.textAlign = 'left'; g.fillText(TEAMS[ti].n.toUpperCase(), x + 46, y + 24); g.globalAlpha = 1;
      });
    }
    g.fillStyle = '#ffd23f'; g.font = `40px ${FONT}`; g.textAlign = 'center'; g.fillText(`${TEAMS[team].n.toUpperCase()}  vs  ${TEAMS[opponent()].n.toUpperCase()}`, 1000, 640);
    g.fillStyle = '#fff'; g.font = BODY; g.fillText('Tap or press Space to kick off', 1000, 680);
    // trophy
    g.save(); g.translate(1080, 330); const s = 1 + Math.sin(K.t * 2) * .03; g.scale(s, s); g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(-60, -120); g.lineTo(60, -120); g.quadraticCurveTo(60, -20, 12, 0); g.lineTo(12, 50); g.lineTo(40, 70); g.lineTo(-40, 70); g.lineTo(-12, 50); g.lineTo(-12, 0); g.quadraticCurveTo(-60, -20, -60, -120); g.fill(); g.fillStyle = '#a06a00'; g.fillRect(-50, 70, 100, 30); g.restore();
  }
  GAME.draw = g => {
    const t = K.t;
    if (st === 'pick') return drawPick(g);
    if (st === 'bracket') return drawBracket(g);
    if (kick === 'us') drawShoot(g, t); else drawSave(g, t);
    scoreboard(g);
    if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash * .25})`; g.fillRect(K.view.x0, K.view.y0, K.view.x1 - K.view.x0, K.view.y1 - K.view.y0); }
    const txt = res || (banner && banner.s), k = res ? resT : banner ? banner.t : 0;
    if (txt) {
      const good = res ? (kick === 'us' ? res === 'GOAL!' : res !== 'GOAL!') : true, sc = k < .15 ? k / .15 : 1;
      g.save(); g.translate(640, 300); g.scale(sc, sc); g.rotate(-.04); g.globalAlpha = k > 1.1 ? Math.max(0, 1 - (k - 1.1) / .3) : 1;
      g.font = `${res ? 120 : 80}px ${FONT}`; g.textAlign = 'center'; g.lineWidth = 14; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText(txt, 0, 30);
      g.fillStyle = !res ? '#fff' : good ? '#ffd23f' : '#ff4d5a'; g.fillText(txt, 0, 30); g.restore();
    }
    if (st === 'post') {
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(K.view.x0, K.view.y0, K.view.x1 - K.view.x0, K.view.y1 - K.view.y0);
      const gu = match.us.filter(Boolean).length, gt = match.them.filter(Boolean).length;
      g.textAlign = 'center'; g.fillStyle = match.win ? '#ffd23f' : '#ff4d5a'; g.font = `110px ${FONT}`; g.fillText(match.win ? (round === 3 ? 'CHAMPIONS!' : 'YOU WIN!') : 'KNOCKED OUT', 640, 300);
      g.fillStyle = '#fff'; g.font = `60px ${FONT}`; g.fillText(`${TEAMS[team].n.toUpperCase()} ${gu} – ${gt} ${TEAMS[match.opp].n.toUpperCase()}`, 640, 390);
      if (resT > .8) { g.font = BODY; g.fillText(match.win && round < 3 ? `Tap to play the ${ROUNDS[round + 1]}` : 'Tap to continue', 640, 460); }
    }
  };
})();
