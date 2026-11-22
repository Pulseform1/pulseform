/* Code Breaker: program a robot with blocks (Forward, Turn left, Turn right, Repeat N [ ... ]) to reach the flag.
   Easy: short sequences. Medium: a block limit that needs a loop. Hard: debug a broken program, or collect gems with
   nested loops. Puzzles are generated from a known-good program (so each one is solvable), and Run animates the robot
   step by step, lighting up the running block. A crash or a missed flag costs a battery. */
(() => {
  const { h, rnd, pick, shuffle, sample, sfx } = Edu, SP = Edu.SPEED, PER = 4;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], ICON = { F: '⬆ Forward', L: '↺ Left', R: '↻ Right' };
  const LV = [
    { name: 'Easy', desc: 'Short programs on a 5×5 board. Drive to the flag.', W: 5 },
    { name: 'Medium', desc: 'A block limit on a 6×6 board: you need Repeat loops.', W: 6 },
    { name: 'Hard', desc: 'Debug broken programs and grab gems with nested loops.', W: 7 }
  ];
  const F = () => ({ t: 'F' }), T = t => ({ t }), Rp = (n, b) => ({ t: 'P', n, b }), parse = s => s.split('').map(T);
  const size = l => l.reduce((s, nd) => s + 1 + (nd.t === 'P' ? size(nd.b) : 0), 0);
  const leaves = l => l.reduce((s, nd) => s + (nd.t === 'P' ? nd.n * leaves(nd.b) : 1), 0);
  const clone = l => l.map(nd => nd.t === 'P' ? Rp(nd.n, clone(nd.b)) : T(nd.t));
  const tok = l => l.flatMap(nd => nd.t === 'P' ? ['P' + nd.n, ...tok(nd.b), 'E'] : [nd.t]);
  const inside = (nd, list) => nd.t === 'P' && (nd.b === list || nd.b.some(x => inside(x, list)));
  function flat(list, anc, out) { for (const nd of list) { if (out.length > 300) break; if (nd.t === 'P') for (let k = 0; k < nd.n; k++) flat(nd.b, anc.concat(nd), out); else out.push({ nd, anc }); } return out; }
  // generators: each returns a correct program
  function genEasy(k) { const p = []; for (let s = 0, n = k < 2 ? 2 : 3; s < n; s++) { if (s) p.push(T(pick('LR'))); for (let j = rnd(1, 3); j--;) p.push(F()); } return p; }
  function genLoop() {
    const m = pick(['F', 'FF', 'FLFR', 'FRFL', 'FFL', 'FFR', 'FFRFL']), n = m.length <= 2 ? rnd(3, 5) : rnd(2, 3), p = [Rp(n, parse(m))];
    if (Math.random() < .5) p.unshift(T(pick('FLR'))); if (Math.random() < .35) p.push(F()); return p;
  }
  function genNest() {
    const a = pick('LR'), b = a === 'L' ? 'R' : 'L', k = rnd(0, 2);
    const p = k === 0 ? [Rp(rnd(2, 3), [Rp(rnd(2, 3), [F()]), T(a)])] : k === 1 ? [Rp(rnd(2, 3), [Rp(2, [F()]), T(a), F(), T(b)])] : (m => [Rp(2, [Rp(m, [F()]), T(a), F(), T(a), Rp(m, [F()]), T(b), F(), T(b)])])(rnd(2, 3));
    if (k < 2 && Math.random() < .4) p.unshift(T(b)); return p;
  }
  function mutate(sol) {
    const p = clone(sol), spots = [];
    (function walk(l) { l.forEach((nd, i) => { spots.push([l, i]); if (nd.t === 'P') walk(nd.b); }); })(p);
    const [l, i] = pick(spots), nd = l[i];
    if (nd.t === 'L' || nd.t === 'R') nd.t = nd.t === 'L' ? 'R' : 'L';
    else if (nd.t === 'P') nd.n = nd.n === 2 ? 3 : nd.n + pick([-1, 1]);
    else if (l.length > 1 && Math.random() < .5) l.splice(i, 1); else l.splice(i, 0, F());
    return p;
  }
  function exec(prog, P) {
    let x = P.st.x, y = P.st.y, d = P.st.d; const got = new Set(), fr = [];
    for (const a of flat(prog, [], [])) {
      if (a.nd.t !== 'F') { d = (d + (a.nd.t === 'L' ? 3 : 1)) % 4; fr.push({ a, x, y, d }); continue; }
      const nx = x + DX[d], ny = y + DY[d], off = nx < 0 || ny < 0 || nx >= P.W || ny >= P.W;
      if (off || P.rock.has(nx + ',' + ny)) { fr.push({ a, x, y, d, crash: [nx, ny] }); return { fr, ok: false, why: off ? 'Bump! That would drive off the board.' : 'Crash! A rock is in the way.' }; }
      x = nx; y = ny; const gem = P.gem.has(x + ',' + y); if (gem) got.add(x + ',' + y); fr.push({ a, x, y, d, gem });
    }
    const at = x === P.gx && y === P.gy, ok = at && got.size === P.gem.size;
    return { fr, ok, why: ok ? '' : at ? 'You reached the flag but missed a gem.' : 'The program ended before the robot reached the flag.' };
  }
  function makePuzzle(lv, k) {
    const W = LV[lv].W, kind = lv === 0 ? 'easy' : lv === 1 ? 'loop' : k % 2 ? 'gems' : 'debug';
    for (let t = 0; t < 600; t++) {
      const sol = kind === 'easy' ? genEasy(k) : kind === 'loop' ? genLoop() : kind === 'gems' ? genNest() : (Math.random() < .5 ? genLoop() : genNest());
      if (kind !== 'easy' && leaves(sol) < size(sol) + 2) continue;
      const st = { x: rnd(0, W - 1), y: rnd(0, W - 1), d: rnd(0, 3) }, path = [[st.x, st.y]], seen = new Set([st.x + ',' + st.y]);
      let x = st.x, y = st.y, d = st.d, bad = false;
      for (const a of flat(sol, [], [])) { if (a.nd.t !== 'F') { d = (d + (a.nd.t === 'L' ? 3 : 1)) % 4; continue; } x += DX[d]; y += DY[d]; if (x < 0 || y < 0 || x >= W || y >= W || seen.has(x + ',' + y)) { bad = true; break; } seen.add(x + ',' + y); path.push([x, y]); }
      if (bad || path.length < 4) continue;
      const P = { W, st, gx: x, gy: y, sol, kind, rock: new Set(), gem: new Set() }, free = [];
      for (let i = 0; i < W * W; i++) if (!seen.has(i % W + ',' + Math.floor(i / W))) free.push(i % W + ',' + Math.floor(i / W));
      const near = free.filter(s => { const [a, b] = s.split(',').map(Number); return path.some(([p, q]) => Math.abs(p - a) + Math.abs(q - b) === 1); });
      [...sample(near, rnd(2, 3) + lv), ...sample(free, 2)].forEach(s => P.rock.add(s));
      if (kind === 'gems') sample(path.slice(1, -1), rnd(2, 3)).forEach(p => P.gem.add(p.join(',')));
      P.limit = kind === 'easy' ? size(sol) + 3 : size(sol);
      if (kind === 'debug') { const bug = mutate(sol); if (exec(bug, P).ok || !exec(sol, P).ok) continue; P.bug = bug; P.limit = Math.max(size(sol), size(bug)); }
      return P;
    }
  }
  const ROBOT = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 1 27 9H13Z" fill="#29e0ff"/><rect x="3" y="14" width="5" height="16" rx="2" fill="#0b0e15"/><rect x="32" y="14" width="5" height="16" rx="2" fill="#0b0e15"/><rect x="7" y="10" width="26" height="24" rx="7" fill="#c6ff3d" stroke="#0b0e15" stroke-width="2"/><circle cx="15" cy="18" r="3.4" fill="#0b0e15"/><circle cx="25" cy="18" r="3.4" fill="#0b0e15"/><rect x="14" y="26" width="12" height="3" rx="1.5" fill="#0b0e15"/></svg>';
  function css() {
    if (document.getElementById('cb-css')) return;
    document.head.append(h('style', { id: 'cb-css', text: `
.cb{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;max-height:100%;overflow-y:auto;overflow-x:hidden;padding:2px}
.cb-msg{font:700 clamp(15px,2.4vw,19px) var(--body);text-align:center;min-height:2.6em;display:flex;align-items:center;justify-content:center;max-width:560px}
.cb-msg.bad{color:var(--no)}.cb-msg.good{color:var(--ok)}.cb-msg.bug{color:var(--gold)}
.cb-board{position:relative;display:grid;width:min(100%,400px,calc(100dvh - 500px));min-width:200px;aspect-ratio:1;flex:none;border-radius:16px;overflow:hidden;background:var(--bg2);border:2px solid var(--edge);box-shadow:0 14px 36px rgba(0,0,0,.4)}
.cb-cell{display:grid;place-items:center;border:1px solid rgba(255,255,255,.045);font-size:var(--fs);line-height:1;transition:background .2s}
.cb-cell:nth-child(odd){background:rgba(255,255,255,.025)}
.cb-cell.trail{background:color-mix(in srgb,var(--c) 18%,transparent)}
.cb-cell.goal{background:radial-gradient(circle,color-mix(in srgb,var(--c2) 30%,transparent),transparent 70%);animation:cbGlow 1.4s ease-in-out infinite}
.cb-cell.got{opacity:.25;transform:scale(.6);transition:opacity .3s,transform .3s}
.cb-bot{position:absolute;left:0;top:0;transition:transform .28s ease;z-index:2;pointer-events:none}
.cb-bot svg{width:100%;height:100%;display:block;transition:transform .28s ease;filter:drop-shadow(0 4px 6px rgba(0,0,0,.5))}
.cb-bot.bump{animation:shake .3s}
.cb-boom{position:absolute;z-index:3;display:grid;place-items:center;animation:cbBoom .6s ease both;pointer-events:none}
.cb-side{display:flex;flex-direction:column;gap:8px;width:min(100%,520px)}
.cb-ph{display:flex;align-items:center;gap:8px;font:700 13px var(--body);color:var(--muted);letter-spacing:.06em;text-transform:uppercase}
.cb-ph b{color:var(--text);font:700 15px var(--display)}.cb-ph b.over{color:var(--no)}.cb-ph .sp{flex:1}
.cb-prog{position:relative;display:flex;flex-wrap:wrap;align-items:center;align-content:flex-start;gap:6px;min-height:62px;max-height:min(220px,24vh);overflow-y:auto;padding:8px;border-radius:14px;background:var(--bg2);border:2px dashed var(--edge);cursor:text}
.cb-prog.shake{animation:shake .3s;border-color:var(--no)}
.cb-blk{min-height:44px;padding:4px 10px;border-radius:10px;font:800 14px var(--body);color:#07090e;background:#29e0ff;border:2px solid transparent;transition:transform .12s,box-shadow .15s;white-space:nowrap}
.cb-blk.L,.cb-blk.R{background:#b9a2ff}.cb-blk.P{background:#ff9f1c}
.cb-blk:hover{transform:translateY(-2px)}
.cb-blk.run{box-shadow:0 0 0 3px #fff,0 0 18px #fff;transform:scale(1.08)}
.cb-blk.err{background:var(--no);color:#fff;animation:shake .3s}
.cb-loop{display:inline-flex;flex-wrap:wrap;align-items:center;gap:6px;padding:4px;border-radius:12px;border:2px solid #ff9f1c;background:rgba(255,159,28,.08)}
.cb-loop.run{box-shadow:0 0 14px rgba(255,159,28,.6)}
.cb-n{min-width:44px;min-height:44px;border-radius:10px;background:#3a2a10;color:#ffcf8a;font:800 15px var(--display);border:1px solid #ff9f1c}
.cb-body{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:44px;min-height:44px;padding:0 6px;border-left:3px solid #ff9f1c;cursor:text}
.cb-caret{width:4px;align-self:stretch;min-height:36px;border-radius:2px;background:var(--c);animation:cbBlink 1s steps(2) infinite}
.cb-pal{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.cb-pal button{min-height:48px;border-radius:12px;font:800 15px var(--body);color:#07090e;transition:transform .1s}
.cb-pal button:active{transform:scale(.95)}.cb-pal button:disabled{opacity:.4}
.cb-pal .F{background:#29e0ff}.cb-pal .L,.cb-pal .R{background:#b9a2ff}.cb-pal .P,.cb-pal .E{background:#ff9f1c}
.cb-pal .go{background:linear-gradient(135deg,var(--c),var(--c2));font-size:17px}
.cb-pal kbd{font:700 10px var(--body);opacity:.6;margin-left:4px}
@media (max-width:559px){.cb{gap:8px}.cb-msg{font-size:14px;min-height:2.4em}.cb-prog{max-height:min(150px,19vh);min-height:56px}.cb-pal{grid-template-columns:repeat(6,1fr);gap:6px}.cb-pal button{font-size:11px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1;padding:2px}.cb-pal button i{font-style:normal;font-size:20px}.cb-pal kbd{display:none}}
@media (min-width:560px){.cb-pal button i{font-style:normal}}
@media (min-width:760px){.cb{flex-direction:row;flex-wrap:wrap;justify-content:center;align-items:flex-start}.cb-msg{width:100%;max-width:none;min-height:1.6em}.cb-board{width:min(44vw,440px,calc(100dvh - 270px))}.cb-side{width:min(100%,430px)}.cb-prog{max-height:min(320px,38vh)}}
@keyframes cbBlink{50%{opacity:0}}
@keyframes cbGlow{50%{background-color:color-mix(in srgb,var(--c2) 12%,transparent)}}
@keyframes cbBoom{0%{transform:scale(.3);opacity:0}30%{transform:scale(1.4);opacity:1}100%{transform:scale(1);opacity:.9}}` }));
  }
  Edu.game({
    id: 'code-breaker', levels: LV.map(({ name, desc }) => ({ name, desc })),
    how: ['Build a program that drives the robot to the flag 🏁. Turns change where it faces; Forward moves one square.',
      'Tap a command to add it where the blinking cursor is. Tap a block in the program to take it out.',
      'Repeat N runs the blocks inside it N times: tap its number to change N, and "End repeat" to leave the loop.',
      'Keys: ↑ Forward, ← Left, → Right, 2 to 9 Repeat, ↓ End repeat, Backspace delete, Enter Run.',
      'A crash or a missed flag costs a battery. Solve 4 puzzles to clear the level.'],
    start(c) {
      css();
      const S = c.S = { k: 0, solved: 0, running: false, busy: false, prog: [], cur: null, fails: 0, rot: 0 };
      const msg = h('div', { class: 'cb-msg' }), board = h('div', { class: 'cb-board' }), cnt = h('b'), prog = h('div', { class: 'cb-prog', 'aria-label': 'Your program' });
      const btn = S.btn = {}, mk = (k, label, key, f) => (btn[k] = h('button', { type: 'button', class: k, onclick: f, title: label[1].trim() + ' (' + key + ')' }, h('i', { text: label[0] }), h('span', { text: label[1] }), h('kbd', { text: key })));
      const pal = h('div', { class: 'cb-pal' }, mk('F', ['⬆', ' Forward'], '↑', () => add(F())), mk('L', ['↺', ' Left'], '←', () => add(T('L'))), mk('R', ['↻', ' Right'], '→', () => add(T('R'))),
        mk('P', ['🔁', ' Repeat'], '2-9', () => add(Rp(2, []))), mk('E', ['⤴', ' End'], '↓', endLoop), mk('go', ['▶', ' Run'], '⏎', run));
      btn.clear = h('button', { class: 'btn sm', type: 'button', onclick: clear }, '🗑 Clear');
      c.el.append(h('div', { class: 'cb' }, msg, board, h('div', { class: 'cb-side' }, h('div', { class: 'cb-ph' }, 'Program ', cnt, h('span', { class: 'sp' }), btn.clear), prog, pal)));
      c.lives(4);
      c.on(prog, 'click', e => { if (e.target === prog && !S.running) { S.cur = { list: S.prog, i: S.prog.length }; draw(); } });
      const say = (t, cls) => { msg.textContent = t; msg.className = 'cb-msg' + (cls ? ' ' + cls : ''); };
      const fit = () => board.style.setProperty('--fs', Math.max(12, board.clientWidth / S.P.W * .56) + 'px');
      c.on(window, 'resize', () => S.P && fit());
      function load() {
        const P = S.P = makePuzzle(c.level, S.k); S.prog = P.bug ? clone(P.bug) : []; S.cur = { list: S.prog, i: S.prog.length }; S.fails = 0;
        board.innerHTML = ''; board.style.gridTemplateColumns = board.style.gridTemplateRows = `repeat(${P.W},1fr)`; S.cells = [];
        for (let i = 0; i < P.W * P.W; i++) { const cl = h('div', { class: 'cb-cell' + (i % P.W === P.gx && Math.floor(i / P.W) === P.gy ? ' goal' : '') }); S.cells.push(cl); board.append(cl); }
        S.robot = h('div', { class: 'cb-bot', html: ROBOT, style: { width: 100 / P.W + '%', height: 100 / P.W + '%' } }); board.append(S.robot);
        reset(); fit();
        c.hud({ puzzle: (S.k + 1) + ' / ' + PER });
        say(P.kind === 'debug' ? '🐞 This program has a bug. Run it, find the mistake and fix it!' : P.kind === 'gems' ? 'Collect every 💎, then finish on the 🏁.' : P.kind === 'loop' ? `Reach the 🏁 using at most ${P.limit} blocks. A Repeat helps!` : 'Drive the robot to the 🏁.', P.kind === 'debug' ? 'bug' : '');
        draw();
      }
      function cell(x, y) { return S.cells[y * S.P.W + x]; }
      function reset() {
        const P = S.P; S.cells.forEach((cl, i) => { const key = i % P.W + ',' + Math.floor(i / P.W); cl.classList.remove('trail', 'got'); cl.textContent = P.rock.has(key) ? '🪨' : P.gem.has(key) ? '💎' : i % P.W === P.gx && Math.floor(i / P.W) === P.gy ? '🏁' : ''; });
        board.querySelectorAll('.cb-boom').forEach(b => b.remove()); S.rot = P.st.d * 90; S.d = P.st.d; move(P.st.x, P.st.y, P.st.d, true); cell(P.st.x, P.st.y).classList.add('trail');
      }
      function move(x, y, d, now) {
        const r = S.robot, sv = r.firstChild; let dd = ((d - S.d) % 4 + 4) % 4; if (dd === 3) dd = -1; S.rot += dd * 90; S.d = d;
        const dur = now ? '0s' : Math.min(.28, .3 / SP) + 's'; r.style.transitionDuration = sv.style.transitionDuration = dur;
        r.style.transform = `translate(${x * 100}%,${y * 100}%)`; sv.style.transform = `rotate(${S.rot}deg)`;
      }
      function draw() {
        prog.innerHTML = ''; const caret = () => h('span', { class: 'cb-caret' });
        const list = (arr, el) => {
          arr.forEach((nd, i) => {
            if (S.cur.list === arr && S.cur.i === i) el.append(caret());
            if (nd.t === 'P') {
              const body = h('div', { class: 'cb-body' }); body.onclick = e => { if (e.target === body && !S.running) { S.cur = { list: nd.b, i: nd.b.length }; draw(); } };
              nd.el = h('div', { class: 'cb-loop' }, h('button', { class: 'cb-blk P', type: 'button', title: 'Take this loop out', onclick: () => remove(arr, i) }, '🔁 Repeat'),
                h('button', { class: 'cb-n', type: 'button', title: 'Change how many times', onclick: () => cycle(nd) }, nd.n + '×'), body);
              list(nd.b, body); el.append(nd.el);
            } else { nd.el = h('button', { class: 'cb-blk ' + nd.t, type: 'button', title: 'Take this block out', onclick: () => remove(arr, i) }, ICON[nd.t]); el.append(nd.el); }
          });
          if (S.cur.list === arr && S.cur.i === arr.length) el.append(caret());
        };
        list(S.prog, prog);
        const n = size(S.prog); cnt.textContent = n + ' / ' + S.P.limit + ' blocks'; cnt.className = n > S.P.limit ? 'over' : '';
        const inLoop = S.cur.list !== S.prog; btn.E.disabled = !inLoop;
        show(prog.querySelector('.cb-caret'));
      }
      function show(el) { if (el && (el.offsetTop < prog.scrollTop || el.offsetTop + el.offsetHeight > prog.scrollTop + prog.clientHeight)) prog.scrollTop = el.offsetTop - 12; }
      function edit() { if (S.running || S.busy || !c.alive) return false; board.querySelectorAll('.cb-boom').forEach(b => b.remove()); return true; }
      function add(nd) { if (!edit()) return; S.cur.list.splice(S.cur.i, 0, nd); S.cur.i++; if (nd.t === 'P') S.cur = { list: nd.b, i: 0 }; sfx.click(); draw(); return nd; }
      function remove(arr, i) { if (!edit()) return; arr.splice(i, 1); S.cur = { list: arr, i }; sfx.pop(); draw(); }
      function cycle(nd) { if (!edit()) return; nd.n = nd.n >= 9 ? 2 : nd.n + 1; sfx.click(); draw(); }
      S.cycle = cycle; S.add = add;
      function parentOf(list, arr = S.prog) { for (let i = 0; i < arr.length; i++) { const nd = arr[i]; if (nd.t !== 'P') continue; if (nd.b === list) return { list: arr, i }; const r = parentOf(list, nd.b); if (r) return r; } return null; }
      function endLoop() { if (!edit()) return; const p = parentOf(S.cur.list); if (p) { S.cur = { list: p.list, i: p.i + 1 }; sfx.click(); draw(); } }
      function back() { if (!edit()) return; if (S.cur.i > 0) return remove(S.cur.list, S.cur.i - 1); const p = parentOf(S.cur.list); if (p) { S.cur = p; draw(); } }
      function clear() { if (!edit()) return; S.prog = []; S.cur = { list: S.prog, i: 0 }; sfx.pop(); draw(); }
      function lit(nd, anc, on) { if (nd.el) { nd.el.classList.toggle('run', on); if (on) show(nd.el); } anc.forEach(a => a.el && a.el.classList.toggle('run', on)); }
      function run() {
        if (S.running || S.busy || !c.alive) return; const n = size(S.prog);
        if (!n) return say('Add some blocks first, then press Run.', 'bad');
        if (n > S.P.limit) { say(`Too many blocks: ${n} / ${S.P.limit}. Can a Repeat make it shorter?`, 'bad'); prog.classList.remove('shake'); void prog.offsetWidth; prog.classList.add('shake'); sfx.bad(); return; }
        S.running = true; reset(); say('Running…'); const res = exec(S.prog, S.P), dt = Math.max(25, 330 / SP); let k = 0, prev = null;
        const step = () => {
          if (prev) lit(prev.a.nd, prev.a.anc, false);
          if (k >= res.fr.length) return res.ok ? win() : fail(res.why, prev);
          const f = res.fr[k++]; prev = f; lit(f.a.nd, f.a.anc, true);
          if (f.crash) { const [x, y] = f.crash; S.robot.classList.remove('bump'); void S.robot.offsetWidth; S.robot.classList.add('bump');
            const W = S.P.W, bx = Math.max(0, Math.min(W - 1, x)), by = Math.max(0, Math.min(W - 1, y));
            board.append(h('div', { class: 'cb-boom', text: '💥', style: { left: bx * 100 / W + '%', top: by * 100 / W + '%', width: 100 / W + '%', height: 100 / W + '%', fontSize: 'var(--fs)' } }));
            return c.after(dt, () => fail(res.why, f)); }
          move(f.x, f.y, f.d); if (f.a.nd.t === 'F') { cell(f.x, f.y).classList.add('trail'); Edu.tone(300 + k * 12, .05, 'square', .03); } else Edu.tone(520, .04, 'triangle', .04);
          if (f.gem) { const g = cell(f.x, f.y); g.classList.add('got'); sfx.pop(); }
          c.after(dt, step);
        };
        c.after(Math.min(150, dt), step);
      }
      function fail(why, f) {
        S.running = false; S.busy = true; S.fails++; if (f && f.a.nd.el) f.a.nd.el.classList.add('err');
        const r = S.robot.getBoundingClientRect(), s = c.el.getBoundingClientRect(); c.wrong(r.left - s.left + r.width / 2, r.top - s.top, '−🔋');
        const left = c.lose(); say(why + (left ? ' Fix the program and run it again.' : ''), 'bad');
        c.after(900, () => { S.busy = false; if (!left) return finish(false); reset(); });
      }
      function win() {
        S.running = false; S.busy = true; S.solved++; const n = size(S.prog), r = S.robot.getBoundingClientRect(), s = c.el.getBoundingClientRect();
        c.right(40 + 15 * c.level, r.left - s.left + r.width / 2, r.top - s.top); if (!S.fails) c.add(20, r.left - s.left + r.width / 2, r.top - s.top + 30, '#ffd23f');
        say(`Goal! Solved with ${n} block${n > 1 ? 's' : ''}${S.fails ? '' : ', first try'}.`, 'good'); Edu.sfx.win();
        c.after(850, () => { S.busy = false; S.k++; if (S.k >= PER) finish(true); else load(); });
      }
      function finish(ok) {
        c.end({ won: ok, title: ok ? 'Program complete!' : 'Out of batteries', msg: ok ? 'Every robot reached its flag.' : 'Read your program one block at a time and picture the robot moving.',
          stats: { 'Puzzles solved': S.solved + ' / ' + PER },
          learnt: ['A program is a list of instructions that run in order, one at a time.', 'Turning left or right does not move the robot; it changes the way it faces.',
            'A loop (Repeat) runs the same blocks again, so a long program can be short.', 'Debugging means finding the step where things go wrong and fixing it.'] });
      }
      c.key(e => {
        const k = e.key, onBtn = e.target && e.target.tagName === 'BUTTON';
        const m = { ArrowUp: () => add(F()), ArrowLeft: () => add(T('L')), ArrowRight: () => add(T('R')), ArrowDown: endLoop, ']': endLoop, Backspace: back, Delete: clear }[k];
        if (m) { e.preventDefault(); m(); } else if (/^[2-9]$/.test(k)) { const nd = add(Rp(2, [])); if (nd) { nd.n = +k; draw(); } }
        else if ((k === 'Enter' || k === ' ') && !onBtn) { e.preventDefault(); run(); }
      });
      load();
    },
    bot(c) {
      const S = c.S; if (!S || !S.P || S.running || S.busy) return;
      const want = tok(S.P.sol), have = [];
      let atEnd = true; (function ser(l) { l.forEach(nd => { if (nd.t !== 'P') return have.push(nd.t); have.push('P' + nd.n); ser(nd.b); if (!(nd.b === S.cur.list || inside(nd, S.cur.list))) have.push('E'); }); if (l === S.cur.list && S.cur.i !== l.length) atEnd = false; })(S.prog);
      if (!atEnd || have.length > want.length || have.some((t, i) => t !== want[i])) return S.btn.clear.click();
      if (have.length === want.length) return S.btn.go.click();
      const t = want[have.length];
      if (t === 'E') S.btn.E.click(); else if (t[0] === 'P') { S.btn.P.click(); const nd = S.P && (function find(l) { for (const x of l) if (x.t === 'P') { if (x.b === S.cur.list) return x; const r = find(x.b); if (r) return r; } })(S.prog); while (nd && nd.n !== +t.slice(1)) S.cycle(nd); }
      else S.btn[t].click();
    },
    miss(c) { const S = c.S; if (!S || S.running || S.busy) return; S.btn.clear.click(); S.btn.L.click(); S.btn.go.click(); }
  });
})();
