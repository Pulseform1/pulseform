/* Space Colony: build a base on Mars. Balance power, oxygen, food and water so colonists keep arriving.
   Dust storms dim the solar panels, meteors smash buildings (unless shields are up), supply drops help.
   Run out of oxygen or food and the colony is evacuated. The colony is saved between visits. */
const GAME = {
  id: 'space-colony', title: 'Space Colony', tagline: 'Build a Mars base. Keep everyone breathing.',
  font: 'Orbitron', accent: '#ff8a4a', accent2: '#7cf2ff', bg: '#1a0a06', noHud: true, scoreLabel: 'Colonists',
  how: ['Pick a building on the left, then tap the ground to build it.', 'Power runs everything. Colonists need oxygen, food and water.', 'Watch out for dust storms and meteor showers!'],
  skins: [
    { name: 'Mars', price: 0, c: ['#c2552a', '#7a2e14'] }, { name: 'Moon', price: 60, c: ['#9a9aa2', '#4a4a52'] }, { name: 'Ice world', price: 150, c: ['#bfe6f2', '#5a8aa2'] },
    { name: 'Venus', price: 250, c: ['#d8b24a', '#7a5a1a'] }, { name: 'Alien', price: 400, c: ['#6ad28a', '#1a5a3a'] }, { name: 'Void', price: 700, c: ['#3a2a5a', '#120a22'] },
  ],
};
(() => {
  const B = {
    solar: { n: 'Solar panel', cost: 10, pw: 6, c: '#3a6ad2' }, o2: { n: 'Oxygen maker', cost: 20, pw: -2, o2: 5, c: '#7cf2ff' },
    farm: { n: 'Greenhouse', cost: 20, pw: -2, food: 5, water: -1, c: '#5fd36a' }, water: { n: 'Ice drill', cost: 15, pw: -1, water: 5, c: '#4a9aff' },
    hab: { n: 'Habitat', cost: 30, pw: -1, house: 5, c: '#e6e0d0' }, mine: { n: 'Metal mine', cost: 25, pw: -2, metal: 3, c: '#b0a090' },
    shield: { n: 'Meteor shield', cost: 80, pw: -4, c: '#c79bff' }, reactor: { n: 'Reactor', cost: 150, pw: 30, c: '#ffd23f' },
  };
  const KEYS = Object.keys(B), GX = 12, GY = 7, TS = 84, OX = 250, OY = 112, SOL = 24;
  let S, sel, hover, tip, evt, evtT, meteors, saveT, rocket, stars, gameOver;
  function fresh() {
    const grid = Array(GX * GY).fill(null), rocks = Array.from({ length: GX * GY }, () => Math.random() < .12);
    grid[3 * GX + 5] = 'hab'; grid[3 * GX + 6] = 'solar'; grid[2 * GX + 6] = 'solar'; grid[4 * GX + 6] = 'o2'; grid[4 * GX + 5] = 'farm'; grid[2 * GX + 5] = 'water';
    [3 * GX + 5, 3 * GX + 6, 2 * GX + 6, 4 * GX + 6, 4 * GX + 5, 2 * GX + 5].forEach(i => rocks[i] = false);
    return { grid, rocks, metal: 40, o2: 60, food: 60, water: 60, pop: 3, best: 3, sol: 1, t: 0 };
  }
  GAME.reset = () => {
    S = K.bot ? fresh() : (K.save.col && !K.save.col.over ? K.save.col : fresh());
    if (K.bot) { S.metal = 400; }
    sel = 'solar'; hover = -1; tip = ''; evt = null; evtT = 40; meteors = []; saveT = 0; rocket = null; gameOver = false;
    stars = Array.from({ length: 80 }, () => ({ x: Math.random() * W, y: Math.random() * 100, r: Math.random() * 1.5 + .3 }));
    K.score = S.best;
  };
  const count = k => S.grid.filter(g => g === k).length;
  function rates() {
    const storm = evt && evt.k === 'storm' ? .35 : 1;
    let pw = 0, use = 0; for (const g of S.grid) if (g) { const b = B[g]; if (b.pw > 0) pw += b.pw * (g === 'solar' ? storm : 1); else use -= b.pw; }
    const eff = use ? Math.min(1, pw / use) : 1, r = { pw, use, eff, o2: 0, food: 0, water: 0, metal: 0, house: 0 };
    for (const g of S.grid) if (g) { const b = B[g]; for (const k of ['o2', 'food', 'water', 'metal']) if (b[k]) r[k] += b[k] * (b[k] > 0 ? eff : 1); if (b.house) r.house += b.house; }
    r.o2 -= S.pop * 1; r.food -= S.pop * .8; r.water -= S.pop * .6; return r;
  }
  function persist() { if (K.bot) return; K.save.col = S; K.save.best = Math.max(K.save.best || 0, S.best); K.persist(); }
  /* ---------- input ---------- */
  const card = i => ({ x: 14, y: 112 + i * 64, w: 222, h: 58 });
  const inB = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  const tileAt = (x, y) => { const gx = Math.floor((x - OX) / TS), gy = Math.floor((y - OY) / TS); return gx >= 0 && gy >= 0 && gx < GX && gy < GY ? gy * GX + gx : -1; };
  function place(i) {
    if (i < 0) return;
    if (S.grid[i]) { if (sel === 'remove') { const k = S.grid[i]; S.grid[i] = null; S.metal += Math.floor(B[k].cost / 2); K.noise(.2, .15, 600); persist(); } return; }
    if (sel === 'remove') return;
    if (S.rocks[i]) { if (S.metal >= 5) { S.metal -= 5; S.rocks[i] = false; K.noise(.2, .2, 300); } else tipMsg('Clearing rocks costs 5 metal'); return; }
    const b = B[sel]; if (S.metal < b.cost) { tipMsg(`Need ${b.cost} metal`); K.sfx(160, .1, 'square', .05); return; }
    S.metal -= b.cost; S.grid[i] = sel; K.sfx(440, .08, 'square', .06); K.sfx(660, .08, 'square', .05, 0, .06);
    const x = OX + (i % GX) * TS + TS / 2, y = OY + Math.floor(i / GX) * TS + TS / 2; K.burst(x, y, ['#ffb38a', '#fff'], 10, 160, { life: .4 }); persist();
  }
  const tipMsg = s => { tip = s; GAME._tipT = 2; };
  GAME.down = (x, y) => {
    if (gameOver) return;
    KEYS.forEach((k, i) => { if (inB(card(i), x, y)) { sel = k; K.sfx(600, .04, 'triangle', .04); } });
    if (inB(card(KEYS.length), x, y)) sel = 'remove';
    place(tileAt(x, y));
  };
  GAME.move = (x, y) => { hover = tileAt(x, y); };
  GAME.key = (c, d) => { if (!d) return; const n = +c.replace('Digit', ''); if (n >= 1 && n <= KEYS.length) sel = KEYS[n - 1]; if (c === 'KeyX' || c === 'Digit0') sel = 'remove'; };
  let botT = 0;
  GAME.bot = dt => {
    botT += dt; if (botT < .8) return; botT = 0;
    const r = rates(), need = r.eff < 1 ? 'solar' : r.o2 < 1 ? 'o2' : r.food < 1 ? 'farm' : r.water < 1 ? 'water' : r.house <= S.pop ? 'hab' : count('mine') < 2 + S.pop / 8 ? 'mine' : K.pick(['solar', 'hab', 'mine', 'o2', 'farm']);
    sel = need; const free = S.grid.map((g, i) => !g && !S.rocks[i] ? i : -1).filter(i => i >= 0); if (free.length) place(K.pick(free));
  };
  /* ---------- update ---------- */
  GAME.update = dt => {
    if (gameOver) return;
    const r = rates(), k = dt / SOL * 10;
    S.o2 = Math.min(200, S.o2 + r.o2 * k); S.food = Math.min(200, S.food + r.food * k); S.water = Math.min(200, S.water + r.water * k); S.metal += r.metal * k;
    if (S.water <= 0) { S.water = 0; S.food -= S.pop * .5 * k; }
    S.t += dt; if (S.t >= SOL) { S.t -= SOL; S.sol++; }
    // newcomers arrive by rocket when there's room and supplies
    GAME._arrive = (GAME._arrive || 0) + dt;
    if (GAME._arrive > 9 && S.pop < r.house && r.o2 > 0 && r.food > 0 && S.o2 > 20 && S.food > 20 && !rocket) { GAME._arrive = 0; rocket = { y: -80, t: 0, n: Math.min(r.house - S.pop, K.irand(1, 3)) }; K.sfx(120, 2.5, 'sawtooth', .06, 200); }
    if (rocket) { rocket.t += dt; rocket.y = rocket.t < 2 ? -80 + rocket.t * 120 : 160 - (rocket.t - 2) * 260; if (rocket.t > 2 && !rocket.done) { rocket.done = true; S.pop += rocket.n; if (S.pop > S.best) { S.best = S.pop; K.score = S.best; for (const m of [10, 25, 50, 100]) if (S.best >= m && S.best - rocket.n < m) { K.toast(`${m} colonists!`); K.chime(523, [0, 4, 7, 12]); if (!K.bot) K.coin(5); } } K.pop(1000, 120, `+${rocket.n} colonist${rocket.n > 1 ? 's' : ''}`, '#7cf2ff', 30); if (!K.bot) K.coin(1); } if (rocket.t > 3) rocket = null; }
    // people leave when supplies run low
    if ((S.o2 < 5 || S.food < 5) && S.pop > 0 && Math.random() < dt * .4) { S.pop--; tipMsg(S.o2 < 5 ? 'A colonist left: not enough oxygen!' : 'A colonist left: not enough food!'); K.sfx(220, .4, 'sawtooth', .06, -100); }
    if (S.pop <= 0 || S.o2 <= 0 && S.food <= 0) { gameOver = true; S.over = true; persist(); if (K.bot) K.over(); else K.over({ title: 'Colony evacuated', text: `The last colonists packed up on sol ${S.sol}. Best population: ${S.best}. Next time, keep an eye on oxygen and food!` }); return; }
    // events
    evtT -= dt;
    if (!evt && evtT <= 0) { const k = K.pick(['storm', 'meteor', 'supply', 'storm', 'meteor']); evt = { k, t: k === 'storm' ? 25 : k === 'meteor' ? 8 : 0 }; evtT = K.rand(45, 80);
      if (k === 'storm') tipMsg('DUST STORM! Solar panels are weak.'); if (k === 'meteor') { tipMsg(count('shield') ? 'Meteor shower! Shields are up.' : 'METEOR SHOWER! Build shields!'); } if (k === 'supply') { S.metal += 40; S.food += 20; tipMsg('Supply drop: +40 metal, +20 food'); K.chime(660); evt = null; } }
    if (evt) { evt.t -= dt; if (evt.k === 'meteor' && Math.random() < dt * 2.5) meteors.push({ x: K.rand(OX, OX + GX * TS) + 200, y: -40, tx: K.irand(0, GX * GY - 1) }); if (evt.t <= 0) evt = null; }
    for (const m of meteors) { const tx = OX + (m.tx % GX) * TS + TS / 2, ty = OY + Math.floor(m.tx / GX) * TS + TS / 2; m.x += (tx - m.x) * dt * 2.2; m.y += (ty - m.y) * dt * 2.2; if (Math.abs(m.y - ty) < 8) { m.hit = true; const sh = count('shield'); if (sh && Math.random() < Math.min(.95, sh * .45)) { K.burst(tx, ty - 60, ['#c79bff', '#fff'], 12, 200, { gravity: 0, life: .4 }); } else { K.shake(10); K.noise(.4, .25, 120); K.burst(tx, ty, ['#ff8a4a', '#ffd23f', '#555'], 18, 260, { life: .6 }); if (S.grid[m.tx] && S.grid[m.tx] !== 'hab' && Math.random() < .5) { S.grid[m.tx] = null; S.rocks[m.tx] = true; } } } }
    meteors = meteors.filter(m => !m.hit);
    GAME._tipT = (GAME._tipT || 0) - dt;
    saveT += dt; if (saveT > 5) { saveT = 0; persist(); }
  };
  /* ---------- draw ---------- */
  function building(gr, k, x, y, s = 1) {
    const b = B[k]; gr.save(); gr.translate(x, y); gr.scale(s, s);
    if (k === 'solar') { gr.fillStyle = '#555'; gr.fillRect(-3, 0, 6, 24); gr.save(); gr.transform(1, 0, -.4, 1, 0, 0); gr.fillStyle = b.c; gr.fillRect(-26, -22, 52, 30); gr.strokeStyle = '#8ab0ff'; gr.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { gr.beginPath(); gr.moveTo(i * 17, -22); gr.lineTo(i * 17, 8); gr.stroke(); } gr.restore(); }
    else if (k === 'hab') { gr.fillStyle = b.c; gr.beginPath(); gr.arc(0, 14, 30, Math.PI, 0); gr.fill(); gr.fillStyle = '#7cf2ff'; for (const wx of [-14, 0, 14]) { gr.beginPath(); gr.arc(wx, 0, 5, 0, 7); gr.fill(); } }
    else if (k === 'o2') { gr.fillStyle = '#d0d8e0'; gr.fillRect(-18, -20, 36, 40); gr.fillStyle = b.c; gr.beginPath(); gr.arc(0, -4, 12, 0, 7); gr.fill(); gr.fillStyle = '#fff'; gr.font = 'bold 12px Orbitron'; gr.textAlign = 'center'; gr.fillText('O₂', 0, 0); }
    else if (k === 'farm') { gr.fillStyle = 'rgba(200,255,220,.5)'; gr.beginPath(); gr.arc(0, 16, 32, Math.PI, 0); gr.fill(); gr.fillStyle = b.c; for (const px of [-16, 0, 16]) { gr.beginPath(); gr.ellipse(px, 6, 6, 10, 0, 0, 7); gr.fill(); } }
    else if (k === 'water') { gr.fillStyle = '#7a7a8a'; gr.beginPath(); gr.moveTo(-20, 22); gr.lineTo(0, -28); gr.lineTo(20, 22); gr.fill(); gr.fillStyle = b.c; gr.beginPath(); gr.arc(0, 14, 9, 0, 7); gr.fill(); }
    else if (k === 'mine') { gr.fillStyle = '#6a5a4a'; gr.fillRect(-26, 0, 52, 22); gr.fillStyle = b.c; gr.fillRect(-8, -24, 16, 26); gr.fillStyle = '#ffd23f'; gr.beginPath(); gr.arc(0, -14 + Math.sin(K.t * 6) * 3, 5, 0, 7); gr.fill(); }
    else if (k === 'shield') { gr.strokeStyle = b.c; gr.lineWidth = 3; gr.globalAlpha = .7 + Math.sin(K.t * 3) * .2; gr.beginPath(); gr.arc(0, 18, 34, Math.PI, 0); gr.stroke(); gr.globalAlpha = 1; gr.fillStyle = '#555'; gr.fillRect(-5, 0, 10, 20); gr.fillStyle = b.c; gr.beginPath(); gr.arc(0, -2, 7, 0, 7); gr.fill(); }
    else if (k === 'reactor') { gr.fillStyle = '#8a8a90'; gr.beginPath(); gr.moveTo(-26, 24); gr.lineTo(-18, -20); gr.lineTo(18, -20); gr.lineTo(26, 24); gr.fill(); gr.fillStyle = b.c; gr.shadowColor = b.c; gr.shadowBlur = 16; gr.beginPath(); gr.arc(0, 2, 10, 0, 7); gr.fill(); gr.shadowBlur = 0; }
    gr.restore();
  }
  GAME.drawSkin = (gr, s) => { gr.fillStyle = s.c[0]; gr.beginPath(); gr.arc(0, 0, 40, 0, 7); gr.fill(); gr.fillStyle = s.c[1]; gr.beginPath(); gr.arc(-10, -8, 10, 0, 7); gr.arc(14, 14, 7, 0, 7); gr.fill(); };
  GAME.draw = gr => {
    const v = K.view, sk = K.skin, r = rates(), storm = evt && evt.k === 'storm';
    const sky = gr.createLinearGradient(0, v.y0, 0, OY); sky.addColorStop(0, '#0a0614'); sky.addColorStop(1, '#3a1a14'); gr.fillStyle = sky; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    gr.fillStyle = '#fff'; for (const s of stars) { gr.globalAlpha = .7; gr.fillRect(s.x, s.y, s.r * 2, s.r * 2); } gr.globalAlpha = 1;
    gr.fillStyle = sk.c[0]; gr.fillRect(v.x0, OY - 10, v.x1 - v.x0, v.y1 - OY + 10);
    for (let i = 0; i < GX * GY; i++) {
      const x = OX + (i % GX) * TS, y = OY + Math.floor(i / GX) * TS;
      gr.fillStyle = (i + Math.floor(i / GX)) % 2 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.03)'; gr.fillRect(x, y, TS, TS);
      if (S.rocks[i]) { gr.fillStyle = sk.c[1]; gr.beginPath(); gr.ellipse(x + TS / 2, y + TS / 2 + 10, 26, 16, 0, 0, 7); gr.fill(); gr.beginPath(); gr.ellipse(x + TS / 2 + 14, y + TS / 2 - 4, 14, 10, 0, 0, 7); gr.fill(); }
      if (S.grid[i]) building(gr, S.grid[i], x + TS / 2, y + TS / 2);
      if (i === hover && !K.bot) { gr.strokeStyle = sel === 'remove' ? '#ff4a4a' : 'rgba(255,255,255,.6)'; gr.lineWidth = 3; gr.strokeRect(x + 3, y + 3, TS - 6, TS - 6); if (!S.grid[i] && !S.rocks[i] && sel !== 'remove') { gr.globalAlpha = .5; building(gr, sel, x + TS / 2, y + TS / 2); gr.globalAlpha = 1; } }
    }
    for (const m of meteors) { gr.strokeStyle = 'rgba(255,180,90,.6)'; gr.lineWidth = 6; gr.beginPath(); gr.moveTo(m.x, m.y); gr.lineTo(m.x + 50, m.y - 70); gr.stroke(); gr.fillStyle = '#ffd23f'; gr.beginPath(); gr.arc(m.x, m.y, 9, 0, 7); gr.fill(); }
    if (rocket) { gr.save(); gr.translate(1000, rocket.y); gr.fillStyle = '#e6e6ee'; gr.beginPath(); gr.moveTo(0, -40); gr.lineTo(16, 0); gr.lineTo(16, 30); gr.lineTo(-16, 30); gr.lineTo(-16, 0); gr.fill(); gr.fillStyle = '#ff8a4a'; gr.beginPath(); gr.moveTo(-10, 30); gr.lineTo(0, 50 + Math.random() * 20); gr.lineTo(10, 30); gr.fill(); gr.restore(); }
    if (storm) { gr.fillStyle = 'rgba(200,120,70,.35)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); gr.strokeStyle = 'rgba(255,200,150,.25)'; gr.lineWidth = 2; for (let i = 0; i < 60; i++) { const x = (i * 97 + K.t * 600) % 1500 - 100, y = (i * 53) % 720; gr.beginPath(); gr.moveTo(x, y); gr.lineTo(x - 60, y + 6); gr.stroke(); } }
    // resource bar
    gr.fillStyle = 'rgba(10,6,20,.85)'; gr.fillRect(v.x0, 0, v.x1 - v.x0, 96);
    const res = [['POWER', `${Math.round(r.pw)}/${Math.round(r.use)}`, r.eff < 1 ? '#ff4a4a' : '#ffd23f', null], ['O₂', S.o2, '#7cf2ff', r.o2], ['FOOD', S.food, '#5fd36a', r.food], ['WATER', S.water, '#4a9aff', r.water], ['METAL', S.metal, '#d8c8b0', r.metal], ['PEOPLE', `${S.pop}/${r.house}`, '#fff', null]];
    res.forEach(([n, val, c, rate], i) => {
      const x = 70 + i * 196; gr.fillStyle = c; gr.font = '13px Orbitron'; gr.textAlign = 'left'; gr.textBaseline = 'middle'; gr.fillText(n, x, 22);
      gr.font = '24px Orbitron'; gr.fillText(typeof val === 'number' ? Math.floor(val) : val, x, 52);
      if (rate !== null) { gr.font = '13px Orbitron'; gr.fillStyle = rate < 0 ? '#ff6a6a' : '#9aff9a'; gr.fillText(`${rate >= 0 ? '+' : ''}${Math.round(rate * 10)}/sol`, x, 80); if (typeof val === 'number' && val < 25 && n !== 'METAL' && Math.sin(K.t * 8) > 0) { gr.strokeStyle = '#ff4a4a'; gr.lineWidth = 2; gr.strokeRect(x - 8, 8, 170, 82); } }
    });
    gr.fillStyle = '#ffb38a'; gr.font = '14px Orbitron'; gr.textAlign = 'right'; gr.fillText(`SOL ${S.sol}`, W - 16, 22); gr.fillText(`BEST ${S.best}`, W - 16, 44);
    // build menu
    KEYS.concat(['remove']).forEach((k, i) => {
      const b = card(i), on = sel === k, info = B[k]; gr.fillStyle = on ? '#3a2a5a' : 'rgba(20,10,30,.85)'; gr.beginPath(); gr.roundRect(b.x, b.y, b.w, b.h, 12); gr.fill(); if (on) { gr.strokeStyle = '#ff8a4a'; gr.lineWidth = 3; gr.stroke(); }
      if (k === 'remove') { gr.fillStyle = '#ff6a6a'; gr.font = '15px Orbitron'; gr.textAlign = 'center'; gr.fillText('✕ Remove (X)', b.x + b.w / 2, b.y + b.h / 2); return; }
      building(gr, k, b.x + 32, b.y + 30, .55);
      gr.fillStyle = '#fff'; gr.font = '13px Orbitron'; gr.textAlign = 'left'; gr.fillText(`${i + 1} ${info.n}`, b.x + 62, b.y + 18);
      const eff = [info.pw > 0 ? `+${info.pw}⚡` : `${info.pw}⚡`, info.o2 ? `+${info.o2} O₂` : '', info.food ? `+${info.food} food` : '', info.water > 0 ? `+${info.water} water` : '', info.house ? `+${info.house} beds` : '', info.metal ? `+${info.metal} metal` : '', k === 'shield' ? 'blocks meteors' : ''].filter(Boolean).join(' ');
      gr.fillStyle = 'rgba(255,255,255,.6)'; gr.font = '10px Orbitron'; gr.fillText(eff, b.x + 62, b.y + 36); gr.fillStyle = S.metal >= info.cost ? '#d8c8b0' : '#ff6a6a'; gr.fillText(`${info.cost} metal`, b.x + 62, b.y + 50);
    });
    if (GAME._tipT > 0) { gr.font = '20px Orbitron'; gr.textAlign = 'center'; const w = gr.measureText(tip).width + 40; gr.fillStyle = 'rgba(0,0,0,.75)'; gr.fillRect(OX + GX * TS / 2 - w / 2, 690 - 20, w, 36); gr.fillStyle = '#ffd8b0'; gr.fillText(tip, OX + GX * TS / 2, 690); }
  };
})();
