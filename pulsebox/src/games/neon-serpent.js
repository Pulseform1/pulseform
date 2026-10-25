/* Neon Serpent: snake in neon. Smooth glowing serpent, golden stars, coins and power-ups (slow-mo, ghost, magnet).
   Modes: Classic (open arena, speeds up), Maze (levels with walls and portals) and Time Attack (90 s, crashes cost time).
   Missions, a daily challenge, trophies and unlockable arena themes. */
const GAME = {
  id: 'neon-serpent', title: 'Neon Serpent', tagline: 'Eat. Grow. Go faster. Don\'t bite your own tail!',
  font: 'Righteous', accent: '#39ff88', accent2: '#ff3df0', bg: '#05070f',
  how: ['Steer with arrow keys or WASD, swipe, or tap the side you want to turn to.', 'Eat glowing orbs to grow. Grab stars, coins and power-ups: Slow-mo, Ghost and Magnet.', 'Modes: Classic, Maze (walls and portals) and Time Attack.'],
  skins: [
    { name: 'Venom', price: 0, c: ['#39ff88', '#00b3ff'] }, { name: 'Lava', price: 60, c: ['#ffd23f', '#ff3d3d'] }, { name: 'Cotton', price: 150, c: ['#ff9cf0', '#7cc8ff'] },
    { name: 'Ghost', price: 250, c: ['#ffffff', '#6b7cff'] }, { name: 'Toxic', price: 400, c: ['#e9ff3d', '#7a2bff'] }, { name: 'Prism', price: 700, c: ['#ff0000', '#0000ff'], rainbow: true },
  ],
};
(() => {
  const TAU = Math.PI * 2, rnd = Math.random, C = 40, GW = 32, GH = 18;
  const F = s => `${s}px Righteous, "Arial Black", sans-serif`;
  const MODES = [['Classic', 'Grow & survive'], ['Maze', 'Walls & portals'], ['Time Attack', '90 s blitz']];
  const THEMES = [
    { n: 'Neon', bg: ['#03050d', '#0b1434'], grid: '90,140,255', wall: ['#1c2350', '#0b0f2a'], edge: '#8a7bff' },
    { n: 'Synthwave', bg: ['#0c0312', '#2c0a36'], grid: '255,80,180', wall: ['#3e1040', '#1a0620'], edge: '#ff4fa8', t: 'len30' },
    { n: 'Matrix', bg: ['#010702', '#04180a'], grid: '60,255,110', wall: ['#0c2e14', '#041208'], edge: '#39ff6a', t: 'mz5' },
    { n: 'Inferno', bg: ['#0e0302', '#2c0904'], grid: '255,120,40', wall: ['#401206', '#1a0602'], edge: '#ff6a2a', t: 'ta50' },
  ];
  const PW = { slow: ['#5ff3ff', 'SLOW-MO', 6], ghost: ['#dfe6ff', 'GHOST', 6], magnet: ['#ff5f7a', 'MAGNET', 8], clock: ['#ffd23f', '+5 SECONDS', 0] };
  const DIRS = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  let body, dir, queue, stepT, curST = .12, acc, food, gold, coinP, pwr, grow, dead, eaten, lastTail, mode, level, walls, portals, bgC, theme, eff, timeL, lumps, ripples, hAng, deathT, deathK, tongue, chomp, lvEaten, lvGoal, phase, phaseT, phaseMax, inv, pwT, lvName, swX, swY, swOn, motes = [];

  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const GLC = {};
  function glow(col) {
    if (GLC[col]) return GLC[col];
    const [c, g] = mk(64, 64), gd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gd.addColorStop(0, 'rgba(255,255,255,1)'); gd.addColorStop(.25, 'rgba(255,255,255,.55)'); gd.addColorStop(.6, 'rgba(255,255,255,.14)'); gd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gd; g.fillRect(0, 0, 64, 64); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, 64, 64);
    return (GLC[col] = c);
  }
  const glo = (g, col, x, y, r, a = 1) => { g.globalAlpha = a; g.drawImage(glow(col), x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; };
  const add = g => { g.globalCompositeOperation = 'lighter'; }, norm = g => { g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; };
  function star(g, x, y, r1, r2, n = 5, a0 = -Math.PI / 2) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = a0 + i * Math.PI / n; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
  const hex2 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const pa = hex2(a), pb = hex2(b); return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`; };
  const segColor = (s, i, n) => s.rainbow ? `hsl(${(i * 14 + K.t * 120) % 360},100%,60%)` : mix(s.c[0], s.c[1], n > 1 ? Math.min(1, i / (n - 1)) : 0);
  const cc = p => [p.x * C + C / 2, p.y * C + C / 2];
  const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  /* ================= sound ================= */
  let NB = null;
  const ok = () => K.ac && !K.bot && !K.save.mute;
  function nz(d, v, f, type = 'lowpass', delay = 0, q = 1) {
    if (!ok()) return; const ac = K.ac;
    if (!NB) { NB = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const ch = NB.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = rnd() * 2 - 1; }
    const t = ac.currentTime + delay, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), a = ac.createGain();
    s.buffer = NB; fl.type = type; fl.frequency.value = f; fl.Q.value = q; a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(.001, t + d);
    s.connect(fl).connect(a).connect(K.master); s.start(t, rnd() * .5); s.stop(t + d + .05);
  }
  const SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];
  const sEat = n => { const f = 330 * Math.pow(2, SCALE[n % SCALE.length] / 12); K.sfx(f, .09, 'square', .06); K.sfx(f * 1.5, .12, 'triangle', .05, 0, .03); nz(.04, .06, 4000, 'highpass'); };

  /* ================= music: dark synth arpeggio, tempo follows speed ================= */
  let mu = null;
  const mf = n => 440 * Math.pow(2, (n - 69) / 12);
  function nt(f, t, d, type, v, cut = 0) {
    const ac = K.ac, o = ac.createOscillator(), a = ac.createGain(); o.type = type; o.frequency.value = f;
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + .006); a.gain.exponentialRampToValueAtTime(.0008, t + d);
    if (cut) { const fl = ac.createBiquadFilter(); fl.frequency.value = cut; fl.Q.value = 4; o.connect(fl).connect(a); } else o.connect(a);
    a.connect(mu.g); o.start(t); o.stop(t + d + .03);
  }
  function drum(k, t, v = 1) {
    const ac = K.ac;
    if (k === 0) { const o = ac.createOscillator(), a = ac.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + .12); a.gain.setValueAtTime(.5 * v, t); a.gain.exponentialRampToValueAtTime(.001, t + .2); o.connect(a).connect(mu.g); o.start(t); o.stop(t + .22); return; }
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), a = ac.createGain(); s.buffer = NB; fl.type = k === 1 ? 'bandpass' : 'highpass'; fl.frequency.value = k === 1 ? 1500 : 8000;
    a.gain.setValueAtTime((k === 1 ? .25 : .07) * v, t); a.gain.exponentialRampToValueAtTime(.001, t + (k === 1 ? .14 : .04)); s.connect(fl).connect(a).connect(mu.g); s.start(t, rnd() * .5); s.stop(t + .2);
  }
  const CH = [[64, 67, 71], [60, 64, 67], [62, 66, 69], [59, 63, 66]];
  function song(s, t) {
    const st = s & 15, bar = (s >> 4) % 4, ch = CH[bar], hot = Math.min(1, eaten / 30);
    if (st % 4 === 0) drum(0, t); if (st === 4 || st === 12) drum(1, t, .8); if (st % 2 === 1 || hot > .5) drum(2, t, st % 2 ? 1 : .5);
    if (st % 2 === 0) nt(mf(ch[0] - 24 + (st === 6 || st === 14 ? 12 : 0)), t, .18, 'sawtooth', .07, 500 + hot * 600);
    nt(mf(ch[[0, 1, 2, 1, 2, 1][st % 6]] + (st & 8 ? 12 : 0)), t, .14, 'square', .02, 1600 + hot * 1800);
    if (eff.slow > 0 && st % 4 === 0) nt(mf(ch[2] + 24), t, .5, 'sine', .03);
  }
  function music() {
    if (!ok() || K.state !== 'play') return; const ac = K.ac;
    if (!mu) { mu = { t: 0, s: 0, g: ac.createGain() }; mu.g.gain.value = .5; mu.g.connect(K.master); nz(.01, .0001, 100); }
    if (mu.t < ac.currentTime + .02) mu.t = ac.currentTime + .06;
    const bpm = K.clamp(96 + (.125 - curST) / .07 * 50, 90, 150) * (eff.slow > 0 ? .75 : 1), sp = 60 / bpm / 4;
    while (mu.t < ac.currentTime + .16) { song(mu.s++, mu.t); mu.t += sp; }
  }

  /* ================= meta: missions, daily challenge, trophies, unlocks, banners ================= */
  const P = 'ns', el = id => document.getElementById(P + '-' + id);
  const MIS = [
    ['eat', 'Eat {n} orbs in one run', 'run', [15, 30, 50, 80, 120]], ['len', 'Grow to length {n}', 'run', [15, 25, 40, 60]],
    ['star', 'Grab {n} golden stars', 'tot', [3, 10, 25, 50]], ['mz', 'Reach maze level {n}', 'run', [2, 3, 5, 7, 9]],
    ['s2', 'Score {n} in Time Attack', 'run', [20, 35, 50, 70]], ['pw', 'Use {n} power-ups', 'tot', [3, 8, 20, 40]],
    ['coin', 'Collect {n} coins', 'tot', [10, 30, 80, 160]], ['prt', 'Travel through {n} portals', 'tot', [5, 20, 50]],
    ['s0', 'Score {n} in Classic', 'run', [15, 30, 50, 80, 110]], ['ghost', 'Slither through your tail {n} times as a ghost', 'tot', [3, 10, 25]],
  ];
  const DAILY = [['s0', 'Score {n} in Classic', 40], ['mz', 'Reach maze level {n}', 4], ['s2', 'Score {n} in Time Attack', 40], ['len', 'Grow to length {n}', 30], ['star', 'Grab {n} golden stars in one run', 4], ['pw', 'Use {n} power-ups in one run', 3]];
  const R = k => RS[k] || 0, T = k => (X && X.tot[k]) || 0;
  const TRO = [
    ['first', 'First Bite', 'Eat your first orb', () => T('eat') >= 1], ['len30', 'Long Boi', 'Grow to length 30', () => R('len') >= 30, 'Synthwave arena'],
    ['mz5', 'Labyrinth', 'Reach maze level 5', () => R('mz') >= 5, 'Matrix arena'], ['ta50', 'Speed Demon', 'Score 50 in Time Attack', () => R('s2') >= 50, 'Inferno arena'],
    ['star10', 'Stargazer', 'Grab 10 golden stars', () => T('star') >= 10], ['prt', 'Wormhole', 'Travel through 20 portals', () => T('prt') >= 20],
    ['ghost', 'Phantom', 'Slither through your tail 10 times', () => T('ghost') >= 10], ['len60', 'Megaserpent', 'Grow to length 60', () => R('len') >= 60],
    ['eat1k', 'Glutton', 'Eat 1,000 orbs', () => T('eat') >= 1000], ['c100', 'Centurion', 'Score 100 in Classic', () => R('s0') >= 100],
    ['mz8', 'Maze Master', 'Reach maze level 8', () => R('mz') >= 8], ['rich', 'Hoarder', 'Collect 100 coins', () => T('coin') >= 100],
  ];
  let X = null, RS = {}, runLog = [], banners = [];
  const today = (o = 0) => { const d = new Date(Date.now() - o * 864e5); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const hash = s => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  function meta() {
    if (X) return X;
    const s = K.save; X = s.meta || (s.meta = {});
    X.ms = X.ms || []; X.tr = X.tr || {}; X.tot = X.tot || {}; X.tier = X.tier || {}; X.dy = X.dy || {}; X.sel = X.sel || {}; X.tut = X.tut || 0; X.mode = X.mode || 0; X.mb = X.mb || [s.best || 0, 0, 0];
    while (X.ms.length < 3) X.ms.push(newMis());
    ui(); return X;
  }
  function newMis() {
    const used = X.ms.map(m => m.s), m = K.pick(MIS.filter(d => !used.includes(d[0]))), tier = X.tier[m[0]] || 0, L = m[3].length;
    return { s: m[0], g: Math.round(m[3][Math.min(tier, L - 1)] * (tier >= L ? 1 + (tier - L + 1) * .5 : 1)), r: Math.min(100, 20 + tier * 15), b: T(m[0]), p: 0 };
  }
  const misDef = m => MIS.find(d => d[0] === m.s) || MIS[0];
  const misText = m => misDef(m)[1].replace('{n}', m.g);
  const misVal = m => misDef(m)[2] === 'run' ? Math.max(m.p, R(m.s)) : T(m.s) - m.b;
  function daily() { const d = today(); if (X.dy.d !== d) X.dy = { d, ok: 0 }; const t = DAILY[hash(d + P) % DAILY.length]; return { s: t[0], text: t[1].replace('{n}', t[2]), g: t[2] }; }
  const dailyRew = () => 50 + 10 * Math.min(5, X.dl === today(1) ? (X.streak || 0) : 0);
  function reward(n, icon, text, c) { K.save.coins += n; K.persist(); banner(icon, text, '+' + n + ' coins', c); runLog.push(text + ' <b>+' + n + '</b>'); K.chime(784, [0, 4, 7, 12]); }
  function check() {
    if (K.bot || !X) return;
    for (let i = 0; i < 3; i++) {
      const m = X.ms[i]; if (misDef(m)[2] === 'run') m.p = Math.max(m.p, R(m.s));
      if (misVal(m) >= m.g) { X.tier[m.s] = (X.tier[m.s] || 0) + 1; reward(m.r, 'chk', 'Mission: ' + misText(m), '#7dffb0'); X.ms[i] = newMis(); }
    }
    const dl = daily(); if (!X.dy.ok && R(dl.s) >= dl.g) { X.dy.ok = 1; const n = dailyRew(); X.streak = X.dl === today(1) ? (X.streak || 0) + 1 : 1; X.dl = dl.d; reward(n, 'star', 'Daily challenge done!', '#ffd23f'); }
    for (const t of TRO) if (!X.tr[t[0]] && t[3]()) { X.tr[t[0]] = 1; reward(30, 'cup', 'Trophy: ' + t[1], '#ffcf3a'); if (t[4]) banner('lock', 'Unlocked: ' + t[4], 'Pick it in Missions', '#39ff88'); }
  }
  function st(k, n = 1) { if (K.bot || !X) return; RS[k] = R(k) + n; X.tot[k] = T(k) + n; check(); }
  function mx(k, v) { if (K.bot || !X || v <= R(k)) return; RS[k] = v; check(); }
  const banner = (icon, text, sub, c) => { if (!K.bot) banners.push({ icon, text, sub, c, t: 0 }); };
  function tickBanners(dt) { if (banners.length && (banners[0].t += dt) > 2.8) banners.shift(); }
  function icon(g, k, x, y, c) {
    g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 4; g.lineCap = g.lineJoin = 'round';
    if (k === 'chk') { g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x - 3, y + 7); g.lineTo(x + 10, y - 8); g.stroke(); }
    else if (k === 'star') { star(g, x, y, 12, 5); g.fill(); }
    else if (k === 'cup') { g.beginPath(); g.moveTo(x - 10, y - 10); g.lineTo(x + 10, y - 10); g.lineTo(x + 7, y + 2); g.quadraticCurveTo(x, y + 7, x - 7, y + 2); g.closePath(); g.fill(); g.fillRect(x - 2, y + 4, 4, 6); g.fillRect(x - 7, y + 9, 14, 3); }
    else { g.lineWidth = 3; g.beginPath(); g.arc(x, y - 5, 6, Math.PI, 0); g.stroke(); g.fillRect(x - 9, y - 4, 18, 14); }
  }
  function drawBanners(g) {
    const b = banners[0]; if (!b) return;
    const k = Math.min(1, b.t / .25, (2.8 - b.t) / .3), y = 58 + 34 * (1 - Math.pow(1 - Math.max(0, k), 3)), w = 480;
    g.save(); g.globalAlpha = Math.max(0, k); g.fillStyle = 'rgba(6,10,26,.93)'; rr(g, W / 2 - w / 2, y, w, 62, 20); g.fill();
    g.strokeStyle = b.c; g.lineWidth = 2.5; g.stroke(); icon(g, b.icon, W / 2 - w / 2 + 34, y + 31, b.c);
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = F(20); let tx = b.text; while (g.measureText(tx).width > w - 90 && tx.length > 8) tx = tx.slice(0, -2);
    g.fillText(tx === b.text ? tx : tx + '…', W / 2 - w / 2 + 66, y + 22); g.fillStyle = b.c; g.font = '800 16px Nunito, sans-serif'; g.fillText(b.sub, W / 2 - w / 2 + 66, y + 44); g.restore();
  }
  const CSS = `.§-daily{margin:-6px 0 10px;padding:8px 12px;border-radius:14px;background:rgba(255,255,255,.07);border:1px solid var(--edge);font-weight:800;font-size:13px;text-align:left;line-height:1.35}
.§-daily b{color:var(--accent)}.§-h{font-family:var(--display);font-size:19px;margin:14px 0 6px;text-align:left;color:var(--accent)}
.§-m{background:rgba(255,255,255,.06);border:1px solid var(--edge);border-radius:12px;padding:7px 10px;font-weight:800;font-size:13px;text-align:left;margin-bottom:6px}
.§-mt{display:flex;justify-content:space-between;gap:8px}.§-mt b{color:#ffe07a;white-space:nowrap}
.§-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.1);margin-top:5px;overflow:hidden}.§-bar i{display:block;height:100%;background:var(--accent);border-radius:3px}
.§-tr{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:6px}.§-t{padding:6px 8px;border-radius:10px;background:rgba(255,255,255,.04);font-size:11px;font-weight:700;color:var(--muted);text-align:left;line-height:1.25}
.§-t b{display:block;font-size:12px;color:#cfd8ea}.§-t.on{background:rgba(57,255,136,.1);border:1px solid rgba(57,255,136,.35)}.§-t.on b{color:#9dffc4}
.§-seg{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px}.§-seg button,.§-modes button{padding:6px 2px 5px;border-radius:12px;background:rgba(255,255,255,.07);border:2px solid transparent;font-weight:800;font-size:12px;display:flex;flex-direction:column;align-items:center;gap:2px}
.§-seg button.on,.§-modes button.on{border-color:var(--accent);background:rgba(255,255,255,.14)}.§-seg button[disabled]{opacity:.5;cursor:default}.§-seg small,.§-modes small{font-size:10px;color:var(--muted);line-height:1.15}.§-seg canvas{width:64px;height:36px;border-radius:6px}
.§-modes{display:flex;gap:6px;margin:0 0 10px}.§-modes button{flex:1;padding:7px 2px}.§-modes b{font-family:var(--display);font-size:16px;font-weight:400}
.§-ov{margin:6px 0 2px}.§-ov .§-m{padding:5px 10px;margin-bottom:4px}.§-done{color:#7dffb0;font-weight:800;font-size:13px;margin-bottom:6px;line-height:1.4}`;
  function ui() {
    if (el('css')) return;
    const css = document.createElement('style'); css.id = P + '-css'; css.textContent = CSS.replace(/§/g, P); document.head.appendChild(css);
    document.querySelector('#sTitle .stats').insertAdjacentHTML('afterend', `<div class="${P}-daily" id="${P}-daily"></div><div class="${P}-modes" id="${P}-modes"></div>`);
    document.getElementById('bSkins').insertAdjacentHTML('afterend', `<button id="${P}-bMis">Missions</button>`);
    document.getElementById('oHint').insertAdjacentHTML('beforebegin', `<div id="${P}-over" class="${P}-ov"></div>`);
    document.body.insertAdjacentHTML('beforeend', `<div class="scr" id="${P}-sMis" hidden><div class="card"><h2 class="title" style="font-size:40px">Missions</h2><div id="${P}-body"></div><button class="big" id="${P}-back" style="margin-top:14px">Back</button></div></div>`);
    el('bMis').onclick = () => { K.audio(); misScreen(); document.getElementById('sTitle').hidden = true; el('sMis').hidden = false; };
    el('back').onclick = () => { el('sMis').hidden = true; document.getElementById('sTitle').hidden = false; titleUI(); };
  }
  function titleUI() {
    const d = el('daily'); if (!d || !X) return; const dl = daily(); d.innerHTML = `★ Daily: ${dl.text} <b>${X.dy.ok ? '✓ done' : '+' + dailyRew()}</b>`;
    el('modes').innerHTML = MODES.map((m, i) => `<button data-i="${i}" class="${X.mode === i ? 'on' : ''}"><b>${m[0]}</b><small>${m[1]}</small><small>Best ${X.mb[i] || 0}</small></button>`).join('');
    el('modes').querySelectorAll('button').forEach(b => b.onclick = () => { K.audio(); X.mode = +b.dataset.i; K.persist(); titleUI(); K.sfx(520 + X.mode * 130, .08, 'triangle', .08); });
  }
  const misHTML = m => { const v = Math.max(0, Math.min(m.g, misVal(m))); return `<div class="${P}-m"><div class="${P}-mt"><span>${misText(m)}</span><b>+${m.r}</b></div><div class="${P}-bar"><i style="width:${v / m.g * 100}%"></i></div></div>`; };
  const unl = i => !THEMES[i].t || X.tr[THEMES[i].t];
  function misScreen() {
    const dl = daily(), ntr = TRO.filter(t => X.tr[t[0]]).length;
    el('body').innerHTML = `<div class="${P}-h">Daily challenge</div><div class="${P}-m"><div class="${P}-mt"><span>${dl.text}</span><b>${X.dy.ok ? '✓ Done' : '+' + dailyRew()}</b></div></div>
<div class="${P}-h">Missions</div>${X.ms.map(misHTML).join('')}
<div class="${P}-h">Arena</div><div class="${P}-seg">${THEMES.map((b, i) => `<button data-i="${i}" class="${(X.sel.u || 0) === i ? 'on' : ''}" ${unl(i) ? '' : 'disabled'}><canvas width="128" height="72"></canvas>${b.n}${unl(i) ? '' : `<small>🔒 ${TRO.find(t => t[0] === b.t)[1]}</small>`}</button>`).join('')}</div>
<div class="${P}-h">Trophies ${ntr}/${TRO.length}</div><div class="${P}-tr">${TRO.map(t => `<div class="${P}-t ${X.tr[t[0]] ? 'on' : ''}"><b>${X.tr[t[0]] ? '★' : '☆'} ${t[1]}</b>${t[2]}${t[4] ? ' · unlocks ' + t[4] : ''}</div>`).join('')}</div>`;
    el('body').querySelectorAll(`.${P}-seg button`).forEach(b => {
      const i = +b.dataset.i, g = b.querySelector('canvas').getContext('2d'), th = THEMES[i], gd = g.createLinearGradient(0, 0, 0, 72); gd.addColorStop(0, th.bg[1]); gd.addColorStop(1, th.bg[0]); g.fillStyle = gd; g.fillRect(0, 0, 128, 72);
      g.strokeStyle = `rgba(${th.grid},.3)`; for (let x = 0; x < 128; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 72); g.stroke(); } for (let y = 0; y < 72; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
      g.fillStyle = th.wall[0]; g.fillRect(24, 24, 24, 12); g.fillRect(84, 36, 12, 24); g.strokeStyle = th.edge; g.lineWidth = 2; g.strokeRect(24, 24, 24, 12); g.strokeRect(84, 36, 12, 24); g.strokeRect(1, 1, 126, 70);
      b.onclick = () => { if (b.disabled) return; X.sel.u = i; K.persist(); K.sfx(660, .08, 'triangle'); misScreen(); };
    });
  }
  function overPanel() { const o = el('over'); if (o) o.innerHTML = (runLog.length ? `<div class="${P}-done">${runLog.map(t => '✓ ' + t).join('<br>')}</div>` : '') + X.ms.map(misHTML).join(''); }

  /* ================= levels ================= */
  const LAY = [
    ['Pillars', S => { for (const [x, y] of [[7, 3], [23, 3], [7, 13], [23, 13], [15, 8]]) S.rect(x, y, 2, 2); }],
    ['The Box', S => { S.rect(10, 3, 12, 1); S.rect(10, 14, 12, 1); S.rect(10, 3, 1, 5); S.rect(10, 10, 1, 5); S.rect(21, 3, 1, 5); S.rect(21, 10, 1, 5); }],
    ['Gateway', S => { S.rect(16, 0, 1, 18); S.portal(13, 4, 19, 13); S.portal(13, 13, 19, 4); }],
    ['Lanes', S => { S.rect(3, 4, 12, 1); S.rect(17, 4, 12, 1); S.rect(3, 13, 12, 1); S.rect(17, 13, 12, 1); S.rect(15, 7, 2, 4); S.portal(1, 1, 30, 16); }],
    ['Rooms', S => { S.rect(16, 0, 1, 7); S.rect(16, 11, 1, 7); S.rect(0, 6, 7, 1); S.rect(25, 11, 7, 1); S.rect(20, 6, 12, 1); S.rect(0, 11, 12, 1); S.portal(3, 2, 28, 15); S.portal(28, 2, 3, 15); }],
    ['Zigzag', S => { for (let i = 0; i < 5; i++) { S.rect(9 + i * 3, 2 + i * 2, 3, 1); S.rect(20 - i * 3, 15 - i * 2, 3, 1); } S.portal(2, 2, 29, 15); }],
    ['Spiral', S => { S.rect(6, 2, 20, 1); S.rect(25, 2, 1, 14); S.rect(10, 15, 16, 1); S.rect(10, 6, 1, 10); S.rect(10, 6, 11, 1); S.rect(20, 6, 1, 6); S.portal(23, 4, 13, 9); }],
    ['Fortress', S => { for (const [x, y, sx, sy] of [[4, 2, 1, 1], [27, 2, -1, 1], [4, 15, 1, -1], [27, 15, -1, -1]]) { S.rect(sx > 0 ? x : x - 4, y, 5, 1); S.rect(x, sy > 0 ? y : y - 4, 1, 5); } S.rect(14, 7, 4, 1); S.rect(14, 10, 4, 1); S.portal(15, 8, 16, 2); S.portal(16, 9, 15, 15); }],
  ];
  function buildLayout(li) {
    walls = new Set(); portals = [];
    const S = { rect(x, y, w, h) { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) if (x + i >= 0 && y + j >= 0 && x + i < GW && y + j < GH) walls.add(x + i + (y + j) * GW); }, portal(ax, ay, bx, by) { portals.push({ a: { x: ax, y: ay }, b: { x: bx, y: by }, c: ['#ff3df0', '#3dd8ff', '#ffd23f', '#7dff6a'][portals.length % 4] }); } };
    if (li >= 0) { LAY[li][1](S); lvName = LAY[li][0]; }
    for (let x = 1; x <= 12; x++) for (let y = 8; y <= 10; y++) walls.delete(x + y * GW);
    for (const p of portals) { walls.delete(p.a.x + p.a.y * GW); walls.delete(p.b.x + p.b.y * GW); }
    bgC = null;
  }
  const isWall = (x, y) => x < 0 || y < 0 || x >= GW || y >= GH || walls.has(x + y * GW);
  function portalAt(x, y) { for (const p of portals) { if (p.a.x === x && p.a.y === y) return p.b; if (p.b.x === x && p.b.y === y) return p.a; } return null; }
  const isPortal = (x, y) => portals.some(p => (p.a.x === x && p.a.y === y) || (p.b.x === x && p.b.y === y));
  const taken = (x, y) => isWall(x, y) || isPortal(x, y) || body.some(b => b.x === x && b.y === y) || [food, gold, coinP, pwr].some(o => o && o.x === x && o.y === y);
  function free() { for (let k = 0; k < 500; k++) { const x = K.irand(0, GW - 1), y = K.irand(0, GH - 1); if (!taken(x, y) && Math.abs(x - body[0].x) + Math.abs(y - body[0].y) > 2) return { x, y }; } return { x: 0, y: 0 }; }
  function makeBg() {
    const th = THEMES[theme], [c, g] = mk(W, H);
    const gd = g.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 820); gd.addColorStop(0, th.bg[1]); gd.addColorStop(1, th.bg[0]); g.fillStyle = gd; g.fillRect(0, 0, W, H);
    for (let x = 0; x < GW; x++) for (let y = 0; y < GH; y++) if ((x + y) % 2) { g.fillStyle = `rgba(${th.grid},.025)`; g.fillRect(x * C, y * C, C, C); }
    g.strokeStyle = `rgba(${th.grid},.09)`; g.lineWidth = 1; for (let x = 0; x <= W; x += C) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, H); g.stroke(); } for (let y = 0; y <= H; y += C) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(W, y + .5); g.stroke(); }
    g.fillStyle = `rgba(${th.grid},.22)`; for (let x = 0; x <= GW; x++) for (let y = 0; y <= GH; y++) g.fillRect(x * C - 1, y * C - 1, 2, 2);
    for (const k of walls) { const x = (k % GW) * C, y = Math.floor(k / GW) * C, wg = g.createLinearGradient(x, y, x + C, y + C); wg.addColorStop(0, th.wall[0]); wg.addColorStop(1, th.wall[1]); g.fillStyle = wg; g.fillRect(x, y, C, C); g.strokeStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.moveTo(x, y + C); g.lineTo(x + C, y); g.stroke(); }
    g.save(); g.shadowColor = th.edge; g.shadowBlur = 14; g.strokeStyle = th.edge; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();
    for (const k of walls) { const cx = k % GW, cy = Math.floor(k / GW), x = cx * C, y = cy * C, inW = (a, b) => walls.has(a + b * GW) && a >= 0 && a < GW;
      if (!inW(cx, cy - 1) || cy === 0) { g.moveTo(x, y + 1.5); g.lineTo(x + C, y + 1.5); } if (!inW(cx, cy + 1) || cy === GH - 1) { g.moveTo(x, y + C - 1.5); g.lineTo(x + C, y + C - 1.5); }
      if (!inW(cx - 1, cy)) { g.moveTo(x + 1.5, y); g.lineTo(x + 1.5, y + C); } if (!inW(cx + 1, cy)) { g.moveTo(x + C - 1.5, y); g.lineTo(x + C - 1.5, y + C); } }
    g.stroke(); g.lineWidth = 3; g.strokeRect(1.5, 1.5, W - 3, H - 3); g.restore();
    const vg = g.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 820); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    bgC = c;
  }

  /* ================= state ================= */
  function placeSnake(n) { body = []; for (let i = 0; i < n; i++) body.push({ x: Math.max(0, 5 - i), y: 9 }); for (let i = body.length; i < n; i++) body.push({ x: 0, y: 9 }); lastTail = { ...body[body.length - 1] }; dir = [1, 0]; queue = []; acc = 0; hAng = 0; lumps = []; grow = Math.max(0, n - 6); body.length = Math.min(n, 6); lastTail = { ...body[body.length - 1] }; }
  function startLevel() {
    if (mode === 1) { buildLayout((level - 1) % LAY.length); lvGoal = 8 + level * 2; lvEaten = 0; stepT = Math.max(.065, .118 - (level - 1) * .006); }
    else { buildLayout(mode === 2 ? 0 : -1); lvName = mode === 2 ? 'Time Attack' : 'Classic'; }
    placeSnake(mode === 1 ? 4 + Math.min(6, level - 1) : 4); food = null; gold = null; coinP = null; pwr = null; food = free(); pwT = K.rand(8, 13);
    phase = 'intro'; phaseT = phaseMax = mode === 1 ? 1.6 : 1.2;
  }
  GAME.reset = () => {
    meta(); RS = {}; runLog = []; banners = [];
    mode = K.bot ? (rnd() < .6 ? 1 : 0) : X.mode; theme = K.bot ? K.irand(0, 3) : unl(X.sel.u || 0) ? X.sel.u || 0 : 0;
    level = K.bot && mode === 1 ? K.irand(1, 5) : 1; eaten = 0; dead = false; deathT = 0; deathK = 0; eff = { slow: 0, ghost: 0, magnet: 0 }; timeL = mode === 2 ? 90 : 0; ripples = []; tongue = 0; chomp = 0; inv = 0; swOn = 0;
    stepT = .125; startLevel(); bgC = null;
    motes = Array.from({ length: 40 }, () => ({ x: rnd() * W, y: rnd() * H, v: 6 + rnd() * 14, p: rnd() * TAU }));
    titleUI();
  };
  GAME.pose = () => {
    mode = 1; theme = 0; level = 3; buildLayout(2);
    const path = []; for (let x = 4; x <= 11; x++) path.push([x, 15]); for (let y = 14; y >= 7; y--) path.push([11, y]); for (let x = 12; x <= 14; x++) path.push([x, 7]); for (let y = 8; y <= 11; y++) path.push([14, y]);
    body = path.reverse().map(([x, y]) => ({ x, y })); body.unshift({ x: 19, y: 13, via: { x: 13, y: 13 } }); body.splice(1, 0); body[1] = { x: 14, y: 12 }; body.splice(2, 0, { x: 14, y: 11 });
    body = [{ x: 20, y: 13 }, { x: 19, y: 13, via: { x: 13, y: 13 } }, { x: 12, y: 13 }, { x: 11, y: 13 }].concat(path.reverse().slice(0, 0));
    const p2 = []; for (let y = 13; y >= 6; y--) p2.push({ x: 11, y }); for (let x = 10; x >= 4; x--) p2.push({ x, y: 6 }); for (let y = 7; y <= 11; y++) p2.push({ x: 4, y });
    body = [{ x: 21, y: 13 }, { x: 20, y: 13 }, { x: 19, y: 13, via: { x: 13, y: 13 } }, { x: 12, y: 13 }].concat(p2.slice(1));
    lastTail = { x: 4, y: 12 }; dir = [1, 0]; hAng = 0; acc = curST * .5; phase = 'play'; food = { x: 25, y: 13 }; gold = { x: 24, y: 6, t: 5 }; coinP = { x: 7, y: 15, t: 5 }; pwr = { x: 27, y: 9, k: 'magnet', t: 6 }; lumps = [3, 11]; bgC = null;
  };
  function turn(d) {
    const last = queue.length ? queue[queue.length - 1] : dir;
    if ((d[0] === -last[0] && d[1] === -last[1]) || (d[0] === last[0] && d[1] === last[1])) return;
    if (queue.length < 3) queue.push(d);
    if (!K.bot && X) X.tut |= 1;
  }
  GAME.key = (c, down) => { if (down && DIRS[c]) turn(DIRS[c]); };
  GAME.down = (x, y) => { swX = x; swY = y; swOn = 1; };
  GAME.move = (x, y, e) => { if (swOn && (e.buttons || e.pointerType === 'touch')) { const dx = x - swX, dy = y - swY; if (Math.hypot(dx, dy) > 30) { turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]); swX = x; swY = y; swOn = 2; } } };
  GAME.up = (x, y) => {
    if (swOn === 1 && body) { const [hx, hy] = cc(body[0]), dx = x - hx, dy = y - hy; turn(dir[0] !== 0 ? [0, Math.sign(dy) || 1] : [Math.sign(dx) || 1, 0]); }
    swOn = 0;
  };
  function blocked(x, y, growing) {
    if (isWall(x, y)) return 'wall';
    if (eff.ghost > 0 || inv > 0) return null;
    const n = growing ? body.length : body.length - 1;
    for (let i = 0; i < n; i++) if (body[i].x === x && body[i].y === y) return 'self';
    return null;
  }
  function ripple(x, y, c, s = 1) { ripples.push({ x, y, c, t: 0, s }); }
  function step() {
    if (queue.length) dir = queue.shift();
    const h = body[0]; let nx = h.x + dir[0], ny = h.y + dir[1], via = null;
    const pt = portalAt(nx, ny);
    if (pt) { via = { x: nx, y: ny }; nx = pt.x; ny = pt.y; st('prt'); K.sfx(300, .25, 'sine', .07, 900); nz(.2, .06, 2500, 'bandpass', 0, 3); const [ax, ay] = cc(via), [bx, by] = cc({ x: nx, y: ny }); ripple(ax, ay, '#ff3df0', .5); ripple(bx, by, '#3dd8ff', .5); }
    const hit = blocked(nx, ny, grow > 0);
    if (hit) return crash();
    if ((eff.ghost > 0 || inv > 0) && body.some(b => b.x === nx && b.y === ny)) { st('ghost'); K.sfx(900, .08, 'sine', .04, -300); }
    body.unshift({ x: nx, y: ny, via });
    if (grow > 0) grow--; else body.pop();
    lastTail = { ...body[body.length - 1] }; if (!body._grew) {}
    lumps = lumps.map(l => l + 1).filter(l => l < body.length);
    mx('len', body.length + grow);
    if (eff.magnet > 0) for (const o of [food, gold, coinP]) if (o && Math.abs(o.x - nx) + Math.abs(o.y - ny) <= 7) { const sx = Math.sign(nx - o.x), sy = Math.sign(ny - o.y), opts = Math.abs(nx - o.x) > Math.abs(ny - o.y) ? [[sx, 0], [0, sy]] : [[0, sy], [sx, 0]]; for (const [ddx, ddy] of opts) { if ((ddx || ddy) && !isWall(o.x + ddx, o.y + ddy) && !isPortal(o.x + ddx, o.y + ddy) && !(body.slice(1).some(b => b.x === o.x + ddx && b.y === o.y + ddy))) { o.x += ddx; o.y += ddy; break; } } }
    const [px, py] = cc(body[0]);
    if (food && nx === food.x && ny === food.y) eat(px, py);
    if (gold && nx === gold.x && ny === gold.y) { grow += 2; K.add(3, px, py - 30, '#ffe36e'); K.coin(2, px, py); K.chime(784); gold = null; st('star'); ripple(px, py, '#ffd23f', 1.4); lumps.push(0); chomp = 1; }
    if (coinP && nx === coinP.x && ny === coinP.y) { K.coin(1, px, py); st('coin'); coinP = null; chomp = 1; }
    if (pwr && nx === pwr.x && ny === pwr.y) {
      const k = pwr.k; pwr = null; st('pw'); K.pop(px, py - 40, PW[k][1], PW[k][0], 30); K.chime(523, [0, 7, 12, 19]); ripple(px, py, PW[k][0], 1.6); chomp = 1;
      if (k === 'clock') timeL += 5; else eff[k] = PW[k][2];
      if (!K.bot && X) X.tut |= 4;
    }
  }
  function eat(px, py) {
    eaten++; grow += 1; lumps.push(0); chomp = 1; K.add(1); sEat(eaten); ripple(px, py, K.skin.c[1]); st('eat');
    K.burst(px, py, K.skin.c, 10, 220, { gravity: 0, life: .45, size: 6 });
    if (!K.bot && X) X.tut |= 2;
    food = free();
    if (mode === 0) stepT = Math.max(.056, .125 - eaten * .0016);
    if (mode === 2) stepT = Math.max(.062, .105 - eaten * .0008);
    if (mode === 1 && ++lvEaten >= lvGoal) { phase = 'clear'; phaseT = phaseMax = 1.8; K.add(5 + level); K.coin(2); K.chime(523, [0, 4, 7, 12, 16]); K.flash('#fff', .15); for (const b of body) { const [x, y] = cc(b); K.burst(x, y, [K.skin.c[0], '#fff'], 2, 160, { gravity: 0, life: .5 }); } return; }
    if (eaten % 7 === 0 && !gold) { gold = { ...free(), t: 7 }; }
    if (eaten % 5 === 0 && !coinP) { coinP = { ...free(), t: 9 }; }
    if (eaten % 20 === 0) { K.pop(px, py - 50, `LENGTH ${body.length + grow}!`, '#fff', 32); K.coin(2); }
  }
  function crash() {
    if (mode === 2) {
      timeL = Math.max(0, timeL - 5); K.shake(14); K.flash('#ff2a4a', .3); K.pop(W / 2, H / 2, '-5 SECONDS', '#ff6a7a', 44); K.sfx(200, .4, 'sawtooth', .1, -120); nz(.3, .2, 500);
      for (const b of body) { const [x, y] = cc(b); K.burst(x, y, [segColor(K.skin, 0, 1), '#fff'], 1, 200, { gravity: 0, life: .5, square: true }); }
      placeSnake(4); inv = 2; acc = 0; return;
    }
    die();
  }
  function die() {
    dead = true; deathT = 0; deathK = 0; K.shake(18); nz(.5, .3, 500); K.sfx(220, .6, 'sawtooth', .12, -180); K.flash('#fff', .2);
    endRun(mode === 1 ? 'Crashed on level ' + level : 'Crashed!', 1300);
  }
  function endRun(title, delay = 900) {
    dead = true;
    if (!K.bot) { if (mode === 1) mx('mz', level); mx('s' + mode, K.score); if (K.score > (X.mb[mode] || 0)) X.mb[mode] = K.score; K.persist(); overPanel(); }
    K.over({ title, text: `${MODES[mode][0]} · length ${body.length + grow} · ${eaten} orbs eaten`, delay });
  }
  /* ---------- bot ---------- */
  GAME.bot = () => {
    if (dead || queue.length || phase !== 'play') return;
    const h = body[0], target = gold ? gold : pwr && pwr.k !== 'clock' ? pwr : food, ghost = eff.ghost > 0 || inv > 0;
    const blk = new Set(ghost ? [] : body.slice(0, -1).map(b => b.x + ',' + b.y));
    const nb = (x, y, dx, dy) => { let nx = x + dx, ny = y + dy; const p = portalAt(nx, ny); if (p) { nx = p.x; ny = p.y; } return [nx, ny]; };
    const ok2 = (x, y) => !isWall(x, y) && !blk.has(x + ',' + y);
    const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const room = (x, y) => { const seen = new Set([x + ',' + y]), stk = [[x, y]]; while (stk.length && seen.size < 220) { const [a, b] = stk.pop(); for (const [dx, dy] of D4) { const [nx, ny] = nb(a, b, dx, dy), k = nx + ',' + ny; if (!seen.has(k) && ok2(nx, ny)) { seen.add(k); stk.push([nx, ny]); } } } return seen.size; };
    const prev = new Map([[h.x + ',' + h.y, null]]), qq = [[h.x, h.y]]; let found = null;
    while (qq.length && !found) { const [a, b] = qq.shift(); for (const [dx, dy] of D4) { const [x, y] = nb(a, b, dx, dy), k = x + ',' + y; if (prev.has(k) || !ok2(x, y)) continue; prev.set(k, [a + ',' + b, dx, dy]); if (x === target.x && y === target.y) { found = k; break; } qq.push([x, y]); } }
    let first = null;
    if (found) { let k = found; while (prev.get(k)[0] !== h.x + ',' + h.y) k = prev.get(k)[0]; first = [prev.get(k)[1], prev.get(k)[2]]; }
    const opts = D4.filter(([dx, dy]) => !(dx === -dir[0] && dy === -dir[1])).map(([dx, dy]) => { const [x, y] = nb(h.x, h.y, dx, dy); return { d: [dx, dy], ok: ok2(x, y), r: ok2(x, y) ? room(x, y) : 0 }; }).filter(o => o.ok);
    if (!opts.length) return;
    const bestRoom = Math.max(...opts.map(o => o.r));
    let pick = first && opts.find(o => o.d[0] === first[0] && o.d[1] === first[1] && o.r >= Math.min(bestRoom, body.length + 4));
    if (!pick) pick = opts.sort((a, b) => b.r - a.r)[0];
    if (pick.d[0] !== dir[0] || pick.d[1] !== dir[1]) queue.push(pick.d);
  };
  GAME.update = dt => {
    tickBanners(dt);
    for (const r of ripples) r.t += dt; ripples = ripples.filter(r => r.t < 1.1);
    for (const m of motes) { m.y -= m.v * dt; m.x += Math.sin(K.t + m.p) * 8 * dt; if (m.y < -10) { m.y = H + 10; m.x = rnd() * W; } }
    if (!body) return;
    tongue = (tongue + dt) % 2.2; chomp = Math.max(0, chomp - dt * 5);
    if (dead) { deathT += dt; const n = Math.floor(deathT * 50); while (deathK < Math.min(n, body.length)) { const [x, y] = cc(body[deathK]); K.burst(x, y, [segColor(K.skin, deathK, body.length), '#fff'], deathK === 0 ? 20 : 4, deathK === 0 ? 360 : 200, { gravity: 0, life: .6, size: deathK === 0 ? 8 : 6 }); if (deathK % 4 === 0) K.sfx(600 - deathK * 6, .05, 'square', .03); deathK++; } return; }
    music();
    for (const k in eff) eff[k] = Math.max(0, eff[k] - dt); inv = Math.max(0, inv - dt);
    if (phase !== 'play') { if ((phaseT -= dt) <= 0) { if (phase === 'clear') { level++; mx('mz', level); startLevel(); } else phase = 'play'; } return; }
    if (mode === 2) { const was = Math.ceil(timeL); timeL -= dt; if (timeL < 10 && Math.ceil(timeL) !== was) K.sfx(880, .05, 'square', .05); if (timeL <= 0) { timeL = 0; K.chime(392, [12, 7, 4, 0]); return endRun("Time's up!"); } }
    curST = stepT * (eff.slow > 0 ? 1.6 : 1);
    acc += dt; while (acc >= curST && !dead && phase === 'play') { acc -= curST; step(); }
    if (gold && (gold.t -= dt) <= 0) gold = null;
    if (coinP && (coinP.t -= dt) <= 0) coinP = null;
    if (pwr && (pwr.t -= dt) <= 0) pwr = null;
    if (!pwr && (pwT -= dt) <= 0) { pwT = K.rand(11, 17); pwr = { ...free(), k: mode === 2 && rnd() < .45 ? 'clock' : K.pick(['slow', 'ghost', 'magnet']), t: 9 }; }
    if (body.length > 1) { const [ax, ay] = cc(body[1]), [bx, by] = cc(body[0]); let a = body[0].via ? Math.atan2(dir[1], dir[0]) : Math.atan2(by - ay, bx - ax), d = a - hAng; d = Math.atan2(Math.sin(d), Math.cos(d)); hAng += d * Math.min(1, dt * 18); }
  };

  /* ================= drawing ================= */
  function runs() {
    const f = dead || phase !== 'play' ? 1 : K.clamp(acc / curST, 0, 1), n = body.length, out = [[]]; let cur = out[0];
    const push = (p, i) => cur.push([p[0], p[1], i]), brk = () => { cur = []; out.push(cur); };
    const b0 = body[0], b1 = body[1] || b0;
    if (b0.via) { const d = [b0.x - (b0.via.x - (b0.via.x - b1.x)), 0]; const dd = [Math.sign(b0.via.x - b1.x), Math.sign(b0.via.y - b1.y)];
      if (f >= .5) { const e = cc(b0); push([e[0] - dd[0] * C * (1 - f), e[1] - dd[1] * C * (1 - f)], 0); push(e, 0); out[0].reverse(); brk(); push(cc(b0.via), .5); }
      else push(lerp2(cc(b1), cc(b0.via), f * 2), 0); void d; }
    else push(lerp2(cc(b1), cc(b0), f), 0);
    for (let i = 1; i < n; i++) {
      const b = body[i]; push(cc(b), i);
      if (i < n - 1 && b.via) { brk(); push(cc(b.via), i + .5); }
    }
    const tl = body[n - 1]; if (n > 1 && !tl.via && lastTail && (lastTail.x !== tl.x || lastTail.y !== tl.y) && Math.abs(lastTail.x - tl.x) + Math.abs(lastTail.y - tl.y) === 1) push(lerp2(cc(lastTail), cc(tl), f), n - 1);
    return out.filter(r => r.length);
  }
  function piecePath(g, r, k) {
    const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], L = r.length;
    if (L === 1) { g.moveTo(r[0][0], r[0][1]); g.lineTo(r[0][0] + .1, r[0][1]); return; }
    if (k === 0) { const e = L === 2 ? r[1] : m(r[0], r[1]); g.moveTo(r[0][0], r[0][1]); g.lineTo(e[0], e[1]); return; }
    if (k === L - 1) { const s = L === 2 ? r[0] : m(r[L - 2], r[L - 1]); g.moveTo(s[0], s[1]); g.lineTo(r[L - 1][0], r[L - 1][1]); return; }
    const a = m(r[k - 1], r[k]), b = m(r[k], r[k + 1]); g.moveTo(a[0], a[1]); g.quadraticCurveTo(r[k][0], r[k][1], b[0], b[1]);
  }
  function runPath(g, r, ox = 0, oy = 0) { g.beginPath(); for (let k = 0; k < r.length; k++) { const s = new Path2D(); g.moveTo; } const L = r.length; if (!L) return; g.moveTo(r[0][0] + ox, r[0][1] + oy); for (let k = 1; k < L - 1; k++) { const mx2 = (r[k][0] + r[k + 1][0]) / 2, my2 = (r[k][1] + r[k + 1][1]) / 2; g.quadraticCurveTo(r[k][0] + ox, r[k][1] + oy, mx2 + ox, my2 + oy); } g.lineTo(r[L - 1][0] + ox, r[L - 1][1] + oy); }
  function drawSnake(g, rs, s, n, sc, o = {}) {
    const wid = i => (28 - 12 * Math.pow(Math.min(1, i / Math.max(1, n - 1)), 1.4)) * sc;
    g.lineCap = g.lineJoin = 'round';
    const ga = o.ghost ? .35 + .15 * Math.sin(K.t * 20) : 1;
    add(g); for (const r of rs) { g.globalAlpha = .16 * ga; g.strokeStyle = s.rainbow ? `hsl(${(K.t * 120) % 360},100%,60%)` : s.c[0]; g.lineWidth = 50 * sc; runPath(g, r); g.stroke(); g.globalAlpha = .22 * ga; g.lineWidth = 36 * sc; g.stroke(); } norm(g);
    g.globalAlpha = ga;
    for (const r of rs) { g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = wid(r[0][2]) + 6 * sc; runPath(g, r); g.stroke(); }
    for (const r of rs) for (let k = r.length - 1; k >= 0; k--) { const i = r[k][2]; g.strokeStyle = segColor(s, i, n); g.lineWidth = wid(i); g.beginPath(); piecePath(g, r, k); g.stroke(); }
    for (const r of rs) for (let k = 1; k < r.length - 1; k++) {
      const i = r[k][2]; if (i < 1.5 || Number.isInteger(i * 2) && !Number.isInteger(i)) continue;
      const a = Math.atan2(r[k + 1][1] - r[k - 1][1], r[k + 1][0] - r[k - 1][0]), w = wid(i);
      g.save(); g.translate(r[k][0], r[k][1]); g.rotate(a); g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(-w * .05, 0, w * .18, w * .46, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-w * .1, -w * .16, w * .14, w * .09, 0, 0, TAU); g.fill(); g.restore();
    }
    add(g); for (const r of rs) { g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 6 * sc; runPath(g, r, -2 * sc, -5 * sc); g.stroke(); } norm(g); g.globalAlpha = ga;
    if (o.lumps) { const flat = rs.flat(); for (const l of o.lumps) { const t = l + (o.f || 0), k = Math.min(flat.length - 2, Math.floor(t)); if (k < 0) continue; const p = lerp2(flat[k], flat[k + 1], t - k), w = wid(t) * .62 * (1 - t / n * .3); g.fillStyle = segColor(s, t, n); g.beginPath(); g.arc(p[0], p[1], w, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(p[0] - w * .3, p[1] - w * .35, w * .35, 0, TAU); g.fill(); } }
    const hp = rs[0][0]; drawHead(g, hp[0], hp[1], o.ang || 0, s, sc, o);
    g.globalAlpha = 1;
  }
  function drawHead(g, x, y, a, s, sc, o) {
    const col = segColor(s, 0, 2), ch = o.chomp || 0;
    g.save(); g.translate(x, y); g.rotate(a); g.scale(sc * (1 + ch * .12), sc * (1 + ch * .12));
    add(g); glo(g, s.rainbow ? `hsl(${(K.t * 120) % 360},100%,60%)` : s.c[0], 4, 0, 46, .55); norm(g); g.globalAlpha = o.ghost ? .5 : 1;
    if (o.tongue) { g.strokeStyle = '#ff3d6b'; g.lineWidth = 2.5; g.lineCap = 'round'; const l = 16 * Math.sin(o.tongue * Math.PI); g.beginPath(); g.moveTo(18, 0); g.lineTo(18 + l, 0); g.lineTo(22 + l, -4); g.moveTo(18 + l, 0); g.lineTo(22 + l, 4); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(2, 0, 25, 20, 0, 0, TAU); g.fill();
    const hg = g.createRadialGradient(-2, -8, 2, 2, 0, 24); hg.addColorStop(0, '#ffffff'); hg.addColorStop(.25, col); hg.addColorStop(1, col);
    g.fillStyle = hg; g.beginPath(); g.moveTo(-14, -16); g.bezierCurveTo(6, -21, 22, -12, 23, 0); g.bezierCurveTo(22, 12, 6, 21, -14, 16); g.bezierCurveTo(-20, 8, -20, -8, -14, -16); g.fill();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(4, 0, 14, 4, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(0,0,0,.6)'; for (const sd of [-1, 1]) { g.beginPath(); g.arc(19, sd * 4.5, 1.6, 0, TAU); g.fill(); }
    const lx = o.look ? Math.cos(o.look - a) * 2.2 : 1.5, ly = o.look ? Math.sin(o.look - a) * 2.2 : 0;
    for (const sd of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(6, sd * 9, 6.5, 5.6, 0, 0, TAU); g.fill(); g.fillStyle = '#0a0a14'; g.beginPath(); g.ellipse(7 + lx, sd * 9 + ly, 2.4, 3.8, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(5.5 + lx, sd * 9 - 2 + ly, 1.3, 0, TAU); g.fill(); }
    g.restore();
  }
  GAME.drawSkin = (g, s) => {
    g.fillStyle = '#070b1c'; g.beginPath(); g.arc(0, 0, 54, 0, TAU); g.fill();
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([36 - t * 76, Math.sin(t * 5.2) * 16, i]); }
    drawSnake(g, [pts], s, 13, .62, { ang: Math.PI + Math.atan2(pts[1][1] - pts[0][1], -(pts[1][0] - pts[0][0])) * -1 });
  };
  function pwIcon(g, k, x, y, z = 1) {
    const c = PW[k][0]; g.save(); g.translate(x, y); g.scale(z, z);
    add(g); glo(g, c, 0, 0, 38, .55 + .2 * Math.sin(K.t * 6)); norm(g);
    g.beginPath(); for (let i = 0; i < 6; i++) g.lineTo(Math.cos(i * Math.PI / 3 + Math.PI / 6) * 18, Math.sin(i * Math.PI / 3 + Math.PI / 6) * 18); g.closePath(); g.fillStyle = 'rgba(8,10,28,.9)'; g.fill(); g.strokeStyle = c; g.lineWidth = 2.5; g.stroke();
    g.strokeStyle = c; g.fillStyle = c; g.lineWidth = 2.5; g.lineCap = 'round';
    if (k === 'slow' || k === 'clock') { g.beginPath(); g.arc(0, 1, 9, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(0, 1); g.lineTo(0, -5); g.moveTo(0, 1); g.lineTo(4, 3); g.stroke(); if (k === 'clock') { g.fillRect(-2, -12, 4, 3); } }
    else if (k === 'ghost') { g.beginPath(); g.arc(0, -2, 9, Math.PI, 0); g.lineTo(9, 9); for (let i = 0; i < 3; i++) g.lineTo(9 - (i + .5) * 6, i % 2 ? 9 : 5), g.lineTo(9 - (i + 1) * 6, 9); g.closePath(); g.fill(); g.fillStyle = '#0a0a20'; g.beginPath(); g.arc(-3.5, -2, 2, 0, TAU); g.arc(3.5, -2, 2, 0, TAU); g.fill(); }
    else { g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 7, Math.PI, 0, true); g.stroke(); g.fillStyle = '#e8ecff'; g.fillRect(-9.5, -7, 5, 5); g.fillRect(4.5, -7, 5, 5); }
    g.restore();
  }
  function txt(g, s, x, y, size, col, align = 'center', lw = 6) { g.font = F(size); g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = 'rgba(2,4,14,.85)'; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y); }
  GAME.draw = g => {
    const v = K.view, s = K.skin;
    g.fillStyle = '#02030a'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    if (!body) return;
    if (!bgC) makeBg(); g.drawImage(bgC, 0, 0);
    add(g); const gc = THEMES[theme].edge;
    for (const m of motes) { g.globalAlpha = .25 + .2 * Math.sin(K.t * 2 + m.p); g.fillStyle = gc; g.fillRect(m.x, m.y, 2, 2); }
    for (const r of ripples) { const k = r.t / 1.1; g.globalAlpha = (1 - k) * .5; g.strokeStyle = r.c; g.lineWidth = 3 + 6 * (1 - k); g.beginPath(); g.arc(r.x, r.y, 20 + k * 520 * r.s, 0, TAU); g.stroke(); }
    norm(g);
    for (const p of portals) for (const [q, cs] of [[p.a, p.c], [p.b, p.c]]) { const [x, y] = cc(q); add(g); glo(g, cs, x, y, 46, .7); norm(g); g.fillStyle = '#05030c'; g.beginPath(); g.arc(x, y, 15, 0, TAU); g.fill(); g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.strokeStyle = i % 2 ? '#fff' : cs; const a = K.t * (3 + i) * (i % 2 ? -1 : 1) + i; g.beginPath(); g.arc(x, y, 8 + i * 4.5, a, a + 3.6); g.stroke(); } }
    const f = K.clamp(acc / curST, 0, 1);
    if (food) { const [x, y] = cc(food), r = 10 + Math.sin(K.t * 6) * 1.5; add(g); glo(g, s.c[1], x, y, 34, .8); norm(g); const og = g.createRadialGradient(x - 3, y - 3, 1, x, y, r); og.addColorStop(0, '#fff'); og.addColorStop(.5, s.c[1]); og.addColorStop(1, s.c[1]); g.fillStyle = og; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); add(g); for (let i = 0; i < 2; i++) { const a = K.t * 4 + i * Math.PI; glo(g, '#fff', x + Math.cos(a) * 17, y + Math.sin(a) * 17, 6, .9); } norm(g); }
    if (gold && !(gold.t < 2 && Math.floor(K.t * 8) % 2)) { const [x, y] = cc(gold); add(g); glo(g, '#ffd23f', x, y, 40, .7); norm(g); g.save(); g.translate(x, y); g.rotate(K.t * 2); const sg = g.createRadialGradient(-3, -3, 1, 0, 0, 17); sg.addColorStop(0, '#fffbe0'); sg.addColorStop(1, '#ffb800'); g.fillStyle = sg; star(g, 0, 0, 17, 7.5); g.fill(); g.strokeStyle = '#fff6c0'; g.lineWidth = 1.5; g.stroke(); g.restore(); }
    if (coinP && !(coinP.t < 2 && Math.floor(K.t * 8) % 2)) { const [x, y] = cc(coinP), w = 12 * Math.abs(Math.cos(K.t * 3)) + 2; add(g); glo(g, '#ffcf2e', x, y, 28, .55); norm(g); const cg = g.createLinearGradient(x - w, y - 12, x + w, y + 12); cg.addColorStop(0, '#fff6c4'); cg.addColorStop(.5, '#ffcf2e'); cg.addColorStop(1, '#b07800'); g.fillStyle = cg; g.beginPath(); g.ellipse(x, y, w, 12, 0, 0, TAU); g.fill(); g.strokeStyle = '#8a5a00'; g.lineWidth = 1.5; g.stroke(); }
    if (pwr && !(pwr.t < 2 && Math.floor(K.t * 8) % 2)) { const [x, y] = cc(pwr); pwIcon(g, pwr.k, x, y, 1 + .06 * Math.sin(K.t * 5)); }
    if (eff.magnet > 0 && !dead) { const [hx, hy] = cc(body[0]); g.strokeStyle = 'rgba(255,95,122,.35)'; g.lineWidth = 2; g.setLineDash([6, 8]); g.lineDashOffset = K.t * 30; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(hx, hy, 60 + i * 50 + (K.t * 40) % 50, 0, TAU); g.stroke(); } g.setLineDash([]); }
    const rs = runs(); if (dead) { let skip = deathK; for (const r of rs) { const k = Math.min(r.length, skip); r.splice(0, k); skip -= k; } }
    const live = rs.filter(r => r.length);
    if (live.length && (!dead || deathK === 0)) drawSnake(g, live, s, body.length, 1, { ang: hAng, ghost: eff.ghost > 0 || (inv > 0 && Math.floor(K.t * 10) % 2), lumps: dead ? [] : lumps, f, chomp, tongue: tongue < .3 ? tongue / .3 : 0, look: food ? Math.atan2(cc(food)[1] - cc(body[0])[1], cc(food)[0] - cc(body[0])[0]) : 0 });
    else if (live.length) { const sv = drawHead; drawSnake(g, live, s, body.length, 1, { ang: hAng, lumps: [] }); void sv; }
    if (eff.slow > 0) { const a = Math.min(1, eff.slow) * .35; const sg = g.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 800); sg.addColorStop(0, 'rgba(95,243,255,0)'); sg.addColorStop(1, `rgba(95,243,255,${a})`); g.fillStyle = sg; g.fillRect(0, 0, W, H); }
    // HUD
    if (mode === 2) { const t = Math.ceil(timeL), low = timeL < 10; txt(g, `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, 76, 30, low ? 36 + 3 * Math.sin(K.t * 10) : 34, low ? '#ff5a6a' : '#fff', 'left'); }
    else if (mode === 1) { txt(g, `LEVEL ${level}`, 76, 24, 22, '#fff', 'left', 5); g.fillStyle = 'rgba(0,0,0,.5)'; rr(g, 76, 40, 130, 8, 4); g.fill(); g.fillStyle = s.c[0]; rr(g, 76, 40, 130 * Math.min(1, lvEaten / lvGoal), 8, 4); g.fill(); }
    else txt(g, `LENGTH ${body.length + grow}`, 76, 30, 22, '#fff', 'left', 5);
    let bx = 250; for (const k of ['slow', 'ghost', 'magnet']) if (eff[k] > 0) { const c = PW[k][0]; g.fillStyle = 'rgba(4,6,20,.75)'; rr(g, bx, 12, 120, 34, 12); g.fill(); g.strokeStyle = c; g.lineWidth = 2; g.stroke(); g.fillStyle = c; rr(g, bx + 8, 39, 104 * eff[k] / PW[k][2], 3, 2); g.fill(); txt(g, PW[k][1], bx + 60, 28, 16, c, 'center', 3); bx += 128; }
    txt(g, MODES[mode][0].toUpperCase(), W - 128, 28, 18, 'rgba(220,230,255,.75)', 'right', 4);
    if (phase !== 'play' && !dead) {
      const t = phaseMax - phaseT, a = Math.min(1, t / .2, phaseT / .3), sl = (1 - Math.min(1, t / .3)) * 260;
      g.save(); g.globalAlpha = Math.max(0, a);
      if (phase === 'clear') { txt(g, 'LEVEL CLEAR!', W / 2, H / 2 - 20, 64, s.c[0], 'center', 9); txt(g, `+${5 + level - 1} bonus`, W / 2, H / 2 + 34, 26, '#fff'); }
      else { txt(g, mode === 1 ? `LEVEL ${level}` : lvName.toUpperCase(), W / 2 - sl, H / 2 - 30, 62, '#fff', 'center', 9); txt(g, mode === 1 ? lvName.toUpperCase() + ` · EAT ${lvGoal}` : mode === 2 ? 'EAT AS MUCH AS YOU CAN IN 90 S' : 'EAT · GROW · SURVIVE', W / 2 + sl, H / 2 + 22, 24, s.c[0]); }
      g.restore();
    }
    if (!K.bot && X && !dead && phase === 'play') {
      const [hx, hy] = cc(body[0]), pl = .6 + .4 * Math.sin(K.t * 5);
      if (!(X.tut & 1)) { g.globalAlpha = pl; txt(g, 'SWIPE, TAP A SIDE OR USE ARROW KEYS', W / 2, H - 70, 24, '#fff'); g.globalAlpha = 1; }
      else if (!(X.tut & 2) && food) { const [fx, fy] = cc(food); g.strokeStyle = '#fff'; g.globalAlpha = pl; g.lineWidth = 3; g.beginPath(); g.arc(fx, fy, 26 + 4 * Math.sin(K.t * 8), 0, TAU); g.stroke(); g.globalAlpha = 1; txt(g, 'EAT THE ORBS!', fx, fy - 46, 22, '#fff'); }
      if (pwr && !(X.tut & 4)) { const [px, py] = cc(pwr); txt(g, PW[pwr.k][1] + '!', px, py - 40, 20, PW[pwr.k][0]); }
      void hx; void hy;
    }
    drawBanners(g);
  };
  GAME._dbg = c => eval(c); /*DBG*/
})();
