  /* ---------- 90 input: keyboard and mouse, touch, and the click zones the drawn interface uses ----------
     The interface is drawn fresh every frame; as it draws a button it registers a zone, and a press goes to the
     topmost zone under it. Whatever no zone claims belongs to the game: with a mouse, a click captures the pointer;
     by touch, the left of the screen is a movement stick and the right is look, with buttons laid out round the thumb.
     Touch has two helpers a mouse never gets: aim assist (the look slows near the rival and leans toward them) and
     auto-fire (shoots when the crosshair is on them and you are steady). Both can be switched off. */
  const UI = { armory: false, tab: 'Sidearm', panel: 'home', pick: null };
  const zones = []; let ptr = { x: 640, y: 360 }, dragZ = null;
  const inside = (z, x, y) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
  // register a press target for this frame; returns whether the mouse is over it
  const zone = (x, y, w, h, fn, drag) => { const z = { x, y, w, h, fn, drag }; zones.push(z); return !isTouch() && inside(z, ptr.x, ptr.y); };
  const zoneAt = (x, y) => { for (let i = zones.length - 1; i >= 0; i--) if (inside(zones[i], x, y)) return zones[i]; return null; };
  // screen pixels per world unit, and the factor that keeps touch targets and text big enough on a small screen
  const pxPer = () => innerWidth / (K.view.x1 - K.view.x0);
  const uiScale = () => isTouch() ? cl(.62 / pxPer(), 1, 2) : cl(.8 / pxPer(), 1, 1.5);

  /* ---------- keyboard and mouse ---------- */
  let keys = {}; const mouse = { l: false };
  const KM = { KeyW: 'w', ArrowUp: 'w', KeyS: 's', ArrowDown: 's', KeyA: 'a', ArrowLeft: 'a', KeyD: 'd', ArrowRight: 'd', ShiftLeft: 'walk', ShiftRight: 'walk', ControlLeft: 'crouch', KeyC: 'crouch', Space: 'jump', KeyF: 'use' };
  const cvEl = () => document.getElementById('cv');
  const locked = () => document.pointerLockElement === cvEl();
  function grabMouse() { if (isTouch() || K.bot) return; try { const c = cvEl(); if (c && c.requestPointerLock) c.requestPointerLock(); } catch (e) {} }
  function releaseMouse() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} }
  const playing = () => M && screen === 'play' && K.state === 'play' && !M.over;
  function openArmory(open) {
    if (!M || open === UI.armory) return; UI.armory = open;
    if (open) { releaseMouse(); const G = gun(me()); UI.tab = me().guns[1] ? GUNS[me().guns[1]].cat : pistolRound(M.round) ? 'Sidearm' : G.cat === 'Melee' ? 'Rifle' : 'Rifle'; } else { grabMouse(); setReady(me()); }
  }
  function keyEvent(c, d) {
    if (KM[c]) keys[KM[c]] = d;
    if (!d) return;
    if (screen === 'menu') { if (c === 'Enter' && UI.panel === 'home') menuPlay(); return; }
    if (screen === 'over') { if (c === 'Enter') toMenu(); return; }
    if (!playing()) return; const P = me();
    if (c === 'KeyB' && canBuy()) return openArmory(!UI.armory);
    if (UI.armory) return;
    if (c === 'KeyR') reload(P); else if (c === 'Digit1') switchTo(P, 1); else if (c === 'Digit2') switchTo(P, 2); else if (c === 'Digit3') switchTo(P, 3);
    else if (c === 'KeyQ') ability(P, 'q'); else if (c === 'KeyE') ability(P, 'e'); else if (c === 'KeyY' && X && P.alive && P.reloadT <= 0) X.inspT = 2.6;
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('mousemove', e => { if (!locked() || !playing()) return; const P = me(), s = .0022 * CFG.sens / zoomOf(P); P.yaw -= e.movementX * s; P.pitch = cl(P.pitch - e.movementY * s, -1.45, 1.45); });
    document.addEventListener('mousedown', e => { if (!locked() || !playing()) return; if (e.button === 0) mouse.l = true; if (e.button === 2) altAction(me()); });
    document.addEventListener('mouseup', e => { if (e.button === 0) mouse.l = false; });
    document.addEventListener('contextmenu', e => { if (screen === 'play') e.preventDefault(); });
    document.addEventListener('wheel', e => { if (locked() && playing()) cycleWeapon(me(), e.deltaY > 0 ? 1 : -1); }, { passive: true });
  }

  /* ---------- touch ---------- */
  const TS = { stick: null, look: null, fire: null, held: new Map(), crouch: false, slow: 1, onT: 0 };
  // the buttons round the right thumb, in the HUD's units; `show` says whether each is offered right now
  function touchButtons() {
    const V = K.view, u = uiScale(), R = V.x1, B = V.y1, P = me(), G = gun(P), fx = R - 150 * u, fy = B - 150 * u, live = M.phase === 'live', op = OPS[P.op];
    const near = M.planted && Math.hypot(P.x - M.planted.x, P.z - M.planted.z) < 1.7, canUse = live && P.alive && M.mode !== 'range' && (sideOf(P) === 'att' ? !M.planted && onSite(P.x, P.z) : near && !M.defused);
    return [
      { k: 'fire', x: fx, y: fy, r: 62 * u, t: G.melee ? 'SLASH' : 'FIRE', show: P.alive },
      { k: 'alt', x: fx - 22 * u, y: fy - 116 * u, r: 38 * u, t: G.melee ? 'STAB' : G.scope ? 'SCOPE' : G.ads ? 'AIM' : 'BURST', show: P.alive && !!(G.melee || G.scope || G.ads || G.alt), on: !!P.scoped },
      { k: 'jump', x: fx + 104 * u, y: fy - 44 * u, r: 38 * u, t: 'JUMP', show: P.alive },
      { k: 'crouch', x: fx + 100 * u, y: fy + 66 * u, r: 36 * u, t: 'DUCK', show: P.alive, on: TS.crouch },
      { k: 'reload', x: fx - 110 * u, y: fy + 56 * u, r: 36 * u, t: 'LOAD', show: P.alive && !G.melee },
      { k: 'swap', x: fx + 72 * u, y: fy - 128 * u, r: 36 * u, t: 'SWAP', show: P.alive },
      { k: 'q', x: fx - 118 * u, y: fy - 46 * u, r: 38 * u, t: op.q.n.toUpperCase(), show: P.alive && live, off: !P.ab.q, col: op.col },
      { k: 'e', x: fx - 204 * u, y: fy + 4 * u, r: 38 * u, t: op.e.n.toUpperCase(), show: P.alive && live, off: !P.ab.e, col: op.col },
      { k: 'use', x: 640, y: B - 200 * u, r: 58 * u, t: sideOf(P) === 'att' ? 'PLANT' : 'DEFUSE', show: canUse, col: FOE },
    ].filter(b => b.show);
  }
  function touchDown(x, y, id) {
    for (const b of touchButtons()) if (Math.hypot(x - b.x, y - b.y) < b.r + 8 * uiScale()) {
      const P = me(); click();
      if (b.k === 'fire') { TS.fire = id; TS.look = { id, x, y }; }   // the fire thumb keeps aiming while it holds
      else if (b.k === 'alt') altAction(P); else if (b.k === 'reload') reload(P); else if (b.k === 'swap') cycleWeapon(P); else if (b.k === 'crouch') TS.crouch = !TS.crouch;
      else if (b.k === 'q' || b.k === 'e') ability(P, b.k); else TS.held.set(id, b.k);
      return;
    }
    if (x < lp(K.view.x0, K.view.x1, .45)) { if (!TS.stick) TS.stick = { id, x0: x, y0: y, x, y }; } else if (!TS.look) TS.look = { id, x, y };
  }
  function touchMove(x, y, id) {
    if (TS.stick && TS.stick.id === id) { TS.stick.x = x; TS.stick.y = y; }
    if (TS.look && TS.look.id === id && M) { const P = me(), s = .0052 * CFG.tsens * TS.slow / zoomOf(P) / uiScale(); P.yaw -= (x - TS.look.x) * s; P.pitch = cl(P.pitch - (y - TS.look.y) * s, -1.4, 1.4); TS.look.x = x; TS.look.y = y; }
  }
  function touchUp(id) { if (TS.stick && TS.stick.id === id) TS.stick = null; if (TS.look && TS.look.id === id) TS.look = null; if (TS.fire === id) TS.fire = null; TS.held.delete(id); }
  function resetInput() { keys = {}; mouse.l = false; TS.stick = TS.look = TS.fire = null; TS.held.clear(); TS.crouch = false; dragZ = null; }

  // presses from the kit (mouse) and from our own touch listeners all arrive here, in HUD units
  function pointerDown(x, y, id, touch) {
    ptr = { x, y }; const z = zoneAt(x, y);
    if (z) { if (z.drag) dragZ = z; z.fn(x, y); return; }
    if (!playing() || UI.armory) return;
    if (touch) touchDown(x, y, id); else if (!locked()) grabMouse();
  }
  function pointerMove(x, y, id, touch) { ptr = { x, y }; if (dragZ) dragZ.fn(x, y); else if (touch && playing()) touchMove(x, y, id); }
  function pointerUp(id, touch) { dragZ = null; if (touch) touchUp(id); }
  // Touch uses the browser's touch events directly: they keep arriving on phones that cancel pointer events mid-drag,
  // and stopping their default keeps the page from scrolling or zooming under your thumbs.
  if (typeof document !== 'undefined') {
    const world = t => { const V = K.view, s = pxPer(); return [t.clientX / s + V.x0, t.clientY / s + V.y0]; };
    const feed = kind => e => {
      if (typeof K === 'undefined' || K.state !== 'play') return; if (e.cancelable) e.preventDefault(); K.audio && K.audio();
      for (const t of e.changedTouches) { const [x, y] = world(t), id = 't' + t.identifier; if (kind === 0) pointerDown(x, y, id, true); else if (kind === 1) pointerMove(x, y, id, true); else pointerUp(id, true); }
    };
    const c = cvEl(); if (c) { c.addEventListener('touchstart', feed(0), { passive: false }); c.addEventListener('touchmove', feed(1), { passive: false }); c.addEventListener('touchend', feed(2), { passive: false }); c.addEventListener('touchcancel', feed(2), { passive: false }); }
  }

  /* ---------- the local fighter's intent, once a tick ---------- */
  readInput = f => {
    const I = { mx: (keys.d ? 1 : 0) - (keys.a ? 1 : 0), mz: (keys.w ? 1 : 0) - (keys.s ? 1 : 0), walk: !!keys.walk, crouch: !!keys.crouch || TS.crouch, jump: !!keys.jump, use: !!keys.use, fire: mouse.l, rapid: false };
    for (const k of TS.held.values()) { if (k === 'jump') I.jump = true; if (k === 'use') I.use = true; }
    if (TS.stick) {   // how far the thumb has pushed is how fast you go
      const u = uiScale(), dx = TS.stick.x - TS.stick.x0, dy = TS.stick.y - TS.stick.y0, L = Math.hypot(dx, dy), m = cl((L - 9 * u) / (56 * u), 0, 1);
      if (m > 0) { I.mx = dx / L * m; I.mz = -dy / L * m; }
    }
    if (TS.fire != null) { I.fire = true; I.rapid = true; }
    if (isTouch() && f.alive && M.phase === 'live') assist(f, I);
    if (UI.armory) I.fire = false;
    return I;
  };
  function assist(f, I) {
    const e = other(f), G = gun(f); TS.slow = 1;
    if (!e.alive || !canSee(f, e)) { TS.onT = 0; return; }
    const d = Math.hypot(e.x - f.x, e.z - f.z), dy = angDiff(yawTo(f.x, f.z, e.x, e.z), f.yaw), dp = Math.atan2(e.y + lp(1.25, .85, e.crouch) - eyeY(f), d) - f.pitch, off = Math.hypot(dy, dp);
    if (CFG.assist) {
      if (off < .08) TS.slow = .55;
      if (off < .12 && (TS.stick || TS.look || I.fire)) { const r = .5 / 60 * (1 - off / .12); f.yaw += cl(dy, -r, r); f.pitch += cl(dp, -r, r); }
    }
    if (CFG.autofire) {
      const pt = patOf(f, G), S = castShot(f, viewDir(f.yaw + pt[0], f.pitch + pt[1])), onTarget = S.hit && (!G.melee || S.dist < 2.2);
      TS.onT = onTarget ? TS.onT + 1 / 60 : 0;
      if (TS.onT > .1 && (G.melee || spreadOf(f) < Math.max(.014, Math.atan2(.3, d) * 1.6)) && (!G.scope || f.scoped)) { I.fire = true; I.rapid = true; }
    }
  }
