  /* ---------- 96 store and locker ----------
     STORE: seven skins, a new set every three hours (22-skins picks them), a featured card for the rarest and six more, a
     countdown to the next rotation, and a CODE box. Any card opens a preview: the skin on its gun, turning in 3D, with what it brings. Buying one plays a reveal
     in the rarity's colour and puts it on the gun at once. LOCKER: every weapon, the skins you own for it, and what it is
     wearing now. Prices are in coins, which matches pay (see the results screen). */
  const SH = { show: null, reveal: null, locker: 'vesper', msg: null, spin: 0, hov: null };
  function gunShowScene() {
    if (X.gs) return X.gs; const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 1, .02, 30);
    scene.add(new THREE.HemisphereLight('#ffffff', '#4a5260', 1.25));
    const key = new THREE.DirectionalLight('#fff3e2', 2.6); key.position.set(2, 3, 2.5); scene.add(key, key.target);
    const rim = new THREE.DirectionalLight('#9fd8ff', 2.4); rim.position.set(-2.5, 1.5, -2); scene.add(rim, rim.target);
    const fill = new THREE.DirectionalLight('#ffffff', .9); fill.position.set(0, -2, 2); scene.add(fill, fill.target);
    return X.gs = { scene, cam, rim, model: null, key: '' };
  }
  // the skin under preview (or being revealed), turning in the middle of the screen, a little left of centre
  function renderGunShow(dt) {
    const id = SH.reveal ? SH.reveal.id : SH.show || (UI.panel === 'locker' ? (STATS.equip[SH.locker] || 'std:' + SH.locker) : null); if (!id) return false;
    const S = gunShowScene(), sk = skinOfId(id), k = sk ? sk.k : id.split(':')[1];
    if (S.key !== id) { if (S.model) S.scene.remove(S.model); S.model = gunModel(k, { skin: sk ? id : null }); S.scene.add(S.model); S.key = id; S.model.userData.kitAnims = null;
      const bb = new THREE.Box3().setFromObject(S.model), c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3()); S.model.children.forEach(o => o.position.sub(c)); S.size = Math.max(sz.z, sz.y * 2.2, .25); S.t0 = performance.now(); }
    const rv = SH.reveal, rt = rv ? (performance.now() - rv.t0) / 1000 : 9, spinRate = rv ? .5 + 7 * Math.max(0, 1 - rt / 1.6) : .55;
    SH.spin += dt * .55; const extra = rv ? TAU * 3 * (1 - smooth(cl(rt / 1.8, 0, 1))) : 0;   // side on, swaying; an unlock spins in and settles
    S.model.rotation.set(.06 + Math.sin(SH.spin * .6) * .05, Math.PI / 2 + Math.sin(SH.spin * .7) * .5 + extra, 0);
    const pop = rv ? smooth(cl(rt / .5, 0, 1)) : smooth(cl((performance.now() - S.t0) / 350, 0, 1)); S.model.scale.setScalar(.5 + .5 * pop);
    animKit(S.model, dt);
    const W = innerWidth, H = innerHeight, cam = S.cam; cam.aspect = W / H; cam.fov = 26; const d = S.size / (2 * Math.tan(13 * D2R)) * (UI.panel === 'locker' && !rv ? 1.35 : rv ? 1.05 : 1.08);
    cam.position.set(0, S.size * .06, d); cam.lookAt(0, 0, 0); cam.setViewOffset(W, H, rv ? 0 : W * (UI.panel === 'locker' ? -.14 : .17), rv ? -H * .04 : 0, W, H); cam.updateProjectionMatrix();
    S.rim.color.set(sk ? sk.R.col : '#9fd8ff');
    S.scene.background = new THREE.Color(rv && sk ? sk.R.col : '#0b0e13').lerp(new THREE.Color('#07090c'), rv ? .82 : 0);
    X.renderer.render(S.scene, cam); cam.clearViewOffset(); return true;
  }
  const owns = id => STATS.skins.includes(id);
  // a code: VAULT-7Q4K-ALL (any case, dashes optional) unlocks every skin on every weapon
  function enterCode() {
    let c = null; try { c = prompt('Enter a code'); } catch (e) {} if (!c) return;
    if (codeHash(c) === ALL_SKINS_HASH) { const all = allSkinIds(), before = STATS.skins.length; for (const id of all) if (!STATS.skins.includes(id)) STATS.skins.push(id); saveAll(true); SH.msg = { s: `Code accepted: every skin unlocked (${all.length}, ${STATS.skins.length - before} new). See them in the LOCKER.`, t0: performance.now(), good: true }; emit('unlock', skinOfId(all[all.length - 1])); }
    else SH.msg = { s: "That code isn't valid", t0: performance.now() };
  }
  function buySkin(id) {
    const price = skinPrice(id), sk = skinOfId(id); if (!sk || owns(id)) return;
    if (STATS.coins < price) { SH.msg = { s: `You need ${price - STATS.coins} more coins`, t0: performance.now() }; return; }
    STATS.coins -= price; STATS.skins.push(id); STATS.equip[sk.k] = id; saveAll(true);
    SH.reveal = { id, t0: performance.now() }; SH.show = null; emit('unlock', sk);
  }
  // try a skin on the range before buying: it goes back to what you had when you leave
  function tryInRange(id) {
    const sk = skinOfId(id); if (!sk) return; SH.show = null; UI.panel = 'home'; play({ mode: 'range' }); const P = me(); P.skins[sk.k] = id; UI.trying = id;
    if (sk.k === 'knife') switchTo(P, 3); else { const G = GUNS[sk.k]; P.guns[G.slot] = sk.k; giveAmmo(P, sk.k); P.slot = 0; switchTo(P, G.slot); }
  }
  function equipSkin(k, id) { if (id) STATS.equip[k] = id; else delete STATS.equip[k]; saveAll(true); click(); }
  // a skin's card: rarity colour behind it, the gun in that skin, name, rarity, price or OWNED
  function skinCard(g, id, x, y, w, h, u, big) {
    const sk = skinOfId(id), R2 = sk.R, own = owns(id), hot = zone(x, y, w, h, () => { SH.show = id; click(); }), lift = hot ? 3 * u : 0; y -= lift;
    g.save(); g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, 8); else g.rect(x, y, w, h); g.clip();
    let gr = g.createLinearGradient(x, y + h, x + w, y); gr.addColorStop(0, R2.col + '55'); gr.addColorStop(.6, R2.col + '14'); gr.addColorStop(1, '#0e1218'); g.fillStyle = '#0e1218'; g.fillRect(x, y, w, h); g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 1; g.beginPath(); for (let i = -h; i < w; i += 10) { g.moveTo(x + i, y + h); g.lineTo(x + i + h, y); } g.stroke();
    if (R2.tier >= 3) { const t = (X ? X.t : 0) * .6, sx = x + ((t % 2) / 2) * (w + h) - h; gr = g.createLinearGradient(sx, 0, sx + h * .6, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.09)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x, y, w, h); }   // a sheen sweeps the rarest
    const ic = gunIcon(sk.k, id); if (ic) { const iw = w * (big ? .86 : .82), ih = iw * ic.height / ic.width, cy = y + h * (big ? .44 : .42); g.drawImage(ic, x + (w - iw) / 2, cy - ih / 2, iw, ih); }
    g.restore();
    g.fillStyle = R2.col; g.fillRect(x, y + h - 4 * u, w, 4 * u);
    rr(g, x, y, w, h, 8, null, hot ? R2.col : 'rgba(239,233,220,.14)', hot ? 2.5 : 1);
    const px = big ? 20 * u : 15 * u; tx(g, skinName(id).toUpperCase(), x + 14 * u, y + h - 44 * u * (big ? 1.25 : 1), px, BONE, 'left', 900);
    tx(g, R2.n.toUpperCase() + (sk.k === 'knife' ? '  ·  MELEE' : '  ·  ' + GUNS[sk.k].cat.toUpperCase()), x + 14 * u, y + h - 20 * u * (big ? 1.25 : 1), 11 * u, R2.col, 'left', 800);
    if (own) tx(g, 'OWNED', x + w - 14 * u, y + h - 20 * u * (big ? 1.25 : 1), 12 * u, YOU, 'right', 900); else coinTag(g, x + w - 14 * u, y + h - 20 * u * (big ? 1.25 : 1), 15 * u, skinPrice(id));
  }
  function featureList(sk) {
    const L = sk.L, t = sk.R.tier, f = [['Finish', t >= 3 ? 'living, animated' : 'its own paint']];
    if (t >= 1) f.push(['Parts', sk.k === 'knife' ? (KNIFE_SHAPE[sk.line] || 'standard') + ' blade' : 'new parts on the gun']);
    if (L.fx && L.fx.tracer) f.push(['Tracers', 'coloured']); if (L.fx && L.fx.idle) f.push(['Idle effect', L.fx.idle]);
    if (L.emblem) f.push(['Kill banner', L.emblem.shape + ' emblem']); if (L.kill) f.push(['Kill effect', { shards: 'ice shatter', coins: 'gold burst', flame: 'flame burst', bolt: 'lightning strike', void: 'implosion', sun: 'solar flare' }[L.kill.kind]]);
    if (L.sound) f.push(['Kill sound', 'its own']); return f;
  }
  function drawStore(g, V, W, u) {
    const items = dailyStore(), left = storeLeft(), hh = Math.floor(left / 3600000), mm = Math.floor(left / 60000) % 60, ss = Math.floor(left / 1000) % 60, x0 = V.x0 + 60 / pxPer() + 20 * u, top = V.y0 + 96 * u;
    tx(g, 'STORE', x0, V.y0 + 46 * u, 40 * u, BONE, 'left', 900); tx(g, `New skins in ${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, x0 + 4 * u, V.y0 + 78 * u, 13 * u, DIM, 'left', 700);
    coinTag(g, V.x1 - 386 * u, V.y0 + 46 * u, 22 * u, STATS.coins); btn(g, V.x1 - 250 * u, V.y0 + 28 * u, 110 * u, 36 * u, 'CODE', enterCode, { px: 13 * u }); btn(g, V.x1 - 130 * u, V.y0 + 28 * u, 110 * u, 36 * u, 'LOCKER', () => { UI.panel = 'locker'; SH.show = null; }, { px: 13 * u });
    if (SH.msg && performance.now() - SH.msg.t0 < 3200 && !SH.show) tx(g, SH.msg.s, V.x1 - 20 * u, V.y0 + 82 * u, 14 * u, SH.msg.good ? YOU : WARN, 'right', 800);
    const gw = V.x1 - x0 - 40 * u, gh = V.y1 - top - 70 * u, fw = gw * .36, cols = 3, cw = (gw - fw - 16 * u - (cols - 1) * 14 * u) / cols, ch = (gh - 14 * u) / 2;
    skinCard(g, items[0], x0, top, fw, gh, u, true); tx(g, 'FEATURED', x0 + 14 * u, top + 20 * u, 11 * u, skinOfId(items[0]).R.col, 'left', 900);
    items.slice(1).forEach((id, i) => skinCard(g, id, x0 + fw + 16 * u + (i % cols) * (cw + 14 * u), top + Math.floor(i / cols) * (ch + 14 * u), cw, ch, u, false));
  }
  function drawShow(g, V, W, H, u) {   // the preview panel over the turning gun
    const id = SH.show, sk = skinOfId(id); if (!sk) { SH.show = null; return; } const own = owns(id), price = skinPrice(id), L = sk.L, px = V.x1 - 430 * u, py = V.y0 + 70 * u;
    let gr = g.createLinearGradient(px - 120 * u, 0, V.x1, 0); gr.addColorStop(0, 'rgba(8,10,14,0)'); gr.addColorStop(.3, 'rgba(8,10,14,.88)'); g.fillStyle = gr; g.fillRect(px - 120 * u, V.y0, V.x1 - px + 120 * u, H);
    tx(g, sk.R.n.toUpperCase(), px, py, 13 * u, sk.R.col, 'left', 900); tx(g, L.n.toUpperCase(), px, py + 44 * u, 40 * u, BONE, 'left', 900); tx(g, sk.k === 'knife' ? 'BLADE' : GUNS[sk.k].n.toUpperCase(), px, py + 80 * u, 18 * u, '#c9cfd8', 'left', 800);
    let y = para(g, L.blurb, px, py + 112 * u, 380 * u, 14 * u, '#c9cfd8') + 16 * u;
    for (const [a, b] of featureList(sk)) { g.fillStyle = sk.R.col; g.fillRect(px, y - 5 * u, 4 * u, 10 * u); tx(g, a.toUpperCase(), px + 12 * u, y, 11 * u, DIM, 'left', 800); tx(g, b, px + 130 * u, y, 13 * u, BONE, 'left', 700); y += 24 * u; }
    const by = V.y1 - 120 * u;
    if (own) { const on = STATS.equip[sk.k] === id; btn(g, px, by, 380 * u, 60 * u, on ? 'EQUIPPED' : 'EQUIP', () => equipSkin(sk.k, on ? null : id), { on: !on, fill: YOU, solid: true, col: INK, px: 22 * u, sub: on ? 'press again to take it off' : '' }); }
    else { const can = STATS.coins >= price; btn(g, px, by, 380 * u, 60 * u, `BUY  ·  ${price}`, () => buySkin(id), { on: can, fill: sk.R.col, solid: can, col: INK, px: 22 * u, sub: can ? `you have ${STATS.coins}` : `you have ${STATS.coins} · win matches to earn coins` }); }
    btn(g, px, by + 70 * u, 185 * u, 40 * u, 'BACK', () => { SH.show = null; }, { px: 13 * u }); btn(g, px + 195 * u, by + 70 * u, 185 * u, 40 * u, 'TRY IN THE RANGE', () => tryInRange(id), { px: 12 * u });
    if (SH.msg && performance.now() - SH.msg.t0 < 2200) tx(g, SH.msg.s, px + 190 * u, by - 18 * u, 14 * u, WARN, 'center', 800);
  }
  function drawReveal(g, V, W, H, u) {   // the unlock: a burst in the rarity's colour, the gun spinning down, its name
    const rv = SH.reveal, sk = skinOfId(rv.id), t = (performance.now() - rv.t0) / 1000, col = sk.R.col, cx = 640, cy = V.y0 + H * .44;
    g.save(); g.translate(cx, cy); g.globalCompositeOperation = 'lighter';
    const n = 18 + sk.R.tier * 6, a0 = t * .25, r0 = 210 * u; for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU, L2 = r0 + (300 + sk.R.tier * 60) * u * smooth(cl(t / .6, 0, 1)); g.fillStyle = col + '26'; g.beginPath(); g.moveTo(Math.cos(a - .02) * r0, Math.sin(a - .02) * r0); g.lineTo(Math.cos(a - .045) * L2, Math.sin(a - .045) * L2); g.lineTo(Math.cos(a + .045) * L2, Math.sin(a + .045) * L2); g.lineTo(Math.cos(a + .02) * r0, Math.sin(a + .02) * r0); g.closePath(); g.fill(); }
    g.strokeStyle = col + '66'; g.lineWidth = 2 * u; g.beginPath(); g.arc(0, 0, r0 * (.95 + Math.sin(t * 3) * .02), 0, TAU); g.stroke();
    const fl = Math.max(0, 1 - t / .35); if (fl > 0) { g.fillStyle = `rgba(255,255,255,${fl * .8})`; g.fillRect(-cx, -cy, 1280 * 2, H * 2); }
    for (let i = 0; i < 40 + sk.R.tier * 20; i++) { const a = i * 2.39996, sp = (60 + (i * 37) % 200) * u, r = sp * Math.min(t, 2.4), al = Math.max(0, 1 - t / 2.6); g.fillStyle = (i % 3 ? col : '#ffffff') + Math.round(al * 200).toString(16).padStart(2, '0'); g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r - t * t * 8 * u, 2.2 * u, 0, TAU); g.fill(); }
    g.restore();
    const ta = smooth(cl((t - .35) / .4, 0, 1)); g.save(); g.globalAlpha = ta;
    tx(g, 'UNLOCKED', 640, V.y0 + 70 * u, 18 * u, col, 'center', 900); tx(g, skinName(rv.id).toUpperCase(), 640, V.y1 - 170 * u, 44 * u, BONE, 'center', 900); tx(g, sk.R.n.toUpperCase() + '  ·  ON YOUR ' + (sk.k === 'knife' ? 'BLADE' : GUNS[sk.k].n.toUpperCase()) + ' NOW', 640, V.y1 - 132 * u, 14 * u, col, 'center', 800);
    if (t > 1.2) btn(g, 640 - 110 * u, V.y1 - 100 * u, 220 * u, 52 * u, 'NICE', () => { SH.reveal = null; }, { on: true, fill: col, solid: true, col: INK, px: 20 * u });
    g.restore();
  }
  function drawLocker(g, V, W, u) {
    const x0 = V.x0 + 60 / pxPer() + 20 * u, top = V.y0 + 96 * u, k = SH.locker;
    tx(g, 'LOCKER', x0, V.y0 + 46 * u, 40 * u, BONE, 'left', 900); tx(g, `${STATS.skins.length} skin${STATS.skins.length === 1 ? '' : 's'} owned`, x0 + 4 * u, V.y0 + 78 * u, 13 * u, DIM, 'left', 700);
    coinTag(g, V.x1 - 266 * u, V.y0 + 46 * u, 22 * u, STATS.coins); btn(g, V.x1 - 130 * u, V.y0 + 28 * u, 110 * u, 36 * u, 'STORE', () => { UI.panel = 'store'; }, { px: 13 * u });
    // the weapons, a column of tiles each showing what it wears
    const tw = 168 * u, th = 46 * u, cols = 2;
    SKIN_GUNS.forEach((gk, i) => { const x = x0 + (i % cols) * (tw + 8 * u), y = top + Math.floor(i / cols) * (th + 6 * u), on = gk === k, eq = STATS.equip[gk], sk = skinOfId(eq), hot = zone(x, y, tw, th, () => { SH.locker = gk; click(); });
      rr(g, x, y, tw, th, 6, on ? 'rgba(24,30,42,.96)' : 'rgba(12,16,22,.82)', on ? YOU : hot ? 'rgba(239,233,220,.5)' : 'rgba(239,233,220,.12)', on ? 2 : 1); if (sk) { g.fillStyle = sk.R.col; g.fillRect(x, y + th - 3 * u, tw, 3 * u); }
      const ic = gunIcon(gk, eq || null); if (ic) { const iw = tw * .5, ih = iw * ic.height / ic.width; g.drawImage(ic, x + tw - iw - 4 * u, y + (th - ih) / 2, iw, ih); }
      tx(g, gk === 'knife' ? 'KNIFE' : GUNS[gk].n.toUpperCase(), x + 10 * u, y + 17 * u, 12 * u, BONE, 'left', 800); tx(g, sk ? sk.L.n : 'Standard', x + 10 * u, y + 33 * u, 10 * u, sk ? sk.R.col : DIM, 'left', 700); });
    // its skins: standard, then each one you own
    const mine = STATS.skins.filter(id => skinOfId(id) && skinOfId(id).k === k), rx = x0 + cols * (tw + 8 * u) + 20 * u, rw = Math.min(360 * u, V.x1 - rx - 30 * u);
    tx(g, (k === 'knife' ? 'KNIFE' : GUNS[k].n.toUpperCase()) + '  ·  SKINS', rx, top + 8 * u, 13 * u, DIM, 'left', 900);
    let y = top + 24 * u; for (const id of [null, ...mine]) { const sk = skinOfId(id), on = (STATS.equip[k] || null) === id, h2 = 44 * u, hot = zone(rx, y, rw, h2, () => equipSkin(k, id));
      rr(g, rx, y, rw, h2, 6, on ? 'rgba(53,224,200,.14)' : 'rgba(12,16,22,.82)', on ? YOU : hot ? 'rgba(239,233,220,.5)' : 'rgba(239,233,220,.12)', on ? 2 : 1); if (sk) { g.fillStyle = sk.R.col; g.fillRect(rx, y, 4 * u, h2); }
      tx(g, sk ? sk.L.n : 'Standard', rx + 16 * u, y + 17 * u, 14 * u, BONE, 'left', 800); tx(g, sk ? sk.R.n : 'The factory finish', rx + 16 * u, y + 32 * u, 10 * u, sk ? sk.R.col : DIM, 'left', 700); if (on) tx(g, 'EQUIPPED', rx + rw - 12 * u, y + h2 / 2, 11 * u, YOU, 'right', 900); y += h2 + 6 * u; }
    if (!mine.length) para(g, 'No skins for this one yet. The store has seven new ones every three hours.', rx, y + 16 * u, rw, 12 * u, DIM);
  }
  function drawShop(g, V, W, H, u) {
    if (SH.reveal) return drawReveal(g, V, W, H, u);
    if (UI.panel === 'store') { if (SH.show) return drawShow(g, V, W, H, u); g.fillStyle = 'rgba(8,10,14,.82)'; g.fillRect(V.x0, V.y0, W, H); drawStore(g, V, W, u); }
    else { let gr = g.createLinearGradient(V.x0, 0, V.x0 + W * .62, 0); gr.addColorStop(0, 'rgba(8,10,14,.95)'); gr.addColorStop(1, 'rgba(8,10,14,.35)'); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, H); drawLocker(g, V, W, u); }
    btn(g, V.x1 - 250 * u, V.y0 + 28 * u, 110 * u, 36 * u, 'BACK', () => { UI.panel = 'home'; SH.show = null; if (UI.returnTo === 'party') { UI.returnTo = null; screen = 'party'; } }, { px: 13 * u });
  }
