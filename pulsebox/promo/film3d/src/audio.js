// The soundtrack: the voice lines (with a broadcast chain for the narrator and a monster chain for the
// 78th game), an original synthesized score for every section, and sound effects locked to the picture.
// Everything except the voices is generated here, so there is nothing to license.
export const SR = 48000;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

let NOISE = null;
function noise(ctx) { if (NOISE) return NOISE; const b = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return (NOISE = b); }
function filt(ctx, type, freq, q = 0.7, gain = 0) { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; f.gain.value = gain; return f; }
function panner(ctx, p) { const s = ctx.createStereoPanner(); s.pan.value = p; return s; }
function reverb(ctx, seconds, decay = 3) {
  const len = Math.floor(ctx.sampleRate * seconds), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  const conv = ctx.createConvolver(); conv.buffer = ir; return conv;
}
function softClip(k) { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } return c; }

// one shaped note
function tone(ctx, bus, { t, dur, freq, type = "sine", gain = 0.2, attack = 0.005, release = 0.2, cutoff = 0, q = 0.7, glideTo = 0, detune = 0, pan = 0, cutoffTo = 0 }) {
  if (t < 0) { dur += t; t = 0; } if (dur <= 0.01) return;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
  if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + Math.min(attack, dur * 0.9));
  g.gain.setValueAtTime(gain, Math.max(t + attack, t + dur - release)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (cutoff) { const f = filt(ctx, "lowpass", cutoff, q); if (cutoffTo) f.frequency.exponentialRampToValueAtTime(cutoffTo, t + dur); o.connect(f); node = f; }
  node.connect(g); if (pan) { const p = panner(ctx, pan); g.connect(p); p.connect(bus); } else g.connect(bus);
  o.start(t); o.stop(t + dur + 0.05);
}
function hiss(ctx, bus, { t, dur, gain = 0.2, type = "bandpass", freq = 2000, q = 1, freqTo = 0, attack = 0.002, release = 0, pan = 0 }) {
  if (t < 0) { dur += t; t = 0; } if (dur <= 0.01) return;
  const s = ctx.createBufferSource(); s.buffer = noise(ctx); s.loop = true;
  const f = filt(ctx, type, freq, q); if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack);
  if (release) g.gain.setValueAtTime(gain, Math.max(t + attack, t + dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); if (pan) { const p = panner(ctx, pan); g.connect(p); p.connect(bus); } else g.connect(bus);
  s.start(t, Math.random() * 2); s.stop(t + dur + 0.05);
}
// ---------------------------------------------------------------- instruments
const kick = (c, b, t, g = 0.75) => { tone(c, b, { t, dur: 0.34, freq: 150, glideTo: 40, gain: g, release: 0.3 }); hiss(c, b, { t, dur: 0.02, gain: g * 0.2, type: "highpass", freq: 3000 }); };
const snare = (c, b, t, g = 0.28) => { hiss(c, b, { t, dur: 0.2, gain: g, freq: 1900, q: 0.7 }); tone(c, b, { t, dur: 0.12, freq: 200, glideTo: 150, gain: g * 0.6 }); };
const clap = (c, b, t, g = 0.24) => { for (const d of [0, 0.012, 0.026]) hiss(c, b, { t: t + d, dur: 0.12, gain: g, freq: 1400, q: 1.2 }); };
const hat = (c, b, t, g = 0.05, open = false) => hiss(c, b, { t, dur: open ? 0.18 : 0.05, gain: g, type: "highpass", freq: 7500, pan: 0.2 });
function pad(c, b, t, dur, notes, { gain = 0.05, cutoff = 900, attack = 1, release = 1, type = "sawtooth" } = {}) {
  notes.forEach((m, i) => [-9, 9].forEach((det) => tone(c, b, { t, dur, freq: mtof(m), type, gain: gain / notes.length * 2, attack, release, cutoff, detune: det, pan: (i % 2 ? 0.3 : -0.3) * (det > 0 ? 1 : -1) })));
}
function piano(c, b, t, m, g = 0.12, dur = 3) {
  tone(c, b, { t, dur, freq: mtof(m), type: "sine", gain: g, attack: 0.004, release: dur * 0.95 });
  tone(c, b, { t, dur: dur * 0.6, freq: mtof(m + 12), type: "triangle", gain: g * 0.25, attack: 0.003, release: dur * 0.55 });
  tone(c, b, { t, dur: dur * 0.4, freq: mtof(m) * 3.01, type: "sine", gain: g * 0.08, attack: 0.002, release: dur * 0.35 });
}
function braam(c, b, t, root = 38, g = 0.2) {
  for (const m of [root, root + 7, root + 12]) for (const d of [-14, 0, 14]) tone(c, b, { t, dur: 3.2, freq: mtof(m), type: "sawtooth", gain: g / 6, attack: 0.04, release: 2.4, cutoff: 180, cutoffTo: 1400, detune: d });
  tone(c, b, { t, dur: 3, freq: mtof(root - 12), gain: g * 0.9, attack: 0.02, release: 2.5 });
}
function impact(c, b, t, g = 0.6) { tone(c, b, { t, dur: 1.6, freq: 70, glideTo: 28, gain: g, release: 1.5 }); hiss(c, b, { t, dur: 1.2, gain: g * 0.35, type: "lowpass", freq: 900, freqTo: 120 }); }
function riser(c, b, t, dur, g = 0.18) {
  if (dur <= 0.05) return;
  const s = ctx_noise(c, b, t, dur, g); tone(c, b, { t, dur, freq: 110, glideTo: 880, type: "sawtooth", gain: g * 0.3, attack: dur * 0.9, release: 0.05, cutoff: 600, cutoffTo: 5000 }); return s;
}
function ctx_noise(c, b, t, dur, g) {   // a noise sweep that grows toward the end
  const s = c.createBufferSource(); s.buffer = noise(c); s.loop = true; const f = filt(c, "bandpass", 300, 1.2); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
  const gg = c.createGain(); gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(g, t + dur); gg.gain.linearRampToValueAtTime(0, t + dur + 0.03);
  s.connect(f); f.connect(gg); gg.connect(b); s.start(t); s.stop(t + dur + 0.05);
}
function whoosh(c, b, t, dur = 0.6, g = 0.2, pan = 0) { hiss(c, b, { t, dur, gain: g, freq: 500, freqTo: 3500, q: 0.9, attack: dur * 0.6, pan }); }
function heartbeat(c, b, t, g = 0.5) { for (const [d, k] of [[0, 1], [0.27, 0.7]]) tone(c, b, { t: t + d, dur: 0.22, freq: 62, glideTo: 40, gain: g * k, release: 0.18 }); }
function glitch(c, b, t, dur, g = 0.08) { for (let x = t; x < t + dur; x += 0.025 + rnd() * 0.03) { tone(c, b, { t: x, dur: 0.02 + rnd() * 0.03, freq: 200 + rnd() * 3000, type: "square", gain: g * (0.5 + rnd() * 0.5), release: 0.01, pan: rnd() * 2 - 1 }); if (rnd() < 0.3) hiss(c, b, { t: x, dur: 0.03, gain: g, type: "highpass", freq: 4000 }); } }
function ping(c, b, t, g = 0.22) { tone(c, b, { t, dur: 2.6, freq: 1320, gain: g, attack: 0.004, release: 2.5 }); tone(c, b, { t, dur: 1.8, freq: 1980, gain: g * 0.3, attack: 0.004, release: 1.7 }); tone(c, b, { t: t + 0.45, dur: 1.8, freq: 1320, gain: g * 0.25, attack: 0.004, release: 1.7 }); }
function groan(c, b, t, dur, g = 0.3) { for (const [f, d] of [[46, 0], [48.5, 0.1], [92, 0.05]]) tone(c, b, { t: t + d, dur, freq: f, glideTo: f * 0.8, type: "sawtooth", gain: g / 3, attack: 0.4, release: dur * 0.5, cutoff: 380, cutoffTo: 160, q: 4 }); }
function chime(c, b, t, g = 0.12) { [79, 84, 88, 91].forEach((m, i) => tone(c, b, { t: t + i * 0.055, dur: 1.4, freq: mtof(m), type: "sine", gain: g, attack: 0.003, release: 1.3, pan: (i - 1.5) * 0.25 })); }
function click(c, b, t, g = 0.25) { hiss(c, b, { t, dur: 0.025, gain: g, type: "highpass", freq: 2500 }); tone(c, b, { t, dur: 0.03, freq: 1800, type: "square", gain: g * 0.15, release: 0.02 }); }
function screech(c, b, t, dur, g = 0.12) { for (const m of [86, 87, 91, 92]) tone(c, b, { t, dur, freq: mtof(m), glideTo: mtof(m + 1), type: "sawtooth", gain: g / 4, attack: 0.02, release: dur * 0.6, cutoff: 5000, detune: rnd() * 30 }); }
function buzz(c, b, t, dur, g = 0.03) { if (dur <= 0.02) return; tone(c, b, { t, dur, freq: 120, type: "sawtooth", gain: g, attack: 0.01, release: 0.01, cutoff: 1400 }); tone(c, b, { t, dur, freq: 60, type: "sine", gain: g * 0.8, attack: 0.01, release: 0.01 }); }
function step(c, b, t, g = 0.12, hard = false) { hiss(c, b, { t, dur: 0.09, gain: g, type: "lowpass", freq: hard ? 1600 : 500 }); tone(c, b, { t, dur: 0.08, freq: hard ? 120 : 80, glideTo: 50, gain: g * 0.6 }); }
function bird(c, b, t, g = 0.03) { const f = 2600 + rnd() * 1600; for (let i = 0; i < 3; i++) tone(c, b, { t: t + i * 0.11, dur: 0.08, freq: f, glideTo: f * 1.35, gain: g, attack: 0.01, release: 0.05, pan: 0.6 }); }

// ---------------------------------------------------------------- the voices
function voiceChain(ctx, src, line, buses) {
  const { who, mood } = line, t = line.t, dur = line.edur;
  let node = src; const chain = (n) => { node.connect(n); node = n; return n; };
  const lfo = (rate, depth, param) => { const o = ctx.createOscillator(); o.frequency.value = rate; const g = ctx.createGain(); g.gain.value = depth; o.connect(g); g.connect(param); o.start(Math.max(0, t)); o.stop(t + dur + 0.2); };
  if (who === "N") { chain(filt(ctx, "highpass", 75)); chain(filt(ctx, "lowshelf", 180, 0.7, 2.5)); chain(filt(ctx, "peaking", 3200, 0.9, 2.5)); chain(filt(ctx, "highshelf", 9000, 0.7, 1.5)); node.connect(buses.narr); return; }
  if (who === "J") {
    if (mood === "panic") { lfo(7.3, 30, src.detune); lfo(3.1, 16, src.detune); const tr = ctx.createGain(); lfo(5.4, 0.12, tr.gain); chain(tr); hiss(ctx, buses.voice, { t: t - 0.42, dur: 0.36, gain: 0.1, freq: 1300, q: 0.6, attack: 0.18 }); hiss(ctx, buses.voice, { t: t + dur + 0.03, dur: 0.3, gain: 0.08, freq: 900, q: 0.6, attack: 0.12 }); }
    if (mood === "whisper") { chain(filt(ctx, "highpass", 300)); chain(filt(ctx, "lowshelf", 320, 0.7, -6)); chain(filt(ctx, "peaking", 4200, 0.8, 4)); const g = ctx.createGain(); g.gain.value = 1.35; chain(g); hiss(ctx, buses.voice, { t: Math.max(0, t), dur: dur + 0.1, gain: 0.018, freq: 4500, q: 0.6, attack: 0.05 }); }
    node.connect(buses.voice); return;
  }
  if (who === "G" || who === "C") {   // low, doubled, a little distorted, in a huge room
    chain(filt(ctx, "lowshelf", 200, 0.7, 4)); const ws = ctx.createWaveShaper(); ws.curve = softClip(who === "G" ? 1.8 : 1.3); chain(ws); chain(filt(ctx, "lowpass", who === "G" ? 6500 : 8000));
    node.connect(buses.villain); return;
  }
  node.connect(buses.voice);
}

// ---------------------------------------------------------------- the mix
export async function renderAudio(tl) {
  seed = 5;
  const dur = tl.duration, ctx = new OfflineAudioContext(2, Math.ceil((dur + 0.2) * SR), SR);
  const master = ctx.createDynamicsCompressor(); master.threshold.value = -12; master.ratio.value = 3; master.attack.value = 0.004; master.release.value = 0.25; master.connect(ctx.destination);
  const mk = (g) => { const n = ctx.createGain(); n.gain.value = g; n.connect(master); return n; };
  const music = mk(0.55), sfx = mk(0.75), voice = mk(1.15), villain = mk(1.0);
  const narrComp = ctx.createDynamicsCompressor(); narrComp.threshold.value = -22; narrComp.ratio.value = 3.5; narrComp.attack.value = 0.003; narrComp.release.value = 0.15;
  const narr = ctx.createGain(); narr.gain.value = 1.5; narr.connect(narrComp); narrComp.connect(master);
  // shared reverbs
  const send = (src, seconds, wet, decay) => { const rv = reverb(ctx, seconds, decay), w = ctx.createGain(); w.gain.value = wet; src.connect(rv); rv.connect(w); w.connect(master); };
  send(music, 2.4, 0.25, 3); send(sfx, 1.6, 0.18, 3); send(voice, 0.9, 0.1, 4); send(narr, 0.6, 0.04, 5); send(villain, 3.4, 0.42, 2.2);
  const big = ctx.createGain(); big.gain.value = 1; send(big, 4, 0.6, 2); const bigDry = ctx.createGain(); bigDry.gain.value = 0.5; big.connect(bigDry); bigDry.connect(master);   // pings, stingers
  const buses = { narr, voice, villain };

  // ---- the voices
  const lines = tl.lines;
  const bufs = await Promise.all(lines.map(async (l) => { const r = await fetch(`./vo/${l.id}.wav`); return ctx.decodeAudioData(await r.arrayBuffer()); }));
  lines.forEach((l, i) => {
    const s = ctx.createBufferSource(); s.buffer = bufs[i]; s.playbackRate.value = l.rate; voiceChain(ctx, s, l, buses); s.start(l.t);
    if (l.who === "G" || l.who === "C") {   // a ring-modulated double, a hair late: the voice sounds like more than one thing
      const d = ctx.createBufferSource(); d.buffer = bufs[i]; d.playbackRate.value = l.rate;
      const rm = ctx.createGain(); rm.gain.value = 0; const o = ctx.createOscillator(); o.frequency.value = l.who === "G" ? 38 : 52; o.connect(rm.gain); o.start(l.t); o.stop(l.t + l.edur + 0.3);
      const g = ctx.createGain(); g.gain.value = l.who === "G" ? 0.5 : 0.35; const lp = filt(ctx, "lowpass", 3000); d.connect(rm); rm.connect(lp); lp.connect(g); g.connect(villain); d.start(l.t + 0.016);
    }
    // duck the music under every line
    const a = Math.max(0, l.t - 0.08), b = l.t + l.edur;
    music.gain.setTargetAtTime(0.55 * (l.who === "N" ? 0.42 : 0.5), a, 0.05); music.gain.setTargetAtTime(0.55, b + 0.05, 0.3);
  });

  // ---- times from the picture
  const shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => lines.find((l) => l.id === id);
  const S = (id) => shot(id).t0, E = (id) => shot(id).t1;
  const T = { open: 0, hub: S("hub-land"), hl: S("hl-chase"), ds: S("ds-dark"), eh: S("eh-hall"), ret: S("hub-return"), copy: S("hub-copy"), esc: S("hub-escape"), dawn: S("bed-dawn"), two: S("bed-two"), cta: S("cta") };
  const cliffEdge = S("hl-cliff") + 40 / 24;

  // ===== cold open: a lonely drone and a slow piano in A minor
  pad(ctx, music, 0.0, T.hub - 2.6, [45, 52, 57], { gain: 0.05, cutoff: 500, attack: 2.5, release: 2 });
  tone(ctx, music, { t: 0, dur: T.hub - 2, freq: 55, gain: 0.1, attack: 2, release: 1.5 });
  [69, 72, 76, 74, 72, 69, 67, 69].forEach((m, i) => { const t = 0.6 + i * 1.55; if (t < S("bed-dive") - 0.4) piano(ctx, music, t, m, 0.09, 3.5); });
  for (let t = 0.3; t < S("bed-face"); t += 1.0) tone(ctx, sfx, { t, dur: 0.03, freq: 2400, type: "square", gain: 0.006, release: 0.02, pan: -0.5 });   // a clock
  { const sh = shot("bed-wide"), ap = sh.t0 + sh.L("n02") + 2.2; glitch(ctx, sfx, ap, 0.55, 0.06); impact(ctx, sfx, ap, 0.35); screech(ctx, big, ap + 0.05, 1.8, 0.06); }
  for (let i = 0; i < 3; i++) heartbeat(ctx, sfx, S("bed-face") + 0.2 + i * 0.75, 0.45);
  { const sh = shot("bed-screen"), ty = sh.t0 + sh.L("g00") - 0.2; for (let k = 0; k < 27; k++) tone(ctx, sfx, { t: ty + k * 0.088, dur: 0.025, freq: 1100 + (k % 3) * 90, type: "square", gain: 0.02, release: 0.015 }); tone(ctx, music, { t: sh.t0, dur: sh.dur + 0.3, freq: 41, gain: 0.16, attack: 0.8, release: 0.4 }); }
  { const sh = shot("bed-dive"), ck = sh.t0 + sh.L("n03") + 0.55; click(ctx, sfx, ck, 0.35); riser(ctx, sfx, ck + 0.2, sh.t1 - ck - 0.2, 0.2); glitch(ctx, sfx, sh.t1 - 1.0, 1.0, 0.05); }

  // ===== the hub: falling, a braam on landing, a low pulse under the game's voice
  whoosh(ctx, sfx, T.hub, 1.05, 0.32); hiss(ctx, sfx, { t: T.hub, dur: 1.1, gain: 0.12, type: "lowpass", freq: 600, attack: 0.2 });
  { const land = T.hub + 1.3; impact(ctx, sfx, land, 0.7); braam(ctx, big, land, 38, 0.22); pad(ctx, music, land, S("hl-chase") - land + 0.3, [38, 41, 45, 50], { gain: 0.055, cutoff: 700, attack: 2.5, release: 0.6 }); }
  { const g = line("g02"); for (let t = g.t; t < g.t + g.edur; t += 0.86) tone(ctx, music, { t, dur: 0.7, freq: mtof(26), gain: 0.22, attack: 0.02, release: 0.6, cutoff: 200 }); }
  { const sh = shot("hub-dark"); for (let k = 1; k <= 34; k++) { const t = sh.t0 + 0.5 + (k / 34) * (sh.dur - 0.5); tone(ctx, sfx, { t, dur: 0.35, freq: 90, glideTo: 45, gain: 0.12, release: 0.3, pan: k % 2 ? 0.6 : -0.6 }); hiss(ctx, sfx, { t, dur: 0.06, gain: 0.03, type: "highpass", freq: 3000, pan: k % 2 ? 0.6 : -0.6 }); }
    riser(ctx, music, sh.t1 - 2.2, 2.2, 0.12); }

  // ===== Hyperlane: 140 bpm synthwave, engines, gates, overdrive, and then nothing
  { const t0 = T.hl, beat = 60 / 140, end = cliffEdge;
    impact(ctx, sfx, t0, 0.4); whoosh(ctx, sfx, t0 - 0.3, 0.45, 0.25);
    const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], od = S("hl-key") + 0.15;
    for (let i = 0, t = t0; t < end; i++, t = t0 + i * beat) {
      const bar = Math.floor(i / 4) % 4, ch = prog[bar], fast = t > od;
      kick(ctx, music, t, 0.6); if (i % 4 === 1 || i % 4 === 3) snare(ctx, music, t, 0.22);
      hat(ctx, music, t + beat / 2, 0.05); if (fast) { hat(ctx, music, t + beat / 4, 0.035); hat(ctx, music, t + beat * 0.75, 0.035); }
      for (let e = 0; e < 2; e++) tone(ctx, music, { t: t + e * beat / 2, dur: beat / 2 * 0.9, freq: mtof(ch[0] - 24), type: "sawtooth", gain: 0.09, cutoff: 700, release: 0.05 });
      for (let s = 0; s < 4; s++) { const n = ch[(i * 4 + s) % 3] + (fast ? 24 : 12); const tt = t + s * beat / 4; if (tt < end) tone(ctx, music, { t: tt, dur: beat / 4 * 0.8, freq: mtof(n), type: "square", gain: 0.022, cutoff: 3000, release: 0.04, pan: s % 2 ? 0.35 : -0.35 }); }
      if (i % 4 === 0) pad(ctx, music, t, Math.min(beat * 4, end - t), ch, { gain: 0.035, cutoff: 1800, attack: 0.05, release: 0.3 });
    }
    // engines: a pitch that follows the speed (and screams in overdrive)
    const eng = (f0, f1, f2, g, pan) => { const o = ctx.createOscillator(); o.type = "sawtooth"; const lp = filt(ctx, "lowpass", 900); const gg = ctx.createGain(); gg.gain.setValueAtTime(0, t0); gg.gain.linearRampToValueAtTime(g, t0 + 0.3); gg.gain.setValueAtTime(g, end); gg.gain.exponentialRampToValueAtTime(0.0001, end + 1.4);
      o.frequency.setValueAtTime(f0, t0); o.frequency.linearRampToValueAtTime(f0 * 1.05, od); o.frequency.linearRampToValueAtTime(f1, od + 0.6); o.frequency.setValueAtTime(f1, end); o.frequency.exponentialRampToValueAtTime(f2, end + 1.4); lp.frequency.setValueAtTime(900, t0); lp.frequency.linearRampToValueAtTime(2600, od + 0.6);
      const p = panner(ctx, pan); o.connect(lp); lp.connect(gg); gg.connect(p); p.connect(sfx); o.start(t0); o.stop(end + 1.5); };
    eng(92, 160, 70, 0.05, -0.2); eng(138, 240, 100, 0.025, 0.2);
    hiss(ctx, sfx, { t: t0, dur: end - t0 + 2.4, gain: 0.05, type: "highpass", freq: 2500, attack: 0.3, release: 1 });   // rain and wind
    // gates whooshing past
    const sh1 = shot("hl-chase"), sh2 = shot("hl-rival"); for (let d = 70; d < 7 * 75; d += 70) { const tt = d / 75 < sh1.dur ? sh1.t0 + d / 75 : sh2.t0 + d / 75 - 5; if (tt < sh2.t1) whoosh(ctx, sfx, tt - 0.25, 0.4, 0.14, d % 140 ? 0.5 : -0.5); }
    whoosh(ctx, sfx, sh2.t0 + 0.35, 0.7, 0.2, 0.6);   // the rival pulls alongside
    riser(ctx, sfx, od - 1.1, 1.1, 0.15); impact(ctx, sfx, od, 0.35); tone(ctx, sfx, { t: od, dur: 1.4, freq: 80, glideTo: 420, type: "sawtooth", gain: 0.08, cutoff: 1200, release: 0.6 }); hiss(ctx, sfx, { t: od, dur: 1.2, gain: 0.15, freq: 1200, freqTo: 4000, release: 0.8 });
    whoosh(ctx, sfx, S("hl-key") + 2.15, 0.5, 0.28); chime(ctx, big, S("hl-key") + 2.45, 0.11);
    // the road ends: music stops dead, wind, a long fall
    hiss(ctx, sfx, { t: end, dur: 2.6, gain: 0.14, freq: 400, freqTo: 180, q: 0.6, attack: 0.3 }); tone(ctx, sfx, { t: end, dur: 1.6, freq: 900, glideTo: 120, type: "sine", gain: 0.05, release: 1.2 });
  }

  // ===== Deep Signal: pressure, pings, the thing behind him
  { const t0 = T.ds, t1 = T.eh;
    hiss(ctx, sfx, { t: t0, dur: 1.2, gain: 0.25, type: "lowpass", freq: 1200, freqTo: 200, attack: 0.02 });   // the splash down
    for (let i = 0; i < 14; i++) tone(ctx, sfx, { t: t0 + 0.1 + rnd() * 1.4, dur: 0.08, freq: 400 + rnd() * 500, glideTo: 900 + rnd() * 900, gain: 0.03, release: 0.05, pan: rnd() * 2 - 1 });
    tone(ctx, music, { t: t0, dur: t1 - t0, freq: 41, gain: 0.2, attack: 1.5, release: 0.8 }); hiss(ctx, music, { t: t0, dur: t1 - t0, gain: 0.09, type: "lowpass", freq: 260, attack: 1.5, release: 0.8 });
    pad(ctx, music, t0 + 0.5, t1 - t0 - 0.5, [41, 44, 48], { gain: 0.04, cutoff: 420, attack: 3, release: 1 });
    for (const d of [1.4, 4.0]) ping(ctx, big, t0 + d, 0.09);
    for (let t = S("ds-ping"); t < S("ds-eye") + 2.6; t += 0.62) heartbeat(ctx, sfx, t, 0.3);
    const e0 = S("ds-eye"); ping(ctx, big, e0, 0.24); ping(ctx, big, e0 + 2.0, 0.2); chime(ctx, big, e0 + 1.95, 0.1);
    groan(ctx, big, e0 + 2.6, 3.0, 0.45); impact(ctx, sfx, e0 + 2.75, 0.6); screech(ctx, big, e0 + 2.75, 1.6, 0.08); braam(ctx, big, e0 + 2.75, 33, 0.18);
  }

  // ===== The Endless Halls: the buzz, footsteps, the flicker
  { const t0 = T.eh, sh = shot("eh-hall"), fl = shot("eh-flicker"), L = fl.t0 + fl.L("n11");
    const offs = [[L + 1.45, L + 1.63], [L + 1.95, L + 2.13], [fl.t1 - 0.22, fl.t1]];
    let cur = t0; for (const [a, b] of offs) { buzz(ctx, sfx, cur, a - cur, 0.03); click(ctx, sfx, a, 0.3); cur = b; if (b < fl.t1 - 0.01) click(ctx, sfx, b, 0.2); }
    tone(ctx, music, { t: t0, dur: fl.t1 - t0, freq: 49, gain: 0.07, attack: 1.5, release: 0.1 });
    const j4 = sh.t0 + sh.L("j04") - 0.15, grab = j4 - 0.55; for (let t = t0 + 0.3; t < grab - 0.3; t += 0.6) step(ctx, sfx, t, 0.08);
    click(ctx, sfx, grab, 0.15); chime(ctx, big, grab + 0.1, 0.09);
    for (let t = j4; t < L + 2.2; t += 0.55) heartbeat(ctx, sfx, t, 0.28);
    screech(ctx, big, offs[1][1], 0.9, 0.16); impact(ctx, sfx, offs[1][1], 0.55);
  }

  // ===== back in the hub: the copy, the escape
  { const r0 = T.ret, c0 = T.copy, x0 = T.esc;
    whoosh(ctx, sfx, r0 - 0.15, 0.5, 0.25); impact(ctx, sfx, r0, 0.3);
    pad(ctx, music, r0, x0 - r0, [38, 41, 45], { gain: 0.05, cutoff: 500, attack: 1, release: 0.5 });
    [62, 65, 69, 67].forEach((m, i) => piano(ctx, music, r0 + 0.5 + i * 0.95, m, 0.08, 3));
    { const sh = shot("hub-return"); chime(ctx, big, sh.t0 + sh.L("n12") + 2.55, 0.1); }
    { const sh = shot("hub-copy"); impact(ctx, big, c0 + sh.L("n13") + 1.9, 0.3); for (let t = c0 + 0.4; t < x0; t += 0.7) heartbeat(ctx, sfx, t, 0.3);
      for (const m of [62, 63]) tone(ctx, music, { t: c0, dur: x0 - c0, freq: mtof(m), type: "sawtooth", gain: 0.018, attack: 4, release: 0.2, cutoff: 1500 });
      braam(ctx, big, c0 + sh.L("c01") - 0.05, 35, 0.14); }
    { const sh = shot("hub-escape"), open = x0 + sh.dur - 0.85;
      for (let t = x0 + 0.15; t < x0 + sh.L("n14") + 2.3; t += 0.28) step(ctx, sfx, t, 0.1, true);
      riser(ctx, music, x0, open - x0, 0.2); hiss(ctx, sfx, { t: x0 + sh.L("n14") + 1.1, dur: open - x0 - sh.L("n14") - 1.1, gain: 0.08, type: "highpass", freq: 5000, attack: 0.9, release: 0.05 });
      for (let t = x0, k = 0; t < open; k++, t += Math.max(0.1, 0.42 - k * 0.025)) tone(ctx, music, { t, dur: 0.12, freq: mtof(38), gain: 0.18, release: 0.1, cutoff: 300 });
      impact(ctx, sfx, open, 0.9); braam(ctx, big, open, 38, 0.2); hiss(ctx, sfx, { t: open, dur: 2.2, gain: 0.3, type: "lowpass", freq: 3000, freqTo: 300 }); }
  }

  // ===== morning, and the tile comes back
  { const d0 = T.dawn, sh = shot("bed-dawn");
    pad(ctx, music, d0 + 0.3, sh.dur - 1.6, [60, 64, 67, 71], { gain: 0.04, cutoff: 1400, attack: 2, release: 1.2, type: "triangle" });
    for (let k = 0; k < 4; k++) bird(ctx, sfx, d0 + 0.8 + k * 1.2 + rnd() * 0.4);
    const back = d0 + sh.dur - 1.6; glitch(ctx, sfx, back, 0.4, 0.06); impact(ctx, sfx, back, 0.4); screech(ctx, big, back + 0.05, 1.4, 0.07);
    const t2 = T.two; [76, 79, 75, 72, 71, 72, 75, 67].forEach((m, i) => tone(ctx, music, { t: t2 + i * 0.4, dur: 1.2, freq: mtof(m), detune: -30 + i * 4, type: "triangle", gain: 0.05, attack: 0.004, release: 1.1 }));
    tone(ctx, music, { t: t2, dur: E("bed-two") - t2, freq: 36.7, gain: 0.18, attack: 0.5, release: 0.3 });
  }

  // ===== the ending: something bright and catchy, 118 bpm in C
  { const t0 = T.cta, beat = 60 / 118, end = dur, sh = shot("cta");
    whoosh(ctx, sfx, t0 - 0.35, 0.4, 0.25); impact(ctx, sfx, t0, 0.5);
    const prog = [[48, 55, 60, 64], [43, 55, 59, 62], [45, 57, 60, 64], [41, 57, 60, 65]], mel = [76, 74, 72, 74, 76, 79, 76, 74, 72, 72, 74, 76, 74, 72, 69, 72];
    for (let i = 0, t = t0 + 0.05; t < end - 0.6; i++, t = t0 + 0.05 + i * beat) {
      const ch = prog[Math.floor(i / 4) % 4];
      kick(ctx, music, t, 0.55); if (i % 2 === 1) clap(ctx, music, t, 0.16); hat(ctx, music, t + beat / 2, 0.045);
      tone(ctx, music, { t, dur: beat * 0.45, freq: mtof(ch[0] - 12), type: "sawtooth", gain: 0.1, cutoff: 600, release: 0.08 }); tone(ctx, music, { t: t + beat / 2, dur: beat * 0.4, freq: mtof(ch[0]), type: "sawtooth", gain: 0.06, cutoff: 800, release: 0.08 });
      ch.slice(1).forEach((m) => tone(ctx, music, { t: t + 0.02, dur: beat * 0.85, freq: mtof(m), type: "sawtooth", gain: 0.022, attack: 0.05, release: 0.25, cutoff: 2200, detune: (m % 3) * 6 }));   // pumping chords
      if (i >= 8 && i % 2 === 0) { const m = mel[(i / 2) % mel.length]; tone(ctx, music, { t, dur: beat * 1.5, freq: mtof(m), type: "square", gain: 0.025, cutoff: 3500, release: 0.4, pan: 0.15 }); tone(ctx, music, { t, dur: beat * 1.5, freq: mtof(m + 12), type: "sine", gain: 0.02, release: 0.4 }); }
    }
    const n17 = line("n17"), n18 = line("n18"), n19 = line("n19");
    n17.words.forEach((w) => { if (/racing|horror|heists|sports/i.test(w.w)) tone(ctx, sfx, { t: w.t, dur: 0.18, freq: 880, glideTo: 1320, type: "sine", gain: 0.07, release: 0.1 }); });
    chime(ctx, big, n18.t + 0.2, 0.09);
    { const w = n18.words.find((x) => /^play/i.test(x.w)); if (w) chime(ctx, big, w.t, 0.07); }
    const g78 = n19.t + 1.2; glitch(ctx, sfx, g78, 0.4, 0.05); tone(ctx, sfx, { t: g78, dur: 1.4, freq: 55, glideTo: 40, gain: 0.25, release: 1.2 });
    pad(ctx, music, end - 1.2, 1.6, [60, 64, 67, 72], { gain: 0.05, cutoff: 3000, attack: 0.02, release: 1.4 }); kick(ctx, music, end - 1.2, 0.6);
  }
  music.gain.setTargetAtTime(0, dur - 0.25, 0.12);

  const buf = await ctx.startRendering();
  normalize(buf);
  return buf;
}

// roughly -15 LUFS without clipping; ffmpeg's loudnorm makes the final pass
function normalize(buf) {
  const ch = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  let sum = 0, n = 0; for (const d of ch) for (let i = 0; i < d.length; i += 4) { const v = d[i]; if (Math.abs(v) > 0.003) { sum += v * v; n++; } }
  if (!n) return; const gain = Math.min(Math.pow(10, -16 / 20) / Math.sqrt(sum / n), 6);
  for (const d of ch) for (let i = 0; i < d.length; i++) { const v = d[i] * gain; d[i] = Math.abs(v) > 0.92 ? Math.sign(v) * (0.92 + 0.07 * Math.tanh((Math.abs(v) - 0.92) / 0.07)) : v; }
}

export function toWav(buf) {
  const nc = buf.numberOfChannels, len = buf.length, out = new ArrayBuffer(44 + len * nc * 2), v = new DataView(out);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + len * nc * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nc, true);
  v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * nc * 2, true); v.setUint16(32, nc * 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, len * nc * 2, true);
  const chans = Array.from({ length: nc }, (_, c) => buf.getChannelData(c)); let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < nc; c++) { const s = Math.max(-1, Math.min(1, chans[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return out;
}
