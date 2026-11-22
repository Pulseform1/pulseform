/* Planet Explorer: a 2D solar system with the planets orbiting in the right order. Fly your ship (arrow keys / WASD, or tap
   or click to steer toward a point or a world) to the world your mission names. Arriving opens a question about it: right
   answers refuel, wrong ones cost fuel. Fuel burns all the time, and asteroids knock some off. Run dry and the trip is over. */
(() => {
  const { h, pick, shuffle, sample, clamp } = Edu;
  // name, orbit (fraction of the system's radius), drawn size, colour; then the Moon orbits Earth
  const BODIES = [['Sun', 0, 18, '#ffd23f'], ['Mercury', .24, 3.6, '#b9b4aa'], ['Venus', .33, 5.6, '#e8c27a'], ['Earth', .42, 5.9, '#3d8bff'], ['Mars', .51, 4.6, '#e0603a'],
    ['Jupiter', .64, 11.5, '#d9a066'], ['Saturn', .76, 9.4, '#e6cf8f'], ['Uranus', .875, 7.2, '#8fe3e8'], ['Neptune', .97, 7, '#4a6cff'], ['Moon', 0, 2.2, '#d8d8d8']];
  const LV = [
    { name: 'Easy', desc: 'The inner planets and the Moon. Names on the map, an arrow points the way. 6 missions.', n: 6, drain: 1.5, set: ['Mercury', 'Venus', 'Earth', 'Mars', 'Moon'], rocks: 0 },
    { name: 'Medium', desc: 'All eight planets, the Moon and the Sun, and asteroids in the belt. 8 missions.', n: 8, drain: 2, set: ['Sun', 'Mercury', 'Venus', 'Earth', 'Moon', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'], rocks: 4 },
    { name: 'Hard', desc: 'No names on the map: missions are clues ("the planet that spins on its side"). Harder facts. 8 missions.', n: 8, drain: 2.5, set: ['Sun', 'Mercury', 'Venus', 'Earth', 'Moon', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'], rocks: 7 }];
  const CLUE = { Sun: 'the star at the center of the solar system', Mercury: 'the planet closest to the Sun', Venus: 'the hottest planet', Earth: 'the only planet known to have life',
    Moon: "Earth's natural satellite", Mars: 'the planet with the moons Phobos and Deimos', Jupiter: 'the largest planet', Saturn: 'the planet whose biggest moon is Titan',
    Uranus: 'the planet that spins on its side', Neptune: 'the planet farthest from the Sun' };
  // [level, body, question, right, wrong, wrong, wrong]
  const Q = [
    [0, 'Sun', 'The Sun is a…', 'Star', 'Planet', 'Moon', 'Comet'], [1, 'Sun', 'About how long does sunlight take to reach Earth?', 'About 8 minutes', 'About 8 seconds', 'About 8 hours', 'About 8 days'],
    [2, 'Sun', 'What is the Sun mostly made of?', 'Hydrogen and helium', 'Iron and rock', 'Water and ice', 'Oxygen and nitrogen'],
    [2, 'Sun', 'How wide is the Sun compared with Earth?', 'About 109 times as wide', 'About twice as wide', 'About 10 times as wide', 'About 1,000 times as wide'],
    [0, 'Mercury', 'Mercury is the planet…', 'Closest to the Sun', 'Farthest from the Sun', 'With the biggest rings', 'We live on'], [0, 'Mercury', 'Mercury is a…', 'Rocky planet', 'Gas giant', 'Star', 'Moon'],
    [1, 'Mercury', 'Mercury is the ___ of the eight planets.', 'Smallest', 'Largest', 'Hottest', 'Coldest'],
    [2, 'Mercury', 'A year on Mercury (one trip around the Sun) lasts about…', '88 Earth days', '365 Earth days', '10 Earth days', '12 Earth years'],
    [2, 'Mercury', 'Mercury is closest to the Sun. Is it the hottest planet?', 'No, Venus is hotter', 'Yes, it is the hottest', 'No, Mars is hotter', 'No, Earth is hotter'],
    [0, 'Venus', 'Venus is the ___ planet from the Sun.', 'Second', 'First', 'Third', 'Fifth'], [0, 'Venus', 'Venus is covered in thick…', 'Clouds', 'Ice', 'Grass', 'Oceans'],
    [1, 'Venus', 'Venus is often called the…', 'Morning star', 'Red Planet', 'Blue Planet', 'Ringed Planet'],
    [1, 'Venus', 'Venus is the hottest planet, even though…', 'Mercury is closer to the Sun', 'It is the biggest planet', 'It is far from the Sun', 'It has rings'],
    [2, 'Venus', 'What keeps Venus so hot?', 'A thick carbon dioxide atmosphere', 'Being closest to the Sun', 'Its rings', 'Its many moons'],
    [2, 'Venus', 'Venus spins backward compared with most planets. On Venus the Sun rises in the…', 'West', 'East', 'North', 'South'],
    [0, 'Earth', 'Earth is the ___ planet from the Sun.', 'Third', 'First', 'Second', 'Fourth'], [0, 'Earth', 'How long does Earth take to go once around the Sun?', 'About 365 days', 'About 24 hours', 'About 30 days', 'About 10 years'],
    [0, 'Earth', 'How long does Earth take to spin around once?', 'About 24 hours', 'About 365 days', 'About 1 hour', 'About 7 days'],
    [1, 'Earth', "About how much of Earth's surface is covered by water?", 'About 70%', 'About 10%', 'About 30%', 'About 95%'],
    [2, 'Earth', 'Why does Earth have seasons?', 'Its axis is tilted', 'It is closer to the Sun in summer', 'The Sun gets hotter in summer', 'The Moon blocks the Sun'],
    [0, 'Moon', 'Why does the Moon shine?', 'It reflects sunlight', 'It is on fire', 'It makes its own light', 'It is a star'], [1, 'Moon', "The Moon is Earth's only…", 'Natural satellite', 'Planet', 'Star', 'Comet'],
    [1, 'Moon', 'About how long does the Moon take to go around Earth?', 'About 27 days', 'About 1 day', 'About 365 days', 'About 7 days'],
    [1, 'Moon', 'People first walked on the Moon in…', '1969', '1959', '1979', '1989'],
    [2, 'Moon', 'Who were the first two people to walk on the Moon?', 'Neil Armstrong and Buzz Aldrin', 'Yuri Gagarin and Alan Shepard', 'John Glenn and Sally Ride', 'Michael Collins and Yuri Gagarin'],
    [2, 'Moon', "Gravity on the Moon is about … of Earth's.", 'One sixth', 'Half', 'Twice', 'One hundredth'],
    [0, 'Mars', 'Mars is known as the…', 'Red Planet', 'Blue Planet', 'Ringed Planet', 'Morning star'], [0, 'Mars', 'Mars is the ___ planet from the Sun.', 'Fourth', 'Second', 'Sixth', 'Eighth'],
    [1, 'Mars', 'Why is Mars red?', 'Rusty iron oxide in its dust', 'It is very hot', 'It is covered in lava', 'Red plants grow there'],
    [2, 'Mars', "Mars's two small moons are…", 'Phobos and Deimos', 'Titan and Triton', 'Io and Europa', 'Ganymede and Callisto'],
    [2, 'Mars', 'Olympus Mons, on Mars, is the biggest … in the solar system.', 'Volcano', 'Ocean', 'Crater', 'Glacier'],
    [0, 'Jupiter', 'Jupiter is the ___ planet.', 'Largest', 'Smallest', 'Closest to the Sun', 'Coldest'], [1, 'Jupiter', 'Jupiter is a…', 'Gas giant', 'Rocky planet', 'Dwarf planet', 'Star'],
    [1, 'Jupiter', 'Going out from the Sun, Jupiter is the ___ planet.', 'Fifth', 'Fourth', 'Sixth', 'Third'],
    [2, 'Jupiter', "Jupiter's Great Red Spot is…", 'A giant storm', 'A volcano', 'An ocean', 'A crater'], [2, 'Jupiter', "Which of these is one of Jupiter's moons?", 'Ganymede', 'Titan', 'Phobos', 'Triton'],
    [0, 'Saturn', 'Saturn is famous for its…', 'Bright rings', 'Red color', 'Oceans', 'Volcanoes'], [1, 'Saturn', "Saturn's rings are made mostly of…", 'Pieces of ice and rock', 'Gas clouds', 'Fire', 'Liquid water'],
    [1, 'Saturn', 'Saturn is the ___ planet from the Sun.', 'Sixth', 'Fifth', 'Seventh', 'Eighth'],
    [2, 'Saturn', "Saturn's largest moon, which has a thick atmosphere, is…", 'Titan', 'Europa', 'Phobos', 'Triton'],
    [2, 'Saturn', 'Saturn is the only planet that is less dense than…', 'Water', 'Air', 'Rock', 'Iron'],
    [1, 'Uranus', 'Uranus is the ___ planet from the Sun.', 'Seventh', 'Sixth', 'Eighth', 'Fifth'],
    [2, 'Uranus', 'What is unusual about the way Uranus spins?', 'It spins on its side', 'It does not spin at all', 'It spins once a year', 'It spins faster than light'],
    [2, 'Uranus', 'Uranus looks blue-green because of … in its atmosphere.', 'Methane', 'Oxygen', 'Water vapor', 'Iron dust'],
    [2, 'Uranus', 'Uranus and Neptune are called…', 'Ice giants', 'Rocky planets', 'Dwarf planets', 'Gas moons'],
    [1, 'Neptune', 'Neptune is the ___ planet from the Sun.', 'Eighth and farthest', 'Seventh', 'Sixth', 'Fifth'],
    [2, 'Neptune', 'Neptune has the fastest … in the solar system.', 'Winds', 'Volcanoes', 'Rivers', 'Earthquakes'], [2, 'Neptune', "Neptune's largest moon is…", 'Triton', 'Titan', 'Europa', 'Deimos'],
    [2, 'Neptune', 'Neptune was found in 1846 thanks to…', 'Math predicting where it was', 'A space probe', 'A meteor shower', 'An eclipse']];
  const CSS = `.pe-ban{position:absolute;top:10px;left:50%;transform:translateX(-50%);max-width:calc(100% - 20px);padding:7px 14px;border-radius:14px;background:rgba(10,12,18,.78);border:1px solid var(--edge);font:700 clamp(14px,2.4vw,18px) var(--display);text-align:center;pointer-events:none;animation:pop .35s both}
.pe-ban b{color:var(--c2)}
.pe-q{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);width:min(calc(100% - 16px),680px);padding:12px;border-radius:18px;background:rgba(17,20,29,.94);border:1px solid var(--c);box-shadow:0 10px 40px rgba(0,0,0,.6);animation:rise .3s both;z-index:3}
.pe-q h3{font-size:clamp(16px,2.6vw,20px);color:var(--c2);text-align:center}.pe-q .q{font-size:clamp(17px,3vw,24px);margin:4px 0 0}
.pe-q .opts{margin-top:8px}.pe-q .opt{min-height:50px;font-size:clamp(14px,2.2vw,19px)}
.pe-q .sub{min-height:20px;margin-top:6px}`;
  Edu.game({
    id: 'planet-explorer', levels: LV,
    how: ['Your mission (at the top) names a world. Fly your ship there.',
      'Steer with the arrow keys or WASD, or click or tap where to go. Tap a planet to lock on and follow it.',
      'Arriving opens a question about that world: pick the answer (keys 1 to 4). Right answers refuel, wrong ones cost fuel.',
      'Fuel burns all the time and asteroids knock some off. Finish every mission before the tank runs dry.'],
    start(c) {
      if (!document.getElementById('pe-css')) document.head.append(h('style', { id: 'pe-css', text: CSS }));
      const L = c.L, cv = c.canvas(), g = cv.g, ban = h('div', { class: 'pe-ban' }); c.el.append(ban);
      const bodies = BODIES.map(([name, f, r, col]) => ({ name, f, r, col, a: Math.random() * 6.28, w: f ? .5 * Math.pow(.24 / f, 1.5) : 2.2, x: 0, y: 0, R: r }));
      const B = n => bodies.find(b => b.name === n), stars = Array.from({ length: 130 }, () => [Math.random(), Math.random(), Math.random() * 1.3 + .3, Math.random() * 6]);
      const rocks = Array.from({ length: L.rocks }, () => ({ a: Math.random() * 6.28, w: .05 + Math.random() * .05, d: (Math.random() - .5) * .05, r: 4 + Math.random() * 3, x: 0, y: 0 }));
      const belt = Array.from({ length: 90 }, () => [Math.random() * 6.28, .575 + (Math.random() - .5) * .06, Math.random() * 1.2 + .4]);
      let sys = { cx: 0, cy: 0, rx: 1, ry: 1 };
      const layout = () => { const A = cv.w / 2 - 16, Bq = cv.h / 2 - 16; sys = A >= Bq ? { cx: cv.w / 2, cy: cv.h / 2, rx: Math.min(A, Bq * 1.9), ry: Bq } : { cx: cv.w / 2, cy: cv.h / 2 + 10, rx: A, ry: Math.min(Bq - 10, A * 1.5) };
        const k = clamp(Math.min(sys.rx, sys.ry) / 230, .85, 1.6); for (const b of bodies) b.r = b.R * k; };
      layout(); cv.onfit = layout;
      const ship = c.ship = { x: 0, y: 0, vx: 0, vy: 0, ang: -1.57 }; ship.x = sys.cx + sys.rx * .38; ship.y = sys.cy + sys.ry * .9;
      const keys = {}; c.fuel = 100; c.k = 0; c.phase = 'fly'; c.follow = null; c.aim = null; c.learnt = []; c.missed = []; c.bump = 0; c.visit = null;
      const used = new Set(), order = [];
      while (order.length < L.n) { const s = shuffle(L.set); for (const n of s) if (order.length < L.n && order[order.length - 1] !== n) order.push(n); }
      const hud = () => c.hud({ fuel: Math.max(0, Math.round(c.fuel)) + '%', mission: Math.min(c.k + 1, L.n) + ' / ' + L.n });
      function mission() { c.target = B(order[c.k]); c.phase = 'fly'; c.follow = null; c.aim = null; c.visit = null;
        ban.innerHTML = ''; ban.append(`Mission ${c.k + 1}/${L.n}: fly to `, h('b', { text: c.level === 2 ? CLUE[c.target.name] : c.target.name === 'Sun' || c.target.name === 'Moon' ? 'the ' + c.target.name : c.target.name }));
        ban.style.animation = 'none'; void ban.offsetWidth; ban.style.animation = ''; hud(); }
      const over = won => { c.phase = 'end'; const learnt = [...new Set(c.missed)].slice(0, 3); for (const f of shuffle(c.learnt)) if (learnt.length < 4 && !learnt.includes(f)) learnt.push(f);
        c.end({ won, title: won ? 'Mission complete!' : 'Out of fuel!', msg: won ? 'You explored the solar system and made it home.' : 'Right answers refuel the ship. Fly straight to each world and try again.', stats: { Missions: c.k + ' / ' + L.n, 'Fuel left': Math.max(0, Math.round(c.fuel)) + '%' }, learnt, emoji: won ? '🚀' : '🪫' }); };
      function arrive(b) {
        c.phase = 'q'; ship.vx = ship.vy = 0; c.add(5, b.x, b.y - 20, '#29e0ff'); Edu.sfx.pop();
        const pool = Q.filter(q => q[1] === b.name && !used.has(q[2])), lvq = pool.filter(q => c.level === 2 ? q[0] >= 1 : q[0] <= c.level), best = pool.filter(q => q[0] === c.level);
        const q = pick(best.length ? best : lvq.length ? lvq : pool.length ? pool : Q.filter(q => q[1] === b.name)); used.add(q[2]);
        const opts = shuffle(q.slice(3)), note = h('div', { class: 'sub' }), box = h('div', { class: 'pe-q' }, h('h3', { text: '🛰️ Arrived: ' + (b.name === 'Sun' || b.name === 'Moon' ? 'the ' : '') + b.name }), h('div', { class: 'q', text: q[2] }));
        c.el.append(box); c.qbox = box; c.q = q; c.opts = opts;
        const lc = /^(Mercury|Venus|Earth|Mars|Jupiter|Saturn|Uranus|Neptune|Phobos|Titan|Ganymede|Triton|Neil|Red Planet|\d)/.test(q[3]) ? q[3] : q[3][0].toLowerCase() + q[3].slice(1);
        const fact = (/…|___/.test(q[2]) ? q[2].replace('___', lc).replace('…', lc) : q[2] + ' ' + q[3]).replace(/\.+$/, '') + '.';
        c.ch = c.choices(box, opts, i => { c.ch.lock(); const ri = opts.indexOf(q[3]), r = c.ch.btns[i].getBoundingClientRect(), s = c.el.getBoundingClientRect(), x = r.left - s.left + r.width / 2, y = r.top - s.top;
          c.learnt.push(fact);
          if (i === ri) { c.ch.mark(i, true); c.right(15 + c.level * 5, x, y); c.fuel = Math.min(100, c.fuel + 25); c.pop('+25% fuel', x, y - 26, '#29e0ff'); c.k++; c.after(650, next); }
          else { c.ch.mark(i, false); c.ch.mark(ri, true); c.wrong(x, y, '−15% fuel'); c.fuel -= 15; c.missed.push(fact); note.textContent = 'Answer: ' + q[3]; c.k++; c.after(1500, next); }
          hud(); }, { cols: 2 });
        box.append(note);
      }
      function next() { if (c.qbox) c.qbox.remove(); c.qbox = c.ch = null; if (c.fuel <= 0) return over(false); if (c.k >= L.n) return over(true); mission(); }
      c.key(e => { const k = e.key.toLowerCase(); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) { keys[k] = 1; c.aim = c.follow = null; e.preventDefault(); } });
      c.on(document, 'keyup', e => { keys[e.key.toLowerCase()] = 0; });
      const point = e => { if (c.phase !== 'fly') return; const [x, y] = cv.xy(e); let best = null, bd = 1e9;
        for (const b of bodies) { const d = Math.hypot(b.x - x, b.y - y); if (d < b.r + 22 && d < bd) { bd = d; best = b; } }
        c.follow = best; c.aim = best ? null : [x, y]; };
      c.on(cv.cv, 'pointerdown', e => { c.down = true; point(e); }); c.on(cv.cv, 'pointermove', e => { if (c.down) point(e); }); c.on(window, 'pointerup', () => { c.down = false; });
      mission();
      c.loop((dt, t) => {
        const { cx, cy, rx, ry } = sys, maxV = Math.max(170, Math.min(cv.w, cv.h) * .6);
        for (const b of bodies) { if (b.name === 'Moon') continue; b.a += b.w * dt * .5; b.x = cx + Math.cos(b.a) * rx * b.f; b.y = cy + Math.sin(b.a) * ry * b.f; }
        const E = B('Earth'), M = B('Moon'); M.a += M.w * dt; M.x = E.x + Math.cos(M.a) * (E.r + 7); M.y = E.y + Math.sin(M.a) * (E.r + 7);
        for (const r of rocks) { r.a += r.w * dt; r.x = cx + Math.cos(r.a) * rx * (.575 + r.d); r.y = cy + Math.sin(r.a) * ry * (.575 + r.d); }
        if (c.phase === 'fly') {
          let dx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0), dy = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0), slow = 1;
          const goal = c.follow ? [c.follow.x, c.follow.y] : c.aim;
          if (goal && !dx && !dy) { dx = goal[0] - ship.x; dy = goal[1] - ship.y; const d = Math.hypot(dx, dy); slow = clamp(d / 60, .25, 1); if (!c.follow && d < 6) c.aim = null; }
          const m = Math.hypot(dx, dy), thrust = m > 0;
          if (thrust) { ship.vx += dx / m * 900 * dt; ship.vy += dy / m * 900 * dt; }
          const sp = Math.hypot(ship.vx, ship.vy), lim = maxV * slow; if (sp > lim) { ship.vx *= lim / sp; ship.vy *= lim / sp; }
          ship.vx *= Math.pow(.25, dt); ship.vy *= Math.pow(.25, dt);
          ship.x = clamp(ship.x + ship.vx * dt, 8, cv.w - 8); ship.y = clamp(ship.y + ship.vy * dt, 8, cv.h - 8); if (sp > 20) ship.ang = Math.atan2(ship.vy, ship.vx); ship.thr = thrust;
          c.fuel -= (L.drain * Edu.SPEED + (thrust ? 1.5 : 0)) * dt;
          for (const r of rocks) if (Math.hypot(r.x - ship.x, r.y - ship.y) < r.r + 6 && t - c.bump > 1) { c.bump = t; c.fuel -= 8; const a = Math.atan2(ship.y - r.y, ship.x - r.x); ship.vx = Math.cos(a) * 220; ship.vy = Math.sin(a) * 220; c.wrong(ship.x, ship.y - 14, 'Asteroid! −8%'); c.streak = 0; c.wrong_--; }
          const tg = c.target; if (Math.hypot(tg.x - ship.x, tg.y - ship.y) < tg.r + 12) arrive(tg);
          else if (c.level === 2) for (const b of bodies) if (b !== tg && Math.hypot(b.x - ship.x, b.y - ship.y) < b.r + 10 && c.visit !== b) { c.visit = b; c.pop('This is ' + (b.name === 'Sun' || b.name === 'Moon' ? 'the ' : '') + b.name, b.x, b.y - 24, '#ffd23f'); }
          if (Math.floor(c.fuel) !== c.lastF) { c.lastF = Math.floor(c.fuel); hud(); }
          if (c.fuel <= 0) { c.fuel = 0; hud(); over(false); }
        }
        // draw
        g.clearRect(0, 0, cv.w, cv.h); g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.w, cv.h);
        for (const [x, y, r, p] of stars) { g.globalAlpha = .35 + .35 * Math.sin(t * 1.5 + p); g.fillStyle = '#fff'; g.fillRect(x * cv.w, y * cv.h, r, r); } g.globalAlpha = 1;
        g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 1; for (const b of bodies) if (b.f) { g.beginPath(); g.ellipse(cx, cy, rx * b.f, ry * b.f, 0, 0, 6.283); g.stroke(); }
        g.fillStyle = 'rgba(190,170,140,.45)'; for (const [a, f, s] of belt) g.fillRect(cx + Math.cos(a + t * .02) * rx * f, cy + Math.sin(a + t * .02) * ry * f, s, s);
        for (const r of rocks) { g.fillStyle = '#8b7d6b'; g.beginPath(); g.arc(r.x, r.y, r.r, 0, 6.283); g.fill(); g.fillStyle = '#6b5f50'; g.beginPath(); g.arc(r.x + 1, r.y - 1, r.r * .35, 0, 6.283); g.fill(); }
        const S = B('Sun'), sg = g.createRadialGradient(cx, cy, 2, cx, cy, S.r * 2); sg.addColorStop(0, '#fff7c2'); sg.addColorStop(.35, '#ffd23f'); sg.addColorStop(.5, 'rgba(255,159,28,.55)'); sg.addColorStop(1, 'rgba(255,159,28,0)');
        g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, S.r * 2, 0, 6.283); g.fill(); S.x = cx; S.y = cy;
        for (const b of bodies) { if (!b.f && b.name !== 'Moon') continue;
          if (b.name === 'Saturn') { g.strokeStyle = 'rgba(230,207,143,.8)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(b.x, b.y, b.r * 2, b.r * .7, -.35, 0, 6.283); g.stroke(); }
          const pg = g.createRadialGradient(b.x - b.r * .4, b.y - b.r * .4, b.r * .2, b.x, b.y, b.r); pg.addColorStop(0, '#fff'); pg.addColorStop(.25, b.col); pg.addColorStop(1, 'rgba(0,0,0,.6)');
          g.fillStyle = b.col; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.283); g.fill(); g.fillStyle = pg; g.globalAlpha = .55; g.fill(); g.globalAlpha = 1;
          if (b.name === 'Jupiter') { g.fillStyle = 'rgba(140,80,40,.5)'; g.fillRect(b.x - b.r * .9, b.y - b.r * .35, b.r * 1.8, b.r * .2); g.fillRect(b.x - b.r * .9, b.y + b.r * .2, b.r * 1.8, b.r * .18); g.fillStyle = '#c1440e'; g.beginPath(); g.ellipse(b.x + b.r * .3, b.y + b.r * .45, b.r * .24, b.r * .14, 0, 0, 6.283); g.fill(); }
          if (b.name === 'Earth') { g.fillStyle = '#3ddc84'; g.beginPath(); g.arc(b.x - 1.5, b.y - 1, b.r * .45, 0, 6.283); g.fill(); }
          if (b.name === 'Saturn') { g.strokeStyle = 'rgba(230,207,143,.8)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(b.x, b.y, b.r * 2, b.r * .7, -.35, 3.3, 6.1); g.stroke(); }
          if (c.level < 2 && b.name !== 'Moon') { g.fillStyle = 'rgba(238,241,248,.75)'; g.font = '600 11px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText(b.name, b.x, b.y + b.r + 13); } }
        const tg = c.target; if (tg && c.phase === 'fly') { const rr = tg.r + 9 + Math.sin(t * 5) * 3; g.strokeStyle = c.level === 2 ? 'rgba(255,210,63,0)' : '#ffd23f'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.arc(tg.x, tg.y, rr, 0, 6.283); g.stroke(); g.setLineDash([]);
          if (c.level < 2) { const a = Math.atan2(tg.y - ship.y, tg.x - ship.x), d = Math.hypot(tg.x - ship.x, tg.y - ship.y); if (d > 50) { g.fillStyle = 'rgba(255,210,63,.85)'; g.save(); g.translate(ship.x + Math.cos(a) * 26, ship.y + Math.sin(a) * 26); g.rotate(a); g.beginPath(); g.moveTo(7, 0); g.lineTo(-4, -5); g.lineTo(-4, 5); g.fill(); g.restore(); } } }
        if (c.aim && c.phase === 'fly') { g.strokeStyle = 'rgba(41,224,255,.6)'; g.beginPath(); g.arc(c.aim[0], c.aim[1], 6, 0, 6.283); g.stroke(); }
        g.save(); g.translate(ship.x, ship.y); g.rotate(ship.ang);
        if (ship.thr && c.phase === 'fly') { g.fillStyle = Math.random() < .5 ? '#ff9f1c' : '#ffd23f'; g.beginPath(); g.moveTo(-7, -3.5); g.lineTo(-13 - Math.random() * 6, 0); g.lineTo(-7, 3.5); g.fill(); }
        g.fillStyle = '#eef1f8'; g.beginPath(); g.moveTo(11, 0); g.lineTo(-7, -7); g.lineTo(-4, 0); g.lineTo(-7, 7); g.closePath(); g.fill(); g.fillStyle = '#29e0ff'; g.beginPath(); g.arc(3, 0, 2.6, 0, 6.283); g.fill(); g.restore();
        const fw = Math.min(140, cv.w * .3), fy = cv.h - 16; g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(12, fy, fw, 7); g.fillStyle = c.fuel < 25 && Math.sin(t * 10) > 0 ? '#ff4d5e' : c.fuel < 25 ? '#ff9f1c' : '#29e0ff'; g.fillRect(12, fy, fw * clamp(c.fuel / 100, 0, 1), 7);
        g.fillStyle = '#9aa3b8'; g.font = '700 10px system-ui,sans-serif'; g.textAlign = 'left'; g.fillText('FUEL', 12, fy - 4);
      });
      hud();
    },
    bot(c) { if (c.phase === 'fly' && c.target) { c.follow = c.target; c.aim = null; } else if (c.phase === 'q' && c.ch && !c.ch.el.classList.contains('locked')) c.ch.btns[c.opts.indexOf(c.q[3])].click(); },
    miss(c) { if (c.phase === 'q' && c.ch && !c.ch.el.classList.contains('locked')) c.ch.btns[c.opts.findIndex(o => o !== c.q[3])].click(); }
  });
})();
