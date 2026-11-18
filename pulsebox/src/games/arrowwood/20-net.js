  /* ---------- 20 net: the connection to a room (or the local practice range) and the world as the server describes it ----------
     Two sources can be open at once: the online room and the practice range you warm up on while friends join.
     Lobby news always comes from the room; the world on screen comes from whichever source is playing (CL.src). */
  const INTERP = .1;
  const CL = {
    src: null, conn: null, local: null, me: null, ids: {}, code: '', mode: '1v1', oneShot: false, host: null, phase: 'lobby', phaseEnd: 0, ffaEnd: 0,
    round: 0, score: [0, 0], lobby: [], votes: [], players: new Map(), arrows: new Map(), stuck: new Map(), picks: W.PICKUPS.map(() => true),
    cap: [0, 0], zoneIn: [0, 0], results: null, off: null, feed: [], notes: [], status: '', err: '', lastRound: null, pings: [], cidMap: new Map(),
  };
  const srvNow = () => now() + (CL.off || 0);
  const WORLD = new Set(['s', 'shot', 'stick', 'hit', 'elim', 'gone', 'pick', 'phase', 'round', 'results', 'overtime', 'corr', 'clear', 'respawn', 'ping']);
  function player(id) {
    let p = CL.players.get(id);
    if (!p) { p = { id, name: '', team: 0, slot: 0, bow: 'longbow', buf: [], vis: null, stuckIn: [], deadAt: 0, step: 0, k: 0, d: 0 }; CL.players.set(id, p); emit('playerNew', p); }
    return p;
  }
  function resetWorld() {
    for (const p of CL.players.values()) emit('playerGone', p);
    CL.players.clear(); CL.arrows.forEach(a => emit('arrowGone', a)); CL.arrows.clear(); CL.stuck.forEach(s => emit('stuckGone', s)); CL.stuck.clear();
    CL.picks = W.PICKUPS.map(() => true); CL.cap = [0, 0]; CL.zoneIn = [0, 0]; CL.off = null; CL.cidMap.clear(); emit('worldReset');
  }
  function useSource(src) {
    if (CL.src === src) return; CL.src = src; CL.me = CL.ids[src] || null; resetWorld(); emit('source', src);
  }
  // ---- the local practice range: the server's own engine running in this page
  function startPractice() {
    stopPractice();
    const room = ENG.createRoom({ mode: 'practice', dev: DEV }), j = ENG.join(room, { name: myName(), bow: PROFILE.equipped }, Date.now());
    CL.local = { room, id: j.id, acc: 0, send: m => ENG.message(room, j.id, m, Date.now()) };
    CL.ids.practice = j.id; useSource('practice'); pumpLocal(0);
  }
  function stopPractice() { if (!CL.local) return; CL.local = null; delete CL.ids.practice; if (CL.src === 'practice') useSource(CL.conn && CL.phase !== 'lobby' && CL.phase !== 'results' ? 'online' : null); }
  function pumpLocal(dt) {
    const L = CL.local; if (!L) return;
    L.acc += Math.min(dt, .25);
    while (L.acc >= ENG.TICK) { L.acc -= ENG.TICK; ENG.step(L.room, Date.now()); }
    for (const o of ENG.drain(L.room)) if (o.to === '*' || o.to === L.id) handle(o.m, 'practice');
  }
  // ---- a match against bots: the same engine, run in this page, wired in exactly like an online room
  function startBotMatch(mode, level) {
    stopPractice(); if (CL.conn) leaveRoom();
    const room = ENG.createRoom({ mode, dev: DEV, fast: DEV && QS.has('fast'), offline: true, code: 'BOTS' });
    const c = { code: 'BOTS', local: true, room, acc: 0, state: 'open', tries: 0, level, create: null };
    c.send = m => { if (m.t === 'leave') return; ENG.message(room, c.id, m, Date.now()); };
    c.close = () => { c.state = 'closed'; }; c.fail = msg => { CL.err = msg; emit('ui'); }; c.open = () => {};
    CL.conn = c; CL.code = 'BOTS';
    c.id = ENG.join(room, { name: myName(), bow: PROFILE.equipped }, Date.now()).id;
    ENG.fillBots(room, level); pumpBots(0); c.send({ t: 'start' }); pumpBots(0);
  }
  function pumpBots(dt) {
    const c = CL.conn; if (!c || !c.local) return;
    c.acc += Math.min(dt, .25);
    while (c.acc >= ENG.TICK) { c.acc -= ENG.TICK; ENG.step(c.room, Date.now()); }
    for (const o of ENG.drain(c.room)) if (o.to === '*' || o.to === c.id) handle(o.m, 'online');
  }
  const botRoom = () => !!(CL.conn && CL.conn.local);
  // ---- the online room
  function connect(code, create) {
    if (CL.conn) CL.conn.close(true);
    const tokKey = 'aw-tok-' + code, c = { code, create, ws: null, state: 'connecting', tries: 0, closedByUs: false, token: (() => { try { return sessionStorage.getItem(tokKey) || ''; } catch (e) { return ''; } })() };
    c.send = m => { if (c.ws && c.ws.readyState === 1) c.ws.send(JSON.stringify(m)); };
    c.close = mine => { c.closedByUs = !!mine; try { c.ws && c.ws.close(); } catch (e) {} c.state = 'closed'; };
    c.open = () => {
      let ws; try { ws = new WebSocket(SERVER.ws + '/api/arrowwood/room/' + code); } catch (e) { fail('Could not open a connection to the game server.'); return; }
      c.ws = ws; CL.status = c.tries ? `Reconnecting (try ${c.tries})...` : 'Connecting...'; emit('ui');
      ws.onopen = () => { ws.send(JSON.stringify({ t: 'hello', key: KEY, name: myName(), token: c.token, create: c.create && !c.token ? c.create : undefined })); };
      ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (er) { return; } if (m.t === 'welcome') { c.state = 'open'; c.tries = 0; c.token = m.token; try { sessionStorage.setItem(tokKey, m.token); } catch (er) {} CL.status = ''; } handle(m, 'online'); };
      ws.onclose = () => {
        if (c !== CL.conn || c.closedByUs || c.state === 'closed') return;
        if (c.state === 'open' || c.state === 'lost' || (c.tries && c.tries < 7)) { c.state = 'lost'; c.tries++; if (c.tries > 7) return fail('Lost the connection to the room.'); CL.status = 'Connection lost. Reconnecting...'; emit('ui'); setTimeout(() => { if (c === CL.conn && c.state === 'lost') c.open(); }, Math.min(6000, 600 * c.tries)); return; }
        fail('Could not reach the game server. Check your connection and try again.');
      };
    };
    const fail = msg => { c.state = 'closed'; CL.status = ''; CL.err = msg; emit('connErr', msg); emit('ui'); };
    c.fail = fail; CL.conn = c; CL.code = code; c.open(); return c;
  }
  function leaveRoom() { if (CL.conn) { try { CL.conn.send({ t: 'leave' }); } catch (e) {} CL.conn.close(true); CL.conn = null; } try { sessionStorage.removeItem('aw-tok-' + CL.code); } catch (e) {} delete CL.ids.online; CL.lobby = []; CL.phase = 'lobby'; CL.results = null; if (CL.src === 'online') useSource(null); emit('ui'); }
  const send = m => { if (CL.src === 'practice' && CL.local) CL.local.send(m); else if (CL.src === 'online' && CL.conn) CL.conn.send(m); };
  const sendRoom = m => CL.conn && CL.conn.send(m);
  const newCode = () => { let s = ''; for (let i = 0; i < 4; i++) s += 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]; return s; };

  // ---- everything the server says
  function handle(m, src) {
    if (src === 'online') {
      switch (m.t) {
        case 'welcome': CL.ids.online = m.id; CL.code = m.code; CL.mode = m.mode; CL.oneShot = m.oneShot; CL.err = '';
          if (m.phase !== 'lobby' && m.phase !== 'results') { stopPractice(); useSource('online'); CL.me = m.id; m.stuck.forEach(s => addStuck(s)); m.picks.forEach(i => CL.picks[i] = false); }
          if (CL.src === 'online') CL.me = m.id; emit('joined', m); if (m.results) { CL.results = m.results; CL.phase = 'results'; CL.roomPhase = 'results'; emit('results', m.results); } emit('ui'); return;
        case 'err': if (m.code === 'taken' && CL.conn && CL.conn.create) { const cr = CL.conn.create; connect(newCode(), cr); return; }
          if (m.code === 'nocode' && CL.conn && CL.conn.makeOnMiss) { connect(CL.conn.code, { mode: '1v1' }); return; }   // the hub made this code for us: open the room
          if (CL.conn && !CL.ids.online) CL.conn.fail(m.msg); else { CL.err = m.msg; emit('toast', m.msg); } emit('ui'); return;
        case 'lobby': Object.assign(CL, { mode: m.mode, oneShot: m.oneShot, host: m.host, lobby: m.players, votes: m.votes, code: m.code });
          for (const q of m.players) { const p = CL.src === 'online' ? CL.players.get(q.id) : null; if (p) Object.assign(p, { name: q.name, team: q.team, bow: q.bow, on: q.on }); }
          CL.lobby.forEach((q, i) => q.slot = i); CL.roomPhase = m.phase; if (m.phase === 'lobby' && CL.src === 'online') { CL.phase = 'lobby'; CL.results = null; useSource(null); }
          emit('ui'); return;
        case 'note': CL.notes.push({ text: m.text, t: now() }); if (CL.notes.length > 5) CL.notes.shift(); return;
        case 'phase': if (m.ph === 'intro' && CL.src !== 'online') { stopPractice(); useSource('online'); } break;
      }
      if (WORLD.has(m.t) && CL.src !== 'online') { if (m.t === 'results') { CL.results = m; CL.phase = 'results'; emit('results', m); } return; }
    } else if (src === 'practice') { if (m.t === 'welcome') { CL.ids.practice = m.id; if (CL.src === 'practice') CL.me = m.id; return; } if (CL.src !== 'practice') return; }
    switch (m.t) {
      case 's': {
        const sample = m.tm - now(); if (CL.off == null || sample > CL.off) CL.off = sample; else CL.off = CL.off * .98 + sample * .02;
        CL.phase = m.ph; CL.phaseEnd = m.end; if (m.cap) { CL.cap = m.cap; CL.zoneIn = m.in; }
        for (const e of m.pl) {
          const [id, x, y, z, yaw, pitch, f, hp, arrows, draw, k, d] = e, p = player(id);
          const wasDead = p.alive === false; p.k = k; p.d = d; p.hp = hp; p.arrows = arrows; p.alive = !!(f & 1); p.on = !!(f & 16);
          if (wasDead && p.alive) { p.buf.length = 0; emit('unstickAll', p); }   // back in (a respawn or a new round): clear the finisher pose and the arrows in them
          const lb = CL.src === 'online' ? CL.lobby.find(q => q.id === id) : null; if (lb) { p.name = lb.name; p.team = lb.team; p.bow = lb.bow; p.slot = lb.slot; }
          else if (CL.src === 'practice' && id !== CL.me) { p.name = 'Straw dummy'; p.team = 1; p.dummy = true; } else if (id === CL.me && !p.name) { p.name = myName(); p.team = 0; p.bow = PROFILE.equipped; }
          p.buf.push([m.tm, x, y, z, yaw, pitch, f, draw]); if (p.buf.length > 40) p.buf.shift();
          if (id === CL.me) emit('meSnap', p, e);
        }
        return;
      }
      case 'shot': {
        const local = m.by === CL.me ? CL.cidMap.get(m.cid) : null;
        if (local) { local.id = m.id; CL.arrows.delete(local.tmpId); CL.arrows.set(m.id, local); local.srv = m; return; }
        const a = { id: m.id, by: m.by, o: m.o, v: m.v, tm: m.tm, local: false, pw: m.pw, end: null };
        CL.arrows.set(m.id, a); emit('arrowNew', a); return;
      }
      case 'stick': { const a = CL.arrows.get(m.id); if (a) a.end = { kind: 'stick', m }; else addStuck(m); emit('impactSoon', m); return; }
      case 'hit': {
        const a = CL.arrows.get(m.id); if (a) a.end = { kind: 'hit', m }; else emit('bodyHit', m);
        emit('hitInfo', m); return;
      }
      case 'elim': emit('elim', m); CL.feed.push({ k: m.kn, v: m.vn, kid: m.k, vid: m.v, bow: m.bow, zone: m.zone, t: now() }); if (CL.feed.length > 5) CL.feed.shift(); return;
      case 'gone': { const s = CL.stuck.get(m.id); if (s) { CL.stuck.delete(m.id); emit('stuckGone', s); } if (m.by === CL.me) emit('recovered'); return; }
      case 'pick': CL.picks[m.i] = !!m.on; if (!m.on && m.by === CL.me) emit('picked'); return;
      case 'phase': {
        const was = CL.phase; Object.assign(CL, { phase: m.ph, phaseEnd: m.end, round: m.round, score: m.score, ffaEnd: m.ffaEnd });
        if (m.mode) CL.mode = m.mode;
        if (m.ph === 'intro') { CL.results = null; emit('roundStart', m); }
        if (m.ph === 'live' && was === 'intro') emit('go');
        emit('ui'); return;
      }
      case 'round': CL.score = m.score; CL.lastRound = { ...m, at: now() }; emit('roundEnd', m); return;
      case 'overtime': emit('overtime', m); return;
      case 'results': CL.results = m; CL.phase = 'results'; emit('results', m); emit('ui'); return;
      case 'corr': emit('corr', m); return;
      case 'nodraw': if (ME.drawing) { ME.drawing = false; ME.drawT = 0; } return;   // the server said no (out of arrows, still nocking): lower the bow
      case 'nofire': { const a = CL.cidMap.get(m.cid); if (a) { CL.arrows.delete(a.tmpId); CL.arrows.delete(a.id); emit('arrowGone', a); } if (CL.src !== 'practice') ME.arrows = m.arrows; return; }
      case 'clear': CL.arrows.forEach(a => emit('arrowGone', a)); CL.arrows.clear(); CL.stuck.forEach(s => emit('stuckGone', s)); CL.stuck.clear(); CL.picks = W.PICKUPS.map(() => true); CL.cap = [0, 0];
        for (const p of CL.players.values()) { p.deadAt = 0; emit('unstickAll', p); } return;
      case 'respawn': { const p = CL.players.get(m.id); if (p) { p.deadAt = 0; emit('unstickAll', p); } return; }
      case 'ping': CL.pings.push({ ...m, t: now() }); if (CL.pings.length > 4) CL.pings.shift(); emit('ping', m); return;
    }
  }
  function addStuck(m) { if (CL.stuck.has(m.id)) return; const s = { ...m }; CL.stuck.set(m.id, s); emit('stuckNew', s); return s; }
  // where a remote player is now (INTERP seconds behind the server, smoothly between snapshots)
  function sampleP(p, rt) {
    const b = p.buf; if (!b.length) return null;
    let i = b.length - 1; while (i > 0 && b[i - 1][0] > rt) i--;
    const B = b[i], A = b[Math.max(0, i - 1)];
    if (!A || A === B || rt >= B[0]) return { x: B[1], y: B[2], z: B[3], yaw: B[4], pitch: B[5], f: B[6], draw: B[7] };
    const t = cl((rt - A[0]) / Math.max(1e-3, B[0] - A[0]), 0, 1);
    return { x: lp(A[1], B[1], t), y: lp(A[2], B[2], t), z: lp(A[3], B[3], t), yaw: A[4] + angD(B[4], A[4]) * t, pitch: lp(A[5], B[5], t), f: t < .5 ? A[6] : B[6], draw: lp(A[7], B[7], t) };
  }
  const meP = () => CL.me ? CL.players.get(CL.me) : null;
  const teamOfP = p => CL.mode === 'ffa' && CL.src === 'online' ? 'p' + p.id : p.team;
  const isFoe = p => CL.src === 'practice' ? !!p.dummy : CL.mode === 'ffa' ? p.id !== CL.me : (meP() ? p.team !== meP().team : true);
  const live = () => CL.phase === 'live' || CL.phase === 'overtime';
