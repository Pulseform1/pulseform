  /* ---------- 60 audio: all synthesized; footsteps, impacts and fly-bys come from where they happen (HRTF panning) ---------- */
  const AU = { ready: false, out: null, buf: {}, birdT: 2, creak: 0, creek: null, wind: null, rustle: null };
  function audioInit() {
    const ac = K.audio && K.audio(); if (!ac || AU.ready) return; AU.ready = true; AU.ac = ac;
    AU.out = ac.createGain(); AU.out.gain.value = CFG.vol; AU.out.connect(K.master);
    const mk = (secs, fn) => { const n = Math.floor(ac.sampleRate * secs), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); fn(d, n); return b; };
    AU.buf.white = mk(2, (d, n) => { for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; });
    AU.buf.brown = mk(3, (d, n) => { let l = 0; for (let i = 0; i < n; i++) { l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } });
    // the wood around you: wind in the canopy, rustling leaves, the creek
    const loop = (buf, f, q, type, g, dest) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const gn = ac.createGain(); gn.gain.value = g; s.connect(fl).connect(gn).connect(dest || AU.out); s.start(); return { s, fl, gn }; };
    AU.wind = loop(AU.buf.brown, 420, .4, 'lowpass', .09); AU.rustle = loop(AU.buf.white, 3800, .3, 'highpass', .012);
    const pan = ac.createPanner(); Object.assign(pan, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 3, maxDistance: 60, rolloffFactor: 1.3 }); pan.connect(AU.out);
    AU.creek = loop(AU.buf.brown, 900, .6, 'bandpass', .55, pan); AU.creek.pan = pan;
  }
  const t0 = () => AU.ac.currentTime;
  function at(p, ref = 4) { const ac = AU.ac, pn = ac.createPanner(); Object.assign(pn, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: ref, maxDistance: 90, rolloffFactor: 1.2 }); if (pn.positionX) { pn.positionX.value = p[0]; pn.positionY.value = p[1]; pn.positionZ.value = p[2]; } else pn.setPosition(p[0], p[1], p[2]); pn.connect(AU.out); return pn; }
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
    fin: (k, p) => { const d = at(p, 6), T = (f, dur, type, g, delay = 0, to) => tone(d, f, dur, type, g, delay, to), Nz = (dur, f, q, type, g, delay = 0, to) => nz(d, dur, f, q, type, g, delay, to);
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
    pop: p => { const d = at(p, 6); tone(d, 520, .09, 'square', .12, 0, 1400); tone(d, 300, .32, 'sine', .3, .04, 620); nz(d, .06, 2600, 1.5, 'bandpass', .3); for (let k = 0; k < 5; k++) tone(d, 700 + Math.random() * 900, .04, 'triangle', .05, .12 + k * .06 + Math.random() * .03); },
    distantTwang: p => tone(at(p, 6), 170, .22, 'triangle', .3, 0, 130),
    hitmark: zone => { if (zone === 'head') { tone(AU.out, 1500, .09, 'sine', .14); tone(AU.out, 2250, .14, 'sine', .1, .05); } else tone(AU.out, 1150, .07, 'sine', .12); },
    elimMark: () => { tone(AU.out, 880, .12, 'triangle', .14); tone(AU.out, 1320, .2, 'triangle', .12, .07); nz(AU.out, .1, 300, 1, 'lowpass', .2); },
    hurt: () => { nz(AU.out, .18, 260, 1, 'lowpass', .5); tone(AU.out, 80, .2, 'sine', .3); },
    pick: () => { tone(AU.out, 700, .07, 'triangle', .1); tone(AU.out, 1050, .1, 'triangle', .08, .05); nz(AU.out, .06, 2500, 2, 'bandpass', .06); },
    thud: p => { const d = at(p, 6); nz(d, .3, 300, 1, 'lowpass', .7); nz(d, .45, 2200, .7, 'bandpass', .12, .05); },
    cupid: p => { const d = at(p, 8); [0, 4, 7, 11, 14, 19].forEach((k, i) => tone(d, 660 * Math.pow(2, k / 12), .5, 'sine', .14, i * .04)); tone(d, 220, .35, 'sine', .4, .05, 520); nz(d, .2, 1200, 1, 'bandpass', .2, .05); },
    thwack: p => { const d = at(p, 10); nz(d, .16, 1100, .6, 'bandpass', 1.1); tone(d, 95, .25, 'sine', .9, 0, 45); nz(d, .35, 250, 1, 'lowpass', .6); tone(d, 300, .4, 'sine', .25, .12, 140); tone(d, 600, .25, 'triangle', .12, .2, 900); },
    cashout: p => { const d = at(p, 10); nz(d, .12, 1500, 2, 'bandpass', .5); for (let k = 0; k < 5; k++) nz(d, .03, 4000, 4, 'bandpass', .25, .05 + k * .03); tone(d, 2093, .9, 'sine', .3, .22); tone(d, 2637, .9, 'sine', .22, .22); tone(d, 4186, .6, 'sine', .1, .22); for (let k = 0; k < 12; k++) tone(d, 3000 + Math.random() * 2500, .12, 'sine', .07, .4 + k * .06 + Math.random() * .05); },
    horn: () => { tone(AU.out, 196, .9, 'sawtooth', .07); tone(AU.out, 294, .9, 'sawtooth', .05, .02); nz(AU.out, .8, 400, 1, 'lowpass', .05); },
    beep: hi => tone(AU.out, hi ? 1040 : 660, .12, 'sine', .14),
    win: () => [0, 4, 7, 12].forEach((k, i) => tone(AU.out, 523 * Math.pow(2, k / 12), .35, 'triangle', .14, i * .1)),
    lose: () => [7, 3, 0].forEach((k, i) => tone(AU.out, 330 * Math.pow(2, k / 12), .4, 'triangle', .12, i * .14)),
    click: () => tone(AU.out, 1200, .03, 'sine', .06),
    bird: p => { const d = at(p, 10), b = 1800 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 5); for (let k = 0; k < n; k++) tone(d, b * (1 + Math.random() * .2), .07 + Math.random() * .06, 'sine', .08, k * .11, b * (1.3 + Math.random() * .4)); },
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
  on('picked', () => AU.ready && S.pick()); on('recovered', () => AU.ready && S.pick());
  on('go', () => AU.ready && S.horn());
  function audioFrame(dt) {
    if (!AU.ready) return; const ac = AU.ac, L = ac.listener, c = X.camera, f = c.getWorldDirection(new THREE.Vector3());
    if (L.positionX) { L.positionX.value = c.position.x; L.positionY.value = c.position.y; L.positionZ.value = c.position.z; L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; } else { L.setPosition(c.position.x, c.position.y, c.position.z); L.setOrientation(f.x, f.y, f.z, 0, 1, 0); }
    AU.out.gain.value = CFG.vol;
    const w = X.wind.amt.value; AU.wind.gn.gain.value = .05 + w * .05; AU.rustle.gn.gain.value = .006 + w * .012;
    const cx = cl(c.position.x, 0, 140), cz = W.creekZ(cx), pn = AU.creek.pan; if (pn.positionX) { pn.positionX.value = cx; pn.positionY.value = W.waterY(cx); pn.positionZ.value = cz; } else pn.setPosition(cx, W.waterY(cx), cz);
    AU.birdT -= dt; if (AU.birdT <= 0) { AU.birdT = 2 + Math.random() * 6; const a = Math.random() * TAU, r = 12 + Math.random() * 25; S.bird([c.position.x + Math.cos(a) * r, c.position.y + 8 + Math.random() * 8, c.position.z + Math.sin(a) * r]); }
    if (ME.drawing) { AU.creak -= dt; if (AU.creak <= 0) { const d = W.drawPower(ME.drawT); AU.creak = d >= 1 ? .45 + Math.random() * .3 : .06 + Math.random() * .05; S.creak(d); } }
  }
