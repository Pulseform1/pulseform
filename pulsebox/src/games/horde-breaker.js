/* Horde Breaker: survive a growing horde. You only move; your weapons fire on their own. Monsters drop gems,
   gems level you up, and every level you pick one of three upgrades. A boss turns up every three minutes. */
const GAME = {
  id: 'horde-breaker', title: 'Horde Breaker', tagline: 'You move. Your weapons do the rest. Survive the horde.',
  font: 'Pirata One', accent: '#ff5d5d', accent2: '#7cf2ff', bg: '#141018', scoreLabel: 'Seconds survived', noHud: true,
  how: ['Move with WASD or the arrow keys, or drag anywhere on the screen.', 'Your weapons attack by themselves. Grab gems to level up.', 'Each level, pick an upgrade: new weapons or stronger ones.'],
  skins: [
    { name: 'Knight', price: 0, c: ['#c8d0dc', '#3a5aaa'] }, { name: 'Ranger', price: 60, c: ['#6a9a3a', '#3a2a1a'] }, { name: 'Mage', price: 150, c: ['#7a3ad2', '#ffd23f'] },
    { name: 'Rogue', price: 250, c: ['#2a2a2a', '#d23a3a'] }, { name: 'Paladin', price: 400, c: ['#ffe6a0', '#ffffff'] }, { name: 'Necro', price: 700, c: ['#1a2a1a', '#6aff8a'] },
  ],
};
(() => {
  const WEAPONS = {
    knife: { n: 'Throwing knives', d: 'Fly at the nearest monster.', max: 6 }, orbit: { n: 'Orbit blades', d: 'Blades spin around you.', max: 6 },
    zap: { n: 'Lightning', d: 'Strikes random monsters.', max: 6 }, aura: { n: 'Holy aura', d: 'Hurts everything close to you.', max: 6 },
    fire: { n: 'Fireball', d: 'Explodes on impact.', max: 6 }, rang: { n: 'Boomerang', d: 'Flies out and comes back.', max: 6 },
  };
  const STATS = { hp: { n: 'Big heart', d: '+25 max health and heal' }, spd: { n: 'Swift boots', d: '+12% move speed' }, might: { n: 'Might', d: '+15% damage' }, haste: { n: 'Haste', d: 'Weapons fire 10% faster' }, magnet: { n: 'Magnet', d: 'Grab gems from farther away' } };
  const FOES = [
    { n: 'bat', hp: 6, sp: 120, r: 13, dmg: 5, xp: 1, c: '#7a5aaa', from: 0 }, { n: 'zombie', hp: 16, sp: 55, r: 17, dmg: 8, xp: 2, c: '#6a9a5a', from: 20 },
    { n: 'skeleton', hp: 26, sp: 75, r: 16, dmg: 10, xp: 3, c: '#e6e0d0', from: 60 }, { n: 'ghost', hp: 20, sp: 95, r: 16, dmg: 9, xp: 3, c: '#bfe6ff', from: 100 },
    { n: 'brute', hp: 90, sp: 48, r: 28, dmg: 18, xp: 8, c: '#a24a3a', from: 150 },
  ];
  let me, foes, shots, gems, fx, t, lvl, xp, need, weap, stat, kills, pick, cam, keys, drag, spawnT, bossT, dead, cd, rangs, ground;
  GAME.reset = () => {
    me = { x: 0, y: 0, hp: 100, max: 100, sp: 210, face: 1, hurt: 0 }; foes = []; shots = []; gems = []; fx = []; rangs = [];
    t = 0; lvl = 1; xp = 0; need = 5; weap = { knife: 1 }; stat = { might: 1, haste: 1, magnet: 70 }; kills = 0; pick = null; cam = { x: 0, y: 0 }; keys = {}; drag = null; spawnT = 0; bossT = 180; dead = false; cd = {};
    ground = Array.from({ length: 60 }, () => ({ x: K.rand(-2000, 2000), y: K.rand(-2000, 2000), k: K.irand(0, 2) }));
  };
  const dmg = d => d * stat.might;
  function hurt(f, d, kx = 0, ky = 0) {
    f.hp -= d; f.flash = .1; f.x += kx; f.y += ky; fx.push({ k: 'num', x: f.x, y: f.y - f.r, s: Math.round(d), t: 0 });
    if (f.hp <= 0 && !f.dead) {
      f.dead = true; kills++; gems.push({ x: f.x, y: f.y, v: f.xp, big: f.boss }); if (!K.bot && kills % 30 === 0) K.coin(1);
      K.burst(f.x - cam.x + W / 2, f.y - cam.y + H / 2, [f.c, '#fff'], f.boss ? 40 : 6, f.boss ? 400 : 180, { life: .4, gravity: 0 });
      if (Math.random() < .4) K.sfx(300 + Math.random() * 200, .05, 'square', .04);
      if (f.boss) { K.toast('Boss defeated!'); K.chime(392, [0, 4, 7, 12]); if (!K.bot) K.coin(10); me.hp = me.max; }
    }
  }
  function spawn() {
    const types = FOES.filter(f => t >= f.from), f = K.pick(types), a = Math.random() * 6.283, d = 680;
    const scale = 1 + t / 240;
    foes.push({ ...f, x: me.x + Math.cos(a) * d, y: me.y + Math.sin(a) * d * .7, hp: f.hp * scale, max: f.hp * scale, flash: 0 });
  }
  function choices() {
    const opts = [];
    for (const [k, w] of Object.entries(WEAPONS)) if ((weap[k] || 0) < w.max && (weap[k] || Object.keys(weap).length < 5)) opts.push({ k, kind: 'w', n: w.n, d: weap[k] ? `Level ${weap[k] + 1}: more damage${k === 'knife' || k === 'orbit' ? ', one more' : ''}` : 'NEW! ' + w.d });
    for (const [k, s] of Object.entries(STATS)) opts.push({ k, kind: 's', n: s.n, d: s.d });
    return opts.sort(() => Math.random() - .5).slice(0, 3);
  }
  function take(o) {
    if (o.kind === 'w') weap[o.k] = (weap[o.k] || 0) + 1;
    else if (o.k === 'hp') { me.max += 25; me.hp = me.max; } else if (o.k === 'spd') me.sp *= 1.12; else if (o.k === 'might') stat.might *= 1.15; else if (o.k === 'haste') stat.haste *= .9; else if (o.k === 'magnet') stat.magnet += 45;
    pick = null; K.chime(660, [0, 7]);
  }
  /* ---------- input ---------- */
  const card = i => ({ x: 170 + i * 320, y: 240, w: 300, h: 260 });
  GAME.down = (x, y) => { if (pick) { pick.forEach((o, i) => { const c = card(i); if (x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h) take(o); }); return; } drag = { sx: x, sy: y, x, y }; };
  GAME.move = (x, y) => { if (drag) { drag.x = x; drag.y = y; } };
  GAME.up = () => { drag = null; };
  GAME.key = (c, d) => { keys[c] = d; if (d && pick && /Digit[123]/.test(c)) take(pick[+c.slice(5) - 1]); };
  GAME.bot = () => {
    if (pick) { take(pick[0]); return; }
    let ax = 0, ay = 0; for (const f of foes) { const dx = me.x - f.x, dy = me.y - f.y, d = Math.hypot(dx, dy) || 1; if (d < 260) { ax += dx / d / d * 200; ay += dy / d / d * 200; } }
    const g = gems.reduce((b, gm) => !b || K.dist(gm.x, gm.y, me.x, me.y) < K.dist(b.x, b.y, me.x, me.y) ? gm : b, null);
    if (g && K.dist(g.x, g.y, me.x, me.y) < 300) { const d = K.dist(g.x, g.y, me.x, me.y) || 1; ax += (g.x - me.x) / d * .6; ay += (g.y - me.y) / d * .6; }
    ax += Math.cos(K.t * .3) * .3; ay += Math.sin(K.t * .4) * .3;
    GAME._bot = [ax, ay];
  };
  /* ---------- update ---------- */
  const near = (x, y, r) => foes.filter(f => !f.dead && K.dist(f.x, f.y, x, y) < r + f.r);
  const nearest = (x, y) => { let b = null, bd = 1e9; for (const f of foes) if (!f.dead) { const d = K.dist(f.x, f.y, x, y); if (d < bd) { bd = d; b = f; } } return b; };
  GAME.update = dt => {
    if (dead) { for (const p of fx) p.t += dt; return; }
    if (pick) return;
    t += dt; if (Math.floor(t) !== K.score) { K.score = Math.floor(t); }
    // move
    let mx = 0, my = 0;
    if (keys.KeyA || keys.ArrowLeft) mx--; if (keys.KeyD || keys.ArrowRight) mx++; if (keys.KeyW || keys.ArrowUp) my--; if (keys.KeyS || keys.ArrowDown) my++;
    if (drag) { const dx = drag.x - drag.sx, dy = drag.y - drag.sy, d = Math.hypot(dx, dy); if (d > 10) { mx = dx / Math.max(d, 60); my = dy / Math.max(d, 60); } }
    if (K.bot && GAME._bot) [mx, my] = GAME._bot;
    const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    me.x += mx * me.sp * dt; me.y += my * me.sp * dt; if (Math.abs(mx) > .1) me.face = Math.sign(mx); me.hurt -= dt;
    cam.x += (me.x - cam.x) * Math.min(1, dt * 6); cam.y += (me.y - cam.y) * Math.min(1, dt * 6);
    // spawn
    spawnT -= dt; const rate = Math.max(.08, .5 - t / 160); while (spawnT <= 0 && foes.length < 260) { spawnT += rate; spawn(); if (t > 60 && Math.random() < .3) spawn(); }
    bossT -= dt; if (bossT <= 0) { bossT = 180; const a = Math.random() * 6.283; foes.push({ n: 'boss', hp: 1500 * (1 + t / 300), max: 1500 * (1 + t / 300), sp: 70, r: 50, dmg: 30, xp: 60, c: '#d23a8a', x: me.x + Math.cos(a) * 700, y: me.y + Math.sin(a) * 500, boss: true, flash: 0 }); K.toast('A boss approaches!'); K.sfx(80, 1.5, 'sawtooth', .15, -30); }
    // foes
    for (const f of foes) {
      if (f.dead) continue; const dx = me.x - f.x, dy = me.y - f.y, d = Math.hypot(dx, dy) || 1;
      f.x += dx / d * f.sp * dt; f.y += dy / d * f.sp * dt; f.flash -= dt;
      if (d < f.r + 16 && me.hurt <= 0) { me.hp -= f.dmg; me.hurt = .5; K.shake(6); K.sfx(140, .12, 'square', .1); if (me.hp <= 0) { dead = true; K.over({ title: 'Overrun!', text: `You survived ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')} and broke ${kills} monsters. You reached level ${lvl}.` }); return; } }
    }
    // keep foes from stacking
    for (let i = 0; i < foes.length; i += 2) { const a = foes[i], b = foes[(i + 7) % foes.length]; if (a === b || a.dead || b.dead) continue; const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 1, m = a.r + b.r; if (d < m) { a.x += dx / d * (m - d) * .5; a.y += dy / d * (m - d) * .5; } }
    // weapons
    const ready = (k, base) => { cd[k] = (cd[k] || 0) - dt; if (cd[k] <= 0) { cd[k] = base * stat.haste; return true; } return false; };
    if (weap.knife && ready('knife', .75)) { const tg = nearest(me.x, me.y); const a = tg ? Math.atan2(tg.y - me.y, tg.x - me.x) : me.face > 0 ? 0 : Math.PI; for (let i = 0; i < weap.knife; i++) { const aa = a + (i - (weap.knife - 1) / 2) * .14; shots.push({ k: 'knife', x: me.x, y: me.y, vx: Math.cos(aa) * 620, vy: Math.sin(aa) * 620, life: .9, d: dmg(9 + weap.knife * 3), pierce: 1 }); } K.sfx(900, .03, 'triangle', .03); }
    if (weap.fire && ready('fire', 2.2)) { const tg = nearest(me.x, me.y); if (tg) { const a = Math.atan2(tg.y - me.y, tg.x - me.x); shots.push({ k: 'fire', x: me.x, y: me.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, life: 1.6, d: dmg(18 + weap.fire * 8), boom: 70 + weap.fire * 12 }); } }
    if (weap.zap && ready('zap', 1.6)) { for (let i = 0; i < weap.zap; i++) { const pool = foes.filter(f => !f.dead && K.dist(f.x, f.y, me.x, me.y) < 520); if (!pool.length) break; const f = K.pick(pool); hurt(f, dmg(20 + weap.zap * 7)); fx.push({ k: 'zap', x: f.x, y: f.y, t: 0 }); } K.sfx(1600, .08, 'sawtooth', .04, -1200); }
    if (weap.rang && ready('rang', 2.4)) { const a = me.face > 0 ? 0 : Math.PI; rangs.push({ x: me.x, y: me.y, a: a + K.rand(-.6, .6), t: 0, hit: new Set(), d: dmg(14 + weap.rang * 6) }); }
    if (weap.aura) { const R = 70 + weap.aura * 14; if (ready('aura', .5)) for (const f of near(me.x, me.y, R)) hurt(f, dmg(3 + weap.aura * 2.5)); }
    if (weap.orbit) { const n = weap.orbit + 1, R = 90; for (let i = 0; i < n; i++) { const a = K.t * 3.2 + i / n * 6.283, x = me.x + Math.cos(a) * R, y = me.y + Math.sin(a) * R; for (const f of near(x, y, 18)) { if ((f.oT || 0) < K.t) { f.oT = K.t + .35; hurt(f, dmg(7 + weap.orbit * 3), Math.cos(a) * 12, Math.sin(a) * 12); } } } }
    for (const s of shots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      for (const f of near(s.x, s.y, s.k === 'fire' ? 12 : 8)) { if (s.life <= 0) break; if (s.k === 'fire') { for (const g of near(s.x, s.y, s.boom)) hurt(g, s.d); fx.push({ k: 'boom', x: s.x, y: s.y, r: s.boom, t: 0 }); K.noise(.2, .15, 300); s.life = 0; break; } hurt(f, s.d, s.vx * .02, s.vy * .02); if (--s.pierce < 0) { s.life = 0; break; } }
    }
    shots = shots.filter(s => s.life > 0);
    for (const r of rangs) { r.t += dt; const out = r.t < .6 ? r.t / .6 : Math.max(0, 1 - (r.t - .6) / .6), d = out * (240 + weap.rang * 20); r.x = me.x + Math.cos(r.a) * d; r.y = me.y + Math.sin(r.a) * d; for (const f of near(r.x, r.y, 20)) if (!r.hit.has(f)) { r.hit.add(f); hurt(f, r.d); } if (r.t > .6 && !r.back) { r.back = true; r.hit.clear(); } }
    rangs = rangs.filter(r => r.t < 1.2);
    foes = foes.filter(f => !f.dead && K.dist(f.x, f.y, me.x, me.y) < 1500);
    // gems
    for (const g of gems) { const d = K.dist(g.x, g.y, me.x, me.y); if (d < stat.magnet || g.pull) { g.pull = true; g.x += (me.x - g.x) * Math.min(1, dt * 10); g.y += (me.y - g.y) * Math.min(1, dt * 10); } if (d < 20) { g.got = true; xp += g.v; K.sfx(1200 + Math.min(xp, 20) * 20, .03, 'sine', .03); } }
    gems = gems.filter(g => !g.got).slice(-400);
    if (xp >= need) { xp -= need; lvl++; need = Math.round(need * 1.25 + 4); pick = choices(); K.chime(523, [0, 4, 7, 12]); K.flash('#fff', .3); }
    for (const p of fx) p.t += dt; fx = fx.filter(p => p.t < .6);
  };
  /* ---------- draw ---------- */
  function hero(gr, s, x, y, face, t, hurtA) {
    gr.save(); gr.translate(x, y); gr.scale(face, 1); const b = Math.sin(t * 10) * 2;
    gr.fillStyle = 'rgba(0,0,0,.3)'; gr.beginPath(); gr.ellipse(0, 20, 16, 6, 0, 0, 7); gr.fill();
    gr.fillStyle = s.c[1]; gr.beginPath(); gr.moveTo(-14, -4 + b); gr.lineTo(-20, 18); gr.lineTo(10, 18); gr.lineTo(8, -4 + b); gr.fill();
    gr.fillStyle = hurtA ? '#fff' : s.c[0]; gr.beginPath(); gr.roundRect(-11, -14 + b, 22, 26, 6); gr.fill(); gr.beginPath(); gr.arc(0, -22 + b, 11, 0, 7); gr.fill();
    gr.fillStyle = '#111'; gr.fillRect(2, -25 + b, 8, 3);
    gr.strokeStyle = '#d8d8e0'; gr.lineWidth = 4; gr.beginPath(); gr.moveTo(10, -2 + b); gr.lineTo(24, -18 + b); gr.stroke();
    gr.restore();
  }
  GAME.drawSkin = (gr, s) => hero(gr, s, 0, 6, 1, 0, false);
  function foe(gr, f, x, y) {
    gr.save(); gr.translate(x, y); const wob = Math.sin(K.t * 8 + f.x) * 3;
    gr.fillStyle = f.flash > 0 ? '#fff' : f.c;
    if (f.n === 'bat') { gr.beginPath(); gr.ellipse(0, 0, 8, 9, 0, 0, 7); gr.fill(); for (const k of [-1, 1]) { gr.beginPath(); gr.moveTo(k * 6, 0); gr.lineTo(k * 22, -8 + wob * 2); gr.lineTo(k * 14, 6); gr.fill(); } }
    else if (f.n === 'ghost') { gr.globalAlpha = .75; gr.beginPath(); gr.arc(0, -4, 15, Math.PI, 0); gr.lineTo(15, 14); for (let i = 0; i < 4; i++) gr.lineTo(15 - (i + .5) * 7.5, 14 - (i % 2) * 6 + wob); gr.lineTo(-15, 14); gr.fill(); gr.globalAlpha = 1; }
    else { gr.beginPath(); gr.roundRect(-f.r * .8, -f.r, f.r * 1.6, f.r * 2, f.r * .5); gr.fill(); }
    gr.fillStyle = f.boss ? '#ffd23f' : '#ff2a2a'; gr.beginPath(); gr.arc(-f.r * .3, -f.r * .3, Math.max(2, f.r * .14), 0, 7); gr.arc(f.r * .3, -f.r * .3, Math.max(2, f.r * .14), 0, 7); gr.fill();
    if (f.boss || f.n === 'brute') { gr.fillStyle = 'rgba(0,0,0,.5)'; gr.fillRect(-f.r, -f.r - 12, f.r * 2, 5); gr.fillStyle = '#ff5d5d'; gr.fillRect(-f.r, -f.r - 12, f.r * 2 * Math.max(0, f.hp / f.max), 5); }
    gr.restore();
  }
  GAME.draw = gr => {
    const v = K.view, s = K.skin, ox = W / 2 - cam.x, oy = H / 2 - cam.y;
    gr.fillStyle = '#1e2a1a'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    gr.strokeStyle = 'rgba(255,255,255,.035)'; gr.lineWidth = 2; const gs = 96; for (let x = Math.floor((cam.x - W) / gs) * gs; x < cam.x + W; x += gs) { gr.beginPath(); gr.moveTo(x + ox, v.y0); gr.lineTo(x + ox, v.y1); gr.stroke(); } for (let y = Math.floor((cam.y - H) / gs) * gs; y < cam.y + H; y += gs) { gr.beginPath(); gr.moveTo(v.x0, y + oy); gr.lineTo(v.x1, y + oy); gr.stroke(); }
    for (const d of ground) { const x = ((d.x - cam.x) % 4000 + 6000) % 4000 - 2000 + W / 2, y = ((d.y - cam.y) % 4000 + 6000) % 4000 - 2000 + H / 2; gr.fillStyle = d.k ? 'rgba(90,130,70,.5)' : 'rgba(60,50,40,.5)'; gr.beginPath(); gr.ellipse(x, y, d.k ? 10 : 16, 6, 0, 0, 7); gr.fill(); }
    gr.save(); gr.translate(ox, oy);
    if (weap.aura) { const R = 70 + weap.aura * 14; gr.fillStyle = `rgba(255,240,170,${.08 + Math.sin(K.t * 4) * .03})`; gr.beginPath(); gr.arc(me.x, me.y, R, 0, 7); gr.fill(); }
    for (const g of gems) { gr.fillStyle = g.big ? '#ff5dd8' : g.v > 2 ? '#5d9cff' : '#5dffb0'; gr.beginPath(); gr.moveTo(g.x, g.y - 8); gr.lineTo(g.x + 6, g.y); gr.lineTo(g.x, g.y + 8); gr.lineTo(g.x - 6, g.y); gr.fill(); }
    for (const f of foes) if (Math.abs(f.x - cam.x) < W && Math.abs(f.y - cam.y) < H) foe(gr, f, f.x, f.y);
    hero(gr, s, me.x, me.y, me.face, K.t, me.hurt > .35);
    if (weap.orbit) { const n = weap.orbit + 1; for (let i = 0; i < n; i++) { const a = K.t * 3.2 + i / n * 6.283; gr.save(); gr.translate(me.x + Math.cos(a) * 90, me.y + Math.sin(a) * 90); gr.rotate(a * 3); gr.fillStyle = '#d8e8ff'; gr.beginPath(); gr.moveTo(0, -14); gr.lineTo(5, 0); gr.lineTo(0, 14); gr.lineTo(-5, 0); gr.fill(); gr.restore(); } }
    for (const sh of shots) { if (sh.k === 'fire') { gr.fillStyle = '#ff8a2a'; gr.shadowColor = '#ff5a00'; gr.shadowBlur = 14; gr.beginPath(); gr.arc(sh.x, sh.y, 10, 0, 7); gr.fill(); gr.shadowBlur = 0; } else { gr.save(); gr.translate(sh.x, sh.y); gr.rotate(Math.atan2(sh.vy, sh.vx)); gr.fillStyle = '#e6e6f0'; gr.fillRect(-9, -2, 18, 4); gr.restore(); } }
    for (const r of rangs) { gr.save(); gr.translate(r.x, r.y); gr.rotate(K.t * 14); gr.strokeStyle = '#ffd23f'; gr.lineWidth = 5; gr.beginPath(); gr.arc(0, 0, 12, 0, 3.6); gr.stroke(); gr.restore(); }
    for (const p of fx) {
      if (p.k === 'num') { gr.globalAlpha = 1 - p.t / .6; gr.fillStyle = '#fff'; gr.font = '16px "Pirata One"'; gr.textAlign = 'center'; gr.fillText(p.s, p.x, p.y - p.t * 40); }
      if (p.k === 'zap') { gr.globalAlpha = 1 - p.t / .6; gr.strokeStyle = '#bff3ff'; gr.lineWidth = 3; gr.beginPath(); gr.moveTo(p.x + K.rand(-10, 10), p.y - 300); for (let i = 1; i <= 6; i++) gr.lineTo(p.x + K.rand(-18, 18), p.y - 300 + i * 50); gr.stroke(); }
      if (p.k === 'boom') { gr.globalAlpha = 1 - p.t / .6; gr.fillStyle = '#ffb347'; gr.beginPath(); gr.arc(p.x, p.y, p.r * (.5 + p.t), 0, 7); gr.fill(); }
      gr.globalAlpha = 1;
    }
    gr.restore();
    // HUD
    gr.fillStyle = 'rgba(0,0,0,.5)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, 10); gr.fillStyle = '#5d9cff'; gr.fillRect(v.x0, v.y0, (v.x1 - v.x0) * xp / need, 10);
    gr.font = '30px "Pirata One"'; gr.textAlign = 'center'; gr.fillStyle = '#fff'; gr.fillText(`${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`, W / 2, 44);
    gr.font = '20px "Pirata One"'; gr.textAlign = 'left'; gr.fillText(`LV ${lvl}`, 70, 36); gr.fillText(`☠ ${kills}`, 70, 60);
    gr.fillStyle = 'rgba(0,0,0,.5)'; gr.fillRect(W - 230, 22, 200, 16); gr.fillStyle = me.hp < me.max * .3 ? '#ff3a3a' : '#ff5d5d'; gr.fillRect(W - 230, 22, 200 * Math.max(0, me.hp / me.max), 16); gr.fillStyle = '#fff'; gr.font = '14px Nunito'; gr.textAlign = 'right'; gr.fillText(`${Math.max(0, Math.ceil(me.hp))}/${me.max}`, W - 34, 35);
    if (drag && !K.bot) { gr.strokeStyle = 'rgba(255,255,255,.35)'; gr.lineWidth = 3; gr.beginPath(); gr.arc(drag.sx, drag.sy, 60, 0, 7); gr.stroke(); gr.fillStyle = 'rgba(255,255,255,.4)'; const dx = drag.x - drag.sx, dy = drag.y - drag.sy, d = Math.min(60, Math.hypot(dx, dy)), a = Math.atan2(dy, dx); gr.beginPath(); gr.arc(drag.sx + Math.cos(a) * d, drag.sy + Math.sin(a) * d, 24, 0, 7); gr.fill(); }
    if (pick) {
      gr.fillStyle = 'rgba(0,0,0,.6)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
      gr.fillStyle = '#ffd23f'; gr.font = '54px "Pirata One"'; gr.textAlign = 'center'; gr.fillText(`Level ${lvl}! Choose one`, W / 2, 190);
      pick.forEach((o, i) => { const c = card(i); gr.fillStyle = o.kind === 'w' ? '#2a2040' : '#20302a'; gr.beginPath(); gr.roundRect(c.x, c.y, c.w, c.h, 18); gr.fill(); gr.strokeStyle = o.d.startsWith('NEW') ? '#ffd23f' : 'rgba(255,255,255,.25)'; gr.lineWidth = 3; gr.stroke(); gr.fillStyle = '#fff'; gr.font = '34px "Pirata One"'; gr.fillText(o.n, c.x + c.w / 2, c.y + 70); gr.font = '18px Nunito'; gr.fillStyle = '#d8d0e8'; gr.fillText(o.d, c.x + c.w / 2, c.y + 130); gr.fillStyle = 'rgba(255,255,255,.5)'; gr.fillText(`press ${i + 1}`, c.x + c.w / 2, c.y + c.h - 24); });
    }
  };
})();
