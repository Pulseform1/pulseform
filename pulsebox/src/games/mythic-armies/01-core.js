'use strict';
/* MYTHIC ARMIES - core helpers, save model and synthesised audio */

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const fmt = n => Math.round(n).toLocaleString('en-US');
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
function shuffle(r, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function dayKey(d) { const t = d || new Date(); return t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate(); }
function msToMidnight() { const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); return m - n; }
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ---------- save model ----------
   Built so a server can own it later: every card is an instance {uid, charId, variant, obtainedAt};
   coins, essence and unit upgrades are separate; unopened packs and boxes are items with their own ids. */
const SAVE_KEY = 'mythic-armies-save', SAVE_VERSION = 1;
let S = null;
function newSave() {
  return {
    v: SAVE_VERSION, created: Date.now(), device: Math.random().toString(36).slice(2, 8),
    coins: 360, essence: 0, seq: 1,
    cards: [], units: {}, items: [], pity: 0,
    seen: {}, fresh: {}, wish: {},
    army: [null, null, null, null, null, null],
    campaign: { cleared: {}, last: 0 },
    quests: { day: 0, list: [] }, ach: {}, setRewards: {},
    stats: { packs: 0, boxes: 0, wins: 0, battles: 0, damage: 0, pulls: [0, 0, 0, 0, 0, 0], levelUps: 0, bought: 0 },
    daily: { day: 0, offers: [], bought: [] },
    guide: 0, settings: { sfx: true, music: true }
  };
}
function migrate(d) {
  if (!d || typeof d !== 'object' || typeof d.v !== 'number') return null;
  const base = newSave();
  for (const k of Object.keys(base)) if (d[k] === undefined) d[k] = base[k];
  for (const k of Object.keys(base.stats)) if (d.stats[k] === undefined) d.stats[k] = base.stats[k];
  if (!Array.isArray(d.army) || d.army.length !== 6) d.army = base.army;
  d.v = SAVE_VERSION;
  return d;
}
function loadSave() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { d = null; }
  S = migrate(d) || newSave();
  return S;
}
let saveTimer = 0;
let NO_SAVE = false;
function saveNow() { clearTimeout(saveTimer); saveTimer = 0; if (NO_SAVE) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function save() { if (!saveTimer) saveTimer = setTimeout(saveNow, 400); }
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
function newUid(prefix) { return (prefix || 'c') + Date.now().toString(36) + S.device + (S.seq++).toString(36); }

/* ---------- audio (all synthesised with Web Audio) ---------- */
const AU = { ctx: null, sfx: null, music: null, noiseBuf: null, musicTimer: 0, step: 0, nextT: 0, mood: 'hub' };
function auInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  try { AU.ctx = new C(); } catch (e) { return; }
  const c = AU.ctx;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  comp.connect(c.destination);
  AU.sfx = c.createGain(); AU.sfx.gain.value = S.settings.sfx ? 0.55 : 0; AU.sfx.connect(comp);
  AU.music = c.createGain(); AU.music.gain.value = S.settings.music ? 0.16 : 0; AU.music.connect(comp);
  const len = c.sampleRate * 1.5, buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  AU.noiseBuf = buf;
  startMusic();
}
window.addEventListener('pointerdown', auInit, true);
window.addEventListener('keydown', auInit, true);
function auOk() { return AU.ctx && AU.ctx.state === 'running'; }
function setSfx(on) { S.settings.sfx = on; if (AU.sfx) AU.sfx.gain.value = on ? 0.55 : 0; save(); }
function setMusic(on) { S.settings.music = on; if (AU.music) AU.music.gain.value = on ? 0.16 : 0; save(); }
function tone(f, dur, o) {
  if (!auOk() || !S.settings.sfx) return;
  o = o || {};
  const c = AU.ctx, t = c.currentTime + (o.at || 0);
  const osc = c.createOscillator(), g = c.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(f, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  if (o.detune) osc.detune.value = o.detune;
  const v = o.vol == null ? 0.3 : o.vol, a = o.attack || 0.005;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(o.dest || AU.sfx);
  osc.start(t); osc.stop(t + dur + 0.05);
}
function noise(dur, o) {
  if (!auOk() || !S.settings.sfx) return;
  o = o || {};
  const c = AU.ctx, t = c.currentTime + (o.at || 0);
  const src = c.createBufferSource(); src.buffer = AU.noiseBuf;
  src.playbackRate.value = o.rate || 1;
  const f = c.createBiquadFilter(); f.type = o.filter || 'bandpass'; f.Q.value = o.q || 1;
  f.frequency.setValueAtTime(o.freq || 2000, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  const g = c.createGain(), v = o.vol == null ? 0.3 : o.vol;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(AU.sfx);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
const SFX = {
  click() { tone(660, 0.07, { type: 'triangle', vol: 0.18 }); tone(990, 0.05, { type: 'sine', vol: 0.08, at: 0.02 }); },
  soft() { tone(520, 0.06, { type: 'sine', vol: 0.12 }); },
  back() { tone(500, 0.08, { type: 'triangle', vol: 0.15, to: 380 }); },
  error() { tone(180, 0.18, { type: 'square', vol: 0.08 }); tone(150, 0.2, { type: 'square', vol: 0.06, at: 0.08 }); },
  coin() { tone(1320, 0.09, { type: 'square', vol: 0.07 }); tone(1760, 0.18, { type: 'square', vol: 0.07, at: 0.07 }); },
  buy() { [0, 4, 7, 12].forEach((n, i) => tone(NOTE(72 + n), 0.25, { type: 'triangle', vol: 0.16, at: i * 0.06 })); noise(0.25, { freq: 6000, vol: 0.05, at: 0.1 }); },
  tearBit(k) { noise(0.05 + Math.random() * 0.04, { freq: 2500 + Math.random() * 3000, q: 2.5, vol: 0.10 + k * 0.18, filter: 'bandpass' }); },
  rip() {
    noise(0.35, { freq: 5000, to: 1200, q: 1.2, vol: 0.45 });
    for (let i = 0; i < 9; i++) noise(0.04, { freq: 2000 + Math.random() * 5000, q: 4, vol: 0.2, at: i * 0.025 });
    tone(140, 0.25, { type: 'sine', vol: 0.25, to: 60 });
  },
  slide() { noise(0.4, { freq: 900, to: 2600, q: 0.8, vol: 0.12, filter: 'bandpass', attack: 0.1 }); },
  whoosh() { noise(0.35, { freq: 400, to: 3000, q: 0.7, vol: 0.18, attack: 0.08 }); },
  flip(r) {
    noise(0.12, { freq: 3000, to: 1500, q: 1, vol: 0.18 });
    tone(NOTE(64 + r * 2), 0.18, { type: 'triangle', vol: 0.14, at: 0.04 });
  },
  shimmer(r) {
    const base = [72, 74, 76, 79, 81, 84][r];
    for (let i = 0; i < 4 + r * 2; i++) tone(NOTE(base + [0, 4, 7, 11, 12, 16, 19, 24][i % 8]), 0.5, { type: 'sine', vol: 0.06, at: i * 0.05 });
  },
  reveal(r) {
    const chords = [[60, 64, 67], [62, 66, 69], [64, 67, 71, 76], [62, 65, 69, 74, 77], [60, 64, 67, 72, 76, 79], [58, 62, 65, 70, 74, 77, 82]];
    const ch = chords[r];
    ch.forEach((n, i) => tone(NOTE(n + 12), 1.2 + r * 0.3, { type: r >= 3 ? 'sawtooth' : 'triangle', vol: (r >= 3 ? 0.04 : 0.09), at: i * (r >= 4 ? 0.07 : 0.03), attack: 0.02 }));
    ch.forEach((n, i) => tone(NOTE(n + 24), 0.9, { type: 'sine', vol: 0.07, at: 0.05 + i * 0.05 }));
    if (r >= 2) noise(0.8, { freq: 7000, q: 0.6, vol: 0.06 + r * 0.02, filter: 'highpass' });
    if (r >= 3) tone(NOTE(36), 1.4, { type: 'sine', vol: 0.4, to: NOTE(30) });
  },
  riser(dur) {
    tone(110, dur, { type: 'sawtooth', vol: 0.06, to: 880, attack: dur * 0.8 });
    noise(dur, { freq: 300, to: 8000, q: 1.5, vol: 0.12, attack: dur * 0.9 });
  },
  boom() { tone(80, 1.2, { type: 'sine', vol: 0.6, to: 30 }); noise(0.9, { freq: 600, to: 80, q: 0.5, vol: 0.4, filter: 'lowpass' }); },
  hit() { noise(0.08, { freq: 1200, q: 1.5, vol: 0.15 }); tone(160, 0.08, { type: 'square', vol: 0.06, to: 90 }); },
  slash() { noise(0.12, { freq: 3500, to: 1200, q: 2, vol: 0.14 }); },
  shoot() { tone(900, 0.12, { type: 'triangle', vol: 0.06, to: 400 }); },
  magic() { tone(500, 0.3, { type: 'sine', vol: 0.08, to: 1200 }); tone(750, 0.3, { type: 'sine', vol: 0.05, to: 1800, at: 0.05 }); },
  heal() { [0, 4, 7].forEach((n, i) => tone(NOTE(79 + n), 0.3, { type: 'sine', vol: 0.06, at: i * 0.05 })); },
  shield() { tone(300, 0.35, { type: 'triangle', vol: 0.08, to: 600 }); },
  aoe() { noise(0.4, { freq: 800, to: 200, q: 0.8, vol: 0.2, filter: 'lowpass' }); tone(120, 0.3, { type: 'sine', vol: 0.2, to: 50 }); },
  death() { tone(300, 0.4, { type: 'triangle', vol: 0.08, to: 80 }); },
  win() { [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(NOTE(n), 0.6, { type: 'triangle', vol: 0.12, at: i * 0.08 })); },
  lose() { [67, 63, 60, 55].forEach((n, i) => tone(NOTE(n), 0.6, { type: 'triangle', vol: 0.1, at: i * 0.15 })); },
  levelUp() { [72, 76, 79, 84].forEach((n, i) => tone(NOTE(n), 0.25, { type: 'square', vol: 0.05, at: i * 0.06 })); },
  lid() { noise(0.25, { freq: 400, q: 1, vol: 0.25 }); tone(200, 0.2, { type: 'sine', vol: 0.15, to: 120 }); }
};

/* light procedural music: soft pad + plucked arpeggio, two moods */
const MUSIC = {
  hub: { bpm: 84, prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], arp: [0, 1, 2, 1, 2, 0, 1, 2] },
  battle: { bpm: 118, prog: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]], arp: [0, 2, 1, 2, 0, 2, 1, 0] }
};
function startMusic() {
  if (AU.musicTimer || !AU.ctx) return;
  AU.nextT = AU.ctx.currentTime + 0.2;
  AU.musicTimer = setInterval(musicTick, 120);
}
function setMood(m) { AU.mood = m; }
function musicTick() {
  const c = AU.ctx;
  if (!c || c.state !== 'running') return;
  const M = MUSIC[AU.mood] || MUSIC.hub, beat = 60 / M.bpm / 2;
  while (AU.nextT < c.currentTime + 0.4) {
    const t = AU.nextT, step = AU.step, bar = Math.floor(step / 8) % M.prog.length, ch = M.prog[bar];
    if (S.settings.music) {
      if (step % 8 === 0) for (const n of ch) mTone(NOTE(n), beat * 8.5, 0.05, 'triangle', t, 0.6);
      if (step % 8 === 0) mTone(NOTE(ch[0] - 12), beat * 8, 0.09, 'sine', t, 0.1);
      const n = ch[M.arp[step % 8]] + 12 + (step % 16 >= 8 ? 12 : 0);
      if ((step * 7) % 5 !== 3) mTone(NOTE(n), beat * 1.8, 0.035, 'sine', t, 0.005);
    }
    AU.step++; AU.nextT += beat;
  }
}
function mTone(f, dur, vol, type, t, attack) {
  const c = AU.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AU.music); o.start(t); o.stop(t + dur + 0.05);
}
function vibrate(ms) { try { if (navigator.vibrate && IS_TOUCH) navigator.vibrate(ms); } catch (e) {} }
