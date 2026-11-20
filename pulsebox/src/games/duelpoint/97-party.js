  /* ---------- 97 party: play with friends ----------
     Make a party (or join one with its 4-letter code or an invite link), see who is in on two team columns with their
     operative, rank and rating, and get ready. While you wait you can change operative or skins. The host sets the
     mode (one site or two), the team size, whether bots fill empty seats and how good they are, moves players between
     teams, and starts once everyone is ready. Lobby messages ride the room relay: 'lprof' (my operative, rating, ready),
     'lteam' (the host's teams and settings), 'lswap' (please move me). */
  const PARTY = { prof: new Map(), teams: {}, set: { sites: 2, size: 2, fill: true, win: 5, ranked: false }, status: '', ready: false, sent: '', joinOpen: false };
  const myId = () => MP.id;
  function openParty() { screen = 'party'; UI.armory = false; UI.panel = 'home'; releaseMouse(); MP.show(); PARTY.status = ''; }
  function partyProfile() { return { op: CFG.op, rt: STATS.rating, rd: PARTY.ready || MP.isHost(), rk: rankStrengths(), rkp: RQ.map(k => placed(rankedOf(+k)) ? 1 : 0).join('') }; }
  function sendProfile(force) { if (!MP.online()) return; const p = partyProfile(), key = JSON.stringify(p); if (!force && key === PARTY.sent) return; PARTY.sent = key; PARTY.prof.set(myId(), p); MP.send(Object.assign({ t: 'lprof' }, p)); }
  // the host keeps everyone on a team: newcomers go to the shorter side, and nobody stays on a team that has no room
  function hostTeams() {
    if (!MP.online() || !MP.isHost()) return; const ps = MP.players(), T2 = PARTY.teams;
    if (ps.length > 2 * PARTY.set.size) PARTY.set.size = teamSize(Math.ceil(ps.length / 2));   // more people than seats: the teams grow (up to 4v4)
    const size = PARTY.set.size;
    for (const id of Object.keys(T2)) if (!ps.some(p => String(p.id) === id)) delete T2[id];
    for (const p of ps) if (T2[p.id] == null) { const n0 = ps.filter(q => T2[q.id] === 0).length, n1 = ps.filter(q => T2[q.id] === 1).length; T2[p.id] = n0 <= n1 && n0 < size ? 0 : n1 < size ? 1 : 0; }
    for (const t of [0, 1]) { const on = ps.filter(q => T2[q.id] === t); while (on.length > size) { const q = on.pop(); T2[q.id] = 1 - t; } }
    MP.send({ t: 'lteam', teams: T2, set: PARTY.set });
  }
  MP.opts.custom = true;
  { const netOn = MP.opts.onMsg; MP.opts.onMsg = m => { if (!partyMsg(m)) netOn(m); }; }
  on('over', () => { if (M && M.online) PARTY.ready = false; });
  MP.opts.onRoster = () => { if (!MP.online()) { PARTY.prof.clear(); PARTY.teams = {}; PARTY.ready = false; PARTY.sent = ''; return; } sendProfile(true); hostTeams(); };
  MP.opts.onStatus = s => { PARTY.status = s; };
  // lobby messages; anything else is the match's
  function partyMsg(m) {
    if (m.t === 'lprof') { const rk = {}; if (m.rk && typeof m.rk === 'object') for (const k of RQ) rk[k] = cl(+m.rk[k] || 0, 0, 4000); PARTY.prof.set(m.from, { op: OPS[m.op] ? m.op : 'vex', rt: m.rt | 0, rd: !!m.rd, rk, rkp: typeof m.rkp === 'string' ? m.rkp.slice(0, 4) : '' }); return true; }
    if (m.t === 'lteam') { if (m.from === MP.hostId) { PARTY.teams = m.teams || {}; PARTY.set = Object.assign(PARTY.set, m.set || {}); } return true; }
    if (m.t === 'lswap') { if (MP.isHost()) { swapTeam(m.from); } return true; }
    if (m.t === 'mp-rejoin' && MP.isHost() && PARTY.teams[m.old] != null) { PARTY.teams[m.from] = PARTY.teams[m.old]; delete PARTY.teams[m.old]; const pf = PARTY.prof.get(m.old); if (pf) PARTY.prof.set(m.from, pf); MP.send({ t: 'lteam', teams: PARTY.teams, set: PARTY.set }); }   // back after a drop: same team (the match hears it too)
    return false;
  }
  // the operatives your teammates in the party have: agent select shows them as taken. Two on a team who still end up
  // on the same one (picked at the same moment, or a move between teams) are sorted out at the start: the first in the
  // room keeps it, the other gets one nobody on their team has (60-net seatsFor), and their card says so meanwhile
  function partyTaken() { if (!MP.online()) return []; const me2 = myId(), t = PARTY.teams[me2] || 0; return MP.players().filter(p => p.id !== me2 && (PARTY.teams[p.id] || 0) === t).map(p => (PARTY.prof.get(p.id) || {}).op).filter(Boolean); }
  const opOf = p => p.id === myId() ? CFG.op : (PARTY.prof.get(p.id) || { op: 'vex' }).op;
  const opClash = (p, ps) => { const t = PARTY.teams[p.id] || 0, op = opOf(p); return ps.slice(0, ps.indexOf(p)).some(q => (PARTY.teams[q.id] || 0) === t && opOf(q) === op); };
  function swapTeam(id) { const ps = MP.players(), T2 = PARTY.teams, to = 1 - (T2[id] || 0); if (ps.filter(q => T2[q.id] === to).length >= PARTY.set.size) return; T2[id] = to; MP.send({ t: 'lteam', teams: T2, set: PARTY.set }); }
  const readyAll = () => MP.players().every(p => p.id === MP.hostId || (PARTY.prof.get(p.id) || {}).rd);
  function startParty() {
    if (!MP.isHost() || !readyAll()) return; const ps = MP.players();
    if (!ps.some(p => PARTY.teams[p.id] === 0) || (!PARTY.set.fill && !ps.some(p => PARTY.teams[p.id] === 1))) { PARTY.status = PARTY.set.fill ? '' : 'Each team needs someone, or let bots fill the seats'; if (!PARTY.set.fill) return; }
    CFG.sites = PARTY.set.sites; MP.start();
  }
  // the room tells the match who is where: teams, operatives and ratings from the lobby
  MP.opts.max = 8; MP.opts.min = 1;   // up to eight people: 4v4
  const baseConfig = MP.opts.config;
  MP.opts.config = () => { const c = baseConfig(); c.map = pick(mapPool(PARTY.set.sites)); c.sites = PARTY.set.sites; c.teams = Object.assign({}, PARTY.teams); c.size = PARTY.set.size; c.fill = PARTY.set.fill; c.win = PARTY.set.ranked ? 5 : winOf(PARTY.set.win); c.ranked = !!PARTY.set.ranked;
    c.rks = {}; c.rkps = {}; for (const [id, p] of PARTY.prof) { c.rks[id] = (p.rk || {})[String(PARTY.set.size)] || 0; c.rkps[id] = (p.rkp || '')[PARTY.set.size - 1] === '1' ? 1 : 0; } c.rks[myId()] = Math.round(rankStrength(PARTY.set.size)); c.rkps[myId()] = placed(rankedOf(PARTY.set.size)) ? 1 : 0;
    if (c.ranked) { const v = Object.values(c.rks); c.botDiff = botLevelFor(v.reduce((s, x) => s + x, 0) / Math.max(1, v.length)); }
    c.hops = {}; c.rts = {}; for (const [id, p] of PARTY.prof) { c.hops[id] = p.op; c.rts[id] = p.rt; } c.hops[myId()] = CFG.op; c.rts[myId()] = STATS.rating; return c; };

  // a text box for your name and a room code, laid over the canvas where the party screen asks for it
  let domIn = null;
  // the code box
  function joinOrKey(v) {
    if (RK.includes(rk(v))) { PARTY.status = unlockAllSkins(); if (domIn && domIn.code) domIn.code.value = ''; click(); return; }
    MP.join(v);
  }
  function textBox(id, x, y, w, h, ph, max, val, onEnter) {
    if (!domIn) { domIn = {}; const st = document.createElement('style'); st.textContent = '.dp-in{position:fixed;z-index:5;background:rgba(10,13,18,.92);border:1px solid rgba(239,233,220,.3);border-radius:8px;color:#efe9dc;font:800 18px "Chakra Petch",sans-serif;text-align:center;letter-spacing:.06em;outline:none;padding:0 10px}.dp-in:focus{border-color:#35e0c8}'; document.head.appendChild(st); }
    let el = domIn[id]; if (!el) { el = domIn[id] = document.createElement('input'); el.className = 'dp-in'; el.maxLength = max; el.placeholder = ph; el.value = val || ''; el.autocomplete = 'off'; el.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') onEnter(el.value); if (e.key === 'Escape') el.blur(); }; document.body.appendChild(el); }
    const V = K.view, sx = innerWidth / (V.x1 - V.x0), sy = innerHeight / (V.y1 - V.y0); el.style.left = (x - V.x0) * sx + 'px'; el.style.top = (y - V.y0) * sy + 'px'; el.style.width = w * sx + 'px'; el.style.height = h * sy + 'px'; el.style.fontSize = Math.round(h * sy * .45) + 'px'; el.hidden = false; el.dataset.seen = '1'; return el;
  }
  function hideBoxes() { if (domIn) for (const el of Object.values(domIn)) { if (!el.dataset.seen) el.hidden = true; delete el.dataset.seen; } }
  function drawParty(g) {
    const V = K.view, u = uiScale(), W = V.x1 - V.x0, H = V.y1 - V.y0, on = MP.online(), x0 = V.x0 + 60 / pxPer() + 20 * u;
    g.fillStyle = 'rgba(8,10,14,.8)'; g.fillRect(V.x0, V.y0, W, H);
    tx(g, 'PLAY WITH FRIENDS', x0, V.y0 + 46 * u, 34 * u, BONE, 'left', 900); btn(g, V.x1 - 130 * u, V.y0 + 28 * u, 110 * u, 36 * u, on ? 'LEAVE' : 'BACK', () => { if (on) MP.leave(); PARTY.status = ''; if (!on) { screen = 'menu'; UI.panel = 'home'; } MP.opts.onRoster(); }, { px: 13 * u });
    if (!on) {   // make a party or join one
      tx(g, 'YOUR NAME', 640, V.y0 + 150 * u, 12 * u, DIM, 'center', 900); const nm = textBox('name', 640 - 160 * u, V.y0 + 164 * u, 320 * u, 44 * u, 'Your name', 12, MP.name === 'You' ? '' : MP.name, v => MP.setName(v));
      const cw = 300 * u, ch = 190 * u, cy = V.y0 + 250 * u;
      { const x = 640 - cw - 12 * u, hot = zone(x, cy, cw, ch, () => { MP.setName(nm.value); MP.create(); }); rr(g, x, cy, cw, ch, 10, hot ? 'rgba(53,224,200,.16)' : 'rgba(20,26,36,.92)', hot ? YOU : 'rgba(239,233,220,.2)', 2); g.fillStyle = YOU; g.fillRect(x, cy, cw, 5 * u);
        tx(g, 'CREATE A PARTY', x + cw / 2, cy + 70 * u, 24 * u, BONE, 'center', 900); para(g, 'You get a code to send. Up to eight of you, bots fill any gap.', x + 24 * u, cy + 112 * u, cw - 48 * u, 13 * u, '#c9cfd8'); }
      { const x = 640 + 12 * u; rr(g, x, cy, cw, ch, 10, 'rgba(20,26,36,.92)', 'rgba(239,233,220,.2)', 2); g.fillStyle = FOE; g.fillRect(x, cy, cw, 5 * u); tx(g, 'JOIN WITH A CODE', x + cw / 2, cy + 50 * u, 24 * u, BONE, 'center', 900);
        const cd = textBox('code', x + 40 * u, cy + 80 * u, cw - 80 * u, 46 * u, 'CODE', 4, '', v => { MP.setName(nm.value); joinOrKey(v); });
        btn(g, x + 40 * u, cy + 136 * u, cw - 80 * u, 40 * u, 'JOIN', () => { MP.setName(nm.value); joinOrKey(cd.value); }, { on: true, fill: FOE, solid: true, col: INK, px: 16 * u }); }
      if (PARTY.status) tx(g, PARTY.status, 640, cy + ch + 40 * u, 15 * u, PARTY.status.startsWith('Connect') ? DIM : PARTY.status.startsWith('Code accepted') ? GOLD : WARN, 'center', 800);
      hideBoxes(); return;
    }
    hideBoxes(); sendProfile(false);
    const ps = MP.players(), host = MP.isHost(), S2 = PARTY.set, me2 = myId();
    // the code and an invite link
    { const cx = x0 + 380 * u, cy = V.y0 + 46 * u; rr(g, cx, cy - 20 * u, 200 * u, 40 * u, 6, 'rgba(255,255,255,.06)', 'rgba(239,233,220,.25)', 1); tx(g, 'CODE', cx + 14 * u, cy, 11 * u, DIM, 'left', 900); tx(g, MP.code, cx + 186 * u, cy, 22 * u, GOLD, 'right', 900);
      btn(g, cx + 212 * u, cy - 20 * u, 150 * u, 40 * u, PARTY.copied && performance.now() - PARTY.copied < 1500 ? 'COPIED' : 'COPY INVITE', () => { const link = location.origin + location.pathname + '?room=' + MP.code; try { navigator.clipboard.writeText(link); } catch (e) {} PARTY.copied = performance.now(); }, { px: 12 * u });
      const qx = cx + 374 * u, qw = Math.min(250 * u, V.x1 - 140 * u - qx);
      if (host && qw > 120 * u) choice(g, qx, cy - 20 * u, qw, 40 * u, [[false, 'UNRATED'], [true, 'RANKED']], !!S2.ranked, v => { S2.ranked = v; MP.send({ t: 'lteam', teams: PARTY.teams, set: S2 }); hostTeams(); });
      else if (qw > 80 * u) { rr(g, qx, cy - 20 * u, qw, 40 * u, 6, S2.ranked ? 'rgba(255,214,102,.14)' : 'rgba(255,255,255,.05)', S2.ranked ? GOLD : 'rgba(239,233,220,.2)', 1); tx(g, S2.ranked ? 'RANKED  ·  ' + vsLabel(S2.size) : 'UNRATED', qx + qw / 2, cy, 13 * u, S2.ranked ? GOLD : DIM, 'center', 900); } }
    // two teams
    // the cards shrink to fit four seats a side above the buttons (k scales what is inside them)
    const colW = 380 * u, gap = 60 * u, top = V.y0 + 120 * u, cardH = Math.min(92 * u, (V.y1 - 190 * u - top) / Math.max(1, S2.size) - 10 * u), k = cardH / (92 * u);
    [0, 1].forEach(t => {
      const cx = t ? 640 + gap / 2 : 640 - gap / 2 - colW, col = t ? FOE : YOU, mates = ps.filter(p => (PARTY.teams[p.id] || 0) === t);
      tx(g, t ? 'TEAM B' : 'TEAM A', cx, top - 14 * u, 15 * u, col, 'left', 900); tx(g, `${mates.length} / ${S2.size}`, cx + colW, top - 14 * u, 12 * u, DIM, 'right', 800);
      for (let i = 0; i < S2.size; i++) {
        const p = mates[i], y = top + i * (cardH + 10 * u);
        if (!p) { rr(g, cx, y, colW, cardH, 8, 'rgba(12,16,22,.6)', 'rgba(239,233,220,.1)', 1); tx(g, S2.fill ? 'BOT' : 'OPEN', cx + colW / 2, y + cardH / 2, 15 * u, DIM, 'center', 900); continue; }
        const pr = p.id === me2 ? partyProfile() : PARTY.prof.get(p.id) || { op: 'vex', rt: 0, rd: false }, isHost = p.id === MP.hostId, ready = isHost || pr.rd;
        const hot = host && zone(cx, y, colW, cardH, () => swapTeam(p.id));
        rr(g, cx, y, colW, cardH, 8, p.id === me2 ? 'rgba(24,30,42,.96)' : 'rgba(14,18,26,.92)', hot ? col : p.id === me2 ? 'rgba(239,233,220,.45)' : 'rgba(239,233,220,.14)', p.id === me2 || hot ? 2 : 1); g.fillStyle = col; g.fillRect(cx, y, 4 * u, cardH);
        portraitTile(g, pr.op, cx + 10 * u, y + 8 * u, cardH - 16 * u, cardH - 16 * u, { r: 5 });
        const nx = cx + cardH + 4 * u; tx(g, p.name.toUpperCase() + (p.id === me2 ? '  (YOU)' : ''), nx, y + 26 * u * k, 16 * u * Math.max(.85, k), BONE, 'left', 900); { const clash = opClash(p, ps); tx(g, (OPS[pr.op] || OPS.vex).n + (clash ? (p.id === me2 ? '  ·  TAKEN, PICK ANOTHER' : '  ·  TAKEN') : ''), nx, y + 48 * u * k, 12 * u, clash ? WARN : (OPS[pr.op] || OPS.vex).col, 'left', 800); }
        if (isHost) tx(g, 'HOST', nx, y + 70 * u * k, 10 * u, GOLD, 'left', 900);
        { const mine = p.id === me2, rv = mine ? rankedOf(S2.size).rv : (pr.rk || {})[String(S2.size)] || 0, on = mine ? placed(rankedOf(S2.size)) : (pr.rkp || '')[S2.size - 1] === '1';   // the rank at this team size
          tierBadge(g, cx + colW - 30 * u, y + 30 * u * k, 13 * u * Math.max(.8, k), rv, on); tx(g, on ? rankLabel(rv).toUpperCase() : 'UNRANKED', cx + colW - 52 * u, y + 26 * u * k, 11 * u, on ? rankOf(rv).T.col : DIM, 'right', 800); tx(g, vsLabel(S2.size) + (on ? '  ' + rankOf(rv).rp + ' RP' : ''), cx + colW - 52 * u, y + 44 * u * k, 11 * u, BONE, 'right', 700); }
        tx(g, ready ? '✓ READY' : 'NOT READY', cx + colW - 14 * u, y + cardH - 16 * u * k, 11 * u, ready ? YOU : DIM, 'right', 900);
        if (hot) tx(g, '⇄ MOVE', cx + colW / 2 + 40 * u, y + cardH - 16 * u * k, 10 * u, col, 'center', 900);
      }
    });
    // what you can do while you wait
    const by = V.y1 - 150 * u, bw = 150 * u;
    btn(g, 640 - bw * 1.5 - 12 * u, by, bw, 46 * u, 'AGENT', () => { UI.returnTo = 'party'; openSelect(null); }, { px: 15 * u, sub: (OPS[CFG.op] || OPS.vex).n });
    btn(g, 640 - bw / 2, by, bw, 46 * u, 'LOCKER', () => { UI.returnTo = 'party'; screen = 'menu'; UI.panel = 'locker'; }, { px: 15 * u, sub: 'skins' });
    if (!host) btn(g, 640 + bw / 2 + 12 * u, by, bw, 46 * u, PARTY.ready ? 'READY ✓' : 'READY', () => { PARTY.ready = !PARTY.ready; click(); }, { on: true, fill: YOU, solid: PARTY.ready, col: PARTY.ready ? INK : BONE, px: 16 * u });
    else btn(g, 640 + bw / 2 + 12 * u, by, bw, 46 * u, 'SWAP TEAMS', () => { const T2 = PARTY.teams; for (const p of ps) T2[p.id] = 1 - (T2[p.id] || 0); MP.send({ t: 'lteam', teams: T2, set: S2 }); }, { px: 13 * u });
    if (!host) { const mine = PARTY.teams[me2] || 0; btn(g, 640 - bw * 1.5 - 12 * u - bw - 12 * u, by, bw, 46 * u, 'SWITCH TEAM', () => MP.to(MP.hostId, { t: 'lswap' }), { px: 13 * u, sub: mine ? 'to team A' : 'to team B' }); }
    // the host's settings and the start button
    const sy = V.y1 - 92 * u;
    if (host) {
      const sx = 640 - 525 * u, cs = (opts, val, fn, w) => { choice(g, sx2, sy, w, tapH(34), opts, val, v => { fn(v); MP.send({ t: 'lteam', teams: PARTY.teams, set: S2 }); hostTeams(); }); sx2 += w + 10 * u; }; let sx2 = sx;
      cs([[2, 'TWO SITES'], [1, 'ONE SITE']], S2.sites, v => { S2.sites = v; }, 200 * u); cs([[1, '1V1'], [2, '2V2'], [3, '3V3'], [4, '4V4']], S2.size, v => { S2.size = Math.max(v, teamSize(Math.ceil(ps.length / 2))); }, 200 * u); cs([[true, 'BOTS FILL'], [false, 'NO BOTS']], S2.fill, v => { S2.fill = v; }, 170 * u); if (S2.ranked) { rr(g, sx2, sy, 230 * u, tapH(34), 6, 'rgba(255,214,102,.08)', 'rgba(255,214,102,.35)', 1); tx(g, 'RANKED · BO9', sx2 + 115 * u, sy + tapH(34) / 2, 12 * u, GOLD, 'center', 900); sx2 += 240 * u; } else cs(MATCH_LENS.map(w => [w, 'BO' + (w * 2 - 1)]), winOf(S2.win), v => { S2.win = v; }, 230 * u);
      const ok = readyAll(); btn(g, sx2, sy - 6 * u, 200 * u, 48 * u, 'START MATCH', startParty, { on: ok, fill: FOE, solid: ok, col: ok ? INK : DIM, px: 17 * u, sub: ok ? '' : 'waiting for ready' });
    } else tx(g, `${S2.sites === 2 ? 'TWO SITES' : 'ONE SITE'}  ·  ${vsLabel(S2.size)}  ·  ${S2.fill ? 'BOTS FILL EMPTY SEATS' : 'NO BOTS'}  ·  ${S2.ranked ? 'RANKED  ·  BEST OF 9' : 'BEST OF ' + (winOf(S2.win) * 2 - 1)}  ·  the host starts the match`, 640, sy + 14 * u, 13 * u, DIM, 'center', 800);
    const waiting = ps.filter(p => p.id !== MP.hostId && !(p.id === me2 ? PARTY.ready : (PARTY.prof.get(p.id) || {}).rd)).length;
    tx(g, ps.length < 2 ? 'Send your friends the code. You can also start now and play with bots.' : waiting ? `Waiting for ${waiting} to ready up` : 'Everyone is ready', 640, by - 22 * u, 13 * u, waiting ? DIM : YOU, 'center', 800);
  }
