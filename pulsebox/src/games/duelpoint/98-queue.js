  /* ---------- 98 queue: find a match against anyone, 1v1 or 2v2 ----------
     Everyone looking for a game of one size waits together in a queue room on the room relay (Q1V0 for 1v1, Q2V0 for
     2v2; when one is full, Q1V1, Q1V2 ... take the overflow). Each says who they are ('qhi': rating, a token, how long
     they have waited). The queue room's host (whoever has been in it longest) does the matching once a second: the
     player who has waited longest is paired with the nearest ratings inside a window that widens the longer they wait
     (anyone at all after 25 s). It picks a fresh party room code and the teams (2v2: best and worst against the middle
     two) and tells the room ('qmatch'). The chosen leave the queue and walk into that party room; its host, once the
     whole group is in (matched up by token), sets the teams and starts the match. Anyone who has not arrived after 15 s
     is replaced by a bot. A queued match is unrated. */
  const QV = 1, QW = /^https?:/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname) ? location.host : 'box.pulseform.org';
  const QUE = { mode: 0, ws: null, me: 0, host: 0, peers: new Map(), t0: 0, shard: 0, tok: '', found: null, err: '', mT: 0 };
  function queueStart(mode, shard = 0) {   // (shard: the tests queue apart from real players)
    queueStop(); QUE.found = null; if (MP.online()) MP.leave();
    QUE.mode = mode; QUE.t0 = performance.now(); QUE.shard = shard; QUE.base = shard; QUE.err = ''; QUE.tok = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6); qConnect();
  }
  function queueStop() { const w = QUE.ws; QUE.ws = null; QUE.mode = 0; QUE.me = 0; QUE.host = 0; QUE.peers.clear(); QUE.err = ''; if (w) try { w.close(); } catch (e) {} }
  const qSend = m => { if (QUE.ws && QUE.ws.readyState === 1) QUE.ws.send(JSON.stringify(m)); };
  const qHi = () => ({ t: 'qhi', v: QV, rt: STATS.rating | 0, tok: QUE.tok, nm: MP.name, w: Math.round((performance.now() - QUE.t0) / 1000) });
  function qConnect() {
    const code = 'Q' + QUE.mode + 'V' + (QUE.shard < 10 ? QUE.shard : String.fromCharCode(55 + QUE.shard)); let ws;
    try { ws = new WebSocket(`wss://${QW}/api/room/${code}?n=${encodeURIComponent(MP.name)}&g=duelpoint`); } catch (e) { QUE.err = 'Could not reach the queue.'; return; }
    QUE.ws = ws; QUE.me = 0;
    ws.onmessage = e => { if (QUE.ws !== ws) return; let m; try { m = JSON.parse(e.data); } catch (er) { return; } qMsg(m); };
    ws.onclose = () => { if (QUE.ws !== ws) return; QUE.ws = null; QUE.me = 0; QUE.peers.clear();
      if (QUE.mode && !QUE.found) { QUE.err = 'Lost the queue: getting back in...'; setTimeout(() => { if (QUE.mode && !QUE.ws && !QUE.found) qConnect(); }, 1500); } };
  }
  function qMsg(m) {
    if (m.t === 'full') { QUE.ws = null; if (QUE.shard < (QUE.base || 0) + 9) { QUE.shard++; qConnect(); } else QUE.err = 'Every queue is full: try again in a moment.'; return; }
    if (m.t === 'hello') { QUE.me = m.id; QUE.host = m.host; QUE.err = ''; qSend(qHi()); return; }
    if (m.t === 'join') { qSend(Object.assign(qHi(), { to: m.id })); return; }   // tell a newcomer who we are
    if (m.t === 'leave') { QUE.peers.delete(m.id); return; }
    if (m.t === 'host') { QUE.host = m.id; return; }
    if (m.t === 'qhi' && m.v === QV && m.from) { const p = QUE.peers.get(m.from); QUE.peers.set(m.from, { rt: cl(m.rt | 0, 0, 5000), tok: String(m.tok || '').slice(0, 16), since: p ? p.since : performance.now() - cl(m.w | 0, 0, 600) * 1000 }); return; }
    if (m.t === 'qmatch' && Array.isArray(m.toks) && typeof m.code === 'string' && /^[A-Z0-9]{4}$/.test(m.code)) {
      if (m.toks.includes(QUE.tok)) qFound(m); else for (const t2 of m.toks) for (const [id, p] of QUE.peers) if (p.tok === t2) QUE.peers.delete(id);   // they are spoken for
    }
  }
  // the queue host's matching, once a second
  function qMatch() {
    const need = QUE.mode * 2, now = performance.now(), all = [{ id: QUE.me, rt: STATS.rating | 0, tok: QUE.tok, since: QUE.t0 }].concat([...QUE.peers].filter(([, p]) => p.tok).map(([id, p]) => Object.assign({ id }, p))).sort((a, b) => a.since - b.since);
    if (all.length < need) return;
    for (const A of all) {
      const wait = (now - A.since) / 1000, win = wait > 25 ? 1e9 : 150 + wait * 30;
      const near = all.filter(q => q !== A && Math.abs(q.rt - A.rt) <= win).sort((a, b) => Math.abs(a.rt - A.rt) - Math.abs(b.rt - A.rt)).slice(0, need - 1);
      if (near.length < need - 1) continue;
      const grp = [A, ...near], toks = grp.map(q => q.tok), teams = {};
      if (need === 2) { teams[grp[0].tok] = 0; teams[grp[1].tok] = 1; } else { const s = grp.slice().sort((a, b) => b.rt - a.rt); [s[0], s[3]].forEach(q => { teams[q.tok] = 0; }); [s[1], s[2]].forEach(q => { teams[q.tok] = 1; }); }
      const L = 'ABCDEFGHJKLMNPRSTUVWXYZ', code = Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join('');
      const m = { t: 'qmatch', code, toks, teams, mode: QUE.mode, lead: grp[0].tok };
      qSend(m); if (toks.includes(QUE.tok)) qFound(m); else for (const q of grp) QUE.peers.delete(q.id);
      return;
    }
  }
  function qFound(m) {
    QUE.found = { code: m.code, toks: m.toks.slice(0, 4), teams: Object.assign({}, m.teams), mode: m.mode === 2 ? 2 : 1, at: performance.now(), lead: m.lead === QUE.tok, started: false };
    const w = QUE.ws; QUE.ws = null; QUE.mode = 0; QUE.peers.clear(); setTimeout(() => { if (w) try { w.close(); } catch (e) {} }, 400);   // (a moment, so the news gets out first)
    emit('qfound'); openParty(); PARTY.status = 'Match found: joining...';
    setTimeout(() => { if (QUE.found && !MP.online()) MP.join(QUE.found.code); }, QUE.found.lead ? 0 : 900);   // the first of the group opens the room
  }
  // every frame, whatever screen you are on
  function queueTick() {
    if (QUE.mode) {
      if (screen === 'play') { queueStop(); return; }   // you started something else
      if (QUE.ws && QUE.me && QUE.host === QUE.me && performance.now() >= QUE.mT) { QUE.mT = performance.now() + 1000; qMatch(); }
    }
    const F = QUE.found; if (!F) return;
    if (screen === 'play' && M && M.online) { QUE.found = null; return; }   // the match is on
    const age = performance.now() - F.at;
    if (!MP.online()) { if (age > 20000) { QUE.found = null; PARTY.status = 'That match fell through: find another'; } return; }
    PARTY.ready = true;
    if (!MP.isHost() || F.started) return;
    const ps = MP.players(), S2 = PARTY.set, T2 = {};
    Object.assign(S2, { size: F.mode, sites: F.mode === 1 ? 1 : 2, fill: true, ranked: false });
    const tokOf = p => p.id === myId() ? QUE.tok : (PARTY.prof.get(p.id) || {}).qt;
    for (const p of ps) { const t = F.teams[tokOf(p)]; if (t === 0 || t === 1) T2[p.id] = t; }
    for (const p of ps) if (T2[p.id] == null) { const n0 = ps.filter(q => T2[q.id] === 0).length; T2[p.id] = n0 < F.mode ? 0 : 1; }
    PARTY.teams = T2;
    const allIn = F.toks.every(tok => ps.some(p => tokOf(p) === tok));
    if ((allIn && age > 1500) || age > 15000) { F.started = true; MP.send({ t: 'lteam', teams: T2, set: S2 }); CFG.sites = S2.sites; setTimeout(() => { if (MP.online() && MP.isHost() && screen === 'party') MP.start(); }, 500); }
  }
  // the card on the play page: two buttons, or the search going on
  function drawQueueCard(g, rx, ry, rw, u) {
    const h = 96 * u, on = !!QUE.mode; rr(g, rx, ry, rw, h, 10, 'rgba(14,18,26,.94)', on ? GOLD : 'rgba(239,233,220,.14)', on ? 2 : 1.5);
    tx(g, 'FIND A MATCH', rx + 16 * u, ry + 22 * u, 12 * u, GOLD, 'left', 900); tx(g, 'anyone, anywhere · unrated', rx + rw - 16 * u, ry + 22 * u, 10 * u, '#aeb6c2', 'right', 700);
    if (on) {
      const s = Math.floor((performance.now() - QUE.t0) / 1000), dots = '.'.repeat(1 + Math.floor(performance.now() / 400) % 3);
      tx(g, `SEARCHING ${QUE.mode}V${QUE.mode}  ·  ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, rx + 16 * u, ry + 50 * u, 16 * u, BONE, 'left', 900);
      tx(g, QUE.err || (QUE.ws && QUE.me ? `${QUE.peers.size + 1} looking for a ${QUE.mode}v${QUE.mode}${dots}` : 'Joining the queue' + dots), rx + 16 * u, ry + 74 * u, 11 * u, QUE.err ? WARN : '#aeb6c2', 'left', 700);
      btn(g, rx + rw - 112 * u, ry + 40 * u, 96 * u, 40 * u, 'CANCEL', () => queueStop(), { px: 14 * u });
    } else {
      const bw = (rw - 42 * u) / 2;
      btn(g, rx + 16 * u, ry + 36 * u, bw, 48 * u, '1V1', () => queueStart(1), { on: true, fill: GOLD, solid: true, col: INK, px: 20 * u, sub: 'DUEL · ONE SITE' });
      btn(g, rx + 26 * u + bw, ry + 36 * u, bw, 48 * u, '2V2', () => queueStart(2), { on: true, fill: GOLD, solid: true, col: INK, px: 20 * u, sub: 'TEAMS · TWO SITES' });
    }
    return h;
  }
  // the same, squeezed into half of the friends card on a short screen
  function drawQueueMini(g, x, y, w, h, u) {
    if (QUE.mode) { const s = Math.floor((performance.now() - QUE.t0) / 1000); btn(g, x, y, w, h, 'CANCEL', () => queueStop(), { px: 13 * u, sub: QUE.err ? 'GETTING BACK IN' : `SEARCHING ${QUE.mode}V${QUE.mode} · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }); return; }
    const bw = (w - 8 * u) / 2;
    btn(g, x, y, bw, h, '1V1', () => queueStart(1), { on: true, fill: GOLD, solid: true, col: INK, px: 15 * u });
    btn(g, x + bw + 8 * u, y, bw, h, '2V2', () => queueStart(2), { on: true, fill: GOLD, solid: true, col: INK, px: 15 * u });
  }
