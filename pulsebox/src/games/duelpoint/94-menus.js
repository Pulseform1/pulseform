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
      fine(g, x, y, w, 'Mouse sensitivity', CFG.sens, .05, 3, .01, v => { CFG.sens = v; }, v => v.toFixed(2)); y += row;
      fine(g, x, y, w, 'Aiming / scoped', CFG.zsens, .3, 1.5, .05, v => { CFG.zsens = v; }, v => 'x' + v.toFixed(2)); y += row;
      tx(g, 'Crouch (Ctrl or C)', x, y + h / 2, 17 * u, BONE, 'left'); choice(g, x + w * .42, y, w * .58, h, [['hold', 'HOLD'], ['toggle', 'TOGGLE']], CFG.crouch, v => { CFG.crouch = v; keys.crouchT = false; }); y += row;
      toggle(g, x, y, w, 'Full screen in play', CFG.full, v => { CFG.full = v; if (!v && document.fullscreenElement) try { document.exitFullscreen(); } catch (e) {} }, 'stops Ctrl+W closing the tab'); y += row;
    }
    return y;
  }
  const choice = (g, x, y, w, h, opts, cur, set) => opts.forEach(([v, label], i) => { const bw = (w - (opts.length - 1) * 8) / opts.length; btn(g, x + i * (bw + 8), y, bw, h, label, () => { set(v); saveAll(); }, { on: cur === v, fill: YOU, px: Math.min(h * .36, bw * 1.5 / Math.max(5, label.length)) }); });

  function drawMenu(g) {
    const V = K.view, W = V.x1 - V.x0, H = V.y1 - V.y0, u = uiScale(), m = 36 * Math.min(u, 1.3), x0 = V.x0 + m + 44 / pxPer(), touch = isTouch();
    g.fillStyle = 'rgba(12,16,22,.62)'; g.fillRect(V.x0, V.y0, W, H);
    if (UI.panel === 'store' || UI.panel === 'locker') return drawShop(g, V, W, H, u);
    if (UI.panel === 'settings') return drawSettings(g, V, W, u);
    if (UI.panel === 'crosshair') return drawXhair(g, V, W, u);
    g.fillStyle = FOE; g.fillRect(x0, V.y0 + 26 * u, 7 * u, 66 * u); tx(g, 'DUELPOINT', x0 + 22 * u, V.y0 + 52 * u, 58 * u, BONE, 'left'); tx(g, 'Two on two. Thirteen maps, one site or two. Every round counts.', x0 + 24 * u, V.y0 + 96 * u, 15 * u, DIM, 'left');
    if (STATS.matches) tx(g, `${STATS.wins} wins in ${STATS.matches} matches · ${STATS.kills} kills`, V.x1 - m, V.y0 + 92 * u, 13 * u, DIM, 'right');
    // the store and the locker, with your coins
    { const bw = 120 * u, bh = 40 * u, bx = V.x1 - m - bw * 2 - 8 * u, by = V.y0 + 30 * u;
      btn(g, bx, by, bw, bh, 'STORE', () => { UI.panel = 'store'; SH.show = null; }, { on: true, fill: '#ffb020', solid: true, col: INK, px: 15 * u, sub: 'new skins daily' }); btn(g, bx + bw + 8 * u, by, bw, bh, 'LOCKER', () => { UI.panel = 'locker'; }, { px: 15 * u });
      coinTag(g, bx - 16 * u, by + bh / 2, 20 * u, STATS.coins); }
    // your operative: who you are bringing, and a way to change
    const rw = cl(W * .27, 300, 420), top = V.y0 + 132 * u, cwAll = W - rw - m * 3 - 44 / pxPer() - 28, chh = Math.min(V.y1 - top - m, 330 * u), O = OPS[CFG.op] || OPS.vex, cw = Math.min(cwAll, 640 * u);
    tx(g, 'YOUR OPERATIVE', x0, top - 14 * u, 13 * u, DIM, 'left');
    { const x = x0, hot = zone(x, top, cw, chh, () => { openSelect(null); click(); });
      rr(g, x, top, cw, chh, 10, 'rgba(20,26,36,.92)', hot ? O.col : 'rgba(239,233,220,.2)', 2); g.fillStyle = O.col; g.fillRect(x, top, cw, 6 * u);
      const bw = Math.min(200 * u, cw * .36); portraitTile(g, CFG.op, x + 2, top + 6 * u, bw, chh - 8 * u, { r: 0, bar: O.col });
      const tx0 = x + bw + 24 * u; tx(g, O.role.toUpperCase(), tx0, top + 36 * u, 12 * u, O.col, 'left', 900); tx(g, O.n, tx0 - 2 * u, top + 72 * u, Math.min(46 * u, (cw - bw) * .16), BONE, 'left', 900);
      let y = para(g, O.bio || '', tx0, top + 104 * u, cw - bw - 44 * u, 13 * u, '#c9cfd8') + 14 * u;
      for (const [key, a] of [['Q', O.q], ['E', O.e]]) { rr(g, tx0, y - 14 * u, 28 * u, 28 * u, 5, null, O.col); tx(g, key, tx0 + 14 * u, y, 14 * u, O.col); tx(g, a.n.toUpperCase(), tx0 + 40 * u, y, 15 * u, BONE, 'left', 800); y = para(g, a.d, tx0 + 40 * u, y + 24 * u, cw - bw - 84 * u, 12 * u, '#b9c0cc') + 12 * u; }
      tx(g, `CHANGE OPERATIVE  ·  ${Object.keys(OPS).length} TO CHOOSE FROM`, x + cw - 16 * u, top + chh - 18 * u, 12 * u, hot ? O.col : DIM, 'right', 800); }
    // what to play
    const rx = V.x1 - m - rw; let y = top - 14 * u;
    const lvl = (CFG.diff === 'auto' ? rankName(STATS.rating) : DIFF[CFG.diff].n) + ' bots';
    const head = (s, extra) => { tx(g, s, rx, y, 12 * u, DIM, 'left', 800); if (extra) tx(g, extra, rx + rw, y, 11 * u, DIM, 'right'); g.fillStyle = 'rgba(239,233,220,.14)'; g.fillRect(rx, y + 9 * u, rw, 1); y += 18 * u; };
    head('PLAY VS BOTS');
    choice(g, rx, y, rw, tapH(34), [[2, 'TWO SITES'], [1, 'ONE SITE']], CFG.sites === 1 ? 1 : 2, v => { CFG.sites = v; saveAll(); }); y += tapH(34) + 6 * u;
    btn(g, rx, y, rw, 70 * u, 'PLAY 2V2', () => menuPlay(2), { on: true, fill: FOE, px: 30 * u, sub: 'you + a bot teammate vs two · ' + lvl }); zones[zones.length - 1].prime = true; y += 76 * u;
    btn(g, rx, y, rw, tapH(40), '1V1 DUEL', () => menuPlay(1), { px: 16 * u, sub: 'just you and one rival' }); y += tapH(40) + 6 * u;
    tx(g, 'Bot level', rx, y + tapH(34) / 2, 12 * u, DIM, 'left'); choice(g, rx + 70 * u, y, rw - 70 * u, tapH(34), [['auto', 'AUTO'], ...DIFF.map((d, i) => [i, d.n.toUpperCase()])], CFG.diff, v => { CFG.diff = v; }); y += tapH(34) + 16 * u;
    head('PLAY WITH FRIENDS', 'room code, 2-4 players');
    choice(g, rx, y, rw, tapH(34), [['versus', '2V2'], ['coop', 'CO-OP'], ['duel', '1V1']], CFG.team, v => { CFG.team = v; }); y += tapH(34) + 6 * u;
    btn(g, rx, y, rw, tapH(46), 'PLAY ONLINE', () => MP.show(), { px: 18 * u, fill: YOU, solid: true, col: INK, sub: CFG.team === 'coop' ? '2-4 of you together against bots' : CFG.team === 'duel' ? 'one friend, one on one' : '2-4 friends, two a side: bots fill any gap' }); y += tapH(46) + 16 * u;
    head('MORE');
    btn(g, rx, y, (rw - 8) / 2, tapH(44), 'PRACTICE RANGE', () => play({ mode: 'range' }), { px: 14 * u }); btn(g, rx + (rw + 8) / 2, y, (rw - 8) / 2, tapH(44), 'ARMORY', () => { play({ mode: 'range' }); openArmory(true); }, { px: 14 * u, sub: 'try every gun' }); y += tapH(44) + 8 * u;
    if (!touch) { const ty = top + chh + 26 * u; tx(g, 'HOW IT PLAYS', x0, ty, 13 * u, DIM, 'left'); ['Stand still to shoot straight. Tap the opposite key to stop dead.', 'Tap or burst at range: sprays climb, then sway. Heads take the most.', 'Shift sprints; crouch mid-sprint to slide; Space jumps (even out of a slide).', 'B opens the armory. Right click aims or scopes. F plants and defuses.'].forEach((t, i) => tx(g, t, x0, ty + 26 * u + i * 24 * u, 14 * u, '#b9c0cc', 'left', 600)); }
    btn(g, rx, y, (rw - 8) / 2, tapH(44), 'SETTINGS', () => { UI.panel = 'settings'; }, { px: 14 * u }); btn(g, rx + (rw + 8) / 2, y, (rw - 8) / 2, tapH(44), 'CROSSHAIR', () => { UI.panel = 'crosshair'; }, { px: 14 * u }); y += tapH(44) + 10 * u;
    if (!touch) tx(g, KNAV.on ? 'Arrow keys move · Enter selects · Esc goes back' : 'Tip: the arrow keys and Enter work here too', rx + rw / 2, Math.min(y + 4 * u, V.y1 - 14 * u), 11 * u, DIM);
  }
  function drawSettings(g, V, W, u) {
    const w = Math.min(W - 80, 760 * u), x = 640 - w / 2, row = tapH(44, 38) + 8 * u; let y = V.y0 + 24 * u;
    tx(g, 'SETTINGS', x, y + 24 * u, 36 * u, BONE, 'left'); btn(g, x + w - 150 * u, y, 150 * u, tapH(46), 'BACK', () => { UI.panel = 'home'; }, { px: 17 * u }); y += tapH(46) + 22 * u;
    y = controlRows(g, x, y, w, row);
    tx(g, 'Picture quality', x, y + tapH(44, 38) / 2, 17 * u, BONE, 'left'); choice(g, x + w * .42, y, w * .58, tapH(44, 38), [['auto', 'AUTO'], ['low', 'FAST'], ['high', 'SHARP']], CFG.quality, v => { CFG.quality = v; }); y += row;
    tx(g, 'Quality changes apply the next time you open the game.', x + w * .42, y + 8 * u, 12 * u, DIM, 'left');
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
  function drawXhair(g, V, W, u) {
    const w = Math.min(W - 80, 1000 * u), x = 640 - w / 2, c = CFG.xh, lw = w * .56, px = x + lw + 30 * u, pw = w - lw - 30 * u, rh = tapH(44, 38), row = rh + 6 * u; let y = V.y0 + 20 * u;
    tx(g, 'CROSSHAIR', x, y + 24 * u, 36 * u, BONE, 'left'); btn(g, x + w - 150 * u, y, 150 * u, tapH(46), 'BACK', () => { UI.panel = 'home'; if (UI.opts) UI.opts = 'main'; }, { px: 17 * u }); y += tapH(46) + 14 * u;
    // the preview: against light, dark and bright, and opening the way it will when you move and shoot
    const pb = tapH(40), ph = Math.min(300 * u, V.y1 - y - pb - 46 * u), err = c.dyn ? (Math.sin(K.t * 2.2) * .5 + .5) * 14 : 0;
    ['#cfd8dc', '#3a4250', '#e8b06a'].forEach((bg, i) => { g.fillStyle = bg; g.fillRect(px + i * pw / 3, y, pw / 3 + 1, ph); });
    g.fillStyle = 'rgba(12,16,22,.5)'; g.fillRect(px, y + ph * .62, pw, ph * .38); [0, 1, 2].forEach(i => drawCrosshair(g, px + pw * (i + .5) / 3, y + ph * .4, i === 1 ? err : 0, Math.max(1, u * .85)));
    tx(g, 'still', px + pw / 6, y + ph - 14 * u, 12 * u, BONE); tx(g, c.dyn ? 'moving' : 'fixed', px + pw / 2, y + ph - 14 * u, 12 * u, BONE); tx(g, 'still', px + pw * 5 / 6, y + ph - 14 * u, 12 * u, BONE);
    tx(g, 'PRESETS', px, y + ph + 16 * u, 12 * u, DIM, 'left');
    XH_PRESETS.forEach((p, i) => { const bw = (pw - 4 * 6) / 5; btn(g, px + i * (bw + 6), y + ph + 30 * u, bw, pb, p.n.toUpperCase(), () => { const { n, ...rest } = p; CFG.xh = { ...rest }; saveAll(); }, { px: 12 * u }); });
    const set = (k, v) => { c[k] = v; };
    tx(g, 'Shape', x, y + rh / 2, 17 * u, BONE, 'left'); choice(g, x + lw * .3, y, lw * .7, rh, [['cross', 'CROSS'], ['tee', 'TEE'], ['circle', 'RING'], ['dot', 'DOT']], c.shape, v => set('shape', v)); y += row;
    tx(g, 'Colour', x, y + rh / 2, 17 * u, BONE, 'left');
    XH_COLS.forEach((col, i) => { const sw = (lw * .7 - 7 * 6) / 8, bx = x + lw * .3 + i * (sw + 6); zone(bx, y, sw, rh, () => { set('col', col); saveAll(); click(); }); rr(g, bx, y + 2, sw, rh - 4, 6, col, c.col === col ? BONE : 'rgba(0,0,0,.4)', c.col === col ? 4 : 2); }); y += row;
    if (c.shape !== 'dot' && c.shape !== 'circle') { slider(g, x, y, lw, 'Length', c.len, 2, 22, v => set('len', Math.round(v)), v => String(Math.round(v))); y += row; }
    if (c.shape !== 'dot') { slider(g, x, y, lw, c.shape === 'circle' ? 'Size' : 'Gap', c.gap, 0, 16, v => set('gap', Math.round(v)), v => String(Math.round(v))); y += row; }
    slider(g, x, y, lw, 'Thickness', c.thick, 1, 8, v => set('thick', Math.round(v)), v => String(Math.round(v))); y += row;
    if (c.shape !== 'dot') { toggle(g, x, y, lw, 'Centre dot', c.dot, v => set('dot', v)); y += row; }
    toggle(g, x, y, lw, 'Dark outline', c.outline, v => set('outline', v)); y += row;
    if (c.shape !== 'dot') toggle(g, x, y, lw, 'Opens with error', c.dyn, v => set('dyn', v), isTouch() ? '' : 'shows how accurate you are');
  }

  // The armory, laid out the way players of the genre expect: every weapon on one screen, a column per class,
  // shields on the right with the numbers for whatever you are pointing at. Press a gun you own to take it into every round;
  // each round's money buys them; press something you bought this round to sell it back. The smoke grenade sits under the heavy gun.
  const ARMORY_COLS = [[['SIDEARMS', 'Sidearm']], [['SMGS', 'SMG'], ['SHOTGUNS', 'Shotgun']], [['RIFLES', 'Rifle']], [['SNIPERS', 'Sniper'], ['HEAVY', 'Heavy'], ['UTILITY', 'Utility']], [['SHIELDS', 'Shield']]];
  const shopItem = k => GUNS[k] || (k === NADE.k ? NADE : null);
  const itemsOf = cat => cat === 'Shield' ? ARMOR.map(a => ({ k: a.k, n: a.n, cost: a.cost, col: '#7fc8ff', armor: a })) : cat === 'Utility' ? [NADE] : Object.values(GUNS).filter(q => q.cat === cat);
  function drawArmory(g) {
    const V = K.view, W = V.x1 - V.x0, u = uiScale(), P = me(), x = V.x0 + 20 * u, w = W - 40 * u, y0 = V.y0 + 56 * Math.min(u, 1.15), h = V.y1 - y0 - 10 * u, gap = 7 * Math.min(u, 1.2), range = M.mode === 'range';
    rr(g, x, y0, w, h, 12, 'rgba(12,16,22,.95)', 'rgba(239,233,220,.25)');
    const pad = isTouch() ? 46 / pxPer() : 0; tx(g, 'ARMORY', x + 18 * u + pad, y0 + 24 * u, 24 * u, BONE, 'left'); tx(g, `◈ ${P.credits}`, x + w - 18 * u - pad, y0 + 24 * u, 23 * u, GOLD, 'right');
    tx(g, range ? 'Everything is free on the range' : `${pistolRound(M.round) ? 'Pistol round · ' : ''}Round starts in ${Math.max(0, Math.ceil(M.t))}`, x + w / 2, y0 + 24 * u, 14 * u, DIM);
    const by = y0 + 46 * u, bh = y0 + h - by - 12 * u, hh = fitPx(g, 12 * u) * 1.7, cw = (w - 28 * u - 4 * gap) / 5, ch = (bh - hh - 4 * gap) / 5; let focus = null;
    const card = (it, cx, cy) => {
      const A = it.armor, N = it === NADE ? it : null, G = A || N ? null : it, sp = P.spent, lock = false;
      const on = A ? P.sh >= A.sh : N ? (P.smokes || 0) >= NADE.per : P.guns[G.slot] === it.k, mineNow = A ? sp.sh && sp.sh.k === it.k : N ? sp.smoke > 0 : sp[G.slot] && sp[G.slot].k === it.k;
      const refund = A ? (sp.sh ? ARMOR.find(a => a.k === sp.sh.k).cost : 0) : N ? 0 : (sp[G.slot] ? GUNS[sp[G.slot].k].cost : 0), can = !on && P.credits + refund >= it.cost;
      const hot = zone(cx, cy, cw, ch, () => { UI.pick = it.k; buy(P, it.k); }); if (hot || (!focus && UI.pick === it.k)) focus = it;
      rr(g, cx, cy, cw, ch, 8, on ? 'rgba(53,224,200,.14)' : hot && can ? 'rgba(255,138,61,.18)' : 'rgba(255,255,255,.045)', on ? YOU : hot || UI.pick === it.k ? 'rgba(239,233,220,.6)' : can ? 'rgba(239,233,220,.2)' : 'rgba(255,255,255,.06)');
      const tp = Math.min(15 * u, ch * .2, cw * .075), ty = cy + tp * .95;
      g.font = `700 ${fitPx(g, tp)}px ${FONT}`; const nm = it.short && g.measureText((it.n + '  ◈ 200').toUpperCase()).width > cw - 18 * u ? it.short : it.n;
      tx(g, nm.toUpperCase(), cx + 9 * u, ty, tp, can || on || (N && P.smokes) ? it.col : '#5a6272', 'left');
      tx(g, on ? (mineNow ? 'SELL' : 'OWNED') : N && P.smokes ? `${P.smokes} · ◈ ${it.cost}` : it.cost ? `◈ ${it.cost}` : 'FREE', cx + cw - 8 * u, ty, tp * .85, on ? YOU : can ? GOLD : '#5a6272', 'right');
      g.save(); g.globalAlpha = can || on || (N && P.smokes) ? 1 : .35; g.beginPath(); g.rect(cx + 2, cy + 2, cw - 4, ch - 4); g.clip(); const iy = cy + tp * 1.7, ih = ch - tp * 1.7 - 3;
      if (G) { const ic = gunIcon(it.k); if (ic) { const dh = Math.min(ih * (G.cat === 'Sidearm' ? 1.12 : 1.05), (cw - 12 * u) * 150 / 480 * (G.cat === 'Sidearm' ? 1.5 : G.cat === 'SMG' || G.cat === 'Shotgun' ? 1.2 : 1)), dw = dh * 480 / 150; g.drawImage(ic, cx + (cw - dw) / 2, iy + (ih - dh) / 2, dw, dh); } }
      else if (N) { const ih2 = ih - tp * 1.1, mx = cx + cw / 2, my = iy + ih2 / 2 + 4 * u, s2 = ih2 / 62; for (let i = 0; i < NADE.per; i++) { const ox = mx + (i - (NADE.per - 1) / 2) * 30 * s2; rr(g, ox - 10 * s2, my - 18 * s2, 20 * s2, 40 * s2, 5 * s2, '#59606b', '#9aa3ad', 1.5); g.fillStyle = NADE.col; g.fillRect(ox - 10 * s2, my - 10 * s2, 20 * s2, 5 * s2); rr(g, ox - 6 * s2, my - 25 * s2, 12 * s2, 8 * s2, 2 * s2, '#3d434b'); g.fillStyle = '#9aa3ad'; g.fillRect(ox + 6 * s2, my - 24 * s2, 3 * s2, 18 * s2); } tx(g, 'CARRY ' + NADE.per, mx, cy + ch - tp * .7, tp * .62, DIM); }
      else { const mx = cx + cw / 2, my = iy + ih / 2, s2 = ih / 80 * (A.sh === 50 ? 1.05 : .85); g.fillStyle = it.col + '33'; g.strokeStyle = it.col; g.lineWidth = 2.5 * u; g.beginPath(); g.moveTo(mx, my - 32 * s2); g.lineTo(mx + 26 * s2, my - 22 * s2); g.lineTo(mx + 22 * s2, my + 12 * s2); g.lineTo(mx, my + 32 * s2); g.lineTo(mx - 22 * s2, my + 12 * s2); g.lineTo(mx - 26 * s2, my - 22 * s2); g.closePath(); g.fill(); g.stroke(); tx(g, '+' + A.sh, mx, my, 20 * s2, BONE); }
      g.restore();
    };
    let endY = by;
    ARMORY_COLS.forEach((col, ci) => {
      const cx = x + 14 * u + ci * (cw + gap); let y = by;
      for (const [label, cat] of col) { tx(g, label, cx + 2, y + hh / 2, 12 * u, DIM, 'left'); y += hh; for (const it of itemsOf(cat)) { card(it, cx, y); y += ch + gap; } }
      if (ci === 4) endY = y;
    });
    // the right column, under the shields: what you are pointing at, a buy button for a gold-edged one, and the way out
    const dx = x + 14 * u + 4 * (cw + gap), rh = tapH(50), dh = by + bh - endY - rh - gap;
    rr(g, dx, endY, cw, dh, 8, 'rgba(255,255,255,.03)', 'rgba(239,233,220,.12)');
    if (focus) {
      const F = focus, G = F.armor || F === NADE ? null : F, fp = Math.min(13 * u, cw * .062), ub = 0; let y = endY + fp * 1.3;
      tx(g, F.n.toUpperCase(), dx + 9 * u, y, fp * 1.25, F.col, 'left'); if (G) tx(g, G.cat.toUpperCase(), dx + cw - 8 * u, y, fp * .85, DIM, 'right'); y += fp * 1.9;
      g.save(); g.beginPath(); g.rect(dx, endY, cw, dh - ub); g.clip();
      y = para(g, F.armor ? `Soaks the next ${F.armor.sh} damage. Lasts until used up.` : F.desc, dx + 9 * u, y, cw - 18 * u, fp, '#cfd6e2', 1.25) + fp * .3;
      const row = (a, b2) => { tx(g, a, dx + 9 * u, y, fp * .9, DIM, 'left'); tx(g, b2, dx + cw - 8 * u, y, fp * .9, BONE, 'right'); y += fp * 1.45; };
      if (G) { const d = G.dmg[0]; row('BODY', `${d[1]}${G.pel ? ' x' + G.pel + ' PELLETS' : ''}`); row('HEAD · LEGS', `x${G.head} (${dmgAt(G, 0, 1)}) · x${G.legs} (${dmgAt(G, 0, 3)})`); row('FIRE RATE', `${(G.rpm / 60).toFixed(1)}/s ${G.auto ? 'AUTO' : 'SEMI'}`); row('MAGAZINE', `${G.mag} · ${G.rel}s RELOAD`); row('ERROR STILL · RUN', `${G.scope ? G.acc.sfs : G.acc.fs}° · ${G.acc.run}°`); }
      if (F === NADE) { row('CARRY', `UP TO ${NADE.per}`); row('CLOUD', `${NADE.T} S`); }
      row('PRICE', F.cost ? `◈ ${F.cost}` : 'FREE');
      g.restore();
    } else para(g, 'Press a weapon to buy it. Press something you bought this round to sell it back. Rounds 1 and 5 are pistol rounds.', dx + 9 * u, endY + 22 * u, cw - 18 * u, Math.min(13 * u, cw * .062), DIM);
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
    btn(g, 640 - 250 * u, by, 240 * u, tapH(56), M.online ? 'BACK TO THE ROOM' : 'PLAY AGAIN', () => { if (M.online) { toMenu(); MP.show(); } else play({ mode: M.mode, diff: CFG.diff, size: CFG.size, sites: CFG.sites }); }, { on: true, fill: FOE, px: 19 * u });
    btn(g, 640 + 10 * u, by, 240 * u, tapH(56), 'MENU', toMenu, { px: 19 * u });
  }
