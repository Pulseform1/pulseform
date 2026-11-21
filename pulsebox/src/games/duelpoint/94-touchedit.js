  /* ---------- 94 the touch layout editor (Settings > Button layout) ----------
     Every touch button where it sits in a match. Drag one to move it; the one you touched last is picked, and the bar at the
     top sizes it. The move stick takes a size (it still appears wherever your left thumb lands). RESET THIS puts the picked
     one back, RESET ALL the lot. The layout is saved with the other settings (CFG.tlay), and those go to your account. */
  const TE = { sel: 'fire', grab: null };
  const TE_LABEL = { fire: 'FIRE', alt: 'AIM', jump: 'JUMP', crouch: 'DUCK', reload: 'LOAD', swap: 'SWAP', q: 'Q', e: 'E', x: 'ULT', nade: 'SMOKE', use: 'USE', drop: 'DROP', move: 'MOVE' };
  const TE_NAME = { fire: 'Fire', alt: 'Aim / scope', jump: 'Jump', crouch: 'Duck / slide', reload: 'Reload', swap: 'Swap gun', q: 'Ability Q', e: 'Ability E', x: 'Ultimate', nade: 'Smoke', use: 'Use (plant, defuse, pick up)', drop: 'Drop', move: 'Move stick' };
  function openTouchEdit() { UI.tedit = true; TE.sel = 'fire'; TE.grab = null; }
  function closeTouchEdit() { UI.tedit = false; TE.grab = null; const L = CFG.tlay || {}; for (const k of Object.keys(L)) { const o = L[k]; if (!o || (!o.x && !o.y && (o.s || 1) === 1)) delete L[k]; } saveAll(true); }
  function drawTouchEdit(g) {
    const V = K.view, u = uiScale(), L = CFG.tlay || (CFG.tlay = {}), set = (k, o) => { L[k] = Object.assign({}, L[k] || {}, o); };
    // a dim backdrop that takes every press the editor itself does not
    g.fillStyle = 'rgba(8,10,14,.84)'; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0);
    zone(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0, () => {});
    // the move stick: its size only
    { const h = touchHome('move'), r = h[2] * u * touchSize('move'), on = TE.sel === 'move';
      g.setLineDash([6 * u, 8 * u]); g.strokeStyle = on ? GOLD : 'rgba(239,233,220,.5)'; g.lineWidth = (on ? 3.5 : 2.5) * u; g.beginPath(); g.arc(h[0], h[1], r, 0, TAU); g.stroke(); g.setLineDash([]);
      tx(g, 'MOVE', h[0], h[1], 14 * u, on ? GOLD : BONE, 'center', 900); zone(h[0] - r, h[1] - r, r * 2, r * 2, () => { TE.sel = 'move'; TE.grab = null; }); }
    // the buttons: a press picks one, a drag moves it (from where the finger took hold, so it does not jump)
    for (const k of TOUCH_KEYS) {
      const b = touchAt(k), on = TE.sel === k;
      g.fillStyle = on ? 'rgba(255,138,61,.32)' : 'rgba(12,16,22,.72)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill();
      g.strokeStyle = on ? GOLD : 'rgba(239,233,220,.6)'; g.lineWidth = (on ? 3.5 : 2.5) * u; g.stroke();
      tx(g, TE_LABEL[k], b.x, b.y, Math.min((k === 'fire' || k === 'use' ? 17 : 12.5) * u, b.r * .62), on ? GOLD : BONE, 'center', 900);
      zone(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2, (px, py) => {
        if (!TE.grab || TE.grab.k !== k || TE.grab.n !== PDN) { TE.sel = k; TE.grab = { k, n: PDN, dx: px - b.x, dy: py - b.y }; return; }
        const h = touchHome(k), r = b.r, cx = cl(px - TE.grab.dx, V.x0 + r, V.x1 - r), cy = cl(py - TE.grab.dy, V.y0 + r + tapH(52, 46), V.y1 - r);
        set(k, { x: +((cx - h[0]) / u).toFixed(1), y: +((cy - h[1]) / u).toFixed(1) });
      }, true);
    }
    // the bar along the top: what is picked, its size, and the way out
    const bh = tapH(44, 38), y = V.y0 + 8 * u, x0 = V.x0 + (isTouch() ? 92 : 14) * u, x1 = V.x1 - 14 * u, w = x1 - x0;   // (clear of the pause button in the corner)
    rr(g, V.x0, V.y0, V.x1 - V.x0, bh + 16 * u, 0, 'rgba(12,16,22,.92)');
    const bw = Math.min(150 * u, w * .16), done = x1 - bw, all = done - 8 * u - bw, one = all - 8 * u - bw;
    btn(g, done, y, bw, bh, 'DONE', closeTouchEdit, { on: true, fill: YOU, px: 15 * u });
    btn(g, all, y, bw, bh, 'RESET ALL', () => { CFG.tlay = {}; saveAll(); }, { px: 13 * u });
    btn(g, one, y, bw, bh, 'RESET THIS', () => { delete L[TE.sel]; saveAll(); }, { px: 13 * u });
    const sw = one - 12 * u - x0;
    fine(g, x0, y, sw, TE_NAME[TE.sel] || '', touchSize(TE.sel), .6, 1.7, .05, v => set(TE.sel, { s: v }), v => Math.round(v * 100) + '%');
    tx(g, 'Drag a button to move it  ·  the one you touch is sized above', (V.x0 + V.x1) / 2, y + bh + 30 * u, 12.5 * u, DIM, 'center', 700);
  }
