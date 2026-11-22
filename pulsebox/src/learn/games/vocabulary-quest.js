/* Vocabulary Quest: a hero walks a winding map. At each stop a word question appears (meaning, synonym, opposite or the
   word that fits a sentence). Right answers earn a gem and move the hero on; wrong ones cost a heart. A dragon waits at
   the end: hit it with right answers until it runs out of HP. */
// @data vocab-words
(() => {
  const { h, shuffle, sample, pick, sfx } = Edu, STOPS = 8;
  const LV = [
    { name: 'Easy', desc: 'Everyday words. The dragon has 3 HP.', boss: 3 },
    { name: 'Medium', desc: 'Middle-school words. The dragon has 4 HP.', boss: 4 },
    { name: 'Hard', desc: 'Advanced words. The dragon has 5 HP.', boss: 5 }
  ];
  const PATH = 'M18 158 C60 160 70 118 110 122 S160 162 200 146 S228 92 262 98 S320 150 342 118 S334 56 372 44';
  const MAP = `<svg viewBox="0 0 400 180" aria-hidden="true"><defs><linearGradient id="vqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fd0ff"/><stop offset=".42" stop-color="#bde9ff"/><stop offset=".43" stop-color="#7ed36b"/><stop offset="1" stop-color="#4fae57"/></linearGradient></defs>`
    + `<rect width="400" height="180" fill="url(#vqg)"/><circle cx="46" cy="28" r="15" fill="#ffd23f"/><circle cx="46" cy="28" r="22" fill="#ffd23f" opacity=".25"/>`
    + `<path d="M150 78 L190 22 L230 78Z" fill="#8c93a8"/><path d="M178 39 L190 22 L202 39 L195 35 L190 41 L184 35Z" fill="#fff"/><path d="M205 78 L250 30 L296 78Z" fill="#a1a8bb"/><path d="M238 43 L250 30 L262 43 L256 40 L250 46 L244 40Z" fill="#fff"/>`
    + `<path d="M300 78 L340 40 L380 78Z" fill="#7a5aa8"/><rect x="352" y="22" width="34" height="30" fill="#5b3f86"/><path d="M352 22h6v-6h5v6h6v-6h5v6h6v-6h6v6" fill="#5b3f86"/>`
    + `<path d="M0 104 C60 96 90 112 130 100 S220 88 260 112 S330 128 400 120" stroke="#3aa0e8" stroke-width="9" fill="none" opacity=".9"/><path d="M0 104 C60 96 90 112 130 100 S220 88 260 112 S330 128 400 120" stroke="#9fe0ff" stroke-width="2" fill="none" stroke-dasharray="6 10" class="vq-flow"/>`
    + `<g fill="#2f8a3e"><circle cx="30" cy="124" r="9"/><circle cx="80" cy="96" r="8"/><circle cx="150" cy="174" r="9"/><circle cx="240" cy="168" r="8"/><circle cx="300" cy="80" r="7"/><circle cx="388" cy="150" r="10"/><circle cx="130" cy="142" r="6"/></g>`
    + `<g><circle cx="60" cy="140" r="2.5" fill="#ff5fa2"/><circle cx="176" cy="122" r="2.5" fill="#ffd23f"/><circle cx="290" cy="136" r="2.5" fill="#fff"/><circle cx="226" cy="122" r="2.5" fill="#ff5fa2"/><circle cx="320" cy="170" r="2.5" fill="#ffd23f"/><circle cx="96" cy="166" r="2.5" fill="#a98bff"/></g>`
    + `<path d="${PATH}" stroke="#8a6234" stroke-width="9" fill="none" stroke-linecap="round"/><path d="${PATH}" stroke="#e8c27c" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="1 9" id="vqpath"/></svg>`;
  const CSS = `
.vq-map{position:relative;width:min(100%,680px,75vh);aspect-ratio:400/180;flex:none;border-radius:18px;overflow:hidden;border:2px solid rgba(255,255,255,.18);box-shadow:0 10px 30px rgba(0,0,0,.35)}
.vq-map>svg{width:100%;height:100%;display:block}
.vq-flow{animation:vqflow 1.6s linear infinite}@keyframes vqflow{to{stroke-dashoffset:-32}}
.vq-stop{animation:none}.vq-stop.now{animation:vqpulse 1s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes vqpulse{50%{transform:scale(1.35)}}
.vq-boss{transform-box:fill-box;transform-origin:center bottom;animation:vqboss 1.2s ease-in-out infinite}
@keyframes vqboss{50%{transform:translateY(-3px) rotate(-4deg)}}
.vq-boss.hit{animation:vqhit .4s}@keyframes vqhit{30%{transform:translateX(6px);filter:brightness(2)}60%{transform:translateX(-6px)}}
.vq-q{width:min(100%,760px);display:flex;flex-direction:column;align-items:center;flex:1;justify-content:center;min-height:0}
.vq-kind{display:inline-block;padding:4px 12px;border-radius:999px;font:800 12px var(--body);letter-spacing:.12em;text-transform:uppercase;background:color-mix(in srgb,var(--c2) 22%,transparent);color:var(--c2);border:1px solid color-mix(in srgb,var(--c2) 50%,transparent);margin-bottom:8px}
.vq-text{font:700 clamp(19px,4.2vw,30px) var(--display);text-align:center;line-height:1.25;animation:pop .3s both;max-width:700px}
.vq-text em{font-style:normal;color:var(--c)}
.vq-text u{text-decoration:none;display:inline-block;min-width:3.5em;border-bottom:3px solid var(--c)}
.vq-q .opts{margin-top:clamp(10px,2.5vh,20px)}
.vq-q.long .opt{font:700 clamp(15px,2.1vw,19px) var(--body);min-height:clamp(50px,8vh,70px)}
.vq-note{min-height:1.4em;margin-top:8px;color:var(--muted);font-weight:700;text-align:center;font-size:clamp(13px,3vw,16px)}
.vq-note b{color:var(--gold)}
`;
  const SVGNS = 'http://www.w3.org/2000/svg', el = (t, a) => { const e = document.createElementNS(SVGNS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  function question(lv, it, kind) {
    const all = VOCAB[lv], gs = it.g.split(' '), others = shuffle(all.filter(o => o !== it && !o.g.split(' ').some(g => gs.includes(g))));
    const fill = (right, pool) => { const out = [right]; for (const v of pool) if (v && !out.includes(v) && out.length < 4) out.push(v); return shuffle(out); };
    if (kind === 'def') return { kind: 'Meaning', html: `What does <em>${it.w}</em> mean?`, right: it.def, opts: fill(it.def, others.map(o => o.def)), long: true };
    if (kind === 'word') return { kind: 'Which word?', html: `Which word means <em>“${it.def}”</em>?`, right: it.w, opts: fill(it.w, others.map(o => o.w)) };
    if (kind === 'syn') return { kind: 'Synonym', html: `Which word means the same as <em>${it.w}</em>?`, right: it.syn, opts: fill(it.syn, [it.ant, ...others.map(o => o.syn)]) };
    if (kind === 'ant') return { kind: 'Opposite', html: `Which word means the opposite of <em>${it.w}</em>?`, right: it.ant, opts: fill(it.ant, [it.syn, ...others.map(o => o.ant)]) };
    return { kind: 'Fill the gap', html: it.sen.replace('___', '<u>&nbsp;</u>'), right: it.w, opts: fill(it.w, others.map(o => o.w)) };
  }
  Edu.game({
    id: 'vocabulary-quest', levels: LV,
    how: ['Your hero walks the map. At every stop, answer a word question: tap an answer or press 1 to 4.', 'Questions ask what a word means, a synonym (same meaning), an antonym (opposite), or which word fits a sentence.',
      'A right answer earns a gem and moves you on. A wrong answer costs a heart, and you get a new question.', 'Reach the dragon and hit it with right answers until its HP runs out. Lose all 3 hearts and the quest ends.'],
    start(c) {
      const L = c.L, words = shuffle(VOCAB[c.level]);
      c.el.style.justifyContent = 'flex-start';
      c.el.append(h('style', { text: CSS }));
      const map = h('div', { class: 'vq-map', html: MAP }), svg = map.firstChild, path = svg.querySelector('#vqpath'), len = path.getTotalLength();
      const qBox = h('div', { class: 'vq-q' }), note = h('div', { class: 'vq-note' });
      c.el.append(map, qBox, note);
      const stops = [...Array(STOPS)].map((_, i) => { const p = path.getPointAtLength(len * (i + 1) / (STOPS + 1)); const g = el('g'); const ci = el('circle', { cx: p.x, cy: p.y, r: 6.5, fill: '#fff', stroke: '#c06bff', 'stroke-width': 3, class: 'vq-stop' }); g.append(ci); svg.append(g); return { p, g, ci }; });
      const end = path.getPointAtLength(len);
      const boss = el('text', { x: end.x - 8, y: end.y + 6, 'font-size': 30, 'text-anchor': 'middle', class: 'vq-boss' }); boss.textContent = '🐉'; svg.append(boss);
      const bossBar = el('g', { opacity: 0 }); bossBar.append(el('rect', { x: end.x - 36, y: end.y - 34, width: 44, height: 7, rx: 3.5, fill: '#2a0d12', stroke: '#fff', 'stroke-width': 1 }), el('rect', { x: end.x - 35, y: end.y - 33, width: 42, height: 5, rx: 2.5, fill: '#ff4d5e', class: 'vq-hp' })); svg.append(bossBar);
      const hero = el('g'); hero.append(el('ellipse', { cx: 0, cy: 3, rx: 9, ry: 3, fill: 'rgba(0,0,0,.25)' })); const ht = el('text', { x: 0, y: 0, 'font-size': 22, 'text-anchor': 'middle' }); ht.textContent = '🧝'; hero.append(ht); svg.append(hero);
      c.lives(3); c.gems = 0; c.missed = []; c.seen = [];
      const S = c.S = { stop: 0, at: 0, to: 0, walking: false, busy: true, wi: 0, bossHp: L.boss, inBoss: false, over: false };
      c.hud({ gems: '💎 0', stop: '1 / ' + STOPS });
      const putHero = (d, bob) => { const p = path.getPointAtLength(Math.min(len, Math.max(0, d))); hero.setAttribute('transform', `translate(${p.x} ${p.y - 2 - bob})`); };
      putHero(0, 0);
      c.loop((dt, t) => {
        if (S.walking) { S.at += (S.to - S.at) * Math.min(1, dt * 6) + Math.sign(S.to - S.at) * dt * 40; if (Math.abs(S.to - S.at) < 1.5 || (S.to - S.at) * S.dir < 0) { S.at = S.to; S.walking = false; S.onArrive && S.onArrive(); } }
        putHero(S.at, S.walking ? Math.abs(Math.sin(t * 14)) * 4 : Math.sin(t * 3) * 1);
      });
      const walkTo = (d, fn) => { S.to = d; S.dir = Math.sign(d - S.at) || 1; S.walking = true; S.onArrive = fn; };
      stops[0].ci.classList.add('now');
      walkTo(len / (STOPS + 1), ask);

      function ask() {
        if (S.over) return; S.busy = false;
        const it = words[S.wi++ % words.length], kinds = ['def', 'word', 'syn', 'fill', 'fill'].concat(it.ant ? ['ant', 'ant'] : []);
        const q = S.q = question(c.level, it, pick(kinds)); S.it = it; if (!c.seen.includes(it)) c.seen.push(it);
        qBox.innerHTML = ''; qBox.className = 'vq-q' + (q.long ? ' long' : '');
        qBox.append(h('span', { class: 'vq-kind', text: (S.inBoss ? '🐉 Dragon · ' : 'Stop ' + (S.stop + 1) + ' · ') + q.kind }), h('div', { class: 'vq-text', html: q.html }));
        const narrow = c.el.clientWidth < 560;
        S.ch = c.choices(qBox, q.opts, (i, b) => answer(i, b), { cols: q.long && narrow ? 1 : 2 });
      }
      const rel = b => { const r = b.getBoundingClientRect(), s = c.el.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top]; };
      function answer(i, b) {
        if (S.busy || S.over) return; S.busy = true; S.ch.lock(); const q = S.q, ok = q.opts[i] === q.right, [x, y] = rel(b);
        S.ch.mark(i, ok); if (!ok) S.ch.mark(q.opts.indexOf(q.right), true);
        note.innerHTML = ''; note.append(h('b', { text: S.it.w }), ': ' + S.it.def + (S.it.syn ? ' (like ' + S.it.syn + ')' : ''));
        if (!ok) {
          c.wrong(x, y, '−1 ❤️'); if (!c.missed.includes(S.it)) c.missed.push(S.it);
          if (S.inBoss && S.bossHp < L.boss) { S.bossHp++; hp(); c.pop('Dragon heals!', null, null, '#ff9f1c'); }
          if (c.lose() <= 0) { S.over = true; return c.after(700, () => finish(false)); }
          return c.after(800, ask);
        }
        if (S.inBoss) {
          c.right(15 + c.level * 5, x, y); S.bossHp--; hp(); boss.classList.remove('hit'); void boss.getBBox(); boss.classList.add('hit'); Edu.tone(180, .25, 'square', .07, -100);
          if (S.bossHp <= 0) { S.over = true; boss.textContent = '💥'; c.after(650, () => finish(true)); return; }
          return c.after(550, ask);
        }
        c.right(10 + c.level * 5, x, y); c.gems++;
        const s = stops[S.stop]; s.ci.classList.remove('now'); s.ci.setAttribute('fill', '#ffd23f'); s.ci.setAttribute('stroke', '#fff');
        const gem = el('text', { x: s.p.x, y: s.p.y - 9, 'font-size': 12, 'text-anchor': 'middle' }); gem.textContent = '💎'; s.g.append(gem);
        S.stop++; c.hud({ gems: '💎 ' + c.gems, stop: Math.min(S.stop + 1, STOPS) + ' / ' + STOPS });
        if (S.stop < STOPS) { stops[S.stop].ci.classList.add('now'); c.after(250, () => walkTo(len * (S.stop + 1) / (STOPS + 1), ask)); }
        else c.after(250, () => walkTo(len - 26, () => { S.inBoss = true; bossBar.setAttribute('opacity', 1); hp(); c.hud({ stop: 'Dragon!' }); c.pop('The dragon attacks!', null, null, '#ff4d5e'); sfx.combo(6); ask(); }));
      }
      function hp() { svg.querySelector('.vq-hp').setAttribute('width', Math.max(0, 42 * S.bossHp / L.boss)); }
      function finish(won) {
        const list = (c.missed.length ? c.missed : c.seen.slice(0, 3)).slice(0, 5).map(it => it.w + ': ' + it.def + (it.ant ? ' (opposite: ' + it.ant + ')' : ''));
        c.end({ won, title: won ? 'Dragon defeated!' : 'Out of hearts', emoji: won ? '🐉' : '💔',
          msg: won ? `You crossed the map and beat the dragon with ${c.lives_} heart${c.lives_ === 1 ? '' : 's'} left.` : 'Lose all three hearts and the quest is over. Try again!',
          stats: { Gems: c.gems + ' / ' + STOPS }, learnt: list });
      }
    },
    bot(c) { const S = c.S; if (S && !S.busy && !S.over && S.ch) S.ch.btns[S.q.opts.indexOf(S.q.right)].click(); },
    miss(c) { const S = c.S; if (S && !S.busy && !S.over && S.ch) S.ch.btns[S.q.opts.findIndex(o => o !== S.q.right)].click(); }
  });
})();
