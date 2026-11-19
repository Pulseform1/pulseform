// ARROWWOOD on Cloudflare: one Durable Object per room code runs the authoritative match engine (arrowwood/server/engine.js)
// twenty times a second while anyone is connected; one global Durable Object (the bank) keeps coins and bows.
//   GET  /api/arrowwood/room/CODE  (WebSocket) then { t: 'hello', key, name, token?, create? } -> { t: 'welcome', ... }, snapshots, events
//   GET  /api/arrowwood/room/CODE  (plain) -> { game: 'arrowwood', players, mode, phase }   (the hub's Join box)
//   GET  /api/arrowwood/profile    (header x-aw-key) -> { coins, owned, equipped, bows }
//   POST /api/arrowwood/buy        (header x-aw-key) <- { bow } -> profile (or { error })
//   POST /api/arrowwood/equip      (header x-aw-key) <- { bow } -> profile (or { error })
//   POST /api/arrowwood/earn       (header x-aw-key) <- { kind: bots|target, n, match } -> profile + got (capped: see bank.js)
import { createRoom, join, message, drop, step, drain, due, TICK } from './arrowwood/server/engine.js';
import * as Bank from './arrowwood/server/bank.js';

const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
const MAX_MSG = 2048;
const bankStub = env => env.ARROWWOOD_BANK.get(env.ARROWWOOD_BANK.idFromName('bank'));
const bankCall = (env, path, body) => bankStub(env).fetch('https://bank/' + path, { method: 'POST', body: JSON.stringify(body) }).then(r => r.json());

export async function arrowwoodApi(request, env, url) {
  const sub = url.pathname.slice('/api/arrowwood/'.length);
  if (sub.startsWith('room/')) {
    const code = sub.slice(5).toUpperCase();
    if (!/^[A-Z0-9]{4,6}$/.test(code)) return json({ error: 'bad room code' }, 400);
    if (request.headers.get('upgrade') !== 'websocket' && request.method !== 'GET') return json({ error: 'expected a websocket' }, 426);   // a plain GET: who is in it (the hub's Join box)
    return env.ARROWWOOD_ROOM.get(env.ARROWWOOD_ROOM.idFromName('room:' + code)).fetch(new Request('https://room/' + code, request));
  }
  const id = await Bank.profileId(request.headers.get('x-aw-key') || '');
  if (!id) return json({ error: 'missing player key' }, 400);
  if (sub === 'profile' && request.method === 'GET') return json(await bankCall(env, 'profile', { id }));
  if ((sub === 'buy' || sub === 'equip') && request.method === 'POST') {
    let b = {}; try { b = JSON.parse((await request.text()).slice(0, 200)); } catch (e) {}
    return json(await bankCall(env, sub, { id, bow: String(b.bow || '') }));
  }
  if (sub === 'earn' && request.method === 'POST') {   // coins from a bot match or a target (capped by the bank)
    let b = {}; try { b = JSON.parse((await request.text()).slice(0, 200)); } catch (e) {}
    return json(await bankCall(env, 'earn', { id, kind: String(b.kind || ''), n: b.n | 0, match: String(b.match || '') }));
  }
  return json({ error: 'not found' }, 404);
}

export class ArrowwoodBank {
  constructor(state) { this.store = state.storage; }
  async fetch(request) {
    const path = new URL(request.url).pathname.slice(1), b = await request.json().catch(() => ({}));
    if (!b.id || !/^[a-f0-9]{24}$/.test(b.id)) return json({ error: 'bad id' }, 400);
    if (path === 'profile') return json(await Bank.profile(this.store, b.id));
    if (path === 'buy') return json(await Bank.buy(this.store, b.id, b.bow));
    if (path === 'equip') return json(await Bank.equip(this.store, b.id, b.bow));
    if (path === 'grant') return json(await Bank.grant(this.store, b.id, String(b.match || ''), b.coins, !!b.won));
    if (path === 'earn') return json(await Bank.earn(this.store, b.id, b.kind, b.n, b.match));
    return json({ error: 'not found' }, 404);
  }
}

export class ArrowwoodRoom {
  constructor(state, env) { this.state = state; this.env = env; this.room = null; this.socks = new Map(); this.timer = null; this.code = ''; }
  async fetch(request) {
    this.code = new URL(request.url).pathname.slice(1);
    if (request.headers.get('upgrade') !== 'websocket') { const n = this.room ? [...this.room.players.values()].filter(p => !p.dummy && p.connected).length : 0; return json({ game: 'arrowwood', players: n, mode: this.room && this.room.mode, phase: this.room && this.room.phase }); }
    const pair = new WebSocketPair(), [client, ws] = Object.values(pair);
    ws.accept();
    let id = null, joining = false;
    const out = m => { try { ws.send(JSON.stringify(m)); } catch (e) {} };
    ws.addEventListener('message', async e => {
      if (typeof e.data !== 'string' || e.data.length > MAX_MSG) return;
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (!m || typeof m !== 'object') return;
      if (!id) {
        if (m.t !== 'hello' || joining) return; joining = true;
        const pid = await Bank.profileId(m.key || ''); let prof = null;
        if (pid) try { prof = await bankCall(this.env, 'profile', { id: pid }); } catch (err) {}
        const active = this.room && [...this.room.players.values()].some(p => !p.dummy);
        if (m.create && active) { joining = false; return out({ t: 'err', code: 'taken', msg: 'That code is taken. Making another...' }); }
        if (!m.create && !active) { joining = false; return out({ t: 'err', code: 'nocode', msg: 'No room with that code. Check it with your friend.' }); }
        if (m.create || !this.room) this.room = createRoom({ code: this.code, mode: (m.create && m.create.mode) || '1v1', oneShot: m.create && m.create.oneShot, dev: this.env.ARROWWOOD_DEV === '1', grant: (p, match, coins, won) => this.grant(p, match, coins, won) });
        const r = join(this.room, { name: m.name, profile: pid, bow: prof && prof.equipped, token: m.token }, Date.now());
        joining = false;
        if (r.err) return out({ t: 'err', code: 'full', msg: r.err });
        id = r.id; this.socks.set(id, ws); this.flush(); this.start();
        return;
      }
      if (m.t === 'bow') {   // equipping during a lobby: the bank says whether they own it
        const pid = this.room.players.get(id) && this.room.players.get(id).profile; let ok = false;
        if (pid) try { const prof = await bankCall(this.env, 'profile', { id: pid }); ok = prof.owned.includes(m.bow); } catch (err) {}
        message(this.room, id, { t: 'bow', bow: m.bow, ok }, Date.now()); this.flush(); return;
      }
      message(this.room, id, m, Date.now());
    });
    const bye = () => { if (id && this.socks.get(id) === ws) { this.socks.delete(id); if (this.room) { drop(this.room, id, Date.now()); this.flush(); } } };
    ws.addEventListener('close', bye); ws.addEventListener('error', bye);
    return new Response(null, { status: 101, webSocket: client });
  }
  grant(profile, match, coins, won) {
    bankCall(this.env, 'grant', { id: profile, match, coins, won }).catch(() => {});
  }
  start() {
    if (this.timer) return; let idle = 0;
    this.timer = setInterval(() => {
      if (!this.room) return;
      const now = Date.now(); for (let n = due(this.room, now); n > 0; n--) step(this.room, now); this.flush();
      if (!this.socks.size) { idle += TICK; if (idle > 60 || ![...this.room.players.values()].some(p => !p.dummy)) { clearInterval(this.timer); this.timer = null; this.room = null; } } else idle = 0;
    }, TICK * 1000);
  }
  flush() {
    if (!this.room) return;
    for (const { to, m } of drain(this.room)) {
      const s = JSON.stringify(m);
      if (to === '*') { for (const ws of this.socks.values()) try { ws.send(s); } catch (e) {} }
      else { const ws = this.socks.get(to); if (ws) try { ws.send(s); } catch (e) {} }
    }
  }
}
