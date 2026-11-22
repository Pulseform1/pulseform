/* Equation Escape: every room has a locked door with an equation on it. Type the value of x on the door's keypad to
   open it and run on to the next room. A wrong code sets off the alarm, costs time and shows the worked steps.
   Escape all the rooms before the clock runs out. */
(() => {
  const { h, rnd, pick, sfx } = Edu, M = '−';
  const num = v => v < 0 ? M + -v : String(v);
  const sg = v => v < 0 ? ` ${M} ${-v}` : ` + ${v}`;
  const cx = a => a === 1 ? 'x' : a + 'x';
  const fr = (t, b) => `<span class="ee-fr"><b>${t}</b><i></i><b>${b}</b></span>`;
  const nz = (a, b) => { let v; do v = rnd(a, b); while (!v); return v; };
  const sub = (b, eq) => [b > 0 ? `Subtract ${b} from both sides` : `Add ${-b} to both sides`, eq];
  // each equation: html (on the door), text, x (the answer), steps [[what to do, result], ...]
  const GEN = [
    [ // one step
      () => { const x = rnd(1, 20), a = rnd(2, 15), b = x + a; return { t: `x + ${a} = ${b}`, x, steps: [sub(a, `x = ${b} ${M} ${a} = ${x}`)] }; },
      () => { const a = rnd(2, 12), x = rnd(a + 1, a + 20), b = x - a; return { t: `x ${M} ${a} = ${b}`, x, steps: [sub(-a, `x = ${b} + ${a} = ${x}`)] }; },
      () => { const a = rnd(2, 9), x = rnd(2, 12); return { t: `${a}x = ${a * x}`, x, steps: [[`Divide both sides by ${a}`, `x = ${a * x} ÷ ${a} = ${x}`]] }; },
      () => { const a = rnd(2, 6), b = rnd(2, 10), x = a * b; return { t: `x/${a} = ${b}`, html: `${fr('x', a)} = ${b}`, x, steps: [[`Multiply both sides by ${a}`, `x = ${b} × ${a} = ${x}`]] }; }
    ],
    [ // two steps
      () => { const a = rnd(2, 9), x = rnd(1, 12), b = rnd(1, 20), c = a * x + b;
        return { t: `${a}x + ${b} = ${c}`, x, steps: [sub(b, `${a}x = ${c - b}`), [`Divide both sides by ${a}`, `x = ${x}`]] }; },
      () => { const a = rnd(2, 9), x = rnd(2, 12), b = rnd(1, a * x - 1), c = a * x - b;
        return { t: `${a}x ${M} ${b} = ${c}`, x, steps: [sub(-b, `${a}x = ${c + b}`), [`Divide both sides by ${a}`, `x = ${x}`]] }; },
      () => { const a = rnd(2, 5), q = rnd(1, 10), b = rnd(1, 12), x = a * q, c = q + b;
        return { t: `x/${a} + ${b} = ${c}`, html: `${fr('x', a)} + ${b} = ${c}`, x, steps: [sub(b, `x/${a} = ${q}`), [`Multiply both sides by ${a}`, `x = ${x}`]] }; },
      () => { const a = rnd(2, 5), b = rnd(1, 9), q = rnd(b + 1, b + 10), x = a * q, c = q - b;
        return { t: `x/${a} ${M} ${b} = ${c}`, html: `${fr('x', a)} ${M} ${b} = ${c}`, x, steps: [sub(-b, `x/${a} = ${q}`), [`Multiply both sides by ${a}`, `x = ${x}`]] }; }
    ],
    [ // x on both sides, brackets (answers can be negative)
      () => { let a, c, x, b, d; do { a = rnd(3, 9); c = rnd(1, a - 1); x = nz(-8, 12); b = nz(-15, 15); d = (a - c) * x + b; } while (!d);
        const k = a - c, st = [[`Subtract ${cx(c)} from both sides`, `${cx(k)}${sg(b)} = ${num(d)}`], sub(b, `${cx(k)} = ${num(d - b)}`)];
        if (k > 1) st.push([`Divide both sides by ${k}`, `x = ${num(x)}`]);
        return { t: `${cx(a)}${sg(b)} = ${cx(c)}${sg(d)}`, x, steps: st }; },
      () => { let a, b, x; do { a = rnd(2, 6); b = nz(-9, 9); x = nz(-6, 12); } while (x + b === 0);
        const c = a * (x + b); return { t: `${a}(x${sg(b)}) = ${num(c)}`, x, steps: [[`Divide both sides by ${a}`, `x${sg(b)} = ${num(x + b)}`], sub(b, `x = ${num(x)}`)] }; },
      () => { let a, c, b, x, d; do { a = rnd(3, 6); c = rnd(1, a - 1); b = nz(-6, 6); x = nz(-5, 10); d = (a - c) * x + a * b; } while (!d || d === a * b);
        const k = a - c, B = a * b, st = [[`Expand the bracket`, `${cx(a)}${sg(B)} = ${cx(c)}${sg(d)}`], [`Subtract ${cx(c)} from both sides`, `${cx(k)}${sg(B)} = ${num(d)}`], sub(B, `${cx(k)} = ${num(d - B)}`)];
        if (k > 1) st.push([`Divide both sides by ${k}`, `x = ${num(x)}`]);
        return { t: `${a}(x${sg(b)}) = ${cx(c)}${sg(d)}`, x, steps: st }; }
    ]
  ];
  const LV = [
    { name: 'Easy', desc: 'One-step equations like x + 7 = 15 and 3x = 21. Eight rooms, 2 minutes.', rooms: 8, time: 120,
      rule: 'Do the opposite to both sides: undo + with −, and undo × with ÷.' },
    { name: 'Medium', desc: 'Two-step equations like 2x + 5 = 17. Eight rooms, 3 minutes.', rooms: 8, time: 180,
      rule: 'Two steps: undo the + or − first, then the × or ÷.' },
    { name: 'Hard', desc: 'x on both sides and brackets, like 5x − 3 = 2x + 9. Answers can be negative. Eight rooms, 4 minutes.', rooms: 8, time: 240,
      rule: 'Get the x terms on one side first, and deal with a bracket by expanding it or dividing by the number outside.' }
  ];
  const CSS = `.ee-room{position:relative;width:min(100%,600px);height:clamp(150px,30vh,240px);border-radius:18px;overflow:hidden;flex:none;border:2px solid #2c3a3a;background:linear-gradient(180deg,hsl(var(--h) 25% 22%),hsl(var(--h) 22% 14%) 74%,#0d1110 74%,#151b19);transition:transform .45s ease,opacity .45s}
.ee-room.out{transform:translateX(-110%);opacity:0}.ee-room.in{animation:eein .45s ease both}@keyframes eein{from{transform:translateX(110%);opacity:0}}
.ee-room::before{content:'';position:absolute;inset:0 0 26%;background:repeating-linear-gradient(90deg,transparent 0 58px,rgba(0,0,0,.18) 58px 60px),repeating-linear-gradient(0deg,transparent 0 28px,rgba(0,0,0,.14) 28px 30px)}
.ee-sign{position:absolute;left:50%;top:8px;transform:translateX(-50%);padding:6px 16px;border-radius:12px;background:#07130f;border:2px solid var(--c);color:#b9ffd7;font:700 clamp(20px,4.6vw,30px) var(--display);white-space:nowrap;box-shadow:0 0 18px color-mix(in srgb,var(--c) 45%,transparent);text-shadow:0 0 8px rgba(61,220,132,.7);z-index:3;display:flex;align-items:center;gap:.25em}
.ee-door{position:absolute;left:50%;bottom:26%;width:22%;max-width:120px;height:58%;transform:translateX(-50%);background:#020403;border:5px solid #4a3a2a;border-bottom:0;border-radius:6px 6px 0 0;overflow:hidden}
.ee-door::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 60%,rgba(255,240,180,.55),transparent 70%);opacity:0;transition:opacity .4s}
.ee-door.open::after{opacity:1}
.ee-door i{position:absolute;top:0;bottom:0;width:50%;background:linear-gradient(90deg,#8a6a45,#6b4f32);transition:transform .35s ease-in;box-shadow:inset 0 0 0 3px rgba(0,0,0,.25)}
.ee-door i:first-child{left:0}.ee-door i:nth-child(2){right:0}.ee-door.open i:first-child{transform:translateX(-100%)}.ee-door.open i:nth-child(2){transform:translateX(100%)}
.ee-lock{position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);font-size:22px;transition:transform .35s,opacity .35s;z-index:2}.ee-door.open .ee-lock{transform:translate(-50%,-160%) rotate(-30deg);opacity:0}
.ee-hero{position:absolute;bottom:22%;left:10%;font-size:clamp(30px,7vw,44px);transform:scaleX(-1);transition:left .4s linear,transform .4s,opacity .4s;z-index:2;animation:eebob .5s ease-in-out infinite alternate}
@keyframes eebob{to{margin-bottom:4px}}.ee-hero.go{left:46%;transform:scaleX(-1) scale(.7);opacity:0}
.ee-alarm{position:absolute;right:14px;top:14px;width:18px;height:18px;border-radius:50%;background:#511;box-shadow:0 0 0 3px #222;z-index:3}
.ee-room.alarm .ee-alarm{animation:eeal .25s steps(2) 4}.ee-room.alarm{animation:shake .35s}.ee-room.alarm::after{content:'';position:absolute;inset:0;background:rgba(255,30,50,.25);animation:eeal .25s steps(2) 4}
@keyframes eeal{50%{background:#ff2a3a;box-shadow:0 0 30px 10px rgba(255,40,60,.8)}}
.ee-no{position:absolute;left:12px;bottom:6px;font:700 12px var(--display);color:rgba(255,255,255,.55);letter-spacing:.12em;z-index:2}
.ee-map{position:absolute;right:10px;bottom:6px;display:flex;gap:4px;z-index:2}.ee-map b{width:9px;height:9px;border-radius:2px;background:rgba(255,255,255,.18)}.ee-map b.ok{background:var(--c)}.ee-map b.on{background:#ffd23f}
.ee-disp{margin-top:10px;width:min(100%,360px);padding:8px 14px;border-radius:14px;background:#06100c;border:2px solid var(--edge);font:700 clamp(24px,5vw,32px) var(--display);text-align:center;color:#b9ffd7;min-height:52px}
.ee-disp.bad{border-color:var(--no);color:var(--no);animation:shake .3s}.ee-disp span{border-bottom:3px solid currentColor;padding:0 6px}
.ee-pad{margin-top:8px}.ee-pad button{min-height:48px}.ee-pad .go{grid-column:1/-1;background:linear-gradient(135deg,var(--c),var(--c2));color:#07090e;border:0}
.ee-help{width:min(100%,520px);margin-top:10px;padding:12px 16px;border-radius:16px;background:var(--panel2);border:2px solid var(--no);text-align:left;animation:pop .3s both}
.ee-help ol{margin:6px 0 10px;padding-left:22px}.ee-help li{margin:4px 0}.ee-help li b{color:#b9ffd7;font-family:var(--display);white-space:nowrap}
.ee-fr{display:inline-flex;flex-direction:column;align-items:center;line-height:1;font-size:.72em}.ee-fr i{width:100%;height:2px;background:currentColor;margin:2px 0}`;

  Edu.game({
    id: 'equation-escape', levels: LV, gen: GEN,
    how: ['Each door is locked with an equation. Work out the value of x.',
      'Type it on the keypad (tap, click, or use your number keys, minus and Enter) to open the door.',
      'A wrong code sets off the alarm and costs 10 seconds, then shows the worked steps.',
      'Escape all eight rooms before the clock runs out.'],
    start(c) {
      if (!document.getElementById('ee-css')) document.head.append(h('style', { id: 'ee-css', text: CSS }));
      const L = c.L, S = c.S = { room: 0, val: '', busy: false, help: false, over: false, ex: null };
      c.el.style.justifyContent = 'flex-start';
      const disp = h('div', { class: 'ee-disp' }), pad = h('div', { class: 'key-pad ee-pad', '--cols': 4 }), help = h('div', { class: 'ee-help', hidden: true });
      let room = null;
      const draw = () => { disp.classList.remove('bad'); disp.innerHTML = `x = <span>${S.val ? S.val.replace('-', M) : '&nbsp;?&nbsp;'}</span>`; };
      const T = c.timer(L.time, () => { S.over = true; c.end({ won: false, title: 'Locked in!', emoji: '⏰', msg: `The clock ran out in room ${S.room} of ${L.rooms}.`,
        stats: { Rooms: (S.room - 1) + ' / ' + L.rooms }, learnt: learnt() }); });
      const learnt = () => [L.rule, S.ex && `${S.ex.t}: ${S.ex.steps.map(s => s[1]).join(', then ')}`, 'Check an answer by putting it back into the equation: both sides must be equal.'].filter(Boolean);
      const newRoom = () => {
        S.room++; S.eq = pick(GEN[c.level])(); S.val = ''; S.busy = false; c.hud({ room: S.room + ' / ' + L.rooms });
        const map = h('div', { class: 'ee-map' }, Array.from({ length: L.rooms }, (_, i) => h('b', { class: i < S.room - 1 ? 'ok' : i === S.room - 1 ? 'on' : '' })));
        const nr = h('div', { class: 'ee-room in', '--h': (150 + S.room * 37) % 360 },
          h('div', { class: 'ee-sign', html: S.eq.html || S.eq.t }), h('div', { class: 'ee-door' }, h('i'), h('i'), h('span', { class: 'ee-lock', text: '🔒' })),
          h('div', { class: 'ee-hero', text: '🏃' }), h('div', { class: 'ee-alarm' }), h('div', { class: 'ee-no', text: 'ROOM ' + S.room }), map);
        if (room) room.replaceWith(nr); else c.el.prepend(nr); room = nr; draw();
      };
      const press = k => {
        if (S.over || S.busy) return; if (S.help) { if (k === 'ok') next(); return; }
        if (k === 'ok') return submit();
        sfx.click();
        if (k === 'del') S.val = S.val.slice(0, -1);
        else if (k === '-') S.val = S.val.startsWith('-') ? S.val.slice(1) : '-' + S.val;
        else if (S.val.replace('-', '').length < 3) S.val += k;
        draw();
      };
      const submit = () => {
        if (!S.val || S.val === '-') { disp.classList.add('bad'); return; }
        const v = parseInt(S.val, 10), r = room.getBoundingClientRect(), s = c.el.getBoundingClientRect(), x = r.left - s.left + r.width / 2, y = r.top - s.top + r.height * .55;
        S.ex = S.eq;
        if (v === S.eq.x) {
          S.busy = true; c.right(15 + 10 * c.level, x, y); room.querySelector('.ee-door').classList.add('open'); sfx.pop();
          c.after(250, () => room.querySelector('.ee-hero').classList.add('go'));
          if (S.room >= L.rooms) { S.over = true; const left = Math.ceil(T.left()); T.paused = true; c.after(650, () => { c.add(left * 2);
            c.end({ won: true, title: 'You escaped!', emoji: '🚪', msg: `All ${L.rooms} doors open with ${left} seconds to spare (+2 points a second).`, stats: { Rooms: L.rooms + ' / ' + L.rooms, 'Time left': left + 's' }, learnt: learnt() }); }); }
          else c.after(600, () => { room.classList.add('out'); c.after(220, newRoom); });
        } else {
          c.wrong(x, y, '✗ ALARM  −10s'); disp.innerHTML = `x = <span>${num(v)}</span> ✗`; T.add(-10); T.paused = true; S.help = true;
          room.classList.remove('alarm'); void room.offsetWidth; room.classList.add('alarm'); disp.classList.add('bad');
          help.innerHTML = ''; help.append(h('b', { text: `x = ${num(v)} does not open it. Here is how to solve ${S.eq.t}:` }),
            h('ol', {}, S.eq.steps.map(([a, b]) => h('li', {}, a + ':  ', h('b', { text: b })))),
            h('button', { class: 'btn go', type: 'button', onclick: () => next() }, 'New code ▶'));
          help.hidden = false; pad.hidden = true; c.after(30, () => { const b = help.querySelector('button'); if (b && !matchMedia('(hover: none)').matches) b.focus({ preventScroll: true }); });
        }
      };
      const next = () => { if (!S.help) return; S.help = false; help.hidden = true; pad.hidden = false; T.paused = false; room.classList.remove('alarm');
        S.eq = pick(GEN[c.level])(); room.querySelector('.ee-sign').innerHTML = S.eq.html || S.eq.t; S.val = ''; draw(); };
      c.press = press;
      for (const [k, l] of [['7'], ['8'], ['9'], ['del', '⌫'], ['4'], ['5'], ['6'], ['-', '±'], ['1'], ['2'], ['3'], ['0'], ['ok', 'Unlock ✓']])
        pad.append(h('button', { type: 'button', class: k === 'ok' ? 'go' : '', 'aria-label': k === 'del' ? 'Delete' : k === '-' ? 'Plus or minus' : null, text: l || k, onclick: e => { e.currentTarget.blur(); press(k); } }));
      c.el.append(disp, pad, help);
      c.key(e => { const k = e.key; let m = null;
        if (/^[0-9]$/.test(k)) m = k; else if (k === '-' || k === '−' || k === '_') m = '-'; else if (k === 'Backspace' || k === 'Delete') m = 'del'; else if (k === 'Enter' || (k === ' ' && S.help)) m = 'ok';
        if (m) { e.preventDefault(); press(m); } });
      newRoom();
    },
    bot(c) { const S = c.S; if (!S || S.over || S.busy) return; if (S.help) return c.press('ok'); S.val = String(S.eq.x); c.press('ok'); },
    miss(c) { const S = c.S; if (!S || S.over || S.busy || S.help) return; S.val = String(S.eq.x + 1); c.press('ok'); }
  });
})();
