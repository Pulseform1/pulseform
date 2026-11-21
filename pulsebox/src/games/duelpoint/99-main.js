  /* ---------- 99 main: the kit's hooks, moving between screens, demo and cover-art modes, the test handle ---------- */
  let booted = false, acc = 0, lastDraw = 0;
  function toMenu() { if (M && M.ranked && !M.over && M.mode !== 'demo' && M.round > 0) rankedLeft(); UI.trying = null; M = null; screen = 'menu'; UI.panel = 'home'; UI.armory = false; resetInput(); releaseMouse(); MP.hide(); }
  function play(o) { resetInput(); UI.lastSide = null; UI.switched = null; UI.armory = false; UI.pick = null; MP.hide(); acc = 0; startMatch(o); screen = 'play'; if (!UI.armory) grabMouse(); }
  // a bot match from the menu: agent select first (the tests can skip it)
  const soloOpts = () => { const size = teamSize(CFG.size), ranked = CFG.queue === 'ranked'; return { mode: 'bot', diff: ranked && CFG.diff === 'auto' ? botLevelFor(rankStrength(size)) : CFG.diff, size, sites: CFG.sites, ranked }; };
  function menuPlay(size, select = true) { if (size) { CFG.size = size; saveAll(); } const o = soloOpts(); if (select) openSelect(o); else play(o); }
  on('matchStart', () => { resetInput(); acc = 0; screen = 'play'; UI.lastSide = null; UI.switched = null; });   // an online match began (60-net started it)
  // each round opens on the armory, after the loading screen or the switching-sides band if there is one
  on('round', n => {
    UI.armory = false; UI.pick = null; UI.pendingArmory = false; if (M.mode === 'demo' || M.mode === 'range') return;
    const side = sideOf(me()), decider = otRound(n) > 0; UI.switched = n > 1 && UI.lastSide && side !== UI.lastSide ? { t0: performance.now(), side, decider, sd: suddenDeath(n), first: otRound(n) === 1 } : null; UI.lastSide = side;
    if (loadingNow() || UI.switched) UI.pendingArmory = true; else openArmory(true);
  });
  on('live', () => { if (UI.armory) { UI.armory = false; if (!locked()) grabMouse(); } });
  on('map', () => { if (ready) rebuildWorld(); });
  on('planted', f => { if (M && f === me()) M.myPlants = (M.myPlants || 0) + 1; }); on('defused', f => { if (M && f === me()) M.myDefuses = (M.myDefuses || 0) + 1; });
  // leaving a ranked match before it ends counts as a loss
  function rankedLeft() { try { const P = me(); M.rankRes = rankedResult(M.size, { won: false, opp: rankStrength(M.size), margin: 3, perf: .3 }); logMatch({ at: Date.now(), r: 1, w: 0, s: [M.wins[0], M.wins[1]], map: MAP.n, size: M.size, on: M.online ? 1 : 0, k: P.stat.k, d: P.stat.d, cs: csOf(P), op: P.op, rp: M.rankRes.d, left: 1 }); STATS.matches++; saveAll(true); } catch (e) {} }
  on('over', won => {
    if (M.mode === 'demo') return; screen = 'over'; UI.armory = false; releaseMouse(); resetInput();
    if (M.mode === 'range') return; const P = me();
    STATS.matches++; if (won) STATS.wins++; STATS.kills += P.stat.k; STATS.heads += P.stat.hs;
    // the adaptive bot follows a rating: beat it and the next one is sharper, lose and it eases off
    { const lvl = M.auto ? diffFor(M.rating).i : (M.fs.find(f => f.team !== P.team && f.bot) || { bot: { diff: 1 } }).bot.diff; M.pay = matchCoins(P, M, won, { plants: M.myPlants, defuses: M.myDefuses, botLevel: lvl }); STATS.coins += M.pay.total; M.payT = performance.now(); }
    // ranked: the other side's strength (people by their rank, bots by their level), the score, and how you played
    { const mine = M.fs.filter(f => f.team === P.team), them = M.fs.filter(f => f.team !== P.team && !f.gone), lvl = M.botDiff === 'auto' || M.botDiff == null ? 1 : +M.botDiff;
      const opp = them.length ? them.reduce((s, f) => s + (f.bot || f.isBot ? botRV(f.bot ? f.bot.diff : lvl) : f.rk != null ? +f.rk : rankStrength(M.size)), 0) / them.length : rankStrength(M.size);
      const all = M.fs.filter(f => !f.gone), avg = all.reduce((s, f) => s + csOf(f), 0) / Math.max(1, all.length), perf = cl(csOf(P) / Math.max(1, avg) / 2, 0, 1);
      if (M.ranked && M.over.why !== 'dropped') M.rankRes = rankedResult(M.size, { won, opp, margin: Math.abs(M.wins[0] - M.wins[1]), perf });
      logMatch({ at: Date.now(), r: M.ranked ? 1 : 0, w: won ? 1 : 0, s: [M.wins[0], M.wins[1]], map: MAP.n, size: M.size, on: M.online ? 1 : 0, k: P.stat.k, d: P.stat.d, cs: csOf(P), op: P.op, rp: M.rankRes ? M.rankRes.d : null, pl: M.rankRes && M.rankRes.placing ? M.rankRes.n : 0 }); }
    if (M.auto && !M.ranked) { const before = STATS.rating, d = won ? 22 + 4 * (M.wins[0] - M.wins[1]) : -(20 - 3 * M.wins[0]); STATS.rating = Math.round(cl(before + d, 600, 1800)); M.rated = { before, after: STATS.rating }; }
    saveAll(true); K.score = M.wins[0];
    // tell the hub (when it hosts the game) so profiles and the daily challenge count the match
    try { if (!M.online && window.parent !== window) window.parent.postMessage({ pbx: 'score', score: M.wins[0] * 10 + (won ? 50 : 0) + M.fs[1].bot.diff * 10 }, location.origin); } catch (e) {}
  });

  // online, the match never pauses (the others are still playing, and the host runs the clock and the bots): losing focus
  // keeps it running, and Escape opens the settings over it instead of the kit's pause screen
  Object.defineProperty(GAME, 'noPause', { get: () => !!(M && M.online) || MP.online(), configurable: true });
  GAME.onPause = () => { try { if (document.hasFocus() && screen === 'play' && M && !M.over) openOpts(true); } catch (e) {} };
  // a hidden tab gets no animation frames, but an online match must not stop (the host runs the clock and the bots):
  // while hidden, a timer keeps it going, and any keys held when you left are let go
  { let hidT = 0; setInterval(() => {
      if (!document.hidden || !M || !M.online || screen !== 'play' || M.over) { hidT = 0; return; }
      const now = performance.now(); if (!hidT) { hidT = now; resetInput(); return; } let dt = Math.min(2, (now - hidT) / 1000); hidT = now;
      try { while (dt > 1e-4) { const s = Math.min(1 / 60, dt); tick(s); dt -= s; } } catch (e) {}
    }, 250); }
  GAME.reset = () => {
    if (!booted) { booted = true; loadSave(); }
    resetInput(); posed = false; UI.armory = false; UI.panel = 'home'; acc = 0; MP.hide();
    if (K.bot) { if (DEMO) { startMatch({ mode: 'demo' }); screen = 'play'; } else { M = null; screen = 'menu'; } return; }   // behind the title card, or a trailer
    M = null; screen = 'menu';
    if (/[?&]room=/.test(location.search)) openParty();   // arrived from an invite: straight to the party
  };
  GAME.update = dt => {
    queueTick();
    if (screen !== 'play' || !M || posed) return;
    if (UI.pendingArmory && !loadingNow() && !UI.switched) { UI.pendingArmory = false; if (M.phase === 'buy') openArmory(true); }
    acc += Math.min(dt, .1); let n = 0; while (acc >= 1 / 60 && n++ < 5) { for (const f of M.fs) { f.px = f.x; f.py = f.y; f.pz = f.z; } tick(1 / 60); acc -= 1 / 60; }
    tickA = cl(acc * 60, 0, 1);
    if (M.over && M.mode === 'demo') startMatch({ mode: 'demo' });
  };
  GAME.esc = () => { if (screen === 'select') { selectKey('Escape'); return true; }
    if (screen === 'party') { if (!MP.online()) { screen = 'menu'; UI.panel = 'home'; } return true; }
    if (screen === 'menu' && (UI.panel === 'store' || UI.panel === 'locker')) { if (SH.reveal) SH.reveal = null; else if (SH.show) SH.show = null; else UI.panel = 'home'; return true; } if (screen === 'menu' && UI.panel !== 'home') { UI.panel = 'home'; return true; } return false; };
  GAME.draw = g => {
    const now = performance.now(), dt = Math.min(.1, (now - (lastDraw || now)) / 1000), V = K.view; lastDraw = now; if (dt > 0) UI.fps = UI.fps ? lp(UI.fps, 1 / dt, .05) : 1 / dt;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.restore();
    zones.length = 0;
    if (!ready) { g.fillStyle = INK; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0); tx(g, failed ? 'Could not load the 3D engine. Check your connection and reload.' : 'LOADING', 640, 360, failed ? 22 : 30, failed ? WARN : BONE); return; }
    renderFrame(dt); if (posed) return;
    const mute = document.getElementById('bMute'); if (mute) mute.style.display = K.state === 'play' ? 'none' : '';   // the kit's round sound button sat over our buttons in the corner: inside the game, sound is in Settings (Sound, Volume)
    if (K.bot && !DEMO) return;
    if (screen !== 'party') hideBoxes();
    if (screen === 'menu') drawMenu(g); else if (screen === 'party') drawParty(g); else if (screen === 'select') drawSelect(g); else if (screen === 'play' && M) drawHud(g); else if (screen === 'over' && M) drawOver(g);
    if (screen !== 'play' || UI.armory || UI.opts) drawNav(g);
    drawCursor(g);
    if (isTouch() && innerHeight > innerWidth) {   // an upright phone outside the hub: ask for it to be turned
      g.fillStyle = 'rgba(12,16,22,.96)'; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0); zones.length = 0; zone(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0, () => {});
      tx(g, 'TURN YOUR PHONE SIDEWAYS', 640, 330, 46, BONE); tx(g, 'Duelpoint needs both thumbs', 640, 392, 26, DIM);
    }
  };
  const isTouchEvent = e => e && e.pointerType === 'touch';   // touches come through our own listeners in 90-input
  // with the mouse captured the page's own pointer never moves: the armory's cursor is driven from the raw mouse instead (90-input)
  GAME.down = (x, y, e) => { if (!isTouchEvent(e) && !vcursor()) pointerDown(x, y, 'm', false); };
  GAME.move = (x, y, e) => { if (!isTouchEvent(e) && !vcursor()) pointerMove(x, y, 'm', false); };
  GAME.up = (x, y, e) => { if (!isTouchEvent(e) && !vcursor()) pointerUp('m', false); };
  GAME.key = keyEvent;
  GAME.bot = () => {};
  // cover art: you on the site with a rifle, your rival stepping out by the container, the dock behind
  GAME.pose = () => {
    posed = false; seed(11); startMatch({ mode: 'demo' }); const P = me(), F = foe();
    M.phase = 'live'; M.t = 52; P.guns[1] = 'lancer'; P.slot = 1; giveAmmo(P, 'lancer'); F.guns[1] = 'vesper'; F.slot = 1; F.op = 'iris'; P.op = 'vex';
    Object.assign(P, { x: 33.4, z: 24.2, y: 0, vx: 0, vz: 0 }); Object.assign(F, { x: 37.6, z: 18.2, y: 0, vx: -1.5, vz: .4, walkT: 1.1 });
    P.yaw = yawTo(P.x, P.z, F.x, F.z) + .09; P.pitch = Math.atan2(eyeY(F) - .35 - eyeY(P), Math.hypot(F.x - P.x, F.z - P.z)); F.yaw = yawTo(F.x, F.z, P.x, P.z) + .3;
    P.bot = null; F.bot = null; screen = 'play'; posed = true;
    if (ready) { X.drawT = 0; X.viewKey = ''; renderFrame(.3); renderFrame(.3); P.fireT = 0; fire(P); renderFrame(.016); }
  };
  // for the browser tests
  GAME.test = {
    get M() { return M; }, get X() { return X; }, get screen() { return screen; }, get ptr() { return ptr; }, mech: () => ({ TPS, PADS, GATES, BRKS, VENTS, navCells, GRASS, ICE, LOWG, BELT, GW, GH, NC, hAt, los, setGate, setWall }), hurt: (v, n, by, h) => applyDamage(v, n, by, h, 'vesper'), get MAP() { return MAP; }, SITES, MAPS, mapPool, loadingNow, skipLoad, CFG, UI, GUNS, TS, zones, ready: () => ready,
    st: () => M && { screen, mode: M.mode, phase: M.phase, round: M.round, t: +M.t.toFixed(1), wins: M.wins, planted: !!M.planted, over: M.over, armory: UI.armory, fs: M.fs.map(f => ({ n: f.name, side: sideOf(f), hp: Math.ceil(f.hp), sh: f.sh, alive: f.alive, x: +f.x.toFixed(1), z: +f.z.toFixed(1), y: +f.y.toFixed(2), gun: gun(f).k, cr: f.credits, k: f.stat.k })) },
    navFocus: () => { const z = navAt(); return z ? [Math.round(z.x), Math.round(z.y), Math.round(z.w)] : null; }, throwNade: () => throwNade(me()), updateAgent, siteC, hAt, play, toMenu, menuPlay: s => menuPlay(s, false), openParty, PARTY, SH, buySkin, equipSkin, redeem: c => { const p0 = window.prompt; window.prompt = () => c; try { enterCode(); } finally { window.prompt = p0; } return SH.msg && SH.msg.s; }, allSkinIds, dailyStore, storeLeft, skinPrice, skinOfId, matchCoins, openSelect, lockIn, get sel() { return UI.sel; }, tick: s => { for (let i = 0; i < s * 60; i++) tick(1 / 60); }, buy: k => buy(me(), k), fire: () => fire(me()), alt: () => altAction(me()), ability: k => ability(me(), k), openArmory,
    ranked: () => ({ rankedOf, rankedResult, rankLabel, rankOf, placed, botLevelFor, soloOpts, matchOver, STATS, csOf }),
    team: () => ({ dropHeld, dropCharge, giveCharge, takeLoot, carries, carrier, matchDecided, otRound, applyDamage, startRound, endRound, stepLoot }),
    botMe: d => { me().bot = { diff: d }; me().local = false; }, CFG, TS, get keys() { return keys; }, readInput: () => readInput(me()), dmgAt, hitboxes, headOf, castShot, viewDir, lootAt, setCharge, QUE, queueStart, queueStop, partyFns: () => ({ hostClick, swapTeam, tradeTeams, hostTeams }), XH_PRESETS, xhCode, xhFromCode, openOpts, gunModel, gunIcon, agentModel, rfx: () => ({ busy: RFX.busy.length, free: RFX.free.length, onGuns: RFX.busy.filter(r => r.gun && r.gun.userData.rig === r).length, guns: RFX.busy.map(r => r.gun && (r.gun.userData.k + (r.full ? '/full' : '/light') + ':' + r.mode + '@' + RFX.frame + '-' + r.stamp)) }), killFx, LINES, err: () => spreadOf(me()) / D2R, touchButtons, uiScale, pxPer, seed, matchOver, STATS, diffFor, VKF, animParts, aimArms, shotBuf: k => baked[k],
  };
})();
