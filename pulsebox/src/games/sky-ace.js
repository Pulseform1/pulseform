/* Sky Ace: a side-scrolling shoot-'em-up across four stages (coast, canyon, storm, stratosphere). Your plane fires on
   its own; dodge bullets, grab power-ups, chain kills for a score multiplier, and take down the boss at the end of
   each stage: the Sky Fortress, the Rotor Gunship and the Storm Dreadnought. */
const GAME = {
  id: 'sky-ace', title: 'Sky Ace', tagline: 'Fly, fire, dodge. Beat the bosses. Chase the high score.',
  font: 'Racing Sans One', accent: '#4fd8ff', accent2: '#ffb23f', bg: '#2a6ab0', scoreLabel: 'Score',
  how: ['Drag anywhere to fly (the plane follows your finger), or use WASD / arrow keys.', 'You shoot by yourself. P = more guns, M = homing missiles, S = shield, B = bomb (Space or B to use).', 'Chain kills quickly for a score multiplier. Each stage ends with a boss.'],
  skins: [
    { name: 'Falcon', price: 0, c: ['#e6eef6', '#d23a3a'] }, { name: 'Viper', price: 60, c: ['#7dffb0', '#1a6a3a'] }, { name: 'Raven', price: 150, c: ['#3a3a4a', '#ff3d8b'] },
    { name: 'Sunbird', price: 250, c: ['#ffd23f', '#ff6a2a'] }, { name: 'Ghost', price: 400, c: ['#c8f0ff', '#6a7aff'] }, { name: 'Royal', price: 700, c: ['#b07cff', '#ffe36e'] },
  ],
};
(() => {
  const STAGES = [
    { n: 'Coastline', sky: ['#4a9ae8', '#bfe6ff'], far: '#6a9ac8', ground: 'sea', gc: ['#1f7ab8', '#0f4a80'], sun: '#fff6c0', cloud: '#ffffff' },
    { n: 'Red Canyon', sky: ['#e86a3a', '#ffd08a'], far: '#a8503a', ground: 'desert', gc: ['#d88a4a', '#9a5a2a'], sun: '#ffe0a0', cloud: '#ffe8d8' },
    { n: 'Storm Front', sky: ['#141a2e', '#3a4a6a'], far: '#22283e', ground: 'sea', gc: ['#1a2a3a', '#0a1420'], sun: null, cloud: '#6a7590', rain: 1 },
    { n: 'Stratosphere', sky: ['#04061a', '#1a3a8a'], far: '#2a4aa0', ground: 'earth', gc: ['#3a7ad8', '#0a2a6a'], sun: '#ffffff', cloud: '#c8d8ff', stars: 1 },
  ];
  let me, foes, bul, ebul, drops, fx, lives, power, missiles, shield, bombs, inv, t, waveT, boss, keys, drag, fireT, misT, dead, stage, stageT, chain, chainT, best, clouds, far, ground, bolt, bossCD, shake2;
  const SKY = () => STAGES[stage % STAGES.length];
  GAME.reset = () => {
    me = { x: 220, y: H / 2, tx: 220, ty: H / 2, tilt: 0 }; foes = []; bul = []; ebul = []; drops = []; fx = []; lives = 3; power = 1; missiles = 0; shield = 0; bombs = 2; inv = 2; t = 0; waveT = 1.2; boss = null; keys = {}; drag = null; fireT = 0; misT = 0; dead = false;
    stage = 0; stageT = 2.6; chain = 0; chainT = 0; best = 0; bolt = 0; bossCD = 70; shake2 = 0;
    clouds = Array.from({ length: 16 }, (_, i) => ({ x: Math.random() * 1500, y: K.rand(40, H - 200), s: K.rand(.4, 1.4), front: i < 2 }));
    far = Array.from({ length: 9 }, (_, i) => ({ x: i * 220, h: K.rand(60, 160), w: K.rand(140, 260) }));
    ground = Array.from({ length: 14 }, (_, i) => ({ x: i * 120, k: K.irand(0, 3) }));
  };
  /* ---------- drawing the aircraft ---------- */
  function rgba(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  function shade(h, k) { const n = parseInt(h.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
  // a fighter facing right, about 110 px long at sc = 1
  function jet(gr, c0, c1, x, y, tilt, sc, flash, burner = 1) {
    gr.save(); gr.translate(x, y); gr.rotate(tilt * .22); gr.scale(sc, sc);
    if (burner) { const f = .7 + Math.random() * .5; const g = gr.createLinearGradient(-50, 0, -50 - 40 * f, 0); g.addColorStop(0, 'rgba(255,255,220,.95)'); g.addColorStop(.4, 'rgba(255,170,60,.8)'); g.addColorStop(1, 'rgba(255,80,30,0)'); gr.fillStyle = g; gr.beginPath(); gr.moveTo(-48, -6); gr.lineTo(-50 - 46 * f, 0); gr.lineTo(-48, 6); gr.fill(); }
    const body = flash ? '#ffffff' : c0, acc = flash ? '#ffffff' : c1;
    gr.fillStyle = flash ? '#fff' : shade(acc, -.25); gr.beginPath(); gr.moveTo(-6, 4); gr.lineTo(-30, 30); gr.lineTo(-16, 30); gr.lineTo(16, 6); gr.fill();   // far wing
    const g = gr.createLinearGradient(0, -12, 0, 12); g.addColorStop(0, flash ? '#fff' : shade(body, .25)); g.addColorStop(.6, body); g.addColorStop(1, flash ? '#fff' : shade(body, -.35));
    gr.fillStyle = g; gr.beginPath(); gr.moveTo(56, 2); gr.quadraticCurveTo(44, -10, 10, -11); gr.lineTo(-40, -8); gr.lineTo(-50, -4); gr.lineTo(-50, 6); gr.lineTo(-30, 9); gr.quadraticCurveTo(30, 12, 56, 2); gr.fill();
    gr.strokeStyle = 'rgba(0,0,0,.25)'; gr.lineWidth = 1.2; gr.beginPath(); gr.moveTo(-20, -6); gr.lineTo(-20, 8); gr.moveTo(8, -9); gr.lineTo(8, 10); gr.stroke();
    gr.fillStyle = acc; gr.beginPath(); gr.moveTo(-26, -7); gr.lineTo(-48, -32); gr.lineTo(-36, -32); gr.lineTo(-14, -8); gr.fill();   // tail fin
    gr.beginPath(); gr.moveTo(-4, 0); gr.lineTo(-34, -20 * 0); gr.lineTo(-38, 22); gr.lineTo(-22, 22); gr.lineTo(18, 2); gr.fill();     // near wing
    gr.fillStyle = flash ? '#fff' : shade(acc, .3); gr.fillRect(-24, 16, 16, 3);
    const cg = gr.createLinearGradient(18, -16, 18, -4); cg.addColorStop(0, '#d8f6ff'); cg.addColorStop(1, '#2a6ab0'); gr.fillStyle = cg; gr.beginPath(); gr.ellipse(20, -9, 15, 7, -.08, Math.PI, 0); gr.fill();
    gr.fillStyle = 'rgba(255,255,255,.7)'; gr.beginPath(); gr.ellipse(16, -12, 6, 2, -.2, 0, 7); gr.fill();
    gr.fillStyle = acc; gr.fillRect(-46, -2, 6, 6);
    gr.restore();
  }
  GAME.drawSkin = (gr, s) => jet(gr, s.c[0], s.c[1], 6, 0, 0, .8, false);
  function bomber(gr, f, x, y, sc) {
    gr.save(); gr.translate(x, y); gr.scale(-sc, sc); const fl = f.flash > 0;
    for (const ex of [-10, 30]) { gr.fillStyle = fl ? '#fff' : '#3a3e46'; gr.beginPath(); gr.roundRect(ex - 14, 14, 40, 14, 6); gr.fill(); gr.fillStyle = 'rgba(200,220,255,.3)'; gr.beginPath(); gr.ellipse(ex + 26, 21, 3, 12 * Math.abs(Math.sin(K.t * 40 + ex)), 0, 0, 7); gr.fill(); }
    const g = gr.createLinearGradient(0, -20, 0, 20); g.addColorStop(0, fl ? '#fff' : '#9aa0aa'); g.addColorStop(1, fl ? '#fff' : '#4a4e58'); gr.fillStyle = g;
    gr.beginPath(); gr.moveTo(80, 0); gr.quadraticCurveTo(70, -20, 30, -20); gr.lineTo(-70, -12); gr.lineTo(-80, 0); gr.lineTo(-70, 12); gr.lineTo(30, 18); gr.quadraticCurveTo(70, 18, 80, 0); gr.fill();
    gr.fillStyle = fl ? '#fff' : '#5a2a2a'; gr.beginPath(); gr.moveTo(-50, -10); gr.lineTo(-80, -50); gr.lineTo(-62, -50); gr.lineTo(-30, -12); gr.fill();
    gr.fillStyle = fl ? '#fff' : '#6a6e78'; gr.beginPath(); gr.moveTo(10, 2); gr.lineTo(-30, 44); gr.lineTo(-10, 44); gr.lineTo(40, 4); gr.fill();
    gr.fillStyle = '#a8d8ff'; gr.beginPath(); gr.ellipse(58, -8, 12, 7, 0, 0, 7); gr.fill();
    gr.fillStyle = '#c8302a'; gr.beginPath(); gr.arc(-6, -2, 7, 0, 7); gr.fill(); gr.fillStyle = '#fff'; gr.beginPath(); gr.arc(-6, -2, 3, 0, 7); gr.fill();
    gr.restore();
  }
  function heli(gr, f, x, y, sc) {
    gr.save(); gr.translate(x, y); gr.scale(-sc, sc); const fl = f.flash > 0;
    gr.strokeStyle = fl ? '#fff' : '#2a3a2a'; gr.lineWidth = 6; gr.beginPath(); gr.moveTo(-20, -4); gr.lineTo(-80, -10); gr.stroke();
    gr.fillStyle = 'rgba(30,40,30,.35)'; gr.beginPath(); gr.ellipse(-82, -10, 6, 18 * Math.abs(Math.sin(K.t * 30)), 0, 0, 7); gr.fill();
    const g = gr.createLinearGradient(0, -24, 0, 22); g.addColorStop(0, fl ? '#fff' : '#7a9a5a'); g.addColorStop(1, fl ? '#fff' : '#2a3a1a'); gr.fillStyle = g;
    gr.beginPath(); gr.ellipse(4, 0, 40, 22, 0, 0, 7); gr.fill();
    gr.fillStyle = '#9ad8ff'; gr.beginPath(); gr.ellipse(28, -4, 14, 12, 0, -1.4, 1.2); gr.fill();
    gr.fillStyle = '#222'; gr.fillRect(-2, -30, 8, 10); gr.fillStyle = 'rgba(40,40,40,.4)'; gr.beginPath(); gr.ellipse(2, -32, 70, 5, 0, 0, 7); gr.fill();
    gr.fillStyle = fl ? '#fff' : '#3a3a3a'; gr.fillRect(-10, 22, 46, 4); gr.fillRect(36, 10, 18, 6);
    gr.restore();
  }
  function drone(gr, f, x, y, sc) {
    gr.save(); gr.translate(x, y); gr.scale(sc, sc); gr.rotate(K.t * 4);
    gr.fillStyle = f.flash > 0 ? '#fff' : '#3a2a4a'; for (let i = 0; i < 6; i++) { gr.rotate(Math.PI / 3); gr.beginPath(); gr.moveTo(10, -6); gr.lineTo(26, 0); gr.lineTo(10, 6); gr.fill(); }
    gr.beginPath(); gr.arc(0, 0, 15, 0, 7); gr.fill(); gr.rotate(-K.t * 4);
    const eg = gr.createRadialGradient(0, 0, 1, 0, 0, 10); eg.addColorStop(0, '#fff'); eg.addColorStop(.4, '#ff3a5a'); eg.addColorStop(1, '#6a0a1a'); gr.fillStyle = eg; gr.beginPath(); gr.arc(0, 0, 9, 0, 7); gr.fill();
    gr.restore();
  }
  function ship(gr, f, x, y) {
    gr.save(); gr.translate(x, y + Math.sin(K.t * 2 + x * .01) * 3); const fl = f.flash > 0;
    gr.fillStyle = fl ? '#fff' : '#4a5260'; gr.beginPath(); gr.moveTo(-90, -10); gr.lineTo(90, -10); gr.lineTo(70, 16); gr.lineTo(-76, 16); gr.fill();
    gr.fillStyle = fl ? '#fff' : '#6a7280'; gr.fillRect(-40, -34, 50, 24); gr.fillRect(-24, -52, 14, 18);
    const a = Math.atan2(me.y - (y - 20), me.x - (x + 40)); gr.save(); gr.translate(40, -16); gr.rotate(a); gr.fillStyle = '#2a2e36'; gr.fillRect(0, -4, 34, 8); gr.restore(); gr.fillStyle = '#3a3e48'; gr.beginPath(); gr.arc(40, -16, 12, Math.PI, 0); gr.fill();
    gr.fillStyle = 'rgba(255,255,255,.5)'; gr.fillRect(-96, 14, 200, 3);
    gr.restore();
  }
  /* ---------- waves ---------- */
  function shootAt(x, y, sp = 300, spread = 0, big = false) { const a = Math.atan2(me.y - y, me.x - x) + spread; ebul.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, big }); }
  const hpScale = () => 1 + stage * .6 + t / 200;
  function wave() {
    const lv = Math.min(5, 1 + Math.floor(t / 25)), k = K.irand(0, lv), y0 = K.rand(120, H - 220), hp = 2 * hpScale(), st = SKY();
    const add = o => foes.push(Object.assign({ hp, max: hp, r: 24, pts: 100, t: 0, flash: 0 }, o));
    if (k === 0) for (let i = 0; i < 5; i++) add({ k: 'sine', x: W + 60 + i * 80, y: y0, y0, ph: i * .55 });
    if (k === 1) for (let i = 0; i < 5; i++) add({ k: 'line', x: W + 60 + Math.abs(i - 2) * 70, y: y0 + (i - 2) * 64 });
    if (k === 2) for (let i = 0; i < 4; i++) add({ k: 'loop', x: W + 60 + i * 90, y: y0, y0, ph: 0, fire: K.rand(1, 2.5) });
    if (k === 3) add({ k: 'bomber', x: W + 120, y: K.rand(130, H - 260), hp: hp * 14, max: hp * 14, r: 60, pts: 800, fire: 1.2 });
    if (k === 4) for (let i = 0; i < 2; i++) add({ k: 'heli', x: W + 80 + i * 160, y: 150 + i * 220, hp: hp * 6, max: hp * 6, r: 38, pts: 400, fire: K.rand(.8, 1.6) });
    if (k === 5) for (let i = 0; i < 6; i++) add({ k: 'drone', x: W + 40 + i * 50, y: K.rand(80, H - 220), r: 20, pts: 150, hp: hp * .8, max: hp * .8 });
    if (st.ground === 'sea' && Math.random() < .35) add({ k: 'ship', x: W + 120, y: H - 64, hp: hp * 8, max: hp * 8, r: 60, pts: 600, fire: 1.4 });
  }
  const BOSSES = [
    { n: 'SKY FORTRESS', hp: 900, parts: [[-120, -40], [-20, -60], [80, -40]] },
    { n: 'ROTOR GUNSHIP', hp: 1100, parts: [[-90, 20], [60, 20]] },
    { n: 'STORM DREADNOUGHT', hp: 1400, parts: [[-140, 30], [-40, 46], [60, 46], [160, 30]] },
  ];
  function spawnBoss() {
    const d = BOSSES[stage % 3], hp = d.hp * (1 + stage * .5);
    boss = { boss: true, kind: stage % 3, n: d.n, x: W + 300, y: H / 2 - 40, hp, max: hp, r: 110, pts: 20000, ph: 0, fire: 1.5, flash: 0, parts: d.parts.map(([px, py]) => ({ px, py, hp: hp * .12, max: hp * .12, fire: K.rand(.5, 1.5) })) };
    K.toast('WARNING: ' + d.n); K.sfx(90, 1.5, 'sawtooth', .12, 40); shake2 = 1.2;
  }
  /* ---------- input ---------- */
  GAME.down = (x, y) => { drag = { x, y, mx: me.tx, my: me.ty }; };
  GAME.move = (x, y) => { if (drag) { me.tx = K.clamp(drag.mx + (x - drag.x) * 1.3, 50, W - 50); me.ty = K.clamp(drag.my + (y - drag.y) * 1.3, 50, H - 50); } };
  GAME.up = () => { drag = null; };
  GAME.key = (c, d) => { keys[c] = d; if (d && (c === 'KeyB' || c === 'Space')) bomb(); };
  function bomb() {
    if (bombs <= 0 || dead) return; bombs--; K.flash('#fff', .9); K.shake(24); K.noise(.9, .4, 70); K.sfx(60, 1, 'sawtooth', .12, -30);
    fx.push({ k: 'wave', x: me.x, y: me.y, t: 0, life: .9, r: 1400 }); for (const b of ebul) fx.push({ k: 'spark', x: b.x, y: b.y, t: 0, life: .3 }); ebul = [];
    for (const f of foes) hit(f, 40 * hpScale()); if (boss) hit(boss, 60 * hpScale());
  }
  // the bot scores spots it could reach soon: far from where bullets and planes will be, lined up with a target
  GAME.bot = () => {
    const tgt = boss ? { x: boss.x, y: boss.y + (boss.parts.find(p => p.hp > 0) || { py: 0 }).py } : foes.filter(f => f.k !== 'ship').reduce((b, f) => !b || f.x < b.x ? f : b, null) || foes[0];
    const drop = drops.filter(d => d.x > me.x - 30 && d.x < 900).sort((a, b) => a.x - b.x)[0];
    let bestS = -1e9, bx = me.x, by = me.y;
    for (let gx = -2; gx <= 2; gx++) for (let gy = -3; gy <= 3; gy++) {
      const x = K.clamp(me.x + gx * 70, 80, 640), y = K.clamp(me.y + gy * 55, 60, H - 110); let sc = 0;
      for (const b of ebul) for (const dt of [.12, .25, .4]) { const d = K.dist(b.x + b.vx * dt, b.y + b.vy * dt, x, y); if (d < 70) sc -= (70 - d) * 6 / (dt * 4); }
      for (const f of foes) { const d = K.dist(f.x - 60, f.y, x, y); if (d < f.r + 90) sc -= (f.r + 90 - d) * 5; }
      if (boss) { if (Math.abs(boss.x - x) < 260 && Math.abs(boss.y - y) < 120) sc -= 2000; }
      if (tgt) sc -= Math.abs(tgt.y - y) * 1.2;
      if (drop) sc -= K.dist(drop.x, drop.y, x, y) * .6;
      sc -= Math.abs(x - 260) * .4 + K.dist(x, y, me.x, me.y) * .15;
      if (sc > bestS) { bestS = sc; bx = x; by = y; }
    }
    if (ebul.filter(b => K.dist(b.x, b.y, me.x, me.y) < 80).length > 3 && bombs > 0 && inv <= 0) bomb();
    me.tx = bx; me.ty = by;
  };
  function explode(x, y, big) {
    const n = big ? 3 : 1; for (let i = 0; i < n; i++) fx.push({ k: 'boom', x: x + K.rand(-30, 30) * (big ? 2 : 0), y: y + K.rand(-20, 20) * (big ? 2 : 0), t: -i * .12, life: .7, r: big ? 90 : 42 });
    for (let i = 0; i < (big ? 14 : 5); i++) { const a = Math.random() * 6.28, s = K.rand(60, big ? 420 : 240); fx.push({ k: 'debris', x, y, vx: Math.cos(a) * s - 80, vy: Math.sin(a) * s - 80, t: 0, life: K.rand(.6, 1.2), rot: Math.random() * 6 }); }
    for (let i = 0; i < (big ? 6 : 3); i++) fx.push({ k: 'smoke', x: x + K.rand(-20, 20), y: y + K.rand(-20, 20), t: 0, life: K.rand(1, 1.8), r: K.rand(14, big ? 40 : 24) });
    if (big) fx.push({ k: 'ring', x, y, t: 0, life: .5 });
  }
  function hit(f, d) {
    f.hp -= d; f.flash = .06;
    if (f.hp <= 0 && !f.dead) {
      f.dead = true; chain++; chainT = 1.4; best = Math.max(best, chain); const mul = Math.min(8, 1 + Math.floor(chain / 5));
      K.add(f.pts * mul); if (chain >= 5 && chain % 5 === 0) K.pop(f.x, f.y - 50, `CHAIN x${mul}`, '#ffe36e', 30);
      explode(f.x, f.y, f.boss || f.r > 50); K.noise(f.boss ? .9 : .18, f.boss ? .4 : .12, f.boss ? 60 : 400); K.shake(f.boss ? 30 : f.r > 50 ? 10 : 4);
      const r = Math.random();
      if (f.boss) { for (let i = 0; i < 6; i++) drops.push({ x: f.x + K.rand(-80, 80), y: f.y + K.rand(-80, 80), k: i < 2 ? 'P' : i < 3 ? 'M' : 'S' }); }
      else if (f.r > 50 || r < .07) drops.push({ x: f.x, y: f.y, k: K.pick(['P', 'P', 'M', 'S', 'B']) }); else if (r < .35) drops.push({ x: f.x, y: f.y, k: '$' });
      if (f.boss) { K.chime(392, [0, 4, 7, 12, 16]); if (!K.bot) K.coin(10); lives = Math.min(5, lives + 1); K.pop(me.x, me.y - 60, '+1 LIFE', '#7dffb0', 30); boss = null; bossCD = 70; stage++; stageT = 3; K.flash('#fff', .8); ebul = []; }
    }
  }
  function lose() {
    if (inv > 0) return; if (shield > 0) { shield = 0; inv = 1; K.sfx(400, .3, 'sine', .1, 400); fx.push({ k: 'ring', x: me.x, y: me.y, t: 0, life: .4 }); return; }
    lives--; inv = 2.4; power = Math.max(1, power - 1); missiles = Math.max(0, missiles - 1); K.shake(20); K.noise(.5, .35, 200); K.sfx(160, .5, 'sawtooth', .14, -100); explode(me.x, me.y, true); ebul = []; chain = 0;
    if (lives <= 0) { dead = true; K.over({ title: 'Shot down!', text: `Stage ${stage + 1} (${SKY().n}). Best chain: ${best}.`, delay: 1200 }); }
  }
  /* ---------- update ---------- */
  GAME.update = dt => {
    const st = SKY(), speed = 1 + Math.min(.5, t / 400);
    for (const c of clouds) { c.x -= (c.front ? 420 : 160) * c.s * dt * speed; if (c.x < -300) { c.x = W + 300; c.y = K.rand(40, H - 200); } }
    for (const h of far) { h.x -= 30 * dt; if (h.x < -300) h.x += 9 * 220; }
    for (const g of ground) { g.x -= 260 * dt * speed; if (g.x < -140) g.x += 14 * 120; }
    for (const p of fx) { p.t += dt; if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.rot += dt * 8; } if (p.k === 'smoke') { p.x -= 120 * dt; p.y -= 16 * dt; } }
    fx = fx.filter(p => p.t < p.life); stageT -= dt; shake2 = Math.max(0, shake2 - dt);
    if (st.rain) { bolt -= dt; if (bolt < -K.rand(3, 8)) bolt = .25; }
    if (dead) return;
    t += dt; inv -= dt; shield -= dt; chainT -= dt; if (chainT <= 0) chain = 0;
    if (keys.KeyW || keys.ArrowUp) me.ty -= 560 * dt; if (keys.KeyS || keys.ArrowDown) me.ty += 560 * dt; if (keys.KeyA || keys.ArrowLeft) me.tx -= 560 * dt; if (keys.KeyD || keys.ArrowRight) me.tx += 560 * dt;
    me.tx = K.clamp(me.tx, 50, W - 50); me.ty = K.clamp(me.ty, 50, H - 50);
    const py = me.y; me.x += (me.tx - me.x) * Math.min(1, dt * 12); me.y += (me.ty - me.y) * Math.min(1, dt * 12); me.tilt += (K.clamp((me.y - py) / dt / 500, -1, 1) - me.tilt) * Math.min(1, dt * 10);
    fireT -= dt; if (fireT <= 0) { fireT = .1; const n = [1, 2, 3, 4, 5][power - 1], sp = [0, .06, .1, .09, .11][power - 1]; for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * sp; bul.push({ x: me.x + 50, y: me.y + 2 + (n === 2 ? (i ? 9 : -9) : 0), vx: Math.cos(a) * 1150, vy: Math.sin(a) * 1150, d: power >= 4 ? 1.4 : 1 }); } if (!K.bot && Math.random() < .3) K.sfx(1500, .02, 'square', .012); }
    if (missiles) { misT -= dt; if (misT <= 0) { misT = 1 - missiles * .2; for (let i = 0; i < missiles; i++) bul.push({ x: me.x, y: me.y + (i % 2 ? 14 : -14), vx: 200, vy: (i % 2 ? 1 : -1) * 120, d: 4, mis: true, life: 2.4 }); } }
    waveT -= dt; if (waveT <= 0 && !boss) { waveT = Math.max(1.3, 3 - t / 120); wave(); }
    bossCD -= dt; if (bossCD <= 0 && !boss && !foes.length) spawnBoss(); else if (bossCD <= 0 && !boss) waveT = 99;
    for (const f of foes) {
      f.flash -= dt; f.t += dt;
      if (f.k === 'sine') { f.x -= 260 * dt; f.y = f.y0 + Math.sin(f.t * 3 + f.ph) * 90; }
      if (f.k === 'line') f.x -= 330 * dt;
      if (f.k === 'loop') { if (f.t < 1.2) f.x -= 300 * dt; else if (f.t < 3) { const a = (f.t - 1.2) / 1.8 * 6.283; f.x -= Math.cos(a) * 300 * dt; f.y = f.y0 - Math.sin(a) * 110; } else f.x -= 360 * dt; }
      if (f.k === 'drone') { const a = Math.atan2(me.y - f.y, me.x - f.x); f.x += (Math.cos(a) * 160 - 140) * dt; f.y += Math.sin(a) * 200 * dt; }
      if (f.k === 'bomber') f.x -= (f.x > W - 260 ? 150 : 25) * dt;
      if (f.k === 'heli') { f.x -= (f.x > W - 220 ? 180 : 0) * dt; f.y += Math.sin(f.t * 1.5) * 60 * dt; if (f.t > 12) f.x -= 200 * dt; }
      if (f.k === 'ship') f.x -= 120 * dt;
      if (f.fire !== undefined) { f.fire -= dt; if (f.fire <= 0 && f.x < W - 20) {
        if (f.k === 'bomber') { f.fire = 1.3; for (let i = -2; i <= 2; i++) shootAt(f.x - 40, f.y, 250, i * .16); }
        else if (f.k === 'heli') { f.fire = 2; for (let i = 0; i < 3; i++) setTimeout(() => !f.dead && shootAt(f.x - 30, f.y + 10, 360), i * 120); }
        else if (f.k === 'ship') { f.fire = 1.6; shootAt(f.x + 40, f.y - 30, 320, 0, true); }
        else { f.fire = 9; shootAt(f.x, f.y, 300); } } }
      if (K.dist(f.x, f.y, me.x, me.y) < f.r + 10) { lose(); if (f.r < 50) hit(f, 99); }
    }
    if (boss) {
      const b = boss; b.flash -= dt; b.ph += dt; b.x += ((W - 260) - b.x) * dt * .8;
      b.y = H / 2 - 50 + Math.sin(b.ph * (.6 + b.kind * .15)) * (b.kind === 1 ? 200 : 140);
      for (const p of b.parts) if (p.hp > 0) { p.fire -= dt; if (p.fire <= 0 && b.x < W - 100) { p.fire = K.rand(1.1, 1.9); const px = b.x + p.px, py = b.y + p.py; if (b.kind === 1) for (let i = -1; i <= 1; i++) shootAt(px, py, 330, i * .1); else shootAt(px, py, 300); } }
      b.fire -= dt; if (b.fire <= 0) {
        const phase = Math.floor(b.ph / 5) % 3, lowHp = b.hp < b.max * .4;
        if (phase === 0) { b.fire = lowHp ? .7 : 1; const n = 14 + b.kind * 2; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + b.ph; ebul.push({ x: b.x, y: b.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210 }); } }
        else if (phase === 1) { b.fire = .12; shootAt(b.x - 90, b.y + 10, 400, Math.sin(b.ph * 8) * .25); }
        else { b.fire = .55; for (let i = -3; i <= 3; i++) shootAt(b.x - 90, b.y, 300, i * .13, i === 0); }
      }
      if (Math.abs(b.x - me.x) < 200 && Math.abs(b.y - me.y) < 70) lose();
    }
    for (const s of bul) {
      if (s.mis) { s.life -= dt; const tg = boss || foes.find(f => !f.dead && f.x > s.x - 40); if (tg) { const a = Math.atan2(tg.y - s.y, tg.x - s.x), cur = Math.atan2(s.vy, s.vx), sp = Math.min(900, Math.hypot(s.vx, s.vy) + 900 * dt); let da = a - cur; da = Math.atan2(Math.sin(da), Math.cos(da)); const na = cur + K.clamp(da, -5 * dt, 5 * dt); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; } if (Math.random() < .5) fx.push({ k: 'smoke', x: s.x, y: s.y, t: 0, life: .5, r: 6 }); }
      s.x += s.vx * dt; s.y += s.vy * dt;
      const targets = boss ? [...foes, boss] : foes;
      for (const f of targets) if (!f.dead && !s.hit) {
        if (f.boss) { for (const p of f.parts) if (p.hp > 0 && K.dist(s.x, s.y, f.x + p.px, f.y + p.py) < 30) { s.hit = true; p.hp -= s.d; f.flash = .05; if (p.hp <= 0) { explode(f.x + p.px, f.y + p.py, true); K.add(2000); K.noise(.4, .3, 150); } break; } if (!s.hit && Math.abs(s.x - f.x) < 180 && Math.abs(s.y - f.y) < 60) { s.hit = true; hit(f, s.d * (f.parts.some(p => p.hp > 0) ? .35 : 1)); } }
        else if (K.dist(s.x, s.y, f.x, f.y) < f.r + 6) { s.hit = true; hit(f, s.d); }
        if (s.hit) { fx.push({ k: 'spark', x: s.x, y: s.y, t: 0, life: .18 }); break; }
      }
    }
    bul = bul.filter(s => !s.hit && s.x < W + 40 && s.x > -40 && s.y > -40 && s.y < H + 40 && (!s.mis || s.life > 0));
    for (const b of ebul) { b.x += b.vx * dt; b.y += b.vy * dt; if (K.dist(b.x, b.y, me.x, me.y) < (b.big ? 14 : 10)) { b.gone = true; lose(); } }
    ebul = ebul.filter(b => !b.gone && b.x > -40 && b.x < W + 40 && b.y > -40 && b.y < H + 40);
    foes = foes.filter(f => !f.dead && f.x > -160);
    for (const d of drops) {
      d.x -= 110 * dt; d.t = (d.t || 0) + dt; if (d.k === '$' && K.dist(d.x, d.y, me.x, me.y) < 140) { d.x += (me.x - d.x) * dt * 6; d.y += (me.y - d.y) * dt * 6; }
      if (K.dist(d.x, d.y, me.x, me.y) < 44) { d.got = true; if (d.k === '$') { K.add(50); K.coin(1, d.x, d.y); K.sfx(1800, .05, 'sine', .05); } else { K.chime(660, [0, 7, 12]);
        if (d.k === 'P') { if (power < 5) power++; else K.add(1000, d.x, d.y); K.pop(d.x, d.y - 30, 'POWER UP!', '#4fd8ff', 30); }
        if (d.k === 'M') { if (missiles < 3) missiles++; else K.add(1000); K.pop(d.x, d.y - 30, 'MISSILES!', '#ff9a3a', 30); }
        if (d.k === 'S') { shield = 12; K.pop(d.x, d.y - 30, 'SHIELD!', '#7dffb0', 30); }
        if (d.k === 'B') { bombs = Math.min(5, bombs + 1); K.pop(d.x, d.y - 30, 'BOMB!', '#ffb23f', 30); } } }
    }
    drops = drops.filter(d => !d.got && d.x > -40);
  };
  /* ---------- drawing ---------- */
  function cloud(gr, x, y, s, col, a) { gr.globalAlpha = a; gr.fillStyle = col; for (const [dx, dy, r] of [[0, 0, 40], [40, -18, 36], [82, -4, 42], [120, 6, 30], [56, 12, 34]]) { gr.beginPath(); gr.arc(x + dx * s, y + dy * s, r * s, 0, 7); gr.fill(); } gr.fillStyle = 'rgba(0,0,0,.08)'; gr.beginPath(); gr.ellipse(x + 60 * s, y + 26 * s, 80 * s, 14 * s, 0, 0, 7); gr.fill(); gr.globalAlpha = 1; }
  GAME.draw = gr => {
    const v = K.view, st = SKY(), s = K.skin, sh = shake2 > 0 ? (Math.random() - .5) * 10 * shake2 : 0;
    gr.save(); gr.translate(sh, 0);
    const sky = gr.createLinearGradient(0, v.y0, 0, H); sky.addColorStop(0, st.sky[0]); sky.addColorStop(1, st.sky[1]); gr.fillStyle = sky; gr.fillRect(v.x0 - 20, v.y0, v.x1 - v.x0 + 40, v.y1 - v.y0);
    if (st.stars) for (let i = 0; i < 90; i++) { gr.fillStyle = `rgba(255,255,255,${.3 + .7 * Math.abs(Math.sin(K.t + i))})`; gr.fillRect((i * 173 - K.t * 8) % 1400 - 60, (i * 97) % 420, 2, 2); }
    if (st.sun) { const sx = 980, sy = 140, sg = gr.createRadialGradient(sx, sy, 10, sx, sy, 200); sg.addColorStop(0, rgba(st.sun.length === 7 ? st.sun : '#ffffff', .9)); sg.addColorStop(.25, rgba(st.sun, .35)); sg.addColorStop(1, rgba(st.sun, 0)); gr.fillStyle = sg; gr.fillRect(sx - 200, sy - 200, 400, 400); gr.fillStyle = st.sun; gr.beginPath(); gr.arc(sx, sy, 40, 0, 7); gr.fill(); }
    if (st.rain && bolt > 0) { gr.fillStyle = `rgba(220,230,255,${bolt * 1.4})`; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
    // far range: islands, mesas, storm clouds or the curve of the earth
    if (st.ground === 'earth') { const eg = gr.createRadialGradient(640, H + 1500, 1400, 640, H + 1500, 1620); eg.addColorStop(0, '#1a5ab8'); eg.addColorStop(.9, '#6ab0ff'); eg.addColorStop(1, 'rgba(160,210,255,0)'); gr.fillStyle = eg; gr.fillRect(v.x0, H - 260, v.x1 - v.x0, 300); }
    else for (const h of far) { gr.fillStyle = st.far; gr.beginPath(); if (st.ground === 'desert') { gr.moveTo(h.x, H - 90); gr.lineTo(h.x + 20, H - 90 - h.h); gr.lineTo(h.x + h.w - 20, H - 90 - h.h); gr.lineTo(h.x + h.w, H - 90); } else { gr.moveTo(h.x, H - 90); gr.quadraticCurveTo(h.x + h.w / 2, H - 90 - h.h * 1.2, h.x + h.w, H - 90); } gr.fill(); }
    for (const c of clouds) if (!c.front) cloud(gr, c.x, c.y, c.s, st.cloud, .55);
    // the ground band
    const gg = gr.createLinearGradient(0, H - 100, 0, H); gg.addColorStop(0, st.gc[0]); gg.addColorStop(1, st.gc[1]); gr.fillStyle = gg; if (st.ground !== 'earth') gr.fillRect(v.x0, H - 92, v.x1 - v.x0, v.y1 - H + 92);
    if (st.ground === 'sea') { gr.strokeStyle = 'rgba(255,255,255,.35)'; gr.lineWidth = 2; for (const g of ground) { gr.beginPath(); gr.moveTo(g.x, H - 70 + g.k * 14); gr.lineTo(g.x + 40, H - 70 + g.k * 14); gr.stroke(); } }
    if (st.ground === 'desert') for (const g of ground) { gr.fillStyle = 'rgba(90,50,20,.4)'; gr.beginPath(); gr.ellipse(g.x, H - 60 + g.k * 12, 30, 5, 0, 0, 7); gr.fill(); if (g.k === 0) { gr.fillStyle = '#4a6a2a'; gr.fillRect(g.x + 40, H - 86, 6, 24); gr.fillRect(g.x + 34, H - 78, 18, 4); } }
    for (const f of foes) if (f.k === 'ship') ship(gr, f, f.x, f.y);
    // power-ups
    for (const d of drops) {
      if (d.k === '$') { gr.save(); gr.translate(d.x, d.y); gr.scale(Math.cos(K.t * 6 + d.x), 1); gr.fillStyle = '#ffcf2e'; gr.beginPath(); gr.arc(0, 0, 12, 0, 7); gr.fill(); gr.fillStyle = '#c98a00'; gr.fillRect(-2, -7, 4, 14); gr.restore(); continue; }
      const col = d.k === 'P' ? '#4fd8ff' : d.k === 'M' ? '#ff9a3a' : d.k === 'S' ? '#7dffb0' : '#ffb23f', bob = Math.sin(K.t * 5 + d.x) * 4;
      gr.save(); gr.translate(d.x, d.y + bob); gr.shadowColor = col; gr.shadowBlur = 18; gr.fillStyle = col; gr.beginPath(); gr.roundRect(-18, -18, 36, 36, 10); gr.fill(); gr.shadowBlur = 0;
      gr.fillStyle = 'rgba(255,255,255,.45)'; gr.fillRect(-14, -14, 28, 8); gr.fillStyle = '#0a1a2a'; gr.font = '24px "Racing Sans One"'; gr.textAlign = 'center'; gr.textBaseline = 'middle'; gr.fillText(d.k, 0, 2); gr.restore();
    }
    // enemies
    for (const f of foes) {
      if (f.k === 'ship') continue;
      if (f.k === 'bomber') bomber(gr, f, f.x, f.y, .95);
      else if (f.k === 'heli') heli(gr, f, f.x, f.y, .9);
      else if (f.k === 'drone') drone(gr, f, f.x, f.y, 1);
      else { gr.save(); gr.translate(f.x, f.y); gr.scale(-1, 1); const pc = f.k === 'loop' ? ['#d24a3a', '#3a1a1a'] : f.k === 'line' ? ['#8a94a8', '#2a3048'] : ['#7a8a4a', '#2a3a1a']; jet(gr, pc[0], pc[1], 0, 0, 0, .76, f.flash > 0); gr.restore(); }
      if (f.max > 6 && f.hp < f.max) { gr.fillStyle = 'rgba(0,0,0,.5)'; gr.fillRect(f.x - 30, f.y - f.r - 12, 60, 5); gr.fillStyle = '#ff5a5a'; gr.fillRect(f.x - 30, f.y - f.r - 12, 60 * Math.max(0, f.hp / f.max), 5); }
    }
    if (boss) drawBoss(gr, boss);
    // your bullets
    for (const b of bul) { if (b.mis) { gr.save(); gr.translate(b.x, b.y); gr.rotate(Math.atan2(b.vy, b.vx)); gr.fillStyle = '#e8e8f0'; gr.fillRect(-10, -3, 20, 6); gr.fillStyle = '#ff6a2a'; gr.beginPath(); gr.moveTo(10, -3); gr.lineTo(16, 0); gr.lineTo(10, 3); gr.fill(); gr.fillStyle = '#ffd23f'; gr.beginPath(); gr.moveTo(-10, -3); gr.lineTo(-18 - Math.random() * 6, 0); gr.lineTo(-10, 3); gr.fill(); gr.restore(); continue; }
      const g = gr.createLinearGradient(b.x - 22, 0, b.x + 10, 0); g.addColorStop(0, 'rgba(255,240,150,0)'); g.addColorStop(1, '#fff8c0'); gr.fillStyle = g; gr.fillRect(b.x - 22, b.y - 2.5, 32, 5); }
    // the player
    if (!dead && (inv <= 0 || Math.floor(K.t * 12) % 2)) {
      jet(gr, s.c[0], s.c[1], me.x, me.y, me.tilt, 1.05, false);
      if (shield > 0) { gr.strokeStyle = `rgba(125,255,176,${.5 + Math.sin(K.t * 8) * .2})`; gr.lineWidth = 4; gr.beginPath(); gr.ellipse(me.x, me.y, 70, 44, 0, 0, 7); gr.stroke(); gr.fillStyle = 'rgba(125,255,176,.08)'; gr.fill(); }
      gr.fillStyle = '#fff'; gr.beginPath(); gr.arc(me.x + 4, me.y, 4, 0, 7); gr.fill(); gr.strokeStyle = '#ff3a5a'; gr.lineWidth = 2; gr.stroke();
    }
    // enemy bullets: glowing orbs
    for (const b of ebul) { const r = b.big ? 11 : 7; const g = gr.createRadialGradient(b.x, b.y, 1, b.x, b.y, r * 2); g.addColorStop(0, '#ffffff'); g.addColorStop(.35, '#ff4a7a'); g.addColorStop(1, 'rgba(255,40,100,0)'); gr.fillStyle = g; gr.beginPath(); gr.arc(b.x, b.y, r * 2, 0, 7); gr.fill(); }
    // effects
    for (const p of fx) {
      const k = Math.max(0, p.t / p.life); if (p.t < 0) continue;
      if (p.k === 'boom') { const r = p.r * (.4 + k * 1.1); const g = gr.createRadialGradient(p.x, p.y, 1, p.x, p.y, r); g.addColorStop(0, `rgba(255,255,220,${1 - k})`); g.addColorStop(.35, `rgba(255,170,50,${.9 * (1 - k)})`); g.addColorStop(.7, `rgba(220,60,20,${.6 * (1 - k)})`); g.addColorStop(1, 'rgba(60,20,10,0)'); gr.fillStyle = g; gr.beginPath(); gr.arc(p.x, p.y, r, 0, 7); gr.fill(); }
      else if (p.k === 'smoke') { gr.fillStyle = `rgba(70,70,80,${.45 * (1 - k)})`; gr.beginPath(); gr.arc(p.x, p.y, p.r * (1 + k), 0, 7); gr.fill(); }
      else if (p.k === 'debris') { gr.save(); gr.translate(p.x, p.y); gr.rotate(p.rot); gr.fillStyle = k < .4 ? '#ffd27a' : '#3a3a40'; gr.fillRect(-5, -2, 10, 4); gr.restore(); }
      else if (p.k === 'spark') { gr.strokeStyle = `rgba(255,255,200,${1 - k})`; gr.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = i * 1.57 + p.x; gr.beginPath(); gr.moveTo(p.x, p.y); gr.lineTo(p.x + Math.cos(a) * 14 * (1 - k), p.y + Math.sin(a) * 14 * (1 - k)); gr.stroke(); } }
      else if (p.k === 'ring') { gr.strokeStyle = `rgba(255,255,255,${.8 * (1 - k)})`; gr.lineWidth = 6 * (1 - k); gr.beginPath(); gr.arc(p.x, p.y, 20 + k * 200, 0, 7); gr.stroke(); }
      else if (p.k === 'wave') { gr.strokeStyle = `rgba(255,240,200,${1 - k})`; gr.lineWidth = 30 * (1 - k); gr.beginPath(); gr.arc(p.x, p.y, k * p.r, 0, 7); gr.stroke(); }
    }
    for (const c of clouds) if (c.front) cloud(gr, c.x, H - 150 + (c.y % 60), c.s * 1.3, st.cloud, .22);
    if (st.rain) { gr.strokeStyle = 'rgba(180,200,255,.35)'; gr.lineWidth = 1.5; for (let i = 0; i < 70; i++) { const x = (i * 97 - K.t * 900) % 1500 + (i * 31) % 200, y = (i * 61 + K.t * 1300) % 800 - 40; gr.beginPath(); gr.moveTo(x, y); gr.lineTo(x - 14, y + 26); gr.stroke(); } }
    gr.restore();
    // HUD
    gr.font = '22px "Racing Sans One"'; gr.textAlign = 'left'; gr.textBaseline = 'middle';
    for (let i = 0; i < lives; i++) jet(gr, s.c[0], s.c[1], 86 + i * 46, 32, 0, .32, false, 0);
    gr.fillStyle = 'rgba(0,0,0,.35)'; gr.beginPath(); gr.roundRect(64, 52, 230, 66, 12); gr.fill();
    gr.fillStyle = '#fff'; gr.fillText('GUNS', 76, 68); for (let i = 0; i < 5; i++) { gr.fillStyle = i < power ? '#4fd8ff' : 'rgba(255,255,255,.2)'; gr.fillRect(150 + i * 26, 61, 20, 14); }
    gr.fillStyle = '#fff'; gr.fillText('BOMB', 76, 100); for (let i = 0; i < bombs; i++) { gr.fillStyle = '#ffb23f'; gr.beginPath(); gr.arc(160 + i * 26, 100, 9, 0, 7); gr.fill(); }
    if (missiles) { gr.fillStyle = '#ff9a3a'; gr.fillText('M' + missiles, 250, 100); }
    if (chain >= 2) { const mul = Math.min(8, 1 + Math.floor(chain / 5)); gr.textAlign = 'right'; gr.font = '30px "Racing Sans One"'; gr.fillStyle = '#ffe36e'; gr.fillText(`${chain} CHAIN  x${mul}`, v.x1 - 30, 80); gr.fillStyle = 'rgba(255,255,255,.3)'; gr.fillRect(v.x1 - 230, 100, 200, 5); gr.fillStyle = '#ffe36e'; gr.fillRect(v.x1 - 230, 100, 200 * Math.max(0, chainT / 1.4), 5); }
    if (boss) { const b = boss, w = 600; gr.fillStyle = 'rgba(0,0,0,.55)'; gr.fillRect(W / 2 - w / 2, H - 46, w, 18); gr.fillStyle = '#ff3a5a'; gr.fillRect(W / 2 - w / 2, H - 46, w * Math.max(0, b.hp / b.max), 18); gr.fillStyle = '#fff'; gr.font = '20px "Racing Sans One"'; gr.textAlign = 'center'; gr.fillText(b.n, W / 2, H - 62); }
    if (stageT > 0) { const k = Math.min(1, stageT * 2, (3 - stageT) * 4); gr.save(); gr.globalAlpha = k; gr.textAlign = 'center'; gr.fillStyle = 'rgba(0,0,0,.4)'; gr.fillRect(v.x0, H / 2 - 70, v.x1 - v.x0, 120); gr.fillStyle = '#ffe36e'; gr.font = '26px "Racing Sans One"'; gr.fillText(`STAGE ${stage + 1}`, W / 2, H / 2 - 36); gr.fillStyle = '#fff'; gr.font = '64px "Racing Sans One"'; gr.fillText(st.n.toUpperCase(), W / 2, H / 2 + 12); gr.restore(); }
    if (boss && boss.x > W - 100) { gr.fillStyle = Math.floor(K.t * 6) % 2 ? '#ff3a5a' : '#fff'; gr.font = '58px "Racing Sans One"'; gr.textAlign = 'center'; gr.fillText('WARNING', W / 2, 200); }
  };
  function drawBoss(gr, b) {
    gr.save(); gr.translate(b.x, b.y); const fl = b.flash > 0, k = b.kind;
    if (k === 0) {   // the Sky Fortress: a huge four-engine flying wing
      for (const ex of [-150, -60, 60, 150]) { gr.fillStyle = fl ? '#fff' : '#3a3e48'; gr.beginPath(); gr.roundRect(ex - 30, 6, 70, 26, 10); gr.fill(); gr.fillStyle = 'rgba(200,220,255,.3)'; gr.beginPath(); gr.ellipse(ex - 34, 19, 4, 22 * Math.abs(Math.sin(K.t * 40 + ex)), 0, 0, 7); gr.fill(); }
      const g = gr.createLinearGradient(0, -70, 0, 50); g.addColorStop(0, fl ? '#fff' : '#8a8e9a'); g.addColorStop(1, fl ? '#fff' : '#3a3e48'); gr.fillStyle = g;
      gr.beginPath(); gr.moveTo(-230, 10); gr.lineTo(-40, -70); gr.lineTo(60, -70); gr.lineTo(240, 10); gr.lineTo(200, 34); gr.lineTo(-200, 34); gr.fill();
      gr.fillStyle = '#a8d8ff'; gr.beginPath(); gr.ellipse(-90, -36, 26, 12, -.2, 0, 7); gr.fill();
      gr.fillStyle = '#8a2a2a'; gr.fillRect(-20, -66, 60, 8);
    } else if (k === 1) {   // the Rotor Gunship: twin rotors and missile pods
      for (const rx of [-110, 110]) { gr.fillStyle = 'rgba(30,40,40,.35)'; gr.beginPath(); gr.ellipse(rx, -86, 120, 8, 0, 0, 7); gr.fill(); gr.fillStyle = '#222'; gr.fillRect(rx - 6, -84, 12, 30); }
      const g = gr.createLinearGradient(0, -60, 0, 60); g.addColorStop(0, fl ? '#fff' : '#6a8a5a'); g.addColorStop(1, fl ? '#fff' : '#22301a'); gr.fillStyle = g;
      gr.beginPath(); gr.roundRect(-200, -56, 400, 96, 44); gr.fill();
      gr.fillStyle = '#9ad8ff'; gr.beginPath(); gr.roundRect(-196, -40, 70, 40, 14); gr.fill();
      gr.fillStyle = fl ? '#fff' : '#3a3a3a'; gr.fillRect(-150, 40, 300, 10); for (let i = 0; i < 6; i++) { gr.fillStyle = '#c84a3a'; gr.beginPath(); gr.arc(-100 + i * 40, 54, 7, 0, 7); gr.fill(); }
    } else {   // the Storm Dreadnought: an armoured airship
      const g = gr.createLinearGradient(0, -90, 0, 70); g.addColorStop(0, fl ? '#fff' : '#5a4a7a'); g.addColorStop(1, fl ? '#fff' : '#1a1430'); gr.fillStyle = g;
      gr.beginPath(); gr.ellipse(0, -10, 260, 80, 0, 0, 7); gr.fill();
      gr.strokeStyle = 'rgba(255,255,255,.15)'; gr.lineWidth = 3; for (let i = -3; i <= 3; i++) { gr.beginPath(); gr.ellipse(0, -10, 260 - Math.abs(i) * 20, 80, 0, Math.PI * .5 + i * .2, Math.PI * .5 + i * .2 + .01); gr.stroke(); gr.beginPath(); gr.moveTo(i * 70, -86); gr.quadraticCurveTo(i * 80, -10, i * 70, 66); gr.stroke(); }
      gr.fillStyle = fl ? '#fff' : '#2a2238'; gr.beginPath(); gr.roundRect(-120, 56, 240, 34, 10); gr.fill(); for (let i = 0; i < 6; i++) { gr.fillStyle = Math.sin(K.t * 6 + i) > 0 ? '#ffe36e' : '#6a5a2a'; gr.fillRect(-100 + i * 36, 66, 18, 12); }
      gr.fillStyle = '#ff3a5a'; gr.beginPath(); gr.arc(-230, -10, 16, 0, 7); gr.fill();
    }
    for (const p of b.parts) { const alive = p.hp > 0; gr.save(); gr.translate(p.px, p.py); gr.fillStyle = alive ? (fl ? '#fff' : '#2a2e36') : '#1a1a1a'; gr.beginPath(); gr.arc(0, 0, 20, 0, 7); gr.fill(); if (alive) { const a = Math.atan2(me.y - (b.y + p.py), me.x - (b.x + p.px)); gr.rotate(a); gr.fillStyle = '#4a4e58'; gr.fillRect(0, -5, 32, 10); gr.rotate(-a); gr.fillStyle = '#ff3a5a'; gr.beginPath(); gr.arc(0, 0, 7, 0, 7); gr.fill(); } else { gr.fillStyle = 'rgba(80,80,80,.6)'; gr.beginPath(); gr.arc(-6 - K.t * 20 % 20, -10 - K.t * 30 % 30, 10, 0, 7); gr.fill(); } gr.restore(); }
    gr.restore();
  }
  GAME.jump = (s2, withBoss) => { stage = s2; stageT = 0; foes = []; ebul = []; if (withBoss) { spawnBoss(); boss.x = W - 260; } else { boss = null; for (let i = 0; i < 4; i++) wave(); } };
  GAME.test = () => ({ t: Math.round(t), stage, boss: boss && Math.round(boss.hp), foes: foes.length, lives, power, dead, bossCD: Math.round(bossCD) });
  GAME.pose = () => {
    stage = 1; stageT = 0; t = 60; power = 4; missiles = 2; chain = 14; chainT = 1.2;
    for (let i = 0; i < 5; i++) foes.push({ k: 'sine', x: 760 + i * 90, y: 260 + Math.sin(i) * 60, y0: 260, ph: i * .5, hp: 3, max: 3, r: 24, pts: 100, t: i, flash: 0 });
    foes.push({ k: 'bomber', x: 1080, y: 470, hp: 30, max: 40, r: 60, pts: 800, fire: 1, t: 0, flash: 0 });
    me.x = me.tx = 330; me.y = me.ty = 360; me.tilt = -.4;
    for (let i = 0; i < 14; i++) bul.push({ x: 390 + i * 60, y: 362 + (i % 3 - 1) * i * 4, vx: 1150, vy: 0, d: 1 });
    explode(900, 300, true); for (const p of fx) p.t = Math.max(0, p.t) + .12;
    for (let i = 0; i < 8; i++) ebul.push({ x: 600 + i * 70, y: 420 + Math.sin(i) * 60, vx: -200, vy: 0 });
    drops.push({ x: 520, y: 220, k: 'P' });
  };
})();
