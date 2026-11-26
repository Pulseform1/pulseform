// The Floor Is Lava: the lava's rumble and bubbles, tiles that rattle, crack and drop, splashes, a bouncy party beat
// for the game, a tense pulse for the end, a slow piano when Jay steps back, and the achievement chime. All synthesized.
import { mtof, rnd, tone, hiss, kick, snare, clap, hat, pad, piano, braam, impact, riser, whoosh, heartbeat, chime, click } from "../../audio.js";

export function score({ ctx, music, sfx, big, tl, dur }) {
  const shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => tl.lines.find((l) => l.id === id);
  const S = (id) => shot(id).t0, E = (id) => shot(id).t1, at = (id, lt) => S(id) + lt;
  const wordT = (id, re) => { const l = line(id); return (l.words.find((w) => re.test(w.w)) || l.words[l.words.length - 1]).t; };
  const rumble = (t0, t1, g = 0.05) => { if (t1 - t0 < 0.1) return; tone(ctx, sfx, { t: t0, dur: t1 - t0, freq: 38, type: "sawtooth", gain: g * 0.6, cutoff: 120, attack: 0.4, release: 0.4 }); hiss(ctx, sfx, { t: t0, dur: t1 - t0, gain: g, type: "lowpass", freq: 260, attack: 0.4, release: 0.4 });
    for (let t = t0 + 0.2; t < t1 - 0.2; t += 0.25 + rnd() * 0.5) { const f = 90 + rnd() * 160; tone(ctx, sfx, { t, dur: 0.12, freq: f, glideTo: f * 1.8, gain: g * 0.25, release: 0.08, pan: rnd() * 1.4 - 0.7 }); } };   // bubbles
  const rattle = (t, d = 0.6, g = 0.05) => { for (let x = t; x < t + d; x += 0.04 + rnd() * 0.03) hiss(ctx, sfx, { t: x, dur: 0.03, gain: g * (0.4 + (x - t) / d), type: "bandpass", freq: 900 + rnd() * 600, q: 3 }); };
  const crack = (t, g = 0.2) => { hiss(ctx, sfx, { t, dur: 0.18, gain: g, type: "highpass", freq: 1500 }); tone(ctx, sfx, { t, dur: 0.25, freq: 160, glideTo: 50, type: "square", gain: g * 0.3, cutoff: 900, release: 0.2 }); };
  const splash = (t, g = 0.15) => { hiss(ctx, sfx, { t, dur: 0.9, gain: g, type: "lowpass", freq: 1400, freqTo: 300, attack: 0.01 }); tone(ctx, sfx, { t, dur: 0.6, freq: 90, glideTo: 40, gain: g * 0.6, release: 0.5 }); hiss(ctx, sfx, { t: t + 0.05, dur: 1.2, gain: g * 0.35, type: "highpass", freq: 3000, attack: 0.1 }); };   // the sizzle
  const party = (t0, t1, g = 1, bpm = 128, root = 45) => { const b = 60 / bpm; for (let t = t0, i = 0; t < t1 - 0.05; t += b, i++) { kick(ctx, music, t, 0.4 * g); if (i % 2) clap(ctx, music, t, 0.1 * g); hat(ctx, music, t + b / 2, 0.035 * g, i % 4 === 3);
      const ch = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [4, 7, 12]][Math.floor(i / 4) % 4]; tone(ctx, music, { t: t + b / 2, dur: b * 0.4, freq: mtof(root + 12 + ch[0]), type: "square", gain: 0.02 * g, cutoff: 2400, release: 0.05 });
      ch.forEach((n) => tone(ctx, music, { t: t + b / 2, dur: b * 0.35, freq: mtof(root + 24 + n), type: "triangle", gain: 0.012 * g, release: 0.06 })); tone(ctx, music, { t, dur: b * 0.8, freq: mtof(root - 12 + ch[0]), type: "sawtooth", gain: 0.06 * g, cutoff: 450, release: 0.08 }); } };
  const ding = (t) => [76, 83].forEach((m, i) => tone(ctx, sfx, { t: t + i * 0.07, dur: 0.3, freq: mtof(m), type: "square", gain: 0.02, cutoff: 3000, release: 0.2 }));
  const out = (t) => [64, 60].forEach((m, i) => tone(ctx, sfx, { t: t + i * 0.12, dur: 0.2, freq: mtof(m), type: "square", gain: 0.025, cutoff: 2200, release: 0.1 }));   // "eliminated" blip

  // ===== hook: a hundred players (the beat), the floor goes (cracks, splashes), only one can win (a hit, then quiet)
  { const s = shot("hook"), wF = wordT("h01", /^floor/i) - 0.15, wA = wordT("h01", /^and/i) - 0.1;
    party(0, wF, 1, 128); rumble(0, s.t1, 0.05); impact(ctx, big, wF, 0.5); braam(ctx, big, wF, 33, 0.18);
    for (let t = wF; t < wA; t += 0.07 + rnd() * 0.05) { crack(t, 0.06 + rnd() * 0.05); if (rnd() > 0.5) splash(t + 0.2, 0.05); }
    riser(ctx, sfx, wF, wA - wF, 0.07); impact(ctx, big, wA, 0.55); tone(ctx, sfx, { t: wA, dur: s.t1 - wA, freq: 55, gain: 0.12, release: 0.6 }); chime(ctx, big, wA + 0.05, 0.05);
    for (let t = wA + 0.2; t < s.t1; t += 0.6) heartbeat(ctx, sfx, t, 0.25); }
  // ===== Friday night: the lobby music from his speakers, a little ping as Maya joins
  { const s = shot("start"); party(s.t0, s.t1, 0.45, 118, 47); ding(wordT("n01", /^maya/i)); }
  // ===== one tile at a time: rattle, crack, the drop, a splash; the kill feed blips
  { const s = shot("drop"), wd = wordT("n02", /^drops/i); party(s.t0, s.t1, 0.6, 128); rumble(s.t0, s.t1, 0.06); rattle(wd - 0.9, 0.9, 0.06); crack(wd, 0.22); whoosh(ctx, sfx, wd + 0.1, 0.8, 0.08); splash(wd + 1.14, 0.18); out(wd);
    for (let t = wd + 1.6; t < s.t1; t += 0.9 + rnd() * 0.5) { crack(t, 0.08); out(t); } }
  // ===== the deal: a fist bump, a warm chord
  { const s = shot("deal"), b = s.t0 + s.L("n03") + 0.9; party(s.t0, s.t0 + s.L("e01") - 0.2, 0.55, 128); rumble(s.t0, s.t1, 0.05); clap(ctx, sfx, b, 0.12); chime(ctx, sfx, b + 0.02, 0.04);
    pad(ctx, music, s.t0 + s.L("e01") - 0.3, s.t1 - s.t0 - s.L("e01") + 0.5, [45, 52, 57, 61], { gain: 0.04, cutoff: 1100, attack: 0.4, release: 0.6, type: "triangle" }); }
  // ===== chaos: the beat goes double, cracks and splashes everywhere, two hits on the numbers
  { const s = shot("chaos"), w90 = wordT("n04", /^ninety$|^90/i), w98 = wordT("n04", /ninety-eight|^98/i); party(s.t0, s.t1, 1, 150, 45); rumble(s.t0, s.t1, 0.07);
    for (let t = s.t0 + 0.1; t < w98 + 0.3; t += 0.09 + rnd() * 0.08) { crack(t, 0.05 + rnd() * 0.04); if (rnd() > 0.6) splash(t + 0.3, 0.05); } impact(ctx, big, w90, 0.4); impact(ctx, big, w98, 0.5); out(w90); out(w98);
    whoosh(ctx, sfx, E("chaos") - 0.9, 0.5, 0.1); }   // the hop
  // ===== the last platform: the beat drops out; a low drone; the edge breaks off
  { const s = shot("last"), cr = wordT("n05", /^room/i) - 0.1; impact(ctx, big, s.t0, 0.35); rumble(s.t0, s.t1, 0.07); pad(ctx, music, s.t0, s.dur + 0.5, [33, 40, 45], { gain: 0.05, cutoff: 500, attack: 0.3, release: 0.6 });
    crack(cr, 0.25); for (let i = 0; i < 6; i++) crack(cr + 0.1 + i * 0.09, 0.08); splash(cr + 1.2, 0.12); for (let t = s.t0 + 0.3; t < s.t1; t += 0.75) heartbeat(ctx, sfx, t, 0.25); }
  // ===== Maya has never won: a soft music box; the question: a held breath
  { const s = shot("look"), e2 = s.t0 + s.L("e02") - 0.2; rumble(s.t0, s.t1, 0.04); [76, 79, 81, 79, 76, 74, 72].forEach((m, i) => tone(ctx, music, { t: s.t0 + 0.4 + i * 0.4, dur: 0.6, freq: mtof(m), gain: 0.03, attack: 0.005, release: 0.5 }));
    pad(ctx, music, s.t0, s.dur, [45, 52, 57], { gain: 0.035, cutoff: 700, attack: 0.6, release: 0.6, type: "triangle" }); for (let t = e2; t < s.t1; t += 0.85) heartbeat(ctx, sfx, t, 0.22); riser(ctx, sfx, s.t1 - 1.4, 1.4, 0.05); }
  // ===== he steps back: everything goes quiet but a piano; the splash, far below
  { const s = shot("fall"), st = wordT("n07", /^stepped/i), SPL = st + 0.9 + Math.sqrt(2 * 6.4 / 9.8) / 0.45; rumble(s.t0, s.t1, 0.03);
    pad(ctx, music, s.t0, s.dur + 2.5, [48, 55, 60, 64], { gain: 0.045, cutoff: 1200, attack: 0.8, release: 1.5, type: "triangle" }); [72, 71, 67, 64, 67, 72, 74].forEach((m, i) => piano(ctx, music, s.t0 + 0.2 + i * 0.55, m, 0.05, 3));
    whoosh(ctx, sfx, st + 0.9, 1.6, 0.07); splash(SPL, 0.2); out(SPL); }
  // ===== Maya wins: a fanfare, confetti; then the achievement chime
  { const s = shot("unlock"), pop = wordT("n08", /^popped/i) - 0.1, lead = s.t0 + s.lead - 0.1;
    [60, 64, 67, 72, 67, 72].forEach((m, i) => tone(ctx, sfx, { t: s.t0 + 0.9 + i * 0.12, dur: i === 5 ? 0.6 : 0.14, freq: mtof(m + 12), type: "square", gain: 0.03, cutoff: 3500, release: 0.15 })); clap(ctx, sfx, s.t0 + 0.9, 0.12);
    for (let i = 0; i < 12; i++) hiss(ctx, sfx, { t: s.t0 + 0.9 + i * 0.06, dur: 0.04, gain: 0.04, type: "highpass", freq: 5000, pan: rnd() * 1.6 - 0.8 });   // confetti poppers
    pad(ctx, music, lead, s.t1 - lead + 0.5, [48, 52, 55, 60], { gain: 0.04, cutoff: 1100, attack: 0.6, release: 0.8, type: "triangle" });
    [72, 76, 79, 84].forEach((m, i) => tone(ctx, sfx, { t: pop + i * 0.08, dur: 1.6, freq: mtof(m), gain: 0.05, attack: 0.004, release: 1.5 })); impact(ctx, big, pop, 0.3); chime(ctx, big, pop + 0.35, 0.06);
    [67, 72, 76, 74, 72, 71, 72].forEach((m, i) => piano(ctx, music, pop + 0.8 + i * 0.6, m, 0.045, 3)); }
  // ===== Pulsebox
  { const s = shot("cta"); impact(ctx, big, s.t0, 0.35); chime(ctx, big, s.t0 + 0.1, 0.06); party(s.t0 + 0.3, dur - 0.5, 0.55, 124, 45); }
  music.gain.setTargetAtTime(0, dur - 0.4, 0.15);
}
