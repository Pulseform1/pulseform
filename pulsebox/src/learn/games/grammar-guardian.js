/* Grammar Guardian: goblins march on the castle, each carrying a sentence with one grammar mistake. Pick a goblin, tap
   the wrong word, then choose the fix: the castle zaps it. A wrong fix, or a goblin that reaches the gate, costs castle HP. */
// @data grammar-sentences
(() => {
  const { h, shuffle, sample, sfx, clamp } = Edu, SP = Edu.SPEED, HP = 5;
  const LV = [
    { name: 'Easy', desc: 'their / there / they\'re, your / you\'re, its / it\'s, to / too / two.', waves: [4, 5, 6], cross: [34, 29, 24] },
    { name: 'Medium', desc: 'Verbs that agree, irregular past tenses and tricky plurals.', waves: [4, 5, 6], cross: [32, 27, 22] },
    { name: 'Hard', desc: 'Apostrophes, fewer / less, who / whom, adverbs, me / I.', waves: [4, 5, 6], cross: [34, 28, 23] }
  ];
  const KINDS = [['#5fd35f', '#2e8b3e'], ['#b07bff', '#6a3fc0'], ['#ff7a59', '#b8432a'], ['#4fc3f7', '#1f7fae']];
  const goblin = ([a, b]) => `<svg viewBox="0 0 60 64" aria-hidden="true"><g class="gg-legs"><rect class="l1" x="20" y="48" width="7" height="14" rx="3" fill="${b}"/><rect class="l2" x="33" y="48" width="7" height="14" rx="3" fill="${b}"/></g>`
    + `<path d="M14 18 L6 4 L22 13Z M46 18 L54 4 L38 13Z" fill="${b}"/><ellipse cx="30" cy="32" rx="20" ry="19" fill="${a}"/><ellipse cx="30" cy="38" rx="12" ry="9" fill="${b}" opacity=".35"/>`
    + `<circle cx="23" cy="28" r="5" fill="#fff"/><circle cx="37" cy="28" r="5" fill="#fff"/><circle cx="22" cy="29" r="2.4" fill="#111"/><circle cx="36" cy="29" r="2.4" fill="#111"/>`
    + `<path d="M23 40 Q30 44 37 40" stroke="#111" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M26 41 l2 3 l2-3" fill="#fff"/>`
    + `<rect x="44" y="30" width="15" height="12" rx="2" fill="#f3e2b3" stroke="#8a6d3b" stroke-width="1.5"/><path d="M47 34h9M47 38h7" stroke="#8a6d3b" stroke-width="1.3"/></svg>`;
  const FIELD = `<svg viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="ggsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b7fd6"/><stop offset="1" stop-color="#9fc4ff"/></linearGradient></defs>`
    + `<rect width="400" height="200" fill="url(#ggsky)"/><path d="M0 90 Q60 50 120 84 T260 76 T400 70 V200 H0Z" fill="#3f8f4f"/><path d="M0 110 Q90 80 190 108 T400 96 V200 H0Z" fill="#4caf5f"/>`
    + `<path d="M0 126 H400 V184 H0Z" fill="#c9a46a"/><path d="M0 126 H400" stroke="#a88552" stroke-width="3"/><path d="M0 184 H400" stroke="#a88552" stroke-width="3"/>`
    + `<g fill="#2f7a3c"><circle cx="300" cy="96" r="12"/><circle cx="330" cy="100" r="9"/><circle cx="210" cy="104" r="10"/><circle cx="380" cy="92" r="11"/></g><g fill="#fff" opacity=".8"><ellipse cx="90" cy="26" rx="26" ry="8"/><ellipse cx="300" cy="34" rx="34" ry="9"/></g></svg>`;
  const CASTLE = `<svg viewBox="0 0 100 120" aria-hidden="true"><path d="M50 2 V22" stroke="#555" stroke-width="2"/><path d="M50 3 L72 9 L50 15Z" fill="#ff5a3a"/>`
    + `<rect x="8" y="40" width="84" height="78" fill="#b9bfcc"/><rect x="0" y="28" width="28" height="90" fill="#cfd4de"/><rect x="72" y="28" width="28" height="90" fill="#cfd4de"/><rect x="36" y="20" width="28" height="44" fill="#cfd4de"/>`
    + `<g fill="#cfd4de"><rect x="0" y="20" width="7" height="9"/><rect x="11" y="20" width="7" height="9"/><rect x="21" y="20" width="7" height="9"/><rect x="72" y="20" width="7" height="9"/><rect x="82" y="20" width="7" height="9"/><rect x="93" y="20" width="7" height="9"/><rect x="36" y="13" width="7" height="8"/><rect x="47" y="13" width="7" height="8"/><rect x="57" y="13" width="7" height="8"/></g>`
    + `<path d="M36 118 V92 a14 14 0 0 1 28 0 V118Z" fill="#5a3b22"/><rect x="10" y="50" width="8" height="14" rx="4" fill="#3a4152"/><rect x="82" y="50" width="8" height="14" rx="4" fill="#3a4152"/><circle cx="50" cy="36" r="6" fill="#ffd23f" class="gg-orb"/></svg>`;
  const CSS = `
.gg-field{position:relative;width:100%;flex:none;height:clamp(160px,32vh,280px);border-radius:16px;overflow:hidden;border:1px solid var(--edge)}
.gg-field>svg{position:absolute;inset:0;width:100%;height:100%}
.gg-castle{position:absolute;left:0;bottom:4%;width:clamp(74px,16%,130px);aspect-ratio:100/120;z-index:3;transition:transform .1s}
.gg-castle.hit{animation:shake .4s;filter:drop-shadow(0 0 12px #ff4d5e)}
.gg-castle .gg-orb{animation:ggorb 1.4s ease-in-out infinite}
@keyframes ggorb{50%{opacity:.55}}
.gg-en{position:absolute;width:clamp(44px,9%,64px);aspect-ratio:60/64;z-index:4;cursor:pointer;transform:translate(-50%,-100%);padding:0;transition:filter .15s}
.gg-en svg{width:100%;height:100%;display:block;overflow:visible}
.gg-en .l1{animation:ggleg .5s ease-in-out infinite;transform-origin:23px 48px}.gg-en .l2{animation:ggleg .5s ease-in-out infinite reverse;transform-origin:36px 48px}
@keyframes ggleg{50%{transform:rotate(18deg)}}
.gg-en>b{position:absolute;left:50%;top:-14px;transform:translateX(-50%);min-width:22px;height:22px;border-radius:11px;background:#10131c;color:#fff;font:700 13px/22px var(--display);text-align:center;border:2px solid #fff}
.gg-en.sel{filter:drop-shadow(0 0 6px #ffd23f) drop-shadow(0 0 2px #fff)}
.gg-en.sel>b{background:#ffd23f;color:#111}
.gg-en.lunge{transition:left .25s ease-out}
.gg-en.dead{animation:ggdie .45s ease forwards;pointer-events:none}
@keyframes ggdie{to{transform:translate(-50%,-140%) scale(.2) rotate(200deg);opacity:0}}
.gg-zap{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5}
.gg-banner{position:absolute;left:50%;top:22%;transform:translateX(-50%);z-index:6;font:700 clamp(26px,6vw,44px) var(--display);color:#fff;text-shadow:0 3px 12px rgba(0,0,0,.6);animation:pop .4s both;white-space:nowrap;pointer-events:none}
.gg-pan{width:min(100%,780px);margin-top:12px;display:flex;flex-direction:column;align-items:center;flex:1;min-height:0}
.gg-who{color:var(--muted);font-weight:700;text-align:center;font-size:clamp(14px,3.2vw,16px)}
.gg-who b{color:var(--gold)}
.gg-sen{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:8px 0 2px}
.gg-sen button{min-height:44px;padding:6px 11px;border-radius:12px;background:var(--panel2);border:2px solid var(--edge);font:700 clamp(17px,3.8vw,22px) var(--body);transition:transform .1s,border-color .15s,background .15s}
.gg-sen button:hover,.gg-sen button.kb{border-color:var(--c);transform:translateY(-2px)}
.gg-sen button.no{border-color:var(--no);background:color-mix(in srgb,var(--no) 25%,var(--panel2));animation:shake .3s}
.gg-sen button.pick{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 22%,var(--panel2))}
.gg-sen button:disabled{opacity:1;cursor:default}
.gg-pan .opts{margin-top:10px}
.gg-pan .opt{min-height:52px}
.gg-log{min-height:1.4em;margin-top:8px;text-align:center;color:var(--muted);font-weight:700;font-size:clamp(13px,3vw,16px)}
.gg-log b{color:var(--ok)}.gg-log em{color:var(--gold);font-style:normal}
`;
  Edu.game({
    id: 'grammar-guardian', levels: LV,
    how: ['Goblins march on your castle. Each one carries a sentence with one grammar mistake.', 'Tap a goblin (or press its number), then tap the wrong word in its sentence.',
      'Choose the right word to fix it, and the castle zaps the goblin.', 'A wrong fix, or a goblin that reaches the gate, costs the castle one heart. Survive three waves!'],
    start(c) {
      const L = c.L, pool = shuffle(GRAMMAR[c.level]);
      c.el.style.justifyContent = 'flex-start';
      c.el.append(h('style', { text: CSS }));
      const field = h('div', { class: 'gg-field', html: FIELD }), castle = h('div', { class: 'gg-castle', html: CASTLE });
      const zap = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); zap.setAttribute('class', 'gg-zap');
      field.append(castle, zap);
      const who = h('div', { class: 'gg-who' }), sen = h('div', { class: 'gg-sen' }), optBox = h('div', { style: { width: '100%', display: 'flex', justifyContent: 'center' } }), log = h('div', { class: 'gg-log' });
      c.el.append(field, h('div', { class: 'gg-pan' }, who, sen, optBox, log));
      c.lives(HP);
      const total = L.waves.reduce((a, b) => a + b, 0);
      const S = c.S = { en: [], sel: null, stage: 'word', wave: 0, spawned: 0, inWave: 0, clock: 0, next: 0, pause: 0, done: 0, zapped: 0, qi: 0, missedTips: new Set(), over: false, cursor: 0 };
      c.hud({ wave: '1 / ' + L.waves.length });
      const fx = () => castle.getBoundingClientRect().width / field.getBoundingClientRect().width + .04;   // where the gate is (fraction of the field)
      const lanes = [.72, .82, .92];

      function spawn() {
        const raw = pool[S.qi++ % pool.length], toks = raw[0].split(' '), bi = toks.findIndex(t => /^\*.+\*[^*]*$/.test(t));
        const m = toks[bi].match(/^\*(.+)\*([^*]*)$/), words = toks.map((t, i) => i === bi ? m[1] + m[2] : t);
        const used = new Set(S.en.map(e => e.n)); let n = 1; while (used.has(n)) n++;
        const e = { n, words, bi, tail: m[2], wrongW: m[1], fix: raw[1], alts: [raw[2], raw[3]], tip: raw[4], p: 0, lane: lanes[S.spawned % 3], speed: 1 / L.cross[S.wave] };
        e.el = h('button', { class: 'gg-en', type: 'button', 'aria-label': 'Goblin ' + n, html: goblin(KINDS[S.spawned % 4]), onclick: () => select(e) });
        e.el.prepend(h('b', { text: String(n) }));
        field.append(e.el); S.en.push(e); S.spawned++; S.inWave++; place(e);
        if (!S.sel) select(e);
      }
      function place(e) { const f = fx(); e.el.style.left = (f + (1 - e.p) * (.97 - f)) * 100 + '%'; e.el.style.top = e.lane * 100 + '%'; e.el.style.zIndex = 4 + Math.round(e.lane * 10); }
      function select(e) {
        if (S.over || !S.en.includes(e)) return; S.sel = e; S.stage = 'word'; S.cursor = 0;
        S.en.forEach(x => x.el.classList.toggle('sel', x === e)); sfx.click();
        who.innerHTML = ''; who.append('Goblin ', h('b', { text: '#' + e.n }), ' says… tap the wrong word');
        sen.innerHTML = ''; optBox.innerHTML = ''; S.ch = null;
        e.btns = e.words.map((w, i) => h('button', { type: 'button', text: w, onclick: () => tapWord(e, i) }));
        sen.append(...e.btns);
      }
      const at = el => { const r = el.getBoundingClientRect(), s = c.el.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top]; };
      function tapWord(e, i) {
        if (S.over || S.sel !== e || S.stage !== 'word') return; const b = e.btns[i];
        if (i !== e.bi) { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); const [x, y] = at(b); c.wrong(x, y, 'Not that one'); e.p = Math.min(.97, e.p + .12); e.el.classList.add('lunge'); place(e); c.after(260, () => e.el.classList.remove('lunge')); return; }
        S.stage = 'fix'; b.classList.add('pick'); e.btns.forEach(x => x.disabled = true); sfx.pop();
        who.innerHTML = ''; who.append('Replace ', h('b', { text: '"' + e.wrongW + '"' }), ' with…');
        e.opts = shuffle([e.fix, ...e.alts]);
        S.ch = c.choices(optBox, e.opts, k => fixWith(e, k), { cols: 3 });
      }
      function fixWith(e, k) {
        if (S.over || S.sel !== e || S.stage !== 'fix') return; S.stage = 'busy'; S.ch.lock();
        const ok = e.opts[k] === e.fix, right = e.words.map((w, i) => i === e.bi ? e.fix + e.tail : w).join(' ');
        S.ch.mark(k, ok); if (!ok) S.ch.mark(e.opts.indexOf(e.fix), true);
        const [x, y] = at(S.ch.btns[k]);
        log.innerHTML = ''; log.append(ok ? '✔ ' : '✘ ', h(ok ? 'b' : 'em', { text: right }), ' · ' + GRAMMAR_TIPS[e.tip]);
        if (ok) { c.right(10 + c.level * 5, x, y); zapIt(e); S.zapped++; }
        else { c.wrong(x, y, 'Wrong fix!'); S.missedTips.add(e.tip); e.charge = true; e.speed = 3; }
        c.after(ok ? 380 : 650, () => { if (S.sel === e || !S.sel) { S.sel = null; pickNext(); } });
      }
      function zapIt(e) {
        const fr = field.getBoundingClientRect(), cr = castle.getBoundingClientRect(), er = e.el.getBoundingClientRect();
        const x1 = cr.left - fr.left + cr.width / 2, y1 = cr.top - fr.top + cr.height * .3, x2 = er.left - fr.left + er.width / 2, y2 = er.top - fr.top + er.height / 2;
        let d = `M${x1} ${y1}`; for (let i = 1; i < 6; i++) d += ` L${x1 + (x2 - x1) * i / 6 + (Math.random() - .5) * 18} ${y1 + (y2 - y1) * i / 6 + (Math.random() - .5) * 18}`; d += ` L${x2} ${y2}`;
        zap.innerHTML = `<path d="${d}" stroke="#fff6a8" stroke-width="5" fill="none" stroke-linejoin="round" opacity=".95"/><path d="${d}" stroke="#ffd23f" stroke-width="2" fill="none"/><circle cx="${x2}" cy="${y2}" r="16" fill="#ffd23f" opacity=".6"/>`;
        c.after(220, () => { zap.innerHTML = ''; }); Edu.tone(1200, .18, 'sawtooth', .05, -900);
        kill(e, true);
      }
      function kill(e, dead) {
        S.en = S.en.filter(x => x !== e); S.done++; e.el.classList.add('dead'); setTimeout(() => e.el.remove(), 460);
        if (!dead) e.el.remove();
      }
      function pickNext() {
        if (S.over) return; const front = S.en.filter(x => !x.charge).sort((a, b) => b.p - a.p)[0];
        if (front) select(front); else { S.sel = null; who.textContent = S.done >= total ? '' : 'Here they come…'; sen.innerHTML = ''; optBox.innerHTML = ''; }
      }
      function hitCastle(e) {
        kill(e, false); castle.classList.remove('hit'); void castle.offsetWidth; castle.classList.add('hit'); sfx.bad(); Edu.tone(90, .4, 'square', .08, -40);
        const r = castle.getBoundingClientRect(), s = c.el.getBoundingClientRect(); c.pop('−1 ❤️', r.left - s.left + r.width / 2, r.top - s.top + 10, '#ff4d5e');
        if (!e.charge) { S.missedTips.add(e.tip); log.innerHTML = ''; log.append('Too slow! It should be: ', h('em', { text: e.words.map((w, i) => i === e.bi ? e.fix + e.tail : w).join(' ') })); }
        if (c.lose() <= 0) return over(false);
        if (S.sel === e) { S.sel = null; pickNext(); }
      }
      function banner(t) { const b = h('div', { class: 'gg-banner', text: t }); field.append(b); c.after(1100, () => b.remove()); }
      function over(won) {
        if (S.over) return; S.over = true; S.ch && S.ch.lock();
        const tips = [...S.missedTips].map(k => GRAMMAR_TIPS[k]);
        const base = [...new Set(GRAMMAR[c.level].map(r => r[4]))].slice(0, 3).map(k => GRAMMAR_TIPS[k]);
        c.after(won ? 500 : 700, () => c.end({ won, title: won ? 'Castle saved!' : 'The castle fell!', emoji: won ? '🏰' : '💥',
          msg: won ? `You fixed ${S.zapped} of ${total} sentences and kept ${c.lives_} of ${HP} hearts.` : 'Fix the sentences faster to hold the gate. Try again!',
          stats: { 'Goblins zapped': S.zapped + ' / ' + total, 'Castle hearts': c.lives_ + ' / ' + HP }, learnt: (tips.length ? tips : base).slice(0, 4) }));
      }
      banner('Wave 1');
      c.loop(dt => {
        if (S.over) return; const d = dt * SP;
        if (S.pause > 0) S.pause -= d;
        else if (S.wave < L.waves.length) {
          S.clock += d; if (!S.en.length && S.next - S.clock > 1.2) S.next = S.clock + 1.2;   // (an empty field brings the next goblin sooner)
          if (S.inWave < L.waves[S.wave] && S.clock >= S.next) { spawn(); S.next = S.clock + L.cross[S.wave] / 3.4; }
          else if (S.inWave >= L.waves[S.wave] && !S.en.length) {
            S.wave++; S.inWave = 0; S.clock = 0; S.next = 0;
            if (S.wave < L.waves.length) { S.pause = 1.6; banner('Wave ' + (S.wave + 1) + ': faster!'); c.hud({ wave: S.wave + 1 + ' / ' + L.waves.length }); sfx.combo(4); }
          }
        }
        for (const e of [...S.en]) { e.p += d * e.speed; place(e); if (e.p >= 1) hitCastle(e); }
        if (S.wave >= L.waves.length && !S.en.length) over(true);
      });
      c.key(e => {
        if (S.over) return;
        if (S.stage !== 'fix' && /^[1-9]$/.test(e.key)) { const t = S.en.find(x => x.n === +e.key && !x.charge); if (t) { e.preventDefault(); select(t); } return; }
        const s = S.sel; if (!s || S.stage !== 'word') return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); S.cursor = clamp(S.cursor + (e.key === 'ArrowRight' ? 1 : -1), 0, s.btns.length - 1); s.btns.forEach((b, i) => b.classList.toggle('kb', i === S.cursor)); }
        else if (e.key === 'Enter' && s.btns.some(b => b.classList.contains('kb'))) { e.preventDefault(); tapWord(s, S.cursor); }
      });
      spawn();
    },
    bot(c) {
      const S = c.S; if (!S || S.over) return; const e = S.sel;
      if (!e) { const f = S.en.filter(x => !x.charge)[0]; if (f) f.el.click(); return; }
      if (S.stage === 'word') e.btns[e.bi].click(); else if (S.stage === 'fix') S.ch.btns[e.opts.indexOf(e.fix)].click();
    },
    miss(c) {
      const S = c.S; if (!S || S.over || !S.sel) return; const e = S.sel;
      if (S.stage === 'word') e.btns[e.bi === 0 ? 1 : 0].click(); else if (S.stage === 'fix') S.ch.btns[e.opts.findIndex(o => o !== e.fix)].click();
    }
  });
})();
