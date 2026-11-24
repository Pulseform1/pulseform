// The soundtrack: the voice lines (with a broadcast chain for the narrator and a monster chain for the
// 78th game), an original synthesized score for every section, and sound effects locked to the picture.
// Everything except the voices is generated here, so there is nothing to license.
export const SR = 48000;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 5; export const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

let NOISE = null;
function noise(ctx) { if (NOISE) return NOISE; const b = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return (NOISE = b); }
export function filt(ctx, type, freq, q = 0.7, gain = 0) { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; f.gain.value = gain; return f; }
export function panner(ctx, p) { const s = ctx.createStereoPanner(); s.pan.value = p; return s; }
function reverb(ctx, seconds, decay = 3) {
  const len = Math.floor(ctx.sampleRate * seconds), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  const conv = ctx.createConvolver(); conv.buffer = ir; return conv;
}
function softClip(k) { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } return c; }

// one shaped note
export function tone(ctx, bus, { t, dur, freq, type = "sine", gain = 0.2, attack = 0.005, release = 0.2, cutoff = 0, q = 0.7, glideTo = 0, detune = 0, pan = 0, cutoffTo = 0 }) {
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
export function hiss(ctx, bus, { t, dur, gain = 0.2, type = "bandpass", freq = 2000, q = 1, freqTo = 0, attack = 0.002, release = 0, pan = 0 }) {
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
export const kick = (c, b, t, g = 0.75) => { tone(c, b, { t, dur: 0.34, freq: 150, glideTo: 40, gain: g, release: 0.3 }); hiss(c, b, { t, dur: 0.02, gain: g * 0.2, type: "highpass", freq: 3000 }); };
export const snare = (c, b, t, g = 0.28) => { hiss(c, b, { t, dur: 0.2, gain: g, freq: 1900, q: 0.7 }); tone(c, b, { t, dur: 0.12, freq: 200, glideTo: 150, gain: g * 0.6 }); };
export const clap = (c, b, t, g = 0.24) => { for (const d of [0, 0.012, 0.026]) hiss(c, b, { t: t + d, dur: 0.12, gain: g, freq: 1400, q: 1.2 }); };
export const hat = (c, b, t, g = 0.05, open = false) => hiss(c, b, { t, dur: open ? 0.18 : 0.05, gain: g, type: "highpass", freq: 7500, pan: 0.2 });
export function pad(c, b, t, dur, notes, { gain = 0.05, cutoff = 900, attack = 1, release = 1, type = "sawtooth" } = {}) {
  notes.forEach((m, i) => [-9, 9].forEach((det) => tone(c, b, { t, dur, freq: mtof(m), type, gain: gain / notes.length * 2, attack, release, cutoff, detune: det, pan: (i % 2 ? 0.3 : -0.3) * (det > 0 ? 1 : -1) })));
}
export function piano(c, b, t, m, g = 0.12, dur = 3) {
  tone(c, b, { t, dur, freq: mtof(m), type: "sine", gain: g, attack: 0.004, release: dur * 0.95 });
  tone(c, b, { t, dur: dur * 0.6, freq: mtof(m + 12), type: "triangle", gain: g * 0.25, attack: 0.003, release: dur * 0.55 });
  tone(c, b, { t, dur: dur * 0.4, freq: mtof(m) * 3.01, type: "sine", gain: g * 0.08, attack: 0.002, release: dur * 0.35 });
}
export function braam(c, b, t, root = 38, g = 0.2) {
  for (const m of [root, root + 7, root + 12]) for (const d of [-14, 0, 14]) tone(c, b, { t, dur: 3.2, freq: mtof(m), type: "sawtooth", gain: g / 6, attack: 0.04, release: 2.4, cutoff: 180, cutoffTo: 1400, detune: d });
  tone(c, b, { t, dur: 3, freq: mtof(root - 12), gain: g * 0.9, attack: 0.02, release: 2.5 });
}
export function impact(c, b, t, g = 0.6) { tone(c, b, { t, dur: 1.6, freq: 70, glideTo: 28, gain: g, release: 1.5 }); hiss(c, b, { t, dur: 1.2, gain: g * 0.35, type: "lowpass", freq: 900, freqTo: 120 }); }
export function riser(c, b, t, dur, g = 0.18) {
  if (dur <= 0.05) return;
  const s = ctx_noise(c, b, t, dur, g); tone(c, b, { t, dur, freq: 110, glideTo: 880, type: "sawtooth", gain: g * 0.3, attack: dur * 0.9, release: 0.05, cutoff: 600, cutoffTo: 5000 }); return s;
}
function ctx_noise(c, b, t, dur, g) {   // a noise sweep that grows toward the end
  const s = c.createBufferSource(); s.buffer = noise(c); s.loop = true; const f = filt(c, "bandpass", 300, 1.2); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
  const gg = c.createGain(); gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(g, t + dur); gg.gain.linearRampToValueAtTime(0, t + dur + 0.03);
  s.connect(f); f.connect(gg); gg.connect(b); s.start(t); s.stop(t + dur + 0.05);
}
export function whoosh(c, b, t, dur = 0.6, g = 0.2, pan = 0) { hiss(c, b, { t, dur, gain: g, freq: 500, freqTo: 3500, q: 0.9, attack: dur * 0.6, pan }); }
export function heartbeat(c, b, t, g = 0.5) { for (const [d, k] of [[0, 1], [0.27, 0.7]]) tone(c, b, { t: t + d, dur: 0.22, freq: 62, glideTo: 40, gain: g * k, release: 0.18 }); }
export function glitch(c, b, t, dur, g = 0.08) { for (let x = t; x < t + dur; x += 0.025 + rnd() * 0.03) { tone(c, b, { t: x, dur: 0.02 + rnd() * 0.03, freq: 200 + rnd() * 3000, type: "square", gain: g * (0.5 + rnd() * 0.5), release: 0.01, pan: rnd() * 2 - 1 }); if (rnd() < 0.3) hiss(c, b, { t: x, dur: 0.03, gain: g, type: "highpass", freq: 4000 }); } }
export function ping(c, b, t, g = 0.22) { tone(c, b, { t, dur: 2.6, freq: 1320, gain: g, attack: 0.004, release: 2.5 }); tone(c, b, { t, dur: 1.8, freq: 1980, gain: g * 0.3, attack: 0.004, release: 1.7 }); tone(c, b, { t: t + 0.45, dur: 1.8, freq: 1320, gain: g * 0.25, attack: 0.004, release: 1.7 }); }
export function groan(c, b, t, dur, g = 0.3) { for (const [f, d] of [[46, 0], [48.5, 0.1], [92, 0.05]]) tone(c, b, { t: t + d, dur, freq: f, glideTo: f * 0.8, type: "sawtooth", gain: g / 3, attack: 0.4, release: dur * 0.5, cutoff: 380, cutoffTo: 160, q: 4 }); }
export function chime(c, b, t, g = 0.12) { [79, 84, 88, 91].forEach((m, i) => tone(c, b, { t: t + i * 0.055, dur: 1.4, freq: mtof(m), type: "sine", gain: g, attack: 0.003, release: 1.3, pan: (i - 1.5) * 0.25 })); }
export function click(c, b, t, g = 0.25) { hiss(c, b, { t, dur: 0.025, gain: g, type: "highpass", freq: 2500 }); tone(c, b, { t, dur: 0.03, freq: 1800, type: "square", gain: g * 0.15, release: 0.02 }); }
export function screech(c, b, t, dur, g = 0.12) { for (const m of [86, 87, 91, 92]) tone(c, b, { t, dur, freq: mtof(m), glideTo: mtof(m + 1), type: "sawtooth", gain: g / 4, attack: 0.02, release: dur * 0.6, cutoff: 5000, detune: rnd() * 30 }); }
export function buzz(c, b, t, dur, g = 0.03) { if (dur <= 0.02) return; tone(c, b, { t, dur, freq: 120, type: "sawtooth", gain: g, attack: 0.01, release: 0.01, cutoff: 1400 }); tone(c, b, { t, dur, freq: 60, type: "sine", gain: g * 0.8, attack: 0.01, release: 0.01 }); }
export function step(c, b, t, g = 0.12, hard = false) { hiss(c, b, { t, dur: 0.09, gain: g, type: "lowpass", freq: hard ? 1600 : 500 }); tone(c, b, { t, dur: 0.08, freq: hard ? 120 : 80, glideTo: 50, gain: g * 0.6 }); }
export function bird(c, b, t, g = 0.03) { const f = 2600 + rnd() * 1600; for (let i = 0; i < 3; i++) tone(c, b, { t: t + i * 0.11, dur: 0.08, freq: f, glideTo: f * 1.35, gain: g, attack: 0.01, release: 0.05, pan: 0.6 }); }

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
  // the way a real voice reaches you: through a headset, a phone, or a window in the rain
  if (line.fx === "headset") { chain(filt(ctx, "highpass", 180)); chain(filt(ctx, "lowpass", 7000)); chain(filt(ctx, "peaking", 2500, 0.9, 3)); }
  if (line.fx === "phone") { chain(filt(ctx, "highpass", 320)); chain(filt(ctx, "lowpass", 3400)); const ws = ctx.createWaveShaper(); ws.curve = softClip(1.6); chain(ws); }
  if (line.fx === "radio") {   // a police radio: narrow, a little crunchy, with squelch at both ends
    chain(filt(ctx, "highpass", 420)); chain(filt(ctx, "lowpass", 2900)); chain(filt(ctx, "peaking", 1700, 1, 4)); const ws = ctx.createWaveShaper(); ws.curve = softClip(2.4); chain(ws);
    hiss(ctx, buses.voice, { t: Math.max(0, t - 0.18), dur: 0.16, gain: 0.08, type: "bandpass", freq: 2200, q: 0.6 }); hiss(ctx, buses.voice, { t: t + dur + 0.02, dur: 0.14, gain: 0.07, type: "bandpass", freq: 2200, q: 0.6 });
    hiss(ctx, buses.voice, { t: Math.max(0, t - 0.05), dur: dur + 0.1, gain: 0.012, type: "bandpass", freq: 2000, q: 0.5 }); }
  if (who === "D") { node.connect(buses.voice); return; }
  if (line.fx === "glass") { chain(filt(ctx, "lowpass", 2600)); chain(filt(ctx, "lowshelf", 250, 0.7, 3)); const g = ctx.createGain(); g.gain.value = 1.4; chain(g); node.connect(buses.room); }
  if (who === "M" || who === "X" || who === "P") { if (mood === "whisper") { chain(filt(ctx, "highpass", 260)); } node.connect(buses.voice); return; }
  if (who === "G" || who === "C") {   // low, doubled, a little distorted, in a huge room
    chain(filt(ctx, "lowshelf", 200, 0.7, 4)); const ws = ctx.createWaveShaper(); ws.curve = softClip(who === "G" ? 1.8 : 1.3); chain(ws); chain(filt(ctx, "lowpass", who === "G" ? 6500 : 8000));
    node.connect(buses.villain); return;
  }
  node.connect(buses.voice);
}

// ---------------------------------------------------------------- the mix
export async function renderAudio(tl, { voDir, score }) {
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
  const room = ctx.createGain(); room.gain.value = 0.9; send(room, 1.4, 0.5, 3);   // voices heard from outside, through glass
  const buses = { narr, voice, villain, room };

  // ---- the voices
  const lines = tl.lines;
  const bufs = await Promise.all(lines.map(async (l) => { const r = await fetch(`${voDir}/${l.id}.wav`); return ctx.decodeAudioData(await r.arrayBuffer()); }));
  lines.forEach((l, i) => {
    const s = ctx.createBufferSource(); s.buffer = bufs[i]; s.playbackRate.value = l.rate; voiceChain(ctx, s, l, buses); s.start(l.t);
    if (l.who === "G" || l.who === "C") {   // a ring-modulated double, a hair late: the voice sounds like more than one thing
      const d = ctx.createBufferSource(); d.buffer = bufs[i]; d.playbackRate.value = l.rate;
      const rm = ctx.createGain(); rm.gain.value = 0; const o = ctx.createOscillator(); o.frequency.value = l.who === "G" ? 38 : 52; o.connect(rm.gain); o.start(l.t); o.stop(l.t + l.edur + 0.3);
      const g = ctx.createGain(); g.gain.value = l.who === "G" ? 0.5 : 0.35; const lp = filt(ctx, "lowpass", 3000); d.connect(rm); rm.connect(lp); lp.connect(g); g.connect(villain); d.start(l.t + 0.016);
    }
    // duck the music (and, if the film asks, the effects) under every line
    const a = Math.max(0, l.t - 0.08), b = l.t + l.edur, dk = tl.duck || {};
    music.gain.setTargetAtTime(0.55 * (l.who === "N" ? dk.music ?? 0.42 : 0.5), a, 0.05); music.gain.setTargetAtTime(0.55, b + 0.05, 0.3);
    if (dk.sfx) { sfx.gain.setTargetAtTime(0.75 * dk.sfx, a, 0.05); sfx.gain.setTargetAtTime(0.75, b + 0.05, 0.3); }
  });

  // ---- the score and sound effects for this film
  score({ ctx, music, sfx, big, tl, dur });

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
