  /* ---------- 80 hud: crosshair and draw cue, health, arrows, score, timers, overtime zone, coordinates, pings, feed ---------- */
  const GOLD = '#ffd23a', BONE = '#ffffff', DIM = 'rgba(255,255,255,.72)', DARK = 'rgba(16,40,92,.72)', TEAL = '#7fe0d0', HURT = '#ff8a5a';
  const HUD = { hits: [], banner: null, rulerFlash: 0, hurtFlash: 0, toast: null, lastHp: 100 };
  function tx(g, s, x, y, size, col, align = 'center', weight = 700, font = 'Nunito') { g.font = `${weight} ${size}px ${font}, system-ui, sans-serif`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(s, x, y); }
  function txS(g, s, x, y, size, col, align, weight, font) { g.save(); g.shadowColor = 'rgba(0,0,0,.65)'; g.shadowBlur = 6; tx(g, s, x, y, size, col, align, weight, font); g.restore(); }
  function rr(g, x, y, w, h, r, fill, stroke, lw = 1.5) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
  function bar(g, x, y, w, h, f, col, bg = 'rgba(255,255,255,.14)') { rr(g, x, y, w, h, h / 2, bg); if (f > 0) rr(g, x, y, Math.max(h, w * cl(f, 0, 1)), h, h / 2, col); }
  const toScreen = (p) => { const v = new THREE.Vector3(p[0], p[1], p[2]).project(X.camera); if (v.z > 1) return null; const V = K.view; return [lp(V.x0, V.x1, (v.x + 1) / 2), lp(V.y0, V.y1, (1 - v.y) / 2)]; };
  on('hitInfo', m => {
    if (m.by === CL.me) { HUD.hits.push({ t: now(), zone: m.zone, dmg: m.dmg, kill: m.hp <= 0, dist: m.dist, pw: m.pw }); if (AU.ready) (m.hp <= 0 ? S.elimMark() : S.hitmark(m.zone)); }
    if (m.v === CL.me) { HUD.hurtFlash = 1; ME.hurtAt = now(); const sh = CL.players.get(m.by), sp = sh && sh.vis; if (sp) HUD.hurtDir = Math.atan2(sp.x - ME.st.x, sp.z - ME.st.z); if (AU.ready) S.hurt(); }
  });
  on('thwack', () => HUD.rulerFlash = 1);
  on('toast', t => HUD.toast = { t, at: now() });
  on('picked', () => HUD.toast = { t: '+3 arrows', at: now() });
  on('recovered', () => HUD.toast = { t: 'Arrow recovered', at: now() });
  on('roundStart', m => { HUD.banner = { t: CL.mode === 'ffa' ? 'FREE FOR ALL' : `ROUND ${m.round}`, s: CL.mode === 'ffa' ? 'One shot, one kill · most eliminations in 2:30' : (m.score[0] === 4 && m.score[1] === 4 ? 'MATCH POINT · this round wins it' : `${W.TEAMS[0].n} ${m.score[0]}–${m.score[1]} ${W.TEAMS[1].n}`), at: now(), dur: 3 }; });
  on('go', () => { HUD.banner = { t: 'DRAW!', s: '', at: now(), dur: 1.1 }; });
  on('overtime', () => { HUD.banner = { t: 'OVERTIME', s: 'Hold the Stone Bridge clearing to win the round', at: now(), dur: 3 }; if (AU.ready) S.horn(); });
  on('roundEnd', m => { const mine = meP(), won = mine && m.winner === mine.team; const nm = m.winner === 'replay' ? 'ROUND REPLAYED' : `${W.TEAMS[m.winner].n.toUpperCase()} TAKE THE ROUND`;
    HUD.banner = { t: nm, s: m.winner === 'replay' ? (m.reason === 'wipe' ? 'Both teams went down together' : 'Nobody held the zone') : `${m.score[0]}–${m.score[1]}` + (m.reason === 'capture' ? ' · zone captured' : m.reason === 'health' ? ' · more health left' : m.reason === 'zone' ? ' · longer in the zone' : ''), at: now() + .9, dur: 3.4, col: m.winner === 'replay' ? BONE : won ? '#a8d88a' : HURT };
    if (AU.ready) setTimeout(() => (won ? S.win() : m.winner !== 'replay' && S.lose()), 900); });
  function drawHud(g, dt) {
    const V = K.view, cx = (V.x0 + V.x1) / 2, cy = (V.y0 + V.y1) / 2, touch = isTouch(), mine = meP(), t = now();
    // damage: a warm edge on the side the arrow came from
    if (HUD.hurtFlash > 0) { HUD.hurtFlash = Math.max(0, HUD.hurtFlash - dt * 1.6); const gr = g.createRadialGradient(cx, cy, 200, cx, cy, 700); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(120,40,10,${.45 * HUD.hurtFlash})`); g.fillStyle = gr; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0);
      if (HUD.hurtDir != null) { const rel = angD(HUD.hurtDir, ME.st.yaw + Math.PI), a = -rel - Math.PI / 2; g.save(); g.translate(cx, cy); g.rotate(a); g.globalAlpha = HUD.hurtFlash; g.fillStyle = HURT; g.beginPath(); g.moveTo(150, 0); g.lineTo(125, -18); g.lineTo(125, 18); g.fill(); g.restore(); g.globalAlpha = 1; } }
    if (ME.cam === 'fp' && ME.alive && live()) {
      // crosshair and the draw ring: it fills as you pull; gold, a click and FULL at full draw
      const p = ME.drawing ? W.drawPower(ME.drawT) : 0;
      g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(cx, cy, 1.8, 0, TAU); g.fill();
      if (ME.drawing) { const full = p >= 1, r = lp(24, 13, p); g.strokeStyle = full ? GOLD : 'rgba(255,255,255,.55)'; g.lineWidth = full ? 2.4 : 1.6; g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * p); g.stroke();
        if (full) { const pulse = .6 + .4 * Math.sin(t * 9); g.globalAlpha = pulse; txS(g, 'FULL', cx, cy + 30, 12, GOLD, 'center', 900); g.globalAlpha = 1; } }
      else if (ME.nockT > 0) { g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, 10, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - ME.nockT / W.BOW.nock)); g.stroke(); }
    }
    // hit markers: where your arrows landed (the server has confirmed them)
    HUD.hits = HUD.hits.filter(h => t - h.t < 1.2);
    for (const h of HUD.hits) { const a = 1 - (t - h.t) / 1.2, s = h.kill ? 14 : 9; g.globalAlpha = a; g.strokeStyle = h.kill ? GOLD : h.zone === 'head' ? '#ffd27a' : BONE; g.lineWidth = h.kill ? 3 : 2; for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { g.beginPath(); g.moveTo(cx + sx * s, cy + sy * s); g.lineTo(cx + sx * (s + 7), cy + sy * (s + 7)); g.stroke(); }
      txS(g, `${h.kill ? 'ELIMINATED · ' : ''}${h.zone.toUpperCase()} ${h.dmg}${CL.src === 'practice' ? ` · ${Math.round(h.dist)} m · ${Math.round(h.pw * 100)}% draw` : ''}`, cx, cy + 52 + (t - h.t) * -10, 15, h.kill ? GOLD : BONE, 'center', 800); g.globalAlpha = 1; }
    // pings (teammates': a marker you can see through trees, with where and how far)
    for (const pg of CL.pings) { const age = t - pg.t; if (age > 7) continue; const s = toScreen(pg.p); const d = Math.hypot(pg.p[0] - ME.st.x, pg.p[2] - ME.st.z); if (!s) continue; g.globalAlpha = Math.min(1, (7 - age) * 2); g.fillStyle = GOLD; g.save(); g.translate(s[0], s[1]); g.rotate(Math.PI / 4); g.fillRect(-6, -6, 12, 12); g.restore(); txS(g, `${pg.from === CL.me ? 'You' : pg.name} · ${pg.label}`, s[0], s[1] - 20, 13, GOLD, 'center', 800); txS(g, `${Math.round(d)} m`, s[0], s[1] + 18, 12, BONE, 'center', 700); g.globalAlpha = 1; }
    // teammates: names over their heads
    if (CL.src === 'online' && CL.mode !== 'ffa') for (const p of CL.players.values()) { if (p.id === CL.me || !mine || p.team !== mine.team || !p.vis || !p.alive) continue; const s = toScreen([p.vis.x, p.vis.y + 2.05, p.vis.z]); if (s) { txS(g, p.name, s[0], s[1], 13, W.TEAMS[p.team].col, 'center', 800); g.fillStyle = W.TEAMS[p.team].col; g.beginPath(); g.moveTo(s[0] - 5, s[1] + 9); g.lineTo(s[0] + 5, s[1] + 9); g.lineTo(s[0], s[1] + 15); g.fill(); } }
    // low on arrows: show where the bundles are and your own misses you can pull back out
    if (live() && ME.alive && ME.arrows <= 2 && CL.src !== 'practice') {
      W.PICKUPS.forEach((k, i) => { if (!CL.picks[i]) return; const s = toScreen([k.x, k.y + 1, k.z]); if (s) { g.globalAlpha = .8; txS(g, '➶ ×3', s[0], s[1], 13, GOLD, 'center', 900); g.globalAlpha = 1; } });
      for (const s of CL.stuck.values()) { if (s.by !== CL.me || !s.rec) continue; const q = toScreen(s.p); if (q && Math.hypot(s.p[0] - ME.st.x, s.p[2] - ME.st.z) < 30) { g.fillStyle = 'rgba(233,196,106,.85)'; g.beginPath(); g.arc(q[0], q[1], 3.5, 0, TAU); g.fill(); } }
    }
    // top: score and clock (or the free-for-all board)
    const remain = Math.max(0, CL.phaseEnd - srvNow());
    if (CL.src === 'online' && CL.mode !== 'ffa' && CL.phase !== 'lobby') {
      const w = 300, x = cx - w / 2, y = V.y0 + 12; rr(g, x, y, w, 56, 10, DARK);
      txS(g, String(CL.score[0]), cx - 34, y + 24, 30, W.TEAMS[0].col, 'center', 900, 'Lilita One'); txS(g, '–', cx, y + 24, 24, BONE, 'center', 700); txS(g, String(CL.score[1]), cx + 34, y + 24, 30, W.TEAMS[1].col, 'center', 900, 'Lilita One');
      tx(g, W.TEAMS[0].n.toUpperCase(), x + 14, y + 24, 12, W.TEAMS[0].col, 'left', 900); tx(g, W.TEAMS[1].n.toUpperCase(), x + w - 14, y + 24, 12, W.TEAMS[1].col, 'right', 900);
      tx(g, CL.phase === 'overtime' ? `OVERTIME ${fmtT(remain)}` : CL.phase === 'intro' ? `ROUND ${CL.round} · get ready` : CL.phase === 'roundEnd' ? `ROUND ${CL.round}` : `ROUND ${CL.round} · ${fmtT(remain)}`, cx, y + 46, 12, CL.phase === 'overtime' ? GOLD : DIM, 'center', 800);
      if (CL.score[0] === 4 && CL.score[1] === 4 && CL.phase !== 'results') txS(g, 'MATCH POINT', cx, y + 70, 12, GOLD, 'center', 900);
      // alive pips
      const tm = [0, 1].map(k => [...CL.players.values()].filter(p => p.team === k && !p.dummy)); tm.forEach((list, k) => list.forEach((p, i) => { g.fillStyle = p.alive ? W.TEAMS[k].col : 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(k ? x + w + 14 + i * 14 : x - 14 - i * 14, y + 24, 5, 0, TAU); g.fill(); }));
    } else if (CL.src === 'online' && CL.mode === 'ffa') {
      const y = V.y0 + 12, me = mine || { k: 0 }, ranked = [...CL.players.values()].filter(p => !p.dummy).sort((a, b) => b.k - a.k), lead = ranked[0];
      rr(g, cx - 150, y, 300, 56, 10, DARK); txS(g, CL.phase === 'intro' ? 'GET READY' : fmtT(CL.phase === 'live' ? remain : 0), cx, y + 22, 26, remain < 20 && CL.phase === 'live' ? GOLD : BONE, 'center', 900, 'Lilita One');
      tx(g, `You ${me.k || 0}   ·   ${lead && lead.id !== CL.me ? `${lead.name} ${lead.k}` : 'you lead'}`, cx, y + 45, 12, DIM, 'center', 800);
    } else if (CL.src === 'practice') { const y = V.y0 + 12; rr(g, cx - 200, y, 400, 46, 10, DARK); txS(g, 'PRACTICE RANGE', cx, y + 17, 16, GOLD, 'center', 900, 'Lilita One'); tx(g, 'Straw dummies at 10, 20, 35 and 50 m; one walks. Endless arrows.', cx, y + 34, 11, DIM, 'center', 700); }
    // overtime: who is in the zone, the capture bars, and which way it is
    if (CL.phase === 'overtime') {
      const y = V.y0 + 92, inn = CL.zoneIn, st = inn[0] && inn[1] ? 'CONTESTED' : inn[0] ? `${W.TEAMS[0].n.toUpperCase()} CAPTURING` : inn[1] ? `${W.TEAMS[1].n.toUpperCase()} CAPTURING` : 'NOBODY IN THE ZONE';
      rr(g, cx - 160, y, 320, 50, 10, DARK); txS(g, st, cx, y + 14, 13, inn[0] && inn[1] ? BONE : inn[0] ? W.TEAMS[0].col : inn[1] ? W.TEAMS[1].col : GOLD, 'center', 900);
      const capT = 6; bar(g, cx - 145, y + 28, 135, 9, CL.cap[0] / capT, W.TEAMS[0].col); bar(g, cx + 10, y + 28, 135, 9, CL.cap[1] / capT, W.TEAMS[1].col); tx(g, `${inn[0]} in`, cx - 145, y + 44, 10, DIM, 'left'); tx(g, `${inn[1]} in`, cx + 145, y + 44, 10, DIM, 'right');
      const zs = toScreen([W.ZONE.x, W.terrainH(W.ZONE.x, W.ZONE.z) + 2, W.ZONE.z]); const dz = Math.hypot(W.ZONE.x - ME.st.x, W.ZONE.z - ME.st.z);
      if (zs && zs[0] > V.x0 && zs[0] < V.x1 && zs[1] > V.y0 && zs[1] < V.y1) txS(g, `ZONE · ${Math.round(dz)} m`, zs[0], zs[1], 13, GOLD, 'center', 900);
      else { const rel = angD(Math.atan2(W.ZONE.x - ME.st.x, W.ZONE.z - ME.st.z), ME.st.yaw + Math.PI); g.save(); g.translate(cx, cy); g.rotate(-rel); g.fillStyle = GOLD; g.beginPath(); g.moveTo(0, -120); g.lineTo(-10, -104); g.lineTo(10, -104); g.fill(); g.restore(); }
    }
    // the side panel: where you are (grid, exact X/Z), your compass heading, the area name
    if (CL.src) {
      const x = V.x0 + 14 + (touch ? 0 : 0), y = cy - 70, h = heading(ME.st.yaw), area = W.areaName(ME.st.x, ME.st.z), w = 168;
      rr(g, x, y, w, 76, 9, 'rgba(10,16,11,.5)', 'rgba(233,196,106,.25)');
      tx(g, `${W.gridRef(ME.st.x, ME.st.z)} · X ${Math.round(ME.st.x)} · Z ${Math.round(ME.st.z)}`, x + 10, y + 16, 13, BONE, 'left', 800);
      tx(g, `${h.name} ${h.deg}°`, x + 10, y + 36, 13, GOLD, 'left', 900); tx(g, area, x + 10, y + 56, 11, DIM, 'left', 700);
      // a tiny compass strip
      for (let k = -2; k <= 2; k++) { const d = (Math.round(h.deg / 45) + k + 8) % 8, off = ((d * 45 - h.deg + 540) % 360) - 180; const px = x + w - 36 + off * .32; if (px > x + 104 && px < x + w - 4) tx(g, COMPASS[d], px, y + 36, 10, d * 45 === Math.round(h.deg / 45) * 45 ? GOLD : DIM, 'center', 800); }
      if (!touch) tx(g, 'F ping', x + 10, y + 70, 9, DIM, 'left', 700);
    }
    // bottom-left: health and arrows
    if (CL.src && ME.alive && ME.cam === 'fp') {
      const x = V.x0 + 22, y = V.y1 - 64 - (touch ? 150 : 0);
      tx(g, 'HEALTH', x, y - 6, 11, DIM, 'left', 900); bar(g, x, y + 4, 190, 11, ME.hp / 100, ME.hp > 55 ? '#a8d88a' : ME.hp > 25 ? GOLD : HURT); tx(g, String(ME.hp), x + 200, y + 10, 14, BONE, 'left', 900);
      const n = CL.src === 'practice' ? 0 : ME.arrows; tx(g, CL.src === 'practice' ? 'ARROWS ∞' : 'ARROWS', x, y + 30, 11, ME.arrows <= 1 && CL.src !== 'practice' ? HURT : DIM, 'left', 900);
      for (let k = 0; k < Math.min(9, n); k++) { const ax = x + 64 + k * 12; g.strokeStyle = BONE; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, y + 40); g.lineTo(ax, y + 22); g.stroke(); g.fillStyle = GOLD; g.beginPath(); g.moveTo(ax - 3, y + 26); g.lineTo(ax, y + 19); g.lineTo(ax + 3, y + 26); g.fill(); }
      if (CL.src !== 'practice' && n === 0) tx(g, 'none: grab a bundle or pull your misses out', x + 64, y + 31, 11, HURT, 'left', 800);
    }
    // kill feed
    let fy = V.y0 + 16; for (const f of CL.feed) { const age = t - f.t; if (age > 6) continue; g.globalAlpha = Math.min(1, (6 - age) * 2); const s = `${f.k || '?'}  ➶  ${f.v}${f.zone === 'head' ? '  (head)' : ''}`; g.font = '800 13px Nunito'; const w = g.measureText(s).width + 20; rr(g, V.x1 - 16 - w, fy, w, 24, 6, DARK); tx(g, s, V.x1 - 26, fy + 12, 13, f.kid === CL.me ? GOLD : f.vid === CL.me ? HURT : BONE, 'right', 800); fy += 28; g.globalAlpha = 1; }
    // notes from the room (someone reconnected, left...)
    let ny = V.y1 - 120; for (const n of CL.notes) { const age = t - n.t; if (age > 5) continue; g.globalAlpha = Math.min(1, (5 - age) * 2); tx(g, n.text, V.x1 - 20, ny, 12, DIM, 'right', 700); ny -= 18; g.globalAlpha = 1; }
    // banners
    const b = HUD.banner; if (b && t >= b.at && t - b.at < b.dur) { const a = Math.min(1, (t - b.at) * 4, (b.dur - (t - b.at)) * 2.5); g.globalAlpha = a; txS(g, b.t, cx, cy - 120, 46, b.col || BONE, 'center', 900, 'Lilita One'); if (b.s) txS(g, b.s, cx, cy - 78, 18, DIM, 'center', 800); g.globalAlpha = 1; }
    if (CL.phase === 'intro' && remain > 0 && remain < 3.2) { txS(g, String(Math.ceil(remain)), cx, cy - 20, 64, GOLD, 'center', 900, 'Lilita One'); }
    // spectating / out of the round
    if (CL.src && !ME.alive && ME.cam === 'spectate') { const p = CL.players.get(ME.specId); if (p) { rr(g, cx - 170, V.y1 - 96, 340, 44, 9, DARK); txS(g, `SPECTATING ${p.name.toUpperCase()}`, cx, V.y1 - 82, 14, W.TEAMS[p.team].col, 'center', 900); tx(g, `${p.hp} health · ${p.arrows} arrows`, cx, V.y1 - 64, 12, DIM, 'center', 700); } }
    else if (CL.src && !ME.alive && ME.cam === 'dead' && live()) { rr(g, cx - 160, V.y1 - 96, 320, 40, 9, DARK); txS(g, CL.mode === 'ffa' || CL.src === 'practice' ? 'Back in a moment...' : 'Out for this round', cx, V.y1 - 76, 15, BONE, 'center', 800); }
    // the Yardstick's ruler markings flash across the screen
    if (HUD.rulerFlash > 0) { HUD.rulerFlash = Math.max(0, HUD.rulerFlash - dt * 1.6); const a = Math.min(1, HUD.rulerFlash * 2.2), yy = cy + 60, off = (1 - HUD.rulerFlash) * 400; g.globalAlpha = a * .92; g.fillStyle = '#e8c35a'; g.fillRect(V.x0, yy - 34, V.x1 - V.x0, 68); g.fillStyle = '#1a1206';
      for (let k = 0; k * 14 < V.x1 - V.x0 + 400; k++) { const px = V.x0 - off + k * 14, L = k % 10 === 0 ? 30 : k % 5 === 0 ? 20 : 11; g.fillRect(px, yy - 34, 2, L); g.fillRect(px, yy + 34 - L, 2, L); if (k % 10 === 0) tx(g, String(k / 10), px + 3, yy, 16, '#1a1206', 'left', 900); } g.globalAlpha = 1; }
    // toast
    if (HUD.toast && t - HUD.toast.at < 2.2) { const a = Math.min(1, (2.2 - (t - HUD.toast.at)) * 2); g.globalAlpha = a; txS(g, HUD.toast.t, cx, cy + 96, 16, BONE, 'center', 800); g.globalAlpha = 1; }
    // the scoreboard (Tab)
    if (IN.board || (CL.mode === 'ffa' && CL.phase === 'results')) drawBoard(g, cx, cy);
    if (touch && CL.src && !UI.open) drawTouch(g);
    if (CL.status) { rr(g, cx - 220, V.y0 + 80, 440, 36, 9, 'rgba(120,60,20,.85)'); tx(g, CL.status, cx, V.y0 + 98, 14, BONE, 'center', 800); }
    if (!touch && CL.src && !IN.locked && !UI.open && !DEV) { rr(g, cx - 170, cy + 120, 340, 44, 10, DARK); tx(g, 'Click to aim', cx, cy + 142, 18, BONE, 'center', 800); }
  }
  function drawBoard(g, cx, cy) {
    const rows = [...CL.players.values()].filter(p => !p.dummy).sort((a, b) => b.k - a.k || a.d - b.d), w = 420, h = 50 + rows.length * 28, x = cx - w / 2, y = cy - h / 2;
    rr(g, x, y, w, h, 12, 'rgba(10,16,11,.88)', 'rgba(233,196,106,.3)'); tx(g, 'ARCHERS', x + 18, y + 22, 15, GOLD, 'left', 900, 'Lilita One'); tx(g, 'ELIMS   OUTS', x + w - 18, y + 22, 11, DIM, 'right', 900);
    rows.forEach((p, i) => { const yy = y + 50 + i * 28; tx(g, p.name + (p.id === CL.me ? '  (you)' : '') + (p.on === false ? '  · away' : ''), x + 18, yy, 14, teamCol(p.team, p.slot, CL.mode), 'left', 800); tx(g, `${p.k}        ${p.d}`, x + w - 22, yy, 14, BONE, 'right', 800); });
  }
  function drawTouch(g) {
    const u = uiS();
    if (IN.stick) { const s = IN.stick, dx = s.x - s.x0, dy = s.y - s.y0, L = Math.min(70 * u, Math.hypot(dx, dy)), a = Math.atan2(dy, dx); g.strokeStyle = 'rgba(241,234,216,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(s.x0, s.y0, 70 * u, 0, TAU); g.stroke(); g.fillStyle = 'rgba(241,234,216,.45)'; g.beginPath(); g.arc(s.x0 + Math.cos(a) * L, s.y0 + Math.sin(a) * L, 30 * u, 0, TAU); g.fill(); }
    else { const x = K.view.x0 + 160 * u, y = K.view.y1 - 160 * u; g.setLineDash([6, 8]); g.strokeStyle = 'rgba(241,234,216,.22)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 70 * u, 0, TAU); g.stroke(); g.setLineDash([]); tx(g, 'MOVE', x, y, 14 * u, 'rgba(241,234,216,.35)'); }
    for (const b of touchButtons()) { const on2 = (b.k === 'draw' && ME.drawing) || (b.k === 'crouch' && ME.crouchToggle) || [...IN.held.values()].includes(b.k); const full = b.k === 'draw' && ME.full && ME.drawing;
      g.fillStyle = full ? 'rgba(233,196,106,.55)' : on2 ? 'rgba(143,191,106,.5)' : 'rgba(10,16,11,.48)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill(); g.strokeStyle = 'rgba(241,234,216,.4)'; g.lineWidth = 2; g.stroke();
      if (b.k === 'draw' && ME.drawing) { g.strokeStyle = GOLD; g.lineWidth = 5; g.beginPath(); g.arc(b.x, b.y, b.r - 6, -Math.PI / 2, -Math.PI / 2 + TAU * W.drawPower(ME.drawT)); g.stroke(); }
      tx(g, b.t, b.x, b.y, (b.k === 'draw' ? 17 : 12) * u, BONE, 'center', 900); }
  }
