/* Paint Wars: up to 4 players roll paint over the floor for 75 seconds; whoever covers the most tiles wins.
   Paint bombs, speed, big brushes, and dash into rivals to stun them and splat them with your color.
   Online rooms through the shared MP lobby; the host runs the floor, the bots and every pickup, and sends paint changes. */
// @use mp
const GAME = {
  id: 'paint-wars', title: 'Paint Wars', tagline: 'Cover the floor in your color. Splat your friends.',
  font: 'Lilita One', accent: '#ff4d6d', accent2: '#3ec5ff', bg: '#1a1530', noSkins: true, noHud: true, scoreLabel: 'Tiles painted',
  how: ['Move with WASD or the arrow keys (or drag on the left side). Everywhere you roll turns your color.', 'Space (or tap the right side) to DASH. Dash into a rival to stun them and splat your paint around them.', 'Pick up BOMB to splash a big circle, ZOOM for speed and BRUSH for a wide roller.', 'Most floor painted after 75 seconds wins.'],
  skins: [{ name: 'Default', price: 0, c: ['#fff'] }],
};
(() => {
  const GW = 40, GH = 21, TS = 30, OX = 40, OY = 72, ROUND = 75;
  let mode = 'lobby', roster = [], P = [], grid = new Int8Array(GW * GH), solid = new Uint8Array(GW * GH), items = [], tLeft = ROUND, phase = 'count', phaseT = 3, changes = [], inputs = {}, sendT = 0, stateT = 0, fullT = 0, itemT = 4, mine = 0, joy = null, dashKey = false, layout = 0;
  const board = document.createElement('canvas'); board.width = GW * TS; board.height = GH * TS; const bg2 = board.getContext('2d');
  const blob = Array.from({ length: GW * GH }, () => Array.from({ length: 3 }, () => [Math.random() * 10 - 5, Math.random() * 10 - 5, 9 + Math.random() * 6]));
  const host = () => MP.isHost();
  Object.assign(MP.opts, {
    max: 4, min: 1, bots: 4, solo: 'Play with 3 bots', sub: '2 to 4 players. Bots fill any empty seats.',
    config: () => ({ layout: Math.floor(Math.random() * 3) }),
    onStart: (cfg, ros) => startMatch(cfg, ros),
    onMsg: m => {
      if (m.t === 'in' && host()) inputs[m.from] = m;
      if (m.t === 's' && !host()) applyState(m);
    },
    onLeave: id => { if (mode !== 'play') return; if (id === -1 || !MP.online()) return endMatch('Lost the connection to the room.'); const p = P.find(q => q.id === id); if (p) { p.bot = true; p.name += ' (bot)'; } },
    onHost: () => { if (mode === 'play') endMatch('The host left the room.'); },
  });
  const LAYOUTS = [
    (x, y) => (x === 10 || x === 29) && y > 5 && y < 15 && (y < 9 || y > 11),
    (x, y) => [[8, 5], [31, 5], [8, 15], [31, 15], [19, 10], [20, 10]].some(([a, b]) => Math.abs(x - a) <= 1 && Math.abs(y - b) <= 1),
    (x, y) => (y === 7 || y === 13) && x > 6 && x < 33 && (x < 17 || x > 22),
  ];
  function startMatch(cfg, ros) {
    roster = ros; layout = cfg.layout || 0; mode = 'play'; phase = 'count'; phaseT = 3; tLeft = ROUND; items = []; itemT = 4; changes = []; K.score = 0;
    mine = K.bot ? -1 : Math.max(0, ros.findIndex(r => r.id === MP.id && !r.bot));
    grid.fill(-1); solid.fill(0);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (LAYOUTS[layout](x, y)) solid[y * GW + x] = 1;
    const spots = [[3, 3], [GW - 4, GH - 4], [GW - 4, 3], [3, GH - 4]];
    P = ros.map((r, i) => ({ i, id: r.id, name: r.name, col: r.col, bot: !!r.bot, x: OX + (spots[i][0] + .5) * TS, y: OY + (spots[i][1] + .5) * TS, vx: 0, vy: 0, a: 0, dcd: 0, dash: 0, stun: 0, zoom: 0, brush: 0, score: 0 }));
    redraw();
  }
  function endMatch(why) {
    if (mode !== 'play') return; mode = 'over';
    const counts = count(), best = counts.indexOf(Math.max(...counts)), won = best === mine;
    K.score = mine >= 0 ? counts[mine] : 0; if (won) K.coin(10);
    K.over({ title: why ? 'Match ended' : won ? 'You win!' : `${roster[best].name} wins!`, text: why || roster.map((r, i) => `${r.name} ${Math.round(counts[i] / paintable() * 100)}%`).join(' · '), delay: 300 });
  }
  const paintable = () => GW * GH - solid.reduce((a, b) => a + b, 0);
  function count() { const c = roster.map(() => 0); for (let i = 0; i < grid.length; i++) if (grid[i] >= 0) c[grid[i]]++; return c; }
  function paint(cx, cy, r, who) {
    const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r), y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
    for (let y = Math.max(0, y0); y <= Math.min(GH - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(GW - 1, x1); x++) {
      const i = y * GW + x; if (solid[i] || grid[i] === who || Math.hypot(x + .5 - cx, y + .5 - cy) > r + .25) continue;
      grid[i] = who; changes.push(i, who); drawTile(i);
    }
  }
  /* ---------- simulation (host) ---------- */
  function ctl(p) {
    if (p.bot) return botCtl(p);
    if (p.i === mine) return { ax: myAx(), ay: myAy(), d: dashKey };
    const m = inputs[p.id]; return m ? { ax: m.ax || 0, ay: m.ay || 0, d: !!m.d } : { ax: 0, ay: 0, d: false };
  }
  function botCtl(p) {
    p.think = (p.think || 0) - 1 / 60;
    if (p.think <= 0 || !p.goal) {
      p.think = .8 + Math.random() * 1.2;
      const rival = P.filter(q => q !== p && q.stun <= 0 && Math.hypot(q.x - p.x, q.y - p.y) < 160)[0];
      if (rival && Math.random() < .3) p.goal = { x: rival.x, y: rival.y, hunt: rival };
      else if (items.length && Math.random() < .4) p.goal = { x: items[0].x, y: items[0].y };
      else { let best = null, bs = -1; for (let k = 0; k < 14; k++) { const x = Math.floor(Math.random() * GW), y = Math.floor(Math.random() * GH), i = y * GW + x; if (solid[i]) continue; const sc = (grid[i] !== p.i ? 3 : 0) + (grid[i] >= 0 && grid[i] !== p.i ? 1 : 0) - Math.hypot(OX + x * TS - p.x, OY + y * TS - p.y) / 300 + Math.random(); if (sc > bs) { bs = sc; best = { x: OX + (x + .5) * TS, y: OY + (y + .5) * TS }; } } p.goal = best; }
    }
    const g = p.goal.hunt ? { x: p.goal.hunt.x, y: p.goal.hunt.y } : p.goal, dx = g.x - p.x, dy = g.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d < 16 && !p.goal.hunt) p.think = 0;
    return { ax: dx / d * .9, ay: dy / d * .9, d: !!p.goal.hunt && d < 110 && Math.random() < .05 };
  }
  function blocked(x, y) { const gx = Math.floor((x - OX) / TS), gy = Math.floor((y - OY) / TS); return gx < 0 || gy < 0 || gx >= GW || gy >= GH || solid[gy * GW + gx]; }
  function sim(dt) {
    if (phase === 'count') { phaseT -= dt; if (phaseT <= 0) phase = 'play'; return; }
    if (phase === 'end') return;
    tLeft -= dt; if (tLeft <= 0) { tLeft = 0; phase = 'end'; ev('end', 640, 360); setTimeout(() => endMatch(), 2600); return; }
    itemT -= dt;
    if (itemT <= 0 && items.length < 3) { itemT = 5 + Math.random() * 4; for (let k = 0; k < 20; k++) { const x = Math.floor(Math.random() * GW), y = Math.floor(Math.random() * GH); if (!solid[y * GW + x]) { items.push({ x: OX + (x + .5) * TS, y: OY + (y + .5) * TS, k: K.pick(['bomb', 'bomb', 'zoom', 'brush']) }); break; } } }
    for (const p of P) {
      const c = ctl(p); let ax = c.ax, ay = c.ay; const l = Math.hypot(ax, ay); if (l > 1) { ax /= l; ay /= l; }
      p.dcd = Math.max(0, p.dcd - dt); p.dash = Math.max(0, p.dash - dt); p.stun = Math.max(0, p.stun - dt); p.zoom = Math.max(0, p.zoom - dt); p.brush = Math.max(0, p.brush - dt);
      if (p.stun > 0) { ax = ay = 0; }
      if (c.d && p.dcd <= 0 && p.stun <= 0) { const da = l > .1 ? Math.atan2(ay, ax) : p.a; p.vx = Math.cos(da) * 700; p.vy = Math.sin(da) * 700; p.dash = .22; p.dcd = 2; ev('dash', p.x, p.y, p.i); }
      const sp = p.zoom > 0 ? 330 : 215;
      if (p.dash <= 0) { p.vx += (ax * sp - p.vx) * Math.min(1, dt * 10); p.vy += (ay * sp - p.vy) * Math.min(1, dt * 10); }
      if (l > .1) p.a = Math.atan2(ay, ax);
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, r = 12;
      if (!blocked(nx + Math.sign(p.vx) * r, p.y)) p.x = nx; else p.vx = 0;
      if (!blocked(p.x, ny + Math.sign(p.vy) * r)) p.y = ny; else p.vy = 0;
      paint((p.x - OX) / TS, (p.y - OY) / TS, p.brush > 0 ? 1.6 : .55, p.i);
    }
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const a = P[i], b = P[j], d = Math.hypot(a.x - b.x, a.y - b.y); if (d > 28) continue;
      for (const [x, y] of [[a, b], [b, a]]) if (x.dash > 0 && y.stun <= 0) { y.stun = 1.3; paint((y.x - OX) / TS, (y.y - OY) / TS, 2.2, x.i); ev('splat', y.x, y.y, x.i); }
      const nx = (b.x - a.x) / (d || 1), ny = (b.y - a.y) / (d || 1), ov = 28 - d; a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
    }
    for (const p of P) for (let k = items.length - 1; k >= 0; k--) { const it = items[k]; if (Math.hypot(it.x - p.x, it.y - p.y) < 26) { items.splice(k, 1); if (it.k === 'bomb') paint((it.x - OX) / TS, (it.y - OY) / TS, 4.2, p.i); if (it.k === 'zoom') p.zoom = 5; if (it.k === 'brush') p.brush = 6; ev('pick_' + it.k, it.x, it.y, p.i); } }
  }
  const evs = [];
  function ev(k, x, y, i = -1) { evs.push([k, Math.round(x), Math.round(y), i]); fxEv(k, x, y, i); }
  function fxEv(k, x, y, i) {
    const c = i >= 0 && roster[i] ? roster[i].col : '#fff';
    if (k === 'dash') { K.sfx(300, .12, 'sawtooth', .06, 400); }
    if (k === 'splat') { K.burst(x, y, [c, '#fff'], 24, 360, { life: .5, size: 9 }); K.noise(.18, .2, 500); K.sfx(140, .2, 'square', .1, -60); K.shake(10); }
    if (k === 'pick_bomb') { K.burst(x, y, [c, c, '#fff'], 40, 520, { life: .7, size: 11, gravity: 200 }); K.noise(.35, .25, 300); K.sfx(90, .4, 'square', .12, -40); K.shake(16); }
    if (k === 'pick_zoom' || k === 'pick_brush') K.chime(660, [0, 4, 7, 12]);
    if (k === 'end') K.chime(523, [0, 4, 7, 12, 16]);
  }
  /* ---------- network ---------- */
  function applyState(m) {
    if (mode !== 'play') return;
    m.p.forEach((d, i) => { const p = P[i]; if (!p) return; p.tx = d[0]; p.ty = d[1]; p.a = d[2]; p.dash = d[3] & 1 ? .1 : 0; p.stun = d[3] & 2 ? .1 : 0; p.zoom = d[3] & 4 ? 1 : 0; p.brush = d[3] & 8 ? 1 : 0; p.dcd = d[4]; });
    for (let k = 0; k < m.c.length; k += 2) { if (grid[m.c[k]] !== m.c[k + 1]) { grid[m.c[k]] = m.c[k + 1]; drawTile(m.c[k]); } }
    if (m.full) { for (let i = 0; i < m.full.length; i++) { const v = m.full.charCodeAt(i) - 48; if (grid[i] !== v) { grid[i] = v; drawTile(i); } } }
    items = m.it.map(d => ({ x: d[0], y: d[1], k: d[2] })); tLeft = m.tl; phase = m.ph; phaseT = m.pt;
    for (const e of m.ev) fxEv(e[0], e[1], e[2], e[3]);
    if (phase === 'end' && !m.ended) { m.ended = 1; if (!P.endT) { P.endT = 1; setTimeout(() => endMatch(), 2600); } }
  }
  /* ---------- input ---------- */
  const keys = {};
  const myAx = () => (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + (joy ? joy.dx : 0);
  const myAy = () => (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + (joy ? joy.dy : 0);
  GAME.key = (c, d) => { keys[c] = d; if (c === 'Space' || c === 'Enter') dashKey = d; };
  GAME.down = (x, y, e) => { if (x < 760) joy = { id: e && e.pointerId, ox: x, oy: y, dx: 0, dy: 0 }; else dashKey = true; };
  GAME.move = (x, y, e) => { if (joy && (!e || e.pointerId === joy.id)) { const dx = (x - joy.ox) / 70, dy = (y - joy.oy) / 70, l = Math.hypot(dx, dy); joy.dx = l > 1 ? dx / l : dx; joy.dy = l > 1 ? dy / l : dy; } };
  GAME.up = (x, y, e) => { if (joy && (!e || e.pointerId === joy.id)) joy = null; else dashKey = false; };
  GAME.reset = () => {
    for (const k in keys) keys[k] = false; joy = null; dashKey = false; inputs = {}; P.endT = 0;
    if (K.bot) return startMatch({ layout: Math.floor(Math.random() * 3) }, ['Blip', 'Zap', 'Mango', 'Pixel'].map((n, i) => ({ id: 'b' + i, name: 'Bot ' + n, col: MP.colors[i], bot: true, seat: i })));
    mode = 'lobby'; P = []; grid.fill(-1); solid.fill(0); redraw(); MP.show();
  };
  GAME.update = dt => {
    if (mode !== 'play') return;
    if (host()) {
      sim(dt);
      if (MP.online()) { stateT -= dt; fullT -= dt; if (stateT <= 0) { stateT = 1 / 15; const m = { t: 's', p: P.map(p => [Math.round(p.x), Math.round(p.y), +p.a.toFixed(2), (p.dash > 0 ? 1 : 0) | (p.stun > 0 ? 2 : 0) | (p.zoom > 0 ? 4 : 0) | (p.brush > 0 ? 8 : 0), +p.dcd.toFixed(1)]), c: changes.splice(0), it: items.map(it => [Math.round(it.x), Math.round(it.y), it.k]), tl: +tLeft.toFixed(1), ph: phase, pt: +phaseT.toFixed(1), ev: evs.splice(0) }; if (fullT <= 0) { fullT = 2; m.full = Array.from(grid, v => String.fromCharCode(48 + v)).join(''); } MP.send(m); } }
      else { changes.length = 0; evs.length = 0; }
    } else {
      sendT -= dt; if (sendT <= 0) { sendT = 1 / 20; MP.to(MP.hostId, { t: 'in', ax: +myAx().toFixed(2), ay: +myAy().toFixed(2), d: dashKey ? 1 : 0 }); }
      for (const p of P) { if (p.tx === undefined) continue; p.x += (p.tx - p.x) * Math.min(1, dt * 14); p.y += (p.ty - p.y) * Math.min(1, dt * 14); }
      if (phase === 'count') phaseT -= dt;
    }
    for (const p of P) { p.drip = (p.drip || 0) - dt; if (p.drip <= 0 && phase === 'play') { p.drip = .12; K.burst(p.x, p.y + 6, [p.col], 1, 30, { life: .4, size: 5, gravity: 80 }); } }
  };
  /* ---------- drawing ---------- */
  function drawTile(i) {
    const x = (i % GW) * TS, y = Math.floor(i / GW) * TS;
    bg2.save(); bg2.beginPath(); bg2.rect(x - 6, y - 6, TS + 12, TS + 12); bg2.clip();
    if (solid[i]) { bg2.fillStyle = '#2b2546'; bg2.fillRect(x, y, TS, TS); bg2.fillStyle = '#3a3360'; bg2.fillRect(x + 2, y + 2, TS - 4, TS - 8); bg2.restore(); return; }
    bg2.fillStyle = ((i % GW) + Math.floor(i / GW)) % 2 ? '#e9e4da' : '#e1dbcf'; bg2.fillRect(x, y, TS, TS);
    const o = grid[i];
    if (o >= 0) { const c = roster[o] ? roster[o].col : '#888'; bg2.fillStyle = c; bg2.fillRect(x + 1, y + 1, TS - 2, TS - 2); for (const [dx, dy, r] of blob[i]) { bg2.beginPath(); bg2.arc(x + TS / 2 + dx, y + TS / 2 + dy, r, 0, 7); bg2.fill(); } bg2.fillStyle = 'rgba(255,255,255,.18)'; bg2.beginPath(); bg2.arc(x + TS / 2 - 4, y + TS / 2 - 5, 4, 0, 7); bg2.fill(); }
    bg2.restore();
  }
  function redraw() { bg2.clearRect(0, 0, board.width, board.height); for (let i = 0; i < GW * GH; i++) drawTile(i); }
  GAME.draw = g => {
    const v = K.view, t = K.t;
    if (posed) { g.translate(640, 400); g.scale(1.55, 1.55); g.translate(-640, -400); }
    const bgG = g.createLinearGradient(0, v.y0, 0, v.y1); bgG.addColorStop(0, '#231c42'); bgG.addColorStop(1, '#120e24'); g.fillStyle = bgG; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.roundRect(OX - 10, OY - 4, GW * TS + 20, GH * TS + 22, 14); g.fill();
    g.drawImage(board, OX, OY);
    g.strokeStyle = '#3a3360'; g.lineWidth = 6; g.strokeRect(OX - 3, OY - 3, GW * TS + 6, GH * TS + 6);
    for (const it of items) {
      const b = Math.sin(t * 5 + it.x) * 3, c = it.k === 'bomb' ? '#ff4d6d' : it.k === 'zoom' ? '#5cf28a' : '#ffd23f';
      g.save(); g.translate(it.x, it.y + b); g.shadowColor = c; g.shadowBlur = 16; g.fillStyle = '#1a1530'; g.beginPath(); g.arc(0, 0, 15, 0, 7); g.fill(); g.shadowBlur = 0; g.fillStyle = c; g.beginPath(); g.arc(0, 0, 12, 0, 7); g.fill();
      g.fillStyle = '#1a1530'; g.font = '15px "Lilita One"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(it.k === 'bomb' ? '💣' : it.k === 'zoom' ? '»' : 'W', 0, 1); g.restore();
    }
    for (const p of P) {
      if (p.x === undefined) continue;
      g.save(); g.translate(p.x, p.y);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 12, 17, 7, 0, 0, 7); g.fill();
      if (p.brush > 0) { g.strokeStyle = p.col; g.globalAlpha = .35; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 44, 0, 7); g.stroke(); g.globalAlpha = 1; }
      const sq = p.dash > 0 ? 1.25 : 1, wob = Math.sin(t * 12 + p.i) * (p.stun > 0 ? .15 : .04);
      g.rotate(wob); g.scale(sq, 2 - sq);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 17, 0, 7); g.fill();
      const bgr = g.createRadialGradient(-5, -6, 2, 0, 0, 15); bgr.addColorStop(0, '#fff'); bgr.addColorStop(.25, p.col); bgr.addColorStop(1, p.col); g.fillStyle = bgr; g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fill();
      const ex = Math.cos(p.a) * 4, ey = Math.sin(p.a) * 4;
      for (const s of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 5 + ex * .5, -3 + ey * .5, 4.5, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(s * 5 + ex, -3 + ey, 2.2, 0, 7); g.fill(); }
      if (p.stun > 0) { g.fillStyle = '#111'; g.font = '14px "Lilita One"'; g.textAlign = 'center'; g.fillText('@@', 0, -20); }
      g.restore();
      g.font = '14px "Lilita One"'; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(p.name, p.x + 1, p.y - 25); g.fillStyle = '#fff'; g.fillText(p.name, p.x, p.y - 26);
      if (p.i === mine && !K.bot) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(p.x - 6, p.y - 44); g.lineTo(p.x + 6, p.y - 44); g.lineTo(p.x, p.y - 36); g.fill(); }
    }
    if (posed) { g.fillStyle = MP.colors[1]; for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, r = 70 + (k % 4) * 18; g.beginPath(); g.arc(645 + Math.cos(a) * r, 395 + Math.sin(a) * r, 7 + (k % 3) * 4, 0, 7); g.fill(); } return; }
    if (mode !== 'play') return;
    // top bar: share of the floor
    const c = count(), tot = paintable();
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.roundRect(OX, 14, 900, 40, 12); g.fill();
    let x = OX + 6; c.forEach((n, i) => { const w = 888 * n / tot; g.fillStyle = roster[i].col; g.fillRect(x, 20, w, 28); if (w > 46) { g.fillStyle = '#1a1530'; g.font = '17px "Lilita One"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(Math.round(n / tot * 100) + '%', x + w / 2, 35); } x += w; });
    g.fillStyle = tLeft < 10 && Math.sin(t * 8) > 0 ? '#ff4d6d' : '#fff'; g.font = '40px "Lilita One"'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(`${Math.floor(tLeft / 60)}:${String(Math.ceil(tLeft) % 60).padStart(2, '0')}`, 1240, 36);
    const me = P[mine];
    if (me && !K.bot) { g.font = '16px "Lilita One"'; g.textAlign = 'center'; g.fillStyle = me.dcd > 0 ? 'rgba(255,255,255,.45)' : '#5cf28a'; g.fillText(me.dcd > 0 ? `DASH ${me.dcd.toFixed(1)}` : 'DASH READY', 1180, 704); }
    if (joy) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(joy.ox, joy.oy, 70, 0, 7); g.stroke(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const big = (a, b, col = '#fff') => { g.font = '96px "Lilita One"'; g.lineWidth = 14; g.strokeStyle = '#1a1530'; g.strokeText(a, 640, 330); g.fillStyle = col; g.fillText(a, 640, 330); if (b) { g.font = '32px "Lilita One"'; g.lineWidth = 8; g.strokeText(b, 640, 400); g.fillStyle = '#fff'; g.fillText(b, 640, 400); } };
    if (phase === 'count') big(Math.ceil(phaseT) > 0 ? String(Math.ceil(phaseT)) : 'GO!', 'Paint everything!');
    if (phase === 'play' && tLeft > ROUND - .8) big('SPLAT!', '');
    if (phase === 'end') { const b = c.indexOf(Math.max(...c)); big(`${roster[b].name} wins!`, `${Math.round(c[b] / tot * 100)}% of the floor`, roster[b].col); }
  };
  // cover art: four colors fighting over the floor, a paint bomb going off in the middle
  let posed = 0;
  GAME.pose = () => {
    phase = 'play'; tLeft = 41; posed = 1; solid.fill(0); for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (LAYOUTS[0](x, y)) solid[y * GW + x] = 1;
    const seeds = [[12, 6], [27, 6], [12, 15], [27, 15]];
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const i = y * GW + x; if (solid[i]) continue; let b = 0, bd = 1e9; seeds.forEach(([sx, sy], k) => { const d = Math.hypot(x - sx, y - sy) + Math.sin(x * .9 + y * .7 + k) * 2.2; if (d < bd) { bd = d; b = k; } }); grid[i] = bd < 9 + Math.sin(x * 1.3 + y) * 2 ? b : -1; }
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (Math.hypot(x - 19.5, y - 10.5) < 3.6 && !solid[y * GW + x]) grid[y * GW + x] = 1;
    redraw();
    [[560, 330, .4], [660, 400, 2.6], [520, 470, -.8], [790, 320, 3.6]].forEach(([x, y, a], i) => { if (P[i]) Object.assign(P[i], { x, y, a, dash: i === 1 ? .2 : 0, stun: i === 2 ? 1 : 0 }); });
  };
  if (/[?&]test/.test(location.search)) window.PW = { get P() { return P; }, get mode() { return mode; }, count, get grid() { return grid; } };
})();
