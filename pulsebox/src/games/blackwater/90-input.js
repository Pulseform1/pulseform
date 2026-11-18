  /* ---------- 90 input: mouse and keys (with the pointer locked while you play), and touch ---------- */
  const IN = { keys: {}, use: false, locked: false, stick: null, look: null, useId: null, held: new Map() };
  let screen = 'menu', panel = null;   // screen: menu | play; panel: null | settings | craft
  const zones = [];
  const zone = (x, y, w, h, fn) => { zones.push({ x, y, w, h, fn }); return HOV.x >= x && HOV.x <= x + w && HOV.y >= y && HOV.y <= y + h; };
  const HOV = { x: -1, y: -1 };
  const playing = () => screen === 'play' && K.state === 'play' && !panel;
  const lockMouse = () => { if (isTouch()) return; try { const c = document.getElementById('cv'); if (c && document.pointerLockElement !== c) c.requestPointerLock(); } catch (e) {} };
  const unlockMouse = () => { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} };
  document.addEventListener('pointerlockchange', () => { IN.locked = !!document.pointerLockElement; if (!IN.locked && playing() && screen === 'play') { IN.use = false; act.useUp(); } });
  document.addEventListener('mousemove', e => { if (!IN.locked || !playing()) return; const s = .0011 + CFG.sens * .0034; PL.yaw -= e.movementX * s; PL.pitch = cl(PL.pitch - e.movementY * s, -1.45, 1.45); });
  document.addEventListener('contextmenu', e => { if (screen === 'play') e.preventDefault(); });
  document.addEventListener('wheel', e => { if (!playing()) return; if (ui.place) rotatePlace(e.deltaY > 0 ? 1 : -1); else cycleTool(e.deltaY > 0 ? 1 : -1); }, { passive: true });
  function cycleTool(d) { const list = hotbar().map(h => h.k); const i = list.indexOf(PL.tool); act.select(list[(i + d + list.length) % list.length]); }
  const hotbar = () => [...Object.keys(TOOLS).filter(t => PL.tools[t] && !TOOLS[t].up).map(t => ({ k: t, n: TOOLS[t].n })), ...(foods().length ? [{ k: 'food', n: itemName(foods()[0]) }] : []), ...((INV.water || 0) > 0 ? [{ k: 'water', n: 'Fresh water' }] : [])];
  function keyEvent(code, down) {
    IN.keys[code] = down; if (!down) return;
    if (screen === 'menu') { if (code === 'Enter') menuStart(); return; }
    if (code === 'KeyO') { panel = panel === 'settings' ? null : 'settings'; panel ? unlockMouse() : lockMouse(); return; }
    if (code === 'KeyC') { panel = panel === 'craft' ? null : 'craft'; panel ? unlockMouse() : lockMouse(); return; }
    if (code === 'KeyI' || code === 'Tab') { panel = panel === 'inv' ? null : 'inv'; panel ? unlockMouse() : lockMouse(); return; }
    if (panel) { if (code === 'Escape') panel = null; return; }
    if (code === 'KeyE') act.interact();
    if (code === 'KeyQ') drink();
    if (code === 'KeyF') eat() || say('No food. Fish with the rod (C to craft one)', '#cfd6e2');
    if (code === 'KeyH') { CFG.keys = !CFG.keys; saveCfg(); }
    if (code === 'KeyR') { if (ui.place) rotatePlace(1); else act.alt(); }
    if (code === 'KeyB') { if (PL.tools.hammer) { if (PL.tool !== 'hammer') act.select('hammer'); else if (!ui.buildOpen) { ui.buildOpen = true; ui.buildPage = 0; } else if (!ui.buildPage) ui.buildPage = 1; else ui.buildOpen = false; } else say('Craft a hammer first (C)', '#cfd6e2'); }
    const num = /^Digit([0-9])$/.exec(code);
    if (num) { const n = +num[1] || 10; const bk = BUILD_ORDER[(ui.buildPage || 0) * BUILD_PAGE + n - 1]; if (PL.tool === 'hammer' && ui.buildOpen && n <= BUILD_PAGE && bk) { ui.buildKind = bk; ui.buildOpen = false; } else { const h = hotbar()[n - 1]; if (h && n <= 9) act.select(h.k); } }
    if (code === 'F8' && devMode) summon();
  }
  function readInput() {
    const k = IN.keys, I = { mx: (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0), mz: (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0), jump: !!k.Space, brace: !!(k.ShiftLeft || k.ShiftRight), use: IN.use };
    if (IN.stick) { const u = uiScale(), dx = IN.stick.x - IN.stick.x0, dy = IN.stick.y - IN.stick.y0, L = Math.hypot(dx, dy), m = cl((L - 8 * u) / (55 * u), 0, 1); if (m > 0) { I.mx = dx / L * m; I.mz = -dy / L * m; } }
    for (const b of IN.held.values()) { if (b === 'jump') I.jump = true; if (b === 'brace') I.brace = true; }
    if (panel) { I.mx = I.mz = 0; I.use = false; }
    return I;
  }
  // the kit hands us every pointer: mouse clicks and each finger
  function pointerDown(x, y, e) {
    audio(); HOV.x = x; HOV.y = y;
    for (let i = zones.length - 1; i >= 0; i--) { const z = zones[i]; if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) { z.fn(e); return; } }
    if (screen !== 'play' || K.state !== 'play' || panel) return;
    const touch = e && e.pointerType === 'touch';
    if (!touch) {
      if (!IN.locked) { lockMouse(); return; }
      if (e.button === 2) act.alt(); else if (e.button === 0) { IN.use = true; act.useDown(); }
      return;
    }
    const id = e.pointerId, b = touchButtons().find(b => Math.hypot(x - b.x, y - b.y) < b.r + 10 * uiScale());
    if (b) {
      if (b.k === 'use') { IN.use = true; IN.useId = id; IN.look = { id, x, y }; act.useDown(); }   // the USE thumb keeps aiming while it holds
      else if (b.k === 'alt') act.alt(); else if (b.k === 'grab') act.interact(); else if (b.k === 'drink') drink(); else if (b.k === 'rotate') rotatePlace(1); else if (b.k === 'tool') cycleTool(1);
      else if (b.k === 'build') { if (PL.tool === 'hammer') ui.buildOpen = !ui.buildOpen; else act.select('hammer'); }
      else IN.held.set(id, b.k);
      return;
    }
    if (x < lp(K.view.x0, K.view.x1, .42)) { if (!IN.stick) IN.stick = { id, x0: x, y0: y, x, y }; } else if (!IN.look) IN.look = { id, x, y };
  }
  function pointerMove(x, y, e) {
    HOV.x = x; HOV.y = y; if (!e || e.pointerType !== 'touch') return;
    const id = e.pointerId;
    if (IN.stick && IN.stick.id === id) { IN.stick.x = x; IN.stick.y = y; }
    if (IN.look && IN.look.id === id && playing()) { const s = (.004 + CFG.sens * .006) / uiScale(); PL.yaw -= (x - IN.look.x) * s; PL.pitch = cl(PL.pitch - (y - IN.look.y) * s, -1.45, 1.45); IN.look.x = x; IN.look.y = y; }
  }
  function pointerUp(x, y, e) {
    const touch = e && e.pointerType === 'touch', id = e && e.pointerId;
    if (!touch) { if (IN.use) { IN.use = false; act.useUp(); } return; }
    if (IN.stick && IN.stick.id === id) IN.stick = null;
    if (IN.look && IN.look.id === id) IN.look = null;
    if (IN.useId === id) { IN.useId = null; IN.use = false; act.useUp(); }
    IN.held.delete(id);
  }
  function resetInput() { IN.keys = {}; IN.use = false; IN.stick = IN.look = null; IN.useId = null; IN.held.clear(); }
