/* Sudoku Mini: random 4×4 (2×2 boxes) and 6×6 (2-row × 3-column boxes) puzzles, each checked by a solver to have
   exactly one solution. Wrong entries count as mistakes (three ends the game), hints fill a cell for a price,
   notes mode pencils in candidates. Solving the grid clears the level; time, mistakes and hints set the bonus. */
(() => {
  const { h, shuffle, sfx } = Edu;
  const LV = [
    { name: 'Easy', desc: '4×4 grid with 2×2 boxes. Digits 1 to 4.', n: 4, bw: 2, bh: 2, givens: 7, hints: 2, par: 150 },
    { name: 'Medium', desc: '6×6 grid with 2×3 boxes and plenty of clues.', n: 6, bw: 3, bh: 2, givens: 18, hints: 3, par: 330 },
    { name: 'Hard', desc: '6×6 grid with far fewer clues.', n: 6, bw: 3, bh: 2, givens: 12, hints: 3, par: 480 }
  ];
  const box = (L, i) => Math.floor(Math.floor(i / L.n) / L.bh) * (L.n / L.bw) + Math.floor((i % L.n) / L.bw);
  function peers(L) { const n = L.n, P = []; for (let i = 0; i < n * n; i++) { P[i] = []; for (let j = 0; j < n * n; j++) if (j !== i && (Math.floor(j / n) === Math.floor(i / n) || j % n === i % n || box(L, j) === box(L, i))) P[i].push(j); } return P; }
  // count solutions (stops at lim); fills g in place when rand is set (to make a full grid)
  function solve(g, L, P, lim, rand) {
    let best = -1, bc = null;
    for (let i = 0; i < g.length; i++) if (!g[i]) { const c = []; for (let d = 1; d <= L.n; d++) if (!P[i].some(j => g[j] === d)) c.push(d); if (!c.length) return 0; if (!bc || c.length < bc.length) { best = i; bc = c; } }
    if (best < 0) return 1;
    let cnt = 0;
    for (const d of rand ? shuffle(bc) : bc) { g[best] = d; cnt += solve(g, L, P, lim - cnt, rand); if (rand && cnt) return cnt; if (cnt >= lim) break; }
    g[best] = 0; return cnt;
  }
  function make(L) {
    const P = peers(L), sol = Array(L.n * L.n).fill(0); solve(sol, L, P, 1, true);
    let best = null;
    for (let t = 0; t < 6; t++) {
      const g = sol.slice(); let left = g.length;
      for (const i of shuffle([...g.keys()])) { if (left <= L.givens) break; const v = g[i]; g[i] = 0; if (solve(g.slice(), L, P, 2) === 1) left--; else g[i] = v; }
      if (!best || left < best.left) best = { g, left }; if (left <= L.givens) break;
    }
    return { sol, puz: best.g, P };
  }
  function css() {
    if (document.getElementById('sd-css')) return;
    document.head.append(h('style', { id: 'sd-css', text: `
.sd{display:flex;flex-direction:column;align-items:center;gap:12px;width:100%}
.sd-g{display:grid;gap:clamp(4px,1vw,7px);width:min(100%,430px,calc(100dvh - 380px));min-width:250px;aspect-ratio:1;padding:clamp(5px,1vw,8px);border-radius:18px;background:color-mix(in srgb,var(--c) 30%,var(--edge));box-shadow:0 14px 40px rgba(0,0,0,.4)}
.sd-b{display:grid;gap:2px;border-radius:10px;overflow:hidden;background:var(--edge)}
.sd-c{position:relative;min-width:0;min-height:0;background:var(--bg2);display:grid;place-items:center;font:700 clamp(20px,5.2vw,34px) var(--display);color:var(--c);transition:background .12s}
.sd-c.giv{color:#fff;background:var(--panel)}
.sd-c.hl{background:color-mix(in srgb,var(--c) 12%,var(--bg2))}.sd-c.giv.hl{background:color-mix(in srgb,var(--c) 12%,var(--panel))}
.sd-c.same{background:color-mix(in srgb,var(--c) 32%,var(--bg2));color:#fff}
.sd-c.sel{background:color-mix(in srgb,var(--c) 45%,var(--bg2));box-shadow:0 0 0 3px var(--c) inset;color:#fff}
.sd-c.put{animation:sdPop .35s cubic-bezier(.2,1.6,.4,1)}
.sd-c.bad{color:#fff;background:var(--no)!important;animation:shake .3s}
.sd-c.hint{color:var(--c2)}
.sd-c.done{animation:sdDone .6s ease both}
.sd-c .nt{position:absolute;inset:2px;display:grid;grid-template-columns:repeat(3,1fr);font:700 clamp(8px,1.8vw,12px) var(--body);color:var(--muted);place-items:center;line-height:1}
.sd-pad{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;width:min(100%,520px)}
.sd-pad button{min-width:48px;min-height:50px;flex:1 1 48px;border-radius:14px;background:var(--panel2);border:1px solid var(--edge);font:700 22px var(--display);transition:transform .1s,background .15s}
.sd-pad button:active{transform:scale(.94)}.sd-pad button:hover{border-color:var(--c)}
.sd-pad button.used{opacity:.35}
.sd-pad.tools button{font:800 15px var(--body);flex:1 1 90px}
.sd-pad button.on{background:var(--c);color:#07090e}
@keyframes sdPop{0%{transform:scale(.4)}}
@keyframes sdDone{40%{background:color-mix(in srgb,var(--c2) 55%,var(--bg2));color:#07090e;transform:scale(1.06)}}` }));
  }
  Edu.game({
    id: 'sudoku-mini', levels: LV.map(({ name, desc }) => ({ name, desc })),
    how: ['Fill the grid so every row, every column and every box has each digit exactly once.',
      'Pick a cell (click, tap or arrow keys), then a digit (the number keys or the pad).',
      'A wrong digit is a mistake; three mistakes end the game.',
      'Notes (N) pencil in the digits a cell might be. Hint (H) fills a cell, but costs points.'],
    start(c) {
      css();
      const L = LV[c.level], n = L.n, { sol, puz, P } = make(L);
      const S = c.S = { L, sol, val: puz.slice(), giv: puz.map(v => !!v), notes: puz.map(() => new Set()), sel: puz.findIndex(v => !v), mist: 0, hints: L.hints, used: 0, notesOn: false, t0: performance.now(), busy: false };
      const grid = h('div', { class: 'sd-g', style: { gridTemplateColumns: `repeat(${n / L.bw},1fr)`, gridTemplateRows: `repeat(${n / L.bh},1fr)` } });
      const boxes = Array.from({ length: n }, () => h('div', { class: 'sd-b', style: { gridTemplateColumns: `repeat(${L.bw},1fr)`, gridTemplateRows: `repeat(${L.bh},1fr)` } }));
      S.cells = puz.map((_, i) => { const b = h('button', { class: 'sd-c', type: 'button', onclick: () => select(i) }); boxes[box(L, i)].append(b); return b; });
      grid.append(...boxes);
      S.digits = Array.from({ length: n }, (_, d) => h('button', { type: 'button', text: String(d + 1), 'aria-label': 'Digit ' + (d + 1), onclick: () => enter(d + 1) }));
      S.noteBtn = h('button', { type: 'button', onclick: () => toggleNotes() }, '✏️ Notes');
      S.hintBtn = h('button', { type: 'button', onclick: () => hint() });
      const erase = h('button', { type: 'button', onclick: () => clearNotes() }, '⌫ Erase');
      c.el.append(h('div', { class: 'sd' }, grid, h('div', { class: 'sd-pad' }, S.digits), h('div', { class: 'sd-pad tools' }, S.noteBtn, erase, S.hintBtn)));
      const secs = () => Math.floor((performance.now() - S.t0) / 1000 * Edu.SPEED), fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      const hud = () => c.hud({ mistakes: S.mist + ' / 3', time: fmt(secs()) });
      hud(); c.every(1000, hud);
      function at(i) { const r = S.cells[i].getBoundingClientRect(), s = c.el.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top]; }
      function draw() {
        const s = S.sel, sv = s >= 0 ? S.val[s] : 0;
        S.cells.forEach((b, i) => {
          const v = S.val[i]; b.classList.toggle('giv', S.giv[i]);
          b.classList.toggle('hl', s >= 0 && i !== s && P[s].includes(i)); b.classList.toggle('same', !!sv && i !== s && v === sv); b.classList.toggle('sel', i === s);
          if (b.classList.contains('bad')) return;
          if (v) { b.textContent = String(v); b.setAttribute('aria-label', 'Cell ' + (i + 1) + ': ' + v); }
          else { b.textContent = ''; b.setAttribute('aria-label', 'Cell ' + (i + 1) + ': empty'); if (S.notes[i].size) { const nt = h('div', { class: 'nt' }); for (let d = 1; d <= n; d++) nt.append(h('span', { text: S.notes[i].has(d) ? String(d) : '' })); b.append(nt); } }
        });
        S.digits.forEach((b, d) => b.classList.toggle('used', S.val.filter(v => v === d + 1).length === n));
        S.noteBtn.classList.toggle('on', S.notesOn); S.hintBtn.textContent = '💡 Hint (' + S.hints + ')'; S.hintBtn.disabled = !S.hints;
      }
      function select(i) { S.sel = i; sfx.click(); draw(); }
      function toggleNotes() { S.notesOn = !S.notesOn; sfx.click(); draw(); }
      function clearNotes() { const i = S.sel; if (i >= 0 && !S.val[i]) { S.notes[i].clear(); sfx.click(); draw(); } }
      function place(i, d, how) {
        S.val[i] = d; S.notes[i].clear(); for (const j of P[i]) S.notes[j].delete(d);
        const b = S.cells[i]; b.classList.remove('put'); void b.offsetWidth; b.classList.add('put'); if (how === 'hint') b.classList.add('hint');
        draw();
        const units = [r => Math.floor(r / n) === Math.floor(i / n), r => r % n === i % n, r => box(L, r) === box(L, i)];
        let k = 0; for (const u of units) { const cs = S.val.map((_, r) => r).filter(u); if (cs.every(r => S.val[r])) { k++; cs.forEach((r, q) => { const e = S.cells[r]; e.classList.remove('done'); void e.offsetWidth; e.style.animationDelay = q * 45 + 'ms'; e.classList.add('done'); }); } }
        if (k && how !== 'hint') { const [x, y] = at(i); c.add(10 * k, x, y - 26, '#ffd23f'); sfx.pop(); }
        if (S.val.every(v => v)) win();
      }
      function enter(d) {
        const i = S.sel; if (i < 0 || S.giv[i] || S.val[i] || S.busy || !c.alive) return;
        if (S.notesOn) { S.notes[i].has(d) ? S.notes[i].delete(d) : S.notes[i].add(d); sfx.click(); return draw(); }
        const [x, y] = at(i);
        if (S.sol[i] === d) { c.right(10, x, y); place(i, d); return; }
        S.mist++; hud(); const b = S.cells[i]; b.textContent = String(d); b.classList.add('bad'); S.busy = true;
        const clash = P[i].find(j => S.val[j] === d);
        c.wrong(x, y, clash != null ? d + ' is already in this ' + (Math.floor(clash / n) === Math.floor(i / n) ? 'row' : clash % n === i % n ? 'column' : 'box') : 'Not ' + d);
        if (S.mist >= 3) return c.after(700, () => c.end({ won: false, title: 'Three mistakes', msg: 'Before you place a digit, check its row, its column and its box.', stats: stats(), learnt: learnt() }));
        c.after(650, () => { b.classList.remove('bad'); S.busy = false; draw(); });
      }
      function hint() {
        if (!S.hints || S.busy) return; let i = S.sel;
        if (i < 0 || S.val[i]) i = S.val.findIndex(v => !v); if (i < 0) return;
        S.hints--; S.used++; S.sel = i; const [x, y] = at(i); c.add(-15, x, y); sfx.pop(); place(i, S.sol[i], 'hint');
      }
      function stats() { return { Time: fmt(secs()), Mistakes: S.mist, 'Hints used': S.used }; }
      function learnt() { return ['Every row, column and box holds each digit exactly once.', 'If a cell has only one digit left that fits, that digit must go there.', 'If a digit fits in only one cell of a row, column or box, it goes there.', 'Notes help you keep track of the digits a cell could still be.']; }
      function win() {
        S.busy = true; const tb = Math.max(0, L.par - secs()), bonus = Math.round(tb / 2) + (3 - S.mist) * 20;
        c.add(bonus, c.el.clientWidth / 2, 40, '#ffd23f');
        c.after(750, () => c.end({ won: true, title: 'Solved!', msg: S.mist ? 'Solved with ' + S.mist + ' mistake' + (S.mist > 1 ? 's' : '') + '.' : 'A perfect solve: no mistakes!', stats: stats(), learnt: learnt() }));
      }
      c.key(e => {
        const k = e.key; if (/^[1-9]$/.test(k) && +k <= n) { e.preventDefault(); return enter(+k); }
        const mv = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[k];
        if (mv) { e.preventDefault(); const i = S.sel < 0 ? 0 : S.sel, r = (Math.floor(i / n) + mv[0] + n) % n, q = (i % n + mv[1] + n) % n; select(r * n + q); }
        else if (k === 'n' || k === 'N') toggleNotes(); else if (k === 'h' || k === 'H') hint();
        else if (k === 'Backspace' || k === 'Delete' || k === '0') { e.preventDefault(); clearNotes(); }
      });
      draw();
    },
    bot(c) {
      const S = c.S; if (!S || S.busy) return; const i = S.val.findIndex(v => !v); if (i < 0) return;
      S.cells[i].click(); if (S.notesOn) S.noteBtn.click(); S.digits[S.sol[i] - 1].click();
    },
    miss(c) {
      const S = c.S; if (!S || S.busy) return; const i = S.val.findIndex(v => !v); if (i < 0) return;
      S.cells[i].click(); if (S.notesOn) S.noteBtn.click(); S.digits[S.sol[i] % S.L.n].click();
    }
  });
})();
