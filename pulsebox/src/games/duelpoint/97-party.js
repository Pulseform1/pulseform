  /* ---------- 97 party: play with friends ----------
     Make a party (or join one with its 4-letter code or an invite link), see who is in on two team columns with their
     operative, rank and rating, and get ready. While you wait you can change operative or skins. The host sets the
     mode (one site or two), the team size, whether bots fill empty seats and how good they are, moves players between
     teams, and starts once everyone is ready. Lobby messages ride the room relay: 'lprof' (my operative, rating, ready),
     'lteam' (the host's teams and settings), 'lswap' (please move me). */
  const PARTY = { prof: new Map(), teams: {}, set: { sites: 2, size: 2, fill: true, win: 5, ranked: false }, status: '', ready: false, sent: '', joinOpen: false, want: new Set(), pick: null, qs: null };   // qs: the host's world search, as the rest of the party sees it   // want: who asked to switch sides; pick: the host's first pick of a trade
  const myId = () => MP.id;
  // view: 'join' opens straight on the join screen (just a code to type); anything else, the create-or-join choice
  function openParty(view) { if (!QUE.found) queueStop(); screen = 'party'; UI.armory = false; UI.panel = 'home'; releaseMouse(); MP.show(); PARTY.status = ''; PARTY.view = view === 'join' ? 'join' : view === 'creating' ? 'creating' : 'create'; PARTY.focused = false; if (view === 'creating') { if (!MP.name || MP.name === 'You') { let n = ''; try { n = (JSON.parse(localStorage.getItem('pbx-profile') || '{}').name || ''); } catch (e) {} MP.setName(n || 'Player' + Math.floor(1000 + Math.random() * 9000)); } MP.create(); } }   // (no name yet: your Pulsebox name, or a placeholder you can change)
  function partyProfile() { return { op: CFG.op, rt: STATS.rating, rd: PARTY.ready || MP.isHost(), rk: rankStrengths(), rkp: RQ.map(k => placed(rankedOf(+k)) ? 1 : 0).join(''), cd: cardCode(), qt: QUE.found ? QUE.tok : undefined }; }
  function sendProfile(force) { if (!MP.online()) return; const p = partyProfile(), key = JSON.stringify(p); if (!force && key === PARTY.sent) return; PARTY.sent = key; PARTY.prof.set(myId(), p); MP.send(Object.assign({ t: 'lprof' }, p)); }
  // the host keeps everyone on a team: newcomers go to the shorter side, and nobody stays on a team that has no room
  function hostTeams() {
    if (!MP.online() || !MP.isHost()) return; const ps = MP.players(), T2 = PARTY.teams;
    if (ps.length > 2 * PARTY.set.size) PARTY.set.size = teamSize(Math.ceil(ps.length / 2));   // more people than seats: the teams grow (up to 5v5)
    const size = PARTY.set.size;
    for (const id of Object.keys(T2)) if (!ps.some(p => String(p.id) === id)) delete T2[id];
    for (const id of [...PARTY.want]) if (!ps.some(p => String(p.id) === id)) PARTY.want.delete(id); if (PARTY.pick != null && !ps.some(p => p.id === PARTY.pick)) PARTY.pick = null;
    for (const p of ps) if (T2[p.id] == null) { const n0 = ps.filter(q => T2[q.id] === 0).length, n1 = ps.filter(q => T2[q.id] === 1).length; T2[p.id] = n0 <= n1 && n0 < size ? 0 : n1 < size ? 1 : 0; }
    for (const t of [0, 1]) { const on = ps.filter(q => T2[q.id] === t); while (on.length > size) { const q = on.pop(); T2[q.id] = 1 - t; } }
    MP.send({ t: 'lteam', teams: T2, set: PARTY.set, want: [...PARTY.want] });
  }
  MP.opts.custom = true;
  { const netOn = MP.opts.onMsg; MP.opts.onMsg = m => { if (!partyMsg(m)) netOn(m); }; }
  on('over', () => { if (M && M.online) PARTY.ready = false; });
  MP.opts.onRoster = () => { if (!MP.online()) { PARTY.prof.clear(); PARTY.teams = {}; PARTY.ready = false; PARTY.sent = ''; PARTY.qs = null; if (QUE.party && QUE.mode) queueStop(); return; } sendProfile(true); hostTeams(); };
  MP.opts.onStatus = s => { PARTY.status = s; };
  // lobby messages; anything else is the match's
  function partyMsg(m) {
    if (typeof selMsg === 'function' && selMsg(m)) return true;   // agent select's picks (95-select)
    if (m.t === 'lprof') { const rk = {}; if (m.rk && typeof m.rk === 'object') for (const k of RQ) rk[k] = cl(+m.rk[k] || 0, 0, 4000); PARTY.prof.set(m.from, { op: OPS[m.op] ? m.op : 'vex', rt: m.rt | 0, rd: !!m.rd, rk, rkp: typeof m.rkp === 'string' ? m.rkp.slice(0, 5) : '', cd: typeof m.cd === 'string' ? m.cd.slice(0, 40) : '', qt: typeof m.qt === 'string' ? m.qt.slice(0, 16) : '' }); return true; }
    if (m.t === 'lteam') { if (m.from === MP.hostId) { PARTY.teams = m.teams || {}; PARTY.set = Object.assign(PARTY.set, m.set || {}); if (Array.isArray(m.want)) PARTY.want = new Set(m.want.map(String).slice(0, 10)); } return true; }
    if (m.t === 'lswap') { if (MP.isHost()) { swapTeam(m.from, true); } return true; }
    // the host searching the world for a match for the whole party, and the match it found
    if (m.t === 'qstat') { if (m.from === MP.hostId) PARTY.qs = m.on ? { mode: cl(m.mode | 0, 1, 5), t0: performance.now() } : null; return true; }
    if (m.t === 'qgo') { if (m.from === MP.hostId) qFollow(m); return true; }
    if (m.t === 'mp-rejoin' && MP.isHost() && PARTY.teams[m.old] != null) { PARTY.teams[m.from] = PARTY.teams[m.old]; delete PARTY.teams[m.old]; const pf = PARTY.prof.get(m.old); if (pf) PARTY.prof.set(m.from, pf); MP.send({ t: 'lteam', teams: PARTY.teams, set: PARTY.set, want: [...PARTY.want] }); }   // back after a drop: same team (the match hears it too)
    return false;
  }
  // the operatives your teammates in the party have: agent select shows them as taken. Two on a team who still end up
  // on the same one (picked at the same moment, or a move between teams) are sorted out at the start: the first in the
  // room keeps it, the other gets one nobody on their team has (60-net seatsFor), and their card says so meanwhile
  function partyTaken() { if (!MP.online()) return []; const me2 = myId(), t = PARTY.teams[me2] || 0; return MP.players().filter(p => p.id !== me2 && (PARTY.teams[p.id] || 0) === t).map(p => (PARTY.prof.get(p.id) || {}).op).filter(Boolean); }
  const opOf = p => p.id === myId() ? CFG.op : (PARTY.prof.get(p.id) || { op: 'vex' }).op;
  const opClash = (p, ps) => { const t = PARTY.teams[p.id] || 0, op = opOf(p); return ps.slice(0, ps.indexOf(p)).some(q => (PARTY.teams[q.id] || 0) === t && opOf(q) === op); };
  /* Moving someone to the other side. With room there they just go. When it is full they trade places with someone over
     there: one who has asked to switch too, or (the host's way) the one the host picks next. A player's own request with
     nobody to trade with waits on the list (want) until someone on the other side asks too; asking again takes it back. */
  function swapTeam(id, asked) {
    const ps = MP.players(), T2 = PARTY.teams, from = T2[id] || 0, to = 1 - from, there = ps.filter(q => (T2[q.id] || 0) === to), W = PARTY.want, k = String(id);
    const send = () => MP.send({ t: 'lteam', teams: T2, set: PARTY.set, want: [...W] });
    if (there.length < PARTY.set.size) { T2[id] = to; W.delete(k); send(); return true; }
    const mate = there.find(q => W.has(String(q.id)));
    if (mate) { T2[id] = to; T2[mate.id] = from; W.delete(k); W.delete(String(mate.id)); send(); return true; }
    if (asked) { if (W.has(k)) W.delete(k); else W.add(k); send(); }
    return false;
  }
  function tradeTeams(a, b) { const T2 = PARTY.teams, ta = T2[a] || 0, tb = T2[b] || 0; if (ta === tb) return; T2[a] = tb; T2[b] = ta; PARTY.want.delete(String(a)); PARTY.want.delete(String(b)); MP.send({ t: 'lteam', teams: T2, set: PARTY.set, want: [...PARTY.want] }); }
  // the host clicks a player: across if there is room (or someone over there wants to come back), else that player is
  // picked and the next click on someone on the other side trades the two
  function hostClick(id) {
    const T2 = PARTY.teams, pk = PARTY.pick;
    if (pk != null) { PARTY.pick = null; if (pk === id) return; if ((T2[pk] || 0) !== (T2[id] || 0)) { tradeTeams(pk, id); return; } }
    if (!swapTeam(id, false)) PARTY.pick = id;
  }
  const readyAll = () => MP.players().every(p => p.id === MP.hostId || (PARTY.prof.get(p.id) || {}).rd);
  function startParty() {
    if (QUE.party) queueStop();   // (a match of our own instead of the world search)
    if (!MP.isHost() || !readyAll()) return; const ps = MP.players();
    if (!ps.some(p => PARTY.teams[p.id] === 0) || (!PARTY.set.fill && !ps.some(p => PARTY.teams[p.id] === 1))) { PARTY.status = PARTY.set.fill ? '' : 'Each team needs a player, or bots'; if (!PARTY.set.fill) return; }
    CFG.sites = PARTY.set.sites; MP.start();
  }
  // the room tells the match who is where: teams, operatives and ratings from the lobby
  MP.opts.max = 10; MP.opts.min = 1;   // up to ten people: 5v5
  const baseConfig = MP.opts.config;
  MP.opts.config = () => { const c = baseConfig(); c.map = pick(mapPool(PARTY.set.sites)); c.sites = PARTY.set.sites; c.teams = Object.assign({}, PARTY.teams); c.size = PARTY.set.size; c.fill = PARTY.set.fill; c.win = PARTY.set.ranked ? 5 : winOf(PARTY.set.win); c.ranked = !!PARTY.set.ranked; if (UI.noSel) c.noSel = 1;   // (a test that is not about agent select goes straight in)
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
    if (!domIn) { domIn = {}; const st = document.createElement('style'); st.textContent = '.dp-in{position:fixed;z-index:5;background:rgba(10,13,18,.92);border:1px solid rgba(239,233,220,.3);border-radius:8px;color:#efe9dc;font:800 18px "Chakra Petch",sans-serif;text-align:center;letter-spacing:.06em;outline:none;padding:0 10px}.dp-in:focus{border-color:#35e0c8}.dp-in.dp-ghost{background:transparent;border-color:transparent;color:transparent;caret-color:transparent;text-transform:uppercase}'; document.head.appendChild(st); }
    let el = domIn[id]; if (!el) { el = domIn[id] = document.createElement('input'); el.className = 'dp-in'; el.maxLength = max; el.placeholder = ph; el.value = val || ''; el.autocomplete = 'off'; el.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') onEnter(el.value); if (e.key === 'Escape') el.blur(); }; document.body.appendChild(el); }
    const V = K.view, sx = innerWidth / (V.x1 - V.x0), sy = innerHeight / (V.y1 - V.y0); el.style.left = (x - V.x0) * sx + 'px'; el.style.top = (y - V.y0) * sy + 'px'; el.style.width = w * sx + 'px'; el.style.height = h * sy + 'px'; el.style.fontSize = Math.round(h * sy * .45) + 'px'; el.hidden = false; el.dataset.seen = '1'; return el;
  }
  function hideBoxes() { if (domIn) for (const el of Object.values(domIn)) { if (!el.dataset.seen) el.hidden = true; delete el.dataset.seen; } }
  // JOIN A PARTY: one job, done big. Your name, the code (four boxes, filled as you type), and JOIN
  function drawJoin(g, V, u, x0) {
    const t = performance.now() / 1000, cw = Math.min(520 * u, V.x1 - V.x0 - 40 * u), cx = 640 - cw / 2, top = V.y0 + Math.max(70 * u, (V.y1 - V.y0 - 470 * u) / 2), ch = 430 * u;
    btn(g, V.x1 - 130 * u, V.y0 + 28 * u, 110 * u, 36 * u, 'BACK', () => { PARTY.status = ''; screen = 'menu'; UI.panel = 'home'; }, { px: 13 * u });
    // the card: dark glass, a teal edge, slow light sweeping across it
    g.save(); rr(g, cx, top, cw, ch, 16, null, null); g.clip(); g.fillStyle = 'rgba(10,22,24,.94)'; g.fillRect(cx, top, cw, ch);
    { const gr = g.createRadialGradient(640, top + ch, 10, 640, top + ch * .65, ch); gr.addColorStop(0, 'rgba(53,224,200,.28)'); gr.addColorStop(1, 'rgba(53,224,200,0)'); g.fillStyle = gr; g.fillRect(cx, top, cw, ch); }
    g.globalAlpha = .05; g.fillStyle = YOU; for (let i = -3; i < 8; i++) { const bx = cx + i * 70 * u + (t * 10 * u) % (70 * u); g.beginPath(); g.moveTo(bx, top + ch); g.lineTo(bx + ch * .5, top); g.lineTo(bx + ch * .5 + 22 * u, top); g.lineTo(bx + 22 * u, top + ch); g.closePath(); g.fill(); } g.globalAlpha = 1; g.restore();
    rr(g, cx, top, cw, ch, 16, null, 'rgba(53,224,200,.55)', 2); g.fillStyle = YOU; g.fillRect(cx + 16, top, cw - 32, 4 * u);
    tx(g, 'JOIN A PARTY', 640, top + 52 * u, 34 * u, BONE, 'center', 900);
    tx(g, 'Type the code your friend shared', 640, top + 84 * u, 14 * u, '#9fd8cf', 'center', 700);
    // the code: four boxes; the real input sits on them, see-through, so typing (and pasting) just works
    const code = (domIn && domIn.code ? domIn.code.value : '').toUpperCase(), bs = 72 * u, gap = 14 * u, rowW = bs * 4 + gap * 3, bx0 = 640 - rowW / 2, by0 = top + 112 * u;
    for (let i = 0; i < 4; i++) { const x = bx0 + i * (bs + gap), c = code[i], cur = i === Math.min(code.length, 3) && code.length < 4;
      rr(g, x, by0, bs, bs * 1.12, 10, c ? 'rgba(53,224,200,.14)' : 'rgba(255,255,255,.04)', c ? YOU : cur ? `rgba(53,224,200,${.45 + .35 * Math.sin(t * 6)})` : 'rgba(159,216,207,.3)', c || cur ? 2.5 : 1.5);
      if (c) tx(g, c, x + bs / 2, by0 + bs * .58, 40 * u, BONE, 'center', 900); else if (cur) { g.fillStyle = `rgba(53,224,200,${.5 + .5 * Math.sin(t * 6)})`; g.fillRect(x + bs / 2 - 12 * u, by0 + bs * .82, 24 * u, 3 * u); } }
    const join = () => { MP.setName(domIn.jname.value); joinOrKey(domIn.code.value); };
    const cd = textBox('code', bx0, by0, rowW, bs * 1.12, '', 4, '', join); cd.classList.add('dp-ghost'); if (!PARTY.focused) { PARTY.focused = true; setTimeout(() => { try { cd.focus(); } catch (e) {} }, 30); }   // ready to type straight away
    // your name, then JOIN
    tx(g, 'PLAYING AS', 640, by0 + bs * 1.12 + 34 * u, 11 * u, DIM, 'center', 900);
    textBox('jname', 640 - 150 * u, by0 + bs * 1.12 + 46 * u, 300 * u, 40 * u, 'Your name', 12, MP.name === 'You' ? '' : MP.name, v => MP.setName(v));
    const ready = code.length === 4, jy = by0 + bs * 1.12 + 104 * u;
    btn(g, 640 - 150 * u, jy, 300 * u, tapH(52), ready ? 'JOIN PARTY' : 'ENTER THE CODE', join, { on: ready, fill: YOU, solid: ready, col: ready ? INK : DIM, px: 18 * u });
    if (PARTY.status) tx(g, PARTY.status, 640, jy + tapH(52) + 26 * u, 14 * u, PARTY.status.startsWith('Connect') ? DIM : PARTY.status.startsWith('Code accepted') ? GOLD : WARN, 'center', 800);
    // no code? make your own instead
    const ly = top + ch + 30 * u; g.font = `800 ${fitPx(g, 13 * u)}px ${FONT}`; const lw = g.measureText('No code? Create your own party').width + 24 * u, hot = zone(640 - lw / 2, ly - 16 * u, lw, 32 * u, () => { MP.setName(domIn.jname.value); PARTY.view = 'creating'; MP.create(); });
    tx(g, 'No code? Create your own party', 640, ly, 13 * u, hot ? YOU : '#9fd8cf', 'center', 800); g.fillStyle = hot ? YOU : 'rgba(159,216,207,.4)'; g.fillRect(640 - lw / 2 + 12 * u, ly + 11 * u, lw - 24 * u, 1.5);
    hideBoxes();
  }
  function drawParty(g) {
    const V0 = K.view, u = uiScale(), W = V0.x1 - V0.x0, H = V0.y1 - V0.y0, on = MP.online(), x0 = V0.x0 + 60 / pxPer() + 20 * u;
    g.fillStyle = 'rgba(8,10,14,.8)'; g.fillRect(V0.x0, V0.y0, W, H);
    const nh = on && !QUE.found ? drawTopBar(g, V0, u) : 0, V = Object.assign({}, V0, { y0: V0.y0 + nh });
    if (!on && PARTY.view === 'join' && !QUE.found) return drawJoin(g, V, u, x0);
    // CREATE A PARTY goes straight in: a moment while the room opens, then the party itself (a failure falls back to the choice)
    if (!on && PARTY.view === 'creating' && !QUE.found) {
      const st = PARTY.status || '', bad = st && !/^connect/i.test(st), t = performance.now() / 1000; if (bad) PARTY.view = 'create'; else { hideBoxes();
        tx(g, 'PLAY WITH FRIENDS', x0, V.y0 + 46 * u, 34 * u, BONE, 'left', 900); btn(g, V.x1 - 130 * u, V.y0 + 28 * u, 110 * u, 36 * u, 'BACK', () => { MP.leave(); PARTY.status = ''; screen = 'menu'; UI.panel = 'home'; }, { px: 13 * u });
        const cy = V.y0 + (V.y1 - V.y0) / 2; g.lineWidth = 5 * u; g.strokeStyle = 'rgba(53,224,200,.2)'; g.beginPath(); g.arc(640, cy - 30 * u, 26 * u, 0, TAU); g.stroke(); g.strokeStyle = YOU; g.beginPath(); g.arc(640, cy - 30 * u, 26 * u, t * 5, t * 5 + 1.6); g.stroke();
        tx(g, 'CREATING YOUR PARTY', 640, cy + 30 * u, 22 * u, BONE, 'center', 900); tx(g, 'Getting a code for your friends...', 640, cy + 56 * u, 13 * u, '#9fd8cf', 'center', 700); return; } }
    tx(g, 'PLAY WITH FRIENDS', x0, V.y0 + 46 * u, 34 * u, BONE, 'left', 900); btn(g, V.x1 - 130 * u, V.y0 + 28 * u, 110 * u, 36 * u, on ? 'LEAVE' : 'BACK', () => { if (on) MP.leave(); PARTY.status = ''; if (!on) { screen = 'menu'; UI.panel = 'home'; } MP.opts.onRoster(); }, { px: 13 * u });
    if (QUE.found) {   // a match from the queue: say so, and who is in yet
      const F = QUE.found, n = on ? F.toks.filter(tok => MP.players().some(p => (p.id === myId() ? QUE.tok : (PARTY.prof.get(p.id) || {}).qt) === tok)).length : 0, pulse = .75 + .25 * Math.sin(performance.now() / 160);
      rr(g, 640 - 260 * u, V.y0 + 90 * u, 520 * u, 64 * u, 10, 'rgba(255,214,102,.12)', GOLD, 2); g.globalAlpha = pulse; tx(g, `MATCH FOUND  ·  ${F.mode}V${F.mode}`, 640, V.y0 + 114 * u, 22 * u, GOLD, 'center', 900); g.globalAlpha = 1;
      tx(g, on ? `${n}/${F.toks.length} in` : 'Joining the match room...', 640, V.y0 + 140 * u, 12 * u, BONE, 'center', 700);
      if (!on) { hideBoxes(); return; }
    }
    if (!on) {   // make a party or join one
      tx(g, 'YOUR NAME', 640, V.y0 + 150 * u, 12 * u, DIM, 'center', 900); const nm = textBox('name', 640 - 160 * u, V.y0 + 164 * u, 320 * u, 44 * u, 'Your name', 12, MP.name === 'You' ? '' : MP.name, v => MP.setName(v));
      const cw = 300 * u, ch = 190 * u, cy = V.y0 + 250 * u;
      { const x = 640 - cw - 12 * u, hot = zone(x, cy, cw, ch, () => { MP.setName(nm.value); MP.create(); }); rr(g, x, cy, cw, ch, 10, hot ? 'rgba(53,224,200,.16)' : 'rgba(20,26,36,.92)', hot ? YOU : 'rgba(239,233,220,.2)', 2); g.fillStyle = YOU; g.fillRect(x, cy, cw, 5 * u);
        tx(g, 'CREATE A PARTY', x + cw / 2, cy + 70 * u, 24 * u, BONE, 'center', 900); para(g, 'Up to 10 players. Bots fill gaps.', x + 24 * u, cy + 112 * u, cw - 48 * u, 13 * u, '#c9cfd8'); }
      { const x = 640 + 12 * u; rr(g, x, cy, cw, ch, 10, 'rgba(20,26,36,.92)', 'rgba(239,233,220,.2)', 2); g.fillStyle = FOE; g.fillRect(x, cy, cw, 5 * u); tx(g, 'JOIN WITH A CODE', x + cw / 2, cy + 50 * u, 24 * u, BONE, 'center', 900);
        const cd = textBox('code', x + 40 * u, cy + 80 * u, cw - 80 * u, 46 * u, 'CODE', 4, '', v => { MP.setName(nm.value); joinOrKey(v); }); cd.classList.remove('dp-ghost');
        btn(g, x + 40 * u, cy + 136 * u, cw - 80 * u, 40 * u, 'JOIN', () => { MP.setName(nm.value); joinOrKey(cd.value); }, { on: true, fill: FOE, solid: true, col: INK, px: 16 * u }); }
      if (PARTY.status) tx(g, PARTY.status, 640, cy + ch + 40 * u, 15 * u, PARTY.status.startsWith('Connect') ? DIM : PARTY.status.startsWith('Code accepted') ? GOLD : WARN, 'center', 800);
      hideBoxes(); return;
    }
    hideBoxes(); sendProfile(false);
    if (PARTY.status) tx(g, PARTY.status, x0, V.y0 + 80 * u, 13 * u, GOLD, 'left', 800);
    const ps = MP.players(), host = MP.isHost(), S2 = PARTY.set, me2 = myId();
    // the code and an invite link
    { const cx = x0 + 380 * u, cy = V.y0 + 46 * u; rr(g, cx, cy - 20 * u, 200 * u, 40 * u, 6, 'rgba(255,255,255,.06)', 'rgba(239,233,220,.25)', 1); tx(g, 'CODE', cx + 14 * u, cy, 11 * u, DIM, 'left', 900); tx(g, MP.code, cx + 186 * u, cy, 22 * u, GOLD, 'right', 900);
      btn(g, cx + 212 * u, cy - 20 * u, 150 * u, 40 * u, PARTY.copied && performance.now() - PARTY.copied < 1500 ? 'COPIED' : 'COPY INVITE', () => { const link = location.origin + location.pathname + '?room=' + MP.code; try { navigator.clipboard.writeText(link); } catch (e) {} PARTY.copied = performance.now(); }, { px: 12 * u });
      const qx = cx + 374 * u, qw = Math.min(250 * u, V.x1 - 140 * u - qx);
      if (host && qw > 120 * u) choice(g, qx, cy - 20 * u, qw, 40 * u, [[false, 'UNRATED'], [true, 'RANKED']], !!S2.ranked, v => { S2.ranked = v; MP.send({ t: 'lteam', teams: PARTY.teams, set: S2, want: [...PARTY.want] }); hostTeams(); });
      else if (qw > 80 * u) { rr(g, qx, cy - 20 * u, qw, 40 * u, 6, S2.ranked ? 'rgba(255,214,102,.14)' : 'rgba(255,255,255,.05)', S2.ranked ? GOLD : 'rgba(239,233,220,.2)', 1); tx(g, S2.ranked ? 'RANKED  ·  ' + vsLabel(S2.size) : 'UNRATED', qx + qw / 2, cy, 13 * u, S2.ranked ? GOLD : DIM, 'center', 900); } }
    // two teams
    // the cards shrink to fit five seats a side above the buttons (k scales what is inside them)
    const colW = 380 * u, gap = 60 * u, top = V.y0 + 120 * u, cardH = Math.min(92 * u, (V.y1 - 190 * u - top) / Math.max(1, S2.size) - 10 * u), k = cardH / (92 * u);
    [0, 1].forEach(t => {
      const cx = t ? 640 + gap / 2 : 640 - gap / 2 - colW, col = t ? FOE : YOU, mates = ps.filter(p => (PARTY.teams[p.id] || 0) === t);
      tx(g, t ? 'TEAM B' : 'TEAM A', cx, top - 14 * u, 15 * u, col, 'left', 900); tx(g, `${mates.length} / ${S2.size}`, cx + colW, top - 14 * u, 12 * u, DIM, 'right', 800);
      for (let i = 0; i < S2.size; i++) {
        const p = mates[i], y = top + i * (cardH + 10 * u);
        if (!p) { const seat = host && PARTY.pick != null && (PARTY.teams[PARTY.pick] || 0) !== t && zone(cx, y, colW, cardH, () => { const pk = PARTY.pick; PARTY.pick = null; swapTeam(pk, false); });
          rr(g, cx, y, colW, cardH, 8, 'rgba(12,16,22,.6)', seat ? GOLD : 'rgba(239,233,220,.1)', seat ? 2 : 1); tx(g, seat ? 'MOVE HERE' : S2.fill ? 'BOT' : 'OPEN', cx + colW / 2, y + cardH / 2, 15 * u, seat ? GOLD : DIM, 'center', 900); continue; }
        const pr = p.id === me2 ? partyProfile() : PARTY.prof.get(p.id) || { op: 'vex', rt: 0, rd: false }, isHost = p.id === MP.hostId, ready = isHost || pr.rd;
        const hot = host && zone(cx, y, colW, cardH, () => hostClick(p.id)), picked = host && PARTY.pick === p.id, wants = PARTY.want.has(String(p.id));
        rr(g, cx, y, colW, cardH, 8, picked ? 'rgba(255,214,102,.16)' : p.id === me2 ? 'rgba(24,30,42,.96)' : 'rgba(14,18,26,.92)', picked ? GOLD : hot ? col : p.id === me2 ? 'rgba(239,233,220,.45)' : 'rgba(239,233,220,.14)', p.id === me2 || hot || picked ? 2 : 1); g.fillStyle = col; g.fillRect(cx, y, 4 * u, cardH);
        // their card: the banner behind it, their level beside the name, their title after the operative (26-progress)
        const cd = p.id === me2 ? myCard() : pr.cd ? cardFrom(pr.cd) : { lv: 0, title: '', banner: 'plain' };
        if (cd.banner !== 'plain' && !picked) { g.save(); g.globalAlpha = .6; bannerBg(g, cx + 4 * u, y + 1.5, colW - 5.5 * u, cardH - 3, cd.banner, 7); g.restore(); }
        portraitTile(g, pr.op, cx + 10 * u, y + 8 * u, cardH - 16 * u, cardH - 16 * u, { r: 5 });
        const nx = cx + cardH + 4 * u, nm0 = p.name.toUpperCase() + (p.id === me2 ? '  (YOU)' : ''), npx = 16 * u * Math.max(.85, k); tx(g, nm0, nx, y + 26 * u * k, npx, BONE, 'left', 900);
        if (cd.lv) { g.font = `900 ${fitPx(g, npx)}px ${FONT}`; const nw = g.measureText(nm0).width; if (nx + nw + 70 * u < cx + colW - 150 * u) lvChip(g, nx + nw + 10 * u, y + 26 * u * k, cd.lv, 10.5 * u); else lvChip(g, nx + (p.id === MP.hostId ? 44 * u : 0), y + 70 * u * k, cd.lv, 9.5 * u); }   // (a long name: on the line under the operative)
        { const clash = opClash(p, ps); tx(g, (OPS[pr.op] || OPS.vex).n + (clash ? (p.id === me2 ? '  ·  TAKEN, PICK ANOTHER' : '  ·  TAKEN') : cd.title ? '  ·  ' + cd.title.toUpperCase() : ''), nx, y + 48 * u * k, 12 * u, clash ? WARN : (OPS[pr.op] || OPS.vex).col, 'left', 800); }
        if (isHost) tx(g, 'HOST', nx, y + 70 * u * k, 10 * u, GOLD, 'left', 900);
        { const mine = p.id === me2, rv = mine ? rankedOf(S2.size).rv : (pr.rk || {})[String(S2.size)] || 0, on = mine ? placed(rankedOf(S2.size)) : (pr.rkp || '')[S2.size - 1] === '1';   // the rank at this team size
          tierBadge(g, cx + colW - 30 * u, y + 30 * u * k, 13 * u * Math.max(.8, k), rv, on); tx(g, on ? rankLabel(rv).toUpperCase() : 'UNRANKED', cx + colW - 52 * u, y + 26 * u * k, 11 * u, on ? rankOf(rv).T.col : DIM, 'right', 800); tx(g, vsLabel(S2.size) + (on ? '  ' + rankOf(rv).rp + ' RP' : ''), cx + colW - 52 * u, y + 44 * u * k, 11 * u, BONE, 'right', 700); }
        tx(g, ready ? '✓ READY' : 'NOT READY', cx + colW - 14 * u, y + cardH - 16 * u * k, 11 * u, ready ? YOU : DIM, 'right', 900);
        if (picked) tx(g, 'PICKED · NOW CLICK SOMEONE ON ' + (t ? 'TEAM A' : 'TEAM B'), cx + colW / 2 + 30 * u, y + cardH - 16 * u * k, 10 * u, GOLD, 'center', 900);
        else if (wants) tx(g, '⇄ WANTS TO SWITCH', cx + colW / 2 + 30 * u, y + cardH - 16 * u * k, 10 * u, GOLD, 'center', 900);
        else if (hot) tx(g, PARTY.pick != null && (PARTY.teams[PARTY.pick] || 0) !== t ? '⇄ TRADE' : '⇄ MOVE', cx + colW / 2 + 40 * u, y + cardH - 16 * u * k, 10 * u, col, 'center', 900);
      }
    });
    // what you can do while you wait
    const by = V.y1 - 150 * u, bw = 150 * u;
    btn(g, 640 - bw * 1.5 - 12 * u, by, bw, 46 * u, 'AGENT', () => { UI.returnTo = 'party'; openSelect(null); }, { px: 15 * u, sub: (OPS[CFG.op] || OPS.vex).n });
    btn(g, 640 - bw / 2, by, bw, 46 * u, 'LOCKER', () => { UI.returnTo = 'party'; screen = 'menu'; UI.panel = 'locker'; }, { px: 15 * u, sub: 'skins' });
    if (!host) btn(g, 640 + bw / 2 + 12 * u, by, bw, 46 * u, PARTY.ready ? 'READY ✓' : 'READY', () => { PARTY.ready = !PARTY.ready; click(); }, { on: true, fill: YOU, solid: PARTY.ready, col: PARTY.ready ? INK : BONE, px: 16 * u });
    else btn(g, 640 + bw / 2 + 12 * u, by, bw, 46 * u, 'SWAP TEAMS', () => { const T2 = PARTY.teams; for (const p of ps) T2[p.id] = 1 - (T2[p.id] || 0); MP.send({ t: 'lteam', teams: T2, set: S2, want: [...PARTY.want] }); }, { px: 13 * u });
    // a match against the world for the whole party, all on one team: the host searches, everyone sees it
    { const per = cl(Math.max(S2.size, ps.length), 1, 5), mine = host && QUE.party && QUE.mode, theirs = !host && PARTY.qs, t0 = mine ? QUE.t0 : theirs ? PARTY.qs.t0 : 0, s = t0 ? Math.floor((performance.now() - t0) / 1000) : 0, clock = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      if (host) btn(g, 640 + bw * 1.5 + 24 * u, by, bw, 46 * u, mine ? 'CANCEL' : 'WORLD MATCH', () => { if (mine) queueStop(); else if (ps.length <= 5) queueStart(per, UI.qshard || 0, true); click(); }, { on: true, fill: GOLD, solid: !!mine, col: mine ? INK : GOLD, px: 13 * u, sub: mine ? `SEARCHING ${per}V${per} · ${clock}` : ps.length > 5 ? 'five at most' : `${per}V${per} vs anyone` });
      if (mine || theirs) tx(g, `SEARCHING THE WORLD  ·  ${(mine ? per : PARTY.qs.mode)}V${(mine ? per : PARTY.qs.mode)}  ·  ${clock}${mine && QUE.err ? '  ·  ' + QUE.err : ''}`, 640, by - 46 * u, 13 * u, GOLD, 'center', 900); }
    if (!host) { const mine = PARTY.teams[me2] || 0, waitSw = PARTY.want.has(String(me2)), full = ps.filter(q => (PARTY.teams[q.id] || 0) !== mine).length >= S2.size;
      btn(g, 640 - bw * 1.5 - 12 * u - bw - 12 * u, by, bw, 46 * u, waitSw ? 'CANCEL SWITCH' : 'SWITCH TEAM', () => MP.to(MP.hostId, { t: 'lswap' }), { px: 13 * u, sub: waitSw ? 'waiting for a trade' : full ? 'trade with someone' : mine ? 'to team A' : 'to team B', on: waitSw, fill: GOLD, solid: waitSw, col: waitSw ? INK : BONE }); }
    // the host's settings and the start button
    const sy = V.y1 - 92 * u;
    if (host) {
      const sx = 640 - 543 * u, cs = (opts, val, fn, w) => { choice(g, sx2, sy, w, tapH(34), opts, val, v => { fn(v); MP.send({ t: 'lteam', teams: PARTY.teams, set: S2, want: [...PARTY.want] }); hostTeams(); }); sx2 += w + 10 * u; }; let sx2 = sx;
      cs([[2, 'TWO SITES'], [1, 'ONE SITE']], S2.sites, v => { S2.sites = v; }, 200 * u); cs([[1, '1V1'], [2, '2V2'], [3, '3V3'], [4, '4V4'], [5, '5V5']], S2.size, v => { S2.size = Math.max(v, teamSize(Math.ceil(ps.length / 2))); }, 236 * u); cs([[true, 'BOTS FILL'], [false, 'NO BOTS']], S2.fill, v => { S2.fill = v; }, 170 * u); if (S2.ranked) { rr(g, sx2, sy, 230 * u, tapH(34), 6, 'rgba(255,214,102,.08)', 'rgba(255,214,102,.35)', 1); tx(g, 'RANKED · FIRST TO 5', sx2 + 115 * u, sy + tapH(34) / 2, 12 * u, GOLD, 'center', 900); sx2 += 240 * u; } else cs(MATCH_LENS.map(w => [w, 'TO ' + w]), winOf(S2.win), v => { S2.win = v; }, 300 * u);
      const ok = readyAll(); btn(g, sx2, sy - 6 * u, 200 * u, 48 * u, 'START MATCH', startParty, { on: ok, fill: FOE, solid: ok, col: ok ? INK : DIM, px: 17 * u, sub: ok ? '' : 'waiting for ready' });
    } else tx(g, `${S2.sites === 2 ? 'TWO SITES' : 'ONE SITE'}  ·  ${vsLabel(S2.size)}  ·  ${S2.fill ? 'BOTS FILL EMPTY SEATS' : 'NO BOTS'}  ·  ${S2.ranked ? 'RANKED  ·  FIRST TO 5' : 'FIRST TO ' + winOf(S2.win)}  ·  SIDES SWAP AT THE HALF  ·  the host starts the match`, 640, sy + 14 * u, 13 * u, DIM, 'center', 800);
    const waiting = ps.filter(p => p.id !== MP.hostId && !(p.id === me2 ? PARTY.ready : (PARTY.prof.get(p.id) || {}).rd)).length;
    tx(g, ps.length < 2 ? 'Share the code, or start with bots.' : waiting ? `Waiting for ${waiting} to ready up` : 'Everyone is ready', 640, by - 22 * u, 13 * u, waiting ? DIM : YOU, 'center', 800);
  }
