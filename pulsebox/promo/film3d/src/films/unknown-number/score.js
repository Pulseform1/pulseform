// Unknown Number: an eerie score and the sounds of a house at 3 AM. All synthesized.
import { mtof, rnd, filt, panner, tone, hiss, pad, piano, braam, impact, riser, whoosh, heartbeat, glitch, chime, click, screech, buzz, step, softClip } from "../../audio.js";

export function score({ ctx, music, sfx, big, tl, dur, sample }) {
  const lines = tl.lines, shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => lines.find((l) => l.id === id);
  const S = (id) => shot(id).t0, E = (id) => shot(id).t1, at = (id, lt) => S(id) + lt;
  const vibrate = (t, n = 3) => { for (let i = 0; i < n; i++) { tone(ctx, sfx, { t: t + i * 0.42, dur: 0.26, freq: 140, type: "square", gain: 0.06, cutoff: 260, release: 0.05 }); hiss(ctx, sfx, { t: t + i * 0.42, dur: 0.26, gain: 0.04, type: "bandpass", freq: 700, q: 3 }); } };
  const ding = (t, g = 0.08) => [1568, 1976, 2349].forEach((f, i) => tone(ctx, sfx, { t: t + i * 0.07, dur: 0.5, freq: f, gain: g, release: 0.45 }));
  const key = (t) => { hiss(ctx, sfx, { t, dur: 0.02, gain: 0.05, type: "highpass", freq: 3500 }); tone(ctx, sfx, { t, dur: 0.02, freq: 900 + rnd() * 400, type: "square", gain: 0.006, release: 0.015 }); };
  const breath = (t, d = 0.5, g = 0.08) => hiss(ctx, sfx, { t, dur: d, gain: g, type: "bandpass", freq: 900, q: 0.7, attack: d * 0.4 });
  const stinger = (t, g = 0.18) => { braam(ctx, big, t, 33, g); screech(ctx, big, t + 0.02, 1.8, 0.07); impact(ctx, sfx, t, 0.5); };
  const drone = (t0, t1, root, g = 0.1) => { if (t1 - t0 < 0.3) return; tone(ctx, music, { t: t0, dur: t1 - t0, freq: mtof(root), gain: g, attack: 2, release: 1 }); tone(ctx, music, { t: t0, dur: t1 - t0, freq: mtof(root) * 1.005, gain: g * 0.6, attack: 3, release: 1 });
    for (const m of [root + 24, root + 25, root + 31]) tone(ctx, music, { t: t0 + 1, dur: t1 - t0 - 1, freq: mtof(m), type: "sawtooth", gain: 0.006, attack: 4, release: 1, cutoff: 1600 }); };
  // ---- a struck pan (modal synthesis): inharmonic partials that ring and die away at their own rates, plus the click of the hit
  const PAN_MODES = [1, 1.594, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501, 4.06, 4.6, 5.2];
  const metal = (t, { f0 = 400, g = 0.5, decay = 1.2, bright = 1, pan = 0, room = 0.35 } = {}) => {
    const out = ctx.createGain(), lp = filt(ctx, "lowpass", 7000); out.connect(lp);   // (downstairs: a little dull)
    if (pan) { const p = panner(ctx, pan); lp.connect(p); p.connect(sfx); } else lp.connect(sfx);
    const send = ctx.createGain(); send.gain.value = room; lp.connect(send); send.connect(big);
    PAN_MODES.forEach((r, i) => {
      const f = f0 * r * (1 + (rnd() - 0.5) * 0.012); if (f > 15000) return;
      const a = g * (0.55 + rnd() * 0.6) / (1 + i * 0.3) * (i > 4 ? bright : 1), d = decay * (0.3 + 0.9 / (1 + i * 0.55)) * (0.8 + rnd() * 0.4);
      const o = ctx.createOscillator(); o.frequency.value = f; const e = ctx.createGain();
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(a, t + 0.0015); e.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(e); e.connect(out); o.start(t); o.stop(t + d + 0.05);
    });
    hiss(ctx, sfx, { t, dur: 0.035, gain: g * 0.8, type: "bandpass", freq: Math.min(9000, f0 * 7), q: 0.7, pan });   // the strike
  };
  const thud = (t, g) => { tone(ctx, sfx, { t, dur: 0.2, freq: 120, glideTo: 55, gain: g, release: 0.16 }); hiss(ctx, sfx, { t, dur: 0.07, gain: g * 0.5, type: "lowpass", freq: 1400 }); };
  // the pot rack lets go: pans knock together, the hooks rattle, four pans and a pot hit the tile and bounce, one spins down like a coin
  const crash = (t0) => {
    metal(t0, { f0: 520, g: 0.6, decay: 1.4, pan: 0.25 }); metal(t0 + 0.035, { f0: 760, g: 0.5, decay: 1.2, pan: 0.3 }); metal(t0 + 0.08, { f0: 1190, g: 0.35, decay: 0.8, pan: 0.2 });
    for (let i = 0; i < 7; i++) metal(t0 + 0.05 + i * 0.04 + rnd() * 0.02, { f0: 2300 + rnd() * 1600, g: 0.09, decay: 0.22, pan: 0.3, room: 0.2 });   // the hooks
    [[0.36, 330, 1.0, 1.9], [0.43, 196, 1.0, 2.6], [0.5, 610, 0.85, 1.5], [0.57, 880, 0.65, 1.1], [0.66, 455, 0.75, 1.6]].forEach(([d, f0, g, dec], n) => {
      let tt = t0 + d, gap = 0.19 + rnd() * 0.07, gg = g;
      for (let b = 0; b < 5; b++) { metal(tt, { f0: f0 * (1 + (rnd() - 0.5) * 0.04), g: gg, decay: dec * (b ? 0.55 : 1), bright: b ? 0.55 : 1, pan: 0.1 + n * 0.07 }); thud(tt, gg * 0.55); tt += gap; gap *= 0.6; gg *= 0.42; }
    });
    let tt = t0 + 1.05, gap = 0.15, i = 0;   // the spinning one
    for (; i < 60 && gap > 0.016; i++) { metal(tt, { f0: 640 * (1 + (rnd() - 0.5) * 0.03), g: 0.06 + 0.12 * gap / 0.15, decay: 0.28, bright: 0.45, pan: 0.2, room: 0.2 }); tt += gap; gap *= 0.94; }
    metal(tt + 0.02, { f0: 640, g: 0.4, decay: 1.8, pan: 0.2 }); thud(tt + 0.02, 0.25);
    return tt;
  };
  // a wooden stair or floorboard creaking under a slow step
  const creak = (t, d = 0.5, g = 0.05, f = 70) => {
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(f, t);
    for (let k = 1; k <= 5; k++) o.frequency.linearRampToValueAtTime(f * (0.65 + rnd() * 0.9), t + d * k / 5);
    const b1 = filt(ctx, "bandpass", 650 + rnd() * 450, 7), b2 = filt(ctx, "bandpass", 1500 + rnd() * 700, 10), e = ctx.createGain();
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + d * 0.25); e.gain.linearRampToValueAtTime(g * 0.6, t + d * 0.8); e.gain.linearRampToValueAtTime(0, t + d);
    o.connect(b1); o.connect(b2); b1.connect(e); b2.connect(e); e.connect(sfx); o.start(t); o.stop(t + d + 0.05);
  };
  const softStep = (t, g = 0.06) => { step(ctx, sfx, t, g, false); if (rnd() < 0.65) creak(t + 0.03, 0.35 + rnd() * 0.4, 0.025 + rnd() * 0.03, 55 + rnd() * 40); };
  const ringback = (t) => { for (const f of [440, 480]) tone(ctx, sfx, { t, dur: 1.6, freq: f, gain: 0.018, attack: 0.02, release: 0.05, pan: 0.35 }); };   // the call ringing in his ear
  const keys = (t0, t1) => { for (let t = t0; t < t1; t += 0.1 + rnd() * 0.07) key(t); };
  const sendSwoosh = (t) => tone(ctx, sfx, { t, dur: 0.18, freq: 1200, glideTo: 1700, gain: 0.05, release: 0.15 });
  // ===== 2:47 AM: the game on his speakers, the room, the buzz
  { const g1 = S("txt1"); buzz(ctx, sfx, 0, S("prep") + 2, 0.008); hiss(ctx, sfx, { t: 0, dur: S("prep") + 2, gain: 0.018, type: "lowpass", freq: 500, attack: 0.5 });
    for (const [t, m] of [[0.2, 57], [1.6, 60], [3.0, 56], [4.4, 59]]) tone(ctx, music, { t, dur: 2.4, freq: mtof(m), type: "triangle", gain: 0.03, attack: 0.3, release: 2 });   // the game's own music, small and far away
    vibrate(at("hook", 0.9)); drone(0, g1, 38, 0.08);
    for (let t = S("bed-play"); t < g1; t += 2.2) piano(ctx, music, t, [74, 73, 70, 74][Math.round(t) % 4], 0.03, 2.6); }
  // ===== the first text. A joke. He types back, puts the phone down and goes back to the game
  { const s = shot("txt1"), TA = s.t0 + s.L("j01") + 1.0, SENT = TA + 2.3 + 0.25; ding(s.t0 + 0.5); keys(TA, TA + 2.3); sendSwoosh(SENT);
    drone(s.t0, S("txt2"), 36, 0.07);
    const b = shot("break1"); hiss(ctx, sfx, { t: b.t0 + 0.3, dur: 0.06, gain: 0.08, type: "lowpass", freq: 1500 });   // the phone face down on the desk
    for (let t = b.t0 + 1.4; t < b.t0 + b.L("n02") - 0.5; t += 0.25 + rnd() * 0.5) click(ctx, sfx, t, 0.05);   // mouse, keyboard
    for (let t = b.t0 + 1.0; t < S("txt2"); t += 2.2) piano(ctx, music, t, [74, 73, 70, 74][Math.round(t) % 4], 0.03, 2.6); }
  // ===== 2:52: it buzzes on the desk. His street.
  { const s = shot("txt2"), bz = s.t0 + 0.25; vibrate(bz, 2); for (let i = 0; i < 2; i++) hiss(ctx, sfx, { t: bz + i * 0.42, dur: 0.26, gain: 0.05, type: "bandpass", freq: 260, q: 2 });   // rattling on the wood
    ding(bz + 0.15); stinger(s.t0 + 1.3, 0.1); drone(s.t0, E("wait"), 35, 0.1);
    for (let t = s.t0 + s.L("j02") + 1.0; t < E("txt2"); t += 0.85) heartbeat(ctx, sfx, t, 0.2); }
  // ===== ten minutes: he texts again, checks the street, calls (it rings and rings), waits
  { const w = shot("wait"), W2 = w.t0 + 3.1, W3 = w.t0 + 5.5, W4 = w.t0 + w.L("n03") - 0.4;
    keys(w.t0 + 0.1, w.t0 + 1.3); sendSwoosh(w.t0 + 1.45);
    for (let t = w.t0 + 2.2; t < W2; t += 0.36) step(ctx, sfx, t, 0.07, false);
    tone(ctx, sfx, { t: W2, dur: 0.25, freq: 600, glideTo: 300, type: "sawtooth", gain: 0.02, cutoff: 1500 });   // a blind slat
    hiss(ctx, sfx, { t: W2, dur: W3 - W2 + 0.3, gain: 0.07, freq: 400, q: 0.5, attack: 0.4 });   // the wind outside
    for (let t = W3 + 0.45; t < W4 - 0.8; t += 3.1) ringback(t);
    for (let t = W3, k = 0; t < W4; t += 0.75, k++) heartbeat(ctx, sfx, t, 0.16 + k * 0.012);
    for (let t = W4, k = 0; t < w.t1; t += 0.5, k++) tone(ctx, sfx, { t, dur: 0.04, freq: k % 2 ? 2000 : 1700, type: "square", gain: 0.012, release: 0.03, pan: -0.4 });   // the clock
    for (let t = W4; t < w.t1; t += 0.6) breath(t, 0.4, 0.05); }
  // ===== 3:02: his porch
  { const s = shot("txt3"), bz = s.t0 + s.L("n04") + 0.4, grab = s.t0 + s.L("n04") + 2.2; vibrate(bz, 3); ding(bz + 0.15); stinger(grab + 0.25, 0.22); drone(s.t0, E("panic"), 33, 0.13);
    for (let t = grab; t < E("prep"); t += 0.45) heartbeat(ctx, sfx, t, 0.32); for (let t = grab + 0.6; t < E("panic"); t += 0.7) breath(t, 0.4, 0.07); }
  // ===== barricading
  { const p = shot("prep"), lockAt = p.t0 + 3.1, offAt = p.t0 + 4.05, grabAt = p.t0 + 4.95;   // matches the shot: chair, lock, lights, bat
    hiss(ctx, sfx, { t: p.t0 + 0.1, dur: 1.35, gain: 0.12, freq: 900, freqTo: 600, q: 2, attack: 0.05 }); impact(ctx, sfx, p.t0 + 1.45, 0.25);   // the chair across the floor, against the door
    click(ctx, sfx, lockAt, 0.5); tone(ctx, sfx, { t: lockAt, dur: 0.08, freq: 800, glideTo: 500, type: "square", gain: 0.02, release: 0.05 });
    click(ctx, sfx, offAt, 0.45); tone(ctx, sfx, { t: offAt, dur: 0.7, freq: 220, glideTo: 40, gain: 0.1, release: 0.6 });   // monitor off
    hiss(ctx, sfx, { t: grabAt, dur: 0.2, gain: 0.08, type: "lowpass", freq: 900 }); }
  // ===== 3:04: in the house. Silence. Then the pans, downstairs, all at once.
  { const s = shot("txt4"), clang = s.t0 + 2.6; ding(s.t0 + 0.5, 0.05); drone(s.t0, clang - 0.05, 32, 0.08); drone(clang + 1.5, S("kitchen") + 4, 32, 0.1);
    sample("pans", clang, { gain: 1.35, pan: 0.15 }); impact(ctx, sfx, clang + 0.33, 0.28);   // recorded pots and pans (CC0, FSD50K), mixed in public/films/unknown-number/sfx/pans.wav
    breath(clang + 0.15, 0.35, 0.12); for (let t = clang + 0.6; t < S("kitchen"); t += 0.38) heartbeat(ctx, sfx, t, 0.36); }
  // ===== down to the kitchen: slowly, one creaking stair at a time
  { const k = shot("kitchen"), run = k.t0 + k.L("j05") - 0.3; click(ctx, sfx, k.t0 + 0.05, 0.15);
    for (let t = k.t0 + 0.4; t < run - 0.2; t += 0.92) softStep(t, 0.06);
    for (let t = k.t0 + 0.2; t < run; t += 1.5) breath(t, 0.7, 0.05);
    for (let t = k.t0; t < run; t += 0.62) heartbeat(ctx, sfx, t, 0.22);
    hiss(ctx, sfx, { t: run, dur: k.t1 - run + 2, gain: 0.02, type: "lowpass", freq: 300, attack: 0.5 }); buzz(ctx, sfx, run, k.t1 - run + 2, 0.004);   // the fridge
    for (let i = 0; i < 6; i++) metal(run + 0.3 + i * 0.4 * (1 + i * 0.2), { f0: 640, g: 0.03 * (1 - i / 6), decay: 0.3, bright: 0.4, pan: -0.2, room: 0.1 });   // the last pan settling
    for (let t = run; t < E("txt5"); t += 0.6) heartbeat(ctx, sfx, t, 0.28); }
  // ===== 3:05: in his room
  { const s = shot("txt5"); vibrate(s.t0 + 0.4, 2); ding(s.t0 + 0.55); stinger(s.t0 + 0.7, 0.2); }
  // ===== slowly back up; the door; the flashlight; he shuts it, breathes... turns around. The jump. The freeze.
  { const f = shot("freeze"), up = f.t0 + 6.5, J9 = f.t0 + f.L("j09"), E0 = J9 + line("j09").edur, P = E0 + 2.1, P2 = P + 0.52, J3 = P + 0.96, F = J3 + 0.36;   // (matches SCARE in shots.js)
    for (let t = f.t0 + 0.3; t < up - 0.3; t += 0.98) softStep(t, 0.055);
    for (let t = f.t0 + 0.1; t < up; t += 1.6) breath(t, 0.7, 0.045);
    creak(up + 0.05, 1.4, 0.06, 48);   // the door swinging in
    for (let t = up + 0.7; t < up + 1.5; t += 0.5) softStep(t, 0.05);
    breath(up + 1.6, 0.8, 0.05); creak(up + 3.1, 0.6, 0.04, 52); click(ctx, sfx, up + 4.25, 0.12); tone(ctx, sfx, { t: up + 4.25, dur: 0.05, freq: 700, glideTo: 450, type: "square", gain: 0.012, release: 0.04 });   // eased shut, the latch
    drone(f.t0, up + 4.3, 30, 0.08);
    tone(ctx, music, { t: up + 4.4, dur: E0 + 0.4 - up - 4.4, freq: 2600, glideTo: 2900, gain: 0.004, attack: 1.5, release: 0.02 });   // a thin ring... and then nothing at all
    // something breathes in, slowly, right behind him
    hiss(ctx, sfx, { t: E0 + 0.45, dur: 1.3, gain: 0.09, type: "bandpass", freq: 380, freqTo: 700, q: 1.6, attack: 1.0, pan: 0.35 }); hiss(ctx, big, { t: E0 + 0.45, dur: 1.3, gain: 0.03, type: "bandpass", freq: 900, freqTo: 1400, q: 2, attack: 1.0 });
    // the flashlight flickers: on (it's in the corner), off, on (closer), off... on
    for (const t of [P, P + 0.38, P2, P + 0.86, J3]) { click(ctx, sfx, t - 0.01, 0.12); hiss(ctx, sfx, { t: t - 0.01, dur: 0.03, gain: 0.05, type: "highpass", freq: 5000 }); }
    tone(ctx, sfx, { t: P, dur: 1.0, freq: 52, glideTo: 34, gain: 0.35, release: 0.9 }); for (const m of [70, 71, 77]) tone(ctx, big, { t: P, dur: 0.5, freq: mtof(m), type: "sawtooth", gain: 0.02, release: 0.4, cutoff: 3000 });
    impact(ctx, sfx, P2, 0.6); for (const m of [76, 77, 82, 83]) tone(ctx, big, { t: P2, dur: 0.45, freq: mtof(m), glideTo: mtof(m + 0.5), type: "sawtooth", gain: 0.035, release: 0.35, cutoff: 5000 });
    for (let i = 0; i < 4; i++) hiss(ctx, sfx, { t: P2 + 0.02 + i * 0.03 + rnd() * 0.015, dur: 0.012, gain: 0.3, type: "highpass", freq: 1800 });   // its neck cracking as it tilts
    // the lunge: everything at once, and it shrieks
    impact(ctx, big, J3, 1.0); impact(ctx, sfx, J3, 0.9); braam(ctx, big, J3, 33, 0.45); screech(ctx, big, J3, 1.2, 0.4);
    hiss(ctx, sfx, { t: J3, dur: 0.45, gain: 0.6, type: "highpass", freq: 600, release: 0.3 });
    for (const m of [83, 84, 85, 89, 90, 95]) tone(ctx, big, { t: J3, dur: 0.75, freq: mtof(m), glideTo: mtof(m + 0.8), type: "sawtooth", gain: 0.045, attack: 0.004, release: 0.3, cutoff: 7000 });
    tone(ctx, sfx, { t: J3, dur: 1.4, freq: 62, glideTo: 22, gain: 0.6, release: 1.2 });
    { const out = ctx.createGain(), ws = ctx.createWaveShaper(); ws.curve = softClip(4); out.gain.setValueAtTime(0, J3); out.gain.linearRampToValueAtTime(0.22, J3 + 0.03); out.gain.setValueAtTime(0.22, J3 + 0.5); out.gain.exponentialRampToValueAtTime(0.001, J3 + 1.1);
      const f1 = filt(ctx, "bandpass", 850, 3), f2 = filt(ctx, "bandpass", 1350, 4), f3 = filt(ctx, "bandpass", 2700, 5); ws.connect(f1); ws.connect(f2); ws.connect(f3); f1.connect(out); f2.connect(out); f3.connect(out); out.connect(sfx); out.connect(big);
      for (let i = 0; i < 6; i++) { const o = ctx.createOscillator(); o.type = "sawtooth"; const f0 = 330 * (1 + i * 0.017); o.frequency.setValueAtTime(f0, J3); o.frequency.exponentialRampToValueAtTime(f0 * 2.6, J3 + 0.5); o.frequency.exponentialRampToValueAtTime(f0 * 2.2, J3 + 1.1);
        const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = 21 + i * 3; vg.gain.value = 45; v.connect(vg); vg.connect(o.detune); o.connect(ws); o.start(J3); o.stop(J3 + 1.15); v.start(J3); v.stop(J3 + 1.15); }
      hiss(ctx, sfx, { t: J3, dur: 1.0, gain: 0.12, type: "bandpass", freq: 2400, q: 1.2, release: 0.4 }); }   // its shriek: a torn throat
    if (tl.sfx.includes("scream")) sample("scream", J3 + 0.04, { gain: 0.9, bus: sfx });   // and Jay
    // the freeze: a tape stop, then a thin high ring over a low hum
    tone(ctx, sfx, { t: F - 0.05, dur: 0.6, freq: 300, glideTo: 30, type: "sawtooth", gain: 0.12, cutoff: 1200, release: 0.5 }); impact(ctx, big, F, 0.3);
    tone(ctx, music, { t: F + 0.3, dur: dur - F, freq: 3520, gain: 0.006, attack: 1.5, release: 1 }); drone(F + 0.2, dur, 29, 0.1);
    [69, 68, 65, 64, 69, 68, 65, 61].forEach((m, i) => piano(ctx, music, line("n09").t - 1.5 + i * 1.3, m, 0.045, 3)); }
  music.gain.setTargetAtTime(0, dur - 0.4, 0.15);
}
