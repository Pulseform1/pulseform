  /* ---------- 93 after: what you see when a round ends, and when the match does ----------
     A round: the result in a band, and under it your team for that round (kills, damage, who fell), so the pause before
     the next one tells you something.
     The match: first the line-up, every operative standing in a row (your team on the left) with what each did best
     under them; then, when you click on, what the match paid: coins, XP, your level, the season pass, the challenges
     it moved and any pass rewards; and from there the full scoreboard, another match, or the menu. */
  // ---- a round's end
  function drawRoundEnd(g, V, u, demo) {
    const won = M.last.wi === 0, c = won ? YOU : FOE, W = V.x1 - V.x0, P = me();
    if (demo) { g.fillStyle = won ? 'rgba(53,224,200,.16)' : 'rgba(255,138,61,.16)'; g.fillRect(V.x0, 250 - 62 * u, W, 124 * u); tx(g, `${M.fs[M.last.wi].name.toUpperCase()} TAKES IT`, 640, 250 - 12 * u, 50 * u, c); tx(g, WHY[M.last.why].toUpperCase(), 640, 250 + 32 * u, 16 * u, BONE); return; }
    if (!M.last.t0) M.last.t0 = performance.now(); const t = (performance.now() - M.last.t0) / 1000, a = smooth(cl(t / .25, 0, 1)), k = Math.min(u, 1.2);
    // (a big moment's band, an ace or a clutch, has the same place: while it is up this sits under it, then slides back)
    const touch = isTouch(), want = SWEEP ? (touch ? 150 : 226) * u - 92 * k : 0; M.last.off = M.last.off == null ? want : lp(M.last.off, want, .18); const top = V.y0 + 92 * k + M.last.off;   // (a phone's band is slimmer, so less to clear)
    g.save(); g.globalAlpha = a;
    { const gr = g.createLinearGradient(V.x0, 0, V.x1, 0), bc = won ? '53,224,200' : '244,63,63'; gr.addColorStop(0, `rgba(${bc},0)`); gr.addColorStop(.3, `rgba(${bc},.2)`); gr.addColorStop(.7, `rgba(${bc},.2)`); gr.addColorStop(1, `rgba(${bc},0)`); g.fillStyle = 'rgba(8,10,14,.5)'; g.fillRect(V.x0, top, W, 66 * k); g.fillStyle = gr; g.fillRect(V.x0, top, W, 66 * k); g.fillStyle = c; g.fillRect(640 - 150 * k * a, top + 64 * k, 300 * k * a, 2 * k); }
    tx(g, won ? 'ROUND WON' : 'ROUND LOST', 640, top + 24 * k, 34 * k, c, 'center', 900); tx(g, `${WHY[M.last.why].toUpperCase()}   ·   ${M.wins[0]} – ${M.wins[1]}`, 640, top + 50 * k, 12 * k, BONE, 'center', 800);
    // your team this round (one against one: the two of you)
    const mine = M.fs.filter(f => f.team === P.team && !f.gone), rk = f => (f.stat.k | 0) - (f.stat.k0 | 0), rd = f => Math.max(0, Math.round((f.stat.dmg || 0) - (f.stat.d0 || 0)));
    // (a phone keeps it short: only those who did something this round, three at most, best first; nobody did: no cards)
    let list = mine.length > 1 ? mine : [P, ...M.fs.filter(f => f.team !== P.team && !f.gone)]; if (touch) list = list.filter(f => rk(f) || rd(f)).sort((x, y) => rd(y) + rk(y) * 150 - rd(x) - rk(x) * 150).slice(0, 3);
    const best = list.slice().sort((x, y) => rd(y) + rk(y) * 150 - rd(x) - rk(x) * 150)[0], n = list.length, gp = 8 * k, cw = Math.min(196 * k, (W - 60 * k) / Math.max(1, n) - gp), ch = (touch ? 46 : 54) * k, x0 = 640 - (n * (cw + gp) - gp) / 2, y = top + 74 * k;
    list.forEach((f, i) => { const x = x0 + i * (cw + gp), a2 = smooth(cl((t - .15 - i * .07) / .25, 0, 1)), col = f.team === P.team ? YOU : FOE, top2 = f === best && (rk(f) || rd(f)) && n > 1; g.save(); g.globalAlpha = a * a2; g.translate(0, (1 - a2) * 10 * k);
      rr(g, x, y, cw, ch, 6, 'rgba(10,13,18,.86)', top2 ? GOLD : f === P ? 'rgba(239,233,220,.5)' : 'rgba(239,233,220,.14)', top2 ? 1.5 : 1); g.fillStyle = col; g.fillRect(x, y, 3 * k, ch);
      portraitTile(g, f.op, x + 7 * k, y + 5 * k, ch - 10 * k, ch - 10 * k, { r: 4, dead: !f.alive }); const nx = x + ch + 2 * k, room = cw - ch - 8 * k;
      fitTx(g, f.name.toUpperCase(), nx, y + ch * .3, 12 * k, f === P ? YOU : BONE, 'left', 900, room - (top2 ? 34 * k : 0)); if (top2) tx(g, 'BEST', x + cw - 7 * k, y + ch * .3, 9 * k, GOLD, 'right', 900);
      if (cw * scrPx(g) < 150) fitTx(g, `${rk(f)} K  ·  ${rd(f)} DMG`, nx, y + ch * .69, 11 * k, BONE, 'left', 800, room);   // (a small card: one line)
      else { tx(g, String(rk(f)), nx, y + ch * .69, 17 * k, BONE, 'left', 900); g.font = `900 ${fitPx(g, 17 * k)}px ${FONT}`; const kw = g.measureText(String(rk(f))).width; tx(g, rk(f) === 1 ? 'KILL' : 'KILLS', nx + kw + 4 * k, y + ch * .72, 8.5 * k, DIM, 'left', 900);
        tx(g, String(rd(f)), x + cw - 30 * k, y + ch * .69, 14 * k, BONE, 'right', 800); tx(g, 'DMG', x + cw - 7 * k, y + ch * .72, 8.5 * k, DIM, 'right', 900); }
      g.restore(); });
    g.restore();
  }
  // ---- the line-up: every operative as a picture on a tall card, with what they did best on a plate under it
  /* Each picture is rendered once, off the screen: the operative (holding the gun they ended on, in its skin) in a little
     studio of its own, a warm key light, a cool fill and two rim lights in their colour, drawn at twice the size and
     shrunk, so the edges are smooth whatever the screen's own quality setting. The background is left clear, so the
     card's colours show round them. Kept (by operative, gun and skin) for the rest of the visit. */
  const HERO = { W: 360, H: 720, SS: 2 };
  function heroStudio() {
    if (X.hs) return X.hs; const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(20, HERO.W / HERO.H, .1, 60);
    scene.add(new THREE.HemisphereLight('#e8eeff', '#2a2420', .6));
    const key = new THREE.DirectionalLight('#fff0dc', 1.4); key.position.set(-2.2, 3.4, 4.2); scene.add(key, key.target);
    const fill = new THREE.DirectionalLight('#a9c8ff', .38); fill.position.set(3.2, 1.2, 3); scene.add(fill, fill.target);
    const rimL = new THREE.DirectionalLight('#ffffff', 1.7), rimR = new THREE.DirectionalLight('#ffffff', 1.7); rimL.position.set(-2.8, 2.6, -3); rimR.position.set(2.8, 2.6, -3); scene.add(rimL, rimL.target, rimR, rimR.target);
    const w = HERO.W * HERO.SS, h = HERO.H * HERO.SS, rt = new THREE.WebGLRenderTarget(w, h, { format: THREE.RGBAFormat }); rt.texture.encoding = THREE.sRGBEncoding;
    const big = document.createElement('canvas'); big.width = w; big.height = h;
    return X.hs = { scene, cam, rimL, rimR, rt, buf: new Uint8Array(w * h * 4), big, bg: big.getContext('2d'), img: big.getContext('2d').createImageData(w, h) };
  }
  const heroGun = f => f.guns[1] || f.guns[2] || 'pip';
  const heroKey = f => { const g1 = heroGun(f); return f.op + '|' + g1 + '|' + ((f.skins && f.skins[g1]) || ''); };
  const heroArt = f => (X && X.heroes && X.heroes.get(heroKey(f))) || null;
  function heroRender(f) {
    const key = heroKey(f); X.heroes = X.heroes || new Map(); if (X.heroes.has(key)) return X.heroes.get(key);
    const S = heroStudio(), g1 = heroGun(f), G = GUNS[g1] || GUNS.pip, k = fighter({ op: f.op, key: 'hero', name: '', team: M ? me().team : 0 });
    k.guns = { 1: G.slot === 1 ? g1 : null, 2: G.slot === 2 ? g1 : 'pip', 3: 'knife' }; k.slot = G.slot === 1 ? 1 : 2; k.skins = Object.assign({}, f.skins || {});
    Object.assign(k, { x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, vx: 0, vz: 0, pitch: -.03, alive: true, walkT: 0, crouch: 0, yaw: yawTo(0, 0, 1.3, 6) });
    for (let i = 0; i < 14; i++) updateAgent(k, .05);   // (settled into its stance)
    const A = X.agents.get(k); let c = null;
    if (A) {
      if (A.parent) A.parent.remove(A); S.scene.add(A); A.visible = true; A.position.set(0, 0, 0); A.scale.setScalar(1); A.updateMatrixWorld(true);
      const col = (OPS[f.op] || OPS.vex).col; S.rimL.color.set(col); S.rimR.color.set(col).lerp(new THREE.Color('#ffffff'), .45);
      // framed on the whole figure, gun and all, feet near the bottom
      const bb = new THREE.Box3().setFromObject(A), sz = bb.getSize(new THREE.Vector3()), cx = (bb.min.x + bb.max.x) / 2, hv = Math.max(sz.y * 1.1, sz.x * 1.16 / (HERO.W / HERO.H)), D = hv / 2 / Math.tan(10 * D2R), cy = bb.min.y + hv / 2 - sz.y * .035;
      S.cam.position.set(cx, cy + .05, D); S.cam.lookAt(cx, cy, 0); S.cam.updateProjectionMatrix();
      const R2 = X.renderer, prev = { rt: R2.getRenderTarget(), col: R2.getClearColor(new THREE.Color()).clone(), a: R2.getClearAlpha() }, w = S.rt.width, h = S.rt.height;
      R2.setRenderTarget(S.rt); R2.setClearColor(0x000000, 0); R2.clear(); R2.render(S.scene, S.cam); R2.readRenderTargetPixels(S.rt, 0, 0, w, h, S.buf);
      R2.setRenderTarget(prev.rt); R2.setClearColor(prev.col, prev.a);
      for (let y = 0; y < h; y++) S.img.data.set(S.buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);   // (the target is bottom-up)
      S.bg.putImageData(S.img, 0, 0); c = document.createElement('canvas'); c.width = HERO.W; c.height = HERO.H; const cg = c.getContext('2d'); cg.imageSmoothingQuality = 'high'; cg.drawImage(S.big, 0, 0, HERO.W, HERO.H);
      S.scene.remove(A); if (A.userData.ownM) for (const m of new Set(A.userData.ownM.values())) m.dispose(); const gh = A.userData.gunHold; (function drop(o) { if (o === gh) return; if (o.geometry) o.geometry.dispose(); o.children.forEach(drop); })(A);   // (its body's own shapes; a gun's may be shared)
    }
    X.agents.delete(k); X.heroes.set(key, c); return c;
  }
  // one picture a frame while the line-up is up (so it never stalls), and the screen behind it cleared to the stage's dark
  function heroWork() {
    const f = M && M.fs.find(q => !q.gone && !(X.heroes && X.heroes.has(heroKey(q)))); if (f) { try { heroRender(f); } catch (e) { (X.heroes = X.heroes || new Map()).set(heroKey(f), null); } }
    X.renderer.setRenderTarget(null); X.renderer.setClearColor('#090c11', 1); X.renderer.clear(); return true;
  }
  // a card: the operative's colour rising from the floor of it, slanted bands, their name large and faint up the side, the picture
  function heroCard(g, f, x, y, w, h, u, a, edge, ew) {
    const O = OPS[f.op] || OPS.vex, c = heroArt(f); g.save(); rr(g, x, y, w, h, 8, null, null); g.clip();
    g.fillStyle = '#0d1118'; g.fillRect(x, y, w, h);
    { const gr = g.createRadialGradient(x + w / 2, y + h * .78, w * .05, x + w / 2, y + h * .72, h * .62); gr.addColorStop(0, O.col + '99'); gr.addColorStop(.45, O.col + '33'); gr.addColorStop(1, O.col + '00'); g.fillStyle = gr; g.fillRect(x, y, w, h); }
    g.globalAlpha = .07; g.fillStyle = O.col; for (let i = -2; i < 6; i++) { const bx = x + i * w * .34; g.beginPath(); g.moveTo(bx, y + h); g.lineTo(bx + h * .5, y); g.lineTo(bx + h * .5 + w * .12, y); g.lineTo(bx + w * .12, y + h); g.closePath(); g.fill(); } g.globalAlpha = 1;
    { g.save(); g.translate(x + w * .16, y + h * .97); g.rotate(-Math.PI / 2); const px = Math.min(w * .3, 120 * u); g.font = `900 ${px}px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = O.col; g.globalAlpha = .16; g.fillText(O.n.toUpperCase(), 0, 0); g.restore(); }
    if (c) { const k = Math.min(w * 1.02 / c.width, h * .98 / c.height), dw = c.width * k, dh = c.height * k, rise = (1 - a) * 18 * u; g.globalAlpha = a; g.drawImage(c, x + (w - dw) / 2, y + h - dh + rise, dw, dh); g.globalAlpha = 1; }
    else portraitTile(g, f.op, x + w * .2, y + h * .35, w * .6, w * .6, { r: 6 });   // (until its picture is ready)
    { const gr = g.createLinearGradient(0, y + h * .74, 0, y + h); gr.addColorStop(0, 'rgba(9,12,17,0)'); gr.addColorStop(1, 'rgba(9,12,17,.8)'); g.fillStyle = gr; g.fillRect(x, y + h * .74, w, h * .26); }
    g.restore();
    rr(g, x, y, w, h, 8, null, edge, ew); g.fillStyle = f.team === me().team ? YOU : FOE; g.fillRect(x + 6, y, w - 12, 3 * u);
  }
  const overNext = () => { M.overStage = (M.overStage | 0) + 1; M.overT = performance.now(); click(); };
  function drawLineup(g) {
    const V = K.view, W = V.x1 - V.x0, H = V.y1 - V.y0, u = uiScale(), P = me(), won = M.over.won, t = (performance.now() - (M.overT || 0)) / 1000;
    { const gr = g.createRadialGradient(640, V.y0 + H * .55, 40 * u, 640, V.y0 + H * .55, W * .7); gr.addColorStop(0, won ? 'rgba(53,224,200,.10)' : 'rgba(244,63,63,.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, H); }
    const hy = V.y0 + Math.min(58 * u, H * .09); tx(g, won ? 'VICTORY' : 'DEFEAT', 640, hy, Math.min(56 * u, H * .09), won ? YOU : FOE, 'center', 900); tx(g, `${M.wins[0]}  –  ${M.wins[1]}`, 640, hy + Math.min(44 * u, H * .068), Math.min(24 * u, H * .04), BONE, 'center', 900);
    if (M.over.why === 'left') tx(g, M.fs.length > 2 ? 'The other team left the match' : 'Your rival left the match', 640, hy + Math.min(44 * u, H * .068) + 18 * u, 11 * u, DIM);
    if (!M.awards) M.awards = matchAwards(M.fs, won ? P.team : 1 - P.team);
    // the cards: your team on the left (best nearest the middle), the rivals on the right; plates under them, then CONTINUE
    { const by = (a, b) => csOf(b) - csOf(a), mine = M.fs.filter(f => f.team === P.team && !f.gone).sort(by).reverse(), theirs = M.fs.filter(f => f.team !== P.team && !f.gone).sort(by), order = [...mine, ...theirs], n = order.length;
      const bh0 = tapH(44), lh = Math.max(19 * u, 13.5 / pxPer()), plateH = 4 * lh + 10 * u, top = hy + Math.min(44 * u, H * .068) + Math.min(24 * u, H * .035), bot = V.y1 - bh0 - 20 * u - plateH - 8 * u, gap = 8 * u, tg = n > 2 ? 34 * u : 24 * u;
      const ch = Math.max(60 * u, bot - top), cw = Math.min(ch * .52, 200 * u, (W - 40 * u - tg - (n - 2) * gap) / n), total = n * cw + (n - 2) * gap + tg, x0 = 640 - total / 2, tiny = cw < 104 * u, px = Math.min(13 * u, cw * .13);
      UI.lu = [];
      order.forEach((f, i) => { const x = x0 + i * (cw + gap) + (i >= mine.length ? tg - gap : 0), a = smooth(cl((t - .1 - i * .08) / .35, 0, 1)), A = M.awards.get(f.key) || { title: '', line: '' }, col = f.team === P.team ? YOU : FOE, c = cardOf(f);
        UI.lu.push({ k: f.key, x, y: top, w: cw, h: ch, art: !!heroArt(f) });
        g.save(); g.globalAlpha = a; g.translate(0, (1 - a) * 16 * u);
        heroCard(g, f, x, top, cw, ch, u, smooth(cl((t - .25 - i * .08) / .4, 0, 1)), A.top ? GOLD : f === P ? 'rgba(239,233,220,.6)' : 'rgba(239,233,220,.16)', A.top ? 2.5 : 1);
        // the plate: name, award, what earned it, then level and kills / deaths
        const y = top + ch + 8 * u, room = V.y1 - bh0 - 18 * u - y, rows = room >= lh * 4 + 10 * u ? 4 : room >= lh * 3 + 10 * u ? 3 : 2, ph = rows * lh + 10 * u;
        if (room >= lh * 2 + 10 * u) { rr(g, x, y, cw, ph, 6, 'rgba(10,13,18,.92)', A.top ? GOLD : f === P ? 'rgba(239,233,220,.55)' : 'rgba(239,233,220,.16)', A.top ? 2 : 1); g.fillStyle = col; g.fillRect(x, y, cw, 3 * u);
          const mx = x + cw / 2; let ly = y + 6 * u + lh / 2; fitTx(g, f.name.toUpperCase(), mx, ly, px, f === P ? YOU : BONE, 'center', 900, cw - 10 * u); ly += lh;
          fitTx(g, (A.top ? '★ ' : '') + A.title, mx, ly, px, A.top ? GOLD : '#dfe6ee', 'center', 900, cw - 8 * u); ly += lh;
          if (rows >= 3) { fitTx(g, A.line, mx, ly, Math.min(10.5 * u, cw * .1), DIM, 'center', 800, cw - 8 * u); ly += lh; }
          if (rows >= 4) { const kd = `${f.stat.k} / ${f.stat.d}`; if (c.lv && !tiny) { tx(g, 'LV ' + c.lv, x + 9 * u, ly, 10.5 * u, lvCol(c.lv), 'left', 900); tx(g, kd, x + cw - 9 * u, ly, 11 * u, BONE, 'right', 800); } else tx(g, kd, mx, ly, 11 * u, BONE, 'center', 800); } }
        g.restore(); }); }
    // on, when you are ready (anywhere on the screen, once the line-up has settled)
    if (t > .7) zone(V.x0, V.y0, W, H, overNext);
    const bw = 220 * u, bh = tapH(44); btn(g, 640 - bw / 2, V.y1 - bh - 10 * u, bw, bh, 'CONTINUE', overNext, { on: true, fill: FOE, px: 16 * u });
  }
  // ---- what the match paid
  function drawRewards(g) {
    const V = K.view, W = V.x1 - V.x0, H = V.y1 - V.y0, u = uiScale(), won = M.over.won, R = M.prog, t = (performance.now() - (M.overT || 0)) / 1000, e = smooth(cl((t - .3) / 1.6, 0, 1));
    g.fillStyle = 'rgba(8,11,16,.86)'; g.fillRect(V.x0, V.y0, W, H);
    const top = V.y0 + 18 * u; tx(g, 'MATCH REWARDS', 640, top + 20 * u, 30 * u, BONE, 'center', 900); tx(g, `${won ? 'VICTORY' : 'DEFEAT'}   ·   ${M.wins[0]} – ${M.wins[1]}`, 640, top + 48 * u, 13 * u, won ? YOU : FOE, 'center', 900);
    const bh = tapH(46), y0 = top + 70 * u, y1 = V.y1 - bh - 26 * u, gp = 14 * u, cw = Math.min(330 * u, (W - 40 * u - gp * 2) / 3), x0 = 640 - (cw * 3 + gp * 2) / 2, ph = y1 - y0;
    const panel = (i, head, col) => { const x = x0 + i * (cw + gp); rr(g, x, y0, cw, ph, 10, 'rgba(14,18,26,.94)', 'rgba(239,233,220,.14)', 1.5); tx(g, head, x + 14 * u, y0 + 20 * u, 12 * u, col, 'left', 900); return x; };
    const rowsIn = (x, rows, yA, yB, tot) => { const rh = cl((yB - yA) / Math.max(1, rows.length), 13 * u, 22 * u), n = Math.floor((yB - yA) / rh); rows.slice(0, n).forEach(([a, b], i) => { const y = yA + i * rh + rh / 2, a2 = cl((t - .2 - i * .1) / .25, 0, 1); g.save(); g.globalAlpha = a2; fitTx(g, a, x + 14 * u, y, Math.min(12 * u, rh * .62), '#c9cfd8', 'left', 700, cw - 84 * u); tx(g, (b >= 0 ? '+' : '') + b, x + cw - 14 * u, y, Math.min(12 * u, rh * .62), b >= 0 ? BONE : WARN, 'right', 800); g.restore(); }); };
    // coins
    { const x = panel(0, 'COINS', COIN), P2 = M.pay || { rows: [], total: 0 }; coinTag(g, x + cw - 14 * u, y0 + 54 * u, 30 * u, '+' + Math.round(P2.total * e)); rowsIn(x, P2.rows, y0 + 84 * u, y1 - 34 * u);
      tx(g, 'YOU HAVE', x + 14 * u, y1 - 18 * u, 10 * u, DIM, 'left', 900); coinTag(g, x + cw - 14 * u, y1 - 18 * u, 15 * u, STATS.coins); }
    // XP and your level
    { const x = panel(1, 'XP', YOU), now = lp(R.acct[0], R.acct[1], e), L = levelOf(Math.round(now)), up = L.l > R.level[0].l; tx(g, '+' + Math.round(R.xp.total * e), x + cw - 14 * u, y0 + 54 * u, 30 * u, YOU, 'right', 800);
      if (L.l > (R.lvShown || R.level[0].l)) { R.lvShown = L.l; R.lvT = performance.now(); emit('levelUp'); }
      rowsIn(x, R.xp.rows, y0 + 84 * u, y1 - 72 * u);
      const ly = y1 - 52 * u, fl = R.lvT ? cl(1 - (performance.now() - R.lvT) / 900, 0, 1) : 0; lvChip(g, x + 14 * u, ly, L.l, 13 * u); if (up) tx(g, 'LEVEL UP', x + cw - 14 * u, ly, (12 + 4 * fl) * u, GOLD, 'right', 900); else tx(g, 'LEVEL', x + cw - 14 * u, ly, 10 * u, DIM, 'right', 900);
      g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x + 14 * u, ly + 18 * u, cw - 28 * u, 7 * u); g.fillStyle = fl > 0 ? GOLD : lvCol(L.l); g.fillRect(x + 14 * u, ly + 18 * u, (cw - 28 * u) * L.into / L.need, 7 * u);
      tx(g, `${L.into} / ${L.need} XP`, x + cw - 14 * u, ly + 37 * u, 10 * u, DIM, 'right', 800); }
    // the season pass, its rewards, the challenges
    { const S = seasonNow(), x = panel(2, `SEASON ${S.n} PASS`, GOLD), px = lp(R.pass.xp0, R.pass.xp1, e), tier = Math.min(PASS_TIERS, Math.floor(px / PASS_XP)), into = tier >= PASS_TIERS ? PASS_XP : px % PASS_XP;
      tx(g, 'TIER ' + tier, x + cw - 14 * u, y0 + 20 * u, 12 * u, BONE, 'right', 900); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x + 14 * u, y0 + 38 * u, cw - 28 * u, 7 * u); g.fillStyle = GOLD; g.fillRect(x + 14 * u, y0 + 38 * u, (cw - 28 * u) * into / PASS_XP, 7 * u);
      tx(g, tier >= PASS_TIERS ? 'COMPLETE' : `${Math.round(into)} / ${PASS_XP} XP TO TIER ${tier + 1}`, x + cw - 14 * u, y0 + 56 * u, 10 * u, DIM, 'right', 800);
      let y = y0 + 72 * u; const got = R.got.filter(q => q.tier <= tier || e >= 1);
      if (R.got.length) { tx(g, 'UNLOCKED', x + 14 * u, y + 6 * u, 10 * u, GOLD, 'left', 900); y += 16 * u; const n = Math.min(R.got.length, 4), tw = (cw - 28 * u - (n - 1) * 6 * u) / n, th = Math.min(74 * u, (y1 - y) * .42);
        R.got.slice(0, n).forEach((q, i) => { const on = got.includes(q); g.save(); g.globalAlpha = on ? 1 : .25; rewardTile(g, q.rw, x + 14 * u + i * (tw + 6 * u), y, tw, th, u, on ? 'got' : 'far'); g.restore(); }); y += th + 6 * u;
        if (R.got.length > n) { tx(g, `+ ${R.got.length - n} more, on the PASS page`, x + 14 * u, y + 6 * u, 10 * u, DIM, 'left', 800); y += 16 * u; } y += 4 * u; }
      const mv = R.ch.moved; if (mv.length && y + 44 * u < y1) { tx(g, 'CHALLENGES', x + 14 * u, y + 6 * u, 10 * u, DIM, 'left', 900); y += 16 * u; const rh = cl((y1 - 10 * u - y) / Math.min(mv.length, 4) - 5 * u, 24 * u, 40 * u), n = Math.max(0, Math.floor((y1 - 6 * u - y) / (rh + 5 * u)));
        mv.slice().sort((a, b) => (b.at >= b.n) - (a.at >= a.n)).slice(0, n).forEach((c, i) => challengeRow(g, c, x + 10 * u, y + i * (rh + 5 * u), cw - 20 * u, rh, u, lp(c.from, c.at, e))); }
      else if (!R.got.length && !mv.length) para(g, 'Challenges and pass rewards are on the PASS page.', x + 14 * u, y + 14 * u, cw - 28 * u, 11 * u, DIM); }
    const bw = Math.min(210 * u, (W - 60 * u) / 3 - 10 * u), by = V.y1 - bh - 12 * u;
    btn(g, 640 - bw * 1.5 - 10 * u, by, bw, bh, M.online ? 'BACK TO THE ROOM' : 'PLAY AGAIN', () => { if (M.online) { toMenu(); openParty(); } else play(soloOpts()); }, { on: true, fill: FOE, px: 16 * u });
    btn(g, 640 - bw / 2, by, bw, bh, 'SCOREBOARD', overNext, { px: 16 * u }); btn(g, 640 + bw / 2 + 10 * u, by, bw, bh, 'MENU', toMenu, { px: 16 * u });
  }
