// ARROWWOOD bots in Node (no browser): offline rooms fill with bots, bots find and shoot people, a free for all
// produces eliminations, rematches start without bots voting, and offline matches pay no coins.
//   node tools/arrowwood-bots-test.mjs
import * as E from '../arrowwood/server/engine.js';
let fails = 0; const ok = (c, name, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : '')); };
const step = (room, s) => { for (let i = 0; i < Math.round(s * 20); i++) E.step(room); E.drain(room); };
function offline(mode, level) {
  const room = E.createRoom({ code: 'BOTS', mode, offline: true }), me = E.join(room, { name: 'Me' }).id;
  E.fillBots(room, level); E.message(room, me, { t: 'start' }); return { room, me, P: () => [...room.players.values()] };
}
for (const [mode, n] of [['1v1', 2], ['2v2', 4], ['ffa', 6]]) { const { room, P } = offline(mode); ok(P().length === n && room.phase === 'intro', `${mode}: bots fill the seats and the match starts`, `${P().length} archers, ${room.phase}`); }
// a normal bot finds a person standing in the open and takes them out
for (const level of ['easy', 'normal', 'hard']) {
  const { room, me } = offline('1v1', level); step(room, 4); const t0 = room.t; let elim = 0;
  for (let i = 0; i < 20 * 150 && room.phase !== 'results'; i++) { const p = room.players.get(me); if (p.st.alive) { p.st.x = 70; p.st.z = 100; p.st.y = 0; } E.step(room); for (const o of E.drain(room)) if (o.m.t === 'elim' && o.m.v === me) elim++; if (elim >= 2) break; }
  const need = level === 'easy' ? 1 : 2; ok(elim >= need, `${level} bot eliminates a person standing in the open${need > 1 ? ', twice' : ''}`, `${elim} in ${(room.t - t0).toFixed(0)} s`);
}
// a free for all of bots (and one person hiding in a corner) produces eliminations and shots
{ const { room, me } = offline('ffa', 'normal'); let shots = 0, elims = 0, moved = 0; const start = new Map([...room.players.values()].map(p => [p.id, [p.st.x, p.st.z]]));
  step(room, 2);
  for (let i = 0; i < 20 * 60; i++) { const p = room.players.get(me); p.st.x = 8; p.st.z = 8; p.st.alive = p.st.alive; E.step(room); for (const o of E.drain(room)) { if (o.m.t === 'shot') shots++; if (o.m.t === 'elim') elims++; } }
  for (const p of room.players.values()) if (p.bot) { const s = start.get(p.id); if (Math.hypot(p.st.x - s[0], p.st.z - s[1]) > 5) moved++; }
  ok(shots > 15 && elims >= 3, 'a minute of bot free for all: arrows fly and archers fall', `${shots} shots, ${elims} eliminations`); ok(moved >= 4, 'bots move around the wood', `${moved} of 5 moved`); }
// the match ends with results and no coins; a rematch starts on the person's vote alone
{ const { room, me } = offline('1v1', 'hard'); let res = null;
  for (let i = 0; i < 20 * 900 && !res; i++) { E.step(room); for (const o of E.drain(room)) if (o.m.t === 'results') res = o.m; }
  ok(res && Object.keys(res.coins).length === 0, 'an offline match ends with results and pays no coins', res ? `${res.score.join('-')} ${res.reason}` : 'no result');
  E.message(room, me, { t: 'rematch' }); ok(room.phase === 'intro', 'rematch starts on your vote (bots always agree)', room.phase); }
console.log(fails ? fails + ' FAILED' : 'ALL OK');
