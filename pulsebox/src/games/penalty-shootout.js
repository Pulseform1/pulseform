/* Penalty Shootout: a stadium seen from behind the penalty spot. Swipe to shoot: where you let go is where it goes, a faster
   swipe hits harder (and wilder), a bent swipe curls the ball, a slow little flick chips it. When they shoot, tap where to
   dive. Modes: the World Cup (16 nations, knockout), Survival (score until you miss, the keeper gets better every goal),
   Target Practice and 2 Players on one device. Coins buy skills: power, accuracy, curve and keeper reflexes. */
const GAME = {
  id: 'penalty-shootout', title: 'Penalty Shootout', tagline: 'Swipe. Curl. Dive. Win the cup!',
  font: 'Bebas Neue', accent: '#ffd23f', accent2: '#3ddc84', bg: '#0b2a16', noHud: true, scoreLabel: 'Score',
  how: ['Shooting: swipe from the ball to the spot in the goal. Faster swipe = harder shot. Bend your swipe to curl it. A slow, short flick chips the keeper.', 'Saving: tap (or click) where you want your keeper to dive. Watch the ball, not the kicker.', 'Keyboard: arrows aim, A/D curl, hold Space to charge and let go to shoot. When saving, arrows aim the dive and Space dives.'],
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
  const FD = '"Bebas Neue", Impact, sans-serif', FB = s => `800 ${s}px Nunito, system-ui, sans-serif`, fd = s => `${s}px ${FD}`;
  const SKILLS = [['power', 'Power', 'Harder shots at full swipe'], ['acc', 'Accuracy', 'Less spray on big shots'], ['curve', 'Curl', 'More bend on curled shots'], ['reflex', 'Reflexes', 'Your keeper dives faster']];
  const SKCOST = [40, 90, 170, 280, 450];
  const HW = 3.66, GH = 2.44, SPOT = 11;
  // the camera stands behind the penalty spot
  const CAM = { x: 0, y: 1.45, z: 16.5 }, FOC = 1250, HZ = 330;
  const P = (x, y, z) => { const d = Math.max(.3, CAM.z - z), k = FOC / d; return [640 + (x - CAM.x) * k, HZ - (y - CAM.y) * k, k]; };
  const unP = (sx, sy, z = 0) => { const d = CAM.z - z, k = FOC / d; return [(sx - 640) / k + CAM.x, (HZ - sy) / k + CAM.y]; };
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  let st = 'menu', mode = 'cup', team = 0, bracket, round, match, kick, ball, keeper, kicker, res, resT, swipe, aimK, banner, flash, shake, conf, hover, B = {}, slow, net, crowdJ, sv;
  const SV = () => K.save.ps || (K.save.ps = { sk: { power: 0, acc: 0, curve: 0, reflex: 0 }, best: { survival: 0, targets: 0 }, cups: 0 });
  const sk = k => SV().sk[k] || 0;

  /* ---------- flags and the ball ---------- */
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

  /* ---------- matches and modes ---------- */
  const oppRate = () => mode === 'cup' ? Math.min(.95, TEAMS[match.opp].rate + round * .1) : mode === 'survival' ? Math.min(.95, .35 + match.streak * .05) : .5;
  function startCup(t) {
    team = t; const others = TEAMS.map(x => x.i).filter(i => i !== t); for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
    const slot = K.irand(0, 7) * 2; bracket = [others.slice(0, 15)]; bracket[0].splice(slot, 0, t); round = 0; st = 'bracket'; resT = 0;
  }
  const opponent = () => { const r = bracket[round], i = r.indexOf(team); return r[i ^ 1]; };
  function startMatch(m) {
    mode = m; match = { us: [], them: [], opp: m === 'cup' ? opponent() : (team + 5) % 16, n: 0, streak: 0, pts: 0, shots: 0, p: 0 };
    st = 'match'; kick = 'us'; setup();
  }
  function setup() {
    ball = { x: 0, y: .11, z: SPOT, t: 0, fly: false, spin: 0, trail: [] }; res = null; resT = 0; swipe = null; slow = 0; net = null;
    keeper = { x: 0, tx: 0, ty: 1, p: 0, dive: false, t: 0, rate: kick === 'them' || mode === 'duo' ? 0 : oppRate() };
    kicker = { run: kick === 'them' && mode !== 'duo' ? 0 : -1, t: 0, kit: kick === 'us' ? TEAMS[team].kit : mode === 'duo' ? '#e8e8e8' : TEAMS[match.opp].kit };
    aimK = { x: 0, y: 1.2, curve: 0, charge: 0, hold: false, tgt: null };
    if (mode === 'targets') { keeper.rate = .2; match.tg = [[-3.05, 2.05, .42, 50], [3.05, 2.05, .42, 50], [-3, .4, .5, 25], [3, .4, .5, 25], [0, 2.1, .4, 10]].map(([x, y, r, v]) => ({ x, y, r, v, hit: 0 })); }
    banner = { s: mode === 'duo' ? `PLAYER ${kick === 'us' ? 1 : 2} SHOOTS` : kick === 'us' ? 'YOUR KICK' : 'SAVE IT!', t: 0 };
  }
  function decided() {
    const u = match.us.filter(Boolean).length, t = match.them.filter(Boolean).length, nu = match.us.length, nt = match.them.length;
    if (nu <= 5 && nt <= 5) { if (u + (5 - nu) < t) return 'them'; if (t + (5 - nt) < u) return 'us'; if (nu === 5 && nt === 5 && u !== t) return u > t ? 'us' : 'them'; return null; }
    if (nu === nt && u !== t) return u > t ? 'us' : 'them'; return null;
  }
  function settle(r) {
    res = r; resT = 0; const goal = r === 'GOAL!';
    if (mode === 'targets') { match.shots++; }
    else if (mode === 'survival') { if (goal) { match.streak++; K.add(10 + match.streak * 2); K.coin(1); } }
    else { (kick === 'us' ? match.us : match.them).push(goal); match.n++; if (kick === 'us' && goal && mode === 'cup') { K.add(10); K.coin(1); } if (kick === 'them' && !goal && mode === 'cup') { K.add(10); K.coin(1); } }
    const ours = kick === 'us' ? goal : !goal;
    if (ours) { flash = 1; crowdJ = 1.4; if (goal) confetti(); K.sfx(523, .1, 'square', .07); K.chime(659, [0, 4, 7, 12]); } else { K.sfx(140, .4, 'sawtooth', .06, -60); }
    if (r === 'POST!' || r === 'BAR!') { K.sfx(1800, .25, 'triangle', .1, -600); shake = 8; }
  }
  function next() {
    if (mode === 'targets') { if (match.shots >= 10) return finish(); return setup(); }
    if (mode === 'survival') { if (res !== 'GOAL!') return finish(); return setup(); }
    const d = decided();
    if (d) { match.win = d === 'us'; st = 'post'; resT = 0; if (mode === 'cup') { if (match.win) { K.add(50); K.coin(5); } } return; }
    kick = kick === 'us' ? 'them' : 'us'; setup();
  }
  function finish() {
    const s = SV();
    if (mode === 'survival') { s.best.survival = Math.max(s.best.survival, match.streak); K.persist(); K.over({ title: `${match.streak} in a row`, text: `The keeper caught up with you. Best streak: ${s.best.survival}.`, delay: 300 }); }
    if (mode === 'targets') { s.best.targets = Math.max(s.best.targets, match.pts); K.add(match.pts); K.coin(Math.floor(match.pts / 40)); K.persist(); K.over({ title: `${match.pts} points`, text: `Target practice done. Best: ${s.best.targets}.`, delay: 300 }); }
    st = 'done';
  }
  function afterMatch() {
    if (mode === 'duo') { const u = match.us.filter(Boolean).length, t = match.them.filter(Boolean).length; return K.over({ title: match.win ? 'Player 1 wins!' : 'Player 2 wins!', text: `Final score ${u} - ${t} on penalties.`, delay: 100 }); }
    if (!match.win) return K.over({ title: 'Knocked out', text: `${TEAMS[team].n} went out in the ${ROUNDS[round]}. Try again!`, delay: 100 });
    if (round === 3) { SV().cups++; K.persist(); K.coin(25); return K.over({ title: 'CHAMPIONS!', text: `${TEAMS[team].n} won the Pulsebox Cup! Cups won: ${SV().cups}.`, delay: 100 }); }
    const r = bracket[round], nx = []; for (let i = 0; i < r.length; i += 2) nx.push(r[i] === team || r[i + 1] === team ? team : (Math.random() < .5 + (TEAMS[r[i]].rate - TEAMS[r[i + 1]].rate) * .6 ? r[i] : r[i + 1]));
    bracket.push(nx); round++; st = 'bracket'; resT = 0;
  }

  /* ---------- shooting ---------- */
  function shoot(tx, ty, power, curve) {
    if (ball.fly) return;
    const pw = clamp(power, .12, 1), acc = 1 - sk('acc') * .13, err = (Math.pow(pw, 2.2) * .95 + .08) * acc, chip = pw < .3 && ty < 2.2;
    tx += (Math.random() - .5) * 2 * err; ty += (Math.random() - .5) * 1.6 * err;
    const speed = chip ? 11 + pw * 6 : 17 + pw * (14 + sk('power') * 1.6);
    Object.assign(ball, { fly: true, t: 0, T: Math.hypot(SPOT, tx) / speed, tx, ty: Math.max(.11, ty), curve: curve * (1 + sk('curve') * .25), loft: chip ? 1.6 : Math.max(0, .25 - pw * .2), chip, sp: speed });
    kicker.run = 2; K.sfx(120, .12, 'square', .1, -40); K.noise && K.noise(.08, .12, 400);
    // the keeper reads it, or guesses
    const R = keeper.rate; if (R > 0) { const read = Math.random() < R * (chip ? .4 : 1) * (1 - pw * .35); const gx = read ? tx + rnd(-.7, .7) : (Math.random() < .5 ? -1 : 1) * rnd(1.4, 3.2); keeper.plan = { x: clamp(gx, -3.4, 3.4), y: read ? clamp(ty + rnd(-.4, .4), .3, 2.2) : rnd(.4, 1.8), at: rnd(.08, .2) * (1.4 - R * .6) }; if (chip && Math.random() < .7) keeper.plan.x = (Math.random() < .5 ? -1 : 1) * rnd(1.8, 3); }
    if (mode === 'duo') keeper.plan = null;
  }
  function aiShoot() {
    const R = oppRate(), side = Math.random() < .5 ? -1 : 1, corner = Math.random() < .4 + R * .4;
    let tx = corner ? side * rnd(2.3, 3.3) : rnd(-1.6, 1.6), ty = Math.random() < .5 ? rnd(.25, .8) : rnd(1.2, 2.2), pw = rnd(.45, .7) + R * .3, cv = rnd(-.4, .4);
    if (Math.random() < .05) { tx = rnd(-.3, .3); ty = 1.6; pw = .2; }
    const save = SV().sk; SV().sk = { power: 0, acc: 0, curve: 0, reflex: save.reflex }; shoot(tx, ty, pw, cv); SV().sk = save;
  }
  function dive(tx, ty) {
    if (keeper.dive) return; keeper.dive = true; keeper.t = 0; keeper.tx = clamp(tx, -3.4, 3.4); keeper.ty = clamp(ty, .25, 2.3); keeper.dur = .42 - sk('reflex') * .035;
    K.sfx(260, .08, 'triangle', .05, -80);
  }
  const ballAt = s => { const x = ball.tx * s + ball.curve * 4 * s * (1 - s), y = .11 + (ball.ty - .11) * s + ball.loft * 4 * s * (1 - s), z = SPOT * (1 - s); return [x, y, z]; };
  // where are the keeper's hands and body
  function keeperReach(bx, by) {
    const p = keeper.dive ? clamp(keeper.t / keeper.dur, 0, 1) : 0, e = 1 - Math.pow(1 - p, 2);
    const cx = keeper.x + (keeper.tx - keeper.x) * e * .55, cy = 1 + (keeper.ty - 1) * e * .55, hx = keeper.x + (keeper.tx - keeper.x) * e, hy = 1.75 + (keeper.ty - 1.75) * e;
    const seg = (ax, ay, bx2, by2) => { const vx = bx2 - ax, vy = by2 - ay, l = vx * vx + vy * vy || 1, t = clamp(((bx - ax) * vx + (by - ay) * vy) / l, 0, 1); return Math.hypot(bx - ax - vx * t, by - ay - vy * t); };
    const feet = [keeper.x + (keeper.tx - keeper.x) * e * .2, keeper.dive ? .2 + e * .3 : 0];
    return Math.min(seg(feet[0], feet[1], cx, cy) - .32, seg(cx, cy, hx, hy) - .3, Math.hypot(bx - hx, by - hy) - .32);
  }
  function stepBall(dt) {
    if (!ball.fly || ball.done) return;
    const was = ball.t; ball.t += dt / ball.T; ball.spin += dt * ball.sp;
    // slow motion for close calls
    if (was < .85 && ball.t >= .85 && keeper.dive && Math.abs(keeperReach(...ballAt(1).slice(0, 2))) < .5) slow = .6;
    if (ball.t >= 1 && !ball.cross) {
      ball.cross = 1; const [x, y] = ballAt(1), inside = Math.abs(x) < HW - .11 && y < GH - .11;
      const post = Math.abs(Math.abs(x) - HW) < .2 && y < GH + .1, bar = Math.abs(y - GH) < .18 && Math.abs(x) < HW + .1;
      if (mode === 'targets' && inside) { const tg = match.tg.find(t => Math.hypot(t.x - x, t.y - y) < t.r + .11); if (tg && keeperReach(x, y) > 0) { tg.hit = 1; match.pts += tg.v; K.pop && K.pop(...P(x, y, 0).slice(0, 2), `+${tg.v}`, '#ffd23f', 44); } }
      if (inside && keeperReach(x, y) > 0) { ball.after = { vx: (x - ballAt(.98)[0]) * 30, vy: -1, vz: -6 }; net = { x, y, t: 0 }; settle('GOAL!'); }
      else if (inside || keeperReach(x, y) <= 0) { ball.after = { vx: rnd(-5, 5) + Math.sign(x || 1) * 3, vy: rnd(2, 5), vz: 7 }; settle(inside || Math.abs(x) < HW + .5 ? 'SAVED!' : 'MISS!'); K.shake(6); }
      else if (post || bar) { ball.after = { vx: -Math.sign(x) * rnd(1, 3), vy: post ? 1 : 3, vz: 8 }; settle(post ? 'POST!' : 'BAR!'); }
      else { ball.after = { vx: (x - ballAt(.98)[0]) * 30, vy: 0, vz: -8 }; settle(y > GH ? 'OVER!' : 'WIDE!'); }
    }
    const [x, y, z] = ball.t <= 1 ? ballAt(Math.min(1, ball.t)) : [ball.x, ball.y, ball.z];
    if (ball.t > 1 && ball.after) { const a = ball.after; ball.x += a.vx * dt; ball.y = Math.max(.11, ball.y + a.vy * dt); a.vy -= 9.8 * dt; ball.z += a.vz * dt; if (res === 'GOAL!' && ball.z < -1.6) { ball.z = -1.6; a.vz = 0; a.vx *= .5; } if (ball.y <= .11) { a.vy = Math.abs(a.vy) * .4; a.vx *= .8; a.vz *= .8; } }
    else { ball.x = x; ball.y = y; ball.z = z; }
    ball.trail.push([ball.x, ball.y, ball.z]); if (ball.trail.length > 14) ball.trail.shift();
  }

  /* ---------- input ---------- */
  const canShoot = () => (kick === 'us' || mode === 'duo') && !ball.fly;
  GAME.down = (x, y) => {
    K.audio && K.audio();
    if (st === 'menu' || st === 'skills' || st === 'pick' || st === 'bracket' || st === 'post') return click(x, y);
    if (st !== 'match' || res) return;
    if (canShoot()) { swipe = { pts: [[x, y, performance.now()]] }; return; }
    if (kick === 'them' || (mode === 'duo' && ball.fly)) { const [tx, ty] = unP(x, y, 0); dive(tx, ty); }
  };
  GAME.move = (x, y) => {
    hover = null; for (const k in B) { const b = B[k]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) hover = k; }
    if (swipe) { swipe.pts.push([x, y, performance.now()]); if (swipe.pts.length > 60) swipe.pts.splice(1, 1); }
  };
  GAME.up = (x, y) => {
    if (!swipe || st !== 'match') { swipe = null; return; }
    const pts = swipe.pts; pts.push([x, y, performance.now()]); swipe = null;
    const [x0, y0, t0] = pts[0], len = Math.hypot(x - x0, y - y0); if (len < 30 || y > y0 - 15) return;
    const dt = Math.max(.05, (performance.now() - t0) / 1000), speed = len / dt;
    // the bend: the furthest the swipe strays from its straight line
    let dev = 0; const ux = (x - x0) / len, uy = (y - y0) / len; for (const [px, py] of pts) { const d = (px - x0) * uy - (py - y0) * ux; if (Math.abs(d) > Math.abs(dev)) dev = d; }
    const [tx, ty] = unP(x, Math.min(y, 440), 0);
    shoot(tx, ty, speed / 2600, clamp(-dev / 90, -1.4, 1.4));
  };
  GAME.key = (c, d) => {
    if (st !== 'match') { if (d && (c === 'Space' || c === 'Enter')) click(-1, -1, true); return; }
    if (res) return;
    const A = aimK;
    if (canShoot()) {
      if (c === 'Space') { if (d) A.hold = true; else if (A.hold) { A.hold = false; shoot(A.x, A.y, .2 + A.charge * .8, A.curve); A.charge = 0; } }
      if (d && c === 'KeyA') A.curve = clamp(A.curve - .5, -1.5, 1.5); if (d && c === 'KeyD') A.curve = clamp(A.curve + .5, -1.5, 1.5);
    } else if ((kick === 'them' || mode === 'duo') && d && c === 'Space') dive(A.x, A.y);
    if (d && c === 'ArrowLeft') A.x = clamp(A.x - .8, -3.3, 3.3); if (d && c === 'ArrowRight') A.x = clamp(A.x + .8, -3.3, 3.3); if (d && c === 'ArrowUp') A.y = clamp(A.y + .55, .3, 2.2); if (d && c === 'ArrowDown') A.y = clamp(A.y - .55, .3, 2.2);
  };
  function click(x, y, enter) {
    const hit = k => B[k] && x >= B[k].x && x <= B[k].x + B[k].w && y >= B[k].y && y <= B[k].y + B[k].h;
    if (st === 'menu') { if (hit('cup') || enter) { st = 'pick'; return; } if (hit('survival')) { team = SV().team ?? 0; startMatch('survival'); return; } if (hit('targets')) { team = SV().team ?? 0; startMatch('targets'); return; } if (hit('duo')) { team = 0; startMatch('duo'); return; } if (hit('skills')) { st = 'skills'; return; } return; }
    if (st === 'skills') { for (const [k] of SKILLS) if (hit('sk' + k)) { const lv = sk(k); if (lv >= 5) return; const c = SKCOST[lv]; if (K.save.coins < c) { K.sfx(150, .2, 'square', .06); return; } K.save.coins -= c; SV().sk[k] = lv + 1; K.persist(); K.chime(659, [0, 4, 7]); return; } if (hit('back') || enter) st = 'menu'; return; }
    if (st === 'pick') { for (let i = 0; i < 16; i++) if (hit('t' + i)) { SV().team = i; K.persist(); startCup(i); return; } if (hit('back')) st = 'menu'; return; }
    if (st === 'bracket') { if (resT > .4) startMatch('cup'); return; }
    if (st === 'post') { if (resT > .8) afterMatch(); }
  }

  /* ---------- update ---------- */
  GAME.reset = () => { st = K.bot ? 'match' : 'menu'; shake = 0; flash = 0; crowdJ = 0; conf = []; if (K.bot) { team = K.irand(0, 15); startCup(team); startMatch('cup'); } };
  GAME.update = dt => {
    if (slow > 0) { slow -= dt; dt *= .3; }
    resT = (resT || 0) + dt; if (banner) { banner.t += dt; if (banner.t > 1.3) banner = null; }
    flash = Math.max(0, (flash || 0) - dt * 2); shake = Math.max(0, (shake || 0) - dt * 20); crowdJ = Math.max(0, (crowdJ || 0) - dt);
    for (const c of conf) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; c.r += c.vr * dt; } conf = conf.filter(c => c.y < 760);
    if (st !== 'match') return;
    if (aimK.hold) aimK.charge = Math.min(1, aimK.charge + dt * .9);
    if (kick === 'them' && kicker.run >= 0 && kicker.run < 2 && !banner) { kicker.run += dt / 1.1; if (kicker.run >= 1 && !ball.fly) aiShoot(); }
    if (keeper.plan && ball.fly) { if (ball.t * ball.T > keeper.plan.at) { dive(keeper.plan.x, keeper.plan.y); keeper.plan = null; } }
    if (keeper.dive) keeper.t += dt; else keeper.x = Math.sin(K.t * 1.6) * .25;
    if (net) net.t += dt;
    stepBall(dt);
    if (res && resT > 1.6) next();
  };
  function confetti() { const t = kick === 'us' ? TEAMS[team] : TEAMS[match.opp]; for (let i = 0; i < 80; i++) conf.push({ x: rnd(0, 1280), y: rnd(-200, 0), vx: rnd(-60, 60), vy: rnd(0, 200), r: rnd(0, 6), vr: rnd(-8, 8), c: K.pick(t.c) }); }
  GAME.bot = dt => {
    if (st !== 'match' || res) return;
    if (kick === 'us' && !ball.fly && (sv = (sv || 0) + dt) > .9) { sv = 0; shoot((Math.random() < .5 ? -1 : 1) * rnd(1.5, 3.2), rnd(.3, 2), rnd(.45, .85), rnd(-1, 1)); }
    if (kick === 'them' && ball.fly && !keeper.dive && ball.t > .3) dive(Math.random() < .55 ? ball.tx : -ball.tx, ball.ty);
  };

  /* ---------- drawing: the stadium ---------- */
  const fans = Array.from({ length: 1500 }, (_, i) => ({ x: (i * 97) % 1320 - 20, row: Math.floor(i / 75), c: i % 7, ph: Math.random() * 6 }));
  function stadium(g, t) {
    const v = K.view, sky = g.createLinearGradient(0, 0, 0, 260); sky.addColorStop(0, '#060a1a'); sky.addColorStop(1, '#1a2448'); g.fillStyle = sky; g.fillRect(v.x0, 0, v.x1 - v.x0, 260);
    // floodlights
    for (const X of [330, 950]) { g.save(); g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(X, 20, 0, X, 20, 260); gl.addColorStop(0, 'rgba(255,250,220,.35)'); gl.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = gl; g.fillRect(X - 260, 0, 520, 320); g.restore(); }
    // stands: rows of fans, each team's colors on its side
    const home = mode === 'duo' ? TEAMS[0] : TEAMS[team], away = mode === 'duo' ? TEAMS[3] : TEAMS[match ? match.opp : 1];
    for (let r = 0; r < 20; r++) { const y = 56 + r * 15, sh = .5 + r * .025; g.fillStyle = `rgba(14,18,36,${.9 - r * .02})`; g.fillRect(v.x0, y - 8, v.x1 - v.x0, 15);
      for (const f of fans) { if (f.row !== r) continue; const side = f.x < 640 ? home : away, cols = [...side.c, '#e8e8e8', '#222', side.kit], jump = crowdJ > 0 && f.c % 2 ? -Math.abs(Math.sin(t * 14 + f.ph)) * 5 * crowdJ : Math.sin(t * 2 + f.ph) * .6;
        g.globalAlpha = sh; g.fillStyle = cols[f.c % cols.length]; g.fillRect(f.x, y - 4 + jump, 9, 9); g.fillStyle = '#e8c09a'; g.fillRect(f.x + 2, y - 9 + jump, 5, 5); } }
    g.globalAlpha = 1;
    // LED boards behind the goal
    const [, by] = P(0, 1, -5), [, by2] = P(0, 0, -5); g.fillStyle = '#0a0e1c'; g.fillRect(v.x0, by, v.x1 - v.x0, by2 - by);
    const ads = ['PULSEBOX CUP', 'FLOP HOOPS', 'CLUCK LAUNCH', 'STRATA', 'DEAD AIR'], off = (t * 40) % 300;
    g.save(); g.beginPath(); g.rect(v.x0, by + 3, v.x1 - v.x0, by2 - by - 6); g.clip(); for (let i = -2; i < 7; i++) { const x = i * 300 - off; g.fillStyle = i % 2 ? '#0a3a6a' : '#5a1a6a'; g.fillRect(x, by + 3, 294, by2 - by - 6); g.fillStyle = i % 2 ? '#7ad0ff' : '#ff9af0'; g.font = fd(Math.round((by2 - by) * .7)); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ads[(i + 10) % 5], x + 147, (by + by2) / 2); } g.restore();
  }
  function pitch(g) {
    const v = K.view, [, gy] = P(0, 0, -5);
    g.fillStyle = '#2a8a3a'; g.fillRect(v.x0, gy, v.x1 - v.x0, 720 - gy);
    for (let z = -5; z < 17; z += 1.5) { const [, y0] = P(0, 0, z), [, y1] = P(0, 0, z + 1.5); if (Math.floor(z / 1.5) % 2) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(v.x0, y0, v.x1 - v.x0, y1 - y0); } }
    const line = (pts) => { g.beginPath(); pts.forEach(([x, z], i) => { const [sx, sy] = P(x, 0, z); i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }); g.stroke(); };
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3;
    line([[-30, 0], [30, 0]]); line([[-9.16, 0], [-9.16, 5.5], [9.16, 5.5], [9.16, 0]]); line([[-20.16, 0], [-20.16, 16.4], [20.16, 16.4], [20.16, 0]]);
    const [sx, sy, k] = P(0, 0, SPOT); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(sx, sy, .12 * k, .05 * k, 0, 0, 7); g.fill();
    const grad = g.createLinearGradient(0, 600, 0, 720); grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = grad; g.fillRect(v.x0, 600, v.x1 - v.x0, 120);
  }
  function goal(g, t, front) {
    const D = 2;   // the net's depth
    if (!front) {
      { const q = [P(-HW, 0, -D), P(HW, 0, -D), P(HW, GH, -D), P(-HW, GH, -D)]; g.fillStyle = 'rgba(8,14,24,.45)'; g.beginPath(); q.forEach(([a, b]) => g.lineTo(a, b)); g.fill(); }
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1;
      const bulge = (x, y) => { if (!net) return 0; const d = Math.hypot(x - net.x, y - net.y); return Math.max(0, 1 - d / 1.4) * Math.max(0, .9 - net.t) * 1.2; };
      for (let x = -HW; x <= HW + .01; x += .3) { g.beginPath(); for (let y = 0; y <= GH + .01; y += .3) { const [a, b] = P(x, y, -D - bulge(x, y)); y ? g.lineTo(a, b) : g.moveTo(a, b); } g.stroke(); }
      for (let y = 0; y <= GH + .01; y += .3) { g.beginPath(); for (let x = -HW; x <= HW + .01; x += .3) { const [a, b] = P(x, y, -D - bulge(x, y)); x > -HW ? g.lineTo(a, b) : g.moveTo(a, b); } g.stroke(); }
      for (const s of [-1, 1]) for (let z = 0; z >= -D; z -= .3) { const [a, b] = P(s * HW, 0, z), [c, d] = P(s * HW, GH, z); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
      return;
    }
    const post = (x0, y0, x1, y1) => { const [a, b, k] = P(x0, y0, 0), [c, d] = P(x1, y1, 0), w = .12 * k; g.fillStyle = '#f4f6fa'; g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; if (x0 === x1) { g.fillRect(a - w / 2, d - w / 2, w, b - d + w / 2); g.strokeRect(a - w / 2, d - w / 2, w, b - d + w / 2); } else { g.fillRect(a - w / 2, b - w / 2, c - a + w, w); g.strokeRect(a - w / 2, b - w / 2, c - a + w, w); } };
    post(-HW, 0, -HW, GH); post(HW, 0, HW, GH); post(-HW, GH, HW, GH);
  }
  function keeperDraw(g, t) {
    const p = keeper.dive ? clamp(keeper.t / keeper.dur, 0, 1) : 0, e = 1 - Math.pow(1 - p, 2), kit = kick === 'us' ? (mode === 'duo' ? '#ffcf3a' : '#ffcf3a') : '#3af08a';
    const hx = keeper.x + (keeper.tx - keeper.x) * e, hy = 1.75 + (keeper.ty - 1.75) * e, cx = keeper.x + (keeper.tx - keeper.x) * e * .55, cy = 1 + (keeper.ty - 1) * e * .55;
    const fx = keeper.x + (keeper.tx - keeper.x) * e * .2, fy = keeper.dive ? .1 + e * .35 : 0, z = .35;
    const [sfx, sfy, k] = P(fx, fy, z), [scx, scy] = P(cx, cy, z), [shx, shy] = P(hx, hy, z);
    const [gx, gy] = P(cx, 0, z); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(gx, gy, .6 * k, .12 * k, 0, 0, 7); g.fill();
    const limb = (x0, y0, x1, y1, w, c) => { g.strokeStyle = c; g.lineWidth = w * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    const ang = Math.atan2(shy - sfy, shx - sfx), px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2);
    limb(sfx - px * .14 * k, sfy - py * .14 * k, scx - px * .1 * k, scy - py * .1 * k, .16, '#1a1a2a'); limb(sfx + px * .14 * k, sfy + py * .14 * k, scx + px * .1 * k, scy + py * .1 * k, .16, '#1a1a2a');
    limb(scx, scy, scx + (shx - scx) * .55, scy + (shy - scy) * .55, .42, kit);
    const hd = [scx + (shx - scx) * .72, scy + (shy - scy) * .72]; g.fillStyle = '#e8b896'; g.beginPath(); g.arc(hd[0], hd[1], .13 * k, 0, 7); g.fill();
    for (const s of [-1, 1]) { const ax = shx + px * s * .28 * k * (keeper.dive ? .5 : 1) + (keeper.dive ? 0 : s * .35 * k), ay = shy + py * s * .28 * k * (keeper.dive ? .5 : 1) + (keeper.dive ? 0 : .2 * k); limb(scx + (shx - scx) * .4, scy + (shy - scy) * .4, ax, ay, .11, kit); g.fillStyle = '#f2f2f2'; g.beginPath(); g.arc(ax, ay, .1 * k, 0, 7); g.fill(); g.strokeStyle = '#ff5a3a'; g.lineWidth = .03 * k; g.stroke(); }
  }
  function kickerDraw(g, t) {
    const run = kicker.run < 0 ? 0 : Math.min(1, kicker.run), kicked = ball.fly, z = SPOT + 1.9 - run * 1.5, x = -1.25 + run * .75;
    const [sx, sy, k] = P(x, 0, z), s = k * .62, step = Math.sin(run * 18) * (kicked ? 0 : 1);
    g.save(); g.translate(sx, sy); g.scale(s / 100, s / 100);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, 0, 45, 10, 0, 0, 7); g.fill();
    g.strokeStyle = '#e8b896'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(-10, -80); g.lineTo(-14 - step * 8, -2); g.moveTo(10, -80); g.lineTo(kicked ? 30 : 14 + step * 8, kicked ? -30 : -2); g.stroke();
    g.fillStyle = '#111'; g.fillRect(-26, -2 - (step > 0 ? 4 : 0), 22, 8); g.fillRect(kicked ? 22 : 6, kicked ? -36 : -2, 22, 8);
    g.fillStyle = '#fff'; g.fillRect(-24, -96, 48, 24);
    g.fillStyle = kicker.kit; g.beginPath(); g.roundRect(-28, -170, 56, 80, 12); g.fill(); g.fillStyle = 'rgba(255,255,255,.85)'; g.font = fd(40); g.textAlign = 'center'; g.fillText('10', 0, -120);
    g.strokeStyle = kicker.kit; g.lineWidth = 13; g.beginPath(); g.moveTo(-24, -160); g.lineTo(-44, -110 + step * 6); g.moveTo(24, -160); g.lineTo(44, -110 - step * 6); g.stroke();
    g.fillStyle = '#e8b896'; g.beginPath(); g.arc(0, -192, 22, 0, 7); g.fill(); g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(0, -198, 22, Math.PI * .95, Math.PI * 2.05); g.fill();
    g.restore();
  }
  function ballDraw(g, t) {
    for (let i = 0; i < ball.trail.length; i++) { const [x, y, z] = ball.trail[i], [a, b, k] = P(x, y, z); g.globalAlpha = i / ball.trail.length * .35; g.fillStyle = ball.sp > 28 ? '#ffd23f' : '#fff'; g.beginPath(); g.arc(a, b, .09 * k, 0, 7); g.fill(); } g.globalAlpha = 1;
    const [sx, sy, k] = P(ball.x, ball.y, ball.z), [gx, gy] = P(ball.x, 0, ball.z);
    g.fillStyle = `rgba(0,0,0,${.35 - Math.min(.25, ball.y * .1)})`; g.beginPath(); g.ellipse(gx, gy, .14 * k, .05 * k, 0, 0, 7); g.fill();
    drawBall(g, sx, sy, Math.max(4, .11 * k), ball.spin);
  }
  function aimDraw(g, t) {
    if (canShoot()) {
      if (swipe && swipe.pts.length > 1) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); swipe.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
      const [ax, ay] = P(aimK.x, aimK.y, 0); g.strokeStyle = 'rgba(255,210,63,.7)'; g.lineWidth = 3; g.beginPath(); g.arc(ax, ay, 18, 0, 7); g.stroke();
      if (aimK.curve) { g.fillStyle = '#ffd23f'; g.font = fd(24); g.textAlign = 'center'; g.fillText(aimK.curve < 0 ? '◀ CURL' : 'CURL ▶', ax, ay - 30); }
      if (aimK.charge > 0) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(1150, 300, 40, 300); g.fillStyle = aimK.charge > .85 ? '#ff4d5a' : '#ffd23f'; g.fillRect(1150, 600 - 300 * aimK.charge, 40, 300 * aimK.charge); }
      if (!K.bot && (!match || match.n < 2 || mode === 'duo') && mode !== 'targets') { g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.roundRect(340, 668, 600, 40, 12); g.fill(); g.fillStyle = '#fff'; g.font = FB(17); g.textAlign = 'center'; g.fillText(mode === 'duo' ? `Player ${kick === 'us' ? 1 : 2}: swipe to shoot. Then the other player taps to dive!` : 'Swipe from the ball into the goal. Bend the swipe to curl it.', 640, 690); }
    }
    if ((kick === 'them' && mode !== 'duo' || mode === 'duo' && ball.fly) && !keeper.dive && !res) { const [ax, ay] = P(aimK.x, aimK.y, 0); g.strokeStyle = 'rgba(80,255,150,.6)'; g.lineWidth = 3; g.setLineDash([6, 6]); g.beginPath(); g.arc(ax, ay, 22, 0, 7); g.stroke(); g.setLineDash([]); if (!K.bot && kick === 'them') { g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.roundRect(380, 668, 520, 40, 12); g.fill(); g.fillStyle = '#fff'; g.font = FB(17); g.textAlign = 'center'; g.fillText('Tap where to dive the moment you see the ball go.', 640, 690); } }
  }
  function targetsDraw(g) { if (mode !== 'targets') return; for (const tg of match.tg) { const [x, y, k] = P(tg.x, tg.y, 0); g.strokeStyle = tg.hit ? 'rgba(255,255,255,.2)' : '#ffd23f'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, tg.r * k, 0, 7); g.stroke(); g.fillStyle = tg.hit ? 'rgba(255,255,255,.2)' : '#fff'; g.font = fd(26); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(tg.v), x, y); } }
  function scoreboard(g) {
    g.fillStyle = 'rgba(6,10,26,.85)'; g.beginPath(); g.roundRect(60, 14, 470, 92, 14); g.fill();
    if (mode === 'cup' || mode === 'duo') {
      const rows = mode === 'duo' ? [[{ n: 'Player 1', c: ['#ffd23f'], d: 'v' }, match.us], [{ n: 'Player 2', c: ['#3ddc84'], d: 'v' }, match.them]] : [[TEAMS[team], match.us], [TEAMS[match.opp], match.them]];
      rows.forEach(([tm, arr], r) => { const y = 34 + r * 40; flag(g, tm, 78, y - 12, 38, 26); g.fillStyle = '#fff'; g.font = fd(28); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(tm.n.toUpperCase(), 128, y + 1); for (let i = 0; i < Math.max(5, arr.length); i++) { const v = arr[i], x = 300 + i * 34; g.fillStyle = v === undefined ? 'rgba(255,255,255,.15)' : v ? '#3ddc84' : '#ff4d5a'; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); if (v !== undefined) { g.fillStyle = '#fff'; g.font = FB(14); g.textAlign = 'center'; g.fillText(v ? '✓' : '✕', x, y + 1); } } });
      g.fillStyle = 'rgba(6,10,26,.85)'; g.beginPath(); g.roundRect(1040, 14, 200, 48, 12); g.fill(); g.fillStyle = '#ffd23f'; g.font = fd(30); g.textAlign = 'center'; g.fillText(mode === 'duo' ? '2 PLAYERS' : ROUNDS[round].toUpperCase(), 1140, 40);
    } else {
      g.fillStyle = '#ffd23f'; g.font = fd(30); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(mode === 'survival' ? 'SURVIVAL' : 'TARGET PRACTICE', 80, 40);
      g.fillStyle = '#fff'; g.font = fd(40); g.fillText(mode === 'survival' ? `${match.streak} IN A ROW` : `${match.pts} PTS · BALL ${Math.min(10, match.shots + 1)}/10`, 80, 82);
    }
  }

  /* ---------- menus ---------- */
  const btn = (g, k, x, y, w, h, label, sub, c = '#1d3a26', tc = '#fff') => { B[k] = { x, y, w, h }; const hv = hover === k; g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.roundRect(x, y + 6, w, h, 16); g.fill(); g.fillStyle = c; g.beginPath(); g.roundRect(x, y + (hv ? 2 : 0), w, h, 16); g.fill(); g.fillStyle = tc; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = fd(h > 90 ? 46 : 34); g.fillText(label, x + w / 2, y + h / 2 + (sub ? -12 : 2) + (hv ? 2 : 0)); if (sub) { g.font = FB(15); g.fillText(sub, x + w / 2, y + h / 2 + 22 + (hv ? 2 : 0)); } };
  function bgDim(g) { stadium(g, K.t); pitch(g); goal(g, K.t, false); goal(g, K.t, true); g.fillStyle = 'rgba(4,12,8,.72)'; g.fillRect(K.view.x0, 0, K.view.x1 - K.view.x0, 720); }
  function drawMenu(g) {
    bgDim(g); const s = SV();
    g.fillStyle = '#fff'; g.font = fd(110); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PENALTY SHOOTOUT', 640, 110); g.fillStyle = '#ffd23f'; g.font = FB(20); g.fillText('Swipe to shoot. Tap to dive.', 640, 172);
    btn(g, 'cup', 250, 220, 780, 110, 'WORLD CUP', `16 nations, knockout. Cups won: ${s.cups}`, '#ffd23f', '#141414');
    btn(g, 'survival', 250, 350, 380, 96, 'SURVIVAL', `Best streak: ${s.best.survival}`); btn(g, 'targets', 650, 350, 380, 96, 'TARGET PRACTICE', `Best: ${s.best.targets} pts`);
    btn(g, 'duo', 250, 466, 380, 96, '2 PLAYERS', 'One shoots, one saves'); btn(g, 'skills', 650, 466, 380, 96, 'SKILLS', `Coins: ${K.save.coins || 0}`, '#2a3a8a');
  }
  function drawSkills(g) {
    bgDim(g); g.fillStyle = '#fff'; g.font = fd(80); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SKILLS', 640, 80); g.fillStyle = '#ffd23f'; g.font = FB(20); g.fillText(`Coins: ${K.save.coins || 0}. Win kicks and matches to earn more.`, 640, 130);
    SKILLS.forEach(([k, n, d], i) => { const x = 160 + (i % 2) * 490, y = 170 + Math.floor(i / 2) * 200, lv = sk(k); g.fillStyle = 'rgba(20,40,28,.9)'; g.beginPath(); g.roundRect(x, y, 470, 180, 18); g.fill(); g.fillStyle = '#fff'; g.font = fd(44); g.textAlign = 'left'; g.fillText(n.toUpperCase(), x + 24, y + 40); g.font = FB(16); g.fillStyle = '#cfe8d6'; g.fillText(d, x + 24, y + 78);
      for (let j = 0; j < 5; j++) { g.fillStyle = j < lv ? '#3ddc84' : 'rgba(255,255,255,.15)'; g.beginPath(); g.roundRect(x + 24 + j * 44, y + 100, 38, 14, 7); g.fill(); }
      btn(g, 'sk' + k, x + 280, y + 112, 170, 54, lv >= 5 ? 'MAXED' : `${SKCOST[lv]} COINS`, null, lv >= 5 ? '#33443a' : (K.save.coins || 0) >= SKCOST[lv] ? '#ffd23f' : '#33443a', lv < 5 && (K.save.coins || 0) >= SKCOST[lv] ? '#141414' : '#fff'); });
    btn(g, 'back', 540, 600, 200, 70, 'BACK');
  }
  function drawPick(g) {
    bgDim(g); g.fillStyle = '#fff'; g.font = fd(64); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CHOOSE YOUR NATION', 640, 70);
    TEAMS.forEach((t, i) => { const x = 120 + (i % 4) * 270, y = 120 + Math.floor(i / 4) * 120, b = B['t' + i] = { x, y, w: 250, h: 100 }, hv = hover === 't' + i; g.fillStyle = hv ? '#ffd23f' : 'rgba(20,40,28,.9)'; g.beginPath(); g.roundRect(x, y, 250, 100, 14); g.fill(); flag(g, t, x + 16, y + 22, 80, 56); g.fillStyle = hv ? '#141414' : '#fff'; g.font = fd(30); g.textAlign = 'left'; g.fillText(t.n.toUpperCase(), x + 110, y + 42); g.font = FB(14); g.fillText('★'.repeat(Math.round(t.rate * 5)), x + 110, y + 70); });
    btn(g, 'back', 1100, 640, 140, 56, 'BACK');
  }
  function drawBracket(g) {
    bgDim(g); g.fillStyle = '#fff'; g.font = fd(60); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ROUNDS[round].toUpperCase(), 640, 60);
    bracket.forEach((r, c) => { const n = r.length, h = 600 / n; r.forEach((ti, j) => { const x = 60 + c * 200, y = 100 + j * h + h / 2 - 18, me = ti === team; g.fillStyle = me ? '#ffd23f' : 'rgba(20,40,28,.9)'; g.beginPath(); g.roundRect(x, y, 180, 36, 8); g.fill(); flag(g, TEAMS[ti], x + 6, y + 6, 36, 24); g.fillStyle = me ? '#141414' : '#fff'; g.font = fd(22); g.textAlign = 'left'; g.fillText(TEAMS[ti].n.toUpperCase(), x + 50, y + 19); }); });
    g.fillStyle = '#ffd23f'; g.font = fd(44); g.textAlign = 'center'; g.fillText(`${TEAMS[team].n.toUpperCase()} vs ${TEAMS[opponent()].n.toUpperCase()}`, 1040, 620); g.fillStyle = '#fff'; g.font = FB(18); g.fillText('Tap to kick off', 1040, 664);
  }
  GAME.draw = g => {
    for (const k in B) delete B[k];
    if (st === 'menu') return drawMenu(g); if (st === 'skills') return drawSkills(g); if (st === 'pick') return drawPick(g); if (st === 'bracket') return drawBracket(g);
    const t = K.t; g.save(); if (shake) g.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    stadium(g, t); pitch(g); goal(g, t, false);
    const behind = ball.z < .2; if (behind) ballDraw(g, t);
    targetsDraw(g); keeperDraw(g, t); goal(g, t, true); if (!behind) ballDraw(g, t);
    if (ball.z > SPOT - 1 || !ball.fly) kickerDraw(g, t);
    g.restore();
    aimDraw(g, t); scoreboard(g);
    for (const c of conf) { g.save(); g.translate(c.x, c.y); g.rotate(c.r); g.fillStyle = c.c; g.fillRect(-5, -3, 10, 6); g.restore(); }
    if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash * .25})`; g.fillRect(K.view.x0, 0, K.view.x1 - K.view.x0, 720); }
    const txt = res || (banner && banner.s), k = res ? resT : banner ? banner.t : 0;
    if (txt && st === 'match') { const good = res ? (kick === 'us' ? res === 'GOAL!' : res !== 'GOAL!') : true, sc = k < .15 ? k / .15 : 1;
      g.save(); g.translate(640, 290); g.scale(sc, sc); g.rotate(-.04); g.globalAlpha = k > 1.2 ? Math.max(0, 1 - (k - 1.2) / .4) : 1; g.font = fd(res ? 130 : 80); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 14; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText(txt, 0, 0); g.fillStyle = !res ? '#fff' : good ? '#ffd23f' : '#ff4d5a'; g.fillText(txt, 0, 0); g.restore(); g.globalAlpha = 1; }
    if (st === 'post') { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(K.view.x0, 0, K.view.x1 - K.view.x0, 720); const gu = match.us.filter(Boolean).length, gt = match.them.filter(Boolean).length;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = match.win ? '#ffd23f' : '#ff4d5a'; g.font = fd(110); g.fillText(mode === 'duo' ? (match.win ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS') : match.win ? (round === 3 ? 'CHAMPIONS!' : 'YOU WIN!') : 'KNOCKED OUT', 640, 290);
      g.fillStyle = '#fff'; g.font = fd(60); g.fillText(`${gu} – ${gt}`, 640, 380); if (resT > .8) { g.font = FB(20); g.fillText('Tap to continue', 640, 450); } }
  };
  GAME.pose = () => { mode = 'cup'; team = 9; startCup(9); startMatch('cup'); banner = null; ball.fly = true; Object.assign(ball, { t: .82, T: .5, tx: 2.9, ty: 2, curve: .6, loft: .05, sp: 30 }); ball.trail = []; for (let i = 0; i < 12; i++) ball.trail.push(ballAt(.82 * i / 12 + .3)); const p = ballAt(.82); ball.x = p[0]; ball.y = p[1]; ball.z = p[2]; keeper.dive = true; keeper.t = .25; keeper.dur = .42; keeper.tx = 2.6; keeper.ty = 1.6; kicker.run = 2; };
  GAME.test = { st: () => ({ st, mode, kick, res, us: match && match.us, them: match && match.them, streak: match && match.streak, pts: match && match.pts, ball: ball && { t: ball.t, fly: ball.fly } }), shoot, dive, startMatch, startCup, click };
})();
