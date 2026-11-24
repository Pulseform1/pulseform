/* ---------- packs, odds, duplicate protection, shop, quests, achievements, units, campaign ---------- */

const TIERS = [
  { id: 'standard', name: 'Standard', price: 180, col: '#cdd6e4', col2: '#8a97ab',
    base: [60, 25, 10, 4, 0.9, 0.1], last: null, note: 'Normal odds on every card.' },
  { id: 'greater', name: 'Greater', price: 450, col: '#ffd36b', col2: '#b07a1a',
    base: [50, 30, 13, 5.5, 1.3, 0.2], last: [0, 0, 70, 22, 6.5, 1.5], note: 'One guaranteed Rare or better.' },
  { id: 'grand', name: 'Grand', price: 1100, col: '#ff9cf0', col2: '#7b3bd6',
    base: [40, 32, 18, 7.5, 2, 0.5], last: [0, 0, 0, 75, 20, 5], note: 'One guaranteed Epic or better.' }
];
const TIER = {}; TIERS.forEach((t, i) => { t.i = i; TIER[t.id] = t; });
const PITY_PACKS = 40;
const BOXES = { small: { n: 5, off: 0.05, name: 'Small Box' }, large: { n: 15, off: 0.12, name: 'Large Box' } };
function boxPrice(tier, kind) { return Math.round(TIER[tier].price * BOXES[kind].n * (1 - BOXES[kind].off) / 10) * 10; }
const WIN_COINS_AVG = 50;

function rollFrom(w, R) {
  const tot = w.reduce((a, b) => a + b, 0);
  let x = (R || Math.random)() * tot;
  for (let i = 0; i < w.length; i++) { x -= w[i]; if (x < 0) return i; }
  return w.length - 1;
}
/* Rarity is rolled first for each slot; only then is a character chosen inside that rarity. */
function rollPack(famId, tierId, ownedCount, pity, R) {
  R = R || Math.random;
  const T = TIER[tierId], rar = [];
  for (let i = 0; i < 5; i++) rar.push(rollFrom(i === 4 && T.last ? T.last : T.base, R));
  let pityHit = false;
  if (pity + 1 >= PITY_PACKS && !rar.some(r => r >= 4)) { rar[4] = R() < 0.9 ? 4 : 5; pityHit = true; }
  rar.sort((a, b) => a - b);
  const used = new Set(), cards = [];
  for (const r of rar) {
    const c = pickChar(famId, r, ownedCount, used, R);
    used.add(c.id);
    cards.push({ id: c.id, r, variant: R() < 0.04 ? 'radiant' : 'std' });
  }
  return { cards, pity: rar.some(r => r >= 4) ? 0 : pity + 1, pityHit };
}
/* Duplicate protection: choose a faction by the family weights, then prefer any character of that rarity the player
   does not own yet (first in the chosen faction, then anywhere in the pack's pool); only if every character of that
   rarity is owned does a duplicate appear. Owning commons never changes which rarity is rolled. */
function pickChar(famId, r, owned, used, R) {
  const home = FAMILY[famId].fac;
  const others = FACTIONS.map(f => f.id).filter(id => id !== home);
  const first = R() < HOME_WEIGHT ? home : others[Math.floor(R() * others.length)];
  const order = [first].concat(shuffle(R, FACTIONS.map(f => f.id).filter(id => id !== first)));
  if (first !== home) { order.splice(order.indexOf(home), 1); order.splice(1, 0, home); }
  for (const fid of order) {
    const pool = (BY_FR[fid + r] || []).filter(c => !used.has(c.id) && !owned[c.id]);
    if (pool.length) return pool[Math.floor(R() * pool.length)];
  }
  const dup = (BY_FR[first + r] || []).filter(c => !used.has(c.id));
  if (dup.length) return dup[Math.floor(R() * dup.length)];
  const any = CHARS.filter(c => c.r === r && !used.has(c.id));
  return any[Math.floor(R() * any.length)];
}
function ownedCounts() { const o = {}; for (const c of S.cards) o[c.charId] = (o[c.charId] || 0) + 1; return o; }
function ownedCount(id) { let n = 0; for (const c of S.cards) if (c.charId === id) n++; return n; }
function distinctOwned(filter) { const o = ownedCounts(); return CHARS.filter(c => o[c.id] && (!filter || filter(c))).length; }

/* grant cards into the save; returns reveal info per card */
function grantCards(list, src) {
  const out = [];
  for (const g of list) {
    const c = CHAR[g.id], isNew = !S.seen[g.id];
    const inst = { uid: newUid('c'), charId: g.id, variant: g.variant || 'std', obtainedAt: Date.now() };
    S.cards.push(inst);
    let ess = 0;
    if (isNew) { S.seen[g.id] = Date.now(); S.fresh[g.id] = 1; }
    else { ess = RAR[c.r].ess; S.essence += ess; }
    S.stats.pulls[c.r]++;
    if (c.r >= 2) questEvent('rarepull', 1);
    out.push({ c, inst, isNew, ess, r: c.r, variant: inst.variant, src });
  }
  save();
  return out;
}
function openPackItem(item) {
  const res = rollPack(item.family, item.tier, ownedCounts(), S.pity);
  S.pity = res.pity;
  S.items = S.items.filter(i => i.iid !== item.iid);
  S.stats.packs++;
  questEvent('pack', 1);
  const reveal = grantCards(res.cards, 'pack');
  saveNow();
  return { reveal, pityHit: res.pityHit };
}
function addPack(family, tier, src) { const it = { iid: newUid('p'), type: 'pack', family, tier, src: src || 'shop', at: Date.now() }; S.items.push(it); return it; }
function addBox(name, packs, kind) { const it = { iid: newUid('b'), type: 'box', name, kind: kind || 'small', packs, at: Date.now() }; S.items.push(it); return it; }
function openBoxItem(item) {
  S.items = S.items.filter(i => i.iid !== item.iid);
  const made = item.packs.map(p => addPack(p.family, p.tier, 'box'));
  S.stats.boxes++;
  saveNow();
  return made;
}
function packsLeft() { return S.items.filter(i => i.type === 'pack').length; }
function itemsLeft() { return S.items.length; }

function spend(n) { if (S.coins < n) return false; S.coins -= n; save(); refreshCurrency(); return true; }
function earn(n) { S.coins += n; save(); refreshCurrency(); }
function buyPacks(fam, tier, kind) {
  const price = kind === 'single' ? TIER[tier].price : boxPrice(tier, kind);
  if (!spend(price)) return null;
  S.stats.bought++;
  if (kind === 'single') { const it = addPack(fam, tier, 'shop'); saveNow(); return it; }
  const it = addBox(`${FAMILY[fam].name} ${BOXES[kind].name}`, Array.from({ length: BOXES[kind].n }, () => ({ family: fam, tier })), kind);
  saveNow();
  return it;
}

/* ---------- daily card offers ---------- */
function dailyOffers() {
  const d = dayKey();
  if (S.daily.day === d && S.daily.offers.length) return S.daily.offers;
  const R = rng(d * 7919 + hashStr(S.device)), owned = ownedCounts();
  const pattern = [R() < 0.5 ? 0 : 1, R() < 0.6 ? 1 : 2, 2, R() < 0.15 ? 4 : 3];
  const used = new Set(), offers = [];
  for (const r of pattern) {
    const pool = CHARS.filter(c => c.r === r && !used.has(c.id));
    const fresh = pool.filter(c => !owned[c.id]);
    const c = (fresh.length ? fresh : pool)[Math.floor(R() * (fresh.length ? fresh : pool).length)];
    used.add(c.id);
    offers.push({ id: c.id, price: RAR[r].price });
  }
  S.daily = { day: d, offers, bought: [] };
  save();
  return offers;
}
function buyDaily(i) {
  const o = S.daily.offers[i];
  if (!o || S.daily.bought.includes(i) || !spend(o.price)) return null;
  S.daily.bought.push(i);
  S.stats.bought++;
  const res = grantCards([{ id: o.id, variant: 'std' }], 'shop');
  saveNow();
  return res[0];
}

/* ---------- daily quests and achievements ---------- */
const QUEST_POOL = [
  { id: 'win', text: 'Win 3 battles', goal: 3, coins: 70 },
  { id: 'pack', text: 'Open 2 packs', goal: 2, coins: 60 },
  { id: 'dmg', text: 'Deal 8,000 damage in battle', goal: 8000, coins: 50 },
  { id: 'rarepull', text: 'Pull a Rare or better card', goal: 1, coins: 50 },
  { id: 'level', text: 'Level up a unit', goal: 1, coins: 40 },
  { id: 'facwin', text: 'Win with 3+ units of one faction', goal: 1, coins: 60 },
  { id: 'battle', text: 'Fight 5 battles', goal: 5, coins: 50 },
  { id: 'inspect', text: 'Inspect 3 cards in your binder', goal: 3, coins: 30 }
];
function ensureQuests() {
  const d = dayKey();
  if (S.quests.day === d && S.quests.list.length) return;
  const R = rng(d * 31 + hashStr(S.device));
  const ids = shuffle(R, QUEST_POOL.map(q => q.id)).slice(0, 3);
  if (!S.quests.day) { const i = ids.indexOf('pack'); if (i < 0) ids[0] = 'pack'; }
  S.quests = { day: d, list: ids.map(id => ({ id, prog: 0, done: false, claimed: false })) };
  save();
}
function questEvent(key, n) {
  if (!S.quests || !S.quests.list) return;
  for (const q of S.quests.list) {
    if (q.id !== key || q.done) continue;
    const def = QUEST_POOL.find(x => x.id === q.id);
    q.prog = Math.min(def.goal, q.prog + n);
    if (q.prog >= def.goal) { q.done = true; toast(`Quest complete: ${def.text}`, 'quest'); }
  }
  save();
  refreshBadges();
}
function claimQuest(i) {
  const q = S.quests.list[i];
  if (!q || !q.done || q.claimed) return 0;
  q.claimed = true;
  const def = QUEST_POOL.find(x => x.id === q.id);
  earn(def.coins);
  saveNow();
  return def.coins;
}
const ACHS = [
  { id: 'pack1', text: 'Open your first pack', coins: 50, test: () => S.stats.packs >= 1 },
  { id: 'pack10', text: 'Open 10 packs', coins: 150, test: () => S.stats.packs >= 10 },
  { id: 'pack50', text: 'Open 50 packs', coins: 500, test: () => S.stats.packs >= 50 },
  { id: 'own25', text: 'Discover 25 characters', coins: 150, test: () => Object.keys(S.seen).length >= 25 },
  { id: 'own60', text: 'Discover 60 characters', coins: 400, test: () => Object.keys(S.seen).length >= 60 },
  { id: 'own120', text: 'Discover 120 characters', coins: 1000, test: () => Object.keys(S.seen).length >= 120 },
  { id: 'epic', text: 'Discover an Epic character', coins: 100, test: () => anySeen(3) },
  { id: 'legend', text: 'Discover a Legendary character', coins: 300, test: () => anySeen(4) },
  { id: 'mythic', text: 'Discover a Mythic character', coins: 800, test: () => anySeen(5) },
  { id: 'win1', text: 'Win your first battle', coins: 50, test: () => S.stats.wins >= 1 },
  { id: 'win25', text: 'Win 25 battles', coins: 300, test: () => S.stats.wins >= 25 },
  { id: 'army6', text: 'Field a full army of six', coins: 60, test: () => S.army.filter(Boolean).length >= 6 },
  { id: 'stage8', text: 'Clear stage 8', coins: 200, test: () => !!S.campaign.cleared[8] },
  { id: 'stage16', text: 'Clear stage 16', coins: 400, test: () => !!S.campaign.cleared[16] },
  { id: 'stage24', text: 'Clear stage 24', coins: 800, test: () => !!S.campaign.cleared[24] },
  { id: 'lvl5', text: 'Raise a unit to level 5', coins: 100, test: () => maxLevel() >= 5 },
  { id: 'lvl10', text: 'Raise a unit to level 10', coins: 300, test: () => maxLevel() >= 10 }
];
function anySeen(r) { return Object.keys(S.seen).some(id => CHAR[id] && CHAR[id].r === r); }
function maxLevel() { let m = 1; for (const k in S.units) m = Math.max(m, S.units[k].lvl); return m; }
function achState(a) { return S.ach[a.id] === 'claimed' ? 'claimed' : a.test() ? 'ready' : 'locked'; }
function claimAch(id) { const a = ACHS.find(x => x.id === id); if (!a || achState(a) !== 'ready') return 0; S.ach[id] = 'claimed'; earn(a.coins); saveNow(); return a.coins; }
function claimableCount() {
  ensureQuests();
  return S.quests.list.filter(q => q.done && !q.claimed).length + ACHS.filter(a => achState(a) === 'ready').length;
}

/* ---------- set (faction) completion rewards ---------- */
const SET_STEPS = [
  { n: 10, coins: 150, text: '150 coins' },
  { n: 20, coins: 400, text: '400 coins + Standard pack', pack: 'standard' },
  { n: 30, coins: 1000, text: '1,000 coins + Grand pack', pack: 'grand' }
];
function setProgress(fid) { const o = ownedCounts(); return CHARS.filter(c => c.fac === fid && o[c.id]).length; }
function setStepState(fid, i) { const k = fid + i; if (S.setRewards[k]) return 'claimed'; return setProgress(fid) >= SET_STEPS[i].n ? 'ready' : 'locked'; }
function claimSet(fid, i) {
  if (setStepState(fid, i) !== 'ready') return false;
  S.setRewards[fid + i] = 1;
  const st = SET_STEPS[i];
  earn(st.coins);
  if (st.pack) addPack(FAMILIES.find(f => f.fac === fid).id, st.pack, 'reward');
  saveNow();
  return true;
}

/* ---------- unit development: XP levels from battles, Essence for training and stars ---------- */
const MAX_LVL = 15, STAR_COST = [80, 220, 520], STAR_REQ = [4, 8, 12];
function unitOf(uid) { return S.units[uid] || { lvl: 1, xp: 0, star: 0 }; }
function xpNeed(l) { return Math.round(40 * Math.pow(l, 1.45)); }
function trainCost(l) { return 12 + l * 9; }
function addXp(uid, xp) {
  const u = S.units[uid] = Object.assign({ lvl: 1, xp: 0, star: 0 }, S.units[uid]);
  let ups = 0;
  u.xp += xp;
  while (u.lvl < MAX_LVL && u.xp >= xpNeed(u.lvl)) { u.xp -= xpNeed(u.lvl); u.lvl++; ups++; }
  if (u.lvl >= MAX_LVL) u.xp = 0;
  if (ups) { S.stats.levelUps += ups; questEvent('level', ups); }
  return ups;
}
function trainUnit(uid) {
  const u = unitOf(uid);
  if (u.lvl >= MAX_LVL || S.essence < trainCost(u.lvl)) return false;
  S.essence -= trainCost(u.lvl);
  S.units[uid] = Object.assign({}, u, { lvl: u.lvl + 1, xp: 0 });
  S.stats.levelUps++;
  questEvent('level', 1);
  saveNow();
  return true;
}
function ascendUnit(uid) {
  const u = unitOf(uid);
  if (u.star >= 3 || u.lvl < STAR_REQ[u.star] || S.essence < STAR_COST[u.star]) return false;
  S.essence -= STAR_COST[u.star];
  S.units[uid] = Object.assign({}, u, { star: u.star + 1 });
  saveNow();
  return true;
}
function statsFor(c, lvl, star, boss) {
  const m = (1 + 0.07 * (lvl - 1)) * (1 + 0.1 * star);
  const b = boss ? { hp: 2.4, atk: 1.3, def: 1.2 } : { hp: 1, atk: 1, def: 1 };
  return { hp: Math.round(c.hp * m * b.hp), atk: Math.round(c.atk * m * b.atk), def: Math.round(c.def * m * b.def), spd: c.spd, rng: c.rng };
}
function powerOf(st, c) { return Math.round(st.hp / 9 + st.atk * 3.2 + st.def * 2.2 + c.spd * 6 + c.r * 25); }
function dissolveValue(c) { return RAR[c.r].ess * 3; }
function dissolveCard(uid) {
  const i = S.cards.findIndex(x => x.uid === uid);
  if (i < 0) return 0;
  const inst = S.cards[i], c = CHAR[inst.charId];
  if (ownedCount(c.id) < 2) return 0;
  S.cards.splice(i, 1);
  delete S.units[uid];
  S.army = S.army.map(u => u === uid ? null : u);
  const v = dissolveValue(c);
  S.essence += v;
  saveNow();
  return v;
}

/* ---------- campaign: 24 stages across six regions ---------- */
const REGION_ORDER = ['wild', 'tide', 'stone', 'ember', 'gloom', 'star'];
const STAGE_NAMES = {
  wild: ['Mossy Trailhead', 'Bramble Gate', 'Fey Crossing', 'Heart of the Grove'],
  tide: ['Saltwind Shore', 'Coral Narrows', 'Wreck of the Gull', 'The Pearl Spire'],
  stone: ['Quarry Steps', 'Rune Bridge', 'Hall of Anvils', 'The Granite Throne'],
  ember: ['Ashen Foothills', 'Cinder Pass', 'Lava Fields', 'The Caldera Crown'],
  gloom: ['Lantern Bog', 'Crooked Graveyard', 'Coven Hollow', 'The Hushmarsh Crypt'],
  star: ['Moonlit Steppe', 'Comet Ridge', 'Observatory Ruins', 'The Seventh Sky']
};
const STAGES = [];
(function buildStages() {
  for (let i = 0; i < 24; i++) {
    const fac = REGION_ORDER[Math.floor(i / 4)], k = i % 4, boss = k === 3, n = i + 1;
    const R = rng(9001 + n * 131);
    const count = clamp(2 + Math.floor(i / 2.4), 2, 6);
    const lvl = 1 + Math.floor(i * 0.62);
    const maxR = Math.min(4, Math.floor(i / 5));
    const units = [];
    const used = new Set();
    const roleWant = ['D', 'S', 'R', 'M', 'H', 'A', 'S', 'D'];
    let bossChar = null;
    if (boss) {
      const br = n === 24 ? 5 : n >= 16 ? 4 : n >= 8 ? 3 : 2;
      const pool = CHARS.filter(c => c.fac === fac && c.r === br);
      bossChar = pool[Math.floor(R() * pool.length)];
      used.add(bossChar.id);
    }
    for (let j = 0; units.length < count - (boss ? 1 : 0); j++) {
      const f = R() < 0.8 ? fac : pick(R, REGION_ORDER);
      const r = Math.floor(R() * (maxR + 1));
      const want = roleWant[(j + i) % roleWant.length];
      let pool = CHARS.filter(c => c.fac === f && c.r === r && !used.has(c.id) && c.role === want);
      if (!pool.length) pool = CHARS.filter(c => c.fac === f && c.r <= r && !used.has(c.id));
      const c = pool[Math.floor(R() * pool.length)];
      used.add(c.id);
      units.push({ id: c.id, lvl, boss: false });
    }
    if (bossChar) units.push({ id: bossChar.id, lvl: lvl + 1, boss: true });
    const front = units.filter(u => 'DSA'.includes(CHAR[u.id].role) || u.boss), back = units.filter(u => !front.includes(u));
    const slots = [null, null, null, null, null, null];
    const place = (u, row) => { const order = row === 0 ? [1, 0, 2, 4, 3, 5] : [4, 3, 5, 1, 0, 2]; for (const s of order) if (!slots[s]) { slots[s] = u; return; } };
    front.forEach(u => place(u, 0)); back.forEach(u => place(u, 1));
    const reward = { coins: 100 + 30 * i, essence: 10 + 2 * i, pack: null };
    if (boss) reward.pack = { family: FAMILIES.find(f => f.fac === fac).id, tier: n === 24 ? 'grand' : n >= 16 ? 'greater' : 'standard' };
    if (n === 2) reward.pack = { family: 'wildheart', tier: 'standard' };
    STAGES.push({ n, fac, boss, name: STAGE_NAMES[fac][k], slots, lvl, reward, repeat: { coins: 30 + 3 * i, essence: 4 + Math.floor(i / 3) } });
  }
})();
function stageUnlocked(n) { return n === 1 || !!S.campaign.cleared[n - 1]; }
