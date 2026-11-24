// Five Stars: a relentless chase score and the sound of everything Getaway Heat throws at you. All synthesized.
import { mtof, rnd, filt, panner, tone, hiss, kick, snare, clap, hat, pad, braam, impact, riser, whoosh, heartbeat, glitch, chime, click, screech } from "../../audio.js";

export function score({ ctx, music, sfx, big, tl, dur }) {
  const lines = tl.lines, shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => lines.find((l) => l.id === id);
  const S = (id) => shot(id).t0, E = (id) => shot(id).t1, at = (id, lt) => S(id) + lt;
  const wordT = (id, i) => line(id).words[Math.min(i, line(id).words.length - 1)].t;
  const cannon = (t, g = 1) => { impact(ctx, sfx, t, 0.9 * g); tone(ctx, sfx, { t, dur: 0.5, freq: 160, glideTo: 35, type: "sawtooth", gain: 0.25 * g, cutoff: 900, release: 0.4 }); hiss(ctx, sfx, { t, dur: 1.6, gain: 0.4 * g, type: "lowpass", freq: 2400, freqTo: 120, attack: 0.002 }); hiss(ctx, big, { t, dur: 0.3, gain: 0.3 * g, type: "highpass", freq: 3000 }); };
  const boom = (t, g = 1) => { impact(ctx, sfx, t, 0.8 * g); hiss(ctx, sfx, { t, dur: 2.4, gain: 0.32 * g, type: "lowpass", freq: 1800, freqTo: 90, attack: 0.01 }); tone(ctx, big, { t, dur: 1.8, freq: 48, glideTo: 30, gain: 0.3 * g, release: 1.6 }); for (let i = 0; i < 8; i++) hiss(ctx, sfx, { t: t + 0.25 + rnd() * 1.4, dur: 0.06, gain: 0.05 * g, type: "highpass", freq: 3000 + rnd() * 3000, pan: rnd() * 2 - 1 }); };
  const crunch = (t, g = 1) => { impact(ctx, sfx, t, 0.6 * g); hiss(ctx, sfx, { t, dur: 0.5, gain: 0.3 * g, type: "bandpass", freq: 1400, q: 0.8 }); [233, 389, 617, 1021].forEach((f, i) => tone(ctx, sfx, { t, dur: 0.7, freq: f, glideTo: f * 0.85, gain: 0.03 * g, release: 0.6, pan: (i - 1.5) * 0.3 })); };
  const screechTyre = (t, d, g = 0.18) => hiss(ctx, sfx, { t, dur: d, gain: g, freq: 2800, freqTo: 1700, q: 5, attack: 0.04, release: 0.2 });
  const nitro = (t, d = 1.2) => { hiss(ctx, sfx, { t, dur: d, gain: 0.22, freq: 800, freqTo: 3500, q: 1, attack: 0.05, release: 0.4 }); tone(ctx, sfx, { t, dur: d, freq: 90, glideTo: 260, type: "sawtooth", gain: 0.08, cutoff: 1600, release: 0.4 }); };
  const siren = (t0, t1, g = 0.022, pan = -0.4) => { if (t1 - t0 < 0.5) return; const o = ctx.createOscillator(); o.type = "triangle"; const gg = ctx.createGain(); gg.gain.setValueAtTime(0, t0); gg.gain.linearRampToValueAtTime(g, t0 + 0.4); gg.gain.setValueAtTime(g, t1 - 0.3); gg.gain.linearRampToValueAtTime(0, t1);
    for (let t = t0, k = 0; t < t1; t += 0.42, k++) o.frequency.setValueAtTime(k % 2 ? 960 : 720, t); const p = panner(ctx, pan); o.connect(gg); gg.connect(p); p.connect(sfx); o.start(t0); o.stop(t1); };
  const chase = (t0, t1, bpm, root, g = 1, fills = true) => {   // drums, a driving bass, stabs, a pad: Dm-Bb-C-A
    if (t1 - t0 < 0.3) return; const beat = 60 / bpm, prog = [0, -4, -2, -5];
    for (let i = 0, t = t0; t < t1 - 0.02; i++, t = t0 + i * beat) {
      const r = root + prog[Math.floor(i / 8) % 4];
      kick(ctx, music, t, 0.6 * g); if (i % 2) snare(ctx, music, t, 0.22 * g); hat(ctx, music, t + beat / 2, 0.05 * g); hat(ctx, music, t + beat * 0.25, 0.022 * g); hat(ctx, music, t + beat * 0.75, 0.022 * g);
      if (fills && i % 16 === 15) for (let f = 0; f < 4; f++) snare(ctx, music, t + f * beat / 4, 0.12 * g);
      for (let e = 0; e < 4; e++) { const tt = t + e * beat / 4; if (tt < t1) tone(ctx, music, { t: tt, dur: beat / 4 * 0.85, freq: mtof(r - 24 + (e === 3 ? 12 : 0)), type: "sawtooth", gain: 0.075 * g, cutoff: 900, release: 0.03 }); }
      if (i % 4 === 0) [r, r + 3, r + 7].forEach((m) => tone(ctx, music, { t, dur: beat * 0.35, freq: mtof(m), type: "sawtooth", gain: 0.022 * g, cutoff: 2600, release: 0.1 }));
      if (i % 8 === 0) pad(ctx, music, t, Math.min(beat * 8, t1 - t), [r - 12, r, r + 7], { gain: 0.03 * g, cutoff: 1100, attack: 0.1, release: 0.2 });
    }
  };
  const chop = (t0, t1, g = 0.12) => { for (let t = t0; t < t1; t += 0.085) hiss(ctx, sfx, { t, dur: 0.06, gain: g * (0.6 + 0.4 * Math.sin(t)), type: "lowpass", freq: 300, attack: 0.005 }); };   // helicopter rotors

  // ===== HOOK: the cannon, the fireball, slow motion, then a hard cut back
  { const h = shot("hook"), fire = 0.75; whoosh(ctx, sfx, 0, 0.3, 0.2); tone(ctx, music, { t: 0, dur: fire, freq: 55, glideTo: 110, type: "sawtooth", gain: 0.06, cutoff: 600, attack: 0.5 }); riser(ctx, sfx, 0, fire, 0.25);
    cannon(fire); boom(fire + 0.05, 1.1); braam(ctx, big, fire, 38, 0.22); nitro(fire + 0.1, 2.0);
    hiss(ctx, sfx, { t: fire + 0.2, dur: h.dur - fire, gain: 0.1, type: "lowpass", freq: 500, attack: 0.1 }); heartbeat(ctx, sfx, fire + 0.6, 0.6); heartbeat(ctx, sfx, fire + 1.5, 0.6);
    glitch(ctx, sfx, h.t1 - 0.2, 0.3, 0.07);
    const rw = h.t1; tone(ctx, sfx, { t: rw, dur: 0.9, freq: 900, glideTo: 2600, type: "sawtooth", gain: 0.03, cutoff: 3200, release: 0.1 }); hiss(ctx, sfx, { t: rw, dur: 0.9, gain: 0.12, freq: 1500, freqTo: 5000, q: 1.5 }); }

  // ===== the chase: one long track that drops out for the big moments
  const c0 = S("gh-intro") + 0.9, ramp = S("gh-air"), air1 = E("gh-air"), heli0 = S("gh-heli"), emp = at("gh-crash", 0.15), tank = S("gh-tank"), blast = S("gh-blast"), rec = wordT("n11", 2), t2 = S("gh-tank2"), cta = S("cta");
  impact(ctx, sfx, c0, 0.5);
  chase(c0, ramp, 150, 50); chase(air1, emp, 156, 50, 1.05); chase(emp + 1.6, blast, 160, 50, 1.1); chase(blast + 2.2, rec - 0.1, 160, 50, 0.9, false);
  siren(c0, emp, 0.022, -0.4); siren(c0 + 0.21, emp, 0.016, 0.4);
  hiss(ctx, sfx, { t: c0, dur: t2 + 4 - c0, gain: 0.045, type: "highpass", freq: 2200, attack: 0.5, release: 0.5 });   // rain
  const eng = ctx.createOscillator(); eng.type = "sawtooth"; const elp = filt(ctx, "lowpass", 700), eg = ctx.createGain(); eng.frequency.setValueAtTime(92, c0);
  for (const [t, f] of [[ramp - 1.2, 105], [ramp, 160], [air1, 120], [blast, 110], [blast + 0.9, 170], [rec, 140], [cta - 0.5, 120]]) eng.frequency.linearRampToValueAtTime(f, t);
  eg.gain.setValueAtTime(0, c0); eg.gain.linearRampToValueAtTime(0.05, c0 + 0.3); eg.gain.setValueAtTime(0.05, cta - 0.6); eg.gain.linearRampToValueAtTime(0, cta - 0.1); eng.connect(elp); elp.connect(eg); eg.connect(sfx); eng.start(c0); eng.stop(cta);
  // set pieces
  { const d = shot("gh-drift"); screechTyre(d.t0 + 0.9, 1.4); whoosh(ctx, sfx, d.t0 + 1.2, 0.6, 0.3, -0.5); tone(ctx, sfx, { t: d.t0 + 1.0, dur: 0.9, freq: 330, glideTo: 290, type: "square", gain: 0.03, release: 0.3, pan: -0.5 }); }   // the bus horn
  { const r = shot("gh-radio"), ram = r.t0 + r.lead - 0.9; crunch(ram, 0.8); nitro(ram + 0.2, 1.2); chime(ctx, big, wordT("d01", 6), 0.06); }
  { const s = shot("gh-swat"), hit = s.t0 + s.L("n03") + 1.25; tone(ctx, sfx, { t: hit - 1.6, dur: 1.6, freq: 70, glideTo: 95, type: "sawtooth", gain: 0.06, cutoff: 500, attack: 1.2 }); crunch(hit, 1.2); screechTyre(hit + 0.05, 0.9, 0.2); }
  { const s = shot("gh-shield"), grab = s.t0 + 0.55, ram = s.t0 + s.lead - 0.35; chime(ctx, big, grab, 0.1); tone(ctx, sfx, { t: grab, dur: 0.6, freq: 300, glideTo: 900, gain: 0.05, release: 0.4 });
    impact(ctx, sfx, ram, 0.7); tone(ctx, big, { t: ram, dur: 1.2, freq: 520, glideTo: 380, gain: 0.08, release: 1.1 }); boom(ram + 0.45, 0.8); }
  { const b = shot("gh-block"); siren(b.t0, b.t1, 0.03, 0.2); for (let t = b.t0; t < b.t1; t += 0.62) heartbeat(ctx, sfx, t, 0.3); riser(ctx, music, b.t1 - 2.5, 2.5, 0.16); }
  { const r = shot("gh-ramp"); nitro(r.t0 + r.dur * 0.55, 1.6); riser(ctx, sfx, r.t0, r.dur, 0.2); }
  { const a = shot("gh-air"); hiss(ctx, sfx, { t: a.t0, dur: a.dur, gain: 0.14, freq: 600, q: 0.6, attack: 0.2 }); tone(ctx, music, { t: a.t0, dur: a.dur, freq: mtof(86), gain: 0.025, attack: 0.4, release: 0.2 }); heartbeat(ctx, sfx, a.t0 + 0.4, 0.6); heartbeat(ctx, sfx, a.t0 + 1.6, 0.6);
    const land = a.t0 + 1.25 / 0.42; if (land < a.t1 + 0.5) { impact(ctx, sfx, land, 0.9); crunch(land, 0.6); screechTyre(land + 0.05, 0.8); } braam(ctx, big, a.t0, 41, 0.12); }
  { chop(heli0 - 0.5, emp + 0.6, 0.1); whoosh(ctx, sfx, heli0 + 0.3, 1.6, 0.25, 0.4); chime(ctx, big, STAR5(), 0.06); }
  { const e = shot("gh-emp"), grab = e.t0 + 0.6; chime(ctx, big, grab, 0.1); tone(ctx, sfx, { t: grab, dur: 0.6, freq: 300, glideTo: 1100, gain: 0.05, release: 0.4 }); click(ctx, sfx, e.t0 + 1.2, 0.3); }
  { tone(ctx, sfx, { t: emp, dur: 1.4, freq: 70, glideTo: 30, gain: 0.5, release: 1.3 }); hiss(ctx, sfx, { t: emp, dur: 1.2, gain: 0.25, freq: 3000, freqTo: 300, q: 0.8 }); for (let i = 0; i < 18; i++) tone(ctx, sfx, { t: emp + rnd() * 0.8, dur: 0.03, freq: 2000 + rnd() * 4000, type: "square", gain: 0.02, release: 0.02, pan: rnd() * 2 - 1 });
    tone(ctx, sfx, { t: emp + 0.35, dur: 1.4, freq: 900, glideTo: 60, type: "sawtooth", gain: 0.04, cutoff: 1500, release: 1.2 });   // every siren dies
    const fallT = emp + 0.35 + Math.sqrt(8.9 / 4.5) + 0.15; screech(ctx, big, emp + 0.6, 1.5, 0.06); boom(fallT, 1.4); }
  { const k = shot("gh-tank"); for (let i = 0; i < 6; i++) tone(ctx, sfx, { t: k.t0 + k.L("n09") + 2.4 + i * 0.18, dur: 0.15, freq: 55, gain: 0.25, release: 0.12 });   // tracks on asphalt
    braam(ctx, big, k.t0 + k.L("n09") + 2.6, 33, 0.22); for (let t = k.t0 + k.L("j04"); t < k.t1; t += 0.5) heartbeat(ctx, sfx, t, 0.4); }
  { const fire = blast + 0.75; tone(ctx, music, { t: blast, dur: 0.75, freq: 55, glideTo: 110, type: "sawtooth", gain: 0.06, cutoff: 600, attack: 0.5 }); cannon(fire); boom(fire + 0.05, 1.1); nitro(fire + 0.1, 2.0); hiss(ctx, sfx, { t: fire + 0.2, dur: 1.4, gain: 0.1, type: "lowpass", freq: 500 }); }
  { // the count and the record
    [0, 1, 2].forEach((i) => tone(ctx, sfx, { t: wordT("n11", i), dur: 0.12, freq: i === 2 ? 1320 : 880, gain: 0.06, release: 0.08 }));
    for (let t = rec - 2.2; t < rec; t += 0.5) heartbeat(ctx, sfx, t, 0.35);
    const win = rec + 0.9; impact(ctx, sfx, win, 0.6); chime(ctx, big, win, 0.14); pad(ctx, music, win, t2 - win + 0.5, [62, 66, 69, 74, 78], { gain: 0.06, cutoff: 3400, attack: 0.02, release: 0.4 });
    for (let i = 0; i < 8; i++) tone(ctx, music, { t: win + i * 0.12, dur: 0.3, freq: mtof([74, 78, 81, 86, 81, 86, 90, 93][i]), type: "square", gain: 0.02, cutoff: 4000, release: 0.2 }); kick(ctx, music, win, 0.7); }
  { braam(ctx, big, t2 + 0.2, 31, 0.24); boom(t2 + 0.05, 0.9); for (let t = t2 + 1; t < cta - 0.3; t += 0.55) heartbeat(ctx, sfx, t, 0.4); tone(ctx, music, { t: t2, dur: cta - t2, freq: 36.7, gain: 0.2, attack: 0.2, release: 0.2 }); }

  // ===== Pulsebox (the same bright ending as the other films)
  { const t0 = cta, beat = 60 / 118, end = dur;
    whoosh(ctx, sfx, t0 - 0.35, 0.4, 0.25); impact(ctx, sfx, t0, 0.5);
    const prog = [[48, 55, 60, 64], [43, 55, 59, 62], [45, 57, 60, 64], [41, 57, 60, 65]], mel = [76, 74, 72, 74, 76, 79, 76, 74, 72, 72, 74, 76, 74, 72, 69, 72];
    for (let i = 0, t = t0 + 0.05; t < end - 0.6; i++, t = t0 + 0.05 + i * beat) {
      const ch = prog[Math.floor(i / 4) % 4];
      kick(ctx, music, t, 0.55); if (i % 2 === 1) clap(ctx, music, t, 0.16); hat(ctx, music, t + beat / 2, 0.045);
      tone(ctx, music, { t, dur: beat * 0.45, freq: mtof(ch[0] - 12), type: "sawtooth", gain: 0.1, cutoff: 600, release: 0.08 }); tone(ctx, music, { t: t + beat / 2, dur: beat * 0.4, freq: mtof(ch[0]), type: "sawtooth", gain: 0.06, cutoff: 800, release: 0.08 });
      ch.slice(1).forEach((m) => tone(ctx, music, { t: t + 0.02, dur: beat * 0.85, freq: mtof(m), type: "sawtooth", gain: 0.022, attack: 0.05, release: 0.25, cutoff: 2200, detune: (m % 3) * 6 }));
      if (i >= 8 && i % 2 === 0) { const m = mel[(i / 2) % mel.length]; tone(ctx, music, { t, dur: beat * 1.5, freq: mtof(m), type: "square", gain: 0.025, cutoff: 3500, release: 0.4, pan: 0.15 }); tone(ctx, music, { t, dur: beat * 1.5, freq: mtof(m + 12), type: "sine", gain: 0.02, release: 0.4 }); }
    }
    const a = line("n14"), b = line("n15");
    a.words.forEach((w) => { if (/racing|horror|heists|sports/i.test(w.w)) tone(ctx, sfx, { t: w.t, dur: 0.18, freq: 880, glideTo: 1320, gain: 0.07, release: 0.1 }); });
    chime(ctx, big, b.t + 0.2, 0.09); { const w = b.words.find((x) => /^play/i.test(x.w)); if (w) chime(ctx, big, w.t, 0.07); }
    pad(ctx, music, end - 1.2, 1.6, [60, 64, 67, 72], { gain: 0.05, cutoff: 3000, attack: 0.02, release: 1.4 }); kick(ctx, music, end - 1.2, 0.6);
  }
  function STAR5() { return line("d03").t + 0.2; }
}
