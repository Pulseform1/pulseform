  /* ---------- 99 main: the kit's hooks, start-up, and a handle for the automated checks ---------- */
  let booted = false, ready = false, failed = false, lastDraw = 0, roomQ = (QS.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  function boot() {
    booted = true; loadCfg(); uiInit(); loadProfile().then(() => { if (ready && VM.skin !== PROFILE.equipped) buildViewModel(PROFILE.equipped, W.TEAMS[0].col); });
    (async () => {
      try { try { await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'); } catch (e) { await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'); }
        initGfx(); buildForest(); initFx(); buildViewModel(PROFILE.equipped || 'longbow', W.TEAMS[0].col); ready = true; emit('ready'); }
      catch (e) { console.error(e); failed = true; }
    })();
  }
  on('source', () => { if (X && VM.g) { const me = meP(); buildViewModel(PROFILE.equipped, me ? teamCol(me.team, me.slot, CL.mode) : W.TEAMS[0].col); } });
  on('roundStart', () => { const me = meP(); if (X && me) buildViewModel(PROFILE.equipped, teamCol(me.team, me.slot, CL.mode)); });
  GAME.reset = () => {
    if (!booted) boot();
    resetInput();
    if (K.bot) return;   // the title screen behind the kit's menu: just the wood
    if (roomQ) { const c = roomQ; roomQ = ''; UI.code = c; UI.from = 'join'; UI.creating = true; openMenu('join'); const cn = connect(c, null); cn.makeOnMiss = QS.has('make'); }
    else if (!CL.src && !CL.conn) openMenu('main');
  };
  GAME.update = dt => {
    pumpLocal(dt);
    if (CL.src && !K.bot) meTick(dt, readInput());
  };
  GAME.draw = g => {
    const t = performance.now(), dt = Math.min(.1, (t - (lastDraw || t)) / 1000), V = K.view; lastDraw = t;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.restore();
    if (!ready) { g.fillStyle = '#0b120c'; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0); tx(g, failed ? 'Could not load the 3D engine. Check your connection and reload.' : 'Walking into the King\'s Wood...', 640, 360, failed ? 22 : 28, failed ? HURT : BONE, 'center', 800, 'Cinzel'); return; }
    if (DEV && QS.has('norender')) visualUpdate(dt);   // automated multi-player checks: everything but the drawing
    else renderFrame(dt);
    audioFrame(dt);
    if (K.bot) return;
    drawHud(g, dt);
    if (CFG.fps || DEV) { X.frameMs = X.frameMs * .95 + dt * 1000 * .05; tx(g, Math.round(1000 / X.frameMs) + ' fps', V.x1 - 10, V.y1 - 10, 11, DIM, 'right'); }
    if (isTouch() && innerHeight > innerWidth && CL.src) { g.fillStyle = 'rgba(10,16,11,.94)'; g.fillRect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0); tx(g, 'TURN YOUR DEVICE SIDEWAYS', 640, 360, 40, BONE, 'center', 900, 'Cinzel'); }
  };
  GAME.down = (x, y, e) => pointerDown(x, y, e || {});
  GAME.move = (x, y, e) => pointerMove(x, y, e || {});
  GAME.up = (x, y, e) => pointerUp(x, y, e || {});
  GAME.key = keyEvent;
  GAME.esc = () => { if (UI.open && UI.open !== 'main' && UI.open !== 'room' && UI.open !== 'results') act('back'); else if (!UI.open && CL.src) openMenu('pause'); return true; };
  GAME.onPause = () => {};
  GAME.bot = () => {};
  // for the browser checks (tools/arrowwood-*.mjs) and for poking at by hand from the console
  GAME.test = {
    get ready() { return ready; }, get X() { return X; }, CL, ME, UI, IN, W, ENG, PROFILE, KEY, SERVER, act, openMenu, closeMenu, startDraw, release, cancelDraw, connect, startPractice, leaveRoom, send, sendRoom, meP, previewNow, renderFrame, readInput,
    tp: (x, z, yaw = 0, pitch = 0) => { ME.st.x = x; ME.st.z = z; ME.st.y = W.groundAt(x, z, W.terrainH(x, z) + 3); ME.st.yaw = yaw; ME.st.pitch = pitch; send({ t: 'dev', tp: [x, ME.st.y, z], yaw, pitch }); },
    aimAt: (x, y, z, power = 1) => { const o = W.shotOrigin(ME.st), d = Math.hypot(x - o[0], z - o[2]), v = W.launchSpeed(power), g = W.GRAV, h = y - o[1]; const disc = v ** 4 - g * (g * d * d + 2 * h * v * v); ME.st.yaw = Math.atan2(-(x - o[0]), -(z - o[2])); ME.st.pitch = disc < 0 ? .7 : Math.atan((v * v - Math.sqrt(disc)) / (g * d)); return ME.st.pitch; },
    pos: () => ({ x: ME.st.x, y: ME.st.y, z: ME.st.z, yaw: ME.st.yaw, pitch: ME.st.pitch }),
    // stage an archer in front of the camera (for the visual checks): o = { id, x, z, yaw, team, bow, draw, crouch }
    stage: o => { const p = player(o.id || 'stage'); Object.assign(p, { name: o.name || 'Stand-in', team: o.team || 1, bow: o.bow || 'longbow', alive: true, arrows: 6, slot: o.slot || 0 }); const y = W.groundAt(o.x, o.z, W.terrainH(o.x, o.z) + 2); p.buf = [[srvNow() + 1e4, o.x, y, o.z, o.yaw || 0, o.pitch || 0, 1 | (o.draw ? 8 : 0) | (o.crouch ? 2 : 0) | 16, o.draw || 0]]; return p.id; },
    finish: (id, bow) => { const p = CL.players.get(id), s = p.buf[p.buf.length - 1]; startFinisher({ v: id, k: CL.me, bow, zone: 'body', p: [s[1], s[2], s[3]], yaw: s[4], d: [Math.sin(s[4]), -.1, Math.cos(s[4])], kn: 'You', vn: p.name }); const f = FINS[FINS.length - 1]; if (f) { f.mine = true; ME.cam = 'finisher'; ME.fin = f; finisherCam(f); } },
    finishers: () => FINS.map(f => ({ kind: f.kind, t: f.t, mine: f.mine, hit: f.hit })), cam: () => ME.cam, arcPts: () => { const { o, v } = previewNow(); return W.previewArc(o, v, 13, 18); },
  };
  if (roomQ && !DEV) setTimeout(() => { const b = document.getElementById('bPlay'); if (b && K.state === 'title') b.click(); }, 50);
})();
