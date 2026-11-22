// AFTERHOURS and ENCORE co-op rooms on Cloudflare: arcade/arcade-server.js ported to a Durable Object. One instance (named "global")
// holds every room and runs the games' own shared simulations (arcade/public/arcade/session.js) 30 times a second, sending snapshots at 15.
// Same rules: 6-character codes, up to 4 players, the first player hosts and the next one takes over if they leave.
//   GET /api/arcade  (WebSocket)  then  { type: 'join', code?, game }  ->  { type: 'joined', ... }, then { type: 'state' } snapshots
import * as first from './arcade/public/arcade/session.js';
import * as encore from './arcade/encore/encore-session.js';
// the first five games run the simulations built from source; the ENCORE five run the ones from the ENCORE build
const ENCORE = new Set(['prop', 'heist', 'golf', 'cafe', 'rooftop']);
const lib = game => ENCORE.has(game) ? encore : first;
const createSession = (game, seed) => lib(game).createSession(game, seed);
const addPlayer = (s, id) => lib(s.game).addPlayer(s, id), removePlayer = (s, id) => lib(s.game).removePlayer(s, id);
const setInput = (s, id, i) => lib(s.game).setInput(s, id, i), advance = (s, dt) => lib(s.game).advance(s, dt);

const MAX_PAYLOAD = 4096, MAX_ROOMS = 250, MAX_PER_IP = 6;   // all rooms share one server: cap how many there are, and how many one address holds open
const bucket = (rate, burst) => { let tok = burst, at = Date.now(); return () => { const now = Date.now(); tok = Math.min(burst, tok + (now - at) / 1000 * rate); at = now; if (tok < 1) return false; tok -= 1; return true; }; };   // a flood limit per player
const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const send = (ws, m) => { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); } catch (e) {} };
const publish = (r, m) => { for (const ws of r.sockets.values()) send(ws, m); };
const snapshot = r => ({ type: 'state', state: r.session.state, game: r.session.game, host: r.host, started: r.started, players: r.sockets.size });

export class ArcadeRooms {
  constructor(state) { this.state = state; this.rooms = new Map(); this.timer = null; this.frame = 0; }
  async fetch(request) {
    if (request.headers.get('upgrade') !== 'websocket') return new Response('expected a websocket', { status: 426 });
    const pair = new WebSocketPair(), [client, ws] = Object.values(pair);
    ws.accept();
    const ip = request.headers.get('cf-connecting-ip') || '?'; this.ips = this.ips || new Map();
    if ((this.ips.get(ip) || 0) >= MAX_PER_IP) { try { ws.send(JSON.stringify({ type: 'error', message: 'Too many games open from here.' })); ws.close(1008, 'too many'); } catch (e) {} return new Response(null, { status: 101, webSocket: client }); }
    this.ips.set(ip, (this.ips.get(ip) || 0) + 1); let counted = true;
    const uncount = () => { if (!counted) return; counted = false; const n = (this.ips.get(ip) || 1) - 1; if (n > 0) this.ips.set(ip, n); else this.ips.delete(ip); };
    ws.addEventListener('close', uncount); ws.addEventListener('error', uncount);
    let room = null, id = null, dropped = 0; const msgs = bucket(90, 180);   // (inputs come 10 to 30 times a second)
    ws.addEventListener('message', e => {
      if (typeof e.data !== 'string' || e.data.length > MAX_PAYLOAD) return;
      if (!msgs()) { if (++dropped > 2000) try { ws.close(1008, 'too many messages'); } catch (err) {} return; }
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (!m || typeof m !== 'object') return;
      if (m.type === 'join') {
        if (room) return;
        let code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        if (code && !this.rooms.has(code)) return send(ws, { type: 'error', message: 'Room not found. Check the six-character code.' });
        if (!code && this.rooms.size >= MAX_ROOMS) return send(ws, { type: 'error', message: 'Servers are busy right now. Please try again in a minute.' });
        if (!code) {
          let session; try { session = createSession(m.game, Math.floor(Math.random() * 1000000)); } catch (err) { return send(ws, { type: 'error', message: 'Choose a game first.' }); }
          do code = hex(3).toUpperCase(); while (this.rooms.has(code));
          this.rooms.set(code, { session, sockets: new Map(), host: null, started: false });
        }
        const r = this.rooms.get(code);
        if (r.sockets.size >= 4) return send(ws, { type: 'error', message: 'This room already has four players.' });
        if (r.session.state.status !== 'playing') return send(ws, { type: 'error', message: 'This run has ended. Ask the host to start a new run.' });
        id = hex(6); room = r; addPlayer(r.session, id); r.sockets.set(id, ws); r.host ??= id;
        send(ws, { type: 'joined', id, code, game: r.session.game, host: r.host, started: r.started, state: r.session.state }); publish(r, snapshot(r));
        this.start();
        return;
      }
      if (!room) return;
      if (m.type === 'input' && room.started) setInput(room.session, id, m.input);
      if (m.type === 'start' && room.host === id) { room.started = true; publish(room, snapshot(room)); }
      if (m.type === 'restart' && room.host === id) {
        const session = createSession(room.session.game, room.session.seed);
        for (const key of room.sockets.keys()) addPlayer(session, key);
        room.session = session; room.started = true; publish(room, { type: 'reset' }); publish(room, snapshot(room));
      }
    });
    const bye = () => {
      if (!room) return;
      removePlayer(room.session, id); room.sockets.delete(id);
      if (!room.sockets.size) { for (const [k, v] of this.rooms) if (v === room) this.rooms.delete(k); }
      else { if (room.host === id) room.host = room.sockets.keys().next().value; publish(room, snapshot(room)); }
      room = null;
      if (!this.rooms.size) this.stop();
    };
    ws.addEventListener('close', bye); ws.addEventListener('error', bye);
    return new Response(null, { status: 101, webSocket: client });
  }
  start() {
    if (!this.timer) this.timer = setInterval(() => {
      this.frame++;
      for (const r of this.rooms.values()) { if (r.started) advance(r.session, 1 / 30); if (this.frame % 2 === 0) publish(r, snapshot(r)); }
    }, 1000 / 30);
  }
  stop() { clearInterval(this.timer); this.timer = null; }
}
