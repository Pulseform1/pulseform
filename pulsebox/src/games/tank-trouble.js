/* Tank Trouble: two tanks in a maze, bullets bounce off the walls (and can hit you). First to 5 rounds.
   One player vs the computer, or two players on one keyboard. */
const GAME = {
  id: 'tank-trouble', title: 'Tank Trouble', tagline: 'Bouncing bullets. Tight mazes. One hit and you\'re out.',
  font: 'Black Ops One', accent: '#8bd450', accent2: '#ff6b4a', bg: '#1d2a1a', scoreLabel: 'Rounds won', noHud: true,
  how: ['Player 1: WASD to drive, Space to fire. On touch: drag to drive, tap FIRE.', 'Player 2: arrow keys to drive, Enter or / to fire.', 'Bullets bounce. Careful: your own bullets can hit you too!'],
  skins: [
    { name: 'Olive', price: 0, c: ['#6f9a3a', '#3e5a1e'] }, { name: 'Desert', price: 60, c: ['#d2b26a', '#8a6a2a'] }, { name: 'Arctic', price: 150, c: ['#e6eef2', '#8aa0aa'] },
    { name: 'Crimson', price: 250, c: ['#d24a3a', '#7a1f1a'] }, { name: 'Night', price: 400, c: ['#3a3a4a', '#1a1a22'] }, { name: 'Gold', price: 700, c: ['#ffd23f', '#b07a10'] },
  ],
};
(() => {
  const CW = 120, MX = 10, MY = 6, OX = (W - MX * CW) / 2, OY = 0, WT = 8, TR = 20, BS = 330, MAXB = 5;
  let walls, tanks, bullets, mode, round, wins, roundOver, pickups, pickT, keys, joy, msg, msgT, trailMarks;
  GAME.drawSkin = (gr, s) => tank(gr, { x: 0, y: 0, a: -Math.PI / 2, c: s.c }, 1.6);
  function maze() {
    const cells = Array.from({ length: MX * MY }, () => ({ v: false, r: true, b: true }));
    const st = [0]; cells[0].v = true;
    while (st.length) {
      const i = st[st.length - 1], x = i % MX, y = (i / MX) | 0, n = [];
      if (x < MX - 1 && !cells[i + 1].v) n.push([i + 1, 'r', i]); if (x > 0 && !cells[i - 1].v) n.push([i - 1, 'r', i - 1]);
      if (y < MY - 1 && !cells[i + MX].v) n.push([i + MX, 'b', i]); if (y > 0 && !cells[i - MX].v) n.push([i - MX, 'b', i - MX]);
      if (!n.length) { st.pop(); continue; }
      const [j, side, owner] = K.pick(n); cells[owner][side] = false; cells[j].v = true; st.push(j);
    }
    for (let k = 0; k < 14; k++) { const i = K.irand(0, MX * MY - 1); if (Math.random() < .5 && i % MX < MX - 1) cells[i].r = false; else if (((i / MX) | 0) < MY - 1) cells[i].b = false; }
    walls = [];
    const add = (x, y, w, h) => walls.push({ x: OX + x, y: OY + y, w, h });
    add(-WT / 2, -WT / 2, MX * CW + WT, WT); add(-WT / 2, MY * CW - WT / 2, MX * CW + WT, WT); add(-WT / 2, -WT / 2, WT, MY * CW + WT); add(MX * CW - WT / 2, -WT / 2, WT, MY * CW + WT);
    cells.forEach((c, i) => { const x = (i % MX) * CW, y = ((i / MX) | 0) * CW; if (c.r && i % MX < MX - 1) add(x + CW - WT / 2, y - WT / 2, WT, CW + WT); if (c.b && ((i / MX) | 0) < MY - 1) add(x - WT / 2, y + CW - WT / 2, CW + WT, WT); });
    GAME._cells = cells;
  }
  const hitWall = (x, y, r) => walls.find(w => x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h);
  function newRound() {
    maze(); bullets = []; pickups = []; pickT = 6; roundOver = 0; trailMarks = [];
    const spots = [[0, 0], [MX - 1, MY - 1], [MX - 1, 0], [0, MY - 1]], sp = Math.random() < .5 ? [spots[0], spots[1]] : [spots[2], spots[3]];
    const sk = K.skin, cpuSkin = GAME.skins[(GAME.skins.indexOf(sk) + 3) % GAME.skins.length];
    tanks = [
      { x: OX + sp[0][0] * CW + CW / 2, y: OY + sp[0][1] * CW + CW / 2, a: 0, c: sk.c, alive: true, cd: 0, power: null, pt: 0, id: 0, ai: mode === 'cpu' && K.bot },
      { x: OX + sp[1][0] * CW + CW / 2, y: OY + sp[1][1] * CW + CW / 2, a: Math.PI, c: mode === 'cpu' ? cpuSkin.c : ['#4a8ad2', '#1e3a6a'], alive: true, cd: 0, power: null, pt: 0, id: 1, ai: mode === 'cpu' },
    ];
    tanks[0].a = Math.atan2(tanks[1].y - tanks[0].y, tanks[1].x - tanks[0].x); tanks[1].a = tanks[0].a + Math.PI;
  }
  GAME.reset = () => { mode = K.bot ? 'cpu' : null; round = 0; wins = [0, 0]; keys = {}; joy = null; msg = ''; msgT = 0; newRound(); if (K.bot) tanks[0].ai = true; };
  function fire(t) {
    if (!t.alive || t.cd > 0 || roundOver) return;
    if (bullets.filter(b => b.o === t.id).length >= MAXB && t.power !== 'rapid') return;
    t.cd = t.power === 'rapid' ? .12 : .32;
    const shots = t.power === 'shotgun' ? [-.25, -.12, 0, .12, .25] : [0];
    for (const da of shots) { const a = t.a + da; bullets.push({ x: t.x + Math.cos(a) * (TR + 8), y: t.y + Math.sin(a) * (TR + 8), vx: Math.cos(a) * BS, vy: Math.sin(a) * BS, life: t.power === 'shotgun' ? 1.6 : 7, o: t.id, safe: .12 }); }
    if (t.power === 'shotgun') t.power = null;
    K.sfx(180, .12, 'square', .1, -80); K.noise(.06, .12, 1500);
  }
  /* ---------- input ---------- */
  const MB = [{ x: 330, y: 300, w: 280, h: 140, m: 'cpu', t: 'vs Computer' }, { x: 670, y: 300, w: 280, h: 140, m: '2p', t: '2 Players' }];
  const FIRE = { x: 1180, y: 620, r: 60 };
  GAME.down = (x, y, e) => {
    if (!mode) { for (const b of MB) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) { mode = b.m; newRound(); } return; }
    if (K.dist(x, y, FIRE.x, FIRE.y) < FIRE.r) return fire(tanks[0]);
    if (e.pointerType !== 'mouse' || true) joy = { sx: x, sy: y, x, y };
  };
  GAME.move = (x, y) => { if (joy) { joy.x = x; joy.y = y; } };
  GAME.up = () => { joy = null; };
  GAME.key = (c, d) => {
    keys[c] = d; if (!d) return;
    if (!mode) { if (c === 'Digit1') { mode = 'cpu'; newRound(); } if (c === 'Digit2') { mode = '2p'; newRound(); } return; }
    if (c === 'Space') fire(tanks[0]); if ((c === 'Enter' || c === 'Slash' || c === 'Numpad0') && mode === '2p') fire(tanks[1]);
  };
  GAME.bot = () => {};
  /* ---------- AI ---------- */
  function los(a, b) { const n = Math.ceil(K.dist(a.x, a.y, b.x, b.y) / 10); for (let i = 1; i < n; i++) { const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n; if (hitWall(x, y, 2)) return false; } return true; }
  const cellOf = t => K.clamp(Math.floor((t.y - OY) / CW), 0, MY - 1) * MX + K.clamp(Math.floor((t.x - OX) / CW), 0, MX - 1);
  function path(from, to) {
    const cells = GAME._cells, prev = new Map([[from, -1]]), q = [from];
    for (let h = 0; h < q.length && !prev.has(to); h++) { const i = q[h], x = i % MX, y = (i / MX) | 0;
      const nb = []; if (x < MX - 1 && !cells[i].r) nb.push(i + 1); if (x > 0 && !cells[i - 1].r) nb.push(i - 1); if (y < MY - 1 && !cells[i].b) nb.push(i + MX); if (y > 0 && !cells[i - MX].b) nb.push(i - MX);
      for (const j of nb) if (!prev.has(j)) { prev.set(j, i); q.push(j); } }
    let k = to, step = to; while (prev.has(k) && prev.get(k) !== from && prev.get(k) !== -1) { step = prev.get(k); k = step; }
    return step;
  }
  function think(t, dt) {
    const foe = tanks[1 - t.id]; if (!foe.alive) return { turn: 0, go: 0 };
    const skill = mode === 'cpu' && !K.bot ? Math.min(1, .45 + wins[0] * .12) : .8;
    t.think = (t.think || 0) - dt;
    // dodge a bullet heading this way
    for (const b of bullets) { const d = K.dist(b.x, b.y, t.x, t.y); if (d < 120 && b.safe <= 0 && (b.vx * (t.x - b.x) + b.vy * (t.y - b.y)) > 0 && Math.random() < skill * .6) { const away = Math.atan2(b.vx, -b.vy); return steer(t, away, 1); } }
    if (los(t, foe)) {
      const want = Math.atan2(foe.y - t.y, foe.x - t.x) + (1 - skill) * Math.sin(K.t * 3) * .3, r = steer(t, want, 0);
      if (Math.abs(angDiff(want, t.a)) < .12 && Math.random() < skill * .12) fire(t);
      return r;
    }
    const nx = path(cellOf(t), cellOf(foe)), tx = OX + (nx % MX) * CW + CW / 2, ty = OY + ((nx / MX) | 0) * CW + CW / 2;
    return steer(t, Math.atan2(ty - t.y, tx - t.x), 1);
  }
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; return d; };
  const steer = (t, want, go) => { const d = angDiff(want, t.a); return { turn: K.clamp(d * 4, -1, 1), go: Math.abs(d) < .6 ? go : 0 }; };
  /* ---------- update ---------- */
  GAME.update = dt => {
    if (!mode) return;
    msgT -= dt;
    if (roundOver) { roundOver -= dt; if (roundOver <= 0) { if (Math.max(...wins) >= 5) { if (K.bot) { wins = [0, 0]; newRound(); return; } const won = wins[0] >= 5; K.over({ title: won ? (mode === 'cpu' ? 'Victory!' : 'Player 1 wins!') : (mode === 'cpu' ? 'Defeated' : 'Player 2 wins!'), text: `Final score ${wins[0]} to ${wins[1]}.` }); return; } newRound(); } }
    for (const t of tanks) {
      if (!t.alive) continue; t.cd -= dt; if (t.power) { t.pt -= dt; if (t.pt <= 0) t.power = null; }
      let turn = 0, go = 0;
      if (t.ai) ({ turn, go } = think(t, dt));
      else if (t.id === 0) {
        if (keys.KeyA) turn = -1; if (keys.KeyD) turn = 1; if (keys.KeyW) go = 1; if (keys.KeyS) go = -.6;
        if (mode === 'cpu') { if (keys.ArrowLeft) turn = -1; if (keys.ArrowRight) turn = 1; if (keys.ArrowUp) go = 1; if (keys.ArrowDown) go = -.6; }
        if (joy && K.dist(joy.x, joy.y, joy.sx, joy.sy) > 14) { const want = Math.atan2(joy.y - joy.sy, joy.x - joy.sx); ({ turn, go } = steer(t, want, 1)); }
      } else { if (keys.ArrowLeft) turn = -1; if (keys.ArrowRight) turn = 1; if (keys.ArrowUp) go = 1; if (keys.ArrowDown) go = -.6; }
      t.a += turn * 3.4 * dt;
      const sp = 150 * go, nx = t.x + Math.cos(t.a) * sp * dt, ny = t.y + Math.sin(t.a) * sp * dt;
      if (!hitWall(nx, t.y, TR - 4)) t.x = nx; if (!hitWall(t.x, ny, TR - 4)) t.y = ny;
      if (go && Math.random() < .3) trailMarks.push({ x: t.x, y: t.y, a: t.a, l: 3 });
      for (const p of pickups) if (!p.got && K.dist(p.x, p.y, t.x, t.y) < 30) { p.got = true; t.power = p.k; t.pt = p.k === 'rapid' ? 5 : 30; K.chime(660, [0, 7]); if (t.id === 0 || mode === '2p') { msg = p.k === 'rapid' ? 'Rapid fire!' : 'Shotgun!'; msgT = 1.5; } }
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]; b.life -= dt; b.safe -= dt; if (b.life <= 0) { bullets.splice(i, 1); continue; }
      for (let s = 0; s < 3; s++) {
        const sx = b.vx * dt / 3, sy = b.vy * dt / 3;
        if (hitWall(b.x + sx, b.y, 4)) { b.vx = -b.vx; K.sfx(900, .02, 'triangle', .02); } else b.x += sx;
        if (hitWall(b.x, b.y + sy, 4)) { b.vy = -b.vy; } else b.y += sy;
      }
      for (const t of tanks) if (t.alive && !roundOver && K.dist(b.x, b.y, t.x, t.y) < TR && !(b.o === t.id && b.safe > 0)) {
        t.alive = false; bullets.splice(i, 1); K.burst(t.x, t.y, ['#ffb347', '#ff4d2e', '#444', t.c[0]], 40, 420, { gravity: 0, life: .8, size: 10 }); K.shake(16); K.noise(.6, .35, 80); K.sfx(80, .6, 'sawtooth', .18, -40);
        const winner = 1 - t.id; if (tanks[winner].alive) { wins[winner]++; if (winner === 0 && !K.bot) { K.add(1); K.coin(mode === 'cpu' ? 3 : 1); } msg = mode === 'cpu' ? (winner === 0 ? 'Round won!' : 'Round lost') : `Player ${winner + 1} scores!`; } else msg = 'Draw!';
        msgT = 2; roundOver = 2.2; break;
      }
    }
    pickT -= dt; if (pickT <= 0 && pickups.filter(p => !p.got).length < 2) { pickT = K.rand(7, 12); const c = K.irand(0, MX * MY - 1); pickups.push({ x: OX + (c % MX) * CW + CW / 2, y: OY + ((c / MX) | 0) * CW + CW / 2, k: Math.random() < .5 ? 'rapid' : 'shotgun', got: false }); }
    trailMarks.forEach(m => m.l -= dt); trailMarks = trailMarks.filter(m => m.l > 0).slice(-200);
  };
  function tank(gr, t, s = 1) {
    gr.save(); gr.translate(t.x, t.y); gr.rotate(t.a); gr.scale(s, s);
    gr.fillStyle = 'rgba(0,0,0,.3)'; gr.fillRect(-20, -16, 42, 36);
    gr.fillStyle = '#222'; gr.fillRect(-22, -20, 44, 9); gr.fillRect(-22, 11, 44, 9);
    gr.fillStyle = t.c[0]; gr.beginPath(); gr.roundRect(-18, -13, 36, 26, 5); gr.fill();
    gr.fillStyle = t.c[1]; gr.fillRect(4, -4, 26, 8); gr.beginPath(); gr.arc(0, 0, 10, 0, 7); gr.fill();
    gr.fillStyle = 'rgba(255,255,255,.25)'; gr.fillRect(-14, -10, 20, 4); gr.restore();
  }
  GAME.draw = gr => {
    const v = K.view;
    gr.fillStyle = '#1d2a1a'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    gr.fillStyle = '#c9b98a'; gr.fillRect(OX, OY, MX * CW, MY * CW);
    gr.fillStyle = 'rgba(0,0,0,.04)'; for (let i = 0; i < MX * MY; i++) if ((i + ((i / MX) | 0)) % 2) gr.fillRect(OX + (i % MX) * CW, OY + ((i / MX) | 0) * CW, CW, CW);
    for (const m of trailMarks) { gr.save(); gr.globalAlpha = m.l / 3 * .25; gr.translate(m.x, m.y); gr.rotate(m.a); gr.fillStyle = '#5a4a2a'; gr.fillRect(-4, -18, 8, 5); gr.fillRect(-4, 13, 8, 5); gr.restore(); }
    gr.globalAlpha = 1;
    for (const p of pickups) if (!p.got) { gr.fillStyle = p.k === 'rapid' ? '#ff6b4a' : '#4a8ad2'; gr.beginPath(); gr.arc(p.x, p.y, 16 + Math.sin(K.t * 5) * 2, 0, 7); gr.fill(); gr.fillStyle = '#fff'; gr.font = '18px "Black Ops One"'; gr.textAlign = 'center'; gr.textBaseline = 'middle'; gr.fillText(p.k === 'rapid' ? 'R' : 'S', p.x, p.y + 1); }
    gr.fillStyle = '#3a3a2a'; for (const w of walls) gr.fillRect(w.x, w.y, w.w, w.h);
    for (const t of tanks) if (t.alive) tank(gr, t);
    gr.fillStyle = '#111'; for (const b of bullets) { gr.beginPath(); gr.arc(b.x, b.y, 4.5, 0, 7); gr.fill(); }
    // scoreboard
    gr.font = '26px "Black Ops One"'; gr.textBaseline = 'top'; gr.textAlign = 'left'; gr.fillStyle = tanks[0].c[0]; gr.fillText(mode === 'cpu' ? `YOU ${wins[0]}` : `P1 ${wins[0]}`, OX + 16, 8);
    gr.textAlign = 'right'; gr.fillStyle = tanks[1].c[0]; gr.fillText(mode === 'cpu' ? `CPU ${wins[1]}` : `P2 ${wins[1]}`, OX + MX * CW - 16, 8);
    if (msgT > 0) { gr.font = '54px "Black Ops One"'; gr.textAlign = 'center'; gr.textBaseline = 'middle'; gr.lineWidth = 8; gr.strokeStyle = 'rgba(0,0,0,.5)'; gr.strokeText(msg, W / 2, H / 2); gr.fillStyle = '#fff'; gr.fillText(msg, W / 2, H / 2); }
    if (mode && !K.bot) { gr.globalAlpha = .5; gr.fillStyle = '#000'; gr.beginPath(); gr.arc(FIRE.x, FIRE.y, FIRE.r, 0, 7); gr.fill(); gr.globalAlpha = 1; gr.fillStyle = '#fff'; gr.font = '22px "Black Ops One"'; gr.textAlign = 'center'; gr.textBaseline = 'middle'; gr.fillText('FIRE', FIRE.x, FIRE.y); }
    if (joy) { gr.strokeStyle = 'rgba(255,255,255,.4)'; gr.lineWidth = 3; gr.beginPath(); gr.arc(joy.sx, joy.sy, 50, 0, 7); gr.stroke(); gr.fillStyle = 'rgba(255,255,255,.5)'; gr.beginPath(); gr.arc(joy.x, joy.y, 22, 0, 7); gr.fill(); }
    if (!mode) {
      gr.fillStyle = 'rgba(0,0,0,.6)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
      gr.fillStyle = '#fff'; gr.font = '44px "Black Ops One"'; gr.textAlign = 'center'; gr.textBaseline = 'middle'; gr.fillText('Choose a mode', W / 2, 220);
      MB.forEach((b, i) => { gr.fillStyle = i ? '#4a8ad2' : '#6f9a3a'; gr.beginPath(); gr.roundRect(b.x, b.y, b.w, b.h, 18); gr.fill(); gr.fillStyle = '#fff'; gr.font = '34px "Black Ops One"'; gr.fillText(b.t, b.x + b.w / 2, b.y + 58); gr.font = '18px Nunito, sans-serif'; gr.fillText(i ? 'Share a keyboard' : 'Press 1', b.x + b.w / 2, b.y + 100); });
    }
  };
})();
