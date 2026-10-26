/* Combo Cubes: drag the three pieces onto the 8x8 board. Fill a whole row or column to clear it; clear lines on
   back-to-back drops for a combo, clear the whole board for a bonus. The run ends when none of your pieces fits. */
// this game used to be called Block Blast: carry over best score, coins and skins saved under the old name
try { if (!localStorage.getItem('pbx-combo-cubes') && localStorage.getItem('pbx-block-blast')) localStorage.setItem('pbx-combo-cubes', localStorage.getItem('pbx-block-blast')); } catch (e) {}
const GAME = {
  id: 'combo-cubes', title: 'Combo Cubes', tagline: 'Drop the blocks. Clear the lines. Chase the combo!',
  font: 'Chewy', accent: '#ffd23f', accent2: '#4fc3ff', bg: '#16204a', noHud: true,
  how: ['Drag a piece from the tray onto the board. Keys: 1 2 3 to pick, arrows to move, Space to drop.', 'Fill a full row or column to blast it away. Several at once scores big.', 'Clear lines on drops in a row for a combo. You lose when no piece fits!'],
  skins: [
    { name: 'Classic', price: 0, pal: ['#ff4d5a', '#ff9f1c', '#ffd23f', '#3ddc84', '#29b6f6', '#7c4dff', '#ff5fa2'] },
    { name: 'Candy', price: 80, pal: ['#ff8fab', '#ffb3c6', '#c77dff', '#80ffdb', '#ffd6a5', '#a0c4ff', '#ff70a6'] },
    { name: 'Ocean', price: 180, pal: ['#00b4d8', '#48cae4', '#0077b6', '#90e0ef', '#06d6a0', '#118ab2', '#4cc9f0'] },
    { name: 'Jungle', price: 300, pal: ['#80b918', '#55a630', '#aacc00', '#2b9348', '#ffba08', '#d4a373', '#38b000'] },
    { name: 'Neon', price: 500, pal: ['#ff006e', '#fb5607', '#ffbe0b', '#3aff5a', '#00f5ff', '#8338ec', '#ff00d4'], glow: true },
    { name: 'Gold', price: 800, pal: ['#ffd23f', '#f4b400', '#ffe680', '#e6a700', '#fff1b8', '#d99a00', '#ffcf33'], glow: true },
  ],
};
(() => {
  const N = 8, CS = 68, GX = 150, GY = 92, TX = 1010, TY = [175, 365, 555], TS = .7;
  const FONT = '"Chewy", "Arial Black", sans-serif';
  // piece shapes as rows of X / . ; each base shape also appears in its rotations
  const BASE = [['X', 3], ['XX', 5], ['XXX', 5], ['XXXX', 4], ['XXXXX', 2], ['XX/XX', 5], ['XXX/XXX/XXX', 1.5], ['XX/X.', 5], ['XXX/X../X..', 2.5],
    ['XXX/X..', 4], ['XXX/.X.', 4], ['XX./.XX', 3], ['XXX/XXX', 2.5]];
  const SHAPES = [];
  for (const [s, w] of BASE) {
    let cells = []; s.split('/').forEach((r, y) => [...r].forEach((c, x) => { if (c === 'X') cells.push([x, y]); }));
    const seen = new Set();
    for (let r = 0; r < 4; r++) {
      const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
      cells = cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      const key = JSON.stringify(cells);
      if (!seen.has(key)) { seen.add(key); SHAPES.push({ cells, w: Math.max(...cells.map(c => c[0])) + 1, h: Math.max(...cells.map(c => c[1])) + 1, wt: w / 2 }); }
      cells = cells.map(([x, y]) => [-y, x]);
    }
  }
  let board, tray, drag, combo, sinceClear, shown, fx, rings, lastMsg, dead, deadT, kb, botA, botT, cleared, placed;
  const pal = () => K.skin.pal;
  const fits = (p, gx, gy) => p.cells.every(([x, y]) => { const X = gx + x, Y = gy + y; return X >= 0 && Y >= 0 && X < N && Y < N && board[Y * N + X] < 0; });
  const canPlace = p => { for (let y = 0; y <= N - p.h; y++) for (let x = 0; x <= N - p.w; x++) if (fits(p, x, y)) return true; return false; };
  function pickShape(bias) {
    const pool = SHAPES.map(s => ({ s, w: s.wt * (bias && s.cells.length > 4 ? .3 : 1) }));
    let r = Math.random() * pool.reduce((a, b) => a + b.w, 0);
    for (const p of pool) { r -= p.w; if (r <= 0) return p.s; } return pool[0].s;
  }
  function refill() {
    const crowded = board.filter(c => c >= 0).length > 34;
    for (let t = 0; t < 30; t++) {
      tray = [0, 1, 2].map(() => { const s = pickShape(crowded); return { cells: s.cells, w: s.w, h: s.h, c: K.irand(0, 6), pop: 0 }; });
      if (tray.some(canPlace)) break;
    }
  }
  GAME.drawSkin = (gr, s, r) => { const c = r * .5; [[-1, -1, 0], [0, -1, 2], [-1, 0, 4], [0, 0, 6]].forEach(([x, y, i]) => block(gr, x * c * 1.05, y * c * 1.05, c, s.pal[i], s.glow)); };
  GAME.reset = () => {
    board = new Int8Array(N * N).fill(-1); drag = null; combo = 0; sinceClear = 0; shown = 0; fx = []; rings = []; lastMsg = null; dead = false; deadT = 0; kb = null; botA = null; botT = .8; cleared = 0; placed = 0;
    refill();
  };
  GAME.pose = () => {
    const rows = ['..2233..', '.112233.', '0112.44.', '00.5544.', '0665556.', '06655566', '33.4466.', '3344.11.'];
    rows.forEach((r, y) => [...r].forEach((c, x) => { board[y * N + x] = c === '.' ? -1 : +c; }));
    K.score = 2480; shown = 2480; combo = 3;
  };
  // where a piece would land with its middle under (x, y)
  function snap(p, x, y) { const gx = Math.round((x - GX) / CS - p.w / 2), gy = Math.round((y - GY) / CS - p.h / 2); return { gx, gy, ok: fits(p, gx, gy) }; }
  function linesIf(p, gx, gy) {
    const b = board.slice(); p.cells.forEach(([x, y]) => { b[(gy + y) * N + gx + x] = 9; });
    const rows = [], cols = [];
    for (let i = 0; i < N; i++) { let r = true, c = true; for (let j = 0; j < N; j++) { if (b[i * N + j] < 0) r = false; if (b[j * N + i] < 0) c = false; } if (r) rows.push(i); if (c) cols.push(i); }
    return { rows, cols, b };
  }
  function place(i, gx, gy) {
    const p = tray[i]; if (!p || !fits(p, gx, gy)) return false;
    p.cells.forEach(([x, y]) => { board[(gy + y) * N + gx + x] = p.c; fx.push({ k: 'land', x: gx + x, y: gy + y, t: 0 }); });
    tray[i] = null; placed++;
    K.add(p.cells.length);
    K.sfx(260, .08, 'triangle', .14, -60); K.noise(.05, .06, 2000);
    const { rows, cols } = linesIf({ cells: [] }, 0, 0), n = rows.length + cols.length;
    if (n) {
      combo = sinceClear <= 3 ? combo + 1 : 1; sinceClear = 0;
      const gain = n * 10 * n * Math.max(1, combo); K.add(gain); cleared += n;
      const kill = new Set(); rows.forEach(r => { for (let j = 0; j < N; j++) kill.add(r * N + j); }); cols.forEach(c => { for (let j = 0; j < N; j++) kill.add(j * N + c); });
      const cx = GX + CS * N / 2, cy = GY + CS * N / 2;
      kill.forEach(k => { const x = k % N, y = (k / N) | 0, col = pal()[board[k]]; fx.push({ k: 'pop', x, y, c: col, t: -(Math.abs(x - 3.5) + Math.abs(y - 3.5)) * .025 }); board[k] = -1; });
      rows.forEach(r => rings.push({ r: true, i: r, t: 0 })); cols.forEach(c => rings.push({ r: false, i: c, t: 0 }));
      for (let j = 0; j < n; j++) K.coin(1);
      const msg = n >= 4 ? 'UNBELIEVABLE!' : n === 3 ? 'EXCELLENT!' : n === 2 ? 'GREAT!' : combo > 1 ? 'NICE!' : 'GOOD!';
      lastMsg = { s: msg, combo, t: 0, gain };
      K.shake(4 + n * 3); K.chime(440 + Math.min(combo, 8) * 60, n > 1 ? [0, 4, 7, 12, 16] : [0, 7, 12]);
      if (board.every(c => c < 0)) { K.add(300); lastMsg = { s: 'ALL CLEAR!', combo, t: 0, gain: gain + 300 }; K.flash('#fff', .5); K.chime(784, [0, 4, 7, 12, 16, 19]); K.burst(cx, cy, pal(), 50, 600, { life: 1 }); }
    } else { sinceClear++; if (sinceClear > 3) combo = 0; }
    if (tray.every(t => !t)) { refill(); tray.forEach(t => { t.pop = .001; }); K.sfx(660, .1, 'triangle', .08, 200); }
    if (!tray.some(t => t && canPlace(t))) { dead = true; deadT = 0; K.sfx(200, .6, 'sawtooth', .1, -150); K.shake(10); }
    return true;
  }
  const traySlot = i => ({ x: TX, y: TY[i] });
  function pickAt(x, y) {
    for (let i = 0; i < 3; i++) { const s = traySlot(i); if (tray[i] && Math.abs(x - s.x) < 150 && Math.abs(y - s.y) < 92) return i; }
    return -1;
  }
  GAME.down = (x, y, e) => {
    if (dead) return; const i = pickAt(x, y); if (i < 0) return;
    drag = { i, x, y, lift: e && e.pointerType === 'touch' ? 110 : 30 }; kb = null; K.sfx(520, .05, 'square', .06);
  };
  GAME.move = (x, y) => { if (drag) { drag.x = x; drag.y = y; } };
  GAME.up = () => {
    if (!drag) return; const p = tray[drag.i], s = snap(p, drag.x, drag.y - drag.lift);
    if (s.ok) place(drag.i, s.gx, s.gy); else K.sfx(180, .08, 'square', .05);
    drag = null;
  };
  GAME.key = (c, d) => {
    if (!d || dead) return;
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[c];
    if (n !== undefined && tray[n]) { kb = { i: n, gx: Math.floor((N - tray[n].w) / 2), gy: Math.floor((N - tray[n].h) / 2) }; return; }
    if (!kb) { const i = tray.findIndex(t => t); if (i >= 0 && /Arrow|Space|Enter/.test(c)) kb = { i, gx: 2, gy: 2 }; else return; if (/Space|Enter/.test(c)) return; }
    const p = tray[kb.i]; if (!p) { kb = null; return; }
    if (c === 'ArrowLeft') kb.gx = Math.max(0, kb.gx - 1); if (c === 'ArrowRight') kb.gx = Math.min(N - p.w, kb.gx + 1);
    if (c === 'ArrowUp') kb.gy = Math.max(0, kb.gy - 1); if (c === 'ArrowDown') kb.gy = Math.min(N - p.h, kb.gy + 1);
    if (c === 'Tab' || c === 'KeyQ') { for (let k = 1; k <= 3; k++) { const j = (kb.i + k) % 3; if (tray[j]) { kb.i = j; kb.gx = Math.min(kb.gx, N - tray[j].w); kb.gy = Math.min(kb.gy, N - tray[j].h); break; } } }
    if (c === 'Space' || c === 'Enter') { if (place(kb.i, kb.gx, kb.gy)) kb = null; else K.sfx(180, .08, 'square', .05); }
  };
  // bot: try every piece and spot; prefer clears, then tight fits that leave the board open
  function botPlan() {
    let best = null;
    tray.forEach((p, i) => {
      if (!p) return;
      for (let gy = 0; gy <= N - p.h; gy++) for (let gx = 0; gx <= N - p.w; gx++) {
        if (!fits(p, gx, gy)) continue;
        const { rows, cols, b } = linesIf(p, gx, gy);
        rows.forEach(r => { for (let j = 0; j < N; j++) b[r * N + j] = -1; }); cols.forEach(c => { for (let j = 0; j < N; j++) b[j * N + c] = -1; });
        let sc = (rows.length + cols.length) * 120 + p.cells.length * 2, holes = 0, touch = 0;
        for (let k = 0; k < N * N; k++) if (b[k] < 0) { const x = k % N, y = (k / N) | 0, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, c]) => { const X = x + a, Y = y + c; return X < 0 || Y < 0 || X >= N || Y >= N || b[Y * N + X] >= 0; }).length; if (nb >= 3) holes++; }
        p.cells.forEach(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, c]) => { const X = gx + x + a, Y = gy + y + c; if (X < 0 || Y < 0 || X >= N || Y >= N || board[Y * N + X] >= 0) touch++; }));
        sc += touch * 3 - holes * 14 + Math.random() * 4;
        if (!best || sc > best.sc) best = { i, gx, gy, sc };
      }
    });
    return best;
  }
  GAME.bot = dt => {
    if (dead) return;
    if (botA) {
      botA.t += dt / .55; const p = tray[botA.i], k = Math.min(1, botA.t), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const s = traySlot(botA.i), tx = GX + (botA.gx + p.w / 2) * CS, ty = GY + (botA.gy + p.h / 2) * CS + 30;
      drag = { i: botA.i, x: K.lerp(s.x, tx, e), y: K.lerp(s.y, ty, e) - Math.sin(k * Math.PI) * 40, lift: 30 };
      if (k >= 1) { drag = null; place(botA.i, botA.gx, botA.gy); botA = null; botT = .35 + Math.random() * .3; }
      return;
    }
    botT -= dt; if (botT > 0) return;
    const b = botPlan(); if (b) botA = { ...b, t: 0 };
  };
  GAME.update = dt => {
    shown += (K.score - shown) * Math.min(1, dt * 10); if (Math.abs(K.score - shown) < .5) shown = K.score;
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; if (f.k === 'pop' && f.t > 0 && !f.b) { f.b = 1; K.burst(GX + (f.x + .5) * CS, GY + (f.y + .5) * CS, [f.c, '#fff'], 6, 260, { life: .5, size: 9, square: true }); } if (f.t > .45) fx.splice(i, 1); }
    for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t > .5) rings.splice(i, 1); }
    if (lastMsg) { lastMsg.t += dt; if (lastMsg.t > 1.3) lastMsg = null; }
    tray.forEach(t => { if (t && t.pop > 0) t.pop = Math.min(1, t.pop + dt * 4); });
    if (dead) { deadT += dt; if (deadT > 1.4 && K.state === 'play' || K.bot && deadT > 1.4) { K.over({ title: 'No more room!', text: `${cleared} lines blasted`, delay: 100 }); deadT = -99; } }
  };

  /* ---------- drawing ---------- */
  function block(g, x, y, s, c, glow, a = 1) {
    g.globalAlpha = a;
    if (glow) { g.shadowColor = c; g.shadowBlur = s * .35; }
    const r = s * .16;
    g.fillStyle = c; g.beginPath(); g.roundRect(x + 1, y + 1, s - 2, s - 2, r); g.fill(); g.shadowBlur = 0;
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.roundRect(x + s * .1, y + s * .08, s * .8, s * .26, r * .7); g.fill();
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.roundRect(x + s * .08, y + s * .7, s * .84, s * .2, r * .7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.beginPath(); g.roundRect(x + 1, y + 1, s - 2, s - 2, r); g.stroke();
    g.globalAlpha = 1;
  }
  function drawPiece(g, p, x, y, s, a = 1, colorOverride) { p.cells.forEach(([cx, cy]) => block(g, x + cx * s, y + cy * s, s, colorOverride || pal()[p.c], K.skin.glow, a)); }
  GAME.draw = g => {
    const t = K.t, v = K.view;
    const bg = g.createLinearGradient(0, v.y0, 0, v.y1); bg.addColorStop(0, '#22307a'); bg.addColorStop(1, '#101634'); g.fillStyle = bg; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    for (let i = 0; i < 16; i++) { const x = (i * 173 + t * (10 + i % 5 * 6)) % 1500 - 100, y = (i * 97) % 760 - 20, s = 20 + (i * 13) % 40; g.save(); g.translate(x, y); g.rotate(t * .2 + i); g.globalAlpha = .06; g.fillStyle = pal()[i % 7]; g.fillRect(-s / 2, -s / 2, s, s); g.restore(); }
    g.globalAlpha = 1;
    // score
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `48px ${FONT}`; g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,.35)'; g.strokeText(Math.round(shown), GX + CS * 4, 48); g.fillStyle = '#fff'; g.fillText(Math.round(shown), GX + CS * 4, 48);
    g.font = `24px ${FONT}`; g.textAlign = 'left'; g.fillStyle = '#ffd23f'; g.fillText('👑 ' + Math.max(K.save.best, K.score), GX, 48);
    if (combo > 1) { g.textAlign = 'right'; g.fillStyle = '#ff7ad9'; g.fillText('Combo ×' + combo, GX + CS * N, 48); }
    // board
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.roundRect(GX - 14, GY - 14, CS * N + 28, CS * N + 28, 22); g.fill();
    g.fillStyle = '#0d1430'; g.beginPath(); g.roundRect(GX - 8, GY - 8, CS * N + 16, CS * N + 16, 18); g.fill();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { g.fillStyle = (x + y) % 2 ? '#18224a' : '#1b2652'; g.beginPath(); g.roundRect(GX + x * CS + 2, GY + y * CS + 2, CS - 4, CS - 4, 8); g.fill(); }
    // ghost + preview of lines it would clear
    let ghost = null;
    if (drag && tray[drag.i]) { const s = snap(tray[drag.i], drag.x, drag.y - drag.lift); if (s.ok) ghost = { p: tray[drag.i], ...s }; }
    else if (kb && tray[kb.i]) ghost = { p: tray[kb.i], gx: kb.gx, gy: kb.gy, ok: fits(tray[kb.i], kb.gx, kb.gy) };
    let hl = null;
    if (ghost && ghost.ok) { const L = linesIf(ghost.p, ghost.gx, ghost.gy); if (L.rows.length || L.cols.length) hl = L; }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const c = board[y * N + x]; if (c < 0) continue;
      const lit = hl && (hl.rows.includes(y) || hl.cols.includes(x)), land = fx.find(f => f.k === 'land' && f.x === x && f.y === y);
      const sq = land ? 1 + Math.sin(Math.min(1, land.t / .2) * Math.PI) * .12 : 1, s = CS * sq, o = (CS - s) / 2;
      block(g, GX + x * CS + o, GY + y * CS + o, s, lit ? pal()[ghost.p.c] : pal()[c], K.skin.glow || lit);
      if (lit) { g.fillStyle = `rgba(255,255,255,${.15 + Math.sin(t * 12) * .1})`; g.fillRect(GX + x * CS + 4, GY + y * CS + 4, CS - 8, CS - 8); }
    }
    if (ghost) {
      if (ghost.ok) drawPiece(g, ghost.p, GX + ghost.gx * CS, GY + ghost.gy * CS, CS, .38);
      else if (kb) drawPiece(g, ghost.p, GX + ghost.gx * CS, GY + ghost.gy * CS, CS, .3, '#ff4d5a');
      if (hl) for (const r of hl.rows) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(GX, GY + r * CS, CS * N, CS); }
    }
    for (const f of fx) if (f.k === 'pop' && f.t > -.3) { const k = Math.max(0, f.t) / .45, s = CS * (1 - k) * (1 + (f.t < 0 ? 0 : .3 * (1 - k))); if (s > 1) block(g, GX + (f.x + .5) * CS - s / 2, GY + (f.y + .5) * CS - s / 2, s, f.t < 0 ? f.c : '#fff', true, 1 - k * .5); }
    for (const r of rings) { const k = r.t / .5; g.fillStyle = `rgba(255,255,255,${(1 - k) * .55})`; if (r.r) g.fillRect(GX - 20 * k, GY + r.i * CS + CS * k * .3, CS * N + 40 * k, CS * (1 - k * .6)); else g.fillRect(GX + r.i * CS + CS * k * .3, GY - 20 * k, CS * (1 - k * .6), CS * N + 40 * k); }
    // tray
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.roundRect(TX - 170, 60, 340, 610, 26); g.fill();
    tray.forEach((p, i) => {
      if (!p || (drag && drag.i === i)) return;
      const s = traySlot(i), ok = canPlace(p), pop = p.pop > 0 ? Math.sin(p.pop * Math.PI) * .15 + Math.min(1, p.pop * 2) * 1 : 1, ts = CS * TS * (p.pop > 0 && p.pop < 1 ? pop : 1);
      const kbSel = kb && kb.i === i;
      if (kbSel) { g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.beginPath(); g.roundRect(s.x - 150, s.y - 88, 300, 176, 18); g.stroke(); }
      drawPiece(g, p, s.x - p.w * ts / 2, s.y - p.h * ts / 2, ts, ok ? 1 : .3);
      if (!K.bot) { g.font = `18px ${FONT}`; g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.3)'; g.fillText(i + 1, s.x - 150, s.y - 70); }
    });
    if (drag && tray[drag.i]) { const p = tray[drag.i]; drawPiece(g, p, drag.x - p.w * CS / 2, drag.y - drag.lift - p.h * CS / 2, CS * .96, .95); }
    // praise
    if (lastMsg) {
      const k = lastMsg.t, sc = k < .15 ? k / .15 * 1.2 : k < .3 ? 1.2 - (k - .15) / .15 * .2 : 1, a = k > 1 ? 1 - (k - 1) / .3 : 1;
      g.save(); g.globalAlpha = Math.max(0, a); g.translate(GX + CS * 4, GY + CS * 4 - k * 30); g.scale(sc, sc); g.rotate(-.05);
      g.font = `72px ${FONT}`; g.textAlign = 'center'; g.lineWidth = 12; g.strokeStyle = '#3a0d5a'; g.strokeText(lastMsg.s, 0, 0);
      const gr = g.createLinearGradient(0, -36, 0, 36); gr.addColorStop(0, '#fff6a8'); gr.addColorStop(1, '#ff9f1c'); g.fillStyle = gr; g.fillText(lastMsg.s, 0, 0);
      g.font = `38px ${FONT}`; g.lineWidth = 8; g.strokeText('+' + lastMsg.gain + (lastMsg.combo > 1 ? `  combo ×${lastMsg.combo}` : ''), 0, 62); g.fillStyle = '#fff'; g.fillText('+' + lastMsg.gain + (lastMsg.combo > 1 ? `  combo ×${lastMsg.combo}` : ''), 0, 62);
      g.restore();
    }
    if (dead && deadT > 0) { g.fillStyle = `rgba(10,10,30,${Math.min(.6, deadT)})`; g.fillRect(GX - 8, GY - 8, CS * N + 16, CS * N + 16); g.font = `58px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('No more room!', GX + CS * 4, GY + CS * 4); }
  };
})();
