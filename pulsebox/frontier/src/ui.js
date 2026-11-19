// The pack (I) and the storage panels for the meat box and the chest. Plain DOM over the game.
const $ = s => document.querySelector(s);
const cap = s => s[0].toUpperCase() + s.slice(1);
const STATE = { raw: 'raw', cooked: 'roasted', dried: 'dried' };

export class UI {
  constructor(G) { this.G = G; this.open = null; this.toastT = 0; this.el = $('#panel'); this.el.addEventListener('click', e => this.click(e)); }
  toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); this.toastT = 3.6; }
  tick(dt) { if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) $('#toast').classList.remove('on'); } if (this.open) this.render(); }
  show(kind) { this.open = kind; this.el.hidden = false; this.G.onPanel(true); this.render(true); }
  close() { if (!this.open) return; if (this.open === 'chest') this.G.camp.chestOpen = false; this.open = null; this.el.hidden = true; this.G.onPanel(false); }
  openPack() { this.show('pack'); }
  storage(kind) { this.show(kind); }
  meatRows(list, act, label) {
    if (!list.length) return '<p class="empty">No meat.</p>';
    return list.map((m, i) => `<div class="row2"><span>${cap(m.meat)} <i>${STATE[m.state]}</i></span><b>${Math.round(m.lb)} lb</b>${act ? `<button data-a="${act}" data-i="${i}">${label}</button>` : ''}</div>`).join('');
  }
  render(force) {
    const G = this.G, L = G.life, W = G.weapons, k = this.open, h = G.sky.hours, hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    let html = '', extra = '';
    if (k === 'pack') {
      const tally = Object.entries(G.stats.taken).map(([n, c]) => `${c} ${n}`).join(', ') || 'nothing yet';
      html = `<h2>Your pack</h2><p class="sub">Day ${G.day + 1}, ${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}</p>
        <h3>Firewood</h3><div class="row2"><span>Split and dry wood</span><b>${L.pack.wood} / 8</b></div>
        <h3>Meat <small>${Math.round(L.lbCarried)} / 120 lb</small></h3>${this.meatRows(L.pack.meat)}
        <h3>Ammunition</h3><div class="row2"><span>Rifle cartridges</span><b>${W.ammo.rifle} loaded, ${W.reserve.rifle} spare</b></div><div class="row2"><span>Shotgun shells</span><b>${W.ammo.shotgun} loaded, ${W.reserve.shotgun} spare</b></div>
        <h3>Lantern</h3><div class="row2"><span>${G.camp.lantern.carried ? 'In your hand' : 'Hanging at camp'}</span><b>${G.camp.lantern.on ? 'lit' : 'out'}</b></div>
        <h3>Taken this trip</h3><p class="sub">${tally}</p>`;
    } else if (k === 'meatbox') {
      html = `<h2>Meat box</h2><p class="sub">Salted and cool in the shade of the tent. Meat keeps here.</p>
        <div class="cols"><div><h3>Pack <small>${Math.round(L.lbCarried)} / 120 lb</small></h3>${this.meatRows(L.pack.meat, 'store', 'Store')}</div>
        <div><h3>Box <small>${Math.round(L.box.reduce((s, m) => s + m.lb, 0))} lb</small></h3>${this.meatRows(L.box, 'take', 'Take')}</div></div>
`;
      extra = '<button data-a="storeall">Store all meat</button>';
    } else if (k === 'chest') {
      html = `<h2>Chest</h2><p class="sub">Powder, lead and primers: you load fresh cartridges each morning.</p>
        <div class="row2"><span>Rifle cartridges</span><b>${W.reserve.rifle} carried &middot; ${L.chest.rifle} in the chest</b><button data-a="ammo" data-k="rifle" data-n="10">Take 10</button><button data-a="ammo" data-k="rifle" data-n="-10">Store 10</button></div>
        <div class="row2"><span>Shotgun shells</span><b>${W.reserve.shotgun} carried &middot; ${L.chest.shotgun} in the chest</b><button data-a="ammo" data-k="shotgun" data-n="6">Take 6</button><button data-a="ammo" data-k="shotgun" data-n="-6">Store 6</button></div>`;
    }
    html += `<div class="acts">${extra}<button data-a="close" class="close">Close &middot; ${k === 'pack' ? 'I' : 'E'}</button></div>`;
    if (force || html !== this._last) { this.el.innerHTML = html; this._last = html; }
  }
  click(e) {
    const b = e.target.closest('button'); if (!b) return; const a = b.dataset.a, L = this.G.life, W = this.G.weapons;
    if (a === 'close') return this.close();
    if (a === 'store') { const m = L.pack.meat[+b.dataset.i]; if (m) { L.addMeat(L.box, m.meat, m.lb, m.state); m.lb = 0; L.addMeat(L.pack.meat, m.meat, 0, m.state); } }
    if (a === 'storeall') { for (const m of L.pack.meat) L.addMeat(L.box, m.meat, m.lb, m.state); L.pack.meat.length = 0; }
    if (a === 'take') { const m = L.box[+b.dataset.i]; if (m) { const room = 120 - L.lbCarried, n = Math.min(m.lb, room); if (n <= 0) this.toast('Your pack is full.'); else { L.addMeat(L.pack.meat, m.meat, n, m.state); m.lb -= n; L.addMeat(L.box, m.meat, 0, m.state); } } }
    if (a === 'ammo') { const k = b.dataset.k, n = +b.dataset.n; if (n > 0) { const t = Math.min(n, L.chest[k]); L.chest[k] -= t; W.reserve[k] += t; } else { const t = Math.min(-n, W.reserve[k]); W.reserve[k] -= t; L.chest[k] += t; } }
    this.render(true);
  }
}
