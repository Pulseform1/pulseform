// ARROWWOOD round rules in Node (no browser): overtime capture, a same-tick double wipe replays the round, the 4–4
// decider, damage by zone and draw, friendly fire off, recovering your own arrows, pickups.   node tools/arrowwood-rules-test.mjs
import * as E from '../arrowwood/server/engine.js';
import * as W from '../arrowwood/shared/world.js';
let fails = 0; const ok = (c, name, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : '')); };
const step = (room, s) => { for (let i = 0; i < Math.round(s * 20); i++) E.step(room); };
function match(mode, oneShot) {
  const room = E.createRoom({ code: 'TEST', mode, dev: true, oneShot }), n = E.SIZES[mode], ids = [];
  for (let i = 0; i < n; i++) ids.push(E.join(room, { name: 'P' + i, profile: 'p' + i }).id);
  ids.slice(1).forEach(id => E.message(room, id, { t: 'ready', v: true })); E.message(room, ids[0], { t: 'start' }); step(room, 1.2); E.drain(room);
  return { room, ids, P: id => room.players.get(id) };
}
const tp = (room, id, x, z, yaw = 0) => E.message(room, id, { t: 'dev', tp: [x, 0, z], yaw });
function shootAt(room, from, to, zoneY, power = 1) {   // a real arrow from `from` at the point zoneY above `to`'s feet
  const a = room.players.get(from).st, b = room.players.get(to).st, full = W.isFull(power), o = W.shotOrigin({ ...a, yaw: 0, pitch: 0 }, full), tx = b.x, ty = b.y + zoneY, tz = b.z;
  const yaw = Math.atan2(-(tx - o[0]), -(tz - o[2])), d = Math.hypot(tx - o[0], tz - o[2]), v = W.launchSpeed(power), g = W.GRAV, h = ty - o[1], disc = v ** 4 - g * (g * d * d + 2 * h * v * v);
  const pitch = full ? Math.atan2(h, d) : Math.atan((v * v - Math.sqrt(Math.max(0, disc))) / (g * d)); E.message(room, from, { t: 'in', s: 1, p: [a.x, a.y, a.z], yaw, pitch });
  E.message(room, from, { t: 'draw' }); step(room, power >= 1 ? 1 : W.BOW.fullDraw * (1 - Math.sqrt(1 - power)) + .05); E.message(room, from, { t: 'fire', cid: 1, yaw, pitch, dt: power >= 1 ? 1 : W.BOW.fullDraw * (1 - Math.sqrt(1 - power)) });
}
// a full draw flies dead straight: no drop at all, so it goes exactly where you look; a weaker draw still arcs
{ const { room, ids, P } = match('1v1'); tp(room, ids[0], 70, 120); tp(room, ids[1], 30, 30); step(room, .2);
  const s = P(ids[0]).st; E.message(room, ids[0], { t: 'in', s: 1, p: [s.x, s.y, s.z], yaw: 0, pitch: .05 }); E.message(room, ids[0], { t: 'draw' }); step(room, 1);
  E.message(room, ids[0], { t: 'fire', cid: 1, yaw: 0, pitch: .05, dt: 1 }); step(room, .5); const a = room.arrows[0], o = W.shotOrigin({ ...P(ids[0]).st, yaw: 0, pitch: .05 }, true);
  const off = a ? Math.abs((a.prev[1] - o[1]) - Math.tan(.05) * Math.hypot(a.prev[0] - o[0], a.prev[2] - o[2])) : 9;
  ok(a && a.g === 0 && off < .01, 'a full draw flies dead straight along the line of sight', a ? `${Math.hypot(a.prev[0] - o[0], a.prev[2] - o[2]).toFixed(1)} m out, ${(off * 100).toFixed(1)} cm off the line` : 'no arrow');
  step(room, 1); E.message(room, ids[0], { t: 'draw' }); step(room, .4); E.message(room, ids[0], { t: 'fire', cid: 2, yaw: 0, pitch: .05, dt: .4 }); step(room, .5);
  const b = room.arrows.find(q => q.cid === 2); ok(b && b.g > 9, 'a part draw still arcs under gravity', b ? 'g ' + b.g : 'no arrow'); }
{ const { room, ids, P } = match('1v1'); tp(room, ids[0], 70, 100); tp(room, ids[1], 70, 55, Math.PI); step(room, .2); E.drain(room);
  shootAt(room, ids[0], ids[1], 1.62); step(room, 2); const h = E.drain(room).filter(o => o.m.t === 'hit').map(o => o.m)[0];
  ok(h && h.zone === 'head', 'a full draw aimed at a head 45 m away hits the head, exactly where it was aimed', h ? h.zone + ' at ' + h.dist + ' m' : 'missed'); }
// damage: full-draw head eliminates; full-draw body twice; leg shots and weak shots wound
{ const { room, ids, P } = match('1v1'); tp(room, ids[0], 70, 100); tp(room, ids[1], 70, 75, Math.PI); step(room, .2);
  shootAt(room, ids[0], ids[1], 1.0); step(room, 1.5); const hp1 = P(ids[1]).st.hp; step(room, .6);
  shootAt(room, ids[0], ids[1], 1.0); step(room, 1.5); const alive2 = P(ids[1]).st.alive;
  ok(hp1 > 30 && hp1 < 50 && !alive2, 'two strong body hits (not one) eliminate', `hp after one: ${hp1}`); }
{ const { room, ids, P } = match('1v1'); tp(room, ids[0], 70, 100); tp(room, ids[1], 70, 88, Math.PI); step(room, .2);
  shootAt(room, ids[0], ids[1], .5, .35); step(room, 1.5); const hp = P(ids[1]).st.hp;
  ok(hp > 75 && P(ids[1]).st.alive, 'a weak shot to the legs only wounds', `hp ${hp}`); }
{ const { room, ids, P } = match('1v1', true); tp(room, ids[0], 70, 100); tp(room, ids[1], 70, 88, Math.PI); step(room, .2);
  shootAt(room, ids[0], ids[1], .5, .35); step(room, 1.5);
  ok(!P(ids[1]).st.alive, 'with one-shot rules the same weak leg shot eliminates'); }
// friendly fire is off: an arrow passes through a teammate
{ const { room, ids, P } = match('2v2'); const t0 = P(ids[0]).team, mate = ids.find(i => i !== ids[0] && P(i).team === t0), foe = ids.find(i => P(i).team !== t0);
  tp(room, ids[0], 70, 100); tp(room, mate, 70, 92, 0); tp(room, foe, 70, 80, Math.PI); step(room, .2);
  shootAt(room, ids[0], foe, 1.62); step(room, 1.5);
  ok(P(mate).st.hp === 100 && !P(foe).st.alive, 'friendly fire is off: the arrow passes the teammate and hits the opponent', `mate ${P(mate).st.hp}`); }
// overtime: after the round clock, holding the bridge clearing alone wins
{ const { room, ids, P } = match('1v1'); step(room, 26); const ph = room.phase; tp(room, ids[0], W.ZONE.x, W.ZONE.z - 4); tp(room, ids[1], 70, 20); step(room, 3.5);
  const out = E.drain(room).filter(o => o.m.t === 'round').map(o => o.m)[0];
  ok(ph === 'overtime' && out && out.reason === 'capture' && out.winner === P(ids[0]).team, 'overtime opens the Stone Bridge zone; holding it alone wins the round', `${ph}, ${out && out.reason}`); }
{ const { room, ids, P } = match('1v1'); step(room, 26); tp(room, ids[0], W.ZONE.x, W.ZONE.z - 4); tp(room, ids[1], W.ZONE.x, W.ZONE.z + 4); step(room, 4);
  const cap = room.cap.slice(); ok(cap[0] === 0 && cap[1] === 0 && room.phase === 'overtime', 'both teams in the zone: contested, nobody captures', cap.join(',')); }
// a same-tick double wipe replays the round (no point to anyone)
{ const { room, ids, P } = match('1v1'); tp(room, ids[0], 70, 100, 0); tp(room, ids[1], 70, 76, Math.PI); step(room, .2);
  const a = P(ids[0]), b = P(ids[1]); a.st.hp = 1; b.st.hp = 1;
  // both arrows land on the same tick: release them on the same tick from the same distance
  for (const [f, t] of [[ids[0], ids[1]], [ids[1], ids[0]]]) { const s = P(f).st, o = P(t).st, oo = W.shotOrigin({ ...s, pitch: 0 }, true); const yaw = Math.atan2(-(o.x - oo[0]), -(o.z - oo[2])), pitch = Math.atan2(o.y + 1.2 - oo[1], Math.hypot(o.x - oo[0], o.z - oo[2])); E.message(room, f, { t: 'in', s: 1, p: [s.x, s.y, s.z], yaw, pitch }); E.message(room, f, { t: 'draw' }); }
  step(room, 1); for (const f of ids) { const s = P(f).st; E.message(room, f, { t: 'fire', cid: 1, yaw: s.yaw, pitch: s.pitch, dt: 1 }); }
  step(room, 2); const r = E.drain(room).filter(o => o.m.t === 'round').map(o => o.m)[0];
  ok(r && r.winner === 'replay' && r.reason === 'wipe' && room.score.join('') === '00', 'both archers down on the same tick: the round is replayed', r && `${r.winner} ${r.reason} ${room.score.join('-')}`); }
// the 4–4 decider: flagged, and the next round wins the match
{ const { room, ids, P } = match('1v1'); room.score = [4, 4]; tp(room, ids[0], 70, 100); tp(room, ids[1], 70, 75, Math.PI); step(room, .2);
  shootAt(room, ids[0], ids[1], 1.62); step(room, 1.5); const r = E.drain(room).filter(o => o.m.t === 'round').map(o => o.m)[0]; step(room, 3);
  ok(r && r.score.join('-') === '5-4' && room.phase === 'results', 'at 4–4 the next round wins the match', r && r.score.join('-')); }
// arrows: six a round; your misses can be pulled back out; a bundle gives three
{ const { room, ids, P } = match('1v1'); const me = P(ids[0]); tp(room, ids[0], 70, 100); step(room, .2);
  E.message(room, ids[0], { t: 'in', s: 1, p: [me.st.x, me.st.y, me.st.z], yaw: 0, pitch: -.3 }); E.message(room, ids[0], { t: 'draw' }); step(room, .3); E.message(room, ids[0], { t: 'fire', cid: 1, yaw: 0, pitch: -.3, dt: .3 }); step(room, 1);
  const s = room.stuck.find(q => q.by === ids[0]), n0 = me.st.arrows; tp(room, ids[0], s.p[0], s.p[2] + .6); step(room, .3);
  ok(n0 === 5 && me.st.arrows === 6, 'a missed arrow you walk up to goes back in your quiver', `${n0} -> ${me.st.arrows}`);
  const k = room.picks[0]; me.st.arrows = 2; tp(room, ids[0], k.x, k.z); step(room, .3);
  ok(me.st.arrows === 5 && k.taken, 'an arrow bundle in the open gives three', me.st.arrows); }
console.log(fails ? fails + ' FAILED' : 'ALL OK');
