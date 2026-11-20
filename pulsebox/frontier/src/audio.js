// All sound is synthesised: wind in the trees, rain (and its drumming on the canvas when you are in the tent), the
// crackling fire, footsteps by surface, birds by day, crickets and owls by night, far-off elk and wolves, lapping
// lake water and running rivers. Nothing is loaded from files.
export class Audio {
  constructor() { this.ctx = null; this.on = true; this.vol = 0.8; this.t = 0; this.next = {}; }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.vol;
    this.limit = c.createDynamicsCompressor(); this.limit.threshold.value = -6; this.limit.knee.value = 4; this.limit.ratio.value = 14; this.limit.attack.value = .002; this.limit.release.value = .22;
    this.master.connect(this.limit); this.limit.connect(c.destination);
    // a shared space for far sounds
    this.verb = c.createConvolver(); const len = c.sampleRate * 2.6, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    this.verb.buffer = ir; this.verbGain = c.createGain(); this.verbGain.gain.value = .5; this.verb.connect(this.verbGain); this.verbGain.connect(this.master);
    const nb = c.createBuffer(1, c.sampleRate * 4, c.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; this.noise = nb;
    // brown noise for low rumbles
    const bb = c.createBuffer(1, c.sampleRate * 4, c.sampleRate), bd = bb.getChannelData(0); let last = 0; for (let i = 0; i < bd.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; } this.brown = bb;
    const loop = (buf, type, f, q, g = 0) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = .9 + Math.random() * .2; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const gn = c.createGain(); gn.gain.value = g; s.connect(fl); fl.connect(gn); gn.connect(this.master); s.start(); return { f: fl, g: gn }; };
    this.wind = loop(this.brown, 'lowpass', 500, .7); this.windHi = loop(this.noise, 'bandpass', 900, .6);
    this.rain = loop(this.noise, 'highpass', 1800, .5); this.rainLow = loop(this.brown, 'lowpass', 700, .5);
    this.fireRoar = loop(this.brown, 'lowpass', 260, .8);
    this.water = loop(this.brown, 'lowpass', 420, .8); this.river = loop(this.noise, 'bandpass', 1100, .7);
    // crickets: a pulsing tone
    const cr = c.createOscillator(); cr.type = 'triangle'; cr.frequency.value = 4400; const am = c.createGain(); am.gain.value = 0; const lfo = c.createOscillator(); lfo.frequency.value = 22; const lg = c.createGain(); lg.gain.value = .5;
    lfo.connect(lg); lg.connect(am.gain); const cg = c.createGain(); cg.gain.value = 0; cr.connect(am); am.connect(cg); cg.connect(this.master); cr.start(); lfo.start(); this.crickets = { g: cg, lfo };
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  burst(dur, type, f, q, gain, pan = 0, when = 0, toVerb = false) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(), t = c.currentTime + when; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + Math.min(.01, dur * .2)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    const p = c.createStereoPanner(); p.pan.value = pan; s.connect(fl); fl.connect(g); g.connect(p); p.connect(toVerb ? this.verb : this.master); if (toVerb) p.connect(this.master);
    s.start(t, Math.random() * 3, dur + .05);
  }
  tone(freqs, durs, type, gain, pan, vib = 0, toVerb = true, when = 0) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), p = c.createStereoPanner(); o.type = type; p.pan.value = pan;
    let t = c.currentTime + when; o.frequency.setValueAtTime(freqs[0], t); g.gain.setValueAtTime(0, t);
    let tt = t; for (let i = 1; i < freqs.length; i++) { tt += durs[i - 1]; o.frequency.linearRampToValueAtTime(freqs[i], tt); }
    const total = durs.reduce((a, b) => a + b, 0); g.gain.linearRampToValueAtTime(gain, t + Math.min(.05, total * .2)); g.gain.setValueAtTime(gain, t + total * .7); g.gain.exponentialRampToValueAtTime(.0001, t + total);
    if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + total + .1); }
    o.connect(g); g.connect(p); p.connect(this.master); if (toVerb) p.connect(this.verb); o.start(t); o.stop(t + total + .1);
  }
  step(surface, run) {
    if (!this.ctx) return; const k = run ? 1.3 : 1;
    if (surface === 'water' || surface === 'swim') { this.burst(.28, 'bandpass', 900 + Math.random() * 500, .8, .12 * k); this.burst(.12, 'highpass', 2500, .5, .05 * k, 0, .03); }
    else if (surface === 'floor') this.burst(.09, 'lowpass', 300, .7, .22 * k);
    else if (surface === 'dirt') { this.burst(.09, 'bandpass', 380 + Math.random() * 120, 1.2, .2 * k); this.burst(.05, 'highpass', 3000, .5, .025 * k, 0, .01); }
    else if (surface === 'rock') { this.burst(.07, 'bandpass', 900, 2, .16 * k); }
    else { this.burst(.14, 'highpass', 1800 + Math.random() * 900, .5, .055 * k); this.burst(.08, 'lowpass', 280, .6, .12 * k); }
  }
  // Gunshots, built in layers: the supersonic crack (rifle only), the muzzle blast, a low thump you feel more than hear,
  // and the roll of the shot off the hills (a long tail and a couple of distinct echoes). The long rifle is the loudest
  // thing in the country and rolls on for seconds; the shotguns are a deep boom; the revolver a sharper, smaller bang.
  thump(f0, f1, dur, gain, when = 0) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + when; o.type = 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .05);
  }
  echo(when, gain, f, dur) { this.burst(dur, 'lowpass', f, .6, gain, Math.random() * 1.2 - .6, when, true); }
  shot(kind) {
    if (!this.ctx) return;
    if (kind === 'rifle') {
      this.burst(.006, 'highpass', 4200, .7, 1.1);                    // crack
      this.burst(.22, 'lowpass', 2600, .7, 1.25, 0, 0, true);          // blast
      this.burst(.5, 'lowpass', 900, .7, .7, 0, .01, true);
      this.thump(78, 32, .45, 1.1);                                    // the punch
      this.burst(3.4, 'lowpass', 230, .5, .62, 0, .06, true);          // the roll off the hills
      this.echo(.55, .32, 700, .7); this.echo(1.25, .22, 500, 1.1); this.echo(2.3, .12, 380, 1.4);
      return;
    }
    if (kind === 'shotgun' || kind === 'double') {
      const k = kind === 'double' ? 1.08 : 1;
      this.burst(.005, 'highpass', 3000, .7, .55 * k);
      this.burst(.3, 'lowpass', 1900, .6, 1.05 * k, 0, 0, true);
      this.burst(.55, 'lowpass', 600, .7, .55 * k, 0, .01, true);
      this.thump(kind === 'double' ? 72 : 88, 38, .32, .95 * k);
      this.burst(2.1, 'lowpass', 210, .5, .42 * k, 0, .05, true);
      this.echo(.5, .24 * k, 600, .7); this.echo(1.2, .13 * k, 420, 1);
      return;
    }
    // the revolver
    this.burst(.004, 'highpass', 3600, .7, .42);
    this.burst(.14, 'bandpass', 1500, .8, .55, 0, 0, true);
    this.burst(.25, 'lowpass', 1100, .7, .3, 0, .005, true);
    this.thump(150, 70, .14, .38);
    this.burst(1, 'lowpass', 320, .5, .16, 0, .04, true);
    this.echo(.45, .1, 700, .5);
  }
  hurt(dmg) { if (!this.ctx) return; this.burst(.25, 'lowpass', 420, 1, .5); this.tone([180, 120], [.25], 'sawtooth', .04 + dmg / 1200, 0, 0, false); }
  splash(big, pan = 0) { if (!this.ctx) return; this.burst(big ? .5 : .22, 'bandpass', big ? 700 : 1300, .8, big ? .4 : .18, pan); this.burst(.15, 'highpass', 2500, .5, .08, pan, .03); }
  reel(on) { if (this.ctx && on) this.burst(.03, 'bandpass', 3200 + Math.random() * 600, 6, .05); }
  click() { if (this.ctx) this.burst(.04, 'bandpass', 2400, 4, .18); }
  mech(kind) { if (!this.ctx) return; if (kind === 'bolt') { this.burst(.04, 'bandpass', 2000, 3, .2); this.burst(.07, 'bandpass', 1300, 3, .2, 0, .14); this.burst(.05, 'bandpass', 2200, 3, .2, 0, .32); } else if (kind === 'pump') { this.burst(.08, 'bandpass', 900, 2, .3); this.burst(.07, 'bandpass', 1400, 2, .28, 0, .18); } else if (kind === 'break') { this.burst(.06, 'bandpass', 1600, 3, .25); this.burst(.12, 'bandpass', 700, 2, .15, 0, .1); } else if (kind === 'cock') this.burst(.03, 'bandpass', 3000, 4, .2); else if (kind === 'reload') this.burst(.08, 'bandpass', 1500, 2, .15); else this.burst(.05, 'bandpass', 2600, 3, .16); }
  // animal voices, quieter and more echoing with distance
  animal(kind, dist, pan) {
    if (!this.ctx) return; const g = Math.max(.08, 1 - dist / 220);
    if (kind === 'snort') { this.burst(.25, 'bandpass', 700, 1.5, .25 * g, pan, 0, true); this.burst(.18, 'bandpass', 600, 1.5, .18 * g, pan, .32, true); }
    else if (kind === 'bear') { this.tone([110, 90, 80], [.4, .6], 'sawtooth', .05 * g, pan, 12, true); this.burst(.9, 'lowpass', 300, 1, .3 * g, pan, 0, true); }
    else if (kind === 'quack') { for (let i = 0; i < 3; i++) this.tone([480, 420], [.12], 'square', .025 * g, pan, 0, true, i * .18); }
    else if (kind === 'gobble') { for (let i = 0; i < 7; i++) this.tone([700 - i * 20, 520], [.05], 'square', .02 * g, pan, 0, true, i * .06); }
    else if (kind === 'grunt') this.tone([90, 70], [.5], 'sawtooth', .04 * g, pan, 6, true);
    // the dangerous ones: a grizzly's roar, a bull moose's bellow, a cougar's scream, a wolf's snarl
    else if (kind === 'roar') { this.tone([150, 95, 70, 60], [.3, .7, .6], 'sawtooth', .09 * g, pan, 18, true); this.burst(1.6, 'lowpass', 420, 1.2, .55 * g, pan, 0, true); this.burst(1.2, 'bandpass', 220, 1.5, .35 * g, pan, .2, true); }
    else if (kind === 'bellow') { this.tone([120, 160, 90], [.5, .9], 'sawtooth', .07 * g, pan, 8, true); this.burst(1.2, 'lowpass', 300, 1, .3 * g, pan, 0, true); }
    else if (kind === 'scream') { this.tone([900, 1500, 1200, 700], [.25, .5, .5], 'sawtooth', .05 * g, pan, 30, true); this.burst(1, 'bandpass', 1800, 2, .25 * g, pan, 0, true); }
    else if (kind === 'snarl') { for (let i = 0; i < 4; i++) this.tone([200 + i * 15, 160], [.18], 'sawtooth', .04 * g, pan, 25, true, i * .16); this.burst(.7, 'bandpass', 500, 2, .25 * g, pan, 0, true); }
  }
  // env: { day, night, wind, rain, inTent, fireDist, fireFuel, waterDist, riverDist, forest, dt }
  update(e) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, now = c.currentTime, sm = (p, v, k = .25) => p.setTargetAtTime(v, now, k);
    // the background is kept low and soft: a breath of wind, the water, birds now and then
    const gl = e.gloom || 0;   // deep in the timber: a lower, steadier moan of wind, fewer birds, and things in the dark
    sm(this.wind.g.gain, .006 + .03 * e.wind + .015 * e.rain + .012 * gl); sm(this.wind.f.frequency, (200 + 300 * e.wind) * (1 - .45 * gl));
    sm(this.windHi.g.gain, (.0006 + .003 * e.wind) * (.5 + e.forest)); sm(this.windHi.f.frequency, 700 + 900 * e.wind);
    sm(this.rain.g.gain, e.rain * (e.inTent ? .03 : .06)); sm(this.rainLow.g.gain, e.rain * (e.inTent ? .2 : .045));
    sm(this.rain.f.frequency, e.inTent ? 900 : 1800);
    const fireNear = Math.max(0, 1 - e.fireDist / 22) * e.fireFuel;
    sm(this.fireRoar.g.gain, fireNear * fireNear * .18);
    sm(this.water.g.gain, Math.max(0, 1 - e.waterDist / 30) * .06 * (.6 + .4 * Math.sin(now * .7) * Math.sin(now * .31)));
    sm(this.river.g.gain, Math.max(0, 1 - e.riverDist / 45) * .025);
    sm(this.crickets.g.gain, e.night * (1 - e.rain) * .0018); this.crickets.lfo.frequency.value = 18 + 6 * Math.sin(now * .1);
    // rain drumming on canvas
    if (e.inTent && e.rain > .05) { const n = Math.floor(e.rain * 26 * e.dt + Math.random()); for (let i = 0; i < n; i++) this.burst(.05 + Math.random() * .05, 'bandpass', 500 + Math.random() * 900, 3, .05 + Math.random() * .07, Math.random() * 1.6 - .8, Math.random() * e.dt); }
    // fire crackles
    if (fireNear > .02 && Math.random() < e.dt * (3 + 9 * e.fireFuel)) { this.burst(.012 + Math.random() * .03, 'highpass', 1800 + Math.random() * 3000, .7, (.05 + Math.random() * .12) * fireNear, Math.random() - .5); if (Math.random() < .2) this.burst(.06, 'bandpass', 600, 1.5, .08 * fireNear); }
    const due = (k, min, max) => { if (!this.next[k]) this.next[k] = now + min + Math.random() * (max - min); if (now >= this.next[k]) { this.next[k] = now + min + Math.random() * (max - min); return true; } return false; };
    // birds by day in the trees
    if (e.day > .4 && e.rain < .4 && due('bird', 8, 20) && Math.random() > gl * .85) {
      const base = 2200 + Math.random() * 2600, n = 2 + Math.floor(Math.random() * 5), pan = Math.random() * 1.6 - .8, g = (.004 + Math.random() * .006) * (.4 + e.forest), kind = Math.random();
      for (let i = 0; i < n; i++) {
        const f = base * (kind < .5 ? 1 + (i % 2) * .25 : 1 + i * .06), d = kind < .5 ? .08 : .05;
        this.tone([f, f * (kind < .3 ? 1.4 : .8)], [d], 'sine', g, pan, 0, true, i * (d + .05));
      }
    }
    if (e.day > .3 && e.day < .9 && e.rain < .3 && due('dove', 25, 60)) { const f = 520 + Math.random() * 60, p = Math.random() - .5; this.tone([f, f * .92], [.5], 'sine', .011, p, 0, true); this.tone([f * .95, f * .9], [.35], 'sine', .01, p, 0, true, .7); this.tone([f * .95, f * .88], [.35], 'sine', .009, p, 0, true, 1.2); }
    if (gl > .35) {
      if (due('creak', 9, 24)) this.tone([62 + Math.random() * 30, 48 + Math.random() * 20, 70], [.7, .9], 'sawtooth', .006 * gl, Math.random() * 1.6 - .8, 3, true);   // a trunk creaking
      if (due('snap', 14, 38)) { const p = Math.random() < .5 ? -.9 : .9; this.burst(.03, 'highpass', 2600, .8, .12 * gl, p, 0, true); this.burst(.02, 'highpass', 3200, .8, .08 * gl, p, .09, true); }   // a twig snaps, off to one side
      if (due('moan', 18, 45)) this.burst(2.6, 'bandpass', 320, 2.2, .05 * gl, Math.random() * 1.4 - .7, 0, true);   // wind moaning through the trunks
      if (gl > .6 && due('growl', 40, 95)) this.animal('grunt', 130, Math.random() * 1.6 - .8);   // something big, somewhere out there
    }
    if (e.night > .6 && due('owl', 18, 50)) { const f = 360 + Math.random() * 60, p = Math.random() * 1.4 - .7; this.tone([f, f * .94], [.32], 'sine', .014, p, 4, true); this.tone([f * 1.02, f * .9], [.5], 'sine', .014, p, 4, true, .5); }
    if (e.night > .7 && due('wolf', 70, 160)) { const f = 420 + Math.random() * 80, p = Math.random() * 1.6 - .8; this.tone([f * .8, f, f * 1.1, f * .95, f * .7], [.6, .9, 1.2, .8], 'sine', .01, p, 6, true); }
    if (e.day > .2 && due('elk', 90, 200)) { const p = Math.random() * 1.6 - .8; this.tone([600, 1300, 1550, 1450, 700], [.4, .6, .8, .3], 'sawtooth', .003, p, 9, true); this.tone([300, 650, 760, 720, 350], [.4, .6, .8, .3], 'sine', .005, p, 4, true); }
  }
}
