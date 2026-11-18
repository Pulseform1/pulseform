  /* ---------- 95 agent select: pick and lock in an operative before a match ----------
     The match's map is chosen first and loaded, so the operative you are looking at stands on it. Your bot teammate
     picks a moment later. Lock in (or let the clock run out) and the loading screen follows. From the home screen the
     same screen opens without a clock, just to choose. */
  function openSelect(o) {
    const opsAll = Object.keys(OPS), sites = o ? o.sites : CFG.sites, map = o ? pick(mapPool(sites)) : MAPS.indexOf(MAP);
    if (o && MAP !== MAPS[map]) { loadMap(map); emit('map', map); }
    const used = new Set(['You']), mates = [];
    if (o) for (let i = 1; i < (o.size | 0); i++) { const n = pick(BOT_NAMES.filter(q => !used.has(q))); used.add(n); mates.push({ name: n, op: pick(opsAll), at: rnd(1.4, 5) }); }
    UI.sel = { o, op: OPS[CFG.op] ? CFG.op : 'vex', map, t0: performance.now(), T: o ? 25 : 0, locked: 0, mates, spin: 0, hover: null };
    screen = 'select'; UI.armory = false; MP.hide(); releaseMouse(); KNAV.on = false;
  }
  function lockIn() {
    const S = UI.sel; if (!S || S.locked) return; S.locked = performance.now(); CFG.op = S.op; saveAll(); click();
    if (!S.o) { setTimeout(() => { if (UI.sel === S) { UI.sel = null; screen = 'menu'; UI.panel = 'home'; } }, 450); return; }
    const ops = {}; S.mates.forEach((m, i) => { ops['m' + (i + 1)] = m; });
    setTimeout(() => { if (UI.sel !== S) return; UI.sel = null; play(Object.assign({}, S.o, { map: S.map, mates: S.mates })); }, 900);
  }
  function selectKey(c) {
    const S = UI.sel; if (!S || S.locked) return; const taken = S.mates.filter(m => m.done).map(m => m.op), keys = Object.keys(OPS).filter(k => !taken.includes(k)), i = keys.indexOf(S.op);
    if (c === 'ArrowRight' || c === 'ArrowDown') S.op = keys[(i + 1) % keys.length];
    else if (c === 'ArrowLeft' || c === 'ArrowUp') S.op = keys[(i - 1 + keys.length) % keys.length];
    else if (/^Digit[1-9]$/.test(c)) { const k = Object.keys(OPS)[+c.slice(5) - 1]; if (k && !taken.includes(k)) S.op = k; }
    else if (c === 'Enter' || c === 'Space') lockIn();
    else if (c === 'Escape') { UI.sel = null; screen = 'menu'; UI.panel = 'home'; }
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
    for (const m of S.mates) if (!m.done && el > m.at) { m.done = true; m.t = now; const mine = [S.op, ...S.mates.filter(q => q.done && q !== m).map(q => q.op)]; if (mine.includes(m.op)) m.op = pick(keys.filter(k => !mine.includes(k))); }   // a teammate never takes an operative already picked
    const taken = S.mates.filter(m => m.done).map(m => m.op); if (taken.includes(S.op) && !S.locked) S.op = keys.find(k => !taken.includes(k));
    let gr = g.createLinearGradient(V.x0, 0, V.x0 + W * .55, 0); gr.addColorStop(0, 'rgba(8,10,14,.9)'); gr.addColorStop(1, 'rgba(8,10,14,0)'); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, H);
    gr = g.createLinearGradient(0, V.y1 - 200 * u, 0, V.y1); gr.addColorStop(0, 'rgba(8,10,14,0)'); gr.addColorStop(1, 'rgba(8,10,14,.95)'); g.fillStyle = gr; g.fillRect(V.x0, V.y1 - 200 * u, W, 200 * u);
    g.fillStyle = 'rgba(8,10,14,.7)'; g.fillRect(V.x0, V.y0, W, 54 * u);
    const x0 = V.x0 + 50 / pxPer() + 20 * u;
    tx(g, S.o ? 'AGENT SELECT' : 'CHOOSE YOUR OPERATIVE', x0, V.y0 + 27 * u, 18 * u, BONE, 'left', 900);
    if (S.o) { const mp = MAPS[S.map]; tx(g, `${mp.n.toUpperCase()}  ·  ${(mp.sites || 1) > 1 ? 'TWO SITES' : 'ONE SITE'}  ·  ${(S.o.size | 0) > 1 ? '2V2' : '1V1'}`, 640, V.y0 + 27 * u, 14 * u, '#c9cfd8', 'center', 800);
      const left = Math.max(0, Math.ceil(S.T - el)), k = cl(el / S.T, 0, 1), rx = V.x1 - 46 * u, ry = V.y0 + 27 * u; g.strokeStyle = 'rgba(239,233,220,.15)'; g.lineWidth = 4 * u; g.beginPath(); g.arc(rx, ry, 18 * u, 0, TAU); g.stroke();
      g.strokeStyle = left <= 5 ? WARN : BONE; g.beginPath(); g.arc(rx, ry, 18 * u, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - k)); g.stroke(); tx(g, String(left), rx, ry + 1, 16 * u, left <= 5 ? WARN : BONE, 'center', 900); }
    else btn(g, V.x1 - 130 * u, V.y0 + 9 * u, 110 * u, 36 * u, 'BACK', () => { UI.sel = null; screen = 'menu'; UI.panel = 'home'; }, { px: 13 * u });
    // your team, down the left
    if (S.o) { let y = V.y0 + 90 * u; tx(g, 'YOUR TEAM', x0, y - 16 * u, 11 * u, DIM, 'left', 800);
      const row = (name, op, done, me2) => { const col = done ? OPS[op].col : 'rgba(239,233,220,.3)'; rr(g, x0, y, 230 * u, 54 * u, 6, me2 ? 'rgba(20,26,36,.92)' : 'rgba(12,16,22,.8)', me2 ? 'rgba(239,233,220,.45)' : 'rgba(239,233,220,.12)', me2 ? 2 : 1); g.fillStyle = col; g.fillRect(x0, y, 4 * u, 54 * u);
        if (done) portraitTile(g, op, x0 + 8 * u, y + 4 * u, 46 * u, 46 * u, { r: 4 }); else { rr(g, x0 + 8 * u, y + 4 * u, 46 * u, 46 * u, 4, 'rgba(255,255,255,.04)', 'rgba(239,233,220,.12)', 1); tx(g, '?', x0 + 31 * u, y + 27 * u, 22 * u, DIM, 'center', 900); }
        tx(g, name.toUpperCase(), x0 + 62 * u, y + 20 * u, 14 * u, BONE, 'left', 800); tx(g, done ? OPS[op].n + (me2 && S.locked ? '  ·  LOCKED IN' : '') : 'picking' + '.'.repeat(1 + Math.floor(el * 3) % 3), x0 + 62 * u, y + 38 * u, 11 * u, done ? OPS[op].col : DIM, 'left', 800); y += 62 * u; };
      row('You', S.op, true, true); for (const m of S.mates) row(m.name, m.op, m.done, false); }
    // the operative: name, role, story, and what Q and E do
    { const pop = smooth(cl((now - (S.pickT || S.t0)) / 260, 0, 1)), cx = x0 + (S.o ? 260 * u : 0) + 20 * u, cy = V.y0 + 150 * u; g.save(); g.globalAlpha = .4 + .6 * pop;
      tx(g, O.role.toUpperCase(), cx, cy - 40 * u, 13 * u, O.col, 'left', 900); tx(g, O.n, cx - 4 * u, cy + 8 * u, 74 * u, BONE, 'left', 900);
      let y = para(g, O.bio || '', cx, cy + 56 * u, 320 * u, 14 * u, '#c9cfd8') + 18 * u;
      for (const [key, a] of [['Q', O.q], ['E', O.e]]) { rr(g, cx, y - 15 * u, 30 * u, 30 * u, 5, 'rgba(12,16,22,.8)', O.col, 2); tx(g, key, cx + 15 * u, y, 15 * u, O.col, 'center', 900); tx(g, a.n.toUpperCase(), cx + 42 * u, y - 2 * u, 16 * u, BONE, 'left', 900); y = para(g, a.d, cx + 42 * u, y + 18 * u, 290 * u, 12.5 * u, '#b9c0cc') + 16 * u; }
      g.restore(); }
    // the roster along the bottom
    const n = keys.length, tw = Math.min(86 * u, (W - 360 * u) / n - 8 * u), th = tw * 1.1, total = n * (tw + 8 * u) - 8 * u, rx0 = 640 - total / 2, ry = V.y1 - th - 30 * u;
    keys.forEach((k, i) => {
      const o = OPS[k], x = rx0 + i * (tw + 8 * u), on = S.op === k, gone = taken.includes(k), hot = !S.locked && !gone && zone(x, ry, tw, th, () => { if (S.op !== k) { S.op = k; S.pickT = performance.now(); click(); } });
      const lift = on ? 6 * u : hot ? 3 * u : 0;
      if (on) { g.save(); g.shadowColor = o.col; g.shadowBlur = 18 * u; g.fillStyle = o.col; g.fillRect(x + 4, ry - lift + 4, tw - 8, th - 8); g.restore(); }
      portraitTile(g, k, x, ry - lift, tw, th, { on, hot, r: 6, dead: gone }); tx(g, gone ? 'TAKEN' : o.n, x + tw / 2, ry - lift + th + 12 * u, 10 * u, on ? o.col : DIM, 'center', 800);
      if (!touch && i < 9) tx(g, String(i + 1), x + 9 * u, ry - lift + 11 * u, 9 * u, DIM, 'center', 800);
    });
    // lock in
    { const bw = 220 * u, bh = 64 * u, bx = V.x1 - bw - 40 * u, by = V.y1 - bh - 40 * u - th * .2, locked = !!S.locked;
      btn(g, bx, by, bw, bh, locked ? 'LOCKED IN' : S.o ? 'LOCK IN' : 'SELECT', lockIn, { on: true, fill: O.col, solid: true, col: INK, px: 24 * u, sub: locked ? '' : touch ? '' : 'Enter' });
      if (locked) { const t = (now - S.locked) / 1000, a = 1 - cl(t / .9, 0, 1); g.save(); g.globalAlpha = a * .9; g.fillStyle = O.col; g.fillRect(V.x0, 360 - 40 * u * (1 + t), W, 80 * u * (1 + t) * a); g.restore(); tx(g, O.n + ' LOCKED IN', 640, 360, 40 * u * (1 + t * .1), INK, 'center', 900); } }
    if (!S.o && !touch) tx(g, '← → to browse · Enter to choose · Esc to go back', 640, V.y1 - 10 * u, 11 * u, DIM, 'center', 700);
  }
