/* Geometry Challenge: a run of quick challenges drawn in SVG (name the shape, classify the angle, area and perimeter on
   a grid, the missing angle of a triangle). Each one has a fuse: answer before it burns down. Three lives. */
(() => {
  const { h, rnd, pick, shuffle, sample, near } = Edu;
  const f1 = v => +v.toFixed(1), D = Math.PI / 180;
  const pts = a => a.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');
  const poly = (a, cls = 'sh') => `<polygon class="${cls}" points="${pts(a)}"/>`;
  const pl = (a, cls = 'mk') => `<polyline class="${cls}" points="${pts(a)}"/>`;
  const tx = (x, y, s, anc = 'middle', cls = 'lb') => `<text class="${cls}" x="${f1(x)}" y="${f1(y)}" text-anchor="${anc}">${s}</text>`;
  const svg = s => `<svg viewBox="0 0 320 200" class="gc-fig" role="img">${s}</svg>`;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], len = v => Math.hypot(v[0], v[1]), unit = v => { const l = len(v); return [v[0] / l, v[1] / l]; };
  function ticks(a, b, n) { const u = unit(sub(b, a)), nv = [-u[1], u[0]], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; let s = '';
    for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 6, c = [m[0] + u[0] * o, m[1] + u[1] * o]; s += pl([[c[0] - nv[0] * 7, c[1] - nv[1] * 7], [c[0] + nv[0] * 7, c[1] + nv[1] * 7]]); } return s; }
  function arrow(a, b, n = 1) { const u = unit(sub(b, a)), nv = [-u[1], u[0]], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; let s = '';
    for (let i = 0; i < n; i++) { const c = [m[0] + u[0] * i * 7, m[1] + u[1] * i * 7]; s += pl([[c[0] - u[0] * 6 + nv[0] * 6, c[1] - u[1] * 6 + nv[1] * 6], [c[0] + u[0] * 2, c[1] + u[1] * 2], [c[0] - u[0] * 6 - nv[0] * 6, c[1] - u[1] * 6 - nv[1] * 6]]); } return s; }
  function rmark(p, a, b, z = 12) { const u = unit(sub(a, p)), v = unit(sub(b, p)); return pl([[p[0] + u[0] * z, p[1] + u[1] * z], [p[0] + (u[0] + v[0]) * z, p[1] + (u[1] + v[1]) * z], [p[0] + v[0] * z, p[1] + v[1] * z]]); }
  function fit(a, W = 320, H = 200, pad = 30) { const xs = a.map(p => p[0]), ys = a.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), bw = Math.max(...xs) - x0, bh = Math.max(...ys) - y0, k = Math.min((W - 2 * pad) / bw, (H - 2 * pad) / bh);
    return a.map(p => [(W - bw * k) / 2 + (p[0] - x0) * k, (H - bh * k) / 2 + (p[1] - y0) * k]); }
  // the options: the answer plus three different wrong ones (positive, never equal to the answer)
  function opts(ans, cands, unit = '') { const w = [...new Set(cands.filter(v => v > 0 && v !== ans && Number.isInteger(v)))];
    const pickd = shuffle(w).slice(0, 3); for (const v of near(ans, 6, Math.max(3, Math.round(ans * .3)), v => v > 0)) if (pickd.length < 3 && !pickd.includes(v)) pickd.push(v);
    const all = shuffle([ans, ...pickd]); return { o: all.map(v => v + unit), a: all.indexOf(ans) }; }
  const named = (ans, wrong) => { const all = shuffle([ans, ...sample(wrong, 3)]); return { o: all, a: all.indexOf(ans) }; };
  const grid = (ox, oy, s) => `<defs><pattern id="gg" x="${f1(ox)}" y="${f1(oy)}" width="${f1(s)}" height="${f1(s)}" patternUnits="userSpaceOnUse"><path d="M${f1(s)} 0H0V${f1(s)}" class="gl"/></pattern></defs><rect width="320" height="200" fill="url(#gg)"/>`;

  const NAMES = { 3: 'Triangle', 5: 'Pentagon', 6: 'Hexagon', 7: 'Heptagon', 8: 'Octagon' };
  const ANG = { acute: [20, 75], right: [90, 90], obtuse: [105, 165], straight: [180, 180], reflex: [200, 330] };
  const ANGFACT = { acute: 'An acute angle is less than 90°.', right: 'A right angle is exactly 90°.', obtuse: 'An obtuse angle is between 90° and 180°.', straight: 'A straight angle is exactly 180°: a straight line.', reflex: 'A reflex angle is between 180° and 360°.' };
  function angleFig(al, mark) {
    const V = [160, al > 180 || al === 180 ? 104 : 140], R = 92, t0 = al === 180 ? rnd(-15, 15) : al > 180 ? rnd(0, 359) : rnd(-20, 180 - al + 20), t1 = t0 + al;
    const P = t => [V[0] + R * Math.cos(t * D), V[1] - R * Math.sin(t * D)], A = t => [V[0] + 30 * Math.cos(t * D), V[1] - 30 * Math.sin(t * D)];
    const a = P(t0), b = P(t1), r0 = A(t0), r1 = A(t1);
    const arc = mark ? rmark(V, a, b, 18) : `<path class="wd" d="M${f1(V[0])} ${f1(V[1])}L${f1(r0[0])} ${f1(r0[1])}A30 30 0 ${al > 180 ? 1 : 0} 0 ${f1(r1[0])} ${f1(r1[1])}Z"/>`;
    return svg(`${arc}<polyline class="ray" points="${pts([a, V, b])}"/><circle cx="${V[0]}" cy="${V[1]}" r="4" class="dot"/>`);
  }
  const Q = {
    polygon() { const n = pick([3, 5, 6, 7, 8]), r0 = rnd(0, 360), a = [];
      for (let i = 0; i < n; i++) { const t = (r0 + i * 360 / n + rnd(-8, 8)) * D, r = 80 * (.85 + Math.random() * .15); a.push([160 + r * Math.cos(t), 100 + r * Math.sin(t)]); }
      const others = Object.values(NAMES).filter(v => v !== NAMES[n]).concat('Quadrilateral');
      return { fig: svg(poly(a) + a.map(p => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="4" class="dot"/>`).join('')), q: 'Name this shape. Count the sides!', ...named(NAMES[n], others),
        why: `It has ${n} sides, so it is a ${NAMES[n].toLowerCase()}.`, fact: `Triangle 3 sides, quadrilateral 4, pentagon 5, hexagon 6, heptagon 7, octagon 8.` }; },
    quad() { const k = pick(['Square', 'Rectangle', 'Rhombus', 'Parallelogram', 'Trapezoid']), sh = rnd(0, 4) * .15;
      let a = { Square: [[0, 0], [1, 0], [1, 1], [0, 1]], Rectangle: [[0, 0], [1.9, 0], [1.9, 1], [0, 1]], Rhombus: [[0, 0], [1, 0], [1.5, .87], [.5, .87]],
        Parallelogram: [[0, 0], [1.8, 0], [2.3, .8], [.5, .8]], Trapezoid: [[0, 1], [2, 1], [1.5 + sh, 0], [.3 + sh, 0]] }[k];
      if (Math.random() < .5) a = a.map(p => [-p[0], p[1]]);   // (a mirror image now and then)
      a = fit(a); const nx = i => a[(i + 1) % 4], pv = i => a[(i + 3) % 4];
      const m = k === 'Trapezoid' ? arrow(a[0], a[1]) + arrow(a[3], a[2]) : a.map((p, i) => ticks(p, nx(i), k === 'Square' || k === 'Rhombus' ? 1 : i % 2 ? 2 : 1) + (k === 'Square' || k === 'Rectangle' ? rmark(p, nx(i), pv(i)) : '')).join('');
      const wrong = { Square: ['Pentagon', 'Triangle', 'Hexagon'], Rectangle: ['Square', 'Rhombus', 'Pentagon'], Rhombus: ['Square', 'Rectangle', 'Hexagon'],
        Parallelogram: ['Square', 'Rectangle', 'Rhombus'], Trapezoid: ['Parallelogram', 'Rectangle', 'Rhombus'] }[k];
      const why = { Square: '4 equal sides and 4 right angles.', Rectangle: '4 right angles, but the sides are not all equal.', Rhombus: '4 equal sides, but no right angles.',
        Parallelogram: 'opposite sides equal (and parallel), but no right angles and the sides are not all equal.', Trapezoid: 'exactly one pair of parallel sides (the arrows).' }[k];
      const fact = { Square: 'A square has 4 equal sides and 4 right angles.', Rectangle: 'A rectangle has 4 right angles, and its opposite sides are equal.',
        Rhombus: 'A rhombus has 4 equal sides, and its opposite sides are parallel.', Parallelogram: 'A parallelogram has two pairs of parallel sides, and its opposite sides are equal.',
        Trapezoid: 'A trapezoid (called a trapezium in the UK) has one pair of parallel sides.' }[k];
      return { fig: svg(poly(a) + m), q: 'Which name fits this shape best? Look at the marks.', ...named(k, wrong), why: `${k}: ${why}`, fact }; },
    angle() { const k = pick(Object.keys(ANG)), al = rnd(...ANG[k]);
      const n = named(k[0].toUpperCase() + k.slice(1), Object.keys(ANG).filter(v => v !== k).map(v => v[0].toUpperCase() + v.slice(1)));
      return { fig: angleFig(al, k === 'right'), q: 'What type of angle is this?', ...n, why: `It is ${k === 'right' ? '' : 'about '}${al}°. ${ANGFACT[k]}`, fact: ANGFACT[k] }; },
    estimate() { const ans = pick([30, 45, 60, 120, 135, 150]); let w;
      do { w = []; for (const v of shuffle([20, 30, 45, 60, 90, 120, 135, 150, 170])) if (w.length < 3 && Math.abs(v - ans) >= 40 && w.every(x => Math.abs(x - v) >= 30)) w.push(v); } while (w.length < 3);
      const all = shuffle([ans, ...w]);
      return { fig: angleFig(ans), q: 'About how big is this angle?', o: all.map(v => v + '°'), a: all.indexOf(ans), why: `It is ${ans}°. A right angle (90°) is a square corner; compare with that.`, fact: 'A right angle is 90°, a straight line is 180°, a full turn is 360°.' }; },
    rect(area) { const w = rnd(2, 9), hh = rnd(2, 6), s = Math.min(28, 230 / w, 140 / hh), ox = (320 - w * s) / 2, oy = (200 - hh * s) / 2 - 6;
      const fig = svg(grid(ox, oy, s) + poly([[ox, oy], [ox + w * s, oy], [ox + w * s, oy + hh * s], [ox, oy + hh * s]], 'sh fl') + tx(ox + w * s / 2, oy + hh * s + 20, w + ' cm') + tx(ox + w * s + 8, oy + hh * s / 2 + 5, hh + ' cm', 'start'));
      const A = w * hh, P = 2 * (w + hh);
      return area ? { fig, q: 'What is the area of this rectangle?', ...opts(A, [P, w + hh, A + w, A - hh, A + hh], ' cm²'), why: `Area = ${w} × ${hh} = ${A} cm²`, fact: 'Area of a rectangle = length × width, in square units (cm²).' }
        : { fig, q: 'What is the perimeter of this rectangle?', ...opts(P, [A, w + hh, 2 * w + hh, w + 2 * hh, P + 2], ' cm'), why: `Perimeter = ${w} + ${hh} + ${w} + ${hh} = ${P} cm`, fact: 'Perimeter = the distance all the way round: add up every side.' }; },
    tri() { let b, hh; do { b = rnd(2, 10); hh = rnd(2, 6); } while (b * hh % 2); const s = Math.min(26, 230 / b, 140 / hh), ox = (320 - b * s) / 2 + 10, oy = (200 - hh * s) / 2 - 6;
      const a = [[ox, oy + hh * s], [ox + b * s, oy + hh * s], [ox, oy]], A = b * hh / 2;
      const fig = svg(grid(ox, oy, s) + poly(a, 'sh fl') + rmark(a[0], a[1], a[2], 11) + tx(ox + b * s / 2, oy + hh * s + 20, b + ' cm') + tx(ox - 8, oy + hh * s / 2 + 5, hh + ' cm', 'end'));
      return { fig, q: 'What is the area of this right-angled triangle?', ...opts(A, [b * hh, b + hh, A + b, A - 1, A + hh], ' cm²'), why: `Area = ½ × ${b} × ${hh} = ${A} cm². A triangle is half of a rectangle.`, fact: 'Area of a triangle = ½ × base × height.' }; },
    ell(area) { const W = rnd(5, 9), H = rnd(4, 6), w = rnd(2, W - 2), hh = rnd(2, H - 2), s = Math.min(24, 210 / W, 140 / H), ox = (320 - W * s) / 2 - 8, oy = (200 - H * s) / 2 - 4;
      const X = u => ox + u * s, Y = v => oy + v * s;
      const fig = svg(grid(ox, oy, s) + poly([[X(0), Y(0)], [X(W - w), Y(0)], [X(W - w), Y(hh)], [X(W), Y(hh)], [X(W), Y(H)], [X(0), Y(H)]], 'sh fl')
        + tx(X((W - w) / 2), Y(0) - 7, (W - w) + ' cm') + tx(X(W - w) - 6, Y(hh / 2) + 5, hh + ' cm', 'end') + tx(X(W - w / 2), Y(hh) - 7, w + ' cm')
        + tx(X(W) + 7, Y((hh + H) / 2) + 5, (H - hh) + ' cm', 'start') + tx(X(W / 2), Y(H) + 19, W + ' cm') + tx(X(0) - 7, Y(H / 2) + 5, H + ' cm', 'end'));
      const A = W * H - w * hh, P = 2 * (W + H);
      return area ? { fig, q: 'What is the area of this L-shape?', ...opts(A, [W * H, P, A + w, A - hh, (W - w) * H], ' cm²'), why: `Split it into rectangles: ${W} × ${H} − ${w} × ${hh} = ${W * H} − ${w * hh} = ${A} cm²`, fact: 'For an L-shape, split it into rectangles (or take a piece away from a big rectangle) and add the areas.' }
        : { fig, q: 'What is the perimeter of this L-shape?', ...opts(P, [A, P - 2 * hh, P - 2 * w, W + H + w + hh, P + 2], ' cm'), why: `Add all six sides: ${W - w} + ${hh} + ${w} + ${H - hh} + ${W} + ${H} = ${P} cm`, fact: 'Perimeter of any shape: add up the lengths of every side.' }; },
    missing() { const A = rnd(30, 100), B = rnd(25, 155 - A), C = 180 - A - B, L = Math.sin(B * D) / Math.sin(C * D);
      let a = [[0, 0], [1, 0], [L * Math.cos(A * D), -L * Math.sin(A * D)]]; if (Math.random() < .5) a = a.map(p => [-p[0], p[1]]); a = fit(a, 320, 200, 28);
      const lab = (p, q, r, s) => { const u = unit(sub(q, p)), v = unit(sub(r, p)), b = unit([u[0] + v[0], u[1] + v[1]]), t = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1]))), d = Math.min(58, Math.max(26, 15 / Math.sin(t / 2)));
        return tx(p[0] + b[0] * d, p[1] + b[1] * d + 5, s, 'middle', 'lb an'); };
      const fig = svg(poly(a, 'sh fl') + lab(a[0], a[1], a[2], A + '°') + lab(a[1], a[0], a[2], B + '°') + lab(a[2], a[0], a[1], '?'));
      return { fig, q: 'What is the missing angle?', ...opts(C, [180 - A, 180 - B, C + 10, C - 10, A + B, 360 - A - B].filter(v => v < 180), '°'), why: `The angles in a triangle add up to 180°: 180 − ${A} − ${B} = ${C}°`, fact: 'The three angles in a triangle always add up to 180°.' };
    }
  };
  const LV = [
    { name: 'Easy', desc: 'Name shapes by their sides and marks, and sort angles: acute, right, obtuse, straight, reflex.', n: 12, fuse: 14,
      kinds: [Q.polygon, Q.polygon, Q.angle, Q.angle, Q.quad] },
    { name: 'Medium', desc: 'Perimeter and area of rectangles on a grid, estimating angles, four-sided shapes.', n: 12, fuse: 20,
      kinds: [() => Q.rect(true), () => Q.rect(false), Q.estimate, Q.quad, () => Q.rect(true)] },
    { name: 'Hard', desc: 'Triangle area, L-shapes, missing angles in a triangle. Mixed and fast.', n: 12, fuse: 28,
      kinds: [Q.tri, () => Q.ell(true), () => Q.ell(false), Q.missing, Q.missing, () => Q.rect(true)] }
  ];
  const CSS = `.gc-seg{display:flex;gap:4px;width:min(100%,560px);flex:none}.gc-seg i{flex:1;height:8px;border-radius:4px;background:var(--edge);transition:background .3s}.gc-seg i.ok{background:var(--ok)}.gc-seg i.no{background:var(--no)}.gc-seg i.on{background:var(--c);animation:pulse 1s infinite}
.gc-card{position:relative;width:min(100%,640px);margin-top:10px;border-radius:18px;background:#0e1420;border:1px solid var(--edge);padding:6px;flex:none;animation:gcin .35s cubic-bezier(.2,1.3,.4,1) both}
@keyframes gcin{from{opacity:0;transform:rotate(-4deg) scale(.85)}}
.gc-fig{display:block;width:100%;height:clamp(140px,36vh,320px)}
.gc-fig .sh{fill:color-mix(in srgb,var(--c) 22%,transparent);stroke:var(--c);stroke-width:3;stroke-linejoin:round}.gc-fig .fl{fill:color-mix(in srgb,var(--c2) 22%,transparent);stroke:var(--c2)}
.gc-fig .mk{fill:none;stroke:#ffd23f;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.gc-fig .dot{fill:#fff}.gc-fig .gl{fill:none;stroke:rgba(255,255,255,.09);stroke-width:1}
.gc-fig .ray{fill:none;stroke:#fff;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}.gc-fig .wd{fill:rgba(255,210,63,.3);stroke:#ffd23f;stroke-width:2}
.gc-fig .lb{fill:#fff;font:700 15px var(--display)}.gc-fig .an{fill:#ffd23f;font-size:17px}
.gc-fuse{position:absolute;left:10px;right:10px;bottom:5px;height:5px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}.gc-fuse b{display:block;height:100%;background:linear-gradient(90deg,#ff5a3a,#ffd23f);transform-origin:left}
.gc-why{min-height:22px;margin-top:2px}.gc-why.no{color:#ffb3ba}.gc-why.ok{color:#9ff0c0}
.gc-st .opts{margin-top:8px}.gc-st .opt{min-height:clamp(50px,8vh,72px);font-size:clamp(15px,2.6vw,22px)}`;

  Edu.game({
    id: 'geometry-challenge', levels: LV,
    how: ['A shape or an angle appears. Pick the right answer: click, tap, or press 1 to 4.',
      'Answer before the fuse under the picture burns down. Faster answers score more.',
      'A wrong answer or a burnt-out fuse costs a life. You have three.',
      'Get through all twelve challenges to clear the level.'],
    start(c) {
      if (!document.getElementById('gc-css')) document.head.append(h('style', { id: 'gc-css', text: CSS }));
      const L = c.L, S = c.S = { i: 0, lock: true, facts: new Map(), last: null }; c.el.classList.add('gc-st');
      c.lives(3); c.hud({ challenge: '1 / ' + L.n });
      const seg = h('div', { class: 'gc-seg' }, Array.from({ length: L.n }, () => h('i'))), card = h('div', { class: 'gc-card' }), q = h('div', { class: 'q sm' }), why = h('div', { class: 'sub gc-why' }), area = h('div', { style: { width: '100%', display: 'flex', justifyContent: 'center' } });
      const fuse = h('b'); c.el.append(seg, card, q, why, area);
      const done = won => c.end({ won, title: won ? 'Geometry genius!' : 'Out of lives', emoji: won ? '📐' : '💔',
        msg: won ? `You got through all ${L.n} challenges.` : `You reached challenge ${S.i} of ${L.n}.`, stats: { Challenges: Math.min(S.i, L.n) + ' / ' + L.n }, learnt: [...S.facts.values()].slice(-4) });
      const next = () => {
        if (S.i >= L.n) return done(true);
        S.i++; seg.children[S.i - 1].className = 'on'; c.hud({ challenge: S.i + ' / ' + L.n });
        let k; do k = pick(L.kinds); while (L.kinds.length > 1 && k === S.lastK); S.lastK = k;
        const p = S.p = k(); S.t = L.fuse; S.lock = false;
        card.innerHTML = p.fig; card.append(h('div', { class: 'gc-fuse' }, fuse)); card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
        q.textContent = p.q; why.textContent = ''; why.className = 'sub gc-why'; area.innerHTML = '';
        S.ch = c.choices(area, p.o, (i, b) => answer(i, b), { cols: 4 });
      };
      const answer = (i, b) => {
        if (S.lock) return; S.lock = true; S.ch.lock(); const p = S.p, ok = i === p.a;
        const r = (b || card).getBoundingClientRect(), s = c.el.getBoundingClientRect(), x = r.left - s.left + r.width / 2, y = r.top - s.top;
        S.facts.delete(p.fact); S.facts.set(p.fact, p.fact);
        if (ok) { S.ch.mark(i, true); c.right(10 + 5 * c.level + Math.round(10 * S.t / L.fuse), x, y); seg.children[S.i - 1].className = 'ok'; why.textContent = '✓ ' + p.why; why.classList.add('ok'); c.after(650, next); }
        else { if (i >= 0) S.ch.mark(i, false); S.ch.mark(p.a, true); c.wrong(x, y, i < 0 ? 'Too slow!' : '✗'); seg.children[S.i - 1].className = 'no'; why.textContent = p.why; why.classList.add('no');
          if (!c.lose()) c.after(1600, () => done(false)); else c.after(2000, next); }
      };
      c.answer = answer;
      c.loop(dt => { if (S.lock) return; S.t -= dt; fuse.style.transform = `scaleX(${Math.max(0, S.t / L.fuse)})`; if (S.t <= 0) answer(-1); });
      next();
    },
    bot(c) { const S = c.S; if (S && !S.lock) S.ch.btns[S.p.a].click(); },
    miss(c) { const S = c.S; if (S && !S.lock) S.ch.btns[(S.p.a + 1) % S.p.o.length].click(); }
  });
})();
