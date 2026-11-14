  /* ---------- 80 audio: every sound is synthesised, and placed ----------
     A sound made by the rival is quieter with distance, panned left or right by where it is relative to your facing, and
     muffled when a wall is in the way, so footsteps and gunfire tell you where they are. Your own sounds play dead centre.
     Everything goes through the kit's master gain, so the kit's mute switch and pause still work. */
  const canHear = () => typeof K !== 'undefined' && K.ac && K.master && !K.save.mute && !K.bot;
  let noiseBuf = null;
  // where to plug a sound in: returns an audio node that leads to the speakers, shaped for a source at fighter f (or your own)
  function outFor(f, vol = 1) {
    const ac = K.ac, g = ac.createGain(); let v = vol, pan = 0, muffle = false;
    if (M && f && f !== me()) {
      const P = me(), dx = f.x - P.x, dz = f.z - P.z, d = Math.hypot(dx, dz) || .01;
      v *= Math.pow(cl(1 - d / 55, .05, 1), 1.4); pan = cl((dx * Math.cos(P.yaw) - dz * Math.sin(P.yaw)) / d, -1, 1) * .85;
      muffle = los(P.x, eyeY(P), P.z, f.x, f.y + 1.2, f.z, false) < d - .6; if (muffle) v *= .6;
    }
    g.gain.value = v; let head = g;
    if (muffle) { const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 1100; lpf.connect(g); head = lpf; }
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p).connect(K.master); } else g.connect(K.master);
    return head;
  }
  function tone(out, f, d, type = 'sine', v = .1, slide = 0, delay = 0) {
    const ac = K.ac, t = ac.currentTime + delay, o = ac.createOscillator(), a = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(25, f + slide), t + d);
    a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(a).connect(out); o.start(t); o.stop(t + d + .02);
  }
  // a burst of noise through a filter: kind is 'lowpass', 'highpass' or 'bandpass'
  function hiss(out, d, v, kind, freq, delay = 0, q = .7) {
    const ac = K.ac, t = ac.currentTime + delay;
    if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), a = ac.createGain(); s.buffer = noiseBuf; fl.type = kind; fl.frequency.value = freq; fl.Q.value = q;
    a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl).connect(a).connect(out); s.start(t, Math.random() * .5, d + .05);
  }
  // gunfire by class: [crack length, crack pitch, thump pitch, tail length, loudness]
  const SHOT = { Sidearm: [.08, 2400, 170, .12, .8], SMG: [.06, 2000, 150, .1, .7], Shotgun: [.16, 1300, 75, .3, 1.15], Rifle: [.1, 1700, 110, .22, 1], Sniper: [.2, 1200, 60, .5, 1.3], Heavy: [.1, 1400, 95, .22, 1] };
  on('shot', (f, S, first) => {
    if (!first || !canHear()) return; const G = gun(f), out = outFor(f, f === me() ? .55 : 1);
    if (G.sil) { hiss(out, .06, .22, 'lowpass', 1500); tone(out, 240, .04, 'square', .04, -90); return; }
    const [d, cf, tf, tail, v] = SHOT[G.cat] || SHOT.Rifle, big = G.k === 'hammer' || G.k === 'paladin' || G.k === 'stub' ? 1.25 : 1;
    hiss(out, d * big, .5 * v, 'bandpass', cf, 0, .6); hiss(out, tail * big, .16 * v, 'lowpass', 900, .02); tone(out, tf, .11 * big, 'sine', .5 * v, -tf * .55);
  });
  const cue = (name, fn) => on(name, (a, b, c, d) => { if (canHear()) fn(a, b, c, d); });
  cue('dry', f => tone(outFor(f), 320, .03, 'square', .05));
  cue('reload', f => { const o = outFor(f, f === me() ? .7 : 1); tone(o, 520, .04, 'square', .06, 0, .15); hiss(o, .05, .1, 'highpass', 2500, .15); tone(o, 380, .05, 'square', .07, 0, gun(f).rel * .62); hiss(o, .06, .12, 'highpass', 2000, gun(f).rel * .88); });
  cue('swap', f => { const o = outFor(f, f === me() ? .6 : .8); hiss(o, .05, .1, 'highpass', 3000); tone(o, 700, .03, 'square', .03); });
  cue('melee', (f, heavy, S) => { const o = outFor(f); hiss(o, heavy ? .14 : .09, .16, 'bandpass', heavy ? 1500 : 2800, 0, 1.2); if (S) { tone(o, 180, .09, 'sine', .25, -90, .02); hiss(o, .05, .2, 'lowpass', 900, .02); } });
  cue('step', f => { if (f === me()) hiss(outFor(null), .04, .035, 'lowpass', 500); else { const o = outFor(f); hiss(o, .06, .32, 'lowpass', 420); tone(o, 95, .05, 'sine', .14, -30); } });
  cue('jump', f => { if (f !== me()) hiss(outFor(f), .06, .12, 'lowpass', 700); });
  cue('land', f => { const o = outFor(f, f === me() ? .5 : 1); hiss(o, .09, .3, 'lowpass', 360); tone(o, 70, .08, 'sine', .25, -20); });
  cue('hurt', (v, by, dmg, head) => {
    if (by === me()) { const o = outFor(null); if (head) { tone(o, 2300, .05, 'square', .07); tone(o, 3100, .06, 'square', .06, 0, .04); } else tone(o, 1500, .04, 'square', .06); }
    if (v === me()) { const o = outFor(null); tone(o, 140, .12, 'sine', .35, -70); hiss(o, .07, .18, 'lowpass', 700); }
  });
  cue('kill', (v, by) => { const o = outFor(null); if (by === me()) { tone(o, 660, .09, 'triangle', .14); tone(o, 990, .16, 'triangle', .14, 0, .08); } else if (v === me()) tone(o, 200, .5, 'sawtooth', .1, -130); });
  cue('ability', (f, k) => {
    const key = f.op + k, o = outFor(f);
    if (key === 'vexq') tone(o, 500, .16, 'sine', .14, 1100); else if (key === 'vexe') hiss(o, .5, .2, 'lowpass', 500);
    else if (key === 'irisq') { tone(o, 1300, .25, 'sine', .12, -700); tone(o, 1300, .25, 'sine', .08, -700, .18); } else if (key === 'irise') hiss(o, .08, .12, 'highpass', 1800);
    else if (key === 'bastionq') { tone(o, 80, .35, 'sawtooth', .16, 90); hiss(o, .3, .14, 'lowpass', 600); } else tone(o, 660, .2, 'triangle', .1, 330);
  });
  cue('flarePop', fl => { const o = outFor({ x: fl.x, y: fl.y - 1, z: fl.z }); hiss(o, .3, .4, 'highpass', 2500); tone(o, 1800, .2, 'sine', .15, 2000); });
  cue('plantStart', f => tone(outFor(f), 600, .1, 'square', .08)); cue('defuseStart', f => { const o = outFor(f); tone(o, 800, .08, 'square', .09); tone(o, 600, .08, 'square', .09, 0, .1); });
  cue('planted', () => { const o = outFor(null); [392, 554, 784].forEach((q, i) => tone(o, q, .2, 'triangle', .12, 0, i * .09)); });
  cue('defused', () => { const o = outFor(null); [523, 659, 784, 1047].forEach((q, i) => tone(o, q, .18, 'triangle', .12, 0, i * .07)); });
  cue('beep', () => { if (M && M.planted) tone(outFor({ x: M.planted.x, y: 0, z: M.planted.z }, 1.4), 1850, .06, 'square', .09); });
  cue('boom', (x, z) => { const o = outFor({ x, y: 0, z }, 1.6); hiss(o, 1.1, .7, 'lowpass', 500); tone(o, 60, .9, 'sine', .7, -35); hiss(o, .25, .4, 'bandpass', 1500); });
  cue('buy', (f, ok) => { if (f === me()) tone(outFor(null), ok ? 990 : 170, ok ? .06 : .12, 'square', .06); });
  cue('round', () => tone(outFor(null), 440, .16, 'triangle', .09));
  cue('live', () => { const o = outFor(null); tone(o, 660, .1, 'triangle', .1); tone(o, 880, .2, 'triangle', .1, 0, .1); });
  cue('end', wi => { const o = outFor(null); if (wi === 0) [523, 659, 784].forEach((q, i) => tone(o, q, .2, 'triangle', .11, 0, i * .08)); else tone(o, 280, .5, 'triangle', .1, -130); });
  cue('over', won => { const o = outFor(null); (won ? [523, 659, 784, 1047, 1319] : [392, 330, 262]).forEach((q, i) => tone(o, q, .3, 'triangle', .12, 0, .4 + i * .12)); });
  const click = (ok = true) => { if (canHear()) tone(outFor(null), ok ? 880 : 200, .04, 'square', .04); };
