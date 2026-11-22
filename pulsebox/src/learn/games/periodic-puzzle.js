/* Periodic Table Puzzle: element cards drop down a chute toward the bench. Answer before a card lands: name it, give its
   symbol, place it in the table by atomic number, or pick the element with a property. Right answers fly into a mini
   periodic table and lock in with a glow colored by the element's family. */
// @data elements
(() => {
  const { h, pick, shuffle, sample, clamp } = Edu, E = ELEMENTS, bySym = s => E.find(e => e.sym === s);
  const EASY = ['H', 'He', 'C', 'N', 'O', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Fe', 'Cu', 'Zn', 'Ag', 'Sn', 'I', 'Au', 'Hg', 'Pb', 'U'];
  const LATIN = { Na: ['N', 'Ne', 'Ni'], K: ['P', 'Pt', 'Kr'], Fe: ['F', 'I', 'Ne'], Cu: ['Co', 'C', 'Cr'], Ag: ['S', 'Si', 'Sn'], Sn: ['Ti', 'Ni', 'Na'], Au: ['Ag', 'Al', 'Ga'], Hg: ['Mn', 'Mg', 'He'], Pb: ['Pt', 'Li', 'Br'] };
  const LV = [
    { name: 'Easy', desc: 'Symbols and names of well-known elements: H, O, Na, Fe, Au... 12 cards.', n: 12, t: 12 },
    { name: 'Medium', desc: 'Place elements 1 to 20 in the table by atomic number and see their families.', n: 20, t: 16 },
    { name: 'Hard', desc: 'Properties: noble gases, halogens, metalloids, liquids, symbols from Latin names, atomic numbers. 12 cards.', n: 12, t: 11 }];
  const CSS = `.pp-tab{display:grid;grid-template-columns:repeat(18,var(--s));grid-auto-rows:var(--s);gap:2px;margin-bottom:8px}
.pp-c{border-radius:3px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font:700 calc(var(--s) * .5) var(--display);color:transparent;transition:background .3s}
.pp-c.on,.pp-slot.on{background:color-mix(in srgb,var(--k) 38%,var(--bg2));color:#fff;box-shadow:0 0 calc(var(--s,20px) * .6) var(--k),inset 0 0 0 1px var(--k);animation:pplock .6s ease-out}
@keyframes pplock{0%{transform:scale(1.8)}60%{transform:scale(.9)}}
.pp-gap{grid-column:1/-1;height:4px}
.pp-chute{position:relative;width:min(100%,440px);height:clamp(96px,16vh,130px);border-radius:16px;border:1px dashed var(--edge);background:linear-gradient(rgba(255,255,255,.02),color-mix(in srgb,var(--no) 18%,transparent));overflow:hidden;flex:none}
.pp-chute:after{content:'';position:absolute;left:0;right:0;bottom:0;height:4px;background:var(--no);opacity:.6}
.pp-card{position:absolute;left:50%;top:0;transform:translateX(-50%);min-width:92px;padding:4px 14px 6px;border-radius:12px;background:var(--panel2);border:2px solid var(--c);text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.5);animation:pop .3s both}
.pp-card b{display:block;font:700 clamp(26px,5vw,36px)/1.1 var(--display)}.pp-card small{display:block;color:var(--muted);font:700 12px var(--body)}
.pp-q{font:700 clamp(16px,2.8vw,22px) var(--display);text-align:center;margin:8px 0 0;max-width:640px}
.pp-tile b{display:block;font:700 clamp(22px,4vw,30px)/1 var(--display)}.pp-tile small{display:block;font:700 12px var(--body);color:var(--muted);margin-top:2px}
.pp-mt{display:grid;grid-template-columns:repeat(8,var(--m));grid-auto-rows:var(--m);margin:6px 0}
.pp-hd{font:700 11px var(--body);color:var(--muted);display:flex;align-items:flex-end;justify-content:center;height:16px}
.pp-slot{border-radius:9px;background:var(--panel2);box-shadow:inset 0 0 0 2px var(--bg2);border:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font:700 calc(var(--m) * .34)/1 var(--display);transition:background .2s}
.pp-slot:hover,.pp-slot:focus-visible{background:color-mix(in srgb,var(--c) 25%,var(--panel2))}.pp-slot.on{pointer-events:none}.pp-slot small{font:700 10px var(--body);opacity:.8}
.pp-slot.no{animation:shake .35s;background:color-mix(in srgb,var(--no) 40%,var(--panel2))}
.pp-leg{display:flex;flex-wrap:wrap;gap:4px 10px;justify-content:center;font:700 11px var(--body);color:var(--muted);max-width:640px}.pp-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}
.pp-note{min-height:36px;color:var(--muted);font-weight:700;text-align:center;max-width:620px;margin-top:6px;font-size:clamp(13px,2vw,15px)}
.pp-fly{position:fixed;z-index:30;display:flex;align-items:center;justify-content:center;border-radius:8px;background:var(--k);color:#07090e;font:700 18px var(--display);transition:transform .5s cubic-bezier(.4,.1,.3,1),opacity .5s;box-shadow:0 0 24px var(--k);pointer-events:none}`;
  const lc = s => s[0].toLowerCase() + s.slice(1), an = w => /^[aeiou]/i.test(w) ? 'an ' + w : 'a ' + w;
  Edu.game({
    id: 'periodic-puzzle', levels: LV,
    how: ['An element card drops down the chute. Answer before it lands on the red line, or you lose a life.',
      'Easy and Hard: pick the right answer (click, tap or keys 1 to 4). Medium: tap the box in the table where the element belongs (arrow keys and Enter work too).',
      'The table is ordered by atomic number: read each row left to right, then go on to the next row.',
      'Right answers lock into the table, glowing in the color of their family. Three lives.'],
    start(c) {
      if (!document.getElementById('pp-css')) document.head.append(h('style', { id: 'pp-css', text: CSS }));
      const L = c.L, MED = c.level === 1, r0 = c.el.getBoundingClientRect(), note = h('div', { class: 'pp-note', 'aria-live': 'polite' });
      c.lives(3); c.k = 0; c.learnt = []; c.missed = []; c.busy = true;
      const fact = e => `${e.name} (${e.sym}, atomic number ${e.z}) is ${an(ECAT[e.cat][0])}${e.state !== 'solid' ? `, a ${e.state} at room temperature` : ''}.`;
      let cellOf;
      if (!MED) { const s = Math.floor(clamp(Math.min((r0.width - 24) / 18 - 2, (r0.height * .36) / 9), 12, 30)), tab = h('div', { class: 'pp-tab', '--s': s + 'px' }), cells = {};
        for (let p = 1; p <= 7; p++) for (let g = 1; g <= 18; g++) if (p === 1 ? g === 1 || g === 18 : p < 4 ? g <= 2 || g >= 13 : true) tab.append(cells[p + '-' + g] = h('div', { class: 'pp-c', style: { gridRow: p, gridColumn: g } }));
        tab.append(h('div', { class: 'pp-gap', style: { gridRow: 8 } })); for (let i = 0; i < 15; i++) tab.append(cells['f-' + i] = h('div', { class: 'pp-c', style: { gridRow: 9, gridColumn: i + 3 } }));
        cellOf = e => e.group ? cells[e.period + '-' + e.group] : cells['f-' + (e.z - 89)]; c.el.append(tab); }
      const chute = h('div', { class: 'pp-chute' }), q = h('div', { class: 'pp-q' }), area = h('div', { style: { width: '100%', display: 'flex', justifyContent: 'center' } });
      c.el.append(chute, q);
      if (MED) { // the main-group table for elements 1 to 20: groups 1, 2 and 13 to 18 (the transition metals sit between groups 2 and 13 in the full table)
        const m = Math.floor(clamp(Math.min(r0.width / 8, (r0.height - 300) / 4.6), 44, 66)), mt = h('div', { class: 'pp-mt', '--m': m + 'px', style: { gridAutoRows: 'auto' } }), G = [1, 2, 13, 14, 15, 16, 17, 18];
        G.forEach((g, i) => mt.append(h('div', { class: 'pp-hd', style: { gridColumn: i + 1, gridRow: 1 }, text: g })));
        c.slots = E.filter(e => e.z <= 20).map(e => { const b = h('button', { class: 'pp-slot', type: 'button', 'aria-label': `Period ${e.period}, group ${e.group}`, style: { gridColumn: G.indexOf(e.group) + 1, gridRow: e.period + 1, height: m + 'px' }, onclick: () => place(e, b) }); b.e = e; mt.append(b); return b; });
        cellOf = e => c.slots.find(b => b.e === e);
        const cats = [...new Set(E.filter(e => e.z <= 20).map(e => e.cat))];
        c.el.append(mt, h('div', { class: 'pp-leg' }, cats.map(k => h('span', {}, h('i', { style: { background: ECAT[k][1] } }), ECAT[k][0]))));
        c.key(e => { const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) return; e.preventDefault();
          const f = c.slots.includes(document.activeElement) ? document.activeElement.e : null; if (!f) return c.slots[0].focus();
          let best = null, bd = 1e9; const col = G.indexOf(f.group);
          for (const b of c.slots) { const dc = G.indexOf(b.e.group) - col, dr = b.e.period - f.period; if ((d[0] && Math.sign(dc) === d[0] && !dr) || (d[1] && Math.sign(dr) === d[1])) { const dist = Math.abs(dc) + Math.abs(dr) * 1.5; if (dist < bd) { bd = dist; best = b; } } }
          if (best) best.focus(); });
      } else c.el.append(area);
      c.el.append(note);
      const deck = MED ? shuffle(E.filter(e => e.z <= 20)) : [];
      let seen = new Set();
      function question() {
        if (c.level === 0) { let e; do e = bySym(pick(EASY)); while (seen.has(e.sym) && seen.size < EASY.length); seen.add(e.sym);
          const toName = Math.random() < .5, near = E.filter(x => x !== e && (x.sym[0] === e.sym[0] || x.name[0] === e.name[0])), pool = shuffle(near).concat(shuffle(EASY.map(bySym).filter(x => x !== e)));
          const others = [...new Set(pool)].slice(0, 3);
          return { e, card: toName ? [e.sym, 'symbol'] : [e.name, 'element'], text: toName ? 'Which element has this symbol?' : `What is the symbol for ${lc(e.name)}?`,
            opts: shuffle([e, ...others]).map(x => ({ x, label: toName ? x.name : x.sym })), fact: `${e.sym} is the symbol for ${lc(e.name)}${e.latin ? ` (from the Latin “${e.latin}”)` : ''}.` }; }
        const kind = pick(['noble', 'halogen', 'alkali', 'metalloid', 'liquid', 'gas', 'latin', 'latin', 'atomic', 'atomic']);
        let e, others, text, f, tiles = true;
        if (kind === 'liquid' || kind === 'gas') { e = pick(E.filter(x => x.state === kind)); others = sample(E.filter(x => x.state !== kind && (kind === 'liquid' || x.state === 'solid')), 3);
          text = `Which of these is ${kind === 'gas' ? 'a gas' : 'a liquid'} at room temperature?`; f = `${e.name} (${e.sym}) is a ${kind} at room temperature.`; }
        else if (kind === 'latin') { e = pick(E.filter(x => x.latin)); others = LATIN[e.sym].map(bySym); tiles = false;
          text = `${e.name}'s symbol comes from its Latin name “${e.latin}”. Which symbol is it?`; f = `${e.sym}, the symbol for ${lc(e.name)}, comes from the Latin “${e.latin}”.`; }
        else if (kind === 'atomic') { e = pick(E.filter(x => x.z <= 36)); others = sample(E.filter(x => x !== e && Math.abs(x.z - e.z) <= 5), 3);
          text = `Which element has atomic number ${e.z}?`; f = `${e.name} (${e.sym}) has atomic number ${e.z}.`; }
        else { e = pick(E.filter(x => x.cat === kind)); others = sample(E.filter(x => x.cat !== kind && x.sym !== 'Se'), 3);
          text = `Which of these is ${an(ECAT[kind][0])}?`; f = `${e.name} (${e.sym}) is ${an(ECAT[kind][0])}.`; }
        return { e, card: ['?', kind === 'atomic' ? 'atomic number ' + e.z : kind === 'latin' ? e.latin : kind === 'liquid' || kind === 'gas' ? 'state' : 'family'], text, fact: f,
          opts: shuffle([e, ...others]).map(x => ({ x, label: tiles ? h('div', { class: 'pp-tile' }, h('b', { text: x.sym }), h('small', { text: x.name })) : h('div', { class: 'pp-tile' }, h('b', { text: x.sym })) })) };
      }
      function fly(from, to, e, done) {
        const a = from.getBoundingClientRect(), b = to.getBoundingClientRect(), f = h('div', { class: 'pp-fly', text: e.sym, '--k': ECAT[e.cat][1], style: { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' } });
        document.body.append(f); void f.offsetWidth; f.style.transform = `translate(${b.left - a.left + (b.width - a.width) / 2}px,${b.top - a.top + (b.height - a.height) / 2}px) scale(${Math.max(.3, b.width / a.width)})`; f.style.opacity = '.4';
        setTimeout(() => f.remove(), 560); c.after(480, done);
      }
      const lock = (cell, e) => { cell.style.setProperty('--k', ECAT[e.cat][1]); cell.classList.add('on'); if (MED) { cell.innerHTML = ''; cell.append(e.sym, h('small', { text: e.z })); } else cell.textContent = e.sym; };
      const pos = el => { const r = el.getBoundingClientRect(), s = c.el.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top]; };
      function finish() { const won = c.lives_ > 0, learnt = [...new Set(c.missed)].slice(0, 3); for (const f of shuffle(c.learnt)) if (learnt.length < 4 && !learnt.includes(f)) learnt.push(f);
        c.end({ won, title: won ? (MED ? 'Table complete!' : 'Element expert!') : 'Out of lives', msg: won ? (MED ? 'Elements 1 to 20 are all in place.' : `You answered ${c.k} cards.`) : 'Each card that lands or goes wrong costs a life.', stats: { Cards: c.k + ' / ' + L.n }, learnt }); }
      function next() {
        if (c.lives_ <= 0 || c.k >= L.n) return finish();
        chute.innerHTML = ''; note.textContent = ''; area.innerHTML = ''; c.busy = false; c.left = L.t;
        if (MED) { const e = c.cur = deck.shift(); c.card = h('div', { class: 'pp-card' }, h('b', { text: e.sym }), h('small', { text: e.name + ' · ' + e.z })); q.textContent = `Where does ${lc(e.name)} (atomic number ${e.z}) go?`; }
        else { const Q = c.Q = question(); c.card = h('div', { class: 'pp-card' }, h('b', { text: Q.card[0] }), h('small', { text: Q.card[1] })); q.textContent = Q.text;
          c.ch = c.choices(area, Q.opts.map(o => o.label), i => answer(i), { cols: c.level === 0 ? 2 : 4 }); }
        chute.append(c.card); c.hud({ cards: (c.k + 1) + ' / ' + L.n });
      }
      function answer(i) {
        if (c.busy) return; c.busy = true; c.ch.lock(); const Q = c.Q, ri = Q.opts.findIndex(o => o.x === Q.e), btn = c.ch.btns[i >= 0 ? i : ri]; c.k++; c.learnt.push(Q.fact);
        if (i === ri) { c.ch.mark(i, true); c.right(10 + c.level * 5 + Math.round(5 * c.left / L.t), ...pos(btn)); note.textContent = '✓ ' + Q.fact; fly(btn, cellOf(Q.e), Q.e, () => { lock(cellOf(Q.e), Q.e); c.after(250, next); }); }
        else { if (i >= 0) c.ch.mark(i, false); c.ch.mark(ri, true); c.wrong(...pos(btn), i < 0 ? 'Landed!' : 'Not this one'); c.lose(); c.missed.push(Q.fact); note.textContent = '✗ ' + Q.fact; c.after(1500, next); }
      }
      function place(e, b) {
        if (c.busy || !c.cur) return; const cur = c.cur;
        if (e === cur) { c.busy = true; c.k++; c.right(10 + Math.round(5 * c.left / L.t), ...pos(b)); note.textContent = '✓ ' + fact(cur); c.learnt.push(fact(cur)); fly(c.card, b, cur, () => { lock(b, cur); c.after(200, next); }); }
        else { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); c.after(450, () => b.classList.remove('no')); c.wrong(...pos(b), 'Not here');
          note.textContent = `✗ ${cur.name} is number ${cur.z}. Count along the rows from hydrogen (1), left to right, top to bottom.`; c.missed.push(`The table is in order of atomic number: ${cur.name} (${cur.z}) is in period ${cur.period}, group ${cur.group}.`);
          if (c.lose() <= 0) { c.busy = true; c.after(900, finish); } }
      }
      c.loop(dt => { if (c.busy || !c.card) return; c.left -= dt * Edu.SPEED; const H = chute.clientHeight - c.card.offsetHeight - 4; c.card.style.top = (H * clamp(1 - c.left / L.t, 0, 1)) + 'px';
        if (c.left <= 0) { if (MED) { c.busy = true; c.wrong(...pos(chute), 'Landed!'); note.textContent = `✗ It landed! ${c.cur.name} goes back in the pile.`; deck.splice(rnd(deck.length), 0, c.cur); c.missed.push(`The table is in order of atomic number: ${c.cur.name} (${c.cur.z}) is in period ${c.cur.period}, group ${c.cur.group}.`); c.lose(); c.after(1100, next); } else answer(-1); } });
      const rnd = n => Math.floor(Math.random() * (n + 1));
      c.after(80, next);
    },
    bot(c) { if (c.busy) return; if (c.level === 1) { const b = c.slots && c.slots.find(s => s.e === c.cur); if (b) b.click(); } else if (c.ch) c.ch.btns[c.Q.opts.findIndex(o => o.x === c.Q.e)].click(); },
    miss(c) { if (c.busy) return; if (c.level === 1) { const b = c.slots && c.slots.find(s => s.e !== c.cur && !s.classList.contains('on')); if (b) b.click(); } else if (c.ch) c.ch.btns[c.Q.opts.findIndex(o => o.x !== c.Q.e)].click(); }
  });
})();
