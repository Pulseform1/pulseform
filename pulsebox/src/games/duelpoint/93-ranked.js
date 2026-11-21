  /* ---------- 93 ranked on screen: tier emblems, the queue on the play screen, the career page, the result after a match ---------- */
  // a tier's emblem: a cut gem in the tier's colour, deeper and more faceted the higher it is, with one to three bars under it
  // for the division; the top tier wears a crown. Not yet placed: a grey outline with a question mark
  function tierBadge(g, x, y, r, rv, isPlaced = true) {
    g.save(); g.translate(x, y);
    if (!isPlaced) { g.strokeStyle = 'rgba(239,233,220,.45)'; g.lineWidth = Math.max(1.5, r * .12); g.beginPath(); g.moveTo(0, -r); g.lineTo(r * .78, -r * .1); g.lineTo(0, r * .9); g.lineTo(-r * .78, -r * .1); g.closePath(); g.stroke(); tx(g, '?', 0, 0, r * .9, 'rgba(239,233,220,.6)', 'center', 900); g.restore(); return; }
    const R0 = rankOf(rv), col = R0.T.col, t = R0.t;
    if (t >= 5) { g.globalAlpha = .35; g.fillStyle = col; g.beginPath(); g.arc(0, 0, r * 1.18, 0, TAU); g.fill(); g.globalAlpha = 1; }   // the high tiers glow
    const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.25, col); gr.addColorStop(1, 'rgba(10,12,16,.9)');
    g.fillStyle = gr; g.strokeStyle = col; g.lineWidth = Math.max(1.2, r * .1);
    g.beginPath(); g.moveTo(0, -r); g.lineTo(r * .8, -r * .12); g.lineTo(0, r * .92); g.lineTo(-r * .8, -r * .12); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(1, r * .05); g.beginPath(); g.moveTo(-r * .8, -r * .12); g.lineTo(r * .8, -r * .12);
    for (let k = 0; k < Math.min(3, 1 + Math.floor(t / 2)); k++) { const s = (k + 1) / 4; g.moveTo(0, -r); g.lineTo(-r * .8 + r * 1.6 * s, -r * .12); g.moveTo(-r * .8 + r * 1.6 * s, -r * .12); g.lineTo(0, r * .92); }
    g.stroke();
    if (R0.top) { g.fillStyle = col; g.beginPath(); g.moveTo(-r * .55, -r * 1.02); g.lineTo(-r * .38, -r * 1.42); g.lineTo(-r * .14, -r * 1.12); g.lineTo(0, -r * 1.5); g.lineTo(r * .14, -r * 1.12); g.lineTo(r * .38, -r * 1.42); g.lineTo(r * .55, -r * 1.02); g.closePath(); g.fill(); }
    else for (let k = 0; k <= R0.d; k++) { g.fillStyle = col; g.fillRect(-r * .5 + k * r * .36, r * 1.1, r * .28, r * .16); }
    g.restore();
  }
  /* THE RANK LADDER: every tier, low to high, with its emblem and its three divisions, and where you stand on it at a team
     size (UI.rankScale holds the size while it is open). Opened by clicking your rank: on the career page, on the play
     page, or after a ranked match. Click outside it, the X or Esc to close. */
  function drawRankScale(g, V) {
    const size = UI.rankScale; if (!size) return; const u = uiScale(), W = V.x1 - V.x0, H = V.y1 - V.y0;
    const pw = Math.min(W - 40 * u, 1120 * u), ph = Math.min(H - 30 * u, 470 * u), px = (V.x0 + V.x1) / 2 - pw / 2, py = (V.y0 + V.y1) / 2 - ph / 2 + 8 * u;
    zone(V.x0, V.y0, W, H, () => { UI.rankScale = null; }); zone(px, py, pw, ph, () => {});   // outside closes; inside does nothing (bar the buttons below)
    g.fillStyle = 'rgba(4,6,9,.72)'; g.fillRect(V.x0, V.y0, W, H); rr(g, px, py, pw, ph, 12, 'rgba(12,15,21,.98)', 'rgba(239,233,220,.18)', 1.5);
    const S = rankedOf(size), on = placed(S), me0 = on ? rankOf(S.rv) : null;
    tx(g, 'RANKS', px + 26 * u, py + 34 * u, 28 * u, BONE, 'left', 900);
    tx(g, `YOUR ${vsLabel(size)} RANK:  ${on ? rankLabel(S.rv).toUpperCase() + '  ·  ' + me0.rp + ' RP' : 'UNRANKED  ·  PLACEMENTS ' + S.n + ' / ' + PLACE_N}`, px + 26 * u, py + 62 * u, 13 * u, on ? me0.T.col : GOLD, 'left', 900);
    // which team size (each has a rank of its own), and the close button
    const tw = Math.min(330 * u, pw - 420 * u); choice(g, px + pw - tw - 70 * u, py + 22 * u, tw, 32 * u, RQ.map(k => [+k, vsLabel(+k)]), +size, v => { UI.rankScale = v; });
    btn(g, px + pw - 52 * u, py + 22 * u, 32 * u, 32 * u, '×', () => { UI.rankScale = null; }, { px: 20 * u });
    // the tiers, low to high, left to right
    const n = TIERS.length, gx = px + 22 * u, gw = pw - 44 * u, cw2 = gw / n, top = py + 92 * u, ch2 = ph - 92 * u - 78 * u;
    for (let t = 0; t < n; t++) {
      const T = TIERS[t], x = gx + t * cw2, cx = x + cw2 / 2, mine = on && me0.t === t, above = on ? t > me0.t : true, topT = t === n - 1;
      rr(g, x + 4 * u, top, cw2 - 8 * u, ch2, 8, mine ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.025)', mine ? T.col : 'rgba(239,233,220,.1)', mine ? 2 : 1);
      g.globalAlpha = above && !mine ? .62 : 1;
      tierBadge(g, cx, top + 52 * u, Math.min(26 * u, cw2 * .22), t * DIVS * 100 + (topT ? 0 : 0), true);
      tx(g, T.n.toUpperCase(), cx, top + 104 * u, Math.min(15 * u, cw2 / 6.5), T.col, 'center', 900);
      if (mine) { rr(g, cx - 46 * u, top + 136 * u, 92 * u, 22 * u, 11, T.col); tx(g, 'YOU  ·  ' + me0.rp + ' RP', cx, top + 147 * u, 10.5 * u, INK, 'center', 900); }   // you are here
      tx(g, ['RECRUIT BOTS', 'RECRUIT BOTS', 'VETERAN BOTS', 'VETERAN BOTS', 'ELITE BOTS', 'ELITE BOTS', 'LEGEND BOTS', 'LEGEND BOTS'][t], cx, top + 122 * u, Math.min(9 * u, cw2 / 12), DIM, 'center', 800);
      // its divisions, I at the bottom up to III (the top tier is one, with no ceiling)
      const divs = topT ? 1 : DIVS, dh = Math.min(34 * u, (ch2 - 150 * u) / 3 - 6 * u);
      for (let d = 0; d < divs; d++) {
        const y = top + ch2 - 14 * u - (d + 1) * (dh + 6 * u), here = mine && (topT || me0.d === d), done = on && (t < me0.t || (t === me0.t && d < me0.d));
        rr(g, x + 14 * u, y, cw2 - 28 * u, dh, 5, here ? T.col : done ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.04)', here ? T.col : 'rgba(239,233,220,.14)', 1);
        tx(g, topT ? 'NO CEILING' : T.n.toUpperCase() + ' ' + ['I', 'II', 'III'][d], cx, y + dh / 2 - (here ? 5 * u : 0), Math.min(10.5 * u, cw2 / 9), here ? INK : done ? BONE : DIM, 'center', 900);
        if (here) { const k = topT ? Math.min(1, me0.rp / 300) : me0.rp / 100; g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 20 * u, y + dh - 9 * u, cw2 - 40 * u, 4 * u); g.fillStyle = INK; g.fillRect(x + 20 * u, y + dh - 9 * u, (cw2 - 40 * u) * k, 4 * u); }
      }
      g.globalAlpha = 1;
    }
    para(g, `Every division is 100 RP. Win a ranked match to gain RP and lose one to drop; cross 100 and you go up a division, fall below 0 and you go down. Your first ${PLACE_N} ranked matches at each team size are placements, and they set where you start. Beat bots or players above your rank to climb faster.`, px + 26 * u, py + ph - 56 * u, pw - 52 * u, 11.5 * u, '#aeb6c2');
  }
  // a rank as words: "Cobalt II · 45 RP", or the placements still to play
  const rankWords = size => { const S = rankedOf(size); return placed(S) ? `${rankLabel(S.rv)}  ·  ${rankOf(S.rv).rp} RP` : `Unranked  ·  placements ${S.n}/${PLACE_N}`; };

  // the end of a ranked match: the emblem, the rank, the bar filling or draining, the points, and a rank up or down
  function drawRankResult(g, x, y, w, u) {
    const R = M.rankRes, t = (performance.now() - M.payT) / 1000, h = 196 * u, col = R.d >= 0 ? YOU : FOE;
    zone(x, y, w, h, () => { UI.rankScale = R.size; }); rr(g, x, y, w, h, 10, GLASS); tx(g, 'SEE RANKS ›', x + w - 14 * u, y + 20 * u, 10 * u, DIM, 'right', 800); tx(g, `RANKED  ·  ${vsLabel(R.size)}`, x + 16 * u, y + 20 * u, 12 * u, GOLD, 'left', 900);
    if (R.placing) {   // still placing: a pip for each placement match
      tierBadge(g, x + w / 2, y + 78 * u, 30 * u, 0, false); tx(g, `PLACEMENT ${R.n} OF ${PLACE_N}`, x + w / 2, y + 134 * u, 16 * u, BONE, 'center', 900);
      for (let k = 0; k < PLACE_N; k++) { g.fillStyle = k < R.n ? GOLD : 'rgba(255,255,255,.14)'; g.fillRect(x + w / 2 - PLACE_N * 13 * u + k * 26 * u + 3 * u, y + 152 * u, 20 * u, 6 * u); }
      tx(g, R.won ? 'Win · your rank moves up' : 'Loss · your rank moves down', x + w / 2, y + 176 * u, 11 * u, DIM, 'center', 700); return;
    }
    const k = smooth(cl((t - .5) / 1.3, 0, 1)), cur = R.justPlaced ? R.after : Math.round(lp(R.before, R.after, k)), r0 = rankOf(cur), show = R.justPlaced ? t > .8 : true;
    if (R.justPlaced && t < .8) { tierBadge(g, x + w / 2, y + 78 * u, 30 * u, 0, false); tx(g, 'YOUR RANK IS...', x + w / 2, y + 134 * u, 15 * u, BONE, 'center', 900); return; }
    const pop = (R.up || R.justPlaced) && t > .8 && t < 1.5 ? 1 + .25 * Math.sin((t - .8) / .7 * Math.PI) : 1;
    if ((R.up || R.justPlaced) && t > .8 && t < 2.2) { g.save(); g.globalAlpha = .5 * (1 - (t - .8) / 1.4); g.fillStyle = r0.T.col; g.beginPath(); g.arc(x + w / 2, y + 74 * u, 40 * u * (1 + (t - .8) * 1.5), 0, TAU); g.fill(); g.restore(); }
    tierBadge(g, x + w / 2, y + 74 * u, 28 * u * pop, cur, true);
    tx(g, rankLabel(cur).toUpperCase(), x + w / 2, y + 126 * u, 20 * u, r0.T.col, 'center', 900);
    if (show && !r0.top) { const bx = x + 20 * u, bw = w - 40 * u; g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(bx, y + 142 * u, bw, 7 * u); g.fillStyle = r0.T.col; g.fillRect(bx, y + 142 * u, bw * r0.rp / 100, 7 * u); }
    tx(g, R.justPlaced ? 'PLACED' : `${R.d >= 0 ? '+' : ''}${R.d} RP`, x + w / 2, y + 168 * u, 16 * u, R.justPlaced ? GOLD : col, 'center', 900);
    if (t > 1.6) { const s = R.justPlaced ? 'RANK REVEALED' : R.up ? 'RANKED UP' : R.down ? 'RANKED DOWN' : `${r0.rp} / 100 RP`; tx(g, s, x + w / 2, y + 186 * u, 10.5 * u, R.up || R.justPlaced ? GOLD : R.down ? FOE : DIM, 'center', 900); }
  }

  // CAREER: your record, your rank at each team size, the match history, the bot rating and your collection
  function drawCareer(g, V, W, u) {
    const x0 = V.x0 + 60 / pxPer() + 20 * u, top = V.y0 + 40 * u, gap = 14 * u, cw = Math.min(200 * u, (V.x1 - x0 - 30 * u - 3 * gap) / 4);
    tx(g, 'CAREER', x0, top, 34 * u, BONE, 'left', 900);
    const card = (x, y, w, h, label, val, col) => { rr(g, x, y, w, h, 10, 'rgba(14,18,26,.94)', 'rgba(239,233,220,.14)', 1.5); tx(g, label, x + 14 * u, y + 20 * u, 11 * u, DIM, 'left', 900); tx(g, String(val), x + 14 * u, y + h - 24 * u, 28 * u, col || BONE, 'left', 900); };
    const ch = 86 * u, y1 = top + 34 * u, hs = STATS.kills ? Math.round(100 * STATS.heads / STATS.kills) + '%' : '—', wr = STATS.matches ? Math.round(100 * STATS.wins / STATS.matches) + '%' : '—';
    [['MATCHES', STATS.matches], ['WINS', STATS.wins + '  ·  ' + wr], ['KILLS', STATS.kills], ['HEADSHOTS', hs]].forEach(([a, b], k) => card(x0 + k * (cw + gap), y1, cw, ch, a, b));
    // ranked, one card per team size
    const y2 = y1 + ch + 30 * u, rh = 150 * u; tx(g, 'RANKED', x0, y2 - 12 * u, 12 * u, GOLD, 'left', 900); tx(g, 'CLICK A RANK TO SEE EVERY TIER', x0 + 80 * u, y2 - 12 * u, 10 * u, DIM, 'left', 800);
    { const cr = Math.min(cw, (cw * 4 + gap * 3 - gap * (RQ.length - 1)) / RQ.length); RQ.forEach((k, i) => { const S = rankedOf(+k), on = placed(S), x = x0 + i * (cr + gap), r0 = rankOf(S.rv), col = on ? r0.T.col : 'rgba(239,233,220,.3)';
      const hov = zone(x, y2, cr, rh, () => { UI.rankScale = +k; }); rr(g, x, y2, cr, rh, 10, hov ? 'rgba(24,30,42,.96)' : 'rgba(14,18,26,.94)', col, on ? 2 : 1.5); tx(g, vsLabel(+k), x + 14 * u, y2 + 20 * u, 13 * u, BONE, 'left', 900); tx(g, `${S.w}W · ${S.n - S.w}L`, x + cr - 12 * u, y2 + 20 * u, 10.5 * u, DIM, 'right', 800);
      tierBadge(g, x + cr / 2, y2 + 62 * u, 24 * u, S.rv, on);
      tx(g, on ? rankLabel(S.rv).toUpperCase() : 'UNRANKED', x + cr / 2, y2 + 106 * u, 15 * u, on ? col : BONE, 'center', 900);
      if (on && !r0.top) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 14 * u, y2 + 120 * u, cr - 28 * u, 5 * u); g.fillStyle = col; g.fillRect(x + 14 * u, y2 + 120 * u, (cr - 28 * u) * r0.rp / 100, 5 * u); }
      tx(g, on ? (r0.top ? `${r0.rp} RP` : `${r0.rp} / 100 RP`) : `PLACEMENTS ${S.n}/${PLACE_N}`, x + cr / 2, y2 + 138 * u, 10.5 * u, DIM, 'center', 800); }); }
    // the match history
    const y3 = y2 + rh + 30 * u, hw = cw * 3 + gap * 2, hh = Math.max(80 * u, V.y1 - y3 - 16 * u), H = STATS.hist || [];
    tx(g, 'MATCH HISTORY', x0, y3 - 12 * u, 12 * u, DIM, 'left', 900); rr(g, x0, y3, hw, hh, 10, 'rgba(14,18,26,.94)', 'rgba(239,233,220,.14)', 1.5);
    if (!H.length) tx(g, 'Your matches show up here once you have played one.', x0 + hw / 2, y3 + hh / 2, 13 * u, DIM, 'center', 700);
    const rowH = 30 * u, n = Math.min(H.length, Math.floor((hh - 8 * u) / rowH));
    for (let i = 0; i < n; i++) { const e = H[i], y = y3 + 4 * u + i * rowH, c = e.w ? YOU : FOE, p = rowH * .55;
      g.fillStyle = c; g.fillRect(x0 + 6 * u, y + 5 * u, 4 * u, rowH - 10 * u); portraitTile(g, e.op || 'vex', x0 + 16 * u, y + 3 * u, rowH - 6 * u, rowH - 6 * u, { r: 3 });
      const cx = x0 + 22 * u + rowH; tx(g, e.w ? 'WIN' : e.left ? 'LEFT' : 'LOSS', cx, y + rowH / 2, Math.min(13 * u, p), c, 'left', 900);
      tx(g, `${e.s[0]}–${e.s[1]}`, cx + 52 * u, y + rowH / 2, Math.min(13 * u, p), BONE, 'left', 900);
      tx(g, `${e.r ? 'RANKED' : 'UNRATED'} ${vsLabel(e.size)}${e.on ? ' · ONLINE' : ''}`, cx + 104 * u, y + rowH / 2, Math.min(10.5 * u, p * .8), e.r ? GOLD : DIM, 'left', 800);
      tx(g, String(e.map || '').toUpperCase(), cx + 250 * u, y + rowH / 2, Math.min(10.5 * u, p * .8), DIM, 'left', 800);
      tx(g, `${e.k}/${e.d}`, x0 + hw - 150 * u, y + rowH / 2, Math.min(12 * u, p), BONE, 'right', 800); tx(g, `${e.cs} CS`, x0 + hw - 80 * u, y + rowH / 2, Math.min(11 * u, p * .85), BONE, 'right', 800);
      if (e.r) tx(g, e.pl ? `PL ${e.pl}/${PLACE_N}` : (e.rp >= 0 ? '+' : '') + e.rp + ' RP', x0 + hw - 12 * u, y + rowH / 2, Math.min(11 * u, p * .85), e.pl ? GOLD : e.rp >= 0 ? YOU : FOE, 'right', 900); }
    // the bot rating (unrated AUTO bots follow it) and your collection
    const x4 = x0 + hw + gap, w4 = cw, i = diffFor(STATS.rating).i; let y4 = y3;
    rr(g, x4, y4, w4, 96 * u, 10, 'rgba(14,18,26,.94)', RANK_COL[i], 1.5); tx(g, 'BOT RATING', x4 + 14 * u, y4 + 20 * u, 11 * u, DIM, 'left', 900); rankBadge(g, x4 + 30 * u, y4 + 60 * u, 14 * u, STATS.rating);
    tx(g, rankName(STATS.rating).toUpperCase(), x4 + 52 * u, y4 + 54 * u, 16 * u, RANK_COL[i], 'left', 900); tx(g, String(STATS.rating), x4 + 52 * u, y4 + 74 * u, 12 * u, BONE, 'left', 800); y4 += 96 * u + 10 * u;
    if (y4 + 70 * u < V.y1) { rr(g, x4, y4, w4, 70 * u, 10, 'rgba(14,18,26,.94)', 'rgba(239,233,220,.14)', 1.5); tx(g, 'COINS', x4 + 14 * u, y4 + 20 * u, 11 * u, DIM, 'left', 900); tx(g, String(STATS.coins), x4 + 14 * u, y4 + 48 * u, 22 * u, COIN, 'left', 900); tx(g, `${STATS.skins.length} SKINS`, x4 + w4 - 12 * u, y4 + 48 * u, 11 * u, DIM, 'right', 800); }
  }
