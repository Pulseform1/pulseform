  /* ---------- 90 input: keyboard and mouse, touch, and the click zones the drawn interface uses ----------
     The interface is drawn fresh every frame; as it draws a button it registers a zone, and a press goes to the
     topmost zone under it. Whatever no zone claims belongs to the game: with a mouse, a click captures the pointer;
     by touch, the left of the screen is a movement stick and the right is look, with buttons laid out round the thumb.
     Touch has two helpers a mouse never gets: aim assist (the look slows near the rival and leans toward them) and
     auto-fire (shoots when the crosshair is on them and you are steady). Both can be switched off. */
  const UI = { armory: false, panel: 'home', pick: null, opts: false };
  const zones = []; let ptr = { x: 640, y: 360 }, dragZ = null;
  const inside = (z, x, y) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
  // register a press target for this frame; returns whether the mouse is over it
  const zone = (x, y, w, h, fn, drag) => { const z = { x, y, w, h, fn, drag }; zones.push(z); return !isTouch() && inside(z, ptr.x, ptr.y); };
  const zoneAt = (x, y) => { for (let i = zones.length - 1; i >= 0; i--) if (inside(zones[i], x, y)) return zones[i]; return null; };
  /* menus by keyboard: the arrows move a highlight to the nearest button that way, Enter or Space presses it, left and right
     nudge a slider. It works by moving the pointer the menus already follow, so hover, highlight and press stay one path. */
  const KNAV = { on: false };
  const navZones = () => zones.filter(z => z.w * z.h < 1280 * 720 * .45 && z.w > 6 && z.h > 6);
  const zc = z => [z.x + z.w / 2, z.y + z.h / 2];
  const navAt = () => { const l = navZones(); for (let i = l.length - 1; i >= 0; i--) if (inside(l[i], ptr.x, ptr.y)) return l[i]; return null; };
  function navMove(dx, dy) {
    const list = navZones(); if (!list.length) return;
    const cur = KNAV.on ? navAt() : null;
    if (cur && cur.drag && dx) { const nx = cl(ptr.x + dx * cur.w * .05, cur.x + 1, cur.x + cur.w - 1); ptr = { x: nx, y: ptr.y }; cur.fn(nx, ptr.y); click(); return; }
    if (!cur) { const first = list.find(z => z.prime) || list.reduce((a, z) => (z.w * z.h > a.w * a.h ? z : a), list[0]); KNAV.on = true; const [x, y] = zc(first); ptr = { x, y }; return; }
    const [cx, cy] = zc(cur); let best = null, bs = 1e9;
    for (const z of list) { if (z === cur) continue; const [x, y] = zc(z), along = (x - cx) * dx + (y - cy) * dy, perp = Math.abs((x - cx) * dy - (y - cy) * dx); if (along < 4 || (dx && perp > Math.max(cur.h, z.h) * .75)) continue; const s = along + perp * 2.2; if (s < bs) { bs = s; best = z; } }
    if (best) { const [x, y] = zc(best); ptr = { x, y }; click(); }
  }
  function navGo() { const z = KNAV.on && navAt(); if (!z) return false; if (z.drag) z.fn(ptr.x, ptr.y); else z.fn(); return true; }
  function drawNav(g) { if (!KNAV.on) return; const z = navAt(); if (!z) return; g.save(); g.strokeStyle = YOU; g.lineWidth = 3; g.shadowColor = YOU; g.shadowBlur = 12; rr(g, z.x - 4, z.y - 4, z.w + 8, z.h + 8, 10, null, YOU, 3); g.restore(); }
  // screen pixels per world unit, and the factor that keeps touch targets and text big enough on a small screen
  const pxPer = () => innerWidth / (K.view.x1 - K.view.x0);
  const uiScale = () => isTouch() ? cl(.62 / pxPer(), 1, 2) : cl(.8 / pxPer(), 1, 1.5);
  // a height for something you press: scaled like everything else, but never under `min` real pixels on a touch screen
  const tapH = (h, min = 44) => isTouch() ? Math.max(h * uiScale(), min / pxPer()) : h * uiScale();

  /* ---------- keyboard and mouse ---------- */
  let keys = {}; const mouse = { l: false, tap: false };   // tap: a press not yet seen by a tick (a quick click can start and end between two)
  const KM = { KeyW: 'w', ArrowUp: 'w', KeyS: 's', ArrowDown: 's', KeyA: 'a', ArrowLeft: 'a', KeyD: 'd', ArrowRight: 'd', ShiftLeft: 'walk', ShiftRight: 'walk', KeyZ: 'walk', ControlLeft: 'crouch', ControlRight: 'crouch', Space: 'jump', KeyF: 'use', KeyV: 'fire' };   // V fires too (handy on a trackpad)
  // trackpad aiming: the system's pointer acceleration stays on (raw input feels dead on a trackpad), its own speed, and a light assist
  const trackpad = () => CFG.aim === 'trackpad' && !isTouch();
  const WHEEL = { acc: 0, t: 0, cd: 0, small: 0 };
  const cvEl = () => document.getElementById('cv');
  const locked = () => document.pointerLockElement === cvEl();
  // lock the mouse with raw input (no system acceleration) where the browser offers it; in full screen also lock the
  // keyboard, which is the only way to stop Ctrl+W and friends reaching the browser while you crouch-walk
  function grabMouse() {
    if (isTouch() || K.bot) return; const c = cvEl(); if (!c || !c.requestPointerLock) return;
    try { const q = trackpad() ? c.requestPointerLock() : c.requestPointerLock({ unadjustedMovement: true }); if (q && q.catch) q.catch(() => { try { c.requestPointerLock(); } catch (e) {} }); } catch (e) { try { c.requestPointerLock(); } catch (e2) {} }
    if (CFG.full && document.fullscreenEnabled && !document.fullscreenElement) try { const q = document.documentElement.requestFullscreen({ navigationUI: 'hide' }); if (q && q.then) q.then(() => { try { const k = navigator.keyboard; if (k && k.lock) k.lock().catch(() => {}); } catch (e) {} }).catch(() => {}); } catch (e) {}
  }
  function openOpts(on) { if (!!UI.opts === !!on) return; UI.opts = on ? 'main' : false; if (on) releaseMouse(); else if (!UI.armory && playing()) grabMouse(); }
  function releaseMouse() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} }
  const playing = () => M && screen === 'play' && K.state === 'play' && !M.over;
  // The armory never lets go of the mouse: while it is open a cursor of our own moves over it (so closing it, by hand or
  // when the round goes live, puts you straight back in the fight; a browser will not hand the mouse back without a click)
  function openArmory(open) {
    if (!M || open === UI.armory) return; UI.armory = open;
    if (open) { if (locked()) ptr = { x: 640, y: 420 }; } else { if (!locked()) grabMouse(); setReady(me()); }
  }
  const vcursor = () => locked() && UI.armory && screen === 'play';
  function drawCursor(g) { if (!vcursor()) return; const x = ptr.x, y = ptr.y, s = uiScale(); g.save(); g.fillStyle = '#fff'; g.strokeStyle = 'rgba(10,12,16,.9)'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 20 * s); g.lineTo(x + 5.5 * s, y + 15 * s); g.lineTo(x + 9.5 * s, y + 23 * s); g.lineTo(x + 13 * s, y + 21.5 * s); g.lineTo(x + 9 * s, y + 13.5 * s); g.lineTo(x + 15.5 * s, y + 13.5 * s); g.closePath(); g.stroke(); g.fill(); g.restore(); }
  /* keybinds: every action has its usual key, and CFG.binds holds the ones you have changed. A key you press is turned into
     the usual key for what it does (or into nothing, if its usual job now lives on another key), so everything below reads
     the usual keys. The arrows, right Shift and Ctrl and Z keep working beside your binds; Escape and Enter are never bound. */
  const BINDS = [['fwd', 'Forward', 'KeyW'], ['back', 'Back', 'KeyS'], ['left', 'Left', 'KeyA'], ['right', 'Right', 'KeyD'], ['jump', 'Jump', 'Space'], ['crouch', 'Crouch', 'ControlLeft'], ['walk', 'Walk', 'ShiftLeft'],
    ['use', 'Use / plant / defuse', 'KeyF'], ['fire', 'Fire (key)', 'KeyV'], ['reload', 'Reload', 'KeyR'], ['s1', 'Main gun', 'Digit1'], ['s2', 'Sidearm', 'Digit2'], ['s3', 'Knife', 'Digit3'],
    ['nade', 'Grenade', 'KeyG'], ['abc', 'Ability C', 'KeyC'], ['abq', 'Ability Q', 'KeyQ'], ['abe', 'Ability E', 'KeyE'], ['abx', 'Ultimate', 'KeyX'], ['trig', 'Trigger device (Tessel)', 'Digit4'],
    ['inspect', 'Inspect', 'KeyY'], ['drop', 'Drop gun', 'KeyT'], ['dropc', 'Drop charge', 'KeyH'], ['ping', 'Ping', 'KeyJ'], ['armory', 'Armory', 'KeyB'], ['opts', 'Settings', 'KeyO']];
  const BIND_DEF = Object.fromEntries(BINDS.map(b => [b[0], b[2]]));
  const bindOf = id => (CFG.binds && CFG.binds[id]) || BIND_DEF[id];
  function remapKey(c) {
    const B = CFG.binds; if (!B || !c) return c;
    for (const id in B) if (B[id] === c) return BIND_DEF[id] || c;   // a key you bound: the usual key for its action
    for (const [id, , def] of BINDS) if (def === c && B[id] && B[id] !== c) return null;   // a usual key whose action has moved
    return c;
  }
  // bind an action to a key; whatever had that key takes this action's old one, so no key ever does two things
  function setBind(id, code) {
    const B = Object.assign({}, CFG.binds || {}), old = bindOf(id), other = BINDS.find(b => b[0] !== id && bindOf(b[0]) === code);
    B[id] = code; if (other) B[other[0]] = old;
    for (const k of Object.keys(B)) if (B[k] === BIND_DEF[k]) delete B[k];
    CFG.binds = B; keys = {}; saveAll();
  }
  const KEY_NAMES = { Space: 'SPACE', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT', Tab: 'TAB', CapsLock: 'CAPS', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backspace: 'BKSP', ArrowUp: '\u2191', ArrowDown: '\u2193', ArrowLeft: '\u2190', ArrowRight: '\u2192' };
  const keyName = code => KEY_NAMES[code] || String(code || '').replace(/^Key|^Digit/, '').replace(/^Numpad/, 'NUM ').toUpperCase();
  const keyLabel = id => keyName(bindOf(id));
  function keyEvent(c, d) {
    // waiting for a key to bind (Escape leaves it as it was)
    if (UI.bindWait) { if (d) { if (c !== 'Escape' && c !== 'Enter') setBind(UI.bindWait, c); UI.bindWait = null; } return; }
    const raw = c; c = remapKey(c);
    // crouch while running with the knife is a slide (a short press, so toggle-crouch doesn't leave you ducked after it); otherwise toggle crouch flips on each fresh press
    if (KM[c] === 'crouch' && d && !keys.crouch) { if (M && canSlide(me())) keys.slideAt = performance.now(); else if (CFG.crouch === 'toggle') keys.crouchT = !keys.crouchT; }
    if (KM[c] === 'fire' && d && !keys.fire) mouse.tap = true;   // a quick V tap fires even if it starts and ends between two frames, like a click
    if (KM[c]) keys[KM[c]] = d;
    if (!d) return;
    if (screen === 'select') return selectKey(raw);
    const arrow = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[raw];
    if (screen === 'menu' || screen === 'over' || (screen === 'play' && (UI.armory || UI.opts))) {
      if (arrow) return navMove(arrow[0], arrow[1]);
      if ((raw === 'Enter' || raw === 'Space') && navGo()) return;
      if (raw === 'Escape' && screen === 'menu' && UI.panel !== 'home') { UI.panel = 'home'; KNAV.on = false; return; }
    }
    if (screen === 'menu') { if (raw === 'Enter' && UI.panel === 'home') menuPlay(); return; }
    if (screen === 'over') { if (raw === 'Enter') toMenu(); return; }
    if (!playing()) return; const P = me();
    if (c === 'Space' && !P.alive && UI.spec && M.mode !== 'range') { nextSpec(); return; }   // dead: Space moves to the next teammate
    if (c === 'KeyO') return openOpts(!UI.opts);
    if (c === 'KeyB' && canBuy()) return openArmory(!UI.armory);
    if (UI.armory) return;
    if (c === 'KeyR') reload(P); else if (c === 'Digit1') switchTo(P, 1); else if (c === 'Digit2') switchTo(P, 2); else if (c === 'Digit3') switchTo(P, 3);
    else if (c === 'KeyG') throwNade(P); else if (c === 'KeyC') readyAb(P, 'c'); else if (c === 'KeyQ') readyAb(P, 'q'); else if (c === 'KeyE') readyAb(P, 'e'); else if (c === 'KeyX') readyAb(P, 'x');   // ready it (the key again puts it away); a click uses it
    else if (c === 'Digit4') tesselTrigger(P);   // Tessel: fire the dormant device under the crosshair
    else if (c === 'KeyY' && X && P.alive && P.reloadT <= 0) startInspect(P);
    else if (c === 'KeyT') dropHeld(P); else if (c === 'KeyH') dropCharge(P); else if (c === 'KeyJ') ping(P);   // drop the gun in your hand, or the charge, for a teammate
  }
  if (typeof document !== 'undefined') {
    // while you play, keys the game uses (and Ctrl combinations, since Ctrl crouches) do not reach the browser
    addEventListener('keydown', e => { if (playing() && (e.ctrlKey || e.altKey || KM[remapKey(e.code)] || /^(Key[BRQEFYOXTHJC]|Digit[1-4]|Tab)$/.test(remapKey(e.code) || '') || (CFG.binds && Object.values(CFG.binds).includes(e.code)))) e.preventDefault(); }, true);
    document.addEventListener('mousemove', e => { if (!locked() || !playing()) return; if (Math.abs(e.movementX) > 500 || Math.abs(e.movementY) > 500) return;   // some browsers send a wild jump when the lock starts
      if (UI.armory) { const V = K.view, s = 1 / pxPer(); ptr = { x: cl(ptr.x + e.movementX * s, V.x0 + 2, V.x1 - 4), y: cl(ptr.y + e.movementY * s, V.y0 + 2, V.y1 - 4) }; KNAV.on = false; if (dragZ) dragZ.fn(ptr.x, ptr.y); return; }   // the armory's cursor
      const P = me(); if (!P.alive) return;   // the dead don't turn: the body stays as it fell
      const s = .0022 * (trackpad() ? CFG.tpsens * TS.slow : CFG.sens) / zoomOf(P) * (P.scoped ? CFG.zsens : 1); TS.mvT = performance.now(); P.yaw -= e.movementX * s; P.pitch = cl(P.pitch - e.movementY * s, -1.45, 1.45); });
    // (on a Mac, Ctrl+click arrives as a right click: while crouching that is still a shot)
    document.addEventListener('mousedown', e => { if (M && screen === 'play' && !me().alive && UI.spec && X) { nextSpec(); return; } if (!locked() || !playing()) return;
      if (UI.armory) { if (e.button === 0) { const z = zoneAt(ptr.x, ptr.y); if (z) { if (z.drag) dragZ = z; z.fn(ptr.x, ptr.y); } } else if (e.button === 2) { const z = zoneAt(ptr.x, ptr.y); if (z && z.alt) z.alt(); } return; }   // a click on the armory, at our cursor
      if (e.button === 0 || (e.button === 2 && e.ctrlKey)) mouse.l = mouse.tap = true; else if (e.button === 2) altAction(me()); else if (e.button === 1) { e.preventDefault(); ping(me()); } });
    document.addEventListener('mouseup', e => { if (e.button === 0 || (e.button === 2 && e.ctrlKey)) mouse.l = false; if (vcursor()) dragZ = null; });
    document.addEventListener('contextmenu', e => { if (screen === 'play') e.preventDefault(); });
    // the wheel changes weapon, one step per notch; a trackpad's two-finger swipe sends a stream of tiny steps, so they add up
    // to a notch first (and a swipe like that is how we notice a trackpad, and offer trackpad aiming)
    document.addEventListener('wheel', e => { if (screen === 'play' && e.ctrlKey) e.preventDefault();
      const t = performance.now(), d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      if (e.deltaMode === 0 && Math.abs(d) > 0 && (Math.abs(d) < 12 || d % 1 !== 0)) WHEEL.small++;
      if (WHEEL.small >= 6 && !CFG.aimSet && CFG.aim !== 'trackpad' && !isTouch()) { CFG.aim = 'trackpad'; saveAll(); toast('Trackpad found: trackpad aiming is on (Settings to change)'); if (locked()) { releaseMouse(); grabMouse(); } }
      if (!locked() || !playing()) return;
      if (t - WHEEL.t > 260) WHEEL.acc = 0; WHEEL.t = t; WHEEL.acc += d;
      if (Math.abs(WHEEL.acc) >= 40 && t > WHEEL.cd) { cycleWeapon(me(), WHEEL.acc > 0 ? 1 : -1); WHEEL.acc = 0; WHEEL.cd = t + (Math.abs(d) < 40 ? 320 : 60); } }, { passive: false });   // Ctrl+wheel would zoom the page
  }

  /* ---------- touch ---------- */
  let PDN = 0;   // presses so far
  const TS = { stick: null, look: null, fire: null, held: new Map(), crouch: false, slow: 1, onT: 0, slideAt: 0, sprint: false };
  // where each touch button sits by default (round the right thumb, in the HUD's units) and how big. Settings > Button
  // layout moves and sizes them (CFG.tlay: per button an offset from here, in the HUD's units, and a size), so a layout
  // holds on any screen; it is saved with the other settings, which go to your account
  const TOUCH_KEYS = ['fire', 'alt', 'jump', 'crouch', 'reload', 'swap', 'c', 'q', 'e', 'x', 'nade', 'use', 'drop', 'trig'];
  function touchHome(k) {
    const V = K.view, u = uiScale(), fx = V.x1 - 150 * u, fy = V.y1 - 150 * u;
    if (k === 'move') return [V.x0 + 170 * u, V.y1 - 150 * u, 62];
    return { fire: [fx, fy, 62], alt: [fx - 22 * u, fy - 116 * u, 38], jump: [fx + 104 * u, fy - 44 * u, 38], crouch: [fx + 100 * u, fy + 66 * u, 36], reload: [fx - 110 * u, fy + 56 * u, 36], swap: [fx + 72 * u, fy - 128 * u, 36],
      c: [fx - 282 * u, fy - 60 * u, 34], q: [fx - 118 * u, fy - 46 * u, 38], x: [fx - 290 * u, fy + 30 * u, 36], e: [fx - 204 * u, fy + 4 * u, 38], nade: [fx - 196 * u, fy - 104 * u, 34], use: [640, V.y1 - 200 * u, 58], drop: [fx - 300 * u, fy - 150 * u, 32], trig: [fx - 110 * u, fy - 192 * u, 40] }[k];
  }
  const touchSize = k => (((CFG.tlay || {})[k] || {}).s) || 1;
  function touchAt(k) {
    const V = K.view, u = uiScale(), h = touchHome(k), o = (CFG.tlay || {})[k] || {}, r = h[2] * u * (o.s || 1);
    return { x: cl(h[0] + (o.x || 0) * u, V.x0 + r, V.x1 - r), y: cl(h[1] + (o.y || 0) * u, V.y0 + r, V.y1 - r), r };
  }
  // the buttons as they are right now: where they sit, and `show` says whether each is offered
  function touchButtons() {
    const V = K.view, u = uiScale(), P = me(), G = gun(P), live = M.phase === 'live', op = OPS[P.op], at = touchAt;
    const orbNear = !!(M.orbs && M.orbs.some(o => !o.taken && Math.hypot(o.x - P.x, o.z - P.z) < ORB.r)), doorNear = GATES.length > 0 && gateNear(P) >= 0;
    const near = M.planted && Math.hypot(P.x - M.planted.x, P.z - M.planted.z) < 1.7, canUse = live && P.alive && M.mode !== 'range' && (sideOf(P) === 'att' ? !M.planted && onSite(P.x, P.z) && (carries(P) || !M.charge) : near && !M.defused);
    return [
      { k: 'fire', ...at('fire'), t: G.melee ? 'SLASH' : 'FIRE', show: P.alive },
      { k: 'alt', ...at('alt'), t: G.melee ? 'STAB' : G.scope ? 'SCOPE' : G.ads ? 'AIM' : 'BURST', show: P.alive && !!(G.melee || G.scope || G.ads || G.alt), on: !!P.scoped },
      { k: 'jump', ...at('jump'), t: 'JUMP', show: P.alive },
      { k: 'crouch', ...at('crouch'), t: canSlide(P) ? 'SLIDE' : 'DUCK', show: P.alive, on: TS.crouch || !!P.slide },
      { k: 'reload', ...at('reload'), t: 'LOAD', show: P.alive && !G.melee },
      { k: 'swap', ...at('swap'), t: 'SWAP', show: P.alive },
      { k: 'c', ...at('c'), t: op.c.n.toUpperCase() + (op.c.max > 1 ? ' ' + (P.ab.c | 0) : ''), show: P.alive && live, off: !P.ab.c && !P.tether && !irisEye(P), on: P.rdy === 'c', col: op.col },
      { k: 'q', ...at('q'), t: op.q.n.toUpperCase() + (op.q.max > 1 ? ' ' + (P.ab.q | 0) : ''), show: P.alive && live, off: !P.ab.q, on: P.rdy === 'q', col: op.col },
      { k: 'x', ...at('x'), t: P.ult >= ultCost(P) ? op.x.n.toUpperCase() : `ULT ${P.ult | 0}/${ultCost(P)}`, show: P.alive && live, off: P.ult < ultCost(P), on: P.rdy === 'x', col: op.col },
      { k: 'e', ...at('e'), t: op.e.n.toUpperCase(), show: P.alive && live, off: !P.ab.e, on: P.rdy === 'e', col: op.col },
      { k: 'nade', ...at('nade'), t: 'SMOKE ' + (P.smokes || 0), show: P.alive && live && P.smokes > 0, off: !(P.smokes > 0), col: NADE.col },
      { k: 'use', ...at('use'), t: P.nearLoot ? (lootFree(P) ? 'PICK UP' : 'SWAP GUN') : orbNear ? 'TAKE ORB' : canUse ? (sideOf(P) === 'att' ? 'PLANT' : 'DEFUSE') : 'DOOR', show: canUse || (P.alive && !!P.nearLoot) || (live && P.alive && (orbNear || doorNear)), col: P.nearLoot ? BONE : orbNear ? op.col : FOE },
      { k: 'trig', ...at('trig'), t: 'TRIGGER', show: P.alive && live && P.op === 'tessel' && tesselState(P) === 'ok', col: op.col },   // (only while a dormant device can be fired)
      { k: 'drop', ...at('drop'), t: carries(P) && !M.planted ? 'DROP ◆' : 'DROP', show: P.alive && M.mode !== 'range' && M.phase !== 'end' && ((carries(P) && !M.planted) || (M.phase === 'buy' && !!(P.guns[1] || P.guns[2] !== 'pip'))), col: carries(P) ? GOLD : BONE },
    ].filter(b => b.show);
  }
  function touchDown(x, y, id) {
    for (const b of touchButtons()) if (Math.hypot(x - b.x, y - b.y) < b.r + 8 * uiScale()) {
      const P = me(); click();
      if (b.k === 'fire') { TS.fire = id; TS.tap = true; TS.look = { id, x, y }; try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} }   // the fire thumb keeps aiming while it holds
      else if (b.k === 'alt') altAction(P); else if (b.k === 'reload') reload(P); else if (b.k === 'swap') cycleWeapon(P); else if (b.k === 'crouch') { if (canSlide(me())) TS.slideAt = performance.now(); else TS.crouch = !TS.crouch; }
      // an ability button readies it (FIRE uses it, the alt button its other way; tap again to put it away)
      else if (b.k === 'c' || b.k === 'q' || b.k === 'e' || b.k === 'x') readyAb(P, b.k);
      else if (b.k === 'trig') tesselTrigger(P); else if (b.k === 'nade') throwNade(P); else if (b.k === 'drop') { if (!(carries(P) && dropCharge(P))) dropHeld(P); } else TS.held.set(id, b.k);   // (USE and JUMP are held)
      return;
    }
    if (M && screen === 'play' && !me().alive && UI.spec && X && M.mode !== 'range') { nextSpec(); return; }   // dead: a tap moves to the next teammate
    if (x < lp(K.view.x0, K.view.x1, .45)) { if (!TS.stick) TS.stick = { id, x0: x, y0: y, x, y }; } else if (!TS.look) TS.look = { id, x, y };
  }
  function touchMove(x, y, id) {
    if (TS.stick && TS.stick.id === id) { TS.stick.x = x; TS.stick.y = y; }
    if (TS.look && TS.look.id === id && M) { const P = me(), s = .0052 * CFG.tsens * TS.slow / zoomOf(P) / uiScale() * (P.scoped ? CFG.zsens : 1); if (P.alive) { P.yaw -= (x - TS.look.x) * s; P.pitch = cl(P.pitch - (y - TS.look.y) * s, -1.4, 1.4); } TS.look.x = x; TS.look.y = y; }   // (the dead don't turn)
  }
  function touchUp(id) { if (TS.stick && TS.stick.id === id) TS.stick = null; if (TS.look && TS.look.id === id) TS.look = null; if (TS.fire === id) TS.fire = null; TS.held.delete(id); }
  function resetInput() { keys = {}; mouse.l = mouse.tap = false; TS.tap = false; UI.opts = false; TS.stick = TS.look = TS.fire = null; TS.held.clear(); TS.crouch = false; dragZ = null; }

  // presses from the kit (mouse) and from our own touch listeners all arrive here, in HUD units
  function pointerDown(x, y, id, touch) {
    ptr = { x, y }; PDN++; const z = zoneAt(x, y);
    if (z) { if (z.drag) dragZ = z; z.fn(x, y); return; }
    if (!playing() || UI.armory || UI.opts) return;
    if (touch) touchDown(x, y, id); else if (!locked()) { grabMouse(); if (M.phase !== 'buy') mouse.tap = true; }   // the click that takes the mouse back shoots too
  }
  function pointerMove(x, y, id, touch) { if (KNAV.on && Math.hypot(x - ptr.x, y - ptr.y) < 3) return; KNAV.on = false; ptr = { x, y }; if (dragZ) dragZ.fn(x, y); else if (touch && playing()) touchMove(x, y, id); }
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
    const now = performance.now(), sliding = now - (keys.slideAt || 0) < 260 || now - TS.slideAt < 260;
    if (sliding) { keys.crouchT = false; TS.crouch = false; }
    const I = { mx: (keys.d ? 1 : 0) - (keys.a ? 1 : 0), mz: (keys.w ? 1 : 0) - (keys.s ? 1 : 0), walk: !!keys.walk, crouch: sliding || (CFG.crouch === 'toggle' ? !!keys.crouchT : !!keys.crouch) || TS.crouch, jump: !!keys.jump, use: !!keys.use, fire: mouse.l || !!keys.fire, rapid: false };
    if (keys.fire && !keys.fireSeen) { I.press = true; } keys.fireSeen = !!keys.fire;
    for (const k of TS.held.values()) { if (k === 'jump') I.jump = true; if (k === 'use') I.use = true; }
    if (TS.stick) {   // how far the thumb has pushed is how fast you go
      const u = uiScale(), ss = touchSize('move'), dx = TS.stick.x - TS.stick.x0, dy = TS.stick.y - TS.stick.y0, L = Math.hypot(dx, dy), m = cl((L - 9 * u) / (56 * u * ss), 0, 1);
      if (m > 0) { I.mx = dx / L * m; I.mz = -dy / L * m; }
    }
    if (TS.fire != null || TS.tap) { I.fire = true; I.rapid = true; if (TS.tap) I.press = true; } TS.tap = false;
    if (mouse.tap) { I.fire = true; I.press = true; mouse.tap = false; }   // a fresh press: a new trigger pull, even if the last one has not been seen to let go
    if (isTouch() && f.alive && M.phase === 'live') assist(f, I); else TS.slow = 1;   // aim assist is for touch screens only: a trackpad aims unaided
    if (UI.armory) I.fire = false;
    return I;
  };
  function assist(f, I) {
    // the rival to help with: of those you can see, the one nearest your crosshair (not just the nearest, who may be behind a wall)
    const G = gun(f); TS.slow = 1; let e = null, eo = 1e9;
    for (const q of M.fs) { if (q.team === f.team || !q.alive || q.gone) continue; const o = Math.abs(angDiff(yawTo(f.x, f.z, q.x, q.z), f.yaw)); if (o < eo && canSee(f, q)) { eo = o; e = q; } }
    if (!e) { TS.onT = 0; return; }
    const d = Math.hypot(e.x - f.x, e.z - f.z), dy = angDiff(yawTo(f.x, f.z, e.x, e.z), f.yaw), dp = Math.atan2(e.y + lp(1.25, .85, e.crouch) - eyeY(f), d) - f.pitch, off = Math.hypot(dy, dp);
    if (CFG.assist) {
      if (off < .08) TS.slow = .55;
      if (off < .12 && (TS.stick || TS.look || I.fire)) { const r = .5 / 60 * (1 - off / .12); f.yaw += cl(dy, -r, r); f.pitch += cl(dp, -r, r); }
    }
    if (CFG.autofire && isTouch()) {
      const pt = patOf(f, G), S = castShot(f, viewDir(f.yaw + pt[0], f.pitch + pt[1])), onTarget = S.hit && (!G.melee || S.dist < 2.2);
      TS.onT = onTarget ? TS.onT + 1 / 60 : 0;
      if (TS.onT > .1 && (G.melee || spreadOf(f) < Math.max(.014, Math.atan2(.3, d) * 1.6)) && (!G.scope || f.scoped)) { I.fire = true; I.rapid = true; }
    }
  }
