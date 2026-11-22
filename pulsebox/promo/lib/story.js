/* Story kit for the "Stuck in Pulsebox" series: Milo and Jay in more poses, and the things they meet. */
const MILO = { hoodie: '#7457ff', hair: '#3b2416' };
const JAY = { hoodie: '#ff8a3d', hair: '#e8c07a', noPhones: true };
const who = (base, o) => Object.assign({}, base, o);
const DENIM = '#2b3a67';

// side view, running toward +x (dir -1 runs left)
function kidRun(x, y, k, o = {}) {
  const t = o.t || 0, ph = t * 15, hood = o.hoodie || MILO.hoodie, hair = o.hair || MILO.hair, sk = o.skin || SKIN;
  const leg = (a, back) => { const kx = Math.sin(a) * 34, ky = -30, fx = Math.sin(a) * 64 + (back ? -10 : 10), fy = 0 - Math.max(0, Math.cos(a)) * 6;
    return P(`M0 -70 L${kx} ${ky} L${fx} ${fy}`, 'none', 0, `stroke="${INK}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"`) + P(`M0 -70 L${kx} ${ky} L${fx} ${fy}`, 'none', 0, `stroke="${DENIM}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"`) + E(fx + 10, fy + 4, 22, 12, '#fff', 5); };
  const arm = (a) => { const ex = Math.sin(a) * 40, hx = Math.sin(a) * 62 + 14; return P(`M6 -160 Q${ex} -120 ${hx} -96`, 'none', 0, `stroke="${INK}" stroke-width="34" stroke-linecap="round"`) + P(`M6 -160 Q${ex} -120 ${hx} -96`, 'none', 0, `stroke="${hood}" stroke-width="22" stroke-linecap="round"`) + C(hx, -96, 13, sk, 5); };
  let s = leg(ph + Math.PI, true) + arm(ph) + R(-36, -190, 74, 130, 28, hood, 7) + leg(ph) ;
  const r = 52, mouth = o.mouth === 'o' ? E(r * .62, r * .45, 9, 12, '#7a1f2b', 5) : P(`M${r * .35} ${r * .45} Q${r * .6} ${r * .62} ${r * .85} ${r * .42}`, 'none', 5);
  let h = C(0, 0, r, sk) + P(`M${r * .85} ${-r * .05} L${r * 1.15} ${r * .15} L${r * .9} ${r * .25}`, sk, 5) + E(r * .48, -r * .1, 9, 13, '#fff', 4) + C(r * .55, -r * .08, 5, INK, 0) + mouth +
    P(`M${-r} ${r * .1} C${-r * 1.15} ${-r * .9} ${-r * .5} ${-r * 1.15} 0 ${-r * 1.12} C${r * .6} ${-r * 1.15} ${r * .95} ${-r * .8} ${r * .6} ${-r * .55} C${r * .2} ${-r * .3} ${-r * .3} ${r * .2} ${-r * .55} ${r * .55} Z`, hair, 5) +
    P(`M${-r * .5} ${-r * 1.05} L${-r * .62} ${-r * 1.38} L${-r * .2} ${-r * 1.1} L${-r * .05} ${-r * 1.45} L${r * .25} ${-r * 1.08}`, hair, 5);
  if (!o.noPhones) h += P(`M${-r * .2} ${-r * .9} Q${-r * .6} ${-r * .2} ${-r * .1} ${r * .2}`, 'none', 0, `stroke="${LIME}" stroke-width="9" stroke-linecap="round"`) + R(-r * .3, -r * .15, 24, 40, 10, LIME, 4);
  s += arm(ph + Math.PI) + G(`translate(10 -225) rotate(8)`, h);
  return G(`translate(${x} ${y + Math.abs(Math.sin(ph)) * -8}) scale(${k * (o.dir || 1)} ${k})`, s);
}
// seen from above: for the raft and the heist map
function kidTop(x, y, k, ang, o = {}) {
  const hood = o.hoodie || MILO.hoodie, hair = o.hair || MILO.hair, sw = Math.sin((o.t || 0) * 10) * (o.walk ? 8 : 0);
  return G(`translate(${x} ${y}) rotate(${ang}) scale(${k})`, C(-46, -10 + sw, 16, o.skin || SKIN, 5) + C(46, -10 - sw, 16, o.skin || SKIN, 5) + E(0, 6, 58, 34, hood, 7) + C(0, 0, 34, hair, 6) +
    P('M-14 -10 Q0 4 14 -12 M-20 8 Q0 18 18 6', 'none', 4, 'opacity=".5"') + (o.mask ? '' : '') + (o.noPhones ? '' : P('M-34 0 A34 34 0 0 1 34 0', 'none', 0, `stroke="${LIME}" stroke-width="9"`)));
}
function doll(x, y, k, o = {}) {
  const glow = o.glow ? C(-18, -150, 12, '#ff2d55', 0, 'filter="url(#blur8)"') + C(18, -150, 12, '#ff2d55', 0, 'filter="url(#blur8)"') : '';
  return G(`translate(${x} ${y}) scale(${k}) rotate(${o.tilt || 0})`, P('M-70 0 L-40 -110 L40 -110 L70 0Z', '#a9c4e8', 6) + P('M-70 0 Q-35 -16 0 0 Q35 -16 70 0', 'none', 4, 'opacity=".6"') +
    L(-40, -100, -70, -40, 14, '#f1ece4') + L(40, -100, 70, -40, 14, '#f1ece4') + C(0, -150, 48, '#f1ece4', 6) + P('M-52 -150 C-56 -215 56 -215 52 -150 L44 -170 L-44 -170Z', '#6b3e1e', 5) +
    C(-18, -150, 11, INK, 0) + C(18, -150, 11, INK, 0) + glow + C(-30, -130, 8, '#f3a0a0', 0, 'opacity=".7"') + C(30, -130, 8, '#f3a0a0', 0, 'opacity=".7"') + P('M-8 -122 Q0 -116 8 -122', 'none', 4) +
    P('M-10 -138 L-14 -110 M12 -138 L16 -112', 'none', 0, 'stroke="#8a8a8a" stroke-width="2" opacity=".6"'));
}
function hollow(x, y, k, o = {}) {   // the Hollow: too tall, too thin. o.pose: 'stand' | 'reach' | 'recoil'
  const t = o.t || 0, sway = Math.sin(t * 2) * 4, pose = o.pose || 'stand', body = '#3b302b';
  let s = P('M-26 0 L-18 -260 M26 0 L18 -260', 'none', 0, `stroke="${INK}" stroke-width="30" stroke-linecap="round"`) + P('M-26 0 L-18 -260 M26 0 L18 -260', 'none', 0, `stroke="${body}" stroke-width="18" stroke-linecap="round"`);
  s += P('M-40 -250 C-50 -380 -30 -470 0 -480 C30 -470 50 -380 40 -250 Z', body, 7) + P('M-20 -420 Q0 -400 20 -420 M-24 -380 Q0 -360 24 -380 M-22 -340 Q0 -322 22 -340', 'none', 4, 'opacity=".6"');
  const arm = (side) => { const sx = side * 40, path = pose === 'reach' ? `M${sx} -440 Q${side * 70 + 120} -380 ${side * 30 + 230} -330` : pose === 'recoil' ? `M${sx} -440 Q${side * 120} -470 ${side * 30} -540` : `M${sx} -440 Q${side * 80} -300 ${side * 60} -170`;
    const end = pose === 'reach' ? [side * 30 + 230, -330] : pose === 'recoil' ? [side * 30, -540] : [side * 60, -170];
    return P(path, 'none', 0, `stroke="${INK}" stroke-width="26" stroke-linecap="round"`) + P(path, 'none', 0, `stroke="${body}" stroke-width="15" stroke-linecap="round"`) +
      G(`translate(${end[0]} ${end[1]})`, P('M0 0 L-14 34 M0 0 L0 40 M0 0 L14 34', 'none', 0, `stroke="${INK}" stroke-width="9" stroke-linecap="round"`)); };
  s += arm(-1) + arm(1);
  const hd = G(`translate(${sway} -530) rotate(${o.tilt || 0})`, E(0, 0, 44, 60, '#4a3d36', 7) + E(-16, -6, 9, 13, '#fff', 0, 'filter="url(#blur8)"') + E(16, -6, 9, 13, '#fff', 0, 'filter="url(#blur8)"') + E(-16, -6, 6, 9, '#fff', 0) + E(16, -6, 6, 9, '#fff', 0) + P('M-14 28 Q0 20 14 28', 'none', 4));
  return G(`translate(${x} ${y}) scale(${k * (o.dir || 1)} ${k})`, s + hd);
}
function corridor(t, o = {}) {      // one-point-perspective hospital hallway, vanishing at (540, 860)
  const vx = 540, vy = 860, flick = o.dark ? 0 : (Math.sin(t * 37) > .92 ? .4 : 1);
  let s = R(-20, -20, 1120, 1960, 0, '#2a201b', 0);
  s += P(`M-20 1960 L${vx - 90} ${vy + 80} L${vx + 90} ${vy + 80} L1100 1960Z`, '#6b4a2e', 0);                              // floor
  for (let i = 0; i < 10; i++) { const z = Math.pow(i / 10, 1.8); s += L(lerp(-20, vx - 90, 1 - z), lerp(1960, vy + 80, 1 - z), lerp(1100, vx + 90, 1 - z), lerp(1960, vy + 80, 1 - z), 3, '#4a3220'); }
  for (let i = -5; i <= 5; i++) s += L(vx + i * 18, vy + 80, vx + i * 220, 1960, 3, '#4a3220');
  s += P(`M-20 -20 L${vx - 90} ${vy - 80} L${vx + 90} ${vy - 80} L1100 -20Z`, '#3a302a', 0);                                    // ceiling
  s += P(`M-20 -20 L${vx - 90} ${vy - 80} L${vx - 90} ${vy + 80} L-20 1960Z`, '#8a5a3c', 0) + P(`M1100 -20 L${vx + 90} ${vy - 80} L${vx + 90} ${vy + 80} L1100 1960Z`, '#7a4e34', 0);   // walls
  for (let j = 0; j < 9; j++) { const yy = lerp(0, 1, j / 9); s += L(-20, lerp(-20, 1960, yy), vx - 90, lerp(vy - 80, vy + 80, yy), 2, '#6e4630', 'opacity=".6"') + L(1100, lerp(-20, 1960, yy), vx + 90, lerp(vy - 80, vy + 80, yy), 2, '#5e3e2a', 'opacity=".6"'); }
  for (const z of [.25, .55, .78]) { const xl = lerp(-20, vx - 90, z), xr = lerp(1100, vx + 90, z), top = lerp(-20, vy - 80, z) + lerp(500, 60, z), bot = lerp(1960, vy + 80, z), w = lerp(160, 14, z);
    s += P(`M${xl} ${top} L${xl + w} ${top + w * .4} L${xl + w} ${bot - w * .3} L${xl} ${bot}Z`, '#2f2420', 4) + P(`M${xr} ${top} L${xr - w} ${top + w * .4} L${xr - w} ${bot - w * .3} L${xr} ${bot}Z`, '#2f2420', 4); }
  for (const z of [.15, .45, .7]) { const cy = lerp(-20, vy - 80, z) + 10, w = lerp(260, 50, z); s += R(vx - w / 2, cy, w, w * .18, 4, flick > .5 ? '#fff6d0' : '#6b6450', 4); }
  if (o.sign) s += G(`translate(170 560) skewY(18)`, R(-10, -50, 300, 110, 8, '#d9d2b8', 6) + T(140, -8, 'SAINT VERITY', 40, '#3a2a20', 'middle', 'Chakra') + T(140, 36, 'HOSPITAL', 34, '#7a2a20', 'middle', 'Chakra'));
  s += C(vx, vy, 150, '#000', 0, 'opacity=".75" filter="url(#blur30)"');
  return s;
}
function flashlight(cx, cy, r, op = .93) {    // darkness everywhere except a soft circle of light
  const id = 'fl' + Math.round(cx) + Math.round(cy);
  return `<mask id="${id}"><rect x="-20" y="-20" width="1120" height="1960" fill="#fff"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#000" filter="url(#blur30)"/></mask>` +
    `<rect x="-20" y="-20" width="1120" height="1960" fill="#05040a" opacity="${op}" mask="url(#${id})"/>`;
}
function hud(lines, x = 40, y = 140) { return G(`translate(${x} ${y})`, R(0, 0, 330, 70 + lines.length * 52, 18, 'rgba(5,4,10,.72)', 4) + lines.map((l, i) => T(26, 58 + i * 52, l, 40, i ? '#ffd27a' : '#fff', 'start', 'Chakra')).join('')); }
function locker(x, y, w, h, open = 0) {
  let s = R(x, y, w, h, 8, '#5c6e62', 7);
  if (open > 0) s += R(x + 10, y + 10, w - 20, h - 20, 4, '#111', 0) + P(`M${x} ${y} L${x - w * open * .8} ${y - 20 * open} L${x - w * open * .8} ${y + h + 20 * open} L${x} ${y + h}Z`, '#6e8274', 7);
  else { for (let i = 0; i < 5; i++) s += L(x + w * .25, y + 40 + i * 22, x + w * .75, y + 40 + i * 22, 6, '#2a332d'); s += R(x + w - 34, y + h * .5, 14, 50, 6, '#aab5ad', 4); }
  return s;
}
function elevator(t, close, inside = '') {   // close: 0 open .. 1 shut
  let s = R(200, 560, 680, 1080, 12, '#6b6f7a', 9) + R(240, 620, 600, 1000, 6, '#1a1c22', 0) + inside;
  const w = 300 * close; s += R(240, 620, w, 1000, 0, '#a7adb8', 7) + R(840 - w, 620, w, 1000, 0, '#a7adb8', 7) + L(240 + w, 620, 240 + w, 1620, 4, '#7d838f') + L(840 - w, 620, 840 - w, 1620, 4, '#7d838f');
  s += R(470, 500, 140, 50, 10, '#111', 5) + T(540, 540, '▼', 36, LIME, 'middle', 'DejaVu Sans');
  return s;
}
function staticFill(w, h, seed, t) { const r = rng(seed + Math.floor(t * 20)); let s = ''; for (let i = 0; i < 160; i++) s += R(r() * w, r() * h, 6 + r() * 30, 3 + r() * 8, 0, r() > .5 ? '#fff' : '#555', 0, 'opacity=".7"'); return s; }
function vortex(cx, cy, t, col1 = '#ff2d55', col2 = '#120208') {
  let s = C(cx, cy, 1300, col2, 0);
  for (let i = 0; i < 14; i++) { const r = 80 + i * 90, a = t * (3 - i * .12) + i; s += `<path d="M${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r} A${r} ${r} 0 0 1 ${cx + Math.cos(a + 2.2) * r} ${cy + Math.sin(a + 2.2) * r}" fill="none" stroke="${i % 2 ? col1 : '#fff'}" stroke-width="${30 - i}" stroke-linecap="round" opacity="${.9 - i * .05}"/>`; }
  return s;
}
function loadingCard(t, lt, game, col = '#ff2d55') {   // the Pulsebox loading screen as they are pulled in
  const k = clamp(lt / 1.1);
  return R(-20, -20, 1120, 1960, 0, '#0b0d14', 0) + pulseboxLogo(540, 760, .9) + T(540, 900, 'LOADING', 50, '#8b93b8', 'middle', 'Chakra') +
    TS(540, 1040, game, 110, col, 12) + R(240, 1110, 600, 30, 15, '#1b1f33', 4) + R(240, 1110, 600 * k, 30, 15, LIME, 0) +
    R(250, 1200, 580, 70, 35, '#1b1f33', 0) + T(540, 1247, '🔒 box.pulseform.org', 34, '#fff', 'middle', 'Inter', 'font-weight="700"');
}
function seriesBadge(ep, x = 40, y = 60) { return G(`translate(${x} ${y})`, R(0, 0, 420, 70, 16, 'rgba(5,4,10,.75)', 4) + logoMark(14, 13, 1.8) + T(70, 48, 'STUCK IN PULSEBOX · EP ' + ep, 30, '#fff', 'start', 'Chakra')); }
function realGameCard(t, id, title, sub, extra = '') {   // "this game is real" phone: the Pulsebox card for the game
  const W = 680, H = 1240;
  let inner = R(0, 0, W, H, 0, '#0b0d14', 0) + R(0, 0, W, 92, 0, '#1b1f33', 0) + R(24, 18, W - 48, 58, 29, '#2a2f4a', 0) + T(W / 2, 58, '🔒 box.pulseform.org', 30, '#fff', 'middle', 'Inter', 'font-weight="700"');
  inner += logoMark(28, 120, 2.6) + `<text x="110" y="168" font-family="Chakra" font-size="50" fill="#fff">PULSE<tspan fill="${LIME}">BOX</tspan></text>`;
  inner += R(28, 230, W - 56, 600, 26, '#171a2b', 6) + nest(40, 242, W - 80, 440, GAMES[id][1](t, W - 80, 440)) + R(40, 242, W - 80, 440, 16, 'none', 5) +
    T(56, 750, title, 56, '#fff', 'start', 'Chakra') + T(56, 800, sub, 30, '#8b93b8', 'start', 'Chakra') + R(W - 230, 712, 180, 70, 35, LIME, 5) + T(W - 140, 758, 'PLAY', 36, INK, 'middle', 'Chakra') + extra;
  return inner;
}
function stillHere(t, W, H) {   // Still Here, for its Pulsebox card
  let s = `<svg viewBox="0 0 1080 1920" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">` + corridor(t) + doll(540, 980, .8) + flashlight(540, 900, 380, .9) + '</svg>';
  return s + TS(W / 2, H * .2, 'STILL HERE', Math.min(W, H) * .16, '#ff2d55', 8);
}
Object.assign(GAMES, { 'still-here': ['Still Here', stillHere] });

/* ---------- shared bedroom (where every episode starts and ends) ---------- */
function bedroomFloor(t, o = {}) {
  let s = R(-20, -20, 1120, 1960, 0, o.dawn ? '#3b3f7a' : '#161a40', 0);
  s += R(620, 180, 380, 420, 16, o.dawn ? '#ffb38a' : 'url(#night)') + (o.dawn ? C(800, 600, 110, '#fff1a8', 6) : C(900, 260, 40, '#f4f1d6', 6)) + L(810, 180, 810, 600, 8) + L(620, 390, 1000, 390, 8) + R(620, 180, 380, 420, 16, 'none');
  s += G('translate(120 300) rotate(-4)', R(0, 0, 230, 300, 6, '#2a3170') + TS(115, 170, 'GAME DEV', 34, LIME, 6));
  s += R(80, 560, 150, 80, 14, '#0c0f24') + T(155, 616, o.clock || '2:00', 46, '#ff2d55', 'middle', 'DejaVu Sans Mono', 'font-weight="bold"');
  s += R(-20, 1240, 1120, 720, 0, o.dawn ? '#4a3f8a' : '#232a5c', 0) + L(-20, 1240, 1100, 1240, 8);
  return s;
}
/* ---------- EP 2: the sea ---------- */
function seaTop(t, tint = 0) {   // ocean from above
  let s = R(-20, -20, 1120, 1960, 0, tint ? '#2a4f7a' : '#0f3a5c', 0);
  for (let j = 0; j < 22; j++) { const y = j * 95 + ((t * 30) % 95), r = rng(j); let d = '';
    for (let i = 0; i < 6; i++) { const x = r() * 1100 - 40, w = 60 + r() * 90; d += `M${x} ${y + Math.sin(t * 2 + i + j) * 8} q${w / 2} -18 ${w} 0 `; }
    s += P(d, 'none', 0, `stroke="${tint ? '#ffd0b0' : '#5fa8d8'}" stroke-width="6" stroke-linecap="round" opacity=".45"`); }
  return s;
}
function plank(x, y, w, h, rot = 0, col = '#a8774a') { return G(`translate(${x} ${y}) rotate(${rot})`, R(-w / 2, -h / 2, w, h, 6, col, 6) + L(-w / 2 + 10, -h / 6, w / 2 - 10, -h / 6, 3, '#8a5a32') + L(-w / 2 + 10, h / 6, w / 2 - 10, h / 6, 3, '#8a5a32')); }
function barrelTop(x, y, k = 1) { return G(`translate(${x} ${y}) scale(${k})`, C(0, 0, 44, '#9a6a3c', 6) + C(0, 0, 30, 'none', 5) + C(0, 0, 14, '#7a4e2a', 4)); }
function raftTop(t, x, y, k, st) {   // st: how built (0 = four planks ... 6 = walls, sail, fire)
  const n = st < 2 ? 2 : st < 4 ? 3 : 4, sz = 130, rot = Math.sin(t * 1.3) * 3;
  let s = '';
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s += plank((i - (n - 1) / 2) * sz, (j - (n - 1) / 2) * sz, sz - 6, sz - 6, (i + j) % 2 ? 90 : 0, (i + j) % 2 ? '#a8774a' : '#9a6a3c');
  const half = n * sz / 2;
  if (st >= 1) s += barrelTop(-half + 40, -half + 40, .8) + barrelTop(half - 40, half - 40, .8);
  if (st >= 3) s += R(-half - 8, -half - 8, n * sz + 16, n * sz + 16, 10, 'none', 0, `stroke="#c9b98a" stroke-width="6" stroke-dasharray="20 12"`);
  if (st >= 5) s += R(-half, -half - 20, n * sz, 26, 6, '#7a4e2a', 6) + R(-half - 20, -half, 26, n * sz, 6, '#7a4e2a', 6);
  if (st >= 6) s += C(0, 0, 20, '#5c3820', 6) + P(`M0 0 L${half - 20} ${-half * .2} L0 ${-half + 10}Z`, '#e8e0c8', 6, 'opacity=".95"');
  if (st >= 7) s += C(half - 90, half - 110, 38, '#5a5a5a', 6) + P(`M${half - 104} ${half - 104} q14 ${-30 - Math.sin(t * 12) * 10} 14 -40 q4 22 14 30 q8 -16 4 -30 q18 24 4 44Z`, ORANGE, 4);
  return G(`translate(${x} ${y}) rotate(${rot}) scale(${k})`, s);
}
function fin(x, y, k, dir = 1, t = 0) {
  return G(`translate(${x} ${y}) scale(${k * dir} ${k})`, P('M-90 30 Q-40 10 60 30', 'none', 0, `stroke="#cfe9ff" stroke-width="10" stroke-linecap="round" opacity=".7"`) + P('M-30 20 L10 -70 Q30 -20 40 20Z', '#55606e', 6));
}
function sideSea(t, o = {}) {      // side view: sky, horizon, waves
  const night = o.night, sky = night ? '#0a1430' : o.dawn ? '#f3a6a0' : '#a9c4d8';
  let s = R(-20, -20, 1120, 1960, 0, sky, 0) + (night ? stars(1080, 900, 50, 71, t) + C(820, 260, 60, '#f4f1d6', 6) : '');
  s += R(-20, 900, 1120, 1080, 0, night ? '#071226' : '#1d4f73', 0);
  for (let j = 0; j < 12; j++) { const y = 920 + j * j * 7 + j * 20; let d = `M-40 ${y}`; for (let x = -40; x < 1140; x += 60) d += ` Q${x + 30} ${y - 10 - j * 1.5 + Math.sin(t * 2 + x * .02 + j) * 6} ${x + 60} ${y}`; s += P(d, 'none', 0, `stroke="${night ? '#1b3a66' : '#6fb2dc'}" stroke-width="${3 + j * .5}" opacity=".6"`); }
  return s;
}
function raftSide(x, y, k, tilt = 0, o = {}) {   // the raft from the side, with the kids on it
  let s = R(-260, -20, 520, 50, 10, '#9a6a3c', 7) + L(-200, -20, -200, 30, 4, '#7a4e2a') + L(0, -20, 0, 30, 4, '#7a4e2a') + L(200, -20, 200, 30, 4, '#7a4e2a');
  if (o.sail) s += L(150, -20, 150, -360, 12) + P('M156 -350 Q300 -230 156 -110Z', '#e8e0c8', 6);
  if (o.lantern) s += lantern(-180, -70, .9, .9);
  if (o.kids) s += kidFront(-60, -250, .62, who(MILO, o.kids.milo || {})) + kidFront(80, -250, .62, who(JAY, o.kids.jay || {}));
  return G(`translate(${x} ${y}) rotate(${tilt}) scale(${k})`, s);
}
function bigWave(x, y, h, t) {      // a wall of water, curling left
  return P(`M${x - 900} ${y} Q${x - 300} ${y - h * .2} ${x - 120} ${y - h * .8} Q${x - 40} ${y - h * 1.05} ${x + 120} ${y - h} Q${x + 60} ${y - h * .9} ${x + 40} ${y - h * .75} Q${x + 200} ${y - h * .5} ${x + 1100} ${y}Z`, '#1f6a96', 8) +
    P(`M${x - 120} ${y - h * .8} Q${x - 40} ${y - h * 1.05} ${x + 120} ${y - h}`, 'none', 0, `stroke="#e8f6ff" stroke-width="22" stroke-linecap="round"`) +
    Array.from({ length: 8 }, (_, i) => C(x + 120 - i * 30 + Math.sin(t * 9 + i) * 8, y - h - 20 + (i % 3) * 14, 12 - i, '#fff', 0)).join('');
}
function giantEye(x, y, open, k = 1, t = 0) {     // something vast, rising
  const ry = 150 * open;
  return G(`translate(${x} ${y}) scale(${k})`, E(0, 40, 420, 120, '#0b1a2e', 0, 'opacity=".9"') + E(0, 0, 280, Math.max(4, ry), '#e8f3c0', 9) +
    (open > .1 ? `<clipPath id="eyec"><ellipse cx="0" cy="0" rx="280" ry="${ry}"/></clipPath><g clip-path="url(#eyec)">` + C(Math.sin(t) * 20, 0, 120, '#c6ff3d', 8) + E(Math.sin(t) * 20, 0, 22, 110, INK, 0) + C(Math.sin(t) * 20 + 40, -40, 22, '#fff', 0) + '</g>' : '') +
    E(0, 0, 300, Math.max(10, ry + 20), 'none', 0, `stroke="#c6ff3d" stroke-width="10" opacity=".35" filter="url(#blur8)"`));
}
function whirlpool(cx, cy, t, k = 1) {
  let s = '';
  for (let i = 0; i < 16; i++) { const r = (40 + i * 34) * k, a = t * (4 - i * .18) + i * .7; s += `<path d="M${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r * .9} A${r} ${r * .9} 0 0 1 ${cx + Math.cos(a + 2.6) * r} ${cy + Math.sin(a + 2.6) * r * .9}" fill="none" stroke="${i % 2 ? '#bff6ff' : '#2f8fbf'}" stroke-width="${16 - i * .6}" stroke-linecap="round" opacity="${.95 - i * .04}"/>`; }
  return C(cx, cy, 600 * k, '#0e4a72', 0, 'opacity=".6" filter="url(#blur30)"') + s + C(cx, cy, 50 * k, '#c6ff3d', 0, 'filter="url(#blur8)"') + C(cx, cy, 30 * k, '#fff', 0);
}
/* ---------- EP 3: the mansion ---------- */
function mansionNight(t, W, H) {
  const k = W / 1080;
  let s = R(0, 0, W, H, 0, '#0c1230', 0) + stars(W, H * .5, 40, 81, t) + C(W * .8, H * .12, 50 * k, '#f4f1d6', 6);
  s += G(`translate(${W / 2} ${H * .62}) scale(${k})`, P('M-460 0 L-460 -300 L-300 -420 L-140 -300 L-140 -380 L0 -520 L140 -380 L140 -300 L300 -420 L460 -300 L460 0Z', '#1d2142', 8) +
    [-380, -220, 220, 380].map(x => R(x - 40, -230, 80, 110, 6, '#2a2f55', 5)).join('') + R(-60, -330, 120, 160, 60, '#ffd84d', 6) + C(0, -250, 120, '#ffd84d', 0, 'opacity=".4" filter="url(#blur30)"') +
    P('M-30 -200 L-20 -290 Q0 -320 20 -290 L30 -200Z', '#b8860b', 5) + C(0, -300, 18, '#ffd84d', 4) + R(-50, -130, 100, 130, 8, '#3a2a1e', 6));
  s += R(0, H * .62, W, H * .38, 0, '#121733', 0);
  return s;
}
function idol(x, y, k = 1, glow = true) { return G(`translate(${x} ${y}) scale(${k})`, (glow ? C(0, -60, 160, '#ffd84d', 0, 'opacity=".45" filter="url(#blur30)"') : '') + R(-60, 0, 120, 30, 8, '#8a6a1a', 6) + P('M-40 0 L-30 -110 Q0 -160 30 -110 L40 0Z', '#e8b828', 7) + C(0, -140, 34, '#e8b828', 7) + C(-12, -144, 6, INK, 0) + C(12, -144, 6, INK, 0) + P('M-20 -70 L20 -70 M-24 -40 L24 -40', 'none', 4, 'opacity=".5"')); }
Object.assign(GAMES, { 'heist-tease': ['Heist Crew', mansionNight] });
/* ---------- EP 3: heist pieces ---------- */
const MILO_H = { hoodie: '#4a3aa8', hair: '#3b2416', mask: true }, JAY_H = { hoodie: '#b55a1e', hair: '#e8c07a', noPhones: true, mask: true };
function beamCone(x, y, ang, len, spread, col = '#fff3b0', op = .35) {
  const a0 = ang - spread, a1 = ang + spread;
  return P(`M${x} ${y} L${x + Math.cos(a0) * len} ${y + Math.sin(a0) * len} A${len} ${len} 0 0 1 ${x + Math.cos(a1) * len} ${y + Math.sin(a1) * len}Z`, col, 0, `opacity="${op}"`);
}
function guardTop(x, y, angDeg, k, t, o = {}) {
  const a = angDeg * Math.PI / 180;
  return beamCone(x, y, a, 320 * k, .38) + G(`translate(${x} ${y}) rotate(${angDeg + 90}) scale(${k})`, C(-46, -10, 16, SKIN, 5) + C(46, -10, 16, SKIN, 5) + E(0, 6, 58, 34, '#2d4a8a', 7) + C(0, 0, 34, '#1b2a50', 6) + R(-20, -46, 40, 22, 8, '#1b2a50', 5) + R(30, -40, 14, 34, 4, '#ffd84d', 4)) +
    (o.q ? G(`translate(${x} ${y - 90 * k})`, TS(0, 0, o.q, 70 * k, '#ffd84d', 8)) : '');
}
function camTop(x, y, ang, k, jammed, t) {
  return (jammed ? '' : beamCone(x, y, ang, 360 * k, .3, '#ff2d55', .22)) + G(`translate(${x} ${y}) rotate(${ang * 57.3}) scale(${k})`, R(-20, -16, 54, 32, 6, jammed ? '#555' : '#d8dce8', 5) + C(34, 0, 10, jammed ? '#333' : '#ff2d55', 3)) +
    (jammed ? G(`translate(${x} ${y - 40 * k}) scale(${k})`, R(-40, -20, 80, 40, 6, '#222', 3) + staticFill(80, 40, 3, t).replace(/<rect /g, '<rect transform="translate(-40 -20)" ')) : '');
}
function laserLine(x0, y0, x1, y1, on, t) { return on ? L(x0, y0, x1, y1, 14, '#ff2d55', 'opacity=".35" filter="url(#blur8)"') + L(x0, y0, x1, y1, 5, '#ff6b81', `opacity="${.7 + .3 * Math.sin(t * 20)}"`) : L(x0, y0, x1, y1, 3, '#552030', 'opacity=".5" stroke-dasharray="10 12"'); }
function switchPlate(x, y, n, k, on) { return G(`translate(${x} ${y}) scale(${k})`, (on ? C(0, 0, 90, LIME, 0, 'opacity=".5" filter="url(#blur8)"') : '') + R(-56, -56, 112, 112, 20, on ? LIME : '#ffd84d', 7) + T(0, 26, String(n), 74, INK, 'middle', 'Luckiest')); }
function heistMap(t, W, H, o = {}) {   // the Hillside Mansion from above, drawn into 1080 x 1920
  let s = R(-20, -20, 1120, 1960, 0, '#141a33', 0) + R(-20, 1640, 1120, 340, 0, '#2a2f45', 0) + L(-20, 1800, 1100, 1800, 6, '#ffd84d', 'stroke-dasharray="40 30"');
  const rooms = [[80, 200, 920, 440, '#3a3150'], [80, 640, 440, 520, '#2f3a4a'], [560, 640, 440, 520, '#3a2f3a'], [80, 1160, 920, 440, '#33384a']];
  rooms.forEach(([x, y, w, h, c]) => { s += R(x, y, w, h, 0, c, 0); for (let i = 0; i < w; i += 80) for (let j = 0; j < h; j += 80) if (((i + j) / 80) % 2 < 1) s += R(x + i, y + j, 80, 80, 0, '#fff', 0, 'opacity=".05"'); });
  const wall = (x0, y0, x1, y1) => L(x0, y0, x1, y1, 26, INK) + L(x0, y0, x1, y1, 14, '#c9c4dd');
  s += wall(80, 200, 1000, 200) + wall(80, 200, 80, 1600) + wall(1000, 200, 1000, 1600) + wall(80, 1600, 420, 1600) + wall(660, 1600, 1000, 1600) +
    wall(80, 640, 420, 640) + wall(520, 640, 560, 640) + wall(660, 640, 1000, 640) + wall(540, 640, 540, 900) + wall(540, 1000, 540, 1160) + wall(80, 1160, 300, 1160) + wall(400, 1160, 700, 1160) + wall(800, 1160, 1000, 1160);
  s += G('translate(540 420)', R(-150, -130, 300, 260, 24, '#5a5f6e', 8) + C(0, 0, 90, o.vaultOpen ? '#2a2210' : '#8a8f9c', 8) + (o.vaultOpen ? idol(0, 40, .6) : [0, 1, 2, 3].map(i => L(0, 0, Math.cos(i * 1.57 + t) * 70, Math.sin(i * 1.57 + t) * 70, 8)).join('')) + T(0, 170, 'VAULT', 40, '#c9c4dd', 'middle', 'Luckiest'));
  s += switchPlate(300, 900, 1, .8, o.sw1) + switchPlate(780, 900, 2, .8, o.sw2);
  s += G('translate(150 1730) scale(.9)', R(-120, -60, 240, 120, 20, '#e8e0c8', 7) + R(60, -50, 50, 100, 10, '#9fd3ff', 5) + T(-20, 14, 'VAN', 40, INK, 'middle', 'Luckiest'));
  if (!o.noCams) s += camTop(120, 680, .5 + Math.sin(t * 1.2) * .5, 1, o.jammed, t) + camTop(960, 680, 2.6 + Math.sin(t * 1.2) * .5, 1, o.jammed, t);
  if (!o.noLasers) s += laserLine(560, 240, 560, 600, !o.jammed, t) + laserLine(520, 240, 520, 600, !o.jammed, t);
  return s;
}
function heistCrew(t, W, H) { return `<svg viewBox="0 120 1080 1600" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">` + heistMap(t, W, H) + guardTop(700 + Math.sin(t) * 150, 1350, 180 + Math.sin(t) * 40, 1, t) + kidTop(300, 1300, 1, 0, who(MILO_H, { t })) + kidTop(420, 1380, 1, 0, who(JAY_H, { t })) + '</svg>'; }
Object.assign(GAMES, { 'heist-crew': ['Heist Crew', heistCrew] });
function vanSide(x, y, k, t, o = {}) {
  let s = R(-260, -170, 520, 190, 30, '#e8e0c8', 8) + P('M140 -170 L230 -170 Q260 -170 260 -130 L260 20 L140 20Z', '#e8e0c8', 8) + R(160, -150, 80, 70, 10, '#9fd3ff', 6) + R(-200, -140, 280, 90, 10, o.open ? '#151519' : '#d8cfb2', 6) +
    C(-160, 30, 50, '#222', 8) + C(160, 30, 50, '#222', 8) + C(-160, 30, 20, '#888', 0) + C(160, 30, 20, '#888', 0) + T(-60, -60, 'TOTALLY', 26, '#8a6a3c', 'middle', 'Luckiest') + T(-60, -30, 'NORMAL VAN', 26, '#8a6a3c', 'middle', 'Luckiest');
  return G(`translate(${x} ${y}) scale(${k * (o.dir || 1)} ${k})`, s);
}
function policeLights(t, op = 1) { const red = Math.floor(t * 6) % 2; return R(-20, -20, 560, 1960, 0, red ? '#ff2d55' : '#2d6bff', 0, `opacity="${.22 * op}"`) + R(540, -20, 560, 1960, 0, red ? '#2d6bff' : '#ff2d55', 0, `opacity="${.22 * op}"`); }
function guardFront(x, y, k, t) {
  return G(`translate(${x} ${y}) scale(${k})`, P('M-175 260 C-180 90 -120 10 0 10 C120 10 180 90 175 260 Z', '#2d4a8a') + R(-30, 40, 60, 40, 8, '#ffd84d', 5) + G('translate(0 -110)', face(118, { t, brow: 'mad', mouth: 'flat' }) + P('M-130 -50 Q0 -170 130 -50 L150 -30 L-150 -30Z', '#1b2a50', 7) + R(-30, -110, 60, 40, 8, '#ffd84d', 5)));
}
