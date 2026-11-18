  /* ---------- 60 net: play with friends on one raft (2 to 4, through the Pulsebox rooms) ----------
     The host runs the whole sea: weather, waves, the raft, the wreckage, the shark, the big events, the saved run.
     Ten times a second it sends a picture of that world; when the raft or the shared materials change it sends those too.
     Everyone runs their own body (walking, swimming, hunger, thirst, tools, the hook and the rod) and sends where they are.
     A friend's hands go through the host: a piece of wreckage hauled in, a piece built, a fire lit, a log fixed down, all
     arrive as requests (NET.ask) that the host carries out against the one raft, so nobody's change is lost. */
  const NETS = { t: 0, invJ: '', ver: -1, full: false, lastW: 0, needT: 0, hostId: 0 };
  const FWD = new Set(['thunder', 'giant', 'pool', 'spout', 'rumble', 'dusk', 'cthulhu']);   // events friends should hear too
  NET.hook = (name, a) => { if (NET.on && !NET.client && NET.fw && FWD.has(name)) NET.fw.push(['ev', name, typeof a === 'number' || typeof a === 'string' ? a : null]); };
  const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
  const cellOut = c => ({ i: c.i, j: c.j, hp: Math.round(c.hp), floor: c.floor, walls: c.walls, shelter: c.shelter, obj: c.obj, reinforce: c.reinforce, store: c.store || 0, fish: c.fish || [], catch: c.catch || [], up: !!c.up, fire: c.fire ? { lit: c.fire.lit, cook: c.fire.cook } : null });
  function netSend(m) { try { MP.send(m); } catch (e) {} }
  // ---- the host: the world, the raft, the materials
  function hostWorld() {
    const s = { t: r3(S.t), tod: r3(S.tod), day: S.day, nights: S.nights, sea: r3(S.sea), seaTo: S.seaTo, wind: r2(S.wind), windAng: r3(S.windAng), rain: r3(S.rain), cloud: r3(S.cloud), phase: S.phase, severe: S.severe, flash: r2(S.flash), ox: S.ox, oz: S.oz,
      giants: S.giants, pools: S.pools, rings: S.rings, spouts: S.spouts };
    const R = RAFT, b = [r3(R.x), r3(R.y), r3(R.z), r3(R.yaw), r3(R.pitch), r3(R.roll), r3(R.vx), r3(R.vz), r3(R.vy), r3(R.vyaw), r3(R.vp), r3(R.vr), r3(R.rudder || 0)];
    const fl = FL.map(f => [f.id, f.k, r2(f.x), r2(f.z), r2(f.yaw), f.hooked ? 1 : 0]);
    const sh = [SH.state, r2(SH.x), r2(SH.y), r2(SH.z), r2(SH.yaw), SH.cell || '', r2(SH.swim)];
    const ct = { state: CT.state, t: r2(CT.t), x: r2(CT.x), z: r2(CT.z), y: r2(CT.y), ring: CT.ring };
    const ca = CACHE.on ? [r2(CACHE.x), r2(CACHE.y), r2(CACHE.z)] : 0;
    const dr = DRIFT.map(d => [d.id, r2(d.x), r2(d.y), r2(d.z), r3(d.yaw), r3(d.pitch), r3(d.roll), [...d.cells.values()].map(cellOut)]);
    return { t: 'w', s, b, fl, sh, ct, ca, dr, ev: NET.out || [] };
  }
  function hostTick(dt) {
    NETS.t += dt;
    if (RAFT.ver !== NETS.ver) { NETS.ver = RAFT.ver; netSend({ t: 'raft', ver: RAFT.ver, yaw: RAFT.yaw, cells: [...RAFT.cells.values()].map(cellOut), logs: RAFT.logs }); }
    const ij = JSON.stringify(INV); if (ij !== NETS.invJ) { NETS.invJ = ij; netSend({ t: 'inv', inv: INV }); }
    if (NETS.t - NETS.lastW >= .1) { NETS.lastW = NETS.t; netSend(hostWorld()); NET.out = []; }
    NET.paddle[0] *= Math.exp(-dt * 6); NET.paddle[1] *= Math.exp(-dt * 6); NET.rudder *= Math.exp(-dt * 3);   // a friend's paddling fades unless they keep at it
  }
  // a friend asks: carry it out here, and send back what they would have seen
  function hostDo(m) {
    const from = m.from, d = m.d || {};
    NET.cap = { says: [], got: [] };
    try {
      const cell = () => cellAt(RAFT, d.i, d.j);
      switch (m.a) {
        case 'need': NETS.ver = -1; NETS.invJ = ''; break;
        case 'collect': { const f = FL.find(f => f.id === d.id); if (f) { const got = contents(f); got.forEach(k => give(k)); FL.splice(FL.indexOf(f), 1); NET.cap.got.push(...got); } break; }
        case 'hk': { const held = new Set((d.items || []).map(q => q[0])); for (const f of FL) { if (f.heldBy === from && !held.has(f.id)) { f.hooked = false; f.heldBy = 0; } } for (const [id, x, z] of d.items || []) { const f = FL.find(f => f.id === id); if (f && (!f.hooked || f.heldBy === from)) { f.hooked = true; f.heldBy = from; f.x = x; f.z = z; } } break; }
        case 'place': if (!place(d.kind, d.i, d.j, d.side)) say('Someone beat you to it', '#cfd6e2'); break;
        case 'repair': { const c = cell(); if (c) repair(c); break; }
        case 'empty': { const c = cell(); if (c && HOLD[c.obj]) emptyPiece(c); break; }
        case 'fire': { const c = cell(); if (c && c.fire) { const t0 = PL.torch, k0 = Object.keys(INV).find(k => k.startsWith('fish:') && INV[k] > 0); PL.torch = !!d.torch; const F = c.fire;
          if (!F.lit) { if (PL.torch || (INV.tinder || 0) > 0) { if (!PL.torch) INV.tinder--; F.lit = true; F.wet = 0; emit('fire', true); say('The fire catches', '#ffd28a'); RAFT.ver++; } else say('Light it with your torch or dry tinder', '#cfd6e2'); }
          else if (F.cook && F.cook.done) { give('cooked:' + F.cook.k); NET.cap.got.push('cooked:' + F.cook.k); F.cook = null; RAFT.ver++; }
          else if (!F.cook && k0) { INV[k0]--; F.cook = { k: k0.slice(5), t: 0, done: false }; say('Cooking...', '#ffd28a'); RAFT.ver++; }
          PL.torch = t0; } break; }
        case 'cache': if (CACHE.on) openCache(); break;
        case 'spear': if (SH.state === 'bite' || SH.state === 'player' || SH.state === 'approach' || SH.state === 'circle') { SH.hits++; SH.stun = 1.2; emit('sharkHit'); if (SH.hits >= 3) { SH.state = 'flee'; SH.t = 10; NET.out.push(['say', 'It lets go and runs', '#9fe0a0']); emit('say', 'It lets go and runs', '#9fe0a0'); } } break;
        case 'log': if ((INV.log || 0) > 0) { const L = { lx: d.lx, lz: d.lz, rot: d.rot, solid: true }; if (logFits(L)) { INV.log--; RAFT.logs.push(L); RAFT.ver++; } else say('It no longer fits there', '#ff9a7a'); } break;
        case 'unlog': { const L = RAFT.logs.find(L => Math.abs(L.lx - d.lx) < .05 && Math.abs(L.lz - d.lz) < .05); if (L) { RAFT.logs.splice(RAFT.logs.indexOf(L), 1); RAFT.ver++; give('log'); NET.cap.got.push('log'); } break; }
        case 'give': INV[d.k] = (INV[d.k] || 0) + (d.n || 1); break;
        case 'spend': for (const [k, n] of Object.entries(d.need || {})) INV[k] = Math.max(0, (INV[k] || 0) - n); break;
        case 'rig': { const c = cell(); if (c && (c.obj === 'sail' || c.obj === 'anchor')) toggleRig(c); break; }
        case 'rudder': NET.rudder = cl(d.r || 0, -1, 1); break;
        case 'paddle': NET.paddle[0] = d.px || 0; NET.paddle[1] = d.pz || 0; break;
      }
    } catch (e) { console.error(e); }
    const cap = NET.cap; NET.cap = null;
    if (cap.says.length || cap.got.length) MP.to(from, { t: 're', says: cap.says, got: cap.got });
  }
  // ---- a friend: follow the host's world
  function clientWorld(m) {
    NETS.full = true;
    const s = m.s, dox = s.ox - S.ox, doz = s.oz - S.oz;
    if (dox || doz) { const mv = o => { o.x -= dox; o.z -= doz; }; mv(RAFT); FL.forEach(mv); mv(HK); mv(FS); PL.wx -= dox; PL.wz -= doz; for (const p of NET.peers.values()) if (p.pose && !p.pose.onRaft) { p.pose.wx -= dox; p.pose.wz -= doz; } emit('recentre', dox, doz); }
    const tOff = s.t - S.t; Object.assign(S, s); S.t = Math.abs(tOff) > 1 ? s.t : S.t + tOff * .15;   // ease the clock so the waves never jump
    const b = m.b, k = .25; RAFT.x += (b[0] - RAFT.x) * k; RAFT.z += (b[2] - RAFT.z) * k; RAFT.y += (b[1] - RAFT.y) * k; RAFT.yaw += Math.atan2(Math.sin(b[3] - RAFT.yaw), Math.cos(b[3] - RAFT.yaw)) * k; RAFT.pitch += (b[4] - RAFT.pitch) * k; RAFT.roll += (b[5] - RAFT.roll) * k;
    RAFT.vx = b[6]; RAFT.vz = b[7]; RAFT.vy = b[8]; RAFT.vyaw = b[9]; RAFT.vp = b[10]; RAFT.vr = b[11]; if (!PL.helm) RAFT.rudder = b[12] || 0;
    // wreckage: new pieces appear, gone ones go, the rest glide to where the host has them (the ones on your own hook stay with you)
    const seen = new Set();
    for (const [id, kk, x, z, yaw, h] of m.fl) { seen.add(id); let f = FL.find(f => f.id === id); if (!f) { if (NET.gone.has(id) && S.t - NET.gone.get(id) < 3) continue; f = addFloater(kk, x, z); f.id = id; }
      if (HK.items.includes(f)) continue; f.hooked = !!h; f.x += (x - f.x) * .35; f.z += (z - f.z) * .35; f.yaw = yaw; }
    for (let n = FL.length - 1; n >= 0; n--) if (!seen.has(FL[n].id) && !HK.items.includes(FL[n])) FL.splice(n, 1);
    const sh = m.sh; SH.state = sh[0]; SH.x += (sh[1] - SH.x) * .4; SH.y += (sh[2] - SH.y) * .4; SH.z += (sh[3] - SH.z) * .4; SH.yaw = sh[4]; SH.cell = sh[5]; SH.swim = sh[6];
    Object.assign(CT, m.ct); if (m.ca) Object.assign(CACHE, { on: true, x: m.ca[0], y: m.ca[1], z: m.ca[2] }); else CACHE.on = false;
    // pieces that broke away
    const ids = new Set(m.dr.map(d => d[0]));
    for (let n = DRIFT.length - 1; n >= 0; n--) if (!ids.has(DRIFT[n].id)) DRIFT.splice(n, 1);
    for (const [id, x, y, z, yaw, pitch, roll, cells] of m.dr) { let d = DRIFT.find(q => q.id === id); if (!d) { d = newBody(x, z); d.id = id; for (const c of cells) d.cells.set(ckey(c.i, c.j), Object.assign(newCell(c.i, c.j), c)); DRIFT.push(d); } Object.assign(d, { x, y, z, yaw, pitch, roll }); }
    for (const e of m.ev || []) { if (e[0] === 'say') emit('say', e[1], e[2] || undefined); else emit(e[1], e[2]); }
  }
  function clientRaft(m) {
    const keep = new Set();
    for (const c of m.cells) { const key = ckey(c.i, c.j); keep.add(key); const old = RAFT.cells.get(key); if (old) Object.assign(old, c, { fire: c.fire ? Object.assign(old.fire || {}, c.fire) : null }); else RAFT.cells.set(key, Object.assign(newCell(c.i, c.j), c)); }
    for (const key of [...RAFT.cells.keys()]) if (!keep.has(key)) RAFT.cells.delete(key);
    RAFT.logs = m.logs || []; RAFT.ver++;
    if (!NETS.raftIn) { NETS.raftIn = true; if (!PL.onRaft) Object.assign(PL, { onRaft: true, ly: 0, vy: 0, under: false }); }
    if (PL.onRaft && !cellUnder(RAFT, PL.lx, PL.lz)) { const c = RAFT.cells.values().next().value; if (c) { PL.lx = c.i * CS; PL.lz = c.j * CS; } }
  }
  function clientTick(dt) {
    NETS.t += dt;
    if (!NETS.full && NETS.t - NETS.needT > 1) { NETS.needT = NETS.t; NET.ask('need', {}); }
    if (NETS.t - NETS.lastW >= .1) {
      NETS.lastW = NETS.t;
      if (HK.items.length) NET.ask('hk', { items: HK.items.map(f => [f.id, r2(f.x), r2(f.z)]) }); else if (NETS.hk) NET.ask('hk', { items: [] });
      NETS.hk = HK.items.length > 0;
      const p = NET.paddleOut || [0, 0]; if (p[0] || p[1] || NETS.pad) NET.ask('paddle', { px: p[0], pz: p[1] }); NETS.pad = !!(p[0] || p[1]);
      const r = NET.rudderOut || 0; if (r || NETS.rud) NET.ask('rudder', { r }); NETS.rud = !!r;
    }
  }
  // ---- everyone: where I am, and where my friends are
  function poseTick() {
    if (NETS.t - (NETS.lastP || 0) < .1) return; NETS.lastP = NETS.t;
    netSend({ t: 'p', r: PL.onRaft ? 1 : 0, lx: r2(PL.lx), lz: r2(PL.lz), ly: r2(PL.ly), wx: r2(PL.wx), wy: r2(PL.wy), wz: r2(PL.wz), yaw: r3(PL.yaw), pitch: r3(PL.pitch), tool: PL.tool, torch: PL.torch ? 1 : 0, u: PL.under ? 1 : 0 });
  }
  NET.tick = dt => { if (!NET.on) return; if (NET.client) clientTick(dt); else hostTick(dt); poseTick(); };
  NET.ask = (a, d) => { if (NET.client) netSend({ t: 'a', a, d, to: NETS.hostId }); };
  function netMsg(m) {
    if (!NET.on) return;
    if (m.t === 'p') { const p = NET.peers.get(m.from); if (p) { p.pose = { onRaft: !!m.r, lx: m.lx, lz: m.lz, ly: m.ly, wx: m.wx, wy: m.wy, wz: m.wz, yaw: m.yaw, pitch: m.pitch, tool: m.tool, torch: !!m.torch, under: !!m.u }; p.at = NETS.t; } return; }
    if (!NET.client) { if (m.t === 'a') hostDo(m); return; }
    if (m.from !== NETS.hostId) return;
    if (m.t === 'w') clientWorld(m);
    else if (m.t === 'raft') clientRaft(m);
    else if (m.t === 'inv') { for (const k of Object.keys(INV)) delete INV[k]; Object.assign(INV, m.inv); }
    else if (m.t === 're') { for (const [s, c] of m.says || []) emit('say', s, c || undefined); if (m.got && m.got.length) emit('pickup', m.got); }
  }
  // ---- the lobby and the start
  function netStart(cfg, roster) {
    NET.peers.clear();
    if (!MP.online() || roster.length < 2) { NET.on = false; NET.client = false; return; }   // nobody else came: stay on the menu
    NET.on = true; NET.client = !MP.isHost(); NET.out = []; NET.gone.clear(); NETS.hostId = MP.hostId; NETS.full = false; NETS.raftIn = false; NETS.ver = -1; NETS.invJ = ''; NETS.t = 0; NETS.lastW = 0; NETS.needT = -9;
    roster.forEach(p => { if (p.id !== MP.id) NET.peers.set(p.id, { name: p.name, col: p.col, pose: null }); });
    if (NET.client) netJoin(); else netHost(cfg.cont);
  }
  function netLeave(id) {
    if (!NET.on) return;
    if (id === -1 || id === NETS.hostId) { const was = NET.client; netEnd(); if (was) { toMenu(); say('The host left: the raft sails on without you', '#ff9a7a'); } else say('You are offline now: your raft carries on', '#cfd6e2'); return; }
    const p = NET.peers.get(id); NET.peers.delete(id); if (p) say(p.name + ' left the raft', '#cfd6e2');
    if (!NET.client) for (const f of FL) if (f.heldBy === id) { f.hooked = false; f.heldBy = 0; }
  }
  function netEnd() { NET.on = false; NET.client = false; NET.peers.clear(); NET.paddle = [0, 0]; NET.rudder = 0; try { MP.leave(); } catch (e) {} }
  if (typeof MP !== 'undefined') Object.assign(MP.opts, {
    max: 4, min: 2, bots: 0, solo: false, onClose: () => {}, sub: 'Share one raft with up to three friends. Create a room, send them the code, and start when everyone is in.',
    config: () => ({ cont: !!savedRun() }), onStart: netStart, onMsg: netMsg, onLeave: netLeave, onHost: id => { if (NET.on && id === MP.id && NET.client) netLeave(NETS.hostId); },
  });
