// Loop 47: rain on the rooftops, a tape-rewind zip every time the night resets, the loop counter ticking, the alarm
// clock's beeps, a monitor that switches itself back on, thunder for the stranger on the last roof, a piano for Maya,
// a race-start countdown and the sound of time stopping. All synthesized.
import { mtof, rnd, tone, hiss, kick, snare, hat, pad, piano, braam, impact, riser, whoosh, heartbeat, glitch, chime, click, step } from "../../audio.js";

export function score({ ctx, music, sfx, big, tl, dur }) {
  const shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => tl.lines.find((l) => l.id === id);
  const S = (id) => shot(id).t0, E = (id) => shot(id).t1, at = (id, lt) => S(id) + lt;
  const wordT = (id, re) => { const l = line(id); return (l.words.find((w) => re.test(w.w)) || l.words[l.words.length - 1]).t; };
  const rain = (t0, t1, g = 0.05) => { if (t1 - t0 < 0.1) return; hiss(ctx, sfx, { t: t0, dur: t1 - t0, gain: g, type: "lowpass", freq: 3800, attack: 0.3, release: 0.3 }); hiss(ctx, sfx, { t: t0, dur: t1 - t0, gain: g * 0.5, type: "highpass", freq: 6000, attack: 0.3, release: 0.3 }); };
  const thunder = (t, g = 0.3) => { hiss(ctx, big, { t, dur: 2.6, gain: g, type: "lowpass", freq: 700, freqTo: 120, attack: 0.02 }); tone(ctx, big, { t, dur: 2.2, freq: 48, glideTo: 30, gain: g * 0.6, release: 2 }); hiss(ctx, sfx, { t, dur: 0.12, gain: g * 0.5, type: "highpass", freq: 2500 }); };
  const zip = (t, g = 0.08) => { tone(ctx, sfx, { t, dur: 0.16, freq: 2400, glideTo: 300, type: "sawtooth", gain: g * 0.5, cutoff: 3000, release: 0.05 }); hiss(ctx, sfx, { t, dur: 0.14, gain: g, freq: 3000, freqTo: 600, q: 1.5 }); };   // a tape rewinding
  const rewind = (t, d, g = 0.08) => { for (let x = t; x < t + d; x += 0.06) tone(ctx, sfx, { t: x, dur: 0.07, freq: 1800 - (x - t) / d * 900 + rnd() * 300, glideTo: 400, type: "square", gain: g * 0.3, cutoff: 2600, release: 0.03 }); hiss(ctx, sfx, { t, dur: d, gain: g, freq: 2600, freqTo: 900, q: 1.2 }); };
  const tick = (t, g = 0.05) => { hiss(ctx, sfx, { t, dur: 0.012, gain: g, type: "highpass", freq: 3500 }); tone(ctx, sfx, { t, dur: 0.025, freq: 2200, type: "square", gain: g * 0.3, cutoff: 4000, release: 0.02 }); };
  const beep = (t, f = 2100, g = 0.04, d = 0.09) => tone(ctx, sfx, { t, dur: d, freq: f, type: "square", gain: g, cutoff: 5000, release: 0.02 });
  const bass = (t, m, d, g = 0.08) => tone(ctx, music, { t, dur: d, freq: mtof(m), type: "sawtooth", gain: g, cutoff: 380, release: 0.08 });
  const pulse = (t0, t1, bpm, g = 1, root = 33, drums = true) => { const b = 60 / bpm; for (let t = t0, i = 0; t < t1 - 0.05; t += b / 2, i++) { bass(t, root + [0, 0, 12, 0, 3, 0, 12, 2][i % 8], b * 0.4, 0.07 * g); if (drums && i % 4 === 0) kick(ctx, music, t, 0.4 * g); if (drums && i % 8 === 4) snare(ctx, music, t, 0.07 * g); if (drums) hat(ctx, music, t + b / 4, 0.025 * g); } };

  // ===== hook: the falls, faster and faster, the counter racing to 47
  const hk = shot("hook"), t47 = Math.max(1.2, wordT("h01", /^forty|^47/) - hk.t0);
  { let c = 0, i = 0; while (c < t47 - 0.05) { const len = Math.max(0.12, (0.55 + (0.12 - 0.55) * Math.pow(c / t47, 0.7))); if (i > 0) zip(hk.t0 + c, 0.06 + 0.04 * (c / t47)); c += len; i++; }
    let last = 1; for (let x = 0; x < t47; x += 1 / 120) { const n = Math.min(46, Math.floor(1 + 46 * Math.pow(x / t47, 1.35))); if (n !== last) { tick(hk.t0 + x, 0.035); last = n; } } }
  riser(ctx, sfx, hk.t0, t47, 0.07); for (let t = hk.t0; t < hk.t0 + t47; t += 0.5) heartbeat(ctx, sfx, t, 0.22);
  tone(ctx, music, { t: hk.t0, dur: t47, freq: mtof(33), type: "sawtooth", gain: 0.05, cutoff: 300, cutoffTo: 1200, attack: 0.1, release: 0.1 });
  impact(ctx, big, hk.t0 + t47, 0.7); braam(ctx, big, hk.t0 + t47, 31, 0.3); thunder(hk.t0 + t47 + 0.05, 0.25);
  hiss(ctx, sfx, { t: hk.t0 + t47 + 0.2, dur: hk.dur - t47, gain: 0.07, freq: 900, freqTo: 250, q: 0.8, attack: 0.3 });   // the wind as he falls away
  rain(0, E("hook"), 0.035);
  // ===== fail: his room, the game; the miss; the clock rewinds; nobody remembers
  { const s = shot("fail"), mT = wordT("n01", /^misses/), cT = wordT("n01", /^clock/) - 0.15, nT = wordT("n01", /^9/) - 0.4;
    pulse(s.t0, cT, 112, 0.7, 33, false); whoosh(ctx, sfx, mT - 0.1, 0.4, 0.06); [67, 66, 65, 63].forEach((m, i) => tone(ctx, sfx, { t: mT + 1.0 + i * 0.16, dur: 0.18, freq: mtof(m), type: "square", gain: 0.03, cutoff: 2400, release: 0.1 }));   // game over (from the speakers)
    for (let t = cT; t < nT; t += 1.0) tick(t, 0.03); rewind(nT, 0.45, 0.09); impact(ctx, big, nT + 0.45, 0.3);
    [0, 0.18, 0.5, 0.68].forEach((d) => beep(nT + 0.55 + d, 2100, 0.035)); tone(ctx, music, { t: nT + 0.5, dur: s.t1 - nT, freq: mtof(81), gain: 0.008, attack: 1, release: 0.6 });
    pad(ctx, music, nT + 0.5, s.t1 - nT - 0.2, [45, 52, 55, 60], { gain: 0.035, cutoff: 700, attack: 1, release: 0.8 }); chime(ctx, sfx, s.t1 - 1.2, 0.03); }
  // ===== loop 1: a glitch? a shrug. a little pluck
  { const s = shot("loop1"); glitch(ctx, sfx, s.t0, 0.12, 0.05); zip(s.t0, 0.05); [72, 76, 74, 79].forEach((m, i) => tone(ctx, music, { t: s.t0 + 0.35 + i * 0.3, dur: 0.25, freq: mtof(m), type: "triangle", gain: 0.04, release: 0.2 }));
    pad(ctx, music, s.t0, s.dur, [57, 60, 64], { gain: 0.025, cutoff: 900, attack: 0.3, release: 0.5, type: "triangle" }); }
  // ===== loop 12: every route; a busy little sequence, a swish per route, a buzzer at the X
  { const s = shot("loop12"); zip(s.t0, 0.06); pulse(s.t0, s.t1, 124, 0.75, 35); for (let i = 0; i < 12; i++) whoosh(ctx, sfx, s.t0 + 0.1 + i * s.dur * 0.8 / 12 * 0.6, 0.25, 0.035, (i % 2 ? 0.4 : -0.4));
    for (let t = s.t0, i = 0; t < s.t1; t += 60 / 124 / 4, i++) tone(ctx, music, { t, dur: 0.08, freq: mtof(71 + [0, 3, 7, 10, 12, 10, 7, 3][i % 8]), type: "square", gain: 0.012, cutoff: 3000, release: 0.05 });
    const x = s.t0 + s.dur * 0.8 * 0.55; [0, 0.22].forEach((d) => tone(ctx, sfx, { t: x + d, dur: 0.18, freq: 140, type: "square", gain: 0.05, cutoff: 1200, release: 0.04 })); }
  // ===== loop 30: off... silence... it turns itself back on
  { const s = shot("loop30"), off = wordT("n04", /^stop/) + 0.1, on = wordT("n04", /^turned/) - 0.15;
    zip(s.t0, 0.06); pulse(s.t0, off, 112, 0.5, 33, false); click(ctx, sfx, off, 0.25); tone(ctx, sfx, { t: off, dur: 0.5, freq: 900, glideTo: 60, gain: 0.03, release: 0.4 });   // the monitor dies
    for (let t = off + 0.6; t < on; t += 0.55) step(ctx, sfx, t, 0.04, false);   // creeping to the door
    glitch(ctx, sfx, on, 0.35, 0.06); tone(ctx, sfx, { t: on, dur: 0.4, freq: 60, glideTo: 7000, gain: 0.012, release: 0.3 }); impact(ctx, big, on + 0.05, 0.35);
    [72, 76, 79, 84].forEach((m, i) => tone(ctx, sfx, { t: on + 0.45 + i * 0.22, dur: 0.3, freq: mtof(m - 1), type: "square", gain: 0.022, cutoff: 1800, release: 0.2, detune: -30 }));   // the game's jingle, a little wrong
    braam(ctx, big, on + 0.1, 33, 0.14); pad(ctx, music, on + 0.3, s.t1 - on, [33, 39, 45, 46], { gain: 0.04, cutoff: 600, attack: 0.8, release: 0.8 }); for (let t = on + 0.4; t < s.t1; t += 0.85) heartbeat(ctx, sfx, t, 0.2); }
  // ===== loop 46: the rain, his steps slowing... lightning: someone on the last roof
  { const s = shot("loop46"), rv = wordT("n05", /^another/) - 0.1; zip(s.t0, 0.06); rain(s.t0, s.t1, 0.05); for (let t = s.t0 + 0.05, i = 0; t < s.t0 + 1.5; t += 0.18 + i * 0.03, i++) step(ctx, sfx, t, 0.06, true);
    pulse(s.t0, rv, 112, 0.6, 33, false); thunder(rv, 0.32); braam(ctx, big, rv + 0.02, 30, 0.22); tone(ctx, music, { t: rv, dur: s.t1 - rv + 0.5, freq: mtof(69), type: "sawtooth", gain: 0.012, cutoff: 1500, attack: 0.6, release: 0.4 });
    tone(ctx, music, { t: rv, dur: s.t1 - rv + 0.5, freq: mtof(70), type: "sawtooth", gain: 0.01, cutoff: 1500, attack: 0.6, release: 0.4 }); for (let t = rv + 0.3; t < s.t1; t += 0.7) heartbeat(ctx, sfx, t, 0.24); }
  // ===== Maya: thunder at her name, then a piano in her room
  { const s = shot("maya"), nm = wordT("n06", /^maya/i) - 0.1, rm = wordT("n06", /^she/i) - 0.15; rain(s.t0, rm, 0.05); thunder(nm, 0.2); chime(ctx, big, nm + 0.05, 0.05);
    pad(ctx, music, nm, s.t1 - nm + 0.5, [45, 52, 57, 60, 64], { gain: 0.04, cutoff: 1100, attack: 0.8, release: 1, type: "triangle" });
    [64, 67, 69, 72, 71, 67, 69, 64].forEach((m, i) => piano(ctx, music, rm + 0.1 + i * 0.42, m, 0.05, 2.5)); tone(ctx, sfx, { t: rm, dur: s.t1 - rm, freq: 120, type: "sawtooth", gain: 0.006, cutoff: 300, attack: 0.5, release: 0.4 }); }
  // ===== the plan: a pulse that builds
  { const s = shot("plan"); rain(s.t0, s.t1, 0.045); pulse(s.t0, s.t1, 120, 0.9, 33); riser(ctx, sfx, s.t1 - 1.8, 1.8, 0.07); impact(ctx, big, s.t0 + 0.05, 0.3); }
  // ===== three, two, one: they run, they leap... and time stops
  { const s = shot("jump"), w3 = wordT("n08", /^three/i), w2 = wordT("n08", /^two/i), w1 = wordT("n08", /^one/i), go = w1 + 0.25, start = go - 10 / 8, FZ = go + 0.95;
    rain(s.t0, FZ, 0.05); [[w3, 1050], [w2, 1050], [w1, 2100]].forEach(([t, f]) => { beep(t, f, 0.05, f > 2000 ? 0.4 : 0.2); heartbeat(ctx, sfx, t, 0.3); });
    for (let t = start; t < go; t += 0.15) { step(ctx, sfx, t, 0.08, true); step(ctx, sfx, t + 0.07, 0.06, true); }
    whoosh(ctx, sfx, go - 0.1, 0.6, 0.18); impact(ctx, big, go, 0.45); tone(ctx, sfx, { t: go, dur: FZ - go, freq: 220, glideTo: 110, type: "sawtooth", gain: 0.02, cutoff: 700, release: 0.2 });   // slow motion
    tone(ctx, sfx, { t: FZ - 0.05, dur: 0.6, freq: 400, glideTo: 30, type: "sawtooth", gain: 0.1, cutoff: 1500, release: 0.5 }); impact(ctx, big, FZ, 0.4); hiss(ctx, sfx, { t: FZ - 0.5, dur: 0.55, gain: 0.07, freq: 400, freqTo: 4000, q: 1, attack: 0.5 });   // time stops
    tone(ctx, music, { t: FZ + 0.2, dur: dur - FZ, freq: mtof(88), gain: 0.006, attack: 1.2, release: 1 }); pad(ctx, music, FZ + 0.1, dur - FZ, [33, 40, 45, 52], { gain: 0.04, cutoff: 600, attack: 1.2, release: 1 });
    for (let t = FZ + 0.5; t < line("n09").t + 0.1; t += 1.1) heartbeat(ctx, sfx, t, 0.18);
    const c0 = line("n09").t + 0.1; impact(ctx, big, c0, 0.3); chime(ctx, big, c0 + 0.05, 0.05);
    for (let t = c0 + 0.2, i = 0; t < dur - 0.6; t += 60 / 112 / 2, i++) { bass(t, 33 + [0, 0, 12, 0, 7, 0, 12, 10][i % 8], 0.2, 0.05); if (i % 4 === 0) kick(ctx, music, t, 0.28); hat(ctx, music, t + 0.13, 0.018); }
    [69, 72, 76, 74, 72, 69, 67, 69].forEach((m, i) => piano(ctx, music, c0 + 0.6 + i * 0.9, m, 0.035, 2.5)); }
  music.gain.setTargetAtTime(0, dur - 0.4, 0.15);
}
