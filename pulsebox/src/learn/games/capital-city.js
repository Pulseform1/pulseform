/* Capital City Challenge: boards of five countries and their five capitals, shuffled. Tap a country and then its capital
   (or drag from one to the other); a connector links them. Clear a board and a new one slides in, until the clock runs out.
   Medium plays one continent per board; Hard uses capitals that are not the biggest city, with that big city as a decoy. */
// @data countries
(() => {
  const { h, pick, shuffle, sample } = Edu, CAPS = COUNTRIES.filter(c => c.cap);
  const LV = [
    { name: 'Easy', desc: 'Well-known countries. Match 12 pairs in 90 seconds.', goal: 12, time: 90 },
    { name: 'Medium', desc: 'One continent per board, many more countries. Match 18 pairs in 90 seconds.', goal: 18, time: 90 },
    { name: 'Hard', desc: 'Capitals that are not the biggest city (Canberra, Ottawa, Ankara...), less familiar countries, and a decoy city on every board. 15 pairs.', goal: 15, time: 100 }];
  const GROUPS = [['EU', 'Europe'], ['AS', 'Asia'], ['AF', 'Africa'], ['NA SA', 'The Americas'], ['OC', 'Oceania']];
  const COLS = ['#ffd23f', '#3ddc84', '#29e0ff', '#ff7ad9', '#a98bff', '#ff9f1c'];
  const CSS = `.cc-top{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;margin-bottom:10px;min-height:28px}
.cc-tag{padding:4px 12px;border-radius:999px;background:color-mix(in srgb,var(--c) 20%,transparent);color:var(--c);font:800 13px var(--body);letter-spacing:.08em;text-transform:uppercase}
.cc-board{position:relative;display:grid;grid-template-columns:1fr 1fr;column-gap:clamp(30px,9vw,130px);width:min(100%,760px);touch-action:none;user-select:none;-webkit-user-select:none}
.cc-col{display:flex;flex-direction:column;gap:clamp(6px,1.2vh,10px)}
.cc-col i{display:block;font:800 11px var(--body);letter-spacing:.12em;color:var(--muted);text-align:center;font-style:normal}
.cc-card{position:relative;z-index:1;min-height:48px;padding:6px 10px;border-radius:14px;background:var(--panel2);border:2px solid var(--edge);font:700 clamp(14px,2.3vw,19px) var(--display);line-height:1.15;text-align:center;transition:transform .15s,border-color .15s,background .2s;animation:ccin .4s cubic-bezier(.2,1.3,.4,1) both}
.cc-card:hover{border-color:var(--c)}
.cc-card.sel{border-color:var(--c);background:color-mix(in srgb,var(--c) 24%,var(--panel2));transform:scale(1.05);box-shadow:0 0 20px color-mix(in srgb,var(--c) 45%,transparent)}
.cc-card.done{border-color:var(--k);background:color-mix(in srgb,var(--k) 24%,var(--panel2));pointer-events:none}
.cc-card.no{animation:shake .35s;border-color:var(--no)}
.cc-card.city{color:#ffe9a8}
.cc-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.cc-lines path{fill:none;stroke-width:4;stroke-linecap:round;transition:stroke-dashoffset .3s ease-out;filter:drop-shadow(0 0 4px currentColor)}
.cc-lines circle{animation:ccdot .4s ease-out both}
.cc-board.out .cc-card{animation:ccout .35s ease-in forwards}.cc-board.out .cc-lines{transition:opacity .3s;opacity:0}
@keyframes ccin{from{opacity:0;transform:translateY(18px) scale(.9)}}@keyframes ccout{to{opacity:0;transform:translateX(-30px) scale(.9)}}
@keyframes ccdot{from{r:0}}
.cc-msg{min-height:42px;margin-top:10px;text-align:center;color:var(--muted);font-weight:700;max-width:620px;font-size:clamp(13px,2vw,16px)}`;
  Edu.game({
    id: 'capital-city', levels: LV,
    how: ['Tap a country, then tap its capital city (or drag from one to the other).',
      'Keys: 1 to 6 pick in the column, the arrow keys move between cards, Enter chooses.',
      'Each right match adds a second; a wrong one takes three away. Clear a board for a bonus.',
      'Keep matching until the clock runs out. Reach the goal to clear the level.'],
    start(c) {
      if (!document.getElementById('cc-css')) document.head.append(h('style', { id: 'cc-css', text: CSS }));
      const L = c.L, top = h('div', { class: 'cc-top' }), wrap = h('div', { style: { width: '100%', display: 'flex', justifyContent: 'center' } }), msg = h('div', { class: 'cc-msg', 'aria-live': 'polite' });
      c.el.append(top, wrap, msg);
      c.got = 0; c.gi = Math.floor(Math.random() * 5); c.used = new Set(); c.missed = []; c.facts = [];
      const T = c.timer(L.time, () => { const won = c.got >= L.goal, learnt = [...new Set(c.missed)].slice(0, 3);
        for (const f of shuffle(c.facts)) if (learnt.length < 4 && !learnt.includes(f)) learnt.push(f);
        c.end({ won, title: won ? 'Capital champion!' : "Time's up!", msg: won ? `You matched ${c.got} capitals.` : `Match ${L.goal} pairs before the clock runs out to clear the level.`, stats: { 'Pairs matched': c.got }, learnt }); });
      c.hud({ pairs: c.got + ' / ' + L.goal });
      const fresh = pool => { let p = pool.filter(x => !c.used.has(x.name)); if (p.length < 5) { pool.forEach(x => c.used.delete(x.name)); p = pool; } return p; };
      const fact = x => x.big ? `${x.cap} is the capital of ${x.name}, but ${x.big} is its biggest city.` : `${x.cap} is the capital of ${x.name} (${ctName(x)}).`;
      function newBoard() {
        let list, decoy = null, label = '';
        if (c.level === 0) list = sample(fresh(CAPS.filter(x => x.f === 1)), 5);
        else if (c.level === 1) { const g = GROUPS[c.gi++ % GROUPS.length]; let pool = CAPS.filter(x => g[0].includes(x.ct) && x.f <= 2); if (pool.length < 10) pool = CAPS.filter(x => g[0].includes(x.ct)); list = sample(fresh(pool), 5); label = g[1]; }
        else { const nb = sample(fresh(CAPS.filter(x => x.big)), 2); list = shuffle([...nb, ...sample(fresh(CAPS.filter(x => x.f === 3 && !x.big)), 3)]); decoy = pick(nb); label = 'One city is a decoy'; }
        list.forEach(x => c.used.add(x.name));
        c.list = list; c.cities = shuffle(list.map(x => x.cap).concat(decoy ? [decoy.big] : [])); c.decoy = decoy; c.sel = null; c.done = 0; c.busy = false;
        top.innerHTML = ''; if (label) top.append(h('span', { class: 'cc-tag', text: label }));
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'cc-lines');
        const mk = (side, items) => h('div', { class: 'cc-col' }, h('i', { text: side === 'l' ? 'COUNTRY' : 'CAPITAL' }), items.map((t, i) =>
          h('button', { class: 'cc-card' + (side === 'r' ? ' city' : ''), type: 'button', 'data-s': side, 'data-i': i, style: { animationDelay: (i * 45 + (side === 'r' ? 120 : 0)) + 'ms' }, onclick: e => { if (c.drag) return; tap(side, i); } }, t)));
        c.board = h('div', { class: 'cc-board' }, mk('l', list.map(x => x.name)), mk('r', c.cities), svg); c.svg = svg;
        wrap.innerHTML = ''; wrap.append(c.board);
      }
      const card = (s, i) => c.board.querySelector(`.cc-card[data-s="${s}"][data-i="${i}"]`);
      function line(a, b, col, temp) {
        const r = c.board.getBoundingClientRect(), A = a.getBoundingClientRect(), x1 = A.right - r.left, y1 = A.top + A.height / 2 - r.top;
        let x2, y2; if (b.nodeType) { const B = b.getBoundingClientRect(); x2 = B.left - r.left; y2 = B.top + B.height / 2 - r.top; } else [x2, y2] = b;
        const mx = (x1 + x2) / 2, p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', `M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`); p.setAttribute('stroke', col); p.style.color = col; c.svg.append(p);
        if (!temp) { const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; void p.getBoundingClientRect(); p.style.strokeDashoffset = 0;
          for (const [x, y] of [[x1, y1], [x2, y2]]) { const d = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); d.setAttribute('cx', x); d.setAttribute('cy', y); d.setAttribute('r', 5); d.setAttribute('fill', col); c.svg.append(d); } }
        return p;
      }
      function tap(side, i) {
        if (c.busy || !c.alive) return; const el = card(side, i); if (!el || el.classList.contains('done')) return;
        if (c.sel && c.sel.side !== side) return pair(side === 'l' ? i : c.sel.i, side === 'r' ? i : c.sel.i);
        c.board.querySelectorAll('.sel').forEach(e => e.classList.remove('sel'));
        if (c.sel && c.sel.i === i) { c.sel = null; return; }
        c.sel = { side, i }; el.classList.add('sel'); Edu.sfx.click();
      }
      function pair(li, ri) {
        const a = card('l', li), b = card('r', ri), x = c.list[li], city = c.cities[ri], s = c.el.getBoundingClientRect(), B = b.getBoundingClientRect();
        c.sel = null; c.board.querySelectorAll('.sel').forEach(e => e.classList.remove('sel'));
        if (x.cap === city) {
          const col = COLS[c.done % COLS.length]; a.style.setProperty('--k', col); b.style.setProperty('--k', col); a.classList.add('done'); b.classList.add('done'); line(a, b, col);
          c.right(10 + c.level * 5, B.left - s.left + B.width / 2, B.top - s.top); T.add(1); c.got++; c.done++; c.facts.push(fact(x)); c.hud({ pairs: c.got + ' / ' + L.goal });
          msg.textContent = x.big ? `✓ ${city}, not ${x.big}, is the capital of ${x.name}.` : `✓ ${city} is the capital of ${x.name}.`;
          if (c.got === L.goal) { c.pop('GOAL REACHED! Keep going!', null, null, '#ffd23f'); Edu.sfx.win(); }
          if (c.done === c.list.length) { c.busy = true; c.after(320, () => { c.add(5 * c.list.length, s.width / 2, s.height * .35, '#ffd23f'); c.pop('Board clear!', s.width / 2, s.height * .25, '#3ddc84'); c.board.classList.add('out'); c.after(380, newBoard); }); }
        } else {
          [a, b].forEach(e => { e.classList.remove('no'); void e.offsetWidth; e.classList.add('no'); c.after(400, () => e.classList.remove('no')); }); c.wrong(B.left - s.left + B.width / 2, B.top - s.top, '−3s'); T.add(-3);
          const owner = COUNTRIES.find(y => y.cap === city), dec = COUNTRIES.find(y => y.big === city);
          const m = dec ? `${city} is the biggest city of ${dec.name}, but not its capital. The capital is ${dec.cap}.` : `No: ${city} is the capital of ${owner.name}. ${x.name}'s capital is on the board too.`;
          msg.textContent = '✗ ' + m; c.missed.push(dec ? fact(dec) : fact(x));
        }
      }
      // dragging from a card to a card in the other column
      c.on(document, 'pointerdown', e => { const el = e.target.closest && e.target.closest('.cc-card'); if (!el || !c.board || !c.board.contains(el) || c.busy) return; c.dstart = { el, x: e.clientX, y: e.clientY }; });
      c.on(document, 'pointermove', e => { const d = c.dstart; if (!d) return; if (!c.drag && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 12) return;
        if (!c.drag) { c.drag = true; tap(d.el.dataset.s, +d.el.dataset.i); if (!c.sel) { c.drag = false; c.dstart = null; return; } }
        const r = c.board.getBoundingClientRect(); if (c.tmp) c.tmp.remove(); const from = d.el; c.tmp = from.dataset.s === 'l' ? line(from, [e.clientX - r.left, e.clientY - r.top], 'rgba(255,255,255,.6)', 1) : null;
        if (c.tmp) c.tmp.style.strokeDasharray = '6 6'; });
      c.on(document, 'pointerup', e => { const d = c.dstart; c.dstart = null; if (c.tmp) { c.tmp.remove(); c.tmp = null; } if (!c.drag) return;
        const t = document.elementFromPoint(e.clientX, e.clientY), el = t && t.closest && t.closest('.cc-card');
        if (el && c.board.contains(el) && el.dataset.s !== d.el.dataset.s) tap(el.dataset.s, +el.dataset.i);
        setTimeout(() => { c.drag = false; }, 0); });
      c.key(e => {
        if (!c.board) return; const n = +e.key;
        if (n >= 1 && n <= 6) { const side = c.sel && c.sel.side === 'l' ? 'r' : 'l', el = card(side, n - 1); if (el) { e.preventDefault(); tap(side, n - 1); } return; }
        const dirs = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }, d = dirs[e.key]; if (!d) return; e.preventDefault();
        const f = document.activeElement, cur = f && f.classList && f.classList.contains('cc-card') ? f : null;
        let side = cur ? cur.dataset.s : 'l', i = cur ? +cur.dataset.i : -1; if (d[0]) { side = d[0] > 0 ? 'r' : 'l'; i = Math.max(0, i); } else i += d[1];
        const list = [...c.board.querySelectorAll(`.cc-card[data-s="${side}"]`)]; i = Math.max(0, Math.min(list.length - 1, i));
        let k = i; while (list[k] && list[k].classList.contains('done') && k < list.length - 1 && d[1] >= 0) k++; while (list[k] && list[k].classList.contains('done') && k > 0) k--;
        if (list[k]) list[k].focus();
      });
      newBoard();
    },
    bot(c) { if (!c.board || c.busy) return; const li = c.list.findIndex((x, i) => !c.board.querySelector(`.cc-card[data-s="l"][data-i="${i}"]`).classList.contains('done'));
      if (li < 0) return; if (c.sel && c.sel.side === 'r') { c.sel = null; c.board.querySelectorAll('.sel').forEach(e => e.classList.remove('sel')); }
      if (!c.sel || c.sel.i !== li) { c.board.querySelector(`.cc-card[data-s="l"][data-i="${li}"]`).click(); if (!c.sel) return; }
      c.board.querySelector(`.cc-card[data-s="r"][data-i="${c.cities.indexOf(c.list[li].cap)}"]`).click(); },
    miss(c) { if (!c.board || c.busy) return; c.sel = null; const ri = c.cities.findIndex(x => x !== c.list[0].cap);
      c.board.querySelector('.cc-card[data-s="l"][data-i="0"]').click(); c.board.querySelector(`.cc-card[data-s="r"][data-i="${ri}"]`).click(); }
  });
})();
