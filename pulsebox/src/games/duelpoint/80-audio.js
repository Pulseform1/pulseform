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
    const ac = K.ac, g = ac.createGain(); let v = vol, pan = 0, muffle = false;
    if (M && f && f !== ear()) {
      const P = ear(), dx = f.x - P.x, dz = f.z - P.z, d = Math.hypot(dx, dz) || .01;
      v *= Math.pow(cl(1 - d / 55, .05, 1), 1.4); pan = cl((dx * Math.cos(P.yaw) - dz * Math.sin(P.yaw)) / d, -1, 1) * .85;
      muffle = los(P.x, eyeY(P), P.z, f.x, f.y + 1.2, f.z, false) < d - .6; if (muffle) v *= .6;
    }
    g.gain.value = v; let head = g;
    if (muffle) { const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 1100; lpf.connect(g); head = lpf; }
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
       v  how loud it plays */
  const GSND = {
    pip: { s: .6, p: [200, 75, .06, .8], c: [2700, .055, .75, .9], m: [3600, .016, .22], t: [1600, .26, .2], v: .85 },
    stub: { s: .5, p: [120, 38, .16, 1.1], c: [1100, .14, .8, .6], m: [2200, .02, .15], t: [900, .55, .3], v: 1.2 },
    wasp: { s: .6, p: [230, 95, .045, .7], c: [3000, .045, .7, .9], m: [4000, .012, .2], t: [1800, .18, .16], v: .8 },
    quill: { sup: 1, s: .25, p: [160, 70, .05, .5], c: [1100, .04, .35, 1.2], m: [3800, .01, .35], t: [900, .1, .06], v: .7 },
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
  const baked = {}, baking = {};
  function bakeShot(k) {
    const ac = K.ac, D = GSND[k]; if (!ac || !D || baking[k] || typeof OfflineAudioContext === 'undefined') return; baking[k] = 1;
    const sr = ac.sampleRate, dur = Math.max(D.t[1], D.p[2]) + (D.rack ? D.rack + .32 : 0) + .15, len = Math.ceil(sr * dur);
    let oc; try { oc = new OfflineAudioContext(1, len, sr); } catch (e) { return; }
    const nb = oc.createBuffer(1, sr, sr), ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    // everything is driven into a soft clip and a fast compressor: that is what makes it punch rather than hiss
    const mix = oc.createGain(), sh = oc.createWaveShaper(), comp = oc.createDynamicsCompressor(), cv = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; cv[i] = Math.tanh(2.4 * x) / Math.tanh(2.4); } sh.curve = cv;
    comp.threshold.value = -16; comp.ratio.value = 6; comp.attack.value = .001; comp.release.value = .1; comp.knee.value = 6;
    mix.gain.value = .7; mix.connect(sh).connect(comp).connect(oc.destination);
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
    if (D.rack) { const r = D.rack; noise(r, .05, .32, 'bandpass', 1900, 3); osc(r, 'square', 320, 260, .03, .06); noise(r + .13, .06, .38, 'bandpass', 1400, 3); osc(r + .13, 'square', 260, 200, .035, .07); }   // pump / bolt
    oc.startRendering().then(B => { const c0 = B.getChannelData(0); let pk = 0; for (let i = 0; i < c0.length; i++) pk = Math.max(pk, Math.abs(c0[i])); if (pk > 0) { const g = .92 / pk; for (let i = 0; i < c0.length; i++) c0[i] *= g; } baked[k] = B; }).catch(() => { baking[k] = 0; });
  }
  // bake every gun as a match starts (it takes a few milliseconds each, off the main sound path)
  on('round', () => { if (K.ac) for (const k in GSND) bakeShot(k); });
  // the gun's own shot, a hair higher or lower each time; far away it loses its edge. when: an audio-clock time (0: now)
  function shotAt(f, G, out, mine, when) {
    const ac = K.ac, src = ac.createBufferSource(), a = ac.createGain(); src.buffer = baked[G.k]; src.playbackRate.value = 1 + (Math.random() - .5) * .07; a.gain.value = GSND[G.k].v;
    let head = out; if (!mine && M) { const P = ear(), d = Math.hypot(f.x - P.x, f.z - P.z); if (d > 12) { const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = lp(15000, 2200, cl((d - 12) / 40, 0, 1)); lpf.connect(out); head = lpf; } }
    src.connect(a).connect(head); src.start(when || 0); return src;
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
    if (!first || !canHear()) return; const G = gun(f), mine = f === ear(), out = outFor(f, mine ? .6 : 1);
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
    if (key === 'vexq') tone(o, 500, .16, 'sine', .14, 1100); else if (key === 'vexe') hiss(o, .5, .2, 'lowpass', 500);
    else if (key === 'irisq') { tone(o, 1300, .25, 'sine', .12, -700); tone(o, 1300, .25, 'sine', .08, -700, .18); } else if (key === 'irise') hiss(o, .08, .12, 'highpass', 1800);
    else if (key === 'bastionq') { tone(o, 80, .35, 'sawtooth', .16, 90); hiss(o, .3, .14, 'lowpass', 600); }
    else if (key === 'novaq') { tone(o, 260, .4, 'sawtooth', .07, 620); tone(o, 520, .35, 'square', .03, 900, .05); hiss(o, .35, .08, 'bandpass', 2600, 0, 2); }
    else if (key === 'novae' || key === 'emberq') { hiss(o, .14, .14, 'bandpass', 1400, 0, 1.2); tone(o, 500, .1, 'triangle', .06, 260); }
    else if (key === 'wraithq') { tone(o, 1100, .6, 'sine', .07, -820); hiss(o, .6, .05, 'highpass', 5200); }
    else if (key === 'wraithe') hiss(o, .2, .06, 'highpass', 4000);
    else if (key === 'talonq') { hiss(o, .1, .16, 'highpass', 2600); tone(o, 1400, .06, 'triangle', .05, -400); }
    else if (key === 'talone' || key === 'axiome') { tone(o, 1250, .05, 'square', .05); tone(o, 1650, .05, 'square', .05, 0, .08); }
    else if (key === 'axiomq') { tone(o, 200, .22, 'square', .06, 240); tone(o, 900, .07, 'square', .05, 0, .26); tone(o, 1200, .07, 'square', .05, 0, .36); }
    else if (key === 'embere') { hiss(o, .7, .14, 'lowpass', 800); hiss(o, .5, .05, 'bandpass', 2200, .1, 1.5); }
    else tone(o, 660, .2, 'triangle', .1, 330);
  });
  // a skin unlocked: a fanfare that grows with the rarity
  cue('unlock', sk => { const o = outFor(null), t = sk.R.tier, notes = [523, 659, 784, 1046, 1318, 1568].slice(0, 3 + t);
    notes.forEach((f, i) => { tone(o, f, .5 + t * .1, 'triangle', .1, 0, i * .09); tone(o, f * 2, .35, 'sine', .04, 0, i * .09 + .02); });
    hiss(o, .6 + t * .2, .08, 'highpass', 6000, .05); if (t >= 3) { tone(o, 98, 1, 'sine', .3, -20, 0); hiss(o, 1.2, .1, 'bandpass', 2400, .3, 2); } });
  // the things the newer operatives leave in the world
  const at = (x, y, z) => ({ x, y: y - 1, z });
  cue('wavePop', w => { const o = outFor(at(w.x, w.y, w.z), 1.3); tone(o, 90, .45, 'sine', .5, -50); hiss(o, .35, .35, 'bandpass', 900, 0, .8); tone(o, 1800, .3, 'sawtooth', .05, -1400, .02); });
  cue('lureStep', L => { const o = outFor(at(L.x, hAt(L.x, L.z) + 1, L.z)); hiss(o, .06, .32, 'lowpass', 420); tone(o, 95, .05, 'sine', .14, -30); });
  cue('lureShot', L => { const o = outFor(at(L.x, hAt(L.x, L.z) + 1, L.z)); const [d, cf, tf, tail, v] = SHOT.Rifle; hiss(o, d, .5 * v, 'bandpass', cf, 0, .6); hiss(o, tail, .16 * v, 'lowpass', 900, .02); tone(o, tf, .11, 'sine', .5 * v, -tf * .55); });
  cue('dartStick', D => tone(outFor(at(D.x, D.y, D.z)), 2200, .05, 'square', .05, -900));
  cue('dartPulse', D => { const o = outFor(at(D.x, D.y, D.z), 1.4); tone(o, 1500, .5, 'sine', .14, -900); tone(o, 2250, .4, 'sine', .06, -1300, .05); });
  cue('snared', (sn, v) => { const o = outFor(v || at(sn.x, sn.y + 1, sn.z)); tone(o, 700, .3, 'sawtooth', .1, -500); hiss(o, .25, .1, 'highpass', 3500); });
  cue('fireStart', F => { const o = outFor(at(F.x, F.y + 1, F.z), 1.2); hiss(o, .5, .45, 'lowpass', 700); hiss(o, 1.2, .12, 'bandpass', 1200, .1, .7); tone(o, 70, .4, 'sine', .3, -20); });
  cue('mineArm', m => { const o = outFor(at(m.x, m.y + 1, m.z)); tone(o, 1900, .06, 'square', .08); tone(o, 1900, .06, 'square', .08, 0, .14); tone(o, 2400, .08, 'square', .09, 0, .27); });
  cue('mineBoom', m => { const o = outFor(at(m.x, m.y + 1, m.z), 1.5); hiss(o, .7, .6, 'lowpass', 600); tone(o, 55, .6, 'sine', .6, -25); hiss(o, .2, .3, 'bandpass', 1800); });
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
