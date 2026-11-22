/* Math Rush: arithmetic against the clock. Four answers to pick from; right answers add time and build a streak,
   wrong ones cost time. 15 right in one run clears the level. */
(() => {
  const { h, rnd, pick, shuffle, near } = Edu, GOAL = 15;
  const LV = [
    { name: 'Easy', desc: 'Add and subtract up to 20. Sixty seconds.', ops: ['+', '−'] },
    { name: 'Medium', desc: 'All four operations, times tables up to 10.', ops: ['+', '−', '×', '÷'] },
    { name: 'Hard', desc: 'Bigger numbers, tables to 12, two-digit times one-digit.', ops: ['+', '−', '×', '÷', '×'] }
  ];
  function problem(lv) {
    const op = pick(LV[lv].ops); let a, b, ans;
    if (op === '+') { if (lv === 0) { a = rnd(0, 10); b = rnd(0, 10); } else if (lv === 1) { a = rnd(5, 50); b = rnd(2, 49); } else { a = rnd(25, 250); b = rnd(15, 199); } ans = a + b; }
    else if (op === '−') { if (lv === 0) { a = rnd(2, 20); b = rnd(0, a); } else if (lv === 1) { a = rnd(10, 60); b = rnd(2, a); } else { a = rnd(60, 300); b = rnd(15, a - 5); } ans = a - b; }
    else if (op === '×') { if (lv === 1) { a = rnd(2, 10); b = rnd(2, 10); } else if (Math.random() < .5) { a = rnd(3, 12); b = rnd(3, 12); } else { a = rnd(11, 29); b = rnd(3, 9); } ans = a * b; }
    else { b = lv === 1 ? rnd(2, 10) : rnd(3, 12); ans = lv === 1 ? rnd(1, 10) : rnd(2, 12); a = b * ans; }   // division always comes out exact
    const spread = op === '×' ? Math.max(4, Math.round(ans * .15)) : Math.max(3, Math.round(ans * .12));
    let wrong = near(ans, 3, spread, v => v >= 0);
    if (op === '×' && Math.random() < .5) { const alt = (a + (Math.random() < .5 ? 1 : -1)) * b; if (alt !== ans && alt >= 0 && !wrong.includes(alt)) wrong[0] = alt; }   // a classic slip: one table row off
    return { text: `${a} ${op} ${b}`, ans, opts: shuffle([ans, ...wrong]) };
  }
  Edu.game({
    id: 'math-rush', levels: LV,
    how: ['Pick the right answer to each problem: click it, tap it, or press 1, 2, 3 or 4.', 'Every right answer adds a second to the clock. A wrong one takes three seconds away.',
      'Three right in a row starts a streak, and each streak step is worth more points.', `Get ${GOAL} right in one run to clear the level.`],
    start(c) {
      const track = h('div', { style: { width: 'min(100%,720px)', height: '34px', position: 'relative', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--edge)', marginBottom: '8px' } }),
        runner = h('div', { text: '🏃', style: { position: 'absolute', top: '1px', left: '0', fontSize: '26px', transition: 'left .35s cubic-bezier(.3,1.4,.5,1)', transform: 'scaleX(-1)' } }),
        flag = h('div', { text: '🏁', style: { position: 'absolute', top: '2px', right: '6px', fontSize: '24px' } });
      track.append(flag, runner);
      const qEl = h('div', { class: 'q' }), hint = h('div', { class: 'sub' }), area = h('div', { style: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' } });
      c.el.append(track, qEl, hint, area);
      c.got = 0;
      const T = c.timer(60, () => c.end({ won: c.got >= GOAL, title: c.got >= GOAL ? 'Level cleared!' : "Time's up!", msg: c.got >= GOAL ? 'You beat the clock.' : `Get ${GOAL} right in one run to clear the level.`, stats: { 'Answered right': c.got } }));
      c.hud({ goal: c.got + ' / ' + GOAL });
      const next = () => {
        const p = c.p = problem(c.level); qEl.textContent = p.text + ' = ?'; qEl.style.animation = 'none'; void qEl.offsetWidth; qEl.style.animation = '';
        hint.textContent = ''; area.innerHTML = '';
        c.ch = c.choices(area, p.opts, (i, b) => {
          c.ch.lock(); const r = b.getBoundingClientRect(), s = c.el.getBoundingClientRect(), x = r.left - s.left + r.width / 2, y = r.top - s.top;
          if (p.opts[i] === p.ans) { c.ch.mark(i, true); c.right(10 + c.level * 5, x, y); T.add(1); c.got++;
            runner.style.left = `calc(${Math.min(1, c.got / GOAL) * 100}% - ${Math.min(1, c.got / GOAL) * 40}px)`; c.hud({ goal: c.got + ' / ' + GOAL });
            if (c.got === GOAL) { c.pop('LEVEL CLEARED! Keep going!', null, null, '#ffd23f'); Edu.sfx.win(); }
            c.after(280, next); }
          else { c.ch.mark(i, false); c.ch.mark(p.opts.indexOf(p.ans), true); c.wrong(x, y, '−3s'); T.add(-3); hint.textContent = `${p.text} = ${p.ans}`; c.after(900, next); }
        }, { cols: 4 });
      };
      next();
    },
    bot(c) { if (c.p && c.ch && !c.ch.el.classList.contains('locked')) c.ch.btns[c.p.opts.indexOf(c.p.ans)].click(); },
    miss(c) { if (c.p && c.ch && !c.ch.el.classList.contains('locked')) c.ch.btns[c.p.opts.findIndex(v => v !== c.p.ans)].click(); }
  });
})();
