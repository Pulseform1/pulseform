  /* ---------- 94 menus: the main menu, settings, the crosshair designer, the armory, the match-end screen ----------
     Same canvas and helpers as the HUD. Every screen is laid out from the visible view and uiScale(), so the phone gets
     large cards and buttons and the desktop gets a compact page. */
  function slider(g, x, y, w, label, val, min, max, set, show) {
    const u = uiScale(), k = cl((val - min) / (max - min), 0, 1), h = tapH(44, 38);
    tx(g, label, x, y + h / 2, 17 * u, BONE, 'left'); const sx = x + w * .42, sw = w * .44;
    zone(sx - 14 * u, y, sw + 28 * u, h, px => { set(min + (max - min) * cl((px - sx) / sw, 0, 1)); saveAll(); }, true);
    rr(g, sx, y + h / 2 - 4 * u, sw, 8 * u, 4 * u, 'rgba(239,233,220,.18)'); rr(g, sx, y + h / 2 - 4 * u, sw * k, 8 * u, 4 * u, YOU);
    g.fillStyle = BONE; g.beginPath(); g.arc(sx + sw * k, y + h / 2, 11 * u, 0, TAU); g.fill(); tx(g, show(val), x + w, y + h / 2, 16 * u, GOLD, 'right');
  }
  function toggle(g, x, y, w, label, on, set, note) {
    const u = uiScale(), h = tapH(44, 38); tx(g, label, x, y + h / 2, 17 * u, BONE, 'left'); if (note) tx(g, note, x + w * .42, y + h / 2, 12 * u, DIM, 'left');
    btn(g, x + w - 96 * u, y + 3 * u, 96 * u, h - 6 * u, on ? 'ON' : 'OFF', () => { set(!on); saveAll(); }, { on, fill: YOU, px: 16 * u });
  }
  function fine(g, x, y, w, label, val, min, max, step, set, show) {
    const u = uiScale(), h = tapH(44, 38), bw = Math.max(h, 42 * u), k = cl((val - min) / (max - min), 0, 1), x0 = x + w * .42, vw = 74 * u;
    const sx = x0 + bw + 14 * u, sw = Math.max(40, x + w - vw - bw - 14 * u - sx), nudge = d => { set(+cl(Math.round((val + d) / step) * step, min, max).toFixed(3)); saveAll(); };
    tx(g, label, x, y + h / 2, 17 * u, BONE, 'left');
    if (sw < 90 * u) {   // too narrow for a usable track (two columns on a phone): just -, the value, +
      btn(g, x + w - bw, y, bw, h, '+', () => nudge(step), { px: 22 * u }); tx(g, show(val), (x0 + x + w) / 2, y + h / 2, 17 * u, GOLD, 'center');
      btn(g, x0, y, bw, h, '-', () => nudge(-step), { px: 22 * u }); return;
    }
    btn(g, x0, y, bw, h, '-', () => nudge(-step), { px: 22 * u });
    zone(sx - 10 * u, y, sw + 20 * u, h, px => { set(+(Math.round((min + (max - min) * cl((px - sx) / sw, 0, 1)) / step) * step).toFixed(3)); saveAll(); }, true);
    rr(g, sx, y + h / 2 - 4 * u, sw, 8 * u, 4 * u, 'rgba(239,233,220,.18)'); rr(g, sx, y + h / 2 - 4 * u, sw * k, 8 * u, 4 * u, YOU);
    g.fillStyle = BONE; g.beginPath(); g.arc(sx + sw * k, y + h / 2, 11 * u, 0, TAU); g.fill();
    btn(g, sx + sw + 14 * u, y, bw, h, '+', () => nudge(step), { px: 22 * u }); tx(g, show(val), x + w, y + h / 2, 17 * u, GOLD, 'right');
  }
  // the aim, control and sound settings, shared by the menu's settings page and the in-match panel (O): a list of rows, each
  // drawn by setRows' layout. `wide` is false when the rows are laid out in two columns, and the side notes are left out.
  function controlRows(page) {
    const R = [], u = uiScale(), h = tapH(44, 38);
    if (isTouch()) {
      R.push((g, x, y, w) => fine(g, x, y, w, 'Look speed', CFG.tsens, .3, 3, .05, v => { CFG.tsens = v; }, v => v.toFixed(2) + 'x'));
      R.push((g, x, y, w) => fine(g, x, y, w, 'Aiming / scoped', CFG.zsens, .3, 1.5, .05, v => { CFG.zsens = v; }, v => 'x' + v.toFixed(2)));
      R.push((g, x, y, w, wide) => toggle(g, x, y, w, 'Aim assist', CFG.assist, v => { CFG.assist = v; }, wide && 'slows and leans your aim near your rival'));
      R.push((g, x, y, w, wide) => toggle(g, x, y, w, 'Auto-fire', CFG.autofire, v => { CFG.autofire = v; }, wide && 'shoots when your crosshair is on them'));
      R.push((g, x, y, w) => { tx(g, 'Button layout', x, y + h / 2, 17 * u, BONE, 'left'); btn(g, x + w * .42, y, w * .58, h, Object.keys(CFG.tlay || {}).length ? 'EDIT  ·  YOURS' : 'EDIT', openTouchEdit, { px: 15 * u }); });
    } else {
      R.push((g, x, y, w) => { tx(g, 'Aim with', x, y + h / 2, 17 * u, BONE, 'left'); choice(g, x + w * .42, y, w * .58, h, [['mouse', 'MOUSE'], ['trackpad', 'TRACKPAD']], CFG.aim, v => { CFG.aim = v; CFG.aimSet = true; if (locked()) { releaseMouse(); grabMouse(); } }); });
      R.push((g, x, y, w) => CFG.aim === 'trackpad' ? fine(g, x, y, w, 'Trackpad speed', CFG.tpsens, .2, 3, .05, v => { CFG.tpsens = v; }, v => v.toFixed(2)) : fine(g, x, y, w, 'Mouse sensitivity', CFG.sens, .05, 3, .01, v => { CFG.sens = v; }, v => v.toFixed(2)));
      R.push((g, x, y, w) => fine(g, x, y, w, 'Aiming / scoped', CFG.zsens, .3, 1.5, .05, v => { CFG.zsens = v; }, v => 'x' + v.toFixed(2)));
      R.push((g, x, y, w) => { tx(g, 'Crouch (' + keyLabel('crouch') + ')', x, y + h / 2, 17 * u, BONE, 'left'); choice(g, x + w * .42, y, w * .58, h, [['hold', 'HOLD'], ['toggle', 'TOGGLE']], CFG.crouch, v => { CFG.crouch = v; keys.crouchT = false; }); });
      R.push((g, x, y, w, wide) => toggle(g, x, y, w, 'Full screen in play', CFG.full, v => { CFG.full = v; if (!v && document.fullscreenElement) try { document.exitFullscreen(); } catch (e) {} }, wide && 'stops Ctrl+W closing the tab'));
    }
    R.push((g, x, y, w) => fine(g, x, y, w, 'Field of view', fovH(), 90, 115, 1, v => { CFG.fov = v; }, v => Math.round(v) + '\u00b0'));
    R.push((g, x, y, w) => fine(g, x, y, w, 'Volume', K.save.mute ? 0 : CFG.vol == null ? 1 : CFG.vol, 0, 1, .05, v => { CFG.vol = v; if (K.save.mute && v > 0) { K.save.mute = false; K.persist(); } }, v => K.save.mute ? 'MUTED' : Math.round(v * 100) + '%'));   // (muted with the hub's sound button: turning it up turns sound back on)
    R.push((g, x, y, w, wide) => { const L = Math.round(reportedLag() * 1000); tx(g, 'Sound sync', x, y + h / 2 - (wide ? 7 * u : 0), 17 * u, BONE, 'left'); if (wide) tx(g, L ? `Bluetooth delay  ·  ${L} ms here` : 'Bluetooth delay', x, y + h / 2 + 11 * u, 10.5 * u, DIM, 'left', 700);
      choice(g, x + w * .42, y, w * .58, h, [['auto', 'AUTO'], [0, 'OFF'], [.15, wide ? '150 MS' : '150'], [.25, wide ? '250 MS' : '250'], [.35, wide ? '350 MS' : '350']], CFG.sync == null ? 'auto' : CFG.sync, v => { CFG.sync = v; }); });
    R.push((g, x, y, w, wide) => toggle(g, x, y, w, 'Show frame rate', !!CFG.fps, v => { CFG.fps = v; }, wide && 'frames a second, top right, while you play'));
    if (page) R.push((g, x, y, w) => { tx(g, 'Picture quality', x, y + h / 2, 17 * u, BONE, 'left'); choice(g, x + w * .42, y, w * .58, h, [['auto', 'AUTO'], ['low', 'FAST'], ['high', 'SHARP']], CFG.quality, v => { if (v !== CFG.quality) toast('PICTURE QUALITY CHANGES ON THE NEXT LOAD'); CFG.quality = v; }); });
    return R;
  }
  // lay the rows out from y down: one column if they fit above yMax, otherwise two side by side. Returns the y below them.
  function setRows(g, x, y, w, rows, yMax) {
    const u = uiScale(), row = tapH(44, 38) + 8 * u;
    if (y + rows.length * row <= yMax) { for (const r of rows) { r(g, x, y, w, true); y += row; } return y; }
    const gap = 36 * u, cw = (w - gap) / 2, n = Math.ceil(rows.length / 2);
    rows.forEach((r, i) => r(g, x + (i < n ? 0 : cw + gap), y + (i % n) * row, cw, false));
    return y + n * row;
  }
  // a row of options; when they cannot all sit side by side at a readable size (a narrow column on a phone), one button
  // that steps to the next option on each press instead
  const choice = (g, x, y, w, h, opts, cur, set) => {
    const bw = (w - (opts.length - 1) * 8) / opts.length, px = l => Math.min(h * .36, bw * 1.5 / Math.max(5, l.length));
    g.font = `700 ${fitPx(g, Math.min(...opts.map(o => px(o[1]))))}px ${FONT}`;
    if (opts.length > 2 && opts.some(([, l]) => g.measureText(l).width > bw - 6)) {
      const i = Math.max(0, opts.findIndex(o => o[0] === cur)), l = opts[i][1];
      btn(g, x, y, w, h, '\u2039  ' + l + '  \u203a', () => { set(opts[(i + 1) % opts.length][0]); saveAll(); }, { on: true, fill: YOU, px: Math.min(h * .4, w * 1.6 / Math.max(8, l.length + 6)) }); return;
    }
    opts.forEach(([v, label], i) => btn(g, x + i * (bw + 8), y, bw, h, label, () => { set(v); saveAll(); }, { on: cur === v, fill: YOU, px: px(label) }));
  };

  /* The menus: a bar along the top (PLAY, AGENTS, STORE, LOCKER, CROSSHAIR, CAREER, SETTINGS, and your card: operative, name, rank,
     rating, coins) over whichever page is open. PLAY: pick the mode (STANDARD, two sites; SWIFT, one site), the team size
     and the bots, then the big PLAY button takes you to agent select. Friends go through the party. */
  // the bar along the top: PLAY as a wide tab hanging from the middle, the other pages either side of it, and on the right
  // the daily spin, your card and your coins. (The crosshair has its own button on the Settings page.)
  const MENU_TABS = [['home', 'PLAY'], ['agents', 'AGENTS'], ['store', 'STORE'], ['pass', 'PASS'], ['locker', 'LOCKER'], ['crosshair', 'CROSSHAIR'], ['career', 'CAREER'], ['settings', 'SETTINGS']];
  const NAV_L = [['agents', 'AGENTS'], ['locker', 'LOCKER'], ['career', 'CAREER']], NAV_R = [['pass', 'PASS'], ['store', 'STORE'], ['settings', 'SETTINGS']];
  // a small line icon for each page of the menu
  function navIcon(g, k, cx, cy, s, col) {
    g.save(); g.translate(cx, cy); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(1.3, s * .13); g.lineCap = 'round'; g.lineJoin = 'round';
    if (k === 'agents') { g.beginPath(); g.arc(0, -s * .04, s * .5, Math.PI, TAU); g.lineTo(s * .5, s * .4); g.lineTo(-s * .5, s * .4); g.closePath(); g.stroke(); g.fillRect(-s * .32, -s * .06, s * .64, s * .2); }
    else if (k === 'locker') { g.beginPath(); g.moveTo(-s * .58, -s * .32); g.lineTo(s * .58, -s * .32); g.lineTo(s * .58, -s * .04); g.lineTo(-s * .08, -s * .04); g.lineTo(-s * .2, s * .46); g.lineTo(-s * .5, s * .46); g.lineTo(-s * .4, -s * .04); g.lineTo(-s * .58, -s * .04); g.closePath(); g.stroke(); }
    else if (k === 'career') { [[-1, .38], [0, .68], [1, 1]].forEach(([i, hh]) => g.fillRect(i * s * .36 - s * .12, s * .46 - hh * s * .92, s * .24, hh * s * .92)); }
    else if (k === 'pass') { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * .25 : s * .58; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); }
    else if (k === 'store') { g.strokeRect(-s * .44, -s * .16, s * .88, s * .62); g.beginPath(); g.arc(0, -s * .16, s * .22, Math.PI, TAU); g.stroke(); }
    else if (k === 'settings') { g.beginPath(); g.arc(0, 0, s * .25, 0, TAU); g.stroke(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; g.beginPath(); g.moveTo(Math.cos(a) * s * .42, Math.sin(a) * s * .42); g.lineTo(Math.cos(a) * s * .58, Math.sin(a) * s * .58); g.stroke(); } }
    g.restore();
  }
  /* The top bar: the mark and the name, three pages each side of PLAY (an icon and a word, lit when you are on it), then
     the daily spin, your card (your agent in a ring that fills with your level's XP) and your coins. PLAY hangs below the
     bar and says so when you are in a party or searching. It shrinks in steps on narrow screens. */
  function drawTopBar(g, V, u) {
    const h = 60 * u, W = V.x1 - V.x0, x0 = V.x0 + 60 / pxPer() + 20 * u, mid = 640, t = performance.now() / 1000;
    const go = k => { if (k === 'agents') { if (screen === 'party') UI.returnTo = 'party'; openSelect(null); } else { UI.panel = k; SH.show = null; UI.returnTo = null; screen = k === 'home' && MP.online() && !M ? 'party' : 'menu'; } click(); };
    // the bar: dark glass, lighter at the top, a hairline under it
    { const gr = g.createLinearGradient(0, V.y0, 0, V.y0 + h); gr.addColorStop(0, 'rgba(20,25,34,.97)'); gr.addColorStop(1, 'rgba(8,10,14,.95)'); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, h);
      g.fillStyle = 'rgba(239,233,220,.1)'; g.fillRect(V.x0, V.y0 + h - 1, W, 1); }
    // what fits: less space round each tab, then no icons, then no name on the left, then a narrower PLAY and shorter words, then smaller
    let cardX = V.x1 - 352 * u, slim = false, px = 11 * u, pad = 15 * u, logo = true, pw = 176 * u, NL = NAV_L, NR = NAV_R;
    const need = L2 => { g.font = `900 ${fitPx(g, px)}px ${FONT}`; return L2.reduce((a, [, n]) => a + Math.max(g.measureText(n).width, 18 * u) + pad * 2, 0); };
    const fits = () => need(NL) <= mid - pw / 2 - 8 * u - (logo ? x0 + 160 * u : x0 + 40 * u) && need(NR) <= cardX - 6 * u - (mid + pw / 2 + 8 * u);
    if (!fits()) pad = 12 * u; if (!fits()) pad = 9 * u; if (!fits()) logo = false; if (!fits()) { pw = 124 * u; NR = NAV_R.map(([k, n]) => [k, k === 'settings' ? 'SETUP' : n]); } if (!fits()) { slim = true; cardX = V.x1 - 216 * u; } while (!fits() && px > 8 * u) px -= .5 * u;   // (slim: your card is just its picture)
    // the mark: two chevrons facing each other (the duel) round a point, and the name
    { const cx = x0 + 15 * u, cy = V.y0 + h / 2, r = 13 * u; g.lineWidth = 3.2 * u; g.lineCap = 'butt'; g.lineJoin = 'miter';
      g.strokeStyle = YOU; g.beginPath(); g.moveTo(cx - r * .25, cy - r); g.lineTo(cx - r, cy); g.lineTo(cx - r * .25, cy + r); g.stroke();
      g.strokeStyle = FOE; g.beginPath(); g.moveTo(cx + r * .25, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx + r * .25, cy + r); g.stroke();
      g.fillStyle = BONE; g.beginPath(); g.moveTo(cx, cy - 4.2 * u); g.lineTo(cx + 4.2 * u, cy); g.lineTo(cx, cy + 4.2 * u); g.lineTo(cx - 4.2 * u, cy); g.closePath(); g.fill();
      if (logo) { tx(g, 'DUEL', x0 + 36 * u, cy + 1, 18 * u, BONE, 'left', 900); g.font = `900 ${fitPx(g, 18 * u)}px ${FONT}`; tx(g, 'POINT', x0 + 36 * u + g.measureText('DUEL').width + 1, cy + 1, 18 * u, FOE, 'left', 900); } }
    // the pages
    const tabs = (L2, x, dir) => { g.font = `900 ${fitPx(g, px)}px ${FONT}`; const ws = L2.map(([, n]) => Math.max(g.measureText(n).width, 18 * u) + pad * 2); if (dir < 0) x -= ws.reduce((a, b) => a + b, 0);
      L2.forEach(([k, n], i) => { const tw = ws[i], on = UI.panel === k || (k === 'settings' && (UI.panel === 'crosshair' || UI.panel === 'keys')), hot = zone(x, V.y0, tw, h, () => go(k)), sk = 8 * u;
        if (on || hot) { g.beginPath(); g.moveTo(x + sk, V.y0 + 5 * u); g.lineTo(x + tw, V.y0 + 5 * u); g.lineTo(x + tw - sk, V.y0 + h - 5 * u); g.lineTo(x, V.y0 + h - 5 * u); g.closePath(); g.fillStyle = on ? 'rgba(244,63,63,.16)' : 'rgba(239,233,220,.07)'; g.fill(); }
        const col = on ? BONE : hot ? '#dfe4ec' : DIM;
        navIcon(g, k, x + tw / 2, V.y0 + 21 * u, 15 * u, on ? FOE : col); tx(g, n, x + tw / 2, V.y0 + 43 * u, px, col, 'center', 900);   // the icon over its word
        if (on) { g.save(); g.shadowColor = FOE; g.shadowBlur = 10 * u; g.fillStyle = FOE; g.fillRect(x + pad * .6, V.y0 + h - 3 * u, tw - pad * 1.2, 3 * u); g.restore(); }
        if (k === 'pass') { const fr = passTier() >= PASS_TIERS ? 1 : (myPass().xp % PASS_XP) / PASS_XP, bw = tw - pad * 2, by = V.y0 + 51 * u; g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x + pad, by, bw, 2 * u); g.fillStyle = GOLD; g.fillRect(x + pad, by, bw * fr, 2 * u); }   // how far through this tier of the pass
        x += tw; }); };
    tabs(NL, mid - pw / 2 - 8 * u, -1); tabs(NR, mid + pw / 2 + 8 * u, 1);
    // PLAY: hangs below the bar, lit when you are on it, a slow sheen across it
    { const ph = h + 12 * u, onP = UI.panel === 'home' || screen === 'party', hotP = zone(mid - pw / 2, V.y0, pw, ph, () => go('home')), sk = 18 * u, inParty = MP.online(), search = !!QUE.mode && !QUE.found;
      const path = () => { g.beginPath(); g.moveTo(mid - pw / 2, V.y0); g.lineTo(mid + pw / 2, V.y0); g.lineTo(mid + pw / 2 - sk, V.y0 + ph); g.lineTo(mid - pw / 2 + sk, V.y0 + ph); g.closePath(); };
      g.save(); if (onP) { g.shadowColor = 'rgba(244,63,63,.75)'; g.shadowBlur = 22 * u; } path();
      const gr = g.createLinearGradient(0, V.y0, 0, V.y0 + ph); if (onP) { gr.addColorStop(0, '#ff5a52'); gr.addColorStop(1, '#d42c2c'); } else { gr.addColorStop(0, hotP ? 'rgba(244,63,63,.42)' : 'rgba(244,63,63,.22)'); gr.addColorStop(1, hotP ? 'rgba(244,63,63,.28)' : 'rgba(244,63,63,.1)'); }
      g.fillStyle = gr; g.fill(); g.restore();
      g.save(); path(); g.clip(); const k = (t * .4) % 2.2 - .4, shx = mid - pw / 2 + k * pw, sg = g.createLinearGradient(shx - 40 * u, 0, shx + 40 * u, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, onP ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.1)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.fillRect(mid - pw / 2, V.y0, pw, ph);
      g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(mid - pw / 2, V.y0, pw, 2 * u); g.restore();
      path(); g.strokeStyle = onP ? 'rgba(255,255,255,.4)' : FOE; g.lineWidth = 1.5; g.stroke();
      const sub = search ? 'SEARCHING' : inParty ? 'IN A PARTY' : '', big = Math.min(26 * u, pw * .17);
      tx(g, 'PLAY', mid, V.y0 + ph / 2 + (sub ? -6 * u : 1), big, onP ? INK : BONE, 'center', 900);
      if (sub) { g.globalAlpha = search ? .65 + .35 * Math.sin(t * 5) : 1; tx(g, sub, mid, V.y0 + ph / 2 + 15 * u, 9.5 * u, onP ? 'rgba(12,16,22,.85)' : GOLD, 'center', 900); g.globalAlpha = 1; } }
    // the daily spin: a little wheel beside your card, with a dot while today's spin is waiting
    { const s = 38 * u, wx = cardX + 2 * u, wy = V.y0 + (h - s) / 2, hot = zone(wx, wy, s, s, openWheel), ready = wheelReady(), c = wx + s / 2, cy2 = wy + s / 2, rr2 = s * .36, t2 = K.t || 0;
      g.beginPath(); g.arc(c, cy2, s / 2, 0, TAU); g.fillStyle = hot ? 'rgba(255,214,102,.18)' : 'rgba(255,255,255,.05)'; g.fill(); g.strokeStyle = hot || ready ? GOLD : 'rgba(239,233,220,.2)'; g.lineWidth = 1.5; g.stroke();
      const cols = ['#a7b1bd', '#4fa3ff', '#b56bff', '#ffb020', '#ff5ac8', '#c6ff3a']; for (let i = 0; i < 6; i++) { const a0 = t2 * (ready ? .8 : 0) + i * TAU / 6; g.beginPath(); g.moveTo(c, cy2); g.arc(c, cy2, rr2, a0, a0 + TAU / 6); g.closePath(); g.fillStyle = cols[i]; g.fill(); }
      g.fillStyle = INK; g.beginPath(); g.arc(c, cy2, rr2 * .3, 0, TAU); g.fill(); g.fillStyle = GOLD; g.beginPath(); g.moveTo(c, wy + 7 * u); g.lineTo(c - 4 * u, wy + 1 * u); g.lineTo(c + 4 * u, wy + 1 * u); g.closePath(); g.fill();
      if (ready) { g.fillStyle = FOE; g.beginPath(); g.arc(wx + s - 5 * u, wy + 6 * u, 5 * u, 0, TAU); g.fill(); } }
    // your card: your agent in a ring that fills as you earn this level's XP; a click opens your career
    { const L = levelOf(STATS.xp | 0), lv = L.l, r = 18 * u, cx = cardX + 50 * u + r + 3 * u, cy = V.y0 + h / 2, op = OPS[CFG.op] || OPS.vex;
      g.font = `900 ${fitPx(g, 13 * u)}px ${FONT}`; const nm = (MP.name || 'You').toUpperCase(), cw = slim ? r * 2 + 8 * u : r * 2 + 16 * u + Math.max(g.measureText(nm).width, 70 * u), hot = zone(cx - r - 4 * u, V.y0 + 6 * u, cw, h - 12 * u, () => go('career'));
      if (hot) rr(g, cx - r - 6 * u, V.y0 + 6 * u, cw + 4 * u, h - 12 * u, 24 * u, 'rgba(239,233,220,.07)', null);
      g.save(); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip(); portraitTile(g, CFG.op, cx - r, cy - r, r * 2, r * 2, { r: 0 }); g.restore();
      g.lineWidth = 3 * u; g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(cx, cy, r + 2.5 * u, 0, TAU); g.stroke();
      g.strokeStyle = lvCol(lv); g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy, r + 2.5 * u, -Math.PI / 2, -Math.PI / 2 + TAU * cl(L.into / L.need, .02, 1)); g.stroke(); g.lineCap = 'butt';
      if (!slim) { tx(g, nm, cx + r + 12 * u, cy - 8 * u, 13 * u, BONE, 'left', 900);
        const ls = 'LV ' + lv; g.font = `900 ${fitPx(g, 9.5 * u)}px ${FONT}`; const lw = g.measureText(ls).width + 10 * u; rr(g, cx + r + 12 * u, cy + 2 * u, lw, 15 * u, 4 * u, 'rgba(255,255,255,.08)', null); tx(g, ls, cx + r + 12 * u + lw / 2, cy + 10 * u, 9.5 * u, lvCol(lv), 'center', 900);
        tx(g, op.n, cx + r + 18 * u + lw, cy + 10 * u, 10 * u, op.col, 'left', 800); } }
    // your coins: a pill that opens the store
    { g.font = `800 ${fitPx(g, 16 * u)}px ${FONT}`; const cw = g.measureText(String(STATS.coins)).width + 16 * u * 1.5 + 22 * u, cx = V.x1 - 14 * u - cw, ch = 30 * u, cy = V.y0 + (h - ch) / 2, hot = zone(cx, cy, cw, ch, () => go('store'));
      rr(g, cx, cy, cw, ch, ch / 2, hot ? 'rgba(255,201,74,.2)' : 'rgba(255,201,74,.09)', hot ? COIN : 'rgba(255,201,74,.35)', 1.5); coinTag(g, cx + cw - 12 * u, V.y0 + h / 2 + 1, 16 * u, STATS.coins); }
    return h;
  }
  function drawMenu(g) {
    if (UI.panel === 'home' && MP.online() && !QUE.found && !M) { screen = 'party'; return drawParty(g); }
    const V = K.view, W = V.x1 - V.x0, H = V.y1 - V.y0, u = uiScale();
    if ((UI.panel === 'store' || UI.panel === 'locker') && (SH.show || SH.reveal)) return drawShop(g, V, W, H, u);   // a skin preview takes the whole screen
    g.fillStyle = 'rgba(12,16,22,.5)'; g.fillRect(V.x0, V.y0, W, H);
    const nh = drawTopBar(g, V, u), VN = Object.assign({}, V, { y0: V.y0 + nh });
    if (UI.lastPanel !== UI.panel) { UI.lastPanel = UI.panel; UI.panelT = performance.now(); }
    const fade = smooth(cl((performance.now() - (UI.panelT || 0)) / 220, 0, 1)); g.globalAlpha = .25 + .75 * fade; g.save(); g.translate(0, (1 - fade) * 10 * u); drawPage(g, VN, W, H - nh, u); g.restore(); g.globalAlpha = 1;
    drawRankScale(g, V);
  }
  function drawPage(g, VN, W, H2, u) {
    if (UI.panel === 'store' || UI.panel === 'locker') return drawShop(g, VN, W, H2, u);
    if (UI.panel === 'settings') return drawSettings(g, VN, W, u);
    if (UI.panel === 'crosshair') return drawXhair(g, VN, W, u);
    if (UI.panel === 'keys') return drawKeys(g, VN, W, u);
    if (UI.panel === 'career') return drawCareer(g, VN, W, u);
    if (UI.panel === 'pass') return drawPass(g, VN, W, u);
    drawPlay(g, VN, W, H2, u);
  }
  // a little plan for a mode card: the site diamonds with their letters, joined by lanes
  function modeGlyph(g, cx, cy, s, two, col) {
    g.strokeStyle = 'rgba(239,233,220,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - s * 1.6, cy); g.lineTo(cx + s * .4, cy); if (two) { g.moveTo(cx - s * 1.6, cy); g.quadraticCurveTo(cx - s * .2, cy - s * 1.2, cx + s * 1.1, cy - s * .9); g.moveTo(cx - s * 1.6, cy); g.quadraticCurveTo(cx - s * .2, cy + s * 1.2, cx + s * 1.1, cy + s * .9); } g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc(cx - s * 1.6, cy, s * .16, 0, TAU); g.fill();
    const dia = (x, y, L) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, y - s * .45); g.lineTo(x + s * .45, y); g.lineTo(x, y + s * .45); g.lineTo(x - s * .45, y); g.closePath(); g.fill(); if (L) tx(g, L, x, y + 1, s * .42, INK, 'center', 900); };
    if (two) { dia(cx + s * 1.1, cy - s * .9, 'A'); dia(cx + s * 1.1, cy + s * .9, 'B'); } else dia(cx + s * .7, cy, '');
  }
  /* ---- the Play page: a lobby ----
     Along the top, the kinds of match (Standard, Swift, Ranked, Online, Practice) with a line on what each is. In the middle,
     the team as tall cards: yours in the centre (your operative full length with your best rifle, your banner, level, name
     and title: a click changes operative), your bot teammates either side (a click opens a party instead, to bring friends).
     Under them the few settings the mode has, and START. In the corners: today's challenges and the season pass on the
     left, your rank and the way to play with friends on the right. */
  const MENU_TIPS = ['Stand still to shoot straight: sprays climb, so pull down.', 'Run with the knife out, then crouch, to slide.', 'Defenders can walk onto their sites during the buy phase.',
    'Ready an ability with its key, then click to use it.', 'Every key can be changed in Settings, under Keybinds.', 'Two losses in a row still pays for most of a full buy.', 'J, or the middle mouse button, pings a spot for your team.'];
  function menuHero() {
    if (!X || !ready) return null;
    const eq = STATS.equip || {}, gk = Object.keys(eq).find(k => GUNS[k] && GUNS[k].slot === 1 && eq[k]) || 'lancer';
    const f = { op: CFG.op, guns: { 1: gk, 2: 'pip', 3: 'knife' }, skins: eq[gk] ? { [gk]: eq[gk] } : {} }, key = heroKey(f);
    if (X.heroes && X.heroes.has(key)) return X.heroes.get(key);
    if (UI.heroWait !== key) { UI.heroWait = key; return null; }   // (the page shows first; the picture is made the frame after)
    try { return heroRender(f); } catch (e) { console.warn(e); (X.heroes = X.heroes || new Map()).set(key, null); return null; }
  }
  const LOBBY_MODES = [['standard', 'STANDARD'], ['swift', 'SWIFT'], ['ranked', 'RANKED'], ['online', 'ONLINE'], ['practice', 'PRACTICE']];
  const lobbyMode = () => LOBBY_MODES.some(m => m[0] === CFG.lmode) ? CFG.lmode : CFG.queue === 'ranked' ? 'ranked' : CFG.sites === 1 ? 'swift' : 'standard';
  function setLobbyMode(k) {
    CFG.lmode = k; if (k === 'standard') { CFG.sites = 2; CFG.queue = 'unrated'; } else if (k === 'swift') { CFG.sites = 1; CFG.queue = 'unrated'; } else if (k === 'ranked') { CFG.sites = 2; CFG.queue = 'ranked'; }
    if (k !== 'online' && QUE.mode) queueStop(); saveAll(); click();
  }
  // a setting as a pill: its name small above, its value, and arrows either side (each half of the pill steps one way)
  function stepPill(g, x, y, w, h, u, name, opts, cur, set) {
    const i = Math.max(0, opts.findIndex(o => o[0] === cur)), step = d => { set(opts[(i + d + opts.length) % opts.length][0]); saveAll(); click(); };
    const hl = zone(x, y, w / 2, h, () => step(-1)), hr = zone(x + w / 2, y, w / 2, h, () => step(1));
    rr(g, x, y, w, h, h / 2, 'rgba(12,16,22,.82)', hl || hr ? 'rgba(239,233,220,.5)' : 'rgba(239,233,220,.16)', 1.5);
    tx(g, name, x + w / 2, y + h * .3, 9 * u, DIM, 'center', 900); tx(g, opts[i][1], x + w / 2, y + h * .66, 13.5 * u, BONE, 'center', 900);
    tx(g, '‹', x + 14 * u, y + h / 2, 18 * u, hl ? BONE : DIM, 'center', 700); tx(g, '›', x + w - 14 * u, y + h / 2, 18 * u, hr ? BONE : DIM, 'center', 700);
  }
  // a card in the lobby. o: { me, op, art, name, title, lv, banner, label, hover, fn, empty, searching }
  function lobbyCard(g, x, y, w, h, u, o, t) {
    const O = OPS[o.op] || OPS.vex, hot = zone(x, y, w, h, o.fn);
    bannerBg(g, x, y, w, h, o.banner || 'plain', 10);
    g.save(); g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, 10); else g.rect(x, y, w, h); g.clip();
    if (o.me) { const gr = g.createRadialGradient(x + w / 2, y + h * .86, 4, x + w / 2, y + h * .7, h * .62); gr.addColorStop(0, O.col + '88'); gr.addColorStop(.5, O.col + '22'); gr.addColorStop(1, O.col + '00'); g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.save(); g.translate(x + w * .14, y + h * .95); g.rotate(-Math.PI / 2); const px = Math.min(w * .34, 110 * u); g.font = `900 ${px}px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = O.col; g.globalAlpha = .18; g.fillText(O.n, 0, 0); g.restore(); g.globalAlpha = 1;
      if (o.art) { const k = Math.min(w * 1.04 / o.art.width, h * .93 / o.art.height), dw = o.art.width * k, dh = o.art.height * k; g.drawImage(o.art, x + (w - dw) / 2, y + h - dh - h * .02 + Math.sin(t * 1.3) * 1.5 * u, dw, dh); }
      else portraitTile(g, o.op, x + w * .18, y + h * .3, w * .64, w * .64, { r: 6 }); }
    else { // an empty seat: a dark figure, or the search going on
      g.fillStyle = 'rgba(0,0,0,.32)'; const cx = x + w / 2, hy = y + h * .36; g.beginPath(); g.arc(cx, hy, w * .14, 0, TAU); g.fill(); g.beginPath(); if (g.roundRect) g.roundRect(cx - w * .3, hy + w * .2, w * .6, h, w * .16); else g.rect(cx - w * .3, hy + w * .2, w * .6, h); g.fill();
      if (o.searching) { const a = t * 3; g.strokeStyle = GOLD; g.lineWidth = 3 * u; g.beginPath(); g.arc(cx, hy, w * .2, a, a + 1.8); g.stroke(); } }
    { const gr = g.createLinearGradient(0, y + h * .66, 0, y + h); gr.addColorStop(0, 'rgba(7,9,13,0)'); gr.addColorStop(1, 'rgba(7,9,13,.92)'); g.fillStyle = gr; g.fillRect(x, y + h * .66, w, h * .34); }
    if (hot && o.hover) { g.fillStyle = 'rgba(7,9,13,.55)'; g.fillRect(x, y, w, h); tx(g, o.hover, x + w / 2, y + h * .45, Math.min(13 * u, w * .09), BONE, 'center', 900); }
    g.restore();
    rr(g, x, y, w, h, 10, null, o.me ? (hot ? BONE : 'rgba(239,233,220,.6)') : hot ? 'rgba(239,233,220,.5)' : 'rgba(239,233,220,.16)', o.me ? 2 : 1.5);
    if (o.me) { g.fillStyle = O.col; g.fillRect(x + 10, y, w - 20, 3 * u); }
    const fs = Math.min(17 * u, w * .1);
    if (o.lv) { const ls = 'LV ' + o.lv; g.font = `900 ${fitPx(g, 10 * u)}px ${FONT}`; const lw = g.measureText(ls).width + 14 * u; rr(g, x + 10 * u, y + 12 * u, lw, 18 * u, 9 * u, 'rgba(7,9,13,.75)', lvCol(o.lv), 1); tx(g, ls, x + 10 * u + lw / 2, y + 21 * u, 10 * u, lvCol(o.lv), 'center', 900); }
    if (o.me) tx(g, O.n, x + w - 10 * u, y + 21 * u, 10 * u, O.col, 'right', 900);
    tx(g, o.name, x + w / 2, y + h - (o.title || o.label ? 34 : 20) * u, fs, o.empty ? DIM : BONE, 'center', 900);
    if (o.title || o.label) tx(g, o.title || o.label, x + w / 2, y + h - 15 * u, Math.min(11 * u, w * .075), o.title ? GOLD : DIM, 'center', 800);
  }
  function drawPlay(g, V, W, H, u) {
    const touch = isTouch(), t = performance.now() / 1000, mode = lobbyMode(), ranked = mode === 'ranked', online = mode === 'online', practice = mode === 'practice';
    const L = V.x0 + 60 / pxPer() + 20 * u, R = V.x1 - 24 * u, T = V.y0 + 22 * u, B = V.y1 - 16 * u, fp = cl((R - L) * .25, 220 * u, 300 * u), fx = R - fp, mid = (L + fx - 20 * u) / 2;   // (fx: the friends column)
    { const gr = g.createRadialGradient(mid, (T + B) / 2, H * .15, mid, (T + B) / 2, W * .7); gr.addColorStop(0, 'rgba(7,9,13,.25)'); gr.addColorStop(1, 'rgba(7,9,13,.8)'); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, H); }
    // the kinds of match
    { g.font = `900 ${fitPx(g, 15 * u)}px ${FONT}`; const pad = 20 * u, ws = LOBBY_MODES.map(([, n]) => g.measureText(n).width + pad * 2), tot = ws.reduce((a, b) => a + b, 0); let x = mid - tot / 2; const ty = T + 12 * u;
      LOBBY_MODES.forEach(([k, n], i) => { const on = mode === k, hot = zone(x, ty - 18 * u, ws[i], 36 * u, () => setLobbyMode(k)); tx(g, n, x + ws[i] / 2, ty, 15 * u, on ? BONE : hot ? '#d5dbe4' : DIM, 'center', 900);
        if (on) { g.fillStyle = k === 'ranked' ? GOLD : k === 'online' ? GOLD : YOU; g.fillRect(x + pad, ty + 14 * u, ws[i] - pad * 2, 3 * u); } x += ws[i]; });
      g.fillStyle = 'rgba(239,233,220,.1)'; g.fillRect(mid - tot / 2, ty + 17 * u, tot, 1);
      const nOf = k => MAPS.filter(m => ((m.sites | 0) >= 2 ? 2 : 1) === k && !m.hidden).length;
      const desc = { standard: `Two or three sites  ·  plant, hold, retake  ·  ${nOf(2)} maps  ·  with bots`, swift: `One site  ·  short, sharp rounds  ·  ${nOf(1)} maps  ·  with bots`, ranked: 'Your rank on the line  ·  first to 5  ·  sides swap at the half',
        online: 'Real players, anywhere  ·  unrated', practice: 'The range: every gun, moving targets, no clock' }[mode];
      tx(g, desc, mid, ty + 38 * u, 12 * u, '#aeb6c2', 'center', 700); }
    // the team
    const n = practice ? 1 : online ? (CFG.oq === 2 ? 2 : 1) : teamSize(CFG.size), stripH = practice ? 0 : tapH(44, 44), startH = tapH(62, 54);
    const startY = B - startH, stripY = startY - 14 * u - stripH, cy0 = T + 70 * u, cy1 = (practice ? startY : stripY) - 16 * u;
    let ch = Math.min(470 * u, cy1 - cy0), cw = ch * .45; const gap = 16 * u, maxW = fx - 20 * u - L; if (n * cw + (n - 1) * gap > maxW) { cw = (maxW - (n - 1) * gap) / n; ch = Math.min(ch, cw / .45); }
    const cy = cy0 + (cy1 - cy0 - ch) / 2, order = [0, 1, -1, 2, -2].slice(0, n), art = menuHero(), mc = myCard(), diffN = CFG.diff === 'auto' ? (ranked ? DIFF[botLevelFor(rankStrength(CFG.size))].n : rankName(STATS.rating)) : DIFF[CFG.diff].n;
    order.forEach((slot, i) => { const x = mid - cw / 2 + slot * (cw + gap);
      if (i === 0) lobbyCard(g, x, cy, cw, ch, u, { me: true, op: CFG.op, art, name: (MP.name || 'You').toUpperCase(), title: mc.title, lv: mc.lv, banner: mc.banner, hover: 'CHANGE AGENT', fn: () => openSelect(null) }, t);
      else if (online) lobbyCard(g, x, cy, cw, ch, u, { empty: true, searching: !!QUE.mode, name: QUE.mode ? 'SEARCHING' + '.'.repeat(1 + Math.floor(t * 2) % 3) : 'TEAMMATE', label: 'from the queue', fn: () => {} }, t);
      else { lobbyCard(g, x, cy, cw, ch, u, { empty: true, name: 'BOT', label: diffN.toUpperCase() + ' BOT', lv: 0, banner: 'plain', hover: '+  PLAY WITH A FRIEND', fn: () => openParty() }, t); } });
    // the settings this mode has
    if (!practice) { const items = online ? [['MATCH', [[1, '1V1 DUEL'], [2, '2V2 TEAMS']], CFG.oq === 2 ? 2 : 1, v => { CFG.oq = v; }]]
        : [['TEAM SIZE', [[1, '1V1'], [2, '2V2'], [3, '3V3'], [4, '4V4'], [5, '5V5']], teamSize(CFG.size), v => { CFG.size = v; }],
          ...(ranked ? [] : [['ROUNDS', MATCH_LENS.map(k => [k, 'FIRST TO ' + k]), winOf(CFG.win), v => { CFG.win = v; }]]),
          ['BOTS', [['auto', 'AUTO'], ...DIFF.map((d, i) => [i, d.n.toUpperCase()])], CFG.diff, v => { CFG.diff = v; }]];
      const pw = Math.min(176 * u, (maxW - 20 * u) / items.length - 10 * u), pg = 10 * u, tot = items.length * pw + (items.length - 1) * pg; let x = mid - tot / 2;
      for (const [nm, opts, cur, set] of items) { stepPill(g, x, stripY, pw, stripH, u, nm, opts, cur, set); x += pw + pg; } }
    // START
    { const sw = Math.min(400 * u, maxW - 40 * u), sx = mid - sw / 2, searching = online && QUE.mode;
      const label = searching ? 'CANCEL' : 'START', sub = searching ? `SEARCHING ${QUE.mode}V${QUE.mode}  ·  ${Math.floor((performance.now() - QUE.t0) / 60000)}:${String(Math.floor((performance.now() - QUE.t0) / 1000) % 60).padStart(2, '0')}`
        : practice ? 'THE RANGE' : online ? `${CFG.oq === 2 ? '2V2' : '1V1'}  ·  ONLINE` : `${LOBBY_MODES.find(m => m[0] === mode)[1]}  ·  ${vsLabel(CFG.size)}  ·  ${diffN.toUpperCase()} BOTS`;
      const go = () => { if (searching) return queueStop(); if (practice) return play({ mode: 'range' }); if (online) return queueStart(CFG.oq === 2 ? 2 : 1); menuPlay(teamSize(CFG.size)); };
      btn(g, sx, startY, sw, startH, label, go, { on: true, fill: searching ? GOLD : FOE, solid: true, col: INK, px: Math.min(30 * u, startH * .44), sub }); zones[zones.length - 1].prime = true;
      g.save(); g.beginPath(); if (g.roundRect) g.roundRect(sx, startY, sw, startH, Math.min(10, startH / 4)); else g.rect(sx, startY, sw, startH); g.clip();
      const k = (t * .45) % 1.6 - .3, shx = sx + k * sw, gr = g.createLinearGradient(shx - 50 * u, 0, shx + 50 * u, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(sx, startY, sw, startH); g.restore(); }
    // the right-hand column: friends (most of it), your rank, the season and today's challenges
    { const colH = B - T + 6 * u, y0 = T - 6 * u, rkH = 50 * u, seH = Math.min(112 * u, Math.max(70 * u, colH * .2)), gp = 10 * u, frH = colH - rkH - seH - gp * 2;
      // friends
      { const on = MP.online(), ps = on ? MP.players() : [], hot = zone(fx, y0, fp, frH, () => openParty(on ? null : 'join'));   // (anywhere on the panel but CREATE: straight to joining)
        g.save(); rr(g, fx, y0, fp, frH, 12, null, null); g.clip(); g.fillStyle = 'rgba(10,22,24,.9)'; g.fillRect(fx, y0, fp, frH);
        { const gr = g.createRadialGradient(fx + fp * .5, y0 + frH, 10, fx + fp * .5, y0 + frH * .7, frH * .9); gr.addColorStop(0, 'rgba(53,224,200,.32)'); gr.addColorStop(1, 'rgba(53,224,200,0)'); g.fillStyle = gr; g.fillRect(fx, y0, fp, frH); }
        g.globalAlpha = .06; g.fillStyle = YOU; for (let i = -2; i < 6; i++) { const bx = fx + i * 60 * u + (t * 8 * u) % (60 * u); g.beginPath(); g.moveTo(bx, y0 + frH); g.lineTo(bx + frH * .5, y0); g.lineTo(bx + frH * .5 + 18 * u, y0); g.lineTo(bx + 18 * u, y0 + frH); g.closePath(); g.fill(); } g.globalAlpha = 1; g.restore();
        rr(g, fx, y0, fp, frH, 12, null, hot ? YOU : 'rgba(53,224,200,.45)', hot ? 2.5 : 1.5); g.fillStyle = YOU; g.fillRect(fx + 12, y0, fp - 24, 3 * u);
        let yy = y0 + 28 * u; tx(g, 'PLAY WITH FRIENDS', fx + 16 * u, yy, Math.min(19 * u, fp * .072), BONE, 'left', 900); yy += 20 * u;
        { g.font = `800 ${fitPx(g, 10.5 * u)}px ${FONT}`; const sub = on ? [`YOUR PARTY  ·  CODE ${MP.code}`, `CODE ${MP.code}`] : ['Up to 10 players  ·  your teams, your rules', 'Up to 10 players', '1v1 to 5v5'], s3 = sub.find(q => g.measureText(q).width <= fp - 32 * u) || sub[sub.length - 1]; tx(g, s3, fx + 16 * u, yy, 10.5 * u, on ? GOLD : '#9fd8cf', 'left', 800); } yy += 18 * u;
        // the seats: you, your friends, and the empty ones waiting
        const bh1 = tapH(48, 46), bh2 = tapH(36, 40), btnH = on ? bh1 : bh1 + 8 * u + bh2, seatRoom = y0 + frH - 14 * u - btnH - 12 * u - yy, sz = Math.min(46 * u, (fp - 32 * u - 4 * 8 * u) / 5), rows = seatRoom >= sz * 2 + 10 * u ? 2 : seatRoom >= sz ? 1 : 0;
        if (rows) { const sy = yy + (seatRoom - (rows * sz + (rows - 1) * 10 * u)) / 2; for (let i = 0; i < rows * 5; i++) { const cx = fx + 16 * u + (i % 5) * (sz + 8 * u) + sz / 2, cyy = sy + Math.floor(i / 5) * (sz + 10 * u) + sz / 2, p = on ? ps[i] : i === 0 ? { me: true } : null;
          g.beginPath(); g.arc(cx, cyy, sz / 2, 0, TAU); g.fillStyle = p ? 'rgba(14,18,26,.95)' : 'rgba(255,255,255,.04)'; g.fill(); g.strokeStyle = p ? YOU : 'rgba(159,216,207,.35)'; g.lineWidth = 1.5; if (!p) g.setLineDash([4, 4]); g.stroke(); g.setLineDash([]);
          if (p) { const op = p.me || (on && p.id === MP.id) ? CFG.op : (PARTY.prof.get(p.id) || {}).op || 'vex'; g.save(); g.beginPath(); g.arc(cx, cyy, sz / 2 - 2, 0, TAU); g.clip(); portraitTile(g, op, cx - sz / 2, cyy - sz / 2, sz, sz, { r: 0 }); g.restore();
            if (on && p.id === MP.hostId) tx(g, '★', cx + sz * .36, cyy - sz * .34, 10 * u, GOLD, 'center', 900); }
          else tx(g, '+', cx, cyy + 1, sz * .42, 'rgba(159,216,207,.7)', 'center', 700); } }
        // what to do
        let by2 = y0 + frH - 14 * u - btnH;
        if (on) btn(g, fx + 14 * u, by2, fp - 28 * u, bh1, 'OPEN YOUR PARTY', () => openParty(), { on: true, fill: YOU, solid: true, col: INK, px: Math.min(16 * u, fp * .06), sub: `${ps.length} IN  ·  ${PARTY.set.sites === 1 ? 'ONE SITE' : 'TWO SITES'}  ·  ${vsLabel(PARTY.set.size)}` });
        else { btn(g, fx + 14 * u, by2, fp - 28 * u, bh1, 'CREATE A PARTY', () => openParty('creating'), { on: true, fill: YOU, solid: true, col: INK, px: Math.min(16 * u, fp * .06), sub: 'invite with a code or a link' }); by2 += bh1 + 8 * u;
          btn(g, fx + 14 * u, by2, fp - 28 * u, bh2, 'JOIN WITH A CODE', () => openParty('join'), { px: Math.min(13 * u, fp * .05), edge: 'rgba(53,224,200,.6)' }); } }
      // your rank at this size
      { const ry = y0 + frH + gp, S = rankedOf(CFG.size), pl = placed(S), hr = zone(fx, ry, fp, rkH, () => { UI.rankScale = teamSize(CFG.size); click(); });
        rr(g, fx, ry, fp, rkH, 10, 'rgba(12,16,22,.85)', hr ? 'rgba(239,233,220,.45)' : 'rgba(239,233,220,.12)', 1.5); tierBadge(g, fx + 26 * u, ry + rkH / 2, 14 * u, S.rv, pl);
        tx(g, 'RANK  ' + vsLabel(CFG.size), fx + 48 * u, ry + 17 * u, 10 * u, DIM, 'left', 900); tx(g, pl ? rankLabel(S.rv).toUpperCase() : `PLACING ${S.n}/${PLACE_N}`, fx + 48 * u, ry + 34 * u, 13 * u, pl ? rankOf(S.rv).T.col : BONE, 'left', 900);
        tx(g, hr ? 'LADDER →' : 'LADDER', fx + fp - 12 * u, ry + rkH / 2, 10 * u, hr ? BONE : DIM, 'right', 900); }
      // the season and today
      { const sy0 = y0 + frH + gp + rkH + gp, P = myPass(), tier = passTier(), frac = tier >= PASS_TIERS ? 1 : (P.xp % PASS_XP) / PASS_XP, se = seasonNow(), C = myChallenges().filter(c => !c.weekly).slice(0, 3), hot = zone(fx, sy0, fp, seH, () => { UI.panel = 'pass'; click(); });
        rr(g, fx, sy0, fp, seH, 10, 'rgba(12,16,22,.85)', hot ? 'rgba(239,233,220,.45)' : 'rgba(239,233,220,.12)', 1.5);
        tx(g, `SEASON ${se.n}  ·  TIER ${tier}`, fx + 12 * u, sy0 + 16 * u, 10.5 * u, GOLD, 'left', 900); rr(g, fx + 12 * u, sy0 + 27 * u, fp - 24 * u, 5 * u, 2.5 * u, 'rgba(255,255,255,.08)'); if (frac > 0) rr(g, fx + 12 * u, sy0 + 27 * u, Math.max(5 * u, (fp - 24 * u) * frac), 5 * u, 2.5 * u, GOLD);
        const rh2 = (touch ? 21 : 17) * u, rws = Math.max(0, Math.min(C.length, Math.floor((seH - 44 * u) / rh2)));
        C.slice(0, rws).forEach((c, i) => { const yy = sy0 + 48 * u + i * rh2, cnt = `${c.at}/${c.n}`; g.font = `800 ${fitPx(g, 9.5 * u)}px ${FONT}`; const cntW = g.measureText(cnt).width; g.font = `700 ${fitPx(g, 10 * u)}px ${FONT}`; let s2 = (c.done ? '✓ ' : '') + c.words; const room = fp - 24 * u - cntW - 10 * u;
          if (g.measureText(s2).width > room) { while (s2.length > 4 && g.measureText(s2 + '…').width > room) s2 = s2.slice(0, -1); s2 += '…'; } tx(g, s2, fx + 12 * u, yy, 10 * u, c.done ? DIM : '#c9cfd8', 'left', 700); tx(g, cnt, fx + fp - 12 * u, yy, 9.5 * u, DIM, 'right', 800); }); } }
    if (!touch) tx(g, 'TIP  ·  ' + MENU_TIPS[Math.floor(t / 8) % MENU_TIPS.length], mid, B + 9 * u, 9.5 * u, DIM, 'center', 700);
  }
  function drawSettings(g, V, W, u) {
    const w = Math.min(W - 80, 760 * u), x = 640 - w / 2; let y = V.y0 + 24 * u;
    tx(g, 'SETTINGS', x, y + 24 * u, 36 * u, BONE, 'left'); btn(g, x + w - 150 * u, y, 150 * u, tapH(46), 'BACK', () => { UI.panel = 'home'; }, { px: 17 * u }); y += tapH(46) + 22 * u;
    y = setRows(g, x, y, w, controlRows(true), V.y1 - tapH(46) - 24 * u);
    btn(g, x, y, Math.min(w, 260 * u), tapH(46), 'CROSSHAIR', () => { UI.panel = 'crosshair'; }, { px: 16 * u, sub: 'shape, colour, presets, codes' });
    if (!isTouch()) btn(g, x + Math.min(w, 260 * u) + 12 * u, y, Math.min(w, 260 * u), tapH(46), 'KEYBINDS', () => { UI.panel = 'keys'; }, { px: 16 * u, sub: 'every key, yours to change' });
  }
  function drawOpts(g) {
    const V = K.view, W = V.x1 - V.x0, H = V.y1 - V.y0, u = uiScale();
    g.fillStyle = 'rgba(12,16,22,.86)'; g.fillRect(V.x0, V.y0, W, H); zone(V.x0, V.y0, W, H, () => {});
    if (UI.opts === 'xh') return drawXhair(g, V, W, u);
    if (UI.opts === 'keys') return drawKeys(g, V, W, u);
    const w = Math.min(W - 80, 760 * u), x = 640 - w / 2, row = tapH(44, 38) + 8 * u; let y = V.y0 + 24 * u;
    tx(g, 'SETTINGS', x, y + 24 * u, 36 * u, BONE, 'left'); btn(g, x + w - 150 * u, y, 150 * u, tapH(46), 'CLOSE', () => openOpts(false), { on: true, fill: YOU, px: 17 * u, sub: isTouch() ? '' : 'or press O' }); y += tapH(46) + 22 * u;
    y = setRows(g, x, y, w, controlRows(false), V.y1 - tapH(46) - 24 * u);
    btn(g, x, y, Math.min(w, 260 * u), tapH(46), 'CROSSHAIR', () => { UI.opts = 'xh'; }, { px: 16 * u });
    if (!isTouch()) btn(g, x + Math.min(w, 260 * u) + 12 * u, y, Math.min(w, 260 * u), tapH(46), 'KEYBINDS', () => { UI.opts = 'keys'; }, { px: 16 * u });
  }
  // keybinds: a button for each action showing its key; click it, then press the key you want (Escape keeps the old one).
  // A key already in use swaps over, so no key ever does two things.
  function drawKeys(g, V, W, u) {
    const w = Math.min(W - 80, 900 * u), x = 640 - w / 2, h = tapH(40, 34); let y = V.y0 + 20 * u;
    tx(g, 'KEYBINDS', x, y + 24 * u, 36 * u, BONE, 'left');
    btn(g, x + w - 150 * u, y, 150 * u, tapH(46), 'BACK', () => { UI.bindWait = null; if (UI.opts) UI.opts = 'main'; else UI.panel = 'settings'; }, { px: 17 * u });
    btn(g, x + w - 320 * u, y, 160 * u, tapH(46), 'RESET ALL', () => { UI.bindWait = null; CFG.binds = {}; keys = {}; saveAll(); toast('KEYS BACK TO THE USUAL'); }, { px: 15 * u, off: !CFG.binds || !Object.keys(CFG.binds).length });
    y += tapH(46) + 10 * u;
    tx(g, UI.bindWait ? 'PRESS THE KEY YOU WANT  \u00b7  ESC TO KEEP THE OLD ONE' : 'Click an action, then press its new key. Mouse buttons and the arrow keys stay as they are.', x, y + 8 * u, 12 * u, UI.bindWait ? GOLD : DIM, 'left', 800); y += 26 * u;
    const cols = W > 900 * u ? 3 : 2, gap = 22 * u, cw = (w - gap * (cols - 1)) / cols, per = Math.ceil(BINDS.length / cols), row = Math.min(h + 6 * u, (V.y1 - 16 * u - y) / per);
    BINDS.forEach(([id, label], i) => {
      const cx = x + Math.floor(i / per) * (cw + gap), cy = y + (i % per) * row, bw = cw * .44, wait = UI.bindWait === id, moved = CFG.binds && CFG.binds[id];
      tx(g, label, cx, cy + Math.min(h, row - 4 * u) / 2, Math.min(15 * u, row * .4), moved ? YOU : BONE, 'left', 700);
      btn(g, cx + cw - bw, cy, bw, Math.min(h, row - 4 * u), wait ? '\u2026' : keyLabel(id), () => { UI.bindWait = wait ? null : id; }, { on: wait, fill: GOLD, px: Math.min(15 * u, row * .38) });
    });
  }
  // the crosshair designer: four sections on the left (shape, colour, dot and outline, outer lines), the live preview,
  // the presets and the share code on the right. Opens from its own tab on the menu, and from Settings in a match (O).
  const XH_TABS = [['shape', 'SHAPE'], ['colour', 'COLOUR'], ['dot', 'DOT & OUTLINE'], ['outer', 'OUTER LINES']];
  const hueHex = h => { const l = .58, a = Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); };   // a bright, full colour at hue h
  const hexHue = c => { const r = parseInt(c.slice(1, 3), 16) / 255, gg = parseInt(c.slice(3, 5), 16) / 255, b = parseInt(c.slice(5, 7), 16) / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn; if (!d) return 0; const h = mx === r ? ((gg - b) / d) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; return (h * 60 + 360) % 360; };
  function drawXhair(g, V, W, u) {
    const w = Math.min(W - 80, 1060 * u), x = 640 - w / 2, c = CFG.xh, lw = w * .54, px = x + lw + 30 * u, pw = w - lw - 30 * u, rh = tapH(44, 38), row = rh + 8 * u, tab = UI.xhTab || 'shape', set = (k, v) => { c[k] = v; saveAll(); }, num = v => String(Math.round(v));
    let y = V.y0 + 20 * u;
    tx(g, 'CROSSHAIR', x, y + 24 * u, 36 * u, BONE, 'left'); btn(g, x + w - 150 * u, y, 150 * u, tapH(46), 'BACK', () => { if (UI.opts) UI.opts = 'main'; else UI.panel = 'home'; }, { px: 17 * u }); y += tapH(46) + 14 * u;
    // the left: a section at a time
    const sb = tapH(38, 34), tw = (lw - 3 * 6 * u) / 4; XH_TABS.forEach(([k, n], i) => btn(g, x + i * (tw + 6 * u), y, tw, sb, n, () => { UI.xhTab = k; }, { on: tab === k, fill: YOU, px: Math.min(13 * u, tw / 9) }));
    let ly = y + sb + 18 * u; const lines = c.shape === 'cross' || c.shape === 'tee' || c.shape === 'x';
    if (tab === 'shape') {
      tx(g, 'Shape', x, ly + rh / 2, 17 * u, BONE, 'left'); choice(g, x + lw * .2, ly, lw * .8, rh, [['cross', 'CROSS'], ['tee', 'TEE'], ['x', 'X'], ['circle', 'RING'], ['square', 'BOX'], ['chevron', 'CHEVRON'], ['dot', 'DOT']], c.shape, v => { c.shape = v; }); ly += row;
      if (lines || c.shape === 'chevron') { slider(g, x, ly, lw, c.shape === 'chevron' ? 'Width' : 'Length', c.len, 1, 22, v => set('len', Math.round(v)), num); ly += row; }
      if (c.shape !== 'dot') { slider(g, x, ly, lw, c.shape === 'circle' || c.shape === 'square' ? 'Size' : 'Gap', c.gap, 0, 16, v => set('gap', Math.round(v)), num); ly += row; }
      slider(g, x, ly, lw, 'Thickness', c.thick, 1, 8, v => set('thick', Math.round(v)), num); ly += row;
      if (c.shape !== 'dot') { toggle(g, x, ly, lw, 'Opens with error', c.dyn, v => { c.dyn = v; }, isTouch() ? '' : 'shows how accurate you are'); ly += row; }
    } else if (tab === 'colour') {
      tx(g, 'Colour', x, ly + rh / 2, 17 * u, BONE, 'left');
      XH_COLS.forEach((col, i) => { const sw = (lw * .8 - 11 * 5 * u) / 12, bx = x + lw * .2 + i * (sw + 5 * u); zone(bx, ly, sw, rh, () => { set('col', col); click(); }); rr(g, bx, ly + 2, sw, rh - 4, 6, col, c.col === col ? BONE : 'rgba(0,0,0,.4)', c.col === col ? 4 : 2); }); ly += row;
      { // any colour: drag along the rainbow
        tx(g, 'Any colour', x, ly + rh / 2, 17 * u, BONE, 'left'); const sx = x + lw * .42, sw = lw * .44, hy = ly + rh / 2 - 6 * u, h0 = hexHue(c.col);
        zone(sx - 14 * u, ly, sw + 28 * u, rh, px2 => { set('col', hueHex(cl((px2 - sx) / sw, 0, 1) * 359)); }, true);
        const gr = g.createLinearGradient(sx, 0, sx + sw, 0); for (let i = 0; i <= 12; i++) gr.addColorStop(i / 12, hueHex(i * 30 % 360)); rr(g, sx, hy, sw, 12 * u, 6 * u, gr);
        if (!XH_COLS.includes(c.col)) { g.fillStyle = BONE; g.beginPath(); g.arc(sx + sw * h0 / 359, hy + 6 * u, 11 * u, 0, TAU); g.fill(); g.fillStyle = c.col; g.beginPath(); g.arc(sx + sw * h0 / 359, hy + 6 * u, 7 * u, 0, TAU); g.fill(); }
        rr(g, x + lw - 34 * u, ly + rh / 2 - 13 * u, 34 * u, 26 * u, 6, c.col, BONE, 2); ly += row; }
      slider(g, x, ly, lw, 'Opacity', c.alpha == null ? 1 : c.alpha, .2, 1, v => set('alpha', Math.round(v * 20) / 20), v => Math.round(v * 100) + '%'); ly += row;
    } else if (tab === 'dot') {
      if (c.shape !== 'dot') { toggle(g, x, ly, lw, 'Centre dot', c.dot, v => { c.dot = v; }); ly += row; }
      if (c.dot || c.shape === 'dot') { slider(g, x, ly, lw, 'Dot size', c.dotSize || 0, 0, 8, v => set('dotSize', Math.round(v)), v => Math.round(v) ? num(v) : 'AUTO'); ly += row; }
      toggle(g, x, ly, lw, 'Dark outline', c.outline, v => { c.outline = v; }, isTouch() ? '' : 'stands out on bright walls'); ly += row;
      if (c.outline) { slider(g, x, ly, lw, 'Outline', c.oth || 1.5, .5, 3, v => set('oth', Math.round(v * 2) / 2), v => v.toFixed(1)); ly += row; }
    } else {
      if (!lines) { para(g, 'Outer lines need CROSS, TEE or X.', x, ly + 8 * u, lw, 13 * u, '#aeb6c2'); ly += row; }
      else {
        toggle(g, x, ly, lw, 'Outer lines', c.out, v => { c.out = v; }, isTouch() ? '' : 'a second set, further out'); ly += row;
        if (c.out) { slider(g, x, ly, lw, 'Outer length', c.olen || 4, 1, 16, v => set('olen', Math.round(v)), num); ly += row; slider(g, x, ly, lw, 'Outer gap', c.ogap || 0, 0, 20, v => set('ogap', Math.round(v)), num); ly += row; }
      }
    }
    // the right: the preview against light, dark and bright, opening the way it will when you move and shoot
    const pb = tapH(38, 34), ph = Math.max(120 * u, Math.min(250 * u, V.y1 - y - pb * 4 - 96 * u)), err = c.dyn ? (Math.sin(K.t * 2.2) * .5 + .5) * 14 : 0;
    ['#cfd8dc', '#3a4250', '#e8b06a'].forEach((bg, i) => { g.fillStyle = bg; g.fillRect(px + i * pw / 3, y, pw / 3 + 1, ph); });
    g.fillStyle = 'rgba(12,16,22,.5)'; g.fillRect(px, y + ph * .62, pw, ph * .38); [0, 1, 2].forEach(i => drawCrosshair(g, px + pw * (i + .5) / 3, y + ph * .4, i === 1 ? err : 0, Math.max(1, u * .85)));
    tx(g, 'still', px + pw / 6, y + ph - 14 * u, 12 * u, BONE); tx(g, c.dyn ? 'moving' : 'fixed', px + pw / 2, y + ph - 14 * u, 12 * u, BONE); tx(g, 'still', px + pw * 5 / 6, y + ph - 14 * u, 12 * u, BONE);
    let ry = y + ph + 22 * u; tx(g, 'PRESETS', px, ry, 12 * u, DIM, 'left'); ry += 12 * u;
    XH_PRESETS.forEach((p, i) => { const per = 5, bw = (pw - (per - 1) * 6) / per, bx = px + (i % per) * (bw + 6), by = ry + Math.floor(i / per) * (pb + 6); const { n, ...rest } = p, on = xhCode(rest) === xhCode(c);
      btn(g, bx, by, bw, pb, n.toUpperCase(), () => { CFG.xh = Object.assign({}, rest); saveAll(); }, { on, fill: YOU, px: Math.min(12 * u, bw / 6.5) }); });
    ry += Math.ceil(XH_PRESETS.length / 5) * (pb + 6) + 20 * u;
    // share it: the whole crosshair as one short code
    const code = xhCode(c); tx(g, 'SHARE CODE', px, ry, 12 * u, DIM, 'left'); ry += 12 * u;
    rr(g, px, ry, pw, pb, 6, 'rgba(255,255,255,.06)', 'rgba(239,233,220,.2)', 1); tx(g, code, px + pw / 2, ry + pb / 2, Math.min(14 * u, pw / code.length * 1.5), GOLD, 'center', 800); ry += pb + 6;
    const copied = UI.xhCopied && performance.now() - UI.xhCopied < 1500, hb = (pw - 6) / 2;
    btn(g, px, ry, hb, pb, copied ? 'COPIED' : 'COPY CODE', () => { try { navigator.clipboard.writeText(code); } catch (e) {} UI.xhCopied = performance.now(); }, { px: 12 * u });
    btn(g, px + hb + 6, ry, hb, pb, 'USE A CODE', () => { const str = window.prompt('Paste a crosshair code (it starts DPX1-)', ''); if (str == null) return; const n2 = xhFromCode(str); UI.xhMsg = n2 ? 'Crosshair loaded' : 'That isn\'t a crosshair code'; UI.xhMsgT = performance.now(); if (n2) { CFG.xh = n2; saveAll(); } }, { px: 12 * u });
    if (UI.xhMsg && performance.now() - UI.xhMsgT < 2500) tx(g, UI.xhMsg, px + pw / 2, ry + pb + 16 * u, 12 * u, UI.xhMsg[0] === 'C' ? YOU : GOLD, 'center', 800);
  }

  // The armory, laid out the way players of the genre expect: every weapon on one screen, a column per class,
  // shields on the right with the numbers for whatever you are pointing at. Press a gun you own to take it into every round;
  // each round's money buys them; press something you bought this round to sell it back. The smoke grenade sits under the heavy gun.
  const ARMORY_COLS = [[['SIDEARMS', 'Sidearm']], [['SMGS', 'SMG'], ['SHOTGUNS', 'Shotgun']], [['RIFLES', 'Rifle']], [['SNIPERS', 'Sniper'], ['HEAVY', 'Heavy'], ['UTILITY', 'Utility']], [['SHIELDS', 'Shield']]];
  const shopItem = k => GUNS[k] || (k === NADE.k ? NADE : null);
  // the Utility rows: a charge of each of your operative's bought abilities (C and Q) side by side, and the smoke
  const abItems = () => { const op = OPS[me().op]; return ['c', 'q'].map(s2 => ({ k: 'ab' + s2, s2, n: op[s2].n, short: op[s2].n, cost: op[s2].cost, col: op.col, ab: op })); };   // the two bought abilities, C and Q
  const itemsOf = cat => cat === 'Shield' ? ARMOR.map(a => ({ k: a.k, n: a.n, cost: a.cost, col: '#7fc8ff', armor: a })) : cat === 'Utility' ? [NADE, ...abItems()] : Object.values(GUNS).filter(q => q.cat === cat);
  /* THE ARMORY: everything for sale in five columns by class, as it always was. With teammates, a strip of them runs across
     the top (what each has, can spend and has just bought); the box under the shields shows the gun you point at in numbers. */
  function drawArmory(g) {
    const V = K.view, W = V.x1 - V.x0, u = uiScale(), P = me(), x = V.x0 + 20 * u, w = W - 40 * u, y0 = V.y0 + 56 * Math.min(u, 1.15), h = V.y1 - y0 - 10 * u, gap = 7 * Math.min(u, 1.2), range = M.mode === 'range';
    rr(g, x, y0, w, h, 12, 'rgba(12,16,22,.95)', 'rgba(239,233,220,.25)');
    const pad = isTouch() ? 46 / pxPer() : 0; tx(g, 'ARMORY', x + 18 * u + pad, y0 + 24 * u, 24 * u, BONE, 'left'); tx(g, `◈ ${P.credits}`, x + w - 18 * u - pad, y0 + 24 * u, 23 * u, GOLD, 'right');
    { tx(g, range ? 'Everything is free on the range' : `${pistolRound(M.round) ? 'Pistol round · ' : otRound(M.round) ? 'Overtime · ' : ''}Round starts in ${Math.max(0, Math.ceil(M.t))}${lossNext(P)}`, x + w / 2, y0 + 24 * u, 14 * u, DIM); }
    const team = range ? [] : M.fs.filter(q => q.team === P.team && !q.gone).sort((a, b) => (b === P) - (a === P)), att = !range && sideOf(P) === 'att', sth = team.length > 1 ? (isTouch() ? tapH(34, 36) : 50 * u) : 0;
    const by = y0 + 46 * u + (sth ? sth + gap : 0), bh = y0 + h - by - 12 * u, hh = fitPx(g, 12 * u) * 1.7, cw = (w - 28 * u - 4 * gap) / 5, ch = (bh - hh * 3 - 6 * gap) / 5; let focus = null;   // (the fourth column holds five rows under three headings: snipers, heavy, utility)
    /* YOUR TEAM, one tile each above the columns: operative, name, whether they are ready (✓) or still buying, their credits,
       the gun they will carry (in gold with a + if they bought it this round) with its picture, and their shield, bought
       charges and smokes. Attacking, the diamond on a tile hands that teammate the charge. */
    if (sth) team.forEach((q, i) => {
      const tx1 = x + 14 * u + i * (cw + gap), ty1 = y0 + 46 * u, I0 = q.inv0 || {}, g1 = q.guns[1], g2 = q.guns[2], main = g1 || g2, G1 = GUNS[main], fresh = g1 ? g1 !== I0.g1 : g2 !== I0.g2 && g2 !== 'pip', mine = q === P, O2 = OPS[q.op] || OPS.vex;
      rr(g, tx1, ty1, cw, sth, 8, mine ? 'rgba(53,224,200,.08)' : 'rgba(255,255,255,.04)', mine ? 'rgba(53,224,200,.5)' : 'rgba(239,233,220,.16)', 1);
      const ps = sth - 8 * u; portraitTile(g, q.op, tx1 + 4 * u, ty1 + 4 * u, ps, ps, { r: 4, dead: !q.alive });
      const bw2 = att ? Math.min(sth - 12 * u, 34 * u) : 0, rx2 = tx1 + cw - 7 * u - (bw2 ? bw2 + 6 * u : 0), lx = tx1 + ps + 11 * u, y1 = ty1 + sth * .3, y2 = ty1 + sth * .7, np = Math.min(13 * u, sth * .27);
      // the first line: name, ready or not, credits
      g.font = `800 ${fitPx(g, np)}px ${FONT}`; const crw = g.measureText('◈ ' + q.credits).width, tight = rx2 - crw - lx - 30 * u < 60 * u, [nm, npx] = fitName(g, mine ? 'YOU' : q.name.toUpperCase(), tight ? rx2 - lx - 22 * u : rx2 - crw - lx - 30 * u, np);   // (a narrow tile: the credits go down a line, so the name can be read)
      tx(g, nm, lx, y1, npx, mine ? YOU : BONE, 'left', 800); g.font = `800 ${fitPx(g, npx)}px ${FONT}`; const nw = g.measureText(nm).width, rdy = q.ready || !!(q.bot || q.isBot);
      tx(g, rdy ? '✓' : '…', lx + nw + 6 * u, y1, np * .95, rdy ? YOU : DIM, 'left', 900);
      if (!tight) tx(g, '◈ ' + q.credits, rx2, y1, np, GOLD, 'right', 800);
      // the second line: their gun, then shield, charges and smokes as far as there is room; the gun's picture at the right
      const iw = Math.min(att ? 58 * u : 70 * u, cw * .3), ih = iw * 150 / 480, ic = G1 ? gunIcon(main) : null; if (ic) g.drawImage(ic, rx2 - iw, y2 - ih / 2 + 1 * u, iw, ih);
      let cx2 = lx; const cp = Math.min(10.5 * u, sth * .22), lim = rx2 - iw - 4 * u, chip = (s2, col, px2 = cp) => { g.font = `800 ${fitPx(g, px2)}px ${FONT}`; const wd = g.measureText(s2).width; if (cx2 + wd > lim) return; tx(g, s2, cx2, y2, px2, col, 'left', 800); cx2 += wd + 7 * u; };
      if (tight) chip('◈' + q.credits, GOLD);
      if (G1 && lim - cx2 > 34 * u) { const [gn, gpx] = fitName(g, (fresh ? '+' : '') + G1.n.toUpperCase(), lim - cx2, cp * 1.08); tx(g, gn, cx2, y2, gpx, fresh ? GOLD : G1.col, 'left', 800); g.font = `800 ${fitPx(g, gpx)}px ${FONT}`; cx2 += g.measureText(gn).width + 7 * u; }
      chip('⬢' + Math.ceil(q.sh || 0), q.sh > (I0.sh | 0) ? GOLD : q.sh > 0 ? '#7fc8ff' : '#5a6272'); if ((q.ab.c | 0) > 0) chip('C' + (q.ab.c | 0), (q.ab.c | 0) > (I0.c | 0) ? GOLD : O2.col); if ((q.ab.q | 0) > 0) chip('Q' + (q.ab.q | 0), (q.ab.q | 0) > (I0.q | 0) ? GOLD : O2.col); if ((q.smokes | 0) > 0) chip('S' + q.smokes, (q.smokes | 0) > (I0.sm | 0) ? GOLD : NADE.col);
      if (att) { const has = carries(q), bx2 = tx1 + cw - bw2 - 6 * u, by2 = ty1 + (sth - bw2) / 2, can = !has && q.alive && (carries(P) || !carrier() || carrier().bot || carrier().isBot), h2 = zone(bx2, by2, bw2, bw2, () => { if (giveCharge(P, q)) click(); });   // the charge: press to hand it over
        rr(g, bx2, by2, bw2, bw2, 6, has ? 'rgba(255,214,102,.3)' : h2 && can ? 'rgba(255,214,102,.12)' : 'rgba(255,255,255,.035)', has ? GOLD : can ? 'rgba(255,214,102,.45)' : 'rgba(255,255,255,.08)', has ? 2 : 1); tx(g, '◆', bx2 + bw2 / 2, by2 + bw2 / 2, bw2 * .5, has ? GOLD : can ? 'rgba(255,214,102,.6)' : '#3c434e', 'center', 900); }
    });
    const card = (it, cx, cy, cw2 = cw) => {
      const cw = cw2, A = it.armor, AB = it.ab ? it : null, N = it === NADE ? it : null, G = A || N || AB ? null : it, sp = P.spent, lock = false;
      const on = A ? P.sh >= A.sh : AB ? (P.ab[AB.s2] | 0) >= AB.ab[AB.s2].max : N ? (P.smokes || 0) >= NADE.per : P.guns[G.slot] === it.k, mineNow = A ? sp.sh && sp.sh.k === it.k : AB ? sp[AB.k] > 0 : N ? sp.smoke > 0 : sp[G.slot] && sp[G.slot].k === it.k;
      const refund = A ? (sp.sh ? ARMOR.find(a => a.k === sp.sh.k).cost : 0) : N || AB ? 0 : (sp[G.slot] ? GUNS[sp[G.slot].k].cost : 0), can = !on && P.credits + refund >= it.cost;
      const hot = zone(cx, cy, cw, ch, () => { UI.pick = it.k; buy(P, it.k); }); if (hot || (!focus && UI.pick === it.k)) focus = it;
      rr(g, cx, cy, cw, ch, 8, on ? 'rgba(53,224,200,.14)' : hot && can ? 'rgba(255,138,61,.18)' : 'rgba(255,255,255,.045)', on ? YOU : hot || UI.pick === it.k ? 'rgba(239,233,220,.6)' : can ? 'rgba(239,233,220,.2)' : 'rgba(255,255,255,.06)');
      const tp = Math.min(15 * u, ch * .2, cw * .075), ty = cy + tp * .95;
      g.font = `700 ${fitPx(g, tp)}px ${FONT}`; const nm = it.short && g.measureText((it.n + '  ◈ 200').toUpperCase()).width > cw - 18 * u ? it.short : it.n;
      const have = (N && P.smokes) || (AB && P.ab[AB.s2]);
      // its name, and its price on the same line, or (a tile too narrow for both) along its foot
      const price = on ? (mineNow ? 'SELL' : AB ? 'FULL' : G && resale(it.k) ? `SELL ◈ ${resale(it.k)}` : 'OWNED') : have ? `${N ? P.smokes : P.ab[AB.s2]} · ◈ ${it.cost}` : it.cost ? `◈ ${it.cost}` : 'FREE', pcol = on ? YOU : can ? GOLD : '#5a6272';
      g.font = `700 ${fitPx(g, tp)}px ${FONT}`; const nmW = g.measureText(nm.toUpperCase()).width; g.font = `700 ${fitPx(g, tp * .85)}px ${FONT}`; const prW = g.measureText(price).width, foot = nmW + prW + 12 * u > cw - 17 * u;
      tx(g, nm.toUpperCase(), cx + 9 * u, ty, tp, can || on || have ? it.col : '#5a6272', 'left');
      if (foot) tx(g, price, cx + cw / 2, cy + ch - tp * .7, tp * .85, pcol, 'center'); else tx(g, price, cx + cw - 8 * u, ty, tp * .85, pcol, 'right');
      g.save(); g.globalAlpha = can || on || have ? 1 : .35; g.beginPath(); g.rect(cx + 2, cy + 2, cw - 4, ch - 4); g.clip(); const iy = cy + tp * 1.7, ih = ch - tp * 1.7 - 3;
      if (G) { const ic = gunIcon(it.k); if (ic) { const dh = Math.min(ih * (G.cat === 'Sidearm' ? 1.12 : 1.05), (cw - 12 * u) * 150 / 480 * (G.cat === 'Sidearm' ? 1.5 : G.cat === 'SMG' || G.cat === 'Shotgun' ? 1.2 : 1)), dw = dh * 480 / 150; g.drawImage(ic, cx + (cw - dw) / 2, iy + (ih - dh) / 2, dw, dh); } }
      else if (AB) { const mx = cx + cw / 2, my = iy + ih / 2, r = Math.min(ih * .36, cw * .22), mx2 = AB.ab[AB.s2].max; g.strokeStyle = it.col; g.lineWidth = 3 * u; g.beginPath(); g.arc(mx, my - 4 * u, r, 0, TAU); g.stroke(); abIcon(g, ABICON[me().op + AB.s2] || 'orb', mx, my - 4 * u, r * .62, BONE, it.col);
        rr(g, mx + r * .55, my - 4 * u + r * .35, r * .62, r * .62, 3, it.col); tx(g, AB.s2.toUpperCase(), mx + r * .86, my - 4 * u + r * .66, r * .44, INK, 'center', 900);
        for (let c = 0; c < mx2; c++) { g.fillStyle = c < (P.ab[AB.s2] | 0) ? it.col : 'rgba(255,255,255,.18)'; g.fillRect(mx - mx2 * 7 * u + c * 14 * u + 2 * u, my + r + 2 * u, 10 * u, 6 * u); } }
      else if (N) { const ih2 = ih - tp * 1.1, mx = cx + cw / 2, my = iy + ih2 / 2 + 4 * u, s2 = ih2 / 62; for (let i = 0; i < NADE.per; i++) { const ox = mx + (i - (NADE.per - 1) / 2) * 30 * s2; rr(g, ox - 10 * s2, my - 18 * s2, 20 * s2, 40 * s2, 5 * s2, '#59606b', '#9aa3ad', 1.5); g.fillStyle = NADE.col; g.fillRect(ox - 10 * s2, my - 10 * s2, 20 * s2, 5 * s2); rr(g, ox - 6 * s2, my - 25 * s2, 12 * s2, 8 * s2, 2 * s2, '#3d434b'); g.fillStyle = '#9aa3ad'; g.fillRect(ox + 6 * s2, my - 24 * s2, 3 * s2, 18 * s2); } if (!foot) tx(g, 'CARRY ' + NADE.per, mx, cy + ch - tp * .7, tp * .62, DIM); }
      else { const mx = cx + cw / 2, my = iy + ih / 2, s2 = ih / 80 * (A.sh === 50 ? 1.05 : .85); g.fillStyle = it.col + '33'; g.strokeStyle = it.col; g.lineWidth = 2.5 * u; g.beginPath(); g.moveTo(mx, my - 32 * s2); g.lineTo(mx + 26 * s2, my - 22 * s2); g.lineTo(mx + 22 * s2, my + 12 * s2); g.lineTo(mx, my + 32 * s2); g.lineTo(mx - 22 * s2, my + 12 * s2); g.lineTo(mx - 26 * s2, my - 22 * s2); g.closePath(); g.fill(); g.stroke(); tx(g, '+' + A.sh, mx, my, 20 * s2, BONE); }
      g.restore();
    };
    let endY = by;
    ARMORY_COLS.forEach((col, ci) => {
      const cx = x + 14 * u + ci * (cw + gap); let y = by;
      for (const [label, cat] of col) { tx(g, label, cx + 2, y + hh / 2, 12 * u, DIM, 'left'); y += hh;
        if (cat === 'Utility') { const its = itemsOf(cat), ab = its.filter(q => q.ab), hw = (cw - gap) / 2; ab.forEach((it, n) => card(it, cx + n * (hw + gap), y, hw)); y += ch + gap; card(NADE, cx, y, cw); y += ch + gap; continue; }   // C and Q side by side, the smoke under them
        for (const it of itemsOf(cat)) { card(it, cx, y); y += ch + gap; } }
      if (ci === 4) endY = y;
    });
    // the right column, under the shields: what you are pointing at, a buy button for a gold-edged one, and the way out
    const dx = x + 14 * u + 4 * (cw + gap), rh = tapH(50);
    const dh = by + bh - endY - rh - gap;
    rr(g, dx, endY, cw, dh, 8, 'rgba(255,255,255,.03)', 'rgba(239,233,220,.12)');
    if (focus) {
      /* What you are pointing at. A gun: what it is for, six bars (damage, fire rate, accuracy, control, range, mobility,
         with a tick on each for the gun you carry in that slot now) and its damage by range. What does not fit a short
         screen is left out from the bottom up, the description first. */
      const F = focus, G = F.armor || F === NADE || F.ab ? null : F, fp = Math.min(13 * u, cw * .062), px3 = dx + 10 * u, rx3 = dx + cw - 9 * u, yEnd = endY + dh - fp * .5; let y = endY + fp * 1.3;
      const cur = G && P.guns[G.slot] && P.guns[G.slot] !== G.k ? GUNS[P.guns[G.slot]] : null;
      g.save(); g.beginPath(); g.rect(dx, endY, cw, dh); g.clip();
      tx(g, F.n.toUpperCase(), px3, y, fp * 1.25, F.col, 'left'); tx(g, cur ? `▏YOUR ${cur.n.toUpperCase()}` : G ? G.cat.toUpperCase() : '', rx3, y, fp * .78, cur ? '#cfd6e2' : DIM, 'right'); y += fp * 1.8;
      const row = (a, b2) => { tx(g, a, px3, y, fp * .9, DIM, 'left'); tx(g, b2, rx3, y, fp * .9, BONE, 'right'); y += fp * 1.45; };
      if (G) {
        const S = gunStats(G), CS = cur ? gunStats(cur) : null, rowH = Math.min(Math.max(fp * 1.42, fitPx(g, fp * .8) * 1.45), Math.max(fitPx(g, fp * .8) * 1.12, (yEnd - y - fp * .3) / 6)), barsH = 6 * rowH,   // (on a short box the six rows close up to fit)
           tabH = Math.max(fp * 5.6, fitPx(g, fp * .8) * 5.6), room = yEnd - y;
        if (room >= barsH + tabH + fp * .9 + paraH(g, F.desc, cw - 19 * u, fp * .95, 1.25)) y = para(g, F.desc, px3, y, cw - 19 * u, fp * .95, '#cfd6e2', 1.25) + fp * .7;   // (the numbers come first: the words are added only when all of it fits)
        const wOf = (t2, px2, wt) => { g.font = `${wt} ${fitPx(g, px2)}px ${FONT}`; return g.measureText(t2).width; }, full = cw - 19 * u, lw2 = Math.max(...S.bars.map(q => wOf(q[0], fp * .8, 800))) + 9 * u, vw0 = Math.max(...S.bars.map(q => wOf(q[2], fp * .76, 700))) + 9 * u, vals = full - lw2 - vw0 >= 44 * u, bw3 = full - lw2 - (vals ? vw0 : 0), bx3 = px3 + lw2, bhh = fp * .5;
        S.bars.forEach(([lab, k, txt], i) => { tx(g, lab, px3, y, fp * .8, DIM, 'left', 800); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(bx3, y - bhh / 2, bw3, bhh); g.fillStyle = k > .66 ? YOU : k > .33 ? BONE : '#9aa4b0'; g.fillRect(bx3, y - bhh / 2, bw3 * k, bhh);
          if (CS) { g.fillStyle = '#cfd6e2'; g.fillRect(bx3 + bw3 * CS.bars[i][1] - 1 * u, y - bhh, 2 * u, bhh * 2); }
          if (vals) tx(g, txt, rx3, y, fp * .76, BONE, 'right', 700); y += rowH; });
        if (yEnd - y >= tabH) { y += fp * .5; const n = S.bands.length, c0 = px3 + (cw - 19 * u) * .28, cw4 = (cw - 19 * u) * .72 / n;   // damage by range: head, body, legs (150, a full-health rival behind a heavy shield, in gold)
          tx(g, S.pel > 1 ? `×${S.pel} PELLETS` : 'DAMAGE', px3, y, fp * .74, DIM, 'left', 800); S.bands.forEach((b2, i) => tx(g, n === 1 ? 'ANY RANGE' : b2.label, c0 + cw4 * (i + .5), y, fp * .72, '#9aa4b0', 'center', 700)); y += fp * 1.3;
          for (const [lab, key] of [['HEAD', 'head'], ['BODY', 'body'], ['LEGS', 'legs']]) { tx(g, lab, px3, y, fp * .8, DIM, 'left', 800); S.bands.forEach((b2, i) => { const v = b2[key] * S.pel; tx(g, String(b2[key]), c0 + cw4 * (i + .5), y, fp * .95, v >= 150 ? GOLD : v >= 100 ? BONE : '#b6bdc9', 'center', 800); }); y += fp * 1.32; } }
        if (yEnd - y >= fp * 1.6) { y += fp * .35; row('MAGAZINE · RELOAD', `${G.mag} · ${G.rel} s`); }
      } else {
        y = para(g, F.armor ? `Blocks the next ${F.armor.sh} damage.` : F.ab ? `${F.ab[F.s2].d} Up to ${F.ab[F.s2].max}; they carry over. E (${F.ab.e.n}) is free every round${F.ab.e.rech ? ' and comes back after ' + F.ab.e.rech + ' s' : F.ab.e.kills ? ' and comes back after ' + F.ab.e.kills + ' kills' : ''}; X (${F.ab.x.n}) is your ultimate.` : F.desc, px3, y, cw - 19 * u, fp, '#cfd6e2', 1.25) + fp * .3;
        if (F === NADE) { row('CARRY', `UP TO ${NADE.per}`); row('CLOUD', `${NADE.T} S`); }
        if (F.ab) { row('CHARGES', `${P.ab[F.s2] | 0} OF ${F.ab[F.s2].max}`); row('ULTIMATE', `${Math.min(P.ult | 0, ultCost(P))} / ${ultCost(P)} POINTS`); }
        row('PRICE', F.cost ? `◈ ${F.cost}` : 'FREE');
      }
      g.restore();
    } else para(g, `Click to buy, again to sell.  Q (${OPS[P.op].q.n}): buy  ·  E (${OPS[P.op].e.n}): free  ·  X (${OPS[P.op].x.n}): earn.`, dx + 9 * u, endY + 22 * u, cw - 18 * u, Math.min(13 * u, cw * .062), DIM);
    // REBUY: last round's loadout in one press, beside READY
    const rbc = !range && P.lastBuy ? rebuyCost(P) : 0, half = rbc > 0;
    if (half) btn(g, dx, by + bh - rh, cw * .48, rh, 'REBUY', () => { if (!rebuy(P)) click(); }, { px: rh * .3, sub: '◈ ' + rbc, col: P.credits >= rbc ? GOLD : '#5a6272', edge: GOLD });
    btn(g, half ? dx + cw * .52 : dx, by + bh - rh, half ? cw * .48 : cw, rh, range ? 'CLOSE' : 'READY', () => openArmory(false), { on: true, fill: YOU, px: rh * (half ? .32 : .4), sub: isTouch() ? '' : 'or press B' });
  }

  // a coin count: a little gold disc and the number, right-aligned at x
  function coinTag(g, x, y, px, n) {
    const s = String(n); px = fitPx(g, px); g.font = `800 ${px}px ${FONT}`; const w = g.measureText(s).width;   // (the size the words will really be drawn at, so the coin sits clear of them)
    tx(g, s, x, y, px, COIN, 'right', 800);
    const cx = x - w - px * .75; g.fillStyle = COIN; g.beginPath(); g.arc(cx, y, px * .48, 0, TAU); g.fill(); g.strokeStyle = '#8a6210'; g.lineWidth = px * .1; g.beginPath(); g.arc(cx, y, px * .3, 0, TAU); g.stroke();
  }
  function drawOver(g) {
    if (M.prog && !(M.overStage | 0)) return drawLineup(g); if (M.prog && M.overStage === 1) return drawRewards(g);   // (93-after: the line-up, then what the match paid, then this)
    const V = K.view, W = V.x1 - V.x0, H = V.y1 - V.y0, u = uiScale(), P = me(), F = foe(), won = M.over.won;
    g.fillStyle = 'rgba(12,16,22,.78)'; g.fillRect(V.x0, V.y0, W, H);
    if (M.prog) btn(g, V.x0 + (isTouch() ? 92 : 24) * u, V.y0 + 20 * u, 130 * u, tapH(36), '‹ REWARDS', () => { M.overStage = 1; M.overT = performance.now() - 5000; }, { px: 13 * u });
    tx(g, won ? 'VICTORY' : 'DEFEAT', 640, V.y0 + 90 * u, 84 * u, won ? YOU : FOE); tx(g, `${M.wins[0]}  –  ${M.wins[1]}`, 640, V.y0 + 170 * u, 44 * u, BONE);
    if (M.over.why === 'left') tx(g, M.fs.length > 2 ? 'The other team left the match' : 'Your rival left the match', 640, V.y0 + 212 * u, 15 * u, DIM);
    else if (M.over.why === 'dropped') tx(g, 'You lost the connection to the room, and could not get back in', 640, V.y0 + 212 * u, 15 * u, DIM);
    const rows = [['Combat score', f => csOf(f)], ['Kills', f => f.stat.k], ['First kills', f => f.stat.fk | 0], ['Headshots', f => f.stat.hs], ['Damage dealt', f => Math.round(f.stat.dmg)], ['Accuracy', f => f.net ? '—' : f.stat.shots ? Math.round(100 * f.stat.hits / f.stat.shots) + '%' : '—']], tw = 560 * u;
    // the MVPs: the best combat score in the match, and the best on the other team
    const best = list => list.filter(f => !f.gone).sort((a, b) => csOf(b) - csOf(a))[0], wT = M.wins[0] >= M.wins[1] ? P.team : 1 - P.team, mvp = best(M.fs.filter(f => f.team === wT)), tmvp = best(M.fs.filter(f => f.team !== wT));
    let ty = V.y0 + 250 * u, cy;
    if (M.fs.length > 2) {   // a team match: everyone, your team first (you at the top), then the rivals, best first; the rows shrink to fit 5v5
      ty = V.y0 + 236 * u; const mine = M.fs.filter(f => f.team === P.team).sort((a, b) => csOf(b) - csOf(a)), theirs = M.fs.filter(f => f.team !== P.team).sort((a, b) => csOf(b) - csOf(a)), n = mine.length + theirs.length;
      const hh = 26 * u, rh = Math.max(18 * u, Math.min(30 * u, (V.y1 - 150 * u - ty - hh - 18 * u) / n)), th = hh + n * rh + 8 * u + 10 * u, x0 = 640 - tw / 2;
      const cols = [['SCORE', f => csOf(f), 250], ['K', f => f.stat.k, 200], ['D', f => f.stat.d, 160], ['FK', f => f.stat.fk | 0, 120], ['DMG', f => Math.round(f.stat.dmg), 40]];
      rr(g, x0, ty, tw, th, 10, GLASS); tx(g, 'SCOREBOARD', x0 + 16 * u, ty + hh / 2 + 3 * u, 11 * u, DIM, 'left', 900); for (const [k, , dx] of cols) tx(g, k, x0 + tw - dx * u, ty + hh / 2 + 3 * u, 11 * u, DIM, 'right', 900);
      let y = ty + hh; const row = (f, col) => { if (f === P) { g.fillStyle = 'rgba(53,224,200,.12)'; g.fillRect(x0 + 4 * u, y + 1, tw - 8 * u, rh - 2); } g.fillStyle = col; g.fillRect(x0 + 4 * u, y + 2, 3 * u, rh - 4);
        portraitTile(g, f.op, x0 + 12 * u, y + 2, rh - 4, rh - 4, { r: 3, dead: !!f.gone }); const [nm2, np2] = fitName(g, f.name.toUpperCase() + (f === P ? (/^you$/i.test(f.name) ? '' : '  (YOU)') : f.bot || f.isBot ? '  · BOT' : ''), tw - 300 * u - rh - (f === mvp || f === tmvp ? 74 * u : 0), Math.min(14 * u, rh * .52)); tx(g, nm2, x0 + 18 * u + rh, y + rh / 2, np2, f === P ? YOU : BONE, 'left', 800);
        if (f === mvp || f === tmvp) { g.font = `800 ${fitPx(g, np2)}px ${FONT}`; const bx = x0 + 24 * u + rh + g.measureText(nm2).width, lab = f === mvp ? 'MVP' : 'TEAM MVP'; rr(g, bx, y + rh * .2, (lab.length * 7.2 + 10) * u, rh * .6, 4, f === mvp ? 'rgba(255,214,102,.25)' : 'rgba(239,233,220,.1)', f === mvp ? GOLD : 'rgba(239,233,220,.4)', 1); tx(g, lab, bx + (lab.length * 7.2 + 10) * u / 2, y + rh / 2, Math.min(10 * u, rh * .38), f === mvp ? GOLD : BONE, 'center', 900); }
        for (const [, fn, dx] of cols) tx(g, String(fn(f)), x0 + tw - dx * u, y + rh / 2, Math.min(16 * u, rh * .58), BONE, 'right', 800); y += rh; };
      mine.forEach(f => row(f, YOU)); y += 8 * u; theirs.forEach(f => row(f, FOE));
      cy = ty + th + 30 * u;
    } else {
      rr(g, 640 - tw / 2, ty, tw, (rows.length + 1) * 34 * u + 14 * u, 10, GLASS);
      tx(g, (mvp === P ? '★ ' : '') + P.name.toUpperCase(), 640 - 70 * u, ty + 26 * u, 15 * u, YOU, 'right'); tx(g, F.name.toUpperCase() + (mvp === F ? ' ★' : ''), 640 + 70 * u, ty + 26 * u, 15 * u, FOE, 'left');
      rows.forEach(([label, fn], i) => { const y = ty + (i + 1) * 34 * u + 26 * u; tx(g, label, 640, y, 13 * u, DIM); tx(g, String(fn(P)), 640 - 110 * u, y, 22 * u, BONE, 'right'); tx(g, String(fn(F)), 640 + 110 * u, y, 22 * u, BONE, 'left'); });
      cy = ty + (rows.length + 1) * 34 * u + 44 * u;
    }
    // what the match paid, and where the adaptive bot goes next
    if (M.rankRes) drawRankResult(g, 640 - 280 * u - 250 * u, V.y0 + 236 * u, 250 * u, u);
    if (UI.rankScale) drawRankScale(g, V);
    if (M.rated) { const r = M.rated; tx(g, `Rating ${r.after} (${r.after >= r.before ? '+' : ''}${r.after - r.before})   ·   next bot: ${rankName(r.after)}`, 640, cy, 15 * u, DIM); }
    // coins: the total counts up, the reasons beside it, and how far it takes you toward the rarest skin
    if (M.pay) { const t = (performance.now() - M.payT) / 1000, shown = Math.round(M.pay.total * smooth(cl(t / 1.4, 0, 1))), px0 = 640 + 280 * u, py0 = V.y0 + 236 * u;
      rr(g, px0, py0, 250 * u, (M.pay.rows.length + 2) * 22 * u + 44 * u, 10, GLASS); tx(g, 'COINS', px0 + 16 * u, py0 + 20 * u, 12 * u, COIN, 'left', 900); coinTag(g, px0 + 234 * u, py0 + 20 * u, 22 * u, '+' + shown);
      M.pay.rows.forEach(([a, b], i) => { const y = py0 + 50 * u + i * 22 * u, a2 = cl((t - .2 - i * .12) / .25, 0, 1); g.save(); g.globalAlpha = a2; tx(g, a, px0 + 16 * u, y, 12 * u, '#c9cfd8', 'left', 700); tx(g, (b >= 0 ? '+' : '') + b, px0 + 234 * u, y, 12 * u, b >= 0 ? BONE : WARN, 'right', 800); g.restore(); });
      const yb = py0 + 50 * u + M.pay.rows.length * 22 * u + 6 * u, frac = cl(M.pay.total / RARITY.mythic.price, 0, 1); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(px0 + 16 * u, yb, 218 * u, 5 * u); g.fillStyle = RARITY.mythic.col; g.fillRect(px0 + 16 * u, yb, 218 * u * frac * smooth(cl(t / 1.4, 0, 1)), 5 * u);
      tx(g, `${Math.round(frac * 100)}% of a Mythic  ·  you have ${STATS.coins}`, px0 + 16 * u, yb + 16 * u, 10 * u, DIM, 'left', 700); }
    const by = Math.min(V.y1 - 80 * u, cy + 40 * u);
    btn(g, 640 - 250 * u, by, 240 * u, tapH(56), M.online ? 'BACK TO THE ROOM' : 'PLAY AGAIN', () => { if (M.online) { toMenu(); openParty(); } else play(soloOpts()); }, { on: true, fill: FOE, px: 19 * u });
    btn(g, 640 + 10 * u, by, 240 * u, tapH(56), 'MENU', toMenu, { px: 19 * u });
  }
