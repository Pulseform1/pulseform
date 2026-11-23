  /* ---------- 95 the PASS page: the season's track, the challenges, and your card ----------
     The rules are in 26-progress; this draws them. The track is two rows of tiles (free above, premium below), a column
     per tier, paged with the arrows and opening on the tier you are at. Under it: today's and this week's challenges, and
     your card as others see it in a lobby (banner, title, level), with a button to the locker's PLAYER CARD page to change them. */
  const PS = { off: null, toast: null };   // off: the first tier on screen (null: follow your tier); toast: { t0, got } after unlocking premium
  // a card banner: its two colours behind a card, with slanted bars in its accent
  function bannerBg(g, x, y, w, h, key, r = 8) {
    const B = BANNERS[key] || BANNERS.plain; g.save(); rr(g, x, y, w, h, r, null, null); g.clip();
    const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, B[0]); gr.addColorStop(1, B[1]); g.fillStyle = gr; g.fillRect(x, y, w, h);
    if (key !== 'plain' && BANNERS[key]) { g.globalAlpha *= .2; g.fillStyle = B[2]; for (let i = 0; i < 4; i++) { const bx = x + w * (.5 + i * .14); g.beginPath(); g.moveTo(bx, y + h); g.lineTo(bx + h * .6, y); g.lineTo(bx + h * .6 + w * .05, y); g.lineTo(bx + w * .05, y + h); g.closePath(); g.fill(); } }
    g.restore();
  }
  // a level, in a pill; its colour steps up at 10, 25 and 50. Returns how wide it came out
  const lvCol = lv => lv >= 50 ? GOLD : lv >= 25 ? '#b48aff' : lv >= 10 ? YOU : '#c9cfd8';
  function lvChip(g, x, y, lv, px, align = 'left') {
    const s = 'LV ' + lv; px = fitPx(g, px); g.font = `900 ${px}px ${FONT}`; const w = g.measureText(s).width + px * 1.1, h = px * 1.7, x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x, col = lvCol(lv);
    rr(g, x0, y - h / 2, w, h, h / 2, 'rgba(8,10,14,.78)', col, 1.5); tx(g, s, x0 + w / 2, y + px * .04, px, col, 'center', 900); return w;
  }
  const bannerName = k => k[0].toUpperCase() + k.slice(1);
  // what a reward is, drawn small: a tile for the track, and for the list on the rewards screen. st: 'got' | 'next' | 'far' | 'lock'
  function rewardTile(g, rw, x, y, w, h, u, st) {
    const sk = rw.t === 'skin' ? skinOfId(rw.id) : null, col = sk ? sk.R.col : rw.t === 'coins' ? COIN : rw.t === 'spin' ? GOLD : rw.t === 'title' ? BONE : (BANNERS[rw.k] || BANNERS.plain)[2], got = st === 'got', cx = x + w / 2, iy = y + h * .4, t = K.t || 0;
    rr(g, x, y, w, h, 6, got ? 'rgba(26,32,44,.96)' : st === 'next' ? 'rgba(18,22,30,.94)' : 'rgba(12,16,22,.86)', got ? col : st === 'next' ? 'rgba(239,233,220,.4)' : 'rgba(239,233,220,.12)', got || st === 'next' ? 1.5 : 1);
    g.save(); g.globalAlpha *= got ? 1 : st === 'lock' ? .45 : st === 'next' ? .95 : .7; rr(g, x, y, w, h, 6, null, null); g.clip();
    if (sk) { const gr = g.createLinearGradient(x, y + h, x, y); gr.addColorStop(0, sk.R.col + '44'); gr.addColorStop(.7, sk.R.col + '00'); g.fillStyle = gr; g.fillRect(x, y, w, h);
      const ic = gunIcon(sk.k, rw.id); if (ic) { const iw = w - 8 * u, ih = Math.min(h * .5, iw * ic.height / ic.width), iw2 = ih * ic.width / ic.height; g.drawImage(ic, cx - iw2 / 2, iy - ih / 2, iw2, ih); } g.fillStyle = col; g.fillRect(x, y + h - 3 * u, w, 3 * u); }
    else if (rw.t === 'coins') { const r = h * .17; g.fillStyle = COIN; g.beginPath(); g.arc(cx, iy, r, 0, TAU); g.fill(); g.strokeStyle = '#8a6210'; g.lineWidth = r * .2; g.beginPath(); g.arc(cx, iy, r * .62, 0, TAU); g.stroke(); }
    else if (rw.t === 'spin') { const r = h * .2, cols = ['#a7b1bd', '#4fa3ff', '#b56bff', '#ffb020', '#ff5ac8', '#c6ff3a']; for (let i = 0; i < 6; i++) { const a0 = t * .5 + i * TAU / 6; g.beginPath(); g.moveTo(cx, iy); g.arc(cx, iy, r, a0, a0 + TAU / 6); g.closePath(); g.fillStyle = cols[i]; g.fill(); } g.fillStyle = INK; g.beginPath(); g.arc(cx, iy, r * .3, 0, TAU); g.fill(); }
    else if (rw.t === 'banner') bannerBg(g, x + w * .14, iy - h * .16, w * .72, h * .32, rw.k, 4);
    else { g.strokeStyle = 'rgba(239,233,220,.5)'; g.lineWidth = 1.5; const bw = w * .7, bh = h * .26; g.strokeRect(cx - bw / 2, iy - bh / 2, bw, bh); g.fillStyle = 'rgba(239,233,220,.08)'; g.fillRect(cx - bw / 2, iy - bh / 2, bw, bh); fitTx(g, rw.s.toUpperCase(), cx, iy + 1, 10 * u, BONE, 'center', 900, bw - 6 * u); }
    const lab = rw.t === 'coins' ? String(rw.n) : sk ? skinName(rw.id) : rw.t === 'spin' ? 'Bonus spin' : rw.t === 'title' ? 'Title' : bannerName(rw.k) + ' banner';
    fitTx(g, lab, cx, y + h - Math.max(11 * u, h * .14), Math.min(11 * u, h * .14), col, 'center', 800, w - 8 * u);
    if (sk && h > 78 * u) fitTx(g, sk.R.n.toUpperCase(), cx, y + 10 * u, 8.5 * u, col, 'center', 900, w - 8 * u);
    g.restore();
    if (got) { const r = 8 * u, bx = x + w - r - 3 * u, by = y + r + 3 * u; g.fillStyle = YOU; g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(bx - r * .45, by); g.lineTo(bx - r * .1, by + r * .38); g.lineTo(bx + r * .5, by - r * .35); g.stroke(); }
    if (st === 'lock') { const bx = x + w - 11 * u, by = y + 12 * u, s = 5 * u; g.strokeStyle = GOLD; g.lineWidth = 1.5 * u; g.beginPath(); g.arc(bx, by - s * .5, s * .55, Math.PI, 0); g.stroke(); g.fillStyle = GOLD; g.fillRect(bx - s * .9, by - s * .5, s * 1.8, s * 1.4); }
  }
  // "5H 12M", "3D 4H", "42M"
  const timeLeft = ms => { const m = Math.max(0, Math.floor(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor(m / 60) % 24; return d ? `${d}D ${h}H` : h ? `${h}H ${m % 60}M` : `${m}M`; };
  const midnightIn = () => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime() - Date.now(); };
  const mondayIn = () => { const d = new Date(); d.setHours(24, 0, 0, 0); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); return d.getTime() - Date.now(); };
  // a challenge's row: the words, how far, a bar, what it pays
  function challengeRow(g, c, x, y, w, h, u, from) {
    const done = c.done || c.at >= c.n, col = done ? YOU : c.weekly ? '#b48aff' : GOLD, k = cl((from != null ? from : c.at) / c.n, 0, 1), count = `${Math.round(k * c.n).toLocaleString('en-US')} / ${c.n.toLocaleString('en-US')}`;
    rr(g, x, y, w, h, 6, done ? 'rgba(53,224,200,.08)' : 'rgba(12,16,22,.82)', done ? 'rgba(53,224,200,.5)' : 'rgba(239,233,220,.12)', 1); g.fillStyle = col; g.fillRect(x, y, 3 * u, h);
    if (h * scrPx(g) < 31) {   // a short row (a phone): one line of words, the count and the XP beside them, the bar along the bottom edge
      const px = Math.min(11.5 * u, h * .46), cy = y + h * .44, xp = done ? '✓ DONE' : `+${c.xp} XP`; g.font = `900 ${fitPx(g, px)}px ${FONT}`; const xw = g.measureText(xp).width, cw2 = g.measureText(count).width;
      g.font = `800 ${fitPx(g, px)}px ${FONT}`; const fits = g.measureText(c.words).width <= w - 36 * u - xw - cw2;   // (the count gives way to the words: the bar says the same)
      tx(g, xp, x + w - 8 * u, cy, px, col, 'right', 900); if (fits) tx(g, count, x + w - 16 * u - xw, cy, px, DIM, 'right', 800); fitTx(g, c.words, x + 10 * u, cy, px, done ? '#c9cfd8' : BONE, 'left', 800, w - 26 * u - xw - (fits ? cw2 + 10 * u : 0));
      g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x + 3 * u, y + h - 3 * u, w - 3 * u, 3 * u); g.fillStyle = col; g.fillRect(x + 3 * u, y + h - 3 * u, (w - 3 * u) * k, 3 * u); return; }
    const px = Math.min(12 * u, h * .36), rw2 = 74 * u; fitTx(g, c.words, x + 12 * u, y + h * .36, px, done ? '#c9cfd8' : BONE, 'left', 800, w - rw2 - 20 * u);
    tx(g, done ? '✓ DONE' : `+${c.xp} XP`, x + w - 10 * u, y + h * .36, Math.min(11 * u, h * .32), col, 'right', 900);
    const bx = x + 12 * u, bw = w - 24 * u - 64 * u, by = y + h * .72; g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(bx, by - 2 * u, bw, 4 * u); g.fillStyle = col; g.fillRect(bx, by - 2 * u, bw * k, 4 * u);
    tx(g, count, x + w - 10 * u, by, Math.min(10 * u, h * .28), DIM, 'right', 800);
  }
  // a player's card, as a lobby shows it: banner, picture, name, title, level
  function playerCard(g, x, y, w, h, u, o) {
    bannerBg(g, x, y, w, h, o.banner, 8); rr(g, x, y, w, h, 8, null, o.edge || 'rgba(239,233,220,.3)', 1.5);
    portraitTile(g, o.op, x + 6 * u, y + 6 * u, h - 12 * u, h - 12 * u, { r: 5 }); const nx = x + h + 2 * u, B = BANNERS[o.banner] || BANNERS.plain;
    fitTx(g, String(o.name).toUpperCase(), nx, y + h * .32, Math.min(16 * u, h * .28), BONE, 'left', 900, w - h - 70 * u);
    fitTx(g, o.title ? o.title.toUpperCase() : (OPS[o.op] || OPS.vex).n, nx, y + h * .66, Math.min(11 * u, h * .2), o.title ? B[2] : (OPS[o.op] || OPS.vex).col, 'left', 800, w - h - 70 * u);
    if (o.lv) lvChip(g, x + w - 10 * u, y + h / 2, o.lv, Math.min(12 * u, h * .22), 'right');
  }
  function drawPass(g, V, W, u) {
    const x0 = V.x0 + 60 / pxPer() + 20 * u, x1 = V.x1 - 24 * u, S = seasonNow(), p = myPass(), tier = passTier(), R = passRewards(p.s), full = tier >= PASS_TIERS, into = full ? PASS_XP : p.xp % PASS_XP, top = V.y0 + 14 * u;
    // the season, and how long it has left
    tx(g, `SEASON ${S.n}`, x0, top + 18 * u, 30 * u, BONE, 'left', 900); g.font = `900 ${fitPx(g, 30 * u)}px ${FONT}`; const sw = g.measureText(`SEASON ${S.n}`).width;
    tx(g, S.name.toUpperCase(), x0 + sw + 14 * u, top + 20 * u, 16 * u, GOLD, 'left', 900); g.font = `900 ${fitPx(g, 16 * u)}px ${FONT}`; tx(g, 'ENDS IN ' + timeLeft(S.left), x0 + sw + 28 * u + g.measureText(S.name.toUpperCase()).width, top + 21 * u, 11 * u, DIM, 'left', 900);
    // your tier, the way to the next, and the premium track
    const yb = top + 50 * u, pw = Math.min(250 * u, (x1 - x0) * .32), ph = tapH(30), barX = x0 + 92 * u, barW = x1 - pw - 16 * u - barX - 96 * u;
    tx(g, full ? 'TIER 30' : 'TIER ' + tier, x0, yb, 15 * u, BONE, 'left', 900); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(barX, yb - 4 * u, barW, 8 * u); g.fillStyle = GOLD; g.fillRect(barX, yb - 4 * u, barW * into / PASS_XP, 8 * u);
    tx(g, full ? 'COMPLETE' : `${into} / ${PASS_XP} XP`, barX + barW + 10 * u, yb, 11 * u, DIM, 'left', 800);
    const py = top + 2 * u;   // (top right, beside the season's name: a phone's taller button stays clear of the track)
    if (p.prem) { rr(g, x1 - pw, py, pw, ph, 6, 'rgba(255,214,102,.14)', GOLD, 1.5); tx(g, '★ PREMIUM UNLOCKED', x1 - pw / 2, py + ph / 2, 12 * u, GOLD, 'center', 900); }
    else { const can = (STATS.coins | 0) >= PASS_PRICE; btn(g, x1 - pw, py, pw, ph, can ? `UNLOCK PREMIUM  ·  ${PASS_PRICE} COINS` : `PREMIUM  ·  ${PASS_PRICE} COINS`, () => { const got = buyPremium(); if (got) { PS.toast = { t0: performance.now(), got }; saveAll(true); emit('passUp'); } }, { on: can, fill: GOLD, off: !can, px: 12 * u, edge: GOLD }); }
    // the track
    const yt = yb + 24 * u, avail = V.y1 - 10 * u - yt, botH = cl(avail * .34, 124 * u, 190 * u), hd = 22 * u, th = cl((avail - botH - 14 * u - hd - 6 * u) / 2, 48 * u, 116 * u), gut = 62 * u, gap = 6 * u;
    const colW = cl(th * 1.2, 92 * u, 136 * u), n = Math.max(2, Math.min(PASS_TIERS, Math.floor((x1 - x0 - gut + gap) / (colW + gap)))), cw = (x1 - x0 - gut + gap) / n - gap;
    if (PS.off == null) PS.off = Math.floor(Math.min(tier, PASS_TIERS - 1) / n) * n; PS.off = cl(PS.off, 0, Math.max(0, PASS_TIERS - n));
    btn(g, x0, yt, 28 * u, hd, '‹', () => { PS.off = Math.max(0, PS.off - n); }, { px: 15 * u, off: PS.off <= 0 }); btn(g, x0 + 30 * u, yt, 28 * u, hd, '›', () => { PS.off = Math.min(PASS_TIERS - n, PS.off + n); }, { px: 15 * u, off: PS.off >= PASS_TIERS - n });
    tx(g, 'FREE', x0 + gut / 2 - 3 * u, yt + hd + 6 * u + th / 2, 10 * u, BONE, 'center', 900); tx(g, 'PREMIUM', x0 + gut / 2 - 3 * u, yt + hd + 12 * u + th * 1.5, 9 * u, GOLD, 'center', 900);
    for (let i = 0; i < n; i++) { const t = PS.off + i + 1; if (t > PASS_TIERS) break; const x = x0 + gut + i * (cw + gap), reached = t <= tier, next = t === tier + 1;
      // the tier's number on a line that fills as you go
      g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x - gap / 2, yt + hd - 4 * u, cw + gap, 3 * u); g.fillStyle = GOLD; g.fillRect(x - gap / 2, yt + hd - 4 * u, (cw + gap) * (reached ? 1 : next ? into / PASS_XP : 0), 3 * u);
      tx(g, String(t), x + cw / 2, yt + hd / 2 - 3 * u, 12 * u, reached ? GOLD : next ? BONE : DIM, 'center', 900);
      rewardTile(g, R[t - 1].f, x, yt + hd + 6 * u, cw, th, u, t <= p.f ? 'got' : next ? 'next' : 'far');
      rewardTile(g, R[t - 1].p, x, yt + hd + 12 * u + th, cw, th, u, !p.prem ? 'lock' : t <= p.p ? 'got' : next ? 'next' : 'far');
      for (const [rw, yy] of [[R[t - 1].f, yt + hd + 6 * u], [R[t - 1].p, yt + hd + 12 * u + th]]) if (rw.t === 'skin') zone(x, yy, cw, th, () => { UI.returnTo = 'pass'; UI.panel = 'store'; SH.show = rw.id; click(); }); }
    // under it: today's challenges, this week's, and your card
    const y2 = yt + hd + 12 * u + th * 2 + 14 * u, bh = V.y1 - 10 * u - y2, cg = 14 * u, colw = (x1 - x0 - cg * 2) / 3, list = myChallenges(), rh = cl((bh - 20 * u) / 3 - 5 * u, 26 * u, 46 * u);
    [['DAILY CHALLENGES', 'NEW IN ' + timeLeft(midnightIn()), list.filter(c => !c.weekly), GOLD], ['WEEKLY CHALLENGES', 'NEW IN ' + timeLeft(mondayIn()), list.filter(c => c.weekly), '#b48aff']].forEach(([head, when, cs, col], k) => {
      const x = x0 + k * (colw + cg); fitTx(g, head, x, y2 + 8 * u, 11 * u, col, 'left', 900, colw * .6); tx(g, when, x + colw, y2 + 8 * u, 9.5 * u, DIM, 'right', 800);
      cs.forEach((c, i) => challengeRow(g, c, x, y2 + 20 * u + i * (rh + 5 * u), colw, rh, u)); });
    // your card
    { const x = x0 + 2 * (colw + cg), L = levelOf(STATS.xp | 0), c = myCard(), chh = cl(bh - 20 * u - 30 * u - tapH(26), 40 * u, 66 * u);
      tx(g, 'YOUR CARD', x, y2 + 8 * u, 11 * u, DIM, 'left', 900); tx(g, `${L.into} / ${L.need} XP TO LEVEL ${L.l + 1}`, x + colw, y2 + 8 * u, 9.5 * u, DIM, 'right', 800);
      playerCard(g, x, y2 + 20 * u, colw, chh, u, { name: MP.name || 'You', op: CFG.op, lv: c.lv, title: c.title, banner: c.banner });
      const ly = y2 + 20 * u + chh + 8 * u; g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x, ly, colw, 5 * u); g.fillStyle = lvCol(L.l); g.fillRect(x, ly, colw * L.into / L.need, 5 * u);
      const ts = ['', ...(STATS.titles || [])], bs = ['plain', ...(STATS.banners || []).filter(k => BANNERS[k] && k !== 'plain')], by2 = ly + 12 * u, bw2 = (colw - 8 * u) / 2, bh2 = Math.max(tapH(26), 0);
      if (by2 + bh2 <= V.y1 - 4 * u) {
        btn(g, x, by2, colw, bh2, 'CHANGE TITLE & BANNER  ›', () => { UI.panel = 'locker'; SH.lview = 'card'; }, { px: 11 * u }); } }
    // premium, just unlocked: what it handed over
    if (PS.toast) { const t = (performance.now() - PS.toast.t0) / 1000, got = PS.toast.got; if (t > 5) PS.toast = null; else { const a = smooth(cl(t / .25, 0, 1)) * smooth(cl((5 - t) / .4, 0, 1)), w = Math.min(560 * u, x1 - x0), h = 64 * u, x = 640 - w / 2, y = V.y0 + 90 * u; g.save(); g.globalAlpha = a;
      rr(g, x, y, w, h, 10, 'rgba(20,16,6,.97)', GOLD, 2); tx(g, 'PREMIUM UNLOCKED', 640, y + 22 * u, 18 * u, GOLD, 'center', 900); fitTx(g, got.length ? `${got.length} reward${got.length === 1 ? '' : 's'} from the tiers you have passed: ` + got.slice(0, 4).map(q => rewardName(q.rw)).join(', ') + (got.length > 4 ? ' …' : '') : 'Its rewards arrive as you climb the tiers.', 640, y + 46 * u, 11 * u, BONE, 'center', 700, w - 24 * u); g.restore(); } }
  }
