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
    const want = SWEEP ? 226 * u - 92 * k : 0; M.last.off = M.last.off == null ? want : lp(M.last.off, want, .18); const top = V.y0 + 92 * k + M.last.off;
    g.save(); g.globalAlpha = a;
    { const gr = g.createLinearGradient(V.x0, 0, V.x1, 0), bc = won ? '53,224,200' : '244,63,63'; gr.addColorStop(0, `rgba(${bc},0)`); gr.addColorStop(.3, `rgba(${bc},.2)`); gr.addColorStop(.7, `rgba(${bc},.2)`); gr.addColorStop(1, `rgba(${bc},0)`); g.fillStyle = 'rgba(8,10,14,.5)'; g.fillRect(V.x0, top, W, 66 * k); g.fillStyle = gr; g.fillRect(V.x0, top, W, 66 * k); g.fillStyle = c; g.fillRect(640 - 150 * k * a, top + 64 * k, 300 * k * a, 2 * k); }
    tx(g, won ? 'ROUND WON' : 'ROUND LOST', 640, top + 24 * k, 34 * k, c, 'center', 900); tx(g, `${WHY[M.last.why].toUpperCase()}   ·   ${M.wins[0]} – ${M.wins[1]}`, 640, top + 50 * k, 12 * k, BONE, 'center', 800);
    // your team this round (one against one: the two of you)
    const mine = M.fs.filter(f => f.team === P.team && !f.gone), list = mine.length > 1 ? mine : [P, ...M.fs.filter(f => f.team !== P.team && !f.gone)], rk = f => (f.stat.k | 0) - (f.stat.k0 | 0), rd = f => Math.max(0, Math.round((f.stat.dmg || 0) - (f.stat.d0 || 0)));
    const best = list.slice().sort((x, y) => rd(y) + rk(y) * 150 - rd(x) - rk(x) * 150)[0], n = list.length, gp = 8 * k, cw = Math.min(196 * k, (W - 60 * k) / n - gp), ch = 54 * k, x0 = 640 - (n * (cw + gp) - gp) / 2, y = top + 74 * k;
    list.forEach((f, i) => { const x = x0 + i * (cw + gp), a2 = smooth(cl((t - .15 - i * .07) / .25, 0, 1)), col = f.team === P.team ? YOU : FOE, top2 = f === best && (rk(f) || rd(f)) && n > 1; g.save(); g.globalAlpha = a * a2; g.translate(0, (1 - a2) * 10 * k);
      rr(g, x, y, cw, ch, 6, 'rgba(10,13,18,.86)', top2 ? GOLD : f === P ? 'rgba(239,233,220,.5)' : 'rgba(239,233,220,.14)', top2 ? 1.5 : 1); g.fillStyle = col; g.fillRect(x, y, 3 * k, ch);
      portraitTile(g, f.op, x + 7 * k, y + 5 * k, ch - 10 * k, ch - 10 * k, { r: 4, dead: !f.alive }); const nx = x + ch + 2 * k, room = cw - ch - 8 * k;
      fitTx(g, f.name.toUpperCase(), nx, y + 16 * k, 12 * k, f === P ? YOU : BONE, 'left', 900, room - (top2 ? 34 * k : 0)); if (top2) tx(g, 'BEST', x + cw - 7 * k, y + 16 * k, 9 * k, GOLD, 'right', 900);
      if (cw * scrPx(g) < 150) fitTx(g, `${rk(f)} K  ·  ${rd(f)} DMG`, nx, y + 37 * k, 11 * k, BONE, 'left', 800, room);   // (a small card: one line)
      else { tx(g, String(rk(f)), nx, y + 37 * k, 17 * k, BONE, 'left', 900); g.font = `900 ${fitPx(g, 17 * k)}px ${FONT}`; const kw = g.measureText(String(rk(f))).width; tx(g, rk(f) === 1 ? 'KILL' : 'KILLS', nx + kw + 4 * k, y + 39 * k, 8.5 * k, DIM, 'left', 900);
        tx(g, String(rd(f)), x + cw - 30 * k, y + 37 * k, 14 * k, BONE, 'right', 800); tx(g, 'DMG', x + cw - 7 * k, y + 39 * k, 8.5 * k, DIM, 'right', 900); }
      g.restore(); });
    g.restore();
  }
  // ---- the line-up
  function lineupScene() {
    if (X.lu) return X.lu; const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(24, 1, .1, 80); scene.background = new THREE.Color('#0a0d12');
    scene.add(new THREE.HemisphereLight('#e6ecff', '#2a2622', .75));
    const key = new THREE.DirectionalLight('#fff1dc', 1.25); key.position.set(-2.5, 5, 6); scene.add(key, key.target);
    const fill = new THREE.DirectionalLight('#9fc4ff', .35); fill.position.set(3, 2, 4); scene.add(fill, fill.target);
    const la = new THREE.PointLight(YOU, 2.2, 14), lb = new THREE.PointLight(FOE, 2.2, 14); la.position.set(-3.2, 2.4, -2.6); lb.position.set(3.2, 2.4, -2.6); scene.add(la, lb);
    // the floor: a dark stage that falls away into the backdrop, a line of light along the row
    { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, '#2a3140'); gr.addColorStop(.55, '#151a22'); gr.addColorStop(1, '#0a0d12'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) })); fl.rotation.x = -Math.PI / 2; scene.add(fl); }
    return X.lu = { scene, cam, la, lb, fakes: [], M: null, pts: [] };
  }
  function lineupEnd() { const S = X && X.lu; if (!S) return; for (const k of S.fakes) { const A = X.agents.get(k); if (A) { if (A.parent) A.parent.remove(A); if (A.userData.ownM) for (const m of new Set(A.userData.ownM.values())) m.dispose(); X.agents.delete(k); } } S.fakes = []; S.M = null; S.pts = []; }
  function renderLineup(dt) {
    const S = lineupScene(), P = me(), cam = S.cam;
    if (S.M !== M) { lineupEnd(); S.M = M; S.t0 = performance.now();
      // your team on the left, best in the middle of the screen; the rivals on the right, best nearest the middle
      const by = (a, b) => csOf(b) - csOf(a), mine = M.fs.filter(f => f.team === P.team && !f.gone).sort(by).reverse(), theirs = M.fs.filter(f => f.team !== P.team && !f.gone).sort(by);
      S.order = [...mine, ...theirs]; S.nMine = mine.length;
      S.fakes = S.order.map((f, i) => { const k = fighter({ op: f.op, key: 'lu' + i, name: f.name, team: P.team }), g1 = f.guns[1] || null; k.guns = { 1: g1, 2: f.guns[2] || 'pip', 3: 'knife' }; k.slot = g1 ? 1 : 2; k.skins = f.skins || {}; k.src = f; return k; }); }
    const n = S.fakes.length, asp = innerWidth / innerHeight, gap = n > 2 ? .7 : .5, Hv = Math.max(n <= 4 ? 4 : 5.2, ((n - 1) * .74 + gap + 1.5) / asp), Wv = Hv * asp, sp = Math.min(1.05, (Wv - 1.5 - gap) / Math.max(1, n - 1)), D = Hv / 2 / Math.tan(12 * D2R), t = (performance.now() - S.t0) / 1000;
    cam.aspect = asp; cam.fov = 24; cam.position.set(0, 1.25, D); cam.lookAt(0, Hv * .115, 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const total = (n - 1) * sp + gap; S.pts = [];
    S.fakes.forEach((k, i) => { const x = -total / 2 + i * sp + (i >= S.nMine ? gap : 0), pop = smooth(cl((t - .1 - i * .09) / .35, 0, 1));
      Object.assign(k, { x, y: 0, z: 0, px: x, py: 0, pz: 0, vx: 0, vz: 0, yaw: yawTo(x, 0, x * .55, D), pitch: 0, alive: true, walkT: 0, crouch: 0 });
      updateAgent(k, dt); const A = X.agents.get(k); if (!A) return; if (A.parent !== S.scene) S.scene.add(A); A.visible = pop > 0; A.scale.setScalar(.7 + .3 * pop); A.position.set(x, 0, 0);
      const v = new THREE.Vector3(x, 0, 0).project(cam), h = new THREE.Vector3(x, 1.9, 0).project(cam), V = K.view; S.pts.push({ f: k.src, x: lp(V.x0, V.x1, (v.x + 1) / 2), y: lp(V.y0, V.y1, (1 - v.y) / 2), yh: lp(V.y0, V.y1, (1 - h.y) / 2), a: pop }); });
    S.la.position.x = -total / 4 - 1; S.lb.position.x = total / 4 + 1; S.la.color.set(M.over.won ? YOU : '#3a4a5a'); S.lb.color.set(M.over.won ? '#5a3a3a' : FOE);
    X.renderer.render(S.scene, cam); return true;
  }
  const overNext = () => { M.overStage = (M.overStage | 0) + 1; M.overT = performance.now(); click(); };
  function drawLineup(g) {
    const V = K.view, W = V.x1 - V.x0, H = V.y1 - V.y0, u = uiScale(), P = me(), won = M.over.won, S = X.lu, t = (performance.now() - (M.overT || 0)) / 1000;
    { const gr = g.createLinearGradient(0, V.y0, 0, V.y0 + 150 * u); gr.addColorStop(0, 'rgba(8,10,14,.9)'); gr.addColorStop(1, 'rgba(8,10,14,0)'); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, 150 * u); }
    const hy = V.y0 + Math.min(58 * u, H * .09); tx(g, won ? 'VICTORY' : 'DEFEAT', 640, hy, Math.min(56 * u, H * .09), won ? YOU : FOE, 'center', 900); tx(g, `${M.wins[0]}  –  ${M.wins[1]}`, 640, hy + Math.min(44 * u, H * .068), Math.min(24 * u, H * .04), BONE, 'center', 900);
    if (M.over.why === 'left') tx(g, M.fs.length > 2 ? 'The other team left the match' : 'Your rival left the match', 640, hy + 72 * u, 12 * u, DIM);
    if (!M.awards) M.awards = matchAwards(M.fs, won ? P.team : 1 - P.team);
    if (S && S.pts.length) { const n = S.pts.length, step = n > 1 ? Math.abs(S.pts[1].x - S.pts[0].x) : 220 * u, pw = cl(step - 6 * u, 60 * u, 190 * u), tiny = pw < 104 * u, bh0 = tapH(44);
      // a plate under each: name, award, what earned it, then level and kills / deaths. Lines are never closer than they can be read
      const lh = Math.max(19 * u, 13.5 / pxPer()), px = Math.min(13 * u, pw * .13);
      S.pts.forEach(q => { const f = q.f, A = M.awards.get(f.key) || { title: '', line: '' }, col = f.team === P.team ? YOU : FOE, x = q.x - pw / 2, y = q.y + 8 * u, room = V.y1 - bh0 - 18 * u - y, rows = room >= lh * 4 + 10 * u ? 4 : room >= lh * 3 + 10 * u ? 3 : 2, ph = rows * lh + 10 * u, c = cardOf(f); if (room < lh * 2 + 10 * u) return;
        g.save(); g.globalAlpha = q.a; g.translate(0, (1 - q.a) * 14 * u);
        rr(g, x, y, pw, ph, 6, 'rgba(10,13,18,.9)', A.top ? GOLD : f === P ? 'rgba(239,233,220,.55)' : 'rgba(239,233,220,.16)', A.top ? 2 : 1); g.fillStyle = col; g.fillRect(x, y, pw, 3 * u);
        let ly = y + 6 * u + lh / 2; fitTx(g, f.name.toUpperCase(), q.x, ly, px, f === P ? YOU : BONE, 'center', 900, pw - 10 * u); ly += lh;
        fitTx(g, (A.top ? '★ ' : '') + A.title, q.x, ly, px, A.top ? GOLD : '#dfe6ee', 'center', 900, pw - 8 * u); ly += lh;
        if (rows >= 3) { fitTx(g, A.line, q.x, ly, Math.min(10.5 * u, pw * .1), DIM, 'center', 800, pw - 8 * u); ly += lh; }
        if (rows >= 4) { const kd = `${f.stat.k} / ${f.stat.d}`; if (c.lv && !tiny) { tx(g, 'LV ' + c.lv, x + 9 * u, ly, 10.5 * u, lvCol(c.lv), 'left', 900); tx(g, kd, x + pw - 9 * u, ly, 11 * u, BONE, 'right', 800); } else tx(g, kd, q.x, ly, 11 * u, BONE, 'center', 800); }
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
