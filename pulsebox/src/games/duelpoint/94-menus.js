  /* ---------- 94 menus: the main menu, settings, the crosshair designer, the armory, the match-end screen ----------
     Same canvas and helpers as the HUD. Every screen is laid out from the visible view and uiScale(), so the phone gets
     large cards and buttons and the desktop gets a compact page. */
  function slider(g, x, y, w, label, val, min, max, set, show) {
    const u = uiScale(), k = cl((val - min) / (max - min), 0, 1), h = 46 * u;
    tx(g, label, x, y + h / 2, 17 * u, BONE, 'left'); const sx = x + w * .42, sw = w * .44;
    zone(sx - 14 * u, y, sw + 28 * u, h, px => { set(min + (max - min) * cl((px - sx) / sw, 0, 1)); saveAll(); }, true);
    rr(g, sx, y + h / 2 - 4 * u, sw, 8 * u, 4 * u, 'rgba(239,233,220,.18)'); rr(g, sx, y + h / 2 - 4 * u, sw * k, 8 * u, 4 * u, YOU);
    g.fillStyle = BONE; g.beginPath(); g.arc(sx + sw * k, y + h / 2, 11 * u, 0, TAU); g.fill(); tx(g, show(val), x + w, y + h / 2, 16 * u, GOLD, 'right');
  }
  function toggle(g, x, y, w, label, on, set, note) {
    const u = uiScale(), h = 46 * u; tx(g, label, x, y + h / 2, 17 * u, BONE, 'left'); if (note) tx(g, note, x + w * .42, y + h / 2, 12 * u, DIM, 'left');
    btn(g, x + w - 96 * u, y + 3 * u, 96 * u, h - 6 * u, on ? 'ON' : 'OFF', () => { set(!on); saveAll(); }, { on, fill: YOU, px: 16 * u });
  }
  const choice = (g, x, y, w, h, opts, cur, set) => opts.forEach(([v, label], i) => { const bw = (w - (opts.length - 1) * 8) / opts.length; btn(g, x + i * (bw + 8), y, bw, h, label, () => { set(v); saveAll(); }, { on: cur === v, fill: YOU, px: h * .36 }); });

  function drawMenu(g) {
    const V = K.view, W = V.x1 - V.x0, H = V.y1 - V.y0, u = uiScale(), m = 36 * Math.min(u, 1.3), x0 = V.x0 + m + 44 / pxPer(), touch = isTouch();
    g.fillStyle = 'rgba(12,16,22,.62)'; g.fillRect(V.x0, V.y0, W, H);
    if (UI.panel === 'settings') return drawSettings(g, V, W, u);
    if (UI.panel === 'crosshair') return drawXhair(g, V, W, u);
    g.fillStyle = FOE; g.fillRect(x0, V.y0 + 26 * u, 7 * u, 66 * u); tx(g, 'DUELPOINT', x0 + 22 * u, V.y0 + 52 * u, 58 * u, BONE, 'left'); tx(g, 'One map. One rival. Every round counts.', x0 + 24 * u, V.y0 + 96 * u, 15 * u, DIM, 'left');
    if (STATS.matches) tx(g, `${STATS.wins} wins in ${STATS.matches} matches · ${STATS.kills} kills`, V.x1 - m, V.y0 + 40 * u, 14 * u, DIM, 'right');
    // operatives
    const rw = cl(W * .27, 300, 420), top = V.y0 + 132 * u, cw = (W - rw - m * 3 - 44 / pxPer() - 28) / 3, chh = Math.min(V.y1 - top - m, 330 * u);
    tx(g, 'CHOOSE YOUR OPERATIVE', x0, top - 14 * u, 13 * u, DIM, 'left');
    Object.entries(OPS).forEach(([k, o], i) => {
      const x = x0 + i * (cw + 14), on = CFG.op === k, hot = zone(x, top, cw, chh, () => { CFG.op = k; saveAll(); click(); });
      rr(g, x, top, cw, chh, 10, on ? 'rgba(20,26,36,.95)' : 'rgba(20,26,36,.7)', on ? o.col : hot ? 'rgba(239,233,220,.5)' : 'rgba(239,233,220,.16)', on ? 3 : 2);
      g.fillStyle = o.col; g.fillRect(x, top, cw, 6 * u);
      tx(g, o.n, x + 18 * u, top + 40 * u, 30 * u, on ? o.col : BONE, 'left'); tx(g, o.role.toUpperCase(), x + cw - 16 * u, top + 40 * u, 12 * u, DIM, 'right');
      let y = top + 84 * u;
      for (const [key, a] of [['Q', o.q], ['E', o.e]]) { rr(g, x + 18 * u, y - 15 * u, 30 * u, 30 * u, 5, null, o.col); tx(g, key, x + 33 * u, y, 15 * u, o.col); tx(g, a.n.toUpperCase(), x + 60 * u, y, 17 * u, BONE, 'left'); y = para(g, a.d, x + 18 * u, y + 32 * u, cw - 36 * u, 13.5 * u, '#b9c0cc') + 18 * u; }
      if (on) tx(g, 'SELECTED', x + cw / 2, top + chh - 20 * u, 12 * u, o.col);
    });
    // what to play
    const rx = V.x1 - m - rw; let y = top;
    btn(g, rx, y, rw, 78 * u, 'PLAY', menuPlay, { on: true, fill: FOE, px: 32 * u, sub: 'against a ' + DIFF[CFG.diff].n + ' bot' }); y += 88 * u;
    choice(g, rx, y, rw, 44 * u, DIFF.map((d, i) => [i, d.n.toUpperCase()]), CFG.diff, v => { CFG.diff = v; }); y += 62 * u;
    btn(g, rx, y, rw, 56 * u, 'PLAY A FRIEND ONLINE', () => MP.show(), { px: 18 * u }); y += 64 * u;
    btn(g, rx, y, rw, 56 * u, 'PRACTICE RANGE', () => play({ mode: 'range' }), { px: 18 * u }); y += 64 * u;
    if (!touch) { const ty = top + chh + 26 * u; tx(g, 'HOW IT PLAYS', x0, ty, 13 * u, DIM, 'left'); ['Stand still to shoot straight. Tap the opposite key to stop dead.', 'Tap or burst at range: sprays climb, then sway. Heads take the most.', 'B opens the armory. Right click aims or scopes. F plants and defuses.'].forEach((t, i) => tx(g, t, x0, ty + 26 * u + i * 24 * u, 14 * u, '#b9c0cc', 'left', 600)); }
    btn(g, rx, y, (rw - 8) / 2, 50 * u, 'SETTINGS', () => { UI.panel = 'settings'; }, { px: 15 * u }); btn(g, rx + (rw + 8) / 2, y, (rw - 8) / 2, 50 * u, 'CROSSHAIR', () => { UI.panel = 'crosshair'; }, { px: 15 * u });
  }
  function drawSettings(g, V, W, u) {
    const w = Math.min(W - 80, 760 * u), x = 640 - w / 2; let y = V.y0 + 40 * u;
    tx(g, 'SETTINGS', x, y + 10 * u, 38 * u, BONE, 'left'); y += 66 * u;
    if (isTouch()) { slider(g, x, y, w, 'Look speed', CFG.tsens, .4, 2.5, v => { CFG.tsens = v; }, v => v.toFixed(2) + 'x'); y += 56 * u; toggle(g, x, y, w, 'Aim assist', CFG.assist, v => { CFG.assist = v; }, 'slows and leans your aim near your rival'); y += 56 * u; toggle(g, x, y, w, 'Auto-fire', CFG.autofire, v => { CFG.autofire = v; }, 'shoots when your crosshair is on them'); y += 56 * u; }
    else { slider(g, x, y, w, 'Mouse sensitivity', CFG.sens, .2, 3, v => { CFG.sens = v; }, v => v.toFixed(2) + 'x'); y += 56 * u; }
    tx(g, 'Picture quality', x, y + 23 * u, 17 * u, BONE, 'left'); choice(g, x + w * .42, y + 3 * u, w * .58, 40 * u, [['auto', 'AUTO'], ['low', 'FAST'], ['high', 'SHARP']], CFG.quality, v => { CFG.quality = v; }); y += 50 * u;
    tx(g, 'Quality changes apply the next time you open the game.', x + w * .42, y + 8 * u, 12 * u, DIM, 'left'); y += 44 * u;
    btn(g, x, y, 200 * u, 52 * u, 'BACK', () => { UI.panel = 'home'; }, { px: 18 * u });
  }
  function drawXhair(g, V, W, u) {
    const w = Math.min(W - 80, 1000 * u), x = 640 - w / 2, c = CFG.xh, lw = w * .56, px = x + lw + 30 * u, pw = w - lw - 30 * u; let y = V.y0 + 30 * u;
    tx(g, 'CROSSHAIR', x, y + 14 * u, 38 * u, BONE, 'left'); y += 62 * u;
    // the preview: against light, dark and bright, and opening the way it will when you move and shoot
    const ph = Math.min(300 * u, V.y1 - y - 100 * u), err = c.dyn ? (Math.sin(K.t * 2.2) * .5 + .5) * 14 : 0;
    ['#cfd8dc', '#3a4250', '#e8b06a'].forEach((bg, i) => { g.fillStyle = bg; g.fillRect(px + i * pw / 3, y, pw / 3 + 1, ph); });
    g.fillStyle = 'rgba(12,16,22,.5)'; g.fillRect(px, y + ph * .62, pw, ph * .38); [0, 1, 2].forEach(i => drawCrosshair(g, px + pw * (i + .5) / 3, y + ph * .45, i === 1 ? err : 0, Math.max(1, u * .85)));
    tx(g, 'still', px + pw / 6, y + ph - 16 * u, 12 * u, BONE); tx(g, c.dyn ? 'moving' : 'fixed', px + pw / 2, y + ph - 16 * u, 12 * u, BONE); tx(g, 'still', px + pw * 5 / 6, y + ph - 16 * u, 12 * u, BONE);
    tx(g, 'PRESETS', px, y + ph + 22 * u, 12 * u, DIM, 'left');
    XH_PRESETS.forEach((p, i) => { const bw = (pw - 4 * 6) / 5; btn(g, px + i * (bw + 6), y + ph + 36 * u, bw, 40 * u, p.n.toUpperCase(), () => { const { n, ...rest } = p; CFG.xh = { ...rest }; saveAll(); }, { px: 12 * u }); });
    const set = (k, v) => { c[k] = v; };
    tx(g, 'Shape', x, y + 20 * u, 17 * u, BONE, 'left'); choice(g, x + lw * .3, y, lw * .7, 40 * u, [['cross', 'CROSS'], ['tee', 'TEE'], ['circle', 'RING'], ['dot', 'DOT']], c.shape, v => set('shape', v)); y += 54 * u;
    tx(g, 'Colour', x, y + 20 * u, 17 * u, BONE, 'left');
    XH_COLS.forEach((col, i) => { const s = 36 * u, bx = x + lw * .3 + i * (s + 8 * u); zone(bx, y + 2 * u, s, s, () => { set('col', col); saveAll(); click(); }); rr(g, bx, y + 2 * u, s, s, 6, col, c.col === col ? BONE : 'rgba(0,0,0,.4)', c.col === col ? 4 : 2); }); y += 54 * u;
    if (c.shape !== 'dot' && c.shape !== 'circle') { slider(g, x, y, lw, 'Length', c.len, 2, 22, v => set('len', Math.round(v)), v => String(Math.round(v))); y += 50 * u; }
    if (c.shape !== 'dot') { slider(g, x, y, lw, c.shape === 'circle' ? 'Size' : 'Gap', c.gap, 0, 16, v => set('gap', Math.round(v)), v => String(Math.round(v))); y += 50 * u; }
    slider(g, x, y, lw, 'Thickness', c.thick, 1, 8, v => set('thick', Math.round(v)), v => String(Math.round(v))); y += 50 * u;
    if (c.shape !== 'dot') { toggle(g, x, y, lw, 'Centre dot', c.dot, v => set('dot', v)); y += 50 * u; }
    toggle(g, x, y, lw, 'Dark outline', c.outline, v => set('outline', v)); y += 50 * u;
    if (c.shape !== 'dot') { toggle(g, x, y, lw, 'Opens with error', c.dyn, v => set('dyn', v), 'shows how accurate you are'); y += 50 * u; }
    btn(g, x, V.y1 - 70 * u, 200 * u, 52 * u, 'BACK', () => { UI.panel = 'home'; }, { px: 18 * u });
  }

  // the armory: a tab for each class of weapon, large cards, tap to buy and tap again to sell back
  function drawArmory(g) {
    const V = K.view, W = V.x1 - V.x0, u = uiScale(), P = me(), x = V.x0 + 26 * u, w = W - 52 * u, y0 = V.y0 + 58 * Math.min(u, 1.2), h = V.y1 - y0 - 14 * u;
    rr(g, x, y0, w, h, 12, 'rgba(12,16,22,.95)', 'rgba(239,233,220,.25)');
    tx(g, 'ARMORY', x + 22 * u, y0 + 30 * u, 26 * u, BONE, 'left'); tx(g, `◈ ${P.credits}`, x + w - 22 * u, y0 + 30 * u, 24 * u, GOLD, 'right');
    tx(g, M.mode === 'range' ? 'Everything is free on the range' : `Round starts in ${Math.max(0, Math.ceil(M.t))}`, x + w / 2, y0 + 30 * u, 14 * u, DIM);
    // tabs
    const ty = y0 + 56 * u, th = 42 * u, tw = (w - 44 * u - 6 * 6) / 7;
    CLASSES.forEach(([cat, label], i) => btn(g, x + 22 * u + i * (tw + 6), ty, tw, th, label.toUpperCase(), () => { UI.tab = cat; UI.pick = null; }, { on: UI.tab === cat, fill: BONE, px: Math.min(15 * u, tw * .15) }));
    // cards
    const items = UI.tab === 'Shield' ? ARMOR.map(a => ({ k: a.k, n: a.n, cost: a.cost, col: '#7fc8ff', armor: a })) : Object.values(GUNS).filter(q => q.cat === UI.tab);
    const cy = ty + th + 14 * u, fh = 84 * u, ch = y0 + h - cy - fh - 14 * u, n = items.length, cw = Math.min((w - 44 * u - (n - 1) * 10) / n, 330 * u), sx = x + (w - n * cw - (n - 1) * 10) / 2;
    let focus = null;
    items.forEach((it, i) => {
      const cx = sx + i * (cw + 10), A = it.armor, G = A ? null : it, sp = P.spent;
      const owned = A ? P.sh >= A.sh : P.guns[G.slot] === it.k, mineNow = A ? sp.sh && sp.sh.k === it.k : sp[G.slot] && sp[G.slot].k === it.k, refund = A ? (sp.sh ? ARMOR.find(a => a.k === sp.sh.k).cost : 0) : (sp[G.slot] ? GUNS[sp[G.slot].k].cost : 0);
      const can = !owned && P.credits + refund >= it.cost, live = can || (owned && mineNow);
      const hot = zone(cx, cy, cw, ch, () => { UI.pick = it.k; buy(P, it.k); }); if (hot || UI.pick === it.k) focus = it;
      rr(g, cx, cy, cw, ch, 9, owned ? 'rgba(53,224,200,.13)' : hot && can ? 'rgba(255,138,61,.16)' : 'rgba(255,255,255,.04)', owned ? YOU : hot || UI.pick === it.k ? 'rgba(239,233,220,.6)' : can ? 'rgba(239,233,220,.22)' : 'rgba(255,255,255,.07)');
      tx(g, it.n.toUpperCase(), cx + 14 * u, cy + 24 * u, Math.min(21 * u, cw * .1), can || owned ? it.col : '#5a6272', 'left');
      tx(g, owned ? (mineNow ? 'SELL BACK' : 'OWNED') : it.cost ? `◈ ${it.cost}` : 'FREE', cx + cw - 12 * u, cy + 24 * u, Math.min(16 * u, cw * .075), owned ? YOU : can ? GOLD : '#5a6272', 'right');
      g.save(); g.globalAlpha = can || owned ? 1 : .35; const iy = cy + 44 * u, ih = ch - 44 * u - (G ? 58 * u : 10 * u);
      if (G) { const ic = gunIcon(it.k); if (ic) { const gl = g.createRadialGradient(cx + cw / 2, iy + ih / 2, 4, cx + cw / 2, iy + ih / 2, cw * .5); gl.addColorStop(0, it.col + '33'); gl.addColorStop(1, it.col + '00'); g.fillStyle = gl; g.fillRect(cx + 2, iy, cw - 4, ih); const dw = Math.min((cw - 20 * u) * (G.cat === 'Sidearm' ? 1.7 : G.cat === 'SMG' || G.cat === 'Shotgun' ? 1.2 : 1), ih * 3.2), dh = dw * 150 / 480; g.beginPath(); g.rect(cx + 2, iy, cw - 4, ih); g.clip(); g.drawImage(ic, cx + (cw - dw) / 2, iy + (ih - dh) / 2, dw, dh); } }
      else { const mx = cx + cw / 2, my = iy + ih / 2, s = Math.min(ih, cw) / 90 * (A.sh === 50 ? 1.1 : .85); g.fillStyle = it.col + '33'; g.strokeStyle = it.col; g.lineWidth = 3 * u; g.beginPath(); g.moveTo(mx, my - 32 * s); g.lineTo(mx + 26 * s, my - 22 * s); g.lineTo(mx + 22 * s, my + 12 * s); g.lineTo(mx, my + 32 * s); g.lineTo(mx - 22 * s, my + 12 * s); g.lineTo(mx - 26 * s, my - 22 * s); g.closePath(); g.fill(); g.stroke(); tx(g, '+' + A.sh, mx, my, 22 * s, BONE); }
      if (G) { const d = G.dmg[0]; tx(g, `HEAD ${d[1]} · BODY ${d[2]} · LEGS ${d[3]}${G.pel ? '  ×' + G.pel : ''}`, cx + cw / 2, cy + ch - 40 * u, Math.min(12.5 * u, cw * .058), '#cfd6e2'); tx(g, `${Math.round(G.rpm)} A MINUTE · ${G.mag} ROUNDS · ${G.auto ? 'AUTO' : 'SEMI'}`, cx + cw / 2, cy + ch - 18 * u, Math.min(11.5 * u, cw * .053), DIM); }
      g.restore();
    });
    // what you are pointing at, and the way out
    const fy = y0 + h - fh; if (focus) { tx(g, focus.n.toUpperCase(), x + 22 * u, fy + 20 * u, 17 * u, focus.col, 'left'); para(g, focus.armor ? `Soaks the next ${focus.armor.sh} damage you take. Lasts until it is used up or you die.` : focus.desc, x + 22 * u, fy + 46 * u, w - 300 * u, 13.5 * u, '#cfd6e2'); }
    else tx(g, 'Tap a weapon to buy it. Tap something you bought this round to sell it back.', x + 22 * u, fy + 34 * u, 14 * u, DIM, 'left');
    btn(g, x + w - 222 * u, fy + 12 * u, 200 * u, 56 * u, M.mode === 'range' ? 'CLOSE' : 'READY', () => openArmory(false), { on: true, fill: YOU, px: 22 * u, sub: isTouch() ? '' : 'or press B' });
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
    const by = Math.min(V.y1 - 80 * u, ty + (rows.length + 1) * 40 * u + 40 * u);
    btn(g, 640 - 250 * u, by, 240 * u, 58 * u, M.online ? 'BACK TO THE ROOM' : 'PLAY AGAIN', () => { if (M.online) { toMenu(); MP.show(); } else play({ mode: M.mode, diff: CFG.diff }); }, { on: true, fill: FOE, px: 19 * u });
    btn(g, 640 + 10 * u, by, 240 * u, 58 * u, 'MENU', toMenu, { px: 19 * u });
  }
