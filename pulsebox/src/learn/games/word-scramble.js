/* Word Scramble: letter tiles bounce in; tap them (or type) to spell the hidden word in the slots before the clock runs out.
   A category clue helps, a hint reveals the next letter (the word is then worth less), and shuffle re-mixes the tiles. */
// @data scramble-words
(() => {
  const { h, shuffle, sample, sfx } = Edu;
  const LV = [
    { name: 'Easy', desc: 'Words of 4 or 5 letters. 30 seconds a word.', n: 8, sec: 30 },
    { name: 'Medium', desc: 'Words of 6 or 7 letters. 40 seconds a word.', n: 8, sec: 40 },
    { name: 'Hard', desc: 'Words of 8 to 10 letters. 50 seconds a word.', n: 7, sec: 50 }
  ];
  const ICON = { Animal: '🐾', Food: '🍎', Home: '🏠', Body: '💪', Nature: '🌿', Music: '🎵', Transport: '🚗', Job: '🧑‍🔧', School: '✏️', Science: '🔬', Sports: '⚽' };
  const CSS = `
.ws-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center}
.ws-cat{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;background:color-mix(in srgb,var(--c) 22%,var(--panel2));border:1px solid color-mix(in srgb,var(--c) 55%,transparent);font:700 clamp(16px,3.4vw,20px) var(--display);animation:pop .35s both}
.ws-cat small{font:800 11px var(--body);letter-spacing:.12em;color:var(--muted);text-transform:uppercase}
.ws-dots{display:flex;gap:6px}.ws-dots i{width:12px;height:12px;border-radius:50%;background:var(--edge);transition:background .3s,transform .3s}
.ws-dots i.ok{background:var(--ok)}.ws-dots i.no{background:var(--no)}.ws-dots i.now{background:var(--c);transform:scale(1.35)}
.ws-slots{display:grid;grid-template-columns:repeat(var(--n),minmax(0,56px));gap:clamp(4px,1vw,8px);justify-content:center;width:100%;margin:clamp(16px,4vh,34px) 0 8px}
.ws-slot{aspect-ratio:1/1.15;border-radius:12px;border:2px dashed color-mix(in srgb,var(--c) 45%,var(--edge));background:var(--bg2);display:grid;place-items:center;font:700 clamp(18px,5vw,32px) var(--display);text-transform:uppercase;cursor:pointer;transition:background .2s,border-color .2s,transform .2s;padding:0}
.ws-slot.f{border-style:solid;border-color:var(--c);background:color-mix(in srgb,var(--c) 18%,var(--panel2));animation:wsin .2s ease both}
.ws-slot.hint{border-color:var(--gold);color:var(--gold);background:color-mix(in srgb,var(--gold) 14%,var(--panel2))}
.ws-slot.win{border-color:var(--ok);background:color-mix(in srgb,var(--ok) 30%,var(--panel2));animation:wswave .5s ease both}
.ws-slots.bad .ws-slot{border-color:var(--no);animation:shake .3s}
@keyframes wsin{from{transform:scale(.6)}60%{transform:scale(1.15)}}
@keyframes wswave{40%{transform:translateY(-12px) scale(1.08)}}
.ws-tiles{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(6px,1.4vw,12px);width:min(100%,640px);margin:clamp(10px,3vh,26px) 0}
.ws-tile{width:clamp(46px,12vw,66px);height:clamp(50px,13vw,72px);border-radius:14px;background:linear-gradient(160deg,#fff,#dcd3ff);color:#2a1450;font:700 clamp(22px,6vw,36px) var(--display);text-transform:uppercase;box-shadow:0 5px 0 #8a6bd6,0 8px 18px rgba(0,0,0,.35);transition:transform .12s,opacity .15s;animation:wsdrop .55s cubic-bezier(.3,1.6,.5,1) both}
.ws-tile:hover{transform:translateY(-3px) rotate(-2deg)}
.ws-tile:active{transform:translateY(3px);box-shadow:0 2px 0 #8a6bd6}
.ws-tile.used{opacity:.12;pointer-events:none;transform:scale(.85)}
@keyframes wsdrop{from{transform:translateY(-120px) rotate(-25deg);opacity:0}}
.ws-fly{position:absolute;z-index:6;pointer-events:none;display:grid;place-items:center;border-radius:12px;background:#fff;color:#2a1450;font:700 26px var(--display);text-transform:uppercase;transition:all .18s ease-in}
.ws-tools{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.ws-tools .btn{min-width:96px}
.ws-ans{min-height:1.4em;color:var(--muted);font-weight:700;text-align:center}
.ws-dots,.ws-top,.ws-slots,.ws-tiles,.ws-tools,.ws-ans{position:relative;z-index:1}
.ws-bg{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.ws-bg span{position:absolute;bottom:-70px;font:700 44px var(--display);color:var(--c);opacity:.08;animation:wsfloat linear infinite}
@keyframes wsfloat{to{transform:translateY(-900px) rotate(200deg)}}
`;
  Edu.game({
    id: 'word-scramble', levels: LV,
    how: ['Tap the letter tiles in order to spell the hidden word. You can also type the letters.', 'Tap a filled slot or press Backspace to take a letter back. Space shuffles the tiles.',
      'The category tells you what kind of word it is. A hint reveals the next letter, but the word is then worth fewer points.',
      'Beat the clock on every word. Run out of time three times and the game is over.'],
    start(c) {
      const L = c.L, list = sample(SCRAMBLE[c.level], L.n);
      c.el.append(h('style', { text: CSS }));
      const dots = h('div', { class: 'ws-dots' }, list.map(() => h('i'))); let cat = h('div'); const top = h('div', { class: 'ws-top' }, cat);
      const slotsEl = h('div', { class: 'ws-slots' }), tilesEl = h('div', { class: 'ws-tiles' }), ans = h('div', { class: 'ws-ans' });
      const hintB = h('button', { class: 'btn', type: 'button', onclick: () => hint() }), shufB = h('button', { class: 'btn', type: 'button', onclick: () => mix(), text: '🔀 Shuffle' }),
        undoB = h('button', { class: 'btn', type: 'button', onclick: () => undo(), text: '⌫ Undo' });
      c.el.append(h('div', { class: 'ws-bg' }, [...'ABCDEFGHIJKLMNOP'].map((ch, j) => h('span', { text: ch, style: { left: (j * 6.3 + Math.random() * 4) + '%', animationDuration: 14 + Math.random() * 12 + 's', animationDelay: -Math.random() * 20 + 's', fontSize: 28 + Math.random() * 40 + 'px' } }))), dots, top, slotsEl, tilesEl, h('div', { class: 'ws-tools' }, hintB, shufB, undoB), ans);
      c.lives(3); c.solved = 0;
      const S = c.S = { i: -1, word: '', tiles: [], slots: [], hints: 0, busy: true };
      const T = c.timer(L.sec, () => { if (S.busy) return; T.paused = true; fail(); });
      const rel = el => { const r = el.getBoundingClientRect(), s = c.el.getBoundingClientRect(); return [r.left - s.left, r.top - s.top, r.width, r.height]; };
      const worth = () => Math.max(4, Math.round((10 + 3 * S.word.length) * (1 - .3 * S.hints)));

      function next() {
        S.i++; if (S.i >= list.length) return finish();
        const [w, k] = list[S.i]; S.word = w; S.hints = 0; S.busy = false;
        [...dots.children].forEach((d, j) => d.classList.toggle('now', j === S.i));
        cat.replaceWith(cat = h('div', { class: 'ws-cat' }, h('small', { text: 'Category' }), (ICON[k] || '') + ' ' + k)); ans.textContent = '';
        let letters; do letters = shuffle([...w]); while (letters.join('') === w);
        S.tiles = letters.map((ch, j) => { const b = h('button', { class: 'ws-tile', type: 'button', text: ch, 'aria-label': 'Letter ' + ch, style: { animationDelay: j * 45 + 'ms' }, onclick: () => place(j) }); return { ch, b, used: false }; });
        tilesEl.innerHTML = ''; tilesEl.append(...S.tiles.map(t => t.b));
        S.slots = [...w].map((_, j) => ({ t: -1, hint: false, el: h('button', { class: 'ws-slot', type: 'button', 'aria-label': 'Slot ' + (j + 1), onclick: () => takeBack(j) }) }));
        slotsEl.innerHTML = ''; slotsEl.style.setProperty('--n', w.length); slotsEl.append(...S.slots.map(s => s.el));
        hintB.textContent = '💡 Hint'; hintB.disabled = false;
        T.set(L.sec); T.paused = false; sfx.pop();
      }
      function fly(from, to, ch) {
        const [x, y, w, hh] = rel(from), [x2, y2, w2, h2] = rel(to);
        const f = h('div', { class: 'ws-fly', text: ch, style: { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' } }); c.el.append(f);
        requestAnimationFrame(() => { Object.assign(f.style, { left: x2 + 'px', top: y2 + 'px', width: w2 + 'px', height: h2 + 'px', opacity: .4 }); });
        setTimeout(() => f.remove(), 200);
      }
      function fill(si, ti, isHint) {
        const s = S.slots[si], t = S.tiles[ti]; s.t = ti; s.hint = !!isHint; t.used = true; t.b.classList.add('used');
        fly(t.b, s.el, t.ch); s.el.textContent = t.ch; s.el.className = 'ws-slot f' + (isHint ? ' hint' : ''); sfx.click();
      }
      function clearSlot(si) { const s = S.slots[si]; if (s.t < 0 || s.hint) return; const t = S.tiles[s.t]; t.used = false; t.b.classList.remove('used'); s.t = -1; s.el.textContent = ''; s.el.className = 'ws-slot'; }
      function place(ti) {
        if (S.busy || S.tiles[ti].used) return; const si = S.slots.findIndex(s => s.t < 0); if (si < 0) return;
        fill(si, ti); check();
      }
      function takeBack(si) { if (S.busy) return; for (let j = S.slots.length - 1; j >= si; j--) clearSlot(j); }   // (takes back that letter and any after it)
      function undo() { if (S.busy) return; for (let j = S.slots.length - 1; j >= 0; j--) if (S.slots[j].t >= 0 && !S.slots[j].hint) { clearSlot(j); sfx.click(); return; } }
      function mix() {
        if (S.busy) return; const order = shuffle(S.tiles.map((_, j) => j));
        tilesEl.append(...order.map(j => S.tiles[j].b)); S.tiles.forEach(t => { t.b.style.animation = 'none'; void t.b.offsetWidth; t.b.style.animation = ''; t.b.style.animationDelay = '0ms'; }); sfx.pop();
      }
      function hint() {
        if (S.busy) return; let i = S.slots.findIndex((s, j) => s.t < 0 || S.tiles[s.t].ch !== S.word[j]); if (i < 0) return;
        for (let j = S.slots.length - 1; j >= i; j--) clearSlot(j);
        const ti = S.tiles.findIndex(t => !t.used && t.ch === S.word[i]); if (ti < 0) return;
        S.hints++; fill(i, ti, true); const [hx, hy, hw] = rel(S.slots[i].el); c.pop('Hint: −' + Math.round((10 + 3 * S.word.length) * .3) + ' pts', hx + hw / 2, hy, '#ffd23f');
        hintB.textContent = '💡 Hint (' + worth() + ' left)';
        if (S.slots.every(s => s.t >= 0)) check();
      }
      function check() {
        if (S.slots.some(s => s.t < 0)) return;
        const got = S.slots.map(s => S.tiles[s.t].ch).join(''), [x, y, w] = rel(slotsEl);
        if (got === S.word) {
          S.busy = true; T.paused = true; c.solved++;
          S.slots.forEach((s, j) => { s.el.style.animationDelay = j * 50 + 'ms'; s.el.className = 'ws-slot f win'; });
          c.right(worth(), x + w / 2, y); const bonus = Math.ceil(T.left() / 3); if (bonus) c.after(250, () => c.add(bonus, x + w / 2, y + 40, '#29e0ff'));
          dots.children[S.i].className = 'ok'; ans.textContent = '✔ ' + S.word.toUpperCase();
          c.after(750, next);
        } else {
          S.busy = true; c.wrong(x + w / 2, y, '−3 s'); T.add(-3); slotsEl.classList.add('bad');
          c.after(420, () => { slotsEl.classList.remove('bad'); S.slots.forEach((_, j) => clearSlot(j)); S.busy = false; });
        }
      }
      function fail() {
        S.busy = true; c.wrong(); dots.children[S.i].className = 'no'; ans.textContent = 'Out of time! The word was ' + S.word.toUpperCase() + '.';
        S.slots.forEach((s, j) => { s.el.textContent = S.word[j]; s.el.className = 'ws-slot f hint'; });
        (c.missed = c.missed || []).push(S.word);
        if (c.lose() <= 0) return c.after(800, finish); c.after(800, next);   // (the answer stays up long enough to read)
      }
      function finish() {
        const won = c.lives_ > 0 && S.i >= list.length, rows = list.slice(0, Math.min(list.length, S.i + 1));
        c.end({ won, title: won ? 'All words found!' : 'Out of lives', emoji: won ? '🔤' : '⌛', msg: won ? `You unscrambled ${c.solved} of ${list.length} words.` : 'Run out of time three times and the game ends. Try again!',
          stats: { 'Words solved': c.solved + ' / ' + list.length },
          learnt: [rows.map(([w, k]) => w + ' (' + k.toLowerCase() + ')').join(', '), c.missed ? 'Practice spelling: ' + c.missed.join(', ') : 'Look for common letter pairs like th, sh, ch and ck to put a word back together.'] });
      }
      // letters are caught before the page's own shortcuts (R would restart the level), so every letter can be typed
      c.on(window, 'keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey || (e.target && e.target.tagName === 'INPUT')) return;
        if (e.key === 'Backspace') { e.preventDefault(); undo(); }
        else if (e.key === ' ') { e.preventDefault(); if (document.activeElement) document.activeElement.blur(); mix(); }
        else if (/^[a-z]$/i.test(e.key)) { e.stopPropagation(); const ch = e.key.toLowerCase(), ti = S.tiles.findIndex(t => !t.used && t.ch === ch); if (ti >= 0) place(ti); else if (!S.busy) sfx.bad(); }
      }, true);
      next();
    },
    bot(c) {
      const S = c.S; if (!S || S.busy) return;
      const bad = S.slots.findIndex((s, j) => s.t >= 0 && S.tiles[s.t].ch !== S.word[j]);
      if (bad >= 0) { S.slots[bad].el.click(); return; }
      const i = S.slots.findIndex(s => s.t < 0); if (i < 0) return;
      const ti = S.tiles.findIndex(t => !t.used && t.ch === S.word[i]); if (ti >= 0) S.tiles[ti].b.click();
    },
    miss(c) {
      const S = c.S; if (!S || S.busy) return; const i = S.slots.findIndex(s => s.t < 0); if (i < 0) return;
      const ti = S.tiles.findIndex(t => !t.used && t.ch !== S.word[i]); if (ti >= 0) S.tiles[ti].b.click();
    }
  });
})();
