// All sound is synthesised: wind in the trees, rain (and its drumming on the canvas when you are in the tent), the
// crackling fire, footsteps by surface, birds by day, crickets and owls by night, far-off elk and wolves, lapping
// lake water and running rivers. Nothing is loaded from files.
export class Audio {
  constructor() { this.ctx = null; this.on = true; this.vol = 0.8; this.t = 0; this.next = {}; }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.vol; this.master.connect(c.destination);
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
  shot(kind) {
    if (!this.ctx) return; const c = this.ctx;
    const big = kind !== 'shotgun';
    this.burst(big ? .55 : .45, 'lowpass', big ? 1400 : 1900, .7, .9, 0, 0, true);
    this.burst(.08, 'highpass', 2600, .5, .45);
    this.burst(1.8, 'lowpass', 240, .5, .35, 0, .04, true);
  }
  click() { if (this.ctx) this.burst(.04, 'bandpass', 2400, 4, .18); }
  mech(kind) { if (!this.ctx) return; if (kind === 'lever') { this.burst(.05, 'bandpass', 1800, 3, .2); this.burst(.06, 'bandpass', 1200, 3, .18, 0, .22); } else if (kind === 'reload') this.burst(.08, 'bandpass', 1500, 2, .15); else this.burst(.05, 'bandpass', 2600, 3, .16); }
  // animal voices, quieter and more echoing with distance
  animal(kind, dist, pan) {
    if (!this.ctx) return; const g = Math.max(.08, 1 - dist / 220);
    if (kind === 'snort') { this.burst(.25, 'bandpass', 700, 1.5, .25 * g, pan, 0, true); this.burst(.18, 'bandpass', 600, 1.5, .18 * g, pan, .32, true); }
    else if (kind === 'bear') { this.tone([110, 90, 80], [.4, .6], 'sawtooth', .05 * g, pan, 12, true); this.burst(.9, 'lowpass', 300, 1, .3 * g, pan, 0, true); }
    else if (kind === 'quack') { for (let i = 0; i < 3; i++) this.tone([480, 420], [.12], 'square', .025 * g, pan, 0, true, i * .18); }
    else if (kind === 'gobble') { for (let i = 0; i < 7; i++) this.tone([700 - i * 20, 520], [.05], 'square', .02 * g, pan, 0, true, i * .06); }
    else if (kind === 'grunt') this.tone([90, 70], [.5], 'sawtooth', .04 * g, pan, 6, true);
  }
  // env: { day, night, wind, rain, inTent, fireDist, fireFuel, waterDist, riverDist, forest, dt }
  update(e) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, now = c.currentTime, sm = (p, v, k = .25) => p.setTargetAtTime(v, now, k);
    sm(this.wind.g.gain, .05 + .22 * e.wind + .05 * e.rain); sm(this.wind.f.frequency, 260 + 520 * e.wind);
    sm(this.windHi.g.gain, (.006 + .03 * e.wind) * (.5 + e.forest)); sm(this.windHi.f.frequency, 700 + 900 * e.wind);
    sm(this.rain.g.gain, e.rain * (e.inTent ? .05 : .16)); sm(this.rainLow.g.gain, e.rain * (e.inTent ? .5 : .12));
    sm(this.rain.f.frequency, e.inTent ? 900 : 1800);
    const fireNear = Math.max(0, 1 - e.fireDist / 22) * e.fireFuel;
    sm(this.fireRoar.g.gain, fireNear * fireNear * .5);
    sm(this.water.g.gain, Math.max(0, 1 - e.waterDist / 30) * .25 * (.6 + .4 * Math.sin(now * .7) * Math.sin(now * .31)));
    sm(this.river.g.gain, Math.max(0, 1 - e.riverDist / 45) * .1);
    sm(this.crickets.g.gain, e.night * (1 - e.rain) * .012); this.crickets.lfo.frequency.value = 18 + 6 * Math.sin(now * .1);
    // rain drumming on canvas
    if (e.inTent && e.rain > .05) { const n = Math.floor(e.rain * 26 * e.dt + Math.random()); for (let i = 0; i < n; i++) this.burst(.05 + Math.random() * .05, 'bandpass', 500 + Math.random() * 900, 3, .05 + Math.random() * .07, Math.random() * 1.6 - .8, Math.random() * e.dt); }
    // fire crackles
    if (fireNear > .02 && Math.random() < e.dt * (3 + 9 * e.fireFuel)) { this.burst(.012 + Math.random() * .03, 'highpass', 1800 + Math.random() * 3000, .7, (.15 + Math.random() * .4) * fireNear, Math.random() - .5); if (Math.random() < .2) this.burst(.06, 'bandpass', 600, 1.5, .25 * fireNear); }
    const due = (k, min, max) => { if (!this.next[k]) this.next[k] = now + min + Math.random() * (max - min); if (now >= this.next[k]) { this.next[k] = now + min + Math.random() * (max - min); return true; } return false; };
    // birds by day in the trees
    if (e.day > .4 && e.rain < .4 && due('bird', 2, 7)) {
      const base = 2200 + Math.random() * 2600, n = 2 + Math.floor(Math.random() * 5), pan = Math.random() * 1.6 - .8, g = (.012 + Math.random() * .02) * (.4 + e.forest), kind = Math.random();
      for (let i = 0; i < n; i++) {
        const f = base * (kind < .5 ? 1 + (i % 2) * .25 : 1 + i * .06), d = kind < .5 ? .08 : .05;
        this.tone([f, f * (kind < .3 ? 1.4 : .8)], [d], 'sine', g, pan, 0, true, i * (d + .05));
      }
    }
    if (e.day > .3 && e.day < .9 && e.rain < .3 && due('dove', 25, 60)) { const f = 520 + Math.random() * 60, p = Math.random() - .5; this.tone([f, f * .92], [.5], 'sine', .02, p, 0, true); this.tone([f * .95, f * .9], [.35], 'sine', .018, p, 0, true, .7); this.tone([f * .95, f * .88], [.35], 'sine', .016, p, 0, true, 1.2); }
    if (e.night > .6 && due('owl', 18, 50)) { const f = 360 + Math.random() * 60, p = Math.random() * 1.4 - .7; this.tone([f, f * .94], [.32], 'sine', .03, p, 4, true); this.tone([f * 1.02, f * .9], [.5], 'sine', .03, p, 4, true, .5); }
    if (e.night > .7 && due('wolf', 70, 160)) { const f = 420 + Math.random() * 80, p = Math.random() * 1.6 - .8; this.tone([f * .8, f, f * 1.1, f * .95, f * .7], [.6, .9, 1.2, .8], 'sine', .02, p, 6, true); }
    if (e.day > .2 && due('elk', 90, 200)) { const p = Math.random() * 1.6 - .8; this.tone([600, 1300, 1550, 1450, 700], [.4, .6, .8, .3], 'sawtooth', .006, p, 9, true); this.tone([300, 650, 760, 720, 350], [.4, .6, .8, .3], 'sine', .01, p, 4, true); }
  }
}
