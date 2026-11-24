// Unknown Number: an eerie score and the sounds of a house at 3 AM. All synthesized.
import { mtof, rnd, filt, panner, tone, hiss, pad, piano, braam, impact, riser, whoosh, heartbeat, glitch, chime, click, screech, buzz, step } from "../../audio.js";

export function score({ ctx, music, sfx, big, tl, dur }) {
  const lines = tl.lines, shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => lines.find((l) => l.id === id);
  const S = (id) => shot(id).t0, E = (id) => shot(id).t1, at = (id, lt) => S(id) + lt;
  const vibrate = (t, n = 3) => { for (let i = 0; i < n; i++) { tone(ctx, sfx, { t: t + i * 0.42, dur: 0.26, freq: 140, type: "square", gain: 0.06, cutoff: 260, release: 0.05 }); hiss(ctx, sfx, { t: t + i * 0.42, dur: 0.26, gain: 0.04, type: "bandpass", freq: 700, q: 3 }); } };
  const ding = (t, g = 0.08) => [1568, 1976, 2349].forEach((f, i) => tone(ctx, sfx, { t: t + i * 0.07, dur: 0.5, freq: f, gain: g, release: 0.45 }));
  const key = (t) => { hiss(ctx, sfx, { t, dur: 0.02, gain: 0.05, type: "highpass", freq: 3500 }); tone(ctx, sfx, { t, dur: 0.02, freq: 900 + rnd() * 400, type: "square", gain: 0.006, release: 0.015 }); };
  const breath = (t, d = 0.5, g = 0.08) => hiss(ctx, sfx, { t, dur: d, gain: g, type: "bandpass", freq: 900, q: 0.7, attack: d * 0.4 });
  const stinger = (t, g = 0.18) => { braam(ctx, big, t, 33, g); screech(ctx, big, t + 0.02, 1.8, 0.07); impact(ctx, sfx, t, 0.5); };
  const drone = (t0, t1, root, g = 0.1) => { if (t1 - t0 < 0.3) return; tone(ctx, music, { t: t0, dur: t1 - t0, freq: mtof(root), gain: g, attack: 2, release: 1 }); tone(ctx, music, { t: t0, dur: t1 - t0, freq: mtof(root) * 1.005, gain: g * 0.6, attack: 3, release: 1 });
    for (const m of [root + 24, root + 25, root + 31]) tone(ctx, music, { t: t0 + 1, dur: t1 - t0 - 1, freq: mtof(m), type: "sawtooth", gain: 0.006, attack: 4, release: 1, cutoff: 1600 }); };
  // ===== 2:47 AM: the game on his speakers, the room, the buzz
  { const g1 = S("txt1"); buzz(ctx, sfx, 0, S("prep") + 2, 0.008); hiss(ctx, sfx, { t: 0, dur: S("prep") + 2, gain: 0.018, type: "lowpass", freq: 500, attack: 0.5 });
    for (const [t, m] of [[0.2, 57], [1.6, 60], [3.0, 56], [4.4, 59]]) tone(ctx, music, { t, dur: 2.4, freq: mtof(m), type: "triangle", gain: 0.03, attack: 0.3, release: 2 });   // the game's own music, small and far away
    vibrate(at("hook", 0.9)); drone(0, g1, 38, 0.08);
    for (let t = S("bed-play"); t < g1; t += 2.2) piano(ctx, music, t, [74, 73, 70, 74][Math.round(t) % 4], 0.03, 2.6); }
  // ===== the first text, his reply
  { const s = shot("txt1"), L = s.L("j01"); ding(s.t0 + 0.5); for (let t = s.t0 + 2.1; t < s.t0 + L - 0.2; t += 0.11 + rnd() * 0.06) key(t); tone(ctx, sfx, { t: s.t0 + L + 0.5, dur: 0.18, freq: 1200, glideTo: 1700, gain: 0.05, release: 0.15 });
    drone(s.t0, S("txt2"), 36, 0.1); for (let t = S("txt1-face"); t < S("txt2"); t += 0.9) heartbeat(ctx, sfx, t, 0.22); }
  // ===== 2:52: his street; the window; the long wait
  { const s = shot("txt2"), bz = s.t0 + s.L("n02") + 1.7; vibrate(bz, 2); ding(bz + 0.2); stinger(bz + 0.3, 0.12); drone(s.t0, E("wait"), 35, 0.11);
    const w = shot("wait"); hiss(ctx, sfx, { t: w.t0 + 1.0, dur: w.L("n03") - 1.0, gain: 0.07, freq: 400, q: 0.5, attack: 0.4 });   // the wind outside
    tone(ctx, sfx, { t: w.t0 + 0.9, dur: 0.25, freq: 600, glideTo: 300, type: "sawtooth", gain: 0.02, cutoff: 1500 });   // a blind slat
    for (let t = w.t0 + w.L("n03"), k = 0; t < w.t1; t += 0.5, k++) tone(ctx, sfx, { t, dur: 0.04, freq: k % 2 ? 2000 : 1700, type: "square", gain: 0.012, release: 0.03, pan: -0.4 }); }
  // ===== 3:02: his porch
  { const s = shot("txt3"), bz = s.t0 + s.L("n04") + 0.4, grab = s.t0 + s.L("n04") + 2.2; vibrate(bz, 3); ding(bz + 0.15); stinger(grab + 0.25, 0.22); drone(s.t0, E("panic"), 33, 0.13);
    for (let t = grab; t < E("prep"); t += 0.45) heartbeat(ctx, sfx, t, 0.32); for (let t = grab + 0.6; t < E("panic"); t += 0.7) breath(t, 0.4, 0.07); }
  // ===== barricading
  { const p = shot("prep"), lockAt = p.t0 + 3.1, offAt = p.t0 + 4.05, grabAt = p.t0 + 4.95;   // matches the shot: chair, lock, lights, bat
    hiss(ctx, sfx, { t: p.t0 + 0.1, dur: 1.35, gain: 0.12, freq: 900, freqTo: 600, q: 2, attack: 0.05 }); impact(ctx, sfx, p.t0 + 1.45, 0.25);   // the chair across the floor, against the door
    click(ctx, sfx, lockAt, 0.5); tone(ctx, sfx, { t: lockAt, dur: 0.08, freq: 800, glideTo: 500, type: "square", gain: 0.02, release: 0.05 });
    click(ctx, sfx, offAt, 0.45); tone(ctx, sfx, { t: offAt, dur: 0.7, freq: 220, glideTo: 40, gain: 0.1, release: 0.6 });   // monitor off
    hiss(ctx, sfx, { t: grabAt, dur: 0.2, gain: 0.08, type: "lowpass", freq: 900 }); }
  // ===== 3:04: in the house. Silence. Then the pans.
  { const s = shot("txt4"), clang = s.t0 + 2.6; ding(s.t0 + 0.5, 0.05); drone(s.t0, S("kitchen") + 4, 32, 0.1);
    impact(ctx, sfx, clang, 0.5); for (let i = 0; i < 9; i++) { const t = clang + i * 0.09 + rnd() * 0.05, f = 500 + rnd() * 1400; tone(ctx, big, { t, dur: 1.2, freq: f, glideTo: f * 0.97, gain: 0.06, release: 1.1, pan: 0.3 }); hiss(ctx, sfx, { t, dur: 0.12, gain: 0.12, type: "highpass", freq: 2500, pan: 0.3 }); }
    for (let i = 0; i < 14; i++) { const t = clang + 0.8 + i * (0.12 + i * 0.012); tone(ctx, sfx, { t, dur: 0.08, freq: 900, gain: 0.03 * (1 - i / 14), release: 0.06, pan: 0.3 }); }   // one keeps spinning
    for (let t = clang + 0.3; t < S("kitchen"); t += 0.38) heartbeat(ctx, sfx, t, 0.38); }
  // ===== down to the kitchen
  { const k = shot("kitchen"), run = k.t0 + k.L("j05") - 0.3; click(ctx, sfx, k.t0 + 0.05, 0.3);
    for (let t = k.t0 + 0.2; t < run; t += 0.24) { step(ctx, sfx, t, 0.12, true); if (rnd() < 0.3) tone(ctx, sfx, { t: t + 0.05, dur: 0.3, freq: 180 + rnd() * 80, glideTo: 140, type: "sawtooth", gain: 0.01, cutoff: 600 }); }   // stairs, creaks
    hiss(ctx, sfx, { t: run, dur: k.t1 - run + 2, gain: 0.02, type: "lowpass", freq: 300, attack: 0.5 }); buzz(ctx, sfx, run, k.t1 - run + 2, 0.004);   // the fridge
    for (let i = 0; i < 8; i++) tone(ctx, sfx, { t: run + 0.2 + i * 0.35 * (1 + i * 0.15), dur: 0.08, freq: 900, gain: 0.02 * (1 - i / 8), release: 0.06, pan: -0.2 });
    for (let t = run; t < E("txt5"); t += 0.6) heartbeat(ctx, sfx, t, 0.3); }
  // ===== 3:05: in his room
  { const s = shot("txt5"); vibrate(s.t0 + 0.4, 2); ding(s.t0 + 0.55); stinger(s.t0 + 0.7, 0.2); }
  // ===== up the stairs, the door, the reveal, the freeze
  { const f = shot("freeze"), F = f.t0 + f.lead - 0.35, shut = f.t0 + 2.4 + 0.55;
    for (let t = f.t0 + 0.1; t < f.t0 + 2.4; t += 0.2) step(ctx, sfx, t, 0.13, true);
    impact(ctx, sfx, shut, 0.45); click(ctx, sfx, shut + 0.05, 0.4); breath(shut + 0.2, 0.9, 0.1); breath(shut + 1.2, 0.9, 0.08);
    tone(ctx, music, { t: shut, dur: F - shut, freq: mtof(31), gain: 0.16, attack: F - shut, release: 0.05 });
    // the freeze: a tape stop, then a thin high ring over a low hum
    tone(ctx, sfx, { t: F - 0.05, dur: 0.6, freq: 300, glideTo: 30, type: "sawtooth", gain: 0.12, cutoff: 1200, release: 0.5 }); impact(ctx, big, F, 0.4);
    tone(ctx, music, { t: F + 0.3, dur: dur - F, freq: 3520, gain: 0.006, attack: 1.5, release: 1 }); drone(F + 0.2, dur, 29, 0.1);
    [69, 68, 65, 64, 69, 68, 65, 61].forEach((m, i) => piano(ctx, music, line("n09").t - 1.5 + i * 1.3, m, 0.045, 3)); }
  music.gain.setTargetAtTime(0, dur - 0.4, 0.15);
}
