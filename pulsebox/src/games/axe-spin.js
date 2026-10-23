/* Axe Spin: throw axes into a spinning log. Hit an axe that's already there and it's over. Clear the log for the next stage. */
const GAME = {
  id: 'axe-spin', title: 'Axe Spin', tagline: 'Throw. Stick. Don\'t hit another axe!',
  font: 'Bowlby One', accent: '#ffb547', accent2: '#ff5d5d', bg: '#1d1430',
  how: ['Tap, click or press Space to throw an axe at the spinning log.', 'Use up every axe to break the log and reach the next stage.', 'Hit an axe already in the log and it\'s over. Slice apples for coins!'],
  skins: [
    { name: 'Woodsman', price: 0, c: ['#d9dde6', '#8a5a2b'] }, { name: 'Viking', price: 60, c: ['#e8c06a', '#5a3a1e'] }, { name: 'Frost', price: 150, c: ['#bff3ff', '#3a6a9e'] },
    { name: 'Ruby', price: 250, c: ['#ff6b81', '#2b2b2b'] }, { name: 'Jade', price: 400, c: ['#7dffb0', '#1e5a3a'] }, { name: 'Royal', price: 700, c: ['#ffe36e', '#7a2bd6'], glow: true },
  ],
};
(() => {
  const CX = W / 2, CY = 250, LR = 118, AX_Y = 620, SPEED = 2600, HALF = .17;
  let rot, stuck, apples, left, stage, flying, dead, fallen, clearT, pattern, omega, chunks, bounce, tt;
  function axe(gr, s, scale = 1) {
    gr.save(); gr.scale(scale, scale);
    if (s.glow) { gr.shadowColor = s.c[0]; gr.shadowBlur = 16; }
    gr.fillStyle = s.c[1]; gr.beginPath(); gr.roundRect(-6, -10, 12, 120, 5); gr.fill();
    gr.fillStyle = 'rgba(255,255,255,.2)'; gr.fillRect(-3, -6, 3, 110);
    gr.fillStyle = s.c[0]; gr.beginPath(); gr.moveTo(-5, -12); gr.quadraticCurveTo(-40, -30, -46, -2); gr.quadraticCurveTo(-30, 8, -5, 14); gr.closePath(); gr.fill();
    gr.beginPath(); gr.moveTo(5, -8); gr.lineTo(20, -2); gr.lineTo(5, 6); gr.fill();
    gr.shadowBlur = 0; gr.fillStyle = 'rgba(255,255,255,.55)'; gr.beginPath(); gr.moveTo(-42, -6); gr.quadraticCurveTo(-38, -22, -16, -20); gr.lineTo(-18, -14); gr.quadraticCurveTo(-34, -14, -42, -6); gr.fill();
    gr.restore();
  }
  GAME.drawSkin = (gr, s) => { gr.rotate(.5); gr.translate(6, -46); axe(gr, s, .8); };
  function setupStage() {
    const boss = stage % 5 === 0;
    left = Math.min(11, 5 + Math.floor(stage / 2) + (boss ? 2 : 0)); stuck = []; apples = [];
    const pre = boss ? 3 : Math.min(4, Math.floor(stage / 2));
    for (let i = 0; i < pre; i++) { let a, ok; do { a = Math.random() * 6.283; ok = stuck.every(b => Math.abs(angDiff(a, b.a)) > .5); } while (!ok); stuck.push({ a, pre: true }); }
    const na = Math.random() < .7 ? K.irand(1, 2) : 0;
    for (let i = 0; i < na; i++) { let a, ok, n = 0; do { a = Math.random() * 6.283; ok = stuck.every(b => Math.abs(angDiff(a, b.a)) > .45) && apples.every(b => Math.abs(angDiff(a, b.a)) > .5); n++; } while (!ok && n < 50); if (ok) apples.push({ a, gold: Math.random() < .2 }); }
    pattern = boss ? K.irand(1, 3) : stage < 3 ? 0 : K.irand(0, 3); omega = Math.min(4.2, 1.6 + stage * .14) * (Math.random() < .5 ? 1 : -1) * (boss ? 1.15 : 1); tt = 0;
    if (boss) K.toast(`Boss log!`);
  }
  const angDiff = (a, b) => { let d = (a - b) % 6.283; if (d > 3.1416) d -= 6.283; if (d < -3.1416) d += 6.283; return d; };
  function spin(t) { return pattern === 0 ? omega : pattern === 1 ? omega * 1.4 * Math.sin(t * 1.3) : pattern === 2 ? omega * (Math.floor(t / 2.2) % 2 ? -1 : 1) * Math.min(1, (t % 2.2) * 2) : omega * (1 + .85 * Math.sin(t * 2.2)); }
  GAME.reset = () => { rot = 0; stage = 1; flying = null; dead = false; fallen = null; clearT = 0; chunks = []; bounce = null; setupStage(); };
  function throwAxe() { if (dead || flying || clearT > 0 || left <= 0) return; flying = { y: AX_Y }; left--; K.sfx(500, .08, 'triangle', .08, 300); }
  GAME.down = throwAxe;
  GAME.key = (c, d) => { if (d && (c === 'Space' || c === 'Enter' || c === 'ArrowUp')) throwAxe(); };
  let margin = 0;
  GAME.bot = dt => {
    if (dead || flying || clearT > 0) return;
    if (margin) margin = Math.max(HALF + .05, margin - dt * .25);
    const travel = (AX_Y - (CY + LR)) / SPEED, futRot = rot + spin(tt) * travel, local = Math.PI / 2 - futRot;
    if (!margin) margin = Math.random() < .93 ? K.rand(.5, .8) : K.rand(.05, .2);
    if (stuck.every(b => Math.abs(angDiff(local, b.a)) > margin) && Math.random() < .2) { throwAxe(); margin = 0; }
  };
  GAME.update = dt => {
    tt += dt; rot += spin(tt) * dt;
    if (flying) {
      flying.y -= SPEED * dt;
      if (flying.y <= CY + LR) {
        const local = ((Math.PI / 2 - rot) % 6.283 + 6.283) % 6.283;
        if (stuck.some(b => Math.abs(angDiff(local, b.a)) < HALF)) {
          dead = true; bounce = { x: CX, y: CY + LR + 40, vx: K.rand(-300, 300), vy: 600, r: 0 }; flying = null;
          K.shake(16); K.noise(.25, .3, 2000); K.sfx(1200, .15, 'square', .1, -900); K.flash('#ff4d4d', .35); K.over(); return;
        }
        stuck.push({ a: local, t: K.t }); flying = null; K.add(1); K.shake(5); K.noise(.08, .2, 400); K.sfx(140, .12, 'square', .12);
        K.burst(CX, CY + LR, ['#c98a4a', '#8a5a2b', '#ffd9a0'], 8, 240, { life: .4, square: true });
        for (const ap of apples.slice()) if (Math.abs(angDiff(local, ap.a)) < .3) {
          apples.splice(apples.indexOf(ap), 1); K.coin(ap.gold ? 3 : 1, CX, CY + LR); K.burst(CX, CY + LR, ap.gold ? ['#ffe36e', '#fff'] : ['#ff4d5e', '#fff3cf'], 14, 300);
        }
        if (left === 0) {
          clearT = 1.2; const boss = stage % 5 === 0; K.add(boss ? 5 : 2, CX, CY - 60, '#ffe36e'); if (boss) K.coin(5, CX, CY);
          K.chime(523, [0, 4, 7, 12]); K.shake(10); K.noise(.4, .25, 300);
          for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; chunks.push({ x: CX + Math.cos(a) * 40, y: CY + Math.sin(a) * 40, vx: Math.cos(a) * K.rand(300, 600), vy: Math.sin(a) * K.rand(300, 600) - 300, r: a, vr: K.rand(-6, 6) }); }
          for (const b of stuck) chunks.push({ x: CX + Math.cos(b.a + rot) * LR, y: CY + Math.sin(b.a + rot) * LR, vx: Math.cos(b.a + rot) * 500, vy: Math.sin(b.a + rot) * 500 - 200, r: b.a + rot - Math.PI / 2, vr: K.rand(-8, 8), axe: true });
          K.pop(CX, CY, `Stage ${stage} clear!`, '#ffe36e', 44);
        }
      }
    }
    if (clearT > 0) { clearT -= dt; if (clearT <= 0) { stage++; chunks = []; setupStage(); } }
    for (const c of chunks) { c.vy += 1500 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt; }
    if (bounce) { bounce.vy += 1800 * dt; bounce.x += bounce.vx * dt; bounce.y += bounce.vy * dt; bounce.r += 9 * dt; }
  };
  function log(gr, boss) {
    gr.fillStyle = boss ? '#4a2d6a' : '#8a5a2b'; gr.beginPath(); gr.arc(0, 0, LR, 0, 7); gr.fill();
    gr.fillStyle = boss ? '#6a46a0' : '#c98a4a'; gr.beginPath(); gr.arc(0, 0, LR - 12, 0, 7); gr.fill();
    gr.strokeStyle = boss ? 'rgba(255,255,255,.18)' : 'rgba(90,52,21,.6)'; gr.lineWidth = 3;
    for (let r = 20; r < LR - 14; r += 18) { gr.beginPath(); gr.arc(0, 0, r, 0, 7); gr.stroke(); }
    gr.beginPath(); gr.moveTo(0, 0); gr.lineTo(LR - 20, 12); gr.stroke();
    if (boss) { gr.fillStyle = '#ffe36e'; gr.font = '40px "Bowlby One", Arial Black'; gr.textAlign = 'center'; gr.textBaseline = 'middle'; gr.fillText('☠', 0, 2); }
  }
  GAME.draw = gr => {
    const v = K.view, s = K.skin, boss = stage % 5 === 0;
    const gd = gr.createLinearGradient(0, v.y0, 0, v.y1); gd.addColorStop(0, boss ? '#2a0f3a' : '#1d1430'); gd.addColorStop(1, boss ? '#120618' : '#0d0a18');
    gr.fillStyle = gd; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    gr.fillStyle = 'rgba(255,255,255,.04)'; for (let i = 0; i < 9; i++) { gr.beginPath(); gr.arc(CX, CY, 180 + i * 90, 0, 7); gr.fill(); }
    gr.font = '22px "Bowlby One", Arial Black'; gr.textAlign = 'center'; gr.textBaseline = 'middle'; gr.fillStyle = boss ? '#ff8ad8' : '#ffd9a0';
    gr.fillText(boss ? `BOSS · STAGE ${stage}` : `STAGE ${stage}`, CX, 80);
    if (clearT <= 0) {
      gr.save(); gr.translate(CX, CY); gr.rotate(rot);
      for (const b of stuck) { gr.save(); gr.rotate(b.a); gr.translate(LR - 18, 0); gr.rotate(-Math.PI / 2); axe(gr, s); gr.restore(); }
      for (const ap of apples) {
        gr.save(); gr.rotate(ap.a); gr.translate(LR + 18, 0);
        gr.fillStyle = ap.gold ? '#ffcf2e' : '#e8283c'; gr.beginPath(); gr.arc(0, 0, 17, 0, 7); gr.fill();
        gr.fillStyle = 'rgba(255,255,255,.4)'; gr.beginPath(); gr.arc(-5, -6, 5, 0, 7); gr.fill();
        gr.fillStyle = '#4caf50'; gr.beginPath(); gr.ellipse(14, -6, 7, 3, .6, 0, 7); gr.fill(); gr.restore();
      }
      log(gr, boss); gr.restore();
    }
    for (const c of chunks) { gr.save(); gr.translate(c.x, c.y); gr.rotate(c.r); if (c.axe) axe(gr, s); else { gr.fillStyle = boss ? '#6a46a0' : '#c98a4a'; gr.beginPath(); gr.moveTo(0, 0); gr.arc(0, 0, 60, 0, .785); gr.fill(); } gr.restore(); }
    if (flying) { gr.save(); gr.translate(CX, flying.y); axe(gr, s); gr.restore(); }
    else if (!dead && left > 0 && clearT <= 0) { gr.save(); gr.translate(CX, AX_Y + Math.sin(K.t * 5) * 3); axe(gr, s); gr.restore(); }
    if (bounce) { gr.save(); gr.translate(bounce.x, bounce.y); gr.rotate(bounce.r); axe(gr, s); gr.restore(); }
    for (let i = 0; i < left; i++) { gr.save(); gr.translate(60, H - 50 - i * 34); gr.rotate(-Math.PI / 2); axe(gr, s, .32); gr.restore(); }
  };
})();
