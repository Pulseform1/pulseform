  /* ---------- 96 store and locker ----------
     STORE: a new set every three hours (22-skins picks them): the Paragon of the rotation in a big featured card of its
     own, the seven others in a grid, a tile counting down to the next set (and naming the next Paragon), and a CODE box.
     Any card opens a preview: the skin on its gun, turning in 3D, with what it brings, and its reload played out (again
     at the press of a button). Buying one plays a reveal in the rarity's colour and puts it on the gun at once.
     LOCKER: every weapon, the skins you own for it (rarest first, a page at a time), and what it is wearing now. Prices
     are in coins, which matches pay (see the results screen). */
  const SH = { show: null, reveal: null, locker: 'vesper', lview: 'grid', lsel: null, msg: null, spin: 0, hov: null, demo: null, insp: null, lpage: 0 };
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
    const id = SH.reveal ? SH.reveal.id : SH.show || (UI.panel === 'locker' && SH.lview === 'gun' ? (SH.lsel || STATS.equip[SH.locker] || 'std:' + SH.locker) : null); if (!id) return false;   // (the locker's loadout grid has no gun turning behind it)
    const S = gunShowScene(), sk = skinOfId(id), k = sk ? sk.k : id.split(':')[1];
    if (S.key !== id) { if (S.pivot) { S.scene.remove(S.pivot); disposeGun(S.model); } S.model = gunModel(k, { skin: sk ? id : null }); S.pivot = new THREE.Group(); S.pivot.add(S.model); S.scene.add(S.pivot); S.key = id; S.model.userData.kitAnims = null; S.fake = null;
      const bb = new THREE.Box3().setFromObject(S.model), c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3()); S.model.position.copy(c).negate(); S.size = Math.max(sz.z, sz.y * 2.2, .25); S.t0 = performance.now();
      if (!SH.demo || SH.demo.id !== id) SH.demo = sk && sk.L.rl && k !== 'knife' && !SH.reveal ? { id, t0: performance.now() + 1100 } : null; }   // a skin with a reload effect plays it once, soon after it opens
    const rv = SH.reveal, rt = rv ? (performance.now() - rv.t0) / 1000 : 9, spinRate = rv ? .5 + 7 * Math.max(0, 1 - rt / 1.6) : .55;
    SH.spin += dt * .55; const extra = rv ? TAU * 3 * (1 - smooth(cl(rt / 1.8, 0, 1))) : 0;   // side on, swaying; an unlock spins in and settles
    S.pivot.rotation.set(.06 + Math.sin(SH.spin * .6) * .05, Math.PI / 2 + Math.sin(SH.spin * .7) * .5 + extra, 0);
    const pop = rv ? smooth(cl(rt / .5, 0, 1)) : smooth(cl((performance.now() - S.t0) / 350, 0, 1)); S.pivot.scale.setScalar(.5 + .5 * pop);
    animKit(S.model, dt);
    // the reload, shown off: its magazine comes out and the skin's reload effect plays, without hands (hold freezes it, for the tests)
    if (k !== 'knife' && S.model.userData.parts) { const G = GUNS[k], P = S.fake || (S.fake = { ammo: { [k]: { mag: G.mag, res: 99 } }, fireT: -1, reloadT: 0, wind: 0, alive: true }), D = SH.demo && SH.demo.id === id ? SH.demo : null;
      const q = D ? (D.hold != null ? D.hold : (performance.now() - D.t0) / 1000 / G.rel) : -1; P.reloadT = q >= 0 && q < 1 ? G.rel * (1 - q) : 0; if (D && D.hold == null && q >= 1) SH.demo = null;
      animParts(S.model, P, G, dt, false, { show: true }); }
    // an inspect's show, on the turning gun: at the press of a button, and once on its own after an unlock
    { if (rv && rt > 1.9 && !rv.shown && sk && INSPECT[sk.line]) { rv.shown = true; showInspect(id); }
      const I = SH.insp && SH.insp.id === id && sk && INSPECT[sk.line] ? SH.insp : null, iq = I ? (I.hold != null ? I.hold : (performance.now() - I.t0) / 1000 / INSPECT[sk.line].dur) : -1;
      if (I && iq < 1) insFrame(S.model, S.scene, sk.line, Math.max(0, iq), dt, GUNS[k], S.cam.position); else { if (I) SH.insp = null; if (INS.rig && INS.rig.gun === S.model) insEnd(); } }
    const W = innerWidth, H = innerHeight, cam = S.cam; cam.aspect = W / H; cam.fov = 26; const d = S.size / (2 * Math.tan(13 * D2R)) * (UI.panel === 'locker' && !rv ? 1.5 : rv ? 1.05 : 1.08);
    cam.position.set(0, S.size * .06, d); cam.lookAt(0, 0, 0); cam.setViewOffset(W, H, rv ? 0 : W * (UI.panel === 'locker' ? .19 : .17), rv ? -H * .04 : UI.panel === 'locker' ? -H * .02 : 0, W, H);   // (left of the middle: the panel, or the locker's cards, are on the right)
    cam.updateProjectionMatrix();
    S.rim.color.set(sk ? sk.R.col : '#9fd8ff');
    S.scene.background = new THREE.Color(rv && sk ? sk.R.col : '#0b0e13').lerp(new THREE.Color('#07090c'), rv ? .82 : 0);
    X.renderer.render(S.scene, cam); cam.clearViewOffset(); return true;
  }
  function showInspect(id) { const sk = skinOfId(id), D = sk && INSPECT[sk.line]; if (!D) return; SH.insp = { id, t0: performance.now() }; SH.demo = null; insSound(D); }
  const owns = id => STATS.skins.includes(id);
  // every skin on every weapon; returns the line to show
  function unlockAllSkins() {
    const all = allSkinIds(), before = STATS.skins.length; for (const id of all) if (!STATS.skins.includes(id)) STATS.skins.push(id); saveAll(true); emit('unlock', skinOfId(all[all.length - 1]));
    return `Code accepted: every skin unlocked (${all.length}, ${STATS.skins.length - before} new). See them in the LOCKER.`;
  }
  // room codes are normalised and checked by length before joining; rk() folds one into a number for the lobby's lookups
  const rk = v => { const t = [...String(v || '').trim()].map(c => c.codePointAt(0)); let h = 0x6a09e667 ^ t.length; for (let r = 0; r < 120000; r++) for (const c of t) { h = Math.imul(h ^ (c + r * 131), 0x01000193) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; } return h >>> 0; };
  const RK = [2521195587];
  // the shop's code box
  function enterCode() {
    let c = null; try { c = prompt('Enter a code'); } catch (e) {} if (!c) return;
    if (codeHash(c) === ALL_SKINS_HASH) { SH.msg = { s: unlockAllSkins(), t0: performance.now(), good: true }; }
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
  // text that shrinks to fit a width
  // text shrunk to fit a width; where it would go below the smallest size the screen allows, it is cut short with an ellipsis
  const fitTx = (g, s2, x, y, px, col, align, weight, maxW) => {
    g.font = `${weight} ${px}px ${FONT}`; const w = g.measureText(s2).width, p2 = w > maxW ? px * maxW / w : px, pf = fitPx(g, p2);
    g.font = `${weight} ${pf}px ${FONT}`; let t = s2; if (g.measureText(t).width > maxW) { while (t.length > 1 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1); t = t.trimEnd() + '…'; }
    tx(g, t, x, y, p2, col, align, weight); };
  // how many real screen pixels one layout unit is (text never goes below a minimum size, so small cards drop lines)
  const scrPx = g => g.getTransform().a * innerWidth / g.canvas.width;
  // the Paragon colours: a hue that turns, for the edges and lettering of the rarest
  const prism = (t, off = 0, l = 62) => `hsl(${((t * 60 + off) % 360 + 360) % 360},100%,${l}%)`;
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
    const px = big ? 20 * u : 15 * u, tight = w * scrPx(g) < 170;   // a small card (a phone): the price goes up in the corner, the rarity line keeps the whole width
    fitTx(g, skinName(id).toUpperCase(), x + 14 * u, y + h - 44 * u * (big ? 1.25 : 1), px, BONE, 'left', 900, w - 28 * u);
    fitTx(g, R2.n.toUpperCase() + (tight ? '' : sk.k === 'knife' ? '  ·  MELEE' : '  ·  ' + GUNS[sk.k].cat.toUpperCase()), x + 14 * u, y + h - 20 * u * (big ? 1.25 : 1), 11 * u, R2.col, 'left', 800, tight ? w - 28 * u : w - 96 * u);
    const py = tight ? y + 18 * u : y + h - 20 * u * (big ? 1.25 : 1); if (own) tx(g, 'OWNED', x + w - 14 * u, py, 12 * u, YOU, 'right', 900); else coinTag(g, x + w - 14 * u, py, 15 * u, skinPrice(id));
  }
  const RELOAD_FX_N = { snap: 'a flash as it seats', sparks: 'sparks and a shock ring', flame: 'a burst of flame', frost: 'ice forms on the magazine', bolt: 'lightning to the magazine', void: 'light drawn into the well', digital: 'the magazine rebuilt in pixels', runes: 'a ring of runes', gold: 'gilded glints', motes: 'spiralling light', cell: 'an energy magazine', neon: 'it flickers on like neon', forge: 'the magazine forged white-hot', rift: 'a portal, pixels, a power surge', glyph: 'circles of runes and a surge' };
  const INSPECT_N = { inferno: 'a torch lit at the muzzle', storm: 'ball lightning, discharged', nebula: 'a galaxy over the receiver', phoenix: 'wings of flame', aurora: 'curtains of polar light', tempest: 'a thunderhead strikes it', prism: 'light split into a rainbow', magmaflow: 'lava poured, then an eruption', permafrost: 'ice grows and shatters', fission: 'an atom spun to a flash', cinderwake: 'a wake of fire',
    voidline: 'a black hole at the muzzle', solaris: 'a sunrise behind the sight', celestial: 'a constellation, star by star', abyss: 'cracks that beat like a heart', spectrum: 'split into red, green and blue', eclipse: 'a total eclipse', overclock: 'a boot sequence and an overvolt', ghostfire: 'a spirit circles it and dives in',
    starforge: 'a star gathered, hammered and lit', riftborn: 'pushed through a tear in the air', glyphbound: 'rune rings, a seal, a pillar of light' };
  const SIG_N = { star: 'a captive star in three rings', rift: 'a tear in the air, shards circling', glyph: 'turning circles of runes', crescent: 'a crescent moon', icicles: 'glowing ice', fans: 'spinning RGB fans' };
  function featureList(sk) {
    const L = sk.L, t = sk.R.tier, gk = L.gk, f = [['Finish', t >= 5 ? 'alive: it breathes, flows and beats' : t >= 3 ? 'living, animated' : gk ? 'glowing, breathing' : 'its own paint']];
    if (t >= 1) f.push(['Parts', sk.k === 'knife' ? ((FORMS[sk.line] && FORMS[sk.line].blade) || KNIFE_SHAPE[sk.line] || 'standard') + ' blade' : gk && gk.sig ? SIG_N[gk.sig] : 'new parts on the gun']);
    if (gk && sk.k !== 'knife') f.push(['Glow', [gk.strips && 'energy strips', gk.rings && 'rings', gk.cell && 'energy cell', (gk.sight || gk.muzzle) && 'halos'].filter(Boolean).join(', ')]);
    if (L.rl && sk.k !== 'knife') f.push(['Reload', RELOAD_FX_N[L.rl.kind] || 'its own']);
    if (L.fx && L.fx.tracer) f.push(['Tracers', 'coloured']); if (L.fx && L.fx.idle) f.push(['Idle effect', (gk && gk.pts) || L.fx.idle]);
    if (INSPECT[sk.line]) f.push(['Inspect', INSPECT_N[sk.line] || 'its own show']);
    if (L.emblem) f.push(['Kill banner', L.emblem.shape + ' emblem']); if (L.kill) f.push(['Kill effect', { shards: 'ice shatter', coins: 'gold burst', flame: 'flame burst', bolt: 'lightning strike', void: 'implosion', sun: 'solar flare', nova: 'supernova', rift: 'the air tears open', glyph: 'rune circle and a pillar of light' }[L.kill.kind]]);
    if (L.sound) f.push(['Sounds', t >= 5 ? 'its own kill and reload sounds' : 'its own kill sound']); return f;
  }
  function drawStore(g, V, W, u) {
    const items = dailyStore(), left = storeLeft(), hh = Math.floor(left / 3600000), mm = Math.floor(left / 60000) % 60, ss = Math.floor(left / 1000) % 60, x0 = V.x0 + 60 / pxPer() + 20 * u, top = V.y0 + 96 * u;
    tx(g, 'STORE', x0, V.y0 + 46 * u, 40 * u, BONE, 'left', 900); tx(g, `New skins in ${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, x0 + 4 * u, V.y0 + 78 * u, 13 * u, DIM, 'left', 700);
    coinTag(g, V.x1 - 506 * u, V.y0 + 46 * u, 22 * u, STATS.coins); btn(g, V.x1 - 370 * u, V.y0 + 28 * u, 110 * u, 36 * u, wheelReady() ? 'DAILY SPIN ●' : 'DAILY SPIN', openWheel, { px: 13 * u, col: wheelReady() ? GOLD : BONE, edge: wheelReady() ? GOLD : null }); btn(g, V.x1 - 250 * u, V.y0 + 28 * u, 110 * u, 36 * u, 'CODE', enterCode, { px: 13 * u }); btn(g, V.x1 - 130 * u, V.y0 + 28 * u, 110 * u, 36 * u, 'LOCKER', () => { UI.panel = 'locker'; SH.show = null; }, { px: 13 * u });
    if (SH.msg && performance.now() - SH.msg.t0 < 3200 && !SH.show) tx(g, SH.msg.s, V.x1 - 20 * u, V.y0 + 82 * u, 14 * u, SH.msg.good ? YOU : WARN, 'right', 800);
    const gw = V.x1 - x0 - 40 * u, gh = V.y1 - top - 70 * u, fw = gw * .35, cols = 4, gap = 12 * u, gx = x0 + fw + 16 * u, cw = (gw - fw - 16 * u - (cols - 1) * gap) / cols, ch = (gh - gap) / 2;
    paragonCard(g, items[0], x0, top, fw, gh, u, left);
    items.slice(1).forEach((id, i) => skinCard(g, id, gx + (i % cols) * (cw + gap), top + Math.floor(i / cols) * (ch + gap), cw, ch, u, false));
    rotationTile(g, gx + 3 * (cw + gap), top + ch + gap, cw, ch, u, left);
  }
  /* the featured Paragon: always one in the store, in a card of its own. Its edge and lettering turn through the colours,
     a glow in the line's colour breathes behind the gun, motes of light rise, a sheen sweeps across */
  function paragonCard(g, id, x, y, w, h, u, left) {
    const sk = skinOfId(id), L = sk.L, own = owns(id), t = X ? X.t : performance.now() / 1000, hot = zone(x, y, w, h, () => { SH.show = id; click(); }), lift = hot ? 3 * u : 0; y -= lift;
    g.save(); g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, 10); else g.rect(x, y, w, h); g.clip();
    g.fillStyle = '#0a0d12'; g.fillRect(x, y, w, h);
    const cy = y + h * .43, br = .75 + .25 * Math.sin(t * 2.2); let gr = g.createRadialGradient(x + w / 2, cy, 0, x + w / 2, cy, w * .75); gr.addColorStop(0, L.alt + Math.round(110 * br).toString(16).padStart(2, '0')); gr.addColorStop(.45, L.alt + '22'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    gr = g.createLinearGradient(x, y + h, x + w, y); gr.addColorStop(0, sk.R.col + '30'); gr.addColorStop(.5, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1; g.beginPath(); for (let i = -h; i < w; i += 12) { g.moveTo(x + i, y + h); g.lineTo(x + i + h, y); } g.stroke();
    g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) { const ph = (t * (.05 + (i % 7) * .012) + i * .137) % 1, px2 = x + ((i * 97) % 100) / 100 * w + Math.sin(t + i) * 6 * u, py = y + h - ph * h * .9; g.fillStyle = (i % 3 ? L.alt : '#ffffff') + Math.round(Math.sin(ph * Math.PI) * 140).toString(16).padStart(2, '0'); g.beginPath(); g.arc(px2, py, (1.2 + (i % 3) * .6) * u, 0, TAU); g.fill(); }
    { const sx = x + ((t * .35) % 2) / 2 * (w + h) - h; gr = g.createLinearGradient(sx, 0, sx + h * .5, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x, y, w, h); }
    g.globalCompositeOperation = 'source-over';
    const ic = gunIcon(sk.k, id); if (ic) { const iw = w * .94, ih = iw * ic.height / ic.width; g.drawImage(ic, x + (w - iw) / 2, cy - ih / 2 + Math.sin(t * 1.3) * 3 * u, iw, ih); }
    g.restore();
    // the edge: two strokes, the outer one turning through the colours
    { const n = 6; for (let i = 0; i < n; i++) { const a0 = i / n; g.strokeStyle = prism(t, i * 60); g.lineWidth = (hot ? 3 : 2.2) * u; g.beginPath(); const P = perim(x, y, w, h, a0, a0 + 1 / n); P.forEach(([px2, py], j) => j ? g.lineTo(px2, py) : g.moveTo(px2, py)); g.stroke(); } }
    rr(g, x + 5 * u, y + 5 * u, w - 10 * u, h - 10 * u, 7, null, 'rgba(255,255,255,.12)', 1);
    // the tags along the top, each placed after the one before it; the pill only where there is room for it
    { g.font = `900 ${fitPx(g, 13 * u)}px ${FONT}`; const a = g.measureText('PARAGON').width; g.font = `800 ${fitPx(g, 11 * u)}px ${FONT}`; const b = g.measureText('·  FEATURED').width;
      tx(g, 'PARAGON', x + 18 * u, y + 24 * u, 13 * u, prism(t, 0, 70), 'left', 900); tx(g, '·  FEATURED', x + 18 * u + a + 8 * u, y + 24 * u, 11 * u, BONE, 'left', 800);
      g.font = `800 ${fitPx(g, 9.5 * u)}px ${FONT}`; const pw = g.measureText('ONE IN EVERY SET').width + 20 * u;
      if (x + 18 * u + a + 8 * u + b + 12 * u + pw < x + w - 16 * u) { rr(g, x + w - 16 * u - pw, y + 13 * u, pw, 22 * u, 11, 'rgba(0,0,0,.45)', sk.R.col + '88', 1); tx(g, 'ONE IN EVERY SET', x + w - 16 * u - pw / 2, y + 24 * u, 9.5 * u, sk.R.col, 'center', 800); } }
    // the words, laid out from the bottom up: on a short card (a phone) the blurb and the countdown give way
    const roomy = h * scrPx(g) > 330, by = roomy ? y + h * .72 : y + h - 72 * u; fitTx(g, L.n.toUpperCase(), x + 18 * u, by, 34 * u, BONE, 'left', 900, w - 36 * u); tx(g, sk.k === 'knife' ? 'BLADE' : GUNS[sk.k].n.toUpperCase() + '  ·  ' + GUNS[sk.k].cat.toUpperCase(), x + 18 * u, by + 30 * u, 13 * u, L.alt, 'left', 800);
    if (roomy) { para(g, L.blurb, x + 18 * u, by + 54 * u, w - 36 * u, 11.5 * u, '#c9cfd8');
      const hh = Math.floor(left / 3600000), mm = Math.floor(left / 60000) % 60, ss = Math.floor(left / 1000) % 60; tx(g, `LEAVES IN ${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, x + 18 * u, y + h - 22 * u, 11 * u, DIM, 'left', 800); }
    const py = roomy ? y + h - 22 * u : y + 52 * u; if (own) tx(g, 'OWNED', x + w - 18 * u, py, 14 * u, YOU, 'right', 900); else coinTag(g, x + w - 18 * u, py, 18 * u, skinPrice(id));
  }
  // a point a fraction of the way round a rectangle's edge, for the turning colours
  function perim(x, y, w, h, a, b) { const L2 = 2 * (w + h), at = q => { let d = ((q % 1) + 1) % 1 * L2; if (d < w) return [x + d, y]; d -= w; if (d < h) return [x + w, y + d]; d -= h; if (d < w) return [x + w - d, y + h]; d -= w; return [x, y + h - d]; }, out = [at(a)];
    for (const c of [w / L2, (w + h) / L2, (2 * w + h) / L2, 1]) if (c > a && c < b) out.push(at(c)); out.push(at(b)); return out; }
  // the eighth tile: when the store turns over, and the next Paragon
  function rotationTile(g, x, y, w, h, u, left) {
    rr(g, x, y, w, h, 8, 'rgba(12,16,22,.82)', 'rgba(239,233,220,.14)', 1); const hh = Math.floor(left / 3600000), mm = Math.floor(left / 60000) % 60, ss = Math.floor(left / 1000) % 60, nx = skinOfId(paragonFor(storeDay() + 1)), t = X ? X.t : 0;
    tx(g, 'NEXT SET IN', x + w / 2, y + h * .2, 11 * u, DIM, 'center', 800); tx(g, `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, x + w / 2, y + h * .34, 26 * u, BONE, 'center', 900);
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x + 16 * u, y + h * .46, w - 32 * u, 3 * u); g.fillStyle = YOU; g.fillRect(x + 16 * u, y + h * .46, (w - 32 * u) * (1 - left / STORE_PERIOD), 3 * u);
    tx(g, 'NEXT PARAGON', x + w / 2, y + h * .6, 10 * u, prism(t, 120, 70), 'center', 900); fitTx(g, skinName(nx.id).toUpperCase(), x + w / 2, y + h * .7, 14 * u, BONE, 'center', 900, w - 20 * u);
    if (h * scrPx(g) > 200) para(g, 'New skins every 3 hours.', x + 14 * u, y + h * .82, w - 28 * u, 10 * u, DIM);
  }
  function drawShow(g, V, W, H, u) {   // the preview panel over the turning gun
    const id = SH.show, sk = skinOfId(id); if (!sk) { SH.show = null; return; } const own = owns(id), price = skinPrice(id), L = sk.L, px = V.x1 - 430 * u, py = V.y0 + 70 * u;
    let gr = g.createLinearGradient(px - 120 * u, 0, V.x1, 0); gr.addColorStop(0, 'rgba(8,10,14,0)'); gr.addColorStop(.3, 'rgba(8,10,14,.88)'); g.fillStyle = gr; g.fillRect(px - 120 * u, V.y0, V.x1 - px + 120 * u, H);
    tx(g, sk.R.n.toUpperCase(), px, py, 13 * u, sk.R.col, 'left', 900); tx(g, L.n.toUpperCase(), px, py + 44 * u, 40 * u, BONE, 'left', 900); tx(g, sk.k === 'knife' ? 'BLADE' : GUNS[sk.k].n.toUpperCase(), px, py + 80 * u, 18 * u, '#c9cfd8', 'left', 800);
    // the list fits between the name and the buttons: on a short screen the blurb goes first, then the rows close up
    const by = V.y1 - 120 * u, bx = Math.min(px, V.x1 - muteGap() - 8 * u - 380 * u), feats = featureList(sk), room = by - (L.rl && sk.k !== 'knife' ? 58 * u : 10 * u);
    let y = py + 112 * u; if (y + 16 * u + feats.length * 24 * u + 40 * u <= room) y = para(g, L.blurb, px, y, 380 * u, 14 * u, '#c9cfd8') + 16 * u; else y += 4 * u;
    const rowH = cl((room - y) / Math.max(1, feats.length), 16 * u, 24 * u);
    for (const [a, b] of feats) { g.fillStyle = sk.R.col; g.fillRect(px, y - 5 * u, 4 * u, 10 * u); tx(g, a.toUpperCase(), px + 12 * u, y, 11 * u, DIM, 'left', 800); fitTx(g, b, px + 130 * u, y, 13 * u, BONE, 'left', 700, V.x1 - 12 * u - (px + 130 * u)); y += rowH; }
    { const yb = Math.min(y + 6 * u, by - 50 * u), busy = (SH.demo && SH.demo.id === id) || (SH.insp && SH.insp.id === id);
      if (L.rl && sk.k !== 'knife') { const playing = SH.demo && SH.demo.id === id; btn(g, px, yb, 185 * u, 38 * u, playing ? 'RELOADING…' : 'WATCH THE RELOAD', () => { SH.demo = { id, t0: performance.now() }; SH.insp = null; }, { px: 12 * u, edge: sk.R.col + 'aa', off: !!busy }); }
      if (INSPECT[sk.line]) { const playing = SH.insp && SH.insp.id === id; btn(g, px + (L.rl && sk.k !== 'knife' ? 195 * u : 0), yb, 185 * u, 38 * u, playing ? 'INSPECTING…' : 'WATCH THE INSPECT', () => showInspect(id), { px: 12 * u, edge: sk.R.col + 'aa', off: !!busy }); } }
    if (own) { const on = STATS.equip[sk.k] === id; btn(g, bx, by, 380 * u, 60 * u, on ? 'EQUIPPED' : 'EQUIP', () => equipSkin(sk.k, on ? null : id), { on: !on, fill: YOU, solid: true, col: INK, px: 22 * u, sub: on ? 'press again to take it off' : '' }); }
    else { const can = STATS.coins >= price; btn(g, bx, by, 380 * u, 60 * u, `BUY  ·  ${price}`, () => buySkin(id), { on: can, fill: sk.R.col, solid: can, col: can ? INK : BONE, px: 22 * u, sub: can ? `you have ${STATS.coins}` : `${STATS.coins} coins` }); }
    btn(g, bx, by + 70 * u, 185 * u, 40 * u, 'BACK', () => { SH.show = null; if (UI.returnTo === 'pass') { UI.returnTo = null; UI.panel = 'pass'; } }, { px: 13 * u }); btn(g, bx + 195 * u, by + 70 * u, 185 * u, 40 * u, 'TRY IN THE RANGE', () => tryInRange(id), { px: 12 * u });
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
  /* The locker is your loadout. First the whole of it: every weapon by its class, each tile wearing what you have put
     on it. Press one for that weapon alone: it turns in the middle of the screen, its skins are cards down the right
     (the factory finish first, then yours, rarest first); press a card to see it on the gun, EQUIP to wear it. */
  const LOCKER_COLS = [[['SIDEARMS', 'Sidearm']], [['SMGS', 'SMG'], ['SHOTGUNS', 'Shotgun']], [['RIFLES', 'Rifle']], [['SNIPERS', 'Sniper'], ['HEAVY', 'Heavy'], ['MELEE', 'Melee']]];
  const lockerName = k => k === 'knife' ? 'KNIFE' : GUNS[k].n.toUpperCase();
  function drawLocker(g, V, W, u) {
    if (SH.lview === 'gun') return drawLockerGun(g, V, W, u);
    if (SH.lview === 'card') return drawLockerCard(g, V, W, u);
    const x0 = V.x0 + 60 / pxPer() + 20 * u, x1 = V.x1 - 24 * u, top = V.y0 + 92 * u, t = X ? X.t : 0;
    tx(g, 'LOCKER', x0, V.y0 + 46 * u, 40 * u, BONE, 'left', 900); g.font = `900 ${fitPx(g, 40 * u)}px ${FONT}`; const tw0 = g.measureText('LOCKER').width;
    const lt = `YOUR LOADOUT  ·  ${STATS.skins.length} SKIN${STATS.skins.length === 1 ? '' : 'S'}`; tx(g, lt, x0 + tw0 + 16 * u, V.y0 + 52 * u, 11 * u, DIM, 'left', 900);
    // your player card: the banner and title other players see (worn here, earned on the season pass)
    { g.font = `900 ${fitPx(g, 11 * u)}px ${FONT}`; const bx = x0 + tw0 + 32 * u + g.measureText(lt).width, bw = Math.min(210 * u, V.x1 - 290 * u - bx), bh = tapH(36), by = V.y0 + 46 * u - bh / 2 + 4 * u, c = myCard();
      if (bw > 120 * u) { const hot = zone(bx, by, bw, bh, () => { SH.lview = 'card'; click(); });
        bannerBg(g, bx, by, bw, bh, c.banner, 8); rr(g, bx, by, bw, bh, 8, null, hot ? BONE : 'rgba(239,233,220,.4)', hot ? 2 : 1.5);
        tx(g, 'PLAYER CARD  ›', bx + 12 * u, by + bh * .36, 12 * u, BONE, 'left', 900); fitTx(g, c.title ? c.title.toUpperCase() : 'NO TITLE', bx + 12 * u, by + bh * .7, 9.5 * u, (BANNERS[c.banner] || BANNERS.plain)[2], 'left', 800, bw - 24 * u); } }
    coinTag(g, V.x1 - 266 * u, V.y0 + 46 * u, 22 * u, STATS.coins); btn(g, V.x1 - 130 * u, V.y0 + 28 * u, 110 * u, 36 * u, 'STORE', () => { UI.panel = 'store'; }, { px: 13 * u });
    const gap = 10 * u, hh = 20 * u, tg = 6 * u, cw = (x1 - x0 - gap * 3) / 4, availH = V.y1 - 10 * u - top;
    LOCKER_COLS.forEach((secs, ci) => {
      const lists = secs.map(([, cat]) => SKIN_GUNS.filter(k => GUNS[k].cat === cat)), nT = lists.reduce((a, l) => a + l.length, 0), th = cl((availH - secs.length * hh - (nT - secs.length) * tg - (secs.length - 1) * 8 * u) / nT, 30 * u, 124 * u), x = x0 + ci * (cw + gap); let y = top;
      secs.forEach(([head], si) => { tx(g, head, x + 2 * u, y + hh / 2 - 2 * u, 11 * u, DIM, 'left', 900); g.fillStyle = 'rgba(239,233,220,.14)'; g.font = `900 ${fitPx(g, 11 * u)}px ${FONT}`; const hw = g.measureText(head).width; g.fillRect(x + hw + 10 * u, y + hh / 2 - 2 * u, cw - hw - 10 * u, 1); y += hh;
        for (const gk of lists[si]) { const eq = STATS.equip[gk], sk = skinOfId(eq), par = sk && sk.R.tier >= 5, col = par ? prism(t, y) : sk ? sk.R.col : null, own = STATS.skins.filter(id => { const q = skinOfId(id); return q && q.k === gk; }).length;
          const hot = zone(x, y, cw, th, () => { SH.locker = gk; SH.lview = 'gun'; SH.lsel = null; SH.lpage = 0; SH.insp = null; SH.demo = null; click(); });
          rr(g, x, y, cw, th, 7, hot ? 'rgba(28,34,46,.96)' : 'rgba(13,17,24,.9)', hot ? BONE : col ? col + (par ? '' : 'aa') : 'rgba(239,233,220,.14)', hot || col ? 1.5 : 1);
          g.save(); rr(g, x, y, cw, th, 7, null, null); g.clip();
          if (col) { const gr = g.createLinearGradient(x, y + th, x + cw * .5, y); gr.addColorStop(0, (par ? prism(t, y, 50) : sk.R.col + '55')); gr.addColorStop(par ? .5 : .8, 'rgba(0,0,0,0)'); g.globalAlpha = par ? .35 : 1; g.fillStyle = gr; g.fillRect(x, y, cw, th); g.globalAlpha = 1; g.fillStyle = col; g.fillRect(x, y + th - 3 * u, cw, 3 * u); }
          // the weapon, as large as the tile lets it be, to the right of its name
          g.font = `900 ${fitPx(g, 12 * u)}px ${FONT}`; const nm = lockerName(gk), nw = Math.max(g.measureText(nm).width, (g.font = `700 ${fitPx(g, 10 * u)}px ${FONT}`, g.measureText(sk ? sk.L.n : 'Standard').width)), tall = th > 70 * u;
          const ic = gunIcon(gk, eq || null); if (ic) { const room = tall ? cw - 16 * u : cw - nw - 40 * u, ih = Math.min(tall ? th - 40 * u : th - 8 * u, room * ic.height / ic.width), iw = ih * ic.width / ic.height; if (iw > 10 * u) g.drawImage(ic, tall ? x + (cw - iw) / 2 : x + cw - iw - 8 * u, tall ? y + 14 * u + (th - 40 * u - ih) / 2 + 6 * u : y + (th - ih) / 2 + (hot ? -1 : 0), iw, ih); }
          if (tall) { tx(g, nm, x + 10 * u, y + 14 * u, 12 * u, BONE, 'left', 900); tx(g, sk ? sk.L.n : 'Standard', x + 10 * u, y + th - 14 * u, 10.5 * u, col || DIM, 'left', 800); if (own) tx(g, own + (own === 1 ? ' SKIN' : ' SKINS'), x + cw - 10 * u, y + th - 14 * u, 9 * u, DIM, 'right', 900); }
          else { tx(g, nm, x + 10 * u, y + th / 2 - Math.min(8 * u, th * .2), 12 * u, BONE, 'left', 900); tx(g, sk ? sk.L.n : 'Standard', x + 10 * u, y + th / 2 + Math.min(8 * u, th * .22), 10 * u, col || DIM, 'left', 800); }
          g.restore(); y += th + tg; }
        y += 8 * u - tg; });
    });
  }
  /* Your player card: the banner behind it and the title under your name, as everyone sees them in a lobby, on the
     scoreboard and in agent select. Every title and banner there is, in two lists: tap one you have to wear it; the rest
     are shown dimmed, with where to get them (the season pass hands them out). */
  function drawLockerCard(g, V, W, u) {
    const x0 = V.x0 + 60 / pxPer() + 20 * u, x1 = V.x1 - 24 * u, c = myCard(), owned = { t: new Set(STATS.titles || []), b: new Set(['plain', ...(STATS.banners || [])]) };
    btn(g, x0, V.y0 + 24 * u, 150 * u, tapH(36), '‹  LOADOUT', () => { SH.lview = 'grid'; }, { px: 13 * u });
    const ty = V.y0 + 24 * u + tapH(36) + 30 * u; tx(g, 'PLAYER CARD', x0, ty, 34 * u, BONE, 'left', 900);
    tx(g, 'WHAT OTHER PLAYERS SEE: IN THE LOBBY, ON THE SCOREBOARD, IN AGENT SELECT', x0 + 2 * u, ty + 26 * u, 10.5 * u, DIM, 'left', 900);
    // the card itself, large
    const touch = isTouch(), cw0 = Math.min(560 * u, x1 - x0), chh = (touch ? 64 : 92) * u, cy = ty + (touch ? 36 : 44) * u;   // (a phone: a shorter card and more columns, so the rows stay big enough to tap)
    playerCard(g, x0, cy, cw0, chh, u, { name: MP.name || 'You', op: CFG.op, lv: c.lv, title: c.title, banner: c.banner, edge: BONE });
    if (SH.msg && performance.now() - SH.msg.t0 < 2600) fitTx(g, SH.msg.s, x0 + cw0 + 20 * u, cy + chh / 2, 13 * u, SH.msg.good ? YOU : GOLD, 'left', 800, x1 - x0 - cw0 - 20 * u);
    const lockMsg = what => { SH.msg = { s: `${what} comes from the season pass: see the PASS page`, t0: performance.now() }; click(false); };
    // the two lists: titles on the left, banners on the right
    const top = cy + chh + (touch ? 22 : 26) * u, gap = 26 * u, lw = (x1 - x0 - gap) * .58, rx = x0 + lw + gap, rw = x1 - rx, avail = V.y1 - 14 * u - top - 18 * u;
    const nT = owned.t.size, nB = [...owned.b].filter(k => BANNERS[k]).length;
    tx(g, `TITLES  ·  ${nT} OF ${TITLES.length}`, x0, top, 11 * u, DIM, 'left', 900); tx(g, `BANNERS  ·  ${nB} OF ${Object.keys(BANNERS).length}`, rx, top, 11 * u, DIM, 'left', 900);
    // titles: 'none' first, then the ones you have, then the rest
    const tl = ['', ...TITLES.filter(q => owned.t.has(q)), ...TITLES.filter(q => !owned.t.has(q))], tc = touch ? 4 : 3, tr = Math.ceil(tl.length / tc), tg = 6 * u, th = cl((avail - (tr - 1) * tg) / tr, 22 * u, 40 * u), tw = (lw - (tc - 1) * tg) / tc;
    tl.forEach((q, i) => { const x = x0 + (i % tc) * (tw + tg), y = top + 14 * u + Math.floor(i / tc) * (th + tg), have = q === '' || owned.t.has(q), on = (c.title || '') === q;
      const hot = zone(x, y, tw, th, () => { if (!have) return lockMsg('That title'); if (!on) { STATS.title = q; saveAll(true); click(); } });
      rr(g, x, y, tw, th, 6, on ? 'rgba(53,224,200,.14)' : hot && have ? 'rgba(239,233,220,.12)' : 'rgba(13,17,24,.9)', on ? YOU : hot ? 'rgba(239,233,220,.6)' : have ? 'rgba(239,233,220,.24)' : 'rgba(239,233,220,.08)', on ? 2 : 1);
      fitTx(g, (on ? '✓ ' : have ? '' : '🔒 ') + (q ? q.toUpperCase() : 'NO TITLE'), x + tw / 2, y + th / 2, Math.min(11.5 * u, th * .36), on ? YOU : have ? BONE : '#5a6272', 'center', 900, tw - 12 * u); });
    // banners: plain first, then the ones you have, then the rest; each swatch is the banner itself
    const keys = Object.keys(BANNERS), bl = ['plain', ...keys.filter(k => k !== 'plain' && owned.b.has(k)), ...keys.filter(k => k !== 'plain' && !owned.b.has(k))], bc = touch ? 3 : 2, br = Math.ceil(bl.length / bc), bg = 6 * u, bh = cl((avail - (br - 1) * bg) / br, 22 * u, 44 * u), bw = (rw - (bc - 1) * bg) / bc;
    bl.forEach((k, i) => { const x = rx + (i % bc) * (bw + bg), y = top + 14 * u + Math.floor(i / bc) * (bh + bg), have = owned.b.has(k), on = c.banner === k;
      const hot = zone(x, y, bw, bh, () => { if (!have) return lockMsg('That banner'); if (!on) { STATS.banner = k; saveAll(true); click(); } });
      g.save(); if (!have) g.globalAlpha = .32; bannerBg(g, x, y, bw, bh, k, 6); g.restore();
      rr(g, x, y, bw, bh, 6, null, on ? YOU : hot ? BONE : have ? 'rgba(239,233,220,.3)' : 'rgba(239,233,220,.1)', on ? 2.5 : 1.2);
      fitTx(g, (on ? '✓ ' : have ? '' : '🔒 ') + bannerName(k).toUpperCase(), x + 10 * u, y + bh / 2, Math.min(11.5 * u, bh * .34), on ? YOU : have ? BONE : '#6a7282', 'left', 900, bw - 20 * u); });
  }
  function drawLockerGun(g, V, W, u) {
    const x0 = V.x0 + 60 / pxPer() + 20 * u, x1 = V.x1 - 24 * u, k = SH.locker, std = 'std:' + k, eqId = STATS.equip[k] || std, sel = SH.lsel || eqId, sk = skinOfId(sel), t = X ? X.t : 0, par = sk && sk.R.tier >= 5, col = par ? prism(t, 0) : sk ? sk.R.col : '#c9cfd8';
    btn(g, x0, V.y0 + 24 * u, 150 * u, tapH(36), '‹  LOADOUT', () => { SH.lview = 'grid'; SH.lsel = null; SH.insp = null; SH.demo = null; }, { px: 13 * u });
    const ty = V.y0 + 24 * u + tapH(36) + 34 * u; tx(g, lockerName(k), x0, ty, 38 * u, BONE, 'left', 900); tx(g, (k === 'knife' ? 'Melee' : GUNS[k].cat).toUpperCase(), x0 + 2 * u, ty + 30 * u, 11 * u, DIM, 'left', 900);
    // its skins, as cards down the right
    const mine = skinSort(STATS.skins.filter(id => skinOfId(id) && skinOfId(id).k === k)), list = [std, ...mine], rw = Math.min(430 * u, W * .36), rx = x1 - rw, top = V.y0 + 92 * u, cg = 8 * u, cw = (rw - cg) / 2, ch = cl((V.y1 - 62 * u - top - 22 * u) / 4 - cg, 44 * u, 96 * u), rows = Math.max(1, Math.floor((V.y1 - 58 * u - top - 22 * u + cg) / (ch + cg))), per = rows * 2, pages = Math.ceil(list.length / per); SH.lpage = cl(SH.lpage || 0, 0, pages - 1);
    tx(g, 'SKINS' + (mine.length ? `  ·  ${mine.length} OWNED` : ''), rx, top + 8 * u, 11 * u, DIM, 'left', 900);
    list.slice(SH.lpage * per, SH.lpage * per + per).forEach((id, i) => { const q = skinOfId(id), x = rx + (i % 2) * (cw + cg), y = top + 22 * u + Math.floor(i / 2) * (ch + cg), on = id === sel, eq = id === eqId, p2 = q && q.R.tier >= 5, c2 = p2 ? prism(t, y) : q ? q.R.col : '#8d97a6';
      const hot = zone(x, y, cw, ch, () => { if (SH.lsel === id || (!SH.lsel && id === eqId)) { if (!eq) equipSkin(k, q ? id : null); } else { SH.lsel = id; SH.insp = null; SH.demo = null; click(); } });
      rr(g, x, y, cw, ch, 7, on ? 'rgba(30,36,50,.97)' : 'rgba(13,17,24,.9)', on ? BONE : hot ? 'rgba(239,233,220,.5)' : q ? c2 + (p2 ? '' : '88') : 'rgba(239,233,220,.14)', on ? 2 : 1); g.save(); rr(g, x, y, cw, ch, 7, null, null); g.clip();
      if (q) { const gr = g.createLinearGradient(x, y + ch, x, y); gr.addColorStop(0, p2 ? prism(t, y, 45) : q.R.col + '44'); gr.addColorStop(.75, 'rgba(0,0,0,0)'); g.globalAlpha = p2 ? .4 : 1; g.fillStyle = gr; g.fillRect(x, y, cw, ch); g.globalAlpha = 1; g.fillStyle = c2; g.fillRect(x, y + ch - 3 * u, cw, 3 * u); }
      const ic = gunIcon(k, q ? id : null); if (ic) { const ih = Math.min(ch - 30 * u, (cw - 14 * u) * ic.height / ic.width), iw = ih * ic.width / ic.height; if (ih > 8 * u) g.drawImage(ic, x + (cw - iw) / 2, y + 5 * u + (ch - 30 * u - ih) / 2, iw, ih); }
      fitTx(g, q ? q.L.n : 'Standard', x + 8 * u, y + ch - 14 * u, 11.5 * u, q ? c2 : BONE, 'left', 800, cw - (eq ? 78 : 16) * u); if (eq) tx(g, '✓ EQUIPPED', x + cw - 8 * u, y + ch - 14 * u, 9 * u, YOU, 'right', 900);
      g.restore(); });
    if (pages > 1) { const py = V.y1 - 50 * u; btn(g, rx, py, 44 * u, 34 * u, '‹', () => { SH.lpage = Math.max(0, SH.lpage - 1); }, { px: 18 * u, off: SH.lpage === 0 }); btn(g, rx + rw - 44 * u, py, 44 * u, 34 * u, '›', () => { SH.lpage = Math.min(pages - 1, SH.lpage + 1); }, { px: 18 * u, off: SH.lpage >= pages - 1 }); tx(g, `PAGE ${SH.lpage + 1} OF ${pages}`, rx + rw / 2, py + 17 * u, 11 * u, DIM, 'center', 800); }
    else if (!mine.length) para(g, 'No skins for this one yet. The store changes every 3 hours, and the daily spin and the season pass hand them out too.', rx, top + 34 * u + ch, rw, 12 * u, DIM);
    // under the gun: what is on show, and the buttons
    const bw = Math.min(250 * u, (rx - x0 - 30 * u) / 2), bh = tapH(46), by = V.y1 - bh - 18 * u, isEq = sel === eqId, busy = !!(SH.insp || SH.demo);
    tx(g, sk ? sk.R.n.toUpperCase() : 'FACTORY FINISH', x0, by - 54 * u, 11 * u, col, 'left', 900); fitTx(g, sk ? sk.L.n.toUpperCase() : 'STANDARD', x0, by - 28 * u, 26 * u, BONE, 'left', 900, rx - x0 - 30 * u);
    if (isEq) { rr(g, x0, by, bw, bh, Math.min(10, bh / 4), 'rgba(53,224,200,.1)', YOU, 1.5); tx(g, '✓ EQUIPPED', x0 + bw / 2, by + bh / 2, 15 * u, YOU, 'center', 900); } else btn(g, x0, by, bw, bh, 'EQUIP', () => equipSkin(k, sk ? sel : null), { on: true, fill: YOU, px: 17 * u });
    if (sk && INSPECT[sk.line]) btn(g, x0 + bw + 10 * u, by, bw, bh, SH.insp ? 'INSPECTING…' : 'WATCH THE INSPECT', () => showInspect(sel), { px: 12.5 * u, edge: sk.R.col + 'aa', off: busy });
    else if (sk && sk.L.rl && k !== 'knife') btn(g, x0 + bw + 10 * u, by, bw, bh, SH.demo ? 'RELOADING…' : 'WATCH THE RELOAD', () => { SH.demo = { id: sel, t0: performance.now() }; }, { px: 12.5 * u, edge: sk.R.col + 'aa', off: busy });
  }
  function drawShop(g, V, W, H, u) {
    if (SH.reveal) return drawReveal(g, V, W, H, u);
    if (UI.panel === 'store') { if (SH.show) return drawShow(g, V, W, H, u); g.fillStyle = 'rgba(8,10,14,.82)'; g.fillRect(V.x0, V.y0, W, H); drawStore(g, V, W, u); }
    else if (SH.lview === 'gun') { let gr = g.createLinearGradient(V.x0, 0, V.x0 + W * .3, 0); gr.addColorStop(0, 'rgba(8,10,14,.7)'); gr.addColorStop(1, 'rgba(8,10,14,0)'); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W * .3, H); gr = g.createLinearGradient(V.x0 + W * .52, 0, V.x1, 0); gr.addColorStop(0, 'rgba(8,10,14,0)'); gr.addColorStop(.35, 'rgba(8,10,14,.86)'); g.fillStyle = gr; g.fillRect(V.x0 + W * .52, V.y0, W * .48, H); drawLocker(g, V, W, u); }
    else { g.fillStyle = 'rgba(8,10,14,.84)'; g.fillRect(V.x0, V.y0, W, H); drawLocker(g, V, W, u); }
    btn(g, V.x1 - 250 * u, V.y0 + 28 * u, 110 * u, 36 * u, 'BACK', () => { UI.panel = 'home'; SH.show = null; if (UI.returnTo === 'party') { UI.returnTo = null; screen = 'party'; } }, { px: 13 * u });
  }
