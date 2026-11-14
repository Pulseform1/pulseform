  /* ---------- 92 hud: everything on screen during a round ----------
     Drawn on the kit's 2D canvas, in its 1280 by 720 units (K.view is the part of that the screen shows). Each cluster
     hangs off a corner or the centre and is scaled by uiScale(), so one layout serves a monitor and a phone.
     Also here: the small drawing helpers every screen uses, and the crosshair, which the player designs in settings. */
  const FONT = '"Chakra Petch", system-ui, sans-serif', GLASS = 'rgba(12,16,22,.78)';
  // no text is ever drawn smaller than MIN_PX on the real screen, whatever scale the layout is at
  const fitPx = (g, px) => { const k = g.getTransform().a * innerWidth / g.canvas.width, min = isTouch() ? 10.5 : 9; return px * k < min ? min / k : px; };
  function tx(g, s, x, y, px, col = BONE, align = 'center', weight = 700) { px = fitPx(g, px); g.font = `${weight} ${px}px ${FONT}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }
  function rr(g, x, y, w, h, r, fill, stroke, lw = 2) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
  }
  // a button: draws it, registers its press zone, returns whether the mouse is over it. o: { px, fill, col, edge, sub, on, off }
  function btn(g, x, y, w, h, label, fn, o = {}) {
    const hot = zone(x, y, w, h, () => { click(!o.off); if (!o.off) fn(); }) && !o.off;
    rr(g, x, y, w, h, Math.min(10, h / 4), o.on ? (o.fill || FOE) : hot ? 'rgba(239,233,220,.16)' : o.fill && !o.on && o.solid ? o.fill : 'rgba(12,16,22,.72)', o.on ? null : hot ? BONE : o.edge || 'rgba(239,233,220,.28)');
    tx(g, label, x + w / 2, y + h / 2 - (o.sub ? h * .13 : 0), o.px || h * .42, o.off ? '#5a6272' : o.on ? INK : o.col || BONE);
    if (o.sub) tx(g, o.sub, x + w / 2, y + h * .74, (o.px || h * .42) * .5, o.on ? 'rgba(12,16,22,.75)' : DIM);
    return hot;
  }
  // wrap text into lines no wider than w; returns the y after the last line
  function para(g, s, x, y, w, px, col, lh = 1.3) {
    px = fitPx(g, px); g.font = `600 ${px}px ${FONT}`; g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle'; let line = '';
    for (const word of s.split(' ')) { const t = line ? line + ' ' + word : word; if (g.measureText(t).width > w && line) { g.fillText(line, x, y); line = word; y += px * lh; } else line = t; }
    g.fillText(line, x, y); return y + px * lh;
  }
  const XH_PRESETS = [
    { n: 'Classic', shape: 'cross', col: '#35e0c8', len: 9, gap: 3, thick: 3, dot: true, outline: true, dyn: true },
    { n: 'Tight', shape: 'cross', col: '#ffffff', len: 5, gap: 2, thick: 2, dot: false, outline: true, dyn: false },
    { n: 'Dot', shape: 'dot', col: '#7dff9a', len: 0, gap: 0, thick: 5, dot: true, outline: true, dyn: false },
    { n: 'Ring', shape: 'circle', col: '#ffd23f', len: 0, gap: 7, thick: 2, dot: true, outline: false, dyn: true },
    { n: 'Tee', shape: 'tee', col: '#ff8a3d', len: 10, gap: 4, thick: 3, dot: false, outline: true, dyn: true },
  ];
  const XH_COLS = ['#35e0c8', '#7dff9a', '#ffffff', '#ffd23f', '#ff8a3d', '#ff5a8a', '#6fb8ff', '#c58cff'];
  // the crosshair, centred on x,y: err is the extra gap (in HUD units) that your current inaccuracy opens it by
  function drawCrosshair(g, x, y, err, k = 1) {
    const c = CFG.xh, th = Math.max(1, c.thick * k), gap = c.gap * k + (c.dyn ? err : 0), len = c.len * k, o = c.outline ? 1.5 : 0;
    const arm = (ax, ay, w, h) => { if (o) { g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(ax - o, ay - o, w + o * 2, h + o * 2); } g.fillStyle = c.col; g.fillRect(ax, ay, w, h); };
    if (c.shape === 'circle') { const r = gap + 4 * k; if (o) { g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = th + o * 2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); } g.strokeStyle = c.col; g.lineWidth = th; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }
    else if (c.shape !== 'dot' && len > 0) {
      if (o) { g.fillStyle = 'rgba(0,0,0,.75)'; for (const [ax, ay, w, h] of [[x - gap - len, y - th / 2, len, th], [x + gap, y - th / 2, len, th], [x - th / 2, y + gap, th, len]].concat(c.shape === 'tee' ? [] : [[x - th / 2, y - gap - len, th, len]])) g.fillRect(ax - o, ay - o, w + o * 2, h + o * 2); }
      g.fillStyle = c.col; g.fillRect(x - gap - len, y - th / 2, len, th); g.fillRect(x + gap, y - th / 2, len, th); g.fillRect(x - th / 2, y + gap, th, len); if (c.shape !== 'tee') g.fillRect(x - th / 2, y - gap - len, th, len);
    }
    if (c.dot || c.shape === 'dot') { const d = c.shape === 'dot' ? th * 1.2 : Math.max(2, th * .8); arm(x - d / 2, y - d / 2, d, d); }
  }

  let hitMark = null, heard = null, mmCanvas = null;
  on('hurt', (v, by, dmg, head) => { if (M && by === me()) hitMark = { t: .28, head, dmg, kill: v.hp <= 0 && !v.net, x: rnd(-14, 14) }; });
  on('kill', (v, by) => { if (M && by === me() && hitMark) hitMark.kill = true; });
  // a running step or a shot from the rival marks the minimap for a moment (only if a bot could have heard it too)
  const note = f => { if (M && f === foe() && Math.hypot(f.x - me().x, f.z - me().z) < 30) heard = { x: f.x, z: f.z, t: 1.6 }; };
  on('step', note); on('shot', (f, S, first) => { if (first && !gun(f).sil) note(f); });
  function miniMap() {
    if (mmCanvas) return mmCanvas; const s = 8, c = mmCanvas = document.createElement('canvas'); c.width = GW * s; c.height = GH * s; const g = c.getContext('2d');
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const ch = SRC[j][i]; g.fillStyle = ch === '#' ? 'rgba(12,16,22,.9)' : ch === '~' ? 'rgba(53,150,170,.8)' : ch === 'X' ? 'rgba(70,80,96,.95)' : ch === 'c' ? 'rgba(150,120,84,.95)' : ch === 'o' ? 'rgba(255,138,61,.4)' : ch === 'P' || ch === '7' || ch === '8' ? 'rgba(190,190,180,.75)' : 'rgba(210,205,190,.5)'; g.fillRect(i * s, j * s, s, s); }
    return c;
  }
  const clock = t => { t = Math.max(0, Math.ceil(t)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

  function drawHud(g) {
    const P = me(), F = foe(), G = gun(P), V = K.view, u = uiScale(), touch = isTouch(), side = sideOf(P), W = V.x1 - V.x0, H = V.y1 - V.y0, range = M.mode === 'range', demo = M.mode === 'demo';
    // --- over the whole view: scope, flash, the red of being hit
    if (P.scoped && G.scope && P.alive) { const r = Math.min(H * .46, 330); g.fillStyle = '#000'; g.beginPath(); g.rect(V.x0, V.y0, W, H); g.arc(640, 360, r, 0, TAU, true); g.fill(); g.strokeStyle = 'rgba(0,0,0,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(640 - r, 360); g.lineTo(640 + r, 360); g.moveTo(640, 360 - r); g.lineTo(640, 360 + r); g.stroke(); g.fillStyle = WARN; g.fillRect(639, 359, 2, 2); }
    if (P.flash > 0) { g.fillStyle = `rgba(255,255,255,${cl(P.flash / 1.2, 0, 1)})`; g.fillRect(V.x0, V.y0, W, H); }
    if (M.hurt > 0) { const gr = g.createRadialGradient(640, 360, H * .35, 640, 360, H * .8); gr.addColorStop(0, 'rgba(255,60,50,0)'); gr.addColorStop(1, `rgba(255,60,50,${M.hurt * .5})`); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, H);
      const a = M.hurtDir - P.yaw + Math.PI; g.save(); g.translate(640, 360); g.rotate(-a); g.fillStyle = `rgba(255,90,77,${M.hurt * .8})`; g.beginPath(); g.arc(0, 0, 150 * u, Math.PI * 1.36, Math.PI * 1.64); g.arc(0, 0, 134 * u, Math.PI * 1.64, Math.PI * 1.36, true); g.fill(); g.restore(); }
    // --- markers in the world: a pinged rival, the planted charge
    if (F.alive && F.reveal > 0) { const s = toScreen(F.x, F.y + 1.1, F.z); if (s) { g.strokeStyle = FOE; g.lineWidth = 3; g.beginPath(); g.moveTo(s[0], s[1] - 30); g.lineTo(s[0] + 20, s[1]); g.lineTo(s[0], s[1] + 30); g.lineTo(s[0] - 20, s[1]); g.closePath(); g.stroke(); } }
    if (M.planted && M.phase === 'live') { const s = toScreen(M.planted.x, M.planted.y + .9, M.planted.z); if (s) { const p = 1 + Math.sin(M.time * 9) * .12; g.fillStyle = FOE; g.beginPath(); g.moveTo(s[0], s[1] - 11 * u * p); g.lineTo(s[0] + 9 * u * p, s[1]); g.lineTo(s[0], s[1] + 11 * u * p); g.lineTo(s[0] - 9 * u * p, s[1]); g.fill(); tx(g, Math.hypot(P.x - M.planted.x, P.z - M.planted.z).toFixed(0) + ' m', s[0], s[1] + 24 * u, 13 * u, BONE); } }
    // --- crosshair and hit marks
    if (P.alive && !(P.scoped && G.scope) && !demo) drawCrosshair(g, 640, 360, Math.tan(spreadOf(P)) / Math.tan((X ? X.camera.fov : BASE_FOV) * D2R / 2) * 360, Math.max(1, u * .85));
    if (hitMark && (hitMark.t -= 1 / 60) > 0) {
      const c = hitMark.kill ? WARN : hitMark.head ? GOLD : '#fff', k = 1 + (1 - hitMark.t / .28) * .4; g.strokeStyle = c; g.lineWidth = 3 * u; g.beginPath();
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.moveTo(640 + a * 9 * u * k, 360 + b * 9 * u * k); g.lineTo(640 + a * 17 * u * k, 360 + b * 17 * u * k); } g.stroke();
      if (range) tx(g, String(hitMark.dmg), 640 + 44 * u + hitMark.x, 360 - 30 * u - (1 - hitMark.t / .28) * 16, 20 * u, c);
    }
    // --- top: score, clock, round
    g.save(); g.translate(640, V.y0 + 8); g.scale(u, u);
    if (!range) {
      g.fillStyle = GLASS; g.beginPath(); g.moveTo(-150, 0); g.lineTo(150, 0); g.lineTo(128, 62); g.lineTo(-128, 62); g.closePath(); g.fill();
      tx(g, String(M.wins[0]), -98, 30, 38, YOU); tx(g, String(M.wins[1]), 98, 30, 38, FOE);
      if (M.planted && M.phase === 'live') { const k = cl(M.planted.t / FUSE_T, 0, 1), on = Math.sin(M.time * (6 + (1 - k) * 14)) > 0; g.fillStyle = on ? WARN : '#5a2620'; g.beginPath(); g.moveTo(0, 8); g.lineTo(13, 24); g.lineTo(0, 40); g.lineTo(-13, 24); g.fill(); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-46, 46, 92, 5); g.fillStyle = WARN; g.fillRect(-46, 46, 92 * k, 5); }
      else { tx(g, clock(M.t), 0, 25, 30, M.phase === 'live' && M.t < 10 ? WARN : BONE); tx(g, M.phase === 'buy' ? 'BUY PHASE' : M.phase === 'end' ? 'ROUND OVER' : 'ROUND ' + M.round, 0, 50, 11, DIM); }
      tx(g, demo ? P.name.toUpperCase() : 'YOU', -166, 20, 14, YOU, 'right'); tx(g, side === 'att' ? 'ATTACK' : 'DEFEND', -166, 40, 12, DIM, 'right');
      tx(g, F.name.toUpperCase(), 166, 20, 14, FOE, 'left'); tx(g, OPS[F.op].n, 166, 40, 12, DIM, 'left');
    } else { rr(g, -210, 0, 420, 44, 8, GLASS); tx(g, 'RANGE', -190, 22, 18, GOLD, 'left'); tx(g, `${P.stat.hits} hits / ${P.stat.shots} shots` + (P.stat.shots ? `  ·  ${Math.round(100 * P.stat.hits / P.stat.shots)}%` : ''), 190, 22, 14, BONE, 'right'); }
    g.restore();
    // --- minimap, top left (beside the kit's pause button)
    { const mw = 200 * u, mh = mw * GH / GW, mx = V.x0 + 62 / pxPer(), my = V.y0 + 10, k = mw / MW;
      g.globalAlpha = .9; g.drawImage(miniMap(), mx, my, mw, mh); g.globalAlpha = 1; g.strokeStyle = 'rgba(239,233,220,.3)'; g.lineWidth = 1.5; g.strokeRect(mx, my, mw, mh);
      if (M.planted) { g.fillStyle = WARN; g.beginPath(); g.arc(mx + M.planted.x * k, my + M.planted.z * k, 4.5 * u, 0, TAU); g.fill(); }
      if (heard && (heard.t -= 1 / 60) > 0) { g.strokeStyle = `rgba(255,138,61,${heard.t / 1.6})`; g.lineWidth = 2; g.beginPath(); g.arc(mx + heard.x * k, my + heard.z * k, (8 + (1.6 - heard.t) * 8) * u, 0, TAU); g.stroke(); }
      if (F.alive && (F.reveal > 0 || canSee(P, F))) { g.fillStyle = FOE; g.beginPath(); g.arc(mx + F.x * k, my + F.z * k, 4 * u, 0, TAU); g.fill(); }
      g.save(); g.translate(mx + P.x * k, my + P.z * k); g.rotate(-P.yaw); g.fillStyle = 'rgba(53,224,200,.22)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 30 * u, -Math.PI / 2 - .6, -Math.PI / 2 + .6); g.fill(); g.fillStyle = YOU; g.beginPath(); g.moveTo(0, -7 * u); g.lineTo(5 * u, 5 * u); g.lineTo(-5 * u, 5 * u); g.fill(); g.restore();
      const ar = areaAt(P.x, P.z); if (ar) tx(g, ar.n.toUpperCase(), mx + 4, my + mh + 12 * u, 13 * u, ar.col, 'left'); }
    // --- kill feed, top right
    M.feed.forEach((k, i) => { const w = 250 * u, x = V.x1 - 14 - w, y = V.y0 + (touch ? 58 : 14) * u + i * 30 * u; rr(g, x, y, w, 25 * u, 5, k.mine ? 'rgba(53,224,200,.28)' : 'rgba(255,138,61,.28)'); tx(g, `${k.a}   ${k.w}${k.head ? ' ◎' : ''}   ${k.b}`, x + w - 10 * u, y + 13 * u, 12.5 * u, BONE, 'right'); });
    // --- health, weapon and abilities
    const A = P.ammo[G.k] || { mag: 0, res: 0 }, hpCol = P.hp > 30 ? BONE : WARN;
    if (touch) {   // one strip, bottom centre, clear of both thumbs
      g.save(); g.translate(640, V.y1 - 10); g.scale(u, u); rr(g, -205, -44, 410, 44, 8, GLASS);
      tx(g, String(Math.ceil(P.hp)), -186, -22, 28, hpCol, 'left'); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-128, -27, 84, 7); g.fillStyle = hpCol; g.fillRect(-128, -27, 84 * P.hp / 100, 7); if (P.sh) { g.fillStyle = '#7fc8ff'; g.fillRect(-128, -17, 84 * P.sh / 50, 5); }
      tx(g, G.n.toUpperCase(), 0, -22, 15, G.col); tx(g, G.melee ? '—' : `${A.mag} / ${A.res}`, 186, -22, 24, A.mag || G.melee ? BONE : WARN, 'right'); g.restore();
    } else {
      g.save(); g.translate(V.x0 + 22, V.y1 - 20); g.scale(u, u); rr(g, 0, -58, 250, 58, 8, GLASS);
      tx(g, String(Math.ceil(P.hp)), 18, -28, 40, hpCol, 'left'); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(104, -36, 128, 8); g.fillStyle = hpCol; g.fillRect(104, -36, 128 * P.hp / 100, 8);
      if (P.sh) { g.fillStyle = '#7fc8ff'; g.fillRect(104, -22, 128 * P.sh / 50, 6); tx(g, String(P.sh), 104 + 128 * P.sh / 50 + 6, -19, 11, '#7fc8ff', 'left'); }
      const op = OPS[P.op]; [['Q', 'q'], ['E', 'e']].forEach(([key, k], i) => { const x = 266 + i * 96, on = P.ab[k]; rr(g, x, -58, 86, 58, 8, on ? GLASS : 'rgba(12,16,22,.4)', on ? op.col : 'rgba(255,255,255,.12)'); tx(g, op[k].n.toUpperCase(), x + 43, -38, 14, on ? BONE : '#5a6272'); tx(g, key, x + 43, -16, 14, on ? op.col : '#5a6272'); });
      g.restore();
      g.save(); g.translate(V.x1 - 22 - 50 / pxPer(), V.y1 - 20); g.scale(u, u); rr(g, -270, -58, 270, 58, 8, GLASS);
      if (G.melee) tx(g, '—', -150, -28, 34, BONE); else { tx(g, String(A.mag), -150, -28, 42, A.mag ? BONE : WARN, 'right'); tx(g, '/ ' + A.res, -140, -22, 18, DIM, 'left'); }
      tx(g, G.n.toUpperCase(), -14, -38, 15, G.col, 'right'); tx(g, G.cat.toUpperCase(), -14, -18, 11, DIM, 'right');
      [1, 2, 3].forEach((s, i) => { const k = P.guns[s], y = -78 - (2 - i) * 24; if (!k) return; const on = P.slot === s; rr(g, -150, y - 10, 150, 21, 5, on ? 'rgba(239,233,220,.24)' : 'rgba(12,16,22,.7)'); tx(g, String(s), -140, y + 1, 12, on ? GOLD : DIM, 'left'); tx(g, GUNS[k].n.toUpperCase(), -10, y + 1, 12, on ? BONE : '#b9c0cc', 'right'); });
      if (canBuy()) tx(g, `◈ ${P.credits}`, -14, -170, 20, GOLD, 'right');
      g.restore();
    }
    if (touch && canBuy()) tx(g, `◈ ${P.credits}`, 640, V.y1 - 66 * u, 17 * u, GOLD);
    // --- the charge: what to do, and how far along
    const ring = (frac, label, col) => { const y = 470; g.strokeStyle = 'rgba(12,16,22,.7)'; g.lineWidth = 12 * u; g.beginPath(); g.arc(640, y, 34 * u, 0, TAU); g.stroke(); g.strokeStyle = col; g.lineWidth = 7 * u; g.beginPath(); g.arc(640, y, 34 * u, -Math.PI / 2, -Math.PI / 2 + TAU * frac); g.stroke(); tx(g, label, 640, y + 60 * u, 15 * u, col); };
    if (P.reloadT > 0) tx(g, 'RELOADING', 640, 420, 15 * u, GOLD);
    if (M.phase === 'live' && P.alive && !range && !demo) {
      const near = M.planted && Math.hypot(P.x - M.planted.x, P.z - M.planted.z) < 1.7, key = touch ? 'Hold the button' : 'Hold F';
      if (P.plant > 0) ring(P.plant / PLANT_T, 'PLANTING', FOE); else if (P.defuse > 0) ring(P.defuse / DEFUSE_T, 'DEFUSING', YOU);
      else if (side === 'att' && !M.planted) tx(g, onSite(P.x, P.z) ? key + ' to plant the charge' : M.t > ROUND_T - 6 ? 'Carry the charge to the ring and plant it' : '', 640, V.y0 + 104 * u, 16 * u, onSite(P.x, P.z) ? GOLD : 'rgba(239,233,220,.75)');
      else if (side === 'def' && M.planted) tx(g, near ? key + ' to defuse' : 'Defuse the charge', 640, V.y0 + 104 * u, 16 * u, near ? GOLD : 'rgba(239,233,220,.75)');
      else if (side === 'def' && M.t > ROUND_T - 6) tx(g, 'Stop them planting on the ring', 640, V.y0 + 104 * u, 16 * u, 'rgba(239,233,220,.75)');
      if (F.alive && F.defuse > 0) tx(g, 'YOUR RIVAL IS DEFUSING', 640, 250, 20 * u, WARN);
    }
    // --- banners
    if (M.say) { const a = Math.min(1, M.say.t * 5, (2.6 - M.say.t) * 3); g.globalAlpha = cl(a, 0, 1); tx(g, M.say.s, 640, 170, 30 * u, M.say.c); g.globalAlpha = 1; }
    if (M.phase === 'end' && M.last && !M.over) { const won = M.last.wi === 0, c = won ? YOU : FOE; g.fillStyle = won ? 'rgba(53,224,200,.16)' : 'rgba(255,138,61,.16)'; g.fillRect(V.x0, 250 - 62 * u, W, 124 * u); tx(g, demo ? `${M.fs[M.last.wi].name.toUpperCase()} TAKES IT` : won ? 'ROUND WON' : 'ROUND LOST', 640, 250 - 12 * u, 50 * u, c); tx(g, WHY[M.last.why].toUpperCase(), 640, 250 + 32 * u, 16 * u, BONE); }
    if (M.phase === 'buy' && !UI.armory && !range) { tx(g, pistolRound(M.round) ? 'PISTOL ROUND' : M.round === WIN_ROUNDS * 2 - 1 ? 'DECIDER' : 'ROUND ' + M.round, 640, 200, 34 * u, BONE); tx(g, side === 'att' ? 'You attack: plant the charge on the ring' : 'You defend: keep them off the ring', 640, 200 + 36 * u, 16 * u, side === 'att' ? FOE : YOU); }
    if (!P.alive && M.deathInfo && !range) { const D = M.deathInfo; rr(g, 640 - 250 * u, 590 - 34 * u, 500 * u, 68 * u, 8, GLASS, FOE); tx(g, `${D.by.toUpperCase()} · ${D.w}${D.head ? ' · headshot' : ''}`, 640, 590 - 12 * u, 18 * u, FOE); tx(g, `They had ${D.hp} health${D.sh ? ' and ' + D.sh + ' shield' : ''} left`, 640, 590 + 14 * u, 13 * u, BONE); }
    // --- touch controls
    if (touch && !UI.armory && !demo) drawTouch(g, u);
    if (canBuy() && !UI.armory && !demo && P.alive) { const w = 170 * u, h = 44 * u; btn(g, 640 - w / 2, V.y0 + 84 * u, w, h, touch ? 'ARMORY' : 'ARMORY  (B)', () => openArmory(true), { px: 17 * u, col: GOLD, edge: GOLD }); }
    if (UI.armory) drawArmory(g);
    if (!touch && !UI.armory && !demo && !locked() && K.state === 'play') { g.fillStyle = 'rgba(12,16,22,.45)'; g.fillRect(V.x0, V.y0, W, H); tx(g, 'CLICK TO AIM', 640, 330, 34, BONE); tx(g, 'Esc pauses', 640, 372, 15, DIM); }
  }
  function drawTouch(g, u) {
    const V = K.view;
    for (const b of touchButtons()) {
      const held = (b.k === 'fire' && TS.fire != null) || [...TS.held.values()].includes(b.k) || b.on, c = b.col || BONE;
      g.fillStyle = held ? 'rgba(255,138,61,.6)' : 'rgba(12,16,22,.55)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill();
      g.strokeStyle = b.off ? 'rgba(255,255,255,.18)' : b.k === 'fire' ? FOE : c; g.globalAlpha = b.off ? 1 : .8; g.lineWidth = 2.5 * u; g.stroke(); g.globalAlpha = 1;
      tx(g, b.t, b.x, b.y, (b.k === 'fire' || b.k === 'use' ? 17 : b.t.length > 5 ? 10.5 : 12.5) * u, b.off ? '#5a6272' : BONE);
    }
    if (TS.stick) { const s = TS.stick, dx = s.x - s.x0, dy = s.y - s.y0, L = Math.min(65 * u, Math.hypot(dx, dy)), a = Math.atan2(dy, dx); g.strokeStyle = 'rgba(239,233,220,.4)'; g.lineWidth = 3 * u; g.beginPath(); g.arc(s.x0, s.y0, 65 * u, 0, TAU); g.stroke(); g.fillStyle = 'rgba(239,233,220,.5)'; g.beginPath(); g.arc(s.x0 + Math.cos(a) * L, s.y0 + Math.sin(a) * L, 27 * u, 0, TAU); g.fill(); }
    else if (me().alive) { const x = V.x0 + 170 * u, y = V.y1 - 150 * u; g.setLineDash([6 * u, 8 * u]); g.strokeStyle = 'rgba(239,233,220,.3)'; g.lineWidth = 2 * u; g.beginPath(); g.arc(x, y, 62 * u, 0, TAU); g.stroke(); g.setLineDash([]); tx(g, 'MOVE', x, y, 13 * u, 'rgba(239,233,220,.45)'); }
  }
