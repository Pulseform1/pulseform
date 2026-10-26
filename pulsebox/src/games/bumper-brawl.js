/* Bumper Brawl: up to 4 bumper cars on a floating neon arena that keeps shrinking. Ram the others off the edge;
   last car on the platform wins the round, first to 3 rounds wins. Online rooms through the shared MP lobby;
   the host's game runs the physics and the bots, everyone else sends their stick and dash button. */
// @use mp
const GAME = {
  id: 'bumper-brawl', title: 'Bumper Brawl', tagline: 'Ram your friends off the shrinking arena!',
  font: 'Bungee', accent: '#ff4d6d', accent2: '#3ec5ff', bg: '#090616', noSkins: true, noHud: true, scoreLabel: 'Rounds won',
  how: ['Drive with WASD or the arrow keys (or drag on the left of the screen).', 'Space (or tap the right side) to DASH into someone. Dashing hits much harder.', 'The arena shrinks. Last car on the platform wins the round; first to 3 wins.', 'Grab power-ups: MEGA makes you huge and heavy, SHOCK blasts everyone away, ZOOM speeds you up.'],
  skins: [{ name: 'Default', price: 0, c: ['#fff'] }],
};
(() => {
  const CX = 640, CY = 390, R0 = 320, RMIN = 105, SHRINK = 55, WIN = 3, PR = 26;
  let mode = 'lobby', roster = [], P = [], items = [], R = R0, tRound = 0, phase = 'count', phaseT = 0, round = 0, score = [], winner = -1, matchWin = -1;
  let inputs = {}, sendT = 0, stateT = 0, events = [], itemT = 6, mine = 0, joy = null, dashKey = false, lastS = null, stars = [];
  for (let i = 0; i < 90; i++) stars.push({ x: Math.random() * 1500 - 100, y: Math.random() * 800 - 40, s: Math.random() * 2 + .5, p: Math.random() * 6 });
  const host = () => MP.isHost();
  Object.assign(MP.opts, {
    max: 4, min: 1, bots: 4, solo: 'Play with 3 bots', sub: '2 to 4 players. Bots fill any empty seats.',
    onStart: (cfg, ros) => startMatch(ros),
    onMsg: m => {
      if (m.t === 'in' && host()) inputs[m.from] = m;
      if (m.t === 's' && !host()) applyState(m);
    },
    onLeave: id => { if (mode !== 'play') return; if (id === -1 || id === MP.hostId || !MP.online()) { endMatch('The host left the room.'); return; } const p = P.find(q => q.id === id); if (p) { p.bot = true; p.name += ' (bot)'; } },
    onHost: () => { if (mode === 'play') endMatch('The host left the room.'); },
  });
  function startMatch(ros) {
    roster = ros; mode = 'play'; round = 0; score = ros.map(() => 0); matchWin = -1; K.score = 0;
    mine = Math.max(0, ros.findIndex(r => r.id === MP.id && !r.bot));
    if (K.bot) mine = -1;
    newRound();
  }
  function newRound() {
    round++; R = R0; tRound = 0; phase = 'count'; phaseT = 2.2; winner = -1; items = []; itemT = 6;
    P = roster.map((r, i) => { const a = i / roster.length * Math.PI * 2 + Math.PI / 4; return { i, id: r.id, name: r.name, col: r.col, bot: !!r.bot, x: CX + Math.cos(a) * 150, y: CY + Math.sin(a) * 150, vx: 0, vy: 0, a: a + Math.PI, alive: true, fall: 0, dcd: 0, dash: 0, mega: 0, zoom: 0, stun: 0, hit: 0 }; });
    if (!K.bot) K.sfx(440, .2, 'square', .06);
  }
  function endMatch(why) {
    if (mode !== 'play') return; mode = 'over';
    const me = P[mine], won = matchWin >= 0 && matchWin === mine;
    K.score = mine >= 0 ? score[mine] || 0 : 0;
    if (won) K.coin(10);
    K.over({ title: why ? 'Match ended' : won ? 'You win!' : `${roster[matchWin] ? roster[matchWin].name : 'Nobody'} wins`, text: why || `${score.map((s, i) => `${roster[i].name} ${s}`).join(' · ')}`, delay: 300 });
    void me;
  }
  /* ---------- simulation (host) ---------- */
  function control(p, dt) {
    if (p.bot) return botCtl(p);
    if (p.i === mine && !K.bot) return { ax: myAx(), ay: myAy(), d: dashKey };
    const m = inputs[p.id]; return m ? { ax: m.ax || 0, ay: m.ay || 0, d: !!m.d } : { ax: 0, ay: 0, d: false };
  }
  function botCtl(p) {
    const others = P.filter(q => q !== p && q.alive);
    const dc = Math.hypot(p.x - CX, p.y - CY);
    let tx = CX, ty = CY;
    p.think = (p.think || 0) - 1 / 60;
    if (p.think <= 0) { p.think = .6 + Math.random() * .9; p.tgt = others.length && Math.random() < .75 ? K.pick(others) : null; p.wob = Math.random() * 6.28; }
    if (p.tgt && p.tgt.alive) { tx = p.tgt.x + p.tgt.vx * .2; ty = p.tgt.y + p.tgt.vy * .2; } else { tx = CX + Math.cos(p.wob) * R * .4; ty = CY + Math.sin(p.wob) * R * .4; }
    if (dc > R - 70) { tx = CX; ty = CY; }
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
    const facing = p.tgt && Math.hypot(p.tgt.x - p.x, p.tgt.y - p.y) < 170 && (p.vx * dx + p.vy * dy) / (Math.hypot(p.vx, p.vy) * d + 1) > .7;
    const k = tRound < 1.2 ? .35 : .78;
    return { ax: dx / d * k, ay: dy / d * k, d: facing && Math.random() < .035 && dc < R - 40 && tRound > 1.5 };
  }
  function sim(dt) {
    if (phase === 'count') { phaseT -= dt; if (phaseT <= 0) { phase = 'fight'; ev('go', CX, CY); } return; }
    if (phase === 'end') { phaseT -= dt; if (phaseT <= 0) { if (matchWin >= 0) endMatch(); else newRound(); } return; }
    tRound += dt; R = Math.max(RMIN, R0 - Math.max(0, tRound - 4) * SHRINK * .5);
    itemT -= dt;
    if (itemT <= 0 && items.length < 2) { itemT = 7 + Math.random() * 5; const a = Math.random() * 6.28, r = Math.random() * (R - 60); items.push({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r, k: ['mega', 'shock', 'zoom'][Math.floor(Math.random() * 3)], t: 0 }); }
    for (const p of P) {
      if (!p.alive) { p.fall += dt; continue; }
      const c = control(p, dt); let ax = c.ax, ay = c.ay; const al = Math.hypot(ax, ay); if (al > 1) { ax /= al; ay /= al; }
      p.dcd = Math.max(0, p.dcd - dt); p.dash = Math.max(0, p.dash - dt); p.mega = Math.max(0, p.mega - dt); p.zoom = Math.max(0, p.zoom - dt); p.stun = Math.max(0, p.stun - dt); p.hit = Math.max(0, p.hit - dt);
      const acc = (p.zoom > 0 ? 1350 : 950) * (p.stun > 0 ? .2 : 1);
      p.vx += ax * acc * dt; p.vy += ay * acc * dt;
      if (al > .1) p.a = Math.atan2(ay, ax);
      if (c.d && p.dcd <= 0 && p.stun <= 0) { const da = al > .1 ? Math.atan2(ay, ax) : p.a; p.vx += Math.cos(da) * 620; p.vy += Math.sin(da) * 620; p.dash = .3; p.dcd = 1.5; ev('dash', p.x, p.y, p.i); }
      const damp = Math.pow(.18, dt); p.vx *= damp; p.vy *= damp;
      const sp = Math.hypot(p.vx, p.vy), mx = p.dash > 0 ? 1100 : p.zoom > 0 ? 560 : 440; if (sp > mx) { p.vx *= mx / sp; p.vy *= mx / sp; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const a = P[i], b = P[j]; if (!a.alive || !b.alive) continue;
      const ra = rad(a), rb = rad(b), dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d >= ra + rb || d === 0) continue;
      const nx = dx / d, ny = dy / d, ma = a.mega > 0 ? 2.6 : 1, mb = b.mega > 0 ? 2.6 : 1, ov = ra + rb - d;
      a.x -= nx * ov * mb / (ma + mb); a.y -= ny * ov * mb / (ma + mb); b.x += nx * ov * ma / (ma + mb); b.y += ny * ov * ma / (ma + mb);
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (vn > 0) continue;
      const boost = 1 + (a.dash > 0 || b.dash > 0 ? .6 : 0), j2 = -(1 + .8) * vn / (1 / ma + 1 / mb) * boost;
      a.vx -= j2 * nx / ma; a.vy -= j2 * ny / ma; b.vx += j2 * nx / mb; b.vy += j2 * ny / mb;
      if (a.dash > 0) b.stun = .35; if (b.dash > 0) a.stun = .35; a.hit = b.hit = .2;
      ev(Math.abs(vn) > 500 ? 'bigHit' : 'hit', (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    for (const p of P) {
      if (!p.alive) continue;
      for (let k = items.length - 1; k >= 0; k--) { const it = items[k]; if (Math.hypot(it.x - p.x, it.y - p.y) < rad(p) + 18) { items.splice(k, 1); pick(p, it.k); } }
      if (Math.hypot(p.x - CX, p.y - CY) > R + rad(p) * .35) { p.alive = false; p.fall = 0; ev('fall', p.x, p.y, p.i); }
    }
    for (const it of items) it.t += dt;
    const alive = P.filter(p => p.alive);
    if (alive.length <= 1) {
      phase = 'end'; phaseT = 2.6; winner = alive.length ? alive[0].i : -1;
      if (winner >= 0) { score[winner]++; if (score[winner] >= WIN) { matchWin = winner; phaseT = 3; } }
      ev('round', CX, CY, winner);
    }
  }
  const rad = p => p.mega > 0 ? PR * 1.45 : PR;
  function pick(p, k) {
    if (k === 'mega') p.mega = 6; if (k === 'zoom') p.zoom = 5;
    if (k === 'shock') for (const q of P) { if (q === p || !q.alive) continue; const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy); if (d < 260) { q.vx += dx / d * 900 * (1 - d / 300); q.vy += dy / d * 900 * (1 - d / 300); q.stun = .5; } }
    ev('pick_' + k, p.x, p.y, p.i);
  }
  function ev(k, x, y, i) { events.push([k, Math.round(x), Math.round(y), i ?? -1]); fxEvent(k, x, y, i); }
  function fxEvent(k, x, y, i) {
    const col = i >= 0 && roster[i] ? roster[i].col : '#fff';
    if (k === 'hit') { K.burst(x, y, ['#fff', '#ffd23f'], 8, 220, { life: .35, size: 6 }); K.sfx(180, .08, 'square', .1, -60); K.shake(5); }
    if (k === 'bigHit') { K.burst(x, y, ['#fff', '#ffd23f', '#ff4d6d'], 22, 480, { life: .5, size: 8 }); K.sfx(120, .2, 'sawtooth', .14, -60); K.noise(.15, .2, 400); K.shake(14); }
    if (k === 'dash') { K.burst(x, y, [col, '#fff'], 8, 200, { life: .3, size: 5, gravity: 0 }); K.sfx(320, .15, 'sawtooth', .07, 500); }
    if (k === 'fall') { K.burst(x, y, [col, '#fff'], 30, 360, { life: .8, size: 8, gravity: 0 }); K.sfx(400, .7, 'triangle', .12, -360); K.shake(10); }
    if (k.startsWith('pick')) { K.burst(x, y, ['#fff', '#c77dff', '#3ec5ff'], 16, 300, { life: .5, gravity: 0 }); K.chime(660, [0, 7, 12]); if (k === 'pick_shock') { K.shake(16); K.noise(.3, .25, 200); rings.push({ x, y, t: 0 }); } }
    if (k === 'round') { K.chime(523, [0, 4, 7, 12]); }
    if (k === 'go') K.sfx(880, .3, 'square', .08);
  }
  const rings = [];
  /* ---------- network ---------- */
  function packState() {
    return { t: 's', p: P.map(p => [Math.round(p.x), Math.round(p.y), Math.round(p.vx), Math.round(p.vy), +p.a.toFixed(2), p.alive ? 1 : 0, (p.dash > 0 ? 1 : 0) | (p.mega > 0 ? 2 : 0) | (p.zoom > 0 ? 4 : 0) | (p.stun > 0 ? 8 : 0), +(p.dcd).toFixed(1)]),
      R: Math.round(R), it: items.map(it => [Math.round(it.x), Math.round(it.y), it.k]), ph: phase, pt: +phaseT.toFixed(2), rd: round, sc: score, w: winner, mw: matchWin, ev: events.splice(0) };
  }
  function applyState(m) {
    if (mode !== 'play') return;
    if (m.rd !== round) { round = m.rd; P.forEach(p => { p.alive = true; p.fall = 0; }); }
    m.p.forEach((d, i) => {
      const p = P[i]; if (!p) return;
      p.tx = d[0]; p.ty = d[1]; p.vx = d[2]; p.vy = d[3]; p.a = d[4]; if (p.alive && !d[5]) p.fall = 0; p.alive = !!d[5];
      p.dash = d[6] & 1 ? .1 : 0; p.mega = d[6] & 2 ? 1 : 0; p.zoom = d[6] & 4 ? 1 : 0; p.stun = d[6] & 8 ? .1 : 0; p.dcd = d[7];
      if (p.x === undefined || Math.hypot(p.tx - p.x, p.ty - p.y) > 200) { p.x = p.tx; p.y = p.ty; }
    });
    R = m.R; items = m.it.map(d => ({ x: d[0], y: d[1], k: d[2], t: 1 })); phase = m.ph; phaseT = m.pt; score = m.sc; winner = m.w;
    for (const e of m.ev) fxEvent(e[0], e[1], e[2], e[3]);
    if (m.mw >= 0 && matchWin < 0) { matchWin = m.mw; setTimeout(() => endMatch(), 2600); }
  }
  /* ---------- input ---------- */
  const keys = {};
  const myAx = () => (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + (joy ? joy.dx : 0);
  const myAy = () => (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + (joy ? joy.dy : 0);
  GAME.key = (c, d) => { keys[c] = d; if (c === 'Space' || c === 'Enter' || c === 'ShiftLeft') dashKey = d; };
  GAME.down = (x, y, e) => { if (x < 760) joy = { id: e && e.pointerId, ox: x, oy: y, dx: 0, dy: 0 }; else dashKey = true; };
  GAME.move = (x, y, e) => { if (joy && (!e || e.pointerId === joy.id)) { const dx = (x - joy.ox) / 80, dy = (y - joy.oy) / 80, l = Math.hypot(dx, dy); joy.dx = l > 1 ? dx / l : dx; joy.dy = l > 1 ? dy / l : dy; } };
  GAME.up = (x, y, e) => { if (joy && (!e || e.pointerId === joy.id)) joy = null; else dashKey = false; };
  /* ---------- kit hooks ---------- */
  GAME.reset = () => {
    for (const k in keys) keys[k] = false; joy = null; dashKey = false; inputs = {};
    if (K.bot) { startMatch(['Blip', 'Zap', 'Mango', 'Pixel'].map((n, i) => ({ id: 'b' + i, name: 'Bot ' + n, col: MP.colors[i], bot: true, seat: i }))); return; }
    mode = 'lobby'; P = []; MP.show();
  };
  GAME.update = dt => {
    for (const r of rings) r.t += dt; while (rings.length && rings[0].t > .6) rings.shift();
    if (mode !== 'play') return;
    if (host()) {
      sim(dt);
      if (MP.online()) { stateT -= dt; if (stateT <= 0) { stateT = 1 / 20; MP.send(packState()); } } else events.length = 0;
      for (const p of P) { p.rx = p.x; p.ry = p.y; }
    } else {
      sendT -= dt; if (sendT <= 0) { sendT = 1 / 20; MP.to(MP.hostId, { t: 'in', ax: +myAx().toFixed(2), ay: +myAy().toFixed(2), d: dashKey ? 1 : 0 }); }
      for (const p of P) { if (p.tx === undefined) continue; p.x += (p.tx + p.vx * .05 - p.x) * Math.min(1, dt * 14); p.y += (p.ty + p.vy * .05 - p.y) * Math.min(1, dt * 14); if (!p.alive) p.fall += dt; }
      if (phase === 'count' || phase === 'end') phaseT -= dt;
    }
    if (K.bot && mode === 'over') return;
  };
  /* ---------- drawing ---------- */
  GAME.draw = g => {
    const v = K.view, t = K.t;
    if (posed) { g.translate(640, 380); g.scale(1.45, 1.45); g.translate(-640, -380); }
    const bg = g.createRadialGradient(CX, CY, 100, CX, CY, 900); bg.addColorStop(0, '#24104a'); bg.addColorStop(1, '#05030c'); g.fillStyle = bg; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    for (const s of stars) { g.globalAlpha = .4 + Math.sin(t * 2 + s.p) * .3; g.fillStyle = '#fff'; g.fillRect(s.x, s.y, s.s, s.s); } g.globalAlpha = 1;
    // arena
    const r = R;
    g.save(); g.shadowColor = '#c77dff'; g.shadowBlur = 40; g.fillStyle = '#16102e'; g.beginPath(); g.arc(CX, CY + 18, r + 6, 0, 7); g.fill(); g.restore();
    const ag = g.createRadialGradient(CX, CY - 60, 20, CX, CY, r); ag.addColorStop(0, '#3a2a78'); ag.addColorStop(1, '#1d1442'); g.fillStyle = ag; g.beginPath(); g.arc(CX, CY, r, 0, 7); g.fill();
    g.save(); g.beginPath(); g.arc(CX, CY, r, 0, 7); g.clip(); g.strokeStyle = 'rgba(160,120,255,.18)'; g.lineWidth = 2;
    for (let k = -700; k <= 700; k += 48) { g.beginPath(); g.moveTo(CX + k, CY - 400); g.lineTo(CX + k, CY + 400); g.stroke(); g.beginPath(); g.moveTo(CX - 700, CY + k); g.lineTo(CX + 700, CY + k); g.stroke(); }
    g.restore();
    const danger = r < R0 - 5 && phase === 'fight';
    g.lineWidth = 8; g.strokeStyle = danger ? `rgba(255,77,109,${.7 + Math.sin(t * 10) * .3})` : '#c77dff'; g.shadowColor = g.strokeStyle; g.shadowBlur = 24; g.beginPath(); g.arc(CX, CY, r, 0, 7); g.stroke(); g.shadowBlur = 0;
    for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283 + t * .3; g.fillStyle = k % 2 ? '#3ec5ff' : '#ff4d6d'; g.beginPath(); g.arc(CX + Math.cos(a) * r, CY + Math.sin(a) * r, 4, 0, 7); g.fill(); }
    for (const rg of rings) { g.strokeStyle = `rgba(62,197,255,${1 - rg.t / .6})`; g.lineWidth = 10; g.beginPath(); g.arc(rg.x, rg.y, 30 + rg.t * 420, 0, 7); g.stroke(); }
    // items
    for (const it of items) {
      const b = Math.sin(t * 5 + it.x) * 4, c = it.k === 'mega' ? '#ffd23f' : it.k === 'shock' ? '#3ec5ff' : '#5cf28a';
      g.save(); g.translate(it.x, it.y + b); g.rotate(t * 2); g.shadowColor = c; g.shadowBlur = 20; g.fillStyle = c; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; g.lineTo(Math.cos(a) * 18, Math.sin(a) * 18); } g.fill(); g.restore();
      g.font = '14px Bungee'; g.fillStyle = '#10082a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(it.k === 'mega' ? 'M' : it.k === 'shock' ? 'S' : 'Z', it.x, it.y + b + 1);
    }
    // cars
    for (const p of P.slice().sort((a, b) => a.y - b.y)) {
      if (p.x === undefined) continue;
      const fallen = !p.alive, k = fallen ? Math.max(0, 1 - p.fall * 1.6) : 1; if (k <= 0) continue;
      const rr = rad(p) * k, dark = shade(p.col, -.45);
      g.save(); g.translate(p.x, p.y + (fallen ? p.fall * 60 : 0)); g.globalAlpha = k;
      if (!fallen) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, rr * .7, rr * 1.05, rr * .45, 0, 0, 7); g.fill(); }
      if (p.dash > 0) { g.fillStyle = p.col; g.globalAlpha = .3 * k; for (let s = 1; s <= 3; s++) { g.beginPath(); g.arc(-p.vx * .018 * s, -p.vy * .018 * s, rr * (1 - s * .15), 0, 7); g.fill(); } g.globalAlpha = k; }
      if (p.mega > 0) { g.shadowColor = '#ffd23f'; g.shadowBlur = 30; }
      g.fillStyle = '#e8e8f0'; g.beginPath(); g.arc(0, 0, rr + 5, 0, 7); g.fill(); g.shadowBlur = 0;
      const bodyG = g.createRadialGradient(-rr * .35, -rr * .4, rr * .1, 0, 0, rr); bodyG.addColorStop(0, shade(p.col, .35)); bodyG.addColorStop(.7, p.col); bodyG.addColorStop(1, dark); g.fillStyle = bodyG; g.beginPath(); g.arc(0, 0, rr, 0, 7); g.fill();
      g.rotate(p.a);
      g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(rr * .35, 0, rr * .32, rr * .5, 0, 0, 7); g.fill();
      for (const s of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(rr * .42, s * rr * .26, rr * .2, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(rr * .5, s * rr * .26, rr * .1, 0, 7); g.fill(); }
      g.strokeStyle = '#111'; g.lineWidth = 3; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(rr * .28, s * rr * .48); g.lineTo(rr * .62, s * rr * .12); g.stroke(); }
      if (p.stun > 0) { g.rotate(-p.a); g.fillStyle = '#ffd23f'; for (let s = 0; s < 3; s++) { const a = t * 6 + s * 2.1; g.beginPath(); g.arc(Math.cos(a) * rr * .8, -rr - 8 + Math.sin(a) * 6, 4, 0, 7); g.fill(); } }
      g.restore();
      if (p.alive) {
        g.font = '15px Bungee'; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.5)'; g.fillText(p.name, p.x + 1, p.y - rr - 21); g.fillStyle = p.col; g.fillText(p.name, p.x, p.y - rr - 22);
        if (p.i === mine) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(p.x - 7, p.y - rr - 42); g.lineTo(p.x + 7, p.y - rr - 42); g.lineTo(p.x, p.y - rr - 33); g.fill(); }
      }
    }
    if (posed) { g.save(); g.translate(640, 402); for (let k = 0; k < 18; k++) { g.rotate(Math.PI * 2 / 18); g.fillStyle = k % 2 ? '#ffd23f' : '#fff'; g.beginPath(); g.moveTo(0, -8); g.lineTo(34 + (k % 3) * 14, 0); g.lineTo(0, 8); g.fill(); } g.fillStyle = '#fff'; g.shadowColor = '#ffd23f'; g.shadowBlur = 30; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill(); g.restore(); return; }
    if (mode !== 'play') return;
    // scoreboard
    roster.forEach((ro, i) => {
      const x = 70 + i * 290; g.fillStyle = 'rgba(10,6,28,.75)'; g.beginPath(); g.roundRect(x, 14, 270, 46, 14); g.fill(); g.fillStyle = ro.col; g.fillRect(x + 12, 26, 10, 22);
      g.font = '17px Bungee'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(ro.name.slice(0, 11), x + 32, 38);
      for (let k = 0; k < WIN; k++) { g.fillStyle = k < score[i] ? '#ffd23f' : 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(x + 196 + k * 24, 37, 8, 0, 7); g.fill(); }
    });
    const me = P[mine];
    if (me && !K.bot) { g.font = '14px Bungee'; g.textAlign = 'center'; g.fillStyle = me.dcd > 0 ? 'rgba(255,255,255,.4)' : '#5cf28a'; g.fillText(me.dcd > 0 ? 'DASH ' + me.dcd.toFixed(1) : 'DASH READY', 1180, 690); if (joy) { g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 3; g.beginPath(); g.arc(joy.ox, joy.oy, 80, 0, 7); g.stroke(); } }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (phase === 'count') { const n = Math.ceil(phaseT - .2); big(g, n > 0 ? String(n) : 'GO!', `ROUND ${round}`); }
    if (phase === 'fight' && tRound < .7) big(g, 'BRAWL!', '');
    if (phase === 'end') big(g, winner >= 0 ? `${roster[winner].name}` : 'DRAW', matchWin >= 0 ? 'WINS THE MATCH!' : 'takes the round', winner >= 0 ? roster[winner].col : '#fff');
  };
  function big(g, a, b, c = '#fff') { g.font = '86px Bungee'; g.lineWidth = 12; g.strokeStyle = 'rgba(0,0,0,.55)'; g.strokeText(a, CX, 300); g.fillStyle = c; g.fillText(a, CX, 300); if (b) { g.font = '30px Bungee'; g.strokeText(b, CX, 368); g.fillStyle = '#fff'; g.fillText(b, CX, 368); } }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k)))); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; }
  // cover art: two cars smashing together mid-arena, one tumbling off the edge
  let posed = 0;
  GAME.pose = () => {
    phase = 'fight'; tRound = 5; R = 300; items = [{ x: 500, y: 520, k: 'mega', t: 0 }]; posed = 1;
    const set = [[576, 410, -.1, 1, 0], [706, 396, Math.PI - .1, 0, 1], [905, 520, 2.6, 0, 0], [420, 270, .6, 0, 0]];
    P.forEach((p, i) => { const q = set[i]; Object.assign(p, { x: q[0], y: q[1], a: q[2], dash: q[3] ? .2 : 0, mega: q[4] ? 3 : 0, vx: Math.cos(q[2]) * 700 * q[3], vy: Math.sin(q[2]) * 700 * q[3], stun: 0, alive: i !== 2, fall: i === 2 ? .22 : 0 }); });
  };
  if (/[?&]test/.test(location.search)) window.BB = { get P() { return P; }, get mode() { return mode; }, get phase() { return phase; }, get score() { return score; } };
})();
