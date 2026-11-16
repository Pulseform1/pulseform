  /* ---------- 99 main: the kit's hooks, the menu, quality changes, the test handle ---------- */
  let booted = false, acc = 0, lastDraw = 0, lastDay = 0;
  function menuStart(cont) {
    resetInput(); if (cont) loadRun(savedRun()); else newRun();
    runLive = true; screen = 'play'; panel = null; lockMouse(); saveRun(); lastDay = S.day;
    if (!cont) setTimeout(() => say(isTouch() ? 'Wreckage is drifting your way. Hold THROW, let go to cast the hook' : 'Wreckage is drifting your way. Hold the mouse button, let go to throw the hook', TEAL), 1200);
  }
  function toMenu() { runLive = false; screen = 'menu'; panel = null; unlockMouse(); resetInput(); newRun(); }
  function applyQuality() { if (!X) return; X.q = quality(); X.low = X.q === 'low'; X.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, X.low ? 1.25 : X.q === 'high' ? 2 : 1.6)); X.renderer.shadowMap.enabled = X.q === 'high'; X.sun.castShadow = X.q === 'high'; buildOcean(); }
  on('faint', () => { if (X) X.fade = 2.5; });
  on('wash', A => { if (X) X.shake = 1.4; if (X) for (let i = 0; i < 40; i++) { const e = eyePos(); sprayAt(e[0] + rnd(-4, 4), e[1] - .6, e[2] + rnd(-4, 4), 4, 6, 3, 2); } });
  on('latch', () => { if (X) X.shake = .8; }); on('break', () => { if (X) X.shake = 1; }); on('bitten', () => { if (X) X.shake = 1; });
  on('splash', (x, z, big) => { if (X) sprayAt(x, waterH(x, z), z, big ? 40 : 10, big ? 14 : 3, big ? 8 : 1.2, big ? 6 : 1, 0); });
  on('break', (c, x, z) => { if (X) sprayAt(x, waterH(x, z), z, 20, 3, 2, 1.5, 0); });

  GAME.reset = () => {
    if (!booted) { booted = true; loadCfg(); }
    resetInput(); panel = null; acc = 0; screen = 'menu'; runLive = false; newRun();
  };
  GAME.update = dt => {
    acc += Math.min(dt, .1); let n = 0;
    while (acc >= 1 / 60 && n++ < 6) {
      acc -= 1 / 60;
      if (screen === 'play' && !panel) lifeTick(1 / 60, readInput());
      else if (screen === 'menu' && !panel) { PL.yaw += .0012; PL.pitch = -.04; lifeTick(1 / 60, { mx: 0, mz: 0, use: false }); }
    }
    if (screen === 'play' && S.day !== lastDay) { lastDay = S.day; K.score = S.day; try { if (window.parent !== window) window.parent.postMessage({ pbx: 'score', score: S.day }, location.origin); } catch (e) {} }
  };
  GAME.draw = g => {
    const now = performance.now(), dt = Math.min(.1, (now - (lastDraw || now)) / 1000), V = K.view; lastDraw = now;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.restore(); zones.length = 0;
    if (!ready) { g.fillStyle = '#04101a'; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0); tx(g, failed ? 'Could not load the 3D engine. Check your connection and reload.' : 'THE SEA IS RISING...', 640, 360, failed ? 22 : 30, failed ? RED : BONE); return; }
    renderFrame(dt); audioFrame(dt, X.firePt.intensity > 0 && X.camera.position.distanceTo(X.firePt.position) < 6);
    if (K.bot) return;
    if (screen === 'menu') drawMenu(g); else drawHud(g);
    if (X.fade > 0) { X.fade -= dt; g.fillStyle = `rgba(0,0,0,${cl(X.fade / 1.2, 0, 1)})`; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0); }
    const mute = document.getElementById('bMute'); if (mute) mute.style.display = screen === 'play' && isTouch() ? 'none' : '';
    if (isTouch() && innerHeight > innerWidth) { g.fillStyle = 'rgba(4,16,26,.96)'; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0); zones.length = 0; zone(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0, () => {}); tx(g, 'TURN YOUR DEVICE SIDEWAYS', 640, 340, 44, BONE, 'center', 800); }
  };
  GAME.down = (x, y, e) => pointerDown(x, y, e || {});
  GAME.move = (x, y, e) => pointerMove(x, y, e || {});
  GAME.up = (x, y, e) => pointerUp(x, y, e || {});
  GAME.key = keyEvent;
  GAME.bot = () => {};
  // for the browser checks (tools/blackwater-checks.mjs) and for testing by hand from the console
  GAME.test = {
    get X() { return X; }, get ready() { return ready; }, get screen() { return screen; }, get RAFT() { return RAFT; }, get panel() { return panel; }, set panel(v) { panel = v; },
    S, PL, HK, FS, FL, SH, CT, CACHE, INV, IN, ui, act, drink, keyEvent, collect, get panelName() { return panel; }, give, place, cellAt, spawnGiant, spawnPool, summon, addFloater, menuStart, toMenu, lifeTick, waterH, eyePos, touchButtons, uiScale, CFG, applyQuality, DRIFT, FISH,
    tick: s => { for (let i = 0; i < s * 60; i++) lifeTick(1 / 60, readInput()); },
  };
  (async () => { try { if (typeof document === 'undefined') return; try { await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'); } catch (e) { await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'); } initGfx(); ready = true; } catch (e) { console.error(e); failed = true; } })();
})();
