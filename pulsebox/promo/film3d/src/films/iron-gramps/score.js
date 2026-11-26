// Iron Gramps: bright synthwave for the races, a sneaky little pluck for the mystery, warm piano for Grandpa. All synthesized.
import { mtof, rnd, filt, tone, hiss, kick, snare, hat, pad, piano, impact, riser, whoosh, chime, click, step } from "../../audio.js";

export function score({ ctx, music, sfx, big, tl, dur }) {
  const lines = tl.lines, shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => lines.find((l) => l.id === id);
  const S = (id) => shot(id).t0, E = (id) => shot(id).t1, at = (id, lt) => S(id) + lt;
  const wordT = (id, re) => { const l = line(id); return (l.words.find((w) => re.test(w.w)) || l.words[l.words.length - 1]).t; };
  const synthwave = (t0, t1, g = 1, root = 45) => {   // four on the floor, offbeat hats, an arpeggio, a bass line
    const beat = 60 / 124; for (let t = t0, i = 0; t < t1 - 0.05; t += beat, i++) { kick(ctx, music, t, 0.42 * g); if (i % 2) snare(ctx, music, t, 0.09 * g); hat(ctx, music, t + beat / 2, 0.04 * g);
      const ch = [[0, 7, 12, 16], [5, 9, 12, 17], [3, 7, 10, 15], [7, 11, 14, 19]][Math.floor(i / 4) % 4];
      for (let k = 0; k < 4; k++) tone(ctx, music, { t: t + k * beat / 4, dur: beat / 4, freq: mtof(root + 12 + ch[k]), type: "square", gain: 0.012 * g, cutoff: 3200, release: 0.06 });
      tone(ctx, music, { t, dur: beat * 0.9, freq: mtof(root - 12 + ch[0]), type: "sawtooth", gain: 0.06 * g, cutoff: 500, release: 0.08 }); } };
  const zoom = (t, g = 0.14) => { whoosh(ctx, sfx, t, 0.7, g); tone(ctx, sfx, { t, dur: 0.8, freq: 140, glideTo: 70, type: "sawtooth", gain: g * 0.25, cutoff: 700, release: 0.4 }); };
  const horn = (t, good) => (good ? [72, 76, 79, 84] : [67, 66, 65, 64]).forEach((m, i) => tone(ctx, sfx, { t: t + i * 0.11, dur: good ? 0.5 : 0.3, freq: mtof(m), type: "square", gain: 0.035, cutoff: 3000, release: 0.2 }));
  const ping = (t) => [88, 93].forEach((m, i) => tone(ctx, sfx, { t: t + i * 0.06, dur: 0.25, freq: mtof(m), gain: 0.05, release: 0.2 }));
  const pluck = (t, m, g = 0.05) => tone(ctx, music, { t, dur: 0.2, freq: mtof(m), type: "triangle", gain: g, release: 0.18 });

  // ===== the races: 9:00 PM, the finish, IronGramps by inches
  const hook = shot("hook"), cross = hook.dur * 0.62; synthwave(0, hook.t0 + cross, 1); zoom(at("hook", cross - 0.6), 0.2); impact(ctx, big, at("hook", cross), 0.5); horn(at("hook", cross + 0.1), false);
  tone(ctx, sfx, { t: at("hook", cross), dur: hook.dur - cross, freq: 110, type: "sawtooth", gain: 0.03, cutoff: 400, release: 0.3 });   // the slow motion: one long engine note
  // his room: a sigh of a chord
  pad(ctx, music, S("desk"), E("desk") - S("desk"), [45, 52, 55, 60], { gain: 0.04, cutoff: 700 }); chime(ctx, sfx, at("desk", 0.4), 0.04);
  // practice: the groove (sunny), then the night photo finish
  { const s = shot("practice"), n3 = s.t0 + s.L("n03") - 0.15, e1 = s.t0 + s.L("e01") - 0.2, cr = n3 + (e1 - n3) * 0.55;
    synthwave(s.t0, n3, 0.9, 47); for (let t = s.t0 + 1.25; t < n3; t += 2.5) zoom(t, 0.12);
    synthwave(n3, cr, 1); impact(ctx, big, cr, 0.45); horn(cr + 0.05, false); tone(ctx, sfx, { t: cr, dur: 0.5, freq: 900, glideTo: 300, type: "triangle", gain: 0.04, release: 0.4 });
    [64, 67, 69, 67, 64, 62].forEach((m, i) => pluck(e1 + i * 0.32, m, 0.045)); }   // the mystery
  // the chat: a ping for each message, a sneaky pluck line
  { const s = shot("chat"); [/^\W*nice/i, /^\W*eat/i, /^\W*bedtime/i].forEach((re) => ping(wordT("n05", re) - 0.1));
    for (let t = s.t0 + 0.2, i = 0; t < s.t1; t += 0.32, i++) pluck(t, [64, 67, 69, 67, 64, 62, 60, 62][i % 8], 0.035);
    tone(ctx, music, { t: s.t0, dur: s.dur, freq: mtof(40), type: "sawtooth", gain: 0.03, cutoff: 300, attack: 0.5, release: 0.5 }); }
  // the cheer: the race lost again, then silence... a thump downstairs
  { const s = shot("cheer"), c = s.t0 + s.L("n06") + 1.6; synthwave(s.t0, s.t0 + 1.3, 1); horn(s.t0 + 1.05, false);
    impact(ctx, sfx, c - 0.1, 0.25); hiss(ctx, sfx, { t: c - 0.1, dur: 0.6, gain: 0.06, type: "lowpass", freq: 600, attack: 0.05 }); tone(ctx, sfx, { t: c - 0.05, dur: 0.5, freq: 220, glideTo: 330, type: "triangle", gain: 0.03, cutoff: 800, release: 0.3 });
    click(ctx, sfx, c + 0.5, 0.15); }
  // the stairs: on his toes
  { const s = shot("stairs"); for (let t = s.t0 + 0.3; t < s.t1; t += 0.95) step(ctx, sfx, t, 0.05, false); [60, 62, 64, 62].forEach((m, i) => pluck(s.t0 + 0.4 + i * 0.9, m, 0.04)); }
  // the reveal: the laptop's little victory tune, a bouncy bass
  { const s = shot("reveal"); [72, 76, 79, 84, 79, 84].forEach((m, i) => tone(ctx, sfx, { t: s.t0 + 0.2 + i * 0.13, dur: 0.18, freq: mtof(m), type: "square", gain: 0.03, cutoff: 3500, release: 0.1 }));
    for (let t = s.t0 + 0.3, i = 0; t < s.t1; t += 0.24, i++) { tone(ctx, music, { t, dur: 0.18, freq: mtof([36, 43, 40, 43][i % 4]), type: "triangle", gain: 0.08, release: 0.12 }); if (i % 2) hat(ctx, music, t, 0.03); } }
  // why: warm piano
  { const s = shot("why"); pad(ctx, music, s.t0, s.dur + 1, [48, 55, 60, 64], { gain: 0.04, cutoff: 900, type: "triangle" }); [60, 64, 67, 72, 71, 67, 64, 62].forEach((m, i) => piano(ctx, music, s.t0 + 0.2 + i * 0.5, m, 0.05, 2.5)); }
  // race2: together, and Jay by a nose; then warm
  { const s = shot("race2"), r1 = s.t0 + s.dur * 0.45, cr = s.t0 + s.dur * 0.45 * 0.7; synthwave(s.t0, cr, 1.05, 48); zoom(cr - 0.5, 0.2); impact(ctx, big, cr, 0.5); horn(cr + 0.05, true); chime(ctx, big, cr + 0.1, 0.07);
    pad(ctx, music, r1, s.t1 - r1 + 1, [48, 52, 55, 60, 64], { gain: 0.05, cutoff: 1400, type: "triangle" }); [72, 76, 79, 76, 77, 74, 72].forEach((m, i) => piano(ctx, music, r1 + 0.2 + i * 0.45, m, 0.05, 2.5));
    tone(ctx, sfx, { t: r1 + 1.25, dur: 0.12, freq: 1900, glideTo: 2600, gain: 0.03, release: 0.1 }); }   // (the wink)
  // Pulsebox
  { const s = shot("cta"); impact(ctx, big, s.t0, 0.35); chime(ctx, big, s.t0 + 0.1, 0.06); synthwave(s.t0 + 0.3, dur - 0.5, 0.6, 45); }
  music.gain.setTargetAtTime(0, dur - 0.4, 0.15);
}
