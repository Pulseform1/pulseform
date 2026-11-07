/* Brick Blitz: neon breakout. Generated levels with special bricks (steel, explosive, moving, regenerating, gold),
   a boss fight every 5th level, power-ups (multiball, wide, fireball, slow, laser, catch, extra ball), unlockable ball
   styles, missions, a daily challenge and trophies. Three balls. */
const GAME = {
  id: 'brick-blitz', title: 'Brick Blitz', tagline: 'Smash every brick. Topple the bosses. Never let the ball drop!',
  font: 'Bungee', accent: '#ff5fa2', accent2: '#5ff3ff', bg: '#0b0820',
  how: ['Move with the mouse, your finger or ← →. Tap or Space launches.', 'Catch power-ups: Multi, Wide, Fire, Slow, Laser, Catch.', 'Red bricks explode. Steel only melts under Fire. Every 5th level a boss attacks!'],
  skins: [
    { name: 'Neon', price: 0, c: ['#5ff3ff', '#ff5fa2'] }, { name: 'Lime', price: 60, c: ['#c6ff3d', '#2bd46b'] }, { name: 'Sunset', price: 150, c: ['#ffb347', '#ff4d6a'] },
    { name: 'Grape', price: 250, c: ['#c79bff', '#6a3bff'] }, { name: 'Ice', price: 400, c: ['#e8fbff', '#62b6ff'] }, { name: 'Royal', price: 700, c: ['#ffe36e', '#b07cff'] },
  ],
};
(() => {
  const TAU = Math.PI * 2, rnd = Math.random, PY = 662, COLS = 12, BW = 92, BH = 32, GAP = 6, ROWH = BH + GAP, TOP = 100, LEFT = (W - COLS * (BW + GAP) + GAP) / 2, CEIL = 52, WALL = 8, HOR = 540;
  const F = s => `${s}px Bungee, "Arial Black", sans-serif`;
  const PU = { M: ['#3ff0ff', 'MULTIBALL'], W: ['#b8ff3d', 'WIDE PADDLE'], F: ['#ff7a2e', 'FIREBALL'], S: ['#b78bff', 'SLOW-MO'], L: ['#ff4f7a', 'LASERS'], C: ['#3dffa8', 'CATCH'], '+': ['#ff5fa2', 'EXTRA BALL'] };
  const PUT = { W: 15, F: 9, S: 10, L: 10, C: 15 };
  const PUW = [['M', 18], ['W', 15], ['F', 11], ['S', 10], ['L', 14], ['C', 12], ['+', 4]];
  const BOSSES = ['CYCLOPS', 'HIVE QUEEN', 'PRISM'], BPAL = [['#ff4f7a', '#ff9ab8'], ['#ffc23a', '#fff09a'], ['#3ff0ff', '#c8fbff']];
  let pad, balls, bricks, drops, lasers, shards, bolts, rings, booms, boss, lives, level, combo, keys, dead, phase, phaseT, phaseMax, lvName, fx, tLevel, flawless, launchQ, laserT, chain, chainT, sweep, bgC, bgHue = 0, botAim, botT, clearTxt, ballStyle, lastShape = -1, stars = [];

  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const hsl = (h, s, l, a = 1) => `hsla(${(h % 360 + 360) % 360},${s}%,${l}%,${a})`;
  const GLC = {};
  function glow(col) {
    if (GLC[col]) return GLC[col];
    const [c, g] = mk(64, 64), gd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gd.addColorStop(0, 'rgba(255,255,255,1)'); gd.addColorStop(.22, 'rgba(255,255,255,.6)'); gd.addColorStop(.55, 'rgba(255,255,255,.16)'); gd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gd; g.fillRect(0, 0, 64, 64); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, 64, 64);
    return (GLC[col] = c);
  }
  const glo = (g, col, x, y, r, a = 1) => { g.globalAlpha = a; g.drawImage(glow(col), x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; };
  const add = g => { g.globalCompositeOperation = 'lighter'; }, norm = g => { g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; };
  function star(g, x, y, r1, r2, n = 5, a0 = -Math.PI / 2) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = a0 + i * Math.PI / n; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }

  /* ================= sound ================= */
  let NB = null;
  const ok = () => K.ac && !K.bot && !K.save.mute;
  function nz(d, v, f, type = 'lowpass', delay = 0, q = 1) {
    if (!ok()) return; const ac = K.ac;
    if (!NB) { NB = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const ch = NB.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = rnd() * 2 - 1; }
    const t = ac.currentTime + delay, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), a = ac.createGain();
    s.buffer = NB; fl.type = type; fl.frequency.value = f; fl.Q.value = q; a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(.001, t + d);
    s.connect(fl).connect(a).connect(mu ? mu.fx : K.master); s.start(t, rnd() * .5); s.stop(t + d + .05);
  }
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
  const sBreak = (c, t) => { const n = PENTA[Math.min(c - 1, PENTA.length - 1)], f = 523 * Math.pow(2, n / 12); K.sfx(f, .12, 'triangle', .09); K.sfx(f * 2, .06, 'sine', .04, 0, .02); nz(.12, t === 's' ? .2 : .12, 3500, 'highpass'); };
  const sClank = () => { K.sfx(1250, .07, 'square', .04); K.sfx(1580, .09, 'square', .03); nz(.06, .1, 2400, 'bandpass', 0, 6); };
  const sBoom = (big) => { nz(big ? 1.2 : .5, big ? .55 : .4, big ? 400 : 900); K.sfx(130, big ? .9 : .35, 'sine', .2, -90); };
  const sPad = () => { K.sfx(260 + Math.min(combo, 12) * 12, .08, 'triangle', .12, 80); nz(.03, .08, 2000, 'bandpass', 0, 3); };

  /* ================= music: synthwave loop ================= */
  let mu = null;
  const mf = n => 440 * Math.pow(2, (n - 69) / 12);
  function nt(f, t, d, type, v, cut = 0, dest) {
    const ac = K.ac, o = ac.createOscillator(), a = ac.createGain(); o.type = type; o.frequency.value = f;
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + .008); a.gain.exponentialRampToValueAtTime(.0008, t + d);
    if (cut) { const fl = ac.createBiquadFilter(); fl.frequency.value = cut; o.connect(fl).connect(a); } else o.connect(a);
    a.connect(dest || mu.g); o.start(t); o.stop(t + d + .03);
  }
  function drum(k, t, v = 1) {
    const ac = K.ac;
    if (k === 0) { const o = ac.createOscillator(), a = ac.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .14); a.gain.setValueAtTime(.55 * v, t); a.gain.exponentialRampToValueAtTime(.001, t + .22); o.connect(a).connect(mu.g); o.start(t); o.stop(t + .25); return; }
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), a = ac.createGain(); s.buffer = NB; fl.type = k === 1 ? 'bandpass' : 'highpass'; fl.frequency.value = k === 1 ? 1700 : 7500;
    a.gain.setValueAtTime((k === 1 ? .32 : .1) * v, t); a.gain.exponentialRampToValueAtTime(.001, t + (k === 1 ? .16 : .045)); s.connect(fl).connect(a).connect(mu.g); s.start(t, rnd() * .5); s.stop(t + .2);
  }
  const PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], BPROG = [[57, 60, 64], [57, 60, 64], [58, 62, 65], [56, 60, 63]];
  const LEAD = [76, 0, 74, 72, 0, 74, 76, 0, 79, 0, 76, 0, 74, 0, 72, 0];
  function song(s, t) {
    const bossy = boss && !boss.dead, P = bossy ? BPROG : PROG, bar = (s >> 4) % 4, st = s & 15, ch = P[bar], int = Math.min(3, 1 + Math.floor(level / 3));
    if (st % 4 === 0) drum(0, t);
    if (st === 4 || st === 12) drum(1, t);
    if (st % 2 === 0 || (int > 1 && bossy)) drum(2, t, st % 4 === 2 ? 1 : .55);
    if (st % 2 === 0) nt(mf(ch[0] - 24 + (st % 8 === 6 ? 12 : 0)), t, .2, 'sawtooth', .075, bossy ? 900 : 650);
    nt(mf(ch[[0, 1, 2, 1][st % 4]] + 12 + (st >= 8 ? 12 : 0)), t, .13, 'square', .02, 2400);
    if (int >= 2 && (s >> 6) % 2 === 1 && LEAD[st]) nt(mf(LEAD[st] - (bar === 1 ? 4 : bar === 2 ? 0 : 0)), t, .3, 'triangle', .05);
    if (st === 0) for (const n of ch) nt(mf(n), t, 1.6, 'sawtooth', .012, 1200);
  }
  function music() {
    if (!ok() || K.state !== 'play') return; const ac = K.ac;
    if (!mu) { mu = { t: 0, s: 0, g: ac.createGain(), fx: ac.createGain() }; mu.g.gain.value = .5; mu.g.connect(K.master); mu.fx.connect(K.master); nz(.01, .0001, 100); }
    if (mu.t < ac.currentTime + .02) mu.t = ac.currentTime + .06;
    const sp = 60 / (boss && !boss.dead ? 132 : 118) / 4;
    while (mu.t < ac.currentTime + .16) { song(mu.s++, mu.t); mu.t += sp; }
  }

  /* ================= meta: missions, daily challenge, trophies, unlocks, banners ================= */
  const P = 'bb', el = id => document.getElementById(P + '-' + id);
  const MIS = [
    ['brk', 'Break {n} bricks in one run', 'run', [40, 90, 160, 260, 400]], ['lv', 'Reach level {n}', 'run', [3, 5, 7, 10, 13, 16]],
    ['cmb', 'Hit a x{n} combo', 'run', [8, 14, 20, 28, 36]], ['pu', 'Catch {n} power-ups in one run', 'run', [3, 6, 9, 13]],
    ['exp', 'Blow up {n} explosive bricks', 'tot', [8, 25, 60, 120]], ['boss', 'Defeat {n} bosses', 'tot', [1, 2, 4, 8]],
    ['flw', 'Clear {n} levels without dropping a ball', 'tot', [1, 3, 6, 12]], ['stl', 'Melt {n} steel bricks with Fireball', 'tot', [3, 10, 25]],
    ['coin', 'Collect {n} coins', 'tot', [15, 40, 90, 180]], ['lz', 'Break {n} bricks with lasers', 'tot', [10, 30, 70]],
  ];
  const DAILY = [['brk', 'Break {n} bricks in one run', 120], ['lv', 'Reach level {n}', 6], ['cmb', 'Hit a x{n} combo', 18], ['pu', 'Catch {n} power-ups in one run', 7], ['exp', 'Blow up {n} explosives in one run', 10], ['boss', 'Defeat a boss', 1]];
  const R = k => RS[k] || 0, T = k => (X && X.tot[k]) || 0;
  const TRO = [
    ['clr1', 'Warmed Up', 'Clear level 1', () => R('lv') >= 2], ['chain', 'Chain Reaction', 'Set off 5 explosives in one chain', () => R('chain') >= 5, 'Plasma ball'],
    ['boss', 'Giant Slayer', 'Defeat your first boss', () => T('boss') >= 1, 'Star ball'], ['combo', 'Combo King', 'Hit a x30 combo', () => R('cmb') >= 30, 'Comet ball'],
    ['lv10', 'Deep Run', 'Reach level 10', () => R('lv') >= 10, 'Pixel ball'], ['flaw', 'Flawless', 'Clear a level without dropping a ball', () => T('flw') >= 1],
    ['multi', 'Juggler', 'Have 8 balls in play at once', () => R('balls') >= 8], ['steel', 'Meltdown', 'Melt 10 steel bricks with Fireball', () => T('stl') >= 10],
    ['boss3', 'Boss Rush', 'Defeat all three bosses', () => T('boss') >= 3], ['lv15', 'Marathon', 'Reach level 15', () => R('lv') >= 15],
    ['brk1k', 'Demolition Crew', 'Break 1,000 bricks in total', () => T('brk') >= 1000], ['rich', 'Coin Magnet', 'Collect 300 coins in total', () => T('coin') >= 300],
  ];
  const BALLS = [{ n: 'Classic' }, { n: 'Plasma', t: 'chain' }, { n: 'Star', t: 'boss' }, { n: 'Comet', t: 'combo' }, { n: 'Pixel', t: 'lv10' }];
  let X = null, RS = {}, runLog = [], banners = [];
  const today = (o = 0) => { const d = new Date(Date.now() - o * 864e5); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const hash = s => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  function meta() {
    if (X) return X;
    const s = K.save; X = s.meta || (s.meta = {});
    X.ms = X.ms || []; X.tr = X.tr || {}; X.tot = X.tot || {}; X.tier = X.tier || {}; X.dy = X.dy || {}; X.sel = X.sel || {}; X.tut = X.tut || 0;
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
    for (const t of TRO) if (!X.tr[t[0]] && t[3]()) { X.tr[t[0]] = 1; reward(30, 'cup', 'Trophy: ' + t[1], '#ffcf3a'); if (t[4]) banner('lock', 'Unlocked: ' + t[4], 'Pick it in Missions', '#5ff3ff'); }
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
    const k = Math.min(1, b.t / .25, (2.8 - b.t) / .3), y = 58 + 34 * (1 - Math.pow(1 - Math.max(0, k), 3)), w = 470;
    g.save(); g.globalAlpha = Math.max(0, k); g.fillStyle = 'rgba(12,8,34,.92)'; rr(g, W / 2 - w / 2, y, w, 62, 20); g.fill();
    g.strokeStyle = b.c; g.lineWidth = 2.5; g.stroke(); g.fillStyle = b.c; g.globalAlpha *= .18; g.beginPath(); g.arc(W / 2 - w / 2 + 34, y + 31, 22, 0, TAU); g.fill(); g.globalAlpha = Math.max(0, k);
    icon(g, b.icon, W / 2 - w / 2 + 34, y + 31, b.c);
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = F(18); let tx = b.text; while (g.measureText(tx).width > w - 90 && tx.length > 8) tx = tx.slice(0, -2);
    g.fillText(tx === b.text ? tx : tx + '…', W / 2 - w / 2 + 66, y + 22); g.fillStyle = b.c; g.font = '800 16px Nunito, sans-serif'; g.fillText(b.sub, W / 2 - w / 2 + 66, y + 44); g.restore();
  }
  const CSS = `.§-daily{margin:-6px 0 12px;padding:8px 12px;border-radius:14px;background:rgba(255,255,255,.07);border:1px solid var(--edge);font-weight:800;font-size:13px;text-align:left;line-height:1.35}
.§-daily b{color:var(--accent2)}.§-h{font-family:var(--display);font-size:18px;margin:14px 0 6px;text-align:left;color:var(--accent2)}
.§-m{background:rgba(255,255,255,.06);border:1px solid var(--edge);border-radius:12px;padding:7px 10px;font-weight:800;font-size:13px;text-align:left;margin-bottom:6px}
.§-mt{display:flex;justify-content:space-between;gap:8px}.§-mt b{color:#ffe07a;white-space:nowrap}
.§-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.1);margin-top:5px;overflow:hidden}.§-bar i{display:block;height:100%;background:var(--accent);border-radius:3px}
.§-tr{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:6px}.§-t{padding:6px 8px;border-radius:10px;background:rgba(255,255,255,.04);font-size:11px;font-weight:700;color:var(--muted);text-align:left;line-height:1.25}
.§-t b{display:block;font-size:12px;color:#cfd3ea}.§-t.on{background:rgba(255,215,90,.13);border:1px solid rgba(255,215,90,.35)}.§-t.on b{color:#ffe07a}
.§-seg{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px}.§-seg button{padding:6px 2px 5px;border-radius:12px;background:rgba(255,255,255,.07);border:2px solid transparent;font-weight:800;font-size:12px;display:flex;flex-direction:column;align-items:center;gap:2px}
.§-seg button.on{border-color:var(--accent);background:rgba(255,255,255,.14)}.§-seg button[disabled]{opacity:.5;cursor:default}.§-seg small{font-size:9px;color:var(--muted);line-height:1.1}.§-seg canvas{width:40px;height:40px}
.§-ov{margin:6px 0 2px}.§-ov .§-m{padding:5px 10px;margin-bottom:4px}.§-done{color:#7dffb0;font-weight:800;font-size:13px;margin-bottom:6px;line-height:1.4}`;
  function ui() {
    if (el('css')) return;
    const css = document.createElement('style'); css.id = P + '-css'; css.textContent = CSS.replace(/§/g, P); document.head.appendChild(css);
    document.querySelector('#sTitle .stats').insertAdjacentHTML('afterend', `<div class="${P}-daily" id="${P}-daily"></div>`);
    document.getElementById('bSkins').insertAdjacentHTML('afterend', `<button id="${P}-bMis">Missions</button>`);
    document.getElementById('oHint').insertAdjacentHTML('beforebegin', `<div id="${P}-over" class="${P}-ov"></div>`);
    document.body.insertAdjacentHTML('beforeend', `<div class="scr" id="${P}-sMis" hidden><div class="card"><h2 class="title" style="font-size:40px">Missions</h2><div id="${P}-body"></div><button class="big" id="${P}-back" style="margin-top:14px">Back</button></div></div>`);
    el('bMis').onclick = () => { K.audio(); misScreen(); document.getElementById('sTitle').hidden = true; el('sMis').hidden = false; };
    el('back').onclick = () => { el('sMis').hidden = true; document.getElementById('sTitle').hidden = false; titleUI(); };
  }
  function titleUI() { const d = el('daily'); if (!d || !X) return; const dl = daily(); d.innerHTML = `★ Daily: ${dl.text} <b>${X.dy.ok ? '✓ done' : '+' + dailyRew()}</b>`; }
  const misHTML = m => { const v = Math.max(0, Math.min(m.g, misVal(m))); return `<div class="${P}-m"><div class="${P}-mt"><span>${misText(m)}</span><b>+${m.r}</b></div><div class="${P}-bar"><i style="width:${v / m.g * 100}%"></i></div></div>`; };
  const unl = i => !BALLS[i].t || X.tr[BALLS[i].t];
  function misScreen() {
    const dl = daily(), nt = TRO.filter(t => X.tr[t[0]]).length;
    el('body').innerHTML = `<div class="${P}-h">Daily challenge</div><div class="${P}-m"><div class="${P}-mt"><span>${dl.text}</span><b>${X.dy.ok ? '✓ Done' : '+' + dailyRew()}</b></div></div>
<div class="${P}-h">Missions</div>${X.ms.map(misHTML).join('')}
<div class="${P}-h">Ball style</div><div class="${P}-seg">${BALLS.map((b, i) => `<button data-i="${i}" class="${(X.sel.u || 0) === i ? 'on' : ''}" ${unl(i) ? '' : 'disabled'}><canvas width="80" height="80"></canvas>${b.n}${unl(i) ? '' : `<small>🔒 ${TRO.find(t => t[0] === b.t)[1]}</small>`}</button>`).join('')}</div>
<div class="${P}-h">Trophies ${nt}/${TRO.length}</div><div class="${P}-tr">${TRO.map(t => `<div class="${P}-t ${X.tr[t[0]] ? 'on' : ''}"><b>${X.tr[t[0]] ? '★' : '☆'} ${t[1]}</b>${t[2]}${t[4] ? ' · unlocks ' + t[4] : ''}</div>`).join('')}</div>`;
    el('body').querySelectorAll(`.${P}-seg button`).forEach(b => {
      const cv = b.querySelector('canvas'), g = cv.getContext('2d'); g.translate(40, 40); g.fillStyle = '#120a2e'; g.beginPath(); g.arc(0, 0, 38, 0, TAU); g.fill();
      drawBall(g, { x: 6, y: -4, r: 13, tr: Array.from({ length: 12 }, (_, i) => [-30 + i * 3, 26 - i * 2.5]) }, +b.dataset.i, GAME.skins[K.save.skin] || GAME.skins[0], 0);
      b.onclick = () => { if (b.disabled) return; X.sel.u = +b.dataset.i; K.persist(); K.sfx(660, .08, 'triangle'); misScreen(); };
    });
  }
  function overPanel() { const o = el('over'); if (o) o.innerHTML = (runLog.length ? `<div class="${P}-done">${runLog.map(t => '✓ ' + t).join('<br>')}</div>` : '') + X.ms.map(misHTML).join(''); }

  /* ================= art ================= */
  function makeBg(hue) {
    bgHue = hue; const [c, g] = mk(W, H);
    const gd = g.createLinearGradient(0, 0, 0, HOR); gd.addColorStop(0, hsl(hue + 230, 70, 5)); gd.addColorStop(.7, hsl(hue + 270, 60, 12)); gd.addColorStop(1, hsl(hue + 310, 70, 22));
    g.fillStyle = gd; g.fillRect(0, 0, W, HOR);
    for (let i = 0; i < 7; i++) { const x = rnd() * W, y = rnd() * HOR * .8, r = 140 + rnd() * 260, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hsl(hue + rnd() * 120 - 60, 90, 50, .13)); gr.addColorStop(1, hsl(hue, 90, 50, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    for (let i = 0; i < 170; i++) { g.fillStyle = `rgba(255,255,255,${.15 + rnd() * .55})`; const s = rnd() < .92 ? 1.2 : 2.2; g.fillRect(rnd() * W, rnd() * HOR * .9, s, s); }
    const sr = 160, sg = g.createLinearGradient(0, HOR - sr, 0, HOR); sg.addColorStop(0, hsl(hue + 40, 100, 68, .85)); sg.addColorStop(.6, hsl(hue + 340, 100, 60, .75)); sg.addColorStop(1, hsl(hue + 300, 100, 50, .6));
    g.save(); const halo = g.createRadialGradient(W / 2, HOR, sr * .6, W / 2, HOR, sr * 2.2); halo.addColorStop(0, hsl(hue + 340, 100, 60, .3)); halo.addColorStop(1, hsl(hue + 340, 100, 60, 0)); g.fillStyle = halo; g.fillRect(0, HOR - sr * 2.2, W, sr * 2.2);
    g.beginPath(); g.arc(W / 2, HOR, sr, Math.PI, 0); g.clip(); g.fillStyle = sg; g.fillRect(W / 2 - sr, HOR - sr, sr * 2, sr);
    g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 7; i++) g.fillRect(W / 2 - sr, HOR - 12 - i * 17, sr * 2, 7 - i * .8); g.restore();
    for (const [amp, col, seed] of [[70, hsl(hue + 270, 60, 10), 1], [44, hsl(hue + 280, 55, 6), 2]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, HOR); for (let x = 0; x <= W; x += 16) { const d = Math.abs(x - W / 2) / (W / 2); g.lineTo(x, HOR - amp * d * (.55 + .45 * Math.abs(Math.sin(x * .013 * seed + seed))) ); } g.lineTo(W, HOR); g.fill(); }
    const fg = g.createLinearGradient(0, HOR, 0, H); fg.addColorStop(0, hsl(hue + 300, 70, 13)); fg.addColorStop(1, hsl(hue + 260, 70, 4)); g.fillStyle = fg; g.fillRect(0, HOR, W, H - HOR);
    g.fillStyle = hsl(hue + 330, 100, 70, .8); g.fillRect(0, HOR - 1, W, 2);
    stars = Array.from({ length: 26 }, () => [rnd() * W, rnd() * HOR * .85, rnd() * TAU, 1 + rnd() * 1.5]);
    bgC = c;
  }
  const SPR = {};
  const CRACKS = [[[.3, 0], [.36, .4], [.28, .66], [.34, 1]], [[.7, 0], [.62, .38], [.72, .6], [.66, 1]], [[.36, .4], [.5, .5], [.62, .38]], [[.02, .55], [.28, .66]], [[.72, .6], [.98, .42]]];
  function brickSpr(t, hue, hp, max) {
    const key = t + hue + ',' + hp + ',' + max; if (SPR[key]) return SPR[key];
    const S = 2, pd = 10, [c, g] = mk((BW + pd * 2) * S, (BH + pd * 2) * S); g.scale(S, S); g.translate(pd, pd);
    g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 9; g.shadowOffsetY = 5; g.fillStyle = '#000'; rr(g, 1, 1, BW - 2, BH - 2, 8); g.fill(); g.restore();
    const C = { s: ['#f6f9ff', '#98a4b8', '#46505f'], x: ['#ffa066', '#d8361e', '#5a0e0a'], r: ['#b0ffd9', '#16c27a', '#05573a'], g: ['#fff6c4', '#ffc21e', '#9a6400'], p: ['#f8ecff', '#a65cff', '#3a0f8a'] }[t] || [hsl(hue, 95, 74), hsl(hue, 88, 55), hsl(hue, 85, 30)];
    const gd = g.createLinearGradient(0, 0, 0, BH); gd.addColorStop(0, C[0]); gd.addColorStop(.48, C[1]); gd.addColorStop(1, C[2]);
    g.fillStyle = gd; rr(g, 0, 0, BW, BH, 8); g.fill();
    g.save(); rr(g, 0, 0, BW, BH, 8); g.clip();
    if (t === 's') {
      g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1; for (let y = 3; y < BH; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(BW, y + 1); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(BW * .55, 0); g.lineTo(BW * .7, 0); g.lineTo(BW * .5, BH); g.lineTo(BW * .35, BH); g.fill();
      for (const [x, y] of [[8, 8], [BW - 8, 8], [8, BH - 8], [BW - 8, BH - 8]]) { const rg = g.createRadialGradient(x - 1, y - 1, .5, x, y, 4); rg.addColorStop(0, '#fff'); rg.addColorStop(1, '#5a6475'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, 3.4, 0, TAU); g.fill(); }
    } else if (t === 'x') {
      for (const x0 of [0, BW - 20]) { g.save(); g.beginPath(); g.rect(x0, 0, 20, BH); g.clip(); g.fillStyle = '#ffd21e'; g.fillRect(x0, 0, 20, BH); g.fillStyle = '#1a1010'; for (let i = -2; i < 6; i++) { g.beginPath(); g.moveTo(x0 + i * 10, BH); g.lineTo(x0 + i * 10 + 5, BH); g.lineTo(x0 + i * 10 + 5 + BH * .6, 0); g.lineTo(x0 + i * 10 + BH * .6, 0); g.fill(); } g.restore(); }
      const cg = g.createRadialGradient(BW / 2, BH / 2, 1, BW / 2, BH / 2, 13); cg.addColorStop(0, '#fffbd0'); cg.addColorStop(.45, '#ffb21e'); cg.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = cg; g.beginPath(); g.arc(BW / 2, BH / 2, 13, 0, TAU); g.fill();
      g.fillStyle = '#3a0a04'; g.fillRect(BW / 2 - 2, BH / 2 - 8, 4, 10); g.fillRect(BW / 2 - 2, BH / 2 + 4, 4, 4);
    } else if (t === 'r') {
      g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1.2; for (let y = 0; y < 3; y++) for (let x = 0; x < 9; x++) { const cx = x * 12 + (y % 2) * 6, cy = y * 11 + 4; g.beginPath(); for (let i = 0; i < 6; i++) g.lineTo(cx + Math.cos(i * Math.PI / 3) * 6, cy + Math.sin(i * Math.PI / 3) * 6); g.closePath(); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(BW / 2 - 9, BH / 2 - 2.5, 18, 5); g.fillRect(BW / 2 - 2.5, BH / 2 - 9, 5, 18);
    } else if (t === 'g') {
      star(g, BW / 2, BH / 2 + 1, 11, 4.6); g.fillStyle = 'rgba(160,96,0,.55)'; g.fill(); star(g, BW / 2, BH / 2, 11, 4.6); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill();
    } else if (t === 'p') {
      star(g, BW / 2, BH / 2, 13, 3, 4, 0); g.fillStyle = '#fff'; g.fill(); for (const [x, y] of [[20, 10], [BW - 22, 22], [30, 24], [BW - 30, 9]]) { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
    } else if (max >= 2) {
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 3; rr(g, 3.5, 3.5, BW - 7, BH - 7, 5); g.stroke(); g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1.5; rr(g, 6.5, 6.5, BW - 13, BH - 13, 3); g.stroke();
      if (max >= 3) { g.fillStyle = 'rgba(255,255,255,.75)'; for (const [x, y] of [[9, 9], [BW - 9, 9], [9, BH - 9], [BW - 9, BH - 9]]) { g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill(); } }
    }
    const gl = g.createLinearGradient(0, 0, 0, BH * .5); gl.addColorStop(0, 'rgba(255,255,255,.62)'); gl.addColorStop(1, 'rgba(255,255,255,.04)');
    g.fillStyle = gl; rr(g, 3, 2, BW - 6, BH * .44, [6, 6, 2, 2]); g.fill();
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, BH - 5, BW, 5);
    if (max - hp > 0) {
      const n = (max - hp) * 2 + 1; g.lineJoin = 'round';
      for (const [col, w, o] of [['rgba(0,0,0,.6)', 2.2, 0], ['rgba(255,255,255,.35)', 1, 1]]) { g.strokeStyle = col; g.lineWidth = w; for (const cr of CRACKS.slice(0, n)) { g.beginPath(); cr.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x * BW + o, y * BH + o)); g.stroke(); } }
    }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1.2; rr(g, .6, .6, BW - 1.2, BH - 1.2, 7.5); g.stroke();
    return (SPR[key] = c);
  }
  function drawPaddle(g, x, y, w, s, h = 20, sq = 0, f = {}) {
    const hh = h * (1 - sq * .28), ww = w * (1 + sq * .07), x0 = x - ww / 2, y0 = y + (h - hh), cap = Math.min(16, ww * .12);
    add(g); g.globalAlpha = .5; g.drawImage(glow(s.c[0]), x0 - 26, y0 - 22, ww + 52, hh + 50); norm(g);
    g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, x0 + 3, y0 + 7, ww, hh, hh / 2); g.fill();
    const gd = g.createLinearGradient(x0, 0, x0 + ww, 0); gd.addColorStop(0, s.c[1]); gd.addColorStop(.5, s.c[0]); gd.addColorStop(1, s.c[1]);
    g.fillStyle = gd; rr(g, x0, y0, ww, hh, hh / 2); g.fill();
    const vs = g.createLinearGradient(0, y0, 0, y0 + hh); vs.addColorStop(0, 'rgba(255,255,255,.55)'); vs.addColorStop(.3, 'rgba(255,255,255,.04)'); vs.addColorStop(.62, 'rgba(0,0,0,0)'); vs.addColorStop(1, 'rgba(0,0,0,.4)');
    g.fillStyle = vs; rr(g, x0, y0, ww, hh, hh / 2); g.fill(); g.strokeStyle = s.c[0]; g.lineWidth = 1.5; g.stroke();
    for (const sd of [0, 1]) {
      const cx = sd ? x0 + ww - cap : x0, cg = g.createLinearGradient(0, y0, 0, y0 + hh); cg.addColorStop(0, '#f4f6ff'); cg.addColorStop(.45, '#9098b0'); cg.addColorStop(1, '#353a4e');
      g.fillStyle = cg; rr(g, cx, y0, cap, hh, sd ? [2, hh / 2, hh / 2, 2] : [hh / 2, 2, 2, hh / 2]); g.fill();
      g.fillStyle = s.c[0]; g.fillRect(sd ? cx + 2 : cx + cap - 5, y0 + 3, 3, hh - 6);
    }
    g.fillStyle = 'rgba(255,255,255,.9)'; rr(g, x - 15, y0 + hh * .36, 30, 4, 2); g.fill();
    if (f.L > 0) for (const sd of [-1, 1]) { const cx = x + sd * (ww / 2 - cap / 2 - 2); g.fillStyle = '#5a6078'; g.fillRect(cx - 4, y0 - 11, 8, 13); g.fillStyle = '#c8cee0'; g.fillRect(cx - 4, y0 - 11, 3, 13); add(g); glo(g, '#ff4f7a', cx, y0 - 12, 12, .9); norm(g); }
    if (f.C > 0) { g.fillStyle = 'rgba(61,255,168,.6)'; rr(g, x0 + cap - 2, y0 - 4, ww - cap * 2 + 4, 7, 4); g.fill(); for (let i = 0; i < 4; i++) { const dx = x0 + cap + (ww - cap * 2) * (i + .5) / 4, dl = 4 + 3 * Math.sin(K.t * 3 + i * 2); g.beginPath(); g.ellipse(dx, y0 + 2 + dl / 2, 2.6, dl, 0, 0, TAU); g.fill(); } }
    if (f.Z > 0) { add(g); g.strokeStyle = '#ff9ae0'; g.lineWidth = 2; for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i <= 8; i++) g.lineTo(x0 + ww * i / 8, y0 + hh / 2 + (rnd() - .5) * hh * 1.4); g.stroke(); } norm(g); }
  }
  const BCOL = ['', '#ff5ff3', '#ffd23f', '#7ad8ff', ''];
  function drawBall(g, b, sty, s, fire) {
    const col = fire ? '#ff7a2e' : BCOL[sty] || s.c[0], tr = b.tr, n = tr.length;
    add(g); g.lineCap = 'round';
    if (sty === 4 && !fire) { for (let i = 0; i < n; i += 2) { const k = i / n; g.globalAlpha = k * .5; g.fillStyle = col; const z = b.r * 1.4 * k; g.fillRect(Math.round(tr[i][0] / 4) * 4 - z / 2, Math.round(tr[i][1] / 4) * 4 - z / 2, z, z); } }
    else for (let i = 1; i < n; i++) { const k = i / n; g.strokeStyle = col; g.globalAlpha = k * (sty === 3 ? .55 : .38); g.lineWidth = b.r * 2 * k * (sty === 3 ? 1.15 : .85); g.beginPath(); g.moveTo(tr[i - 1][0], tr[i - 1][1]); g.lineTo(tr[i][0], tr[i][1]); g.stroke(); }
    glo(g, col, b.x, b.y, b.r * 3.4, fire ? .95 : .7); norm(g);
    const { x, y, r } = b;
    if (fire) { const gd = g.createRadialGradient(x - r * .3, y - r * .3, 1, x, y, r); gd.addColorStop(0, '#fffbe0'); gd.addColorStop(.5, '#ffb347'); gd.addColorStop(1, '#ff4a1e'); g.fillStyle = gd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); return; }
    if (sty === 1) { const gd = g.createRadialGradient(x, y, 1, x, y, r); gd.addColorStop(0, '#fff'); gd.addColorStop(.5, '#ffb0f8'); gd.addColorStop(1, '#c21ed4'); g.fillStyle = gd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); add(g); g.strokeStyle = '#ff9af6'; g.lineWidth = 1.5; for (let k = 0; k < 3; k++) { const a = K.t * 9 + k * 2.1; g.beginPath(); g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.lineTo(x + Math.cos(a + .3) * r * 1.6, y + Math.sin(a + .3) * r * 1.6); g.lineTo(x + Math.cos(a + .1) * r * 2, y + Math.sin(a + .1) * r * 2); g.stroke(); } norm(g); return; }
    if (sty === 2) { g.save(); g.translate(x, y); g.rotate(K.t * 6); star(g, 0, 0, r * 1.35, r * .62); const gd = g.createRadialGradient(-3, -3, 1, 0, 0, r * 1.3); gd.addColorStop(0, '#fffbe0'); gd.addColorStop(1, '#ffb800'); g.fillStyle = gd; g.fill(); g.strokeStyle = '#fff7c0'; g.lineWidth = 1.5; g.stroke(); g.restore(); return; }
    if (sty === 4) { g.fillStyle = s.c[0]; g.fillRect(x - r, y - r, r * 2, r * 2); g.fillStyle = '#fff'; g.fillRect(x - r, y - r, r * 2 - 6, r * 2 - 6); g.fillStyle = s.c[0]; g.fillRect(x - r + 4, y - r + 4, 5, 5); return; }
    const gd = g.createRadialGradient(x - r * .35, y - r * .4, 1, x, y, r); gd.addColorStop(0, '#fff'); gd.addColorStop(.55, sty === 3 ? '#d8f4ff' : '#f2f2ff'); gd.addColorStop(1, sty === 3 ? '#4aa8ff' : s.c[0]);
    g.fillStyle = gd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  GAME.drawSkin = (g, s) => {
    g.fillStyle = '#140b30'; g.beginPath(); g.arc(0, 0, 54, 0, TAU); g.fill();
    drawPaddle(g, 0, 18, 88, s, 16);
    drawBall(g, { x: 10, y: -18, r: 11, tr: Array.from({ length: 10 }, (_, i) => [-34 + i * 4.4, 4 - i * 2.2]) }, 0, s, false);
  };

  /* ================= levels ================= */
  const BMP = {
    Invader: ['..X.....X...', '...X...X....', '..XXXXXXX...', '.XXEXXXEXX..', 'XXXXXXXXXXX.', 'X.XXXXXXX.X.', 'X.X.....X.X.', '...GG.GG....'],
    Heart: ['.XXX....XXX.', 'XXXXX..XXXXX', 'XXXXXXXXXXXX', 'XXXXXGGXXXXX', '.XXXXXXXXXX.', '..XXXXXXXX..', '...XXXXXX...', '....XXXX....'],
    Mushroom: ['....XXXX....', '..XXEXXEXX..', '.XXXXXXXXXX.', 'XXEXXXXXXEXX', 'XXXXXXXXXXXX', '...SXXXXS...', '...XXXXXX...', '....XGGX....'],
    Rocket: ['.....XX.....', '....XXXX....', '....XGGX....', '....XXXX....', '...XXXXXX...', '..XXEXXEXX..', '..XX.XX.XX..', '..E..EE..E..'],
  };
  const SHAPES = [
    ['Warm-Up', () => true], ['Pyramid', (r, c, R) => Math.abs(c - 5.5) <= (r + 1) * 6 / R], ['Checkers', (r, c) => (r + c) % 2 === 0],
    ['Diamond', (r, c, R) => Math.abs(c - 5.5) / 6.2 + Math.abs(r - (R - 1) / 2) / (R / 2 + .4) <= 1], ['Stripes', r => r % 2 === 0], ['Columns', (r, c) => c % 3 !== 1],
    ['Scatter', () => rnd() < .7], ['Fortress', (r, c, R) => r === 0 || r === R - 1 || c === 0 || c === COLS - 1 || (r === R >> 1 && c > 2 && c < 9)],
    ['Zigzag', (r, c) => (c + r * 2) % 6 < 3], ['Hourglass', (r, c, R) => Math.abs(c - 5.5) + .5 >= Math.min(r, R - 1 - r) * 1.3],
    ['Crossfire', (r, c, R) => Math.abs(c - 5.5) < 1.5 || Math.abs(r - (R - 1) / 2) < 1 || Math.abs(Math.abs(c - 5.5) - Math.abs(r - (R - 1) / 2) * 1.7) < 1],
    ['Invader'], ['Heart'], ['Mushroom'], ['Rocket'],
  ];
  function brick(r, c, t, hp, hue, mv) {
    const b = { x: LEFT + c * (BW + GAP), y: TOP + r * ROWH, w: BW, t, hp, max: hp, hue: Math.round(hue / 6) * 6, hit: 0, rg: 0, ent: .45 + r * .07 + c * .02 + rnd() * .04, r, c, mv };
    b.bx = b.x; b.col = { s: '#b8c4d6', x: '#ff6a2e', r: '#3dffa8', g: '#ffcf2e', p: '#c08bff' }[t] || hsl(b.hue, 88, 60);
    return b;
  }
  function buildLevel() {
    bricks = []; drops = []; lasers = []; bolts = []; booms = []; boss = null; tLevel = 0; flawless = true;
    const hue0 = (level * 47 + 190) % 360; makeBg(hue0);
    if (level % 5 === 0) {
      const k = (level / 5 - 1) % 3, hp = Math.round(16 + level * 1.6); lvName = BOSSES[k];
      boss = { k, x: W / 2, y: 214, r: 58, hp, max: hp, t: 0, ft: 3.2, fl: 0, rot: 0, orbs: Array.from({ length: 8 }, (_, i) => ({ a: i / 8 * TAU, on: 1, rt: 0 })), dead: 0, beam: null, ex: 0, ey: 0, sn: 0 };
      for (let c = 0; c < COLS; c++) if (c !== 5 && c !== 6) bricks.push(brick(8, c, c === 0 || c === 11 ? 's' : c % 4 === 2 ? 'x' : c % 4 === 0 ? 'p' : 'n', 1 + (level > 10 ? 1 : 0), hue0 + c * 10));
      return;
    }
    let si = level === 1 ? 0 : level === 2 ? 1 : 0;
    if (level > 2) do si = 2 + Math.floor(rnd() * (SHAPES.length - 2)); while (si === lastShape);
    lastShape = si;
    const sh = SHAPES[si], bm = BMP[sh[0]], R = bm ? 8 : Math.min(8, 4 + Math.floor(level / 2));
    const tough = Math.min(.55, (level - 1) * .06), tough2 = Math.min(.3, (level - 5) * .04);
    const pS = level >= 3 ? Math.min(.1, .03 + level * .006) : 0, pX = level >= 2 ? Math.min(.1, .045 + level * .004) : 0, pR = level >= 4 ? .05 : 0, pG = level >= 2 ? .03 : 0, pP = level >= 2 ? .045 : 0;
    const mv = new Set(level >= 3 && !bm ? [K.irand(1, R - 2)].concat(level >= 8 ? [K.irand(0, R - 1)] : []) : []);
    for (let r = 0; r < R; r++) {
      const hue = hue0 + r * 24;
      if (mv.has(r)) { const sp = K.rand(.8, 1.3) + level * .02, ph = rnd() * TAU; for (let c = 1; c < COLS; c += 3) bricks.push(brick(r, c, 'n', 1 + (rnd() < tough + .3 ? 1 : 0), hue, { amp: 92, sp, ph })); continue; }
      for (let c = 0; c < COLS; c++) {
        let t = 'n', ch = 'X';
        if (bm) { ch = bm[r][c]; if (ch === '.') continue; } else if (!sh[1](r, c, R)) continue;
        let hp = 1 + (rnd() < tough ? 1 : 0) + (rnd() < tough2 ? 1 : 0);
        if (ch === 'E') t = 'x'; else if (ch === 'G') t = 'g'; else if (ch === 'S') t = 's';
        else { const q = rnd(); if (q < pS && r < R - 1) t = 's'; else if (q < pS + pX) t = 'x'; else if (q < pS + pX + pR) t = 'r'; else if (q < pS + pX + pR + pG) t = 'g'; else if (q < pS + pX + pR + pG + pP) t = 'p'; }
        if (t !== 'n') hp = { s: 1, x: 1, p: 1, r: 3, g: 2 }[t];
        bricks.push(brick(r, c, t, hp, hue));
      }
    }
    if (bm) { let a = 1e9, b = -1e9; for (const o of bricks) { a = Math.min(a, o.x); b = Math.max(b, o.x + BW); } const sh2 = (W - (b - a)) / 2 - a; for (const o of bricks) o.x = o.bx = o.x + sh2; }
    if (bricks.filter(o => o.t !== 's').length < 10) return buildLevel();
    lvName = sh[0];
  }
  function serve() { balls = [{ x: pad.x, y: PY - 12, vx: 0, vy: 0, r: 11, stuck: 1, off: 0, hold: 0, tr: [] }]; combo = 0; }
  const padW = () => Math.max(132, 178 - level * 2.4) * (fx.W > 0 ? 1.5 : 1) * (fx.Z > 0 ? .62 : 1);
  const speed = () => Math.min(860, 440 + level * 17 + Math.min(70, tLevel * 1.4)) * (fx.S > 0 ? .62 : 1);
  function startPhase() { phase = 'intro'; phaseT = phaseMax = level % 5 === 0 ? 2.6 : 1.7; launchQ = 0; }
  GAME.reset = () => {
    meta(); RS = {}; runLog = []; banners = [];
    pad = { x: W / 2, tx: W / 2, w: 176, vx: 0, sq: 0 }; lives = 3; level = 1; keys = {}; dead = false; shards = []; rings = []; fx = {}; laserT = 0; chain = 0; chainT = 0; sweep = 0; botAim = null; botT = 0; lastShape = -1;
    ballStyle = K.bot ? K.irand(0, BALLS.length - 1) : (unl(X.sel.u || 0) ? X.sel.u || 0 : 0);
    if (K.bot && rnd() < .3) level = 5 * K.irand(1, 3);
    buildLevel(); serve(); startPhase(); mx('lv', 1); titleUI();
  };
  GAME.pose = () => {
    level = 9; buildLevel(); bricks.forEach(b => b.ent = 0); phase = 'play'; tLevel = 3; fx = { F: 0, L: 5 };
    for (const b of bricks.splice(0, 4)) shatter(b, b.x + 40, b.y + 40, 0, -300);
    shards.forEach(s => { s.x += s.vx * .18; s.y += s.vy * .18; s.a += s.va * .18; });
    balls = [{ x: 520, y: 470, r: 11, vx: 300, vy: -400, tr: Array.from({ length: 12 }, (_, i) => [440 + i * 6.6, 580 - i * 9.4]) }, { x: 800, y: 420, r: 11, vx: 0, vy: 0, tr: Array.from({ length: 12 }, (_, i) => [900 - i * 8, 340 + i * 6.6]).reverse() }];
    drops = [{ x: 960, y: 520, t: 'M', vy: 0, vx: 0 }, { x: 330, y: 560, t: '$', vy: 0, vx: 0 }]; pad.x = 600; ballStyle = 0;
  };

  /* ================= gameplay ================= */
  function launch() {
    if (dead || !balls) return;
    if (phase === 'intro') { launchQ = 1; return; }
    if (phase !== 'play') return;
    let any = 0;
    for (const b of balls) if (b.stuck) { any = 1; const a = b.off ? K.clamp(b.off / (pad.w / 2), -1, 1) * .95 : K.rand(-.3, .3), s = speed(); b.vx = Math.sin(a) * s; b.vy = -Math.cos(a) * s; b.stuck = 0; b.y = PY - b.r - 2; }
    if (any) { K.sfx(520, .08, 'square', .06, 300); if (!K.bot) X.tut |= 2; }
  }
  const moved = () => { if (X && !K.bot) X.tut |= 1; };
  GAME.down = x => { pad.tx = x; moved(); launch(); };
  GAME.move = x => { pad.tx = x; moved(); };
  GAME.key = (c, d) => { keys[c] = d; if (d && (c === 'Space' || c === 'ArrowUp' || c === 'KeyW' || c === 'Enter')) launch(); if (d && /Arrow(Left|Right)|Key[AD]/.test(c)) moved(); };
  function shatter(b, ix, iy, vx0, vy0) {
    const col = b.col, cw = b.w / 3, ch = BH / 2;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const x0 = b.x + i * cw, y0 = b.y + j * ch, p = [[x0, y0], [x0 + cw, y0], [x0 + cw, y0 + ch], [x0, y0 + ch]];
      for (const t of rnd() < .5 ? [[p[0], p[1], p[2]], [p[0], p[2], p[3]]] : [[p[0], p[1], p[3]], [p[1], p[2], p[3]]]) {
        const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3, dx = cx - ix, dy = cy - iy, d = Math.hypot(dx, dy) || 1, sp = 140 + rnd() * 280;
        shards.push({ x: cx, y: cy, vx: dx / d * sp + vx0 * .18 + (rnd() - .5) * 90, vy: dy / d * sp + vy0 * .12 - 160 - rnd() * 140, a: 0, va: (rnd() - .5) * 16, p: t.map(q => [q[0] - cx, q[1] - cy]), c: col, l: 0, m: .8 + rnd() * .7 });
      }
    }
    if (shards.length > 320) shards.splice(0, shards.length - 320);
  }
  function pickPU() { let t = rnd() * PUW.reduce((a, w) => a + w[1], 0); for (const [k, w] of PUW) { if ((t -= w) < 0) return k === '+' && lives >= 5 ? 'M' : k; } return 'M'; }
  function dmg(b, n, sx, sy, vx = 0, vy = 0, fire = false) {
    if (b.dead) return;
    if (b.t === 's' && !fire) { b.hit = .12; sClank(); K.burst(sx, sy, ['#fff', '#cfe3ff'], 5, 240, { life: .25, size: 4, gravity: 400 }); return; }
    b.hp -= n; b.hit = .14; b.rg = 0;
    if (b.hp > 0) { K.sfx(200 + b.hp * 40, .05, 'square', .05); nz(.05, .08, 1800, 'bandpass', 0, 4); K.burst(sx, sy, [b.col, '#fff'], 4, 160, { life: .3, size: 5, square: true }); return; }
    kill(b, sx, sy, vx, vy, fire);
  }
  function kill(b, sx, sy, vx, vy, fire) {
    b.dead = 1; const cx = b.x + b.w / 2, cy = b.y + BH / 2;
    shatter(b, sx, sy, vx, vy); combo++; mx('cmb', combo);
    const pts = (b.t === 'g' ? 3 : b.t === 's' ? 2 : 1) + Math.floor(combo / 8); K.add(pts); if (pts > 1) K.pop(cx, cy, '+' + pts, '#fff', 22);
    st('brk'); sBreak(combo, b.t);
    K.burst(cx, cy, [b.col, '#fff'], 7, 240, { life: .45, size: 5, square: true, gravity: 500 });
    if (combo >= 5 && combo % 5 === 0) { K.pop(cx, cy - 30, `COMBO x${combo}`, '#ffe36e', Math.min(44, 24 + combo * .6)); if (combo % 10 === 0) K.coin(1); }
    if (b.t === 'x') { booms.push({ x: cx, y: cy, t: .1 }); st('exp'); }
    if (b.t === 's' && fire) st('stl');
    if (b.t === 'g') for (let i = 0; i < 3; i++) drops.push({ x: cx + (i - 1) * 16, y: cy, t: '$', vy: -200 - i * 40, vx: (i - 1) * 70 });
    else if (b.t === 'p' || rnd() < .1) drops.push({ x: cx, y: cy, t: pickPU(), vy: -80, vx: 0 });
    else if (rnd() < .12) drops.push({ x: cx, y: cy, t: '$', vy: -120, vx: K.rand(-40, 40) });
  }
  function blast(x, y) {
    rings.push({ x, y, l: 0, m: .45, R: 150, c: '#ffb347', w: 14 }); chain++; chainT = .5; mx('chain', chain);
    K.burst(x, y, ['#fff3a8', '#ffb347', '#ff5a2e', '#ff2e6a'], 24, 520, { gravity: 300, life: .55, size: 9 });
    K.shake(10); K.flash('#ff8a3d', .14); sBoom(false);
    for (const o of bricks) if (!o.dead && o.t !== 's' && Math.abs(o.x + o.w / 2 - x) < 150 && Math.abs(o.y + BH / 2 - y) < 62) dmg(o, 3, x, y);
    if (boss && !boss.dead && K.dist(x, y, boss.x, boss.y) < boss.r + 110) hurtBoss(2, x, y);
  }
  function hurtBoss(n, x, y) {
    const B = boss; if (!B || B.dead) return;
    B.hp -= n; B.fl = .14; K.shake(5); K.add(1); K.sfx(140, .12, 'square', .08, -40); nz(.15, .2, 900); K.burst(x, y, [BPAL[B.k][0], '#fff'], 10, 300, { life: .4, size: 6, gravity: 200 });
    if (B.hp <= 0) {
      B.dead = .001; bolts = []; B.beam = null; st('boss'); K.shake(24); K.flash('#fff', .5); sBoom(true); K.add(20 + level, B.x, B.y - 80, '#ffe36e');
      for (let i = 0; i < 6; i++) drops.push({ x: B.x, y: B.y, t: '$', vy: -300 - rnd() * 200, vx: K.rand(-220, 220) });
      levelClear(3.4);
    }
  }
  function zap() { if (fx.Z > 0) return; fx.Z = 4.5; K.shake(9); K.pop(pad.x, PY - 44, 'ZAPPED!', '#ff7ad0', 28); K.sfx(900, .3, 'sawtooth', .08, -700); nz(.3, .2, 3000, 'bandpass', 0, 2); K.burst(pad.x, PY, ['#ff9ae0', '#fff'], 14, 300, { life: .4, size: 4 }); }
  function levelClear(t = 2.2) {
    phase = 'clear'; phaseT = phaseMax = t;
    for (const b of balls) K.burst(b.x, b.y, ['#fff', K.skin.c[0]], 12, 300, { gravity: 0, life: .5 });
    for (const d of drops) if (d.t === '$') { K.coin(1, d.x, d.y); st('coin'); }
    balls = []; drops = []; bolts = []; lasers = [];
    for (const o of bricks) if (!o.dead) { o.dead = 1; shatter(o, o.x + 46, o.y + 60, 0, -200); }
    const bonus = 5 + level + (flawless ? 10 : 0); K.add(bonus); K.coin(flawless ? 3 : 2); if (flawless) st('flw');
    clearTxt = [flawless ? 'FLAWLESS!' : 'LEVEL CLEAR!', `+${bonus} bonus`]; K.chime(523, [0, 4, 7, 12, 16]); K.flash('#fff', .12);
  }
  function nextLevel() { level++; mx('lv', level); buildLevel(); serve(); startPhase(); }
  function ballLost() {
    if (balls.length) { K.sfx(300, .15, 'triangle', .05, -150); return; }
    lives--; flawless = false; fx = {}; K.shake(14); K.sfx(220, .5, 'sawtooth', .1, -160); nz(.4, .2, 600);
    if (lives <= 0) return gameOver();
    K.pop(W / 2, H / 2 + 60, lives === 1 ? 'LAST BALL!' : lives + ' BALLS LEFT', '#ff8aa8', 40); serve();
  }
  function gameOver() {
    dead = true; K.burst(pad.x, PY, [K.skin.c[0], K.skin.c[1], '#fff'], 40, 500, { life: .8, size: 7 });
    if (!K.bot) { K.persist(); overPanel(); }
    K.over({ title: 'Game over', text: `Level ${level} · ${R('brk')} bricks · best combo x${R('cmb')}`, delay: 900 });
  }
  function reflect(b, nx, ny) { const d = b.vx * nx + b.vy * ny; if (d < 0) { b.vx -= 2 * d * nx; b.vy -= 2 * d * ny; } }
  function stepBall(b, sd) {
    b.x += b.vx * sd; b.y += b.vy * sd;
    if (b.x < WALL + b.r) { b.x = WALL + b.r; b.vx = Math.abs(b.vx); K.sfx(180, .03, 'square', .03); }
    if (b.x > W - WALL - b.r) { b.x = W - WALL - b.r; b.vx = -Math.abs(b.vx); K.sfx(180, .03, 'square', .03); }
    if (b.y < CEIL + b.r) { b.y = CEIL + b.r; b.vy = Math.abs(b.vy); K.sfx(180, .03, 'square', .03); }
    const fire = fx.F > 0, pw = pad.w;
    if (b.vy > 0 && b.y + b.r >= PY && b.y - b.r < PY + 20 && Math.abs(b.x - pad.x) < pw / 2 + b.r) {
      const off = K.clamp((b.x - pad.x) / (pw / 2), -1, 1), s = speed(), a = K.clamp(off * 1.08 + K.clamp(pad.vx / 4000, -.15, .15), -1.15, 1.15);
      b.vx = Math.sin(a) * s; b.vy = -Math.cos(a) * s; b.y = PY - b.r; pad.sq = 1; sPad();
      if (combo >= 10) K.pop(pad.x, PY - 40, `x${combo} streak!`, '#ffe36e', 24);
      combo = 0; K.burst(b.x, PY, [K.skin.c[0], '#fff'], 5, 160, { life: .25, size: 4, gravity: 300 });
      if (fx.C > 0) { b.stuck = 1; b.off = b.x - pad.x; b.hold = 0; b.vx = b.vy = 0; K.sfx(400, .1, 'sine', .08, -100); }
      return;
    }
    if (boss && !boss.dead) {
      const B = boss, dx = b.x - B.x, dy = b.y - B.y, d = Math.hypot(dx, dy) || 1;
      if (d < B.r + b.r) { reflect(b, dx / d, dy / d); b.x = B.x + dx / d * (B.r + b.r + 1); b.y = B.y + dy / d * (B.r + b.r + 1); hurtBoss(fire ? 3 : 1, b.x, b.y); }
      for (const o of B.orbs) if (o.on) {
        const ox = B.x + Math.cos(o.a + B.rot) * 112, oy = B.y + Math.sin(o.a + B.rot) * 112, ex = b.x - ox, ey = b.y - oy, dd = Math.hypot(ex, ey) || 1;
        if (dd < 19 + b.r) { if (!fire) reflect(b, ex / dd, ey / dd); o.on = 0; o.rt = 7; K.add(1); K.sfx(900, .08, 'triangle', .07); K.burst(ox, oy, [BPAL[B.k][1], '#fff'], 10, 260, { life: .4, size: 5 }); combo++; }
      }
    }
    for (const br of bricks) {
      if (br.dead || b.x + b.r < br.x || b.x - b.r > br.x + br.w || b.y + b.r < br.y || b.y - b.r > br.y + BH) continue;
      const cx = K.clamp(b.x, br.x, br.x + br.w), cy = K.clamp(b.y, br.y, br.y + BH), dx = b.x - cx, dy = b.y - cy;
      if (dx * dx + dy * dy < b.r * b.r || (dx === 0 && dy === 0)) {
        if (!fire) {
          if (dx === 0 && dy === 0) b.vy = -b.vy;
          else if (Math.abs(dx) > Math.abs(dy)) { b.vx = Math.sign(dx) * Math.abs(b.vx); b.x = cx + Math.sign(dx) * b.r; }
          else { b.vy = Math.sign(dy) * Math.abs(b.vy); b.y = cy + Math.sign(dy) * b.r; }
        }
        dmg(br, fire ? 3 : 1, cx, cy, b.vx, b.vy, fire);
        if (!fire) break;
      }
    }
  }
  function updBoss(dt) {
    const B = boss;
    if (B.dead) { B.dead += dt; if (B.dead < 1.8 && rnd() < dt * 14) { const a = rnd() * TAU, d = rnd() * B.r, x = B.x + Math.cos(a) * d, y = B.y + Math.sin(a) * d; rings.push({ x, y, l: 0, m: .35, R: 70, c: BPAL[B.k][0], w: 8 }); K.burst(x, y, ['#fff', '#ffb347', BPAL[B.k][0]], 12, 380, { gravity: 200, life: .5, size: 7 }); nz(.3, .25, 700); K.shake(6); }
      if (B.dead >= 1.8 && !B.gone) { B.gone = 1; K.flash('#fff', .7); K.shake(26); sBoom(true); rings.push({ x: B.x, y: B.y, l: 0, m: .8, R: 420, c: '#fff', w: 24 }); shatter({ x: B.x - 60, y: B.y - 16, w: 120, col: '#8a90a8' }, B.x, B.y + 20, 0, -300); shatter({ x: B.x - 46, y: B.y - 40, w: 92, col: BPAL[B.k][0] }, B.x, B.y + 30, 0, -200); K.burst(B.x, B.y, ['#fff', '#ffe36e', BPAL[B.k][0]], 60, 700, { gravity: 300, life: 1, size: 10 }); }
      return; }
    B.t += dt; B.fl -= dt; const rage = 1 - B.hp / B.max;
    B.x = W / 2 + Math.sin(B.t * (.42 + rage * .3)) * 320; B.y = 214 + Math.sin(B.t * 1.3) * 20;
    B.rot += dt * (B.k === 1 ? -1 : 1) * (.7 + rage * .8);
    for (const o of B.orbs) if (!o.on && (o.rt -= dt) <= 0) { o.on = 1; }
    const tb = balls.find(b => !b.stuck) || { x: pad.x, y: PY }, a = Math.atan2(tb.y - B.y, tb.x - B.x); B.ex += (Math.cos(a) * 9 - B.ex) * Math.min(1, dt * 8); B.ey += (Math.sin(a) * 9 - B.ey) * Math.min(1, dt * 8);
    if (phase !== 'play' || balls.every(b => b.stuck)) return;
    if ((B.ft -= dt) <= 0) {
      if (B.k === 0) { const n = 1 + Math.floor(rage * 3); for (let i = 0; i < n; i++) shoot(B.x, B.y + 40, (i - (n - 1) / 2) * .2, 300 + rage * 120); B.ft = 2.3 - rage * .9; }
      else if (B.k === 1) { for (let i = -2; i <= 2; i++) shoot(B.x, B.y + 40, i * .28, 250 + rage * 80, 1); if (++B.sn % 2 === 0) hive(); B.ft = 2.9 - rage; }
      else { B.beam = { x: K.clamp(pad.x + K.rand(-40, 40), 40, W - 40), t: 0 }; B.ft = 3 - rage * 1.1; if (rage > .5) shoot(B.x, B.y + 40, 0, 320); }
      K.sfx(300, .25, 'sawtooth', .05, 500);
    }
    if (B.beam) { const bm = B.beam; bm.t += dt; if (bm.t > .95 && !bm.snd) { bm.snd = 1; nz(.45, .25, 2500, 'bandpass', 0, 1); K.sfx(160, .45, 'sawtooth', .08); } if (bm.t > .95 && bm.t < 1.4 && Math.abs(pad.x - bm.x) < pad.w / 2 + 16) zap(); if (bm.t > 1.45) B.beam = null; }
  }
  function shoot(x, y, da, sp, straight) { const a = straight ? Math.PI / 2 + da : Math.atan2(PY - y, pad.x - x) + da; bolts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp }); }
  function hive() {
    const free = []; for (let r = 9; r <= 10; r++) for (let c = 0; c < COLS; c++) if (!bricks.some(b => !b.dead && b.r === r && b.c === c)) free.push([r, c]);
    for (let i = 0; i < 3 && free.length; i++) { const [r, c] = free.splice(Math.floor(rnd() * free.length), 1)[0], b = brick(r, c, rnd() < .25 ? 'x' : 'n', 1, 40 + c * 8); b.ent = 0; b.mat = .5; b.y -= 120; bricks.push(b); K.burst(b.x + 46, b.y + 16, ['#ffc23a', '#fff'], 8, 160, { gravity: 0, life: .4 }); }
  }
  GAME.update = dt => {
    sweep = (sweep + dt) % 5;
    for (const s of shards) { s.vy += 1500 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.a += s.va * dt; s.l += dt; }
    shards = shards.filter(s => s.l < s.m && s.y < H + 40);
    for (const r of rings) r.l += dt; rings = rings.filter(r => r.l < r.m);
    tickBanners(dt);
    if (!pad || dead) return;
    music(); tLevel += dt;
    for (const k in fx) fx[k] -= dt;
    pad.w += (padW() - pad.w) * Math.min(1, dt * 10);
    const kd = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    if (kd) pad.tx = pad.x + kd * 1150 * dt;
    pad.tx = K.clamp(pad.tx, pad.w / 2 + WALL, W - WALL - pad.w / 2);
    const ox = pad.x, mvx = K.bot ? 1150 * dt : 1e5; pad.x += K.clamp(pad.tx - pad.x, -mvx, mvx); pad.vx = (pad.x - ox) / dt; pad.sq = Math.max(0, pad.sq - dt * 5);
    if (phase === 'intro') { if ((phaseT -= dt) <= 0) { phase = 'play'; if (launchQ) { launchQ = 0; launch(); } } }
    else if (phase === 'clear') { if ((phaseT -= dt) <= 0) nextLevel(); }
    for (const b of balls) if (b.stuck) { b.x = pad.x + b.off; b.y = PY - b.r - 1; b.hold += dt; if (phase === 'play' && b.hold > (b.off ? 2.2 : 4)) launch(); }
    const s = speed(), n = Math.max(1, Math.ceil(s * dt / 5));
    for (let k = 0; k < n; k++) for (let i = balls.length - 1; i >= 0; i--) { const b = balls[i]; if (b.stuck) continue; stepBall(b, dt / n); if (b.y > H + 40) { balls.splice(i, 1); ballLost(); if (dead) return; } }
    for (const b of balls) {
      if (!b.stuck) { const sp = Math.hypot(b.vx, b.vy) || 1, k2 = (sp + (s - sp) * Math.min(1, dt * 4)) / sp; b.vx *= k2; b.vy *= k2; if (Math.abs(b.vy) < s * .28) { b.vy = Math.sign(b.vy || -1) * s * .28; b.vx = Math.sign(b.vx || 1) * Math.sqrt(Math.max(0, s * s - b.vy * b.vy)); } }
      b.tr.push([b.x, b.y]); if (b.tr.length > (ballStyle === 3 ? 20 : 12)) b.tr.shift();
      if (fx.F > 0 && rnd() < .7) K.burst(b.x, b.y, ['#ffd27a', '#ff7a2e', '#ff3d1e'], 1, 60, { gravity: -250, life: .3, size: 10 });
    }
    mx('balls', balls.length);
    for (const b of bricks) {
      if (b.ent > 0) b.ent = Math.max(0, b.ent - dt);
      if (b.mat > 0) { b.mat -= dt; b.y += 240 * dt; }
      if (b.hit > 0) b.hit -= dt;
      if (b.mv) b.x = b.bx + Math.sin(tLevel * b.mv.sp + b.mv.ph) * b.mv.amp;
      if (b.t === 'r' && b.hp < b.max && (b.rg += dt) > 2.5) { b.hp++; b.rg = 0; K.burst(b.x + 46, b.y + 16, ['#3dffa8', '#fff'], 6, 90, { gravity: -60, life: .5, size: 4 }); K.sfx(700, .1, 'sine', .04, 300); }
    }
    bricks = bricks.filter(b => !b.dead);
    if (boss) updBoss(dt);
    for (const o of booms) if ((o.t -= dt) <= 0) { o.done = 1; blast(o.x, o.y); }
    booms = booms.filter(o => !o.done); if ((chainT -= dt) <= 0) chain = 0;
    if (fx.L > 0 && phase === 'play' && (laserT -= dt) <= 0) { laserT = .3; for (const sd of [-1, 1]) lasers.push({ x: pad.x + sd * (pad.w / 2 - 14), y: PY - 10 }); K.sfx(1700, .07, 'square', .03, -1100); }
    for (const l of lasers) {
      l.y -= 1150 * dt; if (l.y < CEIL) l.gone = 1;
      for (const br of bricks) if (!br.dead && l.x > br.x && l.x < br.x + br.w && l.y > br.y && l.y < br.y + BH) { l.gone = 1; if (br.t !== 's') st('lz'); dmg(br, 1, l.x, br.y + BH, 0, -300); break; }
      if (!l.gone && boss && !boss.dead) { if (K.dist(l.x, l.y, boss.x, boss.y) < boss.r) { l.gone = 1; hurtBoss(.5, l.x, l.y); } else for (const o of boss.orbs) if (o.on && K.dist(l.x, l.y, boss.x + Math.cos(o.a + boss.rot) * 112, boss.y + Math.sin(o.a + boss.rot) * 112) < 20) { o.on = 0; o.rt = 7; l.gone = 1; K.burst(l.x, l.y, ['#fff'], 6, 200, { life: .3 }); } }
    }
    lasers = lasers.filter(l => !l.gone);
    for (const o of bolts) { o.x += o.vx * dt; o.y += o.vy * dt; if (o.y > PY - 6 && o.y < PY + 22 && Math.abs(o.x - pad.x) < pad.w / 2 + 6) { o.gone = 1; zap(); } if (o.y > H + 20 || o.x < -20 || o.x > W + 20) o.gone = 1; }
    bolts = bolts.filter(o => !o.gone);
    for (const d of drops) {
      d.vy = Math.min(d.vy + 520 * dt, d.t === '$' ? 300 : 220); d.y += d.vy * dt; d.x = K.clamp(d.x + d.vx * dt, 24, W - 24); d.vx *= .985;
      if (d.y > PY - 16 && d.y < PY + 26 && Math.abs(d.x - pad.x) < pad.w / 2 + 18) { d.gone = 1; powerUp(d); } else if (d.y > H + 30) d.gone = 1;
    }
    drops = drops.filter(d => !d.gone);
    if (phase === 'play' && !bricks.some(b => b.t !== 's') && (!boss || boss.dead)) levelClear();
  };
  function powerUp(d) {
    const t = d.t; if (t === '$') { K.coin(1, d.x, PY - 10); st('coin'); return; }
    st('pu'); if (!K.bot) X.tut |= 4;
    K.chime(660, [0, 7, 12]); K.pop(d.x, PY - 56, PU[t][1], PU[t][0], 28); rings.push({ x: d.x, y: PY, l: 0, m: .4, R: 90, c: PU[t][0], w: 6 });
    if (t === 'M') {
      if (balls.every(b => b.stuck)) launch();
      for (const b of balls.filter(o => !o.stuck).slice(0, 3)) for (const da of [-.5, .5]) if (balls.length < 9) { const a = Math.atan2(b.vx, -b.vy) + da, s = speed(); balls.push({ x: b.x, y: b.y, vx: Math.sin(a) * s, vy: -Math.abs(Math.cos(a) * s), r: 11, tr: b.tr.slice(), stuck: 0 }); }
    } else if (t === '+') lives = Math.min(5, lives + 1);
    else fx[t] = PUT[t];
  }
  GAME.bot = dt => {
    if (dead || !pad || !balls) return;
    botT += dt;
    if (balls.some(b => b.stuck) && phase === 'play' && botT > .6) { launch(); botT = 0; }
    let best = null, bt = 1e9;
    for (const b of balls) if (!b.stuck && b.vy > 0) { const t = (PY - b.r - b.y) / b.vy; if (t < bt) { bt = t; best = b; } }
    let tx = pad.x;
    if (best) {
      let x = best.x + best.vx * bt; const lo = WALL + best.r, span = W - 2 * lo; x -= lo; x = ((x % (2 * span)) + 2 * span) % (2 * span); x = (x > span ? 2 * span - x : x) + lo;
      if (!botAim || botAim.dead || rnd() < .006) botAim = K.pick(bricks.filter(b => b.t !== 's')) || (boss && !boss.dead ? boss : null);
      let off = 0;
      if (botAim) { const ax = botAim.r > 20 && botAim.orbs ? botAim.x : botAim.x + BW / 2, ay = botAim.orbs ? botAim.y : botAim.y + BH / 2; off = K.clamp(Math.atan2(ax - x, PY - ay) / 1.08, -.75, .75); }
      tx = x - off * pad.w / 2 * .9 + Math.sin(K.t * 1.7) * 6;
    } else if (balls.length) tx = balls[0].x;
    for (const d of drops) { if (d.y < PY - 320) continue; const need = Math.abs(d.x - pad.x) / 1150, tD = (PY - d.y) / Math.max(80, d.vy); if (tD > need - .05 && (!best || bt > need + Math.abs(d.x - tx) / 1150 + .2)) { tx = d.x; break; } }
    for (const o of bolts) if (o.vy > 0 && o.y > PY - 220 && Math.abs(o.x - tx) < pad.w / 2 + 24 && (!best || bt > .45)) tx = o.x + (o.x > W / 2 ? -1 : 1) * (pad.w / 2 + 44);
    if (boss && boss.beam && boss.beam.t > .25 && boss.beam.t < 1.4 && Math.abs(boss.beam.x - tx) < pad.w / 2 + 30 && (!best || bt > .5)) tx = boss.beam.x + (boss.beam.x > W / 2 ? -1 : 1) * (pad.w / 2 + 50);
    pad.tx = tx;
  };

  /* ================= drawing ================= */
  function drawBoss(g, B) {
    const { x, y, r } = B, [c0, c1] = BPAL[B.k], fl = B.fl > 0;
    if (B.gone) return;
    const dk = B.dead ? Math.min(1, B.dead / 1.8) : 0;
    g.save(); if (B.dead) g.translate((rnd() - .5) * 10 * dk, (rnd() - .5) * 10 * dk);
    add(g); glo(g, c0, x, y, r * 2.6, .32 + .1 * Math.sin(K.t * 4)); norm(g);
    if (!B.dead) { g.strokeStyle = c0; g.globalAlpha = .2; g.lineWidth = 2; g.setLineDash([6, 10]); g.beginPath(); g.arc(x, y, 112, 0, TAU); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
      for (const o of B.orbs) if (o.on) { const ox = x + Math.cos(o.a + B.rot) * 112, oy = y + Math.sin(o.a + B.rot) * 112; add(g); glo(g, c0, ox, oy, 34, .55); norm(g); g.save(); g.translate(ox, oy); g.rotate(K.t * 2 + o.a); g.beginPath(); for (let i = 0; i < 6; i++) g.lineTo(Math.cos(i * Math.PI / 3) * 16, Math.sin(i * Math.PI / 3) * 16); g.closePath(); const og = g.createLinearGradient(-16, -16, 16, 16); og.addColorStop(0, '#fff'); og.addColorStop(.4, c1); og.addColorStop(1, c0); g.fillStyle = og; g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.stroke(); g.restore(); } }
    if (B.k === 0) { g.fillStyle = '#3a3f58'; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(x + sd * r * .55, y - r * .7); g.lineTo(x + sd * r * 1.05, y - r * 1.25); g.lineTo(x + sd * r * .85, y - r * .45); g.fill(); } }
    if (B.k === 1) { g.fillStyle = '#ffc23a'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * 18 - 9, y - r * .82); g.lineTo(x + i * 18, y - r * 1.25 - (i === 0 ? 10 : 0)); g.lineTo(x + i * 18 + 9, y - r * .82); g.fill(); } }
    const bg = g.createRadialGradient(x - r * .35, y - r * .45, r * .1, x, y, r); bg.addColorStop(0, fl ? '#fff' : '#e8ecff'); bg.addColorStop(.35, fl ? '#fff' : '#8a90b0'); bg.addColorStop(1, '#1a1c2e');
    g.fillStyle = bg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = c0; g.lineWidth = 3; add(g); for (let i = 0; i < 6; i++) { const a = B.rot * .5 + i * TAU / 6; g.globalAlpha = .7; g.beginPath(); g.arc(x, y, r * .86, a, a + .7); g.stroke(); } norm(g);
    if (B.k === 2) { g.strokeStyle = 'rgba(200,250,255,.5)'; g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + K.t * .3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); } }
    const er = r * .46; g.fillStyle = '#0c0a18'; g.beginPath(); g.arc(x, y, er + 5, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, er, 0, TAU); g.fill();
    const ix = x + B.ex, iy = y + B.ey, ig = g.createRadialGradient(ix, iy, 2, ix, iy, er * .6); ig.addColorStop(0, c1); ig.addColorStop(1, c0);
    g.fillStyle = ig; g.beginPath(); g.arc(ix, iy, er * .6, 0, TAU); g.fill(); g.fillStyle = '#05040c'; g.beginPath(); g.arc(ix, iy, er * .28, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(ix - er * .2, iy - er * .22, er * .12, 0, TAU); g.fill();
    const lid = fl ? .7 : B.hp / B.max < .3 ? .3 + .1 * Math.sin(K.t * 8) : 0;
    if (lid > 0) { g.fillStyle = '#2a2d44'; g.beginPath(); g.arc(x, y, er + 1, Math.PI, 0); g.lineTo(x + er, y - er + lid * er * 2); g.lineTo(x - er, y - er + lid * er * 2); g.fill(); }
    if (dk) { g.globalAlpha = dk; g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r * (1 + dk * .2), 0, TAU); g.fill(); }
    g.restore();
  }
  function drawCap(g, d) {
    if (d.t === '$') { const s = Math.abs(Math.cos(K.t * 5 + d.x)); add(g); glo(g, '#ffcf2e', d.x, d.y, 26, .55); norm(g); const cg = g.createLinearGradient(d.x - 11, d.y - 11, d.x + 11, d.y + 11); cg.addColorStop(0, '#fff6c4'); cg.addColorStop(.5, '#ffcf2e'); cg.addColorStop(1, '#b07800'); g.fillStyle = cg; g.beginPath(); g.ellipse(d.x, d.y, 11 * s + 1.5, 11, 0, 0, TAU); g.fill(); g.strokeStyle = '#8a5a00'; g.lineWidth = 1.5; g.stroke(); return; }
    const c = PU[d.t][0];
    g.save(); g.translate(d.x, d.y); g.rotate(Math.sin(K.t * 3 + d.x) * .1);
    add(g); glo(g, c, 0, 0, 52, .5); norm(g);
    const bg = g.createLinearGradient(0, -14, 0, 14); bg.addColorStop(0, '#fff'); bg.addColorStop(.3, c); bg.addColorStop(1, '#1a1030');
    g.fillStyle = bg; rr(g, -28, -14, 56, 28, 14); g.fill();
    g.save(); rr(g, -28, -14, 56, 28, 14); g.clip(); g.fillStyle = 'rgba(255,255,255,.22)'; for (let i = -3; i < 4; i++) { const ox = ((K.t * 40) % 20) + i * 20; g.beginPath(); g.moveTo(ox - 6, 14); g.lineTo(ox + 2, 14); g.lineTo(ox + 12, -14); g.lineTo(ox + 4, -14); g.fill(); } g.restore();
    g.fillStyle = 'rgba(255,255,255,.55)'; rr(g, -22, -11, 44, 8, 4); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5; rr(g, -28, -14, 56, 28, 14); g.stroke();
    g.font = F(17); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 4; g.strokeStyle = 'rgba(10,6,30,.85)'; g.strokeText(d.t, 0, 2); g.fillStyle = '#fff'; g.fillText(d.t, 0, 2);
    g.restore();
  }
  function txt(g, s, x, y, size, col, align = 'center', stroke = 6) { g.font = F(size); g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = stroke; g.strokeStyle = 'rgba(8,4,26,.85)'; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y); }
  GAME.draw = g => {
    const v = K.view, s = K.skin;
    if (!bgC) makeBg(200);
    g.fillStyle = '#05030f'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.drawImage(bgC, 0, 0);
    for (const [x, y, p, z] of stars) { g.globalAlpha = .4 + .6 * Math.abs(Math.sin(K.t * z + p)); g.fillStyle = '#fff'; g.fillRect(x - z / 2, y - z / 2, z, z); } g.globalAlpha = 1;
    g.strokeStyle = hsl(bgHue + 320, 100, 62); g.lineWidth = 1.5;
    for (let i = -14; i <= 14; i++) { g.globalAlpha = .35; g.beginPath(); g.moveTo(W / 2 + i * 34, HOR); g.lineTo(W / 2 + i * 210, H); g.stroke(); }
    const sc = (K.t * .55) % 1; for (let i = 0; i < 9; i++) { const z = (i + sc) / 9, y = HOR + (H - HOR) * z * z; g.globalAlpha = z * .6; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } g.globalAlpha = 1;
    for (const [x0, sd] of [[0, 1], [W - WALL, -1]]) { const wg = g.createLinearGradient(x0, 0, x0 + WALL, 0); wg.addColorStop(sd > 0 ? 0 : 1, '#2a1a5a'); wg.addColorStop(sd > 0 ? 1 : 0, '#ff5fa2'); g.fillStyle = wg; g.fillRect(x0, CEIL, WALL, H - CEIL); }
    add(g); g.globalAlpha = .25; g.drawImage(glow('#ff5fa2'), -30, CEIL, 60, H - CEIL); g.drawImage(glow('#ff5fa2'), W - 30, CEIL, 60, H - CEIL); norm(g);
    if (!pad) return;
    if (boss) drawBoss(g, boss);
    if (boss && boss.beam) { const bm = boss.beam, on = bm.t > .95; if (!on) { g.strokeStyle = `rgba(63,240,255,${.35 + .35 * Math.sin(bm.t * 30)})`; g.lineWidth = 2; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(bm.x, boss.y + 40); g.lineTo(bm.x, H); g.stroke(); g.setLineDash([]); txt(g, '!', bm.x, PY - 90, 34, '#3ff0ff'); } else { add(g); const w = 34 * Math.min(1, (1.45 - bm.t) * 4); const bg = g.createLinearGradient(bm.x - w, 0, bm.x + w, 0); bg.addColorStop(0, 'rgba(63,240,255,0)'); bg.addColorStop(.5, 'rgba(220,255,255,.95)'); bg.addColorStop(1, 'rgba(63,240,255,0)'); g.fillStyle = bg; g.fillRect(bm.x - w, boss.y + 30, w * 2, H); norm(g); } }
    const sx = (sweep / 5) * (W + 900) - 450;
    for (const b of bricks) {
      if (b.ent > .35) continue;
      const k = b.ent / .35, oy = -k * k * 460, y = b.y + oy;
      g.drawImage(brickSpr(b.t, b.hue, b.hp, b.max), b.x - 10, y - 10, BW + 20, BH + 20);
      if (b.t === 'x') { add(g); glo(g, '#ff7a1e', b.x + BW / 2, y + BH / 2, 34, .3 + .25 * Math.sin(K.t * 7 + b.x)); norm(g); }
      if (b.t === 'r' && b.hp < b.max) { g.strokeStyle = '#b0ffd9'; g.lineWidth = 3; g.beginPath(); g.arc(b.x + BW / 2, y + BH / 2, 13, -Math.PI / 2, -Math.PI / 2 + TAU * b.rg / 2.5); g.stroke(); }
      if (b.mv) { g.fillStyle = 'rgba(255,255,255,.55)'; const dir = Math.cos(tLevel * b.mv.sp + b.mv.ph) > 0 ? 1 : -1, ax = dir > 0 ? b.x + BW + 8 : b.x - 8; for (let i = 0; i < 2; i++) { const xx = ax + dir * i * 8; g.beginPath(); g.moveTo(xx, y + 9); g.lineTo(xx + dir * 6, y + 16); g.lineTo(xx, y + 23); g.fill(); } }
      if (b.hit > 0) { g.globalAlpha = Math.min(1, b.hit * 6); g.fillStyle = '#fff'; rr(g, b.x, y, BW, BH, 8); g.fill(); g.globalAlpha = 1; }
      const rel = b.x + BW / 2 + (b.y - TOP) * .6 - sx;
      if (Math.abs(rel) < 70) { g.save(); rr(g, b.x, y, BW, BH, 8); g.clip(); g.globalAlpha = .4 * (1 - Math.abs(rel) / 70); g.fillStyle = '#fff'; const x0 = b.x + BW / 2 - rel; g.beginPath(); g.moveTo(x0 - 14, y + BH); g.lineTo(x0 + 2, y + BH); g.lineTo(x0 + 20, y); g.lineTo(x0 + 4, y); g.fill(); g.restore(); }
    }
    for (const p of shards) { g.globalAlpha = Math.min(1, (p.m - p.l) * 3); g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.beginPath(); g.moveTo(p.p[0][0], p.p[0][1]); g.lineTo(p.p[1][0], p.p[1][1]); g.lineTo(p.p[2][0], p.p[2][1]); g.closePath(); g.fillStyle = p.c; g.fill(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; g.stroke(); g.restore(); }
    g.globalAlpha = 1;
    for (const d of drops) drawCap(g, d);
    add(g); for (const l of lasers) { g.fillStyle = '#ff9ab8'; g.fillRect(l.x - 2, l.y - 12, 4, 24); glo(g, '#ff4f7a', l.x, l.y, 16, .8); }
    for (const o of bolts) { glo(g, BPAL[boss ? boss.k : 0][0], o.x, o.y, 26, .9); g.fillStyle = '#fff'; g.beginPath(); g.arc(o.x, o.y, 5, 0, TAU); g.fill(); } norm(g);
    for (const b of balls) drawBall(g, b, ballStyle, s, fx.F > 0);
    if (!dead) drawPaddle(g, pad.x, PY, pad.w, s, 20, pad.sq, fx);
    for (const r of rings) { const k = r.l / r.m; g.globalAlpha = 1 - k; g.strokeStyle = r.c; g.lineWidth = r.w * (1 - k) + 1; g.beginPath(); g.arc(r.x, r.y, r.R * (1 - Math.pow(1 - k, 3)), 0, TAU); g.stroke(); } g.globalAlpha = 1;
    // HUD band
    const hg = g.createLinearGradient(0, 0, 0, CEIL); hg.addColorStop(0, 'rgba(8,4,24,.95)'); hg.addColorStop(1, 'rgba(26,12,60,.88)'); g.fillStyle = hg; g.fillRect(v.x0, 0, v.x1 - v.x0, CEIL);
    const lg = g.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, '#ff5fa2'); lg.addColorStop(.5, '#b07cff'); lg.addColorStop(1, '#5ff3ff'); g.fillStyle = lg; g.fillRect(v.x0, CEIL - 2, v.x1 - v.x0, 2);
    for (let i = 0; i < lives; i++) drawBall(g, { x: 80 + i * 28, y: 26, r: 8, tr: [] }, ballStyle, s, false);
    let hx = 80 + Math.max(3, lives) * 28 + 8;
    for (const k of 'WFSLC') if (fx[k] > 0) { const c = PU[k][0], f = fx[k] / PUT[k]; g.fillStyle = 'rgba(0,0,0,.45)'; rr(g, hx, 12, 48, 28, 10); g.fill(); g.strokeStyle = c; g.lineWidth = 2; g.stroke(); g.fillStyle = c; g.fillRect(hx + 6, 33, 36 * f, 3); g.font = F(16); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(k, hx + 24, 24); hx += 56; }
    if (fx.Z > 0) { g.fillStyle = '#ff7ad0'; g.font = F(16); g.textAlign = 'left'; g.fillText('ZAPPED', hx + 4, 27); }
    g.font = F(18); g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = boss ? '#ff8aa8' : '#d8d0ff'; g.fillText(boss ? 'BOSS · LV ' + level : 'LEVEL ' + level, W - 128, 27);
    if (combo >= 3 && phase === 'play') { const z = Math.min(1, combo / 30); txt(g, `x${combo}`, W - 300, 27, 20 + z * 8, `hsl(${50 - z * 50},100%,65%)`, 'right', 4); }
    if (boss && !boss.dead && phase !== 'intro') { const f = Math.max(0, boss.hp / boss.max); g.fillStyle = 'rgba(0,0,0,.55)'; rr(g, W / 2 - 260, 62, 520, 16, 8); g.fill(); const bg = g.createLinearGradient(W / 2 - 260, 0, W / 2 + 260, 0); bg.addColorStop(0, BPAL[boss.k][0]); bg.addColorStop(1, BPAL[boss.k][1]); g.fillStyle = bg; rr(g, W / 2 - 258, 64, 516 * f, 12, 6); g.fill(); txt(g, lvName, W / 2, 94, 16, '#fff', 'center', 4); }
    // phase banners
    if (phase === 'intro') {
      const t = phaseMax - phaseT, a = Math.min(1, t / .25, phaseT / .3), sl = (1 - Math.min(1, t / .35)) * 300;
      g.save(); g.globalAlpha = Math.max(0, a);
      if (boss) { g.fillStyle = 'rgba(120,0,30,.55)'; g.fillRect(v.x0, 420, v.x1 - v.x0, 120); g.fillStyle = '#ff3d6b'; for (let i = -2; i < 42; i++) { const x = i * 40 - (K.t * 120) % 40; g.beginPath(); g.moveTo(x, 420); g.lineTo(x + 20, 420); g.lineTo(x + 8, 432); g.lineTo(x - 12, 432); g.fill(); g.beginPath(); g.moveTo(x, 540); g.lineTo(x + 20, 540); g.lineTo(x + 8, 528); g.lineTo(x - 12, 528); g.fill(); }
        txt(g, 'WARNING', W / 2 - sl, 456, 26, '#ff9ab8'); txt(g, lvName, W / 2 + sl, 498, 54, '#fff', 'center', 8); }
      else { txt(g, 'LEVEL ' + level, W / 2 - sl, 470, 62, '#fff', 'center', 9); txt(g, lvName.toUpperCase(), W / 2 + sl, 522, 24, '#5ff3ff'); }
      g.restore();
    }
    if (phase === 'clear' && clearTxt) { const t = phaseMax - phaseT, a = Math.min(1, t / .2, phaseT / .3), z = 1 + .3 * Math.max(0, 1 - t / .25); g.save(); g.globalAlpha = Math.max(0, a); g.translate(W / 2, 470); g.scale(z, z); txt(g, clearTxt[0], 0, 0, 58, '#ffe36e', 'center', 9); txt(g, clearTxt[1], 0, 52, 24, '#fff'); g.restore(); }
    // onboarding hints
    if (!K.bot && X && !dead && phase !== 'clear') {
      const pulse = .65 + .35 * Math.sin(K.t * 5);
      if (!(X.tut & 1)) { g.globalAlpha = pulse; txt(g, '◀  DRAG OR USE ARROW KEYS  ▶', pad.x, PY + 38, 18, '#fff', 'center', 5); g.globalAlpha = 1; }
      if (!(X.tut & 2) && balls.some(b => b.stuck)) { const by = PY - 70 - 8 * Math.sin(K.t * 6); txt(g, 'TAP OR SPACE TO LAUNCH', pad.x, by - 30, 20, '#5ff3ff'); g.fillStyle = '#5ff3ff'; g.beginPath(); g.moveTo(pad.x - 10, by); g.lineTo(pad.x + 10, by); g.lineTo(pad.x, by - 14); g.fill(); }
      if (!(X.tut & 4)) { const d = drops.find(o => o.t !== '$'); if (d) { g.strokeStyle = '#fff'; g.globalAlpha = pulse; g.lineWidth = 3; g.beginPath(); g.arc(d.x, d.y, 44 + 6 * Math.sin(K.t * 8), 0, TAU); g.stroke(); g.globalAlpha = 1; txt(g, 'CATCH IT!', d.x, d.y - 62, 20, '#fff'); } }
    }
    drawBanners(g);
  };
  GAME._dbg = c => eval(c); /*DBG*/
})();
