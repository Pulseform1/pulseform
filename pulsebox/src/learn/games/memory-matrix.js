/* Memory Matrix: tiles light up, then the player taps them back. Easy: which tiles (any order) on a grid that grows
   from 3×3 to 4×4. Medium: the order matters and the sequence grows by one tile every round. Hard: order and colour on
   a 5×5 grid with faster flashes. Three lives; a recall clock each round; clear every round to clear the level. */
(() => {
  const { h, rnd, sample, sfx, tone } = Edu, SP = Edu.SPEED, w = ms => ms / SP;   // (show timings follow ?speed for the checks)
  const COLS = [{ n: 'Red', c: '#ff4d5e', s: '●' }, { n: 'Yellow', c: '#ffd23f', s: '▲' }, { n: 'Blue', c: '#4d94ff', s: '■' }, { n: 'Green', c: '#3ddc84', s: '★' }];
  const LV = [
    { name: 'Easy', desc: 'Which tiles lit up? Any order. 3×3, growing to 4×4.', rounds: [[3, 3], [3, 3], [3, 4], [3, 4], [4, 5], [4, 5], [4, 6], [4, 7]] },
    { name: 'Medium', desc: 'Tap them back in order. The sequence grows each round.', size: 4, first: 3, n: 8, on: 560, gap: 170 },
    { name: 'Hard', desc: 'Order and colour on a 5×5 grid, with faster flashes.', size: 5, first: 3, n: 7, on: 420, gap: 120, colour: true }
  ];
  function css() {
    if (document.getElementById('mm-css')) return;
    document.head.append(h('style', { id: 'mm-css', text: `
.mm{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}
.mm-msg{font:700 clamp(20px,4vw,30px) var(--display);min-height:1.25em;text-align:center;transition:color .2s}
.mm-msg.go{color:var(--c2)}.mm-msg.bad{color:var(--no)}.mm-msg.win{color:var(--gold)}
.mm-grid{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:clamp(6px,1.4vw,10px);width:min(100%,440px,calc(100dvh - 340px));min-width:230px;aspect-ratio:1;padding:clamp(8px,1.6vw,12px);border-radius:22px;background:var(--bg2);border:1px solid var(--edge);transition:box-shadow .3s}
.mm-grid.watch{box-shadow:0 0 0 2px color-mix(in srgb,var(--c) 55%,transparent),0 0 46px color-mix(in srgb,var(--c) 28%,transparent)}
.mm-grid.watch .mm-t{cursor:default}
.mm-t{position:relative;min-width:0;border-radius:14px;background:var(--panel2);border:2px solid var(--edge);transition:transform .14s,background .14s,box-shadow .2s,border-color .14s;font:800 clamp(18px,4.5vw,32px) var(--display);color:#07090e;display:grid;place-items:center;animation:mmIn .35s ease both}
.mm-grid:not(.watch) .mm-t:hover{border-color:var(--c);transform:translateY(-2px)}
.mm-t.on{background:var(--k,var(--c));border-color:#fff;transform:scale(1.08);box-shadow:0 0 26px var(--k,var(--c))}
.mm-t.ok{background:color-mix(in srgb,var(--k,var(--ok)) 75%,var(--panel2));border-color:var(--k,var(--ok));animation:mmPop .3s}
.mm-t.no{background:var(--no);border-color:#fff;animation:shake .3s}
.mm-t.miss{border-color:var(--gold);box-shadow:0 0 0 3px var(--gold) inset,0 0 18px rgba(255,210,63,.5)}
.mm-grid.kb .mm-t.cur::after{content:'';position:absolute;inset:-6px;border:3px dashed #fff;border-radius:18px;pointer-events:none}
.mm-dots{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;min-height:14px}
.mm-dots i{width:14px;height:14px;border-radius:50%;background:var(--panel2);border:2px solid var(--edge);transition:background .2s,transform .2s}
.mm-dots i.f{background:var(--c2);border-color:var(--c2);transform:scale(1.15)}
.mm-pal{display:flex;gap:6px;justify-content:center;width:min(100%,460px)}
.mm-pal button{flex:1 1 0;min-width:0;justify-content:center;min-height:50px;padding:4px 6px;border-radius:14px;background:var(--panel2);border:3px solid var(--edge);display:flex;align-items:center;gap:5px;font:700 13px var(--body);transition:transform .12s,border-color .12s}
.mm-pal button b{flex:none}
.mm-pal button b{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--k);color:#07090e;font-size:17px}
.mm-pal button.sel{border-color:#fff;transform:translateY(-3px);box-shadow:0 6px 18px color-mix(in srgb,var(--k) 45%,transparent)}
@keyframes mmIn{from{opacity:0;transform:scale(.6)}}
@keyframes mmPop{50%{transform:scale(1.14)}}` }));
  }
  Edu.game({
    id: 'memory-matrix', levels: LV,
    how: ['Watch the tiles that light up, then tap them back when it says "Your turn".',
      'Easy: just the right tiles, in any order. Medium: the same order they flashed.',
      'Hard: order and colour. Pick the colour below (or keys 1 to 4) before each tile.',
      'Arrow keys move the cursor; Space or Enter picks a tile. A wrong tile or the clock running out costs a life.',
      'Clear every round to clear the level. You have three lives.'],
    start(c) {
      css();
      const L = LV[c.level], ord = c.level > 0, col = !!L.colour, R = ord ? L.n : L.rounds.length;
      const msg = h('div', { class: 'mm-msg' }), grid = h('div', { class: 'mm-grid' }), dots = h('div', { class: 'mm-dots' }), pal = h('div', { class: 'mm-pal' });
      c.el.append(h('div', { class: 'mm' }, msg, grid, dots, col ? pal : null));
      const S = c.S = { ord, col, round: 0, phase: 'show', n: 0, tiles: [], target: [], seq: [], pos: 0, found: new Set(), cur: 0, colour: 0, cleared: 0, longest: 0, pal: [] };
      c.lives(3);
      const T = c.timer(20, () => { if (S.phase === 'input') { T.paused = true; fail(null, 'Too slow!'); } }); T.paused = true;
      if (col) { S.pal = COLS.map((k, i) => h('button', { type: 'button', '--k': k.c, title: k.n + ' (key ' + (i + 1) + ')', onclick: () => setColour(i) }, h('b', { text: k.s }), k.n)); pal.append(...S.pal); setColour(0); }
      function setColour(i) { S.colour = i; S.pal.forEach((b, j) => b.classList.toggle('sel', i === j)); }
      function say(t, cls) { msg.textContent = t; msg.className = 'mm-msg' + (cls ? ' ' + cls : ''); }
      function build(n) {
        S.n = n; grid.style.setProperty('--n', n); grid.innerHTML = ''; S.cur = Math.min(S.cur, n * n - 1);
        S.tiles = Array.from({ length: n * n }, (_, i) => h('button', { class: 'mm-t', type: 'button', 'aria-label': 'Tile ' + (i + 1), style: { animationDelay: i * 18 + 'ms' }, onclick: () => tap(i) }));
        grid.append(...S.tiles); drawCur();
      }
      function drawCur() { S.tiles.forEach((t, i) => t.classList.toggle('cur', i === S.cur)); }
      function clean() { for (const t of S.tiles) { t.classList.remove('on', 'ok', 'no', 'miss'); t.style.removeProperty('--k'); t.textContent = ''; } }
      function drawDots() { dots.innerHTML = ''; const n = S.target.length, d = ord ? S.pos : S.found.size; for (let i = 0; i < n; i++) dots.append(h('i', { class: i < d ? 'f' : '' })); }
      function at(i) { const r = S.tiles[i].getBoundingClientRect(), s = c.el.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top]; }
      function light(i, k, on) {
        const t = S.tiles[i];
        if (on) { if (k >= 0) { t.style.setProperty('--k', COLS[k].c); t.textContent = COLS[k].s; } t.classList.add('on'); tone(330 + (i % 8) * 70 + (k >= 0 ? k * 40 : 0), .16, 'triangle', .09); }
        else { t.classList.remove('on'); t.style.removeProperty('--k'); t.textContent = ''; }
      }
      function round() {
        let n, count;
        if (!ord) [n, count] = L.rounds[S.round]; else { n = L.size; count = L.first + S.round; }
        if (S.n !== n) build(n);
        if (!ord) S.target = sample([...Array(n * n).keys()], count).map(t => ({ t, k: -1 }));
        else { while (S.seq.length < count) { let t; do t = rnd(0, n * n - 1); while (S.seq.length && t === S.seq[S.seq.length - 1].t); S.seq.push({ t, k: col ? rnd(0, 3) : -1 }); } S.target = S.seq; }
        show();
      }
      function show() {
        S.phase = 'show'; S.pos = 0; S.found.clear(); T.paused = true; clean(); drawDots();
        grid.classList.add('watch'); say('Round ' + (S.round + 1) + ' · Watch!'); c.hud({ round: (S.round + 1) + ' / ' + R });
        const f = Math.pow(.94, S.round); let t = w(650);
        if (!ord) {
          c.after(t, () => { S.target.forEach(o => light(o.t, -1, true)); });
          t += w(1000 + 260 * S.target.length);
          c.after(t, () => S.target.forEach(o => light(o.t, -1, false)));
        } else for (const o of S.target) {
          c.after(t, () => light(o.t, o.k, true)); t += w(L.on * f);
          c.after(t, () => light(o.t, o.k, false)); t += w(L.gap * f);
        }
        c.after(t + w(250), input);
      }
      function input() {
        S.phase = 'input'; grid.classList.remove('watch'); say(ord ? 'Your turn! Same order' + (col ? ' and colours' : '') : 'Your turn! Find them', 'go');
        const n = S.target.length; T.set(Math.round((col ? 7 : 5) + n * (col ? 2 : 1.4))); T.paused = false; sfx.pop();
      }
      function tap(i) {
        S.cur = i; drawCur(); const ae = document.activeElement; if (ae && ae.classList.contains('mm-t')) ae.blur(); if (S.phase !== 'input' || !c.alive) return;
        const t = S.tiles[i], [x, y] = at(i);
        if (!ord) {
          if (S.found.has(i)) return;
          if (!S.target.some(o => o.t === i)) return fail(i);
          S.found.add(i); t.classList.add('ok'); c.right(5, x, y); drawDots();
          if (S.found.size === S.target.length) won();
        } else {
          const want = S.target[S.pos];
          if (want.t !== i || (col && want.k !== S.colour)) return fail(i, col && want.t === i ? 'Wrong colour!' : null);
          S.pos++; t.classList.remove('ok'); void t.offsetWidth; if (col) { t.style.setProperty('--k', COLS[want.k].c); t.textContent = COLS[want.k].s; }
          t.classList.add('ok'); tone(330 + (i % 8) * 70, .12, 'triangle', .08); c.right(5 + c.level * 3, x, y); drawDots();
          if (S.pos === S.target.length) won();
        }
      }
      function fail(i, why) {
        S.phase = 'wait'; T.paused = true;
        if (i != null) { const [x, y] = at(i); S.tiles[i].classList.add('no'); c.wrong(x, y, '✗'); } else c.wrong();
        if (!ord) S.target.forEach(o => { if (!S.found.has(o.t)) S.tiles[o.t].classList.add('miss'); });
        else { const o = S.target[S.pos]; S.tiles[o.t].classList.add('miss'); if (col) { S.tiles[o.t].style.setProperty('--k', COLS[o.k].c); S.tiles[o.t].textContent = COLS[o.k].s; } }
        const left = c.lose(); say((why || 'Not that one!') + (left ? ' The gold tile' + (ord ? ' was next.' : 's were lit.') : ''), 'bad');
        c.after(left ? 1300 : 900, () => left ? (ord ? show() : round()) : finish(false));
      }
      function won() {
        S.phase = 'wait'; T.paused = true; const n = S.target.length, bonus = n * (5 + c.level * 5) + Math.round(T.left());
        S.cleared++; S.longest = Math.max(S.longest, n); grid.classList.add('watch'); say('Round clear!', 'win'); c.add(bonus, c.el.clientWidth / 2, 40, '#ffd23f'); sfx.win();
        S.round++; c.after(700, () => S.round >= R ? finish(true) : round());
      }
      function finish(ok) {
        c.end({ won: ok, title: ok ? 'Memory master!' : 'Out of lives', msg: ok ? 'You remembered every pattern.' : 'Patterns get easier to hold when you group them. Try again!',
          stats: { Rounds: S.cleared + ' / ' + R, 'Longest pattern': S.longest || '-' },
          learnt: [ord ? 'Saying the order to yourself (top left, middle, corner...) helps you hold a sequence.' : 'Seeing the lit tiles as one shape (a line, an L, a corner) is easier than remembering each tile.',
            'Grouping things into chunks lets your working memory hold more at once.',
            col ? 'Linking two details (a place and a colour) into one picture helps you recall both.' : 'Memory gets better with practice: each round stretches it a little.'] });
      }
      c.key(e => {
        const n = S.n, k = e.key; let d = 0;
        if (k === 'ArrowLeft') d = S.cur % n ? -1 : 0; else if (k === 'ArrowRight') d = S.cur % n < n - 1 ? 1 : 0;
        else if (k === 'ArrowUp') d = S.cur >= n ? -n : 0; else if (k === 'ArrowDown') d = S.cur < n * n - n ? n : 0;
        if (k.startsWith('Arrow')) { e.preventDefault(); grid.classList.add('kb'); S.cur += d; drawCur(); sfx.click(); }
        else if ((k === ' ' || k === 'Enter') && !(e.target && e.target.tagName === 'BUTTON' && !e.target.classList.contains('mm-t'))) { e.preventDefault(); grid.classList.add('kb'); tap(S.cur); }
        else if (col && /^[1-4]$/.test(k)) setColour(+k - 1);
      });
      c.on(grid, 'pointerdown', () => grid.classList.remove('kb'));
      round();
    },
    bot(c) {
      const S = c.S; if (!S || S.phase !== 'input') return;
      if (!S.ord) { const o = S.target.find(o => !S.found.has(o.t)); if (o) S.tiles[o.t].click(); return; }
      const want = S.target[S.pos]; if (S.col && S.colour !== want.k) S.pal[want.k].click(); else S.tiles[want.t].click();
    },
    miss(c) {
      const S = c.S; if (!S || S.phase !== 'input') return;
      const bad = S.tiles.findIndex((t, i) => S.ord ? i !== S.target[S.pos].t : !S.target.some(o => o.t === i)); S.tiles[bad].click();
    }
  });
})();
