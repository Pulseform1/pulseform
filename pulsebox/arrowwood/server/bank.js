/* ARROWWOOD bank: coins, owned bows and the equipped bow, kept on the server. Players are known by a private key their
   browser makes once (localStorage); the server only ever stores a hash of it. `store` is any async key/value store
   ({ get(k), put(k, v) }): Durable Object storage on Cloudflare, a JSON file in the local Node server.
   A match reward is granted at most once per (match, player), however many times anyone reconnects or refreshes. */
import { BOWS, BOW_IDS, COINS } from '../shared/world.js';

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
export async function grant(store, id, matchId, coins, won) {
  const g = 'g:' + matchId + ':' + id;
  if (await store.get(g)) return { already: true, ...(await profile(store, id)) };
  const p = await load(store, id); p.coins += Math.max(0, Math.min(COINS.maxMatch, coins | 0)); p.matches++; if (won) p.wins++;
  await store.put('p:' + id, p); await store.put(g, 1);
  return pub(p);
}
