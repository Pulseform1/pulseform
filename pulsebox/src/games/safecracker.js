/* Safecracker: twelve jobs, from a corner-shop safe to the Impossible Vault. Every safe is a chain of locks you work
   through against the clock and the alarm: a combination dial with no guide (listen for the clicks and feel the
   stethoscope pulse), a reinforced plate you drill through without burning the bit, explosive charges you place on the
   weak points and then take cover from, a colour keypad that flashes its code once, and pin tumblers you set one by one.
   Noise raises the alarm; if it fills, you run with nothing. The take buys better tools. */
const GAME = {
  id: 'safecracker', title: 'Safecracker', tagline: 'Dial. Drill. Blast. Get out before the alarm.',
  font: 'Black Ops One', accent: '#ffd23f', accent2: '#5ad8ff', bg: '#0e1116', noHud: true, noSkins: true, scoreLabel: 'Total take ($)',
  how: [
    'DIAL: drag the dial (or A / D, Shift for fast) and LISTEN: the clicks get louder and the stethoscope pulses when you are close. On the number, press SET (Space).',
    'DRILL: move the drill onto the weak spot, then hold DRILL. Let go before the bit overheats. KEYPAD: watch the colours, then repeat them.',
    'CHARGES: tap the glowing weak points, light the fuse, then TAKE COVER just before it blows. PINS: tap as each pin crosses the line.',
    'Drilling and blasting are loud: the alarm rises. Mistakes too. Spend your take on better tools between jobs.',
  ],
  skins: [{ name: 'Classic', price: 0 }],
};
(() => {
  'use strict';
  const TAU = Math.PI * 2, cl = (v, a, b) => v < a ? a : v > b ? b : v, lp = (a, b, k) => a + (b - a) * k, R = Math.random, rint = (a, b) => Math.floor(a + R() * (b - a + 1));
  const money = v => '$' + Math.round(v).toLocaleString('en-US');
  const JOBS = [
    { n: 'Corner Shop', locks: ['dial'], time: 75, take: 400, col: '#8a9aa8', dn: 2 },
    { n: 'Hotel Room Safe', locks: ['keypad', 'dial'], time: 90, take: 900, col: '#a87a5a', dn: 2 },
    { n: 'Pawn Shop', locks: ['pins', 'dial'], time: 95, take: 1600, col: '#6a8a6a', dn: 3 },
    { n: 'Jewellery Store', locks: ['drill', 'dial'], time: 110, take: 2800, col: '#5ad8ff', dn: 3 },
    { n: 'Casino Cashier', locks: ['keypad', 'pins', 'dial'], time: 120, take: 4500, col: '#ff5a7a', dn: 3 },
    { n: 'Bank Deposit Box', locks: ['drill', 'keypad', 'dial'], time: 130, take: 7000, col: '#ffd23f', dn: 3 },
    { n: 'Art Museum', locks: ['charges', 'pins', 'dial'], time: 140, take: 11000, col: '#c88aff', dn: 3 },
    { n: 'Hilltop Mansion', locks: ['keypad', 'drill', 'pins', 'dial'], time: 160, take: 16000, col: '#e8a040', dn: 3 },
    { n: 'Armoured Truck', locks: ['charges', 'drill', 'dial'], time: 150, take: 23000, col: '#5aa86a', dn: 4 },
    { n: 'Diamond Exchange', locks: ['pins', 'keypad', 'charges', 'dial'], time: 175, take: 32000, col: '#8ae8ff', dn: 4 },
    { n: 'The Mint', locks: ['drill', 'charges', 'keypad', 'pins', 'dial'], time: 200, take: 45000, col: '#ffb347', dn: 4 },
    { n: 'The Impossible Vault', locks: ['keypad', 'drill', 'pins', 'charges', 'dial'], time: 190, take: 70000, col: '#ff4d6d', dn: 5 },
  ];
  const UPG = [
    { k: 'steth', n: 'Stethoscope', max: 3, cost: [500, 2500, 9000], d: 'Hear the dial from further away' },
    { k: 'bit', n: 'Diamond drill bit', max: 3, cost: [700, 3500, 12000], d: 'Drills faster and runs cooler' },
    { k: 'cool', n: 'Cooling spray', max: 2, cost: [600, 5000], d: 'The bit cools down faster' },
    { k: 'charge', n: 'Shaped charges', max: 2, cost: [1500, 9000], d: 'Quieter blasts, wider cover window' },
    { k: 'gloves', n: 'Memory gloves', max: 2, cost: [800, 6000], d: 'The keypad code flashes slower' },
    { k: 'pick', n: 'Pick set', max: 2, cost: [900, 7000], d: 'Pins move slower' },
    { k: 'shoes', n: 'Quiet shoes', max: 3, cost: [600, 4000, 15000], d: 'The alarm rises slower' },
    { k: 'watch', n: 'Heist watch', max: 2, cost: [1000, 8000], d: '+15 seconds on every job' },
  ];
  const KEYS = [['#ff4d4d', 'RED'], ['#3ec5ff', 'BLUE'], ['#5cf28a', 'GREEN'], ['#ffd23f', 'YELLOW'], ['#c88aff', 'PURPLE'], ['#ff9a3a', 'ORANGE']];
  /* ---------- state ---------- */
  let mode = 'board', job = null, L = null, li = 0, cash = 0, take = 0, alarm = 0, tleft = 0, t = 0, up = {}, msgs = [], botT = 0, stun = 0, res = null, stars = {}, done = {}, dialDrag = null, hold = false, sel = 0;
  const SV = () => { const s = K.save; if (!s.sc2) s.sc2 = { cash: 0, up: {}, stars: {}, total: 0 }; return s.sc2; };
  const lv = k => up[k] || 0, say = (s, c = '#fff') => { msgs.push({ s, c, t: 0 }); if (msgs.length > 2) msgs.shift(); };
  const raise = v => { alarm = Math.min(100, alarm + v * (1 - lv('shoes') * .18)); if (alarm >= 100 && mode === 'job') bust(); };
  /* ---------- the locks ---------- */
  function makeLock(k, J) {
    const tier = JOBS.indexOf(J);
    if (k === 'dial') return { k, nums: Array.from({ length: J.dn }, () => rint(3, 97)), at: 0, pos: 0, last: 0, wob: 0 };
    if (k === 'drill') return { k, wx: 420 + R() * 440, wy: 250 + R() * 220, dx: 640, dy: 560, prog: 0, heat: 0, broke: 0, r: 34 - tier, need: 7 + tier * .9 };
    if (k === 'charges') { const socks = Array.from({ length: 7 }, (_, i) => ({ x: 430 + (i % 4) * 140 + (Math.floor(i / 4) ? 70 : 0), y: 280 + Math.floor(i / 4) * 160, weak: false, set: false })); const w = [...socks].sort(() => R() - .5).slice(0, 3); w.forEach(s => s.weak = true); return { k, socks, need: 3, placed: 0, fuse: -1, cover: false, done: false, boom: 0 }; }
    if (k === 'keypad') { const n = 4 + Math.floor(tier / 3), cols = Math.min(6, 4 + Math.floor(tier / 4)); return { k, cols, seq: Array.from({ length: n }, () => rint(0, cols - 1)), show: 1.2, i: 0, flash: -1, ft: 0, misses: 0 }; }
    if (k === 'pins') { const n = 4 + Math.floor(tier / 3); return { k, pins: Array.from({ length: n }, () => ({ ph: R() * TAU, sp: (1.6 + R() * 1.4 + tier * .12) * (1 - lv('pick') * .18), set: false })) }; }
  }
  function startJob(i) {
    job = JOBS[i]; li = 0; msgs = []; L = makeLock(job.locks[0], job); alarm = 0; tleft = job.time + lv('watch') * 15; mode = 'job'; stun = 0; res = null; sel = i;
    K.sfx(180, .3, 'sawtooth', .05, 300);
  }
  function lockDone() {
    K.chime(523, [0, 4, 7, 12]); K.burst(640, 360, ['#ffd23f', '#fff', job.col], 30, 420); K.shake(4);
    li++; if (li >= job.locks.length) return win();
    L = makeLock(job.locks[li], job); say('Next: ' + LOCKNAME[L.k], '#5ad8ff');
  }
  const LOCKNAME = { dial: 'THE DIAL', drill: 'THE PLATE', charges: 'THE HINGES', keypad: 'THE KEYPAD', pins: 'THE TUMBLERS' };
  function win() {
    const T = job.time + lv('watch') * 15, quick = tleft > T * .35, quiet = alarm < 40, st = 1 + (quick ? 1 : 0) + (quiet ? 1 : 0), i = JOBS.indexOf(job);
    const got = Math.round(job.take * (1 + (st - 1) * .15)); cash += got; take += got; const S = SV(); S.total = (S.total || 0) + got; stars[i] = Math.max(stars[i] || 0, st); done[i] = true;
    res = { win: true, got, st, quick, quiet }; mode = 'result'; save();
    K.chime(523, [0, 4, 7, 12, 16]); K.burst(640, 300, ['#ffd23f', '#5cf28a', '#fff'], 70, 560); K.shake(8);
  }
  function bust(why) { res = { win: false, why: why || 'The alarm went off. You ran with nothing.' }; mode = 'result'; K.sfx(140, .8, 'sawtooth', .1, -60); K.shake(12); save(); }
  function save() { const S = SV(); S.cash = cash; S.up = up; S.stars = stars; S.done = done; K.persist(); }
  // the dial: 100 numbers. Feedback only near the right number; nothing tells you where it is
  function dialTurn(d) {
    if (stun > 0) return; const D = L; const old = D.pos; D.pos = ((D.pos + d) % 100 + 100) % 100;
    const steps = Math.abs(d), dir = Math.sign(d);
    for (let s = 1; s <= steps; s++) {
      const n = ((Math.round(old) + dir * s) % 100 + 100) % 100, tgt = D.nums[D.at], dist = Math.min(Math.abs(n - tgt), 100 - Math.abs(n - tgt)), range = 3 + lv('steth') * 3;
      if (dist === 0) { K.sfx(140, .08, 'square', .14); K.noise(.05, .1, 900); D.wob = 1; }
      else if (dist <= range) K.sfx(900 + (range - dist) * 60, .02, 'square', .025 + (range - dist) / range * .05);
      else if (n % 5 === 0) K.sfx(600, .01, 'square', .008);
    }
  }
  function dialSet() {
    const D = L, n = Math.round(D.pos) % 100;
    if (n === D.nums[D.at]) { D.at++; K.chime(659, [0, 7]); say('Number ' + D.at + ' set!', '#5cf28a'); if (D.at >= D.nums.length) lockDone(); }
    else { D.at = 0; raise(10); K.sfx(160, .25, 'sawtooth', .07); say('Wrong! The tumblers reset.', '#ff8a8a'); K.shake(4); }
  }
  function drillStep(dt) {
    const D = L; if (D.broke > 0) { D.broke -= dt; D.heat = Math.max(0, D.heat - dt * 40); return; }
    const on = hold && Math.hypot(D.dx - D.wx, D.dy - D.wy) < D.r + 8;
    if (hold) { D.heat += dt * (26 - lv('bit') * 5); raise(dt * 5); if (on) D.prog += dt * (100 / D.need) * (1 + lv('bit') * .25); if (R() < .5) K.burst(D.dx, D.dy, on ? ['#ffd23f', '#ff9a3a', '#fff'] : ['#888', '#aaa'], 2, 140, { gravity: 300, life: .3, size: 4 }); if (R() < .3) K.noise(.05, .04, on ? 2200 : 900); }
    else D.heat = Math.max(0, D.heat - dt * (22 + lv('cool') * 16));
    if (D.heat >= 100) { D.broke = 3; D.heat = 100; raise(8); say('The bit snapped! Fitting a new one...', '#ff8a8a'); K.sfx(120, .3, 'sawtooth', .1); K.shake(6); hold = false; }
    if (D.prog >= 100) lockDone();
  }
  function chargeTap(x, y) {
    const C = L; if (C.fuse >= 0) return;
    const s = C.socks.find(q => Math.hypot(q.x - x, q.y - y) < 40); if (!s || s.set) return;
    s.set = true; if (s.weak) { C.placed++; K.sfx(500, .06, 'triangle', .06); } else { raise(12); K.sfx(180, .15, 'sawtooth', .06); say('Not a weak point! That one was wasted.', '#ff8a8a'); }
    if (C.placed >= C.need) say('Charges set. LIGHT THE FUSE.', '#ffd23f');
  }
  function chargeStep(dt) {
    const C = L; if (C.boom) { C.boom += dt; if (C.boom > 1.2) lockDone(); return; }
    if (C.fuse < 0) return; C.fuse -= dt; if (R() < .6) K.burst(640, 600, ['#ffd23f', '#ff6a2a'], 1, 60, { life: .3, size: 4 });
    if (C.fuse <= 0) {
      C.boom = .001; K.noise(.6, .3, 200); K.shake(16); K.flash && K.flash('#fff', .4); K.burst(640, 380, ['#ff9a3a', '#ffd23f', '#fff', '#888'], 80, 600);
      raise(22 - lv('charge') * 7);
      if (!C.cover) { stun = 3.5; raise(10); say('You didn\'t take cover! Ears ringing...', '#ff8a8a'); }
      else if (C.coverAt > 1.2 + lv('charge') * .5) say('Took cover way too early: the guard heard you hide.', '#ffb36a'), raise(8);
    }
  }
  function keypadStep(dt) {
    const P = L; if (P.show > 0) { P.show -= dt; if (P.show <= 0) { P.flash = 0; P.ft = 0; } return; }
    if (P.flash >= 0 && P.flash < P.seq.length + 10) { P.ft += dt; const per = .55 + lv('gloves') * .2; if (P.ft > per) { P.ft = 0; P.flash++; if (P.flash < P.seq.length) K.sfx(400 + P.seq[P.flash] * 120, .2, 'triangle', .07); if (P.flash >= P.seq.length) { P.flash = 99; P.i = 0; } } if (P.flash === 0 && P.ft < dt * 1.5) K.sfx(400 + P.seq[0] * 120, .2, 'triangle', .07); }
  }
  function keypadPress(c) {
    const P = L; if (P.flash !== 99 || stun > 0) return;
    K.sfx(400 + c * 120, .15, 'triangle', .07); P.lit = c; P.lt = .2;
    if (P.seq[P.i] === c) { P.i++; if (P.i >= P.seq.length) lockDone(); }
    else { P.misses++; raise(10); K.sfx(160, .25, 'sawtooth', .07); say(P.misses >= 3 ? 'Code scrambled! New code coming...' : 'Wrong! Watch again.', '#ff8a8a'); if (P.misses >= 3) { P.seq = P.seq.map(() => rint(0, P.cols - 1)); P.misses = 0; } P.show = .8; P.flash = -1; P.i = 0; }
  }
  const pinY = (p) => Math.sin(t * p.sp + p.ph);   // -1 .. 1; the shear line is at 0
  function pinTap() {
    const P = L, i = P.pins.findIndex(p => !p.set); if (i < 0 || stun > 0) return;
    const p = P.pins[i], y = pinY(p);
    if (Math.abs(y) < .16) { p.set = true; K.sfx(800 + i * 80, .06, 'square', .06); if (P.pins.every(q => q.set)) lockDone(); }
    else { const back = P.pins.filter(q => q.set).pop(); if (back) back.set = false; raise(7); K.sfx(200, .15, 'sawtooth', .05); say('Slipped! A pin dropped.', '#ff8a8a'); }
  }
  /* ---------- input ---------- */
  const btn = {}, inR = (b, x, y) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  const DIAL = { x: 640, y: 380, r: 170 };
  let lastAng = null;
  GAME.down = (x, y) => {
    K.audio && K.audio();
    for (const k in btn) if (inR(btn[k], x, y)) return press(k, x, y);
    if (mode !== 'job' || stun > 0) return;
    if (L.k === 'dial' && Math.hypot(x - DIAL.x, y - DIAL.y) < DIAL.r + 40) { dialDrag = true; lastAng = Math.atan2(y - DIAL.y, x - DIAL.x); }
    if (L.k === 'drill') { L.dx = x; L.dy = y; dialDrag = 'drill'; }
    if (L.k === 'charges') chargeTap(x, y);
    if (L.k === 'pins' && y > 160 && y < 560) pinTap();
  };
  GAME.move = (x, y) => {
    if (mode !== 'job') return;
    if (dialDrag === true && L.k === 'dial') { const a = Math.atan2(y - DIAL.y, x - DIAL.x); let da = a - lastAng; if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU; lastAng = a; const steps = da / TAU * 100; L.acc = (L.acc || 0) + steps; const n = Math.trunc(L.acc); if (n) { L.acc -= n; dialTurn(n); } }
    if (dialDrag === 'drill' && L.k === 'drill') { L.dx = cl(x, 360, 920); L.dy = cl(y, 200, 540); }
  };
  GAME.up = () => { dialDrag = null; if (!btn.__holdKey) hold = false; };
  GAME.key = (c, d) => {
    if (mode !== 'job') { if (d && c === 'Enter') { if (mode === 'result') press('back'); else if (mode === 'board') press('job' + sel); } return; }
    if (L.k === 'drill' && c === 'Space') { hold = d; btn.__holdKey = d; return; }
    if (!d) return;
    if (L.k === 'dial') { if (c === 'KeyA' || c === 'ArrowLeft') dialTurn(-1); if (c === 'KeyD' || c === 'ArrowRight') dialTurn(1); if (c === 'KeyW' || c === 'ArrowUp') dialTurn(5); if (c === 'KeyS' || c === 'ArrowDown') dialTurn(-5); if (c === 'Space' || c === 'Enter') dialSet(); }
    if (L.k === 'drill') { const k = 14; if (c === 'ArrowLeft' || c === 'KeyA') L.dx -= k; if (c === 'ArrowRight' || c === 'KeyD') L.dx += k; if (c === 'ArrowUp' || c === 'KeyW') L.dy -= k; if (c === 'ArrowDown' || c === 'KeyS') L.dy += k; }
    if (L.k === 'keypad') { const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5 }[c]; if (n != null && n < L.cols) keypadPress(n); }
    if (L.k === 'pins' && (c === 'Space' || c === 'Enter')) pinTap();
    if (L.k === 'charges') { if (c === 'KeyF' && L.placed >= L.need && L.fuse < 0) press('fuse'); if (c === 'Space' && L.fuse >= 0) press('cover'); }
  };
  function press(k, x, y) {
    if (k.startsWith('job')) { const i = +k.slice(3); if (i > 0 && !done[i - 1]) { say('Crack the job before it first', '#ff8a8a'); return; } return startJob(i); }
    if (k.startsWith('up')) { const u = UPG[+k.slice(2)], l = lv(u.k); if (l >= u.max) return; if (cash < u.cost[l]) { say('Not enough cash', '#ff8a8a'); return; } cash -= u.cost[l]; up[u.k] = l + 1; K.chime(660, [0, 4, 7]); save(); return; }
    if (k === 'back') { mode = 'board'; return; }
    if (k === 'quit') return bust('You walked away from the job.');
    if (k === 'end') { K.score = Math.round(SV().total || take); K.over({ title: 'Retired with the loot', text: `Total take ${money(K.score)}.` }); return; }
    if (mode !== 'job' || stun > 0) return;
    if (k === 'set' && L.k === 'dial') return dialSet();
    if (k === 'ccw' && L.k === 'dial') return dialTurn(-1);
    if (k === 'cw' && L.k === 'dial') return dialTurn(1);
    if (k === 'drillbtn' && L.k === 'drill') { hold = true; return; }
    if (k === 'fuse' && L.k === 'charges' && L.placed >= L.need && L.fuse < 0) { L.fuse = 3 + R() * 1.5; L.fuse0 = L.fuse; K.sfx(300, .4, 'sawtooth', .05, 400); return; }
    if (k === 'cover' && L.k === 'charges' && L.fuse >= 0 && !L.cover) { L.cover = true; L.coverAt = L.fuse; K.sfx(400, .1, 'triangle', .05); return; }
    if (k.startsWith('key') && L.k === 'keypad') return keypadPress(+k.slice(3));
    if ((k === 'pintap' || k === 'pinbtn') && L.k === 'pins') return pinTap();
  }
  /* ---------- kit hooks ---------- */
  GAME.reset = () => {
    const S = SV(); cash = S.cash || 0; up = { ...(S.up || {}) }; stars = { ...(S.stars || {}) }; done = { ...(S.done || {}) }; take = 0; mode = 'board'; job = null; L = null; msgs = []; hold = false;
    sel = Math.min(JOBS.length - 1, JOBS.findIndex((j, i) => !done[i]) < 0 ? JOBS.length - 1 : JOBS.findIndex((j, i) => !done[i]));
    if (K.bot) { cash = 0; up = {}; done = {}; startJob(rint(3, 7)); }
  };
  GAME.update = dt => {
    t += dt; for (const m of msgs) m.t += dt; msgs = msgs.filter(m => m.t < 2.4);
    if (mode !== 'job') return;
    if (stun > 0) stun -= dt;
    tleft -= dt; if (tleft <= 0) return bust('Out of time. The guards came round.');
    if (tleft < job.time * .5) raise(dt * .6);
    if (L.k === 'dial' && L.wob > 0) L.wob = Math.max(0, L.wob - dt * 4);
    if (L.k === 'drill') drillStep(dt);
    if (L.k === 'charges') chargeStep(dt);
    if (L.k === 'keypad') { keypadStep(dt); if (L.lt > 0) L.lt -= dt; }
  };
  // the attract demo: a decent safecracker at work
  GAME.bot = dt => {
    if (mode === 'result') { if ((botT -= dt) <= 0) { startJob(rint(3, 9)); } return; }
    if (mode !== 'job' || stun > 0) return;
    if ((botT -= dt) > 0) return; botT = .05;
    if (L.k === 'dial') { const tgt = L.nums[L.at], n = Math.round(L.pos) % 100, d = ((tgt - n) % 100 + 100) % 100; if (d === 0) { botT = .5; dialSet(); } else dialTurn(d > 50 ? -1 : 1); }
    if (L.k === 'drill') { L.dx += (L.wx - L.dx) * .2; L.dy += (L.wy - L.dy) * .2; hold = L.heat < 80 && !L.broke && Math.hypot(L.dx - L.wx, L.dy - L.wy) < 20 ? true : L.heat > 92 ? false : hold; }
    if (L.k === 'charges') { if (L.placed < L.need) { botT = .5; const s = L.socks.find(q => q.weak && !q.set); if (s) chargeTap(s.x, s.y); } else if (L.fuse < 0 && !L.boom) { botT = .4; press('fuse'); } else if (L.fuse >= 0 && L.fuse < .7 && !L.cover) press('cover'); }
    if (L.k === 'keypad' && L.flash === 99) { botT = .35; keypadPress(L.seq[L.i]); }
    if (L.k === 'pins') { const p = L.pins.find(q => !q.set); if (p && Math.abs(pinY(p)) < .08) pinTap(); }
    if (mode === 'result') botT = 2.5;
  };
  /* ---------- drawing ---------- */
  function tx(g, s, x, y, font, c, al = 'center', st) { g.font = font; g.textAlign = al; g.textBaseline = 'middle'; if (st) { g.lineWidth = st; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText(s, x, y); } g.fillStyle = c; g.fillText(s, x, y); }
  const F = (px, w = 800) => `${w} ${px}px Nunito, sans-serif`, D = px => `${px}px "Black Ops One", sans-serif`;
  function rr(g, x, y, w, h, r, fill, stroke, lw = 2) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
  function button(g, k, x, y, w, h, label, col, sub, tc = '#0e1116') { btn[k] = { x, y, w, h }; g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.roundRect(x, y + 5, w, h, 12); g.fill(); rr(g, x, y, w, h, 12, col); tx(g, label, x + w / 2, y + h / 2 + (sub ? -8 : 2), D(h > 64 ? 26 : 19), tc); if (sub) tx(g, sub, x + w / 2, y + h / 2 + 16, F(12), tc); }
  function bg(g) { const v = K.view, gr = g.createLinearGradient(0, v.y0, 0, v.y1); gr.addColorStop(0, '#1a2028'); gr.addColorStop(1, '#0a0c10'); g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); g.strokeStyle = 'rgba(255,255,255,.025)'; for (let x = -40; x < 1320; x += 40) { g.beginPath(); g.moveTo(x, v.y0); g.lineTo(x, v.y1); g.stroke(); } }
  function safeBody(g, col) {   // the safe door behind every lock
    rr(g, 300, 120, 680, 500, 26, '#2a3038', '#4a5260', 6); rr(g, 330, 150, 620, 440, 18, '#363d48', 'rgba(0,0,0,.4)', 3);
    for (const [x, y] of [[350, 170], [930, 170], [350, 570], [930, 570]]) { g.fillStyle = '#5a6270'; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); }
    g.fillStyle = col; g.fillRect(330, 150, 620, 6);
  }
  function hud(g) {
    rr(g, 20, 14, 1240, 56, 14, 'rgba(0,0,0,.55)');
    tx(g, job.n.toUpperCase(), 40, 42, D(24), job.col, 'left');
    const T = job.time + lv('watch') * 15; tx(g, Math.ceil(tleft) + 's', 470, 42, D(30), tleft < 20 ? '#ff4d4d' : '#fff');
    // the locks still to go
    job.locks.forEach((k, i) => { const x = 560 + i * 62, c = i < li ? '#5cf28a' : i === li ? '#ffd23f' : 'rgba(255,255,255,.2)'; rr(g, x, 22, 54, 40, 8, null, c, 3); tx(g, { dial: '◎', drill: '⚙', charges: '✸', keypad: '▦', pins: '|||' }[k], x + 27, 43, D(20), c); });
    tx(g, 'ALARM', 900, 42, D(18), alarm > 70 ? '#ff4d4d' : '#cfd8e0', 'left'); rr(g, 980, 32, 260, 20, 10, 'rgba(255,255,255,.12)'); rr(g, 980, 32, 260 * alarm / 100, 20, 10, alarm > 70 ? (Math.sin(t * 12) > 0 ? '#ff4d4d' : '#ff9a3a') : alarm > 40 ? '#ffb347' : '#5cf28a');
    if (alarm > 70) { g.fillStyle = `rgba(255,0,0,${.06 + Math.sin(t * 10) * .04})`; g.fillRect(K.view.x0, K.view.y0, K.view.x1 - K.view.x0, K.view.y1 - K.view.y0); }
  }
  function drawDial(g) {
    const Dd = L, a = -Dd.pos / 100 * TAU - Math.PI / 2, wob = Math.sin(t * 60) * Dd.wob * .02;
    safeBody(g, job.col);
    g.save(); g.translate(DIAL.x, DIAL.y);
    g.fillStyle = '#1a1e24'; g.beginPath(); g.arc(0, 0, DIAL.r + 22, 0, TAU); g.fill();
    g.rotate(a + wob);
    const gr = g.createRadialGradient(-40, -40, 20, 0, 0, DIAL.r); gr.addColorStop(0, '#c8ccd4'); gr.addColorStop(1, '#6a707a'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, DIAL.r, 0, TAU); g.fill();
    for (let n = 0; n < 100; n++) { const an = n / 100 * TAU, big = n % 10 === 0, mid = n % 5 === 0; g.strokeStyle = '#1a1e24'; g.lineWidth = big ? 3 : 1.5; g.beginPath(); g.moveTo(Math.cos(an) * (DIAL.r - (big ? 26 : mid ? 18 : 12)), Math.sin(an) * (DIAL.r - (big ? 26 : mid ? 18 : 12))); g.lineTo(Math.cos(an) * (DIAL.r - 4), Math.sin(an) * (DIAL.r - 4)); g.stroke(); if (big) { g.save(); g.translate(Math.cos(an) * (DIAL.r - 44), Math.sin(an) * (DIAL.r - 44)); g.rotate(an + Math.PI / 2); tx(g, String(n), 0, 0, D(20), '#1a1e24'); g.restore(); } }
    g.fillStyle = '#3a404a'; g.beginPath(); g.arc(0, 0, 54, 0, TAU); g.fill(); g.fillStyle = '#4a525e'; for (let k = 0; k < 12; k++) { g.save(); g.rotate(k / 12 * TAU); g.fillRect(-6, -60, 12, 14); g.restore(); }
    g.restore();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(DIAL.x - 12, DIAL.y - DIAL.r - 34); g.lineTo(DIAL.x + 12, DIAL.y - DIAL.r - 34); g.lineTo(DIAL.x, DIAL.y - DIAL.r - 12); g.fill();
    tx(g, String(Math.round(Dd.pos) % 100).padStart(2, '0'), DIAL.x, DIAL.y + 2, D(40), '#ffd23f');
    // the stethoscope: it only stirs when you are close; it never says which way
    const tgt = Dd.nums[Dd.at], n = Math.round(Dd.pos) % 100, dist = Math.min(Math.abs(n - tgt), 100 - Math.abs(n - tgt)), range = 3 + lv('steth') * 3, k = dist <= range ? 1 - dist / (range + 1) : 0;
    rr(g, 1000, 200, 240, 200, 16, 'rgba(0,0,0,.55)', '#4a5260', 2); tx(g, 'STETHOSCOPE', 1120, 226, D(18), '#9fb0c0');
    g.strokeStyle = k > .9 ? '#5cf28a' : '#5ad8ff'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= 200; x += 4) { const y = 320 + Math.sin(x * .12 + t * 18) * (2 + k * 40) * Math.sin(x / 200 * Math.PI) + (R() - .5) * 2; x ? g.lineTo(1020 + x, y) : g.moveTo(1020, y); } g.stroke();
    tx(g, k > .95 ? 'THUNK!' : k > 0 ? 'something...' : 'nothing', 1120, 380, F(15), k > .95 ? '#5cf28a' : '#9fb0c0');
    // which number you're on
    rr(g, 40, 200, 230, 200, 16, 'rgba(0,0,0,.55)', '#4a5260', 2); tx(g, 'COMBINATION', 155, 226, D(18), '#9fb0c0');
    Dd.nums.forEach((_, i) => { const x = 155 - (Dd.nums.length - 1) * 26 + i * 52; rr(g, x - 22, 260, 44, 56, 8, i < Dd.at ? '#1f4a34' : i === Dd.at ? '#3a3420' : 'rgba(255,255,255,.06)', i === Dd.at ? '#ffd23f' : 'rgba(255,255,255,.15)', 2); tx(g, i < Dd.at ? String(Dd.nums[i]).padStart(2, '0') : '??', x, 288, D(22), i < Dd.at ? '#5cf28a' : '#9fb0c0'); });
    tx(g, 'Drag the dial, or A / D', 155, 350, F(13), '#9fb0c0'); tx(g, 'Listen for the THUNK', 155, 372, F(13), '#9fb0c0');
    button(g, 'ccw', 360, 640, 120, 64, '◀', '#4a5260', null, '#fff'); button(g, 'set', 520, 630, 240, 80, 'SET NUMBER', '#ffd23f', 'Space'); button(g, 'cw', 800, 640, 120, 64, '▶', '#4a5260', null, '#fff');
  }
  function drawDrill(g) {
    const Dr = L; safeBody(g, job.col);
    // the plate, with a faint scratch where it is weak
    rr(g, 360, 200, 560, 340, 10, '#5a626e', '#2a3038', 4); g.fillStyle = 'rgba(0,0,0,.15)'; for (let k = 0; k < 14; k++) g.fillRect(360, 210 + k * 24, 560, 2);
    for (const [x, y] of [[380, 220], [900, 220], [380, 520], [900, 520]]) { g.fillStyle = '#3a404a'; g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(Dr.wx - 14, Dr.wy - 10); g.lineTo(Dr.wx + 12, Dr.wy + 12); g.moveTo(Dr.wx + 12, Dr.wy - 12); g.lineTo(Dr.wx - 10, Dr.wy + 14); g.stroke();
    if (Dr.prog > 0) { g.fillStyle = '#1a1010'; g.beginPath(); g.arc(Dr.wx, Dr.wy, 6 + Dr.prog / 100 * 22, 0, TAU); g.fill(); g.strokeStyle = '#ff9a3a'; g.lineWidth = 2; g.stroke(); }
    // the drill
    const jit = hold && !Dr.broke ? (R() - .5) * 4 : 0;
    g.save(); g.translate(Dr.dx + jit, Dr.dy + jit); g.fillStyle = Dr.broke ? '#888' : '#ffd23f'; g.fillRect(-14, 30, 28, 70); g.fillStyle = '#2a2a2a'; g.fillRect(-20, 90, 40, 26); g.fillStyle = '#c8ccd4'; g.save(); g.rotate(hold ? t * 40 : 0); g.fillRect(-3, -2, 6, 34); g.restore(); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5; g.beginPath(); g.arc(Dr.dx, Dr.dy, 10, 0, TAU); g.stroke();
    // heat and progress
    tx(g, 'HEAT', 60, 230, D(18), '#ff9a3a', 'left'); rr(g, 60, 250, 40, 260, 10, 'rgba(255,255,255,.1)'); rr(g, 60, 250 + 260 * (1 - Dr.heat / 100), 40, 260 * Dr.heat / 100, 10, Dr.heat > 80 ? (Math.sin(t * 16) > 0 ? '#ff4d4d' : '#ff9a3a') : '#ff9a3a');
    tx(g, 'THROUGH', 1120, 230, D(18), '#5cf28a'); rr(g, 1100, 250, 40, 260, 10, 'rgba(255,255,255,.1)'); rr(g, 1100, 250 + 260 * (1 - Dr.prog / 100), 40, 260 * Dr.prog / 100, 10, '#5cf28a');
    if (Dr.broke > 0) tx(g, 'NEW BIT: ' + Dr.broke.toFixed(1) + 's', 640, 580, D(26), '#ff8a8a', 'center', 5);
    else tx(g, hold && Math.hypot(Dr.dx - Dr.wx, Dr.dy - Dr.wy) > Dr.r + 8 ? 'Skating on hard steel: find the weak spot' : 'Drag the drill onto the scratch, then hold DRILL (Space)', 640, 580, F(16), '#cfd8e0');
    button(g, 'drillbtn', 520, 620, 240, 84, 'HOLD TO DRILL', hold ? '#ff9a3a' : '#ffd23f', 'Space');
  }
  function drawCharges(g) {
    const C = L; safeBody(g, job.col);
    if (C.boom) { g.globalAlpha = Math.max(0, 1 - C.boom); g.fillStyle = '#fff'; g.fillRect(K.view.x0, K.view.y0, K.view.x1 - K.view.x0, K.view.y1 - K.view.y0); g.globalAlpha = 1; tx(g, 'BOOM!', 640, 380, D(110), '#ff9a3a', 'center', 10); return; }
    tx(g, 'Find the 3 weak points: they hum faintly. Then light the fuse and take cover in time.', 640, 186, F(16), '#cfd8e0');
    for (const s of C.socks) {
      const hum = s.weak && !s.set ? .25 + Math.sin(t * 5 + s.x) * .12 : 0;
      g.fillStyle = `rgba(255,210,63,${hum})`; g.beginPath(); g.arc(s.x, s.y, 44, 0, TAU); g.fill();
      g.fillStyle = '#20252c'; g.beginPath(); g.arc(s.x, s.y, 30, 0, TAU); g.fill(); g.strokeStyle = '#5a626e'; g.lineWidth = 4; g.stroke();
      if (s.set) { g.fillStyle = s.weak ? '#e8343a' : '#5a3a3a'; g.fillRect(s.x - 12, s.y - 22, 24, 44); g.fillStyle = '#ffd23f'; g.fillRect(s.x - 12, s.y - 6, 24, 6); }
    }
    tx(g, `${C.placed}/${C.need} placed`, 640, 520, D(24), C.placed >= C.need ? '#5cf28a' : '#ffd23f');
    if (C.fuse >= 0) {
      const k = C.fuse / C.fuse0; rr(g, 440, 548, 400, 22, 11, 'rgba(255,255,255,.12)'); rr(g, 440, 548, 400 * k, 22, 11, '#ff6a2a'); g.fillStyle = '#fff'; g.beginPath(); g.arc(440 + 400 * k, 559, 9 + R() * 4, 0, TAU); g.fill();
      if (!C.cover) button(g, 'cover', 470, 610, 340, 92, 'TAKE COVER!', Math.sin(t * 14) > 0 ? '#ff4d4d' : '#ffd23f', 'Space · not too early');
      else tx(g, 'Covering your ears...', 640, 650, D(28), '#ffd23f', 'center', 5);
    } else if (C.placed >= C.need) button(g, 'fuse', 470, 610, 340, 92, 'LIGHT THE FUSE', '#ff9a3a', 'F');
  }
  function drawKeypad(g) {
    const P = L; safeBody(g, job.col);
    rr(g, 430, 180, 420, 70, 12, '#0a1a10', '#2a4a30', 3);
    const msg = P.show > 0 ? 'WATCH THE CODE...' : P.flash >= 0 && P.flash < P.seq.length ? 'WATCH...' : `ENTER CODE ${'•'.repeat(P.i)}${'○'.repeat(P.seq.length - P.i)}`;
    tx(g, msg, 640, 216, D(26), '#5cf28a');
    for (let i = 0; i < P.cols; i++) {
      const [c, nm] = KEYS[i], x = 640 + (i - (P.cols - 1) / 2) * 110, y = 380, lit = (P.flash >= 0 && P.flash < P.seq.length && P.seq[P.flash] === i && P.ft < (.55 + lv('gloves') * .2) * .7) || (P.lit === i && P.lt > 0);
      const b = { x: x - 46, y: y - 60, w: 92, h: 120 }; btn['key' + i] = b;
      rr(g, b.x, b.y + 6, b.w, b.h, 14, 'rgba(0,0,0,.5)'); rr(g, b.x, b.y, b.w, b.h, 14, lit ? '#fff' : c, lit ? c : 'rgba(0,0,0,.3)', lit ? 8 : 2);
      if (lit) { g.fillStyle = c + '66'; g.beginPath(); g.arc(x, y, 90, 0, TAU); g.fill(); }
      tx(g, String(i + 1), x, y - 20, D(28), lit ? c : 'rgba(0,0,0,.45)'); tx(g, nm, x, y + 30, F(13, 900), lit ? c : 'rgba(0,0,0,.55)');
    }
    tx(g, P.seq.length + ' colours · keys 1-' + P.cols + ' or tap · 3 mistakes and the code changes', 640, 530, F(15), '#cfd8e0');
  }
  function drawPins(g) {
    const P = L; safeBody(g, job.col);
    rr(g, 380, 190, 520, 350, 16, '#20252c', '#5a626e', 4);
    g.fillStyle = '#5cf28a'; g.fillRect(390, 364, 500, 4); tx(g, 'SHEAR LINE', 1000, 366, D(16), '#5cf28a');
    const n = P.pins.length, cur = P.pins.findIndex(p => !p.set);
    P.pins.forEach((p, i) => { const x = 640 + (i - (n - 1) / 2) * (480 / n), y = p.set ? 0 : pinY(p); rr(g, x - 18, 210, 36, 310, 8, i === cur ? 'rgba(255,210,63,.12)' : 'rgba(255,255,255,.04)'); const py = 366 + y * 110; rr(g, x - 14, py - 70, 28, 70, 6, p.set ? '#5cf28a' : '#c8a050'); rr(g, x - 14, py + 2, 28, 50, 6, '#9aa0aa'); if (i === cur) tx(g, '▼', x, 196, D(18), '#ffd23f'); });
    btn.pintap = { x: 380, y: 190, w: 520, h: 350 };
    tx(g, 'Tap (or Space) when the gold pin\'s bottom sits on the green line. A slip drops one back.', 640, 580, F(16), '#cfd8e0');
    button(g, 'pinbtn', 520, 620, 240, 80, 'SET PIN', '#ffd23f', 'Space');
  }
  function drawBoard(g) {
    bg(g);
    tx(g, 'SAFECRACKER', 640, 56, D(56), '#ffd23f', 'center', 8); tx(g, `Cash ${money(cash)} · Total take ${money(SV().total || 0)}`, 640, 100, F(18), '#cfd8e0');
    JOBS.forEach((J, i) => { const x = 40 + (i % 4) * 200, y = 130 + Math.floor(i / 4) * 150, open = i === 0 || done[i - 1], b = { x, y, w: 186, h: 136 }; if (open) btn['job' + i] = b;
      rr(g, x, y, 186, 136, 14, open ? (sel === i ? '#2a3040' : '#1c222c') : '#14181e', open ? J.col : 'rgba(255,255,255,.08)', sel === i ? 4 : 2);
      tx(g, J.n.toUpperCase(), x + 93, y + 26, D(J.n.length > 14 ? 14 : 17), open ? '#fff' : '#555');
      tx(g, J.locks.map(k => ({ dial: '◎', drill: '⚙', charges: '✸', keypad: '▦', pins: '|||' }[k])).join(' '), x + 93, y + 60, D(18), open ? J.col : '#444');
      tx(g, open ? money(J.take) : 'LOCKED', x + 93, y + 92, D(20), open ? '#5cf28a' : '#555'); tx(g, '★'.repeat(stars[i] || 0) + '☆'.repeat(3 - (stars[i] || 0)), x + 93, y + 118, D(18), '#ffd23f'); });
    // the tool shop
    rr(g, 850, 130, 400, 456, 16, 'rgba(0,0,0,.4)', '#4a5260', 2); tx(g, 'TOOLS', 1050, 156, D(26), '#5ad8ff');
    UPG.forEach((u, i) => { const l = lv(u.k), max = l >= u.max, c = max ? 0 : u.cost[l], b = { x: 862, y: 178 + i * 50, w: 376, h: 44 }; btn['up' + i] = b;
      rr(g, b.x, b.y, b.w, b.h, 10, max ? 'rgba(92,242,138,.12)' : 'rgba(255,255,255,.05)', !max && cash >= c ? '#ffd23f' : 'rgba(255,255,255,.1)', 2);
      tx(g, u.n, b.x + 12, b.y + 15, D(16), '#fff', 'left'); tx(g, u.d, b.x + 12, b.y + 33, F(11), '#9fb0c0', 'left'); tx(g, max ? 'MAX' : money(c), b.x + b.w - 12, b.y + 22, D(17), max ? '#5cf28a' : cash >= c ? '#ffd23f' : '#ff8a8a', 'right');
      for (let k = 0; k < u.max; k++) { g.fillStyle = k < l ? '#5cf28a' : 'rgba(255,255,255,.15)'; g.fillRect(b.x + 230 + k * 16, b.y + 14, 12, 6); } });
    button(g, 'job' + sel, 40, 610, 600, 84, `CRACK: ${JOBS[sel].n.toUpperCase()}`, '#ffd23f', `${JOBS[sel].time + lv('watch') * 15}s · ${JOBS[sel].locks.length} locks`);
    button(g, 'end', 660, 620, 170, 64, 'RETIRE', 'rgba(255,255,255,.15)', 'Bank the take', '#fff');
  }
  function drawResult(g) {
    bg(g); const r = res;
    rr(g, 290, 120, 700, 440, 22, 'rgba(0,0,0,.6)', r.win ? '#5cf28a' : '#ff4d4d', 4);
    tx(g, r.win ? 'CRACKED!' : 'BUSTED', 640, 200, D(80), r.win ? '#5cf28a' : '#ff4d4d', 'center', 8);
    if (r.win) { tx(g, '★'.repeat(r.st) + '☆'.repeat(3 - r.st), 640, 282, D(54), '#ffd23f'); tx(g, `${r.quick ? '✓' : '✗'} Fast   ${r.quiet ? '✓' : '✗'} Quiet (alarm under 40%)`, 640, 340, F(19), '#cfd8e0'); tx(g, '+' + money(r.got), 640, 410, D(48), '#5cf28a'); }
    else { tx(g, r.why, 640, 300, F(20), '#cfd8e0'); tx(g, 'Better tools make it easier.', 640, 340, F(17), '#9fb0c0'); }
    button(g, 'back', 490, 470, 300, 74, 'BACK TO THE BOARD', '#ffd23f');
  }
  GAME.draw = g => {
    for (const k in btn) if (k !== '__holdKey') delete btn[k];
    if (mode === 'board') drawBoard(g);
    else if (mode === 'result') drawResult(g);
    else if (mode === 'job') {
      bg(g); hud(g);
      if (L.k === 'dial') drawDial(g); else if (L.k === 'drill') drawDrill(g); else if (L.k === 'charges') drawCharges(g); else if (L.k === 'keypad') drawKeypad(g); else drawPins(g);
      tx(g, LOCKNAME[L.k] + ` (${li + 1}/${job.locks.length})`, 640, 100, D(24), '#ffd23f');
      if (stun > 0) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(K.view.x0, K.view.y0, K.view.x1 - K.view.x0, K.view.y1 - K.view.y0); tx(g, 'EARS RINGING... ' + stun.toFixed(1), 640, 360, D(40), '#ff4d4d', 'center', 6); }
      button(g, 'quit', 1150, 650, 110, 46, 'RUN', 'rgba(255,255,255,.15)', null, '#fff');
    }
    msgs.forEach((m, i) => { g.globalAlpha = Math.min(1, (2.4 - m.t) * 2); rr(g, 400, 130 + i * 34, 480, 30, 10, 'rgba(0,0,0,.7)'); tx(g, m.s, 640, 145 + i * 34, D(19), m.c); g.globalAlpha = 1; });
  };
  GAME.pose = () => { startJob(5); L.at = 1; L.pos = 37; li = 2; alarm = 34; };
  GAME.test = { st: () => ({ mode, job: job && job.n, li, lock: L && L.k, alarm: Math.round(alarm), tleft: Math.round(tleft), cash, stars, done, res, L: L && { at: L.at, nums: L.nums, pos: L.pos, prog: L.prog, heat: L.heat, placed: L.placed, fuse: L.fuse, i: L.i, flash: L.flash, seq: L.seq, pins: L.pins && L.pins.map(p => p.set) } }), press, dialTurn, dialSet, startJob, L: () => L, setCash: v => { cash = v; }, pinY };
})();
