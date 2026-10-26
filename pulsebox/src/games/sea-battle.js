/* Sea Battle: the classic fleet game for 2. Hide your 5 ships, then take turns firing at the enemy's waters;
   a hit earns another shot. Sink the whole fleet to win. Online through the shared MP lobby (each fleet stays on its
   owner's device: you only ever learn hit or miss), or against the computer, which hunts and then finishes ships off. */
// @use mp
const GAME = {
  id: 'sea-battle', title: 'Sea Battle', tagline: 'Hide your fleet. Hunt theirs. Two admirals, one ocean.',
  font: 'Black Ops One', accent: '#ffd23f', accent2: '#3ec5ff', bg: '#06243d', noSkins: true, noHud: true, scoreLabel: 'Ships sunk',
  how: ['Place your ships: drag one to move it, tap it to turn it, or press Shuffle. Then press Ready.', 'Take turns firing at the enemy grid on the right. Hit a ship and you fire again.', 'A ship sinks when every square of it is hit. Sink all 5 to win.', 'Play the computer, or create a room and send a friend the code.'],
  skins: [{ name: 'Default', price: 0, c: ['#fff'] }],
};
(() => {
  const N = 10, CS = 46, LX = 92, RX = 728, GY = 178, FLEET = [['Carrier', 5], ['Battleship', 4], ['Cruiser', 3], ['Submarine', 3], ['Destroyer', 2]];
  let oppId = -1, mode = 'lobby', phase = 'place', vsAI = true, myTurn = false, mine = [], shotsMe = [], shotsThem = [], enemySunk = [], ready = { me: false, them: false }, drag = null, msg = '', msgT = 0, missile = null, ai = null, aiShips = [], oppName = 'Computer', myName = 'You', fx = [], waveT = 0, sunkCount = 0, lostCount = 0, demo = false, demoTurn = 0;
  Object.assign(MP.opts, {
    max: 2, min: 2, bots: 0, solo: 'Play the computer', sub: '2 players. Each fleet stays hidden on its own device.',
    onStart: (cfg, ros) => start(ros),
    onMsg: m => {
      if (mode !== 'play') return;
      if (m.t === 'ready') { ready.them = true; if (MP.isHost() && ready.me) begin(); }
      if (m.t === 'begin') { phase = 'battle'; myTurn = m.first === MP.id; say(myTurn ? 'You fire first!' : `${oppName} fires first.`); }
      if (m.t === 'fire') incoming(m.x, m.y);
      if (m.t === 'res') result(m);
    },
    onLeave: id => { if (mode === 'play') end(true, `${oppName} left the battle.`); },
  });
  /* ---------- fleets ---------- */
  function randomFleet() {
    for (;;) {
      const ships = [], occ = new Set(); let ok = true;
      for (const [name, len] of FLEET) {
        let placed = false;
        for (let t = 0; t < 200 && !placed; t++) { const v = Math.random() < .5, x = Math.floor(Math.random() * (N - (v ? 0 : len - 1))), y = Math.floor(Math.random() * (N - (v ? len - 1 : 0))), s = { name, len, x, y, v }; if (fits(s, ships)) { ships.push(s); placed = true; } }
        if (!placed) { ok = false; break; }
      }
      if (ok) return ships;
    }
  }
  const cells = s => Array.from({ length: s.len }, (_, i) => [s.x + (s.v ? 0 : i), s.y + (s.v ? i : 0)]);
  function fits(s, ships) {
    if (s.x < 0 || s.y < 0 || s.x + (s.v ? 0 : s.len - 1) >= N || s.y + (s.v ? s.len - 1 : 0) >= N) return false;
    const mine2 = new Set(cells(s).map(([x, y]) => x + ',' + y));
    return !ships.some(o => o !== s && cells(o).some(([x, y]) => mine2.has(x + ',' + y)));
  }
  const shipAt = (ships, x, y) => ships.find(s => cells(s).some(([a, b]) => a === x && b === y));
  /* ---------- flow ---------- */
  function start(ros) {
    mode = 'play'; phase = 'place'; vsAI = !MP.online(); mine = randomFleet(); shotsMe = []; shotsThem = []; enemySunk = []; ready = { me: false, them: false }; fx = []; missile = null; sunkCount = lostCount = 0; K.score = 0;
    myName = MP.name; const opp = ros.find(r => r.id !== MP.id); oppName = vsAI ? 'Computer' : opp ? opp.name : 'Opponent'; oppId = opp ? opp.id : -1;
    if (vsAI) { aiShips = randomFleet(); ai = { hits: [], tried: new Set() }; }
    say('Place your fleet, then press READY.');
  }
  function readyUp() {
    if (ready.me) return; ready.me = true; K.sfx(660, .15, 'triangle', .08);
    if (vsAI) { phase = 'battle'; myTurn = Math.random() < .5; say(myTurn ? 'You fire first!' : 'The computer fires first.'); if (!myTurn) setTimeout(aiFire, 1200); return; }
    MP.send({ t: 'ready' }); say(`Waiting for ${oppName}...`);
    if (MP.isHost() && ready.them) begin();
  }
  function begin() { const m = { t: 'begin', first: Math.random() < .5 ? MP.id : oppId }; MP.send(m); phase = 'battle'; myTurn = m.first === MP.id; say(myTurn ? 'You fire first!' : `${oppName} fires first.`); }
  function say(s) { msg = s; msgT = 3.5; }
  // you fire
  function fire(x, y) {
    if (phase !== 'battle' || !myTurn || missile || shotsMe.some(s => s.x === x && s.y === y)) return;
    myTurn = false;
    missile = { from: [LX + 230, GY + 470], to: [RX + (x + .5) * CS, GY + (y + .5) * CS], t: 0, x, y, side: 'them' };
    K.sfx(900, .55, 'sine', .05, -700);
    if (vsAI) setTimeout(() => { const s = shipAt(aiShips, x, y), hit = !!s; let sunk = null; if (hit) { s.hits = (s.hits || 0) + 1; if (s.hits >= s.len) sunk = { name: s.name, cells: cells(s) }; } result({ x, y, hit, sunk, lose: aiShips.every(q => (q.hits || 0) >= q.len) }); }, 600);
    else MP.send({ t: 'fire', x, y });
  }
  function result(m) {
    shotsMe.push({ x: m.x, y: m.y, hit: m.hit });
    boom(RX, m.x, m.y, m.hit);
    if (m.sunk) { enemySunk.push(m.sunk); sunkCount++; K.add(1); K.coin(1); say(`You sank their ${m.sunk.name}!`); K.chime(523, [0, 4, 7, 12]); } else say(m.hit ? 'HIT! Fire again.' : 'Miss.');
    if (m.lose) return setTimeout(() => end(true), 1200);
    myTurn = m.hit; if (!m.hit && vsAI) setTimeout(aiFire, 1100);
  }
  // they fire at you
  function incoming(x, y) {
    missile = { from: [RX + 230, GY + 470], to: [LX + (x + .5) * CS, GY + (y + .5) * CS], t: 0, x, y, side: 'me' };
    K.sfx(900, .55, 'sine', .05, -700);
    setTimeout(() => {
      const s = shipAt(mine, x, y), hit = !!s; let sunk = null;
      shotsThem.push({ x, y, hit }); boom(LX, x, y, hit);
      if (hit) { s.hits = (s.hits || 0) + 1; if (s.hits >= s.len) { sunk = { name: s.name, cells: cells(s) }; s.sunk = true; lostCount++; say(`They sank your ${s.name}!`); } else say(`${oppName} hit your ${s.name}!`); } else say(`${oppName} missed.`);
      const lose = mine.every(q => (q.hits || 0) >= q.len);
      if (!vsAI) MP.send({ t: 'res', x, y, hit, sunk, lose });
      if (lose) return setTimeout(() => end(false), 1200);
      myTurn = !hit; if (hit && vsAI) setTimeout(aiFire, 1100);
    }, 600);
  }
  function aiFire() {
    if (phase !== 'battle' || mode !== 'play') return;
    const tried = ai.tried, ok = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !tried.has(x + ',' + y);
    let pick = null;
    const open = ai.hits.filter(h => !h.done);
    if (open.length) {
      const line = open.length > 1 ? (open[0].x === open[1].x ? 'v' : open[0].y === open[1].y ? 'h' : null) : null, cand = [];
      for (const h of open) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (line === 'v' && dx) continue; if (line === 'h' && dy) continue; if (ok(h.x + dx, h.y + dy)) cand.push([h.x + dx, h.y + dy]); }
      if (cand.length) pick = K.pick(cand);
    }
    if (!pick) { const c = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (ok(x, y) && (x + y) % 2 === 0) c.push([x, y]); if (!c.length) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (ok(x, y)) c.push([x, y]); pick = K.pick(c); }
    tried.add(pick[0] + ',' + pick[1]);
    const before = mine.map(s => s.hits || 0);
    incoming(pick[0], pick[1]);
    setTimeout(() => { const s = shipAt(mine, pick[0], pick[1]); if (s) { ai.hits.push({ x: pick[0], y: pick[1] }); if (s.sunk) for (const h of ai.hits) if (cells(s).some(([a, b]) => a === h.x && b === h.y)) h.done = true; } void before; }, 650);
  }
  function boom(ox, x, y, hit) {
    const cx = ox + (x + .5) * CS, cy = GY + (y + .5) * CS;
    if (hit) { K.burst(cx, cy, ['#ffd23f', '#ff6a3d', '#fff'], 26, 340, { life: .7, size: 8 }); K.noise(.4, .3, 200); K.sfx(80, .5, 'square', .12, -40); K.shake(12); fx.push({ k: 'fire', x: cx, y: cy, t: 0 }); }
    else { K.burst(cx, cy, ['#bfe8ff', '#fff'], 16, 200, { life: .5, size: 5 }); K.noise(.25, .12, 1500); fx.push({ k: 'ring', x: cx, y: cy, t: 0 }); }
  }
  function end(won, why) {
    if (mode !== 'play') return; mode = 'over'; phase = 'over';
    K.score = sunkCount; if (won) K.coin(10);
    K.over({ title: won ? 'Victory at sea!' : 'Your fleet is sunk', text: why || `You sank ${sunkCount} ships and lost ${lostCount}.`, delay: 400 });
  }
  /* ---------- input ---------- */
  const cellAt = (ox, x, y) => { const cx = Math.floor((x - ox) / CS), cy = Math.floor((y - GY) / CS); return cx >= 0 && cy >= 0 && cx < N && cy < N ? [cx, cy] : null; };
  const BTN = { shuffle: [LX + 40, 668, 170, 44], ready: [LX + 250, 668, 170, 44] };
  const inB = (b, x, y) => x > b[0] && x < b[0] + b[2] && y > b[1] && y < b[1] + b[3];
  GAME.down = (x, y) => {
    if (mode !== 'play') return;
    if (phase === 'place' && !ready.me) {
      if (inB(BTN.shuffle, x, y)) { mine = randomFleet(); K.sfx(500, .08, 'square', .05); return; }
      if (inB(BTN.ready, x, y)) return readyUp();
      const c = cellAt(LX, x, y); if (!c) return; const s = shipAt(mine, c[0], c[1]); if (!s) return;
      drag = { s, ox: s.x, oy: s.y, gx: c[0] - s.x, gy: c[1] - s.y, moved: false };
      return;
    }
    if (phase === 'battle') { const c = cellAt(RX, x, y); if (c) fire(c[0], c[1]); }
  };
  GAME.move = (x, y) => {
    if (!drag) return; const c = cellAt(LX, x, y); if (!c) return;
    const nx = c[0] - drag.gx, ny = c[1] - drag.gy; if (nx === drag.s.x && ny === drag.s.y) return;
    const keep = [drag.s.x, drag.s.y]; drag.s.x = nx; drag.s.y = ny; if (!fits(drag.s, mine)) { drag.s.x = keep[0]; drag.s.y = keep[1]; } else drag.moved = true;
  };
  GAME.up = () => {
    if (!drag) return;
    if (!drag.moved) { drag.s.v = !drag.s.v; if (!fits(drag.s, mine)) drag.s.v = !drag.s.v; else K.sfx(600, .06, 'square', .05); }
    drag = null;
  };
  GAME.key = (c, d) => { if (!d || mode !== 'play') return; if (c === 'KeyR' && phase === 'place') { mine = randomFleet(); } if ((c === 'Enter' || c === 'Space') && phase === 'place') readyUp(); };
  /* ---------- kit hooks ---------- */
  GAME.reset = () => {
    drag = null; demo = false;
    if (K.bot) { demo = true; mode = 'play'; phase = 'battle'; vsAI = true; mine = randomFleet(); aiShips = randomFleet(); shotsMe = []; shotsThem = []; enemySunk = []; fx = []; ai = { hits: [], tried: new Set() }; oppName = 'Computer'; myName = 'Admiral Bot'; demoTurn = 0; myTurn = true; demo2 = { hits: [], tried: new Set() }; return; }
    mode = 'lobby'; MP.show();
  };
  let demo2 = null, demoT = 0;
  function demoFire() {
    // the attract-mode bot plays your side with the same hunting logic
    const tried = demo2.tried, ok = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !tried.has(x + ',' + y);
    let pick = null; const open = demo2.hits.filter(h => !h.done);
    for (const h of open) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!pick && ok(h.x + dx, h.y + dy)) pick = [h.x + dx, h.y + dy];
    if (!pick) { const c = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (ok(x, y) && (x + y) % 2 === 0) c.push([x, y]); pick = c.length ? K.pick(c) : null; }
    if (!pick) return; tried.add(pick[0] + ',' + pick[1]);
    const s = shipAt(aiShips, pick[0], pick[1]); fire(pick[0], pick[1]); if (s) { demo2.hits.push({ x: pick[0], y: pick[1] }); setTimeout(() => { if ((s.hits || 0) >= s.len) for (const h of demo2.hits) if (cells(s).some(([a, b]) => a === h.x && b === h.y)) h.done = true; }, 700); }
  }
  GAME.update = dt => {
    waveT += dt; msgT -= dt;
    if (missile) { missile.t += dt / .6; if (missile.t >= 1) missile = null; }
    for (let i = fx.length - 1; i >= 0; i--) { fx[i].t += dt; if (fx[i].k === 'ring' && fx[i].t > 1) fx.splice(i, 1); }
    if (demo && mode === 'play' && phase === 'battle' && myTurn && !missile) { demoT -= dt; if (demoT <= 0) { demoT = .7; demoFire(); } }
    if (demo && mode === 'over') { /* the kit restarts attract mode */ }
  };
  /* ---------- drawing ---------- */
  function water(g, ox, t) {
    const gr = g.createLinearGradient(0, GY, 0, GY + N * CS); gr.addColorStop(0, '#0d4c7a'); gr.addColorStop(1, '#072f50'); g.fillStyle = gr; g.fillRect(ox, GY, N * CS, N * CS);
    g.strokeStyle = 'rgba(160,220,255,.12)'; g.lineWidth = 2;
    for (let k = 0; k < 14; k++) { g.beginPath(); for (let x = 0; x <= N * CS; x += 10) { const y = GY + k * 34 + 10 + Math.sin(x * .04 + t * 1.6 + k) * 4; x ? g.lineTo(ox + x, y) : g.moveTo(ox + x, y); } g.stroke(); }
    g.strokeStyle = 'rgba(190,230,255,.22)'; g.lineWidth = 1; for (let i = 0; i <= N; i++) { g.beginPath(); g.moveTo(ox + i * CS, GY); g.lineTo(ox + i * CS, GY + N * CS); g.stroke(); g.beginPath(); g.moveTo(ox, GY + i * CS); g.lineTo(ox + N * CS, GY + i * CS); g.stroke(); }
    g.fillStyle = 'rgba(200,235,255,.7)'; g.font = '14px "Black Ops One"'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < N; i++) { g.fillText('ABCDEFGHIJ'[i], ox + (i + .5) * CS, GY - 14); g.fillText(i + 1, ox - 16, GY + (i + .5) * CS); }
    g.strokeStyle = '#9fd8ff'; g.lineWidth = 3; g.strokeRect(ox, GY, N * CS, N * CS);
  }
  function ship(g, s, ox, sunk) {
    const x = ox + s.x * CS + 4, y = GY + s.y * CS + 4, w = (s.v ? 1 : s.len) * CS - 8, h = (s.v ? s.len : 1) * CS - 8;
    g.save(); g.translate(x + w / 2, y + h / 2); if (s.v) g.rotate(Math.PI / 2); const L = Math.max(w, h), Wd = Math.min(w, h);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(3, 4, L / 2, Wd / 2, 0, 0, 7); g.fill();
    const hull = g.createLinearGradient(0, -Wd / 2, 0, Wd / 2); hull.addColorStop(0, sunk ? '#3a2a2a' : '#c6ced8'); hull.addColorStop(.5, sunk ? '#2a1a1a' : '#8e98a6'); hull.addColorStop(1, sunk ? '#1a1010' : '#5a6472');
    g.fillStyle = hull; g.beginPath(); g.moveTo(-L / 2 + 6, -Wd / 2); g.lineTo(L / 2 - 14, -Wd / 2); g.quadraticCurveTo(L / 2 + 4, 0, L / 2 - 14, Wd / 2); g.lineTo(-L / 2 + 6, Wd / 2); g.quadraticCurveTo(-L / 2 - 2, 0, -L / 2 + 6, -Wd / 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = sunk ? '#2a1a1a' : '#66707e'; for (let k = 0; k < s.len - 1; k++) { const px = -L / 2 + CS * (k + .75); g.beginPath(); g.arc(px, 0, Wd * .22, 0, 7); g.fill(); g.fillRect(px, -2, Wd * .45, 4); }
    if (s.len >= 4) { g.fillStyle = sunk ? '#3a2020' : '#dfe6ee'; g.fillRect(-6, -Wd * .3, 16, Wd * .6); }
    g.restore();
  }
  function marks(g, ox, shots, t) {
    for (const s of shots) {
      const cx = ox + (s.x + .5) * CS, cy = GY + (s.y + .5) * CS;
      if (s.hit) { g.fillStyle = 'rgba(255,90,40,.35)'; g.beginPath(); g.arc(cx, cy, 18, 0, 7); g.fill(); for (let k = 0; k < 4; k++) { const f = (t * 3 + k * .25 + s.x * .3) % 1; g.fillStyle = `rgba(${255},${120 + k * 30},40,${1 - f})`; g.beginPath(); g.arc(cx + Math.sin(k * 2 + t * 5) * 5, cy - f * 26, 9 * (1 - f) + 3, 0, 7); g.fill(); g.fillStyle = `rgba(60,60,60,${.5 * (1 - f)})`; g.beginPath(); g.arc(cx + Math.sin(k + t) * 8, cy - 18 - f * 30, 7 + f * 8, 0, 7); g.fill(); } g.strokeStyle = '#ff4d2a'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 10, cy - 10); g.lineTo(cx + 10, cy + 10); g.moveTo(cx + 10, cy - 10); g.lineTo(cx - 10, cy + 10); g.stroke(); }
      else { g.fillStyle = 'rgba(220,240,255,.75)'; g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill(); g.strokeStyle = 'rgba(220,240,255,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 12 + Math.sin(t * 3 + s.x) * 2, 0, 7); g.stroke(); }
    }
  }
  GAME.draw = g => {
    const v = K.view, t = K.t;
    if (posed) { g.translate(640, 410); g.scale(1.25, 1.25); g.translate(-(RX + 200), -(GY + 250)); }
    const bg = g.createLinearGradient(0, v.y0, 0, v.y1); bg.addColorStop(0, '#0a3558'); bg.addColorStop(1, '#03182b'); g.fillStyle = bg; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.textBaseline = 'middle';
    g.font = '30px "Black Ops One"'; g.textAlign = 'center'; g.fillStyle = '#ffd23f'; g.fillText('SEA BATTLE', 640, 40);
    water(g, LX, t); water(g, RX, t);
    g.font = '22px "Black Ops One"'; g.fillStyle = '#cfefff'; g.fillText(`${myName.toUpperCase()}'S FLEET`, LX + N * CS / 2, GY - 52); g.fillText(`${oppName.toUpperCase()}'S WATERS`, RX + N * CS / 2, GY - 52);
    if (mode === 'play' || mode === 'over') {
      for (const s of mine) ship(g, s, LX, s.sunk);
      for (const s of enemySunk) { const a = s.cells[0], b = s.cells[s.cells.length - 1]; ship(g, { x: a[0], y: a[1], len: s.cells.length, v: a[0] === b[0] && s.cells.length > 1 }, RX, true); }
      marks(g, LX, shotsThem, t); marks(g, RX, shotsMe, t);
      for (const f of fx) if (f.k === 'ring') { g.strokeStyle = `rgba(220,240,255,${1 - f.t})`; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, 8 + f.t * 40, 0, 7); g.stroke(); }
      // radar sweep over the enemy grid while it is your turn
      if (phase === 'battle' && myTurn) { g.save(); g.beginPath(); g.rect(RX, GY, N * CS, N * CS); g.clip(); const a = t * 1.6, cx = RX + N * CS / 2, cy = GY + N * CS / 2; const sw = g.createConicGradient ? g.createConicGradient(a, cx, cy) : null; if (sw) { sw.addColorStop(0, 'rgba(90,255,140,.22)'); sw.addColorStop(.12, 'rgba(90,255,140,0)'); sw.addColorStop(1, 'rgba(90,255,140,0)'); g.fillStyle = sw; g.fillRect(RX, GY, N * CS, N * CS); } g.restore(); }
      if (missile) { const k = missile.t, x = K.lerp(missile.from[0], missile.to[0], k), y = K.lerp(missile.from[1], missile.to[1], k) - Math.sin(k * Math.PI) * 220; g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.fillStyle = 'rgba(255,200,120,.5)'; for (let i = 1; i < 6; i++) { const kk = Math.max(0, k - i * .03); g.beginPath(); g.arc(K.lerp(missile.from[0], missile.to[0], kk), K.lerp(missile.from[1], missile.to[1], kk) - Math.sin(kk * Math.PI) * 220, 6 - i, 0, 7); g.fill(); } }
      // hover marker
      if (phase === 'battle' && myTurn && hover) { const c = cellAt(RX, hover[0], hover[1]); if (c) { g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.strokeRect(RX + c[0] * CS + 2, GY + c[1] * CS + 2, CS - 4, CS - 4); } }
      // status
      g.font = '24px "Black Ops One"'; g.fillStyle = phase === 'battle' ? (myTurn ? '#5cf28a' : '#ff9f43') : '#ffd23f';
      const status = phase === 'place' ? (ready.me ? `Waiting for ${oppName}...` : 'Drag to move, tap to turn') : phase === 'battle' ? (myTurn ? 'YOUR TURN: FIRE!' : `${oppName.toUpperCase()} IS AIMING...`) : '';
      g.fillText(status, 640, 110);
      if (msgT > 0) { g.globalAlpha = Math.min(1, msgT); g.font = '20px "Black Ops One"'; g.fillStyle = '#fff'; g.fillText(msg, 640, 142); g.globalAlpha = 1; }
      if (phase === 'place' && !ready.me) for (const [k, b] of Object.entries(BTN)) { g.fillStyle = k === 'ready' ? '#ffd23f' : 'rgba(255,255,255,.15)'; g.beginPath(); g.roundRect(b[0], b[1], b[2], b[3], 12); g.fill(); g.fillStyle = k === 'ready' ? '#06243d' : '#fff'; g.font = '20px "Black Ops One"'; g.fillText(k.toUpperCase(), b[0] + b[2] / 2, b[1] + b[3] / 2 + 1); }
      if (phase === 'place' && !vsAI) { g.font = '18px "Black Ops One"'; g.fillStyle = ready.them ? '#5cf28a' : 'rgba(255,255,255,.5)'; g.fillText(ready.them ? `${oppName} is ready` : `${oppName} is placing ships...`, RX + N * CS / 2, GY + N * CS / 2); }
      // fleet status
      const left = FLEET.length - enemySunk.length; g.font = '18px "Black Ops One"'; g.fillStyle = '#cfefff'; g.textAlign = 'center';
      if (phase !== 'place') { g.fillText(`Enemy ships left: ${left}`, RX + N * CS / 2, 680); g.fillText(`Your ships left: ${mine.filter(s => !s.sunk).length}`, LX + N * CS / 2, 680); }
    }
  };
  let hover = null;
  const mv = GAME.move; GAME.move = (x, y, e) => { hover = [x, y]; mv(x, y, e); };
  let posed = 0;
  GAME.pose = () => {
    posed = 1;
    shotsMe = [[2, 3, 0], [4, 3, 1], [5, 3, 1], [6, 3, 1], [7, 6, 0], [1, 8, 0], [8, 1, 1], [8, 2, 1], [3, 7, 0], [6, 8, 1], [4, 5, 1], [4, 6, 1], [2, 5, 0], [6, 5, 0]].map(([x, y, h]) => ({ x, y, hit: !!h }));
    shotsThem = [[1, 1, 1], [5, 5, 0], [7, 2, 0], [3, 8, 1]].map(([x, y, h]) => ({ x, y, hit: !!h }));
    enemySunk = [{ name: 'Destroyer', cells: [[8, 1], [8, 2]] }]; missile = { from: [LX + 230, GY + 470], to: [RX + 6.5 * CS, GY + 6.5 * CS], t: .62 }; phase = 'battle'; myTurn = true;
  };
  if (/[?&]test/.test(location.search)) window.SB = { get phase() { return phase; }, get myTurn() { return myTurn; }, get shotsMe() { return shotsMe; }, get shotsThem() { return shotsThem; }, get mine() { return mine; }, get mode() { return mode; }, fire };
})();
