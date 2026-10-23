/* Fruit Frenzy: swipe through flying fruit, chain combos, never touch a bomb. Three dropped fruits ends the run. */
const GAME = {
  id: 'fruit-frenzy', title: 'Fruit Frenzy', tagline: 'Swipe to slice. Chain combos. Never touch a bomb!',
  font: 'Luckiest Guy', accent: '#ffcf3a', accent2: '#ff5a5a', bg: '#3a2414',
  how: ['Swipe with your finger or mouse to slice fruit.', 'Slice 3 or more in one swipe for a combo bonus.', 'Let 3 fruits fall and it\'s over. Slice a bomb and it\'s over!'],
  skins: [
    { name: 'Steel', price: 0, c: ['#ffffff', '#9fd8ff'] }, { name: 'Flame', price: 60, c: ['#ffe08a', '#ff4d2e'] }, { name: 'Toxic', price: 150, c: ['#e9ff9a', '#4dff6a'] },
    { name: 'Candy', price: 250, c: ['#ffe0f4', '#ff4fb8'] }, { name: 'Shadow', price: 400, c: ['#c7b8ff', '#5b2bff'] }, { name: 'Rainbow', price: 700, c: ['#ffffff', '#ff0000'], rainbow: true },
  ],
};
(() => {
  const G = 980;
  const FRUITS = [
    { n: 'melon', r: 56, skin: '#2f9e3c', in: '#ff4f5e', seed: '#2b1a12', juice: '#ff4f5e' },
    { n: 'orange', r: 46, skin: '#ff9a1f', in: '#ffc04d', seed: '#fff1c2', juice: '#ffab2e' },
    { n: 'apple', r: 44, skin: '#e8283c', in: '#fff3cf', seed: '#5a3415', juice: '#fff3cf' },
    { n: 'kiwi', r: 40, skin: '#8a6a3a', in: '#8fd14f', seed: '#1a1a12', juice: '#9be05a' },
    { n: 'lemon', r: 40, skin: '#ffe23d', in: '#fff59a', seed: '#fffbe0', juice: '#fff07a' },
    { n: 'plum', r: 38, skin: '#7a2a8f', in: '#ffd36b', seed: '#8a4a12', juice: '#c45ad6' },
  ];
  let items, halves, blade, misses, spawnT, dead, swipeHits, swipeT, sliced, splats, wood;
  GAME.drawSkin = (gr, s) => {
    for (let i = 0; i < 18; i++) { const k = i / 17, x = -40 + k * 80, y = 26 - Math.sin(k * 2.6) * 50; gr.fillStyle = s.rainbow ? `hsl(${k * 300},100%,65%)` : (i % 2 ? s.c[0] : s.c[1]); gr.beginPath(); gr.arc(x, y, 3 + k * 7, 0, 7); gr.fill(); }
  };
  GAME.pose = () => {
    [[420, 300, 0, .3], [640, 220, 1, -.4], [860, 330, 2, .8], [540, 470, 3, 0], [770, 500, 4, -.6], [980, 200, 5, .2]].forEach(([x, y, i, a]) => items.push({ x, y, vx: 0, vy: 0, r: FRUITS[i].r * 1.25, f: FRUITS[i], bomb: false, gold: i === 4, a, va: 0, delay: 0 }));
    items.push({ x: 300, y: 520, vx: 0, vy: 0, r: 50, f: { r: 50 }, bomb: true, a: .3, va: 0, delay: 0 });
    for (const s of [-1, 1]) halves.push({ x: 640 + s * 30, y: 380, vx: 0, vy: 0, a: .6, va: 0, f: FRUITS[0], r: FRUITS[0].r * 1.2, side: s });
    splats.push({ x: 640, y: 380, r: 90, c: FRUITS[0].juice, t: .4, k: Array.from({ length: 14 }, () => K.rand(.55, 1.15)) });
    for (let i = 0; i <= 14; i++) blade.pts.push({ x: 250 + i * 55, y: 560 - i * 30 + Math.sin(i / 2) * 20, t: K.t });
  };
  GAME.reset = () => {
    items = []; halves = []; splats = []; blade = { pts: [], down: false, mouse: false, x: 0, y: 0 }; misses = 0; spawnT = .8; dead = false; swipeHits = 0; swipeT = 0; sliced = 0;
    wood = Array.from({ length: 9 }, (_, i) => ({ y: i * 84, h: K.rand(-8, 8) }));
  };
  function spawnWave() {
    const n = Math.min(6, 1 + Math.floor(Math.random() * (2 + sliced / 25))), bombP = Math.min(.28, .06 + sliced / 300);
    for (let i = 0; i < n; i++) {
      const x = K.rand(180, W - 180), bomb = sliced > 3 && Math.random() < bombP, gold = !bomb && Math.random() < .04;
      const f = bomb ? { r: 42 } : K.pick(FRUITS);
      items.push({ x, y: H + 60 + i * 30, vx: (W / 2 - x) * K.rand(.25, .55), vy: -K.rand(930, 1120), r: f.r, f, bomb, gold, a: 0, va: K.rand(-4, 4), delay: i * K.rand(.05, .2) });
    }
    if (!K.bot) K.sfx(200, .12, 'sine', .08, 200);
    spawnT = Math.max(.6, 1.25 - sliced / 80) + K.rand(0, .35);
  }
  function slice(it, ax, ay, bx, by) {
    items.splice(items.indexOf(it), 1);
    if (it.bomb) {
      dead = true; K.flash('#fff', .9); K.shake(28); K.noise(.8, .4, 60); K.sfx(90, .9, 'sawtooth', .2, -60);
      K.burst(it.x, it.y, ['#ffdd55', '#ff6a2e', '#444', '#fff'], 60, 700, { gravity: 200, life: 1.1, size: 12 }); K.over(); return;
    }
    const ang = Math.atan2(by - ay, bx - ax);
    for (const side of [-1, 1]) halves.push({ x: it.x, y: it.y, vx: it.vx * .5 + Math.cos(ang + Math.PI / 2) * side * 160, vy: it.vy * .3 - 100, a: ang, va: side * 3, f: it.f, r: it.r, side, gold: it.gold });
    K.burst(it.x, it.y, [it.f.juice, it.gold ? '#ffe36e' : it.f.juice, '#fff'], 18, 380, { life: .6, size: 9 });
    splats.push({ x: it.x, y: it.y, r: it.r * 1.3, c: it.f.juice, t: 0, k: Array.from({ length: 14 }, () => K.rand(.55, 1.15)) });
    sliced++; swipeHits++; swipeT = .28;
    K.add(1); K.noise(.09, .14, 2500); K.sfx(700 + swipeHits * 90, .06, 'triangle', .08);
    if (it.gold) { K.coin(3, it.x, it.y); K.add(4, it.x, it.y - 50, '#ffe36e'); K.chime(880); }
    if (sliced % 25 === 0) { K.coin(2); K.toast(`${sliced} sliced!`); }
  }
  function bladeTo(x, y) {
    const p = blade.pts[blade.pts.length - 1];
    blade.pts.push({ x, y, t: K.t });
    if (!p || K.t - p.t > .1 || dead) return;
    const len = Math.hypot(x - p.x, y - p.y); if (len < 4) return;
    for (const it of items.slice()) {
      if (it.delay > 0) continue;
      const t = K.clamp(((it.x - p.x) * (x - p.x) + (it.y - p.y) * (y - p.y)) / (len * len), 0, 1);
      if (K.dist(p.x + (x - p.x) * t, p.y + (y - p.y) * t, it.x, it.y) < it.r + 6) slice(it, p.x, p.y, x, y);
      if (dead) return;
    }
  }
  GAME.down = (x, y, e) => { blade.down = true; blade.pts = [{ x, y, t: K.t }]; };
  GAME.move = (x, y, e) => { blade.mouse = e.pointerType === 'mouse'; if (blade.down || blade.mouse) bladeTo(x, y); };
  GAME.up = () => { blade.down = false; };
  let bt = null;
  GAME.bot = dt => {
    if (dead) return;
    const live = items.filter(i => !i.bomb && i.delay <= 0 && i.y < H - 40 && i.y > 60);
    if (!bt || !items.includes(bt) || Math.random() < .01) bt = live.sort((a, b) => b.y - a.y)[0] || null;
    const cur = blade.pts[blade.pts.length - 1] || { x: W / 2, y: H / 2 };
    let tx = bt ? bt.x + Math.sin(K.t * 25) * 60 : W / 2 + Math.sin(K.t * 2) * 300, ty = bt ? bt.y + Math.cos(K.t * 25) * 60 : H / 2;
    for (const b of items) if (b.bomb && K.dist(b.x, b.y, (cur.x + tx) / 2, (cur.y + ty) / 2) < 120 && Math.random() < .9) { tx = cur.x + (cur.x - b.x); ty = cur.y + (cur.y - b.y); }
    const k = Math.min(1, dt * 14);
    bladeTo(K.clamp(cur.x + (tx - cur.x) * k, 20, W - 20), K.clamp(cur.y + (ty - cur.y) * k, 20, H - 20));
  };
  GAME.update = dt => {
    if (!dead) { spawnT -= dt; if (spawnT <= 0 && items.length < 9) spawnWave(); }
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]; if (it.delay > 0) { it.delay -= dt; continue; }
      it.vy += G * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.a += it.va * dt;
      if (it.vy > 0 && it.y > H + 70) {
        items.splice(i, 1);
        if (!it.bomb && !dead) { misses++; K.sfx(160, .25, 'square', .08, -60); K.pop(K.clamp(it.x, 80, W - 80), H - 60, '✗', '#ff4d4d', 50); K.shake(6); if (misses >= 3) { dead = true; K.over(); } }
      }
    }
    for (const h of halves) { h.vy += G * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.a += h.va * dt; }
    halves = halves.filter(h => h.y < H + 100);
    for (const s of splats) s.t += dt; splats = splats.filter(s => s.t < 2.5);
    blade.pts = blade.pts.filter(p => K.t - p.t < .14);
    if (swipeT > 0) { swipeT -= dt; if (swipeT <= 0) { if (swipeHits >= 3 && !dead) { const last = blade.pts[blade.pts.length - 1] || { x: W / 2, y: H / 2 }; K.add(swipeHits, last.x, last.y - 60, '#ffe36e'); K.pop(W / 2, 160, `${swipeHits} fruit combo!`, '#ffe36e', 46); K.chime(523 + swipeHits * 30); if (swipeHits >= 4) K.coin(1); } swipeHits = 0; } }
  };
  function fruit(gr, f, r, gold, half) {
    if (half) { gr.beginPath(); gr.arc(0, 0, r, 0, Math.PI); gr.closePath(); gr.fillStyle = gold ? '#ffcf2e' : f.skin; gr.fill(); gr.beginPath(); gr.arc(0, 0, r * .84, 0, Math.PI); gr.closePath(); gr.fillStyle = gold ? '#fff2a8' : f.in; gr.fill();
      gr.fillStyle = f.seed; for (let i = 0; i < 5; i++) { gr.beginPath(); gr.ellipse(-r * .5 + i * r * .25, r * .35, 2.5, 4.5, 0, 0, 7); gr.fill(); } return; }
    const gd = gr.createRadialGradient(-r * .35, -r * .35, r * .1, 0, 0, r);
    gd.addColorStop(0, gold ? '#fff6c4' : '#ffffff'); gd.addColorStop(.25, gold ? '#ffd84a' : f.skin); gd.addColorStop(1, gold ? '#c98a00' : f.skin);
    gr.fillStyle = gd; gr.beginPath(); gr.arc(0, 0, r, 0, 7); gr.fill();
    if (f.n === 'melon' && !gold) { gr.strokeStyle = '#1d6b27'; gr.lineWidth = 5; for (let i = -2; i <= 2; i++) { gr.beginPath(); gr.ellipse(i * r * .32, 0, r * .12, r * .95, 0, 0, 7); gr.stroke(); } }
    gr.fillStyle = 'rgba(255,255,255,.35)'; gr.beginPath(); gr.ellipse(-r * .35, -r * .4, r * .25, r * .14, -.6, 0, 7); gr.fill();
    gr.strokeStyle = '#5a3415'; gr.lineWidth = 4; gr.beginPath(); gr.moveTo(0, -r); gr.lineTo(3, -r - 10); gr.stroke();
    gr.fillStyle = '#4caf50'; gr.beginPath(); gr.ellipse(10, -r - 6, 9, 4, -.5, 0, 7); gr.fill();
  }
  function bomb(gr, r) {
    const gd = gr.createRadialGradient(-r * .3, -r * .3, 2, 0, 0, r); gd.addColorStop(0, '#666'); gd.addColorStop(1, '#111');
    gr.fillStyle = gd; gr.beginPath(); gr.arc(0, 0, r, 0, 7); gr.fill();
    gr.strokeStyle = '#ff3b3b'; gr.lineWidth = 4; gr.beginPath(); gr.arc(0, 0, r - 6, 0, 7); gr.stroke();
    gr.fillStyle = '#ff3b3b'; gr.font = `${r}px "Luckiest Guy", Arial Black`; gr.textAlign = 'center'; gr.textBaseline = 'middle'; gr.fillText('✕', 0, 2);
    gr.fillStyle = '#8a6a3a'; gr.fillRect(-4, -r - 10, 8, 12);
    gr.fillStyle = Math.random() < .5 ? '#ffe36e' : '#ff7a2e'; gr.beginPath(); gr.arc(0, -r - 14, 5 + Math.random() * 4, 0, 7); gr.fill();
  }
  GAME.draw = gr => {
    const v = K.view;
    gr.fillStyle = '#5b3a1f'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    for (const w of wood) { gr.fillStyle = 'rgba(0,0,0,.18)'; gr.fillRect(v.x0, w.y + 80, v.x1 - v.x0, 4); gr.fillStyle = 'rgba(255,220,170,.05)'; gr.fillRect(v.x0, w.y + 10 + w.h, v.x1 - v.x0, 22); }
    const vg = gr.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 800); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); gr.fillStyle = vg; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    for (const s of splats) { gr.globalAlpha = .5 * (1 - s.t / 2.5); gr.fillStyle = s.c; gr.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28, rr = s.r * s.k[i]; gr.lineTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr); } gr.fill(); }
    gr.globalAlpha = 1;
    for (const h of halves) { gr.save(); gr.translate(h.x, h.y); gr.rotate(h.a + (h.side > 0 ? Math.PI : 0)); fruit(gr, h.f, h.r, h.gold, true); gr.restore(); }
    for (const it of items) { if (it.delay > 0) continue; gr.save(); gr.translate(it.x, it.y); gr.rotate(it.a); if (it.bomb) bomb(gr, it.r); else fruit(gr, it.f, it.r, it.gold); gr.restore(); }
    const s = K.skin, pts = blade.pts;
    if (pts.length > 1) {
      gr.lineCap = 'round'; gr.lineJoin = 'round';
      for (let i = 1; i < pts.length; i++) {
        const k = i / pts.length; gr.strokeStyle = s.rainbow ? `hsl(${(K.t * 400 + i * 30) % 360},100%,65%)` : s.c[1]; gr.lineWidth = 4 + k * 14; gr.globalAlpha = .55;
        gr.beginPath(); gr.moveTo(pts[i - 1].x, pts[i - 1].y); gr.lineTo(pts[i].x, pts[i].y); gr.stroke();
        gr.strokeStyle = s.c[0]; gr.lineWidth = 2 + k * 6; gr.globalAlpha = .95; gr.beginPath(); gr.moveTo(pts[i - 1].x, pts[i - 1].y); gr.lineTo(pts[i].x, pts[i].y); gr.stroke();
      }
      gr.globalAlpha = 1;
    }
    gr.font = '42px "Luckiest Guy", Arial Black'; gr.textAlign = 'left'; gr.textBaseline = 'top';
    for (let i = 0; i < 3; i++) { gr.fillStyle = i < misses ? '#ff4d4d' : 'rgba(255,255,255,.25)'; gr.fillText('✗', 70 + i * 40, 10); }
  };
})();
