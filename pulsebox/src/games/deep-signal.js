/* Deep Signal: a submarine in a black sea cave. You only see what a sonar ping lights up, and every ping, scrape or
   full-speed run is heard by the thing living down there. Find three parts, reach the hatch, go deeper. */
const GAME = {
  id: 'deep-signal', title: 'Deep Signal', tagline: 'Every ping shows you the way. It also shows you to it.',
  font: 'Share Tech Mono', accent: '#39ff9c', accent2: '#ff4a4a', bg: '#010805', noSkins: true, noHud: true, scoreLabel: 'Parts recovered',
  how: ['Steer with WASD or the arrow keys, or hold the screen where you want to go.', 'Space or the PING button sends a sonar pulse that reveals the cave.', 'Pings and fast engines are loud. It hears both. Wear headphones.'],
  skins: [{ name: 'Sub', price: 0 }],
};
(() => {
  const C = 32, GW = 76, GH = 50, PING_CD = 1.4;
  let grid, lit, seen, sub, pings, items, hatch, beasts, level, cam, o2, hull, dead, deathT, win, keys, hold, flowT, amb, beatT, msg, msgT, got, levelT, sweep;
  const cell = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH) ? 1 : grid[y * GW + x];
  const solidAt = (px, py) => cell(Math.floor(px / C), Math.floor(py / C)) === 1;
  function cave() {
    for (let tries = 0; tries < 20; tries++) {
      grid = new Uint8Array(GW * GH).map((_, i) => { const x = i % GW, y = (i / GW) | 0; return x === 0 || y === 0 || x === GW - 1 || y === GH - 1 || Math.random() < .47 ? 1 : 0; });
      for (let it = 0; it < 5; it++) { const n = grid.slice(); for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) { let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += grid[(y + dy) * GW + x + dx]; n[y * GW + x] = c >= 5 ? 1 : 0; } grid = n; }
      // keep the biggest open area
      const reg = new Int32Array(GW * GH).fill(-1); let best = -1, bestN = 0, id = 0;
      for (let i = 0; i < GW * GH; i++) if (!grid[i] && reg[i] < 0) { let n = 0; const st = [i]; reg[i] = id; while (st.length) { const j = st.pop(); n++; for (const d of [1, -1, GW, -GW]) { const k = j + d; if (!grid[k] && reg[k] < 0) { reg[k] = id; st.push(k); } } } if (n > bestN) { bestN = n; best = id; } id++; }
      for (let i = 0; i < GW * GH; i++) if (!grid[i] && reg[i] !== best) grid[i] = 1;
      if (bestN > GW * GH * .38) return;
    }
  }
  function bfs(sx, sy) { const d = new Int32Array(GW * GH).fill(-1), q = [sy * GW + sx]; d[q[0]] = 0; for (let h = 0; h < q.length; h++) { const j = q[h]; for (const o of [1, -1, GW, -GW]) { const k = j + o; if (!grid[k] && d[k] < 0) { d[k] = d[j] + 1; q.push(k); } } } return d; }
  const openCells = () => { const a = []; for (let i = 0; i < GW * GH; i++) if (!grid[i] && !grid[i + 1] && !grid[i - 1] && !grid[i + GW] && !grid[i - GW]) a.push(i); return a; };
  const ctr = i => [(i % GW) * C + C / 2, ((i / GW) | 0) * C + C / 2];
  function buildLevel() {
    cave(); lit = new Float32Array(GW * GH).fill(-99); seen = new Uint8Array(GW * GH);
    const open = openCells(); let start = open[0]; for (const i of open) if (i % GW < start % GW) start = i;
    const d = bfs(start % GW, (start / GW) | 0), far = open.filter(i => d[i] > 0).sort((a, b) => d[b] - d[a]);
    hatch = { i: far[0], seenT: -99 }; const [hx, hy] = ctr(hatch.i); hatch.x = hx; hatch.y = hy;
    items = []; const pool = far.slice(Math.floor(far.length * .05), Math.floor(far.length * .7));
    while (items.length < 3 && pool.length) { const i = pool.splice(K.irand(0, pool.length - 1), 1)[0]; const [x, y] = ctr(i); if (items.every(it => K.dist(it.x, it.y, x, y) > 420) && K.dist(x, y, hx, hy) > 300) items.push({ x, y, got: false, seenT: -99 }); }
    const [sx, sy] = ctr(start); sub = { x: sx, y: sy, a: 0, v: 0, pingCd: 0 };
    beasts = []; const nb = level >= 3 ? 2 : 1;
    for (let b = 0; b < nb; b++) { const i = far[Math.floor(far.length * (.15 + b * .2))]; const [x, y] = ctr(i); beasts.push({ x, y, tx: x, ty: y, mode: 'wander', seenT: -99, field: null, fieldFor: -1, speed: 58 + level * 6, hunt: 112 + level * 8 }); }
    pings = []; o2 = 200 + level * 20; got = 0; levelT = 0; cam = { x: sx, y: sy };
    show(`Depth ${300 + level * 250} m. Recover 3 parts.`);
  }
  GAME.reset = () => { level = 1; hull = 100; dead = false; deathT = 0; win = 0; keys = {}; hold = null; flowT = 0; beatT = 0; msg = ''; sweep = 0; buildLevel(); sound(); };
  const show = (t, d = 3.5) => { msg = t; msgT = d; };

  /* ---------- sound ---------- */
  function sound() {
    if (amb || !K.ac || K.bot) return;
    const ac = K.ac, n = ac.sampleRate * 3, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < n; i++) { b = (b + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3; }
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; const g1 = ac.createGain(); g1.gain.value = .35;
    src.connect(lp).connect(g1).connect(K.master); src.start();
    const eng = ac.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 40; const ef = ac.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 220; const eg = ac.createGain(); eg.gain.value = 0;
    eng.connect(ef).connect(eg).connect(K.master); eng.start();
    amb = { eng, eg };
  }
  function pingSound() { K.sfx(1480, 1.6, 'sine', .16, -40); K.sfx(2960, .6, 'sine', .04); setTimeout(() => K.sfx(1480, 1.2, 'sine', .05, -40), 500); }
  function call(dist) { if (K.bot || !K.ac) return; const v = K.clamp(.18 - dist / 9000, .02, .16); K.sfx(70 + Math.random() * 30, 2.4, 'sawtooth', v, -30); K.sfx(140, 1.8, 'triangle', v * .5, 60, .4); }
  const creak = () => { K.sfx(K.rand(90, 160), .7, 'sawtooth', .05, K.rand(-40, 40)); };

  /* ---------- input ---------- */
  function ping() {
    if (dead || win || sub.pingCd > 0) return;
    sub.pingCd = PING_CD; pings.push({ x: sub.x, y: sub.y, r: 0, t: K.t }); pingSound();
    for (const b of beasts) if (K.dist(b.x, b.y, sub.x, sub.y) < 1600) { b.tx = sub.x; b.ty = sub.y; b.mode = 'hunt'; b.fieldFor = -1; }
  }
  const PB = { x: 1110, y: 560, r: 70 };
  GAME.down = (x, y) => { if (K.dist(x, y, PB.x, PB.y) < PB.r) { ping(); return; } hold = { x, y }; };
  GAME.move = (x, y, e) => { if (hold && (e.buttons || e.pointerType === 'touch')) hold = { x, y }; };
  GAME.up = () => { hold = null; };
  GAME.key = (c, d) => { keys[c] = d; if (d && (c === 'Space' || c === 'KeyE')) ping(); };

  /* ---------- bot ---------- */
  let botPath = [], botT = 0;
  GAME.bot = dt => {
    if (dead || win) return; botT -= dt;
    const goal = items.find(i => !i.got) || hatch;
    if (botT <= 0) { botT = .6; const d = bfs(Math.floor(goal.x / C), Math.floor(goal.y / C)); botPath = d; if (sub.pingCd <= 0 && Math.random() < .35) ping(); }
    const cx = Math.floor(sub.x / C), cy = Math.floor(sub.y / C); let best = null, bd = 1e9;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const k = (cy + dy) * GW + cx + dx; if (botPath[k] >= 0 && botPath[k] < bd && !cell(cx + dx, cy) && !cell(cx, cy + dy)) { bd = botPath[k]; best = [cx + dx, cy + dy]; } }
    if (best) GAME._steer = [best[0] * C + C / 2, best[1] * C + C / 2];
  };

  /* ---------- update ---------- */
  function die(how) {
    if (dead) return; dead = true; deathT = K.t; K.shake(30); K.noise(1.5, .6, 100); K.sfx(60, 2, 'sawtooth', .3, -30); K.sfx(800, .8, 'square', .15, -700);
    K.over({ title: how === 'o2' ? 'Out of air' : how === 'hull' ? 'Hull breach' : 'Signal lost', text: how === 'o2' ? 'The oxygen ran out somewhere in the dark. The sonar kept pinging for a while after.' : how === 'hull' ? 'The hull gave way under the pressure. The cave went quiet again.' : `It found you at ${300 + level * 250} meters. The last thing on the sonar screen was an eye.`, delay: 2200 });
  }
  GAME.update = dt => {
    if (dead) return;
    if (win) { win += dt; if (win > 2.5) { level++; K.add(3); K.coin(5); hull = Math.min(100, hull + 30); win = 0; buildLevel(); } return; }
    levelT += dt; msgT -= dt; sub.pingCd -= dt; sweep += dt * 1.6;
    // steering
    let thrust = 0, turn = 0;
    if (keys.KeyW || keys.ArrowUp) thrust = 1; if (keys.KeyS || keys.ArrowDown) thrust = -.5;
    if (keys.KeyA || keys.ArrowLeft) turn = -1; if (keys.KeyD || keys.ArrowRight) turn = 1;
    const tgt = K.bot ? GAME._steer : hold ? [hold.x + cam.x - W / 2, hold.y + cam.y - H / 2] : null;
    if (tgt) { const want = Math.atan2(tgt[1] - sub.y, tgt[0] - sub.x); let da = want - sub.a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; turn = K.clamp(da * 3, -1, 1); const dd = K.dist(tgt[0], tgt[1], sub.x, sub.y); thrust = Math.abs(da) < 1.2 ? (K.bot ? .6 : Math.min(1, dd / 160)) : K.bot ? .15 : 0; }
    sub.a += turn * 2.4 * dt; sub.v += (thrust * 150 - sub.v) * Math.min(1, dt * 1.3);
    const nx = sub.x + Math.cos(sub.a) * sub.v * dt, ny = sub.y + Math.sin(sub.a) * sub.v * dt, R = 12;
    const hit = [[R, 0], [-R, 0], [0, R], [0, -R], [9, 9], [-9, 9], [9, -9], [-9, -9]].some(([ox, oy]) => solidAt(nx + ox, ny + oy));
    if (hit) {
      if (Math.abs(sub.v) > 45) { const dmg = Math.round(Math.abs(sub.v) / 9); hull -= dmg; K.shake(8); K.noise(.4, .3, 150); creak(); show(`Hull scraped -${dmg}%`, 1.5); for (const b of beasts) if (K.dist(b.x, b.y, sub.x, sub.y) < 900) { b.tx = sub.x; b.ty = sub.y; b.mode = 'hunt'; b.fieldFor = -1; } if (hull <= 0) return die('hull'); }
      sub.v *= -.3;
    } else { sub.x = nx; sub.y = ny; }
    const loud = Math.abs(sub.v) > 95;
    if (amb) { amb.eg.gain.setTargetAtTime(Math.abs(sub.v) / 150 * .14, K.ac.currentTime, .1); amb.eng.frequency.setTargetAtTime(36 + Math.abs(sub.v) * .25, K.ac.currentTime, .1); }
    o2 -= dt; if (o2 <= 0) return die('o2');
    // pings
    for (const p of pings) {
      const r0 = p.r; p.r += 620 * dt;
      const x0 = Math.max(0, Math.floor((p.x - p.r) / C)), x1 = Math.min(GW - 1, Math.floor((p.x + p.r) / C)), y0 = Math.max(0, Math.floor((p.y - p.r) / C)), y1 = Math.min(GH - 1, Math.floor((p.y + p.r) / C));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const d = Math.hypot(x * C + C / 2 - p.x, y * C + C / 2 - p.y); if (d >= r0 - C && d < p.r) { const i = y * GW + x; if (grid[i]) { lit[i] = K.t; seen[i] = 1; } } }
      for (const o of [...items, hatch]) { const d = K.dist(o.x, o.y, p.x, p.y); if (d >= r0 && d < p.r) o.seenT = K.t; }
      for (const b of beasts) { const d = K.dist(b.x, b.y, p.x, p.y); if (d >= r0 - 30 && d < p.r) { b.seenT = K.t; if (!K.bot && d < 700) K.sfx(220, .25, 'square', .08, -60); } }
    }
    pings = pings.filter(p => p.r < 900);
    // parts and hatch
    for (const it of items) if (!it.got && K.dist(it.x, it.y, sub.x, sub.y) < 34) { it.got = true; got++; K.add(1); K.coin(1); K.chime(392, [0, 7, 12]); show(got < 3 ? `Part ${got} of 3 recovered` : 'All parts recovered. Find the hatch.'); }
    if (got >= 3 && K.dist(hatch.x, hatch.y, sub.x, sub.y) < 40) { win = .001; K.chime(330, [0, 4, 7, 12, 16]); show(`Level ${level} clear. Going deeper.`, 2.5); return; }
    // the beasts
    flowT -= dt;
    let nearest = 1e9;
    for (const b of beasts) {
      const d = K.dist(b.x, b.y, sub.x, sub.y); nearest = Math.min(nearest, d);
      if (loud && d < 520) { b.tx = sub.x; b.ty = sub.y; b.mode = 'hunt'; }
      if (d < 150 && b.mode !== 'hunt') { b.tx = sub.x; b.ty = sub.y; b.mode = 'hunt'; }
      const tc = Math.floor(b.ty / C) * GW + Math.floor(b.tx / C);
      if (b.fieldFor !== tc && flowT <= 0) { b.field = bfs(Math.floor(b.tx / C), Math.floor(b.ty / C)); b.fieldFor = tc; flowT = .25; }
      const bc = Math.floor(b.y / C) * GW + Math.floor(b.x / C);
      if (b.field) {
        let best = null, bd = b.field[bc] >= 0 ? b.field[bc] : 1e9;
        for (const o of [1, -1, GW, -GW]) { const k = bc + o; if (b.field[k] >= 0 && b.field[k] < bd) { bd = b.field[k]; best = k; } }
        if (best !== null) { const [gx, gy] = ctr(best), sp = (b.mode === 'hunt' ? b.hunt : b.speed) * dt, dd = K.dist(gx, gy, b.x, b.y) || 1; b.x += (gx - b.x) / dd * Math.min(sp, dd); b.y += (gy - b.y) / dd * Math.min(sp, dd); }
        else if (b.field[bc] === 0) { b.mode = 'wander'; const op = openCells(); const i = op[K.irand(0, op.length - 1)]; [b.tx, b.ty] = ctr(i); }
      }
      if (d < 34) return die('beast');
      if (Math.random() < dt / 9) call(d);
    }
    // heartbeat
    if (nearest < 650 && !K.bot) { beatT -= dt; if (beatT <= 0) { beatT = .35 + nearest / 650 * .9; K.sfx(55, .14, 'sine', .3); K.sfx(48, .14, 'sine', .25, 0, .16); } if (Math.random() < dt * .3) creak(); }
    GAME._near = nearest;
    cam.x += (sub.x - cam.x) * Math.min(1, dt * 4); cam.y += (sub.y - cam.y) * Math.min(1, dt * 4);
  };

  /* ---------- draw ---------- */
  GAME.draw = gr => {
    const v = K.view;
    gr.fillStyle = '#010805'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    if (dead && K.t - deathT > .25) { eye(gr, K.t - deathT); return; }
    gr.save(); gr.translate(Math.round(W / 2 - cam.x), Math.round(H / 2 - cam.y));
    const cx0 = Math.max(0, Math.floor((cam.x - W / 2 - 200) / C)), cx1 = Math.min(GW - 1, Math.floor((cam.x + W / 2 + 200) / C));
    const cy0 = Math.max(0, Math.floor((cam.y - H / 2 - 200) / C)), cy1 = Math.min(GH - 1, Math.floor((cam.y + H / 2 + 200) / C));
    for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) {
      const i = y * GW + x; if (!grid[i]) continue;
      const age = K.t - lit[i], a = age < 5 ? Math.max(.1, 1 - age / 5) : seen[i] ? .07 : 0;
      const near = K.dist(x * C + C / 2, y * C + C / 2, sub.x, sub.y) < 90 ? .35 : 0;
      const al = Math.max(a, near); if (al <= 0) continue;
      const edge = !cell(x + 1, y) || !cell(x - 1, y) || !cell(x, y + 1) || !cell(x, y - 1);
      gr.fillStyle = `rgba(57,255,156,${al * (edge ? .9 : .16)})`; if (edge) gr.fillRect(x * C + 3, y * C + 3, C - 6, C - 6); else gr.fillRect(x * C + 12, y * C + 12, 8, 8);
    }
    for (const p of pings) { gr.strokeStyle = `rgba(57,255,156,${.6 * (1 - p.r / 900)})`; gr.lineWidth = 3; gr.beginPath(); gr.arc(p.x, p.y, p.r, 0, 7); gr.stroke(); }
    for (const it of items) if (!it.got) { const a = Math.max(0, 1 - (K.t - it.seenT) / 6) || (K.dist(it.x, it.y, sub.x, sub.y) < 110 ? .9 : 0); if (a > 0) { gr.globalAlpha = a; gr.strokeStyle = '#ffe36e'; gr.lineWidth = 3; gr.strokeRect(it.x - 12, it.y - 12, 24, 24); gr.fillStyle = '#ffe36e'; gr.fillRect(it.x - 5, it.y - 5, 10, 10); gr.globalAlpha = 1; } }
    { const a = got >= 3 ? 1 : Math.max(0, 1 - (K.t - hatch.seenT) / 6); if (a > 0) { gr.globalAlpha = a; gr.strokeStyle = got >= 3 ? '#7cf2ff' : '#3a8a6a'; gr.lineWidth = 4; gr.beginPath(); gr.arc(hatch.x, hatch.y, 22 + Math.sin(K.t * 4) * 3, 0, 7); gr.stroke(); gr.font = '16px "Share Tech Mono", monospace'; gr.fillStyle = gr.strokeStyle; gr.textAlign = 'center'; gr.fillText(got >= 3 ? 'HATCH' : 'HATCH (LOCKED)', hatch.x, hatch.y - 34); gr.globalAlpha = 1; } }
    for (const b of beasts) { const a = Math.max(0, 1 - (K.t - b.seenT) / 2.2); if (a > 0) { gr.globalAlpha = a; gr.fillStyle = '#ff4a4a'; gr.shadowColor = '#ff4a4a'; gr.shadowBlur = 30; gr.beginPath(); gr.ellipse(b.x, b.y, 46, 30, Math.atan2(sub.y - b.y, sub.x - b.x), 0, 7); gr.fill(); gr.shadowBlur = 0; gr.globalAlpha = 1; }
      const d = K.dist(b.x, b.y, sub.x, sub.y); if (d < 130) { gr.globalAlpha = (130 - d) / 130 * .9; gr.fillStyle = '#000'; gr.beginPath(); gr.ellipse(b.x, b.y, 60, 40, Math.atan2(sub.y - b.y, sub.x - b.x), 0, 7); gr.fill(); gr.fillStyle = '#d8ffd0'; gr.beginPath(); gr.arc(b.x + 10, b.y - 6, 6, 0, 7); gr.fill(); gr.globalAlpha = 1; } }
    // the sub and its small light
    const lg = gr.createRadialGradient(sub.x, sub.y, 10, sub.x, sub.y, 110); lg.addColorStop(0, 'rgba(57,255,156,.18)'); lg.addColorStop(1, 'rgba(57,255,156,0)'); gr.fillStyle = lg; gr.beginPath(); gr.arc(sub.x, sub.y, 110, 0, 7); gr.fill();
    gr.save(); gr.translate(sub.x, sub.y); gr.rotate(sub.a); gr.fillStyle = '#c8ffe0'; gr.beginPath(); gr.ellipse(0, 0, 18, 9, 0, 0, 7); gr.fill(); gr.fillRect(-4, -14, 8, 8); gr.fillStyle = '#010805'; gr.beginPath(); gr.arc(8, 0, 3, 0, 7); gr.fill(); gr.restore();
    gr.restore();
    // passive sonar: the direction of anything close
    for (const b of beasts) { const d = K.dist(b.x, b.y, sub.x, sub.y); if (d < 700) { const a = Math.atan2(b.y - sub.y, b.x - sub.x); gr.strokeStyle = `rgba(255,74,74,${(1 - d / 700) * .9})`; gr.lineWidth = 8; gr.beginPath(); gr.arc(W / 2, H / 2, 300, a - .25, a + .25); gr.stroke(); } }
    // CRT and HUD
    gr.fillStyle = 'rgba(0,0,0,.18)'; for (let y = v.y0; y < v.y1; y += 4) gr.fillRect(v.x0, y, v.x1 - v.x0, 2);
    const vg = gr.createRadialGradient(W / 2, H / 2, 250, W / 2, H / 2, 820); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.85)'); gr.fillStyle = vg; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const near = GAME._near || 1e9; if (near < 300) { gr.fillStyle = `rgba(255,0,0,${(300 - near) / 300 * .12 * (1 + Math.sin(K.t * 12))})`; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
    gr.font = '22px "Share Tech Mono", monospace'; gr.textAlign = 'left'; gr.textBaseline = 'top'; gr.fillStyle = '#39ff9c';
    gr.fillText(`DEPTH ${300 + level * 250}m`, 70, 18); gr.fillText(`PARTS ${got}/3`, 70, 46);
    gr.fillText('O2', 300, 18); gr.strokeStyle = '#39ff9c'; gr.strokeRect(340, 20, 200, 18); gr.fillStyle = o2 < 40 ? '#ff4a4a' : '#39ff9c'; gr.fillRect(342, 22, 196 * K.clamp(o2 / (200 + level * 20), 0, 1), 14);
    gr.fillStyle = '#39ff9c'; gr.fillText('HULL', 300, 46); gr.strokeRect(360, 48, 180, 18); gr.fillStyle = hull < 35 ? '#ff4a4a' : '#39ff9c'; gr.fillRect(362, 50, 176 * Math.max(0, hull / 100), 14);
    const sp = Math.abs(sub.v); gr.fillStyle = sp > 95 ? '#ff4a4a' : '#39ff9c'; gr.fillText(sp > 95 ? 'ENGINE: LOUD' : sp > 10 ? 'ENGINE: QUIET' : 'ENGINE: IDLE', 1000, 18);
    if (msgT > 0) { gr.globalAlpha = Math.min(1, msgT); gr.textAlign = 'center'; gr.font = '26px "Share Tech Mono", monospace'; gr.fillStyle = '#c8ffe0'; gr.fillText(msg, W / 2, 110); gr.globalAlpha = 1; }
    // ping button
    const ready = sub.pingCd <= 0; gr.strokeStyle = ready ? '#39ff9c' : 'rgba(57,255,156,.3)'; gr.lineWidth = 4; gr.beginPath(); gr.arc(PB.x, PB.y, PB.r, 0, 7); gr.stroke();
    if (!ready) { gr.fillStyle = 'rgba(57,255,156,.15)'; gr.beginPath(); gr.moveTo(PB.x, PB.y); gr.arc(PB.x, PB.y, PB.r, -Math.PI / 2, -Math.PI / 2 + 6.283 * (1 - sub.pingCd / PING_CD)); gr.fill(); }
    gr.fillStyle = ready ? '#39ff9c' : 'rgba(57,255,156,.4)'; gr.font = '28px "Share Tech Mono", monospace'; gr.textAlign = 'center'; gr.textBaseline = 'middle'; gr.fillText('PING', PB.x, PB.y);
    if (win) { gr.fillStyle = `rgba(0,0,0,${Math.min(1, win / 2)})`; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
  };
  function eye(gr, t) {
    const v = K.view, k = Math.min(1, t * 1.5);
    for (let i = 0; i < 900; i++) { gr.fillStyle = `rgba(${Math.random() < .5 ? '57,255,156' : '255,74,74'},${Math.random() * .25})`; gr.fillRect(v.x0 + Math.random() * (v.x1 - v.x0), v.y0 + Math.random() * (v.y1 - v.y0), 3, 3); }
    gr.save(); gr.translate(W / 2 + (Math.random() - .5) * 20, H / 2); gr.scale(.6 + k * .9, .6 + k * .9);
    gr.fillStyle = '#1a0606'; gr.beginPath(); gr.ellipse(0, 0, 420, 220, 0, 0, 7); gr.fill();
    const ir = gr.createRadialGradient(0, 0, 10, 0, 0, 200); ir.addColorStop(0, '#ffef9a'); ir.addColorStop(.5, '#ff7a1a'); ir.addColorStop(1, '#3a0a00'); gr.fillStyle = ir; gr.beginPath(); gr.arc(0, 0, 190, 0, 7); gr.fill();
    gr.fillStyle = '#000'; gr.beginPath(); gr.ellipse(0, 0, 26 + Math.sin(t * 9) * 6, 170, 0, 0, 7); gr.fill();
    gr.restore();
  }
})();
