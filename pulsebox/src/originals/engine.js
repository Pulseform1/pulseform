'use strict';
/* Pulsebox Originals engine: a 960x600 canvas game in a page that fills the screen (or the hub's frame).
   Each game defines GAMES[id] = { init(), ui(), update(dt), draw(), pointer(type,p), key(k), action(name) } and uses the
   helpers below. The engine adds the start card, pause, sound, a crisp high-DPI canvas, button hover, and the juice:
   particles, pop-up text, ripples, screen shake and a celebration when a game is finished. */
const C = document.getElementById('game'), ctx = C.getContext('2d'), W = 960, H = 600;
const ID = document.body.dataset.game, META = CATALOG.find(x => x.id === ID);
const FONT = 'Nunito, system-ui, -apple-system, "Segoe UI", sans-serif';
let state, paused = true, started = false, last = 0, totalTime = 0, keys = {}, pointer = { x: 0, y: 0, down: false }, audioCtx = null, soundOn = true, buttons = [], uiKey = '', hover = null;
try { soundOn = localStorage.getItem('pbx-pack-sound') !== '0'; } catch (e) {}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t, dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function dailySeed() { return Math.floor(Date.now() / 86400000); }

/* ---------- drawing helpers ---------- */
function rr(x, y, w, h, r, fill, stroke) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } }
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function circle(x, y, r, c, stroke) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); if (c) { ctx.fillStyle = c; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } }
function line(x, y, xx, yy, c, width = 3) { ctx.strokeStyle = c; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(xx, yy); ctx.stroke(); }
function text(s, x, y, size = 18, c = '#f5f0e4', align = 'left', weight = 600) { ctx.font = `${Math.min(900, Math.round(weight / 100) * 100)} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = c; ctx.fillText(String(s), x, y); }
function wrap(s, x, y, max, size = 18, c = '#f5f0e4', lh = 27) {
  ctx.font = `600 ${size}px ${FONT}`; let row = '', yy = y;
  for (const w of s.split(' ')) { if (ctx.measureText(row + w).width > max && row) { text(row, x, yy, size, c, 'left', 600); row = ''; yy += lh; } row += w + ' '; }
  text(row, x, yy, size, c, 'left', 600); return yy + lh;
}
function pill(s, x, y, c = '#d4fa82') { ctx.font = `700 12px ${FONT}`; rr(x, y, ctx.measureText(s).width + 24, 28, 14, '#25303a'); text(s, x + 12, y + 14, 12, c, 'left', 700); }
function board(bg = '#19242b') {
  rect(0, 0, W, H, bg);
  const g = ctx.createRadialGradient(W / 2, H * .35, 60, W / 2, H / 2, W * .75); g.addColorStop(0, 'rgba(255,255,255,.05)'); g.addColorStop(1, 'rgba(0,0,0,.28)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let x = 20; x < W; x += 32) for (let y = 20; y < H; y += 32) circle(x, y, 1, '#ffffff0a');
}
function heading(a, b, c = META.color) { text(a, 34, 37, 15, c, 'left', 900); text(b, 926, 37, 13, '#aeb7c5', 'right', 700); line(32, 65, 928, 65, '#ffffff15', 1); }
// a button drawn on the canvas: it lifts and brightens under the pointer and dips when pressed
function btn(label, x, y, w, h, fn, color = '#303b46') {
  const on = hover && hover.x === x && hover.y === y && hover.w === w, dn = on && pointer.down, oy = dn ? 2 : on ? -1 : 0;
  rr(x, y + 3, w, h, 9, 'rgba(0,0,0,.28)'); rr(x, y + oy, w, h, 9, color); if (on) rr(x, y + oy, w, h, 9, 'rgba(255,255,255,.1)');
  rr(x + 1, y + oy + 1, w - 2, h * .45, 8, 'rgba(255,255,255,.06)');
  text(label, x + w / 2, y + h / 2 + oy, 15, '#f6f4ed', 'center', 800); buttons.push({ x, y, w, h, fn });
}
// the end of a game: a card with a replay button, and a celebration (once per game)
let doneFor = null;
function done(title, sub) {
  if (doneFor !== state) { doneFor = state; celebrate(!/interrupt|locked|lost|fail|over|bust|out of/i.test(title)); }
  rect(0, 0, W, H, 'rgba(8,10,16,.45)');
  rr(180, 182, 600, 232, 20, '#111921f5', META.color + '88'); rr(180, 182, 600, 6, 3, META.color);
  text(title, 480, 240, 36, META.color, 'center', 900); wrap(sub, 225, 290, 510, 18, '#dae0e4');
  btn('Play again', 365, 352, 230, 46, () => reset(), shade(META.color, -.45));
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16), f = v => Math.round(clamp(k < 0 ? v * (1 + k) : v + (255 - v) * k, 0, 255)); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; }

/* ---------- juice: particles, pop-up text, ripples, shake ---------- */
const FX = { parts: [], pops: [], rings: [], shake: 0 };
function burst(x, y, cols = [META.color, '#ffffff'], n = 16, sp = 240) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = sp * (.3 + Math.random() * .7); FX.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * .3, life: .7 + Math.random() * .5, max: 1.2, c: cols[i % cols.length], s: 3 + Math.random() * 4, g: 520, rot: Math.random() * 6, conf: false }); } }
function confetti() { const cols = [META.color, '#ffffff', '#ffd23f', '#ff7ad9', '#5fe08a', '#7cc8ff']; for (let i = 0; i < 110; i++) FX.parts.push({ x: Math.random() * W, y: -20 - Math.random() * 200, vx: (Math.random() - .5) * 120, vy: 80 + Math.random() * 160, life: 3 + Math.random(), max: 4, c: cols[i % cols.length], s: 5 + Math.random() * 5, g: 140, rot: Math.random() * 6, conf: true }); }
function popText(x, y, s, c = META.color) { FX.pops.push({ x, y, s, c, t: 0 }); }
function ripple(x, y, c = '#ffffff') { FX.rings.push({ x, y, c, t: 0 }); }
function shake(a = 6) { FX.shake = Math.max(FX.shake, a); }
function stepFX(dt) {
  for (const p of FX.parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 6; p.life -= dt; if (p.conf) p.vx += Math.sin(p.y * .03) * 20 * dt; }
  FX.parts = FX.parts.filter(p => p.life > 0 && p.y < H + 40);
  for (const q of FX.pops) q.t += dt; FX.pops = FX.pops.filter(q => q.t < 1.1);
  for (const r of FX.rings) r.t += dt; FX.rings = FX.rings.filter(r => r.t < .45);
  FX.shake = Math.max(0, FX.shake - dt * 30);
}
function drawFX() {
  for (const r of FX.rings) { ctx.globalAlpha = 1 - r.t / .45; ctx.strokeStyle = r.c; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(r.x, r.y, 6 + r.t * 70, 0, Math.PI * 2); ctx.stroke(); }
  for (const p of FX.parts) { ctx.globalAlpha = Math.min(1, p.life / .4); ctx.fillStyle = p.c; if (p.conf) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.s * Math.min(1, p.life), 0, Math.PI * 2); ctx.fill(); } }
  for (const q of FX.pops) { const k = q.t / 1.1; ctx.globalAlpha = 1 - k * k; ctx.font = `900 ${26 + 6 * Math.min(1, q.t * 8)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(10,12,18,.7)'; ctx.strokeText(q.s, q.x, q.y - k * 50); ctx.fillStyle = q.c; ctx.fillText(q.s, q.x, q.y - k * 50); }
  ctx.globalAlpha = 1;
}
function celebrate(win) {
  if (win) { confetti(); chord([523, 659, 784, 1047]); shake(8); }
  else { tone(330, .25, 'triangle', .05); tone(247, .4, 'triangle', .05, .18); }
}

/* ---------- sound: small synthesized tones (on by default; the toggle remembers your choice) ---------- */
function ac() { if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); return audioCtx; }
function tone(freq, dur = .1, type = 'triangle', vol = .05, delay = 0) {
  if (!soundOn || !started) return; const a = ac(); if (!a) return;
  try { const t0 = a.currentTime + delay, o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain(); o.type = type; o2.type = 'sine'; o.frequency.value = freq; o2.frequency.value = freq * 2;
    const g2 = a.createGain(); g2.gain.value = .25; o.connect(g); o2.connect(g2); g2.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .012); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur + .05);
    o.start(t0); o2.start(t0); o.stop(t0 + dur + .08); o2.stop(t0 + dur + .08); } catch (e) {}
}
const chord = (fs, gap = .07) => fs.forEach((f, i) => tone(f, .18, 'triangle', .045, i * gap));
function beep(freq = 440, duration = .08) {
  tone(freq, duration, freq < 260 ? 'sawtooth' : 'triangle', freq < 260 ? .035 : .05);
  // the games beep high when something goes right and low when it goes wrong: give each a little feedback
  if (!started) return; if (freq >= 780) { burst(pointer.x, pointer.y, [META.color, '#ffffff', '#ffd23f'], 12, 200); tone(freq * 1.5, .1, 'triangle', .03, .06); } else if (freq < 260) shake(7);
}

/* ---------- the page around the canvas ---------- */
function status(s) { const el = document.getElementById('status'); if (el.textContent === s) return; el.textContent = s; el.classList.remove('show'); void el.offsetWidth; if (s) { el.classList.add('show'); clearTimeout(status.t); status.t = setTimeout(() => el.classList.remove('show'), 3600); } }
let lastMetric = null;
function metric(s) {
  const el = document.getElementById('metric'); if (el.textContent === s) return; el.textContent = s;
  // a number going up (that isn't a percentage or money) is worth a little celebration
  const m = /^[^\d-]*(-?\d+)/.exec(s), n = m ? +m[1] : null;
  if (started && lastMetric != null && n != null && n > lastMetric && !/%|\$|test|fold/i.test(s)) { popText(clamp(pointer.x, 80, W - 80), clamp(pointer.y - 30, 90, H - 40), '+' + (n - lastMetric)); burst(pointer.x, pointer.y, [META.color, '#ffffff', '#ffd23f'], 14, 220); chord([660, 880], .06); }
  lastMetric = n; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}
function controls(html) { if (uiKey !== html) { document.getElementById('controls').innerHTML = html; uiKey = html; } }
function action(label, name, primary = false) { return `<button ${primary ? 'class="primary"' : ''} data-action="${name}">${label}</button>`; }
// progress that survives a reload (levels unlocked, stars, seasons): one small JSON object per game
function loadSave(def) { try { return Object.assign(def, JSON.parse(localStorage.getItem('pbx-pack-save-' + ID) || '{}')); } catch (e) { return def; } }
function storeSave(v) { try { localStorage.setItem('pbx-pack-save-' + ID, JSON.stringify(v)); } catch (e) {} }
function stars(n, x, y, size = 22, max = 3) { for (let i = 0; i < max; i++) text('★', x + (i - (max - 1) / 2) * size * 1.15, y, size, i < n ? '#ffd23f' : '#ffffff30', 'center', 900); }
function saveBest(value) { try { const key = 'pbx-pack-' + ID; const old = Number(localStorage.getItem(key) || 0); if (value > old) localStorage.setItem(key, value); document.getElementById('best').textContent = Math.max(value, old); } catch (e) {} }
function reset() {
  state = GAMES[ID].init(); doneFor = null; lastMetric = null; keys = {}; pointer.down = false; uiKey = ''; FX.parts = []; FX.pops = [];
  if (started && document.getElementById('start').hidden) setPaused(false);   // not behind the help card
  GAMES[ID].ui?.(); render();
}

/* ---------- loop, input, fitting ---------- */
let dpr = 1;
function fit() {
  const st = document.querySelector('.stage').getBoundingClientRect(); let w = st.width, h = w * H / W; if (h > st.height) { h = st.height; w = h * W / H; }
  C.style.width = Math.floor(w) + 'px'; C.style.height = Math.floor(h) + 'px';
  dpr = Math.min(2.5, (window.devicePixelRatio || 1) * w / W); const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
  if (C.width !== bw || C.height !== bh) { C.width = bw; C.height = bh; } render();
}
function render() {
  if (!state) return; buttons = []; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save(); if (FX.shake > 0) ctx.translate((Math.random() - .5) * FX.shake, (Math.random() - .5) * FX.shake);
  GAMES[ID].draw(); ctx.restore(); drawFX();
}
function frame(t) {
  const dt = Math.min((t - last) / 1000 || 0, .04); last = t;
  if (!paused) { totalTime += dt; GAMES[ID].update?.(dt); }
  stepFX(dt); render(); requestAnimationFrame(frame);
}
function point(e) { const r = C.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
const hitBtn = p => buttons.findLast(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
C.addEventListener('pointerdown', e => {
  if (paused) return; e.preventDefault(); C.focus(); ac(); pointer = { ...point(e), down: true }; C.setPointerCapture?.(e.pointerId);
  ripple(pointer.x, pointer.y, META.color);
  const b = hitBtn(pointer); if (b) { tone(520, .05, 'triangle', .035); b.fn(); pointer.down = false; } else GAMES[ID].pointer?.('down', pointer);
  render();
});
C.addEventListener('pointermove', e => { Object.assign(pointer, point(e)); hover = hitBtn(pointer) || null; C.style.cursor = hover ? 'pointer' : ''; if (!paused) GAMES[ID].pointer?.('move', pointer); });
for (const ev of ['pointerup', 'pointercancel']) C.addEventListener(ev, e => { pointer.down = false; if (!paused) GAMES[ID].pointer?.('up', point(e)); });
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
  if (!started && (e.key === 'Enter' || e.key === ' ')) return start();
  // Enter/Space on a focused button presses that button; it must not also reach the game
  if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('button')) return;
  if (e.key === 'Escape' || e.key.toLowerCase() === 'p') { if (started) setPaused(!paused); return; }
  keys[e.key.toLowerCase()] = true; if (!paused && !e.repeat) GAMES[ID].key?.(e.key.toLowerCase()); render();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { keys = {}; pointer.down = false; if (started && !paused) setPaused(true); });
document.getElementById('controls').addEventListener('click', e => { const b = e.target.closest('[data-action]'); if (b && !paused) { ac(); tone(560, .05, 'triangle', .035); GAMES[ID].action?.(b.dataset.action); render(); if (e.detail) { b.blur(); C.focus({ preventScroll: true }); } } });   // after a click, keys go back to the game

/* ---------- start card, pause, sound, help ---------- */
const $ = id => document.getElementById(id);
function setPaused(p) { paused = p; keys = {}; pointer.down = false; $('pause-overlay').hidden = !p || !started || !$('start').hidden; $('pause').textContent = p ? '▶' : '❚❚'; $('pause').title = p ? 'Resume' : 'Pause'; }
function start() { ac(); started = true; $('start').hidden = true; setPaused(false); tone(660, .08); tone(990, .1, 'triangle', .04, .07); C.focus(); }
function syncSound() { $('sound').textContent = soundOn ? '🔊' : '🔇'; $('sound').title = soundOn ? 'Sound on' : 'Sound off'; try { localStorage.setItem('pbx-pack-sound', soundOn ? '1' : '0'); } catch (e) {} }
$('restart').onclick = () => { reset(); tone(440, .06); };
$('pause').onclick = () => { if (started) setPaused(!paused); };
$('resume').onclick = () => setPaused(false);
$('sound').onclick = () => { soundOn = !soundOn; syncSound(); tone(660, .08); };
$('help').onclick = () => { if (started) setPaused(true); $('pause-overlay').hidden = true; $('start').hidden = false; $('play').textContent = started ? 'Back to the game' : 'Play'; };
$('play').onclick = () => { if (started) { $('start').hidden = true; setPaused(false); } else start(); };
$('fullscreen').onclick = () => { const el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen?.(); else el.requestFullscreen?.().catch(() => status('Full screen is unavailable here.')); };
// the start card is filled from the catalog
$('s-genre').textContent = META.genre; $('s-title').textContent = META.title; $('s-desc').textContent = META.desc; $('s-goal').textContent = META.goal;
$('s-how').innerHTML = META.how.map(h => `<li>${h}</li>`).join('');
if (window.top !== window) document.body.classList.add('framed');
syncSound(); new ResizeObserver(fit).observe(document.querySelector('.stage')); window.addEventListener('resize', fit);
