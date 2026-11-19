// The pack (I: your guns, food, ammunition and coin), the meat box, and the supply chest where you buy ammunition.
// Plain DOM over the game.
import { GUNS, ORDER, AMMO } from './weapons.js';
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
      const guns = ORDER.map((g, i) => { const d = GUNS[g], on = W.want === g; return `<div class="gun${on ? ' on' : ''}"><i>${i + 1}</i><span>${d.name}</span><b>${d.rod ? (G.fishing ? G.fishing.caughtLabel : '') : `${W.ammo[g]} / ${W.reserve[d.ammo]}`}</b><button data-a="equip" data-g="${g}">${on ? 'Put away' : 'Equip'}</button></div>`; }).join('');
      const food = L.pack.meat.filter(m => m.lb > .01 && m.state !== 'raw').reduce((s, m) => s + m.lb, 0);
      html = `<h2>Your pack</h2><p class="sub">Day ${G.day + 1}, ${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'} &middot; <b class="coin">${G.coins | 0} coins</b> &middot; health ${Math.round(G.health)}</p>
        <h3>Guns <small>number keys, or Equip</small></h3><div class="guns">${guns}</div>
        <h3>Meat <small>${Math.round(L.lbCarried)} / 120 lb</small></h3>${this.meatRows(L.pack.meat)}${G.health < 100 && L.pack.meat.some(m => m.lb > .01) ? `<div class="acts left"><button data-a="eat">Eat (F)${food ? '' : ' raw meat'}</button></div>` : ''}
        <h3>Firewood</h3><div class="row2"><span>Split and dry wood</span><b>${L.pack.wood} / 8</b></div>
        <h3>Lantern</h3><div class="row2"><span>${G.camp.lantern.carried ? 'In your hand' : 'Hanging at camp'}</span><b>${G.camp.lantern.on ? 'lit' : 'out'}</b></div>
        <h3>Taken this trip</h3><p class="sub">${tally}</p>`;
    } else if (k === 'meatbox') {
      html = `<h2>Meat box</h2><p class="sub">Salted and cool in the shade of the tent. Meat keeps here.</p>
        <div class="cols"><div><h3>Pack <small>${Math.round(L.lbCarried)} / 120 lb</small></h3>${this.meatRows(L.pack.meat, 'store', 'Store')}</div>
        <div><h3>Box <small>${Math.round(L.box.reduce((s, m) => s + m.lb, 0))} lb</small></h3>${this.meatRows(L.box, 'take', 'Take')}</div></div>
`;
      extra = '<button data-a="storeall">Store all meat</button>';
    } else if (k === 'chest') {
      const used = { rifle: 'Long rifle', shell: 'Pump shotgun and double barrel', pistol: 'Revolver' };
      html = `<h2>Supply chest</h2><p class="sub">Ammunition from the trading post, paid for with what you hunt. You have <b class="coin">${G.coins | 0} coins</b>.</p>
        ${Object.entries(AMMO).map(([a, d]) => `<div class="row2 shop"><span>${d.name}<small>${used[a]}</small></span><b>${W.reserve[a]} carried${L.chest[a] ? ` &middot; ${L.chest[a]} in the chest` : ''}</b><button data-a="buy" data-k="${a}" ${G.coins < d.price ? 'disabled' : ''}>Buy ${d.box} &middot; ${d.price} coins</button>${L.chest[a] ? `<button data-a="ammo" data-k="${a}" data-n="${d.box}">Take ${Math.min(d.box, L.chest[a])}</button>` : ''}${W.reserve[a] ? `<button data-a="ammo" data-k="${a}" data-n="-${d.box}">Store</button>` : ''}</div>`).join('')}
        <p class="sub">Every animal you bring down pays: a rabbit 2 coins, a deer 12, an elk 22, a moose 32, a grizzly 48. Fish pay by the pound.</p>`;
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
    if (a === 'buy') { const k = b.dataset.k, d = AMMO[k]; if (this.G.coins >= d.price) { this.G.coins -= d.price; W.reserve[k] += d.box; this.toast(`You buy ${d.box} ${d.name.toLowerCase()}.`); } else this.toast('Not enough coins. Hunt or fish for more.'); }
    if (a === 'equip') { const g = b.dataset.g; W.select(W.want === g ? null : g); }
    if (a === 'eat') this.G.eat && this.G.eat();
    this.render(true);
  }
}
