/* Hue Hop: tap to bounce upward and only pass through the part of each obstacle that matches your ball's color.
   Obstacles: spinning rings, double rings, dotted rings, sliding bars and windmill crosses. Every 10 obstacles the
   world moves to a new zone with its own colors. Color orbs change your color; stars are your score. */
const GAME = {
  id: 'hue-hop', title: 'Hue Hop', tagline: 'Tap to hop. Only pass through your own color!',
  font: 'Titan One', accent: '#ff3d8b', accent2: '#32e0ff', bg: '#14121f',
  how: ['Tap, click or press Space to hop up.', 'You can only pass through the part that matches your color.', 'Touch a color orb to change color. Grab stars for points. Every 10 obstacles is a new zone!'],
  skins: [
    { name: 'Classic', price: 0, pal: ['#32e0ff', '#ff3d8b', '#ffd23f', '#8c5bff'] }, { name: 'Pastel', price: 60, pal: ['#9fe8ff', '#ffb3d1', '#fff1a6', '#c9b5ff'] },
    { name: 'Jungle', price: 150, pal: ['#3ddc97', '#ff8c42', '#f9f871', '#2e86ab'] }, { name: 'Sunset', price: 250, pal: ['#ff6b6b', '#ffa94d', '#ffd43b', '#cc5de8'] },
    { name: 'Ocean', price: 400, pal: ['#00b4d8', '#90e0ef', '#ff7aa2', '#ffd166'] }, { name: 'Neon', price: 700, pal: ['#39ff14', '#ff073a', '#00f0ff', '#ffe600'], glow: true },
  ],
};
(() => {
  const BX = W / 2, BR = 13, GRAV = 1500, HOP = -540, GAP = 450, TH = 22;
  const ZONES = [
    { n: 'Neon Night', a: '#140f2a', b: '#2a1240', p: '#ff3d8b' }, { n: 'Aurora', a: '#06202a', b: '#0f3a3a', p: '#5dffb0' },
    { n: 'Deep Sea', a: '#041228', b: '#0a2a5a', p: '#32e0ff' }, { n: 'Synth Sunset', a: '#2a0a2a', b: '#5a1a3a', p: '#ffa94d' },
    { n: 'Galaxy', a: '#05040f', b: '#1a0f3a', p: '#c9b5ff' },
  ];
  let ball, obs, orbs, stars, cam, dead, gt, built, starCount, pieces, trail, rings, passed, zone, zoneT, slow, bg, hopT, flashT;
  const pal = () => K.skin.pal;
  GAME.drawSkin = (gr, s) => { for (let i = 0; i < 4; i++) { gr.strokeStyle = s.pal[i]; gr.lineWidth = 12; gr.beginPath(); gr.arc(0, 0, 36, i * Math.PI / 2, (i + 1) * Math.PI / 2); gr.stroke(); } gr.fillStyle = s.pal[1]; gr.beginPath(); gr.arc(0, 0, 12, 0, 7); gr.fill(); };
  function build(n) {
    const y = 440 - n * GAP, d = Math.min(1, n / 40), sp = (1.3 + d * 1.5) * (Math.random() < .5 ? 1 : -1);
    const r = Math.random(), type = n < 3 ? 'ring' : r < .34 ? 'ring' : r < .5 ? 'double' : r < .66 ? 'dots' : r < .83 ? 'bar' : 'cross';
    const o = { n, type, y, r0: Math.random() * 6.28, w: sp, R: K.rand(112, 128) - d * 6 };
    if (type === 'bar') { o.w = (240 + d * 200) * Math.sign(sp); o.r0 = Math.random() * 1280; }
    if (type === 'double') { o.R = K.rand(96, 104); o.R2 = o.R + 42; }
    if (type === 'cross') { o.side = Math.random() < .5 ? -1 : 1; o.cx = BX + o.side * 120; o.L = 150; o.w = sp * .7; }
    obs.push(o);
    stars.push({ y: type === 'bar' || type === 'cross' ? y - 110 : y, got: false });
    const prev = orbs.length ? orbs[orbs.length - 1].to : ball.c; let to; do { to = K.irand(0, 3); } while (to === prev);
    orbs.push({ y: y - GAP / 2, used: false, to });
  }
  GAME.reset = () => {
    ball = { y: 560, vy: 0, c: 0, sq: 0 }; obs = []; orbs = []; stars = []; cam = 0; dead = false; gt = 0; built = 0; starCount = 0; pieces = []; trail = []; rings = []; passed = 0; zone = 0; zoneT = 2.2; slow = 0; hopT = 0; flashT = 0;
    bg = Array.from({ length: 60 }, () => ({ x: Math.random() * 1600 - 160, y: Math.random() * 1400, s: K.rand(.3, 1), r: K.rand(1, 3) }));
    for (; built < 5; built++) build(built + 1);
  };
  // the color touching the ball's column at height y and time t, or null
  function hitColor(o, y, t) {
    if (o.type === 'bar') { if (Math.abs(y - o.y) > TH / 2 + BR) return null; const off = o.r0 + o.w * t; return Math.floor((((BX - off) % 1280) + 1280) % 1280 / 320); }
    if (o.type === 'cross') {
      if (Math.abs(y - o.y) > o.L + BR) return null;
      for (let i = 0; i < 4; i++) {
        const a = o.r0 + o.w * t + i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
        if (Math.abs(ca) < .05) continue; const rr = (BX - o.cx) / ca; if (rr < 0 || rr > o.L) continue;
        const hy = o.y + rr * sa; if (Math.abs(y - hy) < (TH / 2) / Math.abs(ca) + BR * .8) return i;
      }
      return null;
    }
    const rings2 = o.type === 'double' ? [[o.R, 1], [o.R2, -1]] : [[o.R, 1]];
    for (const [R, dir] of rings2) {
      const dy = y - o.y; if (Math.abs(Math.abs(dy) - R) > TH / 2 + BR) continue;
      const ang = dy > 0 ? Math.PI / 2 : -Math.PI / 2, rot = (o.r0 + o.w * t) * dir, rel = (((ang - rot) % 6.283) + 6.283) % 6.283;
      const i = Math.floor(rel / (Math.PI / 2)) % 4;
      if (o.type === 'dots') { const seg = rel / (Math.PI / 8) % 1; if (seg < .22 || seg > .78) return null; }
      return dir < 0 ? i ^ 1 : i;
    }
    return null;
  }
  const near = y => obs.filter(o => Math.abs(o.y - y) < 220);
  const bad = (y, t, c) => near(y).some(o => { const h = hitColor(o, y, t); return h !== null && h !== c; });
  function hop() { if (dead) return; ball.vy = HOP; ball.sq = 1; hopT = .25; K.sfx(560 + ball.c * 60, .07, 'sine', .1, 220); rings.push({ y: ball.y + 10, t: 0, c: pal()[ball.c] }); }
  GAME.down = hop;
  GAME.key = (c, d) => { if (d && (c === 'Space' || c === 'Enter' || c === 'ArrowUp' || c === 'KeyW')) hop(); };
  // the bot plans: is there a sequence of hops (a choice every 0.1 s) that stays safe for the next second?
  function orbAt(y0, y1, c) { for (const s of orbs) if (!s.used && s.y <= Math.max(y0, y1) + 20 && s.y >= Math.min(y0, y1) - 20) c = s.to; return c; }
  // the bot looks ~1.5 s ahead (a hop-or-wait choice every 8 frames) and picks the move that lets it climb highest safely
  let budget = 0;
  function best(y, vy, t, c, cm, depth, top) {
    if (--budget < 0) return Infinity;
    for (let i = 0; i < 8; i++) { vy += GRAV / 60; const ny = y + vy / 60; c = orbAt(y, ny, c); y = ny; t += 1 / 60; cm = Math.min(cm, y - H * .55); top = Math.min(top, y); if (bad(y, t, c) || y - cm > H + 10) return Infinity; }
    if (depth === 0) return top;
    const a = vy > -150 ? best(y, HOP, t, c, cm, depth - 1, top) : Infinity;
    return Math.min(a, best(y, vy, t, c, cm, depth - 1, top));
  }
  GAME.bot = () => {
    if (dead) return; if ((GAME._lag = (GAME._lag || 0) - 1) > 0) return;
    budget = 20000; const tap = ball.vy > -150 ? best(ball.y, HOP, gt, ball.c, cam, 16, ball.y) : Infinity;
    budget = 20000; const wait = best(ball.y, ball.vy, gt, ball.c, cam, 16, ball.y);
    if (tap < Infinity && tap < wait - 6) { hop(); GAME._lag = 4; }
    else if (tap === Infinity && wait === Infinity && ball.y - cam > H - 80) hop();
    GAME._lag = Math.max(GAME._lag || 0, 2);
  };
  function die() {
    if (dead) return; dead = true; slow = .5; flashT = .3; K.shake(16); K.noise(.35, .2, 500); K.sfx(260, .5, 'square', .1, -200);
    for (let i = 0; i < 36; i++) { const a = Math.random() * 6.28, s = K.rand(150, 650); pieces.push({ x: BX, y: ball.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 200, c: pal()[i % 4], r: K.rand(3, 8), rot: Math.random() * 6 }); }
    K.over({ title: 'Wrong color!', text: `You passed ${passed} obstacles and reached ${ZONES[zone % ZONES.length].n}.`, delay: 900 });
  }
  GAME.update = dt => {
    if (slow > 0) { slow -= dt; dt *= .35; }
    gt += dt; zoneT -= dt; flashT -= dt; hopT -= dt;
    for (const r of rings) r.t += dt; rings = rings.filter(r => r.t < .5);
    for (const p of pieces) { p.vy += 1300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 8; }
    if (dead) return;
    const started = K.bot || K.score > 0 || ball.vy !== 0 || passed > 0;
    if (started) { const py = ball.y; ball.vy += GRAV * dt; ball.y += ball.vy * dt; ball.sq = Math.max(0, ball.sq - dt * 5);
      for (const s of orbs) if (!s.used && s.y <= py + 20 && s.y >= ball.y - 20) {
        s.used = true; ball.c = s.to; K.burst(BX, s.y - cam, pal(), 18, 300, { gravity: 0, life: .5 }); K.sfx(520, .1, 'triangle', .1, 500); flashT = .12;
      } }
    trail.push({ y: ball.y, c: ball.c }); if (trail.length > 14) trail.shift();
    if (bad(ball.y, gt, ball.c)) return die();
    if (ball.y - cam > H + 20) return die();
    for (const o of obs) if (!o.passed && ball.y < o.y - (o.R2 || o.R || o.L || 20) - BR) {
      o.passed = true; passed++;
      if (passed % 10 === 0) { zone++; zoneT = 2.4; K.chime(523, [0, 4, 7, 12]); K.flash(ZONES[zone % ZONES.length].p, .25); if (!K.bot) K.coin(2, BX, H / 2); }
    }
    for (const s of stars) if (!s.got && Math.abs(ball.y - s.y) < 30) {
      s.got = true; starCount++; K.add(1, BX + 60, s.y - cam, '#ffe36e'); K.sfx(880, .08, 'triangle', .1); K.sfx(1320, .1, 'triangle', .08, 0, .06);
      K.burst(BX, s.y - cam, ['#fff', '#ffe36e'], 12, 240, { gravity: 0, life: .45 });
      if (starCount % 4 === 0) K.coin(1, BX, s.y - cam);
    }
    cam = Math.min(cam, ball.y - H * .55);
    while (built < 4 + Math.ceil((440 - cam) / GAP)) build(++built);
    obs = obs.filter(o => o.y - cam < H + 400); stars = stars.filter(s => s.y - cam < H + 200); orbs = orbs.filter(s => s.y - cam < H + 200);
  };
  /* ---------- drawing ---------- */
  function rgba(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  function arcSeg(gr, x, y, R, a0, a1, c, glow) {
    gr.strokeStyle = c; gr.lineWidth = TH; gr.lineCap = 'round';
    if (glow) { gr.shadowColor = c; gr.shadowBlur = 18; }
    gr.beginPath(); gr.arc(x, y, R, a0, a1); gr.stroke(); gr.shadowBlur = 0;
    gr.strokeStyle = 'rgba(255,255,255,.35)'; gr.lineWidth = 4; gr.beginPath(); gr.arc(x, y, R - 5, a0 + .05, a1 - .05); gr.stroke();
  }
  GAME.draw = gr => {
    const v = K.view, P = pal(), glow = true, Z = ZONES[zone % ZONES.length], Zp = ZONES[(zone + ZONES.length - 1) % ZONES.length], zk = Math.min(1, Math.max(0, 1 - (zoneT - .4) / 2));
    const g = gr.createLinearGradient(0, v.y0, 0, v.y1); g.addColorStop(0, zk < 1 ? Zp.a : Z.a); g.addColorStop(1, zk < 1 ? Zp.b : Z.b); gr.fillStyle = g; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    if (zk < 1) { gr.globalAlpha = zk; const g2 = gr.createLinearGradient(0, v.y0, 0, v.y1); g2.addColorStop(0, Z.a); g2.addColorStop(1, Z.b); gr.fillStyle = g2; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); gr.globalAlpha = 1; }
    // big soft shapes and drifting particles, slower than the play field
    for (let i = 0; i < 5; i++) { const y = ((i * 380 - cam * .15) % 1900 + 1900) % 1900 - 300, x = i % 2 ? 260 : 1020, c = P[i % 4]; const rg = gr.createRadialGradient(x, y, 10, x, y, 260); rg.addColorStop(0, rgba(c, .16)); rg.addColorStop(1, rgba(c, 0)); gr.fillStyle = rg; gr.fillRect(x - 260, y - 260, 520, 520); }
    for (const b of bg) { const y = ((b.y - cam * b.s * .4) % 1400 + 1400) % 1400 - 200; gr.fillStyle = rgba(Z.p, .25 + b.s * .4); gr.beginPath(); gr.arc(b.x, y, b.r, 0, 7); gr.fill(); }
    // the score, huge, behind everything
    gr.font = '220px "Titan One", Arial'; gr.textAlign = 'center'; gr.textBaseline = 'middle'; gr.fillStyle = 'rgba(255,255,255,.04)'; gr.fillText(String(passed), BX, H / 2);
    gr.save(); gr.translate(0, -cam);
    for (const o of obs) {
      if (o.y - cam > v.y1 + 260 || o.y - cam < v.y0 - 260) continue;
      const rot = o.r0 + o.w * gt;
      if (o.type === 'bar') {
        const off = ((o.r0 + o.w * gt) % 1280 + 1280) % 1280;
        for (let k = -2; k < 3; k++) for (let i = 0; i < 4; i++) { const x = off + k * 1280 + i * 320; gr.fillStyle = P[i]; gr.shadowColor = P[i]; gr.shadowBlur = 16; gr.beginPath(); gr.roundRect(x + 3, o.y - TH / 2, 314, TH, TH / 2); gr.fill(); gr.shadowBlur = 0; gr.fillStyle = 'rgba(255,255,255,.3)'; gr.fillRect(x + 12, o.y - TH / 2 + 3, 296, 4); }
        continue;
      }
      if (o.type === 'cross') {
        gr.save(); gr.translate(o.cx, o.y); gr.rotate(rot);
        for (let i = 0; i < 4; i++) { gr.save(); gr.rotate(i * Math.PI / 2); gr.fillStyle = P[i]; gr.shadowColor = P[i]; gr.shadowBlur = 16; gr.beginPath(); gr.roundRect(6, -TH / 2, o.L, TH, TH / 2); gr.fill(); gr.shadowBlur = 0; gr.fillStyle = 'rgba(255,255,255,.3)'; gr.fillRect(14, -TH / 2 + 3, o.L - 20, 4); gr.restore(); }
        gr.fillStyle = '#fff'; gr.beginPath(); gr.arc(0, 0, 14, 0, 7); gr.fill(); gr.restore();
        continue;
      }
      const rr = o.type === 'double' ? [[o.R, 1], [o.R2, -1]] : [[o.R, 1]];
      for (const [R, dir] of rr) {
        const r2 = rot * dir;
        if (o.type === 'dots') { for (let j = 0; j < 16; j++) { const a = r2 + (j + .5) * Math.PI / 8, c = P[Math.floor(j / 4)]; gr.fillStyle = c; gr.shadowColor = c; gr.shadowBlur = 14; gr.beginPath(); gr.arc(BX + Math.cos(a) * R, o.y + Math.sin(a) * R, TH * .62, 0, 7); gr.fill(); } gr.shadowBlur = 0; continue; }
        for (let i = 0; i < 4; i++) arcSeg(gr, BX, o.y, R, r2 + i * Math.PI / 2 + .06, r2 + (i + 1) * Math.PI / 2 - .06, P[dir < 0 ? i ^ 1 : i], glow);
      }
    }
    for (const s of stars) if (!s.got) {
      gr.save(); gr.translate(BX, s.y); gr.rotate(Math.sin(K.t * 2) * .2); const sc = 1 + .1 * Math.sin(K.t * 5); gr.scale(sc, sc);
      gr.shadowColor = '#ffe36e'; gr.shadowBlur = 16; gr.fillStyle = '#fff6c0'; gr.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 8 : 20, a = -Math.PI / 2 + i * Math.PI / 5; gr.lineTo(Math.cos(a) * r, Math.sin(a) * r); } gr.fill(); gr.restore();
    }
    for (const s of orbs) if (!s.used) {
      gr.save(); gr.translate(BX, s.y); const pulse = 1 + Math.sin(K.t * 6) * .08; gr.scale(pulse, pulse);
      for (let i = 0; i < 4; i++) { gr.fillStyle = P[i]; gr.beginPath(); gr.moveTo(0, 0); gr.arc(0, 0, 17, K.t * 3 + i * Math.PI / 2, K.t * 3 + (i + 1) * Math.PI / 2); gr.fill(); }
      gr.strokeStyle = '#fff'; gr.lineWidth = 3; gr.beginPath(); gr.arc(0, 0, 19, 0, 7); gr.stroke();
      gr.strokeStyle = rgba('#ffffff', .35); gr.lineWidth = 2; gr.beginPath(); gr.arc(0, 0, 26 + Math.sin(K.t * 4) * 3, 0, 7); gr.stroke(); gr.restore();
    }
    for (const r of rings) { gr.strokeStyle = rgba(r.c, .6 * (1 - r.t / .5)); gr.lineWidth = 3; gr.beginPath(); gr.ellipse(BX, r.y, 14 + r.t * 70, 4 + r.t * 14, 0, 0, 7); gr.stroke(); }
    if (!dead) {
      trail.forEach((p, i) => { const a = i / trail.length; gr.fillStyle = rgba(P[p.c], a * .45); gr.beginPath(); gr.arc(BX, p.y, BR * (.4 + a * .6), 0, 7); gr.fill(); });
      const c = P[ball.c], sx = 1 + ball.sq * .25, sy = 1 - ball.sq * .2;
      gr.save(); gr.translate(BX, ball.y); gr.scale(sx, sy);
      const rg = gr.createRadialGradient(0, 0, 4, 0, 0, 46); rg.addColorStop(0, rgba(c, .5)); rg.addColorStop(1, rgba(c, 0)); gr.fillStyle = rg; gr.fillRect(-46, -46, 92, 92);
      gr.fillStyle = c; gr.beginPath(); gr.arc(0, 0, BR, 0, 7); gr.fill();
      gr.fillStyle = 'rgba(255,255,255,.7)'; gr.beginPath(); gr.arc(-4, -4, 4.5, 0, 7); gr.fill(); gr.restore();
    }
    for (const p of pieces) { gr.save(); gr.translate(p.x, p.y); gr.rotate(p.rot); gr.fillStyle = p.c; gr.fillRect(-p.r, -p.r, p.r * 2, p.r * 2); gr.restore(); }
    gr.restore();
    if (flashT > 0) { gr.fillStyle = `rgba(255,255,255,${flashT * 1.5})`; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
    // zone banner
    if (zoneT > 0 && (zone > 0 || !K.bot)) { const k = Math.min(1, zoneT * 2, (2.4 - zoneT) * 5); gr.save(); gr.globalAlpha = k; gr.translate(BX, 120); gr.font = '22px "Titan One", Arial'; gr.fillStyle = Z.p; gr.textAlign = 'center'; gr.fillText(zone ? `ZONE ${zone + 1}` : 'ZONE 1', 0, -30); gr.font = '54px "Titan One", Arial'; gr.fillStyle = '#fff'; gr.fillText(Z.n, 0, 16); gr.restore(); }
    // which color you are
    gr.fillStyle = 'rgba(0,0,0,.35)'; gr.beginPath(); gr.roundRect(v.x1 - 150, H - 70, 120, 44, 22); gr.fill(); for (let i = 0; i < 4; i++) { gr.fillStyle = P[i]; gr.beginPath(); gr.arc(v.x1 - 128 + i * 26, H - 48, i === ball.c ? 11 : 6, 0, 7); gr.fill(); }
    if (!dead && !K.bot && K.score === 0 && ball.vy === 0 && passed === 0) { gr.fillStyle = 'rgba(255,255,255,.85)'; gr.font = '28px "Titan One", Arial'; gr.textAlign = 'center'; gr.fillText('Tap to hop!', BX, 670); }
  };
  GAME.test = () => ({ passed, dead, y: ball.y, c: ball.c, cam, near: obs.filter(o => Math.abs(o.y - ball.y) < 400).map(o => o.type + "@" + Math.round(o.y - ball.y)) });
  GAME.pose = () => { gt = 1.3; const o = obs[1]; ball.y = o.y + o.R + 70; cam = o.y - 330; ball.c = 1; ball.vy = -300; trail = Array.from({ length: 12 }, (_, i) => ({ y: ball.y + (12 - i) * 8, c: 1 })); passed = 7; };
})();
