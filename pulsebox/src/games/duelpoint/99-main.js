  /* ---------- 99 main: the kit's hooks, moving between screens, demo and cover-art modes, the test handle ---------- */
  let booted = false, acc = 0, lastDraw = 0;
  function toMenu() { M = null; screen = 'menu'; UI.panel = 'home'; UI.armory = false; resetInput(); releaseMouse(); MP.hide(); }
  function play(o) { resetInput(); UI.armory = false; UI.pick = null; MP.hide(); acc = 0; startMatch(o); screen = 'play'; if (!UI.armory) grabMouse(); }
  function menuPlay() { play({ mode: 'bot', diff: CFG.diff }); }
  on('matchStart', () => { resetInput(); acc = 0; screen = 'play'; });   // an online match began (60-net started it)
  on('round', () => { UI.armory = false; UI.pick = null; if (M.mode !== 'demo' && M.mode !== 'range') openArmory(true); });   // each round opens on the armory
  on('live', () => { if (UI.armory) { UI.armory = false; grabMouse(); } });
  on('over', won => {
    if (M.mode === 'demo') return; screen = 'over'; UI.armory = false; releaseMouse(); resetInput();
    if (M.mode === 'range') return; const P = me();
    STATS.matches++; if (won) STATS.wins++; STATS.kills += P.stat.k; STATS.heads += P.stat.hs; saveAll(); K.score = M.wins[0];
    // tell the hub (when it hosts the game) so profiles and the daily challenge count the match
    try { if (!M.online && window.parent !== window) window.parent.postMessage({ pbx: 'score', score: M.wins[0] * 10 + (won ? 50 : 0) + M.fs[1].bot.diff * 10 }, location.origin); } catch (e) {}
  });

  GAME.reset = () => {
    if (!booted) { booted = true; loadSave(); }
    resetInput(); posed = false; UI.armory = false; UI.panel = 'home'; acc = 0; MP.hide();
    if (K.bot) { if (DEMO) { startMatch({ mode: 'demo' }); screen = 'play'; } else { M = null; screen = 'menu'; } return; }   // behind the title card, or a trailer
    M = null; screen = 'menu';
    if (/[?&]room=/.test(location.search)) MP.show();   // arrived from an invite: straight to the room
  };
  GAME.update = dt => {
    if (screen !== 'play' || !M || posed) return;
    acc += Math.min(dt, .1); let n = 0; while (acc >= 1 / 60 && n++ < 5) { tick(1 / 60); acc -= 1 / 60; }
    if (M.over && M.mode === 'demo') startMatch({ mode: 'demo' });
  };
  GAME.draw = g => {
    const now = performance.now(), dt = Math.min(.1, (now - (lastDraw || now)) / 1000), V = K.view; lastDraw = now;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.restore();
    zones.length = 0;
    if (!ready) { g.fillStyle = INK; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0); tx(g, failed ? 'Could not load the 3D engine. Check your connection and reload.' : 'LOADING', 640, 360, failed ? 22 : 30, failed ? WARN : BONE); return; }
    renderFrame(dt); if (posed) return;
    const mute = document.getElementById('bMute'); if (mute) mute.style.display = isTouch() && screen === 'play' && K.state === 'play' ? 'none' : '';
    if (K.bot && !DEMO) return;
    if (screen === 'menu') drawMenu(g); else if (screen === 'play' && M) drawHud(g); else if (screen === 'over' && M) drawOver(g);
    if (isTouch() && innerHeight > innerWidth) {   // an upright phone outside the hub: ask for it to be turned
      g.fillStyle = 'rgba(12,16,22,.96)'; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0); zones.length = 0; zone(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0, () => {});
      tx(g, 'TURN YOUR PHONE SIDEWAYS', 640, 330, 46, BONE); tx(g, 'Duelpoint needs both thumbs', 640, 392, 26, DIM);
    }
  };
  const isTouchEvent = e => e && e.pointerType === 'touch';   // touches come through our own listeners in 90-input
  GAME.down = (x, y, e) => { if (!isTouchEvent(e)) pointerDown(x, y, 'm', false); };
  GAME.move = (x, y, e) => { if (!isTouchEvent(e)) pointerMove(x, y, 'm', false); };
  GAME.up = (x, y, e) => { if (!isTouchEvent(e)) pointerUp('m', false); };
  GAME.key = keyEvent;
  GAME.bot = () => {};
  // cover art: you on the site with a rifle, your rival stepping out by the container, the dock behind
  GAME.pose = () => {
    posed = false; seed(11); startMatch({ mode: 'demo' }); const P = me(), F = foe();
    M.phase = 'live'; M.t = 52; P.guns[1] = 'lancer'; P.slot = 1; giveAmmo(P, 'lancer'); F.guns[1] = 'vesper'; F.slot = 1; F.op = 'iris'; P.op = 'vex';
    Object.assign(P, { x: 33.4, z: 24.2, y: 0, vx: 0, vz: 0 }); Object.assign(F, { x: 42.6, z: 16.6, y: 0, vx: 1.5, vz: 0, walkT: 1.1 });
    P.yaw = yawTo(P.x, P.z, F.x, F.z) + .05; P.pitch = Math.atan2(eyeY(F) - .35 - eyeY(P), Math.hypot(F.x - P.x, F.z - P.z)); F.yaw = yawTo(F.x, F.z, P.x, P.z) + .3;
    P.bot = null; F.bot = null; screen = 'play'; posed = true;
    if (ready) { X.drawT = 0; X.viewKey = ''; renderFrame(.3); renderFrame(.3); P.fireT = 0; fire(P); renderFrame(.016); }
  };
  // for the browser tests
  GAME.test = {
    get M() { return M; }, get X() { return X; }, get screen() { return screen; }, CFG, UI, GUNS, TS, zones, ready: () => ready,
    st: () => M && { screen, mode: M.mode, phase: M.phase, round: M.round, t: +M.t.toFixed(1), wins: M.wins, planted: !!M.planted, over: M.over, armory: UI.armory, fs: M.fs.map(f => ({ n: f.name, side: sideOf(f), hp: Math.ceil(f.hp), sh: f.sh, alive: f.alive, x: +f.x.toFixed(1), z: +f.z.toFixed(1), y: +f.y.toFixed(2), gun: gun(f).k, cr: f.credits, k: f.stat.k })) },
    play, toMenu, menuPlay, tick: s => { for (let i = 0; i < s * 60; i++) tick(1 / 60); }, buy: k => buy(me(), k), fire: () => fire(me()), alt: () => altAction(me()), ability: k => ability(me(), k), openArmory,
    botMe: d => { me().bot = { diff: d }; me().local = false; }, err: () => spreadOf(me()) / D2R, touchButtons, uiScale, pxPer, seed,
  };
})();
