  /* ---------- 60 audio: all synthesized; footsteps, impacts and fly-bys come from where they happen (HRTF panning) ---------- */
  const AU = { ready: false, out: null, buf: {}, birdT: 1, creak: 0, wind: null, rustle: null, amb: null, peckT: 9, gust: 0 };
  function audioInit() {
    const ac = K.audio && K.audio(); if (!ac || AU.ready) return; AU.ready = true; AU.ac = ac;
    AU.out = ac.createGain(); AU.out.gain.value = CFG.vol; AU.out.connect(K.master);
    const mk = (secs, fn) => { const n = Math.floor(ac.sampleRate * secs), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); fn(d, n); return b; };
    AU.buf.white = mk(2, (d, n) => { for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; });
    AU.buf.brown = mk(3, (d, n) => { let l = 0; for (let i = 0; i < n; i++) { l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } });
    // the wood around you, on its own volume (Settings: forest sounds): a sunny day, birds singing in the trees. No water
    // sound and no reverb: both cost a lot of audio work every second for little you'd miss
    AU.amb = ac.createGain(); AU.amb.gain.value = CFG.amb == null ? 1 : CFG.amb; AU.amb.connect(AU.out);
    AU.birds = ac.createGain(); AU.birds.gain.value = 1; AU.birds.connect(AU.amb);
  }
  const t0 = () => AU.ac.currentTime;
  function at(p, ref = 4, dest, cheap) { const ac = AU.ac, pn = ac.createPanner(); Object.assign(pn, { panningModel: cheap || dest === AU.birds ? 'equalpower' : 'HRTF', distanceModel: 'inverse', refDistance: ref, maxDistance: 90, rolloffFactor: 1.2 }); if (pn.positionX) { pn.positionX.value = p[0]; pn.positionY.value = p[1]; pn.positionZ.value = p[2]; } else pn.setPosition(p[0], p[1], p[2]); pn.connect(dest || AU.out); return pn; }
  function nz(dest, dur, f, q, type, g, delay = 0, sweepTo) { const ac = AU.ac, s = ac.createBufferSource(); s.buffer = AU.buf.white; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t0() + delay); if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, t0() + delay + dur); fl.Q.value = q; const a = ac.createGain(); a.gain.setValueAtTime(.0001, t0() + delay); a.gain.exponentialRampToValueAtTime(g, t0() + delay + .005); a.gain.exponentialRampToValueAtTime(.0001, t0() + delay + dur); s.connect(fl).connect(a).connect(dest); s.start(t0() + delay, Math.random() * 1.5); s.stop(t0() + delay + dur + .05); }
  function tone(dest, f, dur, type, g, delay = 0, to) { const ac = AU.ac, o = ac.createOscillator(), a = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0() + delay); if (to) o.frequency.exponentialRampToValueAtTime(to, t0() + delay + dur); a.gain.setValueAtTime(.0001, t0() + delay); a.gain.exponentialRampToValueAtTime(g, t0() + delay + .004); a.gain.exponentialRampToValueAtTime(.0001, t0() + delay + dur); o.connect(a).connect(dest); o.start(t0() + delay); o.stop(t0() + delay + dur + .05); }
  const S = {
    nock: () => { nz(AU.out, .05, 2400, 2, 'bandpass', .05); tone(AU.out, 900, .03, 'sine', .03); },
    creak: d => { nz(AU.out, .07, 500 + d * 900, 9, 'bandpass', .03 + d * .045); },
    full: () => { tone(AU.out, 1750, .05, 'sine', .07); tone(AU.out, 2600, .04, 'sine', .03, .015); },
    release: pw => { tone(AU.out, 150 + pw * 90, .28, 'triangle', .22 + pw * .1, 0, 120); nz(AU.out, .09, 400, 1, 'lowpass', .25); nz(AU.out, .3, 3500, 1.2, 'bandpass', .05 + pw * .07, .02, 900); },
    cancel: () => nz(AU.out, .12, 700, 2, 'bandpass', .05),
    impact: (p, mat, loud = 1) => { const d = at(p, 5);
      if (mat === 'wood') { tone(d, 170, .14, 'sine', .5 * loud, 0, 85); nz(d, .05, 1400, 2, 'bandpass', .35 * loud); }
      else if (mat === 'stone') { nz(d, .09, 2800, 3, 'bandpass', .55 * loud); tone(d, 2300, .06, 'square', .06 * loud); tone(d, 3600, .12, 'sine', .05 * loud); }
      else if (mat === 'water') { nz(d, .25, 1400, 1.5, 'bandpass', .4 * loud, 0, 500); tone(d, 600, .12, 'sine', .08, .02, 1400); }
      else if (mat === 'body') { nz(d, .12, 380, 1, 'lowpass', .7 * loud); tone(d, 115, .12, 'sine', .45 * loud, 0, 70); nz(d, .18, 1800, .8, 'bandpass', .1, .03); }
      else { nz(d, .16, 520, 1, 'lowpass', .55 * loud); tone(d, 90, .1, 'sine', .25 * loud); } },
    step: (p, surf, loud) => { const d = at(p, 2.5);
      if (surf === 'water') { nz(d, .2, 1200, 1, 'bandpass', .22 * loud, 0, 400); } else if (surf === 'stone') { nz(d, .05, 3200, 2, 'bandpass', .18 * loud); tone(d, 260, .04, 'sine', .05 * loud); } else { nz(d, .11, 1700 + Math.random() * 900, .8, 'bandpass', .2 * loud); nz(d, .07, 260, 1, 'lowpass', .2 * loud); } },
    whoosh: p => nz(at(p, 2), .35, 3600, 2, 'bandpass', .5, 0, 700),
    // the bows' finishers: one small recipe each, played where it happens
    fin: (k, p) => { const d = at(p, 24), T = (f, dur, type, g, delay = 0, to) => tone(d, f, dur, type, g * 1.7, delay, to), Nz = (dur, f, q, type, g, delay = 0, to) => nz(d, dur, f, q, type, g * 1.5, delay, to);
      switch (k) {
        case 'pop': T(600, .08, 'square', .12, 0, 1500); Nz(.06, 2600, 1.5, 'bandpass', .3); break;
        case 'bang': Nz(.25, 900, .7, 'lowpass', .8); T(120, .3, 'sine', .5, 0, 50); for (let i = 0; i < 6; i++) T(900 + Math.random() * 1200, .05, 'triangle', .05, .05 + i * .04); break;
        case 'shrink': T(500, .9, 'sine', .15, 0, 2200); break;
        case 'squeak': T(2400, .08, 'square', .1, 0, 3200); T(2800, .06, 'square', .08, .1, 3600); break;
        case 'boing': T(220, .5, 'sine', .3, 0, 660); break;
        case 'blip': [988, 784, 659, 523, 392].forEach((f, i) => T(f, .1, 'square', .1, i * .11)); break;
        case 'blub': for (let i = 0; i < 4; i++) T(300 + i * 80, .12, 'sine', .15, i * .09, 700); break;
        case 'chime': [1047, 1319, 1568, 2093].forEach((f, i) => T(f, .5, 'sine', .1, i * .07)); break;
        case 'splat': Nz(.4, 500, .8, 'lowpass', .5, 0, 200); T(160, .3, 'sine', .2, 0, 80); break;
        case 'buzz': for (let i = 0; i < 3; i++) T(180 + i * 7, 1.2, 'sawtooth', .04, i * .05, 200 + i * 9); break;
        case 'paper': Nz(.25, 3000, 1, 'highpass', .15); Nz(.2, 2400, 1, 'highpass', .12, .25); break;
        case 'freeze': Nz(.6, 5000, 2, 'bandpass', .15, 0, 9000); T(1800, .4, 'sine', .06, .1, 2600); break;
        case 'shatter': Nz(.5, 4200, .8, 'highpass', .5); for (let i = 0; i < 8; i++) T(2000 + Math.random() * 3000, .08, 'triangle', .06, Math.random() * .3); break;
        case 'bonk': T(180, .25, 'square', .3, 0, 90); Nz(.15, 600, 1, 'lowpass', .5); T(1400, .3, 'sine', .08, .15, 1500); break;
        case 'poof': Nz(.5, 900, .6, 'lowpass', .5, 0, 300); T(400, .2, 'sine', .1, .3, 300); T(300, .2, 'sine', .1, .5, 250); break;
        case 'crack': Nz(.12, 1800, 1, 'bandpass', .5); Nz(.3, 300, 1, 'lowpass', .5, .05); break;
        case 'wind': Nz(1.6, 700, .5, 'bandpass', .35, 0, 2200); break;
        case 'burn': Nz(1.4, 1200, .4, 'bandpass', .3, 0, 600); Nz(.3, 300, 1, 'lowpass', .3); break;
        case 'rumble': Nz(.9, 180, .7, 'lowpass', .7); T(60, .8, 'sine', .4, 0, 40); break;
        case 'disco': [523, 659, 784, 1047, 784, 659].forEach((f, i) => T(f, .12, 'square', .06, i * .12)); Nz(.06, 6000, 2, 'highpass', .1); break;
        case 'rocket': Nz(1.8, 500, .5, 'bandpass', .4, .3, 2500); T(90, 1.6, 'sawtooth', .08, .3, 300); break;
        case 'boom': Nz(1.1, 400, .5, 'lowpass', .9, 0, 80); T(70, .9, 'sine', .6, 0, 30); break;
        case 'zap': Nz(.35, 3000, .5, 'highpass', .6); T(80, .5, 'sawtooth', .3, 0, 40); Nz(1, 200, .7, 'lowpass', .5, .05); break;
        case 'ghost': T(500, 1.2, 'sine', .12, 0, 900); T(505, 1.2, 'sine', .12, 0, 880); break;
        case 'volley': for (let i = 0; i < 10; i++) Nz(.25, 3200, 2, 'bandpass', .15, Math.random() * .7, 800); break;
        case 'ufo': T(400, 1.6, 'sine', .15, 0, 1200); T(410, 1.6, 'triangle', .08, .1, 300); break;
        case 'clank': T(900, .5, 'triangle', .25, 0, 860); T(1350, .4, 'sine', .12, 0, 1300); Nz(.08, 3000, 2, 'bandpass', .3); break;
        case 'magic': [880, 1175, 1480, 1760, 2349].forEach((f, i) => T(f, .4, 'sine', .08, i * .08)); Nz(.8, 7000, 2, 'highpass', .06); break;
        case 'falling': T(2200, .8, 'sine', .15, 0, 300); break;
        case 'void': T(160, 1.6, 'sawtooth', .12, 0, 40); Nz(1.4, 300, .5, 'lowpass', .4, 0, 80); break;
      } },
    // the toy break-apart: a bright pop, a springy boing, then a rattle of blocks
    pop: p => { const d = at(p, 24); tone(d, 520, .09, 'square', .12, 0, 1400); tone(d, 300, .32, 'sine', .3, .04, 620); nz(d, .06, 2600, 1.5, 'bandpass', .3); for (let k = 0; k < 5; k++) tone(d, 700 + Math.random() * 900, .04, 'triangle', .05, .12 + k * .06 + Math.random() * .03); },
    distantTwang: p => tone(at(p, 6), 170, .22, 'triangle', .3, 0, 130),
    hitmark: zone => { if (zone === 'head') { tone(AU.out, 1500, .09, 'sine', .14); tone(AU.out, 2250, .14, 'sine', .1, .05); } else tone(AU.out, 1150, .07, 'sine', .12); },
    elimMark: () => { tone(AU.out, 880, .12, 'triangle', .14); tone(AU.out, 1320, .2, 'triangle', .12, .07); nz(AU.out, .1, 300, 1, 'lowpass', .2); },
    hurt: () => { nz(AU.out, .18, 260, 1, 'lowpass', .5); tone(AU.out, 80, .2, 'sine', .3); },
    pick: () => { tone(AU.out, 700, .07, 'triangle', .1); tone(AU.out, 1050, .1, 'triangle', .08, .05); nz(AU.out, .06, 2500, 2, 'bandpass', .06); },
    thud: p => { const d = at(p, 6); nz(d, .3, 300, 1, 'lowpass', .7); nz(d, .45, 2200, .7, 'bandpass', .12, .05); },
    cupid: p => { const d = at(p, 24); [0, 4, 7, 11, 14, 19].forEach((k, i) => tone(d, 660 * Math.pow(2, k / 12), .5, 'sine', .14, i * .04)); tone(d, 220, .35, 'sine', .4, .05, 520); nz(d, .2, 1200, 1, 'bandpass', .2, .05); },
    thwack: p => { const d = at(p, 24); nz(d, .16, 1100, .6, 'bandpass', 1.1); tone(d, 95, .25, 'sine', .9, 0, 45); nz(d, .35, 250, 1, 'lowpass', .6); tone(d, 300, .4, 'sine', .25, .12, 140); tone(d, 600, .25, 'triangle', .12, .2, 900); },
    // KA-CHING: the drawer clunks open, the bell rings, the coins spill out
    cashout: p => { const d = at(p, 24);
      nz(d, .07, 420, 1.2, 'lowpass', 1.1); tone(d, 140, .09, 'square', .3, 0, 90); nz(d, .012, 3200, 3, 'bandpass', .7); nz(d, .14, 900, 2, 'bandpass', .35, .03, 300);   // ka: the clunk and the drawer
      for (const [f, g] of [[1319, .3], [2637, .42], [3951, .22], [5274, .12]]) { tone(d, f, 1.5, 'sine', g, .16); tone(d, f * 1.003, 1.2, 'triangle', g * .3, .16); }   // ching: the bell
      for (let k = 0; k < 16; k++) tone(d, 3200 + Math.random() * 3200, .07 + Math.random() * .07, 'sine', .12, .3 + k * .045 + Math.random() * .03, 4500 + Math.random() * 2000);   // the coins
      for (let k = 0; k < 5; k++) tone(d, 1700 + Math.random() * 700, .05, 'triangle', .14, .5 + k * .11 + Math.random() * .05); },
    horn: () => { tone(AU.out, 196, .9, 'sawtooth', .07); tone(AU.out, 294, .9, 'sawtooth', .05, .02); nz(AU.out, .8, 400, 1, 'lowpass', .05); },
    beep: hi => tone(AU.out, hi ? 1040 : 660, .12, 'sine', .14),
    win: () => [0, 4, 7, 12].forEach((k, i) => tone(AU.out, 523 * Math.pow(2, k / 12), .35, 'triangle', .14, i * .1)),
    lose: () => [7, 3, 0].forEach((k, i) => tone(AU.out, 330 * Math.pow(2, k / 12), .4, 'triangle', .12, i * .14)),
    click: () => tone(AU.out, 1200, .03, 'sine', .06),
    bird: (p, kind) => { const d = at(p, 14, AU.birds), R = Math.random, T = (f, dur, g, delay, to) => tone(d, f, dur, 'sine', g, delay, to);
      kind = kind == null ? Math.floor(R() * 5) : kind;
      if (kind === 0) { const b = 2600 + R() * 1400, n = 5 + Math.floor(R() * 6); let t = 0; for (let k = 0; k < n; k++) { const f = b * (.8 + R() * .5), dur = .04 + R() * .07; T(f, dur, .13, t, f * (.8 + R() * .7)); t += dur + .015 + R() * .05; } }   // a songbird's warble
      else if (kind === 1) { const b = 3000 + R() * 900; T(b, .22, .14, 0, b * 1.05); T(b * .78, .3, .14, .3, b * .62); }   // a two-note whistle, high then low
      else if (kind === 2) { const b = 4200 + R() * 1200, n = 8 + Math.floor(R() * 8); for (let k = 0; k < n; k++) T(b, .03, .09, k * .055, b * 1.15); }   // a trill
      else if (kind === 3) { const b = 700 + R() * 120; T(b, .3, .1, 0, b * .97); T(b * .8, .42, .1, .42, b * .78); }   // a far-off two-note call, low
      else if (kind === 4) { const b = 2000 + R() * 2000; T(b, .09, .12, 0, b * 1.6); T(b * 1.4, .07, .1, .14, b * .9); T(b * 1.1, .12, .1, .26, b * 1.5); }   // chirps
      else if (kind === 5) { const sc = [0, 2, 4, 7, 9, 12], b = 1800 + R() * 600; let t = 0; for (let k = 0; k < 6 + Math.floor(R() * 4); k++) { const f = b * Math.pow(2, sc[Math.floor(R() * sc.length)] / 12), dur = .1 + R() * .12; T(f, dur, .11, t, f * (1 + (R() - .5) * .08)); t += dur + .04; } }   // a melodic song, robin-like
      else { const b = 3400 + R() * 800; for (let k = 0; k < 3; k++) { T(b, .14, .12, k * .32, b * .7); } } },   // cheer, cheer, cheer
    peck: p => { const d = at(p, 10, AU.birds), n = 8 + Math.floor(Math.random() * 10); for (let k = 0; k < n; k++) nz(d, .015, 1600, 4, 'bandpass', .25, k * (.055 + k * .002)); },   // a woodpecker on a trunk
  };
  const surfaceAt = (x, y, z) => W.inWater(x, z, y + .3) ? 'water' : W.groundAt(x, z, y + .1) > W.terrainH(x, z) + .05 ? 'stone' : 'dirt';
  on('drawStart', () => AU.ready && S.nock());
  on('fullDraw', () => AU.ready && S.full());
  on('release', pw => AU.ready && S.release(pw));
  on('drawCancel', () => AU.ready && S.cancel());
  on('impact', (p, mat, m) => { if (!AU.ready) return; S.impact(p, mat); });
  on('step', (s, sp, p) => AU.ready && S.step([s.x, s.y + .1, s.z], surfaceAt(s.x, s.y, s.z), cl(sp / 4, .3, 1.3) * (s.crouch ? .35 : 1)));
  on('myStep', st => AU.ready && S.step([st.x, st.y + .1, st.z], surfaceAt(st.x, st.y, st.z), (st.crouch ? .2 : .45) * (st.sprint ? 1.4 : 1)));
  on('whoosh', p => AU.ready && S.whoosh(p));
  on('shotHeard', a => AU.ready && S.distantTwang(a.o));
  on('thud', p => AU.ready && S.thud(p)); on('cupidPop', p => AU.ready && S.cupid(p)); on('thwack', p => AU.ready && S.thwack(p)); on('cashout', p => AU.ready && S.cashout(p));
  on('pop', p => AU.ready && S.pop(p));
  on('finSfx', (k, p) => AU.ready && S.fin(k, p));
  on('tgtBreak', (i, p, mine) => { if (!AU.ready || !p) return; const d = at(p, 7); nz(d, .09, 1900, 2, 'bandpass', .5); tone(d, 230, .12, 'sine', .35, 0, 120); nz(d, .2, 900, 1, 'lowpass', .3, .02);   // the board cracks
    if (W.TARGETS[i] && W.TARGETS[i].kind === 'fly') nz(d, .06, 3200, 1.5, 'bandpass', .5);   // and a balloon pops
    if (mine) { tone(AU.out, 1320, .09, 'triangle', .16, .05); tone(AU.out, 1760, .14, 'triangle', .14, .13); tone(AU.out, 2640, .18, 'sine', .08, .2); } });   // coins
  on('go', () => AU.ready && S.horn());
  function audioFrame(dt) {
    if (!AU.ready) return; const ac = AU.ac, L = ac.listener, c = X.camera, f = c.getWorldDirection(new THREE.Vector3());
    if (L.positionX) { L.positionX.value = c.position.x; L.positionY.value = c.position.y; L.positionZ.value = c.position.z; L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; } else { L.setPosition(c.position.x, c.position.y, c.position.z); L.setOrientation(f.x, f.y, f.z, 0, 1, 0); }
    AU.out.gain.value = CFG.vol;
    AU.amb.gain.value = CFG.amb == null ? 1 : CFG.amb;
    // birds in the trees round you, often answered by another; now and then a woodpecker
    AU.birdT -= dt; if (AU.birdT <= 0) { AU.birdT = .6 + Math.random() * 2.2; const a = Math.random() * TAU, r = 10 + Math.random() * 26, kind = Math.floor(Math.random() * 7), at3 = [c.position.x + Math.cos(a) * r, c.position.y + 7 + Math.random() * 9, c.position.z + Math.sin(a) * r];
      S.bird(at3, kind); if (Math.random() < .45) { const b = a + 1.5 + Math.random() * 3, r2 = 14 + Math.random() * 24; setTimeout(() => AU.ready && S.bird([c.position.x + Math.cos(b) * r2, c.position.y + 8 + Math.random() * 8, c.position.z + Math.sin(b) * r2], kind), 600 + Math.random() * 900); } }
    AU.peckT -= dt; if (AU.peckT <= 0) { AU.peckT = 14 + Math.random() * 22; const a = Math.random() * TAU, r = 15 + Math.random() * 20; S.peck([c.position.x + Math.cos(a) * r, c.position.y + 4, c.position.z + Math.sin(a) * r]); }
    if (ME.drawing) { AU.creak -= dt; if (AU.creak <= 0) { const d = W.drawPower(ME.drawT); AU.creak = d >= 1 ? .45 + Math.random() * .3 : .06 + Math.random() * .05; S.creak(d); } }
  }
