// THE HOLLOW co-op rooms on Cloudflare: the-hollow/server.js ported to a Durable Object. One instance (named "global")
// holds every room, as the Node server's process did, and runs the game's own authoritative engine (the-hollow/engine.js)
// ten times a second while anyone is connected. Same rules: 6-character codes, up to 4 survivors, rooms vanish when empty.
//   GET /api/hollow  (WebSocket)  then  { type: 'join', code? }  ->  { type: 'joined', id, code, map }, snapshots, events
import { MAP } from './the-hollow/world.js';
import { createSession, addPlayer, applyMessage, tick, snapshot } from './the-hollow/engine.js';

const MAX_PAYLOAD = 4096;
const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');

export class HollowRooms {
  constructor(state) { this.state = state; this.rooms = new Map(); this.timer = null; }
  async fetch(request) {
    if (request.headers.get('upgrade') !== 'websocket') return new Response('expected a websocket', { status: 426 });
    const pair = new WebSocketPair(), [client, ws] = Object.values(pair);
    ws.accept();
    let room = null, id = null;
    ws.addEventListener('message', e => {
      if (typeof e.data !== 'string' || e.data.length > MAX_PAYLOAD) return;
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (!m || typeof m !== 'object') return;
      if (m.type === 'join') {
        if (room) return;
        let code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        if (code && !this.rooms.has(code)) return send(ws, { type: 'error', message: 'Room not found. Ask your partner for their current code.' });
        if (!code) { do code = hex(3).toUpperCase(); while (this.rooms.has(code)); this.rooms.set(code, { ...createSession(), sockets: new Map() }); }
        const r = this.rooms.get(code);
        if (r.ended) return send(ws, { type: 'error', message: 'This expedition has ended. Create a new room.' });
        if (r.players.size >= 4) return send(ws, { type: 'error', message: 'This expedition already has four survivors.' });
        room = r; id = hex(4); addPlayer(r, id); r.sockets.set(id, ws); send(ws, { type: 'joined', id, code, map: MAP });
        this.start();
        return;
      }
      if (room) applyMessage(room, id, m, (to, event) => emit(room, to, event));
    });
    const bye = () => {
      if (!room) return;
      room.players.delete(id); room.sockets.delete(id);
      if (!room.players.size) { for (const [k, v] of this.rooms) if (v === room) this.rooms.delete(k); }
      else if ([...room.players.values()].every(p => p.down)) { room.ended = true; emit(room, null, { type: 'lost' }); }
      room = null;
      if (!this.rooms.size) this.stop();
    };
    ws.addEventListener('close', bye); ws.addEventListener('error', bye);
    return new Response(null, { status: 101, webSocket: client });
  }
  start() { if (!this.timer) this.timer = setInterval(() => { for (const r of this.rooms.values()) { tick(r, (id, m) => emit(r, id, m)); emit(r, null, snapshot(r)); } }, 100); }
  stop() { clearInterval(this.timer); this.timer = null; }
}
function send(ws, m) { try { if (ws.readyState === 1) ws.send(JSON.stringify(m)); } catch (e) {} }
function emit(r, id, m) { if (id) send(r.sockets.get(id), m); else for (const ws of r.sockets.values()) send(ws, m); }
