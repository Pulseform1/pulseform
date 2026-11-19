// STILLWATER rooms on Cloudflare: the room rules of stillwater/server.mjs (create, join, ready, creature vote, pause,
// respawn, restart, reconnect with a token) in a Durable Object, one instance per room, running the game's own
// authoritative simulation (stillwater/shared/simulation.js) 60 times a second while anyone is in it.
//   GET /api/stillwater/ws?create=1  (WebSocket)  a new room: the Worker picks a free 6-character code
//   GET /api/stillwater/ws?code=AB12CD  (WebSocket)  that room
// then the same messages as the local server: { type: 'create' | 'join', ... } -> welcome, lobby, start, state, error.
// The local server (cd stillwater && npm start) is unchanged and still works on its own.
import { createSimulation, addPlayer, stepSimulation, serializeSimulation, respawnPlayer, MONSTERS, WORLD_VERSION } from './stillwater/shared/simulation.js';
import { wrapYaw } from './stillwater/public/transport.js';

const IDS = MONSTERS.map(m => m.id);
const VOTE_MS = 25000, RECONNECT_MS = 120000, EMPTY_MS = 30000, MAX_PAYLOAD = 4096;
const idleInput = (seq = -1) => ({ forward: 0, strafe: 0, yaw: 0, pitch: 0, jump: false, sprint: false, seq });
const randomInt = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;
const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const send = (ws, payload) => { if (!ws) return; try { ws.send(JSON.stringify(payload)); } catch (e) {} };
const cleanName = name => typeof name === 'string' ? name.replace(/[\p{C}<>]/gu, '').trim().slice(0, 20) || 'Explorer' : 'Explorer';
const validDifficulty = v => ['chill', 'normal', 'nightmare'].includes(v) ? v : 'normal';
const finite = (v, f = 0) => typeof v === 'number' && Number.isFinite(v) ? v : f;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const newRoomCode = () => hex(3).toUpperCase();

// The Worker side: route a socket to its room's instance
export async function stillwaterApi(request, env, url) {
  if (request.headers.get('upgrade') !== 'websocket') return new Response(JSON.stringify({ error: 'expected a websocket' }), { status: 426, headers: { 'content-type': 'application/json' } });
  let code = (url.searchParams.get('code') || '').trim().toUpperCase(), create = url.searchParams.has('create');
  if (!create && !/^[A-F0-9]{6}$/.test(code)) return new Response('bad room code', { status: 400 });
  if (create) code = newRoomCode();
  const headers = new Headers(request.headers); headers.set('x-sw-code', code); headers.set('x-sw-create', create ? '1' : '0');
  return env.STILLWATER.get(env.STILLWATER.idFromName(code)).fetch(new Request(request, { headers }));
}

export class StillwaterRoom {
  constructor(state, env) { this.state = state; this.env = env; this.room = null; this.peers = new Set(); this.timer = null; this.code = ''; }
  async fetch(request) {
    if (request.headers.get('upgrade') !== 'websocket') return new Response('expected a websocket', { status: 426 });
    const pair = new WebSocketPair(), [client, ws] = Object.values(pair); ws.accept();
    this.connect(ws, { code: request.headers.get('x-sw-code') || '', create: request.headers.get('x-sw-create') === '1' });
    return new Response(null, { status: 101, webSocket: client });
  }
  // one player's socket (a Cloudflare WebSocket, or a ws socket in the local test server: both have send/close/addEventListener)
  connect(ws, { code, create }) {
    this.code = this.code || code;
    const peer = { ws, create, member: null, lastSeq: -1, window: Date.now(), count: 0, lastInput: 0 };
    this.peers.add(peer);
    ws.addEventListener('message', e => this.message(peer, e.data));
    const bye = () => { if (!this.peers.has(peer)) return; this.peers.delete(peer); this.detach(peer); };
    ws.addEventListener('close', bye); ws.addEventListener('error', bye);
    this.start();
  }
  error(peer, message) { send(peer.ws, { type: 'error', message }); }
  view() {
    const room = this.room;
    return { code: room.code, mode: room.mode, phase: room.phase, paused: room.paused, hostId: room.hostId, difficulty: room.difficulty,
      players: [...room.members.values()].map(m => ({ id: m.id, name: m.name, ready: m.ready, connected: !!m.ws, alive: room.sim?.players[m.id]?.alive ?? true, spectator: room.sim?.players[m.id]?.spectator ?? false })),
      cards: [...room.cards], votes: { ...room.votes }, faced: [...room.faced], offered: [...room.offered], round: room.round, deadline: room.deadline, seed: room.seed, monsterId: room.monsterId, restartVotes: [...room.restartVotes] };
  }
  broadcast(payload) { if (!this.room) return; const s = JSON.stringify(payload); for (const m of this.room.members.values()) if (m.ws) { try { m.ws.send(s); } catch (e) {} } }
  lobby() { this.broadcast({ type: 'lobby', room: this.view() }); }
  connected() { return [...this.room.members.values()].filter(m => m.ws); }
  freshCards() {
    const room = this.room, cards = [];
    while (cards.length < 3) {
      if (!room.deck.length) { const mixed = shuffle(IDS); room.deck = [...mixed.filter(id => !room.faced.has(id)), ...mixed.filter(id => room.faced.has(id))]; }
      const i = room.deck.findIndex(id => !cards.includes(id)); if (i < 0) throw new Error('the creature roster needs three different creatures');
      cards.push(room.deck.splice(i, 1)[0]);
    }
    room.cards = cards; cards.forEach(id => room.offered.add(id));
  }
  prepareRound() {
    const room = this.room;
    room.sim = null; room.paused = false; room.inputs = {}; room.events = []; room.lastEventId = 0; room.votes = {}; room.restartVotes.clear(); room.monsterId = null;
    room.seed = randomInt(2 ** 31 - 2) + 1; room.deadline = null; this.freshCards();
    for (const m of room.members.values()) m.ready = m.id === room.hostId || room.mode === 'solo';
    room.phase = room.mode === 'solo' ? 'voting' : 'lobby'; this.lobby();
  }
  attach(peer, member) {
    const room = this.room;
    if (member.ws && member.ws !== peer.ws) { try { member.ws.close(4001, 'Reconnected elsewhere'); } catch (e) {} }
    member.ws = peer.ws; member.disconnectedAt = null; peer.member = member; peer.lastSeq = -1; room.emptySince = null; room.lastActivity = Date.now();
    const p = room.sim?.players[member.id];
    if (p) { p.connected = true; p.ackSeq = -1; room.sim.finished = false; room.phase = 'playing'; room.paused = false; if (!p.alive && !Number.isFinite(p.respawnReadyAt)) p.respawnReadyAt = room.sim.time; }
    send(peer.ws, { type: 'welcome', id: member.id, token: member.token, code: room.code });
    this.lobby();
    if (room.sim) { const state = serializeSimulation(room.sim); send(peer.ws, { type: 'start', seed: room.seed, difficulty: room.difficulty, monsterId: room.monsterId, players: state.players, state }); }
  }
  detach(peer, explicit = false) {
    const room = this.room, member = peer.member; peer.member = null;
    if (!room || !member || member.ws !== peer.ws) return;
    member.ws = null; member.disconnectedAt = Date.now(); room.inputs[member.id] = idleInput();
    const p = room.sim?.players[member.id];
    if (p) { p.connected = false; p.alive = false; p.spectator = true; if (!Number.isFinite(p.respawnReadyAt)) p.respawnReadyAt = room.sim.time; }
    delete room.votes[member.id]; room.restartVotes.delete(member.id);
    if (explicit || !room.sim) { room.members.delete(member.id); if (room.sim) delete room.sim.players[member.id]; }
    if (room.hostId === member.id) room.hostId = this.connected()[0]?.id || room.members.keys().next().value || null;
    if (!this.connected().length) room.emptySince = Date.now();
    if (room.phase === 'voting' && this.connected().length && this.connected().every(m => room.votes[m.id])) this.startRun(); else this.lobby();
  }
  pickMonster() {
    const room = this.room, counts = Object.fromEntries(room.cards.map(id => [id, 0]));
    for (const m of this.connected()) if (room.cards.includes(room.votes[m.id])) counts[room.votes[m.id]]++;
    const max = Math.max(...Object.values(counts)), tied = room.cards.filter(id => counts[id] === max);
    return tied.includes(room.votes[room.hostId]) ? room.votes[room.hostId] : tied[randomInt(tied.length)];
  }
  startRun() {
    const room = this.room;
    if (room.phase !== 'voting' || !this.connected().length) return;
    room.monsterId = this.pickMonster(); room.faced.add(room.monsterId); room.round++;
    room.phase = 'playing'; room.paused = false; room.deadline = null; room.inputs = {}; room.events = []; room.lastEventId = 0;
    room.sim = createSimulation({ seed: room.seed, difficulty: room.difficulty, monsterId: room.monsterId });
    let slot = 0; for (const m of room.members.values()) { const p = addPlayer(room.sim, m.id, m.name, slot++); if (p) { p.connected = !!m.ws; p.alive = !!m.ws; p.spectator = !m.ws; } }
    const state = serializeSimulation(room.sim);
    this.broadcast({ type: 'start', seed: room.seed, difficulty: room.difficulty, monsterId: room.monsterId, players: state.players, state }); this.lobby();
  }
  message(peer, raw) {
    if (typeof raw !== 'string' || raw.length > MAX_PAYLOAD) return;
    const now = Date.now(), ws = peer.ws;
    if (now - peer.window >= 1000) { peer.window = now; peer.count = 0; }
    if (++peer.count > 120) { this.error(peer, 'Too many messages. Please reconnect.'); try { ws.close(1008, 'Rate limit'); } catch (e) {} return; }
    let msg; try { msg = JSON.parse(raw); } catch (e) { this.error(peer, 'Invalid message.'); return; }
    if (!msg || Array.isArray(msg) || typeof msg.type !== 'string') { this.error(peer, 'Invalid message.'); return; }
    if (msg.type === 'ping') { send(ws, { type: 'pong', time: now }); return; }
    if (msg.type === 'leave') { this.detach(peer, true); send(ws, { type: 'left' }); return; }
    if ((msg.type === 'create' || msg.type === 'join') && msg.worldVersion !== WORLD_VERSION) { this.error(peer, 'The course has been updated. Refresh this page before starting or reconnecting.'); return; }
    if (msg.type === 'create') {
      if (peer.member) { this.error(peer, 'Leave your current room first.'); return; }
      if (!peer.create || this.room) { this.error(peer, 'Could not make a room just now. Try again.'); return; }
      this.room = { code: this.code, mode: msg.mode === 'solo' ? 'solo' : 'party', difficulty: validDifficulty(msg.difficulty), phase: 'lobby', paused: false, hostId: null, members: new Map(), deck: [], cards: [], votes: {},
        faced: new Set(), offered: new Set(), round: 0, deadline: null, seed: 1, monsterId: null, sim: null, inputs: {}, events: [], lastEventId: 0, restartVotes: new Set(), emptySince: null, lastActivity: now };
      const member = { id: crypto.randomUUID(), token: hex(24), name: cleanName(msg.name), ready: true, ws: null, disconnectedAt: null };
      this.room.members.set(member.id, member); this.room.hostId = member.id;
      this.freshCards(); this.room.seed = randomInt(2 ** 31 - 2) + 1; this.room.phase = this.room.mode === 'solo' ? 'voting' : 'lobby'; this.attach(peer, member); return;
    }
    if (msg.type === 'join') {
      if (peer.member) { this.error(peer, 'Leave your current room first.'); return; }
      const room = this.room, code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : '';
      if (!/^[A-F0-9]{6}$/.test(code)) { this.error(peer, 'Enter the six-character room code.'); return; }
      if (!room || room.code !== code) { this.error(peer, 'That room was not found. Check the code or create a new room.'); return; }
      let member = typeof msg.token === 'string' ? [...room.members.values()].find(m => m.token === msg.token) : undefined;
      if (member) { this.attach(peer, member); return; }
      if (room.mode === 'solo') { this.error(peer, 'This is a solo run. Create a friends room to play together.'); return; }
      if (room.members.size >= 4) { this.error(peer, 'This room is full (four players maximum).'); return; }
      member = { id: crypto.randomUUID(), token: hex(24), name: cleanName(msg.name), ready: false, ws: null, disconnectedAt: null }; room.members.set(member.id, member);
      if (room.sim) { const was = room.sim.finished, p = addPlayer(room.sim, member.id, member.name, room.members.size - 1); if (p) { p.alive = false; p.spectator = true; p.connected = true; p.respawnReadyAt = room.sim.time; } room.sim.finished = was; }
      this.attach(peer, member); return;
    }
    const room = this.room, member = peer.member;
    if (!room || !member) { this.error(peer, 'Create or join a room first.'); return; }
    room.lastActivity = now;
    if (msg.type === 'input') {
      if (room.phase !== 'playing' || !room.sim?.players[member.id]?.alive || msg.lifeId !== room.sim.players[member.id].lifeId) return;
      if (!Number.isSafeInteger(msg.seq) || msg.seq < 0 || msg.seq <= peer.lastSeq) return;
      peer.lastSeq = msg.seq; peer.lastInput = now;
      room.inputs[member.id] = { forward: clamp(finite(msg.forward), -1, 1), strafe: clamp(finite(msg.strafe), -1, 1), yaw: wrapYaw(finite(msg.yaw)), pitch: clamp(finite(msg.pitch), -1.5, 1.5), jump: msg.jump === true, sprint: msg.sprint === true, seq: msg.seq }; return;
    }
    if (msg.type === 'respawn') {
      const p = room.sim?.players[member.id]; if (room.phase !== 'playing' || !p || p.alive || msg.lifeId !== p.lifeId) return;
      if (respawnPlayer(room.sim, member.id)) { room.paused = false; room.inputs[member.id] = idleInput(peer.lastSeq); p.ackSeq = peer.lastSeq; this.broadcast({ ...serializeSimulation(room.sim), type: 'state', events: [] }); this.lobby(); } return;
    }
    if (msg.type === 'ready') { if (room.phase !== 'lobby') return; member.ready = msg.ready === true; this.lobby(); return; }
    if (msg.type === 'pause') {
      if (room.mode !== 'solo' || room.phase !== 'playing') return;
      room.paused = msg.paused === true; room.inputs[member.id] = idleInput(peer.lastSeq);
      this.lobby(); send(peer.ws, { ...serializeSimulation(room.sim), type: 'state', paused: room.paused, events: [] }); return;
    }
    if (msg.type === 'difficulty') { if (member.id !== room.hostId || room.phase !== 'lobby') return; room.difficulty = validDifficulty(msg.difficulty); this.lobby(); return; }
    if (msg.type === 'begin') {
      if (member.id !== room.hostId) { this.error(peer, 'Only the host can open monster voting.'); return; }
      if (room.phase !== 'lobby') return;
      if (!this.connected().every(m => m.ready)) { this.error(peer, 'Everyone needs to be ready first.'); return; }
      room.phase = 'voting'; room.deadline = Date.now() + VOTE_MS; this.lobby(); return;
    }
    if (msg.type === 'vote') {
      if (room.phase !== 'voting' || !room.cards.includes(msg.monsterId)) { this.error(peer, 'Choose one of the three current creatures.'); return; }
      room.votes[member.id] = msg.monsterId; this.lobby();
      if (room.mode !== 'solo' && this.connected().every(m => room.votes[m.id])) this.startRun(); return;
    }
    if (msg.type === 'start') {
      if (room.mode === 'solo' && room.phase === 'voting' && room.cards.includes(room.votes[member.id])) this.startRun();
      else this.error(peer, 'Select a creature first. Friends rooms start when voting finishes.'); return;
    }
    if (msg.type === 'restart') {
      if (!['playing', 'results'].includes(room.phase)) return;
      room.restartVotes.add(member.id);
      if ((room.phase === 'results' && member.id === room.hostId) || this.connected().every(m => room.restartVotes.has(m.id))) this.prepareRound(); else this.lobby(); return;
    }
    this.error(peer, 'Unknown action.');
  }
  // the clock: 60 steps a second on the wall clock (a late timer catches up, at most 0.1 s), snapshots every third step
  start() {
    if (this.timer) return;
    let last = Date.now(), acc = 0, tick = 0, lastClean = 0;
    this.timer = setInterval(() => {
      const now = Date.now(); acc += Math.min((now - last) / 1000, .1); last = now;
      const room = this.room;
      if (room) while (acc >= 1 / 60) {
        acc -= 1 / 60; tick++;
        if (room.phase === 'voting' && room.deadline && now >= room.deadline) this.startRun();
        if (room.phase !== 'playing' || !room.sim || room.paused) continue;
        for (const peer of this.peers) if (peer.member && peer.member.ws === peer.ws && now - peer.lastInput > 400) { const old = room.inputs[peer.member.id] || idleInput(); room.inputs[peer.member.id] = { ...old, forward: 0, strafe: 0, jump: false, sprint: false }; }
        for (const m of room.members.values()) if (!m.ws && room.inputs[m.id]) room.inputs[m.id] = { ...room.inputs[m.id], forward: 0, strafe: 0, jump: false, sprint: false };
        stepSimulation(room.sim, room.inputs, 1 / 60);
        if (Array.isArray(room.sim.events)) for (const ev of room.sim.events) if (ev.id > room.lastEventId) { room.events.push(ev); room.lastEventId = ev.id; }
        if (room.sim.finished) { room.phase = 'results'; this.lobby(); }
        if (tick % 3 === 0 || room.phase === 'results') { const state = serializeSimulation(room.sim); state.events = room.events.splice(0); this.broadcast({ ...state, type: 'state' }); }
      } else acc = 0;
      // once a second: give up seats left too long, close a room that has stayed empty, stop the clock when nobody is here
      if (now - lastClean >= 1000) {
        lastClean = now;
        if (room) {
          for (const m of room.members.values()) if (!m.ws && m.disconnectedAt && now - m.disconnectedAt > RECONNECT_MS) { room.members.delete(m.id); if (room.sim) delete room.sim.players[m.id]; }
          if ((room.emptySince && now - room.emptySince > EMPTY_MS) || (!room.members.size && now - room.lastActivity > EMPTY_MS)) this.room = null;
        }
        if (!this.room && !this.peers.size) { clearInterval(this.timer); this.timer = null; }
      }
    }, 1000 / 60);
  }
}
