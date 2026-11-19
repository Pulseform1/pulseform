  /* ---------- 96 store and locker ----------
     STORE: a new set every three hours (22-skins picks them): the Paragon of the rotation in a big featured card of its
     own, the seven others in a grid, a tile counting down to the next set (and naming the next Paragon), and a CODE box.
     Any card opens a preview: the skin on its gun, turning in 3D, with what it brings, and its reload played out (again
     at the press of a button). Buying one plays a reveal in the rarity's colour and puts it on the gun at once.
     LOCKER: every weapon, the skins you own for it (rarest first, a page at a time), and what it is wearing now. Prices
     are in coins, which matches pay (see the results screen). */
  const SH = { show: null, reveal: null, locker: 'vesper', msg: null, spin: 0, hov: null, demo: null, lpage: 0 };
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
  // text that shrinks to fit a width
  const fitTx = (g, s2, x, y, px, col, align, weight, maxW) => { g.font = `${weight} ${px}px "Chakra Petch", system-ui, sans-serif`; const w = g.measureText(s2).width; tx(g, s2, x, y, w > maxW ? px * maxW / w : px, col, align, weight); };
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
    const px = big ? 20 * u : 15 * u; fitTx(g, skinName(id).toUpperCase(), x + 14 * u, y + h - 44 * u * (big ? 1.25 : 1), px, BONE, 'left', 900, w - 28 * u);
    fitTx(g, R2.n.toUpperCase() + (sk.k === 'knife' ? '  ·  MELEE' : '  ·  ' + GUNS[sk.k].cat.toUpperCase()), x + 14 * u, y + h - 20 * u * (big ? 1.25 : 1), 11 * u, R2.col, 'left', 800, w - 96 * u);
    if (own) tx(g, 'OWNED', x + w - 14 * u, y + h - 20 * u * (big ? 1.25 : 1), 12 * u, YOU, 'right', 900); else coinTag(g, x + w - 14 * u, y + h - 20 * u * (big ? 1.25 : 1), 15 * u, skinPrice(id));
  }
  const RELOAD_FX_N = { snap: 'a flash as it seats', sparks: 'sparks and a shock ring', flame: 'a burst of flame', frost: 'ice forms on the magazine', bolt: 'lightning to the magazine', void: 'light drawn into the well', digital: 'the magazine rebuilt in pixels', runes: 'a ring of runes', gold: 'gilded glints', motes: 'spiralling light', cell: 'an energy magazine', neon: 'it flickers on like neon', forge: 'the magazine forged white-hot', rift: 'a portal, pixels, a power surge', glyph: 'circles of runes and a surge' };
  const SIG_N = { star: 'a captive star in three rings', rift: 'a tear in the air, shards circling', glyph: 'turning circles of runes', crescent: 'a crescent moon', icicles: 'glowing ice', fans: 'spinning RGB fans' };
  function featureList(sk) {
    const L = sk.L, t = sk.R.tier, gk = L.gk, f = [['Finish', t >= 5 ? 'alive: it breathes, flows and beats' : t >= 3 ? 'living, animated' : gk ? 'glowing, breathing' : 'its own paint']];
    if (t >= 1) f.push(['Parts', sk.k === 'knife' ? (KNIFE_SHAPE[sk.line] || 'standard') + ' blade' : gk && gk.sig ? SIG_N[gk.sig] : 'new parts on the gun']);
    if (gk && sk.k !== 'knife') f.push(['Glow', [gk.strips && 'energy strips', gk.rings && 'rings', gk.cell && 'energy cell', (gk.sight || gk.muzzle) && 'halos'].filter(Boolean).join(', ')]);
    if (L.rl && sk.k !== 'knife') f.push(['Reload', RELOAD_FX_N[L.rl.kind] || 'its own']);
    if (L.fx && L.fx.tracer) f.push(['Tracers', 'coloured']); if (L.fx && L.fx.idle) f.push(['Idle effect', (gk && gk.pts) || L.fx.idle]);
    if (L.emblem) f.push(['Kill banner', L.emblem.shape + ' emblem']); if (L.kill) f.push(['Kill effect', { shards: 'ice shatter', coins: 'gold burst', flame: 'flame burst', bolt: 'lightning strike', void: 'implosion', sun: 'solar flare', nova: 'supernova', rift: 'the air tears open', glyph: 'rune circle and a pillar of light' }[L.kill.kind]]);
    if (L.sound) f.push(['Sounds', t >= 5 ? 'its own kill and reload sounds' : 'its own kill sound']); return f;
  }
  function drawStore(g, V, W, u) {
    const items = dailyStore(), left = storeLeft(), hh = Math.floor(left / 3600000), mm = Math.floor(left / 60000) % 60, ss = Math.floor(left / 1000) % 60, x0 = V.x0 + 60 / pxPer() + 20 * u, top = V.y0 + 96 * u;
    tx(g, 'STORE', x0, V.y0 + 46 * u, 40 * u, BONE, 'left', 900); tx(g, `New skins in ${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, x0 + 4 * u, V.y0 + 78 * u, 13 * u, DIM, 'left', 700);
    coinTag(g, V.x1 - 386 * u, V.y0 + 46 * u, 22 * u, STATS.coins); btn(g, V.x1 - 250 * u, V.y0 + 28 * u, 110 * u, 36 * u, 'CODE', enterCode, { px: 13 * u }); btn(g, V.x1 - 130 * u, V.y0 + 28 * u, 110 * u, 36 * u, 'LOCKER', () => { UI.panel = 'locker'; SH.show = null; }, { px: 13 * u });
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
    tx(g, 'PARAGON', x + 18 * u, y + 24 * u, 13 * u, prism(t, 0, 70), 'left', 900); tx(g, '·  FEATURED', x + 92 * u, y + 24 * u, 11 * u, BONE, 'left', 800);
    rr(g, x + w - 128 * u, y + 13 * u, 112 * u, 22 * u, 11, 'rgba(0,0,0,.45)', sk.R.col + '88', 1); tx(g, 'ONE IN EVERY SET', x + w - 72 * u, y + 24 * u, 9.5 * u, sk.R.col, 'center', 800);
    const by = y + h * .72; fitTx(g, L.n.toUpperCase(), x + 18 * u, by, 34 * u, BONE, 'left', 900, w - 36 * u); tx(g, sk.k === 'knife' ? 'BLADE' : GUNS[sk.k].n.toUpperCase() + '  ·  ' + GUNS[sk.k].cat.toUpperCase(), x + 18 * u, by + 30 * u, 13 * u, L.alt, 'left', 800);
    para(g, L.blurb, x + 18 * u, by + 54 * u, w - 36 * u, 11.5 * u, '#c9cfd8');
    const hh = Math.floor(left / 3600000), mm = Math.floor(left / 60000) % 60, ss = Math.floor(left / 1000) % 60; tx(g, `LEAVES IN ${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, x + 18 * u, y + h - 22 * u, 11 * u, DIM, 'left', 800);
    if (own) tx(g, 'OWNED', x + w - 18 * u, y + h - 22 * u, 14 * u, YOU, 'right', 900); else coinTag(g, x + w - 18 * u, y + h - 22 * u, 18 * u, skinPrice(id));
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
    para(g, 'Seven new skins and a new Paragon every three hours.', x + 14 * u, y + h * .82, w - 28 * u, 10 * u, DIM);
  }
  function drawShow(g, V, W, H, u) {   // the preview panel over the turning gun
    const id = SH.show, sk = skinOfId(id); if (!sk) { SH.show = null; return; } const own = owns(id), price = skinPrice(id), L = sk.L, px = V.x1 - 430 * u, py = V.y0 + 70 * u;
    let gr = g.createLinearGradient(px - 120 * u, 0, V.x1, 0); gr.addColorStop(0, 'rgba(8,10,14,0)'); gr.addColorStop(.3, 'rgba(8,10,14,.88)'); g.fillStyle = gr; g.fillRect(px - 120 * u, V.y0, V.x1 - px + 120 * u, H);
    tx(g, sk.R.n.toUpperCase(), px, py, 13 * u, sk.R.col, 'left', 900); tx(g, L.n.toUpperCase(), px, py + 44 * u, 40 * u, BONE, 'left', 900); tx(g, sk.k === 'knife' ? 'BLADE' : GUNS[sk.k].n.toUpperCase(), px, py + 80 * u, 18 * u, '#c9cfd8', 'left', 800);
    let y = para(g, L.blurb, px, py + 112 * u, 380 * u, 14 * u, '#c9cfd8') + 16 * u;
    for (const [a, b] of featureList(sk)) { g.fillStyle = sk.R.col; g.fillRect(px, y - 5 * u, 4 * u, 10 * u); tx(g, a.toUpperCase(), px + 12 * u, y, 11 * u, DIM, 'left', 800); fitTx(g, b, px + 130 * u, y, 13 * u, BONE, 'left', 700, 250 * u); y += 24 * u; }
    const by = V.y1 - 120 * u;
    if (L.rl && sk.k !== 'knife') { const playing = SH.demo && SH.demo.id === id; btn(g, px, Math.min(y + 6 * u, by - 50 * u), 185 * u, 38 * u, playing ? 'RELOADING…' : 'WATCH THE RELOAD', () => { SH.demo = { id, t0: performance.now() }; }, { px: 12 * u, edge: sk.R.col + 'aa', off: playing }); }
    if (own) { const on = STATS.equip[sk.k] === id; btn(g, px, by, 380 * u, 60 * u, on ? 'EQUIPPED' : 'EQUIP', () => equipSkin(sk.k, on ? null : id), { on: !on, fill: YOU, solid: true, col: INK, px: 22 * u, sub: on ? 'press again to take it off' : '' }); }
    else { const can = STATS.coins >= price; btn(g, px, by, 380 * u, 60 * u, `BUY  ·  ${price}`, () => buySkin(id), { on: can, fill: sk.R.col, solid: can, col: can ? INK : BONE, px: 22 * u, sub: can ? `you have ${STATS.coins}` : `you have ${STATS.coins} · win matches to earn coins` }); }
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
    SKIN_GUNS.forEach((gk, i) => { const x = x0 + (i % cols) * (tw + 8 * u), y = top + Math.floor(i / cols) * (th + 6 * u), on = gk === k, eq = STATS.equip[gk], sk = skinOfId(eq), hot = zone(x, y, tw, th, () => { if (SH.locker !== gk) SH.lpage = 0; SH.locker = gk; click(); });
      rr(g, x, y, tw, th, 6, on ? 'rgba(24,30,42,.96)' : 'rgba(12,16,22,.82)', on ? YOU : hot ? 'rgba(239,233,220,.5)' : 'rgba(239,233,220,.12)', on ? 2 : 1); if (sk) { g.fillStyle = sk.R.col; g.fillRect(x, y + th - 3 * u, tw, 3 * u); }
      const ic = gunIcon(gk, eq || null); if (ic) { const iw = tw * .5, ih = iw * ic.height / ic.width; g.drawImage(ic, x + tw - iw - 4 * u, y + (th - ih) / 2, iw, ih); }
      tx(g, gk === 'knife' ? 'KNIFE' : GUNS[gk].n.toUpperCase(), x + 10 * u, y + 17 * u, 12 * u, BONE, 'left', 800); tx(g, sk ? sk.L.n : 'Standard', x + 10 * u, y + 33 * u, 10 * u, sk ? sk.R.col : DIM, 'left', 700); });
    // its skins: standard, then each one you own, rarest first (Paragons at the top), a page at a time
    const mine = skinSort(STATS.skins.filter(id => skinOfId(id) && skinOfId(id).k === k)), rx = x0 + cols * (tw + 8 * u) + 20 * u, rw = Math.min(360 * u, V.x1 - rx - 30 * u), t = X ? X.t : 0;
    const list = [null, ...mine], h2 = 44 * u, per = Math.max(3, Math.floor((V.y1 - 70 * u - (top + 24 * u)) / (h2 + 6 * u))), pages = Math.ceil(list.length / per); SH.lpage = cl(SH.lpage || 0, 0, pages - 1);
    tx(g, (k === 'knife' ? 'KNIFE' : GUNS[k].n.toUpperCase()) + '  ·  SKINS' + (mine.length ? `  ·  ${mine.length}` : ''), rx, top + 8 * u, 13 * u, DIM, 'left', 900);
    let y = top + 24 * u; for (const id of list.slice(SH.lpage * per, SH.lpage * per + per)) { const sk = skinOfId(id), on = (STATS.equip[k] || null) === id, par = sk && sk.R.tier >= 5, hot = zone(rx, y, rw, h2, () => equipSkin(k, id));
      rr(g, rx, y, rw, h2, 6, on ? 'rgba(53,224,200,.14)' : par ? 'rgba(20,24,16,.9)' : 'rgba(12,16,22,.82)', on ? YOU : hot ? 'rgba(239,233,220,.5)' : par ? prism(t, y) : 'rgba(239,233,220,.12)', on || par ? 2 : 1); if (sk) { g.fillStyle = par ? prism(t, y * 2) : sk.R.col; g.fillRect(rx, y, 4 * u, h2); }
      if (sk) { const ic = gunIcon(k, id); if (ic) { const iw = Math.min(110 * u, rw * .34), ih = iw * ic.height / ic.width; g.drawImage(ic, rx + rw - iw - (on ? 84 : 10) * u, y + (h2 - ih) / 2, iw, ih); } }
      tx(g, sk ? sk.L.n : 'Standard', rx + 16 * u, y + 17 * u, 14 * u, BONE, 'left', 800); tx(g, sk ? sk.R.n : 'The factory finish', rx + 16 * u, y + 32 * u, 10 * u, par ? prism(t, 40, 70) : sk ? sk.R.col : DIM, 'left', 700); if (on) tx(g, 'EQUIPPED', rx + rw - 12 * u, y + h2 / 2, 11 * u, YOU, 'right', 900); y += h2 + 6 * u; }
    if (pages > 1) { const py = V.y1 - 62 * u; btn(g, rx, py, 44 * u, 34 * u, '‹', () => { SH.lpage = Math.max(0, SH.lpage - 1); }, { px: 18 * u, off: SH.lpage === 0 }); btn(g, rx + rw - 44 * u, py, 44 * u, 34 * u, '›', () => { SH.lpage = Math.min(pages - 1, SH.lpage + 1); }, { px: 18 * u, off: SH.lpage >= pages - 1 });
      tx(g, `PAGE ${SH.lpage + 1} OF ${pages}`, rx + rw / 2, py + 17 * u, 11 * u, DIM, 'center', 800); }
    if (!mine.length) para(g, 'No skins for this one yet. The store has eight new ones every three hours, a Paragon among them.', rx, y + 16 * u, rw, 12 * u, DIM);
  }
  function drawShop(g, V, W, H, u) {
    if (SH.reveal) return drawReveal(g, V, W, H, u);
    if (UI.panel === 'store') { if (SH.show) return drawShow(g, V, W, H, u); g.fillStyle = 'rgba(8,10,14,.82)'; g.fillRect(V.x0, V.y0, W, H); drawStore(g, V, W, u); }
    else { let gr = g.createLinearGradient(V.x0, 0, V.x0 + W * .62, 0); gr.addColorStop(0, 'rgba(8,10,14,.95)'); gr.addColorStop(1, 'rgba(8,10,14,.35)'); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, H); drawLocker(g, V, W, u); }
    btn(g, V.x1 - 250 * u, V.y0 + 28 * u, 110 * u, 36 * u, 'BACK', () => { UI.panel = 'home'; SH.show = null; if (UI.returnTo === 'party') { UI.returnTo = null; screen = 'party'; } }, { px: 13 * u });
  }
