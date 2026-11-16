  /* ---------- 92 hud: what you need to see, and nothing else; menus, crafting, building, settings ---------- */
  const FONT = '"Barlow Condensed", system-ui, sans-serif', INK = '#06121b', BONE = '#eef2f0', DIM = '#93a4ae', GOLD = '#e8b45a', TEAL = '#6fd2de', RED = '#ff6a5a', GREEN = '#8fe0a0';
  const uiScale = () => { const V = K.view, s = Math.min((V.x1 - V.x0) / 1280, (V.y1 - V.y0) / 720); return (isTouch() ? 1.25 : 1) / Math.max(.75, Math.min(1.4, s)); };
  function tx(g, s, x, y, px, col = BONE, align = 'center', w = 600) { g.font = `${w} ${px}px ${FONT}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }
  function rr(g, x, y, w, h, r, fill, stroke, lw = 1.5) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
  function btn(g, x, y, w, h, label, fn, o = {}) { const hot = zone(x, y, w, h, fn); rr(g, x, y, w, h, 8, o.on ? (o.col || TEAL) : hot ? 'rgba(255,255,255,.16)' : 'rgba(6,18,27,.72)', o.on ? null : 'rgba(238,242,240,.28)'); tx(g, label, x + w / 2, y + h / 2 - (o.sub ? 7 : 0), o.px || 20, o.on ? INK : BONE, 'center', 700); if (o.sub) tx(g, o.sub, x + w / 2, y + h / 2 + 12, 13, o.on ? INK : DIM); return hot; }
  const bar = (g, x, y, w, h, v, col, back = 'rgba(255,255,255,.14)') => { rr(g, x, y, w, h, h / 2, back); if (v > 0) rr(g, x, y, Math.max(h, w * cl(v, 0, 1)), h, h / 2, col); };
  const SAYS = []; on('say', (t, c) => { SAYS.unshift({ t, c: c || BONE, a: 0 }); SAYS.length = Math.min(SAYS.length, 3); });
  on('pickup', (got, kind) => { const n = {}; got.forEach(k => n[k] = (n[k] || 0) + 1); say('+ ' + Object.entries(n).map(([k, c]) => (c > 1 ? c + ' ' : '') + itemName(k).toLowerCase()).join(', '), GREEN); });
  on('catch', f => say(`${FISH[f.k].n}! ${(f.len * 100).toFixed(0)} cm, ${f.kg < 1 ? Math.round(f.kg * 1000) + ' g' : f.kg.toFixed(1) + ' kg'}`, GOLD));
  on('eat', k => say(`Ate ${itemName(k).toLowerCase()} (+${foodOf(k)})`, GREEN));
  on('craft', t => { if (t === 'rod') say('Fishing rod ready: hold to cast, wait for the bobber to dip, then reel', TEAL); });
  const fmtTime = t => `${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor(t % 1 * 60)).padStart(2, '0')}`;

  function touchButtons() {
    const V = K.view, u = uiScale(), R = V.x1, B = V.y1, t = PL.tool;
    const useLbl = t === 'hook' ? (HK.state === 'water' ? 'REEL' : 'THROW') : t === 'rod' ? (FS.state === 'idle' || FS.state === 'charge' ? 'CAST' : 'REEL') : t === 'hammer' ? 'BUILD' : t === 'spear' ? 'STAB' : t === 'oar' ? 'PADDLE' : t === 'food' ? 'EAT' : PL.torch ? 'TORCH' : 'LIGHT';
    const L = [{ k: 'use', x: R - 150 * u, y: B - 150 * u, r: 70 * u, t: useLbl, big: 1 }, { k: 'alt', x: R - 290 * u, y: B - 92 * u, r: 40 * u, t: t === 'hammer' ? 'MEND' : 'CANCEL' }, { k: 'jump', x: R - 58 * u, y: B - 255 * u, r: 40 * u, t: PL.onRaft ? 'JUMP' : 'UP' }];
    if (ui.prompt.startsWith('E ')) L.push({ k: 'grab', x: R - 160 * u, y: B - 300 * u, r: 46 * u, t: ui.prompt.includes('Climb') ? 'CLIMB' : ui.prompt.includes('Grab') ? 'GRAB' : 'USE', hot: 1 });
    if (ui.warn || !PL.onRaft) L.push({ k: 'brace', x: R - 290 * u, y: B - 210 * u, r: 42 * u, t: PL.onRaft ? 'BRACE' : 'DIVE', hot: !!ui.warn });
    if (PL.tools.hammer) L.push({ k: 'build', x: R - 58 * u, y: B - 370 * u, r: 34 * u, t: PL.tool === 'hammer' ? 'PIECE' : 'HAMMER' });
    return L;
  }
  function drawHud(g) {
    const V = K.view, u = uiScale(), touch = isTouch(), W = V.x1 - V.x0, cx = 640, cy = 360;
    // crosshair and what is in front of you
    if (!panel) { g.fillStyle = 'rgba(238,242,240,.75)'; g.beginPath(); g.arc(cx, cy, 2.4, 0, TAU); g.fill(); }
    if (ui.prompt) tx(g, ui.prompt.replace(/^E  /, touch ? '' : 'E  '), cx, cy + 46, 19 * u, BONE, 'center', 600);
    // the tool's own readout
    let y = cy + 78;
    const ch = HK.state === 'charge' ? HK.charge : FS.state === 'charge' ? FS.charge : -1;
    if (ch >= 0) { bar(g, cx - 70, y, 140, 8, ch, GOLD); tx(g, 'THROW', cx, y + 22, 13, DIM); }
    if (PL.tool === 'hook' && HK.state === 'water' && HK.items.length) { tx(g, 'ROPE TENSION', cx, y - 6, 13, DIM); bar(g, cx - 90, y + 6, 180, 9, HK.tension, HK.tension > .75 ? RED : TEAL); tx(g, 'Hooked: ' + HK.items.map(f => ({ wallpiece: 'broken wall', panel: 'broken platform' }[f.k] || f.k)).join(', '), cx, y + 30, 15, BONE); }
    else if (PL.tool === 'hook' && HK.state === 'water') tx(g, touch ? 'Hold REEL to pull it back' : 'Hold the button to reel in', cx, y, 15, DIM);
    if (PL.tool === 'rod') {
      if (FS.state === 'wait') tx(g, 'Waiting for a bite...', cx, y, 16, DIM);
      if (FS.state === 'bite') tx(g, 'BITE!  REEL!', cx, y, 30 * u, GOLD, 'center', 800);
      if (FS.state === 'fight') { tx(g, 'LINE', cx - 108, y + 4, 13, DIM, 'right'); bar(g, cx - 100, y, 200, 10, FS.tension, FS.tension > .9 ? RED : FS.tension > .7 ? GOLD : GREEN); g.fillStyle = 'rgba(255,106,90,.5)'; g.fillRect(cx + 80, y - 3, 2, 16); tx(g, `${Math.max(0, FS.dist).toFixed(0)} m · ease off when it pulls`, cx, y + 26, 14, BONE); }
      if (!PL.tools.rod) tx(g, 'No rod yet: craft one (C)', cx, y, 15, DIM);
    }
    if (PL.tool === 'hammer' && !panel) {
      const k = ui.buildKind, P = PIECES[k];
      tx(g, `${P.n}  ·  ` + Object.entries(P.need).map(([m, n]) => `${n} ${itemName(m).toLowerCase()}`).join(', '), cx, y, 17, has(P.need) ? GREEN : RED, 'center', 700);
      tx(g, touch ? 'PIECE to change · MEND to repair' : 'B choose piece  ·  click build  ·  R mend', cx, y + 22, 13, DIM);
      const a = ui.aim, c = a && cellAt(RAFT, a.i, a.j); if (c && c.hp < 100) { bar(g, cx - 60, y + 40, 120, 7, c.hp / 100, c.hp < 35 ? RED : GOLD); }
    }
    if (SH.state === 'bite') { const c = RAFT.cells.get(SH.cell); if (c) { tx(g, 'SHARK ON THE RAFT', cx, 132, 22 * u, RED, 'center', 800); bar(g, cx - 110, 150, 220, 10, c.hp / 100, RED); tx(g, PL.tools.spear ? 'Spear it! (tool 5)' : 'Craft a spear (C) to drive it off', cx, 176, 15, BONE); } }
    if (ui.warn) tx(g, ui.warn, cx, 104, (ui.warn.startsWith('HOLD') ? 30 : 20) * u, Math.sin(S.t * 8) > 0 ? GOLD : BONE, 'center', 800);
    SAYS.forEach((s, i) => { s.a += 1 / 60; const al = cl(Math.min(s.a * 4, (4.5 - s.a) / .6), 0, 1); if (al <= 0) return; g.globalAlpha = al; tx(g, s.t, cx, 214 + i * 28, 20 * u, s.c, 'center', 700); g.globalAlpha = 1; });
    for (let i = SAYS.length - 1; i >= 0; i--) if (SAYS[i].a > 4.5) SAYS.splice(i, 1);
    // hunger and materials, bottom left
    const lx = V.x0 + 24 * u + (touch ? 50 * u : 0), by = touch ? V.y0 + 92 * u : V.y1 - 40 * u;
    if (!touch || true) { tx(g, 'HUNGER', lx, by - 18, 13, DIM, 'left'); bar(g, lx, by - 6, 190 * u, 10, PL.hunger / 100, PL.hunger < 25 ? RED : PL.hunger < 50 ? GOLD : GREEN); }
    const mats = ['plank', 'rope', 'scrap', 'tinder'].map(k => `${itemName(k).replace('Dry ', '')} ${INV[k] || 0}`).join('   ');
    tx(g, mats, lx, by + 18, 15, BONE, 'left', 600);
    // the hotbar
    const hb = hotbar(), sw = 64 * u, gap = 6, hx = cx - (hb.length * (sw + gap) - gap) / 2, hy = V.y1 - sw - 14 * u - (touch ? 6 : 0);
    hb.forEach((h, i) => { const x = hx + i * (sw + gap), on2 = PL.tool === h.k; zone(x, hy, sw, sw, () => act.select(h.k)); rr(g, x, hy, sw, sw, 8, on2 ? 'rgba(111,210,222,.28)' : 'rgba(6,18,27,.62)', on2 ? TEAL : 'rgba(238,242,240,.2)', on2 ? 2.5 : 1.5);
      tx(g, String(i + 1), x + 9, hy + 11, 12, DIM, 'left'); drawIcon(g, h.k, x + sw / 2, hy + sw / 2 - 4, sw * .36); tx(g, h.k === 'food' ? `${INV[foods()[0]]}` : (h.k === 'torch' && PL.torch ? 'lit' : ''), x + sw - 8, hy + sw - 10, 13, GOLD, 'right', 700); });
    tx(g, PL.tool === 'food' ? itemName(foods()[0] || '') : TOOLS[PL.tool] ? TOOLS[PL.tool].n : '', cx, hy - 14, 15, BONE, 'center', 700);
    // top right: the day, crafting, settings
    const tr = V.x1 - 20;
    rr(g, tr - 250, V.y0 + 14, 112, 32, 8, 'rgba(6,18,27,.55)'); tx(g, `Day ${S.day}  ${fmtTime(S.tod)}`, tr - 194, V.y0 + 30, 17, BONE, 'center', 600);
    btn(g, tr - 128, V.y0 + 12, 60, 36, 'CRAFT', () => { panel = panel === 'craft' ? null : 'craft'; panel ? unlockMouse() : lockMouse(); }, { px: 16, on: panel === 'craft' });
    btn(g, tr - 60, V.y0 + 12, 60, 36, '☰', () => { panel = panel === 'settings' ? null : 'settings'; panel ? unlockMouse() : lockMouse(); }, { px: 20, on: panel === 'settings' });
    if (craftable().some(t => has(TOOLS[t].need)) && panel !== 'craft') { g.fillStyle = GOLD; g.beginPath(); g.arc(tr - 70, V.y0 + 14, 5, 0, TAU); g.fill(); }
    if (PL.tool === 'hammer' && ui.buildOpen) drawBuildList(g);
    if (touch && !panel) drawTouch(g);
    if (panel === 'craft') drawCraft(g); else if (panel === 'settings') drawSettings(g, true);
    if (!touch && !IN.locked && !panel && K.state === 'play') { rr(g, cx - 160, cy - 80, 320, 50, 10, 'rgba(6,18,27,.75)'); tx(g, 'Click to look around', cx, cy - 55, 20, BONE, 'center', 700); }
  }
  function drawIcon(g, k, x, y, s) {
    g.save(); g.translate(x, y); g.strokeStyle = BONE; g.fillStyle = BONE; g.lineWidth = 2.4; g.lineCap = 'round';
    const L = (a, b, c, d) => { g.beginPath(); g.moveTo(a * s, b * s); g.lineTo(c * s, d * s); g.stroke(); };
    if (k === 'hook') { g.beginPath(); g.arc(0, .25 * s, .35 * s, .1, Math.PI - .1); g.stroke(); L(0, .25, 0, -.7); g.beginPath(); g.arc(-.12 * s, -.7 * s, .15 * s, 0, TAU); g.stroke(); }
    else if (k === 'torch') { L(-.3, .8, .2, -.3); g.fillStyle = PL.torch ? '#ffb050' : DIM; g.beginPath(); g.ellipse(.28 * s, -.55 * s, .2 * s, .35 * s, .4, 0, TAU); g.fill(); }
    else if (k === 'hammer') { L(-.5, .7, .3, -.3); g.fillRect(-.05 * s, -.7 * s, .7 * s, .3 * s); }
    else if (k === 'rod') { L(-.6, .8, .6, -.8); g.beginPath(); g.arc(-.35 * s, .5 * s, .14 * s, 0, TAU); g.stroke(); L(.6, -.8, .6, .4); }
    else if (k === 'spear') { L(-.7, .7, .55, -.55); g.beginPath(); g.moveTo(.75 * s, -.75 * s); g.lineTo(.35 * s, -.55 * s); g.lineTo(.55 * s, -.35 * s); g.closePath(); g.fill(); }
    else if (k === 'oar') { L(-.6, .7, .2, -.1); g.beginPath(); g.ellipse(.42 * s, -.38 * s, .18 * s, .42 * s, -.8, 0, TAU); g.fill(); }
    else { g.beginPath(); g.ellipse(-.1 * s, 0, .55 * s, .26 * s, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(.4 * s, 0); g.lineTo(.75 * s, -.3 * s); g.lineTo(.75 * s, .3 * s); g.closePath(); g.fill(); }
    g.restore();
  }
  function drawTouch(g) {
    const u = uiScale();
    if (IN.stick) { const s = IN.stick, dx = s.x - s.x0, dy = s.y - s.y0, L = Math.min(62 * u, Math.hypot(dx, dy)), a = Math.atan2(dy, dx); g.strokeStyle = 'rgba(238,242,240,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(s.x0, s.y0, 62 * u, 0, TAU); g.stroke(); g.fillStyle = 'rgba(238,242,240,.45)'; g.beginPath(); g.arc(s.x0 + Math.cos(a) * L, s.y0 + Math.sin(a) * L, 26 * u, 0, TAU); g.fill(); }
    else { const x = K.view.x0 + 150 * u, y = K.view.y1 - 150 * u; g.setLineDash([6, 8]); g.strokeStyle = 'rgba(238,242,240,.25)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 62 * u, 0, TAU); g.stroke(); g.setLineDash([]); tx(g, 'MOVE', x, y, 15 * u, 'rgba(238,242,240,.35)'); }
    for (const b of touchButtons()) { const on2 = (b.k === 'use' && IN.use) || [...IN.held.values()].includes(b.k); g.fillStyle = on2 ? 'rgba(111,210,222,.55)' : b.hot ? 'rgba(232,180,90,.55)' : 'rgba(6,18,27,.5)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill(); g.strokeStyle = 'rgba(238,242,240,.4)'; g.lineWidth = 2; g.stroke(); tx(g, b.t, b.x, b.y, (b.big ? 20 : 14) * u, BONE, 'center', 800); }
  }
  function drawBuildList(g) {
    const x = K.view.x0 + 24, w = 300; let y = 160;
    rr(g, x, y - 34, w, BUILD_ORDER.length * 40 + 46, 10, 'rgba(6,18,27,.82)'); tx(g, 'BUILD', x + 14, y - 14, 15, DIM, 'left', 700);
    BUILD_ORDER.forEach((k, i) => { const P = PIECES[k], ok = has(P.need), on2 = ui.buildKind === k; const hot = zone(x + 6, y, w - 12, 36, () => { ui.buildKind = k; ui.buildOpen = false; });
      rr(g, x + 6, y, w - 12, 36, 6, on2 ? 'rgba(111,210,222,.25)' : hot ? 'rgba(255,255,255,.08)' : null); tx(g, `${i + 1}  ${P.n}`, x + 16, y + 18, 18, ok ? BONE : DIM, 'left', 700); tx(g, Object.entries(P.need).map(([m, n]) => n + ' ' + itemName(m).toLowerCase().replace('dry ', '')).join(' · '), x + w - 14, y + 18, 13, ok ? GREEN : RED, 'right'); y += 40; });
  }
  function drawCraft(g) {
    const w = 460, x = 640 - w / 2; let y = 170; const list = Object.keys(TOOLS).filter(t => TOOLS[t].need);
    rr(g, x, y - 50, w, list.length * 56 + 110, 12, 'rgba(6,18,27,.9)', 'rgba(238,242,240,.2)'); tx(g, 'CRAFT', x + 20, y - 24, 22, BONE, 'left', 800); tx(g, 'C to close', x + w - 20, y - 24, 14, DIM, 'right');
    for (const t of list) { const T = TOOLS[t], got = PL.tools[t], locked = T.after && PL.pickups < T.after, ok = !got && !locked && has(T.need);
      const hot = zone(x + 12, y, w - 24, 48, () => act.craft(t)); rr(g, x + 12, y, w - 24, 48, 8, ok ? (hot ? 'rgba(143,224,160,.25)' : 'rgba(143,224,160,.12)') : 'rgba(255,255,255,.04)');
      drawIcon(g, t, x + 40, y + 24, 14); tx(g, T.n, x + 66, y + 16, 19, got ? DIM : BONE, 'left', 700);
      tx(g, got ? 'made' : locked ? `haul in ${T.after - PL.pickups} more salvage first` : Object.entries(T.need).map(([m, n]) => `${n} ${itemName(m).toLowerCase()} (${INV[m] || 0})`).join(' · '), x + 66, y + 35, 13, got ? DIM : ok ? GREEN : locked ? DIM : RED, 'left'); y += 56; }
    const fd = foods(); tx(g, fd.length ? 'Food: ' + fd.map(k => `${itemName(k)} x${INV[k]}`).join(', ') : 'No food yet', 640, y + 22, 14, DIM);
  }
  function drawSettings(g, inGame) {
    const w = 460, x = 640 - w / 2; let y = 150;
    rr(g, x, y - 40, w, 440, 12, 'rgba(6,18,27,.92)', 'rgba(238,242,240,.2)'); tx(g, 'SETTINGS', x + 20, y - 14, 22, BONE, 'left', 800);
    const row = (label, val, fnL, fnR) => { tx(g, label, x + 24, y + 22, 18, BONE, 'left', 600); btn(g, x + w - 200, y + 4, 40, 36, '−', fnL, { px: 22 }); tx(g, val, x + w - 112, y + 22, 17, GOLD, 'center', 700); btn(g, x + w - 64, y + 4, 40, 36, '+', fnR, { px: 22 }); y += 48; };
    row('Volume', Math.round(CFG.vol * 100) + '%', () => { CFG.vol = Math.max(0, CFG.vol - .1); saveCfg(); }, () => { CFG.vol = Math.min(1, CFG.vol + .1); saveCfg(); });
    const Q = ['auto', 'low', 'medium', 'high'];
    row('Graphics', CFG.quality.toUpperCase(), () => { CFG.quality = Q[(Q.indexOf(CFG.quality) + 3) % 4]; saveCfg(); applyQuality(); }, () => { CFG.quality = Q[(Q.indexOf(CFG.quality) + 1) % 4]; saveCfg(); applyQuality(); });
    row('Look speed', Math.round(CFG.sens * 100) + '%', () => { CFG.sens = Math.max(.05, CFG.sens - .05); saveCfg(); }, () => { CFG.sens = Math.min(1, CFG.sens + .05); saveCfg(); });
    tx(g, 'Reduced camera motion', x + 24, y + 22, 18, BONE, 'left', 600); btn(g, x + w - 200, y + 4, 176, 36, CFG.reduce ? 'ON' : 'OFF', () => { CFG.reduce = !CFG.reduce; saveCfg(); }, { on: CFG.reduce, px: 17 }); y += 48;
    tx(g, 'The raft still moves; the view rolls much less.', x + 24, y + 6, 13, DIM, 'left'); y += 26;
    if (inGame) { btn(g, x + 24, y, 130, 42, 'SAVE NOW', () => { saveRun(); say('Saved', GREEN); }, { px: 17 }); btn(g, x + 166, y, 130, 42, 'MAIN MENU', () => { saveRun(); panel = null; toMenu(); }, { px: 17 }); btn(g, x + 308, y, 128, 42, 'RESUME', () => { panel = null; lockMouse(); }, { on: true, px: 17 }); y += 56; }
    else { btn(g, x + 24, y, w - 48, 42, 'BACK', () => { panel = null; }, { on: true, px: 17 }); y += 56; }
    if (devMode) btn(g, x + 24, y, w - 48, 38, 'DEV: CALL THE THING FROM BELOW (F8)', () => { panel = null; if (screen !== 'play') menuStart(); summon(); }, { px: 15, col: RED, on: true });
  }
  function drawMenu(g) {
    const V = K.view, cx = 640; const grd = g.createLinearGradient(0, V.y0, 0, V.y1); grd.addColorStop(0, 'rgba(4,16,26,.15)'); grd.addColorStop(1, 'rgba(4,16,26,.7)'); g.fillStyle = grd; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0);
    tx(g, 'BLACKWATER DRIFT', cx, 190, 76, BONE, 'center', 800); tx(g, 'No land in sight. Haul in the wreckage. Outlast the sea.', cx, 246, 21, '#c4d2d8', 'center', 500);
    const sv = savedRun(); let y = 320;
    if (sv) { btn(g, cx - 160, y, 320, 60, 'CONTINUE', () => menuStart(true), { on: true, px: 26, sub: `Day ${sv.s.day} · ${sv.raft.cells.length} foundations` }); y += 72; }
    btn(g, cx - 160, y, 320, 54, sv ? 'NEW RAFT' : 'WAKE UP', () => menuStart(false), { on: !sv, px: 24 }); y += 66;
    btn(g, cx - 160, y, 320, 46, 'SETTINGS', () => { panel = 'settings'; }, { px: 19 });
    tx(g, isTouch() ? 'Left thumb moves · drag right to look · hold USE to throw and reel' : 'WASD walk · mouse look · hold click to throw, hold again to reel · E grab · C craft · B build', cx, V.y1 - 40, 15, DIM);
    if (panel === 'settings') drawSettings(g, false);
  }
