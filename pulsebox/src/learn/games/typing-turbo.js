/* Typing Turbo: a top-down race against three rival cars. Type the word (or sentence) shown: every correct letter moves
   your car, every clean word fires a nitro boost, and a typo must be fixed before you can go on. Cross the line first. */
// @data typing-words
(() => {
  const { h, shuffle, clamp, sfx } = Edu;
  const LV = [
    { name: 'Easy', desc: 'Short everyday words. Rivals cruise at 8 to 14 words a minute.', dist: 120, wpm: [8, 11, 14] },
    { name: 'Medium', desc: 'Longer words. Rivals race at 14 to 24 words a minute.', dist: 190, wpm: [14, 19, 24] },
    { name: 'Hard', desc: 'Whole sentences with capitals, spaces and punctuation. Rivals at 20 to 32 wpm.', dist: 230, wpm: [20, 26, 32] }
  ];
  const PX = 40, COLS = ['#29e0ff', '#ffd23f', '#a98bff'], NAMES = ['Bolt', 'Comet', 'Blaze'], LANES = [0, 2, 3];
  const ORD = ['1st', '2nd', '3rd', '4th'];
  const CSS = `
.tt-road{position:relative;width:100%;flex:1 1 auto;min-height:140px;max-height:46vh;border-radius:16px;overflow:hidden;background:#1d6b3a;border:1px solid var(--edge)}
.tt-road canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.tt-cd{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;font:700 clamp(48px,12vw,96px) var(--display);color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.7)}
.tt-cd span{animation:ttpop .6s ease both}
@keyframes ttpop{from{transform:scale(2.2);opacity:0}30%{opacity:1}to{transform:scale(.9)}}
.tt-pan{width:min(100%,760px);display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:10px}
.tt-word{font:700 clamp(30px,8vw,56px) var(--display);letter-spacing:.04em;min-height:1.2em;text-align:center;white-space:pre-wrap;line-height:1.25}
.tt-word.sen{font-size:clamp(19px,4.6vw,30px);letter-spacing:.02em;padding:8px 12px;border-radius:14px;background:var(--bg2);border:1px solid var(--edge)}
.tt-word i{font-style:normal;color:#e9ecf5;border-bottom:3px solid transparent;transition:color .1s}
.tt-word i.ok{color:var(--ok)}
.tt-word i.cur{border-bottom-color:var(--c);animation:ttblink 1s steps(2) infinite}
.tt-word i.bad{color:#fff;background:var(--no);border-radius:4px}
.tt-word i.sp{display:inline-block;min-width:.4em}
@keyframes ttblink{50%{border-bottom-color:transparent}}
.tt-next{color:var(--muted);font:600 clamp(14px,3.4vw,18px) var(--body);min-height:1.3em;text-align:center}
.tt-inp{width:min(100%,460px);font-size:clamp(18px,4.4vw,24px);padding:10px 14px}
.tt-inp.bad{border-color:var(--no);animation:shake .3s}
`;
  Edu.game({
    id: 'typing-turbo', levels: LV,
    how: ['Type the word under the track. Letters turn green as you type them right.', 'A typo turns red: press Backspace and fix it before you can go on.',
      'Every correct letter drives your car forward, and every word with no typo fires a nitro boost.',
      'Beat the three rival cars to the finish line. Your speed (WPM) and accuracy show at the top.', 'On a phone or tablet, tap the track to bring up the keyboard.'],
    start(c) {
      const L = c.L, sen = c.level === 2, words = shuffle(TYPING[c.level]);
      c.el.style.justifyContent = 'flex-start';
      c.el.append(h('style', { text: CSS }));
      const road = h('div', { class: 'tt-road' }), cv = h('canvas'), cd = h('div', { class: 'tt-cd' });
      road.append(cv, cd);
      const wordEl = h('div', { class: 'tt-word' + (sen ? ' sen' : '') }), nextEl = h('div', { class: 'tt-next' });
      const inp = h('input', { class: 'inp tt-inp', 'data-own': '1', type: 'text', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'next', placeholder: 'Get ready…', 'aria-label': 'Type the word shown' });
      c.el.append(road, h('div', { class: 'tt-pan' }, wordEl, inp, nextEl));
      const g = cv.getContext('2d'); let W = 0, H = 0;
      const fit = () => { const r = road.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); if (Math.abs(r.width - W) < 1 && Math.abs(r.height - H) < 1) return; W = r.width; H = r.height; cv.width = Math.round(W * d); cv.height = Math.round(H * d); g.setTransform(d, 0, 0, d, 0, 0); };
      // race state
      const me = { p: 0, x: 0, v: 0, boost: 0, lane: 1, col: '#ff2e88', name: 'YOU' };
      const rivals = L.wpm.map((w, i) => ({ p: 0, x: 0, cps: w * 5 / 60, lane: LANES[i], col: COLS[i], name: NAMES[i], ph: Math.random() * 6, fin: 0 }));
      const S = c.S = { racing: false, done: false, T: '', k: 0, maxK: 0, prev: '', wi: 0, wordTypo: false, good: 0, typos: 0, t0: 0, words: 0, clean: 0, missed: new Set() };
      const parts = []; let shake = 0;
      c.inp = inp;
      const focus = () => { try { inp.focus({ preventScroll: true }); } catch (e) {} };
      c.on(road, 'click', focus); c.on(wordEl, 'click', focus);
      c.on(inp, 'keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
      focus();

      function setTarget() {
        S.T = words[S.wi % words.length]; S.wi++; S.k = 0; S.maxK = 0; S.prev = ''; inp.value = ''; S.wordTypo = false;
        nextEl.textContent = sen ? 'Next: ' + words[S.wi % words.length] : words.slice(S.wi % words.length, S.wi % words.length + 3).join('   ');
        if (!sen) nextEl.textContent = 'Next: ' + nextEl.textContent;
        paint(false);
      }
      function paint(bad) {
        wordEl.innerHTML = '';
        [...S.T].forEach((ch, i) => wordEl.append(h('i', { class: (ch === ' ' ? 'sp ' : '') + (i < S.k ? 'ok' : i === S.k ? (bad ? 'bad' : 'cur') : ''), text: ch })));
        inp.classList.toggle('bad', !!bad);
      }
      const pos = () => { const r = wordEl.getBoundingClientRect(), s = c.el.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top]; };
      function wordDone(len) {
        S.words++; const [x, y] = pos();
        if (!S.wordTypo) { S.clean++; c.right(4 + len, x, y); me.p += 1.5; me.boost = .7; sfx.pop(); }
        else { c.add(2, x, y); me.p += .5; }
        S.wordTypo = false;
      }
      function onInput() {
        if (!S.racing) { inp.value = ''; return; }
        let v = inp.value.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
        if (!sen) v = v.replace(/^\s+/, '');
        const T = S.T; let k = 0; while (k < v.length && k < T.length && v[k] === T[k]) k++;
        if (v.length > k + 1) v = v.slice(0, k + 1);          // a typo must be fixed first: nothing after it is kept
        const typo = v.length > k, grew = v.length > S.prev.length;
        if (v !== inp.value) inp.value = v;
        if (k > S.maxK) {                                        // new ground covered
          for (let i = S.maxK; i < k; i++) { S.good++; me.p += 1; if (sen && T[i] === ' ') wordDone(i - T.lastIndexOf(' ', i - 1) - 1); }
          S.maxK = k;
        }
        if (typo && grew) {
          S.typos++; shake = .3; const [x, y] = pos();
          S.missed.add(sen ? T.slice(T.lastIndexOf(' ', k - 1) + 1).split(' ')[0] : T);
          if (!S.wordTypo) { S.wordTypo = true; c.wrong(x, y, 'typo!'); } else sfx.bad();
        }
        S.k = k; S.prev = v; paint(typo);
        if (k === T.length) {                                    // finished this word / sentence
          if (sen) { const last = T.slice(T.lastIndexOf(' ') + 1); wordDone(last.length); } else wordDone(T.length);
          if (me.p >= L.dist) return finish();
          setTarget();
        }
        if (me.p >= L.dist) finish();
      }
      c.on(inp, 'input', onInput);

      // 3, 2, 1, GO!
      const say = (t, col) => { cd.innerHTML = ''; cd.append(h('span', { text: t, style: { color: col } })); };
      setTarget(); wordEl.style.opacity = .45;
      say('3', '#ff4d5e'); sfx.tick();
      c.after(700, () => { say('2', '#ff9f1c'); sfx.tick();
        c.after(700, () => { say('1', '#ffd23f'); sfx.tick();
          c.after(700, () => { say('GO!', '#3ddc84'); Edu.tone(880, .3, 'triangle', .12); S.racing = true; S.t0 = performance.now(); inp.placeholder = 'Type here…'; wordEl.style.opacity = 1; focus();
            c.after(600, () => { cd.innerHTML = ''; }); }); }); });

      const place = () => 1 + rivals.filter(r => r.p > me.p).length;
      const wpm = () => { const m = (performance.now() - S.t0) / 60000; return m > .02 ? Math.round(S.good / 5 / m) : 0; };
      const acc = () => S.good + S.typos ? Math.round(S.good / (S.good + S.typos) * 100) : 100;
      c.hud({ WPM: 0, Acc: '100%', Place: '–' });
      c.every(400, () => { if (S.racing) c.hud({ WPM: wpm(), Acc: acc() + '%', Place: ORD[place() - 1] }); });

      let lateTimer = null;
      function finish(dnf) {
        if (S.done) return; S.done = true; S.racing = false; inp.blur(); inp.disabled = true;
        const pl = dnf ? 4 : 1 + rivals.filter(r => r.p >= L.dist).length, w = wpm(), a = acc();
        if (!dnf) { c.add([120, 70, 40, 15][pl - 1] * (1 + c.level * .5), W * .5, 40, '#ffd23f'); say(ORD[pl - 1] + '!', pl === 1 ? '#ffd23f' : '#fff'); if (pl === 1) sfx.win(); }
        else say('Out of time', '#ff4d5e');
        const tips = ['Keep your fingers on the home row: A S D F for the left hand, J K L ; for the right.', 'Accuracy first: fixing a typo costs more time than typing a little slower.',
          'Keep your eyes on the words, not on the keys.'];
        if (sen) tips.push('Sentences start with a capital letter (hold Shift) and end with . ! or ?');
        const miss = [...S.missed].slice(0, 5);
        if (miss.length) tips.push('Practice these: ' + miss.join(', '));
        c.after(800, () => c.end({ won: pl === 1, emoji: pl === 1 ? '🏆' : pl <= 3 ? '🏁' : '🚗', title: dnf ? 'Out of time!' : pl === 1 ? 'You won the race!' : ORD[pl - 1] + ' place',
          msg: pl === 1 ? `First across the line at ${w} words a minute.` : `Finish first to clear the level. You typed ${w} words a minute.`,
          stats: { WPM: w, 'Key accuracy': a + '%', Place: dnf ? 'DNF' : ORD[pl - 1], 'Clean words': S.clean + ' / ' + S.words }, learnt: tips }));
      }

      // the track
      c.loop((dt, t) => {
        fit(); if (!W) return;
        if (S.racing) for (const r of rivals) if (r.p < L.dist) { r.p = Math.min(L.dist, r.p + r.cps * dt * (1 + .12 * Math.sin(t * 1.3 + r.ph))); if (r.p >= L.dist) r.fin = 1; }
        if (S.racing && !lateTimer && rivals.every(r => r.p >= L.dist)) { lateTimer = c.timer(15, () => finish(true)); c.pop('Last rival is home: 15 s left!', W / 2, 60, '#ff9f1c'); }
        const ox = me.x; me.x += (me.p * PX - me.x) * Math.min(1, dt * 5); me.v = (me.x - ox) / Math.max(dt, .001);
        for (const r of rivals) r.x = r.p * PX;
        me.boost = Math.max(0, me.boost - dt); shake = Math.max(0, shake - dt);
        draw(t, dt);
      });

      function car(x, y, len, wid, col, name, t, boost, isMe) {
        g.save(); g.translate(x, y + Math.sin(t * 18 + x) * .6);
        if (boost > 0) { const fl = len * (.35 + Math.random() * .25); g.fillStyle = '#ff9f1c'; g.beginPath(); g.moveTo(-len / 2, -wid * .25); g.lineTo(-len / 2 - fl, 0); g.lineTo(-len / 2, wid * .25); g.fill(); g.fillStyle = '#fff3a8'; g.beginPath(); g.moveTo(-len / 2, -wid * .12); g.lineTo(-len / 2 - fl * .5, 0); g.lineTo(-len / 2, wid * .12); g.fill(); }
        g.fillStyle = '#0b0d12'; for (const sx of [-.3, .28]) for (const sy of [-1, 1]) g.fillRect(len * sx - len * .1, sy < 0 ? -wid * .52 : wid * .38, len * .2, wid * .14);
        g.fillStyle = col; rr(-len / 2, -wid * .42, len, wid * .84, wid * .3); g.fill();
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-len * .5, -wid * .07, len, wid * .14);
        g.fillStyle = '#111a2a'; rr(len * .02, -wid * .3, len * .22, wid * .6, wid * .12); g.fill();
        g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(len * .42, -wid * .32, len * .05, wid * .14); g.fillRect(len * .42, wid * .18, len * .05, wid * .14);
        g.restore();
        g.font = `700 ${Math.max(10, wid * .42)}px Barlow, system-ui, sans-serif`; g.textAlign = 'center'; g.fillStyle = isMe ? '#fff' : 'rgba(255,255,255,.8)';
        g.fillText(name, x - len * .05, y - wid * .55);
      }
      function rr(x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function draw(t, dt) {
        const top = Math.round(H * .2), bot = Math.round(H * .9), rh = bot - top, lh = rh / 4, fx = L.dist * PX;
        let cam = me.x - W * .3; cam = Math.max(-W * .12, cam);
        const sx = shake > 0 ? (Math.random() - .5) * 6 : 0;
        g.save(); g.translate(sx, 0);
        g.fillStyle = '#1d6b3a'; g.fillRect(-10, 0, W + 20, H);
        g.fillStyle = '#227a43'; for (let k = Math.floor(cam / 60) - 1; k * 60 - cam < W + 60; k++) if (k % 2) g.fillRect(k * 60 - cam, 0, 60, H);
        // trees and bushes on the verges
        for (let k = Math.floor((cam - 100) / 170); k * 170 - cam < W + 100; k++) {
          const x = k * 170 - cam + ((k * 73) % 50), big = (k * 37) % 3;
          g.fillStyle = '#145a2f'; g.beginPath(); g.arc(x + 60, bot + (H - bot) * .55, 4 + big, 0, 7); g.fill();
        }
        // road, kerbs and lane lines
        g.fillStyle = '#2a2e3b'; g.fillRect(-10, top, W + 20, rh);
        for (let k = Math.floor(cam / 24); k * 24 - cam < W; k++) { g.fillStyle = k % 2 ? '#ff4d5e' : '#f4f4f4'; g.fillRect(k * 24 - cam, top - 5, 24, 5); g.fillRect(k * 24 - cam, bot, 24, 5); }
        g.fillStyle = 'rgba(255,255,255,.45)';
        for (let ln = 1; ln < 4; ln++) for (let k = Math.floor(cam / 50); k * 50 - cam < W; k++) g.fillRect(k * 50 - cam, top + lh * ln - 1, 26, 2);
        // start and finish lines
        g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(-cam - 2, top, 4, rh);
        const sq = rh / 10; for (let i = 0; i < 10; i++) for (let j = 0; j < 3; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#fff'; g.fillRect(fx - cam + j * sq, top + i * sq, sq, sq); }
        // speed lines
        if (me.v > 260) { g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { const y = top + ((i * 53 + t * 900) % rh), x = (i * 157 + t * -1400) % W; g.beginPath(); g.moveTo((x + W) % W, y); g.lineTo((x + W) % W + 40, y); g.stroke(); } }
        // exhaust puffs
        if (S.racing && Math.random() < .5) { const r = Math.random() < .4 ? me : rivals[Math.floor(Math.random() * 3)]; parts.push({ x: r.x - Math.min(76, lh * 1.8) / 2, y: top + lh * (r.lane + .5), a: .5, s: 3 }); }
        for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.a -= dt * .9; p.s += dt * 10; p.x -= dt * 30; if (p.a <= 0) { parts.splice(i, 1); continue; } g.fillStyle = `rgba(200,205,220,${p.a * .5})`; g.beginPath(); g.arc(p.x - cam, p.y, p.s, 0, 7); g.fill(); }
        // cars
        const len = Math.min(76, lh * 1.8), wid = Math.min(34, lh * .66);
        for (const r of rivals) { const x = r.x - cam; if (x > -len && x < W + len) car(x, top + lh * (r.lane + .5), len, wid, r.col, r.name, t, 0, false); }
        car(me.x - cam, top + lh * (me.lane + .5), len, wid, me.col, me.name, t, me.boost, true);
        // rivals off screen: arrows at the edge
        g.font = '700 11px Barlow, system-ui, sans-serif';
        for (const r of rivals) { const x = r.x - cam, y = top + lh * (r.lane + .5);
          if (x > W + len / 2) { g.fillStyle = r.col; g.beginPath(); g.moveTo(W - 4, y); g.lineTo(W - 16, y - 8); g.lineTo(W - 16, y + 8); g.fill(); g.textAlign = 'right'; g.fillText('+' + Math.round((r.x - me.x) / PX) + 'm', W - 20, y + 4); }
          else if (x < -len / 2) { g.fillStyle = r.col; g.beginPath(); g.moveTo(4, y); g.lineTo(16, y - 8); g.lineTo(16, y + 8); g.fill(); g.textAlign = 'left'; g.fillText('−' + Math.round((me.x - r.x) / PX) + 'm', 20, y + 4); } }
        g.restore();
        // the mini map along the top
        const mx = 14, mw = W - 28, my = Math.max(10, top * .45);
        g.fillStyle = 'rgba(0,0,0,.35)'; rr(mx - 6, my - 7, mw + 12, 14, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(mx, my - 1, mw, 2);
        g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillText('🏁', mx + mw, my + 4);
        for (const r of [...rivals, me]) { g.fillStyle = r.col; g.beginPath(); g.arc(mx + mw * clamp(r.x / PX / L.dist, 0, 1), my, r === me ? 6 : 4.5, 0, 7); g.fill(); if (r === me) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); } }
      }
    },
    bot(c) {
      const S = c.S, inp = c.inp; if (!S || !S.racing) return;
      inp.value = inp.value.length > S.k ? inp.value.slice(0, S.k) : S.T.slice(0, S.k + 1);
      inp.dispatchEvent(new Event('input'));
    },
    miss(c) {
      const S = c.S, inp = c.inp; if (!S || !S.racing || inp.value.length > S.k) return;
      inp.value = S.T.slice(0, S.k) + (S.T[S.k] === 'q' ? 'z' : 'q'); inp.dispatchEvent(new Event('input'));
    }
  });
})();
