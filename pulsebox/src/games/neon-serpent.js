/* Neon Serpent: classic snake. Eat to grow, speed rises, golden pellets pay coins. Hit a wall or yourself and it's over. */
const GAME = {
  id: 'neon-serpent', title: 'Neon Serpent', tagline: 'Eat. Grow. Go faster. Don\'t bite your own tail!',
  font: 'Righteous', accent: '#39ff88', accent2: '#ff3df0', bg: '#05070f',
  how: ['Steer with the arrow keys, WASD, or swipe.', 'Eat glowing pellets to grow. You speed up as you get longer.', 'Golden pellets pay coins but vanish fast. Walls and your own tail end the run.'],
  skins: [
    { name: 'Venom', price: 0, c: ['#39ff88', '#00b3ff'] }, { name: 'Lava', price: 60, c: ['#ffd23f', '#ff3d3d'] }, { name: 'Cotton', price: 150, c: ['#ff9cf0', '#7cc8ff'] },
    { name: 'Ghost', price: 250, c: ['#ffffff', '#6b7cff'] }, { name: 'Toxic', price: 400, c: ['#e9ff3d', '#7a2bff'] }, { name: 'Prism', price: 700, c: ['#ff0000', '#0000ff'], rainbow: true },
  ],
};
(() => {
  const C = 40, GW = 32, GH = 18;
  let body, dir, queue, stepT, acc, food, gold, coinP, grow, dead, eaten, prevBody, pulse;
  const DIRS = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  const segColor = (s, i, n) => s.rainbow ? `hsl(${(i * 14 + K.t * 120) % 360},100%,60%)` : mix(s.c[0], s.c[1], n > 1 ? i / (n - 1) : 0);
  function mix(a, b, t) { const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`; }
  GAME.drawSkin = (gr, s) => { for (let i = 0; i < 6; i++) { gr.fillStyle = segColor(s, i, 6); gr.beginPath(); gr.roundRect(-40 + i * 14 - (i > 2 ? 0 : 0), (i % 2 ? -6 : 6) - 8, 18, 18, 6); gr.fill(); } };
  const free = () => { let x, y; do { x = K.irand(1, GW - 2); y = K.irand(1, GH - 2); } while (body.some(b => b[0] === x && b[1] === y) || (food && food[0] === x && food[1] === y) || (gold && gold.x === x && gold.y === y) || (coinP && coinP.x === x && coinP.y === y)); return [x, y]; };
  GAME.pose = () => {
    body = []; for (let i = 0; i < 26; i++) { const t = i / 25; body.push([Math.round(22 - t * 14), Math.round(9 + Math.sin(t * 6.3) * 4)]); }
    body = body.filter((b, i) => i === 0 || b[0] !== body[i - 1][0] || b[1] !== body[i - 1][1]);
    const fill = [body[0]]; for (const b of body.slice(1)) { let p = fill[fill.length - 1]; while (p[0] !== b[0] || p[1] !== b[1]) { p = p[0] !== b[0] ? [p[0] + Math.sign(b[0] - p[0]), p[1]] : [p[0], p[1] + Math.sign(b[1] - p[1])]; fill.push(p); } }
    body = fill; prevBody = body.map(b => b.slice()); dir = [1, 0]; food = [25, 9]; gold = { x: 14, y: 4, t: 5 }; coinP = { x: 9, y: 14, t: 5 }; acc = stepT;
  };
  GAME.reset = () => {
    body = [[8, 9], [7, 9], [6, 9], [5, 9]]; prevBody = body.map(b => b.slice()); dir = [1, 0]; queue = []; stepT = .115; acc = 0; grow = 0; dead = false; eaten = 0; gold = null; coinP = null; food = null; pulse = 0;
    food = free();
  };
  function turn(d) {
    const last = queue.length ? queue[queue.length - 1] : dir;
    if ((d[0] === -last[0] && d[1] === -last[1]) || (d[0] === last[0] && d[1] === last[1])) return;
    if (queue.length < 3) queue.push(d);
  }
  GAME.key = (c, down) => { if (down && DIRS[c]) turn(DIRS[c]); };
  let sx = 0, sy = 0;
  GAME.down = (x, y) => { sx = x; sy = y; };
  GAME.move = (x, y, e) => { if (e.buttons || e.pointerType === 'touch') { const dx = x - sx, dy = y - sy; if (Math.hypot(dx, dy) > 30) { turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]); sx = x; sy = y; } } };
  GAME.bot = () => {
    if (dead || queue.length) return;
    const h = body[0], target = gold ? [gold.x, gold.y] : food, blocked = new Set(body.slice(0, -1).map(b => b[0] + ',' + b[1]));
    const ok = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH && !blocked.has(x + ',' + y);
    const room = (x, y) => { const seen = new Set([x + ',' + y]), st = [[x, y]]; while (st.length && seen.size < 200) { const [a, b] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (a + dx) + ',' + (b + dy); if (!seen.has(k) && ok(a + dx, b + dy)) { seen.add(k); st.push([a + dx, b + dy]); } } } return seen.size; };
    // BFS to the target
    const prev = new Map([[h[0] + ',' + h[1], null]]), qq = [h]; let found = null;
    while (qq.length && !found) { const [a, b] = qq.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = a + dx, y = b + dy, k = x + ',' + y; if (prev.has(k) || !ok(x, y)) continue; prev.set(k, a + ',' + b); if (x === target[0] && y === target[1]) { found = k; break; } qq.push([x, y]); } }
    let step = null;
    if (found) { let k = found; while (prev.get(k) !== h[0] + ',' + h[1]) k = prev.get(k); step = k.split(',').map(Number); }
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !(dx === -dir[0] && dy === -dir[1]) && ok(h[0] + dx, h[1] + dy)).map(([dx, dy]) => ({ d: [dx, dy], r: room(h[0] + dx, h[1] + dy) }));
    if (!opts.length) return;
    const bestRoom = Math.max(...opts.map(o => o.r));
    let pick = step && opts.find(o => o.d[0] === step[0] - h[0] && o.d[1] === step[1] - h[1] && o.r >= Math.min(bestRoom, body.length + 4));
    if (!pick) pick = opts.sort((a, b) => b.r - a.r)[0];
    if (Math.random() < .002) pick = K.pick(opts);
    if (pick.d[0] !== dir[0] || pick.d[1] !== dir[1]) queue.push(pick.d);
  };
  function die() { dead = true; K.shake(16); K.noise(.35, .25, 500); K.sfx(220, .5, 'sawtooth', .12, -180); body.forEach((b, i) => K.burst(b[0] * C + C / 2, b[1] * C + C / 2, segColor(K.skin, i, body.length), 3, 220, { gravity: 0, life: .7, square: true })); K.over(); }
  function step() {
    if (queue.length) dir = queue.shift();
    const h = body[0], nx = h[0] + dir[0], ny = h[1] + dir[1];
    prevBody = body.map(b => b.slice());
    if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || body.slice(0, grow > 0 ? body.length : -1).some(b => b[0] === nx && b[1] === ny)) { die(); return; }
    body.unshift([nx, ny]); if (grow > 0) { grow--; prevBody.push(prevBody[prevBody.length - 1].slice()); } else body.pop();
    const px = nx * C + C / 2, py = ny * C + C / 2;
    if (nx === food[0] && ny === food[1]) {
      eaten++; grow += 1; K.add(1, px, py - 30); pulse = 1; K.sfx(520 + (eaten % 12) * 40, .08, 'square', .08); K.burst(px, py, K.skin.c, 10, 220, { gravity: 0, life: .4 });
      food = free(); stepT = Math.max(.055, .115 - eaten * .0016);
      if (eaten % 7 === 0 && !gold) { const [x, y] = free(); gold = { x, y, t: 6 }; }
      if (eaten % 5 === 0 && !coinP) { const [x, y] = free(); coinP = { x, y, t: 9 }; }
      if (eaten % 20 === 0) { K.toast(`Length ${body.length + grow}!`); K.coin(2); }
    }
    if (gold && nx === gold.x && ny === gold.y) { grow += 2; K.add(3, px, py - 30, '#ffe36e'); K.coin(2, px, py); K.chime(784); gold = null; }
    if (coinP && nx === coinP.x && ny === coinP.y) { K.coin(1, px, py); coinP = null; }
  }
  GAME.update = dt => {
    pulse = Math.max(0, pulse - dt * 3);
    if (dead) return;
    acc += dt; while (acc >= stepT && !dead) { acc -= stepT; step(); }
    if (gold) { gold.t -= dt; if (gold.t <= 0) gold = null; }
    if (coinP) { coinP.t -= dt; if (coinP.t <= 0) coinP = null; }
  };
  GAME.draw = gr => {
    const v = K.view, s = K.skin;
    gr.fillStyle = '#05070f'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    gr.fillStyle = '#0a0f1f'; gr.fillRect(0, 0, W, H);
    gr.fillStyle = 'rgba(57,255,136,.05)'; for (let x = 0; x < GW; x++) for (let y = 0; y < GH; y++) if ((x + y) % 2) gr.fillRect(x * C, y * C, C, C);
    gr.strokeStyle = s.c[0]; gr.globalAlpha = .5 + pulse * .5; gr.lineWidth = 3; gr.shadowColor = s.c[0]; gr.shadowBlur = 12; gr.strokeRect(1.5, 1.5, W - 3, H - 3); gr.shadowBlur = 0; gr.globalAlpha = 1;
    const f = 1 - Math.max(0, acc / stepT), lerpPos = i => { const a = body[i], b = prevBody[i] || a; const t = dead ? 1 : 1 - f; return [(b[0] + (a[0] - b[0]) * t) * C + C / 2, (b[1] + (a[1] - b[1]) * t) * C + C / 2]; };
    // food
    const fp = [food[0] * C + C / 2, food[1] * C + C / 2], r = 11 + Math.sin(K.t * 6) * 2;
    gr.shadowColor = s.c[1]; gr.shadowBlur = 20; gr.fillStyle = s.c[1]; gr.beginPath(); gr.arc(fp[0], fp[1], r, 0, 7); gr.fill();
    if (gold) { gr.shadowColor = '#ffd23f'; gr.fillStyle = gold.t < 2 && Math.floor(K.t * 8) % 2 ? 'rgba(255,210,63,.3)' : '#ffd23f'; gr.save(); gr.translate(gold.x * C + C / 2, gold.y * C + C / 2); gr.rotate(K.t * 2); gr.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? 7 : 16, a = i * Math.PI / 5; gr.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } gr.fill(); gr.restore(); }
    if (coinP) { gr.shadowColor = '#ffcf2e'; gr.fillStyle = '#ffcf2e'; gr.beginPath(); gr.ellipse(coinP.x * C + C / 2, coinP.y * C + C / 2, 12 * Math.abs(Math.cos(K.t * 3)) + 2, 12, 0, 0, 7); gr.fill(); }
    gr.shadowBlur = 0;
    if (!dead) {
      for (let i = body.length - 1; i >= 0; i--) {
        const [x, y] = lerpPos(i), sz = i === 0 ? 36 : 32 - Math.min(10, i * .25), c = segColor(s, i, body.length);
        if (i < body.length - 1) { const [x2, y2] = lerpPos(i + 1); gr.strokeStyle = c; gr.lineWidth = sz - 4; gr.lineCap = 'round'; gr.beginPath(); gr.moveTo(x, y); gr.lineTo(x2, y2); gr.stroke(); }
        gr.fillStyle = c; if (i === 0) { gr.shadowColor = c; gr.shadowBlur = 18; } gr.beginPath(); gr.roundRect(x - sz / 2, y - sz / 2, sz, sz, 10); gr.fill(); gr.shadowBlur = 0;
      }
      const [hx, hy] = lerpPos(0), ex = dir[1] !== 0 ? 8 : 0, ey = dir[0] !== 0 ? 8 : 0;
      gr.fillStyle = '#fff'; [[1], [-1]].forEach(([k]) => { gr.beginPath(); gr.arc(hx + dir[0] * 6 + ex * k, hy + dir[1] * 6 + ey * k, 6, 0, 7); gr.fill(); });
      gr.fillStyle = '#05070f'; [[1], [-1]].forEach(([k]) => { gr.beginPath(); gr.arc(hx + dir[0] * 8 + ex * k, hy + dir[1] * 8 + ey * k, 3, 0, 7); gr.fill(); });
    }
  };
})();
