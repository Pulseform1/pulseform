  /* ---------- 80 audio: every sound is synthesised, and placed ----------
     A sound made by the rival is quieter with distance, panned left or right by where it is relative to your facing, and
     muffled when a wall is in the way, so footsteps and gunfire tell you where they are. Your own sounds play dead centre.
     Everything goes through the kit's master gain, so the kit's mute switch and pause still work. */
  const canHear = () => typeof K !== 'undefined' && K.ac && K.master && !K.save.mute && !K.bot;
  let noiseBuf = null;
  // every Duelpoint sound runs through one bus before the kit's master, so the volume setting (CFG.vol, 0 to 1) scales them all
  let busN = null;
  function bus() {
    const ac = K.ac; if (!busN || busN.context !== ac) { busN = ac.createGain(); busN.connect(K.master); keepAwake(ac); }
    const v = CFG.vol == null ? 1 : cl(+CFG.vol, 0, 1); if (busN.gain.value !== v) busN.gain.value = v; return busN;
  }
  /* ---- Bluetooth earbuds ----
     Wireless earbuds play everything late (often 0.15 to 0.3 s), and many of them, and some browsers, put the audio link to
     sleep in a silence, so the next sound after a quiet moment comes later still or loses its start. So:
     - a whisper of sound, far below hearing, runs all the time and keeps the link awake;
     - sounds whose moment is known ahead are started that much early, so they land with what you see: the shots to come
       in a spray you are holding down, a reload's clicks, the charge's beeps. (The first shot of a spray cannot be known
       ahead: it is as late as the earbuds make it, and the rest of the spray lines up with the muzzle from there.)
     How late is the 'Sound sync' setting: AUTO takes what the browser says the output adds (wired, a few ms: nothing is
     moved; Bluetooth, far more), or a fixed amount, or OFF. */
  let keep = null;
  function keepAwake(ac) {
    if (keep || K.bot) return;
    try { const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 3e-5;   // about -90 dB
      const s = ac.createBufferSource(); s.buffer = b; s.loop = true; s.connect(ac.destination); s.start(); keep = s; } catch (e) {}
  }
  const reportedLag = () => { const ac = K.ac; return ac ? (ac.outputLatency || 0) + (ac.baseLatency || 0) : 0; };
  function lag() { const s = CFG.sync == null ? 'auto' : CFG.sync; if (s !== 'auto') return cl(+s || 0, 0, .5); const L = reportedLag(); return L > .06 ? Math.min(L, .45) : 0; }
  // where to plug a sound in: returns an audio node that leads to the speakers, shaped for a source at fighter f (or your own)
  // who is listening: you, or (dead, in a team game) the teammate you are watching through: their sounds are 'yours'
  const ear = () => (M && typeof viewer === 'function' && viewer()) || me();
  function outFor(f, vol = 1) {
    const ac = K.ac, g = ac.createGain(); let v = vol, pan = 0, muffle = false, behind = false;
    if (M && f && f !== ear()) {
      const P = ear(), dx = f.x - P.x, dz = f.z - P.z, d = Math.hypot(dx, dz) || .01;
      v *= Math.pow(cl(1 - d / 55, .05, 1), 1.4); pan = cl((dx * Math.cos(P.yaw) - dz * Math.sin(P.yaw)) / d, -1, 1) * .85;
      muffle = los(P.x, eyeY(P), P.z, f.x, f.y + 1.2, f.z, false) < d - .6; if (muffle) v *= .6;
      behind = (dx * -Math.sin(P.yaw) + dz * -Math.cos(P.yaw)) / d < -.3;
    }
    g.gain.value = v; let head = g;
    if (muffle) { const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 1100; lpf.connect(g); head = lpf; }
    else if (behind) { const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 4200; lpf.connect(g); head = lpf; }   // (behind you: your head in the way of the high end, so you can tell front from back)
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p).connect(bus()); } else g.connect(bus());
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
  // gunfire by class (the fallback, for the moment before a gun's own shot is baked): [crack length, crack pitch, thump pitch, tail length, loudness]
  const SHOT = { Sidearm: [.08, 2400, 170, .12, .8], SMG: [.06, 2000, 150, .1, .7], Shotgun: [.16, 1300, 75, .3, 1.15], Rifle: [.1, 1700, 110, .22, 1], Sniper: [.2, 1200, 60, .5, 1.3], Heavy: [.1, 1400, 95, .22, 1] };
  /* Each gun's own shot, built once from layers and baked into a sample (so a spray costs one sound a shot, not a dozen):
       s  the snap: a split-second of bright noise, the edge of the shot
       p  the punch: [from Hz, to Hz, seconds, level], a falling low tone, driven hard so it thumps
       c  the crack: [Hz, seconds, level, Q], the blast's band of noise, with some sizzle above it
       m  the action: [Hz, delay, level], the bolt or slide cycling, a dry metal clack just after
       r  a ring: [Hz, seconds, level], the steel of a revolver, a marksman rifle or a big sniper
       t  the room: [lowpass Hz, seconds, level], the tail, with a slap off the walls a moment later
       rack  a pump or a bolt worked this long after the shot; sup  suppressed (a soft thup, the action louder than the blast)
       pf  a suppressor's puff: [from Hz, to Hz, seconds, level], a breath of noise whose pitch drops fast
       sl  a pistol slide: [delay, level], back and home again, two bright metal clicks with a little ring
       v  how loud it plays */
  const GSND = {
    pip: { s: .6, p: [200, 75, .06, .8], c: [2700, .055, .75, .9], m: [3600, .016, .22], t: [1600, .26, .2], v: .85 },
    stub: { s: .5, p: [120, 38, .16, 1.1], c: [1100, .14, .8, .6], m: [2200, .02, .15], t: [900, .55, .3], v: 1.2 },
    wasp: { s: .6, p: [230, 95, .045, .7], c: [3000, .045, .7, .9], m: [4000, .012, .2], t: [1800, .18, .16], v: .8 },
    quill: { sup: 1, s: .24, p: [130, 46, .16, 4.5], c: [1100, .035, .16, 1.1], pf: [2600, 560, .055, .3], sl: [.016, .5], t: [750, .22, .2], v: .85 },   // made up, not recorded: a deep tap, a short puff of air, and the slide's two clean clicks (sharper and lighter than any recording)
    hammer: { s: .7, p: [130, 42, .14, 1.15], c: [1700, .1, .9, .7], r: [880, .35, .12], m: [2600, .02, .25], t: [1200, .7, .3], v: 1.15 },
    gnat: { s: .65, p: [240, 100, .04, .65], c: [3100, .04, .65, 1], m: [4200, .012, .25], t: [1900, .16, .15], v: .78 },
    hornet: { sup: 1, s: .3, p: [170, 70, .045, .55], c: [1300, .035, .35, 1.2], m: [3500, .011, .32], t: [1100, .12, .08], v: .75 },
    breaker: { s: .55, p: [105, 34, .2, 1.2], c: [1000, .17, .85, .55], t: [800, .75, .34], rack: .42, v: 1.25 },
    thresher: { s: .55, p: [115, 38, .14, 1.1], c: [1150, .12, .8, .6], m: [2400, .02, .3], t: [850, .5, .3], v: 1.12 },
    mako: { s: .65, p: [165, 55, .08, .95], c: [2000, .07, .85, .8], m: [3000, .02, .35], t: [1300, .36, .24], v: 1 },
    paladin: { s: .7, p: [125, 45, .12, 1.1], c: [1600, .09, .9, .7], m: [2500, .025, .4], r: [620, .25, .08], t: [1150, .6, .3], v: 1.12 },
    vesper: { sup: 1, s: .35, p: [175, 60, .06, .7], c: [1500, .05, .45, 1.1], m: [3200, .014, .45], t: [1200, .16, .1], v: .85 },
    lancer: { s: .75, p: [140, 48, .1, 1.1], c: [1750, .085, .95, .75], m: [2800, .022, .45], t: [1250, .45, .28], v: 1.05 },
    kite: { s: .8, p: [140, 50, .1, 1], c: [2200, .08, .9, .8], t: [1300, .6, .3], rack: .55, v: 1.1 },
    longbow: { s: .85, p: [90, 30, .28, 1.3], c: [1300, .16, 1, .6], r: [420, .5, .07], t: [900, 1.2, .4], rack: .7, v: 1.3 },
    torrent: { s: .6, p: [150, 52, .085, 1.05], c: [1700, .07, .8, .8], m: [2600, .018, .3], t: [1150, .35, .24], v: 1 },
  };
  const baked = {}, bakedV = {}, baking = {};
  // each gun is baked three times, each a little different (its own noise, the punch and the crack a few percent apart), and
  // the shots take turns: the same sample over and over is what makes a spray sound like a machine
  function bakeShot(k, vI = 0, R) {
    const ac = K.ac, D0 = GSND[k], bk = k + ':' + vI; if (!ac || !D0 || baking[bk] || typeof OfflineAudioContext === 'undefined') return;
    if (R === undefined && GUN_REC[k]) { recBuf(k, b => bakeShot(k, vI, b || null)); return; }   // (a real recording first: decoded once, then baked round)
    baking[bk] = 1;
    const jj = 1 + (vI - 1) * .04, D = Object.assign({}, D0, { p: [D0.p[0] * jj, D0.p[1] * jj, D0.p[2] * (2 - jj), D0.p[3]], c: [D0.c[0] * (2 - jj), D0.c[1], D0.c[2], D0.c[3]] });
    const fit = GUN_REC_FIT[k] || { r: 1, g: 1 }, rate = fit.r * (1 + (vI - 1) * .035), sr = ac.sampleRate, dur = Math.max(D.t[1], D.p[2], R ? R.duration / rate : 0) + (D.rack ? D.rack + .32 : 0) + .15, len = Math.ceil(sr * dur);
    let oc; try { oc = new OfflineAudioContext(1, len, sr); } catch (e) { return; }
    const nb = oc.createBuffer(1, sr, sr), ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    // everything is driven into a soft clip and a fast compressor: that is what makes it punch rather than hiss
    const mix = oc.createGain(), sh = oc.createWaveShaper(), comp = oc.createDynamicsCompressor(), cv = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; cv[i] = Math.tanh(2.4 * x) / Math.tanh(2.4); } sh.curve = cv;
    comp.threshold.value = -16; comp.ratio.value = 6; comp.attack.value = .001; comp.release.value = .1; comp.knee.value = 6;
    mix.gain.value = R ? .3 : .7; mix.connect(sh).connect(comp).connect(oc.destination);   // (with a recording, the made-up layers sit underneath it)
    // the recording: straight into the compressor (not the clipper: it is real, it needs no drive), each bake a few percent faster or slower
    if (R) { const r = oc.createBufferSource(), a = oc.createGain(), hp = oc.createBiquadFilter(); r.buffer = R; r.playbackRate.value = rate; hp.type = 'highpass'; hp.frequency.value = 45; a.gain.value = .95 * fit.g; let tail = r.connect(hp); if (fit.lp) { const lo = oc.createBiquadFilter(); lo.type = 'lowpass'; lo.frequency.value = fit.lp; lo.Q.value = .5; tail = tail.connect(lo); } tail.connect(a).connect(comp); r.start(0); }   // (lp: a recording dulled, a suppressor's muffle)
    const noise = (t0, d, v, type, f, q, att = .0012) => { const n = oc.createBufferSource(), fl = oc.createBiquadFilter(), a = oc.createGain(); n.buffer = nb; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      a.gain.setValueAtTime(0, t0); a.gain.linearRampToValueAtTime(v, t0 + att); a.gain.exponentialRampToValueAtTime(.0001, t0 + d); n.connect(fl).connect(a).connect(mix); n.start(t0, Math.random() * .4); n.stop(t0 + d + .02); };
    const osc = (t0, type, f0, f1, d, v) => { const o = oc.createOscillator(), a = oc.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + d);
      a.gain.setValueAtTime(0, t0); a.gain.linearRampToValueAtTime(v, t0 + .002); a.gain.exponentialRampToValueAtTime(.0001, t0 + d); o.connect(a).connect(mix); o.start(t0); o.stop(t0 + d + .02); };
    const sup = D.sup ? .45 : 1;
    noise(0, .012, D.s, 'highpass', 4200, .7, .0005);   // the snap
    osc(0, 'sine', D.p[0], D.p[1], D.p[2], D.p[3] * .62 * sup); osc(0, 'triangle', D.p[0] * 1.5, D.p[1] * 1.5, D.p[2] * .7, D.p[3] * .26 * sup);   // the punch
    noise(.001, D.c[1], D.c[2] * 1.45, 'bandpass', D.c[0], D.c[3]); noise(.001, D.c[1] * .7, D.c[2] * .75 * sup, 'bandpass', D.c[0] * 2.1, .8); noise(.001, D.c[1] * .45, D.c[2] * .6 * sup, 'highpass', 4500, .7);   // the crack, its bite and its sizzle
    if (D.m) { noise(D.m[1], .022, D.m[2], 'bandpass', D.m[0], 6); osc(D.m[1], 'square', D.m[0] * .5, D.m[0] * .42, .014, D.m[2] * .25); }   // the action
    if (D.r) { osc(.002, 'sine', D.r[0], D.r[0] * .985, D.r[1], D.r[2]); osc(.002, 'sine', D.r[0] * 2.76, D.r[0] * 2.7, D.r[1] * .6, D.r[2] * .45); }   // the ring
    noise(.006, D.t[1], D.t[2], 'lowpass', D.t[0], .5, .01); noise(.07, D.t[1] * .6, D.t[2] * .45, 'lowpass', D.t[0] * .8, .5, .012);   // the room, and the slap off the walls
    if (D.pf) { const n = oc.createBufferSource(), fl = oc.createBiquadFilter(), a = oc.createGain(), t0 = .0005; n.buffer = nb; fl.type = 'bandpass'; fl.Q.value = 1.6; fl.frequency.setValueAtTime(D.pf[0], t0); fl.frequency.exponentialRampToValueAtTime(D.pf[1], t0 + D.pf[2]);
      a.gain.setValueAtTime(0, t0); a.gain.linearRampToValueAtTime(D.pf[3], t0 + .0015); a.gain.exponentialRampToValueAtTime(.0001, t0 + D.pf[2]); n.connect(fl).connect(a).connect(mix); n.start(t0, Math.random() * .4); n.stop(t0 + D.pf[2] + .02); }   // the puff
    if (D.sl) { for (const [dt0, f0, lv] of [[D.sl[0], 5400, 1], [D.sl[0] + .046, 4300, .8]]) { noise(dt0, .014, D.sl[1] * lv, 'bandpass', f0, 7, .0004); osc(dt0, 'square', f0 * .5, f0 * .46, .01, D.sl[1] * .18 * lv); osc(dt0 + .001, 'sine', f0 * .62, f0 * .6, .035, D.sl[1] * .14 * lv); } }   // the slide, back and home
    if (D.rack) { const r = D.rack; noise(r, .05, .32, 'bandpass', 1900, 3); osc(r, 'square', 320, 260, .03, .06); noise(r + .13, .06, .38, 'bandpass', 1400, 3); osc(r + .13, 'square', 260, 200, .035, .07); }   // pump / bolt
    oc.startRendering().then(B => { const c0 = B.getChannelData(0); let pk = 0; for (let i = 0; i < c0.length; i++) pk = Math.max(pk, Math.abs(c0[i])); if (pk > 0) { const g = .92 / pk; for (let i = 0; i < c0.length; i++) c0[i] *= g; } (bakedV[k] = bakedV[k] || [])[vI] = B; if (!baked[k]) baked[k] = B; }).catch(() => { baking[bk] = 0; });
  }
  // bake every gun as a match starts (it takes a few milliseconds each, off the main sound path)
  on('round', () => { if (K.ac) for (const k in GSND) for (let v = 0; v < 3; v++) bakeShot(k, v); });
  // the gun's own shot, a hair higher or lower each time; far away it loses its edge. when: an audio-clock time (0: now)
  const SHOTN = {};
  function shotAt(f, G, out, mine, when) {
    const ac = K.ac, src = ac.createBufferSource(), a = ac.createGain(), V2 = bakedV[G.k] || [], n = V2.length; let buf = baked[G.k];
    if (n > 1) { SHOTN[G.k] = ((SHOTN[G.k] | 0) + 1 + (Math.random() < .35 ? 1 : 0)) % n; buf = V2[SHOTN[G.k]] || buf; }   // (turns, now and then skipping one, so no pattern)
    src.buffer = buf; src.playbackRate.value = 1 + (Math.random() - .5) * .07; a.gain.value = GSND[G.k].v * (GSND[G.k].sup ? .7 : .85);   // (every gun a little quieter, the suppressed ones a little more)
    let head = out, d = 0;
    if (!mine && M) { const P = ear(); d = Math.hypot(f.x - P.x, f.z - P.z); if (d > 12) { const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = lp(15000, 1600, cl((d - 12) / 45, 0, 1)); lpf.connect(out); head = lpf; } }
    src.connect(a).connect(head);
    // the room: a share of every shot goes to the map's reverb, more for one under a roof and more the further away it is
    { const R = verb(); if (R) { const k = f && f.x != null ? idx(Math.floor(f.x / CS), Math.floor(f.z / CS)) : -1, inside = k >= 0 && CEIL[k] > 0, s2 = ac.createGain(); s2.gain.value = (mine ? .16 : .26) * (inside ? 1.7 : 1) * (1 + cl(d / 40, 0, 1)) * GSND[G.k].v * (G.sil ? .4 : 1); a.connect(s2).connect(R); } }
    // far away, a shot is heard a moment after it is fired (sound is slow: about 3 ms a metre, from 15 m on, and never more than 0.15 s)
    const late = mine ? 0 : Math.min(.15, Math.max(0, d - 15) / 343);
    src.start(when || (late ? ac.currentTime + late : 0)); return src;
  }
  /* ---- the room each map makes: one reverb for all the gunfire, its echo made up to suit the map. Out in the open
     (harbour, desert, snow) a shot cracks back off far walls: a few separate slaps, then a long thin tail. Indoors (the
     station, the foundry, the temple's halls) it is a dense, short wash. The neon city is in between. */
  let verbN = null, verbKind = '';
  function verb() {
    const ac = K.ac; if (!ac || typeof MAP === 'undefined' || !MAP) return null;
    const kind = { harbor: 'open', desert: 'open', snow: 'open', space: 'hall', lava: 'hall', jungle: 'hall', neon: 'street', autumn: 'open' }[MAP.theme] || 'street';
    if (!verbN || verbN.context !== ac) { verbN = ac.createConvolver(); const wet = ac.createGain(); wet.gain.value = .55; verbN.connect(wet).connect(bus()); verbKind = ''; }
    if (verbKind !== kind) { verbKind = kind; const sr = ac.sampleRate, L = { open: 1.6, hall: .9, street: 1.2 }[kind], n = Math.floor(sr * L), B = ac.createBuffer(2, n, sr);
      for (let ch = 0; ch < 2; ch++) { const d = B.getChannelData(ch); let lpS = 0;
        const dk = { open: 4.2, hall: 7.5, street: 5.5 }[kind], dens = { open: .25, hall: 1, street: .55 }[kind];
        for (let i = 0; i < n; i++) { const t = i / sr, w = (Math.random() * 2 - 1) * Math.exp(-t * dk) * dens; lpS += (w - lpS) * (kind === 'hall' ? .35 : .5); d[i] = lpS; }   // (a diffuse tail, a little dulled)
        const slaps = { open: [.075, .14, .23, .37, .52], hall: [.012, .021, .033], street: [.045, .09, .16, .26] }[kind];
        slaps.forEach((t0, q) => { const at = Math.floor((t0 + (ch ? .004 : 0) + Math.random() * .006) * sr), a = .9 * Math.pow(.62, q); for (let j = 0; j < 220 && at + j < n; j++) d[at + j] += (Math.random() * 2 - 1) * a * Math.exp(-j / 40); }); }   // the separate slaps off far walls
      verbN.buffer = B; }
    return verbN;
  }
  // your own gun's brass on the floor: a tinkle (two bounces) a moment after the shot; a shotgun's hull lands with a dull tap
  let lastBrass = 0;
  function casing(G) {
    const ac = K.ac; if (!ac || G.melee || G.k === 'hammer') return; const now = ac.currentTime; if (now - lastBrass < .07) return; lastBrass = now;   // (a fast spray: not every case, or it is a wind chime)
    const o = outFor(null, .55), d0 = .32 + Math.random() * .14, f0 = G.cat === 'Sniper' ? 3300 : G.cat === 'Sidearm' ? 5200 : 4400;
    if (G.cat === 'Shotgun') { hiss(o, .05, .1, 'lowpass', 700, d0); tone(o, 220, .05, 'sine', .05, -60, d0); return; }
    tone(o, f0 * (1 + (Math.random() - .5) * .12), .06, 'sine', .028, 0, d0); tone(o, f0 * 1.5, .04, 'sine', .016, 0, d0); tone(o, f0 * (1.05 + Math.random() * .1), .04, 'sine', .016, 0, d0 + .09 + Math.random() * .05);
  }
  // your spray as it is heard: when it began, its last real shot, and the shots started ahead of time
  const SPR = { live: false, pt: 0, gap: 0, last: 0, k: '', q: [] }, BEEP = { q: null };
  function sprayStop(now) { for (const e of SPR.q) if (e.st > now) { try { e.src.stop(); } catch (er) {} } SPR.q = []; SPR.live = false; }
  // every frame: a spray you let go of (or that ran dry, or was put away) stops at once, so nothing scheduled ahead is heard;
  // the charge's next beep is called off if the charge is no longer ticking
  function audioFrame() {
    if (!K.ac) return; const now = K.ac.currentTime;
    if (SPR.live) { const P = M && me(), G = P && gun(P); if (!(P && P.alive && P.semiHeld && G && G.k === SPR.k && !(P.reloadT > 0) && ((P.ammo[G.k] || {}).mag | 0) > 0 && M.phase !== 'buy' && !M.over)) sprayStop(now); }
    if (BEEP.q && !(M && M.planted && M.phase === 'live' && !M.defused)) { if (BEEP.q.st > now) try { BEEP.q.src.stop(); } catch (er) {} BEEP.q = null; }
  }
  on('shot', (f, S, first) => {
    if (!first || !canHear()) return; const G = gun(f), mine = f === ear(), out = outFor(f, mine ? .6 : 1); if (mine && f === me()) casing(G);
    if (G.rail) { tone(out, 1800, .25, 'sawtooth', .12, -1500); hiss(out, .3, .3, 'highpass', 2500); tone(out, 70, .25, 'sine', .6, -30); return; }
    const B = baked[G.k];
    if (B) {
      // your own spray, on earbuds that play late: the shots to come are started early so they are heard as they are fired.
      // Only while the game is keeping real time (the last two shots came the gun's interval apart): on a stutter every shot
      // is played as it is fired instead. A shot that a sound started early already covers is not played again.
      const L = mine && f === me() && !f.net && G.auto ? lag() : 0;
      if (L) { const ac = K.ac, now = ac.currentTime, I = 60 / (G.rpm * (G.spin ? 1 + G.spin * Math.min(1, f.spray / 14) : 1)), cont = SPR.live && SPR.k === G.k && now - SPR.last < I * 1.8;
        if (!cont) { sprayStop(now); Object.assign(SPR, { live: true, k: G.k, pt: 0, gap: 0, gs: 0 }); }
        else SPR.gap = now - SPR.last;
        SPR.last = now;
        const steady = cont && Math.abs(SPR.gap - I) < I * .4; if (steady) SPR.gs = SPR.gs ? lp(SPR.gs, SPR.gap, .35) : SPR.gap; else SPR.gs = 0;   // gs: the spray's real rhythm, smoothed (frames make each gap a little uneven)
        if (!steady) { for (const e of SPR.q) if (e.st > now) { try { e.src.stop(); } catch (er) {} e.off = 1; } SPR.q = SPR.q.filter(e => !e.off); SPR.pt = 0; }
        else if (!SPR.pt) SPR.pt = now;   // early starts begin from here
        // this shot: already playing (started early), or left out (it falls inside the lateness of the shot played just before the early ones began), or played now
        const covered = SPR.q.some(e => Math.abs(e.t - now) < I * .5), gapShot = SPR.pt && now > SPR.pt + .001 && now < SPR.pt + L + I * .5;
        if (!covered && !gapShot) shotAt(f, G, out, mine, 0);
        if (SPR.pt) { const left = (f.ammo[G.k] || {}).mag | 0;
          const Ig = SPR.gs || I; for (let k = 1; k <= left; k++) { const t = now + k * Ig, st = t - L; if (st > now + I + .001) break; if (st < now - .001 || t < SPR.pt + L + I * .5 || SPR.q.some(e => Math.abs(e.t - t) < I * .5)) continue;
            SPR.q.push({ t, st, src: shotAt(f, G, outFor(f, .6), true, st) }); } }
        SPR.q = SPR.q.filter(e => e.t > now - 1); return; }
      shotAt(f, G, out, mine, 0); return;
    }
    bakeShot(G.k);
    if (G.sil) { hiss(out, .06, .22, 'lowpass', 1500); tone(out, 240, .04, 'square', .04, -90); return; }
    const [d, cf, tf, tail, v] = SHOT[G.cat] || SHOT.Rifle, big = G.k === 'hammer' || G.k === 'paladin' || G.k === 'stub' || G.loud ? 1.25 : 1;
    hiss(out, d * big, .5 * v, 'bandpass', cf, 0, .6); hiss(out, tail * big, .16 * v, 'lowpass', 900, .02); tone(out, tf, .11 * big, 'sine', .5 * v, -tf * .55);
  });
  const cue = (name, fn) => on(name, (a, b, c, d) => { if (canHear()) fn(a, b, c, d); });
  cue('dry', f => tone(outFor(f), 320, .03, 'square', .05));
  cue('reload', f => { const o = outFor(f, f === ear() ? .7 : 1), L = lag(), d = t => Math.max(0, t - L), r = gun(f).rel; tone(o, 520, .04, 'square', .06, 0, d(.15)); hiss(o, .05, .1, 'highpass', 2500, d(.15)); tone(o, 380, .05, 'square', .07, 0, d(r * .62)); hiss(o, .06, .12, 'highpass', 2000, d(r * .88)); });   // (started early by the earbuds' lateness, so the clicks land with the hands)
  cue('swap', f => { const o = outFor(f, f === ear() ? .6 : .8); hiss(o, .05, .1, 'highpass', 3000); tone(o, 700, .03, 'square', .03); });
  cue('melee', (f, heavy, S) => { const o = outFor(f); hiss(o, heavy ? .14 : .09, .16, 'bandpass', heavy ? 1500 : 2800, 0, 1.2); if (S) { tone(o, 180, .09, 'sine', .25, -90, .02); hiss(o, .05, .2, 'lowpass', 900, .02); } });
  // a slide: a gritty scrape that fades as it slows; a jump: a soft push-off
  cue('slide', f => { const o = outFor(f === ear() ? null : f, f === ear() ? .8 : 1); hiss(o, .55, .16, 'bandpass', 900, 0, .6); hiss(o, .4, .1, 'lowpass', 300, .05); });
  cue('jump', f => { const o = outFor(f === ear() ? null : f); hiss(o, .07, f === ear() ? .05 : .2, 'lowpass', 600); });
  cue('step', f => { if (f === ear()) hiss(outFor(null), .04, .035, 'lowpass', 500); else { const o = outFor(f); hiss(o, .06, .32, 'lowpass', 420); tone(o, 95, .05, 'sine', .14, -30); } });
  cue('jump', f => { if (f !== ear()) hiss(outFor(f), .06, .12, 'lowpass', 700); });
  cue('land', f => { const o = outFor(f, f === ear() ? .5 : 1); hiss(o, .09, .3, 'lowpass', 360); tone(o, 70, .08, 'sine', .25, -20); });
  cue('hurt', (v, by, dmg, head) => {
    if (by === me()) { const o = outFor(null); if (head) { tone(o, 2300, .05, 'square', .07); tone(o, 3100, .06, 'square', .06, 0, .04); } else tone(o, 1500, .04, 'square', .06); }
    if (v === me()) { const o = outFor(null); tone(o, 140, .12, 'sine', .35, -70); hiss(o, .07, .18, 'lowpass', 700); }
  });
  // your kill run: every kill without dying adds one (up to five), and the kill sound and banner climb with it
  let killRun = 0;
  on('round', () => { killRun = 0; });   // the streak (and its banner's count) starts again every round
  on('kill', (v, by) => { if (!M) return; if (v === me()) killRun = 0; else if (by === me()) killRun = Math.min(5, killRun + 1); });
  // the kill sound: a deep thump, a dry crack, then a bright bell chord that steps up the scale with each kill in a run, and a
  // shimmer that hangs in the air; a headshot adds a glassy ping on top, and three or more in a run a rising sparkle
  function killSound(n, head, line) {
    const o = outFor(null), k = [1, 1.122, 1.26, 1.335, 1.498][cl(n, 1, 5) - 1];
    tone(o, 150, .24, 'sine', .34, -95); hiss(o, .05, .2, 'highpass', 3200);
    tone(o, 784 * k, .45, 'triangle', .13, 0, .015); tone(o, 1176 * k, .36, 'sine', .075, 0, .03); tone(o, 1568 * k, .55, 'sine', .04, 0, .05);
    hiss(o, .5, .04, 'bandpass', 6500 * k, .05, 2.5);
    if (head) { tone(o, 2350, .05, 'square', .045, 0, .01); tone(o, 3136, .12, 'sine', .055, 0, .03); }
    if (n >= 3) for (let i = 0; i < n - 1; i++) tone(o, 1046 * k * (1 + i * .25), .16, 'triangle', .05, 0, .1 + i * .055);
    // a skin's own layer on top
    const snd = line && LINES[line] && LINES[line].sound;
    if (snd === 'ice') { for (const [f, d] of [[2637, .06], [3520, .11], [4186, .16]]) tone(o, f * k, .3, 'sine', .045, 0, d); hiss(o, .3, .05, 'highpass', 7000, .05); }
    else if (snd === 'coin') { for (const [f, d] of [[1975, .04], [2637, .09], [3135, .14], [2637, .2]]) tone(o, f, .12, 'square', .03, 0, d); }
    else if (snd === 'fire') { hiss(o, .6, .22, 'lowpass', 900, .02); tone(o, 110, .5, 'sawtooth', .06, 160, .02); hiss(o, .4, .06, 'bandpass', 2400, .1, 1.5); }
    else if (snd === 'zap') { tone(o, 1900, .18, 'sawtooth', .07, -1600); hiss(o, .2, .14, 'highpass', 4000, .02); tone(o, 60, .3, 'sine', .25, -20, .03); }
    else if (snd === 'void') { tone(o, 180, .55, 'sine', .14, 820, 0); tone(o, 48, .7, 'sine', .4, -10, .45); hiss(o, .5, .07, 'bandpass', 1200, .4, 3); }
    else if (snd === 'sun') { for (const [f, d] of [[523, 0], [659, .05], [784, .1], [1046, .16]]) tone(o, f * k, .9, 'sine', .05, 0, d); hiss(o, .8, .03, 'highpass', 8000, .1); }
  }
  cue('kill', (v, by, head, wk) => { if (by === me() && v !== me()) killSound(killRun, head, (skinOfId(skinFor(me(), wk)) || {}).line); else if (v === me()) tone(outFor(null), 200, .5, 'sawtooth', .1, -130); });
  cue('ability', (f, k) => {
    const key = f.op + k, o = outFor(f);
    // the C abilities and Vanta
    if (key === 'vexc') { tone(o, 180, .5, 'sine', .14, -90); hiss(o, .4, .1, 'lowpass', 600); return; }
    if (key === 'irisc') { tone(o, 1800, .06, 'sine', .08); tone(o, 2400, .08, 'sine', .07, 0, .07); return; }
    if (key === 'bastionc') { tone(o, 300, .2, 'square', .05, 120); tone(o, 600, .35, 'triangle', .08, 0, .2); return; }
    if (key === 'novac') { hiss(o, .45, .3, 'bandpass', 900); tone(o, 220, .35, 'sawtooth', .06, 700); return; }
    if (key === 'wraithc') { tone(o, 900, .3, 'sine', .08, -500); hiss(o, .3, .08, 'highpass', 3000); return; }
    if (key === 'talonc' || key === 'axiomc' || key === 'emberc') { hiss(o, .14, .14, 'bandpass', 1400); tone(o, 500, .1, 'triangle', .06, 200); return; }
    if (key === 'vantac') { tone(o, 140, .9, 'sawtooth', .08, 60); hiss(o, .8, .12, 'bandpass', 700); tone(o, 880, .5, 'sine', .05, -200); return; }
    if (key === 'vantaq') { tone(o, 1800, .25, 'sawtooth', .07, -1500); hiss(o, .2, .14, 'highpass', 2500); return; }
    if (key === 'vantae') { tone(o, 440, .4, 'triangle', .09, 440); tone(o, 880, .3, 'sine', .06, 0, .15); return; }
    if (key === 'vantax') { tone(o, 90, 1.2, 'sawtooth', .16, -40); tone(o, 1200, .5, 'sine', .1, -900); hiss(o, 1, .14, 'bandpass', 500); return; }
    // Tessel: glass and light. A soft toss for Bloom and Lull, a rising shimmer for Lightline, a chord for Glasshouse
    if (key === 'tesselc') { hiss(o, .16, .1, 'bandpass', 2200); tone(o, 1320, .18, 'sine', .05, 400, .02); return; }
    if (key === 'tesselq') { hiss(o, .14, .1, 'bandpass', 1600); tone(o, 2100, .12, 'triangle', .04, -300); tone(o, 2800, .1, 'sine', .03, 0, .06); return; }
    if (key === 'tessele') { tone(o, 392, .7, 'sine', .08, 392); tone(o, 587, .6, 'sine', .05, 587, .08); hiss(o, .6, .05, 'highpass', 5000, .05); return; }
    if (key === 'tesselx') { for (const [q, dl] of [[262, 0], [330, .06], [392, .12], [523, .2]]) tone(o, q, 1.3, 'sine', .07, 0, dl); tone(o, 65, 1.2, 'triangle', .14, -10); hiss(o, 1, .06, 'highpass', 6000, .1); return; }
    if (key === 'vexq') tone(o, 500, .16, 'sine', .14, 1100); else if (key === 'vexe') hiss(o, .5, .2, 'lowpass', 500);
    else if (key === 'irisq') { tone(o, 1300, .25, 'sine', .12, -700); tone(o, 1300, .25, 'sine', .08, -700, .18); } else if (key === 'irise') hiss(o, .08, .12, 'highpass', 1800);
    else if (key === 'bastionq') { tone(o, 80, .35, 'sawtooth', .16, 90); hiss(o, .3, .14, 'lowpass', 600); }
    else if (key === 'novaq') { tone(o, 260, .4, 'sawtooth', .07, 620); tone(o, 520, .35, 'square', .03, 900, .05); hiss(o, .35, .08, 'bandpass', 2600, 0, 2); }
    else if (key === 'novae' || key === 'emberq') { hiss(o, .14, .14, 'bandpass', 1400, 0, 1.2); tone(o, 500, .1, 'triangle', .06, 260); }
    else if (key === 'wraithq') { tone(o, 1100, .6, 'sine', .07, -820); hiss(o, .6, .05, 'highpass', 5200); }
    else if (key === 'wraithe') { tone(o, 1100, .35, 'sine', .07, -500); tone(o, 1650, .3, 'sine', .04, -700, .05); }   // Mirage: a glassy shimmer
    else if (key === 'talonq') { hiss(o, .1, .16, 'highpass', 2600); tone(o, 1400, .06, 'triangle', .05, -400); }
    else if (key === 'talone' || key === 'axiome') { tone(o, 1250, .05, 'square', .05); tone(o, 1650, .05, 'square', .05, 0, .08); }
    else if (key === 'axiomq') { tone(o, 200, .22, 'square', .06, 240); tone(o, 900, .07, 'square', .05, 0, .26); tone(o, 1200, .07, 'square', .05, 0, .36); }
    else if (key === 'embere') { hiss(o, .7, .14, 'lowpass', 800); hiss(o, .5, .05, 'bandpass', 2200, .1, 1.5); }
    else tone(o, 660, .2, 'triangle', .1, 330);
  });
  // a skin unlocked: a fanfare that grows with the rarity
  cue('wheelTick', () => { if (canHear()) tone(outFor(null), 1500, .025, 'square', .03); });   // the wheel's pointer clicking over a slice
  cue('levelUp', () => { const o = outFor(null); [659, 880, 1175, 1760].forEach((f, i) => { tone(o, f, .32, 'triangle', .09, 0, i * .08); tone(o, f * 2, .2, 'sine', .03, 0, i * .08 + .02); }); });
  cue('passUp', () => { const o = outFor(null); [523, 784, 1046, 1568].forEach((f, i) => tone(o, f, .5, 'triangle', .09, 0, i * .1)); hiss(o, .7, .07, 'highpass', 6000, .05); });
  // readying an ability: a soft rising charge; nothing to ready: a dull tick
  cue('abReady', (f, k) => { if (!M || f !== me() || !k) return; const o = outFor(null); tone(o, 320, .16, 'sine', .07, 380); hiss(o, .14, .04, 'bandpass', 2400); });
  cue('abNo', f => { if (M && f === me()) tone(outFor(null), 160, .07, 'square', .04); });
  cue('abBack', (f, k) => { if (M && f === me()) { const o = outFor(null); tone(o, 660, .12, 'triangle', .08); tone(o, 990, .14, 'triangle', .07, 0, .1); } });
  cue('gloomPop', () => hiss(outFor(null), .7, .14, 'lowpass', 400));
  cue('shockPop', S => { const o = outFor(null); hiss(o, .25, .3, 'highpass', 1800); tone(o, 120, .3, 'square', .1, -60); });
  cue('beaconPop', () => { const o = outFor(null); tone(o, 520, .4, 'triangle', .1, 260); tone(o, 1040, .3, 'sine', .05, 0, .1); });
  cue('tetherBack', () => { const o = outFor(null); tone(o, 300, .25, 'sine', .1, 900); hiss(o, .2, .1, 'highpass', 4000); });
  cue('fieldStart', () => { const o = outFor(null); hiss(o, .6, .12, 'bandpass', 3000); tone(o, 1400, .4, 'sine', .04, -600); });
  cue('sundered', v => { if (v === me()) { const o = outFor(null); tone(o, 1600, .3, 'sawtooth', .07, -1200); } });
  cue('wardOn', f => { if (f === me()) { const o = outFor(null); tone(o, 700, .2, 'triangle', .1, 500); tone(o, 1400, .25, 'sine', .06, 0, .08); } });
  cue('wardBreak', () => { const o = outFor(null); hiss(o, .2, .2, 'highpass', 3000); tone(o, 900, .2, 'square', .06, -500); });
  cue('duelStart', D => { const o = outFor(null); tone(o, 70, 1.4, 'sawtooth', .18, -30); tone(o, 300, .8, 'sine', .08, -150, .1); hiss(o, 1, .12, 'bandpass', 400); });
  cue('bloomPop', s => { const o = outFor(at(s.x, s.y + 1.4, s.z), 1.2); tone(o, 1568, .6, 'sine', .07, -200); tone(o, 2093, .5, 'sine', .04, 0, .04); hiss(o, .6, .12, 'highpass', 4000); });
  cue('lullStart', Z => { const o = outFor(at(Z.x, Z.y + 1, Z.z)); tone(o, 880, 1.1, 'sine', .07, -560); tone(o, 1320, .9, 'sine', .03, -840, .1); });   // (a note that sags: everything near it slows)
  cue('lensBreak', Z => { const o = outFor(at(Z.x, Z.y + 1, Z.z)); hiss(o, .25, .25, 'highpass', 5000); tone(o, 3200, .08, 'square', .04, -1200); tone(o, 2400, .12, 'triangle', .05, -900, .05); });
  cue('lit', (L, v) => { if (!M || (v !== me() && L.by.team !== me().team)) return; const o = outFor(null); tone(o, 1175, .12, 'triangle', .07); tone(o, 1568, .16, 'triangle', .06, 0, .09); });
  cue('glasshouse', H => { const o = outFor(at(H.x, H.y + 1, H.z), 1.4); tone(o, 110, 1.6, 'sine', .2, -20); hiss(o, 1.2, .08, 'bandpass', 3200, .1, 2); });
  cue('duelEnd', () => { const o = outFor(null); tone(o, 200, .6, 'sine', .1, 300); hiss(o, .5, .1, 'highpass', 2000); });
  cue('unlock', sk => { const o = outFor(null), t = sk.R.tier, notes = [523, 659, 784, 1046, 1318, 1568].slice(0, 3 + t);
    notes.forEach((f, i) => { tone(o, f, .5 + t * .1, 'triangle', .1, 0, i * .09); tone(o, f * 2, .35, 'sine', .04, 0, i * .09 + .02); });
    hiss(o, .6 + t * .2, .08, 'highpass', 6000, .05); if (t >= 3) { tone(o, 98, 1, 'sine', .3, -20, 0); hiss(o, 1.2, .1, 'bandpass', 2400, .3, 2); } });
  // the things the newer operatives leave in the world
  const at = (x, y, z) => ({ x, y: y - 1, z });
  cue('wavePop', w => { const o = outFor(at(w.x, w.y, w.z), 1.3); tone(o, 90, .45, 'sine', .5, -50); hiss(o, .35, .35, 'bandpass', 900, 0, .8); tone(o, 1800, .3, 'sawtooth', .05, -1400, .02); });
  cue('decoyPop', () => { const o = outFor(null); hiss(o, .3, .2, 'highpass', 3500); tone(o, 1400, .3, 'triangle', .08, -1000); });
  cue('lureStep', L => { const o = outFor(at(L.x, hAt(L.x, L.z) + 1, L.z)); hiss(o, .06, .32, 'lowpass', 420); tone(o, 95, .05, 'sine', .14, -30); });
  cue('lureShot', L => { const o = outFor(at(L.x, hAt(L.x, L.z) + 1, L.z)); const [d, cf, tf, tail, v] = SHOT.Rifle; hiss(o, d, .5 * v, 'bandpass', cf, 0, .6); hiss(o, tail, .16 * v, 'lowpass', 900, .02); tone(o, tf, .11, 'sine', .5 * v, -tf * .55); });
  cue('dartStick', D => tone(outFor(at(D.x, D.y, D.z)), 2200, .05, 'square', .05, -900));
  cue('dartPulse', D => { const o = outFor(at(D.x, D.y, D.z), 1.4); tone(o, 1500, .5, 'sine', .14, -900); tone(o, 2250, .4, 'sine', .06, -1300, .05); });
  cue('snared', (sn, v) => { const o = outFor(v || at(sn.x, sn.y + 1, sn.z)); tone(o, 700, .3, 'sawtooth', .1, -500); hiss(o, .25, .1, 'highpass', 3500); });
  cue('fireStart', F => { const o = outFor(at(F.x, F.y + 1, F.z), 1.2); hiss(o, .5, .45, 'lowpass', 700); hiss(o, 1.2, .12, 'bandpass', 1200, .1, .7); tone(o, 70, .4, 'sine', .3, -20); });
  cue('mineArm', m => { const o = outFor(at(m.x, m.y + 1, m.z)); tone(o, 1900, .06, 'square', .08); tone(o, 1900, .06, 'square', .08, 0, .14); tone(o, 2400, .08, 'square', .09, 0, .27); });
  cue('mineBoom', m => { const o = outFor(at(m.x, m.y + 1, m.z), 1.5); hiss(o, .7, .6, 'lowpass', 600); tone(o, 55, .6, 'sine', .6, -25); hiss(o, .2, .3, 'bandpass', 1800); });
  cue('sentryLock', s => { const o = outFor(at(s.x, s.y + 1, s.z)); tone(o, 1200, .07, 'square', .05); tone(o, 1600, .09, 'square', .05, 0, .12); });   // (the lock before it fires: a warning you can hear)
  cue('devSet', D => { if (!M || D.by.team !== me().team) return; tone(outFor(at(D.x, D.y + .5, D.z)), 1760, .12, 'sine', .03, -300); });
  cue('devFire', D => { const o = outFor(at(D.x, D.y + .5, D.z)); tone(o, 1320, .25, 'triangle', .06, 400); tone(o, 1980, .3, 'sine', .03, 0, .05); });
  cue('kitBreak', o => { const q = outFor(at(o.x != null ? o.x : o.ax, (o.y || 0) + .4, o.z != null ? o.z : o.az)); hiss(q, .18, .14, 'highpass', 5000); tone(q, 2600, .08, 'square', .03, -1200); });
  cue('kitPick', (f, D) => { if (f === me()) tone(outFor(null), 900, .08, 'triangle', .05, 300); });
  cue('wallHit', w => tone(outFor(at((w.x0 + w.x1) / 2, 1.5, (w.z0 + w.z1) / 2)), 140, .06, 'square', .05, -40));
  cue('wallBreak', w => { const o = outFor(at((w.x0 + w.x1) / 2, 1.5, (w.z0 + w.z1) / 2), 1.3); hiss(o, .5, .4, 'lowpass', 900); tone(o, 70, .4, 'sine', .3, -30); });
  cue('wallMend', w => { const o = outFor(at((w.x0 + w.x1) / 2, 1.5, (w.z0 + w.z1) / 2)); tone(o, 330, .35, 'triangle', .08, 200); });
  cue('beaconPulse', B => { if (M && B.by.team === me().team) tone(outFor(at(B.x, B.y + 1, B.z)), 780, .18, 'sine', .025, 120); });
  cue('sentryShot', s => { const o = outFor(at(s.x, s.y + 1.6, s.z), .8); hiss(o, .05, .32, 'bandpass', 2600, 0, .7); tone(o, 220, .06, 'square', .06, -120); });
  cue('sentryHit', s => tone(outFor(at(s.x, s.y + 1.6, s.z), .7), 1700, .04, 'square', .05, -500));
  cue('sentryDown', s => { const o = outFor(at(s.x, s.y + 1.6, s.z), 1.2); hiss(o, .5, .35, 'lowpass', 900); tone(o, 400, .5, 'sawtooth', .08, -330); });
  cue('throw', f => hiss(outFor(f), .12, .14, 'bandpass', 900));
  cue('nadeBounce', n => tone(outFor({ x: n.x, y: n.y - 1, z: n.z }), 900, .04, 'square', .05, -300));
  cue('nadePop', s => { const o = outFor({ x: s.x, y: s.y, z: s.z }); tone(o, 1200, .05, 'square', .06); hiss(o, .9, .26, 'lowpass', 700); });
  cue('flarePop', fl => { const o = outFor({ x: fl.x, y: fl.y - 1, z: fl.z }); hiss(o, .3, .4, 'highpass', 2500); tone(o, 1800, .2, 'sine', .15, 2000); });
  cue('plantStart', f => tone(outFor(f), 600, .1, 'square', .08)); cue('defuseStart', f => { const o = outFor(f); tone(o, 800, .08, 'square', .09); tone(o, 600, .08, 'square', .09, 0, .1); });
  cue('planted', () => { const o = outFor(null); [392, 554, 784].forEach((q, i) => tone(o, q, .2, 'triangle', .12, 0, i * .09)); });
  cue('defused', () => { const o = outFor(null); [523, 659, 784, 1047].forEach((q, i) => tone(o, q, .18, 'triangle', .12, 0, i * .07)); });
  cue('beep', () => {
    if (!(M && M.planted)) return; const ac = K.ac, now = ac.currentTime, L = lag(), o = () => outFor({ x: M.planted.x, y: 0, z: M.planted.z }, 1.4);
    const early = BEEP.q && Math.abs(BEEP.q.t - now) < .08; BEEP.q = null; if (!early) tone(o(), 1850, .06, 'square', .09);   // (unless this one was already started, early)
    const nx = M.planted.beep; if (L && nx - L > .03) { const st = nx - L, src = ac.createOscillator(), a = ac.createGain(), T0 = now + st; src.type = 'square'; src.frequency.value = 1850; a.gain.setValueAtTime(.09, T0); a.gain.exponentialRampToValueAtTime(.0001, T0 + .06); src.connect(a).connect(o()); src.start(T0); src.stop(T0 + .08); BEEP.q = { t: now + nx, st: T0, src }; }
  });
  cue('boom', (x, z) => { const o = outFor({ x, y: 0, z }, 1.6); hiss(o, 1.1, .7, 'lowpass', 500); tone(o, 60, .9, 'sine', .7, -35); hiss(o, .25, .4, 'bandpass', 1500); });
  cue('ping', (pg, f) => { if (pg.team !== me().team) return; const o = outFor(null); tone(o, 1320, .07, 'sine', .07); tone(o, 1760, .09, 'sine', .06, 0, .07); });
  cue('defuseHalf', f => { if (f.team !== me().team && f !== me()) return; tone(outFor(f), 990, .08, 'square', .05); });
  cue('buy', (f, ok) => { if (f === me()) tone(outFor(null), ok ? 990 : 170, ok ? .06 : .12, 'square', .06); });
  cue('round', () => tone(outFor(null), 440, .16, 'triangle', .09));
  cue('live', () => { const o = outFor(null); tone(o, 660, .1, 'triangle', .1); tone(o, 880, .2, 'triangle', .1, 0, .1); });
  cue('end', wi => { const o = outFor(null); if (wi === 0) [523, 659, 784].forEach((q, i) => tone(o, q, .2, 'triangle', .11, 0, i * .08)); else tone(o, 280, .5, 'triangle', .1, -130); });
  cue('over', won => { const o = outFor(null); (won ? [523, 659, 784, 1047, 1319] : [392, 330, 262]).forEach((q, i) => tone(o, q, .3, 'triangle', .12, 0, .4 + i * .12)); });
  const click = (ok = true) => { if (canHear()) tone(outFor(null), ok ? 880 : 200, .04, 'square', .04); };

  /* ---------- the map's own sounds: its mechanic, and a little life around it ----------
     No hiss beds: just the odd sound now and then, quiet and off to one side, so each place has a voice of its own. */
  const atPos = (x, z, v = 1) => outFor(M ? { x, z, y: 0 } : null, v);
  cue('tp', (f, from, to) => { for (const p of [from, to]) { const o = atPos(p[0], p[1]); tone(o, 220, .35, 'sine', .12, 900); tone(o, 880, .25, 'triangle', .05, -500, .05); } });
  cue('pad', f => { const o = outFor(f); tone(o, 140, .32, 'sine', .2, 420); tone(o, 600, .14, 'square', .03, 300); });
  cue('gate', (g, open) => { const G = GATES[g]; if (!G) return; const o = atPos(G.c[0], G.c[1]); tone(o, 70, .9, 'sawtooth', .07, open ? -20 : 30); hiss(o, .8, .05, 'lowpass', 300); tone(o, 120, .12, 'square', .1, -40, .85); });
  cue('gateJam', () => tone(outFor(null), 180, .12, 'square', .05, -60));
  cue('wallCut', (f, heavy, W) => { const o = atPos(W.end[0], W.end[2], 1); tone(o, heavy ? 95 : 120, .12, 'sine', .55, -50, 0); hiss(o, .09, .5, 'lowpass', 1400, 0, 1); hiss(o, .16, .22, 'bandpass', 2400, .01, .8); });
  cue('wallHit', b => { const B = BRKS[b]; if (!B || Math.random() < .6) return; const o = atPos(B.c[0], B.c[1], .7); hiss(o, .07, .08, 'bandpass', 900, 0, 1.2); });
  cue('wallDown', b => { const B = BRKS[b]; if (!B) return; const o = atPos(B.c[0], B.c[1], 1.3); hiss(o, 1.2, .4, 'lowpass', 700); tone(o, 60, .9, 'sine', .35, -25); for (let k = 0; k < 6; k++) hiss(o, .08, .12, 'bandpass', 1500 + Math.random() * 1500, .1 + k * .09, 2); });
  cue('vent', n => { const v = VENTS[n]; if (!v) return; const o = atPos(v[0], v[1]); hiss(o, 1.6, .08, 'highpass', 2600); tone(o, 95, .5, 'sine', .05, -30); });
  cue('storm', on2 => { if (!on2) return; const o = outFor(null, .8); hiss(o, 3.5, .06, 'bandpass', 520, 0, .6); });
  // life: a sound every few seconds, from somewhere out past the walls
  const AMB = { t: 4 };
  const ambOut = v => { const ac = K.ac, g = ac.createGain(); g.gain.value = v; if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.random() * 1.6 - .8; g.connect(p).connect(bus()); } else g.connect(bus()); return g; };
  const LIFE = {
    harbor: [o => { for (let k = 0; k < 2 + (Math.random() * 3 | 0); k++) tone(o, 1150 + Math.random() * 300, .22, 'sine', .05, -420, k * .26); },   // gulls
      o => tone(o, 110, 1.6, 'sawtooth', .025, -4),   // a ship's horn far off
      o => { tone(o, 660, 1.4, 'sine', .03); tone(o, 990, 1, 'sine', .012, 0, .02); }],   // a bell buoy
    neon: [o => { for (let k = 0; k < 4; k++) tone(o, k % 2 ? 700 : 950, .32, 'triangle', .02, 0, k * .34); },   // a siren streets away
      o => { tone(o, 420, .12, 'square', .025); tone(o, 420, .12, 'square', .025, 0, .18); },   // a horn
      o => tone(o, 120, .3, 'square', .02, 0)],   // a sign buzzing
    snow: [o => tone(o, 320, 2.2, 'sine', .022, 180),   // the wind in the mast
      o => { tone(o, 70, .3, 'sine', .08, -20); tone(o, 140, .2, 'triangle', .02, -40, .05); },   // the ice settling
      o => { for (let k = 0; k < 3; k++) tone(o, 2400 + k * 300, .4, 'sine', .01, 0, k * .2); }],   // a wind chime on the lodge
    desert: [o => tone(o, 2100, .9, 'sine', .03, -700),   // a hawk
      o => { for (let k = 0; k < 4; k++) tone(o, 1800 + Math.random() * 900, .6, 'sine', .012, 0, k * .15); },   // chimes
      o => tone(o, 260, 1.8, 'sine', .015, 120)],
    jungle: [o => { const b = 2400 + Math.random() * 900; for (let k = 0; k < 5; k++) tone(o, b * (1 + (Math.random() - .5) * .3), .07, 'sine', .04, b * .3, k * .1); },   // birds
      o => { for (let k = 0; k < 3; k++) tone(o, 160, .12, 'square', .03, -50, k * .22); },   // a frog
      o => { for (let k = 0; k < 10; k++) tone(o, 4200, .02, 'square', .008, 0, k * .05); }],   // insects
    lava: [o => tone(o, 48, 2.4, 'sine', .09, -10),   // the caldera rumbling
      o => { tone(o, 300, .15, 'triangle', .04, -120); tone(o, 240, .2, 'triangle', .03, -100, .12); },   // metal knocking
      o => tone(o, 90, .8, 'sawtooth', .02, -30)],
    autumn: [o => { for (let k = 0; k < 2 + (Math.random() * 2 | 0); k++) tone(o, 480 + Math.random() * 80, .22, 'sawtooth', .022, -180, k * .34); },   // rooks
      o => { tone(o, 392, 2.6, 'sine', .028); tone(o, 784, 1.6, 'sine', .01, 0, .01); },   // a church bell across the valley
      o => { for (let k = 0; k < 9; k++) tone(o, 950, .02, 'square', .012, -200, k * .055); }],   // a woodpecker
    space: [o => { for (let k = 0; k < 3; k++) tone(o, 1200 + k * 400, .06, 'sine', .03, 0, k * .09); },   // radio chatter
      o => tone(o, 80, 2, 'sine', .05, 6),   // the station's hum
      o => tone(o, 520, .5, 'triangle', .02, -300)],
  };
  function ambTick(dt) {
    if (!canHear() || !M || screen !== 'play' || M.over) return; AMB.t -= dt; if (AMB.t > 0) return;
    AMB.t = 4 + Math.random() * 7; const L = LIFE[MAP.theme]; if (!L) return; L[Math.floor(Math.random() * L.length)](ambOut(.9));
  }

  // the ultimates
  // the charge hits the floor mid-round: a bright ping for the attackers so they go and get it
  cue('charge', f => { if (f || !M || M.mode === 'demo' || M.phase !== 'live' || sideOf(me()) !== 'att') return; const o = outFor(null); [1175, 1568, 1175].forEach((q, i) => tone(o, q, .16, 'square', .045, 0, i * .11)); });
  on('qfound', () => { if (!K.ac) return; const o = outFor(null); [523, 659, 784, 1047].forEach((q, i) => tone(o, q, .22, 'triangle', .09, 0, i * .08)); });
  cue('novaRefund', f => { if (f !== me()) return; const o = outFor(null); [740, 1110].forEach((q, i) => tone(o, q, .14, 'triangle', .07, 0, i * .07)); });
  cue('ultReady', f => { if (f !== me()) return; const o = outFor(null); [660, 880, 1320].forEach((q, i) => tone(o, q, .3, 'triangle', .08, 0, i * .09)); });
  cue('ultUsed', f => { const o = outFor(f, 1.3); tone(o, 110, .9, 'sawtooth', .07, 220); tone(o, 440, .6, 'triangle', .05, 440, .1); hiss(o, .6, .08, 'bandpass', 1800, .05); });
  cue('orb', (o, f) => { const out = atPos(o.x, o.z); [990, 1320, 1760].forEach((q, i) => tone(out, q, .25, 'sine', .07, 0, i * .07)); });
  cue('nightwalk', (f, a, b) => { for (const p of [a, b]) { const o = atPos(p[0], p[1], 1.2); tone(o, 90, .7, 'sine', .14, -40); hiss(o, .5, .07, 'lowpass', 600); } });
  cue('bolt', (f, o2) => { const o = outFor(f, 1.4); tone(o, 1600, .35, 'sawtooth', .05, -1200); hiss(o, .25, .09, 'highpass', 3000); });
  cue('lockPop', L => { const o = atPos(L.x, L.z, 1.4); tone(o, 220, .8, 'square', .07, -150); tone(o, 1100, .5, 'sine', .05, -700, .05); });

  // the barriers dropping as the round goes live
  cue('live', () => { if (!M || M.mode === 'range') return; const o = outFor(null, .9); tone(o, 180, .5, 'sawtooth', .05, -120); hiss(o, .45, .06, 'highpass', 2200); });   // (the chime above says the round is live)
