  /* ---------- 92 hud: everything on screen during a round ----------
     Drawn on the kit's 2D canvas, in its 1280 by 720 units (K.view is the part of that the screen shows). Each cluster
     hangs off a corner or the centre and is scaled by uiScale(), so one layout serves a monitor and a phone.
     Also here: the small drawing helpers every screen uses, and the crosshair, which the player designs in settings. */
  const FONT = '"Chakra Petch", system-ui, sans-serif', GLASS = 'rgba(12,16,22,.78)';
  // no text is ever drawn smaller than MIN_PX on the real screen, whatever scale the layout is at
  const fitPx = (g, px) => { const k = g.getTransform().a * innerWidth / g.canvas.width, min = isTouch() ? 10.5 : 9; return px * k < min ? min / k : px; };
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
  const XH_PRESETS = [
    { n: 'Classic', shape: 'cross', col: '#35e0c8', len: 9, gap: 3, thick: 3, dot: true, outline: true, dyn: true },
    { n: 'Tight', shape: 'cross', col: '#ffffff', len: 5, gap: 2, thick: 2, dot: false, outline: true, dyn: false },
    { n: 'Dot', shape: 'dot', col: '#7dff9a', len: 0, gap: 0, thick: 5, dot: true, outline: true, dyn: false },
    { n: 'Ring', shape: 'circle', col: '#ffd23f', len: 0, gap: 7, thick: 2, dot: true, outline: false, dyn: true },
    { n: 'Tee', shape: 'tee', col: '#ff8a3d', len: 10, gap: 4, thick: 3, dot: false, outline: true, dyn: true },
  ];
  const XH_COLS = ['#35e0c8', '#7dff9a', '#ffffff', '#ffd23f', '#ff8a3d', '#ff5a8a', '#6fb8ff', '#c58cff'];
  // the crosshair, centred on x,y: err is the extra gap (in HUD units) that your current inaccuracy opens it by
  function drawCrosshair(g, x, y, err, k = 1) {
    const c = CFG.xh, th = Math.max(1, c.thick * k), gap = c.gap * k + (c.dyn ? err : 0), len = c.len * k, o = c.outline ? 1.5 : 0;
    const arm = (ax, ay, w, h) => { if (o) { g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(ax - o, ay - o, w + o * 2, h + o * 2); } g.fillStyle = c.col; g.fillRect(ax, ay, w, h); };
    if (c.shape === 'circle') { const r = gap + 4 * k; if (o) { g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = th + o * 2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); } g.strokeStyle = c.col; g.lineWidth = th; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }
    else if (c.shape !== 'dot' && len > 0) {
      if (o) { g.fillStyle = 'rgba(0,0,0,.75)'; for (const [ax, ay, w, h] of [[x - gap - len, y - th / 2, len, th], [x + gap, y - th / 2, len, th], [x - th / 2, y + gap, th, len]].concat(c.shape === 'tee' ? [] : [[x - th / 2, y - gap - len, th, len]])) g.fillRect(ax - o, ay - o, w + o * 2, h + o * 2); }
      g.fillStyle = c.col; g.fillRect(x - gap - len, y - th / 2, len, th); g.fillRect(x + gap, y - th / 2, len, th); g.fillRect(x - th / 2, y + gap, th, len); if (c.shape !== 'tee') g.fillRect(x - th / 2, y - gap - len, th, len);
    }
    if (c.dot || c.shape === 'dot') { const d = c.shape === 'dot' ? th * 1.2 : Math.max(2, th * .8); arm(x - d / 2, y - d / 2, d, d); }
  }

  let hitMark = null, heard = null, mmCanvas = null;
  on('hurt', (v, by, dmg, head) => { if (M && by === me()) hitMark = { t: head ? .5 : .28, head, dmg, kill: v.hp <= 0 && !v.net, x: rnd(-14, 14) }; });
  on('kill', (v, by) => { if (M && by === me() && hitMark) hitMark.kill = true; });
  // the kill banner, bottom centre: the emblem of the skin you have equipped (a skull until you own one) bursts in,
  // with a pip for each kill in your run, then fades
  let banner = null;
  on('kill', (v, by, head) => { if (M && by === me() && v !== me() && M.mode !== 'demo') banner = { t0: performance.now(), n: killRun, head, name: v.name, em: killEmblem() }; });
  on('round', n => { if (n === 1) banner = null; });
  const killEmblem = () => ({ shape: 'skull', col: BONE, glow: YOU });
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
  const note = f => { if (M && f === foe() && Math.hypot(f.x - me().x, f.z - me().z) < 30) heard = { x: f.x, z: f.z, t: 1.6 }; };
  on('step', note); on('shot', (f, S, first) => { if (first && !gun(f).sil) note(f); });
  function resetMini() { mmCanvas = null; }
  function miniMap() {
    if (mmCanvas) return mmCanvas; const s = 8, c = mmCanvas = document.createElement('canvas'); c.width = GW * s; c.height = GH * s; const g = c.getContext('2d');
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const ch = SRC[j][i]; g.fillStyle = ch === '#' ? 'rgba(12,16,22,.9)' : ch === '~' ? 'rgba(53,150,170,.8)' : ch === 'X' ? 'rgba(70,80,96,.95)' : ch === 'c' ? 'rgba(150,120,84,.95)' : ch === 'o' || ch === 'q' ? 'rgba(255,138,61,.4)' : ch === 'P' || ch === '7' || ch === '8' ? 'rgba(190,190,180,.75)' : 'rgba(210,205,190,.5)'; g.fillRect(i * s, j * s, s, s); }
    return c;
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
    tx(g, MAP.n.toUpperCase(), x0 + 22 * u, V.y0 + 140 * u, 86 * u, BONE, 'left', 900);
    tx(g, MAP.tag || TAGS[MAP.k] || '', x0 + 26 * u, V.y0 + 196 * u, 16 * u, '#c9cfd8', 'left', 600);
    const chips = [two ? 'TWO SITES' : 'ONE SITE', M.fs.length > 2 ? '2V2' : '1V1', 'FIRST TO ' + WIN_ROUNDS];
    let cx = x0 + 26 * u; for (const c of chips) { g.font = `800 ${12 * u}px ${FONT}`; const w = g.measureText(c).width + 22 * u; rr(g, cx, V.y0 + 222 * u, w, 26 * u, 4, 'rgba(239,233,220,.1)', 'rgba(239,233,220,.25)', 1); tx(g, c, cx + w / 2, V.y0 + 235 * u, 12 * u, BONE, 'center', 800); cx += w + 8 * u; }
    tx(g, side === 'att' ? 'YOU ATTACK FIRST' : 'YOU DEFEND FIRST', x0 + 26 * u, V.y0 + 282 * u, 22 * u, side === 'att' ? FOE : YOU, 'left', 900);
    tx(g, side === 'att' ? (two ? 'Plant the charge on site A or B' : 'Plant the charge on the site') : (two ? 'Hold both sites. Stop the plant, or defuse it' : 'Stop the plant, or defuse it'), x0 + 26 * u, V.y0 + 308 * u, 14 * u, '#c9cfd8', 'left', 600);
    // the plan of the map, with the sites marked
    { const mw = 230 * u, mh = mw * GH / GW, mx = x0 + 26 * u, my = V.y0 + 332 * u, kk = mw / MW; g.globalAlpha = ease * .92; g.drawImage(miniMap(), mx, my, mw, mh); g.globalAlpha = ease; g.strokeStyle = 'rgba(239,233,220,.3)'; g.lineWidth = 1.5; g.strokeRect(mx, my, mw, mh);
      for (const S of SITES) tx(g, two ? S.k : '◆', mx + S.c[0] * kk, my + S.c[1] * kk, 16 * u, '#ffb070', 'center', 900);
      const sp = SPAWN[side][0]; if (sp) { g.fillStyle = side === 'att' ? FOE : YOU; g.beginPath(); g.arc(mx + sp[0] * kk, my + sp[1] * kk, 5 * u, 0, TAU); g.fill(); tx(g, 'YOU', mx + sp[0] * kk, my + sp[1] * kk - 12 * u, 10 * u, BONE, 'center', 800); } }
    g.restore();
    // the players: a card each
    const mine = M.fs.filter(q => q.team === P.team).sort((a, b) => (b === P) - (a === P)), theirs = M.fs.filter(q => q.team !== P.team);
    const cw = Math.min(250 * u, (W - 160 * u) / 4), ch = 74 * u, y = V.y1 - ch - 40 * u;
    const card = (q, x, col, i) => {
      const a = smooth(cl((rt - .35 - i * .12) / .4, 0, 1)); g.save(); g.globalAlpha = a; g.translate(0, (1 - a) * 30 * u);
      rr(g, x, y, cw, ch, 6, 'rgba(12,16,22,.88)', q === P ? 'rgba(239,233,220,.6)' : 'rgba(239,233,220,.14)', q === P ? 2 : 1); g.fillStyle = col; g.fillRect(x, y, 5 * u, ch);
      portraitTile(g, q.op, x + 8 * u, y + 6 * u, 56 * u, ch - 12 * u, { r: 4 });
      tx(g, q.name.toUpperCase(), x + 74 * u, y + 24 * u, 16 * u, BONE, 'left', 800); tx(g, (OPS[q.op] || OPS.vex).n, x + 74 * u, y + 44 * u, 11 * u, (OPS[q.op] || OPS.vex).col, 'left', 800);
      if (q.rating) { rankBadge(g, x + cw - 24 * u, y + 28 * u, 13 * u, q.rating); tx(g, rankName(q.rating).toUpperCase(), x + cw - 42 * u, y + 24 * u, 11 * u, RANK_COL[diffFor(q.rating).i], 'right', 800); tx(g, String(q.rating), x + cw - 42 * u, y + 42 * u, 13 * u, BONE, 'right', 700); }
      else tx(g, '—', x + cw - 24 * u, y + 30 * u, 14 * u, DIM, 'center');
      tx(g, q.bot ? 'BOT' : q.net && !q.isBot ? 'PLAYER' : q === P ? 'YOU' : 'BOT', x + 74 * u, y + 60 * u, 10 * u, DIM, 'left', 800);
      g.restore();
    };
    mine.forEach((q, i) => card(q, V.x0 + 40 * u + i * (cw + 10 * u), YOU, i)); theirs.forEach((q, i) => card(q, V.x1 - 40 * u - (i + 1) * (cw + 10 * u) + 10 * u, FOE, i + 1));
    tx(g, 'VS', 640, y + ch / 2, 26 * u, 'rgba(239,233,220,.55)', 'center', 900);
    // progress
    g.fillStyle = 'rgba(239,233,220,.12)'; g.fillRect(V.x0, V.y1 - 6 * u, W, 6 * u); g.fillStyle = acc; g.fillRect(V.x0, V.y1 - 6 * u, W * k, 6 * u);
    if (!M.online) tx(g, isTouch() ? 'Tap to skip' : 'Click to skip', V.x1 - 24 * u, V.y1 - 22 * u, 11 * u, DIM, 'right', 700);
  }
  // ---- switching sides: a band across the screen at the start of the second half (and the decider) says which side you are now
  function drawSwitch(g) {
    const S = UI.switched; if (!S) return; const t = (performance.now() - S.t0) / 1000; if (t > 3.2) { UI.switched = null; return; }
    const V = K.view, u = uiScale(), W = V.x1 - V.x0, a = t < .25 ? smooth(t / .25) : t > 2.8 ? 1 - (t - 2.8) / .4 : 1, col = S.side === 'att' ? FOE : YOU, cy = 330;
    g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(8,10,14,.86)'; g.fillRect(V.x0, cy - 78 * u, W, 156 * u); g.fillStyle = col; g.fillRect(V.x0, cy - 78 * u, W, 4 * u); g.fillRect(V.x0, cy + 74 * u, W, 4 * u);
    const sw = (t * 260 * u) % (80 * u); for (let i = -2; i < W / (80 * u) + 2; i++) { const x = V.x0 + i * 80 * u + sw; g.fillStyle = 'rgba(239,233,220,.05)'; g.beginPath(); g.moveTo(x, cy - 74 * u); g.lineTo(x + 30 * u, cy - 74 * u); g.lineTo(x + 70 * u, cy); g.lineTo(x + 30 * u, cy + 74 * u); g.lineTo(x, cy + 74 * u); g.lineTo(x + 40 * u, cy); g.closePath(); g.fill(); }
    tx(g, S.decider ? 'DECIDER' : 'SWITCHING SIDES', 640, cy - 34 * u, 20 * u, DIM, 'center', 900);
    tx(g, S.side === 'att' ? 'YOU NOW ATTACK' : 'YOU NOW DEFEND', 640, cy + 12 * u, 54 * u, col, 'center', 900);
    tx(g, S.side === 'att' ? (SITES.length > 1 ? 'Take the charge to A or B' : 'Take the charge to the site') : 'Hold them off, or defuse the charge', 640, cy + 52 * u, 15 * u, BONE, 'center', 700);
    g.restore();
  }
  function drawHud(g) {
    if (loadingNow()) return drawLoading(g);
    const P = me(), F = foe(), G = gun(P), V = K.view, u = uiScale(), touch = isTouch(), side = sideOf(P), W = V.x1 - V.x0, H = V.y1 - V.y0, range = M.mode === 'range', demo = M.mode === 'demo';
    // --- over the whole view: scope, flash, the red of being hit
    if (P.scoped && G.scope && P.alive) { const r = Math.min(H * .46, 330); g.fillStyle = '#000'; g.beginPath(); g.rect(V.x0, V.y0, W, H); g.arc(640, 360, r, 0, TAU, true); g.fill(); g.strokeStyle = 'rgba(0,0,0,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(640 - r, 360); g.lineTo(640 + r, 360); g.moveTo(640, 360 - r); g.lineTo(640, 360 + r); g.stroke(); g.fillStyle = WARN; g.fillRect(639, 359, 2, 2); }
    if (P.flash > 0) { g.fillStyle = `rgba(255,255,255,${cl(P.flash / 1.2, 0, 1)})`; g.fillRect(V.x0, V.y0, W, H); }
    if (M.hurt > 0) { const gr = g.createRadialGradient(640, 360, H * .35, 640, 360, H * .8); gr.addColorStop(0, 'rgba(255,60,50,0)'); gr.addColorStop(1, `rgba(255,60,50,${M.hurt * .5})`); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, H);
      const a = M.hurtDir - P.yaw + Math.PI; g.save(); g.translate(640, 360); g.rotate(-a); g.fillStyle = `rgba(255,90,77,${M.hurt * .8})`; g.beginPath(); g.arc(0, 0, 150 * u, Math.PI * 1.36, Math.PI * 1.64); g.arc(0, 0, 134 * u, Math.PI * 1.64, Math.PI * 1.36, true); g.fill(); g.restore(); }
    // --- markers in the world: a pinged rival, the planted charge
    // teammates: a name and a marker over each, and their health
    for (const q of M.fs) if (q !== P && q.team === P.team && q.alive) { const s = toScreen(q.x, q.y + 2.05, q.z); if (s) { g.fillStyle = YOU; g.beginPath(); g.moveTo(s[0] - 7, s[1] - 10); g.lineTo(s[0] + 7, s[1] - 10); g.lineTo(s[0], s[1]); g.closePath(); g.fill(); tx(g, `${q.name.toUpperCase()} ${Math.ceil(q.hp)}`, s[0], s[1] - 20, 13, YOU, 'center', 800); } }
    if (F.alive && F.reveal > 0) { const s = toScreen(F.x, F.y + 1.1, F.z); if (s) { g.strokeStyle = FOE; g.lineWidth = 3; g.beginPath(); g.moveTo(s[0], s[1] - 30); g.lineTo(s[0] + 20, s[1]); g.lineTo(s[0], s[1] + 30); g.lineTo(s[0] - 20, s[1]); g.closePath(); g.stroke(); } }
    if (M.planted && M.phase === 'live') { const s = toScreen(M.planted.x, M.planted.y + .9, M.planted.z); if (s) { const p = 1 + Math.sin(M.time * 9) * .12; g.fillStyle = FOE; g.beginPath(); g.moveTo(s[0], s[1] - 11 * u * p); g.lineTo(s[0] + 9 * u * p, s[1]); g.lineTo(s[0], s[1] + 11 * u * p); g.lineTo(s[0] - 9 * u * p, s[1]); g.fill(); tx(g, Math.hypot(P.x - M.planted.x, P.z - M.planted.z).toFixed(0) + ' m', s[0], s[1] + 24 * u, 13 * u, BONE); } }
    // --- crosshair and hit marks
    // the crosshair marks where a shot really goes: the view punch lifts the camera a little, so it sits that much lower
    const tf = Math.tan((X ? X.camera.fov : BASE_FOV) * D2R / 2), hh = (V.y1 - V.y0) / 2, cy = 360 + Math.tan(M.camKick || 0) / tf * hh;
    if (P.alive && !(P.scoped && G.scope) && !demo) drawCrosshair(g, 640, cy, Math.tan(spreadOf(P)) / tf * hh, Math.max(1, u * .85));
    // no hit marks over the crosshair; the range alone shows the damage each shot did
    if (hitMark && (hitMark.t -= 1 / 60) > 0 && range) tx(g, String(hitMark.dmg), 640 + 44 * u + hitMark.x, cy - 30 * u - (1 - Math.min(1, hitMark.t / .28)) * 16, 20 * u, hitMark.head ? GOLD : '#fff');
    drawBanner(g, V, u); drawSwitch(g);
    // --- dazed, snared, surging, shrouded: the whole view says so
    { const ring = (col, a, inner) => { const gr = g.createRadialGradient(640, 360, H * inner, 640, 360, H * .85); gr.addColorStop(0, col.replace('A', '0')); gr.addColorStop(1, col.replace('A', String(a))); g.fillStyle = gr; g.fillRect(V.x0, V.y0, W, H); };
      if (P.daze > 0) ring('rgba(255,225,77,A)', .32 * Math.min(1, P.daze / .6), .3);
      if (P.snare > 0) { ring('rgba(123,214,90,A)', .34 * Math.min(1, P.snare / .6), .35); tx(g, 'SNARED', 640, 470, 15 * u, '#9dff6b', 'center', 900); }
      if (P.cloak > 0) { g.fillStyle = 'rgba(120,140,200,.1)'; g.fillRect(V.x0, V.y0, W, H); ring('rgba(169,184,255,A)', .3, .4); tx(g, 'SHROUDED', 640, 470, 15 * u, '#c9d2ff', 'center', 900); g.fillStyle = 'rgba(169,184,255,.8)'; g.fillRect(640 - 50 * u, 482 * u / u + 4, 100 * u * P.cloak / 5, 3 * u); }
      if (P.surge > 0) { g.save(); g.translate(640, 360); g.strokeStyle = `rgba(255,236,150,${.16 * Math.min(1, P.surge / .5)})`; g.lineWidth = 2; for (let i = 0; i < 26; i++) { const a = i / 26 * TAU + (i * 7.3), r0 = H * (.42 + ((X ? X.t : 0) * 1.7 + i * .37) % .3); g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * (r0 + 60 * u), Math.sin(a) * (r0 + 60 * u)); g.stroke(); } g.restore(); } }
    // --- top: the clock in the middle, round wins either side of it, then a tile for every fighter: your team to the left,
    // the rivals to the right. A tile is lit while they stand and goes grey with a skull once they are down; your
    // teammates' tiles carry their health
    g.save(); g.translate(640, V.y0 + 8); g.scale(u, u);
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
        const w = 44, h = 50, up = q.alive;
        portraitTile(g, q.op, x - w / 2, 0, w, h, { dead: !up, bar: col, r: 3, on: q === P && up });
        if (ours && up) { g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x - w / 2, h + 3, w, 4); g.fillStyle = q.hp > 30 ? BONE : WARN; g.fillRect(x - w / 2, h + 3, w * cl(q.hp / 100, 0, 1), 4); }
      };
      mine.forEach((q, i) => tile(q, -147 - i * 48, YOU, true)); theirs.forEach((q, i) => tile(q, 147 + i * 48, FOE, false));
    } else { rr(g, -210, 0, 420, 44, 8, GLASS); tx(g, 'RANGE', -190, 22, 18, GOLD, 'left'); tx(g, `${P.stat.hits} hits / ${P.stat.shots} shots` + (P.stat.shots ? `  ·  ${Math.round(100 * P.stat.hits / P.stat.shots)}%` : ''), 190, 22, 14, BONE, 'right'); }
    g.restore();
    // --- minimap, top left (beside the kit's pause button)
    { const mw = 200 * u, mh = mw * GH / GW, mx = V.x0 + 62 / pxPer(), my = V.y0 + 10, k = mw / MW;
      g.globalAlpha = .9; g.drawImage(miniMap(), mx, my, mw, mh); g.globalAlpha = 1; g.strokeStyle = 'rgba(239,233,220,.3)'; g.lineWidth = 1.5; g.strokeRect(mx, my, mw, mh);
      if (SITES.length > 1) for (const S of SITES) tx(g, S.k, mx + S.c[0] * k, my + S.c[1] * k, 14 * u, '#ffb070', 'center', 900);
      if (M.planted) { g.fillStyle = WARN; g.beginPath(); g.arc(mx + M.planted.x * k, my + M.planted.z * k, 4.5 * u, 0, TAU); g.fill(); }
      if (heard && (heard.t -= 1 / 60) > 0) { g.strokeStyle = `rgba(255,138,61,${heard.t / 1.6})`; g.lineWidth = 2; g.beginPath(); g.arc(mx + heard.x * k, my + heard.z * k, (8 + (1.6 - heard.t) * 8) * u, 0, TAU); g.stroke(); }
      if (F.alive && (F.reveal > 0 || canSee(P, F))) { g.fillStyle = FOE; g.beginPath(); g.arc(mx + F.x * k, my + F.z * k, 4 * u, 0, TAU); g.fill(); }
      g.save(); g.translate(mx + P.x * k, my + P.z * k); g.rotate(-P.yaw); g.fillStyle = 'rgba(53,224,200,.22)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 30 * u, -Math.PI / 2 - .6, -Math.PI / 2 + .6); g.fill(); g.fillStyle = YOU; g.beginPath(); g.moveTo(0, -7 * u); g.lineTo(5 * u, 5 * u); g.lineTo(-5 * u, 5 * u); g.fill(); g.restore();
      const ar = areaAt(P.x, P.z); if (ar) tx(g, ar.n.toUpperCase(), mx + 4, my + mh + 12 * u, 13 * u, ar.col, 'left'); }
    // --- kill feed, top right
    M.feed.forEach((k, i) => { const w = 250 * u, x = V.x1 - 14 - w, y = V.y0 + (touch ? 58 : 14) * u + i * 30 * u; rr(g, x, y, w, 25 * u, 5, k.mine ? 'rgba(53,224,200,.28)' : 'rgba(255,138,61,.28)'); tx(g, `${k.a}   ${k.w}${k.head ? ' ◎' : ''}   ${k.b}`, x + w - 10 * u, y + 13 * u, 12.5 * u, BONE, 'right'); });
    // --- health, weapon and abilities
    const A = P.ammo[G.k] || { mag: 0, res: 0 }, hpCol = P.hp > 30 ? BONE : WARN;
    if (touch) {   // one strip, bottom centre, clear of both thumbs
      g.save(); g.translate(640, V.y1 - 10); g.scale(u, u); rr(g, -205, -44, 410, 44, 8, GLASS);
      tx(g, String(Math.ceil(P.hp)), -186, -22, 28, hpCol, 'left'); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-128, -27, 84, 7); g.fillStyle = hpCol; g.fillRect(-128, -27, 84 * P.hp / 100, 7); if (P.sh) { g.fillStyle = '#7fc8ff'; g.fillRect(-128, -17, 84 * P.sh / 50, 5); }
      tx(g, G.n.toUpperCase(), 0, -22, 15, G.col); tx(g, G.melee ? '—' : `${A.mag} / ${A.res}`, 186, -22, 24, A.mag || G.melee ? BONE : WARN, 'right'); g.restore();
    } else {
      g.save(); g.translate(V.x0 + 22, V.y1 - 20); g.scale(u, u); rr(g, 0, -58, 250, 58, 8, GLASS);
      tx(g, String(Math.ceil(P.hp)), 18, -28, 40, hpCol, 'left'); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(104, -36, 128, 8); g.fillStyle = hpCol; g.fillRect(104, -36, 128 * P.hp / 100, 8);
      if (P.sh) { g.fillStyle = '#7fc8ff'; g.fillRect(104, -22, 128 * P.sh / 50, 6); tx(g, String(P.sh), 104 + 128 * P.sh / 50 + 6, -19, 11, '#7fc8ff', 'left'); }
      const op = OPS[P.op]; [['Q', 'q'], ['E', 'e']].forEach(([key, k], i) => { const x = 266 + i * 96, on = P.ab[k]; rr(g, x, -58, 86, 58, 8, on ? GLASS : 'rgba(12,16,22,.4)', on ? op.col : 'rgba(255,255,255,.12)'); tx(g, op[k].n.toUpperCase(), x + 43, -38, 14, on ? BONE : '#5a6272'); tx(g, key, x + 43, -16, 14, on ? op.col : '#5a6272'); });
      if (P.smokes > 0) { const x = 458, on = P.smokes > 0; rr(g, x, -58, 86, 58, 8, on ? GLASS : 'rgba(12,16,22,.4)', on ? NADE.col : 'rgba(255,255,255,.12)'); tx(g, 'SMOKE ×' + (P.smokes || 0), x + 43, -38, 14, on ? BONE : '#5a6272'); tx(g, 'G', x + 43, -16, 12, on ? NADE.col : '#5a6272'); }
      g.restore();
      g.save(); g.translate(V.x1 - 22 - 50 / pxPer(), V.y1 - 20); g.scale(u, u); rr(g, -270, -58, 270, 58, 8, GLASS);
      if (G.melee) tx(g, '—', -150, -28, 34, BONE); else { tx(g, String(A.mag), -150, -28, 42, A.mag ? BONE : WARN, 'right'); tx(g, '/ ' + A.res, -140, -22, 18, DIM, 'left'); }
      tx(g, G.n.toUpperCase(), -14, -38, 15, G.col, 'right'); tx(g, G.cat.toUpperCase(), -14, -18, 11, DIM, 'right');
      [1, 2, 3].forEach((s, i) => { const k = P.guns[s], y = -78 - (2 - i) * 24; if (!k) return; const on = P.slot === s; rr(g, -150, y - 10, 150, 21, 5, on ? 'rgba(239,233,220,.24)' : 'rgba(12,16,22,.7)'); tx(g, String(s), -140, y + 1, 12, on ? GOLD : DIM, 'left'); tx(g, GUNS[k].n.toUpperCase(), -10, y + 1, 12, on ? BONE : '#b9c0cc', 'right'); });
      if (canBuy()) tx(g, `◈ ${P.credits}`, -14, -170, 20, GOLD, 'right');
      g.restore();
    }
    if (touch && canBuy()) tx(g, `◈ ${P.credits}`, 640, V.y1 - 66 * u, 17 * u, GOLD);
    // --- the charge: what to do, and how far along
    const ring = (frac, label, col) => { const y = 470; g.strokeStyle = 'rgba(12,16,22,.7)'; g.lineWidth = 12 * u; g.beginPath(); g.arc(640, y, 34 * u, 0, TAU); g.stroke(); g.strokeStyle = col; g.lineWidth = 7 * u; g.beginPath(); g.arc(640, y, 34 * u, -Math.PI / 2, -Math.PI / 2 + TAU * frac); g.stroke(); tx(g, label, 640, y + 60 * u, 15 * u, col); };
    if (P.reloadT > 0) tx(g, 'RELOADING', 640, 420, 15 * u, GOLD);
    if (M.phase === 'live' && P.alive && !range && !demo) {
      const near = M.planted && Math.hypot(P.x - M.planted.x, P.z - M.planted.z) < 1.7, key = touch ? 'Hold the button' : 'Hold F';
      if (P.plant > 0) ring(P.plant / PLANT_T, 'PLANTING', FOE); else if (P.defuse > 0) ring(P.defuse / DEFUSE_T, 'DEFUSING', YOU);
      else if (side === 'att' && !M.planted) hint(g, onSite(P.x, P.z) ? key + ' to plant the charge' : M.t > roundT() - 6 ? (twoSites() ? 'Carry the charge to site A or B and plant it' : 'Carry the charge to the ring and plant it') : '', V.y0 + 104 * u, 16 * u, onSite(P.x, P.z) ? GOLD : 'rgba(239,233,220,.75)');
      else if (side === 'def' && M.planted) hint(g, near ? key + ' to defuse' : 'Defuse the charge', V.y0 + 104 * u, 16 * u, near ? GOLD : 'rgba(239,233,220,.75)');
      else if (side === 'def' && M.t > roundT() - 6) hint(g, twoSites() ? 'Hold A and B: stop them planting' : 'Stop them planting on the ring', V.y0 + 104 * u, 16 * u, 'rgba(239,233,220,.75)');
      if (F.alive && F.defuse > 0) tx(g, 'YOUR RIVAL IS DEFUSING', 640, 250, 20 * u, WARN);
    }
    // --- banners
    if (M.say) { const a = Math.min(1, M.say.t * 5, (2.6 - M.say.t) * 3); g.globalAlpha = cl(a, 0, 1); tx(g, M.say.s, 640, 170, 30 * u, M.say.c); g.globalAlpha = 1; }
    if (M.phase === 'end' && M.last && !M.over) { const won = M.last.wi === 0, c = won ? YOU : FOE; g.fillStyle = won ? 'rgba(53,224,200,.16)' : 'rgba(255,138,61,.16)'; g.fillRect(V.x0, 250 - 62 * u, W, 124 * u); tx(g, demo ? `${M.fs[M.last.wi].name.toUpperCase()} TAKES IT` : won ? 'ROUND WON' : 'ROUND LOST', 640, 250 - 12 * u, 50 * u, c); tx(g, WHY[M.last.why].toUpperCase(), 640, 250 + 32 * u, 16 * u, BONE); }
    if (M.phase === 'buy' && !UI.armory && !range && !UI.switched) { tx(g, pistolRound(M.round) ? 'PISTOL ROUND' : M.round === WIN_ROUNDS * 2 - 1 ? 'DECIDER' : 'ROUND ' + M.round, 640, 200, 34 * u, BONE); tx(g, side === 'att' ? (twoSites() ? 'You attack: plant the charge on A or B' : 'You attack: plant the charge on the ring') : (twoSites() ? 'You defend: hold A and B' : 'You defend: keep them off the ring'), 640, 200 + 36 * u, 16 * u, side === 'att' ? FOE : YOU); }
    if (!P.alive && M.deathInfo && !range) { const D = M.deathInfo; rr(g, 640 - 250 * u, 590 - 34 * u, 500 * u, 68 * u, 8, GLASS, FOE); tx(g, `${D.by.toUpperCase()} · ${D.w}${D.head ? ' · headshot' : ''}`, 640, 590 - 12 * u, 18 * u, FOE); tx(g, `They had ${D.hp} health${D.sh ? ' and ' + D.sh + ' shield' : ''} left`, 640, 590 + 14 * u, 13 * u, BONE); }
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
