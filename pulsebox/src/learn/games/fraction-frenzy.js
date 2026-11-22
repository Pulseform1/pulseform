/* Fraction Frenzy: a face-up board of tiles (fractions, decimals, percentages and pictures). Tap two tiles with the
   same value to burst them. Every value on a board appears exactly twice, so each tile has one partner. Clear boards
   against the clock; combos give time back. */
(() => {
  const { h, pick, shuffle, sample, sfx } = Edu, KEYS = 'QWERASDFZXCV';
  const term = d => { while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; };   // ends as a decimal (only 2s and 5s in d)
  const dec = (n, d) => String(+(n / d).toFixed(4)), pct = (n, d) => +(n * 100 / d).toFixed(3) + '%';
  const F = (n, d) => ({ k: 'frac', n, d }), K = (k, n, d) => ({ k, n, d });
  const LV = [
    { name: 'Easy', desc: 'Halves, thirds and quarters: match each fraction to its picture. 16 pairs.', boards: 4, pairs: 4, time: 80,
      pool: [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]], pair: (n, d) => [F(n, d), K(pick(['pie', 'bar']), n, d)] },
    { name: 'Medium', desc: 'Halves, quarters, fifths and tenths as fractions, decimals and percents. 18 pairs.', boards: 3, pairs: 6, time: 100,
      pool: [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10]],
      pair: (n, d) => { const ks = sample(['frac', 'dec', 'pct'], 2); if (ks[0] === 'frac' && Math.random() < .25) ks[0] = 'bar'; return ks.map(k => K(k, n, d)); } },
    { name: 'Hard', desc: 'Equivalent fractions, eighths, 0.125 and 12.5%, simplifying. 18 pairs.', boards: 3, pairs: 6, time: 120,
      pool: [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [1, 6], [5, 6], [1, 8], [3, 8], [5, 8], [7, 8], [1, 20], [3, 20], [3, 10], [7, 10]],
      pair: (n, d) => {
        const k = d === 20 ? 5 : pick([2, 3, 4].filter(m => d * m <= 24)), big = F(n * k, d * k), opts = [[big, F(n, d)]];
        if (term(d)) opts.push([big, K(pick(['dec', 'pct']), n, d)], [F(n, d), K(pick(['dec', 'pct']), n, d)], [K('dec', n, d), K('pct', n, d)]);
        const pk = [2, 3].filter(m => d * m <= 12); if (pk.length) { const m = pick(pk); opts.push([K(pick(['pie', 'bar']), n * m, d * m), F(n, d)]); }
        if (d <= 12) opts.push([K('pie', n, d), big]);
        return pick(opts);
      } }
  ];
  const CSS = `.ff-top{display:flex;align-items:center;justify-content:space-between;gap:10px;width:min(100%,780px);margin-bottom:8px;color:var(--muted);font-size:14px}
.ff-dots{display:flex;gap:6px}.ff-dots i{width:12px;height:12px;border-radius:50%;background:var(--edge);transition:background .3s}.ff-dots i.on{background:var(--c)}
.ff-b{flex:1;min-height:0;width:min(100%,780px);display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));grid-auto-rows:minmax(64px,1fr);gap:clamp(6px,1.4vw,12px);animation:ffin .45s cubic-bezier(.2,1.3,.4,1) both}
@keyframes ffin{from{opacity:0;transform:translateY(40px) scale(.9)}}
.ff-t{position:relative;min-height:64px;border-radius:16px;background:linear-gradient(160deg,var(--panel2),#151926);border:2px solid var(--edge);display:flex;align-items:center;justify-content:center;padding:6px;font:700 clamp(22px,4.4vw,36px) var(--display);transition:transform .15s,border-color .15s,box-shadow .15s,opacity .3s;animation:pop .35s ease both;touch-action:manipulation}
.ff-t:hover{border-color:color-mix(in srgb,var(--c) 60%,var(--edge));transform:translateY(-2px)}
.ff-t.sel{border-color:var(--c);box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 40%,transparent),0 10px 30px color-mix(in srgb,var(--c) 30%,transparent);transform:translateY(-4px) scale(1.04)}
.ff-t.bad{border-color:var(--no);animation:shake .35s}.ff-t.gone{animation:ffgo .4s ease forwards;pointer-events:none}
@keyframes ffgo{40%{transform:scale(1.18);border-color:var(--ok);box-shadow:0 0 30px var(--ok)}to{transform:scale(.2) rotate(12deg);opacity:0}}
.ff-t .kk{position:absolute;top:5px;left:8px;font:700 11px var(--display);color:var(--muted)}
.ff-t svg{width:auto;height:min(78%,84px);max-width:92%}.ff-t svg.bar{height:auto;width:92%;max-height:60%}
.ff-t path,.ff-t rect{fill:#262d40;stroke:#0b0d14;stroke-width:2.5}.ff-t .on{fill:var(--c)}
.ff-fr{display:inline-flex;flex-direction:column;align-items:center;line-height:1}.ff-fr i{display:block;width:120%;height:3px;border-radius:2px;background:currentColor;margin:3px 0}
.ff-p{position:absolute;width:10px;height:10px;border-radius:3px;pointer-events:none;animation:ffp .6s ease-out forwards;z-index:4}
@keyframes ffp{to{transform:translate(var(--dx),var(--dy)) rotate(200deg);opacity:0}}
.ff-hot .ff-b{filter:drop-shadow(0 0 14px color-mix(in srgb,var(--c) 35%,transparent))}`;
  function pie(n, d) {
    const p = a => `${(48 * Math.cos(a)).toFixed(2)} ${(48 * Math.sin(a)).toFixed(2)}`; let s = '';
    for (let i = 0; i < d; i++) { const a0 = i / d * 2 * Math.PI - Math.PI / 2, a1 = (i + 1) / d * 2 * Math.PI - Math.PI / 2;
      s += `<path d="M0 0L${p(a0)}A48 48 0 0 1 ${p(a1)}Z"${i < n ? ' class="on"' : ''}/>`; }
    return `<svg viewBox="-52 -52 104 104" aria-label="${n} of ${d} parts shaded">${s}</svg>`;
  }
  function bar(n, d) {
    let s = ''; const w = 116 / d; for (let i = 0; i < d; i++) s += `<rect x="${2 + i * w}" y="2" width="${w}" height="36"${i < n ? ' class="on"' : ''}/>`;
    return `<svg class="bar" viewBox="0 0 120 40" aria-label="${n} of ${d} parts shaded">${s}</svg>`;
  }
  const show = t => t.k === 'frac' ? `<span class="ff-fr"><b>${t.n}</b><i></i><b>${t.d}</b></span>` : t.k === 'dec' ? dec(t.n, t.d) : t.k === 'pct' ? pct(t.n, t.d) : t.k === 'pie' ? pie(t.n, t.d) : bar(t.n, t.d);
  const say = t => t.k === 'frac' ? `${t.n}/${t.d}` : t.k === 'dec' ? dec(t.n, t.d) : t.k === 'pct' ? pct(t.n, t.d) : `a picture of ${t.n}/${t.d}`;

  Edu.game({
    id: 'fraction-frenzy', levels: LV,
    how: ['Every tile has exactly one partner with the same value: 1/2, 0.5, 50% and a half-shaded circle are all equal.',
      'Tap or click two tiles that match to burst them. On a keyboard, press the letters shown on the tiles.',
      'A wrong pair costs 4 seconds. Matches in a row give you time back.',
      'Clear every board before the clock runs out.'],
    start(c) {
      if (!document.getElementById('ff-css')) document.head.append(h('style', { id: 'ff-css', text: CSS }));
      const L = c.L, touch = matchMedia('(hover: none)').matches, target = L.boards * L.pairs;
      const S = c.S = { got: 0, b: 0, sel: null, tiles: [], facts: new Map(), over: false };
      const dots = h('div', { class: 'ff-dots' }, Array.from({ length: L.boards }, () => h('i'))), info = h('span', { text: 'Find the pairs with the same value' });
      const top = h('div', { class: 'ff-top' }, info, dots); let boardEl = null;
      c.el.style.justifyContent = 'flex-start'; c.el.append(top);
      const T = c.timer(L.time, () => { S.over = true; c.end({ won: false, title: "Time's up!", emoji: '⏰', msg: `You matched ${S.got} of ${target} pairs. Clear every board to win.`,
        stats: { Pairs: S.got + ' / ' + target }, learnt: [...S.facts.values()].slice(-4) }); });
      c.hud({ pairs: '0 / ' + target });
      const cols = () => window.innerWidth > 560 ? 4 : L.pairs > 4 ? 3 : 2;
      c.on(window, 'resize', () => boardEl && boardEl.style.setProperty('--cols', cols()));
      const burst = (el, col) => { const r = el.getBoundingClientRect(), s = c.el.getBoundingClientRect();
        for (let i = 0; i < 12; i++) { const a = Math.random() * 6.3, v = 50 + Math.random() * 70;
          const p = h('div', { class: 'ff-p', style: { left: r.left - s.left + r.width / 2 + 'px', top: r.top - s.top + r.height / 2 + 'px', background: pick([col, '#fff', 'var(--c2)']) }, '--dx': Math.cos(a) * v + 'px', '--dy': Math.sin(a) * v + 'px' });
          c.el.append(p); setTimeout(() => p.remove(), 650); } };
      const newBoard = () => {
        S.b++; dots.children[S.b - 1].classList.add('on'); info.textContent = `Board ${S.b} of ${L.boards}: find the ${L.pairs} pairs`;
        const vals = sample(L.pool, L.pairs), list = [];
        vals.forEach(([n, d], id) => L.pair(n, d).forEach(t => list.push(Object.assign({ id, v: n + '/' + d }, t))));
        S.tiles = shuffle(list); S.sel = null; if (boardEl) boardEl.remove();
        boardEl = h('div', { class: 'ff-b', '--cols': cols() });
        S.tiles.forEach((t, i) => { t.el = h('button', { class: 'ff-t', type: 'button', 'aria-label': say(t), style: { animationDelay: i * 35 + 'ms' }, onclick: () => tap(t) },
          touch ? null : h('span', { class: 'kk', text: KEYS[i] }), h('span', { html: show(t) })); t.key = KEYS[i]; boardEl.append(t.el); });
        c.el.append(boardEl);
      };
      const tap = t => {
        if (S.over || t.done) return; sfx.click();
        if (!S.sel) { S.sel = t; t.el.classList.add('sel'); return; }
        if (S.sel === t) { t.el.classList.remove('sel'); S.sel = null; return; }
        const a = S.sel, r = t.el.getBoundingClientRect(), s = c.el.getBoundingClientRect(), x = r.left - s.left + r.width / 2, y = r.top - s.top;
        S.sel = null; a.el.classList.remove('sel');
        if (a.v === t.v) {
          a.done = t.done = true; S.got++;
          for (const e of [a, t]) { e.el.classList.add('gone'); burst(e.el, '#3ddc84'); }
          c.right(10 + 5 * c.level, x, y); const bonus = c.streak >= 3 ? 3 : 1; T.add(bonus);
          if (c.streak >= 3) c.pop(`COMBO ×${c.streak}  +${bonus}s`, s.width / 2, s.height * .5, '#ffd23f');
          c.el.classList.toggle('ff-hot', c.streak >= 3); c.hud({ pairs: S.got + ' / ' + target });
          const [n, d] = a.v.split('/').map(Number), eq = [n + '/' + d];
          for (const e of [a, t]) if ((e.k === 'frac' || e.k === 'pie' || e.k === 'bar') && e.d !== d && !eq.includes(e.n + '/' + e.d)) eq.push(e.n + '/' + e.d);
          if (term(d)) eq.push(dec(n, d), pct(n, d));
          S.facts.delete(a.v); S.facts.set(a.v, eq.length > 1 ? eq.join(' = ') : `${n}/${d} means ${n} of ${d} equal parts`);
          if (S.tiles.every(e => e.done)) {
            if (S.got >= target) { S.over = true; c.add(Math.ceil(T.left()) * 2, s.width / 2, s.height * .45, '#c6ff3d'); c.pop('ALL CLEAR!', s.width / 2, s.height * .35, '#ffd23f');
              c.after(700, () => c.end({ won: true, title: 'Fraction master!', emoji: '🍕', msg: `All ${target} pairs matched with ${Math.ceil(T.left())} seconds to spare (+2 points a second).`,
                stats: { Pairs: S.got + ' / ' + target, 'Time left': Math.ceil(T.left()) + 's' }, learnt: [...S.facts.values()].slice(-4) })); }
            else { T.add(5); c.pop('BOARD CLEAR!  +5s', s.width / 2, s.height * .4, '#ffd23f'); sfx.win(); c.after(550, () => !S.over && newBoard()); }
          }
        } else {
          for (const e of [a, t]) { e.el.classList.remove('bad'); void e.el.offsetWidth; e.el.classList.add('bad'); }
          c.wrong(x, y, `✗ ${say(a)} ≠ ${say(t)}   −4s`); T.add(-4); c.el.classList.remove('ff-hot');
        }
      };
      c.tap = tap;
      c.key(e => { const i = KEYS.indexOf(e.key.toUpperCase()); if (e.key.length === 1 && i >= 0 && S.tiles[i] && !S.tiles[i].done) { e.preventDefault(); tap(S.tiles[i]); } });
      newBoard();
    },
    bot(c) { const S = c.S; if (!S || S.over) return; const a = S.sel || S.tiles.find(t => !t.done); if (!a) return;
      const b = S.tiles.find(t => !t.done && t !== a && t.v === a.v); if (!S.sel) c.tap(a); if (b) c.tap(b); },
    miss(c) { const S = c.S; if (!S || S.over) return; const a = S.tiles.find(t => !t.done), b = a && S.tiles.find(t => !t.done && t.v !== a.v);
      if (S.sel) c.tap(S.sel); if (a && b) { c.tap(a); c.tap(b); } }
  });
})();
