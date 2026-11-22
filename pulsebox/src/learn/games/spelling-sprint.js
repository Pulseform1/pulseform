/* Spelling Sprint: a race against the clock on a running track. Fill in the missing letters of tricky words (or pick the
   one correct spelling); each word you get right moves your runner one hurdle closer to the finish. The pacer is the clock. */
// @data spelling-words
(() => {
  const { h, shuffle, sample, sfx } = Edu, GOAL = 10;
  const LV = [
    { name: 'Easy', desc: 'Everyday words with one missing letter. 90 seconds.', sec: 90 },
    { name: 'Medium', desc: 'Often-misspelled words with two missing letters. 120 seconds.', sec: 120 },
    { name: 'Hard', desc: 'Pick the one correct spelling out of four. 100 seconds.', sec: 100 }
  ];
  const CSS = `
.ss-track{position:relative;width:min(100%,760px);height:clamp(84px,13vh,112px);border-radius:16px;background:repeating-linear-gradient(90deg,#c2453a 0 38px,#b83e34 38px 76px);border:3px solid #e9e2d6;box-shadow:0 8px 22px rgba(0,0,0,.35);overflow:hidden;flex:none}
.ss-track:before{content:'';position:absolute;left:0;right:0;top:50%;border-top:2px dashed rgba(255,255,255,.7)}
.ss-fin{position:absolute;right:10px;top:0;bottom:0;width:16px;background:repeating-conic-gradient(#111 0 25%,#fff 0 50%) 0 0/16px 16px}
.ss-hur{position:absolute;top:8%;height:38%;width:5px;border-radius:3px;background:#fff;box-shadow:0 0 0 2px rgba(0,0,0,.2);transition:opacity .3s}
.ss-hur.down{opacity:.25;transform:rotate(70deg)}
.ss-run{position:absolute;left:0;font-size:clamp(28px,5.5vh,40px);line-height:1;transition:left .45s cubic-bezier(.3,1.3,.5,1);z-index:2}
.ss-run b{display:block;transform:scaleX(-1)}
.ss-run.me{top:6%}.ss-run.pace{top:56%;opacity:.55;transition:left .3s linear}
.ss-run small{position:absolute;left:100%;top:50%;transform:translateY(-50%);margin-left:3px;padding:1px 5px;border-radius:6px;background:rgba(0,0,0,.45);font:800 10px var(--body);color:#fff;letter-spacing:.08em;text-shadow:0 1px 3px #000}
.ss-run.jump b{animation:ssjump .45s ease}
.ss-run.trip b{animation:sstrip .5s ease}
@keyframes ssjump{40%{transform:scaleX(-1) translateY(-22px) rotate(10deg)}}
@keyframes sstrip{30%{transform:scaleX(-1) rotate(-50deg) translateY(6px)}60%{transform:scaleX(-1) rotate(-20deg)}}
.ss-word{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(3px,.8vw,6px);margin:clamp(14px,3.5vh,30px) 0 4px;animation:pop .3s both}
.ss-word span{width:clamp(26px,7vw,46px);height:clamp(36px,9vw,58px);display:grid;place-items:center;font:700 clamp(20px,5.4vw,36px) var(--display);border-bottom:3px solid var(--edge)}
.ss-word span.gap{border:2px dashed var(--c);border-radius:10px;background:var(--bg2)}
.ss-word span.cur{border-style:solid;background:color-mix(in srgb,var(--c) 20%,var(--bg2));animation:pulse 1s infinite}
.ss-word span.got{color:var(--ok);border:2px solid var(--ok);border-radius:10px;animation:pop .25s both}
.ss-word span.miss{color:var(--gold);border:2px solid var(--no);border-radius:10px}
.ss-clue{color:#dfe4ef;text-align:center;font-size:clamp(15px,3.6vw,20px);max-width:600px}
.ss-clue b{color:var(--c2)}
.ss-keys{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(8px,2vw,14px);margin-top:clamp(12px,3vh,24px)}
.ss-keys button{width:clamp(54px,15vw,72px);height:clamp(54px,15vw,72px);border-radius:16px;background:var(--panel2);border:2px solid var(--edge);font:700 clamp(24px,6.5vw,34px) var(--display);transition:transform .1s,border-color .15s;animation:pop .3s both}
.ss-keys button:hover{border-color:var(--c);transform:translateY(-2px)}
.ss-keys button.no{border-color:var(--no);background:color-mix(in srgb,var(--no) 25%,var(--panel2));animation:shake .3s}
.ss-keys button.ok{border-color:var(--ok);background:color-mix(in srgb,var(--ok) 25%,var(--panel2))}
.ss-last{min-height:1.5em;margin-top:10px;text-align:center;font-weight:700;color:var(--muted);font-size:clamp(14px,3.2vw,17px)}
.ss-last b{color:var(--gold)}
`;
  Edu.game({
    id: 'spelling-sprint', levels: LV,
    how: ['Read the clue and fill in the missing letters: tap a letter or type it on your keyboard.', 'On Hard, pick the one correct spelling: tap it or press 1 to 4.',
      `Each word you spell right moves your runner over a hurdle. Reach the finish (${GOAL} words) before the clock's pacer does.`,
      'A wrong letter shows you the right spelling, costs 3 seconds, and the word does not count.'],
    start(c) {
      const L = c.L, hard = c.level === 2, pool = shuffle(SPELL[c.level]);
      c.el.style.justifyContent = 'flex-start';
      c.el.append(h('style', { text: CSS }));
      const me = h('div', { class: 'ss-run me' }, h('small', { text: 'YOU' }), h('b', { text: '🏃' })), pace = h('div', { class: 'ss-run pace' }, h('small', { text: 'CLOCK' }), h('b', { text: '🏃' }));
      const hurdles = [...Array(GOAL - 1)].map((_, i) => h('div', { class: 'ss-hur', style: { left: `calc(${(i + 1) / GOAL} * (100% - 60px) + 20px)` } }));
      const track = h('div', { class: 'ss-track' }, hurdles, h('div', { class: 'ss-fin' }), pace, me);
      const area = h('div', { style: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' } }), last = h('div', { class: 'ss-last' });
      c.el.append(track, h('div', { style: { flex: '1', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '4vh' } }, area, last));
      c.got = 0; c.missed = []; let qi = 0;
      const S = c.S = { busy: true };
      const T = c.timer(L.sec, () => { T.paused = true; end(false); });
      const move = (el, f) => { el.style.left = `calc(${Math.min(1, f)} * (100% - 60px) + 2px)`; };
      c.every(200, () => move(pace, 1 - T.left() / L.sec));
      c.hud({ words: '0 / ' + GOAL });
      const rel = el => { const r = el.getBoundingClientRect(), s = c.el.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top]; };

      function next() {
        if (!c.alive) return; area.innerHTML = ''; S.busy = false;
        const it = pool[qi++ % pool.length].split('|');
        if (hard) {
          const [word, wrongs, clue] = it, opts = shuffle([word, ...wrongs.split(' ')]);
          Object.assign(S, { word, opts, hard: true, tip: '' });
          area.append(h('div', { class: 'ss-clue', style: { marginTop: 'clamp(16px,4vh,34px)' } }, h('b', { text: 'Clue: ' }), clue), h('div', { class: 'sub', text: 'Which spelling is correct?', style: { marginTop: '6px' } }));
          S.ch = c.choices(area, opts, (i, b) => {
            if (S.busy) return; S.busy = true; S.ch.lock(); const [x, y] = rel(b);
            if (opts[i] === word) { S.ch.mark(i, true); good(x, y); }
            else { S.ch.mark(i, false); S.ch.mark(opts.indexOf(word), true); bad(x, y); }
          }, { cols: 2 });
        } else {
          const [pat, wrongs, clue, tip] = it, word = pat.replace(/[[\]]/g, ''), blanks = [], cells = [];
          let j = 0; for (const m of pat.matchAll(/\[(.)\]|(.)/g)) { if (m[1]) blanks.push(j); cells.push(m[1] || m[2]); j++; }
          Object.assign(S, { word, blanks, cells, at: 0, hard: false, tip: tip || '', keys: shuffle([...new Set([...blanks.map(b => word[b]), ...wrongs.split(' ')])]) });
          S.spans = cells.map((ch, k) => h('span', { class: blanks.includes(k) ? 'gap' : '', text: blanks.includes(k) ? '' : ch }));
          area.append(h('div', { class: 'ss-word' }, S.spans), h('div', { class: 'ss-clue' }, h('b', { text: 'Clue: ' }), clue));
          S.btns = S.keys.map((k, i) => h('button', { type: 'button', text: k, style: { animationDelay: i * 40 + 'ms' }, 'aria-label': 'Letter ' + k, onclick: () => pick(k, S.btns[i]) }));
          area.append(h('div', { class: 'ss-keys' }, S.btns)); mark();
        }
      }
      function mark() { S.spans.forEach((s, k) => s.classList.toggle('cur', k === S.blanks[S.at])); }
      function pick(k, b) {
        if (S.busy || S.hard) return; const bi = S.blanks[S.at], [x, y] = rel(b || S.spans[bi]);
        if (k === S.word[bi]) {
          const sp = S.spans[bi]; sp.textContent = k; sp.className = 'got'; S.at++; sfx.click();
          if (b) { b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 250); }
          if (S.at >= S.blanks.length) { S.busy = true; good(x, y); } else mark();
        } else {
          S.busy = true; if (b) b.classList.add('no');
          S.blanks.forEach((bj, n) => { if (n >= S.at) { S.spans[bj].textContent = S.word[bj]; S.spans[bj].className = 'miss'; } });
          bad(x, y);
        }
      }
      function good(x, y) {
        c.got++; c.right(10 + c.level * 5, x, y); c.hud({ words: c.got + ' / ' + GOAL });
        move(me, c.got / GOAL); me.classList.remove('jump'); void me.offsetWidth; me.classList.add('jump');
        if (hurdles[c.got - 1]) hurdles[c.got - 1].classList.add('down');
        last.innerHTML = ''; last.append('✔ ', h('b', { text: S.word }), S.tip ? ' · ' + S.tip : '');
        if (c.got >= GOAL) { T.paused = true; return c.after(600, () => end(true)); }
        c.after(450, next);
      }
      function bad(x, y) {
        c.wrong(x, y, '−3 s'); T.add(-3); me.classList.remove('trip'); void me.offsetWidth; me.classList.add('trip');
        if (!c.missed.includes(S.word)) c.missed.push(S.word);
        last.innerHTML = ''; last.append('✘ The right spelling is ', h('b', { text: S.word }), S.tip ? ' · ' + S.tip : '');
        c.after(750, next);
      }
      function end(won) {
        c.end({ won, title: won ? 'You won the sprint!' : "Time's up!", emoji: won ? '🥇' : '⏱️',
          msg: won ? `${GOAL} words spelled before the clock caught you.` : `Spell ${GOAL} words before the time runs out to clear the level.`, stats: { 'Words spelled': c.got + ' / ' + GOAL },
          learnt: c.missed.length ? c.missed.slice(0, 6).map(w => { const e = SPELL[c.level].find(s => s.replace(/[[\]]/g, '').split('|')[0] === w).split('|'); return w + (e[3] ? ' (' + e[3] + ')' : ''); })
            : ['i before e, except after c: believe, achieve, but receive, ceiling.', 'Watch for double letters: embarrass, accommodate, necessary has one c and two s\'s.', 'Some letters are silent: the k in knife, the w in write, the t in castle.'] });
      }
      c.key(e => {
        if (S.busy || S.hard || e.ctrlKey || e.metaKey || e.altKey || !/^[a-z]$/i.test(e.key)) return;
        const k = e.key.toLowerCase(), i = S.keys.indexOf(k); pick(k, i >= 0 ? S.btns[i] : null);
      });
      next();
    },
    bot(c) {
      const S = c.S; if (!S || S.busy) return;
      if (S.hard) S.ch.btns[S.opts.indexOf(S.word)].click(); else { const k = S.word[S.blanks[S.at]]; S.btns[S.keys.indexOf(k)].click(); }
    },
    miss(c) {
      const S = c.S; if (!S || S.busy) return;
      if (S.hard) S.ch.btns[S.opts.findIndex(o => o !== S.word)].click(); else { const k = S.word[S.blanks[S.at]]; S.btns[S.keys.findIndex(x => x !== k)].click(); }
    }
  });
})();
