  /* ---------- 92 hud: everything on screen during a round ----------
     Drawn on the kit's 2D canvas, in its 1280 by 720 units (K.view is the part of that the screen shows). Each cluster
     hangs off a corner or the centre and is scaled by uiScale(), so one layout serves a monitor and a phone.
     Also here: the small drawing helpers every screen uses, and the crosshair, which the player designs in settings. */
  const FONT = '"Chakra Petch", system-ui, sans-serif', GLASS = 'rgba(12,16,22,.78)';
  // no text is ever drawn smaller than MIN_PX on the real screen, whatever scale the layout is at
  const fitPx = (g, px) => { const k = g.getTransform().a * innerWidth / g.canvas.width, min = isTouch() ? 10.5 : 9; return px * k < min ? min / k : px; };
  // a short note across the top for a few seconds ("trackpad found")
  // how far in from the right edge the kit's round sound button reaches (in HUD units), or 0 when it is hidden
  const muteGap = () => { try { const b = document.getElementById('bMute'); if (!b || b.style.display === 'none') return 0; const r = b.getBoundingClientRect(); return (innerWidth - r.left) / pxPer(); } catch (e) { return 0; } };
  let TOAST = null; const toast = s => { TOAST = { s, at: performance.now() }; };
  on('novaRefund', f => { if (f === me() && M && M.mode !== 'demo') say('+1 SURGE', OPS.nova.col); });
  on('charge', f => { if (!M || M.mode === 'demo' || M.phase === 'end') return; const P = me(); if (f === P) toast(isTouch() ? 'YOU HAVE THE CHARGE' : 'YOU HAVE THE CHARGE  ·  H TO DROP IT'); else if (f && f.team === P.team && M.round && M.time - (M.chargeToastT || -9) > .5) toast(f.name.toUpperCase() + ' HAS THE CHARGE'); else if (!f && sideOf(P) === 'att') { const ar = M.charge && areaAt(M.charge.x, M.charge.z); toast('THE CHARGE IS DOWN' + (ar ? '  ·  ' + ar.n.toUpperCase() : '')); } M.chargeToastT = M.time; });
  function tx(g, s, x, y, px, col = BONE, align = 'center', weight = 700) { px = fitPx(g, px); g.font = `${weight} ${px}px ${FONT}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }
  function rr(g, x, y, w, h, r, fill, stroke, lw = 2) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
  }
  // a button: draws it, registers its press zone, returns whether the mouse is over it. o: { px, fill, col, edge, sub, on, off }
  function btn(g, x, y, w, h, label, fn, o = {}) {
    if (label) { const p0 = o.px || h * .42; g.font = `700 ${p0}px ${FONT}`; const lw = g.measureText(label).width, room = w - Math.min(16, w * .12); if (lw > room) o = Object.assign({}, o, { px: p0 * room / lw }); }
    if (o.sub) { g.font = `700 ${fitPx(g, (o.px || h * .42) * .5)}px ${FONT}`; if (g.measureText(o.sub).width > w - 10) o = Object.assign({}, o, { sub: null }); }   // (small print that cannot fit is left off)
    const hot = zone(x, y, w, h, () => { click(!o.off); if (!o.off) fn(); }) && !o.off;
    rr(g, x, y, w, h, Math.min(10, h / 4), o.on ? (o.fill || FOE) : hot ? 'rgba(239,233,220,.16)' : o.fill && !o.on && o.solid ? o.fill : 'rgba(12,16,22,.72)', o.on ? null : hot ? BONE : o.edge || 'rgba(239,233,220,.28)');
    tx(g, label, x + w / 2, y + h / 2 - (o.sub ? h * .13 : 0), o.px || h * .42, o.off ? '#5a6272' : o.on ? INK : o.col || BONE);
    if (o.sub) tx(g, o.sub, x + w / 2, y + h * .74, (o.px || h * .42) * .5, o.on || (o.solid && !hot) ? 'rgba(12,16,22,.75)' : DIM);
    return hot;
  }
  // wrap text into lines no wider than w; returns the y after the last line
  // how tall a paragraph will be when para() draws it
  function paraH(g, s, w, px, lh = 1.3) { px = fitPx(g, px); g.font = `600 ${px}px ${FONT}`; let line = '', n = 1; for (const word of s.split(' ')) { const t = line ? line + ' ' + word : word; if (g.measureText(t).width > w && line) { line = word; n++; } else line = t; } return n * px * lh; }
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
  on('kill', (v, by, head, wk) => { if (M && by === me() && v !== me() && M.mode !== 'demo') { banner = { t0: performance.now(), n: killRun, head, name: v.name, em: killEmblem(wk) }; if (typeof playMoment === 'function' && aceAt !== M.time) playMoment(killRun >= 5 ? 'ace' : 'kill' + killRun); } });   // (its sound, where there is a clip for this many)
  on('round', n => { banner = null; if (n !== 1 && X) X.roundFadeT = performance.now(); });
  // the banner wears the emblem of the skin you made the kill with (Epic and up), or the plain skull
  const killEmblem = wk => { const sk = skinOfId(skinFor(me(), wk)); return sk && sk.L.emblem ? Object.assign({ tier: sk.R.tier }, sk.L.emblem) : { shape: 'skull', col: BONE, glow: YOU }; };
  /* ---- the emblem in the middle of the kill banner: drawn once as a picture and kept (by shape and colours), so the
     banner lays it down with a single draw each frame. Each is built the same way: a glow in the skin's colour behind
     it, a dark edge so it reads on anything, the body lit from the upper left (a light face and a shaded face, split
     down the middle like cut metal), its own details, then highlights along the upper edges. The skull is the plain
     one: a cut-stone cranium, slanted sockets with a light burning in each, cheek planes, a nose and a row of teeth. */
  const EMB = {}, mixHex = (a, b, t) => { const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  function emblemArt(shape, col, glow) {
    const key = shape + col + glow; if (EMB[key]) return EMB[key];
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), r = 92, INK2 = '#0a0d13', lite = mixHex(col, '#ffffff', .55), mid = col, dark = mixHex(mixHex(col, glow, .5), '#000000', .38), deep = mixHex(glow, '#000000', .62);
    g.translate(S / 2, S / 2); g.lineJoin = 'round'; g.lineCap = 'round';
    const P = pts => { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0] * r, q[1] * r) : g.moveTo(q[0] * r, q[1] * r)); g.closePath(); };
    // the body of an emblem: glow, dark edge, lit face, shaded face (right of `split`), a rim of light along the top
    const body = (path, split = 0) => {
      g.save(); g.shadowColor = glow; g.shadowBlur = 26; g.fillStyle = glow; path(); g.fill(); g.shadowBlur = 14; g.fill(); g.restore();
      path(); g.strokeStyle = INK2; g.lineWidth = 9; g.stroke();
      const gr = g.createLinearGradient(-r * .5, -r * .8, r * .4, r * .8); gr.addColorStop(0, lite); gr.addColorStop(.55, mid); gr.addColorStop(1, dark); path(); g.fillStyle = gr; g.fill();
      g.save(); path(); g.clip(); g.fillStyle = 'rgba(8,10,16,.2)'; g.fillRect(split * r, -r * 1.2, r * 1.4, r * 2.4);   // the shaded face
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.translate(1.5, 2.5); path(); g.stroke(); g.restore(); };   // (a rim of light: the edge, nudged in and down, shows only along the top left)
    const cut = (pts, fill) => { P(pts); g.fillStyle = fill; g.fill(); }, line = (pts, colr, w) => { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0] * r, q[1] * r) : g.moveTo(q[0] * r, q[1] * r)); g.strokeStyle = colr; g.lineWidth = w; g.stroke(); };
    const spark = (x, y, s2, colr) => { g.save(); g.shadowColor = glow; g.shadowBlur = 12; cut([[x, y - s2], [x + s2 * .45, y], [x, y + s2], [x - s2 * .45, y]], colr); g.restore(); };
    if (shape === 'skull') {
      const skull = () => { g.beginPath(); g.moveTo(-.54 * r, -.1 * r); g.bezierCurveTo(-.56 * r, -.52 * r, -.32 * r, -.78 * r, 0, -.78 * r); g.bezierCurveTo(.32 * r, -.78 * r, .56 * r, -.52 * r, .54 * r, -.1 * r);
        [[.5, .12], [.36, .25], [.33, .47], [.22, .6], [-.22, .6], [-.33, .47], [-.36, .25], [-.5, .12]].forEach(q => g.lineTo(q[0] * r, q[1] * r)); g.closePath(); };
      body(skull, .02);
      for (const sx of [-1, 1]) { cut([[sx * .5, .12], [sx * .36, .25], [sx * .3, .2], [sx * .43, .06]], 'rgba(8,10,16,.28)');   // the cheek planes
        cut([[sx * .43, -.14], [sx * .1, -.03], [sx * .13, .17], [sx * .31, .2], [sx * .44, .06]], INK2);   // slanted sockets
        cut([[sx * .4, -.1], [sx * .13, -.01], [sx * .14, .03], [sx * .4, -.05]], 'rgba(255,255,255,.12)');   // (a brow of light along each)
        g.save(); g.shadowColor = glow; g.shadowBlur = 16; g.fillStyle = glow; g.beginPath(); g.ellipse(sx * .27 * r, .075 * r, .075 * r, .06 * r, sx * .3, 0, TAU); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx * .27 * r, .07 * r, .028 * r, 0, TAU); g.fill(); g.restore(); }   // the light in them
      cut([[0, .13], [.085, .33], [0, .28], [-.085, .33]], INK2);   // the nose
      line([[-.27, .44], [.27, .44]], INK2, 4); for (const x of [-.165, -.055, .055, .165]) line([[x, .44], [x, .6]], INK2, 3.5);   // the teeth
      line([[-.06, -.76], [-.12, -.6], [-.03, -.5], [-.08, -.4]], 'rgba(8,10,16,.55)', 2.5);   // an old crack
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 4; g.beginPath(); g.arc(-.08 * r, -.2 * r, .5 * r, Math.PI * 1.08, Math.PI * 1.42); g.stroke();   // the shine on the crown of it
    } else if (shape === 'bolt') {
      body(() => P([[.2, -.92], [-.5, .06], [-.08, .06], [-.3, .92], [.52, -.2], [.08, -.2], [.34, -.92]]), 0);
      cut([[.16, -.7], [-.3, -.02], [-.02, -.02], [-.14, .5], [.2, -.1], [-.02, -.1], [.22, -.7]], 'rgba(255,255,255,.55)');   // its hot core
      spark(-.62, -.42, .16, lite); spark(.66, .34, .13, lite); spark(.5, -.62, .09, glow);
    } else if (shape === 'star') {
      const pts = []; for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, q = i % 2 ? .3 : (i % 4 ? .62 : .96); pts.push([Math.cos(a) * q, Math.sin(a) * q]); } body(() => P(pts), 0);
      for (let i = 0; i < 8; i += 2) { const a0 = -Math.PI / 2 + i * Math.PI / 4, a1 = a0 + Math.PI / 4, q = i % 4 ? .62 : .96; cut([[0, 0], [Math.cos(a0) * q, Math.sin(a0) * q], [Math.cos(a1) * .3, Math.sin(a1) * .3]], 'rgba(8,10,16,.22)'); }   // each point cut in two faces
      g.save(); g.shadowColor = glow; g.shadowBlur = 14; cut([[0, -.2], [.2, 0], [0, .2], [-.2, 0]], glow); g.restore(); cut([[0, -.1], [.1, 0], [0, .1], [-.1, 0]], '#ffffff');   // the stone at its heart
      spark(-.66, -.62, .11, lite); spark(.7, .58, .09, lite);
    } else if (shape === 'crown') {
      body(() => P([[-.62, .5], [-.74, -.42], [-.36, -.06], [0, -.72], [.36, -.06], [.74, -.42], [.62, .5]]), 0);
      cut([[-.62, .28], [.62, .28], [.62, .5], [-.62, .5]], 'rgba(8,10,16,.3)'); line([[-.6, .28], [.6, .28]], 'rgba(255,255,255,.5)', 2.5);   // the band
      for (const [x, y, s2] of [[0, -.72, .1], [-.74, -.42, .08], [.74, -.42, .08]]) { g.save(); g.shadowColor = glow; g.shadowBlur = 12; g.fillStyle = glow; g.beginPath(); g.arc(x * r, y * r, s2 * r, 0, TAU); g.fill(); g.restore(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc((x - .02) * r, (y - .02) * r, s2 * .4 * r, 0, TAU); g.fill(); }   // a jewel on each point
      for (const x of [-.36, 0, .36]) { g.save(); g.shadowColor = glow; g.shadowBlur = 10; cut([[x, .3], [x + .09, .39], [x, .48], [x - .09, .39]], glow); g.restore(); }   // and three set in the band
      cut([[-.7, .58], [.7, .58], [.64, .72], [-.64, .72]], mid); line([[-.7, .58], [.7, .58]], INK2, 3);
    } else if (shape === 'flame') {
      const fl = k => () => { g.beginPath(); g.moveTo(0, .9 * r * k); g.bezierCurveTo(-.82 * r * k, .78 * r * k, -.72 * r * k, -.05 * r * k, -.16 * r * k, -.95 * r * k); g.bezierCurveTo(-.14 * r * k, -.4 * r * k, .14 * r * k, -.42 * r * k, .26 * r * k, -.62 * r * k); g.bezierCurveTo(.84 * r * k, -.1 * r * k, .78 * r * k, .78 * r * k, 0, .9 * r * k); g.closePath(); };
      body(fl(1), .04); g.save(); g.translate(0, .22 * r); const inner = fl(.56); inner(); g.fillStyle = glow; g.fill(); g.translate(0, .12 * r); const core = fl(.3); core(); g.fillStyle = '#fffbe8'; g.fill(); g.restore();   // a flame in a flame, white at the root
      spark(-.56, -.56, .1, lite); spark(.6, -.76, .08, glow); spark(.72, -.3, .06, lite);
    } else {   // fang: a beast's bite: two great curved teeth, small ones between them, a jagged gum above, a drop on one tip
      for (const x of [-.2, 0, .2]) body(() => P([[x - .1, -.5], [x + .1, -.5], [x, -.12]]), x);
      for (const sx of [-1, 1]) { body(() => { g.beginPath(); g.moveTo(sx * .7 * r, -.52 * r); g.bezierCurveTo(sx * .82 * r, .1 * r, sx * .62 * r, .6 * r, sx * .4 * r, .96 * r); g.bezierCurveTo(sx * .42 * r, .4 * r, sx * .36 * r, -.1 * r, sx * .3 * r, -.52 * r); g.closePath(); }, sx > 0 ? .52 : -.5);
        g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx * .62 * r, -.38 * r); g.bezierCurveTo(sx * .7 * r, .1 * r, sx * .58 * r, .46 * r, sx * .47 * r, .7 * r); g.stroke(); }
      body(() => P([[-.84, -.8], [.84, -.8], [.8, -.58], [.6, -.48], [.42, -.6], [.2, -.48], [0, -.6], [-.2, -.48], [-.42, -.6], [-.6, -.48], [-.8, -.58]]), 0);
      g.save(); g.shadowColor = glow; g.shadowBlur = 12; g.fillStyle = glow; g.beginPath(); g.moveTo(.4 * r, .8 * r); g.quadraticCurveTo(.5 * r, .98 * r, .4 * r, 1.02 * r); g.quadraticCurveTo(.3 * r, .98 * r, .4 * r, .8 * r); g.fill(); g.restore();
    }
    return EMB[key] = c;
  }
  // a light, kept as a picture too (for the ring of lights)
  function emblemLight(col) { const key = 'L' + col; if (EMB[key]) return EMB[key]; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.18, col); gr.addColorStop(.5, col + '55'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return EMB[key] = c; }
  /* ---- ability icons: a small line drawing for each, in the bar and the armory */
  const ABICON = { vexc: 'orb', vexq: 'dash', vexe: 'smoke', vexx: 'portal', irisc: 'eye', irisq: 'wave', irise: 'flash', irisx: 'eye', bastionc: 'beacon', bastionq: 'wall', bastione: 'heart', bastionx: 'shield',
    novac: 'up', novaq: 'bolt', novae: 'wave', novax: 'bolt', wraithc: 'anchor', wraithq: 'shroud', wraithe: 'twin', wraithx: 'ghost', talonc: 'spark', talonq: 'arrow', talone: 'trap', talonx: 'arrow',
    emberc: 'flash', emberq: 'flame', embere: 'smoke', emberx: 'flame', axiomc: 'rings', axiomq: 'turret', axiome: 'wire', axiomx: 'hex', vantac: 'wall', vantaq: 'pierce', vantae: 'hex', vantax: 'duel',
    tesselc: 'bloom', tesselq: 'lull', tessele: 'lightline', tesselx: 'glasshouse' };
  // what the other click does, for the hint under the bar
  const ABALT = { vexc: 'A SHORT LOB', talonc: 'A SHORT LOB', axiomc: 'A SHORT LOB', emberq: 'A SHORT LOB', emberx: 'A SHORT LOB', emberc: 'BENT RIGHT', bastionq: 'TURNED ALONG YOUR VIEW', tesselc: 'A SHORT LOB', tesselq: 'A SHORT LOB', tessele: 'ACROSS YOUR VIEW' };
  function abIcon(g, kind, cx, cy, r, col, acc) {
    g.save(); g.translate(cx, cy); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = r * .16; g.lineCap = 'round'; g.lineJoin = 'round'; const P2 = (pts, close) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a * r, b * r) : g.moveTo(a * r, b * r)); if (close) g.closePath(); };
    const C = (x, y, rad, a0 = 0, a1 = TAU) => { g.beginPath(); g.arc(x * r, y * r, rad * r, a0, a1); };
    if (kind === 'orb') { C(0, 0, .55); g.fill(); g.strokeStyle = acc; C(0, 0, .85, -.6, 1.2); g.stroke(); C(0, 0, .85, 2.5, 4.3); g.stroke(); }
    else if (kind === 'dash') { for (const o of [-.35, .1, .55]) { P2([[o - .45, -.55], [o, 0], [o - .45, .55]]); g.stroke(); } }
    else if (kind === 'smoke') { for (const [x, y, q] of [[-.35, .2, .45], [.3, .2, .45], [0, -.2, .55]]) { C(x, y, q); g.fill(); } }
    else if (kind === 'portal') { g.save(); g.scale(.6, 1); C(0, 0, .85); g.stroke(); g.restore(); C(0, 0, .25); g.fill(); }
    else if (kind === 'eye') { g.beginPath(); g.moveTo(-.95 * r, 0); g.quadraticCurveTo(0, -.85 * r, .95 * r, 0); g.quadraticCurveTo(0, .85 * r, -.95 * r, 0); g.stroke(); C(0, 0, .3); g.fill(); }
    else if (kind === 'wave') { C(0, .5, .2); g.fill(); for (const q of [.5, .85]) { C(0, .5, q, -Math.PI * .85, -Math.PI * .15); g.stroke(); } }
    else if (kind === 'flash' || kind === 'spark') { for (let i = 0; i < 8; i++) { const a = i * TAU / 8, q = i % 2 ? .45 : .95; g.beginPath(); g.moveTo(Math.cos(a) * .2 * r, Math.sin(a) * .2 * r); g.lineTo(Math.cos(a) * q * r, Math.sin(a) * q * r); g.stroke(); } C(0, 0, .22); g.fill(); }
    else if (kind === 'beacon' || kind === 'shield') { P2([[0, -.9], [.75, -.55], [.65, .3], [0, .9], [-.65, .3], [-.75, -.55]], true); kind === 'shield' ? g.fill() : g.stroke(); if (kind === 'beacon') { P2([[0, -.4], [0, .4]]); g.stroke(); P2([[-.35, 0], [.35, 0]]); g.stroke(); } }
    else if (kind === 'wall') { for (let i = 0; i < 3; i++) g.fillRect((-.9 + i * .62) * r, -.7 * r, .5 * r, 1.4 * r); }
    else if (kind === 'heart') { g.beginPath(); g.moveTo(0, .8 * r); g.bezierCurveTo(-1.1 * r, 0, -.55 * r, -.9 * r, 0, -.3 * r); g.bezierCurveTo(.55 * r, -.9 * r, 1.1 * r, 0, 0, .8 * r); g.fill(); }
    else if (kind === 'up') { P2([[-.6, 0], [0, -.75], [.6, 0]]); g.stroke(); P2([[0, -.7], [0, .85]]); g.stroke(); P2([[-.6, .85], [.6, .85]]); g.stroke(); }
    else if (kind === 'bolt') { P2([[.15, -.9], [-.45, .1], [0, .1], [-.15, .9], [.45, -.15], [0, -.15]], true); g.fill(); }
    else if (kind === 'anchor') { C(0, -.6, .2); g.stroke(); P2([[0, -.4], [0, .8]]); g.stroke(); C(0, .2, .6, .2, Math.PI - .2); g.stroke(); P2([[-.35, -.15], [.35, -.15]]); g.stroke(); }
    else if (kind === 'ghost') { g.beginPath(); g.arc(0, -.15 * r, .6 * r, Math.PI, 0); g.lineTo(.6 * r, .8 * r); for (let i = 0; i < 3; i++) { g.lineTo((.4 - i * .4) * r, .55 * r); g.lineTo((.2 - i * .4) * r, .8 * r); } g.closePath(); g.fill(); g.fillStyle = INK; C(-.22, -.15, .12); g.fill(); C(.22, -.15, .12); g.fill(); }
    else if (kind === 'shroud') { g.save(); g.globalAlpha *= .45; g.beginPath(); g.arc(0, -.35 * r, .3 * r, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-.55 * r, .9 * r); g.quadraticCurveTo(0, -.25 * r, .55 * r, .9 * r); g.fill(); g.restore();   // Shroud: a figure fading out, an eye struck through
      g.beginPath(); g.moveTo(-.9 * r, -.35 * r); g.quadraticCurveTo(0, -.95 * r, .9 * r, -.35 * r); g.quadraticCurveTo(0, .25 * r, -.9 * r, -.35 * r); g.stroke(); P2([[-.8, .35], [.8, -1]]); g.stroke(); }
    else if (kind === 'twin') { const fig = (x, dashed) => { g.save(); g.translate(x * r, 0); if (dashed) g.setLineDash([.18 * r, .14 * r]); g.beginPath(); g.arc(0, -.55 * r, .22 * r, 0, TAU); dashed ? g.stroke() : g.fill(); g.beginPath(); g.moveTo(-.3 * r, .9 * r); g.lineTo(-.05 * r, -.2 * r); g.lineTo(.3 * r, .9 * r); g.moveTo(-.4 * r, .15 * r); g.lineTo(.35 * r, -.05 * r); g.stroke(); g.restore(); };   // Mirage: you, and the copy that runs
      fig(-.42, false); fig(.42, true); }
    else if (kind === 'steps') { for (const [x, y] of [[-.4, .45], [.35, -.35]]) { g.save(); g.translate(x * r, y * r); g.rotate(-.3); g.beginPath(); g.ellipse(0, 0, .2 * r, .34 * r, 0, 0, TAU); g.fill(); g.restore(); } }
    else if (kind === 'arrow' || kind === 'pierce') { P2([[-.85, .85], [.75, -.75]]); g.stroke(); P2([[.85, -.85], [.25, -.75], [.75, -.25]], true); g.fill(); if (kind === 'pierce') { g.strokeStyle = acc; P2([[-.2, -.75], [.75, .2]]); g.stroke(); } }
    else if (kind === 'trap') { P2([[-.85, .5], [.85, .5]]); g.stroke(); for (let i = 0; i < 4; i++) { P2([[-.65 + i * .43, .5], [-.45 + i * .43, -.3], [-.25 + i * .43, .5]]); g.stroke(); } }
    else if (kind === 'flame') { g.beginPath(); g.moveTo(0, .9 * r); g.bezierCurveTo(-.8 * r, .7 * r, -.6 * r, -.1 * r, -.1 * r, -.9 * r); g.bezierCurveTo(-.05 * r, -.3 * r, .2 * r, -.35 * r, .25 * r, -.5 * r); g.bezierCurveTo(.8 * r, 0, .7 * r, .7 * r, 0, .9 * r); g.fill(); }
    else if (kind === 'rings') { for (const q of [.3, .6, .9]) { C(0, 0, q); g.stroke(); } }
    else if (kind === 'turret') { g.fillRect(-.45 * r, -.35 * r, .9 * r, .5 * r); g.fillRect(0, -.22 * r, .9 * r, .2 * r); P2([[-.3, .15], [-.6, .85]]); g.stroke(); P2([[.3, .15], [.6, .85]]); g.stroke(); }
    else if (kind === 'wire') { for (const x of [-.75, .75]) g.fillRect((x - .1) * r, -.2 * r, .2 * r, 1 * r); g.strokeStyle = acc; P2([[-.75, .3], [.75, .3]]); g.stroke(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; P2([[Math.cos(a) * .12, -.45 + Math.sin(a) * .12], [Math.cos(a) * .34, -.45 + Math.sin(a) * .34]]); g.stroke(); } }   // Tripwire: two anchors and the wire across between them
    else if (kind === 'mine') { C(0, .2, .55, Math.PI, 0); g.fill(); g.fillRect(-.7 * r, .2 * r, 1.4 * r, .2 * r); C(0, -.45, .12); g.fill(); }
    else if (kind === 'hex') { P2([0, 1, 2, 3, 4, 5].map(i => [Math.cos(i * Math.PI / 3 + Math.PI / 6) * .85, Math.sin(i * Math.PI / 3 + Math.PI / 6) * .85]), true); g.stroke(); C(0, 0, .3); g.fill(); }
    // Tessel's: a seed of light opening (Bloom), an hourglass over a ripple (Lull), a curtain stood on a line (Lightline), a room of light (Glasshouse)
    else if (kind === 'bloom') { for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.save(); g.rotate(a); g.beginPath(); g.ellipse(0, -.55 * r, .17 * r, .3 * r, 0, 0, TAU); g.stroke(); g.restore(); } C(0, 0, .24); g.fill(); }
    else if (kind === 'lull') { P2([[-.5, -.85], [.5, -.85], [-.5, .45], [.5, .45]], true); g.stroke(); g.save(); g.globalAlpha *= .7; P2([[-.22, .1], [.22, .1], [0, -.18]], true); g.fill(); g.restore(); g.strokeStyle = acc; g.beginPath(); g.ellipse(0, .72 * r, .85 * r, .18 * r, 0, 0, TAU); g.stroke(); }
    else if (kind === 'lightline') { P2([[-.85, .75], [.85, .35]]); g.stroke(); g.save(); g.globalAlpha *= .45; P2([[-.85, .75], [.85, .35], [.85, -.65], [-.85, -.85]], true); g.fill(); g.restore(); for (const q of [-.42, .02, .45]) { const yb = .75 - (q + .85) / 1.7 * .4, yt = -.85 + (q + .85) / 1.7 * .2; P2([[q, yb], [q, yt]]); g.stroke(); } }
    else if (kind === 'glasshouse') { const T2 = [[0, -.15], [.85, .2], [0, .55], [-.85, .2]]; P2(T2, true); g.stroke(); P2(T2.map(([a, b]) => [a, b - .7]), true); g.stroke(); for (const [a, b] of T2) { P2([[a, b], [a, b - .7]]); g.stroke(); } g.save(); g.globalAlpha *= .4; P2([[0, -.15], [.85, .2], [.85, -.5], [0, -.85], [-.85, -.5], [-.85, .2]], true); g.fill(); g.restore(); }
    else if (kind === 'duel') { C(0, 0, .85); g.stroke(); P2([[-.55, .55], [.55, -.55]]); g.stroke(); P2([[-.55, -.55], [.55, .55]]); g.stroke(); }
    g.restore();
  }
  // a small bust of an operative for the top bar: shoulders in their colour and their headgear, greyed once they are down
  function opBust(g, op, x, y, s, up) {
    const O = OPS[op] || OPS.vex, kt = KIT[op] || KIT.vex, grey = c => up ? c : '#3c4049', glow = up ? O.col : '#555a63';
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = grey(kt.suit); g.beginPath(); g.moveTo(-21, 24); g.quadraticCurveTo(-20, 7, 0, 6); g.quadraticCurveTo(20, 7, 21, 24); g.closePath(); g.fill();
    g.fillStyle = grey(kt.plate); g.beginPath(); g.moveTo(-9, 24); g.lineTo(-7, 11); g.lineTo(7, 11); g.lineTo(9, 24); g.closePath(); g.fill();
    g.fillStyle = grey('#1b1e25'); g.beginPath(); g.ellipse(0, -5, 8.5, 10, 0, 0, TAU); g.fill();
    if (op === 'vex') { g.fillStyle = grey(kt.cloth); g.beginPath(); g.arc(0, -6, 12.5, Math.PI * .92, Math.PI * 2.08); g.lineTo(9, 7); g.quadraticCurveTo(0, 2, -9, 7); g.closePath(); g.fill();
      g.fillStyle = grey('#1b1e25'); g.beginPath(); g.ellipse(0, -3, 6.2, 7.5, 0, 0, TAU); g.fill(); g.fillStyle = glow; g.fillRect(-6, -6, 12, 2.4); }
    else if (op === 'iris') { g.fillStyle = grey(kt.plate); g.beginPath(); g.arc(0, -6, 11, Math.PI, TAU); g.lineTo(11, -2); g.lineTo(-11, -2); g.closePath(); g.fill(); g.fillStyle = glow; g.fillRect(-11, -7, 22, 4.5);
      g.strokeStyle = grey('#15171c'); g.lineWidth = 1.2; g.beginPath(); g.moveTo(-9, -12); g.lineTo(-11, -22); g.stroke(); g.fillStyle = glow; g.beginPath(); g.arc(-11, -22, 1.6, 0, TAU); g.fill(); }
    else if (op === 'bastion') { g.fillStyle = grey(kt.plate); g.beginPath(); g.moveTo(-11, 6); g.lineTo(-12, -12); g.quadraticCurveTo(0, -21, 12, -12); g.lineTo(11, 6); g.closePath(); g.fill(); g.fillStyle = glow; g.fillRect(-7.5, -7, 15, 2.6); g.fillRect(-1.3, -7, 2.6, 8); }
    else if (op === 'nova') { g.fillStyle = grey(kt.plate); g.beginPath(); g.arc(0, -6, 10.5, Math.PI, TAU); g.lineTo(10.5, -3); g.lineTo(-10.5, -3); g.closePath(); g.fill(); g.fillStyle = grey(O.col); g.fillRect(-1.4, -20, 2.8, 10); g.fillStyle = glow; g.fillRect(-9, -6, 18, 3.4); }
    else if (op === 'wraith') { g.fillStyle = grey(kt.suit); g.beginPath(); g.arc(0, -6, 11.5, Math.PI * .95, Math.PI * 2.05); g.lineTo(9, 6); g.lineTo(-9, 6); g.closePath(); g.fill(); g.fillStyle = grey(kt.plate); g.beginPath(); g.ellipse(0, -3, 6.5, 8.5, 0, 0, TAU); g.fill(); g.fillStyle = glow; g.fillRect(-5, -5, 3.6, 1.6); g.fillRect(1.4, -5, 3.6, 1.6); g.fillStyle = grey(kt.cloth); g.fillRect(-10, 6, 20, 4); }
    else if (op === 'talon') { g.fillStyle = grey(kt.cloth); g.beginPath(); g.arc(0, -8, 10, Math.PI, TAU); g.fill(); g.fillRect(-14, -9, 28, 2.6); g.fillStyle = grey('#15171c'); g.fillRect(-7, -13, 14, 4); g.fillStyle = glow; g.beginPath(); g.arc(-3.5, -11, 1.6, 0, TAU); g.arc(3.5, -11, 1.6, 0, TAU); g.fill(); }
    else if (op === 'ember') { g.fillStyle = grey('#15171c'); g.fillRect(-6, -2, 12, 7); g.fillStyle = grey(kt.plate); g.beginPath(); g.arc(-5.5, 2, 2.4, 0, TAU); g.arc(5.5, 2, 2.4, 0, TAU); g.fill(); g.fillStyle = glow; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-6 + i * 4, -13); g.lineTo(-4 + i * 4, -23 + Math.abs(i - 1.5) * 3); g.lineTo(-2 + i * 4, -13); g.closePath(); g.fill(); } }
    else if (op === 'vanta') { g.fillStyle = grey(kt.plate); g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; g.lineTo(Math.cos(a) * 11, -6 + Math.sin(a) * 11); } g.closePath(); g.fill(); g.fillStyle = glow; g.fillRect(-10, -7, 20, 3.4); g.beginPath(); g.moveTo(5, -14); g.lineTo(14, -24); g.lineTo(9, -13); g.closePath(); g.fill(); }
    else if (op === 'tessel') { g.strokeStyle = glow; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, -24); g.lineTo(13, -9); g.lineTo(0, 6); g.lineTo(-13, -9); g.closePath(); g.stroke();   // the diamond of light behind the helm
      g.fillStyle = grey(kt.plate); g.beginPath(); g.ellipse(0, -6, 10.5, 12, 0, 0, TAU); g.fill(); g.fillStyle = grey('#15171c'); g.fillRect(-9.5, -8, 19, 3); g.fillStyle = glow; g.fillRect(-1.2, -16, 2.4, 18); }
    else if (op === 'axiom') { g.fillStyle = grey(kt.plate); g.beginPath(); g.arc(0, -8, 10, Math.PI, TAU); g.fill(); g.fillRect(-13, -9, 26, 2.4); g.fillStyle = glow; g.fillRect(-8, -6, 16, 2.6); g.beginPath(); g.arc(0, -16, 1.8, 0, TAU); g.fill(); }
    else { g.fillStyle = glow; tx(g, (O.n || '?')[0], 0, -4, 12, glow, 'center', 900); }
    g.restore();
  }
  /* ---- the kill banner: an emblem that grows with every kill in the round, 1 to 5
     1  the emblem in a disc, a ring, four ticks and four lights
     2  + a second ring of arcs, dashes out to the sides, six lights
     3  + chevrons above and below, brackets round the ring, eight lights
     4  + blades out to the sides like wings, a dashed halo turning outside, ten lights
     5  + great wings and a crown, the halo doubled and gold, twelve lights, embers rising
     It slams in: a white flash, a shockwave, shards thrown out in its colour, a streak of light across it, and the ring of
     lights spins round once, faster the more kills, then settles and glows. Each new kill replaces the last, bigger. */
  function bannerShards(n, seed) { let s2 = seed >>> 0; const r = () => { s2 = (s2 * 1664525 + 1013904223) >>> 0; return s2 / 4294967296; }, out = [];
    for (let i = 0; i < 14 + n * 7; i++) { const a = r() * TAU; out.push({ a, v: .9 + r() * 1.6 + n * .12, w: .05 + r() * .08, l: .14 + r() * .3, spin: (r() - .5) * 6, d: r() * .08, k: r() }); } return out; }
  /* ---- abilities on you, at the edges of the screen: Exposed (cracks of magenta light creeping in), slowed (frost at the
     edges), Gloom (a dark that closes round the middle), a ward (a hex shimmer), a Duel Field (the world tinted, the time
     left at the top) */
  const STX = {};
  function statusFx(g, P, V, W, H, u) {
    if (!P || !P.alive) return; const t = K.t || 0, cx = 640, cy = (V.y0 + V.y1) / 2, edge = (col, a, inner = .45) => { const gr = g.createRadialGradient(cx, cy, H * inner, cx, cy, H * .95); gr.addColorStop(0, col + '00'); gr.addColorStop(1, col + Math.round(cl(a, 0, 1) * 255).toString(16).padStart(2, '0')); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, H); };
    if (P.murk > 0) { const k = Math.min(1, P.murk / .4, (3.5 - P.murk) / .2 + .3); edge('#0c0714', .95 * k, .12); }
    if (P.slowF > 0) { edge('#9fe8ff', .5, .5); if (!STX.frost) { STX.frost = []; for (let i = 0; i < 40; i++) STX.frost.push([Math.random(), Math.random(), .3 + Math.random() * .7]); }
      g.strokeStyle = 'rgba(220,248,255,.55)'; g.lineWidth = 1.5 * u; for (const [a, b, s2] of STX.frost) { const side = a < .5, x = side ? (a < .25 ? V.x0 + b * 60 * u : V.x1 - b * 60 * u) : V.x0 + b * W, y = side ? V.y0 + (a * 4 % 1) * H : (a < .75 ? V.y0 + b * 40 * u : V.y1 - b * 40 * u); g.beginPath(); for (let k = 0; k < 3; k++) { const an = k * Math.PI / 3 + s2; g.moveTo(x - Math.cos(an) * 9 * s2 * u, y - Math.sin(an) * 9 * s2 * u); g.lineTo(x + Math.cos(an) * 9 * s2 * u, y + Math.sin(an) * 9 * s2 * u); } g.stroke(); } }
    if (P.exposed > 0) { const k = Math.min(1, P.exposed / .3), fl = .75 + .25 * Math.sin(t * 9); edge(OPS.vanta.col, .38 * k * fl, .55);
      if (!STX.cracks) { STX.cracks = []; for (let i = 0; i < 9; i++) { const side = i % 4, pts = [], a = Math.random(); let x = side === 0 ? a : side === 1 ? 1 : side === 2 ? a : 0, y = side === 0 ? 0 : side === 1 ? a : side === 2 ? 1 : a; pts.push([x, y]); for (let k2 = 0; k2 < 6; k2++) { x += (side === 1 ? -1 : side === 3 ? 1 : (Math.random() - .5)) * .04; y += (side === 0 ? 1 : side === 2 ? -1 : (Math.random() - .5)) * .06; pts.push([x, y]); } STX.cracks.push(pts); } }
      g.strokeStyle = `rgba(255,170,255,${.7 * k * fl})`; g.lineWidth = 2 * u; for (const pts of STX.cracks) { g.beginPath(); pts.forEach(([x, y], i) => { const X2 = V.x0 + x * W, Y2 = V.y0 + y * H; i ? g.lineTo(X2, Y2) : g.moveTo(X2, Y2); }); g.stroke(); }
      txo(g, 'EXPOSED', cx, V.y0 + 120 * u, 13 * u, OPS.vanta.col, u); }
    if (P.ward > 0) { const a = .22 + .1 * Math.sin(t * 4); g.strokeStyle = `rgba(226,92,255,${a})`; g.lineWidth = 1.5 * u; const s2 = 28 * u;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 12; j++) { const x = i ? V.x1 - s2 * .9 : V.x0 + s2 * .9, y = V.y0 + H * .15 + j * s2 * 1.55; g.beginPath(); for (let k = 0; k < 6; k++) { const an = k * Math.PI / 3; g.lineTo(x + Math.cos(an) * s2 * .8, y + Math.sin(an) * s2 * .8); } g.closePath(); g.stroke(); }
      txo(g, '◆ WARD', V.x0 + 330 * u, V.y1 - 100 * u, 11 * u, OPS.vanta.col, u); }
    if (P.over > 0) txo(g, `OVERCHARGE  ${Math.ceil(P.over)}`, cx, V.y1 - 150 * u, 12 * u, OPS.vanta.col, u);
    if (P.duel) { const D = P.duel; g.fillStyle = 'rgba(80,10,90,.16)'; g.fillRect(V.x0, V.y0, W, H); edge('#2a0a30', .7, .4);
      const o = D.a === P ? D.b : D.a; txo(g, 'DUEL FIELD', cx, V.y0 + 150 * u, 18 * u, OPS.vanta.col, u); txo(g, `${o ? o.name.toUpperCase() : ''}  ·  UNTIL ONE FALLS`, cx, V.y0 + 174 * u, 12 * u, BONE, u); }   // (below the round's own hints)
  }
  function txo(g, s2, x, y, px, col, u) { px = fitPx(g, px); g.font = `900 ${px}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = Math.max(3, px * .28); g.strokeStyle = 'rgba(6,8,12,.85)'; g.strokeText(s2, x, y); g.fillStyle = col; g.fillText(s2, x, y); }   // words with a dark edge
  function drawBanner(g, V, u) {
    if (!banner) return; const B = banner, n = cl(B.n | 0, 1, 5), T = 2.1 + n * .12, t = B.pin != null ? B.pin : (performance.now() - B.t0) / 1000;   // (pin: the tests hold a moment)
    if (t > T) { banner = null; return; }
    if (!B.sh) B.sh = bannerShards(n, Math.floor(B.t0 * 7));
    const E = B.em, acc = n >= 5 ? GOLD : E.glow, touch = isTouch(), cx = 640, cy = V.y1 - (touch ? 196 : 140) * u, R = (touch ? 33 : 40) * u * (1 + (n - 1) * .07);   // (a phone's health and ammo sit bottom centre: the banner rides above them, a little smaller)
    const inK = smooth(cl(t / .14, 0, 1)), pop = t < .14 ? 1.7 - .7 * inK : 1 + Math.sin(Math.min(1, (t - .14) / .22) * Math.PI) * .06, outK = Math.max(smooth(cl((t - (T - .35)) / .35, 0, 1)), isTouch() && M && M.phase === 'end' && M.last && M.last.t0 ? smooth(cl((performance.now() - M.last.t0 - 350) / 300, 0, 1)) : 0), a = (t < .06 ? t / .06 : 1) * (1 - outK), sc = pop * (1 - outK * .25);   // (on a phone it bows out once the round's result is up: no room for both)
    const st = (c, w) => { g.strokeStyle = c; g.lineWidth = w; }, line = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    g.save(); g.translate(cx, cy);
    // behind it all: a dark backing (it has to read on a bright map), a soft glow, and (from three kills) a beam of light up and down
    { g.globalAlpha = a * .62; const bk = g.createRadialGradient(0, 0, R * .5, 0, 0, R * (2.3 + n * .2)); bk.addColorStop(0, 'rgba(6,8,12,.95)'); bk.addColorStop(.6, 'rgba(6,8,12,.55)'); bk.addColorStop(1, 'rgba(6,8,12,0)'); g.fillStyle = bk; g.beginPath(); g.arc(0, 0, R * (2.3 + n * .2), 0, TAU); g.fill(); }
    { g.globalAlpha = a * (.55 + .1 * n); const gr = g.createRadialGradient(0, 0, R * .3, 0, 0, R * (2.4 + n * .25)); gr.addColorStop(0, acc + '55'); gr.addColorStop(1, acc + '00'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R * (2.4 + n * .25), 0, TAU); g.fill();
      if (n >= 3) { const bw = R * (.16 + .03 * n), bg2 = g.createLinearGradient(0, -R * 4, 0, R * 4); bg2.addColorStop(0, acc + '00'); bg2.addColorStop(.5, acc + '66'); bg2.addColorStop(1, acc + '00'); g.fillStyle = bg2; g.globalAlpha = a * (t < .5 ? t / .5 : 1) * .7; g.fillRect(-bw / 2, -R * 4, bw, R * 8); } }
    // the shockwave and the shards, thrown out from the middle as it lands
    if (t < .7) { const q = t / .7, e2 = 1 - Math.pow(1 - q, 3); g.globalAlpha = a * (1 - q); st(BONE, (5 - 4 * q) * u); g.beginPath(); g.arc(0, 0, R * (1 + e2 * (1.8 + n * .2)), 0, TAU); g.stroke();
      st(acc, (3 - 2 * q) * u); g.beginPath(); g.arc(0, 0, R * (1.1 + e2 * (2.4 + n * .3)), 0, TAU); g.stroke(); }
    for (const p of B.sh) { const q = cl((t - p.d) / (.75 + p.k * .35), 0, 1); if (q <= 0 || q >= 1) continue; const e2 = 1 - Math.pow(1 - q, 2.4), r0 = R * (1.05 + e2 * p.v * 1.6), x = Math.cos(p.a) * r0, y = Math.sin(p.a) * r0 * .82 + q * q * R * .6;
      g.save(); g.translate(x, y); g.rotate(p.a + p.spin * q); g.globalAlpha = a * (1 - q) * (p.k > .3 ? 1 : .6); g.fillStyle = p.k > .55 ? acc : p.k > .2 ? BONE : E.col; const L = R * p.l * (1 - q * .5), W = R * p.w;
      g.beginPath(); g.moveTo(L, 0); g.lineTo(0, W); g.lineTo(-L * .4, 0); g.lineTo(0, -W); g.closePath(); g.fill(); g.restore(); }
    g.globalAlpha = a; g.scale(sc, sc);
    // wings (4: blades; 5: great wings), behind the disc
    if (n >= 4) { const wk = smooth(cl((t - .05) / .35, 0, 1)), big = n >= 5 ? 1.35 : 1;
      for (const sx of [-1, 1]) { g.save(); g.scale(sx, 1); g.rotate((1 - wk) * .6);
        for (let k = 0; k < (n >= 5 ? 4 : 3); k++) { const L = R * (1.25 + k * .32) * big * wk, y0 = -R * .3 + k * R * .26, x0 = R * .9;
          const gr = g.createLinearGradient(x0, 0, x0 + L, 0); gr.addColorStop(0, BONE); gr.addColorStop(.7, BONE); gr.addColorStop(1, acc); g.fillStyle = gr;
          g.beginPath(); g.moveTo(x0, y0 - R * .07); g.lineTo(x0 + L, y0 - R * (.28 - k * .1) * big); g.lineTo(x0 + L * .78, y0 + R * .04); g.lineTo(x0, y0 + R * .1); g.closePath(); st('rgba(6,8,12,.9)', 3 * u); g.stroke(); g.fill(); st(acc, 1 * u); g.stroke(); }
        g.restore(); } }
    // the crown (5) and the chevrons (3+)
    if (n >= 3) { const ck = smooth(cl((t - .08) / .25, 0, 1)); g.fillStyle = n >= 5 ? GOLD : BONE;
      for (const sy of [-1, 1]) { const y0 = sy * R * (1.32 + (1 - ck) * .5); g.beginPath(); g.moveTo(-R * .34, y0); g.lineTo(0, y0 + sy * R * .3); g.lineTo(R * .34, y0); g.lineTo(R * .2, y0); g.lineTo(0, y0 + sy * R * .14); g.lineTo(-R * .2, y0); g.closePath(); st('rgba(6,8,12,.9)', 3 * u); g.stroke(); g.fill(); }
      if (n >= 5) { const y0 = -R * (1.62 + (1 - ck) * .4); g.beginPath(); g.moveTo(-R * .5, y0 + R * .12); g.lineTo(-R * .56, y0 - R * .3); g.lineTo(-R * .24, y0 - R * .08); g.lineTo(0, y0 - R * .46); g.lineTo(R * .24, y0 - R * .08); g.lineTo(R * .56, y0 - R * .3); g.lineTo(R * .5, y0 + R * .12); g.closePath(); st('rgba(6,8,12,.9)', 3 * u); g.stroke(); g.fill(); } }
    // dashes out to the sides (2+)
    if (n >= 2) { const dk = smooth(cl((t - .04) / .25, 0, 1)); st(BONE, 2.2 * u); for (const sx of [-1, 1]) for (const dy of [-.07, .07]) line(sx * R * (1.5 + (1 - dk) * .4), dy * R, sx * R * (1.5 + (1 - dk) * .4 + .34 * dk), dy * R); }
    // the halo (4+): a dashed ring turning outside, doubled and gold at 5
    if (n >= 4) { g.save(); g.rotate(t * .6); st(acc, 1.6 * u); g.setLineDash([R * .2, R * .14]); g.beginPath(); g.arc(0, 0, R * 1.72, 0, TAU); g.stroke(); if (n >= 5) { g.rotate(-t * 1.4); g.setLineDash([R * .08, R * .1]); g.beginPath(); g.arc(0, 0, R * 1.86, 0, TAU); g.stroke(); } g.setLineDash([]); g.restore(); }
    // the ring of lights: they spin round as it lands, then settle and glow
    { const N = 2 + n * 2, spinT = .55 + n * .08, sq = smooth(cl(t / spinT, 0, 1)), rot = (1 - sq) * TAU * (1 + n * .25), rL = R * 1.46;
      for (let i = 0; i < N; i++) { const an = -Math.PI / 2 + i * TAU / N + rot, lit = t > .08 + i * (spinT / N) * .9, x = Math.cos(an) * rL, y = Math.sin(an) * rL, pl = lit ? .75 + .25 * Math.sin(t * 6 + i) : .3;
        if (lit) { g.globalAlpha = a * pl; const ls = R * .46; g.drawImage(emblemLight(acc), x - ls / 2, y - ls / 2, ls, ls); g.globalAlpha = a; }
        else { g.fillStyle = 'rgba(239,233,220,.35)'; g.beginPath(); g.arc(x, y, R * .04, 0, TAU); g.fill(); } } }
    // the rings round the disc: outer, then (2+) arcs, then (3+) brackets; four ticks always
    st(BONE, 2.4 * u); g.beginPath(); g.arc(0, 0, R * 1.2, 0, TAU); g.stroke();
    for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2; line(Math.cos(an) * R * 1.24, Math.sin(an) * R * 1.24, Math.cos(an) * R * 1.36, Math.sin(an) * R * 1.36); }
    if (n >= 2) { g.save(); g.rotate(-t * .8); st(acc, 3 * u); for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, R * 1.08, i * TAU / 3 + .2, i * TAU / 3 + TAU / 3 - .2); g.stroke(); } g.restore(); }
    if (n >= 3) { st(BONE, 3 * u); for (const sx of [-1, 1]) { g.beginPath(); g.arc(0, 0, R * 1.3, sx > 0 ? -.5 : Math.PI - .5, sx > 0 ? .5 : Math.PI + .5); g.stroke(); } }
    // the disc and the emblem
    { const dg = g.createRadialGradient(0, -R * .35, R * .05, 0, 0, R); dg.addColorStop(0, '#303848'); dg.addColorStop(.6, '#141922'); dg.addColorStop(1, '#07090d'); g.fillStyle = dg; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); st(acc, 2.5 * u); g.stroke();
      st('rgba(0,0,0,.55)', 3 * u); g.beginPath(); g.arc(0, 0, R * .93, 0, TAU); g.stroke(); st('rgba(239,233,220,.22)', 1 * u); g.beginPath(); g.arc(0, 0, R * .88, 0, TAU); g.stroke();
      st(acc + '66', 1.5 * u); for (let i = 0; i < 24; i++) { const an = i * TAU / 24; line(Math.cos(an) * R * .9, Math.sin(an) * R * .9, Math.cos(an) * R * (i % 6 ? .95 : .99), Math.sin(an) * R * (i % 6 ? .95 : .99)); } }   // a bezel, notched like a dial
    { const art = emblemArt(E.shape, n >= 5 ? '#fff3c4' : E.col, acc), es = R * 2.22 * (1 + .04 * Math.sin(t * 5)); g.drawImage(art, -es / 2, -es / 2, es, es); }   // (its picture: 92 of the picture's 128 is the emblem's radius, the rest its glow)
    // the white flash as it lands, and a streak of light across it
    if (t < .14) { g.globalAlpha = a * (1 - t / .14); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, R * 1.25, 0, TAU); g.fill(); g.globalAlpha = a; }
    if (t > .1 && t < .6) { const q = (t - .1) / .5, x = lp(-R * 3, R * 3, q); g.save(); g.beginPath(); g.arc(0, 0, R * 1.22, 0, TAU); g.clip(); g.rotate(-.5); const sg = g.createLinearGradient(x - R * .4, 0, x + R * .4, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.fillRect(-R * 3, -R * 3, R * 6, R * 6); g.restore(); }
    // embers rising at five
    if (n >= 5) for (let i = 0; i < 10; i++) { const q = ((t * .6 + i / 10) % 1), x = Math.sin(i * 2.4) * R * 1.4, y = R * 1.2 - q * R * 3.2; g.globalAlpha = a * (1 - q) * .9; g.fillStyle = i % 2 ? GOLD : BONE; g.fillRect(x, y, 2.4 * u, 2.4 * u); }
    g.restore(); g.save(); g.globalAlpha = a;
    // the words: the run above, who fell below, a pip a kill
    const top = cy - R * sc * (n >= 5 ? 2.05 : n >= 3 ? 1.75 : 1.5) - 10 * u, run = ['', '', 'DOUBLE KILL', 'TRIPLE KILL', 'QUADRA KILL', 'ACE'][n];
    if (run) { const rk = smooth(cl((t - .1) / .25, 0, 1)); g.globalAlpha = a * rk; txo(g, run, cx, top + (1 - rk) * 8 * u, (14 + n * 1.5) * u, acc, u); g.globalAlpha = a; }
    const py = cy + R * sc * (n >= 3 ? 1.75 : 1.5) + 12 * u, pw = 15 * u, px0 = cx - (n - 1) * pw / 2;
    for (let i = 0; i < n; i++) { const fresh = i === n - 1, sz = 5 * u * (fresh && t < .25 ? 1 + (1 - t / .25) * .9 : 1); g.fillStyle = fresh ? acc : BONE; g.beginPath(); g.moveTo(px0 + i * pw, py - sz); g.lineTo(px0 + i * pw + sz, py); g.lineTo(px0 + i * pw, py + sz); g.lineTo(px0 + i * pw - sz, py); g.closePath(); g.fill(); }
    txo(g, (B.head ? 'HEADSHOT  ·  ' : '') + B.name.toUpperCase(), cx, py + 19 * u, 12 * u, BONE, u);
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
    const a = 'ON SITE' + (SITES.length > 1 ? ' ' + letter : ''), b = key.toUpperCase() + ': PLANT', p1 = fitPx(g, 19 * u), p2 = fitPx(g, 15 * u);
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
    tx(g, side === 'att' ? 'ATTACK' : 'DEFEND', x0 + 26 * u, V.y0 + 282 * u, 22 * u, side === 'att' ? FOE : YOU, 'left', 900);
    tx(g, side === 'att' ? (two ? 'Plant on ' + siteWords() : 'Plant the charge') : (two ? 'Hold ' + siteWords('and') : 'Stop the plant'), x0 + 26 * u, V.y0 + 308 * u, 14 * u, '#c9cfd8', 'left', 600);
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
      { const cd = cardOf(q), lw = cd.lv ? lvChip(g, x + 74 * u, y + 60 * u, cd.lv, 9 * u) + 6 * u : 0; fitTx(g, (q.bot ? 'BOT' : q.net && !q.isBot ? 'PLAYER' : q === P ? 'YOU' : 'BOT') + (cd.title && !slim ? '  ·  ' + cd.title.toUpperCase() : ''), x + 74 * u + lw, y + 60 * u, 10 * u, DIM, 'left', 800, cw - 80 * u - lw); }
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
    const V = K.view, u = uiScale(), W = V.x1 - V.x0, tch = isTouch(), cy = V.y0 + (tch ? 118 : 168) * u, hh = (tch ? 30 : 46) * u, inK = smooth(cl(t / .28, 0, 1)), outK = smooth(cl((t - D + .35) / .35, 0, 1)), sk = 40 * u;
    const x0 = lp(V.x0 - W, V.x0, inK) + outK * W, x1 = x0 + W, col = SWEEP.col;
    g.save(); g.globalAlpha = .9; g.fillStyle = 'rgba(8,10,14,.86)'; g.beginPath(); g.moveTo(x0 + sk, cy - hh); g.lineTo(x1 + sk, cy - hh); g.lineTo(x1 - sk, cy + hh); g.lineTo(x0 - sk, cy + hh); g.closePath(); g.fill();
    g.globalAlpha = 1; g.fillStyle = col; g.fillRect(x0, cy - hh, W, 3 * u); g.fillRect(x0, cy + hh - 3 * u, W, 3 * u);
    const sh = ((t * 900 * u) % (W + 400 * u)) - 200 * u; const gr = g.createLinearGradient(x0 + sh - 120 * u, 0, x0 + sh + 120 * u, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x0, cy - hh, W, hh * 2);   // a glint runs along it
    const tx0 = 640 + (1 - inK) * -160 * u + outK * 160 * u, pop = 1 + .18 * Math.max(0, 1 - t / .35);
    tx(g, SWEEP.title, tx0, cy - (tch ? 5 : 8) * u, (tch ? 30 : 46) * u * pop, col, 'center', 900); if (SWEEP.sub) tx(g, SWEEP.sub, tx0, cy + (tch ? 18 : 27) * u, (tch ? 11 : 14) * u, BONE, 'center', 800);   // (slimmer on a phone)
    g.restore();
  }
  // ---- switching sides: a band across the screen at the start of the second half (and the decider) says which side you are now
  function drawSwitch(g) {
    const S = UI.switched; if (!S) return; const t = (performance.now() - S.t0) / 1000; if (t > 3.2) { UI.switched = null; return; }
    const V = K.view, u = uiScale(), W = V.x1 - V.x0, a = t < .25 ? smooth(t / .25) : t > 2.8 ? 1 - (t - 2.8) / .4 : 1, col = S.side === 'att' ? FOE : YOU, cy = 330;
    g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(V.x0, cy - 78 * u, W, 156 * u); g.fillStyle = col; g.fillRect(V.x0, cy - 78 * u, W, 4 * u); g.fillRect(V.x0, cy + 74 * u, W, 4 * u);
    const sw = (t * 260 * u) % (80 * u); for (let i = -2; i < W / (80 * u) + 2; i++) { const x = V.x0 + i * 80 * u + sw; g.fillStyle = 'rgba(239,233,220,.05)'; g.beginPath(); g.moveTo(x, cy - 74 * u); g.lineTo(x + 30 * u, cy - 74 * u); g.lineTo(x + 70 * u, cy); g.lineTo(x + 30 * u, cy + 74 * u); g.lineTo(x, cy + 74 * u); g.lineTo(x + 40 * u, cy); g.closePath(); g.fill(); }
    tx(g, S.sd ? 'SUDDEN DEATH  ·  NEXT ROUND WINS' : S.decider ? (S.first ? 'OVERTIME  ·  WIN BY TWO' : 'OVERTIME  ·  SWAP EVERY ROUND') : 'SIDE SWAP', 640, cy - 34 * u, 20 * u, S.decider ? GOLD : DIM, 'center', 900);
    tx(g, S.side === 'att' ? 'ATTACK' : 'DEFEND', 640, cy + 12 * u, 54 * u, col, 'center', 900);
    tx(g, S.side === 'att' ? (SITES.length > 1 ? 'Plant on ' + siteWords() : 'Plant the charge') : 'Stop the plant', 640, cy + 52 * u, 15 * u, BONE, 'center', 700);
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
    statusFx(g, P, V, W, H, u);   // what abilities are doing to you: Exposed, slowed, in Gloom, warded, in a Duel Field
    if (M.hurt > 0) { const gr = g.createRadialGradient(640, 360, H * .35, 640, 360, H * .8); gr.addColorStop(0, 'rgba(255,60,50,0)'); gr.addColorStop(1, `rgba(255,60,50,${M.hurt * .5})`); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, H);
      const a = M.hurtDir - P.yaw + Math.PI; g.save(); g.translate(640, 360); g.rotate(-a); g.fillStyle = `rgba(255,90,77,${M.hurt * .8})`; g.beginPath(); g.arc(0, 0, 150 * u, Math.PI * 1.36, Math.PI * 1.64); g.arc(0, 0, 134 * u, Math.PI * 1.64, Math.PI * 1.36, true); g.fill(); g.restore(); }
    // --- markers in the world: a pinged rival, the planted charge
    // teammates: a name and a marker over each, and their health
    for (const q of M.fs) if (q !== P && q.team === P.team && q.alive) { const s = toScreen(q.x, q.y + 2.05, q.z); if (s) { g.fillStyle = YOU; g.beginPath(); g.moveTo(s[0] - 7, s[1] - 10); g.lineTo(s[0] + 7, s[1] - 10); g.lineTo(s[0], s[1]); g.closePath(); g.fill(); tx(g, `${carries(q) ? '◆ ' : ''}${q.name.toUpperCase()} ${Math.ceil(q.hp)}`, s[0], s[1] - 20, 13, carries(q) ? GOLD : YOU, 'center', 800); } }
    if (M.loot && M.loot.length && P.alive && !M.over) for (const d of M.loot) { const G2 = GUNS[d.k], dd = Math.hypot(d.x - P.x, d.z - P.z); if (!G2 || dd > 9 || Math.abs(d.y - P.y) > 2.5) continue;
      const s = toScreen(d.x, d.y + .45, d.z); if (!s || !canSeePt(P, d.x, d.y + .3, d.z)) continue; const on = P.nearLoot === d, a = on ? 1 : cl(1.25 - dd / 8, .35, .9);
      g.globalAlpha = a; const w2 = (on ? 150 : 104) * u, h2 = (on ? 34 : 24) * u; rr(g, s[0] - w2 / 2, s[1] - h2, w2, h2, 6 * u, 'rgba(12,16,22,.78)', on ? GOLD : 'rgba(239,233,220,.35)', on ? 2 : 1);
      if (on) { rr(g, s[0] - w2 / 2 + 6 * u, s[1] - h2 + 6 * u, 22 * u, 22 * u, 4 * u, GOLD); tx(g, touch ? '◉' : 'F', s[0] - w2 / 2 + 17 * u, s[1] - h2 + 17 * u, 14 * u, '#0c1016', 'center', 900); }
      tx(g, G2.n.toUpperCase(), s[0] + (on ? 12 * u : 0), s[1] - h2 / 2 - (on ? 4 : 0) * u, (on ? 14 : 11) * u, on ? BONE : 'rgba(239,233,220,.85)', 'center', 900);
      if (on) tx(g, lootFree(P) ? 'PICK UP' : 'SWAP', s[0] + 12 * u, s[1] - 8 * u, 9 * u, GOLD, 'center', 800); g.globalAlpha = 1; }
    { const CP = M.chargePing; if (CP && side === 'att' && M.charge && !M.charge.k && !M.planted && M.time - CP.t0 < 3) { const s = toScreen(CP.x, hAt(CP.x, CP.z) + .3, CP.z), q = (M.time - CP.t0) / 3;
      if (s) for (let i = 0; i < 3; i++) { const r = ((q * 3 + i / 3) % 1); g.strokeStyle = `rgba(255,210,90,${(1 - r) * .9})`; g.lineWidth = 3 * u; g.beginPath(); g.arc(s[0], s[1], (14 + r * 60) * u, 0, TAU); g.stroke(); }
    } }
    if (M.charge && !M.charge.k && !M.planted && side === 'att' && M.phase !== 'end') { const C = M.charge, s = toScreen(C.x, C.y + .8, C.z); if (s) { const p = 1 + Math.sin(M.time * 6) * .12; g.strokeStyle = GOLD; g.lineWidth = 2.5; g.beginPath(); g.moveTo(s[0], s[1] - 11 * p); g.lineTo(s[0] + 9 * p, s[1]); g.lineTo(s[0], s[1] + 11 * p); g.lineTo(s[0] - 9 * p, s[1]); g.closePath(); g.stroke(); tx(g, 'CHARGE  ' + Math.hypot(P.x - C.x, P.z - C.z).toFixed(0) + ' m', s[0], s[1] + 22, 12, GOLD, 'center', 800); } }
    for (const E of M.fs) if (E.alive && E.team !== me().team && E.reveal > 0) { const s = toScreen(E.x, E.y + 1.1, E.z); if (s) { g.strokeStyle = FOE; g.lineWidth = 3; g.beginPath(); g.moveTo(s[0], s[1] - 30); g.lineTo(s[0] + 20, s[1]); g.lineTo(s[0], s[1] + 30); g.lineTo(s[0] - 20, s[1]); g.closePath(); g.stroke(); } }   // everyone revealed, not just the nearest
    // the death cam: whoever killed you, marked where they stand
    if (X.deathCam && M.deathInfo) { const D = M.deathInfo, kf = M.byKey[D.key]; if (kf && kf.alive) { const s = toScreen(ipos(kf, 'x'), ipos(kf, 'y') + 2.25, ipos(kf, 'z')); if (s) { const p = .8 + .2 * Math.sin(K.t * 6);
      g.fillStyle = FOE; g.beginPath(); g.moveTo(s[0], s[1] + 14 * p); g.lineTo(s[0] - 10 * p, s[1]); g.lineTo(s[0] + 10 * p, s[1]); g.closePath(); g.fill(); tx(g, D.by.toUpperCase(), s[0], s[1] - 14, 13, FOE, 'center', 900); } } }
    if (M.planted && M.phase === 'live') { const s = toScreen(M.planted.x, M.planted.y + .9, M.planted.z); if (s) { const p = 1 + Math.sin(M.time * 9) * .12; g.fillStyle = FOE; g.beginPath(); g.moveTo(s[0], s[1] - 11 * u * p); g.lineTo(s[0] + 9 * u * p, s[1]); g.lineTo(s[0], s[1] + 11 * u * p); g.lineTo(s[0] - 9 * u * p, s[1]); g.fill(); tx(g, Math.hypot(P.x - M.planted.x, P.z - M.planted.z).toFixed(0) + ' m', s[0], s[1] + 24 * u, 13 * u, BONE); } }
    drawSiteMarks(g, P, u);   // the sites, while you are finding your way
    // your team's pings: a diamond where they marked, with who and how far, pulsing as it lands
    if (M.pings && M.pings.length) for (const pg of M.pings) { const age = M.time - pg.t0; if (age > 4 || pg.team !== me().team) continue; const s = toScreen(pg.x, pg.y + .15, pg.z); if (!s) continue;
      const a = age > 3.4 ? (4 - age) / .6 : 1, pop = 1 + Math.max(0, 1 - age / .35) * .8, r = 9 * u * pop; g.globalAlpha = a;
      g.strokeStyle = YOU; g.lineWidth = 2.5; g.beginPath(); g.moveTo(s[0], s[1] - r); g.lineTo(s[0] + r, s[1]); g.lineTo(s[0], s[1] + r); g.lineTo(s[0] - r, s[1]); g.closePath(); g.stroke();
      g.fillStyle = 'rgba(53,224,200,.25)'; g.fill(); if (age < .8) { g.strokeStyle = `rgba(53,224,200,${1 - age / .8})`; g.beginPath(); g.arc(s[0], s[1], r + age * 40 * u, 0, TAU); g.stroke(); }
      tx(g, `${pg.k === me().key ? 'PING' : pg.name.toUpperCase()}  ·  ${Math.round(Math.hypot(pg.x - P.x, pg.z - P.z))} m`, s[0], s[1] - r - 9 * u, 10.5 * u, YOU, 'center', 800); g.globalAlpha = 1; }
    // --- crosshair and hit marks
    // the crosshair marks where the next shot really goes: it rides up (and sways) with the spray, less the little the view
    // itself nods, and sits a touch lower for the view punch
    const tf = Math.tan((X ? X.camera.fov : BASE_FOV) * D2R / 2), hh = (V.y1 - V.y0) / 2, rc = P.alive && !G.melee && X;
    const cy = 360 + Math.tan((M.camKick || 0) - (rc ? X.xhP || 0 : 0)) / tf * hh, cx = 640 - Math.tan(rc ? X.xhY || 0 : 0) / tf * hh;
    if (P.alive && !(P.scoped && G.scope) && !demo) {
      // shotguns: your own crosshair (whatever you designed) plus the spread ring round it
      if (G.cat === 'Shotgun' && G.pspr) { drawShotgunReticle(g, cx, cy, Math.tan(spreadOf(P) + G.pspr * D2R) / tf * hh, Math.max(1, u * .85)); drawCrosshair(g, cx, cy, 0, Math.max(1, u * .85)); }
      else drawCrosshair(g, cx, cy, Math.tan(spreadOf(P)) / tf * hh, Math.max(1, u * .85));
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
      const sh2 = isTouch();   // (a phone's smallest letters are bigger than these labels were drawn for: shorter words, so the three never run together)
      tx(g, M.phase === 'buy' ? (sh2 ? 'BUY' : 'BUY PHASE') : M.phase === 'end' ? (sh2 ? 'OVER' : 'ROUND OVER') : M.planted ? (sh2 ? 'PLANTED' : 'CHARGE PLANTED') : (sh2 ? 'R' : 'ROUND ') + M.round, 0, 62, 10, M.planted && M.phase === 'live' ? WARN : DIM, 'center', 800);
      const score = (x, n, col, tag) => { g.fillStyle = PANEL; g.fillRect(x - 25, 0, 50, 50); g.fillStyle = col; g.fillRect(x - 25, 0, 50, 3); tx(g, String(n), x, 27, 30, col, 'center', 800); if (tag) tx(g, tag, x, 62, 10, col, 'center', 800); };
      score(-92, M.wins[0], YOU, side === 'att' ? (sh2 ? 'ATK' : 'ATTACK') : (sh2 ? 'DEF' : 'DEFEND')); score(92, M.wins[1], FOE, side === 'att' ? (sh2 ? 'DEF' : 'DEFEND') : (sh2 ? 'ATK' : 'ATTACK'));
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
      { const CP = M.chargePing; if (CP && side === 'att' && M.charge && !M.charge.k && !M.planted && M.time - CP.t0 < 3) { const q = (M.time - CP.t0) / 3; for (let i = 0; i < 2; i++) { const r = (q * 3 + i / 2) % 1; g.strokeStyle = `rgba(255,210,90,${1 - r})`; g.lineWidth = 2; g.beginPath(); g.arc(mx + CP.x * k, my + CP.z * k, (5 + r * 16) * u, 0, TAU); g.stroke(); } } }
      if (M.pings) for (const pg of M.pings) { const age = M.time - pg.t0; if (age > 4 || pg.team !== me().team) continue; g.strokeStyle = `rgba(53,224,200,${1 - age / 4})`; g.lineWidth = 2; g.beginPath(); g.arc(mx + pg.x * k, my + pg.z * k, (4 + (age % 1) * 9) * u, 0, TAU); g.stroke(); g.fillStyle = YOU; g.fillRect(mx + pg.x * k - 2 * u, my + pg.z * k - 2 * u, 4 * u, 4 * u); }   // pings
      if (heard && (heard.t -= 1 / 60) > 0) { g.strokeStyle = `rgba(255,138,61,${heard.t / 1.6})`; g.lineWidth = 2; g.beginPath(); g.arc(mx + heard.x * k, my + heard.z * k, (8 + (1.6 - heard.t) * 8) * u, 0, TAU); g.stroke(); }
      for (const q of M.fs) if (q !== P && q.alive && !q.gone) { const ours = q.team === P.team; if (!ours && !(q.reveal > 0 || canSee(P, q))) continue; g.fillStyle = ours ? YOU : FOE; g.beginPath(); g.arc(mx + q.x * k, my + q.z * k, (ours ? 3.2 : 4) * u, 0, TAU); g.fill(); }   // your teammates, and every rival in sight
      g.save(); g.translate(mx + P.x * k, my + P.z * k); g.rotate(-P.yaw); g.fillStyle = 'rgba(53,224,200,.22)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 30 * u, -Math.PI / 2 - .6, -Math.PI / 2 + .6); g.fill(); g.fillStyle = YOU; g.beginPath(); g.moveTo(0, -7 * u); g.lineTo(5 * u, 5 * u); g.lineTo(-5 * u, 5 * u); g.fill(); g.restore();
      const ar = areaAt(P.x, P.z); if (ar) tx(g, ar.n.toUpperCase(), mx + 4, my + mh + 12 * u, 13 * u, ar.col, 'left'); }
    // --- kill feed, top right
    M.feed.forEach((k, i) => { const w = 250 * u, x = V.x1 - 14 - w, y = V.y0 + (touch ? 58 : 14) * u + i * 30 * u; rr(g, x, y, w, 25 * u, 5, k.mine ? 'rgba(53,224,200,.28)' : 'rgba(255,138,61,.28)'); tx(g, `${k.a}   ${k.w}${k.head ? ' ◎' : ''}   ${k.b}`, x + w - 10 * u, y + 13 * u, 12.5 * u, BONE, 'right'); });
    // --- health, weapon and abilities
    const A = P.ammo[G.k] || { mag: 0, res: 0 }, hpCol = P.hp > 30 ? BONE : WARN;
    if (touch) {   // one strip, bottom centre, clear of both thumbs (a tap on it looks your gun over)
      if (P === me() && P.alive && X && !UI.armory) zone(640 - 205 * u, V.y1 - 10 - 44 * u, 410 * u, 44 * u, () => { if (P.reloadT <= 0 && !(X.inspT > 0)) startInspect(P); });
      g.save(); g.translate(640, V.y1 - 10); g.scale(u, u); rr(g, -205, -44, 410, 44, 8, GLASS);
      tx(g, String(Math.ceil(P.hp)), -186, -22, 28, hpCol, 'left'); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-128, -27, 84, 7); g.fillStyle = hpCol; g.fillRect(-128, -27, 84 * P.hp / 100, 7); if (P.sh) { g.fillStyle = '#7fc8ff'; g.fillRect(-128, -17, 84 * P.sh / 50, 5); }
      tx(g, G.n.toUpperCase(), 0, -22, 15, G.col); tx(g, G.melee ? '—' : `${A.mag} / ${A.res}`, 186, -22, 24, A.mag || G.melee ? BONE : WARN, 'right'); if (carries(P) && !M.planted) tx(g, '◆ YOU CARRY THE CHARGE', 0, canBuy() ? -84 : -54, 12, GOLD, 'center', 900); g.restore();   // above the credits while you can still buy
    } else {
      g.save(); g.translate(V.x0 + 22, V.y1 - 20); g.scale(u, u); rr(g, 0, -58, 250, 58, 8, GLASS);
      tx(g, String(Math.ceil(P.hp)), 18, -28, 40, hpCol, 'left'); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(104, -36, 128, 8); g.fillStyle = hpCol; g.fillRect(104, -36, 128 * P.hp / 100, 8);
      if (P.sh) { g.fillStyle = '#7fc8ff'; g.fillRect(104, -22, 128 * P.sh / 50, 6); tx(g, String(P.sh), 104 + 128 * P.sh / 50 + 6, -19, 11, '#7fc8ff', 'left'); }
      // the abilities, the way the genre lays them out: C and Q (bought, their charges as pips), E (the signature, free each
      // round; some come back, the wait shown round it), X (the ultimate, its points round a ring). The readied one lifts and glows.
      const op = OPS[P.op], slot = (key, k, x, w) => { const ult = k === 'x', n = ult ? 0 : P.ab[k] | 0, c2 = ultCost(P), pts = Math.min(c2, P.ult | 0), have = ult ? pts >= c2 : n > 0 || (k === 'c' && (!!P.tether || !!irisEye(P))), on = have && M.mode !== 'demo', rdy = P.rdy === k, lift = rdy ? -7 : 0, A = ult ? op.x : op[k];
        const pulse = (ult && have) || rdy ? .55 + .45 * Math.sin(K.t * (rdy ? 9 : 5)) : 0;
        g.save(); g.translate(0, lift); rr(g, x, -62, w, 62, 8, rdy ? 'rgba(20,24,34,.92)' : on ? GLASS : 'rgba(12,16,22,.4)', on ? op.col : 'rgba(255,255,255,.12)', rdy ? 2.5 + pulse * 1.5 : ult && have ? 2 + pulse * 2 : 1.5);
        if (rdy) { const gr = g.createLinearGradient(0, -62, 0, 0); gr.addColorStop(0, op.col + '00'); gr.addColorStop(1, op.col + '55'); g.fillStyle = gr; g.fillRect(x + 2, -60, w - 4, 58); }
        abIcon(g, ABICON[P.op + k] || 'orb', x + w / 2, -40, 13, on ? (rdy ? '#ffffff' : BONE) : '#5a6272', on ? op.col : '#3c4250');
        if (ult) for (let q = 0; q < c2; q++) { const a0 = -Math.PI / 2 + q * TAU / c2 + .1, a1 = -Math.PI / 2 + (q + 1) * TAU / c2 - .1; g.strokeStyle = q < pts ? op.col : 'rgba(255,255,255,.18)'; g.lineWidth = 3.5; g.beginPath(); g.arc(x + w / 2, -40, 19, a0, a1); g.stroke(); }
        if (k === 'e' && !n) { const E = op.e, q = E.rech ? (P.eT || 0) / E.rech : E.kills ? (P.eK | 0) / E.kills : 0; if (q > 0) { g.strokeStyle = op.col; g.lineWidth = 3; g.beginPath(); g.arc(x + w / 2, -40, 18, -Math.PI / 2, -Math.PI / 2 + TAU * q); g.stroke(); } }
        // the key, and the charges
        rr(g, x + 5, -19, 15, 14, 3, on ? op.col : 'rgba(255,255,255,.12)'); tx(g, key, x + 12.5, -12, 10, on ? INK : '#5a6272', 'center', 900);
        if (!ult && k !== 'e') { const mx = A.max; for (let c = 0; c < mx; c++) { g.fillStyle = c < n ? op.col : 'rgba(255,255,255,.18)'; g.fillRect(x + w - 8 - (mx - c) * 9, -15, 7, 7); } }
        if (ult) tx(g, have ? 'READY' : `${pts}/${c2}`, x + w - 6, -12, 9.5, have ? op.col : '#5a6272', 'right', 900);
        if (rdy) tx(g, A.n.toUpperCase(), x + w / 2, -74, 11, op.col, 'center', 900);
        g.restore(); };
      slot(keyLabel('abc'), 'c', 262, 70); slot(keyLabel('abq'), 'q', 338, 70); slot(keyLabel('abe'), 'e', 414, 70); slot(keyLabel('abx'), 'x', 490, 78);
      if (P.rdy) { const K2 = isTouch() ? 'FIRE' : 'CLICK', A = P.rdy === 'x' ? op.x : op[P.rdy]; tx(g, `${K2} TO USE  ·  ${isTouch() ? 'ALT' : 'RIGHT CLICK'}: ${ABALT[P.op + P.rdy] || 'THE SAME'}  ·  ${P.rdy.toUpperCase()} TO PUT AWAY`, 400, -96, 10, BONE, 'center', 800); }
      if (P.smokes > 0) { const x = 578, on = P.smokes > 0; rr(g, x, -58, 86, 58, 8, on ? GLASS : 'rgba(12,16,22,.4)', on ? NADE.col : 'rgba(255,255,255,.12)'); tx(g, 'SMOKE ×' + (P.smokes || 0), x + 43, -38, 14, on ? BONE : '#5a6272'); tx(g, 'G', x + 43, -16, 12, on ? NADE.col : '#5a6272'); }
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
    // (out of the live round the gun's own label in the world says PICK UP: no second line under the round-end cards)
    // --- the charge: what to do, and how far along
    const ring = (frac, label, col) => { const y = 470; g.strokeStyle = 'rgba(12,16,22,.7)'; g.lineWidth = 12 * u; g.beginPath(); g.arc(640, y, 34 * u, 0, TAU); g.stroke(); g.strokeStyle = col; g.lineWidth = 7 * u; g.beginPath(); g.arc(640, y, 34 * u, -Math.PI / 2, -Math.PI / 2 + TAU * frac); g.stroke(); tx(g, label, 640, y + 60 * u, 15 * u, col); };
    if (P.reloadT > 0) tx(g, 'RELOADING', 640, 420, 15 * u, GOLD);
    if (M.phase === 'live' && P.alive && !range && !demo) {
      const near = M.planted && Math.hypot(P.x - M.planted.x, P.z - M.planted.z) < 1.7, key = touch ? 'Hold the button' : 'Hold F';
      if (P.orbT > 0) ring(P.orbT / ORB.take, 'ULT ORB', OPS[P.op].col);
      else if (M.orbs && M.orbs.some(o => !o.taken && Math.hypot(o.x - P.x, o.z - P.z) < ORB.r)) hint(g, (touch ? 'Hold' : 'Hold F') + ': ult point', V.y0 + 140 * u, 16 * u, OPS[P.op].col);
      if (P.plant > 0) ring(P.plant / PLANT_T, 'PLANTING', FOE); else if (P.defuse > 0) ring(P.defuse / DEFUSE_T, P.defuse >= DEFUSE_T / 2 ? 'DEFUSING  ·  HALF SAVED' : 'DEFUSING', YOU);
      else if (side === 'att' && !M.planted && M.charge && !carries(P)) { const c = carrier();
        if (c) { if (M.t > roundT() - 6 || onSite(P.x, P.z)) hint(g, c.name.toUpperCase() + ' HAS THE CHARGE' + (onSite(P.x, P.z) ? '  ·  COVER' : ''), V.y0 + 104 * u, 16 * u, 'rgba(239,233,220,.75)'); }
        else hint(g, 'CHARGE DROPPED  ·  WALK OVER IT', V.y0 + 104 * u, 16 * u, GOLD); }
      else if (side === 'att' && !M.planted) { if (onSite(P.x, P.z)) onSiteHint(g, 'ABC'[siteAt(P.x, P.z)], key, V.y0 + 104 * u, u); else hint(g, M.t > roundT() - 6 ? (twoSites() ? 'Plant on ' + siteWords() : 'Plant on the site') : '', V.y0 + 104 * u, 16 * u, 'rgba(239,233,220,.75)'); }
      else if (side === 'def' && M.planted) hint(g, (near ? key + ': defuse' : 'Defuse') + (M.planted.half ? '  ·  HALF DONE' : ''), V.y0 + 104 * u, 16 * u, near ? GOLD : 'rgba(239,233,220,.75)');
      else if (side === 'def' && M.t > roundT() - 6) hint(g, twoSites() ? 'Hold ' + siteWords('and') : 'Stop the plant', V.y0 + 104 * u, 16 * u, 'rgba(239,233,220,.75)');
      if (M.fs.some(q => q.team !== P.team && q.alive && q.defuse > 0)) tx(g, M.fs.length > 2 ? 'THEY ARE DEFUSING' : 'YOUR RIVAL IS DEFUSING', 640, 250, 20 * u, WARN);   // any of them, not just the nearest
      if (P.nearLoot && GUNS[P.nearLoot.k]) hint(g, `${touch ? 'PICK UP' : 'F'}: ${lootFree(P) ? '' : 'swap for '}${GUNS[P.nearLoot.k].n}`, V.y0 + 172 * u, 15 * u, GOLD);
      if (GATES.length && P.plant <= 0 && P.defuse <= 0) { const gi = gateNear(P); if (gi >= 0) hint(g, (touch ? 'Tap' : 'F') + (GATES[gi].open ? ': shut door' : ': open door'), V.y0 + 140 * u, 16 * u, GOLD); }
    }
    // --- Tessel: the dormant device under the crosshair, and whether it can be fired; or a device of yours to pick up or reinforce
    if (P === me() && P.alive && (M.phase === 'live' || M.phase === 'buy') && !demo && !UI.armory) {
      const hy = M.phase === 'buy' ? 470 : V.y0 + 206 * u, st = P.op === 'tessel' ? tesselState(P) : null;   // (in the buy phase, under the crosshair: the round's banner is above it)
      if (st) { const D = tesselLook(P), nm = D.k === 'q' ? 'LULL' : 'LIGHTLINE', live = M.phase === 'live';
        hint(g, !live ? nm + '  ·  FIRES ONCE THE ROUND IS LIVE' : st === 'ok' ? (touch ? 'TRIGGER' : keyLabel('trig')) + ' · TRIGGER ' + nm : st === 'far' ? nm + '  ·  TOO FAR: WITHIN 20 m' : nm + '  ·  NO CLEAR SIGHT', hy, 16 * u, live && st === 'ok' ? OPS.tessel.col : live ? WARN : DIM); }
      else { const h = kitAltHint(P, k => touch ? k.toUpperCase() : keyLabel('ab' + k)); if (h) hint(g, h, hy, 15 * u, OPS[P.op].col); }
    }
    // --- banners
    if (TOAST) { const t = (performance.now() - TOAST.at) / 1000; if (t > 4) TOAST = null; else { g.globalAlpha = cl(Math.min(t * 4, (4 - t) * 2), 0, 1); rr(g, 640 - 230 * u, V.y0 + 64 * u, 460 * u, 34 * u, 8, 'rgba(12,16,22,.85)', GOLD, 1.5); tx(g, TOAST.s, 640, V.y0 + 81 * u, 15 * u, BONE); g.globalAlpha = 1; } }
    if (M.say) { const a = Math.min(1, M.say.t * 5, (2.6 - M.say.t) * 3); g.globalAlpha = cl(a, 0, 1); tx(g, M.say.s, 640, 170, 30 * u, M.say.c); g.globalAlpha = 1; }
    // the connection: yours dropped (the game keeps going while it gets back in), or someone else's
    if (M.online && (M.dropped || MP.rejoining)) { const p = .6 + .4 * Math.sin(K.t * 6); rr(g, 640 - 170 * u, 118 * u, 340 * u, 34 * u, 8, 'rgba(12,16,22,.85)', GOLD, 1.5); tx(g, 'CONNECTION LOST · RECONNECTING', 640, 135 * u, 14 * u, GOLD, 'center', 900); g.globalAlpha = 1; void p; }
    else if (M.online) { const dc = M.fs.find(f => f.dc && !f.gone); if (dc) { const left = Math.max(0, Math.ceil(DC_WAIT - (M.time - dc.dc))); tx(g, `${dc.name.toUpperCase()} LOST CONNECTION · WAITING ${left} s`, 640, 135 * u, 14 * u, GOLD, 'center', 900); } }
    if (M.phase === 'end' && M.last && !M.over) drawRoundEnd(g, V, u, demo);   // (93-after: the result, and your team's round)
    if (M.phase === 'buy' && !UI.armory && !range && !UI.switched) { const ty = Math.max(200, V.y0 + 132 * u + tapH(46) + 34 * u); { const ot = otRound(M.round), mp = !ot && Math.max(...M.wins) === WIN_ROUNDS - 1; tx(g, pistolRound(M.round) ? 'PISTOL ROUND' : suddenDeath(M.round) ? 'SUDDEN DEATH' : ot ? 'OVERTIME ' + ot : mp ? 'MATCH POINT' : 'ROUND ' + M.round, 640, ty, 34 * u, ot || mp ? GOLD : BONE); } tx(g, side === 'att' ? (twoSites() ? 'ATTACK  ·  ' + siteWords() : 'ATTACK') : (twoSites() ? 'DEFEND  ·  ' + siteWords('and') : 'DEFEND'), 640, ty + 36 * u, 16 * u, side === 'att' ? FOE : YOU); }
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
      tx(g, b.t, b.x, b.y, Math.min((b.k === 'fire' || b.k === 'use' ? 17 : b.t.length > 5 ? 10.5 : 12.5) * u * Math.max(.75, Math.min(1.35, b.r / ((b.k === 'fire' ? 62 : b.k === 'use' ? 58 : 37) * u))), b.r * 2.6 / Math.max(3, b.t.length)), b.off ? '#5a6272' : BONE);
    }
    if (TS.stick) {
      const s = TS.stick, ss = touchSize('move'), dx = s.x - s.x0, dy = s.y - s.y0, L = Math.min(96 * u * ss, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
      g.strokeStyle = 'rgba(239,233,220,.4)'; g.lineWidth = 3 * u; g.beginPath(); g.arc(s.x0, s.y0, 65 * u * ss, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(239,233,220,.5)'; g.beginPath(); g.arc(s.x0 + Math.cos(a) * L, s.y0 + Math.sin(a) * L, 27 * u * ss, 0, TAU); g.fill();
    }
    else if (me().alive) { const x = V.x0 + 170 * u, y = V.y1 - 150 * u, ss = touchSize('move'); g.setLineDash([6 * u, 8 * u]); g.strokeStyle = 'rgba(239,233,220,.3)'; g.lineWidth = 2 * u; g.beginPath(); g.arc(x, y, 62 * u * ss, 0, TAU); g.stroke(); g.setLineDash([]); tx(g, 'MOVE', x, y, 13 * u, 'rgba(239,233,220,.45)'); tx(g, 'push far to sprint', x, y + (20 + 62 * ss) * u, 11 * u, 'rgba(239,233,220,.35)'); }
  }
