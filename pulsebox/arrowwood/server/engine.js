/* ARROWWOOD match engine: everything that decides the game runs here, on the server (Cloudflare Durable Object or the
   local Node server), never in a player's browser. Movement reported by a client is checked against what the body could
   have done; arrows, hits, health, ammo, eliminations, round timers, scores and coin rewards are all decided here.
   The browser's practice range runs this same engine locally, with straw dummies in place of opponents.

   Modes: '1v1' and '2v2' (first to three round wins, one life per round), 'ffa' (free for all: 2:30, most eliminations
   wins, one shot one kill, respawn somewhere new) and 'practice'. A team room can switch on one-shot rules.

   createRoom(opts) -> room; join(room, info, now) -> { id, token } | { err }; message(room, id, msg, now);
   drop(room, id, now) when a socket closes; tick(room, now) about 20 times a second; drain(room) -> [{ to, m }] to send.
   room.grant(profile, matchId, coins) is called once per player when a match ends (the host of the engine saves it). */
import {
  BOW, PL, drawPower, launchSpeed, damageFor, moveStep, groundAt, blocked, terrainH, arrowAt, aimVector, shotOrigin,
  sweepWorld, sweepBodies, TARGETS, TARGET, targetPos, sweepTargets, SPAWNS, SPAWN_YAW, FFA_SPAWNS, ZONE, COINS, BOW_IDS, gridRef, areaName, inWater,
  rayWorld, eyeHeight, GRAV, MIN, MAX, CX, CZ, gravFor, isFull, useMap, MAP_IDS,
} from '../shared/world.js';

export const TICK = 1 / 20;
// the most a report may rise above the last one: a whole jump (about 1.14 m) and some, so a late report at the top of a jump isn't refused
const JUMP_UP = PL.jump * PL.jump / (2 * PL.grav) + .3;
const NORMAL = { intro: 3.5, round: 80, ot: 40, capture: 6, end: 4.6, ffa: 150, respawn: 3.4, grace: 45, lobbyGrace: 25, ffaPick: 22 };
const FAST = { intro: 1, round: 25, ot: 10, capture: 2.5, end: 2.6, ffa: 40, respawn: 2.2, grace: 8, lobbyGrace: 8, ffaPick: 6 };
export const SIZES = { '1v1': 2, '2v2': 4, ffa: 8, practice: 1 };
export const WIN_ROUNDS = 3;
const rid = n => { let s = ''; for (let i = 0; i < n; i++) s += 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 32)]; return s; };
const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
const cleanName = n => String(n || '').replace(/[^\p{L}\p{N} _.'-]/gu, '').trim().slice(0, 16) || 'Archer';

// the map: a room is on one map at a time (room.map); the host picks one or 'random' (room.mapPick), and a random room
// draws a new map for every match. The practice range is always the King's Wood. Every entry point below switches the
// shared world to this room's map first, so rooms on different maps can share one process.
const pickMap = (pick, last) => { if (pick !== 'random') return pick; const pool = MAP_IDS.filter(id => id !== last); return pool[Math.floor(Math.random() * pool.length)]; };
export function createRoom(o = {}) {
  const mode = SIZES[o.mode] ? o.mode : '1v1', mapPick = mode === 'practice' ? 'kingswood' : o.map === 'random' || MAP_IDS.includes(o.map) ? o.map : 'kingswood', map = pickMap(mapPick);
  useMap(map);
  return { map, mapPick,
    code: o.code || '', mode, oneShot: !!o.oneShot || mode === 'ffa', dev: !!o.dev, T: (o.fast != null ? o.fast : o.dev) ? FAST : NORMAL,
    players: new Map(), host: null, phase: 'lobby', t: 0, phaseEnd: 0, round: 0, score: [0, 0], winner: null,
    arrows: [], stuck: [], tg: TARGETS.map(() => ({ up: true, back: 0 })), nextId: 1, out: [], cap: [0, 0], matchId: '', votes: new Set(), log: [],
    grant: o.grant || null, practice: mode === 'practice', lastSnap: 0, created: o.now || 0, ffaEnd: 0, lobbyVer: 0, offline: !!o.offline,
  };
}
const send = (room, to, m) => room.out.push({ to, m });
export function drain(room) { const o = room.out; room.out = []; return o; }
const list = room => [...room.players.values()];
const humans = room => list(room).filter(p => !p.dummy);
const teamOf = (room, p) => room.mode === 'ffa' ? p.id : p.team;
const foes = (room, a, b) => room.mode === 'ffa' ? a.id !== b.id : a.team !== b.team;

function newState(x, z, yaw) { const y = groundAt(x, z, terrainH(x, z) + 3); return { x, y, z, vy: 0, yaw, pitch: 0, crouch: false, sprint: false, onGround: true, alive: true, hp: 100, arrows: BOW.startArrows, drawAt: null, nockAt: 0, budget: 2, lastIn: 0, seq: 0, inWater: false }; }

// ---- joining, leaving, coming back
export function join(room, info, now) {
  useMap(room.map);
  if (info.token) {   // a player coming back to their seat after a dropped connection
    const p = list(room).find(q => q.token === info.token);
    if (p) { p.connected = true; p.goneAt = 0; if (info.bow && BOW_IDS.includes(info.bow)) p.bow = info.bow; lobbyOut(room); welcome(room, p); say(room, `${p.name} reconnected`); return { id: p.id, token: p.token, back: true }; }
    if (room.phase !== 'lobby' && room.phase !== 'results') return { err: 'Your seat in that match was given up. Ask your friends for a new room.' };
  }
  if (humans(room).length >= SIZES[room.mode]) return { err: 'That room is full.' };
  if (room.phase !== 'lobby' && room.phase !== 'results') return { err: 'That match has already started. Ask your friends to make a rematch room.' };
  const id = 'p' + rid(5), token = rid(16), cnt = [0, 1].map(t => humans(room).filter(p => p.team === t).length);
  const team = room.mode === 'ffa' ? 0 : cnt[0] <= cnt[1] ? 0 : 1;
  const p = { id, token, name: cleanName(info.name), profile: info.profile || '', bow: BOW_IDS.includes(info.bow) ? info.bow : 'longbow', team, ready: false, connected: true, goneAt: 0, kills: 0, deaths: 0, st: newState(70, 120, 0), stuckIn: [] };
  if (room.mode === 'ffa') p.slot = humans(room).length;
  room.players.set(id, p); if (!room.host || !room.players.get(room.host)) room.host = id;
  if (room.practice) { p.ready = true; startPractice(room, now); }
  lobbyOut(room); welcome(room, p);
  return { id, token };
}
function welcome(room, p) {
  send(room, p.id, { t: 'welcome', id: p.id, token: p.token, code: room.code, mode: room.mode, oneShot: room.oneShot, phase: room.phase, tm: r2(room.t), map: room.map, mapPick: room.mapPick,
    stuck: room.stuck.map(stuckOut), tg: room.tg.map((k, i) => k.up ? -1 : i).filter(i => i >= 0), score: room.score, round: room.round, results: room.phase === 'results' ? room.lastResults : undefined });
}
export function drop(room, id, now) {
  useMap(room.map);
  const p = room.players.get(id); if (!p) return;
  p.connected = false; p.goneAt = room.t; p.st.drawAt = null;
  say(room, `${p.name} lost connection${room.phase === 'lobby' ? '' : '. Waiting for them to come back...'}`);
  lobbyOut(room);
}
function removePlayer(room, p) {
  room.players.delete(p.id); room.votes.delete(p.id);
  if (room.host === p.id) { const n = humans(room)[0]; room.host = n ? n.id : null; }
  say(room, `${p.name} left`);
  if (room.phase !== 'lobby' && room.phase !== 'results' && !room.practice) {
    if (room.mode === 'ffa') { if (humans(room).length < 2) endMatch(room, 'forfeit'); }
    else for (const t of [0, 1]) if (!humans(room).some(q => q.team === t)) { room.winner = 1 - t; endMatch(room, 'forfeit'); break; }
  }
  if (room.phase === 'results' && !humans(room).length) room.phase = 'lobby';
  lobbyOut(room);
}
function say(room, text) { send(room, '*', { t: 'note', text }); }
function lobbyOut(room) {
  room.lobbyVer++;
  send(room, '*', { t: 'lobby', code: room.code, mode: room.mode, oneShot: room.oneShot, host: room.host, map: room.map, mapPick: room.mapPick, phase: room.phase, score: room.score, round: room.round, size: SIZES[room.mode],
    players: humans(room).map(p => ({ id: p.id, name: p.name, team: p.team, ready: p.ready, on: p.connected, bow: p.bow, k: p.kills, d: p.deaths, bot: p.bot ? p.bot.level : undefined })), votes: [...room.votes] });
}
const canStart = room => {
  const h = humans(room), need = SIZES[room.mode];
  if (room.mode === 'ffa') return h.length >= 2 && h.every(p => p.ready || p.id === room.host) && h.every(p => p.connected);
  const t0 = h.filter(p => p.team === 0).length, t1 = h.filter(p => p.team === 1).length;
  return t0 === need / 2 && t1 === need / 2 && h.every(p => (p.ready || p.id === room.host) && p.connected);
};

// ---- messages from a player
export function message(room, id, m, now) {
  useMap(room.map);
  const p = room.players.get(id); if (!p || !m || typeof m !== 'object') return;
  const st = p.st;
  switch (m.t) {
    case 'name': p.name = cleanName(m.name); lobbyOut(room); break;
    case 'bow': if (BOW_IDS.includes(m.bow) && m.ok) { p.bow = m.bow; lobbyOut(room); } break;   // ownership is checked by the host before this is passed in
    case 'mode': if (id === room.host && room.phase === 'lobby' && SIZES[m.mode] && m.mode !== 'practice') {
      const size = SIZES[m.mode]; if (humans(room).length > size) { send(room, id, { t: 'err', msg: `Too many people here for ${m.mode}.` }); break; }
      room.mode = m.mode; room.oneShot = m.mode === 'ffa' ? true : !!m.oneShot;
      if (m.mode !== 'ffa') { const h = humans(room); h.forEach((q, i) => { if (h.filter(r => r.team === q.team).length > size / 2) q.team = 1 - q.team; }); }
      for (const q of humans(room)) q.ready = false; lobbyOut(room); } break;
    case 'map': if (id === room.host && room.phase === 'lobby' && !room.practice && (m.map === 'random' || MAP_IDS.includes(m.map))) { room.mapPick = m.map; lobbyOut(room); } break;
    case 'team': if (room.phase === 'lobby' && room.mode !== 'ffa' && (m.team === 0 || m.team === 1) && humans(room).filter(q => q.team === m.team).length < SIZES[room.mode] / 2) { p.team = m.team; p.ready = false; lobbyOut(room); } break;
    case 'ready': if (room.phase === 'lobby') { p.ready = !!m.v; lobbyOut(room); } break;
    // the host can move anyone to the other team; if that team is full, the two swap
    case 'move': if (id === room.host && room.phase === 'lobby' && room.mode !== 'ffa') { const q = room.players.get(m.id); if (!q || q.dummy) break; const to = 1 - q.team, there = humans(room).filter(r => r.team === to);
      if (there.length >= SIZES[room.mode] / 2) { const other = there[there.length - 1]; other.team = q.team; other.ready = false; } q.team = to; q.ready = false; lobbyOut(room); } break;
    case 'start': if (id === room.host && room.phase === 'lobby') { if (canStart(room) || (room.dev && m.force)) startMatch(room); else send(room, id, { t: 'err', msg: room.mode === 'ffa' ? 'Need at least two archers, everyone ready.' : `Need ${SIZES[room.mode] / 2} on each team, everyone ready.` }); } break;
    case 'rematch': if (room.phase === 'results') { room.votes.add(id); lobbyOut(room); const h = humans(room).filter(q => q.connected && !q.bot); if (h.length && h.every(q => room.votes.has(q.id))) { if (canStartTeams(room)) startMatch(room); else { room.phase = 'lobby'; room.votes.clear(); lobbyOut(room); } } } break;
    case 'lobby': if (room.phase === 'results') { room.phase = 'lobby'; room.votes.clear(); for (const q of humans(room)) q.ready = false; lobbyOut(room); } break;
    case 'in': moveIn(room, p, m); break;
    // a little slack on the nock timer: the client's clock and the server's tick never line up exactly
    case 'draw': if (st.alive && live(room) && st.arrows > 0 && room.t >= st.nockAt - .15 && !st.sprint) st.drawAt = room.t; else send(room, id, { t: 'nodraw' }); break;
    case 'cancel': st.drawAt = null; break;
    case 'fire': fire(room, p, m); break;
    case 'ping': if (Array.isArray(m.p) && m.p.length === 3 && m.p.every(Number.isFinite)) {
      const [x, y, z] = m.p, label = `${gridRef(x, z)} · ${areaName(x, z)}`;
      for (const q of humans(room)) if (!foes(room, p, q) || q.id === p.id) send(room, q.id, { t: 'ping', from: p.id, name: p.name, p: [r2(x), r2(y), r2(z)], label }); } break;
    case 'dev': if (room.dev && Array.isArray(m.tp)) { st.x = +m.tp[0]; st.z = +m.tp[2]; st.y = groundAt(st.x, st.z, +m.tp[1] + 2); if (Number.isFinite(m.yaw)) st.yaw = m.yaw; if (Number.isFinite(m.pitch)) st.pitch = m.pitch; send(room, id, { t: 'corr', p: [r2(st.x), r2(st.y), r2(st.z)], yaw: st.yaw }); } break;
  }
}
const canStartTeams = room => room.mode === 'ffa' ? humans(room).filter(q => q.connected).length >= 2 : [0, 1].every(t => humans(room).filter(q => q.team === t && q.connected).length === SIZES[room.mode] / 2);
const live = room => room.phase === 'live' || room.phase === 'overtime';

// movement: the client moves itself (so it feels instant) and reports where it is; the server only accepts what the body could have done
function moveIn(room, p, m) {
  const st = p.st; if (!Array.isArray(m.p) || m.p.length !== 3 || !m.p.every(Number.isFinite)) return;
  if (Number.isFinite(m.yaw)) st.yaw = m.yaw; if (Number.isFinite(m.pitch)) st.pitch = Math.max(-1.5, Math.min(1.5, m.pitch));
  st.seq = m.s | 0;
  const wasSprint = st.sprint; st.crouch = !!m.c; st.sprint = !!m.sp && !st.crouch; if (st.sprint && !wasSprint) st.drawAt = null;   // sprinting lowers the bow
  if (!st.alive || !live(room)) { st.lastIn = room.t; return; }   // frozen at the spawn during the countdown, still while out
  const dt = Math.min(.5, Math.max(0, room.t - (st.lastIn || room.t))); st.lastIn = room.t;
  // a little saved up, so a hitch on the player's device (half a second with no reports, then one long step) isn't thrown back
  st.budget = Math.min(4.2, st.budget + dt * PL.sprint * 1.25);
  let [x, y, z] = m.p; const d = Math.hypot(x - st.x, z - st.z);
  const g = groundAt(x, z, y + .1), bad = d > st.budget + .35 || blocked(x, y, z, st.crouch ? PL.hCrouch : PL.h) || y < g - .7 || y > Math.max(st.y, g) + JUMP_UP;
  if (bad) { send(room, p.id, { t: 'corr', p: [r2(st.x), r2(st.y), r2(st.z)], s: st.seq }); return; }
  st.budget -= d; st.x = x; st.y = Math.max(y, g - .05); st.z = z; st.inWater = inWater(x, z, st.y + .3);
}
function fire(room, p, m) {
  const st = p.st;
  if (!st.alive || !live(room) || st.drawAt == null || st.arrows <= 0) { st.drawAt = null; send(room, p.id, { t: 'nofire', cid: m.cid | 0, arrows: st.arrows }); return; }
  const seen = room.t - st.drawAt, held = Number.isFinite(m.dt) ? Math.max(0, Math.min(m.dt, seen + .25)) : seen;   // trust the client's draw time only up to what the server saw
  if (Number.isFinite(m.yaw)) st.yaw = m.yaw; if (Number.isFinite(m.pitch)) st.pitch = Math.max(-1.5, Math.min(1.5, m.pitch));
  const power = drawPower(held), full = isFull(power), speed = launchSpeed(power), o = shotOrigin(st, full), v = aimVector(st.yaw, st.pitch, speed);
  st.drawAt = null; st.nockAt = room.t + BOW.nock; if (!room.practice && !BOW.infinite) st.arrows--;   // the quiver never runs out
  const a = { id: room.nextId++, cid: m.cid | 0, by: p.id, o, v, g: gravFor(power), t0: room.t, age: 0, prev: o.slice(), power, bow: p.bow };
  room.arrows.push(a);
  send(room, '*', { t: 'shot', id: a.id, cid: a.cid, by: p.id, o: o.map(r3), v: v.map(r3), tm: r3(room.t), pw: r2(power), str: full ? 1 : 0 });
}

// ---- matches, rounds, free for all
function startMatch(room) {
  room.map = pickMap(room.mapPick, room.map); useMap(room.map); send(room, '*', { t: 'map', id: room.map });
  room.score = [0, 0]; room.round = 0; room.winner = null; room.votes.clear(); room.matchId = room.code + '-' + rid(6); room.granted = false;
  for (const p of humans(room)) { p.kills = 0; p.deaths = 0; p.tgts = 0; p.ready = false; }
  if (room.mode === 'ffa') { room.phase = 'intro'; room.phaseEnd = room.t + room.T.intro; resetWorld(room); humans(room).forEach((p, i) => spawnFfa(room, p, i)); room.ffaEnd = room.phaseEnd + room.T.ffa; lobbyOut(room); phaseOut(room); return; }
  nextRound(room);
}
function resetWorld(room) {
  room.arrows = []; room.stuck = []; room.cap = [0, 0];
  room.tg = TARGETS.map(() => ({ up: true, back: 0 }));   // every target stands again
  send(room, '*', { t: 'clear' });
}
function nextRound(room) {
  room.round++; resetWorld(room); room.phase = 'intro'; room.phaseEnd = room.t + room.T.intro; room.winner = null;
  for (const t of [0, 1]) humans(room).filter(p => p.team === t).forEach((p, i) => { const [x, z] = SPAWNS[t][i % SPAWNS[t].length]; p.st = { ...newState(x, z, SPAWN_YAW[t]), lastIn: room.t }; p.stuckIn = []; send(room, p.id, { t: 'corr', p: [r2(p.st.x), r2(p.st.y), r2(p.st.z)], yaw: p.st.yaw, spawn: 1 }); });
  lobbyOut(room); phaseOut(room);
}
function spawnFfa(room, p, i) {
  // somewhere new each time: the spawn farthest from everyone else, never the one you just used
  const others = humans(room).filter(q => q !== p && q.st.alive);
  let best = null, bd = -1;
  FFA_SPAWNS.forEach(([x, z], k) => { if (k === p.lastSpawn) return; const d = others.length ? Math.min(...others.map(q => Math.hypot(q.st.x - x, q.st.z - z))) : (k * 37 + (i || 0) * 11) % 50; if (d > bd) { bd = d; best = k; } });
  p.lastSpawn = best; const [x, z] = FFA_SPAWNS[best], yaw = Math.atan2(x - 70, z - 70);   // face toward the middle
  p.st = { ...newState(x, z, yaw), lastIn: room.t }; p.stuckIn = []; p.respawnAt = 0;
  send(room, p.id, { t: 'corr', p: [r2(p.st.x), r2(p.st.y), r2(p.st.z)], yaw, spawn: 1 }); send(room, '*', { t: 'respawn', id: p.id });
}
function phaseOut(room) { send(room, '*', { t: 'phase', map: room.map, ph: room.phase, end: r2(room.phaseEnd), round: room.round, score: room.score, winner: room.winner, mode: room.mode, ffaEnd: r2(room.ffaEnd) }); }
function endRound(room, winner, reason) {
  if (room.phase === 'roundEnd') return;
  room.phase = 'roundEnd'; room.phaseEnd = room.t + room.T.end; room.winner = winner; room.arrows.forEach(a => a.dead = true);
  for (const p of humans(room)) p.st.drawAt = null;
  if (winner === 0 || winner === 1) room.score[winner]++;
  send(room, '*', { t: 'round', winner, reason, score: room.score, round: room.round, decider: room.score[0] === WIN_ROUNDS - 1 && room.score[1] === WIN_ROUNDS - 1 });
  phaseOut(room);
}
function endMatch(room, reason) {
  room.phase = 'results'; room.arrows = [];
  let winners = [];
  if (room.mode === 'ffa') { const h = humans(room), top = Math.max(0, ...h.map(p => p.kills)); winners = h.filter(p => p.kills === top && top > 0).map(p => p.id); }
  else if (room.winner === 0 || room.winner === 1) winners = humans(room).filter(p => p.team === room.winner).map(p => p.id);
  const coins = {}, coinRows = {};
  if (!room.granted && !room.practice) {
    room.granted = true;   // rewards are decided once per match, here; the bank also refuses a second grant for the same match
    for (const p of humans(room).filter(q => !q.bot)) {
      if (!p.connected && room.t - p.goneAt > room.T.grace) continue;
      const won = winners.includes(p.id), rw = room.mode === 'ffa' ? 0 : room.score[p.team] || 0, rows = [['Match played', COINS.match]];
      if (p.kills) rows.push([`${p.kills} elimination${p.kills === 1 ? '' : 's'}`, p.kills * COINS.kill]);
      if (rw) rows.push([`${rw} round${rw === 1 ? '' : 's'} won`, rw * COINS.round]);
      if (won) rows.push([room.mode === 'ffa' ? 'Most eliminations' : 'Victory', room.mode === 'ffa' ? COINS.ffaTop : COINS.win]);
      if (p.tgts) rows.push([`${p.tgts} target${p.tgts === 1 ? '' : 's'} broken`, p.tgts * TARGET.coins]);
      const c = Math.min(room.offline ? COINS.maxBots : COINS.maxMatch, rows.reduce((a, r) => a + r[1], 0));
      coins[p.id] = c; coinRows[p.id] = rows; if (!room.offline && room.grant && p.profile) room.grant(p.profile, room.matchId, c, won);   // a bot match: the player's own game banks it
    }
  }
  room.lastResults = { t: 'results', reason, mode: room.mode, score: room.score.slice(), winner: room.winner, winners, coins, coinRows, matchId: room.matchId,
    board: humans(room).map(p => ({ id: p.id, name: p.name, team: p.team, k: p.kills, d: p.deaths })).sort((a, b) => b.k - a.k || a.d - b.d) };
  send(room, '*', room.lastResults);
  lobbyOut(room); phaseOut(room);
}

// ---- bots: offline matches against the computer. They play by the same rules as everyone: the same body, the same
// draw timing, real arrows through the same collision. They see only what a straight line from the eye reaches.
const BOT_NAMES = ['Bramble', 'Fletch', 'Hazel', 'Rook', 'Wren', 'Thistle', 'Kestrel', 'Juniper', 'Sorrel', 'Pip', 'Alder', 'Briar'];
export const BOT_LEVELS = {
  easy: { err: .034, react: [.9, 1.5], draw: [.45, .8], range: 45, shoot: 26, strafe: .5, head: 0, think: .35 },
  normal: { err: .021, react: [.5, .9], draw: [.65, 1], range: 60, shoot: 34, strafe: .8, head: .15, think: .25 },
  hard: { err: .011, react: [.25, .5], draw: [.85, 1.05], range: 75, shoot: 48, strafe: 1, head: .35, think: .15 },
};
const rr = (a, b) => a + Math.random() * (b - a), gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / .5;
export function addBot(room, level = 'normal', team) {
  useMap(room.map);
  if ((room.phase !== 'lobby' && room.phase !== 'results') || humans(room).length >= SIZES[room.mode]) return null;
  const used = new Set(humans(room).map(p => p.name)), name = BOT_NAMES.find(n => !used.has(n)) || 'Bot ' + rid(2);
  const cnt = [0, 1].map(t => humans(room).filter(p => p.team === t).length), id = 'b' + rid(5);
  const p = { id, token: rid(16), name, profile: '', bow: BOW_IDS[Math.floor(Math.random() * BOW_IDS.length)], team: room.mode === 'ffa' ? 0 : team != null ? team : cnt[0] <= cnt[1] ? 0 : 1,
    ready: true, connected: true, goneAt: 0, kills: 0, deaths: 0, st: newState(70, 120, 0), stuckIn: [], bot: { level: BOT_LEVELS[level] ? level : 'normal' } };
  if (room.mode === 'ffa') p.slot = humans(room).length;
  room.players.set(id, p); lobbyOut(room); return p;
}
// fill every empty seat with bots (team modes: your partner and the other side; free for all: `ffa` archers in all)
export function fillBots(room, level = 'normal', ffa = 6) {
  useMap(room.map);
  for (const p of humans(room)) if (p.bot) room.players.delete(p.id);
  const size = room.mode === 'ffa' ? Math.min(SIZES.ffa, ffa) : SIZES[room.mode];
  if (room.mode !== 'ffa') for (const t of [0, 1]) while (humans(room).filter(p => p.team === t).length < size / 2) if (!addBot(room, level, t)) break;
  while (humans(room).length < size) if (!addBot(room, level)) break;
  humans(room).forEach((p, i) => { p.slot = i; }); lobbyOut(room);
}
function botsStep(room) { for (const p of humans(room)) if (p.bot && p.st.alive) botThink(room, p); else if (p.bot) p.st.drawAt = null; }
const chestOf = s => [s.x, s.y + (s.crouch ? .85 : 1.2), s.z];
function canSee(eye, s) { const c = chestOf(s), d = [c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]], L = Math.hypot(d[0], d[1], d[2]); return L < 1 || rayWorld(eye, d.map(v => v / L), L) >= L - .35; }
function solvePitch(o, t, v) { const d = Math.hypot(t[0] - o[0], t[2] - o[2]), h = t[1] - o[1], g = GRAV, disc = v ** 4 - g * (g * d * d + 2 * h * v * v); return disc < 0 ? null : Math.atan((v * v - Math.sqrt(disc)) / (g * Math.max(d, .1))); }
function botThink(room, p) {
  const st = p.st, B = p.bot, L = BOT_LEVELS[B.level], dt = TICK;
  if (B.round !== room.round || B.life !== st) { Object.assign(B, { round: room.round, life: st, seen: null, tgt: null, sense: 0, wp: null, wpT: 0, strafe: 1, strafeT: 0, prog: [st.x, st.z, room.t], detour: 0, detourDir: 1, seenAt: -9, reactAt: 0, drawFor: 0, cid: B.cid || 0, crouchT: 0 }); }
  const eye = [st.x, st.y + eyeHeight(st.crouch), st.z];
  // senses, a few times a second: the nearest foe in plain sight
  if (room.t >= B.sense) {
    B.sense = room.t + L.think * rr(.8, 1.2); let best = null, bd = L.range;
    for (const q of list(room)) { if (q === p || !q.st.alive || !foes(room, p, q)) continue; const d = Math.hypot(q.st.x - st.x, q.st.z - st.z); if (d < bd && canSee(eye, q.st)) { best = q; bd = d; } }
    if (best && (!B.tgt || B.tgt.id !== best.id)) B.reactAt = room.t + rr(L.react[0], L.react[1]);
    B.tgt = best; if (best) { B.seen = { x: best.st.x, z: best.st.z }; B.seenAt = room.t; }
    // nobody in sight for a while: they hear roughly where the nearest foe is (footsteps, a twang) and go hunting
    else if (room.t - B.seenAt > 7 && room.t >= (B.hearT || 0)) {
      B.hearT = room.t + rr(4, 7); let nf = null, nd = 1e9; for (const q of list(room)) { if (q === p || !q.st.alive || !foes(room, p, q)) continue; const d = Math.hypot(q.st.x - st.x, q.st.z - st.z); if (d < nd) { nd = d; nf = q; } }
      if (nf) { B.seen = { x: nf.st.x + (Math.random() - .5) * 14, z: nf.st.z + (Math.random() - .5) * 14 }; B.seenAt = room.t - 1; }
    }
  }
  const T = B.tgt && B.tgt.st.alive ? B.tgt : null;
  // where to go
  let gx = null, gz = null, want = 1, sprint = false;
  if (T) {   // (the quiver never runs out, so there is never a reason to go looking for arrows)
    const dx = T.st.x - st.x, dz = T.st.z - st.z, d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d;
    if (room.t >= B.strafeT) { B.strafe = Math.random() < .5 ? -1 : 1; B.strafeT = room.t + rr(.8, 2.4); }
    const far = d > L.shoot * .85, fwd = far ? 1 : d < 12 ? -.8 : 0, side = far ? L.strafe * B.strafe * .35 : L.strafe * B.strafe;
    gx = st.x + (ux * fwd - uz * side) * 4; gz = st.z + (uz * fwd + ux * side) * 4; want = far || d < 12 ? 1 : .8;
  } else if (B.seen && room.t - B.seenAt < 5) { gx = B.seen.x; gz = B.seen.z; sprint = Math.hypot(gx - st.x, gz - st.z) > 15; }
  else if (room.phase === 'overtime') { gx = ZONE.x; gz = ZONE.z; sprint = true; }
  if (gx == null) {
    if (!B.wp || room.t > B.wpT || Math.hypot(B.wp[0] - st.x, B.wp[1] - st.z) < 3) {
      // roam toward the other side's ground (or anywhere, in a free for all)
      const ffa = room.mode === 'ffa', side = p.team === 0 ? -1 : 1;
      const x = MIN + 8 + Math.random() * (MAX - MIN - 16), z = ffa ? MIN + 8 + Math.random() * (MAX - MIN - 16) : CZ + side * Math.random() * 45 + (Math.random() - .5) * 12;
      B.wp = [x, z]; B.wpT = room.t + rr(8, 16);
    }
    [gx, gz] = B.wp; sprint = true;
  }
  // stuck on a wall or a tree: step sideways for a moment
  if (room.t - B.prog[2] > 1) { const moved = Math.hypot(st.x - B.prog[0], st.z - B.prog[1]); if (moved < .6 && Math.hypot(gx - st.x, gz - st.z) > 2) { B.detour = room.t + rr(.8, 1.6); B.detourDir = Math.random() < .5 ? -1 : 1; B.jump = true; } B.prog = [st.x, st.z, room.t]; }
  let mvx = gx - st.x, mvz = gz - st.z; const ml = Math.hypot(mvx, mvz);
  if (ml > .4) { mvx /= ml; mvz /= ml; } else { mvx = 0; mvz = 0; }
  if (room.t < B.detour) { const t = mvx; mvx = -mvz * B.detourDir; mvz = t * B.detourDir; }
  // aiming: face the target while drawing, else the way you walk
  const drawing = st.drawAt != null;
  let wantYaw = st.yaw, wantPitch = 0;
  if (T) { const c = chestOf(T.st); wantYaw = Math.atan2(-(c[0] - st.x), -(c[2] - st.z)); wantPitch = Math.atan2(c[1] - eye[1], Math.hypot(c[0] - st.x, c[2] - st.z)); }
  else if (ml > .4) wantYaw = Math.atan2(-mvx, -mvz);
  const turn = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * Math.min(1, k * dt);
  st.yaw = turn(st.yaw, wantYaw, T ? 9 : 6); st.pitch += (wantPitch - st.pitch) * Math.min(1, 8 * dt);
  st.sprint = sprint && !drawing && !T; st.crouch = drawing && B.level === 'hard' && room.t < B.crouchT;
  const sy = Math.sin(st.yaw), cy = Math.cos(st.yaw);
  moveStep(st, { mx: (cy * mvx - sy * mvz) * want, mz: (-sy * mvx - cy * mvz) * want, jump: !!B.jump, drawing }, dt); B.jump = false;
  st.inWater = inWater(st.x, st.z, st.y + .3);
  // shooting
  if (!T) { if (drawing && room.t - B.seenAt > 1.2) st.drawAt = null; return; }
  const tdist = Math.hypot(T.st.x - st.x, T.st.z - st.z);
  if (drawing && tdist > L.shoot * 1.25) { st.drawAt = null; return; }
  if (!drawing && st.arrows > 0 && room.t >= st.nockAt && room.t >= B.reactAt && tdist <= L.shoot) { st.drawAt = room.t; B.drawFor = BOW.fullDraw * rr(L.draw[0], L.draw[1]); if (Math.random() < .5) B.crouchT = room.t + 3; return; }
  if (drawing && room.t - st.drawAt >= B.drawFor) {
    const held = room.t - st.drawAt, full = isFull(drawPower(held)), v = launchSpeed(drawPower(held)), head = Math.random() < L.head;
    let aim = [T.st.x, T.st.y + (T.st.crouch ? (head ? 1.12 : .82) : (head ? 1.6 : 1.2)), T.st.z], yaw = st.yaw, pitch = 0;
    for (let k = 0; k < 3; k++) {   // aim where they will be when the arrow gets there
      const o = shotOrigin({ ...st, yaw, pitch }, full); yaw = Math.atan2(-(aim[0] - o[0]), -(aim[2] - o[2])); const pt = full ? Math.atan2(aim[1] - o[1], Math.hypot(aim[0] - o[0], aim[2] - o[2])) : solvePitch(o, aim, v); if (pt == null) { pitch = .6; break; } pitch = pt;
      const tf = Math.hypot(aim[0] - o[0], aim[2] - o[2]) / Math.max(1, v * Math.cos(pitch)); aim = [T.st.x + (T.st.vx || 0) * tf, aim[1], T.st.z + (T.st.vz || 0) * tf];
    }
    const e = L.err * (.6 + tdist / 50);
    fire(room, p, { cid: ++B.cid, yaw: yaw + gauss() * e, pitch: pitch + gauss() * e * .6, dt: held });
  }
}

// ---- the practice range: straw dummies at marked distances, one walking a rail; endless arrows
const DUMMIES = [[70, 111, 'still'], [67, 101, 'still'], [73, 86, 'still'], [70, 71.5, 'still'], [70, 93, 'walk']];
function startPractice(room, now) {
  room.phase = 'live'; room.phaseEnd = 1e9; resetWorld(room);
  const me = humans(room)[0]; me.st = { ...newState(70, 121, 0), lastIn: room.t }; me.st.arrows = 99;
  DUMMIES.forEach(([x, z, k], i) => { const id = 'd' + i; room.players.set(id, { id, dummy: k, name: 'Straw dummy', team: 1, bow: 'longbow', connected: true, kills: 0, deaths: 0, home: [x, z], stuckIn: [], st: newState(x, z, Math.PI) }); });
  send(room, me.id, { t: 'corr', p: [r2(me.st.x), r2(me.st.y), r2(me.st.z)], yaw: 0, spawn: 1 });
  phaseOut(room);
}

// how many steps to run now. The room keeps to the wall clock: a timer that fires late catches up on the next call instead of
// letting the room's clock fall behind real time (which starved the movement budget and made every archer's snapshots
// come in slow and bunched)
export function due(room, now) {
  if (room.wall == null) { room.wall = now; room.lag = 0; return 1; }
  room.lag = Math.min(TICK * 6, room.lag + Math.max(0, now - room.wall) / 1000); room.wall = now;
  let n = 0; while (room.lag >= TICK * .75 && n < 6) { room.lag -= TICK; n++; }
  if (room.lag < -TICK) room.lag = -TICK;
  return n;
}

// ---- the simulation step
export function tick(room, now) {
  useMap(room.map);
  room.t += TICK;
  const T = room.T;
  // seats held for people who dropped: give them up after the grace period
  for (const p of humans(room)) if (!p.connected && room.t - p.goneAt > (room.phase === 'lobby' || room.phase === 'results' ? T.lobbyGrace : T.grace)) removePlayer(room, p);
  if (room.phase === 'intro' && room.t >= room.phaseEnd) { room.phase = 'live'; room.phaseEnd = room.mode === 'ffa' ? room.ffaEnd : room.t + T.round; phaseOut(room); }
  if (room.phase === 'live' && room.mode !== 'ffa' && !room.practice && room.t >= room.phaseEnd) { room.phase = 'overtime'; room.phaseEnd = room.t + T.ot; room.cap = [0, 0]; send(room, '*', { t: 'overtime', zone: ZONE }); phaseOut(room); }
  if (room.phase === 'live' && room.mode === 'ffa' && room.t >= room.phaseEnd) { endMatch(room, 'time'); }
  if (room.phase === 'roundEnd' && room.t >= room.phaseEnd) { if (Math.max(...room.score) >= WIN_ROUNDS) endMatch(room, 'score'); else nextRound(room); }
  if (room.practice) dummies(room);
  for (const p of list(room)) { const s = p.st; s.vx = (s.x - (s.px ?? s.x)) / TICK; s.vz = (s.z - (s.pz ?? s.z)) / TICK; s.px = s.x; s.pz = s.z; }
  if (live(room)) {
    botsStep(room);
    arrowsStep(room);
    targetsStep(room);
    if (room.mode === 'ffa') for (const p of humans(room)) if (!p.st.alive && p.respawnAt && room.t >= p.respawnAt) spawnFfa(room, p);
    if (room.phase === 'overtime') overtimeStep(room);
  } else if (room.phase === 'roundEnd' || room.phase === 'results') arrowsStep(room);   // arrows already in the air still land
  if (room.practice || room.phase === 'lobby' || room.phase === 'results' || room.phase === 'intro' || room.phase === 'roundEnd') targetsStep(room);
  // snapshots, about 20 a second
  const pl = list(room).map(p => { const s = p.st; return [p.id, r2(s.x), r2(s.y), r2(s.z), r3(s.yaw), r3(s.pitch), (s.alive ? 1 : 0) | (s.crouch ? 2 : 0) | (s.sprint ? 4 : 0) | (s.drawAt != null ? 8 : 0) | (p.connected ? 16 : 0) | (s.inWater ? 32 : 0), Math.max(0, Math.round(s.hp)), s.arrows, s.drawAt != null ? r2(drawPower(room.t - s.drawAt)) : 0, p.kills, p.deaths]; });
  const snap = { t: 's', tm: r3(room.t), ph: room.phase, end: r2(room.phaseEnd), pl };
  if (room.phase === 'overtime') { snap.cap = room.cap.map(r2); snap.in = zoneTeams(room); }
  send(room, '*', snap);
}
function dummies(room) {
  for (const p of list(room)) {
    if (!p.dummy) continue; const st = p.st;
    if (!st.alive && room.t >= (p.respawnAt || 0)) { p.st = newState(p.home[0], p.home[1], Math.PI); p.stuckIn = []; send(room, '*', { t: 'respawn', id: p.id }); }
    if (st.alive && p.dummy === 'walk') { st.x = p.home[0] + Math.sin(room.t * .45) * 9; st.y = groundAt(st.x, st.z, st.y + 1); st.yaw = Math.cos(room.t * .45) > 0 ? -Math.PI / 2 : Math.PI / 2; }
    if (st.alive && st.hp < 100 && room.t - (p.hurtAt || 0) > 3) st.hp = 100;
  }
}
function arrowsStep(room) {
  const sub = 3, dt = TICK / sub;
  for (const a of room.arrows) {
    if (a.dead) continue;
    for (let k = 0; k < sub && !a.dead; k++) {
      a.age += dt; const p1 = arrowAt(a.o, a.v, a.age, a.g), p0 = a.prev;
      const shooter = room.players.get(a.by);
      const bodies = live(room) ? list(room).filter(q => q.st.alive && (shooter ? foes(room, shooter, q) : q.id !== a.by)).map(q => ({ s: q.st, q })) : [];
      const hw = sweepWorld(p0, p1), hb = bodies.length ? sweepBodies(p0, p1, bodies) : null, ht = sweepTargets(p0, p1, room.tg.map(k => k.up), room.t);
      if (ht && (!hw || ht.t <= hw.t) && (!hb || ht.t <= hb.t)) { breakTarget(room, ht.i, a.by, ht.p); a.dead = true; break; }   // a target: it breaks, the arrow is spent
      if (hb && (!hw || hb.t <= hw.t)) { hitBody(room, a, hb, p0, p1); a.dead = true; break; }
      if (hw) { stick(room, a, p0, p1, hw); a.dead = true; break; }
      a.prev = p1;
      if (a.age > 7 || p1[1] < -30) a.dead = true;
    }
  }
  room.arrows = room.arrows.filter(a => !a.dead);
}
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function stick(room, a, p0, p1, hw) {
  const p = lerp3(p0, p1, hw.t), vel = [a.v[0], a.v[1] - a.g * a.age, a.v[2]], sp = Math.hypot(...vel), d = vel.map(v => v / sp);
  const tip = [p[0] + d[0] * .12, p[1] + d[1] * .12, p[2] + d[2] * .12];   // the head buries itself a little
  const rec = hw.mat !== 'water' ? p[1] - terrainH(p[0], p[2]) < 2.3 : true;
  const s = { id: a.id, by: a.by, p: tip, d, mat: hw.mat, kind: hw.kind, rec, bow: a.bow };
  room.stuck.push(s); if (room.stuck.length > 120) room.stuck.shift();
  send(room, '*', { t: 'stick', ...stuckOut(s) });
}
const stuckOut = s => ({ id: s.id, by: s.by, p: s.p.map(r2), d: s.d.map(r3), mat: s.mat, kind: s.kind, rec: s.rec });
function hitBody(room, a, hb, p0, p1) {
  const victim = hb.body.q, st = victim.st, p = lerp3(p0, p1, hb.t), vel = [a.v[0], a.v[1] - a.g * a.age, a.v[2]], sp = Math.hypot(...vel);
  const dmg = damageFor(hb.zone, sp, room.oneShot && !room.practice), killer = room.players.get(a.by);
  st.hp -= dmg; victim.hurtAt = room.t;
  // the arrow stays in them (until they are out of the round or respawn): where, in their own frame
  const c = Math.cos(st.yaw), s = Math.sin(st.yaw), dx = p[0] - st.x, dz = p[2] - st.z, d = vel.map(v => v / sp);
  const off = [r2(dx * c - dz * s), r2(p[1] - st.y), r2(dx * s + dz * c)], dl = [r3(d[0] * c - d[2] * s), r3(d[1]), r3(d[0] * s + d[2] * c)];
  victim.stuckIn.push({ off, d: dl });
  send(room, '*', { t: 'hit', id: a.id, by: a.by, v: victim.id, zone: hb.zone, dmg: Math.min(dmg, 100), hp: Math.max(0, Math.round(st.hp)), off, dl, p: p.map(r2), sp: r2(sp), pw: r2(a.power), dist: r2(Math.hypot(a.o[0] - p[0], a.o[2] - p[2])) });
  if (st.hp <= 0) eliminate(room, victim, killer, hb.zone, d);
}
function eliminate(room, victim, killer, zone, dir) {
  const st = victim.st; st.alive = false; st.hp = 0; st.drawAt = null;
  victim.deaths++; if (killer && killer !== victim) killer.kills++;
  send(room, '*', { t: 'elim', v: victim.id, k: killer ? killer.id : null, bow: killer ? killer.bow : 'longbow', zone, p: [r2(st.x), r2(st.y), r2(st.z)], yaw: r3(st.yaw), d: dir.map(r3), crouch: st.crouch, kn: killer ? killer.name : '', vn: victim.name });
  if (room.practice) { victim.respawnAt = room.t + 2.4; return; }
  if (room.mode === 'ffa') { victim.respawnAt = room.t + room.T.respawn; lobbyOut(room); return; }
  // the round is decided at the end of this tick (settle), after every arrow in the air has landed: a double wipe on one tick is a replay
  room.checkQueued = true;
}
// targets: a broken one stands again after a while. Whoever broke it is paid for it (online, with the match's coins)
function targetsStep(room) {
  room.tg.forEach((k, i) => { if (!k.up && room.t >= k.back) { k.up = true; send(room, '*', { t: 'tgt', i, up: 1 }); } });
}
function breakTarget(room, i, by, at) {
  const k = room.tg[i]; if (!k || !k.up) return; k.up = false; k.back = room.t + TARGET.back;
  const p = room.players.get(by); if (p && !p.bot && !p.dummy) p.tgts = (p.tgts || 0) + 1;
  send(room, '*', { t: 'tgt', i, up: 0, by, p: at.map(r2), coins: p && !p.bot ? TARGET.coins : 0 });
}
function zoneTeams(room) { const t = [0, 0]; for (const p of humans(room)) if (p.st.alive && Math.hypot(p.st.x - ZONE.x, p.st.z - ZONE.z) < ZONE.r) t[p.team]++; return t; }
function overtimeStep(room) {
  const inZ = zoneTeams(room);
  if (inZ[0] && !inZ[1]) room.cap[0] += TICK; else if (inZ[1] && !inZ[0]) room.cap[1] += TICK;
  for (const t of [0, 1]) if (room.cap[t] >= room.T.capture) return endRound(room, t, 'capture');
  if (room.t >= room.phaseEnd) {
    if (room.cap[0] !== room.cap[1]) return endRound(room, room.cap[0] > room.cap[1] ? 0 : 1, 'zone');
    const hp = [0, 1].map(t => humans(room).filter(p => p.team === t && p.st.alive).reduce((a, p) => a + p.st.hp, 0));
    if (hp[0] !== hp[1]) return endRound(room, hp[0] > hp[1] ? 0 : 1, 'health');
    endRound(room, 'replay', 'time');
  }
}
// round decisions queued by eliminations this tick are made here, after every arrow of the tick has flown
export function settle(room) {
  useMap(room.map);
  if (!room.checkQueued) return; room.checkQueued = false;
  if (room.phase !== 'live' && room.phase !== 'overtime') return;
  const up = [0, 1].map(t => humans(room).some(p => p.team === t && p.st.alive));
  if (!up[0] && !up[1]) endRound(room, 'replay', 'wipe'); else if (!up[0]) endRound(room, 1, 'elim'); else if (!up[1]) endRound(room, 0, 'elim');
}
// one call per tick for the hosts: step, settle, and age out
export function step(room, now) { useMap(room.map); tick(room, now); settle(room); }
