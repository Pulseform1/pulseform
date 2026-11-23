// Music, sound effects and the narration mix, rendered with an OfflineAudioContext.
// Every sound is synthesized here (oscillators, filtered noise), so the audio is original and needs no licences.
import { rng } from "./util.js";
import { EVENTS } from "./scenes2.js";
import { EVENTS3 } from "./scenes3.js";
import { EVENTS4 } from "./scenes4.js";

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
    action: { bpm: 140, chords: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 43, 47]], drums: "drive", lead: "arp" },
    epic: { bpm: 96, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]], drums: "toms", lead: "strum" },
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
      if (P.drums === "drive") { kick(ctx, bus, tt, 0.5); if (k === 1 || k === 3) snare(ctx, bus, tt, 0.22); hat(ctx, bus, tt + beat / 2, 0.05); tone(ctx, bus, { t: tt, dur: beat * 0.45, freq: mtof(ch[0] - 12), type: "sawtooth", gain: 0.06, cutoff: 500 }); tone(ctx, bus, { t: tt + beat / 2, dur: beat * 0.45, freq: mtof(ch[0] - 12), type: "sawtooth", gain: 0.05, cutoff: 500 }); continue; }
      if (P.drums === "toms") { tone(ctx, bus, { t: tt, dur: 0.5, freq: k % 2 ? 110 : 82, glideTo: 55, gain: 0.35, release: 0.4 }); if (k === 3) tone(ctx, bus, { t: tt + beat / 2, dur: 0.4, freq: 130, glideTo: 70, gain: 0.25 }); if (k === 0) hiss(ctx, bus, { t: tt, dur: 1.2, gain: 0.04, type: "highpass", freq: 5000, attack: 0.01 }); continue; }
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
    // ---- scene cutaways
    case "scene-in": hiss(ctx, bus, { t, dur: 0.7, gain: 0.2, type: "lowpass", freq: 2600, freqTo: 180, attack: 0.25 }); tone(ctx, bus, { t: t + 0.45, dur: 1.4, freq: 72, glideTo: 34, gain: 0.4, release: 1.2 }); break;
    case "scene-cut": tone(ctx, bus, { t: t + 0.2, dur: 1.1, freq: 64, glideTo: 34, gain: 0.32, release: 0.9 }); hiss(ctx, bus, { t, dur: 0.35, gain: 0.1, type: "lowpass", freq: 1600, freqTo: 200, attack: 0.1 }); break;
    case "figure":   // a dissonant sting with a swell into it
      hiss(ctx, bus, { t: t - 0.7, dur: 0.75, gain: 0.16, type: "bandpass", freq: 400, freqTo: 5000, q: 1.5, attack: 0.65 });
      [277, 392, 415, 554].forEach((f, i) => tone(ctx, bus, { t, dur: 2.2, freq: f, type: "sawtooth", gain: 0.05, cutoff: 1800, release: 1.8, detune: (i - 1.5) * 9 }));
      tone(ctx, bus, { t, dur: 1.6, freq: 65, glideTo: 30, gain: 0.55, release: 1.4 }); break;
    case "amb-bedroom": hiss(ctx, bus, { t, dur: cue.dur, gain: 0.04, type: "lowpass", freq: 380, attack: 0.5 }); tone(ctx, bus, { t, dur: cue.dur, freq: 118, gain: 0.02, attack: 0.5, release: 0.5 });
      for (let x = t + 0.8; x < t + cue.dur - 0.5; x += 1.6 + r() * 1.4) tone(ctx, bus, { t: x, dur: 0.5, freq: 260 + r() * 60, glideTo: 180, type: "sawtooth", gain: 0.018, cutoff: 700, release: 0.4 }); break;
    case "amb-hallway":
      for (let x = t + 0.15; x < t + cue.dur - 0.3; x += 0.66) { tone(ctx, bus, { t: x, dur: 0.14, freq: 95, glideTo: 50, gain: 0.3 }); hiss(ctx, bus, { t: x, dur: 0.09, gain: 0.1, type: "lowpass", freq: 700 }); }
      tone(ctx, bus, { t: t + 1.2, dur: 0.9, freq: 330, glideTo: 210, type: "sawtooth", gain: 0.035, cutoff: 900, release: 0.6 });
      tone(ctx, bus, { t, dur: cue.dur, freq: 120, type: "square", gain: 0.012, cutoff: 380, attack: 0.3 }); break;
    case "amb-kitchen": tone(ctx, bus, { t, dur: cue.dur, freq: 60, gain: 0.07, attack: 0.4 }); tone(ctx, bus, { t, dur: cue.dur, freq: 120, gain: 0.025, attack: 0.4 });
      for (let x = t + 0.6; x < t + cue.dur; x += 1.3 + r() * 0.5) tone(ctx, bus, { t: x, dur: 0.18, freq: 1900, glideTo: 900, gain: 0.05, release: 0.15 }); break;
    case "amb-basement": tone(ctx, bus, { t, dur: cue.dur, freq: 41, gain: 0.18, attack: 0.8 });
      for (let x = t + 0.3; x < t + cue.dur; x += 2.1) tone(ctx, bus, { t: x, dur: 0.7, freq: 520, glideTo: 430, type: "sawtooth", gain: 0.02, cutoff: 1200, release: 0.5 });
      for (let x = t + 1; x < t + cue.dur; x += 1.7 + r()) { tone(ctx, bus, { t: x, dur: 0.12, freq: 1400, glideTo: 700, gain: 0.06 }); tone(ctx, bus, { t: x + 0.28, dur: 0.12, freq: 1400, glideTo: 700, gain: 0.02 }); } break;
    case "amb-living": hiss(ctx, bus, { t, dur: cue.dur, gain: 0.07, type: "bandpass", freq: 3200, q: 0.6, attack: 0.1 }); break;
    case "amb-frontdoor": [0.05, 0.6, 1.15].forEach((k) => { tone(ctx, bus, { t: t + k, dur: 0.16, freq: 150, glideTo: 70, gain: 0.7 }); hiss(ctx, bus, { t: t + k, dur: 0.08, gain: 0.35, type: "lowpass", freq: 1100 }); });
      hiss(ctx, bus, { t, dur: cue.dur, gain: 0.04, type: "lowpass", freq: 500, attack: 0.6 }); break;
    // ---- inside The Endless Halls
    case "amb-endless-halls": case "amb-endless-crawler": case "amb-endless-watcher": case "amb-endless-grin": {
      const dark = cue.type === "amb-endless-grin";
      tone(ctx, bus, { t, dur: cue.dur, freq: 120, type: "sawtooth", gain: dark ? 0.008 : 0.022, cutoff: 520, attack: 0.3 });   // fluorescent hum
      hiss(ctx, bus, { t, dur: cue.dur, gain: 0.012, type: "highpass", freq: 6500, attack: 0.3 });
      if (cue.type === "amb-endless-crawler" && cue.figT) for (let x = cue.figT; x < t + cue.dur; x += 0.08 + r() * 0.16) { hiss(ctx, bus, { t: x, dur: 0.03, gain: 0.06 + r() * 0.08, type: "highpass", freq: 2500 + r() * 3000 }); if (r() < 0.15) tone(ctx, bus, { t: x, dur: 0.1, freq: 70, gain: 0.2 }); }
      if (cue.type === "amb-endless-watcher" && cue.figT) for (let x = cue.figT + 0.02; x < t + cue.dur; x += 1.1) { tone(ctx, bus, { t: x, dur: 0.5, freq: 85, glideTo: 38, gain: 0.55, release: 0.4 }); hiss(ctx, bus, { t: x, dur: 0.18, gain: 0.18, type: "lowpass", freq: 900 }); }
      if (dark) {
        const off = t + 1.2;   // the flashlight dies
        hiss(ctx, bus, { t: off, dur: 0.04, gain: 0.3, type: "highpass", freq: 3000 }); tone(ctx, bus, { t: off, dur: 0.06, freq: 1800, gain: 0.08 });
        tone(ctx, bus, { t: off, dur: cue.dur - 1.2, freq: 46, gain: 0.16, attack: 1.2 });
        if (cue.figT) for (let k = 0; k < 6; k++) tone(ctx, bus, { t: cue.figT + 0.1 + k * 0.13, dur: 0.12, freq: 760 - k * 45, type: "sawtooth", gain: 0.035, cutoff: 1700, release: 0.08 });   // a giggle
      }
      break;
    }
    case "amb-endless-fusebox":
      [0.9, 1.6, 2.3].forEach((k) => { tone(ctx, bus, { t: t + k, dur: 0.22, freq: 170, glideTo: 60, gain: 0.6 }); hiss(ctx, bus, { t: t + k, dur: 0.14, gain: 0.2, type: "bandpass", freq: 3200, q: 0.8 }); });
      tone(ctx, bus, { t: t + 2.3, dur: 1.4, freq: 60, glideTo: 120, type: "sawtooth", gain: 0.05, cutoff: 600, attack: 0.3 });
      [523, 659, 784, 1047].forEach((f, i) => tone(ctx, bus, { t: t + 2.55 + i * 0.09, dur: 1.2, freq: f, type: "triangle", gain: 0.06, release: 1 })); break;
    case "amb-endless-exit":
      tone(ctx, bus, { t: t + 0.6, dur: 0.5, freq: 120, glideTo: 50, gain: 0.6 }); hiss(ctx, bus, { t: t + 0.6, dur: 0.3, gain: 0.25, type: "lowpass", freq: 1500 });
      hiss(ctx, bus, { t: t + 0.7, dur: cue.dur - 0.7, gain: 0.08, type: "bandpass", freq: 700, freqTo: 2500, q: 0.5, attack: 1 });
      [262, 330, 392, 523, 659].forEach((f) => tone(ctx, bus, { t: t + 1, dur: cue.dur - 0.8, freq: f, type: "triangle", gain: 0.035, attack: 1.4, release: 1.2 })); break;
    // ---- Night Shift, One More Night, Nightwatch (times come from the scenes' EVENTS, relative to cue.t0)
    case "amb-ns-exterior": case "amb-ns-pump": case "amb-ns-dawn": {
      hiss(ctx, bus, { t, dur: cue.dur, gain: 0.05, type: "lowpass", freq: 420, attack: 0.5 });
      tone(ctx, bus, { t, dur: cue.dur, freq: 120, type: "square", gain: 0.01, cutoff: 400, attack: 0.3 });
      if (cue.type === "amb-ns-pump") { tone(ctx, bus, { t, dur: cue.dur, freq: 38, type: "sawtooth", gain: 0.1, cutoff: 140, attack: 0.4 }); if (cue.figT) { [0, 0.16].forEach((k) => tone(ctx, bus, { t: cue.figT + k, dur: 0.1, freq: 1900, type: "square", gain: 0.04, cutoff: 3000 })); tone(ctx, bus, { t: cue.figT + 0.3, dur: cue.dur, freq: 95, glideTo: 140, type: "sawtooth", gain: 0.05, cutoff: 500, attack: 0.4 }); } }
      if (cue.type === "amb-ns-dawn") for (let x = t + 0.5; x < t + cue.dur; x += 0.7 + r() * 0.9) tone(ctx, bus, { t: x, dur: 0.12, freq: 3200 + r() * 1500, glideTo: 4800, gain: 0.025 });
      break;
    }
    case "amb-ns-clipboard": case "amb-ns-phone": case "amb-ns-customer": case "amb-ns-lookdown": case "amb-ns-flicker": {
      const e = EVENTS[cue.type.slice(4)] || {}, t0 = cue.t0 ?? t;
      tone(ctx, bus, { t, dur: cue.dur, freq: 120, type: "sawtooth", gain: 0.016, cutoff: 480, attack: 0.3 });
      hiss(ctx, bus, { t, dur: cue.dur, gain: 0.012, type: "highpass", freq: 6500, attack: 0.3 });
      if (cue.type === "amb-ns-clipboard") hiss(ctx, bus, { t: t0 + 0.7, dur: 0.25, gain: 0.08, type: "bandpass", freq: 2500, q: 0.6 });
      (e.rings || []).forEach((r0) => { for (let x = 0; x < 1.25; x += 0.05) tone(ctx, bus, { t: t0 + r0 + x, dur: 0.045, freq: Math.round(x / 0.05) % 2 ? 1180 : 1420, type: "triangle", gain: 0.085, release: 0.03 }); });
      (e.chime || []).forEach((c0) => { tone(ctx, bus, { t: t0 + c0, dur: 1, freq: 659, gain: 0.11, release: 0.9 }); tone(ctx, bus, { t: t0 + c0 + 0.32, dur: 1.2, freq: 523, gain: 0.11, release: 1 }); hiss(ctx, bus, { t, dur: cue.dur, gain: 0.03, type: "bandpass", freq: 5000, q: 0.4, attack: 0.5 }); });
      (e.taps || []).forEach((x) => { tone(ctx, bus, { t: t0 + x, dur: 0.035, freq: 950, gain: 0.25 }); hiss(ctx, bus, { t: t0 + x, dur: 0.03, gain: 0.15, type: "highpass", freq: 2500 }); });
      (e.off || []).forEach((x) => { hiss(ctx, bus, { t: t0 + x, dur: 0.06, gain: 0.25, type: "highpass", freq: 2000 }); tone(ctx, bus, { t: t0 + x, dur: 0.2, freq: 60, type: "square", gain: 0.06, cutoff: 300 }); });
      if (cue.type === "amb-ns-flicker" && cue.figT) { tone(ctx, bus, { t: cue.figT, dur: 0.6, freq: 95, glideTo: 40, gain: 0.8 }); hiss(ctx, bus, { t: cue.figT, dur: 0.5, gain: 0.3, type: "bandpass", freq: 3800, q: 0.7 }); tone(ctx, bus, { t: cue.figT + 0.4, dur: 0.05, freq: 2200, gain: 0.1 }); }
      break;
    }
    case "amb-omn-run": { hiss(ctx, bus, { t, dur: cue.dur, gain: 0.06, type: "lowpass", freq: 500, attack: 0.4 });
      for (let x = t; x < t + cue.dur - 0.2; x += 0.19) { tone(ctx, bus, { t: x, dur: 0.08, freq: 80, glideTo: 45, gain: 0.32 }); hiss(ctx, bus, { t: x, dur: 0.05, gain: 0.07, type: "lowpass", freq: 1400 }); }
      for (let x = t + 0.1; x < t + cue.dur - 0.3; x += 0.38) breath(ctx, bus, x, 0.22, 0.09, x % 0.76 < 0.38 ? 1200 : 900); break; }
    case "amb-omn-board": case "amb-omn-watchers": case "amb-omn-door": case "amb-omn-window": case "amb-omn-radio": {
      const e = EVENTS[cue.type.slice(4)] || {}, t0 = cue.t0 ?? t;
      for (let x = t + 0.2; x < t + cue.dur; x += 0.11 + r() * 0.1) tone(ctx, bus, { t: x, dur: 0.03, freq: 4200 + r() * 600, gain: 0.012 });   // crickets
      hiss(ctx, bus, { t, dur: cue.dur, gain: 0.04, type: "lowpass", freq: 380, attack: 0.5 });
      (e.hits || []).forEach((x) => { tone(ctx, bus, { t: t0 + x, dur: 0.14, freq: 240, glideTo: 90, gain: 0.6 }); hiss(ctx, bus, { t: t0 + x, dur: 0.07, gain: 0.25, type: "bandpass", freq: 1800, q: 0.8 }); });
      if (cue.type === "amb-omn-board") for (let x = t; x < t + cue.dur; x += 0.125) tone(ctx, bus, { t: x, dur: 0.08, freq: 48, type: "square", gain: 0.03, cutoff: 160 });
      (e.knocks || []).forEach((x) => { tone(ctx, bus, { t: t0 + x, dur: 0.14, freq: 170, glideTo: 80, gain: 0.75 }); hiss(ctx, bus, { t: t0 + x, dur: 0.07, gain: 0.3, type: "lowpass", freq: 1000 }); });
      (e.boards || []).forEach((x) => { hiss(ctx, bus, { t: t0 + x, dur: 0.18, gain: 0.5, type: "bandpass", freq: 1100, q: 0.5 }); tone(ctx, bus, { t: t0 + x, dur: 0.25, freq: 170, glideTo: 55, gain: 0.55 }); });
      if (cue.type === "amb-omn-window" && cue.figT) tone(ctx, bus, { t: cue.figT, dur: 1.4, freq: 70, glideTo: 46, type: "sawtooth", gain: 0.2, cutoff: 420, release: 1 });
      if (cue.type === "amb-omn-watchers" && cue.figT) for (let x = cue.figT; x < t + cue.dur; x += 1.4) tone(ctx, bus, { t: x, dur: 0.6, freq: 75, glideTo: 36, gain: 0.45, release: 0.5 });
      if (cue.type === "amb-omn-radio") { hiss(ctx, bus, { t, dur: Math.max(0.5, t0 + 3.3 - t), gain: 0.09, type: "bandpass", freq: 2500, q: 0.4, attack: 0.1 }); tone(ctx, bus, { t: t0 + 0.9, dur: 2.4, freq: 600, glideTo: 1500, gain: 0.025 }); tone(ctx, bus, { t: t0 + 3.3, dur: 0.05, freq: 1800, gain: 0.1 }); }
      break;
    }
    case "amb-omn-dawn": { for (let x = t; x < t + cue.dur; x += 0.09) hiss(ctx, bus, { t: x, dur: 0.07, gain: 0.07, type: "lowpass", freq: 500 }); for (let x = t + 0.6; x < t + cue.dur; x += 0.8 + r() * 0.8) tone(ctx, bus, { t: x, dur: 0.12, freq: 3300 + r() * 1400, glideTo: 4800, gain: 0.025 }); break; }
    case "amb-nw-desk": case "amb-nw-cam-office": case "amb-nw-elevator": case "amb-nw-hall": case "amb-nw-locker": case "amb-nw-tape": case "amb-nw-cam13": {
      const e = EVENTS[cue.type.slice(4)] || {}, t0 = cue.t0 ?? t;
      tone(ctx, bus, { t, dur: cue.dur, freq: 60, type: "square", gain: 0.012, cutoff: 250, attack: 0.3 });
      hiss(ctx, bus, { t, dur: cue.dur, gain: cue.type === "amb-nw-tape" ? 0.05 : 0.02, type: "highpass", freq: 3500, attack: 0.2 });
      if (cue.type === "amb-nw-cam-office") hiss(ctx, bus, { t: t0 + 1, dur: Math.max(1, cue.dur - 1.5), gain: 0.07, type: "lowpass", freq: 260, attack: 0.3 });
      (e.ding || []).forEach((x) => { tone(ctx, bus, { t: t0 + x, dur: 1.4, freq: 1318, gain: 0.1, release: 1.2 }); tone(ctx, bus, { t: t0 + x + 0.25, dur: 1.4, freq: 1046, gain: 0.1, release: 1.2 }); });
      (e.open || []).forEach((x) => hiss(ctx, bus, { t: t0 + x, dur: 0.9, gain: 0.12, type: "bandpass", freq: 600, freqTo: 1600, q: 0.6, attack: 0.3 }));
      (e.steps || []).forEach((x) => { tone(ctx, bus, { t: t0 + x, dur: 0.22, freq: 75, glideTo: 38, gain: 0.7 }); hiss(ctx, bus, { t: t0 + x, dur: 0.1, gain: 0.15, type: "lowpass", freq: 600 }); });
      if (cue.type === "amb-nw-hall") for (let x = t + 0.8; x < t + Math.min(cue.dur, 5); x += 2) for (let y = 0; y < 1; y += 0.05) tone(ctx, bus, { t: x + y, dur: 0.045, freq: Math.round(y / 0.05) % 2 ? 1180 : 1420, type: "triangle", gain: 0.02, release: 0.03 });
      if (cue.type === "amb-nw-tape") tone(ctx, bus, { t, dur: cue.dur, freq: 7800, gain: 0.004, attack: 0.2 });
      if (cue.type === "amb-nw-cam13" || cue.type === "amb-nw-locker") tone(ctx, bus, { t, dur: cue.dur, freq: 44, gain: 0.14, attack: 1 });
      break;
    }
    case "amb-nw-lobby": { for (let x = t; x < t + cue.dur - 0.3; x += 0.18) { tone(ctx, bus, { t: x, dur: 0.05, freq: 300, glideTo: 120, gain: 0.25 }); hiss(ctx, bus, { t: x, dur: 0.03, gain: 0.1, type: "highpass", freq: 2500 }); }
      for (let x = t + 0.1; x < t + cue.dur - 0.3; x += 0.36) breath(ctx, bus, x, 0.2, 0.08, 1100);
      [262, 330, 392, 523].forEach((f) => tone(ctx, bus, { t: t + 1, dur: cue.dur - 0.8, freq: f, type: "triangle", gain: 0.03, attack: 1.4, release: 1 })); break; }
    case "amb-bedroom-call": case "amb-bedroom-knock": {
      const e = EVENTS[cue.type.slice(4)] || {}, t0 = cue.t0 ?? t;
      hiss(ctx, bus, { t, dur: cue.dur, gain: 0.035, type: "lowpass", freq: 380, attack: 0.5 });
      (e.rings || []).forEach((x) => { for (let k = 0; k < 6; k++) tone(ctx, bus, { t: t0 + x + k * 0.17, dur: 0.16, freq: [880, 1108, 1318, 1108, 880, 1318][k], type: "triangle", gain: 0.07, release: 0.12 }); tone(ctx, bus, { t: t0 + x, dur: 1.1, freq: 160, type: "square", gain: 0.05, cutoff: 260 }); });
      (e.knocks || []).forEach((x) => { tone(ctx, bus, { t: t0 + x, dur: 0.16, freq: 150, glideTo: 70, gain: 0.7 }); hiss(ctx, bus, { t: t0 + x, dur: 0.08, gain: 0.35, type: "lowpass", freq: 1100 }); });
      break;
    }
    // ---- Hyperlane
    case "amb-hl-side": case "amb-hl-grid": case "amb-hl-drift": case "amb-hl-aurora": case "amb-hl-block": case "amb-hl-slip": case "amb-hl-finish": case "amb-hl-result": {
      const id = cue.type.slice(4), t0 = cue.t0 ?? t, e = EVENTS3[id] || {};
      const go = id === "hl-grid" ? t0 + e.go[0] : t;
      if (id !== "hl-result") { tone(ctx, bus, { t: go, dur: Math.max(0.3, t + cue.dur - go), freq: 92, glideTo: 128, type: "sawtooth", gain: 0.05, cutoff: 900, attack: 0.3 }); hiss(ctx, bus, { t: go, dur: Math.max(0.3, t + cue.dur - go), gain: 0.08, type: "bandpass", freq: 900, q: 0.4, attack: 0.3 }); }
      if (id === "hl-grid" || id === "hl-side" || id === "hl-drift" || id === "hl-finish") hiss(ctx, bus, { t, dur: cue.dur, gain: 0.035, type: "highpass", freq: 5000, attack: 0.3 });
      (e.lights || []).forEach((x) => tone(ctx, bus, { t: t0 + x, dur: 0.22, freq: 660, gain: 0.14 })); (e.go || []).forEach((x) => tone(ctx, bus, { t: t0 + x, dur: 0.6, freq: 1320, gain: 0.16, release: 0.4 }));
      if (id === "hl-drift") for (let x = t + 0.3; x < t + cue.dur; x += 2.2) tone(ctx, bus, { t: x, dur: 0.5, freq: 500, glideTo: 1400, type: "triangle", gain: 0.06 });
      if (id === "hl-side") for (let x = t; x < t + cue.dur; x += 0.11 + r() * 0.1) hiss(ctx, bus, { t: x, dur: 0.05, gain: 0.08, type: "bandpass", freq: 3500 + r() * 2000, q: 2 });
      if (cue.figT && id === "hl-block") { tone(ctx, bus, { t: cue.figT, dur: 0.6, freq: 110, glideTo: 40, gain: 0.7 }); hiss(ctx, bus, { t: cue.figT, dur: 1.2, gain: 0.2, type: "bandpass", freq: 3000, q: 1.5 }); }
      if (cue.figT && id === "hl-slip") { hiss(ctx, bus, { t: cue.figT - 0.6, dur: 0.7, gain: 0.25, type: "bandpass", freq: 300, freqTo: 6000, q: 1, attack: 0.6 }); tone(ctx, bus, { t: cue.figT, dur: 1.5, freq: 70, glideTo: 35, gain: 0.7 }); tone(ctx, bus, { t: cue.figT, dur: cue.dur, freq: 140, glideTo: 240, type: "sawtooth", gain: 0.05, cutoff: 1400 }); }
      if (id === "hl-finish") { hiss(ctx, bus, { t, dur: cue.dur, gain: 0.07, type: "bandpass", freq: 1100, q: 0.3, attack: 0.5 }); if (cue.figT) { hiss(ctx, bus, { t: cue.figT, dur: 0.08, gain: 0.3, type: "highpass", freq: 3000 }); tone(ctx, bus, { t: cue.figT, dur: 2, freq: 55, gain: 0.25, attack: 0.05 }); } }
      if (id === "hl-result") { hiss(ctx, bus, { t, dur: cue.dur, gain: 0.1, type: "bandpass", freq: 1200, q: 0.3, attack: 0.2 }); for (let x = t + 0.3; x < t + cue.dur; x += 0.35 + r() * 0.4) { tone(ctx, bus, { t: x, dur: 0.3, freq: 90, glideTo: 40, gain: 0.3 }); for (let k = 0; k < 6; k++) hiss(ctx, bus, { t: x + 0.1 + k * 0.05, dur: 0.03, gain: 0.08, type: "highpass", freq: 4000 }); } }
      break;
    }
    // ---- Getaway Heat
    case "amb-gh-heli": case "amb-gh-street": case "amb-gh-swat": case "amb-gh-alley": case "amb-gh-tank": case "amb-gh-jump": case "amb-gh-escape": {
      const id = cue.type.slice(4);
      tone(ctx, bus, { t, dur: cue.dur, freq: 78, type: "sawtooth", gain: 0.06, cutoff: 600, attack: 0.2 });
      if (id !== "gh-escape") for (let x = t; x < t + cue.dur; x += 1.2) { tone(ctx, bus, { t: x, dur: 0.6, freq: 720, glideTo: 1020, type: "square", gain: 0.022, cutoff: 2200 }); tone(ctx, bus, { t: x + 0.6, dur: 0.6, freq: 1020, glideTo: 720, type: "square", gain: 0.022, cutoff: 2200 }); }
      const rotor = (a, b) => { for (let x = a; x < b; x += 0.085) hiss(ctx, bus, { t: x, dur: 0.06, gain: 0.07, type: "lowpass", freq: 420 }); };
      if (id === "gh-heli") rotor(t, t + cue.dur); if (id === "gh-escape" && cue.figT) rotor(cue.figT, t + cue.dur);
      if (id === "gh-escape") for (let x = t + 0.5; x < t + cue.dur; x += 0.8 + r() * 0.8) tone(ctx, bus, { t: x, dur: 0.12, freq: 3300 + r() * 1200, glideTo: 4600, gain: 0.02 });
      if (id === "gh-alley") hiss(ctx, bus, { t, dur: cue.dur, gain: 0.07, type: "bandpass", freq: 3200, q: 1.2, attack: 0.1 });
      if (cue.figT && (id === "gh-street" || id === "gh-swat")) { tone(ctx, bus, { t: cue.figT, dur: 0.7, freq: 100, glideTo: 35, gain: 0.8 }); hiss(ctx, bus, { t: cue.figT, dur: 0.8, gain: 0.35, type: "bandpass", freq: 2200, q: 0.6 }); }
      if (cue.figT && id === "gh-tank") { tone(ctx, bus, { t: cue.figT, dur: 1.6, freq: 60, glideTo: 25, gain: 1 }); hiss(ctx, bus, { t: cue.figT, dur: 1, gain: 0.45, type: "lowpass", freq: 1200 }); }
      if (id === "gh-tank") tone(ctx, bus, { t: t + 0.2, dur: 2.3, freq: 55, glideTo: 70, type: "square", gain: 0.05, cutoff: 200 });
      if (id === "gh-jump") { const t0 = cue.t0 ?? t; tone(ctx, bus, { t: t0 + 0.8, dur: 0.9, freq: 1600, glideTo: 380, gain: 0.08 }); if (cue.figT) { tone(ctx, bus, { t: cue.figT, dur: 1.8, freq: 55, glideTo: 25, gain: 1 }); hiss(ctx, bus, { t: cue.figT, dur: 1.4, gain: 0.5, type: "lowpass", freq: 1600 }); } }
      break;
    }
    // ---- Penalty Shootout
    case "amb-ps-stadium": case "amb-ps-walk": case "amb-ps-keeper-jay": case "amb-ps-dive": case "amb-ps-dive-result": case "amb-ps-spot": case "amb-ps-chip": case "amb-ps-net": {
      const id = cue.type.slice(4), t0 = cue.t0 ?? t;
      const level = { "ps-stadium": 0.12, "ps-walk": 0.03, "ps-keeper-jay": 0.1, "ps-dive": 0.02, "ps-dive-result": 0.16, "ps-spot": 0.025, "ps-chip": 0.015, "ps-net": 0.03 }[id];
      hiss(ctx, bus, { t, dur: cue.dur, gain: level, type: "bandpass", freq: 900, q: 0.3, attack: 0.3 });
      if (id === "ps-stadium" || id === "ps-keeper-jay") for (let x = t + 0.4; x < t + cue.dur; x += 1.4) hiss(ctx, bus, { t: x, dur: 0.9, gain: level * 0.7, type: "bandpass", freq: 600, q: 1.2, attack: 0.3 });
      if (id === "ps-walk" || id === "ps-spot" || id === "ps-chip") for (let x = t + 0.3; x < t + cue.dur; x += 0.95) { tone(ctx, bus, { t: x, dur: 0.18, freq: 60, glideTo: 40, gain: 0.32 }); tone(ctx, bus, { t: x + 0.22, dur: 0.15, freq: 55, glideTo: 38, gain: 0.22 }); }
      if (id === "ps-spot") for (let k = 0; k < 8; k++) tone(ctx, bus, { t: t + 0.2 + k * 0.04, dur: 0.04, freq: k % 2 ? 2800 : 3100, gain: 0.05 });
      if (id === "ps-dive" || id === "ps-chip") hiss(ctx, bus, { t, dur: cue.dur, gain: 0.06, type: "lowpass", freq: 400, freqTo: 150, attack: 0.5 });
      if (id === "ps-dive-result") { tone(ctx, bus, { t: t0, dur: 1.4, freq: 1180, gain: 0.12, release: 1.2 }); tone(ctx, bus, { t: t0, dur: 1.2, freq: 2360, gain: 0.05, release: 1 }); }
      if (id === "ps-net") { const g = t0 + EVENTS3["ps-net"].goal[0]; hiss(ctx, bus, { t: g, dur: 0.4, gain: 0.2, type: "bandpass", freq: 2000, q: 0.8 }); hiss(ctx, bus, { t: g + 0.1, dur: Math.max(1, t + cue.dur - g), gain: 0.2, type: "bandpass", freq: 1000, q: 0.3, attack: 0.15 }); for (let x = g + 0.4; x < t + cue.dur; x += 0.45) tone(ctx, bus, { t: x, dur: 0.3, freq: 90, glideTo: 40, gain: 0.25 }); }
      break;
    }
    // ---- Safecracker
    case "amb-sc-vault": case "amb-sc-dial": case "amb-sc-drill": case "amb-sc-keypad": case "amb-sc-alarm": case "amb-sc-charge": case "amb-sc-open": {
      const id = cue.type.slice(4), t0 = cue.t0 ?? t, e = EVENTS4[id] || {};
      tone(ctx, bus, { t, dur: cue.dur, freq: 50, gain: 0.06, attack: 0.4 });
      (e.clicks || []).forEach((x, i) => { tone(ctx, bus, { t: t0 + x, dur: 0.03, freq: 2600, gain: 0.08 + i * 0.012 }); hiss(ctx, bus, { t: t0 + x, dur: 0.025, gain: 0.06 + i * 0.01, type: "highpass", freq: 3000 }); });
      if (id === "sc-dial" && cue.figT) { tone(ctx, bus, { t: cue.figT, dur: 0.4, freq: 130, glideTo: 60, gain: 0.85 }); hiss(ctx, bus, { t: cue.figT, dur: 0.15, gain: 0.25, type: "lowpass", freq: 900 }); }
      if (id === "sc-drill") { const end = cue.figT || t + cue.dur; tone(ctx, bus, { t, dur: end - t, freq: 820, glideTo: 980, type: "sawtooth", gain: 0.05, cutoff: 3000 }); tone(ctx, bus, { t, dur: end - t, freq: 1640, glideTo: 1960, type: "square", gain: 0.012, cutoff: 4000 }); hiss(ctx, bus, { t, dur: end - t, gain: 0.08, type: "bandpass", freq: 5000, q: 0.6 }); }
      (e.flashes || []).forEach((x, i) => tone(ctx, bus, { t: t0 + x, dur: 0.3, freq: [523, 659, 659, 784, 1046][i], type: "triangle", gain: 0.12 }));
      if (id === "sc-keypad" && cue.figT) tone(ctx, bus, { t: cue.figT, dur: 0.7, freq: 150, type: "square", gain: 0.09, cutoff: 800 });
      if (id === "sc-alarm" || id === "sc-charge") for (let x = t; x < t + cue.dur; x += 0.9) tone(ctx, bus, { t: x, dur: 0.8, freq: 600, glideTo: 1100, type: "sawtooth", gain: 0.035, cutoff: 2500 });
      if (id === "sc-alarm" && cue.figT) for (let x = cue.figT; x < t + cue.dur; x += 0.55) tone(ctx, bus, { t: x, dur: 0.18, freq: 80, glideTo: 45, gain: 0.45 });
      if (id === "sc-charge") { const b = cue.figT || t + cue.dur; for (let x = t; x < b; x += 0.04) hiss(ctx, bus, { t: x, dur: 0.03, gain: 0.03 + r() * 0.05, type: "highpass", freq: 4000 }); if (cue.figT) { tone(ctx, bus, { t: b, dur: 2.2, freq: 55, glideTo: 22, gain: 1 }); hiss(ctx, bus, { t: b, dur: 1.8, gain: 0.55, type: "lowpass", freq: 1800 }); } }
      if (id === "sc-open") { tone(ctx, bus, { t: t + 0.3, dur: 2.2, freq: 120, glideTo: 80, type: "sawtooth", gain: 0.06, cutoff: 500 }); [262, 330, 392, 523, 659].forEach((f) => tone(ctx, bus, { t: t + 1, dur: cue.dur - 0.8, freq: f, type: "triangle", gain: 0.035, attack: 1, release: 1 })); }
      break;
    }
    // ---- Deep Signal
    case "amb-ds-black": case "amb-ds-part": case "amb-ds-stalker": case "amb-ds-drift": case "amb-ds-lurkers": case "amb-ds-hatch": case "amb-ds-log": {
      const id = cue.type.slice(4), t0 = cue.t0 ?? t, e = EVENTS4[id] || {};
      tone(ctx, bus, { t, dur: cue.dur, freq: 38, gain: 0.16, attack: 0.6 }); hiss(ctx, bus, { t, dur: cue.dur, gain: 0.04, type: "lowpass", freq: 300, attack: 0.5 });
      const ping = (x) => { tone(ctx, bus, { t: x, dur: 1.6, freq: 1420, gain: 0.12, release: 1.5 }); tone(ctx, bus, { t: x + 0.45, dur: 1.2, freq: 1420, gain: 0.04, release: 1.1 }); };
      (e.pings || []).forEach((x) => ping(t0 + x));
      if (id === "ds-stalker" && cue.figT) { ping(cue.figT - 0.15); tone(ctx, bus, { t: cue.figT + 0.3, dur: 2.5, freq: 48, glideTo: 36, type: "sawtooth", gain: 0.2, cutoff: 260, attack: 0.4 }); }
      if (id === "ds-drift") { for (let x = t + 0.5; x < t + cue.dur; x += 0.9) { tone(ctx, bus, { t: x, dur: 0.16, freq: 58, glideTo: 40, gain: 0.3 }); tone(ctx, bus, { t: x + 0.2, dur: 0.14, freq: 54, glideTo: 38, gain: 0.2 }); } if (cue.figT) { tone(ctx, bus, { t: cue.figT, dur: 1.4, freq: 320, glideTo: 190, type: "sawtooth", gain: 0.09, cutoff: 1500 }); hiss(ctx, bus, { t: cue.figT, dur: 1.4, gain: 0.15, type: "bandpass", freq: 2600, q: 2 }); } }
      if (id === "ds-lurkers") (e.pings || []).forEach((x) => { for (let k = 0; k < 18; k++) tone(ctx, bus, { t: t0 + x + 0.4 + k * 0.07 + r() * 0.05, dur: 0.04, freq: 2200 + r() * 2200, gain: 0.03 }); });
      if (id === "ds-hatch") { tone(ctx, bus, { t, dur: cue.dur, freq: 60, glideTo: 110, type: "sawtooth", gain: 0.1, cutoff: 400 }); for (let x = t + 0.4; x < t + cue.dur; x += 0.8) tone(ctx, bus, { t: x, dur: 0.25, freq: 90, glideTo: 30, gain: 0.5 }); }
      if (id === "ds-log") hiss(ctx, bus, { t, dur: cue.dur, gain: 0.06, type: "bandpass", freq: 2500, q: 0.5 });
      break;
    }
    case "amb-cta-game": tone(ctx, bus, { t, dur: cue.dur, freq: 110, gain: 0.02, attack: 0.4 }); break;
    case "amb-computer": tone(ctx, bus, { t, dur: cue.dur, freq: 110, gain: 0.025, attack: 0.4 }); hiss(ctx, bus, { t, dur: cue.dur, gain: 0.025, type: "lowpass", freq: 600, attack: 0.4 }); break;
    default: break;
  }
}

// A dark room reverb (generated impulse response) for the creepy narrator.
function reverb(ctx, seconds = 2.6) {
  const len = Math.floor(ctx.sampleRate * seconds), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  const conv = ctx.createConvolver(); conv.buffer = ir; return conv;
}

// ---------------------------------------------------------------- how a line is delivered
function softClip(k) { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } return c; }
function filt(ctx, type, freq, q = 0.7, gain = 0) { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; f.gain.value = gain; return f; }
// a breath: an inhale before a panicked line, a gasp after it
function breath(ctx, bus, t, dur, gain, freq) { if (t < 0) return; hiss(ctx, bus, { t, dur, gain, type: "bandpass", freq, q: 0.6, attack: dur * 0.5 }); hiss(ctx, bus, { t, dur: dur * 0.8, gain: gain * 0.5, type: "highpass", freq: 3500, attack: dur * 0.4 }); }
function moodChain(ctx, src, mood, t, dur, dest) {
  let node = src;
  const chain = (n) => { node.connect(n); node = n; };
  const lfo = (rate, depth, param) => { const o = ctx.createOscillator(); o.frequency.value = rate; const g = ctx.createGain(); g.gain.value = depth; o.connect(g); g.connect(param); o.start(Math.max(0, t)); o.stop(t + dur + 0.2); };
  if (mood === "panic" || mood === "scream") {
    lfo(mood === "scream" ? 9.5 : 7.3, mood === "scream" ? 48 : 34, src.detune);          // a shaking voice
    lfo(3.1, 18, src.detune);                                                              // and an unsteady one
    const trem = ctx.createGain(); lfo(5.4, 0.14, trem.gain); chain(trem);
    breath(ctx, dest, t - 0.44, 0.38, mood === "scream" ? 0.2 : 0.16, 1300);
    breath(ctx, dest, t + dur + 0.03, 0.32, 0.13, 900);
  }
  if (mood === "scream") { const ws = ctx.createWaveShaper(); ws.curve = softClip(2.4); chain(ws); chain(filt(ctx, "highshelf", 2500, 0.7, 5)); const g = ctx.createGain(); g.gain.value = 1.1; chain(g); }
  if (mood === "whisper") { chain(filt(ctx, "highpass", 380)); chain(filt(ctx, "lowshelf", 320, 0.7, -9)); chain(filt(ctx, "peaking", 4200, 0.8, 5)); hiss(ctx, dest, { t: Math.max(0, t), dur: dur + 0.1, gain: 0.03, type: "bandpass", freq: 4500, q: 0.6, attack: 0.05 }); }
  if (mood === "muffled") { chain(filt(ctx, "lowpass", 620, 0.9)); const g = ctx.createGain(); g.gain.value = 1.25; chain(g); }
  if (mood === "phone" || mood === "radio") {
    chain(filt(ctx, "highpass", 380)); chain(filt(ctx, "lowpass", mood === "radio" ? 2600 : 3200)); const ws = ctx.createWaveShaper(); ws.curve = softClip(1.8); chain(ws);
    hiss(ctx, dest, { t: Math.max(0, t - 0.1), dur: dur + 0.3, gain: mood === "radio" ? 0.07 : 0.025, type: "bandpass", freq: 2400, q: 0.5, attack: 0.05 });
  }
  node.connect(dest);
}

// narration: { buffers: Map(messageId -> AudioBuffer) }
export async function renderMix(compiled, narration, opts = {}) {
  const { story } = compiled;
  const dur = compiled.duration;
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * SAMPLE_RATE), SAMPLE_RATE);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
  const out = ctx.createGain(); out.gain.value = 0.95; comp.connect(out); out.connect(ctx.destination);
  const musicBus = ctx.createGain(), sfxBus = ctx.createGain(), voiceBus = ctx.createGain(), narratorBus = ctx.createGain(), roomBus = ctx.createGain();
  [musicBus, sfxBus, voiceBus, narratorBus, roomBus].forEach((b) => b.connect(comp));
  { const rv = reverb(ctx, 1.1), wet = ctx.createGain(); wet.gain.value = 0.22; roomBus.connect(rv); rv.connect(wet); wet.connect(comp); roomBus.gain.value = 1.15; }   // lines said out loud sit in the room
  narratorBus.gain.value = 1.2;
  if (story.narration.narratorFx === "creepy") {   // low, roomy, a little too close
    const low = ctx.createBiquadFilter(); low.type = "lowshelf"; low.frequency.value = 220; low.gain.value = 5;
    const rv = reverb(ctx), wet = ctx.createGain(); wet.gain.value = 0.42;
    narratorBus.disconnect(); narratorBus.connect(low); low.connect(comp); low.connect(rv); rv.connect(wet); wet.connect(comp);
  }
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
    const narrator = it.side === "scene" || it.side === "center";
    const s = ctx.createBufferSource(); s.buffer = b;
    moodChain(ctx, s, it.msg.mood, it.narration.start, b.duration, narrator ? narratorBus : it.side === "voice" ? roomBus : voiceBus);
    s.start(it.narration.start);
    musicBus.gain.setTargetAtTime(mv * (narrator ? 0.3 : 0.42), Math.max(0, it.narration.start - 0.05), 0.06);
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
