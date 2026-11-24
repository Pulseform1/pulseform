// One Life: the score and sound effects, timed from the picture (shots and lines). All synthesized.
import { mtof, rnd, filt, panner, tone, hiss, kick, snare, clap, hat, pad, piano, braam, impact, riser, whoosh, heartbeat, glitch, chime, click, screech, buzz, step, bird } from "../../audio.js";

export function score({ ctx, music, sfx, big, tl, dur }) {
  const lines = tl.lines, shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => lines.find((l) => l.id === id);
  const S = (id) => shot(id).t0, E = (id) => shot(id).t1, at = (id, lt) => S(id) + lt;
  const tom = (t, g = 0.5, f = 90) => { tone(ctx, music, { t, dur: 0.5, freq: f, glideTo: f * 0.55, gain: g, release: 0.45 }); hiss(ctx, music, { t, dur: 0.08, gain: g * 0.25, type: "lowpass", freq: 900 }); };
  const thunder = (t, g = 0.5) => { hiss(ctx, sfx, { t, dur: 3.2, gain: g, type: "lowpass", freq: 260, freqTo: 70, attack: 0.05 }); hiss(ctx, sfx, { t, dur: 0.25, gain: g * 0.5, type: "highpass", freq: 2000 }); tone(ctx, sfx, { t, dur: 2.5, freq: 45, glideTo: 30, gain: g * 0.6, release: 2.2 }); };
  const rain = (t0, t1, g = 0.05) => hiss(ctx, sfx, { t: t0, dur: t1 - t0, gain: g, type: "highpass", freq: 2200, attack: 0.4, release: 0.4 });
  const siren = (t0, t1, g = 0.03) => { const o = ctx.createOscillator(); o.type = "triangle"; const gg = ctx.createGain(); gg.gain.setValueAtTime(0, t0); gg.gain.linearRampToValueAtTime(g, t0 + 0.4); gg.gain.setValueAtTime(g, t1 - 0.3); gg.gain.linearRampToValueAtTime(0, t1);
    for (let t = t0, k = 0; t < t1; t += 0.42, k++) o.frequency.setValueAtTime(k % 2 ? 960 : 720, t); const p = panner(ctx, -0.4); o.connect(gg); gg.connect(p); p.connect(sfx); o.start(t0); o.stop(t1); };
  const knock = (t, g = 0.45, glass = false) => { hiss(ctx, sfx, { t, dur: 0.07, gain: g, type: glass ? "bandpass" : "lowpass", freq: glass ? 2400 : 700, q: glass ? 3 : 0.7 }); tone(ctx, sfx, { t, dur: 0.12, freq: glass ? 1900 : 120, glideTo: glass ? 1700 : 70, gain: g * 0.5, release: 0.1 }); };
  const metal = (t, g = 0.5) => { impact(ctx, sfx, t, g); hiss(ctx, sfx, { t, dur: 0.9, gain: g * 0.4, type: "highpass", freq: 1800, freqTo: 900 }); [313, 497, 811, 1237].forEach((f, i) => tone(ctx, big, { t, dur: 1.6, freq: f, gain: g * 0.05, release: 1.5, pan: (i - 1.5) * 0.3 })); };
  const drive = (t0, t1, bpm, root, g = 1) => {   // a driving action loop: kick, snare, hats, a bass ostinato and a minor pad
    const beat = 60 / bpm, prog = [0, 0, -2, -4];
    for (let i = 0, t = t0; t < t1 - 0.05; i++, t = t0 + i * beat) {
      const r = root + prog[Math.floor(i / 8) % 4];
      kick(ctx, music, t, 0.55 * g); if (i % 2) snare(ctx, music, t, 0.2 * g); hat(ctx, music, t + beat / 2, 0.045 * g); hat(ctx, music, t + beat * 0.25, 0.02 * g);
      for (let e = 0; e < 2; e++) { const tt = t + e * beat / 2; if (tt < t1) tone(ctx, music, { t: tt, dur: beat / 2 * 0.85, freq: mtof(r - 24 + (e && i % 4 === 3 ? 7 : 0)), type: "sawtooth", gain: 0.085 * g, cutoff: 800, release: 0.04 }); }
      if (i % 8 === 0) pad(ctx, music, t, Math.min(beat * 8, t1 - t), [r, r + 3, r + 7], { gain: 0.03 * g, cutoff: 1400, attack: 0.1, release: 0.3 });
      if (i % 2 === 0) for (const d of [0, 0.75]) { const tt = t + d * beat; if (tt < t1) tone(ctx, music, { t: tt, dur: 0.12, freq: mtof(r + 12 + (i % 4 ? 3 : 7)), type: "square", gain: 0.016 * g, cutoff: 2600, release: 0.05, pan: d ? 0.3 : -0.3 }); }
    }
  };

  // ===== HOOK: drums, a rising string, lightning, then a hard stop and the tape rewinding
  { const h0 = 0, h1 = E("hook"); tom(0.02, 0.7, 70); braam(ctx, big, 0.02, 38, 0.2); thunder(0.3, 0.35);
    for (let t = 0.3, k = 0; t < h1 - 0.1; t += 0.28, k++) tom(t, 0.3 + k * 0.02, k % 2 ? 110 : 80);
    for (const m of [62, 63, 69]) tone(ctx, music, { t: 0, dur: h1, freq: mtof(m), glideTo: mtof(m + 2), type: "sawtooth", gain: 0.02, attack: h1 * 0.8, release: 0.05, cutoff: 3000 });
    rain(h0, h1, 0.06); hiss(ctx, sfx, { t: 0.2, dur: h1, gain: 0.05, type: "bandpass", freq: 900, q: 0.8, attack: 0.5 });   // the crawler's breath
    impact(ctx, sfx, h1 - 0.05, 0.5);
    // rewind: a whir that winds down and back up, sped-up chirps
    const rw = h1; tone(ctx, sfx, { t: rw, dur: 0.95, freq: 900, glideTo: 2400, type: "sawtooth", gain: 0.035, cutoff: 3000, release: 0.1 }); hiss(ctx, sfx, { t: rw, dur: 0.95, gain: 0.12, freq: 1500, freqTo: 5000, q: 1.5 });
    for (let t = rw; t < rw + 0.9; t += 0.06) tone(ctx, sfx, { t, dur: 0.04, freq: 1200 + rnd() * 2500, type: "square", gain: 0.012, release: 0.03 }); }
  // ===== the bedroom at night: a late-night synth bed, the mode appearing, the lights dying
  { const b0 = S("bed-wide") + 0.95, b1 = S("gh-chase");
    pad(ctx, music, b0, S("bed-dive") - b0 + 1, [57, 60, 64, 67], { gain: 0.04, cutoff: 1200, attack: 1, release: 1, type: "triangle" });
    [69, 72, 76, 74, 72, 76, 79, 76].forEach((m, i) => { const t = b0 + 0.4 + i * 0.75; if (t < S("bed-screen") + 2) piano(ctx, music, t, m, 0.05, 2.2); });
    const md = S("bed-screen") + shot("bed-screen").L("n02") + 1.4; glitch(ctx, sfx, md, 0.35, 0.05); impact(ctx, sfx, md, 0.35); chime(ctx, big, md + 0.1, 0.08);
    tone(ctx, music, { t: md, dur: S("bed-dive") - md + 2, freq: 41, gain: 0.16, attack: 0.5, release: 0.3 }); for (let t = md + 0.5; t < S("bed-dive") + 1; t += 0.7) heartbeat(ctx, sfx, t, 0.28);
    const dv = shot("bed-dive"), ck = dv.t0 + dv.L("n04") + 0.5, dk = dv.t0 + dv.L("n04") + 1.0;
    click(ctx, sfx, ck, 0.35); tone(ctx, sfx, { t: dk, dur: 0.9, freq: 220, glideTo: 40, gain: 0.14, release: 0.8 }); click(ctx, sfx, dk, 0.4);   // power down
    riser(ctx, sfx, dk + 0.6, b1 - dk - 0.6, 0.2); tone(ctx, sfx, { t: b1 - 1.0, dur: 1.2, freq: 60, glideTo: 140, type: "sawtooth", gain: 0.07, cutoff: 900, attack: 0.8 }); }   // an engine starting

  // ===== GAME 1: Getaway Heat
  { const g0 = S("gh-chase"), tr = S("gh-truck"), un = S("gh-under"), g1 = S("lm-desk");
    impact(ctx, sfx, g0, 0.55); whoosh(ctx, sfx, g0 - 0.25, 0.35, 0.3);
    drive(g0, un, 150, 50);
    const eng = ctx.createOscillator(); eng.type = "sawtooth"; const lp = filt(ctx, "lowpass", 700), eg = ctx.createGain(); eng.frequency.setValueAtTime(95, g0); eng.frequency.linearRampToValueAtTime(110, tr); eng.frequency.linearRampToValueAtTime(70, un + 0.4); eng.frequency.linearRampToValueAtTime(120, g1);
    eg.gain.setValueAtTime(0, g0); eg.gain.linearRampToValueAtTime(0.05, g0 + 0.2); eg.gain.setValueAtTime(0.05, g1 - 0.4); eg.gain.linearRampToValueAtTime(0, g1); eng.connect(lp); lp.connect(eg); eg.connect(sfx); eng.start(g0); eng.stop(g1 + 0.1);
    siren(g0, g1 - 0.2, 0.025); rain(g0, g1, 0.045);
    const tk = tr + 0.4; hiss(ctx, sfx, { t: tk, dur: 1.4, gain: 0.22, freq: 2600, freqTo: 1200, q: 4, attack: 0.05 }); impact(ctx, sfx, tk + 1.1, 0.45);   // the trailer swings, tyres screaming
    hiss(ctx, sfx, { t: tr + 1.6, dur: un - tr - 1.6, gain: 0.25, freq: 3000, freqTo: 1500, q: 5, attack: 0.1 });   // Jay's tyres
    // under it: everything slows and muffles, metal scraping, then out
    tone(ctx, music, { t: un, dur: g1 - un, freq: 36.7, gain: 0.25, attack: 0.05, release: 0.6 }); heartbeat(ctx, sfx, un + 0.1, 0.5);
    hiss(ctx, sfx, { t: un + 0.3, dur: 1.2, gain: 0.18, type: "highpass", freq: 3500, freqTo: 1800, attack: 0.05 }); for (let t = un + 0.3; t < un + 1.4; t += 0.05) tone(ctx, sfx, { t, dur: 0.04, freq: 2000 + rnd() * 3000, type: "square", gain: 0.012, release: 0.03 });
    whoosh(ctx, sfx, g1 - 0.45, 0.5, 0.3); }

  // ===== GAME 2: Lights Out Motel
  { const m0 = S("lm-desk"), m1 = S("rr-run"), kn = S("lm-knock") + 1.7, wr = S("lm-wrong"), sh = shot("lm-shutter"), slam = sh.t0 + sh.L("n12") + 0.15;
    rain(m0, m1, 0.075); hiss(ctx, sfx, { t: m0, dur: m1 - m0, gain: 0.03, type: "lowpass", freq: 400, attack: 1 }); thunder(m0 + 0.6, 0.4); thunder(wr + 0.4, 0.3);
    buzz(ctx, sfx, m0, m1 - m0, 0.012);   // the neon
    tone(ctx, music, { t: m0, dur: m1 - m0, freq: 46.25, gain: 0.12, attack: 2, release: 0.3 });
    [79, 83, 84, 78, 76, 79, 83, 86].forEach((m, i) => tone(ctx, music, { t: m0 + 0.5 + i * 0.62, dur: 1.4, freq: mtof(m), detune: -35 + i * 5, type: "triangle", gain: 0.035, attack: 0.004, release: 1.3 }));   // a music box, out of tune
    for (let i = 0; i < 3; i++) knock(kn + i * 0.24, 0.4, true);
    for (let t = S("lm-jay"); t < slam; t += 0.62) heartbeat(ctx, sfx, t, 0.3);
    for (const m of [62, 63]) tone(ctx, music, { t: S("lm-jay"), dur: slam - S("lm-jay"), freq: mtof(m), type: "sawtooth", gain: 0.016, attack: 3, release: 0.05, cutoff: 1800 });
    screech(ctx, big, wr + 0.3, 2.4, 0.06);
    metal(slam + 0.28, 0.75); screech(ctx, big, slam + 0.5, 1.6, 0.12); braam(ctx, big, slam + 0.5, 33, 0.18);
    const thud = sh.t0 + sh.L("n12") + 2.6; impact(ctx, sfx, thud, 0.7); metal(thud, 0.4);
    tone(ctx, sfx, { t: sh.t1 - 0.5, dur: 0.6, freq: 120, glideTo: 40, gain: 0.12, release: 0.5 }); click(ctx, sfx, sh.t1 - 0.5, 0.4); }   // the lamp dies

  // ===== GAME 3: Rooftop Rush
  { const r0 = S("rr-run"), gp = S("rr-gap"), lp = S("rr-leap"), ca = at("rr-catch", shot("rr-catch").L("n16") - 0.15), wn = S("rr-win"), r1 = S("bed-dawn");
    impact(ctx, sfx, r0, 0.5); whoosh(ctx, sfx, r0 - 0.3, 0.4, 0.3);
    drive(r0, lp, 160, 45, 1.1); rain(r0, r1, 0.06);
    for (const off of [1.1, 6.3, 13.2]) thunder(r0 + off, 0.4);
    const dr = ctx.createOscillator(); dr.type = "sawtooth"; dr.frequency.value = 180; const dl = filt(ctx, "bandpass", 1200, 2), dg = ctx.createGain(); dg.gain.setValueAtTime(0, r0); dg.gain.linearRampToValueAtTime(0.012, r0 + 1); dg.gain.setValueAtTime(0.012, ca); dg.gain.linearRampToValueAtTime(0, ca + 0.5);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 33; const lg = ctx.createGain(); lg.gain.value = 18; lfo.connect(lg); lg.connect(dr.frequency); dr.connect(dl); dl.connect(dg); dg.connect(sfx); dr.start(r0); dr.stop(ca + 0.6); lfo.start(r0); lfo.stop(ca + 0.6);   // the drone
    const cr = S("rr-crawl"); screech(ctx, big, cr + 0.2, 1.2, 0.1); for (let t = cr; t < lp; t += 0.19) tone(ctx, sfx, { t, dur: 0.05, freq: 160 + rnd() * 60, gain: 0.05, release: 0.04, pan: -0.3 });   // claws on the roof
    for (let t = r0 + 0.1; t < lp; t += 0.31) step(ctx, sfx, t, 0.07, true);
    riser(ctx, music, gp, lp - gp, 0.18);
    // the leap: the music drops out, wind, one slow heartbeat, a held high note
    hiss(ctx, sfx, { t: lp, dur: ca - lp, gain: 0.12, freq: 500, q: 0.6, attack: 0.3 }); tone(ctx, music, { t: lp, dur: ca - lp, freq: mtof(81), gain: 0.025, attack: 0.5, release: 0.1 }); heartbeat(ctx, sfx, lp + 0.5, 0.55); heartbeat(ctx, sfx, lp + 1.9, 0.55);
    impact(ctx, sfx, ca, 0.85); braam(ctx, big, ca, 38, 0.15); screech(ctx, big, ca + 0.3, 1.8, 0.07); tone(ctx, sfx, { t: ca + 0.3, dur: 2, freq: 400, glideTo: 60, type: "sawtooth", gain: 0.05, cutoff: 1500, release: 1.5 });   // it falls
    pad(ctx, music, wn + 1.1, r1 - wn - 0.9, [62, 66, 69, 74], { gain: 0.06, cutoff: 3000, attack: 0.05, release: 0.6 }); chime(ctx, big, wn + 1.2, 0.12); kick(ctx, music, wn + 1.1, 0.6); }

  // ===== home: birds, the phone, the headset, the door
  { const d0 = S("bed-dawn"), ph = S("bed-phone"), hs = S("bed-headset"), dr = S("bed-door"), c0 = S("cta");
    pad(ctx, music, d0 + 0.2, ph - d0 + 1, [60, 64, 67, 71], { gain: 0.035, cutoff: 1400, attack: 2, release: 1, type: "triangle" });
    for (let k = 0; k < 4; k++) bird(ctx, sfx, d0 + 0.6 + k * 1.1 + rnd() * 0.3);
    const p = shot("bed-phone"), ringEnd = ph + p.L("j04") - 0.2; for (let t = ph; t < ringEnd; t += 1.2) for (let r = 0; r < 2; r++) for (const f of [1350, 1700]) tone(ctx, sfx, { t: t + r * 0.12, dur: 0.1, freq: f, gain: 0.03, release: 0.05, pan: -0.4 });
    const p1 = line("p01"); tone(ctx, music, { t: p1.t + p1.edur - 0.4, dur: c0 - p1.t, freq: 36.7, gain: 0.2, attack: 0.3, release: 0.2 }); impact(ctx, big, p1.t + p1.edur - 0.3, 0.3);
    screech(ctx, big, hs + 0.2, Math.min(1.5, dr - hs - 0.2), 0.05); for (let t = hs; t < c0 - 0.3; t += 0.6) heartbeat(ctx, sfx, t, 0.32);
    const x2 = line("x02"), kk = x2.t + x2.edur + 0.15; for (let i = 0; i < 3; i++) knock(kk + i * 0.32, 0.6, false);
  }

  // ===== Pulsebox: bright and catchy, 118 bpm in C (the same ending as The 78th Game)
  { const t0 = S("cta"), beat = 60 / 118, end = dur;
    whoosh(ctx, sfx, t0 - 0.35, 0.4, 0.25); impact(ctx, sfx, t0, 0.5);
    const prog = [[48, 55, 60, 64], [43, 55, 59, 62], [45, 57, 60, 64], [41, 57, 60, 65]], mel = [76, 74, 72, 74, 76, 79, 76, 74, 72, 72, 74, 76, 74, 72, 69, 72];
    for (let i = 0, t = t0 + 0.05; t < end - 0.6; i++, t = t0 + 0.05 + i * beat) {
      const ch = prog[Math.floor(i / 4) % 4];
      kick(ctx, music, t, 0.55); if (i % 2 === 1) clap(ctx, music, t, 0.16); hat(ctx, music, t + beat / 2, 0.045);
      tone(ctx, music, { t, dur: beat * 0.45, freq: mtof(ch[0] - 12), type: "sawtooth", gain: 0.1, cutoff: 600, release: 0.08 }); tone(ctx, music, { t: t + beat / 2, dur: beat * 0.4, freq: mtof(ch[0]), type: "sawtooth", gain: 0.06, cutoff: 800, release: 0.08 });
      ch.slice(1).forEach((m) => tone(ctx, music, { t: t + 0.02, dur: beat * 0.85, freq: mtof(m), type: "sawtooth", gain: 0.022, attack: 0.05, release: 0.25, cutoff: 2200, detune: (m % 3) * 6 }));
      if (i >= 8 && i % 2 === 0) { const m = mel[(i / 2) % mel.length]; tone(ctx, music, { t, dur: beat * 1.5, freq: mtof(m), type: "square", gain: 0.025, cutoff: 3500, release: 0.4, pan: 0.15 }); tone(ctx, music, { t, dur: beat * 1.5, freq: mtof(m + 12), type: "sine", gain: 0.02, release: 0.4 }); }
    }
    const a = line("n20"), b = line("n21");
    a.words.forEach((w) => { if (/racing|horror|heists|sports/i.test(w.w)) tone(ctx, sfx, { t: w.t, dur: 0.18, freq: 880, glideTo: 1320, gain: 0.07, release: 0.1 }); });
    chime(ctx, big, b.t + 0.2, 0.09); { const w = b.words.find((x) => /^play/i.test(x.w)); if (w) chime(ctx, big, w.t, 0.07); }
    pad(ctx, music, end - 1.2, 1.6, [60, 64, 67, 72], { gain: 0.05, cutoff: 3000, attack: 0.02, release: 1.4 }); kick(ctx, music, end - 1.2, 0.6);
  }
}
