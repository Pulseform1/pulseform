// Music, sound effects and the narration mix, rendered with an OfflineAudioContext.
// Every sound is synthesized here (oscillators, filtered noise), so the audio is original and needs no licences.
import { rng } from "./util.js";

export const SAMPLE_RATE = 48000;
const GENRE_MUSIC = { horror: "horror", mystery: "mystery", comedy: "comedy", drama: "drama", twist: "mystery", suspense: "suspense", school: "lofi", scifi: "scifi", adventure: "adventure" };

const noiseCache = new WeakMap();
function noise(ctx) {
  if (noiseCache.has(ctx)) return noiseCache.get(ctx);
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseCache.set(ctx, b); return b;
}
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// one shaped note: oscillator -> optional filter -> envelope -> bus
function tone(ctx, bus, { t, dur, freq, type = "sine", gain = 0.2, attack = 0.005, release = 0.2, cutoff = 0, q = 0.7, glideTo = 0, detune = 0 }) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
  if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.setValueAtTime(gain, Math.max(t + attack, t + dur - release)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (cutoff) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cutoff; f.Q.value = q; o.connect(f); node = f; }
  node.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
function hiss(ctx, bus, { t, dur, gain = 0.2, type = "bandpass", freq = 2000, q = 1, freqTo = 0, attack = 0.002 }) {
  const s = ctx.createBufferSource(); s.buffer = noise(ctx); s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
const kick = (ctx, bus, t, g = 0.7) => tone(ctx, bus, { t, dur: 0.32, freq: 140, glideTo: 42, gain: g, release: 0.28 });
const snare = (ctx, bus, t, g = 0.25) => { hiss(ctx, bus, { t, dur: 0.18, gain: g, freq: 1800, q: 0.8 }); tone(ctx, bus, { t, dur: 0.12, freq: 190, gain: g * 0.6 }); };
const hat = (ctx, bus, t, g = 0.06) => hiss(ctx, bus, { t, dur: 0.05, gain: g, type: "highpass", freq: 7000 });

// ---------------------------------------------------------------- music
function music(ctx, bus, id, dur, seed) {
  const r = rng(seed);
  const end = dur + 1;
  if (id === "horror") {
    tone(ctx, bus, { t: 0, dur: end, freq: 55, type: "sine", gain: 0.22, attack: 2.5, release: 2 });
    tone(ctx, bus, { t: 0, dur: end, freq: 58.3, type: "sine", gain: 0.16, attack: 3, release: 2 });
    tone(ctx, bus, { t: 0, dur: end, freq: 110, type: "sawtooth", gain: 0.035, attack: 4, cutoff: 260, release: 2 });
    hiss(ctx, bus, { t: 0, dur: end, gain: 0.05, type: "lowpass", freq: 500, attack: 3 });
    for (let t = 3 + r() * 3; t < dur; t += 5 + r() * 5) tone(ctx, bus, { t, dur: 4, freq: [932, 988, 1047, 698][Math.floor(r() * 4)], gain: 0.04, attack: 0.01, release: 3.8 });
    return;
  }
  if (id === "suspense") {
    tone(ctx, bus, { t: 0, dur: end, freq: 49, type: "sawtooth", gain: 0.06, cutoff: 180, attack: 2 });
    for (let t = 0; t < dur; t += 0.5) { hiss(ctx, bus, { t, dur: 0.03, gain: 0.07, type: "highpass", freq: 5000 }); if ((t * 2) % 2 === 0) tone(ctx, bus, { t, dur: 0.4, freq: 65, gain: 0.18 + 0.1 * (t / dur) }); }
    for (let t = 0; t < dur; t += 0.125) tone(ctx, bus, { t, dur: 0.12, freq: mtof(57 + (Math.floor(t / 4) % 2)), type: "sawtooth", gain: 0.018, cutoff: 1200 });
    return;
  }
  const P = {
    mystery: { bpm: 92, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], drums: "soft", lead: "pulse" },
    comedy: { bpm: 116, chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], drums: "bouncy", lead: "pizz" },
    drama: { bpm: 72, chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], drums: "none", lead: "piano" },
    scifi: { bpm: 108, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 48, 52]], drums: "electro", lead: "arp" },
    adventure: { bpm: 104, chords: [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]], drums: "groove", lead: "strum" },
    lofi: { bpm: 82, chords: [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]], drums: "lofi", lead: "keys" },
  }[id];
  if (!P) return;
  const beat = 60 / P.bpm, bar = beat * 4;
  for (let b = 0, t = 0; t < dur; b++, t += bar) {
    const ch = P.chords[b % P.chords.length];
    // pad
    ch.forEach((m) => tone(ctx, bus, { t, dur: bar + 0.2, freq: mtof(m), type: id === "scifi" ? "sawtooth" : "triangle", gain: 0.03, attack: 0.4, release: 0.5, cutoff: 1400, detune: (r() - 0.5) * 12 }));
    tone(ctx, bus, { t, dur: bar * 0.95, freq: mtof(ch[0] - 24), type: "triangle", gain: 0.13, attack: 0.02, release: 0.4 });
    for (let k = 0; k < 8; k++) {
      const tt = t + k * beat / 2, m = ch[k % ch.length] + 12;
      if (P.lead === "pizz" && k % 2 === 0) tone(ctx, bus, { t: tt, dur: 0.18, freq: mtof(m), type: "triangle", gain: 0.08, release: 0.15 });
      if (P.lead === "arp") tone(ctx, bus, { t: tt, dur: 0.2, freq: mtof(ch[k % ch.length] + (k > 3 ? 24 : 12)), type: "square", gain: 0.025, cutoff: 2200, release: 0.15 });
      if (P.lead === "piano" && k % 2 === 0) { tone(ctx, bus, { t: tt, dur: 1.4, freq: mtof(m), type: "sine", gain: 0.07, release: 1.2 }); tone(ctx, bus, { t: tt, dur: 0.6, freq: mtof(m) * 2, type: "triangle", gain: 0.015, release: 0.5 }); }
      if (P.lead === "pulse" && k % 2 === 1) tone(ctx, bus, { t: tt, dur: 0.25, freq: mtof(ch[0] - 12), type: "triangle", gain: 0.06 });
      if (P.lead === "strum" && (k === 0 || k === 3 || k === 6)) ch.forEach((cm, j) => tone(ctx, bus, { t: tt + j * 0.015, dur: 0.5, freq: mtof(cm + 12), type: "sawtooth", gain: 0.02, cutoff: 1800, release: 0.4 }));
      if (P.lead === "keys" && (k === 0 || k === 5)) ch.forEach((cm) => tone(ctx, bus, { t: tt, dur: 1.1, freq: mtof(cm), type: "sine", gain: 0.035, release: 0.9 }));
    }
    for (let k = 0; k < 4; k++) {
      const tt = t + k * beat, swing = P.drums === "lofi" ? 0.03 : 0;
      if (P.drums === "none") continue;
      if (P.drums === "soft") { if (k === 0) kick(ctx, bus, tt, 0.35); hat(ctx, bus, tt + beat / 2, 0.035); continue; }
      if (k === 0 || (P.drums !== "lofi" && k === 2)) kick(ctx, bus, tt, P.drums === "lofi" ? 0.45 : 0.55);
      if (P.drums === "lofi" && k === 2) kick(ctx, bus, tt + beat / 2, 0.35);
      if (k === 1 || k === 3) snare(ctx, bus, tt, P.drums === "lofi" ? 0.14 : 0.2);
      hat(ctx, bus, tt, 0.04); hat(ctx, bus, tt + beat / 2 + swing, 0.03);
    }
  }
}

// ---------------------------------------------------------------- sound effects
function sfx(ctx, bus, cue, r) {
  const t = Math.max(0, cue.t);
  switch (cue.type) {
    case "receive": tone(ctx, bus, { t, dur: 0.09, freq: 1318, gain: 0.18 }); tone(ctx, bus, { t: t + 0.07, dur: 0.16, freq: 1760, gain: 0.15, release: 0.12 }); break;
    case "image": hiss(ctx, bus, { t, dur: 0.06, gain: 0.25, freq: 3000 }); tone(ctx, bus, { t: t + 0.05, dur: 0.16, freq: 1568, gain: 0.14 }); break;
    case "send": hiss(ctx, bus, { t: t - 0.05, dur: 0.22, gain: 0.16, freq: 800, freqTo: 4200, q: 2 }); tone(ctx, bus, { t: t + 0.1, dur: 0.08, freq: 880, gain: 0.1 }); break;
    case "system": tone(ctx, bus, { t, dur: 0.3, freq: 523, gain: 0.08, release: 0.25 }); break;
    case "typing-start": tone(ctx, bus, { t, dur: 0.06, freq: 660, gain: 0.04 }); break;
    case "keys": for (let x = t; x < t + cue.dur; x += 0.06 + r() * 0.07) hiss(ctx, bus, { t: x, dur: 0.025, gain: 0.08 + r() * 0.05, freq: 2500 + r() * 2000, q: 2 }); break;
    case "reaction": tone(ctx, bus, { t, dur: 0.12, freq: 600, glideTo: 1400, gain: 0.12 }); break;
    case "fx-shake": case "fx-flash": tone(ctx, bus, { t, dur: 0.9, freq: 90, glideTo: 32, gain: 0.55, release: 0.8 }); hiss(ctx, bus, { t, dur: 0.5, gain: 0.25, type: "lowpass", freq: 900 }); if (cue.type === "fx-flash") hiss(ctx, bus, { t, dur: 0.6, gain: 0.1, type: "highpass", freq: 6000 }); break;
    case "fx-zoom": hiss(ctx, bus, { t: t - 0.5, dur: 0.6, gain: 0.12, freq: 300, freqTo: 3000, q: 3 }); tone(ctx, bus, { t, dur: 1.2, freq: 55, gain: 0.3, attack: 0.02, release: 1 }); break;
    case "fx-glitch": for (let k = 0; k < 7; k++) tone(ctx, bus, { t: t + k * 0.07, dur: 0.06, freq: 200 + r() * 2400, type: "square", gain: 0.06 }); hiss(ctx, bus, { t, dur: 0.5, gain: 0.1, freq: 4000, q: 0.5 }); break;
    case "fx-darken": tone(ctx, bus, { t, dur: 0.8, freq: 420, glideTo: 40, type: "sawtooth", gain: 0.12, cutoff: 900, release: 0.6 }); break;
    case "fx-heartbeat": for (let k = 0; k < 3; k++) { tone(ctx, bus, { t: t + k * 0.62, dur: 0.18, freq: 60, glideTo: 40, gain: 0.5 }); tone(ctx, bus, { t: t + k * 0.62 + 0.2, dur: 0.16, freq: 55, glideTo: 38, gain: 0.35 }); } break;
    default: break;
  }
}

// narration: { buffers: Map(messageId -> AudioBuffer) }
export async function renderMix(compiled, narration, opts = {}) {
  const { story } = compiled;
  const dur = compiled.duration;
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * SAMPLE_RATE), SAMPLE_RATE);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
  const out = ctx.createGain(); out.gain.value = 0.95; comp.connect(out); out.connect(ctx.destination);
  const musicBus = ctx.createGain(), sfxBus = ctx.createGain(), voiceBus = ctx.createGain();
  [musicBus, sfxBus, voiceBus].forEach((b) => b.connect(comp));
  const mv = (story.audio.musicVolume ?? 0.55) * 0.9, sv = story.audio.sfxVolume ?? 0.8;
  musicBus.gain.value = mv; sfxBus.gain.value = sv; voiceBus.gain.value = 1.15;

  const musicId = story.audio.music === "auto" ? GENRE_MUSIC[story.genre] || "lofi" : story.audio.music;
  if (musicId !== "none") music(ctx, musicBus, musicId, dur, story.seed || 7);
  const r = rng(11);
  compiled.cues.forEach((c) => sfx(ctx, sfxBus, c, r));

  // narration, with the music ducked underneath
  const buffers = story.narration.enabled ? narration?.buffers : null;
  if (buffers) for (const it of compiled.items) {
    const b = it.narration && buffers.get(it.msg.id);
    if (!b) continue;
    const s = ctx.createBufferSource(); s.buffer = b; s.connect(voiceBus); s.start(it.narration.start);
    musicBus.gain.setTargetAtTime(mv * 0.42, Math.max(0, it.narration.start - 0.05), 0.06);
    musicBus.gain.setTargetAtTime(mv, it.narration.start + b.duration, 0.25);
  }
  // fade the music out at the end
  musicBus.gain.setTargetAtTime(0, Math.max(0, dur - 1.2), 0.35);
  const buf = await ctx.startRendering();
  normalize(buf);
  return buf;
}

// Bring the mix to roughly -14 LUFS (what TikTok, Reels and Shorts play at) without clipping.
function normalize(buf) {
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  let sum = 0, n = 0, peak = 0;
  for (const d of chans) for (let i = 0; i < d.length; i += 4) { const v = Math.abs(d[i]); if (v > 0.003) { sum += v * v; n++; } if (v > peak) peak = v; }
  if (!n) return;
  const rms = Math.sqrt(sum / n), target = Math.pow(10, -15.5 / 20);
  const gain = Math.min(target / rms, 4);
  for (const d of chans) for (let i = 0; i < d.length; i++) { const v = d[i] * gain; d[i] = v > 0.9 || v < -0.9 ? Math.sign(v) * (0.9 + 0.09 * Math.tanh((Math.abs(v) - 0.9) / 0.09)) : v; }
}

// Decode WAV/MP3 bytes into an AudioBuffer at our sample rate.
export async function decode(arrayBuffer) {
  const ctx = new OfflineAudioContext(1, 1, SAMPLE_RATE);
  return ctx.decodeAudioData(arrayBuffer);
}
