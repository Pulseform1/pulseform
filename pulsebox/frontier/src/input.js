// Keyboard, mouse (pointer lock) and touch. Touch: drag the left half to walk (a floating stick), drag the right half
// to look, and on-screen buttons for the actions.
export class Input {
  constructor(el) {
    this.el = el; this.keys = new Set(); this.pressed = new Set(); this.lookX = 0; this.lookY = 0; this.locked = false;
    this.mouseDown = [false, false, false]; this.clicked = new Set(); this.wheel = 0;
    this.touch = { move: null, look: null, mx: 0, my: 0 }; this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.sens = 1;
    addEventListener('keydown', e => {
      if (e.repeat) return; const k = e.code; this.keys.add(k); this.pressed.add(k);
      if (k === 'Tab' || (['Space', 'ArrowUp', 'ArrowDown'].includes(k) && this.active)) e.preventDefault();
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouseDown = [false, false, false]; });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === el; });
    addEventListener('mousemove', e => { if (this.locked) { this.lookX += e.movementX; this.lookY += e.movementY; } });
    el.addEventListener('mousedown', e => { if (this.isTouchEvent) return; this.mouseDown[e.button] = true; this.clicked.add(e.button); });
    addEventListener('mouseup', e => { this.mouseDown[e.button] = false; });
    el.addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    el.addEventListener('contextmenu', e => e.preventDefault());
    // touch: left half moves, right half looks
    const T = this.touch;
    el.addEventListener('touchstart', e => {
      this.isTouch = true;
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * .45 && !T.move) T.move = { id: t.identifier, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY };
        else if (!T.look) T.look = { id: t.identifier, x: t.clientX, y: t.clientY };
      }
      e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (T.move && t.identifier === T.move.id) { T.move.x = t.clientX; T.move.y = t.clientY; }
        if (T.look && t.identifier === T.look.id) { this.lookX += (t.clientX - T.look.x) * 2.2; this.lookY += (t.clientY - T.look.y) * 2.2; T.look.x = t.clientX; T.look.y = t.clientY; }
      }
      e.preventDefault();
    }, { passive: false });
    const end = e => { for (const t of e.changedTouches) { if (T.move && t.identifier === T.move.id) T.move = null; if (T.look && t.identifier === T.look.id) T.look = null; } };
    el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
  }
  lock() { if (!this.isTouch && this.el.requestPointerLock) { try { const p = this.el.requestPointerLock({ unadjustedMovement: true }); if (p && p.catch) p.catch(() => this.el.requestPointerLock()); } catch { this.el.requestPointerLock(); } } }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  down(code) { return this.keys.has(code); }
  hit(code) { return this.pressed.has(code); }
  press(code) { this.pressed.add(code); } // for touch buttons
  // movement vector: x strafe right, y forward
  move() {
    let x = 0, y = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) y += 1; if (this.down('KeyS') || this.down('ArrowDown')) y -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1; if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    const m = this.touch.move;
    if (m) { const dx = (m.x - m.x0) / 55, dy = (m.y - m.y0) / 55, l = Math.hypot(dx, dy); x = dx / Math.max(1, l); y = -dy / Math.max(1, l); this.touchRun = l > 1.6 || this.runLatch; }
    else this.touchRun = false;
    const l = Math.hypot(x, y); return l > 1 ? { x: x / l, y: y / l } : { x, y };
  }
  endFrame() { this.pressed.clear(); this.clicked.clear(); this.lookX = 0; this.lookY = 0; this.wheel = 0; this.touchFire = false; }
}
