/* Pattern Pro: a sequence of numbers, shapes or colours with a blank at the end; pick what comes next from four.
   A clock per question that gets shorter as the streak grows, three lives, 12 right clears the level.
   Every sequence is built from one rule, and every wrong option breaks that rule. */
(() => {
  const { h, rnd, pick, shuffle, sample, sfx } = Edu, GOAL = 12;
  const CL = [['Red', '#ff4d5e'], ['Orange', '#ff9f1c'], ['Yellow', '#ffd23f'], ['Green', '#3ddc84'], ['Blue', '#4d94ff'], ['Purple', '#b07cff']];
  const SH = ['circle', 'square', 'triangle', 'star', 'diamond', 'hexagon'];
  const N = v => ({ k: 'n', v }), id = o => JSON.stringify(o);
  const nums = (s, ans, w, rule) => ({ seq: s.map(N), ans: N(ans), wrong: w.filter(v => v >= 0).map(N), rule });
  const pts = (n, r, a0 = -90, r2) => Array.from({ length: n * (r2 ? 2 : 1) }, (_, i) => { const a = (a0 + i * 360 / (n * (r2 ? 2 : 1))) * Math.PI / 180, rr = r2 && i % 2 ? r2 : r; return (20 + rr * Math.cos(a)).toFixed(1) + ',' + (20 + rr * Math.sin(a)).toFixed(1); }).join(' ');
  const SHAPE = { circle: '<circle cx="20" cy="20" r="15"/>', square: '<rect x="6" y="6" width="28" height="28" rx="3"/>', triangle: '<path d="M20 4 36 34H4Z"/>',
    star: `<polygon points="${pts(5, 18, -90, 7.5)}"/>`, diamond: '<path d="M20 2 37 20 20 38 3 20Z"/>', hexagon: `<polygon points="${pts(6, 17, 0)}"/>` };
  const names = a => a.map(s => s).join(', ');
  // one generator per rule; each returns { seq, ans, wrong (candidates), rule }
  const G = {
    add() { const a = rnd(1, 12), k = rnd(1, 5), s = [0, 1, 2, 3].map(i => a + i * k), ans = a + 4 * k; return nums(s, ans, shuffle([ans + 1, ans - 1, ans + k, ans - k, ans + 2]), `Add ${k} each time.`); },
    sub() { const k = rnd(2, 9), a = rnd(4 * k + 2, 4 * k + 30), s = [0, 1, 2, 3].map(i => a - i * k), ans = a - 4 * k; return nums(s, ans, shuffle([ans + 1, ans - 1, ans - k, ans + k, ans - 2]), `Take away ${k} each time.`); },
    double() { const a = rnd(1, 5), s = [a, 2 * a, 4 * a, 8 * a], ans = 16 * a; return nums(s, ans, shuffle([12 * a, ans + 2, ans - 2, 24 * a, ans + a]), 'Each number is double the one before.'); },
    alt() { const a = rnd(3, 7), b = rnd(1, a - 1), up = Math.random() < .5, s = [rnd(up ? 4 : 10, up ? 12 : 18)];
      for (let i = 1; i < 6; i++) s.push(s[i - 1] + ((i % 2 === 1) === up ? a : -b));
      const last = s[5], ans = last + (up ? -b : a), other = last + (up ? a : -b);
      return nums(s, ans, shuffle([other, ans + 1, ans - 1, last]), `Two steps that take turns: ${up ? `add ${a}, take away ${b}` : `take away ${b}, add ${a}`}.`); },
    squares() { const n = rnd(1, 6), s = [0, 1, 2, 3].map(i => (n + i) ** 2), ans = (n + 4) ** 2; return nums(s, ans, shuffle([ans + 1, ans - 1, s[3] * 2 - s[2], ans + 2, ans - 2]), `Square numbers: ${n + 4} × ${n + 4} = ${ans}.`); },
    fib() { const a = rnd(1, 4), b = rnd(a, a + 3), s = [a, b]; while (s.length < 5) s.push(s[s.length - 1] + s[s.length - 2]); const ans = s[3] + s[4];
      return nums(s, ans, shuffle([ans + 1, ans - 1, s[4] * 2, 2 * s[4] - s[3], ans + 2]), `Add the two numbers before: ${s[3]} + ${s[4]} = ${ans}.`); },
    alt2() { const k = rnd(1, 5), dFirst = Math.random() < .5, s = [rnd(1, 5)], f = [x => x * 2, x => x + k];
      for (let i = 1; i < 6; i++) s.push(f[(i - 1 + (dFirst ? 0 : 1)) % 2](s[i - 1]));
      const nx = f[(5 + (dFirst ? 0 : 1)) % 2], ot = f[(6 + (dFirst ? 0 : 1)) % 2], ans = nx(s[5]);
      return nums(s, ans, shuffle([ot(s[5]), ans + 1, ans - 1, ans + k]), `Two rules take turns: ${dFirst ? `double, then add ${k}` : `add ${k}, then double`}.`); },
    shapes() { const p = pick([2, 3]), pat = sample(SH, p), s = Array.from({ length: 6 }, (_, i) => ({ k: 's', s: pat[i % p] })), ans = { k: 's', s: pat[6 % p] };
      return { seq: s, ans, wrong: shuffle(SH.filter(x => x !== ans.s)).map(x => ({ k: 's', s: x })), rule: `The shapes repeat: ${names(pat)}.` }; },
    abb() { const [A, B] = sample(SH, 2), pat = Math.random() < .5 ? [A, A, B] : [A, B, B], s = Array.from({ length: 7 }, (_, i) => ({ k: 's', s: pat[i % 3] })), ans = { k: 's', s: pat[1] };
      return { seq: s, ans, wrong: [pat[1] === A ? B : A, ...shuffle(SH.filter(x => x !== A && x !== B))].map(x => ({ k: 's', s: x })), rule: `A group of three repeats: ${names(pat)}.` }; },
    colours() { const p = c4 ? pick([3, 4]) : pick([2, 3]), pat = sample([0, 1, 2, 3, 4, 5], p), len = p === 4 ? 8 : 6, s = Array.from({ length: len }, (_, i) => ({ k: 'c', c: pat[i % p] })), ans = { k: 'c', c: pat[len % p] };
      return { seq: s, ans, wrong: shuffle([0, 1, 2, 3, 4, 5].filter(x => x !== ans.c)).map(x => ({ k: 'c', c: x })), rule: `The colours repeat: ${names(pat.map(x => CL[x][0].toLowerCase()))}.` }; },
    arrows() { const st = (c4 ? 45 : 90) * pick([1, -1]), r0 = c4 ? rnd(0, 7) * 45 : rnd(0, 3) * 90, n = c4 ? 5 : 4, s = Array.from({ length: n }, (_, i) => ({ k: 'a', r: (r0 + i * st + 720) % 360 })), ans = { k: 'a', r: (r0 + n * st + 720) % 360 };
      return { seq: s, ans, wrong: shuffle([45, 90, 135, 180, 225, 270, 315].filter(d => c4 || d % 90 === 0)).map(d => ({ k: 'a', r: (ans.r + d) % 360 })), rule: `The arrow turns ${Math.abs(st)}° ${st > 0 ? 'clockwise' : 'anticlockwise'} each time.` }; },
    dots() { const k = c4 ? 2 : 1, n0 = rnd(1, c4 ? 2 : 3), s = [0, 1, 2, 3].map(i => ({ k: 'd', n: n0 + i * k })), a = n0 + 4 * k;
      return { seq: s, ans: { k: 'd', n: a }, wrong: shuffle([a - 1, a + 1, a + 2, a - 2].filter(v => v > 0 && v <= 12)).map(n => ({ k: 'd', n })), rule: `${k} more dot${k > 1 ? 's' : ''} each time.` }; },
    combo() { const sp = sample(SH, 3), cp = sample([0, 1, 2, 3, 4, 5], 2), s = Array.from({ length: 6 }, (_, i) => ({ k: 's', s: sp[i % 3], c: cp[i % 2] })), ans = { k: 's', s: sp[0], c: cp[0] };
      return { seq: s, ans, wrong: [{ k: 's', s: sp[0], c: cp[1] }, { k: 's', s: pick([sp[1], sp[2]]), c: cp[0] }, { k: 's', s: pick(SH.filter(x => x !== sp[0])), c: cp[1] }],
        rule: `Two patterns at once: shapes repeat every 3, colours every 2.` }; },
    arrowCol() { const st = pick([90, -90, 45, -45]), r0 = rnd(0, 7) * 45, cp = sample([0, 1, 2, 3, 4, 5], 2), s = Array.from({ length: 5 }, (_, i) => ({ k: 'a', r: (r0 + i * st + 720) % 360, c: cp[i % 2] })),
        ans = { k: 'a', r: (r0 + 5 * st + 720) % 360, c: cp[1] }, bad = (ans.r + pick([90, 180, 270])) % 360;
      return { seq: s, ans, wrong: [{ k: 'a', r: ans.r, c: cp[0] }, { k: 'a', r: bad, c: cp[1] }, { k: 'a', r: (ans.r + 180) % 360, c: cp[0] }],
        rule: `The arrow turns ${Math.abs(st)}° ${st > 0 ? 'clockwise' : 'anticlockwise'} and the colours take turns.` }; }
  };
  let c4 = false;   // (medium and hard use the longer colour cycles, 45° turns and +2 dots)
  const POOL = [['add', 'add', 'shapes', 'colours', 'arrows', 'dots'], ['double', 'sub', 'alt', 'arrows', 'dots', 'abb', 'colours'], ['squares', 'fib', 'alt2', 'combo', 'arrowCol', 'double', 'alt', 'fib']];
  const LV = [
    { name: 'Easy', desc: 'Add on, repeating shapes and colours, turning arrows.', t: 20 },
    { name: 'Medium', desc: 'Doubling, two-step rules, 45° turns, longer cycles.', t: 16 },
    { name: 'Hard', desc: 'Squares, Fibonacci, two rules at once.', t: 14 }
  ];
  function dotsSvg(n) {
    const cols = n <= 4 ? 2 : n <= 9 ? 3 : 4, rows = Math.ceil(n / cols), cell = 34 / Math.max(cols, rows), r = cell * .34; let o = '';
    for (let i = 0; i < n; i++) { const row = Math.floor(i / cols), inRow = row === rows - 1 ? n - row * cols : cols, col = i % cols;
      o += `<circle cx="${(20 - (inRow - 1) * cell / 2 + col * cell).toFixed(1)}" cy="${(20 - (rows - 1) * cell / 2 + row * cell).toFixed(1)}" r="${r.toFixed(1)}"/>`; }
    return `<g fill="#ffd23f">${o}</g>`;
  }
  function draw(o) {
    if (o.k === 'n') return h('span', { class: 'pp-n', text: String(o.v) });
    const col = o.c != null ? CL[o.c][1] : '#5ab0ff';
    const inner = o.k === 'a' ? `<path d="M20 3 34 19H25V37H15V19H6Z" fill="${col}" transform="rotate(${o.r} 20 20)"/>` : o.k === 'd' ? dotsSvg(o.n) : `<g fill="${col}">${SHAPE[o.k === 'c' ? 'circle' : o.s]}</g>`;
    const el = h('span', { class: 'pp-s' + (o.c != null ? ' lab' : ''), html: `<svg viewBox="0 0 40 40" aria-hidden="true">${inner}</svg>`, 'aria-label': o.k === 'd' ? o.n + ' dots' : o.k === 'a' ? 'arrow' : (o.c != null ? CL[o.c][0] + ' ' : '') + (o.s || 'circle') });
    if (o.c != null) el.append(h('small', { text: CL[o.c][0] }));
    return el;
  }
  function css() {
    if (document.getElementById('pp-css')) return;
    document.head.append(h('style', { id: 'pp-css', text: `
.pp-belt{width:min(100%,820px);padding:clamp(10px,2vw,18px) 8px;border-radius:20px;background:repeating-linear-gradient(90deg,var(--bg2) 0 22px,color-mix(in srgb,var(--bg2) 80%,#000) 22px 44px);border:1px solid var(--edge);animation:ppBelt 1.2s linear infinite}
.pp-row{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(5px,1.2vw,12px)}
.pp-t{width:clamp(42px,10.5vw,88px);aspect-ratio:1;border-radius:clamp(10px,2vw,16px);background:var(--panel2);border:2px solid var(--edge);display:grid;place-items:center;font:700 clamp(16px,3.6vw,32px) var(--display);animation:ppIn .45s cubic-bezier(.2,1.5,.4,1) both;box-shadow:0 6px 14px rgba(0,0,0,.3)}
.pp-t.q{border-style:dashed;border-color:var(--c);color:var(--c);animation:ppIn .45s cubic-bezier(.2,1.5,.4,1) both,ppQ 1.1s ease-in-out .6s infinite}
.pp-t.ok{border:2px solid var(--ok);background:color-mix(in srgb,var(--ok) 22%,var(--panel2));animation:ppPop .4s both}
.pp-t.bad{border:2px solid var(--gold);background:color-mix(in srgb,var(--gold) 16%,var(--panel2));animation:ppPop .4s both}
.pp-s{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;gap:1px}
.pp-s svg{width:74%;display:block}.pp-s.lab svg{width:58%}
.pp-s small{font:800 clamp(8px,1.4vw,11px) var(--body);color:var(--muted);text-transform:uppercase;letter-spacing:.03em;line-height:1}
.opt .pp-s{width:auto}.opt .pp-s svg{width:clamp(36px,6vw,54px)}.opt .pp-s small{font-size:11px;margin-top:2px}
.pp-info{min-height:2.6em;margin-top:10px;max-width:640px}.pp-info.ok{color:var(--ok)}.pp-info.no{color:var(--gold)}
.pp-area{width:100%;display:flex;justify-content:center}
@keyframes ppIn{from{opacity:0;transform:translateX(60px) scale(.7)}}
@keyframes ppQ{50%{transform:scale(1.08);box-shadow:0 0 22px color-mix(in srgb,var(--c) 45%,transparent)}}
@keyframes ppPop{0%{transform:scale(.6)}60%{transform:scale(1.15)}}
@keyframes ppBelt{to{background-position:44px 0}}` }));
  }
  Edu.game({
    id: 'pattern-pro', levels: LV.map(({ name, desc }) => ({ name, desc })),
    how: ['Look at the sequence and work out its rule.', 'Pick what goes in the blank: click, tap, or press 1 to 4.',
      'Each question has a clock. A streak earns more points but makes the clock shorter.', `A wrong answer or running out of time costs a life. Get ${GOAL} right to clear the level.`],
    start(c) {
      css(); c4 = c.level > 0;
      const base = LV[c.level].t, row = h('div', { class: 'pp-row' }), info = h('div', { class: 'sub pp-info' }), area = h('div', { class: 'pp-area' });
      c.el.append(h('div', { class: 'pp-belt' }, row), info, area);
      const S = c.S = { got: 0, last: null, rules: [], phase: 'wait' };
      c.lives(3); c.hud({ goal: '0 / ' + GOAL });
      const T = c.timer(base, () => { if (S.phase !== 'ask') return; T.paused = true; S.ch.lock(); wrongAns(-1, "Time's up!"); });
      function next() {
        if (!c.alive) return; c4 = c.level > 0; let g, q;
        do g = pick(POOL[c.level]); while (g === S.last); S.last = g;
        for (let i = 0; i < 40; i++) { q = G[g](); const seen = new Set([id(q.ans)]); q.wrong = q.wrong.filter(o => !seen.has(id(o)) && seen.add(id(o))); if (q.wrong.length >= 3) break; }
        q.opts = shuffle([q.ans, ...q.wrong.slice(0, 3)]); q.ai = q.opts.indexOf(q.ans); S.q = q;
        row.innerHTML = ''; q.seq.forEach((o, i) => row.append(h('div', { class: 'pp-t', style: { animationDelay: i * 60 + 'ms' } }, draw(o))));
        S.blank = h('div', { class: 'pp-t q', style: { animationDelay: q.seq.length * 60 + 'ms' } }, '?'); row.append(S.blank);
        info.className = 'sub pp-info'; info.textContent = 'What comes next?'; area.innerHTML = '';
        S.ch = c.choices(area, q.opts.map(draw), answer, { cols: 4 });
        S.phase = 'ask'; T.set(Math.max(base * .45, base - Math.min(c.streak, 10) * base * .05)); T.paused = false;
      }
      function where(b) { if (!b) return [c.el.clientWidth / 2, 60]; const r = b.getBoundingClientRect(), s = c.el.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top]; }
      function fill(cls) { S.blank.className = 'pp-t ' + cls; S.blank.style.animationDelay = '0ms'; S.blank.innerHTML = ''; S.blank.append(draw(S.q.ans)); }
      function answer(i, b) {
        if (S.phase !== 'ask') return; S.phase = 'wait'; T.paused = true; S.ch.lock();
        if (i !== S.q.ai) return wrongAns(i, null, b);
        S.ch.mark(i, true); fill('ok'); const [x, y] = where(b); c.right(10 + 5 * c.level + Math.round(T.left() / 2), x, y);
        S.got++; c.hud({ goal: S.got + ' / ' + GOAL }); if (!S.rules.includes(S.q.rule)) S.rules.push(S.q.rule);
        info.className = 'sub pp-info ok'; info.textContent = '✓ ' + S.q.rule;
        if (c.streak >= 3 && c.streak % 3 === 0) c.pop('⚡ Faster!', c.el.clientWidth / 2, 30, '#ffd23f');
        c.after(850, () => S.got >= GOAL ? c.end({ won: true, title: 'Pattern pro!', msg: `You found ${GOAL} rules.`, stats: { 'Patterns solved': S.got }, learnt: learnt() }) : next());
      }
      function wrongAns(i, why, b) {
        if (i >= 0) S.ch.mark(i, false); S.ch.mark(S.q.ai, true); fill('bad');
        const [x, y] = where(b); c.wrong(x, y, why || '✗'); const left = c.lose();
        info.className = 'sub pp-info no'; info.textContent = (why ? why + ' ' : '') + 'The rule: ' + S.q.rule;
        c.after(1800, () => left ? next() : c.end({ won: false, title: 'Out of lives', msg: `You solved ${S.got} of ${GOAL}. Read each rule and try again!`, stats: { 'Patterns solved': S.got }, learnt: learnt() }));
      }
      function learnt() { const r = S.rules.length ? S.rules : [S.q.rule]; return ['To find a rule, compare each item with the one before it.', ...r.slice(-3), 'Test your rule on every item before you choose.']; }
      next();
    },
    bot(c) { const S = c.S; if (S && S.phase === 'ask') S.ch.btns[S.q.ai].click(); },
    miss(c) { const S = c.S; if (S && S.phase === 'ask') S.ch.btns[(S.q.ai + 1) % 4].click(); }
  });
})();
