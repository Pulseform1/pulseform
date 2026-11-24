/* ---------- DOM UI: navigation, top bar, toasts, modal, hub, shop, pack inventory, quests ---------- */

const UI = { screen: null, shop: { fam: 'dragonfire', tier: 'standard' } };
const SVG = {
  pack: '<svg viewBox="0 0 24 24"><path d="M6 3h12l-1 3H7z"/><path d="M7 6h10v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/><path d="M10 12l2-2 2 2-2 3z"/></svg>',
  shop: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/><circle cx="12" cy="14" r="2"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M9 7h6M9 11h6"/></svg>',
  army: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  quest: '<svg viewBox="0 0 24 24"><path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
  trade: '<svg viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4"/></svg>',
  duel: '<svg viewBox="0 0 24 24"><path d="M4 4l10 10M20 4L10 14M6 18l-2 2M18 18l2 2M8 16l-2-2M16 16l2-2"/></svg>',
  sfx: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  music: '<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>'
};
const SCREEN_SCENE = { hub: ['hub', true], shop: ['hub', true], packs: ['hub', true], quests: ['hub', false], binder: ['hub', false], map: ['hub', false], army: ['army', true], open: ['open', true], battle: ['battle', true] };
function go(name, arg) {
  if (UI.screen === 'open' && name !== 'open' && OPEN.leave) OPEN.leave();
  if (UI.screen === 'battle' && name !== 'battle' && BT.leave) BT.leave();
  UI.screen = name;
  $$('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + name));
  const sc = SCREEN_SCENE[name] || ['hub', true];
  setScene(sc[0]);
  if (SC.all[sc[0]]) SC.all[sc[0]].live = sc[1];
  SC.needs = true;
  setMood(name === 'battle' ? 'battle' : 'hub');
  const fn = RENDER[name];
  if (fn) fn(arg);
  guideCheck();
}
const RENDER = {};
function backBtn(to) { const b = el('button', 'back', '‹'); b.setAttribute('aria-label', 'Back'); b.onclick = () => { SFX.back(); go(to || 'hub'); }; return b; }
function toast(msg, kind) {
  const t = el('div', 'toast' + (kind ? ' ' + kind : ''), esc(msg));
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3100);
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
}
function refreshCurrency() {
  if (!S) return;
  const c = $('#cCoins'), e = $('#cEss');
  if (c.textContent !== fmt(S.coins)) { c.textContent = fmt(S.coins); c.parentNode.classList.remove('bump'); void c.offsetWidth; c.parentNode.classList.add('bump'); }
  if (e.textContent !== fmt(S.essence)) { e.textContent = fmt(S.essence); e.parentNode.classList.remove('bump'); void e.offsetWidth; e.parentNode.classList.add('bump'); }
}
function refreshBadges() {
  const set = (sel, n) => { const b = $(sel); if (b) { b.textContent = n; b.hidden = !n; } };
  set('#bdPacks', itemsLeft());
  set('#bdQuests', claimableCount());
  set('#bdBinder', Object.keys(S.fresh).length + FACTIONS.reduce((a, f) => a + SET_STEPS.filter((_, i) => setStepState(f.id, i) === 'ready').length, 0));
}
function showModal(o) {
  const m = $('#modal');
  m.innerHTML = '';
  const box = el('div', 'mbox panel');
  box.innerHTML = `<h3>${o.title}</h3>${o.html || ''}`;
  const bs = el('div', 'btns');
  for (const b of o.buttons || [{ t: 'OK' }]) {
    const btn = el('button', 'btn ' + (b.cls || ''), b.t);
    btn.onclick = () => { SFX.click(); m.hidden = true; if (b.fn) b.fn(); };
    bs.appendChild(btn);
  }
  box.appendChild(bs);
  m.appendChild(box);
  m.hidden = false;
}
function coinTxt(n) { return `<i class="ico-coin"></i>${fmt(n)}`; }
function setToggles() {
  $('#btnSfx').innerHTML = SVG.sfx; $('#btnMusic').innerHTML = SVG.music;
  $('#btnSfx').classList.toggle('off', !S.settings.sfx);
  $('#btnMusic').classList.toggle('off', !S.settings.music);
}

/* ---------- hub ---------- */
RENDER.hub = () => {
  const s = $('#s-hub');
  const found = Object.keys(S.seen).length;
  s.innerHTML = `<div class="hub-l"><div class="hub-logo"><small>THE SIX REALMS</small>MYTHIC<br>ARMIES</div>
    <div class="hub-tag">Rip open shimmering packs, discover the creatures of six realms, and lead them into battle.</div>
    <div class="proto" title="This milestone ships a prototype subset of the planned roster">Prototype set: ${CHARS.length} of ${PLANNED_TOTAL} planned · ${found} discovered</div></div>
    <div class="hub-r">
      <div class="tiles">
        <button class="tile big" id="tPacks"><span class="ti">${SVG.pack}</span><div><b>Open Packs</b><span>${itemsLeft() ? itemsLeft() + ' waiting to be opened' : 'Buy packs in the shop'}</span></div><em class="badge" id="bdPacks"></em></button>
        <button class="tile" id="tShop"><span class="ti">${SVG.shop}</span><div><b>Shop</b><span>Packs, boxes, daily cards</span></div></button>
        <button class="tile" id="tBinder"><span class="ti">${SVG.book}</span><div><b>Collection</b><span>${found} / ${CHARS.length}</span></div><em class="badge" id="bdBinder"></em></button>
        <button class="tile" id="tArmy"><span class="ti">${SVG.army}</span><div><b>Army</b><span>${S.army.filter(Boolean).length} / 6 units</span></div></button>
        <button class="tile" id="tMap"><span class="ti">${SVG.map}</span><div><b>Campaign</b><span>Stage ${Math.min(24, Object.keys(S.campaign.cleared).length + 1)} of 24</span></div></button>
        <button class="tile" id="tQuests"><span class="ti">${SVG.quest}</span><div><b>Quests</b><span>Daily goals, achievements</span></div><em class="badge" id="bdQuests"></em></button>
        <button class="tile" id="tMore" title="Settings and help"><span class="ti">${SVG.book}</span><div><b>How to play</b><span>Guide and settings</span></div></button>
      </div>
      <div class="tiles">
        <button class="tile locked" id="tTrade"><span class="ti">${SVG.trade}</span><div><b>Trading</b><span class="lock">Coming soon · needs online accounts</span></div></button>
        <button class="tile locked" id="tDuel"><span class="ti">${SVG.duel}</span><div><b>Battle a friend</b><span class="lock">Coming soon · needs online accounts</span></div></button>
      </div>
    </div>`;
  const nav = { tPacks: 'packs', tShop: 'shop', tBinder: 'binder', tArmy: 'army', tMap: 'map', tQuests: 'quests' };
  for (const k in nav) $('#' + k).onclick = () => { SFX.click(); go(nav[k]); };
  $('#tMore').onclick = () => { SFX.click(); showHelp(); };
  $('#tTrade').onclick = $('#tDuel').onclick = () => { SFX.error(); showModal({ title: 'Coming soon', html: '<p>Trading cards and battling friends will arrive once Mythic Armies is connected to online accounts, so that your collection is kept safely on the server and every trade is fair.</p><p class="sub">Your cards, packs and progress are already stored in a way that can move to an account later.</p>' }); };
  refreshBadges();
  const best = S.cards.map(c => CHAR[c.charId]).sort((a, b) => b.r - a.r || a.num - b.num)[0];
  SC.all.hub.setFeatured(best ? best.id : 'em27');
};
function showHelp() {
  showModal({ title: 'How to play', html: `<p style="text-align:left">1. <b>Packs</b> hold 5 cards. Drag across the top seam (or press and hold) to tear one open, then tap each card to flip it.<br>
  2. <b>Rarity</b>: Common, Uncommon, Rare, Epic, Legendary, Mythic. Better cards glow before they flip.<br>
  3. <b>Collection</b>: browse, filter and inspect your cards and their 3D models.<br>
  4. <b>Army</b>: place up to six units on the front and back rows. Two or four units of one faction unlock a bonus.<br>
  5. <b>Campaign</b>: battles play out automatically. Win coins, Essence and XP, then buy more packs.</p>
  <p class="sub">Progress saves on this device automatically.</p>`, buttons: [{ t: 'Replay the guide', fn: () => { S.guide = 0; save(); go('hub'); } }, { t: 'Close', cls: 'gold' }] });
}

/* ---------- shop ---------- */
function packImage(fam, tier) {
  const k = 'pk' + fam + tier;
  if (ICONS[k]) return ICONS[k];
  const cv = document.createElement('canvas'); cv.width = 240; cv.height = 380;
  drawPackFront(cv.getContext('2d'), 240, 380, fam, tier, true);
  return (ICONS[k] = cv.toDataURL('image/png'));
}
function oddsTable(t) {
  const T = TIER[t];
  let h = '<table class="odds"><tr><th></th><th>Cards 1-4</th><th>Card 5</th><th>Per pack*</th></tr>';
  for (let r = 0; r < 6; r++) {
    const a = T.base[r], b = T.last ? T.last[r] : T.base[r];
    const tot = T.base.reduce((x, y) => x + y, 0), tot2 = T.last ? T.last.reduce((x, y) => x + y, 0) : tot;
    const pA = a / tot, pB = b / tot2, per = 1 - Math.pow(1 - pA, 4) * (1 - pB);
    h += `<tr><th style="color:${RAR[r].col}">${RAR[r].name}</th><td>${a}%</td><td>${b}%</td><td>${(per * 100).toFixed(per < 0.1 ? 1 : 0)}%</td></tr>`;
  }
  return h + '</table><div class="sub" style="margin-top:4px">*Chance of at least one card of that rarity. Rarity is rolled first; you then get a character you do not own yet whenever one is left in that rarity.</div>';
}
RENDER.shop = () => {
  const s = $('#s-shop'), U = UI.shop, F = FAMILY[U.fam], T = TIER[U.tier];
  const offers = dailyOffers();
  s.innerHTML = '';
  const bar = el('div', 'bar');
  bar.append(backBtn(), el('h2', 'title', 'Shop'), el('div', 'grow'), el('span', 'sub', `Legendary+ guaranteed within <b style="color:var(--gold)">${PITY_PACKS - S.pity}</b> packs`));
  s.appendChild(bar);
  const wrap = el('div', 'shop-wrap');
  const L = el('div', 'shop-l scroll');
  const fams = el('div', 'fams');
  for (const f of FAMILIES) {
    const b = el('button', 'fam' + (f.id === U.fam ? ' on' : ''), `<img src="${iconURL('crest', f.fac, 20)}" alt="">${f.name}`);
    b.onclick = () => { SFX.soft(); U.fam = f.id; RENDER.shop(); };
    fams.appendChild(b);
  }
  const tiers = el('div', 'tiers');
  for (const t of TIERS) {
    const b = el('button', 'tier' + (t.id === U.tier ? ' on' : ''), `<b style="color:${t.col}">${t.name}</b><small>${t.note}</small><small style="margin-top:4px;color:#fff3dc;font-weight:900">${coinTxt(t.price)}</small>`);
    b.onclick = () => { SFX.soft(); U.tier = t.id; RENDER.shop(); };
    tiers.appendChild(b);
  }
  const prev = el('div', 'panel', '');
  prev.style.cssText = 'display:flex;gap:12px;align-items:center;padding:12px';
  prev.innerHTML = `<img class="pack-prev" src="${packImage(U.fam, U.tier)}" alt="${F.name} pack"><div style="flex:1;min-width:0"><b style="font:900 19px var(--fd)">${F.name} ${T.name} Pack</b>
    <div class="sub" style="margin:4px 0 8px">5 cards · ${Math.round(HOME_WEIGHT * 100)}% ${FAC[F.fac].name} characters · opening effect: ${F.tag.toLowerCase()}</div>
    <div class="buyrow" id="buyrow"></div></div>`;
  L.append(fams, tiers, prev);
  const br = prev.querySelector('#buyrow');
  for (const kind of ['single', 'small', 'large']) {
    const n = kind === 'single' ? 1 : BOXES[kind].n, price = kind === 'single' ? T.price : boxPrice(U.tier, kind);
    const b = el('button', 'buy', `<b>${kind === 'single' ? '1 Pack' : BOXES[kind].name}</b><small>${n} pack${n > 1 ? 's' : ''}${kind !== 'single' ? ' · save ' + Math.round(BOXES[kind].off * 100) + '%' : ''}</small><span class="btn small gold${S.coins < price ? ' dis' : ''}">${coinTxt(price)}</span>`);
    b.onclick = () => {
      if (S.coins < price) { SFX.error(); toast(`You need ${fmt(price - S.coins)} more coins. Win battles to earn them!`); return; }
      const it = buyPacks(U.fam, U.tier, kind);
      if (!it) return;
      SFX.buy();
      showModal({ title: 'Purchased!', html: `<p>${it.type === 'box' ? it.name + ' (' + it.packs.length + ' packs)' : F.name + ' ' + T.name + ' Pack'} added to your packs.</p>`, buttons: [{ t: 'Keep shopping' }, { t: 'Open now', cls: 'gold', fn: () => it.type === 'box' ? openBox(it) : openPack(it) }] });
      RENDER.shop();
    };
    br.appendChild(b);
  }
  const R = el('div', 'shop-r scroll');
  const od = el('div', 'panel', `<div style="padding:12px"><b style="font:800 15px var(--fd)">${T.name} pack odds</b><div style="margin-top:6px">${oddsTable(U.tier)}</div></div>`);
  const daily = el('div', 'panel');
  daily.style.cssText = 'padding:12px;margin-top:10px';
  const hrs = Math.floor(msToMidnight() / 3600000), mins = Math.floor(msToMidnight() / 60000) % 60;
  daily.innerHTML = `<div class="bar" style="margin-bottom:6px"><b style="font:800 15px var(--fd)">Daily cards</b><span class="grow"></span><span class="sub">New in ${hrs}h ${mins}m</span></div><div class="daily" id="daily"></div>`;
  R.append(od, daily);
  const dd = daily.querySelector('#daily');
  offers.forEach((o, i) => {
    const c = CHAR[o.id], bought = S.daily.bought.includes(i);
    const d = el('div', 'dcard', `<img alt=""><div style="color:${RAR[c.r].col};font-weight:900">${RAR[c.r].name}</div>`);
    cardThumb(c.id, 'std', false).then(u => { d.querySelector('img').src = u; });
    const b = el('button', 'btn small ' + (bought ? '' : 'gold') + (bought || S.coins < o.price ? ' dis' : ''), bought ? 'Bought' : coinTxt(o.price));
    b.style.marginTop = '4px';
    b.onclick = () => { const res = buyDaily(i); if (!res) { SFX.error(); return; } SFX.buy(); toast(`${res.c.name} joined your collection${res.isNew ? ' (NEW!)' : ''}`); RENDER.shop(); };
    d.querySelector('img').onclick = () => openViewer(c.id);
    d.appendChild(b);
    dd.appendChild(d);
  });
  wrap.append(L, R);
  s.appendChild(wrap);
};

/* ---------- unopened packs and boxes ---------- */
RENDER.packs = () => {
  const s = $('#s-packs');
  s.innerHTML = '';
  const bar = el('div', 'bar');
  bar.append(backBtn(), el('h2', 'title', 'Your Packs'), el('div', 'grow'), el('span', 'sub', `Legendary+ guaranteed within <b style="color:var(--gold)">${PITY_PACKS - S.pity}</b> packs`));
  s.appendChild(bar);
  const inv = el('div', 'inv scroll');
  const boxes = S.items.filter(i => i.type === 'box');
  const groups = {};
  for (const it of S.items.filter(i => i.type === 'pack')) (groups[it.family + '|' + it.tier] = groups[it.family + '|' + it.tier] || []).push(it);
  for (const b of boxes) {
    const d = el('button', 'invi', `<img src="${boxImage(b)}" alt=""><b>${esc(b.name)}</b><small>${b.packs.length} packs inside · tap to open</small>`);
    d.onclick = () => { SFX.click(); openBox(b); };
    inv.appendChild(d);
  }
  for (const k of Object.keys(groups).sort((a, b) => TIER[b.split('|')[1]].i - TIER[a.split('|')[1]].i)) {
    const list = groups[k], it = list[0];
    const d = el('button', 'invi', `<img src="${packImage(it.family, it.tier)}" alt=""><b>${FAMILY[it.family].name}</b><small style="color:${TIER[it.tier].col}">${TIER[it.tier].name} pack</small><span class="tag cnt">x${list.length}</span>`);
    d.onclick = () => { SFX.click(); openPack(it); };
    inv.appendChild(d);
  }
  if (!S.items.length) {
    const e = el('div', 'panel', `<div style="padding:24px;text-align:center"><b style="font:900 20px var(--fd)">No packs left</b><p class="sub" style="margin:8px 0 14px">Win battles in the campaign to earn coins, then buy packs in the shop.</p></div>`);
    const row = el('div', 'bar'); row.style.justifyContent = 'center';
    const b1 = el('button', 'btn gold', 'Go to shop'); b1.onclick = () => go('shop');
    const b2 = el('button', 'btn', 'Battle'); b2.onclick = () => go('map');
    row.append(b1, b2); e.firstChild.appendChild(row);
    inv.appendChild(e);
  }
  s.appendChild(inv);
};
function boxImage(b) {
  const k = 'bx' + b.kind + (b.packs[0] && b.packs[0].family);
  if (ICONS[k]) return ICONS[k];
  const cv = document.createElement('canvas'); cv.width = 240; cv.height = 300;
  const x = cv.getContext('2d');
  const tex = boxTextureCanvas(b);
  x.drawImage(tex, 0, 0, tex.width, tex.height * 0.62, 10, 40, 220, 220);
  return (ICONS[k] = cv.toDataURL());
}

/* ---------- quests and achievements ---------- */
RENDER.quests = () => {
  ensureQuests();
  const s = $('#s-quests');
  s.innerHTML = '';
  const bar = el('div', 'bar');
  bar.append(backBtn(), el('h2', 'title', 'Quests'));
  s.appendChild(bar);
  const cols = el('div', 'cols2');
  const L = el('div', 'scroll'), R = el('div', 'scroll');
  const hrs = Math.floor(msToMidnight() / 3600000);
  L.innerHTML = `<div class="bar"><b style="font:800 17px var(--fd)">Daily quests</b><span class="grow"></span><span class="sub">New quests in ${hrs}h</span></div>`;
  const ql = el('div', 'q-list');
  S.quests.list.forEach((q, i) => {
    const def = QUEST_POOL.find(x => x.id === q.id);
    const d = el('div', 'q' + (q.claimed ? ' claimed' : q.done ? ' done' : ''), `<div class="qt"><b>${def.text}</b><div class="pbar"><i style="width:${q.prog / def.goal * 100}%;background:linear-gradient(90deg,#7dffa8,#3ac070)"></i></div><span class="sub">${fmt(q.prog)} / ${fmt(def.goal)}</span></div>`);
    const b = el('button', 'btn small ' + (q.done && !q.claimed ? 'gold' : 'dis'), q.claimed ? 'Claimed' : coinTxt(def.coins));
    b.onclick = () => { const n = claimQuest(i); if (n) { SFX.coin(); toast(`+${n} coins`); RENDER.quests(); } };
    d.appendChild(b); ql.appendChild(d);
  });
  L.appendChild(ql);
  const lk = el('div', 'lockbox', '<b>Coming with online accounts:</b> trading with friends and friendly battles. These need a server to keep everyone\'s collection safe, so they are not part of this prototype.');
  lk.style.marginTop = '14px';
  L.appendChild(lk);
  R.innerHTML = `<div class="bar"><b style="font:800 17px var(--fd)">Achievements</b></div>`;
  const al = el('div', 'q-list');
  for (const a of ACHS) {
    const st = achState(a);
    const d = el('div', 'q' + (st === 'claimed' ? ' claimed' : st === 'ready' ? ' done' : ''), `<div class="qt"><b>${a.text}</b><span class="sub">${st === 'locked' ? 'In progress' : st === 'ready' ? 'Complete!' : 'Claimed'}</span></div>`);
    const b = el('button', 'btn small ' + (st === 'ready' ? 'gold' : 'dis'), st === 'claimed' ? 'Done' : coinTxt(a.coins));
    b.onclick = () => { const n = claimAch(a.id); if (n) { SFX.coin(); toast(`+${n} coins`); RENDER.quests(); } };
    d.appendChild(b); al.appendChild(d);
  }
  R.appendChild(al);
  cols.append(L, R);
  s.appendChild(cols);
};
