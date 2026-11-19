  /* ---------- 92 hud: everything on screen during a round ----------
     Drawn on the kit's 2D canvas, in its 1280 by 720 units (K.view is the part of that the screen shows). Each cluster
     hangs off a corner or the centre and is scaled by uiScale(), so one layout serves a monitor and a phone.
     Also here: the small drawing helpers every screen uses, and the crosshair, which the player designs in settings. */
  const FONT = '"Chakra Petch", system-ui, sans-serif', GLASS = 'rgba(12,16,22,.78)';
  // no text is ever drawn smaller than MIN_PX on the real screen, whatever scale the layout is at
  const fitPx = (g, px) => { const k = g.getTransform().a * innerWidth / g.canvas.width, min = isTouch() ? 10.5 : 9; return px * k < min ? min / k : px; };
  // a short note across the top for a few seconds ("trackpad found")
  let TOAST = null; const toast = s => { TOAST = { s, at: performance.now() }; };
  on('gift', (f, mate, k) => { if (!M || M.mode === 'demo') return; if (mate === me()) toast(`${f.name.toUpperCase()} BOUGHT YOU A ${GUNS[k].n.toUpperCase()}`); else if (f === me()) toast(`YOU BOUGHT ${mate.name.toUpperCase()} A ${GUNS[k].n.toUpperCase()}`); });
  on('charge', f => { if (!M || M.mode === 'demo' || M.phase === 'end') return; const P = me(); if (f === P) toast(isTouch() ? 'YOU HAVE THE CHARGE' : 'YOU HAVE THE CHARGE  ·  H TO DROP IT'); else if (f && f.team === P.team && M.round && M.time - (M.chargeToastT || -9) > .5) toast(f.name.toUpperCase() + ' HAS THE CHARGE'); else if (!f && sideOf(P) === 'att') toast('THE CHARGE IS ON THE FLOOR'); M.chargeToastT = M.time; });
  function tx(g, s, x, y, px, col = BONE, align = 'center', weight = 700) { px = fitPx(g, px); g.font = `${weight} ${px}px ${FONT}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }
  function rr(g, x, y, w, h, r, fill, stroke, lw = 2) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
  }
  // a button: draws it, registers its press zone, returns whether the mouse is over it. o: { px, fill, col, edge, sub, on, off }
  function btn(g, x, y, w, h, label, fn, o = {}) {
    const hot = zone(x, y, w, h, () => { click(!o.off); if (!o.off) fn(); }) && !o.off;
    rr(g, x, y, w, h, Math.min(10, h / 4), o.on ? (o.fill || FOE) : hot ? 'rgba(239,233,220,.16)' : o.fill && !o.on && o.solid ? o.fill : 'rgba(12,16,22,.72)', o.on ? null : hot ? BONE : o.edge || 'rgba(239,233,220,.28)');
    tx(g, label, x + w / 2, y + h / 2 - (o.sub ? h * .13 : 0), o.px || h * .42, o.off ? '#5a6272' : o.on ? INK : o.col || BONE);
    if (o.sub) tx(g, o.sub, x + w / 2, y + h * .74, (o.px || h * .42) * .5, o.on || (o.solid && !hot) ? 'rgba(12,16,22,.75)' : DIM);
    return hot;
  }
  // wrap text into lines no wider than w; returns the y after the last line
  function para(g, s, x, y, w, px, col, lh = 1.3) {
    px = fitPx(g, px); g.font = `600 ${px}px ${FONT}`; g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle'; let line = '';
    for (const word of s.split(' ')) { const t = line ? line + ' ' + word : word; if (g.measureText(t).width > w && line) { g.fillText(line, x, y); line = word; y += px * lh; } else line = t; }
    g.fillText(line, x, y); return y + px * lh;
  }
  // the crosshair: every setting, the presets (pick one, then change anything), the swatches, and a share code
  const XH_BASE = { shape: 'cross', col: '#35e0c8', alpha: 1, len: 9, gap: 3, thick: 3, dot: true, dotSize: 0, outline: true, oth: 1.5, dyn: true, out: false, olen: 4, ogap: 6 };
  const XH_SHAPES = ['cross', 'tee', 'x', 'circle', 'square', 'chevron', 'dot'];
  const XH_PRESETS = [
    { n: 'Classic' },
    { n: 'Tight', col: '#ffffff', len: 5, gap: 2, thick: 2, dot: false, dyn: false },
    { n: 'Dot', shape: 'dot', col: '#7dff9a', thick: 5, dyn: false },
    { n: 'Ring', shape: 'circle', col: '#ffd23f', gap: 7, thick: 2, outline: false },
    { n: 'Tee', shape: 'tee', col: '#ff8a3d', len: 10, gap: 4, dot: false },
    { n: 'Pinpoint', col: '#ff5ac8', len: 4, gap: 0, thick: 2, dot: false, dyn: false },
    { n: 'Pro', col: '#c8ff3d', len: 5, gap: 2, thick: 2, dot: false, dyn: false, out: true, olen: 3, ogap: 6 },
    { n: 'X', shape: 'x', col: '#ffffff', len: 7, gap: 3, thick: 2, dotSize: 2 },
    { n: 'Box', shape: 'square', col: '#6fb8ff', gap: 6, thick: 2 },
    { n: 'Chevron', shape: 'chevron', col: '#ffd23f', len: 8, gap: 2, thick: 3, dot: false },
  ].map(p => Object.assign({}, XH_BASE, p));
  const XH_COLS = ['#35e0c8', '#7dff9a', '#c8ff3d', '#ffffff', '#ffd23f', '#ff8a3d', '#ff3b3b', '#ff5ac8', '#e23dff', '#c58cff', '#6fb8ff', '#3d7bff'];
  // a share code: the whole crosshair in one short line (DPX1-...), to copy to a friend or keep
  const xhCode = c => 'DPX1-' + [XH_SHAPES.indexOf(c.shape), c.col.slice(1), Math.round((c.alpha == null ? 1 : c.alpha) * 10), c.len, c.gap, c.thick, (c.dot ? 1 : 0) | (c.outline ? 2 : 0) | (c.dyn ? 4 : 0) | (c.out ? 8 : 0), c.dotSize || 0, Math.round((c.oth || 1.5) * 2), c.olen || 0, c.ogap || 0].map(v => typeof v === 'number' ? Math.max(0, Math.round(v)).toString(36) : v).join('-').toUpperCase();
  function xhFromCode(str) {
    const p = String(str || '').trim().toUpperCase().split('-'); if (p[0] !== 'DPX1' || p.length !== 12 || !/^[0-9A-F]{6}$/.test(p[2]) || p.some((v, i) => i > 0 && !/^[0-9A-Z]+$/.test(v))) return null;
    const n = i => parseInt(p[i], 36), f = n(7), c = { shape: XH_SHAPES[n(1)] || 'cross', col: '#' + p[2].toLowerCase(), alpha: cl(n(3) / 10, .2, 1), len: cl(n(4), 0, 22), gap: cl(n(5), 0, 16), thick: cl(n(6), 1, 8),
      dot: !!(f & 1), outline: !!(f & 2), dyn: !!(f & 4), out: !!(f & 8), dotSize: cl(n(8), 0, 8), oth: cl(n(9) / 2, .5, 3), olen: cl(n(10), 1, 16), ogap: cl(n(11), 0, 20) };
    return Object.values(c).every(v => typeof v !== 'number' || Number.isFinite(v)) ? c : null;
  }
  // the crosshair, centred on x,y: err is the extra gap (in HUD units) that your current inaccuracy opens it by.
  // Drawn in two passes, the dark outline under everything first, so outlines never cover the colour.
  function drawCrosshair(g, x, y, err, k = 1, c = CFG.xh) {
    const sh = c.shape, th = Math.max(1, c.thick * k), gap = c.gap * k + (c.dyn ? err : 0), len = c.len * k, o = c.outline ? Math.max(.5, (c.oth || 1.5) * Math.max(1, k * .8)) : 0, bars = [];
    const arms = (L, G) => { bars.push([-G - L, -th / 2, L, th], [G, -th / 2, L, th], [-th / 2, G, th, L]); if (sh !== 'tee') bars.push([-th / 2, -G - L, th, L]); };
    if ((sh === 'cross' || sh === 'tee' || sh === 'x') && len > 0) arms(len, gap);
    if (c.out && (sh === 'cross' || sh === 'tee' || sh === 'x')) arms((c.olen || 4) * k, gap + len + (c.ogap || 0) * k);   // outer lines, past the inner ones
    const d = c.dotSize ? c.dotSize * k * (sh === 'dot' ? 1.4 : 1) : sh === 'dot' ? th * 1.2 : Math.max(2, th * .8), r = gap + 4 * k, s = Math.max(3 * k, len);
    g.save(); g.globalAlpha = c.alpha == null ? 1 : c.alpha; g.translate(x, y); g.lineJoin = sh === 'square' ? 'miter' : 'round'; g.lineCap = sh === 'chevron' ? 'round' : 'butt';
    const pass = (col, e) => {
      g.fillStyle = g.strokeStyle = col; g.lineWidth = th + e * 2;
      if (sh === 'x') g.rotate(Math.PI / 4); for (const [a, b, w, h] of bars) g.fillRect(a - e, b - e, w + e * 2, h + e * 2); if (sh === 'x') g.rotate(-Math.PI / 4);
      if (sh === 'circle') { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
      else if (sh === 'square') { g.beginPath(); g.rect(-r, -r, r * 2, r * 2); g.stroke(); }
      else if (sh === 'chevron') { g.beginPath(); g.moveTo(-s, gap + s * .75); g.lineTo(0, gap); g.lineTo(s, gap + s * .75); g.stroke(); }
      if (c.dot || sh === 'dot') g.fillRect(-d / 2 - e, -d / 2 - e, d + e * 2, d + e * 2);
    };
    if (o) pass('rgba(0,0,0,.8)', o); pass(c.col, 0); g.restore();
  }

  /* the shotgun reticle: a ring as wide as the pellet spread really is (it opens up as you move or jump) with four ticks
     on it, drawn round your own crosshair in its colour */
  function drawShotgunReticle(g, x, y, r, k = 1, c = CFG.xh) {
    // the ring keeps its own look so a tiny, faint or outline-free custom crosshair never hides it: only the colour is yours
    const th = Math.max(1.5, 1.6 * k), o = Math.max(1, 1.2 * k), tick = 6 * k;
    r = Math.max(10 * k, r);
    g.save(); g.globalAlpha = Math.max(.85, c.alpha == null ? 1 : c.alpha); g.translate(x, y); g.lineCap = 'butt';
    const pass = (col, e) => {
      g.strokeStyle = g.fillStyle = col; g.lineWidth = th + e * 2;
      for (let i = 0; i < 4; i++) { const a0 = i * TAU / 4 + .32, a1 = (i + 1) * TAU / 4 - .32; g.beginPath(); g.arc(0, 0, r, a0, a1); g.stroke(); }   // a ring broken at the ticks
      for (let i = 0; i < 4; i++) { const a = i * TAU / 4, cx = Math.cos(a), sy = Math.sin(a); g.beginPath(); g.moveTo(cx * (r - tick * .6), sy * (r - tick * .6)); g.lineTo(cx * (r + tick), sy * (r + tick)); g.stroke(); }
    };
    pass('rgba(0,0,0,.8)', o); pass(c.col || '#3affd0', 0); g.restore();
  }

  let hitMark = null, heard = null, mmCanvas = null;
  on('hurt', (v, by, dmg, head) => { if (M && by === me()) hitMark = { t: head ? .5 : .28, head, dmg, kill: v.hp <= 0 && !v.net, x: rnd(-14, 14) }; });
  on('kill', (v, by) => { if (M && by === me() && hitMark) hitMark.kill = true; });
  // the kill banner, bottom centre: the emblem of the skin you have equipped (a skull until you own one) bursts in,
  // with a pip for each kill in your run, then fades
  let banner = null;
  on('kill', (v, by, head, wk) => { if (M && by === me() && v !== me() && M.mode !== 'demo') banner = { t0: performance.now(), n: killRun, head, name: v.name, em: killEmblem(wk) }; });
  on('round', n => { banner = null; if (n !== 1 && X) X.roundFadeT = performance.now(); });
  // the banner wears the emblem of the skin you made the kill with (Epic and up), or the plain skull
  const killEmblem = wk => { const sk = skinOfId(skinFor(me(), wk)); return sk && sk.L.emblem ? Object.assign({ tier: sk.R.tier }, sk.L.emblem) : { shape: 'skull', col: BONE, glow: YOU }; };
  // the emblem's glyph, drawn round (0, 0) at radius r
  function glyph(g, shape, r, col, ink) {
    g.fillStyle = col; g.beginPath();
    if (shape === 'bolt') { g.moveTo(.14 * r, -.62 * r); g.lineTo(-.34 * r, .08 * r); g.lineTo(-.02 * r, .08 * r); g.lineTo(-.16 * r, .62 * r); g.lineTo(.34 * r, -.12 * r); g.lineTo(.02 * r, -.12 * r); g.closePath(); g.fill(); return; }
    if (shape === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? .26 : .6; g.lineTo(Math.cos(a) * q * r, Math.sin(a) * q * r); } g.closePath(); g.fill(); return; }
    if (shape === 'crown') { g.moveTo(-.5 * r, .34 * r); g.lineTo(-.56 * r, -.3 * r); g.lineTo(-.26 * r, -.02 * r); g.lineTo(0, -.46 * r); g.lineTo(.26 * r, -.02 * r); g.lineTo(.56 * r, -.3 * r); g.lineTo(.5 * r, .34 * r); g.closePath(); g.fill(); g.fillRect(-.5 * r, .4 * r, r, .12 * r); return; }
    if (shape === 'flame') { g.moveTo(0, .58 * r); g.bezierCurveTo(-.5 * r, .5 * r, -.48 * r, -.05 * r, -.12 * r, -.62 * r); g.bezierCurveTo(-.1 * r, -.2 * r, .1 * r, -.25 * r, .16 * r, -.38 * r); g.bezierCurveTo(.5 * r, -.05 * r, .48 * r, .5 * r, 0, .58 * r); g.fill();
      g.fillStyle = ink; g.beginPath(); g.moveTo(0, .5 * r); g.bezierCurveTo(-.22 * r, .45 * r, -.2 * r, .15 * r, 0, -.05 * r); g.bezierCurveTo(.2 * r, .15 * r, .22 * r, .45 * r, 0, .5 * r); g.fill(); return; }
    if (shape === 'fang') { for (const sx of [-1, 1]) { g.moveTo(sx * .42 * r, -.5 * r); g.quadraticCurveTo(sx * .44 * r, .2 * r, sx * .1 * r, .6 * r); g.quadraticCurveTo(sx * .2 * r, .05 * r, sx * .05 * r, -.5 * r); g.closePath(); } g.fill(); return; }
    // the skull: a dome and a jaw, deep eyes, a notch for a nose, teeth
    g.arc(0, -.12 * r, .48 * r, Math.PI * .82, Math.PI * 2.18); g.lineTo(.3 * r, .3 * r); g.lineTo(.26 * r, .5 * r); g.lineTo(-.26 * r, .5 * r); g.lineTo(-.3 * r, .3 * r); g.closePath(); g.fill();
    g.fillStyle = ink; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * .19 * r, -.06 * r, .13 * r, .15 * r, sx * .25, 0, TAU); g.fill(); }
    g.beginPath(); g.moveTo(0, .1 * r); g.lineTo(.07 * r, .24 * r); g.lineTo(-.07 * r, .24 * r); g.closePath(); g.fill();
    for (const tx0 of [-.12, 0, .12]) g.fillRect((tx0 - .018) * r, .36 * r, .036 * r, .14 * r);
  }
  // a small bust of an operative for the top bar: shoulders in their colour and their headgear, greyed once they are down
  function opBust(g, op, x, y, s, up) {
    const O = OPS[op] || OPS.vex, kt = KIT[op] || KIT.vex, grey = c => up ? c : '#3c4049', glow = up ? O.col : '#555a63';
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = grey(kt.suit); g.beginPath(); g.moveTo(-21, 24); g.quadraticCurveTo(-20, 7, 0, 6); g.quadraticCurveTo(20, 7, 21, 24); g.closePath(); g.fill();
    g.fillStyle = grey(kt.plate); g.beginPath(); g.moveTo(-9, 24); g.lineTo(-7, 11); g.lineTo(7, 11); g.lineTo(9, 24); g.closePath(); g.fill();
    g.fillStyle = grey(kt.skin); g.beginPath(); g.ellipse(0, -5, 8.5, 10, 0, 0, TAU); g.fill();
    if (op === 'vex') { g.fillStyle = grey(kt.cloth); g.beginPath(); g.arc(0, -6, 12.5, Math.PI * .92, Math.PI * 2.08); g.lineTo(9, 7); g.quadraticCurveTo(0, 2, -9, 7); g.closePath(); g.fill();
      g.fillStyle = grey(kt.skin); g.beginPath(); g.ellipse(0, -3, 6.2, 7.5, 0, 0, TAU); g.fill(); g.fillStyle = glow; g.fillRect(-6, -6, 12, 2.4); }
    else if (op === 'iris') { g.fillStyle = grey(kt.plate); g.beginPath(); g.arc(0, -6, 11, Math.PI, TAU); g.lineTo(11, -2); g.lineTo(-11, -2); g.closePath(); g.fill(); g.fillStyle = glow; g.fillRect(-11, -7, 22, 4.5);
      g.strokeStyle = grey('#15171c'); g.lineWidth = 1.2; g.beginPath(); g.moveTo(-9, -12); g.lineTo(-11, -22); g.stroke(); g.fillStyle = glow; g.beginPath(); g.arc(-11, -22, 1.6, 0, TAU); g.fill(); }
    else if (op === 'bastion') { g.fillStyle = grey(kt.plate); g.beginPath(); g.moveTo(-11, 6); g.lineTo(-12, -12); g.quadraticCurveTo(0, -21, 12, -12); g.lineTo(11, 6); g.closePath(); g.fill(); g.fillStyle = glow; g.fillRect(-7.5, -7, 15, 2.6); g.fillRect(-1.3, -7, 2.6, 8); }
    else if (op === 'nova') { g.fillStyle = grey(kt.plate); g.beginPath(); g.arc(0, -6, 10.5, Math.PI, TAU); g.lineTo(10.5, -3); g.lineTo(-10.5, -3); g.closePath(); g.fill(); g.fillStyle = grey(O.col); g.fillRect(-1.4, -20, 2.8, 10); g.fillStyle = glow; g.fillRect(-9, -6, 18, 3.4); }
    else if (op === 'wraith') { g.fillStyle = grey(kt.suit); g.beginPath(); g.arc(0, -6, 11.5, Math.PI * .95, Math.PI * 2.05); g.lineTo(9, 6); g.lineTo(-9, 6); g.closePath(); g.fill(); g.fillStyle = grey(kt.plate); g.beginPath(); g.ellipse(0, -3, 6.5, 8.5, 0, 0, TAU); g.fill(); g.fillStyle = glow; g.fillRect(-5, -5, 3.6, 1.6); g.fillRect(1.4, -5, 3.6, 1.6); g.fillStyle = grey(kt.cloth); g.fillRect(-10, 6, 20, 4); }
    else if (op === 'talon') { g.fillStyle = grey(kt.cloth); g.beginPath(); g.arc(0, -8, 10, Math.PI, TAU); g.fill(); g.fillRect(-14, -9, 28, 2.6); g.fillStyle = grey('#15171c'); g.fillRect(-7, -13, 14, 4); g.fillStyle = glow; g.beginPath(); g.arc(-3.5, -11, 1.6, 0, TAU); g.arc(3.5, -11, 1.6, 0, TAU); g.fill(); }
    else if (op === 'ember') { g.fillStyle = grey('#15171c'); g.fillRect(-6, -2, 12, 7); g.fillStyle = grey(kt.plate); g.beginPath(); g.arc(-5.5, 2, 2.4, 0, TAU); g.arc(5.5, 2, 2.4, 0, TAU); g.fill(); g.fillStyle = glow; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-6 + i * 4, -13); g.lineTo(-4 + i * 4, -23 + Math.abs(i - 1.5) * 3); g.lineTo(-2 + i * 4, -13); g.closePath(); g.fill(); } }
    else if (op === 'axiom') { g.fillStyle = grey(kt.plate); g.beginPath(); g.arc(0, -8, 10, Math.PI, TAU); g.fill(); g.fillRect(-13, -9, 26, 2.4); g.fillStyle = glow; g.fillRect(-8, -6, 16, 2.6); g.beginPath(); g.arc(0, -16, 1.8, 0, TAU); g.fill(); }
    else { g.fillStyle = glow; tx(g, (O.n || '?')[0], 0, -4, 12, glow, 'center', 900); }
    g.restore();
  }
  function drawBanner(g, V, u) {
    if (!banner) return; const t = (performance.now() - banner.t0) / 1000, T = 2; if (t > T) { banner = null; return; }
    const B = banner, E = B.em, cx = 640, cy = V.y1 - (isTouch() ? 150 : 128) * u, R = 44 * u * (1 + Math.min(4, B.n - 1) * .05);
    const pop = t < .16 ? 1.55 - .55 * smooth(t / .16) : 1 + Math.sin(Math.min(1, (t - .16) / .25) * Math.PI) * .05, a = t > T - .4 ? (T - t) / .4 : 1;
    g.save(); g.globalAlpha = a; g.translate(cx, cy);
    if (t < .55) { const q = t / .55; g.strokeStyle = E.glow; g.globalAlpha = a * (1 - q) * .8; g.lineWidth = 6 * u * (1 - q) + 1; g.beginPath(); g.arc(0, 0, R * (1.1 + q * 1.6), 0, TAU); g.stroke();   // a ring bursting out
      for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + .13, r0 = R * (1.15 + q * .9), r1 = r0 + R * .5 * (1 - q); g.beginPath(); g.moveTo(Math.cos(an) * r0, Math.sin(an) * r0); g.lineTo(Math.cos(an) * r1, Math.sin(an) * r1); g.stroke(); } g.globalAlpha = a; }
    g.scale(pop, pop);
    const hex = rr0 => { g.beginPath(); for (let i = 0; i < 6; i++) { const an = -Math.PI / 2 + i * TAU / 6; g.lineTo(Math.cos(an) * rr0, Math.sin(an) * rr0); } g.closePath(); };
    g.shadowColor = E.glow; g.shadowBlur = 22 * u; hex(R); g.fillStyle = 'rgba(10,14,20,.86)'; g.fill(); g.shadowBlur = 0;
    g.lineWidth = 3 * u; g.strokeStyle = E.glow; g.stroke(); hex(R * .84); g.lineWidth = 1.2 * u; g.strokeStyle = 'rgba(239,233,220,.3)'; g.stroke();
    glyph(g, E.shape, R * .92, E.col, 'rgba(10,14,20,.95)');
    if (t < .12) { g.globalAlpha = a * (1 - t / .12); hex(R); g.fillStyle = '#ffffff'; g.fill(); g.globalAlpha = a; }   // the white flash as it lands
    g.restore(); g.save(); g.globalAlpha = a;
    // pips: one diamond for each kill in this run
    const n = Math.max(1, B.n), pw = 16 * u, px0 = cx - (n - 1) * pw / 2, py = cy + R + 16 * u;
    for (let i = 0; i < n; i++) { const fresh = i === n - 1, sz = 5.5 * u * (fresh && t < .25 ? 1 + (1 - t / .25) * .8 : 1); g.fillStyle = fresh ? E.glow : BONE; g.beginPath(); g.moveTo(px0 + i * pw, py - sz); g.lineTo(px0 + i * pw + sz, py); g.lineTo(px0 + i * pw, py + sz); g.lineTo(px0 + i * pw - sz, py); g.closePath(); g.fill(); }
    const run = ['', '', 'DOUBLE', 'TRIPLE', 'QUAD', 'RAMPAGE'][Math.min(5, B.n)];
    if (run) tx(g, run, cx, cy - R - 16 * u, 14 * u, E.glow, 'center', 900);
    tx(g, 'ELIMINATED  ' + B.name.toUpperCase(), cx, py + 20 * u, 12 * u, 'rgba(239,233,220,.8)', 'center', 800);
    g.restore();
  }
  // a running step or a shot from the rival marks the minimap for a moment (only if a bot could have heard it too)
  const note = f => { if (M && f && f.team !== me().team && Math.hypot(f.x - me().x, f.z - me().z) < 30) heard = { x: f.x, z: f.z, t: 1.6 }; };   // any rival, not just the nearest
  on('step', note); on('shot', (f, S, first) => { if (first && !gun(f).sil) note(f); });
  function resetMini() { mmCanvas = null; }
  // the sites by letter: 'A or B', 'A, B or C'
  const siteWords = (w = 'or') => { const k = SITES.map(S => S.k); return k.length < 2 ? k.join('') : k.slice(0, -1).join(', ') + ' ' + w + ' ' + k[k.length - 1]; };
  const MM_COL = { r: 'rgba(255,138,61,.4)', T: 'rgba(61,242,255,.95)', J: 'rgba(255,210,63,.95)', H: 'rgba(150,150,140,.95)', i: 'rgba(170,220,255,.75)', g: 'rgba(90,170,70,.75)', L: 'rgba(120,140,255,.55)', V: 'rgba(255,150,70,.9)',
    '<': 'rgba(242,181,30,.55)', '>': 'rgba(242,181,30,.55)', '^': 'rgba(242,181,30,.55)', v: 'rgba(242,181,30,.55)', G: 'rgba(232,181,32,.9)', W: 'rgba(160,110,80,.95)' };
  function miniMap() {
    if (mmCanvas) return mmCanvas; const s = 8, c = mmCanvas = document.createElement('canvas'); c.width = GW * s; c.height = GH * s; const g = c.getContext('2d');
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const ch = SRC[j][i]; g.fillStyle = MM_COL[ch] ? MM_COL[ch] : ch === '#' ? 'rgba(12,16,22,.9)' : ch === '~' ? 'rgba(53,150,170,.8)' : ch === 'X' ? 'rgba(70,80,96,.95)' : ch === 'c' ? 'rgba(150,120,84,.95)' : ch === 'o' || ch === 'q' ? 'rgba(255,138,61,.4)' : ch === 'P' || ch === '7' || ch === '8' ? 'rgba(190,190,180,.75)' : 'rgba(210,205,190,.5)'; g.fillRect(i * s, j * s, s, s); }
    // the sites: every plantable cell in the site colour, with a light rim where the site meets open ground (as on the floor)
    for (const S of SITES) { const P = siteSpot(S); g.fillStyle = 'rgba(255,138,61,.88)'; for (const [i, j] of P.cells) g.fillRect(i * s, j * s, s, s);
      g.fillStyle = 'rgba(255,226,190,1)'; for (const [i, j, e] of P.edges) g.fillRect(i * s + (e === 0 ? s - 2 : 0), j * s + (e === 2 ? s - 2 : 0), e < 2 ? 2 : s, e < 2 ? s : 2); }
    return c;
  }
  // a site's letter (the plant mark on a one-site map) over its spot on a plan of the map
  function siteLabel(g, S, mx, my, k, px) {
    const P = siteSpot(S), s = SITES.length > 1 ? S.k : '◆', x = mx + P.x * k, y = my + P.z * k; px = fitPx(g, px);
    g.font = `900 ${px}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = Math.max(2, px * .26); g.strokeStyle = 'rgba(12,16,22,.92)'; g.strokeText(s, x, y); g.fillStyle = '#fff3e4'; g.fillText(s, x, y);
  }
  // what the HUD keeps in the lower corners, as boxes [x0, y0, x1, y1] in its units, for the site markers to stay clear of.
  // On a phone: each thumb button, the corner the move stick rests in (to the screen's edge, where the thumb lies), and the
  // stick wherever it is held. Otherwise the health and abilities panel and the weapon panel with its gun list (as drawn in drawHUD).
  function markCover(V, u, touch) {
    if (!touch) { const r = V.x1 - 22 - 50 / pxPer(); return [[V.x0 + 22, V.y1 - 20 - 58 * u, V.x0 + 22 + 640 * u, V.y1], [r - 270 * u, V.y1 - 20 - 58 * u, r, V.y1], [r - 150 * u, V.y1 - 20 - 136 * u, r, V.y1]]; }
    const c = touchButtons().map(b => [b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r]), s = TS.stick;
    c.push([V.x0, V.y1 - 212 * u, V.x0 + 232 * u, V.y1]); if (s) c.push([s.x0 - 92 * u, s.y0 - 116 * u, s.x0 + 92 * u, s.y0 + 92 * u]);
    return c;
  }
  /* The sites in the world: a diamond with the letter and how far it is, over each site's spot. They show through the buy
     phase and the first seconds of the round, then fade out unless you are far from every site, and each fades as you
     come up to it. One off the screen (or behind you) waits at the edge, pointing the way. */
  function drawSiteMarks(g, P, u) {
    if (!X || !ready || !P || !P.alive || M.planted || (M.phase !== 'buy' && M.phase !== 'live') || M.mode === 'range' || M.mode === 'demo' || (P.scoped && gun(P).scope)) return;
    const early = M.phase === 'buy' ? 1 : cl(1 - (roundT() - M.t - 9) / 2, 0, 1);
    const near = SITES.map(S => { let d = 1e9; for (const [i, j] of siteSpot(S).cells) d = Math.min(d, Math.hypot((i + .5) * CS - P.x, (j + .5) * CS - P.z)); return d; });
    const show = Math.max(early, cl((Math.min(...near) - 30) / 10, 0, 1)); if (show <= 0) return;
    const V = K.view, cam = X.camera, two = SITES.length > 1, ix = 1 - 2 * 48 / (V.x1 - V.x0), iy = 1 - 2 * 96 * u / (V.y1 - V.y0);
    const marks = [];
    SITES.forEach((S, n) => {
      const Q = siteSpot(S), a = show * cl((near[n] - 2) / 8, 0, 1); if (a <= .02) return;
      const v = new THREE.Vector3(Q.x, Q.y + 2.4, Q.z), c = v.clone().applyMatrix4(cam.matrixWorldInverse); let nx, ny, edge = false;
      if (c.z < -.2) { v.project(cam); nx = v.x; ny = v.y; }
      else { const k = cl((Math.abs(Math.atan2(c.x, -c.z)) - Math.PI / 2) / (Math.PI / 2), 0, 1); nx = (c.x < 0 ? -1 : 1) * ix; ny = -k * iy; edge = true; }   // beside or behind you: on that side's edge, lower the further round it is
      if (Math.abs(nx) > ix || Math.abs(ny) > iy) { const q = Math.min(ix / Math.max(Math.abs(nx), 1e-6), iy / Math.max(Math.abs(ny), 1e-6)); nx *= q; ny *= q; edge = true; }
      marks.push({ S, a, nx, ny, edge, x: lp(V.x0, V.x1, (nx + 1) / 2), y: lp(V.y0, V.y1, (1 - ny) / 2), d: Math.round(Math.hypot(Q.x - P.x, Q.z - P.z)) });
    });
    // the lower corners hold the HUD's panels, or on a phone the thumb controls (drawn over this), and the top left on a
    // phone the pause and settings buttons: no marker sits under one, and on a phone those on the side edges keep to the
    // stretch of edge between them
    const touch = isTouch(), cover = markCover(V, u, touch), hw = 26 * u, above = 20 * u, below = 37 * u, gap = 52 * u;
    const clear = (x, y) => { for (let n = 0; n < 12; n++) { const c = cover.find(c => x + hw > c[0] && x - hw < c[2] && y + below > c[1] && y - above < c[3]); if (!c) break; y = c[1] - below - 3 * u; } return y; };
    const top0 = lp(V.y0, V.y1, (1 - iy) / 2), lo0 = lp(V.y0, V.y1, (1 + iy) / 2), mid = (V.y0 + V.y1) / 2;
    // two on the same edge never sit on top of each other
    for (const side of [-1, 1]) { const col = marks.filter(k => k.edge && Math.sign(k.nx) === side && Math.abs(k.nx) >= ix - .01).sort((p, q) => p.y - q.y), top = touch ? Math.max(top0, V.y0 + 98 / pxPer() + above + 6 * u) : top0;
      const lo = Math.max(top, clear(side < 0 ? V.x0 + 48 : V.x1 - 48, lo0)); for (const k of col) k.col = true;
      if (touch) {   // squeeze the edge (beside you at the middle while there is room, behind you at the lowest clear point) into the clear stretch
        const ya = Math.max(top, Math.min(mid, lo - 1.2 * gap));
        for (const k of col) k.y = k.y <= mid ? lp(top, ya, cl((k.y - top0) / (mid - top0), 0, 1)) : lp(ya, lo, cl((k.y - mid) / (lo0 - mid), 0, 1)); }
      for (let i = 1; i < col.length; i++) col[i].y = Math.max(col[i].y, col[i - 1].y + gap); for (let i = col.length - 1; i >= 0; i--) { if (col[i].y > lo) col[i].y = lo; if (i < col.length - 1) col[i].y = Math.min(col[i].y, col[i + 1].y - gap); } }
    for (const k of marks) if (!k.col) k.y = clear(k.x, k.y);   // one in view but under a panel or a button: lifted just clear of it
    for (const { S, a, nx, ny, edge, x, y, d } of marks) {
      const r = 14 * u * (edge ? .85 : 1);
      g.save(); g.globalAlpha = a * (edge ? .85 : 1); g.translate(x, y);
      if (edge) { const ang = Math.atan2(-ny, nx); g.save(); g.rotate(ang); g.fillStyle = '#ff8a3d'; g.beginPath(); g.moveTo(r * 2.1, 0); g.lineTo(r * 1.45, -r * .5); g.lineTo(r * 1.45, r * .5); g.closePath(); g.fill(); g.restore(); }
      g.fillStyle = 'rgba(12,16,22,.78)'; g.strokeStyle = '#ff8a3d'; g.lineWidth = 2.5 * u; g.beginPath(); g.moveTo(0, -r * 1.3); g.lineTo(r * 1.1, 0); g.lineTo(0, r * 1.3); g.lineTo(-r * 1.1, 0); g.closePath(); g.fill(); g.stroke();
      if (two) tx(g, S.k, 0, 1 * u, 17 * u, '#ffd2ad', 'center', 900); else { g.fillStyle = '#ff8a3d'; g.beginPath(); g.moveTo(0, -r * .5); g.lineTo(r * .42, 0); g.lineTo(0, r * .5); g.lineTo(-r * .42, 0); g.closePath(); g.fill(); }
      const px = fitPx(g, 13 * u); g.font = `800 ${px}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = 3 * u; g.strokeStyle = 'rgba(12,16,22,.85)'; g.strokeText(d + ' m', 0, r * 1.3 + 11 * u); g.fillStyle = BONE; g.fillText(d + ' m', 0, r * 1.3 + 11 * u);
      g.restore();
    }
  }
  // standing on a site with the charge: say so, which site, and the key that plants it
  function onSiteHint(g, letter, key, y, u) {
    const a = 'ON SITE' + (SITES.length > 1 ? ' ' + letter : ''), b = key.toUpperCase() + ' TO PLANT', p1 = fitPx(g, 19 * u), p2 = fitPx(g, 15 * u);
    g.font = `900 ${p1}px ${FONT}`; const w1 = g.measureText(a).width; g.font = `800 ${p2}px ${FONT}`; const w2 = g.measureText(b).width;
    const d = 8 * u, gap = 16 * u, w = 20 * u + d * 2 + 12 * u + w1 + gap + w2 + 22 * u, h = 40 * u, x0 = 640 - w / 2, pulse = .5 + .5 * Math.sin(K.t * 5);
    rr(g, x0, y - h / 2, w, h, h / 2, 'rgba(12,16,22,.82)', `rgba(255,138,61,${.55 + .45 * pulse})`, 2 * u);
    let x = x0 + 20 * u + d; g.fillStyle = '#ff8a3d'; g.beginPath(); g.moveTo(x, y - d * 1.25); g.lineTo(x + d, y); g.lineTo(x, y + d * 1.25); g.lineTo(x - d, y); g.closePath(); g.fill();
    x += d + 12 * u; tx(g, a, x, y, 19 * u, '#ffb070', 'left', 900); x += w1 + gap; tx(g, b, x, y, 15 * u, BONE, 'left', 800);
  }
  function hint(g, s, y, px, col) { if (!s) return; px = fitPx(g, px); g.font = `700 ${px}px ${FONT}`; const w = g.measureText(s).width + px * 1.6; rr(g, 640 - w / 2, y - px * .95, w, px * 1.9, px * .5, 'rgba(12,16,22,.62)'); tx(g, s, 640, y, px, col); }
  const clock = t => { t = Math.max(0, Math.ceil(t)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

  // ---- the loading screen: the new map turning slowly behind its name, the mode, a plan of the map, and every player's
  // card (operative, name, rank and rating), your team on the left
  const TAGS = { saltworks: 'A salt harbour at low tide. One site, three ways in.', neonrow: 'Back streets under the signs. Nobody sleeps here.', frostline: 'A weather station on the edge of the ice.',
    dunewatch: 'A border post half buried in the dunes.', overgrowth: 'A jungle outpost the forest is taking back.', foundry: 'Molten steel and a long way down.', orbital: 'A station deck above a blue planet.' };
  function rankBadge(g, x, y, r, rating) {
    const i = diffFor(rating).i, col = RANK_COL[i]; g.save(); g.translate(x, y); g.fillStyle = col; g.strokeStyle = col; g.lineWidth = r * .22;
    g.beginPath(); for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + k * TAU / 6; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.globalAlpha = .22; g.fill(); g.globalAlpha = 1; g.stroke();
    g.fillStyle = col; for (let k = 0; k <= i; k++) { const yy = r * .35 - k * r * .32; g.beginPath(); g.moveTo(-r * .5, yy + r * .12); g.lineTo(0, yy - r * .2); g.lineTo(r * .5, yy + r * .12); g.lineTo(r * .5, yy + r * .3); g.lineTo(0, yy - .02 * r); g.lineTo(-r * .5, yy + r * .3); g.closePath(); g.fill(); }
    g.restore();
  }
  // a name squeezed onto a card w wide: a touch smaller first, then cut with an ellipsis. Gives [text, px] for tx
  function fitName(g, s, w, px, weight = 800) {
    const width = (t, p) => { g.font = `${weight} ${fitPx(g, p)}px ${FONT}`; return g.measureText(t).width; };
    for (const k of [1, .9, .82]) if (width(s, px * k) <= w) return [s, px * k];
    const p = px * .82; let t = s; while (t.length > 1 && width(t + '…', p) > w) t = t.slice(0, -1);
    return [t.trimEnd() + '…', p];
  }
  function drawLoading(g) {
    if (!UI.loadT0 || UI.loadM !== M) { UI.loadT0 = performance.now(); UI.loadM = M; }
    const V = K.view, u = uiScale(), W = V.x1 - V.x0, H = V.y1 - V.y0, P = me(), k = cl(1 - (M.t - BUY_T) / M.loadT, 0, 1), rt = (performance.now() - UI.loadT0) / 1000, ease = smooth(cl(rt / .5, 0, 1));
    if (!M.online) zone(V.x0, V.y0, W, H, skipLoad);
    let gr = g.createLinearGradient(V.x0, 0, V.x0 + W * .62, 0); gr.addColorStop(0, 'rgba(8,10,14,.94)'); gr.addColorStop(.7, 'rgba(8,10,14,.55)'); gr.addColorStop(1, 'rgba(8,10,14,0)'); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, H);
    gr = g.createLinearGradient(0, V.y1 - 220 * u, 0, V.y1); gr.addColorStop(0, 'rgba(8,10,14,0)'); gr.addColorStop(1, 'rgba(8,10,14,.92)'); g.fillStyle = gr; g.fillRect(V.x0, V.y1 - 220 * u, W, 220 * u);
    const x0 = V.x0 + 64 * u, slide = (1 - ease) * -40 * u, acc = (THEMES[MAP.theme] || THEMES.harbor).sky[1], two = SITES.length > 1, side = sideOf(P);
    g.save(); g.globalAlpha = ease; g.translate(slide, 0);
    g.fillStyle = acc; g.fillRect(x0, V.y0 + 70 * u, 8 * u, 150 * u);
    tx(g, 'NOW ENTERING', x0 + 26 * u, V.y0 + 86 * u, 14 * u, DIM, 'left', 800);
    if (M.online && !M.allIn) { const hs = M.fs.filter(f => !f.isBot && !f.gone), n = hs.filter(f => f.loaded || f === P).length; tx(g, `WAITING FOR EVERYONE TO LOAD · ${n}/${hs.length}`, x0 + 26 * u, V.y0 + 60 * u, 14 * u, GOLD, 'left', 900); }
    tx(g, MAP.n.toUpperCase(), x0 + 22 * u, V.y0 + 140 * u, 86 * u, BONE, 'left', 900);
    tx(g, MAP.tag || TAGS[MAP.k] || '', x0 + 26 * u, V.y0 + 196 * u, 16 * u, '#c9cfd8', 'left', 600);
    if (MAP.tip) { g.save(); g.font = `700 ${fitPx(g, 14 * u)}px ${FONT}`; const tw = Math.min(g.measureText(MAP.tip).width + 30 * u, 620 * u); rr(g, x0 + 22 * u, V.y0 + 214 * u, tw, 30 * u, 6, 'rgba(12,16,22,.62)', acc, 1.5); g.restore();
      g.save(); g.beginPath(); g.rect(x0 + 22 * u, V.y0 + 214 * u, tw, 30 * u); g.clip(); tx(g, MAP.tip, x0 + 36 * u, V.y0 + 229 * u, 13 * u, BONE, 'left', 700); g.restore(); }
    const chips = [two ? 'TWO SITES' : 'ONE SITE', M.fs.filter(q => q.team === P.team).length + 'V' + M.fs.filter(q => q.team !== P.team).length, 'FIRST TO ' + WIN_ROUNDS, ...(M.ranked ? ['RANKED'] : [])];
    // the mode, the team size and the target ride on the NOW ENTERING line (lower down they sat under the map's tip)
    g.font = `800 ${fitPx(g, 14 * u)}px ${FONT}`; let cx = x0 + 26 * u + g.measureText('NOW ENTERING').width + 18 * u;
    for (const c of chips) { const px = fitPx(g, 12 * u); g.font = `800 ${px}px ${FONT}`; const w = g.measureText(c).width + px * 1.8, h = Math.max(26 * u, px * 1.9); rr(g, cx, V.y0 + 86 * u - h / 2, w, h, 4, 'rgba(239,233,220,.1)', 'rgba(239,233,220,.25)', 1); tx(g, c, cx + w / 2, V.y0 + 86 * u, 12 * u, BONE, 'center', 800); cx += w + 8 * u; }
    tx(g, side === 'att' ? 'YOU ATTACK FIRST' : 'YOU DEFEND FIRST', x0 + 26 * u, V.y0 + 282 * u, 22 * u, side === 'att' ? FOE : YOU, 'left', 900);
    tx(g, side === 'att' ? (two ? 'Plant the charge on site ' + siteWords() : 'Plant the charge on the site') : (two ? 'Hold ' + (SITES.length > 2 ? 'all three' : 'both') + ' sites. Stop the plant, or defuse it' : 'Stop the plant, or defuse it'), x0 + 26 * u, V.y0 + 308 * u, 14 * u, '#c9cfd8', 'left', 600);
    // the plan of the map, with the sites marked
    { const mw = Math.min(230 * u, (V.y1 - 136 * u - (V.y0 + 332 * u)) * GW / GH), mh = mw * GH / GW, mx = x0 + 26 * u, my = V.y0 + 332 * u, kk = mw / MW; /* a tall map's plan stops short of the player cards */ g.globalAlpha = ease * .92; g.drawImage(miniMap(), mx, my, mw, mh); g.globalAlpha = ease; g.strokeStyle = 'rgba(239,233,220,.3)'; g.lineWidth = 1.5; g.strokeRect(mx, my, mw, mh);
      for (const S of SITES) siteLabel(g, S, mx, my, kk, 16 * u);
      const sp = SPAWN[side][0]; if (sp) { g.fillStyle = side === 'att' ? FOE : YOU; g.beginPath(); g.arc(mx + sp[0] * kk, my + sp[1] * kk, 5 * u, 0, TAU); g.fill(); tx(g, 'YOU', mx + sp[0] * kk, my + sp[1] * kk - 12 * u, 10 * u, BONE, 'center', 800); } }
    g.restore();
    // the players: a card each
    const mine = M.fs.filter(q => q.team === P.team).sort((a, b) => (b === P) - (a === P)), theirs = M.fs.filter(q => q.team !== P.team);
    // 3v3 cards are narrower; 4v4 ones (tiny) stack their words in three short lines, with tighter margins and gaps
    const per = Math.max(2, mine.length, theirs.length), cw0 = (W - 140 * u - (2 * per - 2) * 10 * u) / (2 * per), tiny = cw0 < 170 * u, m = tiny ? 14 * u : 40 * u, gp = tiny ? 6 * u : 10 * u,
      cw = Math.min(250 * u, tiny ? (W - 2 * m - 48 * u - (2 * per - 2) * gp) / (2 * per) : cw0), ch = 74 * u, y = V.y1 - ch - (tiny ? 52 : 40) * u, slim = cw < 215 * u, pw = tiny ? 36 * u : 42 * u;   // (tiny ones sit a little higher, clear of the sound button)
    const card = (q, x, col, i) => {
      const a = smooth(cl((rt - .35 - i * .12) / .4, 0, 1)); g.save(); g.globalAlpha = a; g.translate(0, (1 - a) * 30 * u);
      rr(g, x, y, cw, ch, 6, 'rgba(12,16,22,.88)', q === P ? 'rgba(239,233,220,.6)' : 'rgba(239,233,220,.14)', q === P ? 2 : 1); g.fillStyle = col; g.fillRect(x, y, 5 * u, ch);
      if (tiny) { const O2 = OPS[q.op] || OPS.vex, tx0 = x + 12 * u + pw; portraitTile(g, q.op, x + 8 * u, y + 6 * u, pw, ch - 12 * u, { r: 4 });
        g.save(); g.beginPath(); g.rect(tx0 - 2 * u, y, x + cw - 3 * u - (tx0 - 2 * u), ch); g.clip();
        { const [nm, npx] = fitName(g, q.name.toUpperCase(), x + cw - 6 * u - tx0, 12.5 * u); tx(g, nm, tx0, y + 17 * u, npx, BONE, 'left', 800); } tx(g, O2.n, tx0, y + 37 * u, 10.5 * u, O2.col, 'left', 800);
        const isB = q.bot || q.isBot, lx = q.rating ? tx0 + 16 * u : tx0; if (q.rating) rankBadge(g, tx0 + 6 * u, y + 57 * u, 6.5 * u, q.rating);   // the third line: a bot says so, a player shows their rating
        tx(g, isB ? 'BOT' : q.rating ? String(q.rating) : q === P ? 'YOU' : 'PLAYER', lx, y + 57 * u, 10.5 * u, isB ? DIM : BONE, 'left', 800);
        g.restore(); g.restore(); return; }
      portraitTile(g, q.op, x + 8 * u, y + 6 * u, 56 * u, ch - 12 * u, { r: 4 });
      { const rk = q.rating && !slim ? (g.font = `800 ${fitPx(g, 11 * u)}px ${FONT}`, g.measureText(rankName(q.rating).toUpperCase()).width + 52 * u) : (q.rating ? 40 : 36) * u;   // clear of the rank beside it
        const [nm, npx] = fitName(g, q.name.toUpperCase(), cw - 74 * u - rk, (slim ? 14 : 16) * u); tx(g, nm, x + 74 * u, y + 24 * u, npx, BONE, 'left', 800); } tx(g, (OPS[q.op] || OPS.vex).n, x + 74 * u, y + 44 * u, 11 * u, (OPS[q.op] || OPS.vex).col, 'left', 800);
      if (M.ranked && !(q.bot || q.isBot) && q.rk != null) { const on = !!q.rkp; tierBadge(g, x + cw - 22 * u, y + 28 * u, 12 * u, q.rk, on); if (!slim) tx(g, on ? rankLabel(q.rk).toUpperCase() : 'UNRANKED', x + cw - 40 * u, y + 24 * u, 11 * u, on ? rankOf(q.rk).T.col : DIM, 'right', 800); }
      else if (q.rating && slim) { rankBadge(g, x + cw - 22 * u, y + 26 * u, 12 * u, q.rating); tx(g, String(q.rating), x + cw - 22 * u, y + 56 * u, 11 * u, BONE, 'center', 700); }
      else if (q.rating) { rankBadge(g, x + cw - 24 * u, y + 28 * u, 13 * u, q.rating); tx(g, rankName(q.rating).toUpperCase(), x + cw - 42 * u, y + 24 * u, 11 * u, RANK_COL[diffFor(q.rating).i], 'right', 800); tx(g, String(q.rating), x + cw - 42 * u, y + 42 * u, 13 * u, BONE, 'right', 700); }
      else tx(g, '—', x + cw - 24 * u, y + 30 * u, 14 * u, DIM, 'center');
      tx(g, q.bot ? 'BOT' : q.net && !q.isBot ? 'PLAYER' : q === P ? 'YOU' : 'BOT', x + 74 * u, y + 60 * u, 10 * u, DIM, 'left', 800);
      g.restore();
    };
    mine.forEach((q, i) => card(q, V.x0 + m + i * (cw + gp), YOU, i)); theirs.forEach((q, i) => card(q, V.x1 - m - (i + 1) * (cw + gp) + gp, FOE, i + 1));
    tx(g, 'VS', 640, y + ch / 2, 26 * u, 'rgba(239,233,220,.55)', 'center', 900);
    // progress
    g.fillStyle = 'rgba(239,233,220,.12)'; g.fillRect(V.x0, V.y1 - 6 * u, W, 6 * u); g.fillStyle = acc; g.fillRect(V.x0, V.y1 - 6 * u, W * k, 6 * u);
    if (!M.online) tx(g, isTouch() ? 'Tap to skip' : 'Click to skip', V.x1 - 24 * u, V.y1 - 22 * u, 11 * u, DIM, 'right', 700);
  }

  // ---- the big moments: a band that sweeps across the top of the screen (the charge planted, an ace, a clutch)
  let SWEEP = null; const sweep = (title, sub, col) => { SWEEP = { t0: performance.now(), title, sub, col }; };
  on('planted', () => { if (!M || M.mode === 'range') return; const att = sideOf(me()) === 'att', S = M.planted && twoSites() ? 'SITE ' + SITES[M.planted.s].k + '  ·  ' : ''; sweep('CHARGE PLANTED', S + (att ? 'HOLD IT FOR ' + FUSE_T + ' SECONDS' : 'DEFUSE IT  ·  ' + FUSE_T + ' SECONDS'), att ? FOE : WARN); });
  on('defused', f => { if (!M || M.mode === 'range') return; sweep('CHARGE DEFUSED', f ? f.name.toUpperCase() : '', f && f.team === me().team ? YOU : FOE); });
  on('ace', f => { if (!M) return; sweep('ACE', f.name.toUpperCase() + ' TOOK THE WHOLE TEAM', GOLD); });
  on('clutch', (f, vs) => { if (!M) return; sweep('CLUTCH', `${f.name.toUpperCase()}  ·  1 v ${vs}`, f.team === me().team ? YOU : FOE); });
  function drawSweep(g) {
    if (!SWEEP) return; const t = (performance.now() - SWEEP.t0) / 1000, D = 2.6; if (t > D) { SWEEP = null; return; }
    const V = K.view, u = uiScale(), W = V.x1 - V.x0, cy = V.y0 + 168 * u, hh = 46 * u, inK = smooth(cl(t / .28, 0, 1)), outK = smooth(cl((t - D + .35) / .35, 0, 1)), sk = 40 * u;
    const x0 = lp(V.x0 - W, V.x0, inK) + outK * W, x1 = x0 + W, col = SWEEP.col;
    g.save(); g.globalAlpha = .9; g.fillStyle = 'rgba(8,10,14,.86)'; g.beginPath(); g.moveTo(x0 + sk, cy - hh); g.lineTo(x1 + sk, cy - hh); g.lineTo(x1 - sk, cy + hh); g.lineTo(x0 - sk, cy + hh); g.closePath(); g.fill();
    g.globalAlpha = 1; g.fillStyle = col; g.fillRect(x0, cy - hh, W, 3 * u); g.fillRect(x0, cy + hh - 3 * u, W, 3 * u);
    const sh = ((t * 900 * u) % (W + 400 * u)) - 200 * u; const gr = g.createLinearGradient(x0 + sh - 120 * u, 0, x0 + sh + 120 * u, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x0, cy - hh, W, hh * 2);   // a glint runs along it
    const tx0 = 640 + (1 - inK) * -160 * u + outK * 160 * u, pop = 1 + .18 * Math.max(0, 1 - t / .35);
    tx(g, SWEEP.title, tx0, cy - 8 * u, 46 * u * pop, col, 'center', 900); if (SWEEP.sub) tx(g, SWEEP.sub, tx0, cy + 27 * u, 14 * u, BONE, 'center', 800);
    g.restore();
  }
  // ---- switching sides: a band across the screen at the start of the second half (and the decider) says which side you are now
  function drawSwitch(g) {
    const S = UI.switched; if (!S) return; const t = (performance.now() - S.t0) / 1000; if (t > 3.2) { UI.switched = null; return; }
    const V = K.view, u = uiScale(), W = V.x1 - V.x0, a = t < .25 ? smooth(t / .25) : t > 2.8 ? 1 - (t - 2.8) / .4 : 1, col = S.side === 'att' ? FOE : YOU, cy = 330;
    g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(V.x0, cy - 78 * u, W, 156 * u); g.fillStyle = col; g.fillRect(V.x0, cy - 78 * u, W, 4 * u); g.fillRect(V.x0, cy + 74 * u, W, 4 * u);
    const sw = (t * 260 * u) % (80 * u); for (let i = -2; i < W / (80 * u) + 2; i++) { const x = V.x0 + i * 80 * u + sw; g.fillStyle = 'rgba(239,233,220,.05)'; g.beginPath(); g.moveTo(x, cy - 74 * u); g.lineTo(x + 30 * u, cy - 74 * u); g.lineTo(x + 70 * u, cy); g.lineTo(x + 30 * u, cy + 74 * u); g.lineTo(x, cy + 74 * u); g.lineTo(x + 40 * u, cy); g.closePath(); g.fill(); }
    tx(g, S.sd ? 'SUDDEN DEATH  ·  NEXT ROUND WINS' : S.decider ? (S.first ? 'OVERTIME  ·  WIN BY TWO' : 'OVERTIME  ·  SIDES SWAP EVERY ROUND') : 'SWITCHING SIDES', 640, cy - 34 * u, 20 * u, S.decider ? GOLD : DIM, 'center', 900);
    tx(g, S.side === 'att' ? 'YOU NOW ATTACK' : 'YOU NOW DEFEND', 640, cy + 12 * u, 54 * u, col, 'center', 900);
    tx(g, S.side === 'att' ? (SITES.length > 1 ? 'Take the charge to ' + siteWords() : 'Take the charge to the site') : 'Hold them off, or defuse the charge', 640, cy + 52 * u, 15 * u, BONE, 'center', 700);
    g.restore();
  }
  // ---- the scoreboard mid-match: hold Tab (on a phone, tap the clock) for everyone's kills, deaths, headshots and damage,
  // who is still standing this round, and your team's credits. Your team first (you at the top), then theirs, best first.
  if (typeof document !== 'undefined') { addEventListener('keydown', e => { if (e.code === 'Tab') UI.board = true; }); addEventListener('keyup', e => { if (e.code === 'Tab') UI.board = false; }); addEventListener('blur', () => { UI.board = false; }); }
  on('over', () => { UI.board = false; });
  function drawBoard(g, V, u) {
    const P = me(), mine = M.fs.filter(f => f.team === P.team).sort((a, b) => csOf(b) - csOf(a)), theirs = M.fs.filter(f => f.team !== P.team).sort((a, b) => csOf(b) - csOf(a)), n = mine.length + theirs.length;
    const tw = Math.min(740 * u, V.x1 - V.x0 - 40 * u), s = tw / (740 * u), x0 = 640 - tw / 2, top = V.y0 + 84 * u, hh = 32 * u, bh = 22 * u, rh = Math.max(20 * u, Math.min(34 * u, (V.y1 - 24 * u - top - hh - 2 * bh - 10 * u) / n)), th = hh + 2 * bh + n * rh + 10 * u;
    const cols = [['SCORE', f => csOf(f), 330], ['K', f => f.stat.k, 284], ['D', f => f.stat.d, 248], ['FK', f => f.stat.fk | 0, 212], ['HS', f => f.stat.hs, 176], ['DMG', f => Math.round(f.stat.dmg), 112], ['CREDITS', f => f.team === P.team && !f.gone && (f === P || !f.net) ? '◈ ' + f.credits : '', 18]];
    g.save(); rr(g, x0, top, tw, th, 10, 'rgba(10,13,18,.92)', 'rgba(239,233,220,.2)', 1.5);
    tx(g, 'SCOREBOARD', x0 + 16 * u, top + hh / 2, 13 * u, BONE, 'left', 900); tx(g, `ROUND ${M.round}  ·  ${M.wins[0]} – ${M.wins[1]}`, x0 + 136 * u, top + hh / 2, 11 * u, DIM, 'left', 800);
    for (const [k, , dx] of cols) tx(g, k, x0 + tw - dx * u * s, top + hh / 2, 10 * u, DIM, 'right', 900);
    let y = top + hh;
    const row = (f, col) => { const down = !f.alive || f.gone; if (f === P) { g.fillStyle = 'rgba(53,224,200,.12)'; g.fillRect(x0 + 4 * u, y + 1, tw - 8 * u, rh - 2); }
      g.fillStyle = col; g.fillRect(x0 + 4 * u, y + 2, 3 * u, rh - 4); portraitTile(g, f.op, x0 + 12 * u, y + 2, rh - 4, rh - 4, { r: 3, dead: down });
      g.globalAlpha = down ? .5 : 1; const tag = f.gone ? '  · LEFT' : f === P ? '' : f.bot || f.isBot ? '  · BOT' : '', [nm, npx] = fitName(g, (carries(f) && !M.planted && f.team === P.team ? '◆ ' : '') + f.name.toUpperCase() + tag, tw - 360 * u * s - rh - 22 * u, Math.min(14 * u, rh * .5));
      tx(g, nm, x0 + 18 * u + rh, y + rh / 2, npx, f === P ? YOU : BONE, 'left', 800);
      for (const [k, fn, dx] of cols) tx(g, String(fn(f)), x0 + tw - dx * u * s, y + rh / 2, Math.min(k === 'CREDITS' ? 13 * u : 15 * u, rh * .56), k === 'CREDITS' ? GOLD : BONE, 'right', 800);
      g.globalAlpha = 1; y += rh; };
    const band = (label, col, list) => { tx(g, label, x0 + 16 * u, y + bh / 2 + 2 * u, 10 * u, col, 'left', 900); tx(g, `${list.filter(f => f.alive && !f.gone).length} STANDING`, x0 + tw - 18 * u, y + bh / 2 + 2 * u, 10 * u, DIM, 'right', 800); y += bh; list.forEach(f => row(f, col)); };
    band(sideOf(P) === 'att' ? 'YOUR TEAM  ·  ATTACK' : 'YOUR TEAM  ·  DEFEND', YOU, mine); band(sideOf(P) === 'att' ? 'THEIRS  ·  DEFEND' : 'THEIRS  ·  ATTACK', FOE, theirs);
    g.restore(); if (isTouch()) zone(x0, top, tw, th, () => { UI.board = false; });
  }
  function drawHud(g) {
    if (loadingNow()) return drawLoading(g);
    const P = viewer(), F = foe(), G = gun(P), V = K.view, u = uiScale(), touch = isTouch(), side = sideOf(P), W = V.x1 - V.x0, H = V.y1 - V.y0, range = M.mode === 'range', demo = M.mode === 'demo';
    // --- over the whole view: scope, flash, the red of being hit
    if (P.scoped && G.scope && P.alive) { const r = Math.min(H * .46, 330); g.fillStyle = '#000'; g.beginPath(); g.rect(V.x0, V.y0, W, H); g.arc(640, 360, r, 0, TAU, true); g.fill(); g.strokeStyle = 'rgba(0,0,0,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(640 - r, 360); g.lineTo(640 + r, 360); g.moveTo(640, 360 - r); g.lineTo(640, 360 + r); g.stroke(); g.fillStyle = WARN; g.fillRect(639, 359, 2, 2); }
    if (P.flash > 0) { g.fillStyle = `rgba(255,255,255,${cl(P.flash / 1.2, 0, 1)})`; g.fillRect(V.x0, V.y0, W, H); }
    if (M.hurt > 0) { const gr = g.createRadialGradient(640, 360, H * .35, 640, 360, H * .8); gr.addColorStop(0, 'rgba(255,60,50,0)'); gr.addColorStop(1, `rgba(255,60,50,${M.hurt * .5})`); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, H);
      const a = M.hurtDir - P.yaw + Math.PI; g.save(); g.translate(640, 360); g.rotate(-a); g.fillStyle = `rgba(255,90,77,${M.hurt * .8})`; g.beginPath(); g.arc(0, 0, 150 * u, Math.PI * 1.36, Math.PI * 1.64); g.arc(0, 0, 134 * u, Math.PI * 1.64, Math.PI * 1.36, true); g.fill(); g.restore(); }
    // --- markers in the world: a pinged rival, the planted charge
    // teammates: a name and a marker over each, and their health
    for (const q of M.fs) if (q !== P && q.team === P.team && q.alive) { const s = toScreen(q.x, q.y + 2.05, q.z); if (s) { g.fillStyle = YOU; g.beginPath(); g.moveTo(s[0] - 7, s[1] - 10); g.lineTo(s[0] + 7, s[1] - 10); g.lineTo(s[0], s[1]); g.closePath(); g.fill(); tx(g, `${carries(q) ? '◆ ' : ''}${q.name.toUpperCase()} ${Math.ceil(q.hp)}`, s[0], s[1] - 20, 13, carries(q) ? GOLD : YOU, 'center', 800); } }
    if (M.charge && !M.charge.k && !M.planted && side === 'att' && M.phase !== 'end') { const C = M.charge, s = toScreen(C.x, C.y + .8, C.z); if (s) { const p = 1 + Math.sin(M.time * 6) * .12; g.strokeStyle = GOLD; g.lineWidth = 2.5; g.beginPath(); g.moveTo(s[0], s[1] - 11 * p); g.lineTo(s[0] + 9 * p, s[1]); g.lineTo(s[0], s[1] + 11 * p); g.lineTo(s[0] - 9 * p, s[1]); g.closePath(); g.stroke(); tx(g, 'CHARGE  ' + Math.hypot(P.x - C.x, P.z - C.z).toFixed(0) + ' m', s[0], s[1] + 22, 12, GOLD, 'center', 800); } }
    for (const E of M.fs) if (E.alive && E.team !== me().team && E.reveal > 0) { const s = toScreen(E.x, E.y + 1.1, E.z); if (s) { g.strokeStyle = FOE; g.lineWidth = 3; g.beginPath(); g.moveTo(s[0], s[1] - 30); g.lineTo(s[0] + 20, s[1]); g.lineTo(s[0], s[1] + 30); g.lineTo(s[0] - 20, s[1]); g.closePath(); g.stroke(); } }   // everyone revealed, not just the nearest
    // the death cam: whoever killed you, marked where they stand
    if (X.deathCam && M.deathInfo) { const D = M.deathInfo, kf = M.byKey[D.key]; if (kf && kf.alive) { const s = toScreen(ipos(kf, 'x'), ipos(kf, 'y') + 2.25, ipos(kf, 'z')); if (s) { const p = .8 + .2 * Math.sin(K.t * 6);
      g.fillStyle = FOE; g.beginPath(); g.moveTo(s[0], s[1] + 14 * p); g.lineTo(s[0] - 10 * p, s[1]); g.lineTo(s[0] + 10 * p, s[1]); g.closePath(); g.fill(); tx(g, D.by.toUpperCase(), s[0], s[1] - 14, 13, FOE, 'center', 900); } } }
    if (M.planted && M.phase === 'live') { const s = toScreen(M.planted.x, M.planted.y + .9, M.planted.z); if (s) { const p = 1 + Math.sin(M.time * 9) * .12; g.fillStyle = FOE; g.beginPath(); g.moveTo(s[0], s[1] - 11 * u * p); g.lineTo(s[0] + 9 * u * p, s[1]); g.lineTo(s[0], s[1] + 11 * u * p); g.lineTo(s[0] - 9 * u * p, s[1]); g.fill(); tx(g, Math.hypot(P.x - M.planted.x, P.z - M.planted.z).toFixed(0) + ' m', s[0], s[1] + 24 * u, 13 * u, BONE); } }
    drawSiteMarks(g, P, u);   // the sites, while you are finding your way
    // --- crosshair and hit marks
    // the crosshair marks where a shot really goes: the view punch lifts the camera a little, so it sits that much lower
    const tf = Math.tan((X ? X.camera.fov : BASE_FOV) * D2R / 2), hh = (V.y1 - V.y0) / 2, cy = 360 + Math.tan(M.camKick || 0) / tf * hh;
    if (P.alive && !(P.scoped && G.scope) && !demo) {
      // shotguns: your own crosshair (whatever you designed) plus the spread ring round it
      if (G.cat === 'Shotgun' && G.pspr) { drawShotgunReticle(g, 640, cy, Math.tan(spreadOf(P) + G.pspr * D2R) / tf * hh, Math.max(1, u * .85)); drawCrosshair(g, 640, cy, 0, Math.max(1, u * .85)); }
      else drawCrosshair(g, 640, cy, Math.tan(spreadOf(P)) / tf * hh, Math.max(1, u * .85));
    }
    // no hit marks over the crosshair; the range alone shows the damage each shot did
    if (hitMark && (hitMark.t -= 1 / 60) > 0 && range) tx(g, String(hitMark.dmg), 640 + 44 * u + hitMark.x, cy - 30 * u - (1 - Math.min(1, hitMark.t / .28)) * 16, 20 * u, hitMark.head ? GOLD : '#fff');
    drawBanner(g, V, u); drawSwitch(g); drawSweep(g);
    if (range && UI.trying) { const sk = skinOfId(UI.trying); if (sk) { const w = 460 * u, y = V.y0 + 64 * u; rr(g, 640 - w / 2, y, w, 34 * u, 6, 'rgba(10,13,18,.82)', sk.R.col, 1.5); tx(g, `TRYING ${skinName(UI.trying).toUpperCase()}  ·  ${owns(UI.trying) ? 'YOURS' : skinPrice(UI.trying) + ' IN THE STORE'}`, 640, y + 17 * u, 12 * u, sk.R.col, 'center', 900); } }
    // --- dazed, snared, surging, shrouded: the whole view says so
    { const ring = (col, a, inner) => { const gr = g.createRadialGradient(640, 360, H * inner, 640, 360, H * .85); gr.addColorStop(0, col.replace('A', '0')); gr.addColorStop(1, col.replace('A', String(a))); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, H); };
      if (P.daze > 0) ring('rgba(255,225,77,A)', .32 * Math.min(1, P.daze / .6), .3);
      if (P.snare > 0) { ring('rgba(123,214,90,A)', .34 * Math.min(1, P.snare / .6), .35); tx(g, 'SNARED', 640, 470, 15 * u, '#9dff6b', 'center', 900); }
      if (P.cloak > 0) { g.fillStyle = 'rgba(120,140,200,.1)'; g.fillRect(V.x0, V.y0, W, H); ring('rgba(169,184,255,A)', .3, .4); tx(g, 'SHROUDED', 640, 470, 15 * u, '#c9d2ff', 'center', 900); g.fillStyle = 'rgba(169,184,255,.8)'; g.fillRect(640 - 50 * u, 482 * u / u + 4, 100 * u * P.cloak / 5, 3 * u); }
      if (P.surge > 0) { g.save(); g.translate(640, 360); g.strokeStyle = `rgba(255,236,150,${.16 * Math.min(1, P.surge / .5)})`; g.lineWidth = 2; for (let i = 0; i < 26; i++) { const a = i / 26 * TAU + (i * 7.3), r0 = H * (.42 + ((X ? X.t : 0) * 1.7 + i * .37) % .3); g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * (r0 + 60 * u), Math.sin(a) * (r0 + 60 * u)); g.stroke(); } g.restore(); } }
    // --- top: the clock in the middle, round wins either side of it, then a tile for every fighter: your team to the left,
    // the rivals to the right. A tile is lit while they stand and goes grey with a skull once they are down; your
    // teammates' tiles carry their health
    // four a side must clear the minimap (left) and the kill feed (right): the tiles narrow first, then the whole bar shrinks
    let tw = 44, ts = 1; if (!range) { const n = Math.max(1, M.fs.filter(q => q.team === P.team && !q.gone).length, M.fs.filter(q => q.team !== P.team && !q.gone).length), need = w => 125 + n * w + (n - 1) * 4,
      room = Math.min(640 - (V.x0 + 62 / pxPer() + 200 * u + 10), (touch ? V.x1 - 20 : V.x1 - 24 - 250 * u) - 640) / u; while (tw > 32 && need(tw) > room) tw -= 2; ts = cl(room / need(tw), .72, 1); }
    g.save(); g.translate(640, V.y0 + 8); g.scale(u * ts, u * ts);
    if (!range) {
      const PANEL = 'rgba(10,13,18,.84)', mine = M.fs.filter(q => q.team === P.team && !q.gone).sort((a, b) => (b === P) - (a === P)), theirs = M.fs.filter(q => q.team !== P.team && !q.gone);
      g.fillStyle = PANEL; g.beginPath(); g.moveTo(-64, 0); g.lineTo(64, 0); g.lineTo(56, 50); g.lineTo(-56, 50); g.closePath(); g.fill();
      if (M.planted && M.phase === 'live') {   // the charge is down: its light blinks faster as the fuse burns, and the bar runs out
        const k = cl(M.planted.t / FUSE_T, 0, 1), on = Math.sin(M.time * (6 + (1 - k) * 14)) > 0;
        g.fillStyle = on ? WARN : '#5a2620'; g.beginPath(); g.moveTo(0, 6); g.lineTo(13, 21); g.lineTo(0, 36); g.lineTo(-13, 21); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-42, 41, 84, 4); g.fillStyle = WARN; g.fillRect(-42, 41, 84 * k, 4);
      } else tx(g, clock(M.t), 0, 24, 29, M.phase === 'live' && M.t < 10 ? WARN : BONE, 'center', 800);
      tx(g, M.phase === 'buy' ? 'BUY PHASE' : M.phase === 'end' ? 'ROUND OVER' : M.planted ? 'CHARGE PLANTED' : 'ROUND ' + M.round, 0, 62, 10, M.planted && M.phase === 'live' ? WARN : DIM, 'center', 800);
      const score = (x, n, col, tag) => { g.fillStyle = PANEL; g.fillRect(x - 25, 0, 50, 50); g.fillStyle = col; g.fillRect(x - 25, 0, 50, 3); tx(g, String(n), x, 27, 30, col, 'center', 800); if (tag) tx(g, tag, x, 62, 10, col, 'center', 800); };
      score(-92, M.wins[0], YOU, side === 'att' ? 'ATTACK' : 'DEFEND'); score(92, M.wins[1], FOE, side === 'att' ? 'DEFEND' : 'ATTACK');
      const tile = (q, x, col, ours) => {
        const w = tw, h = 50, up = q.alive;
        portraitTile(g, q.op, x - w / 2, 0, w, h, { dead: !up, bar: col, r: 3, on: q === P && up });
        if (ours && up) { g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x - w / 2, h + 3, w, 4); g.fillStyle = q.hp > 30 ? BONE : WARN; g.fillRect(x - w / 2, h + 3, w * cl(q.hp / 100, 0, 1), 4); }
      };
      mine.forEach((q, i) => tile(q, -125 - tw / 2 - i * (tw + 4), YOU, true)); theirs.forEach((q, i) => tile(q, 125 + tw / 2 + i * (tw + 4), FOE, false));
      if (touch && !demo) zone(640 - 64 * u * ts, V.y0 + 8, 128 * u * ts, 70 * u * ts, () => { UI.board = !UI.board; });   // a phone: tap the clock for the scoreboard
    } else { rr(g, -210, 0, 420, 44, 8, GLASS); tx(g, 'RANGE', -190, 22, 18, GOLD, 'left'); tx(g, `${P.stat.hits} hits / ${P.stat.shots} shots` + (P.stat.shots ? `  ·  ${Math.round(100 * P.stat.hits / P.stat.shots)}%` : ''), 190, 22, 14, BONE, 'right'); }
    g.restore();
    // --- minimap, top left (beside the kit's pause button)
    { const mw = 200 * u, mh = mw * GH / GW, mx = V.x0 + 62 / pxPer(), my = V.y0 + 10, k = mw / MW;
      g.globalAlpha = .9; g.drawImage(miniMap(), mx, my, mw, mh); g.globalAlpha = 1; g.strokeStyle = 'rgba(239,233,220,.3)'; g.lineWidth = 1.5; g.strokeRect(mx, my, mw, mh);
      for (const S of SITES) siteLabel(g, S, mx, my, k, 14 * u);
      if (M.planted) { g.fillStyle = WARN; g.beginPath(); g.arc(mx + M.planted.x * k, my + M.planted.z * k, 4.5 * u, 0, TAU); g.fill(); }
      if (M.charge && !M.planted && side === 'att') { const c = carrier(), cx2 = c ? c.x : M.charge.x, cz2 = c ? c.z : M.charge.z; if (!c || c.alive) { g.strokeStyle = GOLD; g.lineWidth = 2; g.beginPath(); g.arc(mx + cx2 * k, my + cz2 * k, (c ? 6 : 4.5) * u, 0, TAU); g.stroke(); if (!c) { g.fillStyle = GOLD; g.fill(); } } }
      if (heard && (heard.t -= 1 / 60) > 0) { g.strokeStyle = `rgba(255,138,61,${heard.t / 1.6})`; g.lineWidth = 2; g.beginPath(); g.arc(mx + heard.x * k, my + heard.z * k, (8 + (1.6 - heard.t) * 8) * u, 0, TAU); g.stroke(); }
      for (const q of M.fs) if (q !== P && q.alive && !q.gone) { const ours = q.team === P.team; if (!ours && !(q.reveal > 0 || canSee(P, q))) continue; g.fillStyle = ours ? YOU : FOE; g.beginPath(); g.arc(mx + q.x * k, my + q.z * k, (ours ? 3.2 : 4) * u, 0, TAU); g.fill(); }   // your teammates, and every rival in sight
      g.save(); g.translate(mx + P.x * k, my + P.z * k); g.rotate(-P.yaw); g.fillStyle = 'rgba(53,224,200,.22)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 30 * u, -Math.PI / 2 - .6, -Math.PI / 2 + .6); g.fill(); g.fillStyle = YOU; g.beginPath(); g.moveTo(0, -7 * u); g.lineTo(5 * u, 5 * u); g.lineTo(-5 * u, 5 * u); g.fill(); g.restore();
      const ar = areaAt(P.x, P.z); if (ar) tx(g, ar.n.toUpperCase(), mx + 4, my + mh + 12 * u, 13 * u, ar.col, 'left'); }
    // --- kill feed, top right
    M.feed.forEach((k, i) => { const w = 250 * u, x = V.x1 - 14 - w, y = V.y0 + (touch ? 58 : 14) * u + i * 30 * u; rr(g, x, y, w, 25 * u, 5, k.mine ? 'rgba(53,224,200,.28)' : 'rgba(255,138,61,.28)'); tx(g, `${k.a}   ${k.w}${k.head ? ' ◎' : ''}   ${k.b}`, x + w - 10 * u, y + 13 * u, 12.5 * u, BONE, 'right'); });
    // --- health, weapon and abilities
    const A = P.ammo[G.k] || { mag: 0, res: 0 }, hpCol = P.hp > 30 ? BONE : WARN;
    if (touch) {   // one strip, bottom centre, clear of both thumbs
      g.save(); g.translate(640, V.y1 - 10); g.scale(u, u); rr(g, -205, -44, 410, 44, 8, GLASS);
      tx(g, String(Math.ceil(P.hp)), -186, -22, 28, hpCol, 'left'); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-128, -27, 84, 7); g.fillStyle = hpCol; g.fillRect(-128, -27, 84 * P.hp / 100, 7); if (P.sh) { g.fillStyle = '#7fc8ff'; g.fillRect(-128, -17, 84 * P.sh / 50, 5); }
      tx(g, G.n.toUpperCase(), 0, -22, 15, G.col); tx(g, G.melee ? '—' : `${A.mag} / ${A.res}`, 186, -22, 24, A.mag || G.melee ? BONE : WARN, 'right'); if (carries(P) && !M.planted) tx(g, '◆ YOU CARRY THE CHARGE', 0, -54, 12, GOLD, 'center', 900); g.restore();
    } else {
      g.save(); g.translate(V.x0 + 22, V.y1 - 20); g.scale(u, u); rr(g, 0, -58, 250, 58, 8, GLASS);
      tx(g, String(Math.ceil(P.hp)), 18, -28, 40, hpCol, 'left'); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(104, -36, 128, 8); g.fillStyle = hpCol; g.fillRect(104, -36, 128 * P.hp / 100, 8);
      if (P.sh) { g.fillStyle = '#7fc8ff'; g.fillRect(104, -22, 128 * P.sh / 50, 6); tx(g, String(P.sh), 104 + 128 * P.sh / 50 + 6, -19, 11, '#7fc8ff', 'left'); }
      // the abilities: Q (bought, its charges as pips), E (the free signature), X (the ultimate, its points round a ring)
      const op = OPS[P.op]; [['Q', 'q'], ['E', 'e']].forEach(([key, k], i) => { const x = 266 + i * 96, n = P.ab[k] | 0, on = n > 0 && M.mode !== 'demo'; rr(g, x, -58, 86, 58, 8, on ? GLASS : 'rgba(12,16,22,.4)', on ? op.col : 'rgba(255,255,255,.12)'); tx(g, op[k].n.toUpperCase(), x + 43, -38, 14, on ? BONE : '#5a6272'); tx(g, key, x + 43 - (k === 'q' ? 12 : 0), -16, 14, on ? op.col : '#5a6272');
        if (k === 'q') for (let c = 0; c < op.q.max; c++) { g.fillStyle = c < n ? op.col : 'rgba(255,255,255,.15)'; g.fillRect(x + 50 + c * 11, -21, 8, 8); } });
      { const x = 458, c = ultCost(P), pts = Math.min(c, P.ult | 0), ready = pts >= c, pulse = ready ? .55 + .45 * Math.sin(K.t * 5) : 0; rr(g, x, -58, 86, 58, 8, ready ? 'rgba(12,16,22,.7)' : 'rgba(12,16,22,.4)', ready ? op.col : 'rgba(255,255,255,.12)', ready ? 2 + pulse * 2 : 1);
        for (let q = 0; q < c; q++) { const a0 = -Math.PI / 2 + q * TAU / c + .08, a1 = -Math.PI / 2 + (q + 1) * TAU / c - .08; g.strokeStyle = q < pts ? op.col : 'rgba(255,255,255,.18)'; g.lineWidth = 4; g.beginPath(); g.arc(x + 22, -29, 13, a0, a1); g.stroke(); }
        tx(g, 'X', x + 22, -29, 12, ready ? BONE : '#5a6272'); tx(g, ready ? op.x.n.toUpperCase() : `${pts}/${c}`, x + 61, -36, ready ? 11 : 13, ready ? BONE : '#5a6272'); tx(g, 'ULT', x + 61, -18, 10, ready ? op.col : '#5a6272'); }
      if (P.smokes > 0) { const x = 554, on = P.smokes > 0; rr(g, x, -58, 86, 58, 8, on ? GLASS : 'rgba(12,16,22,.4)', on ? NADE.col : 'rgba(255,255,255,.12)'); tx(g, 'SMOKE ×' + (P.smokes || 0), x + 43, -38, 14, on ? BONE : '#5a6272'); tx(g, 'G', x + 43, -16, 12, on ? NADE.col : '#5a6272'); }
      g.restore();
      g.save(); g.translate(V.x1 - 22 - 50 / pxPer(), V.y1 - 20); g.scale(u, u); rr(g, -270, -58, 270, 58, 8, GLASS);
      if (G.melee) tx(g, '—', -150, -28, 34, BONE); else { tx(g, String(A.mag), -150, -28, 42, A.mag ? BONE : WARN, 'right'); tx(g, '/ ' + A.res, -140, -22, 18, DIM, 'left'); }
      tx(g, G.n.toUpperCase(), -14, -38, 15, G.col, 'right'); tx(g, G.cat.toUpperCase(), -14, -18, 11, DIM, 'right');
      [1, 2, 3].forEach((s, i) => { const k = P.guns[s], y = -78 - (2 - i) * 24; if (!k) return; const on = P.slot === s; rr(g, -150, y - 10, 150, 21, 5, on ? 'rgba(239,233,220,.24)' : 'rgba(12,16,22,.7)'); tx(g, String(s), -140, y + 1, 12, on ? GOLD : DIM, 'left'); tx(g, GUNS[k].n.toUpperCase(), -10, y + 1, 12, on ? BONE : '#b9c0cc', 'right'); });
      if (canBuy()) tx(g, `◈ ${P.credits}`, -14, -170, 20, GOLD, 'right');
      if (carries(P) && !M.planted) { const y = -78 - 3 * 24; rr(g, -150, y - 10, 150, 21, 5, 'rgba(255,214,102,.2)', GOLD, 1); tx(g, '◆', -140, y + 1, 12, GOLD, 'left'); tx(g, 'CHARGE  ·  H DROPS', -10, y + 1, 11, GOLD, 'right'); }
      g.restore();
    }
    if (touch && canBuy()) tx(g, `◈ ${P.credits}`, 640, V.y1 - 66 * u, 17 * u, GOLD);
    if (M.phase === 'buy' && P.alive && P.nearLoot && GUNS[P.nearLoot.k] && !UI.armory) hint(g, `${touch ? 'Tap SWAP' : 'Press F'} to swap for the ${GUNS[P.nearLoot.k].n}`, V.y0 + 186 * u, 15 * u, BONE);
    // --- the charge: what to do, and how far along
    const ring = (frac, label, col) => { const y = 470; g.strokeStyle = 'rgba(12,16,22,.7)'; g.lineWidth = 12 * u; g.beginPath(); g.arc(640, y, 34 * u, 0, TAU); g.stroke(); g.strokeStyle = col; g.lineWidth = 7 * u; g.beginPath(); g.arc(640, y, 34 * u, -Math.PI / 2, -Math.PI / 2 + TAU * frac); g.stroke(); tx(g, label, 640, y + 60 * u, 15 * u, col); };
    if (P.reloadT > 0) tx(g, 'RELOADING', 640, 420, 15 * u, GOLD);
    if (M.phase === 'live' && P.alive && !range && !demo) {
      const near = M.planted && Math.hypot(P.x - M.planted.x, P.z - M.planted.z) < 1.7, key = touch ? 'Hold the button' : 'Hold F';
      if (P.orbT > 0) ring(P.orbT / ORB.take, 'ULT ORB', OPS[P.op].col);
      else if (M.orbs && M.orbs.some(o => !o.taken && Math.hypot(o.x - P.x, o.z - P.z) < ORB.r)) hint(g, (touch ? 'Hold the button' : 'Hold F') + ' to take the orb: an ultimate point', V.y0 + 140 * u, 16 * u, OPS[P.op].col);
      if (P.plant > 0) ring(P.plant / PLANT_T, 'PLANTING', FOE); else if (P.defuse > 0) ring(P.defuse / DEFUSE_T, 'DEFUSING', YOU);
      else if (side === 'att' && !M.planted && M.charge && !carries(P)) { const c = carrier();
        if (c) { if (M.t > roundT() - 6 || onSite(P.x, P.z)) hint(g, c.name.toUpperCase() + ' HAS THE CHARGE' + (onSite(P.x, P.z) ? '  ·  COVER THE PLANT' : ''), V.y0 + 104 * u, 16 * u, 'rgba(239,233,220,.75)'); }
        else hint(g, 'THE CHARGE IS ON THE FLOOR  ·  WALK OVER IT TO PICK IT UP', V.y0 + 104 * u, 16 * u, GOLD); }
      else if (side === 'att' && !M.planted) { if (onSite(P.x, P.z)) onSiteHint(g, 'ABC'[siteAt(P.x, P.z)], key, V.y0 + 104 * u, u); else hint(g, M.t > roundT() - 6 ? (twoSites() ? 'Carry the charge to site ' + siteWords() + ' and plant it' : 'Carry the charge to the site and plant it') : '', V.y0 + 104 * u, 16 * u, 'rgba(239,233,220,.75)'); }
      else if (side === 'def' && M.planted) hint(g, near ? key + ' to defuse' : 'Defuse the charge', V.y0 + 104 * u, 16 * u, near ? GOLD : 'rgba(239,233,220,.75)');
      else if (side === 'def' && M.t > roundT() - 6) hint(g, twoSites() ? 'Hold ' + siteWords('and') + ': stop them planting' : 'Stop them planting on the site', V.y0 + 104 * u, 16 * u, 'rgba(239,233,220,.75)');
      if (M.fs.some(q => q.team !== P.team && q.alive && q.defuse > 0)) tx(g, M.fs.length > 2 ? 'THEY ARE DEFUSING' : 'YOUR RIVAL IS DEFUSING', 640, 250, 20 * u, WARN);   // any of them, not just the nearest
      if (P.nearLoot && GUNS[P.nearLoot.k]) hint(g, `${touch ? 'Tap SWAP' : 'Press F'} to swap for the ${GUNS[P.nearLoot.k].n}`, V.y0 + 172 * u, 15 * u, BONE);
      if (GATES.length && P.plant <= 0 && P.defuse <= 0) { const gi = gateNear(P); if (gi >= 0) hint(g, (touch ? 'Tap the button' : 'Press F') + (GATES[gi].open ? ' to shut the blast door' : ' to open the blast door'), V.y0 + 140 * u, 16 * u, GOLD); }
    }
    // --- banners
    if (TOAST) { const t = (performance.now() - TOAST.at) / 1000; if (t > 4) TOAST = null; else { g.globalAlpha = cl(Math.min(t * 4, (4 - t) * 2), 0, 1); rr(g, 640 - 230 * u, V.y0 + 64 * u, 460 * u, 34 * u, 8, 'rgba(12,16,22,.85)', GOLD, 1.5); tx(g, TOAST.s, 640, V.y0 + 81 * u, 15 * u, BONE); g.globalAlpha = 1; } }
    if (M.say) { const a = Math.min(1, M.say.t * 5, (2.6 - M.say.t) * 3); g.globalAlpha = cl(a, 0, 1); tx(g, M.say.s, 640, 170, 30 * u, M.say.c); g.globalAlpha = 1; }
    // the connection: yours dropped (the game keeps going while it gets back in), or someone else's
    if (M.online && (M.dropped || MP.rejoining)) { const p = .6 + .4 * Math.sin(K.t * 6); rr(g, 640 - 170 * u, 118 * u, 340 * u, 34 * u, 8, 'rgba(12,16,22,.85)', GOLD, 1.5); tx(g, 'CONNECTION LOST · RECONNECTING', 640, 135 * u, 14 * u, GOLD, 'center', 900); g.globalAlpha = 1; void p; }
    else if (M.online) { const dc = M.fs.find(f => f.dc && !f.gone); if (dc) { const left = Math.max(0, Math.ceil(DC_WAIT - (M.time - dc.dc))); tx(g, `${dc.name.toUpperCase()} LOST CONNECTION · WAITING ${left} s`, 640, 135 * u, 14 * u, GOLD, 'center', 900); } }
    if (M.phase === 'end' && M.last && !M.over) { const won = M.last.wi === 0, c = won ? YOU : FOE; g.fillStyle = won ? 'rgba(53,224,200,.16)' : 'rgba(255,138,61,.16)'; g.fillRect(V.x0, 250 - 62 * u, W, 124 * u); tx(g, demo ? `${M.fs[M.last.wi].name.toUpperCase()} TAKES IT` : won ? 'ROUND WON' : 'ROUND LOST', 640, 250 - 12 * u, 50 * u, c); tx(g, WHY[M.last.why].toUpperCase(), 640, 250 + 32 * u, 16 * u, BONE); }
    if (M.phase === 'buy' && !UI.armory && !range && !UI.switched) { { const ot = otRound(M.round), mp = !ot && Math.max(...M.wins) === WIN_ROUNDS - 1; tx(g, pistolRound(M.round) ? 'PISTOL ROUND' : suddenDeath(M.round) ? 'SUDDEN DEATH' : ot ? 'OVERTIME ' + ot : mp ? 'MATCH POINT' : 'ROUND ' + M.round, 640, 200, 34 * u, ot || mp ? GOLD : BONE); } tx(g, side === 'att' ? (twoSites() ? 'You attack: plant the charge on ' + siteWords() : 'You attack: plant the charge on the site') : (twoSites() ? 'You defend: hold ' + siteWords('and') : 'You defend: keep them off the site'), 640, 200 + 36 * u, 16 * u, side === 'att' ? FOE : YOU); }
    if (P !== me()) {   // spectating a teammate: who, their health and shield, their gun, and the others you could switch to
      const w = 420 * u, y = V.y1 - 156 * u, mates = M.fs.filter(f => f !== me() && f.team === me().team && f.alive), G2 = gun(P);
      rr(g, 640 - w / 2, y, w, 58 * u, 8, 'rgba(10,13,18,.86)', YOU, 1.5); portraitTile(g, P.op, 640 - w / 2 + 6 * u, y + 6 * u, 46 * u, 46 * u, { r: 4 });
      tx(g, 'SPECTATING', 640 - w / 2 + 62 * u, y + 15 * u, 10 * u, DIM, 'left', 900); tx(g, P.name.toUpperCase(), 640 - w / 2 + 62 * u, y + 32 * u, 17 * u, YOU, 'left', 900);
      const bx = 640 - w / 2 + 62 * u, bw = 130 * u; g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(bx, y + 44 * u, bw, 5 * u); g.fillStyle = P.hp > 30 ? BONE : WARN; g.fillRect(bx, y + 44 * u, bw * P.hp / 100, 5 * u); if (P.sh) { g.fillStyle = '#7fc8ff'; g.fillRect(bx + bw + 6 * u, y + 44 * u, 40 * u * P.sh / 50, 5 * u); }
      tx(g, G2.n.toUpperCase(), 640 + w / 2 - 14 * u, y + 20 * u, 13 * u, G2.col || BONE, 'right', 800);
      if (mates.length > 1) tx(g, `${mates.indexOf(P) + 1} / ${mates.length}  ·  ${isTouch() ? 'tap' : 'click or Space'} to switch`, 640 + w / 2 - 14 * u, y + 40 * u, 10.5 * u, DIM, 'right', 800);
    }
    // between rounds: the end of one fades out to black and the next fades in, rather than a cut
    { let k = 0; if (M.phase === 'end' && M.t < .45 && !matchDecided()) k = 1 - M.t / .45; if (X.roundFadeT) { const e = (performance.now() - X.roundFadeT) / 500; if (e >= 1) X.roundFadeT = 0; else k = Math.max(k, 1 - e); }
      if (k > 0) { g.fillStyle = `rgba(0,0,0,${smooth(cl(k, 0, 1))})`; g.fillRect(V.x0, V.y0, W, H); } }
    if (X.specFade > 0) { if (!X.specFadeT) X.specFadeT = performance.now(); const k = 1 - (performance.now() - X.specFadeT) / 400; if (k <= 0) { X.specFade = 0; X.specFadeT = 0; } else { g.fillStyle = `rgba(0,0,0,${smooth(k)})`; g.fillRect(V.x0, V.y0, W, H); } }   // 0.4 s, whatever the frame rate
    if (!me().alive && M.deathInfo && !range && P === me()) {
      // the damage report: everyone you traded shots with this round, the killer first: what you dealt them and took from
      // them, and where the hits landed (head, body, legs)
      const D = M.deathInfo, a = cl(D.t * 3, 0, 1), L = M.dlog || {}, mk = me().key, z0 = { d: 0, n: 0, h: 0, l: 0 };
      const rep = M.fs.filter(q => q.team !== me().team && (L[mk + '>' + q.key] || L[q.key + '>' + mk])).sort((p2, q2) => (q2.key === D.key) - (p2.key === D.key)).slice(0, 4);
      if (!rep.some(q => q.key === D.key) && M.byKey[D.key]) rep.unshift(M.byKey[D.key]);
      const rrh = 21 * u, cw2 = 640 * u, ch2 = Math.max(104 * u, 34 * u + rep.length * rrh + 8 * u), x = 640 - cw2 / 2, y = V.y1 - 92 * u - ch2 + (1 - smooth(a)) * 30 * u;
      g.save(); g.globalAlpha = a; rr(g, x, y, cw2, ch2, 10, 'rgba(10,13,18,.9)', FOE, 2); g.fillStyle = FOE; g.fillRect(x, y, 6 * u, ch2);
      if (D.op) portraitTile(g, D.op, x + 16 * u, y + 12 * u, 80 * u, 80 * u, { r: 6 });
      tx(g, 'KILLED BY', x + 110 * u, y + 20 * u, 11 * u, DIM, 'left', 900); tx(g, D.by.toUpperCase(), x + 110 * u, y + 44 * u, 24 * u, FOE, 'left', 900);
      tx(g, `${D.w}${D.head ? '  ·  HEADSHOT' : ''}`, x + 110 * u, y + 68 * u, 13 * u, D.head ? GOLD : BONE, 'left', 800);
      const hb = x + 110 * u; g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(hb, y + 82 * u, 150 * u, 6 * u); g.fillStyle = BONE; g.fillRect(hb, y + 82 * u, 150 * u * D.hp / 100, 6 * u); if (D.sh) { g.fillStyle = '#7fc8ff'; g.fillRect(hb + 156 * u, y + 82 * u, 50 * u * D.sh / 50, 6 * u); }
      tx(g, `${D.hp} HP${D.sh ? ' · ' + D.sh + ' SHIELD' : ''} LEFT`, hb, y + 96 * u, 9.5 * u, DIM, 'left', 800);
      { const rx0 = x + 330 * u, rw = cw2 - 330 * u - 16 * u, parts = r => [r.h ? r.h + 'H' : '', r.n - r.h - r.l ? r.n - r.h - r.l + 'B' : '', r.l ? r.l + 'L' : ''].filter(Boolean).join(' ');
        g.fillStyle = 'rgba(239,233,220,.1)'; g.fillRect(rx0 - 12 * u, y + 10 * u, 1.5 * u, ch2 - 20 * u);
        tx(g, 'DAMAGE REPORT', rx0, y + 20 * u, 10 * u, DIM, 'left', 900); tx(g, 'DEALT', rx0 + rw * .62, y + 20 * u, 10 * u, YOU, 'right', 900); tx(g, 'TAKEN', rx0 + rw, y + 20 * u, 10 * u, FOE, 'right', 900);
        rep.forEach((q, i) => { const ry = y + 40 * u + i * rrh, gv = L[mk + '>' + q.key] || z0, tk = L[q.key + '>' + mk] || z0, [nm, npx] = fitName(g, q.name.toUpperCase(), rw * .34, 12 * u);
          if (q.key === D.key) { g.fillStyle = 'rgba(255,138,61,.12)'; g.fillRect(rx0 - 6 * u, ry - rrh / 2 + 1, rw + 10 * u, rrh - 2); }
          tx(g, nm, rx0, ry, npx, q.key === D.key ? FOE : BONE, 'left', 800);
          tx(g, String(Math.round(gv.d)), rx0 + rw * .47, ry, 14 * u, gv.d ? BONE : '#5a6272', 'right', 900); tx(g, parts(gv), rx0 + rw * .62, ry, 10 * u, DIM, 'right', 700);
          tx(g, String(Math.round(tk.d)), rx0 + rw * .85, ry, 14 * u, tk.d ? BONE : '#5a6272', 'right', 900); tx(g, parts(tk), rx0 + rw, ry, 10 * u, DIM, 'right', 700); });
        if (rep.length) tx(g, 'H head · B body · L legs', rx0, y + ch2 - 9 * u, 9 * u, '#5a6272', 'left', 700); }
      g.restore();
      if (M.planted && D.t > 3.2 && !M.fs.some(f => f !== me() && f.team === me().team && f.alive)) tx(g, 'WATCHING THE CHARGE', 640, V.y0 + 120 * u, 14 * u, GOLD, 'center', 900);
    }
    if (UI.board && !UI.armory && !UI.opts && !range && !demo) drawBoard(g, V, u);
    if (CFG.fps && UI.fps) tx(g, Math.round(UI.fps) + ' FPS', V.x0 + 24, V.y1 - (touch ? 200 : 96) * u, 12 * u, UI.fps < 40 ? WARN : DIM, 'left', 800);
    // --- touch controls
    if (touch && !UI.armory && !demo) drawTouch(g, u);
    if (canBuy() && !UI.armory && !demo && P.alive && !UI.switched) { const w = 190 * u, h = tapH(46); btn(g, 640 - w / 2, V.y0 + 132 * u, w, h, touch ? 'ARMORY' : 'ARMORY  (B)', () => openArmory(true), { px: 17 * u, col: GOLD, edge: GOLD }); }
    if (UI.armory) drawArmory(g);
    if (!touch && !UI.armory && !UI.opts && !demo && !locked() && K.state === 'play') { g.fillStyle = 'rgba(12,16,22,.45)'; g.fillRect(V.x0, V.y0, W, H); tx(g, 'CLICK TO AIM', 640, 330, 34, BONE); tx(g, 'Esc pauses  ·  O settings', 640, 372, 15, DIM); }
    // settings: a gear under the pause button (when the mouse is free, or on a phone), and the panel itself
    if (!demo && !UI.opts && !UI.armory && (touch || !locked())) { const s = 40 / pxPer(), gx = V.x0 + 12 / pxPer(), gy = V.y0 + 58 / pxPer(), cx = gx + s / 2, cy2 = gy + s / 2;
      rr(g, gx, gy, s, s, s * .22, 'rgba(12,16,22,.6)'); g.fillStyle = BONE; g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = i % 2 ? s * .3 : s * .37; g.lineTo(cx + Math.cos(a) * r, cy2 + Math.sin(a) * r); } g.fill();
      g.fillStyle = 'rgba(12,16,22,.9)'; g.beginPath(); g.arc(cx, cy2, s * .12, 0, TAU); g.fill(); zone(gx, gy, s, s, () => openOpts(true)); }
    if (UI.opts) drawOpts(g);
  }
  function drawTouch(g, u) {
    const V = K.view;
    for (const b of touchButtons()) {
      const held = (b.k === 'fire' && TS.fire != null) || [...TS.held.values()].includes(b.k) || b.on, c = b.col || BONE;
      g.fillStyle = held ? 'rgba(255,138,61,.6)' : 'rgba(12,16,22,.55)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill();
      g.strokeStyle = b.off ? 'rgba(255,255,255,.18)' : b.k === 'fire' ? FOE : c; g.globalAlpha = b.off ? 1 : .8; g.lineWidth = 2.5 * u; g.stroke(); g.globalAlpha = 1;
      tx(g, b.t, b.x, b.y, (b.k === 'fire' || b.k === 'use' ? 17 : b.t.length > 5 ? 10.5 : 12.5) * u, b.off ? '#5a6272' : BONE);
    }
    if (TS.stick) {
      const s = TS.stick, dx = s.x - s.x0, dy = s.y - s.y0, L = Math.min(96 * u, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
      g.strokeStyle = 'rgba(239,233,220,.4)'; g.lineWidth = 3 * u; g.beginPath(); g.arc(s.x0, s.y0, 65 * u, 0, TAU); g.stroke();
      // the sprint zone: a short arc beyond the ring, straight ahead, that lights up while you're in it
      g.strokeStyle = TS.sprint ? 'rgba(255,214,102,.95)' : 'rgba(239,233,220,.22)'; g.lineWidth = (TS.sprint ? 6 : 3) * u; g.beginPath(); g.arc(s.x0, s.y0, 92 * u, -Math.PI / 2 - .6, -Math.PI / 2 + .6); g.stroke();
      g.fillStyle = TS.sprint ? 'rgba(255,214,102,.95)' : 'rgba(239,233,220,.4)'; g.font = `800 ${12 * u}px system-ui`; g.textAlign = 'center'; g.fillText('SPRINT', s.x0, s.y0 - 104 * u);
      g.fillStyle = TS.sprint ? 'rgba(255,214,102,.75)' : 'rgba(239,233,220,.5)'; g.beginPath(); g.arc(s.x0 + Math.cos(a) * L, s.y0 + Math.sin(a) * L, 27 * u, 0, TAU); g.fill();
    }
    else if (me().alive) { const x = V.x0 + 170 * u, y = V.y1 - 150 * u; g.setLineDash([6 * u, 8 * u]); g.strokeStyle = 'rgba(239,233,220,.3)'; g.lineWidth = 2 * u; g.beginPath(); g.arc(x, y, 62 * u, 0, TAU); g.stroke(); g.setLineDash([]); tx(g, 'MOVE', x, y, 13 * u, 'rgba(239,233,220,.45)'); tx(g, 'push far to sprint', x, y + 82 * u, 11 * u, 'rgba(239,233,220,.35)'); }
  }
