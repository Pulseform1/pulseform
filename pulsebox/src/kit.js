/* Pulsebox game kit: canvas scaling, input, menus, skins shop, coins, best score, sound and effects.
   A game defines GAME before this runs: { id, title, tagline, how:[], bg, skins:[{name,price,c:[]}],
   reset(), update(dt), draw(g), down(x,y), move(x,y), up(x,y), key(code,isDown), bot(dt), drawSkin(g,skin,size) }.
   Everything is in a 1280x720 world; K.view is the visible part of it (it can be wider or taller on odd screens).
   ?demo plays the bot forever with no menus (used to record trailers). */
'use strict';
const $ = id => document.getElementById(id);
const DEMO = /[?&]demo/.test(location.search), POSE = /[?&]pose/.test(location.search) && GAME.pose;  // ?demo&pose freezes a staged scene for cover art
const cv = $('cv'), g = cv.getContext('2d');
const K = {
  W, H, t: 0, state: 'title', score: 0, runCoins: 0, bot: true, view: { x0: 0, y0: 0, x1: W, y1: H },
  rand: (a, b) => a + Math.random() * (b - a),
  irand: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: a => a[Math.floor(Math.random() * a.length)],
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
};
document.documentElement.style.setProperty('--accent', GAME.accent || '#c6ff3d');
document.documentElement.style.setProperty('--accent2', GAME.accent2 || '#29e0ff');
document.documentElement.style.setProperty('--bg', GAME.bg || '#0a0c12');
if (GAME.font) document.documentElement.style.setProperty('--display', `'${GAME.font}', 'Arial Black', system-ui, sans-serif`);
if (DEMO) document.body.classList.add('demo');

/* ---------- save ---------- */
const SKEY = 'pbx-' + GAME.id;
const save = { best: 0, coins: 0, owned: [0], skin: 0, plays: 0, mute: false };
try { Object.assign(save, JSON.parse(localStorage.getItem(SKEY) || '{}')); } catch (e) {}
const persist = () => { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} };
K.save = save; K.persist = persist;
Object.defineProperty(K, 'skin', { get: () => GAME.skins[DEMO || K.bot ? (K.demoSkin || 0) : save.skin] || GAME.skins[0] });

/* ---------- screen ---------- */
let sc = 1, ox = 0, oy = 0, dpr = 1;
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
  sc = Math.min(innerWidth / W, innerHeight / H); ox = (innerWidth - W * sc) / 2; oy = (innerHeight - H * sc) / 2;
  K.view = { x0: -ox / sc, y0: -oy / sc, x1: W + ox / sc, y1: H + oy / sc };
}
addEventListener('resize', resize); resize();

/* ---------- sound ---------- */
let ac = null;
// every sound goes through K.master, which is silent on menus, while paused and when muted, so games can run looping sounds
function audio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); K.ac = ac; K.master = ac.createGain(); K.master.gain.value = 0; K.master.connect(ac.destination); } catch (e) {} }
  if (ac && ac.state === 'suspended') ac.resume(); return ac;
}
K.audio = audio;
let masterOn = false;
function masterSync() {
  const on = !!ac && !save.mute && (K.state === 'play' || K.state === 'over') && !K.bot;
  if (ac && on !== masterOn) { masterOn = on; K.master.gain.setTargetAtTime(on ? 1 : 0, ac.currentTime, .05); }
}
K.sfx = (f = 440, d = .1, type = 'square', v = .12, slide = 0, delay = 0) => {
  if (save.mute || K.bot || !ac) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), a = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(a).connect(K.master); o.start(t); o.stop(t + d + .02);
};
K.noise = (d = .15, v = .15, hp = 800) => {
  if (save.mute || K.bot || !ac) return;
  const n = Math.floor(ac.sampleRate * d), b = ac.createBuffer(1, n, ac.sampleRate), ch = b.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), a = ac.createGain();
  f.type = 'highpass'; f.frequency.value = hp; a.gain.value = v; s.buffer = b; s.connect(f).connect(a).connect(K.master); s.start();
};
K.chime = (base = 523, steps = [0, 4, 7, 12]) => steps.forEach((s, i) => K.sfx(base * Math.pow(2, s / 12), .16, 'triangle', .1, 0, i * .07));

/* ---------- effects ---------- */
const parts = [], pops = [];
let shake = 0, flashA = 0, flashC = '#fff';
K.burst = (x, y, c, n = 14, sp = 320, o = {}) => {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = sp * (.3 + Math.random() * .7);
    parts.push({ x, y, vx: Math.cos(a) * s + (o.vx || 0), vy: Math.sin(a) * s + (o.vy || 0), life: 0, max: (o.life || .6) * (.6 + Math.random() * .6), c: Array.isArray(c) ? K.pick(c) : c, s: (o.size || 7) * (.5 + Math.random()), gr: o.gravity ?? 600, sq: o.square });
  }
};
K.pop = (x, y, text, c = '#fff', size = 34) => pops.push({ x, y, text, c, size, life: 0 });
K.shake = a => { shake = Math.max(shake, a); };
K.flash = (c = '#fff', a = .5) => { flashC = c; flashA = a; };
K.toast = text => { if (K.bot) return; const d = document.createElement('div'); d.className = 'toast'; d.textContent = text; document.body.appendChild(d); setTimeout(() => d.remove(), 1500); };
function fx(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life += dt; if (p.life > p.max) { parts.splice(i, 1); continue; } p.vy += p.gr * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .99; }
  for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.life += dt; p.y -= 60 * dt; if (p.life > .9) pops.splice(i, 1); }
  shake = Math.max(0, shake - 60 * dt); flashA = Math.max(0, flashA - 2.5 * dt);
}
function drawFx() {
  for (const p of parts) { g.globalAlpha = 1 - p.life / p.max; g.fillStyle = p.c; if (p.sq) g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); else { g.beginPath(); g.arc(p.x, p.y, p.s / 2, 0, 7); g.fill(); } }
  g.globalAlpha = 1; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const p of pops) {
    const k = p.life < .12 ? p.life / .12 : 1; g.globalAlpha = p.life > .6 ? 1 - (p.life - .6) / .3 : 1;
    g.font = `${Math.round(p.size * (0.6 + .4 * k))}px ${getComputedStyle(document.documentElement).getPropertyValue('--display')}`;
    g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.45)'; g.strokeText(p.text, p.x, p.y); g.fillStyle = p.c; g.fillText(p.text, p.x, p.y);
  }
  g.globalAlpha = 1;
}

/* ---------- UI ---------- */
const coinHTML = '<i class="coin-i"></i>';
document.body.insertAdjacentHTML('beforeend', `
<div class="hud" id="hud" hidden><div class="hud-score" id="hScore">0</div><div class="hud-coins">${coinHTML}<span id="hCoins">0</span></div><button class="hud-pause" id="hPause" aria-label="Pause"></button></div>
<div class="scr" id="sTitle" ${DEMO ? 'hidden' : ''}><div class="card">
  <h1 class="title">${GAME.title}</h1><p class="sub">${GAME.tagline}</p>
  <div class="stats"><span class="stat"><small>Best</small><b id="tBest">0</b></span><span class="stat">${coinHTML}<b id="tCoins">0</b></span></div>
  <button class="big" id="bPlay">Play</button>
  <div class="row"><button id="bSkins">Skins</button></div>
  <ul class="how">${GAME.how.map(h => `<li>${h}</li>`).join('')}</ul>
</div></div>
<div class="scr" id="sOver" hidden><div class="card">
  <h2 class="title" id="oTitle" style="font-size:40px" hidden></h2><p class="sub" id="oText" hidden></p><p class="sub" style="margin:0" id="oLabel">Score</p><div class="score-big" id="oScore">0</div><div id="oNew" class="newbest" hidden>New best!</div>
  <div class="stats"><span class="stat"><small>Best</small><b id="oBest">0</b></span><span class="stat">+${coinHTML}<b id="oCoins">0</b></span></div>
  <button class="big" id="bAgain">Play again</button>
  <div class="row"><button id="bMenu">Menu</button><button id="bSkins2">Skins</button></div>
  <p class="hint" id="oHint"></p>
</div></div>
<div class="scr" id="sSkins" hidden><div class="card">
  <h2 class="title" style="font-size:40px">Skins</h2>
  <div class="stats"><span class="stat">${coinHTML}<b id="kCoins">0</b></span></div>
  <div class="skins" id="kGrid"></div>
  <button class="big" id="bBack">Back</button>
</div></div>
<div class="scr" id="sPause" hidden><div class="card">
  <h2 class="title" style="font-size:44px">Paused</h2>
  <button class="big" id="bResume">Resume</button>
  <div class="row"><button id="bQuit">Menu</button></div>
</div></div>
<button class="mute" id="bMute" aria-label="Sound on or off"></button>`);

const screens = ['sTitle', 'sOver', 'sSkins', 'sPause'];
let skinsFrom = 'sTitle';
function showScr(id) { screens.forEach(s => $(s).hidden = s !== id || DEMO); }
function refresh() {
  $('tBest').textContent = save.best; $('tCoins').textContent = save.coins; $('kCoins').textContent = save.coins;
  $('bMute').textContent = save.mute ? '🔇' : '🔊';
}
function hud() { $('hScore').textContent = K.score; $('hCoins').textContent = K.runCoins; }
K.add = (n = 1, x, y, c) => {
  K.score += n; hud();
  if (!K.bot) { const s = $('hScore'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); }
  if (x !== undefined) K.pop(x, y, '+' + n, c || '#fff');
};
K.coin = (n = 1, x, y) => {
  K.runCoins += n; hud();
  if (x !== undefined) K.burst(x, y, ['#ffcf2e', '#fff3a8'], 6, 200, { life: .4, size: 6, gravity: 300 });
  K.sfx(1320, .07, 'square', .05); K.sfx(1760, .08, 'square', .05, 0, .05);
};

function buildSkins() {
  const grid = $('kGrid'); grid.innerHTML = '';
  GAME.skins.forEach((s, i) => {
    const own = save.owned.includes(i), b = document.createElement('button');
    b.className = 'skin' + (save.skin === i ? ' on' : '') + (own ? '' : ' locked') + (!own && save.coins < s.price ? ' cant' : '');
    const c = document.createElement('canvas'); c.width = c.height = 112; const cg = c.getContext('2d'); cg.translate(56, 56);
    if (GAME.drawSkin) GAME.drawSkin(cg, s, 40); else { cg.fillStyle = s.c[0]; cg.beginPath(); cg.arc(0, 0, 40, 0, 7); cg.fill(); }
    if (!own) { cg.fillStyle = 'rgba(0,0,0,.45)'; cg.fillRect(-56, -56, 112, 112); }
    b.appendChild(c);
    b.insertAdjacentHTML('beforeend', `<span>${s.name}</span>${own ? (save.skin === i ? '<span class="price">Equipped</span>' : '<span class="price" style="color:#cfd5ef">Equip</span>') : `<span class="price">${coinHTML}${s.price}</span>`}`);
    b.onclick = () => {
      audio();
      if (own) { save.skin = i; K.sfx(660, .08, 'triangle'); }
      else if (save.coins >= s.price) { save.coins -= s.price; save.owned.push(i); save.skin = i; K.chime(660); }
      else { K.sfx(160, .15, 'sawtooth', .08); return; }
      persist(); refresh(); buildSkins();
    };
    grid.appendChild(b);
  });
}

/* ---------- flow ---------- */
let overAt = 0, botOverAt = 0;
function start() {
  audio(); K.bot = false; K.score = 0; K.runCoins = 0; hud(); parts.length = 0; pops.length = 0;
  GAME.reset(); K.state = 'play'; showScr(null); $('hud').hidden = false; save.plays++; persist();
}
function attract() { K.bot = true; K.demoSkin = DEMO ? 0 : K.irand(0, GAME.skins.length - 1); K.score = 0; K.runCoins = 0; hud(); GAME.reset(); if (POSE) GAME.pose(); K.state = 'title'; $('hud').hidden = !DEMO; }
K.over = (o = {}) => {
  if (K.bot) { if (!botOverAt) botOverAt = K.t + 1.2; return; }
  if (K.state !== 'play') return;
  K.state = 'over'; overAt = performance.now();
  const best = K.score > save.best; if (best) save.best = K.score;
  save.coins += K.runCoins; persist(); refresh();
  $('oTitle').hidden = !o.title; $('oTitle').textContent = o.title || ''; $('oText').hidden = !o.text; $('oText').textContent = o.text || ''; $('oLabel').textContent = GAME.scoreLabel || 'Score';
  $('oScore').textContent = K.score; $('oBest').textContent = save.best; $('oCoins').textContent = K.runCoins; $('oNew').hidden = !best || K.score === 0;
  const next = GAME.skins.map((s, i) => [s, i]).find(([s, i]) => !save.owned.includes(i));
  $('oHint').textContent = next ? (save.coins >= next[0].price ? `You can unlock ${next[0].name} now!` : `${next[0].price - save.coins} more coins to unlock ${next[0].name}`) : 'You own every skin. Legend!';
  if (GAME.noSkins) $('oHint').textContent = '';
  setTimeout(() => { if (K.state === 'over') { showScr('sOver'); $('hud').hidden = true; } }, o.delay ?? 650);
  if (best && K.score > 0) setTimeout(() => K.chime(523, [0, 4, 7, 12, 16]), 700);
};
function pause() { if (K.state !== 'play') return; K.state = 'paused'; showScr('sPause'); }
function resume() { K.state = 'play'; showScr(null); last = performance.now(); }
function toMenu() { refresh(); attract(); showScr('sTitle'); }

$('bPlay').onclick = start; $('bAgain').onclick = start; $('bResume').onclick = resume;
$('bMenu').onclick = toMenu; $('bQuit').onclick = toMenu;
$('bSkins').onclick = () => { skinsFrom = 'sTitle'; buildSkins(); refresh(); showScr('sSkins'); };
$('bSkins2').onclick = () => { skinsFrom = 'sOver'; buildSkins(); refresh(); showScr('sSkins'); };
$('bBack').onclick = () => { if (skinsFrom === 'sOver') toMenu(); else showScr('sTitle'); };
$('hPause').onclick = pause;
$('bMute').onclick = () => { save.mute = !save.mute; persist(); refresh(); audio(); };
addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

/* ---------- input ---------- */
const toW = e => [(e.clientX - ox) / sc, (e.clientY - oy) / sc];
cv.addEventListener('pointerdown', e => { audio(); if (K.state === 'play' && GAME.down) { const [x, y] = toW(e); GAME.down(x, y, e); } });
addEventListener('pointermove', e => { if (K.state === 'play' && GAME.move) { const [x, y] = toW(e); GAME.move(x, y, e); } });
addEventListener('pointerup', e => { if (K.state === 'play' && GAME.up) { const [x, y] = toW(e); GAME.up(x, y, e); } });
addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat && K.state !== 'play') return;
  if (e.code === 'Escape' || e.code === 'KeyP') { if (K.state === 'play') pause(); else if (K.state === 'paused') resume(); return; }
  if ((e.code === 'Space' || e.code === 'Enter') && K.state !== 'play') {
    if (K.state === 'title' && !$('sTitle').hidden) start();
    else if (K.state === 'over' && performance.now() - overAt > 900) start();
    else if (K.state === 'paused') resume();
    return;
  }
  if (K.state === 'play' && GAME.key) GAME.key(e.code, true);
});
addEventListener('keyup', e => { if (K.state === 'play' && GAME.key) GAME.key(e.code, false); });

/* ---------- loop ---------- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
  const run = K.state === 'play' || K.state === 'title' || K.state === 'over';
  if (run && !POSE) {
    K.t += dt;
    if (K.bot && K.state === 'title') { if (botOverAt && K.t > botOverAt) { botOverAt = 0; attract(); } else if (!botOverAt && GAME.bot) GAME.bot(dt); }
    GAME.update(dt); fx(dt);
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = GAME.bg || '#000'; g.fillRect(0, 0, innerWidth, innerHeight);
  const sx = shake ? (Math.random() - .5) * shake : 0, sy = shake ? (Math.random() - .5) * shake : 0;
  g.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * (ox + sx * sc), dpr * (oy + sy * sc));
  GAME.draw(g); drawFx();
  if (flashA > 0) { g.globalAlpha = flashA; g.fillStyle = flashC; g.fillRect(K.view.x0, K.view.y0, K.view.x1 - K.view.x0, K.view.y1 - K.view.y0); g.globalAlpha = 1; }
  masterSync();
  requestAnimationFrame(frame);
}
if (GAME.noSkins) { $('bSkins').parentNode.hidden = true; $('bSkins2').hidden = true; }
if (GAME.noHud) { $('hScore').hidden = true; document.querySelector('.hud-coins').hidden = true; }
refresh(); attract(); showScr('sTitle');
requestAnimationFrame(frame);
