/* Lemonade Empire: an idle tycoon. Squeeze lemons, buy businesses, hire managers to run them, and franchise for
   Golden Lemons that boost every business forever. Progress is saved, and managers keep earning while you're away. */
const GAME = {
  id: 'lemonade-empire', title: 'Lemonade Empire', tagline: 'From one lemonade stand to a soda empire.',
  font: 'Fredoka One', accent: '#ffd23f', accent2: '#5fd36a', bg: '#7fd3ff', noHud: true, scoreLabel: 'Golden Lemons',
  how: ['Tap the big lemon to squeeze it for cash.', 'Buy businesses, tap them to run, and hire managers to run them for you.', 'Franchise to start over with Golden Lemons: +10% income each, forever.'],
  skins: [
    { name: 'Sunny', price: 0, c: ['#ffd23f', '#ff6b6b'] }, { name: 'Mint', price: 60, c: ['#7dffb0', '#2ab06a'] }, { name: 'Berry', price: 150, c: ['#ff7ae0', '#a23bff'] },
    { name: 'Ocean', price: 250, c: ['#7cc8ff', '#2a6ad2'] }, { name: 'Sunset', price: 400, c: ['#ffb347', '#ff4d6a'] }, { name: 'Royal', price: 700, c: ['#ffe36e', '#7a2bd6'] },
  ],
};
(() => {
  const BIZ = [
    { n: 'Lemonade Stand', i: '🍋', cost: 4, rev: 1, t: .7 },
    { n: 'Juice Cart', i: '🧃', cost: 60, rev: 60, t: 3 },
    { n: 'Smoothie Bar', i: '🥤', cost: 720, rev: 540, t: 6 },
    { n: 'Soda Truck', i: '🚚', cost: 8640, rev: 4320, t: 12 },
    { n: 'Bottling Plant', i: '🏭', cost: 103680, rev: 51840, t: 24 },
    { n: 'Soda Factory', i: '🏗️', cost: 1244160, rev: 622080, t: 96 },
    { n: 'Global Brand', i: '🌍', cost: 14929920, rev: 7464960, t: 384 },
  ];
  const MGR = BIZ.map((b, i) => b.cost * (i === 0 ? 250 : 120));
  const MILES = [10, 25, 50, 100, 200, 300, 400];
  let S, prog, pops, tapScale, buyN, saveT, away, hover, walkers, flash;
  const fmt = n => { if (n < 1000) return n < 10 ? n.toFixed(n % 1 ? 2 : 0) : Math.floor(n).toString(); const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc']; let i = -1; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; } return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + u[i]; };
  const mult = i => { let m = 1; for (const ms of MILES) if (S.own[i] >= ms) m *= 2; return m * (1 + S.gold * .1) * (S.boost > 0 ? 2 : 1); };
  const speed = i => Math.pow(.5, [25, 50, 100].filter(ms => S.own[i] >= ms).length);  // runs get faster at 25, 50 and 100 owned
  const cycle = i => BIZ[i].t * speed(i);
  const revenue = i => BIZ[i].rev * S.own[i] * mult(i);
  const costOf = (i, n) => { const c = BIZ[i].cost * Math.pow(1.15, S.own[i]); return c * (Math.pow(1.15, n) - 1) / .15; };
  const maxBuy = i => { let n = 0; while (n < 1000 && costOf(i, n + 1) <= S.cash) n++; return n; };
  const perSec = () => BIZ.reduce((a, b, i) => a + (S.mgr[i] && S.own[i] ? revenue(i) / cycle(i) : 0), 0);
  const goldFor = () => Math.floor(Math.sqrt(S.total / 1e9) * 2) - S.goldEarned;
  function fresh() { return { cash: 0, total: 0, own: BIZ.map((_, i) => i === 0 ? 1 : 0), mgr: BIZ.map(() => false), gold: 0, goldEarned: 0, boost: 0, t: Date.now(), runs: 0 }; }
  GAME.reset = () => {
    prog = BIZ.map(() => 0); pops = []; tapScale = 1; buyN = 1; saveT = 0; away = null; hover = null; flash = 0;
    walkers = Array.from({ length: 6 }, () => ({ x: Math.random() * 520, sp: K.rand(30, 70) * (Math.random() < .5 ? 1 : -1), c: `hsl(${K.irand(0, 360)},60%,55%)` }));
    if (K.bot) { S = fresh(); S.cash = 5e5; S.own = [40, 22, 12, 6, 2, 0, 0]; S.mgr = [true, true, true, false, false, false, false]; return; }
    S = Object.assign(fresh(), K.save.ty || {});
    // money made while away (managers only, at half speed, up to 8 hours)
    const secs = Math.min(8 * 3600, (Date.now() - (S.t || Date.now())) / 1000), earned = perSec() * secs * .5;
    if (secs > 60 && earned > 0) { S.cash += earned; S.total += earned; away = { secs, earned }; }
  };
  function persist() { if (K.bot) return; S.t = Date.now(); K.save.ty = S; K.save.best = Math.max(K.save.best || 0, S.gold); K.persist(); }
  function earn(v, x, y) { S.cash += v; S.total += v; if (x !== undefined) pops.push({ x, y, t: 0, s: '+$' + fmt(v) }); }
  function run(i) { if (S.own[i] && prog[i] === 0) { prog[i] = .0001; if (!K.bot) K.sfx(520 + i * 60, .05, 'triangle', .05); } }
  function buy(i) {
    const n = buyN === 'max' ? Math.max(1, maxBuy(i)) : buyN, c = costOf(i, n); if (c > S.cash) { K.sfx(160, .1, 'square', .05); return; }
    const before = S.own[i]; S.cash -= c; S.own[i] += n; K.sfx(880, .06, 'square', .05); K.sfx(1320, .08, 'square', .04, 0, .05);
    for (const ms of MILES) if (before < ms && S.own[i] >= ms) { K.toast(`${BIZ[i].n} x${ms}: profits doubled!`); K.chime(523); if (!K.bot) K.coin(1); }
    if (before === 0) { K.toast(`New: ${BIZ[i].n}!`); if (!K.bot) K.coin(2); }
    persist();
  }
  function hire(i) { if (S.mgr[i] || S.cash < MGR[i] || !S.own[i]) return; S.cash -= MGR[i]; S.mgr[i] = true; K.chime(660, [0, 4, 7]); K.toast(`Manager hired: ${BIZ[i].n} runs itself now`); if (!K.bot) K.coin(2); persist(); }
  function franchise() {
    const g = goldFor(); if (g < 1) return;
    const runs = (S.runs || 0) + 1, gold = S.gold + g; S = fresh(); S.gold = gold; S.runs = runs;
    prog = BIZ.map(() => 0); K.flash('#fff', .8); K.chime(392, [0, 4, 7, 12, 16, 19]); K.toast(`Franchised! ${S.gold} Golden Lemons: +${S.gold * 10}% income`); if (!K.bot) K.coin(10); persist();
  }
  /* ---------- layout ---------- */
  const ROW = i => ({ x: 548, y: 108 + i * 78, w: 718, h: 70 });
  const LEMON = { x: 260, y: 420, r: 92 };
  const BUYN = { x: 548, y: 64, w: 150, h: 36 }, FR = { x: 20, y: 632, w: 480, h: 70 }, BOOST = { x: 1110, y: 64, w: 156, h: 36 };
  const inB = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  GAME.down = (x, y) => {
    if (away) { away = null; return; }
    if (K.dist(x, y, LEMON.x, LEMON.y) < LEMON.r) { const v = Math.max(1, perSec() * .04 + S.own[0] * mult(0) * .5); earn(v, x + K.rand(-30, 30), y - 90); tapScale = .86; K.sfx(700 + Math.random() * 200, .04, 'triangle', .06); K.burst(x, y, ['#ffe36e', '#fff8b0'], 5, 200, { life: .4 }); return; }
    if (inB(BUYN, x, y)) { buyN = buyN === 1 ? 10 : buyN === 10 ? 100 : buyN === 100 ? 'max' : 1; return; }
    if (inB(FR, x, y)) return franchise();
    if (inB(BOOST, x, y) && S.boost <= 0 && K.save.coins >= 5) { K.save.coins -= 5; S.boost = 120; K.chime(784); persist(); return; }
    BIZ.forEach((b, i) => { const r = ROW(i); if (!inB(r, x, y)) return; if (x > r.x + r.w - 150) buy(i); else if (x > r.x + r.w - 270 && !S.mgr[i] && S.own[i]) hire(i); else run(i); });
  };
  GAME.move = (x, y) => { hover = null; BIZ.forEach((b, i) => { if (inB(ROW(i), x, y)) hover = i; }); };
  GAME.key = (c, d) => { if (!d) return; if (c === 'Space') GAME.down(LEMON.x, LEMON.y); const n = +c.replace('Digit', ''); if (n >= 1 && n <= 7) buy(n - 1); };
  let botT = 0;
  GAME.bot = dt => { botT += dt; if (botT > .25) { botT = 0; if (Math.random() < .5) GAME.down(LEMON.x + K.rand(-40, 40), LEMON.y + K.rand(-40, 40)); BIZ.forEach((b, i) => { if (!S.mgr[i]) run(i); }); const i = K.irand(0, 6); if (costOf(i, 1) < S.cash * .3) buy(i); if (!S.mgr[i] && S.cash > MGR[i]) hire(i); } };
  GAME.update = dt => {
    if (away) return;
    S.boost = Math.max(0, (S.boost || 0) - dt);
    BIZ.forEach((b, i) => {
      if (S.mgr[i] && S.own[i] && prog[i] === 0) prog[i] = .0001;
      if (prog[i] > 0) { prog[i] += dt / cycle(i); if (prog[i] >= 1) { const laps = Math.floor(prog[i]); earn(revenue(i) * laps, ROW(i).x + 330, ROW(i).y + 20); prog[i] = S.mgr[i] ? prog[i] - laps : 0; } }
    });
    for (const p of pops) p.t += dt; pops = pops.filter(p => p.t < .9).slice(-30);
    tapScale += (1 - tapScale) * Math.min(1, dt * 12);
    for (const w of walkers) { w.x += w.sp * dt; if (w.x < -20) w.x = 540; if (w.x > 540) w.x = -20; }
    saveT += dt; if (saveT > 5) { saveT = 0; persist(); }
    K.score = S.gold;
  };
  GAME.draw = gr => {
    const v = K.view, sk = K.skin;
    const sky = gr.createLinearGradient(0, v.y0, 0, 560); sky.addColorStop(0, '#7fd3ff'); sky.addColorStop(1, '#d6f3ff'); gr.fillStyle = sky; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    gr.fillStyle = '#fff6b0'; gr.beginPath(); gr.arc(470, 180, 40, 0, 7); gr.fill();
    // the town grows with what you own
    const tiers = BIZ.map((b, i) => S.own[i] > 0);
    gr.fillStyle = '#b6dcef'; for (let i = 0; i < 8; i++) if (tiers[Math.min(6, 3 + (i % 4))]) gr.fillRect(20 + i * 62, 340 - (i % 3) * 60 - (tiers[5] ? 60 : 0), 50, 240);
    gr.fillStyle = '#6cc46a'; gr.fillRect(v.x0, 520, 540 - v.x0, 220);
    gr.fillStyle = '#c9c0b0'; gr.fillRect(v.x0, 560, 540 - v.x0, 40);
    for (const w of walkers) { gr.fillStyle = w.c; gr.fillRect(w.x - 7, 548, 14, 26); gr.fillStyle = '#f1c7a5'; gr.beginPath(); gr.arc(w.x, 540, 8, 0, 7); gr.fill(); }
    // the stand
    gr.fillStyle = '#8a5a2b'; gr.fillRect(330, 470, 170, 70); gr.fillStyle = sk.c[0]; gr.fillRect(320, 440, 190, 36);
    for (let i = 0; i < 5; i++) { gr.fillStyle = i % 2 ? '#fff' : sk.c[1]; gr.beginPath(); gr.moveTo(320 + i * 38, 400); gr.lineTo(358 + i * 38, 400); gr.lineTo(358 + i * 38, 432); gr.lineTo(320 + i * 38, 432); gr.fill(); }
    gr.fillStyle = '#5a3a1a'; gr.fillRect(330, 400, 8, 70); gr.fillRect(490, 400, 8, 70);
    gr.fillStyle = '#5a3a1a'; gr.font = '18px "Fredoka One", sans-serif'; gr.textAlign = 'center'; gr.fillText('LEMONADE', 415, 464);
    if (S.own[3] > 0) { gr.fillStyle = '#ff6b6b'; gr.fillRect(40, 490, 110, 50); gr.fillRect(150, 506, 34, 34); gr.fillStyle = '#333'; gr.beginPath(); gr.arc(70, 542, 12, 0, 7); gr.arc(160, 542, 12, 0, 7); gr.fill(); }
    // big lemon
    gr.save(); gr.translate(LEMON.x, LEMON.y); gr.scale(tapScale, tapScale);
    gr.fillStyle = '#ffd23f'; gr.shadowColor = 'rgba(0,0,0,.25)'; gr.shadowBlur = 20; gr.beginPath(); gr.ellipse(0, 0, LEMON.r, LEMON.r * .78, -.3, 0, 7); gr.fill(); gr.shadowBlur = 0;
    gr.fillStyle = '#ffe98a'; gr.beginPath(); gr.ellipse(-26, -24, 30, 16, -.6, 0, 7); gr.fill(); gr.fillStyle = '#4caf50'; gr.beginPath(); gr.ellipse(60, -70, 26, 11, -.7, 0, 7); gr.fill();
    gr.fillStyle = '#7a5a10'; gr.font = '22px "Fredoka One", sans-serif'; gr.fillText('SQUEEZE!', 0, 8); gr.restore();
    // top bar
    gr.fillStyle = 'rgba(255,255,255,.8)'; gr.beginPath(); gr.roundRect(20, 16, 500, 92, 18); gr.fill();
    gr.fillStyle = '#2a7a2a'; gr.font = '46px "Fredoka One", sans-serif'; gr.textAlign = 'left'; gr.textBaseline = 'middle'; gr.fillText('$' + fmt(S.cash), 40, 52);
    gr.fillStyle = '#4a6a4a'; gr.font = '18px "Fredoka One", sans-serif'; gr.fillText(`$${fmt(perSec())}/sec`, 40, 88); gr.fillStyle = '#c99a00'; gr.fillText(`🍋 ${S.gold} Golden Lemons (+${S.gold * 10}%)`, 220, 88);
    // business list
    gr.fillStyle = 'rgba(20,40,60,.88)'; gr.beginPath(); gr.roundRect(536, 12, 742, 696, 20); gr.fill();
    gr.fillStyle = '#fff'; gr.font = '28px "Fredoka One", sans-serif'; gr.textAlign = 'left'; gr.fillText('Your businesses', 560, 40);
    gr.fillStyle = '#3a6a8a'; gr.beginPath(); gr.roundRect(BUYN.x, BUYN.y, BUYN.w, BUYN.h, 10); gr.fill(); gr.fillStyle = '#fff'; gr.font = '18px "Fredoka One", sans-serif'; gr.textAlign = 'center'; gr.fillText(`Buy x${buyN === 'max' ? 'MAX' : buyN}`, BUYN.x + BUYN.w / 2, BUYN.y + 19);
    gr.fillStyle = S.boost > 0 ? '#5fd36a' : K.save.coins >= 5 ? '#c99a00' : '#555'; gr.beginPath(); gr.roundRect(BOOST.x, BOOST.y, BOOST.w, BOOST.h, 10); gr.fill(); gr.fillStyle = '#fff'; gr.fillText(S.boost > 0 ? `2x income ${Math.ceil(S.boost)}s` : '2x boost (5 coins)', BOOST.x + BOOST.w / 2, BOOST.y + 19);
    BIZ.forEach((b, i) => {
      const r = ROW(i), owned = S.own[i] > 0, locked = !owned && i > 0 && !S.own[i - 1];
      gr.fillStyle = hover === i ? '#2a5a7a' : '#1e4660'; gr.beginPath(); gr.roundRect(r.x, r.y, r.w, r.h, 14); gr.fill();
      if (locked) { gr.fillStyle = 'rgba(255,255,255,.35)'; gr.font = '22px "Fredoka One", sans-serif'; gr.textAlign = 'left'; gr.fillText(`🔒 ${b.n}  ·  $${fmt(costOf(i, 1))}`, r.x + 20, r.y + r.h / 2); return; }
      gr.font = '34px serif'; gr.textAlign = 'center'; gr.fillText(b.i, r.x + 36, r.y + r.h / 2 + 2);
      gr.fillStyle = '#ffe36e'; gr.font = '16px "Fredoka One", sans-serif'; gr.fillText(S.own[i], r.x + 36, r.y + r.h - 8);
      gr.textAlign = 'left'; gr.fillStyle = '#fff'; gr.font = '20px "Fredoka One", sans-serif'; gr.fillText(b.n, r.x + 72, r.y + 20);
      const bw = 300, bx = r.x + 72, by = r.y + 36; gr.fillStyle = '#0e2a3a'; gr.beginPath(); gr.roundRect(bx, by, bw, 24, 12); gr.fill();
      const p = cycle(i) < .25 && prog[i] > 0 ? 1 : prog[i]; gr.fillStyle = sk.c[0]; gr.beginPath(); gr.roundRect(bx, by, Math.max(0, bw * p), 24, 12); gr.fill();
      gr.fillStyle = '#fff'; gr.font = '15px "Fredoka One", sans-serif'; gr.textAlign = 'center'; gr.fillText(owned ? `$${fmt(revenue(i))} ${S.mgr[i] ? '' : '· tap to run'}` : '', bx + bw / 2, by + 13);
      gr.textAlign = 'right'; gr.fillStyle = 'rgba(255,255,255,.7)'; gr.fillText(`${cycle(i).toFixed(1)}s`, bx + bw + 46, by + 13);
      if (owned && !S.mgr[i]) { const can = S.cash >= MGR[i]; gr.fillStyle = can ? '#a23bff' : '#3a3a5a'; gr.beginPath(); gr.roundRect(r.x + r.w - 262, r.y + 10, 104, r.h - 20, 10); gr.fill(); gr.fillStyle = '#fff'; gr.textAlign = 'center'; gr.font = '14px "Fredoka One", sans-serif'; gr.fillText('Manager', r.x + r.w - 210, r.y + 28); gr.fillText('$' + fmt(MGR[i]), r.x + r.w - 210, r.y + 46); }
      if (S.mgr[i]) { gr.fillStyle = '#a2ffb0'; gr.font = '14px "Fredoka One", sans-serif'; gr.textAlign = 'center'; gr.fillText('✓ managed', r.x + r.w - 210, r.y + r.h / 2); }
      const n = buyN === 'max' ? Math.max(1, maxBuy(i)) : buyN, c = costOf(i, n), can = c <= S.cash;
      gr.fillStyle = can ? '#5fd36a' : '#3a5a3a'; gr.beginPath(); gr.roundRect(r.x + r.w - 146, r.y + 8, 136, r.h - 16, 12); gr.fill();
      gr.fillStyle = can ? '#0e2a0e' : 'rgba(255,255,255,.5)'; gr.font = '15px "Fredoka One", sans-serif'; gr.fillText(`Buy x${n}`, r.x + r.w - 78, r.y + 26); gr.font = '19px "Fredoka One", sans-serif'; gr.fillText('$' + fmt(c), r.x + r.w - 78, r.y + 48);
    });
    // franchise
    const g = goldFor(); gr.fillStyle = g >= 1 ? '#c99a00' : 'rgba(0,0,0,.35)'; gr.beginPath(); gr.roundRect(FR.x, FR.y, FR.w, FR.h, 16); gr.fill();
    gr.fillStyle = '#fff'; gr.font = '22px "Fredoka One", sans-serif'; gr.textAlign = 'center'; gr.fillText(g >= 1 ? `Franchise now: +${g} Golden Lemon${g > 1 ? 's' : ''}` : `Franchise at $${fmt(Math.pow((S.goldEarned + 1) / 2, 2) * 1e9)} earned`, FR.x + FR.w / 2, FR.y + 26);
    gr.font = '15px "Fredoka One", sans-serif'; gr.fillText(g >= 1 ? 'Start over, keep the lemons: +10% income each' : `Earned this run: $${fmt(S.total)}`, FR.x + FR.w / 2, FR.y + 52);
    // money pops
    gr.textAlign = 'center'; for (const p of pops) { gr.globalAlpha = 1 - p.t / .9; gr.fillStyle = '#1e7a1e'; gr.font = '22px "Fredoka One", sans-serif'; gr.fillText(p.s, p.x, p.y - p.t * 50); } gr.globalAlpha = 1;
    if (away) {
      gr.fillStyle = 'rgba(0,0,0,.55)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
      gr.fillStyle = '#fff'; gr.beginPath(); gr.roundRect(390, 220, 500, 260, 24); gr.fill();
      gr.fillStyle = '#2a7a2a'; gr.font = '36px "Fredoka One", sans-serif'; gr.fillText('Welcome back!', 640, 280);
      gr.fillStyle = '#333'; gr.font = '22px "Fredoka One", sans-serif'; gr.fillText(`Your managers worked for ${Math.floor(away.secs / 3600)}h ${Math.floor(away.secs % 3600 / 60)}m`, 640, 330);
      gr.fillStyle = '#2a7a2a'; gr.font = '44px "Fredoka One", sans-serif'; gr.fillText('+$' + fmt(away.earned), 640, 390); gr.fillStyle = '#777'; gr.font = '18px "Fredoka One", sans-serif'; gr.fillText('Tap to collect', 640, 448);
    }
  };
})();
