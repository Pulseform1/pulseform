// The 78th Game: the score and sound effects, timed from the picture (shots and lines).
import { mtof, rnd, filt, panner, tone, hiss, kick, snare, clap, hat, pad, piano, braam, impact, riser, whoosh, heartbeat, glitch, ping, groan, chime, click, screech, buzz, step, bird } from "../../audio.js";

export function score({ ctx, music, sfx, big, tl, dur }) {
  const lines = tl.lines;
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
}
