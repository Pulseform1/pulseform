  /* ---------- 70 input: mouse and keys with the pointer locked; touch with a move stick, drag-to-aim and a DRAW button ---------- */
  const IN = { keys: {}, locked: false, stick: null, look: null, drawId: null, held: new Map(), jumpQ: false, board: false, wantLock: false };
  const inGame = () => !!CL.src && !UI.open;
  const lockMouse = () => { if (isTouch() || DEV && QS.has('nolock')) return; try { const c = document.getElementById('cv'); if (c && document.pointerLockElement !== c) { IN.wantLock = true; c.requestPointerLock(); } } catch (e) {} };
  const unlockMouse = () => { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} };
  document.addEventListener('pointerlockchange', () => {
    const was = IN.locked; IN.locked = !!document.pointerLockElement;
    if (was && !IN.locked && inGame()) { if (ME.drawing) cancelDraw(true); IN.keys = {}; openMenu('pause'); }   // Escape while playing: the menu (the match keeps going)
  });
  const look = (dx, dy, s) => { ME.st.yaw -= dx * s; ME.st.pitch = cl(ME.st.pitch - dy * s * (CFG.invert ? -1 : 1), -1.45, 1.45); };
  document.addEventListener('mousemove', e => { if (!IN.locked || !inGame()) return; const s = (.0006 + CFG.sens * .0034) * (ME.drawing ? .8 : 1); look(e.movementX, e.movementY, s); });
  document.addEventListener('contextmenu', e => { if (CL.src) e.preventDefault(); });
  function keyEvent(code, down) {
    IN.keys[code] = down;
    if (!down) { if (code === 'Tab') IN.board = false; return; }
    if (!inGame()) return;
    if (code === 'Space') IN.jumpQ = true;
    if (code === 'KeyC') ME.crouchToggle = !ME.crouchToggle;
    if (code === 'KeyQ') cancelDraw();
    if (code === 'KeyF') pingAim();
    if (code === 'Tab') IN.board = true;
    if (code === 'KeyH') { CFG.hideKeys = !CFG.hideKeys; saveCfg(); }
  }
  addEventListener('keydown', e => { if (e.code === 'Tab' && CL.src) e.preventDefault(); });
  function pingAim() {
    if (!canAct() && !(CL.src && ME.alive)) return;
    const e = myEye([0, 0, 0]), d = W.aimVector(ME.st.yaw, ME.st.pitch, 1), dist = W.rayWorld(e, d, 90), p = [e[0] + d[0] * dist, e[1] + d[1] * dist, e[2] + d[2] * dist];
    if (dist >= 90) { p[1] = W.terrainH(p[0], p[2]); }
    send({ t: 'ping', p: p.map(v => +v.toFixed(2)) });
  }
  function readInput() {
    const k = IN.keys, I = { mx: (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0), mz: (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0), sprint: !!(k.ShiftLeft || k.ShiftRight), crouch: !!(k.ControlLeft || k.ControlRight), jump: IN.jumpQ };
    IN.jumpQ = false;
    if (IN.stick) { const s = IN.stick, dx = s.x - s.x0, dy = s.y - s.y0, L = Math.hypot(dx, dy), r = 70 * uiS(), m = cl((L - 6) / r, 0, 1.15); if (m > 0) { I.mx = dx / L * Math.min(1, m); I.mz = -dy / L * Math.min(1, m); I.sprint = m > 1.02 && -dy / L > .6; } }
    for (const b of IN.held.values()) if (b === 'jump') I.jump = true;
    if (!inGame()) { I.mx = I.mz = 0; I.jump = false; }
    return I;
  }
  // ---- touch (iPad): the kit hands every pointer here with its own id, so several fingers work at once
  const uiS = () => { const V = K.view, s = Math.min((V.x1 - V.x0) / 1280, (V.y1 - V.y0) / 720); return 1.15 / Math.max(.75, Math.min(1.4, s)); };
  function touchButtons() {
    const V = K.view, u = uiS(), R = V.x1, B = V.y1, L = [];
    if (!CL.src) return L;
    L.push({ k: 'draw', x: R - 150 * u, y: B - 165 * u, r: 78 * u, t: ME.drawing ? (ME.full ? 'RELEASE' : 'DRAWING') : 'DRAW' });
    L.push({ k: 'cancel', x: R - 295 * u, y: B - 92 * u, r: 38 * u, t: 'LOWER' }, { k: 'crouch', x: R - 70 * u, y: B - 330 * u, r: 40 * u, t: ME.crouchToggle ? 'STAND' : 'CROUCH' }, { k: 'jump', x: R - 265 * u, y: B - 250 * u, r: 40 * u, t: 'JUMP' }, { k: 'ping', x: R - 170 * u, y: B - 330 * u, r: 32 * u, t: 'PING' });
    return L;
  }
  function pointerDown(x, y, e) {
    audioInit(); if (UI.open) return;
    const touch = e && e.pointerType === 'touch';
    if (!touch) {
      if (!CL.src) return;
      if (!IN.locked && !isTouch()) { lockMouse(); return; }
      if (e.button === 2) cancelDraw(); else if (e.button === 0) startDraw();
      return;
    }
    if (!CL.src) return;
    const id = e.pointerId, b = touchButtons().find(b => Math.hypot(x - b.x, y - b.y) < b.r + 8);
    if (b) {
      if (b.k === 'draw') { startDraw(); IN.drawId = id; IN.look = { id, x, y }; }
      else if (b.k === 'cancel') cancelDraw(); else if (b.k === 'crouch') ME.crouchToggle = !ME.crouchToggle; else if (b.k === 'ping') pingAim(); else IN.held.set(id, b.k);
      return;
    }
    if (x < lp(K.view.x0, K.view.x1, .42)) { if (!IN.stick) IN.stick = { id, x0: x, y0: y, x, y }; }
    else if (!IN.look) IN.look = { id, x, y };
  }
  function pointerMove(x, y, e) {
    if (!e || e.pointerType !== 'touch') return; const id = e.pointerId;
    if (IN.stick && IN.stick.id === id) { IN.stick.x = x; IN.stick.y = y; }
    if (IN.look && IN.look.id === id && inGame()) { const s = (.0025 + CFG.touchSens * .006) * (ME.drawing ? .75 : 1); look(x - IN.look.x, y - IN.look.y, s); IN.look.x = x; IN.look.y = y; }
  }
  function pointerUp(x, y, e) {
    const touch = e && e.pointerType === 'touch', id = e && e.pointerId;
    if (!touch) { if (e && e.button === 0) release(); return; }
    if (IN.drawId === id) { IN.drawId = null; release(); }
    if (IN.stick && IN.stick.id === id) IN.stick = null;
    if (IN.look && IN.look.id === id) IN.look = null;
    IN.held.delete(id);
  }
  // a touch the browser takes back (a system gesture) counts as lifting the finger
  addEventListener('pointercancel', e => { if (e.pointerType === 'touch' && K.state === 'play') pointerUp(0, 0, e); });
  function resetInput() { IN.keys = {}; IN.stick = IN.look = null; IN.drawId = null; IN.held.clear(); }
