/* Orbit Hop: circle a planet, tap to launch straight off it, and get caught by the next planet's orbit. */
const GAME = {
  id: 'orbit-hop', title: 'Orbit Hop', tagline: 'Tap to launch. Catch the next orbit. Don\'t drift into space!',
  font: 'Russo One', accent: '#7cf2ff', accent2: '#ff7ae0', bg: '#070a1f',
  how: ['Your comet circles a planet on its own.', 'Tap, click or press Space to fly off in a straight line.', 'Hit the next planet\'s ring to land. Grab stars for coins!'],
  skins: [
    { name: 'Comet', price: 0, c: ['#7cf2ff', '#2a7bff'] }, { name: 'Ember', price: 60, c: ['#ffb347', '#ff3d3d'] }, { name: 'Mint', price: 150, c: ['#9dffb0', '#18b86a'] },
    { name: 'Pixie', price: 250, c: ['#ff9cf0', '#a23bff'] }, { name: 'Sun', price: 400, c: ['#fff6a8', '#ffb800'] }, { name: 'Void', price: 700, c: ['#ffffff', '#5a3bff'], ring: true },
  ],
};
(() => {
  let planets, me, cam, dead, trail, stars, coins, flyT, reached, hue0;
  const R = p => p.r + 38;
  GAME.drawSkin = (gr, s, z) => {
    const gd = gr.createLinearGradient(-z, 0, z * .3, 0); gd.addColorStop(0, 'rgba(0,0,0,0)'); gd.addColorStop(1, s.c[1]);
    gr.fillStyle = gd; gr.beginPath(); gr.moveTo(-z, -8); gr.lineTo(10, -16); gr.lineTo(10, 16); gr.lineTo(-z, 8); gr.fill();
    gr.shadowColor = s.c[0]; gr.shadowBlur = 16; gr.fillStyle = s.c[0]; gr.beginPath(); gr.arc(12, 0, 16, 0, 7); gr.fill(); gr.shadowBlur = 0;
    if (s.ring) { gr.strokeStyle = '#fff'; gr.lineWidth = 3; gr.beginPath(); gr.ellipse(12, 0, 26, 9, -.4, 0, 7); gr.stroke(); }
  };
  function addPlanet() {
    const prev = planets[planets.length - 1], n = planets.length;
    const r = Math.max(30, 62 - n * .9 + K.rand(-12, 12));
    let x, y, tries = 0;
    do { const d = K.rand(250, 340) + n * 1.5, a = K.rand(-Math.PI * .8, -Math.PI * .2); x = prev.x + Math.cos(a) * d; y = prev.y + Math.sin(a) * d; tries++; } while ((x < 200 || x > W - 200) && tries < 40);
    x = K.clamp(x, 200, W - 200);
    const spin = (Math.random() < .5 ? 1 : -1) * Math.min(3.6, 1.6 + n * .05) * K.rand(.85, 1.15);
    const p = { x, y, bx: x, r, spin, hue: (hue0 + n * 37) % 360, move: n > 12 && Math.random() < .45 ? K.rand(60, 150) : 0, ph: Math.random() * 6, ring: Math.random() < .3 };
    planets.push(p);
    // a trail of stars between the two planets
    if (Math.random() < .8) for (let i = 1; i <= 3; i++) stars.push({ x: K.lerp(prev.x, x, i / 4) + K.rand(-30, 30), y: K.lerp(prev.y, y, i / 4) + K.rand(-30, 30), got: false });
  }
  GAME.reset = () => {
    hue0 = K.irand(0, 360); planets = [{ x: W / 2, y: 520, bx: W / 2, r: 70, spin: 1.6, hue: hue0, move: 0, ph: 0 }]; stars = []; coins = 0;
    for (let i = 0; i < 6; i++) addPlanet();
    me = { p: 0, a: -Math.PI / 2, x: 0, y: 0, vx: 0, vy: 0 }; cam = 0; dead = false; trail = []; flyT = 0; reached = 0;
    bg = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * .8 + .2 }));
  };
  let bg = [];
  function launch() {
    if (dead || me.p < 0) return;
    const p = planets[me.p], dir = Math.sign(p.spin), sp = 760;
    me.vx = -Math.sin(me.a) * dir * sp; me.vy = Math.cos(me.a) * dir * sp; me.p = -1; flyT = 0; me.from = planets.indexOf(p);
    K.sfx(300, .18, 'sine', .14, 500);
  }
  GAME.down = launch;
  GAME.key = (c, d) => { if (d && (c === 'Space' || c === 'Enter' || c === 'ArrowUp')) launch(); };
  GAME.bot = () => {
    if (dead || me.p < 0) return;
    const p = planets[me.p], q = planets[me.p + 1]; if (!q) return;
    const dir = Math.sign(p.spin), vx = -Math.sin(me.a) * dir, vy = Math.cos(me.a) * dir;
    const dx = q.x - me.x, dy = q.y - me.y, along = dx * vx + dy * vy; if (along < 0) return;
    const miss = Math.abs(dx * vy - dy * vx);
    if (!GAME._tol) GAME._tol = Math.random() < .88 ? K.rand(0, R(q) * .55) : R(q) * K.rand(1.1, 1.6);
    if (miss < GAME._tol) { launch(); GAME._tol = 0; }
  };
  function die() {
    if (dead) return; dead = true; K.shake(14); K.sfx(400, .6, 'sawtooth', .1, -320); K.noise(.3, .12, 300); K.burst(me.x, me.y, K.skin.c, 30, 380, { gravity: 0, life: .9 }); K.over();
  }
  GAME.update = dt => {
    for (const p of planets) if (p.move) p.x = p.bx + Math.sin(K.t * 1.2 + p.ph) * p.move;
    if (!dead) {
      if (me.p >= 0) {
        const p = planets[me.p]; me.a += p.spin * dt; me.x = p.x + Math.cos(me.a) * R(p); me.y = p.y + Math.sin(me.a) * R(p);
      } else {
        flyT += dt; me.x += me.vx * dt; me.y += me.vy * dt;
        planets.forEach((p, i) => {
          if (me.p >= 0 || i === me.from) return;
          if (K.dist(me.x, me.y, p.x, p.y) <= R(p) + 10) {
            me.p = i; me.a = Math.atan2(me.y - p.y, me.x - p.x);
            if (i > reached) {
              const gain = i - reached; reached = i; K.add(gain, p.x, p.y - p.r - 50, gain > 1 ? '#ffe36e' : '#fff');
              if (gain > 1) { K.coin(gain, p.x, p.y); K.pop(p.x, p.y - p.r - 90, 'Skip!', '#ffe36e', 30); }
              if (reached % 10 === 0) { K.toast(`${reached} planets!`); K.coin(3, p.x, p.y); }
            }
            K.burst(me.x, me.y, [K.skin.c[0], '#fff'], 14, 240, { gravity: 0, life: .5 }); K.sfx(520 + Math.min(reached, 24) * 18, .12, 'triangle', .14); K.sfx(780 + Math.min(reached, 24) * 27, .1, 'sine', .07, 0, .05);
            while (planets.length < reached + 7) addPlanet();
          }
        });
        const v = K.view;
        if (flyT > 2.2 || me.x < v.x0 - 60 || me.x > v.x1 + 60 || me.y - cam < v.y0 - 140 || me.y - cam > v.y1 + 60) die();
      }
      for (const s of stars) if (!s.got && K.dist(me.x, me.y, s.x, s.y) < 34) { s.got = true; K.coin(1, s.x, s.y); }
      trail.push([me.x, me.y]); if (trail.length > 22) trail.shift();
    }
    const focus = me.p >= 0 ? planets[me.p].y : me.y;
    const target = focus - H * .62; cam += (target - cam) * Math.min(1, dt * 3);
  };
  GAME.draw = gr => {
    const v = K.view;
    const gd = gr.createLinearGradient(0, v.y0, 0, v.y1); gd.addColorStop(0, '#120a35'); gd.addColorStop(1, '#03040f');
    gr.fillStyle = gd; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    gr.fillStyle = '#fff';
    for (const s of bg) { const y = ((s.y - cam * s.z * .3) % H + H) % H; gr.globalAlpha = s.z * .9; gr.fillRect(s.x, y, s.z * 2.4, s.z * 2.4); }
    gr.globalAlpha = 1;
    gr.save(); gr.translate(0, -cam);
    for (const s of stars) if (!s.got) {
      gr.save(); gr.translate(s.x, s.y); gr.rotate(K.t * 2); gr.fillStyle = '#ffd84a'; gr.shadowColor = '#ffd84a'; gr.shadowBlur = 12; gr.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 7 : 16, a = i * Math.PI / 5; gr.lineTo(Math.cos(a) * r, Math.sin(a) * r); } gr.fill(); gr.restore();
    }
    planets.forEach((p, i) => {
      if (p.y - cam > v.y1 + 200 || p.y - cam < v.y0 - 200) return;
      gr.setLineDash([6, 10]); gr.lineDashOffset = -K.t * 30 * Math.sign(p.spin); gr.strokeStyle = i === me.p ? 'rgba(255,255,255,.55)' : i > reached ? 'rgba(124,242,255,.45)' : 'rgba(255,255,255,.15)'; gr.lineWidth = 3;
      gr.beginPath(); gr.arc(p.x, p.y, R(p), 0, 7); gr.stroke(); gr.setLineDash([]);
      const pg = gr.createRadialGradient(p.x - p.r * .35, p.y - p.r * .35, p.r * .1, p.x, p.y, p.r);
      pg.addColorStop(0, `hsl(${p.hue},90%,78%)`); pg.addColorStop(.7, `hsl(${p.hue},70%,50%)`); pg.addColorStop(1, `hsl(${p.hue},70%,30%)`);
      gr.fillStyle = pg; gr.beginPath(); gr.arc(p.x, p.y, p.r, 0, 7); gr.fill();
      gr.fillStyle = 'rgba(0,0,0,.15)'; [[.3, .2, .22], [-.35, .3, .14], [.1, -.4, .12]].forEach(([dx, dy, rr]) => { gr.beginPath(); gr.arc(p.x + dx * p.r, p.y + dy * p.r, rr * p.r, 0, 7); gr.fill(); });
      if (p.ring) { gr.strokeStyle = `hsla(${p.hue + 60},80%,75%,.8)`; gr.lineWidth = 5; gr.beginPath(); gr.ellipse(p.x, p.y, p.r * 1.6, p.r * .45, -.3, 0, 7); gr.stroke(); }
    });
    const s = K.skin;
    if (!dead) {
      for (let i = 0; i < trail.length; i++) { const k = i / trail.length; gr.globalAlpha = k * .8; gr.fillStyle = s.c[1]; gr.beginPath(); gr.arc(trail[i][0], trail[i][1], 13 * k, 0, 7); gr.fill(); }
      gr.globalAlpha = 1; gr.shadowColor = s.c[0]; gr.shadowBlur = 22; gr.fillStyle = s.c[0]; gr.beginPath(); gr.arc(me.x, me.y, 15, 0, 7); gr.fill(); gr.shadowBlur = 0;
      gr.fillStyle = '#fff'; gr.beginPath(); gr.arc(me.x - 4, me.y - 4, 5, 0, 7); gr.fill();
      if (s.ring) { gr.strokeStyle = '#fff'; gr.lineWidth = 2.5; gr.beginPath(); gr.ellipse(me.x, me.y, 25, 8, K.t * 2, 0, 7); gr.stroke(); }
      if (me.p >= 0 && !K.bot && reached < 2) {
        const p = planets[me.p], dir = Math.sign(p.spin);
        gr.strokeStyle = 'rgba(255,255,255,.35)'; gr.setLineDash([4, 8]); gr.lineWidth = 2; gr.beginPath(); gr.moveTo(me.x, me.y); gr.lineTo(me.x - Math.sin(me.a) * dir * 300, me.y + Math.cos(me.a) * dir * 300); gr.stroke(); gr.setLineDash([]);
      }
    }
    gr.restore();
  };
})();
