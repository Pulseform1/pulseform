// The Vault: a heist score (a low pulse that tightens as the clock runs down) and the bank's sounds: the guard's steps,
// the laser hum, the camera servos, the dial's clicks, the bolts, the door, the gold, the siren, the gate. All synthesized.
import { mtof, rnd, filt, tone, hiss, kick, snare, hat, pad, piano, braam, impact, riser, whoosh, heartbeat, glitch, chime, click, step } from "../../audio.js";

export function score({ ctx, music, sfx, big, tl, dur }) {
  const lines = tl.lines, shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => lines.find((l) => l.id === id);
  const S = (id) => shot(id).t0, E = (id) => shot(id).t1, at = (id, lt) => S(id) + lt;
  const wordT = (id, re) => { const l = line(id); return (l.words.find((w) => re.test(w.w)) || l.words[l.words.length - 1]).t; };
  const F = line("n11").t + line("n11").edur + 0.35;
  const bass = (t, m, d, g = 0.09) => tone(ctx, music, { t, dur: d, freq: mtof(m), type: "sawtooth", gain: g, cutoff: 420, release: 0.08 });
  const groove = (t0, t1, bpm, g = 1, root = 33) => {   // kick on 1 and 3, ticking hats, a bass that walks
    const beat = 60 / bpm; for (let t = t0, i = 0; t < t1 - 0.05; t += beat, i++) { if (i % 2 === 0) kick(ctx, music, t, 0.45 * g); if (i % 4 === 2) snare(ctx, music, t, 0.08 * g);
      hat(ctx, music, t + beat / 2, 0.035 * g); bass(t, root + [0, 0, 3, 0, 5, 0, 3, 2][i % 8], beat * 0.9, 0.07 * g); } };
  const laserHum = (t0, t1) => { if (t1 - t0 < 0.2) return; tone(ctx, sfx, { t: t0, dur: t1 - t0, freq: 118, type: "sawtooth", gain: 0.02, cutoff: 900, attack: 0.3, release: 0.2 }); tone(ctx, sfx, { t: t0, dur: t1 - t0, freq: 236.5, gain: 0.012, attack: 0.3, release: 0.2 }); };
  const zap = (t) => { tone(ctx, sfx, { t, dur: 0.16, freq: 1800, glideTo: 300, type: "square", gain: 0.03, cutoff: 3000, release: 0.1 }); hiss(ctx, sfx, { t, dur: 0.05, gain: 0.05, type: "highpass", freq: 4000 }); };
  const servo = (t, d) => tone(ctx, sfx, { t, dur: d, freq: 420, glideTo: 520, type: "square", gain: 0.012, cutoff: 1400, attack: 0.05, release: 0.05 });
  const tick = (t, g = 0.08) => { hiss(ctx, sfx, { t, dur: 0.012, gain: g, type: "highpass", freq: 3500 }); tone(ctx, sfx, { t, dur: 0.02, freq: 2400 + rnd() * 400, gain: g * 0.25, release: 0.015 }); };
  const clunk = (t, g = 0.4) => { impact(ctx, sfx, t, g * 0.5); tone(ctx, sfx, { t, dur: 0.25, freq: 180, glideTo: 90, type: "square", gain: g * 0.2, cutoff: 900, release: 0.2 }); hiss(ctx, sfx, { t, dur: 0.06, gain: g * 0.4, type: "bandpass", freq: 1600, q: 1 }); };
  const groan = (t, d, g = 0.08) => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(42, t); for (let k = 1; k <= 6; k++) o.frequency.linearRampToValueAtTime(36 + rnd() * 22, t + d * k / 6);
    const b = filt(ctx, "bandpass", 420, 5), b2 = filt(ctx, "bandpass", 980, 7), e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + 0.3); e.gain.setValueAtTime(g, t + d - 0.4); e.gain.linearRampToValueAtTime(0, t + d);
    o.connect(b); o.connect(b2); b.connect(e); b2.connect(e); e.connect(sfx); o.start(t); o.stop(t + d + 0.05); };
  const siren = (t0, t1) => { for (let t = t0, i = 0; t < t1; t += 0.42, i++) { const f = i % 2 ? 880 : 660; tone(ctx, sfx, { t, dur: 0.4, freq: f, type: "sawtooth", gain: 0.045, cutoff: 2600, attack: 0.01, release: 0.03 }); tone(ctx, sfx, { t, dur: 0.4, freq: f * 1.005, type: "square", gain: 0.02, cutoff: 1800, attack: 0.01, release: 0.03 }); } };

  // ===== hook: the corridor, the vault at the end. 1,284,907 attempts. 0 opened.
  braam(ctx, big, 0.05, 31, 0.28); laserHum(0, E("hook")); riser(ctx, sfx, 0.3, 1.4, 0.08); impact(ctx, big, at("hook", 0.35), 0.35); impact(ctx, big, at("hook", 1.7), 0.6); tone(ctx, sfx, { t: at("hook", 1.7), dur: 1.4, freq: 55, glideTo: 30, gain: 0.3, release: 1.2 });
  // ===== Jay's room, Maya's room: a quiet pulse, keys, Maya joins
  pad(ctx, music, S("desk"), E("maya") - S("desk"), [45, 52, 57, 60], { gain: 0.035, cutoff: 700, attack: 1.2, release: 1 });
  for (let t = S("desk"); t < E("maya"); t += 0.5) tone(ctx, music, { t, dur: 0.1, freq: mtof(81), gain: 0.012, release: 0.08 });
  chime(ctx, sfx, at("desk", shot("desk").dur * 0.55), 0.05); for (let t = S("maya") + 0.2; t < E("maya"); t += 0.12 + rnd() * 0.1) tick(t, 0.03);
  // ===== the heist: the groove starts with the clock
  groove(S("lobby"), E("cams"), 118, 1, 33); groove(S("vault"), E("vault"), 118, 0.6, 31);
  for (let t = S("lobby") + 0.2; t < E("lobby"); t += 0.75) step(ctx, sfx, t, 0.06, true);   // the guard
  click(ctx, sfx, S("lobby") + 0.1, 0.1); for (let t = S("lobby") + shot("lobby").L("e01") - 0.4; t < E("lobby"); t += 0.45) step(ctx, sfx, t, 0.03, false);   // Jay, on his toes
  // the lasers: a hum, a zap every time the pattern changes, then the run
  { const s = shot("lasers"), go = wordT("n05", /^go/i); laserHum(s.t0, s.t1); for (let t = s.t0 + 3; t < go; t += 3) zap(t);
    riser(ctx, sfx, go - 1.0, 1.0, 0.07); whoosh(ctx, sfx, go, 0.5, 0.18); hiss(ctx, sfx, { t: go + 0.05, dur: 0.45, gain: 0.1, type: "lowpass", freq: 1200 }); for (let t = go + 0.6; t < go + 2.6; t += 0.22) step(ctx, sfx, t, 0.08, true); whoosh(ctx, sfx, go + 1.2, 0.3, 0.12); }
  // the cameras: servos, then Maya freezes them
  { const s = shot("cams"), fz = wordT("n06", /^froze/i); for (let t = s.t0; t < fz; t += 1.4) servo(t, 0.6); glitch(ctx, sfx, fz, 0.3, 0.07); tone(ctx, sfx, { t: fz, dur: 0.6, freq: 600, glideTo: 80, gain: 0.05, release: 0.5 });
    for (let t = fz + 0.3; t < fz + 1.4; t += 0.08 + rnd() * 0.06) tick(t, 0.04); for (let t = fz + 1.5; t < s.t1; t += 0.24) step(ctx, sfx, t, 0.08, true); }
  // the dial: it ticks as it turns; a heavier click at each number; the clock ticks
  { const s = shot("vault"), e = s.L("e02"), c0 = Math.max(0.6, e - 2.0), c1 = s.dur - 0.25, hits = [0, 1, 2].map((i) => s.t0 + c0 + (c1 - c0) * (i + 0.85) / 3);
    for (let t = s.t0 + c0; t < s.t0 + c1; t += 0.07 + rnd() * 0.03) tick(t, 0.045); hits.forEach((h, i) => { clunk(h, 0.25 + i * 0.08); if (i === 2) chime(ctx, sfx, h + 0.05, 0.05); });
    for (let t = s.t0; t < s.t1; t += 0.5) tone(ctx, sfx, { t, dur: 0.03, freq: 1500, type: "square", gain: 0.012, release: 0.02 });
    for (let t = s.t0 + c0; t < s.t1; t += 0.7) heartbeat(ctx, sfx, t, 0.2); }
  // ===== the door: bolts, wheel, a long groan, and the gold
  { const s = shot("open"); for (let i = 0; i < 10; i++) clunk(s.t0 + 0.05 + i * 0.08, 0.2); for (let t = s.t0; t < s.t0 + 0.9; t += 0.05) tick(t, 0.05); groan(s.t0 + 0.8, 2.4, 0.09); impact(ctx, sfx, s.t0 + 3.0, 0.3);
    pad(ctx, music, s.t0 + 1.1, s.dur - 1.0, [60, 64, 67, 71, 76], { gain: 0.05, cutoff: 2600, attack: 1.2, release: 0.6, type: "triangle" }); chime(ctx, big, s.t0 + 1.2, 0.08); chime(ctx, big, s.t0 + 1.9, 0.05); }
  // ===== every alarm at once
  { const s = shot("alarm"); impact(ctx, big, s.t0, 0.9); braam(ctx, big, s.t0, 30, 0.35); siren(s.t0 + 0.05, F); impact(ctx, sfx, s.t0 + 0.52, 0.8); hiss(ctx, sfx, { t: s.t0 + 0.2, dur: 0.35, gain: 0.15, freq: 900, freqTo: 300, q: 0.7 });   // the gate slams down
    groove(s.t0 + 0.5, F, 150, 1.1, 30); for (let t = s.t0 + 0.6; t < F; t += 1.0) tone(ctx, sfx, { t, dur: 0.12, freq: 1980, type: "square", gain: 0.03, cutoff: 5000, release: 0.05 });
    for (let t = s.t0 + 0.3; t < F; t += 0.42) heartbeat(ctx, sfx, t, 0.3); }
  // ===== the pause: a tape stop, then a hum under the ending
  tone(ctx, sfx, { t: F - 0.05, dur: 0.6, freq: 300, glideTo: 30, type: "sawtooth", gain: 0.12, cutoff: 1200, release: 0.5 }); impact(ctx, big, F, 0.3);
  tone(ctx, music, { t: F + 0.3, dur: dur - F, freq: 2637, gain: 0.005, attack: 1.5, release: 1 }); pad(ctx, music, F + 0.2, dur - F, [33, 40, 45], { gain: 0.04, cutoff: 500, attack: 1.5, release: 1 });
  [69, 72, 76, 74, 72, 69, 67, 69].forEach((m, i) => piano(ctx, music, line("n12").t - 1.0 + i * 1.1, m, 0.04, 3));
  music.gain.setTargetAtTime(0, dur - 0.4, 0.15);
}
