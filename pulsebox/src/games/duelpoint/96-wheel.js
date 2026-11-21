  /* ---------- 96 the daily spin: a wheel of skins, one spin a day ----------
     Thirteen slices, every one a skin you do not have yet: four Common, three Rare, two Epic, two Legendary, a Mythic and
     a Paragon. The slices are the same size; the odds go by rarity (Common 40%, Rare 28%, Epic 18%, Legendary 10%, Mythic
     3%, Paragon 1%) and are shown under the wheel. Your wheel is dealt fresh each day (seeded by the day and a number of
     your own, so it stays put if you reload). The prize is decided and saved the moment you press SPIN (a reload half way
     cannot change it); the wheel then runs down onto it. A new spin at midnight, your time. */
  const WHEEL_ODDS = { common: .40, rare: .28, epic: .18, legendary: .10, mythic: .03, paragon: .01 };
  const WHEEL_ORDER = ['common', 'rare', 'epic', 'common', 'legendary', 'rare', 'common', 'mythic', 'epic', 'rare', 'common', 'legendary', 'paragon'];
  const WH = { open: false, spin: null, prize: null };   // spin: { from, to, t0, T }; prize: the skin won today, shown after the spin
  const wheelDay = (now = Date.now()) => { const d = new Date(now); return Math.floor((now - d.getTimezoneOffset() * 60000) / 86400000); };
  const wheelReady = () => STATS.spun !== wheelDay();
  const wheelLeft = () => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime() - Date.now(); };
  // today's slices: a skin for each, of its slice's rarity, none you own and no two alike
  function wheelSlices(day = wheelDay()) {
    // dealt once a day and kept (with the settings), so winning a slice's skin does not change what the wheel shows
    if (STATS.wheel && STATS.wheel.day === day && Array.isArray(STATS.wheel.s) && STATS.wheel.s.length === WHEEL_ORDER.length) return STATS.wheel.s;
    if (STATS.wsalt == null) STATS.wsalt = Math.floor(Math.random() * 1e9);
    let s = (day * 2654435761 ^ STATS.wsalt) >>> 0; const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const out = [], lines = Object.keys(LINES), counts = {}; for (const q of WHEEL_ORDER) counts[q] = (counts[q] || 0) + 1;
    for (const tier of WHEEL_ORDER) {
      const pool = lines.filter(l => LINES[l].r === tier); let id = null;
      for (let tries = 0; tries < 60 && !id; tries++) { const c = skinId(pool[Math.floor(r() * pool.length)], r() < .12 ? 'knife' : SKIN_GUNS[Math.floor(r() * (SKIN_GUNS.length - 1))]); if (!out.some(q => q.id === c) && (!STATS.skins.includes(c) || tries > 50)) id = c; }
      out.push({ id, r: tier, w: WHEEL_ODDS[tier] / counts[tier] });
    }
    STATS.wheel = { day, s: out }; saveAll(); return out;
  }
  function openWheel() { WH.open = true; WH.spin = null; if (!wheelReady() && STATS.spunId) WH.prize = STATS.spunId; else WH.prize = null; click(); }
  function spinWheel() {
    if (!wheelReady() || WH.spin) return;
    const sl = wheelSlices(), tot = sl.reduce((a, q) => a + q.w, 0); let x = Math.random() * tot, i = 0; for (; i < sl.length - 1; i++) { x -= sl[i].w; if (x <= 0) break; }
    const prize = sl[i].id, sk = skinOfId(prize), have = STATS.skins.includes(prize);
    // decided and kept now: the skin (or, if you somehow had it already, its price back in coins), and today's spin used
    if (!have) STATS.skins.push(prize); else STATS.coins += Math.round(skinPrice(prize) / 2);
    STATS.spun = wheelDay(); STATS.spunId = prize; saveAll(true);
    // the wheel runs down onto it: the slice's middle (give or take) under the pointer, after five or six turns
    const n = sl.length, a = TAU / n, mid = (i + .5) * a + (Math.random() - .5) * a * .6, from = WH.rot || 0, to = from + TAU * (5 + Math.floor(Math.random() * 2)) + ((TAU - mid - from % TAU) % TAU + TAU) % TAU;
    WH.spin = { from, to, t0: performance.now(), T: 5.2 }; WH.prize = null; WH.won = { id: prize, dup: have }; click();
  }
  function drawWheel(g) {
    const V = K.view, u = uiScale(), W = V.x1 - V.x0, H = V.y1 - V.y0, now = performance.now();
    g.fillStyle = 'rgba(6,8,12,.9)'; g.fillRect(V.x0, V.y0, W, H); zone(V.x0, V.y0, W, H, () => {});   // (takes every press under it)
    tx(g, 'DAILY SPIN', V.x0 + (isTouch() ? 92 : 40) * u, V.y0 + 40 * u, 30 * u, BONE, 'left', 900);
    btn(g, V.x1 - 150 * u, V.y0 + 20 * u, 130 * u, tapH(40), 'CLOSE', () => { WH.open = false; WH.spin = null; }, { px: 15 * u });
    const bh0 = tapH(40), sl = wheelSlices(), n = sl.length, R = Math.max(60 * u, Math.min(250 * u, (H - 70 * u - 24 * u - 34 * u - 22 * u - bh0 - 14 * u) / 2)), cx = 640, cy = V.y0 + 70 * u + R + 24 * u, a = TAU / n;   // (sized to leave room for what is under it)
    // the spin: an ease-out over its time; when it stops, the prize
    if (WH.spin) { const k = Math.min(1, (now - WH.spin.t0) / 1000 / WH.spin.T), e = 1 - Math.pow(1 - k, 3.4); WH.rot = WH.spin.from + (WH.spin.to - WH.spin.from) * e;
      const tick = Math.floor(WH.rot / a); if (tick !== WH.tick) { WH.tick = tick; emit('wheelTick'); }
      if (k >= 1) { WH.prize = WH.won.id; WH.dup = WH.won.dup; WH.spin = null; const sk = skinOfId(WH.prize); if (sk) emit('unlock', sk); } }
    const rot = WH.rot || 0;
    // the slices, each in its rarity's colour, its skin's picture near the rim
    for (let i = 0; i < n; i++) {
      const q = sl[i], sk = q.id && skinOfId(q.id), col = RARITY[q.r].col, a0 = -Math.PI / 2 + rot + i * a, a1 = a0 + a, won = WH.prize && q.id === WH.prize;
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a1); g.closePath(); const gr = g.createRadialGradient(cx, cy, R * .2, cx, cy, R); gr.addColorStop(0, 'rgba(14,18,26,.95)'); gr.addColorStop(1, col + (won ? 'cc' : '55')); g.fillStyle = gr; g.fill();
      g.strokeStyle = 'rgba(239,233,220,.25)'; g.lineWidth = 1.5; g.stroke();
      if (q.r === 'paragon' || q.r === 'mythic') { g.save(); g.clip(); g.strokeStyle = col; g.globalAlpha = .35 + .25 * Math.sin(now / 300 + i); g.lineWidth = 3 * u; g.beginPath(); g.arc(cx, cy, R - 4 * u, a0, a1); g.stroke(); g.restore(); }
      const am = a0 + a / 2, ic = sk ? gunIcon(sk.k, q.id) : null, iw = R * .34, ih = iw * 150 / 480, ix = cx + Math.cos(am) * R * .66, iy = cy + Math.sin(am) * R * .66;
      if (ic) { g.save(); g.translate(ix, iy); g.rotate(am); g.drawImage(ic, -iw / 2, -ih / 2, iw, ih); g.restore(); }
      // (the label is turned with its slice, so its size is set here: the HUD's text helper reads the scale off the turn)
      { const lpx = fitPx(g, Math.min(10 * u, R * .05)); g.save(); g.translate(cx + Math.cos(am) * R * .9, cy + Math.sin(am) * R * .9); g.rotate(am + Math.PI / 2); g.font = `900 ${lpx}px ${FONT}`; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
        const room = R * .9 * a * .86, lab = [RARITY[q.r].n.toUpperCase(), { common: 'COMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGEND', mythic: 'MYTHIC', paragon: 'PARAGON' }[q.r], { common: 'COM', rare: 'RARE', epic: 'EPIC', legendary: 'LEG', mythic: 'MYTH', paragon: 'PARA' }[q.r]].find(l => g.measureText(l).width <= room);   // (a small wheel: a shorter word)
        if (lab) g.fillText(lab, 0, 0); g.restore(); }
    }
    g.strokeStyle = GOLD; g.lineWidth = 4 * u; g.beginPath(); g.arc(cx, cy, R + 3 * u, 0, TAU); g.stroke();
    // the pointer at the top
    g.fillStyle = GOLD; g.beginPath(); g.moveTo(cx, cy - R + 18 * u); g.lineTo(cx - 16 * u, cy - R - 16 * u); g.lineTo(cx + 16 * u, cy - R - 16 * u); g.closePath(); g.fill();
    // the hub: SPIN, or the time to the next one
    const hr = R * .24, ready = wheelReady() && !WH.spin;
    g.fillStyle = ready ? FOE : 'rgba(14,18,26,.96)'; g.beginPath(); g.arc(cx, cy, hr, 0, TAU); g.fill(); g.strokeStyle = GOLD; g.lineWidth = 3 * u; g.stroke();
    if (ready) { zone(cx - hr, cy - hr, hr * 2, hr * 2, spinWheel); tx(g, 'SPIN', cx, cy, hr * .42, INK, 'center', 900); }
    else if (!WH.spin) { const s = Math.floor(wheelLeft() / 1000); tx(g, 'NEXT', cx, cy - hr * .22, hr * .2, DIM, 'center', 900); tx(g, `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, cx, cy + hr * .12, hr * .26, BONE, 'center', 900); }
    // the odds, under the wheel; or what you won
    const by = cy + R + 34 * u;
    if (WH.prize) {
      const sk = skinOfId(WH.prize); if (sk) {
        tx(g, (WH.dup ? 'ALREADY YOURS: ' + Math.round(skinPrice(WH.prize) / 2) + ' COINS BACK  ·  ' : 'YOU WON  ·  ') + skinName(WH.prize).toUpperCase(), cx, by, 18 * u, sk.R.col, 'center', 900);
        const bw = 150 * u, bh = bh0, y2 = by + 22 * u, eq = STATS.equip[sk.k] === WH.prize;
        btn(g, cx - bw * 1.5 - 12 * u, y2, bw, bh, eq ? 'EQUIPPED' : 'EQUIP', () => { STATS.equip[sk.k] = WH.prize; saveAll(true); }, { on: eq, fill: YOU, px: 15 * u });
        btn(g, cx - bw / 2, y2, bw, bh, 'SEE IT', () => { const id = WH.prize; WH.open = false; screen = 'menu'; UI.panel = 'store'; SH.reveal = { id, t0: performance.now() }; SH.show = null; }, { px: 15 * u });
        btn(g, cx + bw / 2 + 12 * u, y2, bw, bh, 'CLOSE', () => { WH.open = false; }, { px: 15 * u });
      }
    } else tx(g, Object.entries(WHEEL_ODDS).map(([k, p]) => `${RARITY[k].n} ${Math.round(p * 100)}%`).join('   ·   '), cx, by, 12 * u, DIM, 'center', 800);
  }
