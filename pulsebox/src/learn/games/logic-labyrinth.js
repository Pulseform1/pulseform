/* Logic Labyrinth: generated grid mazes (always solvable: a search over position + switch states checks every one).
   Switches A, B, C flip when you step on them; gates open only while their condition (A AND B, A OR C, NOT B ...) is
   true; keys open doors; pattern locks ask for the next number in a sequence. Each maze has a par (the fewest moves)
   and a clock; running out of time or a wrong lock answer costs a life. Three mazes clear the level. */
(() => {
  const { h, rnd, pick, shuffle, sfx } = Edu, MAZES = 3;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], ARW = ['▲', '▶', '▼', '◀'];
  const KEYS = { ArrowUp: 0, w: 0, W: 0, ArrowRight: 1, d: 1, D: 1, ArrowDown: 2, s: 2, S: 2, ArrowLeft: 3, a: 3, A: 3 };
  const LV = [
    { name: 'Easy', desc: 'Keys, doors and simple switch gates. 7×7 mazes.', W: 7 },
    { name: 'Medium', desc: 'AND and OR gates. 9×9 mazes.', W: 9 },
    { name: 'Hard', desc: 'NOT, combined gates and pattern locks. 11×11 mazes.', W: 11 }
  ];
  // what each maze holds: switches, gate conditions (& AND, | OR, ! NOT), keys, pattern locks
  const TPL = [
    [{ sw: 0, g: [], k: 1 }, { sw: 1, g: ['A'] }, { sw: 2, g: ['A', 'B'], k: 1 }],
    [{ sw: 2, g: ['A&B'] }, { sw: 3, g: ['A|B', 'B&C'] }, { sw: 3, g: ['A&B', 'A|C'], k: 1 }],
    [{ sw: 2, g: ['A|B', 'A&!B'], lock: 1 }, { sw: 3, g: ['A&B', '!A|C'], lock: 1 }, { sw: 3, g: ['(A|B)&!C', 'A&C'], lock: 1 }]
  ];
  function parse(s) {
    let i = 0;
    const E = () => { let a = Tm(); while (s[i] === '|') { i++; a = { op: 'or', a, b: Tm() }; } return a; },
      Tm = () => { let a = Fc(); while (s[i] === '&') { i++; a = { op: 'and', a, b: Fc() }; } return a; },
      Fc = () => { const ch = s[i++]; if (ch === '!') return { op: 'not', a: Fc() }; if (ch === '(') { const e = E(); i++; return e; } return { v: ch.charCodeAt(0) - 65 }; };
    return E();
  }
  const ev = (e, b) => e.op === 'or' ? ev(e.a, b) || ev(e.b, b) : e.op === 'and' ? ev(e.a, b) && ev(e.b, b) : e.op === 'not' ? !ev(e.a, b) : !!(b >> e.v & 1);
  const txt = (e, top = true) => { if (e.v != null) return 'ABC'[e.v]; const t = e.op === 'not' ? 'NOT ' + txt(e.a, false) : txt(e.a, false) + (e.op === 'and' ? ' AND ' : ' OR ') + txt(e.b, false); return top ? t : '(' + t + ')'; };
  const vars = e => e.v != null ? [e.v] : [...vars(e.a), ...(e.b ? vars(e.b) : [])], pos = (e, n) => e.v != null ? (n ? [] : [e.v]) : e.op === 'not' ? pos(e.a, !n) : [...pos(e.a, n), ...pos(e.b, n)];
  function carve(W) {
    const op = new Array(W * W).fill(0), seen = new Uint8Array(W * W), st = [rnd(0, W * W - 1)]; seen[st[0]] = 1;
    while (st.length) {
      const c = st[st.length - 1], x = c % W, y = (c / W) | 0, nb = [];
      for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx >= 0 && ny >= 0 && nx < W && ny < W && !seen[ny * W + nx]) nb.push(d); }
      if (!nb.length) { st.pop(); continue; }
      const d = pick(nb), n = (y + DY[d]) * W + x + DX[d]; op[c] |= 1 << d; op[n] |= 1 << ((d + 2) % 4); seen[n] = 1; st.push(n);
    }
    return op;
  }
  const step = (M, i, d) => M.op[i] >> d & 1 ? i + DX[d] + DY[d] * M.W : -1;
  function pass(M, t, b, plan) { const o = M.O[t]; if (!o) return true; if (o.t === 'gate') return ev(o.c, b & 7); if (o.t === 'door') return !!(b >> (3 + o.k) & 1); if (o.t === 'lock') return o.open || plan; return true; }
  function enter(M, t, b) { const o = M.O[t]; return !o ? b : o.t === 'sw' ? b ^ (1 << o.v) : o.t === 'key' ? b | (1 << (3 + o.k)) : b; }
  // shortest route from (cell, switch/key bits) to the exit; returns { dist, dir } (dir: the first step)
  function plan(M, from, bits, frozen) {
    const seen = new Map([[from * 32 + bits, 0]]), q = [[from, bits, -1]];
    for (let qi = 0; qi < q.length; qi++) {
      const [c, b, f] = q[qi], d0 = seen.get(c * 32 + b); if (c === M.e) return { dist: d0, dir: f };
      for (let d = 0; d < 4; d++) { const t = step(M, c, d); if (t < 0 || !pass(M, t, b, true)) continue; const nb = frozen ? b : enter(M, t, b), k = t * 32 + nb; if (seen.has(k)) continue; seen.set(k, d0 + 1); q.push([t, nb, f < 0 ? d : f]); }
    }
    return null;
  }
  function reach(M, blocked) { const R = new Set([M.s]), q = [M.s]; while (q.length) { const c = q.pop(); for (let d = 0; d < 4; d++) { const t = step(M, c, d); if (t >= 0 && !R.has(t) && !blocked.has(t)) { R.add(t); q.push(t); } } } return R; }
  function build(lv, tpl) {
    const W = LV[lv].W, gates = tpl.g.map(parse), nb = gates.length + (tpl.k || 0) + (tpl.lock || 0);
    for (let tries = 0; tries < 300; tries++) {
      const M = { W, op: carve(W), O: {} }, cor = [0, W - 1, W * W - W, W * W - 1], k = rnd(0, 3); M.s = cor[k]; M.e = cor[3 - k];
      const par = new Map([[M.s, -1]]), q = [M.s]; while (q.length) { const c = q.shift(); for (let d = 0; d < 4; d++) { const t = step(M, c, d); if (t >= 0 && !par.has(t)) { par.set(t, c); q.push(t); } } }
      const path = []; for (let c = M.e; c !== -1; c = par.get(c)) path.unshift(c);
      if (path.length < nb * 4 + 5) continue;
      const onPath = new Set(path), items = shuffle([...gates.map(c => ({ t: 'gate', c })), ...(tpl.k ? [{ t: 'door', k: 0 }] : []), ...(tpl.lock ? [{ t: 'lock' }] : [])]);
      let last = 1; const cells = items.map((o, j) => { const ix = Math.max(last + 2, Math.min(path.length - 2, Math.round((j + 1) * (path.length - 1) / (nb + 1)) + rnd(-1, 1))); last = ix; return path[ix]; });
      if (last > path.length - 2) continue;
      let gid = 0; items.forEach((o, j) => { M.O[cells[j]] = o; if (o.t === 'gate') o.id = ++gid; });
      const R = items.map((_, j) => reach(M, new Set(cells.slice(j)))), used = new Set([M.s, M.e, ...cells]), deg = i => [0, 1, 2, 3].filter(d => M.op[i] >> d & 1).length;
      const spot = (j, onRoute) => {
        const all = [...R[j]].filter(c => !used.has(c)), fresh = all.filter(c => !j || !R[j - 1].has(c));
        const pools = onRoute ? [all.filter(c => onPath.has(c))] : [fresh.filter(c => deg(c) === 1), all.filter(c => deg(c) === 1), fresh.filter(c => !onPath.has(c)), all.filter(c => !onPath.has(c)), all];
        for (const p of pools) if (p.length) { const c = pick(p); used.add(c); return c; } return -1;
      };
      let ok = true;
      for (let v = 0; v < tpl.sw && ok; v++) { let j = items.findIndex(o => o.t === 'gate' && pos(o.c).includes(v)); if (j < 0) j = items.findIndex(o => o.t === 'gate' && vars(o.c).includes(v)); const c = spot(Math.max(0, j), lv === 2 && Math.random() < .3); if (c < 0) ok = false; else M.O[c] = { t: 'sw', v }; }
      items.forEach((o, j) => { if (ok && o.t === 'door') { const c = spot(j); if (c < 0) ok = false; else M.O[c] = { t: 'key', k: o.k }; } });
      if (!ok) continue;
      const best = plan(M, M.s, 0); if (!best || best.dist > [50, 80, 110][lv] || plan(M, M.s, 0, true)) continue;
      M.par = best.dist; return M;
    }
    return null;
  }
  function seqQ() {
    const t = rnd(0, 2); let s, ans, rule;
    if (t === 0) { const k = rnd(2, 9), a = rnd(1, 20); s = [0, 1, 2, 3].map(i => a + i * k); ans = a + 4 * k; rule = 'Add ' + k + ' each time.'; }
    else if (t === 1) { const k = rnd(2, 8), a = rnd(4 * k + 1, 4 * k + 25); s = [0, 1, 2, 3].map(i => a - i * k); ans = a - 4 * k; rule = 'Take away ' + k + ' each time.'; }
    else { const a = rnd(1, 6); s = [a, 2 * a, 4 * a, 8 * a]; ans = 16 * a; rule = 'Double each time.'; }
    const w = shuffle([...new Set([ans + 1, ans - 1, ans + 2, s[3], t === 2 ? 12 * s[0] : ans - 2])].filter(v => v !== ans && v >= 0)).slice(0, 3);
    const opts = shuffle([ans, ...w]); return { s, ans, opts, ai: opts.indexOf(ans), rule };
  }
  function css() {
    if (document.getElementById('ll-css')) return;
    document.head.append(h('style', { id: 'll-css', text: `
.ll{display:grid;justify-items:center;align-content:safe center;gap:8px;width:100%;max-height:100%;overflow-y:auto;overflow-x:hidden;padding:2px}
.ll-info{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;width:100%}
.ll-c{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:12px;background:var(--panel2);border:2px solid var(--edge);font:700 14px var(--display);white-space:nowrap;transition:border-color .2s,background .2s}
.ll-c b{font:800 11px var(--body);letter-spacing:.06em}
.ll-c.on{border-color:#3ddc84;background:color-mix(in srgb,#3ddc84 18%,var(--panel2))}.ll-c.on b{color:#3ddc84}
.ll-c.off b{color:var(--muted)}
.ll-c.g i{font-style:normal;display:grid;place-items:center;width:20px;height:20px;border-radius:6px;background:#ff4d5e;color:#fff;font-size:12px}
.ll-c.g.open i{background:#3ddc84;color:#07090e}.ll-c.g.shut{border-color:color-mix(in srgb,#ff4d5e 50%,var(--edge))}.ll-c.g.open{border-color:#3ddc84}
.ll-c.flip{animation:llFlip .4s}
.ll-msg{min-height:2.5em;max-width:520px;text-align:center;font:700 clamp(13px,2vw,16px) var(--body);display:flex;align-items:center;justify-content:center}
.ll-msg.bad{color:var(--no)}.ll-msg.good{color:var(--ok)}
.ll-mz{position:relative;width:min(100%,520px,calc(100dvh - 440px));min-width:240px;aspect-ratio:1;touch-action:none;border-radius:16px;background:var(--bg2);border:1px solid var(--edge);box-shadow:0 14px 40px rgba(0,0,0,.4)}
.ll-mz svg{width:100%;height:100%;display:block}
.ll-tok{transition:transform .13s ease-out}.ll-tok .in.bump{animation:llBump .25s}
.ll-exit{animation:llPulse 1.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.ll-pad{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.ll-pad button{min-width:54px;min-height:48px;border-radius:14px;background:var(--panel2);border:1px solid var(--edge);font:700 20px var(--display);transition:transform .1s}
.ll-pad button:active{transform:scale(.92);background:var(--c);color:#07090e}
.ll-pad button.rs{font:800 14px var(--body);padding:0 10px}
.ll-q{position:absolute;inset:0;display:grid;place-items:center;padding:10px;border-radius:16px;background:rgba(5,7,11,.8);backdrop-filter:blur(3px);animation:fade .2s both;z-index:4}
.ll-q>div{width:100%;max-width:420px;text-align:center}
.ll-q .sq{font:700 clamp(22px,5vw,32px) var(--display);margin:6px 0;color:var(--gold)}
.ll-q .opts{margin-top:8px;width:100%}.ll-q .opt{min-height:52px}
@media (min-width:820px){.ll{grid-template-columns:auto minmax(260px,320px);grid-template-areas:"mz info" "mz msg" "mz pad";column-gap:22px;align-items:center}
.ll-mz{grid-area:mz;width:min(56vw,580px,calc(100dvh - 250px))}.ll-info{grid-area:info;align-self:end}.ll-msg{grid-area:msg}.ll-pad{grid-area:pad;align-self:start;display:grid;grid-template-columns:repeat(3,58px);grid-template-areas:". u ." "l rs r" ". dn ."}
.ll-pad .d0{grid-area:u}.ll-pad .d1{grid-area:r}.ll-pad .d2{grid-area:dn}.ll-pad .d3{grid-area:l}.ll-pad .rs{grid-area:rs;font-size:20px;padding:0}.ll-pad .rs span{display:none}}
@keyframes llBump{30%{transform:translate(1.2px,0)}60%{transform:translate(-1.2px,0)}}
@keyframes llPulse{50%{transform:scale(1.18);opacity:.75}}
@keyframes llFlip{40%{transform:scale(1.18)}}` }));
  }
  Edu.game({
    id: 'logic-labyrinth', levels: LV.map(({ name, desc }) => ({ name, desc })),
    how: ['Reach the 🏁 exit. Move with the arrow keys or WASD, swipe or tap the maze, or use the arrow buttons.',
      'Step on a switch (A, B, C) to flip it ON or OFF. The chips above show every switch.',
      'A gate opens only while its rule is true: AND needs both, OR needs at least one, NOT needs it OFF.',
      'Pick up 🔑 to open doors. A ? lock asks what comes next in a number pattern.',
      'Beat the par (fewest moves) for three stars. Running out of time or a wrong lock answer costs a life.'],
    start(c) {
      css();
      const lv = c.level, info = h('div', { class: 'll-info' }), msg = h('div', { class: 'll-msg' }), mz = h('div', { class: 'll-mz' });
      const pad = h('div', { class: 'll-pad' }), dbtn = [0, 1, 2, 3].map(d => h('button', { type: 'button', class: 'd' + d, 'aria-label': ['Up', 'Right', 'Down', 'Left'][d], onclick: () => move(d) }, ARW[d]));
      const rsb = h('button', { type: 'button', class: 'rs', title: 'Reset this maze (Backspace)', onclick: () => resetMaze(true) }, '↺', h('span', { text: ' Reset' }));
      pad.append(dbtn[3], dbtn[0], dbtn[2], dbtn[1], rsb);
      c.el.append(h('div', { class: 'll' }, info, mz, msg, pad));
      const G = c.G = { m: 0, busy: true, q: null, moves: 0, total: 0, parTotal: 0, stars: 0, dbtn, rsb };
      c.lives(3);
      const T = c.timer(60, () => { if (G.busy || G.q) return; T.paused = true; G.busy = true; c.wrong(); const left = c.lose(); say("Out of time!" + (left ? ' The maze starts again.' : ''), 'bad'); c.after(900, () => left ? (G.busy = false, resetMaze(false), T.set(G.time), T.paused = false) : over()); });
      const say = (t, cls) => { msg.textContent = t; msg.className = 'll-msg' + (cls ? ' ' + cls : ''); };
      const xy = i => [(i % G.M.W) * 10 + 5, Math.floor(i / G.M.W) * 10 + 5];
      function loadMaze() {
        const tpl = TPL[lv][G.m]; let M = null; for (let i = 0; !M && i < 30; i++) M = build(lv, tpl); if (!M) M = build(0, TPL[0][0]);
        G.M = M; G.time = Math.round(25 + M.par * 1.3 + (tpl.lock ? 12 : 0)); G.gates = Object.keys(M.O).map(Number).filter(i => M.O[i].t === 'gate').sort((a, b) => M.O[a].id - M.O[b].id);
        G.sws = Array.from({ length: tpl.sw }, (_, v) => v); G.hasKey = !!tpl.k;
        const W = M.W; let walls = '';
        for (let i = 0; i < W * W; i++) { const x = (i % W) * 10, y = Math.floor(i / W) * 10; if (!(M.op[i] & 1)) walls += `M${x} ${y}h10`; if (!(M.op[i] & 8)) walls += `M${x} ${y}v10`; }
        walls += `M0 ${W * 10}H${W * 10}V0`;
        mz.innerHTML = `<svg viewBox="-1.5 -1.5 ${W * 10 + 3} ${W * 10 + 3}" aria-label="Maze"><g class="objs"></g><path d="${walls}" stroke="color-mix(in srgb,#29e0ff 70%,#fff)" stroke-width="1.05" stroke-linecap="round" fill="none" opacity=".85"/><g class="ll-tok"><g class="in"><circle r="3.6" fill="#29e0ff" opacity=".25"/><circle r="2.7" fill="#eaffff" stroke="#29e0ff" stroke-width="1"/></g></g></svg>`;
        G.objs = mz.querySelector('.objs'); G.tok = mz.querySelector('.ll-tok');
        resetMaze(false); G.moves = 0; G.busy = false; T.set(G.time); T.paused = false;
        c.hud({ maze: (G.m + 1) + ' / ' + MAZES, moves: '0 · par ' + M.par });
        say(lv === 0 && G.m === 0 ? 'Find the 🔑, open the 🚪, reach the 🏁.' : 'Plan your route: which switches do the gates need?');
      }
      function resetMaze(manual) {
        if (manual && (G.busy || G.q)) return;
        const M = G.M; G.pos = M.s; G.bits = 0; for (const k in M.O) if (M.O[k].t === 'lock') M.O[k].open = M.O[k].solved || false;
        G.tok.style.transition = 'none'; draw(); void G.tok.getBoundingClientRect(); G.tok.style.transition = '';
        if (manual) { sfx.pop(); say('Back to the start. Switches are all OFF again.'); }
      }
      function draw() {
        const M = G.M, b = G.bits; let s = '';
        for (const k in M.O) {
          const o = M.O[k], [x, y] = xy(+k), X = x - 5, Y = y - 5;
          if (o.t === 'sw') { const on = b >> o.v & 1; s += `<circle cx="${x}" cy="${y}" r="3.8" fill="${on ? '#3ddc84' : '#232a3b'}" stroke="${on ? '#c6ff3d' : '#7a86a8'}" stroke-width=".8"/><text x="${x}" y="${y + .2}" font-size="4.4" font-weight="800" text-anchor="middle" dominant-baseline="central" fill="${on ? '#07090e' : '#dfe5f2'}">${'ABC'[o.v]}</text>`; }
          else if (o.t === 'gate') { const op = ev(o.c, b & 7); s += op ? `<rect x="${X + 1}" y="${Y + 1}" width="8" height="8" rx="1.6" fill="rgba(61,220,132,.12)" stroke="#3ddc84" stroke-width=".7" stroke-dasharray="1.6 1"/><text x="${x}" y="${y + .3}" font-size="4" font-weight="800" text-anchor="middle" dominant-baseline="central" fill="#3ddc84">${o.id}</text>`
            : `<rect x="${X + .8}" y="${Y + .8}" width="8.4" height="8.4" rx="1.4" fill="#d93a4b"/><path d="M${X + 3} ${Y + 1}v8M${X + 5} ${Y + 1}v8M${X + 7} ${Y + 1}v8" stroke="#7a1420" stroke-width=".9"/><circle cx="${x}" cy="${y}" r="2.4" fill="#fff"/><text x="${x}" y="${y + .3}" font-size="3.4" font-weight="800" text-anchor="middle" dominant-baseline="central" fill="#d93a4b">${o.id}</text>`; }
          else if (o.t === 'door') { const op = b >> (3 + o.k) & 1; s += `<rect x="${X + .8}" y="${Y + .8}" width="8.4" height="8.4" rx="1.4" fill="${op ? 'none' : '#9a5b22'}" stroke="#e0a458" stroke-width=".7" ${op ? 'stroke-dasharray="1.6 1"' : ''}/>` + (op ? '' : `<text x="${x}" y="${y + .5}" font-size="5.5" text-anchor="middle" dominant-baseline="central">🚪</text>`); }
          else if (o.t === 'key') { if (!(b >> (3 + o.k) & 1)) s += `<text x="${x}" y="${y + .5}" font-size="6" text-anchor="middle" dominant-baseline="central">🔑</text>`; }
          else if (o.t === 'lock') s += o.open ? `<rect x="${X + 1}" y="${Y + 1}" width="8" height="8" rx="1.6" fill="none" stroke="#ffd23f" stroke-width=".7" stroke-dasharray="1.6 1"/>` : `<rect x="${X + .8}" y="${Y + .8}" width="8.4" height="8.4" rx="1.4" fill="#ffd23f"/><text x="${x}" y="${y + .3}" font-size="6" font-weight="800" text-anchor="middle" dominant-baseline="central" fill="#3a2a00">?</text>`;
        }
        const [ex, ey] = xy(M.e), [sx, sy] = xy(M.s);
        s += `<circle cx="${sx}" cy="${sy}" r="3.6" fill="none" stroke="#7a86a8" stroke-width=".5" stroke-dasharray="1 1"/><circle class="ll-exit" cx="${ex}" cy="${ey}" r="4.2" fill="rgba(198,255,61,.22)"/><text x="${ex}" y="${ey + .5}" font-size="6" text-anchor="middle" dominant-baseline="central">🏁</text>`;
        G.objs.innerHTML = s; const [tx, ty] = xy(G.pos); G.tok.style.transform = `translate(${tx}px,${ty}px)`;
        info.innerHTML = '';
        G.sws.forEach(v => { const on = b >> v & 1; info.append(h('span', { class: 'll-c ' + (on ? 'on' : 'off') }, 'ABC'[v], h('b', { text: on ? 'ON' : 'OFF' }))); });
        if (G.hasKey) info.append(h('span', { class: 'll-c ' + (b & 8 ? 'on' : 'off') }, '🔑', h('b', { text: b & 8 ? 'GOT IT' : 'NONE' })));
        G.gates.forEach(i => { const o = M.O[i], op = ev(o.c, b & 7); info.append(h('span', { class: 'll-c g ' + (op ? 'open' : 'shut') }, h('i', { text: String(o.id) }), txt(o.c), h('b', { text: op ? 'OPEN' : 'SHUT' }))); });
      }
      const state = () => G.sws.map(v => 'ABC'[v] + ' is ' + (G.bits >> v & 1 ? 'ON' : 'OFF')).join(', ');
      function at(i) { const r = mz.getBoundingClientRect(), s = c.el.getBoundingClientRect(), [x, y] = xy(i), k = r.width / (G.M.W * 10 + 3); return [r.left - s.left + (x + 1.5) * k, r.top - s.top + (y + 1.5) * k - 10]; }
      function bump() { const n = G.tok.firstChild; n.classList.remove('bump'); void n.getBoundingClientRect(); n.classList.add('bump'); Edu.tone(140, .08, 'square', .05); }
      function move(d) {
        if (G.busy || G.q || !c.alive) return; const M = G.M, t = step(M, G.pos, d);
        if (t < 0) return bump();
        const o = M.O[t];
        if (!pass(M, t, G.bits, false)) {
          bump(); if (o.t === 'lock') return ask(t, d);
          return say(o.t === 'gate' ? `Gate ${o.id} is shut: it needs ${txt(o.c)}. Now ${state()}.` : 'This door is locked. Find the 🔑 first.', 'bad');
        }
        const before = G.bits; G.pos = t; G.moves++; G.bits = enter(M, t, G.bits); Edu.tone(420 + (G.moves % 6) * 30, .04, 'sine', .04);
        if (o && o.t === 'sw') {
          const on = G.bits >> o.v & 1, ch = G.gates.filter(i => ev(M.O[i].c, before & 7) !== ev(M.O[i].c, G.bits & 7)).map(i => `gate ${M.O[i].id} ${ev(M.O[i].c, G.bits & 7) ? 'opened' : 'shut'}`);
          say(`Switch ${'ABC'[o.v]} is now ${on ? 'ON' : 'OFF'}.` + (ch.length ? ' ' + ch.join(', ').replace(/^g/, 'G') + '!' : ''), on ? 'good' : ''); on ? sfx.good() : Edu.tone(300, .1, 'triangle', .08);
          G.gates.forEach(i => { if (ev(M.O[i].c, before & 7) !== ev(M.O[i].c, G.bits & 7)) { const [x, y] = at(i); c.pop(ev(M.O[i].c, G.bits & 7) ? '🔓' : '🔒', x, y); } });
        } else if (o && o.t === 'key' && G.bits !== before) { const [x, y] = at(t); c.pop('🔑 +5', x, y, '#ffd23f'); c.add(5); sfx.pop(); say('Got the key! The 🚪 door will open now.', 'good'); }
        draw(); c.hud({ moves: G.moves + ' · par ' + M.par });
        if (t === M.e) done();
      }
      function ask(t, d) {
        const Q = G.q = seqQ(); Q.t = t; Q.d = d; T.paused = true; say('A pattern lock! Answer it to open the way.');
        const card = h('div', {}, h('div', { class: 'sub', text: '🔒 What comes next?' }), h('div', { class: 'sq', text: Q.s.join(', ') + ', ?' }));
        Q.el = h('div', { class: 'll-q' }, card); mz.append(Q.el);
        Q.ch = c.choices(card, Q.opts, (i, btn) => {
          if (G.q !== Q) return; Q.ch.lock(); const r = btn.getBoundingClientRect(), s = c.el.getBoundingClientRect(), x = r.left - s.left + r.width / 2, y = r.top - s.top;
          if (i === Q.ai) { Q.ch.mark(i, true); c.right(15 + 5 * lv, x, y); G.M.O[t].open = G.M.O[t].solved = true; say('✓ ' + Q.rule + ' The lock opens!', 'good');
            c.after(450, () => { Q.el.remove(); G.q = null; T.paused = false; move(d); }); }
          else { Q.ch.mark(i, false); Q.ch.mark(Q.ai, true); c.wrong(x, y, '✗'); const left = c.lose(); say(`Not quite: ${Q.rule} It was ${Q.ans}.`, 'bad');
            c.after(1300, () => { Q.el.remove(); G.q = null; if (!left) return over(); T.paused = false; }); }
        }, { cols: 2 });
      }
      function done() {
        G.busy = true; T.paused = true; const M = G.M, st = G.moves <= M.par ? 3 : G.moves <= Math.round(M.par * 1.25) + 2 ? 2 : 1;
        G.stars += st; G.total += G.moves; G.parTotal += M.par; const [x, y] = at(M.e);
        c.right(25 + 10 * lv, x, y); c.add(st * 15 + Math.round(T.left() / 2), x, y + 26, '#ffd23f'); Edu.sfx.win();
        say(`Exit! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}  ${G.moves} moves (par ${M.par}).`, 'good');
        c.after(900, () => { G.m++; if (G.m >= MAZES) c.end({ won: true, title: 'Labyrinth cleared!', msg: `You escaped all ${MAZES} mazes.`, stats: stats(), learnt: learnt() }); else loadMaze(); });
      }
      function stats() { return { Mazes: G.m + ' / ' + MAZES, Stars: G.stars + ' / ' + MAZES * 3, Moves: G.total + (G.m < MAZES ? G.moves : 0), Par: G.parTotal + (G.m < MAZES && G.M ? G.M.par : 0) }; }
      function learnt() {
        return lv === 0 ? ['A switch is either ON or OFF; stepping on it flips it.', 'A gate labeled A is open only while switch A is ON.', 'Planning the route first (key, then door) saves moves.']
          : ['A AND B is true only when both A and B are true.', 'A OR B is true when at least one of them is true.', ...(lv === 2 ? ['NOT A is true when A is false: it flips the value.', 'One choice now (which switch to use) can make a later gate easier or harder.'] : ['Planning which switches you need before moving saves steps.'])];
      }
      function over() { c.end({ won: false, title: 'Out of lives', msg: 'Read each gate\'s rule and check the switch chips before you move.', stats: stats(), learnt: learnt() }); }
      c.key(e => { if (G.q) return; const d = KEYS[e.key]; if (d != null) { e.preventDefault(); move(d); } else if (e.key === 'Backspace') { e.preventDefault(); resetMaze(true); } });
      let t0 = null;
      c.on(mz, 'touchstart', e => { const p = e.touches[0]; t0 = [p.clientX, p.clientY]; }, { passive: true });
      c.on(mz, 'touchend', e => { if (!t0 || G.q) return; const p = e.changedTouches[0], dx = p.clientX - t0[0], dy = p.clientY - t0[1]; t0 = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; e.preventDefault(); move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); });
      c.on(mz, 'click', e => { if (G.q || !G.M) return; const r = mz.getBoundingClientRect(), k = (G.M.W * 10 + 3) / r.width, [tx, ty] = xy(G.pos), dx = (e.clientX - r.left) * k - 1.5 - tx, dy = (e.clientY - r.top) * k - 1.5 - ty;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 4) return; move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); });
      loadMaze();
    },
    bot(c) {
      const G = c.G; if (!G || G.busy) return; if (G.q) { if (!G.q.ch.el.classList.contains('locked')) G.q.ch.btns[G.q.ai].click(); return; }
      const p = plan(G.M, G.pos, G.bits); if (!p) return G.rsb.click(); if (p.dir >= 0) G.dbtn[p.dir].click();
    },
    miss(c) {
      const G = c.G; if (!G || G.busy) return; if (G.q) { if (!G.q.ch.el.classList.contains('locked')) G.q.ch.btns[(G.q.ai + 1) % 4].click(); return; }
      const d = [0, 1, 2, 3].find(d => step(G.M, G.pos, d) < 0); if (d != null) G.dbtn[d].click();
    }
  });
})();
