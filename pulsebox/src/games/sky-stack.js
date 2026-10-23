/* Sky Stack: drop the sliding block on the tower. Overhang is chopped off; perfect drops build a combo that widens the block. */
const GAME = {
  id: 'sky-stack', title: 'Sky Stack', tagline: 'Tap to drop. Stack it perfectly. How high can you go?',
  font: 'Lilita One', accent: '#ffd23f', accent2: '#ff6fae', bg: '#1b1446',
  how: ['Tap, click or press Space to drop the sliding block.', 'Anything hanging over the edge gets chopped off.', 'Land 3 perfect drops in a row and your block grows back!'],
  skins: [
    { name: 'Candy', price: 0, h: [330, 30] }, { name: 'Ocean', price: 60, h: [170, 230] }, { name: 'Lava', price: 150, h: [0, 35] },
    { name: 'Forest', price: 250, h: [85, 150] }, { name: 'Neon', price: 400, h: [280, 190], neon: true }, { name: 'Gold', price: 700, h: [38, 52], gold: true },
  ],
};
(() => {
  const BH = 46, BASE = 600, START_W = 320, MIN_X = 180, MAX_X = 1100;
  let blocks, cur, chunks, cam, combo, dead, speed, stars, clouds, wave;
  const hue = (s, i) => s.h[0] + (s.h[1] - s.h[0]) * (.5 + .5 * Math.sin(i * .35));
  const col = (s, i, l = 60) => s.gold ? `hsl(${hue(s, i)},${85}%,${l - 2}%)` : `hsl(${hue(s, i)},${s.neon ? 95 : 72}%,${l}%)`;
  function block(gr, s, i, x, y, w, alpha = 1) {
    gr.globalAlpha = alpha;
    if (s.neon) { gr.shadowColor = col(s, i, 60); gr.shadowBlur = 18; }
    gr.fillStyle = col(s, i, 58); gr.fillRect(x - w / 2, y, w, BH);
    gr.shadowBlur = 0;
    gr.fillStyle = col(s, i, 74); gr.fillRect(x - w / 2, y, w, 8);
    gr.fillStyle = col(s, i, 44); gr.fillRect(x - w / 2, y + BH - 7, w, 7);
    if (s.gold) { gr.fillStyle = 'rgba(255,255,255,.35)'; gr.fillRect(x - w / 2 + 10, y + 12, Math.min(40, w / 4), 5); }
    gr.globalAlpha = 1;
  }
  GAME.drawSkin = (gr, s) => { [0, 1, 2].forEach(i => block(gr, s, i, (i - 1) * 6, 20 - i * 26, 70 - i * 6)); };
  function next() {
    const n = blocks.length, from = n % 2 ? MIN_X : MAX_X, prev = blocks[n - 1];
    cur = { x: from, w: prev.w, dir: n % 2 ? 1 : -1, born: K.t };
  }
  GAME.reset = () => {
    blocks = [{ x: W / 2, w: START_W }]; chunks = []; cam = 0; combo = 0; dead = false; speed = 430; wave = 0;
    stars = Array.from({ length: 90 }, () => ({ x: Math.random() * 1600 - 160, y: Math.random() * 900 - 90, r: Math.random() * 2 + .5 }));
    clouds = Array.from({ length: 7 }, (_, i) => ({ x: Math.random() * W, y: 120 + i * 230, s: .6 + Math.random() * .7 }));
    next();
  };
  const topY = i => BASE - i * BH;
  function drop() {
    if (dead || !cur || K.t - cur.born < .18) return;
    const n = blocks.length, prev = blocks[n - 1], d = cur.x - prev.x, y = topY(n) - cam * 0;
    if (Math.abs(d) <= 7) {
      cur.x = prev.x; combo++;
      let w = cur.w;
      if (combo >= 3) { w = Math.min(START_W, w + 24); K.pop(cur.x, topY(n) - 30, 'Bigger!', '#7dffb0', 30); }
      blocks.push({ x: cur.x, w, perfect: 1 });
      K.add(1); K.coin(1, cur.x, topY(n)); wave = 1;
      K.pop(cur.x, topY(n) - 60, combo > 1 ? `Perfect x${combo}` : 'Perfect!', '#ffe36e', 36);
      K.burst(cur.x - w / 2, topY(n) + BH / 2, ['#fff', '#ffe36e'], 8, 220, { life: .4 }); K.burst(cur.x + w / 2, topY(n) + BH / 2, ['#fff', '#ffe36e'], 8, 220, { life: .4 });
      K.sfx(440 * Math.pow(2, Math.min(combo, 12) / 12), .14, 'triangle', .14); K.sfx(880 * Math.pow(2, Math.min(combo, 12) / 12), .12, 'sine', .08, 0, .04);
    } else {
      const over = cur.w - Math.abs(d);
      if (over <= 0) {
        chunks.push({ x: cur.x, y: topY(n), w: cur.w, vy: 0, vx: d > 0 ? 80 : -80, r: 0, i: n });
        dead = true; cur = null; K.shake(18); K.noise(.35, .25, 200); K.sfx(200, .5, 'sawtooth', .12, -150); K.over(); return;
      }
      combo = 0;
      const nx = prev.x + d / 2, cutW = Math.abs(d), cx = d > 0 ? nx + over / 2 + cutW / 2 : nx - over / 2 - cutW / 2;
      chunks.push({ x: cx, y: topY(n), w: cutW, vy: -60, vx: d > 0 ? 120 : -120, r: 0, i: n });
      blocks.push({ x: nx, w: over });
      K.add(1); K.shake(4); K.noise(.12, .12, 1500); K.sfx(260, .08, 'square', .08);
    }
    const h = blocks.length - 1;
    if (h % 10 === 0) { K.coin(2, blocks[h].x, topY(h)); K.toast(`${h} high!`); K.chime(523); }
    speed = Math.min(980, 430 + h * 11);
    next();
  }
  GAME.down = drop;
  GAME.key = (c, d) => { if (d && (c === 'Space' || c === 'Enter' || c === 'ArrowDown')) drop(); };
  let botErr = 0, botWait = 0;
  GAME.bot = dt => {
    if (dead || !cur) return; botWait -= dt; if (botWait > 0) return;
    const prev = blocks[blocks.length - 1];
    if (!botErr) botErr = Math.random() < .55 ? K.rand(0, 5) : K.rand(8, 30 + blocks.length * 1.5);
    if (Math.abs(cur.x - prev.x) <= botErr || (cur.dir > 0 && cur.x > prev.x + botErr && cur.x - prev.x < botErr + 25)) { drop(); botErr = 0; botWait = .25; }
  };
  GAME.update = dt => {
    if (cur) {
      cur.x += cur.dir * speed * dt;
      if (cur.x > MAX_X) { cur.x = MAX_X; cur.dir = -1; } if (cur.x < MIN_X) { cur.x = MIN_X; cur.dir = 1; }
    }
    const target = Math.max(0, (blocks.length - 7) * BH);
    cam += (target - cam) * Math.min(1, dt * 5);
    for (const c of chunks) { c.vy += 1500 * dt; c.y += c.vy * dt; c.x += c.vx * dt; c.r += c.vx * .004 * dt; }
    chunks = chunks.filter(c => c.y < BASE + cam + 400);
    wave = Math.max(0, wave - dt * 2.5);
    for (const cl of clouds) { cl.x += 18 * cl.s * dt; if (cl.x > W + 200) cl.x = -200; }
  };
  GAME.draw = gr => {
    const v = K.view, h = cam / BH, k = Math.min(1, h / 60);
    const sky = gr.createLinearGradient(0, v.y0, 0, v.y1);
    sky.addColorStop(0, `hsl(${K.lerp(205, 255, k)},${K.lerp(80, 60, k)}%,${K.lerp(62, 8, k)}%)`);
    sky.addColorStop(1, `hsl(${K.lerp(195, 270, k)},${K.lerp(85, 55, k)}%,${K.lerp(84, 20, k)}%)`);
    gr.fillStyle = sky; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    if (k > .25) { gr.fillStyle = '#fff'; for (const s of stars) { gr.globalAlpha = (k - .25) * 1.3 * (.5 + .5 * Math.sin(K.t * 2 + s.x)); gr.beginPath(); gr.arc(s.x, s.y, s.r, 0, 7); gr.fill(); } gr.globalAlpha = 1; }
    for (const cl of clouds) {
      const y = cl.y + (cam * .35 % 1600) - 400; if (k > .8) break;
      gr.globalAlpha = .7 * (1 - k); gr.fillStyle = '#fff';
      [[0, 0, 40], [40, -14, 34], [80, 0, 38], [40, 10, 40]].forEach(([dx, dy, r]) => { gr.beginPath(); gr.arc(cl.x + dx * cl.s, y + dy * cl.s, r * cl.s, 0, 7); gr.fill(); });
      gr.globalAlpha = 1;
    }
    gr.save(); gr.translate(0, cam);
    // ground
    gr.fillStyle = '#3a8f4a'; gr.fillRect(v.x0, BASE + BH, v.x1 - v.x0, 400); gr.fillStyle = '#56b85f'; gr.fillRect(v.x0, BASE + BH, v.x1 - v.x0, 14);
    const s = K.skin;
    blocks.forEach((b, i) => { if (topY(i) + cam < v.y1 + 60) block(gr, s, i, b.x, topY(i), b.w); });
    if (wave > 0) { const b = blocks[blocks.length - 1]; gr.strokeStyle = `rgba(255,255,255,${wave})`; gr.lineWidth = 4; const e = (1 - wave) * 30; gr.strokeRect(b.x - b.w / 2 - e, topY(blocks.length - 1) - e, b.w + e * 2, BH + e * 2); }
    for (const c of chunks) { gr.save(); gr.translate(c.x, c.y + BH / 2); gr.rotate(c.r); block(gr, s, c.i, 0, -BH / 2, c.w, .9); gr.restore(); }
    if (cur) {
      const n = blocks.length, prev = blocks[n - 1];
      gr.fillStyle = 'rgba(255,255,255,.12)'; gr.fillRect(prev.x - prev.w / 2, topY(n) - 400, prev.w, 400);
      block(gr, s, n, cur.x, topY(n), cur.w);
    }
    gr.restore();
  };
})();
