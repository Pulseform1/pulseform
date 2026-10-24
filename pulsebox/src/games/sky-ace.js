/* Sky Ace: a side-scrolling shoot-'em-up. Your plane fires on its own; dodge bullets, grab power-ups,
   and take down a boss every couple of minutes. Three lives. */
const GAME = {
  id: 'sky-ace', title: 'Sky Ace', tagline: 'Fly, fire, dodge. Beat the boss. Chase the high score.',
  font: 'Racing Sans One', accent: '#4fd8ff', accent2: '#ffb23f', bg: '#2a6ab0', scoreLabel: 'Score',
  how: ['Drag anywhere to fly (the plane follows your finger), or use WASD / arrow keys.', 'You shoot by yourself. Grab P to power up, S for a shield, B for a bomb.', 'Three lives. A boss shows up every two minutes.'],
  skins: [
    { name: 'Falcon', price: 0, c: ['#e6eef6', '#d23a3a'] }, { name: 'Viper', price: 60, c: ['#7dffb0', '#1a6a3a'] }, { name: 'Raven', price: 150, c: ['#3a3a4a', '#ff3d8b'] },
    { name: 'Sunbird', price: 250, c: ['#ffd23f', '#ff6a2a'] }, { name: 'Ghost', price: 400, c: ['#c8f0ff', '#6a7aff'] }, { name: 'Royal', price: 700, c: ['#b07cff', '#ffe36e'] },
  ],
};
(() => {
  let me, foes, bul, ebul, drops, clouds, lives, power, shield, bombs, inv, t, waveT, boss, bossT, keys, drag, fireT, dead, hills;
  GAME.reset = () => {
    me = { x: 200, y: H / 2, tx: 200, ty: H / 2 }; foes = []; bul = []; ebul = []; drops = []; lives = 3; power = 1; shield = 0; bombs = 1; inv = 2; t = 0; waveT = 1.5; boss = null; bossT = 110; keys = {}; drag = null; fireT = 0; dead = false;
    clouds = Array.from({ length: 14 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: K.rand(.4, 1.3) }));
    hills = Array.from({ length: 10 }, (_, i) => ({ x: i * 160, h: K.rand(40, 120) }));
  };
  function plane(gr, s, x, y, tilt, sc = 1) {
    gr.save(); gr.translate(x, y); gr.rotate(tilt * .25); gr.scale(sc, sc);
    gr.fillStyle = s.c[1]; gr.beginPath(); gr.moveTo(-8, 0); gr.lineTo(-30, -34); gr.lineTo(-14, -34); gr.lineTo(14, 0); gr.lineTo(-14, 34); gr.lineTo(-30, 34); gr.fill();
    gr.fillStyle = s.c[0]; gr.beginPath(); gr.moveTo(40, 0); gr.quadraticCurveTo(20, -12, -34, -8); gr.lineTo(-34, 8); gr.quadraticCurveTo(20, 12, 40, 0); gr.fill();
    gr.fillStyle = s.c[1]; gr.beginPath(); gr.moveTo(-28, -6); gr.lineTo(-40, -20); gr.lineTo(-34, -2); gr.fill();
    gr.fillStyle = '#5ad8ff'; gr.beginPath(); gr.ellipse(14, -3, 9, 5, 0, 0, 7); gr.fill();
    gr.fillStyle = `rgba(255,${150 + Math.random() * 100},60,.9)`; gr.beginPath(); gr.moveTo(-34, -5); gr.lineTo(-48 - Math.random() * 12, 0); gr.lineTo(-34, 5); gr.fill();
    gr.restore();
  }
  GAME.drawSkin = (gr, s) => plane(gr, s, 4, 0, 0, 1);
  /* ---------- waves ---------- */
  function wave() {
    const k = K.irand(0, t > 40 ? 4 : 2), y0 = K.rand(120, H - 120), hp = 2 + Math.floor(t / 50);
    if (k === 0) for (let i = 0; i < 6; i++) foes.push({ k: 'sine', x: W + 40 + i * 70, y: y0, y0, hp, ph: i * .5, r: 22, pts: 10 });
    if (k === 1) for (let i = 0; i < 5; i++) foes.push({ k: 'line', x: W + 40 + Math.abs(i - 2) * 60, y: y0 + (i - 2) * 60, hp, r: 22, pts: 10 });
    if (k === 2) for (let i = 0; i < 4; i++) foes.push({ k: 'dive', x: W + 40 + i * 120, y: i % 2 ? 80 : H - 80, hp, r: 22, pts: 15 });
    if (k === 3) foes.push({ k: 'tank', x: W + 60, y: y0, hp: hp * 8, r: 40, pts: 60, fire: 1 });
    if (k === 4) for (let i = 0; i < 3; i++) foes.push({ k: 'gunner', x: W + 40 + i * 140, y: K.rand(100, H - 100), hp: hp * 3, r: 26, pts: 25, fire: K.rand(.5, 1.5) });
  }
  function shootAt(x, y, sp = 300, spread = 0) { const a = Math.atan2(me.y - y, me.x - x) + spread; ebul.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp }); }
  /* ---------- input ---------- */
  GAME.down = (x, y) => { drag = { x, y, mx: me.tx, my: me.ty }; };
  GAME.move = (x, y) => { if (drag) { me.tx = K.clamp(drag.mx + (x - drag.x) * 1.3, 40, W - 40); me.ty = K.clamp(drag.my + (y - drag.y) * 1.3, 40, H - 40); } };
  GAME.up = () => { drag = null; };
  GAME.key = (c, d) => { keys[c] = d; if (d && (c === 'KeyB' || c === 'Space')) bomb(); };
  function bomb() { if (bombs <= 0 || dead) return; bombs--; K.flash('#fff', .9); K.shake(20); K.noise(.8, .4, 80); ebul = []; for (const f of foes) hit(f, 30); if (boss) hit(boss, 40); }
  GAME.bot = () => {
    let tx = 220 + Math.sin(K.t * .7) * 100, ty = me.ty;
    const tgt = boss || foes.reduce((b, f) => !b || f.x < b.x ? f : b, null); if (tgt) ty = tgt.y;
    for (const b of ebul) { const dx = b.x - me.x, dy = b.y - me.y; if (dx > -20 && dx < 160 && Math.abs(dy) < 50) ty = me.y + (dy > 0 ? -90 : 90); }
    for (const d of drops) if (d.x < 700) { ty = d.y; tx = d.x; }
    me.tx = K.clamp(tx, 40, W - 40); me.ty = K.clamp(ty, 40, H - 40);
  };
  function hit(f, d) {
    f.hp -= d; f.flash = .08;
    if (f.hp <= 0 && !f.dead) {
      f.dead = true; K.add(f.pts); K.burst(f.x, f.y, ['#ffb347', '#ff4d2e', '#fff', '#666'], f.boss ? 60 : 14, f.boss ? 500 : 260, { gravity: 0, life: .6, size: 9 }); K.noise(f.boss ? .9 : .15, f.boss ? .4 : .12, f.boss ? 60 : 500);
      const r = Math.random(); if (f.boss || r < .08) drops.push({ x: f.x, y: f.y, k: f.boss ? 'P' : K.pick(['P', 'P', 'S', 'B']) }); else if (r < .3) drops.push({ x: f.x, y: f.y, k: '$' });
      if (f.boss) { K.toast('Boss down!'); K.chime(392, [0, 4, 7, 12, 16]); if (!K.bot) K.coin(10); boss = null; bossT = 120; }
    }
  }
  function lose() {
    if (inv > 0) return; if (shield > 0) { shield = 0; inv = 1; K.sfx(400, .3, 'sine', .1, 400); return; }
    lives--; inv = 2.2; power = Math.max(1, power - 1); K.shake(18); K.noise(.5, .35, 200); K.sfx(160, .5, 'sawtooth', .14, -100); K.burst(me.x, me.y, ['#ffb347', '#fff'], 24, 300, { gravity: 0, life: .5 }); ebul = [];
    if (lives <= 0) { dead = true; K.over({ title: 'Shot down!', text: `You flew ${Math.floor(t)} seconds and scored ${K.score}.` }); }
  }
  /* ---------- update ---------- */
  GAME.update = dt => {
    for (const c of clouds) { c.x -= 200 * c.s * dt; if (c.x < -200) { c.x = W + 200; c.y = Math.random() * H; } }
    for (const h of hills) { h.x -= 90 * dt; if (h.x < -160) h.x += 1600; }
    if (dead) return;
    t += dt; inv -= dt; shield -= dt;
    if (keys.KeyW || keys.ArrowUp) me.ty -= 520 * dt; if (keys.KeyS || keys.ArrowDown) me.ty += 520 * dt; if (keys.KeyA || keys.ArrowLeft) me.tx -= 520 * dt; if (keys.KeyD || keys.ArrowRight) me.tx += 520 * dt;
    me.tx = K.clamp(me.tx, 40, W - 40); me.ty = K.clamp(me.ty, 40, H - 40);
    const py = me.y; me.x += (me.tx - me.x) * Math.min(1, dt * 12); me.y += (me.ty - me.y) * Math.min(1, dt * 12); me.tilt = K.clamp((me.y - py) / dt / 600, -1, 1);
    fireT -= dt; if (fireT <= 0) { fireT = .11; const n = [1, 2, 3, 3, 5][power - 1], sp = [0, .08, .12, .1, .14][power - 1]; for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * sp; bul.push({ x: me.x + 40, y: me.y + (n === 2 ? (i ? 8 : -8) : 0), vx: Math.cos(a) * 1000, vy: Math.sin(a) * 1000, d: power >= 4 ? 1.5 : 1 }); } if (!K.bot && Math.random() < .3) K.sfx(1400, .02, 'square', .015); }
    waveT -= dt; if (waveT <= 0 && !boss) { waveT = Math.max(1.4, 3.2 - t / 90); wave(); }
    bossT -= dt; if (bossT <= 0 && !boss) { boss = { boss: true, k: 'boss', x: W + 160, y: H / 2, hp: 400 + t * 3, max: 400 + t * 3, r: 90, pts: 1000, ph: 0, fire: 0 }; K.toast('WARNING: BOSS!'); K.sfx(90, 1.5, 'sawtooth', .14, 40); }
    for (const f of foes) {
      f.flash = (f.flash || 0) - dt;
      if (f.k === 'sine') { f.x -= 230 * dt; f.y = f.y0 + Math.sin(t * 3 + f.ph) * 90; }
      if (f.k === 'line') f.x -= 300 * dt;
      if (f.k === 'dive') { f.x -= 260 * dt; f.y += (me.y - f.y) * dt * 1.2; }
      if (f.k === 'tank' || f.k === 'gunner') { f.x -= (f.x > W - 200 ? 160 : 20) * dt; f.fire -= dt; if (f.fire <= 0) { f.fire = f.k === 'tank' ? 1.2 : 1.6; if (f.k === 'tank') for (let i = -2; i <= 2; i++) shootAt(f.x, f.y, 260, i * .18); else shootAt(f.x, f.y, 330); } }
      if (K.dist(f.x, f.y, me.x, me.y) < f.r + 18) { lose(); hit(f, 99); }
    }
    if (boss) {
      const b = boss; b.flash = (b.flash || 0) - dt; b.x += ((W - 200) - b.x) * dt; b.y = H / 2 + Math.sin(t * .8) * 200; b.fire -= dt; b.ph += dt;
      if (b.fire <= 0) { const p = Math.floor(b.ph / 4) % 3; if (p === 0) { b.fire = .9; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + b.ph; ebul.push({ x: b.x, y: b.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220 }); } } else if (p === 1) { b.fire = .14; shootAt(b.x - 60, b.y, 380); } else { b.fire = .5; for (let i = -3; i <= 3; i++) shootAt(b.x - 60, b.y, 300, i * .12); } }
      if (K.dist(b.x, b.y, me.x, me.y) < b.r) lose();
    }
    for (const s of bul) { s.x += s.vx * dt; s.y += s.vy * dt; for (const f of boss ? [...foes, boss] : foes) if (!f.dead && !s.hit && K.dist(s.x, s.y, f.x, f.y) < f.r + 6) { s.hit = true; hit(f, s.d); K.burst(s.x, s.y, ['#fff'], 2, 100, { gravity: 0, life: .15, size: 4 }); } }
    bul = bul.filter(s => !s.hit && s.x < W + 40);
    for (const b of ebul) { b.x += b.vx * dt; b.y += b.vy * dt; if (K.dist(b.x, b.y, me.x, me.y) < 12) { b.gone = true; lose(); } }
    ebul = ebul.filter(b => !b.gone && b.x > -40 && b.x < W + 40 && b.y > -40 && b.y < H + 40);
    foes = foes.filter(f => !f.dead && f.x > -80);
    for (const d of drops) { d.x -= 120 * dt; if (K.dist(d.x, d.y, me.x, me.y) < 40) { d.got = true; if (d.k === '$') K.coin(1, d.x, d.y); else { K.chime(660, [0, 7]); if (d.k === 'P') { if (power < 5) power++; else K.add(100, d.x, d.y); K.pop(d.x, d.y - 30, 'POWER UP!', '#4fd8ff', 30); } if (d.k === 'S') { shield = 12; K.pop(d.x, d.y - 30, 'SHIELD!', '#7dffb0', 30); } if (d.k === 'B') { bombs = Math.min(3, bombs + 1); K.pop(d.x, d.y - 30, '+1 BOMB', '#ffb23f', 30); } } } }
    drops = drops.filter(d => !d.got && d.x > -40);
    if (Math.floor(t) % 15 === 0 && Math.floor(t - dt) % 15 !== 0) K.add(25);
  };
  GAME.draw = gr => {
    const v = K.view, s = K.skin, k = Math.min(1, t / 240);
    const sky = gr.createLinearGradient(0, v.y0, 0, v.y1); sky.addColorStop(0, `hsl(${K.lerp(210, 260, k)},70%,${K.lerp(55, 25, k)}%)`); sky.addColorStop(1, `hsl(${K.lerp(200, 20, k)},80%,${K.lerp(78, 55, k)}%)`);
    gr.fillStyle = sky; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    gr.fillStyle = `rgba(30,60,50,${.5})`; for (const h of hills) { gr.beginPath(); gr.moveTo(h.x - 100, H); gr.quadraticCurveTo(h.x + 80, H - h.h * 2, h.x + 260, H); gr.fill(); }
    for (const c of clouds) { gr.globalAlpha = .55 * c.s; gr.fillStyle = '#fff'; for (const [dx, dy, r] of [[0, 0, 40], [40, -16, 34], [80, 0, 38]]) { gr.beginPath(); gr.arc(c.x + dx * c.s, c.y + dy * c.s, r * c.s, 0, 7); gr.fill(); } } gr.globalAlpha = 1;
    for (const d of drops) { gr.fillStyle = d.k === '$' ? '#ffcf2e' : d.k === 'P' ? '#4fd8ff' : d.k === 'S' ? '#7dffb0' : '#ffb23f'; gr.beginPath(); gr.arc(d.x, d.y, d.k === '$' ? 11 : 18, 0, 7); gr.fill(); if (d.k !== '$') { gr.fillStyle = '#0a1a2a'; gr.font = '20px "Racing Sans One"'; gr.textAlign = 'center'; gr.textBaseline = 'middle'; gr.fillText(d.k, d.x, d.y + 1); } }
    for (const f of foes) { gr.save(); gr.translate(f.x, f.y); gr.scale(-1, 1); const fs = { c: f.flash > 0 ? ['#fff', '#fff'] : f.k === 'tank' ? ['#6a6a7a', '#3a3a4a'] : f.k === 'gunner' ? ['#d24a3a', '#6a1a1a'] : ['#5a7a3a', '#2a3a1a'] }; plane(gr, fs, 0, 0, 0, f.r / 24); gr.restore(); }
    if (boss) { const b = boss; gr.save(); gr.translate(b.x, b.y); gr.fillStyle = b.flash > 0 ? '#fff' : '#4a3a6a'; gr.beginPath(); gr.ellipse(0, 0, 120, 60, 0, 0, 7); gr.fill(); gr.fillStyle = '#2a2040'; gr.fillRect(-60, -110, 30, 220); gr.fillRect(30, -110, 30, 220); gr.fillStyle = '#ff3d8b'; gr.beginPath(); gr.arc(-50, 0, 22, 0, 7); gr.fill(); gr.restore(); gr.fillStyle = 'rgba(0,0,0,.5)'; gr.fillRect(340, 84, 600, 14); gr.fillStyle = '#ff3d8b'; gr.fillRect(340, 84, 600 * Math.max(0, b.hp / b.max), 14); }
    gr.fillStyle = '#fff'; for (const b of bul) gr.fillRect(b.x - 8, b.y - 2, 16, 4);
    for (const b of ebul) { gr.fillStyle = '#ff3d6b'; gr.beginPath(); gr.arc(b.x, b.y, 7, 0, 7); gr.fill(); gr.fillStyle = '#fff'; gr.beginPath(); gr.arc(b.x, b.y, 3, 0, 7); gr.fill(); }
    if (!dead && (inv <= 0 || Math.floor(K.t * 12) % 2)) { plane(gr, s, me.x, me.y, me.tilt || 0); if (shield > 0) { gr.strokeStyle = `rgba(125,255,176,${.5 + Math.sin(K.t * 8) * .2})`; gr.lineWidth = 4; gr.beginPath(); gr.arc(me.x, me.y, 52, 0, 7); gr.stroke(); } }
    gr.font = '22px "Racing Sans One"'; gr.textAlign = 'left'; gr.textBaseline = 'middle'; gr.fillStyle = '#fff';
    gr.fillText('✈'.repeat(Math.max(0, lives)), 70, 30); gr.fillText(`POWER ${'▮'.repeat(power)}${'▯'.repeat(5 - power)}`, 70, 60); gr.fillText(`BOMBS ${bombs} [B]`, 70, 88);
  };
})();
