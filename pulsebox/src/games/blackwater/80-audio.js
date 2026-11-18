  /* ---------- 80 audio: all synthesised. Beds of sea, wind and rain under everything; events on top; thunder arrives
     after its flash, by distance; underwater a low-pass filter closes over the whole mix. ---------- */
  const AU = { on: false };
  const canHear = () => typeof K !== 'undefined' && K.ac && K.master && !K.save.mute;
  function audioInit() {
    if (AU.on || !canHear()) return; const ac = K.ac; AU.on = true;
    const buf = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate), ch = buf.getChannelData(0); let b = 0; for (let i = 0; i < ch.length; i++) { const w = Math.random() * 2 - 1; b = (b + .02 * w) / 1.02; ch[i] = w * .5 + b * 3; } AU.buf = buf;
    AU.lp = ac.createBiquadFilter(); AU.lp.type = 'lowpass'; AU.lp.frequency.value = 18000; AU.vol = ac.createGain(); AU.vol.gain.value = CFG.vol; AU.vol.connect(AU.lp).connect(K.master);
    const bed = (type, f, q) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = Math.random(); const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ac.createGain(); g.gain.value = 0; s.connect(fl).connect(g).connect(AU.vol); s.start(); return { fl, g }; };
    AU.sea = bed('lowpass', 420, .5); AU.surf = bed('bandpass', 900, .6); AU.wind = bed('bandpass', 700, 1.4); AU.rain = bed('highpass', 2800, .4); AU.fire = bed('bandpass', 1800, .8);
  }
  function hit(dur, vol, type, f, q = .8, delay = 0, f2) {   // a filtered burst of noise
    if (!AU.on) return; const ac = K.ac, t = ac.currentTime + delay, s = ac.createBufferSource(); s.buffer = AU.buf; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(fl).connect(g).connect(AU.vol); s.start(t, Math.random() * 2, dur + .1);
  }
  function tone(f, dur, vol, type = 'sine', f2, delay = 0, attack = .005) {
    if (!AU.on) return; const ac = K.ac, t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(AU.vol); o.start(t); o.stop(t + dur + .05);
  }
  function audioFrame(dt, near) {
    if (!canHear()) return; audioInit(); if (!AU.on) return; const ac = K.ac, t = ac.currentTime;
    const swell = .5 + .5 * Math.sin(S.t * .45) * Math.sin(S.t * .17 + 1), under = !!(X && X.underOn && X.camera.position.y < waterH(X.camera.position.x, X.camera.position.z) - .1);
    AU.vol.gain.setTargetAtTime(CFG.vol, t, .1);
    AU.lp.frequency.setTargetAtTime(under ? 420 : 18000, t, .08);
    AU.sea.g.gain.setTargetAtTime(.1 + S.sea * .35 + swell * .08, t, .3); AU.sea.fl.frequency.setTargetAtTime(300 + S.sea * 500, t, .5);
    AU.surf.g.gain.setTargetAtTime((.02 + S.sea * .08) * (.4 + swell), t, .2);
    AU.wind.g.gain.setTargetAtTime(cl((S.wind - 3) / 18, 0, 1) * .22, t, .4); AU.wind.fl.frequency.setTargetAtTime(500 + S.wind * 45 + Math.sin(S.t * 1.3) * 120, t, .3);
    AU.rain.g.gain.setTargetAtTime(S.rain * .2 * (under ? .2 : 1), t, .4);
    AU.fire.g.gain.setTargetAtTime((near ? .05 : 0) + (PL.torch ? .025 : 0) + (Math.random() < .1 ? .03 : 0), t, .05);
    if (Math.random() < dt * (.15 + S.sea * .5)) tone(rnd(90, 160), .5, .03 + S.sea * .03, 'triangle', rnd(70, 120), 0, .15);   // the raft creaks
    if (HK.reel && HK.state === 'water' && Math.random() < dt * 14) tone(1800, .02, .02, 'square');
    if (FS.reel && FS.state === 'fight' && Math.random() < dt * 18) tone(2200 - FS.tension * 900, .02, .02, 'square');
  }
  on('cast', () => hit(.35, .18, 'bandpass', 900, 1.5, 0, 2400));
  on('splash', (x, z, big) => { const d = X ? Math.hypot(x - X.camera.position.x, z - X.camera.position.z) : 10, v = Math.min(.35, (big ? 4 : .5) / (1 + d * .15)); hit(big ? 1.6 : .35, v, 'lowpass', big ? 500 : 1400, .7, d / 343); });
  on('snag', () => tone(300, .08, .06, 'triangle'));
  on('drink', () => { for (let i = 0; i < 3; i++) hit(.08, .07, 'bandpass', 500 + i * 120, 2, i * .14); });
  on('cache', () => { for (let i = 0; i < 4; i++) tone(300 + i * 60, .1, .03, 'sine', 120, i * .12); });
  on('pickup', () => { hit(.12, .12, 'lowpass', 900); tone(660, .12, .05, 'triangle', 0, .05); tone(990, .16, .04, 'triangle', 0, .12); });
  on('bite', () => { hit(.15, .2, 'lowpass', 700); });
  on('hooked', () => hit(.4, .2, 'lowpass', 600));
  on('catch', () => { hit(.4, .2, 'lowpass', 900); [523, 659, 784].forEach((f, i) => tone(f, .25, .06, 'triangle', 0, i * .09)); });
  on('snap', () => { tone(2400, .05, .1, 'square'); hit(.2, .12, 'highpass', 3000); });
  on('eat', () => { for (let i = 0; i < 3; i++) hit(.08, .1, 'bandpass', 1800, 2, i * .12); });
  on('build', () => { for (let i = 0; i < 3; i++) { hit(.06, .22, 'bandpass', 900, 3, i * .16); tone(160, .08, .1, 'square', 90, i * .16); } });
  on('repair', () => { hit(.06, .2, 'bandpass', 1000, 3); hit(.06, .2, 'bandpass', 1100, 3, .18); });
  on('hurt', (c, amt, why) => { if (why === 'shark' && Math.random() < .3) hit(.25, .2, 'bandpass', 500, 2); });
  on('break', () => { hit(.5, .45, 'highpass', 1500); tone(90, .6, .3, 'sine', 40); hit(1.2, .2, 'lowpass', 400, .7, .1); });
  on('latch', () => { hit(.4, .4, 'bandpass', 400, 2); tone(70, .5, .3, 'sine', 40); });
  on('sharkHit', () => { hit(.15, .3, 'bandpass', 700, 2); tone(140, .2, .2, 'square', 70); });
  on('thrust', () => hit(.18, .1, 'bandpass', 1200, 1, 0, 400));
  on('bitten', () => { hit(.3, .5, 'bandpass', 500, 2); tone(60, .4, .3, 'sine', 30); });
  on('thunder', dist => { const v = cl(1.4 - dist / 6000, .12, 1); if (dist < 1800) hit(.4, v * .6, 'highpass', 1200); hit(3.5 + dist / 3000, v * .7, 'lowpass', 160 + 400 * (1 - dist / 7000), .6); tone(38, 3, v * .25, 'sine', 28, .1, .4); });
  on('fall', () => hit(1, .5, 'lowpass', 600));
  on('climb', () => hit(.6, .25, 'lowpass', 900));
  on('wash', A => { hit(2.4, .5 * A / 6, 'lowpass', 1100); hit(1.5, .3, 'highpass', 2000, .5, .2); });
  on('torch', lit => lit ? hit(.6, .2, 'bandpass', 1500, .8, 0, 600) : hit(.4, .2, 'highpass', 3000));
  on('fire', () => hit(.8, .2, 'bandpass', 1400, .8, 0, 500));
  on('cooked', () => tone(880, .3, .05, 'triangle'));
  on('craft', () => { hit(.1, .15, 'bandpass', 1200, 2); hit(.1, .15, 'bandpass', 900, 2, .15); });
  on('rumble', () => { tone(30, 9, .5, 'sine', 24, 0, 3); hit(9, .4, 'lowpass', 90, .7); });
  on('cthulhu', p => { if (p === 'rise') { tone(36, 14, .45, 'sawtooth', 26, 0, 4); hit(14, .3, 'lowpass', 120); } if (p === 'tower') { tone(62, 4, .35, 'sawtooth', 38, 0, 1.2); tone(93, 4, .2, 'sawtooth', 55, .2, 1.2); hit(4, .25, 'bandpass', 300, 1.5); } if (p === 'sink') hit(10, .4, 'lowpass', 200); });
  on('pool', () => hit(4, .12, 'lowpass', 300));
