/* ARROWWOOD bank: coins, owned bows and the equipped bow, kept on the server. Players are known by a private key their
   browser makes once (localStorage); the server only ever stores a hash of it. `store` is any async key/value store
   ({ get(k), put(k, v) }): Durable Object storage on Cloudflare, a JSON file in the local Node server.
   A match reward is granted at most once per (match, player), however many times anyone reconnects or refreshes. */
import { BOWS, BOW_IDS, COINS, TARGET } from '../shared/world.js';

export async function profileId(key) {
  if (typeof key !== 'string' || !/^[a-f0-9]{32,64}$/.test(key)) return null;
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('arrowwood|' + key));
  return [...new Uint8Array(h)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}
const fresh = () => ({ coins: COINS.start, owned: ['longbow'], equipped: 'longbow', matches: 0, wins: 0 });
export async function load(store, id) { return (await store.get('p:' + id)) || fresh(); }
const pub = p => ({ coins: p.coins, owned: p.owned, equipped: p.equipped, matches: p.matches, wins: p.wins, bows: BOWS });
export async function profile(store, id) { return pub(await load(store, id)); }
export async function buy(store, id, bow) {
  const p = await load(store, id), b = BOWS.find(x => x.id === bow);
  if (!b) return { error: 'No such bow.' };
  if (p.owned.includes(bow)) return { error: 'You already own it.', ...pub(p) };
  if (p.coins < b.price) return { error: `Not enough coins: ${b.price - p.coins} more needed.`, ...pub(p) };
  p.coins -= b.price; p.owned.push(bow); p.equipped = bow; await store.put('p:' + id, p);
  return pub(p);
}
export async function equip(store, id, bow) {
  const p = await load(store, id);
  if (!BOW_IDS.includes(bow) || !p.owned.includes(bow)) return { error: 'You do not own that bow.', ...pub(p) };
  p.equipped = bow; await store.put('p:' + id, p); return pub(p);
}
// coins earned away from online matches (bot matches, and targets on the practice range): the player's own game reports
// them, so they are capped: a bot match at most COINS.maxBots and once per match id, a target TARGET.coins, and all of it
// at most COINS.offlineHour an hour
export async function earn(store, id, kind, n, match) {
  const p = await load(store, id), hour = Math.floor(Date.now() / 3600000); let amt = kind === 'target' ? TARGET.coins : kind === 'bots' ? Math.max(0, Math.min(COINS.maxBots, n | 0)) : 0;
  if (kind === 'bots') { const g = 'b:' + String(match || '').slice(0, 48) + ':' + id; if (!match || await store.get(g)) return { already: true, got: 0, ...pub(p) }; await store.put(g, 1); }
  const e = (await store.get('e:' + id)) || { hour, got: 0 }; if (e.hour !== hour) { e.hour = hour; e.got = 0; }
  amt = Math.max(0, Math.min(amt, COINS.offlineHour - e.got)); e.got += amt; p.coins += amt;
  await store.put('e:' + id, e); await store.put('p:' + id, p); return { got: amt, ...pub(p) };
}
export async function grant(store, id, matchId, coins, won) {
  const g = 'g:' + matchId + ':' + id;
  if (await store.get(g)) return { already: true, ...(await profile(store, id)) };
  const p = await load(store, id); p.coins += Math.max(0, Math.min(COINS.maxMatch, coins | 0)); p.matches++; if (won) p.wins++;
  await store.put('p:' + id, p); await store.put(g, 1);
  return pub(p);
}
