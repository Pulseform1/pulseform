/* Hue Hop: tap to bounce upward and only pass through the part of each obstacle that matches your ball's color. */
const GAME = {
  id: 'hue-hop', title: 'Hue Hop', tagline: 'Tap to hop. Only pass through your own color!',
  font: 'Titan One', accent: '#ff3d8b', accent2: '#32e0ff', bg: '#14121f',
  how: ['Tap, click or press Space to hop up.', 'You can only pass through the part that matches your color.', 'Touch a switcher to change color. Grab stars for points!'],
  skins: [
    { name: 'Classic', price: 0, pal: ['#32e0ff', '#ff3d8b', '#ffd23f', '#8c5bff'] }, { name: 'Pastel', price: 60, pal: ['#9fe8ff', '#ffb3d1', '#fff1a6', '#c9b5ff'] },
    { name: 'Jungle', price: 150, pal: ['#3ddc97', '#ff8c42', '#f9f871', '#2e86ab'] }, { name: 'Sunset', price: 250, pal: ['#ff6b6b', '#ffa94d', '#ffd43b', '#cc5de8'] },
    { name: 'Ocean', price: 400, pal: ['#00b4d8', '#90e0ef', '#ff7aa2', '#ffd166'] }, { name: 'Neon', price: 700, pal: ['#39ff14', '#ff073a', '#00f0ff', '#ffe600'], glow: true },
  ],
};
(() => {
  const BX = W / 2, BR = 14, GRAV = 1550, HOP = -560, GAP = 520, TH = 24;
  let ball, obs, sw, stars, cam, dead, gt, built, starCount, pieces;
  const pal = () => K.skin.pal;
  GAME.drawSkin = (gr, s) => { for (let i = 0; i < 4; i++) { gr.strokeStyle = s.pal[i]; gr.lineWidth = 12; gr.beginPath(); gr.arc(0, 0, 36, i * Math.PI / 2, (i + 1) * Math.PI / 2); gr.stroke(); } gr.fillStyle = s.pal[1]; gr.beginPath(); gr.arc(0, 0, 12, 0, 7); gr.fill(); };
  function build(n) {
    const y = -n * GAP, d = Math.min(1, n / 30), w = (1.6 + d * 1.4) * (Math.random() < .5 ? 1 : -1);
    const r = Math.random(), type = n < 2 ? 'ring' : r < .5 ? 'ring' : r < .75 ? 'bar' : 'double';
    const o = { type, y, r0: Math.random() * 6.28, w, R: K.rand(130, 160) - d * 10 };
    if (type === 'bar') { o.w = (260 + d * 200) * Math.sign(w); o.r0 = Math.random() * 1280; }
    if (type === 'double') { o.R = K.rand(108, 128); o.R2 = o.R + 46; }
    obs.push(o);
    stars.push({ y: type === 'bar' ? y - 130 : y, got: false });
    sw.push({ y: y - GAP / 2 - (type === 'bar' ? 40 : 0), used: false });
  }
  GAME.reset = () => {
    ball = { y: 560, vy: 0, c: 0 }; obs = []; sw = []; stars = []; cam = 0; dead = false; gt = 0; built = 0; starCount = 0; pieces = [];
    for (; built < 6; built++) build(built + 1);
  };
  // which color is at the ball's x position for an obstacle at time t (null = no contact)
  function hitColor(o, y, t) {
    if (o.type === 'bar') { if (Math.abs(y - o.y) > TH / 2 + BR) return null; const off = o.r0 + o.w * t; return Math.floor((((BX - off) % 1280) + 1280) % 1280 / 320); }
    const rings = o.type === 'double' ? [[o.R, 1], [o.R2, -1]] : [[o.R, 1]];
    for (const [R, dir] of rings) {
      const dy = y - o.y; if (Math.abs(Math.abs(dy) - R) > TH / 2 + BR) continue;
      const ang = dy > 0 ? Math.PI / 2 : -Math.PI / 2, rot = (o.r0 + o.w * t) * dir;
      const i = Math.floor((((ang - rot) % 6.283) + 6.283) % 6.283 / (Math.PI / 2)) % 4;
      return dir < 0 ? i ^ 1 : i;  // the outer ring's colors are mirrored so they line up with the inner ring's where the ball crosses
    }
    return null;
  }
  const bad = (y, t, c) => obs.some(o => { const h = hitColor(o, y, t); return h !== null && h !== c; });
  function hop() { if (dead) return; ball.vy = HOP; K.sfx(620, .07, 'sine', .1, 200); }
  GAME.down = hop;
  GAME.key = (c, d) => { if (d && (c === 'Space' || c === 'Enter' || c === 'ArrowUp')) hop(); };
  // the bot looks ahead: is there any sequence of hops (one chance every 0.12 s) that stays safe for the next ~0.8 s?
  function safe(y, vy, t, depth) {
    for (let i = 0; i < 7; i++) { vy += GRAV / 60; y += vy / 60; t += 1 / 60; if (bad(y, t, ball.c) || y - cam > H + 10) return false; }
    return depth === 0 || safe(y, vy, t, depth - 1) || safe(y, HOP, t, depth - 1);
  }
  GAME.bot = () => {
    if (dead) return;
    if (GAME._lag > 0) { GAME._lag--; return; }
    const tapOk = safe(ball.y, HOP, gt, 8);
    if (tapOk && ball.vy > -120) { hop(); GAME._lag = 6; if (Math.random() < .004) GAME._lag = 40; return; }
    if (!tapOk && !safe(ball.y, ball.vy, gt, 8)) { if (ball.y - cam > H - 120) hop(); }
  };
  function die() {
    if (dead) return; dead = true; K.shake(14); K.noise(.3, .2, 600); K.sfx(300, .4, 'square', .1, -250);
    for (let i = 0; i < 24; i++) pieces.push({ x: BX, y: ball.y, vx: K.rand(-500, 500), vy: K.rand(-700, 100), c: pal()[i % 4] });
    K.over();
  }
  GAME.update = dt => {
    gt += dt;
    if (!dead) {
      if (K.bot || K.score > 0 || ball.vy !== 0) { ball.vy += GRAV * dt; ball.y += ball.vy * dt; }
      if (bad(ball.y, gt, ball.c)) die();
      if (ball.y - cam > H + 20) die();
      for (const s of stars) if (!s.got && Math.abs(ball.y - s.y) < 34) {
        s.got = true; starCount++; K.add(1, BX + 60, s.y, '#ffe36e'); K.sfx(880, .08, 'triangle', .1); K.sfx(1320, .1, 'triangle', .08, 0, .06);
        K.burst(BX, s.y, ['#fff', '#ffe36e'], 10, 220, { gravity: 0, life: .4 });
        if (starCount % 4 === 0) K.coin(1, BX, s.y); if (starCount % 20 === 0) { K.toast(`${starCount} stars!`); K.coin(3); }
      }
      for (const s of sw) if (!s.used && Math.abs(ball.y - s.y) < 26) {
        s.used = true; let c; do { c = K.irand(0, 3); } while (c === ball.c); ball.c = c;
        K.burst(BX, s.y, pal(), 16, 260, { gravity: 0, life: .5 }); K.sfx(520, .1, 'triangle', .1, 400);
      }
      cam = Math.min(cam, ball.y - H * .55);
      while (built < -cam / GAP + 6) build(++built);
    }
    for (const p of pieces) { p.vy += 1200 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  };
  GAME.draw = gr => {
    const v = K.view, P = pal(), glow = K.skin.glow;
    gr.fillStyle = '#14121f'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    gr.fillStyle = 'rgba(255,255,255,.035)'; for (let i = -1; i < 12; i++) { const y = i * 90 - (cam * .3 % 90); gr.fillRect(v.x0, y, v.x1 - v.x0, 2); }
    gr.save(); gr.translate(0, -cam); gr.lineCap = 'butt';
    if (glow) { gr.shadowBlur = 14; }
    for (const o of obs) {
      if (o.y - cam > v.y1 + 250 || o.y - cam < v.y0 - 250) continue;
      if (o.type === 'bar') {
        const off = ((o.r0 + o.w * gt) % 1280 + 1280) % 1280;
        for (let k = -2; k < 4; k++) for (let i = 0; i < 4; i++) { gr.fillStyle = P[i]; if (glow) gr.shadowColor = P[i]; gr.fillRect(off + k * 1280 + i * 320, o.y - TH / 2, 320, TH); }
        continue;
      }
      const rings = o.type === 'double' ? [[o.R, 1], [o.R2, -1]] : [[o.R, 1]];
      for (const [R, dir] of rings) {
        const rot = (o.r0 + o.w * gt) * dir; gr.lineWidth = TH;
        for (let i = 0; i < 4; i++) { const c = P[dir < 0 ? i ^ 1 : i]; gr.strokeStyle = c; if (glow) gr.shadowColor = c; gr.beginPath(); gr.arc(BX, o.y, R, rot + i * Math.PI / 2 + .02, rot + (i + 1) * Math.PI / 2 - .02); gr.stroke(); }
      }
    }
    gr.shadowBlur = 0;
    for (const s of stars) if (!s.got) {
      gr.save(); gr.translate(BX, s.y); gr.scale(1 + .08 * Math.sin(K.t * 5), 1 + .08 * Math.sin(K.t * 5)); gr.fillStyle = '#fff'; gr.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 9 : 22, a = -Math.PI / 2 + i * Math.PI / 5; gr.lineTo(Math.cos(a) * r, Math.sin(a) * r); } gr.fill(); gr.restore();
    }
    for (const s of sw) if (!s.used) for (let i = 0; i < 4; i++) { gr.fillStyle = P[i]; gr.beginPath(); gr.moveTo(BX, s.y); gr.arc(BX, s.y, 18, K.t * 3 + i * Math.PI / 2, K.t * 3 + (i + 1) * Math.PI / 2); gr.fill(); }
    if (!dead) { gr.fillStyle = P[ball.c]; gr.shadowColor = P[ball.c]; gr.shadowBlur = 20; gr.beginPath(); gr.arc(BX, ball.y, BR, 0, 7); gr.fill(); gr.shadowBlur = 0; gr.fillStyle = 'rgba(255,255,255,.6)'; gr.beginPath(); gr.arc(BX - 4, ball.y - 4, 4, 0, 7); gr.fill(); }
    for (const p of pieces) { gr.fillStyle = p.c; gr.beginPath(); gr.arc(p.x, p.y, 6, 0, 7); gr.fill(); }
    gr.restore();
    if (!dead && !K.bot && K.score === 0 && ball.vy === 0) { gr.fillStyle = 'rgba(255,255,255,.8)'; gr.font = '28px "Titan One", Arial'; gr.textAlign = 'center'; gr.fillText('Tap to hop!', BX, 660); }
  };
})();
