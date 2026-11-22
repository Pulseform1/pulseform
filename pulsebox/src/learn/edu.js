/* Pulsebox Educational Games: the shared framework. One game per page calls Edu.game({...}); the framework draws the
   start screen (what it teaches, how to play, three or more levels with best scores), the HUD while playing, and the
   end screen (score, best, stats, play again, next level, menu). Everything a game starts (timers, loops, listeners)
   goes through its ctx and is stopped when the round ends, restarts or goes back to the menu.

   A game:  Edu.game({ id, levels: [{ name, desc }, ...], how: ['...'], start(ctx), bot(ctx), miss(ctx) })
     start(ctx)   begins a round at ctx.level (0, 1, 2 ...); build the play area in ctx.el
     bot(ctx)     makes one correct move (used by the automated checks: it must finish a round if called enough)
     miss(ctx)    optional: makes one wrong move
   window.EDU (for the checks): start(level), bot(), miss(), state(), restart(), menu() */
const Edu = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const k in props || {}) { const v = props[k]; if (v == null || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k.startsWith('--')) e.style.setProperty(k, v); else e.setAttribute(k, v === true ? '' : v); }
    for (const c of kids.flat(9)) if (c != null && c !== false) e.append(c.nodeType ? c : String(c));
    return e;
  }
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (a, n) => shuffle(a).slice(0, n);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  // n wrong answers near a right one (numbers), never repeating and never the answer
  function near(ans, n, spread, ok = v => true) {
    const out = new Set(), tries = []; spread = spread || Math.max(3, Math.ceil(Math.abs(ans) * .25));
    for (let i = 0; i < 400 && out.size < n; i++) { const v = ans + rnd(-spread, spread); if (v !== ans && ok(v)) out.add(v); }
    for (let d = 1; out.size < n; d++) { if (ok(ans + d)) out.add(ans + d); if (out.size < n && ok(ans - d)) out.add(ans - d); if (d > 999) break; }
    return [...out].slice(0, n);
  }

  /* ---- saving (localStorage, under pbx-learn-*, which the Pulsebox hub copies to a signed-in player's cloud save) ---- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('pbx-learn-' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('pbx-learn-' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---- sound: a few synthesised blips, no audio files ---- */
  let ac = null, muted = store.get('muted', false);
  function tone(f, d, type = 'sine', v = .12, slide = 0, delay = 0) {
    if (muted) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + .02); } catch (e) {}
  }
  const sfx = {
    good: () => { tone(660, .1, 'triangle', .12); tone(990, .14, 'triangle', .1, 0, .07); },
    bad: () => tone(200, .25, 'sawtooth', .07, -80),
    click: () => tone(520, .04, 'square', .04),
    tick: () => tone(880, .05, 'sine', .05),
    pop: () => tone(400, .08, 'sine', .1, 400),
    combo: n => tone(500 + Math.min(n, 12) * 60, .12, 'triangle', .1),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, 'triangle', .11, 0, i * .1)),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, .3, 'triangle', .1, 0, i * .14))
  };

  /* ---- thumbnails: drawn from the catalog (gradient, a pattern for the subject, the icon), no image files ---- */
  function thumb(g, big) {
    const s = SUBJECTS[g.subject] || ['', '#888'], id = 'g' + g.id.replace(/\W/g, ''), deco = {
      Math: '<g opacity=".16" fill="#fff" font-family="Arial" font-weight="700" font-size="26"><text x="14" y="34">+</text><text x="270" y="40">×</text><text x="40" y="170">÷</text><text x="262" y="168">=</text><text x="150" y="24">7</text></g>',
      Language: '<g opacity=".16" fill="#fff" font-family="Georgia" font-weight="700" font-size="28"><text x="14" y="38">A</text><text x="268" y="40">b</text><text x="36" y="172">c</text><text x="258" y="170">Z</text><text x="150" y="26">e</text></g>',
      'Geography & Science': '<g opacity=".18" fill="none" stroke="#fff" stroke-width="2"><circle cx="40" cy="40" r="22"/><path d="M18 40h44M40 18c-10 12-10 32 0 44M40 18c10 12 10 32 0 44"/><ellipse cx="270" cy="150" rx="30" ry="9" transform="rotate(-20 270 150)"/><circle cx="270" cy="150" r="10"/></g>',
      Logic: '<g opacity=".16" fill="none" stroke="#fff" stroke-width="2"><rect x="14" y="14" width="34" height="34" rx="6"/><rect x="54" y="14" width="34" height="34" rx="6"/><path d="M250 150h40v-30h-40zM270 120v-20"/><circle cx="40" cy="160" r="12"/></g>'
    }[g.subject] || '';
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${g.title}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g.c}"/><stop offset="1" stop-color="${g.c2}"/></linearGradient>`
      + `<radialGradient id="${id}r" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`
      + `<rect width="320" height="200" fill="#0d1018"/><rect width="320" height="200" fill="url(#${id})" opacity=".92"/>`
      + `<path d="M0 150 Q80 120 160 150 T320 140 V200 H0Z" fill="#000" opacity=".16"/>${deco}<circle cx="160" cy="98" r="62" fill="url(#${id}r)"/>`
      + `<text x="160" y="${big ? 126 : 124}" text-anchor="middle" font-size="76" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${g.icon}</text>`
      + `<text x="306" y="190" text-anchor="end" font-family="Arial" font-weight="700" font-size="13" fill="#fff" opacity=".7">${s[0]} ${g.subject.toUpperCase()}</text></svg>`;
  }

  /* ---- confetti and floating text ---- */
  function confetti(n = 60) {
    const cols = ['#ffd23f', '#29e0ff', '#ff2e88', '#c6ff3d', '#a98bff', '#ff9f1c'];
    for (let i = 0; i < n; i++) { const d = h('div', { class: 'conf', style: { left: Math.random() * 100 + 'vw', background: pick(cols), animationDuration: (1.6 + Math.random() * 1.6) + 's', animationDelay: Math.random() * .4 + 's', borderRadius: Math.random() < .5 ? '50%' : '2px' } });
      document.body.append(d); setTimeout(() => d.remove(), 3800); }
  }

  /* ---- the page ---- */
  let G = null, META = null, ctx = null, app = null, screenName = 'menu', endData = null;
  const SPEED = Math.max(1, Math.min(50, +(new URLSearchParams(location.search).get('speed')) || 1));   // (?speed=10 runs the clocks faster: for the automated checks)
  function topBar() {
    const snd = h('button', { class: 'nav', type: 'button', 'aria-label': 'Sound on or off', text: muted ? '🔇' : '🔊', onclick: () => { muted = !muted; store.set('muted', muted); snd.textContent = muted ? '🔇' : '🔊'; } });
    return h('header', { class: 'top' },
      h('a', { class: 'nav', href: 'learn.html', title: 'All educational games' }, '‹ ', h('span', { class: 'lt' }, 'All learning games')),
      h('div', { class: 't' }, META ? META.title : '', h('small', { text: 'Educational Games' })),
      snd,
      h('a', { class: 'nav logo', href: '/', title: 'Back to Pulsebox' }, h('b', { text: 'Pulse' }), 'box'));
  }
  function best(level) { return (store.get(G.id, {}).best || [])[level] || 0; }
  function menu() {
    stop(); screenName = 'menu'; endData = null; app.innerHTML = ''; app.append(topBar());
    const levels = G.levels.map((L, i) => h('button', { class: 'lvl', type: 'button', onclick: () => start(i) },
      h('span', { class: 'k', text: String(i + 1) }),
      h('div', { class: 'n' }, h('span', { class: 'stars', text: '★'.repeat(i + 1) }), L.name),
      h('div', { class: 'd', text: L.desc || '' }),
      h('div', { class: 'b', text: best(i) ? 'Best: ' + best(i) : 'Not played yet' })));
    const howBox = h('div', { class: 'learn', hidden: true }, h('b', { text: 'HOW TO PLAY' }), h('ul', {}, (G.how || []).map(t => h('li', { text: t }))));
    app.append(h('main', { class: 'screen' },
      h('div', { class: 'hero' }, h('div', { class: 'art', html: thumb(META, true) }),
        h('div', {}, h('span', { class: 'tag', text: META.subject + ' · Ages ' + META.ages }), h('h1', { text: META.title }), h('p', { text: META.teaches }))),
      h('div', { class: 'learn' }, h('b', { text: 'WHAT YOU WILL LEARN' }), h('ul', {}, META.learn.map(t => h('li', { text: t })))),
      h('div', { class: 'row', style: { marginTop: '16px' } }, h('button', { class: 'btn', type: 'button', onclick: () => { howBox.hidden = !howBox.hidden; } }, '❓ How to play'),
        h('span', { class: 'sub', style: { textAlign: 'left' }, text: 'Pick a level to start. Keys 1 to ' + G.levels.length + ' work too.' })),
      howBox,
      h('h2', { class: 'sect', text: 'Choose a level' }),
      h('div', { class: 'levels' }, levels)));
    const l0 = app.querySelector('.lvl'); if (l0 && !matchMedia('(hover: none)').matches) l0.focus({ preventScroll: true });
  }
  function stop() {
    if (!ctx) return; ctx.alive = false;
    for (const t of ctx._t) clearTimeout(t); for (const t of ctx._i) clearInterval(t); cancelAnimationFrame(ctx._raf);
    for (const [el, ev, fn, o] of ctx._l) el.removeEventListener(ev, fn, o);
    try { G.stop && G.stop(ctx); } catch (e) { console.error(e); }
    document.querySelectorAll('.over').forEach(o => o.remove());
    ctx = null;
  }
  function chip(label, val, cls) { return h('span', { class: 'chip' + (cls ? ' ' + cls : '') }, h('i', { text: label }), h('b', { text: String(val) })); }
  function start(level) {
    stop(); level = clamp(level | 0, 0, G.levels.length - 1); screenName = 'play'; endData = null; app.innerHTML = ''; app.append(topBar());
    const hud = h('div', { class: 'hud' }), bar = h('div', { class: 'tbar', hidden: true }, h('div')), stage = h('div', { class: 'stage' });
    const btns = h('div', { class: 'row' },
      h('button', { class: 'btn sm', type: 'button', title: 'Restart', onclick: () => start(level) }, '↻ ', h('span', { class: 'lt', text: 'Restart' })),
      h('button', { class: 'btn sm', type: 'button', title: 'Menu (Esc)', onclick: menu }, '☰ ', h('span', { class: 'lt', text: 'Menu' })));
    app.append(h('main', { class: 'play' }, h('div', { class: 'hud' }, hud, h('span', { class: 'sp' }), btns), bar, stage));
    const c = ctx = {
      level, L: G.levels[level], el: stage, alive: true, score: 0, streak: 0, bestStreak: 0, right_: 0, wrong_: 0, lives_: null, _t: [], _i: [], _l: [], _raf: 0, _hud: {},
      after(ms, fn) { const t = setTimeout(() => { if (c.alive) fn(); }, ms); c._t.push(t); return t; },
      every(ms, fn) { const t = setInterval(() => { if (c.alive) fn(); }, ms); c._i.push(t); return t; },
      loop(fn) { let last = performance.now(); const f = now => { if (!c.alive) return; const dt = Math.min(.05, (now - last) / 1000); last = now; fn(dt, now / 1000); c._raf = requestAnimationFrame(f); }; c._raf = requestAnimationFrame(f); },
      on(el, ev, fn, o, always) { const w = always ? fn : e => { if (c.alive) fn(e); }; el.addEventListener(ev, w, o); c._l.push([el, ev, w, o]); },   // (a game's own handlers go quiet when the round ends)
      key(fn) { c.on(document, 'keydown', e => { if (e.target && e.target.tagName === 'INPUT' && e.target.dataset.own !== '1') return; fn(e); }); },
      hud(o) { Object.assign(c._hud, o); drawHud(); },
      add(n, x, y, col) { n = Math.round(n); c.score = Math.max(0, c.score + n); if (n && x != null) c.pop((n > 0 ? '+' : '') + n, x, y, col || (n > 0 ? '#c6ff3d' : '#ff4d5e')); drawHud(); },
      // a right answer: points with a streak bonus (+50% every 3 in a row), sound and a green flash
      right(base = 10, x, y) { c.streak++; c.right_++; c.bestStreak = Math.max(c.bestStreak, c.streak); const mult = 1 + Math.floor(c.streak / 3) * .5, pts = Math.round(base * mult);
        c.add(pts, x, y); c.flash(true); c.streak >= 3 && c.streak % 3 === 0 ? sfx.combo(c.streak) : sfx.good(); return pts; },
      wrong(x, y, msg) { c.streak = 0; c.wrong_++; c.flash(false); sfx.bad(); if (msg && x != null) c.pop(msg, x, y, '#ff4d5e'); drawHud(); },
      lives(n) { c.lives_ = n; drawHud(); },
      lose(n = 1) { c.lives_ = Math.max(0, (c.lives_ || 0) - n); drawHud(); return c.lives_; },
      flash(ok) { stage.classList.remove('flash-ok', 'flash-no'); void stage.offsetWidth; stage.classList.add(ok ? 'flash-ok' : 'flash-no'); c.after(350, () => stage.classList.remove('flash-ok', 'flash-no')); },
      pop(text, x, y, col) { const r = stage.getBoundingClientRect(); if (x == null) { x = r.width / 2; y = r.height * .3; } const p = h('div', { class: 'popt', text, style: { left: x + 'px', top: y + 'px', color: col || '#fff', transform: 'translateX(-50%)' } }); stage.append(p); setTimeout(() => p.remove(), 950); },
      // a countdown shown as the bar under the HUD; onEnd when it runs out. t.add(s) gives time back.
      timer(sec, onEnd) { let left = sec, total = sec; bar.hidden = false; const fill = bar.firstChild;
        const T = { left: () => left, add(s) { left = Math.min(total, left + s); }, set(s) { left = total = s; }, paused: false };
        const show = () => { fill.style.transform = `scaleX(${clamp(left / total, 0, 1)})`; bar.classList.toggle('low', left / total < .25); c.hud({ time: Math.ceil(left) + 's' }); };
        show(); c.every(100, () => { if (T.paused) return; left -= .1 * SPEED; if (left <= 5 && Math.abs(left - Math.round(left)) < .05 && left > 0) sfx.tick(); if (left <= 0) { left = 0; show(); onEnd && onEnd(); } else show(); });
        return T; },
      // a responsive, sharp canvas filling the stage; draw in CSS pixels (c.w x c.h); it keeps its size on resize
      canvas() { stage.classList.add('cv'); const cv = h('canvas'); stage.append(cv); const g = cv.getContext('2d'), o = { cv, g, w: 1, h: 1 };
        const fit = () => { const r = stage.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); o.w = Math.max(1, r.width); o.h = Math.max(1, r.height); cv.width = Math.round(o.w * d); cv.height = Math.round(o.h * d); g.setTransform(d, 0, 0, d, 0, 0); o.onfit && o.onfit(); };
        fit(); c.on(window, 'resize', fit); o.fit = fit;
        o.xy = e => { const r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] || e.changedTouches[0] : e; return [p.clientX - r.left, p.clientY - r.top]; };
        return o; },
      // big answer buttons; keys 1-9 pick them. onPick(i, button). Returns { el, lock(), mark(i, ok), btns }
      choices(parent, items, onPick, o = {}) {
        const cols = o.cols || (items.length > 4 ? 3 : 2), el = h('div', { class: 'opts' + (cols >= 4 ? ' wide' : ''), '--cols': cols }); let locked = false;
        const btns = items.map((it, i) => h('button', { class: 'opt', type: 'button', style: { animationDelay: i * 40 + 'ms' }, onclick: () => { if (!locked) onPick(i, btns[i]); } }, h('span', { class: 'k', text: String(i + 1) }), it && it.nodeType ? it : String(it)));
        el.append(...btns); parent.append(el);
        const kf = e => { const n = +e.key; if (!locked && n >= 1 && n <= btns.length && c.alive && el.isConnected) { e.preventDefault(); onPick(n - 1, btns[n - 1]); } };
        c.on(document, 'keydown', kf);
        return { el, btns, lock() { locked = true; el.classList.add('locked'); }, unlock() { locked = false; el.classList.remove('locked'); }, mark(i, ok) { btns[i].classList.add(ok ? 'ok' : 'no'); } };
      },
      end(o = {}) { if (!c.alive) return; finish(c, o); }
    };
    function drawHud() {
      if (!c.alive && c !== ctx) return; const H = c._hud; hud.innerHTML = '';
      hud.append(chip('Score', c.score));
      if (c.streak >= 2) hud.append(chip('Streak', c.streak + (c.streak >= 3 ? ' ×' + (1 + Math.floor(c.streak / 3) * .5) : ''), c.streak >= 3 ? 'hot' : ''));
      if (c.lives_ != null) hud.append(chip('Lives', c.lives_ > 0 ? '❤️'.repeat(Math.min(c.lives_, 6)) : '💔'));
      for (const k in H) if (H[k] != null && H[k] !== '') hud.append(chip(k, H[k]));
    }
    drawHud();
    c.on(document, 'keydown', e => { if (e.key === 'Escape') menu(); }, undefined, true);   // (Esc: menu, also on the end screen; no letter shortcut, so letters stay free for the games)
    sfx.click();
    try { G.start(c); } catch (e) { console.error(e); }
  }
  function finish(c, o) {
    c.alive = false; for (const t of c._t) clearTimeout(t); for (const t of c._i) clearInterval(t); cancelAnimationFrame(c._raf);
    const sv = store.get(G.id, {}); sv.best = sv.best || []; sv.plays = (sv.plays || 0) + 1; const prev = sv.best[c.level] || 0, isBest = c.score > prev;
    if (isBest) sv.best[c.level] = c.score; store.set(G.id, sv);
    const won = !!o.won, acc = c.right_ + c.wrong_ ? Math.round(c.right_ / (c.right_ + c.wrong_) * 100) + '%' : null;
    const stats = Object.assign({}, c.right_ + c.wrong_ ? { Correct: c.right_ + ' / ' + (c.right_ + c.wrong_), Accuracy: acc } : {}, c.bestStreak >= 2 ? { 'Best streak': c.bestStreak } : {}, o.stats || {});
    endData = { score: c.score, won, best: isBest, level: c.level, stats };
    screenName = 'end'; (won || isBest) ? sfx.win() : sfx.lose(); if (won) confetti();
    const next = won && c.level < G.levels.length - 1;
    const card = h('div', { class: 'card' },
      h('div', { style: { fontSize: '46px' }, text: o.emoji || (won ? '🏆' : isBest ? '⭐' : '🎯') }),
      h('h2', { text: o.title || (won ? 'Level complete!' : 'Game over') }),
      h('div', { class: 'big', text: String(c.score) }),
      h('div', { class: 'best' }, isBest && c.score > 0 ? h('span', { class: 'badge-new', text: 'NEW BEST' }) : 'Best on ' + G.levels[c.level].name + ': ' + Math.max(prev, c.score)),
      o.msg ? h('p', { class: 'msg', text: o.msg }) : null,
      Object.keys(stats).length ? h('div', { class: 'stats' }, Object.entries(stats).map(([k, v]) => h('div', {}, h('b', { text: String(v) }), h('i', { text: k })))) : null,
      o.learnt ? h('div', { class: 'learn', style: { textAlign: 'left', marginTop: '4px' } }, h('b', { text: 'REMEMBER' }), h('ul', {}, o.learnt.map(t => h('li', { text: t })))) : null,
      h('div', { class: 'row' },
        next ? h('button', { class: 'btn go', type: 'button', onclick: () => start(c.level + 1) }, 'Next level ›') : null,
        h('button', { class: 'btn' + (next ? '' : ' go'), type: 'button', onclick: () => start(c.level) }, '↻ Play again'),
        h('button', { class: 'btn', type: 'button', onclick: menu }, '☰ Menu')));
    const ov = h('div', { class: 'over' }, card); document.body.append(ov);
    const b0 = card.querySelector('.btn.go'); if (b0) setTimeout(() => b0.focus({ preventScroll: true }), 50);
  }
  function game(def) {
    G = def; META = CATALOG.find(x => x.id === def.id) || { id: def.id, title: def.id, subject: 'Logic', icon: '🎮', c: '#29e0ff', c2: '#c6ff3d', teaches: '', learn: [], ages: '' };
    document.documentElement.style.setProperty('--c', META.c); document.documentElement.style.setProperty('--c2', META.c2);
    app = $('#app') || document.body.appendChild(h('div', { id: 'app' }));
    document.addEventListener('keydown', e => { if (screenName === 'menu' && /^[1-9]$/.test(e.key) && +e.key <= G.levels.length && !(e.target && e.target.tagName === 'INPUT')) start(+e.key - 1); });
    window.EDU = { start, menu, restart: () => ctx && start(ctx.level), bot: () => ctx && ctx.alive && G.bot && G.bot(ctx), miss: () => ctx && ctx.alive && G.miss && G.miss(ctx),
      state: () => ({ screen: screenName, score: ctx ? ctx.score : endData ? endData.score : 0, alive: !!(ctx && ctx.alive), level: ctx ? ctx.level : null, end: endData, levels: G.levels.length, hasMiss: !!G.miss }) };
    menu();
  }
  return { game, SPEED, h, $, rnd, pick, shuffle, sample, clamp, gcd, near, store, sfx, tone, thumb, confetti };
})();
