  /* ---------- 95 agent select: pick and lock in an operative before a match ----------
     The match's map is chosen first and loaded, so the operative you are looking at stands on it. Your bot teammate
     picks a moment later. Lock in (or let the clock run out) and the loading screen follows. From the home screen the
     same screen opens without a clock, just to choose. */
  function openSelect(o) {
    const opsAll = Object.keys(OPS), sites = o ? o.sites : CFG.sites, map = o ? pick(mapPool(sites)) : MAPS.indexOf(MAP);
    if (o && MAP !== MAPS[map]) { loadMap(map); emit('map', map); }
    const used = new Set(['You']), mates = [];
    // each teammate's first idea is an operative none of the others has (eight operatives, at most three teammates)
    if (o) for (let i = 1; i < (o.size | 0); i++) { const n = pick(BOT_NAMES.filter(q => !used.has(q))), free = opsAll.filter(k => !mates.some(m => m.op === k)); used.add(n); mates.push({ name: n, op: pick(free.length ? free : opsAll), at: rnd(1.4, 5) }); }
    UI.sel = { o, op: OPS[CFG.op] ? CFG.op : 'vex', map, t0: performance.now(), T: o ? 25 : 0, locked: 0, mates, spin: 0, hover: null };
    screen = 'select'; UI.armory = false; MP.hide(); releaseMouse(); KNAV.on = false;
  }
  /* ---- online agent select ----
     When the host starts a party match, the match is set at once (map, teams, settings: the same on every device) and then
     everyone picks here together, against a clock of SEL_T seconds. What each player is looking at, and what they have
     locked in, goes to the room ('spick'); your team is shown along the bottom as it picks, and an operative a teammate has
     locked in cannot be taken. When everyone still in the room has locked in, or the clock runs out, the host sends the
     final picks ('sgo') and every device starts the match with them. Two teammates on the same operative at the last
     moment: the first in the room keeps it, the other gets the first one nobody on the team has (the same on every device).
     If no word comes from the host (it left), each device starts on its own picks a little after the clock. */
  const SEL_T = 30;
  function openOnlineSelect(cfg, roster) {
    const humans = roster.filter(p => !p.bot), team = id => cfg.teams && cfg.teams[id] != null ? +cfg.teams[id] : Math.max(0, humans.findIndex(p => p.id === id)) % 2, picks = new Map();
    for (const p of humans) picks.set(p.id, { op: OPS[cfg.hops && cfg.hops[p.id]] ? cfg.hops[p.id] : null, lk: 0 });
    const map = cfg.map != null && MAPS[cfg.map] ? cfg.map : MAPS.indexOf(MAP); if (MAP !== MAPS[map]) { loadMap(map); emit('map', map); }
    UI.sel = { o: { size: cfg.size || 2, sites: cfg.sites }, online: { cfg, roster, picks, team, myT: team(MP.id), sent: '', lastSend: 0, go: false, allT: 0 }, op: OPS[CFG.op] ? CFG.op : 'vex', map, t0: performance.now(), T: SEL_T, locked: 0, mates: [], spin: 0, hover: null };
    screen = 'select'; UI.armory = false; UI.opts = false; MP.hide(); releaseMouse(); KNAV.on = false; selSend(true);
  }
  function selSend(force) {
    const S = UI.sel; if (!S || !S.online) return; const k = S.op + '|' + (S.locked ? 1 : 0), now = performance.now();
    if (!force && k === S.online.sent && now - S.online.lastSend < 2000) return;   // (sent again every 2 s, for anyone who missed it)
    S.online.sent = k; S.online.lastSend = now; S.online.picks.set(MP.id, { op: S.op, lk: S.locked ? 1 : 0 }); MP.send({ t: 'spick', op: S.op, lk: S.locked ? 1 : 0 });
  }
  function selHops(S) {
    const { roster, picks, team, cfg } = S.online, out = {}, used = {};
    for (const p of roster.filter(q => !q.bot)) { const t = team(p.id), want = p.id === MP.id ? S.op : (picks.get(p.id) || {}).op, u2 = used[t] || (used[t] = []);
      let op = OPS[want] && !u2.includes(want) ? want : null; if (!op) op = (cfg.ops || Object.keys(OPS)).find(k => OPS[k] && !u2.includes(k)) || 'vex'; u2.push(op); out[p.id] = op; }
    return out;
  }
  function selBegin(hops) {
    const S = UI.sel; if (!S || !S.online || S.online.go) return; S.online.go = true; const { cfg, roster } = S.online;
    cfg.hops = Object.assign({}, cfg.hops || {}, hops || selHops(S)); if (hops && hops[MP.id]) CFG.op = hops[MP.id];
    UI.sel = null; beginOnline(cfg, roster);
  }
  function selOnlineTick(S, el) {
    selSend(false); const O2 = S.online;
    if (MP.isHost()) {
      const here = new Set(MP.players().map(p => p.id)), humans = O2.roster.filter(p => !p.bot && here.has(p.id)), all = humans.every(p => p.id === MP.id ? !!S.locked : !!(O2.picks.get(p.id) || {}).lk);
      if (all && !O2.allT) O2.allT = performance.now(); if (!all) O2.allT = 0;
      if ((O2.allT && performance.now() - O2.allT > 1200) || el >= S.T + 1.5) { const hops = selHops(S); MP.send({ t: 'sgo', hops }); selBegin(hops); }
    } else if (el >= S.T + 8) selBegin(null);
  }
  function selMsg(m) {
    const S = UI.sel;
    if (m.t === 'spick') { if (S && S.online && S.online.picks.has(m.from) && OPS[m.op]) S.online.picks.set(m.from, { op: m.op, lk: m.lk ? 1 : 0 }); return true; }
    if (m.t === 'sgo') { if (S && S.online && m.from === MP.hostId && m.hops && typeof m.hops === 'object') { const h = {}; for (const [k, v] of Object.entries(m.hops)) if (OPS[v]) h[k] = v; selBegin(h); } return true; }
    return false;
  }
  // your team as it picks, for the strip along the bottom of agent select
  function selTeam(S) {
    if (S.online) { const { roster, cfg, picks, myT, team } = S.online, out = [];
      for (const p of roster.filter(q => !q.bot && team(q.id) === myT)) { const me2 = p.id === MP.id, pk = me2 ? { op: S.op, lk: S.locked ? 1 : 0 } : picks.get(p.id) || { op: null, lk: 0 }; out.push({ name: p.name, op: pk.op, done: !!pk.lk, me: me2 }); }
      out.sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0)); const bots = cfg.fill === false ? 0 : Math.max(0, (cfg.size || 2) - out.length); for (let i = 0; i < bots; i++) out.push({ name: 'BOT', bot: true });
      return out; }
    return [{ name: MP.name && MP.name !== 'You' ? MP.name : 'You', op: S.op, done: !!S.locked, me: true }, ...S.mates.map(m => ({ name: m.name, op: m.done ? m.op : null, done: !!m.done, bot: true, picking: !m.done }))];
  }
  function drawSelTeam(g, S, V, u, y, h, now) {
    const T2 = selTeam(S), n = T2.length, gap = 10 * u, w = Math.min(230 * u, (V.x1 - V.x0 - 120 * u) / n - gap), x0 = 640 - (n * (w + gap) - gap) / 2;
    tx(g, 'YOUR TEAM', x0, y - 10 * u, 10 * u, DIM, 'left', 900);
    T2.forEach((m, i) => { const x = x0 + i * (w + gap), O = m.op ? OPS[m.op] : null, col = O ? O.col : 'rgba(239,233,220,.3)';
      rr(g, x, y, w, h, 8, m.me ? 'rgba(22,28,40,.94)' : 'rgba(12,16,22,.86)', m.me ? 'rgba(239,233,220,.5)' : m.done ? col : 'rgba(239,233,220,.12)', m.me || m.done ? 1.8 : 1);
      g.fillStyle = m.done ? col : 'rgba(239,233,220,.12)'; g.fillRect(x + 8, y, w - 16, 3 * u);
      const ps = h - 12 * u; if (O) portraitTile(g, m.op, x + 6 * u, y + 6 * u, ps, ps, { r: 4, dead: !m.done && !m.me && !!m.bot }); else { rr(g, x + 6 * u, y + 6 * u, ps, ps, 4, 'rgba(255,255,255,.04)', 'rgba(239,233,220,.12)', 1); tx(g, m.bot ? 'BOT' : '?', x + 6 * u + ps / 2, y + 6 * u + ps / 2, (m.bot ? 11 : 20) * u, DIM, 'center', 900); }
      const nx = x + ps + 14 * u, dots = '.'.repeat(1 + Math.floor(now / 330) % 3);
      tx(g, String(m.name).toUpperCase() + (m.me ? '  (YOU)' : ''), nx, y + h * .36, Math.min(13 * u, w * .065), BONE, 'left', 900);
      tx(g, m.bot && !O ? 'picks at the start' : m.done ? O.n + '  ·  LOCKED IN' : O ? O.n + '  ·  picking' + dots : 'picking' + dots, nx, y + h * .7, Math.min(10.5 * u, w * .052), m.done ? col : O ? O.col : DIM, 'left', 800); });
  }
  function lockIn() {
    const S = UI.sel; if (!S || S.locked) return; S.locked = performance.now(); CFG.op = S.op; saveAll(); click();
    if (S.online) { selSend(true); return; }   // online: the host starts the match once everyone has locked in
    if (!S.o) { setTimeout(() => { if (UI.sel === S) { UI.sel = null; if (UI.returnTo === 'party') { UI.returnTo = null; screen = 'party'; } else { screen = 'menu'; UI.panel = 'home'; } } }, 450); return; }
    mateOps(S, true);   // anyone still picking picks now, each one an operative nobody on the team has
    setTimeout(() => { if (UI.sel !== S) return; UI.sel = null; play(Object.assign({}, S.o, { map: S.map, mates: S.mates })); }, 900);
  }
  // the bot teammates pick when their moment comes (all of them at once when you lock in): never an operative you or a
  // teammate already has
  function mateOps(S, all, el = 0) {
    for (const m of S.mates) if (!m.done && (all || el > m.at)) { m.done = true; m.t = performance.now(); const mine = [S.op, ...S.mates.filter(q => q.done && q !== m).map(q => q.op)]; if (mine.includes(m.op)) { const free = Object.keys(OPS).filter(k => !mine.includes(k)); if (free.length) m.op = pick(free); } }
  }
  // what you cannot pick: the bot teammates' picks and, choosing from the party, the operatives your teammates there have
  const selTaken = S => S.online ? [...S.online.picks].filter(([id, p]) => id !== MP.id && p.lk && S.online.team(id) === S.online.myT).map(([, p]) => p.op) : [...S.mates.filter(m => m.done).map(m => m.op), ...(!S.o && UI.returnTo === 'party' ? partyTaken() : [])];
  function selectKey(c) {
    const S = UI.sel; if (!S || S.locked) return; const taken = selTaken(S), keys = Object.keys(OPS).filter(k => !taken.includes(k)), i = keys.indexOf(S.op);
    if (c === 'ArrowRight' || c === 'ArrowDown') S.op = keys[(i + 1) % keys.length];
    else if (c === 'ArrowLeft' || c === 'ArrowUp') S.op = keys[(i - 1 + keys.length) % keys.length];
    else if (/^Digit[1-9]$/.test(c)) { const k = Object.keys(OPS)[+c.slice(5) - 1]; if (k && !taken.includes(k)) S.op = k; }
    else if (c === 'Enter' || c === 'Space') lockIn();
    else if (c === 'Escape' && !S.online) { UI.sel = null; if (UI.returnTo === 'party') { UI.returnTo = null; screen = 'party'; } else { screen = 'menu'; UI.panel = 'home'; } }
  }
  // the showcase: the chosen operative on the match's map, turning slowly, framed from the front
  function selectSpot() {
    const S = UI.sel; if (S.spot && S.spotMap === MAP) return S.spot;
    const ok = (x, z) => { for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const c = chAt(Math.floor(x / CS) + di, Math.floor(z / CS) + dj); if (!'.oqAD'.includes(c)) return false; } return true; };
    const c = SPAWN.att[0] || siteC, cand = navCells.filter(p => ok(p[0], p[1])).sort((a, b) => Math.hypot(a[0] - c[0], a[1] - c[1]) - Math.hypot(b[0] - c[0], b[1] - c[1]))[0] || c;
    let best = 0, bestA = 0; for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, d = rayGrid(cand[0], 1.2, cand[1], Math.sin(a), 0, Math.cos(a), 12); if (d > best) { best = d; bestA = a; } }
    S.spot = { x: cand[0], z: cand[1], a: bestA, room: best }; S.spotMap = MAP; return S.spot;
  }
  function renderSelect(dt) {
    const S = UI.sel, cam = X.camera, sp = selectSpot();
    if (!S.fake || S.fake.op !== S.op) { if (S.fake && X.agents.has(S.fake)) { X.scene.remove(X.agents.get(S.fake)); X.agents.delete(S.fake); } S.fake = fighter({ op: S.op, key: 'show', name: '' }); S.fake.guns = { 1: 'vesper', 2: 'pip', 3: 'knife' }; S.fake.slot = 1; S.pop = 0; }
    const F = S.fake; S.spin += dt * .45; S.pop = Math.min(1, (S.pop || 0) + dt * 3.5);
    // the camera stands out along the open direction; the operative turns to face it, framed on the right of the screen
    const dist = Math.min(4.4, sp.room - .4), rxv = Math.cos(sp.a), rzv = -Math.sin(sp.a), off = .85, cx = sp.x + Math.sin(sp.a) * dist - rxv * off, cz = sp.z + Math.cos(sp.a) * dist - rzv * off;
    Object.assign(F, { x: sp.x, z: sp.z, y: hAt(sp.x, sp.z), yaw: yawTo(sp.x, sp.z, cx, cz) + Math.sin(S.spin) * .5, pitch: -.04, alive: true, walkT: 0 });
    for (const [f, A] of X.agents) if (f !== F) A.visible = false; hideKitFx(); X.charge.visible = false;
    updateAgent(F, dt); const A = X.agents.get(F); if (A) { A.scale.setScalar(.6 + .4 * smooth(S.pop)); A.position.y = F.y; }
    cam.position.set(cx, F.y + 1.2, cz); cam.rotation.set(0, 0, 0); cam.lookAt(sp.x - rxv * off * 1.9, F.y + .98, sp.z - rzv * off * 1.9); cam.fov = 36; cam.updateProjectionMatrix();
    if (X.hemiBase == null) X.hemiBase = X.hemi.intensity; X.hemi.intensity = X.hemiBase * 1.7;   // a showroom's worth of light (put back when play starts)
    X.renderer.render(X.scene, cam);
  }
  function drawSelect(g) {
    const S = UI.sel; if (!S) { screen = 'menu'; return; }
    const V = K.view, u = uiScale(), W = V.x1 - V.x0, H = V.y1 - V.y0, now = performance.now(), el = (now - S.t0) / 1000, O = OPS[S.op], keys = Object.keys(OPS), touch = isTouch();
    if (S.T && !S.locked && el >= S.T) lockIn();
    if (S.online) { selOnlineTick(S, el); if (!UI.sel) return; }
    mateOps(S, false, el);   // a teammate never takes an operative already picked
    const taken = selTaken(S); if (taken.includes(S.op) && !S.locked) S.op = keys.find(k => !taken.includes(k)) || S.op;
    let gr = g.createLinearGradient(V.x0, 0, V.x0 + W * .55, 0); gr.addColorStop(0, 'rgba(8,10,14,.9)'); gr.addColorStop(1, 'rgba(8,10,14,0)'); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, H);
    gr = g.createLinearGradient(0, V.y1 - 200 * u, 0, V.y1); gr.addColorStop(0, 'rgba(8,10,14,0)'); gr.addColorStop(1, 'rgba(8,10,14,.95)'); g.fillStyle = gr; g.fillRect(V.x0, V.y1 - 200 * u, W, 200 * u);
    g.fillStyle = 'rgba(8,10,14,.7)'; g.fillRect(V.x0, V.y0, W, 54 * u);
    const x0 = V.x0 + 50 / pxPer() + 20 * u;
    tx(g, S.o ? 'AGENT SELECT' : 'CHOOSE YOUR AGENT', x0, V.y0 + 27 * u, 18 * u, BONE, 'left', 900);
    if (S.o) { const mp = MAPS[S.map]; tx(g, `${mp.n.toUpperCase()}  ·  ${(mp.sites || 1) > 2 ? 'THREE SITES' : (mp.sites || 1) > 1 ? 'TWO SITES' : 'ONE SITE'}  ·  ${vsLabel(S.o.size || 1)}`, 640, V.y0 + 27 * u, 14 * u, '#c9cfd8', 'center', 800);
      const left = Math.max(0, Math.ceil(S.T - el)), k = cl(el / S.T, 0, 1), rx = V.x1 - 46 * u, ry = V.y0 + 27 * u; g.strokeStyle = 'rgba(239,233,220,.15)'; g.lineWidth = 4 * u; g.beginPath(); g.arc(rx, ry, 18 * u, 0, TAU); g.stroke();
      g.strokeStyle = left <= 5 ? WARN : BONE; g.beginPath(); g.arc(rx, ry, 18 * u, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - k)); g.stroke(); tx(g, String(left), rx, ry + 1, 16 * u, left <= 5 ? WARN : BONE, 'center', 900); }
    else btn(g, V.x1 - 130 * u, V.y0 + 9 * u, 110 * u, 36 * u, 'BACK', () => selectKey('Escape'), { px: 13 * u });
    // the operative: name, role, story, and what Q, E and the ultimate (X) do
    { const pop = smooth(cl((now - (S.pickT || S.t0)) / 260, 0, 1)), cx = x0 + 20 * u, cy = V.y0 + 150 * u; g.save(); g.globalAlpha = .4 + .6 * pop;
      tx(g, O.role.toUpperCase(), cx, cy - 40 * u, 13 * u, O.col, 'left', 900); tx(g, O.n, cx - 4 * u, cy + 8 * u, 74 * u, BONE, 'left', 900);
      let y = para(g, O.bio || '', cx, cy + 56 * u, 320 * u, 14 * u, '#c9cfd8') + 18 * u;
      for (const [key, a] of [['C', O.c], ['Q', O.q], ['E', O.e], ['X', O.x]]) { rr(g, cx, y - 17 * u, 34 * u, 34 * u, 6, 'rgba(12,16,22,.85)', O.col, 2); abIcon(g, ABICON[S.op + key.toLowerCase()] || 'orb', cx + 17 * u, y, 10 * u, BONE, O.col); rr(g, cx + 22 * u, y + 8 * u, 14 * u, 13 * u, 3, O.col); tx(g, key, cx + 29 * u, y + 14.5 * u, 9.5 * u, INK, 'center', 900);
        tx(g, a.n.toUpperCase(), cx + 46 * u, y - 4 * u, 15 * u, BONE, 'left', 900); y = para(g, a.d, cx + 46 * u, y + 14 * u, 290 * u, 12 * u, '#b9c0cc') + 12 * u; }
      g.restore(); }
    // the roster along the bottom
    // (in a match's agent select your team runs along the very bottom, and the roster sits above it)
    const stH = S.o ? Math.max(50 * u, tapH(52, 44)) : 0, stY = V.y1 - stH - 12 * u; if (S.o) drawSelTeam(g, S, V, u, stY, stH, now);
    const n = keys.length, tw = Math.min(86 * u, (W - 160 * u) / n - 8 * u, S.o ? (stY - 30 * u - (V.y0 + 300 * u)) / 1.1 : 1e9), th = tw * 1.1, total = n * (tw + 8 * u) - 8 * u, rx0 = 640 - total / 2, ry = S.o ? stY - th - 36 * u : V.y1 - th - 30 * u;
    keys.forEach((k, i) => {
      const o = OPS[k], x = rx0 + i * (tw + 8 * u), on = S.op === k, gone = taken.includes(k), hot = !S.locked && !gone && zone(x, ry, tw, th, () => { if (S.op !== k) { S.op = k; S.pickT = performance.now(); click(); } });
      const lift = on ? 6 * u : hot ? 3 * u : 0;
      if (on) { g.save(); g.shadowColor = o.col; g.shadowBlur = 18 * u; g.fillStyle = o.col; g.fillRect(x + 4, ry - lift + 4, tw - 8, th - 8); g.restore(); }
      portraitTile(g, k, x, ry - lift, tw, th, { on, hot, r: 6, dead: gone }); tx(g, gone ? 'TAKEN' : o.n, x + tw / 2, ry - lift + th + 12 * u, 10 * u, on ? o.col : DIM, 'center', 800);
      if (!touch && i < 9) tx(g, String(i + 1), x + 9 * u, ry - lift + 11 * u, 9 * u, DIM, 'center', 800);
    });
    // lock in
    { const bw = 220 * u, bh = 60 * u, bx = V.x1 - bw - 40 * u, by = ry - bh - 24 * u, locked = !!S.locked;   // above the roster, clear of the corner
      btn(g, bx, by, bw, bh, locked ? 'LOCKED IN' : S.o ? 'LOCK IN' : 'SELECT', lockIn, { on: true, fill: O.col, solid: true, col: INK, px: 24 * u, sub: locked ? '' : touch ? '' : 'Enter' });
      if (locked) { const t = (now - S.locked) / 1000, a = 1 - cl(t / .9, 0, 1); g.save(); g.globalAlpha = a * .9; g.fillStyle = O.col; g.fillRect(V.x0, 360 - 40 * u * (1 + t), W, 80 * u * (1 + t) * a); g.restore(); tx(g, O.n + ' LOCKED IN', 640, 360, 40 * u * (1 + t * .1), INK, 'center', 900); } }
    if (!S.o && !touch) tx(g, '← → to browse · Enter to choose · Esc to go back', 640, V.y1 - 10 * u, 11 * u, DIM, 'center', 700);
  }
