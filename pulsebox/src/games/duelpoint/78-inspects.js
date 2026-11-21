  /* ---------- 78 inspects: the 22 shows, one for each line from Legendary up ----------
     Each: dur (seconds), kf (how the gun is turned: [q, dx, dy, dz, rx, ry, rz], ry about 1.1 holds it side-on across your
     view with the muzzle to the left), fx (the light, run every frame with c.q going 0..1; see 78-inspect for what c
     offers), snd (its sound, scheduled when it starts), b (what the second cloud of points is: stars unless said).
     Times in fx and kf are shares of the whole (q); in snd they are seconds.

     LEGENDARY   inferno      a torch lit at the muzzle             storm       a ball of lightning, discharged
                 nebula       a galaxy turning over the receiver    phoenix     wings of flame unfold, beat once, burn away
                 aurora       curtains of polar light above it      tempest     a thunderhead that strikes the gun three times
                 prism        white light split into a rainbow      magmaflow   lava poured from the muzzle, then an eruption
                 permafrost   ice grows down the barrel, shatters   fission     an atom spun up to a blue flash
                 cinderwake   swept through the air, a wake of fire
     MYTHIC      voidline     a black hole ahead of the muzzle      solaris     a sunrise behind the sight
                 celestial    a constellation drawn star by star    abyss       cracks that beat like a heart
                 spectrum     the gun split into red, green, blue   eclipse     a black moon crosses a gold sun
                 overclock    a boot sequence, then an overvolt     ghostfire   a spirit circles the gun and dives in
     PARAGON     starforge    a star gathered, hammered and lit     riftborn    the air torn open, the gun pushed through
                 glyphbound   rune rings, a great seal, a pillar of light */
  const ifr = x => x - Math.floor(x), IW = () => iC('#ffffff'), IBLK = () => iC('#000000');
  const INSPECT = {
    inferno: { dur: 4,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.16, .08, -.02, -.02, .22, 1.1, .1], [.5, .08, -.01, -.02, .3, 1.16, .02], [.74, .08, -.015, -.02, .26, 1.12, .12], [.8, .08, 0, -.02, .36, 1.12, .06], [.9, .02, .01, -.02, .12, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, on = e(q, .2, .3, .74, .8), run = cl((q - .1) / .2, 0, 1), lit = e(q, .1, .14, .74, .8), mz = c.W(c.mz), fl = .85 + .15 * Math.sin(c.t * 31) * Math.sin(c.t * 17), dark = iC('#a81c00');
        c.boost(e(q, .1, .3, .7, .92) * 1.4);
        // fire catches at the receiver and runs up the barrel
        if (lit > .02) { const bar = () => c.W(c.P(irs() * .012, c.ax + .014, c.along(.25 + Math.random() * .75 * run)));
          c.emit(c.rate('bb', 70 * lit), p => { c.put(p, bar()); p.vx = irs() * .04; p.vy = irr(.1, .24); p.vz = irs() * .04; p.g = .2; p.drag = 1.2; p.life = irr(.25, .45); p.s = irr(.022, .036); p.s1 = .25; p.fade = 1; p.col = c.c1; p.col2 = dark; p.a = .9; }, 2);
          c.emit(c.rate('bl', 40 * lit), p => { c.put(p, bar()); p.vy = irr(.1, .22); p.g = .2; p.drag = 1.2; p.life = irr(.2, .4); p.s = irr(.007, .012); p.s1 = .3; p.fade = 1; p.col = c.c2; p.col2 = c.c1; }); }
        // and the torch at the muzzle
        if (on > .02) { c.shade(mz.clone().addScaledVector(IUP, .08), .6, .35 * on); c.spW(SFX.glow, mz.clone().addScaledVector(IUP, .04), .3 * on * fl, .36 * on * fl, c.c1, .8 * on); c.spW(SFX.glow, mz.clone().addScaledVector(IUP, .03), .09 * fl, .14 * fl, c.c2, .9 * on); c.light(c.c1, 2 * on * fl, c.mz);
          const fire = (p, s0, s1) => { c.put(p, mz); p.x += irs() * .02; p.z += irs() * .02; p.vx = irs() * .1; p.vz = irs() * .1; p.vy = irr(.3, .62); p.g = .3; p.drag = 1.1; p.life = irr(.35, .6); p.s = irr(s0, s1); p.s1 = .2; p.fade = 1; };
          c.emit(c.rate('fb', 95 * on), p => { fire(p, .04, .065); p.col = c.c1; p.col2 = dark; p.a = .9; }, 2); c.emit(c.rate('fl', 70 * on), p => { fire(p, .018, .03); p.col = c.c2; p.col2 = c.c1; }); }
        if (q > .12 && q < .9) c.emit(c.rate('em', 20), p => { c.put(p, c.W(c.P(irs() * .02, c.ax + .012, c.along(Math.random())))); p.vx = irs() * .1; p.vy = irr(.1, .3); p.vz = irs() * .1; p.drag = .6; p.life = irr(.9, 1.5); p.s = irr(.005, .008); p.col = c.c1; p.col2 = iC('#3a0a02'); }, 2);
        if (c.once('puff', .78)) c.emit(c.n(60), p => { const d = rdir(); c.put(p, mz); p.vx = d.x * irr(.2, .7); p.vy = Math.abs(d.y) * irr(.2, .8); p.vz = d.z * irr(.2, .7); p.g = -1.5; p.life = irr(.4, .8); p.s = irr(.005, .009); p.col = c.c2; p.col2 = c.c1; });
        const pq = (q - .78) / .12; if (pq > 0 && pq < 1) { c.spW(SFX.ring, mz, .1 + sm(pq) * .6, .1 + sm(pq) * .6, c.c1, (1 - pq) * (1 - pq)); c.light(c.c2, 3 * (1 - pq), c.mz); } },
      snd(o) { hiss(o, 2.3, .07, 'bandpass', 420, .6, .8); tone(o, 70, 2.2, 'sawtooth', .025, 50, .6); for (let i = 0; i < 11; i++) hiss(o, .04, .05, 'highpass', 3000 + Math.random() * 3000, .8 + i * .2 + Math.random() * .1); hiss(o, .4, .13, 'lowpass', 900, 3.1); tone(o, 120, .3, 'sine', .12, -60, 3.1); } },

    storm: { dur: 4,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.14, -.05, .05, -.1, 0, 1.1, .1], [.5, -.05, .055, -.1, .05, 1.15, .05], [.69, -.05, .055, -.1, .05, 1.15, .05], [.72, -.02, .04, -.06, .12, 1.02, -.1], [.8, -.05, .05, -.1, 0, 1.1, .05], [.9, -.02, .02, -.04, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, ch = e(q, .14, .3, .69, .7), mz = c.W(c.mz), ball = sm(cl((q - .25) / .44, 0, 1)) * (q < .7 ? 1 : 0), f = .8 + .2 * Math.sin(c.t * 47);
        c.boost(ch * (.5 + .7 * Math.random()) + e(q, .7, .71, .74, .9) * 2.5);
        if (ch > .02) {
          for (let i = 0; i < 3; i++) { const u = (c.t * (.5 + i * .13) + i * .37) % 1, a = c.W(c.P(0, c.ax + .02, c.along(u * .8))), b = c.W(c.P(0, c.ax + .015, c.along(Math.min(1, u * .8 + .2 + i * .04)))); c.arc(a, b, .02, i % 2 ? c.c2 : c.c1, ch, .04 + i * .012); }
          c.shade(mz, .55, .4 * ch); c.spW(SFX.glow, mz, .05 + ball * .15 * f, .05 + ball * .15 * f, c.c1, .5 + ball * .5); c.spW(SFX.glow, mz, .02 + ball * .05, .02 + ball * .05, c.c2, .95);
          for (let i = 0; i < 2; i++) c.arc(mz, mz.clone().add(rdir().multiplyScalar(.04 + ball * .1)), .02, c.c2, ball, .03);
          c.arc(c.W(c.rc), mz, .03, c.c1, ball * .8, .06); c.light(c.c1, .8 + ball * 1.6 * f, c.mz);
          c.emit(c.rate('sp', 22 * ball), p => { const d = rdir(); c.put(p, mz); p.vx = d.x * .3; p.vy = d.y * .3; p.vz = d.z * .3; p.g = -1.2; p.life = irr(.2, .45); p.s = .0045; p.col = c.c2; p.col2 = c.c1; });
        }
        if (c.once('zap', .7)) { c.st.z = mz.clone().addScaledVector(c.fw, .9).add(V3(irs() * .2, .28, 0)); c.emit(c.n(70), p => { const d = rdir(); c.put(p, mz); p.vx = d.x * irr(.3, 1.2); p.vy = d.y * irr(.3, 1.2); p.vz = d.z * irr(.3, 1.2); p.g = -1.6; p.drag = 1; p.life = irr(.3, .7); p.s = irr(.004, .007); p.col = IW(); p.col2 = c.c1; }); }
        const dq = (q - .7) / .09; if (dq > 0 && dq < 1 && c.st.z) { const a = 1 - dq; for (let i = 0; i < 3; i++) c.arc(mz, c.st.z, .07 + i * .03, i ? c.c1 : IW(), a * 1.5, .03); c.beam(mz, c.st.z, .05 * a, c.c2, a);
          c.spW(SFX.glow, mz, .6 * a + .1, .6 * a + .1, c.c2, a * 1.2); c.spW(SFX.ring, mz, .1 + sm(dq) * .7, .1 + sm(dq) * .7, c.c1, a * a); c.light(c.c2, 6 * a, c.mz); c.shake(.006 * a); }
        const af = e(q, .79, .8, .84, .93); if (af > .02) for (let i = 0; i < 2; i++) c.arc(c.W(c.P(0, c.ax + .02, c.along(ifr(i * .37 + c.t)))), c.W(c.P(0, c.ax + .02, c.along(ifr(i * .61 + c.t * 1.3)))), .015, c.c1, af, .05); },
      snd(o) { tone(o, 110, 2.2, 'sawtooth', .02, 260, .55); tone(o, 55, 2.2, 'square', .012, 0, .55); for (let i = 0; i < 16; i++) hiss(o, .03, .05, 'highpass', 5000, .7 + i * .13 + Math.random() * .06); hiss(o, .09, .3, 'highpass', 2500, 2.8); hiss(o, .9, .2, 'lowpass', 500, 2.82); tone(o, 60, .8, 'sine', .22, -25, 2.82); } },

    nebula: { dur: 4.2,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.16, -.07, .01, -.09, -.05, .9, .6], [.5, -.08, .02, -.09, -.08, 1.0, .75], [.8, -.07, .02, -.09, -.05, .92, .6], [.84, -.07, .035, -.08, .02, .92, .55], [.93, -.02, .02, -.03, 0, .3, .1], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, on = e(q, .14, .32, .7, .82), col = sm(cl((q - .7) / .11, 0, 1)), cy = c.top + .06, C = c.P(0, cy, c.rc.z), CW = c.W(C), R = .17 * on * (1 - col * .95), G = insTex('galaxy');
        c.boost(on * .8);
        if (on > .01) {
          c.shade(CW, .7, .45 * on); c.pn(G, C, [-Math.PI / 2, 0, c.t * 1.1], R * 2.3, R * 2.3, c.c1, .85 * on); c.pl(G, C, [-Math.PI / 2, 0, c.t * 1.1], R * 2.3, R * 2.3, c.c1, .5 * on); c.pl(G, C, [-Math.PI / 2 + .25, .2, -c.t * 1.7 + 1], R * 1.4, R * 1.4, c.c2, .7 * on);
          c.sp(SFX.glow, C, .05 + .02 * Math.sin(c.t * 3) + col * .1, .05 + .02 * Math.sin(c.t * 3) + col * .1, c.c2, on);
          for (let i = 0; i < 46; i++) { const s1 = ifr(i * .618), s2 = ifr(i * .3819 + .2), r = (.025 + s1 * .15) * on * (1 - col), a = i * 2.4 + c.t * 1.6 / Math.sqrt(.2 + s1);
            c.dot(c.W(c.P(Math.cos(a) * r, cy + Math.sin(a) * r * (s2 - .5) * .5, C.z + Math.sin(a) * r)), .005 + s2 * .007, i % 3 === 0 ? IW() : i % 3 === 1 ? c.c1 : c.c2, (.5 + .5 * Math.sin(c.t * 5 + i)) * on, i % 4 === 0 ? 1 : 0); }
          c.light(c.c1, .8 * on + col * 2, C);
        }
        if (c.once('nova', .82)) for (const b of [0, 1]) c.emit(c.n(b ? 30 : 60), p => { const d = rdir(); c.put(p, CW); const v = irr(.25, .95); p.vx = d.x * v; p.vy = d.y * v; p.vz = d.z * v; p.drag = 1.5; p.life = irr(.5, 1.1); p.s = irr(.005, .009); p.col = c.c2; p.col2 = c.c1; }, b);
        const nq = (q - .82) / .1; if (nq > 0 && nq < 1) { c.spW(SFX.glow, CW, .5 * (1 - nq) + .05, .5 * (1 - nq) + .05, c.c2, 1 - nq); c.spW(SFX.ring, CW, .05 + sm(nq) * .5, .05 + sm(nq) * .5, c.c1, (1 - nq) * (1 - nq)); c.light(c.c2, 4 * (1 - nq), C); } },
      snd(o) { for (const [f, d] of [[196, .6], [294, .75], [392, .9], [587, 1.1]]) { tone(o, f, 2.6, 'sine', .035, 0, d); tone(o, f * 1.007, 2.4, 'sine', .02, 0, d); } hiss(o, 2.4, .02, 'bandpass', 1800, .7, 6); tone(o, 880, .5, 'sine', .05, -700, 3.0); tone(o, 1568, .9, 'triangle', .05, 0, 3.45); hiss(o, .5, .08, 'highpass', 5000, 3.45); } },

    phoenix: { dur: 4.4,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.16, -.09, .03, -.12, .15, .55, .05], [.42, -.09, .05, -.12, .25, .6, 0], [.56, -.09, .02, -.12, .12, .6, 0], [.64, -.09, .085, -.12, .38, .6, 0], [.74, -.09, .05, -.12, .25, .6, 0], [.84, -.08, .04, -.1, .2, .55, 0], [.93, -.02, .02, -.03, .05, .2, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, open = sm(cl((q - .18) / .2, 0, 1)), flap = q > .5 && q < .74 ? Math.sin((q - .5) / .24 * TAU) : 0, gone = sm(cl((q - .74) / .05, 0, 1)), on = open * (1 - gone), sz = .34 * lp(.6, 1, cl(c.len / .6, 0, 1)), rzv = lp(-1.5, -.1, open) + flap * .42, Wg = insTex('wing');
        const feather = (sx, u) => { const a = rzv + irr(.45, 1.3); return c.W(c.P(sx * u * sz * Math.cos(a), c.top + u * sz * Math.sin(a), c.rc.z + u * sz * .3)); };
        c.boost(on * 1.1 + e(q, .74, .75, .8, .9) * 1.5);
        if (on > .01) { c.shade(c.W(c.tp).addScaledVector(IUP, sz * .4), sz * 3.2, .3 * on);
          for (const sx of [1, -1]) { c.pn(Wg, c.tp, [0, -sx * .3, sx * rzv], sx * sz * open, sz * open, c.c1, .96 * on, c.wingG); c.pn(Wg, c.P(0, c.top, c.rc.z - .004), [0, -sx * .3, sx * (rzv + .1)], sx * sz * .62 * open, sz * .62 * open, c.c2, .95 * on, c.wingG); c.pl(Wg, c.tp, [0, -sx * .3, sx * rzv], sx * sz * open * 1.04, sz * open * 1.04, c.c1, .4 * on, c.wingG); }
          c.sp(SFX.glow, c.tp, .12 * on, .12 * on, c.c2, on); c.light(c.c1, 1.4 * on + Math.abs(flap), c.tp);
          c.emit(c.rate('fe', 44 * on), p => { c.put(p, feather(Math.random() < .5 ? 1 : -1, irr(.25, 1))); p.vx = irs() * .08; p.vy = irr(.08, .25); p.vz = irs() * .08; p.drag = .5; p.life = irr(.7, 1.2); p.s = irr(.005, .009); p.col = c.c1; p.col2 = iC('#7a1804'); }, 2); }
        if (c.once('burn', .74)) for (const b of [2, 1]) c.emit(c.n(b === 1 ? 40 : 100), p => { c.put(p, feather(Math.random() < .5 ? 1 : -1, irr(.15, 1))); p.vx = irs() * .25; p.vy = irr(.2, .75); p.vz = irs() * .25; p.g = .15; p.drag = .9; p.life = irr(.9, 1.6); p.s = irr(.007, .013); p.col = b === 1 ? c.c2 : c.c1; p.col2 = iC('#5a1204'); }, b);
        const bq = (q - .74) / .1; if (bq > 0 && bq < 1) { const tw = c.W(c.tp); c.spW(SFX.glow, tw, .7 * (1 - bq) + .1, .5 * (1 - bq) + .1, c.c1, 1 - bq); c.light(c.c2, 4 * (1 - bq), c.tp); } },
      snd(o) { hiss(o, .5, .08, 'bandpass', 900, .75, 1); tone(o, 220, .5, 'triangle', .04, 300, .75); hiss(o, 1.4, .05, 'bandpass', 500, 1.2, .8); for (const d of [2.2, 2.75]) { hiss(o, .32, .12, 'lowpass', 700, d); tone(o, 90, .3, 'sine', .08, -30, d); } tone(o, 1400, .5, 'sawtooth', .035, -500, 3.2); tone(o, 1750, .6, 'triangle', .04, -700, 3.25); hiss(o, 1, .1, 'bandpass', 1200, 3.25, .7); } },

    aurora: { dur: 4.6,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.16, -.05, 0, -.1, 0, 1.15, .3], [.5, -.06, .01, -.1, .03, 1.2, .38], [.84, -.05, 0, -.1, 0, 1.12, .3], [.93, -.02, 0, -.03, 0, .3, .05], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, on = e(q, .14, .34, .76, .9), A = insTex('aurora'), base = c.W(c.P(0, c.top, c.along(.5))), teal = iC('#3ae8d0'); A.offset.x = c.t * .035;
        c.boost(on * .7);
        [[c.c1, .6, .28, 0, 0], [c.c2, .46, .21, .07, .03], [teal, .52, .32, -.08, -.03]].forEach(([col, w, h, dx, dz], i) => { const at = base.clone().add(V3(dx + Math.sin(c.t * .6 + i * 2) * .02, h * .5 * (.7 + .3 * on) + .012, dz)), rot = [0, 0, Math.sin(c.t * .5 + i) * .05], op = on * (.6 + .2 * Math.sin(c.t * 1.3 + i * 2.1)); c.pnW(A, at, rot, w * (i % 2 ? -1 : 1), h * (.7 + .3 * on), col, op * .85); c.plW(A, at, rot, w * (i % 2 ? -1 : 1), h * (.7 + .3 * on), col, op * .5); });
        c.shade(base.clone().addScaledVector(IUP, .14), 1.0, .22 * on);
        if (on > .05) { for (const b of [0, 1]) c.emit(c.rate('m' + b, b ? 6 : 12), p => { c.put(p, base.clone().add(V3(irs() * .55, irr(.1, .3), irs() * .1))); p.vx = irs() * .03; p.vy = -.04; p.life = irr(1.5, 2.4); p.s = irr(.004, .007); p.col = Math.random() < .5 ? c.c1 : c.c2; p.fade = 1; }, b);
          for (let i = 0; i < 12; i++) { const tw = Math.pow(Math.max(0, Math.sin(c.t * 2 + i * 1.7)), 6); c.dot(c.W(c.P(0, c.top + .004, c.along(ifr(i * .618)))), .014 * tw, IW(), tw * on, 1); }
          c.light(c.c1, .9 * on, c.tp); } },
      snd(o) { for (const [f, d] of [[262, .6], [330, .9], [392, 1.2], [494, 1.6], [659, 2.1]]) { tone(o, f, 2.6, 'sine', .03, 0, d); tone(o, f * 2.003, 2.2, 'sine', .012, 0, d + .1); } hiss(o, 3.2, .018, 'bandpass', 3200, .6, 8); } },

    tempest: { dur: 4.4,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.14, -.05, 0, -.1, 0, 1.1, .1], [.375, -.05, 0, -.1, 0, 1.1, .1], [.395, -.05, -.018, -.1, -.05, 1.1, .15], [.45, -.05, 0, -.1, 0, 1.1, .1], [.515, -.05, 0, -.1, 0, 1.12, .1], [.535, -.05, -.018, -.1, -.04, 1.12, .04], [.59, -.05, 0, -.1, 0, 1.1, .1], [.675, -.05, 0, -.1, 0, 1.1, .1], [.695, -.05, -.026, -.1, -.07, 1.08, .16], [.77, -.05, .005, -.1, 0, 1.1, .1], [.9, -.02, 0, -.04, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, on = e(q, .12, .28, .78, .9), cc = c.W(c.P(0, c.top, c.along(.45))).addScaledVector(IUP, .21), Ct = insTex('cloud'), dark = iC('#232a38');
        for (let i = 0; i < 5; i++) c.dk(Ct, cc.clone().add(V3((i - 2) * .09 + Math.sin(c.t * .7 + i) * .012, Math.sin(i * 1.9) * .02, (i % 2) * .02)), .32 - Math.abs(i - 2) * .03, dark, .92 * on);
        c.emit(c.rate('rain', 75 * on), p => { c.put(p, cc.clone().add(V3(irs() * .42, -.03, irs() * .08))); p.vx = -.08; p.vy = -1.1; p.life = .24; p.s = .0045; p.col = iC('#7f96b4'); p.a = .85; }, 2);
        const hit = [c.P(0, c.top, c.along(.3)), c.P(0, c.ax + .012, c.along(.75)), c.mz];
        [.38, .52, .68].forEach((ts, i) => { const h = c.W(hit[i]), from = cc.clone().add(V3((i - 1) * .09, -.05, 0)), sq = (q - ts) / .055;
          if (c.once('s' + i, ts)) c.emit(c.n(28), p => { const d = rdir(); c.put(p, h); p.vx = d.x * .6; p.vy = Math.abs(d.y) * .7; p.vz = d.z * .6; p.g = -1.8; p.life = irr(.3, .6); p.s = irr(.004, .007); p.col = IW(); p.col2 = c.c1; });
          if (sq > 0 && sq < 1) { const a = 1 - sq; c.beam(from, h, .03 * a, IW(), a); c.arc(from, h, .04, IW(), a * 1.6, .03, .014); c.arc(from, h, .055, c.c1, a, .03, .01); c.arc(from, h, .03, c.c2, a, .02, .008);
            c.spW(SFX.glow, h, .3 * a + .05, .3 * a + .05, c.c2, a); c.spW(SFX.glow, from, .4, .2, c.c1, a * .8); c.light(c.c2, 6 * a, hit[i]); c.shake(.004 * a); } });
        const af = e(q, .68, .7, .78, .9); c.boost(on * .4 + af * 2);
        if (af > .02) for (let i = 0; i < 2; i++) c.arc(c.W(c.P(0, c.ax + .02, c.along(ifr(i * .37 + c.t)))), c.W(c.P(0, c.ax + .02, c.along(ifr(i * .61 + c.t * 1.3)))), .016, c.c1, af, .05); },
      snd(o) { hiss(o, 3.3, .03, 'lowpass', 300, .5); hiss(o, 2.8, .012, 'highpass', 6000, .7); for (const d of [1.67, 2.29, 2.99]) { hiss(o, .07, .28, 'highpass', 2000, d); hiss(o, .9, .2, 'lowpass', 420, d + .03); tone(o, 55, .9, 'sine', .2, -20, d + .03); } } },

    prism: { dur: 4.2,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.14, .09, .03, -.03, 0, 1.05, .1], [.3, .09, .04, -.03, .08, 1.12, .3], [.5, .08, .04, -.03, -.06, .9, -.35], [.7, .09, .045, -.03, .12, 1.15, .25], [.82, .09, .04, -.03, 0, 1.05, 0], [.92, .02, .02, -.02, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, hit = e(q, .14, .2, .8, .88), on = e(q, .2, .28, .8, .9), F = insTex('fan'), mz = c.W(c.mz), bk = c.W(c.bk);
        c.boost(on * .9);
        c.beam(bk.clone().addScaledVector(c.fw, -.75), bk, .016, IW(), hit); c.beam(bk.clone().addScaledVector(c.fw, -.75), bk, .05, IW(), hit * .35);
        c.shade(bk.clone().addScaledVector(c.fw, -.3), .5, .3 * hit);
        if (on > .01) { c.pn(F, c.mz, [0, Math.PI / 2, 0], .7 * on, .62 * on, IW(), .9 * on, c.fanG); c.pl(F, c.mz, [0, Math.PI / 2, 0], .7 * on, .62 * on, IW(), .3 * on, c.fanG); c.pn(F, c.mz, [.9, Math.PI / 2, 0, 'YXZ'], .6 * on, .5 * on, IW(), .6 * on, c.fanG); c.pn(F, c.mz, [-.9, Math.PI / 2, 0, 'YXZ'], .6 * on, .5 * on, IW(), .6 * on, c.fanG);
          c.spW(SFX.glow, mz, .09, .09, IW(), on);
          for (let i = 0; i < 16; i++) { const tw = Math.pow(Math.max(0, Math.sin(c.t * 3 + i * 2.1)), 5); c.dot(c.W(c.P((i % 2 ? -1 : 1) * .024, c.ax + (ifr(i * .37) - .35) * .06, c.along(ifr(i * .618)))), .02 * tw, hueC(ifr(i * .21) + c.t * .2, .7), tw * on, 1); }
          c.emit(c.rate('rb', 28 * on), p => { const d = rdir(); c.put(p, mz); const v = irr(.2, .5); p.vx = c.fw.x * v + d.x * .12; p.vy = c.fw.y * v + d.y * .12; p.vz = c.fw.z * v + d.z * .12; p.drag = .8; p.life = irr(.5, .9); p.s = irr(.005, .008); p.col = hueC(Math.random()); p.fade = 1; }, Math.random() < .4 ? 1 : 0);
          c.light(hueC(c.t * .3, .7), 1.1 * on, c.rc); }
        const fq = (q - .2) / .07; if (fq > 0 && fq < 1) { const r = c.W(c.rc); c.spW(SFX.glow, r, .4 * (1 - fq), .4 * (1 - fq), IW(), 1 - fq); c.light(IW(), 4 * (1 - fq), c.rc); } },
      snd(o) { tone(o, 2093, .5, 'sine', .05, 0, .82); [1047, 1319, 1568, 2093, 2637, 3136].forEach((f, i) => tone(o, f, 1.8, 'sine', .028, 0, .9 + i * .09)); hiss(o, 2.2, .015, 'highpass', 8000, .9); [2637, 2093, 1568].forEach((f, i) => tone(o, f, .8, 'triangle', .02, 0, 2.6 + i * .12)); } },

    magmaflow: { dur: 4.2,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.14, .07, .06, -.03, -.25, 1.05, .1], [.3, .07, .08, -.03, -.42, 1.05, .15], [.5, .07, .07, -.03, -.38, 1.1, .1], [.58, .06, .02, -.03, 0, 1.1, 0], [.61, .06, .002, -.03, -.05, 1.1, 0], [.68, .06, .03, -.03, .05, 1.1, 0], [.84, .06, .03, -.03, 0, 1.1, 0], [.93, .02, .02, -.02, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, pour = e(q, .16, .26, .5, .56), mz = c.W(c.mz), vent = c.P(0, c.top, c.along(.32)), vw = c.W(vent), dark = iC('#5a0a00'), pr = e(q, .46, .59, .6, .61);
        c.boost(e(q, .1, .3, .56, .6) + e(q, .6, .61, .7, .9) * 2.2);
        c.emit(c.rate('dr', 44 * pour), p => { c.put(p, Math.random() < .6 ? mz : c.W(c.P(0, c.ax - .02, c.along(irr(.5, 1))))); p.vx = irs() * .03; p.vy = -.05; p.vz = irs() * .03; p.g = -1.4; p.life = irr(.5, .8); p.s = irr(.014, .024); p.s1 = .5; p.col = c.c1; p.col2 = dark; p.a = 1.2; }, 2);
        c.emit(c.rate('dh', 18 * pour), p => { c.put(p, mz); p.vy = -.05; p.g = -1.4; p.life = irr(.4, .7); p.s = irr(.008, .013); p.col = c.c2; p.col2 = c.c1; });
        if (pour > .02) { c.spW(SFX.glow, mz, .08, .08, c.c1, pour * .85); c.light(c.c1, 1.2 * pour, c.mz); }
        c.sp(SFX.glow, vent, .06 + pr * .14, .06 + pr * .14, c.c2, pr); if (pour > .02) c.shade(mz, .4, .3 * pour);
        const blob = (p, wide, hot) => { c.put(p, vw); p.vx = irs() * wide; p.vy = irr(.5, 1.15); p.vz = irs() * wide; p.g = -1.9; p.life = irr(.6, 1.1); p.s = irr(.016, .03) * (hot ? .5 : 1); p.s1 = .4; p.col = hot ? c.c2 : c.c1; p.col2 = dark; p.a = 1.2; };
        if (c.once('er', .6)) { c.emit(c.n(90), p => blob(p, .55), 2); c.emit(c.n(50), p => blob(p, .55, 1)); }
        const eq = (q - .6) / .14; if (eq > 0 && eq < 1) { c.emit(c.rate('fo', 80 * (1 - eq)), p => blob(p, .25), 2); c.emit(c.rate('fh', 40 * (1 - eq)), p => blob(p, .25, 1)); c.spW(SFX.glow, vw, .6 * (1 - eq) + .1, .6 * (1 - eq) + .1, c.c1, 1 - eq); c.spW(SFX.glow, vw.clone().addScaledVector(IUP, .1), .2, .5 * (1 - eq), c.c2, 1 - eq); c.spW(SFX.ring, vw, .08 + sm(eq) * .5, .08 + sm(eq) * .5, c.c2, (1 - eq) * (1 - eq)); c.light(c.c1, 5 * (1 - eq), vent); if (eq < .3) c.shake(.006); }
        if (q > .7 && q < .9) c.emit(c.rate('sm', 12), p => { c.put(p, c.W(c.P(irs() * .02, c.top, c.along(irr(.1, .6))))); p.vy = irr(.05, .12); p.vx = irs() * .04; p.life = irr(.8, 1.3); p.s = irr(.004, .006); p.col = c.c1; p.col2 = dark; }); },
      snd(o) { hiss(o, 1.6, .05, 'lowpass', 350, .65, .9); for (let i = 0; i < 9; i++) tone(o, 140 + Math.random() * 80, .12, 'sine', .05, -60, .8 + i * .16); tone(o, 50, .9, 'sawtooth', .04, 60, 1.75); hiss(o, .12, .25, 'lowpass', 2000, 2.52); hiss(o, 1.1, .2, 'lowpass', 500, 2.54); tone(o, 60, 1, 'sine', .25, -25, 2.54); for (let i = 0; i < 8; i++) hiss(o, .04, .04, 'highpass', 3500, 2.7 + i * .13); } },

    permafrost: { dur: 4.4, b: 'flake',
      kf: [[0, 0, 0, 0, 0, 0, 0], [.14, -.05, .045, -.1, 0, 1.05, .15], [.45, -.05, .05, -.1, .03, 1.2, .25], [.7, -.05, .05, -.1, .05, 1.25, .3], [.735, -.04, .05, -.09, .05, .95, -.2], [.8, -.05, .05, -.1, 0, 1.1, .1], [.92, -.02, .02, -.04, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, N = 10, gone = q >= .72, fz = cl((q - .14) / .5, 0, 1), pos = [];
        c.boost(e(q, .16, .6, .72, .73) * 1.2 + e(q, .72, .73, .76, .86) * 2); c.light(c.c1, .7 * e(q, .14, .3, .7, .72), c.rc);
        for (let i = 0; i < N; i++) { const u = (i + .5) / N, s1 = ifr(i * .618), g = sm(cl((q - .16 - i * .045) / .09, 0, 1)), hy = (.04 + .05 * s1) * g, y = lp(c.top, c.ax + .016, cl((u - .32) / .2, 0, 1)), p = c.P((ifr(i * .37) - .5) * .016, y + hy * .7, c.along(.08 + u * .9)); pos.push(p);
          if (!gone && g > 0) { c.cn(p, [.015 * g, hy, .015 * g], [(s1 - .5) * .9, i, (s1 - .5) * .5], i % 2 ? iC('#9fdcff') : iC('#e6f6ff'), .88); const tw = Math.pow(Math.max(0, Math.sin(c.t * 3 + i * 1.9)), 8); c.dot(c.W(c.P(p.x, p.y + hy, p.z)), .02 * tw, IW(), tw, 1); } }
        if (!gone && q > .14) { c.tor(c.P(0, c.ax, c.along(fz)), .042, [0, 0, 0], c.c2, e(q, .14, .18, .6, .66)); c.sp(SFX.glow, c.P(0, c.ax, c.along(fz)), .1, .1, c.c1, e(q, .14, .18, .6, .66) * .6);
          c.emit(c.rate('mist', 24), p => { c.put(p, c.W(c.P(irs() * .02, c.ax, c.along(Math.random() * fz)))); p.vx = irs() * .03; p.vy = -.035; p.life = irr(.9, 1.4); p.s = irr(.014, .022); p.s1 = 1.8; p.a = .3; p.col = IW(); p.fade = 1; }, 2);
          c.emit(c.rate('fl', 10), p => { c.put(p, c.W(c.P(0, c.top, c.along(Math.random()))).add(V3(irs() * .2, irr(.08, .2), irs() * .06))); p.vx = irs() * .05; p.vy = -.09; p.life = irr(1.4, 2); p.s = irr(.008, .013); p.col = IW(); p.fade = 1; }, 1); }
        if (c.once('sh', .72)) { for (const p0 of pos) { const w = c.W(p0); for (const b of [0, 1]) c.emit(c.n(b ? 3 : 7), p => { const d = rdir(); c.put(p, w); const v = irr(.3, 1); p.vx = d.x * v; p.vy = d.y * v + .2; p.vz = d.z * v; p.g = -1.7; p.life = irr(.4, .8); p.s = irr(.004, .009); p.col = c.c2; p.col2 = c.c1; }, b); } }
        const sq = (q - .72) / .1; if (sq > 0 && sq < 1) { const m = c.P(0, c.ax, c.along(.5)), a = (1 - sq) * (1 - sq); c.tor(m, .04 + sm(sq) * .2, [0, 0, 0], c.c1, a * .55); c.tor(m, .03 + sm(sq) * .12, [0, .5, 0], c.c1, a * .4); const mw = c.W(m); c.spW(SFX.glow, mw, .4 * (1 - sq), .4 * (1 - sq), IW(), 1 - sq); c.light(c.c2, 5 * (1 - sq), m); if (sq < .3) c.shake(.007); } },
      snd(o) { for (let i = 0; i < 10; i++) { tone(o, 2400 + i * 180 + Math.random() * 200, .12, 'sine', .03, 0, .7 + i * .2); hiss(o, .05, .03, 'highpass', 7000, .7 + i * .2); } hiss(o, 2.4, .02, 'highpass', 5000, .6); hiss(o, .1, .28, 'highpass', 3500, 3.17); for (let i = 0; i < 12; i++) tone(o, 2000 + Math.random() * 3000, .25, 'sine', .03, 0, 3.18 + Math.random() * .25); tone(o, 180, .4, 'sine', .1, -80, 3.17); } },

    fission: { dur: 4.2,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.16, -.06, .03, -.1, .1, .8, .45], [.5, -.06, .035, -.1, .12, .85, .5], [.67, -.06, .035, -.1, .12, .85, .5], [.7, -.045, .02, -.08, .05, .8, .42], [.78, -.06, .035, -.1, .1, .8, .45], [.9, -.02, .02, -.04, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, on = e(q, .14, .28, .8, .9), up = sm(cl((q - .2) / .48, 0, 1)), sp = 2 + 16 * up, C = c.P(0, c.top + .08, c.rc.z), CW = c.W(C), a0 = c.st.a = (c.st.a || 0) + sp * c.dt, T = [[1.1, 0], [-.5, 1.0], [.4, -1.1]], pu = .8 + .2 * Math.sin(a0 * 2);
        c.boost(on * .8 + e(q, .68, .69, .74, .9) * 2);
        if (on > .01) { c.shade(CW, .5, .4 * on); c.sp(SFX.glow, C, (.05 + .05 * up) * pu * on, (.05 + .05 * up) * pu * on, c.c1, on); c.sp(SFX.glow, C, .02, .02, IW(), on);
          T.forEach(([tx, ty], i) => { const r = .058 + i * .005, sg = i % 2 ? -1 : 1; c.tor(C, r, [tx, ty, a0 * sg + i * 2], i ? c.c1 : c.c2, .95 * on, i > 0);
            const ph = a0 * 1.7 * sg + i * 2.1, p = c.W(V3(r * Math.cos(ph), r * Math.sin(ph), 0).applyEuler(new THREE.Euler(tx, ty, 0)).add(C)); c.dot(p, .013, IW(), on); c.dot(p, .03, c.c2, .5 * on); });
          c.light(c.c1, 1 + up * 1.5, C); }
        if (c.once('crit', .68)) c.emit(c.n(85), p => { const d = rdir(); c.put(p, CW); const v = irr(.6, 1.5); p.vx = d.x * v; p.vy = d.y * v; p.vz = d.z * v; p.drag = .8; p.life = irr(.3, .6); p.s = irr(.005, .008); p.col = c.c2; p.col2 = c.c1; });
        const fq = (q - .68) / .12; if (fq > 0 && fq < 1) { const a = 1 - fq; c.spW(SFX.glow, CW, .6 * a + .1, .6 * a + .1, IW(), a); c.spW(SFX.ring, CW, .08 + sm(fq) * .6, .08 + sm(fq) * .6, c.c1, a * a); c.light(c.c1, 6 * a, C); if (fq < .25) c.shake(.006); }
        c.spW(SFX.glow, CW, .55, .55, c.c1, e(q, .68, .7, .8, .92) * .45); },
      snd(o) { tone(o, 60, 2.2, 'sawtooth', .02, 200, .6); tone(o, 120, 2.2, 'sine', .03, 400, .6); let t = .7, gap = .3; while (t < 2.8) { hiss(o, .012, .09, 'highpass', 4000, t); gap = Math.max(.03, gap * .86); t += gap; } hiss(o, .08, .25, 'highpass', 3000, 2.86); tone(o, 880, .9, 'sine', .08, -600, 2.86); tone(o, 70, .8, 'sine', .22, -30, 2.86); } },

    cinderwake: { dur: 4.2,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.14, 0, .03, -.1, 0, .9, .1], [.32, -.16, .06, -.12, .1, 1.25, .2], [.5, -.2, .03, -.1, -.05, 1.3, .05], [.68, -.04, .06, -.12, .1, .95, -.1], [.82, -.06, .04, -.1, 0, 1.1, .1], [.92, -.02, .02, -.04, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, on = e(q, .12, .18, .8, .86), mz = c.W(c.mz), dark = iC('#8a1200'), bar = () => c.W(c.P(irs() * .012, c.ax + irs() * .012, c.along(irr(.35, 1))));
        c.boost(on * 1.1 + e(q, .46, .5, .54, .6));
        c.emit(c.rate('tr', 150 * on), p => { c.put(p, bar()); p.vx = irs() * .03; p.vy = irr(.03, .12); p.vz = irs() * .03; p.drag = .5; p.life = irr(.6, 1.1); p.s = irr(.01, .018); p.s1 = .2; p.col = c.c2; p.col2 = c.c1; });
        c.emit(c.rate('bd', 110 * on), p => { c.put(p, bar()); p.vy = irr(.05, .14); p.life = irr(.5, .9); p.s = irr(.035, .06); p.s1 = .4; p.a = .85; p.col = c.c1; p.col2 = dark; p.fade = 1; }, 2);
        c.emit(c.rate('st', 22 * on), p => { const d = rdir(); c.put(p, bar()); p.vx = d.x * .3; p.vy = d.y * .3 + .15; p.vz = d.z * .3; p.g = -.8; p.life = irr(.3, .6); p.s = irr(.006, .01); p.col = c.c2; }, 1);
        if (on > .02) { const mid = c.W(c.P(0, c.ax, c.along(.65))); c.spW(SFX.glow, mid, .5, .22, c.c1, on * .6); c.spW(SFX.glow, mz, .16, .16, c.c2, on * .9); c.light(c.c1, 2 * on, c.mz); }
        if (c.once('flare', .5)) c.emit(c.n(55), p => { const d = rdir(); c.put(p, bar()); p.vx = d.x * .5; p.vy = Math.abs(d.y) * .6; p.vz = d.z * .5; p.g = -.6; p.drag = 1; p.life = irr(.5, .9); p.s = irr(.005, .009); p.col = c.c2; p.col2 = c.c1; }); },
      snd(o) { hiss(o, .9, .1, 'bandpass', 600, .55, .7); hiss(o, .9, .1, 'bandpass', 800, 1.5, .7); hiss(o, 1, .1, 'bandpass', 500, 2.2, .7); tone(o, 80, 2.6, 'sawtooth', .02, 40, .55); for (let i = 0; i < 14; i++) hiss(o, .035, .045, 'highpass', 3500 + Math.random() * 2500, .7 + i * .19 + Math.random() * .08); } },

    voidline: { dur: 4.8,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.14, .04, .05, -.12, 0, .8, .05], [.3, .03, .05, -.12, 0, .84, .05], [.72, .0, .05, -.16, .03, .9, .08], [.76, .06, .05, -.07, -.03, .72, 0], [.84, .04, .05, -.12, 0, .8, 0], [.93, -.01, .02, -.04, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, grow = sm(cl((q - .18) / .18, 0, 1)), col = sm(cl((q - .74) / .04, 0, 1)), on = grow * (1 - col), H = c.W(c.mz).addScaledVector(c.fw, .13), r = .055 * on;
        c.boost(on + e(q, .78, .8, .88, .94) * 1.5);
        if (on > .01) { c.dk(insTex('disc'), H, r * 2, IBLK(), 1); c.plW(SFX.ring, H, [0, 0, 0], r * 5.2, r * 5.2, c.c1, .9 * on); c.plW(SFX.portal, H, [0, 0, -c.t * 3.2], r * 6.6, r * 6.6, c.c2, .6 * on); c.plW(SFX.portal, H, [0, 0, c.t * 1.7], r * 9.5, r * 9.5, c.c1, .32 * on); c.spW(SFX.glow, H, r * 9, r * 9, c.c1, .35 * on);
          for (const b of [0, 1]) c.emit(c.rate('su' + b, (b ? 30 : 75) * on), p => { const d = rdir().multiplyScalar(irr(.3, .5)); p.x = H.x + d.x; p.y = H.y + d.y; p.z = H.z + d.z * .4; p.vx = -d.y * 1.2; p.vy = d.x * 1.2; c.to(p, H, 16); p.drag = 1.5; p.life = irr(.45, .7); p.s = irr(.004, .008); p.s1 = .2; p.col = c.c2; p.col2 = c.c1; p.fade = 2; }, b);
          for (let i = 0; i < 10; i++) { const u = ifr(c.t * .9 + i * .1); c.dot(c.W(c.P(0, c.ax + .02 * Math.sin(i * 2.3), c.along(.3 + u * .7))), .007, c.c2, on * u); }
          c.shake(.0022 * on); c.light(c.c1, 1.3 * on, c.mz); }
        if (c.once('imp', .77)) c.emit(c.n(75), p => { const d = rdir(); c.put(p, H); const v = irr(.3, 1.1); p.vx = d.x * v; p.vy = d.y * v; p.vz = d.z * v; p.drag = 2; p.life = irr(.4, .7); p.s = irr(.005, .008); p.col = c.c2; p.col2 = c.c1; });
        const cq = (q - .765) / .1; if (cq > 0 && cq < 1) { c.spW(SFX.glow, H, .7 * (1 - cq), .7 * (1 - cq), c.c2, 1 - cq); c.spW(SFX.ring, H, .05 + sm(cq) * .6, .05 + sm(cq) * .6, c.c1, (1 - cq) * (1 - cq)); c.light(c.c2, 6 * (1 - cq), c.mz); }
        for (let i = 0; i < 3; i++) { const rq = (q - .78 - i * .035) / .12; if (rq > 0 && rq < 1) c.tor(c.P(0, c.ax, c.along(1 - rq)), .036, [0, 0, 0], i % 2 ? c.c2 : c.c1, Math.sin(rq * Math.PI)); } },
      snd(o) { tone(o, 45, 2.9, 'sawtooth', .04, 90, .8); tone(o, 90, 2.9, 'sine', .05, 180, .8); hiss(o, 2.8, .04, 'bandpass', 300, .85, 3); tone(o, 1200, 2.6, 'sine', .012, -900, .9); hiss(o, .25, .2, 'lowpass', 2500, 3.62); tone(o, 50, 1, 'sine', .3, -22, 3.66); for (let i = 0; i < 3; i++) tone(o, 700 - i * 150, .3, 'triangle', .04, -200, 3.8 + i * .17); } },

    solaris: { dur: 4.8,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.16, -.07, .06, -.1, .3, .8, .1], [.42, -.08, .1, -.1, .4, .85, .1], [.7, -.08, .085, -.1, .33, .85, .08], [.84, -.06, .05, -.1, .15, .9, .05], [.93, -.02, .02, -.04, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, rise = sm(cl((q - .15) / .25, 0, 1)), on = e(q, .15, .3, .78, .9), Sg = c.P(0, c.top - .03 + rise * .13, c.rc.z), S0 = c.W(Sg), fl = 1 + .04 * Math.sin(c.t * 9), Ry = insTex('rays');
        c.boost(on * 1.2);
        if (on > .01) { c.pnW(Ry, S0, [0, 0, c.t * .25], .66 * on * fl, .66 * on * fl, c.c1, .6 * on); c.plW(Ry, S0, [0, 0, c.t * .25], .66 * on * fl, .66 * on * fl, c.c2, .4 * on); c.pnW(Ry, S0, [0, 0, -c.t * .4 + 1], .42 * on, .42 * on, c.c2, .6 * on); c.snW(insTex('disc'), S0, .075 * on, .075 * on, iC('#fff6d8'), on);
          c.spW(SFX.glow, S0, .65, .65, c.c1, .3 * on); c.spW(SFX.glow, S0, .28 * on, .28 * on, c.c1, .9 * on); c.spW(SFX.glow, S0, .1 * on * fl, .1 * on * fl, IW(), on); c.spW(SFX.glow, S0, 1.1 * on, .02, c.c2, .7 * on);
          for (const k of [.55, 1.25, 1.8]) { const g = V3(S0.x * (1 - k), S0.y * (1 - k), S0.z); c.spW(SFX.ring, g, .05 * k + .02, .05 * k + .02, c.c1, .3 * on); c.spW(SFX.glow, g, .03, .03, c.c2, .4 * on); }
          c.emit(c.rate('mo', 36 * on), p => { const d = rdir(); c.put(p, S0); const v = irr(.06, .2); p.vx = d.x * v; p.vy = d.y * v; p.vz = d.z * v * .4; p.life = irr(.9, 1.5); p.s = irr(.007, .012); p.col = c.c2; p.fade = 1; }, 1);
          c.light(c.c1, 2.4 * on, Sg); } },
      snd(o) { for (const [f, d] of [[131, .7], [196, .9], [262, 1.1], [330, 1.35], [392, 1.6], [523, 1.9]]) { tone(o, f, 2.9, 'sine', .035, 0, d); tone(o, f * 1.005, 2.7, 'triangle', .012, 0, d); } hiss(o, 3, .02, 'highpass', 6000, .8); tone(o, 1047, 1.6, 'sine', .03, 0, 2.1); } },

    celestial: { dur: 4.8,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.16, -.06, .04, -.1, .05, .95, -.25], [.4, -.06, .05, -.1, .08, 1.0, -.3], [.62, -.06, .05, -.1, .08, 1.05, -.3], [.78, -.06, .05, -.1, .05, .9, .25], [.86, -.05, .05, -.1, 0, 1.05, .05], [.93, -.02, .02, -.04, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, S = [[.02, .13], [.14, .19], [.3, .12], [.42, .2], [.56, .1], [.68, .17], [.82, .08], [.95, .14], [.6, -.07], [.3, -.09]], LK = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [4, 8], [2, 9], [8, 9]];
        const ang = sm(cl((q - .62) / .16, 0, 1)) * TAU, fade = 1 - cl((q - .8) / .03, 0, 1), ca = Math.cos(ang), sa = Math.sin(ang), on = e(q, .12, .2, .8, .86);
        const at = i => c.W(c.P(-.055 * ca - S[i][1] * sa, c.ax - .055 * sa + S[i][1] * ca, c.along(S[i][0])));
        c.boost(on * .8); c.light(c.c1, .8 * on, c.tp); c.shade(c.W(c.P(0, c.ax + .06, c.along(.5))), 1.0, .55 * on * fade);
        S.forEach((s, i) => { const pop = cl((q - .15 - i * .035) / .03, 0, 1); if (pop <= 0 || fade <= 0) return; const p = at(i), tw = 1 + .2 * Math.sin(c.t * 6 + i * 2); c.dot(p, .028 * pop * tw * (2 - pop), IW(), fade, 1); c.dot(p, .04, c.c1, .5 * fade * pop); });
        LK.forEach(([a, b], j) => c.line(at(a), at(b), cl((q - .22 - j * .04) / .06, 0, 1), c.c1, .85 * fade));
        for (let i = 0; i < 16; i++) { const tw = Math.pow(Math.max(0, Math.sin(c.t * 1.6 + i * 2.7)), 4); c.dot(c.W(c.P((ifr(i * .37) - .5) * .2, c.ax + (ifr(i * .73) - .25) * .34, c.along(ifr(i * .618)))), .007, c.c2, tw * on * .8); }
        if (c.once('fall', .8)) S.forEach((s, i) => { const p0 = at(i), dx = -.5 + irs() * .3, dy = -.65 + irs() * .2; for (let k = 0; k < 7; k++) c.emit(1, p => { c.put(p, p0); const v = irr(.7, 1) * (1 - k * .09); p.vx = dx * v; p.vy = dy * v; p.drag = .6; p.life = .55 - k * .03; p.s = .012 - k * .001; p.col = IW(); p.col2 = c.c1; }, k ? 0 : 1); }); },
      snd(o) { [523, 659, 784, 988, 1175, 1319, 1568, 1976, 1760, 1319].forEach((f, i) => { tone(o, f, 1.4, 'sine', .04, 0, .72 + i * .168); tone(o, f * 2, .6, 'sine', .012, 0, .72 + i * .168); }); hiss(o, 3, .012, 'highpass', 9000, .7); tone(o, 2093, .7, 'sine', .04, -1500, 3.84); hiss(o, .6, .05, 'highpass', 6000, 3.84); } },

    abyss: { dur: 4.8,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.16, -.07, .05, -.02, 0, 1.0, .45], [.39, -.07, .05, -.02, .02, 1.05, .3], [.41, -.07, .04, 0, .02, 1.05, .27], [.46, -.07, .05, -.02, .02, 1.05, .25], [.57, -.07, .05, -.02, .02, 1.08, .02], [.59, -.07, .04, 0, .02, 1.08, 0], [.64, -.07, .05, -.02, .02, 1.08, -.05], [.8, -.07, .05, -.02, 0, 1.1, -.25], [.85, -.06, .05, -.06, 0, 1.1, 0], [.93, -.02, .02, -.04, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, on = e(q, .14, .24, .8, .86), T = c.t * 1.15, hb = Math.pow(Math.max(0, Math.sin(T * TAU)), 10) + .55 * Math.pow(Math.max(0, Math.sin(T * TAU - 1.1)), 10), Ck = insTex('crack'), rw = c.W(c.rc);
        c.boost(on * (.4 + 1.8 * hb)); c.light(c.c1, on * (.4 + 3 * hb), c.rc);
        { const reach = sm(cl((q - .16) / .1, 0, 1)) * .5 + (q >= .408 ? .25 : 0) + (q >= .589 ? .25 : 0), mid = c.W(c.P(0, c.ax, c.along(.5))); c.shade(mid, 1.1, .35 * on);
          [[.5, 0], [2.3, .06], [3.6, -.05], [5.2, .03], [1.3, -.04]].forEach(([a, off], i) => { const L = (.26 + i * .03) * reach, at = mid.clone().add(V3(Math.cos(a) * (L * .5 + .03) + off, Math.sin(a) * (L * .5 + .03), -.03 - i * .004));
            c.pnW(Ck, at, [0, 0, a], L, .1, c.c1, on * (.6 + .4 * hb)); c.plW(Ck, at, [0, 0, a], L, .1, c.c1, on * (.25 + .6 * hb)); c.plW(Ck, at, [0, 0, a], L * .96, .045, c.c2, on * hb * .9); }); }
        c.emit(c.rate('em', 32 * on), p => { c.put(p, c.W(c.P(irs() * .03, c.ax + irs() * .03, c.along(Math.random())))); p.vx = irs() * .04; p.vy = irr(.05, .16); p.life = irr(.9, 1.6); p.s = irr(.006, .011); p.col = c.c1; p.col2 = iC('#1a0004'); }, 2);
        [.408, .589].forEach((tb, i) => { if (c.once('b' + i, tb)) c.emit(c.n(36), p => { const d = rdir(); c.put(p, rw); const v = irr(.3, .8); p.vx = d.x * v; p.vy = d.y * v; p.vz = d.z * v * .4; p.drag = 1.5; p.life = irr(.4, .8); p.s = irr(.005, .009); p.col = c.c2; p.col2 = c.c1; });
          const bq = (q - tb) / .1; if (bq > 0 && bq < 1) { c.spW(SFX.ring, rw, .1 + sm(bq) * .75, .1 + sm(bq) * .75, c.c1, (1 - bq) * (1 - bq)); if (bq < .25) c.shake(.007); } });
        const sq = (q - .8) / .07; if (sq > 0 && sq < 1) c.spW(SFX.glow, rw, 1.2 * (1 - sq), .035, c.c2, 1 - sq); },
      snd(o) { for (let n = 0; n < 5; n++) { const t = (.25 + n) / 1.15, big = n === 2 || n === 3 ? 1.6 : 1; tone(o, 58, .22, 'sine', .22 * big, -18, t); tone(o, 48, .25, 'sine', .15 * big, -12, t + .152); if (big > 1) hiss(o, .3, .08, 'lowpass', 300, t); } tone(o, 36, 3.6, 'sawtooth', .025, 8, .6); hiss(o, .5, .1, 'bandpass', 2400, 3.84, 4); tone(o, 300, .4, 'sawtooth', .03, -220, 3.84); } },

    spectrum: { dur: 4.6,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.12, -.05, .05, -.1, 0, 1.15, .1], [.26, -.03, .05, -.1, .05, .35, -.3], [.4, -.06, .05, -.1, -.03, 1.3, .3], [.54, -.03, .055, -.1, .08, .4, -.2], [.68, -.06, .05, -.1, 0, 1.25, .5], [.8, -.05, .05, -.1, 0, 1.1, 0], [.92, -.02, .02, -.04, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, on = e(q, .1, .16, .8, .88), ab = on * (.35 + .65 * Math.abs(Math.sin((q - .12) / .14 * Math.PI))), d = .014 * ab, rw = c.W(c.rc);
        c.boost(on); c.light(hueC(c.t * .5), 1.3 * on, c.rc);
        c.ghost(0, iC('#ff2030'), .55 * ab, d, d * .3, 0); c.ghost(1, iC('#20ff60'), .42 * ab, 0, -d * .5, d * .6); c.ghost(2, iC('#3060ff'), .55 * ab, -d, d * .2, 0);
        for (let i = 0; i < 2; i++) c.tor(c.P(0, c.ax, c.along(.5 + .45 * Math.sin(c.t * 2.2 + i * Math.PI))), .04, [0, 0, 0], hueC(c.t * .4 + i * .5), on * .9);
        for (const b of [0, 1]) c.emit(c.rate('tr' + b, (b ? 22 : 70) * on), p => { c.put(p, c.W(c.P(irs() * .02, c.ax + irs() * .03, c.along(Math.random())))); p.vy = irr(-.02, .05); p.life = irr(.4, .7); p.s = irr(.006, .011); p.s1 = .3; p.col = hueC(c.t * .5 + Math.random() * .25); p.fade = 1; }, b);
        if (c.once('pop', .8)) for (const b of [0, 1]) c.emit(c.n(b ? 30 : 70), p => { const dd = rdir(); c.put(p, rw); const v = irr(.3, 1.1); p.vx = dd.x * v; p.vy = dd.y * v; p.vz = dd.z * v * .5; p.drag = 1.6; p.life = irr(.5, .9); p.s = irr(.006, .01); p.col = hueC(Math.random()); }, b);
        const pq = (q - .8) / .09; if (pq > 0 && pq < 1) { c.spW(SFX.glow, rw, .6 * (1 - pq) + .05, .6 * (1 - pq) + .05, IW(), 1 - pq); c.light(IW(), 5 * (1 - pq), c.rc); } },
      snd(o) { [0, 1, 2, 3].forEach(i => { hiss(o, .32, .09, 'bandpass', 900 + i * 500, .55 + i * .64, 2); tone(o, 440 * Math.pow(1.26, i), .5, 'sawtooth', .02, 600, .55 + i * .64); tone(o, 880 * Math.pow(1.26, i), .5, 'sine', .03, 0, .7 + i * .64); }); [1047, 1319, 1568, 2093].forEach((f, i) => tone(o, f, 1, 'sine', .035, 0, 3.68 + i * .03)); hiss(o, .5, .06, 'highpass', 7000, 3.68); } },

    eclipse: { dur: 5,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.16, -.07, .02, -.1, .1, 1.0, .1], [.46, -.07, .03, -.1, .14, 1.05, .1], [.6, -.07, .02, -.1, .2, 1.05, .1], [.74, -.07, .03, -.1, .14, 1.05, .1], [.88, -.05, .03, -.08, .05, .9, .05], [.95, -.02, .02, -.04, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, on = e(q, .12, .22, .9, .96), S0 = c.W(c.P(0, c.top, c.rc.z)).addScaledVector(IUP, .16), R = .052, Dc = insTex('disc');
        const mx = q < .5 ? lp(.18, 0, sm(cl((q - .2) / .3, 0, 1))) : q < .72 ? 0 : lp(0, -.18, sm(cl((q - .72) / .18, 0, 1))), cov = cl(1 - Math.abs(mx) / (R * 2), 0, 1), tot = sm(cl((cov - .85) / .15, 0, 1));
        const d1 = e(q, .465, .495, .505, .54), d2 = e(q, .69, .715, .725, .77), dia = Math.max(d1, d2);
        c.boost((1 - tot) * .8 * on + dia * 1.5); c.lightW(dia > .05 ? IW() : c.c1, on * (1.8 - 1.5 * tot) + dia * 4, S0);
        if (on > .01) { c.shade(S0.clone().add(V3(0, -.1, -.8)), 4, .55 * tot * on);
          c.spW(SFX.glow, S0, R * 6.5 * (1 - tot * .5), R * 6.5 * (1 - tot * .5), c.c1, on * .5 * (1 - tot * .6)); c.snW(Dc, S0, R * 2, R * 2, iC('#ffe9a8'), on); c.spW(SFX.glow, S0, R * 3, R * 3, c.c1, on * .9 * (1 - tot * .7));
          { const Cr = insTex('corona'), cs = R / .2125; c.pnW(Cr, S0, [0, 0, c.t * .1], cs, cs, iC('#ffd070'), tot * on); c.plW(Cr, S0, [0, 0, c.t * .1], cs, cs, c.c1, tot * on * 1.6); c.plW(Cr, S0, [0, 0, -c.t * .16 + 2], cs * 1.5, cs * 1.5, c.c2, tot * on * .9); c.pnW(Cr, S0, [0, 0, -c.t * .16 + 2], cs * 1.5, cs * 1.5, iC('#ffb840'), tot * on * .55); }
          c.dk(Dc, S0.clone().add(V3(mx, 0, .004)), R * 2.05, IBLK(), on);
          if (dia > .02) { const dp = S0.clone().add(V3(d1 > d2 ? -R : R, 0, .008)); c.spW(SFX.star, dp, .2 * dia, .2 * dia, IW(), dia * 1.5); c.spW(SFX.glow, dp, .12 * dia, .12 * dia, c.c2, dia); }
          c.emit(c.rate('mo', 24 * tot), p => { const dd = rdir(); c.put(p, S0.clone().add(V3(dd.x * R * 1.2, dd.y * R * 1.2, 0))); p.vx = dd.x * .06; p.vy = dd.y * .06; p.life = irr(1, 1.6); p.s = irr(.006, .01); p.col = c.c1; p.fade = 1; }, 1); } },
      snd(o) { tone(o, 55, 4, 'sine', .08, 0, .6); tone(o, 82.5, 4, 'sine', .04, 0, .6); tone(o, 110, 3.6, 'triangle', .015, -20, .8); hiss(o, 3.6, .012, 'bandpass', 500, .8, 5); for (const d of [2.45, 3.58]) { tone(o, 1568, 1.4, 'sine', .06, 0, d); tone(o, 2349, 1.2, 'sine', .03, 0, d + .02); tone(o, 3136, .9, 'sine', .015, 0, d + .04); } } },

    overclock: { dur: 4.6, b: 'sq',
      kf: [[0, 0, 0, 0, 0, 0, 0], [.1, -.05, .05, -.1, 0, 1.15, 0], [.38, -.05, .05, -.1, 0, 1.15, 0], [.42, -.05, .05, -.1, 0, 1.15, .9], [.56, -.05, .05, -.1, 0, 1.15, .9], [.6, -.05, .05, -.1, 0, 1.15, -.5], [.68, -.05, .05, -.1, 0, 1.15, -.5], [.71, -.05, .05, -.1, 0, 1.15, 0], [.8, -.05, .05, -.1, 0, 1.15, 0], [.9, -.02, .02, -.04, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, on = e(q, .08, .12, .82, .9), RGB = [iC('#ff2a4a'), iC('#3aff7a'), iC('#3a8aff')], sq = cl((q - .12) / .24, 0, 1), prog = cl((q - .12) / .58, 0, 1), ph = q < .42 ? -1 : q < .56 ? 0 : q < .68 ? 1 : q < .8 ? 2 : -1, rw = c.W(c.rc);
        if (q > .12 && q < .38) { c.tor(c.P(0, c.ax, c.along(sq)), .046, [0, 0, 0], IW(), .95); c.tor(c.P(0, c.ax, c.along(sq) + .012), .052, [0, 0, 0], c.c1, .5); c.light(IW(), 1.5, c.P(0, c.ax, c.along(sq))); }
        for (let i = 0; i < 44; i++) { const u = ifr(i * .618), a = ifr(i * .377) * TAU, r0 = .018 + ifr(i * .71) * .014; if (q < .38 && u > sq) continue; const blink = ifr(c.t * (1.5 + ifr(i * .13) * 3) + i * .3) > .35 ? 1 : .15; c.dot(c.W(c.P(Math.cos(a) * r0 * 1.5, c.ax + Math.sin(a) * r0 * 1.6, c.along(u))), .009, q < .42 ? IW() : RGB[(i + Math.floor(c.t * 3)) % 3], on * blink, 1); }
        const base = c.W(c.P(0, c.top, c.along(.45))).addScaledVector(IUP, .1); for (let i = 0; i < 10; i++) { const lit = i < Math.floor(prog * 10 + .001); const bp = base.clone().add(V3((i - 4.5) * .034, 0, 0)); c.dot(bp, .02, iC('#141a26'), on * .9, 2); if (lit) c.dot(bp, .017, prog >= 1 ? IW() : RGB[Math.floor(i / 3.4)], on, 1); }
        c.shade(rw, .7, .3 * on);
        if (ph >= 0) { c.light(RGB[ph], 2.6, c.rc); c.boost(1.3); c.spW(SFX.glow, rw, .5, .3, RGB[ph], .25); } else c.boost(on * .5);
        if (c.once('ov', .71)) c.emit(c.n(85), p => { const d = rdir(); c.put(p, rw); const v = irr(.3, 1); p.vx = d.x * v; p.vy = d.y * v; p.vz = d.z * v * .5; p.drag = 1.5; p.life = irr(.4, .8); p.s = irr(.006, .01); p.col = RGB[Math.floor(Math.random() * 3)]; }, 1);
        const oq = (q - .71) / .09; if (oq > 0 && oq < 1) { const a = 1 - oq; c.spW(SFX.glow, rw, .6 * a + .05, .6 * a + .05, IW(), a); for (let i = 0; i < 2; i++) c.arc(c.W(c.P(0, c.top, c.along(.2))), c.W(c.mz), .03, IW(), a, .03); c.light(IW(), 5 * a, c.rc); if (oq < .3) c.shake(.006); } },
      snd(o) { tone(o, 180, 1.1, 'sawtooth', .02, 500, .5); for (let i = 0; i < 10; i++) tone(o, 660 + i * 70, .05, 'square', .03, 0, .6 + i * .268); for (const [f, d] of [[523, 1.95], [659, 2.6], [784, 3.15]]) { tone(o, f, .22, 'square', .035, 0, d); tone(o, f / 2, .3, 'sawtooth', .03, 0, d); } tone(o, 1568, .12, 'square', .05, 0, 3.27); tone(o, 2093, .3, 'square', .05, 0, 3.4); hiss(o, .08, .2, 'highpass', 4000, 3.27); } },

    ghostfire: { dur: 4.8,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.16, -.09, 0, -.1, .6, .55, .1], [.4, -.09, .01, -.1, .68, .5, .14], [.6, -.09, 0, -.1, .62, .6, .06], [.74, -.09, .01, -.1, .66, .55, .1], [.8, -.09, -.012, -.1, .6, .55, .1], [.9, -.03, 0, -.04, .2, .2, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, on = e(q, .12, .2, .84, .92), mz = c.W(c.mz), ctr = c.W(c.rc), orbit = a => ctr.clone().add(V3(-Math.sin(a) * .2, .05 + Math.sin(a * 2) * .05, -Math.cos(a) * .15 + .02)), top = mz.clone().addScaledVector(IUP, .07);
        c.boost(on * .7 + e(q, .8, .81, .85, .93) * 2);
        c.emit(c.rate('w', 36 * on), p => { c.put(p, c.W(c.P(irs() * .02, c.ax + irs() * .02, c.along(Math.random())))); p.vx = irs() * .05; p.vy = irr(.08, .18); p.vz = irs() * .05; p.drag = .4; p.life = irr(.7, 1.2); p.s = irr(.016, .028); p.s1 = .4; p.a = .6; p.col = c.c1; p.col2 = iC('#2a8a50'); p.fade = 1; }, 2);
        c.emit(c.rate('w2', 16 * on), p => { c.put(p, c.W(c.P(irs() * .02, c.ax + irs() * .02, c.along(Math.random())))); p.vx = irs() * .05; p.vy = irr(.1, .2); p.drag = .4; p.life = irr(.6, 1); p.s = irr(.006, .01); p.col = c.c2; p.fade = 1; });
        let O = null, oa = 1;
        if (q < .35) { oa = sm(cl((q - .15) / .2, 0, 1)); O = oa > 0 ? mz.clone().lerp(top, oa) : null; }
        else if (q < .72) { const a = (q - .35) / .37 * TAU * 2; O = top.clone().lerp(orbit(a), sm(Math.min(1, a / 1.2))); }
        else if (q < .8) O = orbit(TAU * 2).lerp(mz, sm((q - .72) / .08));
        if (O) { c.shade(O, .5, .4 * oa); c.spW(SFX.glow, O, .34, .34, c.c1, .6 * oa); c.spW(SFX.glow, O, .14, .14, c.c2, oa); c.spW(SFX.glow, O, .055, .055, IW(), oa); c.snW(insTex('disc'), O, .05, .05, iC('#d8ffe4'), oa); c.lightW(c.c1, 1.8 * oa, O);
          c.emit(c.rate('ot', 95 * oa), p => { c.put(p, O); p.x += irs() * .012; p.y += irs() * .012; p.vy = .03; p.life = irr(.45, .75); p.s = irr(.014, .022); p.s1 = .15; p.col = c.c2; p.col2 = c.c1; }); c.emit(c.rate('ob', 50 * oa), p => { c.put(p, O); p.x += irs() * .015; p.y += irs() * .015; p.vy = .04; p.life = irr(.4, .7); p.s = irr(.02, .03); p.s1 = .2; p.a = .6; p.col = c.c1; p.col2 = iC('#1c6a3a'); p.fade = 1; }, 2); }
        if (c.once('dive', .8)) c.emit(c.n(65), p => { c.put(p, mz); p.vx = irs() * .25; p.vy = irr(.3, .85); p.vz = irs() * .25; p.g = .3; p.drag = 1.4; p.life = irr(.5, .9); p.s = irr(.012, .022); p.s1 = .3; p.col = c.c2; p.col2 = c.c1; p.fade = 1; });
        const fq = (q - .8) / .12; if (fq > 0 && fq < 1) { c.spW(SFX.glow, mz, .42 * (1 - fq) + .05, .42 * (1 - fq) + .05, c.c1, 1 - fq); c.spW(SFX.ring, mz, .06 + sm(fq) * .45, .06 + sm(fq) * .45, c.c2, (1 - fq) * (1 - fq)); c.lightW(c.c2, 5 * (1 - fq), mz); } },
      snd(o) { hiss(o, 3.2, .035, 'bandpass', 700, .6, 6); tone(o, 220, 3, 'sine', .02, 60, .7); tone(o, 261.6, 3, 'sine', .02, -30, .9); tone(o, 311, 2.6, 'sine', .015, 40, 1.2); for (let i = 0; i < 4; i++) { hiss(o, .5, .04, 'bandpass', 1200 + i * 200, 1.7 + i * .44, 5); tone(o, 500 + i * 60, .5, 'sine', .015, 200, 1.7 + i * .44); } hiss(o, .6, .12, 'bandpass', 900, 3.84, 1); tone(o, 440, .7, 'triangle', .04, -260, 3.84); } },

    starforge: { dur: 5.8,
      kf: [[0, 0, 0, 0, 0, 0, 0], [.1, -.05, .04, -.07, 0, 1.1, .1], [.46, -.05, .045, -.07, .02, 1.15, .15], [.495, -.05, .045, -.07, .02, 1.15, .15], [.51, -.05, .028, -.07, 0, 1.15, .12], [.55, -.05, .045, -.07, .02, 1.15, .15], [.575, -.05, .045, -.07, .02, 1.15, .15], [.59, -.05, .028, -.07, 0, 1.15, .12], [.63, -.05, .045, -.07, .02, 1.15, .15], [.655, -.05, .045, -.07, .02, 1.15, .15], [.67, -.05, .026, -.07, 0, 1.15, .12], [.71, -.05, .045, -.07, .02, 1.15, .15], [.76, -.06, .09, -.09, .3, 1.05, 0], [.87, -.05, .06, -.08, .15, 1.1, .05], [.95, -.02, .02, -.04, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, gather = e(q, .1, .3, .72, .74), F = c.P(0, c.top + .09, c.rc.z), FW = c.W(F), grow = sm(cl((q - .12) / .5, 0, 1)), hits = [.5, .58, .66], nh = hits.filter(h => q >= h).length, core = .02 + grow * .05 + nh * .018, pu = 1 + .08 * Math.sin(c.t * 22), Ry = insTex('rays');
        let bz = gather * (.6 + grow) + e(q, .74, .75, .8, .96) * 3;
        if (gather > .01) {
          c.emit(c.rate('pl', 125 * gather), p => { const d = rdir().multiplyScalar(irr(.3, .48)); p.x = FW.x + d.x; p.y = FW.y + d.y; p.z = FW.z + d.z * .5; p.vx = -d.y * .9; p.vy = d.x * .9; c.to(p, FW, 13); p.drag = 1.4; p.life = irr(.5, .75); p.s = irr(.004, .008); p.s1 = .3; p.col = c.c1; p.col2 = IW(); p.fade = 2; });
          c.spW(SFX.glow, FW, core * 5 * pu, core * 5 * pu, c.c1, .7 * gather); c.spW(SFX.glow, FW, core * 2.2 * pu, core * 2.2 * pu, c.c2, gather); c.spW(SFX.glow, FW, core, core, IW(), gather);
          for (let i = 0; i < 3; i++) c.tor(F, core * 1.5 + .012 * i, [c.t * (2 + i), c.t * (1.4 + i * .7), i * 2], i ? c.c1 : c.c2, .85 * gather);
          c.light(c.c1, 1 + grow * 2, F); }
        hits.forEach((h, i) => { if (c.once('h' + i, h)) c.emit(c.n(52), p => { c.put(p, FW); p.vx = irs() * 1.3; p.vy = irr(.2, 1.05); p.vz = irs() * .6; p.g = -2.4; p.life = irr(.35, .7); p.s = irr(.005, .009); p.col = IW(); p.col2 = c.c1; });
          const hq = (q - h) / .05; if (hq > 0 && hq < 1) { const a = 1 - hq; bz += a * 2; c.spW(SFX.glow, FW, .55 * a + .1, .55 * a + .1, IW(), a); c.spW(SFX.ring, FW, .08 + sm(hq) * .42, .08 + sm(hq) * .42, c.c2, a * a); c.light(IW(), 6 * a, F); c.shake(.008 * a); } });
        if (c.once('nova', .74)) for (const b of [0, 1]) c.emit(c.n(b ? 55 : 120), p => { const d = rdir(); c.put(p, FW); const v = irr(.4, 1.7); p.vx = d.x * v; p.vy = d.y * v; p.vz = d.z * v * .6; p.g = -.4; p.drag = 1.2; p.life = irr(.6, 1.2); p.s = irr(.005, .011); p.col = IW(); p.col2 = c.c1; }, b);
        const nq = (q - .74) / .16; if (nq > 0 && nq < 1) { const a = 1 - nq, rs2 = sm(Math.min(1, nq * 3)); c.spW(SFX.glow, FW, 1.2 * a + .1, 1.2 * a + .1, IW(), a * 1.3); c.plW(Ry, FW, [0, 0, c.t * .8], 1.1 * rs2, 1.1 * rs2, c.c2, a); c.spW(SFX.ring, FW, .1 + sm(nq) * 1.2, .1 + sm(nq) * 1.2, c.c1, a * a); c.spW(SFX.ring, FW, .05 + sm(nq) * .75, .05 + sm(nq) * .75, c.c2, a * a); c.light(IW(), 8 * a, F); if (nq < .2) c.shake(.012); }
        const sq = e(q, .76, .82, .88, .95); if (sq > .01) { c.spW(SFX.glow, FW, .14, .14, c.c2, sq); c.spW(SFX.glow, FW, .045, .045, IW(), sq); c.plW(Ry, FW, [0, 0, c.t * .3], .34, .34, c.c1, sq * .6); c.emit(c.rate('eb', 22 * sq), p => { const d = rdir(); c.put(p, FW); p.vx = d.x * .1; p.vy = d.y * .1 + .05; p.vz = d.z * .1; p.life = irr(.8, 1.3); p.s = irr(.004, .007); p.col = c.c2; p.col2 = c.c1; }); }
        c.boost(bz); },
      snd(o) { tone(o, 50, 2.6, 'sawtooth', .03, 110, .6); tone(o, 100, 2.6, 'sine', .04, 240, .6); hiss(o, 2.5, .04, 'bandpass', 500, .7, 2); for (const d of [2.9, 3.36, 3.83]) { for (const [f, v, dd] of [[220, .1, .9], [607, .06, .7], [1188, .045, .5], [1958, .03, .35]]) tone(o, f, dd, 'sine', v, 0, d); hiss(o, .05, .25, 'highpass', 3500, d); tone(o, 55, .4, 'sine', .25, -15, d); } hiss(o, .15, .3, 'lowpass', 3000, 4.29); hiss(o, 1.6, .18, 'lowpass', 600, 4.3); tone(o, 44, 1.6, 'sine', .32, -14, 4.3); [392, 494, 587, 784, 988].forEach((f, i) => tone(o, f, 1.6, 'sine', .035, 0, 4.4 + i * .05)); } },

    riftborn: { dur: 5.8, b: 'sq',
      kf: [[0, 0, 0, 0, 0, 0, 0], [.12, .05, .05, -.1, 0, .8, .05], [.36, .05, .05, -.1, 0, .82, .05], [.44, -.01, .05, -.18, 0, .9, .05], [.68, -.01, .052, -.18, 0, .92, .08], [.725, .07, .05, -.06, 0, .72, -.05], [.8, .05, .05, -.1, 0, .8, 0], [.93, -.01, .02, -.04, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c; if (q >= .16 && !c.st.T) c.st.T = c.W(c.mz).addScaledVector(c.fw, .1);
        const T = c.st.T, open = sm(cl((q - .18) / .12, 0, 1)), shut = sm(cl((q - .72) / .025, 0, 1)), on = open * (1 - shut);
        c.boost(on * .9 + e(q, .72, .73, .78, .9) * 2.5);
        if (T && on > .01) { const jt = 1 + (Math.random() < .15 ? irs() * .3 : 0), hgt = .58 * on * jt;
          c.pnW(SFX.portal, T.clone().add(V3(0, 0, -.012)), [0, 0, -c.t * 4], .36 * on, .36 * on, c.c1, .6 * on); c.plW(SFX.portal, T.clone().add(V3(0, 0, -.012)), [0, 0, -c.t * 4], .36 * on, .36 * on, c.c1, .4 * on); c.spW(SFX.glow, T, .3, .62 * on, c.c1, .35 * on);
          c.shade(T, .8, .4 * on); c.pnW(SFX.tear, T, [0, 0, .1], .17, hgt * 1.05, c.c1, .85 * on); c.plW(SFX.tear, T, [0, 0, .1], .17, hgt * 1.05, c.c1, .5 * on); c.plW(SFX.tear, T, [0, 0, Math.sin(c.t * 3) * .05], .09 * jt, hgt, c.c2, on);
          c.emit(c.rate('vx', 85 * on), p => { c.put(p, c.W(c.P(irs() * .04, c.ax + irs() * .05, c.along(irr(.3, 1))))); p.vx = irs() * .2; p.vy = irs() * .2; c.to(p, T, 9); p.drag = 1.2; p.life = irr(.4, .7); p.s = irr(.005, .009); p.col = Math.random() < .5 ? c.c1 : c.c2; p.fade = 2; }, 1);
          for (let i = 0; i < 6; i++) { const a = c.t * 1.6 + i * TAU / 6, r = .17 + .03 * Math.sin(c.t * 2 + i); c.crW(T.clone().add(V3(Math.cos(a) * r, Math.sin(a * .7 + i) * .18, Math.sin(a) * r * .5)), [.008, .024, .008], [c.t * 2 + i, i, c.t], i % 2 ? c.c1 : c.c2, .85 * on); }
          if (q > .42 && q < .72) { const g = Math.floor(c.t * 14), jx = (ifr(g * .37) - .5) * .05, jy = (ifr(g * .73) - .5) * .03; c.ghost(0, c.c2, ifr(g * .19) > .35 ? .5 : 0, jx, jy, 0); c.ghost(1, c.c1, ifr(g * .57) > .5 ? .4 : 0, -jx * .6, -jy, .02); c.shake(.002); }
          c.lightW(c.c1, 1.6 * on, T); }
        if (T && c.once('snap', .72)) c.emit(c.n(95), p => { c.put(p, T); p.y += irs() * .3; p.vx = irs() * 2.2; p.vy = irs() * .5; p.vz = irs() * .6; p.drag = 2; p.life = irr(.4, .8); p.s = irr(.006, .01); p.col = Math.random() < .5 ? c.c1 : c.c2; }, 1);
        const sq = (q - .72) / .1; if (T && sq > 0 && sq < 1) { const a = 1 - sq; c.spW(SFX.glow, T, 1.8 * a + .1, .02 + .03 * a, IW(), a * 1.4); c.spW(SFX.glow, T, .55 * a, .55 * a, c.c2, a); c.lightW(c.c2, 7 * a, T); if (sq < .2) c.shake(.012); }
        const gl = e(q, .74, .75, .84, .92); if (gl > .02) for (let i = 0; i < 12; i++) if (ifr(c.t * 9 + i * .37) > .6) c.dot(c.W(c.P((ifr(i * .31) - .5) * .05, c.ax + (ifr(i * .77) - .4) * .06, c.along(ifr(i * .618)))), .008, i % 2 ? c.c1 : c.c2, gl, 1); },
      snd(o) { tone(o, 160, .7, 'sawtooth', .05, 1500, .95); hiss(o, .7, .1, 'bandpass', 900, .95, 4); tone(o, 70, 3, 'sawtooth', .03, 30, 1.2); tone(o, 105, 3, 'square', .012, -20, 1.2); for (let i = 0; i < 16; i++) tone(o, 1500 + Math.random() * 2500, .04, 'square', .02, 0, 2.5 + i * .1 + Math.random() * .05); hiss(o, .06, .3, 'highpass', 3000, 4.16); tone(o, 90, .9, 'sine', .34, -50, 4.18); tone(o, 2400, .25, 'square', .03, -2000, 4.18); for (let i = 0; i < 5; i++) tone(o, 1800 + i * 420, .05, 'square', .02, 0, 4.4 + i * .06); } },

    glyphbound: { dur: 6, b: 'sq',
      kf: [[0, 0, 0, 0, 0, 0, 0], [.1, -.05, .03, -.1, 0, .9, .05], [.5, -.06, .055, -.1, .05, .95, .1], [.66, -.06, .06, -.1, .08, .95, .1], [.76, -.07, .045, -.1, .42, .95, .05], [.86, -.07, .045, -.1, .4, .95, .05], [.94, -.02, .02, -.04, .1, .3, 0], [1, 0, 0, 0, 0, 0, 0]],
      fx(c) { const { q, e } = c, on = e(q, .1, .16, .9, .95), conv = sm(cl((q - .66) / .1, 0, 1)), rel = e(q, .76, .78, .86, .94), mz = c.W(c.mz), sp = sm(cl((q - .3) / .2, 0, 1)), behind = c.W(c.rc).add(V3(0, .03, -.14));
        c.boost(on * .8 + rel * 2);
        for (let i = 0; i < 4; i++) { const ap = sm(cl((q - .12 - i * .07) / .08, 0, 1)), z = lp(c.along(.2 + i * .24), -c.len, conv), sz = lp(.21 - i * .03, .07, conv) * ap; const rot = [0, 0, (i % 2 ? -1 : 1) * c.t * 1.1 + i], op = on * ap * (1 - rel * .5); c.pn(SFX.rune, c.P(0, c.ax, z), rot, sz, sz, c.c1, .9 * op); c.pl(SFX.rune, c.P(0, c.ax, z), rot, sz, sz, i % 2 ? c.c2 : c.c1, .6 * op); }
        c.shade(behind, .95 * sp, .4 * on); c.pnW(SFX.rune, behind, [0, 0, c.t * .35], .64 * sp * (1 + rel * .25), .64 * sp * (1 + rel * .25), c.c1, .7 * on * sp); c.plW(SFX.rune, behind, [0, 0, c.t * .35], .64 * sp * (1 + rel * .25), .64 * sp * (1 + rel * .25), c.c1, .4 * on * sp); c.plW(SFX.rune, behind.clone().add(V3(0, 0, .01)), [0, 0, -c.t * .7], .37 * sp, .37 * sp, c.c2, .5 * on * sp); c.spW(SFX.glow, behind, .75 * sp, .75 * sp, c.c1, .22 * on);
        c.emit(c.rate('gl', 28 * on), p => { c.put(p, c.W(c.P(irs() * .03, c.ax + irs() * .04, c.along(Math.random())))); p.vx = irs() * .04; p.vy = irr(.05, .14); p.life = irr(1, 1.6); p.s = irr(.006, .01); p.col = c.c1; p.col2 = c.c2; p.fade = 1; }, 1);
        for (let i = 0; i < 10; i++) { const a = c.t * 1.5 + i * TAU / 10; c.dot(c.W(c.P(Math.cos(a) * .06, c.ax + Math.sin(a) * .06, c.along(.15 + ifr(i * .618) * .8))), .008, c.c2, on * (1 - conv), 1); }
        c.light(c.c1, 1 * on, c.rc);
        if (c.once('rel', .765)) c.emit(c.n(85), p => { c.put(p, mz); p.vx = irs() * .28; p.vy = irr(.4, 1.25); p.vz = irs() * .28; p.drag = .8; p.life = irr(.7, 1.3); p.s = irr(.006, .011); p.col = c.c2; p.col2 = c.c1; }, 1);
        if (rel > .01) { const top = mz.clone().addScaledVector(IUP, .95); c.beam(mz, top, .09, c.c2, rel); c.beam(mz, top, .22, c.c1, rel * .5); c.spW(SFX.glow, mz, .34 * rel, .34 * rel, IW(), rel); c.lightW(c.c2, 6 * rel, mz); if (q < .8) c.shake(.005); } },
      snd(o) { [196, 247, 294, 392].forEach((f, i) => { tone(o, f, 3.4, 'sine', .035, 0, .72 + i * .42); tone(o, f * 1.005, 3.2, 'sine', .02, 0, .73 + i * .42); tone(o, f * 3, 1, 'sine', .008, 0, .72 + i * .42); }); hiss(o, 3.6, .015, 'highpass', 7500, .7); tone(o, 98, 1.2, 'sine', .06, 100, 3.9); for (const [f, d] of [[392, 0], [494, .04], [587, .08], [784, .12], [988, .2], [1175, .28]]) { tone(o, f, 1.6, 'sine', .05, 0, 4.58 + d); tone(o, f * 1.005, 1.4, 'sine', .03, 0, 4.59 + d); } tone(o, 1568, 1.1, 'triangle', .03, 0, 4.85); hiss(o, 1.2, .05, 'highpass', 7500, 4.6); tone(o, 60, .8, 'sine', .22, -20, 4.58); } },
  };
