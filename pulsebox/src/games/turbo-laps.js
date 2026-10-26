/* Turbo Laps: top-down kart racing for up to 6, 3 laps on one of three tracks. Drift with the handbrake to charge a
   mini-turbo, hit the boost pads, don't leave the asphalt. Online rooms through the shared MP lobby: every player drives
   their own car and sends where it is; the host also drives the bots that fill empty grid slots. */
// @use mp
const GAME = {
  id: 'turbo-laps', title: 'Turbo Laps', tagline: 'Drift, boost and race your friends. 3 laps, 3 tracks.',
  font: 'Russo One', accent: '#ffd23f', accent2: '#ff4d6d', bg: '#0e1a10', noSkins: true, noHud: true, scoreLabel: 'Points',
  how: ['W or Up to accelerate, S or Down to brake, A and D (or Left and Right) to steer.', 'Hold Space while turning to DRIFT. Drift for a second, then let go for a mini-turbo.', 'Yellow arrows on the track are boost pads. The grass slows you right down.', 'On a phone: the car drives itself forward; hold the left or right side to steer, both to brake.'],
  skins: [{ name: 'Default', price: 0, c: ['#fff'] }],
};
(() => {
  const LAPS = 3, HW = 120, N = 640;
  const TRACKS = [
    { n: 'Sunset Loop', grass: ['#3f8f3a', '#4a9a42'], pts: [[400, 900], [500, 420], [1000, 260], [1600, 300], [2100, 500], [2250, 1000], [2000, 1450], [1400, 1520], [1000, 1250], [700, 1520], [380, 1350]] },
    { n: 'Twisty Pines', grass: ['#2f6f3a', '#367a40'], pts: [[400, 420], [900, 300], [1300, 520], [1700, 300], [2200, 450], [2320, 900], [1900, 1100], [2220, 1450], [1700, 1680], [1200, 1420], [800, 1680], [340, 1420], [520, 900]] },
    { n: 'Harbor Run', grass: ['#c9b27a', '#d4bd84'], pts: [[350, 350], [1300, 300], [2300, 360], [2380, 640], [1500, 760], [900, 760], [820, 1060], [1500, 1100], [2300, 1130], [2360, 1560], [1300, 1660], [420, 1640], [280, 1000]] },
  ];
  let mode = 'lobby', roster = [], C = [], tr = null, mine = 0, cam = { x: 0, y: 0 }, clock = 0, goT = 0, phase = 'count', skids = [], decor = [], sendT = 0, botT = 0, endT = 0, results = null, touch = { l: false, r: false, on: false }, keys = {};
  const host = () => MP.isHost();
  Object.assign(MP.opts, {
    max: 6, min: 1, bots: 6, solo: 'Race 5 bots', sub: '2 to 6 racers. Bots fill the empty grid slots.',
    config: () => ({ track: Math.floor(Math.random() * TRACKS.length) }),
    onStart: (cfg, ros) => startRace(cfg, ros),
    onMsg: m => {
      if (mode !== 'play') return;
      if (m.t === 'c') { const c = C.find(q => q.id === m.from); if (c) remote(c, m.c); }
      if (m.t === 'b' && !host()) m.b.forEach(d => { const c = C.find(q => q.id === d[0]); if (c) remote(c, d.slice(1)); });
    },
    onLeave: id => { if (mode !== 'play') return; if (id === -1 || !MP.online()) return; const c = C.find(q => q.id === id); if (c) c.gone = true; if (id === MP.hostId) {} },
  });
  /* ---------- track ---------- */
  function buildTrack(k) {
    const T = TRACKS[k], P = T.pts, cx = [], cy = [];
    const cr = (p0, p1, p2, p3, t) => .5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
    const raw = [];
    for (let i = 0; i < P.length; i++) { const a = P[(i - 1 + P.length) % P.length], b = P[i], c = P[(i + 1) % P.length], d = P[(i + 2) % P.length]; for (let s = 0; s < 40; s++) { const t = s / 40; raw.push([cr(a[0], b[0], c[0], d[0], t), cr(a[1], b[1], c[1], d[1], t)]); } }
    // resample evenly
    const len = [0]; for (let i = 1; i <= raw.length; i++) len.push(len[i - 1] + Math.hypot(raw[i % raw.length][0] - raw[i - 1][0], raw[i % raw.length][1] - raw[i - 1][1]));
    const total = len[len.length - 1]; let j = 0;
    for (let i = 0; i < N; i++) { const d = i / N * total; while (len[j + 1] < d) j++; const f = (d - len[j]) / (len[j + 1] - len[j] || 1), a = raw[j], b = raw[(j + 1) % raw.length]; cx.push(a[0] + (b[0] - a[0]) * f); cy.push(a[1] + (b[1] - a[1]) * f); }
    const tx = [], ty = []; for (let i = 0; i < N; i++) { const dx = cx[(i + 1) % N] - cx[(i - 1 + N) % N], dy = cy[(i + 1) % N] - cy[(i - 1 + N) % N], l = Math.hypot(dx, dy); tx.push(dx / l); ty.push(dy / l); }
    const curv = cx.map((_, i) => { const a = Math.atan2(ty[i], tx[i]), b = Math.atan2(ty[(i + 18) % N], tx[(i + 18) % N]); return Math.abs(((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI); });
    const pads = []; for (let i = 40; i < N; i += 30) if (curv[i] < .12 && curv[(i - 20 + N) % N] < .12 && !pads.some(p => Math.abs(p - i) < 120)) pads.push(i);
    const minX = Math.min(...cx) - 400, minY = Math.min(...cy) - 400, maxX = Math.max(...cx) + 400, maxY = Math.max(...cy) + 400;
    const path = new Path2D(); cx.forEach((x, i) => i ? path.lineTo(x, cy[i]) : path.moveTo(x, cy[i])); path.closePath();
    return { k, n: T.n, grass: T.grass, cx, cy, tx, ty, curv, pads, total, path, minX, minY, maxX, maxY };
  }
  function nearest(c) {
    let best = c.idx || 0, bd = 1e12;
    const scan = c.idx === undefined || c.lost ? N : 40;
    for (let k = -scan; k <= scan; k++) { const i = ((c.idx || 0) + k + N * 4) % N, d = (tr.cx[i] - c.x) ** 2 + (tr.cy[i] - c.y) ** 2; if (d < bd) { bd = d; best = i; } }
    const lat = (c.x - tr.cx[best]) * -tr.ty[best] + (c.y - tr.cy[best]) * tr.tx[best];
    return { i: best, d: Math.sqrt(bd), lat };
  }
  function makeDecor() {
    decor = []; const R = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(tr.k * 99 + 7);
    for (let n = 0; n < 420 && decor.length < 170; n++) {
      const x = tr.minX + R() * (tr.maxX - tr.minX), y = tr.minY + R() * (tr.maxY - tr.minY);
      let md = 1e9; for (let i = 0; i < N; i += 4) md = Math.min(md, Math.hypot(tr.cx[i] - x, tr.cy[i] - y));
      if (md < HW + 90) continue;
      decor.push({ x, y, k: tr.k === 2 ? (R() < .5 ? 'crate' : 'palm') : R() < .85 ? 'tree' : 'rock', s: .7 + R() * .6 });
    }
  }
  /* ---------- race ---------- */
  function startRace(cfg, ros) {
    roster = ros; tr = buildTrack(cfg.track || 0); makeDecor(); mode = 'play'; phase = 'count'; goT = 3.2; clock = 0; skids = []; results = null; endT = 0; K.score = 0;
    mine = K.bot ? -1 : Math.max(0, ros.findIndex(r => r.id === MP.id && !r.bot));
    C = ros.map((r, i) => {
      const gi = (N - 8 - Math.floor(i / 2) * 9 + N) % N, side = i % 2 ? 1 : -1, x = tr.cx[gi] - tr.ty[gi] * side * 42, y = tr.cy[gi] + tr.tx[gi] * side * 42;
      return { i, id: r.id, name: r.name, col: r.col, bot: !!r.bot, x, y, a: Math.atan2(tr.ty[gi], tr.tx[gi]), vx: 0, vy: 0, sp: 0, idx: gi, lap: 0, half: false, fin: 0, drift: 0, turbo: 0, boost: 0, skill: .85 + Math.random() * .17, laneOff: (Math.random() - .5) * 60 };
    });
    const me = C[mine]; if (me) { cam.x = me.x; cam.y = me.y; } else { cam.x = C[0].x; cam.y = C[0].y; }
  }
  function drive(c, inp, dt) {
    const off = nearest(c); c.idx = off.i; c.lost = false;
    const grass = Math.abs(off.lat) > HW, wall = Math.abs(off.lat) > HW + 150;
    let thr = inp.up ? 1 : 0, brk = inp.down ? 1 : 0, steer = inp.steer;
    if (phase !== 'race') { c.vx = c.vy = 0; c.sp = 0; c.prev = c.idx; return; }
    if (c.fin) { thr = 0; brk = .3; }
    const fx = Math.cos(c.a), fy = Math.sin(c.a);
    let fwd = c.vx * fx + c.vy * fy;
    const maxS = (c.boost > 0 ? 800 : 560) * (grass ? .5 : 1);
    if (thr) fwd += 560 * dt * (c.boost > 0 ? 1.6 : 1); if (brk) fwd = fwd > 0 ? Math.max(0, fwd - 900 * brk * dt) : inp.down && !c.fin ? fwd - 260 * dt : fwd; if (!thr && !brk) fwd *= Math.pow(.6, dt);
    fwd = Math.max(-180, Math.min(maxS, fwd)); if (fwd > maxS) fwd = maxS;
    const turn = steer * Math.min(1, Math.abs(fwd) / 160) * (inp.drift ? 3.4 : 2.6) * Math.sign(fwd || 1);
    c.a += turn * dt;
    // grip pulls velocity toward the heading; drifting lowers it
    const grip = inp.drift && Math.abs(fwd) > 200 ? 2.2 : grass ? 6 : 9;
    const tvx = Math.cos(c.a) * fwd, tvy = Math.sin(c.a) * fwd;
    c.vx += (tvx - c.vx) * Math.min(1, grip * dt); c.vy += (tvy - c.vy) * Math.min(1, grip * dt);
    if (grass) { c.vx *= Math.pow(.35, dt); c.vy *= Math.pow(.35, dt); }
    c.x += c.vx * dt; c.y += c.vy * dt;
    if (wall) { const nx = tr.cx[off.i] - c.x, ny = tr.cy[off.i] - c.y, l = Math.hypot(nx, ny); c.x += nx / l * 30; c.y += ny / l * 30; c.vx *= .3; c.vy *= .3; if (c.i === mine) { K.shake(8); K.sfx(90, .2, 'square', .1, -30); } }
    c.sp = Math.hypot(c.vx, c.vy);
    const slip = Math.abs(Math.atan2(c.vy, c.vx) - c.a) % (Math.PI * 2);
    const sliding = c.sp > 220 && Math.min(slip, Math.PI * 2 - slip) > .22;
    if (inp.drift && sliding && Math.abs(steer) > .3) c.drift += dt; else { if (c.drift > .9) { c.boost = Math.max(c.boost, c.drift > 1.8 ? 1.3 : .8); if (c.i === mine) { K.sfx(500, .3, 'sawtooth', .07, 600); K.burst(c.x, c.y, ['#3ec5ff', '#fff'], 12, 200, { life: .4, gravity: 0 }); } } c.drift = 0; }
    c.boost = Math.max(0, c.boost - dt);
    if (sliding || grass && c.sp > 100) { c.skidT = (c.skidT || 0) - dt; if (c.skidT <= 0) { c.skidT = .03; for (const s of [-1, 1]) skids.push([c.x - Math.cos(c.a) * 16 - Math.sin(c.a) * s * 10, c.y - Math.sin(c.a) * 16 + Math.cos(c.a) * s * 10, grass ? 1 : 0]); if (skids.length > 1400) skids.splice(0, 2); } }
    for (const p of tr.pads) { const d = (p - c.idx + N) % N; if ((d < 4 || d > N - 3) && Math.abs(off.lat) < 60) { if (c.boost < .9 && c.i === mine) { K.sfx(700, .25, 'square', .06, 500); } c.boost = Math.max(c.boost, 1.1); } }
    // laps
    if (c.idx > N * .45 && c.idx < N * .55) c.half = true;
    if (c.prev !== undefined && c.prev > N * .85 && c.idx < N * .15 && c.half) { c.lap++; c.half = false; if (c.lap >= LAPS && !c.fin) { c.fin = clock; if (c.i === mine) { K.chime(523, [0, 4, 7, 12, 16]); } } else if (c.i === mine) K.chime(660, c.lap === LAPS - 1 ? [0, 4, 7, 12, 7, 12] : [0, 7]); }
    c.prev = c.idx;
  }
  function botInput(c) {
    const look = (c.idx + 14 + Math.floor(c.sp / 60)) % N, lx = tr.cx[look] - tr.ty[look] * c.laneOff, ly = tr.cy[look] + tr.tx[look] * c.laneOff;
    const want = Math.atan2(ly - c.y, lx - c.x), da = ((want - c.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const bend = tr.curv[(c.idx + 10) % N] + tr.curv[(c.idx + 22) % N], tooFast = c.sp > (560 - bend * 520) * c.skill;
    return { up: !tooFast, down: tooFast && c.sp > 260, steer: Math.max(-1, Math.min(1, da * 2.4)), drift: bend > .45 && c.sp > 330 && Math.random() < .5 };
  }
  function bump(c) { for (const o of C) { if (o === c || o.gone) continue; const dx = c.x - o.x, dy = c.y - o.y, d = Math.hypot(dx, dy); if (d < 34 && d > 0) { const ov = 34 - d; c.x += dx / d * ov * .6; c.y += dy / d * ov * .6; c.vx *= .96; c.vy *= .96; if (c.i === mine && ov > 4) K.sfx(140, .08, 'square', .06); } } }
  function remote(c, d) { c.tx = d[0]; c.ty = d[1]; c.a = d[2]; c.sp = d[3]; c.lap = d[4]; c.idx = d[5]; c.fin = d[6]; c.boost = d[7] ? 1 : 0; c.drift = d[8] ? 1 : 0; if (c.x === undefined || Math.hypot(c.tx - c.x, c.ty - c.y) > 300) { c.x = c.tx; c.y = c.ty; } }
  const pack = c => [Math.round(c.x), Math.round(c.y), +c.a.toFixed(2), Math.round(c.sp), c.lap, c.idx, +(c.fin || 0).toFixed(2), c.boost > 0 ? 1 : 0, c.drift > .3 ? 1 : 0];
  const order = () => C.slice().sort((a, b) => (b.fin ? 1e6 - b.fin : 0) - (a.fin ? 1e6 - a.fin : 0) || (b.lap * N + b.idx) - (a.lap * N + a.idx));
  function finish() {
    if (mode !== 'play') return; mode = 'over';
    const o = order(), pos = o.findIndex(c => c.i === mine) + 1;
    K.score = mine >= 0 ? Math.max(0, (C.length - pos + 1) * 10) : 0; if (pos === 1) K.coin(10);
    K.over({ title: pos === 1 ? 'You win!' : `You finished ${ord(pos)}`, text: `${tr.n}: ` + o.slice(0, 6).map((c, k) => `${k + 1}. ${c.name}${c.fin ? ' ' + c.fin.toFixed(1) + 's' : ''}`).join('  '), delay: 200 });
  }
  const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
  /* ---------- input ---------- */
  const myInput = () => ({ up: !!(keys.KeyW || keys.ArrowUp) || (touch.on && !(touch.l && touch.r)), down: !!(keys.KeyS || keys.ArrowDown) || (touch.l && touch.r), steer: ((keys.KeyD || keys.ArrowRight || (touch.r && !touch.l)) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft || (touch.l && !touch.r)) ? 1 : 0), drift: !!(keys.Space || keys.ShiftLeft) });
  GAME.key = (c, d) => { keys[c] = d; };
  const ptrs = new Map(); const syncTouch = () => { touch.l = [...ptrs.values()].some(x => x < 640); touch.r = [...ptrs.values()].some(x => x >= 640); };
  GAME.down = (x, y, e) => { if (e && e.pointerType === 'touch') { touch.on = true; ptrs.set(e.pointerId, x); syncTouch(); } };
  GAME.move = (x, y, e) => { if (e && ptrs.has(e.pointerId)) { ptrs.set(e.pointerId, x); syncTouch(); } };
  GAME.up = (x, y, e) => { if (e) ptrs.delete(e.pointerId); syncTouch(); };
  GAME.reset = () => {
    for (const k in keys) keys[k] = false; ptrs.clear(); syncTouch();
    if (K.bot) return startRace({ track: Math.floor(Math.random() * 3) }, ['Blip', 'Zap', 'Mango', 'Pixel', 'Turbo', 'Ziggy'].map((n, i) => ({ id: 'b' + i, name: 'Bot ' + n, col: MP.colors[i], bot: true, seat: i })));
    mode = 'lobby'; tr = buildTrack(0); if (!decor.length || decor.tk !== 0) { makeDecor(); decor.tk = 0; } C = []; MP.show();
  };
  GAME.update = dt => {
    if (mode !== 'play') { if (tr) { cam.x = tr.cx[Math.floor(K.t * 20) % N]; cam.y = tr.cy[Math.floor(K.t * 20) % N]; } return; }
    if (phase === 'count') { goT -= dt; if (goT <= 0) { phase = 'race'; if (!K.bot) K.sfx(880, .4, 'square', .1); } else if (Math.ceil(goT) !== Math.ceil(goT + dt) && !K.bot) K.sfx(440, .15, 'square', .08); }
    else clock += dt;
    for (const c of C) {
      if (c.gone) continue;
      if (c.i === mine) { drive(c, myInput(), dt); bump(c); }
      else if (c.bot && host()) { drive(c, botInput(c), dt); bump(c); }
      else if (c.tx !== undefined) { c.x += (c.tx + Math.cos(c.a) * c.sp * .06 - c.x) * Math.min(1, dt * 10); c.y += (c.ty + Math.sin(c.a) * c.sp * .06 - c.y) * Math.min(1, dt * 10); }
    }
    if (MP.online()) {
      sendT -= dt; botT -= dt;
      if (sendT <= 0 && C[mine]) { sendT = 1 / 15; MP.send({ t: 'c', c: pack(C[mine]) }); }
      if (host() && botT <= 0) { botT = 1 / 12; const b = C.filter(c => c.bot).map(c => [c.id, ...pack(c)]); if (b.length) MP.send({ t: 'b', b }); }
    }
    const me = C[mine] || order()[0];
    if (me) { const la = .5; cam.x += (me.x + me.vx * la - cam.x) * Math.min(1, dt * 4); cam.y += (me.y + me.vy * la - cam.y) * Math.min(1, dt * 4); }
    // the race ends when you have finished and the other humans have too (or 20 s after you did)
    const humans = C.filter(c => !c.bot && !c.gone), done = humans.every(c => c.fin);
    if (K.bot) { if (C.some(c => c.fin) && (endT += dt) > 3) finish(); }
    else if (C[mine] && C[mine].fin) { endT += dt; if ((done && endT > 2.5) || endT > 20) finish(); }
    if (C[mine] && C[mine].i === mine && !K.bot) { const e = C[mine]; e.engT = (e.engT || 0) - dt; if (e.engT <= 0 && phase === 'race') { e.engT = .12; K.sfx(60 + e.sp * .25 + (e.boost > 0 ? 40 : 0), .14, 'sawtooth', .025); } }
  };
  /* ---------- drawing ---------- */
  function car(g, c) {
    g.save(); g.translate(c.x, c.y); g.rotate(c.a);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.roundRect(-22, -11, 48, 28, 8); g.fill();
    if (c.boost > 0) { const fl = 14 + Math.random() * 14; const gr = g.createLinearGradient(-24, 0, -24 - fl, 0); gr.addColorStop(0, '#fff6a0'); gr.addColorStop(.5, '#ff9f43'); gr.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(-22, -6); g.lineTo(-24 - fl, 0); g.lineTo(-22, 6); g.fill(); }
    g.fillStyle = '#111'; for (const [x, y] of [[-13, -14], [-13, 10], [11, -14], [11, 10]]) { g.save(); g.translate(x + 3, y + 2); if (x > 0) g.rotate((c.steerVis || 0) * .4); g.fillRect(-6, -2, 12, 5); g.restore(); }
    const body = g.createLinearGradient(0, -12, 0, 12); body.addColorStop(0, shade(c.col, .35)); body.addColorStop(.5, c.col); body.addColorStop(1, shade(c.col, -.4));
    g.fillStyle = body; g.beginPath(); g.roundRect(-22, -12, 46, 24, 9); g.fill();
    g.fillStyle = 'rgba(20,30,50,.9)'; g.beginPath(); g.roundRect(2, -9, 11, 18, 4); g.fill(); g.beginPath(); g.roundRect(-14, -8, 7, 16, 3); g.fill();
    g.fillStyle = shade(c.col, .2); g.fillRect(-7, -8, 9, 16);
    g.fillStyle = '#222'; g.fillRect(-24, -12, 4, 24);
    g.fillStyle = '#fff8c0'; g.fillRect(21, -10, 3, 5); g.fillRect(21, 5, 3, 5);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '11px "Russo One"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.save(); g.rotate(Math.PI / 2); g.restore();
    g.restore();
    if (c.i !== mine) { g.font = '14px "Russo One"'; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillText(c.name, c.x + 1, c.y - 29); g.fillStyle = c.col; g.fillText(c.name, c.x, c.y - 30); }
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k)))); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; }
  GAME.draw = g => {
    const v = K.view, t = K.t;
    if (!tr) { g.fillStyle = '#000'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); return; }
    g.fillStyle = tr.grass[0]; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.save(); if (posed) { g.translate(640, 380); g.scale(2.5, 2.5); g.translate(-640, -380); } g.translate(640 - cam.x, 380 - cam.y);
    const x0 = cam.x - 700, y0 = cam.y - 420;
    g.fillStyle = tr.grass[1]; for (let gx = Math.floor(x0 / 160) * 160; gx < x0 + 1500; gx += 160) for (let gy = Math.floor(y0 / 160) * 160; gy < y0 + 900; gy += 160) if (((gx + gy) / 160) % 2 === 0) g.fillRect(gx, gy, 160, 160);
    // track: run-off, curbs, asphalt, centre line
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = HW * 2 + 70; g.stroke(tr.path);
    g.strokeStyle = '#fff'; g.lineWidth = HW * 2 + 22; g.stroke(tr.path);
    g.setLineDash([26, 26]); g.strokeStyle = '#e8343a'; g.stroke(tr.path); g.setLineDash([]);
    g.strokeStyle = '#3b3d44'; g.lineWidth = HW * 2; g.stroke(tr.path);
    g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = HW * 1.2; g.stroke(tr.path);
    g.setLineDash([34, 30]); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 4; g.stroke(tr.path); g.setLineDash([]);
    // start line
    { const i = 0, nx = -tr.ty[i], ny = tr.tx[i]; g.save(); g.translate(tr.cx[i], tr.cy[i]); g.rotate(Math.atan2(ny, nx)); for (let k = -6; k < 6; k++) for (let r = 0; r < 2; r++) { g.fillStyle = (k + r) % 2 ? '#111' : '#fff'; g.fillRect(k * 20, r * 12 - 12, 20, 12); } g.restore(); }
    // boost pads
    for (const p of tr.pads) { g.save(); g.translate(tr.cx[p], tr.cy[p]); g.rotate(Math.atan2(tr.ty[p], tr.tx[p])); g.fillStyle = 'rgba(255,210,63,.25)'; g.fillRect(-36, -40, 72, 80); g.fillStyle = Math.sin(t * 10) > 0 ? '#ffd23f' : '#ff9f43'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-26 + k * 20, -24); g.lineTo(-10 + k * 20, 0); g.lineTo(-26 + k * 20, 24); g.lineTo(-18 + k * 20, 24); g.lineTo(-2 + k * 20, 0); g.lineTo(-18 + k * 20, -24); g.fill(); } g.restore(); }
    // skid marks
    g.fillStyle = 'rgba(20,20,22,.35)'; for (const s of skids) if (Math.abs(s[0] - cam.x) < 720 && Math.abs(s[1] - cam.y) < 440) { g.fillStyle = s[2] ? 'rgba(60,40,20,.35)' : 'rgba(18,18,20,.4)'; g.fillRect(s[0] - 3, s[1] - 3, 6, 6); }
    // decor below cars
    for (const d of decor) { if (Math.abs(d.x - cam.x) > 760 || Math.abs(d.y - cam.y) > 480) continue; if (d.k === 'rock') { g.fillStyle = '#7a7a80'; g.beginPath(); g.ellipse(d.x, d.y, 18 * d.s, 13 * d.s, .3, 0, 7); g.fill(); } if (d.k === 'crate') { g.fillStyle = '#9a6a3a'; g.fillRect(d.x - 16 * d.s, d.y - 16 * d.s, 32 * d.s, 32 * d.s); g.strokeStyle = '#6a4220'; g.lineWidth = 3; g.strokeRect(d.x - 16 * d.s, d.y - 16 * d.s, 32 * d.s, 32 * d.s); } }
    for (const c of C) if (!c.gone && c.x !== undefined) car(g, c);
    for (const d of decor) { if (Math.abs(d.x - cam.x) > 760 || Math.abs(d.y - cam.y) > 480 || (d.k !== 'tree' && d.k !== 'palm')) continue; g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(d.x + 10, d.y + 12, 34 * d.s, 0, 7); g.fill(); if (d.k === 'tree') { g.fillStyle = '#1f5a2a'; g.beginPath(); g.arc(d.x, d.y, 34 * d.s, 0, 7); g.fill(); g.fillStyle = '#2d7a3a'; g.beginPath(); g.arc(d.x - 8 * d.s, d.y - 8 * d.s, 22 * d.s, 0, 7); g.fill(); } else { g.strokeStyle = '#2d8a3a'; g.lineWidth = 9 * d.s; for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + d.s; g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x + Math.cos(a) * 36 * d.s, d.y + Math.sin(a) * 36 * d.s); g.stroke(); } g.fillStyle = '#6a4a20'; g.beginPath(); g.arc(d.x, d.y, 7 * d.s, 0, 7); g.fill(); } }
    g.restore();
    if (mode !== 'play' || posed) return;
    // HUD
    const me = C[mine], o = order();
    g.textBaseline = 'middle';
    if (me) {
      const pos = o.indexOf(me) + 1;
      g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.roundRect(20, 16, 230, 96, 16); g.fill();
      g.font = '54px "Russo One"'; g.textAlign = 'left'; g.fillStyle = pos === 1 ? '#ffd23f' : '#fff'; g.fillText(ord(pos), 36, 60);
      g.font = '18px "Russo One"'; g.fillStyle = '#fff'; g.fillText(`/${C.length}`, 36 + g.measureText(ord(pos)).width * 2.9, 72);
      g.font = '20px "Russo One"'; g.fillStyle = '#cfe'; g.fillText(me.fin ? 'FINISHED' : `LAP ${Math.min(LAPS, me.lap + 1)}/${LAPS}`, 36, 96);
      g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.roundRect(1060, 620, 200, 84, 16); g.fill();
      g.font = '40px "Russo One"'; g.textAlign = 'right'; g.fillStyle = me.boost > 0 ? '#ffd23f' : '#fff'; g.fillText(Math.round(me.sp * .32), 1200, 660); g.font = '15px "Russo One"'; g.fillStyle = '#aaa'; g.fillText('KM/H', 1246, 668);
      g.fillStyle = me.drift > .9 ? (me.drift > 1.8 ? '#ff9f43' : '#3ec5ff') : 'rgba(255,255,255,.25)'; g.fillRect(1080, 690, Math.min(1, me.drift / 1.8) * 160, 6);
      if (me.lap === LAPS - 1 && !me.fin && phase === 'race') { g.font = '22px "Russo One"'; g.textAlign = 'center'; g.fillStyle = Math.sin(t * 6) > 0 ? '#ff4d6d' : '#fff'; g.fillText('FINAL LAP', 640, 40); }
    }
    g.font = '20px "Russo One"'; g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText(`${clock.toFixed(1)}s`, 1250, 36);
    // standings
    o.slice(0, 6).forEach((c, k) => { g.fillStyle = c.i === mine ? 'rgba(255,210,63,.3)' : 'rgba(0,0,0,.4)'; g.fillRect(20, 128 + k * 28, 200, 24); g.fillStyle = c.col; g.fillRect(20, 128 + k * 28, 6, 24); g.font = '14px "Russo One"'; g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText(`${k + 1}. ${c.name}`, 34, 141 + k * 28); if (c.fin) { g.textAlign = 'right'; g.fillText(c.fin.toFixed(1), 214, 141 + k * 28); } });
    // minimap
    const mw = 200, mh = 150, sx = mw / (tr.maxX - tr.minX), sy = mh / (tr.maxY - tr.minY), s = Math.min(sx, sy), mx = 1060, my = 452;
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.roundRect(mx - 8, my - 8, mw + 16, mh + 16, 12); g.fill();
    g.save(); g.translate(mx - tr.minX * s, my - tr.minY * s); g.scale(s, s); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 60; g.stroke(tr.path); for (const c of C) { if (c.gone || c.x === undefined) continue; g.fillStyle = c.col; g.beginPath(); g.arc(c.x, c.y, c.i === mine ? 90 : 60, 0, 7); g.fill(); } g.restore();
    if (touch.on && !K.bot) { g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, 520, 200, 200); g.fillRect(1080, 520, 200, 200); g.font = '40px "Russo One"'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.5)'; g.fillText('◀', 100, 620); g.fillText('▶', 1180, 620); }
    if (phase === 'count') {
      const n = Math.ceil(goT);
      g.fillStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.roundRect(500, 180, 280, 100, 20); g.fill();
      for (let k = 0; k < 3; k++) { g.fillStyle = 3 - k >= n && n > 0 ? '#ff3b3b' : n <= 0 ? '#3dff7a' : '#333'; g.beginPath(); g.arc(560 + k * 80, 230, 30, 0, 7); g.fill(); }
      g.font = '28px "Russo One"'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(tr.n.toUpperCase(), 640, 320);
    }
    if (phase === 'race' && clock < .8) { g.font = '90px "Russo One"'; g.textAlign = 'center'; g.lineWidth = 10; g.strokeStyle = '#000'; g.strokeText('GO!', 640, 300); g.fillStyle = '#3dff7a'; g.fillText('GO!', 640, 300); }
    if (me && me.fin) { g.font = '64px "Russo One"'; g.textAlign = 'center'; g.lineWidth = 10; g.strokeStyle = '#000'; const txt = `${ord(o.indexOf(me) + 1)} PLACE!`; g.strokeText(txt, 640, 300); g.fillStyle = '#ffd23f'; g.fillText(txt, 640, 300); g.font = '20px "Russo One"'; g.fillStyle = '#fff'; if (!C.filter(c => !c.bot && !c.gone).every(c => c.fin)) g.fillText('Waiting for the others to finish...', 640, 350); }
  };
  // cover art: the pack drifting through a corner, the leader on a boost
  let posed = 0;
  GAME.pose = () => {
    tr = buildTrack(1); makeDecor(); phase = 'race'; clock = 42; posed = 1; skids = [];
    let k = 0, best = 0; for (let i = 0; i < N; i++) if (tr.curv[i] > best) { best = tr.curv[i]; k = i; }
    C.forEach((c, n) => { const i = (k - n * 7 + N) % N, lat = [20, -40, 50, -10, 60, -55][n] || 0; c.x = tr.cx[i] - tr.ty[i] * lat; c.y = tr.cy[i] + tr.tx[i] * lat; c.a = Math.atan2(tr.ty[i], tr.tx[i]) + (n % 2 ? .45 : .3); c.boost = n === 0 ? 1 : 0; c.idx = i;
      for (let b = 1; b < 40; b++) { const j = (i - b + N) % N; for (const sd of [-1, 1]) skids.push([tr.cx[j] - tr.ty[j] * (lat + sd * 10 + b * .8), tr.cy[j] + tr.tx[j] * (lat + sd * 10 + b * .8), 0]); } });
    cam.x = (C[0].x + C[2].x) / 2; cam.y = (C[0].y + C[2].y) / 2 + 70;
  };
  if (/[?&]test/.test(location.search)) window.TL = { get C() { return C; }, get mode() { return mode; }, get phase() { return phase; } };
})();
