/* Number Ninja: numbers fly up across the screen in arcs. Slice the ones that fit the rule at the top: click or tap
   them, swipe through them, or press the letter shown on a number. Right slices build a combo, a wrong slice costs a
   life, and the rule changes every few slices. Drawn on a canvas. */
(() => {
  const { rnd, pick, near, clamp, sfx } = Edu, KEYS = 'ASDFGHJKL', FONT = "'Chakra Petch', 'Arial Narrow', Arial, sans-serif";
  const isPrime = n => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
  const isSq = n => n > 0 && Math.round(Math.sqrt(n)) ** 2 === n;
  const other = (fit, lo, hi) => { for (let i = 0; i < 999; i++) { const v = rnd(lo, hi); if (!fit(v)) return v; } return null; };
  // each rule: t (shown at the top), fit(n), yes() a number that fits, no() one that clearly does not, why(n) for a wrong slice
  const R = {
    even: () => ({ k: 'even', t: 'EVEN numbers', fit: n => n % 2 === 0, yes: () => 2 * rnd(1, 25), no: () => 2 * rnd(0, 24) + 1,
      why: n => n + ' is odd', fact: 'Even numbers end in 0, 2, 4, 6 or 8. Odd numbers end in 1, 3, 5, 7 or 9.' }),
    odd: () => ({ k: 'odd', t: 'ODD numbers', fit: n => n % 2 === 1, yes: () => 2 * rnd(0, 24) + 1, no: () => 2 * rnd(1, 25),
      why: n => n + ' is even', fact: 'Even numbers end in 0, 2, 4, 6 or 8. Odd numbers end in 1, 3, 5, 7 or 9.' }),
    sum: () => { const a = rnd(3, 12), b = rnd(2, 9), s = a + b;
      return { k: 'sum', t: `the answer to ${a} + ${b}`, fit: n => n === s, yes: () => s, no: () => pick(near(s, 6, 4, v => v > 0)),
        why: () => `${a} + ${b} = ${s}`, fact: `${a} + ${b} = ${s}` }; },
    prod: (lo, hi) => { const a = rnd(lo, hi), b = rnd(lo, hi), p = a * b,
        slips = [(a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1), p + 1, p - 1, p + 10, p - 10, a + b].filter(v => v > 0 && v !== p);
      return { k: 'prod', t: `the answer to ${a} × ${b}`, fit: n => n === p, yes: () => p, no: () => pick(slips),
        why: () => `${a} × ${b} = ${p}`, fact: `${a} × ${b} = ${p}` }; },
    mult: (lo, hi) => { const k = rnd(lo, hi), fit = n => n % k === 0;
      return { k: 'mult', t: `MULTIPLES of ${k}`, fit, yes: () => k * rnd(1, 12), no: () => other(fit, 2, k * 12),
        why: n => `${n} is not in the ${k} times table`, fact: `Multiples of ${k}: ${[1, 2, 3, 4, 5].map(i => i * k).join(', ')} ... (the ${k} times table)` }; },
    factor: () => { const N = pick([24, 30, 36, 40, 42, 48, 60, 72]), fit = n => n > 0 && N % n === 0, d = [];
      for (let i = 1; i <= N; i++) if (N % i === 0) d.push(i);
      return { k: 'factor', t: `FACTORS of ${N}`, fit, yes: () => pick(d), no: () => other(fit, 2, N - 1),
        why: n => `${N} ÷ ${n} is not a whole number`, fact: `The factors of ${N} are ${d.slice(0, -1).join(', ')} and ${N}.` }; },
    prime: () => { const P = []; for (let i = 2; i < 60; i++) if (isPrime(i)) P.push(i);
      return { k: 'prime', t: 'PRIME numbers', fit: isPrime, yes: () => pick(P), no: () => other(isPrime, 1, 60),
        why: n => { if (n === 1) return '1 is not prime'; let f = 2; while (n % f) f++; return `${n} = ${f} × ${n / f}, not prime`; },
        fact: 'A prime number has exactly two factors: 1 and itself. 2 is the only even prime, and 1 is not prime.' }; },
    square: () => ({ k: 'square', t: 'SQUARE numbers', fit: isSq, yes: () => { const k = rnd(2, 12); return k * k; }, no: () => other(isSq, 2, 150),
      why: n => `${n} is not a whole number times itself`, fact: 'Square numbers are a number times itself: 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144.' })
  };
  const LV = [
    { name: 'Easy', desc: 'Even and odd numbers, adding up to 21. Slice 20 to clear.', goal: 20, quota: 5, T: 4.4, gap: 1.2, wave: 3, max: 6,
      rules: [R.even, R.odd, R.sum, R.sum] },
    { name: 'Medium', desc: 'Times tables to 10 and multiples. Slice 24, a bit faster.', goal: 24, quota: 5, T: 3.8, gap: 1, wave: 3, max: 7,
      rules: [() => R.prod(2, 10), () => R.mult(3, 9), () => R.prod(3, 10), () => R.mult(2, 10)] },
    { name: 'Hard', desc: 'Factors, primes, square numbers, tables to 12. Slice 28, fast.', goal: 28, quota: 4, T: 3.2, gap: .85, wave: 4, max: 8,
      rules: [R.factor, R.prime, R.square, () => R.mult(6, 12), () => R.prod(6, 12)] }
  ];
  const HUES = [8, 28, 45, 95, 150, 190, 265, 310, 335];

  Edu.game({
    id: 'number-ninja', levels: LV,
    how: ['A rule sits at the top, like "MULTIPLES of 4". Numbers fly up from the bottom.',
      'Slice every number that fits the rule: click or tap it, swipe through it, or press its letter key.',
      'Slicing a number that does not fit costs a life. You have three.',
      'Slices in a row build a combo for bonus points. The rule changes every few slices.'],
    start(c) {
      const L = c.L, o = c.canvas(), g = o.g, touch = matchMedia('(hover: none)').matches;
      const S = c.S = { items: [], bits: [], parts: [], rings: [], trail: [], got: 0, q: 0, spawn: .2, shake: 0, flash: 0, over: false, down: false, stroke: 0, facts: new Map(), hit: 0, stars: Array.from({ length: 46 }, () => [Math.random(), Math.random() * .7, Math.random() * 1.6 + .4, Math.random() * 6]) };
      c.lives(3); c.hud({ sliced: '0 / ' + L.goal });
      const newRule = () => {
        let f; do f = pick(L.rules); while (L.rules.length > 1 && f === S.lastF); S.lastF = f;
        S.rule = f(); S.q = 0; S.flash = 1; S.facts.delete(S.rule.fact); S.facts.set(S.rule.fact, S.rule.fact);
        for (const it of S.items) if (!it.dead) { it.dead = true; burst(it, 8, .5); }
        S.spawn = .45;
      };
      const burst = (it, n, sp = 1) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.3, v = (60 + Math.random() * 220) * sp;
        S.parts.push({ x: it.x, y: it.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 1, hue: it.hue, s: 2 + Math.random() * 4 }); } };
      const launch = fit => {
        const W = o.w, H = o.h, r = clamp(Math.min(W, H) * .075, 27, 38), T = L.T * (.9 + Math.random() * .2), tr = T / 2;
        const x0 = r + 8 + Math.random() * (W - 2 * r - 16), x1 = r + 8 + Math.random() * (W - 2 * r - 16), top = Math.min(H * .45, 96 + r);
        const apex = top + Math.random() * Math.max(10, H * .42 - top), Ha = H + r - apex, gr = 2 * Ha / (tr * tr);
        let n = fit ? S.rule.yes() : S.rule.no(); if (n == null) { n = S.rule.yes(); fit = true; }
        fit = S.rule.fit(n);   // (always decided by the rule itself)
        const used = new Set(S.items.filter(i => !i.dead).map(i => i.key)), free = [...KEYS].filter(k => !used.has(k));
        S.items.push({ n, fit, x: x0, y: H + r, vx: (x1 - x0) / T, vy: -gr * tr, g: gr, r, hue: pick(HUES), key: free.length ? pick(free) : '', rot: 0, vr: (Math.random() - .5) * 2 });
      };
      const wave = () => {
        const live = S.items.filter(i => !i.dead).length, n = Math.min(rnd(1, L.wave), L.max - live); if (n <= 0) return;
        const need = !S.items.some(i => !i.dead && i.fit);
        for (let k = 0; k < n; k++) { const fit = (k === 0 && need) || Math.random() < .42; c.after(k * 140, () => !S.over && launch(fit)); }
      };
      const slice = (it, ang = Math.random() * 3) => {
        if (it.dead || S.over) return; it.dead = true; it.ang = ang;
        for (const s of [-1, 1]) S.bits.push({ it, x: it.x, y: it.y, vx: it.vx * .5 + Math.cos(ang + 1.57) * 90 * s, vy: it.vy * .3 + Math.sin(ang + 1.57) * 90 * s - 40, rot: ang, vr: s * 3, side: s, life: 1 });
        const px = clamp(it.x, 70, o.w - 70), py = Math.max(40, it.y - it.r - 6);
        if (it.fit) {
          S.got++; S.q++; S.stroke++; burst(it, 14 + Math.min(c.streak, 12) * 2);
          c.right(10 + 5 * c.level, px, py); S.rings.push({ x: it.x, y: it.y, r: it.r, life: 1, hue: it.hue });
          if (S.stroke > 1) { c.add(5 * S.stroke, px, py + 30, '#ffd23f'); c.pop(S.stroke === 2 ? 'DOUBLE SLICE!' : 'MULTI SLICE ×' + S.stroke, o.w / 2, o.h * .5, '#ffd23f'); }
          c.hud({ sliced: S.got + ' / ' + L.goal });
          if (S.got >= L.goal) { S.over = true; c.pop('LEVEL CLEARED!', o.w / 2, o.h * .4, '#c6ff3d'); c.after(800, () => end(true)); }
          else if (S.q === L.quota) c.after(350, () => !S.over && (sfx.pop(), newRule()));
        } else {
          burst(it, 10, .7); S.shake = .35; S.hit = 1; c.wrong(px, py, '✗ ' + S.rule.why(it.n));
          if (!c.lose()) { S.over = true; c.after(900, () => end(false)); }
        }
      };
      c.slice = slice;
      const end = won => c.end({ won, title: won ? 'Ninja master!' : 'Out of lives',
        msg: won ? `You sliced ${L.goal} numbers that fit the rules.` : `Slice ${L.goal} numbers to clear the level. Check the rule before you swing!`,
        stats: { Sliced: S.got + ' / ' + L.goal }, learnt: [...S.facts.values()].slice(-4), emoji: won ? '🥷' : '💥' });
      // input: tap or click a number, or swipe through several
      const hitAt = (x, y, pad) => S.items.find(i => !i.dead && i.y < o.h + i.r * .3 && Math.hypot(i.x - x, i.y - y) < i.r + pad);
      c.on(o.cv, 'pointerdown', e => { e.preventDefault(); const [x, y] = o.xy(e); S.down = true; S.stroke = 0; S.lx = x; S.ly = y; S.trail = [{ x, y, t: performance.now() }];
        const it = hitAt(x, y, touch ? 10 : 4); if (it) slice(it, Math.random() * 3); });
      c.on(window, 'pointermove', e => { if (!S.down) return; const [x, y] = o.xy(e), dx = x - S.lx, dy = y - S.ly, len = Math.hypot(dx, dy); if (len < 2) return;
        S.trail.push({ x, y, t: performance.now() });
        for (const it of S.items) { if (it.dead) continue; const t = clamp(((it.x - S.lx) * dx + (it.y - S.ly) * dy) / (len * len), 0, 1);
          if (Math.hypot(S.lx + dx * t - it.x, S.ly + dy * t - it.y) < it.r) slice(it, Math.atan2(dy, dx)); }
        S.lx = x; S.ly = y; });
      c.on(window, 'pointerup', () => { S.down = false; });
      c.on(window, 'pointercancel', () => { S.down = false; });
      c.key(e => { const k = e.key.toUpperCase(); if (k.length !== 1 || !KEYS.includes(k)) return;
        const it = S.items.find(i => !i.dead && i.key === k && i.y < o.h); if (it) { e.preventDefault(); S.stroke = 0; slice(it, -.6); } });
      newRule(); wave(); S.spawn = L.gap;

      const ball = (it, a = 1) => {
        const r = it.r, gr = g.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r);
        gr.addColorStop(0, `hsl(${it.hue} 95% 70%)`); gr.addColorStop(1, `hsl(${it.hue} 80% 38%)`);
        g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.6)'; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-r * .35, -r * .45, r * .3, r * .16, -.6, 0, 7); g.fill();
        const s = String(it.n); g.font = `700 ${Math.round(r * (s.length > 2 ? .78 : .98))}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.45)'; g.strokeText(s, 0, 2); g.fillStyle = '#fff'; g.fillText(s, 0, 2); g.globalAlpha = 1;
      };
      const rr = (x, y, w, hh, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, hh, r) : g.rect(x, y, w, hh); };
      c.loop((dt, t) => {
        const W = o.w, H = o.h;
        if (!S.over) { S.spawn -= dt; if (S.spawn <= 0) { wave(); S.spawn = L.gap * (.8 + Math.random() * .4) * (S.items.some(i => !i.dead && i.fit) ? 1 : .5); } }
        for (const it of S.items) { if (it.dead) continue; it.vy += it.g * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt;
          if (it.vy > 0 && it.y > H + it.r + 4) { it.dead = true;
            if (it.fit && !S.over) { c.streak = 0; c.hud({}); c.pop('missed ' + it.n, clamp(it.x, 60, W - 60), H - 40, '#ffb347'); } } }
        S.items = S.items.filter(i => !i.dead);
        for (const b of S.bits) { b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt; b.life -= dt * .9; }
        S.bits = S.bits.filter(b => b.life > 0 && b.y < H + 80);
        for (const p of S.parts) { p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.6; }
        S.parts = S.parts.filter(p => p.life > 0);
        for (const r of S.rings) { r.r += 260 * dt; r.life -= dt * 2.4; } S.rings = S.rings.filter(r => r.life > 0);
        const now = performance.now(); S.trail = S.trail.filter(p => now - p.t < 160);
        S.shake = Math.max(0, S.shake - dt); S.flash = Math.max(0, S.flash - dt * 1.5); S.hit = Math.max(0, S.hit - dt * 2.5);
        // background: night sky, moon, hills
        g.setTransform(1, 0, 0, 1, 0, 0); const d = o.cv.width / W; g.setTransform(d, 0, 0, d, 0, 0);
        if (S.shake) g.translate((Math.random() - .5) * 14 * S.shake, (Math.random() - .5) * 14 * S.shake);
        const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#1b1030'); sky.addColorStop(.6, '#2a1424'); sky.addColorStop(1, '#3a1a12');
        g.fillStyle = sky; g.fillRect(-20, -20, W + 40, H + 40);
        for (const [sx, sy, sr, ph] of S.stars) { g.globalAlpha = .35 + .3 * Math.sin(t * 2 + ph); g.fillStyle = '#fff'; g.fillRect(sx * W, sy * H, sr, sr); } g.globalAlpha = 1;
        const mx = W * .82, my = H * .22, mg = g.createRadialGradient(mx, my, 10, mx, my, 120); mg.addColorStop(0, 'rgba(255,200,140,.35)'); mg.addColorStop(1, 'rgba(255,200,140,0)');
        g.fillStyle = mg; g.fillRect(mx - 120, my - 120, 240, 240); g.fillStyle = '#ffd9a8'; g.beginPath(); g.arc(mx, my, 30, 0, 7); g.fill();
        for (const [k, col, amp] of [[0, '#2b1521', 30], [1, '#1a0c14', 22]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
          for (let x = 0; x <= W + 20; x += 20) g.lineTo(x, H - 60 + k * 30 - amp * Math.sin(x / (90 + k * 50) + k * 2)); g.lineTo(W, H); g.fill(); }
        if (S.hit) { g.fillStyle = `rgba(255,40,60,${S.hit * .25})`; g.fillRect(0, 0, W, H); }
        // rule banner
        const bw = Math.min(W - 20, 520), bx = (W - bw) / 2, sc = 1 + S.flash * .08;
        g.save(); g.translate(W / 2, 40); g.scale(sc, sc); g.translate(-W / 2, -40);
        rr(bx, 8, bw, 62, 16); g.fillStyle = S.flash ? `rgba(255,${120 + 100 * S.flash},60,.95)` : 'rgba(12,8,20,.82)'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#ff5a3a'; g.stroke();
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffb347'; g.font = `700 12px ${FONT}`; g.fillText('SLICE  ' + '●'.repeat(Math.max(0, L.quota - S.q)) + '○'.repeat(Math.min(S.q, L.quota)), W / 2, 22);
        g.fillStyle = '#fff'; let fs = 26; g.font = `700 ${fs}px ${FONT}`; while (g.measureText(S.rule.t).width > bw - 20 && fs > 14) g.font = `700 ${--fs}px ${FONT}`;
        g.fillText(S.rule.t, W / 2, 48); g.restore();
        if (c.streak >= 3) { const p = 1 + .08 * Math.sin(t * 10); g.save(); g.translate(16, 92); g.scale(p, p); g.textAlign = 'left'; g.font = `700 22px ${FONT}`;
          g.fillStyle = '#ffd23f'; g.shadowColor = '#ff5a3a'; g.shadowBlur = 14; g.fillText('COMBO ×' + c.streak, 0, 0); g.restore(); }
        // the numbers, the cut halves, juice and rings
        for (const r of S.rings) { g.globalAlpha = r.life; g.lineWidth = 4; g.strokeStyle = `hsl(${r.hue} 100% 70%)`; g.beginPath(); g.arc(r.x, r.y, r.r, 0, 7); g.stroke(); } g.globalAlpha = 1;
        for (const p of S.parts) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = `hsl(${p.hue} 100% 65%)`; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 7); g.fill(); } g.globalAlpha = 1;
        for (const b of S.bits) { const r = b.it.r; g.save(); g.translate(b.x, b.y); g.rotate(b.rot); g.beginPath(); g.rect(b.side < 0 ? -r - 4 : 0, -r - 4, r + 4, 2 * r + 8); g.clip();
          g.rotate(-b.it.ang); ball(b.it, Math.max(0, b.life)); g.restore(); }
        for (const it of S.items) { if (it.dead) continue; g.save(); g.translate(it.x, it.y); g.rotate(Math.sin(it.rot) * .25); ball(it); g.restore();
          if (!touch && it.key) { const kx = it.x + it.r * .62, ky = it.y - it.r * .78; rr(kx - 10, ky - 10, 20, 20, 5); g.fillStyle = 'rgba(10,8,18,.9)'; g.fill();
            g.strokeStyle = '#ffb347'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = '#ffb347'; g.font = `700 13px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(it.key, kx, ky + 1); } }
        if (S.trail.length > 1) { g.lineCap = 'round'; g.lineJoin = 'round';
          for (let i = 1; i < S.trail.length; i++) { const a = S.trail[i - 1], b = S.trail[i], k = 1 - (now - b.t) / 160; g.strokeStyle = `rgba(255,255,255,${k})`;
            g.lineWidth = 2 + 7 * k; g.shadowColor = '#ffb347'; g.shadowBlur = 12; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } g.shadowBlur = 0; }
      });
    },
    bot(c) { const S = c.S; if (!S || S.over) return; const it = S.items.find(i => !i.dead && i.fit && i.y < c.el.clientHeight - 4); if (it) { S.stroke = 0; c.slice(it); } },
    miss(c) { const S = c.S; if (!S || S.over) return; const it = S.items.find(i => !i.dead && !i.fit); if (it) { S.stroke = 0; c.slice(it); } }
  });
})();
