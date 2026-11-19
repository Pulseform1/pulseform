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
    btn(g, x0, y, bw, h, '-', () => nudge(-step), { px: 22 * u });
    zone(sx - 10 * u, y, sw + 20 * u, h, px => { set(+(Math.round((min + (max - min) * cl((px - sx) / sw, 0, 1)) / step) * step).toFixed(3)); saveAll(); }, true);
    rr(g, sx, y + h / 2 - 4 * u, sw, 8 * u, 4 * u, 'rgba(239,233,220,.18)'); rr(g, sx, y + h / 2 - 4 * u, sw * k, 8 * u, 4 * u, YOU);
    g.fillStyle = BONE; g.beginPath(); g.arc(sx + sw * k, y + h / 2, 11 * u, 0, TAU); g.fill();
    btn(g, sx + sw + 14 * u, y, bw, h, '+', () => nudge(step), { px: 22 * u }); tx(g, show(val), x + w, y + h / 2, 17 * u, GOLD, 'right');
  }
  // the aim and control settings, shared by the menu's settings page and the in-match panel (O)
  function controlRows(g, x, y, w, row) {
    const u = uiScale(), h = tapH(44, 38);
    if (isTouch()) {
      fine(g, x, y, w, 'Look speed', CFG.tsens, .3, 3, .05, v => { CFG.tsens = v; }, v => v.toFixed(2) + 'x'); y += row;
      fine(g, x, y, w, 'Aiming / scoped', CFG.zsens, .3, 1.5, .05, v => { CFG.zsens = v; }, v => 'x' + v.toFixed(2)); y += row;
      toggle(g, x, y, w, 'Aim assist', CFG.assist, v => { CFG.assist = v; }, 'slows and leans your aim near your rival'); y += row;
      toggle(g, x, y, w, 'Auto-fire', CFG.autofire, v => { CFG.autofire = v; }, 'shoots when your crosshair is on them'); y += row;
    } else {
      tx(g, 'Aim with', x, y + h / 2, 17 * u, BONE, 'left'); choice(g, x + w * .42, y, w * .58, h, [['mouse', 'MOUSE'], ['trackpad', 'TRACKPAD']], CFG.aim, v => { CFG.aim = v; CFG.aimSet = true; if (locked()) { releaseMouse(); grabMouse(); } }); y += row;
      if (CFG.aim === 'trackpad') {
        fine(g, x, y, w, 'Trackpad speed', CFG.tpsens, .2, 3, .05, v => { CFG.tpsens = v; }, v => v.toFixed(2)); y += row;
        toggle(g, x, y, w, 'Aim assist', CFG.tpassist, v => { CFG.tpassist = v; }, 'slows and leans your aim on a rival · V fires too'); y += row;
      } else { fine(g, x, y, w, 'Mouse sensitivity', CFG.sens, .05, 3, .01, v => { CFG.sens = v; }, v => v.toFixed(2)); y += row; }
      fine(g, x, y, w, 'Aiming / scoped', CFG.zsens, .3, 1.5, .05, v => { CFG.zsens = v; }, v => 'x' + v.toFixed(2)); y += row;
      tx(g, 'Crouch (Ctrl or C)', x, y + h / 2, 17 * u, BONE, 'left'); choice(g, x + w * .42, y, w * .58, h, [['hold', 'HOLD'], ['toggle', 'TOGGLE']], CFG.crouch, v => { CFG.crouch = v; keys.crouchT = false; }); y += row;
      toggle(g, x, y, w, 'Full screen in play', CFG.full, v => { CFG.full = v; if (!v && document.fullscreenElement) try { document.exitFullscreen(); } catch (e) {} }, 'stops Ctrl+W closing the tab'); y += row;
    }
    return y;
  }
  const choice = (g, x, y, w, h, opts, cur, set) => opts.forEach(([v, label], i) => { const bw = (w - (opts.length - 1) * 8) / opts.length; btn(g, x + i * (bw + 8), y, bw, h, label, () => { set(v); saveAll(); }, { on: cur === v, fill: YOU, px: Math.min(h * .36, bw * 1.5 / Math.max(5, label.length)) }); });

  /* The menus: a bar along the top (PLAY, AGENTS, STORE, LOCKER, CROSSHAIR, CAREER, SETTINGS, and your card: operative, name, rank,
     rating, coins) over whichever page is open. PLAY: pick the mode (STANDARD, two sites; SWIFT, one site), the team size
     and the bots, then the big PLAY button takes you to agent select. Friends go through the party. */
  const MENU_TABS = [['home', 'PLAY'], ['agents', 'AGENTS'], ['store', 'STORE'], ['locker', 'LOCKER'], ['crosshair', 'CROSSHAIR'], ['career', 'CAREER'], ['settings', 'SETTINGS']];
  function drawTopBar(g, V, u) {
    const h = 56 * u, W = V.x1 - V.x0, x0 = V.x0 + 60 / pxPer() + 20 * u;
    g.fillStyle = 'rgba(8,10,14,.94)'; g.fillRect(V.x0, V.y0, W, h); g.fillStyle = 'rgba(239,233,220,.08)'; g.fillRect(V.x0, V.y0 + h - 1, W, 1);
    g.fillStyle = FOE; g.fillRect(x0, V.y0 + 17 * u, 4 * u, 22 * u); tx(g, 'DUELPOINT', x0 + 12 * u, V.y0 + h / 2 + 1, 19 * u, BONE, 'left', 900);
    const logoEnd = x0 + 140 * u, cardX = V.x1 - 300 * u, tw = Math.min(112 * u, (cardX - logoEnd - 16 * u) / MENU_TABS.length), tx0 = Math.max(logoEnd + 8 * u, Math.min(640 - MENU_TABS.length * tw / 2, cardX - 8 * u - MENU_TABS.length * tw));   // the tabs fit between the name and your card
    MENU_TABS.forEach(([k, n], i) => { const x = tx0 + i * tw, on = UI.panel === k, hot = zone(x, V.y0, tw, h, () => { if (k === 'agents') openSelect(null); else { UI.panel = k; SH.show = null; UI.returnTo = null; } click(); });
      tx(g, n, x + tw / 2, V.y0 + h / 2 + 1, Math.min(13 * u, tw / 7.5), on ? BONE : hot ? '#d5dbe4' : DIM, 'center', 900); if (on) { g.fillStyle = FOE; g.fillRect(x + 16 * u, V.y0 + h - 4 * u, tw - 32 * u, 3 * u); } });
    const px = V.x1 - 290 * u; portraitTile(g, CFG.op, px, V.y0 + 8 * u, 40 * u, 40 * u, { r: 4 });
    tx(g, (MP.name || 'You').toUpperCase(), px + 50 * u, V.y0 + 20 * u, 13 * u, BONE, 'left', 900); rankBadge(g, px + 57 * u, V.y0 + 38 * u, 7 * u, STATS.rating);
    tx(g, rankName(STATS.rating).toUpperCase() + '  ' + STATS.rating, px + 69 * u, V.y0 + 38 * u, 10 * u, RANK_COL[diffFor(STATS.rating).i], 'left', 800);
    coinTag(g, V.x1 - 22 * u, V.y0 + h / 2, 17 * u, STATS.coins);
    return h;
  }
  function drawMenu(g) {
    const V = K.view, W = V.x1 - V.x0, H = V.y1 - V.y0, u = uiScale();
    if ((UI.panel === 'store' || UI.panel === 'locker') && (SH.show || SH.reveal)) return drawShop(g, V, W, H, u);   // a skin preview takes the whole screen
    g.fillStyle = 'rgba(12,16,22,.5)'; g.fillRect(V.x0, V.y0, W, H);
    const nh = drawTopBar(g, V, u), VN = Object.assign({}, V, { y0: V.y0 + nh });
    if (UI.lastPanel !== UI.panel) { UI.lastPanel = UI.panel; UI.panelT = performance.now(); }
    const fade = smooth(cl((performance.now() - (UI.panelT || 0)) / 220, 0, 1)); g.globalAlpha = .25 + .75 * fade; g.save(); g.translate(0, (1 - fade) * 10 * u); drawPage(g, VN, W, H - nh, u); g.restore(); g.globalAlpha = 1;
  }
  function drawPage(g, VN, W, H2, u) {
    if (UI.panel === 'store' || UI.panel === 'locker') return drawShop(g, VN, W, H2, u);
    if (UI.panel === 'settings') return drawSettings(g, VN, W, u);
    if (UI.panel === 'crosshair') return drawXhair(g, VN, W, u);
    if (UI.panel === 'career') return drawCareer(g, VN, W, u);
    drawPlay(g, VN, W, H2, u);
  }
  // a little plan for a mode card: the site diamonds with their letters, joined by lanes
  function modeGlyph(g, cx, cy, s, two, col) {
    g.strokeStyle = 'rgba(239,233,220,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - s * 1.6, cy); g.lineTo(cx + s * .4, cy); if (two) { g.moveTo(cx - s * 1.6, cy); g.quadraticCurveTo(cx - s * .2, cy - s * 1.2, cx + s * 1.1, cy - s * .9); g.moveTo(cx - s * 1.6, cy); g.quadraticCurveTo(cx - s * .2, cy + s * 1.2, cx + s * 1.1, cy + s * .9); } g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc(cx - s * 1.6, cy, s * .16, 0, TAU); g.fill();
    const dia = (x, y, L) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, y - s * .45); g.lineTo(x + s * .45, y); g.lineTo(x, y + s * .45); g.lineTo(x - s * .45, y); g.closePath(); g.fill(); if (L) tx(g, L, x, y + 1, s * .42, INK, 'center', 900); };
    if (two) { dia(cx + s * 1.1, cy - s * .9, 'A'); dia(cx + s * 1.1, cy + s * .9, 'B'); } else dia(cx + s * .7, cy, '');
  }
  function drawPlay(g, V, W, H, u) {
    const x0 = V.x0 + 60 / pxPer() + 20 * u, touch = isTouch(), O = OPS[CFG.op] || OPS.vex, sites = CFG.sites === 1 ? 1 : 2, top = V.y0 + 46 * u;
    tx(g, 'CHOOSE A MODE', x0, V.y0 + 26 * u, 12 * u, DIM, 'left', 900);
    const modes = [{ k: 2, n: 'STANDARD', sub: 'TWO OR THREE SITES', d: 'Big maps, each with its own twist: walls you shoot down, blast doors, jump pads, belts, three sites. Read the defence, choose a site, plant.', col: '#ff9a3c', maps: '6 MAPS · 100-105 S ROUNDS' },
      { k: 1, n: 'SWIFT', sub: 'ONE SITE', d: 'One site and three ways in, with a twist on every map: teleporters, ice, sandstorms, tall grass, steam, low gravity.', col: YOU, maps: '7 MAPS · 80-90 S ROUNDS' }];
    const rw = 330 * u, cw = Math.min(330 * u, (V.x1 - x0 - rw - 70 * u) / 2 - 8 * u), ch = Math.min(250 * u, H * .42);
    modes.forEach((md, i) => {
      const x = x0 + i * (cw + 16 * u), on = sites === md.k, hot = zone(x, top, cw, ch, () => { CFG.sites = md.k; saveAll(); click(); });
      g.save(); g.beginPath(); if (g.roundRect) g.roundRect(x, top, cw, ch, 10); else g.rect(x, top, cw, ch); g.clip();
      const gr = g.createLinearGradient(x, top + ch, x + cw, top); gr.addColorStop(0, md.col + (on ? '55' : '22')); gr.addColorStop(1, 'rgba(14,18,26,.94)'); g.fillStyle = 'rgba(14,18,26,.94)'; g.fillRect(x, top, cw, ch); g.fillStyle = gr; g.fillRect(x, top, cw, ch);
      g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 1; g.beginPath(); for (let k = -ch; k < cw; k += 12) { g.moveTo(x + k, top + ch); g.lineTo(x + k + ch, top); } g.stroke();
      modeGlyph(g, x + cw * .6, top + ch * .4, Math.min(38 * u, ch * .15), md.k === 2, md.col); g.restore();
      rr(g, x, top, cw, ch, 10, null, on ? md.col : hot ? 'rgba(239,233,220,.5)' : 'rgba(239,233,220,.14)', on ? 3 : 1.5);
      tx(g, md.sub, x + 18 * u, top + 24 * u, 11 * u, md.col, 'left', 900); tx(g, md.n, x + 16 * u, top + ch - 92 * u, 34 * u, BONE, 'left', 900);
      para(g, md.d, x + 18 * u, top + ch - 62 * u, cw - 36 * u, 12 * u, '#c9cfd8'); tx(g, md.maps, x + 18 * u, top + ch - 16 * u, 10 * u, DIM, 'left', 800);
      if (on) tx(g, '✓ SELECTED', x + cw - 16 * u, top + 24 * u, 11 * u, md.col, 'right', 900);
    });
    // team size and the bots
    let y = top + ch + 26 * u; const lw = cw * 2 + 16 * u;
    tx(g, 'TEAM SIZE', x0, y, 12 * u, DIM, 'left', 900); choice(g, x0 + 110 * u, y - tapH(34) / 2, lw - 110 * u, tapH(34), [[3, '3V3 · TWO TEAMMATES'], [2, '2V2 · A TEAMMATE'], [1, '1V1 · A DUEL']], teamSize(CFG.size), v => { CFG.size = v; saveAll(); }); y += tapH(34) + 14 * u;
    tx(g, 'BOT LEVEL', x0, y, 12 * u, DIM, 'left', 900); choice(g, x0 + 110 * u, y - tapH(34) / 2, lw - 110 * u, tapH(34), [['auto', 'AUTO'], ...DIFF.map((d, i) => [i, d.n.toUpperCase()])], CFG.diff, v => { CFG.diff = v; }); y += tapH(34) + 14 * u;
    if (!touch && y + 70 * u < V.y1) { tx(g, 'HOW IT PLAYS', x0, y + 6 * u, 11 * u, DIM, 'left', 900); ['Stand still to shoot straight; tap the opposite key to stop dead. Sprays climb: pull down.', 'Shift sprints, crouch mid-sprint slides. B opens the armory (buy Q there), F plants, defuses and takes orbs, E is free each round, X is your ultimate.'].forEach((l, i) => tx(g, l, x0, y + 26 * u + i * 18 * u, 11.5 * u, '#aeb6c2', 'left', 600)); }
    // the right column: your operative, friends, practice
    const rx = V.x1 - rw - 30 * u; let ry = top;
    { const h = 120 * u, hot = zone(rx, ry, rw, h, () => openSelect(null)); rr(g, rx, ry, rw, h, 10, 'rgba(14,18,26,.94)', hot ? O.col : 'rgba(239,233,220,.14)', hot ? 2 : 1.5);
      portraitTile(g, CFG.op, rx + 10 * u, ry + 10 * u, h - 20 * u, h - 20 * u, { r: 6 }); tx(g, 'YOUR OPERATIVE', rx + h + 4 * u, ry + 24 * u, 10 * u, DIM, 'left', 900); tx(g, O.n, rx + h + 2 * u, ry + 54 * u, 28 * u, BONE, 'left', 900);
      tx(g, `${O.q.n} · ${O.e.n}`, rx + h + 4 * u, ry + 80 * u, 12 * u, O.col, 'left', 800); tx(g, hot ? 'CHANGE →' : 'CHANGE', rx + rw - 14 * u, ry + h - 16 * u, 10 * u, hot ? O.col : DIM, 'right', 900); ry += h + 14 * u; }
    { const h = 104 * u; rr(g, rx, ry, rw, h, 10, 'rgba(14,18,26,.94)', 'rgba(239,233,220,.14)', 1.5); tx(g, 'PLAY WITH FRIENDS', rx + 16 * u, ry + 24 * u, 12 * u, YOU, 'left', 900); tx(g, 'up to six, your teams, your rules', rx + 16 * u, ry + 44 * u, 11 * u, '#aeb6c2', 'left', 700);
      btn(g, rx + 16 * u, ry + 56 * u, rw - 32 * u, 36 * u, MP.online() ? 'BACK TO YOUR PARTY · ' + MP.code : 'OPEN A PARTY', () => openParty(), { on: true, fill: YOU, solid: true, col: INK, px: 14 * u }); ry += h + 14 * u; }
    btn(g, rx, ry, (rw - 10 * u) / 2, tapH(42), 'PRACTICE RANGE', () => play({ mode: 'range' }), { px: 13 * u }); btn(g, rx + (rw + 10 * u) / 2, ry, (rw - 10 * u) / 2, tapH(42), 'ARMORY', () => { play({ mode: 'range' }); openArmory(true); }, { px: 13 * u, sub: 'try every gun' });
    // PLAY
    const lvl = (CFG.diff === 'auto' ? rankName(STATS.rating) : DIFF[CFG.diff].n) + ' bots', ph = 72 * u, below = ry + tapH(42) + 12 * u, roomy = V.y1 - ph - 64 * u >= below, pyy = roomy ? V.y1 - ph - 64 * u : below, pw = roomy ? rw : rw - 84 * u;   // clear of the sound button in the corner, and of the buttons above
    btn(g, rx, pyy, pw, ph, 'PLAY', () => menuPlay(teamSize(CFG.size)), { on: true, fill: FOE, solid: true, col: INK, px: 36 * u, sub: `${sites === 2 ? 'STANDARD' : 'SWIFT'} · ${vsLabel(CFG.size)}` + (roomy ? ` · ${lvl}` : '') }); zones[zones.length - 1].prime = true;
    if (!touch && roomy) tx(g, KNAV.on ? 'Arrow keys move · Enter selects · Esc goes back' : 'Enter plays · the arrow keys work here too', rx + pw / 2, pyy - 12 * u, 10 * u, DIM, 'center', 700);
  }
  // CAREER: your record, your rank and the ladder, your collection
  function drawCareer(g, V, W, u) {
    const x0 = V.x0 + 60 / pxPer() + 20 * u, top = V.y0 + 40 * u, i = diffFor(STATS.rating).i;
    tx(g, 'CAREER', x0, top, 34 * u, BONE, 'left', 900);
    const card = (x, y, w, h, label, val, col) => { rr(g, x, y, w, h, 10, 'rgba(14,18,26,.94)', 'rgba(239,233,220,.14)', 1.5); tx(g, label, x + 16 * u, y + 22 * u, 11 * u, DIM, 'left', 900); tx(g, String(val), x + 16 * u, y + h - 30 * u, 34 * u, col || BONE, 'left', 900); };
    const cw = 200 * u, ch = 110 * u, y = top + 40 * u, hs = STATS.kills ? Math.round(100 * STATS.heads / STATS.kills) + '%' : '—', wr = STATS.matches ? Math.round(100 * STATS.wins / STATS.matches) + '%' : '—';
    [['MATCHES', STATS.matches], ['WINS', STATS.wins + '  ·  ' + wr], ['KILLS', STATS.kills], ['HEADSHOTS', hs]].forEach(([a, b], k) => card(x0 + k * (cw + 14 * u), y, cw, ch, a, b));
    const ry = y + ch + 24 * u; rr(g, x0, ry, cw * 2 + 14 * u, 190 * u, 10, 'rgba(14,18,26,.94)', RANK_COL[i], 2); rankBadge(g, x0 + 70 * u, ry + 95 * u, 44 * u, STATS.rating);
    tx(g, 'RANK', x0 + 140 * u, ry + 40 * u, 11 * u, DIM, 'left', 900); tx(g, rankName(STATS.rating).toUpperCase(), x0 + 138 * u, ry + 84 * u, 38 * u, RANK_COL[i], 'left', 900); tx(g, `Rating ${STATS.rating}`, x0 + 140 * u, ry + 118 * u, 15 * u, BONE, 'left', 800);
    para(g, 'Win against AUTO bots to climb; your rating sets how good they are, and every rival you meet online sees it.', x0 + 140 * u, ry + 142 * u, cw * 2 - 150 * u, 11 * u, '#aeb6c2');
    // the ladder
    const lx = x0 + cw * 2 + 28 * u; rr(g, lx, ry, cw * 2 + 14 * u, 190 * u, 10, 'rgba(14,18,26,.94)', 'rgba(239,233,220,.14)', 1.5); tx(g, 'THE LADDER', lx + 16 * u, ry + 22 * u, 11 * u, DIM, 'left', 900);
    DIFF.forEach((d, k) => { const yy = ry + 52 * u + k * 34 * u; rankBadge(g, lx + 34 * u, yy, 12 * u, RATING_AT[k] + 1); tx(g, d.n.toUpperCase(), lx + 56 * u, yy, 15 * u, k === i ? RANK_COL[k] : BONE, 'left', 900); tx(g, k < 3 ? `${RATING_AT[k]} – ${RATING_AT[k + 1]}` : `${RATING_AT[k]}+`, lx + cw * 2 - 10 * u, yy, 12 * u, DIM, 'right', 700); if (k === i) tx(g, 'YOU', lx + 200 * u, yy, 11 * u, RANK_COL[k], 'left', 900); });
    const cy = ry + 210 * u; card(x0, cy, cw, ch, 'COINS', STATS.coins, COIN); card(x0 + cw + 14 * u, cy, cw, ch, 'SKINS OWNED', STATS.skins.length); card(x0 + (cw + 14 * u) * 2, cy, cw, ch, 'OPERATIVES', Object.keys(OPS).length);
  }
  function drawSettings(g, V, W, u) {
    const w = Math.min(W - 80, 760 * u), x = 640 - w / 2, row = tapH(44, 38) + 8 * u; let y = V.y0 + 24 * u;
    tx(g, 'SETTINGS', x, y + 24 * u, 36 * u, BONE, 'left'); btn(g, x + w - 150 * u, y, 150 * u, tapH(46), 'BACK', () => { UI.panel = 'home'; }, { px: 17 * u }); y += tapH(46) + 22 * u;
    y = controlRows(g, x, y, w, row);
    tx(g, 'Picture quality', x, y + tapH(44, 38) / 2, 17 * u, BONE, 'left'); choice(g, x + w * .42, y, w * .58, tapH(44, 38), [['auto', 'AUTO'], ['low', 'FAST'], ['high', 'SHARP']], CFG.quality, v => { CFG.quality = v; }); y += row;
    tx(g, 'Quality changes apply the next time you open the game.', x + w * .42, y + 8 * u, 12 * u, DIM, 'left'); y += 30 * u;
    btn(g, x, y, Math.min(w, 260 * u), tapH(46), 'CROSSHAIR', () => { UI.panel = 'crosshair'; }, { px: 16 * u, sub: 'shape, colour, presets, codes' });
  }
  function drawOpts(g) {
    const V = K.view, W = V.x1 - V.x0, H = V.y1 - V.y0, u = uiScale();
    g.fillStyle = 'rgba(12,16,22,.86)'; g.fillRect(V.x0, V.y0, W, H); zone(V.x0, V.y0, W, H, () => {});
    if (UI.opts === 'xh') return drawXhair(g, V, W, u);
    const w = Math.min(W - 80, 760 * u), x = 640 - w / 2, row = tapH(44, 38) + 8 * u; let y = V.y0 + 24 * u;
    tx(g, 'SETTINGS', x, y + 24 * u, 36 * u, BONE, 'left'); btn(g, x + w - 150 * u, y, 150 * u, tapH(46), 'CLOSE', () => openOpts(false), { on: true, fill: YOU, px: 17 * u, sub: isTouch() ? '' : 'or press O' }); y += tapH(46) + 22 * u;
    y = controlRows(g, x, y, w, row);
    btn(g, x, y, Math.min(w, 260 * u), tapH(46), 'CROSSHAIR', () => { UI.opts = 'xh'; }, { px: 16 * u });
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
      if (!lines) { para(g, 'Outer lines go with the CROSS, TEE and X shapes. Pick one of those under SHAPE.', x, ly + 8 * u, lw, 13 * u, '#aeb6c2'); ly += row; }
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
  // the Utility row holds the smoke and a charge of your operative's bought ability (Q), side by side
  const abItem = () => { const op = OPS[me().op]; return { k: 'abq', n: op.q.n, short: op.q.n, cost: op.q.cost, col: op.col, ab: op }; };
  const itemsOf = cat => cat === 'Shield' ? ARMOR.map(a => ({ k: a.k, n: a.n, cost: a.cost, col: '#7fc8ff', armor: a })) : cat === 'Utility' ? [NADE, abItem()] : Object.values(GUNS).filter(q => q.cat === cat);
  function drawArmory(g) {
    const V = K.view, W = V.x1 - V.x0, u = uiScale(), P = me(), x = V.x0 + 20 * u, w = W - 40 * u, y0 = V.y0 + 56 * Math.min(u, 1.15), h = V.y1 - y0 - 10 * u, gap = 7 * Math.min(u, 1.2), range = M.mode === 'range';
    rr(g, x, y0, w, h, 12, 'rgba(12,16,22,.95)', 'rgba(239,233,220,.25)');
    const pad = isTouch() ? 46 / pxPer() : 0; tx(g, 'ARMORY', x + 18 * u + pad, y0 + 24 * u, 24 * u, BONE, 'left'); tx(g, `◈ ${P.credits}`, x + w - 18 * u - pad, y0 + 24 * u, 23 * u, GOLD, 'right');
    tx(g, range ? 'Everything is free on the range' : `${pistolRound(M.round) ? 'Pistol round · ' : ''}Round starts in ${Math.max(0, Math.ceil(M.t))}`, x + w / 2, y0 + 24 * u, 14 * u, DIM);
    const by = y0 + 46 * u, bh = y0 + h - by - 12 * u, hh = fitPx(g, 12 * u) * 1.7, cw = (w - 28 * u - 4 * gap) / 5, ch = (bh - hh - 4 * gap) / 5; let focus = null;
    const card = (it, cx, cy, cw2 = cw) => {
      const cw = cw2, A = it.armor, AB = it.ab ? it : null, N = it === NADE ? it : null, G = A || N || AB ? null : it, sp = P.spent, lock = false;
      const on = A ? P.sh >= A.sh : AB ? (P.ab.q | 0) >= AB.ab.q.max : N ? (P.smokes || 0) >= NADE.per : P.guns[G.slot] === it.k, mineNow = A ? sp.sh && sp.sh.k === it.k : AB ? sp.abq > 0 : N ? sp.smoke > 0 : sp[G.slot] && sp[G.slot].k === it.k;
      const refund = A ? (sp.sh ? ARMOR.find(a => a.k === sp.sh.k).cost : 0) : N || AB ? 0 : (sp[G.slot] ? GUNS[sp[G.slot].k].cost : 0), can = !on && P.credits + refund >= it.cost;
      const hot = zone(cx, cy, cw, ch, () => { UI.pick = it.k; buy(P, it.k); }); if (hot || (!focus && UI.pick === it.k)) focus = it;
      rr(g, cx, cy, cw, ch, 8, on ? 'rgba(53,224,200,.14)' : hot && can ? 'rgba(255,138,61,.18)' : 'rgba(255,255,255,.045)', on ? YOU : hot || UI.pick === it.k ? 'rgba(239,233,220,.6)' : can ? 'rgba(239,233,220,.2)' : 'rgba(255,255,255,.06)');
      const tp = Math.min(15 * u, ch * .2, cw * .075), ty = cy + tp * .95;
      g.font = `700 ${fitPx(g, tp)}px ${FONT}`; const nm = it.short && g.measureText((it.n + '  ◈ 200').toUpperCase()).width > cw - 18 * u ? it.short : it.n;
      const have = (N && P.smokes) || (AB && P.ab.q);
      tx(g, nm.toUpperCase(), cx + 9 * u, ty, tp, can || on || have ? it.col : '#5a6272', 'left');
      tx(g, on ? (mineNow ? 'SELL' : AB ? 'FULL' : 'OWNED') : have ? `${N ? P.smokes : P.ab.q} · ◈ ${it.cost}` : it.cost ? `◈ ${it.cost}` : 'FREE', cx + cw - 8 * u, ty, tp * .85, on ? YOU : can ? GOLD : '#5a6272', 'right');
      g.save(); g.globalAlpha = can || on || have ? 1 : .35; g.beginPath(); g.rect(cx + 2, cy + 2, cw - 4, ch - 4); g.clip(); const iy = cy + tp * 1.7, ih = ch - tp * 1.7 - 3;
      if (G) { const ic = gunIcon(it.k); if (ic) { const dh = Math.min(ih * (G.cat === 'Sidearm' ? 1.12 : 1.05), (cw - 12 * u) * 150 / 480 * (G.cat === 'Sidearm' ? 1.5 : G.cat === 'SMG' || G.cat === 'Shotgun' ? 1.2 : 1)), dw = dh * 480 / 150; g.drawImage(ic, cx + (cw - dw) / 2, iy + (ih - dh) / 2, dw, dh); } }
      else if (AB) { const mx = cx + cw / 2, my = iy + ih / 2, r = Math.min(ih * .36, cw * .22), mx2 = AB.ab.q.max; g.strokeStyle = it.col; g.lineWidth = 3 * u; g.beginPath(); g.arc(mx, my - 4 * u, r, 0, TAU); g.stroke(); tx(g, 'Q', mx, my - 4 * u, r * 1.1, it.col, 'center', 900);
        for (let c = 0; c < mx2; c++) { g.fillStyle = c < (P.ab.q | 0) ? it.col : 'rgba(255,255,255,.18)'; g.fillRect(mx - mx2 * 7 * u + c * 14 * u + 2 * u, my + r + 2 * u, 10 * u, 6 * u); } }
      else if (N) { const ih2 = ih - tp * 1.1, mx = cx + cw / 2, my = iy + ih2 / 2 + 4 * u, s2 = ih2 / 62; for (let i = 0; i < NADE.per; i++) { const ox = mx + (i - (NADE.per - 1) / 2) * 30 * s2; rr(g, ox - 10 * s2, my - 18 * s2, 20 * s2, 40 * s2, 5 * s2, '#59606b', '#9aa3ad', 1.5); g.fillStyle = NADE.col; g.fillRect(ox - 10 * s2, my - 10 * s2, 20 * s2, 5 * s2); rr(g, ox - 6 * s2, my - 25 * s2, 12 * s2, 8 * s2, 2 * s2, '#3d434b'); g.fillStyle = '#9aa3ad'; g.fillRect(ox + 6 * s2, my - 24 * s2, 3 * s2, 18 * s2); } tx(g, 'CARRY ' + NADE.per, mx, cy + ch - tp * .7, tp * .62, DIM); }
      else { const mx = cx + cw / 2, my = iy + ih / 2, s2 = ih / 80 * (A.sh === 50 ? 1.05 : .85); g.fillStyle = it.col + '33'; g.strokeStyle = it.col; g.lineWidth = 2.5 * u; g.beginPath(); g.moveTo(mx, my - 32 * s2); g.lineTo(mx + 26 * s2, my - 22 * s2); g.lineTo(mx + 22 * s2, my + 12 * s2); g.lineTo(mx, my + 32 * s2); g.lineTo(mx - 22 * s2, my + 12 * s2); g.lineTo(mx - 26 * s2, my - 22 * s2); g.closePath(); g.fill(); g.stroke(); tx(g, '+' + A.sh, mx, my, 20 * s2, BONE); }
      g.restore();
    };
    let endY = by;
    ARMORY_COLS.forEach((col, ci) => {
      const cx = x + 14 * u + ci * (cw + gap); let y = by;
      for (const [label, cat] of col) { tx(g, label, cx + 2, y + hh / 2, 12 * u, DIM, 'left'); y += hh;
        if (cat === 'Utility') { const its = itemsOf(cat), hw = (cw - gap) / 2; its.forEach((it, n) => card(it, cx + n * (hw + gap), y, hw)); y += ch + gap; continue; }   // two half cards in one row
        for (const it of itemsOf(cat)) { card(it, cx, y); y += ch + gap; } }
      if (ci === 4) endY = y;
    });
    // the right column, under the shields: what you are pointing at, a buy button for a gold-edged one, and the way out
    const dx = x + 14 * u + 4 * (cw + gap), rh = tapH(50), dh = by + bh - endY - rh - gap;
    rr(g, dx, endY, cw, dh, 8, 'rgba(255,255,255,.03)', 'rgba(239,233,220,.12)');
    if (focus) {
      const F = focus, G = F.armor || F === NADE || F.ab ? null : F, fp = Math.min(13 * u, cw * .062), ub = 0; let y = endY + fp * 1.3;
      tx(g, F.n.toUpperCase(), dx + 9 * u, y, fp * 1.25, F.col, 'left'); if (G) tx(g, G.cat.toUpperCase(), dx + cw - 8 * u, y, fp * .85, DIM, 'right'); y += fp * 1.9;
      g.save(); g.beginPath(); g.rect(dx, endY, cw, dh - ub); g.clip();
      y = para(g, F.armor ? `Soaks the next ${F.armor.sh} damage. Lasts until used up.` : F.ab ? `${F.ab.q.d} Up to ${F.ab.q.max} charge${F.ab.q.max > 1 ? 's' : ''}; unused ones carry into the next round. E (${F.ab.e.n}) is free every round; X (${F.ab.x.n}) is your ultimate.` : F.desc, dx + 9 * u, y, cw - 18 * u, fp, '#cfd6e2', 1.25) + fp * .3;
      const row = (a, b2) => { tx(g, a, dx + 9 * u, y, fp * .9, DIM, 'left'); tx(g, b2, dx + cw - 8 * u, y, fp * .9, BONE, 'right'); y += fp * 1.45; };
      if (G) { const d = G.dmg[0]; row('BODY', `${d[1]}${G.pel ? ' x' + G.pel + ' PELLETS' : ''}`); row('HEAD · LEGS', `x${G.head} (${dmgAt(G, 0, 1)}) · x${G.legs} (${dmgAt(G, 0, 3)})`); row('FIRE RATE', `${(G.rpm / 60).toFixed(1)}/s ${G.auto ? 'AUTO' : 'SEMI'}`); row('MAGAZINE', `${G.mag} · ${G.rel}s RELOAD`); row('ERROR STILL · RUN', `${G.scope ? G.acc.sfs : G.acc.fs}° · ${G.acc.run}°`); }
      if (F === NADE) { row('CARRY', `UP TO ${NADE.per}`); row('CLOUD', `${NADE.T} S`); }
      if (F.ab) { row('CHARGES', `${P.ab.q | 0} OF ${F.ab.q.max}`); row('ULTIMATE', `${Math.min(P.ult | 0, ultCost(P))} / ${ultCost(P)} POINTS`); }
      row('PRICE', F.cost ? `◈ ${F.cost}` : 'FREE');
      g.restore();
    } else para(g, `Press a weapon to buy it, and again to sell it back. Q (${OPS[P.op].q.n}) is bought by the charge; E (${OPS[P.op].e.n}) comes free every round; X (${OPS[P.op].x.n}) charges from kills, deaths, plants, defuses and the orbs on the map. Rounds 1 and 5 are pistol rounds.`, dx + 9 * u, endY + 22 * u, cw - 18 * u, Math.min(13 * u, cw * .062), DIM);
    btn(g, dx, by + bh - rh, cw, rh, range ? 'CLOSE' : 'READY', () => openArmory(false), { on: true, fill: YOU, px: rh * .4, sub: isTouch() ? '' : 'or press B' });
  }

  // a coin count: a little gold disc and the number, right-aligned at x
  function coinTag(g, x, y, px, n) {
    const s = String(n); g.font = `800 ${px}px ${FONT}`; const w = g.measureText(s).width;
    tx(g, s, x, y, px, COIN, 'right', 800);
    const cx = x - w - px * .75; g.fillStyle = COIN; g.beginPath(); g.arc(cx, y, px * .48, 0, TAU); g.fill(); g.strokeStyle = '#8a6210'; g.lineWidth = px * .1; g.beginPath(); g.arc(cx, y, px * .3, 0, TAU); g.stroke();
  }
  function drawOver(g) {
    const V = K.view, W = V.x1 - V.x0, H = V.y1 - V.y0, u = uiScale(), P = me(), F = foe(), won = M.over.won;
    g.fillStyle = 'rgba(12,16,22,.78)'; g.fillRect(V.x0, V.y0, W, H);
    tx(g, won ? 'VICTORY' : 'DEFEAT', 640, V.y0 + 90 * u, 84 * u, won ? YOU : FOE); tx(g, `${M.wins[0]}  –  ${M.wins[1]}`, 640, V.y0 + 170 * u, 44 * u, BONE);
    if (M.over.why === 'left') tx(g, 'Your rival left the match', 640, V.y0 + 212 * u, 15 * u, DIM);
    else if (M.over.why === 'dropped') tx(g, 'You lost the connection to the room, and could not get back in', 640, V.y0 + 212 * u, 15 * u, DIM);
    const rows = [['Kills', f => f.stat.k], ['Headshots', f => f.stat.hs], ['Damage dealt', f => Math.round(f.stat.dmg)], ['Accuracy', f => f.net ? '—' : f.stat.shots ? Math.round(100 * f.stat.hits / f.stat.shots) + '%' : '—']], tw = 520 * u, ty = V.y0 + 250 * u;
    rr(g, 640 - tw / 2, ty, tw, (rows.length + 1) * 40 * u + 14 * u, 10, GLASS);
    tx(g, P.name.toUpperCase(), 640 - 70 * u, ty + 26 * u, 15 * u, YOU, 'right'); tx(g, F.name.toUpperCase(), 640 + 70 * u, ty + 26 * u, 15 * u, FOE, 'left');
    rows.forEach(([label, fn], i) => { const y = ty + (i + 1) * 40 * u + 26 * u; tx(g, label, 640, y, 13 * u, DIM); tx(g, String(fn(P)), 640 - 110 * u, y, 22 * u, BONE, 'right'); tx(g, String(fn(F)), 640 + 110 * u, y, 22 * u, BONE, 'left'); });
    // what the match paid, and where the adaptive bot goes next
    const cy = ty + (rows.length + 1) * 40 * u + 44 * u;
    if (M.rated) { const r = M.rated; tx(g, `Rating ${r.after} (${r.after >= r.before ? '+' : ''}${r.after - r.before})   ·   next bot: ${rankName(r.after)}`, 640, cy, 15 * u, DIM); }
    // coins: the total counts up, the reasons beside it, and how far it takes you toward the rarest skin
    if (M.pay) { const t = (performance.now() - M.payT) / 1000, shown = Math.round(M.pay.total * smooth(cl(t / 1.4, 0, 1))), px0 = 640 + 280 * u, py0 = V.y0 + 236 * u;
      rr(g, px0, py0, 250 * u, (M.pay.rows.length + 2) * 22 * u + 44 * u, 10, GLASS); tx(g, 'COINS', px0 + 16 * u, py0 + 20 * u, 12 * u, COIN, 'left', 900); coinTag(g, px0 + 234 * u, py0 + 20 * u, 22 * u, '+' + shown);
      M.pay.rows.forEach(([a, b], i) => { const y = py0 + 50 * u + i * 22 * u, a2 = cl((t - .2 - i * .12) / .25, 0, 1); g.save(); g.globalAlpha = a2; tx(g, a, px0 + 16 * u, y, 12 * u, '#c9cfd8', 'left', 700); tx(g, (b >= 0 ? '+' : '') + b, px0 + 234 * u, y, 12 * u, b >= 0 ? BONE : WARN, 'right', 800); g.restore(); });
      const yb = py0 + 50 * u + M.pay.rows.length * 22 * u + 6 * u, frac = cl(M.pay.total / RARITY.mythic.price, 0, 1); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(px0 + 16 * u, yb, 218 * u, 5 * u); g.fillStyle = RARITY.mythic.col; g.fillRect(px0 + 16 * u, yb, 218 * u * frac * smooth(cl(t / 1.4, 0, 1)), 5 * u);
      tx(g, `${Math.round(frac * 100)}% of a Mythic  ·  you have ${STATS.coins}`, px0 + 16 * u, yb + 16 * u, 10 * u, DIM, 'left', 700); }
    const by = Math.min(V.y1 - 80 * u, cy + 40 * u);
    btn(g, 640 - 250 * u, by, 240 * u, tapH(56), M.online ? 'BACK TO THE ROOM' : 'PLAY AGAIN', () => { if (M.online) { toMenu(); openParty(); } else play({ mode: M.mode, diff: CFG.diff, size: teamSize(CFG.size), sites: CFG.sites }); }, { on: true, fill: FOE, px: 19 * u });
    btn(g, 640 + 10 * u, by, 240 * u, tapH(56), 'MENU', toMenu, { px: 19 * u });
  }
