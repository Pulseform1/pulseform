/* Rooftop Rush: an endless parkour run across city rooftops with a security drone on your tail.
   Jump gaps and vents, slide under signs. Stumble and the drone closes in; fall and it's over. */
const GAME = {
  id: 'rooftop-rush', title: 'Rooftop Rush', tagline: 'Run the rooftops. Don\'t look down. Don\'t let the drone catch you.',
  font: 'Bangers', accent: '#ffb23f', accent2: '#4fd8ff', bg: '#140c24', scoreLabel: 'Meters',
  how: ['Tap, click, Space or Up to jump. Hold for a bigger jump. Jump again in the air to double jump.', 'Swipe down, or press Down or S, to slide under signs.', 'Hit a vent and you stumble. The drone gets closer. Fall and it\'s over.'],
  skins: [
    { name: 'Hoodie', price: 0, c: ['#ff6b4a', '#2a2a3a'] }, { name: 'Volt', price: 60, c: ['#c6ff3d', '#1a2a1a'] }, { name: 'Ice', price: 150, c: ['#7fe7ff', '#1a2a3a'] },
    { name: 'Ninja', price: 250, c: ['#2a2a2a', '#d23a3a'] }, { name: 'Neon', price: 400, c: ['#ff3df0', '#3a1a4a'] }, { name: 'Gold', price: 700, c: ['#ffd23f', '#6a4a10'] },
  ],
};
(() => {
  const PX = 330, G = 2600, JUMP = -900;
  let roofs, obs, coins, me, speed, dist, drone, cam, dead, stumbleT, sky, far, near, hold, jumps, slideT, swipe, lastRoofX, cnt;
  function runner(gr, s, x, y, t, mode) {
    gr.save(); gr.translate(x, y); gr.lineCap = 'round'; gr.lineJoin = 'round';
    const sw = Math.sin(t * 16), legs = mode === 'air' ? [[-.9, .6], [.7, 1.2]] : mode === 'slide' ? null : [[sw, Math.max(0, -sw)], [-sw, Math.max(0, sw)]];
    if (mode === 'slide') { gr.rotate(-1.2); }
    gr.strokeStyle = s.c[1]; gr.lineWidth = 11;
    if (legs) for (const [a, k] of legs) { const kx = Math.sin(a) * 22, ky = 26, fx = kx + Math.sin(a - 1.2 * k - .3) * 22, fy = 50; gr.beginPath(); gr.moveTo(0, 4); gr.lineTo(kx, ky); gr.lineTo(fx, fy); gr.stroke(); }
    else { gr.beginPath(); gr.moveTo(0, 4); gr.lineTo(10, 30); gr.lineTo(34, 40); gr.moveTo(0, 4); gr.lineTo(22, 22); gr.lineTo(44, 26); gr.stroke(); }
    gr.strokeStyle = s.c[0]; gr.lineWidth = 16; gr.beginPath(); gr.moveTo(0, 6); gr.lineTo(4, -30); gr.stroke();
    gr.lineWidth = 8; for (const k of [1, -1]) { const a = mode === 'air' ? -1.6 * k : sw * k * .9; gr.beginPath(); gr.moveTo(3, -24); gr.lineTo(3 + Math.sin(a) * 18, -12 + Math.cos(a) * 8); gr.lineTo(8 + Math.sin(a) * 30, -14 + Math.cos(a) * 18); gr.stroke(); }
    gr.fillStyle = s.c[0]; gr.beginPath(); gr.arc(6, -44, 13, 0, 7); gr.fill(); gr.fillStyle = '#f1c7a5'; gr.beginPath(); gr.arc(10, -42, 8, -1.2, 1.6); gr.fill();
    gr.restore();
  }
  GAME.drawSkin = (gr, s) => runner(gr, s, -4, 4, 1.2, 'run');
  function addRoof() {
    const last = roofs[roofs.length - 1], gap = cnt < 3 ? 120 : K.rand(110, 150 + Math.min(220, speed * .22)), w = K.rand(380, 900);
    const y = K.clamp(last.y + K.rand(-110, 120), 360, 600), x = last.x + last.w + gap;
    const r = { x, w, y, hue: K.irand(210, 290), win: Math.random() }; roofs.push(r); cnt++;
    // obstacles on the roof
    let ox = x + 160;
    while (ox < x + w - 140 && cnt > 2) { if (Math.random() < .55) obs.push(Math.random() < .55 ? { x: ox, y, w: 54, h: 46, k: 'vent' } : { x: ox, y, w: 90, h: 120, k: 'sign' }); ox += K.rand(220, 360); }
    // a line or arc of coins
    if (Math.random() < .7) { const arc = Math.random() < .5; for (let i = 0; i < 5; i++) coins.push({ x: x - (arc ? gap * .7 : -60) + i * 46, y: (arc ? Math.min(last.y, y) - 90 - Math.sin(i / 4 * Math.PI) * 80 : y - 70), got: false }); }
  }
  GAME.reset = () => {
    roofs = [{ x: -200, w: 1400, y: 520, hue: 250, win: .5 }]; obs = []; coins = []; cnt = 0; speed = 430; dist = 0; cam = 0; dead = false; stumbleT = 0; hold = false; jumps = 0; slideT = 0; swipe = null;
    me = { x: PX, y: 520, vy: 0, ground: true };
    drone = { gap: 330, y: 300 };
    for (let i = 0; i < 6; i++) addRoof();
    sky = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * 300, r: Math.random() * 1.6 + .3 }));
    far = Array.from({ length: 30 }, (_, i) => ({ x: i * 90, w: K.rand(50, 100), h: K.rand(140, 320) }));
    near = Array.from({ length: 18 }, (_, i) => ({ x: i * 150, w: K.rand(90, 150), h: K.rand(200, 420) }));
  };
  function jump() {
    if (dead) return;
    if (me.ground || jumps < 2) { me.vy = jumps === 0 && me.ground ? JUMP : JUMP * .85; me.ground = false; jumps++; slideT = 0; hold = true; K.sfx(jumps > 1 ? 700 : 480, .1, 'square', .07, 300); if (jumps > 1) K.burst(me.x + cam, me.y, ['#fff', '#cfe8ff'], 8, 160, { gravity: 0, life: .3 }); }
  }
  function slide() { if (dead) return; if (me.ground) { slideT = .65; K.noise(.25, .08, 1500); } else me.vy = Math.max(me.vy, 900); }
  GAME.down = (x, y) => { swipe = { x, y, t: K.t, used: false }; };
  GAME.move = (x, y, e) => { if (swipe && !swipe.used && (e.buttons || e.pointerType === 'touch') && y - swipe.y > 50) { swipe.used = true; slide(); } };
  GAME.up = () => { if (swipe && !swipe.used) jump(); swipe = null; hold = false; };
  GAME.key = (c, d) => { if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') { if (d) jump(); else hold = false; } if (d && (c === 'ArrowDown' || c === 'KeyS')) slide(); };
  GAME.bot = () => {
    if (dead) return;
    const wx = me.x + cam, roof = roofs.find(r => wx >= r.x - 20 && wx <= r.x + r.w), ahead = roofs.find(r => r.x > wx);
    if (me.ground && roof && roof.x + roof.w - wx < speed * .16 + (Math.random() < .02 ? 60 : 0)) { jump(); setTimeout(() => { hold = false; }, 260); }
    for (const o of obs) { const dx = o.x - wx; if (dx > 0 && dx < speed * .2) { if (o.k === 'vent' && me.ground) { jump(); setTimeout(() => { hold = false; }, 120); } if (o.k === 'sign' && me.ground && slideT <= 0) slide(); } }
    if (!me.ground && me.vy > 200 && ahead && ahead.x - wx < 160 && ahead.y < me.y + 10 && jumps < 2) jump();
  };
  function die(fell) {
    if (dead) return; dead = true; K.shake(fell ? 6 : 18); K.sfx(fell ? 500 : 200, .8, 'sawtooth', .12, -400); if (!fell) K.noise(.4, .3, 400);
    K.over({ title: fell ? 'Fell!' : 'Caught!', text: fell ? `You ran ${Math.floor(dist)} meters before the long way down.` : `The drone caught you after ${Math.floor(dist)} meters.` });
  }
  GAME.update = dt => {
    if (dead) { me.vy += G * dt; me.y += me.vy * dt; drone.gap = Math.max(40, drone.gap - 300 * dt); return; }
    const sp = speed * (stumbleT > 0 ? .55 : 1);
    cam += sp * dt; dist += sp * dt / 30; speed = Math.min(900, speed + 9 * dt); stumbleT -= dt; slideT -= dt;
    const sc = Math.floor(dist); if (sc !== K.score) { const step = sc - K.score; K.add(step); if (sc % 250 === 0) { K.toast(`${sc} m!`); K.coin(3); } }
    me.vy += (hold && me.vy < 0 ? G * .55 : G) * dt; const py = me.y; me.y += me.vy * dt;
    const wx = me.x + cam, roof = roofs.find(r => wx + 10 >= r.x && wx - 10 <= r.x + r.w);
    me.ground = false;
    if (roof && me.vy >= 0 && py <= roof.y + 6 && me.y >= roof.y) { me.y = roof.y; me.vy = 0; me.ground = true; if (jumps) { jumps = 0; K.noise(.05, .08, 2000); } }
    // ran into the side of a taller roof: climb it if the edge is close, otherwise fall
    if (roof && !me.ground && me.y > roof.y + 6) { if (me.y - roof.y < 60 && wx - roof.x < 40) { me.y = roof.y; me.vy = 0; me.ground = true; jumps = 0; stumbleT = .9; drone.gap -= 90; K.shake(8); K.noise(.2, .25, 300); } }
    if (me.y > H + 120) return die(true);
    const height = slideT > 0 ? 40 : 84;
    for (const o of obs) if (!o.hit && wx + 14 > o.x && wx - 14 < o.x + o.w) {
      const top = o.k === 'vent' ? o.y - 46 : o.y - o.h, bottom = o.k === 'vent' ? o.y : o.y - 50;
      if (me.y > top + 4 && me.y - height < bottom) {
        o.hit = true; stumbleT = .9; drone.gap -= 110; K.shake(10); K.noise(.25, .3, 300); K.sfx(160, .2, 'square', .1);
        K.burst(wx - cam, me.y - 40, ['#ffb23f', '#fff'], 10, 240, { life: .4 });
      }
    }
    for (const c of coins) if (!c.got && K.dist(c.x, c.y, wx, me.y - 40) < 40) { c.got = true; K.coin(1, c.x - cam, c.y); }
    drone.gap = Math.min(330, drone.gap + (stumbleT > 0 ? -30 : 22) * dt); drone.y += (me.y - 150 - drone.y) * Math.min(1, dt * 2);
    if (drone.gap < 70) return die(false);
    while (roofs[roofs.length - 1].x < cam + W * 2) addRoof();
    roofs = roofs.filter(r => r.x + r.w > cam - 300); obs = obs.filter(o => o.x > cam - 300); coins = coins.filter(c => c.x > cam - 300);
  };
  GAME.draw = gr => {
    const v = K.view, s = K.skin;
    const sk = gr.createLinearGradient(0, v.y0, 0, v.y1); sk.addColorStop(0, '#140c24'); sk.addColorStop(.6, '#3a1a4a'); sk.addColorStop(1, '#ff7a4a'); gr.fillStyle = sk; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    gr.fillStyle = '#fff'; for (const st of sky) { gr.globalAlpha = .6; gr.fillRect(st.x, st.y, st.r * 2, st.r * 2); } gr.globalAlpha = 1;
    gr.fillStyle = '#ffe9c4'; gr.beginPath(); gr.arc(1040, 140, 56, 0, 7); gr.fill();
    gr.fillStyle = '#2a1a3e'; for (const b of far) { const x = ((b.x - cam * .15) % 2700 + 2700) % 2700 - 200; gr.fillRect(x, H - b.h - 60, b.w, b.h + 60); }
    for (const b of near) { const x = ((b.x - cam * .35) % 2700 + 2700) % 2700 - 200; gr.fillStyle = '#1e1230'; gr.fillRect(x, H - b.h, b.w, b.h); gr.fillStyle = 'rgba(255,214,120,.35)'; for (let wy = H - b.h + 20; wy < H; wy += 34) for (let wx = x + 12; wx < x + b.w - 14; wx += 26) if (((wx * 7 + wy * 13) | 0) % 5 === 0) gr.fillRect(wx, wy, 10, 14); }
    gr.save(); gr.translate(-cam, 0);
    for (const r of roofs) {
      gr.fillStyle = `hsl(${r.hue},25%,16%)`; gr.fillRect(r.x, r.y, r.w, H - r.y + 400);
      gr.fillStyle = `hsl(${r.hue},20%,28%)`; gr.fillRect(r.x - 6, r.y - 8, r.w + 12, 14);
      gr.fillStyle = 'rgba(255,214,120,.5)'; for (let wy = r.y + 40; wy < H + 40; wy += 48) for (let wx = r.x + 24; wx < r.x + r.w - 30; wx += 44) if (((wx + wy * 3) * (r.win + 1) | 0) % 4 === 0) gr.fillRect(wx, wy, 18, 24);
    }
    for (const o of obs) {
      if (o.k === 'vent') { gr.fillStyle = '#5a6070'; gr.fillRect(o.x, o.y - o.h, o.w, o.h); gr.fillStyle = '#3a3e4a'; for (let i = 0; i < 4; i++) gr.fillRect(o.x + 6, o.y - o.h + 8 + i * 9, o.w - 12, 4); }
      else { gr.fillStyle = '#3a3e4a'; gr.fillRect(o.x + 6, o.y - o.h, 8, o.h); gr.fillRect(o.x + o.w - 14, o.y - o.h, 8, o.h); gr.fillStyle = '#ff3d8b'; gr.shadowColor = '#ff3d8b'; gr.shadowBlur = 16; gr.fillRect(o.x, o.y - o.h, o.w, o.h - 50); gr.shadowBlur = 0; gr.fillStyle = '#fff'; gr.font = '26px Bangers'; gr.textAlign = 'center'; gr.fillText('DUCK!', o.x + o.w / 2, o.y - o.h + 44); }
    }
    for (const c of coins) if (!c.got) { gr.fillStyle = '#ffcf2e'; gr.beginPath(); gr.ellipse(c.x, c.y, 12 * Math.abs(Math.cos(K.t * 4 + c.x)) + 2, 13, 0, 0, 7); gr.fill(); }
    gr.restore();
    runner(gr, s, me.x, me.y - 50, K.t * (speed / 430), dead ? 'air' : slideT > 0 ? 'slide' : me.ground ? 'run' : 'air');
    // the drone
    const dx = me.x - drone.gap, dy = drone.y + Math.sin(K.t * 4) * 8;
    gr.fillStyle = '#1a1a22'; gr.fillRect(dx - 34, dy - 8, 68, 16); gr.fillRect(dx - 6, dy - 20, 12, 14);
    for (const k of [-1, 1]) { gr.fillStyle = 'rgba(200,220,255,.5)'; gr.beginPath(); gr.ellipse(dx + k * 34, dy - 14, 22, 4 + Math.abs(Math.sin(K.t * 40)) * 3, 0, 0, 7); gr.fill(); }
    gr.fillStyle = Math.sin(K.t * 10) > 0 ? '#ff3b3b' : '#4fd8ff'; gr.beginPath(); gr.arc(dx + 10, dy + 6, 6, 0, 7); gr.fill();
    gr.fillStyle = `rgba(255,59,59,${.08 + (330 - drone.gap) / 330 * .2})`; gr.beginPath(); gr.moveTo(dx + 10, dy + 6); gr.lineTo(me.x + 40, me.y + 10); gr.lineTo(me.x - 30, me.y + 10); gr.fill();
    if (drone.gap < 200 && !dead) { gr.fillStyle = `rgba(255,0,0,${(200 - drone.gap) / 200 * .25 * (1 + Math.sin(K.t * 10))})`; gr.fillRect(v.x0, v.y0, 40, v.y1 - v.y0); }
  };
})();
