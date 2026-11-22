/* The Educational Games category page: every game as a card (with its generated thumbnail), search, and subject filters. */
(() => {
  const { h, store, thumb } = Edu;
  let subject = 'All', q = '';
  const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hay = g => fold([g.title, g.subject, g.teaches, ...g.learn].join(' '));
  function card(g, i) {
    const b = (store.get(g.id, {}).best || []).reduce((a, v) => Math.max(a, v || 0), 0);
    return h('a', { class: 'gcard', href: 'learn-' + g.id + '.html', style: { '--c': g.c, animationDelay: Math.min(i, 12) * 30 + 'ms' }, 'aria-label': g.title + ': ' + g.teaches },
      h('div', { html: thumb(g) }),
      h('div', { class: 'gb' }, h('span', { class: 'tag', style: { '--c': SUBJECTS[g.subject][1] }, text: g.subject }), h('h3', { text: g.title }), h('p', { text: g.teaches }),
        h('div', { class: 'best', text: b ? '★ Best ' + b : 'Ages ' + g.ages })));
  }
  function render() {
    const box = document.getElementById('list'); box.innerHTML = '';
    const terms = fold(q).split(/\s+/).filter(Boolean), list = CATALOG.filter(g => (subject === 'All' || g.subject === subject) && terms.every(t => hay(g).includes(t)));
    if (!list.length) { box.append(h('p', { class: 'empty', text: 'No games match "' + q + '". Try math, spelling, flags or puzzles.' })); return; }
    if (subject === 'All' && !terms.length) {
      for (const s of Object.keys(SUBJECTS)) { const gs = list.filter(g => g.subject === s);
        box.append(h('h2', { class: 'sect', style: { '--c': SUBJECTS[s][1] } }, SUBJECTS[s][0] + ' ' + s), h('div', { class: 'grid' }, gs.map(card))); }
    } else box.append(h('div', { class: 'grid' }, list.map(card)));
    document.getElementById('count').textContent = list.length + (list.length === 1 ? ' game' : ' games');
  }
  const filters = h('div', { class: 'row c' }, ['All', ...Object.keys(SUBJECTS)].map(s => h('button', { class: 'fbtn' + (s === subject ? ' on' : ''), type: 'button', 'data-s': s,
    onclick: e => { subject = s; filters.querySelectorAll('.fbtn').forEach(b => b.classList.toggle('on', b.dataset.s === s)); render(); } }, (SUBJECTS[s] ? SUBJECTS[s][0] + ' ' : '🎓 ') + s)));
  const input = h('input', { type: 'search', placeholder: 'Search: fractions, typing, capitals...', 'aria-label': 'Search educational games', oninput: e => { q = e.target.value; render(); } });
  document.getElementById('app').append(
    h('header', { class: 'top' }, h('a', { class: 'nav logo', href: '/', title: 'Back to Pulsebox' }, '‹ ', h('b', { text: 'Pulse' }), 'box'),
      h('div', { class: 't' }, 'Educational Games', h('small', { id: 'count' })), h('span', { style: { width: '90px' } })),
    h('main', { class: 'screen', style: { maxWidth: '1180px' } },
      h('section', { class: 'lhero' }, h('span', { class: 'tag', style: { '--c': '#c6ff3d' }, text: 'Educational games · free · no sign-up' }),
        h('h1', {}, 'Learn by ', h('span', { text: 'playing' })),
        h('p', { text: '20 quick games for math, language, geography, science and logic. Each one says what it teaches, has three levels or more, and saves your best scores on this device.' })),
      h('div', { class: 'tools' }, h('label', { class: 'search' }, '🔎', input)), filters,
      h('div', { id: 'list' }),
      h('p', { class: 'foot' }, 'Works with a mouse, keyboard or touch screen, on computers, Chromebooks, tablets and phones. ', h('a', { href: '/', text: 'Back to all Pulsebox games' }))));
  render();
})();
